'use client'

import Image from 'next/image'
import type { CompetitionType, CompetitionsByType } from '@/lib/woocommerce'
import { getEffectiveStatus } from '@/lib/competition-status'
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
    if (comp === null) return false
    // Archived ('To Past Winners') and not-yet-open competitions have no card.
    // A scheduled competition should not normally reach here — the data layer
    // never selects one — but hide it defensively if it ever does.
    const status = getEffectiveStatus(comp)
    return status !== 'archived' && status !== 'scheduled'
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
            const isActive   = activeType === type

            // Effective status covers all three routes to closed: the entries
            // deadline passed, every ticket sold, or an admin set it closed.
            const isClosed = getEffectiveStatus(comp) !== 'live'
            const isLive   = !isClosed

            // Card wording is deliberately the short form — "Competition Closed"
            // does not fit this card design.
            const displayStatus = isClosed ? 'Closed' : 'Live'

            // Closed cards stay selectable so visitors can open the closed hero.
            const cardClass = [
              'hs-card',
              isActive  ? 'hs-card--active'  : '',
              isClosed && !isActive ? 'hs-card--soldout' : '',
            ].filter(Boolean).join(' ')

            return (
              <button
                key={type}
                className={cardClass}
                onClick={() => onSelect(type)}
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
                      className={`hs-card__img${isClosed ? ' hs-card__img--soldout' : ''}`}
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
                  <span className="hs-card__name" title={comp.title}>{comp.title}</span>
                </span>

                {/* Bottom price / status strip */}
                <span className="hs-card__price">
                  {isClosed ? (
                    <span className="hs-price--soldout">Closed</span>
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

/**
 * Badge modifier class. Closed cards deliberately keep the existing
 * `hs-badge--soldout` styling so the card design is unchanged — only the
 * wording moves from "Sold Out" to "Closed".
 */
function slugify(status: string): string {
  return status === 'Live' ? 'live' : 'soldout'
}
