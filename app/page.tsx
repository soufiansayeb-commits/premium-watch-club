import { getAllActiveCompetitionsByType } from '@/lib/woocommerce'
import type { Competition } from '@/lib/competition-data'
import Header from '@/components/Header'
import HomepageHeroContainer from '@/components/HomepageHeroContainer'
import StatsBar from '@/components/StatsBar'
import WinnersSection from '@/components/WinnersSection'
import HowItWorks from '@/components/HowItWorks'
import TrustBar from '@/components/TrustBar'
import JournalPreview from '@/components/JournalPreview'
import CompetitionsGrid from '@/components/CompetitionsGrid'
import NewsletterSection from '@/components/NewsletterSection'
import Footer from '@/components/Footer'
import ScrollReveal from '@/components/ScrollReveal'

export default async function HomePage() {
  const competitionsByType = await getAllActiveCompetitionsByType()

  // Current Competitions grid: show Live + Sold Out competitions.
  // Coming Soon = excluded (nothing enterable yet).
  // Closed = already excluded by getAllActiveCompetitionsByType (slot is null).
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
      <HomepageHeroContainer competitionsByType={competitionsByType} />
      <StatsBar />
      <WinnersSection />
      <HowItWorks />
      <TrustBar />
      {/* Current Competitions section — always rendered when any non-Coming-Soon comp exists */}
      <CompetitionsGrid competitions={gridComps} />
      <JournalPreview />
      <NewsletterSection />
      <Footer />
      <ScrollReveal />
    </>
  )
}
