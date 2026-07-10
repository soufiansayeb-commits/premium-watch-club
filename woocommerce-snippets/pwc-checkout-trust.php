<?php
/**
 * PWC — Checkout Trust Strip (payment icons + Trustpilot under Place Order)
 * ════════════════════════════════════════════════════════════════════
 * Inserts a small, centered trust strip immediately UNDER the WooCommerce
 * Checkout Blocks "Place Order" button:
 *
 *     [ Place Order ]
 *     Visa · Mastercard · Amex · Discover · PayPal · Apple Pay · G Pay   (payment-methods.png)
 *     Trustpilot  ★★★★★  ·  Based on 1,247 reviews
 *     Secure Checkout · 18+ Only · Skill-Based Competition · …           (existing CSS ::after)
 *
 * WHY A SNIPPET (not CSS): WooCommerce Checkout Blocks renders the actions
 * area in React and offers no hook to place two real <img> elements there.
 * This injects real image elements and re-inserts them if Blocks re-render.
 * It NEVER touches totals, payment methods, coupons, quantities, order
 * creation or validation — it only adds trust imagery.
 *
 * INSTALLATION (Code Snippets plugin)
 * ───────────────────────────────────
 * 1. WordPress admin → Snippets → Add New.
 * 2. Title: "PWC Checkout Trust Strip".
 * 3. Paste EVERYTHING BELOW the `if ( ! defined( 'ABSPATH' ) ) exit;` line
 *    (Code Snippets adds its own opening <?php — do not paste the <?php line).
 * 4. Set to run "Everywhere" (frontend only is fine too), Save and Activate.
 * 5. Paste the matching CSS (.pwc-trust-strip …) into
 *    Appearance → Customize → Additional CSS — it ships in pwc-checkout.css.
 *
 * Assets are loaded from the frontend domain (where /public is served):
 *   /brand-assets/payment-methods.png   (transparent PNG — same as the PDP)
 *   /brand-assets/trustpilot-logo.png
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

/** The trust-strip markup (payment icons + Trustpilot). */
function pwc_ts_strip_html() {
	$base = rtrim( PWC_FRONTEND_URL, '/' );
	$pay  = $base . '/brand-assets/payment-methods.png';
	$tp   = $base . '/brand-assets/trustpilot-logo.png';
	return '<div class="pwc-trust-strip" aria-hidden="false">'
		. '<img class="pwc-trust-pay" src="' . esc_url( $pay ) . '" '
		. 'alt="Accepted payment methods: Visa, Mastercard, American Express, Discover, PayPal, Apple Pay, Google Pay" />'
		. '<span class="pwc-trust-tp">'
		. '<img src="' . esc_url( $tp ) . '" alt="Trustpilot — rated 5 out of 5" />'
		. '<span>Based on 1,247 reviews</span>'
		. '</span>'
		. '</div>';
}

/* ── Inject into the Blocks checkout, keep it present across re-renders ─────── */
add_action( 'wp_footer', function () {
	if ( ! pwc_ts_is_checkout_form() ) return;
	$html = wp_json_encode( pwc_ts_strip_html() );
	?>
	<script>
	(function () {
		var STRIP_HTML = <?php echo $html; // phpcs:ignore — escaped in PHP ?>;

		function place() {
			var actions = document.querySelector('.wp-block-woocommerce-checkout-actions-block');
			if ( ! actions ) return;
			if ( actions.querySelector('.pwc-trust-strip') ) return; // already there
			var wrap = document.createElement('div');
			wrap.innerHTML = STRIP_HTML;
			var strip = wrap.firstChild;
			if ( ! strip ) return;
			var btn = actions.querySelector('.wc-block-components-checkout-place-order-button');
			if ( btn ) {
				btn.after( strip );          // directly under the Place Order button
			} else {
				actions.appendChild( strip );
			}
		}

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
