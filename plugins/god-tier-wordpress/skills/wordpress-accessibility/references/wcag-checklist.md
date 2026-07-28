# WCAG 2.2 AA Checklist — WordPress Pass/Fail Examples

Organized by WCAG success criterion. Use this when auditing a theme, plugin, or block for accessibility compliance. Each row gives a concrete WordPress pass/fail example, not just the abstract rule.

## Perceivable

### 1.1.1 Non-text Content (A)

- **Fail**: `<img src="<?php echo esc_url( $logo ); ?>">` with no `alt`.
- **Pass**: `<?php echo wp_get_attachment_image( $logo_id, 'full', false, array( 'alt' => get_bloginfo( 'name' ) ) ); ?>` or explicit `alt="<?php echo esc_attr( $description ); ?>"`.
- **Pass (decorative)**: background/spacer images get `alt=""`, never omitted.

### 1.3.1 Info and Relationships (A)

- **Fail**: visually-styled "heading" built with `<p class="heading-style">`.
- **Pass**: actual `<h2>`–`<h6>` used, styled with CSS classes as needed.
- **Fail**: table of data laid out with nested `<div>`s.
- **Pass**: `<table>` with `<th scope="col">`/`<th scope="row">` for header cells.

### 1.3.5 Identify Input Purpose (AA)

- **Pass**: `<input type="email" autocomplete="email" id="myplugin-email" />` — autocomplete tokens on common fields (name, email, address, tel) so browsers/assistive tech can autofill correctly.

### 1.4.3 Contrast (Minimum) (AA)

- **Fail**: `theme.json` palette pairing `#999999` text on `#ffffff` background (ratio ~2.85:1) for body copy.
- **Pass**: `#595959` or darker on `#ffffff` (≥4.5:1) for normal text; lighter grays acceptable only at ≥24px/bold ≥18.66px (3:1 threshold).

### 1.4.4 Resize Text (AA)

- **Fail**: font sizes fixed in `px` with a max-width container that clips text when the user sets browser zoom to 200%.
- **Pass**: relative units (`rem`/`em`) for typography, layout that reflows rather than clips/truncates at 200% zoom.

### 1.4.10 Reflow (AA)

- **Pass**: content readable/usable at 320px viewport width with no horizontal scrolling required for reading (tables/wide content get their own scroll container, not the whole page).

### 1.4.11 Non-text Contrast (AA)

- **Fail**: form input border `#e0e0e0` on white background (fails 3:1) with no other visible boundary.
- **Pass**: input borders, focus indicators, and icon-only button boundaries meet 3:1 against adjacent color.

### 1.4.13 Content on Hover or Focus (AA)

- **Pass**: a custom tooltip triggered on focus is dismissible (Esc), doesn't obscure the triggering element, and stays visible while hovered/focused (not auto-dismissing before the user can read it).

## Operable

### 2.1.1 Keyboard (A)

- **Fail**: `<div class="dropdown-toggle" onclick="toggle()">` with no keyboard handler.
- **Pass**: `<button aria-expanded="false" aria-controls="submenu-1">` with click AND keydown (`Enter`/`Space` native to `<button>` for free) handling.

### 2.1.2 No Keyboard Trap (A)

- **Fail**: a modal implemented so Tab can escape into background page content, or Esc doesn't close it.
- **Pass**: focus trapped within the open modal, Esc closes it, focus returns to the trigger element.

### 2.4.1 Bypass Blocks (A)

- **Fail**: no skip link; keyboard/screen-reader users must tab through the entire nav menu on every page.
- **Pass**: `<a class="skip-link" href="#main">Skip to content</a>` as the first focusable element in `header.php`/header template part, becomes visible on focus.

### 2.4.2 Page Titled (A)

- **Pass**: every template calls `wp_head()` (which outputs `<title>` via `wp_title`/`_wp_render_title_tag`) — never hardcode a static `<title>` that doesn't reflect the current page.

### 2.4.3 Focus Order (A)

- **Fail**: CSS `order`/absolute positioning that visually reorders content so tab order no longer matches reading order.
- **Pass**: DOM order matches visual reading order, or `tabindex` is used deliberately (never positive integers — only `0` or `-1`).

### 2.4.6 Headings and Labels (AA)

- **Fail**: three `<h2>`s on one page all reading "Read More."
- **Pass**: descriptive, unique headings/labels per section.

### 2.4.7 Focus Visible (AA)

- **Fail**: global CSS reset with `* { outline: none; }` and no replacement.
- **Pass**: `:focus-visible` styles defined for links, buttons, inputs, and custom interactive components.

### 2.4.11 Focus Not Obscured (Minimum) (AA — new in 2.2)

- **Fail**: a sticky header covers the top of a focused element (e.g., a skip-link target or in-page anchor) so the user can't see what's focused.
- **Pass**: sufficient `scroll-margin-top`/`scroll-padding-top` accounts for sticky headers so focused elements remain visible.

### 2.5.8 Target Size (Minimum) (AA — new in 2.2)

- **Fail**: icon-only buttons in a dense toolbar rendered at 16x16px clickable area with no spacing.
- **Pass**: interactive targets at least 24x24 CSS px, or adequate spacing between smaller targets so accidental activation is unlikely.

## Understandable

### 3.1.1 Language of Page (A)

- **Pass**: `<html <?php language_attributes(); ?>>` in the theme's `header.php`/root template — never hardcode `lang="en"`.

### 3.2.2 On Input (A)

- **Fail**: a `<select>` that auto-submits the form and navigates away the instant a user changes its value with no warning.
- **Pass**: an explicit submit button; auto-behavior only for non-disruptive, expected changes (e.g., filtering a visible list in place).

### 3.3.1 Error Identification (A)

- **Fail**: invalid field highlighted in red border only, no text.
- **Pass**: error text present (`"Email address is required."`), associated via `aria-describedby`, not conveyed by color alone.

### 3.3.2 Labels or Instructions (A)

- **Fail**: `<input placeholder="Email">` with no `<label>`.
- **Pass**: `<label for="...">` present; placeholder used only as supplementary hint, if at all.

## Robust

### 4.1.2 Name, Role, Value (A)

- **Fail**: custom checkbox built from a styled `<span>` with no `role`, no `aria-checked`, no keyboard support.
- **Pass**: native `<input type="checkbox">` (visually restyled via CSS) or, if fully custom, `role="checkbox"` + `aria-checked` + keyboard toggle support.

### 4.1.3 Status Messages (AA)

- **Fail**: AJAX form submission shows a success message via a `<div>` that appears with no announcement — screen reader users get no feedback.
- **Pass**: status container marked `aria-live="polite"` (or `role="status"`) present in the DOM before the async update, so injected text is announced automatically.
