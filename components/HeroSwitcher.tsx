'use client'

import Image from 'next/image'
import type { CompetitionType, CompetitionsByType } from '@/lib/woocommerce'
import { useMoney } from '@/context/StoreSettingsContext'

interface CardConfig {
  type: CompetitionType
  label: string
  tagline: string
}

// 'starter' is no longer a separate visible card — it is promoted to the 'special'
// slot at the data layer (getAllActiveCompetitionsByType). The AP X SWATCH ROYAL POPP
// (formerly Starter Drop) is displayed here as Special Drop regardless of whether its
// WooCommerce competition_type is 'starter'/'free' or 'special'.
const CARD_CONFIG: CardConfig[] = [
  { type: 'weekly',  label: 'Weekly Drop',  tagline: 'Every Week'      },
  { type: 'monthly', label: 'Monthly Drop', tagline: 'Rare Pieces'     },
  { type: 'special', label: 'Special Drop', tagline: 'Limited Edition' },
]

interface Props {
  competitionsByType: CompetitionsByType
  activeType: CompetitionType | null
  onSelect: (type: CompetitionType) => void
}

export default function HeroSwitcher({ competitionsByType, activeType, onSelect }: Props) {
  const fmt = useMoney()
  const visibleCards = CARD_CONFIG.filter(({ type }) => {
    const comp = competitionsByType[type]
    // Archived products (slot = null) and 'To Past Winners' status → hidden
    return comp !== null && comp.competitionStatus !== 'To Past Winners'
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

        <div
          className="hs-cards"
          role="group"
          aria-label="Competition types"
          style={{ '--hs-count': visibleCards.length } as React.CSSProperties}
        >
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

                {/* Product image — absolutely positioned top-right, behind text */}
                {(comp.image || comp.heroImage) && (
                  <div className="hs-card__img-wrap">
                    <Image
                      src={(comp.image || comp.heroImage) as string}
                      alt=""
                      aria-hidden="true"
                      fill
                      className={`hs-card__img${isSoldOut ? ' hs-card__img--soldout' : ''}`}
                      sizes="130px"
                      loading="lazy"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    />
                  </div>
                )}

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
                      <span className="hs-price__val">{fmt(comp.entryPrice)}</span>
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
    case 'To Past Winners':   return 'soldout'
    default:                  return 'live'
  }
}
