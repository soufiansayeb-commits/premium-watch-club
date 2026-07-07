// app/api/bundle-discounts/route.ts
// Server-side proxy for the WordPress bundle-discount settings.
//
// The Next.js frontend consumes the discount rules through this route (or via the
// server-side fetchBundleConfig used in the root layout). Keeping a proxy here:
//   • hides WOOCOMMERCE_STORE_URL from the client,
//   • normalises the WP snake_case payload into the camelCase BundleConfig shape,
//   • guarantees a safe fallback (discounts off) if WordPress is unreachable.
//
// Single source of truth stays in WordPress: WooCommerce → PWC Bundle Discounts,
// exposed at /wp-json/pwc/v1/bundle-discounts.

import { NextResponse } from 'next/server'
import { fetchBundleConfig } from '@/lib/bundle-discounts'

export async function GET() {
  // fetchBundleConfig never throws — it returns DISABLED_BUNDLE_CONFIG on failure.
  const config = await fetchBundleConfig()

  return NextResponse.json(config, {
    headers: {
      'Cache-Control': process.env.NODE_ENV === 'development'
        ? 'no-store'
        : 'public, s-maxage=60, stale-while-revalidate=30',
    },
  })
}
