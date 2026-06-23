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
  title: 'Special Edition Luxury Watch Competitions | Premium Watch Club',
  description: 'Win rare and limited edition luxury watches in our special competitions. Exceptional timepieces from Rolex, Omega and more, one competition at a time.',
}

export default async function SpecialLandingPage() {
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
      <HomepageHeroContainer competitionsByType={competitionsByType} defaultType="special" />
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
