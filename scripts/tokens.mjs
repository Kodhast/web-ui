#!/usr/bin/env node
// Skriver src/tokens.css ur tokens.json (android-ui:s mått, en källa för talen).
// `--check` skriver inget utan fäller när src/tokens.css inte stämmer med tokens.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'tokens.json');
const target = join(root, 'src', 'tokens.css');

// Gruppnamnen i tokens.json → prefix i CSS. En okänd grupp fäller hellre än att tyst försvinna.
const PREFIX = {
  spacing: 'space',
  iconSize: 'icon',
  radius: 'radius',
  track: 'track',
  depth: 'depth',
  header: 'header'
};

const kebab = (name) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** Ett värde i dp (= CSS-px), "full" (helt rundad), en lista med hörn eller ett rent tal (skala). */
export function cssValue(group, value) {
  if (value === 'full') return '9999px';
  if (Array.isArray(value)) return value.map((v) => cssValue(group, v)).join(' ');
  if (typeof value !== 'number') throw new Error(`Okänt värde i ${group}: ${JSON.stringify(value)}`);
  // Skalor (pressedScale) saknar enhet; allt annat är dp.
  if (group === 'depth') return String(value);
  return `${value}px`;
}

export function generate(tokens) {
  const lines = [];
  for (const [group, entries] of Object.entries(tokens)) {
    const prefix = PREFIX[group];
    if (!prefix) throw new Error(`Okänd grupp i tokens.json: ${group}`);
    for (const [name, value] of Object.entries(entries)) {
      lines.push(`  --kh-${prefix}-${kebab(name)}: ${cssValue(group, value)};`);
    }
  }
  return [
    '/* Genererad av scripts/tokens.mjs ur tokens.json (android-ui). Ändra inte för hand. */',
    ':root {',
    ...lines,
    '}',
    ''
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const css = generate(JSON.parse(readFileSync(source, 'utf8')));
  if (process.argv.includes('--check')) {
    let current = '';
    try {
      current = readFileSync(target, 'utf8');
    } catch {}
    if (current !== css) {
      console.error('src/tokens.css stämmer inte med tokens.json. Kör: npm run tokens');
      process.exit(1);
    }
    console.log('src/tokens.css är aktuell.');
  } else {
    writeFileSync(target, css);
    console.log('Skrev src/tokens.css.');
  }
}
