<?php
/**
 * PWC — Frontend Cart URL + Checkout Notice Cleanup
 *
 * HOW TO INSTALL:
 *   Option A (recommended): Install "Code Snippets" plugin → Snippets → Add New
 *                           Paste this entire file content, enable it, save.
 *   Option B:               Copy into your child theme's functions.php
 *
 * WHAT THIS DOES:
 *   1. Redirects the "Return to cart" link on the WooCommerce checkout page
 *      to the PWC frontend cart page instead of the default WooCommerce /cart/.
 *   2. Hides the "has been added to your cart" success banner on checkout.
 *      Payment errors, validation messages, and other notices are NOT affected.
 */


// ── 1. Frontend cart URL ──────────────────────────────────────────────────────
// Change this URL when you go live on Vercel / your custom domain.
// Local dev:  http://localhost:3000/cart
// Production: https://your-domain.com/cart  ← CHANGE THIS

// Local dev:  http://localhost:3000/cart
// Production: https://your-vercel-domain.com/cart  ← CHANGE THIS before deploying
define( 'PWC_FRONTEND_CART_URL', 'http://localhost:3000/cart' );

// woocommerce_cart_url is the real filter used by wc_get_cart_url().
// WooCommerce Blocks checkout reads this value for the "Return to Cart" link.
add_filter( 'woocommerce_cart_url', function () {
    return PWC_FRONTEND_CART_URL;
} );


// ── 2. Hide cart/checkout informational notices ───────────────────────────────
// Hides "added to your cart" and "quantity was changed to…" messages on both
// the cart and checkout pages. Payment errors (.is-error) and form validation
// messages are intentionally NOT hidden.

add_action( 'wp_head', function () {
    if ( ! is_checkout() && ! is_cart() ) return;
    ?>
    <style>
    /* Classic WooCommerce: "X has been added to your cart" (green bar) */
    .woocommerce-notices-wrapper .woocommerce-message,
    /* Classic WooCommerce: "The quantity of X was changed to…" (blue bar) */
    .woocommerce-notices-wrapper .woocommerce-info {
        display: none !important;
    }

    /* WooCommerce Blocks: green success banner */
    .wc-block-components-notice-banner.is-success,
    .wc-block-store-notices .wc-block-components-notice-banner.is-success,
    /* WooCommerce Blocks: blue info banner (quantity changed, etc.) */
    .wc-block-components-notice-banner.is-info,
    .wc-block-store-notices .wc-block-components-notice-banner.is-info {
        display: none !important;
    }
    </style>
    <?php
} );
