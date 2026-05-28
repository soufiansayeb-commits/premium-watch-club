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
//   See /woocommerce-snippets/cors-and-checkout.php (must be active on WordPress).
//
// Session token:
//   WooCommerce returns a 'Woocommerce-Session' header on every Store API response.
//   We store this token and send it on all subsequent requests so all calls
//   reference the SAME WooCommerce session — preventing session drift where cart
//   changes are applied to a different session than the checkout page uses.

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

function getStoreOrigin(): string | null {
  const base = process.env.NEXT_PUBLIC_WOOCOMMERCE_CHECKOUT_URL
  if (!base) return null
  try { return new URL(base).origin } catch { return null }
}

// ── Shared types ──────────────────────────────────────────────────────────────

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

export interface AddToWooCartResult {
  success: boolean
  cartItemKey?: string
  error?: string
}

export interface SyncPwcCartResult {
  success: boolean
  itemsSynced: number
  error?: string
  /** Verified WooCommerce cart contents after sync (for debugging). */
  wooCartAfterSync?: WooCartItem[]
}

// ── getWooCart ────────────────────────────────────────────────────────────────

/**
 * Fetch the current WooCommerce cart state from Store API.
 * Captures the session token from the response header for future calls.
 * Returns null on CORS or network failure.
 */
export async function getWooCart(): Promise<WooCartResponse | null> {
  const origin = getStoreOrigin()
  if (!origin) {
    console.error('[PWC woo-cart] getWooCart: NEXT_PUBLIC_WOOCOMMERCE_CHECKOUT_URL is not set.')
    return null
  }

  try {
    const res = await fetch(`${origin}/wp-json/wc/store/v1/cart`, {
      method: 'GET',
      headers: storeApiHeaders(),
      credentials: 'include',
    })

    captureSessionToken(res)

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error(`[PWC woo-cart] getWooCart: HTTP ${res.status}`, text.slice(0, 300))
      return null
    }
    return (await res.json()) as WooCartResponse
  } catch (err) {
    console.error(
      '[PWC woo-cart] getWooCart: network or CORS error.',
      'Check that the PWC CORS snippet is active on WordPress with the correct domain.',
      err
    )
    return null
  }
}

// ── addToWooCart ──────────────────────────────────────────────────────────────

/**
 * Add a product to the WooCommerce cart via Store API (browser → WooCommerce).
 * Works for both free (price=0) and paid products.
 */
export async function addToWooCart(
  productId: number,
  quantity: number
): Promise<AddToWooCartResult> {
  if (!productId || productId <= 0) {
    return { success: false, error: `Invalid product ID: ${productId}` }
  }

  const origin = getStoreOrigin()
  if (!origin) {
    return { success: false, error: 'WooCommerce URL not configured (NEXT_PUBLIC_WOOCOMMERCE_CHECKOUT_URL missing)' }
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
      // Always read the response body for debugging — works for both free + paid products
      const text = await res.text().catch(() => '(could not read response body)')
      const error = `Store API HTTP ${res.status} for product ${productId} × ${qty}: ${text.slice(0, 400)}`
      console.error(`[PWC woo-cart] addToWooCart: ✗ ${error}`)
      return { success: false, error }
    }

    const data = await res.json()
    // The response is the full updated cart — find our item to get its cart key
    const addedItem = (data.items as WooCartItem[] | undefined)?.find(it => it.id === productId)

    console.log(
      `[PWC woo-cart] addToWooCart: ✓ product ${productId} × ${qty} added.`,
      `Cart key: ${addedItem?.key ?? '(not found in response)'}`
    )
    return { success: true, cartItemKey: addedItem?.key }

  } catch (err) {
    const error = `Network or CORS error adding product ${productId}: ${(err as Error).message}`
    console.error(
      '[PWC woo-cart] addToWooCart: ✗', error,
      '| Check the CORS snippet on WordPress.'
    )
    return { success: false, error }
  }
}

// ── removeFromWooCart ─────────────────────────────────────────────────────────

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
    if (!res.ok) {
      console.warn(`[PWC woo-cart] removeFromWooCart: HTTP ${res.status} for key ${cartItemKey}`)
    }
    return res.ok
  } catch (err) {
    console.error('[PWC woo-cart] removeFromWooCart: error', err)
    return false
  }
}

// ── updateWooCartItem ─────────────────────────────────────────────────────────

/**
 * Update the quantity of an existing WooCommerce cart item by its cart item key.
 */
export async function updateWooCartItem(cartItemKey: string, quantity: number): Promise<boolean> {
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

// ── getWooCartQuantityMap ─────────────────────────────────────────────────────

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

// ── clearWooCart ──────────────────────────────────────────────────────────────

/**
 * Clear ALL items from the WooCommerce cart.
 *
 * Strategy:
 *  1. Try bulk DELETE endpoint (WooCommerce Blocks 9.4+) — one request, fastest.
 *  2. Fallback: fetch cart, remove items one-by-one.
 *
 * Returns true if the cart is confirmed empty after this call.
 * Returns false only if we cannot reach the Store API at all (CORS / network).
 */
export async function clearWooCart(): Promise<boolean> {
  const origin = getStoreOrigin()
  if (!origin) {
    console.error('[PWC woo-cart] clearWooCart: WooCommerce URL not configured.')
    return false
  }

  // ── Attempt 1: bulk DELETE ─────────────────────────────────────────────────
  try {
    const bulkRes = await fetch(`${origin}/wp-json/wc/store/v1/cart/items`, {
      method: 'DELETE',
      headers: storeApiHeaders(),
      credentials: 'include',
    })
    captureSessionToken(bulkRes)
    if (bulkRes.ok) {
      console.log('[PWC woo-cart] clearWooCart: ✓ bulk DELETE succeeded.')
      return true
    }
    const errText = await bulkRes.text().catch(() => '')
    console.warn(
      `[PWC woo-cart] clearWooCart: bulk DELETE returned HTTP ${bulkRes.status}.`,
      errText.slice(0, 200),
      '→ trying item-by-item fallback.'
    )
  } catch (err) {
    console.warn('[PWC woo-cart] clearWooCart: bulk DELETE threw (CORS or network):', err, '→ trying item-by-item fallback.')
  }

  // ── Attempt 2: fetch cart + remove items one-by-one ────────────────────────
  const cart = await getWooCart()
  if (!cart) {
    console.error(
      '[PWC woo-cart] clearWooCart: ✗ Could not fetch cart for item-by-item clear.',
      'This almost always means CORS is not configured correctly on WordPress.',
      `Expected origin allowed: ${origin}`,
      'Fix: ensure the PWC CORS snippet is active with the correct domain (no trailing slash).',
      'Snippet file: /woocommerce-snippets/cors-and-checkout.php'
    )
    return false
  }

  if (cart.items.length === 0) {
    console.log('[PWC woo-cart] clearWooCart: ✓ Cart already empty.')
    return true
  }

  console.log(`[PWC woo-cart] clearWooCart: removing ${cart.items.length} item(s) one-by-one...`)
  const results = await Promise.all(cart.items.map(item => removeFromWooCart(item.key)))
  const allRemoved = results.every(Boolean)

  if (allRemoved) {
    console.log('[PWC woo-cart] clearWooCart: ✓ All items removed.')
  } else {
    console.error('[PWC woo-cart] clearWooCart: ✗ Some items could not be removed.')
  }
  return allRemoved
}

// ── syncPwcCartToWoo ──────────────────────────────────────────────────────────

/**
 * Replace the WooCommerce cart with exactly the items in the PWC frontend basket.
 *
 * Flow:
 *  1. Validate items (product ID must be a positive integer; quantity clamped to ≥ 1).
 *  2. Clear the WooCommerce cart (prevents stale/duplicate items from previous sessions).
 *  3. Add each item to the WooCommerce cart one-by-one.
 *  4. Read back the WooCommerce cart and verify it matches the intended basket.
 *  5. Return success only if ALL items were synced and verified.
 *
 * Free products (price = 0) are treated identically to paid products.
 * No product IDs or names are hardcoded — works for all future competitions.
 */
export async function syncPwcCartToWoo(
  items: Array<{ wooProductId: number; quantity: number }>
): Promise<SyncPwcCartResult> {
  const origin = getStoreOrigin()
  if (!origin) {
    console.error('[PWC sync] ✗ NEXT_PUBLIC_WOOCOMMERCE_CHECKOUT_URL is not set.')
    return { success: false, itemsSynced: 0, error: 'WooCommerce URL not configured' }
  }

  // ── Step 0: Validate items ──────────────────────────────────────────────────
  const validItems = items.filter(i => i.wooProductId > 0 && Number.isInteger(i.wooProductId))
  if (validItems.length === 0) {
    console.error('[PWC sync] ✗ No valid items to sync (all product IDs are 0 or non-integer).')
    return { success: false, itemsSynced: 0, error: 'No valid items to sync' }
  }

  console.log(
    `[PWC sync] ════ Starting cart sync — ${validItems.length} item(s) ════`,
    validItems.map(i => `product_id=${i.wooProductId} × qty=${i.quantity}`)
  )

  // ── Step 1: Clear existing WooCommerce cart ─────────────────────────────────
  console.log('[PWC sync] Step 1/3 — Clearing WooCommerce cart...')
  const cleared = await clearWooCart()

  if (!cleared) {
    const error =
      'Could not clear WooCommerce cart. ' +
      'Likely cause: CORS not configured. ' +
      `Check that the WordPress CORS snippet is active and allows origin "${origin}".`
    console.error('[PWC sync] ✗ Step 1 failed:', error)
    return { success: false, itemsSynced: 0, error }
  }
  console.log('[PWC sync] ✓ Step 1 — WooCommerce cart cleared.')

  // ── Step 2: Add each item ───────────────────────────────────────────────────
  console.log(`[PWC sync] Step 2/3 — Adding ${validItems.length} item(s) to WooCommerce cart...`)
  let synced = 0
  const addErrors: string[] = []

  for (const item of validItems) {
    const qty = Math.max(1, Math.floor(item.quantity))
    console.log(`[PWC sync]   → Adding product ${item.wooProductId} × ${qty}...`)
    const result = await addToWooCart(item.wooProductId, qty)

    if (result.success) {
      synced++
      console.log(`[PWC sync]   ✓ Product ${item.wooProductId} × ${qty} added. Key: ${result.cartItemKey ?? '(not returned)'}`)
    } else {
      const msg = `product_id=${item.wooProductId} qty=${qty} — ${result.error}`
      addErrors.push(msg)
      console.error(`[PWC sync]   ✗ Failed to add product ${item.wooProductId} × ${qty}:`, result.error)
    }
  }

  const allAdded = synced === validItems.length
  console.log(`[PWC sync] Step 2 result: ${synced}/${validItems.length} item(s) added.`)

  // ── Step 3: Read back + verify WooCommerce cart ─────────────────────────────
  console.log('[PWC sync] Step 3/3 — Verifying WooCommerce cart...')
  const wooCart = await getWooCart()

  if (!wooCart) {
    console.warn('[PWC sync] ⚠ Could not fetch WooCommerce cart for verification — proceeding anyway.')
  } else {
    console.log(
      `[PWC sync] WooCommerce cart after sync (${wooCart.items.length} item(s)):`,
      wooCart.items.length > 0
        ? wooCart.items.map(i => `id=${i.id} name="${i.name}" qty=${i.quantity} price=${i.prices?.price ?? '?'}`).join(' | ')
        : '(empty)'
    )

    // Check each intended item is present with the correct quantity
    let verifyPassed = true
    for (const intended of validItems) {
      const found = wooCart.items.find(i => i.id === intended.wooProductId)
      if (!found) {
        console.error(
          `[PWC sync] ✗ VERIFY FAIL: product ${intended.wooProductId} is NOT in WooCommerce cart after sync!`,
          'This means the add-item call either failed silently or WooCommerce rejected it.',
          'Check the WooCommerce product exists, is published, and is not out of stock.'
        )
        verifyPassed = false
      } else if (found.quantity !== Math.max(1, Math.floor(intended.quantity))) {
        console.warn(
          `[PWC sync] ⚠ VERIFY WARN: product ${intended.wooProductId} quantity mismatch.`,
          `Intended: ${intended.quantity}, WooCommerce has: ${found.quantity}`
        )
      } else {
        console.log(`[PWC sync]   ✓ Verified product ${intended.wooProductId} "${found.name}" × ${found.quantity}`)
      }
    }

    // Warn about unexpected extra items in the Woo cart
    for (const wooItem of wooCart.items) {
      const wasIntended = validItems.some(i => i.wooProductId === wooItem.id)
      if (!wasIntended) {
        console.error(
          `[PWC sync] ✗ UNEXPECTED ITEM in WooCommerce cart: product ${wooItem.id} "${wooItem.name}" × ${wooItem.quantity}`,
          'This item was NOT in the frontend basket — cart clear may not have worked.'
        )
        verifyPassed = false
      }
    }

    if (verifyPassed) {
      console.log('[PWC sync] ✓ Step 3 — WooCommerce cart verified. Matches frontend basket exactly.')
    } else {
      console.error('[PWC sync] ✗ Step 3 — Verification failed. WooCommerce cart does NOT match frontend basket.')
    }

    if (!allAdded || !verifyPassed) {
      const error = addErrors.length > 0
        ? `Failed to add: ${addErrors.join('; ')}`
        : `Only ${synced}/${validItems.length} items synced and/or cart verification failed`
      return { success: false, itemsSynced: synced, error, wooCartAfterSync: wooCart.items }
    }

    console.log('[PWC sync] ════ Cart sync COMPLETE ✓ ════')
    return { success: true, itemsSynced: synced, wooCartAfterSync: wooCart.items }
  }

  // Verification not possible (getWooCart returned null) — trust add results
  if (!allAdded) {
    const error = addErrors.length > 0
      ? `Failed to add: ${addErrors.join('; ')}`
      : `Only ${synced}/${validItems.length} items were added to WooCommerce`
    console.error('[PWC sync] ✗ Cart sync INCOMPLETE:', error)
    return { success: false, itemsSynced: synced, error }
  }

  console.log('[PWC sync] ════ Cart sync COMPLETE (unverified — cart read failed) ✓ ════')
  return { success: true, itemsSynced: synced }
}
