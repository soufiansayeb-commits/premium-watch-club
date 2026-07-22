import { notFound }           from 'next/navigation'
import Header                   from '@/components/Header'
import Footer                   from '@/components/Footer'
import JournalEditorial         from '@/components/JournalEditorial'
import {
  getJournalPosts,
  getJournalPost,
  getRelatedJournalPosts,
} from '@/lib/wordpress-journal'
import { parseArticle } from '@/lib/journal-sections'
import { JsonLd } from '@/components/JsonLd'

export async function generateStaticParams() {
  const posts = await getJournalPosts()
  return posts.map((p) => ({ slug: p.slug }))
}

export const dynamicParams = true
export const revalidate    = 60

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = await getJournalPost(params.slug)
  if (!post) return {}
  const ogImage = post.featuredImage ?? post.relatedProduct?.images[0]
  return {
    title:       `${post.title} — PWC Journal`,
    description: post.excerpt,
    openGraph:   ogImage ? { images: [{ url: ogImage }] } : undefined,
  }
}

export default async function JournalArticlePage({ params }: { params: { slug: string } }) {
  const post = await getJournalPost(params.slug)
  if (!post) notFound()

  const relatedPosts = await getRelatedJournalPosts(params.slug, 3)
  const article      = parseArticle(post.content)

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.premiumwatchclub.com' },
      { '@type': 'ListItem', position: 2, name: 'Journal', item: 'https://www.premiumwatchclub.com/journal' },
      { '@type': 'ListItem', position: 3, name: post.title, item: `https://www.premiumwatchclub.com/journal/${params.slug}` },
    ],
  }

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <Header />
      <main>
        <JournalEditorial
          post={post}
          product={post.relatedProduct}
          relatedPosts={relatedPosts}
          sections={article.sections}
          blockquote={article.blockquote}
        />
      </main>
      <Footer />
    </>
  )
}
