import Link from 'next/link'

const ArrowIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M1.5 5h7M5.5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export default function JournalPreview() {
  return (
    <section id="journal">
      <div className="container">
        <div className="section-header reveal">
          <div className="section-eyebrow">Journal</div>
          <h2 className="section-headline">Stories, guides &amp; watch culture</h2>
          <p className="section-sub">Expert guides, winner stories and watch collecting advice from the PWC editorial team.</p>
        </div>
        <div className="journal-grid">

          <div className="journal-card reveal">
            <div className="jc-img tall">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/images/omega-speedmaster-hero.png" alt="Omega Speedmaster" />
            </div>
            <div className="jc-body">
              <div className="jc-cat">Guide</div>
              <div className="jc-title large">The Omega Speedmaster: why the Moonwatch endures</div>
              <p className="jc-excerpt">From the Apollo programme to present day — why the Speedmaster Professional remains the definitive tool watch and the most coveted chronograph of our generation.</p>
              <Link href="/journal/omega-speedmaster-guide" className="jc-link">
                Read the full story <ArrowIcon />
              </Link>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="journal-card reveal d1">
              <div className="jc-img short" style={{ background: '#EAE6DC' }}>
                <svg width="90" height="90" viewBox="0 0 120 120" fill="none" opacity="0.6">
                  <circle cx="60" cy="60" r="52" stroke="#0A1F44" strokeWidth="1.5"/>
                  <circle cx="60" cy="60" r="40" stroke="#C5A065" strokeWidth="0.8" fill="none"/>
                  <rect x="57" y="12" width="6" height="14" rx="1.5" fill="#C5A065"/>
                  <rect x="57" y="94" width="6" height="14" rx="1.5" fill="#C5A065"/>
                  <rect x="12" y="57" width="14" height="6" rx="1.5" fill="#C5A065"/>
                  <rect x="94" y="57" width="14" height="6" rx="1.5" fill="#C5A065"/>
                  <rect x="58" y="30" width="4" height="32" rx="2" fill="#0A1F44" transform="rotate(-28 60 60)"/>
                  <rect x="59" y="24" width="2.5" height="40" rx="1.2" fill="#0A1F44" transform="rotate(22 60 60)"/>
                  <circle cx="60" cy="60" r="5" fill="#C5A065"/>
                </svg>
              </div>
              <div className="jc-body">
                <div className="jc-cat">Heritage</div>
                <div className="jc-title">The Rolex Submariner: 70 years of depth</div>
                <p className="jc-excerpt">How the world&apos;s most recognised watch became a cultural icon and a precision instrument.</p>
                <Link href="/journal/rolex-submariner-history" className="jc-link">
                  Read more <ArrowIcon />
                </Link>
              </div>
            </div>

            <div className="journal-card reveal d2">
              <div className="jc-img short" style={{ background: '#EEF0F5' }}>
                <svg width="90" height="70" viewBox="0 0 130 100" fill="none" opacity="0.55">
                  <circle cx="36" cy="50" r="30" stroke="#0A1F44" strokeWidth="1.5"/>
                  <circle cx="36" cy="50" r="20" fill="white" stroke="#C5A065" strokeWidth="0.8"/>
                  <circle cx="94" cy="50" r="30" stroke="#0A1F44" strokeWidth="1.5"/>
                  <circle cx="94" cy="50" r="20" fill="white" stroke="#C5A065" strokeWidth="0.8"/>
                  <rect x="34.5" y="34" width="3" height="18" rx="1.5" fill="#0A1F44" transform="rotate(-20 36 50)"/>
                  <rect x="35" y="28" width="2" height="24" rx="1" fill="#0A1F44" transform="rotate(30 36 50)"/>
                  <rect x="92.5" y="34" width="3" height="18" rx="1.5" fill="#0A1F44" transform="rotate(10 94 50)"/>
                  <rect x="93" y="28" width="2" height="24" rx="1" fill="#0A1F44" transform="rotate(-25 94 50)"/>
                </svg>
              </div>
              <div className="jc-body">
                <div className="jc-cat">Collecting</div>
                <div className="jc-title">Building your first collection on a budget</div>
                <p className="jc-excerpt">Where to start, what to prioritise, and how competitions can land you an iconic piece.</p>
                <Link href="/journal/first-watch-collection" className="jc-link">
                  Read more <ArrowIcon />
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
