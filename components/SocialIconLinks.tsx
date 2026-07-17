import { SOCIAL_LINKS } from '@/lib/social'

/** Icon artwork keyed by platform name, matching SOCIAL_LINKS. */
const ICONS: Record<string, (size: number) => React.ReactNode> = {
  Instagram: size => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" />
    </svg>
  ),
  Facebook: size => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3V2z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  YouTube: size => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 9l6 3-6 3V9z" fill="currentColor" />
    </svg>
  ),
}

interface Props {
  /** Class for the wrapping row. */
  className?: string
  /** Class for each icon link. */
  itemClassName?: string
  /** Rendered icon size in px. */
  size?: number
}

export default function SocialIconLinks({
  className = 'social-row',
  itemClassName = 'social-btn',
  size = 15,
}: Props) {
  return (
    <div className={className}>
      {SOCIAL_LINKS.map(social => (
        <a
          key={social.name}
          href={social.href}
          className={itemClassName}
          aria-label={social.ariaLabel}
          target="_blank"
          rel="noopener noreferrer"
        >
          {ICONS[social.name](size)}
        </a>
      ))}
    </div>
  )
}
