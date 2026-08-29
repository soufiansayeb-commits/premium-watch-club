// lib/competition-status.ts
// Centralized competition lifecycle helpers.
// Import these everywhere — never duplicate the closed / enterable logic.
//
// ── THE LIFECYCLE ────────────────────────────────────────────────────────────
//
//   SCHEDULED ──(Go Live Date/Time)──▶ LIVE ──┬─(Entries Close Date/Time)─┐
//                                             └─(last ticket sold)────────┤
//                                                                         ▼
//                                                            COMPETITION CLOSED
//                                                                         │
//                                                    (manual admin action) │
//                                                                         ▼
//                                                              TO PAST WINNERS
//
// 'Coming Soon' is retired. A competition with a future Go Live Date is simply
// SCHEDULED — a derived state, never a stored one.
//
// ── TWO DIFFERENT "SOLD OUT"s ────────────────────────────────────────────────
// `isSoldOut()` is INVENTORY ONLY (ticketsLeft <= 0) and stays that way — it is
// a legitimate internal concept. The customer-facing lifecycle status formerly
// called "Sold Out" is now "Competition Closed", which selling every ticket is
// only one of two ways to reach.
//
// ── DRAW DATE ────────────────────────────────────────────────────────────────
// The draw date no longer gates ticket sales. It is display-only. Entries close
// at `entriesCloseDate`. Legacy records with no entriesCloseDate fall back to
// drawDate, which is exactly how the site behaved before those fields existed.

import type { Competition } from './competition-data'

/** The four states a competition can actually be in, from the visitor's side. */
export type EffectiveStatus = 'scheduled' | 'live' | 'closed' | 'archived'

/**
 * Fold any stored/normalised/legacy competition_status value into a canonical
 * lowercase slug. Accepts display case ('Competition Closed'), stored slugs
 * ('competition_closed') and legacy values ('sold_out', 'coming_soon').
 *
 * NOTE: 'closed' means TO PAST WINNERS on this site — it is the stored ACF slug
 * for the archive option. The lifecycle's closed state is 'competition_closed'.
 */
export function normalizeStatusSlug(
  status: string | null | undefined,
): 'live' | 'competition_closed' | 'to_past_winners' | 'scheduled' | '' {
  const s = (status ?? '').toLowerCase().trim().replace(/[\s-]+/g, '_')
  if (s === 'live') return 'live'
  if (s === 'closed' || s === 'to_past_winners') return 'to_past_winners'
  if (s === 'competition_closed' || s === 'sold_out' || s === 'soldout') return 'competition_closed'
  if (s === 'coming_soon' || s === 'coming' || s === 'scheduled') return 'scheduled'
  return ''
}

/** Parse an ISO timestamp, returning null for missing/invalid values. */
function ts(iso: string | null | undefined): number | null {
  if (!iso) return null
  const t = Date.parse(iso)
  return Number.isFinite(t) ? t : null
}

/**
 * The deadline the countdown counts down to: Entries Close Date/Time.
 *
 * Falls back to drawDate for legacy competitions that predate the field — those
 * keep behaving exactly as they did before. Returns null when neither exists,
 * which callers treat as "no deadline" (never accidentally close a competition
 * that simply has no date set).
 */
export function getCountdownDeadline(competition: Competition): number | null {
  return ts(competition.entriesCloseDate) ?? ts(competition.drawDate)
}

/** True once the entries deadline has passed. */
export function hasEntriesClosed(competition: Competition, now: number = Date.now()): boolean {
  const deadline = getCountdownDeadline(competition)
  return deadline !== null && deadline <= now
}

/** True before the Go Live moment. No Go Live Date → never scheduled. */
export function isBeforeGoLive(competition: Competition, now: number = Date.now()): boolean {
  const goLive = ts(competition.goLiveDate)
  return goLive !== null && goLive > now
}

/**
 * INVENTORY sold out — every ticket has been sold. Purely a stock fact.
 * This is NOT the lifecycle status; see getEffectiveStatus().
 */
export function isSoldOut(competition: Competition): boolean {
  return competition.ticketsLeft <= 0
}

/**
 * The competition has been archived to Past Winners by an admin
 * (ACF competition_status = 'To Past Winners' / stored slug 'closed').
 */
export function isArchived(competition: Competition): boolean {
  return normalizeStatusSlug(competition.competitionStatus) === 'to_past_winners'
}

/**
 * THE resolver — every layer of the site derives its state from this, so the
 * hero, the cards, the timer, the CTA and the checkout can never disagree.
 *
 * Evaluated live against `now`, so it is correct even when the stored ACF value
 * has not caught up yet (a delayed cron run, or a page served from the 60s ISR
 * cache). Pass a ticking `now` from a client component to have it flip exactly
 * when the countdown reaches zero.
 *
 * Priority order — mirrors pwc_cl_effective_status() in
 * woocommerce-snippets/pwc-competition-lifecycle.php. Keep the two in sync.
 *
 *   1. archived      — admin moved it to Past Winners
 *   2. entries close — deadline reached (falls back to drawDate on legacy records)
 *   3. inventory     — every ticket sold
 *   4. manual close  — an admin picked Competition Closed by hand (see manualClose)
 *   5. scheduled     — Go Live is still in the future
 *   6. live
 *
 * Rules 2 and 3 sit above 4 and 5 deliberately: an admin cannot reopen a
 * competition whose deadline has passed, and "entries close before go live"
 * resolves to closed rather than live.
 */
export function getEffectiveStatus(
  competition: Competition,
  now: number = Date.now(),
): EffectiveStatus {
  const stored = normalizeStatusSlug(competition.competitionStatus)

  if (stored === 'to_past_winners') return 'archived'
  if (hasEntriesClosed(competition, now)) return 'closed'
  if (isSoldOut(competition)) return 'closed'
  // Only a DELIBERATE admin close counts here. The WordPress auto-sync writes
  // the same 'competition_closed' value whenever the deadline passes or the
  // stock runs out, so without `manualClose` an automatic close would stick even
  // after the dates were fixed. `undefined` means the lifecycle snippet is not
  // installed and we cannot tell them apart — assume closed, as before.
  if (stored === 'competition_closed' && competition.manualClose !== false) return 'closed'
  if (isBeforeGoLive(competition, now)) return 'scheduled'

  // A legacy 'coming_soon' record with no Go Live Date has nothing left to wait
  // for — it falls through to live, which the rules above have already vetoed
  // if its deadline passed or its tickets sold.
  return 'live'
}

/** Tickets can be bought right now. The only state in which they can. */
export function isEnterable(competition: Competition, now: number = Date.now()): boolean {
  return getEffectiveStatus(competition, now) === 'live'
}

/** Live Activity renders in exactly one state. */
export function showsLiveActivity(competition: Competition, now: number = Date.now()): boolean {
  return getEffectiveStatus(competition, now) === 'live'
}

export type EntryGate = 'open' | 'closed' | 'scheduled'

/**
 * Single source of truth for whether a competition can be entered.
 * 'closed' covers both the deadline and the sold-every-ticket route, plus
 * archived competitions — none of them are purchasable.
 */
export function entryGate(competition: Competition, now: number = Date.now()): EntryGate {
  const status = getEffectiveStatus(competition, now)
  if (status === 'live') return 'open'
  if (status === 'scheduled') return 'scheduled'
  return 'closed'
}

/**
 * Hero / full-width status label.
 * Live competitions have no closed label — callers render the live design.
 */
export function getStatusLabel(competition: Competition, now: number = Date.now()): string {
  switch (getEffectiveStatus(competition, now)) {
    case 'archived': return 'To Past Winners'
    case 'closed':   return 'Competition Closed'
    case 'scheduled':return 'Opening Soon'
    default:         return 'Live'
  }
}

/**
 * Short label for the small competition cards, where "Competition Closed" does
 * not fit the design. Closed cards read "CLOSED" (the CSS uppercases it).
 */
export function getCardStatusLabel(competition: Competition, now: number = Date.now()): string {
  switch (getEffectiveStatus(competition, now)) {
    case 'archived':
    case 'closed':    return 'Closed'
    case 'scheduled': return 'Scheduled'
    default:          return 'Live'
  }
}

// ── Status-string CTA helpers ────────────────────────────────────────────────
// These work directly on a raw/normalised status string (+ optional stock) so
// they can be reused anywhere a full Competition object is not available —
// e.g. the Journal, which links to a related WooCommerce product by status.

/** Archive/unavailable destination for non-purchasable competitions. */
export const CLOSED_DRAWS_URL = '/competitions/closed'

export type CompetitionCtaState = 'enter' | 'closed' | 'archived'

/**
 * Derive the CTA lifecycle state from a competition_status value.
 * Accepts normalised ('Competition Closed', 'To Past Winners', 'Live') and
 * stored/legacy ('competition_closed', 'sold_out', 'closed') forms.
 *
 * NOTE: this is status-string only — it cannot see the entries-close deadline.
 * Callers that have a full Competition object should use `getEffectiveStatus()`
 * instead, which also closes entries once the countdown has ended.
 */
export function deriveCtaState(
  status: string | null | undefined,
  ticketsLeft?: number | null,
): CompetitionCtaState {
  const s = normalizeStatusSlug(status)
  if (s === 'to_past_winners') return 'archived'
  if (s === 'competition_closed') return 'closed'
  if (typeof ticketsLeft === 'number' && ticketsLeft <= 0) return 'closed'
  // 'scheduled' has nothing to enter yet — treat as not purchasable.
  if (s === 'scheduled') return 'closed'
  return 'enter'
}

/**
 * CTA destination for a related competition, by status:
 *   enter (Live)  → /competitions/[slug]   (normal entry page)
 *   closed        → /competitions/[slug]   (PDP renders its own closed state)
 *   archived      → /competitions/closed   (archive — never shows an active Enter)
 *
 * Archived competitions must never resolve to the live entry page.
 */
export function getCompetitionCtaUrl(
  slug: string,
  status: string | null | undefined,
  ticketsLeft?: number | null,
): string {
  return deriveCtaState(status, ticketsLeft) === 'archived'
    ? CLOSED_DRAWS_URL
    : `/competitions/${slug}`
}

/** CTA button label matching the lifecycle state. */
export function getCompetitionCtaLabel(
  status: string | null | undefined,
  ticketsLeft?: number | null,
): string {
  switch (deriveCtaState(status, ticketsLeft)) {
    case 'archived': return 'Competition Closed'
    case 'closed':   return 'Competition Closed'
    default:         return 'Enter the Drop'
  }
}
