'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { CartItem, CART_STORAGE_KEY, buildCheckoutUrl } from '@/lib/cartStore'
import {
  removeFromWooCart,
  updateWooCartItem,
  getWooCartQuantityMap,
  getWooCart,
} from '@/lib/woocommerce-cart'
import { trackEvent } from '@/lib/analytics'
import { bundleLineTotal, getEligibleTiers } from '@/lib/bundle-discounts'
import { useBundleConfig } from '@/context/BundleConfigContext'

const CHECKOUT_FLAG_KEY = 'pwc_checkout_initiated'

interface CartContextValue {
  items: CartItem[]
  itemCount: number
  isOpen: boolean
  checkoutUrl: string | null
  addItem: (item: CartItem) => void
  removeItem: (competitionId: string) => void
  /** Update the quantity of an item already in the cart. Removes it if newQty ≤ 0. */
  updateQuantity: (competitionId: string, newQty: number) => void
  clearCart: () => void
  openDrawer: () => void
  closeDrawer: () => void
  prepareCheckout: () => Promise<string | null>
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Live bundle-discount rules (same single source of truth the buy box and the
  // WooCommerce backend use). Cart line totals are recalculated from these so the
  // drawer preview matches what checkout will charge.
  const bundleConfig = useBundleConfig()

  // Recompute a cart item's discounted line total from the live config. The item
  // carries its own competitionType / isFree so eligibility resolves correctly.
  const lineTotalFor = useCallback(
    (item: Pick<CartItem, 'price' | 'competitionType' | 'isFreeCompetition'>, qty: number) => {
      const tiers = getEligibleTiers(
        bundleConfig,
        item.competitionType,
        item.price,
        item.isFreeCompetition,
      )
      return bundleLineTotal(item.price, tiers, qty)
    },
    [bundleConfig],
  )

  // ── Hydrate from localStorage after first render (avoids SSR mismatch) ──────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        setItems(Array.isArray(parsed) ? parsed : [parsed])
      }
    } catch {
      // Ignore corrupted storage — start fresh
    }
    setHydrated(true)
  }, [])

  // ── After hydration: detect post-checkout cart clear ─────────────────────────
  // When prepareCheckout() fires it sets a flag. On return to the site we check
  // if the WooCommerce cart is now empty (order was processed) and clear locally.
  useEffect(() => {
    if (!hydrated) return

    const flag = localStorage.getItem(CHECKOUT_FLAG_KEY)
    if (!flag) return

    localStorage.removeItem(CHECKOUT_FLAG_KEY)

    getWooCart().then((wooCart) => {
      if (wooCart && wooCart.items.length === 0) {
        setItems([])
        trackEvent('purchase_completed')
      }
    }).catch(() => {})
  }, [hydrated])

  // ── Persist to localStorage whenever items change ─────────────────────────────
  useEffect(() => {
    if (!hydrated) return
    if (items.length > 0) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    } else {
      localStorage.removeItem(CART_STORAGE_KEY)
    }
  }, [items, hydrated])

  // ── Refresh frontend quantities from WooCommerce cart ─────────────────────────
  // Called when the drawer opens. Handles the case where the user changed
  // quantities directly on the WooCommerce cart page.
  const refreshFromWoo = useCallback(async () => {
    const wooMap = await getWooCartQuantityMap()
    if (!wooMap) return // CORS/network failure — keep local state as-is

    setItems((prev) => {
      const next = prev.map((item) => {
        const wooItem = wooMap.get(item.wooProductId)
        if (!wooItem) return item // not in Woo cart — keep local item
        return {
          ...item,
          quantity: wooItem.quantity,
          // Derive total from live price + live bundle config, not stale flags.
          // Returns full price (0 discount) for ineligible / free comps.
          total: lineTotalFor(item, wooItem.quantity),
          wooCartItemKey: wooItem.key,
        }
      })
      return next
    })
  }, [lineTotalFor])

  // ── addItem ───────────────────────────────────────────────────────────────────
  const addItem = useCallback((newItem: CartItem) => {
    setItems((prev) => {
      const exists = prev.findIndex((i) => i.competitionId === newItem.competitionId)
      if (exists >= 0) {
        const next = [...prev]
        next[exists] = newItem
        return next
      }
      return [...prev, newItem]
    })
    setIsOpen(true)

    trackEvent('add_to_cart', {
      competitionId: newItem.competitionId,
      slug: newItem.slug,
      wooProductId: newItem.wooProductId,
      quantity: newItem.quantity,
      total: newItem.total,
      isFreeCompetition: newItem.isFreeCompetition,
      selectedSkillAnswer: newItem.selectedSkillAnswer,
    })
  }, [])

  // ── removeItem ────────────────────────────────────────────────────────────────
  const removeItem = useCallback((competitionId: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.competitionId === competitionId)
      // Best-effort: remove from WooCommerce if we have a cart item key
      if (item?.wooCartItemKey) {
        removeFromWooCart(item.wooCartItemKey).catch(() => {})
      }
      return prev.filter((i) => i.competitionId !== competitionId)
    })
    trackEvent('cart_item_removed', { competitionId })
  }, [])

  // ── updateQuantity ────────────────────────────────────────────────────────────
  const updateQuantity = useCallback(
    (competitionId: string, newQty: number) => {
      const qty = Math.max(0, Math.floor(newQty))

      if (qty === 0) {
        removeItem(competitionId)
        return
      }

      setItems((prev) =>
        prev.map((item) => {
          if (item.competitionId !== competitionId) return item
          const updated: CartItem = {
            ...item,
            quantity: qty,
            // Derive total from live price + live bundle config (0 for free comps).
            total: lineTotalFor(item, qty),
          }
          // Best-effort: update WooCommerce if we already have the cart item key
          if (item.wooCartItemKey) {
            updateWooCartItem(item.wooCartItemKey, qty).catch(() => {})
          }
          return updated
        })
      )

      trackEvent('cart_quantity_updated', { competitionId, newQty: qty })
    },
    [removeItem, lineTotalFor]
  )

  // ── clearCart ─────────────────────────────────────────────────────────────────
  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  // ── openDrawer / closeDrawer ──────────────────────────────────────────────────
  const openDrawer = useCallback(() => {
    setIsOpen(true)
    refreshFromWoo() // sync quantities from WooCommerce silently
    trackEvent('cart_opened')
  }, [refreshFromWoo])

  const closeDrawer = useCallback(() => {
    setIsOpen(false)
  }, [])

  // ── prepareCheckout ───────────────────────────────────────────────────────────
  // Primary path: calls /api/prepare-checkout to generate an HMAC-signed
  // WordPress handoff URL. WordPress validates the signature, clears the Woo
  // cart, adds all items server-side, then redirects to /checkout/.
  //
  // Fallback path (single item only): ?add-to-cart= redirect if the API fails.
  // Multi-item fallback is intentionally disabled — it would silently send the
  // wrong cart to checkout.
  const prepareCheckout = useCallback(async (): Promise<string | null> => {
    const validItems = items.filter(
      (i) => i.wooProductId > 0 && Number.isInteger(i.wooProductId)
    )
    if (validItems.length === 0) {
      console.warn('[PWC prepareCheckout] No valid items in cart.')
      return null
    }

    console.log(
      '[PWC prepareCheckout] Preparing checkout for:',
      validItems.map(i => `"${i.title}" id=${i.wooProductId} ×${i.quantity} ${i.price > 0 ? `£${i.price}` : 'FREE'}`)
    )

    // ── Primary: server-side cart handoff (no CORS required) ──────────────────
    // Next.js API route generates an HMAC-signed URL. WordPress validates it,
    // clears the Woo cart, adds all items server-side, then redirects to /checkout/.
    try {
      const apiRes = await fetch('/api/prepare-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: validItems.map(i => ({
            id:          i.wooProductId,
            qty:         i.quantity,
            // Skill challenge data — saved as WooCommerce order item meta by WordPress
            skillAnswer: i.selectedSkillAnswer  || undefined,
            skillResult: i.isCorrectSkillAnswer != null
              ? (i.isCorrectSkillAnswer ? 'Correct' : 'Incorrect')
              : undefined,
          })),
        }),
      })

      if (apiRes.ok) {
        const data = await apiRes.json() as { url?: string; error?: string }
        if (data.url) {
          localStorage.setItem(CHECKOUT_FLAG_KEY, 'true')
          console.log('[PWC prepareCheckout] ✓ Handoff URL generated →', data.url)
          return data.url
        }
        console.error('[PWC prepareCheckout] ✗ API returned ok but no url:', data)
      } else {
        const errorText = await apiRes.text().catch(() => '')
        console.error(
          `[PWC prepareCheckout] ✗ /api/prepare-checkout returned HTTP ${apiRes.status}:`,
          errorText.slice(0, 300)
        )
      }
    } catch (err) {
      console.error('[PWC prepareCheckout] ✗ Network error calling /api/prepare-checkout:', err)
    }

    // ── Fallback: ?add-to-cart= (single item only — stacks on existing Woo cart) ──
    // Only safe for single-item carts. For multi-item carts, show an error instead of
    // silently going to checkout with the wrong items.
    if (validItems.length === 1) {
      const fallbackUrl = buildCheckoutUrl(validItems)
      if (fallbackUrl) {
        console.warn(
          '[PWC prepareCheckout] ⚠ Handoff failed — using ?add-to-cart= fallback for single item.',
          'Fix: ensure PWC_CART_HANDOFF_SECRET is set in .env.local and wp-config.php.'
        )
        localStorage.setItem(CHECKOUT_FLAG_KEY, 'true')
        return fallbackUrl
      }
    }

    console.error(
      '[PWC prepareCheckout] ✗ Checkout unavailable.',
      'Handoff API failed and multi-item fallback is not safe.',
      'Action required: set PWC_CART_HANDOFF_SECRET in Next.js .env.local and WordPress wp-config.php.'
    )
    return null
  }, [items])

  // checkoutUrl is intentionally null — always use prepareCheckout() which syncs the
  // WooCommerce cart before redirecting. Direct ?add-to-cart= URLs stack quantities.
  const checkoutUrl = null
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        isOpen,
        checkoutUrl,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        openDrawer,
        closeDrawer,
        prepareCheckout,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
