import Link from 'next/link'
import { journalArticles } from '@/lib/journal-data'

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

const DoubleWatchIcon = () => (
  <svg width="80" height="64" viewBox="0 0 130 100" fill="none" opacity="0.5">
    <circle cx="36" cy="50" r="30" stroke="#0A1F44" strokeWidth="1.5" />
    <circle cx="36" cy="50" r="20" fill="white" stroke="#C5A065" strokeWidth="0.8" />
    <circle cx="94" cy="50" r="30" stroke="#0A1F44" strokeWidth="1.5" />
    <circle cx="94" cy="50" r="20" fill="white" stroke="#C5A065" strokeWidth="0.8" />
    <rect x="34.5" y="34" width="3" height="18" rx="1.5" fill="#0A1F44" transform="rotate(-20 36 50)" />
    <rect x="35" y="28" width="2" height="24" rx="1" fill="#0A1F44" transform="rotate(30 36 50)" />
    <rect x="92.5" y="34" width="3" height="18" rx="1.5" fill="#0A1F44" transform="rotate(10 94 50)" />
    <rect x="93" y="28" width="2" height="24" rx="1" fill="#0A1F44" transform="rotate(-25 94 50)" />
  </svg>
)

const placeholders = [<WatchFaceIcon key="a" />, <DoubleWatchIcon key="b" />]

export default function JournalPreview() {
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
          {journalArticles.map((article, i) => (
            <Link
              key={article.slug}
              href={`/journal/${article.slug}`}
              className={`journal-card reveal${i > 0 ? ` d${i}` : ''}`}
            >
              <div className="journal-card-image">
                {article.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={article.image} alt={article.title} />
                ) : (
                  <div className="journal-card-placeholder">
                    {placeholders[(i - 1) % placeholders.length]}
                  </div>
                )}
              </div>
              <div className="journal-card-body">
                <div className="journal-category">{article.category}</div>
                <h3 className="journal-title">{article.title}</h3>
                <p className="journal-excerpt">{article.excerpt}</p>
                <div className="journal-meta">
                  <span className="journal-read-time">{article.readTime}</span>
                  <span className="journal-read-more">
                    Read article <span aria-hidden>→</span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
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
