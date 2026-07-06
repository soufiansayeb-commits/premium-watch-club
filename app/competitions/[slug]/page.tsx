import { getCompetitionBySlug } from '@/lib/competition-data'
import {
  fetchWooProductById,
  fetchWooProductBySlug,
  fetchWooProducts,
  mergeWooData,
  wooProductToCompetition,
  resolveCompetitionMedia,
  getActiveCompetitionByType,
} from '@/lib/woocommerce'
import { notFound } from 'next/navigation'
import Header from '@/components/Header'
import CompetitionEntryFlow from '@/components/competition/CompetitionEntryFlow'
import HomepageWinners from '@/components/HomepageWinners'
import ProductEditorial from '@/components/competition/ProductEditorial'
import LeaderboardRewards from '@/components/LeaderboardRewards'
import HowItWorksInteractive from '@/components/HowItWorksInteractive'
import ComparisonSection from '@/components/ComparisonSection'
import TestimonialTabs from '@/components/TestimonialTabs'
import WhyNotBuyIt from '@/components/WhyNotBuyIt'
import HomeFaqSection from '@/components/HomeFaqSection'
import ScrollReveal from '@/components/ScrollReveal'
import Footer from '@/components/Footer'
import { JsonLd } from '@/components/JsonLd'
import type { Competition } from '@/lib/competition-data'

interface Props {
  params: { slug: string }
}

// /competitions/weekly, /competitions/monthly, /competitions/special
// resolve to the active competition of that type — the URL stays clean forever.
const COMP_TYPE_SLUGS = new Set(['weekly', 'monthly', 'special'])

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
  const { slug } = params
  let competition: Competition | null = null

  if (COMP_TYPE_SLUGS.has(slug)) {
    competition = await getActiveCompetitionByType(slug)
  } else {
    const staticComp = getCompetitionBySlug(slug)
    if (staticComp) {
      const { product: wooProduct } = await fetchWooProductById(staticComp.wooProductId)
      const merged = wooProduct ? mergeWooData(staticComp, wooProduct) : staticComp
      competition = wooProduct ? await resolveCompetitionMedia(merged, wooProduct) : merged
    } else {
      const { product: wooProduct } = await fetchWooProductBySlug(slug)
      if (wooProduct) {
        competition = await resolveCompetitionMedia(wooProductToCompetition(wooProduct), wooProduct)
      }
    }
  }

  if (!competition) return {}

  const ogImage = competition.galleryImages?.[0]?.src ?? competition.heroImage

  return {
    title: `${competition.title} — Win for ${competition.currency}${competition.entryPrice} — Premium Watch Club`,
    description: `Enter to win a ${competition.title} worth ${competition.currency}${competition.retailValue.toLocaleString('en-GB')} for just ${competition.currency}${competition.entryPrice} a ticket. Draw: ${competition.drawDateDisplay}.`,
    alternates: {
      canonical: `https://premiumwatchclub.com/competitions/${slug}`,
    },
    openGraph: ogImage ? { images: [{ url: ogImage }] } : undefined,
  }
}

export default async function CompetitionPage({ params }: Props) {
  const { slug } = params

  // ── Type-based routes: /competitions/weekly | monthly | special ──────────
  // Fetches whichever WooCommerce product is currently active for that type.
  // URL never changes when the prize changes — only the content updates.
  if (COMP_TYPE_SLUGS.has(slug)) {
    const competition = await getActiveCompetitionByType(slug)
    if (!competition) notFound()

    const { productSchema, breadcrumbSchema } = buildCompetitionSchemas(competition, slug)

    return (
      <>
        <JsonLd data={productSchema} />
        <JsonLd data={breadcrumbSchema} />
        <Header />
        <CompetitionEntryFlow competition={competition} />
        <LeaderboardRewards competition={competition} />
        <HowItWorksInteractive ctaHref="#entry-main" />
        <HomepageWinners />
        <ProductEditorial competition={competition} />
        <ComparisonSection />
        <TestimonialTabs />
        <WhyNotBuyIt ctaHref="#entry-main" />
        <HomeFaqSection />
        <ScrollReveal />
        <Footer />
      </>
    )
  }

  // ── Static template route ────────────────────────────────────────────────
  const staticComp = getCompetitionBySlug(slug)

  if (staticComp) {
    const { product: wooProduct } = await fetchWooProductById(staticComp.wooProductId)
    const merged = wooProduct ? mergeWooData(staticComp, wooProduct) : staticComp
    const mergedCompetition = wooProduct ? await resolveCompetitionMedia(merged, wooProduct) : merged
    const { productSchema, breadcrumbSchema } = buildCompetitionSchemas(mergedCompetition, slug)

    return (
      <>
        <JsonLd data={productSchema} />
        <JsonLd data={breadcrumbSchema} />
        <Header />
        <CompetitionEntryFlow competition={mergedCompetition} />
        <LeaderboardRewards competition={mergedCompetition} />
        <HowItWorksInteractive ctaHref="#entry-main" />
        <HomepageWinners />
        <ProductEditorial competition={mergedCompetition} />
        <ComparisonSection />
        <TestimonialTabs />
        <WhyNotBuyIt ctaHref="#entry-main" />
        <HomeFaqSection />
        <ScrollReveal />
        <Footer />
      </>
    )
  }

  // ── Dynamic WooCommerce route (future competitions, no static template) ──
  const { product: wooProduct } = await fetchWooProductBySlug(slug)
  if (!wooProduct) notFound()

  const competition = await resolveCompetitionMedia(wooProductToCompetition(wooProduct), wooProduct)
  const { productSchema, breadcrumbSchema } = buildCompetitionSchemas(competition, slug)

  return (
    <>
      <JsonLd data={productSchema} />
      <JsonLd data={breadcrumbSchema} />
      <Header />
      <CompetitionEntryFlow competition={competition} />
      <LeaderboardRewards competition={competition} />
      <HowItWorksInteractive ctaHref="#entry-main" />
      <HomepageWinners />
      <ProductEditorial competition={competition} />
      <ComparisonSection />
      <WhyNotBuyIt ctaHref="#entry-main" />
      <HomeFaqSection />
      <ScrollReveal />
      <Footer />
    </>
  )
}

export async function generateStaticParams() {
  // Type slugs are always pre-built
  const typeSlugs = ['weekly', 'monthly', 'special']

  // Static template slugs
  const staticSlugs = [
    'rolex-cosmograph-daytona',
    'free-omega-speedmaster-moonwatch',
  ]

  try {
    const { products } = await fetchWooProducts()
    if (products.length > 0) {
      const wooSlugs = products.map(p => p.slug).filter(Boolean)
      const seen = new Set<string>([...typeSlugs, ...staticSlugs])
      wooSlugs.forEach(s => seen.add(s))
      return Array.from(seen).map(slug => ({ slug }))
    }
  } catch {
    // WooCommerce unreachable at build time — use known slugs
  }

  return [...typeSlugs, ...staticSlugs].map(slug => ({ slug }))
}
