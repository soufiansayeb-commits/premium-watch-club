'use client'

import { useState } from 'react'
import type { CompetitionType, CompetitionsByType } from '@/lib/woocommerce'
import HomepageHero from './HomepageHero'
import HeroSwitcher from './HeroSwitcher'

interface Props {
  competitionsByType: CompetitionsByType
}

const TYPE_ORDER: CompetitionType[] = ['starter', 'weekly', 'monthly', 'special']

/**
 * Pick the initial active competition type.
 * 1. First Live slot (starter → weekly → monthly → special).
 * 2. Fall back to first slot that has any product at all (Coming Soon shown in disabled hero).
 * 3. null = truly no products → show empty state.
 */
function resolveDefault(comps: CompetitionsByType): CompetitionType | null {
  for (const t of TYPE_ORDER) {
    if (comps[t]?.competitionStatus === 'Live') return t
  }
  for (const t of TYPE_ORDER) {
    if (comps[t] !== null) return t
  }
  return null
}

/** A competition is clickable in the switcher only when it is Live AND has tickets. */
function isSelectable(comp: NonNullable<CompetitionsByType[CompetitionType]>): boolean {
  return comp.competitionStatus === 'Live' && comp.ticketsLeft > 0
}

export default function HomepageHeroContainer({ competitionsByType }: Props) {
  const [activeType, setActiveType] = useState<CompetitionType | null>(
    () => resolveDefault(competitionsByType)
  )

  const activeCompetition = activeType ? competitionsByType[activeType] : null

  function handleSelect(type: CompetitionType) {
    const comp = competitionsByType[type]
    if (!comp || !isSelectable(comp)) return
    setActiveType(type)
  }

  const switcher = (
    <HeroSwitcher
      competitionsByType={competitionsByType}
      activeType={activeType}
      onSelect={handleSelect}
    />
  )

  if (!activeCompetition) {
    // No products in WooCommerce at all — truly empty state
    return (
      <section id="hero">
        <div className="h2-bg-gradient" />
        <div className="h2-bg-vignette" />
        <div className="h2-topline" />
        <div style={{
          position: 'relative', zIndex: 5,
          maxWidth: 1200, margin: '0 auto', padding: '120px 32px 60px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', color: 'var(--gold)', marginBottom: 16, textTransform: 'uppercase' }}>
            PREMIUM WATCH CLUB
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px,5vw,56px)', color: 'var(--text-on-dark)', marginBottom: 16 }}>
            New Drops Coming Soon
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-muted-dark)', maxWidth: 480, margin: '0 auto' }}>
            Select a competition type below to explore upcoming drops.
          </p>
        </div>
        {switcher}
        <div className="h2-strip">
          Premium Watch Club · Publicly streamed live draw
        </div>
      </section>
    )
  }

  return (
    // key forces HomepageHero (and all its children incl. LiveActivity) to remount
    // on every competition switch → fresh countdown timer + fresh order activity fetch
    <HomepageHero
      key={activeType}
      competition={activeCompetition}
      switcherSlot={switcher}
    />
  )
}
