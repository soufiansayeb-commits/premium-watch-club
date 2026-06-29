import Image from 'next/image'

interface Props {
  /** Extra class for context-specific spacing (e.g. 'tp-proof--mobile'). */
  className?: string
}

/**
 * Compact Trustpilot proof block — logo (with 5 stars) + review count.
 * Uses the approved asset and the approved "Based on 1,247 reviews" wording.
 * Reused on the competition PDP (mobile above the gallery, desktop in the buy box).
 */
export default function TrustpilotProof({ className = '' }: Props) {
  return (
    <div className={`tp-proof${className ? ` ${className}` : ''}`}>
      <Image
        src="/brand-assets/trustpilot-logo.png"
        alt="Trustpilot — rated 5 out of 5"
        width={1048}
        height={453}
        className="tp-proof-logo"
        priority={false}
      />
      <span className="tp-proof-count">Based on 1,247 reviews</span>
    </div>
  )
}
