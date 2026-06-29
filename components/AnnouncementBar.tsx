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

  // Auto-rotate every 10 s; cancels when user manually navigates
  useEffect(() => {
    if (total <= 1) return
    timerRef.current = setTimeout(() => {
      goTo((index + 1) % total)
    }, 10000)
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
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none" aria-hidden="true">
              <path d="M6 1L1 6l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none" aria-hidden="true">
              <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

      </div>
    </div>
  )
}
