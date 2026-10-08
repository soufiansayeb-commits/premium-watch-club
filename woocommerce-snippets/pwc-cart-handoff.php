<?php
/**
 * PWC Cart Handoff — HMAC-signed server-side cart population
 *
 * INSTALLATION
 * ────────────
 * 1. WordPress admin → Code Snippets → Add New → paste this file → Save & Enable.
 * 2. Add the secret constant to wp-config.php (above "That's all, stop editing!"):
 *
 *      define('PWC_CART_HANDOFF_SECRET', 'your-secret-here');
 *
 * 3. Set the SAME value in Next.js (.env.local AND Vercel env vars):
 *
 *      PWC_CART_HANDOFF_SECRET=your-secret-here
 *
 * Generate a strong secret: openssl rand -hex 32
 *
 * Deploy together with pwc-skill-challenge-order-meta.php — that snippet only
 * accepts skill answers this handoff has verified.
 *
 * HOW IT WORKS
 * ────────────
 * Next.js (/api/prepare-checkout) checks every item, then signs
 * { v, items: [{ id, qty, skillAnswer }], ts, nonce } with HMAC-SHA256.
 * The browser is redirected to: https://checkout…/?pwc_cart=<encoded>&pwc_sig=<sig>
 * This snippet:
 *   1. verifies the signature (constant-time) and the 5-minute expiry;
 *   2. accepts each link ONCE (replay protection) — opening it again simply
 *      continues to checkout without touching the cart;
 *   3. replaces the WooCommerce cart with exactly the signed items. WooCommerce
 *      itself then applies the price, bundle discounts, quantity caps, stock and
 *      lifecycle rules — the payload never carries a price or a result;
 *   4. hands the verified skill answers to the skill snippet while it adds them;
 *   5. redirects to /checkout/.
 *
 * Nothing in the payload can affect another customer: the cart that is replaced
 * is the cart of the browser that opens the link.
 *
 * HOOK TIMING NOTE
 * ────────────────
 * Uses wp_loaded (not init) so WooCommerce session + cart are fully initialised
 * before we call WC()->cart->add_to_cart().
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/** Seconds a signed checkout link stays valid. */
defined( 'PWC_HANDOFF_TTL' ) || define( 'PWC_HANDOFF_TTL', 300 );

/** Customer-facing frontend, for the "back to the store" link on error pages. */
function pwc_handoff_frontend_url() {
	return defined( 'PWC_FRONTEND_URL' ) ? rtrim( PWC_FRONTEND_URL, '/' ) : 'https://premiumwatchclub.com';
}

/**
 * Stop with a short, customer-facing message. Never shows internal details —
 * those go to the PHP error log only.
 */
function pwc_handoff_stop( $title, $message, $status ) {
	wp_die(
		'<p>' . esc_html( $message ) . '</p>'
		. '<p><a href="' . esc_url( pwc_handoff_frontend_url() . '/cart' ) . '">' . esc_html__( '← Return to your basket', 'pwc' ) . '</a></p>',
		esc_html( $title ),
		array( 'response' => (int) $status )
	);
}

/**
 * Verify and decode the signed payload in the current request.
 *
 * @return array|WP_Error the payload, or an error code describing why it was rejected.
 */
function pwc_handoff_verify_request() {
	$secret = defined( 'PWC_CART_HANDOFF_SECRET' ) ? (string) PWC_CART_HANDOFF_SECRET : '';
	if ( '' === $secret ) {
		return new WP_Error( 'not_configured' );
	}

	$encoded = isset( $_GET['pwc_cart'] ) ? sanitize_text_field( wp_unslash( $_GET['pwc_cart'] ) ) : '';
	$sig     = isset( $_GET['pwc_sig'] ) ? sanitize_text_field( wp_unslash( $_GET['pwc_sig'] ) ) : '';
	if ( '' === $encoded || '' === $sig || strlen( $encoded ) > 8192 ) {
		return new WP_Error( 'invalid' );
	}

	if ( ! hash_equals( hash_hmac( 'sha256', $encoded, $secret ), $sig ) ) {
		return new WP_Error( 'bad_signature' );
	}

	$json    = base64_decode( strtr( $encoded, '-_', '+/' ), true );
	$payload = ( false === $json ) ? null : json_decode( $json, true );
	if ( ! is_array( $payload ) || empty( $payload['items'] ) || ! is_array( $payload['items'] ) || ! isset( $payload['ts'] ) ) {
		return new WP_Error( 'invalid' );
	}

	$age = time() - (int) $payload['ts'];
	if ( $age < -60 || $age > PWC_HANDOFF_TTL ) { // small allowance for clock skew
		return new WP_Error( 'expired' );
	}

	return $payload;
}

add_action( 'wp_loaded', 'pwc_handle_cart_handoff', 10 );
function pwc_handle_cart_handoff() {
	if ( empty( $_GET['pwc_cart'] ) || empty( $_GET['pwc_sig'] ) ) {
		return;
	}

	// Never let a signed link be cached by a page cache or a proxy.
	nocache_headers();

	$payload = pwc_handoff_verify_request();
	if ( is_wp_error( $payload ) ) {
		switch ( $payload->get_error_code() ) {
			case 'not_configured':
				error_log( '[PWC cart handoff] PWC_CART_HANDOFF_SECRET is not defined in wp-config.php' );
				pwc_handoff_stop( __( 'Checkout unavailable', 'pwc' ), __( 'Checkout is temporarily unavailable. Please try again in a few minutes.', 'pwc' ), 503 );
				break;
			case 'expired':
				pwc_handoff_stop( __( 'Checkout link expired', 'pwc' ), __( 'This checkout link has expired. Please return to your basket and continue to checkout again — your basket is still saved.', 'pwc' ), 410 );
				break;
			default:
				error_log( '[PWC cart handoff] rejected link: ' . $payload->get_error_code() );
				pwc_handoff_stop( __( 'Invalid checkout link', 'pwc' ), __( 'This checkout link is not valid. Please return to your basket and try again.', 'pwc' ), 403 );
		}
		return;
	}

	if ( ! function_exists( 'WC' ) ) {
		error_log( '[PWC cart handoff] WooCommerce is not active' );
		pwc_handoff_stop( __( 'Checkout unavailable', 'pwc' ), __( 'Checkout is temporarily unavailable. Please try again in a few minutes.', 'pwc' ), 503 );
	}
	if ( function_exists( 'wc_load_cart' ) ) {
		wc_load_cart();
	}
	if ( ! WC()->cart ) {
		error_log( '[PWC cart handoff] WooCommerce cart is not available' );
		pwc_handoff_stop( __( 'Checkout unavailable', 'pwc' ), __( 'Checkout is temporarily unavailable. Please try again in a few minutes.', 'pwc' ), 503 );
	}

	// ── Replay protection: each signed link populates a cart once ─────────────
	// A second visit (refresh, back button, a second tab) continues to checkout
	// with whatever the cart holds now — it never rebuilds or duplicates it.
	$used_key = 'pwc_ho_' . md5( sanitize_text_field( wp_unslash( $_GET['pwc_sig'] ) ) );
	if ( get_transient( $used_key ) ) {
		if ( WC()->cart->is_empty() ) {
			pwc_handoff_stop( __( 'Checkout link already used', 'pwc' ), __( 'This checkout link has already been used. Please return to your basket and continue to checkout again.', 'pwc' ), 410 );
		}
		wp_safe_redirect( wc_get_checkout_url() );
		exit;
	}
	set_transient( $used_key, 1, PWC_HANDOFF_TTL + 120 );

	// ── Collect the signed items ───────────────────────────────────────────────
	$items   = array();
	$answers = array();
	foreach ( $payload['items'] as $item ) {
		$product_id = isset( $item['id'] ) ? absint( $item['id'] ) : 0;
		$qty        = isset( $item['qty'] ) ? absint( $item['qty'] ) : 0;
		if ( $product_id < 1 || $qty < 1 || isset( $items[ $product_id ] ) ) {
			continue; // invalid or duplicate line — ignored
		}
		$items[ $product_id ] = $qty;
		if ( isset( $item['skillAnswer'] ) && is_string( $item['skillAnswer'] ) ) {
			$answers[ $product_id ] = sanitize_text_field( $item['skillAnswer'] );
		}
		// Note: any client-supplied "skillResult" in older payloads is ignored —
		// correctness is decided at order time by the skill snippet.
	}
	if ( empty( $items ) ) {
		pwc_handoff_stop( __( 'Invalid checkout link', 'pwc' ), __( 'This checkout link is not valid. Please return to your basket and try again.', 'pwc' ), 400 );
	}

	// ── Replace the cart with exactly the signed items ─────────────────────────
	WC()->cart->empty_cart();

	// Verified answers are visible to the skill snippet only while we add items.
	$GLOBALS['pwc_handoff_skill_answers'] = $answers;

	$added = 0;
	foreach ( $items as $product_id => $qty ) {
		$product = wc_get_product( $product_id );
		if ( ! $product ) {
			continue;
		}
		// Cap to the per-competition limit (checkout-quantity-controls.php). The
		// cart re-validation enforces it again on every page load.
		if ( function_exists( 'pwc_get_allowed_max_qty' ) ) {
			$max_qty = pwc_get_allowed_max_qty( $product_id );
			if ( $max_qty > 0 ) {
				$qty = min( $qty, $max_qty );
			}
		}
		// add_to_cart runs every WooCommerce + PWC validation (purchasable,
		// stock, lifecycle, skill answer) and adds a customer notice on failure.
		if ( false !== WC()->cart->add_to_cart( $product_id, $qty ) ) {
			$added++;
		}
	}

	unset( $GLOBALS['pwc_handoff_skill_answers'] );

	error_log( sprintf( '[PWC cart handoff] added %d of %d item(s)', $added, count( $items ) ) );

	if ( 0 === $added ) {
		// Show the customer-facing reasons WooCommerce gave (closed, sold out, …).
		$reasons = array();
		foreach ( wc_get_notices( 'error' ) as $notice ) {
			$text = is_array( $notice ) ? ( isset( $notice['notice'] ) ? $notice['notice'] : '' ) : (string) $notice;
			$text = trim( wp_strip_all_tags( $text ) );
			if ( '' !== $text ) {
				$reasons[] = $text;
			}
		}
		wc_clear_notices();
		$message = $reasons
			? implode( ' ', array_unique( $reasons ) )
			: __( 'None of the competitions in your basket can be entered right now.', 'pwc' );
		pwc_handoff_stop( __( 'Checkout unavailable', 'pwc' ), $message, 409 );
	}

	// Partial failures keep their WooCommerce notices, which the checkout page shows.
	wp_safe_redirect( wc_get_checkout_url() );
	exit;
}
