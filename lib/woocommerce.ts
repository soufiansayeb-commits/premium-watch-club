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
  /** ACF custom field: percentage of total_entries allowed per user (e.g. 33 → 33%). */
  max_entries_percentage?: number
  /** WooCommerce native field: when true, product is limited to 1 per order (source of truth for single-entry products). */
  sold_individually?: boolean
  /** ACF custom field: lifecycle status. Values: 'Coming Soon' | 'Live' | 'Sold Out' | 'Draw Pending' | 'Winner Announced' | 'Closed' */
  competition_status?: string
  /** ACF custom field: category type. Values: 'weekly' | 'monthly' | 'free' | 'special' */
  competition_type?: string
  /** ACF custom field: competition sequence number (e.g. 25 → "Competition #25"). */
  competition_number?: number
  /** ACF image field: watch image URL for the skill challenge. */
  challenge_image?: string
  /**
   * Raw ACF image ID for challenge_image — set when ACF returns only an integer/numeric string.
   * Resolved asynchronously via WordPress media API (same pattern as hero_background_image_id).
   */
  challenge_image_id?: number
  /** ACF textarea field: one answer option per line. */
  answer_options?: string[]
  /**
   * ACF text field: the correct answer for validation.
   * SERVER-SIDE ONLY — parsed in toSafeProduct, used only by the validate API route.
   * Never flows into the Competition interface or client components.
   */
  correct_answer?: string
  /** ACF custom field: watch/product reference number (e.g. '116500LN'). */
  watch_reference?: string
  /**
   * ACF image field: background image URL for the homepage hero.
   * Populated when ACF returns a URL string or an image object with url/source_url.
   */
  hero_background_image?: string
  /**
   * WooCommerce product description HTML.
   * Used by ProductEditorial for the "Story Behind The Prize" section.
   */
  description?: string
  /**
   * Raw ACF image ID — set when ACF returns only an integer/numeric-string.
   * Resolved asynchronously via WordPress media API in getAllActiveCompetitionsByType.
   * Not exposed to the Competition object; used only as an intermediate during server render.
   */
  hero_background_image_id?: number

  // ── Past Winners / Winner Archive ACF fields ───────────────────────────────
  /** Show this closed competition on the /past-winners page. */
  show_on_past_winners?: boolean
  /** Show this winner on the homepage winners carousel (requires winner_photo). */
  show_on_homepage_winners?: boolean
  /** e.g. 'archive_only' | 'full_proof' — how this winner is presented. */
  winner_archive_type?: string
  /** Winner display name, e.g. "A.K." */
  winner_display_name?: string
  /** Winner location, e.g. "London". */
  winner_location?: string
  /** ACF image: winner photo (resolved URL). */
  winner_photo?: string
  /** Pending ACF image ID for winner_photo (resolved async). */
  winner_photo_id?: number
  /** Winner testimonial / quote. */
  winner_testimonial?: string
  /** Draw number string, e.g. "024" (kept as string to preserve leading zeros). */
  draw_number?: string
  /** Prize value (number), e.g. 15000. */
  prize_value?: number
  /** Tickets sold for this closed draw. */
  tickets_sold?: number
  /** Total tickets for this closed draw (winner-archive field; falls back to total_entries). */
  total_tickets?: number
  /** Winning entry number, e.g. "417". */
  winning_entry_number?: string
  /** Public Live Draw recording URL (empty → no button). */
  live_draw_url?: string
  /** Draw certificate URL (empty → no button). */
  draw_certificate_url?: string
  /** e.g. 'no_public_proof' | 'verified' — controls proof button visibility. */
  proof_status?: string
  /** ACF image: dedicated Past Winners card image (resolved URL). */
  past_winner_card_image?: string
  /** Pending ACF image ID for past_winner_card_image (resolved async). */
  past_winner_card_image_id?: number
  /** Short quote for the homepage winners carousel. */
  homepage_winner_quote?: string
  /** Sort order for the homepage winners carousel (ascending). */
  homepage_winner_order?: number
  /**
   * Public-facing prize/watch title for archive products.
   * WooCommerce product title is used for admin organisation only (e.g. "PAST WINNER 001").
   * This ACF field holds the real display name (e.g. "Rolex GMT Pepsi").
   * If empty, falls back to the WooCommerce product title.
   */
  past_winner_public_prize_title?: string
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
// Hard cap on how long we wait for WooCommerce before treating it as a failure.
// Without this a hanging upstream stalls the whole server render.
const WC_FETCH_TIMEOUT_MS = 10_000

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
      signal: AbortSignal.timeout(WC_FETCH_TIMEOUT_MS),
      // Next.js ISR: revalidate frequently in dev so stale product config changes
      // (price, sold_individually, ACF fields) are always reflected immediately.
      next: { revalidate: process.env.NODE_ENV === 'development' ? 5 : 60 },
    })
  } catch (networkErr) {
    throw new Error(`Network error reaching WooCommerce: ${(networkErr as Error).message}`)
  }

  // If Basic Auth is blocked (401), retry with query-string auth
  if (res.status === 401) {
    const separator = endpoint.includes('?') ? '&' : '?'
    const qsUrl = `${url}${separator}consumer_key=${key}&consumer_secret=${secret}`
    try {
      res = await fetch(qsUrl, {
        signal: AbortSignal.timeout(WC_FETCH_TIMEOUT_MS),
        next: { revalidate: 60 },
      })
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

// ── ACF image field helpers ──────────────────────────────────────────────────

interface AcfImageExtracted {
  /** Resolved URL when ACF returns a URL string or an image object. */
  url?: string
  /** Numeric image attachment ID when ACF returns only an ID (needs secondary resolve). */
  id?: number
}

/**
 * Extract a usable URL and/or image ID from any ACF image field return format:
 *
 *  "Image URL"   → string URL → { url: "https://..." }
 *  "Image Array" → object { url, source_url, ID, id } → { url: "https://..." }
 *  "Image ID"    → integer or numeric string → { id: 123 }
 *  false/null/"" → {} (empty — field not set)
 *
 * When only an ID is returned the caller must use resolveWpMediaUrl(id) to get the URL.
 */
function extractAcfImage(raw: unknown): AcfImageExtracted {
  if (!raw || raw === false || raw === 0) return {}

  // Number → image attachment ID
  if (typeof raw === 'number') {
    return Number.isInteger(raw) && raw > 0 ? { id: raw } : {}
  }

  if (typeof raw === 'string') {
    const s = raw.trim()
    if (!s) return {}
    // Numeric string → image ID
    if (/^\d+$/.test(s)) return { id: parseInt(s, 10) }
    // URL-like string
    if (s.startsWith('http') || s.startsWith('/')) return { url: s }
  }

  // Object (ACF Image Array / Object return format)
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>

    // Prefer explicit URL keys first
    for (const key of ['url', 'source_url', 'guid']) {
      const v = obj[key]
      if (typeof v === 'string' && v.trim().startsWith('http')) return { url: v.trim() }
    }
    // guid may itself be an object { rendered: "..." }
    if (typeof obj.guid === 'object' && obj.guid !== null) {
      const g = (obj.guid as Record<string, unknown>).rendered
      if (typeof g === 'string' && g.startsWith('http')) return { url: g }
    }
    // Fall back to ID inside the object
    const idRaw = obj.ID ?? obj.id
    if (typeof idRaw === 'number' && idRaw > 0) return { id: idRaw }
    if (typeof idRaw === 'string' && /^\d+$/.test(idRaw)) return { id: parseInt(idRaw, 10) }
  }

  return {}
}

/**
 * Resolve a WordPress media attachment ID to a source URL via the WP REST API.
 * Used as a fallback when ACF returns an image ID instead of a full URL.
 * Results cached for 1 hour (images rarely change).
 */
export async function resolveWpMediaUrl(id: number): Promise<string | undefined> {
  const config = getConfig()
  if (!config) return undefined
  try {
    const url  = `${config.storeUrl}/wp-json/wp/v2/media/${id}`
    const token = Buffer.from(`${config.key}:${config.secret}`).toString('base64')
    const res  = await fetch(url, {
      headers: { Authorization: `Basic ${token}` },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return undefined
    const data = await res.json() as Record<string, unknown>
    const src  = data.source_url
    if (typeof src === 'string' && src.startsWith('http')) return src
    // Fallback: guid.rendered
    const guid = data.guid as Record<string, unknown> | undefined
    if (typeof guid?.rendered === 'string' && (guid.rendered as string).startsWith('http')) {
      return guid.rendered as string
    }
  } catch { /* network error — caller receives undefined */ }
  return undefined
}

// ── Status / type normalisers ────────────────────────────────────────────────

/**
 * Normalise an ACF competition_status value to a consistent display-case string.
 * Handles WordPress ACF variations: 'live', 'Live', 'coming_soon', 'Coming Soon', etc.
 * Returns the normalised value, or the raw trimmed value if unrecognised (no silent data loss).
 */
function normalizeCompetitionStatus(raw: string): string {
  const s = raw.toLowerCase().replace(/_/g, ' ').trim()
  if (s === 'live')                                 return 'Live'
  if (s === 'coming soon' || s === 'coming')        return 'Coming Soon'
  if (s === 'sold out')                             return 'Sold Out'
  if (s === 'draw pending' || s === 'draw')         return 'Draw Pending'
  if (s === 'winner announced' || s === 'winner')   return 'Winner Announced'
  if (s === 'closed')                               return 'Closed'
  return raw.trim()
}

/**
 * Normalise an ACF competition_type value to a consistent lowercase slug.
 *
 * WooCommerce ACF select fields can store either the option value ("special")
 * or the option label ("Special Drop") depending on how the field is configured.
 * Both forms are handled here so a label change in WordPress never breaks
 * the frontend slot mapping.
 *
 * Aliases handled:
 *   'free' / 'starter drop'             → 'starter'
 *   'weekly drop'                        → 'weekly'
 *   'monthly drop'                       → 'monthly'
 *   'special drop' / 'limited edition'  → 'special'
 */
function normalizeCompetitionType(raw: string): string {
  const s = raw.toLowerCase().trim()
  if (s === 'starter' || s === 'free' || s === 'starter drop' || s === 'entry level') return 'starter'
  if (s === 'weekly'  || s === 'weekly drop'  || s === 'every week')   return 'weekly'
  if (s === 'monthly' || s === 'monthly drop' || s === 'rare pieces')  return 'monthly'
  if (s === 'special' || s === 'special drop' || s === 'limited edition') return 'special'
  return s
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
  // Raw-API diagnostic: log the exact sold_individually and price values
  // straight from the WooCommerce response, before any transformation.
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[PWC toSafeProduct] #${raw.id} "${raw.name}" | ` +
      `raw.price="${raw.price}" | raw.sold_individually=${JSON.stringify(raw.sold_individually)}`
    )
  }

  const rawImages = Array.isArray(raw.images) ? raw.images as Record<string, unknown>[] : []

  // draw_date: prefer ACF object field, fall back to meta_data array
  const acf = (raw.acf && typeof raw.acf === 'object') ? raw.acf as Record<string, unknown> : {}

  // ── DIAGNOSTIC: dump everything relevant for ACF debugging ──────────────────
  // This runs server-side — check your `npm run dev` terminal output.
  if (process.env.NODE_ENV === 'development') {
    const acfKeys = Object.keys(acf)
    const metaKeys = Array.isArray(raw.meta_data)
      ? (raw.meta_data as Record<string, unknown>[]).map(m => String(m.key ?? ''))
      : []
    console.log(
      `\n[PWC DIAGNOSTIC] Product #${raw.id} "${raw.name}"\n` +
      `  acf object keys  : ${acfKeys.length ? acfKeys.join(', ') : '(empty — ACF REST API not returning data!)'}\n` +
      `  meta_data keys   : ${metaKeys.length ? metaKeys.join(', ') : '(empty)'}\n` +
      `  acf.challenge_image  = ${JSON.stringify(acf.challenge_image)?.slice(0,120) ?? '(missing)'}\n` +
      `  acf.answer_options   = ${JSON.stringify(acf.answer_options)?.slice(0,120) ?? '(missing)'}\n` +
      `  acf.correct_answer   = ${JSON.stringify(acf.correct_answer)?.slice(0,80) ?? '(missing)'}\n` +
      `  meta challenge_image = ${JSON.stringify((raw.meta_data as Record<string,unknown>[]|undefined)?.find(m=>(m as Record<string,unknown>).key==='challenge_image'))?.slice(0,120) ?? '(not in meta_data)'}\n` +
      `  meta answer_options  = ${JSON.stringify((raw.meta_data as Record<string,unknown>[]|undefined)?.find(m=>(m as Record<string,unknown>).key==='answer_options'))?.slice(0,120) ?? '(not in meta_data)'}`
    )
  }

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

  // max_entries_percentage (number ACF field — e.g. 33 means 33%)
  const rawMaxEntriesPct = acf.max_entries_percentage ?? getMetaValue(raw, 'max_entries_percentage')
  const parsedMaxEntriesPct = rawMaxEntriesPct != null ? Number(rawMaxEntriesPct) : NaN
  const maxEntriesPercentage = !isNaN(parsedMaxEntriesPct) && parsedMaxEntriesPct > 0 ? parsedMaxEntriesPct : undefined

  // sold_individually (WooCommerce native boolean — true = max 1 per order, source of truth for single-entry products)
  // Preserve the three distinct states: true / false / absent-from-response (undefined).
  // DO NOT use `soldIndividually || undefined` — that collapses false→undefined and loses
  // the information that the API explicitly returned false.
  const soldIndividuallyRaw = raw.sold_individually
  const soldIndividually =
    soldIndividuallyRaw === true  ? true  :
    soldIndividuallyRaw === false ? false :
    undefined

  // competition_status (ACF Select field — e.g. 'Live', 'Sold Out', 'Coming Soon', etc.)
  // Normalised immediately so all downstream comparisons use consistent display-case strings.
  const rawCompStatus = acf.competition_status ?? getMetaValue(raw, 'competition_status')
  const competitionStatus = (rawCompStatus != null && rawCompStatus !== '' && rawCompStatus !== false)
    ? normalizeCompetitionStatus(String(rawCompStatus))
    : undefined

  // competition_type (ACF Select field — e.g. 'weekly', 'monthly', 'starter'/'free', 'special')
  // 'free' is normalised to 'starter' for backward compatibility with existing WooCommerce products.
  const rawCompType = acf.competition_type ?? getMetaValue(raw, 'competition_type')
  const competitionType = (rawCompType != null && rawCompType !== '' && rawCompType !== false)
    ? normalizeCompetitionType(String(rawCompType))
    : undefined

  // watch_reference (ACF Text field — e.g. '116500LN')
  const rawWatchRef = acf.watch_reference ?? getMetaValue(raw, 'watch_reference')
  const watchReference = (rawWatchRef != null && rawWatchRef !== '' && rawWatchRef !== false)
    ? String(rawWatchRef).trim()
    : undefined

  // competition_number (ACF Number field — e.g. 25 → "Competition #25" in the hero strip)
  const rawCompNumber = acf.competition_number ?? getMetaValue(raw, 'competition_number')
  const parsedCompNumber = rawCompNumber != null ? Number(rawCompNumber) : NaN
  const competitionNumber = !isNaN(parsedCompNumber) && parsedCompNumber > 0
    ? parsedCompNumber
    : undefined

  // challenge_image (ACF Image field — watch image for the skill challenge)
  // Uses the same extraction pattern as hero_background_image:
  //   • ACF "Image URL" return format  → string URL  → url set directly
  //   • ACF "Image Array" return format → object      → url extracted from object
  //   • ACF "Image ID" return format   → integer/str  → id stored, URL resolved async
  const rawChallengeImg = acf.challenge_image ?? getMetaValue(raw, 'challenge_image')
  const challengeImgExtracted = extractAcfImage(rawChallengeImg)

  // answer_options (ACF Textarea — one option label per line)
  // WordPress/ACF textareas use \r\n on most servers — split on all variants.
  const rawAnswerOptions = acf.answer_options ?? getMetaValue(raw, 'answer_options')
  const answerOptions = typeof rawAnswerOptions === 'string' && rawAnswerOptions.trim()
    ? rawAnswerOptions.split(/\r?\n|\r/).map((l: string) => l.trim()).filter(Boolean)
    : undefined

  // correct_answer (ACF Text — server-side only, never exposed to client)
  const rawCorrectAnswer = acf.correct_answer ?? getMetaValue(raw, 'correct_answer')
  const correctAnswer = typeof rawCorrectAnswer === 'string' && rawCorrectAnswer.trim()
    ? rawCorrectAnswer.trim()
    : undefined

  // ── Debug: log all three skill challenge ACF fields ──────────────────────────
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[PWC skill-challenge] #${raw.id} "${raw.name}"\n` +
      `  challenge_image  raw : ${JSON.stringify(rawChallengeImg)?.slice(0, 160)}\n` +
      `  challenge_image  url : ${challengeImgExtracted.url ?? '(none)'}\n` +
      `  challenge_image  id  : ${challengeImgExtracted.id ?? '(none)'}\n` +
      `  answer_options   raw : ${JSON.stringify(rawAnswerOptions)?.slice(0, 200)}\n` +
      `  answer_options parsed: ${JSON.stringify(answerOptions)}\n` +
      `  correct_answer       : ${correctAnswer ? '[SET — ' + correctAnswer.slice(0, 40) + ']' : '(not set)'}`
    )
  }

  // description (WooCommerce product description HTML — used for ProductEditorial)
  // Capped at 100 KB to guard against unexpectedly large descriptions.
  const rawDescription = raw.description
  const description = (typeof rawDescription === 'string' && rawDescription.trim())
    ? rawDescription.trim().slice(0, 102400)
    : undefined

  // hero_background_image (ACF Image field — homepage hero background per product)
  // Checked in both the acf object (requires acf-to-rest-api / ACF REST API support)
  // and the meta_data array (raw WooCommerce meta, value format depends on ACF Return Format).
  const rawHeroBg = acf.hero_background_image ?? getMetaValue(raw, 'hero_background_image')
  const heroBgExtracted = extractAcfImage(rawHeroBg)

  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[PWC hero_background_image] #${raw.id} "${raw.name}": ` +
      `raw=${JSON.stringify(rawHeroBg)?.substring(0, 120)} ` +
      `→ url=${heroBgExtracted.url ?? '(none)'}, id=${heroBgExtracted.id ?? '(none)'}`
    )
  }

  // ── Past Winners / Winner Archive ACF fields ────────────────────────────────
  // Generic readers (ACF object first, meta_data fallback). No hardcoding.
  // NOTE: prefer a non-empty ACF value, otherwise fall back to meta_data — the
  // ACF object can hold "" for a field while meta_data holds the real value, and
  // `??` would not fall through an empty string.
  const acfRaw  = (key: string): unknown => {
    const a = acf[key]
    if (a !== null && a !== undefined && a !== '' && a !== false) return a
    return getMetaValue(raw, key)
  }
  const acfBool = (key: string): boolean => {
    const v = acfRaw(key)
    return v === true || v === 1 || v === '1' || v === 'yes' || v === 'true'
  }
  const acfStr  = (key: string): string | undefined => {
    const v = acfRaw(key)
    return (v !== null && v !== undefined && v !== '' && v !== false) ? String(v).trim() : undefined
  }
  // Integer parse that tolerates thousands separators ("15.000" / "15,000" → 15000).
  const acfInt  = (key: string): number | undefined => {
    const v = acfRaw(key)
    if (v === null || v === undefined || v === '' || v === false) return undefined
    const cleaned = String(v).replace(/[^\d]/g, '')
    if (cleaned === '') return undefined
    const n = parseInt(cleaned, 10)
    return isNaN(n) ? undefined : n
  }

  // Winner photo: some products store the image under '_winner_photo' (the ACF
  // field was named with a leading underscore), so fall back to that key when the
  // normal 'winner_photo' value is empty. Value may be a URL, object, or attachment ID.
  const winnerPhotoImg = extractAcfImage(acfRaw('winner_photo') ?? getMetaValue(raw, '_winner_photo'))
  const cardImg        = extractAcfImage(acfRaw('past_winner_card_image') ?? getMetaValue(raw, '_past_winner_card_image'))

  // ── Resolve past_winner_public_prize_title (with underscore-prefix fallback) ────────
  // WordPress/ACF stores the VALUE under the bare key ("past_winner_public_prize_title").
  // Some setups return it with a leading underscore in meta_data, so we check both.
  const pastWinnerPublicTitle =
    acfStr('past_winner_public_prize_title') ??
    acfStr('_past_winner_public_prize_title') ??
    (() => {
      // Broadest fallback: scan every meta_data entry for any key that looks like
      // "past_winner_public_prize_title" regardless of prefix/case differences.
      if (!Array.isArray(raw.meta_data)) return undefined
      for (const m of raw.meta_data as Record<string, unknown>[]) {
        const k = String(m.key ?? '').replace(/^_+/, '').toLowerCase()
        if (k === 'past_winner_public_prize_title') {
          const v = m.value
          if (v !== null && v !== undefined && v !== '' && v !== false) return String(v).trim()
        }
      }
      return undefined
    })()

  // ── Archive-product diagnostic (dev only) ─────────────────────────────────────
  // Fires for any product that looks like an archive entry so you can verify exactly
  // what the WooCommerce REST API is returning for past_winner_public_prize_title.
  if (process.env.NODE_ENV === 'development') {
    const isArchive =
      String(raw.name ?? '').toUpperCase().includes('PAST WINNER') ||
      acfBool('show_on_past_winners') ||
      acfBool('show_on_homepage_winner') ||
      acfBool('show_on_homepage_winners')

    if (isArchive) {
      const allMetaKeys = Array.isArray(raw.meta_data)
        ? (raw.meta_data as Record<string, unknown>[]).map(m => String((m as Record<string, unknown>).key ?? ''))
        : []
      const winnerMeta = Array.isArray(raw.meta_data)
        ? (raw.meta_data as Record<string, unknown>[]).filter(m => {
            const k = String((m as Record<string, unknown>).key ?? '').toLowerCase()
            return k.includes('past_winner') || k.includes('public_title') || k.includes('winner') || k.includes('archive')
          })
        : []

      console.log(
        `\n[PWC ARCHIVE TITLE DEBUG] #${raw.id} "${raw.name}"\n` +
        `  ── ACF object ──────────────────────────────────────────────────────────\n` +
        `  acf keys total              : ${Object.keys(acf).length} ${Object.keys(acf).length === 0 ? '⚠ ACF REST API not returning data!' : ''}\n` +
        `  acf.past_winner_public_prize_title = ${JSON.stringify(acf['past_winner_public_prize_title'])}\n` +
        `  acf._past_winner_public_prize_title= ${JSON.stringify(acf['_past_winner_public_prize_title'])}\n` +
        `  ── meta_data ───────────────────────────────────────────────────────────\n` +
        `  meta_data keys total        : ${allMetaKeys.length}\n` +
        `  winner/archive meta entries :\n` +
        (winnerMeta.length
          ? winnerMeta.map(m => `    key=${JSON.stringify((m as Record<string,unknown>).key)}  value=${JSON.stringify((m as Record<string,unknown>).value)?.slice(0,120)}`).join('\n')
          : '    (none — no meta_data key contains "past_winner", "public_title", "winner", or "archive")') + '\n' +
        `  ── Result ──────────────────────────────────────────────────────────────\n` +
        `  pastWinnerPublicTitle       : ${JSON.stringify(pastWinnerPublicTitle)}\n` +
        `  title will display as       : "${pastWinnerPublicTitle ?? String(raw.name ?? '')}"\n` +
        `  ────────────────────────────────────────────────────────────────────────`
      )
    }
  }

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
    draw_date:              drawDateRaw || undefined,
    total_entries:          totalEntries,
    retail_value:           retailValue,
    condition:              condition,
    cash_alternative:       cashAlternative,
    max_entries_percentage: maxEntriesPercentage,
    sold_individually:      soldIndividually,
    competition_status:        competitionStatus,
    competition_type:          competitionType,
    watch_reference:           watchReference,
    competition_number:        competitionNumber,
    challenge_image:           challengeImgExtracted.url,
    challenge_image_id:        challengeImgExtracted.id,
    answer_options:            answerOptions,
    correct_answer:            correctAnswer,
    hero_background_image:     heroBgExtracted.url,
    hero_background_image_id:  heroBgExtracted.id,
    description,

    // ── Past Winners / Winner Archive ────────────────────────────────────────
    show_on_past_winners:      acfBool('show_on_past_winners'),
    // ACF field is named singular ('show_on_homepage_winner') — accept both.
    show_on_homepage_winners:  acfBool('show_on_homepage_winner') || acfBool('show_on_homepage_winners'),
    winner_archive_type:       acfStr('winner_archive_type'),
    winner_display_name:       acfStr('winner_display_name'),
    winner_location:           acfStr('winner_location'),
    winner_photo:              winnerPhotoImg.url,
    winner_photo_id:           winnerPhotoImg.id,
    winner_testimonial:        acfStr('winner_testimonial'),
    draw_number:               acfStr('draw_number'),
    prize_value:               acfInt('prize_value'),
    tickets_sold:              acfInt('tickets_sold'),
    total_tickets:             acfInt('total_tickets'),
    winning_entry_number:      acfStr('winning_entry_number'),
    live_draw_url:             acfStr('live_draw_url'),
    draw_certificate_url:      acfStr('draw_certificate_url'),
    proof_status:              acfStr('proof_status'),
    past_winner_card_image:    cardImg.url,
    past_winner_card_image_id: cardImg.id,
    homepage_winner_quote:     acfStr('homepage_winner_quote'),
    homepage_winner_order:     acfInt('homepage_winner_order'),
    past_winner_public_prize_title:  pastWinnerPublicTitle,
  }
}

// ── Public helpers ───────────────────────────────────────────────────────────

/**
 * Fetch all published WooCommerce products (up to 20).
 * Returns only safe, non-sensitive fields.
 * Server-side only.
 */
export async function fetchWooProducts(): Promise<{ products: WooProduct[]; error?: string }> {
  // One retry: a single transient hiccup (timeout, 5xx, brief network blip) should
  // not be allowed to surface as an empty product list — that poisons the ISR cache
  // with the "New Drops Coming Soon" empty hero. See getAllActiveCompetitionsByType.
  let lastError = ''
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const data = await wcFetch('products?status=publish&per_page=100')
      if (!Array.isArray(data)) {
        return { products: [], error: 'Unexpected response shape from WooCommerce API.' }
      }
      return { products: (data as Record<string, unknown>[]).map(toSafeProduct) }
    } catch (err) {
      lastError = (err as Error).message
    }
  }
  return { products: [], error: lastError }
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
  if (wooProduct.retail_value        != null) merged.retailValue       = wooProduct.retail_value
  if (wooProduct.condition           != null) merged.condition         = wooProduct.condition
  if (wooProduct.cash_alternative    != null) merged.cashAlternative   = wooProduct.cash_alternative
  if (wooProduct.competition_status  != null) merged.competitionStatus   = wooProduct.competition_status
  if (wooProduct.competition_type    != null) merged.competitionType     = wooProduct.competition_type
  if (wooProduct.watch_reference     != null) merged.reference           = wooProduct.watch_reference
  if (wooProduct.competition_number  != null) merged.competitionNumber   = wooProduct.competition_number
  if (wooProduct.challenge_image     != null) merged.challengeImage      = wooProduct.challenge_image
  if (wooProduct.answer_options      != null) merged.answerOptions       = wooProduct.answer_options
  // correct_answer intentionally NOT merged into Competition — server-side only
  if (wooProduct.hero_background_image != null) merged.heroBackgroundImage = wooProduct.hero_background_image
  if (wooProduct.description         != null) merged.wooDescription     = wooProduct.description
  // Always overwrite gallery with live WooCommerce images (static templates have none)
  if (wooProduct.images.length > 0)           merged.galleryImages      = wooProduct.images

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

  // ── Per-user entry cap ───────────────────────────────────────────────────────
  // Source of truth: WooCommerce native `sold_individually` setting.
  // When true  → hard cap of 1 entry per order, regardless of ACF fields.
  // When false → Math.floor(total_entries × max_entries_percentage / 100).
  // If ACF fields are missing, falls back to the static competition default.
  {
    const isSoldIndividually = wooProduct.sold_individually === true

    const maxEntriesPerUser = isSoldIndividually
      ? 1
      : wooProduct.max_entries_percentage != null && wooProduct.max_entries_percentage > 0 && totalEntries > 0
        ? Math.floor(totalEntries * (wooProduct.max_entries_percentage / 100))
        : competition.maxTicketsPerPurchase

    merged.maxTicketsPerPurchase = Math.max(1, maxEntriesPerUser)
  }

  if (process.env.NODE_ENV === 'development') {
    // ── Per-product decision trace ────────────────────────────────────────────
    // This tells you exactly which branch determined maxTicketsPerPurchase.
    const isSoldIndividually = wooProduct.sold_individually === true
    const hasPctCap =
      wooProduct.max_entries_percentage != null &&
      wooProduct.max_entries_percentage > 0 &&
      (wooProduct.total_entries ?? 0) > 0

    const maxDecisionSource = isSoldIndividually
      ? 'sold_individually=true → 1'
      : hasPctCap
        ? `percentage cap: floor(${wooProduct.total_entries} × ${wooProduct.max_entries_percentage}% / 100) = ${merged.maxTicketsPerPurchase}`
        : `static fallback: competition.maxTicketsPerPurchase = ${competition.maxTicketsPerPurchase}`

    console.log(
      `[PWC mergeWooData] #${wooProduct.id} "${wooProduct.name}"\n` +
      `  price:                  ${wooProduct.price}\n` +
      `  sold_individually(raw): ${wooProduct.sold_individually === undefined ? '(absent from API response)' : wooProduct.sold_individually}\n` +
      `  stock_quantity:         ${wooProduct.stock_quantity}\n` +
      `  total_entries(ACF):     ${wooProduct.total_entries ?? '(missing)'}\n` +
      `  max_entries_pct(ACF):   ${wooProduct.max_entries_percentage ?? '(missing)'}\n` +
      `  maxTicketsPerPurchase:  ${merged.maxTicketsPerPurchase}  ← ${maxDecisionSource}\n` +
      `  totalTickets:           ${merged.totalTickets}\n` +
      `  ticketsLeft:            ${merged.ticketsLeft}\n` +
      `  soldPercentage:         ${merged.soldPercentage}%\n` +
      `  retail_value(ACF):      ${wooProduct.retail_value ?? '(missing)'}\n` +
      `  condition(ACF):         ${wooProduct.condition ?? '(missing)'}\n` +
      `  cash_alternative(ACF):  ${wooProduct.cash_alternative ?? '(missing)'}\n` +
      `  draw_date raw:          ${wooProduct.draw_date ?? '(missing)'}\n` +
      `  drawDate:               ${merged.drawDate}`
    )

    if (wooProduct.sold_individually === undefined) {
      console.warn(
        `[PWC] ⚠ sold_individually field absent from WooCommerce response for #${wooProduct.id} "${wooProduct.name}". ` +
        `Make sure the WooCommerce REST API returns this field (it should by default).`
      )
    }
    if (!isSoldIndividually && wooProduct.total_entries == null) {
      console.warn(
        `[PWC] ⚠ total_entries ACF field missing for #${wooProduct.id} "${wooProduct.name}". ` +
        `Set it in WooCommerce → Product → ACF fields.`
      )
    }
    if (!isSoldIndividually && wooProduct.max_entries_percentage == null) {
      console.warn(
        `[PWC] ⚠ max_entries_percentage ACF field missing for #${wooProduct.id} "${wooProduct.name}". ` +
        `maxTicketsPerPurchase is falling back to static value: ${competition.maxTicketsPerPurchase}. ` +
        `Set the ACF field to get the correct cap.`
      )
    }
  }

  return merged
}

// ── Dynamic competition builders ─────────────────────────────────────────────

/**
 * Build a minimal Competition object from a raw WooProduct.
 * Used when a WooCommerce product has no matching static template in competition-data.ts.
 * Skill challenge fields use shared defaults — override via ACF when needed.
 */
export function wooProductToCompetition(wooProduct: WooProduct): Competition {
  const totalEntries  = wooProduct.total_entries ?? 500
  // stock_quantity === null means WooCommerce stock tracking is disabled;
  // treat as fully available (remaining = totalEntries) to avoid showing 0 tickets left.
  const stockQty      = wooProduct.stock_quantity ?? totalEntries
  const remaining     = Math.max(0, stockQty)
  const sold          = Math.max(0, totalEntries - remaining)
  const soldPct       = totalEntries > 0 ? Math.round((sold / totalEntries) * 1000) / 10 : 0
  const parsedPrice   = parseFloat(wooProduct.price) || 0
  const drawDateRaw   = wooProduct.draw_date ? parseWooDrawDate(wooProduct.draw_date) : ''
  const maxPerUser    =
    wooProduct.sold_individually === true
      ? 1
      : wooProduct.max_entries_percentage && totalEntries
        ? Math.max(1, Math.floor(totalEntries * (wooProduct.max_entries_percentage / 100)))
        : 100

  return {
    id:                    `woo-${wooProduct.id}`,
    wooProductId:          wooProduct.id,
    slug:                  wooProduct.slug,
    title:                 wooProduct.name,
    brand:                 wooProduct.name,
    model:                 wooProduct.name,
    shortName:             wooProduct.name,
    reference:             wooProduct.watch_reference ?? '',
    detail:                wooProduct.condition ?? '',
    image:                 wooProduct.images[0]?.src ?? '',
    heroImage:             wooProduct.images[0]?.src ?? '',
    retailValue:           wooProduct.retail_value ?? 0,
    condition:             wooProduct.condition,
    entryPrice:            parsedPrice,
    isFree:                parsedPrice === 0,
    currency:              '$',
    totalTickets:          totalEntries,
    ticketsSold:           sold,
    ticketsLeft:           remaining,
    soldPercentage:        soldPct,
    drawDate:              drawDateRaw,
    drawDateDisplay:       drawDateRaw ? formatDrawDateDisplay(drawDateRaw) : 'Draw date coming soon',
    cashAlternative:       wooProduct.cash_alternative ?? 0,
    ticketOptions: [
      { qty: 1,  popular: false },
      { qty: 3,  popular: false },
      { qty: 5,  popular: false },
      { qty: 10, popular: true  },
      { qty: 20, popular: false },
    ],
    maxTicketsPerPurchase: maxPerUser,
    skillQuestion:         'Which Swiss manufacturer produces the Speedmaster Moonwatch?',
    skillAnswers:          ['Omega', 'Rolex', 'Breitling', 'TAG Heuer'],
    correctAnswer:         'Omega',
    skillChallengeId:      'wc-id-001',
    wooStockQuantity:      wooProduct.stock_quantity,
    competitionStatus:     wooProduct.competition_status,
    competitionType:       wooProduct.competition_type,
    competitionNumber:     wooProduct.competition_number,
    challengeImage:        wooProduct.challenge_image,
    answerOptions:         wooProduct.answer_options,
    // correct_answer intentionally excluded — server-side only
    heroBackgroundImage:   wooProduct.hero_background_image,
    wooDescription:        wooProduct.description,
    galleryImages:         wooProduct.images.length > 0 ? wooProduct.images : undefined,
    checkoutUrl:           '/checkout',
    ctaLink:               wooProduct.competition_type === 'weekly'  ? '/competitions/weekly'
                         : wooProduct.competition_type === 'monthly' ? '/competitions/monthly'
                         : wooProduct.competition_type === 'special' ? '/competitions/special'
                         : `/competitions/${wooProduct.slug}`,
    recentPurchases:       [],
    leaderboard:           [],
  }
}

/**
 * Fetch all published WooCommerce products and return the best active competition
 * for a given competition_type ('weekly' | 'monthly' | 'free' | 'special').
 *
 * Selection logic:
 *  1. Filter by competition_type.
 *  2. Among those, prefer Live + stock > 0 → pick the nearest draw date.
 *  3. If no Live product, fall back to the most recent Sold Out product.
 *  4. If none, try Coming Soon.
 *  5. If no WooCommerce match at all, return null (caller provides static fallback).
 *
 * The returned Competition is built from the matching WooProduct:
 *  - If the product's ID matches a static template (competition-data.ts), mergeWooData is applied.
 *  - Otherwise wooProductToCompetition() builds a Competition from pure WooCommerce data.
 */
export async function getActiveCompetitionByType(type: string): Promise<Competition | null> {
  const { products, error } = await fetchWooProducts()
  if (error || products.length === 0) return null

  const typed = products.filter(p => p.competition_type === type)
  if (typed.length === 0) return null

  let selected: WooProduct | null = null

  // Prefer Live. stock_quantity === null means stock tracking is off → treat as available.
  const live = typed.filter(p =>
    p.competition_status === 'Live' &&
    (p.stock_quantity === null || p.stock_quantity > 0)
  )

  if (live.length > 0) {
    // Among live products, pick the one with the nearest draw date
    selected = live.reduce<WooProduct | null>((best, p) => {
      if (!best) return p
      const bestMs = best.draw_date ? new Date(parseWooDrawDate(best.draw_date)).getTime() : Infinity
      const pMs    = p.draw_date    ? new Date(parseWooDrawDate(p.draw_date)).getTime()    : Infinity
      return pMs < bestMs ? p : best
    }, null)
  }

  if (!selected) {
    // No live product — show latest Sold Out as a historical state
    const soldOut = typed.filter(p => p.competition_status === 'Sold Out')
    if (soldOut.length > 0) {
      selected = soldOut[soldOut.length - 1]
    }
  }

  if (!selected) {
    // Try Coming Soon (next upcoming competition)
    const comingSoon = typed.filter(p => p.competition_status === 'Coming Soon')
    if (comingSoon.length > 0) selected = comingSoon[0]
  }

  if (!selected) return null

  // Try to match the WooProduct against a static template by product ID
  const staticComp = competitions.find(c => c.wooProductId === selected!.id)
  if (staticComp) {
    return mergeWooData(staticComp, selected)
  }

  // No static template — build a Competition entirely from WooCommerce data
  return wooProductToCompetition(selected)
}

// ── Shared media resolver ─────────────────────────────────────────────────────
//
// Resolves ACF image fields that returned a numeric ID instead of a URL.
// Currently handles: hero_background_image_id, challenge_image_id.
// Call after mergeWooData or wooProductToCompetition whenever image IDs may be pending.

export async function resolveCompetitionMedia(
  comp: Competition,
  wooProduct: WooProduct,
): Promise<Competition> {
  let resolved = comp

  // hero_background_image_id
  if (!resolved.heroBackgroundImage && wooProduct.hero_background_image_id) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PWC resolveCompetitionMedia] resolving hero_background_image_id=${wooProduct.hero_background_image_id}`)
    }
    const url = await resolveWpMediaUrl(wooProduct.hero_background_image_id)
    if (url) resolved = { ...resolved, heroBackgroundImage: url }
  }

  // challenge_image_id
  if (!resolved.challengeImage && wooProduct.challenge_image_id) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PWC resolveCompetitionMedia] resolving challenge_image_id=${wooProduct.challenge_image_id}`)
    }
    const url = await resolveWpMediaUrl(wooProduct.challenge_image_id)
    if (url) {
      resolved = { ...resolved, challengeImage: url }
      if (process.env.NODE_ENV === 'development') {
        console.log(`[PWC resolveCompetitionMedia] challenge_image resolved → ${url}`)
      }
    } else if (process.env.NODE_ENV === 'development') {
      console.warn(`[PWC resolveCompetitionMedia] could not resolve challenge_image_id=${wooProduct.challenge_image_id}`)
    }
  }

  return resolved
}

// ── Hero switcher: all active competitions grouped by type ───────────────────

export type CompetitionType = 'starter' | 'weekly' | 'monthly' | 'special'

export interface CompetitionsByType {
  starter: Competition | null
  weekly:  Competition | null
  monthly: Competition | null
  special: Competition | null
}

const HERO_TYPES: CompetitionType[] = ['starter', 'weekly', 'monthly', 'special']

/**
 * Fetch all published WooCommerce products once and return the best active
 * competition for each of the four hero types (starter, weekly, monthly, special).
 *
 * Selection per type (Closed products are always excluded):
 *  1. Live (stock_quantity > 0 OR null = tracking off) → nearest draw date.
 *  2. Sold Out   → most recent.
 *  3. Coming Soon → first found.
 *  4. No match   → null (card hidden from switcher).
 *
 * Status and type values are normalised in toSafeProduct(), so comparisons here
 * always use consistent display-case strings ('Live', 'Sold Out', etc.) and
 * lowercase type slugs ('starter', 'weekly', 'monthly', 'special').
 * 'free' competition_type is normalised to 'starter' automatically.
 */
export async function getAllActiveCompetitionsByType(): Promise<CompetitionsByType> {
  const result: CompetitionsByType = { starter: null, weekly: null, monthly: null, special: null }
  const { products, error } = await fetchWooProducts()

  if (process.env.NODE_ENV === 'development') {
    if (error) {
      console.error(`[PWC getAllActiveCompetitionsByType] WooCommerce fetch error: ${error}`)
    }
    console.log(`[PWC getAllActiveCompetitionsByType] ${products.length} published products fetched`)
    for (const p of products) {
      console.log(
        `  #${p.id} "${p.name}"\n` +
        `    competition_type:   ${p.competition_type   ?? '(unset)'}\n` +
        `    competition_status: ${p.competition_status ?? '(unset)'}\n` +
        `    stock_quantity:     ${p.stock_quantity     ?? '(null = tracking off)'}\n` +
        `    stock_status:       ${p.stock_status}`
      )
    }
  }

  // A failed fetch must NOT collapse into the empty "Coming Soon" state: doing so
  // lets a transient WooCommerce hiccup get cached by ISR and shown to everyone for
  // the rest of the revalidate window. Throw instead — during ISR revalidation Next.js
  // keeps serving the last successfully-rendered page, so the hero never disappears.
  // A genuinely empty store (successful fetch, zero products) still returns below.
  if (error) {
    throw new Error(`[PWC] WooCommerce fetch failed, keeping last good page: ${error}`)
  }
  if (products.length === 0) return result

  for (const type of HERO_TYPES) {
    // After normalisation in toSafeProduct, competition_type is already 'starter'/'weekly'/etc.
    const typed = products.filter(p =>
      p.competition_type === type &&
      p.competition_status !== 'Closed'
    )

    if (process.env.NODE_ENV === 'development') {
      console.log(`[PWC] slot="${type}": ${typed.length} candidate(s) (excl. Closed)`)
    }

    if (typed.length === 0) continue

    let selected: WooProduct | null = null

    // ── Tier 1: Live with stock available (enterable) ─────────────────────────
    // stock_quantity === null = tracking disabled = treat as unlimited (still Live).
    const liveWithStock = typed.filter(p =>
      p.competition_status === 'Live' &&
      (p.stock_quantity === null || p.stock_quantity > 0)
    )
    if (liveWithStock.length > 0) {
      // When multiple Live products share the same type (e.g. an old placeholder and the
      // real product both marked 'special'), prefer products with a matching static template
      // (identified by wooProductId in competition-data.ts). This ensures the known product
      // always wins over anonymous placeholder products regardless of draw date order.
      const hasTemplate = (p: WooProduct) => competitions.some(c => c.wooProductId === p.id)
      const preferred   = liveWithStock.filter(hasTemplate)
      const pool        = preferred.length > 0 ? preferred : liveWithStock

      selected = pool.reduce<WooProduct | null>((best, p) => {
        if (!best) return p
        const bestMs = best.draw_date ? new Date(parseWooDrawDate(best.draw_date)).getTime() : Infinity
        const pMs    = p.draw_date    ? new Date(parseWooDrawDate(p.draw_date)).getTime()    : Infinity
        return pMs < bestMs ? p : best
      }, null)
    }

    // ── Tier 2: Live but zero stock → visually Sold Out, NOT removed ──────────
    // Keeps the competition visible in switcher + grid. The frontend isSoldOut()
    // helper detects ticketsLeft <= 0 and disables the CTA without hiding the card.
    if (!selected) {
      const liveSoldOut = typed.filter(p =>
        p.competition_status === 'Live' &&
        p.stock_quantity !== null && p.stock_quantity <= 0
      )
      if (liveSoldOut.length > 0) selected = liveSoldOut[liveSoldOut.length - 1]
    }

    // ── Tier 3: Admin explicitly set status = "Sold Out" ──────────────────────
    if (!selected) {
      const soldOut = typed.filter(p => p.competition_status === 'Sold Out')
      if (soldOut.length > 0) selected = soldOut[soldOut.length - 1]
    }

    // ── Tier 4: Coming Soon ────────────────────────────────────────────────────
    if (!selected) {
      const comingSoon = typed.filter(p => p.competition_status === 'Coming Soon')
      if (comingSoon.length > 0) selected = comingSoon[0]
    }

    // Tier 5: "Closed" is filtered out above — slot stays null (card hidden).

    if (process.env.NODE_ENV === 'development') {
      console.log(
        selected
          ? `[PWC] slot="${type}": selected #${selected.id} "${selected.name}" (status=${selected.competition_status})`
          : `[PWC] slot="${type}": no product selected`
      )
    }

    if (!selected) continue

    const staticComp = competitions.find(c => c.wooProductId === selected!.id)
    let comp = staticComp
      ? mergeWooData(staticComp, selected)
      : wooProductToCompetition(selected)

    // Resolve any ACF image IDs that came back as integers instead of URLs.
    comp = await resolveCompetitionMedia(comp, selected)

    if (process.env.NODE_ENV === 'development') {
      console.log(`[PWC] slot="${type}": heroBackgroundImage=${comp.heroBackgroundImage ?? '(none)'} | challengeImage=${comp.challengeImage ?? '(none)'}`)
    }

    result[type] = comp
  }

  // ── Starter → Special promotion ──────────────────────────────────────────────
  // 'starter' and 'special' are the same visitor-facing "Special Drop" slot.
  // If the product's competition_type was not yet updated in WooCommerce (still
  // 'starter'/'free') but the frontend card now uses type='special', promote the
  // starter competition into the special slot so the hero card is never empty.
  // Conversely, if both slots have data (old placeholder + real product moved to
  // 'special'), the special slot already has the correct product via the
  // static-template preference above, so starter is simply cleared.
  if (!result.special && result.starter) {
    result.special = result.starter
  }
  result.starter = null   // starter is no longer shown as a separate card

  return result
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
