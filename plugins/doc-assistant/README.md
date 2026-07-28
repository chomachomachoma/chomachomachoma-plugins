# doc-assistant

A token-efficient documentation manager for Claude Code. Instead of one giant `ARCHITECTURE.md` that gets read in full every time anything touches docs, this plugin maintains a `docs/` tree with a cheap table of contents (`docs/INDEX.md`) plus focused per-area detail files — so agents read a few hundred tokens to find what's relevant, then open only the file(s) that matter.

## The docs layout contract

- `docs/INDEX.md` — one line per doc file, and nothing else:

  ```
  - [Title](file.md) — one-sentence description
  ```

- `docs/<area>.md` — one detail file per code area (a module, subsystem, service, or major feature), documenting purpose, entry points, and key interfaces — not a line-by-line narration of the code.
- Every detail file is listed in the index, and every index entry points to a real file. Detail files are updated incrementally from diffs, not rewritten wholesale for small changes. A file that grows past ~300 lines gets split, with the index updated in the same pass.

This contract is the source of truth across the whole plugin — the skill defines it, the agent enforces it, and the commands dispatch the agent against it.

## Components

| Component | Type | Purpose |
|---|---|---|
| `managing-docs` | Skill | The layout contract plus reading, writing, and freshness protocols — how to read `docs/` cheaply and keep it in sync. |
| `doc-manager` | Agent | Creates the initial tree (init mode) or updates the affected docs from a diff (update mode); reports what it changed and skipped. |
| `/docs-init` | Command | Bootstraps `docs/INDEX.md` and per-area docs for a project that doesn't have one yet. |
| `/docs-update` | Command | Gathers recent changes (git diff/staged/untracked, or a docs-vs-code comparison outside git) and updates only the affected docs. |
| `/docs-check` | Command | Read-only drift report — stale, missing, and orphaned docs — edits nothing, suggests `/docs-update` when it finds drift. |

## Usage examples

```
/docs-init
```
Explores the codebase and generates `docs/INDEX.md` plus per-area detail files from scratch. Refuses to run (and points you at `/docs-update` instead) if a docs tree already exists.

```
/docs-update
```
Looks at your current diff/staged/untracked changes and updates only the detail files (and their index lines) those changes actually affect.

```
/docs-check
```
Compares recent changes against the existing docs and reports a table of stale, missing, and orphaned entries — read-only, makes no edits, and tells you to run `/docs-update` if it finds drift.

Because `managing-docs` auto-loads based on its description triggers, you can also just ask normally — e.g. "document the new billing module" or "is the auth doc still accurate?" — and Claude Code will apply the same layout and protocols without needing a slash command.

## Docs-drift reminder hook

A companion hook (added separately from this plugin's core components) reminds you at the end of a session if code changed but `docs/` didn't — a nudge to run `/docs-update` before you forget what changed. It's advisory only: it never edits anything itself. To disable it, uninstall this plugin.
