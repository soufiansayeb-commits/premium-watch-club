'use client'

import { useState, useEffect } from 'react'
import type { PastWinner } from '@/lib/past-winners'

const WatchIcon = () => (
  <svg width="56" height="56" viewBox="0 0 120 120" fill="none" opacity="0.5" aria-hidden="true">
    <circle cx="60" cy="60" r="50" stroke="#0A1F44" strokeWidth="1.5" />
    <circle cx="60" cy="60" r="38" stroke="#B8893C" strokeWidth="0.8" />
    <rect x="57" y="14" width="6" height="13" rx="1.5" fill="#B8893C" />
    <rect x="57" y="93" width="6" height="13" rx="1.5" fill="#B8893C" />
    <rect x="58" y="32" width="4" height="30" rx="2" fill="#0A1F44" transform="rotate(-28 60 60)" />
    <circle cx="60" cy="60" r="5" fill="#B8893C" />
  </svg>
)

// ── Video embed detection ─────────────────────────────────────────────────────
type VideoKind = 'youtube' | 'vimeo' | 'mp4' | 'other'
interface EmbedInfo { embeddable: boolean; kind: VideoKind; embedUrl: string; rawUrl: string }

function embedInfo(url: string): EmbedInfo {
  const u = (url || '').trim()
  // YouTube: watch?v= / youtu.be/ / shorts/ / embed/
  let m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/i)
  if (m) return { embeddable: true, kind: 'youtube', embedUrl: `https://www.youtube.com/embed/${m[1]}?autoplay=1&rel=0`, rawUrl: u }
  // Vimeo
  m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/i)
  if (m) return { embeddable: true, kind: 'vimeo', embedUrl: `https://player.vimeo.com/video/${m[1]}?autoplay=1`, rawUrl: u }
  // Direct video file
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(u)) return { embeddable: true, kind: 'mp4', embedUrl: u, rawUrl: u }
  return { embeddable: false, kind: 'other', embedUrl: u, rawUrl: u }
}

export default function PastWinnersGrid({ winners }: { winners: PastWinner[] }) {
  const [video, setVideo] = useState<EmbedInfo | null>(null)

  // ESC closes the video modal.
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
        {winners.map(w => {
          const badge = w.status === 'Sold Out' ? 'SOLD OUT' : 'CLOSED'
          const ticketsLabel =
            w.ticketsSold != null && w.totalTickets != null
              ? `${w.ticketsSold.toLocaleString('en-GB')}/${w.totalTickets.toLocaleString('en-GB')}`
              : null
          const hasLive = !!w.liveDrawUrl
          const hasCert = !!w.drawCertificateUrl

          return (
            <article key={w.id} className="pw-card">
              <div className="pw-card-top">
                <span className="pw-badge">{badge}</span>
                {w.drawDateDisplay && <span className="pw-date">{w.drawDateDisplay}</span>}
              </div>

              <div className="pw-img">
                {w.cardImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={w.cardImage} alt={w.title} />
                ) : (
                  <div className="pw-img-ph"><WatchIcon /></div>
                )}
              </div>

              <div className="pw-body">
                <h3 className="pw-title">{w.title}</h3>

                <div className="pw-specs">
                  {w.drawNumber && (
                    <div className="pw-spec"><span>Draw</span><b>#{w.drawNumber}</b></div>
                  )}
                  {w.prizeValueDisplay && (
                    <div className="pw-spec"><span>Prize Value</span><b>{w.prizeValueDisplay}</b></div>
                  )}
                  {ticketsLabel && (
                    <div className="pw-spec"><span>Tickets</span><b>{ticketsLabel}</b></div>
                  )}
                  {w.correctAnswer && (
                    <div className="pw-spec"><span>Answer</span><b>{w.correctAnswer}</b></div>
                  )}
                </div>

                {(w.winnerDisplayName || w.winnerLocation) && (
                  <div className="pw-winner">
                    <span className="pw-winner-k">Winner</span>
                    <span className="pw-winner-v">
                      {w.winnerDisplayName ?? 'Verified entrant'}
                      {w.winnerLocation ? ` — ${w.winnerLocation}` : ''}
                    </span>
                  </div>
                )}

                {w.winnerTestimonial && (
                  <p className="pw-quote">&ldquo;{w.winnerTestimonial}&rdquo;</p>
                )}

                <div className="pw-foot">
                  {hasLive || hasCert ? (
                    <div className="pw-proof">
                      {hasLive && (
                        <button
                          className="pw-proof-btn pw-proof-btn--gold"
                          onClick={() => openLiveDraw(w.liveDrawUrl!)}
                        >
                          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
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
                  ) : (
                    <span className="pw-archive-tag">Archive Winner</span>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {/* Live Draw video modal */}
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
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Jost:wght@300;400;500;600&display=swap');

        .pw-empty {
          max-width:560px; margin:40px auto 0; text-align:center;
          font-family:'Cormorant Garamond',Georgia,serif; font-style:italic; font-size:20px; color:#6f6d75;
        }

        .pw-grid {
          display:grid; grid-template-columns:repeat(3,1fr); gap:26px;
          max-width:1140px; margin:0 auto;
        }
        @media (max-width:900px){ .pw-grid{ grid-template-columns:repeat(2,1fr); gap:20px; } }
        @media (max-width:600px){ .pw-grid{ grid-template-columns:1fr; } }

        .pw-card {
          display:flex; flex-direction:column; background:#fff;
          border:1px solid #e8dfca; border-radius:10px; overflow:hidden;
          box-shadow:0 14px 36px rgba(10,31,68,.07); transition:transform .25s, box-shadow .25s;
        }
        .pw-card:hover { transform:translateY(-4px); box-shadow:0 24px 52px rgba(10,31,68,.13); }

        .pw-card-top { display:flex; align-items:center; justify-content:space-between; padding:14px 18px 0; }
        .pw-badge {
          font-family:'Jost',sans-serif; font-size:9px; font-weight:600; letter-spacing:.2em;
          text-transform:uppercase; color:#fff; background:#0A1F44; padding:5px 11px; border-radius:2px;
        }
        .pw-date { font-family:'Jost',sans-serif; font-size:11px; color:#8a8893; letter-spacing:.03em; }

        .pw-img {
          margin:14px 18px 0; aspect-ratio:4/3; border-radius:8px; overflow:hidden;
          background:#F6F3EC; display:flex; align-items:center; justify-content:center;
        }
        .pw-img img { width:100%; height:100%; object-fit:contain; mix-blend-mode:multiply; padding:6%; }
        .pw-img-ph { display:flex; align-items:center; justify-content:center; }

        .pw-body { padding:18px 22px 22px; display:flex; flex-direction:column; flex:1; }
        .pw-title {
          font-family:'Cormorant Garamond',Georgia,serif; font-weight:600; font-size:22px;
          line-height:1.15; color:#0A1F44; margin:0 0 16px;
        }

        .pw-specs {
          display:grid; grid-template-columns:1fr 1fr; gap:12px 16px;
          padding:0 0 16px; margin:0 0 16px; border-bottom:1px solid #f0e9da;
        }
        .pw-spec { display:flex; flex-direction:column; gap:4px; }
        .pw-spec span { font-family:'Jost',sans-serif; font-size:9px; font-weight:600; letter-spacing:.14em; text-transform:uppercase; color:#B8893C; }
        .pw-spec b { font-family:'Jost',sans-serif; font-size:14px; font-weight:500; color:#0A1F44; }

        .pw-winner { display:flex; flex-direction:column; gap:4px; margin-bottom:12px; }
        .pw-winner-k { font-family:'Jost',sans-serif; font-size:9px; font-weight:600; letter-spacing:.16em; text-transform:uppercase; color:#B8893C; }
        .pw-winner-v { font-family:'Cormorant Garamond',serif; font-size:18px; font-weight:600; color:#0A1F44; }

        .pw-quote { font-family:'Cormorant Garamond',serif; font-style:italic; font-size:15px; line-height:1.5; color:#5b5a62; margin:0 0 16px; }

        .pw-foot { margin-top:auto; padding-top:6px; }
        .pw-proof { display:flex; flex-wrap:wrap; gap:10px; }
        .pw-proof-btn {
          display:inline-flex; align-items:center; gap:8px; cursor:pointer;
          font-family:'Jost',sans-serif; font-size:10px; font-weight:600; letter-spacing:.12em;
          text-transform:uppercase; padding:10px 16px; border-radius:2px;
          transition:all .2s; border:1px solid transparent;
        }
        .pw-proof-btn--gold { background:#B8893C; color:#fff; }
        .pw-proof-btn--gold:hover { background:#a4782f; transform:translateY(-1px); }
        .pw-proof-btn--ghost { background:transparent; color:#0A1F44; border-color:rgba(10,31,68,.25); }
        .pw-proof-btn--ghost:hover { border-color:#B8893C; color:#B8893C; }
        .pw-archive-tag {
          display:inline-flex; align-items:center; gap:8px;
          font-family:'Jost',sans-serif; font-size:9px; font-weight:600; letter-spacing:.16em;
          text-transform:uppercase; color:#9a8a63;
        }
        .pw-archive-tag::before { content:''; width:14px; height:1px; background:#B8893C; opacity:.6; }

        /* Video modal */
        .pw-vmodal {
          position:fixed; inset:0; z-index:300; background:rgba(7,19,48,.78);
          backdrop-filter:blur(5px); display:flex; align-items:center; justify-content:center; padding:24px;
          animation:pwFade .2s ease;
        }
        @keyframes pwFade { from{ opacity:0 } to{ opacity:1 } }
        .pw-vmodal-inner { position:relative; width:100%; max-width:900px; }
        .pw-vclose {
          position:absolute; top:-42px; right:0; background:none; border:none;
          font-size:34px; line-height:1; color:#fff; cursor:pointer; opacity:.8; transition:opacity .2s;
        }
        .pw-vclose:hover { opacity:1; }
        .pw-vframe {
          position:relative; width:100%; aspect-ratio:16/9; background:#000;
          border-radius:8px; overflow:hidden; box-shadow:0 40px 100px rgba(0,0,0,.6);
          border:1px solid rgba(184,137,60,.3);
        }
        .pw-vframe iframe, .pw-vframe video { position:absolute; inset:0; width:100%; height:100%; border:0; }
        .pw-vlink {
          display:inline-block; margin-top:14px; font-family:'Jost',sans-serif; font-size:11px;
          font-weight:500; letter-spacing:.1em; text-transform:uppercase; color:rgba(255,255,255,.7);
        }
        .pw-vlink:hover { color:#C5A065; }
        @media (max-width:600px){ .pw-vclose{ top:-38px; } }
      `}</style>
    </>
  )
}
