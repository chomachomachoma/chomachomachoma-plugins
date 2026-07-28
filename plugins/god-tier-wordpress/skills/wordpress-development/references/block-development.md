# Block Development Reference

Detail for building custom Gutenberg blocks with `block.json` metadata (apiVersion 3), covering static vs. dynamic rendering, InnerBlocks, block supports, and registering variations/patterns.

## `block.json` fields

```json
{
  "$schema": "https://schemas.wp.org/trunk/block.json",
  "apiVersion": 3,
  "name": "myplugin/notice",
  "title": "Notice",
  "category": "widgets",
  "icon": "megaphone",
  "description": "Display a styled notice box.",
  "keywords": [ "alert", "callout" ],
  "version": "1.0.0",
  "textdomain": "myplugin",
  "attributes": {
    "message": { "type": "string", "default": "" },
    "type": { "type": "string", "enum": [ "info", "warning", "error" ], "default": "info" }
  },
  "supports": {
    "html": false,
    "align": [ "wide", "full" ],
    "color": { "background": true, "text": true },
    "spacing": { "margin": true, "padding": true }
  },
  "usesContext": [ "postId" ],
  "providesContext": { "myplugin/noticeType": "type" },
  "editorScript": "file:./index.js",
  "editorStyle": "file:./index.css",
  "style": "file:./style-index.css",
  "render": "file:./render.php",
  "viewScript": "file:./view.js"
}
```

| Field | Purpose |
|---|---|
| `apiVersion` | Use `3` for new blocks (current stable). Governs wrapper/attribute behavior. |
| `name` | `namespace/block-name`, lowercase, must match the registered slug exactly. |
| `attributes` | Typed schema for block state; each needs a `type` and usually a `default`. Sources like `"source": "html", "selector": "p"` pull from saved markup for static blocks. |
| `supports` | Opt in to editor UI (see Block Supports below) instead of hand-building controls. |
| `editorScript`/`editorStyle` | Editor-only JS/CSS (the block's `edit` UI). |
| `script`/`style` | Loaded on both editor and front end. |
| `viewScript` | Front-end-only JS (interactivity), not loaded in the editor — use for blocks needing runtime behavior without bloating the editor bundle. |
| `render` | PHP template path for **dynamic** blocks — presence of `render` (or a `render_callback` in PHP registration) makes the block dynamic. |

Register from PHP with a single call that reads `block.json`:

```php
add_action( 'init', function () {
    register_block_type( __DIR__ . '/build/notice' );
} );
```

## Static vs. dynamic blocks

- **Static**: `save.js` returns the final markup, which is serialized into `post_content` at save time and re-rendered identically on the front end (and re-parsed by `edit.js` on re-open, via `attributes.source` matching the saved HTML). Fast, no PHP needed, but output can't reflect data that changes after save (e.g., "latest 5 posts").
- **Dynamic**: no `save.js` markup (or it returns `null` for pure-dynamic blocks); a `render_callback` (or `render.php` via the `render` field) runs on every front-end request, so it can query fresh data. Register with `render_callback` in PHP if not using the `render` field:

```php
register_block_type( __DIR__, array(
    'render_callback' => 'myplugin_render_notice_block',
) );

function myplugin_render_notice_block( $attributes, $content, $block ) {
    $type = isset( $attributes['type'] ) ? sanitize_key( $attributes['type'] ) : 'info';
    return sprintf(
        '<div class="wp-block-myplugin-notice is-type-%s">%s</div>',
        esc_attr( $type ),
        wp_kses_post( $attributes['message'] ?? '' )
    );
}
```

`render.php` (referenced by `"render": "file:./render.php"`) receives `$attributes`, `$content`, and `$block` as in-scope variables — same escaping rules apply as any other PHP template.

## InnerBlocks

Lets a block contain other blocks (containers, columns, custom layouts):

```js
import { InnerBlocks, useBlockProps } from '@wordpress/block-editor';

export default function Edit() {
    const blockProps = useBlockProps();
    return (
        <div { ...blockProps }>
            <InnerBlocks
                allowedBlocks={ [ 'core/paragraph', 'core/image' ] }
                template={ [ [ 'core/paragraph', { placeholder: 'Add content…' } ] ] }
                templateLock={ false }
            />
        </div>
    );
}
```

`save.js` renders `<InnerBlocks.Content />` in the matching position. For dynamic parent blocks, `$content` passed into `render_callback` already contains the rendered inner blocks markup — don't re-render them yourself.

## Block supports

Declare supports in `block.json` rather than building custom controls — the editor auto-generates the matching inspector UI and applies the resulting classes/styles/attributes:

| Support key | Adds |
|---|---|
| `align` | Wide/full alignment toolbar option. |
| `anchor` | HTML anchor (`id`) field. |
| `color.background` / `color.text` / `color.gradients` | Color panel controls. |
| `spacing.margin` / `spacing.padding` | Dimension controls. |
| `typography.fontSize` / `.lineHeight` | Typography panel controls. |
| `html` (set `false`) | Disables the "Edit as HTML" escape hatch — do this for blocks whose markup must stay structured. |
| `multiple` (set `false`) | Restricts the block to one instance per post. |

Read supports-driven attributes with `useBlockProps()` in `edit.js` and `useBlockProps.save()` in `save.js` so generated classes/styles attach to your wrapper element automatically.

## Registering block variations

A variation reuses one block's implementation with different default attributes/icon (e.g., "Wide Image" vs. "Image" from `core/image`):

```js
import { registerBlockVariation } from '@wordpress/blocks';

registerBlockVariation( 'myplugin/notice', {
    name: 'warning-notice',
    title: 'Warning Notice',
    attributes: { type: 'warning' },
    icon: 'warning',
    scope: [ 'inserter' ],
} );
```

## Registering block patterns

Patterns are predefined arrangements of one or more blocks users can insert as a starting point:

```php
add_action( 'init', function () {
    register_block_pattern(
        'myplugin/hero-with-cta',
        array(
            'title'       => __( 'Hero with CTA', 'myplugin' ),
            'categories'  => array( 'featured' ),
            'content'     => '<!-- wp:heading {"level":1} --><h1>' . esc_html__( 'Welcome', 'myplugin' ) . '</h1><!-- /wp:heading -->',
        )
    );
} );
```

Or as a pattern file under `patterns/*.php` (auto-registered by the theme when it declares `Title`/`Slug` headers in the file's docblock) — the modern preferred approach for block themes.
