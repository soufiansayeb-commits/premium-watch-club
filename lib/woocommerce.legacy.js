/*
 * lib/woocommerce.js — WooCommerce API layer (server-side only)
 *
 * STATUS: Mock data. Replace with real API calls once backend is live.
 *
 * When WooCommerce backend is ready at https://backend.premiumwatchclub.com:
 *   1. Set environment variables (never hardcode these):
 *        WOOCOMMERCE_STORE_URL=https://backend.premiumwatchclub.com
 *        WOOCOMMERCE_CONSUMER_KEY=ck_xxxxx
 *        WOOCOMMERCE_CONSUMER_SECRET=cs_xxxxx
 *   2. Replace mock functions below with real fetch() calls to the REST API.
 *   3. This file must only run server-side — never expose API keys to the browser.
 *
 * API endpoints (read-only, Phase 1):
 *   GET /wp-json/wc/v3/products           → all competitions
 *   GET /wp-json/wc/v3/products/{id}      → single competition by ID
 *   GET /wp-json/wc/v3/products?slug={}   → single competition by slug
 */

/* ── Environment variables (populated by .env.local or Vercel Settings) ── */
const STORE_URL       = process.env.WOOCOMMERCE_STORE_URL       || '';
const CONSUMER_KEY    = process.env.WOOCOMMERCE_CONSUMER_KEY    || '';
const CONSUMER_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET || '';

/* ── Base fetch helper ──────────────────────────────────────────────────── */
async function wcFetch(endpoint) {
  if (!STORE_URL || !CONSUMER_KEY || !CONSUMER_SECRET) {
    throw new Error('WooCommerce env vars not set — using mock data instead.');
  }
  const url = `${STORE_URL}/wp-json/wc/v3/${endpoint}`;
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  const res  = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
    next: { revalidate: 60 },   // ISR: revalidate every 60s (Next.js)
  });
  if (!res.ok) throw new Error(`WooCommerce API error: ${res.status}`);
  return res.json();
}

/* ── Mock data (mirrors WooCommerce REST API response shape) ─────────────
 * Remove this block once real API is connected.
 */
const MOCK_COMPETITIONS = [
  {
    id:          856,
    name:        'Omega Speedmaster Moonwatch',
    slug:        'omega-speedmaster-moonwatch',
    price:       '5.95',
    stock_quantity: 77,
    images:      [{ src: '/assets/images/omega-speedmaster-moonwatch.png' }],
    meta_data: [
      { key: 'draw_date',       value: '2026-05-11T20:00:00+01:00' },
      { key: 'draw_date_display', value: '11 May 2026, 20:00 BST' },
      { key: 'watch_brand',     value: 'Omega' },
      { key: 'watch_reference', value: '310.30.42.50.01.001' },
      { key: 'total_tickets',   value: '500' },
      { key: 'retail_value',    value: '6100' },
      { key: 'cash_alternative', value: '5000' },
      { key: 'skill_question',  value: 'Which Swiss manufacturer produces the Speedmaster Moonwatch?' },
      { key: 'skill_answers',   value: JSON.stringify(['Omega', 'Rolex', 'Breitling', 'TAG Heuer']) },
    ],
  },
];

/* ── Public API ─────────────────────────────────────────────────────────── */

export async function getCompetitions() {
  try {
    return await wcFetch('products?status=publish&per_page=20');
  } catch {
    return MOCK_COMPETITIONS;
  }
}

export async function getCompetitionBySlug(slug) {
  try {
    const results = await wcFetch(`products?slug=${slug}`);
    return results[0] || null;
  } catch {
    return MOCK_COMPETITIONS.find(c => c.slug === slug) || null;
  }
}

export async function getCompetitionById(id) {
  try {
    return await wcFetch(`products/${id}`);
  } catch {
    return MOCK_COMPETITIONS.find(c => c.id === id) || null;
  }
}

/*
 * buildWooCheckoutUrl — constructs the WooCommerce checkout redirect URL.
 * Called after skill question is passed; redirects user to WooCommerce cart.
 *
 * Usage:
 *   const url = buildWooCheckoutUrl({ productId: 856, quantity: 5 });
 *   window.location.href = url;
 */
export function buildWooCheckoutUrl({ productId, quantity }) {
  const base = process.env.NEXT_PUBLIC_WOOCOMMERCE_CHECKOUT_URL
    || (STORE_URL + '/checkout/');
  const url = new URL(base);
  url.searchParams.set('add-to-cart', String(productId));
  url.searchParams.set('quantity',    String(quantity));
  return url.toString();
}
