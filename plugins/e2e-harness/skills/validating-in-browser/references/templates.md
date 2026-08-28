# Templates

Copy-paste templates for the `validating-in-browser` harness. Replace placeholders before writing any file.

## Generated `e2e/playwright.config.ts`

Only generate this when the project has no Playwright config of its own (setup ladder step 3). Replace `<DETECTED_URL>` with the URL you actually detected or started — never leave the placeholder in, and never guess `:3000`. For projects with no TypeScript signals, write the same config as `playwright.config.js` using `require`/`module.exports`.

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  outputDir: './screenshots/artifacts',
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || '<DETECTED_URL>',
    screenshot: 'only-on-failure',
  },
});
```

If the user chose browsers beyond Chromium at install time, add a `projects` entry per chosen browser inside the config — every run then executes all listed browsers, so explicit screenshot paths MUST include the browser name (see the naming rule in SKILL.md) or the second browser silently overwrites the first's PNGs. In specs, get the browser from the project name:

```ts
await page.screenshot({
  path: `e2e/screenshots/signup--homepage--${test.info().project.name}.png`,
  fullPage: true,
});
```

The `projects` block, trimmed to the browsers actually chosen:

```ts
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
```

## Model spec file (`e2e/<flow-name>.spec.ts`)

The shape every generated spec follows: console/pageerror listeners, `baseURL`-relative navigation, role-based locators, real assertions, and named screenshots at key states.

```ts
import { test, expect } from '@playwright/test';

test.describe('signup flow', () => {
  test('user can sign up from the homepage', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') pageErrors.push(msg.text());
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/signup--homepage.png', fullPage: true });

    await page.getByRole('link', { name: 'Sign up' }).click();
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('correct-horse-battery');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('Welcome')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/signup--after-submit.png', fullPage: true });

    expect(pageErrors, `page errors: ${pageErrors.join('; ')}`).toHaveLength(0);
  });
});
```

In non-Node self-contained mode the config and specs run from inside `e2e/`, so screenshot paths drop the `e2e/` prefix: `screenshots/signup--homepage.png`.

## Puppeteer-mode flow script (`e2e/<flow-name>.e2e.mjs`)

Only for Puppeteer mode (setup ladder step 4, user kept their existing Puppeteer). Plain Node script — no config, no test runner. Run with `node e2e/<flow-name>.e2e.mjs` from the project root; a non-zero exit is a failure.

```js
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const BASE = process.env.E2E_BASE_URL || '<DETECTED_URL>';
const browser = await puppeteer.launch();
try {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') pageErrors.push(msg.text());
  });

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
  assert.ok(await page.$('h1'), 'expected an h1 on the homepage');
  await page.screenshot({ path: 'e2e/screenshots/homepage--loaded.png', fullPage: true });

  assert.equal(pageErrors.length, 0, `page errors: ${pageErrors.join('; ')}`);
} finally {
  await browser.close();
}
```

## Non-Node `e2e/package.json`

Only for projects with no root `package.json` (setup ladder step 6). Never create a root `package.json` for a non-Node project.

```json
{
  "name": "e2e",
  "private": true,
  "devDependencies": {
    "@playwright/test": "^1.49.0"
  }
}
```

## `e2e/screenshots/.gitignore`

Exactly these two lines — the `!.gitignore` self-exception keeps the rule itself committed so the convention persists for teammates:

```
*
!.gitignore
```
