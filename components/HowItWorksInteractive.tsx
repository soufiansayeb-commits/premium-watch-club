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
    title: 'Choose Your Competition',
    copy: 'Pick the live Weekly, Monthly or Special competition you want to enter.',
    fallback: <CompetitionFallback />,
  },
  {
    id: 'step-2',
    title: 'Select Your Entries',
    copy: 'Choose how many entries you want. More entries means more chances in the draw.',
    fallback: <EntriesFallback />,
  },
  {
    id: 'step-3',
    title: 'Answer the Skill Question',
    copy: 'Every order includes a skill-based question. Your selected answer is recorded with your entry.',
    fallback: <SkillFallback />,
  },
  {
    id: 'step-4',
    title: 'Watch the Live Draw',
    copy: 'When entries close, the live draw is shared through our socials so members can follow the result.',
    fallback: <DrawFallback />,
  },
  {
    id: 'step-5',
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

  if (stage === 'checking') return <div className="hwi-frame" />

  return (
    <div className="hwi-frame">
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
  const [modalOpen, setModalOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 899px)')
    setIsMobile(mq.matches)
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', listener)
    return () => mq.removeEventListener('change', listener)
  }, [])

  useEffect(() => {
    if (!modalOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [modalOpen])

  const handleStepClick = (i: number) => {
    setActiveIndex(i)
    if (isMobile) setModalOpen(true)
  }

  const active = steps[activeIndex]

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
            See how Premium Watch Club works, from choosing your competition to following the live draw and seeing the watch reach the winner&rsquo;s wrist.
          </p>
        </motion.div>

        <div className="hwi-layout">
          <div className="hwi-steps">
            {steps.map((step, i) => (
              <button
                key={step.id}
                type="button"
                className={`hwi-step ${activeIndex === i ? 'hwi-step-active' : ''}`}
                aria-pressed={activeIndex === i}
                onClick={() => handleStepClick(i)}
              >
                <span className="hwi-step-num">{i + 1}</span>
                <span className="hwi-step-text">
                  <span className="hwi-step-title">{step.title}</span>
                  <span className="hwi-step-copy">{step.copy}</span>
                  <span className="hwi-step-cue" aria-hidden="true">
                    See how it works
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </span>
                </span>
              </button>
            ))}
          </div>

          <motion.div
            className="hwi-visual"
            key={active.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <StepMedia step={active} />
          </motion.div>
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

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="hwi-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              className="hwi-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="hwi-modal-title"
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.25, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="hwi-modal-close"
                aria-label="Close step details"
                onClick={() => setModalOpen(false)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
              <div className="hwi-modal-media">
                <StepMedia step={active} />
              </div>
              <span className="hwi-modal-num">Step {activeIndex + 1} of {steps.length}</span>
              <h3 id="hwi-modal-title" className="hwi-modal-title">{active.title}</h3>
              <p className="hwi-modal-copy">{active.copy}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `

        .hwi-section {
          position: relative;
          background: var(--bg-off-white);
          border-top: 1px solid var(--border-light);
        }
        .hwi-inner {
          max-width: 1180px;
          margin: 0 auto;
          padding: 92px 28px 96px;
        }
        .hwi-header { text-align: center; margin-bottom: 52px; }
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
          max-width: 58ch;
          margin: 0 auto;
          line-height: 1.75;
        }

        /* ── Layout: steps left, media right ── */
        .hwi-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-bottom: 56px;
        }
        .hwi-steps {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .hwi-step {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          text-align: left;
          background: var(--bg-white);
          border: 1px solid var(--border-light);
          border-radius: 12px;
          padding: 18px 20px;
          cursor: pointer;
          transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
        }
        .hwi-step:hover {
          border-color: rgba(197,160,101,0.5);
        }
        .hwi-step-active {
          background: var(--navy);
          border-color: var(--navy);
          box-shadow: 0 14px 40px rgba(10,31,68,0.18);
        }
        .hwi-step-num {
          flex-shrink: 0;
          width: 30px; height: 30px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-serif);
          font-size: 14px;
          font-weight: 700;
          background: var(--bg-off-white);
          color: var(--text-muted);
          border: 1px solid var(--border-light);
          transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
        }
        .hwi-step-active .hwi-step-num {
          background: var(--gold);
          color: var(--navy);
          border-color: var(--gold);
        }
        .hwi-step-text {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        .hwi-step-title {
          font-family: var(--font-serif);
          font-size: 17px;
          font-weight: 700;
          color: var(--navy);
          letter-spacing: -0.01em;
          transition: color 0.2s ease;
        }
        .hwi-step-active .hwi-step-title { color: var(--text-on-dark); }
        .hwi-step-copy {
          font-size: 13.5px;
          line-height: 1.6;
          color: var(--text-mid);
          transition: color 0.2s ease;
        }
        .hwi-step-active .hwi-step-copy { color: rgba(245,244,240,0.72); }
        .hwi-step-cue {
          display: none;
          align-items: center;
          gap: 6px;
          margin-top: 4px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--gold);
        }

        /* ── Visual frame (desktop only) ── */
        .hwi-visual { display: none; }
        .hwi-frame {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 3;
          border-radius: 16px;
          overflow: hidden;
          background: var(--navy);
          border: 1px solid var(--border-light);
        }
        .hwi-media {
          width: 100%; height: 100%;
          object-fit: cover;
          display: block;
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
        .hwi-fb1 {
          flex-direction: row;
          gap: 12px;
        }
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

        /* ── Modal (mobile) ── */
        .hwi-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(10,31,68,0.72);
          backdrop-filter: blur(3px);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          z-index: 200;
        }
        .hwi-modal {
          position: relative;
          width: 100%;
          max-width: 480px;
          max-height: 88vh;
          overflow-y: auto;
          background: var(--bg-white);
          border-radius: 20px 20px 0 0;
          padding: 22px 22px 30px;
        }
        .hwi-modal-close {
          position: absolute;
          top: 14px; right: 14px;
          width: 34px; height: 34px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: var(--bg-off-white);
          border: 1px solid var(--border-light);
          color: var(--navy);
          z-index: 1;
        }
        .hwi-modal-media {
          border-radius: 14px;
          overflow: hidden;
          margin-bottom: 18px;
        }
        .hwi-modal-num {
          display: block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--gold-dark);
          margin-bottom: 8px;
        }
        .hwi-modal-title {
          font-family: var(--font-serif);
          font-size: 21px;
          font-weight: 700;
          color: var(--navy);
          margin-bottom: 10px;
        }
        .hwi-modal-copy {
          font-size: 14.5px;
          line-height: 1.7;
          color: var(--text-mid);
        }

        /* ── Desktop: two-column layout, click switches visual ── */
        @media (min-width: 900px) {
          .hwi-layout {
            grid-template-columns: 0.92fr 1fr;
            align-items: center;
            gap: 56px;
          }
          .hwi-visual { display: block; }
          .hwi-step { padding: 20px 22px; }
          .hwi-step-copy { max-height: 0; opacity: 0; overflow: hidden; transition: max-height 0.25s ease, opacity 0.2s ease; }
          .hwi-step-active .hwi-step-copy { max-height: 60px; opacity: 1; margin-top: 2px; }
        }

        @media (max-width: 899px) {
          .hwi-inner { padding: 64px 20px 72px; }
          .hwi-header { margin-bottom: 36px; }
          .hwi-step-cue { display: flex; }
          .hwi-step-active .hwi-step-cue { color: var(--gold-light); }
        }
        @media (max-width: 480px) {
          .hwi-cta { width: 100%; justify-content: center; padding: 15px 20px; }
          .hwi-step { padding: 16px 16px; gap: 12px; }
        }
      ` }} />
    </section>
  )
}
