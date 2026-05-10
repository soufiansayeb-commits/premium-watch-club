export interface JournalArticle {
  slug: string
  category: string
  title: string
  excerpt: string
  image: string | null
  readTime: string
}

export const journalArticles: JournalArticle[] = [
  {
    slug: 'omega-speedmaster-moonwatch-guide',
    category: 'Guide',
    title: 'The Omega Speedmaster: why the Moonwatch endures',
    excerpt:
      'From the Apollo programme to present day — why the Speedmaster Professional remains the definitive tool watch and the most coveted chronograph of our generation.',
    image: '/assets/images/omega-speedmaster-hero.png',
    readTime: '4 min read',
  },
  {
    slug: 'rolex-submariner-history',
    category: 'Heritage',
    title: 'The Rolex Submariner: 70 years of depth',
    excerpt:
      "How the world's most recognised watch became a cultural icon and a precision instrument.",
    image: null,
    readTime: '5 min read',
  },
  {
    slug: 'building-your-first-watch-collection',
    category: 'Collecting',
    title: 'Building your first collection on a budget',
    excerpt:
      'Where to start, what to prioritise, and how to avoid mistakes when building your first serious watch collection.',
    image: null,
    readTime: '6 min read',
  },
]

export function getArticleBySlug(slug: string): JournalArticle | undefined {
  return journalArticles.find((a) => a.slug === slug)
}
