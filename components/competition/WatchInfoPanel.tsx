import { Competition } from '@/lib/competition-data'
import LiveActivity from '@/components/LiveActivity'

interface Props {
  competition: Competition
}

const CONDITION_LABELS: Record<string, string> = {
  brand_new:       'Brand New · Full Box & Papers',
  new:             'Brand New · Full Box & Papers',
  unworn:          'Unworn · Full Box & Papers',
  pre_owned:       'Pre-Owned · Box & Papers',
  pre_owned_papers:'Pre-Owned · Papers Only',
  used:            'Pre-Owned',
}

function formatCondition(raw: string): string {
  return CONDITION_LABELS[raw.toLowerCase().replace(/[\s-]/g, '_')]
    ?? raw.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export default function WatchInfoPanel({ competition: c }: Props) {
  const fmt = (n: number) => `${c.currency}${n.toLocaleString('en-GB')}`

  return (
    <div className="entry-left">
      <div className="watch-image-card">
        <div className="watch-image-wrap">
          <div className="watch-image-badge">Current Prize</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={c.image}
            alt={c.title}
          />
        </div>
        <div className="watch-image-caption">
          <div>
            <div className="wic-title">{c.title}</div>
            <div className="wic-ref">Ref. {c.reference}</div>
          </div>
        </div>
      </div>

      {/* Real order activity — renders only when matching WooCommerce orders exist */}
      <LiveActivity productId={c.wooProductId} />

      <div className="watch-info-card">
        <div className="wic-section-title">Watch &amp; Competition Information</div>
        <div className="wi-row">
          <div className="wi-key">Retail Value</div>
          <div className="wi-val gold">{fmt(c.retailValue)}</div>
        </div>
        <div className="wi-row">
          <div className="wi-key">Entry Price</div>
          <div className="wi-val">
            {c.isFree || c.entryPrice === 0
              ? <span style={{ color: 'var(--green)', fontWeight: 600 }}>FREE</span>
              : `From ${c.currency}${c.entryPrice.toFixed(2)}`
            }
          </div>
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
          <div className="wi-val">{c.condition ? formatCondition(c.condition) : 'Brand New · Full Box & Papers'}</div>
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
