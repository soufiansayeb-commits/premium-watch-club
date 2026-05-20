// lib/cartStore.ts
// Central cart types and checkout URL builder.
// Client-safe — no WooCommerce secrets. Uses only NEXT_PUBLIC_ env vars.

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
  isCorrectSkillAnswer?: boolean // result from /api/skill-challenge/validate
  timestampAdded: number // unix ms — used for abandoned cart detection
  image: string
  isFreeCompetition: boolean
  wooCartItemKey?: string // returned by WooCommerce Store API after sync; used for remove
}

export const CART_STORAGE_KEY = 'pwc_cart_v2' // v2 = multi-item array

/**
 * Build a WooCommerce checkout URL for one or more cart items.
 *
 * Single item  → uses ?add-to-cart=ID&quantity=N (guaranteed, no pre-sync needed)
 * Multiple items → bare /checkout/ (assumes Store API pre-sync already ran)
 *
 * Returns null if no valid items are provided.
 * Client-safe: only reads NEXT_PUBLIC_WOOCOMMERCE_CHECKOUT_URL.
 */
export function buildCheckoutUrl(items: CartItem[]): string | null {
  const validItems = items.filter(i => i.wooProductId > 0 && Number.isInteger(i.wooProductId))
  if (validItems.length === 0) return null

  const base = process.env.NEXT_PUBLIC_WOOCOMMERCE_CHECKOUT_URL
  if (!base) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[PWC cart] NEXT_PUBLIC_WOOCOMMERCE_CHECKOUT_URL is not set.')
    }
    return null
  }

  // Single item: use ?add-to-cart= URL as the guaranteed fallback
  if (validItems.length === 1) {
    const item = validItems[0]
    const qty = Math.max(1, Math.floor(item.quantity))
    try {
      const url = new URL(base)
      url.searchParams.set('add-to-cart', String(item.wooProductId))
      url.searchParams.set('quantity', String(qty))
      return url.toString()
    } catch {
      const sep = base.includes('?') ? '&' : '?'
      return `${base}${sep}add-to-cart=${item.wooProductId}&quantity=${qty}`
    }
  }

  // Multiple items: rely on Store API pre-sync — just go to /checkout/
  try {
    const url = new URL(base)
    // Strip any add-to-cart params that may be on the base URL
    url.searchParams.delete('add-to-cart')
    url.searchParams.delete('quantity')
    return url.toString()
  } catch {
    return base
  }
}

/**
 * Return the bare WooCommerce checkout URL with no query params.
 * Use this after syncPwcCartToWoo() has already pre-populated the Woo cart.
 */
export function buildBareCheckoutUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_WOOCOMMERCE_CHECKOUT_URL
  if (!base) return null
  try {
    const url = new URL(base)
    url.searchParams.delete('add-to-cart')
    url.searchParams.delete('quantity')
    return url.toString()
  } catch {
    return base
  }
}

/** @deprecated Use buildCheckoutUrl([item]) instead */
export function buildWooCheckoutUrl(productId: number, quantity: number): string | null {
  if (!productId || productId <= 0 || !Number.isInteger(productId)) return null
  return buildCheckoutUrl([{
    competitionId: '',
    slug: '',
    title: '',
    wooProductId: productId,
    quantity,
    price: 0,
    total: 0,
    currency: '£',
    selectedSkillAnswer: '',
    skillQuestion: '',
    timestampAdded: 0,
    image: '',
    isFreeCompetition: false,
  }])
}
