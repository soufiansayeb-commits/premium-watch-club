// lib/woocommerce-cart.ts
// Read-only view of the customer's WooCommerce cart, called from the browser.
//
// The WooCommerce cart lives in a cookie on checkout.premiumwatchclub.com, so it
// can only be read from the customer's own browser (credentials: 'include').
// That needs CORS on WordPress to allow this site's origin — see
// woocommerce-snippets/cors-and-checkout.php.
//
// Writes are intentionally not done from here: the signed checkout handoff
// (/api/prepare-checkout → pwc-cart-handoff.php) replaces the WooCommerce cart
// with the frontend basket in one step, so a separate cross-site write path
// would only duplicate it and widen the attack surface.

export interface WooCartItem {
  key: string
  id: number
  quantity: number
  name: string
  prices: { price: string; currency_code: string }
}

export interface WooCartResponse {
  items: WooCartItem[]
  totals: { total_price: string; currency_code: string }
}

function getStoreOrigin(): string | null {
  const base = process.env.NEXT_PUBLIC_WOOCOMMERCE_CHECKOUT_URL
  if (!base) return null
  try { return new URL(base).origin } catch { return null }
}

/**
 * Fetch the current WooCommerce cart from the Store API.
 * Returns null on any CORS, network or HTTP failure — callers keep local state.
 */
export async function getWooCart(): Promise<WooCartResponse | null> {
  const origin = getStoreOrigin()
  if (!origin) return null

  try {
    const res = await fetch(`${origin}/wp-json/wc/store/v1/cart`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'include',
    })
    if (!res.ok) return null
    const data = (await res.json()) as WooCartResponse
    return Array.isArray(data?.items) ? data : null
  } catch {
    return null
  }
}

/** productId → { key, quantity } for every line in the WooCommerce cart. */
export async function getWooCartQuantityMap(): Promise<Map<number, { key: string; quantity: number }> | null> {
  const cart = await getWooCart()
  if (!cart) return null
  const map = new Map<number, { key: string; quantity: number }>()
  for (const item of cart.items) {
    map.set(item.id, { key: item.key, quantity: item.quantity })
  }
  return map
}
