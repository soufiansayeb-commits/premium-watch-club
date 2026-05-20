'use client'

import { useState } from 'react'
import { Competition } from '@/lib/competition-data'
import { getChallenge, getOptionLabel } from '@/lib/skill-challenge-config'
import { trackEvent } from '@/lib/analytics'

interface Props {
  competition: Competition
  selectedOptionId: string | null
  onOptionSelect: (optionId: string) => void
  onBack: () => void
  onContinue: (isCorrect: boolean) => void
}

export default function SkillChallenge({
  competition: c,
  selectedOptionId,
  onOptionSelect,
  onBack,
  onContinue,
}: Props) {
  const [isValidating, setIsValidating] = useState(false)
  const challenge = getChallenge(c.skillChallengeId ?? '')

  function handleOptionSelect(optionId: string) {
    onOptionSelect(optionId)
    trackEvent('skill_answer_selected', {
      competitionId: c.id,
      slug: c.slug,
      optionId,
    })
  }

  async function handleContinue() {
    if (!selectedOptionId || !challenge) return
    setIsValidating(true)

    let isCorrect = false
    try {
      const res = await fetch('/api/skill-challenge/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: challenge.id, optionId: selectedOptionId }),
      })
      if (res.ok) {
        const data = await res.json()
        isCorrect = data.isCorrect === true
      }
    } catch {
      // Network error — entry still proceeds, isCorrect stays false
    }

    trackEvent('skill_answer_confirmed', {
      competitionId: c.id,
      slug: c.slug,
      optionId: selectedOptionId,
    })

    setIsValidating(false)
    onContinue(isCorrect)
  }

  // Visual challenge — requires skillChallengeId on competition
  if (challenge) {
    return (
      <div className="step-panel active" id="panel-step-2">
        <div className="skill-card">

          <div className="skill-card-header">
            <div className="sch-eyebrow">STEP 2 OF 3 — REQUIRED TO ENTER</div>
            <div className="sch-title">Identify the watch</div>
            <div className="sch-sub">
              Study the image below and select the correct watch model. Your answer will be recorded with your entry.
            </div>
          </div>

          <div className="skill-card-body">

            {/* Challenge image: blurred background + circular magnifier */}
            <div className="sch-image-wrap" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={challenge.image}
                alt=""
                className="sch-image-bg"
              />
              <div className="sch-magnifier">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={challenge.image}
                  alt=""
                  className="sch-magnifier-img"
                />
              </div>
              <div className="sch-image-hint">
                <span>Study the detail</span>
              </div>
            </div>

            {/* Question */}
            <div className="skill-question">{challenge.question}</div>

            {/* Answer options — only labels visible, IDs never in DOM attributes */}
            <div className="skill-answers" role="radiogroup" aria-label="Select watch model">
              {challenge.options.map(opt => (
                <div
                  key={opt.id}
                  role="radio"
                  aria-checked={selectedOptionId === opt.id}
                  tabIndex={0}
                  className={`skill-answer${selectedOptionId === opt.id ? ' selected' : ''}`}
                  onClick={() => handleOptionSelect(opt.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') handleOptionSelect(opt.id)
                  }}
                >
                  <div className="sa-radio" />
                  <div className="sa-label">{opt.label}</div>
                </div>
              ))}
            </div>

            <div className="skill-notice">
              Your selected answer will be recorded with your entry. Only entries with the correct answer are eligible for the final draw.
            </div>

            <div className="skill-actions">
              <button className="btn-back" onClick={onBack}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M11 7H3M7 11L3 7l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back
              </button>
              <button
                className="btn-continue"
                disabled={!selectedOptionId || isValidating}
                onClick={handleContinue}
              >
                {isValidating ? 'Confirming…' : 'CONTINUE'}
                {!isValidating && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </div>

          </div>
        </div>
      </div>
    )
  }

  // Fallback: text-based challenge for competitions without a visual challenge ID
  const selectedLabel = selectedOptionId
    ? getOptionLabel(c.skillChallengeId ?? '', selectedOptionId)
    : null

  return (
    <div className="step-panel active" id="panel-step-2">
      <div className="skill-card">
        <div className="skill-card-header">
          <div className="sch-eyebrow">Step 2 of 3 — Required to Enter</div>
          <div className="sch-title">Skill-Based Question</div>
          <div className="sch-sub">
            Answer the skill-based question below. Your selected answer will be recorded with your entry.
            Only entries with the correct answer will be eligible for the final draw.
          </div>
        </div>

        <div className="skill-card-body">
          <div className="skill-question">{c.skillQuestion}</div>

          <div className="skill-answers">
            {c.skillAnswers.map(answer => (
              <div
                key={answer}
                role="radio"
                aria-checked={selectedLabel === answer}
                tabIndex={0}
                className={`skill-answer${selectedLabel === answer ? ' selected' : ''}`}
                onClick={() => onOptionSelect(answer)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onOptionSelect(answer) }}
              >
                <div className="sa-radio" />
                <div className="sa-label">{answer}</div>
              </div>
            ))}
          </div>

          <div className="skill-notice">
            You must select an answer to proceed. All entries are recorded — only entries with the correct answer are eligible for the prize draw.
          </div>

          <div className="skill-actions">
            <button className="btn-back" onClick={onBack}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M11 7H3M7 11L3 7l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back
            </button>
            <button
              className="btn-continue"
              disabled={!selectedOptionId}
              onClick={() => onContinue(false)}
            >
              Confirm & Add to Entry
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
