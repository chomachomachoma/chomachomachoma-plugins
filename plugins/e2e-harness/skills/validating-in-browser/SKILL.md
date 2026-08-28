---
name: validating-in-browser
description: Use when verifying frontend or UI work in a real browser — after implementing, changing, or fixing UI code and needing to visually confirm it renders and behaves correctly, when asked to screenshot a page or test a user flow, or when writing/running end-to-end browser tests — covers Playwright (or Puppeteer) setup, the e2e/ suite and screenshot conventions, and reading screenshots to validate visually.
---

# Validating In Browser

UI code that hasn't been looked at in a browser is unverified — "it compiles" and "the unit tests pass" are not evidence that a page renders correctly. This skill defines the harness for closing that gap: write a Playwright spec, run it against the live app, capture screenshots, **read the screenshots with the Read tool**, and report their paths. Specs persist in `e2e/` so every validation grows a regression suite instead of evaporating when the session ends. Every rule below protects one of two properties: the screenshots actually get looked at, and the project stays clean (specs committed, screenshots never committed).

## The directory contract

All harness output lives under `e2e/` in the project root:

```
<project-root>/
└── e2e/
    ├── playwright.config.ts     # generated only if the project has no Playwright config
    ├── <flow-name>.spec.ts      # accumulated regression specs — committed source
    ├── capture.mjs              # one-off screenshot helper — created on first need
    ├── package.json             # ONLY in non-Node projects (self-contained install)
    └── screenshots/
        ├── .gitignore           # keeps every screenshot out of git
        ├── <spec>--<step>.png   # explicit screenshots taken by specs
        └── artifacts/           # Playwright outputDir: failure shots, traces
```

- Screenshot filenames are deterministic and descriptive: `<spec>--<step>.png`, kebab-case (e.g. `checkout--cart-filled.png`, `login--after-submit.png`). When the config defines multiple browser `projects`, every explicit screenshot path appends the browser: `<spec>--<step>--<browser>.png` via `test.info().project.name` — otherwise browsers overwrite each other's PNGs. Deterministic paths are what make the PNGs readable and reportable — never rely on Playwright's run-dependent artifact paths for screenshots you intend to look at.
- `e2e/screenshots/.gitignore` contains exactly:

  ```
  *
  !.gitignore
  ```

  This is self-contained on purpose: it never touches the user's root `.gitignore` (no diff noise, no merge conflicts), it travels with the directory, and the `!.gitignore` self-exception means the ignore rule itself is committed so the convention persists for teammates. Create it whenever you create `e2e/screenshots/` — unless the root `.gitignore` already ignores the screenshots directory, in which case skip it.
- Specs are committed, reviewable source — that's why `e2e/` is not a hidden directory.

## Setup detection and bootstrap

Work down this ladder and stop at the first step that applies:

1. **Harness already set up** — `e2e/` exists with a config and `@playwright/test` is in `node_modules` (root, or `e2e/` in self-contained mode — this presence check is the authoritative test of availability everywhere in this skill) → just run. `npx --no-install playwright --version` works as a sanity check; never bare `npx playwright` — it auto-downloads into the npx cache and succeeds even when nothing is installed.
2. **Project already uses Playwright with its own config** (`playwright.config.{ts,js,mjs}` at root or elsewhere) → adopt it: write new specs into **its** `testDir` (not `e2e/`), run with plain `npx playwright test`, and add only the `e2e/screenshots/` directory + `.gitignore` convention — screenshot paths in specs stay `e2e/screenshots/...`, resolved from the project root. Use its `baseURL` as-is; only pass `E2E_BASE_URL` if that config reads it, and if it defines neither, navigate with absolute URLs built from the detected server URL rather than editing the user's config. Never clobber or duplicate an existing config.
3. **`@playwright/test` installed but no config** (check `package.json` and `node_modules/@playwright/test`) → generate `e2e/playwright.config.ts` from `references/templates.md`. Use `.js` instead if the project shows no TypeScript signals (no tsconfig, no `.ts` sources) — the same rule applies to spec files.
4. **Puppeteer present, Playwright absent** (`puppeteer` in `package.json`/`node_modules`) → don't silently install a second framework. Tell the user what you found and ask which to use, recommending Playwright for its better fit here (auto-waiting, built-in test runner and assertions, multi-browser) while offering to reuse their existing Puppeteer. Playwright → continue down the ladder (this choice may be folded into step 5's install prompt as one question set); Puppeteer → use Puppeteer mode (below), no install needed.
5. **Nothing installed, root `package.json` exists** → **ask the user before installing** — in one prompt, get a go-ahead (`@playwright/test` as a devDependency plus a browser download that is large, ~150MB+, and slow the first time) and ask **which browsers to install**: Chromium (recommended default), Firefox, and/or WebKit. Detect the package manager from the lockfile (`pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `bun.lock`/`bun.lockb` → bun, else npm), then `<pm> add -D @playwright/test` and `npx playwright install <chosen browsers>` (on bare Linux hosts `--with-deps` may be needed). Then generate the config per step 3 — if anything beyond Chromium was chosen, add a `projects` entry per chosen browser (see `references/templates.md`). If the user declines the install, don't improvise around it: report what's possible without one (a headless one-off via the CLI) and stop.
6. **Non-Node project** (no root `package.json`) → never create one. With the same consent and browser question as step 5, create a self-contained `e2e/package.json` (template in `references/templates.md`), then from inside `e2e/`: `npm install`, `npx playwright install <chosen browsers>`, and generate the config per step 3. Run with `cd e2e && npx playwright test` (screenshot paths then resolve relative to `e2e/`).

The `/e2e-setup` command walks this ladder explicitly for users who want to bootstrap the harness up front rather than on first validation.

## Puppeteer mode

Only when the project already uses Puppeteer and the user chose to keep it. The directory contract, dev-server protocol, visual validation protocol, and reporting rules all apply unchanged; what changes:

- Flows are plain Node scripts, `e2e/<flow-name>.e2e.mjs` (template in `references/templates.md`), using `node:assert` for assertions and the same console/pageerror listeners and named screenshots.
- Run with `node e2e/<flow-name>.e2e.mjs` from the project root; the script reads `E2E_BASE_URL`. No config file is generated.
- Puppeteer uses its own bundled Chrome — never run `npx playwright install` in this mode.

## Dev server protocol

1. **Reuse a running server first.** Probe candidate URLs with `curl -s -o /dev/null -w "%{http_code}" <url>` — candidates come from an existing config's `baseURL`, the project's `package.json` scripts, and framework defaults (Vite 5173; Next/CRA/Rails 3000; Django 8000; Flask 5000). Never assume `:3000`.
2. **If nothing is running**, find the start command (`dev`/`start`/`serve` script, or framework heuristics), start it in the background, and poll the URL until it responds (bound the wait — ~30s), then record the URL. For a static site with no start command (bare `index.html`), serve it yourself: `python3 -m http.server <port>` (or `npx serve`) from the site root, on a free port.
3. Pass the URL to test runs as `E2E_BASE_URL` (the generated config reads it). Note in your final report if you started a server, so the user knows it's still running.
4. Don't add a `webServer` block to the generated config — start commands vary per project and per session; a user can add one later if they want Playwright to manage the server.

## Writing specs

- **One spec file per user flow** (`e2e/checkout.spec.ts`, `e2e/login.spec.ts`). When re-validating a flow that already has a spec, extend or update that spec — don't fork a near-duplicate alongside it.
- **Every spec both asserts and screenshots.** Assertions (`expect`) make it a real headless regression test; named `page.screenshot({ path: 'e2e/screenshots/<spec>--<step>.png', fullPage: true })` calls at key states are what this session looks at. A spec that only screenshots isn't a test; a spec that only asserts gives you nothing to look at.
- **Prefer role/label locators** (`getByRole`, `getByLabel`, `getByText`) over CSS selectors — they survive markup refactors.
- **Listen for page errors.** Register `page.on('console')` and `page.on('pageerror')` handlers and surface any errors in the run output — a page can render a screenshot-perfect frame while the console is on fire.

A model spec lives in `references/templates.md`.

## Running and debugging failures

- Node projects with the generated config: `npx playwright test --config e2e/playwright.config.ts [spec-file]` from the project root. Adopted existing config: plain `npx playwright test [spec-file]`. Non-Node: `cd e2e && npx playwright test [spec-file]`.
- On failure, classify before editing anything: **app bug** (the change broke the page — fix the app), **test bug** (bad locator, wrong assumption — fix the spec), or **environment bug** (server not running, wrong `E2E_BASE_URL` — fix the environment). Misclassifying wastes the whole loop.
- Failure artifacts (screenshots, traces) land in `e2e/screenshots/artifacts/` — read those PNGs too; the failure screenshot usually shows exactly what went wrong.
- **Headless by default, headed only on request.** When the user asks to watch the run (`--headed`, "run it headed"): Playwright → append `--headed` to the run command; Puppeteer mode → run with `E2E_HEADED=1` (the flow-script template reads it), e.g. `E2E_HEADED=1 E2E_BASE_URL=<url> node e2e/login.e2e.mjs`. For a headed one-off capture, the `playwright screenshot` CLI has no headed option — use the `e2e/capture.mjs` helper (template in `references/templates.md`), never an improvised script. Headed needs a display — check before launching (`DISPLAY`/`WAYLAND_DISPLAY` unset on Linux means none; SSH/CI), and if there is none, say so and run headless instead. Never switch to headed on your own: the screenshots are the evidence, not the live window.

## Visual validation protocol

This is the load-bearing section. After every run:

1. **Read every captured PNG with the Read tool.** A green exit code proves the assertions passed, not that the page looks right — never claim a UI is validated from the exit code alone.
2. Check what you see: is the change actually visible? Is the layout intact — nothing overlapping, clipped, or blank? Any error states, empty regions, or unstyled content? Is text legible?
3. If something looks wrong: fix the app code, re-run the spec, and **re-read the new screenshots**. A fix you haven't looked at is in the same unverified state you started in.

Claiming a visual pass without having read the screenshots is a protocol violation, not a shortcut.

## Reporting

The final response to the user MUST include, even when the run failed:

- A verdict per validated flow (what was checked, what the screenshots show, pass or fail).
- A `Screenshots:` list with the **absolute path** of every PNG captured this session, each with a one-line description of what it shows.
- Whether you started a dev server (and its URL) so the user knows it's still running.

The path list is the user's map to the evidence — omitting it is a reporting failure even if everything passed.

## Common mistakes to avoid

- **Screenshotting without reading.** Capturing PNGs and reporting success without ever opening them defeats the entire harness.
- **Treating a green run as a visual pass.** Assertions can't see a broken layout. Only reading the screenshot can.
- **Force-committing screenshots.** The `.gitignore` exists so screenshots never clog the repo — don't `git add -f` them, and don't move screenshots outside `e2e/screenshots/` to dodge it.
- **Rewriting existing specs from scratch.** Extend the flow's spec; wholesale rewrites discard accumulated coverage and produce noisy diffs.
- **Installing without consent.** The Playwright + browser install is big; any ladder step that installs (5 and 6) requires telling the user first — and installing Playwright alongside an existing Puppeteer without asking skips step 4's choice.
- **Treating a transient npx download as an install.** Bare `npx playwright …` fetches the package on the fly, so it can run once and prove nothing — availability means `@playwright/test` in `package.json`/`node_modules` (root, or `e2e/` in self-contained mode). If it's missing when something needs to import it (`capture.mjs`, specs), walk the ladder's install step with consent — in a Node project that's a root devDependency, never a dodge-the-ladder `e2e/package.json` (that file is exclusively for projects with no root `package.json`).
- **Assuming the app runs on `:3000`.** Detect, probe, or ask — never hard-code a port guess into a config or spec.
- **Delegating the looking to a subagent.** A subagent's read of a PNG produces visual understanding only inside the subagent; you get a text summary back. The main session must read the screenshots itself.

## Quick reference

| Situation | Action |
|---|---|
| Just finished UI work | Write/extend a spec for the flow, run it, read the screenshots |
| No Playwright in project | Walk the setup ladder; ask before installing anything (browsers included) |
| Project already has a Playwright config | Adopt it; add only `e2e/screenshots/` + `.gitignore` |
| Project uses Puppeteer, no Playwright | Ask which framework; recommend Playwright, honor Puppeteer mode if chosen |
| User wants setup up front | Point at (or follow) `/e2e-setup` |
| User asks to watch the run | Headed: `--headed` (Playwright) / `E2E_HEADED=1` (Puppeteer) — needs a display; still read the PNGs |
| Non-Node project | Self-contained `e2e/package.json`; never create a root one |
| Need the app running | Probe for a running server first; start one in the background only if none |
| Run failed | Classify app / test / environment bug; read the artifact PNGs |
| Run passed | Still read every screenshot before claiming a visual pass |
| Reporting | Verdict per flow + absolute screenshot paths, always |

For copy-paste templates — the generated `playwright.config.ts` (with multi-browser `projects`), a model spec file, the Puppeteer-mode flow script, the `capture.mjs` one-off screenshot helper, the non-Node `e2e/package.json`, and the screenshots `.gitignore` — read `references/templates.md`.
