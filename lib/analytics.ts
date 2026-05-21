// lib/analytics.ts
// Lightweight analytics tracking stubs for PWC.
// Logs events in development. Wire up GA4 / Meta / Klaviyo here later.

export type TrackableEvent =
  | 'skill_answer_selected'
  | 'skill_answer_confirmed'
  | 'add_to_cart'
  | 'cart_opened'
  | 'cart_item_removed'
  | 'cart_quantity_updated'
  | 'begin_checkout'
  | 'checkout_error'
  | 'purchase_completed'

export function trackEvent(
  event: TrackableEvent,
  data?: Record<string, unknown>
): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[PWC analytics] ${event}`, data ?? {})
  }

  // TODO: GA4
  // if (typeof window !== 'undefined' && window.gtag) {
  //   window.gtag('event', event, { ...data })
  // }

  // TODO: Meta Pixel
  // if (typeof window !== 'undefined' && window.fbq) {
  //   window.fbq('track', event, { ...data })
  // }

  // TODO: Klaviyo
  // if (typeof window !== 'undefined' && window._learnq) {
  //   window._learnq.push(['track', event, { ...data }])
  // }

  // TODO: WooCommerce abandoned cart
  // POST /api/cart/track with cart data + email (if captured)
  // Connect to Klaviyo abandoned cart flow or WooCommerce sessions
}
