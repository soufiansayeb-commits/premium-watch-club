import { getAllCompetitions } from '@/lib/competition-data'
import { fetchWooProducts } from '@/lib/woocommerce'
import Header from '@/components/Header'
import HomepageHero from '@/components/HomepageHero'
import StatsBar from '@/components/StatsBar'
import WinnersSection from '@/components/WinnersSection'
import HowItWorks from '@/components/HowItWorks'
import TrustBar from '@/components/TrustBar'
import JournalPreview from '@/components/JournalPreview'
import CtaBanner from '@/components/CtaBanner'
import NewsletterSection from '@/components/NewsletterSection'
import Footer from '@/components/Footer'
import ScrollReveal from '@/components/ScrollReveal'

export default async function HomePage() {
  const competitions = getAllCompetitions()
  const competition  = competitions[0]

  // TEMPORARY WooCommerce title test — replace with full data mapping later
  const { products } = await fetchWooProducts()
  const displayTitle = products[0]?.name || competition.title
  const competitionWithWooTitle = { ...competition, title: displayTitle }

  return (
    <>
      <Header />
      <HomepageHero competition={competitionWithWooTitle} />
      <StatsBar />
      <WinnersSection />
      <HowItWorks />
      <TrustBar />
      <JournalPreview />
      <CtaBanner competition={competitionWithWooTitle} />
      <NewsletterSection />
      <Footer />
      <ScrollReveal />
    </>
  )
}
