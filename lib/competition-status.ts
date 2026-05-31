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
