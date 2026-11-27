# web-ui

android-ui:s utseende för Kodhästs webbappar (Husjakt först, sedan Veckans mat): samma kort, rader,
knappar och de andra delarna som i Android-apparna, som ren CSS. Bara färger och typsnitt skiljer
mellan apparna; formerna och måtten är desamma överallt.

**Version:** 1.13.1 (tagg `v1.13.1`) ·
tal ur android-ui 3.2.2 · planen: [Kodhast/android-ui#93](https://github.com/Kodhast/android-ui/issues/93).

**Facit är android-ui:s komponenter och Roborazzi-bilder**, inte en mockup. Galleriet här speglar
android-ui:s `ComponentGallery`, och skärmdumparna i [`screenshots/`](screenshots) har samma namn som
Roborazzi-bilderna i `android-ui/ui-components/src/test/screenshots`.

## Lager

| Lager | Fil | Vad |
|---|---|---|
| 1. Tal | `src/tokens.css` | Hörn, avstånd, ikonstorlekar, spår, tryckskalning, sidhuvudets höjder och pluppens gröna (bibliotekets enda färg) – genererad ur `tokens.json`, som är android-ui:s fil (ett test där håller den sann mot temat). |
| 2. Utseende | `src/kh.css` | Klasserna `kh-*` nedan. Ingen shadow DOM: appen når allt. Ingen färg står i filen. |
| 3. Beteende | `src/kh.js` | Sidhuvudet som krymper, flikraden med huvudknappens meny, prickarna, dra-ned, segmentvalet, tidsväljarens rullhjul och stegaren som egna element utan shadow DOM. Ett skript utan beroenden och utan export. |
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

**Prov för en primär handling (D-3):** `src/prov.js` (`@kodhast/web-ui/prov.js`) är för appens Playwright-prov, inte för
appen: `await assertSinglePrimaryAction(page)` fäller provet om mer än en fylld knapp (`kh-btn--primary`,
`kh-btn--destructive`) eller flikradens huvudknapp syns samtidigt i samma fönster (sidan, en öppen dialog eller popover
räknas för sig), som `assertSinglePrimaryAction()` i android-ui:s `ui-testing`.

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
| `--kh-blur` (standard `1`; `0` = av) | `AppTheme(blur = AppBlur())` / `blur = null`: oskärpan bakom dialog och ark och under sidhuvudet |
| `--kh-card`, `--kh-row-tint` | `ExtendedColors.card`, `.rowTint` |
| `--kh-toolbar`, `--kh-on-toolbar` | `ExtendedColors.toolbar`, `.onToolbar` (flikraden) |
| `--kh-surface-container-high` (valfri, standard `--kh-card`) | dra-ned-prickarnas behållare |
| `--kh-font-body`, `--kh-font-heading` | appens typsnitt |
| `--kh-type-screen-title`, `-big-number`, `-headline`, `-section-title`, `-quantity`, `-item-title`, `-item-subtitle`, `-body`, `-body-medium`, `-pill`, `-caption`, `-button`, `-time-wheel` | `AppTypography` (`-time-wheel`: tidsväljarens tal i mitten, `AppTypography.timeWheelSelected`; grannarna 32/45 av det) (som `font`-förkortning; standard Material 3:s typskala) |
| `--kh-tracking-screen-title`, `--kh-tracking-caption` | stilarnas teckenavstånd |
| `--kh-depth-highlight`, `-sheen`, `-shadow`, `-card-edge`, `-card-shadow`, `-card-sheen` (valfri), `-header-shadow` (valfri, standard `-card-shadow`) | `AppDepth` – gäller inom klassen `kh-depth` |
| `--kh-card-padding`, `--kh-card-gap`, `--kh-card-border` | `AppCardStyle` (standard ReseApoteket och Dagboken) |
| `--kh-button-height` | `AppButtonStyle.minHeight` (56; Fonder 40) |
| `--kh-row-text-gap` | `LocalItemRowTextGap` (2; Dagboken 4) |
| `--kh-foldout-surface` (valfri, standard `--kh-row-tint`) | ytan under en utfälld `kh-foldout` (Husjakt: `--kh-surface-variant` i mörkt läge) |

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
| `<input type="checkbox" class="kh-check">` | `MorphingCheck` | 40 stort; ringen fjädrar till en fylld kaka med bock. Med `kh-depth` skugga, skimmer och nedtryckt krympning. |
| `<label class="kh-row kh-check-row">` med `kh-check` i `__leading` | `CheckRow` | Hela raden kryssar; ikryssad är den klar (överstruken) och tonad. `--plain` behåller raden (kryss = ta med). Egen öppna-yta: krysset med `aria-label` i en vanlig `kh-row`. |
| `<input type="checkbox" role="switch" class="kh-switch">` | `SwitchControl` | Material 3:s växel 52 × 32; `disabled` i de inaktiva färgerna. Med `kh-depth` sänkt spår och lyft knopp. |
| `<label class="kh-row kh-switch-row">` med `kh-switch` sist | `SwitchRow` | Hela raden växlar; `--inactive` tonar ned texten men inte växeln. |
| `kh-chevron` | pilen i `ItemRow(navigates)` och `NoticeBanner` | – |
| `kh-divider` | `AppDivider` | – |
| `kh-foldout` med `__header` (en `button.kh-row` med `aria-expanded`), `__chevron`, `__content` | `Foldout` | Utfälld (`aria-expanded="true"`) ligger rubrik och innehåll på `--kh-foldout-surface` med radens hörn, chevronen vänds; innehållet visas bara när det står (eller utan `hidden`). Appen växlar `aria-expanded`. |
| `kh-foldout__actions` sist i `__content`, med `kh-btn--destructive-text` sist | `Foldout(actions, delete)` | Radens knappar; Radera i felfärgen sist, som frågar i `kh-dialog` (android-ui #118). |
| `kh-btn` | `AppButton` | Standard tonad (`Secondary`, 2.0.0); `--primary` är den fyllda för vyns primära handling, högst en per vy (D-3). `--secondary` (samma som standard), `--outlined`, `--text`, `--destructive`, `--destructive-text` (Radera sist bland en rads knappar), `--compact`, `--block`, `disabled`, `aria-busy="true"` (arbetar: behåller färgen) |
| `kh-icon-btn` | `AppIconButton` | `--tonal` (platta i `secondary-container`), en tonklass (den tonade: platta och ikon; den vanliga: ikonen), `disabled`; 48 i tryckyta och form, ikonen 24, alltid `aria-label` |
| `kh-chips` + `kh-chip` med `__label`, `__value`, `__pending` | `AppFilterChip`, `ChipRow` | `aria-pressed`/`aria-checked` (bocken ritas av biblioteket), `--emphasized`, `--pending`, `disabled` |
| `kh-segmented` | `AppSegmentedChoice` | barnen med `aria-checked`/`aria-pressed`/`aria-selected` |
| `kh-pills` + `kh-pill` | `InfoPill` | en tonklass, klickbar som `button` (48 i tryckyta), `--square` |
| `kh-notice` med `__text`, `__title`, `__detail` | `NoticeBanner` | en tonklass, klickbar som `a`/`button` |
| `kh-field-group`, `kh-field` med `__input`, `__label`, `__suffix`, `kh-field__support` | `AppTextField` | `aria-invalid="true"`, `--error` på texten under, `disabled`, `textarea`; ikon sist som `svg` (`trailingIcon`), eller som `kh-icon-btn` med `aria-label` när den gör något (ikonen 12 från kanten) |
| `kh-dialog` med `__title`, `__text`, `__actions` | `ConfirmDialog` | `<dialog>` med `showModal()` |
| `kh-sheet` med `__title`, `__subtitle`, `__footer` | `AppBottomSheet` | `<dialog>` med `showModal()` |
| `kh-snackbar-host` + `kh-snackbar` med `__text`, `__action` | `AppSnackbarHost` | står ovanför `kh-toolbar--fixed` när sidan har en |
| `kh-empty` med `__message`, `__tile`, `__texts`, `__title`, `__text`, `__actions`, `__note` | `EmptyState` | `--error`, `--compact`, `--fullscreen` |
| `kh-avatar` med `__circle` | `AccountAvatar` | `--online` och `--offline` (inloggad: grön plupp i samma gröna i alla appar, `--kh-color-online-light`/`-dark` ur tokens.json, efter appens `color-scheme`, eller grå ihålig ring i `--kh-outline` utan anslutning; utloggad ingen av dem), klickbar som `button` |
| `kh-text-*`, `kh-icon`, `kh-icon--*`, `kh-app`, `kh-inactive` | `AppTypography`, `IconSize`, `INACTIVE_ALPHA` | – |
| `kh-menu` med `__item` (`<div popover>`) | `AppMenuPopup` | `__item--destructive`, ikon som `svg`. En knapp med `popovertarget` öppnar den förankrad under sig, linjerad med högerkanten (ovanför när det inte ryms); `kh.js` förankrar vid trycket, sätter `aria-expanded` och stänger menyn vid ett val. En app som själv anropar `togglePopover()` (t.ex. en knapp i en länk, med `preventDefault`) får samma förankring. |
| `kh-grid` | – (bara webben) | Kort i rutnät: en spalt under 600 (Material 3:s kompakta fönster), annars så många spalter om minst `--kh-grid-min` (300) som ryms |
| `kh-frame` | – (bara webben) | Appen i ett kort på bred skärm: på appens yttersta element under `<body>`. Från 840 (Material 3:s `expanded`) ett kort `--kh-frame-max` (600) brett, `--kh-frame-margin` (32) från fönstrets kanter, hörn `--kh-frame-radius` (16) och skugga `--kh-frame-shadow` mot `--kh-frame-backdrop` (temats bakgrund mot slöjans färg, 7 % ljust och 45 % mörkt). Kortet rullar själv, så sidhuvudet krymper med det, och håller `kh-toolbar--fixed`, meddelandena och appens fasta delar inom sig; dialoger, ark och menyer täcker fönstret som förut. Under 840 ingenting |
| `kh-page` | – (bara webben) | Innehållets marginal: `--kh-space-l`, eller mer när fönstret är bredare än `--kh-page-max` |
| `kh-period` | – (bara webben) | Periodväljare: `__prev` och `__next` (`kh-icon-btn` med pilar) och mellan dem `__label`, en knapp med kalenderikon och texten i en `<span>`, i radtonens spår. Texten avkortas på en rad. Appen äger datumet och vad etiketten öppnar |
| `kh-reorder` | – (bara webben) | Dra för att ändra ordning: listan (`<ul class="kh-reorder">` med `kh-row`), handtaget `kh-reorder__handle` (en `kh-icon-btn` med sex prickar, sist i raden), raden som dras `[data-dragging]` (en streckad plats i `--kh-outline-variant`), linjen där den hamnar `kh-reorder__indicator[data-drop-target]` och den lyfta raden `kh-reorder__preview`. Beteendet ägs av appen eller web-ui-react (React Aria), inte av `kh.js` |

Med `kh.js` (egna element, inga shadow DOM):

| Element | android-ui | Hur |
|---|---|---|
| `<kh-dots>` | `BrandDots` (`AppBrandStyle.dotLoading`, `headerDots`) | `bouncing` hoppar (stilla utan animeringar); `--kh-dots-size` är diametern, `color` färgen. I `kh-btn` med `aria-busy` (knappen som arbetar), i `kh-loading` (`AppLoading`) och före rubriken i sidhuvudet (synkar med `bouncing`). |
| `kh-topbar` med `__title` (`<kh-dots>` + `<span>`), `__actions` | `AppTopBar(size = Small)` | Underskärmens rad: 64 hög och fast överst; tillbakapilen är en `kh-icon-btn` (`--tonal` som standard i Android, vanlig för Fonder, valfri tonklass); utan pil börjar rubriken 16 in; rubriken avkortas på en rad; `bouncing` på prickarna medan något hämtas. Toppskärmar använder `<kh-header>`. |
| `<kh-header>` med `__icon`, `__name`, `__version` (valfri), `__trailing`, `__title` (`<kh-dots>` + `<span>`), `__subtitle` | `AppHeader` | Krymper från 144 till 64 med sidans (eller närmaste rullande förälders, eller `scroller="#id"`) rullning, fäller ut högst upp; `data-raised` när innehåll ligger under; `collapsedFraction` läses. Krymper också utan `kh.js` (se nedan). Kontot (`kh-avatar`) i `__trailing` får huvudets färg i ringen. |
| `<kh-toolbar>` med `__tabs`, `__tab` (`__label`, `__badge`), `__action` | `AppFloatingToolbar` | En flik som är `button` väljs (`aria-selected`) och meddelar `kh-select`; en länk följer appens `aria-current="page"`. `__action` med `popovertarget` öppnar en `kh-menu` ovanför sig. `--surface`, `--tonal`, `--filled` (`ToolbarStyle`), `--tertiary` (`ActionColor`), `--fixed` längst ned (innehållet behöver `--kh-toolbar-clearance`). |
| `<kh-refresh>` runt listan | `AppPullToRefresh` med prickar | Dragning högst upp: prickarna följer fingret, efter tröskeln meddelas `kh-refresh`; appen sätter `refreshing` medan den uppdaterar (inom 5 s). En uppdatering appen startat själv visar inga prickar här. |
| `<kh-swipe label="Radera">` runt en rad (`tone="hide"` för dölj/arkivera) | `SwipeToDelete`, `SwipeToHide` | Svep åt vänster med finger eller penna (inte mus, inte från kantzonen 24 px): raden följer fingret med `label` på felfärgen (`tone="hide"`: primärtonen) bakom; efter en tredjedel av bredden eller ett snabbt drag meddelas `kh-swipe` och raden glider tillbaka. Svep åt höger går till sidan; elementet har `data-own-swipe="left"` för sidans eget sidledssvep. Raden ska också ha Radera synligt. |
| `<kh-segmented>` | `AppSegmentedChoice` | Ett val i taget i barnens `aria-checked` (eller `aria-pressed`/`aria-selected`), med tryck och pilar; meddelar `kh-select` (`detail: { index, value }`). |
| `<kh-stepper value="2" min="0" max="999" step="1" label="doser per dag">` | `QuantityStepper` | − och + i radtonens spår; knappen vid gränsen stängs av, `disabled` stänger båda. Knapparnas namn ur `label` ("Minska doser per dag"). Meddelar `change`; `value` läses och sätts som tal, egenskapen `format` (`(v) => text`) visar värdet med enhet (`valueText`). Knapparna 44, `--kh-stepper-button: 48px` för full tryckyta. Etiketten bredvid (`showLabel`): `<div class="kh-stepper-field">` med `<span class="kh-stepper-field__label" aria-hidden="true">`. |
| `<kh-time-picker value="07:30" step="5">` i en `kh-dialog` | `TimePickerPopup` (rullhjul, android-ui #106) | Timme och minut som två hjul i segmentvalets spår (`--kh-row-tint`), 24 timmar, som går runt. Rullas med fingret, mushjulet, pilarna upp och ned eller ett tryck på talet ovanför eller under. `value` läses och sätts som `"HH:MM"` (också medan dialogen är stängd); `step` är minuthjulets steg (standard 1) och en tid mellan stegen avrundas till närmaste. `change` meddelas när hjulet stannat på en ny tid. Dialogens rubrik är `--kh-type-headline` som i övriga dialoger, med luft ner till hjulen; Avbryt och OK är `kh-btn--text`. |

**Sidhuvudet utan `kh.js`:** en sida som inte laddar `kh.js` får samma ihopfällning med ren CSS, så länge
`<kh-header>` är odefinierat (`kh-header:not(:defined)`; laddas `kh.js` gäller dess mått och inget av det här).
`--kh-header-f` går från 0 till 1 med en rullningsdriven animering (`animation-timeline: scroll(nearest block)`) över
de första 80 px rullning, och höjden, ikonen, rubrikens läge, stil och bredd, namnet och undertiteln räknas ur den
som i `kh.js`. Skillnader mot `kh.js`:

- Det som rullar är närmaste rullande förälder; attributet `scroller` och `collapsedFraction` finns inte.
- Kontots bredd mäts inte: `--kh-header-trailing-size` (standard `48px`, en `kh-avatar`) håller rubrik och namn
  undan det. Sätt den om `__trailing` har något annat.
- Prickarna behöver sina två `<i>` i koden: `<kh-dots><i></i><i></i></kh-dots>`.
- Upphöjt (kortens färg och skugga) slår om direkt när innehåll rullat under, utan `kh.js` 200 ms-övergång, och
  utan `data-raised`.
- Versionen förankras efter namnet (`anchor()`) och lämnas bort med `position-visibility`; gränsen kan skilja en px
  från `kh.js`, som avrundar namnets bredd.
- Rubrikens spärrning glider i `em` i stället för i px: under en tiondels px ifrån halvvägs.

Galleriets sida [`gallery/utan-kh-js.html`](gallery/utan-kh-js.html) visar det (`AppHeader_css_*`), och provet
jämför måtten med `kh.js` vid varje rullning (högst en halv px ifrån).

Skillnader mot Android som är kända:

- **Text:** Compose trimmar radavståndet över första och under sista raden; här görs det med `text-box`
  (Chrome 133 och senare).
- **Skuggor:** Compose-skuggorna är omräknade till `box-shadow` (oskärpa = radien × 1,15 + 1). Jämförda
  med ögat, inte pixel för pixel.
- **En knapp som arbetar** får prickarna när appen lägger `<kh-dots bouncing>` i den; biblioteket ritar dem inte själv.
- **Sidhuvudets rubrik** byter storlek genom att textstorlek, radhöjd och vikt glider mellan de två stilarna, som Compose `lerp`.
- **Bred skärm** finns bara här (android-ui har inga fönsterklasser, Mats ok 2026-11-20, Kodhast/Husjakt#457): appen
  sätter `--kh-page-max` (innehållets bredd, t.ex. `1200px`) på en förälder, och `kh-header`, `kh-topbar` och
  `kh-page` ställer innehållet i den spalten med bakgrunden kant i kant. Utan variabeln är allt som i telefonen.
  `kh-frame` lägger i stället hela appen i ett kort med skugga (Mats önskemål 2026-11-27, Kodhast/Tidrapporten#82).
- **Flikraden** har bara rullgardinsmenyn (`ActionMenuStyle.Popup`, standard); FAB-menyn finns inte än.
- **Skuggor utan djup** (flikraden, huvudknappen, menyn, dra-ned) är Material 3:s nivåer i `--kh-scrim`.
- **Tidsväljaren** står i `kh-dialog`:s luft (16 mellan rubrik, hjul och knappar); Material 3:s TimePickerDialog har
  hjulen tätt under rubriken och mer luft under knapparna. Hjulen, talen och spåret är desamma.
- **Oskärpan bakom dialog och ark** (`AppBlur`, android-ui #104) är `backdrop-filter` på `::backdrop`: 12 i radie (som
  standardavvikelse 7,4, Skias omräkning) och slöjan 20 % i stället för 32 %. Android stänger av den i energisparläget;
  här stängs den av med `prefers-reduced-transparency` eller `--kh-blur: 0`. Måtten står inte i `tokens.json`.
- **Oskärpan under sidhuvudet** (`underHeaderBlur`, android-ui #105, 3.11.1) är ett band under `kh-header` och `kh-topbar`
  med `backdrop-filter` (radie 8) och en mask som tonar till skarpt på 24. Android låter radien växa med
  `overlappedFraction`; här tonar bandet in (med ihopfällningen i `kh-header`, de första 24 px rullning under
  `kh-topbar`). I vila syns ingen oskärpa.
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
taggas `main` med `v<version>`: Actions → Tagga → Run workflow på `main` (`tagga.yml`, bara för hand).

**Nya tal i android-ui:** kopiera `tokens.json` från android-ui:s `main`, kör `npm run tokens` och
`npm run skarmdumpar`, och höj versionen.

## Versionshistorik

| Version | Ändring |
|---|---|
| 3.2.0 | Ramen `kh-frame` (#29, bara webben): på bred skärm (från 840) ligger appen i ett kort, 600 brett med hörn 16 och skugga mot en mörkare bakgrund; kortet rullar och håller det fasta inom sig. Variablerna `--kh-frame-max`, `--kh-frame-margin`, `--kh-frame-radius`, `--kh-frame-backdrop`, `--kh-frame-shadow`. Galleriet `ram.html`, skärmdump `Webb_ram` |
| 3.1.0 | `kh-avatar--offline`: inloggad utan anslutning en grå ihålig ring (`--kh-outline`) på pluppens plats (android-ui 5.1.0). Pluppen betyder inloggad och ansluten; utloggad sätter appen ingen av klasserna. Omtagen skärmdump `AccountAvatar_lagen` |
| 3.0.0 | **Brytande:** variabeln `--kh-online` är borttagen. Pluppen på `kh-avatar--online` är samma gröna i alla appar (android-ui 5.0.0, `OnlineColor`): `--kh-color-online-light` #1E8E3E och `--kh-color-online-dark` #6DD58C ur tokens.json, vald med `light-dark()` efter appens `color-scheme` (Mats 2026-11-27). Ingen app satte `--kh-online`. Omtagna skärmdumpar med avataren |
| 2.3.0 | Dra för att ändra ordning, `kh-reorder` (#23, bara webben): handtag, platsen som lämnas, linjen där raden hamnar och den lyfta raden; med djup djupets skugga. Skärmdumpar `Webb_dra_ordning` och `Webb_dra_ordning_djup` |
| 2.2.0 | Periodväljaren `kh-period` (#22, bara webben, ur Tidrapportens mockup): pilar och en etikett med kalenderikon i radtonens spår; med djup sänkt spår och lyft etikett. Skärmdumpar `Webb_periodvaljare` och `Webb_periodvaljare_djup` |
| 2.1.0 | Sidhuvudet utan `kh.js` (#24): ett odefinierat `<kh-header>` krymper från 144 till 64 med ren CSS – en rullningsdriven animering för `--kh-header-f` (nu registrerad med `@property`), rubrikens stil som animering mellan `screen-title` och `section-title`, undertiteln och versionen förankrade med `anchor()`, upphöjt efter ihopfällningen. Ny variabel `--kh-header-trailing-size` (standard `48px`) gäller bara utan `kh.js`. Med `kh.js` oförändrat. Nya skärmdumpar på galleriets sida `utan-kh-js.html`: `AppHeader_css_vila`, `AppHeader_css_halvvags`, `AppHeader_css_ihopfalld`, `AppHeader_css_synkar` |
| 2.0.0 | **Brytande**, som android-ui 4.0.0 (android-ui #128, skill `android:designregler` D-3): `kh-btn` utan variant är tonad i stället för fylld; den fyllda heter `kh-btn--primary`. **Appen måste** lägga till `kh-btn--primary` på den knapp som ska vara vyns primära – annars blir den tonad. `kh-btn--secondary` finns kvar. Nytt: `src/prov.js` (export `./prov.js`) med `assertSinglePrimaryAction(page)` och `countPrimaryActions()` för appens Playwright-prov. Galleriet sätter `--primary` där det visade en fylld knapp; inga skärmdumpar omtagna |
| 1.13.1 | Tidsväljaren som android-ui 3.12.0 (#123): talen 52 höga, `--kh-type-time-wheel` 500 45px/52px (var 400 57px/64px), grannarna 32/45 av talet och vikt 400, tabulära siffror; rubriken i `--kh-type-headline` som övriga dialoger med luft ner till hjulen. Omtagna: `TimePickerPopup_oppen`, `TimePickerPopup_djup` |
| 1.13.0 | Kryss, växel och stegare som i android-ui: `kh-check` (`MorphingCheck`, ringen fjädrar till en kaka med bock) och `kh-check-row` (`CheckRow`, klar och tonad när ikryssad, `--plain`), `kh-switch` och `kh-switch-row` (`SwitchControl`, `SwitchRow`, `--inactive`), `<kh-stepper>` och `kh-stepper-field` (`QuantityStepper`, `format`, `--kh-stepper-button`); alla med djup i `kh-depth`. Nya skärmdumpar: `CheckRow_varianter`, `SwitchRow_varianter`, `QuantityStepper_varianter`, `QuantityStepper_etikett`, `Webb_kryssrad_djup`, `Webb_reglage_djup`, `Webb_stegare_djup` |
| 1.12.0 | Progressiv oskärpa under sidhuvudet som i android-ui 3.11.1 (#105): innehållet som rullat in under `kh-header` och `kh-topbar` är suddigt vid kanten (radie 8) och skarpt 24 längre ned; tonar in med rullningen, `--kh-blur: 0` stänger av. `kh-header` klipper bara i sidled. Nya skärmdumpar: `EntityListScreen_rullad`, `Webb_topprad_rullad` |
| 1.11.0 | Oskärpa bakom dialog och ark som i android-ui 3.8.0 (#104): `kh-dialog` och `kh-sheet` suddar innehållet bakom (`AppBlur.behindRadius` 12) och slöjan blir 20 %. `--kh-blur: 0` stänger av. Nya skärmdumpar: `AppBottomSheet_oskarpa`, `ConfirmDialog_oskarpa` (hela fönstret, `data-helskarm`) |
| 1.10.0 | Samma radering av en rad som i android-ui 3.9.0 (#118): `<kh-swipe>` (svep åt vänster, `kh-swipe`-händelsen, `tone="hide"`), `kh-foldout__actions` och `kh-btn--destructive-text`. Nya skärmdumpar: `Foldout_radera`, `SwipeToDelete_svept` |
| 1.9.0 | Utfällbar rad `kh-foldout` (Husjakt #518, variant A): utfälld ligger hela delen på en tonad yta (`--kh-foldout-surface`, standard `--kh-row-tint`) med radens hörn, så att det syns vad som hör till raden. Tryckläget hovrar bara med mus (`@media (hover: hover)`): i Chrome på Android fastnade det grå lagret efter ett tryck. Ny skärmdump: `Foldout_oppen` |
| 1.8.0 | Tidsväljaren som rullhjul (android-ui #106: `TimePickerPopup` med `TimeScroll`): `<kh-time-picker>` med timme och minut i två hjul i segmentvalets nedsänkta spår, 100 × 120 med tal 56 höga i `--kh-type-time-wheel`; talet i mitten i `--kh-on-surface`, grannarna i `--kh-outline` (rullningsdriven animering). Hjulen går runt, `step` ger minuthjulets steg, `value` och `change`. Ikonknapp sist i textfältet: `kh-icon-btn` i `kh-field` (för kalendern som öppnar tidsväljaren). Nya skärmdumpar: `TimePickerPopup_oppen`, `TimePickerPopup_djup`, `Webb_textfalt_ikonknapp` |
| 1.7.0 | Segmentvalet animerar bytet (android-ui #100, 3.5.0): med `.kh-depth` är den valda pillen spårets `::before` och glider till nytt val med Expressives fjäder (`--kh-segment-glide`, `linear()`); texten byter färg och bocken växer fram i stället för att texten hoppar. Antal (2–4) och valt index läses med `:has()` ur barnens `aria-pressed/-checked/-selected`, så det fungerar också för en vanlig `.kh-segmented` som appen själv sätter valet i, utan kh.js; höger till vänster speglas. Pillen krymper när det valda segmentet trycks. Samma stillbild, inga omtagna skärmdumpar |
| 1.6.1 | Textfältets etikett på kanten står mitt på kantlinjen vilken radhöjd appen än ger `--kh-type-item-subtitle` (`translateY(-50%)` i stället för fasta −8 px), så att kanten bryts bakom texten som i AppTextField. Med Husjakts 16/22 gick linjen förut genom texten. Omtagna: `AppTextField_lagen` |
| 1.6.0 | Segmentvalet med mer djup (android-ui #97, 3.4.0): med `kh-depth` ligger `kh-segmented` i ett sänkt spår (`--kh-row-tint` och en svag inre skugga) och det valda segmentet lyfts som en egen pill med knapparnas skugga, skimmer och ljuskant; ovalda utan kontur i `--kh-on-surface-variant`. Samma höjd (40 px) och märkning. Utan `kh-depth` oförändrat. Omtagna: `Valda_djup` |
| 1.5.0 | Menyn vid valfri knapp: `kh-menu` förankras vid knappen som öppnar den med `popovertarget`, under knappen och linjerad med dess högerkant, ovanför när det inte ryms. Förut förankrades bara flikradens huvudknapps meny. Flikradens meny som förut. |
| 1.4.0 | Versionen i sidhuvudet (android-ui #95, `AppIdentity.version`): `.kh-header__version` efter `__name` – litet (`kh-type-caption`), dämpat, på namnets baslinje, tonar bort med namnet och lämnas bort helt när den inte ryms bredvid ett helt namn. `kh.js` placerar den. Utan elementet är allt som förut. |
| 1.3.0 | Bred skärm: `--kh-page-max` ställer `kh-header`, `kh-topbar` och nya `kh-page` i en spalt; nya kortrutnätet `kh-grid` (en spalt under 600, annars spalter om minst 300). Utan variabeln oförändrat. |
| 1.2.0 | Toppraden `kh-topbar` (`AppTopBar`, liten) för underskärmar: tillbakapil, prickar och rubrik, åtgärder till höger. |
| 1.1.1 | Meddelandet (`kh-snackbar-host`) står ovanför en fast flikrad (`kh-toolbar--fixed`), som i Android, i stället för under den. |
| 1.1.0 | Ikonknappen `kh-icon-btn` (`AppIconButton`): vanlig och `--tonal`, valfri ton, med djup lyft och tryck till 0,92. |
| 1.0.0 | Första stabila versionen (W4): samma delar som 0.2.0, och taggen `v1.0.0`. Från och med nu gäller semver fullt ut: en borttagen eller omdöpt klass, variabel, element, attribut eller händelse är major. |
| 0.2.0 | Beteendet (W3): `kh.js` med `<kh-dots>`, `<kh-header>`, `<kh-toolbar>`, `<kh-refresh>` och `<kh-segmented>`; menyn `kh-menu`, laddningen `kh-loading`, prickarna i en knapp som arbetar. Nya färger: `--kh-secondary`, `--kh-tertiary` (med `on-`), `--kh-toolbar`, `--kh-on-toolbar`. |
| 0.1.0 | Grunden (W2): `tokens.css` ur android-ui:s `tokens.json`, utseendelagret `kh.css` med kort, rad, knapp, chip, segmentval, pill, meddelanderad, fält, dialog, ark, meddelande, tomt läge, avdelare och avatar, galleriet, skärmdumpar och beteendeprov. |

## Licens

MIT. Galleriets typsnitt Roboto är under SIL Open Font License ([gallery/fonts/OFL.txt](gallery/fonts/OFL.txt)).
