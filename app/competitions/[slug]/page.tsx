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
import ComparisonSection from '@/components/ComparisonSection'
import TestimonialTabs from '@/components/TestimonialTabs'
import HomeFaqSection from '@/components/HomeFaqSection'
import ScrollReveal from '@/components/ScrollReveal'
import Footer from '@/components/Footer'
import { JsonLd } from '@/components/JsonLd'
import type { Competition } from '@/lib/competition-data'

interface Props {
  params: { slug: string }
}

function buildCompetitionSchemas(competition: Competition, slug: string) {
  const image = competition.galleryImages?.[0]?.src ?? competition.heroImage

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: competition.title,
    image,
    description: competition.description ?? `Enter to win a ${competition.title} worth ${competition.currency}${competition.retailValue.toLocaleString('en-GB')}.`,
    offers: {
      '@type': 'Offer',
      price: String(competition.entryPrice),
      priceCurrency: 'GBP',
      availability: competition.ticketsLeft > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/SoldOut',
    },
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://premiumwatchclub.com' },
      { '@type': 'ListItem', position: 2, name: competition.title, item: `https://premiumwatchclub.com/competitions/${slug}` },
    ],
  }

  return { productSchema, breadcrumbSchema }
}

export async function generateMetadata({ params }: Props) {
  // Mirrors the data-fetching logic in the page component below — Next.js
  // dedupes identical fetch() calls within a single request, so this costs
  // nothing extra over the page render itself.
  const staticComp = getCompetitionBySlug(params.slug)

  let competition
  if (staticComp) {
    const { product: wooProduct } = await fetchWooProductById(staticComp.wooProductId)
    const merged = wooProduct ? mergeWooData(staticComp, wooProduct) : staticComp
    competition = wooProduct ? await resolveCompetitionMedia(merged, wooProduct) : merged
  } else {
    const { product: wooProduct } = await fetchWooProductBySlug(params.slug)
    if (!wooProduct) return {}
    competition = await resolveCompetitionMedia(wooProductToCompetition(wooProduct), wooProduct)
  }

  if (!competition) return {}

  const ogImage = competition.galleryImages?.[0]?.src ?? competition.heroImage

  return {
    title: `${competition.title} — Win for ${competition.currency}${competition.entryPrice} — Premium Watch Club`,
    description: `Enter to win a ${competition.title} worth ${competition.currency}${competition.retailValue.toLocaleString('en-GB')} for just ${competition.currency}${competition.entryPrice} a ticket. Draw: ${competition.drawDateDisplay}.`,
    openGraph: ogImage ? { images: [{ url: ogImage }] } : undefined,
  }
}

export default async function CompetitionPage({ params }: Props) {
  // 1. Try static template first (has skill question, ticket options, etc.)
  const staticComp = getCompetitionBySlug(params.slug)

  if (staticComp) {
    // Known competition — fetch live WooCommerce data, merge, then resolve any image IDs
    const { product: wooProduct } = await fetchWooProductById(staticComp.wooProductId)
    const merged = wooProduct ? mergeWooData(staticComp, wooProduct) : staticComp
    const mergedCompetition = wooProduct ? await resolveCompetitionMedia(merged, wooProduct) : merged
    const { productSchema, breadcrumbSchema } = buildCompetitionSchemas(mergedCompetition, params.slug)

    return (
      <>
        <JsonLd data={productSchema} />
        <JsonLd data={breadcrumbSchema} />
        <Header />
        <CompetitionEntryFlow competition={mergedCompetition} />
        <HomepageWinners />
        <ProductEditorial competition={mergedCompetition} />
        <ComparisonSection />
        <TestimonialTabs />
        <HomeFaqSection />
        <ScrollReveal />
        <Footer />
      </>
    )
  }

  // 2. No static template — try WooCommerce product by slug (new/future competitions)
  const { product: wooProduct } = await fetchWooProductBySlug(params.slug)
  if (!wooProduct) notFound()

  const competition = await resolveCompetitionMedia(wooProductToCompetition(wooProduct), wooProduct)
  const { productSchema, breadcrumbSchema } = buildCompetitionSchemas(competition, params.slug)

  return (
    <>
      <JsonLd data={productSchema} />
      <JsonLd data={breadcrumbSchema} />
      <Header />
      <CompetitionEntryFlow competition={competition} />
      <HomepageWinners />
      <ProductEditorial competition={competition} />
      <ComparisonSection />
      <HomeFaqSection />
      <ScrollReveal />
      <Footer />
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
