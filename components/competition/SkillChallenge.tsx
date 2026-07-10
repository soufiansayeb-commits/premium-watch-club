'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Competition } from '@/lib/competition-data'
import { getChallenge, getOptionLabel } from '@/lib/skill-challenge-config'
import { trackEvent } from '@/lib/analytics'
import StickyMobileCta from '@/components/competition/StickyMobileCta'

// Magnifier glyph for the Step 2 sticky bar — "study the detail".
function InspectGlyph() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M15.8 15.8L20 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

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

  // ── Detect ACF-driven mode ─────────────────────────────────────────────────
  // When challenge_image + answer_options are set on the WooCommerce product,
  // use ACF data. Otherwise fall through to the hardcoded VISUAL_CHALLENGES config.
  const isAcfMode =
    !!c.challengeImage &&
    Array.isArray(c.answerOptions) &&
    c.answerOptions.length > 0

  // ── Debug: log received skill challenge props (remove after confirming) ────
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.group(`[PWC SkillChallenge] product #${c.wooProductId} "${c.title}"`)
    console.log('mode           :', isAcfMode ? 'ACF-driven ✓' : 'hardcoded / fallback')
    console.log('challengeImage :', c.challengeImage ?? '(not set)')
    console.log('answerOptions  :', c.answerOptions ?? '(not set)')
    console.log('skillChallengeId:', c.skillChallengeId ?? '(not set)')
    console.groupEnd()
  }

  // Hardcoded challenge config (used when ACF fields are not set)
  const challenge = isAcfMode ? null : getChallenge(c.skillChallengeId ?? '')

  function handleOptionSelect(optionId: string) {
    onOptionSelect(optionId)
    trackEvent('skill_answer_selected', {
      competitionId: c.id,
      slug: c.slug,
      optionId,
    })
  }

  async function handleContinue() {
    if (!selectedOptionId) return
    setIsValidating(true)

    let isCorrect = false
    try {
      let res: Response

      if (isAcfMode) {
        // ACF mode: validate by productId + selectedAnswer on the server.
        // correct_answer is never sent to the client — comparison is server-side.
        res = await fetch('/api/skill-challenge/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId:      c.wooProductId,
            selectedAnswer: selectedOptionId,
          }),
        })
      } else {
        // Hardcoded mode: validate by challengeId + optionId
        res = await fetch('/api/skill-challenge/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ challengeId: challenge?.id, optionId: selectedOptionId }),
        })
      }

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

  // ── ACF-driven visual challenge ────────────────────────────────────────────
  if (isAcfMode) {
    return (
      <div className="step-panel active" id="panel-step-2">
        <div className="skill-card">

          <div className="skill-card-header">
            <div className="sch-eyebrow">STEP 2 OF 3 · REQUIRED TO ENTER</div>
            <div className="sch-title">Identify the watch</div>
            <div className="sch-sub">
              Study the image below and select the correct watch model. Your answer will be recorded with your entry.
            </div>
          </div>

          <div className="skill-card-body">

            {/* Challenge image: display uploaded Canva image as-is, no zoom/magnifier */}
            <div className="sch-challenge-image" style={{ position: 'relative' }}>
              <Image
                src={c.challengeImage!}
                alt="Skill challenge"
                fill
                style={{ objectFit: 'contain' }}
                sizes="320px"
              />
            </div>

            {/* Hardcoded question text — never changes */}
            <div className="skill-question">Which watch model is shown in the image?</div>

            {/* Answer options from ACF — each label is also its own option ID */}
            <div className="skill-answers" role="radiogroup" aria-label="Select watch model">
              {c.answerOptions!.map(option => (
                <div
                  key={option}
                  role="radio"
                  aria-checked={selectedOptionId === option}
                  tabIndex={0}
                  className={`skill-answer${selectedOptionId === option ? ' selected' : ''}`}
                  onClick={() => handleOptionSelect(option)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') handleOptionSelect(option)
                  }}
                >
                  <div className="sa-radio" />
                  <div className="sa-label">{option}</div>
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

        {/* Mobile-only sticky CTA — same handler + validation as the button above.
            Neutral until an answer is picked, then it activates. */}
        <StickyMobileCta
          visible
          active={!!selectedOptionId}
          bumpKey={selectedOptionId ?? 'idle'}
          icon={<InspectGlyph />}
          primary={selectedOptionId ? 'Answer selected' : 'Select your answer'}
          secondary="Step 2 of 3"
          label={isValidating ? 'Confirming…' : 'Continue'}
          onClick={handleContinue}
          disabled={!selectedOptionId || isValidating}
          hideArrow={isValidating}
        />
      </div>
    )
  }

  // ── Hardcoded visual challenge (VISUAL_CHALLENGES config) ──────────────────
  if (challenge) {
    return (
      <div className="step-panel active" id="panel-step-2">
        <div className="skill-card">

          <div className="skill-card-header">
            <div className="sch-eyebrow">STEP 2 OF 3 · REQUIRED TO ENTER</div>
            <div className="sch-title">Identify the watch</div>
            <div className="sch-sub">
              Study the image below and select the correct watch model. Your answer will be recorded with your entry.
            </div>
          </div>

          <div className="skill-card-body">

            <div className="sch-image-wrap" aria-hidden="true">
              <Image
                src={challenge.image}
                alt="Competition skill question image"
                fill
                className="sch-image-bg"
                style={{ objectFit: 'cover' }}
                sizes="(max-width: 640px) 100vw, 480px"
              />
              <div className="sch-magnifier">
                <Image
                  src={challenge.image}
                  alt=""
                  width={415}
                  height={415}
                  className="sch-magnifier-img"
                  sizes="415px"
                />
              </div>
              <div className="sch-image-hint">
                <span>Study the detail</span>
              </div>
            </div>

            <div className="skill-question">{challenge.question}</div>

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

        {/* Mobile-only sticky CTA — same handler + validation as the button above.
            Neutral until an answer is picked, then it activates. */}
        <StickyMobileCta
          visible
          active={!!selectedOptionId}
          bumpKey={selectedOptionId ?? 'idle'}
          icon={<InspectGlyph />}
          primary={selectedOptionId ? 'Answer selected' : 'Select your answer'}
          secondary="Step 2 of 3"
          label={isValidating ? 'Confirming…' : 'Continue'}
          onClick={handleContinue}
          disabled={!selectedOptionId || isValidating}
          hideArrow={isValidating}
        />
      </div>
    )
  }

  // ── Fallback: text-only challenge (no image, no hardcoded config) ──────────
  const selectedLabel = selectedOptionId
    ? getOptionLabel(c.skillChallengeId ?? '', selectedOptionId)
    : null

  return (
    <div className="step-panel active" id="panel-step-2">
      <div className="skill-card">
        <div className="skill-card-header">
          <div className="sch-eyebrow">Step 2 of 3 · Required to Enter</div>
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
            You must select an answer to proceed. All entries are recorded, only entries with the correct answer are eligible for the prize draw.
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

      {/* Mobile-only sticky CTA — same handler + validation as the button above.
          Neutral until an answer is picked, then it activates. */}
      <StickyMobileCta
        visible
        active={!!selectedOptionId}
        bumpKey={selectedOptionId ?? 'idle'}
        icon={<InspectGlyph />}
        primary={selectedOptionId ? 'Answer selected' : 'Select your answer'}
        secondary="Step 2 of 3"
        label="Confirm"
        onClick={() => onContinue(false)}
        disabled={!selectedOptionId}
      />
    </div>
  )
}
