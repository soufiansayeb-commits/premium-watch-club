// app/api/prepare-checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { fetchWooProductById, isWooEntryClosed } from '@/lib/woocommerce'

export async function POST(req: NextRequest) {
  const secret = process.env.PWC_CART_HANDOFF_SECRET
  if (!secret) {
    console.error('[PWC prepare-checkout] PWC_CART_HANDOFF_SECRET not set in env')
    return NextResponse.json({ error: 'Checkout not configured on server' }, { status: 503 })
  }

  const storeUrl = process.env.WOOCOMMERCE_STORE_URL
  if (!storeUrl) {
    return NextResponse.json({ error: 'WOOCOMMERCE_STORE_URL not configured' }, { status: 503 })
  }

  let items: Array<{ id: number; qty: number; skillAnswer?: string; skillResult?: string }>
  try {
    const body = await req.json()
    items = body.items
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Validate: only positive integer product IDs and quantities ≥ 1
  const validItems = items
    .filter((i) => Number.isInteger(i.id) && i.id > 0 && Number.isInteger(i.qty) && i.qty >= 1)
    .map(i => ({
      id:  i.id,
      qty: i.qty,
      // Sanitise skill fields: strings only, capped at 200 chars, no HTML
      ...(typeof i.skillAnswer === 'string' && i.skillAnswer.trim()
        ? { skillAnswer: i.skillAnswer.trim().slice(0, 200) }
        : {}),
      ...(i.skillResult === 'Correct' || i.skillResult === 'Incorrect'
        ? { skillResult: i.skillResult }
        : {}),
    }))

  if (validItems.length === 0) {
    return NextResponse.json({ error: 'No valid items' }, { status: 400 })
  }

  // Server-side entry gate — the final checkout handoff must never sign a payload
  // for a competition that is archived (To Past Winners) or past its draw date,
  // even if the frontend UI is bypassed. Mirrors the client entryGate(). Products
  // are looked up in parallel; if any is closed the whole checkout is rejected.
  try {
    const products = await Promise.all(
      validItems.map(i => fetchWooProductById(i.id).then(r => r.product).catch(() => null))
    )
    const closed = products.some(p => p != null && isWooEntryClosed(p))
    if (closed) {
      return NextResponse.json(
        { error: 'One or more competitions in your basket are closed and no longer accepting entries.' },
        { status: 409 }
      )
    }
  } catch {
    // A transient WooCommerce failure must not brick checkout; the signed payload
    // still carries a 5-minute expiry enforced server-side in WordPress.
  }

  // Build signed payload with timestamp (5-minute expiry enforced server-side in WordPress)
  const payload = {
    items: validItems,
    ts: Math.floor(Date.now() / 1000),
  }

  const json = JSON.stringify(payload)
  // URL-safe base64 (no padding)
  const encoded = Buffer.from(json)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  const signature = crypto.createHmac('sha256', secret).update(encoded).digest('hex')

  // WordPress handoff URL — works on any page (init hook intercepts it)
  const storeOrigin = new URL(storeUrl).origin
  const handoffUrl = `${storeOrigin}/?pwc_cart=${encodeURIComponent(encoded)}&pwc_sig=${encodeURIComponent(signature)}`

  // ── DEBUG: log every item as it will appear in the signed payload ────────────
  console.log('[PWC HANDOFF PAYLOAD DEBUG]', JSON.stringify(payload, null, 2))
  validItems.forEach((item) => {
    console.log('[PWC HANDOFF ITEM DEBUG]', {
      id:  item.id,
      qty: item.qty,
    })
  })
  console.log('[PWC prepare-checkout] Handoff URL →', handoffUrl)

  return NextResponse.json({ url: handoffUrl })
}
