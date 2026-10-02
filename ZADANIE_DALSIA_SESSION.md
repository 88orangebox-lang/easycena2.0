# EasyCena — zadanie pre ďalšiu session

> Tento dokument je **kompletný podklad**. Nová session nepotrebuje nič z predchádzajúcej histórie.
> Stav k: 2. 10. 2026 · posledný commit pri odovzdaní: `33bdc46`

---

## 1. Čo je EasyCena

PWA na tvorbu **cenových ponúk a súpisov prác** pre remeselníkov (klimatizácie, montáže).

| | |
|---|---|
| **Stack** | čisté vanilla JS + HTML, žiadny framework, žiadny build krok, **žiadny backend** |
| **Dáta** | výhradne `localStorage` v prehliadači používateľa |
| **Súbory** | `app.js` (~4460 r.), `index.html` (~1570 r.), `service-worker.js`, fonty `Roboto-*.js`, `logo-firmy.js` |
| **Nasadenie** | GitHub Pages → <https://88orangebox-lang.github.io/easycena2.0/> |
| **Repozitár** | `github.com/88orangebox-lang/easycena2.0` (vetva `main`) |
| **Jazyk** | všetko po slovensky — kód, komentáre, UI, commit správy |
| **Externé závislosti** | jsPDF z cdnjs (so SRI podpisom), Google Identity Services (prihlásenie do Drive) |

**Appka je v ostrej prevádzke.** Používa ju majiteľ aj jeho kamarát (projektant klimatizácií), ktorý na nej robí reálne ponuky pre klientov. Chyby majú reálny dopad → opatrnosť pred rýchlosťou.

### Hlavné funkcie
- **Katalóg** položiek a balíčkov (vlastný cenník), CSV import s mapovaním stĺpcov
- **Cenová ponuka** — položky, zľavy, DPH, PDF výstup s logom a podpisom
- **Súpis prác** — režim odvodený z ponuky (uzamknuté pôvodné ceny, voliteľný nadpis, voliteľná podpisová časť)
- **Archív** ponúk, duplikovanie (s voľbou ponechať/aktualizovať ceny)
- **Záloha**: lokálny JSON export/import + **Google Drive** s 3-way merge a auto-synchronizáciou

---

## 2. Spôsob práce (dodržuj)

1. **Komunikuj po slovensky**, vecne a laicky — majiteľ nie je programátor.
2. **Nekóduj bez schválenia.** Najprv analýza → návrh → otázky s odporúčaniami → až po „súhlasím" kódenie.
3. **Samostatné commity po logických celkoch**, po každom počkaj na otestovanie.
4. Pred commitom vždy `node --check app.js` (a `service-worker.js`, ak sa mení).
5. **Nasadenie:** `git push origin <aktuálna-vetva>:main` → GitHub Pages do 1–2 min.
6. Po každom commite napíš **konkrétny test plán** (čo kde kliknúť, čo má byť vidieť).
7. Upozorni, že po nasadení treba **hard refresh (Ctrl+Shift+R)** / na PWA zatvoriť a otvoriť — service worker drží cache.
8. **Spätná kompatibilita je povinná** — v ostrej prevádzke sú staré ponuky, staré zálohy aj staré položky bez novších polí. Nové polia vždy s rozumným defaultom.

---

## 3. ÚLOHY PRE TÚTO SESSION

### Úloha A — Komplexná kontrola aplikácie
Prejdi **celý** `app.js`, `index.html`, `service-worker.js` a posúď:
- **správnosť a robustnosť** (chyby, hraničné prípady, tiché zlyhania, chýbajúce ošetrenia)
- **bezpečnosť** (v minulosti už prebehol audit — XSS escaping, CSP meta, SRI na jsPDF; over, či je to naozaj kompletné a či nepribudli nové diery)
- **dátovú integritu** (čo všetko sa zálohuje a čo nie, čo sa môže stratiť, čo sa môže ticho prepísať)
- **výkon a údržbateľnosť** (app.js má 4460 riadkov v jednom súbore — posúď, či to už nie je problém a či sa oplatí rozdeliť)

Výstup: zoznam nálezov zoradený podľa závažnosti, s číslami riadkov, a odporúčanie čo riešiť teraz a čo neskôr.

---

### Úloha B — Over (alebo vyvráť) pripravený návrh „Prenos katalógu"
Nižšie v sekcii **5** je hotový návrh po adversariálnej analýze. **Nepreberaj ho slepo** — over tvrdenia v kóde a buď ho potvrď, oprav, alebo navrhni lepšie riešenie. Ak nájdeš jednoduchšiu cestu s rovnakým výsledkom, povedz to.

---

### Úloha C — Google prihlásenie: dá sa zostať prihlásený natrvalo?
**Požiadavka majiteľa:** aby sa používateľ nemusel opakovane prihlasovať do Google Drive, ale aby appka zostala prihlásená, kým sa sám neodhlási.

Detailný kontext a doterajšie pokusy sú v sekcii **6**. Úlohou je **preskúmať všetky reálne cesty** a dať odporúčanie vrátane ceny/zložitosti.

---

### Úloha D — Dve schválené opravy chýb
Majiteľ ich už schválil, detaily v sekcii **5.4**. Sú nezávislé od zvyšku a dajú sa spraviť ako prvé.

---

## 4. Dátový model (overené v kóde)

### `localStorage` kľúče
| Kľúč | Obsah | V zálohe? |
|---|---|---|
| `easycena_katalog` | pole položiek a balíčkov | ✅ |
| `easycena_archiv` | pole uložených ponúk | ✅ |
| `easycena_profil` | firemné údaje, predvoľby | ✅ |
| `easycena_logo` | logo firmy (base64) | ✅ |
| `easycena_podpis` | podpis/pečiatka (base64) | ✅ |
| `easycena_nastavenia` | — | ✅ |
| `easycena_pocitadlo` | **mŕtvy kľúč, nepoužíva sa** | ✅ (zbytočne) |
| **`pocitadloPonuk`** | **reálne počítadlo čísel ponúk** | ❌ **CHYBA** |
| **`easycena_znacky`** | **logá výrobcov (base64)** | ❌ **CHYBA** |
| `easycena_rozpracovana` | rozpracovaná ponuka | ❌ (zámerne) |
| `easycena_meta` | `{modifiedAt:{katalog,archiv,profil}}` — sync | ❌ (ide ako `_meta`) |
| `easycena_last_sync_ms` | referenčný bod pre detekciu konfliktu | ❌ (lokálne) |
| `easycena_drive_token` / `_email` / `_folder_id` / `_last_backup` | Drive stav | ❌ (lokálne) |
| `easycena_device_label` | názov zariadenia | ❌ (ide ako `_meta.deviceLabel`) |
| `easycena_katalog_view` / `easycena_archiv_view` | stav filtrov | ❌ (lokálne) |
| `theme` | svetlý/tmavý režim | ❌ (lokálne) |

### Tvar položky katalógu
```js
// Položka
{ typ:'polozka', kategoria:'material'|'zariadenie'|'praca', nazov, mj, cena, dph,
  popis?,            // technický popis do PDF (len zariadenia)
  vyzadujeKontrolu?  // true = chýba cena/DPH (z CSV importu); SKRYTÁ z našepkávača
}
// Balíček — SEBESTAČNÝ, žiadne ID referencie na položky
{ typ:'balik', nazov, polozky:[ { kategoria, nazov, mnozstvo, mj, cena } ] }  // pozor: bez dph
```

### Kľúčové funkcie
| Funkcia | Riadok | Čo robí |
|---|---|---|
| `vytvorDataZalohy()` | ~2879 | zostaví JSON zálohu + `_meta` |
| `_aplikujZalohu(data)` | ~2945 | zapíše zálohu do localStorage — **podmienené po kľúčoch** (`if (data.katalog)…`) |
| `obnovitZalohu(event)` | ~2973 | číta súbor → confirm → `_aplikujZalohu` → `location.reload()` |
| `oznacZmeneny(typ)` | ~3696 | zapíše `modifiedAt` + naplánuje auto-push do Drive |
| `_naplanujAutoPush()` / `_spustiAutoPush()` | ~4141 / ~4153 | debounce 10 min, max-wait 1 h |
| `_skusPullOnOpen()` | ~4037 | pri štarte stiahne novšiu cloud verziu |
| `_porovnajMeta()` | ~4005 | detekcia konfliktu voči `lastSync` (**globálne max, nie per-typ**) |
| `_zlucData()` / `_zlucKatalog()` / `_zlucArchiv()` | ~4290+ | 3-way merge |
| `_idKatalogPolozky(p)` | ~4386 | kľúč na párovanie: `polozka\|kategoria\|nazov\|mj` alebo `balik\|nazov` |
| `vygenerujPDF(akcia)` | ~2241 | generovanie PDF |
| CSV import | ~3025–3140 | mapovanie stĺpcov, kódovanie windows-1250 |

---

## 5. Pripravený návrh: „Prenos katalógu do inej EasyCeny"

### 5.1 Prečo
Kamarát (projektant) si v súkromnej EasyCene pracne vytvoril katalóg. Firma kupuje EasyCenu pre viacerých projektantov a on potrebuje **preniesť katalóg do firemnej inštalácie** — a potom aj priebežne **oboma smermi**, keď niečo doplní.

**Rozhodnuté:** každý projektant má **vlastný Google účet** (vlastné zálohy). Zdieľaný firemný účet bol zamietnutý — synchronizácia prenáša celú zálohu, takže by si projektanti navzájom prepisovali **podpisy** (profil+logo+podpis cestujú spolu, `_zlucData` ~4312) a miešali archívy ponúk. Firemný cenník sa preto bude šíriť **súborom**, nie cloudom.

### 5.2 Čo sa má postaviť
**Karta „🔄 Preniesť katalóg do inej EasyCeny"** v záložke Katalóg (zbalená, pri CSV importe — horná časť Katalógu je už preplnená). Slovo *záloha* ostáva vyhradené Nastaveniam.

- **📤 Odoslať môj katalóg** → JSON súbor **iba s katalógom** + hlavička `{typSuboru:'easycena-katalog', verzia:1, exportovane, zariadenie}`. Bez `_meta`, bez profilu, bez počítadla. Doručenie ako `inteligentnaZaloha()` (share/download), ale **s toastom** a datovaným názvom `easycena_katalog_2026-10-02_20-42.json`.
- **📥 Načítať katalóg zo súboru** → validácia → **náhľad v modáli** → voľba režimu → zápis.

**Tri režimy importu:**
1. **Pridať len nové položky** *(predvolené)* — existujúcich sa nedotkne
2. **Pridať + prepísať existujúce** — so zoznamom, čo presne sa zmení
3. **Nahradiť všetko** — schované pod „Pokročilé", s počtom položiek na zmazanie

### 5.3 Potvrdené pasce — POVINNE ošetriť
Overené v kóde adversariálnou analýzou (3 nezávislé kritiky + verdikt).

| # | Pasca | Ošetrenie |
|---|---|---|
| 1 | **Poškodený súbor natrvalo zabije appku.** Položka bez názvu → padne vykresľovanie katalógu (triedenie podľa `nazov`, ~1300), a keďže je štart v jednom bloku (~8–18), nenačíta sa už ani archív ani rozpracovaná ponuka. Reload nepomôže. | Validovať **každú** položku pred zápisom; nevalidné preskočiť a nahlásiť |
| 2 | **Prázdny katalóg v súbore vymaže ten tvoj** — `if (data.katalog)` prepustí `[]` (truthy) | Import **nesmie** ísť cez `_aplikujZalohu()`; vlastná cesta s testom „je pole a má ≥1 položku" |
| 3 | **Prepis zničí opravené firemné ceny** pri opakovanom prenose | Predvolené = „pridať len nové" |
| 4 | **Cudzia DPH prepíše tvoju** — sadzba je lokálna vec inštalácie | Prevziať len cenu, DPH ponechať cieľovú |
| 5 | **Prepis zmaže `popis`** (technické popisy do PDF) — zdroj ich nemusí mať | Zlučovať **po políčkach**, nie prepisom objektu |
| 6 | **Položky `vyzadujeKontrolu` (cena 0) prepíšu dobré ceny** a zmiznú z našepkávača (~787) | Nikdy nimi neprepisovať existujúce, len pridávať |
| 7 | **Nové ceny sa nepremietnu do balíčkov** — hromadná aktualizácia existuje len na manuálnej ceste (~1184) | Po importe spustiť ten istý cyklus a nahlásiť |
| 8 | **Export nedá spätnú väzbu** — v standalone PWA súbor „zmizne"; zrušené zdieľanie sa vyhodnotí ako chyba a stiahne sa aj tak (~2932) | Toast s názvom súboru; v `catch` ignorovať `AbortError`. Opraviť aj v existujúcej zálohe |
| 9 | **Žiadne undo + chýba ošetrenie plnej pamäte** (zápis do globálu pred localStorage, ~2947) | Kópia katalógu pred zápisom → tlačidlo „↩️ Vrátiť import"; zápis v `try/catch` |
| 10 | **„Nahradiť všetko" pri zapnutom Drive nie je trvalé** — merge je union bez záznamu o mazaní (~4396) | Vynútiť okamžitý push, alebo voľbu pri Drive skryť; v potvrdení napísať pravdu |
| 11 | **`_idKatalogPolozky()` nestačí na párovanie z cudzej inštalácie** — netrimované, case-sensitive, s diakritikou; `mj` nenormalizované (CSV ho neupravuje, ~3099); nekonzistencia `m2` vs `m³` | Vlastné párovanie pre import (trim, lowercase, bez diakritiky, normalizácia `mj` proti zoznamu zo selectu). **Pôvodnú funkciu nechať na pokoji**, aby sa nerozbil Drive sync |

**Ďalšie nutné drobnosti:** zrušiť rozrobenú úpravu položky pred importom (formulár drží **index** do poľa, ~1167 — import poradie preskladá); porovnávať ceny/DPH cez `parseFloat` na oboch stranách (z UI prichádza text, z CSV číslo); doplniť `reader.onerror` (dnes chýba, ~2977); rozlíšiť chybové hlášky (nie je JSON / nie je z EasyCeny / poškodený); plnú zálohu **neodmietať**, ale rozpoznať a ponúknuť „vytiahnem z nej iba katalóg"; zablokovať opačnú zámenu — dnešné „Obnoviť zo zálohy" vezme akýkoľvek JSON a na cudzom validnom JSON dokonca oznámi falošný úspech (~2989).

### 5.4 Dve schválené opravy chýb (Úloha D)

**a) Logá výrobcov (`easycena_znacky`) sa nezálohujú.** Pri obnove zo zálohy / prechode na nové zariadenie sa stratia.

> ⚠️ **Naivná oprava vytvorí NOVÚ cestu straty dát.** Dnes sú logá bezpečné práve preto, že o nich sync nevie. Po pridaní do zálohy bez ďalších úprav: pridanie/zmazanie značky nikde nevolá `oznacZmeneny()` (~3245, ~3267) → pri otvorení appky príde **tichý prepis z cloudu bez dialógu** (~4056) a nové logo je preč.
> **Povinne spolu:** doplniť `oznacZmeneny('znacky')` na obe miesta, pridať `znacky` do `_meta.modifiedAt` aj do `_zlucData` (dnes si kľúč ručne zahadzuje, ~4354), zlučovať **po jednej podľa `id`**, a testovať „je to pole" namiesto „je to pravda".

**b) Počítadlo čísel ponúk sa nezálohuje.** V zálohe je mŕtvy `easycena_pocitadlo`; reálne sa používa `pocitadloPonuk` (~354, ~385). Po obnove na novom zariadení číslovanie nenadväzuje.
Pri jednom používateľovi s viacerými zariadeniami je doplnenie bezpečné — číslovanie sa aj tak dolieči z archívu (`Math.max(pocitadlo.pocet, maxVArchive)+1`, ~380).

### 5.5 Schválené rozhodnutia majiteľa
| Otázka | Rozhodnutie |
|---|---|
| Spoločný firemný katalóg cez Drive? | **Nie** — každý projektant vlastný účet, cenník sa šíri súborom |
| Predvolené pri importe | **Pridať len nové** (nedotknúť existujúce ceny) |
| Prebrať DPH zo súboru? | **Nie** — len ceny, DPH ostáva cieľová |
| Tlačidlo „Vrátiť import"? | **Áno** |
| Pomenovanie | **„Preniesť katalóg"**, nie „Export/Import katalógu" |

### 5.6 Odhad rozsahu
| Časť | Veľkosť | Približne |
|---|---|---|
| Opravy 2 chýb (5.4) | stredný | ~60–90 r. (väčšina je povinná obsluha sync pre značky) |
| Export katalógu | malý | ~80–110 r. JS + ~10 HTML |
| Import katalógu | **veľký** | ~350–450 r. JS + ~30 HTML (CSS netreba, všetko hotové) |

Navrhované poradie commitov: **1) opravy chýb → 2) export → 3) import.**

---

## 6. Google prihlásenie — kontext pre Úlohu C

### 6.1 Ako to funguje dnes
- Google Identity Services (`accounts.google.com/gsi/client`), `google.accounts.oauth2.initTokenClient`
- Scope: `https://www.googleapis.com/auth/drive.file email profile` — appka vidí **len vlastné súbory**
- Access token v `easycena_drive_token` s `expiresAt`, **platnosť 1 hodina**
- Zálohy do priečinka `EasyCena_zalohy` (multipart upload), auto-cleanup nad 20 súborov

### 6.2 Čo sa už skúsilo a NEFUNGOVALO
**Automatický tichý re-login pri štarte appky.** Pokus volal `requestAccessToken({prompt:'none'})` pri načítaní. GIS pri nemožnosti tichej obnovy **fallbackuje na popup**, a ten prehliadač zablokuje, lebo kód nebeží z user gesture:
```
[GSI_LOGGER]: Failed to open popup window on url: https://accounts.google.com/o/oauth2/v2/auth... Maybe blocked by the browser?
```
Riešenie bolo odstránené. **Netreba to skúšať znova rovnakým spôsobom.**

### 6.3 Aktuálne (kompromisné) riešenie
- **Udržiavanie tokenu počas práce:** globálny `click` listener (capture, throttle 1×/min) predĺži token, **kým ešte platí** a vyprší o <10 min. Beží z user gesture → prejde.
- **Po vypršaní:** výstražný modál pri štarte + červený pulzujúci indikátor „🔒 Nesync." v rohu, klik = obnova.
- E-mail v `easycena_drive_email` **prežíva** vypršanie tokenu (signál „toto je Drive používateľ"); maže sa len pri vedomom odhlásení.

### 6.4 Čo preskúmať (Úloha C)
Zásadné obmedzenie: **token flow v prehliadači nedáva refresh token.** Trvalé prihlásenie si vyžaduje authorization code flow s `client_secret`, ktorý **nesmie byť v prehliadači**.

Posúď a odporuč (s odhadom zložitosti, ceny a údržby):
1. **Minimálny backend** držiaci refresh token (jedna serverless funkcia na výmenu kódu a vydávanie access tokenov). Zváž **Cloudflare Workers / Supabase Edge Functions / Vercel** — všetky majú free tier. Toto je jediná cesta k naozaj trvalému prihláseniu. Posúď dopad: GDPR (tokeny k cudziemu Drive na serveri), prevádzka, čo ak server spadne, či to appka prežije offline.
2. **Zlepšenie súčasného prístupu bez backendu** — napr. pokus o tichú obnovu pri **prvom user gesture** po štarte (nie pri načítaní), rozšírenie okna predlžovania, obnova pri `visibilitychange`. Over, či GIS v takom prípade popup naozaj neotvorí.
3. **Alternatívne mechanizmy** — FedCM, Google One Tap, `navigator.credentials`. Over, či vôbec riešia **Drive API access token** (podozrenie: riešia identitu, nie autorizáciu k API).
4. **Zmena modelu zálohovania** — napr. File System Access API (priečinok na disku bez prihlasovania) ako doplnok/náhrada Drive pre desktop. Posúď realizovateľnosť na mobile.

Výstup: odporúčanie s jasným „toto je jediná cesta k tomu, čo chceš" vs. „toto je najlepší kompromis bez backendu", a otázka na majiteľa, či chce ísť do backendu.

---

## 7. Hotové funkcie (pre orientáciu, nerozbiť)

Posledné väčšie veci, ktoré sú v ostrej prevádzke:
- **Cloud záloha + 3-way merge** (Drive), konflikt dialóg „Spojiť oboje / Cloud / Lokálne", auto-push s debounce, cloud status indikátor
- **Bezpečnostný audit** — XSS escaping všetkých `innerHTML` vstupov, CSP meta, SRI na jsPDF, odstránená legacy vetva `polozkyHTML`
- **Súpis prác** — upraviteľný nadpis (profil + per-súpis), väzba na ponuku/zákazku/faktúru/vlastné, voliteľná podpisová časť (čiary / podpis dodávateľa / nič)
- **Per-ponuka prepínač DPH** (prenos daňovej povinnosti) — IČ DPH ostáva na doklade
- **Duplikovanie ponuky** s voľbou ponechať / aktualizovať ceny
- **Presun položiek** v ponuke aj v editore balíčka (šípky ▲▼)
- **PDF fix** — súhrn kategórie sa neprekrýva s pätou (`PDF_MAX_Y`)
- **Našepkávač** — širší dropdown, zalomenie dlhých názvov
