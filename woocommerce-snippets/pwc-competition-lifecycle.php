<?php
/**
 * Plugin Name: PWC Competition Lifecycle
 * Description: Scheduled / Live / Competition Closed lifecycle for competition products.
 *              Owns the Go Live + Entries Close date fields, the automatic status
 *              transitions, the server-side purchase guard, and the timezone-safe
 *              deadline that the Next.js frontend counts down to.
 * Version:     1.0.0
 * Author:      Premium Watch Club
 *
 * INSTALLATION (Code Snippets plugin)
 * ───────────────────────────────────
 * 1. WordPress admin → Snippets → Add New.
 * 2. Title it "PWC Competition Lifecycle".
 * 3. Paste EVERYTHING BELOW the `if ( ! defined( 'ABSPATH' ) ) exit;` line
 *    (Code Snippets adds its own opening <?php).
 * 4. Set it to run "Everywhere", Save and Activate.
 *
 * (Or drop this whole file into wp-content/plugins/ and activate it as a plugin.)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE LIFECYCLE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   SCHEDULED  ──(go_live_date reached)──▶  LIVE
 *                                            │
 *                       (entries_close_date reached  OR  all tickets sold)
 *                                            ▼
 *                                   COMPETITION CLOSED
 *                                            │
 *                              (existing manual admin workflow)
 *                                            ▼
 *                                    TO PAST WINNERS
 *
 * "Coming Soon" is retired. A competition with a future Go Live Date is simply
 * SCHEDULED — a derived state, never a stored one.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * STORED competition_status VALUES
 * ─────────────────────────────────────────────────────────────────────────────
 *   'live'               → Live
 *   'competition_closed' → Competition Closed          (NEW — replaces 'sold_out')
 *   'closed'             → To Past Winners             (UNCHANGED — see warning)
 *
 * ⚠  The existing "To Past Winners" ACF option is stored as the slug 'closed'.
 *    26 archived products on this site use it. The new closed state therefore
 *    uses 'competition_closed' — never 'closed' — so archives are never touched.
 *
 * LEGACY values are read but never written:
 *   'sold_out'    → interpreted as Competition Closed
 *   'coming_soon' → interpreted via go_live_date (Scheduled, or Live if no date)
 *
 * No data migration is required. See pwc_cl_migrate_legacy_statuses() at the
 * bottom for an OPTIONAL, manually-run tidy-up.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TIMEZONE
 * ─────────────────────────────────────────────────────────────────────────────
 * Every date field is entered and compared in the WordPress site timezone
 * (wp_timezone() — Europe/London on this site). Values are converted to UTC
 * exactly once, here, and handed to the frontend as UTC ISO strings. The
 * frontend never guesses an offset, so BST/GMT changeovers are automatic.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * CONSTANTS
 * ═══════════════════════════════════════════════════════════════════════════ */

defined( 'PWC_CL_STATUS_KEY' )  || define( 'PWC_CL_STATUS_KEY',  'competition_status' );
defined( 'PWC_CL_GO_LIVE_KEY' ) || define( 'PWC_CL_GO_LIVE_KEY', 'go_live_date' );
defined( 'PWC_CL_CLOSE_KEY' )   || define( 'PWC_CL_CLOSE_KEY',   'entries_close_date' );
defined( 'PWC_CL_DRAW_KEY' )    || define( 'PWC_CL_DRAW_KEY',    'draw_date' );

// Stored slugs.
defined( 'PWC_CL_LIVE' )     || define( 'PWC_CL_LIVE',     'live' );
defined( 'PWC_CL_CLOSED' )   || define( 'PWC_CL_CLOSED',   'competition_closed' );
defined( 'PWC_CL_ARCHIVED' ) || define( 'PWC_CL_ARCHIVED', 'closed' ); // = To Past Winners

// Cron hooks.
defined( 'PWC_CL_TICK_HOOK' )    || define( 'PWC_CL_TICK_HOOK',    'pwc_cl_tick' );
defined( 'PWC_CL_GO_LIVE_HOOK' ) || define( 'PWC_CL_GO_LIVE_HOOK', 'pwc_cl_go_live_event' );
defined( 'PWC_CL_CLOSE_HOOK' )   || define( 'PWC_CL_CLOSE_HOOK',   'pwc_cl_close_event' );

/** Competition types recognised as competition products. */
function pwc_cl_types() {
	return array( 'weekly', 'monthly', 'special', 'free', 'starter' );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 1. FIELD READERS  (ACF first, raw post meta fallback)
 * ═══════════════════════════════════════════════════════════════════════════ */

function pwc_cl_meta( $product_id, $key ) {
	if ( function_exists( 'get_field' ) ) {
		$v = get_field( $key, $product_id );
		if ( null !== $v && '' !== $v && false !== $v ) {
			return $v;
		}
	}
	return get_post_meta( $product_id, $key, true );
}

/**
 * Parse ANY ACF date/date-time shape into a DateTimeImmutable in the SITE timezone.
 *
 * Tolerated shapes (ACF return-format dependent):
 *   1785631140              unix timestamp (10 or 13 digits)
 *   "20260907"              Date Picker, Ymd
 *   "2026-09-07 18:00:00"   Date/Time Picker, Y-m-d H:i:s   ← what this site stores
 *   "2026-09-07T18:00:00"   ISO, no timezone
 *   "2026-09-07T18:00:00Z"  ISO with timezone (respected as given)
 *   "07/09/2026 6:00 pm"    display format
 *
 * A value WITHOUT explicit timezone information is interpreted in the WordPress
 * site timezone — never the server's PHP timezone, never UTC.
 *
 * @return DateTimeImmutable|null
 */
function pwc_cl_parse_datetime( $raw ) {
	if ( null === $raw || false === $raw || '' === $raw ) {
		return null;
	}

	$tz = wp_timezone();

	// Unix timestamps are absolute — no timezone interpretation needed.
	if ( is_numeric( $raw ) ) {
		$s = (string) $raw;
		if ( 8 === strlen( $s ) ) {
			// Ymd — a date with no time. Midnight, site time.
			$raw = substr( $s, 0, 4 ) . '-' . substr( $s, 4, 2 ) . '-' . substr( $s, 6, 2 ) . ' 00:00:00';
		} elseif ( 13 === strlen( $s ) ) {
			return ( new DateTimeImmutable( '@' . (int) round( ( (float) $s ) / 1000 ) ) )->setTimezone( $tz );
		} elseif ( strlen( $s ) >= 9 && strlen( $s ) <= 11 ) {
			return ( new DateTimeImmutable( '@' . (int) $s ) )->setTimezone( $tz );
		}
	}

	if ( ! is_string( $raw ) ) {
		return null;
	}
	$raw = trim( $raw );
	if ( '' === $raw ) {
		return null;
	}

	// Ymd as a string.
	if ( preg_match( '/^\d{8}$/', $raw ) ) {
		$raw = substr( $raw, 0, 4 ) . '-' . substr( $raw, 4, 2 ) . '-' . substr( $raw, 6, 2 ) . ' 00:00:00';
	}

	// Explicit timezone present (trailing Z or ±HH:MM) — honour it as written.
	$has_tz = (bool) preg_match( '/(Z|[+-]\d{2}:?\d{2})$/', $raw );

	try {
		$dt = new DateTimeImmutable( $raw, $has_tz ? null : $tz );
	} catch ( Exception $e ) {
		// Last resort: d/m/Y display formats ACF can emit.
		foreach ( array( 'd/m/Y g:i a', 'd/m/Y H:i', 'd/m/Y', 'j F Y H:i', 'j F Y' ) as $fmt ) {
			$try = DateTimeImmutable::createFromFormat( '!' . $fmt, $raw, $tz );
			if ( $try ) {
				return $try;
			}
		}
		return null;
	}

	return $has_tz ? $dt->setTimezone( $tz ) : $dt;
}

/** Go Live moment, or null when the field is empty (legacy records). */
function pwc_cl_go_live_at( $product_id ) {
	return pwc_cl_parse_datetime( pwc_cl_meta( $product_id, PWC_CL_GO_LIVE_KEY ) );
}

/**
 * Entries Close moment.
 *
 * Legacy fallback: when entries_close_date is empty (records created before this
 * field existed) the draw_date is used, which is exactly how the site behaved
 * before. This is what keeps old competitions working unchanged.
 */
function pwc_cl_entries_close_at( $product_id ) {
	$dt = pwc_cl_parse_datetime( pwc_cl_meta( $product_id, PWC_CL_CLOSE_KEY ) );
	if ( $dt ) {
		return $dt;
	}
	return pwc_cl_parse_datetime( pwc_cl_meta( $product_id, PWC_CL_DRAW_KEY ) );
}

/** Draw moment — display only. NEVER gates ticket sales. */
function pwc_cl_draw_at( $product_id ) {
	return pwc_cl_parse_datetime( pwc_cl_meta( $product_id, PWC_CL_DRAW_KEY ) );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 2. STATUS NORMALISATION
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Fold any stored/legacy competition_status value into a canonical slug.
 *
 * @return string 'live' | 'competition_closed' | 'closed' | 'scheduled' | ''
 */
function pwc_cl_normalize_status( $raw ) {
	$s = strtolower( trim( (string) $raw ) );
	$s = str_replace( array( '-', ' ' ), '_', $s );

	if ( 'live' === $s ) {
		return PWC_CL_LIVE;
	}
	// 'closed' and 'to_past_winners' are BOTH the archive state on this site.
	if ( 'closed' === $s || 'to_past_winners' === $s ) {
		return PWC_CL_ARCHIVED;
	}
	if ( 'competition_closed' === $s || 'sold_out' === $s || 'soldout' === $s ) {
		return PWC_CL_CLOSED;
	}
	// Retired — read-only compatibility for the single remaining record.
	if ( 'coming_soon' === $s || 'coming' === $s || 'scheduled' === $s ) {
		return 'scheduled';
	}
	return '';
}

/**
 * Remaining ticket inventory.
 * PHP_INT_MAX means "unlimited" — no product, or WooCommerce stock tracking is
 * off (get_stock_quantity() returns null). Never treat that as sold out.
 */
function pwc_cl_tickets_left( $product ) {
	if ( ! $product || ! is_object( $product ) ) {
		return PHP_INT_MAX;
	}
	$stock = $product->get_stock_quantity();
	return ( null === $stock ) ? PHP_INT_MAX : max( 0, (int) $stock );
}

/**
 * THE resolver. Single source of truth for "what state is this competition in
 * right now", regardless of whether the scheduled status write has run yet.
 *
 * Priority order (documented in the header block):
 *   1. archived        — admin moved it to Past Winners
 *   2. entries close   — deadline reached (falls back to draw_date on legacy records)
 *   3. inventory       — every ticket sold
 *   4. manual close    — admin set Competition Closed
 *   5. scheduled       — Go Live is still in the future
 *   6. live
 *
 * Rules 2 and 3 sit ABOVE rule 4/5 on purpose:
 *   • an admin cannot reopen a competition whose deadline has passed;
 *   • "entries close before go live" resolves to closed, not live.
 *
 * @return string 'archived' | 'closed' | 'scheduled' | 'live'
 */
function pwc_cl_effective_status( $product_id, $now_ts = null ) {
	$now_ts = ( null === $now_ts ) ? time() : (int) $now_ts;

	$stored = pwc_cl_normalize_status( pwc_cl_meta( $product_id, PWC_CL_STATUS_KEY ) );

	// 1 — archived wins over everything. Never auto-changed.
	if ( PWC_CL_ARCHIVED === $stored ) {
		return 'archived';
	}

	// 2 — entries close deadline.
	$close_at = pwc_cl_entries_close_at( $product_id );
	if ( $close_at && $close_at->getTimestamp() <= $now_ts ) {
		return 'closed';
	}

	// 3 — inventory exhausted.
	$product = wc_get_product( $product_id );
	if ( $product && pwc_cl_tickets_left( $product ) <= 0 ) {
		return 'closed';
	}

	// 4 — admin set it closed manually (or a legacy 'sold_out' record).
	if ( PWC_CL_CLOSED === $stored ) {
		return 'closed';
	}

	// 5 — not yet at its Go Live moment.
	$go_live_at = pwc_cl_go_live_at( $product_id );
	if ( $go_live_at && $go_live_at->getTimestamp() > $now_ts ) {
		return 'scheduled';
	}

	// A legacy 'coming_soon' record with NO go-live date has nothing left to wait
	// for — it falls through to live, which the deadline/inventory rules above
	// have already had the chance to veto.
	return 'live';
}

/** True when tickets may be bought right now. */
function pwc_cl_is_purchasable_now( $product_id, $now_ts = null ) {
	return 'live' === pwc_cl_effective_status( $product_id, $now_ts );
}

/** Is this product a competition at all? Non-competition products are untouched. */
function pwc_cl_is_competition( $product_id ) {
	$type = strtolower( trim( (string) pwc_cl_meta( $product_id, 'competition_type' ) ) );
	return in_array( $type, pwc_cl_types(), true );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 3. ACF FIELDS — registered locally so no manual admin work is needed
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Adds "Go Live Date/Time" and "Entries Close Date/Time" to every product.
 *
 * Registered as an ACF LOCAL field group: it appears in the product editor
 * immediately, saves to the same post meta keys the REST API already exposes,
 * and needs no clicking in the ACF UI.
 *
 * If you would rather manage them in the ACF admin instead, delete this block
 * and create two Date/Time Picker fields named exactly `go_live_date` and
 * `entries_close_date` with return format `Y-m-d H:i:s`.
 */
add_action( 'acf/init', 'pwc_cl_register_fields' );
function pwc_cl_register_fields() {
	if ( ! function_exists( 'acf_add_local_field_group' ) ) {
		return;
	}

	$tz = wp_timezone_string();

	acf_add_local_field_group( array(
		'key'                   => 'group_pwc_competition_lifecycle',
		'title'                 => 'Competition Lifecycle',
		'menu_order'            => 0,
		'position'              => 'normal',
		'label_placement'       => 'top',
		'active'                => true,
		'description'           => sprintf(
			'All times are in the site timezone (%s). The Draw Date lives in the existing competition field group and is unaffected by these.',
			$tz
		),
		'location'              => array(
			array(
				array( 'param' => 'post_type', 'operator' => '==', 'value' => 'product' ),
			),
		),
		'fields'                => array(
			array(
				'key'           => 'field_pwc_cl_go_live_date',
				'label'         => 'Go Live Date/Time',
				'name'          => PWC_CL_GO_LIVE_KEY,
				'type'          => 'date_time_picker',
				'instructions'  => sprintf(
					'When this competition becomes Live and tickets go on sale (%s). Leave empty to go live immediately. Before this moment the competition is Scheduled: it is not shown as the active competition and tickets cannot be bought.',
					$tz
				),
				'display_format' => 'd/m/Y H:i',
				'return_format'  => 'Y-m-d H:i:s',
				'first_day'      => 1,
			),
			array(
				'key'           => 'field_pwc_cl_entries_close_date',
				'label'         => 'Entries Close Date/Time',
				'name'          => PWC_CL_CLOSE_KEY,
				'type'          => 'date_time_picker',
				'instructions'  => sprintf(
					'The ticket sales deadline (%s) — this is what the countdown counts down to. NOT the same as the Draw Date. At this moment the competition becomes Competition Closed even if tickets remain. Leave empty on legacy competitions and the Draw Date is used instead.',
					$tz
				),
				'display_format' => 'd/m/Y H:i',
				'return_format'  => 'Y-m-d H:i:s',
				'first_day'      => 1,
			),
		),
	) );
}

/**
 * Rewrite the competition_status choices without editing the field group by hand.
 *
 * Coming Soon and Sold Out are removed from the dropdown. A record that still
 * holds a legacy value keeps it visible (and selected) so nothing looks broken
 * or silently changes when an admin opens an old competition.
 */
add_filter( 'acf/load_field/name=' . PWC_CL_STATUS_KEY, 'pwc_cl_status_choices' );
function pwc_cl_status_choices( $field ) {
	if ( empty( $field['choices'] ) || ! is_array( $field['choices'] ) ) {
		return $field;
	}

	$choices = array(
		PWC_CL_LIVE     => 'Live',
		PWC_CL_CLOSED   => 'Competition Closed',
		PWC_CL_ARCHIVED => 'To Past Winners',
	);

	// Keep any legacy value that is actually selected on the post being edited,
	// so opening an old competition never shows an empty/invalid select.
	$post_id = 0;
	if ( isset( $_GET['post'] ) ) {
		$post_id = absint( $_GET['post'] );
	} elseif ( function_exists( 'get_the_ID' ) && get_the_ID() ) {
		$post_id = (int) get_the_ID();
	}
	if ( $post_id ) {
		$current = (string) get_post_meta( $post_id, PWC_CL_STATUS_KEY, true );
		if ( '' !== $current && ! isset( $choices[ $current ] ) ) {
			$legacy = array(
				'sold_out'    => 'Sold Out (legacy — reads as Competition Closed)',
				'coming_soon' => 'Coming Soon (retired — reads as Scheduled)',
			);
			$choices[ $current ] = isset( $legacy[ $current ] )
				? $legacy[ $current ]
				: $current . ' (legacy)';
		}
	}

	$field['choices']      = $choices;
	$field['instructions'] = 'Live → Competition Closed → To Past Winners. This value is kept in sync automatically: '
		. 'it flips to Live at the Go Live Date/Time, and to Competition Closed at the Entries Close Date/Time or '
		. 'when the last ticket sells. Moving a competition To Past Winners stays a manual decision.';

	return $field;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 4. STATUS SYNCHRONISATION  (stored value follows the effective state)
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Write the effective state back to the ACF field when they disagree.
 *
 * Only ever writes 'live' or 'competition_closed'. It never writes the archive
 * value and never demotes an archived competition — the To Past Winners
 * workflow stays entirely under manual control, exactly as it is today.
 * 'scheduled' is a derived state with no stored equivalent, so a scheduled
 * competition's stored value is left untouched until its Go Live moment.
 *
 * @return string|false the newly written slug, or false when nothing changed.
 */
function pwc_cl_sync_status( $product_id, $now_ts = null ) {
	$product_id = absint( $product_id );
	if ( ! $product_id || ! pwc_cl_is_competition( $product_id ) ) {
		return false;
	}

	$effective = pwc_cl_effective_status( $product_id, $now_ts );

	if ( 'archived' === $effective || 'scheduled' === $effective ) {
		return false; // nothing to write
	}

	$target = ( 'closed' === $effective ) ? PWC_CL_CLOSED : PWC_CL_LIVE;
	$stored = pwc_cl_normalize_status( pwc_cl_meta( $product_id, PWC_CL_STATUS_KEY ) );

	if ( $stored === $target ) {
		return false;
	}

	// Re-entrancy guard around the WRITE only. Updating the meta can make other
	// plugins re-save the product, which would land back here mid-write. It is
	// released immediately afterwards so a genuine second call later in the same
	// request (e.g. woocommerce_update_product firing before acf/save_post has
	// stored the new dates) still runs.
	static $writing = array();
	if ( isset( $writing[ $product_id ] ) ) {
		return false;
	}
	$writing[ $product_id ] = true;

	if ( function_exists( 'update_field' ) ) {
		update_field( PWC_CL_STATUS_KEY, $target, $product_id );
	} else {
		update_post_meta( $product_id, PWC_CL_STATUS_KEY, $target );
	}

	unset( $writing[ $product_id ] );

	error_log( sprintf(
		'[PWC lifecycle] #%d "%s" status %s → %s (effective=%s)',
		$product_id,
		get_the_title( $product_id ),
		$stored ? $stored : '(empty)',
		$target,
		$effective
	) );

	// The frontend caches WooCommerce responses for 60s (ISR); nudging the post
	// modified time keeps any downstream cache key honest.
	clean_post_cache( $product_id );

	return $target;
}

/** All published competition product IDs. */
function pwc_cl_competition_ids() {
	return get_posts( array(
		'post_type'        => 'product',
		'post_status'      => 'publish',
		'numberposts'      => -1,
		'fields'           => 'ids',
		'suppress_filters' => false,
		'meta_query'       => array(
			array( 'key' => 'competition_type', 'compare' => 'EXISTS' ),
		),
	) );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 5. SCHEDULING  (WP-Cron — no new dependency)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Three layers, because cron alone is not trustworthy on a low-traffic site:
 *
 *   a) exact single events at each competition's Go Live / Entries Close moment;
 *   b) a 5-minute sweep that repairs anything a missed event left behind;
 *   c) pwc_cl_effective_status(), which is computed live on every read — so the
 *      site behaves correctly even if cron never fires at all. (a) and (b) only
 *      keep the STORED value tidy; they are never load-bearing.
 * ═══════════════════════════════════════════════════════════════════════════ */

add_filter( 'cron_schedules', 'pwc_cl_cron_schedule' );
function pwc_cl_cron_schedule( $schedules ) {
	if ( ! isset( $schedules['pwc_cl_five_minutes'] ) ) {
		$schedules['pwc_cl_five_minutes'] = array(
			'interval' => 5 * MINUTE_IN_SECONDS,
			'display'  => __( 'Every 5 minutes (PWC competition lifecycle)', 'pwc' ),
		);
	}
	return $schedules;
}

// Self-registering: works when pasted into Code Snippets, where no activation
// hook ever fires. Cheap — wp_next_scheduled() is a single option read.
add_action( 'init', 'pwc_cl_ensure_cron' );
function pwc_cl_ensure_cron() {
	if ( ! wp_next_scheduled( PWC_CL_TICK_HOOK ) ) {
		wp_schedule_event( time() + 60, 'pwc_cl_five_minutes', PWC_CL_TICK_HOOK );
	}
}

/** The 5-minute repair sweep. */
add_action( PWC_CL_TICK_HOOK, 'pwc_cl_run_tick' );
function pwc_cl_run_tick() {
	foreach ( pwc_cl_competition_ids() as $id ) {
		pwc_cl_sync_status( $id );
		pwc_cl_schedule_transitions( $id ); // keep exact events fresh
	}
}

/** Exact single events fire these. */
add_action( PWC_CL_GO_LIVE_HOOK, 'pwc_cl_sync_status' );
add_action( PWC_CL_CLOSE_HOOK,   'pwc_cl_sync_status' );

/**
 * (Re)schedule the exact go-live / close events for one competition.
 * Called whenever the product is saved, and again by the 5-minute sweep.
 */
function pwc_cl_schedule_transitions( $product_id ) {
	$product_id = absint( $product_id );
	if ( ! $product_id || ! pwc_cl_is_competition( $product_id ) ) {
		return;
	}

	$args = array( $product_id );
	$now  = time();

	foreach ( array(
		PWC_CL_GO_LIVE_HOOK => pwc_cl_go_live_at( $product_id ),
		PWC_CL_CLOSE_HOOK   => pwc_cl_entries_close_at( $product_id ),
	) as $hook => $dt ) {

		$existing = wp_next_scheduled( $hook, $args );
		$wanted   = ( $dt && $dt->getTimestamp() > $now ) ? $dt->getTimestamp() : 0;

		if ( $existing === $wanted ) {
			continue; // already correct
		}
		if ( $existing ) {
			wp_unschedule_event( $existing, $hook, $args );
		}
		if ( $wanted ) {
			wp_schedule_single_event( $wanted, $hook, $args );
		}
	}
}

/**
 * Re-sync + re-schedule whenever a competition is saved.
 * acf/save_post at priority 20 runs AFTER ACF has written the new field values.
 */
add_action( 'acf/save_post', 'pwc_cl_on_save', 20 );
function pwc_cl_on_save( $post_id ) {
	$post_id = absint( $post_id );
	if ( ! $post_id || 'product' !== get_post_type( $post_id ) ) {
		return;
	}
	pwc_cl_schedule_transitions( $post_id );
	pwc_cl_sync_status( $post_id );
}

// Non-ACF saves (quick edit, REST, imports).
add_action( 'woocommerce_update_product', 'pwc_cl_on_save', 20 );

/**
 * Close the moment the last ticket is sold, without waiting for cron.
 * Covers both the stock-write path and the order-completion path.
 */
add_action( 'woocommerce_product_set_stock', 'pwc_cl_on_stock_change', 20 );
add_action( 'woocommerce_variation_set_stock', 'pwc_cl_on_stock_change', 20 );
function pwc_cl_on_stock_change( $product ) {
	if ( ! $product || ! is_object( $product ) ) {
		return;
	}
	$id = $product->is_type( 'variation' ) ? $product->get_parent_id() : $product->get_id();
	pwc_cl_sync_status( $id );
}

add_action( 'woocommerce_reduce_order_stock', 'pwc_cl_on_order_stock_reduced', 20 );
function pwc_cl_on_order_stock_reduced( $order ) {
	if ( ! $order || ! is_object( $order ) ) {
		return;
	}
	foreach ( $order->get_items() as $item ) {
		$pid = $item->get_product_id();
		if ( $pid ) {
			pwc_cl_sync_status( $pid );
		}
	}
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 6. SERVER-SIDE PURCHASE GUARD
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Defence in depth. A closed competition is rejected at EVERY entry point, so
 * a direct add-to-cart URL, a stale tab, a cached Live page, a hand-crafted
 * request and a cart built before the deadline are all handled identically.
 * The frontend's disabled buttons are a courtesy, never the control.
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Customer-facing reason, or '' when the competition is purchasable. */
function pwc_cl_block_reason( $product_id ) {
	if ( ! pwc_cl_is_competition( $product_id ) ) {
		return '';
	}
	switch ( pwc_cl_effective_status( $product_id ) ) {
		case 'archived':
			return sprintf(
				/* translators: %s: competition name. */
				__( '"%s" has finished and is no longer accepting entries.', 'pwc' ),
				get_the_title( $product_id )
			);
		case 'closed':
			return sprintf(
				/* translators: %s: competition name. */
				__( 'Entries for "%s" are closed.', 'pwc' ),
				get_the_title( $product_id )
			);
		case 'scheduled':
			return sprintf(
				/* translators: %s: competition name. */
				__( '"%s" has not opened for entries yet.', 'pwc' ),
				get_the_title( $product_id )
			);
	}
	return '';
}

/**
 * The broadest gate. Makes WooCommerce itself consider the product unbuyable,
 * which also covers the existing cart-handoff snippet (it already checks
 * is_purchasable()) and anything else that asks WooCommerce the question.
 */
add_filter( 'woocommerce_is_purchasable', 'pwc_cl_filter_is_purchasable', 20, 2 );
function pwc_cl_filter_is_purchasable( $purchasable, $product ) {
	if ( ! $purchasable || ! $product ) {
		return $purchasable;
	}
	$id = $product->is_type( 'variation' ) ? $product->get_parent_id() : $product->get_id();
	return pwc_cl_is_competition( $id ) ? pwc_cl_is_purchasable_now( $id ) : $purchasable;
}

/** Add to cart — covers ?add-to-cart= URLs and the Store API. */
add_filter( 'woocommerce_add_to_cart_validation', 'pwc_cl_validate_add_to_cart', 20, 3 );
function pwc_cl_validate_add_to_cart( $passed, $product_id, $quantity ) {
	if ( ! $passed ) {
		return $passed;
	}
	$reason = pwc_cl_block_reason( $product_id );
	if ( $reason ) {
		wc_add_notice( $reason, 'error' );
		return false;
	}
	return $passed;
}

/**
 * Cart re-validation. Runs on cart + checkout page loads, so a basket built at
 * 17:59 is emptied of the closed competition when it is revisited at 18:01.
 */
add_action( 'woocommerce_check_cart_items', 'pwc_cl_check_cart_items', 5 );
function pwc_cl_check_cart_items() {
	if ( ! WC()->cart ) {
		return;
	}
	$removed = false;
	foreach ( WC()->cart->get_cart() as $key => $cart_item ) {
		$reason = pwc_cl_block_reason( $cart_item['product_id'] );
		if ( $reason ) {
			WC()->cart->remove_cart_item( $key );
			wc_add_notice( $reason . ' ' . __( 'It has been removed from your basket.', 'pwc' ), 'error' );
			$removed = true;
		}
	}
	if ( $removed ) {
		WC()->cart->calculate_totals();
	}
}

/** Block Checkout (Store API) — surfaces the error in the block UI. */
add_action( 'woocommerce_store_api_cart_errors', 'pwc_cl_store_api_cart_errors', 10, 2 );
function pwc_cl_store_api_cart_errors( $errors, $cart ) {
	if ( ! $cart ) {
		return $errors;
	}
	foreach ( $cart->get_cart() as $cart_item ) {
		$reason = pwc_cl_block_reason( $cart_item['product_id'] );
		if ( $reason ) {
			if ( is_wp_error( $errors ) ) {
				$errors->add( 'pwc_competition_closed', $reason );
			}
		}
	}
	return $errors;
}

/** Classic checkout POST. */
add_action( 'woocommerce_checkout_process', 'pwc_cl_validate_checkout', 5 );
function pwc_cl_validate_checkout() {
	if ( ! WC()->cart ) {
		return;
	}
	foreach ( WC()->cart->get_cart() as $cart_item ) {
		$reason = pwc_cl_block_reason( $cart_item['product_id'] );
		if ( $reason ) {
			wc_add_notice( $reason, 'error' );
		}
	}
}

/**
 * FINAL BACKSTOP — order creation.
 *
 * This is the one that catches "user had checkout open exactly as the
 * competition closed". It runs on every order-placing path (classic checkout,
 * Block checkout, Store API) after all earlier validation, so an order for a
 * closed competition can never be written. Throwing here aborts the order.
 */
add_action( 'woocommerce_checkout_create_order', 'pwc_cl_guard_order_creation', 5, 2 );
function pwc_cl_guard_order_creation( $order, $data ) {
	if ( ! WC()->cart ) {
		return;
	}
	foreach ( WC()->cart->get_cart() as $cart_item ) {
		$reason = pwc_cl_block_reason( $cart_item['product_id'] );
		if ( $reason ) {
			throw new Exception( esc_html( $reason ) );
		}
	}
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 7. REST EXPOSURE — the timezone-safe payload the Next.js frontend reads
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Every datetime is converted from the site timezone to UTC exactly once, here.
 * The frontend counts down to entries_close_utc and never has to guess an offset,
 * so BST → GMT changeovers are handled without a code change.
 * ═══════════════════════════════════════════════════════════════════════════ */

function pwc_cl_utc_iso( $dt ) {
	return $dt ? $dt->setTimezone( new DateTimeZone( 'UTC' ) )->format( 'Y-m-d\TH:i:s\Z' ) : null;
}

function pwc_cl_display( $dt ) {
	// "7 September 2026, 18:00 BST" — site timezone, with its real abbreviation.
	return $dt ? $dt->format( 'j F Y, H:i T' ) : null;
}

function pwc_cl_payload( $product_id ) {
	$product   = wc_get_product( $product_id );
	$left      = pwc_cl_tickets_left( $product );
	$go_live   = pwc_cl_go_live_at( $product_id );
	$close     = pwc_cl_entries_close_at( $product_id );
	$draw      = pwc_cl_draw_at( $product_id );
	$raw_close = pwc_cl_parse_datetime( pwc_cl_meta( $product_id, PWC_CL_CLOSE_KEY ) );

	return array(
		'effective_status'    => pwc_cl_effective_status( $product_id ),
		'stored_status'       => pwc_cl_normalize_status( pwc_cl_meta( $product_id, PWC_CL_STATUS_KEY ) ),
		'go_live_utc'         => pwc_cl_utc_iso( $go_live ),
		'entries_close_utc'   => pwc_cl_utc_iso( $close ),
		'draw_utc'            => pwc_cl_utc_iso( $draw ),
		'go_live_display'     => pwc_cl_display( $go_live ),
		'entries_close_display' => pwc_cl_display( $close ),
		'draw_display'        => pwc_cl_display( $draw ),
		/** false when entries_close_date is empty and draw_date is standing in. */
		'entries_close_is_own_field' => (bool) $raw_close,
		'tickets_left'        => ( PHP_INT_MAX === $left ) ? null : $left,
		'timezone'            => wp_timezone_string(),
		'server_now_utc'      => gmdate( 'Y-m-d\TH:i:s\Z' ),
	);
}

/** WooCommerce REST v3 product responses. */
add_filter( 'woocommerce_rest_prepare_product_object', 'pwc_cl_rest_add_lifecycle', 10, 3 );
function pwc_cl_rest_add_lifecycle( $response, $product, $request ) {
	if ( ! $response || ! $product ) {
		return $response;
	}
	$id = $product->get_id();
	if ( pwc_cl_is_competition( $id ) ) {
		$response->data['pwc_lifecycle'] = pwc_cl_payload( $id );
	}
	return $response;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 8. ADMIN VALIDATION — guard rails, not handcuffs
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Warn (never block) on date combinations that are almost certainly mistakes.
 *
 * Deliberately a notice and not a hard validation error: legacy competitions
 * have missing/odd dates and must stay editable. The lifecycle resolver already
 * behaves sanely for every one of these cases.
 */
add_filter( 'acf/validate_value/name=' . PWC_CL_CLOSE_KEY, 'pwc_cl_validate_close_date', 10, 4 );
function pwc_cl_validate_close_date( $valid, $value, $field, $input ) {
	if ( true !== $valid || empty( $value ) ) {
		return $valid;
	}
	$close = pwc_cl_parse_datetime( $value );
	if ( ! $close ) {
		return $valid;
	}

	$go_live_raw = isset( $_POST['acf']['field_pwc_cl_go_live_date'] )
		? sanitize_text_field( wp_unslash( $_POST['acf']['field_pwc_cl_go_live_date'] ) )
		: '';
	if ( $go_live_raw ) {
		$go_live = pwc_cl_parse_datetime( $go_live_raw );
		if ( $go_live && $close->getTimestamp() <= $go_live->getTimestamp() ) {
			return __( 'Entries Close must be after Go Live — otherwise this competition closes before it opens.', 'pwc' );
		}
	}
	return $valid;
}

/** Admin notice when the Draw Date sits before the Entries Close Date. */
add_action( 'admin_notices', 'pwc_cl_admin_notices' );
function pwc_cl_admin_notices() {
	global $post;
	if ( ! $post || 'product' !== $post->post_type || ! pwc_cl_is_competition( $post->ID ) ) {
		return;
	}

	$close = pwc_cl_entries_close_at( $post->ID );
	$draw  = pwc_cl_draw_at( $post->ID );
	if ( $close && $draw && $draw->getTimestamp() < $close->getTimestamp() ) {
		printf(
			'<div class="notice notice-warning"><p><strong>%s</strong> %s</p></div>',
			esc_html__( 'Competition dates:', 'pwc' ),
			esc_html__( 'the Draw Date is earlier than the Entries Close Date. The draw normally happens after entries close. Ticket sales are unaffected — only the Entries Close Date controls those.', 'pwc' )
		);
	}

	$effective = pwc_cl_effective_status( $post->ID );
	$stored    = pwc_cl_normalize_status( pwc_cl_meta( $post->ID, PWC_CL_STATUS_KEY ) );
	if ( PWC_CL_LIVE === $stored && 'live' !== $effective ) {
		printf(
			'<div class="notice notice-info"><p><strong>%s</strong> %s</p></div>',
			esc_html__( 'Competition status:', 'pwc' ),
			esc_html( sprintf(
				/* translators: %s: effective lifecycle state. */
				__( 'this competition is set to Live but is currently %s, because of its dates or remaining tickets. The site shows the correct state to visitors either way.', 'pwc' ),
				$effective
			) )
		);
	}
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 9. OPTIONAL LEGACY TIDY-UP  — NOT run automatically
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * NOTHING needs migrating. Legacy values are read correctly everywhere:
 *   'sold_out'    → Competition Closed
 *   'coming_soon' → Scheduled (or Live once its Go Live moment passes)
 *   'closed'      → To Past Winners  (unchanged — 26 archived products)
 *
 * If you would rather have the stored values tidy, run this ONCE and then
 * remove/disable it. In Code Snippets: paste it as a separate snippet set to
 * "Run once". It only ever rewrites 'sold_out' → 'competition_closed' and
 * never touches 'closed', 'live', or any other value.
 *
 *     pwc_cl_migrate_legacy_statuses();          // dry run — logs only
 *     pwc_cl_migrate_legacy_statuses( true );    // actually write
 * ═══════════════════════════════════════════════════════════════════════════ */

function pwc_cl_migrate_legacy_statuses( $commit = false ) {
	$changed = array();

	foreach ( pwc_cl_competition_ids() as $id ) {
		$raw = (string) get_post_meta( $id, PWC_CL_STATUS_KEY, true );

		// ONLY 'sold_out' is rewritten. 'coming_soon' is intentionally left alone:
		// the right replacement depends on the Go Live Date the admin sets.
		if ( 'sold_out' !== strtolower( trim( $raw ) ) ) {
			continue;
		}

		$changed[] = sprintf( '#%d "%s": sold_out → %s', $id, get_the_title( $id ), PWC_CL_CLOSED );

		if ( $commit ) {
			if ( function_exists( 'update_field' ) ) {
				update_field( PWC_CL_STATUS_KEY, PWC_CL_CLOSED, $id );
			} else {
				update_post_meta( $id, PWC_CL_STATUS_KEY, PWC_CL_CLOSED );
			}
		}
	}

	error_log( sprintf(
		'[PWC lifecycle] legacy migration (%s): %d record(s)%s',
		$commit ? 'COMMITTED' : 'dry run',
		count( $changed ),
		$changed ? ' — ' . implode( '; ', $changed ) : ''
	) );

	return $changed;
}
