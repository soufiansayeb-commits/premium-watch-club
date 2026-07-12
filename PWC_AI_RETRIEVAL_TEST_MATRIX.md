# PWC — AI / Search Retrieval Test Matrix

Purpose: verify that crawlers and AI systems (ChatGPT Search, Gemini, Copilot, Perplexity,
Googlebot, Bingbot) can retrieve **one coherent, current answer** about Premium Watch Club.
Validate the *source of truth* first — do not treat a single LLM answer as proof.

Legend — **Consistent?** column: ✅ agree · ⚠ needs owner verification · ❌ contradiction remaining.
Date of audit: 2026-07-12. Domain: `https://premiumwatchclub.com`.

**Official current currency: USD ($)** (owner-confirmed). All current public-facing
competition pricing, totals, structured data and public statistics use USD. The
`$480K+` / `4.8` / `1,247 reviews` / `30,000+` / `25+` figures are owner-approved.

| # | Question | Correct current answer | Authoritative public URL | Source in code/backend | In visible HTML | Metadata consistent | JSON-LD consistent | Risk / Note |
|---|----------|------------------------|--------------------------|------------------------|-----------------|---------------------|--------------------|-------------|
| 1 | What is Premium Watch Club? | A skill-based luxury-watch **competition platform** (curated drops, transparent mechanics, verified winners). Not a retailer or membership shop. | `/about-us`, `/` | `app/about-us/page.tsx`, `layout.tsx` Organization JSON-LD | ✅ | ✅ | ✅ Organization | Low |
| 2 | What is the current competition? | Whichever WooCommerce product is **Live** for each type; served at `/weekly`, `/monthly`, `/special` (URLs never change). | `/weekly` `/monthly` `/special` | `getAllActiveCompetitionsByType()` (`lib/woocommerce.ts`) | ✅ dynamic | ✅ dynamic | ✅ Product/Breadcrumb | Low — no single hardcoded "current" comp |
| 3 | What does an entry cost? | Per-competition entry price from WooCommerce (e.g. shown as `£x.xx`). | current competition URL | WooCommerce `price` → `mergeWooData` | ✅ | ✅ (`generateMetadata`) | ✅ Offer.price | Low |
| 4 | Which currency is used? | **USD ($)**. | all competition pages | `lib/store-settings.ts` (`currency: 'USD'`, `$`), `formatMoney` | ✅ | ✅ | ✅ priceCurrency | ✅ USD confirmed; hardcoded `£` fallbacks corrected to `$` in Phase 3 |
| 5 | Is a skill question required? | Yes — every entry requires a correct skill-based answer. | `/terms`, `/about-us`, FAQ | `terms/page.tsx`, `faq-data.ts`, SkillChallenge flow | ✅ | ✅ | n/a | Low |
| 6 | Is free postal entry available? | **No.** Skill-based competition, not a lottery; no free postal route (Gambling Act 2005). | `/terms`, FAQ | `terms/page.tsx:58`, `faq-data.ts:32` | ✅ | ✅ (fixed Phase 1) | n/a | Low — old "free postal entry route" meta claims removed in Phase 1 |
| 7 | How is the winner selected? | Random draw from all valid entries via **RandomDraws** (independent third party), livestreamed, public draw certificate. | `/terms`, FAQ, `/#how` | `terms/page.tsx:73`, `faq-data.ts:48`, `HowItWorksInteractive.tsx` | ✅ | ✅ | n/a | Low |
| 8 | What role does RandomDraws have? | Independent third-party randomisation system used to run every draw. | `/terms`, FAQ | `randomdraws.com` link in `TicketSelector.tsx`, terms/FAQ | ✅ | n/a | n/a | Low |
| 9 | When does the competition close / draw? | Per-competition draw date from ACF `draw_date` (rendered as `<time>`/countdown + display string). | current competition URL | `parseWooDrawDate` / `drawDateDisplay` | ✅ | ✅ | n/a | ⚠ Confirm countdown server-render (Phase 11, carried to Phase 3) |
| 10 | Is the prize authentic? | Yes — sourced new, verified authentic, box & papers where applicable, certificate issued. | FAQ, `/terms` | `faq-data.ts:24`, `terms/page.tsx:94` | ✅ | n/a | n/a | ⚠ Claim — owner to confirm sourcing wording (decision #6) |
| 11 | How is it delivered? | Fully insured, tracked courier, ~14 business days after verification; sourced in winner's country where possible. | `/terms`, FAQ | `terms/page.tsx:92`, `WatchInfoPanel.tsx:222` | ✅ | n/a | n/a | Low |
| 12 | Where are previous winners shown? | `/past-winners` (branded archive; homepage winners carousel is a subset). | `/past-winners` | `lib/past-winners.ts`, `HomepageWinners.tsx` | ✅ | ✅ | n/a | Low — clones now `aria-hidden` (Phase 2J) |
| 13 | What happens when a competition sells out? | Card stays visible in Sold Out state; entry CTA disabled; Offer JSON-LD `availability = SoldOut`. | current competition URL | `getAllActiveCompetitionsByType` tiers, `buildCompetitionSchemas` | ✅ | ✅ | ✅ | Low |
| 14 | What is the official domain? | `https://premiumwatchclub.com` | all | `metadataBase`, `routes.PRODUCTION_URL`, sitemap/robots | ✅ | ✅ | ✅ | ⚠ Checkout host differs (`premiumwatchclub3471.live-website.com`) — expected (WooCommerce), not the brand domain |
| 15 | What are the official terms? | `/terms`. | `/terms` | `app/terms/page.tsx` | ✅ | ✅ | n/a | Low |
| 16 | Legacy `/competitions/free-omega-speedmaster-moonwatch`? | Retired URL → **301/permanent redirect to `/past-winners`**; no longer represents any live product. | `/past-winners` (target) | `app/competitions/free-omega-speedmaster-moonwatch/page.tsx` | n/a (redirect) | n/a | n/a | Low after Phase 2 — owner may prefer 410 (decision #1) |

## Contradictions still open
- **#9 countdown:** server-rendered zero-state / `<time>` element not yet audited in raw HTML (deferred to a later pass).

## Resolved by owner confirmation (Phase 3)
- **Currency:** USD ($) is official. Hardcoded `£` fallbacks corrected to `$`; `$480K+` is correct USD, not a mismatch.
- **Statistics:** `$480K+`, `30,000+`, `25+`, `4.8`, `1,247 reviews` are owner-approved and centralised in `lib/company-stats.ts`. No "5 out of 5" claim remains.

## Validation method (do before trusting any LLM answer)
1. `npx next build` then inspect raw HTML / `curl` of each URL above.
2. Confirm `<title>`, `<meta description>`, canonical, and JSON-LD match the visible competition.
3. Confirm no old watch/price/date appears in hidden markup or hydration JSON.
4. Only then spot-check ChatGPT Search / Perplexity against the domain.
