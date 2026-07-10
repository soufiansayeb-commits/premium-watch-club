// Accepted-payment icon strip — the same transparent PNG used under the PDP
// "Continue" button, reused under the cart CTAs. Visual trust only; no logic.
export default function PaymentMethods({ className = '' }: { className?: string }) {
  return (
    <div className={`pay-methods${className ? ` ${className}` : ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand-assets/payment-methods.png"
        alt="Accepted payment methods: Visa, Mastercard, American Express, Discover, PayPal, Apple Pay, Google Pay"
      />
    </div>
  )
}
