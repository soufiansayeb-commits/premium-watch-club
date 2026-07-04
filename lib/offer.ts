// lib/offer.ts — Server-side data fetch + pure CTA resolver.
// getActiveOffer() is server-only (uses fetch). resolveOfferCtaHref() is a pure
// helper safe to call from any server component.
//
// Fetches the single active PWC Offer campaign from WordPress.
// The WP endpoint (/wp-json/pwc/v1/active-offer) already applies the
// offer_enabled + offer_is_active gate and resolves product/background images,
// so the frontend just consumes clean, typed JSON. Returns null when no offer
// is active — every consumer must treat null as "hide the offer UI".

import type { Competition } from './competition-data'

export type OfferCtaLinkType = 'special_product' | 'weekly_product' | 'custom_url'

export interface OfferBar {
  enabled: boolean
  text: string | null
  subtext: string | null
  timer_enabled: boolean
  timer_end_date: string | null   // UTC ISO 8601, or null
  primary_color: string | null
  hover_color: string | null
}

export interface ActiveOffer {
  id: number
  variant: string | null

  // Dynamic product images (null → frontend falls back to live special/weekly comps)
  special_product_image: string | null
  special_product_url: string | null
  weekly_product_image: string | null
  weekly_product_url: string | null

  // Copy
  eyebrow: string | null
  headline: string | null
  highlight: string | null
  subheadline: string | null
  body_copy: string | null
  discount_percentage: number | null
  cta_text: string | null
  cta_link_type: OfferCtaLinkType | null
  custom_cta_url: string | null

  // Design (any field may be null → component applies safe PWC defaults)
  colors: {
    primary: string | null
    secondary: string | null
    background: string | null
    text: string | null
  }
  background_image: string | null

  benefits: string[]

  bar: OfferBar
}

const STORE_URL = process.env.WOOCOMMERCE_STORE_URL ?? ''

/**
 * Fetch the active PWC Offer, or null if none is active / on any error.
 * Uses the same ISR cadence as announcements: 5 s in dev, 60 s in prod, so
 * edits in WordPress (copy, colours, timer, products, CTA) appear without a
 * code change or redeploy.
 */
export async function getActiveOffer(): Promise<ActiveOffer | null> {
  if (!STORE_URL) return null
  try {
    const res = await fetch(`${STORE_URL}/wp-json/pwc/v1/active-offer`, {
      next: { revalidate: process.env.NODE_ENV === 'development' ? 5 : 60 },
    })
    if (!res.ok) return null
    const data: unknown = await res.json()
    // Endpoint returns null (no active offer) or the offer object.
    if (!data || typeof data !== 'object') return null
    const offer = data as ActiveOffer
    if (!offer.id) return null
    return offer
  } catch {
    return null
  }
}

/**
 * Resolve the offer CTA to a real destination — shared by the offer bar and the
 * offer section so both always point at the same place.
 *  - special_product → the live Special competition page (fallback /special)
 *  - weekly_product  → the live Weekly competition page (fallback /weekly)
 *  - custom_url      → the ACF custom URL
 */
export function resolveOfferCtaHref(
  offer: ActiveOffer | null,
  special: Competition | null,
  weekly: Competition | null,
): string {
  if (!offer) return '/special'
  if (offer.cta_link_type === 'custom_url' && offer.custom_cta_url) return offer.custom_cta_url
  if (offer.cta_link_type === 'weekly_product') return weekly?.ctaLink || '/weekly'
  return special?.ctaLink || '/special'
}
