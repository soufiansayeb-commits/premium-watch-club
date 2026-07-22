import type { Metadata } from 'next'
import { getAllActiveCompetitionsByType } from '@/lib/woocommerce'
import { getActiveOffer, resolveOfferCtaHref } from '@/lib/offer'
import type { Competition } from '@/lib/competition-data'
import Header from '@/components/Header'
import HomepageHeroContainer from '@/components/HomepageHeroContainer'
import StatsBar from '@/components/StatsBar'
import HomepageWinners from '@/components/HomepageWinners'
import OfferSection from '@/components/OfferSection'
import HowItWorksInteractive from '@/components/HowItWorksInteractive'
import JournalPreview from '@/components/JournalPreview'
import WhyNotBuyIt from '@/components/WhyNotBuyIt'
import CompetitionsGrid from '@/components/CompetitionsGrid'
import ReviewWall from '@/components/ReviewWall'
import TestimonialTabs from '@/components/TestimonialTabs'
import Footer from '@/components/Footer'
import ScrollReveal from '@/components/ScrollReveal'
import { routes } from '@/lib/routes'

export const metadata: Metadata = {
  title: 'Special Edition Luxury Watch Competitions | Premium Watch Club',
  description: 'Win rare and limited edition luxury watches in our special competitions. Exceptional timepieces from Rolex, Omega and more, one competition at a time.',
}

export default async function SpecialLandingPage() {
  const [competitionsByType, offer] = await Promise.all([
    getAllActiveCompetitionsByType(),
    getActiveOffer(),
  ])
  const offerCtaHref = resolveOfferCtaHref(offer, competitionsByType.special, competitionsByType.weekly)

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
      <OfferSection
        offer={offer}
        special={competitionsByType.special}
        weekly={competitionsByType.weekly}
        ctaHref={offerCtaHref}
      />
      <HowItWorksInteractive ctaHref={routes.competitionSpecial} />
      {/* Review wall + winners — kept in sync with the homepage so a refresh
          (which lands on this route via the hero URL sync) keeps both sections. */}
      <ReviewWall />
      <CompetitionsGrid competitions={gridComps} />
      <TestimonialTabs />
      <WhyNotBuyIt ctaHref={routes.competitionSpecial} />
      <JournalPreview />
      <Footer />
      <ScrollReveal />
    </>
  )
}
