---
name: wordpress-development
description: Use when writing or reviewing WordPress plugin or theme code — hooks/filters, plugin bootstrap and lifecycle, theme architecture (template hierarchy, theme.json), block development, asset enqueueing, options/transients/post meta, WP_Query, i18n, or naming/prefixing conventions.
---

# WordPress Development

Core architectural rules for building WordPress plugins, themes, and blocks that behave correctly and don't collide with core, other plugins, or themes. Pair with `wordpress-security` for anything touching user input/output, and `wordpress-accessibility` for anything rendering markup.

## Hooks and filters model

WordPress is event-driven: **actions** run side effects at a point in time, **filters** transform and return a value. Never confuse the two — a filter callback MUST return a value.

```php
add_action( 'init', 'myplugin_register_post_types' );
add_filter( 'the_content', 'myplugin_append_notice' );

function myplugin_append_notice( $content ) {
    if ( is_singular( 'post' ) ) {
        $content .= '<p>' . esc_html__( 'Thanks for reading.', 'myplugin' ) . '</p>';
    }
    return $content; // filters must always return
}
```

- Use `add_action`/`add_filter` priority (default 10) and accepted-args explicitly when order or extra params matter: `add_filter( 'woocommerce_price_html', 'cb', 20, 2 );`
- Remove hooks with the exact same callback reference, priority, and (for object methods) instance — `remove_action( 'wp_head', array( $this, 'inject' ), 10 );` fails silently if any of those differ.
- Fire your own action/filter hooks in reusable code so other plugins/themes can extend it: `do_action( 'myplugin_after_save', $post_id );`, `apply_filters( 'myplugin_settings', $settings );`.
- Common lifecycle hooks, in order: `plugins_loaded` → `init` → `widgets_init` → `wp_loaded` → `template_redirect` → `wp_enqueue_scripts` → `wp_head` → `wp_footer`. Register post types/taxonomies on `init`, not earlier (i18n functions aren't ready before `init`).

## Plugin architecture

**Main plugin file** needs a standard header WordPress parses for the plugin list:

```php
<?php
/**
 * Plugin Name: My Plugin
 * Plugin URI:  https://example.com/my-plugin
 * Description: Short description of what it does.
 * Version:     1.0.0
 * Requires at least: 6.4
 * Requires PHP: 7.4
 * Author:      Chris Choma
 * License:     GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: my-plugin
 */

defined( 'ABSPATH' ) || exit; // block direct access
```

- **Activation/deactivation**: register with `register_activation_hook( __FILE__, 'myplugin_activate' )` and `register_deactivation_hook`. Use activation for one-time setup (flush rewrite rules, create tables) — never for anything that must survive being called on every load.
- **Uninstall**: put cleanup (delete options, drop tables) in `uninstall.php` at the plugin root guarded by `defined( 'WP_UNINSTALL_PLUGIN' ) || exit;`, or register via `register_uninstall_hook()`. Deactivation ≠ uninstall — don't delete user data on deactivation.
- Never run heavy logic at the top level of the main file; hook everything through `init`/`plugins_loaded` so load order stays predictable.

## Theme architecture

- **Template hierarchy**: WordPress resolves templates most-specific to least, e.g. for a single post: `single-{post-type}-{slug}.php` → `single-{post-type}.php` → `single.php` → `singular.php` → `index.php`. Know the chain for the content type you're editing before creating a new file.
- **Block themes** (full site editing) replace PHP templates with HTML files under `templates/*.html` and `parts/*.html`, driven by `theme.json` for global styles/settings — no `functions.php` template logic needed for layout. Classic themes still use PHP templates + `functions.php`.
- **`functions.php`**: only setup and hook registration — `add_theme_support()`, `register_nav_menus()`, enqueueing, filters. Never echo output directly from it.
- **`theme.json`** (classic or block themes, `"version": 3`) declares supported settings and default styles centrally instead of scattered `add_theme_support()` calls:

```json
{
  "$schema": "https://schemas.wp.org/trunk/theme.json",
  "version": 3,
  "settings": {
    "color": { "palette": [ { "slug": "primary", "color": "#0a4b78", "name": "Primary" } ] },
    "layout": { "contentSize": "700px", "wideSize": "1200px" }
  },
  "styles": {
    "typography": { "fontFamily": "system-ui, sans-serif" }
  }
}
```

## Block development

See `references/block-development.md` for the full `block.json` field reference, static vs. dynamic rendering, InnerBlocks, block supports, and registering variations/patterns. In short: every block needs `block.json` (apiVersion 3) registered with `register_block_type( __DIR__ )`, `edit.js` for the editor UI, and either a `save.js` (static, HTML baked into post_content) or a PHP `render_callback`/`render.php` (dynamic, rendered on request).

## Enqueueing assets

Always use `wp_enqueue_script`/`wp_enqueue_style` on the `wp_enqueue_scripts` (front end), `admin_enqueue_scripts` (wp-admin), or `enqueue_block_editor_assets` (block editor) hooks — never `<script>`/`<link>` tags in templates.

```php
add_action( 'wp_enqueue_scripts', 'myplugin_assets' );
function myplugin_assets() {
    $asset_file = include plugin_dir_path( __FILE__ ) . 'build/index.asset.php';
    wp_enqueue_script(
        'myplugin-main',
        plugins_url( 'build/index.js', __FILE__ ),
        $asset_file['dependencies'],
        $asset_file['version'],
        true // load in footer
    );
    wp_enqueue_style( 'myplugin-main', plugins_url( 'build/style.css', __FILE__ ), array(), $asset_file['version'] );
    wp_localize_script( 'myplugin-main', 'myPluginData', array(
        'restUrl' => esc_url_raw( rest_url( 'myplugin/v1' ) ),
        'nonce'   => wp_create_nonce( 'wp_rest' ),
    ) );
}
```

- Version assets with a real version or filemtime — never omit the version param (breaks cache busting).
- Use `@wordpress/scripts` build output's generated `.asset.php` for dependencies/version instead of hardcoding.
- Load scripts in the footer (`true` as the last arg) unless there's a hard reason not to.

## Data storage APIs

| Need | API | Notes |
|---|---|---|
| Site-wide config | `get_option`/`update_option`/`add_option` | Autoloaded by default — pass `false` as autoload for large/rarely-read options. |
| Per-request/short-lived cache | `get_transient`/`set_transient`/`delete_transient` | Falls back to options table without an object cache; always set an expiration. |
| Per-post data | `get_post_meta`/`update_post_meta`/`add_post_meta` | Use `$single = true` when expecting one value; prefix meta keys, use `_` prefix to hide from custom fields UI when internal. |
| Per-user data | `get_user_meta`/`update_user_meta` | Same conventions as post meta. |

Register meta with `register_post_meta()` (or `register_meta()`) including `show_in_rest` and a `sanitize_callback`/`auth_callback` when it needs REST/block-editor exposure.

## WP_Query best practices

```php
$query = new WP_Query( array(
    'post_type'              => 'product',
    'posts_per_page'         => 12,
    'no_found_rows'          => true,      // skip pagination count when you don't paginate
    'update_post_meta_cache' => false,     // skip if you don't need meta
    'update_post_term_cache' => false,     // skip if you don't need terms
    'fields'                 => 'ids',     // if you only need IDs
) );
```

- Never use `posts_per_page => -1` on user-facing queries without a real bound — it can exhaust memory on large sites.
- Never query with raw `$wpdb` when `WP_Query`/`get_posts` covers it; drop to `$wpdb` (with `prepare()`) only for aggregates/joins core APIs can't express.
- Always `wp_reset_postdata()` after a custom secondary loop that used `the_post()`.
- Prefer `pre_get_query` filter to modify the *main* query over replacing it — avoids duplicate queries.

## Internationalization (i18n)

- Every user-facing string wrapped in a translation function with a **consistent text domain** matching the `Text Domain` header: `__( 'Save changes', 'myplugin' )`, `esc_html__()`, `esc_attr__()`, `_e()` (avoid — prefer `echo esc_html__()`), `_n()` for plurals, `_x()` when context disambiguates identical strings.
- Translation functions do NOT escape — always wrap with the matching escaper: `esc_html__( 'Title', 'myplugin' )` not `esc_html( __( 'Title', 'myplugin' ) )` (the combined `esc_html__` form is preferred/faster and is what WPCS expects).
- Text domain must be a literal string, never a variable — the i18n string-extraction tooling parses statically.
- No text domain needed for strings targeting WordPress core's own domain (rare; almost always use your own).

## Naming and prefixing conventions

- Prefix every global function, class, hook name, option key, meta key, and shortcode with a unique namespace (plugin/theme slug): `myplugin_`, `MyPlugin_`, or a PHP namespace `MyPlugin\`. Never define bare global functions like `save_settings()`.
- Constants: `MYPLUGIN_VERSION`, `MYPLUGIN_PATH` — all caps, prefixed.
- Hook names you invent: `myplugin_before_render`, `myplugin/settings/updated` — keep consistent separators within one codebase.
- Match the plugin/theme directory slug used in `plugin.json`'s `source` and any distribution slug — mismatches break asset URLs and update checks.

## When to load the reference files

- Editing/reviewing raw PHP/JS/CSS formatting, spacing, Yoda conditions, docblocks, or file/class naming → load `references/coding-standards.md`.
- Building or reviewing a custom block (`block.json`, edit/save, dynamic rendering, InnerBlocks, block supports, variations, patterns) → load `references/block-development.md`.
