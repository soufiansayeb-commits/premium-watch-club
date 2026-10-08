'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { CartItem, CART_STORAGE_KEY } from '@/lib/cartStore'
import { getWooCartQuantityMap, getWooCart } from '@/lib/woocommerce-cart'
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
  prepareCheckout: () => Promise<PrepareCheckoutResult>
}

/** Either the signed checkout URL, or a customer-facing reason it could not be made. */
export type PrepareCheckoutResult = { url: string; error?: undefined } | { url: null; error: string }

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
    // Local only. The WooCommerce cart is replaced wholesale by the signed
    // handoff at checkout, so it never needs a separate cross-site write here.
    setItems((prev) => prev.filter((i) => i.competitionId !== competitionId))
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
          // Local only — see removeItem. WooCommerce re-applies its own caps
          // when the handoff rebuilds the cart.
          return {
            ...item,
            quantity: qty,
            // Derive total from live price + live bundle config (0 for free comps).
            total: lineTotalFor(item, qty),
          }
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
  // Calls /api/prepare-checkout, which re-checks every competition server-side
  // (open for entries, skill question configured, answer is a valid option) and
  // returns an HMAC-signed WordPress handoff URL. WordPress validates the
  // signature, replaces the Woo cart with exactly these items, records each skill
  // answer, then redirects to /checkout/.
  //
  // Fail closed: there is no ?add-to-cart= fallback. That path skipped the skill
  // answer and the closed-competition check, so a failed handoff now shows the
  // server's reason instead of sending the customer to checkout without them.
  const prepareCheckout = useCallback(async (): Promise<PrepareCheckoutResult> => {
    const validItems = items.filter(
      (i) => i.wooProductId > 0 && Number.isInteger(i.wooProductId)
    )
    if (validItems.length === 0) {
      return { url: null, error: 'Your basket is empty.' }
    }

    try {
      const apiRes = await fetch('/api/prepare-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: validItems.map(i => ({
            id:          i.wooProductId,
            qty:         i.quantity,
            // Recorded with the entry; correctness is decided by WordPress.
            skillAnswer: i.selectedSkillAnswer || undefined,
          })),
        }),
      })

      const data = await apiRes.json().catch(() => ({})) as { url?: string; error?: string }
      if (apiRes.ok && data.url) {
        localStorage.setItem(CHECKOUT_FLAG_KEY, 'true')
        return { url: data.url }
      }
      return {
        url: null,
        error: data.error || 'Could not connect to checkout. Please try again or contact support.',
      }
    } catch {
      return {
        url: null,
        error: 'Could not connect to checkout. Please check your connection and try again.',
      }
    }
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
