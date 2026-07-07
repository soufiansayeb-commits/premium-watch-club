'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  /** Percentage of entries sold (0–100). Same value the homepage hero uses. */
  soldPercentage: number
  /** Live entries remaining for this competition. */
  ticketsLeft: number
  className?: string
}

/**
 * Reusable sold / tickets-left scarcity meter.
 *
 * Shares the homepage hero's red treatment but adapted for a light surface so it
 * sits natively inside the PDP entry card. The fill animates from 0 → sold% the
 * first time it scrolls into view, matching the hero's reveal behaviour. Purely
 * presentational — it renders whatever sold%/ticketsLeft the PDP already computes.
 */
export default function SoldProgress({ soldPercentage, ticketsLeft, className }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { threshold: 0.35 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const pct = Math.max(0, Math.min(100, soldPercentage))

  return (
    <div ref={ref} className={`sp-wrap${className ? ` ${className}` : ''}`}>
      <div className="sp-meta">
        <span className="sp-dot" aria-hidden="true" />
        <span className="sp-label">
          {pct}% SOLD, {ticketsLeft} TICKETS LEFT
        </span>
      </div>
      <div
        className="sp-track"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${pct}% of entries sold, ${ticketsLeft} tickets left`}
      >
        <div className="sp-fill" style={{ width: visible ? `${pct}%` : '0%' }} />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .sp-wrap { margin-bottom: 22px; }
        .sp-meta { display: flex; align-items: center; gap: 9px; margin-bottom: 10px; }
        .sp-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--red); flex-shrink: 0;
          box-shadow: 0 0 0 0 rgba(225,90,76,0.55);
          animation: sp-pulse 2.2s ease-in-out infinite;
        }
        .sp-label {
          font-family: var(--font-sans);
          font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--red);
        }
        .sp-track {
          height: 7px; border-radius: 4px; overflow: hidden; position: relative;
          background: rgba(10,31,68,0.08);
        }
        .sp-fill {
          height: 100%; border-radius: 4px;
          background: linear-gradient(90deg, var(--red-dark), var(--red), var(--red-light));
          box-shadow: 0 0 12px rgba(225,90,76,0.4);
          position: relative; overflow: hidden;
          transition: width 1.6s cubic-bezier(0.22,1,0.36,1) 0.15s;
        }
        .sp-fill::after {
          content: ''; position: absolute; inset: 0; width: 45%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          animation: sp-shine 3s ease-in-out infinite 1s;
        }
        @keyframes sp-pulse {
          0%   { box-shadow: 0 0 0 0   rgba(225,90,76,0.6); }
          70%  { box-shadow: 0 0 0 8px rgba(225,90,76,0);   }
          100% { box-shadow: 0 0 0 0   rgba(225,90,76,0);   }
        }
        @keyframes sp-shine {
          0%   { transform: translateX(-120%); }
          60%  { transform: translateX(260%);  }
          100% { transform: translateX(260%);  }
        }
        @media (prefers-reduced-motion: reduce) {
          .sp-dot { animation: none; }
          .sp-fill { transition: none; }
          .sp-fill::after { animation: none; }
        }
      ` }} />
    </div>
  )
}
