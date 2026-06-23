'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { PastWinner } from '@/lib/past-winners'

const WatchIcon = () => (
  <svg width="48" height="48" viewBox="0 0 120 120" fill="none" opacity="0.35" aria-hidden="true">
    <circle cx="60" cy="60" r="50" stroke="#0A1F44" strokeWidth="1.5" />
    <circle cx="60" cy="60" r="38" stroke="#B8893C" strokeWidth="0.8" />
    <rect x="57" y="14" width="6" height="13" rx="1.5" fill="#B8893C" />
    <rect x="57" y="93" width="6" height="13" rx="1.5" fill="#B8893C" />
    <rect x="58" y="32" width="4" height="30" rx="2" fill="#0A1F44" transform="rotate(-28 60 60)" />
    <circle cx="60" cy="60" r="5" fill="#B8893C" />
  </svg>
)

type VideoKind = 'youtube' | 'vimeo' | 'mp4' | 'other'
interface EmbedInfo { embeddable: boolean; kind: VideoKind; embedUrl: string; rawUrl: string }

function embedInfo(url: string): EmbedInfo {
  const u = (url || '').trim()
  let m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/i)
  if (m) return { embeddable: true, kind: 'youtube', embedUrl: `https://www.youtube.com/embed/${m[1]}?autoplay=1&rel=0`, rawUrl: u }
  m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/i)
  if (m) return { embeddable: true, kind: 'vimeo', embedUrl: `https://player.vimeo.com/video/${m[1]}?autoplay=1`, rawUrl: u }
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(u)) return { embeddable: true, kind: 'mp4', embedUrl: u, rawUrl: u }
  return { embeddable: false, kind: 'other', embedUrl: u, rawUrl: u }
}

export default function PastWinnersGrid({ winners }: { winners: PastWinner[] }) {
  const [video, setVideo] = useState<EmbedInfo | null>(null)

  useEffect(() => {
    if (!video) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setVideo(null) }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [video])

  function openLiveDraw(url: string) {
    const info = embedInfo(url)
    if (info.embeddable) setVideo(info)
    else window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (winners.length === 0) {
    return (
      <div className="pw-empty">
        No closed draws to show yet. Winners appear here once a competition has been drawn.
      </div>
    )
  }

  return (
    <>
      <div className="pw-grid">
        {winners.map((w, i) => {
          const badge   = w.drawNumber ? `#${w.drawNumber}` : 'PAST WINNER'
          const hasLive = !!w.liveDrawUrl
          const hasCert = !!w.drawCertificateUrl

          return (
            <article
              key={w.id}
              className="pw-card"
              style={{ animationDelay: `${i * 0.07}s` }}
            >
              {/* ── Top row ── */}
              <div className="pw-card-top">
                <span className="pw-badge">{badge}</span>
                {w.drawDateDisplay && <span className="pw-date">{w.drawDateDisplay}</span>}
              </div>

              {/* ── Circular image ── */}
              <div className="pw-img">
                {w.cardImage ? (
                  <Image
                    src={w.cardImage}
                    alt={w.title}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="168px"
                  />
                ) : (
                  <div className="pw-img-ph"><WatchIcon /></div>
                )}
              </div>

              {/* ── Body ── */}
              <div className="pw-body">

                <h3 className="pw-title">{w.title}</h3>
                <div className="pw-rule" aria-hidden="true" />

                {/* Prize value — clearly labelled so it reads as watch value, not a price paid */}
                {w.prizeValueDisplay && (
                  <div className="pw-meta-block">
                    <span className="pw-meta-lbl">Prize Value</span>
                    <span className="pw-meta-val">{w.prizeValueDisplay}</span>
                  </div>
                )}

                {(w.winnerDisplayName || w.winnerLocation) && (
                  <div className="pw-meta-block">
                    <span className="pw-meta-lbl">Winner</span>
                    <span className="pw-meta-val">
                      {w.winnerDisplayName ?? 'Verified entrant'}
                      {w.winnerLocation ? ` — ${w.winnerLocation}` : ''}
                    </span>
                  </div>
                )}

                {w.winnerTestimonial && (
                  <blockquote className="pw-quote">
                    &ldquo;{w.winnerTestimonial}&rdquo;
                  </blockquote>
                )}

                {(hasLive || hasCert) && (
                  <div className="pw-foot">
                    <div className="pw-proof">
                      {hasLive && (
                        <button
                          className="pw-proof-btn pw-proof-btn--gold"
                          onClick={() => openLiveDraw(w.liveDrawUrl!)}
                        >
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                            <path d="M2.5 1.5v9l7-4.5-7-4.5z" fill="currentColor" />
                          </svg>
                          Live Draw
                        </button>
                      )}
                      {hasCert && (
                        <a
                          className="pw-proof-btn pw-proof-btn--ghost"
                          href={w.drawCertificateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Draw Certificate
                        </a>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </article>
          )
        })}
      </div>

      {/* ── Live Draw video modal ── */}
      {video && (
        <div className="pw-vmodal" role="dialog" aria-modal="true" aria-label="Live draw video" onClick={() => setVideo(null)}>
          <div className="pw-vmodal-inner" onClick={e => e.stopPropagation()}>
            <button className="pw-vclose" onClick={() => setVideo(null)} aria-label="Close">×</button>
            <div className="pw-vframe">
              {video.kind === 'mp4' ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video src={video.embedUrl} controls autoPlay playsInline />
              ) : (
                <iframe
                  src={video.embedUrl}
                  title="Live Draw"
                  allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
            <a className="pw-vlink" href={video.rawUrl} target="_blank" rel="noopener noreferrer">
              Open in new tab ↗
            </a>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,400;1,500&family=Jost:wght@300;400;500;600&display=swap');

        /* ── Entrance animation ── */
        @keyframes pwRise {
          from { opacity:0; transform:translateY(22px); }
          to   { opacity:1; transform:translateY(0);    }
        }

        .pw-empty {
          max-width:560px; margin:40px auto 0; text-align:center;
          font-family:'Cormorant Garamond',Georgia,serif; font-style:italic; font-size:20px; color:#6f6d75;
        }

        /* ── Grid ── */
        .pw-grid {
          display:grid; grid-template-columns:repeat(3,1fr); gap:24px;
          max-width:1140px; margin:0 auto; align-items:stretch;
        }
        @media (max-width:900px){ .pw-grid{ grid-template-columns:repeat(2,1fr); gap:18px; } }
        @media (max-width:600px){ .pw-grid{ grid-template-columns:1fr; } }

        /* ── Card shell ── */
        .pw-card {
          display:flex; flex-direction:column;
          background:#fff;
          border:1px solid #e8dfca;
          border-radius:12px; overflow:hidden;
          box-shadow:0 8px 28px rgba(10,31,68,.07);
          /* entrance */
          animation:pwRise 0.52s cubic-bezier(0.22,1,0.36,1) both;
          /* hover transitions */
          transition:transform .28s cubic-bezier(.22,1,.36,1),
                     box-shadow .28s cubic-bezier(.22,1,.36,1),
                     border-color .28s ease;
        }
        .pw-card:hover {
          transform:translateY(-5px);
          box-shadow:0 22px 52px rgba(10,31,68,.13);
          border-color:rgba(184,137,60,.5);
        }

        /* ── Top row ── */
        .pw-card-top {
          display:flex; align-items:center; justify-content:space-between;
          padding:14px 18px 0;
        }
        .pw-badge {
          font-family:'Jost',sans-serif; font-size:10px; font-weight:600; letter-spacing:.16em;
          color:#fff; background:#0A1F44; padding:5px 12px; border-radius:3px;
          transition:background .25s;
        }
        .pw-card:hover .pw-badge { background:#112952; }
        .pw-date {
          font-family:'Jost',sans-serif; font-size:11px; color:#9a8a73; letter-spacing:.03em;
        }

        /* ── Circular image — zooms gently on card hover ── */
        .pw-img {
          position:relative;
          width:168px; height:168px; border-radius:50%; overflow:hidden;
          margin:20px auto 4px; flex-shrink:0;
          background:transparent;
          border:2px solid rgba(184,137,60,.32);
          box-shadow:0 5px 20px rgba(10,31,68,.11);
          transition:transform .38s cubic-bezier(.22,1,.36,1),
                     border-color .38s ease,
                     box-shadow .38s ease;
        }
        .pw-card:hover .pw-img {
          transform:scale(1.05);
          border-color:rgba(184,137,60,.72);
          box-shadow:0 10px 36px rgba(10,31,68,.18);
        }
        @media (max-width:600px){ .pw-img{ width:130px; height:130px; } }
        .pw-img-ph { display:flex; align-items:center; justify-content:center; width:100%; height:100%; }

        /* ── Body ── */
        .pw-body { padding:14px 22px 22px; display:flex; flex-direction:column; }

        .pw-title {
          font-family:'Cormorant Garamond',Georgia,serif; font-weight:600; font-size:21px;
          line-height:1.15; color:#0A1F44; margin:0;
        }

        /* Gold rule — auction catalogue separator */
        .pw-rule {
          width:36px; height:1px;
          background:linear-gradient(to right, #B8893C 55%, transparent);
          margin:9px 0 15px;
          transition:width .3s ease;
        }
        .pw-card:hover .pw-rule { width:56px; }

        /* ── Shared meta block (Prize Value, Winner) ── */
        .pw-meta-block {
          display:flex; flex-direction:column; gap:3px; margin-bottom:12px;
        }
        .pw-meta-lbl {
          font-family:'Jost',sans-serif; font-size:9px; font-weight:600;
          letter-spacing:.18em; text-transform:uppercase; color:#B8893C;
        }
        .pw-meta-val {
          font-family:'Cormorant Garamond',Georgia,serif; font-size:19px; font-weight:600;
          line-height:1.2; color:#0A1F44;
        }

        /* ── Quote — editorial blockquote style ── */
        .pw-quote {
          font-family:'Cormorant Garamond',serif; font-style:italic;
          font-size:14px; line-height:1.62; color:#6b6876;
          margin:4px 0 0; padding:0 0 0 12px;
          border-left:1.5px solid rgba(184,137,60,.38);
          display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;
          transition:border-color .28s;
        }
        .pw-card:hover .pw-quote { border-color:rgba(184,137,60,.65); }

        /* ── Proof buttons ── */
        .pw-foot { margin-top:18px; }
        .pw-proof { display:flex; flex-wrap:wrap; gap:10px; }
        .pw-proof-btn {
          display:inline-flex; align-items:center; gap:7px; cursor:pointer;
          font-family:'Jost',sans-serif; font-size:10px; font-weight:600; letter-spacing:.12em;
          text-transform:uppercase; padding:9px 15px; border-radius:2px;
          transition:all .2s; border:1px solid transparent; text-decoration:none;
        }
        .pw-proof-btn--gold { background:#B8893C; color:#fff; border-color:#B8893C; }
        .pw-proof-btn--gold:hover { background:#a4782f; border-color:#a4782f; transform:translateY(-1px); }
        .pw-proof-btn--ghost { background:transparent; color:#0A1F44; border-color:rgba(10,31,68,.22); }
        .pw-proof-btn--ghost:hover { border-color:#B8893C; color:#B8893C; }

        /* ── Video modal ── */
        .pw-vmodal {
          position:fixed; inset:0; z-index:300; background:rgba(7,19,48,.82);
          backdrop-filter:blur(6px);
          display:flex; align-items:center; justify-content:center; padding:24px;
          animation:pwFade .22s ease;
        }
        @keyframes pwFade { from{ opacity:0 } to{ opacity:1 } }
        .pw-vmodal-inner { position:relative; width:100%; max-width:900px; }
        .pw-vclose {
          position:absolute; top:-44px; right:0; background:none; border:none;
          font-size:34px; line-height:1; color:#fff; cursor:pointer; opacity:.75; transition:opacity .2s;
        }
        .pw-vclose:hover { opacity:1; }
        .pw-vframe {
          position:relative; width:100%; aspect-ratio:16/9; background:#000;
          border-radius:10px; overflow:hidden; box-shadow:0 40px 100px rgba(0,0,0,.65);
          border:1px solid rgba(184,137,60,.28);
        }
        .pw-vframe iframe, .pw-vframe video { position:absolute; inset:0; width:100%; height:100%; border:0; }
        .pw-vlink {
          display:inline-block; margin-top:14px; font-family:'Jost',sans-serif; font-size:11px;
          font-weight:500; letter-spacing:.1em; text-transform:uppercase; color:rgba(255,255,255,.65);
          transition:color .2s;
        }
        .pw-vlink:hover { color:#C5A065; }
        @media (max-width:600px){ .pw-vclose{ top:-38px; } }
      `}</style>
    </>
  )
}
