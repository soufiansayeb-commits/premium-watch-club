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
	define( 'PWC_FRONTEND_URL', 'https://premiumwatchclub.com' );
}
function pwc_oc_frontend() {
	return rtrim( PWC_FRONTEND_URL, '/' );
}
function pwc_oc_is_received() {
	return function_exists( 'is_order_received_page' ) && is_order_received_page();
}

/**
 * Inline gold-outline SVG icons for the "What Happens Next" timeline.
 * Decorative only (wrappers are aria-hidden). Static trusted markup.
 */
function pwc_oc_next_icon( $name ) {
	$open = '<svg viewBox="0 0 24 24" fill="none" stroke="#B8893C" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">';
	switch ( $name ) {
		case 'mail':
			$body = '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M4 7l8 5.5L20 7"/>';
			break;
		case 'shield':
			$body = '<path d="M12 3l7 3v5c0 4.3-3 7.4-7 8.8C8 18.4 5 15.3 5 11V6l7-3z"/><path d="M9 11.5l2 2 4-4"/>';
			break;
		case 'ticket':
			$body = '<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h13A1.5 1.5 0 0 1 20 8.5v1a1.5 1.5 0 0 0 0 3v1a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 14.5v-1a1.5 1.5 0 0 0 0-3z"/><path d="M13 7.5v9" stroke-dasharray="1.6 2.2"/>';
			break;
		case 'calendar':
			$body = '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3.5v3M16 3.5v3"/><path d="M7.5 13h1.5M11.25 13h1.5M15 13h1.5M7.5 16.5h1.5M11.25 16.5h1.5"/>';
			break;
		case 'watch':
			$body = '<circle cx="12" cy="12" r="4.6"/><path d="M12 9.8V12l1.5 1"/><path d="M9.7 7.4 9.2 4h5.6l-.5 3.4M9.7 16.6l-.5 3.4h5.6l-.5-3.4"/>';
			break;
		default:
			$body = '';
	}
	return $open . $body . '</svg>';
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

	// Gold wordmark, served from the branded frontend (Next.js /public/brand-assets).
	// Override in wp-config.php with: define('PWC_OC_LOGO_URL', 'https://…/logo.png');
	$logo_url = defined( 'PWC_OC_LOGO_URL' )
		? PWC_OC_LOGO_URL
		: pwc_oc_frontend() . '/brand-assets/pwc-logo-wordmark-gold.png';

	$next_steps = array(
		array( 'icon' => 'mail',     'title' => '1. Confirmation email sent', 'body' => 'Your order confirmation has been sent to your inbox.' ),
		array( 'icon' => 'shield',   'title' => '2. Entry verified',          'body' => 'We check your entry to make sure everything is correct.' ),
		array( 'icon' => 'ticket',   'title' => '3. Entry added to the draw',  'body' => 'Your verified entry is assigned an order number and added to the draw.' ),
		array( 'icon' => 'calendar', 'title' => '4. Draw takes place',         'body' => 'The draw takes place live on the announced date, run independently via RandomDraws.' ),
		array( 'icon' => 'watch',    'title' => '5. Winner notified',          'body' => 'We contact the winner directly and arrange secure, insured delivery soon after the draw.' ),
	);
	?>
	<div class="pwc-confirmation">

		<!-- Hero -->
		<div class="pwc-confirmation-card pwc-confirmation-hero">
			<img class="pwc-confirmation-logo" src="<?php echo esc_url( $logo_url ); ?>"
			     alt="Premium Watch Club" width="1447" height="341"
			     onerror="this.style.display='none';">
			<h1 class="pwc-confirmation-title">Entry Confirmed</h1>
			<p class="pwc-confirmation-sub">Thank you. Your entry has been received.</p>

			<!-- Confirmation note — inside the hero card, under the thank-you line -->
			<div class="pwc-confirmation-note">
				<span class="pwc-confirmation-note-icon" aria-hidden="true">
					<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#B8893C" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
						<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M4 7l8 5.5L20 7"/>
					</svg>
				</span>
				<p class="pwc-confirmation-note-text">
					A confirmation email has been sent to you.<br>
					Please keep your order number for your records.
				</p>
			</div>
		</div>

		<!-- What Happens Next -->
		<section class="pwc-confirmation-card pwc-next" aria-label="What happens next">
			<h2 class="pwc-next-title">What Happens Next</h2>
			<div class="pwc-next-divider" aria-hidden="true">
				<span class="pwc-next-divider-line"></span>
				<svg class="pwc-next-star" width="18" height="18" viewBox="0 0 24 24" fill="#B8893C" aria-hidden="true"><path d="M12 2.5l1.7 6.8L20.5 11l-6.8 1.7L12 19.5l-1.7-6.8L3.5 11l6.8-1.7L12 2.5z"/></svg>
				<span class="pwc-next-divider-line"></span>
			</div>
			<ol class="pwc-next-steps">
				<?php foreach ( $next_steps as $st ) : ?>
					<li class="pwc-next-step">
						<span class="pwc-next-iconrow">
							<span class="pwc-next-icon" aria-hidden="true"><?php echo pwc_oc_next_icon( $st['icon'] ); ?></span>
						</span>
						<h3 class="pwc-next-step-title"><?php echo esc_html( $st['title'] ); ?></h3>
						<p class="pwc-next-step-body"><?php echo esc_html( $st['body'] ); ?></p>
					</li>
				<?php endforeach; ?>
			</ol>

			<!-- Carousel controls — visible on mobile only (CSS). Manual paging, no autoplay. -->
			<div class="pwc-next-nav">
				<button type="button" class="pwc-next-arrow" data-dir="prev" aria-label="Previous step" disabled>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
				</button>
				<button type="button" class="pwc-next-arrow" data-dir="next" aria-label="Next step">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
				</button>
			</div>
		</section>

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
	.pwc-confirmation-logo {
		display:block; width:196px; max-width:62%; height:auto;
		margin:0 auto 22px;
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

	/* Reassurance note — compact pill INSIDE the hero, under the thank-you line. */
	.pwc-confirmation-note {
		display:flex; align-items:center; gap:13px; width:fit-content; max-width:100%;
		margin:24px auto 0; padding:13px 20px; text-align:left;
		background:#fbf9f3; border:1px solid rgba(184,137,60,.3); border-radius:12px;
	}
	.pwc-confirmation-note-icon {
		flex:none; display:inline-flex; align-items:center; justify-content:center;
		width:34px; height:34px; border-radius:9px;
		background:#fff; border:1px solid rgba(184,137,60,.42);
		box-shadow:0 2px 8px rgba(184,137,60,.14);
	}
	.pwc-confirmation-note-text { margin:0; font-size:13.5px; line-height:1.6; color:#5b5a62; }

	/* ── What Happens Next — luxury horizontal timeline ─────────────────────── */
	.pwc-next { background:#fbf9f3; border:1px solid rgba(184,137,60,.32); border-radius:18px;
		padding:46px 40px 40px; box-shadow:0 20px 50px -30px rgba(184,137,60,.45); }
	.pwc-next-title {
		font-family:'Cormorant Garamond',Georgia,serif; font-weight:600;
		font-size:36px; line-height:1.05; text-align:center; margin:0; color:#B8893C;
		background:linear-gradient(180deg,#d9b877 0%,#b8893c 48%,#95602a 100%);
		-webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent;
	}
	@supports not ((-webkit-background-clip:text) or (background-clip:text)) {
		.pwc-next-title { -webkit-text-fill-color:#B8893C; color:#B8893C; }
	}
	.pwc-next-divider { display:flex; align-items:center; justify-content:center; gap:14px; margin:14px 0 42px; }
	.pwc-next-divider-line { width:72px; height:1px; background:linear-gradient(90deg,rgba(184,137,60,0),#c9a24a); }
	.pwc-next-divider-line:last-child { background:linear-gradient(90deg,#c9a24a,rgba(184,137,60,0)); }
	.pwc-next-star { display:block; }

	.pwc-next-steps { list-style:none; margin:0; padding:0; display:grid; grid-template-columns:repeat(5,1fr); }
	.pwc-next-step { position:relative; text-align:center; padding:0 10px; }
	.pwc-next-iconrow { display:flex; align-items:center; justify-content:center; height:78px; margin:0 auto 18px; }
	.pwc-next-icon {
		display:flex; align-items:center; justify-content:center;
		width:78px; height:78px; border-radius:50%;
		background:#fff; border:1px solid rgba(184,137,60,.35);
		box-shadow:0 10px 22px -12px rgba(184,137,60,.55);
	}
	.pwc-next-icon svg { width:34px; height:34px; }
	/* Gold connector between adjacent icons, with a midpoint dot (desktop). */
	.pwc-next-step:not(:last-child)::after {
		content:''; position:absolute; top:39px; left:calc(50% + 46px);
		width:calc(100% - 92px); height:1px;
		background:linear-gradient(90deg,#e3d1a3,#c9a24a,#e3d1a3);
	}
	.pwc-next-step:not(:last-child)::before {
		content:''; position:absolute; top:39px; left:100%;
		width:5px; height:5px; margin:-2.5px 0 0 -2.5px;
		background:#c9a24a; border-radius:50%; z-index:1;
	}
	.pwc-next-step-title { font-family:'Cormorant Garamond',Georgia,serif; font-weight:600;
		font-size:18px; line-height:1.25; color:#0A1F44; margin:0 0 9px; }
	.pwc-next-step-body { font-family:'Jost',sans-serif; font-size:13px; line-height:1.7; color:#6a6973; margin:0; }

	/* Carousel arrows — hidden on desktop (grid layout needs no paging). */
	.pwc-next-nav { display:none; justify-content:center; gap:18px; margin-top:24px; }
	.pwc-next-arrow {
		width:46px; height:46px; border-radius:50%;
		display:inline-flex; align-items:center; justify-content:center;
		background:#fff; border:1px solid rgba(184,137,60,.4); color:#B8893C; cursor:pointer;
		box-shadow:0 8px 20px -12px rgba(184,137,60,.6);
		transition:border-color .2s ease, transform .15s ease, opacity .2s ease;
		-webkit-tap-highlight-color:transparent;
	}
	.pwc-next-arrow:hover:not(:disabled) { border-color:#B8893C; transform:translateY(-1px); }
	.pwc-next-arrow:focus-visible { outline:2px solid #B8893C; outline-offset:3px; }
	.pwc-next-arrow:disabled { opacity:.35; cursor:default; box-shadow:none; }
	.pwc-next-arrow svg { width:20px; height:20px; }

	/* ── Tablet / mobile: horizontal scroll-snap carousel (one step at a time) ─── */
	@media (max-width:760px){
		.pwc-next { padding:34px 18px 30px; }
		.pwc-next-title { font-size:29px; }
		.pwc-next-divider { margin:12px 0 26px; }
		.pwc-next-divider-line { width:50px; }

		.pwc-next-steps {
			display:flex; gap:14px; overflow-x:auto;
			scroll-snap-type:x mandatory; scroll-padding:0 2px;
			-webkit-overflow-scrolling:touch; scrollbar-width:none;
			margin:0; padding:4px 2px 2px;
		}
		.pwc-next-steps::-webkit-scrollbar { display:none; }

		.pwc-next-step { flex:0 0 80%; max-width:80%; scroll-snap-align:start; padding:6px 6px 2px; }
		.pwc-next-step:not(:last-child)::after,
		.pwc-next-step:not(:last-child)::before { display:none; }  /* no connectors in carousel */

		.pwc-next-iconrow { height:auto; margin:0 auto 16px; }
		.pwc-next-icon { width:66px; height:66px; }
		.pwc-next-icon svg { width:30px; height:30px; }
		.pwc-next-step-title { font-size:18px; margin:0 0 8px; }
		.pwc-next-step-body { font-size:13.5px; line-height:1.72; }

		.pwc-next-nav { display:flex; }
	}

	@media (max-width:600px){
		.pwc-confirmation-card { padding:24px 20px; }
		.pwc-confirmation-logo { width:158px; margin-bottom:18px; }
		.pwc-confirmation-title { font-size:36px; }
		.pwc-confirmation-note { margin:20px auto 0; padding:12px 16px; gap:11px; }
		.pwc-confirmation-note-text { font-size:13px; }
		.pwc-next { padding:30px 16px 26px; }
		.pwc-next-step { flex-basis:84%; max-width:84%; }
		.pwc-confirmation-k2 { min-width:0; display:block; margin-bottom:2px; }
	}
	</style>
	<?php
}, 99 );

/* 4a. JS — "What Happens Next" mobile carousel paging.
 *     Manual only: arrows scroll the snap track by one step. No autoplay, no loop.
 *     Inert on desktop (arrows hidden; track is a grid with nothing to scroll). */
add_action( 'wp_footer', function () {
	if ( ! pwc_oc_is_received() ) return;
	?>
	<script>
	document.addEventListener('DOMContentLoaded', function () {
		var track = document.querySelector('.pwc-next-steps');
		var prev  = document.querySelector('.pwc-next-arrow[data-dir="prev"]');
		var next  = document.querySelector('.pwc-next-arrow[data-dir="next"]');
		if ( ! track || ! prev || ! next ) return;

		function stepSize() {
			var step = track.querySelector('.pwc-next-step');
			if ( ! step ) return track.clientWidth;
			var cs  = getComputedStyle(track);
			var gap = parseFloat(cs.columnGap || cs.gap || '0') || 0;
			return step.getBoundingClientRect().width + gap;
		}
		function update() {
			var max = track.scrollWidth - track.clientWidth - 1;
			prev.disabled = track.scrollLeft <= 1;
			next.disabled = track.scrollLeft >= max;   // never loops back to start
		}
		prev.addEventListener('click', function () { track.scrollBy({ left: -stepSize(), behavior: 'smooth' }); });
		next.addEventListener('click', function () { track.scrollBy({ left:  stepSize(), behavior: 'smooth' }); });
		track.addEventListener('scroll', function () { window.requestAnimationFrame(update); }, { passive: true });
		window.addEventListener('resize', update);
		update();
	});
	</script>
	<?php
}, 100 );

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
 * 5b. CHECKOUT PAGE back-button guard
 *     Fires only on the WooCommerce checkout page (not order-received, not pay).
 *     When a customer presses the browser back button while on the checkout form,
 *     redirect them to the branded homepage instead of the handoff URL or a
 *     broken empty-cart checkout state.
 *     Does NOT interfere with payment gateway redirects or form submission.
 * ─────────────────────────────────────────────────────────────────────────── */
add_action( 'wp_footer', function () {
	if ( ! function_exists( 'is_checkout' ) || ! is_checkout() ) return;
	if ( pwc_oc_is_received() ) return;
	if ( function_exists( 'is_wc_endpoint_url' ) && is_wc_endpoint_url( 'order-pay' ) ) return;
	?>
	<script>
	(function () {
		// Only arm the guard once the checkout form is present (not on payment gateways).
		if ( ! document.querySelector( 'form.woocommerce-checkout, .wc-block-checkout' ) ) return;
		try {
			history.pushState( null, '', location.href );
			window.addEventListener( 'popstate', function () {
				window.location.replace( <?php echo wp_json_encode( pwc_oc_frontend() . '/' ); ?> );
			} );
		} catch ( e ) {}
	})();
	</script>
	<?php
} );


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
