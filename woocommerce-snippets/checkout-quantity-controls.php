<?php
/**
 * PWC — Checkout Quantity Controls (Block Checkout)
 *
 * Adds − / qty / + controls inside the WooCommerce Block Checkout order summary.
 * Uses WordPress AJAX (admin-ajax.php) for cart updates — same-domain, no CORS needed.
 *
 * HOW TO INSTALL:
 *   "Code Snippets" plugin → Add New → paste entire file → enable → save.
 *
 * Self-contained. No CORS. No frontend cart sync.
 */


// ── 1. WordPress AJAX handler — update cart item quantity ─────────────────────
// Same-domain only. Uses a PHP-generated nonce — no wcSettings dependency.

add_action( 'wp_ajax_pwc_update_qty',        'pwc_update_qty_handler' );
add_action( 'wp_ajax_nopriv_pwc_update_qty', 'pwc_update_qty_handler' );

function pwc_update_qty_handler() {
    if ( ! check_ajax_referer( 'pwc_qty_nonce', 'nonce', false ) ) {
        wp_send_json_error( 'Bad nonce', 403 );
    }

    $key = isset( $_POST['key'] ) ? sanitize_text_field( wp_unslash( $_POST['key'] ) ) : '';
    $qty = isset( $_POST['qty'] ) ? absint( $_POST['qty'] ) : 0;

    if ( ! $key ) {
        wp_send_json_error( 'Missing key', 400 );
    }

    if ( ! WC()->cart->get_cart_item( $key ) ) {
        wp_send_json_error( 'Cart item not found', 404 );
    }

    if ( $qty === 0 ) {
        WC()->cart->remove_cart_item( $key );
    } else {
        WC()->cart->set_quantity( $key, $qty, true );
    }

    WC()->cart->calculate_totals();

    wp_send_json_success();
}


// ── 2. Inject styles + script into the checkout footer ────────────────────────

add_action( 'wp_footer', function () {
    if ( ! function_exists( 'is_checkout' ) || ! is_checkout() ) return;
    if ( is_order_received_page() ) return;

    $ajax_url = admin_url( 'admin-ajax.php' );
    $nonce    = wp_create_nonce( 'pwc_qty_nonce' );
    ?>

    <style>
    /* ── PWC checkout quantity stepper ── */
    .pwc-qty-row {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 10px;
    }
    .pwc-qty-btn {
        width: 28px;
        height: 28px;
        padding: 0;
        margin: 0;
        border: 1px solid rgba(197, 160, 101, 0.5);
        background: rgba(255, 255, 255, 0.04);
        color: #C5A065;
        cursor: pointer;
        border-radius: 5px;
        font-size: 18px;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
        box-shadow: none;
        text-shadow: none;
        -webkit-appearance: none;
    }
    .pwc-qty-btn:hover:not(:disabled) {
        background: rgba(197, 160, 101, 0.18);
        border-color: #C5A065;
    }
    .pwc-qty-btn:disabled {
        opacity: 0.28;
        cursor: not-allowed;
    }
    .pwc-qty-num {
        min-width: 22px;
        text-align: center;
        font-size: 14px;
        font-weight: 600;
        color: #F5F0E8;
    }
    /* Dim while update is in flight */
    .pwc-qty-row.pwc-busy .pwc-qty-btn {
        opacity: 0.28;
        pointer-events: none;
    }
    </style>

    <script>
    (function () {
        'use strict';

        var AJAX_URL = <?php echo wp_json_encode( $ajax_url ); ?>;
        var NONCE    = <?php echo wp_json_encode( $nonce ); ?>;

        // Cart items fetched from Store API: [{ key, id, quantity }, ...]
        var cartItems = [];

        // Fetch current cart — GET needs no nonce (read-only)
        function loadCart() {
            return fetch( '/wp-json/wc/store/v1/cart', {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            } )
            .then( function ( r ) { return r.ok ? r.json() : null; } )
            .then( function ( data ) {
                if ( data && Array.isArray( data.items ) ) {
                    cartItems = data.items.map( function ( item ) {
                        return { key: item.key, id: item.id, quantity: item.quantity };
                    } );
                    console.log( '[PWC] cart loaded, items:', cartItems );
                }
            } )
            .catch( function ( e ) {
                console.warn( '[PWC] loadCart error:', e );
            } );
        }

        // Inject stepper into every order summary row that doesn't have one yet
        function injectSteppers() {
            var rows = document.querySelectorAll( '.wc-block-components-order-summary-item' );
            if ( ! rows.length ) return;
            if ( ! cartItems.length ) {
                console.warn( '[PWC] injectSteppers called but cartItems is empty' );
                return;
            }

            rows.forEach( function ( row, index ) {
                // Skip rows that already have a stepper
                if ( row.querySelector( '.pwc-qty-row' ) ) return;

                var cartItem = cartItems[ index ];
                if ( ! cartItem ) {
                    console.warn( '[PWC] no cartItem for row index', index );
                    return;
                }

                // ── Layout fix: always insert into the description block ──
                // (NOT after the quantity badge — that badge is inside the image
                //  div and putting a sibling there breaks the flex layout)
                var desc = row.querySelector( '.wc-block-components-order-summary-item__description' );
                if ( ! desc ) {
                    console.warn( '[PWC] description block not found for row', index );
                    return;
                }

                buildStepper( desc, cartItem.key, cartItem.quantity );
            } );
        }

        function buildStepper( desc, itemKey, initialQty ) {
            var qty = initialQty;

            var wrapper = document.createElement( 'div' );
            wrapper.className = 'pwc-qty-row';

            var dec = makeBtn( '&#8722;', 'Decrease quantity' ); // −
            var num = document.createElement( 'span' );
            num.className   = 'pwc-qty-num';
            num.textContent = qty;
            var inc = makeBtn( '+', 'Increase quantity' );

            wrapper.appendChild( dec );
            wrapper.appendChild( num );
            wrapper.appendChild( inc );

            dec.disabled = ( qty <= 1 );

            // ── Click handler ─────────────────────────────────────────────
            function doUpdate( newQty ) {
                console.log( '[PWC] doUpdate — key:', itemKey, 'newQty:', newQty );

                if ( newQty < 0 ) return;
                wrapper.classList.add( 'pwc-busy' );

                // Step 1: Update cart via WP AJAX (PHP nonce — always works same-domain)
                var body = new URLSearchParams( {
                    action: 'pwc_update_qty',
                    nonce:  NONCE,
                    key:    itemKey,
                    qty:    newQty,
                } );

                fetch( AJAX_URL, {
                    method:      'POST',
                    credentials: 'same-origin',
                    headers:     { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body:        body.toString(),
                } )
                .then( function ( r ) { return r.json(); } )
                .then( function ( resp ) {
                    console.log( '[PWC] AJAX response:', resp );
                    if ( ! resp.success ) {
                        console.error( '[PWC] AJAX error:', resp.data );
                        return Promise.reject( 'ajax-error' );
                    }

                    // Update local display
                    qty             = newQty;
                    num.textContent = qty;
                    dec.disabled    = ( qty <= 1 );

                    // Step 2: Re-fetch updated cart from Store API
                    return fetch( '/wp-json/wc/store/v1/cart', {
                        credentials: 'include',
                        headers:     { 'Accept': 'application/json' },
                    } );
                } )
                .then( function ( r ) { return ( r && r.ok ) ? r.json() : null; } )
                .then( function ( freshCart ) {
                    if ( ! freshCart ) return;

                    // Step 3: Push fresh cart into WC Blocks React store → totals re-render
                    if ( window.wp && window.wp.data ) {
                        try {
                            var dispatch = window.wp.data.dispatch( 'wc/store/cart' );
                            if ( typeof dispatch.receiveCart === 'function' ) {
                                dispatch.receiveCart( freshCart );
                            } else if ( typeof dispatch.receiveCartContents === 'function' ) {
                                dispatch.receiveCartContents( freshCart );
                            } else if ( typeof dispatch.invalidateResolutionForStoreSelector === 'function' ) {
                                dispatch.invalidateResolutionForStoreSelector( 'getCartData' );
                                dispatch.invalidateResolutionForStoreSelector( 'getCartTotals' );
                            }
                            console.log( '[PWC] cart store updated' );
                        } catch ( e ) {
                            console.warn( '[PWC] store dispatch error:', e );
                        }
                    }

                    // Also update our local cartItems so re-injection uses correct quantities
                    if ( freshCart.items ) {
                        cartItems = freshCart.items.map( function ( item ) {
                            return { key: item.key, id: item.id, quantity: item.quantity };
                        } );
                    }
                } )
                .catch( function ( e ) {
                    if ( e !== 'ajax-error' ) console.error( '[PWC] fetch error:', e );
                    num.textContent = qty; // revert display
                } )
                .finally( function () {
                    wrapper.classList.remove( 'pwc-busy' );
                } );
            }

            dec.addEventListener( 'click', function () {
                console.log( '[PWC] − clicked, current qty:', qty );
                doUpdate( qty - 1 );
            } );
            inc.addEventListener( 'click', function () {
                console.log( '[PWC] + clicked, current qty:', qty );
                doUpdate( qty + 1 );
            } );

            // Append stepper as a new row at the bottom of the description block
            desc.appendChild( wrapper );
        }

        function makeBtn( html, label ) {
            var b = document.createElement( 'button' );
            b.type = 'button';
            b.className = 'pwc-qty-btn';
            b.setAttribute( 'aria-label', label );
            b.innerHTML = html;
            return b;
        }

        // ── MutationObserver — re-inject after WC Blocks re-renders ──────────
        var debounceTimer = null;
        var observer = new MutationObserver( function () {
            // Debounce: WC Blocks fires many mutations at once
            clearTimeout( debounceTimer );
            debounceTimer = setTimeout( function () {
                var rows = document.querySelectorAll( '.wc-block-components-order-summary-item' );
                var missing = Array.from( rows ).some( function ( r ) {
                    return ! r.querySelector( '.pwc-qty-row' );
                } );
                if ( missing && cartItems.length ) {
                    console.log( '[PWC] re-injecting after DOM update' );
                    injectSteppers();
                }
            }, 150 );
        } );

        function init() {
            observer.observe( document.body, { childList: true, subtree: true } );
            loadCart().then( injectSteppers );
        }

        if ( document.readyState === 'loading' ) {
            document.addEventListener( 'DOMContentLoaded', init );
        } else {
            init();
        }

    } )();
    </script>

    <?php
}, 20 );
