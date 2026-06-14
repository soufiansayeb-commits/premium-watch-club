<?php
/**
 * PWC — Custom Order Confirmation + Default WooCommerce Page Redirects
 * ════════════════════════════════════════════════════════════════════
 * ONE self-contained snippet. Code Snippets → replace the previous PWC
 * order-confirmation snippet with this → "Run everywhere" → Activate.
 *
 *   1. Renders a fully custom PWC confirmation layout on the order-received
 *      page and REMOVES/HIDES all default WooCommerce thank-you output.
 *   2. Product names are plain text — never linked.
 *   3. Sends logged-out customers off the default Woo cart/product/shop pages
 *      to the branded frontend cart (server redirect + JS bfcache fallback).
 *
 * SAFE: never changes checkout, payments, order creation, order emails,
 * saved skill-answer meta, or admin order screens.
 *
 * FRONTEND URL — local default below. For production add to wp-config.php:
 *   define('PWC_FRONTEND_URL', 'https://premiumwatchclub.com');
 */

if ( ! defined( 'ABSPATH' ) ) exit;

if ( ! defined( 'PWC_FRONTEND_URL' ) ) {
	define( 'PWC_FRONTEND_URL', 'http://localhost:3000' ); // ← change for production
}
function pwc_oc_frontend() {
	return rtrim( PWC_FRONTEND_URL, '/' );
}
function pwc_oc_is_received() {
	return function_exists( 'is_order_received_page' ) && is_order_received_page();
}


/* ───────────────────────────────────────────────────────────────────────────
 * 1. PRODUCT NAME = PLAIN TEXT (no link) — backup for any default output
 * ─────────────────────────────────────────────────────────────────────────── */
add_filter( 'woocommerce_order_item_permalink', function ( $url ) {
	return is_admin() ? $url : '';
}, 10, 1 );


/* ───────────────────────────────────────────────────────────────────────────
 * 2. REMOVE THE DEFAULT WOO ORDER-DETAILS TABLE (table + billing) RELIABLY
 *    Runs at priority 5 of woocommerce_thankyou, before the default priority-10
 *    callback executes — bulletproof timing, no conditional-tag dependency.
 * ─────────────────────────────────────────────────────────────────────────── */
add_action( 'woocommerce_thankyou', function () {
	remove_action( 'woocommerce_thankyou', 'woocommerce_order_details_table', 10 );
}, 5 );

// Leftover/browser-tab title → "Entry Confirmed".
add_filter( 'woocommerce_endpoint_order-received_title', function () { return 'Entry Confirmed'; } );
add_filter( 'the_title', function ( $t ) {
	return ( ! is_admin() && pwc_oc_is_received() && $t === 'Order received' ) ? 'Entry Confirmed' : $t;
}, 20, 1 );


/* ───────────────────────────────────────────────────────────────────────────
 * 3. RENDER CUSTOM PWC CONFIRMATION MARKUP  (unique .pwc-confirmation* classes)
 * ─────────────────────────────────────────────────────────────────────────── */
add_action( 'woocommerce_thankyou', 'pwc_oc_render', 20 );
function pwc_oc_render( $order_id ) {
	$order = wc_get_order( $order_id );
	if ( ! $order ) return;

	$rows = array(
		'Order number'   => '#' . $order->get_order_number(),
		'Date'           => wc_format_datetime( $order->get_date_created() ),
		'Email'          => $order->get_billing_email(),
		'Payment method' => $order->get_payment_method_title() ?: '—',
	);

	$billing = $order->get_formatted_billing_address();
	$phone   = $order->get_billing_phone();
	?>
	<div class="pwc-confirmation">

		<!-- Hero -->
		<div class="pwc-confirmation-card pwc-confirmation-hero">
			<span class="pwc-confirmation-eyebrow">Premium Watch Club</span>
			<h1 class="pwc-confirmation-title">Entry Confirmed</h1>
			<p class="pwc-confirmation-sub">Thank you. Your entry has been received.</p>
		</div>

		<!-- Order summary -->
		<div class="pwc-confirmation-card pwc-confirmation-summary">
			<h2 class="pwc-confirmation-h">Order Summary</h2>
			<div class="pwc-confirmation-grid">
				<?php foreach ( $rows as $k => $v ) : ?>
					<div class="pwc-confirmation-cell">
						<span class="pwc-confirmation-k"><?php echo esc_html( $k ); ?></span>
						<span class="pwc-confirmation-v"><?php echo esc_html( $v ); ?></span>
					</div>
				<?php endforeach; ?>
				<div class="pwc-confirmation-cell">
					<span class="pwc-confirmation-k">Total</span>
					<span class="pwc-confirmation-v"><?php echo wp_kses_post( $order->get_formatted_order_total() ); ?></span>
				</div>
			</div>
		</div>

		<!-- Entry details -->
		<div class="pwc-confirmation-card pwc-confirmation-entry">
			<h2 class="pwc-confirmation-h">Entry Details</h2>

			<?php foreach ( $order->get_items() as $item ) :
				$meta_lines = array();
				foreach ( $item->get_formatted_meta_data() as $m ) {
					$mk = trim( wp_strip_all_tags( $m->display_key ) );
					$mv = trim( wp_strip_all_tags( $m->display_value ) );
					if ( $mk !== '' && $mv !== '' ) {
						$meta_lines[] = array( 'k' => $mk, 'v' => $mv );
					}
				}
				$has_answer = false;
				foreach ( $meta_lines as $ml ) {
					if ( stripos( $ml['k'], 'answer' ) !== false ) { $has_answer = true; break; }
				}
				if ( ! $has_answer ) {
					$sa = $item->get_meta( '_pwc_skill_answer' );
					if ( $sa ) $meta_lines[] = array( 'k' => 'Selected Answer', 'v' => $sa );
				}
			?>
				<div class="pwc-confirmation-item">
					<div class="pwc-confirmation-item-head">
						<span class="pwc-confirmation-item-name"><?php echo esc_html( $item->get_name() ); ?></span>
						<span class="pwc-confirmation-item-total"><?php echo wp_kses_post( $order->get_formatted_line_subtotal( $item ) ); ?></span>
					</div>
					<div class="pwc-confirmation-item-meta">
						<span class="pwc-confirmation-mrow"><span class="pwc-confirmation-k2">Entries</span><?php echo esc_html( $item->get_quantity() ); ?></span>
						<?php foreach ( $meta_lines as $ml ) : ?>
							<span class="pwc-confirmation-mrow"><span class="pwc-confirmation-k2"><?php echo esc_html( $ml['k'] ); ?></span><?php echo esc_html( $ml['v'] ); ?></span>
						<?php endforeach; ?>
					</div>
				</div>
			<?php endforeach; ?>

			<div class="pwc-confirmation-total">
				<span>Total paid</span>
				<strong><?php echo wp_kses_post( $order->get_formatted_order_total() ); ?></strong>
			</div>
		</div>

		<!-- Billing (secondary) -->
		<?php if ( $billing ) : ?>
		<div class="pwc-confirmation-card pwc-confirmation-billing">
			<h2 class="pwc-confirmation-h pwc-confirmation-h--sm">Billing Address</h2>
			<address>
				<?php echo wp_kses_post( $billing ); ?>
				<?php if ( $phone ) : ?><br><?php echo esc_html( $phone ); ?><?php endif; ?>
			</address>
		</div>
		<?php endif; ?>

		<p class="pwc-confirmation-note">
			A confirmation email has been sent to you.<br>
			Please keep your order number for your records.
		</p>

	</div>
	<?php
}


/* ───────────────────────────────────────────────────────────────────────────
 * 4. CSS — hide ALL default output + style the custom layout
 *    The <style> is printed ONLY on the order-received page, so unscoped
 *    selectors are safe (no dependency on the body class, which this theme
 *    does not output).
 * ─────────────────────────────────────────────────────────────────────────── */
add_action( 'wp_head', function () {
	if ( ! pwc_oc_is_received() ) return;
	?>
	<style id="pwc-order-confirmation">
	@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Jost:wght@400;500;600&display=swap');

	/* ── Hide every default WooCommerce / theme element above the custom layout ── */
	.woocommerce-thankyou-order-received,
	.woocommerce-order-overview,
	.woocommerce-order-details,
	.woocommerce-order-details__title,
	.woocommerce-table--order-details,
	.woocommerce-customer-details,
	.woocommerce-customer-details__title,
	.woocommerce-column--billing-address,
	.woocommerce-column--shipping-address,
	.entry-title,
	.wp-block-post-title,
	.woocommerce-page-title,
	h1.page-title { display:none !important; }

	body { background:#F6F3EC !important; }
	.woocommerce, .woocommerce-order { background:none !important; box-shadow:none !important; padding:0 !important; }

	/* ── Custom layout ───────────────────────────────────────────────────────── */
	.pwc-confirmation {
		max-width:760px; margin:0 auto; padding:24px 18px 64px;
		font-family:'Jost',-apple-system,Segoe UI,Roboto,sans-serif; color:#23222a;
	}
	.pwc-confirmation-card {
		background:#fff; border:1px solid #e8dfca; border-radius:10px;
		padding:30px 32px; margin:0 0 18px; box-shadow:0 12px 34px rgba(10,31,68,.06);
	}
	.pwc-confirmation-hero { text-align:center; padding:42px 32px; }
	.pwc-confirmation-eyebrow {
		display:block; font-size:11px; font-weight:600; letter-spacing:.3em;
		text-transform:uppercase; color:#B8893C; margin-bottom:14px;
	}
	.pwc-confirmation-title {
		font-family:'Cormorant Garamond',Georgia,serif; font-weight:600;
		font-size:44px; line-height:1.05; color:#0A1F44; margin:0 0 10px;
	}
	.pwc-confirmation-sub { font-size:16px; color:#5b5a62; margin:0; }

	.pwc-confirmation-h {
		font-family:'Cormorant Garamond',Georgia,serif; font-weight:600;
		font-size:22px; color:#0A1F44; margin:0 0 20px;
		padding-bottom:14px; border-bottom:1px solid #f0e9da;
	}
	.pwc-confirmation-h--sm {
		font-family:'Jost',sans-serif; font-size:12px; font-weight:600;
		letter-spacing:.16em; text-transform:uppercase; color:#B8893C;
	}

	.pwc-confirmation-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:20px 24px; }
	.pwc-confirmation-cell { display:flex; flex-direction:column; gap:6px; }
	.pwc-confirmation-k { font-size:10px; font-weight:600; letter-spacing:.14em; text-transform:uppercase; color:#B8893C; }
	.pwc-confirmation-v {
		font-family:'Cormorant Garamond',Georgia,serif; font-size:18px; font-weight:600;
		color:#0A1F44; word-break:break-word;
	}
	.pwc-confirmation-v bdi, .pwc-confirmation-v .amount { font-family:'Cormorant Garamond',Georgia,serif; }

	.pwc-confirmation-item { padding:0 0 18px; margin:0 0 18px; border-bottom:1px solid #f0e9da; }
	.pwc-confirmation-item-head { display:flex; justify-content:space-between; align-items:baseline; gap:14px; }
	.pwc-confirmation-item-name { font-family:'Cormorant Garamond',Georgia,serif; font-size:20px; font-weight:600; color:#0A1F44; }
	.pwc-confirmation-item-total { font-family:'Cormorant Garamond',serif; font-size:18px; font-weight:600; color:#0A1F44; white-space:nowrap; }
	.pwc-confirmation-item-meta { margin-top:12px; display:flex; flex-direction:column; gap:8px; }
	.pwc-confirmation-mrow { font-size:14px; color:#3f4047; }
	.pwc-confirmation-k2 {
		display:inline-block; min-width:120px; font-size:10px; font-weight:600;
		letter-spacing:.12em; text-transform:uppercase; color:#9a8a63; margin-right:6px;
	}
	.pwc-confirmation-total { display:flex; justify-content:space-between; align-items:baseline; padding-top:6px; font-size:13px; letter-spacing:.04em; color:#0A1F44; }
	.pwc-confirmation-total strong { font-family:'Cormorant Garamond',serif; font-size:22px; color:#0A1F44; }

	.pwc-confirmation-billing { background:#fbf9f3; }
	.pwc-confirmation-billing address { font-style:normal; font-size:13px; line-height:1.75; color:#6f6d75; margin:0; }

	.pwc-confirmation-note { text-align:center; margin:26px auto 0; max-width:460px; font-size:12px; line-height:1.9; color:#8a8893; }
	.pwc-confirmation-note::before { content:''; display:block; width:44px; height:1px; background:#B8893C; opacity:.6; margin:0 auto 16px; }

	@media (max-width:600px){
		.pwc-confirmation-card { padding:24px 20px; }
		.pwc-confirmation-title { font-size:36px; }
		.pwc-confirmation-k2 { min-width:0; display:block; margin-bottom:2px; }
	}
	</style>
	<?php
}, 99 );

/* 4b. JS catch-all — move the custom layout to safety, then hide the default
 *     WooCommerce confirmation output. Works for ANY markup (classic or Blocks)
 *     because it relocates our layout FIRST, so it can never be hidden, then
 *     hides the other content. Site header/footer are never touched. */
add_action( 'wp_footer', function () {
	if ( ! pwc_oc_is_received() ) return;
	?>
	<script>
	document.addEventListener('DOMContentLoaded', function () {
		var c = document.querySelector('.pwc-confirmation');
		if ( ! c ) return;

		// 1. Relocate our layout to the end of <main> (or <body>) — out of any
		//    WooCommerce wrapper — so hiding the defaults can't affect it.
		var host = document.querySelector('main') || document.body;
		if ( c.parentElement !== host ) host.appendChild( c );

		// 2. Hide every other top-level block in the host, except site chrome.
		Array.prototype.slice.call( host.children ).forEach(function (ch) {
			if ( ch === c || ch.contains( c ) ) return;
			var t = ch.tagName;
			if ( t === 'HEADER' || t === 'FOOTER' || t === 'NAV' || t === 'SCRIPT' || t === 'STYLE' || t === 'LINK' ) return;
			if ( ch.querySelector && ch.querySelector('header, nav, footer') ) return; // keep wrappers holding site chrome
			ch.style.setProperty('display','none','important');
		});

		// 3. Hide the default title wherever it lives, by its text.
		document.querySelectorAll('h1, h2, .entry-title, .wp-block-post-title, .woocommerce-page-title, .page-title').forEach(function (el) {
			if ( el.closest && el.closest('.pwc-confirmation') ) return; // never touch our layout
			var x = ( el.textContent || '' ).trim();
			if ( x === 'Order received' || x === 'Order Confirmation' ) el.style.setProperty('display','none','important');
		});

		// 4. Back-button guard — trap browser back/forward on this confirmation
		//    page and send the customer to the branded homepage instead of the
		//    default WooCommerce empty-checkout page.
		try {
			history.pushState( null, '', location.href );
			window.addEventListener('popstate', function () {
				window.location.replace( <?php echo wp_json_encode( pwc_oc_frontend() . '/' ); ?> );
			});
		} catch ( e ) {}
	});
	</script>
	<?php
} );


/* ───────────────────────────────────────────────────────────────────────────
 * 5. REDIRECT DEFAULT WOO PAGES → FRONTEND CART  (logged-out customers)
 *    /cart/ /product/* /shop/*  →  {PWC_FRONTEND_URL}/cart
 * ─────────────────────────────────────────────────────────────────────────── */
add_action( 'template_redirect', 'pwc_oc_redirect', 1 );
function pwc_oc_redirect() {
	if ( is_admin() ) return;
	if ( function_exists( 'wp_doing_ajax' ) && wp_doing_ajax() ) return;
	if ( defined( 'REST_REQUEST' ) && REST_REQUEST ) return;
	if ( defined( 'DOING_CRON' ) && DOING_CRON ) return;
	if ( isset( $_GET['wc-api'] ) || isset( $_GET['wc-ajax'] ) ) return;
	if ( is_user_logged_in() && current_user_can( 'edit_posts' ) ) return;

	// Checkout flow — never touch order-received / order-pay / payment callbacks,
	// but an EMPTY plain checkout page (e.g. reached via browser back) → home.
	if ( function_exists( 'is_checkout' ) && is_checkout() ) {
		if ( pwc_oc_is_received() ) return;
		if ( function_exists( 'is_wc_endpoint_url' ) && is_wc_endpoint_url( 'order-pay' ) ) return;
		if ( isset( $_GET['pay_for_order'] ) || isset( $_GET['key'] ) ) return; // pay / callback
		if ( function_exists( 'WC' ) && WC() && WC()->cart && WC()->cart->is_empty() ) {
			wp_redirect( pwc_oc_frontend() . '/', 302 );
			exit;
		}
		return; // checkout WITH items in cart → leave the real checkout alone
	}

	$path  = trim( (string) parse_url( $_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH ), '/' );
	$first = $path === '' ? '' : explode( '/', $path )[0];
	if ( $first === 'checkout' ) return;

	$is_cart    = ( function_exists( 'is_cart' ) && is_cart() ) || $first === 'cart';
	$is_product = ( function_exists( 'is_product' ) && is_product() ) || $first === 'product';
	$is_shop    = ( function_exists( 'is_shop' ) && is_shop() )
	           || ( function_exists( 'is_product_category' ) && is_product_category() )
	           || ( function_exists( 'is_product_tag' ) && is_product_tag() )
	           || $first === 'shop';

	if ( $is_cart || $is_product || $is_shop ) {
		wp_redirect( pwc_oc_frontend() . '/cart', 302 );
		exit;
	}
}


/* ───────────────────────────────────────────────────────────────────────────
 * 6. JS bfcache FALLBACK — only on public Woo cart/product/shop pages
 * ─────────────────────────────────────────────────────────────────────────── */
add_action( 'wp_footer', function () {
	if ( is_admin() ) return;
	if ( function_exists( 'is_checkout' ) && is_checkout() ) return;
	if ( pwc_oc_is_received() ) return;
	if ( is_user_logged_in() && current_user_can( 'edit_posts' ) ) return;

	$on_woo = ( function_exists( 'is_cart' ) && is_cart() )
	       || ( function_exists( 'is_product' ) && is_product() )
	       || ( function_exists( 'is_shop' ) && is_shop() )
	       || ( function_exists( 'is_product_category' ) && is_product_category() )
	       || ( function_exists( 'is_product_tag' ) && is_product_tag() );
	if ( ! $on_woo ) return;
	?>
	<script>
	(function () {
		var dest = <?php echo wp_json_encode( pwc_oc_frontend() . '/cart' ); ?>;
		function go() {
			if ( /^\/(cart|product|shop)(\/|$|\?)/.test( window.location.pathname ) ) {
				window.location.replace( dest );
			}
		}
		window.addEventListener( 'pageshow', go );
		go();
	})();
	</script>
	<?php
} );
