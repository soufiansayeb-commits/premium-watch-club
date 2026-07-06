'use client'

import Image from 'next/image'
import { motion, useReducedMotion } from 'motion/react'
import type { Competition } from '@/lib/competition-data'

interface Props {
  competition: Competition
  /** Anchor the CTA scrolls to. Defaults to the PDP buy box. */
  ctaHref?: string
}

const EASE = [0.22, 1, 0.36, 1] as const

interface Tier {
  start: string
  end: string
  reward: number
  winners: number
  total: number
  note: string
  /** Gold intensity for this rung — tapers as the ladder descends. */
  acc: number
}

// Runner-up ladder. Static frontend data for now, kept in one place so it is
// trivial to make backend-driven later without touching the layout.
const TIERS: Tier[] = [
  { start: '#2', end: '#5', reward: 50, winners: 4, total: 200, acc: 1, note: 'Each of these 4 members receives a $50 reward.' },
  { start: '#6', end: '#15', reward: 25, winners: 10, total: 250, acc: 0.8, note: 'Each of these 10 members receives a $25 reward.' },
  { start: '#16', end: '#25', reward: 15, winners: 10, total: 150, acc: 0.62, note: 'Each of these 10 members receives a $15 reward.' },
  { start: '#26', end: '#50', reward: 10, winners: 25, total: 250, acc: 0.48, note: 'Each of these 25 members receives a $10 reward.' },
]

export default function LeaderboardRewards({ competition, ctaHref = '#entry-main' }: Props) {
  const reduce = useReducedMotion()

  // ── Visibility rule: paid competitions only ─────────────────────────────
  // Only paid competition PDPs (weekly, monthly, any future paid comp) carry
  // the leaderboard rewards. Special and free/lead-gen competitions never do.
  // Driven purely off existing product data — no hardcoded IDs, slugs or names,
  // so future special/free competitions are excluded automatically.
  // competitionType is normalised upstream to: 'weekly' | 'monthly' | 'special'
  // | 'starter' (free/lead-gen comps normalise to 'starter'). We render only for
  // paid types, and gate on price as the final safety net so any £0 competition
  // is excluded regardless of how its type is labelled.
  const type = competition.competitionType?.toLowerCase()
  const isPaid =
    type !== 'special' &&
    type !== 'free' &&
    type !== 'starter' &&
    !competition.isFree &&
    competition.entryPrice > 0

  if (!isPaid) return null

  // #1 prize is fully dynamic: same image the buy box uses (featured cutout
  // first, then static image, then hero). Never hardcode a product name.
  const prizeImage =
    competition.galleryImages?.[0]?.src ?? competition.image ?? competition.heroImage

  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 22 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: '-60px' },
          transition: { duration: 0.5, delay, ease: EASE },
        }

  return (
    <section id="leaderboard-rewards" className="lbr-section" aria-labelledby="lbr-title">
      <div className="lbr-inner">
        <motion.header className="lbr-head" {...rise(0)}>
          <div className="lbr-eyebrow">
            <span className="lbr-eyebrow-mark" aria-hidden="true" />
            Leaderboard Rewards
          </div>
          <h2 id="lbr-title" className="lbr-title">More Than One Way to Win</h2>
          <p className="lbr-sub">
            The main winner takes the watch, but the leaderboard keeps rewarding members all the way to 50th place.
          </p>
        </motion.header>

        <div className="lbr-grid">
          {/* ── #1: the watch, sitting at the top of the same leaderboard ── */}
          <motion.div className="lbr-hero" {...rise(0.05)}>
            <div className="lbr-hero-rankrow">
              <span className="lbr-hero-rank">#1</span>
              <span className="lbr-hero-kicker">Main prize</span>
            </div>
            <div className="lbr-hero-frame">
              <Image
                src={prizeImage}
                alt={competition.title}
                fill
                sizes="(max-width: 899px) 90vw, 360px"
                style={{ objectFit: 'contain', objectPosition: 'center' }}
              />
            </div>
            <div className="lbr-hero-meta">
              <h3 className="lbr-hero-title">{competition.title}</h3>
              <p className="lbr-hero-line">The main winner takes the watch in full.</p>
            </div>
          </motion.div>

          {/* ── Runner-up ladder ── */}
          <div className="lbr-ladder-wrap">
            <div className="lbr-ladder" role="list" aria-label="Runner-up reward tiers">
              {TIERS.map((t, i) => (
                <motion.div
                  key={t.start}
                  className="lbr-rung"
                  role="listitem"
                  tabIndex={0}
                  style={{ ['--acc' as string]: String(t.acc) }}
                  {...rise(0.12 + i * 0.07)}
                >
                  <span className="lbr-pip" aria-hidden="true" />
                  <div className="lbr-rank">
                    <span className="lbr-rank-a">{t.start}</span>
                    <span className="lbr-rank-tm">t/m</span>
                    <span className="lbr-rank-b">{t.end}</span>
                  </div>
                  <div className="lbr-reward">
                    <span className="lbr-reward-amt">${t.reward}</span>
                    <span className="lbr-reward-lab">per member</span>
                  </div>
                  <div className="lbr-meta">
                    <span className="lbr-winners">{t.winners} winners</span>
                    <span className="lbr-total">${t.total} total</span>
                  </div>
                  <p className="lbr-note">{t.note}</p>
                </motion.div>
              ))}
            </div>

            <motion.div className="lbr-sum" {...rise(0.12 + TIERS.length * 0.07)}>
              <div className="lbr-sum-l">
                <span className="lbr-sum-lab">Total runner-up rewards</span>
                <span className="lbr-sum-sub">49 members rewarded beyond the watch</span>
              </div>
              <span className="lbr-sum-val">$850</span>
            </motion.div>
          </div>
        </div>

        <motion.div className="lbr-foot" {...rise(0.1)}>
          <p className="lbr-trust">
            <span className="lbr-check" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M2 7.5l3.2 3.2L12 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            Runner-up rewards are issued after the draw has been verified.
          </p>
          <a href={ctaHref} className="lbr-cta">Enter This Competition</a>
          <p className="lbr-terms">Rewards apply to eligible entries. Full terms apply.</p>
        </motion.div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `

        .lbr-section {
          background: var(--bg-off-white);
          border-top: 1px solid var(--border-light);
        }
        .lbr-inner {
          max-width: 1120px;
          margin: 0 auto;
          padding: 68px 24px 72px;
        }

        /* ── Head ── */
        .lbr-head { text-align: center; margin-bottom: 40px; }
        .lbr-eyebrow {
          display: inline-flex; align-items: center; gap: 9px;
          font-family: var(--font-sans);
          font-size: 11px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase;
          color: var(--gold-dark);
          margin-bottom: 16px;
        }
        .lbr-eyebrow-mark {
          width: 14px; height: 14px;
          border: 1px solid var(--gold); border-radius: 50%;
          position: relative; flex-shrink: 0;
        }
        .lbr-eyebrow-mark::after {
          content: ''; position: absolute; inset: 3px;
          border-radius: 50%; background: var(--gold);
        }
        .lbr-title {
          font-family: var(--font-serif);
          font-size: clamp(28px, 4vw, 42px);
          font-weight: 700;
          color: var(--navy);
          letter-spacing: -0.02em;
          line-height: 1.1;
          margin-bottom: 14px;
        }
        .lbr-sub {
          font-family: var(--font-sans);
          font-size: 15px;
          line-height: 1.65;
          color: var(--text-mid);
          max-width: 56ch;
          margin: 0 auto;
        }

        /* ── Grid ── */
        .lbr-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 18px;
          margin-bottom: 34px;
        }

        /* ── #1 hero ── */
        .lbr-hero {
          position: relative;
          display: flex;
          flex-direction: column;
          background: linear-gradient(168deg, #FFFFFF 0%, var(--gold-bg) 100%);
          border: 1px solid rgba(197,160,101,0.4);
          border-radius: 18px;
          padding: 22px 22px 24px;
          box-shadow: 0 18px 44px -22px rgba(197,160,101,0.55), 0 2px 0 rgba(255,255,255,0.7) inset;
          overflow: hidden;
        }
        .lbr-hero::before {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(120% 60% at 50% 0%, rgba(197,160,101,0.14), transparent 60%);
          pointer-events: none;
        }
        .lbr-hero-rankrow {
          position: relative;
          display: flex; align-items: center; gap: 12px;
          margin-bottom: 14px;
        }
        .lbr-hero-rank {
          font-family: var(--font-serif);
          font-size: 26px; font-weight: 700;
          color: var(--navy);
          line-height: 1;
          padding: 8px 14px;
          background: var(--gold);
          border-radius: 10px;
          box-shadow: 0 6px 16px -6px rgba(197,160,101,0.8);
        }
        .lbr-hero-kicker {
          font-family: var(--font-sans);
          font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase;
          color: var(--gold-dark);
        }
        .lbr-hero-frame {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 11;
          border-radius: 12px;
          background:
            radial-gradient(80% 80% at 50% 30%, rgba(10,31,68,0.05), transparent 70%),
            #FFFFFF;
          border: 1px solid var(--border-light);
          overflow: hidden;
          margin-bottom: 16px;
        }
        .lbr-hero-meta { position: relative; }
        .lbr-hero-title {
          font-family: var(--font-serif);
          font-size: clamp(18px, 2.4vw, 23px);
          font-weight: 700;
          color: var(--navy);
          line-height: 1.2;
          letter-spacing: -0.01em;
          margin-bottom: 6px;
        }
        .lbr-hero-line {
          font-family: var(--font-sans);
          font-size: 13.5px;
          color: var(--text-mid);
          line-height: 1.5;
        }

        /* ── Ladder ── */
        .lbr-ladder-wrap { display: flex; flex-direction: column; gap: 12px; }
        .lbr-ladder {
          position: relative;
          background: var(--bg-white);
          border: 1px solid var(--border-light);
          border-radius: 18px;
          padding: 6px 6px 6px 0;
        }
        /* the gold spine running down the leaderboard */
        .lbr-ladder::before {
          content: '';
          position: absolute;
          left: 27px; top: 30px; bottom: 30px;
          width: 2px;
          background: linear-gradient(180deg, var(--gold) 0%, rgba(197,160,101,0.35) 100%);
          border-radius: 2px;
        }

        .lbr-rung {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0,1.1fr) minmax(0,0.9fr) auto;
          align-items: center;
          gap: 12px;
          padding: 16px 18px 16px 46px;
          border-radius: 13px;
          border: 1px solid transparent;
          transition: background 0.22s ease, border-color 0.22s ease, transform 0.22s ease, box-shadow 0.22s ease;
          outline: none;
        }
        .lbr-rung + .lbr-rung { box-shadow: 0 -1px 0 var(--border-light); }
        .lbr-pip {
          position: absolute;
          left: 22px; top: 24px;
          width: 12px; height: 12px;
          border-radius: 50%;
          background: rgba(197,160,101,var(--acc));
          border: 2px solid var(--bg-white);
          box-shadow: 0 0 0 1px rgba(197,160,101,calc(var(--acc) * 0.7));
          transition: transform 0.22s ease;
        }
        .lbr-rung:hover, .lbr-rung:focus-visible {
          background: var(--gold-bg);
          border-color: rgba(197,160,101,0.45);
          transform: translateX(3px);
          box-shadow: 0 12px 26px -18px rgba(10,31,68,0.5);
        }
        .lbr-rung:focus-visible { border-color: var(--gold-dark); }
        .lbr-rung:hover .lbr-pip, .lbr-rung:focus-visible .lbr-pip { transform: scale(1.25); }

        .lbr-rank { display: flex; align-items: baseline; gap: 7px; }
        .lbr-rank-a, .lbr-rank-b {
          font-family: var(--font-serif);
          font-size: clamp(22px, 3vw, 30px);
          font-weight: 700;
          color: var(--navy);
          line-height: 1;
        }
        .lbr-rank-tm {
          font-family: var(--font-sans);
          font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--gold-dark);
          transform: translateY(-2px);
        }

        .lbr-reward { display: flex; flex-direction: column; gap: 1px; }
        .lbr-reward-amt {
          font-family: var(--font-serif);
          font-size: 21px; font-weight: 700;
          color: var(--navy);
          line-height: 1;
        }
        .lbr-reward-lab {
          font-family: var(--font-sans);
          font-size: 11px; color: var(--text-muted);
          letter-spacing: 0.02em;
        }

        .lbr-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; text-align: right; }
        .lbr-winners {
          font-family: var(--font-sans);
          font-size: 12px; font-weight: 600; color: var(--text-mid);
          white-space: nowrap;
        }
        .lbr-total {
          font-family: var(--font-sans);
          font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
          color: var(--gold-dark);
          padding: 3px 9px;
          background: rgba(197,160,101,0.12);
          border-radius: 999px;
          white-space: nowrap;
        }

        /* one-line explanation, revealed on hover/focus (desktop) */
        .lbr-note {
          grid-column: 1 / -1;
          font-family: var(--font-sans);
          font-size: 12.5px;
          color: var(--text-mid);
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition: max-height 0.26s ease, opacity 0.2s ease, margin-top 0.26s ease;
        }
        .lbr-rung:hover .lbr-note, .lbr-rung:focus-visible .lbr-note {
          max-height: 32px;
          opacity: 1;
          margin-top: 8px;
        }

        /* ── Total bar ── */
        .lbr-sum {
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
          background: var(--navy);
          border-radius: 16px;
          padding: 18px 24px;
          box-shadow: 0 16px 40px -24px rgba(10,31,68,0.9);
        }
        .lbr-sum-l { display: flex; flex-direction: column; gap: 3px; }
        .lbr-sum-lab {
          font-family: var(--font-sans);
          font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--gold-light);
        }
        .lbr-sum-sub {
          font-family: var(--font-sans);
          font-size: 12.5px; color: rgba(245,244,240,0.62);
        }
        .lbr-sum-val {
          font-family: var(--font-serif);
          font-size: clamp(30px, 4vw, 40px);
          font-weight: 700;
          color: var(--gold-light);
          line-height: 1;
          letter-spacing: -0.01em;
        }

        /* ── Foot ── */
        .lbr-foot {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 18px;
        }
        .lbr-trust {
          display: inline-flex; align-items: center; gap: 8px;
          font-family: var(--font-sans);
          font-size: 13px; color: var(--text-mid);
        }
        .lbr-check {
          display: inline-flex; align-items: center; justify-content: center;
          width: 20px; height: 20px; border-radius: 50%;
          background: rgba(39,174,96,0.12);
          color: var(--green);
          flex-shrink: 0;
        }
        .lbr-cta {
          display: inline-flex; align-items: center; justify-content: center;
          font-family: var(--font-sans);
          background: var(--gold);
          color: var(--navy);
          font-size: 13px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
          padding: 16px 40px;
          border-radius: 5px;
          box-shadow: 0 8px 26px -10px rgba(197,160,101,0.9);
          transition: background 0.2s ease, transform 0.16s ease, box-shadow 0.2s ease;
        }
        .lbr-cta:hover {
          background: var(--gold-light);
          transform: translateY(-2px);
          box-shadow: 0 14px 32px -12px rgba(197,160,101,1);
        }
        .lbr-cta:focus-visible { outline: 2px solid var(--gold-dark); outline-offset: 3px; }
        .lbr-terms {
          font-family: var(--font-sans);
          font-size: 11.5px; color: var(--text-muted);
        }

        /* ── Desktop: watch on the left, ladder on the right, controlled height ── */
        @media (min-width: 900px) {
          .lbr-grid {
            grid-template-columns: 0.82fr 1.18fr;
            gap: 26px;
            align-items: stretch;
          }
          .lbr-hero { height: 100%; }
          /* watch fills the extra height so the card never reads as half-empty */
          .lbr-hero-frame { aspect-ratio: auto; flex: 1; min-height: 320px; }
        }

        /* ── Small phones: keep the rung readable, drop the pip gutter a touch ── */
        @media (max-width: 420px) {
          .lbr-inner { padding: 52px 16px 58px; }
          .lbr-rung {
            grid-template-columns: 1fr auto;
            row-gap: 10px;
            padding: 15px 14px 15px 40px;
          }
          .lbr-reward { grid-row: 2; }
          .lbr-meta { grid-row: 1 / 3; align-self: center; }
          .lbr-ladder::before { left: 23px; }
          .lbr-pip { left: 18px; }
          .lbr-rung { padding-left: 38px; }
          .lbr-sum { flex-direction: column; align-items: flex-start; gap: 10px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .lbr-rung, .lbr-pip, .lbr-cta, .lbr-note { transition: none; }
        }
      ` }} />
    </section>
  )
}
