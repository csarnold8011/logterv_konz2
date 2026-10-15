/* 2. feladat: napi terítőjáratok tervezése (kapacitás- és időablak-korlátos VRP) */
(function () {
  const LT = (window.LT = window.LT || {});
  LT.missions = LT.missions || {};
  const SZ = ["#005f92", "#a1772b", "#007548", "#f08681", "#00afa9", "#38ac55", "#008cc7", "#6f6f6f"];
  const LBL = { S01: "w", S02: "w", S03: "w", S13: "w", S11: "w", S12: "s", S05: "e", S06: "e", S08: "s", S10: "s" };

  LT.missions.m2 = function (root) {
    const { esc, $, $$, my, kesz, vote, tippKesz, board, ai, szoveg, kapu, step, kpi, submit, toast } = LT.ui;
    const D = LT.data, V = LT.core.V, f = LT.core.fmt;
    const A = { jarmu: "kicsi", idoablak: true }; // a verseny forgatókönyve
    const osszRakl = D.MEGALLOK.reduce((s, x) => s + x.rakl, 0);
    const sajatKesz = () => kesz("m2_kezi");
    let routes = my.get("m2_routes", [[]]);
    let aktiv = Math.min(my.get("m2_aktiv", 0), routes.length - 1);
    const nn = V.legkozelebbi(A), nnE = V.ertekel(nn, A);
    let cw = null;
    const getCw = () => (cw = cw || V.megtakaritasos(A));

    root.innerHTML = `
      <div class="mission-head mh-2"><div class="eyebrow">2. feladat · Járattervezés</div>
        <h2>Holnap reggel 7-kor indulnak az autók. Merre menjenek?</h2>
        <p>A gyáli raktárból holnap ${D.MEGALLOK.length} vevőhöz kell összesen ${osszRakl} raklapot kivinni. Négy vevőnek határideje is van. A diszpécser eddig „mindig a legközelebbi következő” szabállyal tervezett. Tudsz jobbat?</p></div>

      <div class="card">
        <h3>A szabályok</h3>
        <div class="grid g2e">
          <ul class="tight">
            <li>Jármű: <b>${D.JARMUVEK.kicsi.nev}</b>, napi fix ${f.ft(D.JARMUVEK.kicsi.fix)}, ${D.JARMUVEK.kicsi.perKm} Ft/km</li>
            <li>Indulás 07:00, átlagsebesség ${D.VRP_ALAP.sebesseg} km/h, kirakodás ${D.VRP_ALAP.kirakas} perc/megálló</li>
            <li>16:00 után túlóra: ${f.ft(D.VRP_ALAP.tulora)}/óra</li>
          </ul>
          <ul class="tight">
            <li>Késés egy határidős vevőnél: ${f.ft(D.VRP_ALAP.kesesBunt)} (kötbér és elégedetlenség)</li>
            <li>Egy járat rakománya nem lépheti túl a ${D.JARMUVEK.kicsi.kap} raklapot</li>
            <li>Minden vevőt pontosan egyszer kell felkeresni</li>
          </ul>
        </div>
        <div class="note info"><b>A térkép jelölései:</b> a <b>körben lévő szám</b> az adott vevőnek szállítandó <b>raklapok száma</b>. A ⏰ a határidő (eddig kell odaérni). Ha egy vevő már járatban van, mellette például <b>2/3</b> áll: a 2. járat 3. megállója. A sötét négyzet a gyáli raktár, innen indul és ide tér vissza minden autó. A kék sáv a Duna.</div>
        <div class="note info"><b>A verseny szabálya:</b> a <b>napi összköltség</b> számít: autók napi fix díja + km-díj + késések kötbére + túlóra. A késés tehát pénzben is megjelenik.</div>
      </div>


      <details class="box modszer"><summary><span class="ikon">Σ</span><span>Módszertan: hogyan tervez járatokat az algoritmus?<small>VRP, költségfüggvény, legközelebbi szomszéd, Clarke–Wright megtakarítás, 2-opt és áthelyezés</small></span></summary><div class="tartalom">
        <h4>1. A feladat: kapacitás- és időablak-korlátos járattervezés</h4>
        <p>Ez a <b>járattervezési feladat</b> (Vehicle Routing Problem, VRP) egy változata: több autó, mindegyiknek kapacitáskorlátja van (CVRP), és néhány vevőnél határidő is van (VRPTW). A feladat <b>NP-nehéz</b>: a lehetséges tervek száma a vevők számával robbanásszerűen nő. Már egyetlen autó 16 vevőjének sorrendje is 16! ≈ 2 × 10<sup>13</sup> lehetőség, ezért a gyakorlatban <b>heurisztikákat</b> használnak: gyors, jó, de nem garantáltan optimális eljárásokat.</p>
        <h4>2. Mit számol az oldal egy tervnél?</h4>
        <div class="keplet-sor">napi költség = autók száma × fix díj + összes km × km-díj + késések × kötbér + túlóra-órák × túlóradíj</div>
        <ul class="tight">
          <li><b>Távolság:</b> a légvonal 1,3-szorosa (közúti szorzó).</li>
          <li><b>Idő:</b> indulás 07:00; menetidő = km / 45 km/h; minden vevőnél 20 perc kirakodás. Az oldal minden vevőnél kiszámolja az érkezést, és összeveti a határidővel.</li>
          <li><b>Érvényesség:</b> minden vevő pontosan egyszer szerepel, és egy autó rakománya legfeljebb a kapacitás.</li>
          <li><b>Alsó korlát az autószámra:</b> ⌈összes raklap / kapacitás⌉ = ⌈43 / 12⌉ = 4. Ennél kevesebb autóval biztosan nem megy.</li>
        </ul>
        <h4>3. Legközelebbi szomszéd (a diszpécser szabálya)</h4>
        <p>Az autó mindig a legközelebbi, még ki nem szolgált vevőhöz megy, amíg van hely; ha megtelt, visszamegy, és indul a következő autó. <b>Előny:</b> egyszerű, fejben is megy. <b>Hátrány:</b> mohó, vagyis a korai jó döntések miatt a járatok végén hosszú, „hazafelé” vezető utak maradnak, és az időablakokat egyáltalán nem nézi.</p>
        <h4>4. Clarke–Wright megtakarításos módszer</h4>
        <p>Kiindulás: minden vevőhöz külön autó megy (raktár → vevő → raktár). Ezután minden vevőpárra kiszámolja, mennyit spórolnánk, ha egy járatba tennénk őket:</p>
        <div class="keplet-sor">s(i, j) = d(raktár, i) + d(raktár, j) − d(i, j)</div>
        <p>A párokat a megtakarítás szerint csökkenő sorrendben végignézi, és két járatot összevon, ha (1) <i>i</i> és <i>j</i> a járatuk végén áll, (2) az összevont rakomány belefér az autóba, és (3) a teljes költség (a késést és a túlórát is beleértve) csökken.</p>
        <h4>5. Helyi javítás</h4>
        <ul class="tight">
          <li><b>2-opt:</b> egy járaton belül megfordít egy szakaszt. Ha két útszakasz keresztezi egymást, ez kiegyenesíti, és rövidebb lesz.</li>
          <li><b>Áthelyezés:</b> egy vevőt átrak egy másik járatba vagy másik pozícióba, ha ez csökkenti az összköltséget és a kapacitás engedi.</li>
        </ul>
        <p>A javító lépéseket addig ismétli, amíg van javulás. Az eredmény <b>lokális optimum</b>: egyetlen ilyen lépéssel már nem javítható, de nem biztos, hogy a legjobb létező terv.</p>
        <h4>6. Mit nem tud?</h4>
        <ul class="tight">
          <li>Nem garantál optimumot. Pontos megoldást egészértékű programozás (például oszlopgenerálás) adna, de nagy feladatnál az nagyon lassú. Ipari eszközök (például Google OR-Tools) metaheurisztikákat használnak, amelyek a lokális optimumból is kitörnek.</li>
          <li>Nincs forgalom, nincs változó menetidő, nincs vezetési idő szabály, nincsenek rakodási korlátok.</li>
        </ul>
      </div></details>

      <div class="card" id="m2-tipp">${step("1 · Tipp", "tipp", "Hány autó kell?", "+5 pont, ha bejön")}</div>

      <div class="card" id="m2-sajat">
        ${step("2 · Saját megoldás", "verseny", "Rajzold meg a járatokat!", "verseny: legkisebb napi költség")}
        <p><b>Kattints a vevőkre</b> abban a sorrendben, ahogy az autó felkeresi őket. Új autóhoz nyomd meg az „Új járat” gombot. Egy már beosztott vevőre kattintva kiveheted a járatából. A járatkártyára kattintva arra a járatra váltasz. <b>Egyszer küldheted be</b>, addig szabadon kísérletezhetsz.</p>
        <div class="grid g2">
          <div>
            <div class="map-wrap"><div id="m2-map"></div>
              <div class="legend"><span>■ raktár (indulás, érkezés)</span><span><i style="background:var(--ink-3);border-radius:50%"></i>még nincs járatban</span><span>szám a körben: raklap</span><span>⏰ határidő</span><span>2/3: 2. járat, 3. megálló</span></div></div>
            <div class="btn-row" id="m2-gombok"></div>
          </div>
          <div>
            <div id="m2-kpi"></div>
            <div class="routes" id="m2-routes"></div>
            <div id="m2-hiba"></div>
            <div class="btn-row" id="m2-kuld"></div>
            <h4>Járat-verseny</h4><div id="m2-board"></div>
          </div>
        </div>
      </div>

      <div id="m2-ai"></div>

      <div class="card" id="m2-algo">
        ${step("4 · Algoritmus", "algo", "Diszpécser-szabály kontra megtakarításos módszer")}
        <p>Két klasszikus heurisztika: a <b>legközelebbi szomszéd</b> (mindig a legközelebbi még ki nem szolgált vevőhöz megy, amíg van hely; ez a diszpécser mai módszere), és a <b>Clarke–Wright megtakarításos módszer</b> (két vevőt akkor tesz egy járatba, ha ezzel sokat spórol a külön-külön kiszolgáláshoz képest), utána helyi javítással. Egyik sem garantál optimumot, de a második jellemzően közel jár hozzá.</p>
        <div class="btn-row"><button class="btn primary" id="m2-algo-btn">Heurisztikák futtatása</button></div>
        <div id="m2-algo-out"></div>
      </div>

      <div class="card">
        ${step("5 · Két paraméterezés", "tipp", "Kis vagy nagy teherautó? Határidővel vagy anélkül?", "+5 pont, ha bejön")}
        <div id="m2-nagy-tipp"></div>
        <div id="m2-scen-blokk" style="margin-top:10px"><div class="btn-row"><button class="btn primary" id="m2-scen">Négy forgatókönyv futtatása</button></div>
        <div id="m2-scen-out"></div></div>
      </div>

      <div class="card" id="m2-dontes-kartya">
        ${step("6 · Döntés", "algo", "Mit javasolsz a fuvarszervezésre?", "+2 pont")}
        <p>Melyik járműtípust és tervezési módszert javaslod, mennyi a napi költség, hány vevő kapja meg időben az árut? Ez is megjelenik a 4. feladat vezetői összefoglalójában.</p>
        <div id="m2-dontes"></div>
      </div>`;

    const tippW = vote($("#m2-tipp", root), Object.assign({ mod: "tipp" }, LT.ACT.m2_tipp, {
      magyarazat: () => `Alsó korlát: ${osszRakl} raklap / 12 = ${f.num(osszRakl / 12, 2)}, tehát legalább ${Math.ceil(osszRakl / 12)} autó kell. A megtakarításos módszer ennyivel meg is oldja, késés nélkül.`
    }));

    /* ---- Térkép ---- */
    const proj = LT.core.projector(47.45, 19.25), K = 6;
    const P = p => { const q = proj(p); return { x: q.x * K, y: q.y * K }; };
    const stopById = {}; D.MEGALLOK.forEach(s => (stopById[s.id] = s));
    function mapSvg(rs, opts) {
      opts = opts || {};
      const dep = P(D.DEPO);
      let s = `<svg viewBox="-290 -255 590 480" role="img" aria-label="Budapest környéki vevők és járatok">`;
      const duna = [[47.80, 19.00], [47.78, 19.13], [47.70, 19.08], [47.60, 19.06], [47.50, 19.05], [47.40, 19.03], [47.30, 18.95], [47.15, 18.97], [47.08, 18.93]];
      s += `<polyline points="${duna.map(([lat, lon]) => { const q = P({ lat, lon }); return q.x + "," + q.y; }).join(" ")}" fill="none" stroke="#7fb2d6" stroke-width="7" stroke-opacity=".45" stroke-linejoin="round" pointer-events="none"></polyline>`;
      const hova = {};
      rs.forEach((r, k) => {
        if (!r.length) return;
        const pts = [dep].concat(r.map(id => P(stopById[id])), [dep]);
        s += `<polyline points="${pts.map(q => q.x + "," + q.y).join(" ")}" fill="none" stroke="${SZ[k % SZ.length]}" stroke-width="${k === opts.aktiv ? 4 : 2.6}" stroke-opacity=".85" stroke-linejoin="round" pointer-events="none"></polyline>`;
        r.forEach((id, i) => (hova[id] = { k, i }));
      });
      for (const st of D.MEGALLOK) {
        const q = P(st), h = hova[st.id];
        const c = h ? SZ[h.k % SZ.length] : "var(--ink-3)";
        s += `<g class="${opts.kattinthato ? "clickable" : ""}" data-s="${st.id}" ${opts.kattinthato ? `tabindex="0" role="button" aria-label="${esc(st.nev)}, ${st.rakl} raklap"` : ""}>
          <circle cx="${q.x}" cy="${q.y}" r="13" fill="${c}" stroke="var(--panel)" stroke-width="2"></circle>
          <text x="${q.x}" y="${q.y + 4}" text-anchor="middle" font-size="11" font-weight="800" style="fill:#fff" stroke="#0f0f0f" stroke-width="2.4" paint-order="stroke">${st.rakl}</text>
          <text x="${q.x + ({ w: -17, e: 17 }[LBL[st.id]] || 0)}" y="${q.y + ({ w: 4, e: 4, s: 28 }[LBL[st.id]] || -17)}" text-anchor="${{ w: "end", e: "start" }[LBL[st.id]] || "middle"}" font-size="10.5" font-weight="600">${esc(st.nev)}${st.hatarido ? " ⏰" + st.hatarido : ""}</text>
          ${h ? `<text x="${q.x + (LBL[st.id] === "e" ? -24 : 14)}" y="${q.y + (LBL[st.id] === "s" ? -14 : 15)}" font-size="9.5" font-weight="700" style="fill:${c}">${h.k + 1}/${h.i + 1}</text>` : ""}
          <title>${esc(st.nev)}: ${st.rakl} raklap${st.hatarido ? ", határidő " + st.hatarido : ""}</title>
        </g>`;
      }
      s += `<rect x="${dep.x - 11}" y="${dep.y - 11}" width="22" height="22" rx="3" fill="var(--brand)" stroke="var(--accent)" stroke-width="2.5" pointer-events="none"></rect>
        <text x="${dep.x + 15}" y="${dep.y - 10}" font-size="10.5" font-weight="800" pointer-events="none">Raktár (Gyál)</text>`;
      return s + "</svg>";
    }

    function jaratKartyak(e, rs, opts) {
      opts = opts || {};
      return rs.map((r, k) => {
        const d = e.reszletek.find(x => x.jarat.join() === r.join() && r.length);
        const late = d ? d.erkezesek.filter(a => a.kesik).map(a => stopById[a.id].nev) : [];
        return `<div class="route ${k === opts.aktiv ? "active" : ""}" style="--c:${SZ[k % SZ.length]}" data-k="${k}">
          <b>${k + 1}. járat</b> ${d ? `<span class="tag ${d.tulterhelt ? "bad" : ""}">${d.rakl}/${D.JARMUVEK[opts.jarmu || "kicsi"].kap} raklap</span><span class="tag">${f.num(d.km, 0)} km</span><span class="tag ${d.tul > 0 ? "bad" : ""}">vissza ${f.ido(d.visszaerkezes)}</span>${late.length ? `<span class="tag bad">késés: ${esc(late.join(", "))}</span>` : ""}` : "<small>üres: kattints vevőkre a térképen</small>"}
          <div class="seq">${r.length ? "Raktár → " + r.map(id => esc(stopById[id].nev)).join(" → ") + " → Raktár" : ""}</div></div>`;
      }).join("");
    }
    function kpiSor(e, ref) {
      return `<div class="kpis">
        ${kpi("Napi összköltség", f.ft(e.ossz), ref ? 100 * (e.ossz / ref.ossz - 1) : null, true)}
        ${kpi("Járművek", e.jarmuDb + " db")}
        ${kpi("Összes km", f.num(e.km, 0) + " km")}
        ${kpi("Időben teljesítve", f.pct(e.idobenArany, 0))}
        ${kpi("Kihasználtság", f.pct(e.kihasznaltsag, 0))}
      </div>`;
    }

    let aktE = null;
    function render() {
      const lezart = sajatKesz();
      if (lezart && my.get("m2_bekuldott")) routes = my.get("m2_bekuldott").routes.map(r => r.slice());
      if (!routes.length) routes = [[]];
      aktiv = Math.max(0, Math.min(aktiv, routes.length - 1));
      if (!lezart) { LT.api.store.set(my.key("m2_routes"), routes); LT.api.store.set(my.key("m2_aktiv"), aktiv); }
      const e = (aktE = V.ertekel(routes, A));
      $("#m2-map", root).innerHTML = mapSvg(routes, { aktiv: lezart ? -1 : aktiv, kattinthato: !lezart });
      if (!lezart) $$("#m2-map [data-s]", root).forEach(g => {
        const act = () => {
          const id = g.dataset.s;
          const k = routes.findIndex(r => r.includes(id));
          if (k >= 0) routes[k] = routes[k].filter(x => x !== id);
          else routes[aktiv].push(id);
          render();
        };
        g.addEventListener("click", act);
        g.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); act(); } });
      });
      const keszDb = D.MEGALLOK.length - e.hianyzo.length;
      $("#m2-kpi", root).innerHTML = kpiSor(e, nnE) + `<small>Beosztva: ${keszDb}/${D.MEGALLOK.length} vevő. A változás a diszpécser mai tervéhez képest értendő (${f.ft(nnE.ossz)}).</small>`;
      $("#m2-routes", root).innerHTML = jaratKartyak(e, routes, { aktiv: lezart ? -1 : aktiv });
      if (!lezart) $$("#m2-routes [data-k]", root).forEach(c => c.onclick = () => { aktiv = Number(c.dataset.k); render(); });
      const bontas = `Fuvarköltség ${f.ft(e.fuvar)} + késés és túlóra ${f.ft(e.bunt)}`;
      $("#m2-hiba", root).innerHTML = e.ervenyes ? `<div class="note ok"><b>Érvényes terv.</b> ${bontas}.</div>` : `<div class="note warn"><b>Még nem beküldhető:</b> ${e.hibak.map(esc).join("; ")}.</div>`;
      $("#m2-gombok", root).innerHTML = lezart ? "" : `<button class="btn primary" id="m2-uj">+ Új járat</button><button class="btn" id="m2-undo">Utolsó megálló vissza</button><button class="btn small" id="m2-torol">Minden törlése</button>`;
      $("#m2-kuld", root).innerHTML = lezart
        ? `<div class="note ok"><b>Beküldve, véglegesen:</b> ${e.jarmuDb} autó, ${f.num(e.km, 0)} km, ${f.ft(e.ossz)}.</div>`
        : `<button class="btn accent" id="m2-send" ${e.ervenyes ? "" : "disabled"}>Beküldés (végleges)</button>`;
      if (!lezart) {
        $("#m2-uj", root).onclick = () => { if (routes[routes.length - 1].length === 0) aktiv = routes.length - 1; else { routes.push([]); aktiv = routes.length - 1; } render(); };
        $("#m2-undo", root).onclick = () => { routes[aktiv].pop(); render(); };
        $("#m2-torol", root).onclick = () => { if (confirm("Törlöd az összes járatot?")) { routes = [[]]; aktiv = 0; render(); } };
        $("#m2-send", root).onclick = bekuld;
      }
    }
    async function bekuld() {
      const e = aktE;
      if (!e || !e.ervenyes || sajatKesz()) return;
      if (!confirm(`Beküldöd ezt a tervet (${e.jarmuDb} autó, ${f.ft(e.ossz)})? Utána nem módosítható.`)) return;
      const rec = { ossz: e.ossz, km: e.km, jarmuDb: e.jarmuDb, idoben: e.idobenArany, kihaszn: e.kihasznaltsag, routes: routes.filter(r => r.length) };
      LT.api.store.set(my.key("m2_bekuldott"), rec);
      LT.api.store.set(my.key("m2_best"), rec);
      my.set("kesz_m2_kezi", true);
      render();
      await submit({ activity: "m2_kezi", kind: "result", value: Math.round(e.ossz), dir: "min", text: `${e.jarmuDb} autó, ${f.num(e.km, 0)} km, ${e.kesesDb} késés` }, "Járatterv beküldve a versenybe");
    }
    board($("#m2-board", root), "m2_kezi", { mertek: "Ft/nap", fmt: v => f.num(v), reszlet: true });
    render();
    kapu($("#m2-sajat", root), [{ kesz: tippKesz("m2_tipp"), szoveg: "Előbb véglegesítsd a tippedet az 1. lépésben." }]);

    /* ---- AI ---- */
    ai($("#m2-ai", root), Object.assign({}, LT.ACT.m2_ai, {
      cim: "3 · AI: tervezze meg ő is!",
      bevezeto: "A nyelvi modellek meggyőzően írnak útvonalat, de a távolságokat és a kapacitást gyakran nem számolják végig. Nézzük meg, mennyire jó az AI terve, ha az oldal pontosan újraszámolja!",
      kapu: [{ kesz: tippKesz("m2_tipp"), szoveg: "Előbb véglegesítsd a tippedet." }, { kesz: sajatKesz, szoveg: "Előbb küldd be a saját járattervedet a 2. lépésben." }],
      magyarazat: [
        ["Szerep", "„Járattervező diszpécser vagy”: a gyakorlati, költségtudatos nézőpont."],
        ["Adatok", "Minden vevő kódja, raklapszáma és határideje, valamint a teljes közúti távolságmátrix. A mátrix azért kell, mert enélkül az AI légvonalat vagy kitalált távolságot használna."],
        ["Szabályok", "Kapacitás, indulás, sebesség, kirakodási idő, túlóra és késési kötbér. Ugyanazok, mint a te versenyedben."],
        ["Feladat és cél", "A napi összköltség minimalizálása, két kemény korláttal: minden vevő pontosan egyszer, egy autó legfeljebb 12 raklap."],
        ["Válaszformátum", "„1. JÁRAT: D - S01 - S02 - D” sorok, majd ÖSSZES KM és BECSÜLT NAPI KÖLTSÉG. Az oldal ebből rajzolja ki és számolja újra a tervet."],
        ["Mire figyelj?", "Tipikus hiba a túlterhelt járat, a kimaradt vagy kétszer szereplő vevő, és az elszámolt km. A határidőket az AI ritkán ellenőrzi."]
      ],
      prompt: () => {
        const ids = ["D"].concat(D.MEGALLOK.map(s => s.id));
        const mx = ids.map(a => (a === "D" ? "D  " : a) + ": " + ids.map(b => String(Math.round(V.km(a, b))).padStart(3)).join(" ")).join("\n");
        return `Járattervező diszpécser vagy. Egy raktárból (D = raktár, Gyál) holnap ${D.MEGALLOK.length} vevőhöz kell árut vinni.

VEVŐK (kód, név, raklap, határidő):
${D.MEGALLOK.map(s => `${s.id} ${s.nev}: ${s.rakl} raklap${s.hatarido ? ", legkésőbb " + s.hatarido + "-ig kell odaérni" : ""}`).join("\n")}

JÁRMŰ: ${D.JARMUVEK.kicsi.kap} raklapos teherautó, napi fix ${D.JARMUVEK.kicsi.fix} Ft, ${D.JARMUVEK.kicsi.perKm} Ft/km. Annyi autót használhatsz, amennyit akarsz.
IDŐ: indulás 07:00, átlag ${D.VRP_ALAP.sebesseg} km/h, kirakodás ${D.VRP_ALAP.kirakas} perc/vevő, 16:00 után túlóra (${D.VRP_ALAP.tulora} Ft/óra). Késés egy határidős vevőnél: ${D.VRP_ALAP.kesesBunt} Ft.

KÖZÚTI TÁVOLSÁGOK (km), sorok és oszlopok sorrendje: ${ids.join(" ")}
${mx}

FELADAT: Tervezd meg a járatokat úgy, hogy a teljes napi költség (fix + km-díj + késés + túlóra) minimális legyen. Minden vevőt pontosan egyszer keress fel, és egy autó rakománya ne lépje túl a ${D.JARMUVEK.kicsi.kap} raklapot.
VÁLASZ FORMÁTUMA (pontosan így, minden járat külön sorban, a vevőkódokkal):
1. JÁRAT: D - S01 - S02 - D
2. JÁRAT: D - ... - D
ÖSSZES KM: <szám>
BECSÜLT NAPI KÖLTSÉG: <szám> Ft
Utána legfeljebb 4 mondat indoklás.`;
      },
      ertekel: txt => {
        const rs = LT.core.P.jaratok(txt.split(/ÖSSZES|BECSÜLT|INDOKL/i)[0]);
        if (!rs.length) return { html: `<div class="note bad"><b>Nem találtunk járatokat</b> a válaszban. Kérd az „1. JÁRAT: D - S01 - S02 - D” formátumot.</div>`, osszegzes: "értelmezhetetlen" };
        const e = V.ertekel(rs, A);
        const num = re => { const m = txt.match(re); return m ? Number(m[1].replace(/[  .]/g, "").replace(",", ".")) : null; };
        const ckm = num(/ÖSSZES\s*KM[^\d\n]{0,10}(\d[\d  .]*(?:,\d+)?)/i), cft = num(/K[ÖO]LTS[ÉE]G[^\d\n]{0,10}(\d[\d  .]*(?:,\d+)?)/i);
        LT.api.store.set(my.key("m2_ai_eredm"), { ossz: e.ossz, km: e.km, ervenyes: e.ervenyes, jarmuDb: e.jarmuDb, idobenArany: e.idobenArany });
        const kmElt = ckm ? 100 * (ckm / e.km - 1) : null;
        const sajat = my.get("m2_bekuldott");
        const h = `<div class="grid g2e"><div class="map-wrap">${mapSvg(rs, {})}</div><div>
          ${kpiSor(e, nnE)}
          <div class="note ${e.ervenyes ? "ok" : "bad"}"><b>${e.ervenyes ? "Formailag érvényes terv." : "Hibás terv:"}</b> ${e.ervenyes ? "" : e.hibak.map(esc).join("; ")}</div>
          <table><tbody>
            <tr><td>Az AI által állított km</td><td class="n">${ckm !== null ? f.num(ckm, 0) : "nem adta meg"}</td></tr>
            <tr><td><b>Valós km</b> (újraszámolva)</td><td class="n"><b>${f.num(e.km, 0)}</b></td></tr>
            <tr><td>Az AI által állított költség</td><td class="n">${cft !== null ? f.ft(cft) : "nem adta meg"}</td></tr>
            <tr><td><b>Valós napi költség</b></td><td class="n"><b>${f.ft(e.ossz)}</b></td></tr>
            <tr><td>A diszpécser mai terve</td><td class="n">${f.ft(nnE.ossz)}</td></tr>
            ${sajat ? `<tr><td>A te beküldött terved</td><td class="n">${f.ft(sajat.ossz)}</td></tr>` : ""}
          </tbody></table>
          ${kmElt !== null ? `<div class="note ${Math.abs(kmElt) <= 5 ? "ok" : "warn"}"><b>${Math.abs(kmElt) <= 5 ? "A km-becslés rendben van." : "Az AI elszámolta a távolságot:"}</b> ${f.num(Math.abs(kmElt), 0)}%-os eltérés.</div>` : ""}
          ${e.kesesDb ? `<div class="note warn"><b>Késés:</b> ${e.kesesDb} határidős vevőhöz késve érne oda.</div>` : ""}
          </div></div>`;
        return { html: h, value: Math.round(e.ossz), osszegzes: `${e.ervenyes ? "érvényes" : "HIBÁS"}, ${e.jarmuDb} autó, ${f.num(e.km, 0)} km (állított: ${ckm !== null ? f.num(ckm, 0) : "–"}), ${f.ft(e.ossz)}` };
      }
    }));

    /* ---- Algoritmusok ---- */
    function renderAlgo() {
      const c = getCw(), cE = V.ertekel(c, A);
      const sajat = my.get("m2_bekuldott"), aiE = my.get("m2_ai_eredm");
      const sor = (n, e, kiem) => `<tr ${kiem ? 'class="me"' : ""}><td>${n}</td><td class="n">${e ? e.jarmuDb : "–"}</td><td class="n">${e ? f.num(e.km, 0) : "–"}</td><td class="n">${e ? f.pct(e.idoben !== undefined ? e.idoben : e.idobenArany, 0) : "–"}</td><td class="n">${e ? f.ft(e.ossz) : "–"}</td></tr>`;
      $("#m2-algo-out", root).innerHTML = `<div class="grid g2e"><div><div class="map-wrap">${mapSvg(c, {})}</div><small>A megtakarításos módszer terve.</small></div><div>
        <div class="tbl-wrap"><table><thead><tr><th>Terv</th><th class="n">Autó</th><th class="n">km</th><th class="n">Időben</th><th class="n">Napi költség</th></tr></thead><tbody>
          ${sor("Diszpécser (legközelebbi szomszéd)", nnE)}
          ${sor("Megtakarításos módszer + javítás", cE)}
          ${sor("A te terved", sajat, true)}
          ${sor("Az AI terve" + (aiE && !aiE.ervenyes ? " (hibás)" : ""), aiE)}
        </tbody></table></div>
        <div class="routes" style="margin-top:8px">${jaratKartyak(cE, c, {})}</div>
        <div class="note info"><b>Gondold végig:</b> a diszpécser-szabály miért késik a határidős vevőknél? (Mert csak a távolságot nézi, az időt nem.) Mi kellene ahhoz, hogy egy diszpécser fejben is jól tervezzen?</div>
      </div></div>`;
      tippW.reveal(String(cE.jarmuDb));
    }
    $("#m2-algo-btn", root).onclick = () => { LT.api.store.set(my.key("m2_algo"), true); renderAlgo(); };
    kapu($("#m2-algo", root), [{ kesz: tippKesz("m2_tipp"), szoveg: "Előbb véglegesítsd a tippedet." }, { kesz: sajatKesz, szoveg: "Előbb küldd be a saját járattervedet." }]);
    if (my.get("m2_algo")) renderAlgo();

    /* ---- Forgatókönyvek ---- */
    const nagyW = vote($("#m2-nagy-tipp", root), Object.assign({ mod: "tipp" }, LT.ACT.m2_nagy, {
      magyarazat: "Kevesebb autó kell, de a nagyobb jármű fix és km-díja is magasabb, a vevők pedig szétszórtak: a megspórolt fordulók nem hozzák vissza a drágább kilométert."
    }));
    kapu($("#m2-scen-blokk", root), [{ kesz: tippKesz("m2_nagy"), szoveg: "Előbb véglegesítsd a tippedet a nagyobb teherautóról." }]);
    function renderScen() {
      const sc = [
        { n: "A · 12 raklapos, határidőkkel", p: { jarmu: "kicsi", idoablak: true } },
        { n: "B · 18 raklapos, határidőkkel", p: { jarmu: "nagy", idoablak: true } },
        { n: "C · 12 raklapos, határidők nélkül", p: { jarmu: "kicsi", idoablak: false } },
        { n: "D · 18 raklapos, határidők nélkül", p: { jarmu: "nagy", idoablak: false } }
      ].map(s => Object.assign(s, { e: V.ertekel(V.megtakaritasos(s.p), s.p) }));
      const sajat = my.get("m2_bekuldott");
      const sajatB = sajat ? V.ertekel(sajat.routes, { jarmu: "nagy", idoablak: true }) : null;
      const a = sc[0].e.ossz, b = sc[1].e.ossz, d = 100 * (b / a - 1);
      $("#m2-scen-out", root).innerHTML = `<div class="tbl-wrap"><table><thead><tr><th>Forgatókönyv (megtakarításos módszerrel)</th><th class="n">Autó</th><th class="n">km</th><th class="n">Kihasználtság</th><th class="n">Időben</th><th class="n">Napi költség</th></tr></thead><tbody>
        ${sc.map(s => `<tr><td>${s.n}</td><td class="n">${s.e.jarmuDb}</td><td class="n">${f.num(s.e.km, 0)}</td><td class="n">${f.pct(s.e.kihasznaltsag, 0)}</td><td class="n">${f.pct(s.e.idobenArany, 0)}</td><td class="n">${f.ft(s.e.ossz)}</td></tr>`).join("")}
        ${sajatB ? `<tr class="me"><td>A te terved 18 raklapos autókkal (változatlan járatokkal)</td><td class="n">${sajatB.jarmuDb}</td><td class="n">${f.num(sajatB.km, 0)}</td><td class="n">${f.pct(sajatB.kihasznaltsag, 0)}</td><td class="n">${f.pct(sajatB.idobenArany, 0)}</td><td class="n">${f.ft(sajatB.ossz)}</td></tr>` : ""}
        </tbody></table></div>
        <div class="note ${d > 3 ? "warn" : "ok"}"><b>A → B:</b> a nagyobb autóval ${sc[1].e.jarmuDb} autó elég ${sc[0].e.jarmuDb} helyett, a napi költség mégis ${d > 0 ? "+" : ""}${f.num(d, 1)}%-kal változik.</div>
        <div class="note info"><b>A beadandóhoz:</b> ez a táblázat a kért „két különböző paraméterezés” összevetése. Melyiket választanád, ha a költség a fő szempont, és melyiket, ha a vevői határidő a legfontosabb? Mi változik, ha a határidőket elengedjük (C és D)?</div>`;
      nagyW.reveal(d < -3 ? "le" : d > 3 ? "fel" : "egy");
    }
    $("#m2-scen", root).onclick = () => { LT.api.store.set(my.key("m2_scen"), true); renderScen(); };
    if (my.get("m2_scen")) renderScen();

    /* ---- Döntés ---- */
    szoveg($("#m2-dontes", root), Object.assign({}, LT.ACT.m2_dontes, { placeholder: "Javaslatom: …", gomb: "Javaslat beküldése", minSzo: 20, okUzenet: "Javaslat beküldve: +2 pont" }));
    kapu($("#m2-dontes-kartya", root), [{ kesz: sajatKesz, szoveg: "Előbb küldd be a saját járattervedet." }]);
  };
})();
