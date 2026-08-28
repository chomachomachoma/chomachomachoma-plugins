---
description: One-time e2e harness setup — detect or choose a browser-testing framework, pick browsers, and create the e2e/ directory contract
---

Bootstrap the e2e harness explicitly, without running a test. The `validating-in-browser` skill defines everything used below — the setup ladder, the `e2e/` directory contract, and Puppeteer mode. Follow it exactly.

## 1. Detect what's already here

Run `node "<skill base dir>/scripts/setup.mjs" --check` from the project root — it reports the framework, config, cached browsers, display, and every contract file in one shot. Report what it found. If the harness is already complete, say so and stop — there's nothing to do.

## 2. Choose the framework

- Playwright already present (installed or configured) → use it; no question needed.
- Puppeteer present but not Playwright → ask the user which to use (AskUserQuestion), recommending Playwright for its auto-waiting, built-in test runner and assertions, and multi-browser support, while offering to reuse their existing Puppeteer. Puppeteer chosen → Puppeteer mode: run `setup.mjs` to scaffold, no installs, and skip step 3.
- Neither present → Playwright, via the skill's install decision.

## 3. Confirm the install and pick browsers

Before installing anything, ask in one prompt: a go-ahead for `@playwright/test` plus the browser download (large, ~150MB+, slow the first time), and which browsers to install — Chromium (recommended default), Firefox, and/or WebKit. Then install per the skill's install decision (package manager from the lockfile; non-Node projects install from inside `e2e/`).

## 4. Create the contract

Run `node "<skill base dir>/scripts/setup.mjs"` (add `--base-url <detected url>` if `--check` said a config is pending) — it idempotently creates the `e2e/` tree, `screenshots/` + `.gitignore`, `capture.mjs`, the config, and (non-Node) `e2e/package.json`, without overwriting anything. Add `projects` entries to the config if browsers beyond Chromium were chosen. Never assemble these files by hand, and never touch the root `.gitignore`.

## 5. Report

List exactly what was detected, asked, installed, and created (with paths), and close with how to use the harness: `/e2e [flow]` to write and run a validated test, `/e2e-screenshot <route>` for a one-off capture, or just ask normally after UI changes.
