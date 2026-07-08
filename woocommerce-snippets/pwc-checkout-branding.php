<?php
/**
 * PWC — Checkout Header Branding (logo)
 * ════════════════════════════════════════════════════════════════════
 * Adds the Premium Watch Club gold wordmark to the top of the WooCommerce
 * checkout page, in a clean centered branded header — so the checkout matches
 * the main site. Nothing else on the checkout is changed.
 *
 * INSTALLATION (Code Snippets plugin)
 * ───────────────────────────────────
 * 1. WordPress admin → Snippets → Add New.
 * 2. Title: "PWC Checkout Branding".
 * 3. Paste EVERYTHING BELOW the `if ( ! defined( 'ABSPATH' ) ) exit;` line
 *    (Code Snippets adds its own opening <?php — do not paste the <?php line).
 * 4. Set to run "Everywhere", Save and Activate.
 *
 * SAFE: only prints a logo + CSS on the checkout page. Never touches totals,
 * payment methods, coupons, quantities, order creation, or order-received.
 *
 * The logo is loaded from the frontend domain (where /public is served), so no
 * media upload is required. Override the frontend URL in wp-config.php if needed:
 *   define('PWC_FRONTEND_URL', 'https://premiumwatchclub.com');
 */

if ( ! defined( 'ABSPATH' ) ) exit;

if ( ! defined( 'PWC_FRONTEND_URL' ) ) {
	define( 'PWC_FRONTEND_URL', 'https://premiumwatchclub.com' );
}

/** True only on the live checkout form — never on order-received or order-pay. */
function pwc_cb_is_checkout_form() {
	if ( is_admin() ) return false;
	if ( ! function_exists( 'is_checkout' ) || ! is_checkout() ) return false;
	if ( function_exists( 'is_order_received_page' ) && is_order_received_page() ) return false;
	if ( function_exists( 'is_wc_endpoint_url' ) && is_wc_endpoint_url( 'order-pay' ) ) return false;
	return true;
}

/** The branded header markup (logo). */
function pwc_cb_logo_html() {
	$logo = rtrim( PWC_FRONTEND_URL, '/' ) . '/brand-assets/pwc-logo-wordmark-gold.png';
	return '<div class="pwc-checkout-brand" role="banner">'
		. '<a class="pwc-checkout-brand-link" href="' . esc_url( rtrim( PWC_FRONTEND_URL, '/' ) . '/' ) . '">'
		. '<img class="pwc-checkout-brand-logo" src="' . esc_url( $logo ) . '" alt="Premium Watch Club" />'
		. '</a></div>';
}

/* ── Classic checkout: print the header above the form ─────────────────────── */
add_action( 'woocommerce_before_checkout_form', function () {
	if ( ! pwc_cb_is_checkout_form() ) return;
	echo pwc_cb_logo_html(); // phpcs:ignore — static, escaped markup
}, 5 );

/* ── Styles (checkout only) ────────────────────────────────────────────────── */
add_action( 'wp_head', function () {
	if ( ! pwc_cb_is_checkout_form() ) return;
	?>
	<style id="pwc-checkout-branding">
		.pwc-checkout-brand {
			display: flex;
			justify-content: center;
			align-items: center;
			padding: 22px 16px 26px;
			margin: 0 0 8px;
			text-align: center;
		}
		.pwc-checkout-brand-link { display: inline-block; line-height: 0; }
		.pwc-checkout-brand-logo {
			display: block;
			height: clamp(34px, 5vw, 46px);
			width: auto;
			max-width: 100%;
			object-fit: contain;
		}
		@media (max-width: 600px) {
			.pwc-checkout-brand { padding: 16px 14px 20px; }
			.pwc-checkout-brand-logo { height: 32px; }
		}
	</style>
	<?php
}, 99 );

/* ── Block-checkout / theme fallback ───────────────────────────────────────────
 * If the classic `woocommerce_before_checkout_form` hook didn't render (e.g. the
 * checkout uses the block, or the theme suppresses the hook), insert the same
 * header at the top of the checkout container via JS. Idempotent — it will not
 * add a second logo if the PHP hook already printed one. */
add_action( 'wp_footer', function () {
	if ( ! pwc_cb_is_checkout_form() ) return;
	$html = wp_json_encode( pwc_cb_logo_html() );
	?>
	<script>
	document.addEventListener('DOMContentLoaded', function () {
		if ( document.querySelector('.pwc-checkout-brand') ) return; // already rendered by PHP
		var host = document.querySelector('.wc-block-checkout, form.woocommerce-checkout, .woocommerce-checkout, .woocommerce');
		if ( ! host ) return;
		var wrap = document.createElement('div');
		wrap.innerHTML = <?php echo $html; // phpcs:ignore — escaped in PHP ?>;
		var node = wrap.firstChild;
		if ( node ) host.parentNode.insertBefore( node, host );
	});
	</script>
	<?php
}, 99 );
