'use client'

// Two-column accordion for the compact homepage FAQ. Reuses the global
// .faq-item / .faq-trigger / .faq-body styling, but splits the items across
// two columns to roughly halve the section height. One shared open state, so
// only a single answer is ever expanded at a time.

import { useState } from 'react'
import type { FaqItem } from '@/lib/faq-data'

export default function HomeFaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const half = Math.ceil(items.length / 2)
  const columns = [items.slice(0, half), items.slice(half)]

  return (
    <div className="home-faq-cols">
      {columns.map((col, ci) => (
        <div className="home-faq-col" key={ci}>
          {col.map((item, j) => {
            const idx = (ci === 0 ? 0 : half) + j
            const isOpen = openIndex === idx
            return (
              <div key={idx} className={`faq-item${isOpen ? ' faq-item--open' : ''}`}>
                <button
                  className="faq-trigger"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
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
      ))}
    </div>
  )
}
