# Tests

Geen van deze tests praat met de live shop. De API- en browsertests draaien tegen een nep-WooCommerce (`tests/mock-woo/server.mjs`) met één testcompetitie per levensfase: live, gepland, uitverkocht, gesloten, handmatig gesloten en verkeerd geconfigureerd.

| Commando | Wat het test | Nodig |
|---|---|---|
| `npm test` | Pure logica: skill-check, levenscyclus, bundelprijzen, ticketlimieten | niets |
| `npm run test:php` | De WordPress-snippets (skill, handoff, export, korting, CORS) tegen nagebootste WP/WC-functies | PHP 8 CLI |
| `npm run test:api` | API-routes end-to-end | build + server tegen de mock (zie hieronder) |
| `npm run test:e2e` | Browserflow desktop + mobiel: tickets → skill → checkout-handoff | build + server tegen de mock |
| `npm run check:skills` | **Alleen-lezen** check op de echte shop: hebben alle open/geplande competities een complete skill-vraag? Toont nooit antwoorden. | `.env.local` |

## API- en browsertests draaien

```bash
# 1. nep-WooCommerce starten (laten draaien)
npm run mock:woo

# 2. in een tweede terminal: build + start tegen de mock
export WOOCOMMERCE_STORE_URL=http://127.0.0.1:3999 WOOCOMMERCE_CONSUMER_KEY=ck_test \
       WOOCOMMERCE_CONSUMER_SECRET=cs_test PWC_CART_HANDOFF_SECRET=test-handoff-secret-0123456789abcdef \
       NEXT_PUBLIC_WOOCOMMERCE_CHECKOUT_URL=http://127.0.0.1:3999/checkout/
npx next build && npx next start -p 3100

# 3. in een derde terminal
npm run test:api
npm run test:e2e
NEXT_URL=http://127.0.0.1:3100 npm run test:php   # inclusief Next.js → PHP handoff-check
```

Let op: een build tegen de mock overschrijft `.next`. Draai daarna opnieuw `npm run build` met de echte `.env.local` voordat je lokaal de echte site bekijkt.
