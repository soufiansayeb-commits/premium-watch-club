// lib/woocommerce-cart.ts
// WooCommerce Store API cart layer — called from the browser so that
// WooCommerce domain cookies are set in the user's browser session.
//
// Architecture note (cross-domain headless):
//   Our Next.js frontend is on a different domain from WooCommerce.
//   Cart cookies are domain-scoped, so server-to-server calls won't help.
//   We call the Store API directly from the browser with credentials:'include'
//   so WooCommerce sets its session cookie in the user's browser.
//   CORS must be configured on WooCommerce to trust our Next.js origin.
//
// Fallback: buildCheckoutUrl() in lib/cartStore.ts appends ?add-to-cart=ID
//   which causes WooCommerce to add the item when the checkout page loads.
//   This is a guaranteed single-item fallback that works without any pre-sync.
//
// No secrets here. No WooCommerce consumer key/secret. Store API is public.

export interface WooCartItem {
  key: string
  id: number
  quantity: number
  name: string
  prices: { price: string; currency_code: string }
}

export interface WooCartResponse {
  items: WooCartItem[]
  totals: {
    total_price: string
    currency_code: string
  }
}

export interface AddToWooCartResult {
  success: boolean
  cartItemKey?: string // WooCommerce cart item key — use for remove operations
  error?: string
}

function getStoreOrigin(): string | null {
  const base = process.env.NEXT_PUBLIC_WOOCOMMERCE_CHECKOUT_URL
  if (!base) return null
  try {
    return new URL(base).origin
  } catch {
    return null
  }
}

/**
 * Add a product to the real WooCommerce cart via Store API.
 * Fires from the browser so that WooCommerce session cookies are set correctly.
 * Returns the WooCommerce cart item key on success (used for later removal).
 * Falls back gracefully — checkout URL fallback covers single-item failure.
 */
export async function addToWooCart(
  productId: number,
  quantity: number
): Promise<AddToWooCartResult> {
  if (!productId || productId <= 0) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[PWC woo-cart] addToWooCart skipped — productId is 0 or missing')
    }
    return { success: false, error: 'Invalid product ID' }
  }

  const origin = getStoreOrigin()
  if (!origin) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[PWC woo-cart] addToWooCart skipped — NEXT_PUBLIC_WOOCOMMERCE_CHECKOUT_URL not set')
    }
    return { success: false, error: 'WooCommerce URL not configured' }
  }

  const qty = Math.max(1, Math.floor(quantity))

  try {
    const res = await fetch(`${origin}/wp-json/wc/store/v1/cart/add-item`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ id: productId, quantity: qty }),
    })

    if (!res.ok) {
      if (process.env.NODE_ENV === 'development') {
        const text = await res.text().catch(() => '')
        console.warn(`[PWC woo-cart] Store API add-item failed (${res.status}):`, text.slice(0, 300))
      }
      return { success: false, error: `Store API error ${res.status}` }
    }

    const data = await res.json()

    // The Store API returns the full cart; find the item we just added by product ID
    const addedItem = (data.items as WooCartItem[] | undefined)?.find(
      (it) => it.id === productId
    )
    const cartItemKey = addedItem?.key

    if (process.env.NODE_ENV === 'development') {
      console.log('[PWC woo-cart] Item added to WooCommerce cart ✓', { productId, qty, cartItemKey })
    }

    return { success: true, cartItemKey }
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[PWC woo-cart] Store API call blocked (CORS or network). ' +
        '?add-to-cart= checkout URL fallback is still active.',
        err
      )
    }
    return { success: false, error: 'Network or CORS error' }
  }
}

/**
 * Remove an item from the WooCommerce cart by its cart item key.
 * The key is returned by addToWooCart() and stored in CartItem.wooCartItemKey.
 */
export async function removeFromWooCart(cartItemKey: string): Promise<boolean> {
  const origin = getStoreOrigin()
  if (!origin || !cartItemKey) return false

  try {
    const res = await fetch(`${origin}/wp-json/wc/store/v1/cart/remove-item`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ key: cartItemKey }),
    })

    if (process.env.NODE_ENV === 'development') {
      console.log('[PWC woo-cart] Item removed from WooCommerce cart', { cartItemKey, ok: res.ok })
    }

    return res.ok
  } catch {
    return false
  }
}

/**
 * Fetch the current WooCommerce cart state from Store API.
 * Returns null on failure.
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
    return (await res.json()) as WooCartResponse
  } catch {
    return null
  }
}

/**
 * Clear all items from the WooCommerce cart.
 */
export async function clearWooCart(): Promise<boolean> {
  const cart = await getWooCart()
  if (!cart) return false

  const results = await Promise.all(
    cart.items.map((item) => removeFromWooCart(item.key))
  )
  return results.every(Boolean)
}

export interface SyncPwcCartResult {
  success: boolean
  itemsSynced: number
  error?: string
}

/**
 * Replace the entire WooCommerce cart with the current PWC basket.
 * Clears Woo cart first (so repeated clicks never stack quantities), then
 * adds each item exactly once with the correct quantity.
 *
 * Requires CORS to be configured on WooCommerce for our Next.js origin.
 * Falls back gracefully — if this returns success:false the caller should
 * use a ?add-to-cart= URL as a single-item fallback.
 */
export async function syncPwcCartToWoo(
  items: Array<{ wooProductId: number; quantity: number }>
): Promise<SyncPwcCartResult> {
  const origin = getStoreOrigin()
  if (!origin) {
    return { success: false, itemsSynced: 0, error: 'WooCommerce URL not configured' }
  }

  const validItems = items.filter(i => i.wooProductId > 0 && Number.isInteger(i.wooProductId))
  if (validItems.length === 0) {
    return { success: false, itemsSynced: 0, error: 'No valid items to sync' }
  }

  // Step 1: clear existing Woo cart — this prevents quantity stacking across sessions
  const cleared = await clearWooCart()
  if (!cleared) {
    return {
      success: false,
      itemsSynced: 0,
      error: 'Could not clear WooCommerce cart — CORS may not be configured for this origin',
    }
  }

  // Step 2: add each PWC item with the exact quantity
  let synced = 0
  for (const item of validItems) {
    const result = await addToWooCart(item.wooProductId, item.quantity)
    if (result.success) synced++
  }

  const allSynced = synced === validItems.length
  if (process.env.NODE_ENV === 'development') {
    console.log(`[PWC woo-cart] syncPwcCartToWoo: ${synced}/${validItems.length} items synced`)
  }

  return {
    success: allSynced,
    itemsSynced: synced,
    error: allSynced ? undefined : `Only ${synced}/${validItems.length} items synced`,
  }
}
