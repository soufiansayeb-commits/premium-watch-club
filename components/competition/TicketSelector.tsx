'use client'

import Link from 'next/link'
import { Competition } from '@/lib/competition-data'
import { isSoldOut } from '@/lib/competition-status'
import TrustpilotProof from '@/components/TrustpilotProof'
import SoldProgress from '@/components/competition/SoldProgress'
import {
  discountPercentForQty,
  bundleLineTotal,
  fullLineTotal,
  bundleSaving,
  getEligibleTiers,
  bundleCardQuantities,
} from '@/lib/bundle-discounts'
import { useBundleConfig } from '@/context/BundleConfigContext'

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
  const isFree = !!c.isFree

  // Live bundle-discount rules — the single source of truth shared with the
  // WooCommerce backend (WooCommerce → PWC Bundle Discounts). getEligibleTiers
  // returns [] when this competition is not eligible, so we only ever display a
  // discount the checkout will actually charge. Never hardcode tiers or prices.
  const bundleConfig = useBundleConfig()
  const tiers = getEligibleTiers(bundleConfig, c.competitionType, c.entryPrice, isFree)

  // Bundle cards follow the active tiers (plus the single-entry base). Falls back
  // to the competition's own ticket options when no discounts apply.
  const cardQtys = bundleCardQuantities(tiers, c.ticketOptions.map(o => o.qty))
  // The badged tier with the highest threshold gets the "hero" gold treatment.
  const badgedQtys = tiers.filter(t => t.badge).map(t => t.minQty)
  const heroQty = badgedQtys.length ? Math.max(...badgedQtys) : null

  // Bundle-aware totals (discount enforced server-side by pwc-ticket-bundle-discounts.php;
  // these mirror the SAME live rules for display).
  const subtotal     = bundleLineTotal(c.entryPrice, tiers, selectedQty)
  const fullSubtotal = fullLineTotal(c.entryPrice, selectedQty)
  const subtotalSave = bundleSaving(c.entryPrice, tiers, selectedQty)
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

  function priceLabel(qty: number): string {
    if (isFree) return 'FREE'
    return fmt(bundleLineTotal(c.entryPrice, tiers, qty))
  }

  return (
    <div className="step-panel active" id="panel-step-1">
      <div className="entry-card">

        <div className="entry-card-header entry-card-header--main">
          <div className="ech-eyebrow">Win the Prize</div>
          <div className="ech-title">{c.title}</div>
          <div className="ech-price-line">
            {isFree ? (
              <><strong style={{ color: 'var(--green)' }}>Free entry</strong>, no purchase required</>
            ) : (
              <><strong>{fmt(c.entryPrice)}</strong> per entry</>
            )}
          </div>
        </div>

        <div className="entry-card-body">
          {/* Live scarcity meter — same dynamic sold%/tickets-left the hero shows,
              rendered natively above the ticket bundle. Paid comps only. */}
          {!isFree && c.totalTickets > 0 && (
            <SoldProgress soldPercentage={c.soldPercentage} ticketsLeft={c.ticketsLeft} />
          )}

          <div className="tickets-label">
            {isFree ? 'Your entry:' : 'Select your tickets:'}
          </div>

          {/* ── Bundle / entry grid ── */}
          <div className="bundle-grid">
            {cardQtys.map(qty => {
              // Lock based solely on allowedMaxQty — works for both free and paid products.
              // sold_individually=true → allowedMaxQty=1 → all options >1 are locked.
              // Never lock based on isFree alone; a free product can allow multiple entries
              // if sold_individually is false.
              const isLocked = qty > allowedMaxQty
              // Badge text comes from the backend tier for this exact quantity.
              const tier = tiers.find(t => t.minQty === qty)
              const badge = isLocked ? '' : (tier?.badge ?? '')
              const isSelected = selectedQty === qty
              const isHero = !isLocked && heroQty !== null && qty === heroQty
              const isLarge = qty >= 10
              // Odds based on entries sold (same WWC model as the summary panel)
              const effectiveQty = Math.min(qty, allowedMaxQty)
              const bundlePool = entriesSold + effectiveQty
              const bundleOdds = Math.max(1, Math.ceil(bundlePool / effectiveQty))
              // Bundle discount (paid comps only — free comps show FREE, no savings)
              const savePct  = isFree ? 0 : discountPercentForQty(tiers, qty)
              const fullCost = isFree ? 0 : fullLineTotal(c.entryPrice, qty)

              return (
                <div
                  key={qty}
                  role="button"
                  aria-pressed={isSelected && !isLocked}
                  aria-disabled={isLocked}
                  onClick={() => !isLocked && onQtyChange(qty)}
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
                    <span className={`bundle-badge ${isHero ? 'badge-gold' : 'badge-navy'}`}>
                      {badge}
                    </span>
                  )}
                  {isLocked && (
                    <span className="bundle-badge badge-navy" style={{ opacity: 0.6 }}>
                      SOLD OUT
                    </span>
                  )}
                  <span className="bc-qty">{qty}</span>
                  <span className="bc-label">{qty === 1 ? 'Entry' : 'Tickets'}</span>
                  <span className={`bc-price${isFree ? ' bc-price-free' : ''}`}>
                    {priceLabel(qty)}
                  </span>
                  {savePct > 0 ? (
                    <span className="bc-save">
                      <span className="bc-save-full">{fmt(fullCost)}</span>
                      <span className="bc-save-pct">Save {savePct}%</span>
                    </span>
                  ) : (
                    <span className="bc-save bc-save-empty" aria-hidden="true" />
                  )}
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
            <div className="sr-right">
              {!isFree && subtotalSave > 0 && (
                <span className="sr-full">{fmt(fullSubtotal)}</span>
              )}
              <div className={`sr-amount${isFree ? ' sr-amount-free' : ''}`}>
                {isFree ? 'FREE' : fmt(subtotal)}
              </div>
              {!isFree && subtotalSave > 0 && (
                <span className="sr-save">You save {fmt(subtotalSave)} ({discountPercentForQty(tiers, selectedQty)}%)</span>
              )}
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

        {/* Desktop-only Trustpilot proof inside the buy box */}
        <TrustpilotProof className="tp-proof--buybox" />

        <div className="entry-card-footer">
          <svg width="15" height="15" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }} aria-hidden="true">
            <path d="M9 2L3 5v4c0 3.31 2.58 6.41 6 7.17C12.42 15.41 15 12.31 15 9V5L9 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            <path d="M6.5 9l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className="ecf-text">
            Every winner is{' '}
            <a href="https://www.randomdraws.com/" target="_blank" rel="noopener noreferrer">
              independently verified by RandomDraws
            </a>
            <span className="ecf-legal">Skill competition · 18+ · <Link href="/terms">Full terms</Link></span>
          </div>
        </div>

      </div>
    </div>
  )
}
