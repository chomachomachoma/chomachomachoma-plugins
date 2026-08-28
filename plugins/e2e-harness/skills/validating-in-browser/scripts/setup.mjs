// setup.mjs — idempotent scaffolder/status tool shipped with the e2e-harness plugin.
// Usage: node <plugin>/scripts/setup.mjs [--check] [--base-url <url>]   (run from the project root)
//   --check      report status only, change nothing
//   --base-url   dev-server URL to bake into a generated config (required to generate one)
// Creates whatever part of the e2e/ contract is missing: e2e/, e2e/screenshots/ + .gitignore,
// e2e/capture.mjs (copied from beside this script), a playwright config (Node projects with a
// framework but no config), and e2e/package.json in non-Node projects. It NEVER installs packages
// and never overwrites an existing file.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.cwd();
const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const baseUrl = args.includes('--base-url') ? args[args.indexOf('--base-url') + 1] : null;

const exists = (p) => fs.existsSync(path.join(root, p));
const report = [];
const actions = [];
const pending = [];

// --- detect framework ---
const hasRootPkg = exists('package.json');
const dep = (name) =>
  exists(path.join('node_modules', name)) || exists(path.join('e2e', 'node_modules', name));
const framework = dep('@playwright/test')
  ? '@playwright/test'
  : dep('playwright')
    ? 'playwright'
    : dep('puppeteer')
      ? 'puppeteer'
      : null;
const mode = !hasRootPkg ? 'self-contained' : framework === 'puppeteer' ? 'puppeteer' : 'node';
report.push(`framework: ${framework ?? 'none installed'}`);
report.push(`mode: ${mode}${hasRootPkg ? '' : ' (no root package.json — never create one)'}`);

// --- detect config ---
const configNames = ['playwright.config.ts', 'playwright.config.js', 'playwright.config.mjs'];
const rootConfig = configNames.find((c) => exists(c));
const e2eConfig = configNames.find((c) => exists(path.join('e2e', c)));
report.push(
  `config: ${e2eConfig ? `e2e/${e2eConfig}` : rootConfig ? `${rootConfig} (existing — adopt it, specs go in its testDir)` : 'none'}`
);

// --- detect browsers (playwright cache) / display ---
const pwCache = path.join(os.homedir(), '.cache', 'ms-playwright');
const browsers = fs.existsSync(pwCache)
  ? fs.readdirSync(pwCache).filter((d) => /^(chromium|firefox|webkit)-/.test(d))
  : [];
report.push(`playwright-browsers: ${browsers.length ? browsers.join(', ') : 'none cached'}`);
report.push(
  `display: ${process.env.DISPLAY || process.env.WAYLAND_DISPLAY ? 'available (headed possible)' : 'none (headless only)'}`
);

// --- scaffold pieces (mkdir/copy/write only; nothing destructive) ---
function ensure(rel, make, note) {
  if (exists(rel)) {
    report.push(`${rel}: present`);
  } else if (checkOnly) {
    report.push(`${rel}: MISSING${note ? ` — ${note}` : ''}`);
  } else {
    make();
    actions.push(`created ${rel}`);
    report.push(`${rel}: created`);
  }
}

ensure('e2e', () => fs.mkdirSync(path.join(root, 'e2e')));
if (exists('e2e')) {
  ensure('e2e/screenshots', () => fs.mkdirSync(path.join(root, 'e2e', 'screenshots')));
  if (exists('e2e/screenshots'))
    ensure('e2e/screenshots/.gitignore', () =>
      fs.writeFileSync(path.join(root, 'e2e', 'screenshots', '.gitignore'), '*\n!.gitignore\n')
    );
  ensure('e2e/capture.mjs', () =>
    fs.copyFileSync(path.join(here, 'capture.mjs'), path.join(root, 'e2e', 'capture.mjs'))
  );
  if (mode === 'self-contained')
    ensure('e2e/package.json', () =>
      fs.writeFileSync(
        path.join(root, 'e2e', 'package.json'),
        JSON.stringify(
          { name: 'e2e', private: true, devDependencies: { '@playwright/test': '^1.49.0' } },
          null,
          2
        ) + '\n'
      )
    );
}

// --- config generation (only when no config exists anywhere and a playwright framework is present) ---
if (!rootConfig && !e2eConfig && framework && framework !== 'puppeteer') {
  const useTs = exists('tsconfig.json');
  const cfgName = `playwright.config.${useTs ? 'ts' : 'js'}`;
  if (!baseUrl) {
    pending.push(`config: not generated — re-run with --base-url <detected dev-server URL> to create e2e/${cfgName}`);
  } else if (!checkOnly) {
    const body = useTs
      ? `import { defineConfig } from '@playwright/test';\n\nexport default defineConfig({\n`
      : `const { defineConfig } = require('@playwright/test');\n\nmodule.exports = defineConfig({\n`;
    fs.writeFileSync(
      path.join(root, 'e2e', cfgName),
      body +
        `  testDir: '.',\n  outputDir: './screenshots/artifacts',\n  retries: 0,\n  reporter: [['list']],\n` +
        `  use: {\n    baseURL: process.env.E2E_BASE_URL || '${baseUrl}',\n    screenshot: 'only-on-failure',\n  },\n});\n`
    );
    actions.push(`created e2e/${cfgName} (baseURL ${baseUrl})`);
    report.push(`config: created e2e/${cfgName}`);
  }
}
if (!framework)
  pending.push(
    mode === 'self-contained'
      ? 'install: (with user consent) cd e2e && npm install && npx playwright install <browsers>'
      : 'install: (with user consent) add @playwright/test as a devDependency, then npx playwright install <browsers>'
  );

console.log(report.join('\n'));
if (actions.length) console.log('\nactions:\n- ' + actions.join('\n- '));
if (pending.length) console.log('\npending:\n- ' + pending.join('\n- '));
if (!actions.length && !pending.length && !checkOnly) console.log('\nharness complete — nothing to do');
