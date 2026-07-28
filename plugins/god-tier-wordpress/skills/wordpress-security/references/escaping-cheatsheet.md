# Escaping Cheatsheet — Context → Function

Escape at the last possible moment, in the exact context the value lands in. One value may need different escaping depending on where it's echoed — never reuse a pre-escaped string in a different context.

## HTML body text

```php
<h1><?php echo esc_html( $title ); ?></h1>
<p><?php echo esc_html( get_the_excerpt() ); ?></p>
```

`esc_html()` converts `< > & " '` to entities. Use `esc_html_e()` / `esc_html__()` when the string is also being translated:

```php
<button><?php esc_html_e( 'Save changes', 'myplugin' ); ?></button>
```

## HTML attribute values

```php
<div class="<?php echo esc_attr( $class ); ?>" data-id="<?php echo esc_attr( $id ); ?>">
<input type="text" value="<?php echo esc_attr( $value ); ?>" />
```

`esc_attr()` is required for **every** attribute value built from a variable — including `class`, `id`, `data-*`, `title`, `value`. Missing this on `value=""` is a classic stored-XSS-via-attribute-breakout vector: an unescaped `"` in the value lets an attacker close the attribute and inject a new one (e.g. `onmouseover=`).

## URLs

```php
<a href="<?php echo esc_url( $url ); ?>">Link</a>
<img src="<?php echo esc_url( $image_src ); ?>" />
```

`esc_url()` strips disallowed protocols (blocks `javascript:`, allows `http`, `https`, `mailto`, `ftp`, and a few others), encodes special characters, and validates structure. Use `esc_url_raw()` instead when the URL is being **stored** (e.g., saved to an option/meta), not echoed — `esc_url()` HTML-entity-encodes ampersands (`&` → `&#038;`) which is wrong for storage/redirects.

```php
update_option( 'myplugin_webhook_url', esc_url_raw( $submitted_url ) );
wp_redirect( esc_url_raw( $redirect_to ) );
```

## JavaScript context

Never hand-interpolate PHP values into inline `<script>` blocks. Prefer passing data via `wp_localize_script()` or `wp_add_inline_script()` with `wp_json_encode()`:

```php
wp_add_inline_script(
    'myplugin-main',
    'const myPluginConfig = ' . wp_json_encode( array(
        'label' => $label,
        'count' => (int) $count,
    ) ) . ';',
    'before'
);
```

If you must embed a single scalar directly inside an inline `<script>` string literal (rare — avoid if possible), use `esc_js()`:

```php
<script>var label = '<?php echo esc_js( $label ); ?>';</script>
```

`esc_js()` is narrow (escapes quotes/newlines for use inside an existing JS string literal) — it does not make arbitrary HTML/JS safe to inject as a script body.

## Textarea content

```php
<textarea name="bio"><?php echo esc_textarea( $bio ); ?></textarea>
```

`esc_textarea()` encodes the value for safe placement between `<textarea>` tags (different entity handling than `esc_html()` for correctness inside that element).

## Trusted-ish rich HTML (post content, editor-authored)

When the value legitimately contains HTML (e.g., a WYSIWYG field saved by an editor-capable user) and `esc_html()` would wrongly strip it to plain text:

```php
echo wp_kses_post( $content ); // allows the same tags as post_content: p, a, strong, img, etc.
```

For a custom allow-list narrower than post content:

```php
$allowed = array(
    'a' => array( 'href' => true, 'title' => true ),
    'strong' => array(),
    'em' => array(),
);
echo wp_kses( $content, $allowed );
```

`wp_kses_post()`/`wp_kses()` are for content from a role you trust with *some* HTML (authors, editors) — never use them as a substitute for `esc_html()` on arbitrary untrusted user input (e.g., a public comment/contact form field) where plain text is the correct output.

## CSS / inline styles

```php
<div style="color: <?php echo esc_attr( $color ); ?>;">
```

Treat inline `style=""` as an attribute — `esc_attr()` covers it. For values inside a `<style>` block, strip tags and validate the value is actually CSS-shaped (e.g., a hex color via `sanitize_hex_color()` on input) rather than echoing free text.

## Quick reference table

| Where the value is going | Function |
|---|---|
| Between HTML tags | `esc_html()` |
| Inside an HTML attribute | `esc_attr()` |
| `href`/`src` attribute | `esc_url()` |
| URL being stored, not echoed | `esc_url_raw()` |
| Inside a JS string literal in an inline `<script>` | `esc_js()` |
| Structured data passed to JS | `wp_json_encode()` via `wp_add_inline_script()` |
| Inside `<textarea>` | `esc_textarea()` |
| Trusted rich HTML (post-content-like) | `wp_kses_post()` |
| Custom-restricted HTML | `wp_kses( $val, $allowed_html )` |
| Translated + HTML-escaped string | `esc_html__()` / `esc_html_e()` |
| Translated + attribute-escaped string | `esc_attr__()` / `esc_attr_e()` |
