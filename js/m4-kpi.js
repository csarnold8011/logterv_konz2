/* 4. feladat: teljesítménymérés (KPI-pult) és integrált vezetői összefoglaló */
(function () {
  const LT = (window.LT = window.LT || {});
  LT.missions = LT.missions || {};
  const KATEGORIAK = ["Költség", "Kiszolgálás", "Hatékonyság", "Eszköz és kockázat"];

  LT.missions.m4 = function (root) {
    const { esc, $, $$, my, kesz, vote, tippKesz, ai, szoveg, kapu, step, submit, toast } = LT.ui;
    const D = LT.data, f = LT.core.fmt, H = LT.core.H, V = LT.core.V, W = LT.core.W;

    root.innerHTML = `
      <div class="mission-head mh-4"><div class="eyebrow">4. feladat · Teljesítménymérés</div>
        <h2>Egy lap a vezérigazgatónak</h2>
        <p>A vezérigazgató nem olvas el három elemzést. Egy pultot kér: hol tartunk ma, mit hoz a javaslat, és teljesül-e a cél. Ebben a feladatban megtanulod, mitől jó egy KPI-pult, összerakod a sajátodat az 1-3. feladat eredményeiből, és megírod a vezetői összefoglalót.</p></div>

      <div class="card">
        <h3>Mitől jó egy KPI-pult?</h3>
        <p>A <b>KPI</b> (kulcs-teljesítménymutató) egy szám, amely egy fontos célhoz méri a működést. Jó KPI-t csak ott érdemes mérni, ahol a szám <b>döntést mozgat</b>: ha a mutató elromlik, tudjuk, kinek mit kell tennie.</p>
        <div class="grid g4">
          <div class="kpi"><div class="l">Költség</div><div class="d">Mennyibe kerül? Például logisztikai költség raklaponként.</div></div>
          <div class="kpi"><div class="l">Kiszolgálás</div><div class="d">Megkapja-e a vevő, amit kért, időben? Például OTIF.</div></div>
          <div class="kpi"><div class="l">Hatékonyság</div><div class="d">Mennyi erőforrás kell hozzá? Például szedési sor/óra.</div></div>
          <div class="kpi"><div class="l">Eszköz és kockázat</div><div class="d">Mennyi pénz áll készletben, mennyire stabil? Például készletforgás.</div></div>
        </div>
        <p style="margin-top:12px">Egy jó pult <b>mind a négy kérdésre</b> ad legalább egy mutatót. Ha csak költséget mérünk, a csapat a kiszolgálás rovására spórol, és ezt senki nem veszi észre, amíg a vevő el nem megy.</p>
        <details class="mini"><summary>Bázis, terv, cél, gap: a pult négy oszlopa</summary>
          <table><tbody>
            <tr><td><b>Bázis</b></td><td>a mai működés mért értéke (honnan indulunk)</td></tr>
            <tr><td><b>Terv</b></td><td>amit a javaslat ígér (ide jutnánk)</td></tr>
            <tr><td><b>Cél</b></td><td>amit a vezetés elvár; legyen konkrét, mérhető és határidős (SMART)</td></tr>
            <tr><td><b>Gap</b></td><td>a terv és a cél, illetve a bázis és a terv közötti különbség: ezt kell megmagyarázni vagy bezárni</td></tr>
          </tbody></table>
          <p><b>Lámpák:</b> <span class="lamp g"></span>a terv eléri a célt, <span class="lamp y"></span>javul, de a célt nem éri el, <span class="lamp r"></span>nem javul vagy romlik.</p>
        </details>
        <details class="mini"><summary>Előrejelző és utólagos mutatók</summary>
          <p>Az <b>utólagos</b> (lagging) mutató a végeredményt méri, de későn szól (például az éves logisztikai költség). Az <b>előrejelző</b> (leading) mutató előre jelzi a bajt (például a járműkihasználtság vagy a szedési teljesítmény romlása). Egy jó pultban mindkettő van: az egyik a felelősséget mutatja, a másik a beavatkozás idejét.</p>
        </details>
      </div>


      <details class="box modszer"><summary><span class="ikon">Σ</span><span>Módszertan: hogyan számol a pult, a hatásmátrix és a számellenőrző?<small>Bázis és terv forrása, célok, lámpák, ±2%-os küszöb, számegyeztetés</small></span></summary><div class="tartalom">
        <h4>1. Honnan jönnek a számok?</h4>
        <ul class="tight">
          <li><b>Bázis (ma):</b> csak a gyáli raktár (az 1. feladat modelljével számolva), a diszpécser legközelebbi-szomszéd járatterve (2. feladat), a kódszám szerinti polcrend (3. feladat).</li>
          <li><b>Terv:</b> a te beküldött megoldásod az adott feladatban. Ha nincs ilyen, az algoritmus eredménye (solver, megtakarításos módszer, ABC-slotting); ezt a „Forrás” oszlop jelzi.</li>
          <li><b>Változás:</b> költség- és mennyiségi mutatóknál százalék: (terv / bázis − 1) × 100. Aránymutatóknál (%) százalékpont: terv − bázis, mert két százalék különbségét nem értelmes újabb százalékban kifejezni.</li>
        </ul>
        <h4>2. Célok és lámpák</h4>
        <p>A célok a bázishoz kötött, mérhető értékek (például „≤ bázis −10%”). A lámpa: <span class="lamp g"></span>zöld, ha a terv eléri a célt; <span class="lamp y"></span>sárga, ha a bázishoz képest javul, de a célt nem éri el; <span class="lamp r"></span>piros, ha nem javul. A „jobb” irány mutatónként adott: költségnél és gyaloglásnál a kisebb, kiszolgálásnál és termelékenységnél a nagyobb.</p>
        <h4>3. Hatásmátrix</h4>
        <p>Minden döntésnél az oldal a megfelelő modellt kétszer futtatja (a döntés előtt és után), és a két értéket hasonlítja össze. Ha a relatív eltérés 2%-on belül van, az eredmény „≈” (gyakorlatilag változatlan), egyébként ▲ vagy ▼.</p>
        <h4>4. Számellenőrző</h4>
        <p>A szövegből kigyűjti a számokat (a magyar írásmódot is: „296,5”, „1 250”), és mindegyiket összeveti a pult összes ismert értékével: bázis, terv, cél, különbség, változás, ezer forintra és km-re átváltva is. Egy szám akkor <b>igazolható</b>, ha 2%-on belül egyezik egy ismert értékkel, vagy annak egészre kerekített alakja. A felsorolás számai (1., 2., 3.) és a kis egész számok mértékegység nélkül semlegesek.</p>
        <p class="muted"><small>Korlát: a számellenőrző azt nézi, <b>létezik-e</b> a szám a pultban, azt nem, hogy a szöveg <b>jó helyen</b> használja-e (például egy költségváltozást kiszolgálási javulásként ír le). Ezt neked kell ellenőrizned; a zöld jelölésre mutatva látod, melyik mutatóhoz illesztette.</small></p>
      </div></details>

      <div class="card">${step("1 · Pultépítés", "kviz", "Melyik 5 mutató kerüljön a pultra?", "+2 pont, kiegyensúlyozott pultért +4")}<div id="m4-kpi-vote"></div></div>

      <div class="card" id="m4-hatas-kartya">
        ${step("2 · Hatásmátrix", "tipp", "Melyik döntés mit mozgat?", "+1 pont minden helyes celláért")}
        <p>Az 1-3. feladatban több döntést is kipróbáltál. Most tippeld meg, hogy az egyes döntések merre mozdítják a mutatókat: <b>▲ nő</b>, <b>▼ csökken</b> vagy <b>≈ nagyjából változatlan</b> (±2%-on belül). Egyszer küldheted be, utána az oldal a modellekből kiszámolja a valós hatást. A tanulság: egy döntés ritkán javít mindent egyszerre.</p>
        <div id="m4-hatas"></div>
      </div>

      <div class="card" id="m4-pult-card">
        ${step("3 · A pult", "algo", "A te KPI-pultod: bázis, terv, cél")}
        <p>A pult a te 1-3. feladatbeli beküldött megoldásaidból épül. Ahol még nem küldtél be megoldást, ott az algoritmus eredménye szerepel, és a „Forrás” oszlop ezt jelzi.</p>
        <div class="btn-row no-print"><button class="btn" id="m4-frissit">Frissítés a legújabb eredményeimmel</button><button class="btn small" id="m4-print">Nyomtatás / PDF</button></div>
        <div id="m4-pult"></div>
      </div>

      <div class="card">${step("4 · Kvíz", "kviz", "KPI-csapdák: mit rejt a szám?", "+3 pont kérdésenként, egy próbálkozás")}
        <div id="m4-q1"></div><hr class="sep"><div id="m4-q2"></div><hr class="sep"><div id="m4-q3"></div></div>

      <div class="card" id="m4-ossz-kartya">
        ${step("5 · Saját megoldás", "verseny", "A vezetői összefoglalód", "+4 pont, és +3 minden kapott szavazatért")}
        <p>Írd meg <b>a saját szavaiddal</b> a vezérigazgatónak szóló összefoglalót, legfeljebb 150 szóban: egy mondat a helyzetről, a 3 legfontosabb eredmény számokkal, egy kockázat vagy kompromisszum, és 2-3 javaslat. Az AI csak utána ír, hogy össze tudd vetni a kettőt.</p>
        <div id="m4-korabbi"></div>
        <div class="btn-row"><button class="btn small" id="m4-ellenoriz">Számaim ellenőrzése a pult alapján</button></div>
        <div id="m4-ossz"></div>
        <div id="m4-ossz-check"></div>
      </div>

      <div id="m4-ai"></div>

      <div class="card" id="m4-peer-kartya">
        ${step("7 · Szavazás", "verseny", "Kinek az összefoglalóját vinnéd a vezetőségi ülésre?", "a sajátodra nem szavazhatsz")}
        <div id="m4-peer"></div>
      </div>`;

    /* ---- KPI-válogató ---- */
    const katOf = {}; D.KPI_LISTA.forEach(k => (katOf[k.id] = k.kat));
    const lefedes = sel => new Set(sel.map(id => katOf[id]));
    vote($("#m4-kpi-vote", root), Object.assign({ mod: "velemeny" }, LT.ACT.m4_kpi, {
      kerdes: LT.ACT.m4_kpi.kerdes + " <small class='muted'>(Mindegyik mellett ott a kategóriája.)</small>",
      opciok: D.KPI_LISTA.map(k => ({ id: k.id, label: k.nev, sub: k.leiras, cimke: k.kat })),
      pontFv: sel => { const l = lefedes(sel); return 2 + (l.size >= 3 && l.has("Költség") && l.has("Kiszolgálás") ? 2 : 0); },
      utoKommentar: sel => {
        const l = lefedes(sel), hiany = KATEGORIAK.filter(k => !l.has(k));
        const jo = l.size >= 3 && l.has("Költség") && l.has("Kiszolgálás");
        return `<div class="note ${jo ? "ok" : "warn"}"><b>${jo ? "Kiegyensúlyozott pult (+4 pont)." : "Egyoldalú pult (+2 pont)."}</b> Lefedett kategóriák: ${[...l].join(", ")}.${hiany.length ? ` Hiányzik: <b>${hiany.join(", ")}</b>. Mi történhet, amit így senki nem vesz észre?` : " Mind a négy kérdésre van mutatód."}</div>`;
      }
    }));

    /* ---- Modelladatok ---- */
    const BASE = D.HALOZAT_ALAP;
    const A = { jarmu: "kicsi", idoablak: true };
    const cache = {};
    const memo = (k, fn) => (cache[k] = cache[k] || fn());
    const nb = () => memo("nb", () => H.megold(BASE, { nyitott: ["R1"] }));
    const nopt = () => memo("nopt", () => H.megold(BASE));
    const vnn = () => memo("vnn", () => V.ertekel(V.legkozelebbi(A), A));
    const vcw = () => memo("vcw", () => V.ertekel(V.megtakaritasos(A), A));

    /* ---- Hatásmátrix ---- */
    function hatasSorok() {
      const o = nopt(), b = nb();
      const shockP = Object.assign({}, BASE, { kiFuvar: BASE.kiFuvar * 1.5, beFuvar: BASE.beFuvar * 1.5 });
      const sh = memo("sh", () => H.megold(shockP));
      const B = { jarmu: "nagy", idoablak: true };
      const vb = memo("vb", () => V.ertekel(V.megtakaritasos(B), B));
      const wk = memo("wk", () => W.ertekel(W.kezdo(), "vissza")), wa = memo("wa", () => W.ertekel(W.abcElrendezes(), "vissza"));
      const nevek = ids => ids.map(id => D.RAKTARAK.find(r => r.id === id).nev).join(", ");
      return [
        { d: `Regionális raktárak nyitása (${nevek(o.nyitott)} a csak-Gyál helyett)`, k: [
          ["Éves logisztikai összköltség", b.ossz, o.ossz, "M Ft", 1], ["Másnapi kiszolgálás aránya", b.gyorsArany, o.gyorsArany, "%", 0], ["Raktárak fix költsége", b.fixKts, o.fixKts, "M Ft", 0]] },
        { d: "18 raklapos teherautók a 12 raklapos helyett", k: [
          ["Járművek száma", vcw().jarmuDb, vb.jarmuDb, "db", 0], ["Napi km", vcw().km, vb.km, "km", 0], ["Napi szállítási költség", vcw().ossz, vb.ossz, "Ft", 0]] },
        { d: "Megtakarításos tervezés a diszpécser-szabály helyett", k: [
          ["Napi km", vnn().km, vcw().km, "km", 0], ["Időben kiszolgált vevők", vnn().idobenArany, vcw().idobenArany, "%", 0], ["Napi szállítási költség", vnn().ossz, vcw().ossz, "Ft", 0]] },
        { d: "ABC-slotting a kódszám szerinti polcrend helyett", k: [
          ["Napi szedési gyaloglás", wk.ut, wa.ut, "m", 0], ["Szedési sor / óra", wk.sorPerOra, wa.sorPerOra, "sor/óra", 1], ["Naponta kiszedett sorok száma", wk.sorok, wa.sorok, "sor", 0]] },
        { d: "Üzemanyag-sokk: +50% fuvardíj (optimális hálózattal)", k: [
          ["Éves logisztikai összköltség", o.ossz, sh.ossz, "M Ft", 1], ["Optimális raktárszám", o.nyitott.length, sh.nyitott.length, "db", 0], ["Másnapi kiszolgálás aránya", o.gyorsArany, sh.gyorsArany, "%", 0]] }
      ];
    }
    const irany = (a, b) => { const r = a === 0 ? (b === 0 ? 0 : 1) : (b - a) / Math.abs(a); return Math.abs(r) < 0.02 ? "≈" : r > 0 ? "▲" : "▼"; };
    function renderHatas() {
      const sorok = hatasSorok(), done = kesz("m4_hatas");
      const valasz = my.get("hatas_valasz", {});
      let jo = 0, ossz = 0;
      $("#m4-hatas", root).innerHTML = `<div class="tbl-wrap"><table class="hatas-tbl"><thead><tr><th>Döntés</th><th>Mutató</th><th>Tipped</th>${done ? "<th>Valós hatás</th><th>Bázis → új</th>" : ""}</tr></thead><tbody>
        ${sorok.map((s, i) => s.k.map((k, j) => {
          const key = i + "_" + j, ir = irany(k[1], k[2]), v = valasz[key] || "";
          if (done) { ossz++; if (v === ir) jo++; }
          return `<tr>${j === 0 ? `<td rowspan="3"><b>${esc(s.d)}</b></td>` : ""}<td class="mut">${esc(k[0])}</td>
            <td class="${done ? (v === ir ? "cell-ok" : "cell-bad") : ""}">${done ? `<span class="irany">${v || "–"}</span>` : `<select data-k="${key}" aria-label="${esc(s.d + ": " + k[0])}"><option value="">?</option><option ${v === "▲" ? "selected" : ""}>▲</option><option ${v === "▼" ? "selected" : ""}>▼</option><option ${v === "≈" ? "selected" : ""}>≈</option></select>`}</td>
            ${done ? `<td><span class="irany">${ir}</span></td><td class="n"><small>${f.num(k[1], k[4])} → ${f.num(k[2], k[4])} ${esc(k[3])}</small></td>` : ""}</tr>`;
        }).join("")).join("")}
        </tbody></table></div>
        ${done ? `<div class="note ${jo >= 11 ? "ok" : "info"}"><b>${jo} / ${ossz} helyes tipp (+${jo} pont).</b> Figyeld meg: a nagyobb teherautó kevesebb autót és km-t jelent, mégis drágább; a több raktár jobb kiszolgálást és alacsonyabb összköltséget hoz, de nő a fix költség. Ezeket a kompromisszumokat kell a vezetői összefoglalóban kimondani.</div>`
          : `<div class="btn-row"><button class="btn accent" id="m4-hatas-send">Hatásmátrix beküldése (végleges)</button><small>Mind a 15 cellát töltsd ki.</small></div>`}`;
      if (done) return;
      $$("#m4-hatas select", root).forEach(s => s.onchange = () => { const v = my.get("hatas_valasz", {}); v[s.dataset.k] = s.value; LT.api.store.set(my.key("hatas_valasz"), v); });
      $("#m4-hatas-send", root).onclick = async () => {
        const v = my.get("hatas_valasz", {});
        const keys = sorok.flatMap((s, i) => s.k.map((_, j) => i + "_" + j));
        if (keys.some(k => !v[k])) { toast("Minden cellát tölts ki.", "err"); return; }
        if (!confirm("Beküldöd a hatásmátrixot? Utána nem módosítható.")) return;
        const pont = keys.filter(k => { const [i, j] = k.split("_").map(Number); const kk = sorok[i].k[j]; return v[k] === irany(kk[1], kk[2]); }).length;
        my.set("kesz_m4_hatas", true);
        renderHatas();
        await submit({ activity: "m4_hatas", kind: "text", text: keys.map(k => k + ":" + v[k]).join(" "), option: `${pont}/15 helyes`, value: pont, points: pont }, `Hatásmátrix beküldve: +${pont} pont`);
      };
    }
    renderHatas();

    /* ---- A pult ---- */
    function adatok() {
      const b = nb();
      const n1 = my.get("m1_bekuldott");
      let nt, nForras;
      if (n1) { nt = { ossz: n1.ossz, raklapKts: n1.raklapKts, gyorsArany: n1.gyors, db: n1.nyitott.length, nevek: n1.nyitott, fix: n1.nyitott.reduce((s, id) => s + D.RAKTARAK.find(r => r.id === id).fix, 0) }; nForras = "saját"; }
      else { const o = nopt(); nt = { ossz: o.ossz, raklapKts: o.raklapKts, gyorsArany: o.gyorsArany, db: o.nyitott.length, nevek: o.nyitott, fix: o.fixKts }; nForras = "solver"; }
      const v2 = my.get("m2_bekuldott");
      let vt, vForras;
      if (v2) { vt = { ossz: v2.ossz, km: v2.km, idoben: v2.idoben, kihaszn: v2.kihaszn, db: v2.jarmuDb }; vForras = "saját"; }
      else { const c = vcw(); vt = { ossz: c.ossz, km: c.km, idoben: c.idobenArany, kihaszn: c.kihasznaltsag, db: c.jarmuDb }; vForras = "heurisztika"; }
      const wb = memo("wk", () => W.ertekel(W.kezdo(), "vissza"));
      const w3 = my.get("m3_bekuldott");
      let wt, wForras;
      if (w3) { wt = { ut: w3.ut, spo: w3.sorPerOra }; wForras = "saját"; }
      else { const a = memo("wa", () => W.ertekel(W.abcElrendezes(), "vissza")); wt = { ut: a.ut, spo: a.sorPerOra }; wForras = "ABC-algoritmus"; }
      const vb = vnn();
      const nev = ids => ids.map(id => D.RAKTARAK.find(r => r.id === id).nev).join(", ");
      const sorok = [
        { csop: "Hálózat", nev: "Éves logisztikai hálózati költség", egys: "M Ft", b: b.ossz, t: nt.ossz, d: 1, le: true, cel: b.ossz * 0.97, celTxt: "≤ bázis −3%", forras: nForras, mit: "fix raktárköltség + gyár→raktár fuvar + terítés, egy évre", tip: "utólagos" },
        { csop: "Hálózat", nev: "Logisztikai költség / raklap", egys: "Ft", b: b.raklapKts, t: nt.raklapKts, d: 0, le: true, cel: b.raklapKts * 0.97, celTxt: "≤ bázis −3%", forras: nForras, mit: "éves összköltség / éves raklapszám (cost-to-serve)", tip: "utólagos" },
        { csop: "Hálózat", nev: "Másnapi kiszolgálás aránya", egys: "%", b: b.gyorsArany, t: nt.gyorsArany, d: 0, le: false, cel: 60, celTxt: "≥ 60%", forras: nForras, mit: "a kereslet hány %-a van 100 km-en belül a kiszolgáló raktártól", tip: "előrejelző" },
        { csop: "Szállítás", nev: "Napi terítési költség", egys: "Ft", b: vb.ossz, t: vt.ossz, d: 0, le: true, cel: vb.ossz * 0.9, celTxt: "≤ bázis −10%", forras: vForras, mit: "autók napi fix díja + km-díj + késés + túlóra", tip: "utólagos" },
        { csop: "Szállítás", nev: "Napi járműkilométer", egys: "km", b: vb.km, t: vt.km, d: 0, le: true, cel: vb.km * 0.9, celTxt: "≤ bázis −10%", forras: vForras, mit: "az összes járat futásteljesítménye egy nap", tip: "előrejelző" },
        { csop: "Szállítás", nev: "Időben kiszolgált vevők", egys: "%", b: vb.idobenArany, t: vt.idoben, d: 0, le: false, cel: 100, celTxt: "100%", forras: vForras, mit: "a vevők hány %-ánál ér oda az autó a határidőig", tip: "utólagos" },
        { csop: "Szállítás", nev: "Járműkihasználtság", egys: "%", b: vb.kihasznaltsag, t: vt.kihaszn, d: 0, le: false, cel: 85, celTxt: "≥ 85%", forras: vForras, mit: "szállított raklap / (autók száma × kapacitás)", tip: "előrejelző" },
        { csop: "Raktár", nev: "Napi szedési gyaloglás", egys: "m", b: wb.ut, t: wt.ut, d: 0, le: true, cel: wb.ut * 0.75, celTxt: "≤ bázis −25%", forras: wForras, mit: "a szedők napi gyalogútja a visszafordulós bejárással", tip: "előrejelző" },
        { csop: "Raktár", nev: "Szedési termelékenység", egys: "sor/óra", b: wb.sorPerOra, t: wt.spo, d: 1, le: false, cel: wb.sorPerOra * 1.15, celTxt: "≥ bázis +15%", forras: wForras, mit: "szedési sorok / ráfordított óra (gyaloglás + levétel + adminisztráció)", tip: "utólagos" }
      ];
      sorok.forEach(s => {
        s.valt = s.egys === "%" ? s.t - s.b : 100 * (s.t / s.b - 1);
        s.valtTxt = (s.valt > 0 ? "+" : "") + f.num(s.valt, 1) + (s.egys === "%" ? " sz.pont" : "%");
        const jobb = s.le ? s.t < s.b - 1e-9 : s.t > s.b + 1e-9;
        const cel = s.le ? s.t <= s.cel + 1e-9 : s.t >= s.cel - 1e-9;
        s.lampa = cel ? "g" : jobb ? "y" : "r";
      });
      return { sorok, halozat: nev(nt.nevek), raktarDb: nt.db, fixValt: nt.fix - b.fixKts, jarmuDb: vt.db, jarmuBazis: vb.jarmuDb };
    }
    let A_ = null;
    function renderPult() {
      const a = (A_ = adatok());
      const fx = (v, d, e) => e === "%" ? f.num(v, d) + "%" : f.num(v, d);
      let cs = "";
      const s0 = a.sorok;
      const kompromisszum = [];
      if (s0[0].t < s0[0].b && a.fixValt > 0) kompromisszum.push(`A hálózati összköltség ${f.num(Math.abs(s0[0].valt), 1)}%-kal csökken, közben a raktárak fix költsége ${f.num(a.fixValt, 0)} M Ft-tal nő: a megtakarítás a fuvaron keletkezik, és ehhez fix kötelezettséget vállalunk.`);
      if (s0[2].t > s0[2].b) kompromisszum.push(`A másnapi kiszolgálás ${f.num(s0[2].t - s0[2].b, 0)} százalékponttal javul: ez vevői érték, amely a költségmutatókban nem látszik.`);
      if (s0[5].t > s0[5].b) kompromisszum.push(`A határidős vevők kiszolgálása ${f.num(s0[5].b, 0)}%-ról ${f.num(s0[5].t, 0)}%-ra javul, miközben a napi km ${f.num(Math.abs(s0[4].valt), 0)}%-kal ${s0[4].t < s0[4].b ? "csökken" : "nő"}.`);
      if (s0[7].t < s0[7].b) kompromisszum.push(`A szedők napi gyaloglása ${f.num(Math.abs(s0[7].valt), 0)}%-kal rövidül; ez kb. ${f.num(s0[8].valt, 0)}%-kal több szedési sort jelent óránként, ugyanannyi emberrel.`);
      $("#m4-pult", root).innerHTML = `
        <div class="kpis">
          ${["g", "y", "r"].map(l => `<div class="kpi"><div class="l"><span class="lamp ${l}"></span>${{ g: "Cél teljesül", y: "Javul, cél még nincs meg", r: "Nem javul" }[l]}</div><div class="v">${a.sorok.filter(s => s.lampa === l).length} mutató</div></div>`).join("")}
        </div>
        <div class="tbl-wrap"><table><thead><tr><th>Terület</th><th>Mutató</th><th class="n">Bázis (ma)</th><th class="n">Terv</th><th class="n">Változás</th><th class="n">Cél</th><th>Állapot</th><th>Forrás</th></tr></thead><tbody>
        ${a.sorok.map(s => { const c = s.csop !== cs ? (cs = s.csop) : ""; return `<tr><td><b>${c}</b></td><td title="${esc(s.mit)}">${s.nev} <small>(${s.egys})</small></td><td class="n">${fx(s.b, s.d, s.egys)}</td><td class="n"><b>${fx(s.t, s.d, s.egys)}</b></td><td class="n ${(s.le ? s.valt < 0 : s.valt > 0) ? "up-good" : Math.abs(s.valt) < 0.05 ? "" : "up-bad"}">${s.valtTxt}</td><td class="n">${s.celTxt}</td><td><span class="lamp ${s.lampa}"></span></td><td><small>${s.forras === "saját" ? "a te eredményed" : s.forras}</small></td></tr>`; }).join("")}
        </tbody></table></div>
        <small>Terv: ${a.raktarDb} raktár (${esc(a.halozat)}), ${a.jarmuDb} teherautó naponta. Bázis: a mai működés (csak a gyáli raktár, a diszpécser legközelebbi-szomszéd terve, kódszám szerinti polcrend).</small>
        <details class="mini"><summary>Mit mér pontosan az egyes mutató?</summary><table><thead><tr><th>Mutató</th><th>Számítás</th><th>Típus</th></tr></thead><tbody>
          ${a.sorok.map(s => `<tr><td>${s.nev}</td><td>${esc(s.mit)}</td><td>${s.tip}</td></tr>`).join("")}</tbody></table></details>
        ${kompromisszum.length ? `<h4 style="margin-top:12px">Mit mond a pult? (a számokból generálva)</h4><ul class="tight">${kompromisszum.map(k => `<li>${k}</li>`).join("")}</ul>` : ""}
        <h4 style="margin-top:12px">Működési mutatók, amelyeket ma nem modelleztünk</h4>
        <div class="kpis">
          <div class="kpi"><div class="l">OTIF</div><div class="v">${f.pct(D.MUKODES_BAZIS.otif)}</div><div class="d">cél: 95%</div></div>
          <div class="kpi"><div class="l">Kitöltési arány</div><div class="v">${f.pct(D.MUKODES_BAZIS.fill)}</div><div class="d">cél: 98%</div></div>
          <div class="kpi"><div class="l">Rendelési átfutás</div><div class="v">${f.num(D.MUKODES_BAZIS.atfutas, 1)} nap</div><div class="d">cél: 2 nap</div></div>
          <div class="kpi"><div class="l">Készletforgás</div><div class="v">${f.num(D.MUKODES_BAZIS.keszlet, 1)}×</div><div class="d">cél: 7×</div></div>
        </div>
        <div class="note info"><b>Gondold végig:</b> melyik javulást „fizetjük meg” egy másik mutatóval? Melyik piros vagy sárga mutató mögött van tudatos döntés, és melyik mögött csak elmaradás? A több raktár például jobb kiszolgálást hoz, de valószínűleg több készletet is (a készletforgás romolhat), amit ez a pult még nem mér.</div>`;
    }
    $("#m4-frissit", root).onclick = () => { renderPult(); toast("A pult frissítve"); };
    $("#m4-print", root).onclick = () => { root.classList.add("print-me"); window.print(); setTimeout(() => root.classList.remove("print-me"), 500); };
    renderPult();
    document.addEventListener("lt-valtozas", () => { if (root.closest(".view.active")) renderPult(); });

    /* ---- Kvíz ---- */
    ["m4_kviz1", "m4_kviz2", "m4_kviz3"].forEach((id, i) => vote($("#m4-q" + (i + 1), root), Object.assign({ mod: "kviz" }, LT.ACT[id])));

    /* ---- Számellenőrzés ---- */
    function ismertSzamok() {
      const a = A_ || adatok(), out = [];
      a.sorok.forEach(s => {
        out.push({ ertek: s.b, cimke: s.nev + " (bázis)" }, { ertek: s.t, cimke: s.nev + " (terv)" },
          { ertek: Math.abs(s.valt), cimke: s.nev + " (változás)" }, { ertek: Math.abs(s.t - s.b), cimke: s.nev + " (különbség)" }, { ertek: s.cel, cimke: s.nev + " (cél)" });
        if (s.egys === "Ft") out.push({ ertek: s.b / 1000, cimke: s.nev + " (bázis, ezer Ft)" }, { ertek: s.t / 1000, cimke: s.nev + " (terv, ezer Ft)" }, { ertek: Math.abs(s.t - s.b) / 1000, cimke: s.nev + " (különbség, ezer Ft)" });
        if (s.egys === "m") out.push({ ertek: s.b / 1000, cimke: s.nev + " (bázis, km)" }, { ertek: s.t / 1000, cimke: s.nev + " (terv, km)" }, { ertek: Math.abs(s.t - s.b) / 1000, cimke: s.nev + " (különbség, km)" });
        if (s.egys !== "%") out.push({ ertek: Math.abs(100 * (s.t / s.b - 1)), cimke: s.nev + " (változás %)" });
      });
      out.push({ ertek: a.raktarDb, cimke: "raktárak száma" }, { ertek: a.jarmuDb, cimke: "teherautók száma" }, { ertek: a.jarmuBazis, cimke: "teherautók (bázis)" }, { ertek: Math.abs(a.fixValt), cimke: "fix költség változása (M Ft)" });
      Object.entries(D.MUKODES_BAZIS).forEach(([k, v]) => out.push({ ertek: v, cimke: k }));
      [95, 98, 2, 7, 60, 100, 85, 3, 10, 25, 15].forEach(v => out.push({ ertek: v, cimke: "célérték" }));
      return out;
    }
    function ellenorzes(txt) {
      const res = LT.core.P.ellenoriz(txt, ismertSzamok());
      let h = "", pos = 0;
      for (const n of res) {
        h += esc(txt.slice(pos, n.start));
        const s = esc(txt.slice(n.start, n.end));
        h += n.talalat ? `<mark class="ok" title="${esc(n.talalat.cimke)}">${s}</mark>` : n.semleges ? s : `<mark class="chk" title="Nem találtuk a pultban: ellenőrizd!">${s}</mark>`;
        pos = n.end;
      }
      h += esc(txt.slice(pos));
      const ok = res.filter(n => n.talalat).length, gyanus = res.filter(n => !n.talalat && !n.semleges).length;
      return { html: `<div class="fact-text">${h}</div><div class="note ${gyanus ? "warn" : "ok"}"><b>${ok} szám igazolható</b> a pultból (zöld; rámutatva látszik, melyik mutatóból)${gyanus ? `, <b>${gyanus} szám nem</b> (sárga): ezeket ellenőrizd, vagy hagyd el.` : "."}</div>`, ok, gyanus };
    }

    /* ---- Saját összefoglaló ---- */
    const korabbi = [["Hálózati javaslatod", "m1_dontes"], ["Fuvarszervezési javaslatod", "m2_dontes"]].map(([c, id]) => [c, my.get("szoveg_" + id, "")]).filter(x => x[1]);
    $("#m4-korabbi", root).innerHTML = korabbi.length ? `<details class="mini"><summary>A korábbi javaslataid (az 1. és 2. feladatból)</summary>${korabbi.map(([c, t]) => `<p><b>${c}:</b> ${esc(t)}</p>`).join("")}</details>` : "";
    szoveg($("#m4-ossz", root), Object.assign({}, LT.ACT.m4_ossz, {
      placeholder: "Tisztelt Vezérigazgató Úr! …", gomb: "Összefoglaló beküldése", minSzo: 40, maxSzo: 170, magassag: 180,
      okUzenet: `Összefoglaló beküldve: +${LT.ACT.m4_ossz.pont} pont`,
      extra: t => { const r = ellenorzes(t); return { value: r.gyanus, option: `${r.ok} igazolt / ${r.gyanus} nem igazolt szám` }; }
    }));
    $("#m4-ellenoriz", root).onclick = () => {
      const t = (root.querySelector("#m4-ossz textarea") || {}).value || my.get("szoveg_m4_ossz", "");
      $("#m4-ossz-check", root).innerHTML = t.trim() ? ellenorzes(t).html : `<div class="note warn">Előbb írj valamit.</div>`;
    };

    /* ---- AI ---- */
    ai($("#m4-ai", root), Object.assign({}, LT.ACT.m4_ai, {
      cim: "6 · AI: írja meg ő is a vezetői összefoglalót",
      bevezeto: "Az AI ugyanazokból a számokból ír összefoglalót. Az oldal minden számát összeveti a pulttal, és melléteszi a te szövegedet is. Ki fogalmazott pontosabban, és ki vette észre a kompromisszumokat?",
      kapu: [{ kesz: () => kesz("m4_ossz"), szoveg: "Előbb küldd be a saját vezetői összefoglalódat az 5. lépésben." }],
      magyarazat: [
        ["Szerep", "„Logisztikai vezető vagy”: a vezetői hangnem és a felelősségvállalás nézőpontja."],
        ["Adatok", "A teljes KPI-pult (bázis, terv, változás, cél, állapot) és a korábbi döntési javaslataid. Ugyanazt kapja, amit te láttál."],
        ["Szabályok", "Legfeljebb 150 szó, kizárólag a megadott számok, nem számolhat újat és nem kerekíthet át. Ez a legfontosabb sor: e nélkül a modellek „szépítik” a számokat."],
        ["Feladat", "Vezetői összefoglaló a vezérigazgatónak."],
        ["Válaszformátum", "Kötött szerkezet: helyzet, 3 eredmény számokkal, kockázat vagy kompromisszum, 3 javaslat. Így összevethető a te szövegeddel."],
        ["Mire figyelj?", "A számellenőrző sárgával jelöli azt a számot, amely nem szerepel a pultban. Gyakori a kerekítés, az elcserélt mértékegység és a kitalált megtakarítás."]
      ],
      prompt: () => {
        const a = A_ || adatok();
        const tab = a.sorok.map(s => `- ${s.csop} / ${s.nev}: bázis ${f.num(s.b, s.d)} ${s.egys}, terv ${f.num(s.t, s.d)} ${s.egys} (${s.valtTxt}), cél ${s.celTxt}, állapot: ${{ g: "teljesül", y: "javul, de a cél nincs meg", r: "nem javul" }[s.lampa]}`).join("\n");
        const dont = [["Hálózat", my.get("szoveg_m1_dontes", "")], ["Szállítás", my.get("szoveg_m2_dontes", "")]].filter(x => x[1].trim()).map(x => `- ${x[0]}: ${x[1].trim()}`).join("\n");
        return `Logisztikai vezető vagy a Lumen Ipari Zrt.-nél (kitalált ipari világítástechnikai gyártó). Írj vezetői összefoglalót a vezérigazgatónak a logisztikai fejlesztési javaslatról.

JAVASOLT HÁLÓZAT: ${a.raktarDb} raktár (${a.halozat}), napi ${a.jarmuDb} teherautó. A raktárak fix költsége ${f.num(a.fixValt, 0)} M Ft-tal változik.

KPI-PULT (bázis = mai működés, terv = javaslat):
${tab}

KORÁBBI DÖNTÉSI JAVASLATOK:
${dont || "- (nincs megadva)"}

SZABÁLYOK:
- Legfeljebb 150 szó, magyarul, vezetői hangnemben.
- KIZÁRÓLAG a fenti számokat használd. Ne számolj új számot, ne kerekíts át, ne találj ki adatot.
- Szerkezet: 1 mondat a helyzetről; a 3 legfontosabb eredmény számokkal; 1 mondat a kockázatról vagy kompromisszumról; 3 rövid, számozott javaslat a következő lépésekre.`;
      },
      ertekel: txt => {
        const r = ellenorzes(txt);
        const sajat = my.get("szoveg_m4_ossz", "");
        const rs = sajat ? ellenorzes(sajat) : null;
        return {
          html: `<div class="grid g2e"><div><h4>Az AI szövege</h4>${r.html}</div><div><h4>A te szöveged</h4>${rs ? rs.html : "<small>(nincs)</small>"}</div></div>
            <div class="note info"><b>Vesd össze:</b> melyik szöveg mondja ki a kompromisszumot (fix költség kontra fuvar, kiszolgálás kontra költség)? Melyik ad konkrét, felelőshöz rendelhető javaslatot? Melyikben van kitalált vagy rosszul kerekített szám?</div>`,
          value: r.gyanus, osszegzes: `AI: ${r.ok} igazolt, ${r.gyanus} nem igazolt szám; saját: ${rs ? rs.ok + " / " + rs.gyanus : "–"}`
        };
      }
    }));

    /* ---- Szavazás ---- */
    function renderPeer(st) {
      const list = ((st && st.texts && st.texts.m4_ossz) || []).filter(t => t.team !== LT.api.team);
      const mine = my.get("peer_m4");
      const cnt = (st && st.peer && st.peer.m4_peer) || {};
      if (!list.length) { $("#m4-peer", root).innerHTML = `<small>Még nincs más résztvevőtől beküldött összefoglaló. A lista élőben frissül.</small>`; return; }
      $("#m4-peer", root).innerHTML = `<p class="muted">${mine ? `Szavazatod rögzítve: <b>${esc(mine)}</b>. Nem módosítható.` : "Egy szavazatod van, és nem módosítható. Olvasd el mindet, mielőtt szavazol! Az eddigi szavazatok száma a saját szavazatod után jelenik meg."}</p><div class="grid g2e">${list.map(t => `
        <div class="card flat" style="margin:0">
          <div class="step"><h3>${esc(t.team)}</h3>${t.option ? `<span class="tag">${esc(t.option)}</span>` : ""}${mine ? `<span class="tag ok">${cnt[t.team] || 0} szavazat</span>` : ""}</div>
          <div class="fact-text">${esc(t.text)}</div>
          ${mine ? (mine === t.team ? `<div class="btn-row"><span class="done-mark">✓ Erre szavaztál</span></div>` : "") : `<div class="btn-row"><button class="btn" data-peer="${esc(t.team)}">Erre szavazok</button></div>`}
        </div>`).join("")}</div>`;
      $$("[data-peer]", root).forEach(b => b.onclick = async () => {
        if (my.get("peer_m4")) return;
        if (!confirm(`Szavazol ${b.dataset.peer} összefoglalójára? Utána nem módosítható.`)) return;
        my.set("peer_m4", b.dataset.peer);
        renderPeer(LT.api.state);
        await submit({ activity: "m4_peer", kind: "peer", option: b.dataset.peer }, "Szavazat rögzítve");
      });
    }
    LT.api.onState(renderPeer);
    renderPeer(LT.api.state);
    root.appendChild(LT.ui.el(`<a class="ert-sav" href="#ertekeles"><span class="ikon">✎</span><span><b>Végeztél? Értékeld a kurzust!</b><small>Névtelen, önkéntes, nem jár érte pont: a kurzusról, a notebook alapú és a HTML-alapú oktatásról.</small></span><span class="nyil">→</span></a>`));
    kapu($("#m4-peer-kartya", root), [{ kesz: () => kesz("m4_ossz"), szoveg: "Előbb küldd be a saját összefoglalódat; utána szavazhatsz másokéra." }]);
  };
})();
