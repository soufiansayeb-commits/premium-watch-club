<?php
/**
 * PWC — Checkout Quantity Controls (Block Checkout)
 *
 * Adds − / qty / + controls inside the WooCommerce Block Checkout order summary.
 * Uses WordPress AJAX (admin-ajax.php) for cart updates — same-domain, no CORS needed.
 *
 * HOW TO INSTALL:
 *   "Code Snippets" plugin → Add New → paste ENTIRE file → enable → save.
 *
 * Cap logic (same formula as the Next.js frontend):
 *   sold_individually = true  → maxPerUser = 1  (WooCommerce native field — source of truth)
 *   sold_individually = false → maxPerUser = floor( total_entries × max_entries_percentage / 100 )
 *   allowedMaxQty = min( maxPerUser, stock_quantity )
 *
 * Self-contained. No CORS. No frontend cart sync.
 */


// ═══════════════════════════════════════════════════════════════════════════════
// SHARED HELPER — compute allowedMaxQty for any product
// ═══════════════════════════════════════════════════════════════════════════════

function pwc_get_allowed_max_qty( $product_id ) {
    $product = wc_get_product( $product_id );
    if ( ! $product ) return 1;

    // Read ACF fields — prefer get_field() if ACF is active
    if ( function_exists( 'get_field' ) ) {
        $raw_total = get_field( 'total_entries',          $product_id );
        $raw_pct   = get_field( 'max_entries_percentage', $product_id );
    } else {
        $raw_total = get_post_meta( $product_id, 'total_entries',          true );
        $raw_pct   = get_post_meta( $product_id, 'max_entries_percentage', true );
    }

    $total_entries = is_numeric( $raw_total ) ? (int)   $raw_total : 0;
    $pct           = is_numeric( $raw_pct )   ? (float) $raw_pct   : 0.0;

    // entriesRemaining = live stock (NULL means stock management off = no limit)
    $stock             = $product->get_stock_quantity();
    $entries_remaining = ( $stock !== null ) ? max( 0, (int) $stock ) : PHP_INT_MAX;

    // maxEntriesPerUser — sold_individually is the source of truth for single-entry products
    if ( $product->get_sold_individually() ) {
        $max_per_user    = 1;
        $decision_source = 'sold_individually=true → max=1';
    } elseif ( $total_entries > 0 && $pct > 0 ) {
        $max_per_user    = (int) floor( $total_entries * ( $pct / 100.0 ) );
        $decision_source = "ACF cap: floor({$total_entries} × {$pct}%) = {$max_per_user}";
    } else {
        $max_per_user    = $entries_remaining; // no ACF cap — stock is the only limit
        $decision_source = "no ACF cap → stock limit = {$entries_remaining}";
    }

    $allowed = (int) min( $max_per_user, $entries_remaining );
    $result  = max( 0, $allowed ); // 0 = sold out

    // Always log to PHP error log — check via WP_DEBUG_LOG or server error log.
    // Look for lines starting with "[PWC allowedMax]" to diagnose cap decisions.
    error_log( sprintf(
        '[PWC allowedMax] product #%d "%s" | sold_individually=%s | total_entries=%d | pct=%.1f | stock=%s | decision: %s → allowedMax=%d',
        $product_id,
        $product->get_name(),
        $product->get_sold_individually() ? 'YES' : 'NO',
        $total_entries,
        $pct,
        ( $stock !== null ) ? $stock : 'NULL(unmanaged)',
        $decision_source,
        $result
    ) );

    return $result;
}


// ═══════════════════════════════════════════════════════════════════════════════
// 1. AJAX HANDLER — update cart item quantity (server-side cap enforced here)
// ═══════════════════════════════════════════════════════════════════════════════

add_action( 'wp_ajax_pwc_update_qty',        'pwc_update_qty_handler' );
add_action( 'wp_ajax_nopriv_pwc_update_qty', 'pwc_update_qty_handler' );

function pwc_update_qty_handler() {
    if ( ! check_ajax_referer( 'pwc_qty_nonce', 'nonce', false ) ) {
        wp_send_json_error( 'Bad nonce', 403 );
    }

    $key = isset( $_POST['key'] ) ? sanitize_text_field( wp_unslash( $_POST['key'] ) ) : '';
    $qty = isset( $_POST['qty'] ) ? absint( $_POST['qty'] ) : 0;

    if ( ! $key ) {
        wp_send_json_error( 'Missing cart item key', 400 );
    }

    $cart_item = WC()->cart->get_cart_item( $key );
    if ( ! $cart_item ) {
        wp_send_json_error( 'Cart item not found', 404 );
    }

    $product_id  = $cart_item['product_id'];
    $allowed_max = pwc_get_allowed_max_qty( $product_id );

    if ( $allowed_max === 0 ) {
        wp_send_json_error( 'This competition is sold out.', 400 );
    }

    // Silently clamp — never error; give them the max instead of rejecting
    $applied_qty = ( $qty > $allowed_max ) ? $allowed_max : $qty;

    if ( $applied_qty === 0 ) {
        WC()->cart->remove_cart_item( $key );
    } else {
        WC()->cart->set_quantity( $key, $applied_qty, true );
    }

    WC()->cart->calculate_totals();

    wp_send_json_success( [
        'applied_qty' => $applied_qty,
        'allowed_max' => $allowed_max,
        'requested'   => $qty,
        'clamped'     => ( $qty !== $applied_qty ),
    ] );
}


// ═══════════════════════════════════════════════════════════════════════════════
// 2. CART CHECK — auto-clamp over-limit quantities when cart loads
// ═══════════════════════════════════════════════════════════════════════════════

add_action( 'woocommerce_check_cart_items', 'pwc_clamp_cart_quantities' );

function pwc_clamp_cart_quantities() {
    if ( ! WC()->cart ) return;

    $changed = false;
    foreach ( WC()->cart->get_cart() as $key => $cart_item ) {
        $product_id  = $cart_item['product_id'];
        $allowed_max = pwc_get_allowed_max_qty( $product_id );

        if ( $allowed_max === 0 ) {
            WC()->cart->remove_cart_item( $key );
            wc_add_notice(
                sprintf( '"%s" was removed — it is now sold out.', get_the_title( $product_id ) ),
                'error'
            );
            $changed = true;
            continue;
        }

        if ( (int) $cart_item['quantity'] > $allowed_max ) {
            WC()->cart->set_quantity( $key, $allowed_max, true );
            wc_add_notice(
                sprintf(
                    'Your quantity for "%s" was reduced to the maximum allowed: %d ticket(s).',
                    get_the_title( $product_id ),
                    $allowed_max
                ),
                'notice'
            );
            $changed = true;
        }
    }

    if ( $changed ) {
        WC()->cart->calculate_totals();
    }
}


// ═══════════════════════════════════════════════════════════════════════════════
// 3. CHECKOUT VALIDATION — hard block if somehow still over limit
// ═══════════════════════════════════════════════════════════════════════════════

add_action( 'woocommerce_checkout_process', 'pwc_validate_checkout_quantities' );

function pwc_validate_checkout_quantities() {
    if ( ! WC()->cart ) return;

    foreach ( WC()->cart->get_cart() as $cart_item ) {
        $product_id  = $cart_item['product_id'];
        $allowed_max = pwc_get_allowed_max_qty( $product_id );

        if ( $allowed_max === 0 ) {
            wc_add_notice(
                sprintf( '"%s" is sold out. Remove it before placing an order.', get_the_title( $product_id ) ),
                'error'
            );
        } elseif ( (int) $cart_item['quantity'] > $allowed_max ) {
            wc_add_notice(
                sprintf(
                    'Maximum %d ticket(s) allowed for "%s". Reduce your quantity before proceeding.',
                    $allowed_max,
                    get_the_title( $product_id )
                ),
                'error'
            );
        }
    }
}


// ═══════════════════════════════════════════════════════════════════════════════
// 4. FRONTEND — inject stepper + cap data into WC Blocks checkout footer
// ═══════════════════════════════════════════════════════════════════════════════

add_action( 'wp_footer', function () {
    if ( ! function_exists( 'is_checkout' ) || ! is_checkout() ) return;
    if ( is_order_received_page() ) return;

    $ajax_url = admin_url( 'admin-ajax.php' );
    $nonce    = wp_create_nonce( 'pwc_qty_nonce' );

    // Build cap lookup tables — keyed two ways so JS can always resolve the max:
    //   PWC_BY_KEY[cartItemKey]   — primary (same hash WC uses in PHP session)
    //   PWC_BY_PID[productId]     — fallback (used when Store API key differs from session key)
    $by_key = [];
    $by_pid = [];

    if ( function_exists( 'WC' ) && WC()->cart ) {
        foreach ( WC()->cart->get_cart() as $cart_item ) {
            $key        = $cart_item['key'];
            $product_id = $cart_item['product_id'];
            $product    = wc_get_product( $product_id );
            if ( ! $product ) continue;

            // Read ACF fields (same logic as helper, with raw values for debug output)
            if ( function_exists( 'get_field' ) ) {
                $raw_total = get_field( 'total_entries',          $product_id );
                $raw_pct   = get_field( 'max_entries_percentage', $product_id );
            } else {
                $raw_total = get_post_meta( $product_id, 'total_entries',          true );
                $raw_pct   = get_post_meta( $product_id, 'max_entries_percentage', true );
            }

            $total_entries    = is_numeric( $raw_total ) ? (int)   $raw_total : 0;
            $pct              = is_numeric( $raw_pct )   ? (float) $raw_pct   : 0.0;
            $sold_individually = $product->get_sold_individually();
            $stock             = $product->get_stock_quantity();
            $allowed_max       = pwc_get_allowed_max_qty( $product_id );

            $entry = [
                'max'         => $allowed_max,
                'product_id'  => $product_id,
                'name'        => $product->get_name(),
                'cart_key'    => $key,
                'debug'       => [
                    'sold_individually'    => $sold_individually,
                    'total_entries'        => $total_entries,
                    'max_entries_pct'      => $pct,
                    'stock_quantity'       => $stock,
                    'calculated_max'       => $sold_individually
                                               ? 1
                                               : ( ( $total_entries > 0 && $pct > 0 )
                                                   ? (int) floor( $total_entries * $pct / 100 )
                                                   : null ),
                    'allowed_max'          => $allowed_max,
                ],
            ];

            $by_key[ $key ]        = $entry;
            $by_pid[ $product_id ] = $entry;
        }
    }
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
        width: 28px; height: 28px;
        padding: 0; margin: 0;
        border: 1px solid rgba(197,160,101,0.5);
        background: rgba(255,255,255,0.04);
        color: #C5A065;
        cursor: pointer;
        border-radius: 5px;
        font-size: 18px; line-height: 1;
        display: inline-flex; align-items: center; justify-content: center;
        transition: background 0.15s, border-color 0.15s, opacity 0.15s;
        box-shadow: none; text-shadow: none; -webkit-appearance: none;
    }
    .pwc-qty-btn:hover:not(:disabled) {
        background: rgba(197,160,101,0.18);
        border-color: #C5A065;
    }
    .pwc-qty-btn:disabled { opacity: 0.28; cursor: not-allowed; }
    .pwc-qty-num {
        min-width: 22px; text-align: center;
        font-size: 14px; font-weight: 600;
        color: #F5F0E8; cursor: text; outline: none;
    }
    .pwc-qty-row.pwc-busy .pwc-qty-btn,
    .pwc-qty-row.pwc-busy .pwc-qty-num { opacity: 0.28; pointer-events: none; }
    </style>

    <script>
    (function () {
        'use strict';

        var AJAX_URL   = <?php echo wp_json_encode( $ajax_url ); ?>;
        var NONCE      = <?php echo wp_json_encode( $nonce ); ?>;

        // Primary lookup: WC session cart item key → config
        var PWC_BY_KEY = <?php echo wp_json_encode( $by_key ); ?>;
        // Fallback lookup: product ID (number) → config
        var PWC_BY_PID = <?php echo wp_json_encode( $by_pid ); ?>;

        console.group( '[PWC] Checkout cap config' );
        console.log( 'PWC_BY_KEY (primary):', PWC_BY_KEY );
        console.log( 'PWC_BY_PID (fallback):', PWC_BY_PID );
        console.groupEnd();

        var cartItems = []; // populated by loadCart()

        // ── Resolve max qty for a cart item ───────────────────────────────────
        // Try session key first, then product ID, then scan all entries.
        function resolveConfig( cartItemKey, cartItemProductId ) {
            var cfg = PWC_BY_KEY[ cartItemKey ];
            if ( cfg ) {
                console.log( '[PWC] config resolved by key:', cartItemKey, cfg );
                return cfg;
            }

            // Key mismatch — try product ID
            cfg = PWC_BY_PID[ cartItemProductId ];
            if ( cfg ) {
                console.warn(
                    '[PWC] key mismatch for', cartItemKey,
                    '— resolved by product_id', cartItemProductId, cfg
                );
                return cfg;
            }

            // Last resort: scan all known configs for matching product ID
            var keys = Object.keys( PWC_BY_KEY );
            for ( var i = 0; i < keys.length; i++ ) {
                if ( PWC_BY_KEY[ keys[i] ].product_id === cartItemProductId ) {
                    cfg = PWC_BY_KEY[ keys[i] ];
                    console.warn( '[PWC] config resolved by scan for product_id', cartItemProductId, cfg );
                    return cfg;
                }
            }

            console.error(
                '[PWC] COULD NOT resolve config for key:', cartItemKey,
                'product_id:', cartItemProductId,
                '| all known cart keys:', Object.keys( PWC_BY_KEY ),
                '| all known product IDs:', Object.keys( PWC_BY_PID )
            );
            return null;
        }

        // ── Fetch current cart from Store API ─────────────────────────────────
        function loadCart() {
            return fetch( '/wp-json/wc/store/v1/cart', {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            } )
            .then( function (r) { return r.ok ? r.json() : null; } )
            .then( function (data) {
                if ( data && Array.isArray( data.items ) ) {
                    cartItems = data.items.map( function (item) {
                        return {
                            key:        item.key,
                            id:         item.id,         // product ID (integer)
                            quantity:   item.quantity,
                            name:       item.name || '',
                        };
                    } );
                    console.log( '[PWC] Store API cart items:', cartItems );
                }
            } )
            .catch( function (e) { console.warn( '[PWC] loadCart error:', e ); } );
        }

        // ── Inject steppers ───────────────────────────────────────────────────
        function injectSteppers() {
            var rows = document.querySelectorAll( '.wc-block-components-order-summary-item' );
            if ( ! rows.length ) return;
            if ( ! cartItems.length ) {
                console.warn( '[PWC] injectSteppers: cartItems empty' );
                return;
            }

            rows.forEach( function (row, index) {
                if ( row.querySelector( '.pwc-qty-row' ) ) return; // already has stepper

                var cartItem = cartItems[ index ];
                if ( ! cartItem ) {
                    console.warn( '[PWC] no cartItem for DOM row index', index );
                    return;
                }

                var desc = row.querySelector( '.wc-block-components-order-summary-item__description' );
                if ( ! desc ) {
                    console.warn( '[PWC] description element not found for row', index );
                    return;
                }

                var cfg    = resolveConfig( cartItem.key, cartItem.id );
                var maxQty = cfg ? cfg.max : null;

                if ( maxQty === null ) {
                    // Could not resolve — build stepper with no upper cap but log clearly
                    console.error(
                        '[PWC] Building stepper WITHOUT cap for', cartItem.name,
                        '(product_id:', cartItem.id, ') — check ACF fields on product'
                    );
                    buildStepper( desc, cartItem.key, cartItem.quantity, 9999, cartItem.name );
                    return;
                }

                console.log(
                    '[PWC] Building stepper |',
                    'name:', cartItem.name,
                    '| product_id:', cartItem.id,
                    '| cartItemKey:', cartItem.key,
                    '| currentQty:', cartItem.quantity,
                    '| soldIndividually:', cfg.debug.sold_individually,
                    '| totalEntries:', cfg.debug.total_entries,
                    '| maxEntriesPct:', cfg.debug.max_entries_pct,
                    '| stockQty:', cfg.debug.stock_quantity,
                    '| calculatedMax:', cfg.debug.calculated_max,
                    '| allowedMaxQty:', cfg.debug.allowed_max
                );

                buildStepper( desc, cartItem.key, cartItem.quantity, maxQty, cartItem.name );
            } );
        }

        // ── Build one stepper ─────────────────────────────────────────────────
        function buildStepper( desc, itemKey, initialQty, maxQty, itemName ) {
            var needsClamp = ( initialQty > maxQty );
            var qty        = needsClamp ? maxQty : initialQty;

            if ( needsClamp ) {
                console.warn(
                    '[PWC] Auto-clamp on mount |',
                    'item:', itemName,
                    '| cartQty was:', initialQty,
                    '| clamping to maxQty:', maxQty
                );
            }

            var wrapper = document.createElement( 'div' );
            wrapper.className = 'pwc-qty-row';

            var dec = makeBtn( '&#8722;', 'Decrease quantity' );
            var num = document.createElement( 'span' );
            num.className       = 'pwc-qty-num';
            num.textContent     = qty;
            num.contentEditable = 'true';
            num.spellcheck      = false;
            num.setAttribute( 'aria-label', 'Ticket quantity' );
            num.setAttribute( 'role',       'spinbutton' );
            var inc = makeBtn( '+', 'Increase quantity' );

            wrapper.appendChild( dec );
            wrapper.appendChild( num );
            wrapper.appendChild( inc );

            function refreshBtns() {
                dec.disabled = ( qty <= 1 );
                inc.disabled = ( qty >= maxQty );
            }
            refreshBtns();

            // ── doUpdate — sends AJAX, refreshes WC Blocks totals ─────────────
            function doUpdate( requestedQty ) {
                var newQty = Math.max( 0, Math.min( maxQty, requestedQty ) );

                if ( newQty === requestedQty ) {
                    console.log( '[PWC] + clicked | item:', itemName, '| newQty:', newQty, '| within maxQty:', maxQty );
                } else {
                    console.warn(
                        '[PWC] Quantity clamped |',
                        'requested:', requestedQty,
                        '| clamped to:', newQty,
                        '| maxQty:', maxQty
                    );
                }

                if ( newQty < 0 ) return;
                wrapper.classList.add( 'pwc-busy' );

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
                .then( function (r) { return r.json(); } )
                .then( function (resp) {
                    console.log( '[PWC] AJAX response:', resp );

                    if ( ! resp.success ) {
                        console.error( '[PWC] AJAX error:', resp.data );
                        return Promise.reject( 'ajax-error' );
                    }

                    // Use server-confirmed applied_qty (PHP may have clamped further)
                    var appliedQty = ( resp.data && resp.data.applied_qty != null )
                        ? resp.data.applied_qty
                        : newQty;

                    if ( resp.data && resp.data.clamped ) {
                        console.warn(
                            '[PWC] Server also clamped |',
                            'requested:', resp.data.requested,
                            '| applied:', appliedQty,
                            '| server allowedMax:', resp.data.allowed_max
                        );
                    }

                    qty             = appliedQty;
                    num.textContent = qty;
                    refreshBtns();

                    // Re-fetch fresh cart and push into WC Blocks store
                    return fetch( '/wp-json/wc/store/v1/cart', {
                        credentials: 'include',
                        headers:     { 'Accept': 'application/json' },
                    } );
                } )
                .then( function (r) { return ( r && r.ok ) ? r.json() : null; } )
                .then( function (freshCart) {
                    if ( ! freshCart ) return;

                    // Push fresh cart data into WC Blocks React store → totals re-render
                    if ( window.wp && window.wp.data ) {
                        try {
                            var dispatch = window.wp.data.dispatch( 'wc/store/cart' );
                            if      ( typeof dispatch.receiveCart       === 'function' ) dispatch.receiveCart( freshCart );
                            else if ( typeof dispatch.receiveCartContents === 'function' ) dispatch.receiveCartContents( freshCart );
                            else if ( typeof dispatch.invalidateResolutionForStoreSelector === 'function' ) {
                                dispatch.invalidateResolutionForStoreSelector( 'getCartData' );
                                dispatch.invalidateResolutionForStoreSelector( 'getCartTotals' );
                            }
                            console.log( '[PWC] WC Blocks store updated' );
                        } catch (e) { console.warn( '[PWC] store dispatch error:', e ); }
                    }

                    if ( freshCart.items ) {
                        cartItems = freshCart.items.map( function (item) {
                            return { key: item.key, id: item.id, quantity: item.quantity, name: item.name || '' };
                        } );
                    }
                } )
                .catch( function (e) {
                    if ( e !== 'ajax-error' ) console.error( '[PWC] fetch error:', e );
                    num.textContent = qty;
                    refreshBtns();
                } )
                .finally( function () { wrapper.classList.remove( 'pwc-busy' ); } );
            }

            dec.addEventListener( 'click', function () { doUpdate( qty - 1 ); } );
            inc.addEventListener( 'click', function () { doUpdate( qty + 1 ); } );

            // Editable span — clamp and commit on blur / Enter
            function commitInput() {
                var parsed = parseInt( num.textContent.trim(), 10 );
                if ( isNaN( parsed ) || parsed < 1 ) { num.textContent = qty; return; }
                parsed = Math.min( parsed, maxQty );
                if ( parsed !== qty ) { doUpdate( parsed ); }
                else                  { num.textContent = qty; }
            }

            num.addEventListener( 'blur', commitInput );
            num.addEventListener( 'keydown', function (e) {
                if ( e.key === 'Enter' ) { e.preventDefault(); num.blur(); return; }
                if ( ! /^[0-9]$/.test( e.key ) &&
                     ! [ 'Backspace','Delete','ArrowLeft','ArrowRight','Tab' ].includes( e.key ) ) {
                    e.preventDefault();
                }
            } );
            num.addEventListener( 'focus', function () {
                var sel = window.getSelection(), range = document.createRange();
                range.selectNodeContents( num );
                sel.removeAllRanges(); sel.addRange( range );
            } );

            desc.appendChild( wrapper );

            // Auto-clamp: if cart already has more than allowed, sync WooCommerce immediately
            if ( needsClamp ) {
                doUpdate( maxQty );
            }
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
            clearTimeout( debounceTimer );
            debounceTimer = setTimeout( function () {
                var rows    = document.querySelectorAll( '.wc-block-components-order-summary-item' );
                var missing = Array.from( rows ).some( function (r) { return ! r.querySelector( '.pwc-qty-row' ); } );
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
