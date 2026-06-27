'use client'

import { motion } from 'motion/react'

const steps = [
  {
    num: '01',
    title: 'Select Your Entry',
    detail: '1 – 20 entries per draw',
    desc: 'Choose your number of entries for the competition. More entries increase your chances of winning, you decide your level of commitment.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V5a2 2 0 0 0-4 0v2M8 7V5a2 2 0 0 0-4 0v2"/>
        <line x1="12" y1="12" x2="12" y2="16"/>
        <line x1="10" y1="14" x2="14" y2="14"/>
      </svg>
    ),
  },
  {
    num: '02',
    title: 'Answer the Question',
    detail: 'Skill-based, not a lottery',
    desc: 'A focused question on watchmaking or horology. Your knowledge is your entry, this is what makes PWC a legal, skill-based competition in the UK and EU.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <circle cx="12" cy="17" r=".5" fill="currentColor"/>
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Secure Checkout',
    detail: 'Entry confirmed instantly',
    desc: 'Complete your entry through our secure checkout. Your entry numbers are confirmed immediately and registered exclusively in your name.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="11" width="18" height="11" rx="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        <circle cx="12" cy="16" r="1" fill="currentColor"/>
      </svg>
    ),
  },
  {
    num: '04',
    title: 'Watch the Live Draw',
    detail: 'Live. Verified. Transparent.',
    desc: 'Every draw is streamed live, independently witnessed and recorded. The winner is contacted within the hour, the footage is kept on permanent record.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
]

const EASE = [0.22, 1, 0.36, 1] as const

const cardVariants = {
  hidden: { opacity: 0, y: 44, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.50,
      delay: i * 0.14,
      ease: EASE,
    },
  }),
}

export default function HowItWorks() {
  return (
    <section id="how" className="hiw-section">
      <div className="hiw-inner">
        <motion.div
          className="hiw-header"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.55, ease: EASE }}
        >
          <div className="section-eyebrow">The Process</div>
          <h2 className="hiw-title">Four steps to your dream watch</h2>
          <p className="hiw-subtitle">
            A skill-based competition, not a lottery. Answer a question on horology and take home the prize.
          </p>
        </motion.div>

        <div className="hiw-grid">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              className="hiw-card-wrap"
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
            >
              <div className="hiw-card">
                <div className="hiw-card-ghost-num" aria-hidden="true">{step.num}</div>
                <div className="hiw-card-inner">
                  <div className="hiw-card-top">
                    <span className="hiw-num">{step.num}</span>
                    <div className="hiw-icon-wrap" aria-hidden="true">{step.icon}</div>
                  </div>
                  <div className="hiw-card-body">
                    <div className="hiw-detail">{step.detail}</div>
                    <h3 className="hiw-card-title">{step.title}</h3>
                    <p className="hiw-card-desc">{step.desc}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
