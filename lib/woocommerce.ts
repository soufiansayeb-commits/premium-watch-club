// lib/woocommerce.ts — Server-side WooCommerce API layer
// IMPORTANT: This file must only be imported in Server Components or API routes.
// Never use NEXT_PUBLIC_ prefix for WOOCOMMERCE_CONSUMER_KEY or WOOCOMMERCE_CONSUMER_SECRET.

import { competitions, getCompetitionBySlug } from './competition-data'
export type { Competition } from './competition-data'

// ── Safe product shape returned by fetchWooProducts / fetchWooProductBySlug ──
export interface WooProduct {
  id: number
  name: string
  slug: string
  price: string
  stock_quantity: number | null
  status: string
  permalink: string
}

// ── Internal config check ────────────────────────────────────────────────────
function getConfig(): { storeUrl: string; key: string; secret: string } | null {
  const storeUrl = process.env.WOOCOMMERCE_STORE_URL || ''
  const key      = process.env.WOOCOMMERCE_CONSUMER_KEY || ''
  const secret   = process.env.WOOCOMMERCE_CONSUMER_SECRET || ''
  if (!storeUrl || !key || !secret) return null
  return { storeUrl, key, secret }
}

// ── Core fetch helper (server-side only) ─────────────────────────────────────
async function wcFetch(endpoint: string): Promise<unknown> {
  const config = getConfig()
  if (!config) {
    throw new Error('WooCommerce env vars not configured (WOOCOMMERCE_STORE_URL / KEY / SECRET missing).')
  }

  const { storeUrl, key, secret } = config
  const url = `${storeUrl}/wp-json/wc/v3/${endpoint}`

  // Try Basic Auth first; some hosts block it — query auth is the fallback below.
  const basicToken = Buffer.from(`${key}:${secret}`).toString('base64')

  let res: Response
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Basic ${basicToken}`,
        'Content-Type': 'application/json',
      },
      // Next.js ISR: revalidate every 60 s
      next: { revalidate: 60 },
    })
  } catch (networkErr) {
    throw new Error(`Network error reaching WooCommerce: ${(networkErr as Error).message}`)
  }

  // If Basic Auth is blocked (401), retry with query-string auth
  if (res.status === 401) {
    const separator = endpoint.includes('?') ? '&' : '?'
    const qsUrl = `${url}${separator}consumer_key=${key}&consumer_secret=${secret}`
    try {
      res = await fetch(qsUrl, { next: { revalidate: 60 } })
    } catch (networkErr) {
      throw new Error(`Network error (query-auth retry): ${(networkErr as Error).message}`)
    }
  }

  if (res.status === 401) {
    throw new Error('WooCommerce API: 401 Unauthorized — check consumer key/secret.')
  }
  if (!res.ok) {
    throw new Error(`WooCommerce API error: HTTP ${res.status}`)
  }

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error(`WooCommerce API returned non-JSON response (content-type: ${contentType})`)
  }

  return res.json()
}

// ── Safe field filter — never expose raw WooCommerce response ────────────────
function toSafeProduct(raw: Record<string, unknown>): WooProduct {
  return {
    id:             Number(raw.id)             || 0,
    name:           String(raw.name            ?? ''),
    slug:           String(raw.slug            ?? ''),
    price:          String(raw.price           ?? ''),
    stock_quantity: raw.stock_quantity != null ? Number(raw.stock_quantity) : null,
    status:         String(raw.status          ?? ''),
    permalink:      String(raw.permalink       ?? ''),
  }
}

// ── Public helpers ───────────────────────────────────────────────────────────

/**
 * Fetch all published WooCommerce products (up to 20).
 * Returns only safe, non-sensitive fields.
 * Server-side only.
 */
export async function fetchWooProducts(): Promise<{ products: WooProduct[]; error?: string }> {
  try {
    const data = await wcFetch('products?status=publish&per_page=20')
    if (!Array.isArray(data)) {
      return { products: [], error: 'Unexpected response shape from WooCommerce API.' }
    }
    return { products: (data as Record<string, unknown>[]).map(toSafeProduct) }
  } catch (err) {
    return { products: [], error: (err as Error).message }
  }
}

/**
 * Fetch a single WooCommerce product by slug.
 * Returns only safe, non-sensitive fields.
 * Server-side only.
 */
export async function fetchWooProductBySlug(slug: string): Promise<{ product: WooProduct | null; error?: string }> {
  try {
    const data = await wcFetch(`products?slug=${encodeURIComponent(slug)}`)
    if (!Array.isArray(data)) {
      return { product: null, error: 'Unexpected response shape from WooCommerce API.' }
    }
    const first = (data as Record<string, unknown>[])[0]
    return { product: first ? toSafeProduct(first) : null }
  } catch (err) {
    return { product: null, error: (err as Error).message }
  }
}

// ── Legacy helpers (still used by existing pages — keep unchanged) ────────────

export async function fetchCompetitions() {
  return competitions
}

export async function fetchCompetitionBySlug(slug: string) {
  return getCompetitionBySlug(slug) ?? null
}

export function buildCheckoutUrl(productId: number, quantity: number): string {
  const checkoutBase = process.env.NEXT_PUBLIC_WOOCOMMERCE_CHECKOUT_URL
  const storeUrl     = process.env.WOOCOMMERCE_STORE_URL || 'https://example.com'
  const base         = checkoutBase || `${storeUrl}/checkout/`
  try {
    const url = new URL(base)
    url.searchParams.set('add-to-cart', String(productId))
    url.searchParams.set('quantity',    String(quantity))
    return url.toString()
  } catch {
    return `${base}?add-to-cart=${productId}&quantity=${quantity}`
  }
}
