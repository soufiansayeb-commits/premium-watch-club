'use client'

// components/LiveActivity.tsx
// Shows real anonymised WooCommerce order activity for a specific product.
// Fetches from /api/live-activity (server-side — WooCommerce keys never exposed).
// Renders nothing if there are no real matching orders.
// Shows one item at a time, cycling with a smooth fade transition.

import { useState, useEffect } from 'react'

interface LiveActivityItem {
  city:     string | null
  quantity: number
  text:     string
}

interface Props {
  productId: number
}

/** Interval between item changes in milliseconds. */
const CYCLE_MS   = 3500
/** Fade-out duration in milliseconds (must match CSS transition). */
const FADE_MS    = 350

export default function LiveActivity({ productId }: Props) {
  const [items,   setItems]   = useState<LiveActivityItem[]>([])
  const [index,   setIndex]   = useState(0)
  const [visible, setVisible] = useState(true)
  const [ready,   setReady]   = useState(false)

  // ── Fetch real order data on mount ────────────────────────────────────────
  useEffect(() => {
    if (!productId || productId < 1) {
      setReady(true)
      return
    }

    fetch(`/api/live-activity?productId=${productId}`)
      .then(r => r.ok ? r.json() : { items: [] })
      .then((data: { items?: LiveActivityItem[] }) => {
        if (Array.isArray(data.items) && data.items.length > 0) {
          setItems(data.items)
        }
      })
      .catch(() => { /* network error — render nothing */ })
      .finally(() => setReady(true))
  }, [productId])

  // ── Cycle through items with fade transition ───────────────────────────────
  useEffect(() => {
    if (items.length <= 1) return // 0 items → nothing shown; 1 item → static display

    const interval = setInterval(() => {
      // 1. Fade out
      setVisible(false)
      // 2. After fade completes, advance index and fade back in
      setTimeout(() => {
        setIndex(prev => (prev + 1) % items.length)
        setVisible(true)
      }, FADE_MS)
    }, CYCLE_MS)

    return () => clearInterval(interval)
  }, [items.length])

  // ── Render nothing until data is ready or if no matching orders ───────────
  if (!ready || items.length === 0) return null

  return (
    <div className="act-ticker" aria-live="polite" aria-atomic="true">
      <div className="act-ticker-badge">
        <span className="act-ticker-dot" aria-hidden="true" />
        <span className="act-ticker-label">LIVE ACTIVITY</span>
      </div>

      <div
        className="act-live-text"
        style={{
          opacity:    visible ? 1 : 0,
          transform:  visible ? 'translateY(0)' : 'translateY(3px)',
          transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
        }}
      >
        {items[index].text}
      </div>
    </div>
  )
}
