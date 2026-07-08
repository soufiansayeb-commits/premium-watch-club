import Image from 'next/image'

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
 * Compact Trustpilot proof block — logo (with 5 stars) + review count.
 * Uses the approved assets and the approved "Based on 1,247 reviews" wording.
 * Reused on the competition PDP (mobile above the gallery, desktop in the buy box).
 */
export default function TrustpilotProof({ className = '', variant = 'stacked' }: Props) {
  return (
    <div className={`tp-proof${className ? ` ${className}` : ''}`}>
      {variant === 'inline' ? (
        <>
          <Image
            src="/brand-assets/trustpilot-wordmark.png"
            alt="Trustpilot"
            width={935}
            height={236}
            className="tp-proof-wordmark"
            priority={false}
          />
          <Image
            src="/brand-assets/trustpilot-stars.png"
            alt="Rated 5 out of 5"
            width={935}
            height={180}
            className="tp-proof-stars"
            priority={false}
          />
        </>
      ) : (
        <Image
          src="/brand-assets/trustpilot-logo.png"
          alt="Trustpilot — rated 5 out of 5"
          width={1048}
          height={453}
          className="tp-proof-logo"
          priority={false}
        />
      )}
      <span className="tp-proof-count">Based on 1,247 reviews</span>
    </div>
  )
}
