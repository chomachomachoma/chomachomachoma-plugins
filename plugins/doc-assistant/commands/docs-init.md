---
description: Generate an initial docs/INDEX.md + per-area docs tree for this project via the doc-manager agent
---

Set up the project's documentation tree from scratch.

## 1. Check for an existing tree

Check whether `docs/INDEX.md` already exists.

- If it **does** exist, do not proceed with init. Tell the user a docs tree is already present and suggest `/docs-update` instead (which updates incrementally rather than regenerating from scratch). Stop here.
- If it does **not** exist, continue.

## 2. Dispatch doc-manager in init mode

Dispatch the `doc-manager` agent (via the Task/Agent tool), explicitly telling it this is **init mode**: no `docs/INDEX.md` exists, explore the codebase, and produce `docs/INDEX.md` plus per-area detail files under `docs/<area>.md` per the layout contract (one index line per file, one-sentence descriptions, detail files covering purpose/entry points/key interfaces — not line-by-line narration).

Do not explore or write the docs yourself — that's the agent's job; your job here is the pre-check, dispatch, and presenting the result.

## 3. Summarize

Once the agent reports back:

- List the files it created (`docs/INDEX.md` plus each `docs/<area>.md`), with a one-line note on what each covers.
- Relay anything it explicitly skipped (trivial/vendored/generated areas) so the user knows the omission was deliberate, not an oversight.
- Mention that documentation will drift from code over time — `/docs-update` keeps it current, and `/docs-check` reports drift without editing anything.
