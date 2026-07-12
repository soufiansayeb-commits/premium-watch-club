// lib/wordpress-journal.ts — Server-side only. Never import in client components.

import { fetchWooProductById, fetchWooProducts } from './woocommerce'
import type { WooProduct } from './woocommerce'
import {
  getCompetitionCtaUrl,
  getCompetitionCtaLabel,
  deriveCtaState,
} from './competition-status'
import type { CompetitionCtaState } from './competition-status'

const STORE_URL  = process.env.WOOCOMMERCE_STORE_URL ?? ''
const REVALIDATE = process.env.NODE_ENV === 'development' ? 5 : 60

// ── Raw WordPress REST API shape ───────────────────────────────────────────────

interface WpPostObject {
  ID: number
  post_title?: string
  post_name?:  string
}

interface WpPost {
  id: number
  slug: string
  date: string
  title:   { rendered: string }
  excerpt: { rendered: string }
  content: { rendered: string }
  featured_image_url?: string | null
  // ACF fields (present when ACF REST API is enabled)
  acf?: {
    related_competition_product?: number | WpPostObject | false | null
  }
  _embedded?: {
    'wp:featuredmedia'?: Array<{ source_url: string; alt_text?: string }>
    'wp:term'?:         Array<Array<{ name: string }>>
    author?:            Array<{ name: string }>
  }
}

// ── Public types ───────────────────────────────────────────────────────────────

const COMPETITION_LABELS: Record<string, string> = {
  weekly:  'Weekly Drop',
  monthly: 'Monthly Drop',
  special: 'Special Drop',
  starter: 'Competition',
}

export interface RelatedProduct {
  id:               number
  title:            string
  slug:             string
  price:            string      // raw string e.g. "95.00"
  entryPrice:       number      // numeric
  currency:         string      // "$"
  images:           string[]    // up to 4 image URLs, ordered
  competitionType:  string
  competitionLabel: string      // "Weekly Drop" etc.
  competitionStatus:string
  ctaUrl:           string      // status-aware: live/sold-out → PDP, closed → archive
  ctaState:         CompetitionCtaState // 'enter' | 'sold-out' | 'closed'
  ctaLabel:         string      // status-aware button label
}

export interface JournalPost {
  id:             number
  slug:           string
  title:          string
  excerpt:        string        // plain text
  content:        string        // WordPress HTML — render with dangerouslySetInnerHTML
  date:           string        // ISO
  dateFormatted:  string        // e.g. "11 June 2026"
  readTime:       number        // estimated minutes to read
  featuredImage:  string | null
  author:         string
  category:       string
  relatedProduct: RelatedProduct | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .trim()
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function extractRelatedProductId(raw: WpPost): number | null {
  const field = raw.acf?.related_competition_product
  if (!field) return null
  if (typeof field === 'number' && field > 0) return field
  if (typeof field === 'object' && 'ID' in field && field.ID > 0) return field.ID
  return null
}

/**
 * Build the public RelatedProduct shape from a resolved WooCommerce product.
 * images[0] = main product image, images[1+] = WooCommerce product gallery images.
 */
function buildRelatedProduct(product: WooProduct): RelatedProduct {
  const type     = product.competition_type ?? 'starter'
  const label    = COMPETITION_LABELS[type] ?? 'Competition'
  const price    = product.price            ?? '0'
  const priceNum = parseFloat(price) || 0

  const allImages = product.images
    .map(img => img.src)
    .filter((src): src is string => !!src)

  // Status-aware CTA: live & sold-out → PDP, closed → archive (never purchasable).
  const status      = product.competition_status ?? 'Live'
  const ticketsLeft = product.stock_quantity
  const ctaState    = deriveCtaState(status, ticketsLeft)

  return {
    id:                product.id,
    title:             product.name,
    slug:              product.slug,
    price,
    entryPrice:        priceNum,
    currency:          '$',
    images:            allImages,       // all images: [main, ...gallery]
    competitionType:   type,
    competitionLabel:  label,
    competitionStatus: status,
    ctaUrl:            getCompetitionCtaUrl(product.slug, status, ticketsLeft),
    ctaState,
    ctaLabel:          getCompetitionCtaLabel(status, ticketsLeft),
  }
}

/**
 * Primary resolver: fetch the WooCommerce product by its ACF-linked ID.
 */
async function resolveRelatedProduct(productId: number): Promise<RelatedProduct | null> {
  try {
    const { product } = await fetchWooProductById(productId)
    if (!product) return null

    const related = buildRelatedProduct(product)

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[PWC Journal] resolveRelatedProduct (ACF) #${productId} "${product.name}"\n` +
        `  Total images from WooCommerce: ${related.images.length}\n` +
        related.images.map((src, i) => `  [${i}] ${src}`).join('\n')
      )
    }
    return related
  } catch {
    return null
  }
}

/**
 * Normalise a WordPress image URL to its base attachment filename.
 * Strips the directory path, extension, WordPress's "-WIDTHxHEIGHT" resize
 * suffix and the "-scaled" suffix WordPress adds to large originals, so a sized
 * featured image (…-1024x1024.webp) and the full-size product image
 * (…-scaled.webp / ….webp) reduce to the same comparable key.
 */
function normalizeImageName(url: string): string {
  if (!url) return ''
  const file = url.split('?')[0].split('/').pop() ?? ''
  return file
    .replace(/\.[a-z0-9]+$/i, '') // drop extension
    .replace(/-\d+x\d+$/i, '')    // drop "-1024x1024" size suffix
    .replace(/-scaled$/i, '')     // drop WordPress "-scaled" large-original suffix
    .toLowerCase()
}

/** Words ignored when matching a journal title to a product name. */
const TITLE_STOPWORDS = new Set([
  'the','a','an','and','or','of','to','in','on','for','with','why','how','still',
  'remains','is','it','its','this','that','vs','x','at','as','by','from','watch',
  'watches','luxury','sport','colour','color','hype','energy','wrist','icon',
  'defines','define','story','behind','guide','review','about',
])

/** Significant lowercase tokens from a piece of text (≥3 chars, no stopwords). */
function significantTokens(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter(t => t.length >= 3 && !TITLE_STOPWORDS.has(t))
}

/**
 * Fallback resolver: when the ACF related-product relationship is not exposed
 * through the WordPress REST API (acf:[]), recover the related competition by
 *  1. matching the journal's featured image to the product that uses the same
 *     image attachment (deterministic — preferred), then
 *  2. matching significant words in the journal title against the product name
 *     (handles posts whose featured image differs from the product image).
 * General — no product-specific hardcoding.
 *
 * fetchWooProducts() is request-memoised by Next.js, so calling this for several
 * posts in one render performs a single underlying WooCommerce request.
 */
async function resolveProductByMeta(
  featuredImageUrl: string | null,
  title: string | null,
): Promise<RelatedProduct | null> {
  try {
    const { products } = await fetchWooProducts()
    if (products.length === 0) return null

    // ── 1. Deterministic featured-image match ────────────────────────────────
    const imgTarget = featuredImageUrl ? normalizeImageName(featuredImageUrl) : ''
    if (imgTarget) {
      const byImage = products.find(p =>
        p.images.some(img => normalizeImageName(img.src) === imgTarget)
      )
      if (byImage) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[PWC Journal] resolveProductByMeta image="${imgTarget}" → matched #${byImage.id} "${byImage.name}" (${byImage.images.length} images)`)
        }
        return buildRelatedProduct(byImage)
      }
    }

    // ── 2. Title ↔ product-name token overlap ────────────────────────────────
    if (title) {
      const titleTokens = new Set(significantTokens(title))
      let best: { product: WooProduct; score: number } | null = null
      let runnerUp = 0

      for (const p of products) {
        const nameTokens = significantTokens(p.name)
        if (nameTokens.length === 0) continue
        const score = nameTokens.filter(t => titleTokens.has(t)).length
        if (!best || score > best.score) {
          runnerUp = best ? best.score : 0
          best = { product: p, score }
        } else if (score > runnerUp) {
          runnerUp = score
        }
      }

      // Require a confident, unambiguous match: ≥2 shared words and a clear lead.
      if (best && best.score >= 2 && best.score > runnerUp) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[PWC Journal] resolveProductByMeta title="${title}" → matched #${best.product.id} "${best.product.name}" (score ${best.score} vs runner-up ${runnerUp})`)
        }
        return buildRelatedProduct(best.product)
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`[PWC Journal] resolveProductByMeta no confident match for image="${imgTarget || '(none)'}" / title="${title}"`)
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Resolve the related competition product for a journal post.
 * 1. Prefer the ACF related_competition_product ID (when exposed via REST).
 * 2. Fall back to matching by featured image, then by title ↔ product name.
 */
async function resolveRelated(
  productId: number | null,
  featuredImageUrl: string | null,
  title: string | null,
): Promise<RelatedProduct | null> {
  if (productId) {
    const byId = await resolveRelatedProduct(productId)
    if (byId) return byId
  }
  return resolveProductByMeta(featuredImageUrl, title)
}

// Split map from async resolution so we can use Promise.all
function mapPostBase(raw: WpPost) {
  const featuredImage =
    raw.featured_image_url ??
    raw._embedded?.['wp:featuredmedia']?.[0]?.source_url ??
    null

  const category = raw._embedded?.['wp:term']?.[0]?.[0]?.name ?? 'Journal'
  const author    = raw._embedded?.author?.[0]?.name            ?? 'PWC Editorial Team'

  // Estimated read time: ~200 words/min, floor of 1 minute.
  const wordCount = stripHtml(raw.content.rendered).split(/\s+/).filter(Boolean).length
  const readTime  = Math.max(1, Math.round(wordCount / 200))

  return {
    id:            raw.id,
    slug:          raw.slug,
    title:         stripHtml(raw.title.rendered),
    excerpt:       stripHtml(raw.excerpt.rendered),
    content:       raw.content.rendered,
    date:          raw.date,
    dateFormatted: formatDate(raw.date),
    readTime,
    featuredImage,
    author,
    category,
    _productId:    extractRelatedProductId(raw),
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Fetch published journal posts, newest first.
 * Resolves related WooCommerce product for each post in parallel.
 */
export async function getJournalPosts(limit = 100): Promise<JournalPost[]> {
  if (!STORE_URL) return []
  try {
    const url = `${STORE_URL}/wp-json/wp/v2/journal?status=publish&per_page=${limit}&orderby=date&order=desc&_embed=true`
    const res = await fetch(url, { next: { revalidate: REVALIDATE } })
    if (!res.ok) return []
    const data: WpPost[] = await res.json()
    if (!Array.isArray(data)) return []

    return Promise.all(
      data.map(async raw => {
        const { _productId, ...base } = mapPostBase(raw)
        const relatedProduct = await resolveRelated(_productId, base.featuredImage, base.title)
        return { ...base, relatedProduct } as JournalPost
      })
    )
  } catch {
    return []
  }
}

/**
 * Fetch a single published journal post by slug.
 */
export async function getJournalPost(slug: string): Promise<JournalPost | null> {
  if (!STORE_URL) return null
  try {
    const url = `${STORE_URL}/wp-json/wp/v2/journal?slug=${encodeURIComponent(slug)}&status=publish&_embed=true`
    const res = await fetch(url, { next: { revalidate: REVALIDATE } })
    if (!res.ok) return null
    const data: WpPost[] = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null

    const { _productId, ...base } = mapPostBase(data[0])
    const relatedProduct = await resolveRelated(_productId, base.featuredImage, base.title)
    return { ...base, relatedProduct } as JournalPost
  } catch {
    return null
  }
}

/**
 * Fetch related journal posts for the "You may also like" section:
 * latest published posts, excluding the current one.
 */
export async function getRelatedJournalPosts(
  currentSlug: string,
  limit = 3,
): Promise<JournalPost[]> {
  const posts = await getJournalPosts(limit + 1)
  return posts.filter(p => p.slug !== currentSlug).slice(0, limit)
}
