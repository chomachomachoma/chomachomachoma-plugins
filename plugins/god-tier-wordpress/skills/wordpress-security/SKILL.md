---
name: wordpress-security
description: Use when writing or reviewing WordPress PHP/JS that handles user input, output, database queries, files, AJAX, or REST endpoints — covers sanitization, escaping, nonces, capability checks, and $wpdb->prepare.
---

# WordPress Security

WordPress security rests on one sequence, applied every time data crosses a trust boundary: **sanitize on input → validate → escape on output, as late as possible.** Review every diff against this skill before anything else — a functionally correct feature with a security hole is not done.

## The golden rule

- **Sanitize** untrusted input the moment it enters PHP (`$_POST`, `$_GET`, `$_REQUEST`, REST params, imported files).
- **Validate** that sanitized data is actually acceptable for its purpose (correct type, in an allowed set, within range) — sanitizing is not the same as validating; `sanitize_text_field()` on `"banana"` for a field expecting `"yes"|"no"` still needs an explicit check.
- **Escape** at the point of output, in the context you're outputting into, as close to the `echo`/template as possible — never escape when saving to the database. Escaping early means the raw value is what's stored, and it may need to be output into a different context later (HTML vs. attribute vs. JS vs. URL) where that early escaping is wrong.

```php
// WRONG — escaping on save, using raw value on output
update_option( 'myplugin_title', esc_html( $_POST['title'] ) );
echo get_option( 'myplugin_title' ); // no escaping here — but already "safe-looking" so reviewers miss it

// RIGHT — sanitize on save, escape on output
update_option( 'myplugin_title', sanitize_text_field( wp_unslash( $_POST['title'] ) ) );
echo esc_html( get_option( 'myplugin_title' ) );
```

Always `wp_unslash()` superglobal input before sanitizing — WordPress adds slashes to `$_GET`/`$_POST`/`$_COOKIE`/`$_REQUEST` for legacy magic-quotes compatibility, and sanitizing before unslashing leaves stray backslashes in stored data.

## Nonce lifecycle

Nonces verify a request came from a legitimate WordPress-generated form/link — they are CSRF protection, NOT authentication or authorization. Always pair a nonce check with a capability check.

| Step | Function |
|---|---|
| Output nonce in a form | `wp_nonce_field( 'myplugin_save_settings', 'myplugin_nonce' )` |
| Output nonce in a URL | `wp_nonce_url( $url, 'myplugin_delete_' . $id )` |
| Create nonce for JS (localized) | `wp_create_nonce( 'wp_rest' )` or a custom action string |
| Verify on form/admin-post submit | `check_admin_referer( 'myplugin_save_settings', 'myplugin_nonce' )` (dies on failure) |
| Verify on AJAX | `check_ajax_referer( 'myplugin_action', 'nonce' )` (dies on failure) |
| Verify manually (no auto-die) | `wp_verify_nonce( $_POST['myplugin_nonce'] ?? '', 'myplugin_save_settings' )` — returns `1`/`2`/`false`, always check with `!==` against `false` |

```php
add_action( 'admin_post_myplugin_save', function () {
    check_admin_referer( 'myplugin_save_settings', 'myplugin_nonce' );
    if ( ! current_user_can( 'manage_options' ) ) {
        wp_die( esc_html__( 'Insufficient permissions.', 'myplugin' ), 403 );
    }
    // ...proceed
} );
```

Nonces expire (default ~24h, ticked in two 12h windows) and are tied to the current user + action string — never reuse one action string for two different destructive operations.

## Capability checks

Check `current_user_can()` before **every** state-changing action (save, delete, publish, upload, settings change) — before the nonce check or after, but never skip it because "the nonce passed."

```php
if ( ! current_user_can( 'edit_post', $post_id ) ) {
    return new WP_Error( 'forbidden', 'You cannot edit this post.', array( 'status' => 403 ) );
}
```

- Use the most specific capability for the object, not a broad one: `edit_post`/`delete_post` (meta capabilities, resolved per-post) over `edit_posts`/`publish_posts` when acting on a specific post ID — this is what prevents IDOR (a lower-privileged author editing someone else's post).
- Never gate on role name strings (`$user->roles[0] === 'administrator'`) — roles are configurable; capabilities are the actual authorization primitive.
- `manage_options` for admin-only settings; never trust a hidden admin URL alone as protection.

## `$wpdb->prepare()` — always, no exceptions

Any raw SQL with a variable MUST go through `prepare()` with placeholders. Never concatenate or interpolate variables into SQL strings, including for `ORDER BY`/`LIMIT`/table names (validate those against an allow-list instead, since `prepare()` placeholders can't parameterize identifiers).

| Placeholder | Type |
|---|---|
| `%s` | string |
| `%d` | integer |
| `%f` | float |
| `%i` | identifier (table/column name) — WP 6.2+ |

```php
global $wpdb;
$results = $wpdb->get_results(
    $wpdb->prepare(
        "SELECT id, title FROM {$wpdb->prefix}myplugin_items WHERE status = %s AND author_id = %d LIMIT %d",
        $status,
        $author_id,
        $limit
    )
);

// Allow-listed column for ORDER BY — never interpolate user input directly even with %i
$allowed_columns = array( 'title', 'created_at' );
$orderby = in_array( $order_by, $allowed_columns, true ) ? $order_by : 'created_at';
```

`$wpdb->prefix` itself is safe to interpolate directly (not user-controlled). Reject on sight: `"...WHERE id = $id"`, `"...WHERE id = " . $id`, any `sprintf()` used as a substitute for `prepare()`.

## Sanitization functions (input)

| Function | Use for |
|---|---|
| `sanitize_text_field()` | Generic single-line text; strips tags, extra whitespace, low ASCII. |
| `sanitize_textarea_field()` | Multi-line text; preserves newlines. |
| `absint()` | Non-negative integers (IDs, counts). |
| `intval()` / `(int)` | Integers where negative is valid. |
| `sanitize_email()` | Email addresses. |
| `sanitize_key()` | Internal keys/slugs — lowercases, strips to `[a-z0-9_-]`. |
| `sanitize_title()` | URL slugs. |
| `sanitize_file_name()` | Uploaded/generated file names. |
| `sanitize_hex_color()` | Hex color values. |
| `esc_url_raw()` | URLs being stored (not output — use `esc_url()` for output). |
| `wp_kses_post()` | HTML allowed to match post-content-level tags (trusted-ish rich text from an editor role). |
| `wp_kses( $val, $allowed_html )` | HTML restricted to a custom allow-list. |
| `rest_sanitize_boolean()` | Booleans coming from REST params. |

## Escaping functions (output)

Full context → function mapping with examples: `references/escaping-cheatsheet.md`. Summary:

| Context | Function |
|---|---|
| HTML body text | `esc_html()` |
| HTML attribute value | `esc_attr()` |
| URL (href/src) | `esc_url()` |
| Inside a JS string literal in an inline `<script>` | `esc_js()` (rare — prefer `wp_json_encode()` + `wp_add_inline_script()` for real data) |
| Textarea content | `esc_textarea()` |
| Trusted-ish HTML block | `wp_kses_post()` / `wp_kses()` |
| `<style>` / inline CSS | `safecss_filter_attr()` for `style=""` values; validated typed values (e.g. `sanitize_hex_color()`, integer + unit) for anything in a `<style>` block |

## File upload handling

- Never trust `$_FILES[...]['type']` (client-supplied, spoofable). Use `wp_check_filetype_and_ext()` or let `wp_handle_upload()` do it.
- Route all uploads through `wp_handle_upload()` (or the media REST/admin flow) — it validates extension against an allow-list, sanitizes the filename, and moves the file out of a web-executable-by-default state where configured.
- Restrict allowed types explicitly when accepting uploads outside the standard media flow:

```php
$movefile = wp_handle_upload( $_FILES['myfile'], array(
    'test_form' => false,
    'mimes'     => array( 'jpg|jpeg' => 'image/jpeg', 'png' => 'image/png' ),
) );
if ( $movefile && ! isset( $movefile['error'] ) ) {
    // $movefile['file'] is the safe path
}
```

- Never let uploaded files be placed somewhere PHP will execute them; never accept `.php`/`.phtml`/executable extensions for user uploads.

## REST API: `permission_callback` is required

Every `register_rest_route()` call MUST supply a `permission_callback` — omitting it triggers a `_doing_it_wrong` notice but does **not** block the request — the endpoint remains publicly accessible on every WP version. `__return_true` is only correct for genuinely public read endpoints; state deliberately.

```php
register_rest_route( 'myplugin/v1', '/items/(?P<id>\d+)', array(
    'methods'             => WP_REST_Server::EDITABLE,
    'callback'            => 'myplugin_update_item',
    'permission_callback' => function ( WP_REST_Request $request ) {
        return current_user_can( 'edit_post', (int) $request['id'] );
    },
    'args' => array(
        'id' => array( 'validate_callback' => 'is_numeric', 'sanitize_callback' => 'absint', 'required' => true ),
    ),
) );
```

REST nonce for authenticated JS requests: `wp_create_nonce( 'wp_rest' )`, sent as `X-WP-Nonce` header, verified automatically by core's cookie-auth REST middleware — but only if the request also carries valid auth cookies, so `permission_callback` is still the real gate.

## Patterns to reject on sight

- **SQL injection**: any `$wpdb->query()`/`get_results()`/`get_var()` with interpolated variables and no `prepare()`.
- **XSS**: `echo $_GET['x']`, `echo $post->post_title` unescaped in a template, `innerHTML =` with unsanitized data in JS, `the_content` filters that inject unescaped attribute values.
- **CSRF**: any state-changing `admin-post.php`/AJAX/form handler with no nonce check.
- **IDOR**: capability checks against a generic capability (`edit_posts`) instead of the specific object (`edit_post`, `$post_id`) — lets User A act on User B's data by changing an ID in the request.
- **Unauthenticated destructive REST/AJAX actions**: missing or `__return_true` `permission_callback` on an endpoint that writes/deletes data.
- **Object injection**: `unserialize()` on any user-controlled string — use `wp_json_encode()`/`json_decode()` instead, or `maybe_unserialize()` only for trusted internal data.
- **SSRF**: `wp_remote_get()`/`curl` hitting a user-supplied URL with no host allow-list when the response or side effect is exposed back to the user.
