// app/api/prepare-checkout/route.ts
//
// Builds the HMAC-signed handoff URL that moves the customer's basket into the
// WooCommerce checkout (woocommerce-snippets/pwc-cart-handoff.php).
//
// WooCommerce stays the source of truth: it sets the price, applies bundle
// discounts, caps quantities, checks stock and the competition lifecycle, and
// decides whether each skill answer is correct. Nothing here is a price or a
// result — only product IDs, quantities and the answer the customer picked.
//
// This route re-checks every item server-side before signing anything, and
// fails closed: if a competition cannot be confirmed open with a complete skill
// question, no checkout link is issued.
//
// The signed payload carries a random nonce so WordPress can accept each link
// once (replay protection) on top of the 5-minute expiry.

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { fetchWooProductById, isWooEntryClosed } from '@/lib/woocommerce'
import { getSkillConfigProblem, matchAnswerOption } from '@/lib/skill-check'

/** Upper bounds on a single request — far above any real basket. */
const MAX_ITEMS = 20
const MAX_QTY_PER_ITEM = 1000

interface RequestItem {
  id: number
  qty: number
  skillAnswer: unknown
}

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status })
}

export async function POST(req: NextRequest) {
  const secret = process.env.PWC_CART_HANDOFF_SECRET
  const storeUrl = process.env.WOOCOMMERCE_STORE_URL
  if (!secret || !storeUrl) {
    console.error('[PWC prepare-checkout] checkout handoff is not configured (missing env vars)')
    return fail('Checkout is temporarily unavailable. Please try again later.', 503)
  }

  let rawItems: unknown
  try {
    rawItems = (await req.json())?.items
  } catch {
    return fail('Invalid request.', 400)
  }
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return fail('Your basket is empty.', 400)
  }
  if (rawItems.length > MAX_ITEMS) {
    return fail('Too many competitions in one basket.', 400)
  }

  // ── Shape validation ──────────────────────────────────────────────────────
  const items: RequestItem[] = []
  const seen = new Set<number>()
  for (const raw of rawItems) {
    const i = raw as Partial<RequestItem> | null
    if (
      !i || !Number.isInteger(i.id) || (i.id as number) <= 0 ||
      !Number.isInteger(i.qty) || (i.qty as number) < 1 || (i.qty as number) > MAX_QTY_PER_ITEM
    ) {
      return fail('Your basket contains an invalid item. Please refresh and try again.', 400)
    }
    if (seen.has(i.id as number)) {
      return fail('Your basket contains the same competition twice. Please refresh and try again.', 400)
    }
    seen.add(i.id as number)
    items.push({ id: i.id as number, qty: i.qty as number, skillAnswer: i.skillAnswer })
  }

  // ── Server-side entry gate (fail closed) ──────────────────────────────────
  const lookups = await Promise.all(items.map(i => fetchWooProductById(i.id)))

  const signedItems: Array<{ id: number; qty: number; skillAnswer: string }> = []
  for (let n = 0; n < items.length; n++) {
    const { product, error } = lookups[n]
    if (error) {
      console.error('[PWC prepare-checkout] WooCommerce lookup failed')
      return fail('We could not confirm your entries right now. Please try again in a moment.', 503)
    }
    if (!product) {
      return fail('A competition in your basket is no longer available. Please remove it and try again.', 409)
    }
    const name = product.name || 'A competition in your basket'
    if (isWooEntryClosed(product)) {
      return fail(`${name} is closed and no longer accepting entries. Please remove it from your basket.`, 409)
    }
    const problem = getSkillConfigProblem(product)
    if (problem) {
      console.error(`[PWC prepare-checkout] product #${product.id} skill question not configured (${problem})`)
      return fail(`Entries for ${name} are temporarily unavailable. Please try again later.`, 503)
    }
    const answer = matchAnswerOption(product, items[n].skillAnswer)
    if (!answer) {
      return fail(`Please answer the skill question for ${name} again before checking out.`, 400)
    }
    signedItems.push({ id: items[n].id, qty: items[n].qty, skillAnswer: answer })
  }

  // ── Sign ──────────────────────────────────────────────────────────────────
  const payload = {
    v: 2,
    items: signedItems,
    ts: Math.floor(Date.now() / 1000),
    nonce: crypto.randomBytes(16).toString('hex'),
  }

  // URL-safe base64 (no padding)
  const encoded = Buffer.from(JSON.stringify(payload))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  const signature = crypto.createHmac('sha256', secret).update(encoded).digest('hex')

  // WordPress handoff URL — any page works (the wp_loaded hook intercepts it).
  // Deliberately not logged: it is a bearer link for this basket.
  const storeOrigin = new URL(storeUrl).origin
  const url = `${storeOrigin}/?pwc_cart=${encodeURIComponent(encoded)}&pwc_sig=${encodeURIComponent(signature)}`

  return NextResponse.json({ url }, { headers: { 'Cache-Control': 'no-store' } })
}
