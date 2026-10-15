/* 1. feladat: elosztóhálózat tervezése vegyes egészértékű lineáris programozással */
(function () {
  const LT = (window.LT = window.LT || {});
  LT.missions = LT.missions || {};
  const SZINEK = { R1: "#007548", R2: "#005f92", R3: "#a1772b", R4: "#00afa9", R5: "#38ac55", R6: "#f08681" };

  LT.missions.m1 = function (root) {
    const { esc, $, $$, my, kesz, vote, tippKesz, board, ai, szoveg, kapu, step, kpi, submit, toast } = LT.ui;
    const D = LT.data, H = LT.core.H, f = LT.core.fmt;
    const BASE = Object.assign({}, D.HALOZAT_ALAP);
    const bazis = H.megold(BASE, { nyitott: ["R1"] });
    let nyitott = my.get("m1_nyitott", ["R1"]);
    let optimum = null;
    const getOpt = () => (optimum = optimum || H.megold(BASE));
    const osszKereslet = D.UGYFELEK.reduce((s, u) => s + u.keres, 0);
    const sajatKesz = () => kesz("m1_kezi");

    root.innerHTML = `
      <div class="mission-head mh-1"><div class="eyebrow">1. feladat · Hálózattervezés</div>
        <h2>Hány raktár kell a Lumennek, és hol?</h2>
        <p>Ma minden raklap a székesfehérvári gyárból a gyáli központi raktárba megy, onnan pedig az ország 16 nagykereskedőjéhez. A vezérigazgató azt kérdezi: <i>„Megérné regionális raktárakat nyitni? A bérleti díj sok, de a fuvar is.”</i></p></div>

      <div class="card">
        <h3>A döntés logikája</h3>
        <p>Minden új raktár <b>fix éves költséggel</b> jár (bérleti díj, személyzet, rendszer). Cserébe <b>közelebb kerül a vevőhöz</b>: rövidebb és olcsóbb a terítőfuvar, és több vevőt lehet másnapra kiszolgálni. A kérdés tehát egy <b>kompromisszum</b>: hol van az a pont, ahol egy újabb raktár fix költsége már több, mint amennyit a fuvaron megspórol?</p>
        <div class="kpis">
          <div class="kpi"><div class="l">Gyár → raktár</div><div class="v">${D.HALOZAT_ALAP.beFuvar} Ft</div><div class="d">raklaponként, kilométerenként (teljes kamion)</div></div>
          <div class="kpi"><div class="l">Raktár → vevő</div><div class="v">${D.HALOZAT_ALAP.kiFuvar} Ft</div><div class="d">raklaponként, kilométerenként (terítés)</div></div>
          <div class="kpi"><div class="l">Éves kereslet</div><div class="v">${f.num(osszKereslet)}</div><div class="d">raklap, 16 vevő</div></div>
          <div class="kpi"><div class="l">Másnapi kiszolgálás</div><div class="v">${D.HALOZAT_ALAP.kiszolgKm} km</div><div class="d">ezen belül van a vevő a raktárától</div></div>
        </div>
        <details class="mini"><summary>A jelölt raktárak adatai</summary>
          <table><thead><tr><th>Raktár</th><th class="n">Fix költség (M Ft/év)</th><th class="n">Kapacitás (raklap/év)</th><th class="n">Távolság a gyártól (km)</th></tr></thead><tbody>
          ${D.RAKTARAK.map(r => `<tr><td><span class="lamp" style="background:${SZINEK[r.id]}"></span>${esc(r.nev)}${r.meglevo ? " <small>(a mai, egyetlen raktár)</small>" : ""}</td><td class="n">${r.fix}</td><td class="n">${f.num(r.kap)}</td><td class="n">${f.num(H.tav(D.GYAR, r, BASE), 0)}</td></tr>`).join("")}
          </tbody></table></details>
        <details class="mini"><summary>A modell matematikai alakja, jelmagyarázattal és szöveges magyarázattal</summary>
          <p>Ez egy <b>vegyes egészértékű lineáris program</b>: egyes döntések igen/nem jellegűek (megnyitjuk-e a raktárat), mások folytonosak (mekkora hányadot szállítunk). A solver ezt a feladatot oldja meg.</p>
          <div class="keplet">
            <div class="sor"><span class="cimke">Döntések</span><div><div class="mat"><i>y<sub>j</sub></i> ∈ {0, 1}, &nbsp; <i>x<sub>ij</sub></i> ≥ 0</div><div class="szoveg">Minden <i>j</i> raktárról eldöntjük, hogy megnyitjuk (1) vagy sem (0), és minden <i>i</i> vevőről, hogy keresletének hányad részét kapja a <i>j</i> raktárból.</div></div></div>
            <div class="sor"><span class="cimke">Cél</span><div><div class="mat">min &nbsp; Σ<sub><i>j</i></sub> <i>F<sub>j</sub></i>·<i>y<sub>j</sub></i> &nbsp;+&nbsp; Σ<sub><i>i</i>,<i>j</i></sub> <i>d<sub>i</sub></i>·<i>c<sub>ij</sub></i>·<i>x<sub>ij</sub></i></div><div class="szoveg">A teljes éves költség legyen a lehető legkisebb: a megnyitott raktárak fix költsége, plusz minden vevő keresletének szállítási költsége (a gyárból a raktárba és onnan a vevőhöz).</div></div></div>
            <div class="sor"><span class="cimke">1. feltétel</span><div><div class="mat">Σ<sub><i>j</i></sub> <i>x<sub>ij</sub></i> = 1 &nbsp; minden <i>i</i> vevőre</div><div class="szoveg">Minden vevő teljes keresletét ki kell szolgálni (a hányadok összege 100%).</div></div></div>
            <div class="sor"><span class="cimke">2. feltétel</span><div><div class="mat">Σ<sub><i>i</i></sub> <i>d<sub>i</sub></i>·<i>x<sub>ij</sub></i> ≤ <i>K<sub>j</sub></i>·<i>y<sub>j</sub></i> &nbsp; minden <i>j</i> raktárra</div><div class="szoveg">Egy raktár legfeljebb a kapacitásáig szállíthat, egy zárt raktár (<i>y<sub>j</sub></i> = 0) pedig semennyit.</div></div></div>
            <div class="sor"><span class="cimke">3. feltétel</span><div><div class="mat"><i>x<sub>ij</sub></i> ≤ <i>y<sub>j</sub></i></div><div class="szoveg">Vevőt csak megnyitott raktárból lehet kiszolgálni. (Logikailag a 2. feltétel is ezt mondja, de így a solver gyorsabban talál megoldást.)</div></div></div>
          </div>
          <h4 style="margin-top:12px">Jelmagyarázat</h4>
          <table class="jelmagy"><tbody>
            <tr><td>i</td><td>vevő (16 db: Budapest, Győr, Debrecen…)</td></tr>
            <tr><td>j</td><td>jelölt raktár (6 db: Gyál, Győr, Kecskemét, Debrecen, Pécs, Miskolc)</td></tr>
            <tr><td>y<sub>j</sub></td><td>megnyitjuk-e a <i>j</i> raktárat (1 = igen, 0 = nem)</td></tr>
            <tr><td>x<sub>ij</sub></td><td>az <i>i</i> vevő keresletének hányad része jön a <i>j</i> raktárból (0 és 1 között)</td></tr>
            <tr><td>F<sub>j</sub></td><td>a <i>j</i> raktár fix éves költsége (M Ft)</td></tr>
            <tr><td>K<sub>j</sub></td><td>a <i>j</i> raktár éves kapacitása (raklap)</td></tr>
            <tr><td>d<sub>i</sub></td><td>az <i>i</i> vevő éves kereslete (raklap)</td></tr>
            <tr><td>c<sub>ij</sub></td><td>egy raklap költsége a gyártól a <i>j</i> raktáron át az <i>i</i> vevőig: ${D.HALOZAT_ALAP.beFuvar} Ft × (gyár–raktár km) + ${D.HALOZAT_ALAP.kiFuvar} Ft × (raktár–vevő km)</td></tr>
          </tbody></table>
          <small>${D.RAKTARAK.length} jelölt raktárból 2<sup>${D.RAKTARAK.length}</sup> − 1 = ${2 ** D.RAKTARAK.length - 1} különböző hálózat állítható össze. A solver ezeket nem egyenként próbálja ki, hanem elágazás és korlátozás módszerével, a reménytelen ágakat levágva keres.</small>
        </details>
      </div>


      <details class="box modszer"><summary><span class="ikon">Σ</span><span>Módszertan: hogyan találja meg a solver az optimális hálózatot?<small>Lineáris programozás, LP-relaxáció, elágazás és korlátozás, a modell korlátai</small></span></summary><div class="tartalom">
        <h4>1. Mi a lineáris programozás (LP)?</h4>
        <p>Az LP olyan döntési feladat, ahol a cél (itt: az éves költség) és minden feltétel (kereslet, kapacitás) a döntési változók <b>lineáris</b> függvénye: a költség arányosan nő a szállított mennyiséggel, nincsenek szorzatok vagy küszöbök. Az ilyen feladatok megengedett megoldásai egy sokszöget (több dimenzióban poliédert) alkotnak, és az optimum mindig ennek egy <b>csúcsában</b> van. A <b>szimplex módszer</b> csúcsról csúcsra lépked, mindig a költséget csökkentő irányba, amíg már nincs javító szomszéd: ott az optimum.</p>
        <h4>2. Miért „vegyes egészértékű”?</h4>
        <p>A raktár megnyitása igen/nem döntés (<i>y</i> = 0 vagy 1), fél raktárat nem lehet bérelni. Az egész értékű változók miatt a feladat már nem sima LP, hanem <b>vegyes egészértékű LP</b> (MILP). Ezt az <b>elágazás és korlátozás</b> (branch and bound) módszer oldja meg:</p>
        <ol class="tight">
          <li><b>LP-relaxáció:</b> a solver először úgy oldja meg a feladatot, mintha <i>y</i> 0 és 1 közötti tört is lehetne (például „0,4 raktár”). Ez a megoldás általában nem megvalósítható, de az értéke <b>alsó korlát</b>: a valódi optimum ennél olcsóbb nem lehet.</li>
          <li><b>Elágazás:</b> ha valamelyik <i>y</i> tört lett, a solver két részfeladatra bont: az egyikben az a raktár zárva van (<i>y</i> = 0), a másikban nyitva (<i>y</i> = 1), és mindkettőt újra LP-ként oldja meg.</li>
          <li><b>Korlátozás (vágás):</b> ha egy ág alsó korlátja már rosszabb, mint az eddig talált legjobb egész megoldás, azt az ágat a solver eldobja, mert onnan biztosan nem jöhet jobb.</li>
          <li><b>Leállás:</b> ha minden ág le van zárva, a legjobb megtalált egész megoldás bizonyítottan optimális.</li>
        </ol>
        <p>Itt 63 lehetséges hálózat van, ami még végignézhető lenne; a módszer ereje a nagy feladatoknál látszik (50 jelölt telephelynél 2<sup>50</sup> ≈ 10<sup>15</sup> kombináció), ahol a vágások nélkül a feladat megoldhatatlan lenne.</p>
        <h4>3. A te hálózatod kiértékelése</h4>
        <p>Amikor te nyitod meg a raktárakat, az <i>y</i> értékek rögzítettek. A maradék feladat (melyik vevőt melyik nyitott raktár szolgálja ki, a kapacitás figyelembevételével) már egyszerű LP, egy úgynevezett <b>kapacitáskorlátos szállítási feladat</b>. Ezt oldja meg az oldal minden kattintásnál.</p>
        <h4>4. Mit nem tud a modell? (egyszerűsítések)</h4>
        <ul class="tight">
          <li>A közúti távolságot a légvonal 1,25-szöröseként közelíti; nincs valódi útvonalhálózat.</li>
          <li>A fuvardíj lineáris: nincs mennyiségi kedvezmény, minimális fuvarméret vagy útdíj.</li>
          <li>Egyetlen, determinisztikus év: a kereslet ismert és állandó, nincs szezonalitás vagy bizonytalanság.</li>
          <li>A raktár fix költsége „mindent vagy semmit”: nincs méretfüggő bérleti díj vagy fokozatos bővítés.</li>
          <li>Nem szerepel benne a készlet: több raktár a valóságban több biztonsági készletet is jelent, ami pénzt köt le.</li>
        </ul>
        <p>Ezért kell az <b>érzékenységvizsgálat</b>: ha egy kis paraméterváltozás (például fuvardíj) megváltoztatja az optimumot, a döntés nem robusztus, és óvatosabban kell kezelni.</p>
        <p class="muted"><small>Az oldal a böngészőben a nyílt forrású javascript-lp-solver könyvtárral számol. Pythonban ugyanezt a modellt például a PuLP, az OR-Tools vagy a HiGHS solver oldja meg.</small></p>
      </div></details>

      <div class="card" id="m1-tipp">${step("1 · Tipp", "tipp", "Mielőtt bármit számolnál", "+5 pont, ha bejön")}</div>

      <div class="card" id="m1-sajat">
        ${step("2 · Saját megoldás", "verseny", "Tervezd meg a hálózatot!", "verseny: legkisebb éves összköltség")}
        <div class="note info big-note"><b>A verseny szabálya:</b> kizárólag az <b>éves összköltség</b> számít (fix költség + gyár→raktár fuvar + terítés). A másnapi kiszolgálás arányát is látod, és a döntésednél érdemes figyelembe venni, de a rangsorba <b>nem</b> számít bele.</div>
        <p>Kattints a <b>négyzetekre</b> (jelölt raktárak) a megnyitáshoz vagy bezáráshoz. A vevőket az oldal mindig a legolcsóbb nyitott raktárhoz rendeli (a kapacitás figyelembevételével), és azonnal kiszámolja a költséget. Addig kísérletezhetsz, amíg be nem küldöd; <b>egyszer küldheted be</b>.</p>
        <div class="grid g2">
          <div class="map-wrap"><div id="m1-map"></div>
            <div class="legend"><span><i style="background:var(--ink-3);border-radius:50%"></i>vevő (a kör mérete: éves kereslet)</span><span>▲ gyár (Székesfehérvár)</span><span><i style="border:2px dashed var(--ink-2);background:none"></i>zárt jelölt raktár</span><span><i style="background:var(--brand)"></i>nyitott raktár</span><span>vonal: melyik raktár szolgálja ki a vevőt</span></div></div>
          <div>
            <div id="m1-kpi"></div>
            <div id="m1-bontas"></div>
            <div class="btn-row" id="m1-gombok"><button class="btn accent" id="m1-send">Beküldés (végleges)</button><button class="btn small" id="m1-reset">Vissza a mai állapotra</button></div>
            <h4 style="margin-top:14px">Hálózat-verseny</h4><div id="m1-board"></div>
          </div>
        </div>
      </div>

      <div id="m1-ai"></div>

      <div class="card" id="m1-algo">
        ${step("4 · Algoritmus", "algo", "A solver megmutatja az optimumot")}
        <p>A solver bizonyítottan a legolcsóbb hálózatot adja, <b>a modellben megadott feltételek mellett</b>. Amit a modell nem tartalmaz (bérleti piac, munkaerő, kockázat), azt nem látja.</p>
        <div class="btn-row"><button class="btn primary" id="m1-solve">Solver futtatása</button></div>
        <div id="m1-opt"></div>
      </div>

      <div class="card">
        ${step("5 · Érzékenység", "tipp", "Mi történik, ha drágul a fuvar?", "+5 pont, ha bejön")}
        <div id="m1-sokk-tipp"></div>
        <div id="m1-sokk-blokk" style="margin-top:12px"><div class="grid g2e">
          <div>
            <div class="slider-row"><label for="s-ki">Terítőfuvar (Ft / raklap / km)</label><output id="o-ki"></output><input type="range" id="s-ki" min="60" max="220" step="5"></div>
            <div class="slider-row"><label for="s-be">Gyár → raktár fuvar (Ft / raklap / km)</label><output id="o-be"></output><input type="range" id="s-be" min="10" max="50" step="1"></div>
            <div class="slider-row"><label for="s-fix">Raktári fix költségek szorzója</label><output id="o-fix"></output><input type="range" id="s-fix" min="0.5" max="1.6" step="0.05"></div>
            <div class="slider-row"><label for="s-gy">Elvárt másnapi kiszolgálás (a kereslet %-a)</label><output id="o-gy"></output><input type="range" id="s-gy" min="0" max="85" step="5"></div>
            <div class="btn-row"><button class="btn accent" id="m1-shock">Üzemanyag-sokk: +50% fuvardíj</button><button class="btn" id="m1-run">Futtatás a beállított értékekkel</button><button class="btn small" id="m1-alap">Alapértékek</button></div>
            <small>Az „elvárt másnapi kiszolgálás” csúszkával a kiszolgálási szintet is feltételként adhatod meg: így látod, mennyibe kerül a jobb kiszolgálás.</small>
          </div>
          <div id="m1-sens"></div>
        </div></div>
      </div>

      <div class="card" id="m1-dontes-kartya">
        ${step("6 · Döntés", "algo", "Mit javasolsz a vezérigazgatónak?", "+2 pont")}
        <p>Két-három mondat: melyik hálózatot javaslod, mennyibe kerül, mit nyer vele a Lumen (költség és kiszolgálás), és mi a kockázata. Ez a javaslat a 4. feladat vezetői összefoglalójában is megjelenik.</p>
        <div id="m1-dontes"></div>
      </div>`;

    /* ---- Tipp ---- */
    const tipp = vote($("#m1-tipp", root), Object.assign({ mod: "tipp" }, LT.ACT.m1_tipp, {
      magyarazat: () => { const o = getOpt(); return `Az optimum: <b>${o.nyitott.length} raktár</b> (${o.nyitott.map(id => D.RAKTARAK.find(r => r.id === id).nev).join(", ")}).`; }
    }));

    /* ---- Térkép ---- */
    const P = LT.core.projector(47.2, 19.4);
    function mapSvg(eredm, nyit, katt) {
      const outline = D.HU_OUTLINE.map(([lon, lat]) => { const q = P({ lat, lon }); return q.x.toFixed(1) + "," + q.y.toFixed(1); }).join(" ");
      let s = `<svg viewBox="-275 -175 555 345" role="img" aria-label="Magyarország vázlatos térképe a vevőkkel és a jelölt raktárakkal">
        <polygon class="land" points="${outline}"></polygon>`;
      if (eredm && eredm.megvalosithato) {
        for (const u of D.UGYFELEK) {
          const r = D.RAKTARAK.find(x => x.id === eredm.hozzarendeles[u.id]);
          if (!r) continue;
          const a = P(u), b = P(r);
          s += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${SZINEK[r.id]}" stroke-width="1.6" stroke-opacity=".75"></line>`;
        }
        const g = P(D.GYAR);
        for (const id of eredm.nyitott) {
          const b = P(D.RAKTARAK.find(r => r.id === id));
          s += `<line x1="${g.x}" y1="${g.y}" x2="${b.x}" y2="${b.y}" stroke="var(--ink-3)" stroke-width="2.4" stroke-dasharray="6 4" stroke-opacity=".6"></line>`;
        }
      }
      for (const r of D.RAKTARAK) {
        const q = P(r), on = nyit.includes(r.id);
        s += `<g class="${katt ? "clickable" : ""}" data-r="${r.id}" ${katt ? `tabindex="0" role="button" aria-pressed="${on}"` : ""} aria-label="${esc(r.nev)} raktár ${on ? "nyitva" : "zárva"}">
          <rect x="${q.x - 11}" y="${q.y - 11}" width="22" height="22" rx="4" fill="${on ? SZINEK[r.id] : "var(--panel)"}" stroke="${SZINEK[r.id]}" stroke-width="2.5" ${on ? "" : 'stroke-dasharray="4 3"'}></rect>
          <text x="${q.x}" y="${q.y - 15}" text-anchor="middle" font-size="10.5" font-weight="700" style="fill:var(--ink)">${esc(r.nev)}${on ? "" : " ?"}</text></g>`;
      }
      for (const u of D.UGYFELEK) {
        const q = P(u);
        s += `<circle cx="${q.x}" cy="${q.y}" r="${Math.sqrt(u.keres) / 6}" fill="var(--ink-2)" fill-opacity=".55" stroke="var(--panel)" stroke-width="1" pointer-events="none"></circle>`;
        if (!D.RAKTARAK.some(r => r.rov === u.nev || (r.id === "R1" && u.nev === "Budapest")) && u.nev !== "Székesfehérvár")
          s += `<text x="${q.x + 6}" y="${q.y + 12}" font-size="9" pointer-events="none">${esc(u.nev)}</text>`;
      }
      const g = P(D.GYAR), bp = P({ lat: 47.497, lon: 19.04 });
      s += `<path d="M${g.x},${g.y - 9} L${g.x + 8},${g.y + 6} L${g.x - 8},${g.y + 6} Z" fill="var(--accent)" stroke="var(--ink)" stroke-width="1"></path>
        <text x="${g.x}" y="${g.y - 13}" text-anchor="middle" font-size="9.5" font-weight="700">Gyár</text>
        <text x="${bp.x - 4}" y="${bp.y - 6}" text-anchor="end" font-size="9">Budapest</text>`;
      return s + "</svg>";
    }

    function bontasHtml(e, cim) {
      if (!e.megvalosithato) return `<div class="note bad"><b>Nem megvalósítható.</b> A nyitott raktárak kapacitása nem elég a teljes keresletre (${f.num(osszKereslet)} raklap/év). Nyiss még egy raktárat.</div>`;
      return `<table><thead><tr><th>${cim || "Költségelem"}</th><th class="n">M Ft / év</th></tr></thead><tbody>
        <tr><td>Raktárak fix költsége (${e.nyitott.length} db)</td><td class="n">${f.num(e.fixKts, 1)}</td></tr>
        <tr><td>Gyár → raktár fuvar</td><td class="n">${f.num(e.beKts, 1)}</td></tr>
        <tr><td>Raktár → vevő terítés</td><td class="n">${f.num(e.kiKts, 1)}</td></tr>
        <tr><td><b>Összesen (ez számít a versenyben)</b></td><td class="n"><b>${f.num(e.ossz, 1)}</b></td></tr></tbody></table>`;
    }

    let aktualis = null;
    function renderSajat() {
      const lezart = sajatKesz();
      if (lezart && my.get("m1_bekuldott")) nyitott = my.get("m1_bekuldott").nyitott;
      aktualis = H.megold(BASE, { nyitott });
      $("#m1-map", root).innerHTML = mapSvg(aktualis, nyitott, !lezart);
      if (!lezart) $$("#m1-map [data-r]", root).forEach(g => {
        const tog = () => {
          const id = g.dataset.r;
          nyitott = nyitott.includes(id) ? nyitott.filter(x => x !== id) : nyitott.concat(id);
          LT.api.store.set(my.key("m1_nyitott"), nyitott); renderSajat();
        };
        g.addEventListener("click", tog);
        g.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); tog(); } });
      });
      const e = aktualis;
      if (e.megvalosithato) {
        $("#m1-kpi", root).innerHTML = `<div class="kpis">
          ${kpi("Éves összköltség", f.mft(e.ossz), 100 * (e.ossz / bazis.ossz - 1), true)}
          ${kpi("Költség / raklap", f.ft(e.raklapKts), 100 * (e.raklapKts / bazis.raklapKts - 1), true)}
          ${kpi("Másnapi kiszolgálás", f.pct(e.gyorsArany, 0), e.gyorsArany - bazis.gyorsArany, false, " sz.pont")}
          ${kpi("Átlagos terítési táv", f.num(e.atlagTav, 0) + " km")}
        </div><small>Kiinduló állapot (csak Gyál): ${f.mft(bazis.ossz)} és ${f.pct(bazis.gyorsArany, 0)} másnapi kiszolgálás.</small>`;
      } else $("#m1-kpi", root).innerHTML = "";
      $("#m1-bontas", root).innerHTML = bontasHtml(e);
      $("#m1-gombok", root).innerHTML = lezart
        ? `<div class="note ok"><b>Beküldve, véglegesen:</b> ${esc(nyitott.map(id => D.RAKTARAK.find(r => r.id === id).nev).join(", "))} · ${f.mft(my.get("m1_bekuldott") ? my.get("m1_bekuldott").ossz : e.ossz)}</div>`
        : `<button class="btn accent" id="m1-send" ${e.megvalosithato ? "" : "disabled"}>Beküldés (végleges)</button><button class="btn small" id="m1-reset">Vissza a mai állapotra</button>`;
      if (!lezart) {
        $("#m1-reset", root).onclick = () => { nyitott = ["R1"]; LT.api.store.set(my.key("m1_nyitott"), nyitott); renderSajat(); };
        $("#m1-send", root).onclick = bekuld;
      }
    }
    async function bekuld() {
      const e = aktualis;
      if (!e || !e.megvalosithato || sajatKesz()) return;
      const nevek = e.nyitott.map(id => D.RAKTARAK.find(r => r.id === id).nev).join(", ");
      if (!confirm(`Beküldöd ezt a hálózatot (${nevek}, ${f.mft(e.ossz)})? Utána nem módosítható.`)) return;
      const rec = { ossz: e.ossz, nyitott: e.nyitott, gyors: e.gyorsArany, raklapKts: e.raklapKts };
      LT.api.store.set(my.key("m1_bekuldott"), rec);
      LT.api.store.set(my.key("m1_best"), rec);
      my.set("kesz_m1_kezi", true);
      renderSajat();
      await submit({ activity: "m1_kezi", kind: "result", value: Math.round(e.ossz * 100) / 100, dir: "min", text: nevek }, "Hálózat beküldve a versenybe");
    }
    board($("#m1-board", root), "m1_kezi", { mertek: "M Ft/év", fmt: v => f.num(v, 1), reszlet: true });
    renderSajat();
    kapu($("#m1-sajat", root), [{ kesz: tippKesz("m1_tipp"), szoveg: "Előbb véglegesítsd a tippedet az 1. lépésben." }]);

    /* ---- AI ---- */
    const kod = r => `${r.id} (${r.nev})`;
    ai($("#m1-ai", root), Object.assign({}, LT.ACT.m1_ai, {
      cim: "3 · AI: melyik raktárakat nyitná meg?",
      bevezeto: "Add oda az AI-nak ugyanazokat az adatokat, és kérj tőle hálózati javaslatot. Az oldal kiszámolja, mennyibe kerülne valójában a javasolt hálózat, és összeveti azzal, amit az AI állít.",
      kapu: [{ kesz: tippKesz("m1_tipp"), szoveg: "Előbb véglegesítsd a tippedet." }, { kesz: sajatKesz, szoveg: "Előbb küldd be a saját hálózatodat a 2. lépésben." }],
      magyarazat: [
        ["Szerep", "„Logisztikai hálózattervező vagy”: beállítja a szakmai nézőpontot és szókincset."],
        ["Adatok", "A jelölt raktárak fix költsége, kapacitása és gyártól mért távolsága, a vevők kereslete és távolsága minden raktártól. Minden szám benne van, így nincs mit kitalálnia."],
        ["Szabályok", "A két fuvardíj, és két kulcsfeltétel: egy nyitott raktár a teljes fix költségét fizeti, és legfeljebb a kapacitásáig szolgálhat ki."],
        ["Feladat és cél", "Egyetlen cél: a teljes éves költség minimalizálása. Pontosan ez a te versenyed szempontja is, így összehasonlíthatók."],
        ["Válaszformátum", "NYITOTT / BECSÜLT ÉVES KÖLTSÉG / INDOKLÁS sorok. Az oldal ebből olvassa ki a raktárakat, és a becslést összeveti a valós költséggel."],
        ["Mire figyelj?", "A nyelvi modell a sokváltozós összegzést gyakran becsüli, nem számolja ki. A javasolt hálózat lehet jó, a költségbecslés mégis téves, és fordítva."]
      ],
      prompt: () => {
        const sorok = D.UGYFELEK.map(u => `${u.id} ${u.nev}: ${u.keres} raklap/év; távolság (km): ` + D.RAKTARAK.map(r => `${r.id} ${Math.round(H.tav(r, u, BASE))}`).join(", ")).join("\n");
        return `Logisztikai hálózattervező vagy. A Lumen Ipari Zrt. (kitalált cég) eldönti, mely regionális raktárakat nyissa meg. Cél: a teljes éves logisztikai költség minimalizálása.

JELÖLT RAKTÁRAK (fix költség M Ft/év; kapacitás raklap/év; közúti távolság a székesfehérvári gyártól):
${D.RAKTARAK.map(r => `${kod(r)}: fix ${r.fix} M Ft/év; kapacitás ${r.kap}; gyártól ${Math.round(H.tav(D.GYAR, r, BASE))} km${r.meglevo ? " (ma ez az egyetlen raktár)" : ""}`).join("\n")}

VEVŐK (éves kereslet és közúti távolság az egyes jelölt raktáraktól):
${sorok}

KÖLTSÉGEK ÉS SZABÁLYOK:
- Gyár → raktár: ${BASE.beFuvar} Ft / raklap / km
- Raktár → vevő: ${BASE.kiFuvar} Ft / raklap / km
- Egy nyitott raktár a teljes fix költségét fizeti, és legfeljebb a kapacitásáig szolgálhat ki.
- Minden vevő teljes keresletét ki kell szolgálni.

FELADAT: Javasold, mely raktárakat nyissuk meg, és becsüld meg a teljes éves költséget (fix + gyár→raktár + raktár→vevő).
VÁLASZ FORMÁTUMA (pontosan így):
NYITOTT: <raktárkódok vesszővel, pl. R1, R3>
BECSÜLT ÉVES KÖLTSÉG: <szám> M Ft
INDOKLÁS: <legfeljebb 5 mondat>`;
      },
      ertekel: txt => {
        const ids = LT.core.P.raktarak((txt.match(/NYITOTT[^\n]*/i) || [txt])[0]);
        if (!ids.length) return { html: `<div class="note bad"><b>Nem találtunk raktárkódot</b> a válaszban. Kérd meg az AI-t, hogy a „NYITOTT: R1, R3” formátumot használja.</div>`, osszegzes: "értelmezhetetlen" };
        const e = H.megold(BASE, { nyitott: ids });
        const claimM = (txt.match(/K[ÖO]LTS[ÉE]G[^\d\n]{0,30}(\d[\d  .]*(?:,\d+)?)/i) || [])[1];
        const claim = claimM ? Number(claimM.replace(/[  .]/g, "").replace(",", ".")) : null;
        const nevek = ids.map(id => D.RAKTARAK.find(r => r.id === id).nev).join(", ");
        if (!e.megvalosithato) return { html: `<div class="note bad"><b>Az AI hálózata nem megvalósítható</b> (${esc(nevek)}): a kapacitás nem elég a teljes keresletre. Ezt az AI nem vette észre.</div>`, osszegzes: nevek + ": nem megvalósítható" };
        const sajat = my.get("m1_bekuldott");
        let h = `<div class="note info"><b>Az AI javaslata:</b> ${esc(nevek)} (${ids.length} raktár)</div>
          <table><thead><tr><th></th><th class="n">M Ft / év</th></tr></thead><tbody>
          <tr><td>Az AI által állított költség</td><td class="n">${claim !== null ? f.num(claim, 1) : "nem adott meg"}</td></tr>
          <tr><td><b>A javasolt hálózat valós költsége</b> (újraszámolva)</td><td class="n"><b>${f.num(e.ossz, 1)}</b></td></tr>
          <tr><td>Mai állapot (csak Gyál)</td><td class="n">${f.num(bazis.ossz, 1)}</td></tr>
          ${sajat ? `<tr><td>A te beküldött hálózatod</td><td class="n">${f.num(sajat.ossz, 1)}</td></tr>` : ""}
          ${my.get("m1_solved") ? `<tr><td>Solver optimuma</td><td class="n">${f.num(getOpt().ossz, 1)}</td></tr>` : ""}
          </tbody></table>`;
        if (claim !== null) {
          const elt = 100 * (claim / e.ossz - 1);
          h += `<div class="note ${Math.abs(elt) <= 3 ? "ok" : "warn"}"><b>${Math.abs(elt) <= 3 ? "A becslés pontos." : "Az AI számolása téves."}</b> Az állított költség ${f.num(Math.abs(elt), 1)}%-kal ${elt > 0 ? "magasabb" : "alacsonyabb"} a valósnál.</div>`;
        }
        h += bontasHtml(e, "Az AI-hálózat költségei");
        return { html: h, value: Math.round(e.ossz * 10) / 10, osszegzes: `${nevek}: ${f.num(e.ossz, 1)} M Ft (állított: ${claim !== null ? f.num(claim, 1) : "–"})` };
      }
    }));

    /* ---- Solver ---- */
    function renderOpt() {
      const o = getOpt();
      const all = H.mindenKonfig(BASE).slice(0, 6);
      const sajat = my.get("m1_bekuldott");
      $("#m1-opt", root).innerHTML = `
        <div class="kpis">${kpi("Optimális hálózat", o.nyitott.length + " raktár")}${kpi("Éves összköltség", f.mft(o.ossz), 100 * (o.ossz / bazis.ossz - 1), true)}${kpi("Másnapi kiszolgálás", f.pct(o.gyorsArany, 0))}${sajat ? kpi("A te megoldásod eltérése", "+" + f.pct(100 * (sajat.ossz / o.ossz - 1), 1)) : ""}</div>
        <div class="note ok"><b>Optimum:</b> ${o.nyitott.map(id => esc(D.RAKTARAK.find(r => r.id === id).nev)).join(", ")}.</div>
        <h4>A hat legolcsóbb hálózat</h4>
        <div class="tbl-wrap"><table><thead><tr><th>Nyitott raktárak</th><th class="n">M Ft / év</th><th class="n">Eltérés az optimumtól</th><th class="n">Másnapi kiszolgálás</th></tr></thead><tbody>
        ${all.map(e => `<tr><td>${e.nyitott.map(id => D.RAKTARAK.find(r => r.id === id).nev).join(", ")}</td><td class="n">${f.num(e.ossz, 1)}</td><td class="n">+${f.num(100 * (e.ossz / o.ossz - 1), 1)}%</td><td class="n">${f.pct(e.gyorsArany, 0)}</td></tr>`).join("")}
        </tbody></table></div>
        <div class="note info"><b>Gondold végig:</b> a második-harmadik legjobb hálózat költsége alig tér el az optimumtól, de a kiszolgálása más lehet. Ha a különbség 1-2%, a döntést már nem a solver hozza meg, hanem azok a szempontok, amelyek a modellben nem szerepelnek.</div>`;
      tipp.reveal(String(Math.min(o.nyitott.length, 5)));
    }
    $("#m1-solve", root).onclick = () => { LT.api.store.set(my.key("m1_solved"), true); renderOpt(); };
    kapu($("#m1-algo", root), [{ kesz: tippKesz("m1_tipp"), szoveg: "Előbb véglegesítsd a tippedet." }, { kesz: sajatKesz, szoveg: "Előbb küldd be a saját hálózatodat." }]);
    if (my.get("m1_solved")) renderOpt();

    /* ---- Érzékenység ---- */
    const sokkTipp = vote($("#m1-sokk-tipp", root), Object.assign({ mod: "tipp" }, LT.ACT.m1_sokk, {
      magyarazat: () => { const s = H.megold(Object.assign({}, BASE, { kiFuvar: BASE.kiFuvar * 1.5, beFuvar: BASE.beFuvar * 1.5 })); return `Drágább fuvar mellett megéri több raktárt fenntartani, hogy rövidebb legyen a terítés: az optimum ${s.nyitott.length} raktár.`; }
    }));
    kapu($("#m1-sokk-blokk", root), [{ kesz: tippKesz("m1_sokk"), szoveg: "Előbb véglegesítsd a tippedet az üzemanyag-sokkról." }]);
    const sl = { ki: $("#s-ki", root), be: $("#s-be", root), fix: $("#s-fix", root), gy: $("#s-gy", root) };
    function setSl(v) { sl.ki.value = v.ki; sl.be.value = v.be; sl.fix.value = v.fix; sl.gy.value = v.gy; outs(); }
    function outs() {
      $("#o-ki", root).textContent = sl.ki.value + " Ft"; $("#o-be", root).textContent = sl.be.value + " Ft";
      $("#o-fix", root).textContent = "×" + Number(sl.fix.value).toFixed(2); $("#o-gy", root).textContent = sl.gy.value === "0" ? "nincs elvárás" : "≥ " + sl.gy.value + "%";
    }
    Object.values(sl).forEach(s => s.addEventListener("input", outs));
    setSl({ ki: BASE.kiFuvar, be: BASE.beFuvar, fix: 1, gy: 0 });
    function runSens(isShock) {
      const p = Object.assign({}, BASE, { kiFuvar: Number(sl.ki.value), beFuvar: Number(sl.be.value), minGyors: Number(sl.gy.value) });
      const szorzo = Number(sl.fix.value);
      const orig = D.RAKTARAK.map(r => r.fix);
      D.RAKTARAK.forEach(r => (r.fix = r.fix * szorzo));
      let e;
      try { e = H.megold(p); } finally { D.RAKTARAK.forEach((r, i) => (r.fix = orig[i])); }
      const o = getOpt();
      if (!e.megvalosithato) { $("#m1-sens", root).innerHTML = `<div class="note bad"><b>Nincs megoldás:</b> ezzel az elvárt kiszolgálási szinttel a jelölt raktárakból nem teljesíthető a feladat.</div>`; return; }
      const nev = ids => ids.map(id => D.RAKTARAK.find(r => r.id === id).nev).join(", ");
      const valt = e.nyitott.join() !== o.nyitott.join();
      $("#m1-sens", root).innerHTML = `<h4>${isShock ? "Üzemanyag-sokk" : "A beállított forgatókönyv"}</h4>
        <div class="kpis">${kpi("Optimális hálózat", e.nyitott.length + " raktár")}${kpi("Éves összköltség", f.mft(e.ossz), 100 * (e.ossz / o.ossz - 1), true)}${kpi("Másnapi kiszolgálás", f.pct(e.gyorsArany, 0))}</div>
        <div class="note ${valt ? "warn" : "ok"}"><b>${valt ? "Változik a hálózat." : "Ugyanaz a hálózat marad optimális."}</b> Alapeset: ${esc(nev(o.nyitott))}. Most: ${esc(nev(e.nyitott))}.</div>
        <small>A költségváltozás az alapeset optimumához képest értendő.</small>`;
      if (isShock) {
        const ans = e.nyitott.length === o.nyitott.length ? "same" : e.nyitott.length < o.nyitott.length ? "less" : "more";
        sokkTipp.reveal(ans);
      }
    }
    $("#m1-shock", root).onclick = () => { setSl({ ki: Math.round(BASE.kiFuvar * 1.5), be: Math.round(BASE.beFuvar * 1.5), fix: 1, gy: 0 }); runSens(true); };
    $("#m1-run", root).onclick = () => runSens(false);
    $("#m1-alap", root).onclick = () => { setSl({ ki: BASE.kiFuvar, be: BASE.beFuvar, fix: 1, gy: 0 }); $("#m1-sens", root).innerHTML = ""; };

    /* ---- Döntés ---- */
    szoveg($("#m1-dontes", root), Object.assign({}, LT.ACT.m1_dontes, { placeholder: "Javaslatom: …", gomb: "Javaslat beküldése", minSzo: 20, okUzenet: "Javaslat beküldve: +2 pont" }));
    kapu($("#m1-dontes-kartya", root), [{ kesz: sajatKesz, szoveg: "Előbb küldd be a saját hálózatodat." }]);
  };
})();
