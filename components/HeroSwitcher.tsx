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
    // Closed products (slot = null) and explicitly-Closed status → hidden
    return comp !== null && comp.competitionStatus !== 'Closed'
  })

  if (visibleCards.length === 0) return null

  return (
    <section className="hs-section" aria-label="Competition type selector">
      <div className="hs-inner">
        <div className="hs-rule" aria-hidden="true">
          <div className="hs-rule-line" />
          <span className="hs-rule-label">SELECT DROP</span>
          <div className="hs-rule-line" />
        </div>

        <div className="hs-cards" role="group" aria-label="Competition types">
          {visibleCards.map(({ type, label, tagline }) => {
            const comp = competitionsByType[type]!
            const acfStatus  = comp.competitionStatus ?? 'Live'
            const isActive   = activeType === type

            // Sold Out = either admin set ACF status OR stock hit 0 (ticketsLeft <= 0)
            // This covers both explicit 'Sold Out' and Live-but-zero-stock scenarios.
            const isSoldOut    = acfStatus === 'Sold Out' || comp.ticketsLeft <= 0
            const isComingSoon = acfStatus === 'Coming Soon'
            const isLive       = !isSoldOut && !isComingSoon

            // Derived display status for badge (overrides raw ACF when stock=0)
            const displayStatus = isSoldOut ? 'Sold Out' : acfStatus

            // Only Coming Soon is fully non-clickable.
            // Sold Out can still be selected so users can see the sold-out hero.
            const isDisabled = isComingSoon

            const cardClass = [
              'hs-card',
              isActive   ? 'hs-card--active'   : '',
              isDisabled ? 'hs-card--disabled'  : '',
              isSoldOut && !isActive ? 'hs-card--soldout' : '',
            ].filter(Boolean).join(' ')

            return (
              <button
                key={type}
                className={cardClass}
                onClick={() => !isDisabled && onSelect(type)}
                disabled={isDisabled}
                aria-pressed={isActive}
                aria-label={`${label} — ${displayStatus}`}
                type="button"
              >
                {/* Gold top accent bar (slides in on active) */}
                <span className="hs-card__topbar" aria-hidden="true" />

                {/* Status badge */}
                <span className={`hs-card__badge hs-badge--${slugify(displayStatus)}`}>
                  {isLive && <span className="hs-badge__dot" aria-hidden="true" />}
                  {displayStatus}
                </span>

                {/* Text content */}
                <span className="hs-card__body">
                  <span className="hs-card__tagline">{tagline}</span>
                  <span className="hs-card__label">{label}</span>
                  {!isComingSoon && (
                    <span className="hs-card__name" title={comp.title}>{comp.title}</span>
                  )}
                </span>

                {/* Bottom price / status strip */}
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
