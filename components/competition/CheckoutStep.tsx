'use client'

import { useState } from 'react'
import { Competition } from '@/lib/competition-data'
import { useCart } from '@/context/CartContext'
import { trackEvent } from '@/lib/analytics'

interface Props {
  competition: Competition
  selectedQty: number
  selectedAnswer: string | null
  onBack: () => void
}

const TpStar = () => (
  <div className="tp-star">
    <svg viewBox="0 0 10 10" fill="white">
      <path d="M5 1l1.2 2.4L9 3.8 7 5.7l.5 2.8L5 7.1 2.5 8.5 3 5.7 1 3.8l2.8-.4z" />
    </svg>
  </div>
)

export default function CheckoutStep({
  competition: c,
  selectedQty,
  selectedAnswer,
  onBack,
}: Props) {
  const fmt = (n: number) => `${c.currency}${n.toFixed(2)}`
  const [qty, setQty] = useState(selectedQty)
  const total = qty * c.entryPrice

  const { prepareCheckout, updateQuantity } = useCart()
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  async function handleContinueToCheckout() {
    if (isSyncing) return
    setSyncError(null)
    setIsSyncing(true)

    updateQuantity(c.id, qty)
    const url = await prepareCheckout()

    setIsSyncing(false)

    if (!url) {
      setSyncError('Could not connect to checkout. Please try again or contact support.')
      return
    }

    trackEvent('begin_checkout', {
      competitionId: c.id,
      slug: c.slug,
      wooProductId: c.wooProductId,
      quantity: qty,
      total,
    })

    window.location.href = url
  }

  return (
    <>
      <div className="step-panel active" id="panel-step-3">
        <div className="checkout-card">

          <div className="checkout-header">
            <div className="chk-eyebrow">Final Step</div>
            <div className="chk-title">Entry Summary</div>
          </div>

          <div className="checkout-body">

            {/* Entry added confirmation */}
            <div className="entry-added-notice">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 7l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Entry added to your basket
            </div>

            {/* Order summary */}
            <div className="order-summary">
              <div className="os-title">Order Summary</div>
              <div className="os-row">
                <span className="label">Competition</span>
                <span className="value">{c.title}</span>
              </div>
              <div className="os-row">
                <span className="label">Tickets</span>
                <div className="qty-stepper">
                  <button
                    className="qty-btn"
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                    aria-label="Remove ticket"
                  >−</button>
                  <span className="qty-value">{qty}</span>
                  <button
                    className="qty-btn"
                    onClick={() => setQty(q => q + 1)}
                    aria-label="Add ticket"
                  >+</button>
                </div>
              </div>
              {!c.isFree && (
                <div className="os-row">
                  <span className="label">Price per ticket</span>
                  <span className="value">{fmt(c.entryPrice)}</span>
                </div>
              )}
              <div className="os-row">
                <span className="label">Skill answer</span>
                <span className="value" style={{ color: 'var(--green)' }}>
                  {selectedAnswer}
                </span>
              </div>
              <div className="os-row total">
                <span className="label">Total</span>
                <span className="value">
                  {c.isFree ? (
                    <span style={{ color: 'var(--green)', fontWeight: 700 }}>FREE</span>
                  ) : (
                    fmt(total)
                  )}
                </span>
              </div>
            </div>

            {/* Skill answer note */}
            <div className="skill-note-subtle">
              Your selected answer will be recorded with your entry. Only entries with the correct answer are eligible for the final draw.
            </div>

            {/* Sync/checkout error */}
            {syncError && (
              <div className="cart-error-notice" role="alert">
                {syncError}
              </div>
            )}

            {/* Security note */}
            <div className="checkout-security">
              <div className="cs-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M9 2L3 5v4c0 3.31 2.58 6.41 6 7.17C12.42 15.41 15 12.31 15 9V5L9 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                  <path d="M6.5 9l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="cs-text">
                Payments are processed securely via Stripe. Your card details are never stored on our servers. All entries are recorded and timestamped.
              </div>
            </div>

            <div className="checkout-actions">
              <button className="btn-back" onClick={onBack} disabled={isSyncing}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M11 7H3M7 11L3 7l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back
              </button>
              <button
                className="btn-pay"
                onClick={handleContinueToCheckout}
                disabled={isSyncing}
              >
                {isSyncing ? 'Preparing...' : 'Continue to Checkout'}
                {!isSyncing && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Trustpilot strip */}
      <div className="tp-strip">
        <div className="tp-label">Rated Excellent</div>
        <div className="tp-stars-row">
          <TpStar /><TpStar /><TpStar /><TpStar /><TpStar />
        </div>
        <div className="tp-score">4.9 · 3,000+ reviews</div>
        <div style={{ width: '1px', height: '16px', background: 'var(--border-light)' }} />
        <div className="tp-label">Verified by Trustpilot</div>
      </div>
    </>
  )
}
