// lib/woocommerce.ts — Server-side WooCommerce API layer
// IMPORTANT: This file must only be imported in Server Components or API routes.
// Never use NEXT_PUBLIC_ prefix for WOOCOMMERCE_CONSUMER_KEY or WOOCOMMERCE_CONSUMER_SECRET.

import { competitions, getCompetitionBySlug } from './competition-data'
import type { Competition } from './competition-data'
export type { Competition } from './competition-data'

// ── Safe product shape returned by fetchWooProducts / fetchWooProductBySlug ──
export interface WooProduct {
  id: number
  name: string
  slug: string
  price: string
  regular_price: string
  stock_quantity: number | null
  stock_status: string
  status: string
  permalink: string
  images: Array<{ src: string; alt: string }>
  /** ACF custom field: draw/closing date for this competition. Extracted from meta_data. */
  draw_date?: string
  /** ACF custom field: fixed maximum entries for this competition. */
  total_entries?: number
  /** ACF custom field: retail value of the prize (number). */
  retail_value?: number
  /** ACF custom field: prize condition (select field, e.g. "Brand New · Full Box & Papers"). */
  condition?: string
  /** ACF custom field: cash alternative value (number). */
  cash_alternative?: number
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

// ── ACF / meta_data helpers ──────────────────────────────────────────────────

/**
 * Extract a value from the WooCommerce meta_data array by key.
 * Returns the raw value or undefined if not found.
 */
function getMetaValue(raw: Record<string, unknown>, key: string): unknown {
  const metaData = Array.isArray(raw.meta_data) ? raw.meta_data as Record<string, unknown>[] : []
  const entry = metaData.find(m => m.key === key)
  return entry?.value
}

// ── draw_date helpers ────────────────────────────────────────────────────────

/**
 * Normalise any ACF draw_date value to a valid UTC ISO string.
 *
 * ACF returns dates in different formats depending on the field type and
 * return-format setting. We handle the most common ones:
 *
 *   "20260530"              ACF Date field (default Ymd format)     → "2026-05-30T00:00:00Z"
 *   "2026-05-30 23:59:00"   ACF Date/Time field (Y-m-d H:i:s)      → "2026-05-30T23:59:00Z"
 *   "2026-05-30T23:59:00"   ISO without timezone                    → "2026-05-30T23:59:00Z"
 *   "2026-05-30T23:59:00Z"  Full ISO — returned as-is
 *   1748649540              Unix timestamp (10 digits)               → ISO via Date
 *
 * Timezone assumption: values without timezone info are treated as UTC so
 * all visitors worldwide see the same remaining time. If your WordPress site
 * is set to a non-UTC timezone (e.g. Europe/London), switch ACF to a
 * Date/Time field and append the UTC offset in the value, or set WP to UTC.
 *
 * Returns empty string if the value cannot be normalised to a valid date.
 */
function parseWooDrawDate(raw: string): string {
  if (!raw || raw === 'null' || raw === 'false' || raw === '0') return ''
  const trimmed = raw.trim()
  if (!trimmed) return ''

  // Unix timestamp — 10 digits (seconds) or 13 digits (milliseconds)
  if (/^\d{10,13}$/.test(trimmed)) {
    const ms = trimmed.length === 13 ? Number(trimmed) : Number(trimmed) * 1000
    const d = new Date(ms)
    return isNaN(d.getTime()) ? '' : d.toISOString()
  }

  // ACF Date field default: "YYYYMMDD" (8 digits, no separators)
  // e.g. "20260530" → "2026-05-30T00:00:00Z"
  // NOTE: This format has no time component — the draw will close at midnight UTC.
  // To specify an exact closing time, switch to an ACF Date/Time picker field.
  if (/^\d{8}$/.test(trimmed)) {
    const y = trimmed.slice(0, 4)
    const m = trimmed.slice(4, 6)
    const d = trimmed.slice(6, 8)
    const iso = `${y}-${m}-${d}T00:00:00Z`
    return isNaN(new Date(iso).getTime()) ? '' : iso
  }

  // Already has timezone info — validate and return as-is
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    return isNaN(new Date(trimmed).getTime()) ? '' : trimmed
  }

  // "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DDTHH:MM:SS" — treat as UTC
  const normalised = trimmed.replace(' ', 'T') + 'Z'
  return isNaN(new Date(normalised).getTime()) ? '' : normalised
}

/**
 * Format a valid ISO draw date as a human-readable string.
 * Returns a safe fallback if the date is missing or cannot be parsed.
 */
function formatDrawDateDisplay(iso: string): string {
  if (!iso) return 'Draw date coming soon'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return 'Draw date coming soon'
    const datePart = d.toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    })
    const timePart = d.toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
    })
    return `${datePart}, ${timePart} UTC`
  } catch {
    return 'Draw date coming soon'
  }
}

// ── Safe field filter — never expose raw WooCommerce response ────────────────
function toSafeProduct(raw: Record<string, unknown>): WooProduct {
  const rawImages = Array.isArray(raw.images) ? raw.images as Record<string, unknown>[] : []

  // draw_date: prefer ACF object field, fall back to meta_data array
  const acf = (raw.acf && typeof raw.acf === 'object') ? raw.acf as Record<string, unknown> : {}

  const drawDateVal = acf.draw_date ?? getMetaValue(raw, 'draw_date')
  const drawDateRaw = (drawDateVal !== null && drawDateVal !== undefined && drawDateVal !== false)
    ? String(drawDateVal).trim()
    : ''

  // total_entries: prefer ACF object field, fall back to meta_data array
  const rawTotalEntries = acf.total_entries ?? getMetaValue(raw, 'total_entries')
  const parsedTotalEntries = rawTotalEntries != null ? Number(rawTotalEntries) : NaN
  const totalEntries = !isNaN(parsedTotalEntries) && parsedTotalEntries > 0 ? parsedTotalEntries : undefined

  // retail_value (number ACF field)
  const rawRetailValue = acf.retail_value ?? getMetaValue(raw, 'retail_value')
  const parsedRetailValue = rawRetailValue != null ? Number(rawRetailValue) : NaN
  const retailValue = !isNaN(parsedRetailValue) && parsedRetailValue > 0 ? parsedRetailValue : undefined

  // condition (select ACF field)
  const rawCondition = acf.condition ?? getMetaValue(raw, 'condition')
  const condition = (rawCondition != null && rawCondition !== '' && rawCondition !== false)
    ? String(rawCondition).trim()
    : undefined

  // cash_alternative (number ACF field)
  const rawCashAlt = acf.cash_alternative ?? getMetaValue(raw, 'cash_alternative')
  const parsedCashAlt = rawCashAlt != null ? Number(rawCashAlt) : NaN
  const cashAlternative = !isNaN(parsedCashAlt) && parsedCashAlt > 0 ? parsedCashAlt : undefined

  return {
    id:             Number(raw.id)             || 0,
    name:           String(raw.name            ?? ''),
    slug:           String(raw.slug            ?? ''),
    price:          String(raw.price           ?? ''),
    regular_price:  String(raw.regular_price   ?? ''),
    stock_quantity: raw.stock_quantity != null ? Number(raw.stock_quantity) : null,
    stock_status:   String(raw.stock_status    ?? ''),
    status:         String(raw.status          ?? ''),
    permalink:      String(raw.permalink       ?? ''),
    images:         rawImages.map(img => ({
      src: String(img.src ?? ''),
      alt: String(img.alt ?? ''),
    })),
    draw_date:        drawDateRaw || undefined,
    total_entries:    totalEntries,
    retail_value:     retailValue,
    condition:        condition,
    cash_alternative: cashAlternative,
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
 * Fetch a single WooCommerce product by ID.
 * Returns only safe, non-sensitive fields.
 * Server-side only.
 */
export async function fetchWooProductById(id: number): Promise<{ product: WooProduct | null; error?: string }> {
  try {
    const data = await wcFetch(`products/${id}`)
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return { product: null, error: 'Unexpected response shape from WooCommerce API.' }
    }
    return { product: toSafeProduct(data as Record<string, unknown>) }
  } catch (err) {
    return { product: null, error: (err as Error).message }
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

/**
 * Merge live WooCommerce product data into a Competition object.
 * Only overrides fields that WooCommerce provides; everything else keeps its
 * original value so fallback content and non-product fields are unaffected.
 * Server-side only.
 */
export function mergeWooData(
  competition: Competition,
  wooProduct: WooProduct,
): Competition {
  const merged: Competition = { ...competition }

  if (wooProduct.name) {
    merged.title = wooProduct.name
    merged.shortName = wooProduct.name
  }

  const firstImage = wooProduct.images[0]?.src
  if (firstImage) {
    merged.image = firstImage
    merged.heroImage = firstImage
  }

  const parsedPrice = parseFloat(wooProduct.price)
  if (!isNaN(parsedPrice)) {
    merged.entryPrice = parsedPrice
    // Always derive isFree from WooCommerce price — overrides any static fallback
    merged.isFree = parsedPrice === 0
    // When free, enforce 1 entry per member; when paid, restore competition default
    merged.maxTicketsPerPurchase = parsedPrice === 0 ? 1 : competition.maxTicketsPerPurchase
  }

  merged.wooStockQuantity = wooProduct.stock_quantity

  // Pull draw_date from ACF — overrides the static fallback in competition-data.ts.
  // Only applied when the parsed result is a valid date string (parseWooDrawDate
  // returns '' for any value it cannot normalise, leaving the static fallback intact).
  if (wooProduct.draw_date) {
    const parsed = parseWooDrawDate(wooProduct.draw_date)
    if (parsed) {
      merged.drawDate = parsed
      merged.drawDateDisplay = formatDrawDateDisplay(parsed)
    }
  }

  // ── ACF product-info overrides ────────────────────────────────────────────
  if (wooProduct.retail_value != null)     merged.retailValue     = wooProduct.retail_value
  if (wooProduct.condition    != null)     merged.condition       = wooProduct.condition
  if (wooProduct.cash_alternative != null) merged.cashAlternative = wooProduct.cash_alternative

  // ── Correct Total Entries / Remaining logic ──────────────────────────────
  // totalEntries = ACF total_entries (fixed max, never changes as tickets sell)
  // remainingTickets = WooCommerce stock_quantity (decreases as tickets sell)
  // soldTickets = totalEntries - remainingTickets
  // soldPercentage = soldTickets / totalEntries * 100

  const totalEntries = wooProduct.total_entries ?? competition.totalTickets
  merged.totalTickets = totalEntries

  if (wooProduct.stock_quantity != null) {
    const remaining = Math.max(0, wooProduct.stock_quantity)
    const sold = Math.max(0, totalEntries - remaining)
    merged.ticketsLeft  = remaining
    merged.ticketsSold  = sold
    merged.soldPercentage = totalEntries > 0
      ? Math.round((sold / totalEntries) * 1000) / 10
      : 0
  } else if (wooProduct.total_entries != null) {
    // total_entries known but no stock info — keep static ticketsLeft/soldPercentage
    // but update totalTickets to the ACF value
    const sold = Math.max(0, totalEntries - competition.ticketsLeft)
    merged.ticketsLeft    = competition.ticketsLeft
    merged.ticketsSold    = sold
    merged.soldPercentage = totalEntries > 0
      ? Math.round((sold / totalEntries) * 1000) / 10
      : competition.soldPercentage
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[PWC] #${wooProduct.id} "${wooProduct.name}" | ` +
      `price: ${wooProduct.price} | stock(remaining): ${wooProduct.stock_quantity} | ` +
      `total_entries(ACF): ${wooProduct.total_entries ?? '—'} | ` +
      `retail_value(ACF): ${wooProduct.retail_value ?? '—'} | ` +
      `condition(ACF): ${wooProduct.condition ?? '—'} | ` +
      `cash_alternative(ACF): ${wooProduct.cash_alternative ?? '—'} | ` +
      `totalTickets: ${merged.totalTickets} | ticketsLeft: ${merged.ticketsLeft} | ` +
      `soldPercentage: ${merged.soldPercentage}% | ` +
      `draw_date raw: ${wooProduct.draw_date ?? '—'} | drawDate: ${merged.drawDate}`
    )
    if (wooProduct.total_entries == null) {
      console.warn(
        `[PWC] ⚠ total_entries ACF field missing for product #${wooProduct.id} "${wooProduct.name}". ` +
        `Falling back to static totalTickets: ${competition.totalTickets}`
      )
    }
  }

  return merged
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
