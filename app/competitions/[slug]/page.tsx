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
import { fetchStoreSettings, formatMoney, type StoreSettings } from '@/lib/store-settings'
import type { Competition } from '@/lib/competition-data'

interface Props {
  params: { slug: string }
}

// /competitions/weekly, /competitions/monthly, /competitions/special
// resolve to the active competition of that type — the URL stays clean forever.
const COMP_TYPE_SLUGS = new Set(['weekly', 'monthly', 'special'])

function buildCompetitionSchemas(competition: Competition, slug: string, settings: StoreSettings) {
  const image = competition.galleryImages?.[0]?.src ?? competition.heroImage

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: competition.title,
    image,
    description: competition.description ?? `Enter to win a ${competition.title} worth ${formatMoney(competition.retailValue, settings, { decimals: 0 })}.`,
    offers: {
      '@type': 'Offer',
      price: String(competition.entryPrice),
      priceCurrency: settings.currency,
      availability: competition.ticketsLeft > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/SoldOut',
    },
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.premiumwatchclub.com' },
      { '@type': 'ListItem', position: 2, name: competition.title, item: `https://www.premiumwatchclub.com/competitions/${slug}` },
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
      // Never build metadata from stale static-template facts (old title/price/draw
      // date) when live WooCommerce data is unavailable — fall through to a
      // canonical-only response below instead of advertising an obsolete competition.
      if (wooProduct) {
        competition = await resolveCompetitionMedia(mergeWooData(staticComp, wooProduct), wooProduct)
      }
    } else {
      const { product: wooProduct } = await fetchWooProductBySlug(slug)
      if (wooProduct) {
        competition = await resolveCompetitionMedia(wooProductToCompetition(wooProduct), wooProduct)
      }
    }
  }

  // Self-canonical only — no stale title/description/image when live data is missing.
  if (!competition) {
    return { alternates: { canonical: `https://www.premiumwatchclub.com/competitions/${slug}` } }
  }

  const settings = await fetchStoreSettings()
  const ogImage = competition.galleryImages?.[0]?.src ?? competition.heroImage
  const entry = formatMoney(competition.entryPrice, settings)
  const retail = formatMoney(competition.retailValue, settings, { decimals: 0 })

  return {
    title: `${competition.title} — Win for ${entry} — Premium Watch Club`,
    description: `Enter to win a ${competition.title} worth ${retail} for just ${entry} a ticket. Draw: ${competition.drawDateDisplay}.`,
    alternates: {
      canonical: `https://www.premiumwatchclub.com/competitions/${slug}`,
    },
    openGraph: ogImage ? { images: [{ url: ogImage }] } : undefined,
  }
}

export default async function CompetitionPage({ params }: Props) {
  const { slug } = params
  const storeSettings = await fetchStoreSettings()

  // ── Type-based routes: /competitions/weekly | monthly | special ──────────
  // Fetches whichever WooCommerce product is currently active for that type.
  // URL never changes when the prize changes — only the content updates.
  if (COMP_TYPE_SLUGS.has(slug)) {
    const competition = await getActiveCompetitionByType(slug)
    if (!competition) notFound()

    const { productSchema, breadcrumbSchema } = buildCompetitionSchemas(competition, slug, storeSettings)

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
    const { product: wooProduct, error } = await fetchWooProductById(staticComp.wooProductId)
    // Do not render stale static-template facts (old price, draw date, image) as the
    // current competition when live WooCommerce data is missing. On a fetch error,
    // throw so Next.js ISR keeps serving the last good page (same resilience strategy
    // as the homepage); on a genuine not-found, return a 404.
    if (!wooProduct) {
      if (error) throw new Error(`[PWC] WooCommerce product #${staticComp.wooProductId} unavailable: ${error}`)
      notFound()
    }
    const mergedCompetition = await resolveCompetitionMedia(mergeWooData(staticComp, wooProduct), wooProduct)
    const { productSchema, breadcrumbSchema } = buildCompetitionSchemas(mergedCompetition, slug, storeSettings)

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
  const { productSchema, breadcrumbSchema } = buildCompetitionSchemas(competition, slug, storeSettings)

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

  // Static template slugs. NOTE: 'free-omega-speedmaster-moonwatch' is intentionally
  // omitted — that route is a permanent redirect to /past-winners (legacy URL) and
  // must not be pre-built as a competition page here.
  const staticSlugs = [
    'rolex-cosmograph-daytona',
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
