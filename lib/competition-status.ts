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
 * Accepts both normalised ('Sold Out', 'Closed', 'Live') and raw
 * ('sold_out', 'closed') forms. Post-draw states (Draw Pending, Winner
 * Announced) and Closed all collapse to 'closed' (never purchasable).
 */
export function deriveCtaState(
  status: string | null | undefined,
  ticketsLeft?: number | null,
): CompetitionCtaState {
  const s = (status ?? '').toLowerCase().replace(/_/g, ' ').trim()
  if (s === 'closed' || s === 'draw pending' || s === 'winner announced') return 'closed'
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
