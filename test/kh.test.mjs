// Beteendeprov per del: geometri ur tokens.json, färger ur temat, lägen och djup.
// Körs i Chromium mot galleriet med testtemat (android-ui:s testpalett).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tokens = JSON.parse(readFileSync(join(root, 'tokens.json'), 'utf8'));
const gallery = pathToFileURL(join(root, 'gallery', 'index.html')).href;

let browser;
let page;
// En egen sida utan kh.js: där förblir <kh-header> odefinierat (provet för sidhuvudet utan kh.js).
const bareGallery = pathToFileURL(join(root, 'gallery', 'utan-kh-js.html')).href;
const bare = {};

before(async () => {
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 440, height: 900 } });
  await page.goto(`${gallery}?tema=ljust`);
  bare.page = await browser.newPage({ viewport: { width: 440, height: 900 } });
  await bare.page.goto(`${bareGallery}?tema=ljust`);
});

after(async () => {
  await browser?.close();
});

/** Lägger [html] överst i sidan, utanför galleriets ramar, (med djup om [depth]) och returnerar ramens id. */
async function mount(html, { depth = false } = {}) {
  return page.evaluate(
    ({ html, depth }) => {
      document.getElementById('prov')?.remove();
      const frame = document.createElement('div');
      frame.id = 'prov';
      frame.className = depth ? 'kh-depth' : '';
      frame.style.padding = '16px';
      frame.innerHTML = html;
      document.body.prepend(frame);
      scrollTo(0, 0);
      return frame.id;
    },
    { html, depth }
  );
}

const style = (selector, prop, pseudo = null) =>
  page.evaluate(({ selector, prop, pseudo }) => getComputedStyle(document.querySelector(selector), pseudo).getPropertyValue(prop), { selector, prop, pseudo });
const themeColor = (name) =>
  page.evaluate((name) => {
    const probe = document.createElement('i');
    probe.style.color = `var(${name})`;
    document.body.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  }, name);
// Övergångarna (150 ms) får gå klart innan läget läses.
const settle = () => page.waitForTimeout(200);
const box = (selector) => page.evaluate((selector) => document.querySelector(selector).getBoundingClientRect().toJSON(), selector);
/** Var segmentvalets pill (spårets ::before) ritas just nu: spårets ruta plus pillens läge, bredd och förskjutning. */
const pillBox = (selector) =>
  page.evaluate((selector) => {
    const track = document.querySelector(selector);
    const rect = track.getBoundingClientRect();
    const pill = getComputedStyle(track, '::before');
    const width = parseFloat(pill.width);
    const { m41 } = new DOMMatrixReadOnly(pill.transform);
    const start = pill.direction === 'rtl' ? rect.right - parseFloat(pill.right) - width : rect.left + parseFloat(pill.left);
    return { left: start + m41, width };
  }, selector);

test('tokens.css har talen ur tokens.json', async () => {
  for (const [name, value] of Object.entries(tokens.spacing)) {
    assert.equal((await page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(`--kh-space-${n}`), name)).trim(), `${value}px`);
  }
  assert.equal((await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--kh-radius-card'))).trim(), `${tokens.radius.card}px`);
});

test('ingen färg står i biblioteket – bara temats variabler', () => {
  const css = readFileSync(join(root, 'src', 'kh.css'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/url\("data:[^"]*"\)/g, '');
  const named = /(?<![-\w])(white|black|red|green|blue|gray|grey|orange|yellow|purple|pink|brown|silver)(?![-\w])/;
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/, 'hexfärg i kh.css');
  assert.doesNotMatch(css, /\b(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\(/, 'färgfunktion i kh.css');
  assert.doesNotMatch(css, named, 'namngiven färg i kh.css');
});

test('kort: hörn och kortfärg; tonat kort i tonens färg; klickbart kort krymper hälften så mycket med djup', async () => {
  await mount('<div class="kh-card" id="a">x</div><div class="kh-card kh-card--tone ton-gron" id="b">x</div><button class="kh-card" id="c">x</button>', { depth: true });
  assert.equal(await style('#a', 'border-radius'), `${tokens.radius.card}px`);
  assert.equal(await style('#a', 'background-color'), await themeColor('--kh-card'));
  assert.equal(await style('#b', 'background-color'), await themeColor('--ton-gron-container'));
  assert.notEqual(await style('#a', 'box-shadow'), 'none');
  assert.equal(await style('#b', 'box-shadow'), 'none', 'ett tonat kort har ingen skugga');
  const c = await box('#c');
  await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2);
  await page.mouse.down();
  const scale = await style('#c', 'transform');
  await page.mouse.up();
  assert.match(scale, /^matrix\(0\.985,/);
});

test('listrad: minsta höjd, radhörn, klar-läget stryker över, tonad bakgrund och färgad kant', async () => {
  await mount(`
    <div class="kh-row" id="a"><div class="kh-row__text"><span class="kh-row__title">Titel</span></div></div>
    <div class="kh-row kh-row--done kh-row--tinted" id="b"><div class="kh-row__text"><span class="kh-row__title">Klar</span></div></div>
    <div class="kh-row kh-row--accent" id="c" style="--kh-accent: var(--accent-bla)"><div class="kh-row__text"><span class="kh-row__title">Lisa</span></div></div>`);
  assert.equal((await box('#a')).height, 56);
  assert.equal(await style('#a', 'border-radius'), `${tokens.radius.row}px`);
  assert.match(await style('#b .kh-row__title', 'text-decoration-line'), /line-through/);
  assert.equal(await style('#b', 'background-color'), await themeColor('--kh-row-tint'));
  assert.equal(await style('#c', 'width', '::before'), '4px');
});

test('avdelare: en linje i temats linjefärg, indragen som raderna', async () => {
  await mount('<div class="kh-card"><hr class="kh-divider" id="a"></div>');
  assert.equal((await box('#a')).height, 1);
  assert.equal(await style('#a', 'margin-left'), `${tokens.spacing.m}px`);
  assert.equal(await style('#a', 'background-color'), await themeColor('--kh-outline-variant'));
});

test('knapp: höjd, pillform, varianter, inaktiv, arbetar och nedtryckt med djup', async () => {
  await mount(`
    <button class="kh-btn kh-btn--primary" id="a">Spara</button>
    <button class="kh-btn kh-btn--primary kh-btn--compact" id="b">Spara</button>
    <button class="kh-btn kh-btn--primary" id="c" disabled>Spara</button>
    <button class="kh-btn kh-btn--primary" id="d" aria-busy="true">Sparar …</button>
    <button class="kh-btn kh-btn--destructive" id="e">Radera</button>
    <button class="kh-btn kh-btn--secondary" id="f">Lägg till</button>`, { depth: true });
  assert.equal((await box('#a')).height, 56);
  assert.equal((await box('#b')).height, 40);
  assert.equal(await style('#a', 'border-radius'), '9999px');
  assert.equal(await style('#a', 'background-color'), await themeColor('--kh-primary'));
  assert.notEqual(await style('#c', 'background-color'), await themeColor('--kh-primary'), 'inaktiv knapp är grå');
  assert.equal(await style('#d', 'background-color'), await themeColor('--kh-primary'), 'en knapp som arbetar behåller färgen');
  assert.equal(await style('#e', 'background-color'), await themeColor('--kh-error'));
  assert.equal(await style('#f', 'background-color'), await themeColor('--kh-secondary-container'));
  assert.match(await style('#a', 'box-shadow'), /inset/, 'ljuskanten');
  assert.equal(await style('#c', 'box-shadow'), 'none', 'en inaktiv knapp lyfts inte');
  const a = await box('#a');
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await settle();
  const pressed = { transform: await style('#a', 'transform'), shadow: await style('#a', 'box-shadow') };
  await page.mouse.up();
  assert.match(pressed.transform, new RegExp(`^matrix\\(${tokens.depth.pressedScale},`));
  assert.equal(pressed.shadow, 'none', 'skuggan sjunker bort nedtryckt');
});

test('ikonknapp: 48 i tryckyta och form, ikon 24; tonad i secondary-container eller tonens färg; inaktiv grå; krymper till 0,92 med djup', async () => {
  await mount(`<style>.ton-prov { --kh-tone-container: var(--kh-tertiary); --kh-tone-content: var(--kh-on-tertiary); }</style>
    <div style="color: var(--kh-on-surface)">
      <button class="kh-icon-btn kh-icon-btn--tonal" id="a" aria-label="Tillbaka"><svg><use href="#i-arrow-back"/></svg></button>
      <button class="kh-icon-btn" id="b" aria-label="Arkivera"><svg><use href="#i-archive"/></svg></button>
      <button class="kh-icon-btn kh-icon-btn--tonal" id="c" aria-label="Lägg till" disabled><svg><use href="#i-add"/></svg></button>
      <button class="kh-icon-btn kh-icon-btn--tonal ton-prov" id="d" aria-label="Tonad"><svg><use href="#i-add"/></svg></button>
      <button class="kh-icon-btn ton-prov" id="e" aria-label="Tonad ikon"><svg><use href="#i-add"/></svg></button>
    </div>`, { depth: true });
  const a = await box('#a');
  assert.deepEqual([a.width, a.height], [48, 48]);
  assert.equal((await box('#a svg')).width, tokens.iconSize.standard);
  assert.equal(await style('#a', 'border-radius'), '9999px');
  assert.equal(await style('#a', 'background-color'), await themeColor('--kh-secondary-container'));
  assert.equal(await style('#a', 'color'), await themeColor('--kh-on-secondary-container'));
  assert.equal(await style('#b', 'background-color'), 'rgba(0, 0, 0, 0)', 'den vanliga har ingen platta');
  assert.equal(await style('#b', 'color'), await themeColor('--kh-on-surface'), 'och ikonen i omgivande färg');
  assert.notEqual(await style('#c', 'background-color'), await themeColor('--kh-secondary-container'), 'inaktiv är grå');
  assert.equal(await style('#c', 'box-shadow'), 'none', 'en inaktiv lyfts inte');
  assert.equal(await style('#d', 'background-color'), await themeColor('--kh-tertiary'));
  assert.equal(await style('#d', 'color'), await themeColor('--kh-on-tertiary'));
  assert.equal(await style('#e', 'background-color'), 'rgba(0, 0, 0, 0)');
  assert.equal(await style('#e', 'color'), await themeColor('--kh-on-tertiary'), 'tonen färgar bara ikonen på den vanliga');
  assert.match(await style('#a', 'box-shadow'), /inset/, 'den tonade lyfts med ljuskant');
  assert.equal(await style('#b', 'box-shadow'), 'none', 'den vanliga lyfts inte');
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await settle();
  const pressed = await style('#a', 'transform');
  await page.mouse.up();
  const scale = Number(pressed.match(/^matrix\(([^,]+),/)[1]);
  assert.ok(Math.abs(scale - (1 - (1 - tokens.depth.pressedScale) * 8 / 3)) < 1e-6, `nedtryckt ${pressed}`);
});

test('utan kh-depth är knappar och kort platta', async () => {
  await mount('<button class="kh-btn kh-btn--primary" id="a">Spara</button><div class="kh-card" id="b">x</div>');
  assert.equal(await style('#a', 'box-shadow'), 'none');
  assert.equal(await style('#b', 'box-shadow'), 'none');
});

test('valchip: höjd, valt med bock och primärbehållaren, betonat, inaktivt och väntande', async () => {
  await mount(`
    <button class="kh-chip" id="a" aria-pressed="false">Kapsel</button>
    <button class="kh-chip" id="b" aria-pressed="true">Tablett</button>
    <button class="kh-chip kh-chip--emphasized" id="c" aria-pressed="true">Huvudvärk</button>
    <button class="kh-chip" id="d" disabled>Kräm</button>
    <button class="kh-chip kh-chip--pending" id="e">Ipren</button>`);
  assert.equal((await box('#a')).height, 36);
  assert.equal(await style('#a', 'content', '::before'), 'none', 'ovalt chip har ingen bock');
  assert.equal(await style('#b', 'content', '::before'), '""');
  assert.equal(await style('#b', 'background-color'), await themeColor('--kh-primary-container'));
  assert.equal(await style('#c', 'background-color'), await themeColor('--kh-primary'));
  assert.notEqual(await style('#d', 'color'), await themeColor('--kh-on-surface'));
  assert.equal(await style('#e', 'outline-style'), 'dashed');
});

test('segmentval: ytterkanterna rundade, det valda i primärbehållaren med bock', async () => {
  await mount(`<div class="kh-segmented"><button id="a" role="radio" aria-checked="false">Ljust</button><button id="b" role="radio" aria-checked="true">Mörkt</button><button id="c" role="radio" aria-checked="false">Auto</button></div>`);
  assert.equal(await style('#a', 'border-top-left-radius'), '9999px');
  assert.equal(await style('#a', 'border-top-right-radius'), '0px');
  assert.equal(await style('#c', 'border-top-right-radius'), '9999px');
  assert.equal(await style('#b', 'background-color'), await themeColor('--kh-primary-container'));
  assert.equal(await style('#b', 'content', '::before'), '""');
  assert.equal((await box('#b')).height, 40);
});

test('segmentval med djup: sänkt spår, det valda en upphöjd pill med skugga', async () => {
  await mount(`<div class="kh-segmented" id="s"><button id="a" role="radio" aria-checked="false">Ljust</button><button id="b" role="radio" aria-checked="true">Mörkt</button></div>`, { depth: true });
  assert.equal(await style('#s', 'background-color'), await themeColor('--kh-row-tint'));
  assert.match(await style('#s', 'box-shadow'), /inset/);
  assert.equal(await style('#a', 'border-top-left-radius'), '9999px');
  assert.equal(await style('#a', 'border-top-right-radius'), '9999px', 'varje segment är en egen pill');
  assert.equal(await style('#a', 'border-top-width'), '0px');
  // Pillen är spårets ::before och ligger under det valda segmentet.
  assert.equal(await style('#s', 'background-color', '::before'), await themeColor('--kh-primary-container'));
  assert.match(await style('#s', 'box-shadow', '::before'), /px.*px.*px/);
  assert.equal(await style('#b', 'color'), await themeColor('--kh-on-primary-container'));
  assert.equal(await style('#a', 'box-shadow'), 'none');
  assert.equal((await box('#s')).height, 40);
  await settle();
  const pill = await pillBox('#s');
  const chosen = await box('#b');
  assert.ok(Math.abs(pill.left - chosen.left) <= 1 && Math.abs(pill.width - chosen.width) <= 1, `pillen ${JSON.stringify(pill)} under ${JSON.stringify(chosen)}`);
});

test('segmentval med djup: pillen glider till nytt val, också när appen sätter valet själv', async () => {
  await mount(`<div class="kh-segmented" id="s"><button id="a" aria-pressed="true">Dag</button><button id="b" aria-pressed="false">Vecka</button><button id="c" aria-pressed="false">Månad</button><button id="d" aria-pressed="false">År</button></div>`, { depth: true });
  await settle();
  const start = (await pillBox('#s')).left;
  await page.evaluate(() => {
    document.getElementById('a').setAttribute('aria-pressed', 'false');
    document.getElementById('c').setAttribute('aria-pressed', 'true');
  });
  // Glidet stoppas en fast tid in, så att provet inte beror på hur snabb maskinen är.
  const seek = (time) =>
    page.evaluate((time) => {
      const glide = document.getAnimations().find((a) => a.transitionProperty === 'transform' && a.effect.pseudoElement === '::before');
      glide.pause();
      glide.currentTime = time;
    }, time);
  await seek(120);
  const target = (await box('#c')).left;
  const midway = (await pillBox('#s')).left;
  assert.ok(midway > start && midway < target, `på väg: ${start} < ${midway} < ${target}`);
  await seek(500);
  assert.ok(Math.abs((await pillBox('#s')).left - target) <= 1, 'framme på Månad');
});

test('segmentval med djup: höger till vänster glider pillen åt vänster', async () => {
  await mount(`<div class="kh-segmented" id="s" dir="rtl"><button id="a" aria-pressed="false">Ljust</button><button id="b" aria-pressed="false">Mörkt</button><button id="c" aria-pressed="true">Auto</button></div>`, { depth: true });
  await settle();
  const pill = await pillBox('#s');
  assert.ok(Math.abs(pill.left - (await box('#c')).left) <= 1);
});

test('periodväljare: pilarna och etiketten 48 höga i radtonens spår; etiketten i kortfärg, avkortas på en rad; med djup sänkt spår och lyft etikett', async () => {
  const picker = (id, label, width = '') => `<div class="kh-period" id="${id}"${width}>
      <button class="kh-icon-btn kh-period__prev" aria-label="Föregående"><svg><use href="#i-chevron-left"/></svg></button>
      <button class="kh-period__label"><svg aria-hidden="true"><use href="#i-calendar"/></svg><span>${label}</span></button>
      <button class="kh-icon-btn kh-period__next" aria-label="Nästa"><svg><use href="#i-chevron-right"/></svg></button>
    </div>`;
  await mount(picker('a', 'Tisdag 24 november') + picker('b', 'Vecka 47 · måndag 16 – söndag 22 november i ett långt namn', ' style="inline-size: 240px"'));
  const track = await box('#a');
  const prev = await box('#a .kh-period__prev');
  const label = await box('#a .kh-period__label');
  const next = await box('#a .kh-period__next');
  assert.deepEqual([prev.width, prev.height, next.width, next.height], [48, 48, 48, 48]);
  assert.equal(label.height, 48);
  assert.equal(track.height, 48 + 2 * tokens.spacing.xs);
  assert.equal(prev.left - track.left, tokens.spacing.xs, 'pilen vid spårets kant');
  assert.equal(track.right - next.right, tokens.spacing.xs);
  assert.ok(Math.abs((label.left + label.right) / 2 - (track.left + track.right) / 2) < 1, 'etiketten i mitten');
  assert.equal(await style('#a', 'background-color'), await themeColor('--kh-row-tint'));
  assert.equal(await style('#a', 'border-radius'), '9999px');
  assert.equal(await style('#a .kh-period__label', 'background-color'), await themeColor('--kh-card'));
  assert.equal(await style('#a .kh-period__label', 'color'), await themeColor('--kh-on-surface'));
  assert.equal((await box('#a .kh-period__label svg')).width, tokens.iconSize.small);
  assert.equal(await style('#a', 'box-shadow'), 'none', 'platt utan djup');

  const narrow = await box('#b');
  const narrowLabel = await box('#b .kh-period__label');
  const text = await box('#b .kh-period__label span');
  assert.equal(narrow.width, 240);
  assert.equal(narrowLabel.height, 48, 'på en rad');
  assert.ok(narrowLabel.right <= (await box('#b .kh-period__next')).left, 'etiketten trycker inte undan pilen');
  assert.ok(text.right <= narrowLabel.right, 'texten inom etiketten');
  assert.equal(await style('#b .kh-period__label span', 'text-overflow'), 'ellipsis');
  assert.equal((await box('#b .kh-period__next')).width, 48, 'pilen krymper inte');

  await mount(picker('c', 'Vecka 47 · 16–22 nov'), { depth: true });
  assert.match(await style('#c', 'box-shadow'), /inset/, 'sänkt spår med djup');
  assert.match(await style('#c .kh-period__label', 'box-shadow'), /inset/, 'lyft etikett med ljuskant');
});

test('dra för att ändra ordning: handtaget 48 sist i raden; raden som dras lämnar en streckad plats; linjen där den hamnar; den lyfta raden i kortfärg med skugga', async () => {
  const row = (id, extra = '') => `<li class="kh-row" id="${id}"${extra}><span class="kh-row__text"><span class="kh-row__title">${id}</span></span><span class="kh-row__trailing"><button class="kh-icon-btn kh-reorder__handle" aria-label="Flytta"><svg><use href="#i-drag"/></svg></button></span></li>`;
  await mount(`<ul class="kh-card kh-reorder" id="lista">${row('a')}${row('b', ' data-dragging')}<li class="kh-reorder__indicator" id="tom"></li><li class="kh-reorder__indicator" id="mal" data-drop-target></li>${row('c')}</ul>
    <div class="kh-row kh-reorder__preview" id="lyft"><span class="kh-row__text">b</span></div>`);
  const handle = await box('#a .kh-reorder__handle');
  assert.deepEqual([handle.width, handle.height], [48, 48]);
  assert.ok((await box('#a')).right - handle.right <= tokens.spacing.m + 0.5, 'handtaget sist i raden');
  assert.equal(await style('#a .kh-reorder__handle', 'color'), await themeColor('--kh-on-surface-variant'));
  assert.equal(await style('#a .kh-reorder__handle', 'cursor'), 'grab');
  assert.equal(await style('#a', 'outline-style'), 'none');
  assert.equal(await style('#b', 'outline-style'), 'dashed');
  assert.equal(await style('#b', 'outline-color'), await themeColor('--kh-outline-variant'));
  assert.equal(await style('#b .kh-row__text', 'visibility'), 'hidden', 'platsen visar inget innehåll');
  assert.equal((await box('#b')).height, (await box('#a')).height, 'platsen behåller radens höjd');
  assert.equal((await box('#tom')).height, 0, 'utan mål syns ingen linje');
  assert.equal((await box('#mal')).height, 2);
  assert.equal(await style('#mal', 'background-color'), await themeColor('--kh-primary'));
  assert.equal(await style('#lyft', 'background-color'), await themeColor('--kh-card'));
  assert.notEqual(await style('#lyft', 'box-shadow'), 'none');
  await mount('<div class="kh-row kh-reorder__preview" id="lyft"><span class="kh-row__text">b</span></div>', { depth: true });
  assert.match(await style('#lyft', 'box-shadow'), /inset/, 'med djup ljuskant och djupets skugga');
});

test('pill: primärtonad som standard; en ton gäller bara elementet som har den', async () => {
  await mount(`<span class="kh-pill" id="a">3 kvar</span><span class="kh-pill ton-gron" id="b">Packad</span>
    <div class="kh-card kh-card--tone ton-gron"><span class="kh-pill" id="c">I kortet</span></div>`);
  assert.equal(await style('#a', 'background-color'), await themeColor('--kh-primary-container'));
  assert.equal(await style('#b', 'background-color'), await themeColor('--ton-gron-container'));
  assert.equal(await style('#c', 'background-color'), await themeColor('--kh-primary-container'), 'tonen läcker inte in');
});

test('meddelanderad: kortets hörn i tonens färg', async () => {
  await mount('<div class="kh-notice ton-bla" id="a"><span class="kh-notice__text"><span class="kh-notice__title">Text</span></span></div>');
  assert.equal(await style('#a', 'border-radius'), `${tokens.radius.card}px`);
  assert.equal(await style('#a', 'background-color'), await themeColor('--ton-bla-container'));
  assert.equal(await style('#a', 'color'), await themeColor('--ton-bla-content'));
});

test('textfält: fältets hörn, etiketten flyttar upp till kanten, fel i felfärg, fokusring med djup', async () => {
  await mount(`
    <label class="kh-field" id="a"><input class="kh-field__input" placeholder=" "><span class="kh-field__label">Namn</span></label>
    <label class="kh-field" id="b"><input class="kh-field__input" placeholder=" " aria-invalid="true"><span class="kh-field__label">Styrka</span></label>`, { depth: true });
  assert.equal(await style('#a', 'border-radius'), `${tokens.radius.field}px`);
  assert.equal((await box('#a')).height, 56);
  const before = await box('#a .kh-field__label');
  await page.fill('#a input', 'Solkräm');
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await settle();
  const after = await box('#a .kh-field__label');
  assert.ok(after.y < before.y - 10, 'etiketten står på kanten när fältet har text');
  const falt = await box('#a');
  assert.equal(after.y + after.height / 2, falt.y, 'etiketten mitt på kantlinjen');
  // En app med högre radhöjd för etiketten (Husjakt: 16px/22px): fortfarande mitt på kanten.
  await page.evaluate(() => document.querySelector('#a').style.setProperty('--kh-type-item-subtitle', '400 16px/22px sans-serif'));
  await settle();
  const hog = await box('#a .kh-field__label');
  assert.equal(hog.height, 22);
  assert.equal(hog.y + hog.height / 2, falt.y, 'mitt på kanten också med högre rad');
  assert.equal(await style('#b .kh-field__label', 'color'), await themeColor('--kh-error'));
  await page.focus('#a input');
  await settle();
  assert.match(await style('#a', 'box-shadow'), /0px 0px 0px 4px/, 'fokusringen utanför kanten');
  await page.focus('#b input');
  await settle();
  assert.doesNotMatch(await style('#b', 'box-shadow'), /4px/, 'ingen fokusring i felläget');
});

test('dialog: öppnas modalt med nedtonad bakgrund, kortets hörn och kortfärg', async () => {
  await mount('<dialog class="kh-dialog" id="a"><h2 class="kh-dialog__title">Räkna om?</h2><div class="kh-dialog__actions"><button class="kh-btn kh-btn--primary">Ok</button></div></dialog>');
  await page.evaluate(() => document.getElementById('a').showModal());
  assert.equal(await style('#a', 'display'), 'flex');
  assert.equal(await style('#a', 'border-radius'), `${tokens.radius.card}px`);
  assert.equal(await style('#a', 'background-color'), await themeColor('--kh-card'));
  assert.notEqual(await style('#a', 'background-color', '::backdrop'), 'rgba(0, 0, 0, 0)');
  await page.evaluate(() => document.getElementById('a').close());
  assert.equal(await style('#a', 'display'), 'none');
});

test('oskärpa bakom dialog och ark: suddat och svagare slöja; --kh-blur: 0 ger slöjan utan sudd', async () => {
  for (const cls of ['kh-dialog', 'kh-sheet']) {
    await mount(`<dialog class="${cls}" id="a"><p>x</p></dialog>`);
    await page.evaluate(() => document.getElementById('a').showModal());
    // AppBlur: radien 12 och slöjan 0,2; standardavvikelsen är radien × 0,577 + 0,5 (Skia).
    assert.equal(await style('#a', 'backdrop-filter', '::backdrop'), 'blur(7.424px)', cls);
    assert.match(await style('#a', 'background-color', '::backdrop'), / \/ 0\.2\)$/, cls);
    await page.evaluate(() => document.getElementById('a').close());
    await page.evaluate(() => document.documentElement.style.setProperty('--kh-blur', '0'));
    await page.evaluate(() => document.getElementById('a').showModal());
    assert.equal(await style('#a', 'backdrop-filter', '::backdrop'), 'blur(0px)', cls);
    assert.match(await style('#a', 'background-color', '::backdrop'), / \/ 0\.32\)$/, cls);
    await page.evaluate(() => document.getElementById('a').close());
    await page.evaluate(() => document.documentElement.style.removeProperty('--kh-blur'));
  }
});

test('ark: rundat upptill, i botten, med grepp', async () => {
  await mount('<dialog class="kh-sheet" id="a"><h2 class="kh-sheet__title">Ändra mängd</h2></dialog>');
  await page.evaluate(() => document.getElementById('a').showModal());
  const [tl, tr, br, bl] = tokens.radius.sheet.map((r) => `${r}px`);
  assert.equal(await style('#a', 'border-top-left-radius'), tl);
  assert.equal(await style('#a', 'border-top-right-radius'), tr);
  assert.equal(await style('#a', 'border-bottom-right-radius'), br);
  assert.equal(await style('#a', 'border-bottom-left-radius'), bl);
  const sheet = await box('#a');
  assert.equal(Math.round(sheet.y + sheet.height), 900, 'arket står mot skärmens botten');
  assert.equal(await style('#a', 'width', '::before'), '32px');
  await page.evaluate(() => document.getElementById('a').close());
});

test('meddelande: omvänd yta, radens hörn, åtgärden i omvänd primärfärg, flyter med djup', async () => {
  await mount('<div class="kh-snackbar" id="a"><span class="kh-snackbar__text">Arkiverad</span><button class="kh-snackbar__action" id="b">Ångra</button></div>', { depth: true });
  assert.equal(await style('#a', 'background-color'), await themeColor('--kh-inverse-surface'));
  assert.equal(await style('#a', 'border-radius'), `${tokens.radius.row}px`);
  assert.equal(await style('#b', 'color'), await themeColor('--kh-inverse-primary'));
  assert.notEqual(await style('#a', 'box-shadow'), 'none');
});

test('meddelande: står ovanför en fast flikrad, annars nere vid kanten', async () => {
  await mount('<div class="kh-snackbar-host" id="h"><div class="kh-snackbar"><span class="kh-snackbar__text">Sparat</span></div></div>');
  const bottom = async () => page.evaluate(() => innerHeight - document.querySelector('#h .kh-snackbar').getBoundingClientRect().bottom);
  assert.equal(await bottom(), 16);
  await page.evaluate(() => {
    const bar = document.createElement('kh-toolbar');
    bar.className = 'kh-toolbar--fixed';
    bar.id = 'fast-rad';
    document.body.append(bar);
  });
  try {
    assert.equal(await bottom(), 16 + 96, 'flikradens frigång under meddelandet');
  } finally {
    await page.evaluate(() => document.getElementById('fast-rad').remove());
  }
});

test('tomt läge: ikonrutan 120 med ikonrutans hörn; fel och kompakt', async () => {
  await mount(`
    <div class="kh-empty" id="a"><div class="kh-empty__message"><div class="kh-empty__tile"></div><h3 class="kh-empty__title">Tomt</h3></div></div>
    <div class="kh-empty kh-empty--error" id="b"><div class="kh-empty__message"><div class="kh-empty__tile"></div></div></div>
    <div class="kh-empty kh-empty--compact" id="c"><div class="kh-empty__message"><div class="kh-empty__tile"></div></div></div>`);
  assert.equal((await box('#a .kh-empty__tile')).width, 120);
  assert.equal(await style('#a .kh-empty__tile', 'border-radius'), `${tokens.radius.iconTile}px`);
  assert.equal(await style('#b .kh-empty__tile', 'background-color'), await themeColor('--kh-error-container'));
  assert.equal((await box('#c .kh-empty__tile')).width, 48);
  assert.equal(await style('#c .kh-empty__tile', 'border-radius'), `${tokens.radius.smallTile}px`);
});

test('avatar: cirkel 36 i en tryckyta på 48, plupp när ansluten', async () => {
  await mount(`<button class="kh-avatar kh-avatar--online" id="a"><span class="kh-avatar__circle">AB</span></button>
    <button class="kh-avatar" id="b"><span class="kh-avatar__circle">AB</span></button>`);
  assert.equal((await box('#a')).width, 48);
  assert.equal((await box('#a .kh-avatar__circle')).width, 36);
  assert.equal(await style('#a .kh-avatar__circle', 'background-color'), await themeColor('--kh-primary-container'));
  assert.equal(await style('#a', 'width', '::before'), '12px');
  assert.equal(await style('#b', 'content', '::before'), 'none');
});

test('avatar: pluppen är samma gröna i alla appar, ljus eller mörk efter appens color-scheme', async () => {
  await mount('<button class="kh-avatar kh-avatar--online" id="a"><span class="kh-avatar__circle">AB</span></button>');
  const rgb = (hex) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;
  const dot = () => style('#a', 'background-color', '::before');
  assert.notEqual(await dot(), await themeColor('--kh-primary'), 'inte appens primary');
  await page.evaluate(() => { document.documentElement.style.colorScheme = 'light'; });
  assert.equal(await dot(), rgb(tokens.color.onlineLight));
  await page.evaluate(() => { document.documentElement.style.colorScheme = 'dark'; });
  assert.equal(await dot(), rgb(tokens.color.onlineDark));
  await page.evaluate(() => document.documentElement.style.removeProperty('color-scheme'));
});

test('avatar: utan anslutning en grå ihålig ring på pluppens plats', async () => {
  await mount('<button class="kh-avatar kh-avatar--offline" id="a"><span class="kh-avatar__circle">AB</span></button>');
  assert.equal(await style('#a', 'width', '::before'), '12px');
  assert.equal(await style('#a', 'background-color', '::before'), await themeColor('--kh-background'), 'hålet är ytan');
  assert.match(await style('#a', 'box-shadow', '::before'), /inset/);
  assert.ok((await style('#a', 'box-shadow', '::before')).includes(await themeColor('--kh-outline')), 'ringen i outline');
});

test('textstilarna kommer ur appens variabler', async () => {
  await mount('<p class="kh-text-headline" id="a">Rubrik</p><div class="kh-row"><div class="kh-row__text"><span class="kh-row__title" id="b">T</span></div></div>');
  assert.equal(await style('#a', 'font-size'), '22px');
  assert.equal(await style('#a', 'font-weight'), '800');
  assert.equal(await style('#b', 'font-size'), '16px');
  assert.match(await style('#b', 'font-family'), /Roboto Galleri/);
});

/* ---------- Beteendet (kh.js) ---------- */

/** En färg som [r, g, b] 0–255, oavsett om webbläsaren skriver rgb() eller color(srgb …) (color-mix). */
const rgb = (value) => {
  const srgb = value.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/);
  if (srgb) return srgb.slice(1, 4).map((v) => Math.round(Number(v) * 255));
  return value.match(/\d+(\.\d+)?/g).slice(0, 3).map((v) => Math.round(Number(v)));
};

// Två bildrutor: rullningshändelsen och kh-headers uppdatering har hunnit köras.
const frames = () => page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
const scrollTo = async (selector, top) => {
  await page.evaluate(({ selector, top }) => { document.querySelector(selector).scrollTop = top; }, { selector, top });
  await frames();
};
const HEADER = `
  <div id="r" style="block-size: 320px; overflow-y: auto">
    <kh-header id="h">
      <svg class="kh-header__icon" id="icon"></svg>
      <span class="kh-header__name" id="name">Husjakt</span>
      <div class="kh-header__trailing"><button class="kh-avatar" id="konto"><span class="kh-avatar__circle">MK</span></button></div>
      <h1 class="kh-header__title" id="title"><kh-dots></kh-dots><span>Objekt</span></h1>
      <p class="kh-header__subtitle" id="sub">12 hus</p>
    </kh-header>
    <div id="innehall" style="block-size: 900px"></div>
  </div>`;

test('prickar: två prickar; bouncing hoppar med 900 ms period och den andra 150 ms efter; stilla utan animeringar', async () => {
  await mount('<kh-dots id="a"></kh-dots><kh-dots bouncing id="b"></kh-dots>');
  assert.equal(await page.locator('#a > i').count(), 2);
  assert.equal(await style('#a', 'width'), '48px');
  const timing = () => page.evaluate(() => document.getElementById('b').getAnimations({ subtree: true }).map((a) => [a.effect.getTiming().duration, a.effect.getTiming().delay]));
  assert.deepEqual(await timing(), [[900, 0], [900, 150]]);
  assert.equal((await page.evaluate(() => document.getElementById('a').getAnimations({ subtree: true }).length)), 0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  try {
    assert.deepEqual(await timing(), []);
  } finally {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  }
});

test('sidhuvud: 144 i vila, krymper med fingret till 64 utan att innehållet hoppar, upphöjt först när innehåll ligger under', async () => {
  await mount(HEADER, { depth: true });
  await frames();
  assert.equal((await box('#h')).height, tokens.header.expanded);
  const contentAt = async () => (await box('#innehall')).top - (await box('#r')).top;
  assert.equal(await contentAt(), tokens.header.expanded);
  assert.deepEqual(rgb(await style('#h', 'background-color')), rgb(await themeColor('--kh-background')));

  await scrollTo('#r', 40);
  assert.equal((await box('#h')).height, tokens.header.expanded - 40);
  assert.equal(await contentAt(), tokens.header.expanded - 40, 'innehållet följer fingret');
  assert.equal(await page.evaluate(() => document.getElementById('h').collapsedFraction), 0.5);
  assert.equal(await style('#name', 'opacity'), '0', 'appnamnet har tonat bort på första 40 %');
  assert.equal(await page.evaluate(() => document.getElementById('h').hasAttribute('data-raised')), false);

  await scrollTo('#r', tokens.header.expanded - tokens.header.collapsed);
  assert.equal((await box('#h')).height, tokens.header.collapsed);
  assert.equal(await page.evaluate(() => document.getElementById('h').hasAttribute('data-raised')), false, 'ihopfällt men inget under än');
  assert.equal(await style('#title', 'font-size'), '18px', 'rubriken i section-title');
  assert.equal((await box('#icon')).width, tokens.header.collapsedAppIcon);
  // Rubriken bredvid ikonen, mitt i den smala raden.
  const title = await box('#title');
  const header = await box('#h');
  assert.equal(title.left - header.left, tokens.spacing.l + tokens.header.collapsedAppIcon + tokens.spacing.m);
  assert.ok(Math.abs(title.top + title.height / 2 - (header.top + tokens.header.collapsed / 2)) <= 1);

  await scrollTo('#r', 200);
  await page.waitForTimeout(250);
  assert.equal((await box('#h')).height, tokens.header.collapsed);
  assert.equal(await page.evaluate(() => document.getElementById('h').hasAttribute('data-raised')), true);
  assert.deepEqual(rgb(await style('#h', 'background-color')), rgb(await themeColor('--kh-card')));
  assert.match(await style('#h', 'box-shadow'), /15px/);

  await scrollTo('#r', 0);
  await page.waitForTimeout(250);
  assert.equal((await box('#h')).height, tokens.header.expanded, 'fälls ut högst upp');
  assert.deepEqual(rgb(await style('#h', 'background-color')), rgb(await themeColor('--kh-background')));
});

const VERSION_HEADER = HEADER.replace('<span class="kh-header__name" id="name">Husjakt</span>', '<span class="kh-header__name" id="name">Husjakt</span><span class="kh-header__version" id="version">0.2.0</span>');

test('sidhuvud med version: versionen står efter namnets text, på samma baslinje, litet och dämpat', async () => {
  await mount(VERSION_HEADER);
  await frames();
  const name = await box('#name');
  const version = await box('#version');
  assert.equal(await page.locator('#version[data-fits]').count(), 1);
  const textWidth = await page.evaluate(() => { const range = document.createRange(); range.selectNodeContents(document.querySelector('#name')); return range.getBoundingClientRect().width; });
  assert.ok(Math.abs(version.left - (name.left + textWidth + tokens.spacing.xs)) <= 1, 'efter namnets text, ett xs-avstånd bort');
  const baselines = await page.evaluate(() => ['#name', '#version'].map((id) => {
    const element = document.querySelector(id);
    const range = document.createRange();
    range.selectNodeContents(element);
    const probe = document.createElement('span');
    probe.style.cssText = 'display: inline-block; inline-size: 0; block-size: 0';
    range.collapse(false);
    range.insertNode(probe);
    const y = probe.getBoundingClientRect().bottom;
    probe.remove();
    return y;
  }));
  assert.ok(Math.abs(baselines[0] - baselines[1]) <= 1.5, `samma baslinje (${baselines})`);
  const small = await page.evaluate(() => [getComputedStyle(document.querySelector('#name')).fontSize, getComputedStyle(document.querySelector('#version')).fontSize].map(parseFloat));
  assert.ok(small[1] < small[0], 'mindre än namnet');
  assert.deepEqual(rgb(await style('#version', 'color')), rgb(await themeColor('--kh-on-surface-variant')));
});

test('sidhuvud med version: tonar bort med namnet och följer det när sidan rullar', async () => {
  await mount(VERSION_HEADER);
  await frames();
  assert.equal(await style('#version', 'opacity'), '1');
  await scrollTo('#r', tokens.header.expanded - tokens.header.collapsed);
  assert.equal(await style('#version', 'opacity'), '0');
  assert.equal(await style('#name', 'opacity'), '0');
});

test('sidhuvud med version: ryms den inte bredvid ett helt namn lämnas den bort helt, namnet orört', async () => {
  await mount(`<div style="inline-size: 200px">${VERSION_HEADER}</div>`);
  await frames();
  assert.equal(await page.locator('#version[data-fits]').count(), 0);
  assert.equal(await style('#version', 'visibility'), 'hidden');
  const name = await page.evaluate(() => { const e = document.querySelector('#name'); return e.scrollWidth <= e.clientWidth; });
  assert.ok(name, 'namnet kapas inte för versionen');
});

test('sidhuvud utan version ser ut som förut', async () => {
  await mount(HEADER);
  await frames();
  assert.equal(await page.locator('#r .kh-header__version').count(), 0);
});

test('sidhuvud utan djup: en hårfin linje i stället för skuggan', async () => {
  await mount(HEADER);
  await scrollTo('#r', 200);
  await page.waitForTimeout(250);
  assert.match(await style('#h', 'box-shadow'), /0px -1px 0px 0px inset/);
});

test('sidhuvud i en spalt: med --kh-page-max står innehållet i spalten och bakgrunden kant i kant', async () => {
  await mount(`<div style="inline-size: 1000px; --kh-page-max: 600px">${HEADER.replace('<div class="kh-header__trailing">', '<div class="kh-header__trailing" id="trail">')}</div>`);
  await frames();
  const h = await box('#h');
  const inset = (1000 - 600) / 2;
  assert.equal(h.width, 1000, 'bakgrunden över hela bredden');
  assert.equal((await box('#icon')).left - h.left, inset);
  assert.equal((await box('#title')).left - h.left, inset);
  assert.equal((await box('#sub')).left - h.left, inset);
  assert.equal(h.right - (await box('#trail')).right, inset - tokens.spacing.l + tokens.spacing.xs);
  await scrollTo('#r', tokens.header.expanded - tokens.header.collapsed);
  assert.equal((await box('#title')).left - h.left, inset + tokens.header.collapsedAppIcon + tokens.spacing.m, 'ihopfälld bredvid ikonen i spalten');
});

test('sidhuvud: en spalt bredare än fönstret ger samma marginal som utan spalt', async () => {
  await mount(`<div style="inline-size: 360px; --kh-page-max: 1200px">${HEADER}</div>`);
  await frames();
  const h = await box('#h');
  assert.equal((await box('#icon')).left - h.left, tokens.spacing.l);
  assert.equal((await box('#title')).left - h.left, tokens.spacing.l);
});

test('topprad i en spalt: pilen och åtgärderna följer spaltens kanter', async () => {
  await mount(`<div style="inline-size: 1000px; --kh-page-max: 600px">
      <header class="kh-topbar" id="t"><button class="kh-icon-btn" id="pil" aria-label="Tillbaka"><svg></svg></button><h1 class="kh-topbar__title">Huset</h1><div class="kh-topbar__actions"><button class="kh-btn kh-btn--primary kh-btn--compact" id="spara">Spara</button></div></header>
    </div>`);
  const t = await box('#t');
  assert.equal(t.width, 1000);
  assert.equal((await box('#pil')).x - t.x, 200 - tokens.spacing.l + tokens.spacing.xs);
  assert.equal(t.right - (await box('#spara')).right, 200 - tokens.spacing.l + tokens.spacing.xs);
});

test('sidan: .kh-page har marginalen --kh-space-l, och mer när spalten är smalare än fönstret', async () => {
  await mount('<div style="inline-size: 1000px; --kh-page-max: 600px"><div class="kh-page" id="a"><p id="pa">x</p></div></div><div style="inline-size: 360px"><div class="kh-page" id="b"><p id="pb">x</p></div></div>');
  assert.equal((await box('#pa')).width, 600);
  assert.equal((await box('#pa')).left - (await box('#a')).left, 200);
  assert.equal((await box('#pb')).left - (await box('#b')).left, tokens.spacing.l);
});

test('ramen: från 840 ett kort 600 brett med skugga, rullningen och det fasta i kortet; smalare som telefonen', async () => {
  const url = pathToFileURL(join(root, 'gallery', 'ram.html')).href;
  const wide = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const narrow = await browser.newPage({ viewport: { width: 440, height: 900 } });
  try {
    await wide.goto(`${url}?tema=ljust`);
    const rect = (p, selector) => p.evaluate((selector) => document.querySelector(selector).getBoundingClientRect().toJSON(), selector);
    const css = (p, selector, prop) => p.evaluate(({ selector, prop }) => getComputedStyle(document.querySelector(selector)).getPropertyValue(prop), { selector, prop });
    const frame = await rect(wide, '#ram');
    assert.deepEqual([frame.left, frame.top, frame.width, frame.height], [340, tokens.spacing.xxl, 600, 800 - 2 * tokens.spacing.xxl]);
    assert.equal(await css(wide, '#ram', 'border-top-left-radius'), `${tokens.radius.menu}px`);
    assert.notEqual(await css(wide, '#ram', 'box-shadow'), 'none');
    assert.notEqual(await css(wide, 'body', 'background-color'), await css(wide, '#ram', 'background-color'), 'bakgrunden runt kortet skiljer sig från appens');
    const bar = await rect(wide, '#flikar');
    assert.ok(bar.left >= frame.left && bar.right <= frame.right, 'flikraden inom kortets bredd');
    assert.equal(bar.bottom, frame.bottom - tokens.spacing.l, 'flikraden vid kortets underkant');
    const height = () => wide.evaluate(() => document.querySelector('kh-header').getBoundingClientRect().height);
    assert.equal(await height(), 144);
    await wide.evaluate(() => { document.getElementById('ram').scrollTop = 400; });
    await wide.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    assert.equal(await height(), 64, 'sidhuvudet krymper när kortet rullas');
    assert.equal(await wide.evaluate(() => scrollY), 0, 'sidan själv rullar inte');

    await narrow.goto(`${url}?tema=ljust`);
    const small = await rect(narrow, '#ram');
    assert.deepEqual([small.left, small.top, small.width], [0, 0, 440]);
    assert.equal(await css(narrow, '#ram', 'box-shadow'), 'none');
    assert.equal(await css(narrow, '#ram', 'overflow-y'), 'visible');
    assert.equal((await rect(narrow, '#flikar')).bottom, 900 - tokens.spacing.l, 'flikraden vid fönstrets underkant som förut');
  } finally {
    await wide.close();
    await narrow.close();
  }
});

test('kortrutnät: en spalt under 600, annars så många spalter om minst 300 som ryms', async () => {
  const columns = () => page.evaluate(() => getComputedStyle(document.getElementById('g')).gridTemplateColumns.split(' ').length);
  const GRID = (width, min = '') => `<div style="inline-size: ${width}px"><div class="kh-grid" id="g" style="${min}">${'<div class="kh-card">x</div>'.repeat(5)}</div></div>`;
  try {
    await page.setViewportSize({ width: 1280, height: 900 });
    await mount(GRID(1200));
    assert.equal(await columns(), 3);
    assert.equal(await style('#g', 'row-gap'), `${tokens.spacing.l}px`);
    await mount(GRID(652));
    assert.equal(await columns(), 2);
    await page.setViewportSize({ width: 599, height: 900 });
    await mount(GRID(560, '--kh-grid-min: 200px'));
    assert.equal(await columns(), 1, 'kompakt fönster: en spalt även med smalare kort');
  } finally {
    await page.setViewportSize({ width: 440, height: 900 });
  }
  await mount(GRID(408));
  assert.equal(await columns(), 1);
});

const TOOLBAR = `
  <kh-toolbar id="t">
    <div class="kh-toolbar__tabs">
      <button class="kh-toolbar__tab" id="t0" aria-selected="true"><svg></svg><span class="kh-toolbar__label">Objekt</span></button>
      <button class="kh-toolbar__tab" id="t1" aria-selected="false"><svg></svg><span class="kh-toolbar__label">Karta</span><span class="kh-toolbar__badge">3</span></button>
    </div>
    <button class="kh-toolbar__action" id="plus" popovertarget="m"><svg></svg></button>
  </kh-toolbar>
  <div class="kh-menu" id="m" popover><button class="kh-menu__item" id="val">Klistra in</button></div>`;

test('topprad: 64 hög och fast överst, pilen 4 från kanten, rubriken 56 in och avkortad, åtgärderna 4 från högerkanten', async () => {
  await mount(`<div id="rull" style="block-size: 200px; overflow-y: auto; inline-size: 360px">
      <header class="kh-topbar" id="t"><button class="kh-icon-btn kh-icon-btn--tonal" id="pil" aria-label="Tillbaka"><svg><use href="#i-arrow-back"/></svg></button><h1 class="kh-topbar__title" id="rubrik"><kh-dots></kh-dots><span id="text">En mycket lång rubrik som inte får plats på en rad i toppraden</span></h1><div class="kh-topbar__actions"><button class="kh-btn kh-btn--primary kh-btn--compact" id="spara">Spara</button></div></header>
      <header class="kh-topbar" id="u"><h1 class="kh-topbar__title" id="utan">Utan pil</h1></header>
      <div style="block-size: 600px"></div>
    </div>`);
  const t = await box('#t');
  assert.equal(t.height, tokens.header.collapsed);
  assert.equal((await box('#pil')).x - t.x, 4);
  assert.equal((await box('#rubrik')).x - t.x, 56);
  assert.equal((await box('#utan')).x - t.x, 16, 'utan pil börjar rubriken 16 in');
  assert.equal(t.right - (await box('#spara')).right, 4);
  assert.equal(`${(await box('#text')).height}px`, await style('#rubrik', 'line-height'), 'en rad');
  assert.ok(await page.evaluate(() => { const e = document.getElementById('text'); return e.scrollWidth > e.clientWidth; }), 'avkortad');
  assert.equal(await style('#rubrik', 'font'), await page.evaluate(() => { const p = document.createElement('i'); p.className = 'kh-text-section-title'; document.body.append(p); const f = getComputedStyle(p).font; p.remove(); return f; }), 'rubriken i sectionTitle');
  assert.equal(await style('#t', 'background-color'), await themeColor('--kh-background'));
  await page.evaluate(() => { document.getElementById('rull').scrollTop = 150; });
  assert.equal((await box('#t')).y, (await box('#rull')).y, 'står kvar överst när sidan rullar');
});

test('flikrad: vald flik visar namnet i primärfärgen, ett tryck byter flik och meddelar kh-select', async () => {
  await mount(TOOLBAR);
  await page.waitForTimeout(350);
  assert.equal(await style('#t0', 'background-color'), await themeColor('--kh-primary'));
  assert.ok((await box('#t0 .kh-toolbar__label')).width > 0);
  assert.equal((await box('#t1 .kh-toolbar__label')).width, 0);
  assert.equal((await box('#t1')).height, 48);
  assert.equal((await box('#t .kh-toolbar__tabs')).height, 64);
  assert.equal(await style('#t1 .kh-toolbar__badge', 'display'), 'grid');
  const selected = page.evaluate(() => new Promise((done) => document.getElementById('t').addEventListener('kh-select', (e) => done(e.detail.index), { once: true })));
  await page.click('#t1');
  assert.equal(await selected, 1);
  await page.waitForTimeout(350);
  assert.equal(await page.getAttribute('#t0', 'aria-selected'), 'false');
  assert.equal(await page.getAttribute('#t1', 'aria-selected'), 'true');
  assert.equal((await box('#t0 .kh-toolbar__label')).width, 0);
  assert.equal(await style('#t1 .kh-toolbar__badge', 'display'), 'none', 'märket bara på ovald flik');
});

test('flikrad: huvudknappen öppnar menyn ovanför sig, och ett val stänger den', async () => {
  // Plats ovanför, som när raden står längst ned på skärmen (annars fälls menyn under knappen).
  await mount(`<div style="block-size: 400px"></div>${TOOLBAR}`);
  const plus = await box('#plus');
  assert.equal(plus.width, 56);
  assert.equal(await style('#plus', 'background-color'), await themeColor('--kh-secondary'));
  await page.click('#plus');
  assert.equal(await page.evaluate(() => document.getElementById('m').matches(':popover-open')), true);
  await page.waitForFunction(() => document.getElementById('plus').getAttribute('aria-expanded') === 'true');
  const menu = await box('#m');
  assert.ok(Math.abs(menu.bottom - plus.top) <= 1, `menyn står på knappen (${menu.bottom} mot ${plus.top})`);
  assert.ok(Math.abs(menu.right - plus.right) <= 1, 'menyn linjerar med knappens ytterkant');
  assert.equal(await style('#m', 'border-radius'), `${tokens.radius.menu}px`);
  await page.click('#val');
  assert.equal(await page.evaluate(() => document.getElementById('m').matches(':popover-open')), false);
  await page.waitForFunction(() => document.getElementById('plus').getAttribute('aria-expanded') === 'false');
});

test('meny vid en knapp: öppnar under knappen linjerad med högerkanten, också när appen öppnar den själv', async () => {
  await mount(`<div style="display: flex; justify-content: flex-end; inline-size: 360px">
      <button class="kh-icon-btn" id="k" popovertarget="km" aria-label="Rösta"><svg></svg></button>
    </div>
    <a href="#lank" style="display: flex; justify-content: flex-end; inline-size: 360px">
      <button class="kh-icon-btn" id="j" popovertarget="jm" aria-label="I en länk"><svg></svg></button>
    </a>
    <div class="kh-menu" id="km" popover><button class="kh-menu__item" role="menuitemradio" aria-checked="false" id="ja">Ja</button></div>
    <div class="kh-menu" id="jm" popover><button class="kh-menu__item" id="jval">Nej</button></div>`);
  const knapp = await box('#k');
  await page.click('#k');
  assert.equal(await page.evaluate(() => document.getElementById('km').matches(':popover-open')), true);
  assert.equal(await page.getAttribute('#k', 'aria-expanded'), 'true');
  const meny = await box('#km');
  assert.ok(Math.abs(meny.top - knapp.bottom) <= 1, `menyn under knappen (${meny.top} mot ${knapp.bottom})`);
  assert.ok(Math.abs(meny.right - knapp.right) <= 1, 'menyn linjerar med knappens högerkant');
  await page.click('#ja');
  assert.equal(await page.evaluate(() => document.getElementById('km').matches(':popover-open')), false, 'ett val stänger menyn');
  assert.equal(await page.getAttribute('#k', 'aria-expanded'), 'false');
  // En knapp i en länk: appen hindrar länken och öppnar menyn själv – förankringen följer ändå med.
  await page.evaluate(() => document.getElementById('j').addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation(); document.getElementById('jm').togglePopover();
  }));
  await page.click('#j');
  const j = await box('#j');
  const jm = await box('#jm');
  assert.equal(await page.evaluate(() => location.hash), '', 'länken följdes inte');
  assert.ok(Math.abs(jm.top - j.bottom) <= 1 && Math.abs(jm.right - j.right) <= 1, 'förankrad vid knappen i länken');
  await page.click('#jval');
});

test('segmentval: ett val i taget, med tryck och pilar, och kh-select', async () => {
  await mount(`<kh-segmented id="s" role="radiogroup">
    <button role="radio" aria-checked="true" id="s0">Ljust</button><button role="radio" aria-checked="false" id="s1">Mörkt</button><button role="radio" aria-checked="false" id="s2">System</button>
  </kh-segmented>`);
  assert.equal(await page.evaluate(() => document.getElementById('s').classList.contains('kh-segmented')), true);
  const events = page.evaluate(() => new Promise((done) => {
    const seen = [];
    document.getElementById('s').addEventListener('kh-select', (e) => { seen.push(e.detail.value); if (seen.length === 2) done(seen); });
  }));
  await page.click('#s1');
  await page.keyboard.press('ArrowRight');
  assert.deepEqual(await events, ['Mörkt', 'System']);
  assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('#s > *')].map((b) => b.getAttribute('aria-checked'))), ['false', 'false', 'true']);
  assert.equal(await page.evaluate(() => document.activeElement.id), 's2');
});

test('textfält med ikonknapp: knappen 48 i fältet, ikonen 12 från kanten, fältet 56 högt; ett tryck flyttar inte fokus till fältet', async () => {
  await mount('<label class="kh-field" id="f"><input class="kh-field__input" placeholder=" "><span class="kh-field__label">När?</span><button class="kh-icon-btn" type="button" aria-label="Välj" id="fb"><svg><use href="#i-clock"/></svg></button></label>');
  const field = await box('#f');
  const icon = await box('#fb svg');
  const button = await box('#fb');
  assert.equal(field.height, 56);
  assert.equal(button.width, 48);
  assert.equal(Math.round(field.right - icon.right), 12);
  assert.equal(await style('#fb', 'color'), await themeColor('--kh-on-surface-variant'));
  const clicked = page.evaluate(() => new Promise((done) => document.getElementById('fb').addEventListener('click', () => done(true), { once: true })));
  await page.click('#fb');
  assert.equal(await clicked, true);
  assert.notEqual(await page.evaluate(() => document.activeElement.tagName), 'INPUT');
});

test('utfällbar rad: utfälld ligger rubrik och innehåll på radens tonade yta med radens hörn, och chevronen vänds', async () => {
  await mount(`<div class="kh-card">
    <div class="kh-foldout" id="fo"><button class="kh-row kh-foldout__header" id="foh" type="button" aria-expanded="false" aria-controls="foc">
      <div class="kh-row__text"><span class="kh-row__title">Uppgifter</span></div><svg class="kh-icon kh-foldout__chevron" id="fop"><use href="#i-expand"/></svg></button>
      <div class="kh-foldout__content" id="foc" hidden><label class="kh-field" id="fof"><input class="kh-field__input" placeholder=" "><span class="kh-field__label">Ny</span></label></div></div></div>`);
  assert.equal(await style('#fo', 'background-color'), 'rgba(0, 0, 0, 0)');
  assert.equal(await style('#foc', 'display'), 'none');
  await page.evaluate(() => { document.getElementById('foh').setAttribute('aria-expanded', 'true'); document.getElementById('foc').hidden = false; });
  // Chevronen vänds på 200 ms.
  await page.waitForTimeout(300);
  assert.equal(await style('#fo', 'background-color'), await themeColor('--kh-row-tint'));
  assert.equal(await style('#fo', 'border-top-left-radius'), `${tokens.radius.row}px`);
  assert.equal(await style('#fof', 'background-color'), await themeColor('--kh-card'), 'fältet behåller sin färg på ytan');
  assert.match(await style('#fop', 'transform'), /^matrix\(-1, /);
  await page.evaluate(() => document.getElementById('fo').style.setProperty('--kh-foldout-surface', 'var(--kh-surface-variant)'));
  await settle();
  assert.equal(await style('#fo', 'background-color'), await themeColor('--kh-surface-variant'), 'appen väljer ytan');
});

test('tryckläget: hovring ger lagret med mus, men inte på en pekskärm (fastnade i Chrome på Android)', async () => {
  const html = '<button class="kh-row" id="hv" type="button"><div class="kh-row__text"><span class="kh-row__title">Rad</span></div></button>';
  await mount(html);
  await page.hover('#hv');
  await settle();
  assert.equal(await style('#hv', 'opacity', '::after'), '0.08');
  const context = await browser.newContext({ viewport: { width: 400, height: 800 }, isMobile: true, hasTouch: true });
  const touch = await context.newPage();
  try {
    await touch.goto(`${gallery}?tema=ljust`);
    await touch.evaluate((html) => document.body.insertAdjacentHTML('afterbegin', html), html);
    await touch.tap('#hv');
    // Trycket (::after 0.1 under :active) tonar bort på 150 ms.
    await touch.waitForTimeout(400);
    assert.equal(await touch.evaluate(() => matchMedia('(hover: hover)').matches), false);
    assert.equal(await touch.evaluate(() => getComputedStyle(document.getElementById('hv'), '::after').opacity), '0');
  } finally {
    await context.close();
  }
});

test('tidsväljare: två hjul i spåret, 100 breda och 120 höga, tal 52 höga; value läses och sätts', async () => {
  await mount('<kh-time-picker id="t" value="07:30"></kh-time-picker>');
  const wheels = await page.evaluate(() => [...document.querySelectorAll('#t .kh-time-picker__wheel')].map((w) => {
    const r = w.getBoundingClientRect();
    return { width: r.width, height: r.height, item: w.firstElementChild.offsetHeight, label: w.getAttribute('aria-label') };
  }));
  assert.deepEqual(wheels, [
    { width: 100, height: 120, item: 52, label: 'Timme' },
    { width: 100, height: 120, item: 52, label: 'Minut' },
  ]);
  assert.equal(await style('#t .kh-time-picker__wheel', 'background-color'), await themeColor('--kh-row-tint'));
  assert.equal(await style('#t .kh-time-picker__wheel', 'border-top-left-radius'), `${tokens.radius.fab}px`);
  assert.equal(await page.evaluate(() => document.getElementById('t').value), '07:30');
  await page.evaluate(() => { document.getElementById('t').value = '23:05'; });
  assert.equal(await page.evaluate(() => document.getElementById('t').value), '23:05');
});

test('tidsväljare: talet i mitten i on-surface, grannarna i outline och mindre', async () => {
  await mount('<kh-time-picker id="t" value="07:30"></kh-time-picker>');
  await settle();
  const items = await page.evaluate(() => {
    const wheel = document.querySelector('#t .kh-time-picker__wheel');
    const middle = wheel.getBoundingClientRect().top + 60;
    return [...wheel.children]
      .map((item) => { const r = item.getBoundingClientRect(); return { text: item.textContent, at: r.top + r.height / 2 - middle, height: r.height, color: getComputedStyle(item).color }; })
      .filter((item) => Math.abs(item.at) < 60);
  });
  assert.deepEqual(items.map((item) => item.text), ['06', '07', '08']);
  assert.equal(items[1].color, await themeColor('--kh-on-surface'));
  assert.equal(items[0].color, await themeColor('--kh-outline'));
  assert.equal(items[2].color, await themeColor('--kh-outline'));
  assert.ok(Math.abs(items[1].height - 52) < 1, 'talet i mitten i full storlek');
  assert.ok(Math.abs(items[0].height - 52 * 32 / 45) < 1, 'grannarna 32/45 av talet');
});

test('tidsväljare: steget avrundar minuterna, också över timgränsen', async () => {
  await mount('<kh-time-picker id="t" step="5" value="09:42"></kh-time-picker>');
  assert.equal(await page.evaluate(() => document.getElementById('t').value), '09:40');
  assert.equal(await page.evaluate(() => document.querySelectorAll('#t .kh-time-picker__wheel')[1].children.length % 12), 0, 'tolv minuter per varv');
  await page.evaluate(() => { document.getElementById('t').value = '23:58'; });
  assert.equal(await page.evaluate(() => document.getElementById('t').value), '00:00');
});

test('tidsväljare: pilarna och ett tryck på en granne rullar ett steg och meddelar change; hjulet går runt', async () => {
  await mount('<kh-time-picker id="t" step="5" value="23:55"></kh-time-picker>');
  const changes = () => page.evaluate(() => new Promise((done) => document.getElementById('t').addEventListener('change', (e) => done(e.target.value), { once: true })));
  let changed = changes();
  await page.focus('#t .kh-time-picker__wheel:last-of-type');
  await page.keyboard.press('ArrowDown');
  assert.equal(await changed, '23:00');
  changed = changes();
  await page.keyboard.press('ArrowUp');
  assert.equal(await changed, '23:55');
  changed = changes();
  const hours = await box('#t .kh-time-picker__wheel');
  await page.mouse.click(hours.left + 50, hours.top + 112);
  assert.equal(await changed, '00:55');
});

test('tidsväljare: i en stängd dialog visar hjulen rätt tid när dialogen öppnas', async () => {
  await mount('<dialog class="kh-dialog" id="d"><h2 class="kh-dialog__title">Välj tid</h2><kh-time-picker id="t"></kh-time-picker></dialog>');
  await page.evaluate(() => { document.getElementById('t').value = '18:15'; document.getElementById('d').showModal(); });
  await settle();
  const middle = await page.evaluate(() => [...document.querySelectorAll('#t .kh-time-picker__wheel')].map((wheel) => {
    const center = wheel.getBoundingClientRect().top + 60;
    return [...wheel.children].find((item) => { const r = item.getBoundingClientRect(); return Math.abs(r.top + r.height / 2 - center) < 2; })?.textContent;
  }));
  assert.deepEqual(middle, ['18', '15']);
  assert.equal(await style('#d .kh-dialog__title', 'font'), await page.evaluate(() => { const p = document.createElement('i'); p.className = 'kh-text-headline'; document.body.append(p); const f = getComputedStyle(p).font; p.remove(); return f; }), 'rubriken i headline som övriga dialoger');
  await page.evaluate(() => document.getElementById('d').close());
});

test('dra ned: efter tröskeln meddelas kh-refresh och prickarna står kvar tills uppdateringen är klar; före tröskeln inget', async () => {
  const touchPage = await browser.newPage({ viewport: { width: 440, height: 900 }, hasTouch: true });
  try {
    await touchPage.clock.install();
    await touchPage.goto(`${gallery}?tema=ljust`);
    await touchPage.evaluate(() => {
      document.body.innerHTML = '<div id="r" style="block-size: 400px; overflow-y: auto"><kh-refresh id="k"><div style="block-size: 1200px"></div></kh-refresh></div>';
      window.refreshes = 0;
      // Galleriets eget prov svarar på kh-refresh; här svarar provet självt.
      document.getElementById('r').addEventListener('kh-refresh', (e) => { e.stopPropagation(); window.refreshes++; });
    });
    const pull = (distance) => touchPage.evaluate((distance) => {
      const target = document.getElementById('k');
      const touch = (y) => new Touch({ identifier: 1, target, clientX: 200, clientY: y });
      const fire = (type, y) => target.dispatchEvent(new TouchEvent(type, {
        bubbles: true, cancelable: true, touches: type === 'touchend' ? [] : [touch(y)], changedTouches: [touch(y)]
      }));
      fire('touchstart', 100);
      for (let y = 100; y <= 100 + distance; y += 20) fire('touchmove', y);
      fire('touchend', 100 + distance);
    }, distance);
    const state = () => touchPage.evaluate(() => document.getElementById('k').dataset.state ?? null);
    const visible = () => touchPage.evaluate(() => getComputedStyle(document.querySelector('#k > .kh-refresh__indicator')).visibility);

    // 100 px finger = 50 i dragning: under tröskeln 80.
    await pull(100);
    assert.equal(await touchPage.evaluate(() => window.refreshes), 0);
    assert.equal(await state(), null);

    await pull(200);
    assert.equal(await touchPage.evaluate(() => window.refreshes), 1);
    assert.equal(await state(), 'refreshing');
    assert.equal(await visible(), 'visible');
    await touchPage.evaluate(() => document.getElementById('k').setAttribute('refreshing', ''));
    await touchPage.clock.fastForward(6000);
    assert.equal(await state(), 'refreshing', 'står kvar så länge appen uppdaterar');
    await touchPage.evaluate(() => document.getElementById('k').removeAttribute('refreshing'));
    assert.equal(await state(), null);

    // En dragning som appen aldrig svarar på släpps efter 5 s.
    await pull(200);
    await touchPage.clock.fastForward(5100);
    assert.equal(await state(), null);

    // En uppdatering appen startat själv visar inga prickar här.
    await touchPage.evaluate(() => document.getElementById('k').setAttribute('refreshing', ''));
    assert.equal(await state(), null);

    // Rullad en bit ned: ingen dragning.
    await touchPage.evaluate(() => { document.getElementById('k').removeAttribute('refreshing'); document.getElementById('r').scrollTop = 50; });
    await pull(200);
    assert.equal(await touchPage.evaluate(() => window.refreshes), 2);
  } finally {
    await touchPage.close();
  }
});

test('svep åt vänster: efter en tredjedel eller ett snabbt drag meddelas kh-swipe och raden glider tillbaka; kort, åt höger eller lodrätt inget', async () => {
  const touchPage = await browser.newPage({ viewport: { width: 440, height: 900 }, hasTouch: true });
  try {
    await touchPage.goto(`${gallery}?tema=ljust`);
    await touchPage.evaluate(() => {
      document.body.innerHTML = '<div class="kh-card" style="inline-size: 360px; margin: 40px"><kh-swipe id="s" label="Radera"><div class="kh-row" id="r"><div class="kh-row__text"><span class="kh-row__title">Promenad</span></div></div></kh-swipe></div>';
      window.swipes = 0;
      document.getElementById('s').addEventListener('kh-swipe', () => { window.swipes++; });
    });
    const drag = (dx, dy = 0, startX = 300) => touchPage.evaluate(({ dx, dy, startX }) => {
      const target = document.getElementById('r');
      const touch = (x, y) => new Touch({ identifier: 1, target, clientX: x, clientY: y });
      const fire = (type, x, y) => target.dispatchEvent(new TouchEvent(type, {
        bubbles: true, cancelable: true, touches: type === 'touchend' ? [] : [touch(x, y)], changedTouches: [touch(x, y)]
      }));
      const steps = 10;
      fire('touchstart', startX, 60);
      for (let i = 1; i <= steps; i++) fire('touchmove', startX + (dx * i) / steps, 60 + (dy * i) / steps);
      fire('touchend', startX + dx, 60 + dy);
    }, { dx, dy, startX });
    const swipes = () => touchPage.evaluate(() => window.swipes);

    await drag(-30);
    assert.equal(await swipes(), 0, 'under 40 px räcker inte ens ett snabbt drag');
    await drag(-160);
    assert.equal(await swipes(), 1);
    assert.equal(await touchPage.evaluate(() => document.getElementById('s').style.getPropertyValue('--kh-swipe-offset')), '0px', 'raden glider tillbaka');
    await drag(160);
    assert.equal(await swipes(), 1, 'åt höger tar aldrig bort');
    await drag(-30, 200);
    assert.equal(await swipes(), 1, 'lodrätt är rullning');
    await drag(-200, 0, 430);
    assert.equal(await swipes(), 1, 'inget svep från kantzonen');
    assert.equal(await touchPage.evaluate(() => document.getElementById('s').dataset.ownSwipe), 'left');
    assert.equal(await touchPage.evaluate(() => document.querySelector('#s > .kh-swipe__background').textContent), 'Radera');
  } finally {
    await touchPage.close();
  }
});

test('rad som går att radera: Radera i felfärgen sist bland radens knappar; svepets bakgrund felfärgad, dölj i primärtonen', async () => {
  const buttons = await page.evaluate(() => [...document.querySelectorAll('[data-skarmdump="Foldout_radera"] .kh-foldout__actions .kh-btn')].map((b) => b.textContent));
  assert.deepEqual(buttons, ['Bevaka alternativ', 'Radera']);
  assert.equal(await style('[data-skarmdump="Foldout_radera"] .kh-btn--destructive-text', 'color'), await themeColor('--kh-error'));
  assert.equal(await style('[data-skarmdump="Foldout_radera"] .kh-btn--destructive-text', 'background-color'), 'rgba(0, 0, 0, 0)');
  assert.equal(await style('[data-skarmdump="Foldout_radera"] kh-swipe .kh-swipe__background', 'display'), 'none', 'syns bara medan raden dras');
  assert.equal(await style('[data-skarmdump="SwipeToDelete_svept"] kh-swipe .kh-swipe__background', 'background-color'), await themeColor('--kh-error-container'));
  assert.equal(await style('[data-skarmdump="SwipeToDelete_svept"] kh-swipe[tone="hide"] .kh-swipe__background', 'background-color'), await themeColor('--kh-primary-container'));
});

test('oskärpa under sidhuvudet: ingen i vila, tonar in med ihopfällningen, 8 suddigt och 24 lång', async () => {
  await mount(HEADER);
  await frames();
  const after = (prop) => style('#h', prop, '::after');
  assert.equal(await after('opacity'), '0', 'i vila syns ingen oskärpa');
  // AppBlur 3.11.1: headerRadius 8 (standardavvikelse 8 × 0,577 + 0,5) och headerFade 24.
  assert.equal(await after('backdrop-filter'), 'blur(5.116px)');
  assert.equal(await after('height'), '24px');
  await scrollTo('#r', 40);
  assert.equal(await after('opacity'), '0.5', 'halvvägs ihopfällt: halvt intonad');
  await scrollTo('#r', 200);
  assert.equal(await after('opacity'), '1');
  const header = await box('#h');
  const blur = await page.evaluate(() => {
    const h = document.getElementById('h');
    return parseFloat(getComputedStyle(h, '::after').top);
  });
  assert.equal(blur, header.height, 'oskärpan börjar vid sidhuvudets nederkant');
  await page.evaluate(() => document.documentElement.style.setProperty('--kh-blur', '0'));
  assert.equal(await after('opacity'), '0', '--kh-blur: 0 stänger av');
  await page.evaluate(() => document.documentElement.style.removeProperty('--kh-blur'));
});

test('oskärpa under toppraden: ingen utan rullning, full efter 24 px', async () => {
  await mount(`<div id="r" style="block-size: 300px; overflow-y: auto"><header class="kh-topbar" id="t"><h1 class="kh-topbar__title"><span>Rätt</span></h1></header><div style="block-size: 1200px"></div></div>`);
  assert.equal(await style('#t', 'opacity', '::after'), '0');
  await page.evaluate(() => { document.getElementById('r').scrollTop = 100; });
  await frames();
  assert.equal(await style('#t', 'opacity', '::after'), '1');
});

test('kryssrad: hela raden kryssar, kakan ersätter ringen, ikryssad är raden klar och tonad utom --plain', async () => {
  await mount(`<div class="kh-card">
    <label class="kh-row kh-check-row" id="a"><span class="kh-row__leading"><input type="checkbox" class="kh-check" id="ka"></span><span class="kh-row__text"><span class="kh-row__title" id="ta">Mjölk</span></span></label>
    <label class="kh-row kh-check-row kh-check-row--plain" id="b"><span class="kh-row__leading"><input type="checkbox" class="kh-check" id="kb" checked></span><span class="kh-row__text"><span class="kh-row__title" id="tb">Ta med</span></span></label></div>`);
  assert.equal((await box('#ka')).width, 40);
  assert.equal((await box('#a .kh-row__leading')).width, 48, 'krysset i en 48 bred plats, så att titlarna linjerar');
  assert.equal(await style('#ka', 'opacity', '::before'), '0', 'okryssad: bara ringen');
  await page.click('#ta');
  assert.equal(await page.evaluate(() => document.getElementById('ka').checked), true, 'ett tryck på titeln kryssar');
  await page.waitForTimeout(400);
  assert.equal(await style('#ka', 'opacity', '::before'), '1');
  assert.match(await style('#ka', 'clip-path', '::before'), /^polygon/);
  assert.equal(await style('#ka', 'border-top-color'), 'rgba(0, 0, 0, 0)', 'ringen borta');
  assert.match(await style('#ta', 'text-decoration-line'), /line-through/);
  assert.equal(await style('#a', 'background-color'), await themeColor('--kh-row-tint'));
  assert.doesNotMatch(await style('#tb', 'text-decoration-line'), /line-through/, '--plain: kryss betyder ta med');
  assert.equal(await style('#b', 'background-color'), 'rgba(0, 0, 0, 0)');
});

test('reglagerad: hela raden växlar, 52 × 32, knoppen växer och flyttas påslagen, inaktiv tonar bara texten', async () => {
  await mount(`<div class="kh-card">
    <label class="kh-row kh-switch-row kh-switch-row--inactive" id="a"><span class="kh-row__text"><span class="kh-row__title" id="t">Påminnelser</span></span><input type="checkbox" role="switch" class="kh-switch" id="s"></label></div>`);
  const s = await box('#s');
  assert.deepEqual([s.width, s.height], [52, 32]);
  assert.equal(await style('#s', 'width', '::before'), '16px');
  await page.click('#t');
  assert.equal(await page.evaluate(() => document.getElementById('s').checked), true);
  await page.mouse.move(0, 0);
  await page.waitForTimeout(350);
  assert.equal(await style('#s', 'width', '::before'), '24px');
  assert.equal(await style('#s', 'background-color'), await themeColor('--kh-primary'));
  assert.equal(await style('#a .kh-row__text', 'opacity'), '0.55');
  assert.equal(await style('#s', 'opacity'), '1', 'växeln tonas inte ned');
});

test('stegare: − och + inom gränserna, change, knappen vid gränsen av, namn ur label, format', async () => {
  await mount('<kh-stepper id="q" value="1" min="0" max="2" label="portioner"></kh-stepper>');
  const minus = '#q .kh-stepper__button--decrease';
  const plus = '#q .kh-stepper__button--increase';
  assert.equal(await page.getAttribute(minus, 'aria-label'), 'Minska portioner');
  assert.equal(await page.getAttribute(plus, 'aria-label'), 'Öka portioner');
  assert.equal((await box(minus)).width, 44);
  await page.evaluate(() => {
    window.stegen = [];
    document.getElementById('q').addEventListener('change', (e) => window.stegen.push(e.target.value));
  });
  await page.click(plus);
  assert.equal(await page.textContent('#q .kh-stepper__value'), '2');
  assert.equal(await page.isDisabled(plus), true, 'vid max går det inte att öka');
  await page.click(minus);
  await page.click(minus);
  assert.equal(await page.isDisabled(minus), true);
  assert.deepEqual(await page.evaluate(() => window.stegen), [2, 1, 0]);
  await page.evaluate(() => { document.getElementById('q').format = (v) => (v === 0 ? 'Ingen spärr' : `${v} h`); });
  assert.equal(await page.textContent('#q .kh-stepper__value'), 'Ingen spärr');
  await page.evaluate(() => document.getElementById('q').style.setProperty('--kh-stepper-button', '48px'));
  assert.equal((await box(minus)).width, 48);
  assert.equal(await style('#q', 'background-color'), await themeColor('--kh-row-tint'));
});

/* ---------- Sidhuvudet utan kh.js (ren CSS) ---------- */

// Sidan utan kh.js (bare): <kh-header> förblir odefinierat, och ihopfällningen är kh.css rullningsdrivna animering.

/** Monterar [html] överst i [target] (kh.js-galleriet eller sidan utan) och väntar två bildrutor. */
const mountIn = async (target, html) => {
  await target.evaluate((html) => {
    document.getElementById('prov')?.remove();
    const frame = document.createElement('div');
    frame.id = 'prov';
    frame.className = 'kh-depth';
    frame.innerHTML = html;
    document.body.prepend(frame);
    scrollTo(0, 0);
  }, html);
  await target.evaluate(() => document.fonts.ready);
  await target.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
};
const scrollIn = async (target, top) => {
  await target.evaluate((top) => { document.getElementById('r').scrollTop = top; }, top);
  await target.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
};
const boxIn = (target, selector) => target.evaluate((selector) => document.querySelector(selector).getBoundingClientRect().toJSON(), selector);
const styleIn = (target, selector, prop) => target.evaluate(({ selector, prop }) => getComputedStyle(document.querySelector(selector)).getPropertyValue(prop), { selector, prop });
// Prickarna har sina <i> i koden: utan kh.js lägger ingen dit dem.
const BARE_HEADER = VERSION_HEADER.replace('<kh-dots></kh-dots>', '<kh-dots><i></i><i></i></kh-dots>');
/** Ritas elementet? position-visibility döljer utan att ändra visibility, så frågan ställs till träffytan. */
const drawn = (target, selector) =>
  target.evaluate((selector) => {
    const element = document.querySelector(selector);
    const rect = element.getBoundingClientRect();
    return document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) === element;
  }, selector);

test('sidhuvud utan kh.js: odefinierat, 144 i vila, 64 efter 80 px rullning utan att innehållet hoppar, rubriken krymper', async () => {
  const p = bare.page;
  await mountIn(p, BARE_HEADER);
  assert.equal(await p.evaluate(() => document.getElementById('h').matches(':defined')), false);
  const contentAt = async () => (await boxIn(p, '#innehall')).top - (await boxIn(p, '#r')).top;
  assert.equal((await boxIn(p, '#h')).height, tokens.header.expanded);
  assert.equal(await contentAt(), tokens.header.expanded);
  assert.equal(await styleIn(p, '#title', 'font-size'), '34px', 'rubriken i screen-title');
  const title = await boxIn(p, '#title');
  const sub = await boxIn(p, '#sub');
  assert.ok(Math.abs(sub.top - title.bottom) <= 0.5, 'undertiteln direkt under rubriken');

  await scrollIn(p, 40);
  assert.equal((await boxIn(p, '#h')).height, tokens.header.expanded - 40);
  assert.equal(await contentAt(), tokens.header.expanded - 40, 'innehållet följer fingret');
  assert.equal(await styleIn(p, '#title', 'font-size'), '26px', 'halvvägs mellan 34 och 18');
  assert.equal(await styleIn(p, '#name', 'opacity'), '0');
  assert.ok(Math.abs((await boxIn(p, '#sub')).top - (await boxIn(p, '#title')).bottom) <= 0.5, 'undertiteln följer rubriken');

  await scrollIn(p, tokens.header.expanded - tokens.header.collapsed);
  const h = await boxIn(p, '#h');
  assert.equal(h.height, tokens.header.collapsed);
  assert.equal(await styleIn(p, '#title', 'font-size'), '18px', 'rubriken i section-title');
  assert.equal((await boxIn(p, '#icon')).width, tokens.header.collapsedAppIcon);
  const collapsed = await boxIn(p, '#title');
  assert.equal(collapsed.left - h.left, tokens.spacing.l + tokens.header.collapsedAppIcon + tokens.spacing.m, 'bredvid ikonen');
  assert.ok(Math.abs(collapsed.top + collapsed.height / 2 - (h.top + tokens.header.collapsed / 2)) <= 1, 'mitt i den smala raden');
  assert.deepEqual(rgb(await styleIn(p, '#h', 'background-color')), rgb(await styleIn(p, 'body', 'background-color')), 'inte upphöjt än');
  assert.equal(await styleIn(p, '#h', '--kh-header-lift'), '0', 'ihopfällt men inget under än');

  await scrollIn(p, 200);
  assert.equal((await boxIn(p, '#h')).height, tokens.header.collapsed);
  assert.equal(await styleIn(p, '#h', '--kh-header-lift'), '1', 'upphöjt när innehåll ligger under');
  assert.match(await styleIn(p, '#h', 'box-shadow'), /15px/);
  assert.deepEqual(rgb(await styleIn(p, '#h', 'background-color')), rgb(await styleIn(p, '.kh-card', 'background-color')), 'kortens färg');

  await scrollIn(p, 0);
  assert.equal((await boxIn(p, '#h')).height, tokens.header.expanded, 'fälls ut högst upp');
  assert.equal(await styleIn(p, '#h', '--kh-header-lift'), '0');
});

test('sidhuvud utan kh.js: versionen på namnets baslinje efter texten, borta när den inte ryms bredvid ett helt namn', async () => {
  const p = bare.page;
  await mountIn(p, BARE_HEADER);
  const name = await boxIn(p, '#name');
  const version = await boxIn(p, '#version');
  assert.ok(Math.abs(version.left - (name.right + tokens.spacing.xs)) <= 0.5, 'ett xs-avstånd efter namnet');
  // Baslinjen: textens ruta (typsnittets över- och underhäng) plus överhänget ur typsnittets mått.
  const baselines = await p.evaluate(() => ['#name', '#version'].map((id) => {
    const element = document.querySelector(id);
    const range = document.createRange();
    range.selectNodeContents(element);
    const context = document.createElement('canvas').getContext('2d');
    context.font = getComputedStyle(element).font;
    return range.getBoundingClientRect().top + context.measureText('Åg').fontBoundingBoxAscent;
  }));
  assert.ok(Math.abs(baselines[0] - baselines[1]) <= 0.5, `samma baslinje (${baselines})`);
  assert.equal(await drawn(p, '#version'), true);

  await mountIn(p, `<div style="inline-size: 200px">${BARE_HEADER}</div>`);
  assert.equal(await drawn(p, '#version'), false, 'ryms inte: lämnas bort');
  assert.ok(await p.evaluate(() => { const e = document.querySelector('#name'); return e.scrollWidth <= e.clientWidth; }), 'namnet kapas inte för versionen');
});

test('sidhuvud utan kh.js följer kh.js: samma mått, högst en halv px ifrån, vid varje rullning', async () => {
  const widths = [400, 1000];
  for (const width of widths) {
    const html = `<div style="inline-size: ${width}px; --kh-page-max: 600px">${BARE_HEADER}</div>`;
    await mountIn(page, html);
    await mountIn(bare.page, html);
    for (const top of [0, 10, 20, 30, 40, 60, 80, 200]) {
      await scrollIn(page, top);
      await scrollIn(bare.page, top);
      for (const id of ['#h', '#icon', '#name', '#title', '#sub', '#konto']) {
        const [js, css] = [await boxIn(page, id), await boxIn(bare.page, id)];
        for (const edge of ['left', 'top', 'height']) {
          assert.ok(Math.abs(js[edge] - css[edge]) <= 0.5, `${id} ${edge} vid ${top} px i ${width} bred: kh.js ${js[edge]}, CSS ${css[edge]}`);
        }
      }
      for (const prop of ['font-size', 'line-height', 'font-weight']) {
        assert.equal(await styleIn(bare.page, '#title', prop), await styleIn(page, '#title', prop), `rubrikens ${prop} vid ${top} px`);
      }
      for (const id of ['#name', '#sub', '#h']) {
        assert.equal(await styleIn(bare.page, id, 'opacity'), await styleIn(page, id, 'opacity'), `${id} opacity vid ${top} px`);
      }
    }
  }
});

test('sidhuvud med kh.js: ren CSS-vägen rör det inte – inga animeringar, kh.js mått i style', async () => {
  await mountIn(page, VERSION_HEADER);
  await scrollIn(page, 40);
  assert.equal(await page.evaluate(() => document.getElementById('h').matches(':defined')), true);
  assert.equal(await page.evaluate(() => document.getElementById('h').getAnimations({ subtree: true }).filter((a) => !(a.timeline instanceof DocumentTimeline)).length), 0);
  for (const name of ['--kh-header-height', '--kh-header-title-size', '--kh-header-title-y', '--kh-header-name-x', '--kh-header-f']) {
    assert.equal(await styleIn(page, '#h', name), await page.evaluate((name) => document.getElementById('h').style.getPropertyValue(name), name), name);
  }
  assert.equal(await styleIn(page, '#title', 'font-size'), '26px');
  assert.equal(await styleIn(page, '#title', 'translate'), 'none');
});
