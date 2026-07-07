// lib/store-settings.ts
// ─────────────────────────────────────────────────────────────────────────────
// WooCommerce store currency — single source of truth for how money is rendered
// on the Next.js frontend.
//
// SOURCE OF TRUTH: WooCommerce → Settings → General (currency, position,
// separators, decimals), exposed read-only at  /wp-json/pwc/v1/store-settings
// by the pwc-store-settings snippet. The value is fetched once server-side in the
// root layout and injected via StoreSettingsProvider, so every price on the site
// formats with the SAME live Woo currency — no component hardcodes £/$ for a
// dynamic product price.
//
// If the endpoint is unreachable we fall back to DEFAULT_STORE_SETTINGS (the
// store's current live currency) so the site keeps rendering sensible prices.
// ─────────────────────────────────────────────────────────────────────────────

export type CurrencyPosition = 'left' | 'right' | 'left_space' | 'right_space'

export interface StoreSettings {
  /** ISO code, e.g. "USD". */
  currency: string
  /** Display symbol, e.g. "$". */
  currencySymbol: string
  currencyPosition: CurrencyPosition
  thousandSeparator: string
  decimalSeparator: string
  numberOfDecimals: number
}

/**
 * Safe fallback — mirrors the store's current live Woo currency (USD). Used only
 * when /wp-json/pwc/v1/store-settings is unreachable. The live endpoint always
 * wins, so changing the Woo currency propagates without touching this file.
 */
export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  currency: 'USD',
  currencySymbol: '$',
  currencyPosition: 'left',
  thousandSeparator: ',',
  decimalSeparator: '.',
  numberOfDecimals: 2,
}

// ── Normalisation ────────────────────────────────────────────────────────────

function asStr(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.length ? v : fallback
}

function asPosition(v: unknown): CurrencyPosition {
  return v === 'right' || v === 'left_space' || v === 'right_space' || v === 'left'
    ? v
    : DEFAULT_STORE_SETTINGS.currencyPosition
}

function asDecimals(v: unknown): number {
  const n = typeof v === 'number' ? v : parseInt(String(v), 10)
  return Number.isFinite(n) && n >= 0 && n <= 6 ? n : DEFAULT_STORE_SETTINGS.numberOfDecimals
}

/** Parse whatever the WP endpoint returned into clean StoreSettings. Never throws. */
export function normalizeStoreSettings(raw: unknown): StoreSettings {
  if (!raw || typeof raw !== 'object') return DEFAULT_STORE_SETTINGS
  const r = raw as Record<string, unknown>
  return {
    currency: asStr(r.currency, DEFAULT_STORE_SETTINGS.currency),
    currencySymbol: asStr(r.currency_symbol ?? r.currencySymbol, DEFAULT_STORE_SETTINGS.currencySymbol),
    currencyPosition: asPosition(r.currency_position ?? r.currencyPosition),
    thousandSeparator: asStr(r.thousand_separator ?? r.thousandSeparator, DEFAULT_STORE_SETTINGS.thousandSeparator),
    decimalSeparator: asStr(r.decimal_separator ?? r.decimalSeparator, DEFAULT_STORE_SETTINGS.decimalSeparator),
    numberOfDecimals: asDecimals(r.number_of_decimals ?? r.numberOfDecimals),
  }
}

// ── Formatting ───────────────────────────────────────────────────────────────

export interface FormatMoneyOptions {
  /** Override the store's decimal count (e.g. 0 for whole-pound retail values). */
  decimals?: number
}

/** Format an amount with the store's currency symbol, position and separators. */
export function formatMoney(
  amount: number,
  settings: StoreSettings,
  opts: FormatMoneyOptions = {},
): string {
  const decimals = opts.decimals ?? settings.numberOfDecimals
  const safe = Number.isFinite(amount) ? amount : 0
  const fixed = Math.abs(safe).toFixed(decimals)
  const [intPart, decPart] = fixed.split('.')

  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, settings.thousandSeparator)
  const number = decPart ? `${grouped}${settings.decimalSeparator}${decPart}` : grouped
  const sign = safe < 0 ? '-' : ''
  const sym = settings.currencySymbol

  switch (settings.currencyPosition) {
    case 'right':       return `${sign}${number}${sym}`
    case 'left_space':  return `${sign}${sym} ${number}`
    case 'right_space': return `${sign}${number} ${sym}`
    case 'left':
    default:            return `${sign}${sym}${number}`
  }
}

// ── Server-side fetch ────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 8_000

export async function fetchStoreSettings(): Promise<StoreSettings> {
  const storeUrl = process.env.WOOCOMMERCE_STORE_URL || ''
  if (!storeUrl) return DEFAULT_STORE_SETTINGS

  const url = `${storeUrl.replace(/\/$/, '')}/wp-json/pwc/v1/store-settings`
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: process.env.NODE_ENV === 'development' ? 5 : 300 },
    })
    if (!res.ok) return DEFAULT_STORE_SETTINGS
    return normalizeStoreSettings(await res.json())
  } catch {
    return DEFAULT_STORE_SETTINGS
  }
}
