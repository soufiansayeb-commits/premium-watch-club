'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { CartItem, CART_STORAGE_KEY, buildCheckoutUrl, buildBareCheckoutUrl } from '@/lib/cartStore'
import { syncPwcCartToWoo } from '@/lib/woocommerce-cart'
import { trackEvent } from '@/lib/analytics'

interface CartContextValue {
  items: CartItem[]
  itemCount: number
  isOpen: boolean
  checkoutUrl: string | null
  addItem: (item: CartItem) => void
  removeItem: (competitionId: string) => void
  clearCart: () => void
  openDrawer: () => void
  closeDrawer: () => void
  /**
   * Call this when the user clicks "Continue to Checkout".
   * Clears the WooCommerce cart and re-adds exactly the current PWC basket items,
   * then returns the checkout URL to redirect to.
   *
   * Falls back to ?add-to-cart= URL for single-item carts if Store API sync fails
   * (e.g. CORS not yet configured on WooCommerce).
   *
   * Returns null if there are no items or no checkout URL configured.
   */
  prepareCheckout: () => Promise<string | null>
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Hydrate from localStorage after first render (avoids SSR mismatch)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        // Support both legacy single-item (object) and new multi-item (array) formats
        setItems(Array.isArray(parsed) ? parsed : [parsed])
      }
    } catch {
      // Ignore corrupted storage — start fresh
    }
    setHydrated(true)
  }, [])

  // Persist to localStorage whenever items change (skip pre-hydration)
  useEffect(() => {
    if (!hydrated) return
    if (items.length > 0) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    } else {
      localStorage.removeItem(CART_STORAGE_KEY)
    }
  }, [items, hydrated])

  const addItem = useCallback((newItem: CartItem) => {
    setItems(prev => {
      // Replace if same competition is already in cart, otherwise append
      const exists = prev.findIndex(i => i.competitionId === newItem.competitionId)
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

  const removeItem = useCallback((competitionId: string) => {
    setItems(prev => prev.filter(i => i.competitionId !== competitionId))
    trackEvent('cart_item_removed', { competitionId })
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const openDrawer = useCallback(() => {
    setIsOpen(true)
    trackEvent('cart_opened')
  }, [])

  const closeDrawer = useCallback(() => {
    setIsOpen(false)
  }, [])

  /**
   * Syncs the PWC basket to WooCommerce (clear → add all items) then returns
   * the correct checkout URL. This is the ONLY place we touch the Woo cart
   * before checkout — no pre-syncing elsewhere.
   *
   * Strategy:
   *  1. Try Store API sync (clear + add): guarantees exact quantities, works for multi-item.
   *     Returns bare /checkout/ URL on success.
   *  2. If sync fails (CORS not configured) and there is exactly one item:
   *     fall back to ?add-to-cart=ID&quantity=N URL. The Woo session may still
   *     have stale items in this case, but it's better than a broken redirect.
   *  3. Multi-item sync failure: return null (caller should show an error).
   */
  const prepareCheckout = useCallback(async (): Promise<string | null> => {
    const validItems = items.filter(i => i.wooProductId > 0 && Number.isInteger(i.wooProductId))
    if (validItems.length === 0) return null

    const syncResult = await syncPwcCartToWoo(
      validItems.map(i => ({ wooProductId: i.wooProductId, quantity: i.quantity }))
    )

    if (syncResult.success) {
      // Woo cart is now exactly our PWC basket — redirect to bare checkout
      return buildBareCheckoutUrl()
    }

    // Sync failed — fall back to ?add-to-cart= for single-item carts only
    if (validItems.length === 1) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '[PWC cart] Store API sync failed, using ?add-to-cart= fallback. ' +
          'Enable CORS on WooCommerce for this origin to fix cart duplication.'
        )
      }
      return buildCheckoutUrl(items)
    }

    // Multi-item sync failed — cannot guarantee correct checkout
    if (process.env.NODE_ENV === 'development') {
      console.error('[PWC cart] Multi-item sync failed and no fallback is available.')
    }
    return null
  }, [items])

  const checkoutUrl = buildCheckoutUrl(items)
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
