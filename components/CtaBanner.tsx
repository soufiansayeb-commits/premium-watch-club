'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Competition } from '@/lib/competition-data'

interface Props {
  competition: Competition
}

export default function CtaBanner({ competition: c }: Props) {
  const fillRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            if (fillRef.current) {
              fillRef.current.style.width = `${c.soldPercentage}%`
            }
          }, 300)
          observer.disconnect()
        }
      },
      { threshold: 0.2 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [c.soldPercentage])

  const maxOdds = `1:${c.totalTickets}`

  return (
    <section id="current-draw" ref={sectionRef}>
      {/* layered background */}
      <div className="cd-bg-base" />
      <div className="cd-bg-image" />
      <div className="cd-bg-overlay" />
      <div className="cd-glow-accent" />

      <div className="cd-container">
        {/* ── LEFT ── */}
        <div className="cd-left">
          <div className="cd-eyebrow">
            <span className="cd-eyebrow-pulse" />
            <span>CURRENT DRAW</span>
            <span className="cd-eyebrow-sep">·</span>
            <span>CLOSING SOON</span>
          </div>

          <h2 className="cd-headline">
            <span className="cd-headline-count">{c.ticketsLeft} tickets</span>
            <span className="cd-headline-rest"> remain for the</span>
            <br />
            <em className="cd-headline-name">{c.title}</em>
          </h2>

          <p className="cd-sub">
            One competition. One watch. {c.totalTickets} entries only.
            Secure your chance to own the {c.model} — for just {c.currency}{c.entryPrice.toFixed(2)}.
          </p>

          {/* pill row */}
          <div className="cd-pills">
            <div className="cd-pill">
              <span className="cd-pill-label">Entry</span>
              <span className="cd-pill-value">{c.currency}{c.entryPrice.toFixed(2)}</span>
            </div>
            <div className="cd-pill-sep" />
            <div className="cd-pill">
              <span className="cd-pill-label">Draw Date</span>
              <span className="cd-pill-value">{c.drawDateDisplay}</span>
            </div>
            <div className="cd-pill-sep" />
            <div className="cd-pill">
              <span className="cd-pill-label">Watch Value</span>
              <span className="cd-pill-value">{c.currency}{c.retailValue.toLocaleString()}</span>
            </div>
          </div>

          {/* CTAs */}
          <div className="cd-actions">
            <Link href={c.ctaLink} className="cd-btn-primary">
              <span>SECURE YOUR ENTRY</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link href="/#how" className="cd-btn-secondary">How It Works</Link>
          </div>

          {/* scarcity module */}
          <div className="cd-scarcity">
            <div className="cd-scarcity-header">
              <div className="cd-scarcity-live">
                <span className="cd-live-dot" />
                <span>{c.ticketsSold} of {c.totalTickets} tickets claimed</span>
              </div>
              <span className="cd-scarcity-remain">{c.ticketsLeft} remaining</span>
            </div>
            <div className="cd-track">
              <div className="cd-track-fill" ref={fillRef} />
            </div>
            <p className="cd-odds-note">
              Max odds at sell-out: {maxOdds} · Publicly streamed live draw
            </p>
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div className="cd-right">
          <div className="cd-watch-stage">
            <div className="cd-watch-glow" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.heroImage}
              alt={c.title}
              className="cd-watch-img"
              draggable={false}
            />

            {/* floating info card */}
            <div className="cd-card">
              <div className="cd-card-header">
                <span className="cd-card-eyebrow">Competition Details</span>
              </div>
              <div className="cd-card-body">
                <div className="cd-card-row">
                  <span className="cd-card-label">Entry Price</span>
                  <span className="cd-card-val">{c.currency}{c.entryPrice.toFixed(2)}</span>
                </div>
                <div className="cd-card-divider" />
                <div className="cd-card-row">
                  <span className="cd-card-label">Total Entries</span>
                  <span className="cd-card-val">{c.totalTickets}</span>
                </div>
                <div className="cd-card-divider" />
                <div className="cd-card-row">
                  <span className="cd-card-label">Entries Remaining</span>
                  <span className="cd-card-val cd-card-gold">{c.ticketsLeft}</span>
                </div>
                <div className="cd-card-divider" />
                <div className="cd-card-row">
                  <span className="cd-card-label">Max Odds</span>
                  <span className="cd-card-val">{maxOdds}</span>
                </div>
                <div className="cd-card-divider" />
                <div className="cd-card-row">
                  <span className="cd-card-label">Draw Date</span>
                  <span className="cd-card-val">30 May 2026</span>
                </div>
              </div>
              <Link href={c.ctaLink} className="cd-card-cta">
                Enter Now
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
