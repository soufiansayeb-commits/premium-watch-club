import { getHomepageWinners } from '@/lib/past-winners'
import WinnersSection from './WinnersSection'

/**
 * Server wrapper: fetches the dynamic homepage winners (closed competitions
 * flagged show_on_homepage_winners with a real winner_photo) and renders the
 * carousel. Renders nothing when no qualifying winners exist — so the section
 * never shows product/watch images as winner photos.
 */
export default async function HomepageWinners() {
  const winners = (await getHomepageWinners()).map(w => ({
    name:        w.winnerDisplayName ?? 'Verified winner',
    prize:       w.title,
    testimonial: w.homepageWinnerQuote || w.winnerTestimonial || '',
    image:       w.winnerPhoto as string, // guaranteed present by getHomepageWinners
  }))

  if (winners.length === 0) return null
  return <WinnersSection winners={winners} />
}
