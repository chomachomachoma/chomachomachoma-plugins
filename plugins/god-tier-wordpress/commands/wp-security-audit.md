---
description: Run a security-only audit of WordPress code via the wp-reviewer agent
argument-hint: [path]
---

Run a security-focused audit using the `wp-reviewer` agent.

## 1. Determine scope

- If `$ARGUMENTS` contains a path, audit that path (file or directory).
- Otherwise audit the whole project's WordPress PHP/JS (plugin/theme files, REST/AJAX handlers, block `render.php`, etc.).

State the resolved scope back to the user in one line before dispatching.

## 2. Dispatch the reviewer with a security-only mandate

Dispatch the `wp-reviewer` agent (via the Task/Agent tool) and explicitly restrict its mandate to security only — skip coding-standards and accessibility findings for this run. Instruct it to systematically account for:

- **Every input source**: `$_GET`/`$_POST`/`$_REQUEST`/`$_COOKIE`/`$_FILES`, REST route params (`register_rest_route` `args`), AJAX handler params (`admin-ajax.php` actions) — confirm each is unslashed, sanitized, and validated.
- **Every output sink**: anything echoed into HTML, attributes, URLs, inline JS, or `<style>` — confirm context-correct escaping at the point of output.
- **Every SQL query**: all `$wpdb` calls — confirm `prepare()` with placeholders, no interpolated identifiers/ORDER BY/LIMIT without an allow-list.
- **Nonce and capability coverage on every state-changing action**: saves, deletes, publishes, uploads, settings changes, admin-post/AJAX/REST write handlers — confirm both a nonce/CSRF check and a `current_user_can()` check scoped to the specific object (catching IDOR), not just one or the other.
- **File operations**: uploads, generated files, any filesystem write — confirm safe validation and no path/extension exposure.
- **REST endpoints**: every `register_rest_route()` has an explicit, correctly-scoped `permission_callback`.

## 3. Report

Present the agent's findings ranked Critical/High/Medium/Low with file:line, problem, impact, and fix, exactly as it returns them.

In addition, require (and relay) an explicit **"Attack Surface" summary section** from the agent, enumerating: all external entry points found (REST routes, AJAX actions, admin-post actions, form handlers, file upload endpoints) and, for each, its current protection status (sanitized/validated inputs: yes/no, escaped outputs: yes/no, nonce: yes/no, capability check: yes/no, permission_callback: yes/no/public-by-design). If the agent's report doesn't include this section, ask it to add it before presenting to the user.

Do not auto-fix findings — report only. If the user wants fixes applied, offer to do so as a separate follow-up step (dispatch review agents do not edit files).
