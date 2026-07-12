// lib/past-winners.ts — Server-side only. Never import in client components.
//
// Maps WooCommerce products (with the Winner Archive ACF fields) into a clean
// PastWinner type, and exposes the two filtered/sorted feeds:
//   • getPastWinners()     → /past-winners page  (closed + show_on_past_winners)
//   • getHomepageWinners() → homepage carousel    (closed + show_on_homepage_winners + winner_photo)
//
// Nothing is hardcoded — everything comes from WooCommerce product + ACF data.

import { fetchWooProducts, resolveWpMediaUrl } from './woocommerce'
import type { WooProduct } from './woocommerce'

export interface PastWinner {
  id:                    number
  slug:                  string
  /** Public display title. For archive products this is `past_winner_public_prize_title`; falls back to WooCommerce product name. */
  title:                 string
  productImage:          string | null
  galleryImages:         string[]
  /** Best image for the Past Winners card (fallback chain applied). */
  cardImage:             string | null
  status:                string            // 'Closed' | 'Sold Out' | …
  drawNumber?:           string
  drawDate?:             string            // raw ACF value
  drawDateDisplay:       string            // "10 June 2026"
  prizeValue?:           number
  prizeValueDisplay?:    string            // "£15,000"
  ticketsSold?:          number
  totalTickets?:         number
  winnerDisplayName?:    string
  winnerLocation?:       string
  winnerPhoto?:          string            // resolved URL (homepage uses ONLY this)
  winnerTestimonial?:    string
  winnerArchiveType?:    string
  correctAnswer?:        string            // shown publicly — competition is closed
  winningEntryNumber?:   string
  liveDrawUrl?:          string
  drawCertificateUrl?:   string
  proofStatus?:          string
  pastWinnerCardImage?:  string
  showOnHomepageWinners: boolean
  homepageWinnerQuote?:  string
  homepageWinnerOrder?:  number
  /** True only when a real proof URL exists and proof_status isn't 'no_public_proof'. */
  hasProof:              boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDrawDate(raw?: string): string {
  if (!raw) return ''
  let iso = raw.trim()
  if (/^\d{8}$/.test(iso)) iso = `${iso.slice(0, 4)}-${iso.slice(4, 6)}-${iso.slice(6, 8)}`
  const d = new Date(iso)
  if (isNaN(d.getTime())) return raw
  try {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
  } catch {
    return raw
  }
}

function drawTime(raw?: string): number {
  if (!raw) return 0
  let iso = raw.trim()
  if (/^\d{8}$/.test(iso)) iso = `${iso.slice(0, 4)}-${iso.slice(4, 6)}-${iso.slice(6, 8)}`
  const t = new Date(iso).getTime()
  return isNaN(t) ? 0 : t
}

async function resolveImg(url?: string, id?: number): Promise<string | undefined> {
  if (url) return url
  if (id) return await resolveWpMediaUrl(id)
  return undefined
}

async function mapPastWinner(p: WooProduct): Promise<PastWinner> {
  const winnerPhoto   = await resolveImg(p.winner_photo, p.winner_photo_id)
  const cardImageAcf  = await resolveImg(p.past_winner_card_image, p.past_winner_card_image_id)

  const productImage  = p.images[0]?.src ?? null
  const galleryImages = p.images.map(i => i.src).filter((s): s is string => !!s)

  // Card image fallback chain (page cards): dedicated card → winner photo →
  // product image → first gallery image → (placeholder handled in the UI).
  const cardImage =
    cardImageAcf ??
    winnerPhoto ??
    productImage ??
    galleryImages[1] ??
    null

  const prizeValue = p.prize_value
  const prizeValueDisplay =
    typeof prizeValue === 'number' && prizeValue > 0
      ? `$${prizeValue.toLocaleString('en-US')}`
      : undefined

  // A filled proof URL always shows its button — an explicit admin action wins.
  // proof_status only matters for the "Archive Winner" label when no URL exists.
  const hasProof = !!p.live_draw_url || !!p.draw_certificate_url

  // For archive products the WooCommerce name is admin-only (e.g. "PAST WINNER 001").
  // Use the ACF public title field instead; fall back to the product name only if unset.
  const publicTitle = p.past_winner_public_prize_title || p.name

  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[PWC mapPastWinner] #${p.id} "${p.name}"\n` +
      `  past_winner_public_prize_title = ${JSON.stringify(p.past_winner_public_prize_title)}\n` +
      `  → publicTitle resolved   = "${publicTitle}"` +
      (p.past_winner_public_prize_title ? '' : '  ⚠ ACF field missing — showing WooCommerce product name')
    )
  }

  return {
    id:                    p.id,
    slug:                  p.slug,
    title:                 publicTitle,
    productImage,
    galleryImages,
    cardImage,
    status:                p.competition_status ?? 'Closed',
    drawNumber:            p.draw_number,
    drawDate:              p.draw_date,
    drawDateDisplay:       formatDrawDate(p.draw_date),
    prizeValue,
    prizeValueDisplay,
    // For a closed/drawn competition with no explicit tickets_sold, fall back to
    // total_tickets (all entries were available at draw time).
    ticketsSold:           p.tickets_sold ?? p.total_tickets ?? p.total_entries,
    totalTickets:          p.total_tickets ?? p.total_entries,
    winnerDisplayName:     p.winner_display_name,
    winnerLocation:        p.winner_location,
    winnerPhoto,
    winnerTestimonial:     p.winner_testimonial,
    winnerArchiveType:     p.winner_archive_type,
    correctAnswer:         p.correct_answer,
    winningEntryNumber:    p.winning_entry_number,
    liveDrawUrl:           p.live_draw_url,
    drawCertificateUrl:    p.draw_certificate_url,
    proofStatus:           p.proof_status,
    pastWinnerCardImage:   p.past_winner_card_image,
    showOnHomepageWinners: p.show_on_homepage_winners === true,
    homepageWinnerQuote:   p.homepage_winner_quote,
    homepageWinnerOrder:   p.homepage_winner_order,
    hasProof,
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Past Winners page feed: closed competitions flagged show_on_past_winners.
 * Sorted by draw_date descending (fallback: product id descending).
 */
export async function getPastWinners(): Promise<PastWinner[]> {
  const { products } = await fetchWooProducts()
  const filtered = products.filter(
    p => p.competition_status === 'Closed' && p.show_on_past_winners === true
  )
  const mapped = await Promise.all(filtered.map(mapPastWinner))
  return mapped.sort((a, b) => {
    const dt = drawTime(b.drawDate) - drawTime(a.drawDate)
    return dt !== 0 ? dt : b.id - a.id
  })
}

/**
 * Homepage winners carousel feed: closed competitions flagged
 * show_on_homepage_winners AND with a real winner_photo (never a product image).
 * Sorted by homepage_winner_order ascending (fallback: draw_date descending).
 */
export async function getHomepageWinners(): Promise<PastWinner[]> {
  const { products } = await fetchWooProducts()
  const filtered = products.filter(
    p => p.competition_status === 'Closed' && p.show_on_homepage_winners === true
  )
  const mapped = await Promise.all(filtered.map(mapPastWinner))
  return mapped
    .filter(w => !!w.winnerPhoto) // homepage requires a real winner photo
    .sort((a, b) => {
      const ao = a.homepageWinnerOrder ?? Number.POSITIVE_INFINITY
      const bo = b.homepageWinnerOrder ?? Number.POSITIVE_INFINITY
      if (ao !== bo) return ao - bo
      return drawTime(b.drawDate) - drawTime(a.drawDate)
    })
}
