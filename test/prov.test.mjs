// D-3: assertSinglePrimaryAction i src/prov.js räknar fyllda knappar och FAB:en per fönster.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';
import { assertSinglePrimaryAction } from '../src/prov.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const gallery = pathToFileURL(join(root, 'gallery', 'index.html')).href;

let browser;
let page;

before(async () => {
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 440, height: 900 } });
  await page.goto(`${gallery}?tema=ljust`);
});

after(async () => {
  await browser?.close();
});

/** Byter galleriets innehåll (med dess tema och stilar) mot [html] och kör [script]. */
async function show(html, script = '') {
  await page.evaluate(({ html, script }) => {
    document.body.innerHTML = html;
    if (script) new Function(script)();
  }, { html, script });
}

const fails = (pattern) => assert.rejects(() => assertSinglePrimaryAction(page), pattern);

test('en fylld knapp bland tonade godkänns', async () => {
  await show('<button class="kh-btn kh-btn--primary">Spara</button><button class="kh-btn">Lägg till</button><button class="kh-btn kh-btn--text">Avbryt</button>');
  await assertSinglePrimaryAction(page);
});

test('standardknappen är tonad som --secondary, --primary är fylld, och tonade räknas inte', async () => {
  await show('<button class="kh-btn" id="a">Ett</button><button class="kh-btn kh-btn--secondary" id="b">Två</button><button class="kh-btn kh-btn--primary" id="c">Tre</button>');
  await assertSinglePrimaryAction(page);
  const bg = (id) => page.evaluate((id) => getComputedStyle(document.getElementById(id)).backgroundColor, id);
  assert.equal(await bg('a'), await bg('b'));
  assert.notEqual(await bg('a'), await bg('c'));
});

test('två fyllda knappar fäller provet med båda texterna', async () => {
  await show('<button class="kh-btn kh-btn--primary">Spara</button><button class="kh-btn kh-btn--primary">Importera</button>');
  await fails(/Spara, Importera/);
});

test('en destruktiv fylld knapp räknas som primär', async () => {
  await show('<button class="kh-btn kh-btn--primary">Spara</button><button class="kh-btn kh-btn--destructive">Radera</button>');
  await fails(/D-3/);
});

test('FAB:en och en fylld knapp fäller provet', async () => {
  await show('<button class="kh-btn kh-btn--primary">Spara</button><nav class="kh-toolbar"><button class="kh-toolbar__action" aria-label="Lägg till"></button></nav>');
  await fails(/Lägg till/);
});

test('en öppen dialog räknas för sig, inte ihop med sidan bakom', async () => {
  await show(
    '<button class="kh-btn kh-btn--primary">Spara</button><dialog class="kh-dialog" id="d"><button class="kh-btn kh-btn--text">Avbryt</button><button class="kh-btn kh-btn--destructive">Radera</button></dialog>',
    "document.getElementById('d').showModal()",
  );
  await assertSinglePrimaryAction(page);
});

test('en stängd dialog och en dold knapp räknas inte', async () => {
  await show('<button class="kh-btn kh-btn--primary">Spara</button><dialog><button class="kh-btn kh-btn--primary">Ok</button></dialog><div hidden><button class="kh-btn kh-btn--primary">Dold</button></div>');
  await assertSinglePrimaryAction(page);
});
