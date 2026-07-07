'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Competition } from '@/lib/competition-data'
import { useMoney } from '@/context/StoreSettingsContext'
import TrustpilotProof from '@/components/TrustpilotProof'

interface Props {
  competition: Competition
}

const CONDITION_LABELS: Record<string, string> = {
  brand_new:       'Brand New · Full Box & Papers',
  new:             'Brand New · Full Box & Papers',
  unworn:          'Unworn · Full Box & Papers',
  pre_owned:       'Pre-Owned · Box & Papers',
  pre_owned_papers:'Pre-Owned · Papers Only',
  used:            'Pre-Owned',
}

function formatCondition(raw: string): string {
  return CONDITION_LABELS[raw.toLowerCase().replace(/[\s-]/g, '_')]
    ?? raw.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export default function WatchInfoPanel({ competition: c }: Props) {
  const money = useMoney()
  // Retail values are whole-currency figures — no decimals.
  const fmt = (n: number) => money(n, { decimals: 0 })

  // All WooCommerce gallery images (index 0 = featured product image).
  // Fallback to static image, then heroImage so single-image products work.
  const images: { src: string; alt: string }[] =
    c.galleryImages && c.galleryImages.length > 0
      ? c.galleryImages
      : c.image
        ? [{ src: c.image, alt: c.title }]
        : [{ src: c.heroImage, alt: c.title }]

  const total = images.length
  const [idx, setIdx] = useState(0)
  // Ref-based debounce — transition is handled entirely by CSS (no setState needed for fade)
  const busy = useRef(false)
  const dragRef = useRef<{ startX: number } | null>(null)

  const goTo = useCallback((next: number) => {
    if (busy.current || next === idx) return
    busy.current = true
    setIdx(next)
    setTimeout(() => { busy.current = false }, 520)
  }, [idx])

  const prev = useCallback(() => goTo((idx - 1 + total) % total), [goTo, idx, total])
  const next = useCallback(() => goTo((idx + 1) % total), [goTo, idx, total])

  const onPointerDown = (e: React.PointerEvent) => { dragRef.current = { startX: e.clientX } }
  const onPointerUp   = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    if (Math.abs(dx) > 40) dx < 0 ? next() : prev()
    dragRef.current = null
  }

  // Strip any leading "Ref." the WooCommerce field may already include, so the
  // displayed label is always a single clean "Ref. <number>".
  const refDisplay = (c.reference ?? '').replace(/^\s*ref\.?\s*/i, '')

  return (
    <div className="entry-left">

      {/* ── Mobile-only head: Trustpilot proof + clean product title above gallery ──
          Desktop hides this (the buy box carries the title + Trustpilot there). */}
      <div className="wip-mobile-head">
        <TrustpilotProof className="tp-proof--mobile" />
        <h1 className="wip-mobile-title">
          Win the <span className="wip-mobile-title-name">{c.title}</span>
        </h1>
      </div>

      <div className="watch-image-card">

        {/* ── Main gallery frame — fixed 1:1, PE3-style crossfade ── */}
        <div className="wip-main-frame">

          {/* All images pre-rendered as opacity layers — no layout shift on switch.
              First image = featured product cutout → contain (never crop the watch).
              Gallery images (index > 0) → cover, filling the whole frame edge-to-edge. */}
          {images.map((img, i) => {
            const isCutout = i === 0
            return (
              <div
                key={img.src}
                className={`wip-layer${i === idx ? ' wip-layer--active' : ''}`}
              >
                <div className={`wip-layer-inner${isCutout ? ' wip-layer-inner--contain' : ''}`}>
                  <Image
                    src={img.src}
                    alt={img.alt || c.title}
                    fill
                    style={{
                      objectFit: isCutout ? 'contain' : 'cover',
                      objectPosition: 'center',
                    }}
                    sizes="(max-width: 700px) 90vw, 340px"
                    priority={i === 0}
                    draggable={false}
                  />
                </div>
              </div>
            )
          })}

          {/* Transparent swipe surface on top of images, below arrows */}
          {total > 1 && (
            <div
              className="wip-swipe-surface"
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              style={{ cursor: 'grab', userSelect: 'none' }}
            />
          )}

          {/* Left / right arrows */}
          {total > 1 && (
            <>
              <button
                className="wip-carousel-btn wip-carousel-btn--prev"
                onClick={prev}
                aria-label="Previous image"
                type="button"
              >
                <svg width="8" height="14" viewBox="0 0 8 14" fill="none" aria-hidden="true">
                  <path d="M7 1L1 7l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                className="wip-carousel-btn wip-carousel-btn--next"
                onClick={next}
                aria-label="Next image"
                type="button"
              >
                <svg width="8" height="14" viewBox="0 0 8 14" fill="none" aria-hidden="true">
                  <path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </>
          )}
        </div>

        {/* ── Thumbnail strip — centered, only when multiple images ── */}
        {total > 1 && (
          <div className="wip-thumbs" role="list" aria-label="Product images">
            {images.map((img, i) => {
              const isCutout = i === 0
              return (
                <button
                  key={img.src}
                  role="listitem"
                  className={`wip-thumb${i === idx ? ' wip-thumb--active' : ''}`}
                  onClick={() => goTo(i)}
                  aria-label={`View image ${i + 1} of ${total}`}
                  aria-pressed={i === idx}
                  type="button"
                >
                  <Image
                    src={img.src}
                    alt={img.alt || c.title}
                    fill
                    style={{
                      objectFit: isCutout ? 'contain' : 'cover',
                      objectPosition: 'center',
                    }}
                    sizes="80px"
                  />
                </button>
              )
            })}
          </div>
        )}

        <div className="watch-image-caption">
          <div>
            <div className="wic-title">{c.title}</div>
            <div className="wic-ref">Ref. {refDisplay}</div>
          </div>
        </div>
      </div>

      <div className="watch-info-card">
        <div className="wic-section-title">Watch &amp; Competition Information</div>
        <div className="wi-row">
          <div className="wi-key">Retail Value</div>
          <div className="wi-val gold">{fmt(c.retailValue)}</div>
        </div>
        <div className="wi-row">
          <div className="wi-key">Entry Price</div>
          <div className="wi-val">
            {c.isFree || c.entryPrice === 0
              ? <span style={{ color: 'var(--green)', fontWeight: 600 }}>FREE</span>
              : `From ${money(c.entryPrice)}`
            }
          </div>
        </div>
        <div className="wi-row">
          <div className="wi-key">Total Entries</div>
          <div className="wi-val">{c.totalTickets} max</div>
        </div>
        <div className="wi-row">
          <div className="wi-key">Entries Remaining</div>
          <div className="wi-val green">{c.ticketsLeft} left</div>
        </div>
        <div className="wi-row">
          <div className="wi-key">Condition</div>
          <div className="wi-val">{c.condition ? formatCondition(c.condition) : 'Brand New · Full Box & Papers'}</div>
        </div>
        <div className="wi-row">
          <div className="wi-key">Draw Date</div>
          <div className="wi-val">{c.drawDateDisplay}</div>
        </div>
        <div className="wi-row">
          <div className="wi-key">Cash Alternative</div>
          <div className="wi-val">{fmt(c.cashAlternative)}</div>
        </div>
        <div className="wi-row">
          <div className="wi-key">Delivery</div>
          <div className="wi-val">Free · Fully Insured</div>
        </div>
      </div>
    </div>
  )
}
