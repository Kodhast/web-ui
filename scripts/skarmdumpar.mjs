#!/usr/bin/env node
// Skärmdumpar av galleriets delar, ljust och mörkt, i screenshots/ med Roborazzi-bildernas namn
// (t.ex. AppButton_djup_light.png), så att de kan läggas bredvid android-ui:s bilder.
// 400 breda i 2,925 skala = 1170 bildpunkter, som Roborazzi-bilderna.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'screenshots');
mkdirSync(out, { recursive: true });
const url = pathToFileURL(join(root, 'gallery', 'index.html')).href;

const browser = await chromium.launch();
try {
  for (const [tema, suffix] of [['ljust', 'light'], ['mork', 'dark']]) {
    const page = await browser.newPage({ viewport: { width: 440, height: 900 }, deviceScaleFactor: 2.925 });
    await page.goto(`${url}?tema=${tema}`);
    await page.evaluate(() => document.fonts.ready);
    const frames = await page.locator('[data-skarmdump]').all();
    for (const frame of frames) {
      const name = await frame.getAttribute('data-skarmdump');
      await frame.screenshot({ path: join(out, `${name}_${suffix}.png`), animations: 'disabled' });
    }
    console.log(`${frames.length} skärmdumpar (${suffix}).`);
    await page.close();
  }
} finally {
  await browser.close();
}
