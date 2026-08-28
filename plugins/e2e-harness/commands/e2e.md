---
description: Write and run a Playwright e2e test for a flow, capture screenshots, and visually validate the result
argument-hint: [flow description, route, or URL]
---

Run the end-to-end harness for a user flow. The `validating-in-browser` skill defines every convention used below — the setup ladder, the `e2e/` directory contract, the dev-server protocol, and the validation rules. Follow it exactly.

## 1. Determine what to validate

Parse `$ARGUMENTS` as a flow description, a route (`/settings/profile`), or a full URL. If empty, derive the target from recent UI changes: `git diff HEAD`, staged changes, and untracked frontend files. If there are no arguments AND no recent UI changes to infer from, print this usage block and stop:

```
Usage: /e2e [flow description, route, or URL]

Examples:
  /e2e signup flow — fill the form and submit
  /e2e /settings/profile
  /e2e http://localhost:5173/checkout
```

## 2. Bootstrap the harness

Walk the skill's setup-detection ladder: reuse an existing harness or Playwright config if present; otherwise create the `e2e/` tree, config, and `e2e/screenshots/.gitignore` per the directory contract. Never install anything without telling the user what and why and getting a go-ahead.

## 3. Ensure the app is reachable

Follow the skill's dev-server protocol: probe for a running server first, start one in the background only if needed, and record the base URL for `E2E_BASE_URL`.

## 4. Write or extend the spec

If a spec for this flow already exists in `e2e/`, extend or update it — don't create a near-duplicate. Otherwise create `e2e/<flow-name>.spec.ts` following the skill's spec conventions: assertions plus named screenshots at key states, role-based locators, console/pageerror listeners.

## 5. Run and validate

Run the spec. On failure, classify app bug vs test bug vs environment bug before editing anything, fix accordingly, and re-run. Then follow the skill's visual validation protocol: Read every captured PNG — including failure artifacts — before making any judgment. If a screenshot reveals a problem, fix the app, re-run, and re-read.

## 6. Report

End with: a verdict per flow (what was checked and what the screenshots show), whether you started a dev server (and its URL), and a `Screenshots:` list of the absolute path of every PNG captured, each with a one-line description. The path list is mandatory even when the run failed.
