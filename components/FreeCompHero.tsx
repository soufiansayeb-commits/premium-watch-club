'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Competition } from '@/lib/competition-data'

interface Props {
  competition: Competition
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export default function FreeCompHero({ competition }: Props) {
  const c = competition
  // null means the draw date is missing/invalid — timer stays in safe fallback state
  const drawTimestamp = useMemo(() => {
    const ts = new Date(c.drawDate).getTime()
    return isNaN(ts) ? null : ts
  }, [c.drawDate])
  const maxOdds = `1:${c.totalTickets}`

  const [progVisible, setProgVisible] = useState(false)
  const [time, setTime]   = useState({ d: '00', h: '00', m: '00', s: '00' })
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    if (drawTimestamp === null) return // no valid draw date — leave timer at default 00:00
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
    const t = setTimeout(() => setProgVisible(true), 600)
    return () => clearTimeout(t)
  }, [])

  const drawDateShort = c.drawDateDisplay.split(',')[0] || c.drawDateDisplay
  const entryWord = c.maxTicketsPerPurchase === 1 ? 'entry' : 'entries'

  return (
    <>
      <section id="free-comp">
        {/* Cinematic background layers — same language as paid hero but warmer */}
        <div className="fc-bg-gradient" />
        <div className="fc-bg-vignette" />
        <div className="fc-topline" />
        <div className="fc-watch-ambient" />

        <div className="fc-inner">

          {/* ── COL 1: LEFT ── */}
          <div className="fc-left">

            {/* Eyebrow — pulse dot + status */}
            <div className="fc-eyebrow">
              <span className="fc-pulse-dot" />
              <span>LIVE DRAW</span>
              <span className="fc-eyebrow-sep">·</span>
              <span>CLOSING SOON</span>
              {c.isFree && <span className="fc-free-badge">FREE</span>}
            </div>

            {/* Countdown — upper-left, integrated, matches paid hero rhythm */}
            {closed ? (
              <div className="fc-countdown fc-countdown-closed">
                <span className="fc-closed-label">Competition Closed</span>
              </div>
            ) : (
              <div className="fc-countdown">
                <div className="fc-cd-block">
                  <span className="fc-cd-num">{time.d}</span>
                  <span className="fc-cd-lbl">DAYS</span>
                </div>
                <span className="fc-cd-sep" aria-hidden="true">:</span>
                <div className="fc-cd-block">
                  <span className="fc-cd-num">{time.h}</span>
                  <span className="fc-cd-lbl">HRS</span>
                </div>
                <span className="fc-cd-sep" aria-hidden="true">:</span>
                <div className="fc-cd-block">
                  <span className="fc-cd-num">{time.m}</span>
                  <span className="fc-cd-lbl">MIN</span>
                </div>
                <span className="fc-cd-sep" aria-hidden="true">:</span>
                <div className="fc-cd-block">
                  <span className="fc-cd-num">{time.s}</span>
                  <span className="fc-cd-lbl">SEC</span>
                </div>
              </div>
            )}

            {/* Progress — above headline */}
            <div className="fc-progress">
              <div className="fc-prog-meta">
                <div className="fc-prog-live">
                  <span className="fc-prog-live-dot" />
                  <span className="fc-prog-label">
                    {c.soldPercentage}% CLAIMED — {c.ticketsLeft} REMAINING
                  </span>
                </div>
                <span className="fc-prog-count">{c.ticketsSold} of {c.totalTickets} tickets</span>
              </div>
              <div className="fc-prog-track">
                <div
                  className="fc-prog-fill"
                  style={{ width: progVisible ? `${c.soldPercentage}%` : '0%' }}
                />
              </div>
            </div>

            {/* Headline */}
            <h2 className="fc-headline">{c.title}</h2>

            {/* Stats row: ENTRY | DRAW DATE | WATCH VALUE */}
            <div className="fc-stats-row">
              <div className="fc-stat">
                <span className="fc-stat-label">ENTRY</span>
                <span className={`fc-stat-val${c.isFree ? ' fc-stat-free' : ''}`}>
                  {c.isFree ? 'FREE' : `${c.currency}${c.entryPrice.toFixed(2)}`}
                </span>
              </div>
              <div className="fc-stat-divider" />
              <div className="fc-stat">
                <span className="fc-stat-label">DRAW DATE</span>
                <span className="fc-stat-val">{c.drawDateDisplay}</span>
              </div>
              <div className="fc-stat-divider" />
              <div className="fc-stat">
                <span className="fc-stat-label">TOTAL ENTRIES</span>
                <span className="fc-stat-val">{c.totalTickets}</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="fc-cta-group">
              <Link href={c.ctaLink} className="fc-cta-btn">
                <span>SECURE YOUR ENTRY</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
              <Link href="#how-it-works" className="fc-secondary-btn">
                How It Works
              </Link>
            </div>

            {/* Mobile-only entry label — mirrors paid hero's £price line */}
            <div className="fc-mobile-entry">
              {c.isFree
                ? <><strong>FREE</strong> entry</>
                : <><strong>{c.currency}{c.entryPrice.toFixed(2)}</strong> per entry</>
              }
            </div>

          </div>

          {/* ── COL 2: CENTRE — watch, clean stage ── */}
          <div className="fc-center">
            <div className="fc-watch-stage">
              <div className="fc-watch-glow" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.heroImage}
                alt={c.title}
                className="fc-watch-img"
                draggable={false}
              />
            </div>
          </div>

          {/* ── COL 3: RIGHT — details card ── */}
          <div className="fc-cards-col">

            {/* Competition details card */}
            <div className="fc-details-card">
              <div className="fc-card-eyebrow">COMPETITION DETAILS</div>
              <div className="fc-card-rows">
                <div className="fc-card-row">
                  <span className="fc-card-label">Entry Price</span>
                  <span className={`fc-card-val${c.isFree ? ' fc-card-free' : ''}`}>
                    {c.isFree ? 'FREE' : `${c.currency}${c.entryPrice.toFixed(2)}`}
                  </span>
                </div>
                <div className="fc-card-divider" />
                <div className="fc-card-row">
                  <span className="fc-card-label">Total Entries</span>
                  <span className="fc-card-val">{c.totalTickets}</span>
                </div>
                <div className="fc-card-divider" />
                <div className="fc-card-row">
                  <span className="fc-card-label">Entries Remaining</span>
                  <span className="fc-card-val fc-card-gold">{c.ticketsLeft}</span>
                </div>
                <div className="fc-card-divider" />
                <div className="fc-card-row">
                  <span className="fc-card-label">Max Odds</span>
                  <span className="fc-card-val">{maxOdds}</span>
                </div>
                <div className="fc-card-divider" />
                <div className="fc-card-row">
                  <span className="fc-card-label">Draw Date</span>
                  <span className="fc-card-val">{drawDateShort}</span>
                </div>
              </div>
              <Link href={c.ctaLink} className="fc-card-cta">
                {c.isFree ? 'ENTER FOR FREE' : 'ENTER NOW'}
              </Link>
            </div>

          </div>

        </div>

        {/* Bottom info strip */}
        <div className="fc-strip">
          {c.isFree ? 'Free' : 'Paid'} Competition <span>#2</span> · <span>{c.totalTickets}</span> tickets total ·{' '}
          <span>{c.soldPercentage}%</span> claimed · Max <span>{c.maxTicketsPerPurchase}</span> {entryWord} per member · Publicly streamed live draw
        </div>

      </section>
    </>
  )
}
