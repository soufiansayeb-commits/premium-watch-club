interface Props {
  currentStep: number
}

const CheckSvg = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export default function ProgressSteps({ currentStep }: Props) {
  const steps = [
    { num: 1, label: 'Select Your Tickets' },
    { num: 2, label: 'Skill Based Challenge' },
    { num: 3, label: 'Checkout' },
  ]

  return (
    <div id="progress-bar">
      <div className="progress-inner">
        {steps.map(step => {
          const isDone   = step.num < currentStep
          const isActive = step.num === currentStep
          const cls = `progress-step${isActive ? ' active' : ''}${isDone ? ' done' : ''}`

          return (
            <div key={step.num} className={cls} id={`step-nav-${step.num}`}>
              <div className="ps-num">
                {isDone ? <CheckSvg /> : step.num}
              </div>
              <div className="ps-label">{step.label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
