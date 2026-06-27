import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { getJournalPosts } from '@/lib/wordpress-journal'
import type { JournalPost } from '@/lib/wordpress-journal'

export const revalidate = 60

export const metadata = {
  title: 'The Journal — Premium Watch Club',
  description: 'Guides, collector stories and watch culture from the PWC editorial team.',
}

function cardImageFor(p: JournalPost): { src: string | null; isProduct: boolean } {
  if (p.featuredImage) return { src: p.featuredImage, isProduct: false }
  const prod = p.relatedProduct?.images[0] ?? null
  return { src: prod, isProduct: !!prod }
}

const WatchFaceIcon = () => (
  <svg width="64" height="64" viewBox="0 0 120 120" fill="none" opacity="0.5" aria-hidden="true">
    <circle cx="60" cy="60" r="52" stroke="#0A1F44" strokeWidth="1.5" />
    <circle cx="60" cy="60" r="40" stroke="#B8893C" strokeWidth="0.8" fill="none" />
    <rect x="57" y="12" width="6" height="14" rx="1.5" fill="#B8893C" />
    <rect x="57" y="94" width="6" height="14" rx="1.5" fill="#B8893C" />
    <rect x="12" y="57" width="14" height="6" rx="1.5" fill="#B8893C" />
    <rect x="94" y="57" width="14" height="6" rx="1.5" fill="#B8893C" />
    <rect x="58" y="30" width="4" height="32" rx="2" fill="#0A1F44" transform="rotate(-28 60 60)" />
    <rect x="59" y="24" width="2.5" height="40" rx="1.2" fill="#0A1F44" transform="rotate(22 60 60)" />
    <circle cx="60" cy="60" r="5" fill="#B8893C" />
  </svg>
)

export default async function JournalIndexPage() {
  const posts = await getJournalPosts()
  const [lead, ...rest] = posts

  return (
    <>
      <Header />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..500&family=Newsreader:ital,opsz,wght@0,6..72,300..500&family=Jost:wght@300;400;500;600&display=swap');

        .ji { --navy:#0A1F44; --gold:#B8893C; --gold-soft:#C5A065; --muted:#6c6a72;
              --cream:#F6F3EC; --paper:#FBFAF6; --line:rgba(10,31,68,.12);
              background: var(--paper); }
        .ji-wrap { max-width: 1140px; margin: 0 auto; padding: 0 32px; }

        /* intro */
        .ji-intro { text-align: center; padding: 70px 0 48px; }
        .ji-eyebrow { font-family:'Jost',sans-serif; font-size:11px; font-weight:600; letter-spacing:.3em; text-transform:uppercase; color:var(--gold); }
        .ji-h1 { font-family:'Fraunces',Georgia,serif; font-weight:400; font-size:clamp(36px,6vw,64px); line-height:1.04; letter-spacing:-.02em; color:var(--navy); margin:16px 0 14px; }
        .ji-sub { font-family:'Newsreader',Georgia,serif; font-style:italic; font-size:clamp(16px,2vw,20px); color:#4a4954; max-width:54ch; margin:0 auto; line-height:1.5; }

        /* lead article */
        .ji-lead { display:grid; grid-template-columns:1.15fr 1fr; gap:0; margin:18px 0 60px; border:1px solid var(--line); border-radius:4px; overflow:hidden; background:var(--paper); transition:box-shadow .3s, transform .3s; }
        .ji-lead:hover { box-shadow:0 30px 70px rgba(10,31,68,.16); transform:translateY(-3px); }
        .ji-lead-img { position:relative; aspect-ratio:auto; min-height:420px; overflow:hidden; background:var(--cream); }
        .ji-lead-img img { width:100%; height:100%; object-fit:cover; transition:transform .6s; }
        .ji-lead-img--contain img { object-fit:contain; padding:9%; mix-blend-mode:multiply; }
        .ji-lead:hover .ji-lead-img img { transform:scale(1.04); }
        .ji-lead-ph { width:100%; height:100%; display:flex; align-items:center; justify-content:center; }
        .ji-lead-body { padding:48px 52px; display:flex; flex-direction:column; justify-content:center; }
        .ji-lead-tag { display:inline-flex; align-items:center; gap:9px; font-family:'Jost',sans-serif; font-size:10px; font-weight:600; letter-spacing:.24em; text-transform:uppercase; color:var(--gold); margin-bottom:18px; }
        .ji-lead-tag::before { content:''; width:22px; height:2px; background:var(--gold); }
        .ji-lead-title { font-family:'Fraunces',serif; font-weight:400; font-size:clamp(26px,3.4vw,40px); line-height:1.1; letter-spacing:-.015em; color:var(--navy); margin:0 0 16px; }
        .ji-lead-ex { font-family:'Newsreader',serif; font-size:18px; line-height:1.6; color:#44424a; margin:0 0 24px; }
        .ji-lead-meta { font-family:'Jost',sans-serif; font-size:11px; letter-spacing:.06em; color:var(--muted); margin-bottom:26px; }
        .ji-readmore { display:inline-flex; align-items:center; gap:9px; font-family:'Jost',sans-serif; font-size:11px; font-weight:600; letter-spacing:.16em; text-transform:uppercase; color:var(--navy); transition:gap .2s,color .2s; }
        .ji-lead:hover .ji-readmore { color:var(--gold); gap:13px; }

        /* grid */
        .ji-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:28px; padding-bottom:84px; }
        .ji-card { display:flex; flex-direction:column; background:var(--paper); border:1px solid var(--line); border-radius:4px; overflow:hidden; transition:transform .25s, box-shadow .25s; }
        .ji-card:hover { transform:translateY(-5px); box-shadow:0 24px 50px rgba(10,31,68,.15); }
        .ji-card-img { position:relative; aspect-ratio:3/2; overflow:hidden; background:var(--cream); }
        .ji-card-img img { width:100%; height:100%; object-fit:cover; transition:transform .5s; }
        .ji-card-img--contain img { object-fit:contain; padding:11%; mix-blend-mode:multiply; }
        .ji-card:hover .ji-card-img img { transform:scale(1.05); }
        .ji-card-ph { width:100%; height:100%; display:flex; align-items:center; justify-content:center; }
        .ji-card-body { padding:22px 22px 26px; display:flex; flex-direction:column; flex:1; }
        .ji-card-cat { font-family:'Jost',sans-serif; font-size:9px; font-weight:600; letter-spacing:.22em; text-transform:uppercase; color:var(--gold); margin-bottom:10px; }
        .ji-card-title { font-family:'Fraunces',serif; font-weight:450; font-size:21px; line-height:1.2; color:var(--navy); margin:0 0 12px; }
        .ji-card-ex { font-family:'Newsreader',serif; font-size:15.5px; line-height:1.55; color:#55535c; margin:0 0 18px; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
        .ji-card-meta { margin-top:auto; display:flex; align-items:center; justify-content:space-between; padding-top:14px; border-top:1px solid var(--line); }
        .ji-card-date { font-family:'Jost',sans-serif; font-size:10px; letter-spacing:.06em; color:var(--muted); }
        .ji-card-arrow { font-family:'Jost',sans-serif; font-size:10px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:var(--gold); }

        .ji-empty { text-align:center; padding:80px 0 100px; font-family:'Newsreader',serif; font-style:italic; font-size:19px; color:var(--muted); }

        @media (max-width:860px){
          .ji-lead{ grid-template-columns:1fr; }
          .ji-lead-img{ min-height:280px; }
          .ji-lead-body{ padding:34px 28px; }
          .ji-grid{ grid-template-columns:repeat(2,1fr); gap:20px; }
        }
        @media (max-width:560px){
          .ji-wrap{ padding:0 20px; }
          .ji-grid{ grid-template-columns:1fr; }
          .ji-intro{ padding:48px 0 32px; }
        }
      `}</style>

      <div className="ji">
        <div className="ji-wrap">
          <div className="ji-intro">
            <div className="ji-eyebrow">The Journal</div>
            <h1 className="ji-h1">Stories, guides &amp; watch culture</h1>
            <p className="ji-sub">
              Collector guides, winner stories and the watches behind every drop, from the PWC editorial team.
            </p>
          </div>

          {posts.length === 0 ? (
            <div className="ji-empty">No articles published yet. Check back soon.</div>
          ) : (
            <>
              {/* Lead / featured article */}
              {lead && (() => {
                const { src, isProduct } = cardImageFor(lead)
                return (
                  <Link href={`/journal/${lead.slug}`} className="ji-lead">
                    <div className={`ji-lead-img${isProduct ? ' ji-lead-img--contain' : ''}`}>
                      {src ? (
                        <Image
                          src={src}
                          alt={lead.title}
                          fill
                          style={{ objectFit: isProduct ? 'contain' : 'cover' }}
                          sizes="(max-width: 860px) 100vw, 50vw"
                          priority
                        />
                      ) : (
                        <div className="ji-lead-ph"><WatchFaceIcon /></div>
                      )}
                    </div>
                    <div className="ji-lead-body">
                      <span className="ji-lead-tag">Featured · {lead.category}</span>
                      <h2 className="ji-lead-title">{lead.title}</h2>
                      <p className="ji-lead-ex">{lead.excerpt}</p>
                      <div className="ji-lead-meta">
                        By {lead.author} · {lead.dateFormatted} · {lead.readTime} min read
                      </div>
                      <span className="ji-readmore">Read article <span aria-hidden="true">→</span></span>
                    </div>
                  </Link>
                )
              })()}

              {/* Grid of remaining articles */}
              {rest.length > 0 && (
                <div className="ji-grid">
                  {rest.map(post => {
                    const { src, isProduct } = cardImageFor(post)
                    return (
                      <Link key={post.slug} href={`/journal/${post.slug}`} className="ji-card">
                        <div className={`ji-card-img${isProduct ? ' ji-card-img--contain' : ''}`}>
                          {src ? (
                            <Image
                              src={src}
                              alt={post.title}
                              fill
                              style={{ objectFit: isProduct ? 'contain' : 'cover' }}
                              sizes="(max-width: 560px) 100vw, (max-width: 860px) 50vw, 33vw"
                            />
                          ) : (
                            <div className="ji-card-ph"><WatchFaceIcon /></div>
                          )}
                        </div>
                        <div className="ji-card-body">
                          <span className="ji-card-cat">{post.category}</span>
                          <h3 className="ji-card-title">{post.title}</h3>
                          <p className="ji-card-ex">{post.excerpt}</p>
                          <div className="ji-card-meta">
                            <span className="ji-card-date">{post.dateFormatted} · {post.readTime} min</span>
                            <span className="ji-card-arrow">Read →</span>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Footer />
    </>
  )
}
