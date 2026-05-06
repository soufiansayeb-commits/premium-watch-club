import { getCompetitionBySlug } from '@/lib/competition-data'
import { notFound } from 'next/navigation'
import AnnouncementBar from '@/components/AnnouncementBar'
import Header from '@/components/Header'
import CompetitionEntryFlow from '@/components/competition/CompetitionEntryFlow'
import CompetitionFooter from '@/components/CompetitionFooter'

interface Props {
  params: { slug: string }
}

export default async function CompetitionPage({ params }: Props) {
  const competition = getCompetitionBySlug(params.slug)
  if (!competition) notFound()

  return (
    <>
      <AnnouncementBar competition={competition} />
      <Header />
      <CompetitionEntryFlow competition={competition} />
      <CompetitionFooter />
    </>
  )
}

export async function generateStaticParams() {
  return [{ slug: 'omega-speedmaster-moonwatch' }]
}
