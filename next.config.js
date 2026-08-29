/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Serve images directly from source instead of through Next.js' image
    // optimizer. The Vercel Image Optimization quota is exhausted, so every
    // not-yet-cached image (e.g. a freshly changed WooCommerce product image)
    // returns HTTP 402 OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED and shows as a
    // broken image. Source URLs (checkout.premiumwatchclub.com/wp-content/...)
    // load fine on their own, so bypassing the optimizer restores every image
    // immediately and makes WooCommerce image changes visible without limits.
    // Remove this line only after the Vercel image-optimization plan/quota is
    // resolved; the <Image> components and layout stay unchanged either way.
    unoptimized: true,
    remotePatterns: [
      // Current WooCommerce/WordPress backend — product, gallery, ACF and hero images
      // are served from here (WordPress site URL after the checkout.* migration).
      { protocol: 'https', hostname: 'checkout.premiumwatchclub.com' },
      // Legacy backend host — kept temporarily in case any historical media URL
      // still resolves here. Safe to remove once no old-host URLs remain in WordPress.
      { protocol: 'https', hostname: 'premiumwatchclub3471.live-website.com' },
    ],
  },

  async rewrites() {
    return [
      // ── Short journal URLs ────────────────────────────────────────────────
      // Footer "Advertorial" links point at clean /journal/weekly|monthly|special
      // URLs. Rewrite (not redirect) so the short URL stays in the address bar
      // while the real WordPress article is rendered underneath.
      {
        source: '/journal/weekly',
        destination: '/journal/why-the-rolex-daytona-remains-an-icon',
      },
      {
        source: '/journal/monthly',
        destination: '/journal/why-the-audemars-piguet-royal-oak-still-defines-luxury-sport',
      },
      {
        source: '/journal/special',
        destination: '/journal/ap-x-swatch-royal-popp-colour-hype-and-wrist-energy',
      },
    ]
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
