// app/api/prepare-checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

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

  let items: Array<{ id: number; qty: number }>
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
  const validItems = items.filter(
    (i) => Number.isInteger(i.id) && i.id > 0 && Number.isInteger(i.qty) && i.qty >= 1
  )
  if (validItems.length === 0) {
    return NextResponse.json({ error: 'No valid items' }, { status: 400 })
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
