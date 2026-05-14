'use client'

import Link from 'next/link'
import { Competition } from '@/lib/competition-data'

interface Props {
  competition: Competition
  onContinue: () => void
}

export default function FreeTicketSelector({ competition: c, onContinue }: Props) {
  const odds = c.totalTickets

  return (
    <>
      <style>{`
        /* ── Single-entry ticket card ─────────────────────── */
        .fts-ticket {
          display: flex;
          align-items: center;
          gap: 0;
          border: 1.5px solid var(--gold);
          border-radius: 8px;
          background: var(--gold-bg);
          box-shadow: 0 0 0 3px rgba(197,160,101,0.13);
          padding: 0;
          margin-bottom: 18px;
          overflow: hidden;
          position: relative;
        }

        /* Green "FREE" flag — thin strip on left edge */
        .fts-free-strip {
          width: 4px;
          align-self: stretch;
          background: var(--green);
          flex-shrink: 0;
        }

        /* Main content row inside the card */
        .fts-ticket-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex: 1;
          padding: 16px 20px;
          gap: 12px;
        }

        /* Left: quantity + label */
        .fts-left {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }
        .fts-qty {
          font-family: var(--font-serif);
          font-size: 32px;
          font-weight: 700;
          color: var(--gold-dark);
          line-height: 1;
        }
        .fts-entry-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-mid);
        }

        /* Right: price + odds stacked */
        .fts-right {
          text-align: right;
        }
        .fts-price {
          font-family: var(--font-serif);
          font-size: 22px;
          font-weight: 700;
          color: var(--text-dark);
          line-height: 1;
          margin-bottom: 3px;
        }
        .fts-odds-small {
          font-size: 10px;
          color: var(--text-muted);
          letter-spacing: 0.03em;
        }

        /* FREE badge — top-right corner of card */
        .fts-badge {
          position: absolute;
          top: -1px;
          right: 12px;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--green);
          background: rgba(39, 174, 96, 0.1);
          border: 1px solid rgba(39, 174, 96, 0.28);
          border-top: none;
          border-radius: 0 0 5px 5px;
          padding: 3px 9px 4px;
        }

        /* Per-member note */
        .fts-per-member {
          font-size: 11px;
          color: var(--text-muted);
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .fts-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--green);
          flex-shrink: 0;
        }

        /* ── Odds panel — simplified for single entry ─────── */
        .fts-odds-panel {
          border: 1px solid var(--border-light);
          border-left: 3px solid var(--gold);
          border-radius: 6px;
          padding: 14px 18px;
          margin-bottom: 18px;
          background: linear-gradient(135deg, #FDFCF9 0%, #FAF9F5 100%);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .fts-op-left {}
        .fts-op-eyebrow {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--gold-dark);
          margin-bottom: 2px;
        }
        .fts-op-fraction {
          font-family: var(--font-serif);
          font-size: 26px;
          font-weight: 700;
          color: var(--text-dark);
          line-height: 1;
        }
        .fts-op-right {
          text-align: right;
        }
        .fts-op-detail {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-dark);
          margin-bottom: 3px;
        }
        .fts-op-note {
          font-size: 10px;
          color: var(--text-muted);
          line-height: 1.5;
        }

        /* ── CTA — navy for premium/free distinction ──────── */
        .btn-claim-entry {
          width: 100%;
          padding: 16px 24px;
          background: var(--navy);
          color: #fff;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-family: var(--font-sans);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: background 0.18s, transform 0.14s, box-shadow 0.14s;
          box-shadow: 0 4px 16px rgba(10, 31, 68, 0.18);
        }
        .btn-claim-entry:hover {
          background: #0f2a5a;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(10, 31, 68, 0.26);
        }
        .btn-claim-entry:active { transform: translateY(0); }
        .btn-claim-entry svg { flex-shrink: 0; opacity: 0.8; }

        @media (max-width: 600px) {
          .fts-ticket-inner { padding: 14px 16px; }
          .fts-qty { font-size: 26px; }
          .fts-price { font-size: 18px; }
          .fts-odds-panel { flex-direction: column; align-items: flex-start; gap: 8px; }
          .fts-op-right { text-align: left; }
        }
      `}</style>

      <div className="step-panel active" id="panel-step-1">
        <div className="entry-card">

          <div className="entry-card-header">
            <div className="ech-eyebrow">Win the Prize</div>
            <div className="ech-title">{c.title}</div>
            <div className="ech-price-line">
              <strong style={{ color: 'var(--green)' }}>Free entry</strong>
              <span style={{ marginLeft: 6 }}>— no purchase required</span>
            </div>
          </div>

          <div className="entry-card-body">
            <div className="tickets-label">Select your entry:</div>

            {/* Single compact selected ticket card */}
            <div className="fts-ticket">
              <div className="fts-free-strip" />
              <div className="fts-ticket-inner">
                <div className="fts-left">
                  <span className="fts-qty">1</span>
                  <span className="fts-entry-label">Entry</span>
                </div>
                <div className="fts-right">
                  <div className="fts-price">{c.currency}0.00</div>
                  <div className="fts-odds-small">1 in {odds} odds</div>
                </div>
              </div>
              <span className="fts-badge">Free</span>
            </div>

            {/* Per-member note */}
            <div className="fts-per-member">
              <span className="fts-dot" />
              One entry per member for this competition
            </div>

            {/* Odds panel — matches paid comp style */}
            <div className="fts-odds-panel">
              <div className="fts-op-left">
                <div className="fts-op-eyebrow">Your odds</div>
                <div className="fts-op-fraction">1 in {odds}</div>
              </div>
              <div className="fts-op-right">
                <div className="fts-op-detail">1 entry · {c.currency}0.00</div>
                <div className="fts-op-note">
                  Every entry is independently drawn<br />in the publicly streamed live draw.
                </div>
              </div>
            </div>

            <div className="entry-divider" />

            {/* Subtotal row — reuses paid comp class */}
            <div className="subtotal-row">
              <div>
                <div className="sr-left">
                  Order Total <span>(1 entry)</span>
                </div>
                <div className="sr-per" style={{ color: 'var(--green)', fontWeight: 600 }}>
                  Free entry
                </div>
              </div>
              <div className="sr-amount">{c.currency}0.00</div>
            </div>

            {/* CTA */}
            <button className="btn-claim-entry" onClick={onContinue}>
              Secure Free Entry
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
              Secure entry · A correct skill-based answer is required to win.
              This is a skill competition — <Link href="/terms">view full terms</Link>. 18+&nbsp;only.
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
