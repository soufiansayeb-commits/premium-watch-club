<?php
/**
 * PWC — Ticket Bundle Discounts (server-side, authoritative)
 *
 * Applies a quantity-based discount to the per-ticket price of eligible paid
 * competition products. This is the SOURCE OF TRUTH for bundle pricing: it runs
 * at cart calculation time, so the cart total, checkout total and final order
 * total are all discounted correctly regardless of what the frontend shows.
 *
 * The Next.js frontend mirrors these exact tiers in lib/ticket-bundles.ts purely
 * for display. If you change a tier here, change it there too.
 *
 * INSTALLATION
 * ────────────
 * WordPress admin → Code Snippets → Add New → paste this ENTIRE file → Save & Enable.
 * (Snippets are NOT auto-deployed from the repo — this must be pasted in manually.)
 *
 * TIERS (quantity ≥ threshold earns that discount; highest matching tier wins)
 *   1  ticket   → 0%
 *   3  tickets  → 5%
 *   5  tickets  → 10%
 *   10 tickets  → 15%
 *   20 tickets  → 20%
 *
 * ELIGIBILITY
 *   • Product has a non-empty ACF `competition_type` (i.e. it is a competition).
 *   • Base (regular) price > 0 → free / £0 competitions are excluded.
 *   • No hardcoded product IDs or slugs — works for every current & future comp.
 *
 * COUPONS
 *   By default bundle discounts do NOT stack with coupon codes (safest). If a
 *   coupon is applied to the cart, the bundle discount is skipped so the customer
 *   is never double-discounted. Flip PWC_BUNDLE_ALLOW_COUPON_STACKING to true to
 *   allow stacking later.
 *
 *   Future Special Drop → Weekly coupon strategy can be added here later: issue a
 *   WooCommerce coupon on free Special Drop entry, then decide per-campaign whether
 *   it may stack with bundle pricing via the flag below.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

if ( ! defined( 'PWC_BUNDLE_ALLOW_COUPON_STACKING' ) ) {
    define( 'PWC_BUNDLE_ALLOW_COUPON_STACKING', false );
}

/**
 * Discount tiers — keep in sync with lib/ticket-bundles.ts.
 * Returned ordered low → high.
 */
function pwc_bundle_tiers() {
    return array(
        array( 'min' => 1,  'discount' => 0.00 ),
        array( 'min' => 3,  'discount' => 0.05 ),
        array( 'min' => 5,  'discount' => 0.10 ),
        array( 'min' => 10, 'discount' => 0.15 ),
        array( 'min' => 20, 'discount' => 0.20 ),
    );
}

/** Discount fraction (0–1) earned at a given quantity. */
function pwc_bundle_discount_for_qty( $qty ) {
    $discount = 0.0;
    foreach ( pwc_bundle_tiers() as $tier ) {
        if ( $qty >= $tier['min'] ) {
            $discount = (float) $tier['discount'];
        }
    }
    return $discount;
}

/**
 * Is this product an eligible PAID competition?
 * Eligible = has ACF competition_type AND a positive base price.
 */
function pwc_bundle_is_eligible( $product ) {
    if ( ! $product instanceof WC_Product ) return false;

    $product_id = $product->get_id();

    $type = function_exists( 'get_field' )
        ? get_field( 'competition_type', $product_id )
        : get_post_meta( $product_id, 'competition_type', true );

    if ( empty( $type ) ) return false; // not a competition product

    $base = pwc_bundle_base_price( $product );
    return $base > 0; // free / £0 competitions are never discounted
}

/**
 * The true, undiscounted unit price. Prefer regular price so repeated cart
 * recalculations never compound the discount.
 */
function pwc_bundle_base_price( $product ) {
    $regular = (float) $product->get_regular_price();
    if ( $regular > 0 ) return $regular;
    return (float) $product->get_price();
}

// ─────────────────────────────────────────────────────────────────────────────
// Capture the original unit price when an item enters the cart, so we always
// discount from the catalogue price (compounding-safe across recalculations).
// ─────────────────────────────────────────────────────────────────────────────

add_filter( 'woocommerce_add_cart_item', 'pwc_bundle_store_base_price', 10, 1 );
function pwc_bundle_store_base_price( $cart_item ) {
    if ( isset( $cart_item['data'] ) && pwc_bundle_is_eligible( $cart_item['data'] ) ) {
        $cart_item['pwc_base_price'] = pwc_bundle_base_price( $cart_item['data'] );
    }
    return $cart_item;
}

add_filter( 'woocommerce_get_cart_item_from_session', 'pwc_bundle_restore_base_price', 10, 2 );
function pwc_bundle_restore_base_price( $cart_item, $values ) {
    if ( isset( $values['pwc_base_price'] ) ) {
        $cart_item['pwc_base_price'] = $values['pwc_base_price'];
    } elseif ( isset( $cart_item['data'] ) && pwc_bundle_is_eligible( $cart_item['data'] ) ) {
        $cart_item['pwc_base_price'] = pwc_bundle_base_price( $cart_item['data'] );
    }
    return $cart_item;
}

// ─────────────────────────────────────────────────────────────────────────────
// Apply the discount at calculation time. This drives cart + checkout + order.
// ─────────────────────────────────────────────────────────────────────────────

add_action( 'woocommerce_before_calculate_totals', 'pwc_bundle_apply_discounts', 20, 1 );
function pwc_bundle_apply_discounts( $cart ) {
    if ( is_admin() && ! defined( 'DOING_AJAX' ) ) return;
    if ( ! $cart instanceof WC_Cart ) return;

    // Safest default: never stack with coupons. If a coupon is present, leave the
    // catalogue price untouched so the coupon is the only discount applied.
    if ( ! PWC_BUNDLE_ALLOW_COUPON_STACKING ) {
        $applied = $cart->get_applied_coupons();
        if ( ! empty( $applied ) ) return;
    }

    foreach ( $cart->get_cart() as $cart_item ) {
        if ( empty( $cart_item['data'] ) ) continue;
        $product = $cart_item['data'];

        if ( ! pwc_bundle_is_eligible( $product ) ) continue;

        $base = isset( $cart_item['pwc_base_price'] )
            ? (float) $cart_item['pwc_base_price']
            : pwc_bundle_base_price( $product );

        if ( $base <= 0 ) continue;

        $qty      = (int) $cart_item['quantity'];
        $discount = pwc_bundle_discount_for_qty( $qty );
        if ( $discount <= 0 ) {
            // No discount tier reached — make sure we use the clean base price.
            $product->set_price( $base );
            continue;
        }

        $unit = round( $base * ( 1 - $discount ), 2 );
        $product->set_price( $unit );
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Show the saving as a line in the cart / checkout order summary (informational).
// ─────────────────────────────────────────────────────────────────────────────

add_filter( 'woocommerce_cart_item_price', 'pwc_bundle_cart_item_price_html', 10, 3 );
function pwc_bundle_cart_item_price_html( $price_html, $cart_item, $cart_item_key ) {
    if ( empty( $cart_item['data'] ) || ! pwc_bundle_is_eligible( $cart_item['data'] ) ) {
        return $price_html;
    }
    $qty      = (int) $cart_item['quantity'];
    $discount = pwc_bundle_discount_for_qty( $qty );
    if ( $discount <= 0 ) return $price_html;

    $base = isset( $cart_item['pwc_base_price'] )
        ? (float) $cart_item['pwc_base_price']
        : pwc_bundle_base_price( $cart_item['data'] );

    $pct = round( $discount * 100 );
    return wc_price( round( $base * ( 1 - $discount ), 2 ) )
        . ' <del style="opacity:.6">' . wc_price( $base ) . '</del>'
        . ' <span style="color:#c0392b;font-weight:600;font-size:.85em">Save ' . $pct . '%</span>';
}
