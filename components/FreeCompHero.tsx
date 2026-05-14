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
  const drawTimestamp = useMemo(() => new Date(c.drawDate).getTime(), [c.drawDate])
  const maxOdds = `1:${c.totalTickets}`

  const [progVisible, setProgVisible] = useState(false)
  const [time, setTime] = useState({ d: '00', h: '00', m: '00', s: '00' })

  useEffect(() => {
    function tick() {
      const diff = drawTimestamp - Date.now()
      if (diff <= 0) { setTime({ d: '00', h: '00', m: '00', s: '00' }); return }
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

  const drawDateShort = c.drawDateDisplay.split(',')[0]
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
              <span className="fc-free-badge">FREE</span>
            </div>

            {/* Countdown — upper-left, integrated, matches paid hero rhythm */}
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
            <h2 className="fc-headline">FREE COMP</h2>

            {/* Stats row: ENTRY | DRAW DATE | WATCH VALUE */}
            <div className="fc-stats-row">
              <div className="fc-stat">
                <span className="fc-stat-label">ENTRY</span>
                <span className="fc-stat-val fc-stat-free">FREE</span>
              </div>
              <div className="fc-stat-divider" />
              <div className="fc-stat">
                <span className="fc-stat-label">DRAW DATE</span>
                <span className="fc-stat-val">{c.drawDateDisplay}</span>
              </div>
              <div className="fc-stat-divider" />
              <div className="fc-stat">
                <span className="fc-stat-label">WATCH VALUE</span>
                <span className="fc-stat-val">{c.currency}{c.retailValue.toLocaleString()}</span>
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

            {/* Reference card */}
            <div className="fc-ref-card">
              <div className="fc-ref-eyebrow">REFERENCE</div>
              <div className="fc-ref-val">{c.reference}</div>
              <div className="fc-ref-sub">{c.detail}</div>
            </div>

            {/* Competition details card */}
            <div className="fc-details-card">
              <div className="fc-card-eyebrow">COMPETITION DETAILS</div>
              <div className="fc-card-rows">
                <div className="fc-card-row">
                  <span className="fc-card-label">Entry Price</span>
                  <span className="fc-card-val fc-card-free">FREE</span>
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
                ENTER FOR FREE
              </Link>
            </div>

          </div>

        </div>

        {/* Bottom info strip */}
        <div className="fc-strip">
          Free Competition <span>#2</span> · <span>{c.totalTickets}</span> tickets total ·{' '}
          <span>{c.soldPercentage}%</span> claimed · Max <span>{c.maxTicketsPerPurchase}</span> {entryWord} per member · Publicly streamed live draw
        </div>

      </section>
    </>
  )
}
