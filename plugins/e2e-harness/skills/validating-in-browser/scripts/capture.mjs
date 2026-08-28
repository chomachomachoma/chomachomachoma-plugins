// capture.mjs — one-off screenshot helper shipped with the e2e-harness plugin.
// Copied verbatim into a project's e2e/ directory at harness setup; do not edit per-project.
// Usage: node e2e/capture.mjs <url> <out.png> [--viewport WxH]
//   E2E_HEADED=1  → visible browser;  --viewport 390x844 → mobile-sized page (default 1280x720)
// Resolves whichever framework the project has: @playwright/test, playwright, or puppeteer.

const args = process.argv.slice(2);
let viewport = null;
const vp = args.indexOf('--viewport');
if (vp !== -1) {
  const m = /^(\d+)x(\d+)$/.exec(args[vp + 1] ?? '');
  if (!m) {
    console.error('capture.mjs: --viewport expects WxH, e.g. --viewport 390x844');
    process.exit(1);
  }
  viewport = { width: Number(m[1]), height: Number(m[2]) };
  args.splice(vp, 2);
}
const [url, out] = args;
if (!url || !out) {
  console.error('usage: node capture.mjs <url> <out.png> [--viewport WxH]  (E2E_HEADED=1 for headed)');
  process.exit(1);
}
const headless = process.env.E2E_HEADED !== '1';

async function launch() {
  for (const pkg of ['@playwright/test', 'playwright']) {
    try {
      const { chromium } = await import(pkg);
      return { browser: await chromium.launch({ headless }), kind: 'playwright' };
    } catch (err) {
      if (err.code !== 'ERR_MODULE_NOT_FOUND') throw err;
    }
  }
  try {
    const { default: puppeteer } = await import('puppeteer');
    return { browser: await puppeteer.launch({ headless }), kind: 'puppeteer' };
  } catch (err) {
    if (err.code !== 'ERR_MODULE_NOT_FOUND') throw err;
    console.error(
      'capture.mjs: no browser framework found — install @playwright/test (or use the project’s puppeteer) per the e2e-harness setup ladder.'
    );
    process.exit(1);
  }
}

const { browser, kind } = await launch();
try {
  const page =
    kind === 'playwright' && viewport ? await browser.newPage({ viewport }) : await browser.newPage();
  if (kind === 'puppeteer' && viewport) await page.setViewport(viewport);
  await page.goto(url, { waitUntil: 'load' });
  await page.screenshot({ path: out, fullPage: true });
  console.log(out);
} finally {
  await browser.close();
}
