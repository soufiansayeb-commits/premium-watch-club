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
//   See the CORS snippet in /woocommerce-snippets/cors-and-checkout.php
//   which must be added to WordPress to enable the sync flow.
//
// Session token:
//   WooCommerce returns a 'Woocommerce-Session' header on every Store API response.
//   We store this token and include it on all subsequent requests so that all calls
//   reference the SAME WooCommerce session (matching the user's checkout session cookie).
//   This prevents "session drift" where cart changes are applied to a different session
//   than the one the browser sends to the checkout page.

const SESSION_TOKEN_KEY = 'pwc_woo_session'

function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null
  try { return localStorage.getItem(SESSION_TOKEN_KEY) } catch { return null }
}

function saveSessionToken(token: string | null): void {
  if (typeof window === 'undefined') return
  try {
    if (token) localStorage.setItem(SESSION_TOKEN_KEY, token)
    else localStorage.removeItem(SESSION_TOKEN_KEY)
  } catch {}
}

function captureSessionToken(res: Response): void {
  const token = res.headers.get('Woocommerce-Session')
  if (token) saveSessionToken(token)
}

function storeApiHeaders(): Record<string, string> {
  const token = getSessionToken()
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { 'Woocommerce-Session': token } : {}),
  }
}

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
  cartItemKey?: string
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
 * Includes the stored session token so all calls target the same WooCommerce session.
 */
export async function addToWooCart(
  productId: number,
  quantity: number
): Promise<AddToWooCartResult> {
  if (!productId || productId <= 0) {
    return { success: false, error: 'Invalid product ID' }
  }

  const origin = getStoreOrigin()
  if (!origin) {
    return { success: false, error: 'WooCommerce URL not configured' }
  }

  const qty = Math.max(1, Math.floor(quantity))

  try {
    const res = await fetch(`${origin}/wp-json/wc/store/v1/cart/add-item`, {
      method: 'POST',
      headers: storeApiHeaders(),
      credentials: 'include',
      body: JSON.stringify({ id: productId, quantity: qty }),
    })

    captureSessionToken(res)

    if (!res.ok) {
      if (process.env.NODE_ENV === 'development') {
        const text = await res.text().catch(() => '')
        console.warn(`[PWC woo-cart] Store API add-item failed (${res.status}):`, text.slice(0, 300))
      }
      return { success: false, error: `Store API error ${res.status}` }
    }

    const data = await res.json()
    const addedItem = (data.items as WooCartItem[] | undefined)?.find(
      (it) => it.id === productId
    )

    return { success: true, cartItemKey: addedItem?.key }
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[PWC woo-cart] Store API add-item blocked (CORS or network).', err)
    }
    return { success: false, error: 'Network or CORS error' }
  }
}

/**
 * Remove an item from the WooCommerce cart by its cart item key.
 */
export async function removeFromWooCart(cartItemKey: string): Promise<boolean> {
  const origin = getStoreOrigin()
  if (!origin || !cartItemKey) return false

  try {
    const res = await fetch(`${origin}/wp-json/wc/store/v1/cart/remove-item`, {
      method: 'POST',
      headers: storeApiHeaders(),
      credentials: 'include',
      body: JSON.stringify({ key: cartItemKey }),
    })

    captureSessionToken(res)
    return res.ok
  } catch {
    return false
  }
}

/**
 * Fetch the current WooCommerce cart state from Store API.
 * Also captures the session token from the response for future calls.
 */
export async function getWooCart(): Promise<WooCartResponse | null> {
  const origin = getStoreOrigin()
  if (!origin) return null

  try {
    const res = await fetch(`${origin}/wp-json/wc/store/v1/cart`, {
      method: 'GET',
      headers: storeApiHeaders(),
      credentials: 'include',
    })

    captureSessionToken(res)

    if (!res.ok) return null
    return (await res.json()) as WooCartResponse
  } catch {
    return null
  }
}

/**
 * Update the quantity of an existing WooCommerce cart item by its cart item key.
 */
export async function updateWooCartItem(
  cartItemKey: string,
  quantity: number
): Promise<boolean> {
  const origin = getStoreOrigin()
  if (!origin || !cartItemKey) return false

  try {
    const res = await fetch(`${origin}/wp-json/wc/store/v1/cart/update-item`, {
      method: 'POST',
      headers: storeApiHeaders(),
      credentials: 'include',
      body: JSON.stringify({ key: cartItemKey, quantity: Math.max(1, Math.floor(quantity)) }),
    })

    captureSessionToken(res)
    return res.ok
  } catch {
    return false
  }
}

/**
 * Fetch the WooCommerce cart and return a Map of productId → { key, quantity }.
 */
export async function getWooCartQuantityMap(): Promise<Map<number, { key: string; quantity: number }> | null> {
  const cart = await getWooCart()
  if (!cart) return null

  const map = new Map<number, { key: string; quantity: number }>()
  for (const item of cart.items) {
    map.set(item.id, { key: item.key, quantity: item.quantity })
  }
  return map
}

/**
 * Clear all items from the WooCommerce cart.
 * First tries the bulk delete endpoint (one call), falls back to removing individually.
 */
export async function clearWooCart(): Promise<boolean> {
  const origin = getStoreOrigin()
  if (!origin) return false

  // Try bulk delete endpoint first (WooCommerce Blocks 9.4+)
  try {
    const bulkRes = await fetch(`${origin}/wp-json/wc/store/v1/cart/items`, {
      method: 'DELETE',
      headers: storeApiHeaders(),
      credentials: 'include',
    })
    captureSessionToken(bulkRes)
    if (bulkRes.ok) return true
  } catch {
    // Fall through to item-by-item removal
  }

  // Fallback: fetch cart and remove items one-by-one
  const cart = await getWooCart()
  if (!cart) return false
  if (cart.items.length === 0) return true

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
 *
 * Clears the Woo cart first (so repeated clicks NEVER stack quantities),
 * then adds each item exactly once with the correct quantity.
 *
 * Requires CORS to be configured on WooCommerce for our Next.js origin.
 * See /woocommerce-snippets/cors-and-checkout.php for the required WordPress snippet.
 *
 * If this returns success:false, prepareCheckout() shows an error to the user
 * rather than falling back to ?add-to-cart= (which would stack quantities).
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

  // Step 1: clear existing Woo cart — prevents quantity stacking across sessions
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
