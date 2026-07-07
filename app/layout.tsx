import type { Metadata } from 'next'
import './globals.css'
import AgeVerificationModal from '@/components/AgeVerificationModal'
import { CartProvider } from '@/context/CartContext'
import { BundleConfigProvider } from '@/context/BundleConfigContext'
import CartDrawer from '@/components/CartDrawer'
import AnnouncementBar from '@/components/AnnouncementBar'
import { getAnnouncements } from '@/lib/announcements'
import { fetchBundleConfig } from '@/lib/bundle-discounts'
import { JsonLd } from '@/components/JsonLd'

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Premium Watch Club',
  url: 'https://premiumwatchclub.com',
  logo: 'https://premiumwatchclub.com/brand-assets/pwc-logo-wordmark-gold.png',
}

export const metadata: Metadata = {
  title: 'Premium Watch Club — Win Luxury Watches',
  description: 'Enter skill-based competitions to win your dream luxury watch. One competition at a time.',
  metadataBase: new URL('https://premiumwatchclub.com'),
  openGraph: {
    siteName: 'Premium Watch Club',
    type: 'website',
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [announcements, bundleConfig] = await Promise.all([
    getAnnouncements(),
    fetchBundleConfig(),
  ])

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600;1,700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:ital,wght@0,500;0,700;0,800;0,900;1,600&family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&family=Jost:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        <JsonLd data={organizationSchema} />
        <BundleConfigProvider config={bundleConfig}>
          <CartProvider>
            <AgeVerificationModal />
            <AnnouncementBar announcements={announcements} />
            {children}
            <CartDrawer />
          </CartProvider>
        </BundleConfigProvider>
      </body>
    </html>
  )
}
