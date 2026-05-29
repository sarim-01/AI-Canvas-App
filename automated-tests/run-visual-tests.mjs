/**
 * Headless browser visual regression / smoke test.
 * Prereq: backend :3001 and frontend :5173 running.
 * Run: node automated-tests/run-visual-tests.mjs
 */
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, 'screenshots');
const BASE_URL = process.env.CANVAS_URL || 'http://localhost:5173';

const CASES = [
  { id: 'S1', prompt: 'Create 1 circle in the center labeled A' },
  { id: 'S2', prompt: 'Create 3 circles in a horizontal row' },
  { id: 'S3', prompt: 'Create 2 rectangles side by side' },
  { id: 'S4', prompt: 'Create 1 circle and 1 rectangle' },
  { id: 'M1', prompt: 'Create a star layout with 1 center node and 6 surrounding nodes' },
  { id: 'M2', prompt: 'Create a 3x4 grid of circles labeled A–L' },
  { id: 'M3', prompt: 'Create 4 rectangles in a row and 1 circle above center' },
  { id: 'M4', prompt: 'Create 5 circles in a star pattern' },
  { id: 'M5', prompt: '3 circles and 3 rectangles alternating in a row' },
  { id: 'A3', prompt: 'Create 12 circles labeled A through L in a 3x4 grid' },
  { id: 'C1', prompt: 'Make 20 circles evenly spaced' },
  { id: 'H1', prompt: 'xyzzy foobar nonsense gibberish 12345' },
  { id: 'H7', prompt: 'Create circles with labels HELLO and WORLD' },
];

const results = [];

async function waitForCanvas(page) {
  await page.waitForFunction(
    () => !document.querySelector('.canvas-empty'),
    null,
    { timeout: 25000 },
  );
}

async function runCase(page, { id, prompt }) {
  const clearBtn = page.locator('button.prompt__clear');
  if (await clearBtn.isEnabled()) {
    await clearBtn.click();
    await page.waitForSelector('.canvas-empty', { timeout: 5000 }).catch(() => {});
  }

  await page.locator('textarea.prompt__textarea').fill(prompt);
  await page.locator('button.prompt__submit').click();

  await page
    .waitForSelector('.alert--success, .alert--info', { timeout: 30000 })
    .catch(() => {});

  await waitForCanvas(page);
  await page.waitForTimeout(1200);

  const statusText =
    (await page.locator('.alert--success, .alert--info, .alert--error').first().textContent()) ||
    '';
  const shapeCount = await page.evaluate(() => {
    const m = document.querySelector('.alert--success')?.textContent?.match(/(\d+)\s+shape/);
    return m ? parseInt(m[1], 10) : null;
  });

  const path = join(OUT_DIR, `${id}.png`);
  await page.screenshot({ path, fullPage: true });

  results.push({ id, prompt, statusText: statusText.trim(), shapeCount, screenshot: path });
  console.log(`OK ${id} — ${shapeCount ?? '?'} shapes — ${statusText.trim().slice(0, 60)}`);

  await page.waitForTimeout(3500);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  console.log(`Opening ${BASE_URL}...`);
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });

  await page.waitForSelector('.status-pill--live', { timeout: 45000 });
  console.log('Backend connected.\n');

  for (const c of CASES) {
    try {
      await runCase(page, c);
    } catch (err) {
      console.error(`FAIL ${c.id}:`, err.message);
      results.push({ id: c.id, error: err.message });
      await page.screenshot({ path: join(OUT_DIR, `${c.id}-error.png`), fullPage: true });
    }
  }

  writeFileSync(join(OUT_DIR, 'report.json'), JSON.stringify(results, null, 2));
  await browser.close();
  console.log(`\nScreenshots saved to ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
