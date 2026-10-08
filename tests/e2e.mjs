// tests/e2e.mjs — browser regression test of the entry → checkout flow.
//
// Drives a real Chromium (puppeteer) through the production build running
// against the mock WooCommerce (tests/mock-woo/server.mjs). Every request to a
// host other than the local Next.js server and the mock is blocked, so the test
// never touches the live shop or third parties. See tests/README.md.
//
//   node tests/e2e.mjs        (BASE_URL defaults to http://127.0.0.1:3100)
//   SHOTS_DIR=… saves screenshots of each step for a visual check.

import puppeteer from 'puppeteer'
import assert from 'node:assert/strict'
import path from 'node:path'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3100'
const MOCK = 'http://127.0.0.1:3999'
const SHOTS = process.env.SHOTS_DIR || ''
const ALLOWED = [new URL(BASE).host, new URL(MOCK).host, 'localhost:3100']

let failures = 0
async function step(name, fn) {
  try {
    await fn()
    console.log(`✔ ${name}`)
  } catch (err) {
    failures++
    console.log(`✖ ${name}\n    ${err && err.message ? err.message.split('\n')[0] : err}`)
  }
}

async function newPage(browser, viewport) {
  const page = await browser.newPage()
  await page.setViewport(viewport)
  // Skip the 18+ gate (the modal itself is covered by its own component).
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('pwc_age_verified', '1') } catch {} })
  await page.setRequestInterception(true)
  page.on('request', (req) => {
    const u = req.url()
    if (u.startsWith('data:') || u.startsWith('blob:')) return req.continue()
    try {
      return ALLOWED.includes(new URL(u).host) ? req.continue() : req.abort()
    } catch { return req.abort() }
  })
  page.errorsSeen = []
  page.on('pageerror', (e) => page.errorsSeen.push(`pageerror: ${e.message}`))
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const t = msg.text()
    // Third-party requests are blocked on purpose — their load errors are expected.
    if (/Failed to load resource|ERR_FAILED|ERR_BLOCKED/i.test(t)) return
    page.errorsSeen.push(`console: ${t}`)
  })
  return page
}

async function shot(page, name) {
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: false })
}

async function clickText(page, selector, text) {
  const ok = await page.evaluate((sel, txt) => {
    const el = [...document.querySelectorAll(sel)].find(e => e.textContent.trim().toUpperCase() === txt.toUpperCase())
    if (!el) return false
    el.scrollIntoView({ block: 'center' }); el.click(); return true
  }, selector, text)
  assert.ok(ok, `no ${selector} with text "${text}"`)
}

async function clickVisible(page, selector) {
  await page.waitForSelector(selector, { visible: true, timeout: 15000 })
  await page.evaluate((sel) => {
    const el = [...document.querySelectorAll(sel)].find(e => e.offsetParent !== null && !e.disabled)
    el.scrollIntoView({ block: 'center' }); el.click()
  }, selector)
}

/** Ticket selection → skill answer → checkout step. Returns the page on step 3. */
async function enter(page, route, answer) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle2' })
  await clickVisible(page, '.bundle-card:not([aria-disabled="true"])')
  await clickVisible(page, '.btn-continue')
  await page.waitForSelector('.skill-answer', { visible: true })
  await clickText(page, '.skill-answer', answer)
  await clickVisible(page, '.skill-actions .btn-continue')
}

function decode(url) {
  const enc = new URL(url).searchParams.get('pwc_cart')
  return JSON.parse(Buffer.from(enc.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'))
}

const browser = await puppeteer.launch({ headless: true })
try {
  for (const [label, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844, isMobile: true, hasTouch: true }]]) {
    const page = await newPage(browser, viewport)

    await step(`[${label}] homepage renders without errors`, async () => {
      const res = await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' })
      assert.ok(res.status() < 400, `HTTP ${res.status()}`) // 304 = browser cache
      await shot(page, `${label}-1-home`)
    })

    await step(`[${label}] live competition: tickets → skill → checkout step (answer accepted, not judged)`, async () => {
      // A WRONG answer must be accepted just like a right one — correctness is never revealed.
      await enter(page, '/competitions/weekly', 'GMT-MASTER II')
      await page.waitForSelector('.btn-pay', { visible: true, timeout: 15000 })
      await shot(page, `${label}-2-checkout-step`)
      const html = await page.content()
      assert.ok(!/Stripe/i.test(html), 'Stripe must no longer be mentioned')
      assert.ok(/payment provider/i.test(html), 'neutral payment wording present')
    })

    await step(`[${label}] continue to checkout → signed handoff to the checkout host`, async () => {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }),
        clickVisible(page, '.checkout-actions .btn-pay'),
      ])
      const url = page.url()
      assert.ok(url.startsWith(`${MOCK}/?pwc_cart=`), `unexpected destination ${url}`)
      assert.ok(url.includes('&pwc_sig='))
      const payload = decode(url)
      assert.equal(payload.items.length, 1)
      assert.equal(payload.items[0].id, 9001)
      assert.equal(payload.items[0].skillAnswer, 'GMT-MASTER II')
      assert.ok(payload.items[0].qty >= 1)
      assert.equal(payload.items[0].skillResult, undefined, 'no client-side result in the payload')
      assert.match(await page.content(), /MOCK HANDOFF RECEIVED/)
    })

    await step(`[${label}] basket page checkout uses the same signed handoff`, async () => {
      await page.goto(`${BASE}/cart`, { waitUntil: 'networkidle2' })
      await shot(page, `${label}-3-cart`)
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }),
        clickVisible(page, '.cp-checkout-btn'),
      ])
      assert.ok(page.url().startsWith(`${MOCK}/?pwc_cart=`), page.url())
    })

    await step(`[${label}] after a completed order the local basket is cleared (no accidental re-purchase)`, async () => {
      await page.goto(`${MOCK}/mock/complete-order`, { waitUntil: 'domcontentloaded' })
      await page.goto(`${BASE}/cart`, { waitUntil: 'networkidle2' })
      await page.waitForFunction(() => !localStorage.getItem('pwc_cart_v2'), { timeout: 15000 })
      assert.equal(await page.$('.cp-checkout-btn'), null, 'basket should be empty')
      await shot(page, `${label}-3b-cart-cleared`)
    })

    await step(`[${label}] misconfigured skill question blocks the entry with a clear message`, async () => {
      await page.evaluate(() => localStorage.removeItem('pwc_cart_v2'))
      await enter(page, '/competitions/test-misconfigured-monthly', 'SUBMARINER')
      await page.waitForSelector('.cart-error-notice', { visible: true, timeout: 15000 })
      const msg = await page.$eval('.cart-error-notice', e => e.textContent)
      assert.match(msg, /temporarily unavailable/i)
      assert.equal(await page.$('.btn-pay'), null, 'must stay on the skill step')
      await shot(page, `${label}-4-misconfigured`)
    })

    for (const [route, name] of [
      ['/competitions/test-closed-monthly', 'closed'],
      ['/competitions/test-soldout-weekly', 'sold out'],
      ['/competitions/test-scheduled-special', 'scheduled'],
    ]) {
      await step(`[${label}] ${name} competition renders and cannot be entered`, async () => {
        const res = await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle2' })
        assert.ok(res.status() < 400, `HTTP ${res.status()}`) // 304 = browser cache
        const enterable = await page.$('.bundle-card:not([aria-disabled="true"])')
        if (enterable) {
          // If a selector is still shown, the server must refuse the entry.
          await enter(page, route, 'SUBMARINER')
          await page.waitForSelector('.cart-error-notice', { visible: true, timeout: 15000 })
        }
        await shot(page, `${label}-5-${name.replace(' ', '-')}`)
      })
    }

    await step(`[${label}] no console or page errors on any visited page`, async () => {
      assert.equal(page.errorsSeen.length, 0, page.errorsSeen.slice(0, 5).join(' | '))
    })
    await page.close()
  }
} finally {
  await browser.close()
}

console.log(failures ? `\n${failures} step(s) failed` : '\nall browser steps passed')
process.exitCode = failures ? 1 : 0
