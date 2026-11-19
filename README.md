# web-ui

android-ui:s utseende för Kodhästs webbappar (Husjakt först, sedan Veckans mat): samma kort, rader,
knappar och de andra delarna som i Android-apparna, som ren CSS. Bara färger och typsnitt skiljer
mellan apparna; formerna och måtten är desamma överallt.

**Version:** 1.0.0 (tagg `v1.0.0`) ·
tal ur android-ui 3.2.2 · planen: [Kodhast/android-ui#93](https://github.com/Kodhast/android-ui/issues/93).

**Facit är android-ui:s komponenter och Roborazzi-bilder**, inte en mockup. Galleriet här speglar
android-ui:s `ComponentGallery`, och skärmdumparna i [`screenshots/`](screenshots) har samma namn som
Roborazzi-bilderna i `android-ui/ui-components/src/test/screenshots`.

## Lager

| Lager | Fil | Vad |
|---|---|---|
| 1. Tal | `src/tokens.css` | Hörn, avstånd, ikonstorlekar, spår, tryckskalning, sidhuvudets höjder – genererad ur `tokens.json`, som är android-ui:s fil (ett test där håller den sann mot temat). |
| 2. Utseende | `src/kh.css` | Klasserna `kh-*` nedan. Ingen shadow DOM: appen når allt. Ingen färg står i filen. |
| 3. Beteende | `src/kh.js` | Sidhuvudet som krymper, flikraden med huvudknappens meny, prickarna, dra-ned och segmentvalet som egna element utan shadow DOM. Ett skript utan beroenden och utan export. |
| 4. Appen | appens egen CSS | Färgerna, typsnitten, textstorlekarna och djupets färger – motsvarar `AppTheme`. |

Inga beroenden och inget byggsteg: två CSS-filer och ett skript.

**Webbläsare:** Chrome på dator och Chrome på Android. Andra webbläsare provas inte.

## Använda

**Utan byggsteg (Husjakt):** lägg en låst kopia av `src/tokens.css`, `src/kh.css` och `src/kh.js` från en tagg i appen
(t.ex. `public/vendor/web-ui/`) och länka stilfilerna före appens egen:

```html
<link rel="stylesheet" href="/vendor/web-ui/tokens.css">
<link rel="stylesheet" href="/vendor/web-ui/kh.css">
<link rel="stylesheet" href="/app/tema.css"> <!-- appens färger och typsnitt -->
<script src="/vendor/web-ui/kh.js" defer></script> <!-- defer: elementen behöver sina barn -->
```

**Via npm (Veckans mat):** `npm install github:Kodhast/web-ui#v<version>` och sedan
`import '@kodhast/web-ui/tokens.css'; import '@kodhast/web-ui/kh.css'; import '@kodhast/web-ui/kh.js';`.
Paketet publiceras inte till ett register; taggen `v<version>` är versionen.

## Appen sätter

Sätt variablerna på `:root` (textstilarnas standardvärden räknas ut där). Färgerna har inga
standardvärden – en app som saknar en färg ser det direkt. Galleriets testtema
[`gallery/theme-test.css`](gallery/theme-test.css) är ett fullständigt exempel, ljust och mörkt.

| Variabel | Motsvarar i android-ui |
|---|---|
| `--kh-primary`, `--kh-on-primary`, `--kh-primary-container`, `--kh-on-primary-container` | `colorScheme.primary` … |
| `--kh-secondary`, `--kh-on-secondary`, `--kh-tertiary`, `--kh-on-tertiary` | huvudknappen i flikraden (`ActionColor`), märket på en flik |
| `--kh-secondary-container`, `--kh-on-secondary-container` | den tonade knappen |
| `--kh-background`, `--kh-on-background`, `--kh-on-surface`, `--kh-surface-variant`, `--kh-on-surface-variant` | sidan, text, dämpad text |
| `--kh-outline`, `--kh-outline-variant` | linjer och kanter |
| `--kh-error`, `--kh-on-error`, `--kh-error-container`, `--kh-on-error-container` | fel och radering |
| `--kh-inverse-surface`, `--kh-inverse-on-surface`, `--kh-inverse-primary` | meddelandet |
| `--kh-scrim` | bakom dialog och ark |
| `--kh-card`, `--kh-row-tint`, `--kh-online` (standard primary) | `ExtendedColors.card`, `.rowTint`, `.online` |
| `--kh-toolbar`, `--kh-on-toolbar` | `ExtendedColors.toolbar`, `.onToolbar` (flikraden) |
| `--kh-surface-container-high` (valfri, standard `--kh-card`) | dra-ned-prickarnas behållare |
| `--kh-font-body`, `--kh-font-heading` | appens typsnitt |
| `--kh-type-screen-title`, `-big-number`, `-headline`, `-section-title`, `-quantity`, `-item-title`, `-item-subtitle`, `-body`, `-body-medium`, `-pill`, `-caption`, `-button` | `AppTypography` (som `font`-förkortning; standard Material 3:s typskala) |
| `--kh-tracking-screen-title`, `--kh-tracking-caption` | stilarnas teckenavstånd |
| `--kh-depth-highlight`, `-sheen`, `-shadow`, `-card-edge`, `-card-shadow`, `-card-sheen` (valfri), `-header-shadow` (valfri, standard `-card-shadow`) | `AppDepth` – gäller inom klassen `kh-depth` |
| `--kh-card-padding`, `--kh-card-gap`, `--kh-card-border` | `AppCardStyle` (standard ReseApoteket och Dagboken) |
| `--kh-button-height` | `AppButtonStyle.minHeight` (56; Fonder 40) |
| `--kh-row-text-gap` | `LocalItemRowTextGap` (2; Dagboken 4) |

**Toner** (`Tone`): appen skriver en klass per ton som sätter `--kh-tone-container` och
`--kh-tone-content`, t.ex. `.ton-gron { --kh-tone-container: …; --kh-tone-content: …; }`, och sätter den
på elementet (`kh-pill`, `kh-notice`, `kh-card--tone`). Tonen ärvs inte: en pill i ett grönt kort är
primärtonad tills den själv får en ton, som i Android.

**Djup:** klassen `kh-depth` på ett yttre element (oftast `body`) ger ljuskant, skimmer och tonad skugga
på knappar och valda chip och segment, skugga och hårfin kant på kort, och att det man trycker på krymper
till `--kh-depth-pressed-scale`. Utan `kh-depth` är allt platt, som `AppTheme(depth = null)`.

## Delarna

Varje del finns i galleriet med skärmdump ljust och mörkt och ett beteendeprov i `test/`.

| Klass | android-ui | Lägen |
|---|---|---|
| `kh-card` | `AppCard` | `--tone` (+ en tonklass), klickbar som `a`/`button` eller `--clickable` |
| `kh-row` med `__leading`, `__text`, `__title`, `__subtitle`, `__trailing`, `__highlight` | `ItemRow` | `--tinted`, `--done`, `--inactive`, `--accent` (`style="--kh-accent: …"`), klickbar som `a`/`button` eller `--clickable` |
| `kh-chevron` | pilen i `ItemRow(navigates)` och `NoticeBanner` | – |
| `kh-divider` | `AppDivider` | – |
| `kh-btn` | `AppButton` | `--secondary`, `--outlined`, `--text`, `--destructive`, `--compact`, `--block`, `disabled`, `aria-busy="true"` (arbetar: behåller färgen) |
| `kh-chips` + `kh-chip` med `__label`, `__value`, `__pending` | `AppFilterChip`, `ChipRow` | `aria-pressed`/`aria-checked` (bocken ritas av biblioteket), `--emphasized`, `--pending`, `disabled` |
| `kh-segmented` | `AppSegmentedChoice` | barnen med `aria-checked`/`aria-pressed`/`aria-selected` |
| `kh-pills` + `kh-pill` | `InfoPill` | en tonklass, klickbar som `button` (48 i tryckyta), `--square` |
| `kh-notice` med `__text`, `__title`, `__detail` | `NoticeBanner` | en tonklass, klickbar som `a`/`button` |
| `kh-field-group`, `kh-field` med `__input`, `__label`, `__suffix`, `kh-field__support` | `AppTextField` | `aria-invalid="true"`, `--error` på texten under, `disabled`, `textarea` |
| `kh-dialog` med `__title`, `__text`, `__actions` | `ConfirmDialog` | `<dialog>` med `showModal()` |
| `kh-sheet` med `__title`, `__subtitle`, `__footer` | `AppBottomSheet` | `<dialog>` med `showModal()` |
| `kh-snackbar-host` + `kh-snackbar` med `__text`, `__action` | `AppSnackbarHost` | – |
| `kh-empty` med `__message`, `__tile`, `__texts`, `__title`, `__text`, `__actions`, `__note` | `EmptyState` | `--error`, `--compact`, `--fullscreen` |
| `kh-avatar` med `__circle` | `AccountAvatar` | `--online`, klickbar som `button` |
| `kh-text-*`, `kh-icon`, `kh-icon--*`, `kh-app`, `kh-inactive` | `AppTypography`, `IconSize`, `INACTIVE_ALPHA` | – |
| `kh-menu` med `__item` (`<div popover>`) | `AppMenuPopup` | `__item--destructive`, ikon som `svg` |

Med `kh.js` (egna element, inga shadow DOM):

| Element | android-ui | Hur |
|---|---|---|
| `<kh-dots>` | `BrandDots` (`AppBrandStyle.dotLoading`, `headerDots`) | `bouncing` hoppar (stilla utan animeringar); `--kh-dots-size` är diametern, `color` färgen. I `kh-btn` med `aria-busy` (knappen som arbetar), i `kh-loading` (`AppLoading`) och före rubriken i sidhuvudet (synkar med `bouncing`). |
| `<kh-header>` med `__icon`, `__name`, `__trailing`, `__title` (`<kh-dots>` + `<span>`), `__subtitle` | `AppHeader` | Krymper från 144 till 64 med sidans (eller närmaste rullande förälders, eller `scroller="#id"`) rullning, fäller ut högst upp; `data-raised` när innehåll ligger under; `collapsedFraction` läses. Kontot (`kh-avatar`) i `__trailing` får huvudets färg i ringen. |
| `<kh-toolbar>` med `__tabs`, `__tab` (`__label`, `__badge`), `__action` | `AppFloatingToolbar` | En flik som är `button` väljs (`aria-selected`) och meddelar `kh-select`; en länk följer appens `aria-current="page"`. `__action` med `popovertarget` öppnar en `kh-menu` ovanför sig. `--surface`, `--tonal`, `--filled` (`ToolbarStyle`), `--tertiary` (`ActionColor`), `--fixed` längst ned (innehållet behöver `--kh-toolbar-clearance`). |
| `<kh-refresh>` runt listan | `AppPullToRefresh` med prickar | Dragning högst upp: prickarna följer fingret, efter tröskeln meddelas `kh-refresh`; appen sätter `refreshing` medan den uppdaterar (inom 5 s). En uppdatering appen startat själv visar inga prickar här. |
| `<kh-segmented>` | `AppSegmentedChoice` | Ett val i taget i barnens `aria-checked` (eller `aria-pressed`/`aria-selected`), med tryck och pilar; meddelar `kh-select` (`detail: { index, value }`). |

Skillnader mot Android som är kända:

- **Text:** Compose trimmar radavståndet över första och under sista raden; här görs det med `text-box`
  (Chrome 133 och senare).
- **Skuggor:** Compose-skuggorna är omräknade till `box-shadow` (oskärpa = radien × 1,15 + 1). Jämförda
  med ögat, inte pixel för pixel.
- **En knapp som arbetar** får prickarna när appen lägger `<kh-dots bouncing>` i den; biblioteket ritar dem inte själv.
- **Sidhuvudets rubrik** byter storlek genom att textstorlek, radhöjd och vikt glider mellan de två stilarna, som Compose `lerp`.
- **Flikraden** har bara rullgardinsmenyn (`ActionMenuStyle.Popup`, standard); FAB-menyn finns inte än.
- **Skuggor utan djup** (flikraden, huvudknappen, menyn, dra-ned) är Material 3:s nivåer i `--kh-scrim`.
- **En klickbar pill** får sin tryckyta på 48 utan att ta plats i layouten (Android tar platsen).

## Utveckla

```bash
npm ci
npm run kontroll          # tokens.css aktuell mot tokens.json + beteendeproven (Chromium)
npm run tokens            # skriv src/tokens.css efter att tokens.json bytts
npm run skarmdumpar       # screenshots/<Roborazzi-namn>_light|dark.png ur galleriet
npm run jamfor -- ../android-ui/ui-components/src/test/screenshots   # Android bredvid webben, i jamforelse/
```

Galleriet: öppna `gallery/index.html` i en webbläsare (`?tema=ljust` eller `?tema=mork`).

**En ny version:** höj `version` i `package.json` och lägg en rad i versionshistoriken i PR:en; efter sammanslagningen
taggas sammanslagningscommiten på `main` med `v<version>`.

**Nya tal i android-ui:** kopiera `tokens.json` från android-ui:s `main`, kör `npm run tokens` och
`npm run skarmdumpar`, och höj versionen.

## Versionshistorik

| Version | Ändring |
|---|---|
| 1.0.0 | Första stabila versionen (W4): samma delar som 0.2.0, och taggen `v1.0.0`. Från och med nu gäller semver fullt ut: en borttagen eller omdöpt klass, variabel, element, attribut eller händelse är major. |
| 0.2.0 | Beteendet (W3): `kh.js` med `<kh-dots>`, `<kh-header>`, `<kh-toolbar>`, `<kh-refresh>` och `<kh-segmented>`; menyn `kh-menu`, laddningen `kh-loading`, prickarna i en knapp som arbetar. Nya färger: `--kh-secondary`, `--kh-tertiary` (med `on-`), `--kh-toolbar`, `--kh-on-toolbar`. |
| 0.1.0 | Grunden (W2): `tokens.css` ur android-ui:s `tokens.json`, utseendelagret `kh.css` med kort, rad, knapp, chip, segmentval, pill, meddelanderad, fält, dialog, ark, meddelande, tomt läge, avdelare och avatar, galleriet, skärmdumpar och beteendeprov. |

## Licens

MIT. Galleriets typsnitt Roboto är under SIL Open Font License ([gallery/fonts/OFL.txt](gallery/fonts/OFL.txt)).
