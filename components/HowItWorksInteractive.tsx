'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'

interface Props {
  ctaHref: string
}

const EASE = [0.22, 1, 0.36, 1] as const

interface Step {
  id: string
  /** Short label shown under the timeline node. */
  short: string
  title: string
  copy: string
  fallback: React.ReactNode
}

// ── Fallback visuals — premium PWC UI mockups, shown until real media lands in /public/howitworks ──

function CompetitionFallback() {
  return (
    <div className="hwi-fb hwi-fb1">
      <div className="hwi-fb-card hwi-fb-card-off">
        <span className="hwi-fb-chip">Weekly</span>
        <span className="hwi-fb-price">£4.99</span>
      </div>
      <div className="hwi-fb-card hwi-fb-card-active">
        <span className="hwi-fb-live">Live</span>
        <span className="hwi-fb-chip">Monthly</span>
        <span className="hwi-fb-price">£9.99</span>
      </div>
      <div className="hwi-fb-card hwi-fb-card-off">
        <span className="hwi-fb-chip">Special</span>
        <span className="hwi-fb-price">£14.99</span>
      </div>
    </div>
  )
}

function EntriesFallback() {
  return (
    <div className="hwi-fb hwi-fb2">
      <div className="hwi-fb-stepper">
        <span className="hwi-fb-stepper-btn">&#8722;</span>
        <span className="hwi-fb-stepper-val">6</span>
        <span className="hwi-fb-stepper-btn">&#43;</span>
      </div>
      <div className="hwi-fb-meter">
        <span className="hwi-fb-meter-fill" />
      </div>
      <span className="hwi-fb-meter-label">More entries, more chances</span>
    </div>
  )
}

function SkillFallback() {
  return (
    <div className="hwi-fb hwi-fb3">
      <div className="hwi-fb-question">Which movement powers a Rolex Daytona?</div>
      <div className="hwi-fb-answers">
        <span className="hwi-fb-answer">Quartz</span>
        <span className="hwi-fb-answer hwi-fb-answer-selected"><em>Automatic</em></span>
        <span className="hwi-fb-answer">Solar</span>
      </div>
    </div>
  )
}

function DrawFallback() {
  return (
    <div className="hwi-fb hwi-fb4">
      <div className="hwi-fb-live-badge"><span className="hwi-fb-pulse" />Live</div>
      <div className="hwi-fb-countdown">
        <span>02</span><em>:</em><span>14</span><em>:</em><span>07</span>
      </div>
      <span className="hwi-fb-meter-label">Streaming on our socials</span>
    </div>
  )
}

function WinnerFallback() {
  return (
    <div className="hwi-fb hwi-fb5">
      <div className="hwi-fb-notify">
        <span className="hwi-fb-notify-dot" />
        Winner selected via RandomDraws
      </div>
      <div className="hwi-fb-watch" aria-hidden="true">
        <span className="hwi-fb-watch-face" />
      </div>
    </div>
  )
}

const steps: Step[] = [
  {
    id: 'step-1',
    short: 'Choose',
    title: 'Choose Your Competition',
    copy: 'Pick the live Weekly, Monthly or Special competition you want to enter.',
    fallback: <CompetitionFallback />,
  },
  {
    id: 'step-2',
    short: 'Entries',
    title: 'Select Your Entries',
    copy: 'Choose how many entries you want. More entries means more chances in the draw.',
    fallback: <EntriesFallback />,
  },
  {
    id: 'step-3',
    short: 'Skill',
    title: 'Answer the Skill Question',
    copy: 'Every order includes a skill-based question. Your selected answer is recorded with your entry.',
    fallback: <SkillFallback />,
  },
  {
    id: 'step-4',
    short: 'Draw',
    title: 'Watch the Live Draw',
    copy: 'When entries close, the live draw is shared through our socials so members can follow the result.',
    fallback: <DrawFallback />,
  },
  {
    id: 'step-5',
    short: 'Wrist',
    title: 'From Winner to Wrist',
    copy: 'The winning entry is selected through RandomDraws. We contact the winner, arrange the prize and document the watch reaching its new wrist.',
    fallback: <WinnerFallback />,
  },
]

async function mediaExists(path: string): Promise<boolean> {
  try {
    const res = await fetch(path, { method: 'HEAD' })
    return res.ok
  } catch {
    return false
  }
}

function StepMedia({ step }: { step: Step }) {
  const [stage, setStage] = useState<'checking' | 'video' | 'gif' | 'fallback'>('checking')

  useEffect(() => {
    let cancelled = false
    setStage('checking')

    async function resolve() {
      const [hasVideo, hasGif] = await Promise.all([
        mediaExists(`/howitworks/${step.id}.mp4`),
        mediaExists(`/howitworks/${step.id}.gif`),
      ])
      if (cancelled) return
      if (hasVideo) setStage('video')
      else if (hasGif) setStage('gif')
      else setStage('fallback')
    }

    resolve()
    return () => {
      cancelled = true
    }
  }, [step.id])

  if (stage === 'checking') return <div className="hwi-media-inner" />

  return (
    <div className="hwi-media-inner">
      {stage === 'video' && (
        <video
          key={step.id}
          className="hwi-media"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setStage('fallback')}
        >
          <source src={`/howitworks/${step.id}.mp4`} type="video/mp4" />
          <source src={`/howitworks/${step.id}.webm`} type="video/webm" />
        </video>
      )}
      {stage === 'gif' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="hwi-media"
          src={`/howitworks/${step.id}.gif`}
          alt={step.title}
          onError={() => setStage('fallback')}
        />
      )}
      {stage === 'fallback' && step.fallback}
    </div>
  )
}

export default function HowItWorksInteractive({ ctaHref }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const active = steps[activeIndex]
  const last = steps.length - 1

  const go = (i: number) => setActiveIndex(Math.max(0, Math.min(last, i)))

  return (
    <section id="how-it-works" className="hwi-section">
      <div className="hwi-inner">
        <motion.div
          className="hwi-header"
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.55, ease: EASE }}
        >
          <div className="section-eyebrow">How It Works</div>
          <h2 className="hwi-title">From Entry to Wrist</h2>
          <p className="hwi-subtitle">
            Five steps, from choosing your competition to seeing the watch reach the winner&rsquo;s wrist.
          </p>
        </motion.div>

        {/* ── Interactive timeline rail ── */}
        <motion.div
          className="hwi-railwrap"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <div className="hwi-hint">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 11.5V6a2 2 0 0 1 4 0v5" />
              <path d="M13 8.5a2 2 0 0 1 4 0V13" />
              <path d="M17 10.5a2 2 0 0 1 4 0V16a5 5 0 0 1-5 5h-2.5a5 5 0 0 1-3.9-1.9L5 15.5a2 2 0 0 1 3.2-2.4l.8 1" />
            </svg>
            Tap a step to see how it works
          </div>

          <div className="hwi-rail" role="tablist" aria-label="How it works steps">
            {steps.map((step, i) => {
              const done = i < activeIndex
              const isActive = i === activeIndex
              return (
                <div className="hwi-node-wrap" key={step.id}>
                  {i > 0 && <span className={`hwi-seg ${i <= activeIndex ? 'hwi-seg-done' : ''}`} aria-hidden="true" />}
                  <button
                    type="button"
                    role="tab"
                    id={`hwi-tab-${step.id}`}
                    aria-selected={isActive}
                    aria-controls="hwi-stage-panel"
                    className={`hwi-node ${isActive ? 'hwi-node-active' : ''} ${done ? 'hwi-node-done' : ''}`}
                    onClick={() => go(i)}
                  >
                    <span className="hwi-node-dot">
                      {done ? (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      ) : (
                        <span className="hwi-node-num">{i + 1}</span>
                      )}
                    </span>
                    <span className="hwi-node-label">{step.short}</span>
                  </button>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* ── Stage: media + text, updates on node click ── */}
        <div className="hwi-stage">
          <div className="hwi-media-frame" id="hwi-stage-panel" role="tabpanel" aria-labelledby={`hwi-tab-${active.id}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                className="hwi-media-motion"
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ duration: 0.35, ease: EASE }}
              >
                <StepMedia step={active} />
              </motion.div>
            </AnimatePresence>
            <span className="hwi-stage-badge">Step {activeIndex + 1} / {steps.length}</span>
          </div>

          <div className="hwi-panel">
            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: EASE }}
              >
                <span className="hwi-panel-eyebrow">Step {activeIndex + 1}</span>
                <h3 className="hwi-panel-title">{active.title}</h3>
                <p className="hwi-panel-copy">{active.copy}</p>
              </motion.div>
            </AnimatePresence>

            <div className="hwi-nav">
              <button
                type="button"
                className="hwi-nav-btn"
                onClick={() => go(activeIndex - 1)}
                disabled={activeIndex === 0}
                aria-label="Previous step"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
              </button>
              <div className="hwi-nav-dots" aria-hidden="true">
                {steps.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`hwi-nav-dot ${i === activeIndex ? 'hwi-nav-dot-on' : ''}`}
                    onClick={() => go(i)}
                    tabIndex={-1}
                  />
                ))}
              </div>
              <button
                type="button"
                className="hwi-nav-btn"
                onClick={() => go(activeIndex + 1)}
                disabled={activeIndex === last}
                aria-label="Next step"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
              </button>
            </div>
          </div>
        </div>

        <motion.div
          className="hwi-cta-wrap"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <Link href={ctaHref} className="hwi-cta">
            Enter the Current Competition
          </Link>
          <p className="hwi-trust">
            <span className="hwi-trust-dot" aria-hidden="true" />
            Skill-based entry. Independent draw record. 18+ only.
          </p>
        </motion.div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `

        .hwi-section {
          position: relative;
          background: var(--bg-off-white);
          border-top: 1px solid var(--border-light);
        }
        .hwi-inner {
          max-width: 1120px;
          margin: 0 auto;
          padding: 92px 28px 96px;
        }
        .hwi-header { text-align: center; margin-bottom: 40px; }
        .hwi-title {
          font-family: var(--font-serif);
          font-size: clamp(28px, 3.6vw, 44px);
          font-weight: 700;
          color: var(--navy);
          letter-spacing: -0.02em;
          line-height: 1.12;
          margin-bottom: 14px;
        }
        .hwi-subtitle {
          font-size: 15px;
          color: var(--text-muted);
          max-width: 52ch;
          margin: 0 auto;
          line-height: 1.75;
        }

        /* ── Interactive hint ── */
        .hwi-railwrap { margin-bottom: 40px; }
        .hwi-hint {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          font-family: var(--font-sans);
          font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--gold-dark);
          margin-bottom: 26px;
        }

        /* ── Rail: connected numbered nodes ── */
        .hwi-rail {
          display: flex;
          align-items: flex-start;
          justify-content: center;
        }
        .hwi-node-wrap {
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 0;
        }
        .hwi-node-wrap:first-child { flex: 0 0 auto; }
        /* connector segment sits before each node (except the first) */
        .hwi-seg {
          flex: 1;
          height: 2px;
          min-width: 18px;
          margin-top: 22px;   /* align with node dot centre (44px dot → 22px) */
          background: var(--border-light);
          border-radius: 2px;
          transition: background 0.45s ease;
        }
        .hwi-seg-done { background: var(--gold); }

        .hwi-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0 6px;
          flex-shrink: 0;
          -webkit-tap-highlight-color: transparent;
        }
        .hwi-node-dot {
          position: relative;
          width: 44px; height: 44px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: var(--bg-white);
          border: 2px solid var(--border-light);
          color: var(--text-muted);
          transition: transform 0.25s ease, border-color 0.25s ease, background 0.25s ease, color 0.25s ease, box-shadow 0.25s ease;
        }
        .hwi-node-num {
          font-family: var(--font-serif);
          font-size: 16px; font-weight: 700;
          line-height: 1;
        }
        .hwi-node-label {
          font-family: var(--font-sans);
          font-size: 12px; font-weight: 600; letter-spacing: 0.02em;
          color: var(--text-muted);
          transition: color 0.25s ease;
          white-space: nowrap;
        }
        /* completed */
        .hwi-node-done .hwi-node-dot {
          background: var(--gold-bg, rgba(197,160,101,0.14));
          border-color: var(--gold);
          color: var(--gold-dark);
        }
        .hwi-node-done .hwi-node-label { color: var(--text-mid); }
        /* hover — obvious lift + gold ring */
        .hwi-node:hover .hwi-node-dot {
          border-color: var(--gold);
          transform: translateY(-3px);
          box-shadow: 0 10px 22px -10px rgba(197,160,101,0.7);
        }
        .hwi-node:hover .hwi-node-label { color: var(--navy); }
        .hwi-node:focus-visible { outline: none; }
        .hwi-node:focus-visible .hwi-node-dot {
          outline: 2px solid var(--gold-dark);
          outline-offset: 3px;
        }
        /* active — filled, enlarged, unmistakable */
        .hwi-node-active .hwi-node-dot {
          background: var(--navy);
          border-color: var(--navy);
          color: var(--gold);
          transform: scale(1.14);
          box-shadow: 0 14px 30px -10px rgba(10,31,68,0.55), 0 0 0 5px rgba(197,160,101,0.16);
        }
        .hwi-node-active .hwi-node-label {
          color: var(--navy);
          font-weight: 800;
        }
        .hwi-node-active:hover .hwi-node-dot { transform: scale(1.14) translateY(-2px); }

        /* ── Stage ── */
        .hwi-stage {
          display: grid;
          grid-template-columns: 1fr;
          gap: 22px;
          margin-bottom: 48px;
        }
        .hwi-media-frame {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 10;   /* one consistent frame for every step's GIF/video */
          border-radius: 18px;
          overflow: hidden;
          background: var(--navy);
          border: 1px solid var(--border-light);
          box-shadow: 0 24px 60px -34px rgba(10,31,68,0.6);
        }
        .hwi-media-motion { position: absolute; inset: 0; }
        .hwi-media-inner { position: absolute; inset: 0; }
        .hwi-media {
          width: 100%; height: 100%;
          object-fit: cover;
          display: block;
        }
        .hwi-stage-badge {
          position: absolute;
          top: 14px; left: 14px;
          z-index: 2;
          font-family: var(--font-sans);
          font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--gold-light);
          background: rgba(10,31,68,0.72);
          backdrop-filter: blur(4px);
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid rgba(197,160,101,0.3);
        }

        .hwi-panel {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .hwi-panel-eyebrow {
          display: inline-block;
          font-family: var(--font-sans);
          font-size: 11px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase;
          color: var(--gold-dark);
          margin-bottom: 10px;
        }
        .hwi-panel-title {
          font-family: var(--font-serif);
          font-size: clamp(22px, 2.6vw, 28px);
          font-weight: 700;
          color: var(--navy);
          letter-spacing: -0.01em;
          line-height: 1.18;
          margin-bottom: 12px;
        }
        .hwi-panel-copy {
          font-size: 15px;
          line-height: 1.72;
          color: var(--text-mid);
          max-width: 46ch;
        }

        /* ── Prev / next controls ── */
        .hwi-nav {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: 24px;
        }
        .hwi-nav-btn {
          width: 44px; height: 44px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: var(--bg-white);
          border: 1px solid var(--border-light);
          color: var(--navy);
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease, transform 0.16s ease, box-shadow 0.2s ease, opacity 0.2s ease;
        }
        .hwi-nav-btn:hover:not(:disabled) {
          border-color: var(--gold);
          transform: translateY(-2px);
          box-shadow: 0 10px 22px -12px rgba(10,31,68,0.5);
        }
        .hwi-nav-btn:focus-visible { outline: 2px solid var(--gold-dark); outline-offset: 2px; }
        .hwi-nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .hwi-nav-dots { display: flex; align-items: center; gap: 8px; }
        .hwi-nav-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--border-light);
          border: none; padding: 0; cursor: pointer;
          transition: background 0.25s ease, width 0.25s ease, border-radius 0.25s ease;
        }
        .hwi-nav-dot-on {
          background: var(--gold);
          width: 22px;
          border-radius: 999px;
        }

        /* ── CTA ── */
        .hwi-cta-wrap { text-align: center; }
        .hwi-cta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: var(--gold);
          color: var(--navy);
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 16px 40px;
          border-radius: 4px;
          transition: background 0.2s ease, transform 0.16s ease, box-shadow 0.2s ease;
          box-shadow: 0 6px 26px rgba(197,160,101,0.28);
        }
        .hwi-cta:hover {
          background: var(--gold-dark);
          transform: translateY(-2px);
          box-shadow: 0 10px 34px rgba(197,160,101,0.36);
        }
        .hwi-trust {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 16px;
          font-size: 12px;
          color: var(--text-muted);
          letter-spacing: 0.02em;
        }
        .hwi-trust-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--green);
          box-shadow: 0 0 5px rgba(39,174,96,0.6);
          flex-shrink: 0;
        }

        /* ── Fallback visuals ── */
        .hwi-fb {
          width: 100%; height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 18px;
          padding: 28px;
        }
        .hwi-fb1 { flex-direction: row; gap: 12px; }
        .hwi-fb-card {
          flex: 1;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 132px;
          border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .hwi-fb-card-active {
          background: rgba(197,160,101,0.12);
          border-color: var(--gold);
          transform: translateY(-6px);
          box-shadow: 0 12px 30px rgba(197,160,101,0.22);
        }
        .hwi-fb-live {
          position: absolute;
          top: 10px; right: 10px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--navy);
          background: var(--green);
          padding: 3px 8px;
          border-radius: 999px;
        }
        .hwi-fb-chip {
          font-family: var(--font-serif);
          font-size: 15px;
          font-weight: 700;
          color: var(--text-on-dark);
        }
        .hwi-fb-price {
          font-size: 12px;
          color: var(--gold-light);
          letter-spacing: 0.03em;
        }
        .hwi-fb-stepper {
          display: flex;
          align-items: center;
          gap: 22px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 999px;
          padding: 12px 26px;
        }
        .hwi-fb-stepper-btn {
          width: 28px; height: 28px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: var(--gold);
          color: var(--navy);
          font-weight: 800;
          font-size: 15px;
        }
        .hwi-fb-stepper-val {
          font-family: var(--font-serif);
          font-size: 26px;
          font-weight: 700;
          color: var(--text-on-dark);
          min-width: 24px;
          text-align: center;
        }
        .hwi-fb-meter {
          width: 76%;
          height: 6px;
          border-radius: 999px;
          background: rgba(255,255,255,0.1);
          overflow: hidden;
        }
        .hwi-fb-meter-fill {
          display: block;
          width: 68%;
          height: 100%;
          background: linear-gradient(90deg, var(--gold-dark), var(--gold));
          border-radius: 999px;
        }
        .hwi-fb-meter-label {
          font-size: 11.5px;
          letter-spacing: 0.04em;
          color: rgba(245,244,240,0.6);
          text-transform: uppercase;
        }
        .hwi-fb-question {
          font-family: var(--font-serif);
          font-size: 15.5px;
          color: var(--text-on-dark);
          text-align: center;
          max-width: 30ch;
          line-height: 1.4;
        }
        .hwi-fb-answers {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 78%;
        }
        .hwi-fb-answer {
          font-size: 12.5px;
          color: rgba(245,244,240,0.6);
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 9px 14px;
        }
        .hwi-fb-answer-selected {
          border-color: var(--gold);
          background: rgba(197,160,101,0.14);
          color: var(--gold-light);
        }
        .hwi-fb-answer-selected em { font-style: normal; font-weight: 700; }
        .hwi-fb-live-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #fff;
          background: rgba(192,57,43,0.9);
          padding: 6px 14px;
          border-radius: 999px;
        }
        .hwi-fb-pulse {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 0 0 0 rgba(255,255,255,0.6);
          animation: hwi-pulse 1.6s ease-out infinite;
        }
        @keyframes hwi-pulse {
          0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.55); }
          70% { box-shadow: 0 0 0 8px rgba(255,255,255,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
        }
        .hwi-fb-countdown {
          display: flex;
          align-items: baseline;
          gap: 4px;
          font-family: var(--font-serif);
          font-size: 34px;
          font-weight: 700;
          color: var(--gold-light);
        }
        .hwi-fb-countdown em { font-style: normal; opacity: 0.5; }
        .hwi-fb-notify {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12.5px;
          color: var(--text-on-dark);
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 999px;
          padding: 9px 18px;
        }
        .hwi-fb-notify-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--green);
          box-shadow: 0 0 6px rgba(39,174,96,0.7);
          flex-shrink: 0;
        }
        .hwi-fb-watch {
          width: 92px; height: 92px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 30%, var(--gold-light), var(--gold-dark) 70%);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 14px 40px rgba(197,160,101,0.3);
        }
        .hwi-fb-watch-face {
          width: 62px; height: 62px;
          border-radius: 50%;
          background: var(--navy);
          border: 3px solid var(--gold-dark);
        }

        /* ── Desktop: media left, text right ── */
        @media (min-width: 900px) {
          .hwi-stage {
            grid-template-columns: 1.15fr 0.85fr;
            gap: 44px;
            align-items: center;
          }
          .hwi-seg { min-width: 30px; }
        }

        /* ── Mobile: keep the rail readable, allow horizontal scroll if tight ── */
        @media (max-width: 640px) {
          .hwi-inner { padding: 64px 18px 72px; }
          .hwi-header { margin-bottom: 30px; }
          .hwi-rail {
            justify-content: flex-start;
            overflow-x: auto;
            padding: 4px 2px 8px;
            gap: 0;
            scrollbar-width: none;
          }
          .hwi-rail::-webkit-scrollbar { display: none; }
          .hwi-node-dot { width: 40px; height: 40px; }
          .hwi-seg { margin-top: 20px; min-width: 14px; }
          .hwi-node-active .hwi-node-dot { transform: scale(1.1); }
          .hwi-node-label { font-size: 11px; }
        }
        @media (max-width: 480px) {
          .hwi-cta { width: 100%; justify-content: center; padding: 15px 20px; }
          .hwi-panel-copy { font-size: 14.5px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .hwi-node-dot, .hwi-seg, .hwi-nav-btn, .hwi-nav-dot, .hwi-cta { transition: none; }
        }
      ` }} />
    </section>
  )
}
