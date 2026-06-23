import type { Metadata } from 'next'
import { getAllActiveCompetitionsByType } from '@/lib/woocommerce'
import type { Competition } from '@/lib/competition-data'
import Header from '@/components/Header'
import HomepageHeroContainer from '@/components/HomepageHeroContainer'
import StatsBar from '@/components/StatsBar'
import HomepageWinners from '@/components/HomepageWinners'
import HowItWorks from '@/components/HowItWorks'
import TrustBar from '@/components/TrustBar'
import JournalPreview from '@/components/JournalPreview'
import CompetitionsGrid from '@/components/CompetitionsGrid'
import Footer from '@/components/Footer'
import ScrollReveal from '@/components/ScrollReveal'

export const metadata: Metadata = {
  title: 'Monthly Luxury Watch Competitions | Premium Watch Club',
  description: 'Monthly luxury watch competitions with more time to enter. Win your dream watch from Rolex, Omega and more, with a free postal entry route available.',
}

export default async function MonthlyLandingPage() {
  const competitionsByType = await getAllActiveCompetitionsByType()

  const gridComps = (
    [
      competitionsByType.starter,
      competitionsByType.weekly,
      competitionsByType.monthly,
      competitionsByType.special,
    ] as (Competition | null)[]
  ).filter((c): c is Competition =>
    c !== null && c.competitionStatus !== 'Coming Soon'
  )

  return (
    <>
      <Header />
      <HomepageHeroContainer competitionsByType={competitionsByType} defaultType="monthly" />
      <StatsBar />
      <HomepageWinners />
      <HowItWorks />
      <TrustBar />
      <CompetitionsGrid competitions={gridComps} />
      <JournalPreview />
      <Footer />
      <ScrollReveal />
    </>
  )
}
