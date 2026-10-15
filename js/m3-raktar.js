/* 3. feladat: raktári slotting forgási sebesség alapján és szedési útvonal-elemzés */
(function () {
  const LT = (window.LT = window.LT || {});
  LT.missions = LT.missions || {};
  const OSZT = { A: "#f08681", B: "#fdc500", C: "#888888" };

  LT.missions.m3 = function (root) {
    const { esc, $, $$, my, kesz, vote, tippKesz, board, ai, kapu, step, kpi, submit, toast } = LT.ui;
    const D = LT.data, W = LT.core.W, f = LT.core.fmt, L = D.RAKTAR_LAYOUT;
    const HELYEK = W.helyek(), HK = {}; HELYEK.forEach(h => (HK[h.kod] = h));
    const ABC = W.abc(), osztaly = {}, sorDb = {}; ABC.forEach(a => { osztaly[a.kod] = a.osztaly; sorDb[a.kod] = a.sor; });
    const TNEV = {}; W.termekek().forEach(t => (TNEV[t.kod] = t.nev));
    const kezdo = W.kezdo(), kezdoE = W.ertekel(kezdo, "vissza"), kezdoK = W.ertekel(kezdo, "kigyo");
    const sajatKesz = () => kesz("m3_slot");
    let lay = my.get("m3_lay", null) || Object.assign({}, kezdo);
    let sel = null, csere = my.get("m3_csere", 0);
    const abcLatott = () => !!my.get("m3_abc");
    const osszSor = ABC.reduce((s, a) => s + a.sor, 0);

    root.innerHTML = `
      <div class="mission-head mh-3"><div class="eyebrow">3. feladat · Raktártervezés</div>
        <h2>Miért gyalogolnak ennyit a szedők?</h2>
        <p>A gyáli raktár kiszedési zónájában ${W.termekek().length} termék van ${HELYEK.length} polchelyen, három folyosóban. Egy átlagos napon ${W.rendelesek().length} rendelést (${osszSor} szedési sort) szednek ki. A termékek ma kódszám szerint állnak a polcon, „ahogy annak idején beérkeztek”. A raktárvezető szerint ezen lehetne javítani, de nem tudja, mennyit érne.</p></div>

      <div class="card">
        <h3>Hogyan olvasd a raktár rajzát?</h3>
        <div class="grid g2e">
          <div>
            <ul class="tight">
              <li><b>F1, F2, F3:</b> a három <b>folyosó</b>. A szedő ezekben jár, a polcok két oldalon állnak.</li>
              <li><b>Polchely-kód</b> (például <b>F2-05</b>): folyosó és hely. Folyosónként 16 hely van: <b>01–08 a bal</b>, <b>09–16 a jobb</b> oldalon. A kisebb szám van közelebb a folyosó elejéhez, vagyis a kiadóponthoz.</li>
              <li><b>T01…T40:</b> a polcon álló <b>termék</b> kódja (rámutatva látszik a neve és a napi szedési száma).</li>
              <li><b>Kiadópont</b> (bal alsó sötét négyzet): innen indul és ide tér vissza a szedő minden rendeléssel.</li>
            </ul>
          </div>
          <div class="note warn"><b>Ne keverd össze:</b> az F1–F3 a <b>folyosó</b> (hely), az <b>A, B, C</b> pedig a termék <b>ABC-osztálya</b> (milyen gyakran szedik). Az ABC-elemzés után a polchelyek színe az osztályt mutatja: <span class="lamp" style="background:${OSZT.A}"></span>A, <span class="lamp" style="background:${OSZT.B}"></span>B, <span class="lamp" style="background:${OSZT.C}"></span>C.</div>
        </div>
      </div>


      <details class="box modszer"><summary><span class="ikon">Σ</span><span>Módszertan: hogyan mérjük és optimalizáljuk a szedést?<small>Távolságmodell, bejárási szabályok, ABC-slotting mint hozzárendelési feladat, korlátok</small></span></summary><div class="tartalom">
        <h4>1. A cél</h4>
        <div class="keplet-sor">min Σ (minden rendelésre) út(rendelés | elrendezés)</div>
        <p>Az optimalizálandó mennyiség a napi gyaloglás: a 150 rendelés útjainak összege. A döntési változó az <b>elrendezés</b>, vagyis hogy melyik termék melyik polchelyre kerül.</p>
        <h4>2. A távolságmodell</h4>
        <ul class="tight">
          <li>A kiadópont a (0, 0) pontban van, a folyosók eleje előtti keresztfolyosó mellett.</li>
          <li>A folyosók középvonala a kiadóponttól 4, 9 és 14 m-re van; egy rekesz 2,5 m hosszú; a folyosó elején 1,5 m előtér van.</li>
          <li><b>Visszafordulós bejárás:</b> <span class="keplet-sor" style="display:inline-block;margin:2px 0">út = 2 · x<sub>max</sub> + Σ<sub>érintett folyosók</sub> 2 · y<sub>max</sub>(folyosó)</span>, ahol x<sub>max</sub> a legtávolabbi érintett folyosó, y<sub>max</sub> pedig a folyosón belüli legmélyebb tétel.</li>
          <li><b>Kígyózó bejárás:</b> páros számú érintett folyosónál út = 2 · x<sub>max</sub> + n · L (L a teljes folyosóhossz); páratlannál az utolsó folyosóba csak a legmélyebb tételig megy be.</li>
          <li><b>Szedési teljesítmény:</b> idő = út / (1 m/s) + 15 s × sorok + 30 s × rendelések; sor/óra = sorok / idő.</li>
        </ul>
        <h4>3. ABC-slotting: egy hozzárendelési feladat mohó megoldása</h4>
        <p>Minden polchelyhez kiszámoljuk az <b>egyszeres szedési távolságot</b> (oda-vissza a kiadóponttól: 2x + 2y), és a helyeket eszerint rangsoroljuk. A termékeket a <b>forgási sebesség</b> (napi szedési sorok száma) szerint rangsoroljuk. Ezután a legforgalmasabb termék kapja a legjobb helyet, és így tovább.</p>
        <p>Ha minden rendelés egyetlen tételből állna, ez a párosítás <b>bizonyítottan optimális</b> lenne: a nagy gyakoriságot a kis távolsággal kell párosítani (ez a matematikában a rendezési egyenlőtlenség). Többtételes rendeléseknél viszont az út <b>nem bontható fel</b> termékenként: ha két tétel ugyanabban a folyosóban van, a szedő egyszer megy be értük. Ezért az ABC-slotting itt jó, de nem garantáltan a legjobb; egy ügyes kézi elrendezés megverheti.</p>
        <h4>4. Mit nem vesz figyelembe?</h4>
        <ul class="tight">
          <li><b>Együtt rendelt termékek</b> (korreláció): ha két terméket gyakran rendelnek együtt, érdemes egymás mellé tenni (korrelált slotting).</li>
          <li><b>Méret és súly:</b> a gyakorlatban a nehéz termék derékmagasságba, a nagy doboz nagy helyre kerül. Ehhez a <b>COI-index</b> (cube-per-order index: helyigény / szedési gyakoriság) a szokásos szempont; itt minden hely egyforma, ezért csak a gyakoriság számít.</li>
          <li><b>Torlódás:</b> ha minden népszerű termék egy folyosóban van, a szedők akadályozzák egymást.</li>
          <li><b>Átrendezési költség:</b> minden áthelyezés munkaóra; a slottingot ezért időszakosan (például negyedévente) érdemes frissíteni, nem naponta.</li>
        </ul>
      </div></details>

      <div class="card">${step("1 · Tipp", "tipp", "Mennyire koncentrált a szedés?", "+5 pont, ha bejön")}<div id="m3-tipp"></div>
        <div id="m3-abc-blokk" style="margin-top:10px">
          <div class="btn-row"><button class="btn primary" id="m3-abc-btn">ABC-elemzés futtatása</button></div>
          <div id="m3-abc"></div>
        </div></div>

      <div class="card">
        ${step("2 · Így mérünk", "algo", "Hogyan számoljuk a gyaloglást?")}
        <p>A szedő a rendelés minden tételét összeszedi, és visszaviszi a kiadópontra. A versenyben a <b>visszafordulós</b> bejárást használjuk: a szedő a folyosók elején haladó keresztfolyosón megy, minden olyan folyosóba, ahol van tétele, <b>csak a legmélyebb tételéig megy be</b>, ott megfordul, majd továbbmegy. Az alábbi példa egy rendelés útja a <b>mai (kezdő) elrendezésben</b>.</p>
        <div class="grid g2e">
          <div class="map-wrap wh"><div id="m3-pelda"></div></div>
          <div id="m3-pelda-szoveg"></div>
        </div>
        <div class="note info">A napi gyaloglás ennek az összege mind a ${W.rendelesek().length} rendelésre. Ma ez <b>${f.num(kezdoE.ut, 0)} m</b> (${f.num(kezdoE.ut / 1000, 1)} km), rendelésenként átlagosan <b>${f.num(kezdoE.atlagUt, 0)} m</b>. A szedési teljesítmény (sor/óra) a gyaloglásból (1 m/s), soronként ${L.sorIdo} s levételi időből és rendelésenként ${L.rendelesIdo} s adminisztrációból adódik.</div>
      </div>

      <div class="card" id="m3-sajat">
        ${step("3 · Saját megoldás", "verseny", "Rendezd át a polcokat!", "verseny: legrövidebb napi gyaloglás")}
        <p><b>Kattints egy polchelyre, majd egy másikra:</b> a két termék helyet cserél. Az oldal minden cserénél újraszámolja a napi gyaloglást. Addig kísérletezhetsz, amíg be nem küldöd; <b>egyszer küldheted be</b>. A verseny a visszafordulós bejárással mér.</p>
        <div class="grid g2">
          <div>
            <div class="btn-row"><label class="btn small"><input type="checkbox" id="m3-heat" style="margin:0"> ABC-színezés (hőtérkép)</label><span class="muted" id="m3-heat-hint"></span></div>
            <div class="map-wrap wh"><div id="m3-grid"></div>
            <div class="legend"><span>F1–F3: folyosók</span><span>T01…T40: termékek</span><span><i style="background:${OSZT.A}"></i>A</span><span><i style="background:${OSZT.B}"></i>B</span><span><i style="background:${OSZT.C}"></i>C osztály</span><span>▣ kiadópont</span></div></div>
          </div>
          <div>
            <div id="m3-kpi"></div>
            <div id="m3-info"></div>
            <div class="btn-row" id="m3-kuld"></div>
            <h4>Slotting-verseny</h4><div id="m3-board"></div>
          </div>
        </div>
      </div>

      <div id="m3-ai"></div>

      <div class="card" id="m3-algo-kartya">
        ${step("5 · Algoritmus", "algo", "Klasszikus ABC-slotting")}
        <p>A szabály egyszerű: <b>a leggyakrabban szedett termék kerüljön a kiadóponthoz legközelebbi helyre</b>, a következő a második legközelebbire, és így tovább. A helyeket a kiadóponttól mért gyaloglási távolság szerint rangsoroljuk.</p>
        <div class="btn-row"><button class="btn primary" id="m3-algo">ABC-slotting kiszámítása</button></div>
        <div id="m3-algo-out"></div>
      </div>

      <div class="card">
        ${step("6 · Szedési útvonal", "tipp", "Visszafordulós vagy kígyózó bejárás?", "+5 pont, ha bejön")}
        <div id="m3-ut-tipp"></div>
        <div id="m3-ut-blokk" style="margin-top:12px"><div class="grid g2">
          <div>
            <div class="btn-row">
              <label for="m3-ord">Rendelés:</label><select id="m3-ord" style="width:auto;max-width:100%"></select>
              <div class="seg" id="m3-pol"><button data-p="vissza" class="on">Visszafordulós</button><button data-p="kigyo">Kígyózó</button></div>
            </div>
            <div class="map-wrap wh"><div id="m3-route"></div></div>
          </div>
          <div>
            <p><b>Kígyózó (S-alakú) bejárás:</b> a szedő végigmegy minden érintett folyosón, és a túlsó végén lép át a következőbe. Páratlan számú folyosónál az utolsóba csak a legmélyebb tételig megy be.</p>
            <div class="btn-row"><button class="btn primary" id="m3-pol-cmp">Bejárási módok összevetése</button></div>
            <div id="m3-pol-out"></div>
          </div>
        </div></div>
      </div>`;

    /* ---- Tipp + ABC ---- */
    const top20 = W.topArany(20);
    const tippAns = top20 < 40 ? "a" : top20 < 60 ? "b" : top20 < 80 ? "c" : "d";
    const tipp = vote($("#m3-tipp", root), Object.assign({ mod: "tipp" }, LT.ACT.m3_tipp, {
      magyarazat: () => `A legnépszerűbb ${Math.round(ABC.length * 0.2)} termék (a kínálat 20%-a) adja a szedési sorok <b>${f.pct(top20, 0)}</b>-át. Ez a Pareto-elv a raktárban: kevés termék viszi a mozgás nagy részét.`
    }));
    kapu($("#m3-abc-blokk", root), [{ kesz: tippKesz("m3_tipp"), szoveg: "Előbb véglegesítsd a tippedet." }]);
    function pareto() {
      const w = 520, h = 230, pl = 46, pb = 34, pt = 12, pr = 12;
      const X = i => pl + (w - pl - pr) * i / ABC.length, Y = v => pt + (h - pt - pb) * (1 - v / 100);
      const pts = [[0, 0]].concat(ABC.map((a, i) => [i + 1, a.kum]));
      const n20 = Math.round(ABC.length * 0.2);
      let s = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Pareto-görbe">`;
      [0, 25, 50, 75, 100].forEach(v => (s += `<line x1="${pl}" x2="${w - pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"></line><text x="${pl - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="10">${v}%</text>`));
      [80, 95].forEach(v => (s += `<line x1="${pl}" x2="${w - pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--ink-3)" stroke-dasharray="3 3"></line><text x="${w - pr - 2}" y="${Y(v) - 3}" text-anchor="end" font-size="9.5">${v}% (${v === 80 ? "A/B" : "B/C"} határ)</text>`));
      ABC.forEach((a, i) => (s += `<rect x="${X(i) + 1}" y="${Y(100 * a.sor / ABC[0].sor * 0.6)}" width="${(w - pl - pr) / ABC.length - 2}" height="${Y(0) - Y(100 * a.sor / ABC[0].sor * 0.6)}" fill="${OSZT[a.osztaly]}" fill-opacity=".8"></rect>`));
      s += `<polyline points="${pts.map(([i, v]) => X(i) + "," + Y(v)).join(" ")}" fill="none" stroke="var(--ink)" stroke-width="2.2"></polyline>`;
      s += `<line x1="${X(n20)}" x2="${X(n20)}" y1="${Y(0)}" y2="${Y(top20)}" stroke="var(--brand-2)" stroke-width="2" stroke-dasharray="5 3"></line>
        <text x="${X(n20) + 5}" y="${Y(top20) + 14}" font-size="11" font-weight="700">${n20} termék → ${f.pct(top20, 0)}</text>
        <text x="${(w + pl) / 2}" y="${h - 6}" text-anchor="middle" font-size="10.5">termékek gyakoriság szerint sorba rendezve (oszlop: napi szedési sor, vonal: kumulált %)</text>`;
      return s + "</svg>";
    }
    function renderAbc() {
      const db = { A: 0, B: 0, C: 0 }, sr = { A: 0, B: 0, C: 0 };
      ABC.forEach(a => { db[a.osztaly]++; sr[a.osztaly] += a.sor; });
      $("#m3-abc", root).innerHTML = `
        <div class="grid g2e" style="margin-top:10px">
          <div>
            <h4>Mit csinál az ABC-elemzés?</h4>
            <ol class="tight">
              <li><b>Mérjük a forgási sebességet:</b> itt azt, hogy naponta hányszor nyúlnak a termékhez (szedési sor/nap). Nem a darabszám vagy az érték számít, hanem a <b>mozgás</b>, mert a szedő ehhez gyalogol.</li>
              <li><b>Sorba rendezzük</b> a termékeket a leggyakoribbtól a legritkábbig.</li>
              <li><b>Összeadjuk az arányokat</b> (kumulált %): az első termék a sorok 25%-át adja, az első kettő együtt 38%-ot, és így tovább.</li>
              <li><b>Meghúzzuk a határokat:</b> <b>A</b> = a termékek, amelyek együtt a szedések kb. 80%-át adják; <b>B</b> = a következő 15%; <b>C</b> = a maradék 5%.</li>
            </ol>
            <p><b>Miért fontos?</b> Az A-termékekhez nyúlnak a legtöbbször. Ha ezek a kiadóponthoz közel, a folyosók elején állnak (ez az „arany zóna”), a szedők útja jelentősen rövidül. A C-termékek mehetnek a folyosók végére: ritkán kell értük menni.</p>
          </div>
          <div class="map-wrap">${pareto()}</div>
        </div>
        <div class="tbl-wrap"><table><thead><tr><th>Osztály</th><th class="n">Termékek</th><th class="n">A termékek aránya</th><th class="n">Szedési sor/nap</th><th class="n">A szedések aránya</th></tr></thead><tbody>
          ${["A", "B", "C"].map(o => `<tr><td><span class="lamp" style="background:${OSZT[o]}"></span><b>${o}</b></td><td class="n">${db[o]}</td><td class="n">${f.pct(100 * db[o] / ABC.length, 0)}</td><td class="n">${sr[o]}</td><td class="n">${f.pct(100 * sr[o] / osszSor, 0)}</td></tr>`).join("")}
        </tbody></table></div>
        <details class="mini"><summary>A teljes termékrangsor</summary><div class="tbl-wrap"><table><thead><tr><th>#</th><th>Termék</th><th class="n">Sor/nap</th><th class="n">Kumulált</th><th>Osztály</th></tr></thead><tbody>
          ${ABC.map(a => `<tr><td>${a.rang}</td><td>${a.kod} ${esc(a.nev)}</td><td class="n">${a.sor}</td><td class="n">${f.pct(a.kum, 0)}</td><td><span class="lamp" style="background:${OSZT[a.osztaly]}"></span>${a.osztaly}</td></tr>`).join("")}
        </tbody></table></div></details>`;
      $("#m3-heat", root).disabled = false; $("#m3-heat-hint", root).textContent = "";
    }
    $("#m3-abc-btn", root).onclick = () => { LT.api.store.set(my.key("m3_abc"), true); renderAbc(); tipp.reveal(tippAns); };

    /* ---- Raktárrács ---- */
    const S = 17, ft = W.folyosoHossz(), maxX = L.elsoFolyoso + (L.folyosok.length - 1) * L.folyosoKoz + 2.6;
    const gw = maxX * S + 30, gh = ft * S + 40;
    const sx = x => 14 + x * S, sy = y => 20 + (ft - y) * S;
    function rackRect(h) {
      const x0 = h.oldal === "B" ? h.x - 2.2 : h.x + 1.0;
      const y0 = L.elotér + (h.rekesz - 1) * L.rekeszHossz;
      return { x: sx(x0), y: sy(y0 + L.rekeszHossz) + 1, w: 1.2 * S, h: L.rekeszHossz * S - 2 };
    }
    function gridSvg(ly, opts) {
      opts = opts || {};
      const heat = opts.heat;
      let s = `<svg viewBox="0 0 ${gw} ${gh}" role="img" aria-label="Raktári polcok elrendezése">
        <rect x="${sx(0)}" y="${sy(ft)}" width="${maxX * S}" height="${ft * S}" fill="none" stroke="var(--line-2)" stroke-width="1.5" rx="4"></rect>`;
      L.folyosok.forEach((fo, k) => {
        const x = L.elsoFolyoso + k * L.folyosoKoz;
        s += `<text x="${sx(x)}" y="${sy(ft) - 5}" text-anchor="middle" font-size="11" font-weight="800">${fo}</text>
          <line x1="${sx(x)}" x2="${sx(x)}" y1="${sy(0.3)}" y2="${sy(ft - 0.3)}" stroke="var(--line)" stroke-dasharray="2 4"></line>`;
      });
      for (const h of HELYEK) {
        const r = rackRect(h), t = ly[h.kod];
        const fill = !t ? "var(--panel)" : heat ? OSZT[osztaly[t]] : "color-mix(in srgb, var(--m3) 20%, var(--panel))";
        s += `<g data-h="${h.kod}" class="${opts.kattinthato ? "clickable" : ""}" ${opts.kattinthato ? `tabindex="0" role="button" aria-label="${h.kod} hely: ${t ? esc(TNEV[t]) : "üres"}"` : ""}>
          <rect class="slot ${sel === h.kod && opts.kattinthato ? "sel" : ""}" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="3" fill="${fill}"></rect>
          <text x="${r.x + r.w / 2}" y="${r.y + r.h / 2 + 3.5}" text-anchor="middle" font-size="9.5" font-weight="700" pointer-events="none" style="fill:${heat && t ? (osztaly[t] === "C" ? "#fff" : "#0f0f0f") : "var(--ink)"}">${t || "·"}</text>
          <title>${h.kod}: ${t ? t + " " + esc(TNEV[t]) + " (" + sorDb[t] + " sor/nap, " + osztaly[t] + " osztály)" : "üres hely"}</title></g>`;
      }
      if (opts.ut) s += `<polyline points="${opts.ut.map(([x, y]) => sx(x) + "," + sy(y)).join(" ")}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round" stroke-opacity=".95"></polyline>`;
      if (opts.jelol) opts.jelol.forEach(k => { const r = rackRect(HK[k]); s += `<rect x="${r.x - 2}" y="${r.y - 2}" width="${r.w + 4}" height="${r.h + 4}" rx="4" fill="none" stroke="var(--ink)" stroke-width="2.5"></rect>`; });
      s += `<rect x="${sx(0) - 9}" y="${sy(0) - 9}" width="18" height="18" fill="var(--brand)" stroke="var(--accent)" stroke-width="2.5"></rect>
        <text x="${sx(0) + 14}" y="${sy(0) + 4}" font-size="10" font-weight="700">kiadópont</text>`;
      return s + "</svg>";
    }

    /* ---- Útvonal (rajz) ---- */
    function utvonal(hs, mod) {
      const byF = {};
      hs.forEach(h => { byF[h.fIdx] = Math.max(byF[h.fIdx] || 0, h.y); });
      const fi = Object.keys(byF).map(Number).sort((a, b) => a - b);
      const X = k => L.elsoFolyoso + k * L.folyosoKoz;
      const pts = [[0, 0]];
      if (mod === "kigyo") {
        fi.forEach((k, i) => {
          const utolso = i === fi.length - 1 && fi.length % 2 === 1;
          if (i % 2 === 0) { pts.push([X(k), 0]); pts.push([X(k), utolso ? byF[k] : ft]); if (utolso) pts.push([X(k), 0]); }
          else { pts.push([X(k), ft]); pts.push([X(k), 0]); }
        });
      } else fi.forEach(k => { pts.push([X(k), 0], [X(k), byF[k]], [X(k), 0]); });
      pts.push([0, 0]);
      return pts;
    }
    const hol = ly => { const o = {}; for (const k in ly) if (ly[k]) o[ly[k]] = k; return o; };

    /* ---- Példa: így mérünk ---- */
    (function pelda() {
      const idx = W.rendelesek().findIndex(o => o.length === 3 && new Set(o.map(t => hol(kezdo)[t].slice(0, 2))).size >= 2);
      const o = W.rendelesek()[idx >= 0 ? idx : 0];
      const H = hol(kezdo), hs = o.map(t => HK[H[t]]);
      $("#m3-pelda", root).innerHTML = gridSvg(kezdo, { ut: utvonal(hs, "vissza"), jelol: hs.map(h => h.kod) });
      const byF = {};
      hs.forEach(h => { byF[h.folyoso] = byF[h.folyoso] && byF[h.folyoso].y > h.y ? byF[h.folyoso] : h; });
      const fsor = Object.keys(byF).sort();
      const maxXf = Math.max(...hs.map(h => h.x));
      const total = W.rendelesUt(hs, "vissza");
      $("#m3-pelda-szoveg", root).innerHTML = `<p><b>Példarendelés:</b> ${o.map(t => `${t} (${esc(TNEV[t])}, hely: ${H[t]})`).join("; ")}</p>
        <ol class="tight">
          <li>A keresztfolyosón a legtávolabbi érintett folyosóig (${byF[fsor[fsor.length - 1]].folyoso}) és vissza: 2 × ${f.num(maxXf, 1)} m = <b>${f.num(2 * maxXf, 1)} m</b></li>
          ${fsor.map(k => `<li>Be a(z) ${k} folyosóba a legmélyebb tételig (${byF[k].kod}) és vissza: 2 × ${f.num(byF[k].y, 1)} m = <b>${f.num(2 * byF[k].y, 1)} m</b></li>`).join("")}
        </ol>
        <div class="kpis">${kpi("Ennek a rendelésnek az útja", f.num(total, 1) + " m")}</div>
        <small>Figyeld meg: a polcok távolsága a kiadóponttól két részből áll, a keresztfolyosón megtett útból (melyik folyosó) és a folyosón belüli mélységből (melyik rekesz). A jó elrendezés mindkettőt rövidíti.</small>`;
    })();

    let aktE = null;
    function render() {
      const lezart = sajatKesz();
      if (lezart && my.get("m3_bekuldott")) lay = Object.assign({}, my.get("m3_bekuldott").lay);
      if (!lezart) { LT.api.store.set(my.key("m3_lay"), lay); LT.api.store.set(my.key("m3_csere"), csere); }
      const heat = $("#m3-heat", root).checked && abcLatott();
      $("#m3-grid", root).innerHTML = gridSvg(lay, { heat, kattinthato: !lezart });
      if (!lezart) $$("#m3-grid [data-h]", root).forEach(g => {
        const act = () => {
          const k = g.dataset.h;
          if (!sel) { sel = k; render(); return; }
          if (sel === k) { sel = null; render(); return; }
          const t = lay[sel]; lay[sel] = lay[k]; lay[k] = t; sel = null; csere++;
          render();
        };
        g.addEventListener("click", act);
        g.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); act(); } });
      });
      const e = (aktE = W.ertekel(lay, "vissza"));
      $("#m3-kpi", root).innerHTML = `<div class="kpis">
        ${kpi("Napi gyaloglás", f.num(e.ut / 1000, 2) + " km", 100 * (e.ut / kezdoE.ut - 1), true)}
        ${kpi("Átlag / rendelés", f.num(e.atlagUt, 0) + " m", 100 * (e.atlagUt / kezdoE.atlagUt - 1), true)}
        ${kpi("Szedési sor / óra", f.num(e.sorPerOra, 1), 100 * (e.sorPerOra / kezdoE.sorPerOra - 1))}
        ${kpi("Cserék", csere + " db")}</div>`;
      $("#m3-info", root).innerHTML = lezart ? "" : sel ? `<div class="note info"><b>${sel}</b> kijelölve (${lay[sel] ? esc(lay[sel] + " " + TNEV[lay[sel]]) : "üres"}). Kattints a célhelyre.</div>` :
        `<small>Kezdő elrendezés: ${f.num(kezdoE.ut, 0)} m/nap. ${abcLatott() ? "Kapcsold be a hőtérképet: látod, hol állnak az A-termékek." : "Az ABC-elemzés után bekapcsolható a hőtérkép."}</small>`;
      $("#m3-kuld", root).innerHTML = lezart
        ? `<div class="note ok"><b>Beküldve, véglegesen:</b> ${f.num(e.ut, 0)} m/nap, ${csere} csere.</div>`
        : `<button class="btn accent" id="m3-send">Beküldés (végleges)</button><button class="btn small" id="m3-reset">Kezdő elrendezés</button>`;
      if (!lezart) {
        $("#m3-reset", root).onclick = () => { if (confirm("Visszaállítod a kezdő elrendezést?")) { lay = Object.assign({}, kezdo); csere = 0; sel = null; render(); } };
        $("#m3-send", root).onclick = bekuld;
      }
    }
    async function bekuld() {
      const e = aktE;
      if (sajatKesz()) return;
      if (!confirm(`Beküldöd ezt az elrendezést (${f.num(e.ut, 0)} m/nap)? Utána nem módosítható.`)) return;
      const rec = { ut: e.ut, atlag: e.atlagUt, sorPerOra: e.sorPerOra, lay: Object.assign({}, lay), csere };
      LT.api.store.set(my.key("m3_bekuldott"), rec);
      LT.api.store.set(my.key("m3_best"), rec);
      my.set("kesz_m3_slot", true);
      render();
      await submit({ activity: "m3_slot", kind: "result", value: Math.round(e.ut), dir: "min", text: `${csere} csere, ${f.num(e.sorPerOra, 1)} sor/óra` }, "Elrendezés beküldve a versenybe");
    }
    $("#m3-heat", root).disabled = !abcLatott();
    if (!abcLatott()) $("#m3-heat-hint", root).textContent = "(az ABC-elemzés után kapcsolható)";
    $("#m3-heat", root).onchange = render;
    board($("#m3-board", root), "m3_slot", { mertek: "m/nap", fmt: v => f.num(v), reszlet: true });
    if (abcLatott()) renderAbc();
    render();
    kapu($("#m3-sajat", root), [{ kesz: tippKesz("m3_tipp"), szoveg: "Előbb véglegesítsd a tippedet az 1. lépésben." }]);

    /* ---- AI ---- */
    function alkalmaz(parok) {
      const ly = Object.assign({}, kezdo), h = hol(ly);
      const hibak = [], celok = {};
      for (const p of parok) {
        if (!TNEV[p.termek]) { hibak.push(`ismeretlen termék: ${p.termek}`); continue; }
        if (!HK[p.hely]) { hibak.push(`nem létező hely: ${p.hely}`); continue; }
        if (celok[p.hely] && celok[p.hely] !== p.termek) hibak.push(`${p.hely} kétszer kiosztva (${celok[p.hely]}, ${p.termek})`);
        celok[p.hely] = p.termek;
        const from = h[p.termek], to = p.hely;
        if (from === to) continue;
        const masik = ly[to];
        ly[to] = p.termek; ly[from] = masik || null;
        h[p.termek] = to; if (masik) h[masik] = from;
      }
      return { ly, hibak };
    }
    ai($("#m3-ai", root), Object.assign({}, LT.ACT.m3_ai, {
      cim: "4 · AI: hova tenné a termékeket?",
      bevezeto: "Add meg az AI-nak a szedési gyakoriságokat és a polchelyek távolságát. Az oldal végrehajtja a javasolt áthelyezéseket a kezdő elrendezésen, és megméri az eredményt.",
      kapu: [{ kesz: tippKesz("m3_tipp"), szoveg: "Előbb véglegesítsd a tippedet." }, { kesz: sajatKesz, szoveg: "Előbb küldd be a saját elrendezésedet a 3. lépésben." }],
      magyarazat: [
        ["Szerep", "„Raktári slotting-szakértő vagy”: a raktári szakmai logika bekapcsolása."],
        ["Adatok", "Mind a 40 termék napi szedési száma és jelenlegi helye, valamint mind a 48 polchely gyaloglási távolsága a kiadóponttól, rangsorolva."],
        ["Szabályok", "A raktár felépítése és a bejárási szabály (a szedő csak a legmélyebb tételig megy be). Enélkül az AI nem tudná, mi számít „jó” helynek."],
        ["Feladat és cél", "A napi gyaloglás csökkentése: ugyanaz, mint a te versenyedben."],
        ["Válaszformátum", "Soronként „T01 -> F1-01”, majd BECSÜLT CSÖKKENÉS. Az oldal ebből végrehajtja az áthelyezéseket és megméri a valós hatást."],
        ["Mire figyelj?", "A szabály (népszerű elöl) jellemzően jó, de a végrehajtásban lehetnek ellentmondások (két termék ugyanarra a helyre), és a becsült megtakarítás gyakran túlzó."]
      ],
      prompt: () => {
        const helyek = HELYEK.slice().sort((a, b) => a.egyszeres - b.egyszeres).map(h => `${h.kod}: ${f.num(h.egyszeres / 2, 1)} m`).join("; ");
        const most = hol(kezdo);
        return `Raktári slotting-szakértő vagy. Egy kiszedési zónában ${W.termekek().length} termék van ${HELYEK.length} polchelyen. Három folyosó van (F1, F2, F3); folyosónként 16 hely, a polchely kódja például F2-05 (01-08 a bal, 09-16 a jobb oldalon, a kisebb szám van közelebb a folyosó elejéhez). A kiadópont az F1 folyosó előtt van. A szedő minden folyosóba csak a legmélyebb tételéig megy be, majd visszafordul.

TERMÉKEK (kód, név, szedési sor/nap, jelenlegi hely):
${W.termekek().map(t => `${t.kod} ${t.nev}: ${sorDb[t.kod]} sor/nap, most: ${most[t.kod]}`).join("\n")}

POLCHELYEK a kiadóponttól mért gyaloglási távolság szerint (egy irányba):
${helyek}

FELADAT: Javasolj új elrendezést, amely a lehető legjobban csökkenti a napi gyaloglást. Add meg MINDEN termék új helyét.
VÁLASZ FORMÁTUMA (soronként egy termék, pontosan így):
T01 -> F1-01
T02 -> F2-05
...
BECSÜLT CSÖKKENÉS: <szám>%
Utána legfeljebb 3 mondat a szabályról, amit követtél.`;
      },
      ertekel: txt => {
        const parok = LT.core.P.slotting(txt);
        if (!parok.length) return { html: `<div class="note bad"><b>Nem találtunk „T01 -> F1-01” formátumú sort.</b> Kérd meg az AI-t a pontos formátumra.</div>`, osszegzes: "értelmezhetetlen" };
        const { ly, hibak } = alkalmaz(parok);
        const e = W.ertekel(ly, "vissza");
        const valos = 100 * (1 - e.ut / kezdoE.ut);
        const cl = (txt.match(/CS[ÖO]KKEN[ÉE]S[^\d\n]{0,12}(\d+(?:[.,]\d+)?)/i) || [])[1];
        const claim = cl ? Number(cl.replace(",", ".")) : null;
        const sajat = my.get("m3_bekuldott");
        LT.api.store.set(my.key("m3_ai_eredm"), { ut: e.ut, sorPerOra: e.sorPerOra });
        return {
          value: Math.round(e.ut),
          osszegzes: `${parok.length} áthelyezés, ${f.pct(valos, 0)} valós csökkenés (állított: ${claim !== null ? f.pct(claim, 0) : "–"})`,
          html: `<div class="grid g2e"><div class="map-wrap">${gridSvg(ly, { heat: abcLatott() })}</div><div>
            <table><tbody>
              <tr><td>Értelmezett áthelyezések</td><td class="n">${parok.length} / ${W.termekek().length}</td></tr>
              <tr><td>Az AI által állított csökkenés</td><td class="n">${claim !== null ? f.pct(claim, 0) : "nem adta meg"}</td></tr>
              <tr><td><b>Valós csökkenés</b> (újraszámolva)</td><td class="n"><b>${f.pct(valos, 1)}</b></td></tr>
              <tr><td>Napi gyaloglás az AI elrendezésével</td><td class="n">${f.num(e.ut, 0)} m</td></tr>
              <tr><td>Kezdő elrendezés</td><td class="n">${f.num(kezdoE.ut, 0)} m</td></tr>
              ${sajat ? `<tr><td>A te beküldött elrendezésed</td><td class="n">${f.num(sajat.ut, 0)} m</td></tr>` : ""}
            </tbody></table>
            ${hibak.length ? `<div class="note warn"><b>Ellentmondások a válaszban:</b> ${hibak.slice(0, 6).map(esc).join("; ")}${hibak.length > 6 ? "…" : ""}</div>` : `<div class="note ok"><b>Nincs formai ellentmondás.</b></div>`}
            ${claim !== null ? `<div class="note ${Math.abs(claim - valos) <= 5 ? "ok" : "warn"}"><b>${Math.abs(claim - valos) <= 5 ? "A becslés reális." : "A becslés nem stimmel."}</b> ${f.num(Math.abs(claim - valos), 0)} százalékpont eltérés.</div>` : ""}
          </div></div>`
        };
      }
    }));

    /* ---- Algoritmus ---- */
    const abcLay = W.abcElrendezes(), abcE = W.ertekel(abcLay, "vissza"), abcK = W.ertekel(abcLay, "kigyo");
    function renderAlgo() {
      const sajat = my.get("m3_bekuldott"), aiE = my.get("m3_ai_eredm");
      const sor = (n, ut, spo, me) => `<tr ${me ? 'class="me"' : ""}><td>${n}</td><td class="n">${ut ? f.num(ut, 0) : "–"}</td><td class="n">${ut ? f.pct(100 * (ut / kezdoE.ut - 1), 1) : "–"}</td><td class="n">${spo ? f.num(spo, 1) : "–"}</td></tr>`;
      $("#m3-algo-out", root).innerHTML = `<div class="grid g2e"><div class="map-wrap">${gridSvg(abcLay, { heat: true })}</div><div>
        <table><thead><tr><th>Elrendezés</th><th class="n">m / nap</th><th class="n">Változás</th><th class="n">Sor / óra</th></tr></thead><tbody>
          ${sor("Kezdő (kódszám szerint)", kezdoE.ut, kezdoE.sorPerOra)}
          ${sor("ABC-slotting", abcE.ut, abcE.sorPerOra)}
          ${sor("A te elrendezésed", sajat && sajat.ut, sajat && sajat.sorPerOra, true)}
          ${sor("Az AI javaslata", aiE && aiE.ut, aiE && aiE.sorPerOra)}
        </tbody></table>
        <div class="note info"><b>Gondold végig:</b> az ABC-slotting egyenként nézi a termékeket. Mit nem lát? (Például hogy mely termékeket rendelik együtt, vagy hogy a nehéz, nagy dobozok hova férnek.) Ha a te elrendezésed jobb lett, mit csináltál másképp?</div>
      </div></div>`;
    }
    $("#m3-algo", root).onclick = () => { LT.api.store.set(my.key("m3_algo"), true); renderAlgo(); };
    kapu($("#m3-algo-kartya", root), [{ kesz: sajatKesz, szoveg: "Előbb küldd be a saját elrendezésedet." }]);
    if (my.get("m3_algo")) renderAlgo();

    /* ---- Szedési útvonal ---- */
    const utTipp = vote($("#m3-ut-tipp", root), Object.assign({ mod: "tipp" }, LT.ACT.m3_ut, {
      magyarazat: () => `ABC-slotting után a visszafordulós bejárás ${f.num(abcE.ut, 0)} m, a kígyózó ${f.num(abcK.ut, 0)} m naponta. Ha a tételek a folyosók elején vannak, felesleges végigmenni a folyosón. Ha szétszórtak (mint a kezdő elrendezésben: ${f.num(kezdoE.ut, 0)} m kontra ${f.num(kezdoK.ut, 0)} m), a kígyózó is versenyképes.`
    }));
    kapu($("#m3-ut-blokk", root), [{ kesz: tippKesz("m3_ut"), szoveg: "Előbb véglegesítsd a tippedet a bejárási módról." }]);
    let pol = "vissza";
    const ordSel = $("#m3-ord", root);
    ordSel.innerHTML = W.rendelesek().map((o, i) => `<option value="${i}">#${i + 1}: ${o.join(", ")}</option>`).join("");
    const multi = W.rendelesek().findIndex(o => o.length >= 3);
    ordSel.value = String(multi >= 0 ? multi : 0);
    function renderUt() {
      const o = W.rendelesek()[Number(ordSel.value)];
      const ly = (my.get("m3_bekuldott") || {}).lay || lay;
      const H = hol(ly);
      const hs = o.map(t => HK[H[t]]).filter(Boolean);
      $("#m3-route", root).innerHTML = gridSvg(ly, { heat: abcLatott(), ut: utvonal(hs, pol), jelol: hs.map(h => h.kod) }) +
        `<div class="legend"><span>Ez a rendelés: <b>${f.num(W.rendelesUt(hs, "vissza"), 0)} m</b> visszafordulós, <b>${f.num(W.rendelesUt(hs, "kigyo"), 0)} m</b> kígyózó bejárással (a te ${my.get("m3_bekuldott") ? "beküldött" : "jelenlegi"} elrendezésedben)</span></div>`;
    }
    ordSel.onchange = renderUt;
    $$("#m3-pol button", root).forEach(b => b.onclick = () => { pol = b.dataset.p; $$("#m3-pol button", root).forEach(x => x.classList.toggle("on", x === b)); renderUt(); });
    renderUt();
    $("#m3-pol-cmp", root).onclick = () => {
      const ly = (my.get("m3_bekuldott") || {}).lay || lay;
      const sv = W.ertekel(ly, "vissza"), sk = W.ertekel(ly, "kigyo");
      const sor = (n, v, k) => `<tr><td>${n}</td><td class="n">${f.num(v.ut, 0)}</td><td class="n">${f.num(k.ut, 0)}</td><td class="n">${v.ut <= k.ut ? "visszafordulós" : "kígyózó"}</td></tr>`;
      $("#m3-pol-out", root).innerHTML = `<table><thead><tr><th>Elrendezés</th><th class="n">Visszafordulós (m)</th><th class="n">Kígyózó (m)</th><th class="n">Rövidebb</th></tr></thead><tbody>
        ${sor("Kezdő", kezdoE, kezdoK)}${sor("ABC-slotting", abcE, abcK)}${sor("A te elrendezésed", sv, sk)}</tbody></table>
        <div class="note info"><b>Tanulság:</b> a bejárási szabály és az elrendezés együtt dönt. A jó slotting a folyosók elejére hozza a forgalmat, és ehhez a rövid, visszafordulós bejárás illik.</div>`;
      const d = 100 * (abcK.ut / abcE.ut - 1);
      utTipp.reveal(d > 3 ? "vissza" : d < -3 ? "kigyo" : "egy");
    };
  };
})();
