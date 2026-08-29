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
    ├── capture.mjs              # one-off screenshot helper — copied verbatim from this plugin at setup
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

  This is self-contained on purpose: it never touches the user's root `.gitignore` (no diff noise, no merge conflicts), it travels with the directory, and the `!.gitignore` self-exception means the ignore rule itself is committed so the convention persists for teammates.
- Specs are committed, reviewable source — that's why `e2e/` is not a hidden directory.
- `e2e/capture.mjs` is **shipped with this plugin** and placed by `setup.mjs`. Never write, retype, or adapt a capture script: the shipped one auto-detects Playwright or Puppeteer, handles headless and headed (`E2E_HEADED=1`), and takes `--viewport WxH` for mobile-sized captures.

## Setup detection and bootstrap

**Always start with the shipped scaffolder** — one command replaces all manual state-probing and file assembly:

```
node "<this skill's base directory>/scripts/setup.mjs" --check    # from the project root: full status, changes nothing
node "<this skill's base directory>/scripts/setup.mjs" [--base-url <url>]   # idempotently creates every missing piece
```

`--check` reports the framework, config, cached browsers, display availability, and each contract file as present/MISSING. The scaffolding run creates whatever is missing (`e2e/`, `screenshots/` + `.gitignore`, `capture.mjs`, the config when a Playwright framework is present and no config exists anywhere — pass `--base-url` with the detected dev-server URL, never a `:3000` guess — and `e2e/package.json` in non-Node projects). It never installs packages and never overwrites existing files, so it's safe on half-set-up projects. Don't create these files by hand.

What remains yours are the decisions the script can't make:

1. **Existing Playwright config anywhere** (`--check` reports it) → adopt it: write new specs into **its** `testDir` (not `e2e/`), run with plain `npx playwright test`, keep screenshot paths `e2e/screenshots/...` resolved from the project root. Use its `baseURL` as-is; only pass `E2E_BASE_URL` if that config reads it, and if it defines neither, navigate with absolute URLs from the detected server URL rather than editing the user's config.
2. **Puppeteer present, Playwright absent** → don't silently install a second framework. Ask which to use, recommending Playwright (auto-waiting, built-in test runner and assertions, multi-browser) while offering to reuse their Puppeteer. Puppeteer chosen → Puppeteer mode (below), no install.
3. **No framework installed** → **ask the user before installing** — in one prompt, get a go-ahead (`@playwright/test` as a devDependency plus a browser download that is large, ~150MB+, and slow the first time) and ask **which browsers**: Chromium (recommended default), Firefox, and/or WebKit. Package manager from the lockfile (`pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `bun.lock`/`bun.lockb` → bun, else npm), then `<pm> add -D @playwright/test` and `npx playwright install <chosen browsers>` (`--with-deps` may be needed on bare Linux). Non-Node projects instead run `npm install` and the browser install from inside `e2e/` (setup.mjs already created `e2e/package.json`; never create a root one). If the user declines, don't improvise around it: report what's possible without an install and stop. If browsers beyond Chromium were chosen, add a `projects` entry per browser to the generated config (see `references/templates.md`).

Availability means the framework is in `node_modules` — never trust a bare `npx playwright` run, which auto-downloads into the npx cache and succeeds with nothing installed. Non-Node runs happen from inside `e2e/` (`cd e2e && npx playwright test`; screenshot paths then drop the `e2e/` prefix).

The `/e2e-setup` command walks this explicitly for users who want to bootstrap up front rather than on first validation.

## Puppeteer mode

Only when the project already uses Puppeteer and the user chose to keep it. The directory contract, dev-server protocol, visual validation protocol, and reporting rules all apply unchanged; what changes:

- Flows are plain Node scripts, `e2e/<flow-name>.e2e.mjs` (template in `references/templates.md`), using `node:assert` for assertions and the same console/pageerror listeners and named screenshots.
- Run with `node e2e/<flow-name>.e2e.mjs` from the project root; the script reads `E2E_BASE_URL`. No config file is generated.
- Puppeteer uses its own bundled Chrome — never run `npx playwright install` in this mode.

## Dev server protocol

1. **Reuse a running server first.** If a URL is already known to respond this session, skip the probe. Otherwise probe candidate URLs with `curl -sk -o /dev/null -w "%{http_code}" <url>` (`-k` so self-signed https dev servers don't probe as dead) — candidates come from an existing config's `baseURL`, the project's `package.json` scripts, and framework defaults (Vite 5173; Next/CRA/Rails 3000; Django 8000; Flask 5000). Never assume `:3000`.
2. **If nothing is running**, find the start command (`dev`/`start`/`serve` script, or framework heuristics), start it in the background, and poll the URL until it responds (bound the wait — ~30s), then record the URL. For a static site with no start command (bare `index.html`), serve it yourself: `python3 -m http.server <port>` (or `npx serve`) from the site root, on a free port.
3. Pass the URL to test runs as `E2E_BASE_URL` (the generated config reads it). Note in your final report if you started a server, so the user knows it's still running.
4. Don't add a `webServer` block to the generated config — start commands vary per project and per session; a user can add one later if they want Playwright to manage the server.

## Writing specs

- **One spec file per user flow** (`e2e/checkout.spec.ts`, `e2e/login.spec.ts`). When re-validating a flow that already has a spec, extend or update that spec — don't fork a near-duplicate alongside it.
- **Every spec both asserts and screenshots.** Assertions (`expect`) make it a real headless regression test; named `page.screenshot({ path: 'e2e/screenshots/<spec>--<step>.png', fullPage: true })` calls at key states are what this session looks at. A spec that only screenshots isn't a test; a spec that only asserts gives you nothing to look at.
- **Prefer role/label locators** (`getByRole`, `getByLabel`, `getByText`) over CSS selectors — they survive markup refactors.
- **Listen for page errors.** Register `page.on('console')` and `page.on('pageerror')` handlers and surface any errors in the run output — a page can render a screenshot-perfect frame while the console is on fire. Filter out the `/favicon.ico` 404 (see the template): headed Chromium requests it, headless doesn't, and without the filter headed runs fail spuriously on apps with no favicon.

A model spec lives in `references/templates.md`.

## Running and debugging failures

- Node projects with the generated config: `npx playwright test --config e2e/playwright.config.ts [spec-file]` from the project root. Adopted existing config: plain `npx playwright test [spec-file]`. Non-Node: `cd e2e && npx playwright test [spec-file]`. `[spec-file]` is the spec's path (e.g. `e2e/checkout.spec.ts`) to run one flow; omit it to run the whole suite.
- On failure, classify before editing anything: **app bug** (the change broke the page — fix the app), **test bug** (bad locator, wrong assumption — fix the spec), or **environment bug** (server not running, wrong `E2E_BASE_URL` — fix the environment). Misclassifying wastes the whole loop.
- Failure artifacts (screenshots, traces) land in `e2e/screenshots/artifacts/` — read those PNGs too; the failure screenshot usually shows exactly what went wrong.
- **Headless by default, headed only on request.** When the user asks to watch the run (`--headed`, "run it headed"): Playwright → append `--headed` to the run command; Puppeteer mode → run with `E2E_HEADED=1` (the flow-script template reads it), e.g. `E2E_HEADED=1 E2E_BASE_URL=<url> node e2e/login.e2e.mjs`. For a headed one-off capture, the `playwright screenshot` CLI has no headed option — use `e2e/capture.mjs`, which setup already copied into the project (if it's somehow missing, `cp` it from this skill's `scripts/` directory; never write one). Headed needs a display — check before launching (`DISPLAY`/`WAYLAND_DISPLAY` unset on Linux means none; SSH/CI), and if there is none, say so and run headless instead. Never switch to headed on your own: the screenshots are the evidence, not the live window.
- **Headed runs are paced for watching.** The point of headed is that the user sees the actions: set `E2E_SLOWMO=500` on every headed **test run** (`capture.mjs` paces itself to 500 when headed — no variable needed there). Honor a requested speed exactly: "slower" → `1000`, an explicit ms value → that value, "full speed"/"no slow-mo" → `0`. Never slow a headless run. Headed one-off captures additionally hold the window open 3s after the shot (`E2E_HOLD=<ms>`, `0` to skip). The generated config wires `launchOptions.slowMo` to `E2E_SLOWMO` and accepts self-signed dev certificates (`ignoreHTTPSErrors`), as does `capture.mjs`; an adopted config honors either only if it wires them itself — if slow-mo was requested or the site's cert is self-signed and the adopted config can't deliver, say so instead of editing it. A harness-generated config is recognizable by its `Generated by the e2e-harness plugin` first-line comment — only marked configs may be edited (e.g. adding the two `use` lines from the template to one generated by an older version); an unmarked config is the user's.

## Visual validation protocol

This is the load-bearing section. After every run:

1. **Read every captured PNG with the Read tool.** A green exit code proves the assertions passed, not that the page looks right — never claim a UI is validated from the exit code alone.
2. Check what you see: is the change actually visible? Is the layout intact — nothing overlapping, clipped, or blank? Any error states, empty regions, or unstyled content? Is text legible?
3. If something looks wrong: fix the app code, re-run the spec, and **re-read the new screenshots**. A fix you haven't looked at is in the same unverified state you started in.

Claiming a visual pass without having read the screenshots is a protocol violation, not a shortcut.

## Reporting

The final response to the user MUST include, even when the run failed:

- A verdict per validated flow (what was checked, what the screenshots show, pass or fail).
- A `Screenshots:` list with the **project-relative path** of every PNG captured this session (e.g. `e2e/screenshots/checkout--cart-filled.png`), one per line with a one-line description — relative paths are what the terminal renders as clickable links, and long absolute paths wrap and break the link. State the absolute location once, as a single line after the list (`All under <project-root>/e2e/screenshots/`), so files are findable outside the terminal too.
- Whether you started a dev server (and its URL) so the user knows it's still running.

The path list is the user's map to the evidence — omitting it is a reporting failure even if everything passed.

## Common mistakes to avoid

- **Screenshotting without reading.** Capturing PNGs and reporting success without ever opening them defeats the entire harness.
- **Treating a green run as a visual pass.** Assertions can't see a broken layout. Only reading the screenshot can.
- **Force-committing screenshots.** The `.gitignore` exists so screenshots never clog the repo — don't `git add -f` them, and don't move screenshots outside `e2e/screenshots/` to dodge it.
- **Rewriting existing specs from scratch.** Extend the flow's spec; wholesale rewrites discard accumulated coverage and produce noisy diffs.
- **Installing without consent.** The Playwright + browser install is big; the install decision always requires telling the user first — and installing Playwright alongside an existing Puppeteer without asking skips the framework choice.
- **Treating a transient npx download as an install.** Bare `npx playwright …` fetches the package on the fly, so it can run once and prove nothing — availability means the framework is in `node_modules` (root, or `e2e/` in self-contained mode), which `setup.mjs --check` reports. If it's missing when something needs to import it (`capture.mjs`, specs), follow the install decision with consent — in a Node project that's a root devDependency, never a dodge `e2e/package.json` (that file is exclusively for projects with no root `package.json`).
- **Assuming the app runs on `:3000`.** Detect, probe, or ask — never hard-code a port guess into a config or spec.
- **Delegating the looking to a subagent.** A subagent's read of a PNG produces visual understanding only inside the subagent; you get a text summary back. The main session must read the screenshots itself.

## Quick reference

| Situation | Action |
|---|---|
| Just finished UI work | Write/extend a spec for the flow, run it, read the screenshots |
| Unknown/half-set-up project state | `node "<skill dir>/scripts/setup.mjs" --check`, then scaffold with the same script |
| No framework installed | Ask before installing anything (browsers included), then re-run `setup.mjs` |
| Mobile-size capture | `node e2e/capture.mjs <url> <out.png> --viewport 390x844` |
| Project already has a Playwright config | Adopt it; add only `e2e/screenshots/` + `.gitignore` |
| Project uses Puppeteer, no Playwright | Ask which framework; recommend Playwright, honor Puppeteer mode if chosen |
| User wants setup up front | Point at (or follow) `/e2e-setup` |
| User asks to watch the run | Headed: `--headed` (Playwright) / `E2E_HEADED=1` (Puppeteer) — needs a display; still read the PNGs |
| Headed pace | Default `E2E_SLOWMO=500`; "slower" → 1000, explicit ms → that value, "full speed" → 0 |
| Non-Node project | Self-contained `e2e/package.json`; never create a root one |
| Need the app running | Probe for a running server first; start one in the background only if none |
| Run failed | Classify app / test / environment bug; read the artifact PNGs |
| Run passed | Still read every screenshot before claiming a visual pass |
| Reporting | Verdict per flow + clickable relative screenshot paths (+ absolute dir once), always |

For copy-paste templates — the generated `playwright.config.ts` (with multi-browser `projects`), a model spec file, the Puppeteer-mode flow script, the `capture.mjs` one-off screenshot helper, the non-Node `e2e/package.json`, and the screenshots `.gitignore` — read `references/templates.md`.
