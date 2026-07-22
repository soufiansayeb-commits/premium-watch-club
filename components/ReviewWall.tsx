'use client'

// ReviewWall.tsx — the single, general WiserReview "wall of love" for Premium
// Watch Club. This is NOT tied to any product, SKU, watch or competition.
// The cards, copy, colours, fonts and layout all live inside WiserReview — we
// only host the target container and load the embed. Do not restyle the cards.

import { useEffect, useRef } from 'react'

const WIDGET_ID = '6a5f50fe5b7d132eab6d1352'
const WIDGET_SRC = `https://embed.wiserreview.com/embed/${WIDGET_ID}/widget.js`
const SCRIPT_MARK = 'data-wiser-embed'

// The embed paints by setting the container's innerHTML when the container
// scrolls into view (its own IntersectionObserver). It auto-runs once on
// execution and exposes NO re-init API. React unmounts our container on a
// client-side route change, so we stash the painted widget DOM here and
// re-attach it on the next mount — that avoids re-executing the embed, which
// would duplicate its document-level listeners and break "Load more".
let paintedWidget: DocumentFragment | null = null

// Detach the painted widget so it can be re-attached after a client-side nav.
function stash(el: HTMLElement) {
  if (el.childElementCount > 0) {
    const frag = document.createDocumentFragment()
    while (el.firstChild) frag.appendChild(el.firstChild)
    paintedWidget = frag
  }
}

export default function ReviewWall() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // A) Client-side nav back — restore the widget painted on a previous visit
    //    rather than re-running the embed (idempotent: only if empty).
    if (paintedWidget) {
      if (el.childElementCount === 0) el.appendChild(paintedWidget)
      paintedWidget = null
      return () => stash(el)
    }

    // B) First load / hard refresh — load the embed exactly once, and only HERE.
    //    Loading inside the effect guarantees all three preconditions are met
    //    before the widget can paint: (a) the component is mounted, (b) its
    //    container exists, and (c) React has finished hydrating + committing it.
    //    The embed paints by replacing the container's innerHTML; doing that
    //    only AFTER hydration means React can no longer reconcile the injected
    //    children away — which is exactly what made the section vanish on a
    //    refresh while scrolled to it (the container was in view, so the embed
    //    painted during the hydration window). The component never re-renders,
    //    so the painted DOM then stays put.
    if (!document.querySelector(`script[${SCRIPT_MARK}]`)) {
      const s = document.createElement('script')
      s.src = WIDGET_SRC
      s.async = true
      s.setAttribute(SCRIPT_MARK, '')
      document.body.appendChild(s)
    }

    return () => stash(el)
  }, [])

  return (
    <section id="reviews" className="review-wall-section" aria-label="Customer reviews">
      {/* Exact WiserReview embed container — attributes must match the embed code.
          Rendered unconditionally + server-side; React owns none of its children. */}
      <div
        ref={containerRef}
        data-type="review_wall"
        data-id={WIDGET_ID}
        className="wiser_review_wall"
        suppressHydrationWarning
      />
    </section>
  )
}
