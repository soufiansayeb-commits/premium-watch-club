<?php
/**
 * PWC Journal — Custom Post Type
 *
 * Paste into: WordPress Admin → Snippets (Code Snippets plugin) → Add New
 * Title: PWC Journal CPT
 * Run: Everywhere
 *
 * After activating this snippet you will see:
 *   Journal → Add New  in the WordPress admin sidebar.
 *
 * The REST API endpoint will be:
 *   GET /wp-json/wp/v2/journal
 */

// ── Register Journal Custom Post Type ─────────────────────────────────────────

function pwc_register_journal_cpt() {
    $labels = [
        'name'               => 'Journal',
        'singular_name'      => 'Journal Article',
        'add_new'            => 'Add New',
        'add_new_item'       => 'Add New Article',
        'edit_item'          => 'Edit Article',
        'new_item'           => 'New Article',
        'view_item'          => 'View Article',
        'search_items'       => 'Search Articles',
        'not_found'          => 'No articles found',
        'not_found_in_trash' => 'No articles found in trash',
        'menu_name'          => 'Journal',
    ];

    register_post_type( 'journal', [
        'labels'       => $labels,
        'public'       => true,
        'show_in_rest' => true,       // Enables REST API + Gutenberg editor
        'rest_base'    => 'journal',  // /wp-json/wp/v2/journal
        'supports'     => [
            'title',
            'editor',
            'excerpt',
            'thumbnail',  // Featured image
            'author',
            'revisions',
        ],
        'has_archive'  => false,      // Frontend handles routing
        'rewrite'      => false,
        'menu_icon'    => 'dashicons-book-alt',
        'menu_position' => 6,
        'taxonomies'   => [ 'category' ], // Reuse standard WP categories (Guide, Heritage, etc.)
    ] );
}
add_action( 'init', 'pwc_register_journal_cpt' );


// ── Expose featured image URL in REST response ─────────────────────────────────
// The frontend uses ?_embed=true which includes wp:featuredmedia automatically.
// This extra field makes it available even without _embed, as a convenience.

add_action( 'rest_api_init', function () {
    register_rest_field( 'journal', 'featured_image_url', [
        'get_callback' => function ( $post ) {
            $id = get_post_thumbnail_id( $post['id'] );
            if ( ! $id ) return null;
            $src = wp_get_attachment_image_url( $id, 'large' );
            return $src ?: null;
        },
        'schema' => [
            'type'        => 'string',
            'description' => 'Featured image URL (large size)',
            'context'     => [ 'view' ],
        ],
    ] );
} );
