<?php
/**
 * PWC Skill Challenge — server-side answer capture and verification
 * ─────────────────────────────────────────────────────────────────────────────
 * INSTALLATION (Code Snippets plugin)
 *   Snippets → edit the existing "PWC Skill Challenge" snippet → replace its code
 *   with EVERYTHING BELOW the `if ( ! defined( 'ABSPATH' ) ) exit;` line → Run
 *   everywhere → Save. Deploy together with the updated pwc-cart-handoff.php:
 *   this snippet only accepts skill answers that the handoff has verified.
 *
 * HOW IT WORKS
 *   1. The customer answers the skill question on premiumwatchclub.com.
 *   2. Next.js (/api/prepare-checkout) signs { id, qty, skillAnswer } per item.
 *      It never decides — or signs — whether the answer is correct.
 *   3. pwc-cart-handoff.php verifies the HMAC signature and expiry, then exposes
 *      the verified answers in $GLOBALS['pwc_handoff_skill_answers'] while it
 *      adds the items to the cart.
 *   4. THIS snippet only lets a competition into the cart with such a verified
 *      answer (fail closed), stores the answer on the cart item, and when the
 *      order is created decides Correct / Incorrect against the ACF
 *      `correct_answer` field — server-side, at order time.
 *   5. The Competition Entries export only counts tickets whose stored answer
 *      matches the stored correct answer.
 *
 * FAIL CLOSED
 *   • A competition can only be added to the cart through the signed handoff,
 *     with an answer that is one of its `answer_options`.
 *   • A competition whose skill question is incomplete (no options, no correct
 *     answer, or a correct answer that is not one of the options) cannot be
 *     added to the cart at all.
 *   • A cart item without a recorded answer is removed before checkout.
 *   • An order line without a verifiable answer is stored as "Unverified" and is
 *     never eligible for the draw.
 *
 * ALSO
 *   • Hides `correct_answer` from every public REST response (it was readable at
 *     /wp-json/wp/v2/product). Only users who can edit products still see it —
 *     the Next.js API key needs that to validate answers.
 *   • Shows the recorded answer and result on the admin order screen.
 *
 * REQUIREMENTS
 *   ACF fields on competition products: `answer_options` (textarea, one option
 *   per line) and `correct_answer` (text, exactly one of the options).
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/* ═══════════════════════════════════════════════════════════════════════════
 * 1. HELPERS
 * ═══════════════════════════════════════════════════════════════════════════ */

/** ACF first, raw post meta as fallback. */
function pwc_sk_field( $product_id, $key ) {
	if ( function_exists( 'get_field' ) ) {
		$v = get_field( $key, $product_id );
		if ( null !== $v && false !== $v && '' !== $v ) {
			return $v;
		}
	}
	return get_post_meta( $product_id, $key, true );
}

/** Is this product a competition? Uses the lifecycle snippet's definition when present. */
function pwc_sk_is_competition( $product_id ) {
	if ( function_exists( 'pwc_cl_is_competition' ) ) {
		return pwc_cl_is_competition( $product_id );
	}
	return '' !== trim( (string) pwc_sk_field( $product_id, 'competition_type' ) );
}

/** Trimmed, whitespace-collapsed, case-insensitive form used for every comparison. */
function pwc_sk_normalise( $value ) {
	$value = preg_replace( '/\s+/u', ' ', trim( (string) $value ) );
	return function_exists( 'mb_strtolower' ) ? mb_strtolower( $value ) : strtolower( $value );
}

/** The product's answer options (one per line in the ACF textarea). */
function pwc_sk_options( $product_id ) {
	$raw = pwc_sk_field( $product_id, 'answer_options' );
	if ( ! is_string( $raw ) || '' === trim( $raw ) ) {
		return array();
	}
	$lines = preg_split( '/\r\n|\r|\n/', $raw );
	return array_values( array_filter( array_map( 'trim', $lines ), 'strlen' ) );
}

function pwc_sk_correct_answer( $product_id ) {
	$raw = pwc_sk_field( $product_id, 'correct_answer' );
	return is_string( $raw ) ? trim( $raw ) : '';
}

/**
 * Why this competition's skill question cannot accept entries, or '' when it can.
 * Mirrors getSkillConfigProblem() in lib/skill-check.ts.
 */
function pwc_sk_config_problem( $product_id ) {
	$options = pwc_sk_options( $product_id );
	if ( empty( $options ) ) {
		return 'missing_options';
	}
	$correct = pwc_sk_normalise( pwc_sk_correct_answer( $product_id ) );
	if ( '' === $correct ) {
		return 'missing_correct_answer';
	}
	foreach ( $options as $option ) {
		if ( pwc_sk_normalise( $option ) === $correct ) {
			return '';
		}
	}
	return 'correct_answer_not_an_option';
}

/** The canonical option matching $answer, or '' when it is not one of the options. */
function pwc_sk_match_option( $product_id, $answer ) {
	$wanted = pwc_sk_normalise( $answer );
	if ( '' === $wanted ) {
		return '';
	}
	foreach ( pwc_sk_options( $product_id ) as $option ) {
		if ( pwc_sk_normalise( $option ) === $wanted ) {
			return $option;
		}
	}
	return '';
}

/** The verified answer the signed handoff supplied for this product in THIS request, or ''. */
function pwc_sk_handoff_answer( $product_id ) {
	$answers = isset( $GLOBALS['pwc_handoff_skill_answers'] ) && is_array( $GLOBALS['pwc_handoff_skill_answers'] )
		? $GLOBALS['pwc_handoff_skill_answers']
		: array();
	$product_id = absint( $product_id );
	return isset( $answers[ $product_id ] ) ? (string) $answers[ $product_id ] : '';
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 2. ADD TO CART — only via the signed handoff, only with a valid answer
 *    Covers ?add-to-cart= URLs, "order again", the Store API and the handoff.
 * ═══════════════════════════════════════════════════════════════════════════ */

add_filter( 'woocommerce_add_to_cart_validation', 'pwc_sk_validate_add_to_cart', 30, 3 );
function pwc_sk_validate_add_to_cart( $passed, $product_id, $quantity ) {
	if ( ! $passed || ! pwc_sk_is_competition( $product_id ) ) {
		return $passed;
	}

	if ( '' !== pwc_sk_config_problem( $product_id ) ) {
		error_log( sprintf( '[PWC skill] add-to-cart blocked: product #%d skill question incomplete (%s)', $product_id, pwc_sk_config_problem( $product_id ) ) );
		wc_add_notice( __( 'Entries for this competition are temporarily unavailable. Please try again later.', 'pwc' ), 'error' );
		return false;
	}

	if ( '' === pwc_sk_match_option( $product_id, pwc_sk_handoff_answer( $product_id ) ) ) {
		wc_add_notice( __( 'Please enter through premiumwatchclub.com and answer the skill question to take part.', 'pwc' ), 'error' );
		return false;
	}

	return $passed;
}

/** Store the verified answer on the cart item (it is then saved in the WC session). */
add_filter( 'woocommerce_add_cart_item_data', 'pwc_sk_add_cart_item_data', 10, 2 );
function pwc_sk_add_cart_item_data( $cart_item_data, $product_id ) {
	if ( ! pwc_sk_is_competition( $product_id ) ) {
		return $cart_item_data;
	}
	$answer = pwc_sk_match_option( $product_id, pwc_sk_handoff_answer( $product_id ) );
	if ( '' !== $answer ) {
		$cart_item_data['pwc_skill_answer'] = $answer;
	}
	return $cart_item_data;
}

/** Keep the answer when the cart is restored from the session on later requests. */
add_filter( 'woocommerce_get_cart_item_from_session', 'pwc_sk_restore_cart_item', 10, 2 );
function pwc_sk_restore_cart_item( $cart_item, $values ) {
	if ( isset( $values['pwc_skill_answer'] ) ) {
		$cart_item['pwc_skill_answer'] = (string) $values['pwc_skill_answer'];
	}
	return $cart_item;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 3. CART RE-VALIDATION — no competition reaches checkout without an answer
 *    Runs on cart, checkout and Store API cart validation.
 * ═══════════════════════════════════════════════════════════════════════════ */

add_action( 'woocommerce_check_cart_items', 'pwc_sk_check_cart_items', 6 );
function pwc_sk_check_cart_items() {
	if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
		return;
	}
	$removed = false;
	foreach ( WC()->cart->get_cart() as $key => $item ) {
		$product_id = isset( $item['product_id'] ) ? (int) $item['product_id'] : 0;
		if ( ! $product_id || ! pwc_sk_is_competition( $product_id ) ) {
			continue;
		}
		$answer = isset( $item['pwc_skill_answer'] ) ? (string) $item['pwc_skill_answer'] : '';
		if ( '' !== pwc_sk_config_problem( $product_id ) || '' === pwc_sk_match_option( $product_id, $answer ) ) {
			WC()->cart->remove_cart_item( $key );
			wc_add_notice(
				sprintf(
					/* translators: %s: competition name. */
					__( '"%s" was removed from your basket because its skill question has not been answered. Please enter again through premiumwatchclub.com.', 'pwc' ),
					get_the_title( $product_id )
				),
				'error'
			);
			$removed = true;
		}
	}
	if ( $removed ) {
		WC()->cart->calculate_totals();
	}
}

/**
 * Store API (Block cart/checkout) equivalents. Competitions are never added
 * through the Store API — only through the handoff — and a Block checkout must
 * not proceed with a competition that has no recorded answer.
 */
function pwc_sk_store_api_error( $message ) {
	if ( class_exists( '\Automattic\WooCommerce\StoreApi\Exceptions\RouteException' ) ) {
		return new \Automattic\WooCommerce\StoreApi\Exceptions\RouteException( 'pwc_skill_required', $message, 400 );
	}
	return new Exception( $message );
}

add_action( 'woocommerce_store_api_validate_add_to_cart', 'pwc_sk_store_api_validate_add_to_cart', 10, 2 );
function pwc_sk_store_api_validate_add_to_cart( $product, $request ) {
	$product_id = $product->get_parent_id() ? $product->get_parent_id() : $product->get_id();
	if ( pwc_sk_is_competition( $product_id ) && '' === pwc_sk_match_option( $product_id, pwc_sk_handoff_answer( $product_id ) ) ) {
		throw pwc_sk_store_api_error( __( 'Please enter through premiumwatchclub.com and answer the skill question to take part.', 'pwc' ) );
	}
}

add_action( 'woocommerce_store_api_validate_cart_item', 'pwc_sk_store_api_validate_cart_item', 10, 2 );
function pwc_sk_store_api_validate_cart_item( $product, $cart_item ) {
	$product_id = isset( $cart_item['product_id'] ) ? (int) $cart_item['product_id'] : 0;
	if ( ! $product_id || ! pwc_sk_is_competition( $product_id ) ) {
		return;
	}
	$answer = isset( $cart_item['pwc_skill_answer'] ) ? (string) $cart_item['pwc_skill_answer'] : '';
	if ( '' !== pwc_sk_config_problem( $product_id ) || '' === pwc_sk_match_option( $product_id, $answer ) ) {
		throw pwc_sk_store_api_error( sprintf(
			/* translators: %s: competition name. */
			__( 'The skill question for "%s" has not been answered. Please remove it and enter again through premiumwatchclub.com.', 'pwc' ),
			get_the_title( $product_id )
		) );
	}
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 4. ORDER CREATION — decide Correct / Incorrect server-side, at order time
 *    woocommerce_checkout_create_order_line_item fires for the classic checkout
 *    AND the Block / Store API checkout.
 * ═══════════════════════════════════════════════════════════════════════════ */

add_action( 'woocommerce_checkout_create_order_line_item', 'pwc_sk_save_order_item_meta', 10, 4 );
function pwc_sk_save_order_item_meta( $item, $cart_item_key, $values, $order ) {
	$product_id = $item->get_product_id();
	if ( ! $product_id || ! pwc_sk_is_competition( $product_id ) ) {
		return;
	}

	$answer  = isset( $values['pwc_skill_answer'] ) ? (string) $values['pwc_skill_answer'] : '';
	$correct = pwc_sk_correct_answer( $product_id );

	if ( '' === $answer || '' === $correct || '' !== pwc_sk_config_problem( $product_id ) ) {
		$result = 'Unverified'; // never eligible — see the Competition Entries export
	} else {
		$result = ( pwc_sk_normalise( $answer ) === pwc_sk_normalise( $correct ) ) ? 'Correct' : 'Incorrect';
	}

	$item->add_meta_data( '_pwc_skill_answer', $answer, true );
	$item->add_meta_data( '_pwc_correct_answer', $correct, true );
	$item->add_meta_data( '_pwc_skill_result', $result, true );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 5. ADMIN — show the recorded answer under each order line
 *    The meta keys are underscore-prefixed, so customers never see them.
 * ═══════════════════════════════════════════════════════════════════════════ */

add_action( 'woocommerce_after_order_itemmeta', 'pwc_sk_admin_item_meta', 10, 3 );
function pwc_sk_admin_item_meta( $item_id, $item, $product ) {
	if ( ! is_admin() || ! $item instanceof WC_Order_Item_Product ) {
		return;
	}
	$result = (string) $item->get_meta( '_pwc_skill_result' );
	if ( '' === $result ) {
		return;
	}
	$colors = array( 'Correct' => '#00844a', 'Incorrect' => '#b32d2e' );
	printf(
		'<div class="pwc-skill-meta" style="margin-top:6px;font-size:12px;line-height:1.6">'
		. '<strong>%1$s</strong> %2$s<br><strong>%3$s</strong> %4$s<br><strong>%5$s</strong> <span style="color:%6$s;font-weight:600">%7$s</span></div>',
		esc_html__( 'Skill answer:', 'pwc' ),
		esc_html( (string) $item->get_meta( '_pwc_skill_answer' ) ?: '—' ),
		esc_html__( 'Correct answer:', 'pwc' ),
		esc_html( (string) $item->get_meta( '_pwc_correct_answer' ) ?: '—' ),
		esc_html__( 'Result:', 'pwc' ),
		esc_attr( isset( $colors[ $result ] ) ? $colors[ $result ] : '#8a6d1f' ),
		esc_html( $result )
	);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 6. NEVER PUBLISH THE CORRECT ANSWER OVER REST
 *    /wp-json/wp/v2/product returned acf.correct_answer to anyone.
 * ═══════════════════════════════════════════════════════════════════════════ */

add_filter( 'rest_prepare_product', 'pwc_sk_hide_answer_in_rest', 99, 3 );                // /wp/v2/product
add_filter( 'woocommerce_rest_prepare_product_object', 'pwc_sk_hide_answer_in_rest', 99, 3 ); // /wc/v3/products
function pwc_sk_hide_answer_in_rest( $response, $object, $request ) {
	if ( ! $response instanceof WP_REST_Response ) {
		return $response;
	}
	// The Next.js API key (and product editors) still need it to validate answers.
	if ( current_user_can( 'edit_products' ) || current_user_can( 'manage_woocommerce' ) ) {
		return $response;
	}

	$data = $response->get_data();
	if ( ! is_array( $data ) ) {
		return $response;
	}
	if ( isset( $data['acf'] ) && is_array( $data['acf'] ) ) {
		unset( $data['acf']['correct_answer'] );
	}
	if ( isset( $data['meta'] ) && is_array( $data['meta'] ) ) {
		unset( $data['meta']['correct_answer'], $data['meta']['_correct_answer'] );
	}
	if ( isset( $data['meta_data'] ) && is_array( $data['meta_data'] ) ) {
		$data['meta_data'] = array_values( array_filter( $data['meta_data'], function ( $meta ) {
			$key = is_object( $meta ) && isset( $meta->key ) ? $meta->key : ( is_array( $meta ) && isset( $meta['key'] ) ? $meta['key'] : '' );
			return ! in_array( $key, array( 'correct_answer', '_correct_answer' ), true );
		} ) );
	}
	$response->set_data( $data );
	return $response;
}
