'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Announcement } from '@/lib/announcements'

interface Props {
  announcements: Announcement[]
}

export default function AnnouncementBar({ announcements }: Props) {
  const [index, setIndex]   = useState(0)
  const [visible, setVisible] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const total = announcements.length

  const goTo = useCallback((next: number) => {
    setVisible(false)
    setTimeout(() => {
      setIndex(next)
      setVisible(true)
    }, 220)
  }, [])

  const prev = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    goTo((index - 1 + total) % total)
  }, [index, total, goTo])

  const next = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    goTo((index + 1) % total)
  }, [index, total, goTo])

  // Auto-rotate every 5 s; cancels when user manually navigates
  useEffect(() => {
    if (total <= 1) return
    timerRef.current = setTimeout(() => {
      goTo((index + 1) % total)
    }, 5000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [index, total, goTo])

  if (total === 0) return null

  const msg = announcements[index]
  const inner = (
    <span className={`pwc-ab-text${visible ? '' : ' pwc-ab-text--out'}`}>
      <span className="pwc-ab-gem" aria-hidden="true" />
      {msg.text}
      <span className="pwc-ab-gem" aria-hidden="true" />
    </span>
  )

  return (
    <div className="pwc-ab" role="region" aria-label="Announcements">
      <div className="pwc-ab-inner">

        {total > 1 && (
          <button className="pwc-ab-btn" onClick={prev} aria-label="Previous announcement" type="button">
            <svg width="5" height="9" viewBox="0 0 5 9" fill="none" aria-hidden="true">
              <path d="M4.5 1L1 4.5l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        <div className="pwc-ab-stage">
          {msg.url ? (
            <a href={msg.url} className="pwc-ab-link" tabIndex={0}>
              {inner}
            </a>
          ) : (
            inner
          )}
        </div>

        {total > 1 && (
          <button className="pwc-ab-btn" onClick={next} aria-label="Next announcement" type="button">
            <svg width="5" height="9" viewBox="0 0 5 9" fill="none" aria-hidden="true">
              <path d="M.5 1L4 4.5.5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

      </div>

      {total > 1 && (
        <div className="pwc-ab-pips" aria-hidden="true">
          {announcements.map((_, i) => (
            <span key={i} className={`pwc-ab-pip${i === index ? ' pwc-ab-pip--on' : ''}`} />
          ))}
        </div>
      )}
    </div>
  )
}
