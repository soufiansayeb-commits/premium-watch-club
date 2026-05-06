'use client'

import Link from 'next/link'
import { Competition } from '@/lib/competition-data'

interface Props {
  competition: Competition
  selectedQty: number
  onQtyChange: (qty: number) => void
  onContinue: () => void
}

export default function TicketSelector({ competition: c, selectedQty, onQtyChange, onContinue }: Props) {
  const fmt = (n: number) => `${c.currency}${n.toFixed(2)}`
  const subtotal = selectedQty * c.entryPrice
  const max = c.maxTicketsPerPurchase

  function handleStepperChange(newVal: number) {
    const clamped = Math.max(1, Math.min(max, newVal))
    onQtyChange(clamped)
  }

  return (
    <div className="step-panel active" id="panel-step-1">
      <div className="entry-card">
        <div className="entry-card-header">
          <div className="ech-eyebrow">Win the Prize</div>
          <div className="ech-title">{c.title}</div>
          <div className="ech-price-line">
            <strong>{fmt(c.entryPrice)}</strong> per entry &nbsp;·&nbsp; How many tickets would you like?
          </div>
        </div>
        <div className="entry-card-body">

          <div className="tickets-label">Select a ticket bundle:</div>

          {/* Ticket options grid */}
          <div className="ticket-grid" id="ticket-grid">
            {c.ticketOptions.map(opt => (
              <div
                key={opt.qty}
                className={`ticket-option${selectedQty === opt.qty ? ' selected' : ''}`}
                onClick={() => onQtyChange(opt.qty)}
              >
                {opt.popular && <div className="to-badge">Most Popular</div>}
                <div className="to-qty">{opt.qty}</div>
                <div className="to-label">{opt.qty === 1 ? 'Ticket' : 'Tickets'}</div>
                <div className="to-subtotal">{fmt(opt.qty * c.entryPrice)}</div>
              </div>
            ))}
          </div>

          {/* Custom quantity stepper */}
          <div className="custom-qty-row">
            <div className="cq-label">Or choose a custom amount:</div>
            <div className="cq-stepper">
              <button
                className="cq-btn"
                aria-label="Decrease"
                onClick={() => handleStepperChange(selectedQty - 1)}
              >−</button>
              <input
                className="cq-val"
                type="number"
                min={1}
                max={max}
                value={selectedQty}
                onChange={e => handleStepperChange(parseInt(e.target.value) || 1)}
              />
              <button
                className="cq-btn"
                aria-label="Increase"
                onClick={() => handleStepperChange(selectedQty + 1)}
              >+</button>
            </div>
          </div>

          <div className="entry-divider"></div>

          {/* Subtotal */}
          <div className="subtotal-row">
            <div>
              <div className="sr-left">
                Order Total <span>({selectedQty} {selectedQty === 1 ? 'ticket' : 'tickets'})</span>
              </div>
              <div className="sr-per">{fmt(c.entryPrice)} × {selectedQty}</div>
            </div>
            <div className="sr-amount">{fmt(subtotal)}</div>
          </div>

          {/* Continue */}
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
            Secure checkout · A correct skill-based answer is required to win.
            This is a skill competition — <Link href="/terms">view full terms</Link>.
            18+ only.
          </div>
        </div>
      </div>
    </div>
  )
}
