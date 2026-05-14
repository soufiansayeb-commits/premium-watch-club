import { getAllCompetitions } from '@/lib/competition-data'
import { fetchWooProducts } from '@/lib/woocommerce'
import Header from '@/components/Header'
import HomepageHero from '@/components/HomepageHero'
import FreeCompHero from '@/components/FreeCompHero'
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
  const competitions = getAllCompetitions()
  const paidComp  = competitions[0]
  const freeComp  = competitions[1]

  // TEMPORARY WooCommerce title test — replace with full data mapping later
  const { products } = await fetchWooProducts()
  const displayTitle = products[0]?.name || paidComp.title
  const competitionWithWooTitle = { ...paidComp, title: displayTitle }

  return (
    <>
      <Header />
      <HomepageHero competition={competitionWithWooTitle} />
      <FreeCompHero competition={freeComp} />
      <StatsBar />
      <WinnersSection />
      <HowItWorks />
      <TrustBar />
      <JournalPreview />
      <CompetitionsGrid paidComp={competitionWithWooTitle} freeComp={freeComp} />
      <NewsletterSection />
      <Footer />
      <ScrollReveal />
    </>
  )
}
