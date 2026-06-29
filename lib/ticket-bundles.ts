// lib/ticket-bundles.ts
// ─────────────────────────────────────────────────────────────────────────────
// Ticket bundle discount tiers — FRONTEND MIRROR of the server-side logic.
//
// SOURCE OF TRUTH: the WooCommerce snippet `pwc-ticket-bundle-discounts.php`.
// The backend recalculates and enforces every price at cart + checkout + order
// time. This file exists ONLY so the frontend can DISPLAY the same numbers the
// backend will charge. If you change a tier here, change it in the PHP snippet
// too (the percentages are duplicated there with the same values).
//
// Discount is quantity-based: a quantity earns the discount of the highest tier
// whose threshold it meets or exceeds. e.g. 7 tickets → 10% (>=5, <10).
// Free / £0 competitions never receive bundle discounts (enforced server-side).
// ─────────────────────────────────────────────────────────────────────────────

export interface BundleTier {
  /** Minimum quantity to unlock this tier. */
  minQty: number
  /** Discount as a fraction (0.05 = 5%). */
  discount: number
}

/** Ordered low → high. Keep in sync with the PHP snippet. */
export const BUNDLE_TIERS: BundleTier[] = [
  { minQty: 1,  discount: 0 },
  { minQty: 3,  discount: 0.05 },
  { minQty: 5,  discount: 0.10 },
  { minQty: 10, discount: 0.15 },
  { minQty: 20, discount: 0.20 },
]

/** The discrete quantities surfaced as bundle cards in the UI. */
export const BUNDLE_QUANTITIES = [1, 3, 5, 10, 20] as const

/** Returns the discount fraction (0–1) earned at a given quantity. */
export function getBundleDiscount(qty: number): number {
  let discount = 0
  for (const tier of BUNDLE_TIERS) {
    if (qty >= tier.minQty) discount = tier.discount
  }
  return discount
}

/** Discount as a whole-number percentage (e.g. 15). */
export function getBundleDiscountPercent(qty: number): number {
  return Math.round(getBundleDiscount(qty) * 100)
}

/** Discounted unit price, rounded to 2dp — matches WooCommerce set_price(). */
export function bundleUnitPrice(baseUnitPrice: number, qty: number): number {
  if (baseUnitPrice <= 0) return 0
  return round2(baseUnitPrice * (1 - getBundleDiscount(qty)))
}

/** Discounted line total for qty tickets. */
export function bundleLineTotal(baseUnitPrice: number, qty: number): number {
  if (baseUnitPrice <= 0) return 0
  return round2(bundleUnitPrice(baseUnitPrice, qty) * qty)
}

/** Undiscounted line total (for strike-through reference price). */
export function fullLineTotal(baseUnitPrice: number, qty: number): number {
  if (baseUnitPrice <= 0) return 0
  return round2(baseUnitPrice * qty)
}

/** Money saved at this quantity vs. paying full unit price. */
export function bundleSaving(baseUnitPrice: number, qty: number): number {
  return round2(fullLineTotal(baseUnitPrice, qty) - bundleLineTotal(baseUnitPrice, qty))
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
