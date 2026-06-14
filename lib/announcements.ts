// lib/announcements.ts — Server-side only. Never import in client components directly.

export interface Announcement {
  text: string
  url: string
}

const STORE_URL = process.env.WOOCOMMERCE_STORE_URL ?? ''

export async function getAnnouncements(): Promise<Announcement[]> {
  if (!STORE_URL) return []
  try {
    const res = await fetch(`${STORE_URL}/wp-json/pwc/v1/announcements`, {
      next: { revalidate: process.env.NODE_ENV === 'development' ? 5 : 60 },
    })
    if (!res.ok) return []
    const data: unknown = await res.json()
    if (!Array.isArray(data)) return []
    return data as Announcement[]
  } catch {
    return []
  }
}
