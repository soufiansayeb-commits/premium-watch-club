import type { Metadata } from 'next'
import { getAllActiveCompetitionsByType } from '@/lib/woocommerce'
import type { Competition } from '@/lib/competition-data'
import Header from '@/components/Header'
import HomepageHeroContainer from '@/components/HomepageHeroContainer'
import StatsBar from '@/components/StatsBar'
import HomepageWinners from '@/components/HomepageWinners'
import TrustBar from '@/components/TrustBar'
import HowItWorksInteractive from '@/components/HowItWorksInteractive'
import JournalPreview from '@/components/JournalPreview'
import WhyNotBuyIt from '@/components/WhyNotBuyIt'
import CompetitionsGrid from '@/components/CompetitionsGrid'
import Footer from '@/components/Footer'
import ScrollReveal from '@/components/ScrollReveal'
import { routes } from '@/lib/routes'

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
      <TrustBar />
      <HowItWorksInteractive ctaHref={routes.competitionSpecial} />
      <CompetitionsGrid competitions={gridComps} />
      <WhyNotBuyIt ctaHref={routes.competitionSpecial} />
      <JournalPreview />
      <Footer />
      <ScrollReveal />
    </>
  )
}
