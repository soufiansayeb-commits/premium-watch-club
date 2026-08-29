<?php
/**
 * Plugin Name: PWC Competition Entries Export
 * Description: WooCommerce → Competition Entries. A read-only admin tool that
 *              exports a RandomDraws-compatible CSV of ticket entries for one
 *              selected competition product. Line-item based, HPOS-compatible.
 * Version:     1.0.0 (Phase 1)
 * Author:      Premium Watch Club
 *
 * INSTALLATION (Code Snippets plugin)
 * ───────────────────────────────────
 * 1. WordPress admin → Snippets → Add New.
 * 2. Title it "PWC Competition Entries Export".
 * 3. Paste EVERYTHING BELOW the `if ( ! defined( 'ABSPATH' ) ) exit;` line
 *    (Code Snippets adds its own opening <?php).
 * 4. Set it to run in the admin area (or "Everywhere"), Save and Activate.
 *
 * (Or drop this whole file into wp-content/plugins/ and activate it as a plugin.)
 *
 * WHAT IT DOES
 * ────────────
 * WooCommerce → Competition Entries lets an admin:
 *   • pick one competition product (populated from products carrying the
 *     `competition_type` meta — no hardcoded IDs / slugs / names);
 *   • pick eligible order statuses (default Processing + Completed);
 *   • set an exact cutoff date + time (interpreted in the WordPress timezone);
 *   • Preview counts (read-only);
 *   • Export a CSV of `Entry Number, Name, Country`.
 *
 * ENTRY RULE
 *   The visible WooCommerce order number ($order->get_order_number()) IS the
 *   entry number. It is repeated once per valid ticket in the SELECTED
 *   competition's line item only — never the whole-order quantity. Repeated
 *   order numbers are intentional and are never treated as duplicates.
 *
 * ELIGIBILITY
 *   status ∈ selected statuses  AND  $order->is_paid()  AND
 *   $order->get_date_paid() is set  AND  date_paid ≤ cutoff.
 *   Orders that are an eligible status but unpaid, or paid with no timestamp,
 *   are EXCLUDED and surfaced in the preview counts.
 *
 * SAFETY
 *   100% read-only. Never writes to orders, order items, products, ACF values,
 *   customer records or payment data. No numbering system, no backfill.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Guarded define()s (not `const`) so this is safe under the Code Snippets plugin
// regardless of how it scopes the code, and safe to reload.
defined( 'PWC_CE_PAGE_SLUG' )      || define( 'PWC_CE_PAGE_SLUG', 'pwc-competition-entries' );
defined( 'PWC_CE_NONCE_ACTION' )   || define( 'PWC_CE_NONCE_ACTION', 'pwc_ce_action' );
defined( 'PWC_CE_BATCH_SIZE' )     || define( 'PWC_CE_BATCH_SIZE', 100 ); // orders scanned per page
defined( 'PWC_CE_DEFAULT_STATUS' ) || define( 'PWC_CE_DEFAULT_STATUS', array( 'wc-processing', 'wc-completed' ) );

/* ───────────────────────────────────────────────────────────────────────────
 * Admin menu — WooCommerce → Competition Entries
 * ─────────────────────────────────────────────────────────────────────────── */
add_action( 'admin_menu', function () {
	add_submenu_page(
		'woocommerce',
		__( 'Competition Entries', 'pwc' ),
		__( 'Competition Entries', 'pwc' ),
		'manage_woocommerce',
		PWC_CE_PAGE_SLUG,
		'pwc_ce_render_page'
	);
} );

/* ───────────────────────────────────────────────────────────────────────────
 * Export handler — runs early (admin_init) so we can stream a download before
 * WordPress emits any admin HTML/headers. Read-only.
 * ─────────────────────────────────────────────────────────────────────────── */
add_action( 'admin_init', 'pwc_ce_maybe_export' );
function pwc_ce_maybe_export() {
	if ( empty( $_POST['pwc_ce_export'] ) ) {
		return;
	}
	if ( ! isset( $_GET['page'] ) || sanitize_key( wp_unslash( $_GET['page'] ) ) !== PWC_CE_PAGE_SLUG ) {
		return;
	}
	if ( ! current_user_can( 'manage_woocommerce' ) ) {
		wp_die( esc_html__( 'You do not have permission to export competition entries.', 'pwc' ) );
	}
	check_admin_referer( PWC_CE_NONCE_ACTION );

	$req = pwc_ce_parse_request();
	if ( ! empty( $req['errors'] ) ) {
		wp_die(
			esc_html( implode( ' ', $req['errors'] ) ) .
			'<p><a href="javascript:history.back()">' . esc_html__( '← Go back', 'pwc' ) . '</a></p>'
		);
	}

	$data = pwc_ce_collect( $req['product_id'], $req['statuses'], $req['cutoff_ts'], true );

	// Hard integrity gate: generated rows must equal the counted valid entries.
	// (Repeated order numbers are expected and are NOT duplicates.)
	if ( count( $data['rows'] ) !== (int) $data['total_valid_entries'] ) {
		wp_die(
			esc_html__( 'Export blocked: generated row count does not match the counted valid-entry total. No file was produced.', 'pwc' ) .
			'<p><a href="javascript:history.back()">' . esc_html__( '← Go back', 'pwc' ) . '</a></p>'
		);
	}

	$product  = wc_get_product( $req['product_id'] );
	$slug     = sanitize_title( $product ? $product->get_name() : 'competition' );
	$filename = 'pwc-entries-' . $slug . '-' . gmdate( 'Ymd-His' ) . '.csv';

	nocache_headers();
	header( 'Content-Type: text/csv; charset=utf-8' );
	header( 'Content-Disposition: attachment; filename="' . $filename . '"' );

	$out = fopen( 'php://output', 'w' );
	echo "\xEF\xBB\xBF"; // UTF-8 BOM so Excel reads accents/codes correctly.
	fputcsv( $out, array( 'Entry Number', 'Name', 'Country' ) );
	foreach ( $data['rows'] as $row ) {
		fputcsv( $out, $row );
	}
	fclose( $out );
	exit;
}

/* ───────────────────────────────────────────────────────────────────────────
 * Competition products — any published product carrying a competition_type
 * meta of weekly/monthly/special/free. No hardcoded IDs / slugs / names.
 * (Products are a CPT, not order data — safe to query with get_posts.)
 * ─────────────────────────────────────────────────────────────────────────── */
function pwc_ce_meta( $product_id, $key ) {
	if ( function_exists( 'get_field' ) ) {
		$v = get_field( $key, $product_id );
		if ( null !== $v && '' !== $v ) {
			return $v;
		}
	}
	return get_post_meta( $product_id, $key, true );
}

function pwc_ce_get_competitions() {
	$ids = get_posts( array(
		'post_type'   => 'product',
		'post_status' => 'publish',
		'numberposts' => -1,
		'fields'      => 'ids',
		'orderby'     => 'title',
		'order'       => 'ASC',
		'meta_query'  => array( array( 'key' => 'competition_type', 'compare' => 'EXISTS' ) ),
	) );

	$competitions = array();
	foreach ( $ids as $id ) {
		$type = strtolower( trim( (string) pwc_ce_meta( $id, 'competition_type' ) ) );
		if ( ! in_array( $type, array( 'weekly', 'monthly', 'special', 'free' ), true ) ) {
			continue;
		}
		$product = wc_get_product( $id );
		if ( ! $product ) {
			continue;
		}
		$competitions[] = array(
			'id'     => (int) $id,
			'name'   => $product->get_name(),
			'type'   => $type,
			'number' => trim( (string) pwc_ce_meta( $id, 'competition_number' ) ),
			'status' => trim( (string) pwc_ce_meta( $id, 'competition_status' ) ),
		);
	}
	return $competitions;
}

/* ───────────────────────────────────────────────────────────────────────────
 * Parse + sanitise the submitted request (shared by preview and export).
 * ─────────────────────────────────────────────────────────────────────────── */
function pwc_ce_parse_request() {
	$errors = array();

	// Competition product — must be a real competition product.
	$product_id = isset( $_POST['pwc_ce_product'] ) ? absint( wp_unslash( $_POST['pwc_ce_product'] ) ) : 0;
	$is_comp    = false;
	if ( $product_id > 0 ) {
		$type    = strtolower( trim( (string) pwc_ce_meta( $product_id, 'competition_type' ) ) );
		$is_comp = in_array( $type, array( 'weekly', 'monthly', 'special', 'free' ), true );
	}
	if ( ! $is_comp ) {
		$errors[] = __( 'Please select a valid competition product.', 'pwc' );
	}

	// Statuses — intersect with the real WooCommerce status keys.
	$valid_statuses = array_keys( wc_get_order_statuses() );
	$statuses       = array();
	if ( isset( $_POST['pwc_ce_statuses'] ) && is_array( $_POST['pwc_ce_statuses'] ) ) {
		$submitted = array_map( 'sanitize_text_field', wp_unslash( $_POST['pwc_ce_statuses'] ) );
		$statuses  = array_values( array_intersect( $submitted, $valid_statuses ) );
	}
	if ( empty( $statuses ) ) {
		$errors[] = __( 'Please select at least one order status.', 'pwc' );
	}

	// Cutoff date + time in the WordPress timezone (never the browser's).
	$date = isset( $_POST['pwc_ce_cutoff_date'] ) ? sanitize_text_field( wp_unslash( $_POST['pwc_ce_cutoff_date'] ) ) : '';
	$time = isset( $_POST['pwc_ce_cutoff_time'] ) ? sanitize_text_field( wp_unslash( $_POST['pwc_ce_cutoff_time'] ) ) : '';
	$cutoff_ts = 0;
	$cutoff_dt = null;
	if ( '' === $date || '' === $time ) {
		$errors[] = __( 'Please set both a cutoff date and a cutoff time.', 'pwc' );
	} else {
		$cutoff_dt = DateTime::createFromFormat( '!Y-m-d H:i', $date . ' ' . $time, wp_timezone() );
		if ( ! $cutoff_dt ) {
			$errors[] = __( 'The cutoff date/time is invalid.', 'pwc' );
		} else {
			$cutoff_ts = $cutoff_dt->getTimestamp();
		}
	}

	return array(
		'errors'      => $errors,
		'product_id'  => $product_id,
		'statuses'    => $statuses,
		'cutoff_ts'   => $cutoff_ts,
		'cutoff_dt'   => $cutoff_dt,
		'cutoff_date' => $date,
		'cutoff_time' => $time,
	);
}

/* ───────────────────────────────────────────────────────────────────────────
 * Core engine — read-only. Scans eligible orders in paginated batches, matches
 * the selected competition at LINE-ITEM level only, and returns counts (and the
 * CSV rows when $want_rows is true).
 *
 * Guarantees the #469 rule: for each order we only ever read the quantity of the
 * line item(s) whose product identity equals the selected competition. Other
 * products in the same order are ignored, so a combined order total is never used.
 * ─────────────────────────────────────────────────────────────────────────── */
function pwc_ce_collect( $product_id, $statuses, $cutoff_ts, $want_rows = false ) {
	$selected     = wc_get_product( $product_id );
	$is_variation = $selected && $selected->is_type( 'variation' );

	$stats = array(
		'matching_orders'        => 0,
		'total_valid_entries'    => 0,
		'unpaid_unconfirmed'     => 0, // eligible status but ! is_paid()
		'missing_paid_timestamp' => 0, // is_paid() but no date_paid
		'zero_invalid_items'     => 0, // matched line item with qty < 1
		'rows'                   => array(),
	);
	$participants = array();

	$page = 1;
	do {
		$orders = wc_get_orders( array(
			'type'    => 'shop_order',
			'status'  => $statuses,
			'limit'   => PWC_CE_BATCH_SIZE,
			'page'    => $page,
			'orderby' => 'date',
			'order'   => 'ASC',
		) );

		foreach ( $orders as $order ) {
			if ( ! $order instanceof WC_Order ) {
				continue;
			}

			// 1) Does this order contain the SELECTED competition? Read only the
			//    matching line item(s)' quantities — never the whole order.
			$order_valid_qty = 0;
			$has_match       = false;
			foreach ( $order->get_items( 'line_item' ) as $item ) {
				if ( ! $item instanceof WC_Order_Item_Product ) {
					continue;
				}
				$match = $is_variation
					? ( (int) $item->get_variation_id() === (int) $product_id )
					: ( (int) $item->get_product_id() === (int) $product_id );
				if ( ! $match ) {
					continue; // ignore all unrelated products (e.g. the other competition)
				}
				$has_match = true;
				$qty       = max( 0, (int) $item->get_quantity() ); // no partial-refund math in Phase 1
				if ( $qty < 1 ) {
					$stats['zero_invalid_items']++;
					continue;
				}
				$order_valid_qty += $qty;
			}

			if ( ! $has_match || $order_valid_qty < 1 ) {
				continue; // order has nothing valid for the selected competition
			}

			// 2) Eligibility — paid state + paid timestamp + cutoff.
			if ( ! $order->is_paid() ) {
				$stats['unpaid_unconfirmed']++;
				continue;
			}
			$date_paid = $order->get_date_paid();
			if ( ! $date_paid ) {
				$stats['missing_paid_timestamp']++;
				continue; // never fall back to date_created
			}
			if ( $date_paid->getTimestamp() > $cutoff_ts ) {
				continue; // paid after the cutoff → outside the draw window
			}

			// 3) Eligible entry.
			$stats['matching_orders']++;
			$stats['total_valid_entries'] += $order_valid_qty;

			// Unique participant (informational — never affects entry count):
			// customer ID → normalised billing email → order id fallback.
			$cid = (int) $order->get_customer_id();
			if ( $cid > 0 ) {
				$participants[ 'cid:' . $cid ] = true;
			} else {
				$email = strtolower( trim( (string) $order->get_billing_email() ) );
				$participants[ '' !== $email ? 'email:' . $email : 'order:' . $order->get_id() ] = true;
			}

			if ( $want_rows ) {
				$number  = (string) $order->get_order_number();
				$name    = trim( $order->get_billing_first_name() . ' ' . $order->get_billing_last_name() );
				$country = (string) $order->get_billing_country();
				for ( $i = 0; $i < $order_valid_qty; $i++ ) {
					$stats['rows'][] = array( $number, $name, $country );
				}
			}
		}

		$page++;
	} while ( count( $orders ) === PWC_CE_BATCH_SIZE );

	$stats['unique_participants'] = count( $participants );
	$stats['expected_rows']       = (int) $stats['total_valid_entries'];
	return $stats;
}

/* ───────────────────────────────────────────────────────────────────────────
 * Admin page render (form + read-only preview).
 * ─────────────────────────────────────────────────────────────────────────── */
function pwc_ce_render_page() {
	if ( ! current_user_can( 'manage_woocommerce' ) ) {
		wp_die( esc_html__( 'You do not have permission to view this page.', 'pwc' ) );
	}

	$competitions = pwc_ce_get_competitions();
	$statuses_all = wc_get_order_statuses();
	$tz_string    = wp_timezone_string();

	// Repopulate + compute preview only on an explicit Preview submit.
	$submitted   = isset( $_POST['pwc_ce_preview'] );
	$preview     = null;
	$req         = null;
	$sel_product = 0;
	$sel_status  = PWC_CE_DEFAULT_STATUS;
	$sel_date    = current_time( 'Y-m-d' );
	$sel_time    = current_time( 'H:i' );

	if ( $submitted ) {
		check_admin_referer( PWC_CE_NONCE_ACTION );
		$req         = pwc_ce_parse_request();
		$sel_product = $req['product_id'];
		$sel_status  = ! empty( $req['statuses'] ) ? $req['statuses'] : array();
		$sel_date    = $req['cutoff_date'] ?: $sel_date;
		$sel_time    = $req['cutoff_time'] ?: $sel_time;
		if ( empty( $req['errors'] ) ) {
			$preview = pwc_ce_collect( $req['product_id'], $req['statuses'], $req['cutoff_ts'], false );
		}
	}

	$action_url = admin_url( 'admin.php?page=' . PWC_CE_PAGE_SLUG );
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'Competition Entries', 'pwc' ); ?></h1>
		<p class="description">
			<?php esc_html_e( 'Export a RandomDraws-compatible CSV of ticket entries for one competition. Read-only — no orders are modified.', 'pwc' ); ?>
		</p>

		<?php if ( empty( $competitions ) ) : ?>
			<div class="notice notice-warning"><p>
				<?php esc_html_e( 'No competition products found. A product must have a "competition_type" of weekly, monthly, special or free.', 'pwc' ); ?>
			</p></div>
		<?php endif; ?>

		<?php if ( $submitted && $req && ! empty( $req['errors'] ) ) : ?>
			<div class="notice notice-error"><p><?php echo esc_html( implode( ' ', $req['errors'] ) ); ?></p></div>
		<?php endif; ?>

		<form method="post" action="<?php echo esc_url( $action_url ); ?>">
			<?php wp_nonce_field( PWC_CE_NONCE_ACTION ); ?>

			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="pwc_ce_product"><?php esc_html_e( 'Competition', 'pwc' ); ?></label></th>
					<td>
						<select name="pwc_ce_product" id="pwc_ce_product" required>
							<option value=""><?php esc_html_e( '— Select a competition —', 'pwc' ); ?></option>
							<?php foreach ( $competitions as $c ) :
								$label = sprintf(
									'%s — %s%s%s',
									$c['name'],
									ucfirst( $c['type'] ),
									'' !== $c['number'] ? ' #' . $c['number'] : '',
									'' !== $c['status'] ? ' (' . $c['status'] . ')' : ''
								);
							?>
								<option value="<?php echo esc_attr( $c['id'] ); ?>" <?php selected( $sel_product, $c['id'] ); ?>>
									<?php echo esc_html( $label ); ?>
								</option>
							<?php endforeach; ?>
						</select>
					</td>
				</tr>

				<tr>
					<th scope="row"><?php esc_html_e( 'Eligible order statuses', 'pwc' ); ?></th>
					<td>
						<fieldset>
							<?php foreach ( $statuses_all as $key => $label ) : ?>
								<label style="display:inline-block;margin:0 16px 6px 0;">
									<input type="checkbox" name="pwc_ce_statuses[]" value="<?php echo esc_attr( $key ); ?>"
										<?php checked( in_array( $key, $sel_status, true ) ); ?> />
									<?php echo esc_html( $label ); ?>
								</label>
							<?php endforeach; ?>
						</fieldset>
						<p class="description">
							<?php esc_html_e( 'Default: Processing + Completed. Orders must also pass WooCommerce paid-order logic (is_paid) and have a paid timestamp.', 'pwc' ); ?>
						</p>
					</td>
				</tr>

				<tr>
					<th scope="row"><label for="pwc_ce_cutoff_date"><?php esc_html_e( 'Cutoff (date & time)', 'pwc' ); ?></label></th>
					<td>
						<input type="date" name="pwc_ce_cutoff_date" id="pwc_ce_cutoff_date" value="<?php echo esc_attr( $sel_date ); ?>" required />
						<input type="time" name="pwc_ce_cutoff_time" id="pwc_ce_cutoff_time" value="<?php echo esc_attr( $sel_time ); ?>" required />
						<p class="description">
							<?php
							/* translators: %s: WordPress timezone string. */
							echo esc_html( sprintf( __( 'Interpreted in the site timezone: %s. Only orders paid at or before this moment are included.', 'pwc' ), $tz_string ) );
							?>
						</p>
					</td>
				</tr>
			</table>

			<p class="submit">
				<button type="submit" name="pwc_ce_preview" value="1" class="button button-secondary">
					<?php esc_html_e( 'Preview', 'pwc' ); ?>
				</button>
				<button type="submit" name="pwc_ce_export" value="1" class="button button-primary">
					<?php esc_html_e( 'Export CSV', 'pwc' ); ?>
				</button>
			</p>
		</form>

		<?php if ( $preview && $req ) :
			$comp_meta = array(
				'name'   => '',
				'type'   => strtolower( trim( (string) pwc_ce_meta( $req['product_id'], 'competition_type' ) ) ),
				'number' => trim( (string) pwc_ce_meta( $req['product_id'], 'competition_number' ) ),
			);
			$cp = wc_get_product( $req['product_id'] );
			$comp_meta['name'] = $cp ? $cp->get_name() : ( '#' . $req['product_id'] );
			$status_labels = array();
			foreach ( $req['statuses'] as $s ) {
				$status_labels[] = isset( $statuses_all[ $s ] ) ? $statuses_all[ $s ] : $s;
			}
			$cutoff_display = $req['cutoff_dt'] ? $req['cutoff_dt']->format( 'j F Y, H:i' ) : '';
			?>
			<h2><?php esc_html_e( 'Preview', 'pwc' ); ?></h2>
			<table class="widefat striped" style="max-width:720px;">
				<tbody>
					<tr><td><strong><?php esc_html_e( 'Competition', 'pwc' ); ?></strong></td><td><?php echo esc_html( $comp_meta['name'] ); ?></td></tr>
					<tr><td><?php esc_html_e( 'Product ID', 'pwc' ); ?></td><td><?php echo esc_html( (string) $req['product_id'] ); ?></td></tr>
					<tr><td><?php esc_html_e( 'Competition type', 'pwc' ); ?></td><td><?php echo esc_html( ucfirst( $comp_meta['type'] ) ); ?></td></tr>
					<tr><td><?php esc_html_e( 'Competition number', 'pwc' ); ?></td><td><?php echo esc_html( '' !== $comp_meta['number'] ? $comp_meta['number'] : '—' ); ?></td></tr>
					<tr><td><?php esc_html_e( 'Selected statuses', 'pwc' ); ?></td><td><?php echo esc_html( implode( ', ', $status_labels ) ); ?></td></tr>
					<tr><td><?php esc_html_e( 'Cutoff', 'pwc' ); ?></td><td><?php echo esc_html( $cutoff_display ); ?></td></tr>
					<tr><td><?php esc_html_e( 'WordPress timezone', 'pwc' ); ?></td><td><?php echo esc_html( $tz_string ); ?></td></tr>
					<tr><td><strong><?php esc_html_e( 'Matching paid orders', 'pwc' ); ?></strong></td><td><strong><?php echo esc_html( number_format_i18n( $preview['matching_orders'] ) ); ?></strong></td></tr>
					<tr><td><?php esc_html_e( 'Unique participants', 'pwc' ); ?></td><td><?php echo esc_html( number_format_i18n( $preview['unique_participants'] ) ); ?></td></tr>
					<tr><td><strong><?php esc_html_e( 'Total valid entries', 'pwc' ); ?></strong></td><td><strong><?php echo esc_html( number_format_i18n( $preview['total_valid_entries'] ) ); ?></strong></td></tr>
					<tr><td><?php esc_html_e( 'Unpaid / unconfirmed orders excluded', 'pwc' ); ?></td><td><?php echo esc_html( number_format_i18n( $preview['unpaid_unconfirmed'] ) ); ?></td></tr>
					<tr><td><?php esc_html_e( 'Orders missing a paid timestamp', 'pwc' ); ?></td><td><?php echo esc_html( number_format_i18n( $preview['missing_paid_timestamp'] ) ); ?></td></tr>
					<tr><td><?php esc_html_e( 'Zero / invalid line items', 'pwc' ); ?></td><td><?php echo esc_html( number_format_i18n( $preview['zero_invalid_items'] ) ); ?></td></tr>
					<tr><td><strong><?php esc_html_e( 'Expected CSV row count', 'pwc' ); ?></strong></td><td><strong><?php echo esc_html( number_format_i18n( $preview['expected_rows'] ) ); ?></strong></td></tr>
				</tbody>
			</table>
			<?php if ( 0 === (int) $preview['total_valid_entries'] ) : ?>
				<p class="description"><?php esc_html_e( 'No valid entries match the current selection.', 'pwc' ); ?></p>
			<?php else : ?>
				<p class="description">
					<?php esc_html_e( 'Each valid ticket becomes one CSV row; the same order number repeats once per ticket (this is expected, not a duplicate).', 'pwc' ); ?>
				</p>
			<?php endif; ?>
		<?php endif; ?>
	</div>
	<?php
}
