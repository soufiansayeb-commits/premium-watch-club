import Image from 'next/image'
import Link from 'next/link'
import type { Competition } from '@/lib/competition-data'

interface Props {
  /** The Special competition users enter first (free entry route) — the unlock trigger. */
  special: Competition | null
  /** The active Weekly competition the 20% discount applies to — the reward. */
  weekly: Competition | null
}

function bestImage(c: Competition | null): string | null {
  if (!c) return null
  return c.galleryImages?.[0]?.src || c.heroImage || c.image || null
}

/**
 * Summer Sale offer section — a conversion-first promo block whose single job is
 * to drive the click into the Special Competition.
 *
 * The offer is the hero: enter the free Special Drop → unlock 20% off the Weekly
 * Competition (delivered as a code by email). The two-watch "unlock" visual makes
 * that cause→effect obvious.
 *
 * Fully backend-driven: special + weekly come from getAllActiveCompetitionsByType().
 * Watch images, titles and the CTA URL are dynamic — never hardcoded. If there is
 * no active Special competition the section hides itself (no broken CTA).
 */
export default function SummerSaleOffer({ special, weekly }: Props) {
  if (!special) return null

  const specialImg = bestImage(special)
  const weeklyImg  = bestImage(weekly)
  const href       = special.ctaLink || `/competitions/${special.slug}`
  const weeklyName = weekly?.title || 'this week’s Weekly Competition'

  return (
    <section className="sso" aria-label="Summer sale offer">
      <style suppressHydrationWarning>{`
        .sso {
          position: relative;
          overflow: hidden;
          color: #F5F1E8;
          padding: clamp(28px, 5vw, 56px) clamp(16px, 4vw, 56px) clamp(34px, 5vw, 60px);
          background:
            radial-gradient(130% 100% at 88% 0%, rgba(255,164,84,0.22) 0%, transparent 52%),
            radial-gradient(120% 110% at 6% 100%, rgba(197,160,101,0.14) 0%, transparent 56%),
            linear-gradient(158deg, #0A0E1A 0%, #11101A 46%, #1C1408 100%);
        }
        /* sun-flare top-right — the "summer" warmth */
        .sso::before {
          content: '';
          position: absolute; top: -160px; right: -120px;
          width: 520px; height: 520px; border-radius: 50%;
          background: radial-gradient(circle, rgba(255,176,84,0.40) 0%, rgba(232,128,31,0.12) 44%, transparent 70%);
          pointer-events: none;
        }
        .sso-wrap { position: relative; max-width: 1140px; margin: 0 auto; }

        /* ── Header: real wordmark + seasonal kicker ── */
        .sso-head {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; margin-bottom: clamp(20px, 3vw, 34px);
        }
        .sso-logo { width: auto; height: clamp(26px, 3vw, 34px); }
        .sso-kicker {
          display: inline-flex; align-items: center; gap: 8px;
          font-family: var(--font-sans);
          font-size: 10px; font-weight: 700; letter-spacing: 0.24em; text-transform: uppercase;
          color: #FFB454;
          border: 1px solid rgba(255,164,84,0.35);
          padding: 7px 14px; border-radius: 30px;
          white-space: nowrap;
        }
        .sso-kicker .dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #FFB454; box-shadow: 0 0 10px rgba(255,164,84,0.9);
        }

        /* ── Hero offer copy ── */
        .sso-hero { text-align: center; margin-bottom: clamp(26px, 4vw, 40px); }
        .sso-season {
          font-family: var(--font-sans);
          font-size: clamp(13px, 1.6vw, 16px); font-weight: 800;
          letter-spacing: 0.42em; text-transform: uppercase;
          color: rgba(245,241,232,0.78);
          margin-bottom: 10px; padding-left: 0.42em;
        }
        .sso-offer {
          font-family: var(--font-sans); font-weight: 800;
          line-height: 0.98; letter-spacing: -0.02em;
          font-size: clamp(40px, 7vw, 88px);
          margin: 0 auto 16px;
        }
        .sso-offer .amber {
          display: block;
          font-size: clamp(64px, 13vw, 150px);
          line-height: 0.9;
          background: linear-gradient(180deg, #FFD089 0%, #FFB454 40%, #E8801F 100%);
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; color: transparent;
          filter: drop-shadow(0 8px 30px rgba(232,128,31,0.35));
        }
        .sso-sub {
          font-size: clamp(14px, 1.5vw, 17px); line-height: 1.6;
          color: rgba(245,241,232,0.74);
          max-width: 560px; margin: 0 auto;
        }
        .sso-sub b { color: #FFB454; font-weight: 700; }

        /* ── Unlock stage: special → seal → weekly ── */
        .sso-stage {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: clamp(8px, 2vw, 28px);
          max-width: 760px; margin: 0 auto clamp(28px, 4vw, 40px);
        }
        .sso-watch { text-align: center; }
        .sso-disc {
          position: relative; width: 100%; aspect-ratio: 1/1; max-width: 240px; margin: 0 auto;
          display: flex; align-items: center; justify-content: center;
        }
        .sso-disc::before {
          content: ''; position: absolute; inset: 8%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,176,84,0.10) 42%, transparent 70%);
        }
        .sso-disc--weekly::after {
          content: ''; position: absolute; inset: 4%;
          border-radius: 50%; border: 1px solid rgba(255,164,84,0.35);
        }
        .sso-img { position: relative; width: 80%; height: 80%; }
        .sso-img :global(img) { object-fit: contain; filter: drop-shadow(0 18px 40px rgba(0,0,0,0.55)); }
        .sso-cap-step {
          display: block; font-family: var(--font-sans);
          font-size: 10px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase;
          color: #FFB454; margin-top: 6px;
        }
        .sso-cap-name {
          display: block; font-family: var(--font-serif); font-style: italic;
          font-size: clamp(12px, 1.4vw, 15px); color: rgba(245,241,232,0.82);
          margin-top: 2px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }

        /* Connector + 20% seal (the signature element) */
        .sso-connector {
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          position: relative;
        }
        .sso-seal {
          width: clamp(64px, 9vw, 98px); height: clamp(64px, 9vw, 98px);
          border-radius: 50%;
          background: radial-gradient(circle at 36% 30%, #FFC368, #E8801F 70%);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          color: #1A1208; box-shadow: 0 12px 30px rgba(232,128,31,0.45);
          border: 2px solid rgba(255,255,255,0.25);
        }
        .sso-seal b { font-family: var(--font-sans); font-weight: 800; font-size: clamp(20px,2.6vw,30px); line-height: 1; }
        .sso-seal i { font-style: normal; font-size: 9px; font-weight: 800; letter-spacing: 0.16em; }
        .sso-arrow { color: rgba(255,164,84,0.55); }

        /* ── CTA ── */
        .sso-cta-row { text-align: center; margin-bottom: clamp(26px, 4vw, 38px); }
        .sso-cta {
          display: inline-flex; align-items: center; justify-content: center; gap: 12px;
          font-family: var(--font-sans); font-size: clamp(14px, 1.5vw, 16px); font-weight: 800;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: #1A1208;
          background: linear-gradient(180deg, #FFC368 0%, #F2A03D 50%, #E8801F 100%);
          padding: 18px clamp(26px, 4vw, 44px); border-radius: 7px;
          box-shadow: 0 14px 36px rgba(232,128,31,0.42);
          transition: transform 0.16s ease, box-shadow 0.2s ease;
        }
        .sso-cta:hover { transform: translateY(-2px); box-shadow: 0 18px 44px rgba(232,128,31,0.55); }
        .sso-cta:focus-visible { outline: 3px solid #FFD089; outline-offset: 3px; }
        .sso-cta svg { flex-shrink: 0; }
        .sso-trust {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
          color: rgba(245,241,232,0.55); margin-top: 14px;
        }

        /* ── 3-step mechanic (carries the email-code message) ── */
        .sso-steps {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: clamp(10px, 2vw, 22px);
          max-width: 880px; margin: 0 auto; padding: 0;
          list-style: none;
          border-top: 1px solid rgba(255,255,255,0.08); padding-top: clamp(20px, 3vw, 28px);
        }
        .sso-step { display: flex; align-items: flex-start; gap: 12px; text-align: left; }
        .sso-step-n {
          flex-shrink: 0;
          width: 26px; height: 26px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-sans); font-weight: 800; font-size: 12px;
          color: #FFB454; border: 1px solid rgba(255,164,84,0.5);
        }
        .sso-step b { display: block; font-size: 13px; font-weight: 700; color: #F5F1E8; line-height: 1.3; }
        .sso-step span { display: block; font-size: 12px; color: rgba(245,241,232,0.6); line-height: 1.45; margin-top: 2px; }

        /* ═══════════ MOBILE — rebuilt, not shrunk ═══════════ */
        @media (max-width: 720px) {
          .sso-head { justify-content: center; flex-direction: column; gap: 12px; }
          .sso-logo { height: 30px; }
          .sso-offer { font-size: clamp(30px, 9vw, 40px); }
          .sso-offer .amber { font-size: clamp(72px, 26vw, 110px); }
          .sso-sub { font-size: 14px; }
          /* keep the unlock mechanic visible but compact, side by side */
          .sso-stage { grid-template-columns: 1fr auto 1fr; gap: 6px; max-width: 420px; }
          .sso-disc { max-width: 130px; }
          .sso-seal { width: 58px; height: 58px; }
          .sso-arrow { display: none; }
          .sso-cap-name { font-size: 11px; }
          .sso-cta { width: 100%; max-width: 420px; }
          /* steps become tight stacked rows */
          .sso-steps { grid-template-columns: 1fr; gap: 12px; max-width: 420px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .sso-cta { transition: none; }
        }
      `}</style>

      <div className="sso-wrap">

        {/* Header — real PWC wordmark + seasonal kicker */}
        <div className="sso-head">
          <Image
            src="/brand-assets/pwc-logo-wordmark-gold.png"
            alt="Premium Watch Club"
            width={1447}
            height={341}
            className="sso-logo"
            priority={false}
          />
          <span className="sso-kicker"><span className="dot" aria-hidden="true" />Summer offer · Limited time</span>
        </div>

        {/* Hero — the offer is the hero */}
        <div className="sso-hero">
          <p className="sso-season">Summer Sale</p>
          <h2 className="sso-offer">
            Unlock<span className="amber">20% off</span>the Weekly Competition
          </h2>
          <p className="sso-sub">
            Enter the free {special.title} draw for your chance to win, then{' '}
            <b>we email your 20% code</b> for {weeklyName}.
          </p>
        </div>

        {/* Unlock stage — special → 20% seal → weekly */}
        <div className="sso-stage">
          <figure className="sso-watch">
            <div className="sso-disc">
              <div className="sso-img">
                {specialImg && (
                  <Image src={specialImg} alt={special.title} fill sizes="(max-width:720px) 130px, 240px" />
                )}
              </div>
            </div>
            <figcaption>
              <span className="sso-cap-step">Step 1 · Enter free</span>
              <span className="sso-cap-name">{special.title}</span>
            </figcaption>
          </figure>

          <div className="sso-connector" aria-hidden="true">
            <span className="sso-seal"><b>20%</b><i>OFF</i></span>
            <svg className="sso-arrow" width="34" height="14" viewBox="0 0 34 14" fill="none">
              <path d="M1 7h30m0 0l-6-5m6 5l-6 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <figure className="sso-watch">
            <div className="sso-disc sso-disc--weekly">
              <div className="sso-img">
                {weeklyImg && (
                  <Image src={weeklyImg} alt={weekly?.title ?? 'Weekly competition'} fill sizes="(max-width:720px) 130px, 240px" />
                )}
              </div>
            </div>
            <figcaption>
              <span className="sso-cap-step">Your reward · 20% off</span>
              <span className="sso-cap-name">{weekly?.title ?? 'Weekly Competition'}</span>
            </figcaption>
          </figure>
        </div>

        {/* CTA — single primary action → Special Competition page */}
        <div className="sso-cta-row">
          <Link href={href} className="sso-cta">
            Enter the Special Competition
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <p className="sso-trust">Free to enter · No purchase necessary · 18+</p>
        </div>

        {/* 3-step mechanic — communicates the email-code flow without clutter */}
        <ol className="sso-steps">
          <li className="sso-step">
            <span className="sso-step-n">1</span>
            <div><b>Enter the Special Drop</b><span>Free entry route. One skill question for your chance to win.</span></div>
          </li>
          <li className="sso-step">
            <span className="sso-step-n">2</span>
            <div><b>Get your 20% code by email</b><span>We send your discount code straight to your inbox.</span></div>
          </li>
          <li className="sso-step">
            <span className="sso-step-n">3</span>
            <div><b>Save 20% on the Weekly</b><span>Redeem it at checkout on this week&rsquo;s featured watch.</span></div>
          </li>
        </ol>

      </div>
    </section>
  )
}
