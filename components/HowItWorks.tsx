const steps = [
  {
    num: '01',
    title: 'Select Your Entry',
    desc: 'Choose 1 to 20 entries at £5.95 each. Greater commitment, greater odds — you decide your level.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V5a2 2 0 0 0-4 0v2"/>
        <path d="M8 7V5a2 2 0 0 0-4 0v2"/>
        <line x1="12" y1="12" x2="12" y2="16"/>
        <line x1="10" y1="14" x2="14" y2="14"/>
      </svg>
    ),
  },
  {
    num: '02',
    title: 'Answer the Question',
    desc: 'A focused question on watchmaking or horology. This is what makes PWC a competition — entirely legal in the UK and EU.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <circle cx="12" cy="17" r=".5" fill="currentColor"/>
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Secure Checkout',
    desc: 'Pay safely via card or PayPal. Your entry numbers are confirmed immediately and held exclusively in your name.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="11" width="18" height="11" rx="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        <circle cx="12" cy="16" r="1" fill="currentColor"/>
      </svg>
    ),
  },
  {
    num: '04',
    title: 'Watch the Live Draw',
    desc: 'Every draw is streamed live, independently verified and recorded. Winners are notified within the hour.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
]

export default function HowItWorks() {
  return (
    <section id="how" className="how-section">
      <div className="container">
        <div className="section-header reveal">
          <div className="section-eyebrow">The Process</div>
          <h2 className="section-headline">Four steps to your dream watch</h2>
          <p className="section-sub">
            A skill-based competition — not a lottery. Answer a question on horology and take home the prize.
          </p>
        </div>

        <div className="how-steps-row">
          <div className="how-connector" aria-hidden="true" />
          {steps.map((step, i) => (
            <div key={step.num} className={`how-step reveal${i > 0 ? ` d${i}` : ''}`} tabIndex={0}>
              <div className="how-step-top">
                <div className="how-step-num">{step.num}</div>
                <div className="how-step-icon-wrap" aria-hidden="true">
                  <div className="how-step-icon">{step.icon}</div>
                </div>
              </div>
              <div className="how-step-divider" aria-hidden="true" />
              <div className="how-step-body">
                <div className="how-step-title">{step.title}</div>
                <p className="how-step-desc">{step.desc}</p>
              </div>
              <div className="how-step-accent" aria-hidden="true" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
