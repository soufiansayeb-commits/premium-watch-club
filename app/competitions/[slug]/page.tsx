import { getCompetitionBySlug } from '@/lib/competition-data'
import { fetchWooProductById, mergeWooData } from '@/lib/woocommerce'
import { notFound } from 'next/navigation'
import Header from '@/components/Header'
import CompetitionEntryFlow from '@/components/competition/CompetitionEntryFlow'
import WinnersSection from '@/components/WinnersSection'
import ProductEditorial from '@/components/competition/ProductEditorial'
import NewsletterSection from '@/components/NewsletterSection'
import ScrollReveal from '@/components/ScrollReveal'
import CompetitionFooter from '@/components/CompetitionFooter'

interface Props {
  params: { slug: string }
}

export default async function CompetitionPage({ params }: Props) {
  const competition = getCompetitionBySlug(params.slug)
  if (!competition) notFound()

  const { product: wooProduct } = await fetchWooProductById(competition.wooProductId)
  const mergedCompetition = wooProduct ? mergeWooData(competition, wooProduct) : competition

  return (
    <>
      <Header />
      <CompetitionEntryFlow competition={mergedCompetition} />
      <WinnersSection />
      <ProductEditorial />
      <NewsletterSection />
      <ScrollReveal />
      <CompetitionFooter />
    </>
  )
}

export async function generateStaticParams() {
  return [{ slug: 'omega-speedmaster-moonwatch' }]
}
