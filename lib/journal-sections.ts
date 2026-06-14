// lib/journal-sections.ts — Server-side only. Pure string parsing, no browser APIs.
// Transforms arbitrary WordPress article HTML into structured editorial sections
// so the frontend can render alternating background bands WITHOUT requiring the
// author to add any CSS classes in WordPress.

export interface ArticleSection {
  /** Heading text for this section, or null for the intro block (before any <h2>). */
  heading: string | null
  /** Inner HTML for this section (paragraphs, lists, images, etc.). */
  html:    string
}

export interface ParsedArticle {
  /** Sections split at <h2> boundaries. First may be the headless intro block. */
  sections: ArticleSection[]
  /** First <blockquote> text, if the author wrote one — used for the quote band. */
  blockquote: string
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8217;/g, '’')
    .replace(/&#8216;/g, '‘')
    .replace(/&#8220;/g, '“')
    .replace(/&#8221;/g, '”')
    .replace(/&#8230;/g, '…')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Split article HTML into editorial sections at each <h2> boundary.
 * A blockquote (if any) is pulled out separately for the quote band and removed
 * from the section flow so it is not rendered twice.
 */
export function parseArticle(html: string): ParsedArticle {
  if (!html?.trim()) return { sections: [], blockquote: '' }

  // Extract the first blockquote for the dedicated quote band.
  const bqMatch = html.match(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/i)
  const blockquote = bqMatch ? stripTags(bqMatch[1]) : ''

  // Remove ALL blockquotes from the body flow (shown once in the quote band).
  const body = html.replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi, '')

  // Split on <h2> while keeping the heading as a delimiter.
  const parts = body.split(/(<h2[^>]*>[\s\S]*?<\/h2>)/i)
  const sections: ArticleSection[] = []

  const intro = parts[0]?.trim() ?? ''
  if (intro && stripTags(intro)) sections.push({ heading: null, html: intro })

  for (let i = 1; i < parts.length; i += 2) {
    const heading = stripTags(parts[i] ?? '')
    const chunk   = (parts[i + 1] ?? '').trim()
    if (heading || stripTags(chunk)) sections.push({ heading: heading || null, html: chunk })
  }

  return { sections, blockquote }
}
