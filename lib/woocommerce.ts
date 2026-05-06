// lib/woocommerce.ts — Server-side WooCommerce API layer
// STATUS: Mock data — connect to real API when backend is live
//
// Environment variables required (set in .env.local or Vercel Settings):
//   WOOCOMMERCE_STORE_URL=https://backend.premiumwatchclub.com
//   WOOCOMMERCE_CONSUMER_KEY=ck_xxxxx
//   WOOCOMMERCE_CONSUMER_SECRET=cs_xxxxx
//
// IMPORTANT: Never use NEXT_PUBLIC_ prefix for these secrets.
// This file must only be imported in Server Components or API routes.

import { competitions, getCompetitionBySlug } from './competition-data'
export type { Competition } from './competition-data'

// TODO: implement real WooCommerce fetch when backend is live
// Environment variables are read lazily (inside functions) to avoid SSR issues.

function isConfigured(): boolean {
  const storeUrl  = process.env.WOOCOMMERCE_STORE_URL || ''
  const key       = process.env.WOOCOMMERCE_CONSUMER_KEY || ''
  const secret    = process.env.WOOCOMMERCE_CONSUMER_SECRET || ''
  return Boolean(storeUrl && key && secret)
}

// async function wcFetch(endpoint: string) { ... }  // TODO when backend is live

export async function fetchCompetitions() {
  if (isConfigured()) {
    // TODO: replace with real API call
    // return wcFetch('products?status=publish')
  }
  return competitions
}

export async function fetchCompetitionBySlug(slug: string) {
  if (isConfigured()) {
    // TODO: replace with real API call
    // const results = await wcFetch(`products?slug=${slug}`)
    // return results[0] ?? null
  }
  return getCompetitionBySlug(slug) ?? null
}

export function buildCheckoutUrl(productId: number, quantity: number): string {
  const checkoutBase = process.env.NEXT_PUBLIC_WOOCOMMERCE_CHECKOUT_URL
  const storeUrl     = process.env.WOOCOMMERCE_STORE_URL || 'https://example.com'
  const base         = checkoutBase || `${storeUrl}/checkout/`
  try {
    const url = new URL(base)
    url.searchParams.set('add-to-cart', String(productId))
    url.searchParams.set('quantity',    String(quantity))
    return url.toString()
  } catch {
    return `${base}?add-to-cart=${productId}&quantity=${quantity}`
  }
}
