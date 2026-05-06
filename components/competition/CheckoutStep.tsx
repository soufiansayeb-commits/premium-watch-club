'use client'

import { Competition } from '@/lib/competition-data'

interface Props {
  competition: Competition
  selectedQty: number
  selectedAnswer: string | null
  onBack: () => void
}

const TpStar = () => (
  <div className="tp-star">
    <svg viewBox="0 0 10 10" fill="white">
      <path d="M5 1l1.2 2.4L9 3.8 7 5.7l.5 2.8L5 7.1 2.5 8.5 3 5.7 1 3.8l2.8-.4z"/>
    </svg>
  </div>
)

export default function CheckoutStep({ competition: c, selectedQty, selectedAnswer, onBack }: Props) {
  const fmt = (n: number) => `${c.currency}${n.toFixed(2)}`
  const total = selectedQty * c.entryPrice

  function handlePay() {
    /*
     * TODO: WooCommerce integration.
     * Build the WooCommerce cart URL or POST to REST API:
     *   POST /wp-json/wc/v3/cart/add-item
     *     { product_id: c.wooProductId, quantity: selectedQty }
     * Then redirect to: c.checkoutUrl
     * Pass skill answer via order meta: selectedAnswer
     */
    alert('Payment integration coming soon. This will redirect to WooCommerce checkout.')
  }

  return (
    <>
      <div className="step-panel active" id="panel-step-3">
        <div className="checkout-card">
          <div className="checkout-header">
            <div className="chk-eyebrow">Final Step</div>
            <div className="chk-title">Review &amp; Pay</div>
          </div>
          <div className="checkout-body">

            {/* Order Summary */}
            <div className="order-summary">
              <div className="os-title">Order Summary</div>
              <div className="os-row">
                <span className="label">Competition</span>
                <span className="value">{c.title}</span>
              </div>
              <div className="os-row">
                <span className="label">Tickets</span>
                <span className="value">{selectedQty} {selectedQty === 1 ? 'ticket' : 'tickets'}</span>
              </div>
              <div className="os-row">
                <span className="label">Price per ticket</span>
                <span className="value">{fmt(c.entryPrice)}</span>
              </div>
              <div className="os-row">
                <span className="label">Skill answer</span>
                <span className="value" style={{ color: 'var(--green)' }}>{selectedAnswer}</span>
              </div>
              <div className="os-row total">
                <span className="label">Total</span>
                <span className="value">{fmt(total)}</span>
              </div>
            </div>

            {/*
              CHECKOUT FORM PLACEHOLDER
              ══════════════════════════════════════════════════
              TODO: Connect to WooCommerce checkout.
              - Product ID maps to competition.wooProductId
              - Quantity = selectedQty
              - Skill answer = selectedAnswer
              - Redirect to: competition.checkoutUrl with ?qty=N&answer=X
              - Payment: WooCommerce Stripe / PayPal gateway
              ══════════════════════════════════════════════════
            */}
            <div className="customer-form-placeholder">
              <div className="cfp-icon">🛒</div>
              <div className="cfp-title">WooCommerce Checkout</div>
              <div className="cfp-sub">
                Customer details, payment, and order processing will be handled<br />
                via WooCommerce. This section will be wired up in the next phase.
              </div>
              <div className="cfp-badge">Coming Soon — WooCommerce Integration</div>
            </div>

            {/* Security note */}
            <div className="checkout-security">
              <div className="cs-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 2L3 5v4c0 3.31 2.58 6.41 6 7.17C12.42 15.41 15 12.31 15 9V5L9 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                  <path d="M6.5 9l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="cs-text">
                Payments are processed securely via Stripe. Your card details are never stored on our servers. All entries are recorded and timestamped.
              </div>
            </div>

            <div className="checkout-actions">
              <button className="btn-back" onClick={onBack}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M11 7H3M7 11L3 7l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Back
              </button>
              <button className="btn-pay" onClick={handlePay}>
                Complete Entry
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
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
        <div style={{ width: '1px', height: '16px', background: 'var(--border-light)' }}></div>
        <div className="tp-label">Verified by Trustpilot</div>
      </div>
    </>
  )
}
