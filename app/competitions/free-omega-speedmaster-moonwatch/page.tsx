import { permanentRedirect } from 'next/navigation'

// Legacy competition URL. The slug names an old "free Omega Speedmaster" competition
// that no longer exists; the underlying WooCommerce product (#13) has since been
// repurposed, so this route must NOT render the current product under a stale,
// misleading Omega/free URL (see Phase 2E). No internal links point here and it is
// absent from the sitemap. Forward permanently to the branded winners archive —
// the same pattern used by /competitions/closed → /past-winners.
//
// Owner decision (see PWC_OWNER_DECISIONS_REQUIRED.md): if a genuine historical
// Omega competition page is wanted, replace this redirect with a real ended-state
// page; if the URL should be retired entirely, return 410 instead.
export default function LegacyFreeOmegaCompetitionPage() {
  permanentRedirect('/past-winners')
}
