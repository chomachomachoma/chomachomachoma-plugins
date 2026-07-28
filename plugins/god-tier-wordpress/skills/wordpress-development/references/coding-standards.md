# WordPress Coding Standards — Essentials

Reference for PHP, JS, CSS, and HTML formatting per the official WordPress Coding Standards (WPCS). Apply these when writing or reviewing code so `phpcs --standard=WordPress` and `@wordpress/eslint-plugin` would pass clean.

## PHP: Yoda conditions

Comparisons involving a constant/literal put the constant first, so a missing `=` becomes a parse error instead of a silent assignment bug.

```php
// Correct
if ( true === $value ) { ... }
if ( 'publish' === $post->post_status ) { ... }
if ( null !== $result ) { ... }

// Incorrect — reviewers should flag this
if ( $value === true ) { ... }
if ( $post->post_status == 'publish' ) { ... } // also: use === not ==
```

Yoda applies to `==`, `!=`, `===`, `!==`. It does NOT apply to `<`, `>`, `<=`, `>=` (order doesn't create the assignment hazard) — write those in natural reading order: `if ( $count > 0 )`.

## PHP: spacing

- Space inside parentheses for control structures and function calls: `if ( $x )`, `foo( $bar, $baz )`, `array( 1, 2, 3 )`.
- Space after commas, around binary operators: `$a + $b`, `foo( $a, $b )`.
- No space before `;` or between a function name and its opening paren for declarations: `function foo( $bar ) {`.
- Opening brace on the same line as the control structure/declaration, one space before it: `if ( $x ) {`, `function foo() {`.
- Always use braces, even for one-line bodies:

```php
// Correct
if ( $x ) {
    do_thing();
}

// Incorrect
if ( $x ) do_thing();
```

## PHP: naming

| Element | Convention | Example |
|---|---|---|
| Functions, variables | `snake_case` | `get_user_display_name()`, `$post_id` |
| Classes | `Capitalized_Snake_Case` | `class WP_Widget_Text` |
| Class methods | `snake_case` | `public function get_data()` |
| Constants | `UPPER_SNAKE_CASE` | `define( 'MYPLUGIN_VERSION', '1.0.0' );` |
| Hooks | `snake_case`, prefixed | `myplugin_after_save` |

Never use camelCase in PHP (JS is the exception — see below). Booleans read as questions where possible: `$is_active`, `$has_children`.

## PHP: file naming

- Class files: `class-{classname-with-dashes}.php`, e.g. class `WP_Widget_Text` → `class-wp-widget-text.php`.
- Template files: lowercase with dashes, matching the template hierarchy: `single-product.php`, `content-none.php`.
- All lowercase, words separated by hyphens, never underscores, in filenames.

## PHP: docblocks

Every function, class, and hook needs a docblock. Use `@since`, typed `@param`, and `@return`:

```php
/**
 * Retrieve the formatted price for a product.
 *
 * @since 1.2.0
 *
 * @param int $product_id Product post ID.
 * @param bool $with_tax  Optional. Include tax in the total. Default false.
 * @return string Formatted price, or empty string if the product isn't found.
 */
function myplugin_get_price( $product_id, $with_tax = false ) {
    ...
}
```

Document filters/actions you fire at the call site:

```php
/**
 * Filters the computed price before display.
 *
 * @since 1.2.0
 *
 * @param string $price      Formatted price string.
 * @param int    $product_id Product post ID.
 */
return apply_filters( 'myplugin_price', $price, $product_id );
```

## PHP: general style rules

- Use `elseif`, never `else if`.
- No short open tags (`<?`); always `<?php`.
- No closing `?>` at the end of a pure-PHP file (avoids accidental whitespace/header errors).
- Use strict, explicit string concatenation with a space around `.`: `'Hello ' . $name . '!'`.
- Prefer `array()` long form over `[]` in older WPCS-strict codebases; both are accepted by modern WPCS but stay consistent within one file/project — check the project's `.phpcs.xml` if present.
- Alignment: don't hand-align `=>` or `=` across multiple lines (creates large diffs); let the formatter handle it.

## JS: `@wordpress/eslint-plugin` essentials

- camelCase for variables/functions (JS convention, unlike PHP): `getUserDisplayName()`, `postId`.
- Use single quotes, tabs for indentation (WordPress JS style — matches `.editorconfig` in `@wordpress/scripts` scaffolds), semicolons required.
- Prefer `const`/`let` over `var`; prefer named exports from block `index.js` files.
- React/JSX in blocks: components `PascalCase`, hooks prefixed `use`.

## CSS

- Class names lowercase, hyphenated, prefixed to avoid collisions: `.myplugin-card`, `.wp-block-myplugin-notice`.
- One selector per line for multi-selector rules; one declaration per line.
- Use logical properties where practical for RTL support: `margin-inline-start` over `margin-left`.

## HTML in templates

- Always run dynamic values through the correct escaping function at output (see `wordpress-security` skill) — coding-standards linting (`WordPress.Security.EscapeOutput`) will flag raw `echo $var;` in templates.
- Self-closing void elements get a trailing slash for XHTML-compat consistency with core: `<br />`, `<img ... />`.

## Running the linters

```bash
# PHP
composer require --dev wp-coding-standards/wpcs
vendor/bin/phpcs --standard=WordPress path/to/file.php

# JS/CSS (inside a @wordpress/scripts project)
npx wp-scripts lint-js
npx wp-scripts lint-style
```
