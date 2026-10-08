// lib/cartStore.ts
// Central cart types. Client-safe — no WooCommerce secrets.
// Checkout always goes through the signed handoff (/api/prepare-checkout).

export interface CartItem {
  competitionId: string
  slug: string
  title: string
  wooProductId: number
  quantity: number
  price: number          // price per ticket (0 for free comps)
  total: number          // quantity * price
  currency: string
  selectedSkillAnswer: string  // human-readable label for display (e.g. "SUBMARINER")
  skillQuestion: string
  skillChallengeId?: string    // opaque challenge ID — for server-side revalidation
  skillOptionId?: string       // opaque option ID — never shown to user
  timestampAdded: number // unix ms — used for abandoned cart detection
  image: string
  isFreeCompetition: boolean
  /** Competition type ('weekly' | 'monthly' | 'special' | 'starter') — used to
   *  resolve bundle-discount eligibility when recalculating cart line totals. */
  competitionType?: string
  maxTicketsPerPurchase?: number // policy cap — carried from competition for cart-page stepper
  wooCartItemKey?: string // returned by WooCommerce Store API after sync; used for remove
}

export const CART_STORAGE_KEY = 'pwc_cart_v2' // v2 = multi-item array
