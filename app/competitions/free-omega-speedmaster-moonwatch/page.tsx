import { getCompetitionBySlug } from '@/lib/competition-data'
import { fetchWooProductById, mergeWooData } from '@/lib/woocommerce'
import { notFound } from 'next/navigation'
import Header from '@/components/Header'
import CompetitionEntryFlow from '@/components/competition/CompetitionEntryFlow'
import HomepageWinners from '@/components/HomepageWinners'
import ProductEditorial from '@/components/competition/ProductEditorial'
import HomeFaqSection from '@/components/HomeFaqSection'
import ScrollReveal from '@/components/ScrollReveal'
import Footer from '@/components/Footer'
import { JsonLd } from '@/components/JsonLd'

export const metadata = {
  title: 'Free Omega Speedmaster Moonwatch Competition — Premium Watch Club',
  description: 'Enter for free to win an Omega Speedmaster Moonwatch worth £6,100. One watch, limited entries — no purchase required.',
  openGraph: {
    images: [{ url: '/assets/images/omega-speedmaster-correct.avif' }],
  },
}

export default async function FreeCompetitionPage() {
  const competition = getCompetitionBySlug('free-omega-speedmaster-moonwatch')
  if (!competition) notFound()

  const { product: wooProduct } = await fetchWooProductById(competition.wooProductId)
  const mergedCompetition = wooProduct ? mergeWooData(competition, wooProduct) : competition

  const image = mergedCompetition.galleryImages?.[0]?.src ?? mergedCompetition.heroImage

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: mergedCompetition.title,
    image,
    description: mergedCompetition.description ?? `Enter to win a ${mergedCompetition.title} worth ${mergedCompetition.currency}${mergedCompetition.retailValue.toLocaleString('en-GB')}.`,
    offers: {
      '@type': 'Offer',
      price: String(mergedCompetition.entryPrice),
      priceCurrency: 'GBP',
      availability: mergedCompetition.ticketsLeft > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/SoldOut',
    },
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://premiumwatchclub.com' },
      { '@type': 'ListItem', position: 2, name: mergedCompetition.title, item: 'https://premiumwatchclub.com/competitions/free-omega-speedmaster-moonwatch' },
    ],
  }

  return (
    <>
      <JsonLd data={productSchema} />
      <JsonLd data={breadcrumbSchema} />
      <Header />
      <CompetitionEntryFlow competition={mergedCompetition} />
      <HomepageWinners />
      <ProductEditorial competition={mergedCompetition} />
      <HomeFaqSection />
      <ScrollReveal />
      <Footer />
    </>
  )
}
