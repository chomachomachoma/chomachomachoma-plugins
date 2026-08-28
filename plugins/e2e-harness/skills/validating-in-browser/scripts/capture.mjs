// capture.mjs — one-off screenshot helper shipped with the e2e-harness plugin.
// Copied verbatim into a project's e2e/ directory at harness setup; do not edit per-project.
// Usage: node e2e/capture.mjs <url> <out.png>    (set E2E_HEADED=1 for a visible browser)
// Resolves whichever framework the project has: @playwright/test, playwright, or puppeteer.

const [url, out] = process.argv.slice(2);
if (!url || !out) {
  console.error('usage: node capture.mjs <url> <out.png>  (E2E_HEADED=1 for headed)');
  process.exit(1);
}
const headless = process.env.E2E_HEADED !== '1';

async function launch() {
  for (const pkg of ['@playwright/test', 'playwright']) {
    try {
      const { chromium } = await import(pkg);
      return await chromium.launch({ headless });
    } catch (err) {
      if (err.code !== 'ERR_MODULE_NOT_FOUND') throw err;
    }
  }
  try {
    const { default: puppeteer } = await import('puppeteer');
    return await puppeteer.launch({ headless });
  } catch (err) {
    if (err.code !== 'ERR_MODULE_NOT_FOUND') throw err;
    console.error(
      'capture.mjs: no browser framework found — install @playwright/test (or use the project’s puppeteer) per the e2e-harness setup ladder.'
    );
    process.exit(1);
  }
}

const browser = await launch();
try {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.screenshot({ path: out, fullPage: true });
  console.log(out);
} finally {
  await browser.close();
}
