import Image from 'next/image'
import Link from 'next/link'
import type { Competition } from '@/lib/competition-data'
import type { ActiveOffer } from '@/lib/offer'

interface Props {
  offer: ActiveOffer | null
  /** Live Special competition — image + CTA fallback when ACF product/link is empty. */
  special: Competition | null
  /** Live Weekly competition — image fallback + reward label. */
  weekly: Competition | null
  /** Pre-resolved CTA target (shared with the offer bar). */
  ctaHref: string
}

function bestImage(c: Competition | null): string | null {
  if (!c) return null
  return c.galleryImages?.[0]?.src || c.heroImage || c.image || null
}

// Safe PWC defaults — used whenever an ACF colour field is empty.
const DEFAULTS = {
  primary:    '#C5A065', // gold — main accents
  secondary:  '#E8D5B0', // light gold — glow / hover accent
  background: '#0A0E1A', // dark luxury — section background
  text:       '#F5F1E8', // off-white — readable body text
}

/**
 * Reusable premium offer template — content and colours are 100% ACF-driven so
 * the same layout serves Summer Sale, Black Friday, Christmas or any future
 * campaign without a code change. Renders nothing when no offer is active.
 *
 * Layout: compact two-column on desktop (copy + CTA on the left, the
 * "unlock" visual on the right) so the section stays tight and balanced.
 * Mobile is rebuilt (not shrunk) into a single bold column whose reading order
 * is the conversion path: offer → the Special is the action → entering unlocks
 * the Weekly discount → the CTA is the next step.
 */
export default function OfferSection({ offer, special, weekly, ctaHref }: Props) {
  if (!offer) return null

  const primary    = offer.colors.primary    || DEFAULTS.primary
  const secondary  = offer.colors.secondary  || DEFAULTS.secondary
  const background  = offer.colors.background || DEFAULTS.background
  const text       = offer.colors.text       || DEFAULTS.text

  const specialImg = offer.special_product_image || bestImage(special)
  const weeklyImg  = offer.weekly_product_image  || bestImage(weekly)
  const weeklyName = weekly?.title || 'the Weekly Competition'

  const discount   = offer.discount_percentage != null && offer.discount_percentage > 0
    ? offer.discount_percentage
    : null
  const ctaText    = offer.cta_text || 'Enter the Special Competition'

  const styleVars = {
    '--op': primary,
    '--os': secondary,
    '--obg': background,
    '--otx': text,
  } as React.CSSProperties

  return (
    <section
      className="offer"
      aria-label={offer.headline || 'Special offer'}
      style={styleVars}
    >
      <style suppressHydrationWarning>{`
        .offer {
          position: relative;
          overflow: hidden;
          color: var(--otx);
          padding: clamp(30px, 4vw, 52px) clamp(16px, 4vw, 56px);
          background:
            radial-gradient(120% 120% at 88% 0%, color-mix(in srgb, var(--op) 22%, transparent) 0%, transparent 55%),
            radial-gradient(120% 120% at 4% 100%, color-mix(in srgb, var(--os) 14%, transparent) 0%, transparent 58%),
            var(--obg);
        }
        ${offer.background_image ? `
        .offer::after {
          content: ''; position: absolute; inset: 0; z-index: 0;
          background: url('${offer.background_image}') center/cover no-repeat;
          opacity: 0.16;
          pointer-events: none;
        }` : ''}
        .offer-glow {
          position: absolute; top: -160px; right: -120px; z-index: 0;
          width: 480px; height: 480px; border-radius: 50%;
          background: radial-gradient(circle, color-mix(in srgb, var(--op) 40%, transparent) 0%, transparent 68%);
          pointer-events: none;
        }
        .offer-wrap {
          position: relative; z-index: 1;
          max-width: 1120px; margin: 0 auto;
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          align-items: center;
          gap: clamp(24px, 4vw, 56px);
        }

        /* ── Copy column ── */
        .offer-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          font-family: var(--font-sans);
          font-size: 10px; font-weight: 700; letter-spacing: 0.24em; text-transform: uppercase;
          color: var(--op);
          border: 1px solid color-mix(in srgb, var(--op) 40%, transparent);
          padding: 6px 13px; border-radius: 30px; margin-bottom: 18px;
        }
        .offer-eyebrow .dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--op); box-shadow: 0 0 10px color-mix(in srgb, var(--op) 90%, transparent);
        }
        .offer-headline {
          font-family: var(--font-sans); font-weight: 800;
          font-size: clamp(26px, 3.4vw, 40px); line-height: 1.04; letter-spacing: -0.015em;
          margin: 0;
        }
        .offer-highlight {
          display: block;
          font-family: var(--font-sans); font-weight: 800;
          font-size: clamp(48px, 8vw, 92px); line-height: 0.92; letter-spacing: -0.02em;
          margin: 4px 0 10px;
          background: linear-gradient(180deg,
            color-mix(in srgb, var(--os) 85%, #fff 15%) 0%,
            var(--op) 55%,
            color-mix(in srgb, var(--op) 80%, #000 20%) 100%);
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; color: transparent;
          filter: drop-shadow(0 8px 26px color-mix(in srgb, var(--op) 34%, transparent));
        }
        .offer-sub {
          font-family: var(--font-sans);
          font-size: clamp(15px, 1.7vw, 19px); font-weight: 600; line-height: 1.4;
          color: var(--otx); margin: 0 0 14px;
        }
        .offer-body {
          font-size: clamp(13px, 1.4vw, 15px); line-height: 1.6;
          color: color-mix(in srgb, var(--otx) 74%, transparent);
          max-width: 460px; margin: 0 0 22px;
        }

        /* ── CTA ── */
        .offer-cta {
          display: inline-flex; align-items: center; justify-content: center; gap: 11px;
          font-family: var(--font-sans); font-size: clamp(14px, 1.5vw, 16px); font-weight: 800;
          letter-spacing: 0.06em; text-transform: uppercase;
          color: color-mix(in srgb, var(--obg) 88%, #000 12%);
          background: linear-gradient(180deg,
            color-mix(in srgb, var(--os) 60%, var(--op) 40%) 0%,
            var(--op) 55%,
            color-mix(in srgb, var(--op) 82%, #000 18%) 100%);
          padding: 16px clamp(24px, 3vw, 38px); border-radius: 7px;
          box-shadow: 0 14px 34px color-mix(in srgb, var(--op) 38%, transparent);
          transition: transform 0.16s ease, box-shadow 0.2s ease;
        }
        .offer-cta:hover { transform: translateY(-2px); box-shadow: 0 18px 42px color-mix(in srgb, var(--op) 52%, transparent); }
        .offer-cta:focus-visible { outline: 3px solid var(--os); outline-offset: 3px; }

        /* ── Benefits ── */
        .offer-benefits {
          display: flex; flex-wrap: wrap; gap: 8px 10px;
          list-style: none; padding: 0; margin: 20px 0 0;
        }
        .offer-benefit {
          display: inline-flex; align-items: center; gap: 7px;
          font-family: var(--font-sans); font-size: 12px; font-weight: 600;
          color: color-mix(in srgb, var(--otx) 82%, transparent);
          border: 1px solid color-mix(in srgb, var(--otx) 14%, transparent);
          padding: 6px 12px; border-radius: 30px;
        }
        .offer-benefit svg { color: var(--op); flex-shrink: 0; }

        /* ── Unlock visual column ── */
        .offer-stage {
          position: relative;
          display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
          gap: clamp(8px, 2vw, 20px);
          padding: clamp(18px, 2.6vw, 30px);
          border-radius: 18px;
          background: color-mix(in srgb, var(--otx) 4%, transparent);
          border: 1px solid color-mix(in srgb, var(--otx) 10%, transparent);
        }
        .offer-watch { text-align: center; min-width: 0; }
        .offer-disc {
          position: relative; width: 100%; aspect-ratio: 1/1; max-width: 190px; margin: 0 auto;
          display: flex; align-items: center; justify-content: center;
        }
        .offer-disc::before {
          content: ''; position: absolute; inset: 6%; border-radius: 50%;
          background: radial-gradient(circle, color-mix(in srgb, var(--os) 16%, transparent) 0%, transparent 70%);
        }
        .offer-disc--reward::after {
          content: ''; position: absolute; inset: 3%; border-radius: 50%;
          border: 1px solid color-mix(in srgb, var(--op) 38%, transparent);
        }
        .offer-img { position: relative; width: 82%; height: 82%; }
        .offer-img :global(img) { object-fit: contain; filter: drop-shadow(0 16px 34px rgba(0,0,0,0.5)); }
        .offer-step {
          display: block; font-family: var(--font-sans);
          font-size: 9px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--op); margin-top: 8px;
        }
        .offer-name {
          display: block; font-family: var(--font-serif); font-style: italic;
          font-size: clamp(11px, 1.3vw, 14px); color: color-mix(in srgb, var(--otx) 84%, transparent);
          margin-top: 2px; line-height: 1.3; overflow-wrap: break-word;
        }
        .offer-seal {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          width: clamp(58px, 8vw, 86px); height: clamp(58px, 8vw, 86px); border-radius: 50%;
          background: radial-gradient(circle at 36% 30%, color-mix(in srgb, var(--os) 70%, #fff 30%), var(--op) 72%);
          color: color-mix(in srgb, var(--obg) 88%, #000 12%);
          box-shadow: 0 12px 28px color-mix(in srgb, var(--op) 44%, transparent);
          border: 2px solid color-mix(in srgb, #fff 25%, transparent);
        }
        .offer-seal b { font-family: var(--font-sans); font-weight: 800; font-size: clamp(18px, 2.4vw, 26px); line-height: 1; }
        .offer-seal i { font-style: normal; font-size: 8px; font-weight: 800; letter-spacing: 0.16em; }
        .offer-connect {
          display: flex; align-items: center; justify-content: center;
          color: color-mix(in srgb, var(--op) 55%, transparent);
        }

        /* ═══════════ MOBILE — rebuilt, conversion-ordered ═══════════ */
        @media (max-width: 860px) {
          .offer-wrap { grid-template-columns: 1fr; gap: clamp(22px, 6vw, 30px); text-align: center; }
          .offer-copy { display: contents; }
          /* Reading order: eyebrow → headline → highlight → sub → VISUAL → body → CTA → benefits */
          .offer-eyebrow { order: 1; margin: 0 auto 14px; }
          .offer-head-group { order: 2; }
          .offer-stage { order: 3; max-width: 440px; margin: 4px auto 0; }
          .offer-body { order: 4; margin: 0 auto; }
          .offer-cta-wrap { order: 5; }
          .offer-benefits { order: 6; justify-content: center; margin: 4px auto 0; }
          .offer-cta { width: 100%; max-width: 440px; }
          .offer-disc { max-width: 140px; }
        }
        @media (max-width: 400px) {
          .offer-stage { gap: 4px; padding: 16px 10px; }
          .offer-connect svg { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .offer-cta { transition: none; }
        }
      `}</style>

      <span className="offer-glow" aria-hidden="true" />

      <div className="offer-wrap">

        {/* ── Copy column ── */}
        <div className="offer-copy">
          {offer.eyebrow && (
            <span className="offer-eyebrow"><span className="dot" aria-hidden="true" />{offer.eyebrow}</span>
          )}

          <div className="offer-head-group">
            {offer.headline && (
              <h2 className="offer-headline">
                {offer.headline}
                {offer.highlight && <span className="offer-highlight">{offer.highlight}</span>}
              </h2>
            )}
            {!offer.headline && offer.highlight && (
              <h2 className="offer-headline"><span className="offer-highlight">{offer.highlight}</span></h2>
            )}
            {offer.subheadline && <p className="offer-sub">{offer.subheadline}</p>}
          </div>

          {offer.body_copy && <p className="offer-body">{offer.body_copy}</p>}

          <div className="offer-cta-wrap">
            <Link href={ctaHref} className="offer-cta">
              {ctaText}
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>

          {offer.benefits.length > 0 && (
            <ul className="offer-benefits">
              {offer.benefits.map((b, i) => (
                <li key={i} className="offer-benefit">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 8.5l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {b}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Unlock visual: Special (the action) → discount seal → Weekly (the reward) ── */}
        <div className="offer-stage">
          <figure className="offer-watch">
            <div className="offer-disc">
              <div className="offer-img">
                {specialImg && (
                  <Image src={specialImg} alt={special?.title || 'Special competition'} fill sizes="(max-width:860px) 140px, 190px" />
                )}
              </div>
            </div>
            <figcaption>
              <span className="offer-step">Step 1 · Enter free</span>
              <span className="offer-name">{special?.title || 'Special Competition'}</span>
            </figcaption>
          </figure>

          <div className="offer-connect" aria-hidden="true">
            {discount ? (
              <span className="offer-seal"><b>{discount}%</b><i>OFF</i></span>
            ) : (
              <svg width="30" height="14" viewBox="0 0 34 14" fill="none">
                <path d="M1 7h30m0 0l-6-5m6 5l-6 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>

          <figure className="offer-watch">
            <div className="offer-disc offer-disc--reward">
              <div className="offer-img">
                {weeklyImg && (
                  <Image src={weeklyImg} alt={weekly?.title || 'Weekly competition'} fill sizes="(max-width:860px) 140px, 190px" />
                )}
              </div>
            </div>
            <figcaption>
              <span className="offer-step">{discount ? `Reward · ${discount}% off` : 'Your reward'}</span>
              <span className="offer-name">{weeklyName}</span>
            </figcaption>
          </figure>
        </div>

      </div>
    </section>
  )
}
