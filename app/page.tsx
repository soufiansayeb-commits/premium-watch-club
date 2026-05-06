import { getAllCompetitions } from '@/lib/competition-data'
import AnnouncementBar from '@/components/AnnouncementBar'
import Header from '@/components/Header'
import HomepageHero from '@/components/HomepageHero'
import StatsBar from '@/components/StatsBar'
import WinnersSection from '@/components/WinnersSection'
import HowItWorks from '@/components/HowItWorks'
import TrustBar from '@/components/TrustBar'
import JournalPreview from '@/components/JournalPreview'
import CtaBanner from '@/components/CtaBanner'
import Footer from '@/components/Footer'
import ScrollReveal from '@/components/ScrollReveal'

export default function HomePage() {
  const competitions = getAllCompetitions()
  const competition  = competitions[0]

  return (
    <>
      <AnnouncementBar competition={competition} />
      <Header />
      <HomepageHero competition={competition} />
      <StatsBar />
      <WinnersSection />
      <HowItWorks />
      <TrustBar />
      <JournalPreview />
      <CtaBanner competition={competition} />
      <Footer />
      <ScrollReveal />
    </>
  )
}
