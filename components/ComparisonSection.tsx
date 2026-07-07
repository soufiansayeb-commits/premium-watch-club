// ComparisonSection.tsx — PWC vs the field, 3-column comparison.
//
// STRUCTURE: 3 columns (Criteria | PremiumWatchClub | Watch comps)
// • PremiumWatchClub = highlighted navy floating card (lifted, gold-framed)
// • Green checks mark every PWC advantage; muted crosses mark the field
// • Built to fit cleanly down to ~320px with no horizontal scroll.
//   On mobile the descriptor text collapses to a clean check vs cross scan.

import Image from 'next/image'

// ── Data ─────────────────────────────────────────────────────────────────────

type Row = { label: string; pwc: string; comp: string }

const ROWS: Row[] = [
  { label: 'Entry pool size',   pwc: 'Limited drops',     comp: 'Crowded pools'  },
  { label: 'Entry mechanic',    pwc: 'Skill-based',       comp: 'Raffle feel'    },
  { label: 'Odds transparency', pwc: 'Visible logic',     comp: 'Often unclear'  },
  { label: 'Prize curation',    pwc: 'Watches only',      comp: 'Mixed prizes'   },
  { label: 'Winner proof',      pwc: 'Verified archive',  comp: 'Hard to verify' },
  { label: 'Brand experience',  pwc: 'Luxury watch club', comp: 'Generic site'   },
]

// ── Marks ─────────────────────────────────────────────────────────────────────

function Check() {
  return (
    <svg width="24" height="24" viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <circle cx="13" cy="13" r="12" fill="rgba(37,192,131,.16)" stroke="#25C083" strokeWidth="1.7" />
      <path d="M8 13l3.4 3.4L18 9.4" stroke="#25C083" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Cross() {
  return (
    <svg width="24" height="24" viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <circle cx="13" cy="13" r="12" fill="rgba(120,122,130,.08)" stroke="rgba(120,122,130,.34)" strokeWidth="1.3" />
      <path d="M9.2 9.2l7.6 7.6M16.8 9.2l-7.6 7.6" stroke="rgba(120,122,130,.7)" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ComparisonSection() {
  const last = ROWS.length - 1

  return (
    <section className="cs-s">
      <div className="cs-w">

        {/* ── Intro: eyebrow · headline · supporting copy (centered) ── */}
        <div className="cs-intro">
          <p className="cs-eyebrow">Premium Watch Club vs. Typical Comps</p>
          <h2 className="cs-title">Why Premium Watch Club feels different</h2>
          <p className="cs-sub">
            Most watch competitions bury the odds, crowd the entry pool and blur the draw.
            We built the opposite: limited drops, skill-based entry and a verified winner
            archive you can actually check.
          </p>
        </div>

        {/* ── Comparison table ── */}
        <div className="cs-table-wrap">
          <div className="cs-table">

              {/* ── Col 1: Criteria ── */}
              <div className="cs-col cs-col-crit">
                <div className="cs-cell cs-head cs-head-crit"><span>Criteria</span></div>
                {ROWS.map((row, i) => (
                  <div key={i} className={`cs-cell cs-crit${i === last ? ' cs-last' : ''}`}>
                    {row.label}
                  </div>
                ))}
              </div>

              {/* ── Col 2: PremiumWatchClub — navy floating card ── */}
              <div className="cs-col cs-col-pwc">
                <div className="cs-cell cs-head cs-head-pwc">
                  <Image
                    src="/brand-assets/pwc-logo-wordmark-gold.png"
                    alt="Premium Watch Club"
                    width={1447} height={341}
                    className="cs-pwc-logo"
                    priority
                  />
                </div>
                {ROWS.map((row, i) => (
                  <div key={i} className={`cs-cell cs-pwc${i === last ? ' cs-last' : ''}`}>
                    <span className="cs-pwc-glyph"><Check /></span>
                    <span className="cs-pwc-sub">{row.pwc}</span>
                  </div>
                ))}
              </div>

              {/* ── Col 3: Watch comps ── */}
              <div className="cs-col cs-col-comp cs-col-end">
                <div className="cs-cell cs-head cs-head-comp"><span>Watch comps</span></div>
                {ROWS.map((row, i) => (
                  <div key={i} className={`cs-cell cs-comp${i === last ? ' cs-last' : ''}`}>
                    <span className="cs-comp-glyph"><Cross /></span>
                    <span className="cs-comp-val">{row.comp}</span>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
    </section>
  )
}
