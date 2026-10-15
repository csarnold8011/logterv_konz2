/* Lumen logisztikai műhely – számítási mag (böngészőben és node-ban is fut).
   Hálózattervezés (vegyes egészértékű LP), járattervezés (VRP heurisztikák),
   raktári slotting és szedési út, KPI-k, valamint az AI-válaszok értelmezése. */
(function (root) {
  const LT = (root.LT = root.LT || {});
  const D = LT.data;
  const getSolver = () => root.solver || (typeof require === "function" ? require("./vendor/lp-solver.js") : null);

  /* ================= Általános segédek ================= */
  function haversine(a, b) {
    const R = 6371, toR = Math.PI / 180;
    const dLat = (b.lat - a.lat) * toR, dLon = (b.lon - a.lon) * toR;
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // Vetítés SVG-hez: km-alapú sík egy referenciapont körül
  function projector(lat0, lon0) {
    const kx = Math.cos(lat0 * Math.PI / 180) * 111.32, ky = 110.57;
    return (p) => ({ x: (p.lon - lon0) * kx, y: (lat0 - p.lat) * ky });
  }
  const fmt = {
    num(v, d = 0) {
      if (v === null || v === undefined || isNaN(v)) return "–";
      return Number(v).toLocaleString("hu-HU", { minimumFractionDigits: d, maximumFractionDigits: d });
    },
    ft(v) { return fmt.num(Math.round(v)) + " Ft"; },
    mft(v, d = 1) { return fmt.num(v, d) + " M Ft"; },
    pct(v, d = 1) { return fmt.num(v, d) + "%"; },
    ido(perc) {
      const h = Math.floor(perc / 60), m = Math.round(perc % 60);
      return String(h).padStart(2, "0") + ":" + String(m === 60 ? 0 : m).padStart(2, "0");
    }
  };
  function idoPerc(s) { const [h, m] = s.split(":").map(Number); return h * 60 + m; }

  /* ================= 1. Hálózattervezés ================= */
  const H = {};
  H.tav = function (a, b, p) { return haversine(a, b) * (p || D.HALOZAT_ALAP).utFaktor; };

  // Egy raklap teljes útjának költsége (Ft): gyár -> raktár -> ügyfél
  H.raklapKts = function (u, r, p) { return p.beFuvar * H.tav(D.GYAR, r, p) + p.kiFuvar * H.tav(r, u, p); };

  /* A modell: min  Σ fix_j·y_j + Σ kereslet_i·költség_ij·x_ij
     feltételek: Σ_j x_ij = 1 (minden ügyfél ki van szolgálva)
                 Σ_i kereslet_i·x_ij ≤ kap_j·y_j (kapacitás, csak nyitott raktár)
                 x_ij ≤ y_j, y_j ∈ {0,1}, opcionálisan Σ y_j ≤ K és távolsági korlát */
  H.megold = function (p, opts) {
    opts = opts || {};
    const solver = getSolver();
    const fixOpen = opts.nyitott ? new Set(opts.nyitott) : null;
    const model = { optimize: "cost", opType: "min", constraints: {}, variables: {}, ints: {} };
    for (const u of D.UGYFELEK) model.constraints["dem_" + u.id] = { equal: 1 };
    for (const r of D.RAKTARAK) {
      const isOpen = fixOpen ? fixOpen.has(r.id) : null;
      if (fixOpen && !isOpen) continue;
      model.constraints["cap_" + r.id] = { max: fixOpen ? r.kap : 0 };
      if (!fixOpen) {
        const yv = { cost: r.fix, ["cap_" + r.id]: -r.kap, ["ub_" + r.id]: 1, cnt: 1 };
        model.constraints["ub_" + r.id] = { max: 1 };
        for (const u of D.UGYFELEK) yv["lnk_" + u.id + "_" + r.id] = -1;
        model.variables["y_" + r.id] = yv;
        model.ints["y_" + r.id] = 1;
      }
      for (const u of D.UGYFELEK) {
        const d = H.tav(r, u, p);
        if (p.maxTav > 0 && d > p.maxTav) continue;
        const v = { cost: u.keres * H.raklapKts(u, r, p) / 1e6, ["dem_" + u.id]: 1, ["cap_" + r.id]: u.keres };
        if (p.minGyors > 0 && d <= p.kiszolgKm) v.gyors = u.keres;
        if (!fixOpen) { v["lnk_" + u.id + "_" + r.id] = 1; model.constraints["lnk_" + u.id + "_" + r.id] = { max: 0 }; }
        model.variables["x_" + u.id + "_" + r.id] = v;
      }
    }
    if (!fixOpen && opts.maxDb) model.constraints.cnt = { max: opts.maxDb };
    if (p.minGyors > 0) model.constraints.gyors = { min: p.minGyors / 100 * D.UGYFELEK.reduce((s, u) => s + u.keres, 0) };
    const res = solver.Solve(model);
    if (!res.feasible) return { megvalosithato: false };
    let nyitott = fixOpen ? [...fixOpen] : D.RAKTARAK.filter(r => (res["y_" + r.id] || 0) > 0.5).map(r => r.id);
    // Hozzárendelés kiolvasása
    const hozzarendeles = {};
    let kiKts = 0, beKts = 0, gyorsKereslet = 0, osszKereslet = 0, sulyTav = 0;
    for (const u of D.UGYFELEK) {
      osszKereslet += u.keres;
      let best = null, bestX = 0;
      for (const r of D.RAKTARAK) {
        const x = res["x_" + u.id + "_" + r.id] || 0;
        if (x > 1e-6) {
          const d = H.tav(r, u, p);
          kiKts += u.keres * x * p.kiFuvar * d / 1e6;
          beKts += u.keres * x * p.beFuvar * H.tav(D.GYAR, r, p) / 1e6;
          sulyTav += u.keres * x * d;
          if (d <= p.kiszolgKm) gyorsKereslet += u.keres * x;
          if (x > bestX) { bestX = x; best = r.id; }
        }
      }
      hozzarendeles[u.id] = best;
    }
    // Egy nyitott, de nem használt raktárat a fix modell is fizet
    const fixKts = nyitott.reduce((s, id) => s + D.RAKTARAK.find(r => r.id === id).fix, 0);
    const ossz = fixKts + kiKts + beKts;
    return {
      megvalosithato: true, nyitott: D.RAKTARAK.filter(r => nyitott.includes(r.id)).map(r => r.id),
      hozzarendeles, fixKts, kiKts, beKts, ossz,
      gyorsArany: 100 * gyorsKereslet / osszKereslet,
      atlagTav: sulyTav / osszKereslet,
      raklapKts: ossz * 1e6 / osszKereslet
    };
  };
  // Teljes felsorolás (ellenőrzéshez és a "mennyi lehetőség van" kérdéshez)
  H.mindenKonfig = function (p) {
    const n = D.RAKTARAK.length, out = [];
    for (let m = 1; m < (1 << n); m++) {
      const ids = D.RAKTARAK.filter((_, i) => m & (1 << i)).map(r => r.id);
      const r = H.megold(p, { nyitott: ids });
      if (r.megvalosithato) out.push(r);
    }
    return out.sort((a, b) => a.ossz - b.ossz);
  };

  /* ================= 2. Járattervezés (VRP) ================= */
  const V = {};
  V.pontok = function () { return [D.DEPO, ...D.MEGALLOK]; };
  V.matrix = (function () {
    let cache = null;
    return function () {
      if (cache) return cache;
      const pts = V.pontok(), idx = {}, m = [];
      pts.forEach((p, i) => (idx[p.id] = i));
      for (const a of pts) m.push(pts.map(b => haversine(a, b) * D.VRP_ALAP.utFaktor));
      cache = { pts, idx, m };
      return cache;
    };
  })();
  V.km = function (a, b) { const M = V.matrix(); return M.m[M.idx[a]][M.idx[b]]; };

  // Egy útvonalterv (megállókód-tömbök tömbje) teljes kiértékelése
  V.ertekel = function (jaratok, p) {
    p = Object.assign({}, D.VRP_ALAP, p || {});
    const j = D.JARMUVEK[p.jarmu];
    const hibak = [], latott = {};
    const stopById = {};
    D.MEGALLOK.forEach(s => (stopById[s.id] = s));
    const reszletek = [];
    let km = 0, kesesDb = 0, tuloraPerc = 0, aktiv = 0;
    for (let k = 0; k < jaratok.length; k++) {
      const r = jaratok[k].filter(id => stopById[id]);
      if (!r.length) continue;
      aktiv++;
      let t = p.indulas, prev = "D", rkm = 0, rakl = 0;
      const erkezesek = [];
      for (const id of r) {
        latott[id] = (latott[id] || 0) + 1;
        const d = V.km(prev, id);
        rkm += d; t += d / p.sebesseg * 60;
        const s = stopById[id];
        const hat = p.idoablak && s.hatarido ? idoPerc(s.hatarido) : null;
        const kesik = hat !== null && t > hat + 0.01;
        if (kesik) kesesDb++;
        erkezesek.push({ id, erkezes: t, hatarido: hat, kesik });
        t += p.kirakas; rakl += s.rakl; prev = id;
      }
      const vissza = V.km(prev, "D");
      rkm += vissza; t += vissza / p.sebesseg * 60;
      const tul = Math.max(0, t - p.muszakVege);
      tuloraPerc += tul; km += rkm;
      if (rakl > j.kap) hibak.push(`${k + 1}. járat túlterhelt: ${rakl} raklap > ${j.kap} raklap kapacitás`);
      reszletek.push({ jarat: r, km: rkm, rakl, visszaerkezes: t, tul, erkezesek, tulterhelt: rakl > j.kap });
    }
    const hianyzo = D.MEGALLOK.filter(s => !latott[s.id]).map(s => s.id);
    const duplikalt = Object.keys(latott).filter(id => latott[id] > 1);
    if (hianyzo.length) hibak.push("Kimaradt megálló: " + hianyzo.join(", "));
    if (duplikalt.length) hibak.push("Többször felkeresett megálló: " + duplikalt.join(", "));
    const fuvar = aktiv * j.fix + km * j.perKm;
    const bunt = kesesDb * p.kesesBunt + tuloraPerc / 60 * p.tulora;
    const ossz = fuvar + bunt;
    const megallok = D.MEGALLOK.length;
    const osszRakl = D.MEGALLOK.reduce((s, x) => s + x.rakl, 0);
    return {
      ervenyes: hibak.length === 0, hibak, reszletek, jarmuDb: aktiv, km, kesesDb,
      tuloraPerc, fuvar, bunt, ossz, idobenArany: 100 * (megallok - kesesDb) / megallok,
      kihasznaltsag: aktiv ? 100 * reszletek.reduce((s, r) => s + r.rakl, 0) / (aktiv * j.kap) : 0, hianyzo, duplikalt
    };
  };

  // Legközelebbi szomszéd: a "tapasztalt diszpécser" gyors szabálya
  V.legkozelebbi = function (p) {
    p = Object.assign({}, D.VRP_ALAP, p || {});
    const kap = D.JARMUVEK[p.jarmu].kap;
    const maradt = new Set(D.MEGALLOK.map(s => s.id));
    const stop = id => D.MEGALLOK.find(s => s.id === id);
    const jaratok = [];
    while (maradt.size) {
      let cur = "D", load = 0; const r = [];
      while (true) {
        let best = null, bd = Infinity;
        for (const id of maradt) {
          if (load + stop(id).rakl > kap) continue;
          const d = V.km(cur, id);
          if (d < bd) { bd = d; best = id; }
        }
        if (!best) break;
        r.push(best); maradt.delete(best); load += stop(best).rakl; cur = best;
      }
      if (!r.length) break;
      jaratok.push(r);
    }
    return jaratok;
  };

  // Clarke–Wright megtakarítási módszer + lokális javítás (2-opt, áthelyezés)
  V.megtakaritasos = function (p) {
    p = Object.assign({}, D.VRP_ALAP, p || {});
    const kap = D.JARMUVEK[p.jarmu].kap;
    const rakl = {}; D.MEGALLOK.forEach(s => (rakl[s.id] = s.rakl));
    const cost = rs => V.ertekel(rs, p).ossz;
    let routes = D.MEGALLOK.map(s => [s.id]);
    const sav = [];
    for (const a of D.MEGALLOK) for (const b of D.MEGALLOK) {
      if (a.id >= b.id) continue;
      sav.push({ a: a.id, b: b.id, s: V.km("D", a.id) + V.km("D", b.id) - V.km(a.id, b.id) });
    }
    sav.sort((x, y) => y.s - x.s);
    for (const { a, b } of sav) {
      const ra = routes.find(r => r.includes(a)), rb = routes.find(r => r.includes(b));
      if (ra === rb) continue;
      const load = ra.reduce((s, id) => s + rakl[id], 0) + rb.reduce((s, id) => s + rakl[id], 0);
      if (load > kap) continue;
      const cands = [];
      if (ra[ra.length - 1] === a && rb[0] === b) cands.push(ra.concat(rb));
      if (rb[rb.length - 1] === b && ra[0] === a) cands.push(rb.concat(ra));
      if (ra[0] === a && rb[0] === b) cands.push(ra.slice().reverse().concat(rb));
      if (ra[ra.length - 1] === a && rb[rb.length - 1] === b) cands.push(ra.concat(rb.slice().reverse()));
      let best = null, bc = cost([ra]) + cost([rb]);
      for (const c of cands) { const cc = cost([c]); if (cc < bc - 1e-6) { bc = cc; best = c; } }
      if (best) routes = routes.filter(r => r !== ra && r !== rb).concat([best]);
    }
    return V.javit(routes, p);
  };

  V.javit = function (routes, p) {
    p = Object.assign({}, D.VRP_ALAP, p || {});
    const kap = D.JARMUVEK[p.jarmu].kap;
    const rakl = {}; D.MEGALLOK.forEach(s => (rakl[s.id] = s.rakl));
    const total = rs => V.ertekel(rs.filter(r => r.length), p).ossz;
    routes = routes.map(r => r.slice());
    let improved = true, guard = 0;
    while (improved && guard++ < 200) {
      improved = false;
      // 2-opt járaton belül
      for (let k = 0; k < routes.length; k++) {
        const r = routes[k];
        for (let i = 0; i < r.length - 1; i++) for (let j = i + 1; j < r.length; j++) {
          const nr = r.slice(0, i).concat(r.slice(i, j + 1).reverse(), r.slice(j + 1));
          const before = total([r]), after = total([nr]);
          if (after < before - 1e-6) { routes[k] = nr; improved = true; break; }
        }
      }
      // Áthelyezés járatok között
      const base = total(routes);
      outer: for (let a = 0; a < routes.length; a++) for (let i = 0; i < routes[a].length; i++) {
        const id = routes[a][i];
        for (let b = 0; b < routes.length; b++) {
          if (a !== b && routes[b].reduce((s, x) => s + rakl[x], 0) + rakl[id] > kap) continue;
          for (let pos = 0; pos <= routes[b].length; pos++) {
            if (a === b && (pos === i || pos === i + 1)) continue;
            const cp = routes.map(r => r.slice());
            cp[a].splice(i, 1);
            const tpos = a === b && pos > i ? pos - 1 : pos;
            cp[b].splice(tpos, 0, id);
            const c = total(cp);
            if (c < base - 1e-6) { routes = cp.filter(r => r.length); improved = true; break outer; }
          }
        }
      }
    }
    return routes.filter(r => r.length);
  };

  /* ================= 3. Raktár: slotting és szedés ================= */
  const W = {};
  W.helyek = (function () {
    let cache = null;
    return function () {
      if (cache) return cache;
      const L = D.RAKTAR_LAYOUT, out = [];
      L.folyosok.forEach((f, k) => {
        for (const oldal of ["B", "J"]) for (let b = 1; b <= L.rekesz; b++) {
          const n = oldal === "B" ? b : b + L.rekesz;
          out.push({
            kod: f + "-" + String(n).padStart(2, "0"), folyoso: f, fIdx: k, oldal, rekesz: b,
            x: L.elsoFolyoso + k * L.folyosoKoz, y: L.elotér + (b - 0.5) * L.rekeszHossz
          });
        }
      });
      out.forEach(h => (h.egyszeres = 2 * h.x + 2 * h.y));
      cache = out;
      return out;
    };
  })();
  W.folyosoHossz = function () { const L = D.RAKTAR_LAYOUT; return 2 * L.elotér + L.rekesz * L.rekeszHossz; };

  W.termekek = (function () {
    let cache = null;
    return function () {
      if (cache) return cache;
      const rng = mulberry32(20261016);
      const n = D.TERMEK_NEVEK.length;
      // Népszerűség: hatványfüggvény (Pareto-jellegű), a kódokhoz véletlenszerűen keverve
      const base = Array.from({ length: n }, (_, i) => Math.round(260 * Math.pow(i + 1, -1.35)) + 1);
      const perm = Array.from({ length: n }, (_, i) => i);
      for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
      cache = D.TERMEK_NEVEK.map((nev, i) => ({ kod: "T" + String(i + 1).padStart(2, "0"), nev, suly: base[perm[i]] }));
      return cache;
    };
  })();

  W.rendelesek = (function () {
    let cache = null;
    return function () {
      if (cache) return cache;
      const rng = mulberry32(7), T = W.termekek();
      const tot = T.reduce((s, t) => s + t.suly, 0), out = [];
      const pick = () => { let r = rng() * tot; for (const t of T) { r -= t.suly; if (r <= 0) return t.kod; } return T[T.length - 1].kod; };
      for (let o = 0; o < 150; o++) {
        const nl = 1 + Math.floor(rng() * rng() * 5); // többnyire 1-2 sor, néha 4-5
        const s = new Set(); let guard = 0;
        while (s.size < nl && guard++ < 50) s.add(pick());
        out.push([...s]);
      }
      cache = out;
      return out;
    };
  })();

  // Szedési gyakoriság (sor) termékenként a rendelésállományból
  W.gyakorisag = function () {
    const g = {}; W.termekek().forEach(t => (g[t.kod] = 0));
    W.rendelesek().forEach(o => o.forEach(k => g[k]++));
    return g;
  };
  W.abc = function () {
    const g = W.gyakorisag(), T = W.termekek().slice().sort((a, b) => g[b.kod] - g[a.kod]);
    const tot = T.reduce((s, t) => s + g[t.kod], 0);
    let kum = 0;
    return T.map((t, i) => {
      kum += g[t.kod];
      const k = 100 * kum / tot;
      return { kod: t.kod, nev: t.nev, sor: g[t.kod], kum: k, osztaly: k - 100 * g[t.kod] / tot < 80 ? "A" : k - 100 * g[t.kod] / tot < 95 ? "B" : "C", rang: i + 1 };
    });
  };
  W.topArany = function (szazalek) {
    const a = W.abc(), n = Math.round(a.length * szazalek / 100);
    return a[n - 1].kum;
  };

  // Kezdő elrendezés: a termékek kódsorrendben, ahogy annak idején beérkeztek
  W.kezdo = function () {
    const H = W.helyek(), T = W.termekek(), lay = {};
    H.forEach((h, i) => (lay[h.kod] = T[i] ? T[i].kod : null));
    return lay;
  };
  W.abcElrendezes = function () {
    const H = W.helyek().slice().sort((a, b) => a.egyszeres - b.egyszeres || a.x - b.x);
    const A = W.abc(), lay = {};
    W.helyek().forEach(h => (lay[h.kod] = null));
    A.forEach((t, i) => (lay[H[i].kod] = t.kod));
    return lay;
  };

  // Egy rendelés útja (m): "visszafordulós" vagy "kígyózó" (S-alakú) bejárás
  W.rendelesUt = function (helyek, mod) {
    if (!helyek.length) return 0;
    const byF = {};
    helyek.forEach(h => { byF[h.fIdx] = Math.max(byF[h.fIdx] || 0, h.y); });
    const fIdx = Object.keys(byF).map(Number).sort((a, b) => a - b);
    const L = D.RAKTAR_LAYOUT;
    const maxX = L.elsoFolyoso + fIdx[fIdx.length - 1] * L.folyosoKoz;
    if (mod === "kigyo") {
      const n = fIdx.length, full = W.folyosoHossz();
      if (n % 2 === 0) return 2 * maxX + n * full;
      return 2 * maxX + (n - 1) * full + 2 * byF[fIdx[n - 1]];
    }
    return 2 * maxX + fIdx.reduce((s, k) => s + 2 * byF[k], 0);
  };
  W.ertekel = function (lay, mod) {
    const helyByTermek = {}, Hk = {};
    W.helyek().forEach(h => (Hk[h.kod] = h));
    for (const k in lay) if (lay[k]) helyByTermek[lay[k]] = Hk[k];
    let ut = 0, sorok = 0, hianyzik = 0;
    for (const o of W.rendelesek()) {
      const hs = o.map(t => helyByTermek[t]).filter(Boolean);
      hianyzik += o.length - hs.length;
      ut += W.rendelesUt(hs, mod); sorok += o.length;
    }
    const L = D.RAKTAR_LAYOUT, n = W.rendelesek().length;
    const idoS = ut / L.sebesseg + sorok * L.sorIdo + n * L.rendelesIdo;
    return { ut, atlagUt: ut / n, sorok, rendeles: n, sorPerOra: sorok / (idoS / 3600), hianyzik };
  };

  /* ================= AI-válaszok értelmezése ================= */
  const P = {};
  // "NYITOTT: Budapest-Gyál, Debrecen" vagy kódok (R1, R4)
  P.raktarak = function (txt) {
    const found = new Set();
    const t = (txt || "").toLowerCase();
    for (const r of D.RAKTARAK) {
      if (new RegExp("\\b" + r.id.toLowerCase() + "\\b").test(t)) found.add(r.id);
      const nev = r.rov.toLowerCase();
      if (t.includes(nev)) found.add(r.id);
    }
    if (/budapest/.test(t)) found.add("R1");
    return D.RAKTARAK.filter(r => found.has(r.id)).map(r => r.id);
  };
  // Járatok: soronként egy járat, megállókódokkal (S03) vagy településnevekkel
  P.jaratok = function (txt) {
    const lines = (txt || "").split(/\n|;/);
    const out = [];
    const names = D.MEGALLOK.map(s => ({ id: s.id, re: new RegExp(s.nev.replace(/[.]/g, "").toLowerCase()) }));
    for (const line of lines) {
      const l = line.toLowerCase();
      const hits = [];
      const codeRe = /\bs\s?-?(\d{1,2})\b/g; let m;
      while ((m = codeRe.exec(l))) {
        const id = "S" + String(Number(m[1])).padStart(2, "0");
        if (D.MEGALLOK.some(s => s.id === id)) hits.push({ pos: m.index, id });
      }
      if (!hits.length) {
        for (const n of names) {
          const re = new RegExp(n.re.source, "g");
          while ((m = re.exec(l))) hits.push({ pos: m.index, id: n.id });
        }
        // "Budapest XIII." vs. depó "Budapest": a XIII-at csak a kerülettel együtt fogadjuk el
      }
      hits.sort((a, b) => a.pos - b.pos);
      const ids = hits.map(h => h.id).filter((id, i, a) => i === 0 || a[i - 1] !== id);
      if (ids.length) out.push(ids);
    }
    return out;
  };
  // Slotting: "T07 -> A01" párok
  P.slotting = function (txt) {
    const out = [], re = /\b(T\s?\d{1,2})\b[^A-Za-z0-9\n]{0,12}\b[Ff]\s?([1-3])\s?[-–. ]?\s?(\d{1,2})\b/g;
    let m;
    while ((m = re.exec(txt || ""))) {
      const t = "T" + String(Number(m[1].replace(/\D/g, ""))).padStart(2, "0");
      const h = "F" + m[2] + "-" + String(Number(m[3])).padStart(2, "0");
      out.push({ termek: t, hely: h });
    }
    return out;
  };
  // Számok kigyűjtése magyar szövegből: "12,5", "1 250", "92%"
  P.szamok = function (txt) {
    const out = [], re = /(\d{1,3}(?:[  .]\d{3})+|\d+)(?:,(\d+))?\s?(%|M\s?Ft|millió|Ft|km|m\b|perc|óra|db|raklap)?/gi;
    let m;
    while ((m = re.exec(txt || ""))) {
      const ip = m[1].replace(/[  .]/g, "");
      const v = Number(ip + (m[2] ? "." + m[2] : ""));
      if (!isNaN(v)) out.push({ szoveg: m[0].trim(), ertek: v, start: m.index, end: m.index + m[0].length });
    }
    return out;
  };
  // Egy szám "igazolható", ha ±2%-on (vagy kerekítésen) belül egyezik egy ismert értékkel
  P.ellenoriz = function (txt, ismert) {
    const nums = P.szamok(txt);
    return nums.map(n => {
      let hit = null;
      // felsorolás-számok (1., 2., 3.) és kis egészek mértékegység nélkül: semlegesek
      const after = (txt || "").slice(n.end, n.end + 2);
      if (Number.isInteger(n.ertek) && n.ertek <= 5 && !/%|ft|km|m\b/i.test(n.szoveg) && (/^\./.test(after) || n.ertek <= 5)) return Object.assign(n, { talalat: null, semleges: true });
      for (const k of ismert) {
        const v = k.ertek;
        if (v === 0 && n.ertek === 0) { hit = k; break; }
        const tol = Math.max(Math.abs(v) * 0.02, 0.051);
        if (Math.abs(n.ertek - v) <= tol || Math.abs(n.ertek - Math.round(v)) < 0.01) { hit = k; break; }
      }
      // évszámok, sorszámok, kis egész felsorolások: semlegesek
      const semleges = !hit && ((n.ertek >= 2020 && n.ertek <= 2030 && Number.isInteger(n.ertek)) || (n.ertek <= 5 && Number.isInteger(n.ertek) && !/%|ft|km/i.test(n.szoveg)));
      return Object.assign(n, { talalat: hit, semleges });
    });
  };

  LT.core = { haversine, mulberry32, projector, fmt, idoPerc, H, V, W, P };
})(typeof window !== "undefined" ? window : globalThis);
