---
description: Write and run a Playwright e2e test for a flow, capture screenshots, and visually validate the result
argument-hint: [--headed] [flow description, route, or URL]
---

Run the end-to-end harness for a user flow. The `validating-in-browser` skill defines every convention used below — setup and bootstrap, the `e2e/` directory contract, the dev-server protocol, and the validation rules. Follow it exactly.

## 1. Determine what to validate

A `--headed` flag anywhere in `$ARGUMENTS` requests a visible browser for this run (per the skill's headed rule — needs a display, headless otherwise); strip it, then parse the rest as a flow description, a route (`/settings/profile`), or a full URL. If nothing remains, derive the target from recent UI changes: `git diff HEAD`, staged changes, and untracked frontend files. If there are no arguments AND no recent UI changes to infer from, print this usage block and stop:

```
Usage: /e2e [--headed] [flow description, route, or URL]

Examples:
  /e2e signup flow — fill the form and submit
  /e2e /settings/profile
  /e2e --headed http://localhost:5173/checkout
```

## 2. Bootstrap the harness

Run the skill's shipped scaffolder from the project root — `node "<skill base dir>/scripts/setup.mjs" --check` for status, then the same script (with `--base-url <detected url>` if it says a config is pending) to create everything missing. Don't assemble contract files by hand. Never install anything without telling the user what and why and getting a go-ahead.

## 3. Ensure the app is reachable

Follow the skill's dev-server protocol: probe for a running server first, start one in the background only if needed, and record the base URL for `E2E_BASE_URL`.

## 4. Write or extend the spec

If a spec for this flow already exists in `e2e/`, extend or update it — don't create a near-duplicate. Otherwise create `e2e/<flow-name>.spec.ts` following the skill's spec conventions: assertions plus named screenshots at key states, role-based locators, console/pageerror listeners.

## 5. Run and validate

Run the spec — headed if requested, headless otherwise. On failure, classify app bug vs test bug vs environment bug before editing anything, fix accordingly, and re-run. Then follow the skill's visual validation protocol: Read every captured PNG — including failure artifacts — before making any judgment. If a screenshot reveals a problem, fix the app, re-run, and re-read.

## 6. Report

End with: a verdict per flow (what was checked and what the screenshots show), whether you started a dev server (and its URL), and a `Screenshots:` list of the absolute path of every PNG captured, each with a one-line description. The path list is mandatory even when the run failed.
