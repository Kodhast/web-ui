# web-ui – projektets grundregler

> android-ui:s utseende för webbapparna (Husjakt, Veckans mat) som ren CSS och egna element: `src/tokens.css` (talen, genererad
> ur android-ui:s `tokens.json`), `src/kh.css` (klasserna `kh-*`) och `src/kh.js` (egna element för beteendet).
> Vad som finns och hur en app använder det: [README.md](README.md). Planen: Kodhast/android-ui#93.

**Svarslängd:** håll chattsvar minimala. Kod, commits och PR-beskrivningar skrivs normalt.

**Ärliga svar:** säg emot när Mats har fel, och säg varför. Inget beröm för frågan, inga
artighetsfraser, inga ursäkter, ingen utfyllnad. Säg vad som är osäkert eller inte kontrollerat.
Ett nej mjukas inte upp.

**Plan före kod bara för större ändringar:** nytt beteende, flera lager eller ett vägval → plan i ett
issue och Mats ok ("kör" eller `plan-godkänd`). Små fixar och dokument går direkt till PR med raden
`Liten ändring: <varför>`. Osäker → större. Skill `android:arbetsregler` är enda källan.

**Webbläsare och användare:** skill `android:webb` (bara Chrome, ingen hänsyn till skärmläsare).

**Repot är publikt.** Inga personuppgifter, ingen riktig data ur apparna och inga hemligheter i kod,
galleri, prov, commits eller issues. Galleriets data är påhittad.

## Reglerna

1. **Facit är android-ui.** Utseendet följer android-ui:s komponenter och Roborazzi-bilder
   (`ui-components/src/test/screenshots`), inte en mockup och inte en app. Ändras en komponent i android-ui
   följer webben efter; ett eget utseende här är en avvikelse som ska ha Mats ok.
2. **Talen kommer bara ur android-ui.** `tokens.json` är android-ui:s fil, kopierad oförändrad;
   `src/tokens.css` genereras (`npm run tokens`) och skrivs aldrig för hand. Inga egna mått i `kh.css` som
   finns bland talen – använd `var(--kh-…)`.
3. **Ingen färg i biblioteket.** `kh.css` har inga hex-, rgb- eller namngivna färger, bara temats variabler
   (prov i `test/`). Färger, typsnitt och textstorlekar är appens.
4. **Varje skillnad mellan apparna är en variabel med ett standardvärde** som bevarar dagens utseende
   (som android-ui:s parametrar). Det som hör till en apps domän stannar i appen.
5. **Varje del finns i galleriet** (`gallery/index.html`, speglar `ComponentGallery`) med skärmdump ljust och
   mörkt (`npm run skarmdumpar`, Roborazzi-bildens namn) och ett beteendeprov i `test/`. Skärmdumparna läggs
   bredvid Roborazzi-bilderna i PR:en (`npm run jamfor`) och jämförs med ögat; pixeljämförelse mellan Compose
   och en webbläsare går inte att lita på. Instabila prov är buggar – gör dem deterministiska.
6. **Inga beroenden, ingen shadow DOM, inget byggsteg för appen.** Biblioteket är filer som fungerar länkade
   rakt av (Husjakt) och via npm (Veckans mat). Utvecklingsberoenden (Playwright) bara för prov och bilder.
7. **Versionen höjs i varje PR som ändrar biblioteket** (`version` i `package.json`, raden i README:s
   versionshistorik): major = brytande (borttagen eller omdöpt klass eller variabel), minor = ny del eller
   variabel, patch = rättelse.
8. **CI-budget:** ett jobb (`ci.yml`), en PR kostar högst ett par Actions-minuter. Skärmdumparna tas lokalt
   och checkas in; de jämförs inte i CI.
9. **En PR i taget**, mot `main`. Mats mergar om inget annat sagts.

## Språk

Klassnamn och variabler på engelska (som android-ui:s kod), med prefixet `kh-`. Svenska i kommentarer,
dokument, galleri, commits, issues och PR:er.

## Kommandon

```bash
npm ci
npm run kontroll      # före varje push: tokens.css aktuell + beteendeproven
npm run tokens        # efter att tokens.json bytts
npm run skarmdumpar   # vid avsiktlig visuell ändring – checka in bilderna
npm run jamfor -- <android-ui>/ui-components/src/test/screenshots
```

## Arbetsflöde och modellval

Issue till PR följer skill `android:arbetsflode` (stommen); basgren `main`. Modellval: skill
`android:ai-model-choice` – Opus 5.5 som standard, Fable 5.2 bara med skäl och medium eller high effort.
