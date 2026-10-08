// tests/unit.test.ts — pure logic, no network.
// Run: npm test

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { getSkillConfigProblem, matchAnswerOption, normaliseAnswer } from '../lib/skill-check'
import { getWooEffectiveStatus, isWooEntryClosed, type WooProduct } from '../lib/woocommerce'
import {
  normalizeBundleConfig,
  getEligibleTiers,
  discountPercentForQty,
  bundleUnitPrice,
  bundleLineTotal,
  fullLineTotal,
  bundleSaving,
} from '../lib/bundle-discounts'
import { getAllowedMaxQty, clampQuantityToAllowedRange, canIncreaseQuantity } from '../lib/quantity-limits'

const NOW = Date.parse('2026-10-08T12:00:00Z')
const HOUR = 3_600_000
const iso = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z')

function product(over: Partial<WooProduct> = {}): WooProduct {
  return {
    id: 101,
    name: 'Rolex Submariner Date 126610LN',
    slug: 'rolex-submariner',
    price: '4.99',
    stock_quantity: 250,
    competition_type: 'weekly',
    answer_options: ['SUBMARINER', 'GMT-MASTER II', 'YACHT-MASTER', 'AIR-KING'],
    correct_answer: 'Submariner',
    ...over,
  } as WooProduct
}

// ── Skill question ───────────────────────────────────────────────────────────

test('skill: a complete question is accepted', () => {
  assert.equal(getSkillConfigProblem(product()), null)
})

test('skill: fail closed on missing or inconsistent configuration', () => {
  assert.equal(getSkillConfigProblem(product({ answer_options: undefined })), 'missing_options')
  assert.equal(getSkillConfigProblem(product({ answer_options: [] })), 'missing_options')
  assert.equal(getSkillConfigProblem(product({ correct_answer: undefined })), 'missing_correct_answer')
  assert.equal(getSkillConfigProblem(product({ correct_answer: '   ' })), 'missing_correct_answer')
  assert.equal(getSkillConfigProblem(product({ correct_answer: 'DAYTONA' })), 'correct_answer_not_an_option')
})

test('skill: answers must be one of the options and map to the canonical label', () => {
  const p = product()
  assert.equal(matchAnswerOption(p, 'submariner'), 'SUBMARINER')
  assert.equal(matchAnswerOption(p, '  gmt-master   ii '), 'GMT-MASTER II')
  assert.equal(matchAnswerOption(p, 'DAYTONA'), null)
  assert.equal(matchAnswerOption(p, ''), null)
  assert.equal(matchAnswerOption(p, 42), null)
  assert.equal(matchAnswerOption(p, undefined), null)
  assert.equal(matchAnswerOption(p, 'x'.repeat(500)), null)
})

test('skill: normalisation is whitespace- and case-insensitive', () => {
  assert.equal(normaliseAnswer('  Yacht-Master \n '), 'yacht-master')
})

// ── Competition lifecycle (server-side entry gate) ───────────────────────────

test('lifecycle: live competition is open', () => {
  const p = product({ entries_close_date: iso(NOW + 48 * HOUR) } as Partial<WooProduct>)
  assert.equal(getWooEffectiveStatus(p, NOW), 'live')
  assert.equal(isWooEntryClosed(p, NOW), false)
})

test('lifecycle: scheduled (go live in the future) is not enterable', () => {
  const p = product({ go_live_date: iso(NOW + HOUR), entries_close_date: iso(NOW + 48 * HOUR) } as Partial<WooProduct>)
  assert.equal(getWooEffectiveStatus(p, NOW), 'scheduled')
  assert.equal(isWooEntryClosed(p, NOW), true)
})

test('lifecycle: deadline passed → closed, even if stored status says Live', () => {
  const p = product({ competition_status: 'Live', entries_close_date: iso(NOW - 1000) } as Partial<WooProduct>)
  assert.equal(getWooEffectiveStatus(p, NOW), 'closed')
})

test('lifecycle: legacy record without entries_close_date falls back to draw_date', () => {
  const p = product({ draw_date: iso(NOW - HOUR) } as Partial<WooProduct>)
  assert.equal(getWooEffectiveStatus(p, NOW), 'closed')
})

test('lifecycle: sold out (stock 0) → closed; untracked stock (null) is not sold out', () => {
  assert.equal(getWooEffectiveStatus(product({ stock_quantity: 0 }), NOW), 'closed')
  assert.equal(getWooEffectiveStatus(product({ stock_quantity: null } as Partial<WooProduct>), NOW), 'live')
})

test('lifecycle: manual close holds; an automatic close does not stick', () => {
  const manual = product({
    competition_status: 'Competition Closed',
    pwc_lifecycle: { manual_close: true } as WooProduct['pwc_lifecycle'],
  })
  assert.equal(getWooEffectiveStatus(manual, NOW), 'closed')
  const auto = product({
    competition_status: 'Competition Closed',
    pwc_lifecycle: { manual_close: false } as WooProduct['pwc_lifecycle'],
  })
  assert.equal(getWooEffectiveStatus(auto, NOW), 'live')
})

test('lifecycle: archived (To Past Winners) is never enterable', () => {
  assert.equal(getWooEffectiveStatus(product({ competition_status: 'To Past Winners' }), NOW), 'archived')
})

test('lifecycle: WordPress-computed closed/archived always wins', () => {
  const p = product({ pwc_lifecycle: { effective_status: 'closed' } as WooProduct['pwc_lifecycle'] })
  assert.equal(getWooEffectiveStatus(p, NOW), 'closed')
})

test('lifecycle: a deadline that passed after WordPress said "live" (60s cache) still closes', () => {
  const p = product({
    pwc_lifecycle: { effective_status: 'live', entries_close_utc: iso(NOW - 5_000) } as WooProduct['pwc_lifecycle'],
  })
  assert.equal(getWooEffectiveStatus(p, NOW), 'closed')
})

// ── Bundle discounts + prices (display must match what WooCommerce charges) ──

const RAW_CONFIG = {
  enabled: true,
  apply_to: { weekly: true, monthly: true, special: false },
  exclude_free_products: true,
  allow_coupon_stacking: false,
  tiers: [
    { min_qty: 10, discount_percent: 15, enabled: true },
    { min_qty: 3, discount_percent: 5, enabled: true },
    { min_qty: 5, discount_percent: 10, enabled: true },
    { min_qty: 20, discount_percent: 20, enabled: false }, // disabled → ignored
    { min_qty: 0, discount_percent: 50, enabled: true },   // invalid → ignored
    { min_qty: 50, discount_percent: 150, enabled: true }, // clamped to 100
  ],
}

test('bundle: config is normalised, filtered, clamped and sorted', () => {
  const cfg = normalizeBundleConfig(RAW_CONFIG)
  assert.deepEqual(cfg.tiers.map(t => [t.minQty, t.discountPercent]), [[3, 5], [5, 10], [10, 15], [50, 100]])
  assert.equal(normalizeBundleConfig(null).enabled, false)
  assert.equal(normalizeBundleConfig('garbage').tiers.length, 0)
})

test('bundle: eligibility by type, free products excluded, special off by default', () => {
  const cfg = normalizeBundleConfig(RAW_CONFIG)
  assert.ok(getEligibleTiers(cfg, 'weekly', 4.99, false).length > 0)
  assert.equal(getEligibleTiers(cfg, 'special', 4.99, false).length, 0)
  assert.equal(getEligibleTiers(cfg, 'starter', 4.99, false).length, 0)
  assert.equal(getEligibleTiers(cfg, 'weekly', 0, true).length, 0)
  assert.equal(getEligibleTiers({ ...cfg, enabled: false }, 'weekly', 4.99, false).length, 0)
})

test('bundle: highest matching tier wins and rounding matches WooCommerce', () => {
  const tiers = normalizeBundleConfig(RAW_CONFIG).tiers
  assert.equal(discountPercentForQty(tiers, 1), 0)
  assert.equal(discountPercentForQty(tiers, 4), 5)
  assert.equal(discountPercentForQty(tiers, 12), 15)
  assert.equal(bundleUnitPrice(4.99, tiers, 3), 4.74)       // round(4.99 × 0.95, 2)
  assert.equal(bundleLineTotal(4.99, tiers, 3), 14.22)
  assert.equal(bundleLineTotal(4.99, tiers, 10), 42.4)      // 4.24 × 10
  assert.equal(fullLineTotal(4.99, 10), 49.9)
  assert.equal(bundleSaving(4.99, tiers, 10), 7.5)
  assert.equal(bundleLineTotal(0, tiers, 10), 0)            // free never priced
})

// ── Quantity limits ──────────────────────────────────────────────────────────

test('quantity: per-member cap and live stock both limit the selection', () => {
  assert.equal(getAllowedMaxQty({ maxTicketsPerPurchase: 80 }), 80)
  assert.equal(getAllowedMaxQty({ maxTicketsPerPurchase: 80, ticketsLeft: 12 }), 12)
  assert.equal(getAllowedMaxQty({ maxTicketsPerPurchase: 1 }), 1) // sold_individually
  assert.equal(getAllowedMaxQty({}), 100)
  assert.equal(clampQuantityToAllowedRange(500, { maxTicketsPerPurchase: 80 }), 80)
  assert.equal(clampQuantityToAllowedRange(-3, { maxTicketsPerPurchase: 80 }), 1)
  assert.equal(canIncreaseQuantity(80, { maxTicketsPerPurchase: 80 }), false)
})
