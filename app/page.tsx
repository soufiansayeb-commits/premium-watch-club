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
import ReviewWall from '@/components/ReviewWall'
import Footer from '@/components/Footer'
import ScrollReveal from '@/components/ScrollReveal'

const HOME_TITLE = 'Premium Watch Club | Skill-Based Luxury Watch Competitions'
const HOME_DESCRIPTION =
  'Enter skill-based competitions for the chance to win authentic luxury watches. Transparent entry limits, independently verified draws and guaranteed cash alternatives.'

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  // Canonical resolves against metadataBase (www) → https://www.premiumwatchclub.com
  alternates: { canonical: '/' },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: '/',
    siteName: 'Premium Watch Club',
    type: 'website',
    locale: 'en_GB',
    // OG image is supplied automatically by app/opengraph-image.png
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
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
      {/* General WiserReview "wall of love" — sits directly below How It Works */}
      <ReviewWall />
      <ComparisonSection />
      {/* Current Competitions section — always rendered when any non-Coming-Soon comp exists */}
      <CompetitionsGrid competitions={gridComps} />
      {/* "What our winners say" — sits directly above the Journal section */}
      <TestimonialTabs />
      <JournalPreview />
      <WhyNotBuyIt ctaHref="#competitions-grid" />
      <HomeFaqSection />
      <Footer />
      <ScrollReveal />
    </>
  )
}
