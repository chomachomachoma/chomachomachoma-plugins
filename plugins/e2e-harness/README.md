# e2e-harness

A browser-testing harness for visual validation. Claude writes and runs Playwright tests against your running app, captures screenshots at key states, and — the part most setups skip — actually **reads the screenshots** before claiming anything works. Specs persist in your project, so every validation pass grows a real e2e regression suite instead of evaporating when the session ends.

## The e2e/ contract

Everything the harness creates lives under `e2e/` in your project root:

```
<project-root>/
└── e2e/
    ├── playwright.config.ts     # generated only if you have no Playwright config
    ├── <flow-name>.spec.ts      # accumulated regression specs — committed source
    ├── capture.mjs              # one-off screenshot helper — shipped with the plugin, copied at setup
    ├── package.json             # only in non-Node projects (self-contained install)
    └── screenshots/
        ├── .gitignore           # "*" + "!.gitignore" — screenshots never reach git
        ├── <spec>--<step>.png   # named screenshots the session reads and reports
        └── artifacts/           # Playwright failure shots and traces
```

Specs are committed source; screenshots never are. The `.gitignore` inside `e2e/screenshots/` is self-contained on purpose — it never touches your root `.gitignore`, and its `!.gitignore` self-exception keeps the rule itself committed so the convention persists for teammates. If your project already uses Playwright, the harness adopts your existing config and only adds the screenshot conventions.

## Components

| Component | Type | Purpose |
|---|---|---|
| `validating-in-browser` | Skill | Setup/bootstrap (framework and browser choice included), `e2e/` + screenshot conventions, dev-server protocol, Puppeteer mode, and the read-every-screenshot validation and path-reporting protocol. Ships two tools: `setup.mjs` (one-shot status + idempotent scaffolding) and `capture.mjs` (one-off screenshots, headless/headed, `--viewport` for mobile). |
| `/e2e` | Command | Write/extend and run a Playwright spec for a flow (or your recent UI changes), capture screenshots, visually validate, report paths. |
| `/e2e-screenshot` | Command | One-off full-page capture of a URL/route into `e2e/screenshots/` — no test file written. |
| `/e2e-setup` | Command | Explicit one-time bootstrap: detect Playwright/Puppeteer, ask which framework (recommending Playwright) and which browsers to install, create the `e2e/` contract. |

## Usage examples

```
/e2e signup flow — fill the form and submit
```
Bootstraps Playwright if needed (asking first), writes or extends `e2e/signup.spec.ts`, runs it against your dev server, reads the captured screenshots, and reports a verdict plus every screenshot's absolute path.

```
/e2e
```
With no arguments, infers what to validate from your recent UI changes (diff, staged, and untracked frontend files).

```
/e2e-screenshot /settings
```
Captures a full-page screenshot of the route in your running app, inspects it, and reports the path — no test file written.

```
/e2e-setup
```
Bootstraps the harness up front: detects what's installed, asks which framework to use if the project already has Puppeteer (recommending Playwright), asks which browsers to install (Chromium recommended), and creates the `e2e/` tree — without running a test.

You can also skip the commands entirely — after Claude changes UI code, the `validating-in-browser` skill loads automatically when it needs to visually confirm the work, and the same conventions apply.

## Why no agent?

The entire value of the harness is that the *main session* looks at the screenshots. A subagent reading a PNG produces visual understanding only inside the subagent — the main loop would receive a text summary, defeating visual validation. The see-failure → edit-app → re-run → re-look loop also needs the main session's editing context, so the harness deliberately keeps everything in the main loop.

## Notes

- Nothing is installed without your explicit go-ahead — you choose the browsers (Chromium recommended), and the first browser download is large (~150MB+).
- Setup is mechanical, not improvised: a shipped `setup.mjs` reports full harness status in one command and idempotently creates every missing piece (safe on half-set-up projects; it never installs packages or overwrites files).
- If your project already uses Puppeteer, the harness asks before adding Playwright and can run in Puppeteer mode instead — plain Node flow scripts with the same screenshot conventions.
- The harness reuses an already-running dev server when it finds one; if it starts one itself, it tells you so in the report.
- Runs are headless by default. Ask for headed (`/e2e --headed …`, `/e2e-screenshot --headed …`, or just say "run it headed") to watch the browser live — needs a display, and Claude still validates from the screenshots.
- Headed runs are paced for watching: actions slow to 500ms by default, and one-off captures hold the window open 3s. Ask for a speed ("slower", "full speed", or `/e2e --headed --slowmo 1000 …`) to override.
- Self-signed dev certificates (local HTTPS, mkcert-less setups) are accepted automatically by the generated config and the capture helper.
- Screenshot paths are always listed in the final response, pass or fail, so you can open the evidence yourself.
