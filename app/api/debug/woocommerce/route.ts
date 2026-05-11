// app/api/debug/woocommerce/route.ts
//
// TEMPORARY — LOCAL / DEV ONLY
// This route exists solely to test the WooCommerce API connection.
// It is disabled in production (returns 404).
// Remove or gate behind authentication before deploying to production.
//
// Test at: http://localhost:3000/api/debug/woocommerce

import { NextResponse } from 'next/server'
import { fetchWooProducts } from '@/lib/woocommerce'

export async function GET() {
  // Hard-block in production — never expose this in deployed builds
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ disabled: true }, { status: 404 })
  }

  const { products, error } = await fetchWooProducts()

  if (error) {
    return NextResponse.json(
      {
        success: false,
        count: 0,
        error,
        products: [],
      },
      { status: 200 }, // always 200 so the test runner can read the body
    )
  }

  return NextResponse.json({
    success: true,
    count: products.length,
    // Only safe fields — id, name, slug, price, stock_quantity, status, permalink
    products,
  })
}
