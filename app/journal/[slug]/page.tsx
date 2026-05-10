import { notFound } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { journalArticles, getArticleBySlug } from '@/lib/journal-data'

export function generateStaticParams() {
  return journalArticles.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const article = getArticleBySlug(params.slug)
  if (!article) return {}
  return {
    title: `${article.title} — PWC Journal`,
    description: article.excerpt,
  }
}

const WatchFaceIcon = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none" opacity="0.4">
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

export default function JournalArticlePage({ params }: { params: { slug: string } }) {
  const article = getArticleBySlug(params.slug)
  if (!article) notFound()

  return (
    <>
      <Header />

      <article className="article-page">
        <div className="article-hero">
          <div className="container">
            <Link href="/journal" className="article-back">
              ← Back to Journal
            </Link>
            <div className="journal-category">{article.category}</div>
            <h1 className="article-headline">{article.title}</h1>
            <p className="article-lead">{article.excerpt}</p>
            <div className="article-byline">
              <span className="article-read-time">{article.readTime}</span>
              <span className="article-byline-dot" aria-hidden>·</span>
              <span className="article-author">PWC Editorial Team</span>
            </div>
          </div>
        </div>

        <div className="article-visual-wrap">
          <div className="container">
            <div className="article-visual">
              {article.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={article.image} alt={article.title} className="article-visual-img" />
              ) : (
                <div className="article-visual-placeholder">
                  <WatchFaceIcon />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="article-content-wrap">
          <div className="container">
            <div className="article-body">
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
                exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
              <p>
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu
                fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
                culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis, unde
                omnis iste natus error sit voluptatem accusantium doloremque laudantium.
              </p>
              <h2>A legacy forged in precision</h2>
              <p>
                Nemo enim ipsam voluptatem, quia voluptas sit, aspernatur aut odit aut fugit, sed
                quia consequuntur magni dolores eos, qui ratione voluptatem sequi nesciunt, neque
                porro quisquam est, qui dolorem ipsum, quia dolor sit, amet, consectetur, adipisci
                velit, sed quia non numquam eius modi tempora incidunt.
              </p>
              <p>
                Ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam,
                quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex
                ea commodi consequatur? Quis autem vel eum iure reprehenderit, qui in ea voluptate
                velit esse, quam nihil molestiae consequatur.
              </p>
              <h2>Why it endures</h2>
              <p>
                At vero eos et accusamus et iusto odio dignissimos ducimus, qui blanditiis
                praesentium voluptatum deleniti atque corrupti, quos dolores et quas molestias
                excepturi sint, obcaecati cupiditate non provident, similique sunt in culpa, qui
                officia deserunt mollitia animi, id est laborum et dolorum fuga.
              </p>
              <p>
                Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum
                soluta nobis est eligendi optio, cumque nihil impedit, quo minus id, quod maxime
                placeat, facere possimus, omnis voluptas assumenda est, omnis dolor repellendus.
              </p>
            </div>

            <div className="article-cta">
              <div className="article-cta-inner">
                <div className="journal-category">Competition</div>
                <h3 className="article-cta-title">Win the watch you just read about</h3>
                <p className="article-cta-sub">
                  Enter the current PWC draw for your chance to own an iconic timepiece. From{' '}
                  <strong>£2.99 per ticket.</strong>
                </p>
                <Link
                  href="/competitions/omega-speedmaster-moonwatch"
                  className="article-cta-btn"
                >
                  Enter the Draw →
                </Link>
              </div>
            </div>

            <div className="article-footer-nav">
              <Link href="/journal" className="article-back article-back-bottom">
                ← All Journal Articles
              </Link>
            </div>
          </div>
        </div>
      </article>

      <Footer />
    </>
  )
}
