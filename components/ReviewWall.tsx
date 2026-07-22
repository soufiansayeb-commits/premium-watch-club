'use client'

// ReviewWall.tsx — the single, general WiserReview "wall of love" for Premium
// Watch Club. This is NOT tied to any product, SKU, watch or competition.
// The cards, copy, colours, fonts and layout all live inside WiserReview — we
// only mount the target container and load the embed. Do not restyle the cards.

import { useEffect, useRef } from 'react'
import Script from 'next/script'

const WIDGET_ID = '6a5f50fe5b7d132eab6d1352'
const WIDGET_SRC = `https://embed.wiserreview.com/embed/${WIDGET_ID}/widget.js`

// WiserReview's embed is a run-once IIFE with NO public re-init hook and NO
// guard against running twice. Each execution attaches its own document-level
// click listeners (event-delegated — they outlive the <script> element), starts
// a resize interval, and paints the container lazily via IntersectionObserver.
// Running it twice therefore duplicates those handlers (this is what left
// "Load more" spinning) and races two paints on one container (which could wipe
// the section on a hard refresh). So the script MUST load exactly once.
//
// To keep the wall working after a client-side navigation away and back —
// without re-executing the embed — we stash the painted widget DOM on unmount
// and re-attach it on the next mount. This is safe because the embed's click
// handlers are delegated on `document` (they work on the re-attached nodes) and
// its resize loop no-ops when the nodes are detached.
let paintedWidget: DocumentFragment | null = null

export default function ReviewWall() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Client-side nav back: restore a widget painted on a previous visit rather
    // than re-running the embed (the initial load is owned by <Script> below).
    if (paintedWidget && el.childElementCount === 0) {
      el.appendChild(paintedWidget)
      paintedWidget = null
    }

    return () => {
      // Nav away: keep the painted widget so we can re-attach it later.
      if (el.childElementCount > 0) {
        const frag = document.createDocumentFragment()
        while (el.firstChild) frag.appendChild(el.firstChild)
        paintedWidget = frag
      }
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
      {/* Load the embed once for the document's lifetime — next/script dedupes by
          id/src, so it never runs twice (incl. React Strict Mode). The container
          above is in the server-rendered HTML, so it exists before this runs. */}
      <Script id="wiser-review-wall" src={WIDGET_SRC} strategy="afterInteractive" />
    </section>
  )
}
