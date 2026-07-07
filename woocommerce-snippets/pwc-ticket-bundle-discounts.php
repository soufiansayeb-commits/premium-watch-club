<?php
/**
 * PWC — Ticket Bundle Discounts (backend-driven, single source of truth)
 * ─────────────────────────────────────────────────────────────────────────────
 * Everything about ticket bundle discounts is managed from ONE WordPress option
 * (`pwc_bundle_discounts`) edited at:
 *
 *      WooCommerce → PWC Bundle Discounts
 *
 * That same option is used by THREE things, so they can never drift apart:
 *   1. This snippet enforces the discount server-side at cart / checkout / order
 *      time — the authoritative price the customer actually pays.
 *   2. This snippet exposes the option (read-only) at:
 *          /wp-json/pwc/v1/bundle-discounts
 *      which the Next.js frontend consumes to DISPLAY the same numbers.
 *   3. The admin page reads/writes the option.
 *
 * There are NO hardcoded tiers anywhere. Change discounts in the admin page and
 * both the storefront display and the checkout price update together.
 *
 * INSTALLATION
 * ────────────
 * WordPress admin → Code Snippets → Add New → paste this ENTIRE file → Save &
 * Activate (run everywhere). If you previously had the old hardcoded
 * "PWC Ticket Bundle Discounts" snippet, REPLACE it with this one (or deactivate
 * the old one) so only a single bundle-discount snippet is ever active.
 *
 * On first activation the option is seeded with the default tiers:
 *   3 → 5%,  5 → 10%,  10 → 15% (Most Popular),  20 → 20% (Best Odds)
 * ─────────────────────────────────────────────────────────────────────────────
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'PWC_BUNDLE_OPTION', 'pwc_bundle_discounts' );
define( 'PWC_BUNDLE_TIER_SLOTS', 6 ); // fixed number of configurable tier rows

/**
 * Default settings — used the first time the option is saved and as a safe
 * fallback if the stored option is ever missing/corrupt.
 */
function pwc_bundle_defaults() {
    return array(
        'enabled'               => 1,
        'apply_weekly'          => 1,
        'apply_monthly'         => 1,
        'apply_special'         => 0,
        'exclude_free_products' => 1,
        'allow_coupon_stacking' => 0,
        'tiers'                 => array(
            array( 'enabled' => 1, 'min_qty' => 3,  'discount_percent' => 5,  'label' => '', 'badge' => '',             'sort' => 1 ),
            array( 'enabled' => 1, 'min_qty' => 5,  'discount_percent' => 10, 'label' => '', 'badge' => '',             'sort' => 2 ),
            array( 'enabled' => 1, 'min_qty' => 10, 'discount_percent' => 15, 'label' => '', 'badge' => 'Most Popular', 'sort' => 3 ),
            array( 'enabled' => 1, 'min_qty' => 20, 'discount_percent' => 20, 'label' => '', 'badge' => 'Best Odds',    'sort' => 4 ),
            array( 'enabled' => 0, 'min_qty' => 0,  'discount_percent' => 0,  'label' => '', 'badge' => '',             'sort' => 5 ),
            array( 'enabled' => 0, 'min_qty' => 0,  'discount_percent' => 0,  'label' => '', 'badge' => '',             'sort' => 6 ),
        ),
    );
}

/** Read the saved settings, merged over defaults so missing keys are always safe. */
function pwc_bundle_settings() {
    $saved = get_option( PWC_BUNDLE_OPTION );
    if ( ! is_array( $saved ) ) return pwc_bundle_defaults();
    return wp_parse_args( $saved, pwc_bundle_defaults() );
}

/**
 * The active tiers, normalised: only enabled rows with a positive quantity and
 * discount, sorted low → high by min_qty. Highest matching tier wins at runtime.
 */
function pwc_bundle_active_tiers() {
    $settings = pwc_bundle_settings();
    $tiers    = array();

    if ( ! empty( $settings['tiers'] ) && is_array( $settings['tiers'] ) ) {
        foreach ( $settings['tiers'] as $t ) {
            $enabled = ! empty( $t['enabled'] );
            $min     = isset( $t['min_qty'] ) ? (int) $t['min_qty'] : 0;
            $pct     = isset( $t['discount_percent'] ) ? (float) $t['discount_percent'] : 0;
            if ( ! $enabled || $min <= 0 || $pct <= 0 ) continue;
            $tiers[] = array(
                'min_qty'          => $min,
                'discount_percent' => max( 0, min( 100, $pct ) ),
                'label'            => isset( $t['label'] ) ? (string) $t['label'] : '',
                'badge'            => isset( $t['badge'] ) ? (string) $t['badge'] : '',
            );
        }
    }

    usort( $tiers, function ( $a, $b ) { return $a['min_qty'] - $b['min_qty']; } );
    return $tiers;
}

/** Discount fraction (0–1) earned at a given quantity — highest matching tier. */
function pwc_bundle_discount_for_qty( $qty ) {
    $discount = 0.0;
    foreach ( pwc_bundle_active_tiers() as $tier ) {
        if ( $qty >= $tier['min_qty'] ) {
            $discount = (float) $tier['discount_percent'] / 100;
        }
    }
    return $discount;
}

/** The true, undiscounted unit price (prefer regular price → compounding-safe). */
function pwc_bundle_base_price( $product ) {
    $regular = (float) $product->get_regular_price();
    if ( $regular > 0 ) return $regular;
    return (float) $product->get_price();
}

/**
 * Is this product an eligible PAID competition, per the admin settings?
 *   • bundle discounts globally enabled
 *   • base price > 0                        (free / £0 comps excluded)
 *   • competition_type is enabled in "Apply to …"
 * No hardcoded product IDs / slugs / names — future comps just work.
 */
function pwc_bundle_is_eligible( $product ) {
    if ( ! $product instanceof WC_Product ) return false;

    $settings = pwc_bundle_settings();
    if ( empty( $settings['enabled'] ) ) return false;

    $product_id = $product->get_id();

    $type = function_exists( 'get_field' )
        ? get_field( 'competition_type', $product_id )
        : get_post_meta( $product_id, 'competition_type', true );
    $type = strtolower( trim( (string) $type ) );

    if ( $type === '' ) return false; // not a competition product

    $base = pwc_bundle_base_price( $product );
    if ( ! empty( $settings['exclude_free_products'] ) && $base <= 0 ) return false;
    if ( $base <= 0 ) return false;

    // Apply-to gate by competition type (Special is OFF by default).
    if ( $type === 'weekly'  ) return ! empty( $settings['apply_weekly'] );
    if ( $type === 'monthly' ) return ! empty( $settings['apply_monthly'] );
    if ( $type === 'special' ) return ! empty( $settings['apply_special'] );

    // starter / free / unknown types are never discounted.
    return false;
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
// Recalculates on every quantity change because Woo re-runs this hook each time.
// ─────────────────────────────────────────────────────────────────────────────

add_action( 'woocommerce_before_calculate_totals', 'pwc_bundle_apply_discounts', 20, 1 );
function pwc_bundle_apply_discounts( $cart ) {
    if ( is_admin() && ! defined( 'DOING_AJAX' ) ) return;
    if ( ! $cart instanceof WC_Cart ) return;

    $settings = pwc_bundle_settings();
    if ( empty( $settings['enabled'] ) ) return;

    // Safest default: never stack with coupons. If a coupon is present and
    // stacking is off, leave the catalogue price untouched so the coupon is the
    // only discount applied — the customer is never double-discounted.
    if ( empty( $settings['allow_coupon_stacking'] ) ) {
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
            // No tier reached — always reset to the clean base (never compound).
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

// ═════════════════════════════════════════════════════════════════════════════
// REST ENDPOINT  —  GET /wp-json/pwc/v1/bundle-discounts   (public, read-only)
// The Next.js frontend consumes this to display the exact tiers enforced above.
// ═════════════════════════════════════════════════════════════════════════════

add_action( 'rest_api_init', 'pwc_bundle_register_rest' );
function pwc_bundle_register_rest() {
    register_rest_route( 'pwc/v1', '/bundle-discounts', array(
        'methods'             => 'GET',
        'permission_callback' => '__return_true', // public settings, no secrets
        'callback'            => 'pwc_bundle_rest_response',
    ) );
}

function pwc_bundle_rest_response() {
    $settings = pwc_bundle_settings();

    $tiers = array();
    foreach ( pwc_bundle_active_tiers() as $t ) {
        $tiers[] = array(
            'min_qty'          => (int) $t['min_qty'],
            'discount_percent' => (float) $t['discount_percent'],
            'label'            => (string) $t['label'],
            'badge'            => (string) $t['badge'],
            'enabled'          => true,
        );
    }

    return rest_ensure_response( array(
        'enabled'               => ! empty( $settings['enabled'] ),
        'apply_to'              => array(
            'weekly'  => ! empty( $settings['apply_weekly'] ),
            'monthly' => ! empty( $settings['apply_monthly'] ),
            'special' => ! empty( $settings['apply_special'] ),
        ),
        'exclude_free_products' => ! empty( $settings['exclude_free_products'] ),
        'allow_coupon_stacking' => ! empty( $settings['allow_coupon_stacking'] ),
        'tiers'                 => $tiers,
    ) );
}

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN PAGE  —  WooCommerce → PWC Bundle Discounts
// A simple fixed form: global toggles + 6 tier slots. No repeater, no plugin UI.
// ═════════════════════════════════════════════════════════════════════════════

add_action( 'admin_menu', 'pwc_bundle_admin_menu', 99 );
function pwc_bundle_admin_menu() {
    $parent = class_exists( 'WooCommerce' ) ? 'woocommerce' : 'options-general.php';
    add_submenu_page(
        $parent,
        'PWC Bundle Discounts',
        'PWC Bundle Discounts',
        'manage_woocommerce',
        'pwc-bundle-discounts',
        'pwc_bundle_admin_page'
    );
}

function pwc_bundle_admin_page() {
    if ( ! current_user_can( 'manage_woocommerce' ) ) return;

    // ── Save ──────────────────────────────────────────────────────────────────
    if ( isset( $_POST['pwc_bundle_save'] ) && check_admin_referer( 'pwc_bundle_save', 'pwc_bundle_nonce' ) ) {
        $tiers = array();
        for ( $i = 0; $i < PWC_BUNDLE_TIER_SLOTS; $i++ ) {
            $tiers[] = array(
                'enabled'          => isset( $_POST['tier_enabled'][ $i ] ) ? 1 : 0,
                'min_qty'          => isset( $_POST['tier_min'][ $i ] )      ? absint( $_POST['tier_min'][ $i ] ) : 0,
                'discount_percent' => isset( $_POST['tier_pct'][ $i ] )      ? min( 100, max( 0, floatval( $_POST['tier_pct'][ $i ] ) ) ) : 0,
                'label'            => isset( $_POST['tier_label'][ $i ] )    ? sanitize_text_field( wp_unslash( $_POST['tier_label'][ $i ] ) ) : '',
                'badge'            => isset( $_POST['tier_badge'][ $i ] )    ? sanitize_text_field( wp_unslash( $_POST['tier_badge'][ $i ] ) ) : '',
                'sort'             => $i + 1,
            );
        }

        $settings = array(
            'enabled'               => isset( $_POST['enabled'] ) ? 1 : 0,
            'apply_weekly'          => isset( $_POST['apply_weekly'] ) ? 1 : 0,
            'apply_monthly'         => isset( $_POST['apply_monthly'] ) ? 1 : 0,
            'apply_special'         => isset( $_POST['apply_special'] ) ? 1 : 0,
            'exclude_free_products' => isset( $_POST['exclude_free_products'] ) ? 1 : 0,
            'allow_coupon_stacking' => isset( $_POST['allow_coupon_stacking'] ) ? 1 : 0,
            'tiers'                 => $tiers,
        );

        update_option( PWC_BUNDLE_OPTION, $settings );
        echo '<div class="notice notice-success is-dismissible"><p>Bundle discount settings saved.</p></div>';
    }

    $s     = pwc_bundle_settings();
    $tiers = isset( $s['tiers'] ) && is_array( $s['tiers'] ) ? $s['tiers'] : array();
    // Pad to the fixed number of slots so the form always renders every row.
    while ( count( $tiers ) < PWC_BUNDLE_TIER_SLOTS ) {
        $tiers[] = array( 'enabled' => 0, 'min_qty' => 0, 'discount_percent' => 0, 'label' => '', 'badge' => '' );
    }

    $chk = function ( $v ) { return ! empty( $v ) ? 'checked' : ''; };
    ?>
    <div class="wrap">
        <h1>PWC Bundle Discounts</h1>
        <p style="max-width:720px">
            One place to manage ticket bundle discounts. These rules are enforced at
            WooCommerce checkout <strong>and</strong> shown on the storefront ticket
            cards, so display and checkout always match. Endpoint:
            <code><?php echo esc_html( home_url( '/wp-json/pwc/v1/bundle-discounts' ) ); ?></code>
        </p>

        <form method="post">
            <?php wp_nonce_field( 'pwc_bundle_save', 'pwc_bundle_nonce' ); ?>

            <h2 class="title">Global settings</h2>
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row">Bundle discounts enabled</th>
                    <td><label><input type="checkbox" name="enabled" <?php echo $chk( $s['enabled'] ); ?>> Turn the whole system on/off</label></td>
                </tr>
                <tr>
                    <th scope="row">Apply to competition types</th>
                    <td>
                        <label><input type="checkbox" name="apply_weekly"  <?php echo $chk( $s['apply_weekly'] ); ?>> Weekly</label><br>
                        <label><input type="checkbox" name="apply_monthly" <?php echo $chk( $s['apply_monthly'] ); ?>> Monthly</label><br>
                        <label><input type="checkbox" name="apply_special" <?php echo $chk( $s['apply_special'] ); ?>> Special <em>(off by default)</em></label>
                    </td>
                </tr>
                <tr>
                    <th scope="row">Exclude free products</th>
                    <td><label><input type="checkbox" name="exclude_free_products" <?php echo $chk( $s['exclude_free_products'] ); ?>> Never discount £0 / free lead-gen competitions</label></td>
                </tr>
                <tr>
                    <th scope="row">Allow coupon stacking</th>
                    <td><label><input type="checkbox" name="allow_coupon_stacking" <?php echo $chk( $s['allow_coupon_stacking'] ); ?>> Let bundle discounts stack on top of coupon codes <em>(off by default — avoids double discounting)</em></label></td>
                </tr>
            </table>

            <h2 class="title">Discount tiers</h2>
            <p class="description">A quantity earns the discount of the highest enabled tier it meets. Leave a slot disabled to hide it.</p>
            <table class="widefat striped" style="max-width:860px">
                <thead>
                    <tr>
                        <th style="width:70px">Enabled</th>
                        <th style="width:110px">Min qty</th>
                        <th style="width:120px">Discount %</th>
                        <th>Label (optional)</th>
                        <th>Badge (optional)</th>
                    </tr>
                </thead>
                <tbody>
                <?php for ( $i = 0; $i < PWC_BUNDLE_TIER_SLOTS; $i++ ) :
                    $t = $tiers[ $i ]; ?>
                    <tr>
                        <td style="text-align:center"><input type="checkbox" name="tier_enabled[<?php echo $i; ?>]" <?php echo $chk( $t['enabled'] ); ?>></td>
                        <td><input type="number" min="0" step="1" name="tier_min[<?php echo $i; ?>]" value="<?php echo esc_attr( $t['min_qty'] ); ?>" style="width:90px"></td>
                        <td><input type="number" min="0" max="100" step="0.5" name="tier_pct[<?php echo $i; ?>]" value="<?php echo esc_attr( $t['discount_percent'] ); ?>" style="width:90px"></td>
                        <td><input type="text" name="tier_label[<?php echo $i; ?>]" value="<?php echo esc_attr( $t['label'] ); ?>" class="regular-text" placeholder="e.g. Save more"></td>
                        <td><input type="text" name="tier_badge[<?php echo $i; ?>]" value="<?php echo esc_attr( $t['badge'] ); ?>" class="regular-text" placeholder="e.g. Most Popular"></td>
                    </tr>
                <?php endfor; ?>
                </tbody>
            </table>

            <p class="submit"><button type="submit" name="pwc_bundle_save" class="button button-primary">Save changes</button></p>
        </form>
    </div>
    <?php
}
