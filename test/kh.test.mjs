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

before(async () => {
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 440, height: 900 } });
  await page.goto(`${gallery}?tema=ljust`);
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
    <button class="kh-btn" id="a">Spara</button>
    <button class="kh-btn kh-btn--compact" id="b">Spara</button>
    <button class="kh-btn" id="c" disabled>Spara</button>
    <button class="kh-btn" id="d" aria-busy="true">Sparar …</button>
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
  await mount('<button class="kh-btn" id="a">Spara</button><div class="kh-card" id="b">x</div>');
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
  assert.equal(await style('#b .kh-field__label', 'color'), await themeColor('--kh-error'));
  await page.focus('#a input');
  await settle();
  assert.match(await style('#a', 'box-shadow'), /0px 0px 0px 4px/, 'fokusringen utanför kanten');
  await page.focus('#b input');
  await settle();
  assert.doesNotMatch(await style('#b', 'box-shadow'), /4px/, 'ingen fokusring i felläget');
});

test('dialog: öppnas modalt med nedtonad bakgrund, kortets hörn och kortfärg', async () => {
  await mount('<dialog class="kh-dialog" id="a"><h2 class="kh-dialog__title">Räkna om?</h2><div class="kh-dialog__actions"><button class="kh-btn">Ok</button></div></dialog>');
  await page.evaluate(() => document.getElementById('a').showModal());
  assert.equal(await style('#a', 'display'), 'flex');
  assert.equal(await style('#a', 'border-radius'), `${tokens.radius.card}px`);
  assert.equal(await style('#a', 'background-color'), await themeColor('--kh-card'));
  assert.notEqual(await style('#a', 'background-color', '::backdrop'), 'rgba(0, 0, 0, 0)');
  await page.evaluate(() => document.getElementById('a').close());
  assert.equal(await style('#a', 'display'), 'none');
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

test('sidhuvud utan djup: en hårfin linje i stället för skuggan', async () => {
  await mount(HEADER);
  await scrollTo('#r', 200);
  await page.waitForTimeout(250);
  assert.match(await style('#h', 'box-shadow'), /0px -1px 0px 0px inset/);
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
