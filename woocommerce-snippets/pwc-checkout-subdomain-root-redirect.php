<?php
/**
 * PWC — Checkout Subdomain Root Redirect
 * ════════════════════════════════════════════════════════════════════
 * The checkout lives on its own WordPress site at checkout.premiumwatchclub.com.
 * Visiting the bare root (https://checkout.premiumwatchclub.com/) would otherwise
 * show the default WordPress/theme "home/blog" page. This sends the root straight
 * to the checkout page instead.
 *
 *     https://checkout.premiumwatchclub.com/   →   /checkout/
 *
 * It runs on `template_redirect`, which fires ONLY on real frontend page loads —
 * never for wp-admin, wp-login, the REST API, admin-ajax or cron. It also only
 * acts when BOTH are true: the host is the checkout subdomain, AND the request
 * path is the exact site root ("/" or empty). Every real path is left untouched:
 * /checkout/, /cart/, /my-account/, /terms-and-conditions/,
 * /checkout/order-received/…, /checkout/order-pay/…, assets, etc.
 *
 * It touches NO cart, checkout, payment or order logic — it only redirects the
 * one URL (the bare root) that should never be shown.
 *
 * INSTALLATION (Code Snippets plugin)
 * ───────────────────────────────────
 * 1. WordPress admin → Snippets → Add New.
 * 2. Title: "PWC Checkout Subdomain Root Redirect".
 * 3. Paste EVERYTHING BELOW the `if ( ! defined( 'ABSPATH' ) ) exit;` line
 *    (Code Snippets adds its own opening <?php — do not paste the <?php line).
 * 4. Run "Everywhere", Save and Activate.
 *
 * NOTE: uses a 302 (temporary) redirect while testing. Once confirmed, change the
 * `302` below to `301` (permanent) so browsers/search engines cache it.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

add_action( 'template_redirect', function () {

	// Frontend page loads only. template_redirect never fires for wp-admin,
	// wp-login, the REST API, admin-ajax or cron — these guards make that explicit.
	if ( is_admin() ) return;
	if ( function_exists( 'wp_doing_ajax' ) && wp_doing_ajax() ) return;
	if ( function_exists( 'wp_doing_cron' ) && wp_doing_cron() ) return;
	if ( defined( 'REST_REQUEST' ) && REST_REQUEST ) return;
	if ( defined( 'DOING_AJAX' )   && DOING_AJAX )   return;
	if ( defined( 'DOING_CRON' )   && DOING_CRON )   return;

	// Only act on the checkout subdomain.
	$host = isset( $_SERVER['HTTP_HOST'] ) ? strtolower( wp_unslash( $_SERVER['HTTP_HOST'] ) ) : '';
	if ( 'checkout.premiumwatchclub.com' !== $host ) return;

	// Only act on the EXACT site root ("/" or empty). Any real path
	// (/checkout/, /cart/, /my-account/, /checkout/order-received/…) trims to a
	// non-empty string and is left completely alone.
	$uri  = isset( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : '/';
	$path = trim( (string) parse_url( $uri, PHP_URL_PATH ), '/' );
	if ( '' !== $path ) return;

	// Same-host redirect to the checkout page. No redirect loop: /checkout/ has a
	// non-empty path, so this never fires there. 302 while testing → change to 301.
	wp_safe_redirect( home_url( '/checkout/' ), 302 );
	exit;

}, 1 );
