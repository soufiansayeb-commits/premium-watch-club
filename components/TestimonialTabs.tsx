'use client'

// TestimonialTabs.tsx — Grüns-style tabbed proof section, adapted for PWC.
// Soft sage/mint background, navy + gold brand accents, pill tabs that swap
// three testimonials with a smooth staggered fade. No card boxes — open
// editorial layout sitting directly on the mint, exactly like the reference.

import { useState } from 'react'

// ── Data ─────────────────────────────────────────────────────────────────────

type Review = { headline: string; body: string; name: string }
type Tab = { label: string; reviews: [Review, Review, Review] }

const TABS: Tab[] = [
  {
    label: 'Transparency',
    reviews: [
      {
        headline: 'Everything felt clear from the start.',
        body: 'The process was easy to understand and nothing felt hidden. I could see exactly how it worked, which made entering feel much more legitimate.',
        name: 'Daniel R.',
      },
      {
        headline: 'A much more transparent experience than most sites.',
        body: 'From the competition details to the way winners are shown, everything felt open and properly presented. That gave me confidence straight away.',
        name: 'Michael T.',
      },
      {
        headline: 'You can actually follow what’s going on.',
        body: 'What stood out to me most was how clearly Premium Watch Club explains each draw. It feels more honest and far more serious than typical raffle sites.',
        name: 'Oliver S.',
      },
    ],
  },
  {
    label: 'Odds',
    reviews: [
      {
        headline: 'The odds felt genuinely worth it.',
        body: 'I liked that the drops felt limited and more selective. It didn’t feel like I was throwing money into a massive entry pool with no realistic chance.',
        name: 'James P.',
      },
      {
        headline: 'Better value than the usual competition sites.',
        body: 'The entry structure felt much fairer than what I’ve seen elsewhere. Premium Watch Club feels more considered and less volume-driven.',
        name: 'Ryan L.',
      },
      {
        headline: 'You can tell the odds are part of the appeal.',
        body: 'One of the biggest reasons I entered was that the setup felt more balanced. It gave me far more confidence than generic high-volume draw sites.',
        name: 'Ethan W.',
      },
    ],
  },
  {
    label: 'Trust',
    reviews: [
      {
        headline: 'It actually feels credible.',
        body: 'There’s a big difference between a site looking premium and a site feeling trustworthy. Premium Watch Club manages to do both really well.',
        name: 'Matthew C.',
      },
      {
        headline: 'A trustworthy brand in a space that needs it.',
        body: 'This space can feel noisy and questionable, but Premium Watch Club came across as clean, serious and well put together. It felt like a brand I could trust.',
        name: 'Chris H.',
      },
      {
        headline: 'The professionalism stands out.',
        body: 'From the design to the communication and proof, everything felt properly handled. It gives a level of reassurance that most competitors don’t.',
        name: 'Ben K.',
      },
    ],
  },
  {
    label: 'Winners',
    reviews: [
      {
        headline: 'Seeing real winners makes a huge difference.',
        body: 'What gave me confidence was seeing actual winners and past results. It makes the whole concept feel far more real and believable.',
        name: 'Luke A.',
      },
      {
        headline: 'The winner proof is strong.',
        body: 'I liked that Premium Watch Club puts proper focus on past winners. That kind of proof is exactly what makes people feel comfortable entering.',
        name: 'Nathan J.',
      },
      {
        headline: 'The social proof is there.',
        body: 'When you can see that real people have already won, it changes everything. It stops feeling like hype and starts feeling like a legitimate opportunity.',
        name: 'Adam F.',
      },
    ],
  },
  {
    label: 'Experience',
    reviews: [
      {
        headline: 'The whole experience felt premium.',
        body: 'The website, the competition flow and the overall presentation all felt elevated. It felt more like a premium brand than a typical competition platform.',
        name: 'Patrick M.',
      },
      {
        headline: 'Smooth, polished and easy to use.',
        body: 'Everything from browsing the competitions to entering felt seamless. It’s one of the cleanest experiences I’ve had in this category.',
        name: 'George N.',
      },
      {
        headline: 'A genuinely enjoyable user experience.',
        body: 'It feels modern, premium and easy to navigate. The whole experience is far more refined than most competition websites.',
        name: 'Henry D.',
      },
    ],
  },
  {
    label: 'Simplicity',
    reviews: [
      {
        headline: 'Simple in the best way.',
        body: 'There wasn’t any unnecessary clutter. It was easy to understand the drop, the process and what I needed to do.',
        name: 'Lewis B.',
      },
      {
        headline: 'Clean and straightforward.',
        body: 'I appreciated how easy everything was to follow. Premium Watch Club keeps it simple without making it feel basic.',
        name: 'Samuel G.',
      },
      {
        headline: 'No confusion, just a clear process.',
        body: 'The site makes entering feel easy and well structured. That simplicity is a big part of why the brand feels trustworthy.',
        name: 'Jacob E.',
      },
    ],
  },
]

// ── Bits ──────────────────────────────────────────────────────────────────────

function Stars({ className }: { className?: string }) {
  return (
    <span className={`tt-stars ${className ?? ''}`} aria-label="5 out of 5 stars">
      {'★★★★★'}
    </span>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TestimonialTabs() {
  const [active, setActive] = useState(0)
  const reviews = TABS[active].reviews

  return (
    <section className="tt-s" aria-labelledby="tt-heading">
      <div className="tt-w">

        {/* ── Header ── */}
        <div className="tt-rating">
          <Stars className="tt-rating-stars" />
          <span className="tt-rating-num">4.8 stars</span>
        </div>
        <h2 className="tt-h2" id="tt-heading">What our winners say</h2>

        {/* ── Tabs ── */}
        <div className="tt-tabs" role="tablist" aria-label="Testimonial topics">
          {TABS.map((tab, i) => (
            <button
              key={tab.label}
              role="tab"
              aria-selected={active === i}
              className={`tt-tab${active === i ? ' is-active' : ''}`}
              onClick={() => setActive(i)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Testimonials ── */}
        <div className="tt-grid" key={active}>
          {reviews.map((r, i) => (
            <article className="tt-card" style={{ animationDelay: `${i * 90}ms` }} key={r.name}>
              <Stars />
              <h3 className="tt-card-h">{r.headline}</h3>
              <p className="tt-card-body">{r.body}</p>
              <p className="tt-card-name">{r.name}</p>
            </article>
          ))}
        </div>

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Jost:wght@300;400;500;600;700&display=swap');

        .tt-s {
          /* soft sage/mint — Grüns family, muted for a premium PWC feel */
          background: #E7EEE8;
          background-image: radial-gradient(rgba(10,31,68,.035) 1px, transparent 1px);
          background-size: 26px 26px;
          padding: 88px 28px 92px;
        }
        .tt-w { max-width: 1100px; margin: 0 auto; }

        /* ── Header ── */
        .tt-eyebrow {
          font-family: 'Jost', sans-serif;
          font-size: 10px; font-weight: 600; letter-spacing: .24em;
          text-transform: uppercase; color: #0A1F44;
          text-align: center; margin: 0 0 16px;
        }
        .tt-rating {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          margin: 0 0 8px;
        }
        .tt-stars {
          color: #00844F; letter-spacing: 1px; font-size: 20px; line-height: 1;
        }
        .tt-rating-stars { font-size: 23px; }
        .tt-rating-num {
          font-family: 'Jost', sans-serif;
          font-size: 14px; font-weight: 500; letter-spacing: .01em;
          color: rgba(10,31,68,.7);
        }
        .tt-h2 {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(30px, 4.4vw, 50px);
          font-weight: 700; line-height: 1.06; letter-spacing: -.015em;
          color: #0A1F44; text-align: center;
          max-width: 820px; margin: 0 auto 32px;
        }
        .tt-h2-accent { color: #00B67A; font-style: italic; }

        /* ── Tabs ── */
        .tt-tabs {
          display: flex; flex-wrap: nowrap;
          gap: 10px; margin: 0 0 32px;
          width: 100%;
        }
        .tt-tab {
          font-family: 'Jost', sans-serif;
          font-size: 13px; font-weight: 700; letter-spacing: .01em;
          color: #0A1F44; background: transparent;
          border: 1.5px solid rgba(10,31,68,.22);
          border-radius: 999px; padding: 13px 16px;
          cursor: pointer; white-space: nowrap;
          flex: 1; text-align: center;
          transition: all .26s cubic-bezier(.22,1,.36,1);
        }
        .tt-tab:hover {
          border-color: #00844F; color: #00844F;
          background: rgba(0,132,79,.07);
          transform: translateY(-1px);
        }
        .tt-tab.is-active {
          background: #00844F; color: #ffffff;
          border-color: #00844F;
          box-shadow: 0 8px 22px rgba(0,132,79,.28);
        }
        .tt-tab.is-active:hover { color: #d4f5e6; transform: translateY(-1px); }

        /* ── Testimonials ── */
        .tt-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 40px 44px;
        }
        @keyframes ttIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .tt-card {
          text-align: center;
          animation: ttIn .5s cubic-bezier(.22,1,.36,1) both;
          padding: 0 6px;
        }
        .tt-card .tt-stars { font-size: 13px; display: inline-block; margin-bottom: 16px; }
        .tt-card-h {
          font-family: 'Jost', sans-serif;
          font-size: 16.5px; font-weight: 600; line-height: 1.34;
          color: #0A1F44; margin: 0 0 14px; letter-spacing: -.005em;
        }
        .tt-card-body {
          font-family: 'Jost', sans-serif;
          font-size: 13.5px; font-weight: 300; line-height: 1.72;
          color: rgba(10,31,68,.66); margin: 0 0 18px;
        }
        .tt-card-name {
          font-family: 'Jost', sans-serif;
          font-size: 12.5px; font-weight: 600; letter-spacing: .02em;
          color: #0A1F44; margin: 0; position: relative;
          display: inline-block; padding-top: 14px;
        }
        .tt-card-name::before {
          content: ''; position: absolute; top: 0; left: 50%;
          transform: translateX(-50%);
          width: 22px; height: 1.5px; background: #00B67A; opacity: .65;
        }

        /* ── Responsive ── */
        @media (max-width: 860px) {
          .tt-grid { gap: 36px 32px; }
          .tt-tabs {
            overflow-x: auto; -webkit-overflow-scrolling: touch;
            padding-bottom: 6px; margin-bottom: 40px;
            scrollbar-width: none;
          }
          .tt-tabs::-webkit-scrollbar { display: none; }
          .tt-tab { flex: 0 0 auto; }
        }
        @media (max-width: 720px) {
          .tt-grid { grid-template-columns: 1fr; gap: 40px; max-width: 440px; margin: 0 auto; }
          .tt-card { padding: 0; }
        }
        @media (max-width: 480px) {
          .tt-s { padding: 64px 16px 72px; }
        }
      `}</style>
    </section>
  )
}
