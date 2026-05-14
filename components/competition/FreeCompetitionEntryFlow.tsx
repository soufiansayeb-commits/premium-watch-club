'use client'

import { useState } from 'react'
import { Competition } from '@/lib/competition-data'
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
  const [selectedSkillAnswer, setSelectedSkillAnswer] = useState<string | null>(null)

  function goToStep(n: number) {
    setCurrentStep(n)
    if (typeof document !== 'undefined') {
      const el = document.getElementById('progress-bar')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
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
                selectedAnswer={selectedSkillAnswer}
                onAnswerSelect={setSelectedSkillAnswer}
                onBack={() => goToStep(1)}
                onContinue={() => goToStep(3)}
              />
            )}
            {currentStep === 3 && (
              <CheckoutStep
                competition={competition}
                selectedQty={1}
                selectedAnswer={selectedSkillAnswer}
                onBack={() => goToStep(2)}
              />
            )}
          </div>

        </div>
      </main>
    </>
  )
}
