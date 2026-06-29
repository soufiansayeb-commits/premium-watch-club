import type { Metadata } from 'next'
import { getAllActiveCompetitionsByType } from '@/lib/woocommerce'
import type { Competition } from '@/lib/competition-data'
import Header from '@/components/Header'
import HomepageHeroContainer from '@/components/HomepageHeroContainer'
import StatsBar from '@/components/StatsBar'
import HomepageWinners from '@/components/HomepageWinners'
import HowItWorks from '@/components/HowItWorks'
import SummerSaleOffer from '@/components/SummerSaleOffer'
import ComparisonSection from '@/components/ComparisonSection'
import TestimonialTabs from '@/components/TestimonialTabs'
import JournalPreview from '@/components/JournalPreview'
import HomeFaqSection from '@/components/HomeFaqSection'
import CompetitionsGrid from '@/components/CompetitionsGrid'
import Footer from '@/components/Footer'
import ScrollReveal from '@/components/ScrollReveal'

export const metadata: Metadata = {
  title: 'Premium Watch Club — Win Luxury Watches in Skill-Based Competitions',
  description: 'Enter skill-based competitions to win luxury watches from Rolex, Omega and more. One competition at a time, with a free postal entry route available.',
}

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
      <HomepageWinners />
      <HowItWorks />
      <SummerSaleOffer special={competitionsByType.special} weekly={competitionsByType.weekly} />
      <ComparisonSection />
      <TestimonialTabs />
      {/* Current Competitions section — always rendered when any non-Coming-Soon comp exists */}
      <CompetitionsGrid competitions={gridComps} />
      <JournalPreview />
      <HomeFaqSection />
      <Footer />
      <ScrollReveal />
    </>
  )
}
