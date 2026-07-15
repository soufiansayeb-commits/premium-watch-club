'use client'

// components/competition/LiveActivityToast.tsx
// Mobile-only PDP social-proof popup/toast. Reuses the SAME real WooCommerce order
// data as the hero ticker (/api/live-activity — anonymised city + quantity only) and
// renders nothing when there are no real matching orders. No fake data, no generator.
//
// Behaviour: waits a few seconds after load, shows a single item for a few seconds,
// hides, then repeats on a calm ~12s cycle — never constantly visible, never flashing.
// It is purely informational (pointer-events:none in CSS) and sits above the sticky
// Continue bar, so it can never block the CTA. Pauses while the cart drawer is open.
// This component owns no cart/checkout/pricing logic.

import { useState, useEffect, useRef } from 'react'
import { useCart } from '@/context/CartContext'

interface LiveActivityItem {
  text: string
}

interface Props {
  /** WooCommerce product id for this competition — used to fetch its real activity. */
  productId: number
}

/** Wait this long after mount before the first popup (ms). */
const FIRST_DELAY_MS = 5000
/** How long a single popup stays visible (ms). */
const SHOW_MS = 3500
/** Full cycle period (ms). Gap between popups = CYCLE_MS − SHOW_MS. */
const CYCLE_MS = 12000

/**
 * True when the age-verification gate is open. Its backdrop mounts into the DOM
 * only while visible, so this is a reliable point-in-time check. (The cart drawer
 * is handled separately/reactively via the cart `isOpen` state — it stays in the
 * DOM when closed, so we deliberately do NOT match on a generic aria-modal here.)
 */
function isBlockingModalOpen(): boolean {
  if (typeof document === 'undefined') return false
  return !!document.querySelector('.av-backdrop')
}

export default function LiveActivityToast({ productId }: Props) {
  const { isOpen: cartOpen } = useCart()
  const [items, setItems] = useState<LiveActivityItem[]>([])
  const [index, setIndex] = useState(0)
  const [shown, setShown] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  // ── Fetch real order activity on mount (renders nothing if none) ────────────
  useEffect(() => {
    if (!productId || productId < 1) return
    let alive = true
    fetch(`/api/live-activity?productId=${productId}`)
      .then(r => (r.ok ? r.json() : { items: [] }))
      .then((data: { items?: LiveActivityItem[] }) => {
        if (alive && Array.isArray(data.items) && data.items.length > 0) {
          setItems(data.items)
        }
      })
      .catch(() => { /* network error — render nothing */ })
    return () => { alive = false }
  }, [productId])

  // ── Calm show/hide cycle. Pauses (and hides) while the cart drawer is open. ──
  useEffect(() => {
    if (items.length === 0) return
    if (cartOpen) { setShown(false); return }

    let cancelled = false
    const push = (t: ReturnType<typeof setTimeout>) => timers.current.push(t)

    const showOnce = () => {
      if (cancelled) return
      // The age gate is open — skip this cycle and re-check next period instead
      // of popping up behind it. (Cart drawer is handled via the cartOpen effect dep.)
      if (isBlockingModalOpen()) {
        push(setTimeout(showOnce, CYCLE_MS))
        return
      }
      setShown(true)
      push(setTimeout(() => {
        if (cancelled) return
        setShown(false)
        push(setTimeout(() => {
          if (cancelled) return
          setIndex(i => (i + 1) % items.length)
          showOnce()
        }, CYCLE_MS - SHOW_MS))
      }, SHOW_MS))
    }

    push(setTimeout(showOnce, FIRST_DELAY_MS))

    return () => {
      cancelled = true
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
  }, [items.length, cartOpen])

  if (items.length === 0) return null

  const text = items[index]?.text ?? items[0].text

  return (
    <div
      className={`la-toast${shown ? ' is-shown' : ''}`}
      role="status"
      aria-live="polite"
      aria-hidden={!shown}
    >
      <span className="la-toast-dot" aria-hidden="true" />
      <span className="la-toast-text">{text}</span>
    </div>
  )
}
