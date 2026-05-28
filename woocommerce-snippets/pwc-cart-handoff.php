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
 * HOW IT WORKS
 * ────────────
 * Next.js (/api/prepare-checkout) signs cart items with HMAC-SHA256.
 * Browser is redirected to: https://your-wordpress.com/?pwc_cart=<encoded>&pwc_sig=<sig>
 * This snippet validates the signature, clears the Woo cart, adds all items,
 * then redirects to /checkout/. No CORS required.
 *
 * HOOK TIMING NOTE
 * ────────────────
 * Uses wp_loaded (not init) so WooCommerce session + cart are fully initialised
 * before we call WC()->cart->add_to_cart(). Running on init causes silent failures
 * because the session handler hasn't been set up yet.
 */

add_action( 'wp_loaded', 'pwc_handle_cart_handoff', 10 );

function pwc_handle_cart_handoff() {
    // Only act when both query params are present.
    if ( empty( $_GET['pwc_cart'] ) || empty( $_GET['pwc_sig'] ) ) {
        return;
    }

    // ── Read the secret ────────────────────────────────────────────────────────
    $secret = defined( 'PWC_CART_HANDOFF_SECRET' ) ? PWC_CART_HANDOFF_SECRET : '';
    if ( '' === $secret ) {
        wp_die(
            '<p><strong>Checkout configuration error.</strong> PWC_CART_HANDOFF_SECRET is not defined in wp-config.php. (PWC-01)</p>',
            'Checkout Error',
            [ 'response' => 500 ]
        );
    }

    $encoded = sanitize_text_field( wp_unslash( $_GET['pwc_cart'] ) );
    $sig     = sanitize_text_field( wp_unslash( $_GET['pwc_sig'] ) );

    // ── Validate HMAC-SHA256 signature ─────────────────────────────────────────
    $expected = hash_hmac( 'sha256', $encoded, $secret );
    if ( ! hash_equals( $expected, $sig ) ) {
        wp_die(
            '<p><strong>Invalid checkout link.</strong> Signature mismatch — the link may have been modified. Please return to the store and try again.</p>',
            'Invalid Checkout Link',
            [ 'response' => 403 ]
        );
    }

    // ── Decode URL-safe base64 → JSON ──────────────────────────────────────────
    $json = base64_decode( strtr( $encoded, '-_', '+/' ) );
    if ( false === $json ) {
        wp_die(
            '<p><strong>Invalid checkout link.</strong> Could not decode payload.</p>',
            'Invalid Checkout Link',
            [ 'response' => 400 ]
        );
    }

    $payload = json_decode( $json, true );
    if ( ! is_array( $payload ) || empty( $payload['items'] ) || ! isset( $payload['ts'] ) ) {
        wp_die(
            '<p><strong>Invalid checkout payload.</strong> Missing items or timestamp.</p>',
            'Invalid Checkout Link',
            [ 'response' => 400 ]
        );
    }

    // ── Check timestamp (5-minute expiry) ──────────────────────────────────────
    $age = time() - (int) $payload['ts'];
    if ( $age < 0 || $age > 300 ) {
        wp_die(
            '<p><strong>This checkout link has expired.</strong> Please return to the store and try again — your cart is still saved.</p>',
            'Checkout Link Expired',
            [ 'response' => 410 ]
        );
    }

    // ── Ensure WooCommerce is available ────────────────────────────────────────
    if ( ! function_exists( 'WC' ) ) {
        wp_die(
            '<p><strong>WooCommerce is not active.</strong> (PWC-02)</p>',
            'Checkout Error',
            [ 'response' => 503 ]
        );
    }

    // wc_load_cart() ensures the cart + session are initialised even if this
    // hook fires before WooCommerce has set them up for the current request.
    if ( function_exists( 'wc_load_cart' ) ) {
        wc_load_cart();
    }

    if ( ! WC()->cart ) {
        wp_die(
            '<p><strong>WooCommerce cart is not available.</strong> (PWC-03)</p>',
            'Checkout Error',
            [ 'response' => 503 ]
        );
    }

    // ── Clear existing cart ────────────────────────────────────────────────────
    WC()->cart->empty_cart();

    // ── Add items + collect debug info ─────────────────────────────────────────
    $added      = 0;
    $failed     = [];
    $debug_rows = [];

    foreach ( $payload['items'] as $item ) {
        $product_id = isset( $item['id'] )  ? absint( $item['id'] )  : 0;
        $qty        = isset( $item['qty'] ) ? absint( $item['qty'] ) : 0;

        $row = [
            'received_id'  => $product_id,
            'received_qty' => $qty,
        ];

        if ( $product_id < 1 || $qty < 1 ) {
            $row['error'] = 'invalid id or qty (skipped)';
            $debug_rows[] = $row;
            $failed[]     = "id={$product_id} (invalid)";
            continue;
        }

        // ── Product inspection ─────────────────────────────────────────────────
        $product = wc_get_product( $product_id );

        $row['product_found'] = $product ? 'YES' : 'NO';
        $row['product_name']  = $product ? $product->get_name()   : '(not found)';
        $row['product_type']  = $product ? $product->get_type()   : '(n/a)';
        $row['status']        = $product ? $product->get_status() : '(n/a)';
        $row['purchasable']   = $product ? ( $product->is_purchasable() ? 'YES' : 'NO' ) : '(n/a)';
        $row['in_stock']      = $product ? ( $product->is_in_stock()    ? 'YES' : 'NO' ) : '(n/a)';
        $row['stock_qty']     = $product ? $product->get_stock_quantity()                : '(n/a)';
        $row['sold_individually'] = $product ? ( $product->get_sold_individually() ? 'YES' : 'NO' ) : '(n/a)';

        if ( ! $product ) {
            $row['error'] = 'wc_get_product returned false — product does not exist';
            $debug_rows[] = $row;
            $failed[]     = "id={$product_id} (not found)";
            continue;
        }

        if ( ! $product->is_purchasable() ) {
            $row['error'] = 'product is not purchasable';
            $debug_rows[] = $row;
            $failed[]     = "id={$product_id} (not purchasable)";
            continue;
        }

        if ( ! $product->is_in_stock() ) {
            $row['error'] = 'product is out of stock';
            $debug_rows[] = $row;
            $failed[]     = "id={$product_id} (out of stock)";
            continue;
        }

        // ── Cap quantity ───────────────────────────────────────────────────────
        $final_qty = $qty;
        if ( function_exists( 'pwc_get_allowed_max_qty' ) ) {
            $max_qty = pwc_get_allowed_max_qty( $product_id );
            if ( $max_qty > 0 ) {
                $final_qty = min( $qty, $max_qty );
            }
        }
        $row['final_qty'] = $final_qty;

        // ── Attempt add_to_cart ────────────────────────────────────────────────
        // Temporarily mute wc_add_notice so validation errors don't pollute the
        // die() output, but capture them for our debug row.
        $notices_before = wc_get_notices( 'error' );
        $result         = WC()->cart->add_to_cart( $product_id, $final_qty );
        $notices_after  = wc_get_notices( 'error' );
        $new_notices    = array_slice( $notices_after, count( $notices_before ) );

        $row['add_to_cart_result'] = ( false !== $result ) ? "OK (key={$result})" : 'FALSE';
        if ( ! empty( $new_notices ) ) {
            $row['wc_error_notices'] = array_map( function( $n ) {
                return is_array( $n ) ? ( $n['notice'] ?? '' ) : (string) $n;
            }, $new_notices );
        }

        if ( false !== $result ) {
            $added++;
        } else {
            $failed[] = "id={$product_id} (add_to_cart returned false)";
        }

        $debug_rows[] = $row;
    }

    // ── Always log to PHP error log ────────────────────────────────────────────
    error_log( '[PWC cart handoff] payload items: ' . json_encode( $payload['items'] ) );
    error_log( '[PWC cart handoff] debug rows: '    . json_encode( $debug_rows ) );
    error_log( '[PWC cart handoff] added=' . $added . ' failed=' . count( $failed ) );

    // ── If nothing was added, show full debug ──────────────────────────────────
    if ( $added === 0 ) {
        $debug_html = '<pre style="text-align:left;background:#f5f5f5;padding:16px;border-radius:6px;font-size:13px;overflow:auto;">'
            . esc_html( json_encode( $debug_rows, JSON_PRETTY_PRINT ) )
            . '</pre>';

        wp_die(
            '<h2>PWC Cart Handoff — Debug</h2>'
            . '<p><strong>Could not add any items to cart.</strong> Debug info:</p>'
            . $debug_html
            . '<p><a href="javascript:history.back()">← Go back</a></p>',
            'Cart Handoff Debug',
            [ 'response' => 422 ]
        );
    }

    // Log partial failures but continue (some items added successfully).
    if ( ! empty( $failed ) ) {
        error_log( '[PWC cart handoff] partial failure — failed items: ' . implode( ', ', $failed ) );
    }

    // ── Redirect to checkout ───────────────────────────────────────────────────
    wp_safe_redirect( wc_get_checkout_url() );
    exit;
}
