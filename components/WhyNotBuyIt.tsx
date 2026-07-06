'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'motion/react'

interface Props {
  ctaHref: string
  ctaText?: string
}

const EASE = [0.22, 1, 0.36, 1] as const

const ARTWORK_ALT =
  'The days of impossible waitlists are over, because the world’s most exclusive watches are finally within your reach and ready for your wrist.'

export default function WhyNotBuyIt({ ctaHref, ctaText = 'View Competitions' }: Props) {
  const [isMobile, setIsMobile] = useState(true)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 899px)')
    setIsMobile(mq.matches)
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', listener)
    return () => mq.removeEventListener('change', listener)
  }, [])

  // Same-page anchors are scrolled to manually — some pages rewrite the visible
  // URL client-side (hero drop-type sync), which can otherwise confuse Next's
  // Link into doing a full navigation instead of a same-page scroll.
  const handleCtaClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!ctaHref.startsWith('#')) return
    const target = document.getElementById(ctaHref.slice(1))
    if (!target) return
    e.preventDefault()
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section id="why-not-buy" className="wnb-section">
      <motion.div
        className="wnb-art"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        {isMobile ? (
          <Image
            key="mobile"
            src="/brand-assets/ctamobile.png"
            alt={ARTWORK_ALT}
            width={941}
            height={1672}
            className="wnb-img"
            loading="eager"
            unoptimized
          />
        ) : (
          <Image
            key="desktop"
            src="/brand-assets/ctadesk.png"
            alt={ARTWORK_ALT}
            width={1672}
            height={941}
            className="wnb-img"
            loading="eager"
            unoptimized
          />
        )}

        <motion.div
          className="wnb-overlay"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
        >
          <Link href={ctaHref} className="wnb-cta" onClick={handleCtaClick}>
            {ctaText}
          </Link>
        </motion.div>
      </motion.div>

      <style dangerouslySetInnerHTML={{ __html: `

        .wnb-section {
          position: relative;
          background: var(--navy);
          overflow-x: hidden;
          border-top: 1px solid rgba(197,160,101,0.15);
          border-bottom: 1px solid rgba(197,160,101,0.15);
        }

        /* ── Full-bleed artwork: breaks out of any parent max-width ── */
        .wnb-art {
          position: relative;
          width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
          line-height: 0;
        }
        .wnb-img {
          display: block;
          width: 100%;
          height: auto;
        }

        /* ── CTA overlay: sits ON the artwork, in the clear space near the bottom.
             Centered via flexbox (not a translateX transform) because Framer
             Motion writes its own inline transform for the reveal animation,
             which would otherwise clobber a CSS translate(-50%). ── */
        .wnb-overlay {
          position: absolute;
          left: 0;
          right: 0;
          top: 92%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .wnb-cta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: var(--gold);
          color: var(--navy);
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 16px 34px;
          border-radius: 5px;
          white-space: nowrap;
          transition: background 0.2s ease, transform 0.16s ease, box-shadow 0.2s ease;
          box-shadow: 0 6px 20px rgba(0,0,0,0.35), 0 0 0 1px rgba(197,160,101,0.2);
        }
        .wnb-cta:hover {
          background: var(--gold-light);
          transform: translateY(-2px);
          box-shadow: 0 8px 26px rgba(0,0,0,0.4), 0 0 0 1px rgba(197,160,101,0.3);
        }

        /* ── Desktop: centered in the clear space below the runner ── */
        @media (min-width: 900px) {
          .wnb-overlay { top: 89.5%; gap: 10px; align-items: center; padding-right: 0; }
          .wnb-cta { font-size: 15px; padding: 19px 46px; }
        }
      ` }} />
    </section>
  )
}
