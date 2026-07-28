---
name: wordpress-accessibility
description: Use when writing or reviewing WordPress theme/plugin/block markup, admin UI, or forms — covers WCAG 2.2 AA essentials for headings, landmarks, keyboard operability, forms, color contrast, images, ARIA, and accessibility-ready theme requirements.
---

# WordPress Accessibility

WCAG 2.2 AA essentials applied to WordPress theme, plugin, and block output. Accessibility is not a post-launch pass — apply these rules while writing markup. Pair with `wordpress-development` for template/block structure and `wordpress-security` for escaping (escaping and accessible markup are not in tension — `esc_html()` output is still semantic HTML).

## Semantic headings

- One `<h1>` per page, representing the page's actual subject (usually the post/page title). Never skip levels (`h2` straight to `h4`) — headings form a document outline, not a font-size shortcut.
- Never choose a heading tag for its default visual size — style it with CSS instead: `<h3 class="text-sm">` is correct, using `<h5>` "because it looks smaller" is not.
- In block themes, the Heading block enforces this — don't override the semantic level via custom block variations that hide the level selector.

## Landmark regions

Every page needs identifiable regions so screen reader/keyboard users can jump directly to them (`<nav>`, "Skip to region" lists):

```html
<header class="site-header">…</header>
<nav aria-label="Primary"><!-- wp_nav_menu() output --></nav>
<main id="main" role="main">…</main>
<aside aria-label="Sidebar">…</aside>
<footer class="site-footer">…</footer>
```

- Use native landmark elements (`<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`) over `role="..."` on generic `<div>`s — one `<main>` per page.
- Label multiple `<nav>` elements distinctly with `aria-label` (e.g., `"Primary"`, `"Footer"`, `"Breadcrumb"`) so they're distinguishable in a landmarks list.
- `wp_nav_menu()` output should render inside a `<nav>` with `aria-label`, not a bare `<div>`.

## Keyboard operability

- Every interactive control must be reachable and operable via keyboard alone: real `<button>`/`<a href>` elements, not `<div onclick>`. If a `<div>`/`<span>` must be clickable, add `tabindex="0"`, a keyboard event handler (`Enter`/`Space`), and an appropriate `role` — but prefer the native element first.
- **Visible focus indicator** on every focusable element — never `outline: none` without a replacement `:focus-visible` style. Removing focus outlines entirely is a common, easily-caught failure.

```css
a:focus-visible, button:focus-visible, input:focus-visible {
    outline: 2px solid #0a4b78;
    outline-offset: 2px;
}
```

- No keyboard traps: a modal/dropdown opened with the keyboard must be closable and must return focus to the triggering element on close; focus should be trapped *within* an open modal (Tab cycles inside it) until dismissed.
- **Skip link**: theme's `header.php` (or block theme header template part) must include a "Skip to content" link as the first focusable element, targeting `#main`/`#content`:

```html
<a class="skip-link screen-reader-text" href="#main"><?php esc_html_e( 'Skip to content', 'mytheme' ); ?></a>
```

It must be visually hidden by default but become visible on `:focus` (not `display: none`, which removes it from the tab order entirely).

## Forms

- Every input has a programmatically associated `<label>` — either wrapping the input or via `for`/`id`:

```html
<label for="myplugin-email"><?php esc_html_e( 'Email address', 'myplugin' ); ?></label>
<input type="email" id="myplugin-email" name="email" required aria-describedby="myplugin-email-error" />
```

- Never rely on `placeholder` as the only label — it disappears on input and fails contrast/persistence requirements.
- **Error identification**: on validation failure, associate the error message with the field via `aria-describedby`, and don't rely on color alone to indicate an error state (add text/icon, e.g., "Email is required").
- Group related fields (e.g., a radio set) in `<fieldset>` with a `<legend>` describing the group.
- Required fields marked with the `required` attribute AND a visible indicator (not color-only), announced via `aria-required="true"` when native `required` isn't used (e.g., custom JS-validated fields).

## Color contrast

| Content | Minimum ratio (AA) |
|---|---|
| Normal text | 4.5:1 |
| Large text (≥24px, or ≥18.66px bold) | 3:1 |
| UI components / graphical objects (borders, icon-only buttons, focus indicators) | 3:1 against adjacent color |

- Check `theme.json` color palette combinations (text on background, button text on button background) against these ratios before committing — a palette entry that looks fine to a sighted designer can fail 4.5:1 easily (e.g., light gray on white).
- Never convey state (error, success, required, "current page") through color alone — pair with text, icon, or underline.

## Images and alt text

- Every meaningful `<img>` has a descriptive `alt` attribute: `<img src="..." alt="<?php echo esc_attr( $description ); ?>" />`.
- Purely decorative images get `alt=""` (empty, not omitted) so screen readers skip them — never omit the attribute entirely.
- `wp_get_attachment_image()` pulls the stored alt text automatically; don't override it with generic filler like `"image"` or the filename.
- Icon-only buttons need an accessible name via visually-hidden text or `aria-label`, not just an icon:

```html
<button aria-label="<?php esc_attr_e( 'Close menu', 'mytheme' ); ?>">
    <svg aria-hidden="true" focusable="false">…</svg>
</button>
```

## ARIA — only when native HTML can't express it

- First rule of ARIA: don't use ARIA if a native element already has the semantics you need. `<button>` is already a button; `role="button"` on a `<div>` is a fallback, not a preference.
- Decorative icons/SVGs inside a labeled control: `aria-hidden="true"` so they aren't announced redundantly.
- Live regions for dynamic content (e.g., AJAX search results, form submission status) that should be announced without a focus change: `aria-live="polite"` (most cases) or `aria-live="assertive"` (urgent/errors only).
- Custom widgets (tabs, accordions, comboboxes) need the full expected ARIA pattern (`role`, `aria-expanded`, `aria-controls`, `aria-selected` etc.) matching the WAI-ARIA Authoring Practices pattern for that widget — an incomplete pattern (e.g., `aria-expanded` with no keyboard handling) is worse than no ARIA at all because it lies to assistive tech about capability.

## Accessible admin UI and blocks

- Custom admin screens/meta boxes follow the same rules as front-end: labeled fields, visible focus, keyboard-operable controls — `wp-admin` is not exempt.
- Block editor (`edit.js`) controls: use `@wordpress/components` (`ToggleControl`, `SelectControl`, `PanelBody`, etc.) instead of hand-rolled inputs — they already implement correct labeling/keyboard/ARIA.
- Every block's editor UI needs the same accessible-name requirements as front-end controls (icon-only toolbar buttons need `label`/`aria-label` props on the component).
- Block front-end output (from `save.js`/`render.php`) must independently meet all of the above — the block editor being accessible doesn't make the block's rendered output accessible.

## `accessibility-ready` theme requirements

To carry the `accessibility-ready` tag in the WordPress.org theme directory, a theme must demonstrably meet (non-exhaustive, the directory's actual checklist is authoritative):

- Skip link present and functional.
- Visible keyboard focus styles on all interactive elements.
- Sufficient color contrast for text and UI components (per the ratios above).
- Descriptive link text (no bare "click here"/"read more" without accessible additional context, e.g. via visually-hidden text naming the target).
- Forms have associated labels; no keyboard traps.
- Images have appropriate alt attributes.
- `wp_nav_menu()` output includes keyboard-accessible submenu toggles (dropdown submenus openable/closable via keyboard, not hover-only).
- No `outline: none` without a `:focus`/`:focus-visible` replacement anywhere in the theme's CSS.

Full checklist mapped to individual WCAG 2.2 success criteria with WordPress-specific pass/fail examples: `references/wcag-checklist.md`.
