#!/usr/bin/env node
// Lägger varje skärmdump i screenshots/ bredvid Roborazzi-bilden med samma namn, för ögat.
// Pixeljämförelse mellan Compose och en webbläsare går inte att lita på.
//   npm run jamfor -- <android-ui>/ui-components/src/test/screenshots [utkatalog]
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [reference, target = join(root, 'jamforelse')] = process.argv.slice(2);
if (!reference || !existsSync(reference)) {
  console.error('Ange katalogen med Roborazzi-bilderna: npm run jamfor -- <android-ui>/ui-components/src/test/screenshots');
  process.exit(1);
}
mkdirSync(target, { recursive: true });
const dataUrl = (path) => `data:image/png;base64,${readFileSync(path).toString('base64')}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 860, height: 600 } });
let count = 0;
for (const file of readdirSync(join(root, 'screenshots')).filter((f) => f.endsWith('.png'))) {
  const android = join(resolve(reference), file);
  if (!existsSync(android)) {
    console.warn(`Ingen Roborazzi-bild för ${file}`);
    continue;
  }
  const dark = file.endsWith('_dark.png');
  // Roborazzi-bilden är en hel skärm; webbens ram är bara delen. Båda i samma skala, Android till vänster.
  await page.setContent(`<body style="margin:0;background:${dark ? '#000' : '#888'};font:600 13px system-ui;color:#fff">
    <div style="display:flex;gap:20px;padding:10px;align-items:flex-start">
      <figure style="margin:0;width:400px"><figcaption>android-ui (Roborazzi)</figcaption><img src="${dataUrl(android)}" style="width:400px;display:block"></figure>
      <figure style="margin:0;width:400px"><figcaption>web-ui (Playwright)</figcaption><img src="${dataUrl(join(root, 'screenshots', file))}" style="width:400px;display:block"></figure>
    </div></body>`);
  await page.evaluate(async () => {
    await Promise.all([...document.images].map((i) => i.decode()));
    // Roborazzi-bilden är en hel skärm: klipp den där innehållets bakgrund tar slut (kanten längst till vänster byter färg).
    const img = document.images[0];
    const canvas = Object.assign(document.createElement('canvas'), { width: img.naturalWidth, height: img.naturalHeight });
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const column = ctx.getImageData(1, 0, 1, img.naturalHeight).data;
    const same = (y) => [0, 1, 2].every((c) => Math.abs(column[y * 4 + c] - column[4 + c]) < 3);
    let end = img.naturalHeight;
    for (let y = 1; y < img.naturalHeight; y++) if (!same(y)) { end = y; break; }
    // Aldrig kortare än webbens bild: ett sidhuvud slutar i en annan färg än innehållet under.
    const web = document.images[1];
    const height = Math.max(end / img.naturalWidth, web.naturalHeight / web.naturalWidth) * 400;
    if (height < (img.naturalHeight / img.naturalWidth) * 400) {
      img.parentElement.style.height = `${height + 20}px`;
      img.parentElement.style.overflow = 'hidden';
    }
  });
  await page.screenshot({ path: join(target, file), fullPage: true });
  count++;
}
await browser.close();
console.log(`${count} jämförelser i ${target}.`);
