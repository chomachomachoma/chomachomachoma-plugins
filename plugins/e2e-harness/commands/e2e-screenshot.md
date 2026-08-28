---
description: Capture a screenshot of a page in the running app and visually inspect it — no test file written
argument-hint: [--headed] <url-or-route> [name]
---

Take a one-off full-page screenshot for visual inspection. The `validating-in-browser` skill defines the conventions used below; no spec file is written.

## 1. Parse arguments

`$ARGUMENTS` is `[--headed] <url-or-route> [name]`. A `--headed` flag requests a visible browser (per the skill's headed rule — needs a display, headless otherwise); strip it first. The URL or route is required — if missing, print this usage block and stop:

```
Usage: /e2e-screenshot [--headed] <url-or-route> [name]

Examples:
  /e2e-screenshot /settings
  /e2e-screenshot --headed http://localhost:5173/checkout checkout-page
```

The optional `[name]` becomes the filename; otherwise derive a kebab-case name from the route (`/settings/profile` → `settings-profile`).

## 2. Ensure prerequisites

Run the skill's `setup.mjs --check` (and then `setup.mjs --base-url <detected url>` to scaffold anything missing), and ensure the app is reachable per the dev-server protocol — resolve a bare route against the detected base URL. Note the difference between the two capture paths: a headless CLI one-off is the single sanctioned exception to the install requirement — it may run off a transient npx download with nothing installed. The capture helper imports the framework and therefore needs it actually present in `node_modules` — if it isn't and headed was requested, follow the skill's install decision (with consent) first; in a Node project that's a root devDependency, never an `e2e/package.json`. If the user declines the install, say headed isn't possible without it and offer the headless CLI capture instead.

## 3. Capture

Headless (the default):

```
npx playwright screenshot --full-page "<url>" e2e/screenshots/<name>.png
```

Headed — the CLI has no headed option, so use the shipped capture helper, which `setup.mjs` already placed at `e2e/capture.mjs` (never write a script):

```
E2E_HEADED=1 node e2e/capture.mjs "<url>" e2e/screenshots/<name>.png
```

For a mobile-size capture (either mode), add `--viewport WxH`, e.g. `--viewport 390x844`.

Mode variants: in non-Node self-contained mode, run either form from inside `e2e/` with the `e2e/` path prefixes dropped (`cd e2e && npx playwright screenshot --full-page "<url>" screenshots/<name>.png`, or `cd e2e && E2E_HEADED=1 node capture.mjs "<url>" screenshots/<name>.png`). In Puppeteer mode the Playwright CLI doesn't exist — use the capture helper (Puppeteer variant) for headless and headed alike.

## 4. Inspect and report

Read the PNG with the Read tool. Describe what's visible and anything that looks wrong (broken layout, error states, blank regions), and end with the screenshot's absolute path so the user can open it.
