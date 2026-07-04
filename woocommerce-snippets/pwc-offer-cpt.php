<?php
/**
 * PWC Offers — Custom Post Type + Active-Offer REST endpoint
 *
 * Paste into: WordPress Admin → Snippets (Code Snippets plugin) → Add New
 * Title: PWC Offers CPT
 * Run: Everywhere
 *
 * IMPORTANT — if you previously pasted an earlier version of this snippet as a
 * SEPARATE snippet, deactivate/delete that one first. Two active snippets
 * defining the same function names causes a PHP fatal "Cannot redeclare
 * function" error (blank white page). Every function below is also guarded
 * with function_exists() as a second line of defence.
 *
 * Public REST endpoints (no auth — marketing content only):
 *   GET /wp-json/pwc/v1/ping                → { "status": "ok" }   (isolation test)
 *   GET /wp-json/pwc/v1/active-offer         → the active offer object, or null
 *   GET /wp-json/pwc/v1/active-offer-debug   → diagnostics incl. REAL ACF field names
 *
 * FIELD-NAME RESILIENCE
 * ─────────────────────
 * The exact ACF field names in your group may differ from the original plan
 * (e.g. main_headline vs offer_headline). Instead of hard-coding one name per
 * value, each logical value is resolved from a list of CANDIDATE names via
 * pwc_pick(): the first candidate that actually exists on the post wins. So the
 * endpoint works whether your fields are named `main_headline`, `offer_headline`,
 * etc. Use /active-offer-debug to see your real field names, then (optionally)
 * trim the candidate lists in PWC_OFFER_FIELD_MAP below to just yours.
 *
 * BLANK-PAGE SAFETY
 * ─────────────────
 * The callback is wrapped in try/catch AND a register_shutdown_function guard,
 * so even an uncatchable fatal (memory/time-limit) returns JSON, never a blank
 * page. Errors are written to the PHP error log and, when WP_DEBUG is on, echoed
 * in the response.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// ── Register PWC Offers Custom Post Type ───────────────────────────────────────

if ( ! function_exists( 'pwc_register_offer_cpt' ) ) {
function pwc_register_offer_cpt() {
    $labels = [
        'name'               => 'PWC Offers',
        'singular_name'      => 'PWC Offer',
        'add_new'            => 'Add New',
        'add_new_item'       => 'Add New Offer',
        'edit_item'          => 'Edit Offer',
        'new_item'           => 'New Offer',
        'view_item'          => 'View Offer',
        'search_items'       => 'Search Offers',
        'not_found'          => 'No offers found',
        'not_found_in_trash' => 'No offers found in trash',
        'menu_name'          => 'PWC Offers',
    ];

    register_post_type( 'pwc_offer', [
        'labels'        => $labels,
        'public'        => false,
        'show_ui'       => true,
        'show_in_menu'  => true,
        'show_in_rest'  => true,
        'rest_base'     => 'pwc_offer',
        'supports'      => [ 'title' ],
        'has_archive'   => false,
        'rewrite'       => false,
        'menu_icon'     => 'dashicons-tag',
        'menu_position' => 21,
    ] );
}
}
add_action( 'init', 'pwc_register_offer_cpt' );


// ── Logical value → candidate ACF field names ──────────────────────────────────
// First existing key on the post wins. Add/remove names to match your group.

if ( ! function_exists( 'pwc_offer_field_map' ) ) {
function pwc_offer_field_map() {
    // Exact field names, confirmed live via /active-offer-debug (offer #390).
    // Each is still an array so an alias can be added later without code changes.
    return [
        // Status
        'enabled'             => [ 'offer_enabled' ],
        'active'              => [ 'active_campaign' ],
        'variant'             => [ 'offer_variant' ],

        // Products (ACF Post Object — returns product ID)
        'special_product'     => [ 'special_competition_product' ],
        'weekly_product'      => [ 'weekly_competition_product' ],

        // Copy
        'eyebrow'             => [ 'eyebrow_text' ],
        'headline'            => [ 'main_headline' ],
        'highlight'           => [ 'offer_highlight' ],
        'subheadline'         => [ 'offer_subheadline' ],
        'body_copy'           => [ 'offer_body_copy' ],
        'discount_percentage' => [ 'discount_percentage' ],
        'cta_text'            => [ 'cta_text' ],
        'cta_link_type'       => [ 'cta_link_type' ],
        'custom_cta_url'      => [ 'custom_cta_url' ],

        // Design
        'primary_color'       => [ 'primary_offer_color' ],
        'secondary_color'     => [ 'secondary_offer_color' ],
        'background_color'    => [ 'background_color' ],
        'text_color'          => [ 'text_color' ],
        'background_image'    => [ 'background_image' ],

        // Benefits
        'benefit_1'           => [ 'benefit_1' ],
        'benefit_2'           => [ 'benefit_2' ],
        'benefit_3'           => [ 'benefit_3' ],
        'benefit_4'           => [ 'benefit_4' ],

        // Offer bar
        'bar_enabled'         => [ 'offer_bar_enabled' ],
        'bar_text'            => [ 'offer_bar_text' ],
        'bar_subtext'         => [ 'offer_bar_subtext' ],
        'timer_enabled'       => [ 'timer_enabled' ],
        'timer_end_date'      => [ 'timer_end_date' ],
        'bar_primary_color'   => [ 'offer_bar_primary_color' ],
        'bar_hover_color'     => [ 'offer_bar_hover_color' ],
    ];
}
}

if ( ! function_exists( 'pwc_pick' ) ) {
/**
 * Return the value of the first candidate field name that EXISTS on the post.
 * $fields is the associative array from get_fields($post_id). array_key_exists
 * (not isset / empty) so a real field holding false/'' is still respected and
 * we don't fall through to a stale alias.
 */
function pwc_pick( $fields, $logical_key ) {
    if ( ! is_array( $fields ) ) return null;
    $map = pwc_offer_field_map();
    $candidates = isset( $map[ $logical_key ] ) ? $map[ $logical_key ] : [ $logical_key ];
    foreach ( $candidates as $name ) {
        if ( array_key_exists( $name, $fields ) ) return $fields[ $name ];
    }
    return null;
}
}

if ( ! function_exists( 'pwc_pick_key' ) ) {
/** Return the actual field NAME (post-meta key) that matched, or the first candidate. */
function pwc_pick_key( $fields, $logical_key ) {
    $map = pwc_offer_field_map();
    $candidates = isset( $map[ $logical_key ] ) ? $map[ $logical_key ] : [ $logical_key ];
    if ( is_array( $fields ) ) {
        foreach ( $candidates as $name ) {
            if ( array_key_exists( $name, $fields ) ) return $name;
        }
    }
    return isset( $candidates[0] ) ? $candidates[0] : $logical_key;
}
}


// ── REST routes ─────────────────────────────────────────────────────────────────

add_action( 'rest_api_init', function () {
    register_rest_route( 'pwc/v1', '/ping', [
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => function () {
            return rest_ensure_response( [ 'status' => 'ok', 'time' => gmdate( 'c' ) ] );
        },
        'permission_callback' => '__return_true',
    ] );

    register_rest_route( 'pwc/v1', '/active-offer', [
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'pwc_rest_get_active_offer',
        'permission_callback' => '__return_true',
    ] );

    register_rest_route( 'pwc/v1', '/active-offer-debug', [
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'pwc_rest_active_offer_debug',
        'permission_callback' => '__return_true',
    ] );
} );


// ── Blank-page safety net ────────────────────────────────────────────────────────

if ( ! function_exists( 'pwc_offer_register_fatal_guard' ) ) {
/**
 * Guarantee the current REST request never ends as a blank page. If the request
 * completes normally, $GLOBALS[$flag] is set and this no-ops. If an UNCATCHABLE
 * fatal (memory / time limit) kills the request mid-callback, this fires at
 * shutdown and emits valid JSON with the error instead of blank output.
 */
function pwc_offer_register_fatal_guard( $flag ) {
    $GLOBALS[ $flag ] = false;
    register_shutdown_function( function () use ( $flag ) {
        if ( ! empty( $GLOBALS[ $flag ] ) ) return; // completed normally
        $err = error_get_last();
        $fatal_types = [ E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR ];
        if ( ! $err || ! in_array( $err['type'], $fatal_types, true ) ) return;
        if ( ! headers_sent() ) {
            status_header( 200 );
            header( 'Content-Type: application/json; charset=UTF-8' );
        }
        echo wp_json_encode( [
            'error'   => 'fatal_shutdown',
            'message' => $err['message'],
            'line'    => isset( $err['line'] ) ? $err['line'] : null,
        ] );
    } );
}
}


// ── Field value helpers ──────────────────────────────────────────────────────────

if ( ! function_exists( 'pwc_offer_image_url' ) ) {
function pwc_offer_image_url( $raw ) {
    if ( empty( $raw ) ) return null;
    if ( is_array( $raw ) ) {
        if ( ! empty( $raw['url'] ) ) return esc_url_raw( $raw['url'] );
        if ( ! empty( $raw['ID'] ) )  $raw = $raw['ID'];
        elseif ( ! empty( $raw['id'] ) ) $raw = $raw['id'];
        else return null;
    }
    if ( is_numeric( $raw ) ) {
        $url = wp_get_attachment_image_url( (int) $raw, 'large' );
        return $url ? esc_url_raw( $url ) : null;
    }
    if ( is_string( $raw ) && strpos( $raw, 'http' ) === 0 ) return esc_url_raw( $raw );
    return null;
}
}

if ( ! function_exists( 'pwc_offer_product' ) ) {
function pwc_offer_product( $raw ) {
    $id = null;
    if ( is_array( $raw ) ) {
        $first = reset( $raw );
        if ( is_object( $first ) && isset( $first->ID ) ) $id = (int) $first->ID;
        elseif ( is_numeric( $first ) )                   $id = (int) $first;
        elseif ( is_array( $first ) && isset( $first['ID'] ) ) $id = (int) $first['ID'];
    } elseif ( is_object( $raw ) && isset( $raw->ID ) ) {
        $id = (int) $raw->ID;
    } elseif ( is_numeric( $raw ) ) {
        $id = (int) $raw;
    }
    if ( ! $id ) return [ 'image' => null, 'url' => null ];

    $img       = get_the_post_thumbnail_url( $id, 'large' );
    $permalink = get_permalink( $id );
    return [
        'image' => $img ? esc_url_raw( $img ) : null,
        'url'   => ( $permalink && is_string( $permalink ) ) ? esc_url_raw( $permalink ) : null,
    ];
}
}

if ( ! function_exists( 'pwc_offer_iso_date' ) ) {
/**
 * Normalise ANY ACF date/date-time value to a UTC ISO 8601 string, or null.
 *
 * ACF returns dates in whatever "Return Format" the field is set to, so we must
 * tolerate every common shape:
 *   • Unix timestamp        1785631140            (10 or 13 digits)
 *   • ACF Date Picker       "20260731"            (Ymd, 8 digits — the usual default)
 *   • ACF Date/Time Picker  "2026-07-31 23:59:00" (Y-m-d H:i:s)
 *   • ISO with/without tz   "2026-07-31T23:59:00" / "...Z"
 *   • Display formats        "31/07/2026 11:59 pm", "31/07/2026"
 * Naive values (no timezone) are treated as UTC so every visitor sees the same
 * remaining time.
 */
function pwc_offer_iso_date( $raw ) {
    if ( $raw === null || $raw === false || $raw === '' ) return null;

    // Numeric: unix timestamp (10/13 digits) or Ymd (8 digits).
    if ( is_numeric( $raw ) ) {
        $s = (string) $raw;
        if ( strlen( $s ) === 8 ) {
            $ts = strtotime( substr( $s, 0, 4 ) . '-' . substr( $s, 4, 2 ) . '-' . substr( $s, 6, 2 ) . ' 00:00:00 UTC' );
            return ( $ts && $ts !== -1 ) ? gmdate( 'Y-m-d\TH:i:s\Z', $ts ) : null;
        }
        if ( strlen( $s ) === 13 ) return gmdate( 'Y-m-d\TH:i:s\Z', (int) round( ( (float) $s ) / 1000 ) );
        if ( strlen( $s ) >= 9 && strlen( $s ) <= 11 ) return gmdate( 'Y-m-d\TH:i:s\Z', (int) $s );
        // fall through for other numeric shapes handled as strings below
    }

    if ( ! is_string( $raw ) ) return null;
    $raw = trim( $raw );
    if ( $raw === '' ) return null;

    // Ymd as a string ("20260731").
    if ( preg_match( '/^\d{8}$/', $raw ) ) {
        $ts = strtotime( substr( $raw, 0, 4 ) . '-' . substr( $raw, 4, 2 ) . '-' . substr( $raw, 6, 2 ) . ' 00:00:00 UTC' );
        return ( $ts && $ts !== -1 ) ? gmdate( 'Y-m-d\TH:i:s\Z', $ts ) : null;
    }

    // strtotime handles Y-m-d H:i:s, ISO, "July 31 2026", etc. Treat naive as UTC.
    $has_tz = preg_match( '/[Zz]|[+\-]\d{2}:?\d{2}$/', $raw );
    $ts = strtotime( $has_tz ? $raw : $raw . ' UTC' );
    if ( $ts !== false && $ts !== -1 ) return gmdate( 'Y-m-d\TH:i:s\Z', $ts );

    // Day-first display formats strtotime can't reliably parse.
    if ( class_exists( 'DateTime' ) ) {
        $utc = new DateTimeZone( 'UTC' );
        foreach ( [ 'd/m/Y g:i a', 'd/m/Y g:i A', 'd/m/Y H:i', 'd/m/Y', 'd-m-Y H:i', 'd-m-Y', 'd.m.Y H:i', 'd.m.Y' ] as $fmt ) {
            $dt = DateTime::createFromFormat( $fmt, $raw, $utc );
            if ( $dt instanceof DateTime ) return $dt->format( 'Y-m-d\TH:i:s\Z' );
        }
    }

    return null;
}
}

if ( ! function_exists( 'pwc_offer_resolve_date' ) ) {
/**
 * Resolve a date field to ISO, preferring the ACF-formatted value but falling
 * back to the RAW stored post-meta. ACF persists dates in a canonical format
 * (Ymd or Y-m-d H:i:s) in post-meta regardless of the field's Return Format, so
 * the raw meta is the most reliable source when the formatted value won't parse.
 */
function pwc_offer_resolve_date( $formatted_value, $post_id, $meta_key ) {
    $iso = pwc_offer_iso_date( $formatted_value );
    if ( $iso ) return $iso;
    if ( $post_id && $meta_key ) {
        $meta = get_post_meta( (int) $post_id, $meta_key, true );
        $iso  = pwc_offer_iso_date( $meta );
        if ( $iso ) return $iso;
    }
    return null;
}
}

if ( ! function_exists( 'pwc_offer_str' ) ) {
function pwc_offer_str( $raw ) {
    if ( is_array( $raw ) || is_object( $raw ) ) return null;
    $s = is_string( $raw ) ? trim( $raw ) : ( is_numeric( $raw ) ? (string) $raw : '' );
    return $s !== '' ? $s : null;
}
}

if ( ! function_exists( 'pwc_offer_bool' ) ) {
function pwc_offer_bool( $raw ) {
    return ( $raw === true || $raw === 1 || $raw === '1' || $raw === 'yes' || $raw === 'true' );
}
}

if ( ! function_exists( 'pwc_offer_all_fields' ) ) {
/** Safe get_fields() — returns an associative array of every ACF value on the post. */
function pwc_offer_all_fields( $post_id ) {
    if ( ! function_exists( 'get_fields' ) ) return [];
    try {
        $f = get_fields( $post_id );
        return is_array( $f ) ? $f : [];
    } catch ( \Throwable $e ) {
        error_log( '[PWC Offer] get_fields(' . $post_id . ') failed: ' . $e->getMessage() );
        return [];
    }
}
}


// ── Find the active offer (shared by /active-offer and debug) ──────────────────

if ( ! function_exists( 'pwc_offer_find_active_id' ) ) {
/**
 * Return the ID of the first published pwc_offer whose enabled + active fields
 * are both true, or 0 if none. Populates &$scanned with per-post diagnostics.
 */
function pwc_offer_find_active_id( &$scanned = [] ) {
    $scanned = [];
    $query = new WP_Query( [
        'post_type'      => 'pwc_offer',
        'post_status'    => 'publish',
        'posts_per_page' => 20,
        'orderby'        => [ 'menu_order' => 'ASC', 'date' => 'DESC' ],
        'no_found_rows'  => true,
    ] );

    $active_id = 0;
    foreach ( $query->posts as $post ) {
        $fields    = pwc_offer_all_fields( $post->ID );
        $enabled   = pwc_offer_bool( pwc_pick( $fields, 'enabled' ) );
        $is_active = pwc_offer_bool( pwc_pick( $fields, 'active' ) );
        $scanned[] = [
            'id'      => $post->ID,
            'title'   => get_the_title( $post->ID ),
            'enabled' => $enabled,
            'active'  => $is_active,
        ];
        if ( ! $active_id && $enabled && $is_active ) {
            $active_id = $post->ID;
        }
    }
    return $active_id;
}
}


// ── /active-offer ────────────────────────────────────────────────────────────────

if ( ! function_exists( 'pwc_rest_get_active_offer' ) ) {
function pwc_rest_get_active_offer() {
    pwc_offer_register_fatal_guard( 'pwc_offer_active_done' );

    if ( function_exists( 'wp_raise_memory_limit' ) ) wp_raise_memory_limit( 'admin' );

    try {
        if ( ! function_exists( 'get_field' ) && ! function_exists( 'get_fields' ) ) {
            return rest_ensure_response( null ); // ACF not active
        }

        $active_id = pwc_offer_find_active_id();
        if ( ! $active_id ) {
            return rest_ensure_response( null ); // no active offer → hide UI
        }

        $id     = $active_id;
        $fields = pwc_offer_all_fields( $id );

        $special = pwc_offer_product( pwc_pick( $fields, 'special_product' ) );
        $weekly  = pwc_offer_product( pwc_pick( $fields, 'weekly_product' ) );

        $benefits = array_values( array_filter( array_map( 'pwc_offer_str', [
            pwc_pick( $fields, 'benefit_1' ),
            pwc_pick( $fields, 'benefit_2' ),
            pwc_pick( $fields, 'benefit_3' ),
            pwc_pick( $fields, 'benefit_4' ),
        ] ) ) );

        $discount_raw = pwc_pick( $fields, 'discount_percentage' );
        $discount     = ( $discount_raw !== '' && $discount_raw !== null && is_numeric( $discount_raw ) )
            ? (float) $discount_raw
            : null;

        $data = [
            'id'                    => (int) $id,
            'variant'               => pwc_offer_str( pwc_pick( $fields, 'variant' ) ),

            'special_product_image' => $special['image'],
            'special_product_url'   => $special['url'],
            'weekly_product_image'  => $weekly['image'],
            'weekly_product_url'    => $weekly['url'],

            'eyebrow'               => pwc_offer_str( pwc_pick( $fields, 'eyebrow' ) ),
            'headline'              => pwc_offer_str( pwc_pick( $fields, 'headline' ) ),
            'highlight'             => pwc_offer_str( pwc_pick( $fields, 'highlight' ) ),
            'subheadline'           => pwc_offer_str( pwc_pick( $fields, 'subheadline' ) ),
            'body_copy'             => pwc_offer_str( pwc_pick( $fields, 'body_copy' ) ),
            'discount_percentage'   => $discount,
            'cta_text'              => pwc_offer_str( pwc_pick( $fields, 'cta_text' ) ),
            'cta_link_type'         => pwc_offer_str( pwc_pick( $fields, 'cta_link_type' ) ),
            'custom_cta_url'        => pwc_offer_str( pwc_pick( $fields, 'custom_cta_url' ) ),

            'colors' => [
                'primary'    => pwc_offer_str( pwc_pick( $fields, 'primary_color' ) ),
                'secondary'  => pwc_offer_str( pwc_pick( $fields, 'secondary_color' ) ),
                'background' => pwc_offer_str( pwc_pick( $fields, 'background_color' ) ),
                'text'       => pwc_offer_str( pwc_pick( $fields, 'text_color' ) ),
            ],
            'background_image'      => pwc_offer_image_url( pwc_pick( $fields, 'background_image' ) ),

            'benefits'              => $benefits,

            'bar' => [
                'enabled'        => pwc_offer_bool( pwc_pick( $fields, 'bar_enabled' ) ),
                'text'           => pwc_offer_str( pwc_pick( $fields, 'bar_text' ) ),
                'subtext'        => pwc_offer_str( pwc_pick( $fields, 'bar_subtext' ) ),
                'timer_enabled'  => pwc_offer_bool( pwc_pick( $fields, 'timer_enabled' ) ),
                'timer_end_date' => pwc_offer_resolve_date(
                    pwc_pick( $fields, 'timer_end_date' ),
                    $id,
                    pwc_pick_key( $fields, 'timer_end_date' )
                ),
                'primary_color'  => pwc_offer_str( pwc_pick( $fields, 'bar_primary_color' ) ),
                'hover_color'    => pwc_offer_str( pwc_pick( $fields, 'bar_hover_color' ) ),
            ],
        ];

        return rest_ensure_response( $data );

    } catch ( \Throwable $e ) {
        error_log( '[PWC Offer] active-offer endpoint error: ' . $e->getMessage() );
        $response = ( defined( 'WP_DEBUG' ) && WP_DEBUG )
            ? [ 'error' => $e->getMessage(), 'file' => $e->getFile(), 'line' => $e->getLine() ]
            : null;
        return new WP_REST_Response( $response, 200 );
    } finally {
        $GLOBALS['pwc_offer_active_done'] = true;
    }
}
}


// ── /active-offer-debug ──────────────────────────────────────────────────────────

if ( ! function_exists( 'pwc_offer_debug_safe' ) ) {
/** Short, JSON-safe representation of any raw ACF value (never dumps huge objects). */
function pwc_offer_debug_safe( $v ) {
    if ( is_null( $v ) )   return null;
    if ( is_bool( $v ) )   return $v;
    if ( is_scalar( $v ) ) return $v;
    if ( is_object( $v ) ) {
        return [ '__type' => get_class( $v ), 'ID' => isset( $v->ID ) ? $v->ID : null ];
    }
    if ( is_array( $v ) ) {
        // Just keys + a peek at ID-ish members, to stay small.
        $out = [ '__array_keys' => array_keys( $v ) ];
        if ( isset( $v['ID'] ) )  $out['ID']  = $v['ID'];
        if ( isset( $v['url'] ) ) $out['url'] = $v['url'];
        return $out;
    }
    return gettype( $v );
}
}

if ( ! function_exists( 'pwc_rest_active_offer_debug' ) ) {
function pwc_rest_active_offer_debug() {
    pwc_offer_register_fatal_guard( 'pwc_offer_debug_done' );

    $out = [
        'acf_get_field_exists'  => function_exists( 'get_field' ),
        'acf_get_fields_exists' => function_exists( 'get_fields' ),
        'posts_exist'           => false,
        'posts_count'           => 0,
        'scanned'               => [],
        'first_offer_id'        => null,
        'active_offer_id'       => 0,
        'all_field_names'       => [],
        'values'                => [],
        'error'                 => null,
    ];

    try {
        $scanned   = [];
        $active_id = pwc_offer_find_active_id( $scanned );

        $out['scanned']      = $scanned;
        $out['posts_count']  = count( $scanned );
        $out['posts_exist']  = count( $scanned ) > 0;
        $out['first_offer_id'] = ! empty( $scanned ) ? $scanned[0]['id'] : null;
        $out['active_offer_id'] = $active_id;

        // Inspect the first offer (or the active one) in detail.
        $inspect_id = $active_id ?: ( ! empty( $scanned ) ? $scanned[0]['id'] : 0 );
        if ( $inspect_id ) {
            $fields = pwc_offer_all_fields( $inspect_id );
            $out['inspected_offer_id'] = $inspect_id;
            $out['all_field_names']    = is_array( $fields ) ? array_keys( $fields ) : [];

            // The specific values you asked for, resolved via the candidate map.
            $out['values'] = [
                'offer_enabled'               => pwc_offer_debug_safe( pwc_pick( $fields, 'enabled' ) ),
                'active_campaign'             => pwc_offer_debug_safe( pwc_pick( $fields, 'active' ) ),
                'offer_variant'               => pwc_offer_debug_safe( pwc_pick( $fields, 'variant' ) ),
                'special_competition_product' => pwc_offer_debug_safe( pwc_pick( $fields, 'special_product' ) ),
                'weekly_competition_product'  => pwc_offer_debug_safe( pwc_pick( $fields, 'weekly_product' ) ),
                'main_headline'               => pwc_offer_debug_safe( pwc_pick( $fields, 'headline' ) ),
                'eyebrow_text'                => pwc_offer_debug_safe( pwc_pick( $fields, 'eyebrow' ) ),
                'offer_highlight'             => pwc_offer_debug_safe( pwc_pick( $fields, 'highlight' ) ),
            ];

            // ── Timer diagnostics — the exact shapes ACF returns vs raw meta ──────
            $timer_key = pwc_pick_key( $fields, 'timer_end_date' );
            $out['timer'] = [
                'timer_enabled'          => pwc_offer_bool( pwc_pick( $fields, 'timer_enabled' ) ),
                'matched_field_name'     => $timer_key,
                'get_field_value'        => pwc_offer_debug_safe( pwc_pick( $fields, 'timer_end_date' ) ),
                'get_field_type'         => gettype( pwc_pick( $fields, 'timer_end_date' ) ),
                'raw_post_meta'          => pwc_offer_debug_safe( get_post_meta( $inspect_id, $timer_key, true ) ),
                'resolved_iso'           => pwc_offer_resolve_date( pwc_pick( $fields, 'timer_end_date' ), $inspect_id, $timer_key ),
            ];
        }
    } catch ( \Throwable $e ) {
        $out['error'] = $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine();
        error_log( '[PWC Offer] debug endpoint error: ' . $e->getMessage() );
    } finally {
        $GLOBALS['pwc_offer_debug_done'] = true;
    }

    return new WP_REST_Response( $out, 200 );
}
}
