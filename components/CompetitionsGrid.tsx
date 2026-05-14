'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Competition } from '@/lib/competition-data'

interface CardData {
  competition: Competition
  label: string
  badgeClass: string
  ctaHref: string
}

function useCountdown(targetDate: string) {
  const calc = () => {
    const diff = new Date(targetDate).getTime() - Date.now()
    if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0 }
    return {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff % 86400000) / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
    }
  }
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 })
  useEffect(() => {
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

function CompCard({ competition: c, label, badgeClass, ctaHref }: CardData) {
  const time = useCountdown(c.drawDate)
  const imgRef = useRef<HTMLDivElement>(null)

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
        <div className="cgc-cd-row">
          <CountdownBlock value={time.d} label="DAY" />
          <div className="cgc-cd-sep">:</div>
          <CountdownBlock value={time.h} label="HR" />
          <div className="cgc-cd-sep">:</div>
          <CountdownBlock value={time.m} label="MIN" />
          <div className="cgc-cd-sep">:</div>
          <CountdownBlock value={time.s} label="SEC" />
        </div>

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
            <span className="cgc-stat-label">Watch Value</span>
            <span className="cgc-stat-val">{c.currency}{c.retailValue.toLocaleString()}</span>
          </div>
        </div>

        {/* CTA */}
        <Link href={ctaHref} className="cgc-cta">
          <span>ENTER NOW</span>
          <svg className="cgc-cta-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </article>
  )
}

interface Props {
  paidComp: Competition
  freeComp: Competition
}

export default function CompetitionsGrid({ paidComp, freeComp }: Props) {
  const cards: CardData[] = [
    {
      competition: paidComp,
      label: 'PAID COMP',
      badgeClass: 'cgc-badge-paid',
      ctaHref: paidComp.ctaLink,
    },
    {
      competition: freeComp,
      label: 'FREE COMP',
      badgeClass: 'cgc-badge-free',
      ctaHref: '/competitions/free-omega-speedmaster-moonwatch',
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
