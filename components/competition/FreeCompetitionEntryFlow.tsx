'use client'

import { useState } from 'react'
import { Competition } from '@/lib/competition-data'
import { getOptionLabel } from '@/lib/skill-challenge-config'
import { useCart } from '@/context/CartContext'
import ProgressSteps from './ProgressSteps'
import WatchInfoPanel from './WatchInfoPanel'
import FreeTicketSelector from './FreeTicketSelector'
import SkillChallenge from './SkillChallenge'
import CheckoutStep from './CheckoutStep'

interface Props {
  competition: Competition
}

export default function FreeCompetitionEntryFlow({ competition }: Props) {
  const [currentStep, setCurrentStep] = useState(1)
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
    const challengeId = competition.skillChallengeId ?? ''
    const answerLabel = selectedOptionId
      ? getOptionLabel(challengeId, selectedOptionId)
      : ''

    addItem({
      competitionId: competition.id,
      slug: competition.slug,
      title: competition.title,
      wooProductId: competition.wooProductId,
      quantity: 1,
      price: 0,
      total: 0,
      currency: competition.currency,
      selectedSkillAnswer: answerLabel,
      skillQuestion: competition.skillQuestion,
      skillChallengeId: challengeId,
      skillOptionId: selectedOptionId ?? '',
      isCorrectSkillAnswer: isCorrect,
      timestampAdded: Date.now(),
      image: competition.heroImage,
      isFreeCompetition: true,
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
              <FreeTicketSelector
                competition={competition}
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
                selectedQty={1}
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
