'use client'

import Image from 'next/image'
import { useState, useEffect, useRef, useMemo } from 'react'
import type { Competition } from '@/lib/competition-data'
import { parseEditorialDescription } from '@/lib/parse-editorial'
import { useMoney } from '@/context/StoreSettingsContext'

/** Format a whole-currency value with the live Woo currency (no decimals). */
type MoneyFmt = (n: number, opts?: { decimals?: number }) => string

interface Props {
  competition: Competition
}

// ── Image helpers ─────────────────────────────────────────────────────────────

interface ImageSlot {
  key: string
  src: string
  alt: string
  label: string
  sublabel: string
}

function buildImageSlots(
  competition: Competition,
  featureLabels: string[],
  money: MoneyFmt,
): ImageSlot[] {
  const allImages = competition.galleryImages ?? (
    competition.image ? [{ src: competition.image, alt: competition.title }] : []
  )
  const mainImg = allImages[0] ?? { src: competition.heroImage, alt: competition.title }

  const getLabel    = (i: number) => featureLabels[i] ?? (i === 0 ? competition.shortName : `Detail ${i + 1}`)
  const getSublabel = (i: number) => {
    if (i === 0 && competition.retailValue)     return `Est. ${money(competition.retailValue, { decimals: 0 })}`
    if (i === 1 && competition.reference)       return competition.reference
    if (i === 2 && competition.drawDateDisplay) return competition.drawDateDisplay.split(',')[0] ?? ''
    return ''
  }

  const slots: ImageSlot[] = []
  for (let i = 0; i < 3; i++) {
    const img = allImages[i] ?? mainImg
    slots.push({
      key:      `slot-${i}`,
      src:      img.src,
      alt:      img.alt || competition.title,
      label:    getLabel(i),
      sublabel: getSublabel(i),
    })
  }
  return slots
}

// ── Fallback spec builder ─────────────────────────────────────────────────────

import type { ParsedSpec, ParsedFeature } from '@/lib/parse-editorial'

function buildFallbackSpecs(competition: Competition, money: MoneyFmt): ParsedSpec[] {
  const specs: ParsedSpec[] = []
  if (competition.reference)        specs.push({ key: 'Reference', value: competition.reference })
  if (competition.condition)        specs.push({ key: 'Condition', value: competition.condition })
  if (competition.retailValue)      specs.push({ key: 'Value',     value: money(competition.retailValue, { decimals: 0 }) })
  if (competition.competitionType)  specs.push({ key: 'Type',      value: competition.competitionType })
  if (competition.competitionStatus)specs.push({ key: 'Status',    value: competition.competitionStatus })
  return specs
}

// Fallback accordion items when WooCommerce description has no labeled accordion blocks.
// Produces at most 1 item from the competition's ACF description field.
function buildFallbackFeatures(competition: Competition): ParsedFeature[] {
  if (!competition.description) return []
  return [{ label: competition.shortName || competition.title, badge: '', text: competition.description }]
}

// ── Headline renderer — *word* → italic gold em ───────────────────────────────

function renderHeadline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*[^*]+\*|_[^_]+_)/)
  return parts.map((part, i) => {
    if (/^\*[^*]+\*$/.test(part) || /^_[^_]+_$/.test(part)) {
      return <em key={i}>{part.slice(1, -1)}</em>
    }
    return <span key={i}>{part}</span>
  })
}

// ── Image with graceful fallback ──────────────────────────────────────────────

function FallbackImg({
  src, fallback, alt, fill, sizes, className,
}: {
  src: string; fallback?: string; alt: string
  fill?: boolean; sizes?: string; className?: string
}) {
  const [resolved, setResolved] = useState(src || fallback || '')
  useEffect(() => { setResolved(src || fallback || '') }, [src, fallback])
  const onErr = () => { if (fallback && resolved !== fallback) setResolved(fallback) }

  if (fill) {
    return (
      <Image
        src={resolved} alt={alt} fill
        sizes={sizes ?? '(max-width:768px) 100vw, 50vw'}
        onError={onErr}
        className={className}
        style={{ objectFit: 'cover' }}
        unoptimized
      />
    )
  }
  return (
    <Image
      src={resolved} alt={alt} width={800} height={600}
      onError={onErr}
      className={className}
      style={{ objectFit: 'cover', width: '100%', height: '100%' }}
      unoptimized
    />
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProductEditorial({ competition }: Props) {
  const money = useMoney()
  const [activeIdx, setActiveIdx] = useState(0)
  const [visible,   setVisible]   = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.08 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => { setActiveIdx(0) }, [competition.id])

  // ── Parse WooCommerce description ─────────────────────────────────────────
  const parsed = useMemo(
    () => parseEditorialDescription(competition.wooDescription ?? ''),
    [competition.wooDescription]
  )

  const headline   = parsed?.title      || competition.title
  const subline    = parsed?.subline    || competition.detail
  const intro      = parsed?.paragraphs[0] || competition.description || ''
  const specs      = ((parsed?.specs?.length ?? 0) > 0)
    ? parsed!.specs.slice(0, 5)
    : buildFallbackSpecs(competition, money)
  // Use parsed accordion items when available; fall back to competition ACF data.
  // Never returns undefined — ensures the accordion block always renders when there is any content.
  const features: ParsedFeature[] = ((parsed?.features?.length ?? 0) > 0)
    ? parsed!.features.slice(0, 3)
    : buildFallbackFeatures(competition)
  const quote      = parsed?.quote?.trim() ||
    `Not every piece needs to be serious to be memorable. Some pieces win because they bring energy, colour and personality to the wrist.`
  const quoteAttr  = parsed?.quoteAttr?.trim() ||
    `Premium Watch Club · ${competition.competitionType === 'starter' ? 'Starter Drop' : competition.competitionType === 'weekly' ? 'Weekly Drop' : 'Editorial'}`

  // ── Build image slots ─────────────────────────────────────────────────────
  const slots = useMemo(
    () => buildImageSlots(competition, features.map(f => f.label), money),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [competition.id, competition.galleryImages]
  )

  const active = slots[activeIdx] ?? slots[0]

  return (
    <>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Jost:wght@200;300;400;500;600&display=swap');

        /* ── Shell ─────────────────────────────────────── */
        .pe3-section {
          background: #f5f0e8;
          border-top: 1px solid rgba(184,150,62,.18);
          border-bottom: 1px solid rgba(184,150,62,.18);
          padding: 88px 0 84px;
          position: relative;
          overflow: hidden;
        }
        .pe3-section::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 60% 50% at 75% 40%, rgba(184,150,62,.06) 0%, transparent 65%),
            radial-gradient(ellipse 35% 55% at 8%  82%, rgba(15,31,61,.04) 0%, transparent 68%);
          pointer-events: none;
        }

        /* ── Layout ─────────────────────────────────────── */
        .pe3-wrap {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 48px;
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 80px;
          align-items: start;
        }

        /* ── Scroll reveal ───────────────────────────────── */
        .pe3-fade {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity .8s cubic-bezier(.22,.68,0,1), transform .8s cubic-bezier(.22,.68,0,1);
        }
        .pe3-fade.on  { opacity: 1; transform: translateY(0); }
        .pe3-d1 { transition-delay: .08s; }
        .pe3-d2 { transition-delay: .16s; }
        .pe3-d3 { transition-delay: .24s; }
        .pe3-d4 { transition-delay: .34s; }
        .pe3-d5 { transition-delay: .44s; }

        /* ── LEFT: text ─────────────────────────────────── */

        /* Eyebrow */
        .pe3-eyebrow {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 28px;
        }
        .pe3-eline {
          height: 1px;
          background: linear-gradient(to right, #b8963e, rgba(184,150,62,.3));
          width: 32px;
          flex-shrink: 0;
        }
        .pe3-eline-r {
          flex: 1;
          height: 1px;
          background: linear-gradient(to right, rgba(184,150,62,.25), transparent);
        }
        .pe3-elabel {
          font-family: 'Jost', 'Helvetica Neue', sans-serif;
          font-size: 8px;
          font-weight: 600;
          letter-spacing: .3em;
          text-transform: uppercase;
          color: #b8963e;
          white-space: nowrap;
        }

        /* Headline */
        .pe3-headline {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(28px, 3vw, 42px);
          font-weight: 300;
          line-height: 1.15;
          color: #0f1f3d;
          margin: 0 0 8px;
          letter-spacing: -.015em;
        }
        .pe3-headline em {
          font-style: italic;
          color: #b8963e;
          font-weight: 400;
        }
        .pe3-subline {
          font-family: 'Jost', sans-serif;
          font-size: 9.5px;
          font-weight: 300;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: #9a8670;
          margin: 0 0 30px;
        }

        /* Intro */
        .pe3-intro {
          font-family: 'Jost', 'Helvetica Neue', sans-serif;
          font-size: 13.5px;
          line-height: 1.88;
          color: #4a5568;
          margin: 0 0 32px;
          font-weight: 300;
        }

        /* ── Spec strip ─────────────────────────────────── */
        .pe3-specs {
          display: flex;
          border: 1px solid rgba(184,150,62,.2);
          border-radius: 1px;
          overflow: hidden;
          margin: 0 0 38px;
          background: rgba(15,31,61,.018);
        }
        .pe3-spec {
          flex: 1 1 0;
          min-width: 0;
          padding: 11px 11px 12px;
          border-right: 1px solid rgba(184,150,62,.14);
          /* Both label and value are single-line → height is always exactly the same */
          overflow: hidden;
        }
        .pe3-spec:last-child { border-right: none; }
        .pe3-sk {
          font-family: 'Jost', sans-serif;
          font-size: 7px;
          font-weight: 600;
          letter-spacing: .24em;
          text-transform: uppercase;
          color: #b8963e;
          display: block;
          margin-bottom: 5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pe3-sv {
          font-family: 'Jost', sans-serif;
          font-size: 10px;
          font-weight: 400;
          color: #0f1f3d;
          letter-spacing: .01em;
          line-height: 1.4;
          /* Single line with ellipsis — value length never changes cell height */
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
        }

        /* ── Accordion cards ───────────────────────────── */
        .pe3-features {
          list-style: none;
          padding: 0;
          margin: 0 0 36px;
          display: flex;
          flex-direction: column;
          gap: 0;
          border: 1px solid rgba(184,150,62,.18);
          border-radius: 2px;
          overflow: hidden;
        }
        .pe3-feat {
          padding: 0;
          border-bottom: 1px solid rgba(184,150,62,.12);
          cursor: pointer;
          position: relative;
          background: transparent;
          transition: background .3s;
          user-select: none;
        }
        .pe3-feat:last-child { border-bottom: none; }

        /* Gold left accent bar */
        .pe3-feat::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 2px;
          background: linear-gradient(to bottom, #d4b06a, #b8963e);
          transform: scaleY(0);
          transform-origin: center;
          transition: transform .32s cubic-bezier(.22,.68,0,1.1);
        }
        .pe3-feat:hover { background: rgba(184,150,62,.028); }
        .pe3-feat.act   { background: rgba(184,150,62,.05); }
        .pe3-feat.act::before,
        .pe3-feat:hover::before { transform: scaleY(1); }

        /* Header row */
        .pe3-feat-hd {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 15px 18px 15px 22px;
        }
        .pe3-flabel {
          font-family: 'Jost', sans-serif;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: .18em;
          text-transform: uppercase;
          color: #0f1f3d;
          transition: color .22s;
        }
        .pe3-feat.act .pe3-flabel,
        .pe3-feat:hover .pe3-flabel { color: #0f1f3d; }

        /* Right side: badge + chevron */
        .pe3-feat-right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .pe3-fbadge {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 11px;
          font-style: italic;
          font-weight: 400;
          color: #b8963e;
          opacity: 0;
          transition: opacity .25s;
          white-space: nowrap;
        }
        .pe3-feat.act .pe3-fbadge { opacity: 1; }

        /* Chevron */
        .pe3-chevron {
          width: 14px;
          height: 14px;
          position: relative;
          flex-shrink: 0;
        }
        .pe3-chevron::before,
        .pe3-chevron::after {
          content: '';
          position: absolute;
          top: 50%;
          width: 5px;
          height: 1px;
          background: #b8963e;
          transition: transform .28s cubic-bezier(.22,.68,0,1.1);
        }
        .pe3-chevron::before {
          left: 2px;
          transform: translateY(-50%) rotate(45deg);
        }
        .pe3-chevron::after {
          right: 2px;
          transform: translateY(-50%) rotate(-45deg);
        }
        .pe3-feat.act .pe3-chevron::before {
          transform: translateY(-50%) rotate(-45deg);
        }
        .pe3-feat.act .pe3-chevron::after {
          transform: translateY(-50%) rotate(45deg);
        }

        /* Accordion body */
        .pe3-ftext {
          font-family: 'Jost', sans-serif;
          font-size: 12.5px;
          line-height: 1.72;
          color: #5a6680;
          margin: 0;
          font-weight: 300;
          max-height: 0;
          overflow: hidden;
          opacity: 0;
          transition:
            max-height .44s cubic-bezier(.22,.68,0,1.05),
            opacity    .30s ease,
            padding    .30s;
          padding: 0 22px;
        }
        .pe3-feat.act .pe3-ftext {
          max-height: 240px;
          opacity: 1;
          padding: 0 22px 16px;
        }

        /* ── Pull quote ────────────────────────────────── */
        .pe3-quote {
          position: relative;
          padding: 24px 24px 22px 32px;
          border-left: 2px solid #b8963e;
          background: rgba(184,150,62,.04);
          border-radius: 0 2px 2px 0;
          overflow: hidden;
        }
        .pe3-qmark {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 140px;
          line-height: 1;
          color: #b8963e;
          opacity: .07;
          position: absolute;
          top: -18px;
          left: 6px;
          pointer-events: none;
          user-select: none;
          font-style: normal;
          font-weight: 300;
          z-index: 0;
        }
        .pe3-qtext {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(15px, 1.6vw, 19px);
          line-height: 1.62;
          font-style: italic;
          color: #0f1f3d;
          margin: 0 0 12px;
          font-weight: 400;
          position: relative;
          z-index: 1;
        }
        .pe3-qattr {
          font-family: 'Jost', sans-serif;
          font-size: 7.5px;
          font-weight: 600;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: #b8963e;
          position: relative;
          z-index: 1;
        }

        /* ── RIGHT: images ─────────────────────────────── */
        .pe3-imgcol {
          position: sticky;
          top: 88px;
        }

        /* Main image */
        .pe3-main {
          position: relative;
          width: 100%;
          aspect-ratio: 3/4;
          overflow: hidden;
          border-radius: 2px;
          background: #ddd8d0;
          margin-bottom: 10px;
          cursor: default;
          box-shadow: 0 20px 60px rgba(15,31,61,.14), 0 4px 16px rgba(15,31,61,.08);
        }

        /* Crossfade layers */
        .pe3-layer {
          position: absolute;
          inset: 0;
          opacity: 0;
          pointer-events: none;
          transition: opacity .55s cubic-bezier(.4,0,.2,1);
          z-index: 0;
        }
        .pe3-layer.on {
          opacity: 1;
          pointer-events: auto;
          z-index: 1;
        }

        /* Zoom on hover */
        .pe3-zoom {
          position: absolute;
          inset: 0;
          transition: transform .9s cubic-bezier(.22,.68,0,1.05);
        }
        .pe3-main:hover .pe3-zoom {
          transform: scale(1.05);
        }

        /* Gradient label overlay */
        .pe3-overlay {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          padding: 48px 20px 18px;
          background: linear-gradient(to top, rgba(8,18,44,.72) 0%, transparent 100%);
          z-index: 10;
          pointer-events: none;
        }
        .pe3-ovlabel {
          display: block;
          font-family: 'Jost', sans-serif;
          font-size: 8px;
          font-weight: 600;
          letter-spacing: .26em;
          text-transform: uppercase;
          color: rgba(255,255,255,.82);
          margin-bottom: 4px;
          animation: pe3LabelIn .4s ease forwards;
        }
        .pe3-ovsub {
          display: block;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 14px;
          font-style: italic;
          color: rgba(212,176,106,.95);
          animation: pe3LabelIn .4s .06s ease both;
        }
        @keyframes pe3LabelIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Thumbnails */
        .pe3-thumbs {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .pe3-thumb {
          position: relative;
          aspect-ratio: 3/4;
          overflow: hidden;
          border-radius: 1px;
          background: #ddd8d0;
          cursor: pointer;
          border: none;
          padding: 0;
          outline: 2px solid transparent;
          outline-offset: 2px;
          transition:
            outline-color .22s,
            box-shadow    .22s,
            transform     .22s cubic-bezier(.22,.68,0,1.2);
        }
        .pe3-thumb:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(15,31,61,.16);
        }
        .pe3-thumb.act {
          outline-color: #b8963e;
          box-shadow: 0 0 0 3px rgba(184,150,62,.2), 0 10px 28px rgba(15,31,61,.14);
        }
        .pe3-thumb-zoom {
          position: absolute;
          inset: 0;
          transition: transform .48s cubic-bezier(.22,.68,0,1.05);
        }
        .pe3-thumb:hover .pe3-thumb-zoom { transform: scale(1.08); }
        .pe3-thumb-bar {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          padding: 20px 8px 8px;
          background: linear-gradient(to top, rgba(8,18,44,.7) 0%, transparent 100%);
          font-family: 'Jost', sans-serif;
          font-size: 7px;
          font-weight: 600;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: rgba(255,255,255,.82);
          pointer-events: none;
        }

        /* ── Responsive ─────────────────────────────────── */
        @media (max-width: 900px) {
          .pe3-wrap {
            grid-template-columns: 1fr;
            gap: 44px;
            padding: 0 28px;
          }
          .pe3-section { padding: 60px 0 56px; }
          .pe3-imgcol  { position: static; order: -1; }
          .pe3-main    { aspect-ratio: 4/3; }
        }
        @media (max-width: 600px) {
          .pe3-wrap    { padding: 0 18px; }
          .pe3-section { padding: 44px 0 40px; }
          .pe3-specs   { flex-wrap: wrap; }
          .pe3-spec    {
            flex: 1 1 auto;
            min-width: calc(33% - 2px);
            border-bottom: 1px solid rgba(184,150,62,.1);
          }
          .pe3-thumbs  { gap: 6px; }
        }
      `}</style>

      <section
        ref={sectionRef}
        className="pe3-section"
        aria-label="The story behind the prize"
      >
        <div className="pe3-wrap">

          {/* ═══════════ LEFT: text column ═══════════ */}
          <div>

            {/* Eyebrow */}
            <div className={`pe3-eyebrow pe3-fade${visible ? ' on' : ''}`}>
              <span className="pe3-eline" />
              <span className="pe3-elabel">The Story Behind the Prize</span>
              <span className="pe3-eline-r" />
            </div>

            {/* Headline + subline */}
            <h2 className={`pe3-headline pe3-fade pe3-d1${visible ? ' on' : ''}`}>
              {renderHeadline(headline)}
            </h2>
            {subline && (
              <p className={`pe3-subline pe3-fade pe3-d1${visible ? ' on' : ''}`}>
                {subline}
              </p>
            )}

            {/* Intro paragraph */}
            {intro && (
              <p className={`pe3-intro pe3-fade pe3-d2${visible ? ' on' : ''}`}>
                {intro}
              </p>
            )}

            {/* Spec strip */}
            {specs.length > 0 && (
              <div className={`pe3-specs pe3-fade pe3-d2${visible ? ' on' : ''}`}>
                {specs.map(s => (
                  <div key={s.key} className="pe3-spec">
                    <span className="pe3-sk">{s.key}</span>
                    <span className="pe3-sv">{s.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Accordion — linked to image gallery */}
            {features.length > 0 && (
              <ul className={`pe3-features pe3-fade pe3-d3${visible ? ' on' : ''}`} role="list">
                {features.map((f, idx) => (
                  <li
                    key={idx}
                    role="button"
                    tabIndex={0}
                    aria-pressed={activeIdx === idx}
                    aria-expanded={activeIdx === idx}
                    className={`pe3-feat${activeIdx === idx ? ' act' : ''}`}
                    onClick={() => setActiveIdx(idx)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setActiveIdx(idx) }}
                  >
                    <div className="pe3-feat-hd">
                      <span className="pe3-flabel">{f.label}</span>
                      <div className="pe3-feat-right">
                        {/* Show slot sublabel (Est. value / reference) as italic gold badge */}
                        <span className="pe3-fbadge">
                          {slots[idx]?.sublabel || f.badge || ''}
                        </span>
                        <span className="pe3-chevron" aria-hidden="true" />
                      </div>
                    </div>
                    {f.text && <p className="pe3-ftext">{f.text}</p>}
                  </li>
                ))}
              </ul>
            )}

            {/* Pull quote */}
            <div className={`pe3-quote pe3-fade pe3-d4${visible ? ' on' : ''}`}>
              <span className="pe3-qmark" aria-hidden="true">&ldquo;</span>
              <p className="pe3-qtext">{quote}</p>
              <span className="pe3-qattr">{quoteAttr}</span>
            </div>

          </div>

          {/* ═══════════ RIGHT: image column ═══════════ */}
          <div className={`pe3-imgcol pe3-fade pe3-d2${visible ? ' on' : ''}`}>

            {/* Main image with crossfade layers */}
            <div className="pe3-main">
              {slots.map((slot, idx) => (
                <div
                  key={slot.key}
                  className={`pe3-layer${activeIdx === idx ? ' on' : ''}`}
                >
                  <div className="pe3-zoom">
                    {slot.src && (
                      <FallbackImg
                        src={slot.src}
                        fallback={competition.heroImage}
                        alt={slot.alt}
                        fill
                        sizes="(max-width:900px) 100vw, 400px"
                      />
                    )}
                  </div>
                </div>
              ))}

              {/* Label overlay — key forces re-animation on change */}
              <div className="pe3-overlay">
                <span className="pe3-ovlabel" key={active?.key + '-l'}>{active?.label ?? ''}</span>
                <span className="pe3-ovsub"   key={active?.key + '-s'}>{active?.sublabel ?? ''}</span>
              </div>
            </div>

            {/* Thumbnails */}
            <div className="pe3-thumbs">
              {slots.map((slot, idx) => (
                <button
                  key={slot.key}
                  className={`pe3-thumb${activeIdx === idx ? ' act' : ''}`}
                  onClick={() => setActiveIdx(idx)}
                  aria-label={`View: ${slot.label}`}
                >
                  <div className="pe3-thumb-zoom">
                    {slot.src && (
                      <FallbackImg
                        src={slot.src}
                        fallback={competition.heroImage}
                        alt={slot.alt}
                        fill
                        sizes="130px"
                      />
                    )}
                  </div>
                  <span className="pe3-thumb-bar">{slot.label}</span>
                </button>
              ))}
            </div>

          </div>

        </div>
      </section>
    </>
  )
}
