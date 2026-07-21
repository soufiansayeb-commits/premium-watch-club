'use client'

// ReviewWall.tsx — the single, general WiserReview "wall of love" for Premium
// Watch Club. This is NOT tied to any product, SKU, watch or competition.
// The cards, copy, colours, fonts and layout all live inside WiserReview — we
// only mount the target container and load the embed. Do not restyle the cards.

import { useEffect, useRef } from 'react'
import Script from 'next/script'

const WIDGET_ID = '6a5f50fe5b7d132eab6d1352'
const WIDGET_SRC = `https://embed.wiserreview.com/embed/${WIDGET_ID}/widget.js`

// The embed is a run-once IIFE: on load it finds `[data-id]` and paints the
// wall, but exposes no public re-init hook. It sets a global the first time it
// runs. We flip this flag once <Script> has executed on the initial load; it
// lives at module scope so it survives client-side navigation but resets on a
// full page reload — exactly when next/script loads the embed fresh again.
let embedInitialised = false

export default function ReviewWall() {
  const containerRef = useRef<HTMLDivElement>(null)

  // The initial page load is owned by <Script> below. On a client-side
  // navigation back to the homepage the cached embed will not re-execute and
  // the freshly mounted container is empty, so we re-run the embed once to
  // repaint it. Guarding on `embedInitialised` + an empty container prevents a
  // second initialisation on first load and under React Strict Mode.
  useEffect(() => {
    const el = containerRef.current
    if (!el || !embedInitialised || el.childElementCount > 0) return

    const s = document.createElement('script')
    s.src = WIDGET_SRC
    s.async = true
    document.body.appendChild(s)
    return () => {
      s.remove()
    }
  }, [])

  return (
    <section id="reviews" className="review-wall-section" aria-label="Customer reviews">
      {/* Exact WiserReview embed container — attributes must match the embed code. */}
      <div
        ref={containerRef}
        data-type="review_wall"
        data-id={WIDGET_ID}
        className="wiser_review_wall"
        suppressHydrationWarning
      />
      <Script
        src={WIDGET_SRC}
        strategy="afterInteractive"
        onReady={() => {
          embedInitialised = true
        }}
      />
    </section>
  )
}
