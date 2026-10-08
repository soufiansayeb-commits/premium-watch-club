// tests/mock-woo/server.mjs
// A tiny stand-in for the WooCommerce/WordPress REST API, so the real Next.js
// build can be tested end-to-end (API routes + browser flow) WITHOUT touching
// the production shop. One fixture competition per lifecycle state.
//
//   node tests/mock-woo/server.mjs            (listens on 127.0.0.1:3999)
//
// It also acts as the "checkout" host: /?pwc_cart=…&pwc_sig=… is answered with a
// plain page so a browser test can confirm the handoff redirect without leaving
// the machine.

import http from 'node:http'

const PORT = Number(process.env.MOCK_WOO_PORT || 3999)
const HOUR = 3_600_000
const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z')

const OPTIONS = 'SUBMARINER\r\nGMT-MASTER II\r\nYACHT-MASTER\r\nAIR-KING'
const IMG = '/assets/images/skill-challenge/skill-challenge-watch.png'

function competition({ id, name, slug, type, price = '4.99', stock = 200, total = 400, goLive = null, close, status = 'live', manual = false, correct = 'SUBMARINER', options = OPTIONS }) {
  const now = Date.now()
  let effective = 'live'
  if (status === 'closed') effective = 'archived'
  else if (close <= now || stock <= 0 || (status === 'competition_closed' && manual)) effective = 'closed'
  else if (goLive && goLive > now) effective = 'scheduled'
  return {
    id, name, slug, status: 'publish', price, regular_price: price,
    stock_quantity: stock, stock_status: stock > 0 ? 'instock' : 'outofstock',
    sold_individually: false, permalink: `http://127.0.0.1:${PORT}/product/${slug}/`,
    description: `<p>${name} — mock competition for automated tests.</p>`,
    images: [{ src: IMG, alt: name }],
    acf: {
      competition_type: type, competition_status: status, competition_number: id % 100,
      total_entries: total, max_entries_percentage: 20, retail_value: 12500, cash_alternative: 11000,
      watch_reference: '126610LN', condition: 'Brand New · Full Box & Papers',
      challenge_image: IMG, answer_options: options, correct_answer: correct,
      draw_date: iso(close + 2 * HOUR), entries_close_date: iso(close), go_live_date: goLive ? iso(goLive) : '',
    },
    meta_data: [],
    pwc_lifecycle: {
      effective_status: effective, stored_status: status,
      go_live_utc: goLive ? iso(goLive) : null, entries_close_utc: iso(close), draw_utc: iso(close + 2 * HOUR),
      go_live_display: null, entries_close_display: null, draw_display: null,
      entries_close_is_own_field: true, manual_close: manual, tickets_left: stock,
      timezone: 'Europe/London', server_now_utc: iso(now),
    },
  }
}

function products() {
  const now = Date.now()
  return [
    competition({ id: 9001, name: 'Rolex Submariner Date (TEST LIVE)', slug: 'test-live-weekly', type: 'weekly', close: now + 72 * HOUR }),
    competition({ id: 9002, name: 'Omega Seamaster (TEST MISCONFIGURED)', slug: 'test-misconfigured-monthly', type: 'monthly', close: now + 72 * HOUR, correct: 'DAYTONA' }),
    competition({ id: 9003, name: 'Patek Nautilus (TEST SCHEDULED)', slug: 'test-scheduled-special', type: 'special', goLive: now + 24 * HOUR, close: now + 96 * HOUR }),
    competition({ id: 9004, name: 'Tudor Black Bay (TEST SOLD OUT)', slug: 'test-soldout-weekly', type: 'weekly', stock: 0, close: now + 72 * HOUR }),
    competition({ id: 9005, name: 'AP Royal Oak (TEST CLOSED)', slug: 'test-closed-monthly', type: 'monthly', close: now - HOUR }),
    competition({ id: 9006, name: 'Cartier Santos (TEST MANUAL CLOSE)', slug: 'test-manual-close-weekly', type: 'weekly', close: now + 72 * HOUR, status: 'competition_closed', manual: true }),
  ]
}

const ORDERS = [
  { id: 1, status: 'processing', line_items: [{ product_id: 9001, quantity: 3 }], billing: { city: 'London', email: 'a@example.test', phone: '+440000' } },
  { id: 2, status: 'on-hold',    line_items: [{ product_id: 9001, quantity: 5 }], billing: { city: 'Paris' } },
  { id: 3, status: 'completed',  line_items: [{ product_id: 9001, quantity: 2 }], billing: { city: 'Berlin' } },
  { id: 4, status: 'pending',    line_items: [{ product_id: 9001, quantity: 9 }], billing: { city: 'Rome' } },
  { id: 5, status: 'failed',     line_items: [{ product_id: 9001, quantity: 7 }], billing: { city: 'Madrid' } },
]

const BUNDLES = {
  enabled: true,
  apply_to: { weekly: true, monthly: true, special: false },
  exclude_free_products: true,
  allow_coupon_stacking: false,
  tiers: [
    { min_qty: 3, discount_percent: 5, label: '', badge: '', enabled: true },
    { min_qty: 5, discount_percent: 10, label: '', badge: '', enabled: true },
    { min_qty: 10, discount_percent: 15, label: '', badge: 'Most Popular', enabled: true },
    { min_qty: 20, discount_percent: 20, label: '', badge: 'Best Odds', enabled: true },
  ],
}

function send(res, status, body, type = 'application/json; charset=UTF-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' })
  res.end(type.startsWith('application/json') ? JSON.stringify(body) : body)
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`)
  const p = url.pathname.replace(/\/+$/, '')
  const authed = !!req.headers.authorization || url.searchParams.has('consumer_key')

  // Checkout host stand-in for browser tests. Like WooCommerce, it remembers the
  // handed-off basket in a per-browser cookie (the real shop keeps it in the WC
  // session) until the order is completed.
  if (p === '' && url.searchParams.has('pwc_cart')) {
    let items = []
    try {
      const enc = url.searchParams.get('pwc_cart').replace(/-/g, '+').replace(/_/g, '/')
      items = JSON.parse(Buffer.from(enc, 'base64').toString('utf8')).items.map(i => ({ id: i.id, qty: i.qty }))
    } catch {}
    const cookie = Buffer.from(JSON.stringify(items)).toString('base64url')
    res.writeHead(200, { 'Content-Type': 'text/html', 'Set-Cookie': `mockcart=${cookie}; Path=/; SameSite=Lax` })
    return res.end('<!doctype html><title>Mock checkout handoff</title><h1>MOCK HANDOFF RECEIVED</h1>')
  }
  // Simulates placing the order: WooCommerce empties the cart.
  if (p === '/mock/complete-order') {
    res.writeHead(200, { 'Content-Type': 'text/html', 'Set-Cookie': 'mockcart=; Path=/; Max-Age=0; SameSite=Lax' })
    return res.end('<!doctype html><title>Order received</title><h1>MOCK ORDER COMPLETE</h1>')
  }

  if (p.startsWith('/wp-json/wc/v3/')) {
    if (!authed) return send(res, 401, { code: 'woocommerce_rest_cannot_view' })
    if (p === '/wp-json/wc/v3/products') {
      const slug = url.searchParams.get('slug')
      const all = products()
      return send(res, 200, slug ? all.filter(x => x.slug === slug) : all)
    }
    const m = p.match(/^\/wp-json\/wc\/v3\/products\/(\d+)$/)
    if (m) {
      const found = products().find(x => x.id === Number(m[1]))
      return found ? send(res, 200, found) : send(res, 404, { code: 'woocommerce_rest_product_invalid_id' })
    }
    if (p === '/wp-json/wc/v3/orders') {
      const wanted = (url.searchParams.get('status') || 'any').split(',')
      const list = wanted.includes('any') ? ORDERS : ORDERS.filter(o => wanted.includes(o.status))
      return send(res, 200, list)
    }
  }

  // Store API cart — emulates the CORS allow-list in cors-and-checkout.php:
  // only the storefront origin may read it, with credentials.
  if (p === '/wp-json/wc/store/v1/cart') {
    const origin = req.headers.origin || ''
    const allowed = ['http://127.0.0.1:3100', 'http://localhost:3100'].includes(origin)
    const headers = { 'Content-Type': 'application/json; charset=UTF-8', 'Cache-Control': 'no-store', Vary: 'Origin' }
    if (allowed) Object.assign(headers, { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true' })
    res.writeHead(200, headers)
    const m = /(?:^|; )mockcart=([^;]*)/.exec(req.headers.cookie || '')
    let lines = []
    try { lines = m && m[1] ? JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8')) : [] } catch {}
    const items = lines.map((l, n) => ({ key: 'k' + n, id: l.id, quantity: l.qty, name: 'mock', prices: { price: '0', currency_code: 'GBP' } }))
    return res.end(JSON.stringify({ items, totals: { total_price: '0', currency_code: 'GBP' } }))
  }

  if (p === '/wp-json/pwc/v1/bundle-discounts') return send(res, 200, BUNDLES)
  if (p === '/wp-json/wp/v2/journal') return send(res, 200, [])
  // store-settings / announcements / active-offer / media: let the frontend
  // fall back to its built-in defaults, as it does when WordPress is down.
  return send(res, 404, { code: 'rest_no_route' })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`mock WooCommerce listening on http://127.0.0.1:${PORT}`)
})
