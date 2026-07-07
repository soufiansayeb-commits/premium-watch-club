'use client'

import { useState, useEffect, useRef, Fragment } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { JournalPost, RelatedProduct } from '@/lib/wordpress-journal'
import type { ArticleSection } from '@/lib/journal-sections'
import { useMoney } from '@/context/StoreSettingsContext'

interface Props {
  post:         JournalPost
  product:      RelatedProduct | null
  relatedPosts: JournalPost[]
  sections:     ArticleSection[]
  blockquote:   string
}

function cardImageFor(p: JournalPost): string | null {
  return p.featuredImage ?? p.relatedProduct?.images[0] ?? null
}

export default function JournalEditorial({ post, product, relatedPosts, sections, blockquote }: Props) {
  const fmt = useMoney()
  const heroImage = post.featuredImage ?? product?.images[0] ?? null
  const gallery   = (product?.images ?? []).slice(0, 4)
  const [activeImg, setActiveImg] = useState(0)
  const [progress,  setProgress]  = useState(0)
  const [showSticky, setShowSticky] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLElement>(null)

  // Reading-progress bar + sticky CTA visibility (single rAF-throttled scroll handler)
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const doc = document.documentElement
        const top = doc.scrollTop || document.body.scrollTop
        const h   = doc.scrollHeight - doc.clientHeight
        setProgress(h > 0 ? Math.min(100, (top / h) * 100) : 0)
        setShowSticky(top > (heroRef.current?.offsetHeight ?? 600) * 0.75)
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [])

  // Scroll-reveal for any [data-reveal] element
  useEffect(() => {
    const els = rootRef.current?.querySelectorAll('[data-reveal]')
    if (!els?.length) return
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('on'); obs.unobserve(e.target) } }),
      { threshold: 0.12 }
    )
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  const price = product && product.entryPrice > 0
    ? fmt(product.entryPrice)
    : null
  const ctaState  = product?.ctaState ?? 'enter'
  const quoteText = blockquote || post.excerpt || ''

  const hasIntro     = sections[0]?.heading === null
  const introSection = hasIntro ? sections[0] : null
  const bodySections = hasIntro ? sections.slice(1) : sections

  // ── Gallery moment (navy campaign band) ──────────────────────────────────
  const galleryNode = gallery.length >= 2 && product ? (
    <section className="je-band je-band--navy je-gallery" data-reveal aria-label={`${product.title} gallery`}>
      <div className="je-gallery-grid">
        <div className="je-gallery-lead">
          <span className="je-kicker je-kicker--light">The watch in focus</span>
          <h2 className="je-gallery-name">{product.title}</h2>
          <div className="je-gmain">
            {gallery.map((src, i) => (
              <div key={i} className={`je-glayer${activeImg === i ? ' on' : ''}`}>
                <Image src={src} alt={`${product.title} — view ${i + 1}`} fill sizes="(max-width: 900px) 90vw, 540px" />
              </div>
            ))}
          </div>
        </div>
        <div className="je-gallery-rail">
          <p className="je-gallery-cap">{product.competitionLabel}</p>
          <div className="je-gthumbs">
            {gallery.map((src, i) => (
              <button
                key={i}
                className={`je-gthumb${activeImg === i ? ' on' : ''}`}
                onClick={() => setActiveImg(i)}
                aria-label={`View image ${i + 1}`}
                aria-pressed={activeImg === i}
              >
                <Image src={src} alt={`${product.title} — thumbnail ${i + 1}`} fill sizes="78px" />
              </button>
            ))}
          </div>
          {price && ctaState === 'enter' && (
            <p className="je-gallery-price"><b>{price}</b> per entry</p>
          )}
          <Link href={product.ctaUrl} className={`je-btn ${ctaState === 'enter' ? 'je-btn--gold' : 'je-btn--ghost'}`}>
            {product.ctaLabel}<span className="je-arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  ) : null

  return (
    <div className="je" ref={rootRef}>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..500&family=Newsreader:ital,opsz,wght@0,6..72,300..500;1,6..72,360..420&family=Jost:wght@300;400;500;600&display=swap');

        .je { --navy:#0A1F44; --navy-deep:#071330; --gold:#B8893C; --gold-soft:#C5A065;
              --cream:#F6F3EC; --beige:#EDE6D8; --paper:#FFFFFF; --ink:#23222a; --muted:#6f6d75;
              --line:rgba(10,31,68,.12); --line-light:rgba(255,255,255,.16);
              position: relative; background: var(--cream); color: var(--ink); overflow-x: clip; }
        .je *, .je *::before, .je *::after { box-sizing: border-box; }

        /* ── reading progress ─────────────────────────────────────────────── */
        .je-progress { position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 60; background: transparent; }
        .je-progress-fill { height: 100%; background: linear-gradient(90deg, var(--gold), var(--gold-soft)); transition: width .1s linear; box-shadow: 0 0 12px rgba(184,137,60,.5); }

        /* shared bits */
        .je-kicker { display:inline-flex; align-items:center; gap:10px; font-family:'Jost',sans-serif;
          font-size:10px; font-weight:600; letter-spacing:.28em; text-transform:uppercase; color:var(--gold); }
        .je-kicker::before { content:''; width:26px; height:2px; background:var(--gold); }
        .je-kicker--light { color:var(--gold-soft); }
        .je-kicker--light::before { background:var(--gold-soft); }
        .je-read { max-width: 720px; margin: 0 auto; padding: 0 28px; }

        .je-btn { display:inline-flex; align-items:center; gap:11px; font-family:'Jost',sans-serif;
          font-size:11px; font-weight:600; letter-spacing:.16em; text-transform:uppercase;
          padding:16px 34px; border-radius:2px; transition:background .22s, transform .22s, box-shadow .22s, border-color .22s; }
        .je-btn--gold { background:var(--gold); color:#fff; box-shadow:0 14px 32px rgba(184,137,60,.34); }
        .je-btn--gold:hover { background:#a4782f; transform:translateY(-2px); box-shadow:0 18px 40px rgba(184,137,60,.42); }
        .je-btn--ghost { background:transparent; border:1px solid rgba(197,160,101,.55); color:#f3e9d6; }
        .je-btn--ghost:hover { background:rgba(197,160,101,.12); border-color:var(--gold-soft); transform:translateY(-2px); }
        .je-arrow { transition:transform .22s; }
        .je-btn:hover .je-arrow { transform:translateX(4px); }

        [data-reveal] { opacity:0; transform:translateY(26px); transition:opacity .8s cubic-bezier(.22,.68,0,1), transform .8s cubic-bezier(.22,.68,0,1); }
        [data-reveal].on { opacity:1; transform:none; }

        /* ── 1. SPLIT-SCREEN HERO ─────────────────────────────────────────── */
        .je-hero { display:grid; grid-template-columns:1fr 1fr; min-height:560px; position:relative; }
        .je-hero-text { background:var(--navy); color:#fff; padding:62px 60px; display:flex; flex-direction:column; justify-content:center; position:relative; overflow:hidden; }
        .je-hero-text::before { content:''; position:absolute; inset:0; pointer-events:none;
          background: radial-gradient(ellipse 70% 60% at 18% 30%, rgba(184,137,60,.16), transparent 62%); }
        .je-hero-text::after { content:''; position:absolute; top:0; right:0; bottom:0; width:1px;
          background:linear-gradient(to bottom, transparent, rgba(197,160,101,.45), transparent); }
        .je-hero-inner { position:relative; z-index:1; max-width:520px; }
        .je-back { display:inline-flex; align-items:center; gap:8px; font-family:'Jost',sans-serif; font-size:10px;
          font-weight:600; letter-spacing:.2em; text-transform:uppercase; color:rgba(255,255,255,.5); margin-bottom:34px; transition:color .2s, gap .2s; }
        .je-back:hover { color:var(--gold-soft); gap:12px; }
        .je-hero-cat { font-family:'Jost',sans-serif; font-size:10px; font-weight:600; letter-spacing:.26em;
          text-transform:uppercase; color:var(--gold-soft); padding-bottom:14px; position:relative; display:inline-block; }
        .je-hero-cat::after { content:''; position:absolute; left:0; bottom:6px; width:30px; height:2px; background:var(--gold); }
        .je-hero-title { font-family:'Fraunces',Georgia,serif; font-optical-sizing:auto; font-weight:400;
          font-size:clamp(34px,3.6vw,56px); line-height:1.03; letter-spacing:-.02em; color:#fff; margin:0 0 18px; }
        .je-hero-ex { font-family:'Newsreader',Georgia,serif; font-style:italic; font-weight:380;
          font-size:clamp(16px,1.5vw,19px); line-height:1.5; color:rgba(255,255,255,.74); margin:0 0 24px; }

        /* hero load orchestration + slow ken-burns */
        .je-hero-inner > * { opacity:0; animation:jeUp .85s cubic-bezier(.22,.68,0,1) forwards; }
        .je-hero-inner > *:nth-child(1){ animation-delay:.05s }
        .je-hero-inner > *:nth-child(2){ animation-delay:.13s }
        .je-hero-inner > *:nth-child(3){ animation-delay:.21s }
        .je-hero-inner > *:nth-child(4){ animation-delay:.29s }
        .je-hero-inner > *:nth-child(5){ animation-delay:.37s }
        @keyframes jeUp { from{ opacity:0; transform:translateY(20px) } to{ opacity:1; transform:none } }
        .je-hero-img:not(.je-hero-img--contain) img { animation:jeKen 22s ease-out forwards; }
        @keyframes jeKen { from{ transform:scale(1.07) } to{ transform:scale(1) } }
        @media (prefers-reduced-motion: reduce){
          .je-hero-inner > *, .je-hero-img img { animation:none !important; opacity:1 !important; }
        }
        .je-hero-meta { display:flex; align-items:center; gap:12px; flex-wrap:wrap; font-family:'Jost',sans-serif;
          font-size:11px; letter-spacing:.06em; color:rgba(255,255,255,.55); padding-top:24px; border-top:1px solid var(--line-light); }
        .je-hero-meta b { color:#fff; font-weight:500; }
        .je-hero-dot { width:3px; height:3px; border-radius:50%; background:var(--gold-soft); }
        .je-hero-img { position:relative; overflow:hidden; background:var(--beige); }
        .je-hero-img img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
        .je-hero-img--contain img { object-fit:contain; padding:9%; mix-blend-mode:multiply; }
        .je-hero-img::after { content:''; position:absolute; inset:0; box-shadow:inset 0 0 120px rgba(7,19,48,.28); pointer-events:none; }
        .je-hero-badge { position:absolute; left:0; bottom:30px; z-index:2; background:var(--gold); color:#fff;
          font-family:'Jost',sans-serif; font-size:10px; font-weight:600; letter-spacing:.18em; text-transform:uppercase; padding:9px 18px; }

        /* ── bands ────────────────────────────────────────────────────────── */
        .je-band { position:relative; padding:52px 0; }
        .je-band--cream { background:var(--cream); }
        .je-band--white { background:var(--paper); }
        .je-band--beige { background:var(--beige); }
        .je-band--navy  { background:var(--navy); color:#fff; }

        /* lead/intro band */
        .je-lead { padding-top:46px; }
        .je-prose p { font-family:'Newsreader',Georgia,serif; font-size:18.5px; line-height:1.64; font-weight:380; color:#34333b; margin:0 0 16px; }
        .je-prose p:last-child { margin-bottom:0; }
        .je-lead .je-prose > p:first-of-type::first-letter { float:left; font-family:'Fraunces',serif; font-weight:500;
          font-size:70px; line-height:.78; padding:7px 13px 0 0; color:var(--gold); }
        .je-lead .je-prose > p:first-of-type { font-size:20px; line-height:1.58; color:#2c2b33; }

        /* numbered section kicker + animated gold line */
        .je-h2-kicker { display:flex; align-items:center; gap:14px; margin-bottom:11px; }
        .je-h2-num { font-family:'Jost',sans-serif; font-size:11px; font-weight:600; letter-spacing:.2em; color:var(--gold); }
        .je-h2-line { height:1px; width:54px; flex:0 0 auto; background:linear-gradient(90deg,var(--gold),rgba(184,137,60,.08));
          transform:scaleX(0); transform-origin:left; transition:transform .85s .15s cubic-bezier(.22,.68,0,1); }
        .je-band.on .je-h2-line { transform:scaleX(1); }
        .je-h2 { font-family:'Fraunces',serif; font-weight:450; font-size:clamp(24px,2.9vw,33px); line-height:1.13;
          letter-spacing:-.01em; color:var(--navy); margin:0 0 13px; }

        .je-prose h3 { font-family:'Fraunces',serif; font-weight:500; font-size:20px; color:var(--navy); margin:22px 0 7px; }
        .je-prose strong { color:var(--navy); font-weight:600; }
        .je-prose em { font-style:italic; }
        .je-prose a { color:var(--navy); text-decoration:none; background-image:linear-gradient(var(--gold-soft),var(--gold-soft));
          background-size:0% 1.5px; background-position:0 100%; background-repeat:no-repeat; transition:background-size .35s ease, color .2s; }
        .je-prose a:hover { color:var(--gold); background-size:100% 1.5px; }
        .je-prose ul, .je-prose ol { margin:0 0 16px; padding-left:0; list-style:none; }
        .je-prose li { position:relative; padding-left:24px; margin-bottom:7px; font-family:'Newsreader',serif; font-size:17.5px; line-height:1.58; color:#34333b; }
        .je-prose ul li::before { content:''; position:absolute; left:4px; top:10px; width:7px; height:7px; border:1.5px solid var(--gold); transform:rotate(45deg); }
        .je-prose ol { counter-reset:je; }
        .je-prose ol li { counter-increment:je; }
        .je-prose ol li::before { content:counter(je,decimal-leading-zero); position:absolute; left:0; top:2px; font-family:'Jost',sans-serif; font-size:12px; font-weight:600; color:var(--gold); }
        .je-prose img { max-width:100%; height:auto; display:block; margin:24px auto; border-radius:3px; box-shadow:0 18px 40px rgba(10,31,68,.12); }
        .je-prose hr { border:none; height:1px; width:60px; margin:28px auto; background:var(--gold); opacity:.6; }

        /* ── gallery moment (navy) ────────────────────────────────────────── */
        .je-gallery { overflow:hidden; }
        .je-gallery::before { content:''; position:absolute; inset:0; pointer-events:none;
          background:radial-gradient(ellipse 50% 70% at 80% 20%, rgba(184,137,60,.14), transparent 60%); }
        .je-gallery-grid { position:relative; z-index:1; max-width:1080px; margin:0 auto; padding:0 40px;
          display:grid; grid-template-columns:1.6fr 1fr; gap:54px; align-items:center; }
        .je-gallery-name { font-family:'Fraunces',serif; font-weight:400; font-size:clamp(24px,2.8vw,34px); color:#fff; margin:12px 0 22px; }
        .je-gmain { position:relative; width:100%; aspect-ratio:4/3; overflow:hidden; }
        .je-gmain::before { content:''; position:absolute; left:50%; top:47%; width:82%; height:74%; transform:translate(-50%,-50%);
          background:radial-gradient(ellipse at center, rgba(255,255,255,.13), rgba(255,255,255,0) 66%); pointer-events:none; }
        .je-glayer { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; padding:3%; opacity:0; transform:scale(.99);
          transition:opacity .55s ease, transform .9s cubic-bezier(.22,.68,0,1.05); }
        .je-glayer.on { opacity:1; transform:scale(1); }
        .je-glayer img { max-width:100%; max-height:100%; object-fit:contain;
          filter:drop-shadow(0 26px 48px rgba(0,0,0,.5)); transition:transform .8s cubic-bezier(.22,.68,0,1.05); }
        .je-gmain:hover .je-glayer.on img { transform:scale(1.05); }
        .je-gallery-cap { font-family:'Jost',sans-serif; font-size:10px; font-weight:600; letter-spacing:.22em; text-transform:uppercase; color:var(--gold-soft); margin:0 0 16px; }
        .je-gthumbs { display:flex; gap:12px; margin-bottom:26px; flex-wrap:wrap; }
        .je-gthumb { position:relative; width:78px; height:78px; border-radius:3px; overflow:hidden; background:rgba(255,255,255,.05); cursor:pointer; padding:7px; border:1px solid rgba(255,255,255,.12); outline:2px solid transparent; outline-offset:3px; transition:outline-color .2s, transform .2s, box-shadow .2s, background .2s; }
        .je-gthumb:hover { transform:translateY(-3px); box-shadow:0 12px 26px rgba(0,0,0,.4); background:rgba(255,255,255,.09); }
        .je-gthumb.on { outline-color:var(--gold); background:rgba(184,137,60,.14); }
        .je-gthumb img { width:100%; height:100%; object-fit:contain; filter:drop-shadow(0 3px 6px rgba(0,0,0,.45)); }
        .je-gallery-price { font-family:'Newsreader',serif; font-size:15px; color:rgba(255,255,255,.7); margin:0 0 18px; }
        .je-gallery-price b { font-family:'Fraunces',serif; font-size:24px; color:var(--gold-soft); }

        /* ── quote / CTA band ─────────────────────────────────────────────── */
        .je-quote { background:var(--navy-deep); color:#fff; position:relative; overflow:hidden; padding:64px 0; }
        .je-quote::before { content:''; position:absolute; inset:0; pointer-events:none;
          background:radial-gradient(ellipse 60% 80% at 50% 0%, rgba(184,137,60,.14), transparent 64%); }
        .je-quote-inner { position:relative; z-index:1; max-width:780px; margin:0 auto; padding:0 32px; text-align:center; }
        .je-quote-mark { font-family:'Fraunces',serif; font-size:90px; line-height:.4; color:var(--gold); opacity:.5; display:block; margin-bottom:18px; }
        .je-quote-text { font-family:'Fraunces',serif; font-weight:400; font-style:italic; font-size:clamp(24px,3.2vw,38px); line-height:1.26; color:#fff; margin:0 0 20px; letter-spacing:-.01em; }
        .je-quote-rule { width:54px; height:2px; background:var(--gold); margin:0 auto 22px; }
        .je-quote-attr { font-family:'Jost',sans-serif; font-size:10px; font-weight:600; letter-spacing:.24em; text-transform:uppercase; color:var(--gold-soft); margin:0 0 36px; }
        .je-quote-prod { font-family:'Jost',sans-serif; font-size:11px; color:rgba(255,255,255,.5); margin:16px 0 0; letter-spacing:.04em; }
        .je-quote-prod b { color:#fff; font-weight:500; }

        /* ── related ──────────────────────────────────────────────────────── */
        .je-rel { background:var(--cream); padding:56px 0 70px; border-top:1px solid var(--line); }
        .je-rel-inner { max-width:1080px; margin:0 auto; padding:0 40px; }
        .je-rel-head { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; margin-bottom:26px; }
        .je-rel-h2 { font-family:'Fraunces',serif; font-weight:400; font-size:clamp(24px,3vw,34px); color:var(--navy); margin:0; }
        .je-rel-all { font-family:'Jost',sans-serif; font-size:11px; font-weight:600; letter-spacing:.14em; text-transform:uppercase; color:var(--gold); white-space:nowrap; display:inline-flex; align-items:center; gap:7px; transition:gap .2s; }
        .je-rel-all:hover { gap:11px; }
        .je-rel-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:26px; }
        .je-rcard { display:flex; flex-direction:column; background:var(--paper); border:1px solid var(--line); border-radius:4px; overflow:hidden; transition:transform .26s, box-shadow .26s; }
        .je-rcard:hover { transform:translateY(-5px); box-shadow:0 26px 52px rgba(10,31,68,.16); }
        .je-rcard-img { position:relative; aspect-ratio:3/2; overflow:hidden; background:var(--beige); }
        .je-rcard-img img { width:100%; height:100%; object-fit:cover; transition:transform .55s; }
        .je-rcard-img--contain img { object-fit:contain; padding:12%; mix-blend-mode:multiply; }
        .je-rcard:hover .je-rcard-img img { transform:scale(1.06); }
        .je-rcard-body { padding:22px 22px 26px; display:flex; flex-direction:column; flex:1; }
        .je-rcard-cat { font-family:'Jost',sans-serif; font-size:9px; font-weight:600; letter-spacing:.22em; text-transform:uppercase; color:var(--gold); margin-bottom:10px; }
        .je-rcard-title { font-family:'Fraunces',serif; font-weight:450; font-size:20px; line-height:1.2; color:var(--navy); margin:0 0 14px; }
        .je-rcard-meta { margin-top:auto; font-family:'Jost',sans-serif; font-size:10px; letter-spacing:.06em; color:var(--muted); }

        /* ── sticky mini CTA (desktop) ────────────────────────────────────── */
        .je-sticky { position:fixed; left:50%; bottom:22px; transform:translate(-50%, 140%);
          z-index:55; display:flex; align-items:center; gap:18px; background:var(--navy); color:#fff;
          padding:12px 14px 12px 14px; border-radius:3px; box-shadow:0 24px 60px rgba(7,19,48,.5);
          border-top:2px solid var(--gold); transition:transform .42s cubic-bezier(.22,.68,0,1); max-width:560px; }
        .je-sticky.on { transform:translate(-50%, 0); }
        .je-sticky-img { position:relative; width:52px; height:52px; flex-shrink:0; background:#fff; border-radius:2px; padding:5px; display:flex; align-items:center; justify-content:center; }
        .je-sticky-img img { max-width:100%; max-height:100%; object-fit:contain; mix-blend-mode:multiply; }
        .je-sticky-info { min-width:0; }
        .je-sticky-label { font-family:'Jost',sans-serif; font-size:8.5px; font-weight:600; letter-spacing:.2em; text-transform:uppercase; color:var(--gold-soft); }
        .je-sticky-name { font-family:'Fraunces',serif; font-size:15px; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:240px; }
        .je-sticky-btn { flex-shrink:0; white-space:nowrap; padding:12px 22px; font-size:10px; }
        @media (max-width:900px){ .je-sticky{ display:none; } }

        /* ── responsive ───────────────────────────────────────────────────── */
        @media (max-width:900px){
          .je-hero { grid-template-columns:1fr; min-height:0; }
          .je-hero-img { order:-1; aspect-ratio:16/10; }
          .je-hero-text { padding:48px 32px; }
          .je-gallery-grid { grid-template-columns:1fr; gap:30px; }
          .je-rel-grid { grid-template-columns:repeat(2,1fr); gap:18px; }
        }
        @media (max-width:600px){
          .je-band { padding:48px 0; }
          .je-read { padding:0 22px; }
          .je-prose p, .je-prose li { font-size:17.5px; }
          .je-gallery-grid { padding:0 22px; }
          .je-rel-inner, .je-rel-head { padding-left:22px; padding-right:22px; }
          .je-rel-inner { padding:0 22px; }
          .je-rel-grid { grid-template-columns:1fr; }
          .je-rel-head { flex-direction:column; align-items:flex-start; gap:10px; }
          .je-lead .je-prose > p:first-of-type::first-letter { font-size:58px; }
        }
      `}</style>

      {/* reading progress */}
      <div className="je-progress" aria-hidden="true">
        <div className="je-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* ── 1. SPLIT-SCREEN HERO ──────────────────────────────────────────── */}
      <header className="je-hero" ref={heroRef}>
        <div className="je-hero-text">
          <div className="je-hero-inner">
            <Link href="/journal" className="je-back">← The Journal</Link>
            <div><span className="je-hero-cat">{post.category}</span></div>
            <h1 className="je-hero-title">{post.title}</h1>
            {post.excerpt && <p className="je-hero-ex">{post.excerpt}</p>}
            <div className="je-hero-meta">
              <span>By <b>{post.author}</b></span>
              <span className="je-hero-dot" aria-hidden="true" />
              <time dateTime={post.date}>{post.dateFormatted}</time>
              <span className="je-hero-dot" aria-hidden="true" />
              <span>{post.readTime} min read</span>
            </div>
          </div>
        </div>
        <div className={`je-hero-img${!post.featuredImage ? ' je-hero-img--contain' : ''}`}>
          {heroImage && (
            <Image src={heroImage} alt={post.title} fill sizes="(max-width: 900px) 100vw, 50vw" priority />
          )}
          {product && <span className="je-hero-badge">{product.competitionLabel}</span>}
        </div>
      </header>

      {/* ── 2. INTRO / LEAD (cream) ───────────────────────────────────────── */}
      {introSection && (
        <section className="je-band je-band--cream je-lead" data-reveal>
          <div className="je-read">
            <div className="je-prose" dangerouslySetInnerHTML={{ __html: introSection.html }} />
          </div>
        </section>
      )}

      {/* ── 3. ALTERNATING BODY SECTIONS + injected gallery ───────────────── */}
      {bodySections.map((sec, i) => (
        <Fragment key={i}>
          <section className={`je-band je-band--${i % 2 === 0 ? 'white' : 'beige'}`} data-reveal>
            <div className="je-read">
              {sec.heading && (
                <>
                  <div className="je-h2-kicker">
                    <span className="je-h2-num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="je-h2-line" aria-hidden="true" />
                  </div>
                  <h2 className="je-h2">{sec.heading}</h2>
                </>
              )}
              <div className="je-prose" dangerouslySetInnerHTML={{ __html: sec.html }} />
            </div>
          </section>
          {i === 0 && galleryNode}
        </Fragment>
      ))}
      {bodySections.length === 0 && galleryNode}

      {/* ── 4. QUOTE / CTA BAND (navy + gold) ─────────────────────────────── */}
      {(quoteText || product) && (
        <section className="je-quote" data-reveal aria-label="Highlight">
          <div className="je-quote-inner">
            {quoteText && (
              <>
                <span className="je-quote-mark" aria-hidden="true">&ldquo;</span>
                <p className="je-quote-text">{quoteText}</p>
                <div className="je-quote-rule" />
                <p className="je-quote-attr">{post.author} · PWC Journal</p>
              </>
            )}
            {product ? (
              <>
                <Link href={product.ctaUrl} className={`je-btn ${ctaState === 'enter' ? 'je-btn--gold' : 'je-btn--ghost'}`}>
                  {product.ctaLabel}<span className="je-arrow" aria-hidden="true">→</span>
                </Link>
                <p className="je-quote-prod">
                  <b>{product.title}</b> · {product.competitionLabel}
                  {price && ctaState === 'enter' && <> · {price} per entry</>}
                </p>
              </>
            ) : (
              <Link href="/weekly" className="je-btn je-btn--gold">
                Explore the Current Drop<span className="je-arrow" aria-hidden="true">→</span>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* ── 5. RELATED ARTICLES ───────────────────────────────────────────── */}
      {relatedPosts.length > 0 && (
        <section className="je-rel" data-reveal aria-label="More from the Journal">
          <div className="je-rel-inner">
            <div className="je-rel-head">
              <h2 className="je-rel-h2">More from the Journal</h2>
              <Link href="/journal" className="je-rel-all">View all articles <span aria-hidden="true">→</span></Link>
            </div>
            <div className="je-rel-grid">
              {relatedPosts.map(rp => {
                const img = cardImageFor(rp)
                const isProductImg = !rp.featuredImage && !!img
                return (
                  <Link key={rp.slug} href={`/journal/${rp.slug}`} className="je-rcard">
                    <div className={`je-rcard-img${isProductImg ? ' je-rcard-img--contain' : ''}`}>
                      {img && (
                        <Image src={img} alt={rp.title} fill sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw" />
                      )}
                    </div>
                    <div className="je-rcard-body">
                      <span className="je-rcard-cat">{rp.category}</span>
                      <h3 className="je-rcard-title">{rp.title}</h3>
                      <span className="je-rcard-meta">{rp.dateFormatted} · {rp.readTime} min read</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── sticky mini product CTA (desktop) ─────────────────────────────── */}
      {product && (
        <div className={`je-sticky${showSticky ? ' on' : ''}`} aria-hidden={!showSticky}>
          {product.images[0] && (
            <div className="je-sticky-img">
              <Image src={product.images[0]} alt={product.title} fill sizes="52px" />
            </div>
          )}
          <div className="je-sticky-info">
            <div className="je-sticky-label">{product.competitionLabel}</div>
            <div className="je-sticky-name">{product.title}</div>
          </div>
          <Link
            href={product.ctaUrl}
            className={`je-btn je-sticky-btn ${ctaState === 'enter' ? 'je-btn--gold' : 'je-btn--ghost'}`}
            tabIndex={showSticky ? 0 : -1}
          >
            {product.ctaLabel}
          </Link>
        </div>
      )}
    </div>
  )
}
