'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useCart } from '@/context/CartContext'
import { useBundleConfig } from '@/context/BundleConfigContext'
import { useMoney } from '@/context/StoreSettingsContext'
import { resolveLinePricing } from '@/lib/bundle-pricing'
import { getAllowedMaxQty } from '@/lib/quantity-limits'
import { trackEvent } from '@/lib/analytics'
import type { CartItem } from '@/lib/cartStore'

function QuantityStepper({
  item,
  onUpdate,
  onRemove,
}: {
  item: CartItem
  onUpdate: (competitionId: string, qty: number) => void
  onRemove: (competitionId: string) => void
}) {
  // Same allowed-max the PDP ticket selector uses — resolved from the product's
  // per-member cap (carried on the cart item), never a hardcoded number. Stock is
  // enforced by WooCommerce at checkout, so the drawer caps on policy only.
  const max = getAllowedMaxQty({ maxTicketsPerPurchase: item.maxTicketsPerPurchase })
  const min = 1

  function dec() {
    if (item.quantity <= min) {
      onRemove(item.competitionId)
    } else {
      onUpdate(item.competitionId, item.quantity - 1)
    }
  }

  function inc() {
    if (item.quantity >= max) return
    onUpdate(item.competitionId, item.quantity + 1)
  }

  return (
    <div className="cd-qty-stepper" role="group" aria-label="Ticket quantity">
      <button
        className="cd-qty-btn"
        onClick={dec}
        aria-label={item.quantity <= min ? 'Remove entry' : 'Decrease quantity'}
      >
        {item.quantity <= min ? (
          // Trash icon when at minimum
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
        ) : (
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
            <path d="M1.5 5.5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        )}
      </button>
      <span className="cd-qty-num" aria-live="polite" aria-atomic="true">
        {item.quantity}
      </span>
      <button
        className="cd-qty-btn"
        onClick={inc}
        disabled={item.quantity >= max}
        aria-label="Increase quantity"
      >
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
          <path d="M5.5 1.5v8M1.5 5.5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

export default function CartDrawer() {
  const { items, itemCount, isOpen, closeDrawer, removeItem, updateQuantity, prepareCheckout } = useCart()
  // Live backend-driven bundle rules — the SAME source the ticket cards and Woo
  // checkout use. Recomputing here keeps the drawer preview in lock-step.
  const bundleConfig = useBundleConfig()
  // Live Woo currency — ignores each item's stored symbol so prices always follow
  // the current WooCommerce currency, even for items added before it changed.
  const fmt = useMoney()
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  const hasItems = items.length > 0
  // Grand total from the live discounted line totals (not the stored item.total).
  const grandTotal = items.reduce(
    (sum, i) => sum + resolveLinePricing(bundleConfig, i).discountedSubtotal,
    0,
  )
  const allFree = items.every((i) => i.isFreeCompetition)

  async function handleContinueToCheckout() {
    if (!hasItems || isSyncing) return
    setSyncError(null)
    setIsSyncing(true)

    const url = await prepareCheckout()

    setIsSyncing(false)

    if (!url) {
      setSyncError('Could not connect to checkout. Please try again or contact support.')
      return
    }

    trackEvent('begin_checkout', {
      itemCount,
      grandTotal,
      items: items.map((i) => ({
        competitionId: i.competitionId,
        wooProductId: i.wooProductId,
        quantity: i.quantity,
        total: i.total,
      })),
    })

    window.location.href = url
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`cart-overlay${isOpen ? ' open' : ''}`}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Slide-in drawer */}
      <aside
        className={`cart-drawer${isOpen ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Your entry basket"
      >
        {/* ── Header ── */}
        <div className="cd-header">
          <div className="cd-header-left">
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
              <circle cx="6.5" cy="14.5" r="1.5" fill="currentColor" />
              <circle cx="12.5" cy="14.5" r="1.5" fill="currentColor" />
              <path d="M1 1.5h2.5l2.5 8.5h7L15.5 5H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="cd-title">Your {items.length === 1 ? 'Entry' : 'Entries'}</span>
            {hasItems && <span className="cd-badge">{itemCount}</span>}
          </div>
          <button className="cd-close" onClick={closeDrawer} aria-label="Close basket">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <path d="M2 2l11 11M13 2L2 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="cd-body">
          {!hasItems ? (
            <div className="cd-empty">
              <div className="cd-empty-icon">
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                  <circle cx="13" cy="31" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="27" cy="31" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M2 4h4.5l4.5 18H28l4-12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="cd-empty-title">No entry selected</div>
              <div className="cd-empty-sub">
                Select a competition and complete the entry flow to add an entry to your basket.
              </div>
            </div>
          ) : (
            <>
              {items.map((item) => {
                // Live discount preview for this line (0 discount when ineligible).
                const pricing = resolveLinePricing(bundleConfig, item)
                return (
                <div key={item.competitionId} className="cd-item-block">
                  {/* ── Competition item ── */}
                  <div className="cd-item">
                    {item.image && (
                      <div className="cd-item-img-wrap">
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          className="cd-item-img"
                          style={{ objectFit: 'cover' }}
                          draggable={false}
                        />
                      </div>
                    )}
                    <div className="cd-item-info">
                      <div className="cd-item-comp-type">
                        {item.isFreeCompetition ? 'Free Competition' : 'Paid Competition'}
                      </div>
                      <div className="cd-item-title">{item.title}</div>
                      <div className="cd-item-qty-line">
                        {item.isFreeCompetition ? 'FREE' : fmt(item.price)} per ticket
                      </div>
                    </div>
                  </div>

                  {/* ── Order rows ── */}
                  <div className="cd-rows">
                    {/* Quantity row with stepper */}
                    <div className="cd-row cd-row-qty">
                      <span className="cd-row-label">Tickets</span>
                      <QuantityStepper
                        item={item}
                        onUpdate={updateQuantity}
                        onRemove={removeItem}
                      />
                    </div>
                    <div className="cd-row">
                      <span className="cd-row-label">Price per ticket</span>
                      <span className="cd-row-val">
                        {item.isFreeCompetition
                          ? <span className="cd-free">FREE</span>
                          : fmt(item.price)}
                      </span>
                    </div>
                    <div className="cd-row">
                      <span className="cd-row-label">Skill answer</span>
                      <span className="cd-row-val cd-answer">{item.selectedSkillAnswer}</span>
                    </div>
                    <div className="cd-row cd-row-total">
                      <span className="cd-row-label">Subtotal</span>
                      <span className="cd-row-val">
                        {item.isFreeCompetition ? (
                          <span className="cd-free">FREE</span>
                        ) : pricing.discounted ? (
                          <span className="cd-subtotal-wrap">
                            <span className="cd-subtotal-was">{fmt(pricing.originalSubtotal)}</span>
                            <span className="cd-subtotal-now">{fmt(pricing.discountedSubtotal)}</span>
                          </span>
                        ) : (
                          fmt(pricing.discountedSubtotal)
                        )}
                      </span>
                    </div>
                    {!item.isFreeCompetition && pricing.discounted && (
                      <div className="cd-row cd-row-discount">
                        <span className="cd-row-label">Bundle discount</span>
                        <span className="cd-discount-val">
                          {pricing.discountPercent}% off &middot; You saved {fmt(pricing.savings)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ── Skill note ── */}
                  <div className="cd-skill-note">
                    Your selected answer will be recorded with your entry. Only entries with the correct answer are eligible for the final draw.
                  </div>

                  {/* ── Remove ── */}
                  <button className="cd-remove-btn" onClick={() => removeItem(item.competitionId)}>
                    Remove entry
                  </button>
                </div>
                )
              })}

              {/* ── Grand total (shown when multiple items) ── */}
              {items.length > 1 && (
                <div className="cd-grand-total">
                  <span className="cd-row-label">Order Total</span>
                  <span className="cd-row-val">
                    {allFree
                      ? <span className="cd-free">FREE</span>
                      : fmt(grandTotal)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer CTA ── */}
        <div className="cd-footer">
          {syncError && (
            <div className="cd-no-checkout-notice" role="alert">
              {syncError}
            </div>
          )}

          <button
            className="cd-checkout-btn"
            onClick={handleContinueToCheckout}
            disabled={!hasItems || isSyncing}
          >
            {isSyncing
              ? 'Preparing checkout...'
              : !hasItems
              ? 'No entry selected'
              : 'Continue to Checkout'}
            {!isSyncing && hasItems && (
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                <path d="M2.5 7.5h10M9 3.5l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          <div className="cd-footer-secure">
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
              <path d="M5.5 1L1.5 3v2.5C1.5 7.9 3.3 10 5.5 10.2 7.7 10 9.5 7.9 9.5 5.5V3L5.5 1z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
            </svg>
            Secure checkout · 18+ only · Skill competition
          </div>
        </div>
      </aside>
    </>
  )
}
