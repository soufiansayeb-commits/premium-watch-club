'use client'

import { useState } from 'react'
import { Competition } from '@/lib/competition-data'
import { getOptionLabel } from '@/lib/skill-challenge-config'
import { useCart } from '@/context/CartContext'
import ProgressSteps from './ProgressSteps'
import WatchInfoPanel from './WatchInfoPanel'
import TicketSelector from './TicketSelector'
import SkillChallenge from './SkillChallenge'
import CheckoutStep from './CheckoutStep'

interface Props {
  competition: Competition
}

export default function CompetitionEntryFlow({ competition }: Props) {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedTicketQty, setSelectedTicketQty] = useState(1)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const { addItem } = useCart()

  function scrollToEntry() {
    if (typeof document !== 'undefined') {
      const el = document.getElementById('progress-bar')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  function goToStep(n: number) {
    setCurrentStep(n)
    scrollToEntry()
  }

  function handleSkillContinue(isCorrect: boolean) {
    // Always use selectedTicketQty — it is already clamped to allowedMaxQty by
    // TicketSelector. Never force qty=1 based on isFree; sold_individually is
    // the only source of truth for single-entry products.
    const qty = selectedTicketQty
    const price = competition.entryPrice
    const isFree = !!competition.isFree
    const challengeId = competition.skillChallengeId ?? ''
    const answerLabel = selectedOptionId
      ? getOptionLabel(challengeId, selectedOptionId)
      : ''

    addItem({
      competitionId: competition.id,
      slug: competition.slug,
      title: competition.title,
      wooProductId: competition.wooProductId,
      quantity: qty,
      price,
      total: qty * price,
      currency: competition.currency,
      selectedSkillAnswer: answerLabel,
      skillQuestion: competition.skillQuestion,
      skillChallengeId: challengeId,
      skillOptionId: selectedOptionId ?? '',
      isCorrectSkillAnswer: isCorrect,
      timestampAdded: Date.now(),
      image: competition.heroImage,
      isFreeCompetition: isFree,
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
                selectedQty={selectedTicketQty}
                selectedAnswer={selectedOptionId
                  ? getOptionLabel(competition.skillChallengeId ?? '', selectedOptionId)
                  : null}
                onBack={() => goToStep(2)}
              />
            )}
          </div>
        </div>
      </main>
    </>
  )
}
