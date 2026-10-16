# Lumen logisztikai tervezőasztal

Interaktív, egyéni gyakorlófelület az **AGELG157L AI-támogatott logisztikai tervezés** 3. konzultációjához (oktató: dr. Csonka Arnold, MATE Kaposvári Campus).
Négy feladat (hálózattervezés, járattervezés, raktári slotting, KPI-pult) élő ranglistával, AI-kihívásokkal és tanári kivetítő nézettel.

A Lumen Ipari Zrt. és minden adata kitalált (szintetikus), oktatási célra készült. Az oldal AI-eszközök segítségével készült, oktatói felügyelet, ellenőrzés és véglegesítés mellett.

---

## 1. Architektúra röviden

```
GitHub Pages (statikus fájlok)              Google Sheet + Apps Script
┌──────────────────────────────┐   POST    ┌──────────────────────────┐
│ index.html                    │ ───────▶ │ doPost: új sor az         │
│  ├ számítások a böngészőben   │          │ "Esemenyek" munkalapra    │
│  │  (LP-solver, VRP, slotting)│   GET    │ doGet: összesítés         │
│  ├ tipp, saját megoldás, AI   │ ◀─────── │ (szavazatok, rangsorok,   │
│  └ ranglista, tanári nézet    │  JSON    │  pontok), 3 mp cache      │
└──────────────────────────────┘          └──────────────────────────┘
        │  prompt másolása / válasz visszamásolása
        ▼
  Copilot, Gemini, Claude vagy ChatGPT (a hallgató saját fiókjával)
```

* **Minden számítás a böngészőben fut.** A szerver csak eseményeket gyűjt (szavazat, eredmény, szöveg) és összesít.
* **Egy esemény = egy sor a táblában.** Semmi nem íródik felül, így a tábla egyben az óra teljes naplója. A `team` oszlopban a hallgató neve, a `client` oszlopban a **Neptun-kódja** áll (a kivetítőn és a ranglistán csak a név látszik).
* **Helyi mód:** ha a `js/config.js` fájlban az `API_URL` üres, vagy megszakad a kapcsolat, az oldal tovább működik. A beküldések sorba állnak, és a kapcsolat visszatérésekor automatikusan elmennek.
* **AI API nélkül:** az oldal a hallgató aktuális adataiból kész promptot állít össze. A hallgató bemásolja a választott AI-ba, a választ visszamásolja, az oldal pedig **újraszámolja és ellenőrzi** az AI állításait (költség, km, kapacitás, a vezetői összefoglaló számai).

### Munkarend minden feladatban

1. **Tipp** (egyszer beküldhető, nem módosítható)
2. **Saját megoldás** (egyszer beküldhető, nem módosítható; a tipp előtt zárva)
3. **AI-kihívás** (csak a tipp és a saját megoldás beküldése után nyílik meg)
4. **Algoritmus** (solver vagy heurisztika; szintén csak a saját megoldás után)
5. **Döntés** (egyszer beküldhető szöveges javaslat)

A zárt lépések lakattal jelzik, mi hiányzik még. A KPI-pultnál a hallgató előbb a saját vezetői összefoglalóját küldi be, utána írja meg az AI is, és a kettőt veti össze.

### Fájlok

| Fájl | Szerep |
|---|---|
| `index.html` | A keret: fejléc, navigáció, nézetek |
| `css/app.css` | Megjelenés (MATE-színek a fájl elején, Poppins, világos és sötét mód, mobilnézet, nyomtatás) |
| `js/config.js` | **Beállítások: Apps Script URL, munkamenet, oktató, AI-szolgáltatások listája** |
| `js/data.js` | A közös Lumen-adatsor (raktárak, vevők, megállók, termékek, KPI-k) |
| `js/core.js` | Számítási mag: LP-modell, VRP-heurisztikák, szedési út, AI-válaszok értelmezése |
| `js/vendor/lp-solver.js` | javascript-lp-solver 0.4.24 (Unlicense), vegyes egészértékű LP |
| `js/aggregate.js` | Összesítő és pontozó logika (azonos az Apps Script-belivel) |
| `js/backend.js` | Kapcsolat az Apps Scripttel, frissítés, sorban állás, helyi mód |
| `js/activities.js` | A feladatok nyilvántartása (tippek, kvízek, versenyek) |
| `js/ui.js` | Közös elemek: szavazás, verseny-ranglista, AI-kártya, egyszeri beküldés, zárolás |
| `js/m1-halozat.js` … `js/m4-kpi.js` | A négy feladat |
| `js/ertekeles.js` | Névtelen kurzusértékelés (hallgatói űrlap és tanári összesítő) |
| `js/app.js` | Belépés, navigáció, munkaasztal, ranglista, tanári kivetítő, lábléc |
| `apps-script/Code.gs` | A Google Apps Script backend (ezt kell bemásolni) |

---

## 2. Telepítés

### 2.1 Google Sheet és Apps Script

1. Hozz létre egy új, üres Google Sheetet.
2. **Bővítmények → Apps Script.** Töröld a `Code.gs` tartalmát, másold be helyette az `apps-script/Code.gs` teljes tartalmát, mentsd.
3. A függvényválasztóban válaszd a `setup` függvényt, és kattints a **Futtatás** gombra. Fogadd el az engedélykérést (Speciális → Ugrás ide → Engedélyezés). Létrejön az `Esemenyek` munkalap.
4. **Telepítés → Új telepítés → Webalkalmazás**: Végrehajtás mint: **Én**, Hozzáférés: **Bárki**.
5. Másold ki a **`.../exec`** végű URL-t, és ellenőrizd böngészőben: `.../exec?action=ping` → `{"ok":true,...}`.

> Ha később módosítod a `Code.gs`-t: **Telepítések kezelése → Szerkesztés → Új verzió** (így az URL nem változik).

### 2.2 Beállítások (`js/config.js`)

```js
API_URL: "https://script.google.com/macros/s/XXXX/exec",
SESSION: "LOG1016",
OKTATO: "dr. Csonka Arnold",
AI_LINKS: [ { nev: "Copilot", url: "https://m365.cloud.microsoft/chat" }, ... ]
```

A színek a MATE arculati kézikönyvét követik, és a `css/app.css` elején egyetlen blokkban állíthatók. A betűtípus Poppins (címek: Bold, szöveg: Regular, mert a Light a képernyőn túl vékony); a betűfájlok a `fonts/` mappában vannak (SIL OFL licenc), így internet nélkül is működik.

A hivatalos MATE-logó opcionális: tedd a fájlt a repóba (például `assets/mate-logo.png`, a zöld fejlécre a fehér változat illik), és add meg az útvonalát a `config.js` `LOGO_URL` mezőjében. Enélkül a fejlécben a „MATE” felirat jelenik meg.

### 2.3 GitHub Pages

1. Töltsd fel a mappa teljes tartalmát egy GitHub-repóba (az `index.html` a gyökérben legyen).
2. **Settings → Pages → Source: Deploy from a branch → `main` / `(root)`** → Save.

---

## 3. Használat az órán

| Kinek | Link |
|---|---|
| Hallgatók | `https://.../index.html?s=LOG1016` |
| Tanári kivetítő | `https://.../index.html?s=LOG1016&tanar=1` |

* **Belépés:** teljes név + Neptun-kód (6 karakter). Gépcsere után ugyanezekkel folytatható; a beküldések megmaradnak.
* **Munkamenet-kód (`s=`):** minden óra vagy csoport kapjon újat. A régi adatok megmaradnak a táblában, csak nem keverednek.
* **Tanári nézet:** élő ranglista, belépési kód, a tippek és kvízek élő eredménye, KPI-szavazás, AI-értékelések, döntési javaslatok, vezetői összefoglalók. Az „automatikus lapozás” 12 másodpercenként vált panelt.
* **Adatexport:** `.../exec?action=export&session=LOG1016` (JSON), vagy közvetlenül a Google Sheet.

### Kurzusértékelés

A „Kurzusértékelés” fül (a munkaasztalról és a 4. feladat végéről is elérhető) névtelen, önkéntes, pont nélküli visszajelzés a kurzusról, a notebook alapú és a HTML-alapú oktatásról:

* **1. Témánként** (7 téma × érdekes / hasznos a munkámban / új tudást adott, 1–5)
* **2. Összegzés** (érdekesség, hasznosság, új tudás, ajánlás, 1–5)
* **3. Választás** (legértékesebb téma; notebook vagy HTML-felület)
* **4. Szöveges** (mi tetszett leginkább; mit használ a munkájában; mi hiányzott)

Minden kérdés kihagyható, és minden zárt kérdésnél van „nem tudom / nem kívánok válaszolni” lehetőség. A válaszok **külön munkamenetbe** kerülnek (`LOG1016_ERT`), véletlen azonosítóval, név és Neptun-kód nélkül, így a ranglistát sem érintik. Böngészőnként egyszer küldhető be. A tanári nézetben a „Kurzusértékelés” panel mutatja az átlagokat (hőtérkép), az eloszlásokat és a szöveges válaszokat. Nyers adat: `.../exec?action=export&session=LOG1016_ERT`.

### Pontozás

| Elem | Pont |
|---|---|
| Helyes tipp (6 db) | +5 |
| Kvíz helyes válasza (3 db) | +3 |
| Verseny (hálózat, járat, slotting) helyezés szerint | 15 / 12 / 10 / 8, minden további: 6 |
| AI-kihívás saját értékeléssel (4 db) | +4 |
| Döntési javaslat (hálózat, járat) | +2 |
| KPI-válogató (kiegyensúlyozott pultért) | +2 (+4) |
| Hatásmátrix: helyes cellánként | +1 (max. 15) |
| Saját vezetői összefoglaló | +4 |
| Kapott szavazat az összefoglalóra | +3 / szavazat |

A pontszámok a `js/aggregate.js` elején (`LT_PONT`) és az `apps-script/Code.gs` végén állíthatók; **mindkét helyen** módosítani kell.

---

## 4. Javasolt forgatókönyv (14:00–18:45)

| Idő | Blokk |
|---|---|
| 14:00–14:15 | Belépés, munkaasztal, a munkarend és a promptírási útmutató röviden. Kivetítőn a tanári nézet. |
| 14:15–15:15 | **1. Hálózat:** tipp → saját hálózat → AI-javaslat ellenőrzése → solver → üzemanyag-sokk → javaslat |
| 15:15–16:15 | **2. Járattervezés:** tipp → kattintással épített járatok → AI-útvonal → heurisztikák → két paraméterezés → javaslat |
| 16:15–16:30 | Szünet (a tanári nézetben a versenyek állása) |
| 16:30–17:20 | **3. Raktár:** Pareto-tipp → ABC-elemzés → „így mérünk” → slotting-játék → AI-slotting → ABC-algoritmus → bejárási módok |
| 17:20–18:20 | **4. KPI-pult:** KPI-elmélet → pultépítés → hatásmátrix → pult → csapda-kvíz → saját összefoglaló → AI-összefoglaló → szavazás |
| 18:20–18:45 | Zárás: kurzusértékelés kitöltése (5 perc), ranglista, a legtöbb szavazatot kapott összefoglaló, beadandó, félév végi feladatok |

### Amire érdemes felhívni a figyelmet az AI-kihívásoknál

* **Hálózat:** az AI becsült éves költsége jellemzően eltér a valóstól.
* **Járat:** gyakori a túlterhelt járat, a kimaradt vagy kétszer szereplő megálló, az elszámolt km; a határidőket ritkán ellenőrzi.
* **Raktár:** a szabály (népszerű termék előre) jellemzően jó, de a végrehajtásban lehetnek ellentmondások, és a becsült megtakarítás gyakran túlzó.
* **KPI:** a vezetői szövegben a pultból nem igazolható számokat a számellenőrző sárgával jelöli.

---

## 5. A 2. beadandóhoz

* A **2. feladat 5. lépése** a kért „két különböző paraméterezés” összevetése (12 vs. 18 raklapos autó, határidővel és anélkül).
* Az **1. feladat** solver-eredménye és érzékenységvizsgálata a hálózati forgatókönyvek összevetéséhez használható.
* A **KPI-pult** nyomtatható (Nyomtatás / PDF gomb).

---

## 6. Hibaelhárítás

| Jelenség | Ok és teendő |
|---|---|
| Fejlécben „helyi mód” | Az `API_URL` üres a `config.js`-ben. Minden működik, de csak gépenként összesít. |
| „nincs kapcsolat (n vár)” | Az Apps Script nem érhető el. A beküldések sorban állnak, és automatikusan elmennek. Ellenőrizd: `.../exec?action=ping`. |
| A ranglista nem frissül | Ugyanaz a munkamenet-kód van-e a hallgatóknál és a tanári nézetben (`?s=`)? |
| Egy hallgató véletlenül rosszat küldött be | A beküldés szándékosan végleges. Szükség esetén a Google Sheetben törölhető az adott sor (a ranglista néhány másodperc múlva frissül), de a hallgató gépén a lépés zárva marad. |
| Másik névvel kell belépni | Fejléc → „kilépés”. |
| Helyben, fájlból megnyitva | Működik (`index.html` dupla kattintással). A vágólapra másolás egyes böngészőkben csak `https://` alatt engedélyezett; ilyenkor „A prompt szövege” részből kézzel másolható. |

Teszt helyi szerverrel: a mappában `python3 -m http.server 8000`, majd `http://localhost:8000/`.
