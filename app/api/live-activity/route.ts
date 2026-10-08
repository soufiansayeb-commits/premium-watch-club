// app/api/live-activity/route.ts
// Server-side API route — fetches real WooCommerce orders and returns
// anonymised activity items (city + quantity only) for a given product.
// WooCommerce credentials never leave the server.

import { NextRequest, NextResponse } from 'next/server'

// ── Types ────────────────────────────────────────────────────────────────────

interface WooLineItem {
  product_id: number
  quantity:   number
}

interface WooOrder {
  id:         number
  status:     string
  line_items: WooLineItem[]
  billing:    { city?: string }
}

export interface LiveActivityItem {
  city:     string | null  // billing city (or null if missing)
  quantity: number         // tickets purchased for this product
  text:     string         // pre-formatted display string
}

// ── Config ───────────────────────────────────────────────────────────────────

/**
 * Only these order statuses are real, PAID activity. 'on-hold' is deliberately
 * excluded: payment providers use it for payments that are not yet confirmed
 * (pending review / awaiting a callback), so showing those as purchases would
 * present unconfirmed payments as completed ones.
 */
const TRUSTED_STATUSES = new Set(['processing', 'completed'])

/** Maximum activity items returned to the frontend. */
const MAX_ITEMS = 12

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildText(city: string | null, qty: number): string {
  const ticket = qty === 1 ? 'ticket' : 'tickets'
  return city
    ? `Member from ${city} bought ${qty} ${ticket}`
    : `Member bought ${qty} ${ticket}`
}

async function fetchOrders(
  storeUrl: string,
  key: string,
  secret: string,
): Promise<WooOrder[]> {
  const basicToken = Buffer.from(`${key}:${secret}`).toString('base64')
  // Ask WooCommerce for paid statuses only; TRUSTED_STATUSES is re-checked below.
  const query      = 'per_page=50&orderby=date&order=desc&status=processing,completed'
  const endpoint   = `${storeUrl}/wp-json/wc/v3/orders?${query}`

  let res = await fetch(endpoint, {
    headers: { Authorization: `Basic ${basicToken}` },
    // Cache for 45 s in production; always fresh in dev (set via env check below)
    next: { revalidate: process.env.NODE_ENV === 'development' ? 0 : 45 },
  })

  // Some hosts block Basic Auth — retry with query-string credentials
  if (res.status === 401) {
    const qsUrl = `${storeUrl}/wp-json/wc/v3/orders?consumer_key=${encodeURIComponent(key)}&consumer_secret=${encodeURIComponent(secret)}&${query}`
    res = await fetch(qsUrl, {
      next: { revalidate: process.env.NODE_ENV === 'development' ? 0 : 45 },
    })
  }

  if (!res.ok) {
    throw new Error(`WooCommerce API returned HTTP ${res.status}`)
  }

  const data = await res.json()
  return Array.isArray(data) ? (data as WooOrder[]) : []
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // ── Validate productId ──────────────────────────────────────────────────────
  const pidParam  = req.nextUrl.searchParams.get('productId')
  const productId = pidParam ? parseInt(pidParam, 10) : NaN

  if (isNaN(productId) || productId < 1) {
    return NextResponse.json(
      { items: [], error: 'productId must be a positive integer' },
      { status: 400 },
    )
  }

  // ── Check env config ────────────────────────────────────────────────────────
  const storeUrl = process.env.WOOCOMMERCE_STORE_URL        || ''
  const key      = process.env.WOOCOMMERCE_CONSUMER_KEY     || ''
  const secret   = process.env.WOOCOMMERCE_CONSUMER_SECRET  || ''

  if (!storeUrl || !key || !secret) {
    console.warn('[PWC live-activity] WooCommerce env vars not configured — returning empty')
    return NextResponse.json({ items: [] })
  }

  try {
    const orders = await fetchOrders(storeUrl, key, secret)

    // ── Filter + anonymise ──────────────────────────────────────────────────
    const items: LiveActivityItem[] = []

    for (const order of orders) {
      // Only trusted payment statuses
      if (!TRUSTED_STATUSES.has(order.status)) continue

      // Find a line item matching the requested product
      const line = Array.isArray(order.line_items)
        ? order.line_items.find(li => li.product_id === productId)
        : undefined

      if (!line) continue

      // Extract only city (anonymised) — never expose name / email / address
      const city = order.billing?.city?.trim() || null

      items.push({
        city,
        quantity: line.quantity,
        text:     buildText(city, line.quantity),
      })

      if (items.length >= MAX_ITEMS) break
    }


    return NextResponse.json(
      { items },
      {
        headers: {
          // Edge / CDN caching: 45 s fresh, 30 s stale-while-revalidate
          'Cache-Control': process.env.NODE_ENV === 'development'
            ? 'no-store'
            : 'public, s-maxage=45, stale-while-revalidate=30',
        },
      },
    )
  } catch (err) {
    console.error('[PWC live-activity] Error:', (err as Error).message)
    // Always return a safe empty response — never leak error details
    return NextResponse.json({ items: [] })
  }
}
