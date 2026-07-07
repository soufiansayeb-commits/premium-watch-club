// lib/bundle-discounts.ts
// ─────────────────────────────────────────────────────────────────────────────
// Ticket bundle discounts — backend-driven, single source of truth.
//
// SOURCE OF TRUTH: a single WordPress option (`pwc_bundle_discounts`) managed
// from WooCommerce → PWC Bundle Discounts. That option is:
//   • enforced server-side by the pwc-ticket-bundle-discounts.php snippet at
//     cart / checkout / order time (authoritative pricing), and
//   • exposed read-only at  /wp-json/pwc/v1/bundle-discounts  for the frontend.
//
// This file NEVER hardcodes discount tiers. It fetches the live config from the
// WordPress REST endpoint and provides pure helpers to DISPLAY the exact numbers
// the backend will charge. If the endpoint is unreachable we fall back to the
// DISABLED config (no discounts) — we never invent a discount the backend would
// not honour.
// ─────────────────────────────────────────────────────────────────────────────

export interface BundleTier {
  /** Minimum quantity to unlock this tier. */
  minQty: number
  /** Discount as a whole-number percentage (15 = 15%). */
  discountPercent: number
  /** Optional frontend label (e.g. "Save big"). */
  label: string
  /** Optional badge shown on the bundle card (e.g. "Most Popular"). */
  badge: string
}

export interface BundleApplyTo {
  weekly: boolean
  monthly: boolean
  special: boolean
}

export interface BundleConfig {
  enabled: boolean
  applyTo: BundleApplyTo
  excludeFreeProducts: boolean
  allowCouponStacking: boolean
  /** Enabled tiers only, sorted low → high by minQty. */
  tiers: BundleTier[]
}

/** Safe fallback: discounts fully off. Used whenever the endpoint fails. */
export const DISABLED_BUNDLE_CONFIG: BundleConfig = {
  enabled: false,
  applyTo: { weekly: false, monthly: false, special: false },
  excludeFreeProducts: true,
  allowCouponStacking: false,
  tiers: [],
}

// ── Normalisation ────────────────────────────────────────────────────────────
// The WordPress endpoint returns snake_case JSON. Normalise defensively into the
// camelCase BundleConfig shape, dropping anything malformed. Never throws.

function asBool(v: unknown, fallback = false): boolean {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v === 1
  if (typeof v === 'string') return v === '1' || v.toLowerCase() === 'true'
  return fallback
}

function asNum(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : 0
}

function asStr(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}

/** Parse whatever the WP endpoint returned into a clean BundleConfig. */
export function normalizeBundleConfig(raw: unknown): BundleConfig {
  if (!raw || typeof raw !== 'object') return DISABLED_BUNDLE_CONFIG
  const r = raw as Record<string, unknown>
  const applyTo = (r.apply_to ?? r.applyTo ?? {}) as Record<string, unknown>

  const rawTiers = Array.isArray(r.tiers) ? r.tiers : []
  const tiers: BundleTier[] = rawTiers
    .map((t) => {
      const tt = (t ?? {}) as Record<string, unknown>
      return {
        minQty: Math.max(0, Math.round(asNum(tt.min_qty ?? tt.minQty))),
        discountPercent: Math.max(0, Math.min(100, asNum(tt.discount_percent ?? tt.discountPercent))),
        label: asStr(tt.label),
        badge: asStr(tt.badge),
        enabled: asBool(tt.enabled, true),
      }
    })
    // Only tiers the admin left enabled AND that actually discount something.
    .filter((t) => t.enabled && t.minQty > 0 && t.discountPercent > 0)
    .map(({ minQty, discountPercent, label, badge }) => ({ minQty, discountPercent, label, badge }))
    .sort((a, b) => a.minQty - b.minQty)

  return {
    enabled: asBool(r.enabled),
    applyTo: {
      weekly: asBool(applyTo.weekly, true),
      monthly: asBool(applyTo.monthly, true),
      special: asBool(applyTo.special, false),
    },
    excludeFreeProducts: asBool(r.exclude_free_products ?? r.excludeFreeProducts, true),
    allowCouponStacking: asBool(r.allow_coupon_stacking ?? r.allowCouponStacking, false),
    tiers,
  }
}

// ── Server-side fetch ────────────────────────────────────────────────────────
// Called from server components (root layout, API proxy). Hits the public WP
// REST endpoint directly. Always resolves — returns DISABLED_BUNDLE_CONFIG on any
// failure so the site keeps rendering (full price, no invented discounts).

const CONFIG_FETCH_TIMEOUT_MS = 8_000

export async function fetchBundleConfig(): Promise<BundleConfig> {
  const storeUrl = process.env.WOOCOMMERCE_STORE_URL || ''
  if (!storeUrl) return DISABLED_BUNDLE_CONFIG

  const url = `${storeUrl.replace(/\/$/, '')}/wp-json/pwc/v1/bundle-discounts`
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(CONFIG_FETCH_TIMEOUT_MS),
      // Refresh often in dev so admin changes appear immediately.
      next: { revalidate: process.env.NODE_ENV === 'development' ? 5 : 60 },
    })
    if (!res.ok) return DISABLED_BUNDLE_CONFIG
    const json = await res.json()
    return normalizeBundleConfig(json)
  } catch {
    return DISABLED_BUNDLE_CONFIG
  }
}

// ── Eligibility ──────────────────────────────────────────────────────────────
// Mirrors the PHP eligibility exactly so the frontend only ever shows a discount
// the backend will actually enforce.

/** Does the config apply bundle discounts to this competition type at all? */
export function bundleAppliesToType(config: BundleConfig, competitionType?: string): boolean {
  if (!config.enabled) return false
  const t = (competitionType || '').toLowerCase()
  if (t === 'weekly') return config.applyTo.weekly
  if (t === 'monthly') return config.applyTo.monthly
  if (t === 'special') return config.applyTo.special
  // starter / free / unknown types are never discounted.
  return false
}

/**
 * The tiers that actually apply to this product right now. Returns [] when the
 * product is not eligible — callers then simply show full price, no discounts.
 */
export function getEligibleTiers(
  config: BundleConfig,
  competitionType: string | undefined,
  price: number,
  isFree: boolean,
): BundleTier[] {
  if (!bundleAppliesToType(config, competitionType)) return []
  if (isFree || price <= 0) {
    return config.excludeFreeProducts ? [] : (price > 0 ? config.tiers : [])
  }
  return config.tiers
}

// ── Pure price maths (operate on a resolved tier list) ───────────────────────
// round2 matches WooCommerce's round($x, 2) used server-side.

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/** Highest matching tier's discount percentage for a quantity (0 if none). */
export function discountPercentForQty(tiers: BundleTier[], qty: number): number {
  let pct = 0
  for (const tier of tiers) {
    if (qty >= tier.minQty) pct = tier.discountPercent // tiers sorted asc → highest wins
  }
  return pct
}

/** Discounted unit price, rounded to 2dp — matches WooCommerce set_price(). */
export function bundleUnitPrice(baseUnitPrice: number, tiers: BundleTier[], qty: number): number {
  if (baseUnitPrice <= 0) return 0
  const pct = discountPercentForQty(tiers, qty)
  return round2(baseUnitPrice * (1 - pct / 100))
}

/** Discounted line total for qty tickets. */
export function bundleLineTotal(baseUnitPrice: number, tiers: BundleTier[], qty: number): number {
  if (baseUnitPrice <= 0) return 0
  return round2(bundleUnitPrice(baseUnitPrice, tiers, qty) * qty)
}

/** Undiscounted line total (for strike-through reference price). */
export function fullLineTotal(baseUnitPrice: number, qty: number): number {
  if (baseUnitPrice <= 0) return 0
  return round2(baseUnitPrice * qty)
}

/** Money saved at this quantity vs. paying full unit price. */
export function bundleSaving(baseUnitPrice: number, tiers: BundleTier[], qty: number): number {
  return round2(fullLineTotal(baseUnitPrice, qty) - bundleLineTotal(baseUnitPrice, tiers, qty))
}

/** The bundle-card quantities to render for a product, given its live tiers. */
export function bundleCardQuantities(tiers: BundleTier[], fallback: number[]): number[] {
  if (!tiers.length) return fallback
  return Array.from(new Set<number>([1, ...tiers.map((t) => t.minQty)])).sort((a, b) => a - b)
}
