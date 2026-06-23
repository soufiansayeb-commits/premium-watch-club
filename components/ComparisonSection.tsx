// ComparisonSection.tsx — Grüns-style comparison matrix, PWC brand
//
// STRUCTURE: 4 flex columns (criteria | PWC | Generic Raffle | Big Catalogue)
// • Outer card: thin navy border, rounded, white bg — like Grüns
// • PWC column = navy floating card that extends ABOVE + BELOW the table
//   (taller than the rest, lifted with shadow) — exactly the Grüns highlight
// • Gold PWC logo sits directly on navy (transparent PNG) — no white box
// • Rows share fixed heights so every column stays aligned
// • Compact spacing, strong-but-clean grid lines

import Image from 'next/image'

// ── Data ─────────────────────────────────────────────────────────────────────

type IconKey = 'stars' | 'gem' | 'check' | 'crown'

type CompKind = 'crowd' | 'dice' | 'clock' | 'blur' | 'clutter'
type Tone = 'red' | 'amber'
type Cell = { text: string; kind: CompKind; tone: Tone }

const ROWS: { label: string; icon: IconKey; pwcText: string; c1: Cell; c2: Cell }[] = [
  { label: 'Entry pool size',   icon: 'stars', pwcText: 'Limited drops',     c1: { text: 'Crowded pools',      kind: 'crowd',   tone: 'amber' }, c2: { text: 'High-volume entries', kind: 'crowd',   tone: 'red'   } },
  { label: 'Entry mechanic',    icon: 'gem',   pwcText: 'Skill-based',        c1: { text: 'Raffle feel',        kind: 'dice',    tone: 'red'   }, c2: { text: 'Urgency-first',       kind: 'clock',   tone: 'amber' } },
  { label: 'Odds transparency', icon: 'check', pwcText: 'Visible logic',      c1: { text: 'Often unclear',      kind: 'blur',    tone: 'red'   }, c2: { text: 'Hard to compare',     kind: 'blur',    tone: 'amber' } },
  { label: 'Prize curation',    icon: 'crown', pwcText: 'Watches only',       c1: { text: 'Mixed prizes',       kind: 'clutter', tone: 'amber' }, c2: { text: 'Catalogue clutter',   kind: 'clutter', tone: 'red'   } },
  { label: 'Winner proof',      icon: 'check', pwcText: 'Archive + verified', c1: { text: 'Limited visibility', kind: 'blur',    tone: 'red'   }, c2: { text: 'Hard to verify',      kind: 'blur',    tone: 'red'   } },
  { label: 'Brand experience',  icon: 'stars', pwcText: 'Luxury watch club',  c1: { text: 'Generic comp site',  kind: 'crowd',   tone: 'amber' }, c2: { text: 'Volume focused',      kind: 'clock',   tone: 'amber' } },
]

// ── Icons ─────────────────────────────────────────────────────────────────────

function PWCIcon({ type }: { type: IconKey }) {
  if (type === 'stars') return <span className="cs-glyph cs-stars">★★★</span>
  if (type === 'gem')   return <span className="cs-glyph cs-gem">✦</span>
  if (type === 'crown') return <span className="cs-glyph cs-crown">♛</span>
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <circle cx="13" cy="13" r="12" fill="rgba(184,137,60,.15)" stroke="#B8893C" strokeWidth="1.7"/>
      <path d="M8 13l4 4 7-7" stroke="#B8893C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

const CompIcon1 = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.1"/>
    <path d="M10 6.5v7M7 10h6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
  </svg>
)
const CompIcon2 = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <rect x="2.5" y="2.5" width="15" height="15" rx="2.2" stroke="currentColor" strokeWidth="1.1"/>
    <path d="M5.5 7.5h9M5.5 10h9M5.5 12.5h5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
  </svg>
)

// Competitor markers — a cohesive set of designed glyphs that name each
// weakness (crowd, raffle dice, urgency clock, unclear eye, clutter), in the
// same soft-circle language as the PWC check icon. red = hard no, amber = weak.
const TONE: Record<Tone, string> = { red: '193,57,43', amber: '176,138,74' }

function CompMark({ kind, tone }: { kind: CompKind; tone: Tone }) {
  const rgb = TONE[tone]
  const c = `rgb(${rgb})`
  return (
    <svg className="cs-cmark" width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <circle cx="13" cy="13" r="12" fill={`rgba(${rgb},.09)`} stroke={`rgba(${rgb},.34)`} strokeWidth="1.3" />
      <g stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {kind === 'crowd' && (
          <>
            <circle cx="10" cy="11" r="1.7" fill={c} stroke="none" />
            <circle cx="16" cy="11" r="1.7" fill={c} stroke="none" />
            <circle cx="13" cy="15" r="1.7" fill={c} stroke="none" />
          </>
        )}
        {kind === 'dice' && (
          <>
            <rect x="8" y="8" width="10" height="10" rx="2.4" />
            <circle cx="10.7" cy="10.7" r=".95" fill={c} stroke="none" />
            <circle cx="15.3" cy="15.3" r=".95" fill={c} stroke="none" />
            <circle cx="13" cy="13" r=".95" fill={c} stroke="none" />
          </>
        )}
        {kind === 'clock' && (
          <>
            <circle cx="13" cy="13" r="5.2" />
            <path d="M13 9.8V13l2.2 1.4" />
          </>
        )}
        {kind === 'blur' && (
          <>
            <path d="M7 13s2.4-3.6 6-3.6 6 3.6 6 3.6-2.4 3.6-6 3.6S7 13 7 13z" />
            <circle cx="13" cy="13" r="1.7" />
            <path d="M8.4 8.4l9.2 9.2" />
          </>
        )}
        {kind === 'clutter' && (
          <>
            <rect x="7.6" y="9.4" width="7.2" height="5.6" rx="1.1" />
            <rect x="11.2" y="11.6" width="7.2" height="5.6" rx="1.1" fill={`rgba(${rgb},.12)`} />
          </>
        )}
      </g>
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ComparisonSection() {
  const last = ROWS.length - 1

  return (
    <section className="cs-s">
      <div className="cs-w">
        <div className="cs-layout">

          {/* ── LEFT: heading block ── */}
          <div className="cs-copy">
            <p className="cs-eyebrow">✦ The PWC Standard</p>
            <h2 className="cs-h2">Why members<br/>choose PWC</h2>
            <p className="cs-sub">
              A cleaner, more transparent way to
              enter premium watch competitions.
            </p>
            <ul className="cs-bullets">
              <li>Skill-based — not random</li>
              <li>Watches only, at market value</li>
              <li>Live certified draws</li>
              <li>Every winner archived</li>
            </ul>
          </div>

          {/* ── RIGHT: comparison table ── */}
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

              {/* ── Col 2: PWC — navy floating card ── */}
              <div className="cs-col cs-col-pwc">
                <div className="cs-cell cs-head cs-head-pwc">
                  <Image
                    src="/brand-assets/pwc-logo-gold-transparent.png"
                    alt="Premium Watch Club"
                    width={502} height={126}
                    className="cs-pwc-logo"
                    style={{ width: '76%', height: 'auto' }}
                    priority
                  />
                </div>
                {ROWS.map((row, i) => (
                  <div key={i} className={`cs-cell cs-pwc${i === last ? ' cs-last' : ''}`}>
                    <span className="cs-pwc-glyph"><PWCIcon type={row.icon} /></span>
                    <span className="cs-pwc-sub">{row.pwcText}</span>
                  </div>
                ))}
              </div>

              {/* ── Col 3: Generic Raffle Site ── */}
              <div className="cs-col cs-col-comp">
                <div className="cs-cell cs-head cs-head-comp">
                  <CompIcon1 />
                  <span>Generic<br/>Raffle Site</span>
                </div>
                {ROWS.map((row, i) => (
                  <div key={i} className={`cs-cell cs-comp${i === last ? ' cs-last' : ''}`}>
                    <CompMark kind={row.c1.kind} tone={row.c1.tone} />
                    <span className="cs-comp-val">{row.c1.text}</span>
                  </div>
                ))}
              </div>

              {/* ── Col 4: Big Prize Catalogue ── */}
              <div className="cs-col cs-col-comp cs-col-end">
                <div className="cs-cell cs-head cs-head-comp">
                  <CompIcon2 />
                  <span>Big Prize<br/>Catalogue</span>
                </div>
                {ROWS.map((row, i) => (
                  <div key={i} className={`cs-cell cs-comp${i === last ? ' cs-last' : ''}`}>
                    <CompMark kind={row.c2.kind} tone={row.c2.tone} />
                    <span className="cs-comp-val">{row.c2.text}</span>
                  </div>
                ))}
              </div>

            </div>
          </div>

        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&family=Jost:wght@300;400;500;600;700&display=swap');

        /* ─── Section ─────────────────────────────────────────── */
        .cs-s {
          background: #F0EBE1;
          background-image: radial-gradient(rgba(10,31,68,.048) 1px, transparent 1px);
          background-size: 24px 24px;
          padding: 90px 28px 92px;
        }
        .cs-w { max-width: 1040px; margin: 0 auto; }

        /* ─── Two-col layout ──────────────────────────────────── */
        .cs-layout { display: flex; gap: 48px; align-items: center; }

        /* ─── LEFT copy block ─────────────────────────────────── */
        .cs-copy { flex: 0 0 232px; }
        .cs-eyebrow {
          font-family: 'Jost', sans-serif;
          font-size: 9px; font-weight: 600; letter-spacing: .22em;
          text-transform: uppercase; color: #B8893C; margin: 0 0 14px;
        }
        .cs-h2 {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(44px, 5.5vw, 70px);
          font-weight: 700; line-height: .95; letter-spacing: -.02em;
          color: #0A1F44; margin: 0 0 18px;
        }
        .cs-sub {
          font-family: 'Jost', sans-serif;
          font-size: 13px; line-height: 1.76; font-weight: 300;
          color: rgba(10,31,68,.56); margin: 0 0 20px;
        }
        .cs-bullets {
          list-style: none; padding: 0; margin: 0;
          display: flex; flex-direction: column; gap: 7px;
        }
        .cs-bullets li {
          font-family: 'Jost', sans-serif;
          font-size: 12px; font-weight: 400; color: rgba(10,31,68,.6);
          padding-left: 15px; position: relative;
        }
        .cs-bullets li::before {
          content: '✦'; position: absolute; left: 0; top: 3px;
          color: #B8893C; font-size: 6px;
        }

        /* ─── Table ───────────────────────────────────────────── */
        .cs-table-wrap { flex: 1; }
        .cs-table {
          --h-head: 76px;
          --h-row: 62px;
          --lift: 16px;
          --line: rgba(10,31,68,.13);
          display: flex;
          background: #ffffff;
          border: 1.5px solid rgba(10,31,68,.2);
          border-radius: 16px;
          /* visible — so the PWC column can float above + below */
          position: relative;
        }
        .cs-col { display: flex; flex-direction: column; }
        .cs-col-crit { flex: 1.7; }
        .cs-col-pwc  { flex: 1.28; }
        .cs-col-comp { flex: 1; }

        /* shared cell */
        .cs-cell {
          display: flex; align-items: center; justify-content: center;
          height: var(--h-row);
          border-bottom: 1.5px solid var(--line);
          text-align: center;
          box-sizing: border-box;
        }
        .cs-head {
          height: var(--h-head);
          border-bottom-width: 1.5px;
        }
        .cs-last { border-bottom: none; }

        /* vertical separators (white columns only) */
        .cs-col-crit .cs-cell { border-right: 1.5px solid var(--line); }
        .cs-col-comp .cs-cell { border-right: 1.5px solid var(--line); }
        .cs-col-end  .cs-cell { border-right: none; }

        /* rounded outer corners (PWC floats over the middle) */
        .cs-col-crit .cs-head { border-top-left-radius: 16px; }
        .cs-col-crit .cs-last { border-bottom-left-radius: 16px; }
        .cs-col-end  .cs-head { border-top-right-radius: 16px; }
        .cs-col-end  .cs-last { border-bottom-right-radius: 16px; }

        /* ─── Criteria column ─────────────────────────────────── */
        .cs-head-crit {
          justify-content: flex-start; padding-left: 18px;
        }
        .cs-head-crit span {
          font-family: 'Jost', sans-serif;
          font-size: 8px; font-weight: 600; letter-spacing: .2em;
          text-transform: uppercase; color: rgba(10,31,68,.3);
        }
        .cs-crit {
          font-family: 'Jost', sans-serif;
          font-size: 13px; font-weight: 600; color: #0A1F44;
          justify-content: flex-start; padding-left: 18px;
        }

        /* ─── PWC floating column ─────────────────────────────── */
        .cs-col-pwc {
          background: #0A1F44;
          border-radius: 18px;
          margin: calc(var(--lift) * -1) 0;   /* extend above + below */
          z-index: 3;
          box-shadow:
            0 18px 44px rgba(10,31,68,.34),
            0 4px 12px rgba(10,31,68,.22),
            inset 0 0 0 1.5px rgba(184,137,60,.5);
          overflow: hidden;
        }
        .cs-col-pwc .cs-cell {
          border-bottom: 1.5px solid rgba(255,255,255,.07);
          border-right: none;
        }
        .cs-col-pwc .cs-last { border-bottom: none; }
        /* taller header (fills top overhang) + taller last cell (bottom overhang) */
        .cs-head-pwc {
          height: calc(var(--h-head) + var(--lift));
          flex-direction: column; gap: 0;
          padding: 0 16px;
          border-bottom: 1.5px solid rgba(184,137,60,.32) !important;
        }
        .cs-col-pwc .cs-last { height: calc(var(--h-row) + var(--lift)); }

        .cs-pwc-logo {
          width: 76%; max-width: 168px; height: auto;
          object-fit: contain; display: block;
          filter: drop-shadow(0 1px 4px rgba(0,0,0,.25));
        }

        .cs-pwc {
          flex-direction: column; gap: 3px;
        }
        .cs-pwc-glyph { display: flex; align-items: center; justify-content: center; height: 24px; }
        .cs-pwc-sub {
          font-family: 'Jost', sans-serif;
          font-size: 10px; font-weight: 500; letter-spacing: .01em;
          color: rgba(246,243,236,.72); text-align: center;
        }
        .cs-glyph { color: #B8893C; line-height: 1; }
        .cs-stars { font-size: 13px; letter-spacing: 2px; }
        .cs-gem   { font-size: 22px; }
        .cs-crown { font-size: 19px; }

        /* ─── Competitor columns ──────────────────────────────── */
        .cs-head-comp {
          flex-direction: column; gap: 5px;
        }
        .cs-head-comp svg { color: rgba(10,31,68,.2); }
        .cs-head-comp span {
          font-family: 'Jost', sans-serif;
          font-size: 8.5px; font-weight: 500;
          letter-spacing: .1em; text-transform: uppercase;
          color: rgba(10,31,68,.3); line-height: 1.5;
        }
        .cs-comp { flex-direction: column; gap: 5px; }
        .cs-cmark { display: block; }
        .cs-comp-val {
          font-family: 'Jost', sans-serif;
          font-size: 11px; font-weight: 300; font-style: italic;
          color: rgba(10,31,68,.4); text-align: center; padding: 0 8px;
        }

        /* ─── Mobile ──────────────────────────────────────────── */
        @media (max-width: 820px) {
          .cs-layout { flex-direction: column; gap: 24px; align-items: stretch; }
          .cs-copy { flex: none; width: 100%; }
          .cs-h2 { font-size: 56px; }
          .cs-table-wrap { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; padding: 18px 0; }
          .cs-table { min-width: 540px; }
        }
        @media (max-width: 480px) {
          .cs-s { padding: 68px 12px 72px; }
          .cs-h2 { font-size: 44px; }
          .cs-crit { font-size: 11.5px; padding-left: 14px; }
          .cs-comp-val { font-size: 10px; }
        }
      `}</style>
    </section>
  )
}
