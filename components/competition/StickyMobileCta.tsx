'use client'

import { useEffect } from 'react'

interface Props {
  /** Controls mount/visibility. When false the bar animates out and reserves no space. */
  visible: boolean
  /**
   * Active = a valid choice has been made (Step 1: package chosen; Step 2: the
   * question step). Drives the premium champagne look, the icon + secondary line,
   * and (with `disabled`) whether the CTA is clickable. Inactive = neutral prompt
   * with a muted, non-clickable CTA.
   */
  active: boolean
  /** Left-side glyph (inline SVG). Shown only in the active state. */
  icon: React.ReactNode
  /** Bold primary label. Active: "1 Ticket Selected". Inactive: "Select your tickets". */
  primary: string
  /** Muted secondary label (e.g. "Odds 1:266"). Shown only in the active state. */
  secondary?: string
  /** Button text. Mirrors the in-flow CTA. */
  label: string
  /** Fires the SAME handler as the in-flow Continue button. */
  onClick: () => void
  /** Mirrors the in-flow button's disabled state (no selection, validation, loading). */
  disabled?: boolean
  /** Hide the trailing arrow (inactive state, or while a loading label shows). */
  hideArrow?: boolean
  /** Changing this value replays the subtle bump on the info block (e.g. ticket qty). */
  bumpKey?: string | number
}

/**
 * Mobile-only floating sticky CTA. Purely presentational — it owns no step,
 * validation, cart or pricing logic; it proxies an existing in-flow button.
 * Visibility and active state are fully controlled by the parent.
 */
export default function StickyMobileCta({
  visible,
  active,
  icon,
  primary,
  secondary,
  label,
  onClick,
  disabled = false,
  hideArrow = false,
  bumpKey,
}: Props) {
  // While visible, mark the body so the footer reserves space and the bar never
  // permanently covers content. Cleaned up on hide/unmount.
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.classList.toggle('pwc-sticky-cta', visible)
    return () => document.body.classList.remove('pwc-sticky-cta')
  }, [visible])

  const showArrow = active && !hideArrow

  return (
    <div
      className={`sticky-cta${visible ? ' is-visible' : ''}${active ? ' is-active' : ' is-inactive'}`}
      aria-hidden={!visible}
    >
      {/* Keyed on active+bumpKey so activation and package changes replay the bump */}
      <div key={`${active}-${bumpKey}`} className="sticky-cta-info">
        {active && <span className="sticky-cta-icon" aria-hidden="true">{icon}</span>}
        <span className="sticky-cta-text">
          <span className="sticky-cta-primary">{primary}</span>
          {active && secondary && <span className="sticky-cta-secondary">{secondary}</span>}
        </span>
      </div>
      <button
        className={`sticky-cta-btn${active ? '' : ' is-inactive'}`}
        onClick={onClick}
        disabled={disabled}
        aria-disabled={disabled}
        tabIndex={visible && !disabled ? 0 : -1}
      >
        {label}
        {showArrow && (
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </div>
  )
}
