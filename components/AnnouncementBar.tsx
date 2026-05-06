import { Competition } from '@/lib/competition-data'

const TpStar = () => (
  <div className="ab-tp-star">
    <svg viewBox="0 0 20 20" fill="white">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
    </svg>
  </div>
)

interface Props {
  competition?: Competition
}

export default function AnnouncementBar({ competition }: Props) {
  const ticketsLeft = competition?.ticketsLeft ?? 399
  const entryPrice  = competition ? `£${competition.entryPrice.toFixed(2)}` : '£5.95'
  const drawDate    = competition?.drawDateDisplay ?? '30 May 2026'
  const name        = competition?.shortName ?? 'Omega Speedmaster Moonwatch'

  return (
    <div id="announce-bar">
      <div className="ab-left">
        <div className="ab-live-dot"></div>
        <span>
          <strong>Live Now:</strong> {name} — <strong>{entryPrice}</strong> per entry
          {' · '}{ticketsLeft} tickets remaining · Draw closes {drawDate}
        </span>
      </div>
      <div className="ab-right">
        <div className="ab-tp-stars">
          <TpStar /><TpStar /><TpStar /><TpStar /><TpStar />
        </div>
        <div className="ab-divider"></div>
        <span>4.8/5 · Trustpilot</span>
      </div>
    </div>
  )
}
