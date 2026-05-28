<?php
/**
 * PWC — Fix "Return to Cart" link on WooCommerce Blocks checkout
 *
 * HOW TO INSTALL:
 *   Code Snippets plugin → Add New → paste this file → Save & Activate
 *
 * WHAT THIS DOES:
 *   WooCommerce Blocks renders "Return to cart" via React, so the standard
 *   woocommerce_cart_url PHP filter does not reliably update the rendered link.
 *   This snippet injects a tiny JS (checkout page only) that finds the anchor
 *   and rewrites its href to the PWC frontend cart page.
 *
 * TO UPDATE FOR PRODUCTION:
 *   Change the URL in PWC_RETURN_TO_CART_URL below to your Vercel/live domain.
 */

// ── Change this URL when you go live ─────────────────────────────────────────
// Local dev:  http://localhost:3000/cart
// Production: https://your-vercel-domain.com/cart  ← update before going live
define( 'PWC_RETURN_TO_CART_URL', 'http://localhost:3000/cart' );
// ─────────────────────────────────────────────────────────────────────────────

// ── Hide success/info notices on cart and checkout pages ─────────────────────
// Hides "added to cart" and "quantity changed" banners.
// Payment errors (.is-error) and form validation messages are NOT hidden.

add_action( 'wp_head', function () {
    if ( ! is_checkout() && ! is_cart() ) return;
    ?>
    <style>
    /* Classic WooCommerce notices */
    .woocommerce-notices-wrapper .woocommerce-message,
    .woocommerce-notices-wrapper .woocommerce-info { display: none !important; }

    /* WooCommerce Blocks notice banners */
    .wc-block-components-notice-banner.is-success,
    .wc-block-components-notice-banner.is-info,
    .wc-block-store-notices .wc-block-components-notice-banner.is-success,
    .wc-block-store-notices .wc-block-components-notice-banner.is-info { display: none !important; }
    </style>
    <?php
} );

add_action( 'wp_footer', function () {
    if ( ! is_checkout() ) return;
    $url = esc_js( PWC_RETURN_TO_CART_URL );
    ?>
    <script>
    (function () {
        var TARGET_URL = '<?php echo $url; ?>';

        function patchLink() {
            // WooCommerce Blocks renders: <a class="wc-block-components-checkout-return-to-cart-button" ...>
            var link = document.querySelector(
                'a.wc-block-components-checkout-return-to-cart-button'
            );
            if ( link && link.href !== TARGET_URL ) {
                link.href = TARGET_URL;
            }
        }

        // Run once after DOM is ready (catches server-side-rendered HTML)
        if ( document.readyState === 'loading' ) {
            document.addEventListener( 'DOMContentLoaded', patchLink );
        } else {
            patchLink();
        }

        // Also watch for React re-renders (Blocks can re-render the link after
        // address changes or shipping updates)
        var observer = new MutationObserver( patchLink );
        observer.observe( document.body, { childList: true, subtree: true } );
    })();
    </script>
    <?php
} );
