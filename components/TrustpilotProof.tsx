import Image from 'next/image'
import { COMPANY_STATS } from '@/lib/company-stats'

interface Props {
  /** Extra class for context-specific spacing (e.g. 'tp-proof--mobile'). */
  className?: string
  /**
   * 'stacked' (default) — the 2-row lockup (wordmark over 5 stars).
   * 'inline' — wordmark and 5 stars on a single row, for tight inline rows like
   * the buy-box price line.
   */
  variant?: 'stacked' | 'inline'
}

/**
 * Compact review-proof block — 5 green stars + review count.
 * Uses the approved "Based on 1,247 reviews" wording. The brand wordmark is
 * intentionally omitted site-wide; the stars-only asset carries the rating.
 * Reused on the competition PDP (mobile above the gallery, desktop in the buy box).
 * `variant` is kept for layout callers ('inline' rows vs 'stacked') — both render
 * the same stars + count lockup.
 */
export default function TrustpilotProof({ className = '', variant = 'stacked' }: Props) {
  return (
    <div className={`tp-proof tp-proof--${variant}${className ? ` ${className}` : ''}`}>
      <Image
        src="/brand-assets/trustpilot-stars.png"
        alt="Rated 5 out of 5 stars"
        width={935}
        height={180}
        className="tp-proof-stars"
        priority={false}
      />
      <span className="tp-proof-count">Based on {COMPANY_STATS.trustpilotReviews} reviews</span>
    </div>
  )
}
