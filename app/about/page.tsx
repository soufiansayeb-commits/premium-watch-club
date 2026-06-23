import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'About Us — Premium Watch Club',
  description: 'Premium Watch Club is a premium watch competition platform built on curated drops, skill-based entry, transparent mechanics and verified winners.',
}

const VALUES: { title: string; body: string }[] = [
  { title: 'Trust', body: 'Clear mechanics, public draws and nothing hidden — the way it should be.' },
  { title: 'Curation', body: 'Watches only, selected with intent. No clutter, no filler prizes.' },
  { title: 'Fairness', body: 'Limited, skill-based entry pools — not high-volume raffles.' },
  { title: 'Winner proof', body: 'Real winners, archived and verifiable. Proof over promises.' },
  { title: 'Luxury culture', body: 'Built for people who genuinely care about fine watchmaking.' },
]

export default function AboutPage() {
  return (
    <>
      <Header />

      <main className="about-page">
        {/* ── Hero ── */}
        <section className="about-hero">
          <div className="about-wrap">
            <p className="about-eyebrow">
              <span className="about-eyebrow-line" />
              About Premium Watch Club
            </p>
            <h1 className="about-title">Built for watch enthusiasts who value transparency</h1>
            <p className="about-intro">
              Premium Watch Club is a premium watch competition platform built around curated drops,
              skill-based entry and mechanics you can actually follow. We exist to make winning a fine
              watch feel legitimate, fair and genuinely premium — from the first click to the live draw.
            </p>
          </div>
        </section>

        {/* ── Body ── */}
        <div className="about-body">
          <div className="about-wrap">

            <section className="about-section">
              <span className="about-kicker">✦ Our thesis</span>
              <h2 className="about-h2">A better way to compete for premium watches</h2>
              <p className="about-p">
                Most competition sites optimise for volume — huge entry pools, unclear odds and prizes
                that change by the day. We took the opposite view. Premium Watch Club is built on smaller,
                deliberate drops, transparent skill-based entry and a single category we truly care about:
                watches. Fewer entries, clearer logic, a more serious experience.
              </p>
            </section>

            <section className="about-section">
              <span className="about-kicker">✦ What we stand for</span>
              <div className="about-values">
                {VALUES.map((v) => (
                  <div className="about-value" key={v.title}>
                    <h3 className="about-value-title">{v.title}</h3>
                    <p className="about-value-body">{v.body}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="about-section">
              <span className="about-kicker">✦ Why we built PWC</span>
              <h2 className="about-h2">Trust is the product</h2>
              <p className="about-p">
                We built Premium Watch Club because the space needed something cleaner. A platform where
                the odds make sense, the winners are real and the brand feels worthy of the watches it
                gives away. This is the foundation. More of our story, our standards and the people behind
                the club is coming soon.
              </p>
            </section>

          </div>
        </div>
      </main>

      <Footer />

      <style>{`
        .about-page { background: var(--bg-cream); }

        .about-wrap { max-width: 880px; margin: 0 auto; padding: 0 28px; }

        /* Hero */
        .about-hero {
          background:
            radial-gradient(120% 90% at 18% 0%, #0d2552 0%, transparent 58%),
            var(--navy);
          padding: 100px 0 88px;
        }
        .about-eyebrow {
          display: flex; align-items: center; gap: 12px;
          font-family: var(--font-sans);
          font-size: 11px; font-weight: 600; letter-spacing: .22em;
          text-transform: uppercase; color: var(--gold);
          margin: 0 0 24px;
        }
        .about-eyebrow-line { width: 34px; height: 1px; background: var(--gold); opacity: .6; }
        .about-title {
          font-family: var(--font-serif);
          font-size: clamp(36px, 5.2vw, 60px);
          font-weight: 700; line-height: 1.06; letter-spacing: -.015em;
          color: var(--text-on-dark); margin: 0 0 26px; max-width: 720px;
        }
        .about-intro {
          font-family: var(--font-sans);
          font-size: 15px; line-height: 1.85; font-weight: 300;
          color: rgba(245,244,240,0.62); margin: 0; max-width: 620px;
        }

        /* Body */
        .about-body { padding: 78px 0 92px; }
        .about-section { margin-bottom: 64px; }
        .about-section:last-child { margin-bottom: 0; }
        .about-kicker {
          display: inline-block;
          font-family: var(--font-sans);
          font-size: 10px; font-weight: 600; letter-spacing: .2em;
          text-transform: uppercase; color: var(--gold-dark);
          margin-bottom: 16px;
        }
        .about-h2 {
          font-family: var(--font-serif);
          font-size: clamp(26px, 3.4vw, 38px);
          font-weight: 700; line-height: 1.12; letter-spacing: -.01em;
          color: var(--navy); margin: 0 0 18px; max-width: 640px;
        }
        .about-p {
          font-family: var(--font-sans);
          font-size: 15px; line-height: 1.88; font-weight: 400;
          color: var(--text-mid); margin: 0; max-width: 640px;
        }

        /* Values grid */
        .about-values {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 1px; background: var(--border-light);
          border: 1px solid var(--border-light); border-radius: 10px; overflow: hidden;
          margin-top: 6px;
        }
        .about-value { background: var(--bg-off-white); padding: 26px 24px; }
        .about-value-title {
          font-family: var(--font-serif);
          font-size: 18px; font-weight: 700; color: var(--navy);
          margin: 0 0 8px; position: relative; padding-left: 14px;
        }
        .about-value-title::before {
          content: ''; position: absolute; left: 0; top: 7px;
          width: 4px; height: 14px; border-radius: 2px; background: var(--gold);
        }
        .about-value-body {
          font-family: var(--font-sans);
          font-size: 13px; line-height: 1.7; color: var(--text-mid); margin: 0;
        }

        @media (max-width: 760px) {
          .about-hero { padding: 76px 0 64px; }
          .about-body { padding: 56px 0 68px; }
          .about-section { margin-bottom: 48px; }
          .about-values { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 480px) {
          .about-values { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  )
}
