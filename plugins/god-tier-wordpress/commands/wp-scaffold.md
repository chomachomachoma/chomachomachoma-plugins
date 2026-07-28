---
description: Scaffold a standards-compliant WordPress plugin, theme, or block
argument-hint: plugin|theme|block <name>
---

Generate standards-compliant WordPress boilerplate.

## 1. Parse arguments

Parse `$ARGUMENTS` as `<type> <name>` where `type` is one of `plugin`, `theme`, or `block`, and `name` is a human-readable name (e.g. `plugin "Widget Manager"` or `block price-tag`).

If `type` is missing, not one of the three valid values, or `name` is missing, do not guess — print usage and stop:

```
Usage: /wp-scaffold plugin|theme|block <name>

Examples:
  /wp-scaffold plugin "My Great Plugin"
  /wp-scaffold theme "My Theme"
  /wp-scaffold block "Price Tag"
```

## 2. Derive naming

From `name`, derive consistently, and confirm the slug with the user if it's ambiguous:

- **slug**: lowercase, hyphenated (`my-great-plugin`)
- **text domain**: same as slug
- **function/hook prefix**: slug with underscores, e.g. `my_great_plugin_`
- **class prefix**: PascalCase or a PHP namespace, e.g. `My_Great_Plugin` or `MyGreatPlugin\`
- **constant prefix**: upper snake case, e.g. `MY_GREAT_PLUGIN_`

Use these consistently across every generated file — a mismatched slug/text-domain/prefix is itself a coding-standards bug.

Apply the rules from the `wordpress-development`, `wordpress-security`, and `wordpress-accessibility` skills while generating files — this is boilerplate other code will build on, so it must already be correct: proper prefixing, `defined( 'ABSPATH' ) || exit;` guards, escaped/translated output, nonces and capability checks on any generated form handler, and accessible markup (labels, landmarks, focus-visible styles) in any generated templates.

## 3. Generate by type

### `plugin`

- **Main plugin file** (`<slug>/<slug>.php`): standard plugin header (Plugin Name, URI, Description, Version, Requires at least, Requires PHP, Author, License, Text Domain), `defined( 'ABSPATH' ) || exit;` guard, a prefixed main class (e.g. `<Prefix>_Plugin`) that boots on `plugins_loaded`/`init`, `register_activation_hook()`/`register_deactivation_hook()` stubs with comments distinguishing one-time setup from per-load logic, defined constants (`<PREFIX>_VERSION`, `<PREFIX>_PATH`, `<PREFIX>_URL`).
- **`uninstall.php`**: guarded by `defined( 'WP_UNINSTALL_PLUGIN' ) || exit;`, with a commented stub for deleting options/tables — explicitly not the same code path as deactivation.
- **`readme.txt`**: standard WordPress.org readme format (`=== Plugin Name ===`, `Contributors`, `Tags`, `Requires at least`, `Tested up to`, `Stable tag`, `License`, `== Description ==`, `== Installation ==`, `== Changelog ==`).
- Note in your reply that a real plugin will also want enqueued assets, i18n loading, and REST/admin-post handlers per the `wordpress-development`/`wordpress-security` skills as functionality is added — this scaffold is the skeleton, not a finished plugin.

### `theme`

- **`style.css`**: required theme header comment block (Theme Name, Theme URI, Author, Description, Version, Requires at least, Requires PHP, Text Domain, License) — WordPress reads this from the CSS file's top comment, not a separate header file.
- **`functions.php`**: setup only — `add_theme_support()` calls (title-tag, post-thumbnails, html5, etc.), `register_nav_menus()`, a properly-hooked enqueue function on `wp_enqueue_scripts` (versioned, footer-loaded), text domain loading via `load_theme_textdomain()`. No direct output.
- **`theme.json`** (`"version": 3`): baseline `settings`/`styles` scaffold (color palette placeholder, layout content/wide size, typography) — flag that palette colors must be checked against the accessibility skill's contrast ratios before finalizing.
- **Base templates**: `index.php` as the universal fallback, `header.php` (with a skip link as the first focusable element, targeting `#main`, and a labeled `<nav aria-label="Primary">` wrapping `wp_nav_menu()`), `footer.php`, `single.php`, `page.php` — each using semantic landmark elements (`<header>`, `<main id="main">`, `<footer>`) and escaped/translated output.
- Include a `:focus-visible` outline rule in a base stylesheet snippet so the skip link and interactive elements aren't left with `outline: none` by default.

### `block`

- **`block.json`** (apiVersion 3): `name` (namespaced `<slug>/<block-name>`), `title`, `category`, `description`, `textdomain`, `editorScript`/`editorStyle`/`style` or `render` fields as appropriate, `attributes` stub.
- **`edit.js`**: functional editor component using `@wordpress/block-editor` (`useBlockProps`, `RichText`/`InspectorControls` as relevant) and `@wordpress/components` for any controls (never hand-rolled inputs) — accessible names on any icon-only toolbar controls.
- Ask (or default, stating the default) whether the block is static or dynamic:
  - **Static**: generate `save.js` mirroring `edit.js`'s markup via `useBlockProps.save()`, registered as `save` in `block.json`'s implied `index.js`.
  - **Dynamic**: generate `render.php` using `render_callback`/`render.php` field in `block.json`, with escaped output (`esc_html()`/`esc_attr()` on every attribute echoed) and no `save.js` (return `null` from `save` or omit it).
- **Registration**: PHP snippet (`register_block_type( __DIR__ )`) hooked on `init`, to be added to the parent plugin/theme.

## 4. After generating

List the files created, and call out anything the user still needs to fill in (e.g., real license text, actual palette colors checked for contrast, activation logic specific to the plugin's purpose). Do not silently invent business logic beyond the requested skeleton.
