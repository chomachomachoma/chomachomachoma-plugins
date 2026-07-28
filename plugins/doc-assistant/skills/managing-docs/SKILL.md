---
name: managing-docs
description: Use when reading, creating, or updating project documentation in a repo that has (or should have) a docs/INDEX.md — covers the docs/ layout contract, how to read docs cheaply, how to write/update them incrementally, and how to keep the index in sync.
---

# Managing Docs

This skill defines a token-efficient documentation layout and the protocols for reading and writing it. The whole point: make "what does this project do" answerable from a few hundred tokens (the index) instead of thousands (the full docs tree), and keep detail files current without ever rewriting them wholesale. Every rule below exists to protect that property — if an action would force a future reader to bulk-read the tree, or would leave the index lying about what's in the tree, don't do it.

## Why this layout

Agent context is expensive and finite. A docs tree that's helpful to a human skimming in an editor can be actively hostile to an agent that has to read it token-by-token before it can act — a 5,000-line `ARCHITECTURE.md` costs real budget every single time anything touches documentation, even for a one-line question. Splitting into a cheap index plus scoped detail files means the cost of consulting docs scales with how much of the project a task actually touches, not with the size of the whole project. This only holds if the contract is followed exactly: a bloated index, an unindexed file, or a habit of bulk-reading `docs/` "to be safe" all quietly re-introduce the cost this layout exists to avoid.

## The layout contract

- `docs/INDEX.md` is the table of contents. It contains exactly one line per doc file, in this format:

  ```
  - [Title](file.md) — one-sentence description
  ```

- Detail files live at `docs/<area>.md` — one file per code area (a module, a subsystem, a service, a major feature), not one file per source file and not one giant file for the whole project.
- `INDEX.md` itself stays short: a heading, optionally a one-line project blurb, then the list. It never contains prose explanations, code samples, or multi-sentence descriptions — those belong in the detail file, never in the index.
- Every detail file listed in `INDEX.md` must exist; every detail file that exists must be listed in `INDEX.md`. An orphaned file (exists on disk but not indexed) or a dead link (indexed but the file is missing) is a bug in the docs tree — fix it the moment you notice it, even if it wasn't the thing you were asked to do.

Example `INDEX.md`:

```markdown
# Project Docs

- [Authentication](auth.md) — session/token auth, login flow, and permission checks.
- [Billing](billing.md) — subscription plans, Stripe webhook handling, invoicing.
- [CLI](cli.md) — command list, argument parsing, and how subcommands are registered.
```

Example detail file (`docs/auth.md`) — organized by purpose, entry points, and interfaces, not a line-by-line narration:

```markdown
# Authentication

Session-based auth with a JWT refresh flow. Entry point: `src/auth/middleware.ts`.

## Key interfaces
- `authenticate(req)` — validates the session cookie, attaches `req.user`.
- `requireRole(role)` — middleware factory for route-level authorization.

## Notes
- Refresh tokens rotate on every use; see `src/auth/refresh.ts`.
```

## Reading protocol

Read for cheapness first, always, in this order:

1. **Read `docs/INDEX.md` first, and only `INDEX.md`, before anything else.** It's the map. Never bulk-read the contents of `docs/` (e.g. globbing every file, or reading every file in the directory in one pass) — that defeats the entire purpose of having an index. If a task seems to require "understanding the whole project," resist the urge to read everything; the index plus one or two targeted detail files is almost always enough to start.
2. From the index's one-sentence descriptions, identify which detail file(s) are actually relevant to the current task. Match on the area the task touches, not on keyword overlap alone — a task about "login rate limiting" is about `auth.md`, even if the word "rate" doesn't appear in its description.
3. Open **only** those detail files. If the task turns out to need more context than expected, open additional files one at a time as the need becomes concrete — don't pre-emptively load the whole tree "just in case." Each additional file you open should be justified by something you actually learned, not by general caution.
4. If `docs/INDEX.md` doesn't exist yet, that's a signal the project has no managed docs tree — don't invent one ad hoc or start writing scattered doc files. Point the user at `/docs-init` instead.
5. Never trust a stale mental model of the tree from earlier in a long session — if significant time or many edits have passed since you last read `INDEX.md`, re-read it; files may have been added, removed, or split.

## Writing protocol

- **Update incrementally.** When code changes, read the diff (or the specific change being made) and update only the doc sections that describe what changed. Never rewrite a whole detail file from scratch for a small change — that wastes tokens, discards unrelated content a human may have hand-tuned, and produces noisy diffs that are hard to review. A one-line behavior change should produce a one- or two-line doc edit, not a full-file rewrite.
- **Keep index lines to one sentence.** If a description needs a second sentence to stay accurate, that's a signal the nuance belongs in the detail file, not the index — trim the index line back to the single-sentence gist and put the extra detail in the file body.
- **One doc file per code area, not per source file.** Group by area (e.g. `docs/auth.md`, `docs/billing.md`, `docs/cli.md`), not by individual source file — a detail file should read as a coherent overview of that area, not a list of per-file notes stitched together. When a new source file is added inside an existing area, it usually extends that area's existing detail file rather than spawning a new one.
- **Split files that grow past ~300 lines.** When a detail file crosses roughly 300 lines, split it into two or more files along a natural seam (e.g. `docs/api.md` becomes `docs/api-rest.md` + `docs/api-webhooks.md`), and update `INDEX.md` to list both with their own one-sentence descriptions in the same pass. Don't let a single file become a dumping ground because splitting felt like extra work in the moment.
- **Content is behavior and interfaces, not implementation trivia.** Document what a piece of the system does, its purpose, its entry points, and its key interfaces (public functions, APIs, config surface, CLI commands, important data shapes) — not a narration of internal logic or a restatement of what the code obviously does line by line. A reader should be able to use or extend the area from the doc without reading the source first, but the doc shouldn't be so exhaustive that maintaining it becomes its own burden.
- **Don't fabricate.** If you're updating docs for a change you don't fully understand (an ambiguous diff, code whose intent isn't evident, a refactor with no clear behavioral delta), say so explicitly rather than guessing at a plausible-sounding description. A wrong doc is worse than a missing one.

## Freshness protocol

- **Every doc edit that changes a file's summary must update the matching `INDEX.md` line in the same pass.** If editing `docs/auth.md` changes what the area does, or changes its accurate one-sentence description, update the corresponding index line as part of the same edit — never leave that for later. If the edit doesn't change the summary (a typo fix, added detail that doesn't shift the gist, a reworded example), the index line can stay as-is.
- **Never let `INDEX.md` and the file tree drift apart.** Adding a new detail file without adding its index entry, or deleting/renaming a detail file without updating its index entry, is exactly the kind of drift this layout exists to prevent — always do both halves of the change together, in the same pass.
- **Scope updates to what the diff actually touches.** When updating from a diff or a specific change, don't use it as an excuse to rewrite unrelated docs. If you notice unrelated staleness while you're in there, mention it in your report rather than silently fixing it out of scope — the exception is the orphan/dead-link case above, which is always in scope to fix immediately since it's a structural break, not a content judgment call.

## Common mistakes to avoid

- **Bulk-reading `docs/` "to get oriented."** Even a thorough-sounding justification ("I want full context before I start") doesn't excuse it — read the index, form a hypothesis about what's relevant, and open only that. If the index turns out to be insufficient, that's useful information, not a reason to have skipped it.
- **Writing index descriptions that summarize the file's title instead of its content.** `- [Billing](billing.md) — billing stuff.` tells a reader nothing they didn't already know from the filename. Say what's actually in there: plans, webhook handling, invoicing.
- **Treating docs like a changelog.** Detail files describe current behavior and interfaces, not a history of what changed and when — that's what git history is for. Don't accumulate "as of this update, X now does Y" language; just state what X does now.
- **Creating a new detail file for every small addition.** A new endpoint in an existing API area extends `docs/api.md`; it doesn't spawn `docs/new-endpoint.md`. New files are for genuinely new areas.
- **Fixing the index but not the file, or vice versa.** Both halves of any structural change (add/remove/split/rename a detail file) happen together. A PR-sized mental model helps: if your edit touches `docs/`, ask "does `INDEX.md` still accurately list what's on disk?" before considering the edit done.

## Edge cases

- **No git repo, or docs updated outside a diff-driven flow.** The reading and layout rules still apply unchanged. For freshness, compare the docs' claims against the current state of the code directly (what does this detail file say exists vs. what actually exists) rather than working from a diff.
- **Monorepos / multiple packages.** Prefer one `docs/` tree with areas named after packages/services (`docs/api-gateway.md`, `docs/worker.md`) over per-package doc trees, unless the packages are independently versioned and distributed — then each may warrant its own `docs/INDEX.md`. Don't mix both patterns in the same repo without a clear reason.
- **A task touches code with no obviously corresponding doc area.** Don't force it into an unrelated existing file. Either it's genuinely a new area (add a detail file + index entry) or it's a minor enough addition to an existing area that it belongs there — use judgment, and say which you chose and why.

## Quick reference

| Situation | Action |
|---|---|
| Starting a task in an unfamiliar repo | Read `docs/INDEX.md` only, pick relevant detail file(s), open only those |
| No `docs/INDEX.md` exists | Don't invent docs ad hoc — point at `/docs-init` |
| Code changed | Update only the affected detail file(s) + their index lines, driven by the diff |
| A detail file exceeds ~300 lines | Split along a natural seam, update `INDEX.md` with both new entries |
| A doc's one-sentence summary changed | Update the `INDEX.md` line in the same edit, same pass |
| You find an orphaned file or a dead index link | Fix it now, regardless of what else you were doing |
| Diff intent is unclear or you're not confident | Say so; don't invent a plausible-sounding description |
| Unrelated staleness noticed mid-task | Report it; don't fix it out of scope (except orphans/dead links) |
