/* A feladatok közös nyilvántartása: a küldetések és a tanári kivetítő is ebből dolgozik */
(function () {
  const LT = (window.LT = window.LT || {});
  LT.ACT = {
    m1_tipp: {
      k: 1, tipus: "tipp", pont: 5, cim: "Tipp: hány raktár?",
      kerdes: "Szerinted hány raktárral lesz a legkisebb a teljes éves logisztikai költség?",
      opciok: [{ id: "1", label: "1 (csak Gyál)" }, { id: "2", label: "2 raktár" }, { id: "3", label: "3 raktár" }, { id: "4", label: "4 raktár" }, { id: "5", label: "5 vagy több" }]
    },
    m1_kezi: { k: 1, tipus: "verseny", cim: "Hálózat-verseny", mertek: "M Ft / év", dir: "min" },
    m1_ai: { k: 1, tipus: "ai", cim: "Az AI hálózati javaslata" },
    m1_dontes: { k: 1, tipus: "dontes", pont: 2, cim: "Hálózati javaslatom a vezérigazgatónak" },
    m1_sokk: {
      k: 1, tipus: "tipp", pont: 5, cim: "Tipp: üzemanyag-sokk",
      kerdes: "Ha a fuvardíjak 50%-kal nőnek (üzemanyag-sokk), mi lesz az optimális hálózattal?",
      opciok: [{ id: "same", label: "Ugyanaz marad" }, { id: "less", label: "Kevesebb raktár kell" }, { id: "more", label: "Több raktár kell" }]
    },
    m2_tipp: {
      k: 2, tipus: "tipp", pont: 5, cim: "Tipp: hány teherautó?",
      kerdes: "Legalább hány 12 raklapos teherautó kell a holnapi 16 megállóhoz (43 raklap)?",
      opciok: [{ id: "3", label: "3" }, { id: "4", label: "4" }, { id: "5", label: "5" }, { id: "6", label: "6" }]
    },
    m2_kezi: { k: 2, tipus: "verseny", cim: "Járat-verseny", mertek: "Ft / nap", dir: "min" },
    m2_ai: { k: 2, tipus: "ai", cim: "Az AI útvonalterve" },
    m2_dontes: { k: 2, tipus: "dontes", pont: 2, cim: "Fuvarszervezési javaslatom" },
    m2_nagy: {
      k: 2, tipus: "tipp", pont: 5, cim: "Tipp: nagyobb teherautó",
      kerdes: "Ha 12 helyett 18 raklapos teherautókkal megyünk (kevesebb autó, de drágább km), a napi költség…",
      opciok: [{ id: "le", label: "csökken" }, { id: "egy", label: "nagyjából ugyanannyi (±3%)" }, { id: "fel", label: "nő" }]
    },
    m3_tipp: {
      k: 3, tipus: "tipp", pont: 5, cim: "Tipp: Pareto",
      kerdes: "A termékek legnépszerűbb 20%-a a napi szedési sorok hány százalékát adja?",
      opciok: [{ id: "a", label: "20–40%" }, { id: "b", label: "40–60%" }, { id: "c", label: "60–80%" }, { id: "d", label: "80% fölött" }]
    },
    m3_slot: { k: 3, tipus: "verseny", cim: "Slotting-verseny", mertek: "m / nap", dir: "min" },
    m3_ai: { k: 3, tipus: "ai", cim: "Az AI slotting-javaslata" },
    m3_ut: {
      k: 3, tipus: "tipp", pont: 5, cim: "Tipp: bejárási mód",
      kerdes: "Ha a népszerű termékek elöl vannak (ABC-slotting), melyik bejárás lesz rövidebb?",
      opciok: [{ id: "vissza", label: "Visszafordulós", sub: "minden folyosóba csak a legmélyebb tételig megy be" }, { id: "kigyo", label: "Kígyózó (S-alakú)", sub: "végigmegy a folyosókon" }, { id: "egy", label: "Nagyjából egyforma" }]
    },
    m4_kpi: {
      k: 4, tipus: "velemeny", pont: 2, cim: "KPI-válogató", pontosan: 5,
      kerdes: "Melyik 5 mutató kerüljön a vezérigazgató egyoldalas pultjára?"
    },
    m4_hatas: { k: 4, tipus: "hatas", cim: "Hatásmátrix: melyik döntés mit mozgat?" },
    m4_kviz1: {
      k: 4, tipus: "kviz", pont: 3, cim: "Csapda 1: rendelésenkénti költség",
      kerdes: "A szállítási költség rendelésenként 10%-kal nőtt. Közben egy átlagos rendelés 25%-kal több raklapból áll. Mit mondhatunk?",
      opciok: [{ id: "a", label: "Romlott a hatékonyság" }, { id: "b", label: "Raklapra vetítve javult" }, { id: "c", label: "Nem dönthető el" }],
      helyes: "b",
      magyarazat: "Raklapra vetítve 1,10 / 1,25 = 0,88, azaz a költség kb. 12%-kal csökkent. A rendelésenkénti mutató a rendelésnagyság változását is tartalmazza, ezért önmagában félrevezető."
    },
    m4_kviz2: {
      k: 4, tipus: "kviz", pont: 3, cim: "Csapda 2: OTIF",
      kerdes: "A rendelések 95%-a érkezett időben, és 96%-a hiánytalanul. Mekkora lehet az OTIF (időben ÉS hiánytalanul)?",
      opciok: [{ id: "a", label: "95,5% (a kettő átlaga)" }, { id: "b", label: "91% és 95% között bárhol" }, { id: "c", label: "Pontosan 96%" }],
      helyes: "b",
      magyarazat: "Az OTIF legfeljebb a kisebbik arány (95%), és legrosszabb esetben 95% + 96% − 100% = 91%, ha a késések és a hiányok más-más rendelést érintenek. Átlagolni tilos."
    },
    m4_kviz3: {
      k: 4, tipus: "kviz", pont: 3, cim: "Csapda 3: az átlag",
      kerdes: "Az átlagos szállítási idő 1,9 nap, a cél legfeljebb 2 nap. A rendelések 80%-a 1 nap alatt, 20%-a 5,5 nap alatt érkezik. Teljesítettük a célt?",
      opciok: [{ id: "a", label: "Igen, az átlag a cél alatt van" }, { id: "b", label: "Nem, a rendelések ötöde súlyosan késik" }, { id: "c", label: "Igen, de csak kis híján" }],
      helyes: "b",
      magyarazat: "Az átlag elfedi a szóródást. Helyesebb mutató: a célidőn belül teljesített rendelések aránya (itt csak 80%), vagy egy felső percentilis (például a 90. percentilis 5,5 nap)."
    },
    m4_ossz: { k: 4, tipus: "szoveg", pont: 4, cim: "A saját vezetői összefoglalóm" },
    m4_ai: { k: 4, tipus: "ai", cim: "Az AI vezetői összefoglalója" },
    m4_peer: { k: 4, tipus: "peer", cim: "A legjobb vezetői összefoglaló" }
  };
  Object.keys(LT.ACT).forEach(id => (LT.ACT[id].id = id));
  LT.KULDETES = {
    1: { nev: "Hálózat", szin: "var(--m1)" },
    2: { nev: "Járattervezés", szin: "var(--m2)" },
    3: { nev: "Raktár", szin: "var(--m3)" },
    4: { nev: "KPI-pult", szin: "var(--m4)" }
  };
  // a pont-részletezésben a "_ert" (tipp-kiértékelés) a saját tippjéhez tartozik
  LT.actKuldetes = function (activity) {
    const base = String(activity).replace(/_ert$/, "");
    return (LT.ACT[base] && LT.ACT[base].k) || Number((activity.match(/^m(\d)/) || [])[1]) || 0;
  };
})();
