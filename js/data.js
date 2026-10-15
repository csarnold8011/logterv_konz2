/* Lumen Ipari Zrt. – logisztikai műhely: a közös (szintetikus) adatsor.
   Minden cég, ügyfél és szám kitalált, oktatási célra készült. */
(function (root) {
  const LT = (root.LT = root.LT || {});

  /* ---------- Közös térkép: Magyarország vázlatos körvonala (lon, lat) ---------- */
  const HU_OUTLINE = [
    [16.11, 46.87], [16.27, 46.98], [16.45, 47.40], [16.65, 47.62], [16.42, 47.66],
    [16.75, 47.70], [17.07, 48.03], [17.25, 48.02], [17.70, 47.76], [18.10, 47.76],
    [18.70, 47.80], [18.85, 47.83], [18.90, 48.05], [19.48, 48.18], [19.80, 48.21],
    [20.10, 48.27], [20.45, 48.56], [20.85, 48.58], [21.40, 48.57], [21.72, 48.35],
    [22.15, 48.41], [22.45, 48.24], [22.90, 47.97], [22.60, 47.78], [22.32, 47.73],
    [22.00, 47.40], [21.65, 47.03], [21.42, 46.92], [21.23, 46.42], [20.75, 46.25],
    [20.26, 46.12], [19.70, 46.17], [19.10, 46.03], [18.87, 45.92], [18.48, 45.80],
    [17.85, 45.79], [17.40, 45.95], [17.10, 46.20], [16.85, 46.38], [16.60, 46.47],
    [16.38, 46.62], [16.11, 46.87]
  ];

  /* ---------- 1. küldetés: elosztóhálózat ---------- */
  const GYAR = { id: "GY", nev: "Székesfehérvár (gyár)", lat: 47.186, lon: 18.422 };

  // Lehetséges regionális elosztóközpontok (RDC). Fix költség: millió Ft / év.
  // Kapacitás: raklap / év.
  const RAKTARAK = [
    { id: "R1", nev: "Budapest-Gyál", rov: "Gyál", lat: 47.383, lon: 19.221, fix: 60, kap: 16000, meglevo: true },
    { id: "R2", nev: "Győr", rov: "Győr", lat: 47.687, lon: 17.650, fix: 30, kap: 5000 },
    { id: "R3", nev: "Kecskemét", rov: "Kecskemét", lat: 46.906, lon: 19.692, fix: 28, kap: 5000 },
    { id: "R4", nev: "Debrecen", rov: "Debrecen", lat: 47.531, lon: 21.627, fix: 32, kap: 5000 },
    { id: "R5", nev: "Pécs", rov: "Pécs", lat: 46.072, lon: 18.233, fix: 26, kap: 5000 },
    { id: "R6", nev: "Miskolc", rov: "Miskolc", lat: 48.103, lon: 20.778, fix: 30, kap: 5000 },
  ];

  // Ügyfelek (nagykereskedők, regionális viszonteladók). Kereslet: raklap / év.
  const UGYFELEK = [
    { id: "U01", nev: "Budapest", lat: 47.497, lon: 19.040, keres: 4200 },
    { id: "U02", nev: "Győr", lat: 47.687, lon: 17.650, keres: 1150 },
    { id: "U03", nev: "Debrecen", lat: 47.531, lon: 21.627, keres: 1100 },
    { id: "U04", nev: "Szeged", lat: 46.253, lon: 20.148, keres: 1050 },
    { id: "U05", nev: "Pécs", lat: 46.072, lon: 18.233, keres: 900 },
    { id: "U06", nev: "Miskolc", lat: 48.103, lon: 20.778, keres: 950 },
    { id: "U07", nev: "Székesfehérvár", lat: 47.186, lon: 18.422, keres: 800 },
    { id: "U08", nev: "Kecskemét", lat: 46.906, lon: 19.692, keres: 750 },
    { id: "U09", nev: "Nyíregyháza", lat: 47.955, lon: 21.717, keres: 700 },
    { id: "U10", nev: "Szombathely", lat: 47.230, lon: 16.621, keres: 600 },
    { id: "U11", nev: "Kaposvár", lat: 46.359, lon: 17.796, keres: 500 },
    { id: "U12", nev: "Zalaegerszeg", lat: 46.840, lon: 16.844, keres: 450 },
    { id: "U13", nev: "Eger", lat: 47.903, lon: 20.377, keres: 550 },
    { id: "U14", nev: "Veszprém", lat: 47.093, lon: 17.911, keres: 520 },
    { id: "U15", nev: "Békéscsaba", lat: 46.679, lon: 21.091, keres: 480 },
    { id: "U16", nev: "Szolnok", lat: 47.174, lon: 20.176, keres: 600 }
  ];

  const HALOZAT_ALAP = {
    kiFuvar: 110,      // Ft / raklap / km, raktárból ügyfélhez (gyűjtő-terítő fuvar)
    beFuvar: 22,      // Ft / raklap / km, gyárból raktárba (teljes kamion)
    utFaktor: 1.25,   // légvonal -> közúti távolság szorzó
    kiszolgKm: 100,   // ezen belül: másnapi (gyors) kiszolgálás
    maxTav: 0,        // 0 = nincs korlát; >0: ennél messzebbről nem szolgálhatunk ki
    minGyors: 0       // 0 = nincs cél; >0: a kereslet legalább ennyi %-a legyen 100 km-en belül
  };

  /* ---------- 2. küldetés: napi járattervezés a budapesti RDC-ből ---------- */
  const DEPO = { id: "D", nev: "RDC Budapest-Gyál", lat: 47.383, lon: 19.221 };
  // ido: határidő (óra:perc), ha van időablak
  const MEGALLOK = [
    { id: "S01", nev: "Érd", lat: 47.378, lon: 18.913, rakl: 2 },
    { id: "S02", nev: "Budaörs", lat: 47.461, lon: 18.958, rakl: 3, hatarido: "10:00" },
    { id: "S03", nev: "Szentendre", lat: 47.669, lon: 19.076, rakl: 2 },
    { id: "S04", nev: "Vác", lat: 47.776, lon: 19.134, rakl: 4, hatarido: "11:00" },
    { id: "S05", nev: "Dunakeszi", lat: 47.630, lon: 19.138, rakl: 3 },
    { id: "S06", nev: "Gödöllő", lat: 47.597, lon: 19.355, rakl: 3 },
    { id: "S07", nev: "Veresegyház", lat: 47.654, lon: 19.284, rakl: 2 },
    { id: "S08", nev: "Monor", lat: 47.351, lon: 19.449, rakl: 2 },
    { id: "S09", nev: "Cegléd", lat: 47.172, lon: 19.800, rakl: 4, hatarido: "10:30" },
    { id: "S10", nev: "Dabas", lat: 47.186, lon: 19.311, rakl: 3 },
    { id: "S11", nev: "Ráckeve", lat: 47.161, lon: 18.944, rakl: 2 },
    { id: "S12", nev: "Szigetszentmiklós", lat: 47.344, lon: 19.044, rakl: 3 },
    { id: "S13", nev: "Százhalombatta", lat: 47.330, lon: 18.912, rakl: 2 },
    { id: "S14", nev: "Zsámbék", lat: 47.546, lon: 18.718, rakl: 1 },
    { id: "S15", nev: "Nagykáta", lat: 47.414, lon: 19.744, rakl: 3 },
    { id: "S16", nev: "Budapest XIII.", lat: 47.530, lon: 19.070, rakl: 4, hatarido: "09:30" }
  ];

  // Két járműtípus = a beadandóban kért két paraméterezés
  const JARMUVEK = {
    kicsi: { nev: "12 raklapos tehergépkocsi", kap: 12, fix: 38000, perKm: 420 },
    nagy: { nev: "18 raklapos tehergépkocsi", kap: 18, fix: 52000, perKm: 560 }
  };
  const VRP_ALAP = {
    jarmu: "kicsi",
    idoablak: true,
    indulas: 7 * 60,      // 07:00, percben
    muszakVege: 16 * 60,  // 16:00-ig vissza kell érni
    sebesseg: 45,         // km/h átlag
    kirakas: 20,          // perc / megálló
    utFaktor: 1.3,
    kesesBunt: 15000,     // Ft / késve teljesített megálló (kötbér, elégedetlenség)
    tulora: 9000          // Ft / óra túlóra
  };

  /* ---------- 3. küldetés: késztermékraktár, szedés ---------- */
  const RAKTAR_LAYOUT = {
    folyosok: ["F1", "F2", "F3"], // folyosók (nem azonos az ABC-osztályokkal!)
    rekesz: 8,           // rekesz / oldal
    folyosoKoz: 5.0,     // m, a folyosók középvonalai között
    elsoFolyoso: 4.0,    // m, a kiadóponttól az első folyosó középvonaláig
    rekeszHossz: 2.5,    // m
    elotér: 1.5,         // m, a keresztfolyosó és az első rekesz között
    sebesseg: 1.0,       // m/s gyaloglás
    sorIdo: 15,          // s / szedési sor (levétel, szkennelés)
    rendelesIdo: 30      // s / rendelés (indítás, lezárás)
  };

  const TERMEK_NEVEK = [
    "LED panel 60×60 40W", "LED panel 30×120 36W", "Csarnokvilágító 150W", "Csarnokvilágító 200W",
    "Lineáris lámpa 120 cm", "Lineáris lámpa 150 cm", "Mélysugárzó 12W", "Mélysugárzó 18W",
    "Térvilágító 50W", "Térvilágító 100W", "Utcai lámpafej 60W", "Utcai lámpafej 90W",
    "Vészvilágító 3h", "Vészvilágító 1h", "Sínes spot 25W", "Sínes spot 35W",
    "Ipari tápegység 100W", "Ipari tápegység 240W", "Mozgásérzékelő IP65", "DALI vezérlő",
    "Rögzítő konzol M", "Rögzítő konzol L", "Függesztő készlet", "Diffúzor opál 120",
    "Diffúzor prizmás 120", "Lámpaház alu 60", "Lámpaház alu 120", "Hűtőborda 150W",
    "Kábelkészlet 5 m", "Kábelkészlet 10 m", "Csatlakozó IP67", "Sorkapocs-szett",
    "Fényforrás modul 2k", "Fényforrás modul 4k", "Tartalék optika 30°", "Tartalék optika 60°",
    "Szerelőkészlet", "Garanciális csomag", "Bemutató készlet", "Mintadoboz"
  ];

  /* ---------- 4. küldetés: KPI-k ---------- */
  const KPI_LISTA = [
    { id: "otif", kat: "Kiszolgálás", nev: "OTIF (időben és hiánytalanul)", leiras: "A rendelések hány %-a érkezik időben ÉS teljes mennyiségben." },
    { id: "fill", kat: "Kiszolgálás", nev: "Kitöltési arány", leiras: "A megrendelt tételek hány %-át szállítottuk le az első szállítással." },
    { id: "atfutas", kat: "Kiszolgálás", nev: "Rendelési átfutási idő", leiras: "Napok a rendelés beérkezésétől a kiszállításig." },
    { id: "ktsraklap", kat: "Költség", nev: "Logisztikai költség / raklap", leiras: "Raktározás + szállítás egy kiszolgált raklapra vetítve (cost-to-serve)." },
    { id: "ktsarbev", kat: "Költség", nev: "Logisztikai költség / árbevétel", leiras: "A logisztika költsége az árbevétel %-ában." },
    { id: "kihaszn", kat: "Hatékonyság", nev: "Járműkihasználtság", leiras: "A teherautók raktere átlagosan hány %-ban van megtöltve." },
    { id: "szedes", kat: "Hatékonyság", nev: "Szedési termelékenység", leiras: "Szedési sor / óra / fő a raktárban." },
    { id: "keszlet", kat: "Eszköz és kockázat", nev: "Készletforgás", leiras: "Hányszor fordul meg a készlet egy év alatt." },
    { id: "serult", kat: "Eszköz és kockázat", nev: "Sérült kiszállítások aránya", leiras: "A kiszállítások hány %-ánál volt sérülés-reklamáció." },
    { id: "gyors", kat: "Kiszolgálás", nev: "Gyors kiszolgálás aránya", leiras: "A kereslet hány %-a van 100 km-en belül egy raktártól (másnapi szállítás)." },
    { id: "km", kat: "Hatékonyság", nev: "Napi járműkilométer", leiras: "A napi terítőjáratok összes futásteljesítménye." },
    { id: "beszall", kat: "Eszköz és kockázat", nev: "Beszállítói pontosság", leiras: "A beérkező szállítások hány %-a érkezik a megbeszélt idősávban." }
  ];

  // A "jelenlegi állapot" működési mutatói (szintetikus), a KPI-pult kiegészítéséhez
  const MUKODES_BAZIS = {
    otif: 89.4, fill: 95.8, atfutas: 2.9, keszlet: 5.6, serult: 1.1, beszall: 92.5
  };

  LT.data = {
    HU_OUTLINE, GYAR, RAKTARAK, UGYFELEK, HALOZAT_ALAP,
    DEPO, MEGALLOK, JARMUVEK, VRP_ALAP,
    RAKTAR_LAYOUT, TERMEK_NEVEK, KPI_LISTA, MUKODES_BAZIS
  };
})(typeof window !== "undefined" ? window : globalThis);
