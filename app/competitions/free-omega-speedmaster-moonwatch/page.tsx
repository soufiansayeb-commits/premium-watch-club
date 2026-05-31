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

export const metadata = {
  title: 'Free Competition — Premium Watch Club',
  description: 'Enter for free. One watch. Limited entries only.',
}

export default async function FreeCompetitionPage() {
  const competition = getCompetitionBySlug('free-omega-speedmaster-moonwatch')
  if (!competition) notFound()

  const { product: wooProduct } = await fetchWooProductById(competition.wooProductId)
  const mergedCompetition = wooProduct ? mergeWooData(competition, wooProduct) : competition

  return (
    <>
      <Header />
      <CompetitionEntryFlow competition={mergedCompetition} />
      <WinnersSection />
      <ProductEditorial competition={mergedCompetition} />
      <NewsletterSection />
      <ScrollReveal />
      <CompetitionFooter />
    </>
  )
}
