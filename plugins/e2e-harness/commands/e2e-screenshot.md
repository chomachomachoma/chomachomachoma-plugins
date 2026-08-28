---
description: Capture a screenshot of a page in the running app and visually inspect it — no test file written
argument-hint: <url-or-route> [name]
---

Take a one-off full-page screenshot for visual inspection. The `validating-in-browser` skill defines the conventions used below; no spec file is written.

## 1. Parse arguments

`$ARGUMENTS` is `<url-or-route> [name]`. The URL or route is required — if missing, print this usage block and stop:

```
Usage: /e2e-screenshot <url-or-route> [name]

Examples:
  /e2e-screenshot /settings
  /e2e-screenshot http://localhost:5173/checkout checkout-page
```

The optional `[name]` becomes the filename; otherwise derive a kebab-case name from the route (`/settings/profile` → `settings-profile`).

## 2. Ensure prerequisites

Playwright must be available per the skill's setup ladder (consent before any install), and the app reachable per its dev-server protocol — resolve a bare route against the detected base URL. Ensure `e2e/screenshots/` and its `.gitignore` exist per the directory contract.

## 3. Capture

```
npx playwright screenshot --full-page "<url>" e2e/screenshots/<name>.png
```

Playwright's built-in CLI — no spec file needed for one-offs.

## 4. Inspect and report

Read the PNG with the Read tool. Describe what's visible and anything that looks wrong (broken layout, error states, blank regions), and end with the screenshot's absolute path so the user can open it.
