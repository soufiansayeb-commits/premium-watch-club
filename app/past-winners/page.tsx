import Header from '@/components/Header'
import Footer from '@/components/Footer'
import PastWinnersGrid from '@/components/PastWinnersGrid'
import { getPastWinners } from '@/lib/past-winners'

export const revalidate = 60

export const metadata = {
  title: 'Past Winners — Premium Watch Club',
  description: 'Every Premium Watch Club competition is drawn live and every winner is verified. Browse our archive of past winners and closed draws.',
}

export default async function PastWinnersPage() {
  const winners = await getPastWinners()

  return (
    <>
      <Header />

      <div className="pw-page">
        <div className="pw-hero">
          <span className="pw-hero-eyebrow">Hall of Honour</span>
          <h1 className="pw-hero-title">Past Winners</h1>
          <p className="pw-hero-sub">
            Every draw is conducted live and every winner is verified. This is the full archive of
            Premium Watch Club competitions that have been drawn.
          </p>
        </div>

        <div className="pw-section">
          <PastWinnersGrid winners={winners} />
        </div>
      </div>

      <Footer />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Jost:wght@300;400;500;600&display=swap');
        .pw-page { background:#F6F3EC; }
        .pw-hero { text-align:center; padding:72px 24px 36px; max-width:680px; margin:0 auto; }
        .pw-hero-eyebrow { font-family:'Jost',sans-serif; font-size:11px; font-weight:600; letter-spacing:.3em; text-transform:uppercase; color:#B8893C; }
        .pw-hero-title { font-family:'Cormorant Garamond',Georgia,serif; font-weight:600; font-size:clamp(40px,6vw,60px); line-height:1.04; color:#0A1F44; margin:16px 0 14px; }
        .pw-hero-sub { font-family:'Jost',sans-serif; font-size:15px; line-height:1.7; color:#5b5a62; margin:0; }
        .pw-section { padding:20px 24px 88px; }
      `}</style>
    </>
  )
}
