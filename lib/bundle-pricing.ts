// lib/bundle-pricing.ts
// ─────────────────────────────────────────────────────────────────────────────
// Display-side bundle pricing helper.
//
// This is a thin convenience layer over lib/bundle-discounts.ts — it does NOT
// re-implement any discount maths or duplicate the tiers. Every price preview in
// the frontend (ticket bundle cards, cart drawer, checkout summary) resolves its
// numbers through the SAME live, backend-driven rules exposed at
//   /wp-json/pwc/v1/bundle-discounts
// so they can never disagree. WooCommerce remains authoritative at checkout.
// ─────────────────────────────────────────────────────────────────────────────

import {
  type BundleConfig,
  type BundleTier,
  getEligibleTiers,
  discountPercentForQty,
  bundleLineTotal,
  fullLineTotal,
  bundleSaving,
} from '@/lib/bundle-discounts'

/** The highest tier a quantity qualifies for, or null if none applies. */
export function getEligibleBundleTier(quantity: number, tiers: BundleTier[]): BundleTier | null {
  let match: BundleTier | null = null
  for (const tier of tiers) {
    if (quantity >= tier.minQty) match = tier // tiers sorted asc → highest wins
  }
  return match
}

/** Undiscounted line total (unitPrice × quantity). */
export function calculateOriginalSubtotal(unitPrice: number, quantity: number): number {
  return fullLineTotal(unitPrice, quantity)
}

/** Money saved vs. paying full price for this quantity. */
export function calculateBundleSavings(unitPrice: number, quantity: number, tiers: BundleTier[]): number {
  return bundleSaving(unitPrice, tiers, quantity)
}

/** Discounted line total the customer actually pays (mirrors WooCommerce). */
export function calculateBundleDiscountedTotal(unitPrice: number, quantity: number, tiers: BundleTier[]): number {
  return bundleLineTotal(unitPrice, tiers, quantity)
}

/** Human-readable savings label, e.g. "6% off · You saved £17.10". */
export function formatBundleDiscountLabel(
  discountPercent: number,
  savings: number,
  currency: string,
): string {
  const trimmedPct = Number.isInteger(discountPercent) ? discountPercent : Number(discountPercent.toFixed(1))
  return `${trimmedPct}% off · You saved ${currency}${savings.toFixed(2)}`
}

// ── One-call resolver for a cart / preview line ──────────────────────────────

export interface LinePricingInput {
  price: number
  quantity: number
  competitionType?: string
  isFreeCompetition?: boolean
}

export interface LinePricing {
  /** True when a real bundle discount is applied to this line. */
  discounted: boolean
  discountPercent: number
  /** unitPrice × quantity, before any discount. */
  originalSubtotal: number
  /** What the customer pays (equals originalSubtotal when no discount). */
  discountedSubtotal: number
  savings: number
  /** Pre-formatted savings label, or '' when nothing is discounted. */
  label: string
}

/**
 * Resolve every number the UI needs for one line, from the live config. Handles
 * eligibility (paid weekly/monthly, price > 0, not special/free) via the shared
 * getEligibleTiers — so an ineligible line simply reports full price, no discount.
 */
export function resolveLinePricing(config: BundleConfig, item: LinePricingInput): LinePricing {
  const { price, quantity, competitionType, isFreeCompetition = false } = item
  const tiers = getEligibleTiers(config, competitionType, price, isFreeCompetition)

  const originalSubtotal = calculateOriginalSubtotal(price, quantity)
  const discountedSubtotal = calculateBundleDiscountedTotal(price, quantity, tiers)
  const savings = calculateBundleSavings(price, quantity, tiers)
  const discountPercent = discountPercentForQty(tiers, quantity)
  const discounted = savings > 0 && discountPercent > 0

  return {
    discounted,
    discountPercent,
    originalSubtotal,
    discountedSubtotal,
    savings,
    label: discounted ? formatBundleDiscountLabel(discountPercent, savings, '') : '',
  }
}
