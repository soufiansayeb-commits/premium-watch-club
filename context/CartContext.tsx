'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { CartItem, CART_STORAGE_KEY, buildBareCheckoutUrl, buildCheckoutUrl } from '@/lib/cartStore'
import {
  syncPwcCartToWoo,
  removeFromWooCart,
  updateWooCartItem,
  getWooCartQuantityMap,
  getWooCart,
} from '@/lib/woocommerce-cart'
import { trackEvent } from '@/lib/analytics'

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
          total: item.isFreeCompetition
            ? 0
            : parseFloat((item.price * wooItem.quantity).toFixed(2)),
          wooCartItemKey: wooItem.key,
        }
      })
      return next
    })
  }, [])

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
            total: item.isFreeCompetition
              ? 0
              : parseFloat((item.price * qty).toFixed(2)),
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
    [removeItem]
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
  // Clears the WooCommerce cart and re-adds exactly the current PWC basket,
  // then sets a flag so we can detect post-order cart clearing on return.
  const prepareCheckout = useCallback(async (): Promise<string | null> => {
    const validItems = items.filter(
      (i) => i.wooProductId > 0 && Number.isInteger(i.wooProductId)
    )
    if (validItems.length === 0) return null

    const syncResult = await syncPwcCartToWoo(
      validItems.map((i) => ({ wooProductId: i.wooProductId, quantity: i.quantity }))
    )

    if (syncResult.success) {
      // Flag that checkout has been initiated — checked on next visit to detect order completion
      localStorage.setItem(CHECKOUT_FLAG_KEY, 'true')
      return buildBareCheckoutUrl()
    }

    // Sync failed (e.g. CORS not configured, localhost dev) — fall back to the
    // ?add-to-cart= redirect so the customer can still reach checkout.
    // WooCommerce may stack quantities if the user goes back and re-adds, but
    // that is acceptable until the full cart sync is configured.
    if (process.env.NODE_ENV === 'development') {
      console.warn('[PWC cart] Cart sync failed — using ?add-to-cart= redirect fallback.', syncResult.error)
    }
    return buildCheckoutUrl(validItems)
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
