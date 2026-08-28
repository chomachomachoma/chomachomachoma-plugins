---
description: One-time e2e harness setup — detect or choose a browser-testing framework, pick browsers, and create the e2e/ directory contract
---

Bootstrap the e2e harness explicitly, without running a test. The `validating-in-browser` skill defines everything used below — the setup ladder, the `e2e/` directory contract, and Puppeteer mode. Follow it exactly.

## 1. Detect what's already here

Walk the skill's setup-detection ladder and report what you find before changing anything: an existing harness, an existing Playwright config, an installed `@playwright/test`, an installed Puppeteer, or nothing. If the harness is already fully set up, say so and stop — there's nothing to do.

## 2. Choose the framework

- Playwright already present (installed or configured) → use it; no question needed.
- Puppeteer present but not Playwright → ask the user which to use (AskUserQuestion), recommending Playwright for its auto-waiting, built-in test runner and assertions, and multi-browser support, while offering to reuse their existing Puppeteer. Puppeteer chosen → Puppeteer mode: create the `e2e/` tree and `e2e/screenshots/.gitignore` per the contract (including its skip-if-root-gitignore-covers-it exception), no installs, and skip step 3.
- Neither present → Playwright, via the ladder's install steps.

## 3. Confirm the install and pick browsers

Before installing anything, ask in one prompt: a go-ahead for `@playwright/test` plus the browser download (large, ~150MB+, slow the first time), and which browsers to install — Chromium (recommended default), Firefox, and/or WebKit. Then install per the ladder (package manager from the lockfile; non-Node projects get the self-contained `e2e/package.json`).

## 4. Create the contract

Create whatever the ladder calls for that doesn't already exist: the `e2e/` directory, the generated config (with `projects` entries if browsers beyond Chromium were chosen), `e2e/screenshots/` with its `.gitignore`, and `e2e/capture.mjs` copied verbatim from the skill's `scripts/` directory (never written by hand). Never clobber an existing config, and never touch the root `.gitignore`.

## 5. Report

List exactly what was detected, asked, installed, and created (with paths), and close with how to use the harness: `/e2e [flow]` to write and run a validated test, `/e2e-screenshot <route>` for a one-off capture, or just ask normally after UI changes.
