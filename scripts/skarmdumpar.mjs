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
// Galleriet, och sidhuvudet utan kh.js på en egen sida (galleriet laddar kh.js för alla element).
const pages = ['index.html', 'utan-kh-js.html'].map((file) => pathToFileURL(join(root, 'gallery', file)).href);

const browser = await chromium.launch();
try {
  for (const [tema, suffix] of [['ljust', 'light'], ['mork', 'dark']]) for (const url of pages) {
    const page = await browser.newPage({ viewport: { width: 440, height: 900 }, deviceScaleFactor: 2.925 });
    await page.goto(`${url}?tema=${tema}`);
    await page.evaluate(() => document.fonts.ready);
    const frames = await page.locator('[data-skarmdump]').all();
    for (const frame of frames) {
      const name = await frame.getAttribute('data-skarmdump');
      await frame.scrollIntoViewIfNeeded();
      // Helskärmsbilder: ramen överst i fönstret, så att dess innehåll ligger bakom slöjan.
      if ((await frame.getAttribute('data-helskarm')) !== null) await frame.evaluate((element) => element.scrollIntoView({ block: 'start' }));
      // data-klick: öppna (t.ex. huvudknappens meny) före bilden.
      const click = await frame.getAttribute('data-klick');
      if (click) {
        await frame.locator(click).click();
        await page.mouse.move(0, 0);
      }
      // Två bildrutor, så att kh-header hunnit rätta sig efter rullningen.
      await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
      // data-tid: prickar som hoppar står still så många ms in i perioden (som Roborazzi-provets klocka).
      const time = await frame.getAttribute('data-tid');
      if (time) {
        await frame.evaluate((element, ms) => {
          for (const animation of element.getAnimations({ subtree: true })) {
            // Rullningsdrivna animeringar (oskärpan under toppraden) följer rullningen, inte klockan.
            if (!(animation.timeline instanceof DocumentTimeline)) continue;
            if (animation instanceof CSSAnimation) {
              animation.pause();
              animation.currentTime = ms;
            } else {
              animation.finish();
            }
          }
        }, Number(time));
      }
      // data-animera: rullningsdrivna animeringar (tidsväljarens tal) visar sitt läge; 'disabled' skulle spola dem till slutet.
      const animate = time || (await frame.getAttribute('data-animera')) !== null;
      // data-helskarm: en modal dialog eller ett ark ritas över hela fönstret, så bilden tas av fönstret.
      const shot = (await frame.getAttribute('data-helskarm')) !== null ? page : frame;
      await shot.screenshot({ path: join(out, `${name}_${suffix}.png`), animations: animate ? 'allow' : 'disabled' });
      await page.evaluate(() => document.querySelectorAll(':popover-open').forEach((p) => p.hidePopover()));
      await page.evaluate(() => document.querySelectorAll('dialog:modal').forEach((d) => d.close()));
    }
    console.log(`${frames.length} skärmdumpar (${suffix}).`);
    await page.close();
  }
} finally {
  await browser.close();
}
