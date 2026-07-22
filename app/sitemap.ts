import type { MetadataRoute } from 'next'
import { fetchWooProducts } from '@/lib/woocommerce'
import { getJournalPosts } from '@/lib/wordpress-journal'

const BASE_URL = 'https://www.premiumwatchclub.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`,             changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE_URL}/weekly`,       changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE_URL}/monthly`,      changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE_URL}/special`,      changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE_URL}/past-winners`, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE_URL}/journal`,      changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${BASE_URL}/about-us`,     changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/contact`,      changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE_URL}/privacy`,      changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${BASE_URL}/terms`,        changeFrequency: 'yearly',  priority: 0.2 },
  ]

  // Competition pages — sourced from WooCommerce; fall back to known current slug only
  let competitionRoutes: MetadataRoute.Sitemap = []
  try {
    const { products } = await fetchWooProducts()
    competitionRoutes = products
      // Exclude admin/archive-only products (e.g. "PAST WINNER 001") that exist for
      // organisation on the Past Winners page but are not competition-entry pages.
      // Their /competitions/{slug} URLs render no live competition and must not be
      // advertised to crawlers as current competition pages.
      .filter(p => {
        if (!p.slug) return false
        const isArchiveAdmin =
          p.name.toUpperCase().includes('PAST WINNER') ||
          (p.show_on_past_winners === true && !p.competition_type)
        return !isArchiveAdmin
      })
      .map(p => ({
        url: `${BASE_URL}/competitions/${p.slug}`,
        changeFrequency: 'daily' as const,
        priority: 0.85,
      }))
  } catch {
    // WooCommerce unreachable at build time — include only the known current slug
    competitionRoutes = [
      {
        url: `${BASE_URL}/competitions/rolex-cosmograph-daytona`,
        changeFrequency: 'daily' as const,
        priority: 0.85,
      },
    ]
  }

  let journalRoutes: MetadataRoute.Sitemap = []
  try {
    const posts = await getJournalPosts()
    journalRoutes = posts.map(p => ({
      url: `${BASE_URL}/journal/${p.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }))
  } catch {
    journalRoutes = []
  }

  return [...staticRoutes, ...competitionRoutes, ...journalRoutes]
}
