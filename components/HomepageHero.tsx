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

export default function HomepageHero({ competition }: Props) {
  const c = competition
  const drawTimestamp = useMemo(() => new Date(c.drawDate).getTime(), [c.drawDate])
  const maxOdds = `1:${c.totalTickets}`

  const [time, setTime]           = useState({ d: '00', h: '00', m: '00', s: '00' })
  const [progVisible, setProgVisible] = useState(false)

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
    const t = setTimeout(() => setProgVisible(true), 500)
    return () => clearTimeout(t)
  }, [])

  return (
    <section id="hero">
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
            <span>LIVE DRAW</span>
            <span className="h2-eyebrow-sep">·</span>
            <span>CLOSING SOON</span>
          </div>

          <div className="h2-countdown">
            <div className="h2-cd-block">
              <span className="h2-cd-num">{time.d}</span>
              <span className="h2-cd-lbl">DAYS</span>
            </div>
            <span className="h2-cd-sep" aria-hidden="true">:</span>
            <div className="h2-cd-block">
              <span className="h2-cd-num">{time.h}</span>
              <span className="h2-cd-lbl">HRS</span>
            </div>
            <span className="h2-cd-sep" aria-hidden="true">:</span>
            <div className="h2-cd-block">
              <span className="h2-cd-num">{time.m}</span>
              <span className="h2-cd-lbl">MIN</span>
            </div>
            <span className="h2-cd-sep" aria-hidden="true">:</span>
            <div className="h2-cd-block">
              <span className="h2-cd-num">{time.s}</span>
              <span className="h2-cd-lbl">SEC</span>
            </div>
          </div>

          <div className="h2-progress">
            <div className="h2-prog-meta">
              <div className="h2-prog-live">
                <span className="h2-prog-live-dot" />
                <span className="h2-prog-label">
                  {c.soldPercentage}% SOLD — {c.ticketsLeft} TICKETS LEFT
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

          <h1 className="h2-headline">{c.title}</h1>

          <Link href={c.ctaLink} className="h2-cta-btn">
            <span>SECURE YOUR ENTRY</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>

          <div className="h2-meta-row">
            <span className="h2-price">
              <strong>{c.currency}{c.entryPrice.toFixed(2)}</strong> per entry
            </span>
            <span className="h2-meta-sep" aria-hidden="true" />
            <span className="h2-social-proof">
              3 recent purchases from {c.recentPurchases.join(', ')}
            </span>
          </div>

          {/* Desktop-only leaderboard — hidden on mobile */}
          <div className="h2-leaderboard h2-lb-desktop">
            <div className="h2-lb-header">
              <span className="h2-lb-live-dot" />
              <span className="h2-lb-title">LIVE LEADERBOARD</span>
            </div>
            {c.leaderboard.map((entry, i) => (
              <div className="h2-lb-row" key={i}>
                <div className="h2-lb-left">
                  <span className="h2-lb-rank">#{i + 1}</span>
                  <span className="h2-lb-name">{entry.name} from {entry.location}</span>
                </div>
                <span className="h2-lb-tickets">{entry.tickets} tickets</span>
              </div>
            ))}
          </div>

        </div>

        {/* ── COL 2: CENTER — watch only, completely clean ── */}
        <div className="h2-center">
          <div className="h2-watch-stage">
            <div className="h2-watch-glow" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.heroImage}
              alt={c.title}
              className="h2-watch-img"
              draggable={false}
            />
          </div>
        </div>

        {/* ── COL 3: RIGHT — details card only (reference removed) ── */}
        <div className="h2-cards-col">

          {/* Competition details card */}
          <div className="h2-details-card">
            <div className="h2-card-eyebrow">COMPETITION DETAILS</div>
            <div className="h2-card-rows">
              <div className="h2-card-row">
                <span className="h2-card-label">Entry Price</span>
                <span className="h2-card-val">{c.currency}{c.entryPrice.toFixed(2)}</span>
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
                <span className="h2-card-val">{c.drawDateDisplay.split(',')[0]}</span>
              </div>
            </div>
            <Link href={c.ctaLink} className="h2-card-cta">
              ENTER NOW
            </Link>
          </div>

        </div>

      </div>

      {/* Bottom data strip */}
      <div className="h2-strip">
        Competition <span>#1</span> · <span>{c.totalTickets}</span> tickets total ·{' '}
        <span>{c.soldPercentage}%</span> sold · Max <span>{c.maxTicketsPerPurchase}</span> tickets per member · Publicly streamed live draw
      </div>
    </section>
  )
}
