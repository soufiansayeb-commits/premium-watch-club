'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Competition } from '@/lib/competition-data'
import { isSoldOut } from '@/lib/competition-status'
import { useMoney } from '@/context/StoreSettingsContext'

// ── Countdown helper ──────────────────────────────────────────────────────────

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
  // Seed from the real draw date so the server renders the actual remaining time
  // instead of a false 00:00:00 card. `calc()` guards a null/invalid date. Digits
  // are suppressHydrationWarning'd (see CountdownBlock) so the sub-second
  // server/client delta never causes a hydration mismatch.
  const [time, setTime] = useState(calc)
  useEffect(() => {
    if (validTs === null) return
    setTime(calc())
    const id = setInterval(() => setTime(calc()), 1000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetDate])
  return time
}

// ── Label helpers ─────────────────────────────────────────────────────────────

function getDropLabel(comp: Competition): string {
  switch (comp.competitionType) {
    case 'starter':  return 'STARTER DROP'
    case 'weekly':   return 'WEEKLY DROP'
    case 'monthly':  return 'MONTHLY DROP'
    case 'special':  return 'SPECIAL DROP'
    default: return comp.isFree ? 'FREE COMP' : 'COMPETITION'
  }
}

function getBadgeClass(comp: Competition, soldOut: boolean): string {
  if (soldOut) return 'cgc-badge-soldout'
  if (comp.isFree || comp.competitionType === 'starter') return 'cgc-badge-free'
  return 'cgc-badge-paid'
}

// ── Single card ───────────────────────────────────────────────────────────────

function CountdownBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="cgc-cd-block">
      <span className="cgc-cd-num" suppressHydrationWarning>{String(value).padStart(2, '0')}</span>
      <span className="cgc-cd-lbl">{label}</span>
    </div>
  )
}

function CompCard({ competition: c }: { competition: Competition }) {
  const fmt     = useMoney()
  const time    = useCountdown(c.drawDate)
  const imgRef  = useRef<HTMLDivElement>(null)
  const soldOut = isSoldOut(c)
  const blocked = time.closed || soldOut          // not purchasable (timer ended or sold out)
  const label   = getDropLabel(c)
  const badge   = getBadgeClass(c, blocked)       // reuse the sold-out badge styling when closed

  return (
    <article className={`cgc-card${blocked ? ' cgc-card--soldout' : ''}`}>
      {/* image area */}
      <div className="cgc-img-wrap" ref={imgRef}>
        <div className="cgc-img-shine" />
        <Image
          src={c.heroImage}
          alt={c.title}
          fill
          className="cgc-watch-img"
          style={{ objectFit: 'contain' }}
          sizes="(max-width: 480px) 100vw, (max-width: 900px) 50vw, 360px"
          draggable={false}
        />
        <div className={`cgc-badge ${badge}`}>{time.closed ? 'CLOSED' : soldOut ? 'SOLD OUT' : label}</div>
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

        {/* stats */}
        <div className="cgc-stats">
          <div className="cgc-stat">
            <span className="cgc-stat-label">Entry</span>
            <span className="cgc-stat-val">
              {c.isFree ? 'FREE' : fmt(c.entryPrice)}
            </span>
          </div>
          <div className="cgc-stat-divider" />
          <div className="cgc-stat">
            <span className="cgc-stat-label">Tickets Left</span>
            <span className="cgc-stat-val cgc-stat-gold">
              {soldOut ? '0' : c.ticketsLeft}
            </span>
          </div>
          <div className="cgc-stat-divider" />
          <div className="cgc-stat">
            <span className="cgc-stat-label">Total Entries</span>
            <span className="cgc-stat-val">{c.totalTickets}</span>
          </div>
        </div>

        {/* CTA — disabled when the draw timer has ended or the drop is sold out.
            time.closed takes priority so an expired draw always reads "Closed". */}
        {time.closed || soldOut ? (
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
            <span>{time.closed ? 'COMPETITION CLOSED' : 'SOLD OUT'}</span>
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

// ── Grid ──────────────────────────────────────────────────────────────────────

interface Props {
  /** All active competitions to display (Live + Sold Out; Coming Soon and Closed excluded). */
  competitions: Competition[]
}

export default function CompetitionsGrid({ competitions }: Props) {
  if (competitions.length === 0) return null

  return (
    <section id="competitions-grid">
      <div className="cgc-bg-base" />
      <div className="cgc-bg-waves" />
      <div className="cgc-bg-grid" />
      <div className="cgc-bg-glow-left" />
      <div className="cgc-bg-glow-right" />

      <div className="cgc-container">
        <header className="cgc-header">
          <div className="cgc-header-rule" />
          <div className="cgc-header-content">
            <span className="cgc-header-eyebrow">
              <span className="cgc-pulse-dot" />
              LIVE NOW
            </span>
            <h2 className="cgc-heading">Current Competitions</h2>
            <p className="cgc-subhead">
              One competition. One watch. Limited entries, secure yours before the draw closes.
            </p>
          </div>
          <div className="cgc-header-rule" />
        </header>

        <div className="cgc-grid">
          {competitions.map(c => (
            <CompCard key={c.id} competition={c} />
          ))}
        </div>
      </div>
    </section>
  )
}
