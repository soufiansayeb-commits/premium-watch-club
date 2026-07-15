'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Competition } from '@/lib/competition-data'
import { isSoldOut, getStatusLabel } from '@/lib/competition-status'
import { getOptionLabel } from '@/lib/skill-challenge-config'
import { bundleLineTotal, getEligibleTiers } from '@/lib/bundle-discounts'
import { useCart } from '@/context/CartContext'
import { useBundleConfig } from '@/context/BundleConfigContext'
import ProgressSteps from './ProgressSteps'
import WatchInfoPanel from './WatchInfoPanel'
import TicketSelector from './TicketSelector'
import SkillChallenge from './SkillChallenge'
import CheckoutStep from './CheckoutStep'
import LiveActivityToast from './LiveActivityToast'

interface Props {
  competition: Competition
}

export default function CompetitionEntryFlow({ competition }: Props) {
  // ── Sold-out gate — blocks all entry steps ────────────────────────────────
  if (isSoldOut(competition)) {
    return (
      <>
        <ProgressSteps currentStep={1} />
        <main id="entry-main">
          <div className="entry-grid">
            <WatchInfoPanel competition={competition} />
            <div className="entry-right">
              <div className="step-panel active" id="panel-step-1">
                <div className="entry-card">
                  <div className="entry-card-header" style={{ textAlign: 'center', padding: '40px 32px 24px' }}>
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '6px 20px',
                        background: 'rgba(18,12,4,0.92)',
                        border: '1px solid rgba(212,175,55,0.3)',
                        color: 'rgba(212,175,55,0.7)',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.2em',
                        borderRadius: '2px',
                        marginBottom: '20px',
                      }}
                    >
                      {getStatusLabel(competition)}
                    </div>
                    <div className="ech-title" style={{ marginBottom: '12px' }}>{competition.title}</div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.6, maxWidth: '360px', margin: '0 auto' }}>
                      All entries for this competition have been sold. The draw will be conducted among the registered entries.
                    </p>
                  </div>
                  <div className="entry-card-body" style={{ textAlign: 'center', paddingBottom: '32px' }}>
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '14px 40px',
                        background: 'rgba(18,12,4,0.92)',
                        border: '1px solid rgba(212,175,55,0.22)',
                        color: 'rgba(212,175,55,0.45)',
                        fontSize: '13px',
                        fontWeight: 700,
                        letterSpacing: '0.18em',
                        borderRadius: '2px',
                        cursor: 'not-allowed',
                        marginBottom: '24px',
                      }}
                    >
                      SOLD OUT
                    </div>
                    <div>
                      <Link
                        href="/"
                        style={{
                          display: 'inline-block',
                          padding: '10px 24px',
                          border: '1px solid var(--border-mid)',
                          color: 'var(--text-muted)',
                          fontSize: '12px',
                          fontWeight: 600,
                          letterSpacing: '0.1em',
                          borderRadius: '2px',
                          textDecoration: 'none',
                        }}
                      >
                        Browse Other Competitions
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </>
    )
  }

  const [currentStep, setCurrentStep] = useState(1)
  // No preselection: the visitor must explicitly choose a ticket package. null =
  // nothing selected yet (the buy box + sticky bar render a neutral state).
  const [selectedTicketQty, setSelectedTicketQty] = useState<number | null>(null)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const { addItem } = useCart()
  const bundleConfig = useBundleConfig()

  // Skip the scroll on first mount; only scroll on an actual step transition.
  const hasMountedRef = useRef(false)

  // After a step change, bring the new step's content (its heading) into view —
  // not the very top of the page. scroll-margin-top on .step-panel keeps the
  // heading clear of the sticky header. Runs after paint so the panel exists.
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      return
    }
    const el = document.getElementById(`panel-step-${currentStep}`)
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [currentStep])

  function goToStep(n: number) {
    setCurrentStep(n)
  }

  function handleSkillContinue(isCorrect: boolean) {
    // Guard: Step 2 is only reachable after a ticket package was explicitly
    // selected in Step 1 (Continue is disabled otherwise), so this never fires
    // without a quantity — but keep the flow honest and never default to 1.
    if (selectedTicketQty == null) return
    // selectedTicketQty is already clamped to allowedMaxQty by TicketSelector.
    // Never force qty=1 based on isFree; sold_individually is the only source of
    // truth for single-entry products.
    const qty = selectedTicketQty
    const price = competition.entryPrice
    const isFree = !!competition.isFree
    // Resolve the live discount tiers for this competition so the cart line total
    // matches what WooCommerce will charge (0 discount when ineligible/free).
    const tiers = getEligibleTiers(bundleConfig, competition.competitionType, price, isFree)
    const isAcfMode = !!competition.challengeImage && (competition.answerOptions?.length ?? 0) > 0
    const challengeId = competition.skillChallengeId ?? ''
    // ACF mode: selectedOptionId IS the human-readable label (option text = option ID).
    // Hardcoded mode: resolve label via getOptionLabel lookup.
    const answerLabel = selectedOptionId
      ? (isAcfMode ? selectedOptionId : getOptionLabel(challengeId, selectedOptionId))
      : ''

    addItem({
      competitionId: competition.id,
      slug: competition.slug,
      title: competition.title,
      wooProductId: competition.wooProductId,
      quantity: qty,
      price,
      total: bundleLineTotal(price, tiers, qty),
      currency: competition.currency,
      selectedSkillAnswer: answerLabel,
      skillQuestion: competition.skillQuestion,
      skillChallengeId: challengeId,
      skillOptionId: selectedOptionId ?? '',
      isCorrectSkillAnswer: isCorrect,
      timestampAdded: Date.now(),
      image: competition.heroImage,
      isFreeCompetition: isFree,
      competitionType: competition.competitionType,
      maxTicketsPerPurchase: competition.maxTicketsPerPurchase,
    })

    goToStep(3)
  }

  return (
    <>
      <ProgressSteps currentStep={currentStep} />

      <main id="entry-main">
        <div className="entry-grid">
          <WatchInfoPanel competition={competition} />

          <div className="entry-right">
            {currentStep === 1 && (
              <TicketSelector
                competition={competition}
                selectedQty={selectedTicketQty}
                onQtyChange={setSelectedTicketQty}
                onContinue={() => goToStep(2)}
              />
            )}
            {currentStep === 2 && (
              <SkillChallenge
                competition={competition}
                selectedOptionId={selectedOptionId}
                onOptionSelect={setSelectedOptionId}
                onBack={() => goToStep(1)}
                onContinue={handleSkillContinue}
              />
            )}
            {currentStep === 3 && (
              <CheckoutStep
                competition={competition}
                selectedAnswer={selectedOptionId
                  ? (!!competition.challengeImage && (competition.answerOptions?.length ?? 0) > 0
                      ? selectedOptionId
                      : getOptionLabel(competition.skillChallengeId ?? '', selectedOptionId))
                  : null}
                onBack={() => goToStep(2)}
              />
            )}
          </div>
        </div>
      </main>

      {/* Mobile-only live-activity toast — real order data, floats above the sticky
          Continue bar. Shown only during the buying steps (1–2); hidden on the
          checkout step (3) so it never distracts at the conversion/handoff moment. */}
      {(currentStep === 1 || currentStep === 2) && (
        <LiveActivityToast productId={competition.wooProductId} />
      )}
    </>
  )
}
