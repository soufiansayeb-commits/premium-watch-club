'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Competition } from '@/lib/competition-data'
import { useCart } from '@/context/CartContext'
import { bundleLineTotal, getEligibleTiers } from '@/lib/bundle-discounts'
import { useBundleConfig } from '@/context/BundleConfigContext'
import { trackEvent } from '@/lib/analytics'

// ── Icons ──────────────────────────────────────────────────────────────────────

const TpStar = () => (
  <div className="tp-star">
    <svg viewBox="0 0 10 10" fill="white">
      <path d="M5 1l1.2 2.4L9 3.8 7 5.7l.5 2.8L5 7.1 2.5 8.5 3 5.7 1 3.8l2.8-.4z" />
    </svg>
  </div>
)

const TrashIcon = () => (
  <svg
    width="13" height="13" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
)

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  competition: Competition
  selectedQty: number
  selectedAnswer: string | null
  onBack: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CheckoutStep({
  competition: c,
  selectedQty,
  selectedAnswer,
  onBack,
}: Props) {
  // All cart items — used for the full order summary
  const { items, removeItem, updateQuantity, prepareCheckout } = useCart()
  const bundleConfig = useBundleConfig()

  const fmt = (n: number, currency: string = c.currency) => `${currency}${n.toFixed(2)}`

  // Qty stepper state — only applies to the current competition (paid comps)
  const entriesRemaining = c.ticketsLeft > 0 ? c.ticketsLeft : c.maxTicketsPerPurchase
  const allowedMaxQty    = Math.min(c.maxTicketsPerPurchase, entriesRemaining)
  const [qty, setQty]    = useState(() => Math.min(selectedQty, allowedMaxQty))

  const [isSyncing,  setIsSyncing]  = useState(false)
  const [syncError,  setSyncError]  = useState<string | null>(null)

  // ── Debug logging — runs whenever cart items change ─────────────────────────
  useEffect(() => {
    // URL inspection
    const url        = typeof window !== 'undefined' ? window.location.href : ''
    let addToCartParam: string | null = null
    let quantityParam: string | null  = null

    try {
      const urlObj    = new URL(url)
      addToCartParam  = urlObj.searchParams.get('add-to-cart')
      quantityParam   = urlObj.searchParams.get('quantity')
    } catch { /* non-browser env */ }

    console.log('[PWC Checkout] === CHECKOUT STEP ===')
    console.log('[PWC Checkout] URL:', url)

    if (addToCartParam) {
      console.warn(
        `[PWC Checkout] ⚠️  add-to-cart param found in URL (product ${addToCartParam}).` +
        ` This may auto-add that product to the WooCommerce cart when checkout opens!` +
        ` This should not happen — check buildCheckoutUrl() / prepareCheckout().`
      )
    } else {
      console.log('[PWC Checkout] add-to-cart param: none ✓')
    }
    console.log('[PWC Checkout] quantity param:', quantityParam ?? 'none')

    console.log(`[PWC Checkout] Cart items (${items.length}):`)
    items.forEach((item, idx) => {
      console.log(
        `  [${idx + 1}] ` +
        `key=${item.wooCartItemKey ?? '(no key)'} | ` +
        `id=${item.wooProductId} | ` +
        `name="${item.title}" | ` +
        `qty=${item.quantity} | ` +
        `price=${item.price} | ` +
        `lineTotal=${item.total} | ` +
        `${item.isFreeCompetition ? 'FREE' : 'PAID'}`
      )
    })

    console.log('[PWC Checkout] Rendered order summary items (in order):',
      items.map(i => `"${i.title}" ×${i.quantity} (${i.isFreeCompetition ? 'FREE' : `${i.currency}${i.total.toFixed(2)}`})`)
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, items.map(i => i.competitionId + i.quantity).join(',')])

  // ── Derived totals from ALL cart items ─────────────────────────────────────
  // For the current competition, override quantity from local stepper state
  // so the displayed total stays live while the user adjusts the stepper.
  const displayItems = items.map(item => {
    // Apply the local stepper quantity to the current competition so the order
    // total reflects the stepper before the user submits.
    // Use allowedMaxQty > 1 (not price > 0) so free multi-entry competitions
    // also get live stepper feedback. Free items have price=0 so total stays 0.
    if (item.competitionId === c.id && allowedMaxQty > 1) {
      const tiers = getEligibleTiers(bundleConfig, c.competitionType, item.price, item.isFreeCompetition)
      return {
        ...item,
        quantity: qty,
        total: bundleLineTotal(item.price, tiers, qty),
      }
    }
    return item
  })

  const grandTotal   = displayItems.reduce((sum, i) => sum + i.total, 0)
  const grandCurrency = displayItems[0]?.currency ?? c.currency
  // Derive allFree from live prices, not from the stale isFreeCompetition flag in cart
  const allFree      = displayItems.every(i => i.price === 0)

  // ── Checkout handler ───────────────────────────────────────────────────────
  async function handleContinueToCheckout() {
    if (isSyncing || items.length === 0) return
    setSyncError(null)
    setIsSyncing(true)

    // Flush local stepper qty back into the cart store before sync.
    // Always sync — even for free multi-entry competitions (qty can be > 1).
    // Using allowedMaxQty > 1 as the guard ensures single-entry comps (max=1) are
    // not unnecessarily updated, but the correct fix for multi-entry free comps
    // is to always persist whatever qty the stepper shows.
    updateQuantity(c.id, qty)

    const url = await prepareCheckout()
    setIsSyncing(false)

    if (!url) {
      setSyncError(
        'Could not sync your cart with checkout. Please try again. ' +
        'If this keeps happening, contact support.'
      )
      return
    }

    trackEvent('begin_checkout', {
      competitionId: c.id,
      slug:          c.slug,
      wooProductId:  c.wooProductId,
      quantity:      qty,
      grandTotal,
      itemCount:     items.length,
    })

    window.location.href = url
  }

  // ── Empty-cart guard ───────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="step-panel active" id="panel-step-3">
        <div className="checkout-card">
          <div className="checkout-body chk-empty-body">
            <div className="chk-empty-icon" aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 36 36" fill="none">
                <circle cx="13" cy="31" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="27" cy="31" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M2 4h4.5l4.5 18H28l4-12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="chk-empty-title">Your cart is empty</p>
            <p className="chk-empty-sub">
              Add an entry to a competition before proceeding to checkout.
            </p>
            <Link href="/#competitions-grid" className="btn-pay chk-empty-btn">
              Browse Competitions
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Main checkout summary ──────────────────────────────────────────────────
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

            {/* ── Order summary — renders ALL cart items ─────────────────── */}
            <div className="order-summary">
              <div className="os-title">Order Summary</div>

              {displayItems.map((item) => {
                const isCurrentComp = item.competitionId === c.id
                // Derive paid/free from live price, not from isFreeCompetition flag stored
                // in the cart. The flag is set at add-to-cart time and can be stale if the
                // product changed from free→paid after the item was added.
                return (
                  <div key={item.competitionId} className="os-row os-item-row">

                    {/* Left: name + qty control */}
                    <div className="os-item-info">
                      <span className="label os-item-name">{item.title}</span>

                      {/* Qty stepper for the current competition when multiple entries
                          are allowed (allowedMaxQty > 1). Works for both paid AND
                          free multi-entry competitions. For single-entry comps (max=1)
                          or other cart items, show a static badge. */}
                      {isCurrentComp && allowedMaxQty > 1 ? (
                        <div className="qty-stepper os-stepper">
                          <button
                            className="qty-btn"
                            onClick={() => setQty(q => Math.max(1, q - 1))}
                            disabled={qty <= 1}
                            aria-label="Remove one ticket"
                          >−</button>
                          <span className="qty-value">{qty}</span>
                          <button
                            className="qty-btn"
                            onClick={() => setQty(q => Math.min(allowedMaxQty, q + 1))}
                            disabled={qty >= allowedMaxQty}
                            aria-label="Add one ticket"
                          >+</button>
                        </div>
                      ) : (
                        <span className="os-qty-badge">
                          × {item.quantity}
                        </span>
                      )}
                    </div>

                    {/* Right: price + trash button */}
                    <div className="os-item-right">
                      <span className="value">
                        {item.price === 0 ? (
                          <span className="os-free-label">FREE</span>
                        ) : (
                          fmt(item.total, item.currency)
                        )}
                      </span>

                      <button
                        type="button"
                        className="os-remove-btn"
                        onClick={() => removeItem(item.competitionId)}
                        aria-label={`Remove ${item.title} from cart`}
                        title="Remove from cart"
                      >
                        <TrashIcon />
                      </button>
                    </div>

                  </div>
                )
              })}

              {/* Skill answer row (current competition only) */}
              {selectedAnswer && (
                <div className="os-row">
                  <span className="label">Skill answer</span>
                  <span className="value" style={{ color: 'var(--green)' }}>
                    {selectedAnswer}
                  </span>
                </div>
              )}

              {/* Grand total */}
              <div className="os-row total">
                <span className="label">Total</span>
                <span className="value">
                  {allFree ? (
                    <span style={{ color: 'var(--green)', fontWeight: 700 }}>FREE</span>
                  ) : (
                    fmt(grandTotal, grandCurrency)
                  )}
                </span>
              </div>
            </div>

            {/* Skill answer disclaimer */}
            <div className="skill-note-subtle">
              Your selected answer will be recorded with your entry. Only entries with the correct answer are eligible for the final draw.
            </div>

            {/* Sync / checkout error */}
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
                disabled={isSyncing || items.length === 0}
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
