<?php
/**
 * PWC Skill Challenge — WooCommerce Order Item Meta
 *
 * Paste the contents of this file into:
 *   WordPress admin → Appearance → Theme File Editor → functions.php
 * (or into a custom plugin file)
 *
 * HOW THE DATA FLOWS
 * ──────────────────
 * 1. Customer selects an answer in the Next.js challenge step.
 * 2. Next.js /api/prepare-checkout signs a payload containing:
 *      { items: [{ id, qty, skillAnswer, skillResult }], ts }
 * 3. Browser is redirected to:
 *      https://yoursite.com/?pwc_cart=<base64>&pwc_sig=<hmac>
 * 4. Your existing WordPress init hook decodes the payload, clears the Woo
 *    cart, and calls WC()->cart->add_to_cart() for each item.
 * 5. THIS snippet's init hook (priority 5) runs BEFORE step 4, reads the same
 *    signed payload, and stores skill data in a PHP global so it is available
 *    when woocommerce_add_cart_item_data fires during step 4.
 * 6. woocommerce_add_cart_item_data attaches skill answer + result to each
 *    cart item's data array.
 * 7. woocommerce_checkout_create_order_line_item copies cart item data to
 *    order item meta and also reads the correct_answer ACF field from the
 *    product at that moment.
 * 8. The WooCommerce admin order screen displays:
 *      Skill Answer / Correct Answer / Challenge Result
 *
 * REQUIREMENTS
 * ────────────
 * • Define PWC_CART_HANDOFF_SECRET in wp-config.php (same value as
 *   PWC_CART_HANDOFF_SECRET in your Next.js .env.local).
 * • ACF Pro active with a "correct_answer" text field on products.
 * • The existing PWC cart handoff hook must call WC()->cart->add_to_cart()
 *   (standard WooCommerce method) so the woocommerce_add_cart_item_data
 *   filter fires automatically.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// ── PHP global: shares skill data within the same HTTP request ────────────────
// Using a global is more reliable than WC session here because:
//  a) WC session may not have started on a fresh visitor's first request.
//  b) The global is set at init priority 5 and read during cart item insertion,
//     all within the same PHP process — no session persistence needed.
global $pwc_skill_challenge_map;
$pwc_skill_challenge_map = [];

// ── 1. Decode handoff payload and capture skill data ─────────────────────────

add_action( 'init', 'pwc_capture_skill_data_from_handoff', 5 );
function pwc_capture_skill_data_from_handoff() {
    global $pwc_skill_challenge_map;

    $encoded = isset( $_GET['pwc_cart'] ) ? sanitize_text_field( wp_unslash( $_GET['pwc_cart'] ) ) : '';
    $sig     = isset( $_GET['pwc_sig']  ) ? sanitize_text_field( wp_unslash( $_GET['pwc_sig']  ) ) : '';

    if ( ! $encoded || ! $sig ) return;

    $secret = defined( 'PWC_CART_HANDOFF_SECRET' ) ? PWC_CART_HANDOFF_SECRET : '';
    if ( ! $secret ) {
        error_log( '[PWC] pwc_capture_skill_data_from_handoff: PWC_CART_HANDOFF_SECRET not defined in wp-config.php' );
        return;
    }

    // Restore standard base64 padding before decoding
    $b64     = str_replace( ['-', '_'], ['+', '/'], $encoded );
    $padding = strlen( $b64 ) % 4;
    if ( $padding ) $b64 .= str_repeat( '=', 4 - $padding );

    $expected = hash_hmac( 'sha256', $encoded, $secret );
    if ( ! hash_equals( $expected, $sig ) ) {
        error_log( '[PWC] pwc_capture_skill_data_from_handoff: HMAC signature mismatch — ignoring' );
        return;
    }

    $json    = base64_decode( $b64, true );
    $payload = $json ? json_decode( $json, true ) : null;
    if ( ! is_array( $payload ) || empty( $payload['items'] ) ) return;

    // 5-minute expiry
    $ts = isset( $payload['ts'] ) ? (int) $payload['ts'] : 0;
    if ( abs( time() - $ts ) > 300 ) {
        error_log( '[PWC] pwc_capture_skill_data_from_handoff: payload expired (ts=' . $ts . ')' );
        return;
    }

    // Build map: product_id (int) → [answer, result]
    foreach ( $payload['items'] as $item ) {
        $id = isset( $item['id'] ) ? (int) $item['id'] : 0;
        if ( ! $id ) continue;
        $answer = isset( $item['skillAnswer'] ) ? sanitize_text_field( $item['skillAnswer'] ) : '';
        $result = isset( $item['skillResult'] ) ? sanitize_text_field( $item['skillResult'] ) : '';
        if ( $answer || $result ) {
            $pwc_skill_challenge_map[ $id ] = [
                'answer' => $answer,
                'result' => $result,
            ];
        }
    }

    if ( ! empty( $pwc_skill_challenge_map ) ) {
        error_log( '[PWC] Skill map captured for product IDs: ' . implode( ', ', array_keys( $pwc_skill_challenge_map ) ) );

        // Also save in WC session as a secondary backup (for any non-same-request edge cases)
        if ( WC()->session ) {
            WC()->session->set( 'pwc_skill_map', $pwc_skill_challenge_map );
        }
    }
}

// ── 2. Attach skill meta when WooCommerce adds items to cart ──────────────────
//    Fires inside WC()->cart->add_to_cart() — the standard method used by the
//    PWC handoff hook to populate the Woo cart.

add_filter( 'woocommerce_add_cart_item_data', 'pwc_add_skill_data_to_cart_item', 10, 2 );
function pwc_add_skill_data_to_cart_item( $cart_item_data, $product_id ) {
    global $pwc_skill_challenge_map;

    // Primary: PHP global (same request)
    $map = $pwc_skill_challenge_map;

    // Secondary: WC session (if global is somehow empty)
    if ( empty( $map ) && WC()->session ) {
        $map = WC()->session->get( 'pwc_skill_map', [] );
    }

    if ( empty( $map[ $product_id ] ) ) return $cart_item_data;

    $cart_item_data['pwc_skill_answer'] = $map[ $product_id ]['answer'];
    $cart_item_data['pwc_skill_result'] = $map[ $product_id ]['result'];

    error_log( '[PWC] Skill data attached to cart item for product #' . $product_id . ': answer="' . $map[ $product_id ]['answer'] . '", result="' . $map[ $product_id ]['result'] . '"' );

    return $cart_item_data;
}

// ── 3. Save to WooCommerce order item meta on checkout ────────────────────────

add_action( 'woocommerce_checkout_create_order_line_item', 'pwc_save_skill_meta_to_order_item', 10, 4 );
function pwc_save_skill_meta_to_order_item( $item, $cart_item_key, $values, $order ) {
    $answer = isset( $values['pwc_skill_answer'] ) ? $values['pwc_skill_answer'] : '';
    $result = isset( $values['pwc_skill_result'] ) ? $values['pwc_skill_result'] : '';

    if ( ! $answer && ! $result ) return;

    $product_id = $item->get_product_id();

    // Fetch the correct answer from ACF at order time — never stored client-side
    $correct = '';
    if ( function_exists( 'get_field' ) ) {
        $correct = (string) get_field( 'correct_answer', $product_id );
    }

    $item->add_meta_data( '_pwc_skill_answer',   $answer,  true );
    $item->add_meta_data( '_pwc_correct_answer', $correct, true );
    $item->add_meta_data( '_pwc_skill_result',   $result,  true );

    error_log( '[PWC] Order item meta saved for product #' . $product_id . ': answer="' . $answer . '", correct="' . $correct . '", result="' . $result . '"' );
}

// ── 4. Display as readable labels in WooCommerce order admin ──────────────────

add_filter( 'woocommerce_order_item_get_formatted_meta_data', 'pwc_format_skill_meta_for_admin', 10, 2 );
function pwc_format_skill_meta_for_admin( $formatted_meta, $item ) {
    $label_map = [
        '_pwc_skill_answer'   => 'Skill Answer',
        '_pwc_correct_answer' => 'Correct Answer',
        '_pwc_skill_result'   => 'Challenge Result',
    ];

    foreach ( $formatted_meta as $meta ) {
        if ( isset( $label_map[ $meta->key ] ) ) {
            $meta->display_key = $label_map[ $meta->key ];
        }
    }

    return $formatted_meta;
}

// Keep internal meta keys hidden from duplicate raw display
add_filter( 'woocommerce_hidden_order_itemmeta', 'pwc_hide_raw_skill_meta_keys' );
function pwc_hide_raw_skill_meta_keys( $hidden ) {
    return array_merge( $hidden, [
        '_pwc_skill_answer',
        '_pwc_correct_answer',
        '_pwc_skill_result',
    ] );
}
