'use client'

import { Competition } from '@/lib/competition-data'

interface Props {
  competition: Competition
  selectedAnswer: string | null
  onAnswerSelect: (answer: string) => void
  onBack: () => void
  onContinue: () => void
}

export default function SkillChallenge({ competition: c, selectedAnswer, onAnswerSelect, onBack, onContinue }: Props) {
  return (
    <div className="step-panel active" id="panel-step-2">
      <div className="skill-card">
        <div className="skill-card-header">
          <div className="sch-eyebrow">Step 2 of 3 — Required to Enter</div>
          <div className="sch-title">Skill Based Challenge</div>
          <div className="sch-sub">Answer the question below correctly to qualify your entry. This is what makes Premium Watch Club a legal skill competition — not a lottery.</div>
        </div>
        <div className="skill-card-body">

          {/* Question */}
          <div className="skill-question">
            {c.skillQuestion}
          </div>

          {/* Answer options */}
          <div className="skill-answers">
            {c.skillAnswers.map(answer => (
              <div
                key={answer}
                className={`skill-answer${selectedAnswer === answer ? ' selected' : ''}`}
                onClick={() => onAnswerSelect(answer)}
              >
                <div className="sa-radio"></div>
                <div className="sa-label">{answer}</div>
              </div>
            ))}
          </div>

          <div className="skill-notice">
            You must select an answer to proceed. All entries with a correct answer are entered into the final draw.
          </div>

          <div className="skill-actions">
            <button className="btn-back" onClick={onBack}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M11 7H3M7 11L3 7l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>
            <button
              className="btn-continue"
              disabled={!selectedAnswer}
              onClick={onContinue}
            >
              Continue to Checkout
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
