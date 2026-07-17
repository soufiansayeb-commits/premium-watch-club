export interface SocialLink {
  /** Platform name, also the visible label in the footer's Follow column. */
  name: string
  href: string
  ariaLabel: string
}

/** The only platforms PWC actually runs. A platform without a real profile URL
 *  does not belong here — an icon that links nowhere is worse than no icon. */
export const SOCIAL_LINKS: SocialLink[] = [
  {
    name: 'Instagram',
    href: 'https://www.instagram.com/premiumwatch_club/',
    ariaLabel: 'Premium Watch Club on Instagram',
  },
  {
    name: 'Facebook',
    href: 'https://www.facebook.com/profile.php?id=61591950211792',
    ariaLabel: 'Premium Watch Club on Facebook',
  },
  {
    name: 'YouTube',
    href: 'https://www.youtube.com/@Commissiemachine',
    ariaLabel: 'Premium Watch Club on YouTube',
  },
]
