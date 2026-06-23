import type { MetadataRoute } from 'next'
import { fetchWooProducts } from '@/lib/woocommerce'
import { getJournalPosts } from '@/lib/wordpress-journal'

const BASE_URL = 'https://premiumwatchclub.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/weekly`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/monthly`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/special`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/past-winners`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/journal`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE_URL}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/contact`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
  ]

  let competitionRoutes: MetadataRoute.Sitemap = []
  try {
    const { products } = await fetchWooProducts()
    competitionRoutes = products
      .filter(p => p.slug)
      .map(p => ({
        url: `${BASE_URL}/competitions/${p.slug}`,
        changeFrequency: 'daily' as const,
        priority: 0.85,
      }))
  } catch {
    competitionRoutes = ['omega-speedmaster-moonwatch', 'free-omega-speedmaster-moonwatch'].map(slug => ({
      url: `${BASE_URL}/competitions/${slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.85,
    }))
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
