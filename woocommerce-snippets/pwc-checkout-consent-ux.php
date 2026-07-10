<?php
/**
 * PWC — Checkout Consent UX: visible inline Terms error (WooCommerce Blocks)
 * ════════════════════════════════════════════════════════════════════
 * WooCommerce Checkout Blocks DOES block the order when the required Terms
 * checkbox is unticked — but it surfaces that failure as a NOTICE at the top
 * of the checkout, not as a field-style error next to the checkbox. On mobile
 * that notice scrolls out of view, so the customer sees no clear reason.
 *
 * This adds a clear, red, field-style error DIRECTLY next to the Terms
 * checkbox when Place Order is clicked while it is unticked, and removes it the
 * moment the box is ticked. It does NOT touch validation, totals, payment or
 * order creation — WooCommerce still blocks the order on its own. Purely a
 * visibility/message enhancement.
 *
 * INSTALLATION (Code Snippets plugin)
 * ───────────────────────────────────
 * 1. WordPress admin → Snippets → Add New.
 * 2. Title: "PWC Checkout Consent UX".
 * 3. Paste EVERYTHING BELOW the `if ( ! defined( 'ABSPATH' ) ) exit;` line.
 * 4. Run "Everywhere" (frontend only is fine), Save and Activate.
 * 5. The matching styles (.pwc-terms-error …) ship in pwc-checkout.css →
 *    paste that into Appearance → Customize → Additional CSS.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/** True only on the live checkout form — never on order-received or order-pay. */
function pwc_ux_is_checkout_form() {
	if ( is_admin() ) return false;
	if ( ! function_exists( 'is_checkout' ) || ! is_checkout() ) return false;
	if ( function_exists( 'is_order_received_page' ) && is_order_received_page() ) return false;
	if ( function_exists( 'is_wc_endpoint_url' ) && is_wc_endpoint_url( 'order-pay' ) ) return false;
	return true;
}

add_action( 'wp_footer', function () {
	if ( ! pwc_ux_is_checkout_form() ) return;
	?>
	<script>
	(function () {
		var MSG = 'Please accept the Terms and Conditions to continue.';
		var submitAttempted = false;

		function block()   { return document.querySelector('.wp-block-woocommerce-checkout-terms-block'); }
		function checkbox() { var b = block(); return b ? b.querySelector('input[type="checkbox"]') : null; }

		function apply() {
			var b = block(); if ( ! b ) return;
			var cb = checkbox();
			var unchecked = cb && ! cb.checked;

			if ( submitAttempted && unchecked ) {
				b.classList.add('pwc-has-error');
				// Don't duplicate a native error if WooCommerce already shows one.
				var hasNative = b.querySelector('.wc-block-components-validation-error');
				if ( ! hasNative && ! b.querySelector('.pwc-terms-error') ) {
					var e = document.createElement('div');
					e.className = 'pwc-terms-error';
					e.setAttribute('role', 'alert');
					e.textContent = MSG;
					b.appendChild(e);
				}
			} else {
				b.classList.remove('pwc-has-error');
				var ex = b.querySelector('.pwc-terms-error');
				if ( ex ) ex.remove();
			}
		}

		// On Place Order click: if terms unticked, show the message + scroll to it.
		// We never preventDefault — WooCommerce still blocks the order itself.
		document.addEventListener('click', function (e) {
			var btn = e.target.closest && e.target.closest('.wc-block-components-checkout-place-order-button');
			if ( ! btn ) return;
			submitAttempted = true;
			apply();
			var cb = checkbox();
			if ( cb && ! cb.checked ) {
				var b = block();
				if ( b && b.scrollIntoView ) b.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		}, true);

		// Clear the message the instant the box is ticked.
		document.addEventListener('change', function (e) {
			var cb = e.target;
			if ( cb && cb.type === 'checkbox' && cb.closest && cb.closest('.wp-block-woocommerce-checkout-terms-block') ) {
				if ( cb.checked ) submitAttempted = false;
				apply();
			}
		}, true);

		// Blocks re-render the form on state changes — re-assert if still needed.
		var root = document.querySelector('.wc-block-checkout') || document.body;
		new MutationObserver(function () { if ( submitAttempted ) apply(); })
			.observe(root, { childList: true, subtree: true });
	})();
	</script>
	<?php
}, 100 );
