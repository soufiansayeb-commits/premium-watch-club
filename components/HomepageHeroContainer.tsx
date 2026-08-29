'use client'

import { useState, useEffect } from 'react'
import type { CompetitionType, CompetitionsByType } from '@/lib/woocommerce'
import { getEffectiveStatus } from '@/lib/competition-status'
import HomepageHero from './HomepageHero'
import HeroSwitcher from './HeroSwitcher'

interface Props {
  competitionsByType: CompetitionsByType
  defaultType?: CompetitionType
}

// Default hero priority: Weekly first, then Monthly, then Special.
const TYPE_ORDER: CompetitionType[] = ['weekly', 'monthly', 'special', 'starter']

// Map CompetitionType ↔ URL path for URL sync
const TYPE_TO_PATH: Partial<Record<CompetitionType, string>> = {
  weekly:  '/weekly',
  monthly: '/monthly',
  special: '/special',
}
const PATH_TO_TYPE: Record<string, CompetitionType> = {
  '/weekly':  'weekly',
  '/monthly': 'monthly',
  '/special': 'special',
}

/**
 * Pick the initial active competition type.
 * If defaultType is provided (ad landing route) and that slot is selectable, use it.
 * Otherwise: effectively Live (Weekly first) → any selectable slot → first non-null.
 */
function resolveDefault(comps: CompetitionsByType, defaultType?: CompetitionType): CompetitionType | null {
  // Landing-route override: honour it whenever the slot has something to show
  if (defaultType) {
    const c = comps[defaultType]
    if (c && isSelectable(c)) return defaultType
  }
  // Prefer an enterable Live competition — Weekly Drop has highest priority
  for (const t of TYPE_ORDER) {
    const c = comps[t]
    if (c && getEffectiveStatus(c) === 'live') return t
  }
  // Fall back to a closed competition — still worth showing
  for (const t of TYPE_ORDER) {
    const c = comps[t]
    if (c && isSelectable(c)) return t
  }
  // Last resort: first non-null slot
  for (const t of TYPE_ORDER) {
    if (comps[t] !== null) return t
  }
  return null
}

/**
 * A competition is selectable (card click changes the hero) unless it is archived
 * or has not reached its Go Live moment. Closed competitions ARE selectable —
 * visitors can view the closed hero; the CTA is disabled inside HomepageHero.
 */
function isSelectable(comp: NonNullable<CompetitionsByType[CompetitionType]>): boolean {
  const status = getEffectiveStatus(comp)
  return status !== 'archived' && status !== 'scheduled'
}

export default function HomepageHeroContainer({ competitionsByType, defaultType }: Props) {
  const [activeType, setActiveType] = useState<CompetitionType | null>(
    () => resolveDefault(competitionsByType, defaultType)
  )

  const activeCompetition = activeType ? competitionsByType[activeType] : null

  // Sync URL to active type on mount (handles / → /weekly) and on each change.
  // Uses history API directly — no Next.js navigation, no re-fetch, no page flash.
  useEffect(() => {
    if (!activeType) return
    const targetPath = TYPE_TO_PATH[activeType]
    if (!targetPath) return
    if (window.location.pathname !== targetPath) {
      // replaceState on mount so visiting / doesn't add a history entry
      window.history.replaceState(null, '', targetPath)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps — intentionally only on mount

  // Handle browser back/forward — keep active tab in sync with URL
  useEffect(() => {
    function onPopState() {
      const type = PATH_TO_TYPE[window.location.pathname]
      if (!type) return
      const comp = competitionsByType[type]
      if (comp && isSelectable(comp)) setActiveType(type)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [competitionsByType])

  function handleSelect(type: CompetitionType) {
    const comp = competitionsByType[type]
    if (!comp || !isSelectable(comp)) return
    setActiveType(type)
    // Update URL without navigation — pushState so back button returns to previous tab
    const path = TYPE_TO_PATH[type]
    if (path && window.location.pathname !== path) {
      window.history.pushState(null, '', path)
    }
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
