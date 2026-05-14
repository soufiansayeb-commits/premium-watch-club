'use client'

import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE SLOTS
// Drop files into /public/competition-editorial/omega/ to replace placeholders.
//
// Slot                 File path
// ─────────────────────────────────────────────────────────────────────────────
// Main / heritage   →  public/competition-editorial/omega/omega-main.jpg
// Dial / detail     →  public/competition-editorial/omega/omega-detail-1.jpg
// Bracelet/lifestyle→  public/competition-editorial/omega/omega-detail-2.jpg
// ─────────────────────────────────────────────────────────────────────────────

const SLOTS = [
  {
    key: 'main',
    src: '/competition-editorial/omega/omega-main.jpg',
    fallback: '/assets/images/omega-speedmaster-correct.avif',
    alt: 'Omega Speedmaster Moonwatch — Heritage shot',
    label: 'Moonwatch Heritage',
    sublabel: 'Est. 1965',
  },
  {
    key: 'detail1',
    src: '/competition-editorial/omega/omega-detail-1.jpg',
    fallback: '/assets/images/omega-speedmaster-hero.png',
    alt: 'Omega Speedmaster — Calibre 3861 dial detail',
    label: 'Calibre 3861',
    sublabel: 'Master Chronometer',
  },
  {
    key: 'detail2',
    src: '/competition-editorial/omega/omega-detail-2.jpg',
    fallback: '/assets/images/omega-watch-transparent.png',
    alt: 'Omega Speedmaster — bracelet & lifestyle',
    label: 'Daily Wearability',
    sublabel: '42mm · Stainless Steel',
  },
] as const

const FEATURES = [
  {
    idx: 0,
    label: 'Moonwatch Heritage',
    badge: 'Est. 1965',
    text: 'The only watch worn on the Moon. NASA-certified for all crewed missions since 1965 — a 60-year legacy no other timepiece can claim.',
  },
  {
    idx: 1,
    label: 'Calibre 3861',
    badge: 'Master Chronometer',
    text: 'Co-axial escapement, hesalite crystal, anti-magnetic to 15,000 gauss. Engineering that earns its reputation across five decades of exploration.',
  },
  {
    idx: 2,
    label: 'Daily Wearability',
    badge: '42mm · Stainless Steel',
    text: 'The steel bracelet and 42mm case bring an icon from the Moon to the wrist — effortlessly wearable, undeniably present.',
  },
] as const

const SPECS = [
  { key: 'Reference', value: '310.30.42.50.01.001' },
  { key: 'Case', value: '42mm Steel' },
  { key: 'Crystal', value: 'Hesalite' },
  { key: 'Movement', value: 'Cal. 3861' },
  { key: 'Status', value: 'Icon Since 1969' },
]

// Renders an image with a graceful fallback on load error
function FallbackImg({
  src, fallback, alt, fill, sizes, className,
}: {
  src: string; fallback: string; alt: string
  fill?: boolean; sizes?: string; className?: string
}) {
  const [resolved, setResolved] = useState(src || fallback)
  const onErr = () => { if (resolved !== fallback) setResolved(fallback) }
  if (fill) {
    return (
      <Image
        src={resolved} alt={alt} fill
        sizes={sizes ?? '(max-width:768px) 100vw, 50vw'}
        onError={onErr}
        className={className}
        style={{ objectFit: 'cover' }}
      />
    )
  }
  return (
    <Image
      src={resolved} alt={alt} width={800} height={600}
      onError={onErr}
      className={className}
      style={{ objectFit: 'cover', width: '100%', height: '100%' }}
    />
  )
}

export default function ProductEditorial() {
  const [activeIdx, setActiveIdx] = useState(0)
  const [visible, setVisible] = useState(false)
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

  const active = SLOTS[activeIdx]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@200;300;400;500;600&display=swap');

        /* ── Shell ─────────────────────────────────────── */
        .pe3-section {
          background: #f7f3ee;
          border-top: 1px solid rgba(184,150,62,.2);
          border-bottom: 1px solid rgba(184,150,62,.2);
          padding: 80px 0 76px;
          position: relative;
          overflow: hidden;
        }
        .pe3-section::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 55% 45% at 72% 45%, rgba(184,150,62,.055) 0%, transparent 68%),
            radial-gradient(ellipse 30% 50% at 10% 80%, rgba(15,31,61,.03) 0%, transparent 70%);
          pointer-events: none;
        }

        /* ── Layout ─────────────────────────────────────── */
        .pe3-wrap {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 40px;
          display: grid;
          grid-template-columns: 1fr 390px;
          gap: 72px;
          align-items: start;
        }

        /* ── Scroll reveal ───────────────────────────────── */
        .pe3-fade {
          opacity: 0;
          transform: translateY(22px);
          transition: opacity .75s cubic-bezier(.22,.68,0,1), transform .75s cubic-bezier(.22,.68,0,1);
        }
        .pe3-fade.on  { opacity: 1; transform: translateY(0); }
        .pe3-d1 { transition-delay: .06s; }
        .pe3-d2 { transition-delay: .14s; }
        .pe3-d3 { transition-delay: .22s; }
        .pe3-d4 { transition-delay: .30s; }
        .pe3-d5 { transition-delay: .38s; }

        /* ── LEFT: text ─────────────────────────────────── */

        /* Eyebrow */
        .pe3-eyebrow {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 26px;
        }
        .pe3-eline {
          height: 1px;
          background: linear-gradient(to right, #b8963e, rgba(184,150,62,.25));
          flex-shrink: 0;
          width: 36px;
        }
        .pe3-eline-r {
          flex: 1;
          height: 1px;
          background: linear-gradient(to right, rgba(184,150,62,.25), transparent);
        }
        .pe3-elabel {
          font-family: 'Jost', 'Helvetica Neue', sans-serif;
          font-size: 8.5px;
          font-weight: 600;
          letter-spacing: .28em;
          text-transform: uppercase;
          color: #b8963e;
        }

        /* Headline */
        .pe3-headline {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(26px, 2.8vw, 38px);
          font-weight: 300;
          line-height: 1.18;
          color: #0f1f3d;
          margin: 0 0 6px;
          letter-spacing: -.01em;
        }
        .pe3-headline em {
          font-style: italic;
          color: #b8963e;
          font-weight: 400;
        }
        .pe3-subline {
          font-family: 'Jost', sans-serif;
          font-size: 10px;
          font-weight: 300;
          letter-spacing: .2em;
          text-transform: uppercase;
          color: #8a7560;
          margin: 0 0 28px;
        }

        /* Intro */
        .pe3-intro {
          font-family: 'Jost', 'Helvetica Neue', sans-serif;
          font-size: 14px;
          line-height: 1.82;
          color: #4a5568;
          margin: 0 0 30px;
          font-weight: 300;
        }

        /* ── Spec strip ─────────────────────────────────── */
        .pe3-specs {
          display: flex;
          border: 1px solid rgba(184,150,62,.22);
          border-radius: 2px;
          overflow: hidden;
          margin: 0 0 36px;
          background: rgba(15,31,61,.02);
        }
        .pe3-spec {
          flex: 1;
          padding: 10px 13px 11px;
          border-right: 1px solid rgba(184,150,62,.15);
          min-width: 0;
        }
        .pe3-spec:last-child { border-right: none; }
        .pe3-sk {
          font-family: 'Jost', sans-serif;
          font-size: 7px;
          font-weight: 600;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: #b8963e;
          display: block;
          margin-bottom: 3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pe3-sv {
          font-family: 'Jost', sans-serif;
          font-size: 10.5px;
          font-weight: 400;
          color: #0f1f3d;
          letter-spacing: .01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ── Feature cards ─────────────────────────────── */
        .pe3-features {
          list-style: none;
          padding: 0;
          margin: 0 0 32px;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }
        .pe3-feat {
          padding: 14px 16px 14px 20px;
          border: 1px solid rgba(228,221,212,.9);
          border-radius: 2px;
          cursor: pointer;
          position: relative;
          background: transparent;
          transition: border-color .25s, background .25s, box-shadow .25s, transform .22s cubic-bezier(.22,.68,0,1.2);
          user-select: none;
        }
        .pe3-feat::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 3px;
          background: linear-gradient(to bottom, #d4b06a, #b8963e);
          border-radius: 2px 0 0 2px;
          transform: scaleY(0);
          transform-origin: bottom;
          transition: transform .28s cubic-bezier(.22,.68,0,1.1);
        }
        .pe3-feat:hover,
        .pe3-feat.act {
          border-color: rgba(184,150,62,.32);
          background: rgba(255,253,250,.9);
          box-shadow: 0 5px 22px rgba(15,31,61,.07);
          transform: translateY(-1px);
        }
        .pe3-feat:hover::before,
        .pe3-feat.act::before { transform: scaleY(1); }

        .pe3-feat-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .pe3-flabel {
          font-family: 'Jost', sans-serif;
          font-size: 9.5px;
          font-weight: 600;
          letter-spacing: .16em;
          text-transform: uppercase;
          color: #0f1f3d;
        }
        .pe3-fbadge {
          font-family: 'Jost', sans-serif;
          font-size: 7.5px;
          font-weight: 500;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: #b8963e;
          opacity: 0;
          transition: opacity .2s;
          white-space: nowrap;
        }
        .pe3-feat:hover .pe3-fbadge,
        .pe3-feat.act .pe3-fbadge { opacity: 1; }

        .pe3-ftext {
          font-family: 'Jost', sans-serif;
          font-size: 12.5px;
          line-height: 1.68;
          color: #5a6680;
          margin: 0;
          font-weight: 300;
          max-height: 0;
          overflow: hidden;
          opacity: 0;
          transition: max-height .38s cubic-bezier(.22,.68,0,1.05), opacity .28s ease, margin-top .28s;
        }
        .pe3-feat:hover .pe3-ftext,
        .pe3-feat.act .pe3-ftext {
          max-height: 90px;
          opacity: 1;
          margin-top: 9px;
        }

        /* ── Pull quote ────────────────────────────────── */
        .pe3-quote {
          position: relative;
          padding: 18px 18px 18px 22px;
          border-left: 2px solid #b8963e;
          background: rgba(184,150,62,.04);
          border-radius: 0 2px 2px 0;
        }
        .pe3-qmark {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 64px;
          line-height: .9;
          color: #b8963e;
          opacity: .18;
          position: absolute;
          top: -2px; left: 12px;
          pointer-events: none;
          user-select: none;
        }
        .pe3-qtext {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 15.5px;
          line-height: 1.58;
          font-style: italic;
          color: #0f1f3d;
          margin: 0 0 8px;
          padding-left: 22px;
          font-weight: 400;
        }
        .pe3-qattr {
          font-family: 'Jost', sans-serif;
          font-size: 8px;
          font-weight: 600;
          letter-spacing: .18em;
          text-transform: uppercase;
          color: #b8963e;
          padding-left: 22px;
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
          border-radius: 3px;
          background: #ddd8d0;
          margin-bottom: 10px;
          cursor: default;
        }

        .pe3-layer {
          position: absolute;
          inset: 0;
          opacity: 0;
          pointer-events: none;
          transition: opacity .5s cubic-bezier(.4,0,.2,1);
          z-index: 0;
        }
        .pe3-layer.on {
          opacity: 1;
          pointer-events: auto;
          z-index: 1;
        }

        /* Zoom wrapper — hover scale clipped by pe3-main overflow:hidden */
        .pe3-zoom {
          position: absolute;
          inset: 0;
          transition: transform .85s cubic-bezier(.22,.68,0,1.05);
        }
        .pe3-main:hover .pe3-zoom {
          transform: scale(1.04);
        }

        /* Gradient label overlay */
        .pe3-overlay {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          padding: 40px 18px 16px;
          background: linear-gradient(to top, rgba(10,20,48,.6) 0%, transparent 100%);
          z-index: 10;
          pointer-events: none;
        }
        .pe3-ovlabel {
          display: block;
          font-family: 'Jost', sans-serif;
          font-size: 8.5px;
          font-weight: 600;
          letter-spacing: .24em;
          text-transform: uppercase;
          color: rgba(255,255,255,.88);
          margin-bottom: 3px;
          animation: pe3LabelIn .4s ease forwards;
        }
        .pe3-ovsub {
          display: block;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 13px;
          font-style: italic;
          color: rgba(212,176,106,.92);
          animation: pe3LabelIn .4s .06s ease both;
        }
        @keyframes pe3LabelIn {
          from { opacity: 0; transform: translateY(5px); }
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
          border-radius: 2px;
          background: #ddd8d0;
          cursor: pointer;
          border: none;
          padding: 0;
          outline: 2px solid transparent;
          outline-offset: 2px;
          transition: outline-color .22s, box-shadow .22s, transform .2s cubic-bezier(.22,.68,0,1.2);
        }
        .pe3-thumb:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(15,31,61,.14);
        }
        .pe3-thumb.act {
          outline-color: #b8963e;
          box-shadow: 0 0 0 3px rgba(184,150,62,.22), 0 8px 24px rgba(15,31,61,.12);
        }
        .pe3-thumb-zoom {
          position: absolute;
          inset: 0;
          transition: transform .45s cubic-bezier(.22,.68,0,1.05);
        }
        .pe3-thumb:hover .pe3-thumb-zoom {
          transform: scale(1.07);
        }
        .pe3-thumb-bar {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          padding: 18px 8px 7px;
          background: linear-gradient(to top, rgba(10,20,48,.65) 0%, transparent 100%);
          font-family: 'Jost', sans-serif;
          font-size: 7px;
          font-weight: 600;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: rgba(255,255,255,.85);
          pointer-events: none;
        }

        /* ── Responsive ─────────────────────────────────── */
        @media (max-width: 900px) {
          .pe3-wrap {
            grid-template-columns: 1fr;
            gap: 40px;
            padding: 0 28px;
          }
          .pe3-section { padding: 56px 0 52px; }
          .pe3-imgcol { position: static; order: -1; }
          .pe3-main { aspect-ratio: 4/3; }
        }
        @media (max-width: 600px) {
          .pe3-wrap { padding: 0 16px; }
          .pe3-section { padding: 40px 0 36px; }
          .pe3-specs { flex-wrap: wrap; }
          .pe3-spec {
            flex: 1 1 auto;
            min-width: calc(33% - 2px);
            border-bottom: 1px solid rgba(184,150,62,.1);
          }
          .pe3-thumbs { gap: 6px; }
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

            {/* Headline */}
            <h2 className={`pe3-headline pe3-fade pe3-d1${visible ? ' on' : ''}`}>
              An icon built for precision,<br />
              <em>history</em> and everyday presence.
            </h2>
            <p className={`pe3-subline pe3-fade pe3-d1${visible ? ' on' : ''}`}>
              Omega Speedmaster · Moonwatch Professional
            </p>

            {/* Intro */}
            <p className={`pe3-intro pe3-fade pe3-d2${visible ? ' on' : ''}`}>
              The Omega Speedmaster Moonwatch is not simply a chronograph. It is the only
              watch to have been worn on the surface of the Moon, and one of the very few
              timepieces whose design, movement, and meaning have remained untouched by
              compromise for more than sixty years.
            </p>

            {/* Spec strip */}
            <div className={`pe3-specs pe3-fade pe3-d2${visible ? ' on' : ''}`}>
              {SPECS.map(s => (
                <div key={s.key} className="pe3-spec">
                  <span className="pe3-sk">{s.key}</span>
                  <span className="pe3-sv">{s.value}</span>
                </div>
              ))}
            </div>

            {/* Feature cards */}
            <ul className={`pe3-features pe3-fade pe3-d3${visible ? ' on' : ''}`} role="list">
              {FEATURES.map(f => (
                <li
                  key={f.idx}
                  role="button"
                  tabIndex={0}
                  aria-pressed={activeIdx === f.idx}
                  className={`pe3-feat${activeIdx === f.idx ? ' act' : ''}`}
                  onClick={() => setActiveIdx(f.idx)}
                  onMouseEnter={() => setActiveIdx(f.idx)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setActiveIdx(f.idx) }}
                >
                  <div className="pe3-feat-row">
                    <span className="pe3-flabel">{f.label}</span>
                    <span className="pe3-fbadge">{f.badge}</span>
                  </div>
                  <p className="pe3-ftext">{f.text}</p>
                </li>
              ))}
            </ul>

            {/* Pull quote */}
            <div className={`pe3-quote pe3-fade pe3-d4${visible ? ' on' : ''}`}>
              <span className="pe3-qmark" aria-hidden="true">&ldquo;</span>
              <p className="pe3-qtext">
                Not just a chronograph — a piece of watch culture that earned its place
                in history through performance, not prestige.
              </p>
              <span className="pe3-qattr">Premium Watch Club · Editorial</span>
            </div>

          </div>

          {/* ═══════════ RIGHT: image column ═══════════ */}
          <div className={`pe3-imgcol pe3-fade pe3-d2${visible ? ' on' : ''}`}>

            {/* Main image with crossfade layers */}
            <div className="pe3-main">
              {SLOTS.map((slot, idx) => (
                <div
                  key={slot.key}
                  className={`pe3-layer${activeIdx === idx ? ' on' : ''}`}
                >
                  <div className="pe3-zoom">
                    <FallbackImg
                      src={slot.src}
                      fallback={slot.fallback}
                      alt={slot.alt}
                      fill
                      sizes="(max-width:900px) 100vw, 390px"
                    />
                  </div>
                </div>
              ))}

              {/* Label overlay — key forces re-animation on change */}
              <div className="pe3-overlay">
                <span className="pe3-ovlabel" key={active.key + '-l'}>{active.label}</span>
                <span className="pe3-ovsub"   key={active.key + '-s'}>{active.sublabel}</span>
              </div>
            </div>

            {/* Thumbnails */}
            <div className="pe3-thumbs">
              {SLOTS.map((slot, idx) => (
                <button
                  key={slot.key}
                  className={`pe3-thumb${activeIdx === idx ? ' act' : ''}`}
                  onClick={() => setActiveIdx(idx)}
                  aria-label={`View: ${slot.label}`}
                >
                  <div className="pe3-thumb-zoom">
                    <FallbackImg
                      src={slot.src}
                      fallback={slot.fallback}
                      alt={slot.alt}
                      fill
                      sizes="130px"
                    />
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
