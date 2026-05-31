'use client'

import type { CompetitionType, CompetitionsByType } from '@/lib/woocommerce'

interface CardConfig {
  type: CompetitionType
  label: string
  tagline: string
}

const CARD_CONFIG: CardConfig[] = [
  { type: 'starter', label: 'Starter Drop', tagline: 'Entry Level' },
  { type: 'weekly',  label: 'Weekly Drop',  tagline: 'Every Week'  },
  { type: 'monthly', label: 'Monthly Drop', tagline: 'Rare Pieces' },
  { type: 'special', label: 'Special Drop', tagline: 'Limited Edition' },
]

interface Props {
  competitionsByType: CompetitionsByType
  activeType: CompetitionType | null
  onSelect: (type: CompetitionType) => void
}

export default function HeroSwitcher({ competitionsByType, activeType, onSelect }: Props) {
  const visibleCards = CARD_CONFIG.filter(({ type }) => {
    const comp = competitionsByType[type]
    return comp !== null && comp.competitionStatus !== 'Closed'
  })

  if (visibleCards.length === 0) return null

  return (
    <section className="hs-section" aria-label="Competition type selector">
      <div className="hs-inner">
        {/* Decorative rule */}
        <div className="hs-rule" aria-hidden="true">
          <div className="hs-rule-line" />
          <span className="hs-rule-label">SELECT DROP</span>
          <div className="hs-rule-line" />
        </div>

        <div className="hs-cards" role="group" aria-label="Competition types">
          {visibleCards.map(({ type, label, tagline }) => {
            const comp = competitionsByType[type]!
            const status = comp.competitionStatus ?? 'Live'
            const isActive      = activeType === type
            const isLive        = status === 'Live'
            const isSoldOut     = status === 'Sold Out'
            const isComingSoon  = status === 'Coming Soon'
            const isDisabled    = isComingSoon // Coming Soon = not clickable (Sold Out CAN be shown as last state but not enterable)

            const cardClass = [
              'hs-card',
              isActive    ? 'hs-card--active'   : '',
              isDisabled  ? 'hs-card--disabled' : '',
              isLive && !isActive ? 'hs-card--live' : '',
            ].filter(Boolean).join(' ')

            return (
              <button
                key={type}
                className={cardClass}
                onClick={() => !isDisabled && onSelect(type)}
                disabled={isDisabled}
                aria-pressed={isActive}
                aria-label={`${label} — ${status}`}
                type="button"
              >
                {/* Gold top accent bar (visible when active) */}
                <span className="hs-card__topbar" aria-hidden="true" />

                {/* Status badge */}
                <span className={`hs-card__badge hs-badge--${slugify(status)}`}>
                  {isLive && <span className="hs-badge__dot" aria-hidden="true" />}
                  {status}
                </span>

                {/* Text content */}
                <span className="hs-card__body">
                  <span className="hs-card__tagline">{tagline}</span>
                  <span className="hs-card__label">{label}</span>
                  {!isComingSoon && (
                    <span className="hs-card__name" title={comp.title}>{comp.title}</span>
                  )}
                </span>

                {/* Bottom price area */}
                <span className="hs-card__price">
                  {isComingSoon ? (
                    <span className="hs-price--soon">Notify me</span>
                  ) : isSoldOut ? (
                    <span className="hs-price--soldout">Sold Out</span>
                  ) : comp.isFree || comp.entryPrice === 0 ? (
                    <span className="hs-price--free">FREE</span>
                  ) : (
                    <>
                      <span className="hs-price__val">{comp.currency}{comp.entryPrice.toFixed(2)}</span>
                      <span className="hs-price__per"> / entry</span>
                    </>
                  )}
                </span>

                {/* Active indicator arrow */}
                {isActive && (
                  <span className="hs-card__arrow" aria-hidden="true">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 1v10M1 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function slugify(status: string): string {
  switch (status) {
    case 'Live':              return 'live'
    case 'Coming Soon':       return 'soon'
    case 'Sold Out':          return 'soldout'
    case 'Draw Pending':      return 'draw'
    case 'Winner Announced':  return 'winner'
    default:                  return 'live'
  }
}
