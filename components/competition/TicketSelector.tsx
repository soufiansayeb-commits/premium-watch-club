'use client'

import Link from 'next/link'
import { Competition } from '@/lib/competition-data'
import { isSoldOut } from '@/lib/competition-status'

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

  // Defense-in-depth: CompetitionEntryFlow already gates on isSoldOut before
  // rendering TicketSelector. This guard handles any direct-render edge cases.
  if (isSoldOut(c)) {
    return (
      <div className="step-panel active" id="panel-step-1">
        <div className="entry-card">
          <div className="entry-card-body" style={{ textAlign: 'center', padding: '48px 32px' }}>
            <div
              style={{
                display: 'inline-block',
                padding: '14px 40px',
                background: 'rgba(18,12,4,0.92)',
                border: '1px solid rgba(212,175,55,0.22)',
                color: 'rgba(212,175,55,0.45)',
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.18em',
                borderRadius: '2px',
                cursor: 'not-allowed',
                marginBottom: '16px',
              }}
            >
              SOLD OUT
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              All entries for this competition have been sold.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // maxTicketsPerPurchase = policy cap (from ACF percentage or override).
  // allowedMaxQty = min(policy cap, live remaining stock).
  const entriesRemaining = c.ticketsLeft > 0 ? c.ticketsLeft : 1
  const allowedMaxQty = Math.min(c.maxTicketsPerPurchase, entriesRemaining)
  const showSlider = allowedMaxQty > 1

  const subtotal = selectedQty * c.entryPrice
  // Odds based on current entries sold (WWC model):
  //   entriesSold = totalTickets − entriesRemaining
  //   currentPool = entriesSold + selectedQty  (pool after your selection joins)
  //   oddsDenominator = ceil(currentPool / selectedQty)
  const entriesSold = Math.max(0, c.totalTickets - entriesRemaining)
  const currentPool = entriesSold + selectedQty
  const odds = Math.max(1, Math.ceil(currentPool / selectedQty))
  const pct = Math.min((selectedQty / allowedMaxQty) * 100, 100)
  const sliderPct = allowedMaxQty > 1 ? ((selectedQty - 1) / (allowedMaxQty - 1)) * 100 : 100

  // ── Temporary debug — remove once AP max quantity is confirmed correct ────────
  if (process.env.NODE_ENV === 'development') {
    console.log('[AP QUANTITY DEBUG]', {
      id:                    c.wooProductId,
      name:                  c.title,
      price:                 c.entryPrice,
      isFree:                c.isFree,
      totalTickets:          c.totalTickets,
      ticketsLeft:           c.ticketsLeft,
      entriesRemaining,
      maxTicketsPerPurchase: c.maxTicketsPerPurchase,
      allowedMaxQty,
      showSlider,
      selectedQty,
      selectorUsed:          'TicketSelector',
    })
  }

  function handleChange(val: number) {
    onQtyChange(Math.max(1, Math.min(allowedMaxQty, val)))
  }


  const isFree = !!c.isFree

  function priceLabel(qty: number): string {
    if (isFree) return 'FREE'
    return fmt(qty * c.entryPrice)
  }

  return (
    <div className="step-panel active" id="panel-step-1">
      <div className="entry-card">

        <div className="entry-card-header">
          <div className="ech-eyebrow">Win the Prize</div>
          <div className="ech-title">{c.title}</div>
          <div className="ech-price-line">
            {isFree ? (
              <><strong style={{ color: 'var(--green)' }}>Free entry</strong> — no purchase required</>
            ) : (
              <><strong>{fmt(c.entryPrice)}</strong> per entry</>
            )}
          </div>
        </div>

        <div className="entry-card-body">
          <div className="tickets-label">
            {isFree ? 'Your entry:' : 'Select your tickets:'}
          </div>

          {/* ── Bundle / entry grid ── */}
          <div className="bundle-grid">
            {c.ticketOptions.map(opt => {
              // Lock based solely on allowedMaxQty — works for both free and paid products.
              // sold_individually=true → allowedMaxQty=1 → all options >1 are locked.
              // Never lock based on isFree alone; a free product can allow multiple entries
              // if sold_individually is false.
              const isLocked = opt.qty > allowedMaxQty
              const badge: Badge = isLocked ? null : (BADGES[opt.qty] ?? null)
              const isSelected = selectedQty === opt.qty
              const isHero = badge === 'BEST ODDS'
              const isLarge = opt.qty >= 10
              // Odds based on entries sold (same WWC model as the summary panel)
              const effectiveQty = Math.min(opt.qty, allowedMaxQty)
              const bundlePool = entriesSold + effectiveQty
              const bundleOdds = Math.max(1, Math.ceil(bundlePool / effectiveQty))

              return (
                <div
                  key={opt.qty}
                  role="button"
                  aria-pressed={isSelected && !isLocked}
                  aria-disabled={isLocked}
                  onClick={() => !isLocked && onQtyChange(opt.qty)}
                  className={[
                    'bundle-card',
                    isSelected && !isLocked ? 'bundle-selected' : '',
                    isHero     ? 'bundle-hero'     : '',
                    isLarge    ? 'bundle-large'    : '',
                  ].filter(Boolean).join(' ')}
                  style={isLocked ? {
                    opacity: 0.35,
                    cursor: 'not-allowed',
                    pointerEvents: 'none',
                    userSelect: 'none',
                  } : undefined}
                >
                  {badge && (
                    <span className={`bundle-badge ${badge === 'BEST ODDS' ? 'badge-gold' : 'badge-navy'}`}>
                      {badge}
                    </span>
                  )}
                  {isLocked && (
                    <span className="bundle-badge badge-navy" style={{ opacity: 0.6 }}>
                      SOLD OUT
                    </span>
                  )}
                  <span className="bc-qty">{opt.qty}</span>
                  <span className="bc-label">{opt.qty === 1 ? 'Entry' : 'Tickets'}</span>
                  <span className={`bc-price${isFree ? ' bc-price-free' : ''}`}>
                    {priceLabel(opt.qty)}
                  </span>
                  <span className="bc-odds">1 in {bundleOdds}</span>
                </div>
              )
            })}
          </div>

          {/* ── Custom amount slider — hidden for single-entry (free) comps ── */}
          {showSlider && (
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
                  max={allowedMaxQty}
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
                  disabled={selectedQty >= allowedMaxQty}
                >+</button>
              </div>
              <div className="slider-cap">
                {`Maximum ${allowedMaxQty} ${allowedMaxQty === 1 ? 'ticket' : 'tickets'} per person for this competition`}
              </div>
            </div>
          )}

          {/* ── Odds summary panel ── */}
          <div className="odds-panel">
            <div className="odds-panel-row">
              <div className="op-left">
                <div className="op-eyebrow">Your odds</div>
                <div className="op-fraction">1 in {odds}</div>
              </div>
              <div className="op-right">
                <div className="op-detail">
                  {selectedQty} {selectedQty === 1 ? 'entry' : 'entries'} &middot;{' '}
                  {isFree ? <span style={{ color: 'var(--green)', fontWeight: 600 }}>FREE</span> : fmt(subtotal)}
                </div>
                <div className="op-bar-track">
                  <div className="op-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="op-bar-label">
                  {allowedMaxQty === 1
                    ? 'One entry per member for this competition'
                    : `${Math.round(pct)}% of your maximum entries`
                  }
                </div>
              </div>
            </div>
            <p className="op-note">*Odds based on current entries sold. Your odds may change as sales progress.</p>
          </div>

          <div className="entry-divider" />

          {/* ── Subtotal row ── */}
          <div className="subtotal-row">
            <div>
              <div className="sr-left">
                Order Total{' '}
                <span>
                  ({selectedQty} {selectedQty === 1 ? 'entry' : 'tickets'})
                </span>
              </div>
              {!isFree && (
                <div className="sr-per">{fmt(c.entryPrice)} &times; {selectedQty}</div>
              )}
            </div>
            <div className={`sr-amount${isFree ? ' sr-amount-free' : ''}`}>
              {isFree ? 'FREE' : fmt(subtotal)}
            </div>
          </div>

          {/* ── Continue ── */}
          <button className="btn-continue" onClick={onContinue}>
            Continue
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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
            {isFree ? 'Free entry · ' : 'Secure checkout · '}
            A skill-based question is required. Your answer will be recorded with your entry.
            This is a skill competition — <Link href="/terms">view full terms</Link>. 18+ only.
          </div>
        </div>

      </div>
    </div>
  )
}
