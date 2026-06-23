import Image from 'next/image'
import Link from 'next/link'
import { getJournalPosts } from '@/lib/wordpress-journal'

const WatchFaceIcon = () => (
  <svg width="80" height="80" viewBox="0 0 120 120" fill="none" opacity="0.55">
    <circle cx="60" cy="60" r="52" stroke="#0A1F44" strokeWidth="1.5" />
    <circle cx="60" cy="60" r="40" stroke="#C5A065" strokeWidth="0.8" fill="none" />
    <rect x="57" y="12" width="6" height="14" rx="1.5" fill="#C5A065" />
    <rect x="57" y="94" width="6" height="14" rx="1.5" fill="#C5A065" />
    <rect x="12" y="57" width="14" height="6" rx="1.5" fill="#C5A065" />
    <rect x="94" y="57" width="14" height="6" rx="1.5" fill="#C5A065" />
    <rect x="58" y="30" width="4" height="32" rx="2" fill="#0A1F44" transform="rotate(-28 60 60)" />
    <rect x="59" y="24" width="2.5" height="40" rx="1.2" fill="#0A1F44" transform="rotate(22 60 60)" />
    <circle cx="60" cy="60" r="5" fill="#C5A065" />
  </svg>
)

export default async function JournalPreview() {
  const posts = await getJournalPosts(3)
  if (posts.length === 0) return null

  return (
    <section id="journal" className="journal-section">
      <div className="container">
        <div className="section-header reveal">
          <div className="section-eyebrow">Journal</div>
          <h2 className="section-headline">Stories, guides &amp; watch culture</h2>
          <p className="section-sub">
            Expert guides, winner stories and watch collecting advice from the PWC editorial team.
          </p>
        </div>

        <div className="journal-grid">
          {posts.map((post, i) => {
            // Prefer WP featured image; fall back to first product image
            const cardImage = post.featuredImage ?? post.relatedProduct?.images[0] ?? null
            const isProductImage = !post.featuredImage && !!cardImage

            return (
              <Link
                key={post.slug}
                href={`/journal/${post.slug}`}
                className={`journal-card reveal${i > 0 ? ` d${i}` : ''}`}
              >
                <div className={`journal-card-image${isProductImage ? ' journal-card-image--product' : ' journal-card-image--editorial'}`}>
                  {cardImage ? (
                    <Image
                      src={cardImage}
                      alt={post.title}
                      fill
                      style={{ objectFit: isProductImage ? 'contain' : 'cover' }}
                      sizes="(max-width: 700px) 100vw, (max-width: 1100px) 33vw, 360px"
                    />
                  ) : (
                    <div className="journal-card-placeholder">
                      <WatchFaceIcon />
                    </div>
                  )}
                </div>
                <div className="journal-card-body">
                  <div className="journal-category">{post.category}</div>
                  <h3 className="journal-title">{post.title}</h3>
                  <p className="journal-excerpt">{post.excerpt}</p>
                  <div className="journal-meta">
                    <span className="journal-read-time">{post.dateFormatted}</span>
                    <span className="journal-read-more">
                      Read article <span aria-hidden>→</span>
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="journal-all-wrap">
          <Link href="/journal" className="journal-all-btn">
            All Articles
          </Link>
        </div>
      </div>
    </section>
  )
}
