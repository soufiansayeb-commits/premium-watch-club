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
// Marks a Competition Closed that an admin picked by hand, as opposed to one the
// automatic sync wrote. Private meta (leading underscore) — not an ACF field.
defined( 'PWC_CL_MANUAL_CLOSE_KEY' ) || define( 'PWC_CL_MANUAL_CLOSE_KEY', '_pwc_cl_manual_close' );

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

	// 4 — an admin DELIBERATELY closed it early, while the dates and the stock
	// would still allow entries. Only a manual pick counts here.
	//
	// The auto-sync writes this same 'competition_closed' value whenever rules 2
	// or 3 fire, so without the marker an automatic close would be
	// indistinguishable from a deliberate one — and would then stay closed even
	// after the dates or the stock were fixed. That is the difference between a
	// status that reflects reality and one that traps you.
	if ( PWC_CL_CLOSED === $stored && pwc_cl_is_manual_close( $product_id ) ) {
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

/**
 * Was Competition Closed picked BY HAND in the dropdown, rather than written by
 * the automatic sync?
 *
 * Set only when an admin actually changes the status TO Competition Closed
 * (see pwc_cl_track_manual_close). Cleared the moment they change it away again,
 * and whenever the sync writes Live.
 *
 * Absent on legacy records — including the old 'sold_out' ones — which therefore
 * count as automatic. Their dates keep them closed anyway, and treating them as
 * automatic means a stale stored value can never override a competition whose
 * dates say it should be open.
 */
function pwc_cl_is_manual_close( $product_id ) {
	return (bool) get_post_meta( $product_id, PWC_CL_MANUAL_CLOSE_KEY, true );
}

/**
 * Is the automatic sync the one currently writing the status?
 *
 * update_field() runs its value through acf/update_value, which is the very
 * filter that records a manual close. Without this flag an automatic close
 * would be indistinguishable from an admin picking Competition Closed — it
 * would be marked manual and then stick forever, which is exactly the trap the
 * manual-close marker exists to prevent.
 *
 * Call with true/false to open and close the window; call with no argument to test it.
 */
function pwc_cl_syncing( $set = null ) {
	static $active = false;
	if ( null !== $set ) {
		$active = (bool) $set;
	}
	return $active;
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

	// Mark this write as automatic for the whole duration, so the acf/update_value
	// tracker below does not mistake it for an admin picking Competition Closed.
	pwc_cl_syncing( true );
	if ( function_exists( 'update_field' ) ) {
		update_field( PWC_CL_STATUS_KEY, $target, $product_id );
	} else {
		update_post_meta( $product_id, PWC_CL_STATUS_KEY, $target );
	}
	pwc_cl_syncing( false );

	// Reopening clears any manual-close marker: whatever an admin decided earlier
	// has been overtaken by the competition genuinely being open again.
	// Closing does NOT set the marker — this write is automatic by definition.
	if ( PWC_CL_LIVE === $target ) {
		delete_post_meta( $product_id, PWC_CL_MANUAL_CLOSE_KEY );
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

/**
 * Record whether Competition Closed was chosen BY HAND.
 *
 * Runs on acf/update_value, i.e. before the new value is written, so
 * get_post_meta() still returns the previous one and a real change can be told
 * apart from ACF simply resubmitting the existing value on an unrelated save.
 *
 * This is what makes the dropdown a genuine two-way switch:
 *   pick Competition Closed → marker set    → stays closed, even with dates open
 *   pick Live               → marker cleared → dates and stock decide again
 * An expired competition still cannot be reopened this way: rule 2 outranks it.
 */
add_filter( 'acf/update_value/name=' . PWC_CL_STATUS_KEY, 'pwc_cl_track_manual_close', 10, 3 );
function pwc_cl_track_manual_close( $value, $post_id, $field ) {
	$post_id = absint( $post_id );
	if ( ! $post_id ) {
		return $value;
	}

	// The automatic sync writes through update_field(), which lands here too.
	// Only a human picking a value in the dropdown counts as a manual close.
	if ( pwc_cl_syncing() ) {
		return $value;
	}

	$new = pwc_cl_normalize_status( $value );
	$old = pwc_cl_normalize_status( get_post_meta( $post_id, PWC_CL_STATUS_KEY, true ) );

	if ( $new !== $old ) {
		if ( PWC_CL_CLOSED === $new ) {
			update_post_meta( $post_id, PWC_CL_MANUAL_CLOSE_KEY, '1' );
		} else {
			delete_post_meta( $post_id, PWC_CL_MANUAL_CLOSE_KEY );
		}
	}

	return $value;
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
		/** true only when an admin picked Competition Closed by hand. */
		'manual_close'        => pwc_cl_is_manual_close( $product_id ),
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

/**
 * Explain the effective status in one sentence, naming the SPECIFIC rule that
 * decided it and the exact moment involved.
 *
 * The resolver deliberately lets the dates and the inventory override the ACF
 * dropdown (so a competition past its deadline can never be reopened by
 * flipping a select). The cost is that an admin can set the status to Live and
 * see nothing happen. This is what removes that guesswork — both the products
 * list column and the edit-screen notice use it.
 *
 * `reason` is the full sentence (edit screen, and the column's hover title).
 * `short`  is a few words that fit a cramped products-list column.
 *
 * @return array{label:string, reason:string, short:string, tone:string}
 */
function pwc_cl_status_explanation( $product_id ) {
	$effective = pwc_cl_effective_status( $product_id );
	$fmt       = 'j M Y H:i';
	$short_fmt = 'j M H:i';   // compact form for the products-list column
	$tz        = wp_timezone_string();
	$product   = wc_get_product( $product_id );
	$left      = pwc_cl_tickets_left( $product );
	$close     = pwc_cl_entries_close_at( $product_id );
	$go_live   = pwc_cl_go_live_at( $product_id );
	$now       = time();

	if ( 'archived' === $effective ) {
		return array(
			'label'  => __( 'Past Winners', 'pwc' ),
			'reason' => __( 'Archived by an admin. Nothing changes this automatically.', 'pwc' ),
			'short'  => __( 'archived', 'pwc' ),
			'tone'   => 'muted',
		);
	}

	if ( 'scheduled' === $effective ) {
		return array(
			'label'  => __( 'Scheduled', 'pwc' ),
			'reason' => sprintf(
				/* translators: 1: date/time, 2: timezone name. */
				__( 'Goes live automatically at %1$s (%2$s). Until then it is hidden from the site and tickets cannot be bought.', 'pwc' ),
				$go_live ? $go_live->format( $fmt ) : '?',
				$tz
			),
			'short'  => $go_live
				/* translators: %s: short date/time. */
				? sprintf( __( 'opens %s', 'pwc' ), $go_live->format( $short_fmt ) )
				: __( 'not yet open', 'pwc' ),
			'tone'   => 'scheduled',
		);
	}

	if ( 'closed' === $effective ) {
		// Name the rule that actually fired, in resolver priority order.
		if ( $close && $close->getTimestamp() <= $now ) {
			$reason = sprintf(
				/* translators: 1: date/time, 2: timezone name. */
				__( 'Entries closed at %1$s (%2$s). To reopen, set the Entries Close Date/Time to a moment in the future.', 'pwc' ),
				$close->format( $fmt ),
				$tz
			);
			/* translators: %s: short date/time. */
			$short = sprintf( __( 'closed %s', 'pwc' ), $close->format( $short_fmt ) );
		} elseif ( $left <= 0 ) {
			$reason = __( 'Every ticket has been sold. To reopen, add stock in Product data → Inventory.', 'pwc' );
			$short  = __( 'sold out', 'pwc' );
		} else {
			$reason = __( 'Closed by hand. Set Competition Status back to Live to reopen it — the dates and stock already allow entries.', 'pwc' );
			$short  = __( 'closed by hand', 'pwc' );
		}
		return array( 'label' => __( 'Closed', 'pwc' ), 'reason' => $reason, 'short' => $short, 'tone' => 'closed' );
	}

	return array(
		'label'  => __( 'Live', 'pwc' ),
		'reason' => $close
			? sprintf(
				/* translators: 1: date/time, 2: timezone name. */
				__( 'Entries close at %1$s (%2$s).', 'pwc' ),
				$close->format( $fmt ),
				$tz
			)
			: __( 'No Entries Close Date/Time set — this competition has no deadline.', 'pwc' ),
		'short'  => $close
			/* translators: %s: short date/time. */
			? sprintf( __( 'closes %s', 'pwc' ), $close->format( $short_fmt ) )
			: __( 'no deadline', 'pwc' ),
		'tone'   => 'live',
	);
}

/* ── Products list: "Competition" status column ─────────────────────────────
 * So you can see at a glance which competition is actually live, without
 * opening each one. Two products sharing a name (a new and an old "Rolex
 * Datejust 41", say) are otherwise very easy to mix up.
 * ────────────────────────────────────────────────────────────────────────── */

add_filter( 'manage_edit-product_columns', 'pwc_cl_add_status_column', 20 );
function pwc_cl_add_status_column( $columns ) {
	$out = array();
	foreach ( $columns as $key => $label ) {
		$out[ $key ] = $label;
		// Sit directly after the stock column, where the eye already is.
		if ( 'is_in_stock' === $key ) {
			$out['pwc_lifecycle'] = __( 'Competition', 'pwc' );
		}
	}
	if ( ! isset( $out['pwc_lifecycle'] ) ) {
		$out['pwc_lifecycle'] = __( 'Competition', 'pwc' );
	}
	return $out;
}

add_action( 'manage_product_posts_custom_column', 'pwc_cl_render_status_column', 20, 2 );
function pwc_cl_render_status_column( $column, $post_id ) {
	if ( 'pwc_lifecycle' !== $column ) {
		return;
	}
	if ( ! pwc_cl_is_competition( $post_id ) ) {
		echo '<span style="color:#a7aaad">—</span>';
		return;
	}

	$info   = pwc_cl_status_explanation( $post_id );
	$colors = array(
		'live'      => '#00844a',
		'scheduled' => '#8a6d1f',
		'closed'    => '#b32d2e',
		'muted'     => '#787c82',
	);
	$color = isset( $colors[ $info['tone'] ] ) ? $colors[ $info['tone'] ] : '#787c82';

	// Only a few words here — the products list already carries a lot of columns
	// and a long sentence squeezes the whole table. The full explanation rides
	// along as the hover title, and is spelled out on the edit screen.
	printf(
		'<span class="pwc-cl-cell" title="%1$s"><strong style="color:%2$s">%3$s</strong><br><span class="pwc-cl-sub">%4$s</span></span>',
		esc_attr( $info['reason'] ),
		esc_attr( $color ),
		esc_html( strtoupper( $info['label'] ) ),
		esc_html( $info['short'] )
	);
}

/**
 * Keep the column readable.
 *
 * WordPress list tables share the available width between every registered
 * column, and this install has a lot of them (Yoast, brands, and more). Without
 * an explicit width the Competition column collapses to roughly one character
 * and both the heading and the cells wrap vertically, one letter per line.
 */
add_action( 'admin_head-edit.php', 'pwc_cl_status_column_styles' );
function pwc_cl_status_column_styles() {
	$screen = get_current_screen();
	if ( ! $screen || 'product' !== $screen->post_type ) {
		return;
	}
	?>
	<style>
	.wp-list-table .column-pwc_lifecycle {
		width: 132px;
		white-space: normal;
		word-break: keep-all;
		overflow-wrap: normal;
	}
	.wp-list-table .pwc-cl-cell { display: block; line-height: 1.35; }
	.wp-list-table .pwc-cl-cell strong { font-size: 11px; letter-spacing: .04em; white-space: nowrap; }
	.wp-list-table .pwc-cl-sub { color: #646970; font-size: 11px; white-space: nowrap; }
	@media screen and (max-width: 1400px) {
		/* Very cramped screens: keep the status word, drop the detail line —
		   it is still available on hover and on the edit screen. */
		.wp-list-table .column-pwc_lifecycle { width: 88px; }
		.wp-list-table .pwc-cl-sub { display: none; }
	}
	</style>
	<?php
}

/* ── Edit screen notices ───────────────────────────────────────────────────── */

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

	// Always state the effective status, and why. This is the single most useful
	// thing on the screen when a competition is "not doing what I told it to".
	$info   = pwc_cl_status_explanation( $post->ID );
	$stored = pwc_cl_normalize_status( pwc_cl_meta( $post->ID, PWC_CL_STATUS_KEY ) );
	$class  = ( 'live' === $info['tone'] ) ? 'notice-success' : 'notice-info';

	$mismatch = '';
	if ( PWC_CL_LIVE === $stored && 'live' !== $info['tone'] ) {
		$mismatch = ' ' . __( 'The Competition Status is set to Live, but the dates and remaining tickets take priority — that is deliberate, so a finished competition can never be reopened by changing the dropdown alone.', 'pwc' );
	}

	printf(
		'<div class="notice %1$s"><p><strong>%2$s %3$s</strong> — %4$s%5$s</p></div>',
		esc_attr( $class ),
		esc_html__( 'This competition is currently:', 'pwc' ),
		esc_html( strtoupper( $info['label'] ) ),
		esc_html( $info['reason'] ),
		esc_html( $mismatch )
	);
}

/* ── Timezone helper under each date field ──────────────────────────────────
 * Every competition datetime is entered and stored in the WordPress site
 * timezone (Europe/London — the market these competitions are sold to). An
 * admin working from another country is otherwise silently an hour or more out
 * on every field they fill in.
 *
 * This adds a live hint under each date field showing the same moment in the
 * admin's OWN browser timezone, plus how far away it is. Display only: it never
 * touches the stored value, the frontend, or what customers see.
 * ────────────────────────────────────────────────────────────────────────── */

add_action( 'admin_footer-post.php',     'pwc_cl_datetime_hint_script' );
add_action( 'admin_footer-post-new.php', 'pwc_cl_datetime_hint_script' );
function pwc_cl_datetime_hint_script() {
	global $post;
	if ( ! $post || 'product' !== $post->post_type ) {
		return;
	}
	$site_tz = wp_timezone_string();
	?>
	<script>
	(function () {
		'use strict';

		var SITE_TZ = <?php echo wp_json_encode( $site_tz ); ?>;
		var FIELDS  = [<?php echo wp_json_encode( PWC_CL_GO_LIVE_KEY ) . ',' . wp_json_encode( PWC_CL_CLOSE_KEY ); ?>];

		/** Offset (ms) of `tz` from UTC at the given instant. */
		function tzOffsetMs(utcMs, tz) {
			var dtf = new Intl.DateTimeFormat('en-US', {
				timeZone: tz, hour12: false,
				year: 'numeric', month: '2-digit', day: '2-digit',
				hour: '2-digit', minute: '2-digit', second: '2-digit'
			});
			var p = {};
			dtf.formatToParts(new Date(utcMs)).forEach(function (x) { p[x.type] = x.value; });
			var asUTC = Date.UTC(p.year, p.month - 1, p.day,
				p.hour === '24' ? 0 : p.hour, p.minute, p.second);
			return asUTC - utcMs;
		}

		/**
		 * Turn a wall-clock string ("2026-08-30 18:59:00") READ IN `tz` into a real
		 * instant. Iterates because the offset itself depends on the instant — which
		 * is what makes DST boundaries work without a hardcoded +1.
		 */
		function wallTimeToDate(wall, tz) {
			var naive = Date.parse(String(wall).replace(' ', 'T') + 'Z');
			if (isNaN(naive)) return null;
			var ms = naive;
			for (var i = 0; i < 3; i++) {
				var next = naive - tzOffsetMs(ms, tz);
				if (next === ms) break;
				ms = next;
			}
			return new Date(ms);
		}

		function fmt(date, tz) {
			try {
				return new Intl.DateTimeFormat(undefined, {
					timeZone: tz, day: '2-digit', month: 'short', year: 'numeric',
					hour: '2-digit', minute: '2-digit', hour12: false
				}).format(date);
			} catch (e) { return date.toISOString(); }
		}

		function relative(date) {
			var diff = date.getTime() - Date.now();
			var past = diff < 0;
			var mins = Math.round(Math.abs(diff) / 60000);
			var txt;
			if (mins < 1)        txt = 'less than a minute';
			else if (mins < 60)  txt = mins + ' min';
			else if (mins < 1440) txt = Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm';
			else                 txt = Math.floor(mins / 1440) + 'd ' + Math.floor((mins % 1440) / 60) + 'h';
			return past ? (txt + ' ago') : ('in ' + txt);
		}

		function update(field) {
			var hidden = field.querySelector('input[type="hidden"]');
			var hint   = field.querySelector('.pwc-tz-hint');
			if (!hint) return;

			var raw = hidden ? hidden.value : '';
			if (!raw) {
				hint.innerHTML = '<em>Empty.</em> ' + (field.getAttribute('data-name') === FIELDS[0]
					? 'This competition goes live immediately.'
					: 'The Draw Date will be used as the deadline instead.');
				hint.style.color = '#787c82';
				return;
			}

			var date = wallTimeToDate(raw, SITE_TZ);
			if (!date) { hint.textContent = ''; return; }

			var localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
			var parts = [fmt(date, SITE_TZ) + ' · ' + SITE_TZ + ' (what you typed)'];
			if (localTz && localTz !== SITE_TZ) {
				parts.push('<strong>' + fmt(date, localTz) + ' · ' + localTz + ' (your clock)</strong>');
			}
			parts.push(relative(date));
			hint.innerHTML = parts.join(' &nbsp;|&nbsp; ');
			hint.style.color = (date.getTime() < Date.now()) ? '#b32d2e' : '#2271b1';
		}

		function init() {
			FIELDS.forEach(function (name) {
				var field = document.querySelector('.acf-field[data-name="' + name + '"]');
				if (!field || field.querySelector('.pwc-tz-hint')) return;

				var hint = document.createElement('p');
				hint.className = 'pwc-tz-hint';
				hint.style.cssText = 'margin:6px 0 0;font-size:12px;line-height:1.5;';
				(field.querySelector('.acf-input') || field).appendChild(hint);

				update(field);
				// ACF writes the hidden input via its datepicker, so poll rather than
				// relying on a change event it may not fire.
				setInterval(function () { update(field); }, 1000);
			});
		}

		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', init);
		} else {
			init();
		}
		// ACF can render fields late (tabs, metabox reordering).
		setTimeout(init, 1200);
	})();
	</script>
	<?php
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
			// Renaming a legacy value is not an admin closing anything, so this
			// must not leave a manual-close marker behind.
			pwc_cl_syncing( true );
			if ( function_exists( 'update_field' ) ) {
				update_field( PWC_CL_STATUS_KEY, PWC_CL_CLOSED, $id );
			} else {
				update_post_meta( $id, PWC_CL_STATUS_KEY, PWC_CL_CLOSED );
			}
			pwc_cl_syncing( false );
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
