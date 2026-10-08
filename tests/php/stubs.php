<?php
/**
 * Minimal WordPress + WooCommerce stand-ins so the PWC snippets can be loaded
 * and exercised with a plain PHP CLI. Only what the snippets under test use.
 * This is a test double, not an emulation of WordPress.
 */

define( 'ABSPATH', __DIR__ . '/' );
define( 'MINUTE_IN_SECONDS', 60 );

/* ── Hooks ─────────────────────────────────────────────────────────────────── */
$GLOBALS['__hooks'] = array();
function add_filter( $tag, $cb, $prio = 10, $args = 1 ) { $GLOBALS['__hooks'][ $tag ][ $prio ][] = array( $cb, $args ); return true; }
function add_action( $tag, $cb, $prio = 10, $args = 1 ) { return add_filter( $tag, $cb, $prio, $args ); }
function apply_filters( $tag, $value, ...$rest ) {
	if ( empty( $GLOBALS['__hooks'][ $tag ] ) ) return $value;
	ksort( $GLOBALS['__hooks'][ $tag ] );
	foreach ( $GLOBALS['__hooks'][ $tag ] as $cbs ) {
		foreach ( $cbs as $c ) { $value = call_user_func_array( $c[0], array_slice( array_merge( array( $value ), $rest ), 0, max( 1, $c[1] ) ) ); }
	}
	return $value;
}
function do_action( $tag, ...$args ) {
	if ( empty( $GLOBALS['__hooks'][ $tag ] ) ) return;
	ksort( $GLOBALS['__hooks'][ $tag ] );
	foreach ( $GLOBALS['__hooks'][ $tag ] as $cbs ) {
		foreach ( $cbs as $c ) { call_user_func_array( $c[0], array_slice( $args, 0, $c[1] ) ); }
	}
}
$GLOBALS['__routes'] = array();
function register_rest_route( $ns, $route, $args ) { $GLOBALS['__routes'][ $ns . $route ] = $args; }
class WP_REST_Server { const READABLE = 'GET'; }
function wp_get_environment_type() { return isset( $GLOBALS['__env'] ) ? $GLOBALS['__env'] : 'production'; }
function register_setting() {}

/* ── Escaping / i18n / sanitising ──────────────────────────────────────────── */
function __( $t ) { return $t; }
function esc_html__( $t ) { return $t; }
function esc_html_e( $t ) { echo $t; }
function esc_html( $t ) { return htmlspecialchars( (string) $t, ENT_QUOTES ); }
function esc_attr( $t ) { return htmlspecialchars( (string) $t, ENT_QUOTES ); }
function esc_url( $t ) { return (string) $t; }
function esc_url_raw( $t ) { return (string) $t; }
function sanitize_text_field( $t ) { return trim( strip_tags( (string) $t ) ); }
function sanitize_key( $t ) { return strtolower( preg_replace( '/[^a-z0-9_\-]/i', '', (string) $t ) ); }
function wp_unslash( $v ) { return $v; }
function absint( $v ) { return abs( (int) $v ); }
function wp_strip_all_tags( $t ) { return strip_tags( (string) $t ); }
function wp_json_encode( $v ) { return json_encode( $v ); }
function number_format_i18n( $n ) { return (string) $n; }

/* ── Errors / redirects (thrown so tests can observe them) ─────────────────── */
class WP_Error {
	private $code;
	public function __construct( $code = '' ) { $this->code = $code; }
	public function get_error_code() { return $this->code; }
}
function is_wp_error( $v ) { return $v instanceof WP_Error; }
class WpDie extends Exception { public $status; public function __construct( $msg, $status ) { parent::__construct( $msg ); $this->status = $status; } }
class WpRedirect extends Exception {}
function wp_die( $msg = '', $title = '', $args = array() ) { throw new WpDie( (string) $msg, isset( $args['response'] ) ? $args['response'] : 500 ); }
function wp_safe_redirect( $url ) { throw new WpRedirect( $url ); }
function wp_redirect( $url ) { throw new WpRedirect( $url ); }
function nocache_headers() {}
function status_header() {}

/* ── Options, meta, transients, users ──────────────────────────────────────── */
$GLOBALS['__meta'] = array(); $GLOBALS['__transients'] = array(); $GLOBALS['__options'] = array(); $GLOBALS['__caps'] = array();
function get_post_meta( $id, $key, $single = true ) { return isset( $GLOBALS['__meta'][ $id ][ $key ] ) ? $GLOBALS['__meta'][ $id ][ $key ] : ''; }
function update_post_meta( $id, $key, $v ) { $GLOBALS['__meta'][ $id ][ $key ] = $v; return true; }
function delete_post_meta( $id, $key ) { unset( $GLOBALS['__meta'][ $id ][ $key ] ); return true; }
function get_field( $key, $id ) { return get_post_meta( $id, $key ); }
function get_transient( $k ) { return isset( $GLOBALS['__transients'][ $k ] ) ? $GLOBALS['__transients'][ $k ] : false; }
function set_transient( $k, $v, $ttl = 0 ) { $GLOBALS['__transients'][ $k ] = $v; return true; }
function get_option( $k, $d = false ) { return isset( $GLOBALS['__options'][ $k ] ) ? $GLOBALS['__options'][ $k ] : $d; }
function update_option( $k, $v ) { $GLOBALS['__options'][ $k ] = $v; return true; }
function current_user_can( $cap ) { return ! empty( $GLOBALS['__caps'][ $cap ] ); }
function is_admin() { return ! empty( $GLOBALS['__is_admin'] ); }
function get_the_title( $id ) { $p = wc_get_product( $id ); return $p ? $p->get_name() : "#$id"; }
function wp_timezone() { return new DateTimeZone( 'Europe/London' ); }
function wp_timezone_string() { return 'Europe/London'; }
function clean_post_cache() {}
function update_field( $k, $v, $id ) { update_post_meta( $id, $k, $v ); }

/* ── WooCommerce ───────────────────────────────────────────────────────────── */
class WC_Product {
	public $id, $name, $stock, $regular, $price, $sold_individually = false, $parent = 0;
	public function __construct( $id, $name, $price = 4.99, $stock = 100 ) { $this->id = $id; $this->name = $name; $this->regular = $price; $this->price = $price; $this->stock = $stock; }
	public function get_id() { return $this->id; }
	public function get_parent_id() { return $this->parent; }
	public function get_name() { return $this->name; }
	public function get_stock_quantity() { return $this->stock; }
	public function get_sold_individually() { return $this->sold_individually; }
	public function is_type( $t ) { return 'simple' === $t; }
	public function get_type() { return 'simple'; }
	public function get_status() { return 'publish'; }
	public function is_purchasable() { return apply_filters( 'woocommerce_is_purchasable', true, $this ); }
	public function is_in_stock() { return null === $this->stock || $this->stock > 0; }
	public function get_regular_price() { return $this->regular; }
	public function get_price() { return $this->price; }
	public function set_price( $p ) { $this->price = $p; }
}
$GLOBALS['__products'] = array();
function wc_get_product( $id ) { return isset( $GLOBALS['__products'][ $id ] ) ? $GLOBALS['__products'][ $id ] : false; }

class WC_Cart {
	public $items = array(); public $coupons = array();
	public function empty_cart() { $this->items = array(); }
	public function is_empty() { return empty( $this->items ); }
	public function get_cart() { return $this->items; }
	public function get_applied_coupons() { return $this->coupons; }
	public function remove_cart_item( $k ) { unset( $this->items[ $k ] ); }
	public function set_quantity( $k, $q ) { $this->items[ $k ]['quantity'] = $q; }
	public function calculate_totals() {}
	public function add_to_cart( $pid, $qty ) {
		if ( ! apply_filters( 'woocommerce_add_to_cart_validation', true, $pid, $qty ) ) return false;
		$p = wc_get_product( $pid );
		if ( ! $p || ! $p->is_purchasable() ) { wc_add_notice( 'not purchasable', 'error' ); return false; }
		$data = apply_filters( 'woocommerce_add_cart_item_data', array(), $pid, 0, $qty );
		$key  = md5( $pid . json_encode( $data ) );
		$this->items[ $key ] = array_merge( $data, array( 'key' => $key, 'product_id' => $pid, 'quantity' => $qty, 'data' => clone $p ) );
		return $key;
	}
}
class WC_Main { public $cart; public $session = null; public function __construct() { $this->cart = new WC_Cart(); } }
$GLOBALS['__wc'] = new WC_Main();
function WC() { return $GLOBALS['__wc']; }
function wc_load_cart() {}
function wc_get_checkout_url() { return 'https://checkout.example.test/checkout/'; }
$GLOBALS['__notices'] = array();
function wc_add_notice( $msg, $type = 'success' ) { $GLOBALS['__notices'][ $type ][] = array( 'notice' => $msg ); }
function wc_get_notices( $type ) { return isset( $GLOBALS['__notices'][ $type ] ) ? $GLOBALS['__notices'][ $type ] : array(); }
function wc_clear_notices() { $GLOBALS['__notices'] = array(); }
function wc_price( $p ) { return '£' . number_format( (float) $p, 2 ); }

class WC_Order_Item_Product {
	public $meta = array(); public $pid, $qty;
	public function __construct( $pid, $qty, $meta = array() ) { $this->pid = $pid; $this->qty = $qty; $this->meta = $meta; }
	public function get_product_id() { return $this->pid; }
	public function get_variation_id() { return 0; }
	public function get_quantity() { return $this->qty; }
	public function get_meta( $k ) { return isset( $this->meta[ $k ] ) ? $this->meta[ $k ] : ''; }
	public function add_meta_data( $k, $v ) { $this->meta[ $k ] = $v; }
}
class WC_Order {
	public $items, $paid, $paid_at, $refunds, $number;
	public function __construct( $number, $items, $paid = true, $paid_at = 1000, $refunds = array() ) { $this->number = $number; $this->items = $items; $this->paid = $paid; $this->paid_at = $paid_at; $this->refunds = $refunds; }
	public function get_items( $type = 'line_item' ) { return $this->items; }
	public function is_paid() { return $this->paid; }
	public function get_date_paid() { return $this->paid_at ? new DateTimeImmutable( '@' . $this->paid_at ) : null; }
	public function get_qty_refunded_for_item( $id ) { return isset( $this->refunds[ $id ] ) ? -abs( $this->refunds[ $id ] ) : 0; }
	public function get_order_number() { return (string) $this->number; }
	public function get_id() { return $this->number; }
	public function get_customer_id() { return 0; }
	public function get_billing_email() { return "c{$this->number}@example.test"; }
	public function get_billing_first_name() { return 'Test'; }
	public function get_billing_last_name() { return 'Customer'; }
	public function get_billing_country() { return 'GB'; }
}
$GLOBALS['__orders'] = array();
function wc_get_orders( $args ) { return ( isset( $args['page'] ) && $args['page'] > 1 ) ? array() : $GLOBALS['__orders']; }

class WP_REST_Response {
	private $data;
	public function __construct( $d = null ) { $this->data = $d; }
	public function get_data() { return $this->data; }
	public function set_data( $d ) { $this->data = $d; }
}

/* ── Test helpers ──────────────────────────────────────────────────────────── */
$GLOBALS['__pass'] = 0; $GLOBALS['__fail'] = 0;
function check( $cond, $label ) {
	if ( $cond ) { $GLOBALS['__pass']++; echo "  ✔ $label\n"; }
	else { $GLOBALS['__fail']++; echo "  ✖ $label\n"; }
}
function section( $t ) { echo "\n$t\n"; }
function reset_state() {
	$GLOBALS['__wc'] = new WC_Main(); $GLOBALS['__notices'] = array(); $GLOBALS['__transients'] = array();
	$GLOBALS['__caps'] = array(); $_GET = array(); unset( $GLOBALS['pwc_handoff_skill_answers'] );
}
/** A live competition product with a complete skill question. */
function make_competition( $id, $over = array() ) {
	$GLOBALS['__products'][ $id ] = new WC_Product( $id, "Competition $id", isset( $over['price'] ) ? $over['price'] : 4.99, array_key_exists( 'stock', $over ) ? $over['stock'] : 100 );
	$GLOBALS['__meta'][ $id ] = array_merge( array(
		'competition_type'   => 'weekly',
		'competition_status' => 'live',
		'answer_options'     => "SUBMARINER\r\nGMT-MASTER II\r\nYACHT-MASTER\r\nAIR-KING",
		'correct_answer'     => 'SUBMARINER',
		'entries_close_date' => gmdate( 'Y-m-d H:i:s', time() + 86400 * 3 ),
		'total_entries'      => 400,
		'max_entries_percentage' => 20,
	), $over );
}
