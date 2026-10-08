<?php
/**
 * PHP tests for the WooCommerce snippets, against the stand-ins in stubs.php.
 *
 *   php tests/php/run.php
 *   NEXT_URL=http://127.0.0.1:3100 php tests/php/run.php   (+ cross-check a real
 *       handoff link produced by the running Next.js server; same secret)
 */

error_reporting( E_ALL );
ini_set( 'log_errors', '0' );           // snippets log to error_log — keep test output clean
ini_set( 'error_log', PHP_OS_FAMILY === 'Windows' ? 'NUL' : '/dev/null' );

require __DIR__ . '/stubs.php';

define( 'PWC_CART_HANDOFF_SECRET', getenv( 'PWC_CART_HANDOFF_SECRET' ) ?: 'test-handoff-secret-0123456789abcdef' );

$S = ( getenv( 'SNIPPETS_DIR' ) ?: dirname( __DIR__, 2 ) . '/woocommerce-snippets' ) . '/';
foreach ( array(
	'pwc-competition-lifecycle.php',
	'checkout-quantity-controls.php',
	'pwc-skill-challenge-order-meta.php',
	'pwc-cart-handoff.php',
	'pwc-competition-entries.php',
	'pwc-ticket-bundle-discounts.php',
	'cors-and-checkout.php',
	'pwc-offer-cpt.php',
) as $file ) {
	require $S . $file;
}

/** Build a handoff link exactly like app/api/prepare-checkout/route.ts. */
function signed_link( $items, $ts = null, $extra = array() ) {
	$payload = array_merge( array( 'v' => 2, 'items' => $items, 'ts' => $ts ?? time(), 'nonce' => bin2hex( random_bytes( 16 ) ) ), $extra );
	$enc     = rtrim( strtr( base64_encode( json_encode( $payload ) ), '+/', '-_' ), '=' );
	return array( 'pwc_cart' => $enc, 'pwc_sig' => hash_hmac( 'sha256', $enc, PWC_CART_HANDOFF_SECRET ) );
}

/** Run the handoff for $get; returns ['redirect'=>url] or ['die'=>status,'msg'=>…]. */
function run_handoff( $get ) {
	$_GET = $get;
	try {
		pwc_handle_cart_handoff();
		return array( 'none' => true );
	} catch ( WpRedirect $r ) {
		return array( 'redirect' => $r->getMessage() );
	} catch ( WpDie $d ) {
		return array( 'die' => $d->status, 'msg' => $d->getMessage() );
	}
}

function order_line_result( $answer ) {
	$item = new WC_Order_Item_Product( 9001, 1 );
	pwc_sk_save_order_item_meta( $item, 'k', null === $answer ? array() : array( 'pwc_skill_answer' => $answer ), null );
	return $item->get_meta( '_pwc_skill_result' );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
section( 'Competition lifecycle (pwc-competition-lifecycle.php)' );
reset_state();
make_competition( 9001 );
check( 'live' === pwc_cl_effective_status( 9001 ), 'live competition is live' );
make_competition( 9003, array( 'go_live_date' => gmdate( 'Y-m-d H:i:s', time() + 7200 ) ) );
check( 'scheduled' === pwc_cl_effective_status( 9003 ), 'future Go Live → scheduled' );
make_competition( 9004, array( 'stock' => 0 ) );
check( 'closed' === pwc_cl_effective_status( 9004 ), 'stock 0 → closed (sold out)' );
make_competition( 9005, array( 'entries_close_date' => gmdate( 'Y-m-d H:i:s', time() - 7200 ) ) );
check( 'closed' === pwc_cl_effective_status( 9005 ), 'deadline passed → closed' );
make_competition( 9006, array( 'competition_status' => 'competition_closed', '_pwc_cl_manual_close' => '1' ) );
check( 'closed' === pwc_cl_effective_status( 9006 ), 'manual close holds' );
make_competition( 9007, array( 'competition_status' => 'competition_closed' ) );
check( 'live' === pwc_cl_effective_status( 9007 ), 'automatic close does not stick once dates/stock allow entries' );
make_competition( 9008, array( 'competition_status' => 'closed' ) );
check( 'archived' === pwc_cl_effective_status( 9008 ), 'To Past Winners → archived' );
check( false === wc_get_product( 9005 )->is_purchasable(), 'closed competition is not purchasable' );
check( true === wc_get_product( 9001 )->is_purchasable(), 'live competition is purchasable' );

/* ═══════════════════════════════════════════════════════════════════════════ */
section( 'Quantity caps (checkout-quantity-controls.php)' );
make_competition( 9010, array( 'total_entries' => 400, 'max_entries_percentage' => 20 ) );
check( 80 === pwc_get_allowed_max_qty( 9010 ), '400 entries × 20% → max 80 per order' );
make_competition( 9011, array( 'stock' => 12 ) );
check( 12 === pwc_get_allowed_max_qty( 9011 ), 'live stock below the cap wins (12)' );
make_competition( 9012 ); wc_get_product( 9012 )->sold_individually = true;
check( 1 === pwc_get_allowed_max_qty( 9012 ), 'sold individually → 1' );
check( 80 === pwc_store_api_quantity_maximum( 9999, wc_get_product( 9010 ) ), 'Store API maximum is capped to 80' );
check( 5 === pwc_store_api_quantity_maximum( 5, wc_get_product( 9010 ) ), 'Store API maximum keeps a lower value' );

/* ═══════════════════════════════════════════════════════════════════════════ */
section( 'Skill question (pwc-skill-challenge-order-meta.php)' );
reset_state();
make_competition( 9001 );
check( '' === pwc_sk_config_problem( 9001 ), 'complete question accepted' );
make_competition( 9002, array( 'correct_answer' => 'DAYTONA' ) );
check( 'correct_answer_not_an_option' === pwc_sk_config_problem( 9002 ), 'correct answer not among options → problem' );
make_competition( 9020, array( 'correct_answer' => '' ) );
check( 'missing_correct_answer' === pwc_sk_config_problem( 9020 ), 'missing correct answer → problem' );
make_competition( 9021, array( 'answer_options' => '' ) );
check( 'missing_options' === pwc_sk_config_problem( 9021 ), 'missing options → problem' );

check( false === WC()->cart->add_to_cart( 9001, 1 ), 'direct add-to-cart (no signed handoff) is refused' );
check( ! empty( wc_get_notices( 'error' ) ), '…with a customer notice' );
$GLOBALS['pwc_handoff_skill_answers'] = array( 9001 => 'gmt-master ii', 9002 => 'SUBMARINER' );
$key = WC()->cart->add_to_cart( 9001, 2 );
check( false !== $key, 'add-to-cart with a verified handoff answer is allowed' );
check( 'GMT-MASTER II' === WC()->cart->items[ $key ]['pwc_skill_answer'], 'answer stored as the canonical option label' );
check( false === WC()->cart->add_to_cart( 9002, 1 ), 'misconfigured competition cannot be added (fail closed)' );
$GLOBALS['pwc_handoff_skill_answers'] = array( 9001 => 'DAYTONA' );
WC()->cart->empty_cart();
check( false === WC()->cart->add_to_cart( 9001, 1 ), 'an answer that is not an option is refused' );
unset( $GLOBALS['pwc_handoff_skill_answers'] );
$GLOBALS['__products'][ 777 ] = new WC_Product( 777, 'Gift card' );
check( false !== WC()->cart->add_to_cart( 777, 1 ), 'non-competition products are unaffected' );

reset_state();
WC()->cart->items['legacy'] = array( 'product_id' => 9001, 'quantity' => 1 ); // added before this snippet existed
WC()->cart->items['ok'] = array( 'product_id' => 9001, 'quantity' => 1, 'pwc_skill_answer' => 'SUBMARINER' );
pwc_sk_check_cart_items();
check( ! isset( WC()->cart->items['legacy'] ) && isset( WC()->cart->items['ok'] ), 'cart re-validation removes only items without a recorded answer' );

$threw = false;
try { pwc_sk_store_api_validate_cart_item( wc_get_product( 9001 ), array( 'product_id' => 9001 ) ); } catch ( Exception $e ) { $threw = true; }
check( $threw, 'Block checkout (Store API) refuses a competition without an answer' );
$threw = false;
try { pwc_sk_store_api_validate_add_to_cart( wc_get_product( 9001 ), null ); } catch ( Exception $e ) { $threw = true; }
check( $threw, 'Store API add-to-cart of a competition is refused' );

check( 'Correct' === order_line_result( 'SUBMARINER' ), 'order line: right answer → Correct (decided server-side)' );
check( 'Correct' === order_line_result( 'submariner' ), 'order line: comparison is case-insensitive' );
check( 'Incorrect' === order_line_result( 'AIR-KING' ), 'order line: wrong answer → Incorrect' );
check( 'Unverified' === order_line_result( null ), 'order line: no answer → Unverified (fail closed)' );
update_post_meta( 9001, 'correct_answer', '' );
check( 'Unverified' === order_line_result( 'SUBMARINER' ), 'order line: correct answer missing at order time → Unverified' );
update_post_meta( 9001, 'correct_answer', 'SUBMARINER' );

$resp = new WP_REST_Response( array(
	'id'        => 9001,
	'acf'       => array( 'correct_answer' => 'SUBMARINER', 'answer_options' => 'x' ),
	'meta_data' => array( array( 'key' => 'correct_answer', 'value' => 'SUBMARINER' ), array( 'key' => 'other', 'value' => 1 ) ),
) );
$public = pwc_sk_hide_answer_in_rest( clone $resp, null, null )->get_data();
check( ! isset( $public['acf']['correct_answer'] ) && isset( $public['acf']['answer_options'] ), 'public REST: correct_answer removed from acf, options kept' );
check( 1 === count( $public['meta_data'] ), 'public REST: correct_answer removed from meta_data' );
$GLOBALS['__caps']['edit_products'] = true;
$editor = pwc_sk_hide_answer_in_rest( clone $resp, null, null )->get_data();
check( 'SUBMARINER' === $editor['acf']['correct_answer'], 'product editors / the Next.js API key still see it' );

/* ═══════════════════════════════════════════════════════════════════════════ */
section( 'Checkout handoff (pwc-cart-handoff.php)' );
reset_state();
make_competition( 9001 );
make_competition( 9005, array( 'entries_close_date' => gmdate( 'Y-m-d H:i:s', time() - 7200 ) ) );

$link = signed_link( array( array( 'id' => 9001, 'qty' => 500, 'skillAnswer' => 'YACHT-MASTER' ) ) );
$r = run_handoff( $link );
check( isset( $r['redirect'] ) && false !== strpos( $r['redirect'], '/checkout/' ), 'valid link → redirect to checkout' );
$line = array_values( WC()->cart->items );
check( 1 === count( $line ) && 9001 === $line[0]['product_id'], 'cart replaced with exactly the signed item' );
check( 80 === $line[0]['quantity'], 'quantity capped server-side to the per-order limit (500 → 80)' );
check( 'YACHT-MASTER' === $line[0]['pwc_skill_answer'], 'verified skill answer recorded on the cart item' );
check( ! isset( $GLOBALS['pwc_handoff_skill_answers'] ), 'verified answers are not left around after the handoff' );

WC()->cart->items[ array_keys( WC()->cart->items )[0] ]['quantity'] = 3; // customer changed qty at checkout
$r = run_handoff( $link );
check( isset( $r['redirect'] ) && 3 === array_values( WC()->cart->items )[0]['quantity'], 'replayed link → straight to checkout, cart NOT rebuilt (no duplicates)' );
WC()->cart->empty_cart();
$r = run_handoff( $link );
check( isset( $r['die'] ) && 410 === $r['die'], 'replayed link with an empty cart → "already used" (410)' );

$bad = signed_link( array( array( 'id' => 9001, 'qty' => 1, 'skillAnswer' => 'SUBMARINER' ) ) );
$bad['pwc_sig'] = str_repeat( '0', 64 );
$r = run_handoff( $bad );
check( isset( $r['die'] ) && 403 === $r['die'], 'wrong signature → 403' );

$t = signed_link( array( array( 'id' => 9001, 'qty' => 1, 'skillAnswer' => 'SUBMARINER' ) ) );
$p = json_decode( base64_decode( strtr( $t['pwc_cart'], '-_', '+/' ) ), true );
$p['items'][0]['qty'] = 2;
$t['pwc_cart'] = rtrim( strtr( base64_encode( json_encode( $p ) ), '+/', '-_' ), '=' );
$r = run_handoff( $t );
check( isset( $r['die'] ) && 403 === $r['die'], 'tampered payload with the old signature → 403' );

$r = run_handoff( signed_link( array( array( 'id' => 9001, 'qty' => 1, 'skillAnswer' => 'SUBMARINER' ) ), time() - 400 ) );
check( isset( $r['die'] ) && 410 === $r['die'], 'link older than 5 minutes → expired (410)' );
$r = run_handoff( signed_link( array( array( 'id' => 9001, 'qty' => 1, 'skillAnswer' => 'SUBMARINER' ) ), time() + 3600 ) );
check( isset( $r['die'] ) && 410 === $r['die'], 'link dated in the future → rejected' );

reset_state();
$r = run_handoff( signed_link( array( array( 'id' => 9005, 'qty' => 1, 'skillAnswer' => 'SUBMARINER' ) ) ) );
check( isset( $r['die'] ) && 409 === $r['die'], 'closed competition only → friendly refusal (409)' );
check( isset( $r['msg'] ) && false === strpos( $r['msg'], 'Debug' ) && false === strpos( $r['msg'], 'stock_qty' ), 'no internal debug dump shown to the customer' );

reset_state();
$r = run_handoff( signed_link( array( array( 'id' => 9001, 'qty' => 1, 'skillAnswer' => 'DAYTONA' ) ) ) );
check( isset( $r['die'] ), 'signed but invalid answer still cannot enter the cart' );

reset_state();
// Old (v1) payload from a not-yet-updated frontend: client "Correct" is ignored.
$r = run_handoff( signed_link( array( array( 'id' => 9001, 'qty' => 1, 'skillAnswer' => 'AIR-KING', 'skillResult' => 'Correct' ) ), null, array( 'v' => 1 ) ) );
$line = array_values( WC()->cart->items );
check( isset( $r['redirect'] ) && 'Incorrect' === order_line_result( $line[0]['pwc_skill_answer'] ), 'client-supplied "Correct" is ignored — WordPress decides (Incorrect)' );

$next = getenv( 'NEXT_URL' );
if ( $next ) {
	reset_state();
	$ctx  = stream_context_create( array( 'http' => array( 'method' => 'POST', 'header' => "Content-Type: application/json\r\n", 'content' => json_encode( array( 'items' => array( array( 'id' => 9001, 'qty' => 2, 'skillAnswer' => 'SUBMARINER' ) ) ) ), 'ignore_errors' => true ) ) );
	$body = json_decode( (string) @file_get_contents( rtrim( $next, '/' ) . '/api/prepare-checkout', false, $ctx ), true );
	$url  = isset( $body['url'] ) ? $body['url'] : '';
	parse_str( (string) parse_url( $url, PHP_URL_QUERY ), $q );
	$r = run_handoff( $q );
	check( isset( $r['redirect'] ) && 2 === array_values( WC()->cart->items )[0]['quantity'], 'interop: a link signed by the running Next.js server is accepted by the PHP handoff' );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
section( 'Draw entries export (pwc-competition-entries.php)' );
reset_state();
make_competition( 9001 );
$ok = array( '_pwc_skill_answer' => 'SUBMARINER', '_pwc_correct_answer' => 'SUBMARINER' );
$GLOBALS['__orders'] = array(
	new WC_Order( 101, array( 1 => new WC_Order_Item_Product( 9001, 3, $ok ) ) ),                                            // 3 valid
	new WC_Order( 102, array( 1 => new WC_Order_Item_Product( 9001, 2, array( '_pwc_skill_answer' => 'AIR-KING', '_pwc_correct_answer' => 'SUBMARINER' ) ) ) ), // wrong
	new WC_Order( 103, array( 1 => new WC_Order_Item_Product( 9001, 4 ) ) ),                                                 // no answer recorded
	new WC_Order( 104, array( 7 => new WC_Order_Item_Product( 9001, 5, $ok ) ), true, 1000, array( 7 => 1 ) ),               // 1 refunded → 4
	new WC_Order( 105, array( 1 => new WC_Order_Item_Product( 9001, 2, $ok ) ), false ),                                     // unpaid
	new WC_Order( 106, array( 1 => new WC_Order_Item_Product( 9001, 9, $ok ) ), true, 999999 ),                             // paid after cutoff
	new WC_Order( 107, array( 1 => new WC_Order_Item_Product( 4242, 6, $ok ) ) ),                                            // other competition
	new WC_Order( 108, array( 2 => new WC_Order_Item_Product( 9001, 2, $ok ) ), true, 1000, array( 2 => 2 ) ),               // fully refunded
);
$data = pwc_ce_collect( 9001, array( 'wc-processing', 'wc-completed' ), 5000, true );
check( 7 === (int) $data['total_valid_entries'], 'only verified-correct, paid, in-window, non-refunded tickets count (3 + 4 = 7)' );
check( 7 === count( $data['rows'] ), 'one CSV row per valid ticket' );
check( 2 === $data['excluded_incorrect_tickets'], 'wrong-answer tickets excluded (2)' );
check( 4 === $data['excluded_unverified_tickets'], 'tickets without a verifiable answer excluded (4)' );
check( 1 === $data['unpaid_unconfirmed'], 'unpaid order excluded' );
check( 1 === $data['zero_invalid_items'], 'fully refunded line excluded' );
check( 'correct' === pwc_ce_skill_status( new WC_Order_Item_Product( 1, 1, array( '_pwc_skill_answer' => ' gmt-master  II', '_pwc_correct_answer' => 'GMT-MASTER II' ) ) ), 'answer comparison tolerates case/whitespace' );

/* ═══════════════════════════════════════════════════════════════════════════ */
section( 'Bundle discounts (pwc-ticket-bundle-discounts.php)' );
reset_state();
make_competition( 9001, array( 'price' => 4.99 ) );
$cart = WC()->cart;
$cart->items['a'] = array( 'product_id' => 9001, 'quantity' => 10, 'data' => clone wc_get_product( 9001 ) );
pwc_bundle_apply_discounts( $cart );
check( abs( $cart->items['a']['data']->get_price() - 4.24 ) < 0.001, '10 tickets → 15% bundle price 4.24 (matches frontend)' );
$cart->coupons = array( 'WELCOME10' );
pwc_bundle_apply_discounts( $cart ); // same request, coupon applied after the first calculation
check( abs( $cart->items['a']['data']->get_price() - 4.99 ) < 0.001, 'with a coupon (no stacking) the price is RESET to 4.99 — never double-discounted' );
$cart->coupons = array();
$cart->items['a']['quantity'] = 2;
pwc_bundle_apply_discounts( $cart );
check( abs( $cart->items['a']['data']->get_price() - 4.99 ) < 0.001, 'below the first tier → full price' );
make_competition( 9030, array( 'price' => 0, 'competition_type' => 'free' ) );
check( false === pwc_bundle_is_eligible( wc_get_product( 9030 ) ), 'free competition is never discounted' );

/* ═══════════════════════════════════════════════════════════════════════════ */
section( 'CORS / CSRF (cors-and-checkout.php) and offer debug endpoint (pwc-offer-cpt.php)' );
$origins = apply_filters( 'allowed_http_origins', array() );
check( in_array( 'https://www.premiumwatchclub.com', $origins, true ) && in_array( 'https://premiumwatchclub.com', $origins, true ), 'storefront origins (www + apex) allowed' );
check( ! in_array( 'http://localhost:3000', $origins, true ), 'localhost not allowed on a production WordPress' );
check( empty( $GLOBALS['__hooks']['woocommerce_store_api_disable_nonce_check'] ), 'Store API CSRF nonce check is no longer disabled' );
do_action( 'rest_api_init' );
$perm = $GLOBALS['__routes']['pwc/v1/active-offer-debug']['permission_callback'];
$GLOBALS['__caps'] = array();
check( false === call_user_func( $perm ), 'active-offer-debug: anonymous visitors refused' );
$GLOBALS['__caps']['manage_woocommerce'] = true;
check( true === call_user_func( $perm ), 'active-offer-debug: shop managers allowed' );

/* ═══════════════════════════════════════════════════════════════════════════ */
printf( "\n%d passed, %d failed\n", $GLOBALS['__pass'], $GLOBALS['__fail'] );
exit( $GLOBALS['__fail'] ? 1 : 0 );
