import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Your Cart — Premium Watch Club',
  description: 'Review your competition entries before checkout.',
}

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children
}
