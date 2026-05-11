'use client'

import Link from 'next/link'
import { Competition } from '@/lib/competition-data'

type Badge = 'MOST POPULAR' | 'BEST ODDS' | null
const BADGES: Record<number, Badge> = { 10: 'MOST POPULAR', 20: 'BEST ODDS' }

interface Props {
  competition: Competition
  selectedQty: number
  onQtyChange: (qty: number) => void
  onContinue: () => void
}

export default function TicketSelector({ competition: c, selectedQty, onQtyChange, onContinue }: Props) {
  const fmt = (n: number) => `${c.currency}${n.toFixed(2)}`
  const maxQty = Math.floor(c.totalTickets * 0.33)
  const subtotal = selectedQty * c.entryPrice
  const odds = Math.round(c.totalTickets / selectedQty)
  const pct = Math.min((selectedQty / maxQty) * 100, 100)
  // Gradient fill position for the slider track
  const sliderPct = maxQty > 1 ? ((selectedQty - 1) / (maxQty - 1)) * 100 : 0

  function handleChange(val: number) {
    onQtyChange(Math.max(1, Math.min(maxQty, val)))
  }

  const oddsNote =
    selectedQty >= 20
      ? 'Maximum-odds entry. Every ticket is independently drawn into the live draw.'
      : selectedQty >= 10
      ? 'Strong entry. More tickets mean stronger odds — each is independently drawn.'
      : 'Every ticket is independently entered into the live draw. Add more for better odds.'

  return (
    <div className="step-panel active" id="panel-step-1">
      <div className="entry-card">

        <div className="entry-card-header">
          <div className="ech-eyebrow">Win the Prize</div>
          <div className="ech-title">{c.title}</div>
          <div className="ech-price-line">
            <strong>{fmt(c.entryPrice)}</strong> per entry
          </div>
        </div>

        <div className="entry-card-body">
          <div className="tickets-label">Select your tickets:</div>

          {/* 1. Bundle grid */}
          <div className="bundle-grid">
            {c.ticketOptions.map(opt => {
              const badge: Badge = BADGES[opt.qty] ?? null
              const isSelected = selectedQty === opt.qty
              const isHero = badge === 'BEST ODDS'
              const isLarge = opt.qty >= 10
              const bundleOdds = Math.round(c.totalTickets / opt.qty)

              return (
                <div
                  key={opt.qty}
                  role="button"
                  aria-pressed={isSelected}
                  onClick={() => onQtyChange(opt.qty)}
                  className={[
                    'bundle-card',
                    isSelected ? 'bundle-selected' : '',
                    isHero     ? 'bundle-hero'     : '',
                    isLarge    ? 'bundle-large'    : '',
                  ].filter(Boolean).join(' ')}
                >
                  {badge && (
                    <span className={`bundle-badge ${badge === 'BEST ODDS' ? 'badge-gold' : 'badge-navy'}`}>
                      {badge}
                    </span>
                  )}
                  <span className="bc-qty">{opt.qty}</span>
                  <span className="bc-label">{opt.qty === 1 ? 'Ticket' : 'Tickets'}</span>
                  <span className="bc-price">{fmt(opt.qty * c.entryPrice)}</span>
                  <span className="bc-odds">1 in {bundleOdds}</span>
                </div>
              )
            })}
          </div>

          {/* 2. Custom amount slider */}
          <div className="slider-section">
            <div className="slider-header">
              <span className="slider-section-label">Or choose a custom amount</span>
              <span className="slider-value-display">
                {selectedQty} {selectedQty === 1 ? 'ticket' : 'tickets'} &middot; {fmt(subtotal)}
              </span>
            </div>
            <div className="slider-row">
              <button
                className="slider-btn"
                aria-label="Decrease"
                onClick={() => handleChange(selectedQty - 1)}
              >−</button>
              <input
                type="range"
                className="qty-slider"
                min={1}
                max={maxQty}
                value={selectedQty}
                onChange={e => handleChange(parseInt(e.target.value))}
                style={{
                  background: `linear-gradient(to right, var(--gold) 0%, var(--gold) ${sliderPct}%, var(--border-mid) ${sliderPct}%, var(--border-mid) 100%)`
                }}
              />
              <button
                className="slider-btn"
                aria-label="Increase"
                onClick={() => handleChange(selectedQty + 1)}
              >+</button>
            </div>
            <div className="slider-cap">
              Maximum 33% of total entries per person &middot; {maxQty} max for this competition
            </div>
          </div>

          {/* 3. Odds summary panel */}
          <div className="odds-panel">
            <div className="odds-panel-row">
              <div className="op-left">
                <div className="op-eyebrow">Your odds</div>
                <div className="op-fraction">1 in {odds}</div>
              </div>
              <div className="op-right">
                <div className="op-detail">
                  {selectedQty} {selectedQty === 1 ? 'entry' : 'entries'} &middot; {fmt(subtotal)}
                </div>
                <div className="op-bar-track">
                  <div className="op-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="op-bar-label">{Math.round(pct)}% of your maximum entries</div>
              </div>
            </div>
            <p className="op-note">{oddsNote}</p>
          </div>

          <div className="entry-divider" />

          {/* 4. Subtotal */}
          <div className="subtotal-row">
            <div>
              <div className="sr-left">
                Order Total <span>({selectedQty} {selectedQty === 1 ? 'ticket' : 'tickets'})</span>
              </div>
              <div className="sr-per">{fmt(c.entryPrice)} &times; {selectedQty}</div>
            </div>
            <div className="sr-amount">{fmt(subtotal)}</div>
          </div>

          {/* 5. Continue */}
          <button className="btn-continue" onClick={onContinue}>
            Continue
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="entry-card-footer">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
            <rect x="2" y="5" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M5 5V4a2 2 0 014 0v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <div className="ecf-text">
            Secure checkout &middot; A correct skill-based answer is required to win.
            This is a skill competition — <Link href="/terms">view full terms</Link>. 18+ only.
          </div>
        </div>

      </div>
    </div>
  )
}
