<?php
/**
 * PWC — Checkout Trust & Payment (two SEPARATE rows)
 * ════════════════════════════════════════════════════════════════════
 * Places two distinct, real-element rows on the Blocks checkout:
 *
 *   A) PAYMENT ICONS  → directly under the "Place Order" button, centered
 *        [ Place Order ]
 *        Visa · Mastercard · Amex · Discover · PayPal · Apple Pay · G Pay
 *
 *   B) TRUST ROW      → inside the Order Summary card, under the Total
 *        ★★★★★  Based on 1,200+ reviews        (stars only — no wordmark)
 *
 * These are intentionally NOT combined — payment lives by the button, the
 * review proof lives under the order total (same on mobile and desktop).
 *
 * WHY A SNIPPET (not CSS): WooCommerce Checkout Blocks renders these areas
 * in React and offers no hook to place real <img>/<span> elements there.
 * This injects them and re-inserts if Blocks re-render. It NEVER touches
 * totals, payment methods, coupons, quantities, order creation or
 * validation — presentation only.
 *
 * INSTALLATION (Code Snippets plugin)
 * ───────────────────────────────────
 * 1. WordPress admin → Snippets → open "PWC Checkout Trust Strip"
 *    (or Add New with that title).
 * 2. Replace its body with EVERYTHING BELOW the
 *    `if ( ! defined( 'ABSPATH' ) ) exit;` line (Code Snippets adds its own
 *    opening <?php — do not paste the <?php line).
 * 3. Run "Everywhere" (frontend is fine), Save and Activate.
 * 4. Paste the matching CSS (.pwc-pay-strip / .pwc-trust-row …) into
 *    Appearance → Customize → Additional CSS — it ships in pwc-checkout.css.
 *
 * Assets are loaded from the frontend domain (where /public is served):
 *   /brand-assets/payment-methods.png   (transparent PNG — same as the PDP)
 *   /brand-assets/trustpilot-stars.png  (stars only — no wordmark, matches the PDP)
 * Override the frontend URL in wp-config.php if needed:
 *   define('PWC_FRONTEND_URL', 'https://premiumwatchclub.com');
 */

if ( ! defined( 'ABSPATH' ) ) exit;

if ( ! defined( 'PWC_FRONTEND_URL' ) ) {
	define( 'PWC_FRONTEND_URL', 'https://premiumwatchclub.com' );
}

/** True only on the live checkout form — never on order-received or order-pay. */
function pwc_ts_is_checkout_form() {
	if ( is_admin() ) return false;
	if ( ! function_exists( 'is_checkout' ) || ! is_checkout() ) return false;
	if ( function_exists( 'is_order_received_page' ) && is_order_received_page() ) return false;
	if ( function_exists( 'is_wc_endpoint_url' ) && is_wc_endpoint_url( 'order-pay' ) ) return false;
	return true;
}

/** Payment icons row (goes directly under the Place Order button). */
function pwc_ts_pay_html() {
	$base = rtrim( PWC_FRONTEND_URL, '/' );
	$pay  = $base . '/brand-assets/payment-methods.png';
	return '<div class="pwc-pay-strip" aria-hidden="false">'
		. '<img src="' . esc_url( $pay ) . '" '
		. 'style="display:block;width:100%;max-width:300px;height:auto;margin:0 auto;opacity:.9" '
		. 'alt="Accepted payment methods: Visa, Mastercard, American Express, Discover, PayPal, Apple Pay, Google Pay" />'
		. '</div>';
}

/** Trust row — stars only + real review text (goes under the order Total). */
function pwc_ts_trust_html() {
	$base = rtrim( PWC_FRONTEND_URL, '/' );
	$tp   = $base . '/brand-assets/trustpilot-stars.png'; // stars only — no wordmark
	return '<div class="pwc-trust-row" aria-hidden="false">'
		. '<img src="' . esc_url( $tp ) . '" style="width:auto;height:20px;display:block" alt="Rated 5 out of 5 stars" />'
		. '<span>Based on 1,200+ reviews</span>'
		. '</div>';
}

/* ── Inject into the Blocks checkout, keep both present across re-renders ───── */
add_action( 'wp_footer', function () {
	if ( ! pwc_ts_is_checkout_form() ) return;
	$pay   = wp_json_encode( pwc_ts_pay_html() );
	$trust = wp_json_encode( pwc_ts_trust_html() );
	?>
	<script>
	(function () {
		var PAY_HTML   = <?php echo $pay;   // phpcs:ignore — escaped in PHP ?>;
		var TRUST_HTML = <?php echo $trust; // phpcs:ignore — escaped in PHP ?>;

		function toEl(html) {
			var wrap = document.createElement('div');
			wrap.innerHTML = html;
			return wrap.firstChild;
		}

		/* A) Payment icons — directly under the Place Order button.
		   Append to the actions BLOCK (not right after the button): WooCommerce
		   nests the button inside a flex row, so btn.after() would drop the strip
		   beside the button. As the block's last child it stacks cleanly below. */
		function placePay() {
			var actions = document.querySelector('.wp-block-woocommerce-checkout-actions-block');
			if ( ! actions ) return;
			if ( actions.querySelector('.pwc-pay-strip') ) return; // already there
			var el = toEl(PAY_HTML);
			if ( ! el ) return;
			actions.appendChild( el );
		}

		/* B) Trust row — under the Total, inside the Order Summary card. */
		function placeTrust() {
			var summary = document.querySelector('.wp-block-woocommerce-checkout-order-summary-block');
			if ( ! summary ) return;
			if ( summary.querySelector('.pwc-trust-row') ) return; // already there
			var el = toEl(TRUST_HTML);
			if ( ! el ) return;
			summary.appendChild( el );    // after the totals (Total is the last row)
		}

		function place() { placePay(); placeTrust(); }

		function init() {
			place();
			var root = document.querySelector('.wc-block-checkout') || document.body;
			// Blocks re-render on payment/shipping changes — re-insert if wiped.
			var mo = new MutationObserver(function () { place(); });
			mo.observe(root, { childList: true, subtree: true });
		}

		if ( document.readyState === 'loading' ) {
			document.addEventListener('DOMContentLoaded', init);
		} else {
			init();
		}
	})();
	</script>
	<?php
}, 100 );
