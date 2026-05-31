import { getAllActiveCompetitionsByType } from '@/lib/woocommerce'
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
  // Single fetch — groups all published WooCommerce products by competition_type.
  const competitionsByType = await getAllActiveCompetitionsByType()

  // CompetitionsGrid needs both a weekly and a "secondary" competition.
  // Use starter as the secondary (replaces old free comp slot).
  const weeklyComp  = competitionsByType.weekly
  const starterComp = competitionsByType.starter

  return (
    <>
      <Header />
      {/* One hero + switcher — replaces the old stacked HomepageHero + FreeCompHero */}
      <HomepageHeroContainer competitionsByType={competitionsByType} />
      <StatsBar />
      <WinnersSection />
      <HowItWorks />
      <TrustBar />
      {weeklyComp && starterComp && (
        <CompetitionsGrid weeklyComp={weeklyComp} freeComp={starterComp} />
      )}
      <JournalPreview />
      <NewsletterSection />
      <Footer />
      <ScrollReveal />
    </>
  )
}
