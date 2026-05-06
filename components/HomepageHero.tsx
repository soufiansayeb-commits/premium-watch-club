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

  const [time, setTime] = useState({ d: '00', h: '00', m: '00', s: '00' })

  useEffect(() => {
    function tick() {
      const diff = drawTimestamp - Date.now()
      if (diff <= 0) {
        setTime({ d: '00', h: '00', m: '00', s: '00' })
        return
      }
      setTime({
        d: pad(Math.floor(diff / 86400000)),
        h: pad(Math.floor(diff % 86400000 / 3600000)),
        m: pad(Math.floor(diff % 3600000 / 60000)),
        s: pad(Math.floor(diff % 60000 / 1000)),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [drawTimestamp])

  return (
    <section id="hero">
      <div className="hero-topline"></div>
      <div className="hero-watch-glow"></div>

      <div className="hero-main">
        {/* LEFT: competition info */}
        <div className="hero-left">

          {/* Countdown + Progress row */}
          <div className="hero-top-row">
            <div className="hero-countdown">
              <div className="hcd-unit">
                <span className="hcd-num">{time.d}</span>
                <span className="hcd-lbl">Day(s)</span>
              </div>
              <span className="hcd-sep">·</span>
              <div className="hcd-unit">
                <span className="hcd-num">{time.h}</span>
                <span className="hcd-lbl">HR</span>
              </div>
              <span className="hcd-sep">·</span>
              <div className="hcd-unit">
                <span className="hcd-num">{time.m}</span>
                <span className="hcd-lbl">MIN</span>
              </div>
              <span className="hcd-sep">·</span>
              <div className="hcd-unit">
                <span className="hcd-num">{time.s}</span>
                <span className="hcd-lbl">SEC</span>
              </div>
            </div>

            <div className="hero-progress-col">
              <div className="hp-label">
                {c.soldPercentage}% SOLD — {c.ticketsLeft} TICKETS LEFT
              </div>
              <div className="hp-track">
                <div
                  className="hp-fill"
                  style={{ width: `${c.soldPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Headline */}
          <h1 className="hero-headline">
            Omega Speedmaster<br />Moonwatch
          </h1>

          {/* CTA */}
          <Link href={c.ctaLink} className="hero-cta-btn">
            Enter Now To Win
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>

          {/* Price */}
          <p className="hero-entry-price">
            <strong>{c.currency}{c.entryPrice.toFixed(2)}</strong> per entry
          </p>

          {/* Recent purchases */}
          <p className="hero-recent">
            3 recent purchases from {c.recentPurchases.join(', ')}.
          </p>

          {/* Leaderboard */}
          <div className="hero-leaderboard">
            <div className="hlb-title">Leaderboard</div>
            {c.leaderboard.map((entry, i) => (
              <div className="hlb-item" key={i}>
                <div className="hlb-item-left">
                  <span className="hlb-crown">&#x1F451;</span>
                  <span className="hlb-name">{entry.name} from {entry.location}</span>
                </div>
                <span className="hlb-tickets">{entry.tickets} tickets</span>
              </div>
            ))}
          </div>

        </div>

        {/* RIGHT: Watch image */}
        <div className="hero-right">
          <div className="hero-watch-img-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.heroImage}
              alt="Omega Speedmaster Moonwatch Professional Ref. 310.30.42.50.01.001"
            />
            <div className="hero-rrp-badge">
              <div className="hrb-label">Reference</div>
              <div className="hrb-val">{c.reference}</div>
              <div className="hrb-sub">{c.detail}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom strip */}
      <div className="hero-strip">
        Competition <span>#1</span> · <span>{c.totalTickets}</span> tickets total ·{' '}
        <span>{c.soldPercentage}%</span> sold · Max <span>{c.maxTicketsPerPurchase}</span> tickets per member · Publicly streamed live draw
      </div>
    </section>
  )
}
