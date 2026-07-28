---
description: Read-only check for documentation drift — reports stale, missing, and orphaned docs without editing anything
allowed-tools: Read, Grep, Glob, Bash(git diff:*), Bash(git log:*), Bash(git status:*), Bash(git ls-files:*)
---

Check the project's documentation for drift. This command is **read-only**: it never edits `docs/` or any code, and it does not dispatch the `doc-manager` agent (which is an editing agent) — do this analysis directly in the main session.

## 1. Load the current state

- Read `docs/INDEX.md`. If it doesn't exist, tell the user there's no docs tree yet, suggest `/docs-init`, and stop.
- Note every detail file `INDEX.md` links to.
- List the actual files under `docs/` (e.g. via Glob).

## 2. Gather recent changes

Same approach as `/docs-update`'s change gathering: `git diff HEAD`, `git diff --staged`, and untracked source files if this is a git repo; otherwise skip to comparing docs claims directly against current code for the areas listed in the index.

## 3. Compare and classify

For each signal you find, classify it into one of:

- **Stale** — a detail file exists and is indexed, but its content no longer matches current code behavior (a described interface changed or was removed, a described entry point no longer exists, etc.).
- **Missing** — recent changes touch an area with no corresponding detail file (a new module/feature with nothing documenting it), or a documented area gained significant new surface that isn't reflected.
- **Orphaned** — a file exists under `docs/` but has no entry in `INDEX.md`, or an `INDEX.md` entry points to a file that doesn't exist.

Only read the detail files you actually need to check against the change set — don't bulk-read the whole tree; this command follows the same cheap-reading discipline as everything else in this plugin.

## 4. Report

Present a table:

| Type | Doc / Area | Issue |
|---|---|---|
| Stale | `docs/auth.md` | Describes an endpoint removed in the last commit |
| Missing | `payments` | New module has no detail file |
| Orphaned | `docs/old-notes.md` | Not listed in INDEX.md |

If nothing is stale, missing, or orphaned, say so plainly — don't invent findings to pad the report.

Edit nothing. If drift was found, suggest running `/docs-update` to fix it, and note that it will dispatch the `doc-manager` agent to make the actual edits.
