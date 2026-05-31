'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Competition } from '@/lib/competition-data'
import { isSoldOut } from '@/lib/competition-status'

interface CardData {
  competition: Competition
  label: string
  badgeClass: string
}

function useCountdown(targetDate: string) {
  const ts = new Date(targetDate).getTime()
  const validTs = isNaN(ts) ? null : ts

  const calc = () => {
    if (validTs === null) return { d: 0, h: 0, m: 0, s: 0, closed: false }
    const diff = validTs - Date.now()
    if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, closed: true }
    return {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff % 86400000) / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
      closed: false,
    }
  }
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0, closed: false })
  useEffect(() => {
    if (validTs === null) return
    setTime(calc())
    const id = setInterval(() => setTime(calc()), 1000)
    return () => clearInterval(id)
  }, [targetDate])
  return time
}

function CountdownBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="cgc-cd-block">
      <span className="cgc-cd-num">{String(value).padStart(2, '0')}</span>
      <span className="cgc-cd-lbl">{label}</span>
    </div>
  )
}

function CompCard({ competition: c, label, badgeClass }: CardData) {
  const time = useCountdown(c.drawDate)
  const imgRef = useRef<HTMLDivElement>(null)
  const soldOut = isSoldOut(c)

  return (
    <article className="cgc-card">
      {/* image area */}
      <div className="cgc-img-wrap" ref={imgRef}>
        <div className="cgc-img-shine" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={c.heroImage} alt={c.title} className="cgc-watch-img" draggable={false} />
        <div className={`cgc-badge ${badgeClass}`}>{label}</div>
        <div className="cgc-img-overlay" />
      </div>

      {/* card body */}
      <div className="cgc-body">
        <p className="cgc-comp-name">{c.title}</p>

        {/* countdown */}
        {time.closed ? (
          <div className="cgc-cd-row cgc-cd-row-closed">
            <span className="cgc-closed-label">Competition Closed</span>
          </div>
        ) : (
          <div className="cgc-cd-row">
            <CountdownBlock value={time.d} label="DAY" />
            <div className="cgc-cd-sep">:</div>
            <CountdownBlock value={time.h} label="HR" />
            <div className="cgc-cd-sep">:</div>
            <CountdownBlock value={time.m} label="MIN" />
            <div className="cgc-cd-sep">:</div>
            <CountdownBlock value={time.s} label="SEC" />
          </div>
        )}

        {/* stats row */}
        <div className="cgc-stats">
          <div className="cgc-stat">
            <span className="cgc-stat-label">Entry</span>
            <span className="cgc-stat-val">
              {c.isFree ? 'FREE' : `${c.currency}${c.entryPrice.toFixed(2)}`}
            </span>
          </div>
          <div className="cgc-stat-divider" />
          <div className="cgc-stat">
            <span className="cgc-stat-label">Tickets Left</span>
            <span className="cgc-stat-val cgc-stat-gold">{c.ticketsLeft}</span>
          </div>
          <div className="cgc-stat-divider" />
          <div className="cgc-stat">
            <span className="cgc-stat-label">Total Entries</span>
            <span className="cgc-stat-val">{c.totalTickets}</span>
          </div>
        </div>

        {/* CTA — disabled when sold out */}
        {soldOut ? (
          <button
            disabled
            aria-disabled="true"
            className="cgc-cta"
            style={{
              background: 'rgba(18,12,4,0.92)',
              border: '1px solid rgba(212,175,55,0.22)',
              color: 'rgba(212,175,55,0.45)',
              cursor: 'not-allowed',
              pointerEvents: 'none',
              letterSpacing: '0.18em',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span>SOLD OUT</span>
          </button>
        ) : (
          <Link href={c.ctaLink} className="cgc-cta">
            <span>ENTER NOW</span>
            <svg className="cgc-cta-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        )}
      </div>
    </article>
  )
}

interface Props {
  weeklyComp: Competition
  freeComp: Competition
}

export default function CompetitionsGrid({ weeklyComp, freeComp }: Props) {
  const cards: CardData[] = [
    {
      competition: weeklyComp,
      label: 'WEEKLY COMP',
      badgeClass: 'cgc-badge-paid',
    },
    {
      competition: freeComp,
      label: freeComp.isFree ? 'FREE COMP' : 'MONTHLY COMP',
      badgeClass: 'cgc-badge-free',
    },
  ]

  return (
    <section id="competitions-grid">
      <div className="cgc-bg-base" />
      <div className="cgc-bg-grid" />
      <div className="cgc-bg-glow-left" />
      <div className="cgc-bg-glow-right" />

      <div className="cgc-container">
        {/* section header */}
        <header className="cgc-header">
          <div className="cgc-header-rule" />
          <div className="cgc-header-content">
            <span className="cgc-header-eyebrow">
              <span className="cgc-pulse-dot" />
              LIVE NOW
            </span>
            <h2 className="cgc-heading">Current Competitions</h2>
            <p className="cgc-subhead">
              One competition. One watch. Limited entries — secure yours before the draw closes.
            </p>
          </div>
          <div className="cgc-header-rule" />
        </header>

        {/* grid */}
        <div className="cgc-grid">
          {cards.map((card) => (
            <CompCard key={card.competition.id} {...card} />
          ))}
        </div>
      </div>
    </section>
  )
}
