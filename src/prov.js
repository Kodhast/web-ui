// D-3 i skill android:designregler: högst en primär handling synlig per vy – samma prov som
// assertSinglePrimaryAction i android-ui:s ui-testing. Används i apparnas Playwright-prov:
//
//   import { assertSinglePrimaryAction } from '@kodhast/web-ui/prov.js';
//   await assertSinglePrimaryAction(page);
//
// Primär = fylld knapp (kh-btn--primary, kh-btn--destructive) eller huvudknappen i flikraden
// (kh-toolbar__action, FAB:en). En öppen dialog, ett ark eller en meny (popover) är ett eget fönster och
// räknas för sig; sidan bakom räknas inte ihop med det.

/** Väljaren för det som räknas som vyns primära handling. */
export const PRIMARY_ACTION = '.kh-btn--primary, .kh-btn--destructive, .kh-toolbar__action';

/**
 * Räknar i webbläsaren: en post per fönster (sidan, och varje öppen dialog eller popover) med texterna på de
 * synliga primära knapparna. Ren DOM, så den kan också köras direkt i en sida.
 */
export function countPrimaryActions(root = document, selector = PRIMARY_ACTION) {
  const isWindow = (el) => (el.matches('dialog') && el.open) || (el.matches('[popover]') && el.matches(':popover-open'));
  const windows = [...root.querySelectorAll('dialog, [popover]')].filter(isWindow);
  const shown = (el) => el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) && el.getBoundingClientRect().width > 0;
  const label = (el) => (el.getAttribute('aria-label') || el.textContent || '?').trim().replace(/\s+/g, ' ');
  const owner = (el) => el.parentElement?.closest('dialog, [popover]') ?? null;
  const all = [...root.querySelectorAll(selector)].filter(shown);
  return [null, ...windows].map((win) => ({
    window: win ? win.id || win.className || win.tagName.toLowerCase() : 'sidan',
    actions: all.filter((el) => owner(el) === win).map(label),
  }));
}

/** Playwright: kör [countPrimaryActions] i sidan och fäller provet om något fönster har mer än en. */
export async function assertSinglePrimaryAction(page) {
  const counted = await page.evaluate(`(${countPrimaryActions.toString()})(document, ${JSON.stringify(PRIMARY_ACTION)})`);
  const failing = counted.filter((w) => w.actions.length > 1);
  if (failing.length) {
    const lines = failing.map((w) => `${w.window}: ${w.actions.length} (${w.actions.join(', ')})`);
    throw new Error(`D-3: mer än en primär handling syns samtidigt (högst en per vy) – ${lines.join('; ')}`);
  }
}
