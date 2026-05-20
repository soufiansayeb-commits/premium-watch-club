import { getAllCompetitions } from '@/lib/competition-data'
import { fetchWooProductById, mergeWooData } from '@/lib/woocommerce'
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
  const paidComp = competitions[0] // wooProductId: 20
  const freeComp = competitions[1] // wooProductId: 13

  const [{ product: paidWooProduct }, { product: freeWooProduct }] = await Promise.all([
    fetchWooProductById(paidComp.wooProductId),
    fetchWooProductById(freeComp.wooProductId),
  ])

  const mergedPaidComp = paidWooProduct ? mergeWooData(paidComp, paidWooProduct) : paidComp
  const mergedFreeComp = freeWooProduct ? mergeWooData(freeComp, freeWooProduct) : freeComp

  return (
    <>
      <Header />
      <HomepageHero competition={mergedPaidComp} />
      <FreeCompHero competition={mergedFreeComp} />
      <StatsBar />
      <WinnersSection />
      <HowItWorks />
      <TrustBar />
      <CompetitionsGrid paidComp={mergedPaidComp} freeComp={mergedFreeComp} />
      <JournalPreview />
      <NewsletterSection />
      <Footer />
      <ScrollReveal />
    </>
  )
}
