// lib/company-stats.ts
// ─────────────────────────────────────────────────────────────────────────────
// APPROVED public company statistics — single source of truth.
//
// These values are owner-approved and intentionally hardcoded (confirmed in
// PWC_OWNER_DECISIONS_REQUIRED.md, decision #3). They are NOT derived from
// WooCommerce. Currency is USD ($). Import from here everywhere these figures
// appear so desktop, mobile, crawler-readable text and alt text never drift
// out of sync. Update a value in ONE place only.
// ─────────────────────────────────────────────────────────────────────────────

export const COMPANY_STATS = {
  prizesAwarded:   '$480K+',
  entriesPlaced:   '30,000+',
  verifiedWinners: '25+',
  /** Trustpilot rating. Approved value is 4.9 — never "5 out of 5". */
  trustpilotScore: '4.9',
  /** Approved review count wording used by the Trustpilot proof block. */
  trustpilotReviews: '1,247',
} as const
