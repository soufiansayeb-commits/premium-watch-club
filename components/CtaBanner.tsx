import Link from 'next/link'
import { Competition } from '@/lib/competition-data'

interface Props {
  competition: Competition
}

export default function CtaBanner({ competition: c }: Props) {
  const urgencyText = `${c.ticketsSold} of ${c.totalTickets} tickets claimed — ${c.ticketsLeft} entries still available`

  return (
    <section id="cta-banner">
      <div className="container">
        <div className="cta-inner reveal">
          <div className="cta-eyebrow">Current Draw · Closing Soon</div>
          <h2 className="cta-headline">
            {c.ticketsLeft} tickets remain for the<br />
            <em>Omega Speedmaster</em>
          </h2>
          <p className="cta-sub">One competition. One watch. 500 entries only. This is your chance to own the watch worn on the Moon — for just £{c.entryPrice.toFixed(2)}.</p>
          <div className="cta-actions">
            <Link href={c.ctaLink} className="btn-cta-primary">
              Secure Your Entry
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 7h9M7.5 3.5l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link href="/#how" className="btn-cta-secondary">How It Works</Link>
          </div>
          <div className="cta-urgency">
            <div className="dot"></div>
            <span>{urgencyText}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
