import { getCompetitionBySlug } from '@/lib/competition-data'
import { fetchWooProducts } from '@/lib/woocommerce'
import { notFound } from 'next/navigation'
import Header from '@/components/Header'
import CompetitionEntryFlow from '@/components/competition/CompetitionEntryFlow'
import CompetitionFooter from '@/components/CompetitionFooter'

interface Props {
  params: { slug: string }
}

export default async function CompetitionPage({ params }: Props) {
  const competition = getCompetitionBySlug(params.slug)
  if (!competition) notFound()

  // TEMPORARY WooCommerce title test — replace with full data mapping later
  const { products } = await fetchWooProducts()
  const displayTitle = products[0]?.name || competition.title
  const competitionWithWooTitle = { ...competition, title: displayTitle }

  return (
    <>
      <Header />
      <CompetitionEntryFlow competition={competitionWithWooTitle} />
      <CompetitionFooter />
    </>
  )
}

export async function generateStaticParams() {
  return [{ slug: 'omega-speedmaster-moonwatch' }]
}
