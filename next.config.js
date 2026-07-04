/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'premiumwatchclub3471.live-website.com' },
    ],
  },

  async redirects() {
    return [
      // ── Legacy competition slug → canonical slug ──────────────────────────
      // The paid competition was previously served under the old Omega placeholder
      // slug. Redirect it permanently so old bookmarks, ads and inbound links
      // still resolve to the correct Rolex Cosmograph Daytona page.
      {
        source: '/competitions/omega-speedmaster-moonwatch',
        destination: '/competitions/rolex-cosmograph-daytona',
        permanent: true,
      },

      // ── About page canonicalisation ───────────────────────────────────────
      // /about was the original URL; /about-us is now canonical.
      {
        source: '/about',
        destination: '/about-us',
        permanent: true,
      },

      // ── FAQ → About Us ────────────────────────────────────────────────────
      // FAQ content lives on the homepage and competition pages; the standalone
      // /faq route redirects to About Us at the Next.js routing layer.
      {
        source: '/faq',
        destination: '/about-us',
        permanent: true,
      },

      // ── Closed competitions archive ───────────────────────────────────────
      {
        source: '/competitions/closed',
        destination: '/past-winners',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
