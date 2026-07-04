/**
 * Central route definitions — all internal URLs live here.
 * Import from this file instead of scattering string literals across components.
 */

export const routes = {
  home: '/',

  // Active competition landing pages (marketing entry point)
  weekly:  '/weekly',
  monthly: '/monthly',
  special: '/special',

  // Canonical competition entry pages — type-based, never expose product slugs
  competitionWeekly:  '/competitions/weekly',
  competitionMonthly: '/competitions/monthly',
  competitionSpecial: '/competitions/special',

  // Product-slug route — only used for direct/SEO links to a specific product
  competitionProduct: (slug: string) => `/competitions/${slug}`,

  // Core pages
  pastWinners: '/past-winners',
  journal:     '/journal',
  journalPost: (slug: string) => `/journal/${slug}`,
  aboutUs:     '/about-us',
  howItWorks:  '/#how',   // anchor on homepage until a standalone page is created
  terms:       '/terms',
  privacy:     '/privacy',
  contact:     '/contact',
} as const

export const PRODUCTION_URL = 'https://premiumwatchclub.com'

/** Legacy competition slugs that must redirect to their current canonical equivalents. */
export const legacyCompetitionRedirects: Record<string, string> = {
  'omega-speedmaster-moonwatch': 'rolex-cosmograph-daytona',
}
