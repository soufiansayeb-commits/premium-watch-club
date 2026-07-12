import type { Metadata } from 'next'
import { getAllActiveCompetitionsByType } from '@/lib/woocommerce'
import { getActiveOffer, resolveOfferCtaHref } from '@/lib/offer'
import type { Competition } from '@/lib/competition-data'
import Header from '@/components/Header'
import OfferBar from '@/components/OfferBar'
import HomepageHeroContainer from '@/components/HomepageHeroContainer'
import StatsBar from '@/components/StatsBar'
import HomepageWinners from '@/components/HomepageWinners'
import OfferSection from '@/components/OfferSection'
import HowItWorksInteractive from '@/components/HowItWorksInteractive'
import ComparisonSection from '@/components/ComparisonSection'
import TestimonialTabs from '@/components/TestimonialTabs'
import JournalPreview from '@/components/JournalPreview'
import WhyNotBuyIt from '@/components/WhyNotBuyIt'
import HomeFaqSection from '@/components/HomeFaqSection'
import CompetitionsGrid from '@/components/CompetitionsGrid'
import Footer from '@/components/Footer'
import ScrollReveal from '@/components/ScrollReveal'

export const metadata: Metadata = {
  title: 'Premium Watch Club — Win Luxury Watches in Skill-Based Competitions',
  description: 'Enter skill-based competitions to win luxury watches from Rolex, Omega and more. One competition at a time — answer a skill question to enter.',
}

export default async function HomePage() {
  const [competitionsByType, offer] = await Promise.all([
    getAllActiveCompetitionsByType(),
    getActiveOffer(),
  ])

  const offerCtaHref = resolveOfferCtaHref(
    offer,
    competitionsByType.special,
    competitionsByType.weekly,
  )

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
      <OfferBar offer={offer} ctaHref={offerCtaHref} />
      <HomepageHeroContainer competitionsByType={competitionsByType} />
      <StatsBar />
      <HomepageWinners />
      <OfferSection
        offer={offer}
        special={competitionsByType.special}
        weekly={competitionsByType.weekly}
        ctaHref={offerCtaHref}
      />
      {/* CTA scrolls to the current competitions section on this page, not the Special comp. */}
      <HowItWorksInteractive ctaHref="#competitions-grid" />
      <ComparisonSection />
      <TestimonialTabs />
      {/* Current Competitions section — always rendered when any non-Coming-Soon comp exists */}
      <CompetitionsGrid competitions={gridComps} />
      <JournalPreview />
      <WhyNotBuyIt ctaHref="#competitions-grid" />
      <HomeFaqSection />
      <Footer />
      <ScrollReveal />
    </>
  )
}
