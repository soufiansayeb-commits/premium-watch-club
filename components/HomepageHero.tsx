'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Competition } from '@/lib/competition-data'
import { isSoldOut } from '@/lib/competition-status'
import { useMoney } from '@/context/StoreSettingsContext'
import LiveActivity from '@/components/LiveActivity'

interface Props {
  competition: Competition
  /** Rendered inside the hero section, between the 3-col grid and the beige strip. */
  switcherSlot?: React.ReactNode
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/**
 * Compute the countdown parts from an authoritative draw timestamp.
 * Used both to seed initial state (so the server renders a meaningful, real
 * countdown instead of a false 00:00:00:00) and could be reused by the ticker.
 * Returns padded strings + a `closed` flag. Null/invalid date → neutral zeros.
 */
function remainingFrom(ts: number | null) {
  if (ts === null) return { closed: false, d: '00', h: '00', m: '00', s: '00' }
  const diff = ts - Date.now()
  if (diff <= 0) return { closed: true, d: '00', h: '00', m: '00', s: '00' }
  return {
    closed: false,
    d: pad(Math.floor(diff / 86400000)),
    h: pad(Math.floor((diff % 86400000) / 3600000)),
    m: pad(Math.floor((diff % 3600000) / 60000)),
    s: pad(Math.floor((diff % 60000) / 1000)),
  }
}

export default function HomepageHero({ competition, switcherSlot }: Props) {
  const c = competition
  const fmt = useMoney()
  const soldOut    = isSoldOut(c)
  const isComingSoon = c.competitionStatus === 'Coming Soon'

  const drawTimestamp = useMemo(() => {
    const ts = new Date(c.drawDate).getTime()
    return isNaN(ts) ? null : ts
  }, [c.drawDate])

  const maxOdds = `1:${c.totalTickets}`

  // Seed from the authoritative draw date so the server-rendered HTML shows the
  // real remaining time (not a false zero countdown). The client re-computes on
  // mount via the ticker below; the digits are suppressHydrationWarning'd so the
  // sub-second server/client difference never triggers a hydration mismatch.
  const [time, setTime]           = useState(() => {
    const r = remainingFrom(drawTimestamp)
    return { d: r.d, h: r.h, m: r.m, s: r.s }
  })
  const [closed, setClosed]       = useState(() => remainingFrom(drawTimestamp).closed)
  const [progVisible, setProgVisible] = useState(false)

  useEffect(() => {
    if (drawTimestamp === null) return
    const ts = drawTimestamp
    function tick() {
      const diff = ts - Date.now()
      if (diff <= 0) {
        setClosed(true)
        setTime({ d: '00', h: '00', m: '00', s: '00' })
        return
      }
      setClosed(false)
      setTime({
        d: pad(Math.floor(diff / 86400000)),
        h: pad(Math.floor((diff % 86400000) / 3600000)),
        m: pad(Math.floor((diff % 3600000) / 60000)),
        s: pad(Math.floor((diff % 60000) / 1000)),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [drawTimestamp])

  useEffect(() => {
    const t = setTimeout(() => setProgVisible(true), 500)
    return () => clearTimeout(t)
  }, [])

  return (
    <section
      id="hero"
      style={c.heroBackgroundImage
        ? { backgroundImage: `url('${c.heroBackgroundImage}')` }
        : undefined
      }
    >
      {/* Layered cinematic backgrounds */}
      <div className="h2-bg-gradient" />
      <div className="h2-bg-vignette" />
      <div className="h2-topline" />
      <div className="h2-watch-ambient" />

      <div className="h2-inner">

        {/* ── COL 1: LEFT — all text content ── */}
        <div className="h2-left">

          <div className="h2-eyebrow">
            <span className="h2-pulse-dot" />
            <span>LIVE COMPETITION</span>
            <span className="h2-eyebrow-sep">·</span>
            <span>ENTRIES CLOSE IN</span>
          </div>

          {closed ? (
            <div className="h2-countdown h2-countdown-closed">
              <span className="h2-closed-label">Competition Closed</span>
            </div>
          ) : (
            <div className="h2-countdown">
              <div className="h2-cd-block">
                <span className="h2-cd-num" suppressHydrationWarning>{time.d}</span>
                <span className="h2-cd-lbl">DAYS</span>
              </div>
              <span className="h2-cd-sep" aria-hidden="true">:</span>
              <div className="h2-cd-block">
                <span className="h2-cd-num" suppressHydrationWarning>{time.h}</span>
                <span className="h2-cd-lbl">HRS</span>
              </div>
              <span className="h2-cd-sep" aria-hidden="true">:</span>
              <div className="h2-cd-block">
                <span className="h2-cd-num" suppressHydrationWarning>{time.m}</span>
                <span className="h2-cd-lbl">MIN</span>
              </div>
              <span className="h2-cd-sep" aria-hidden="true">:</span>
              <div className="h2-cd-block">
                <span className="h2-cd-num" suppressHydrationWarning>{time.s}</span>
                <span className="h2-cd-lbl">SEC</span>
              </div>
            </div>
          )}

          <div className="h2-progress">
            <div className="h2-prog-meta">
              <div className="h2-prog-live">
                <span className="h2-prog-live-dot" />
                <span className="h2-prog-label">
                  {c.soldPercentage}% SOLD, {c.ticketsLeft} TICKETS LEFT
                </span>
              </div>
            </div>
            <div className="h2-prog-track">
              <div
                className="h2-prog-fill"
                style={{ width: progVisible ? `${c.soldPercentage}%` : '0%' }}
              />
            </div>
          </div>

          <h1 className="h2-headline">
            <span className="h2-headline-prefix">Win the </span>{c.title}
          </h1>

          {isComingSoon ? (
            <button
              disabled
              aria-disabled="true"
              className="h2-cta-btn"
              style={{
                background: 'rgba(18,12,4,0.92)',
                border: '1px solid rgba(212,175,55,0.22)',
                color: 'rgba(212,175,55,0.45)',
                cursor: 'not-allowed',
                pointerEvents: 'none',
                letterSpacing: '0.18em',
              }}
            >
              <span>COMING SOON</span>
            </button>
          ) : (soldOut || closed) ? (
            <button
              disabled
              aria-disabled="true"
              className="h2-cta-btn"
              style={{
                background: 'rgba(18,12,4,0.92)',
                border: '1px solid rgba(212,175,55,0.22)',
                color: 'rgba(212,175,55,0.45)',
                cursor: 'not-allowed',
                pointerEvents: 'none',
                letterSpacing: '0.18em',
              }}
            >
              <span>{closed ? 'COMPETITION CLOSED' : 'SOLD OUT'}</span>
            </button>
          ) : (
            <Link href={c.ctaLink} className="h2-cta-btn">
              <span>SECURE YOUR ENTRY</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          )}

          <div className="h2-meta-row">
            <span className="h2-price">
              {c.isFree || c.entryPrice === 0
                ? <strong style={{ color: 'var(--green)' }}>FREE</strong>
                : <><strong>{fmt(c.entryPrice)}</strong> per entry</>
              }
            </span>
          </div>

          <LiveActivity key={c.wooProductId} productId={c.wooProductId} />

        </div>

        {/* ── COL 2: CENTER — watch only ── */}
        <div className="h2-center">
          <div className="h2-watch-stage">
            <div className="h2-watch-glow" />
            <Image
              src={c.heroImage}
              alt={c.title}
              className="h2-watch-img"
              width={800}
              height={800}
              style={{ width: '100%', height: 'auto' }}
              sizes="(max-width: 900px) 320px, 480px"
              priority
              draggable={false}
            />
          </div>
        </div>

        {/* ── COL 3: RIGHT — details card ── */}
        <div className="h2-cards-col">
          <div className="h2-details-card">
            <div className="h2-card-eyebrow">COMPETITION DETAILS</div>
            <div className="h2-card-rows">
              <div className="h2-card-row">
                <span className="h2-card-label">Entry Price</span>
                <span className="h2-card-val">
                  {c.isFree || c.entryPrice === 0
                    ? <span style={{ color: 'var(--green)', fontWeight: 600 }}>FREE</span>
                    : fmt(c.entryPrice)
                  }
                </span>
              </div>
              <div className="h2-card-divider" />
              <div className="h2-card-row">
                <span className="h2-card-label">Total Entries</span>
                <span className="h2-card-val">{c.totalTickets}</span>
              </div>
              <div className="h2-card-divider" />
              <div className="h2-card-row">
                <span className="h2-card-label">Remaining</span>
                <span className="h2-card-val h2-card-gold">{c.ticketsLeft}</span>
              </div>
              <div className="h2-card-divider" />
              <div className="h2-card-row">
                <span className="h2-card-label">Max Odds</span>
                <span className="h2-card-val">{maxOdds}</span>
              </div>
              <div className="h2-card-divider" />
              <div className="h2-card-row">
                <span className="h2-card-label">Draw Date</span>
                <span className="h2-card-val">{c.drawDateDisplay.split(',')[0] || c.drawDateDisplay}</span>
              </div>
            </div>
            {isComingSoon ? (
              <button
                disabled
                aria-disabled="true"
                className="h2-card-cta"
                style={{
                  background: 'rgba(18,12,4,0.92)',
                  border: '1px solid rgba(212,175,55,0.22)',
                  color: 'rgba(212,175,55,0.45)',
                  cursor: 'not-allowed',
                  pointerEvents: 'none',
                  letterSpacing: '0.18em',
                  textAlign: 'center',
                  display: 'block',
                }}
              >
                COMING SOON
              </button>
            ) : (soldOut || closed) ? (
              <button
                disabled
                aria-disabled="true"
                className="h2-card-cta"
                style={{
                  background: 'rgba(18,12,4,0.92)',
                  border: '1px solid rgba(212,175,55,0.22)',
                  color: 'rgba(212,175,55,0.45)',
                  cursor: 'not-allowed',
                  pointerEvents: 'none',
                  letterSpacing: '0.18em',
                  textAlign: 'center',
                  display: 'block',
                }}
              >
                {closed ? 'COMPETITION CLOSED' : 'SOLD OUT'}
              </button>
            ) : (
              <Link href={c.ctaLink} className="h2-card-cta">
                ENTER NOW
              </Link>
            )}
          </div>
        </div>

        {/* Mobile-only ticker — below competition details */}
        <div className="act-ticker-mobile-wrap">
          <LiveActivity key={`mob-${c.wooProductId}`} productId={c.wooProductId} />
        </div>

      </div>

      {/* ════════════════════════════════════════════════════════
          MOBILE HERO — product-first, conversion-first.
          Hidden on desktop (≥681px) via CSS; the .h2-inner grid above
          is hidden on mobile. Reuses the SAME dynamic competition data
          (c.*), countdown state (time/closed) and sold-out logic, so
          nothing here is hardcoded and both views stay in sync.
      ════════════════════════════════════════════════════════ */}
      <div className="h2-mobile">

        {/* Top eyebrow — only for sold-out and coming-soon states */}
        {(soldOut || isComingSoon || closed) && (
          <div className="h2m-eyebrow">
            <span>{isComingSoon ? 'COMING SOON · NOTIFY ME' : closed ? 'ENTRIES CLOSED' : 'SOLD OUT'}</span>
          </div>
        )}

        {/* 1 — Watch name */}
        <h1 className="h2m-title">Win the <span className="h2m-title-name">{c.title}</span></h1>

        {/* 2 — Short explainer */}
        <p className="h2m-explainer">
          A skill-based watch competition. Answer one question for your chance to win.
        </p>

        {/* 3 — Watch image */}
        <div className="h2m-watch">
          <div className="h2m-watch-glow" aria-hidden="true" />
          <Image
            src={c.heroImage}
            alt={c.title}
            className="h2m-watch-img"
            width={800}
            height={800}
            sizes="(max-width: 680px) 80vw, 320px"
            priority
            draggable={false}
          />
        </div>

        {/* 4 — CTA + price */}
        <div className="h2m-cta-wrap">
          {isComingSoon ? (
            <button disabled aria-disabled="true" className="h2m-cta h2m-cta--disabled">
              COMING SOON
            </button>
          ) : (soldOut || closed) ? (
            <button disabled aria-disabled="true" className="h2m-cta h2m-cta--disabled">
              {closed ? 'COMPETITION CLOSED' : 'SOLD OUT'}
            </button>
          ) : (
            <Link href={c.ctaLink} className="h2m-cta">
              <span>SECURE YOUR ENTRY</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          )}
          <div className="h2m-price">
            {c.isFree || c.entryPrice === 0
              ? <><strong style={{ color: 'var(--green)' }}>FREE</strong> entry</>
              : <>From <strong>{fmt(c.entryPrice)}</strong> per entry</>
            }
          </div>
        </div>

        {/* 5 — Tickets left / progress */}
        {!isComingSoon && (
          <div className="h2m-progress">
            <div className="h2m-prog-label">
              <span className="h2m-prog-live">
                <span className="h2m-prog-dot" aria-hidden="true" />
                {c.soldPercentage}% sold
              </span>
              <span className="h2m-prog-left">{c.ticketsLeft} tickets left</span>
            </div>
            <div className="h2m-prog-track">
              <div
                className="h2m-prog-fill"
                style={{ width: progVisible ? `${c.soldPercentage}%` : '0%' }}
              />
            </div>
          </div>
        )}

        {/* 6 — Live label directly above the timer (live state only) */}
        {!isComingSoon && !soldOut && !closed && (
          <div className="h2m-eyebrow h2m-eyebrow--timer">
            <span className="h2m-dot" aria-hidden="true" />
            <span>LIVE COMPETITION · ENTRIES CLOSE IN</span>
          </div>
        )}

        {/* 7 — Countdown */}
        {!isComingSoon && (
          closed ? (
            <div className="h2m-countdown h2m-countdown--closed">Competition Closed</div>
          ) : (
            <div className="h2m-countdown" aria-label="Time remaining">
              <div className="h2m-cd-block"><span className="h2m-cd-num" suppressHydrationWarning>{time.d}</span><span className="h2m-cd-lbl">Days</span></div>
              <div className="h2m-cd-block"><span className="h2m-cd-num" suppressHydrationWarning>{time.h}</span><span className="h2m-cd-lbl">Hrs</span></div>
              <div className="h2m-cd-block"><span className="h2m-cd-num" suppressHydrationWarning>{time.m}</span><span className="h2m-cd-lbl">Min</span></div>
              <div className="h2m-cd-block"><span className="h2m-cd-num" suppressHydrationWarning>{time.s}</span><span className="h2m-cd-lbl">Sec</span></div>
            </div>
          )
        )}

        {/* 8 — Trust line */}
        <div className="h2m-trust">
          <span>Skill-based</span>
          <span className="h2m-trust-sep" aria-hidden="true">•</span>
          <span>{c.totalTickets} entries max</span>
          <span className="h2m-trust-sep" aria-hidden="true">•</span>
          <span>Live-streamed draw</span>
        </div>

      </div>

      {/* ── Hero Switcher slot — inside the hero, above the beige strip ── */}
      {switcherSlot}

      {/* Bottom data strip */}
      <div className="h2-strip">
        {c.competitionNumber != null && (
          <>Competition <span>#{c.competitionNumber}</span> · </>
        )}
        <span>{c.totalTickets}</span> tickets total ·{' '}
        <span>{c.soldPercentage}%</span> sold · Max <span>{c.maxTicketsPerPurchase}</span> tickets per member · Publicly streamed live draw
      </div>
    </section>
  )
}
