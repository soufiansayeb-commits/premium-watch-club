'use client'

import { useState } from 'react'

interface FaqItem {
  question: string
  answer: string
}

interface FaqAccordionProps {
  items: FaqItem[]
}

export default function FaqAccordion({ items }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="faq-accordion">
      {items.map((item, i) => {
        const isOpen = openIndex === i
        return (
          <div key={i} className={`faq-item${isOpen ? ' faq-item--open' : ''}`}>
            <button
              className="faq-trigger"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
            >
              <span className="faq-trigger-q">{item.question}</span>
              <span className="faq-trigger-icon" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <line x1="7" y1="0.5" x2="7" y2="13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="faq-icon-v"/>
                  <line x1="0.5" y1="7" x2="13.5" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </span>
            </button>
            <div className="faq-body" aria-hidden={!isOpen}>
              <div className="faq-body-inner">
                <p className="faq-answer-text">{item.answer}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
