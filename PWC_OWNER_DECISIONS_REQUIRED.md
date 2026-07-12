# PWC — Owner Decisions Required

Items that **cannot** be responsibly decided from code alone (business / legal / statistical /
external). Each has the exact follow-up code change ready to apply after approval.
Audit date: 2026-07-12. Nothing here has been assumed or invented.

---

## 1. Legacy free-Omega route final disposition — **NON-BLOCKING (interim fix applied)**
- **Issue:** `/competitions/free-omega-speedmaster-moonwatch` is a stale, misleading URL (old Omega + "free"); its WooCommerce product #13 has been repurposed.
- **Current behaviour (after Phase 2):** permanent redirect (308) → `/past-winners`. No internal links pointed here; not in sitemap.
- **Risk:** if the old Omega competition was real and you want its history public, a redirect erases that page.
- **Options:** (A) keep redirect to `/past-winners` *(applied, recommended)* · (B) reconstruct a genuine ended historical Omega page · (C) return **410 Gone**.
- **Effect:** A = simplest, preserves URL, no history. B = most work, needs verified historical data. C = strongest "this is gone" signal, drops it from all indexes.
- **Code after approval:** B → replace redirect with an ended-state page (no entry CTA, historical canonical). C → `import { notFound }` and return a 410 via a route handler.

## 2. Public company statistics — **RESOLVED (owner-confirmed 2026-07-12)**
- **Confirmed approved values:** `$480K+` prizes, `30,000+` entries, `25+` verified winners, `4.8` Trustpilot, `1,247` reviews. Intentionally hardcoded; not derived from WooCommerce; not unverified.
- **Done:** centralised into one source of truth `lib/company-stats.ts`, consumed by `StatsBar.tsx` and `TrustpilotProof.tsx` so desktop/mobile/crawler text stay in sync. The "rated 5 out of 5" alt text was removed (approved rating is `4.8`). Currency confirmed USD (see #2b).

## 2b. Official currency — **RESOLVED (owner-confirmed 2026-07-12)**
- **Confirmed:** PWC uses **USD ($)** exclusively for current public-facing competitions, pricing, totals and statistics.
- **Verified already-USD:** `lib/store-settings.ts` `DEFAULT_STORE_SETTINGS.currency = 'USD'` / `$`; all dynamic prices render via `formatMoney(settings)`; competition JSON-LD `priceCurrency = settings.currency`.
- **Done (hardcoded `£` → `$` in current public fallbacks):** `lib/competition-data.ts` (comp-001, comp-002), `lib/woocommerce.ts` `wooProductToCompetition`, `lib/cartStore.ts`, `lib/wordpress-journal.ts`, and the `/past-winners` prize display (`lib/past-winners.ts`, `en-GB`→`en-US`). Non-public `£` in code comments / debug `console.log` lines left unchanged (not crawler-visible).
- **Note:** static `drawDateDisplay` strings still read "BST" (timezone, not currency) — live WooCommerce draw dates render in UTC; left as-is pending a separate timezone decision if desired.

## 3. Correct Rolex fallback image — **RESOLVED (owner-confirmed 2026-07-12)**
- **Done:** owner supplied `public/assets/rolex-platinum-daytona-fallback.webp` (a genuine Rolex Cosmograph Daytona). comp-001 `image`/`heroImage` now point to `/assets/rolex-platinum-daytona-fallback.webp`; alt text resolves from the title "Rolex Cosmograph Daytona". comp-002's Omega images left untouched (correct for that legacy template).
- **Path note:** the file exists at `public/assets/rolex-platinum-daytona-fallback.webp`. The alternate path named in the brief (`/assets/images/rolex-cosmograph-daytona-fallback.webp`) does **not** exist on disk, so per the "do not point to a missing path" rule the code references the real file. If you prefer the `images/` path + `cosmograph` filename, rename the asset and I will repoint the two fields.

## 4. `/about` vs `/about-us` — **RESOLVED (no action)**
- Verified: `/about` and `/faq` already `redirect()` to `/about-us` (canonical, self-canonical tag). Sitemap already lists only `/about-us`. No duplication remains.
- **Optional:** upgrade `/about`, `/faq`, `/competitions/closed` from temporary (307) to permanent (308) redirects for cleaner crawl signals (`redirect` → `permanentRedirect`). Non-urgent.

## 5. Current legal wording on free entry — **REVIEW (Phase 1 change)**
- Phase 1 removed "a free postal entry route available" from homepage/weekly/monthly meta descriptions because it contradicted `/terms` and FAQ ("we do not offer free postal entries").
- **Decision:** confirm the Terms/FAQ position (skill-based, no free route) is the approved legal stance. If a free route *does* exist, Terms + FAQ must be corrected instead.

## 6. Sourcing / authenticity claims — **REVIEW**
- FAQ/Terms state watches are "sourced new, verified for authenticity… box and papers where applicable," delivered "fully insured, tracked… ~14 business days." These are unverified business claims (accurate wording assumed).
- **Decision:** confirm these operational claims are true and legally approved. No code change unless wording must change.

## 7. AI training-crawler policy — **DECISION**
- **Current:** `robots.txt` allows all user-agents (`*`) except `/api/`, `/cart`, `/account/`. Search/discovery bots (Googlebot, Bingbot, **OAI-SearchBot**, PerplexityBot) are **allowed** — good for AI-search visibility.
- **Decision:** do you want to allow model-**training** crawlers (e.g. `GPTBot`, `CCBot`, `Google-Extended`, `anthropic-ai`)? This is a business/IP choice, not a code default.
- **Code after approval:** add named `rules` entries in `app/robots.ts` for the specific training bots to disallow — without touching search bots.

## 8. Public debug endpoint — **RESOLVED (owner-confirmed 2026-07-12)**
- **Done:** `app/api/debug/woocommerce/route.ts` now returns a genuine bodyless `404 Not Found` whenever `NODE_ENV !== 'development'` (production + preview), leaking no "disabled" hint. Kept for local development only. No frontend/cart/checkout/WooCommerce/deployment code depends on this route (it is a manual GET test endpoint). No other API route changed.

## 9. On-demand revalidation (webhook) — **DECISION (deferred, plan ready)**
- **Current:** 60s ISR (`lib/woocommerce.ts`, `lib/offer.ts`) — competition status/price/slug/draw date refresh within ~60s; sitemap/metadata follow the same cadence. No contradictory cache surfaces found.
- **Optional plan (only if you want instant propagation):**
  - Endpoint: `app/api/revalidate/route.ts` (POST).
  - Secret: `REVALIDATE_SECRET` env var, compared in constant time; reject otherwise.
  - Revalidate: `revalidatePath('/')`, `/weekly`, `/monthly`, `/special`, `/competitions/[slug]`, `/sitemap.xml`, `/past-winners`.
  - Triggers (WordPress `save_post` / WooCommerce product update): competition goes Live / Sold Out / Ended, or a winner is published.
  - Do **not** trigger on every stock decrement or ticket purchase.
- **Decision:** approve adding it, or keep 60s ISR (fine as-is).

## 10. Historical competition indexing policy — **DECISION**
- **Current:** past competitions surface via `/past-winners`; the sitemap now excludes admin/archive "PAST WINNER" products (Phase 1).
- **Decision:** should individual ended competition product pages be indexable historical pages, or consolidated only under `/past-winners`? Affects whether ended-competition slugs stay in the sitemap.

## 11. IndexNow — **DECISION (deferred)**
- Feasible and low-risk. Would submit canonical public URLs on: new competition Live, Sold Out, Ended, winner published, meaningful journal update. **Not** on stock changes.
- Files if approved: reuse the revalidate endpoint (decision #9) to also POST to `https://api.indexnow.org/indexnow`; host `<key>.txt` in `public/`; store key in env; log failures, never throw.
- **Decision:** approve implementation, or leave dormant. No code added yet (zero operational impact until approved).
