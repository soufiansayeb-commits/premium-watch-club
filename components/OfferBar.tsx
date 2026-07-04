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
      <style suppressHydrationWarning>{`
        /* ═══════════ MOBILE-FIRST — compact, centred sale strip ═══════════ */
        .offbar {
          display: flex; align-items: center; justify-content: center;
          gap: clamp(16px, 6vw, 30px);
          padding: 8px 16px;
          text-decoration: none; color: var(--ob-on);
          overflow: hidden;
          background:
            linear-gradient(90deg,
              color-mix(in srgb, var(--ob-bg) 100%, #000 14%) 0%,
              var(--ob-bg) 50%,
              color-mix(in srgb, var(--ob-bg) 100%, #000 14%) 100%);
          border-bottom: 2px solid var(--ob-accent);
          transition: filter 0.2s ease;
        }
        .offbar:active { filter: brightness(1.08); }
        .offbar:focus-visible { outline: 2px solid var(--ob-accent); outline-offset: -3px; }

        /* Copy — grid column sized to the title so the subtitle wraps under it
           and can never be wider than the title (mobile). */
        .offbar-copy {
          display: grid; grid-template-columns: min-content;
          justify-items: center; text-align: center;
          max-width: 72vw;
        }
        .offbar-line1 {
          font-family: var(--font-sans);
          font-size: 14px; font-weight: 900; line-height: 1.1;
          letter-spacing: 0.06em; text-transform: uppercase; color: var(--ob-on);
          white-space: nowrap;
        }
        .offbar-line2 {
          font-family: var(--font-sans);
          font-size: 9.5px; font-weight: 500; letter-spacing: 0.02em; line-height: 1.22;
          color: color-mix(in srgb, var(--ob-on) 72%, transparent);
          white-space: normal; overflow-wrap: break-word;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
          margin-top: 1px;
        }

        /* Hairline dividers between groups — desktop only */
        .offbar-div { display: none; }

        /* Countdown — numbers row + labels row */
        .offbar-timer { display: flex; align-items: flex-start; gap: 5px; flex-shrink: 0; }
        .offbar-unit { display: flex; flex-direction: column; align-items: center; line-height: 1; }
        .offbar-num {
          font-family: var(--font-sans); font-variant-numeric: tabular-nums;
          font-size: 16px; font-weight: 800; color: var(--ob-on); line-height: 1;
        }
        .offbar-lab {
          font-family: var(--font-sans);
          font-size: 7px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
          color: color-mix(in srgb, var(--ob-on) 66%, transparent); margin-top: 3px;
        }
        .offbar-colon {
          font-size: 15px; font-weight: 700; line-height: 1;
          color: color-mix(in srgb, var(--ob-accent) 85%, var(--ob-on));
          align-self: flex-start;
        }

        /* CTA — desktop only */
        .offbar-cta { display: none; }

        /* ═══════════ DESKTOP — centred cluster, title+subtitle inline, dividers ═══════════ */
        @media (min-width: 640px) {
          .offbar { gap: clamp(16px, 2.4vw, 28px); padding: 7px clamp(20px, 4vw, 44px); }

          /* title and subtitle side by side (keeps the bar short) */
          .offbar-copy {
            display: flex; flex-direction: row; align-items: baseline; gap: 10px;
            justify-items: initial; text-align: left; max-width: none;
          }
          .offbar-line1 { font-size: clamp(15px, 1.5vw, 17px); white-space: nowrap; }
          .offbar-line2 {
            display: block; -webkit-line-clamp: unset; overflow: visible; margin-top: 0;
            font-size: clamp(10px, 1vw, 12px); white-space: nowrap;
          }

          .offbar-div {
            display: block; align-self: center; flex-shrink: 0;
            width: 1px; height: 28px;
            background: linear-gradient(180deg,
              transparent 0%,
              color-mix(in srgb, var(--ob-accent) 55%, transparent) 50%,
              transparent 100%);
          }

          .offbar-timer { gap: 6px; }
          .offbar-num { font-size: clamp(17px, 1.8vw, 20px); }
          .offbar-colon { font-size: clamp(15px, 1.6vw, 18px); }
          .offbar-lab { font-size: 8px; }

          .offbar-cta {
            display: inline-flex; align-items: center; gap: 7px; flex-shrink: 0;
            font-family: var(--font-sans);
            font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
            color: var(--ob-on-accent); background: var(--ob-accent);
            padding: 8px 18px; border-radius: 30px; white-space: nowrap;
            box-shadow: 0 4px 14px color-mix(in srgb, var(--ob-accent) 36%, transparent);
            transition: filter 0.16s ease;
          }
          .offbar-cta:hover { filter: brightness(1.06); }
        }

        @media (prefers-reduced-motion: reduce) {
          .offbar { transition: none; }
        }
      `}</style>

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
