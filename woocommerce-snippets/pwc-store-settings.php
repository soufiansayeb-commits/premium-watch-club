<?php
/**
 * Plugin Name: PWC Store Settings
 * Plugin URI:  https://premiumwatchclub.com
 * Description: Exposes the WooCommerce currency settings to the Next.js frontend so
 *              all prices on the site follow the store's currency automatically.
 * Version:     1.0.0
 * Author:      Premium Watch Club
 *
 * INSTALLATION (Code Snippets plugin)
 * ───────────────────────────────────
 * 1. WordPress admin → Snippets → Add New.
 * 2. Title it "PWC Store Settings".
 * 3. Paste EVERYTHING BELOW the `if ( ! defined( 'ABSPATH' ) ) exit;` line
 *    (Code Snippets adds its own opening <?php, so do NOT paste the <?php line).
 * 4. Set it to run "Everywhere", Save and Activate.
 *
 * (Or, as a real plugin: copy this whole file to
 *  wp-content/plugins/pwc-store-settings/pwc-store-settings.php and activate it.)
 *
 * REST ENDPOINT (public, read-only, no auth)
 * ──────────────────────────────────────────
 * GET /wp-json/pwc/v1/store-settings
 * Returns the live WooCommerce currency configuration:
 *   {
 *     "currency":           "USD",
 *     "currency_symbol":    "$",
 *     "currency_position":  "left",     // left | right | left_space | right_space
 *     "thousand_separator": ",",
 *     "decimal_separator":  ".",
 *     "number_of_decimals": 2
 *   }
 *
 * Change the currency in WooCommerce → Settings → General and the whole frontend
 * follows within a few minutes (the frontend caches this for ~5 min in production).
 */

if ( ! defined( 'ABSPATH' ) ) exit;

add_action( 'rest_api_init', function () {
    register_rest_route( 'pwc/v1', '/store-settings', [
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'pwc_rest_get_store_settings',
        'permission_callback' => '__return_true',
    ] );
} );

function pwc_rest_get_store_settings() {
    // Prefer WooCommerce's own helpers so the values always match checkout.
    if ( function_exists( 'get_woocommerce_currency' ) ) {
        $code      = get_woocommerce_currency();
        $symbol    = html_entity_decode( get_woocommerce_currency_symbol( $code ) );
        $position  = get_option( 'woocommerce_currency_pos', 'left' );
        $thousand  = wc_get_price_thousand_separator();
        $decimal   = wc_get_price_decimal_separator();
        $decimals  = wc_get_price_decimals();
    } else {
        // WooCommerce not active — fall back to raw options / sane defaults.
        $code      = get_option( 'woocommerce_currency', 'USD' );
        $symbol    = '$';
        $position  = get_option( 'woocommerce_currency_pos', 'left' );
        $thousand  = get_option( 'woocommerce_price_thousand_sep', ',' );
        $decimal   = get_option( 'woocommerce_price_decimal_sep', '.' );
        $decimals  = (int) get_option( 'woocommerce_price_num_decimals', 2 );
    }

    $response = [
        'currency'           => sanitize_text_field( $code ),
        'currency_symbol'    => $symbol,
        'currency_position'  => sanitize_text_field( $position ),
        'thousand_separator' => $thousand,
        'decimal_separator'  => $decimal,
        'number_of_decimals' => (int) $decimals,
    ];

    $res = rest_ensure_response( $response );
    // Short cache — currency rarely changes but should propagate quickly when it does.
    $res->header( 'Cache-Control', 'public, max-age=300' );
    return $res;
}
