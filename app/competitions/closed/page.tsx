import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'Closed Draws — Premium Watch Club',
}

const closedDraws = [
  {
    title: 'Rolex Submariner Date',
    reference: '126610LN',
    value: '£9,800',
    drawDate: '15 March 2026',
    winner: 'J.T. — London',
    tickets: '500/500',
  },
  {
    title: 'Cartier Santos Medium',
    reference: 'WSSA0029',
    value: '£6,950',
    drawDate: '28 February 2026',
    winner: 'M.R. — Edinburgh',
    tickets: '500/500',
  },
  {
    title: 'Omega Seamaster 300M',
    reference: '210.30.42.20.03.001',
    value: '£5,200',
    drawDate: '10 January 2026',
    winner: 'S.K. — Amsterdam',
    tickets: '500/500',
  },
]

export default function ClosedDrawsPage() {
  return (
    <>
      <Header />

      <div className="page-hero">
        <div className="container">
          <div className="section-eyebrow">Archive</div>
          <h1 className="page-hero-headline">Closed Draws</h1>
          <p className="page-hero-sub">Every competition run by Premium Watch Club — fully transparent, with verified winners.</p>
        </div>
      </div>

      <main className="page-content-wrap page-content-wide">
        <div className="container">

          <div className="closed-draws-grid">
            {closedDraws.map((draw, i) => (
              <div key={i} className="closed-draw-card">
                <div className="cdc-header">
                  <div className="cdc-badge">SOLD OUT</div>
                  <div className="cdc-date">Draw: {draw.drawDate}</div>
                </div>
                <div className="cdc-watch-placeholder">
                  <svg width="64" height="64" viewBox="0 0 120 120" fill="none" opacity="0.25">
                    <circle cx="60" cy="60" r="52" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="60" cy="60" r="40" stroke="currentColor" strokeWidth="0.8" fill="none"/>
                    <rect x="57" y="12" width="6" height="14" rx="1.5" fill="currentColor"/>
                    <rect x="57" y="94" width="6" height="14" rx="1.5" fill="currentColor"/>
                    <rect x="12" y="57" width="14" height="6" rx="1.5" fill="currentColor"/>
                    <rect x="94" y="57" width="14" height="6" rx="1.5" fill="currentColor"/>
                    <rect x="58" y="30" width="4" height="32" rx="2" fill="currentColor" transform="rotate(-28 60 60)"/>
                    <rect x="59" y="24" width="2.5" height="40" rx="1.2" fill="currentColor" transform="rotate(22 60 60)"/>
                    <circle cx="60" cy="60" r="5" fill="currentColor"/>
                  </svg>
                </div>
                <div className="cdc-body">
                  <h3 className="cdc-title">{draw.title}</h3>
                  <p className="cdc-ref">Ref. {draw.reference}</p>
                  <div className="cdc-stats">
                    <div className="cdc-stat">
                      <span className="cdc-stat-label">Prize Value</span>
                      <span className="cdc-stat-value">{draw.value}</span>
                    </div>
                    <div className="cdc-stat">
                      <span className="cdc-stat-label">Tickets</span>
                      <span className="cdc-stat-value">{draw.tickets}</span>
                    </div>
                  </div>
                  <div className="cdc-winner">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
                    </svg>
                    <span>Winner: {draw.winner}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="closed-draws-note">
            <p>All draws are conducted live and publicly streamed. Draw recordings are archived on our YouTube channel.</p>
          </div>

        </div>
      </main>

      <Footer />
    </>
  )
}
