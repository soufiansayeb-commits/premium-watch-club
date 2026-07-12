'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { ActiveOffer } from '@/lib/offer'

interface Props {
  offer: ActiveOffer | null
  /** Resolved CTA target — same destination as the offer section button. */
  ctaHref: string
}

/** Split a millisecond remainder into d/h/m/s parts. */
function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  return {
    days:    Math.floor(total / 86400),
    hours:   Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Parse #rgb / #rrggbb → {r,g,b}, or null. */
function parseHex(hex?: string | null): { r: number; g: number; b: number } | null {
  if (!hex) return null
  let h = hex.trim().replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return null
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) }
}

/** Pick a readable ink colour for a given background — works for any ACF campaign colour. */
function readableOn(bg?: string | null): string {
  const c = parseHex(bg)
  if (!c) return '#FFF8EC'
  const luminance = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255
  return luminance > 0.62 ? '#1A1208' : '#FFF8EC'
}

/**
 * Ryze-inspired promotional countdown bar, directly under the sticky nav.
 *
 * Layout:
 *  • Mobile — a compact centred cluster of [copy] · [countdown]; CTA hidden.
 *    The copy is a grid column sized to the title (min-content) so the subtitle
 *    wraps symmetrically UNDER the title and is never wider than it.
 *  • Desktop — a centred cluster with hairline dividers between three groups:
 *    [ title + subtitle side by side ] │ [ countdown ] │ [ CTA ].
 *    Keeping the copy on one line keeps the bar short.
 *
 * Strictly ACF-driven — NO fallback copy. Empty offer_bar_text / offer_bar_subtext
 * render nothing; the timer shows only when enabled with a valid, unexpired date.
 *
 * Hydration-safe: live digits render only after mount.
 */
export default function OfferBar({ offer, ctaHref }: Props) {
  const bar = offer?.bar
  const endIso = bar?.timer_enabled ? bar?.timer_end_date ?? null : null

  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (!endIso) return
    const end = new Date(endIso).getTime()
    if (isNaN(end)) return
    const tick = () => setRemaining(Math.max(0, end - Date.now()))
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [endIso])

  // Visibility gate.
  if (!offer || !bar?.enabled) return null

  // ── Copy: strictly ACF, no fallbacks. Empty means empty. ───────────────────
  const line1 = bar.text || null
  const line2 = bar.subtext || null
  const ctaText = offer.cta_text || 'Enter now'   // CTA label default (desktop button only)
  const hasCopy = !!(line1 || line2)

  // ── Colours: bar-specific ACF → offer ACF → safe PWC defaults ──────────────
  const barBg    = bar.primary_color || offer.colors.background || '#0A1F44'
  const accent   = bar.hover_color   || offer.colors.primary    || '#C5A065'
  const onBar     = readableOn(barBg)
  const onAccent  = readableOn(accent)

  // Timer shows only when enabled, dated, and not expired.
  const hasEnd    = !!endIso
  const showTimer = hasEnd && remaining !== null && remaining > 0
  const t = showTimer ? parts(remaining!) : null

  // Nothing to show at all → don't render an empty strip.
  if (!hasCopy && !hasEnd) return null

  const units = t
    ? ([
        { label: 'Days', value: pad(t.days) },
        { label: 'Hrs',  value: pad(t.hours) },
        { label: 'Min',  value: pad(t.minutes) },
        { label: 'Sec',  value: pad(t.seconds) },
      ] as const)
    : []

  return (
    <Link
      href={ctaHref}
      className="offbar"
      aria-label={`${line1 || 'Current offer'}${line2 ? ` — ${line2}` : ''}`}
      style={{
        '--ob-bg': barBg,
        '--ob-accent': accent,
        '--ob-on': onBar,
        '--ob-on-accent': onAccent,
      } as React.CSSProperties}
    >
      {hasCopy && (
        <span className="offbar-copy">
          {line1 && <span className="offbar-line1">{line1}</span>}
          {line2 && <span className="offbar-line2">{line2}</span>}
        </span>
      )}

      {hasCopy && showTimer && <span className="offbar-div" aria-hidden="true" />}

      {showTimer && (
        <span className="offbar-timer" role="timer" aria-label="Offer ends in">
          {units.map((u, i) => (
            <span key={u.label} style={{ display: 'contents' }}>
              <span className="offbar-unit">
                <span className="offbar-num">{u.value}</span>
                <span className="offbar-lab">{u.label}</span>
              </span>
              {i < units.length - 1 && <span className="offbar-colon" aria-hidden="true">:</span>}
            </span>
          ))}
        </span>
      )}

      {(hasCopy || showTimer) && <span className="offbar-div" aria-hidden="true" />}

      <span className="offbar-cta">
        {ctaText}
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </Link>
  )
}
