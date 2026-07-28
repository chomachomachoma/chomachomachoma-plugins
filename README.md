# claude-plugins

Chris Choma's public plugin library for [Claude Code](https://claude.com/claude-code) — a Claude Code marketplace with two independent plugins: a WordPress development expert that enforces security, coding-standards, and accessibility rules automatically, and a token-efficient documentation assistant that keeps a `docs/` tree in sync with your code as it changes.

## Installation

Add the marketplace once, then install whichever plugin(s) you want — they're fully independent, so pick either one or both:

```
/plugin marketplace add chomachomachoma/claude-plugins
/plugin install god-tier-wordpress@choma-plugins
/plugin install doc-assistant@choma-plugins
```

### Local development / testing

To try the marketplace from a local clone instead of GitHub — useful when developing or reviewing changes before they're pushed:

```
/plugin marketplace add /path/to/claude-plugins
/plugin install god-tier-wordpress@choma-plugins
/plugin install doc-assistant@choma-plugins
```

Point `/path/to/claude-plugins` at your local checkout of this repo. Everything else works the same as installing from GitHub.

## Plugins

| Plugin | What it does | Components |
|---|---|---|
| [`god-tier-wordpress`](plugins/god-tier-wordpress) | All-knowing WordPress developer for core, theme, and plugin work — auto-loads WordPress-specific knowledge and enforces security, coding-standards, and accessibility rules while you write or review code. | 3 skills (`wordpress-development`, `wordpress-security`, `wordpress-accessibility`), `wp-reviewer` read-only agent, 3 commands (`/wp-review`, `/wp-security-audit`, `/wp-scaffold`) |
| [`doc-assistant`](plugins/doc-assistant) | Token-efficient documentation manager — maintains an indexed `docs/` tree, updates it incrementally from diffs, and reminds you (non-blockingly) when docs drift from code. | `managing-docs` skill, `doc-manager` agent, 3 commands (`/docs-init`, `/docs-update`, `/docs-check`), Stop/PostToolUse drift-reminder hooks |

## god-tier-wordpress

An all-knowing WordPress developer for core, theme, and plugin work, built for the WordPress 6.x era (block themes, `theme.json`, `block.json` apiVersion 3). Three skills load automatically based on what you're doing — architecture and block development, the sanitize/validate/escape security model plus nonce and capability checks, and WCAG 2.2 AA accessibility — backed by a dedicated `wp-reviewer` agent and slash commands for on-demand structured reviews.

**Usage examples:**

```
/wp-review
```
Reviews the current diff against WordPress coding standards, security, and accessibility rules, reporting findings by severity.

```
/wp-security-audit includes/class-rest-controller.php
```
Runs a focused security pass over the given file(s): sanitization gaps, missing escaping, missing nonce/capability checks, unsafe `$wpdb` queries, REST endpoints missing `permission_callback`.

```
/wp-scaffold block myplugin/notice
```
Scaffolds a new block (or `plugin`/`theme`, depending on the arguments) following the conventions documented in `wordpress-development`.

You can also skip the commands and just ask normally — e.g. "add a settings page that saves an API key" — and the relevant skill(s) load automatically.

## doc-assistant

A token-efficient documentation manager. Instead of one giant file read in full on every doc-related task, it maintains a `docs/` tree: a cheap `docs/INDEX.md` table of contents plus focused per-area detail files, so an agent reads a few hundred tokens to find what's relevant and then opens only the file(s) that matter. The `doc-manager` agent creates the tree or updates it incrementally from a diff; a companion Stop/PostToolUse hook nudges you (at most once per unacknowledged edit batch, non-blocking) when code changed but docs didn't — and only in projects that already have `docs/INDEX.md`.

**Usage examples:**

```
/docs-init
```
Explores the codebase and generates `docs/INDEX.md` plus per-area detail files from scratch.

```
/docs-update
```
Looks at your current diff/staged/untracked changes and updates only the detail files (and index lines) those changes actually affect.

```
/docs-check
```
Read-only drift report — stale, missing, and orphaned docs — makes no edits, and suggests `/docs-update` if it finds drift.

## Contributing

This is a personal plugin library, but issues and pull requests are welcome — please keep new plugins self-contained under `plugins/<name>/` with their own `.claude-plugin/plugin.json`, and add an entry to `.claude-plugin/marketplace.json`.

## License

MIT — see [LICENSE](LICENSE).
