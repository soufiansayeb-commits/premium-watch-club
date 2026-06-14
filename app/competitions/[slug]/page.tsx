import { getCompetitionBySlug } from '@/lib/competition-data'
import {
  fetchWooProductById,
  fetchWooProductBySlug,
  fetchWooProducts,
  mergeWooData,
  wooProductToCompetition,
  resolveCompetitionMedia,
} from '@/lib/woocommerce'
import { notFound } from 'next/navigation'
import Header from '@/components/Header'
import CompetitionEntryFlow from '@/components/competition/CompetitionEntryFlow'
import HomepageWinners from '@/components/HomepageWinners'
import ProductEditorial from '@/components/competition/ProductEditorial'
import NewsletterSection from '@/components/NewsletterSection'
import ScrollReveal from '@/components/ScrollReveal'
import CompetitionFooter from '@/components/CompetitionFooter'

interface Props {
  params: { slug: string }
}

export default async function CompetitionPage({ params }: Props) {
  // 1. Try static template first (has skill question, ticket options, etc.)
  const staticComp = getCompetitionBySlug(params.slug)

  if (staticComp) {
    // Known competition — fetch live WooCommerce data, merge, then resolve any image IDs
    const { product: wooProduct } = await fetchWooProductById(staticComp.wooProductId)
    const merged = wooProduct ? mergeWooData(staticComp, wooProduct) : staticComp
    const mergedCompetition = wooProduct ? await resolveCompetitionMedia(merged, wooProduct) : merged

    return (
      <>
        <Header />
        <CompetitionEntryFlow competition={mergedCompetition} />
        <HomepageWinners />
        <ProductEditorial competition={mergedCompetition} />
        <NewsletterSection />
        <ScrollReveal />
        <CompetitionFooter />
      </>
    )
  }

  // 2. No static template — try WooCommerce product by slug (new/future competitions)
  const { product: wooProduct } = await fetchWooProductBySlug(params.slug)
  if (!wooProduct) notFound()

  const competition = await resolveCompetitionMedia(wooProductToCompetition(wooProduct), wooProduct)

  return (
    <>
      <Header />
      <CompetitionEntryFlow competition={competition} />
      <HomepageWinners />
      <ProductEditorial competition={competition} />
      <NewsletterSection />
      <ScrollReveal />
      <CompetitionFooter />
    </>
  )
}

export async function generateStaticParams() {
  // Static slugs — always available
  const staticSlugs = [
    'omega-speedmaster-moonwatch',
    'free-omega-speedmaster-moonwatch',
  ]

  try {
    // Include all published WooCommerce product slugs so new competitions get
    // pre-built pages without any code changes.
    const { products } = await fetchWooProducts()
    if (products.length > 0) {
      const wooSlugs = products.map(p => p.slug).filter(Boolean)
      const seen = new Set<string>(staticSlugs)
      wooSlugs.forEach(s => seen.add(s))
      return Array.from(seen).map(slug => ({ slug }))
    }
  } catch {
    // Fall back to static slugs if WooCommerce is unreachable at build time
  }

  return staticSlugs.map(slug => ({ slug }))
}
