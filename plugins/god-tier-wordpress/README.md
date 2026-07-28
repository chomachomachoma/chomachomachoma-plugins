# god-tier-wordpress

All-knowing WordPress developer for core, theme, and plugin work. This plugin teaches Claude Code current WordPress practices (WordPress 6.x era: block themes, `theme.json`, `block.json` apiVersion 3) and enforces security, coding-standards, and accessibility rules automatically while you write or review PHP, JS, CSS, and block code.

## What it does

- Loads WordPress-specific knowledge automatically whenever you write or review plugin/theme/block code — no need to remember to ask for it.
- Enforces the sanitize-input / validate / escape-output-late security model, nonce and capability checks, and `$wpdb->prepare()` on every query.
- Applies WordPress Coding Standards (PHP, JS, CSS) and current block-development patterns.
- Checks markup and admin UI against WCAG 2.2 AA and `accessibility-ready` theme requirements.
- Ships a dedicated review agent and slash commands (see below) for on-demand, structured reviews.

## Components

| Component | Type | Purpose |
|---|---|---|
| `wordpress-development` | Skill | Hooks/filters, plugin & theme architecture, block development, enqueueing, data APIs, `WP_Query`, i18n, naming conventions. |
| `wordpress-security` | Skill | Sanitization, escaping, nonces, capability checks, `$wpdb->prepare()`, file uploads, REST `permission_callback`, injection/CSRF/IDOR patterns to reject. |
| `wordpress-accessibility` | Skill | WCAG 2.2 AA mapped to WordPress: headings, landmarks, keyboard operability, forms, contrast, alt text, ARIA, accessible blocks/admin UI. |
| `wp-reviewer` | Agent | Dedicated reviewer that applies all three skills to a diff or file set and reports findings. |
| `/wp-review` | Command | Run a general code review of the current changes against all three skills. |
| `/wp-security-audit` | Command | Run a security-focused audit against `wordpress-security`. |
| `/wp-scaffold` | Command | Scaffold a new plugin, theme, or block following the conventions in `wordpress-development`. |

The skills are the source of truth — the agent and commands are thin wrappers that invoke them against your current changes.

## Usage examples

```
/wp-review
```
Reviews the current diff (or specified files) against WordPress coding standards, security, and accessibility rules, reporting findings by severity.

```
/wp-security-audit includes/class-rest-controller.php
```
Runs a focused pass over the given file(s) for sanitization gaps, missing escaping, missing nonce/capability checks, unsafe `$wpdb` queries, and REST endpoints missing `permission_callback`.

```
/wp-scaffold block "Price Tag"
```
Generates a new block (or plugin/theme, depending on the arguments) following the `block.json` apiVersion 3 conventions, correct enqueueing, and i18n setup documented in `wordpress-development`.

Because the skills auto-load based on their `description` triggers, you can also just ask normally — e.g. "add a settings page that saves an API key" or "review this template for accessibility" — and Claude Code will pull in the relevant skill(s) without needing a slash command.
