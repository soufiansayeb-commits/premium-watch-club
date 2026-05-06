import { Competition } from '@/lib/competition-data'

interface Props {
  competition: Competition
}

export default function WatchInfoPanel({ competition: c }: Props) {
  const fmt = (n: number) => `${c.currency}${n.toLocaleString()}`

  return (
    <div className="entry-left">
      <div className="watch-image-card">
        <div className="watch-image-wrap">
          <div className="watch-image-badge">Current Prize</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={c.image}
            alt="Omega Speedmaster Moonwatch"
          />
        </div>
        <div className="watch-image-caption">
          <div>
            <div className="wic-title">{c.title}</div>
            <div className="wic-ref">Ref. {c.reference}</div>
          </div>
        </div>
      </div>

      <div className="watch-info-card">
        <div className="wic-section-title">Watch &amp; Competition Information</div>
        <div className="wi-row">
          <div className="wi-key">Retail Value</div>
          <div className="wi-val gold">{fmt(c.retailValue)}</div>
        </div>
        <div className="wi-row">
          <div className="wi-key">Entry Price</div>
          <div className="wi-val">From {c.currency}{c.entryPrice.toFixed(2)}</div>
        </div>
        <div className="wi-row">
          <div className="wi-key">Total Entries</div>
          <div className="wi-val">{c.totalTickets} max</div>
        </div>
        <div className="wi-row">
          <div className="wi-key">Entries Remaining</div>
          <div className="wi-val green">{c.ticketsLeft} left</div>
        </div>
        <div className="wi-row">
          <div className="wi-key">Condition</div>
          <div className="wi-val">Brand New · Full Box &amp; Papers</div>
        </div>
        <div className="wi-row">
          <div className="wi-key">Draw Date</div>
          <div className="wi-val">{c.drawDateDisplay}</div>
        </div>
        <div className="wi-row">
          <div className="wi-key">Cash Alternative</div>
          <div className="wi-val">{fmt(c.cashAlternative)}</div>
        </div>
        <div className="wi-row">
          <div className="wi-key">Delivery</div>
          <div className="wi-val">Free · Fully Insured</div>
        </div>
      </div>
    </div>
  )
}
