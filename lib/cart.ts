// lib/cart.ts
// Client-safe cart helpers for the PWC headless WooCommerce frontend.
//
// WooCommerce Cart Architecture (cross-domain headless):
// ───────────────────────────────────────────────────────
// The WooCommerce checkout page is on a different domain from our Next.js app.
// Session cookies set by WooCommerce are domain-scoped and can't cross domains.
//
// Two-layer approach:
//   1. syncWithWooCart() — calls WooCommerce Store API directly from the BROWSER.
//      The browser request includes/receives cookies scoped to the WooCommerce domain.
//      If CORS is enabled on WooCommerce (default in WC 6.9+), the cart is pre-populated
//      and the user can even visit the WooCommerce cart page and see their item.
//      Falls back gracefully if CORS blocks or network fails.
//
//   2. buildWooCheckoutUrl() (in lib/cartStore.ts) — the guaranteed fallback.
//      ?add-to-cart=ID&quantity=N on the checkout URL causes WooCommerce to add
//      the item to cart THEN show checkout. Checkout is never empty this way.
//
// Do not call WooCommerce consumer keys from here. No secrets in client bundles.

export interface AddToCartResult {
  success: boolean
  productId?: number
  quantity?: number
  checkoutUrl?: string
  wooCartSynced?: boolean
  error?: string
}

/**
 * Sync a cart item directly with WooCommerce Store API from the browser.
 * Uses the browser's session so WooCommerce domain cookies are set correctly.
 * Falls back silently if CORS is not configured or the network fails.
 *
 * Checkout URL (?add-to-cart=) remains the guaranteed fallback.
 */
export async function syncWithWooCart(
  productId: number,
  quantity: number
): Promise<boolean> {
  if (!productId || productId <= 0) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[PWC cart] syncWithWooCart skipped — productId is 0 or missing')
    }
    return false
  }

  const checkoutBase = process.env.NEXT_PUBLIC_WOOCOMMERCE_CHECKOUT_URL
  if (!checkoutBase) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[PWC cart] syncWithWooCart skipped — NEXT_PUBLIC_WOOCOMMERCE_CHECKOUT_URL not set')
    }
    return false
  }

  let storeOrigin: string
  try {
    storeOrigin = new URL(checkoutBase).origin
  } catch {
    return false
  }

  const qty = Math.max(1, Math.floor(quantity))

  try {
    const res = await fetch(`${storeOrigin}/wp-json/wc/store/v1/cart/add-item`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      // 'include' sends/receives cookies scoped to the WooCommerce domain
      // This is what populates the real WooCommerce cart session in the browser
      credentials: 'include',
      body: JSON.stringify({ id: productId, quantity: qty }),
    })

    if (!res.ok) {
      if (process.env.NODE_ENV === 'development') {
        const text = await res.text().catch(() => '')
        console.warn(
          `[PWC cart] WooCommerce Store API sync failed (${res.status}):`,
          text.slice(0, 300)
        )
      }
      return false
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[PWC cart] WooCommerce cart synced via Store API ✓')
    }
    return true
  } catch (err) {
    // Most common reason: CORS not enabled on WooCommerce for this origin.
    // The ?add-to-cart= checkout URL will still work as fallback.
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[PWC cart] WooCommerce Store API call blocked (CORS or network). ' +
        'Checkout URL fallback is still active.',
        err
      )
    }
    return false
  }
}

/**
 * Validate add-to-cart inputs via our internal API route.
 * Used to enforce server-side rules (max tickets, valid product ID).
 * Returns the validated checkoutUrl on success.
 */
export async function validateCartAdd(
  productId: number,
  quantity: number,
  competitionSlug?: string
): Promise<AddToCartResult> {
  try {
    const res = await fetch('/api/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity, competitionSlug }),
    })
    const data: AddToCartResult = await res.json()
    return data
  } catch (err) {
    console.error('[PWC cart] validateCartAdd network error:', err)
    return {
      success: false,
      error: 'Network error — please check your connection and try again.',
    }
  }
}
