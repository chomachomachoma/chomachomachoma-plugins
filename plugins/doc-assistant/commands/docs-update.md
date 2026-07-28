---
description: Update docs/ incrementally to reflect recent code changes via the doc-manager agent
---

Update the project's documentation to reflect recent changes.

## 1. Gather changes

Determine what's changed:

- If this is a git repo, collect the change set from `git diff HEAD` (working tree vs. last commit), `git diff --staged` (staged changes), and `git ls-files --others --exclude-standard` (untracked files, read their content since there's no diff for them).
- If the combined change set is empty (nothing changed), tell the user there's nothing to update and stop — don't dispatch the agent for no reason.
- If this is **not** a git repo (or git isn't available), fall back to a docs-vs-code comparison: read `docs/INDEX.md`, spot-check the areas it claims against the current state of the corresponding code, and treat any mismatches you find as the "change set" to hand off.

State the resolved change set back to the user in one line before dispatching (e.g., "3 modified files, 1 untracked file").

## 2. Check that a docs tree exists

If `docs/INDEX.md` doesn't exist, tell the user there's no docs tree to update yet and suggest `/docs-init` instead. Stop here.

## 3. Dispatch doc-manager in update mode

Dispatch the `doc-manager` agent, explicitly telling it this is **update mode**: pass it the concrete change set (diff content, or the docs-vs-code mismatches found above). Instruct it to update only the affected detail files and their `INDEX.md` lines, per the layout contract — not to regenerate the tree.

Do not update the docs yourself — that's the agent's job; your job here is gathering the change set, dispatch, and presenting the result.

## 4. Summarize

Once the agent reports back:

- List what it changed (file, and what changed in it) and what it explicitly skipped (no doc-worthy effect, or not confident enough to document) — relay both honestly.
- Mention any structural fixes it made in passing (orphaned files indexed, dead links removed, files split for length).
