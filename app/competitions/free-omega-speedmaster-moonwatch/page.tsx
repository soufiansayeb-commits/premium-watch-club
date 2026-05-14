import { getCompetitionBySlug } from '@/lib/competition-data'
import { notFound } from 'next/navigation'
import Header from '@/components/Header'
import FreeCompetitionEntryFlow from '@/components/competition/FreeCompetitionEntryFlow'
import WinnersSection from '@/components/WinnersSection'
import ProductEditorial from '@/components/competition/ProductEditorial'
import NewsletterSection from '@/components/NewsletterSection'
import ScrollReveal from '@/components/ScrollReveal'
import CompetitionFooter from '@/components/CompetitionFooter'

export const metadata = {
  title: 'Free Omega Speedmaster Moonwatch — Premium Watch Club',
  description: 'Enter for free. One watch. 500 entries only. Win the Omega Speedmaster Professional Moonwatch.',
}

export default function FreeCompetitionPage() {
  const competition = getCompetitionBySlug('free-omega-speedmaster-moonwatch')
  if (!competition) notFound()

  return (
    <>
      <Header />
      <FreeCompetitionEntryFlow competition={competition} />
      <WinnersSection />
      <ProductEditorial />
      <NewsletterSection />
      <ScrollReveal />
      <CompetitionFooter />
    </>
  )
}
