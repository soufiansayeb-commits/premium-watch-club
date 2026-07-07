// lib/quantity-limits.ts
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for the maximum ticket quantity a member may hold for a
// competition. The PDP ticket selector, the entry-summary step, AND the cart
// drawer all resolve their cap through here so the three can never disagree.
//
// NEVER hardcode a quantity cap (e.g. `const max = 20`) in a component. The real
// cap comes from the product:
//   • maxTicketsPerPurchase — the per-member policy cap. Derived server-side from
//     the ACF max_entries_percentage (e.g. 20% of 400 total = 80) or an override,
//     or 1 when the product is sold_individually.
//   • ticketsLeft — live remaining stock. Only known on the PDP; omitted in the
//     cart, where WooCommerce stays authoritative on stock at checkout.
// ─────────────────────────────────────────────────────────────────────────────

export interface QuantityLimitInput {
  /** Per-member policy cap carried from the competition (e.g. 80). */
  maxTicketsPerPurchase?: number
  /** Live remaining stock, when known (PDP only). */
  ticketsLeft?: number
}

/**
 * Fallback cap used only when a product carries no usable maxTicketsPerPurchase.
 * Mirrors wooProductToCompetition's "no percentage cap" default so behaviour is
 * consistent — it is NOT a UI-level hardcode of the real limit.
 */
const DEFAULT_MAX = 100

/** The highest quantity the member may select right now. Always ≥ 1. */
export function getAllowedMaxQty(input: QuantityLimitInput): number {
  const cap =
    input.maxTicketsPerPurchase && input.maxTicketsPerPurchase > 0
      ? Math.floor(input.maxTicketsPerPurchase)
      : DEFAULT_MAX

  // When live stock is known (PDP), never allow more than remains.
  if (typeof input.ticketsLeft === 'number' && input.ticketsLeft > 0) {
    return Math.max(1, Math.min(cap, Math.floor(input.ticketsLeft)))
  }
  return Math.max(1, cap)
}

/** Clamp an arbitrary quantity into [1, allowedMax]. */
export function clampQuantityToAllowedRange(qty: number, input: QuantityLimitInput): number {
  return Math.max(1, Math.min(getAllowedMaxQty(input), Math.floor(qty)))
}

/** Whether the plus button should still be enabled at the current quantity. */
export function canIncreaseQuantity(currentQty: number, input: QuantityLimitInput): boolean {
  return currentQty < getAllowedMaxQty(input)
}
