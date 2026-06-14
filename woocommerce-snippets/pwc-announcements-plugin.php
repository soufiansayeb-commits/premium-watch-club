<?php
/**
 * Plugin Name: PWC Announcements
 * Plugin URI:  https://premiumwatchclub.com
 * Description: Manage rotating announcement bar messages for the Premium Watch Club frontend.
 * Version:     1.0.0
 * Author:      Premium Watch Club
 *
 * INSTALLATION
 * ────────────
 * 1. Copy this file to: wp-content/plugins/pwc-announcements/pwc-announcements.php
 * 2. Activate in WordPress admin → Plugins.
 * 3. Manage messages at: Settings → PWC Announcements.
 *
 * REST ENDPOINT (public, no auth required)
 * ────────────────────────────────────────
 * GET /wp-json/pwc/v1/announcements
 * Returns JSON array of active announcement objects:
 *   [{ "text": "...", "url": "..." }, ...]
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// ── REST API ─────────────────────────────────────────────────────────────────

add_action( 'rest_api_init', function () {
    register_rest_route( 'pwc/v1', '/announcements', [
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'pwc_rest_get_announcements',
        'permission_callback' => '__return_true',
    ] );
} );

function pwc_rest_get_announcements() {
    $messages = get_option( 'pwc_announcement_messages', [] );

    $active = array_values( array_filter( $messages, function ( $m ) {
        return ! empty( $m['active'] ) && ! empty( trim( $m['text'] ) );
    } ) );

    // Only return text + url (never expose internal flags to the frontend)
    $response = array_map( function ( $m ) {
        return [
            'text' => sanitize_text_field( $m['text'] ),
            'url'  => ! empty( $m['url'] ) ? esc_url_raw( $m['url'] ) : '',
        ];
    }, $active );

    return rest_ensure_response( $response );
}

// ── Admin Menu ───────────────────────────────────────────────────────────────

add_action( 'admin_menu', function () {
    add_options_page(
        'PWC Announcements',
        'PWC Announcements',
        'manage_options',
        'pwc-announcements',
        'pwc_announcements_admin_page'
    );
} );

add_action( 'admin_init', function () {
    register_setting(
        'pwc_announcements_group',
        'pwc_announcement_messages',
        [ 'sanitize_callback' => 'pwc_sanitize_announcement_messages' ]
    );
} );

function pwc_sanitize_announcement_messages( $input ) {
    if ( ! is_array( $input ) ) return [];
    $clean = [];
    foreach ( $input as $item ) {
        $text   = sanitize_text_field( $item['text'] ?? '' );
        $url    = isset( $item['url'] ) ? esc_url_raw( $item['url'] ) : '';
        $active = ! empty( $item['active'] );
        $clean[] = [ 'text' => $text, 'url' => $url, 'active' => $active ];
    }
    return array_slice( $clean, 0, 10 );
}

// ── Admin Page ───────────────────────────────────────────────────────────────

function pwc_announcements_admin_page() {
    $saved = get_option( 'pwc_announcement_messages', [] );

    // Pad to 10 rows so there are always blank slots to fill
    while ( count( $saved ) < 10 ) {
        $saved[] = [ 'text' => '', 'url' => '', 'active' => false ];
    }
    ?>
    <style>
        .pwc-ann-wrap { max-width: 840px; }
        .pwc-ann-wrap h1 { display:flex; align-items:center; gap:10px; }
        .pwc-ann-wrap h1::before { content:'📢'; font-size:22px; }
        .pwc-ann-table { width:100%; border-collapse:collapse; margin-top:16px; background:#fff; border:1px solid #ddd; border-radius:4px; overflow:hidden; }
        .pwc-ann-table th { background:#f8f5f0; padding:10px 14px; text-align:left; font-size:12px; text-transform:uppercase; letter-spacing:.06em; color:#444; border-bottom:1px solid #ddd; }
        .pwc-ann-table td { padding:10px 14px; border-bottom:1px solid #f0ece6; vertical-align:middle; }
        .pwc-ann-table tr:last-child td { border-bottom:none; }
        .pwc-ann-table input[type=text],
        .pwc-ann-table input[type=url] { width:100%; box-sizing:border-box; }
        .pwc-ann-num { color:#aaa; font-size:12px; font-weight:600; }
        .pwc-ann-api { background:#f8f5f0; border:1px solid #e0d8cc; border-radius:4px; padding:14px 18px; margin-top:24px; }
        .pwc-ann-api code { background:#fff; padding:3px 8px; border-radius:3px; border:1px solid #ddd; font-size:12px; }
    </style>

    <div class="wrap pwc-ann-wrap">
        <h1>PWC Announcements</h1>
        <p>Add or edit announcement messages shown in the rotating bar at the top of the website.<br>
           Only <strong>active</strong> (checked) rows are displayed. Messages rotate automatically every 5 seconds.</p>

        <form method="post" action="options.php">
            <?php settings_fields( 'pwc_announcements_group' ); ?>

            <table class="pwc-ann-table">
                <thead>
                    <tr>
                        <th width="40">#</th>
                        <th width="50" style="text-align:center;">Active</th>
                        <th>Message text</th>
                        <th width="260">Link URL <span style="font-weight:400;text-transform:none;">(optional)</span></th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ( $saved as $i => $msg ) : ?>
                    <tr>
                        <td class="pwc-ann-num"><?php echo $i + 1; ?></td>
                        <td style="text-align:center;">
                            <input
                                type="checkbox"
                                name="pwc_announcement_messages[<?php echo $i; ?>][active]"
                                value="1"
                                <?php checked( ! empty( $msg['active'] ) ); ?>
                            />
                        </td>
                        <td>
                            <input
                                type="text"
                                name="pwc_announcement_messages[<?php echo $i; ?>][text]"
                                value="<?php echo esc_attr( $msg['text'] ); ?>"
                                placeholder="e.g. Free shipping on all UK orders over £50"
                                class="large-text"
                            />
                        </td>
                        <td>
                            <input
                                type="url"
                                name="pwc_announcement_messages[<?php echo $i; ?>][url]"
                                value="<?php echo esc_attr( $msg['url'] ); ?>"
                                placeholder="https://..."
                                class="regular-text"
                            />
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>

            <?php submit_button( 'Save Announcements' ); ?>
        </form>

        <div class="pwc-ann-api">
            <strong>Frontend reads from:</strong><br>
            <code><?php echo esc_html( rest_url( 'pwc/v1/announcements' ) ); ?></code>
            <p style="margin:8px 0 0;font-size:12px;color:#666;">
                This endpoint is public (no authentication). Only active messages are returned.
                The Next.js frontend caches this for 60 seconds.
            </p>
        </div>
    </div>
    <?php
}
