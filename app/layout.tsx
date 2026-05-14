import type { Metadata } from 'next'
import './globals.css'
import AgeVerificationModal from '@/components/AgeVerificationModal'

export const metadata: Metadata = {
  title: 'Premium Watch Club — Win Luxury Watches',
  description: 'Enter skill-based competitions to win your dream luxury watch. One competition at a time.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600;1,700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AgeVerificationModal />
        {children}
      </body>
    </html>
  )
}
