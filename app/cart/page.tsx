'use client'

import { useState } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useCart } from '@/context/CartContext'
import { trackEvent } from '@/lib/analytics'
import type { CartItem } from '@/lib/cartStore'

function fmt(amount: number, currency: string): string {
  return `${currency}${amount.toFixed(2)}`
}

function QuantityStepper({
  item,
  onUpdate,
  onRemove,
}: {
  item: CartItem
  onUpdate: (competitionId: string, qty: number) => void
  onRemove: (competitionId: string) => void
}) {
  const max = item.maxTicketsPerPurchase ?? 999
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
    <div className="cp-qty-stepper" role="group" aria-label="Ticket quantity">
      <button
        className="cp-qty-btn"
        onClick={dec}
        aria-label={item.quantity <= min ? 'Remove entry' : 'Decrease quantity'}
      >
        {item.quantity <= min ? (
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
      <span className="cp-qty-num" aria-live="polite" aria-atomic="true">
        {item.quantity}
      </span>
      <button
        className="cp-qty-btn"
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

export default function CartPage() {
  const { items, itemCount, removeItem, updateQuantity, prepareCheckout } = useCart()
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  const hasItems = items.length > 0
  const grandTotal = items.reduce((sum, i) => sum + i.total, 0)
  const grandCurrency = items[0]?.currency ?? '£'
  const allFree = items.every((i) => i.isFreeCompetition)

  async function handleCheckout() {
    if (!hasItems || isSyncing) return
    setSyncError(null)
    setIsSyncing(true)

    const url = await prepareCheckout()
    setIsSyncing(false)

    if (!url) {
      setSyncError(
        'Could not sync your cart with checkout — please try again. ' +
        'If this keeps happening, check your browser console for the exact error.'
      )
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
      <Header />

      <main className="cp-main">
        <div className="cp-container">

          <div className="cp-heading">
            <h1 className="cp-title">Your Basket</h1>
            {hasItems && (
              <span className="cp-count">{itemCount} {itemCount === 1 ? 'entry' : 'entries'}</span>
            )}
          </div>

          {!hasItems ? (
            <div className="cp-empty">
              <div className="cp-empty-icon">
                <svg width="52" height="52" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                  <circle cx="13" cy="31" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="27" cy="31" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M2 4h4.5l4.5 18H28l4-12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className="cp-empty-title">No entries selected</h2>
              <p className="cp-empty-sub">Browse our competitions and complete the entry flow to add an entry.</p>
              <Link href="/#competitions-grid" className="cp-browse-btn">View Competitions</Link>
            </div>
          ) : (
            <div className="cp-layout">

              {/* ── Items list ── */}
              <div className="cp-items">
                {items.map((item) => (
                  <div key={item.competitionId} className="cp-item-card">
                    {item.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image}
                        alt={item.title}
                        className="cp-item-img"
                        draggable={false}
                      />
                    )}

                    <div className="cp-item-body">
                      <div className="cp-item-meta">
                        {item.isFreeCompetition ? 'Free Competition' : 'Paid Competition'}
                      </div>
                      <div className="cp-item-title">{item.title}</div>

                      <div className="cp-item-rows">
                        <div className="cp-item-row">
                          <span className="cp-row-label">Price per ticket</span>
                          <span className="cp-row-val">
                            {item.isFreeCompetition
                              ? <span className="cp-free">FREE</span>
                              : fmt(item.price, item.currency)}
                          </span>
                        </div>

                        <div className="cp-item-row cp-row-qty">
                          <span className="cp-row-label">Tickets</span>
                          <QuantityStepper
                            item={item}
                            onUpdate={updateQuantity}
                            onRemove={removeItem}
                          />
                        </div>

                        <div className="cp-item-row">
                          <span className="cp-row-label">Skill answer</span>
                          <span className="cp-row-val cp-answer">{item.selectedSkillAnswer}</span>
                        </div>

                        <div className="cp-item-row cp-row-subtotal">
                          <span className="cp-row-label">Subtotal</span>
                          <span className="cp-row-val">
                            {item.isFreeCompetition
                              ? <span className="cp-free">FREE</span>
                              : fmt(item.total, item.currency)}
                          </span>
                        </div>
                      </div>

                      <div className="cp-skill-note">
                        Your selected answer will be recorded with your entry. Only entries with the correct answer are eligible for the final draw.
                      </div>

                      <button
                        className="cp-remove-btn"
                        onClick={() => removeItem(item.competitionId)}
                      >
                        Remove entry
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Order summary ── */}
              <div className="cp-summary-col">
                <div className="cp-summary-card">
                  <div className="cp-summary-title">Order Summary</div>

                  {items.map((item) => (
                    <div key={item.competitionId} className="cp-summary-row">
                      <span className="cp-summary-label">
                        {item.title} <span className="cp-summary-qty">× {item.quantity}</span>
                      </span>
                      <span className="cp-summary-val">
                        {item.isFreeCompetition
                          ? <span className="cp-free">FREE</span>
                          : fmt(item.total, item.currency)}
                      </span>
                    </div>
                  ))}

                  <div className="cp-summary-divider" />

                  <div className="cp-summary-total-row">
                    <span>Estimated Total</span>
                    <span className="cp-summary-total-val">
                      {allFree
                        ? <span className="cp-free">FREE</span>
                        : fmt(grandTotal, grandCurrency)}
                    </span>
                  </div>

                  {syncError && (
                    <div className="cp-error" role="alert">{syncError}</div>
                  )}

                  <button
                    className="cp-checkout-btn"
                    onClick={handleCheckout}
                    disabled={isSyncing}
                  >
                    {isSyncing ? 'Preparing checkout…' : 'Proceed to Checkout'}
                    {!isSyncing && (
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                        <path d="M2.5 7.5h10M9 3.5l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>

                  <div className="cp-secure-note">
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                      <path d="M5.5 1L1.5 3v2.5C1.5 7.9 3.3 10 5.5 10.2 7.7 10 9.5 7.9 9.5 5.5V3L5.5 1z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
                    </svg>
                    Secure checkout · 18+ only · Skill competition
                  </div>
                </div>

                <Link href="/#competitions-grid" className="cp-continue-link">
                  ← Continue browsing
                </Link>
              </div>

            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  )
}
