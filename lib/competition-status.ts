// lib/competition-status.ts
// Centralized competition lifecycle helpers.
// Import these everywhere — never duplicate the sold-out / enterable logic.

import type { Competition } from './competition-data'

/**
 * A competition is sold out when:
 * - ticketsLeft is 0 or below (live WooCommerce stock_quantity), OR
 * - the ACF competition_status field is explicitly 'Sold Out'
 *
 * Both conditions are checked so that admin overrides (ACF status) work
 * even if stock has not yet been zeroed in WooCommerce.
 */
export function isSoldOut(competition: Competition): boolean {
  return (
    competition.ticketsLeft <= 0 ||
    competition.competitionStatus === 'Sold Out'
  )
}

/**
 * A competition is enterable only when it is Live AND has remaining stock.
 * Both gates must pass — status alone is not enough.
 */
export function isEnterable(competition: Competition): boolean {
  return (
    competition.competitionStatus === 'Live' &&
    competition.ticketsLeft > 0
  )
}

/**
 * True once the competition's draw date/time has passed (the countdown timer
 * has run out). Time-based, so pass a live `now` from a ticking component to
 * have it flip exactly when the timer hits zero. Missing/invalid dates are
 * treated as "not ended" (never accidentally close a competition without a date).
 */
export function hasDrawEnded(competition: Competition, now: number = Date.now()): boolean {
  if (!competition.drawDate) return false
  const t = Date.parse(competition.drawDate)
  return Number.isFinite(t) && t <= now
}

/**
 * The competition has been archived to Past Winners by an admin
 * (ACF competition_status = 'To Past Winners').
 */
export function isArchived(competition: Competition): boolean {
  return competition.competitionStatus === 'To Past Winners'
}

export type EntryGate = 'open' | 'sold-out' | 'closed'

/**
 * Single source of truth for whether a competition can be entered, in priority
 * order:
 *   archived (To Past Winners) OR draw timer ended → 'closed'   (never purchasable)
 *   sold out                                       → 'sold-out'
 *   otherwise                                      → 'open'
 *
 * Pass a live `now` from a component that ticks every second so 'closed' appears
 * the instant the countdown reaches zero.
 */
export function entryGate(competition: Competition, now: number = Date.now()): EntryGate {
  if (isArchived(competition) || hasDrawEnded(competition, now)) return 'closed'
  if (isSoldOut(competition)) return 'sold-out'
  return 'open'
}

/**
 * Human-readable status label derived from ACF field or stock state.
 * Falls back to stock-derived labels when ACF status is not set.
 */
export function getStatusLabel(competition: Competition): string {
  if (competition.competitionStatus) return competition.competitionStatus
  if (competition.ticketsLeft <= 0) return 'Sold Out'
  return 'Live'
}

// ── Status-string CTA helpers ────────────────────────────────────────────────
// These work directly on a raw/normalised status string (+ optional stock) so
// they can be reused anywhere a full Competition object is not available —
// e.g. the Journal, which links to a related WooCommerce product by status.

/** Archive/unavailable destination for non-purchasable competitions. */
export const CLOSED_DRAWS_URL = '/competitions/closed'

export type CompetitionCtaState = 'enter' | 'sold-out' | 'closed'

/**
 * Derive the CTA lifecycle state from a competition_status value.
 * Accepts both normalised ('Sold Out', 'To Past Winners', 'Live') and raw
 * ('sold_out', 'to_past_winners') forms. 'To Past Winners' (and the legacy
 * 'Closed' value) collapse to 'closed' (never purchasable).
 *
 * NOTE: this is status-string only — it cannot see the draw timer. Callers that
 * have a full Competition object should use `entryGate()` instead, which also
 * closes entries once the countdown has ended.
 */
export function deriveCtaState(
  status: string | null | undefined,
  ticketsLeft?: number | null,
): CompetitionCtaState {
  const s = (status ?? '').toLowerCase().replace(/_/g, ' ').trim()
  if (s === 'to past winners' || s === 'closed') return 'closed'
  if (s === 'sold out' || (typeof ticketsLeft === 'number' && ticketsLeft <= 0)) return 'sold-out'
  return 'enter'
}

/**
 * CTA destination for a related competition, by status:
 *   enter (Live)  → /competitions/[slug]   (normal entry page)
 *   sold-out      → /competitions/[slug]   (PDP renders its own Sold Out state)
 *   closed        → /competitions/closed   (archive — never shows an active Enter)
 *
 * Closed competitions must never resolve to the live entry page.
 */
export function getCompetitionCtaUrl(
  slug: string,
  status: string | null | undefined,
  ticketsLeft?: number | null,
): string {
  return deriveCtaState(status, ticketsLeft) === 'closed'
    ? CLOSED_DRAWS_URL
    : `/competitions/${slug}`
}

/** CTA button label matching the lifecycle state. */
export function getCompetitionCtaLabel(
  status: string | null | undefined,
  ticketsLeft?: number | null,
): string {
  switch (deriveCtaState(status, ticketsLeft)) {
    case 'closed':   return 'Competition Closed'
    case 'sold-out': return 'View Sold-Out Drop'
    default:         return 'Enter the Drop'
  }
}
