"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Image from "next/image"

const winners = [
  {
    name: "Alexander",
    prize: "Rolex GMT Batman",
    testimonial: "Winning felt unreal. The process was clear, and the watch arrived exactly as promised.",
    image: "/assets/images/winners/alexander.png",
  },
  {
    name: "Patrick",
    prize: "John Mayer Daytona",
    testimonial: "Premium Watch Club made the whole experience feel transparent and exciting from start to finish.",
    image: "/assets/images/winners/patrick.png",
  },
  {
    name: "Dan",
    prize: "Rolex GMT Pepsi",
    testimonial: "I joined for the thrill and ended up with a dream watch. Everything felt professional and verified.",
    image: "/assets/images/winners/dan.png",
  },
]

const N = winners.length
// Three copies for infinite loop: [0,1,2, 0,1,2, 0,1,2]
const TRACK = [...winners, ...winners, ...winners]
const GAP = 24 // px gap between cards
const START = N  // start in middle copy (pos 3 = winner 0)

export default function WinnersSection() {
  const [pos, setPos] = useState(START)
  const [enabled, setEnabled] = useState(true)
  const [navigating, setNavigating] = useState(false)
  const [cardW, setCardW] = useState(0)
  const [mobile, setMobile] = useState(false)

  const viewportRef = useRef<HTMLDivElement>(null)

  const measure = useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    const vw = el.offsetWidth
    const isMob = vw < 700
    setMobile(isMob)
    setCardW(isMob ? vw : Math.floor((vw - 2 * GAP) / 3))
  }, [])

  useEffect(() => {
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [measure])

  // Re-enable transition one frame after a silent teleport
  useEffect(() => {
    if (!enabled) {
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEnabled(true))
      })
      return () => cancelAnimationFrame(raf)
    }
  }, [enabled])

  function navigate(dir: 1 | -1) {
    if (navigating) return
    setNavigating(true)
    setEnabled(true)
    setPos((p) => p + dir)
  }

  function handleTransitionEnd(e: React.TransitionEvent<HTMLDivElement>) {
    if (e.propertyName !== "transform") return
    setPos((p) => {
      if (p >= 2 * N) { setEnabled(false); return p - N }
      if (p < N)      { setEnabled(false); return p + N }
      return p
    })
    setNavigating(false)
  }

  // Desktop: show 3 cards → leftmost visible = pos-1
  // Mobile:  show 1 card  → visible = pos
  const offset = mobile ? 0 : 1
  const step   = cardW + GAP
  const tx     = cardW > 0 ? -(pos - offset) * step : 0

  const activeWinner = pos % N

  return (
    <section id="winners" className="winners-section">
      <div className="container">
        <div className="section-header reveal">
          <div className="section-eyebrow">Hall of Honour</div>
          <h2 className="section-headline">What our winners say</h2>
          <p className="section-sub">
            Every draw is live. Every winner is verified. Every watch is real — sourced from authorised dealers.
          </p>
        </div>
      </div>

      <div className="winners-outer">
        <button
          className="winners-nav-arrow wna-left"
          onClick={() => navigate(-1)}
          aria-label="Previous winner"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="winners-viewport" ref={viewportRef}>
          <div
            className="winners-track"
            style={{
              transform: `translateX(${tx}px)`,
              transition: enabled ? "transform 0.46s cubic-bezier(0.4,0,0.2,1)" : "none",
            }}
            onTransitionEnd={handleTransitionEnd}
          >
            {TRACK.map((winner, i) => {
              const isCenter = i === pos
              return (
                <div
                  key={i}
                  className={`wsc${isCenter ? " wsc-center" : ""}`}
                  style={{ width: cardW > 0 ? cardW : undefined, flexShrink: 0 }}
                >
                  <div className="wsc-photo-wrap">
                    <Image
                      src={winner.image}
                      alt={`${winner.name} — Winner of the ${winner.prize}`}
                      width={160}
                      height={160}
                      className="wsc-photo"
                    />
                  </div>
                  <p className="wsc-label">Winner of the</p>
                  <p className="wsc-prize">{winner.prize}</p>
                  <div className="wsc-rule" />
                  <p className="wsc-name">{winner.name}</p>
                  <p className="wsc-quote">&ldquo;{winner.testimonial}&rdquo;</p>
                </div>
              )
            })}
          </div>
        </div>

        <button
          className="winners-nav-arrow wna-right"
          onClick={() => navigate(1)}
          aria-label="Next winner"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="winners-dots">
        {winners.map((_, i) => (
          <button
            key={i}
            className={`wnd-dot${activeWinner === i ? " wnd-dot-active" : ""}`}
            onClick={() => {
              if (navigating) return
              const target = N + i
              if (target === pos) return
              setEnabled(true)
              setNavigating(true)
              setPos(target)
              setTimeout(() => setNavigating(false), 480)
            }}
            aria-label={`Go to winner ${i + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
