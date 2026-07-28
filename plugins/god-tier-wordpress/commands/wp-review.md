---
description: Review WordPress code for security, coding-standards, and accessibility issues via the wp-reviewer agent
argument-hint: [path]
---

Run a WordPress code review using the `wp-reviewer` agent.

## 1. Determine scope

- If `$ARGUMENTS` contains a path, review that path (file or directory).
- Otherwise, determine scope from git:
  - Run `git diff --name-only`, `git diff --staged --name-only`, and `git ls-files --others --exclude-standard` to collect modified, staged, and untracked files.
  - If that combined list is non-empty, review those files.
  - If it's empty (nothing changed and no path given), review the whole project — find WordPress PHP/JS/template files (plugin/theme root, `*.php`, block `edit.js`/`save.js`/`render.php`, etc.).

State the resolved scope back to the user in one line before dispatching (e.g., "Reviewing 4 changed files: ...").

## 2. Dispatch the reviewer

Dispatch the `wp-reviewer` agent (via the Task/Agent tool) and pass it the concrete file list (or path/whole-project instruction) determined above. Do not review the code yourself — the agent is the reviewer; your job here is scoping, dispatch, and presentation.

## 3. Present results

Once the agent reports back:

- Present its findings ranked by severity (Critical, High, Medium, Low), exactly as it structured them — don't compress away file:line references or the fix suggestions.
- If there are zero findings, relay that honestly rather than implying a review didn't happen.
- After presenting findings, if there are any **Critical** findings, offer to fix them (ask the user, do not fix automatically): e.g. "I found N Critical issue(s) — want me to fix them now?" Only proceed with fixes if the user says yes, and fix them yourself (the review agent does not edit files).
