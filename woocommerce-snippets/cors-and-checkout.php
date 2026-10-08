<?php
/**
 * PWC — WooCommerce CORS + Checkout Quantity Controls
 *
 * HOW TO INSTALL:
 *   Option A (recommended): Install "Code Snippets" plugin → Snippets → Add New
 *                           Paste this entire file content, enable it, save.
 *   Option B:               Copy this into your child theme's functions.php
 *
 * WHAT THIS DOES:
 *   1. Lets the Next.js frontend READ the WooCommerce cart through the Store API
 *      from the customer's browser (cart drawer quantities, and clearing the
 *      local basket after a completed order). The frontend never writes to the
 *      cart cross-site — checkout uses the signed handoff (pwc-cart-handoff.php).
 *   2. Adds quantity +/− controls to the checkout order summary
 *      (matches the frontend cart drawer style)
 *   3. Defaults NEW guest customers to United States (US) as their billing
 *      country, without overriding a returning customer's saved choice.
 *
 * SECURITY NOTES
 *   • CORS is granted through WordPress' own `allowed_http_origins` list, which
 *     both the WP REST API and the WooCommerce Store API honour. The previous
 *     raw header() approach was overridden by the Store API (no origin was
 *     actually allowed) and answered EVERY OPTIONS request site-wide.
 *   • The Store API nonce (CSRF) check is ON. It used to be disabled on the
 *     assumption that CORS restricts the origin — it does not: CORS controls
 *     who may READ a response, not who may SEND a cross-site form POST.
 */

// ── 1. CORS for the WooCommerce Store API ────────────────────────────────────
// Exact origins of the Next.js storefront. Both the apex and www host are
// listed because the site is reachable on both.
function pwc_cors_frontend_origins() {
    $origins = array(
        'https://premiumwatchclub.com',
        'https://www.premiumwatchclub.com',
    );
    // Local development only — never on a production WordPress.
    if ( function_exists( 'wp_get_environment_type' ) && 'production' !== wp_get_environment_type() ) {
        $origins[] = 'http://localhost:3000';
    }
    return $origins;
}

add_filter( 'allowed_http_origins', function ( $origins ) {
    return array_values( array_unique( array_merge( (array) $origins, pwc_cors_frontend_origins() ) ) );
} );


// ── 3. Default guest billing country → United States (US) ─────────────────────
// Pre-selects "United States (US)" for NEW guest customers who have not yet
// chosen a country. WooCommerce seeds a fresh customer session from
// wc_get_customer_default_location(); this filter changes only that DEFAULT seed
// to US. Because it is only the default:
//   • a returning customer's saved billing country (kept in their WooCommerce
//     session) is NEVER overridden — once they pick a country, that wins;
//   • it works with the Blocks (Store API) checkout, which reads the same
//     WC()->customer session that this seed feeds;
//   • it is the supported WooCommerce hook — no DOM manipulation;
//   • it does NOT touch the store base address, currency or selling locations.
// NOTE: this assumes WooCommerce → Settings → General → "Default customer
// location" is "Shop base address" or "No location by default" (the usual case
// when the base country is not US). If it is set to "Geolocate", geolocation
// takes priority over this filter — say so and it can be adjusted.
add_filter( 'woocommerce_customer_default_location', function ( $default_location ) {
    return 'US';
} );


// ── 2. Checkout quantity controls ─────────────────────────────────────────────
// Adds data attributes to the checkout order-review quantity so JS can find them.

add_filter( 'woocommerce_checkout_cart_item_quantity', function ( $quantity_html, $cart_item, $cart_item_key ) {
    $product_id = absint( $cart_item['product_id'] );
    $qty        = absint( $cart_item['quantity'] );

    return '<span class="pwc-qty-placeholder" data-product-id="' . esc_attr( $product_id ) . '" data-qty="' . esc_attr( $qty ) . '">'
           . $quantity_html
           . '</span>';
}, 10, 3 );


// Inject styles + script after the order review block on checkout
add_action( 'woocommerce_checkout_after_order_review', function () {
    ?>
    <style>
    /* PWC checkout quantity stepper — matches cart drawer style */
    .pwc-checkout-qty {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        vertical-align: middle;
        margin-left: 4px;
    }
    .pwc-qty-btn {
        width: 22px;
        height: 22px;
        padding: 0;
        border: 1px solid rgba(212, 175, 55, 0.45);
        background: transparent;
        color: #d4af37;
        cursor: pointer;
        border-radius: 4px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
        line-height: 1;
        transition: background 0.18s ease, border-color 0.18s ease, opacity 0.18s ease;
    }
    .pwc-qty-btn:hover:not(:disabled) {
        background: rgba(212, 175, 55, 0.14);
        border-color: #d4af37;
    }
    .pwc-qty-btn:disabled {
        opacity: 0.35;
        cursor: not-allowed;
    }
    .pwc-qty-num {
        min-width: 18px;
        text-align: center;
        font-size: 13px;
        font-weight: 500;
        color: inherit;
    }
    /* Spinner shown while update is in-flight */
    .pwc-checkout-qty.pwc-updating .pwc-qty-btn {
        opacity: 0.35;
        pointer-events: none;
    }
    </style>

    <script>
    (function () {
        'use strict';

        /**
         * Fetch the WooCommerce cart via Store API and replace the static
         * quantity text with interactive +/− steppers.
         * Safe to call multiple times — it skips rows that already have a stepper.
         */
        // Store API CSRF nonce — returned in the "Nonce" header of every cart
        // response and required on every write (update-item).
        var storeApiNonce = '';

        function initQtyControls() {
            var placeholders = document.querySelectorAll('.pwc-qty-placeholder');
            if (!placeholders.length) return;

            // Fetch current cart to get item keys needed for update-item calls
            fetch('/wp-json/wc/store/v1/cart', {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            })
            .then(function (res) {
                storeApiNonce = res.headers.get('Nonce') || storeApiNonce;
                return res.ok ? res.json() : null;
            })
            .then(function (cart) {
                if (!cart || !cart.items) return;

                // Build a productId → {key, quantity} map from the live cart
                var byProductId = {};
                cart.items.forEach(function (item) {
                    byProductId[item.id] = { key: item.key, quantity: item.quantity };
                });

                placeholders.forEach(function (placeholder) {
                    var productId = parseInt(placeholder.dataset.productId, 10);
                    var cartItem  = byProductId[productId];
                    if (!cartItem) return;

                    buildStepper(placeholder, cartItem.key, cartItem.quantity);
                });
            })
            .catch(function () {
                // Store API unavailable — leave static quantities as-is
            });
        }

        function buildStepper(placeholder, itemKey, initialQty) {
            var qty = initialQty;

            var wrapper = document.createElement('span');
            wrapper.className = 'pwc-checkout-qty';

            var decBtn = makeButton('&minus;', 'Decrease quantity');
            var numEl  = document.createElement('span');
            numEl.className   = 'pwc-qty-num';
            numEl.textContent = qty;
            var incBtn = makeButton('+', 'Increase quantity');

            wrapper.appendChild(decBtn);
            wrapper.appendChild(numEl);
            wrapper.appendChild(incBtn);

            decBtn.disabled = (qty <= 1);
            incBtn.disabled = (qty >= 20);

            var updating = false;

            function updateQty(newQty) {
                if (updating || newQty < 1 || newQty > 20) return;
                updating = true;
                wrapper.classList.add('pwc-updating');

                fetch('/wp-json/wc/store/v1/cart/update-item', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Nonce': storeApiNonce },
                    body: JSON.stringify({ key: itemKey, quantity: newQty })
                })
                .then(function (res) {
                    storeApiNonce = res.headers.get('Nonce') || storeApiNonce;
                    return res.ok ? res.json() : Promise.reject(res.status);
                })
                .then(function () {
                    qty = newQty;
                    numEl.textContent = qty;
                    decBtn.disabled = (qty <= 1);
                    incBtn.disabled = (qty >= 20);

                    // Ask WooCommerce checkout to refresh totals
                    if (typeof jQuery !== 'undefined') {
                        jQuery(document.body).trigger('update_checkout');
                    }
                })
                .catch(function () {
                    // Revert display — qty variable unchanged
                    numEl.textContent = qty;
                })
                .finally(function () {
                    updating = false;
                    wrapper.classList.remove('pwc-updating');
                });
            }

            decBtn.addEventListener('click', function () { updateQty(qty - 1); });
            incBtn.addEventListener('click', function () { updateQty(qty + 1); });

            placeholder.replaceWith(wrapper);
        }

        function makeButton(html, label) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'pwc-qty-btn';
            btn.setAttribute('aria-label', label);
            btn.innerHTML = html;
            return btn;
        }

        // Run on page load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initQtyControls);
        } else {
            initQtyControls();
        }

        // Re-run after WooCommerce refreshes the order review HTML (e.g. after address change)
        if (typeof jQuery !== 'undefined') {
            jQuery(document.body).on('updated_checkout', function () {
                setTimeout(initQtyControls, 150);
            });
        }
    })();
    </script>
    <?php
} );
