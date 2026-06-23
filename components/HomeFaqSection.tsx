// HomeFaqSection.tsx — compact homepage variant of the FAQ.
// Editorial two-column layout: heading sits to the left, the questions run in
// two columns on the right to keep the section short. Reuses the shared faq
// data. No Support Centre hero, no support CTA.

import HomeFaqAccordion from '@/components/HomeFaqAccordion'
import { faqs } from '@/lib/faq-data'

export default function HomeFaqSection() {
  return (
    <section className="home-faq" id="faq" aria-labelledby="home-faq-title">
      <div className="home-faq-inner">
        <div className="home-faq-grid">

          <header className="home-faq-head">
            <span className="home-faq-eyebrow">✦ Good to know</span>
            <h2 className="home-faq-title" id="home-faq-title">Questions,<br/>answered</h2>
            <p className="home-faq-sub">
              Everything worth knowing before you enter — clear and on the record.
            </p>
          </header>

          <HomeFaqAccordion items={faqs} />

        </div>
      </div>

      <style>{`
        .home-faq {
          background: var(--bg-off-white);
          border-top: 1px solid var(--border-light);
          padding: 74px 0 82px;
        }
        .home-faq-inner {
          max-width: 1080px;
          margin: 0 auto;
          padding: 0 40px;
        }
        .home-faq-grid {
          display: grid;
          grid-template-columns: 0.82fr 1.6fr;
          gap: 56px;
          align-items: start;
        }

        /* ── Left heading ── */
        .home-faq-head {
          position: sticky;
          top: 100px;
        }
        .home-faq-eyebrow {
          display: inline-block;
          font-family: var(--font-sans);
          font-size: 11px; font-weight: 600; letter-spacing: .2em;
          text-transform: uppercase; color: var(--gold-dark);
          margin-bottom: 16px;
        }
        .home-faq-title {
          font-family: var(--font-serif);
          font-size: clamp(30px, 3.4vw, 44px);
          font-weight: 700; line-height: 1.04; letter-spacing: -.01em;
          color: var(--navy); margin: 0 0 18px;
        }
        .home-faq-sub {
          font-family: var(--font-sans);
          font-size: 13.5px; font-weight: 400; line-height: 1.7;
          color: var(--text-mid); margin: 0; max-width: 260px;
        }

        /* ── Two-column accordion ── */
        .home-faq-cols {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0 36px;
          border-top: 1px solid var(--border-light);
        }
        .home-faq-col { display: flex; flex-direction: column; }

        /* compact the shared accordion styling for the homepage */
        .home-faq .faq-trigger { padding: 18px 0; gap: 14px; }
        .home-faq .faq-trigger-q { font-size: 14.5px; }
        .home-faq .faq-trigger-icon { width: 26px; height: 26px; }
        .home-faq .faq-answer-text {
          font-size: 13px; line-height: 1.72; padding: 0 0 20px 14px;
        }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .home-faq-grid { grid-template-columns: 1fr; gap: 30px; }
          .home-faq-head { position: static; text-align: center; }
          .home-faq-title br { display: none; }
          .home-faq-sub { max-width: none; }
        }
        @media (max-width: 620px) {
          .home-faq { padding: 56px 0 60px; }
          .home-faq-inner { padding: 0 20px; }
          .home-faq-cols { grid-template-columns: 1fr; gap: 0; }
        }
      `}</style>
    </section>
  )
}
