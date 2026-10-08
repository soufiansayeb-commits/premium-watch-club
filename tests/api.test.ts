// tests/api.test.ts — end-to-end tests of the Next.js API routes.
//
// Runs against a production build (`next start`) wired to the mock WooCommerce
// in tests/mock-woo/server.mjs — never against the live shop. See tests/README.md.
//
//   BASE_URL                 Next.js server        (default http://127.0.0.1:3100)
//   PWC_CART_HANDOFF_SECRET  same value the server was started with

import { test } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3100'
const SECRET = process.env.PWC_CART_HANDOFF_SECRET || 'test-handoff-secret-0123456789abcdef'

// Fixture IDs (tests/mock-woo/server.mjs)
const LIVE = 9001, MISCONFIGURED = 9002, SCHEDULED = 9003, SOLD_OUT = 9004, CLOSED = 9005, MANUAL_CLOSE = 9006

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, json: json as Record<string, unknown>, headers: res.headers }
}

const validate = (productId: unknown, selectedAnswer: unknown) =>
  post('/api/skill-challenge/validate', { productId, selectedAnswer })

const checkout = (items: unknown) => post('/api/prepare-checkout', { items })

function decodeHandoff(url: string) {
  const u = new URL(url)
  const encoded = u.searchParams.get('pwc_cart') ?? ''
  const sig = u.searchParams.get('pwc_sig') ?? ''
  const json = Buffer.from(encoded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
  return { encoded, sig, payload: JSON.parse(json) }
}

// ── Skill-challenge validation ───────────────────────────────────────────────

test('validate: accepts a listed answer and never reveals correctness', async () => {
  for (const answer of ['SUBMARINER', 'GMT-MASTER II', 'air-king']) {
    const r = await validate(LIVE, answer)
    assert.equal(r.status, 200, answer)
    assert.deepEqual(r.json, { accepted: true }, 'response must not carry isCorrect')
  }
})

test('validate: rejects answers that are not an option', async () => {
  const r = await validate(LIVE, 'DAYTONA')
  assert.equal(r.status, 422)
  assert.equal(r.json.accepted, undefined)
})

test('validate: fails closed on an incomplete skill question', async () => {
  const r = await validate(MISCONFIGURED, 'SUBMARINER')
  assert.equal(r.status, 503)
})

test('validate: closed, sold-out, scheduled and manually closed competitions refuse entries', async () => {
  for (const id of [CLOSED, SOLD_OUT, SCHEDULED, MANUAL_CLOSE]) {
    const r = await validate(id, 'SUBMARINER')
    assert.equal(r.status, 409, `product ${id}`)
  }
})

test('validate: input validation and unknown products', async () => {
  assert.equal((await validate('9001', 'SUBMARINER')).status, 400)
  assert.equal((await validate(-1, 'SUBMARINER')).status, 400)
  assert.equal((await validate(LIVE, '')).status, 400)
  assert.equal((await validate(LIVE, 7)).status, 400)
  assert.equal((await validate(123456, 'SUBMARINER')).status, 404)
  assert.equal((await post('/api/skill-challenge/validate', 'not json')).status, 400)
  // The removed "hardcoded" mode must not answer any more.
  assert.equal((await post('/api/skill-challenge/validate', { challengeId: 'wc-id-001', optionId: 'wc-d' })).status, 400)
})

// ── Checkout handoff ─────────────────────────────────────────────────────────

test('prepare-checkout: signs a valid basket with HMAC, nonce and expiry — no price, no result', async () => {
  const r = await checkout([{ id: LIVE, qty: 3, skillAnswer: 'submariner', skillResult: 'Correct', price: 0.01 }])
  assert.equal(r.status, 200)
  assert.equal(r.headers.get('cache-control'), 'no-store')
  const url = String(r.json.url)
  const { encoded, sig, payload } = decodeHandoff(url)

  assert.equal(sig, crypto.createHmac('sha256', SECRET).update(encoded).digest('hex'), 'HMAC must verify')
  assert.equal(payload.v, 2)
  assert.match(payload.nonce, /^[0-9a-f]{32}$/)
  assert.ok(Math.abs(payload.ts - Date.now() / 1000) < 30)
  assert.deepEqual(payload.items, [{ id: LIVE, qty: 3, skillAnswer: 'SUBMARINER' }],
    'only id/qty/canonical answer are signed — client price and result are dropped')
})

test('prepare-checkout: every link is unique (nonce)', async () => {
  const a = await checkout([{ id: LIVE, qty: 1, skillAnswer: 'SUBMARINER' }])
  const b = await checkout([{ id: LIVE, qty: 1, skillAnswer: 'SUBMARINER' }])
  assert.notEqual(decodeHandoff(String(a.json.url)).payload.nonce, decodeHandoff(String(b.json.url)).payload.nonce)
})

test('prepare-checkout: a tampered payload no longer matches its signature', async () => {
  const r = await checkout([{ id: LIVE, qty: 1, skillAnswer: 'SUBMARINER' }])
  const { payload, sig } = decodeHandoff(String(r.json.url))
  payload.items[0].qty = 500
  const forged = Buffer.from(JSON.stringify(payload)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  assert.notEqual(crypto.createHmac('sha256', SECRET).update(forged).digest('hex'), sig)
})

test('prepare-checkout: fails closed for closed / sold-out / scheduled / misconfigured competitions', async () => {
  for (const id of [CLOSED, SOLD_OUT, SCHEDULED, MANUAL_CLOSE]) {
    const r = await checkout([{ id, qty: 1, skillAnswer: 'SUBMARINER' }])
    assert.equal(r.status, 409, `product ${id}`)
    assert.equal(r.json.url, undefined)
  }
  const bad = await checkout([{ id: MISCONFIGURED, qty: 1, skillAnswer: 'SUBMARINER' }])
  assert.equal(bad.status, 503)
  // One closed item blocks the whole basket — never a partial, surprising checkout.
  const mixed = await checkout([{ id: LIVE, qty: 1, skillAnswer: 'SUBMARINER' }, { id: CLOSED, qty: 1, skillAnswer: 'SUBMARINER' }])
  assert.equal(mixed.status, 409)
})

test('prepare-checkout: requires a valid skill answer per item', async () => {
  assert.equal((await checkout([{ id: LIVE, qty: 1 }])).status, 400)
  assert.equal((await checkout([{ id: LIVE, qty: 1, skillAnswer: 'DAYTONA' }])).status, 400)
})

test('prepare-checkout: rejects malformed baskets', async () => {
  const ok = { id: LIVE, qty: 1, skillAnswer: 'SUBMARINER' }
  assert.equal((await checkout([])).status, 400)
  assert.equal((await checkout('nope')).status, 400)
  assert.equal((await checkout([{ ...ok, qty: 0 }])).status, 400)
  assert.equal((await checkout([{ ...ok, qty: 1.5 }])).status, 400)
  assert.equal((await checkout([{ ...ok, qty: 1001 }])).status, 400)
  assert.equal((await checkout([{ ...ok, id: '9001' }])).status, 400)
  assert.equal((await checkout([ok, ok])).status, 400, 'duplicate competition')
  assert.equal((await checkout(Array.from({ length: 21 }, (_, i) => ({ ...ok, id: i + 1 })))).status, 400)
  assert.equal((await checkout([{ ...ok, id: 123456 }])).status, 409, 'unknown product')
})

// ── Live activity ────────────────────────────────────────────────────────────

test('live-activity: only paid (processing/completed) orders, city only — no on-hold/pending/failed', async () => {
  const res = await fetch(`${BASE}/api/live-activity?productId=${LIVE}`)
  assert.equal(res.status, 200)
  const { items } = await res.json() as { items: Array<{ city: string | null; quantity: number; text: string }> }
  const cities = items.map(i => i.city).sort()
  assert.deepEqual(cities, ['Berlin', 'London'])
  for (const i of items) assert.deepEqual(Object.keys(i).sort(), ['city', 'quantity', 'text'])
  assert.equal((await fetch(`${BASE}/api/live-activity?productId=abc`)).status, 400)
})

// ── Removed routes and security headers ──────────────────────────────────────

test('removed debug / legacy routes are gone', async () => {
  assert.equal((await fetch(`${BASE}/api/debug/woocommerce`)).status, 404)
  assert.equal((await fetch(`${BASE}/api/cart/add`, { method: 'POST', body: '{}' })).status, 404)
})

test('security headers are sent on pages and API routes', async () => {
  for (const path of ['/', '/api/bundle-discounts']) {
    const res = await fetch(`${BASE}${path}`)
    assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN', path)
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff', path)
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin', path)
    assert.match(res.headers.get('content-security-policy') ?? '', /frame-ancestors 'self'/, path)
    assert.equal(res.headers.get('x-powered-by'), null, path)
  }
})
