<?php
/**
 * PWC — Checkout: hide "Return to Cart" button + notice cleanup
 *
 * HOW TO INSTALL:
 *   Code Snippets plugin → find "PWC Checkout Return to Cart URL" → Edit →
 *   replace the entire content with this file → Save & Activate.
 *
 * WHAT THIS DOES:
 *   1. Hides the "Return to Cart" button on checkout (Blocks + classic).
 *      Customers use the browser back button instead. Place Order is unaffected.
 *   2. Hides success/info notice banners on cart and checkout pages.
 *      Payment errors (.is-error) and validation messages are NOT hidden.
 */

// Constant kept for woocommerce_cart_url filter below.
define( 'PWC_RETURN_TO_CART_URL', 'https://premiumwatchclub.com/cart' );

// Keep the WooCommerce cart URL pointing to the frontend (used internally by Woo).
add_filter( 'woocommerce_cart_url', function () {
    return PWC_RETURN_TO_CART_URL;
} );

add_action( 'wp_head', function () {
    if ( ! is_checkout() && ! is_cart() ) return;
    ?>
    <style>
    /* ── Hide "Return to Cart" button — WooCommerce Blocks checkout ── */
    .wc-block-components-checkout-return-to-cart-button { display: none !important; }

    /* ── Hide "Return to Cart" — classic WooCommerce checkout ── */
    .woocommerce-checkout .wc-backward,
    .woocommerce-checkout .woocommerce-cart-link { display: none !important; }

    /* ── Classic WooCommerce notices ── */
    .woocommerce-notices-wrapper .woocommerce-message,
    .woocommerce-notices-wrapper .woocommerce-info { display: none !important; }

    /* ── WooCommerce Blocks notice banners ── */
    .wc-block-components-notice-banner.is-success,
    .wc-block-components-notice-banner.is-info,
    .wc-block-store-notices .wc-block-components-notice-banner.is-success,
    .wc-block-store-notices .wc-block-components-notice-banner.is-info { display: none !important; }
    </style>
    <?php
} );
