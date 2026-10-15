/* Keret: belépés, navigáció, fejléc, munkaasztal (Start), ranglista, tanári kivetítő, lábléc */
(function () {
  const LT = window.LT, C = window.LT_CONFIG;
  const { esc, $, $$, el, toast } = LT.ui;
  const params = new URLSearchParams(location.search);
  const TANAR = params.has("tanar");

  /* ---------------- Belépés: név + Neptun-kód ---------------- */
  function join() {
    return new Promise(resolve => {
      const saved = LT.api.store.get("lt_join", null);
      const urlSession = (params.get("s") || "").trim().toUpperCase();
      if (TANAR) { resolve({ session: urlSession || (saved && saved.session) || C.SESSION, team: null }); return; }
      if (saved && saved.team && saved.neptun && (!urlSession || urlSession === saved.session)) { resolve(saved); return; }
      const m = el(`<div class="modal-bg"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="jt">
        <div class="eyebrow" style="color:var(--brand-2);font-weight:800;font-size:.74rem;letter-spacing:.1em;text-transform:uppercase">${esc(C.KURZUS)}</div>
        <h2 id="jt" style="margin-top:4px">Belépés a tervezőasztalhoz</h2>
        <p class="muted">Mindenki egyénileg dolgozik. A ranglistán és a kivetítőn csak a neved látszik, a Neptun-kódod nem.</p>
        <div class="field"><label for="jn">Teljes név</label><input type="text" id="jn" maxlength="40" placeholder="pl. Kovács Anna" value="${esc((saved && saved.team) || "")}" autocomplete="name"></div>
        <div class="field"><label for="jk">Neptun-kód</label><input type="text" id="jk" maxlength="6" placeholder="6 karakter" value="${esc((saved && saved.neptun) || "")}" autocomplete="off" style="text-transform:uppercase;font-family:var(--mono)"></div>
        <details class="mini"><summary>Munkamenet-kód</summary><div class="field"><input type="text" id="js" value="${esc(urlSession || (saved && saved.session) || C.SESSION)}" autocomplete="off"><small>Csak akkor írd át, ha az oktató mást mond.</small></div></details>
        <div class="btn-row"><button class="btn primary" id="jok">Belépés</button></div>
      </div></div>`);
      document.body.appendChild(m);
      const go = () => {
        const session = $("#js").value.trim().toUpperCase().replace(/\s+/g, "");
        const team = $("#jn").value.trim().replace(/\s+/g, " ");
        const neptun = $("#jk").value.trim().toUpperCase();
        if (team.length < 4 || !/\s/.test(team)) { toast("Add meg a teljes nevedet (vezeték- és keresztnév).", "err"); return; }
        if (!/^[A-Z0-9]{6}$/.test(neptun)) { toast("A Neptun-kód 6 betűből és/vagy számjegyből áll.", "err"); return; }
        if (!session) { toast("Hiányzik a munkamenet-kód.", "err"); return; }
        const j = { session, team, neptun };
        LT.api.store.set("lt_join", j);
        m.remove(); resolve(j);
      };
      $("#jok").onclick = go;
      $("#jk").addEventListener("keydown", e => { if (e.key === "Enter") go(); });
      setTimeout(() => $("#jn").focus(), 50);
    });
  }

  /* ---------------- Fejléc ---------------- */
  function header() {
    const chip = $(".team-chip");
    function render() {
      const st = LT.api.state, s = LT.api.status;
      const dot = s.mod === "online" ? "" : s.mod === "helyi" ? "helyi" : "off";
      const modTxt = s.mod === "online" ? "élő kapcsolat" : s.mod === "helyi" ? "helyi mód" : "nincs kapcsolat" + (s.varakozo ? ` (${s.varakozo} vár)` : "");
      if (TANAR) {
        chip.innerHTML = `<span class="chip"><span class="status-dot ${dot}"></span>${modTxt}</span><span class="chip">Munkamenet: <b>${esc(LT.api.session)}</b></span>`;
        return;
      }
      const me = st && st.leaderboard ? st.leaderboard.find(r => r.team === LT.api.team) : null;
      chip.innerHTML = `<span class="chip" title="${esc(s.hiba || "")}"><span class="status-dot ${dot}"></span>${modTxt}</span>
        <span class="chip">${esc(LT.api.team)}: <b>${me ? me.pont : 0} pont</b>${me ? ` · ${me.rang}. hely` : ""}</span>
        <button class="link-btn" id="csere">kilépés</button>`;
      $("#csere").onclick = () => { if (confirm("Kilépsz? A beküldött eredményeid megmaradnak; ugyanazzal a névvel és Neptun-kóddal visszaléphetsz.")) { LT.api.store.set("lt_join", { session: LT.api.session }); location.reload(); } };
    }
    LT.api.onState(render); LT.api.onStatus(render);
    let prev = null;
    LT.api.onState(st => {
      const me = st.leaderboard && st.leaderboard.find(r => r.team === LT.api.team);
      if (!me) return;
      if (prev !== null && me.pont > prev) toast(`+${me.pont - prev} pont! Összesen ${me.pont}.`, "pont");
      prev = me.pont;
    });
  }

  /* ---------------- Navigáció ---------------- */
  const VIEWS = ["start", "m1", "m2", "m3", "m4", "ranglista"];
  const inited = {};
  function route() {
    let v = (location.hash || "#start").slice(1);
    if (TANAR) v = "tanar";
    if (!TANAR && !VIEWS.includes(v)) v = "start";
    $$(".view").forEach(s => s.classList.toggle("active", s.id === "v-" + v));
    $$("nav.tabs a").forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + v));
    if (!inited[v]) {
      inited[v] = true;
      const root = $("#v-" + v);
      try {
        if (v === "start") start(root);
        else if (v === "ranglista") ranglista(root);
        else if (v === "tanar") tanar(root);
        else LT.missions[v](root);
      } catch (e) {
        console.error(e);
        root.innerHTML = `<div class="note bad">Hiba a nézet betöltésekor: ${esc(e.message)}</div>`;
      }
    }
    window.scrollTo(0, 0);
  }

  /* ---------------- Munkaasztal (Start) ---------------- */
  const FELADATOK = {
    1: { cim: "Hálózat", kerdes: "Hány raktár kell, és hol?", mod: "Lineáris programozás", lepesek: [["Tipp", "m1_tipp", "v"], ["Saját", "m1_kezi"], ["AI", "m1_ai"], ["Döntés", "m1_dontes"]] },
    2: { cim: "Járattervezés", kerdes: "Merre menjenek holnap az autók?", mod: "Járattervezés (VRP)", lepesek: [["Tipp", "m2_tipp", "v"], ["Saját", "m2_kezi"], ["AI", "m2_ai"], ["Döntés", "m2_dontes"]] },
    3: { cim: "Raktár", kerdes: "Hova kerüljenek a termékek a polcon?", mod: "ABC-elemzés, slotting", lepesek: [["Tipp", "m3_tipp", "v"], ["Saját", "m3_slot"], ["AI", "m3_ai"], ["Bejárás", "m3_ut", "v"]] },
    4: { cim: "KPI-pult", kerdes: "Hogyan látja a vezető egy lapon?", mod: "Teljesítménymérés", lepesek: [["KPI", "m4_kpi", "v"], ["Hatás", "m4_hatas"], ["Saját", "m4_ossz"], ["AI", "m4_ai"]] }
  };
  function start(root) {
    const P = window.LT_PONT;
    root.innerHTML = `
      <div class="desk-hero">
        <div class="eyebrow">3. konzultáció · Lumen Ipari Zrt.</div>
        <h2>Logisztikai tervezőasztal</h2>
        <p>Legutóbb a Lumen beszállítóit értékeltük: eldöntöttük, kivel mélyítjük az együttműködést, kit cserélünk, és hol vagyunk kiszolgáltatva. Most a másik irány jön: <b>hogyan jut el a kész lámpa a vevőhöz?</b> Négy feladat vár rád. Bármelyikkel kezdheted, de a 4. feladat (KPI-pult) az első háromból dolgozik.</p>
      </div>

      <div class="section-title">Feladatok</div>
      <div class="desk-grid" id="tiles"></div>

      <div class="section-title">Tudnivalók</div>
      <details class="box"><summary><span class="ikon">⚙</span><span>Hogyan dolgozunk?<small>Minden feladat ugyanarra a mintára épül</small></span></summary><div class="tartalom">
        <ol class="tight">
          <li><b>Tipp:</b> mielőtt számolnál, megtippeled az eredményt. A helyes tipp pontot ér.</li>
          <li><b>Saját megoldás:</b> kézzel megoldod a feladatot, és beküldöd. A legjobb megoldások versenyeznek.</li>
          <li><b>AI:</b> egy AI-asszisztens is megoldja ugyanazt. Az oldal újraszámolja és ellenőrzi az állításait, te pedig megítéled.</li>
          <li><b>Algoritmus:</b> a solver vagy a heurisztika megmutatja a viszonyítási pontot.</li>
          <li><b>Döntés:</b> megfogalmazod, mit javasolnál, és miért.</li>
        </ol>
        <div class="note info"><b>Fontos szabály:</b> a tippet és a saját megoldást <b>egyszer</b> küldheted be, utána nem módosítható. Az AI-lépés és az algoritmus csak ezután nyílik meg, hogy a saját gondolkodásod ne az AI vagy a gép eredményéhez igazodjon.</div>
      </div></details>
      <details class="box"><summary><span class="ikon">★</span><span>Pontozás<small>Tippek, verseny, AI-értékelés, szavazat</small></span></summary><div class="tartalom">
        <table><tbody>
          <tr><td>Helyes tipp</td><td class="n">+5</td></tr>
          <tr><td>Kvízkérdés helyes válasza</td><td class="n">+3</td></tr>
          <tr><td>Verseny (helyezés szerint)</td><td class="n">${P.RANG.join(" / ")} / ${P.RANG_TOVABBI}</td></tr>
          <tr><td>AI-kihívás saját értékeléssel</td><td class="n">+4</td></tr>
          <tr><td>Döntési javaslat (hálózat, járat)</td><td class="n">+2</td></tr>
          <tr><td>KPI-válogató (kiegyensúlyozott pult esetén több)</td><td class="n">+2 / +4</td></tr>
          <tr><td>Hatásmátrix: minden helyes cella</td><td class="n">+1</td></tr>
          <tr><td>Saját vezetői összefoglaló</td><td class="n">+4</td></tr>
          <tr><td>Kapott szavazat az összefoglalódra</td><td class="n">+${P.PEER}</td></tr>
        </tbody></table>
        <small>A verseny-pontok élőben változnak: ha valaki jobb megoldást küld be, lejjebb csúszol.</small>
      </div></details>
      <details class="box"><summary><span class="ikon">✦</span><span>AI-használat<small>Bármelyik AI-asszisztenst használhatod</small></span></summary><div class="tartalom">
        <p>Az AI-kihívásoknál a munkahelyi <b>Copilotot</b>, a <b>Geminit</b>, a <b>Claude-ot</b> vagy a <b>ChatGPT</b>-t használhatod, a gombok új lapon nyitják meg őket. Érdemes kipróbálni, hogy két AI ugyanarra a promptra mennyire eltérő választ ad.</p>
        <p>A Lumen és minden adata <b>kitalált</b>, ezért nyugodtan bemásolható. Valódi céges vagy személyes adatot ne másolj be. Az AI válasza <b>input</b>, nem döntés: a pontot a te ellenőrzésed és ítéleted éri.</p>
      </div></details>
      <details class="box"><summary><span class="ikon">✎</span><span>Promptírási útmutató<small>Mitől lesz jó egy prompt, és hogyan épülnek fel a beépített promptok?</small></span></summary><div class="tartalom">
        <p>A jó prompt nem varázsige, hanem <b>jó feladatkiírás</b>: ugyanazt kell tartalmaznia, amit egy új kollégának is elmondanál.</p>
        <div class="prompt-magy">
          <div class="pm-sor"><span class="pm-resz">1. Szerep</span><span>Kinek a szemével gondolkodjon? „Járattervező diszpécser vagy.” Ez behangolja a szakmai szókincset és a szempontokat.</span></div>
          <div class="pm-sor"><span class="pm-resz">2. Adat</span><span>Minden szám, amire szüksége van, táblázatosan. Amit nem adsz meg, azt az AI kitalálja (hallucinál).</span></div>
          <div class="pm-sor"><span class="pm-resz">3. Szabályok</span><span>Költségek, kapacitás, határidő, „minden vevőt pontosan egyszer”. A korlátok nélkül az AI a könnyebb, de érvénytelen megoldást adja.</span></div>
          <div class="pm-sor"><span class="pm-resz">4. Feladat és cél</span><span>Egy mondatban: mit kell eldönteni, és mit minimalizálunk. Egy prompt = egy feladat.</span></div>
          <div class="pm-sor"><span class="pm-resz">5. Válaszformátum</span><span>Pontosan előírt sorok (például „1. JÁRAT: D - S01 - S02 - D”). Így te is, és az oldal is ellenőrizni tudja.</span></div>
          <div class="pm-sor"><span class="pm-resz">6. Ellenőrizhető állítás</span><span>Kérj tőle becsült számot (km, költség, megtakarítás). Ezt veted össze a valós, újraszámolt értékkel.</span></div>
        </div>
        <h4 style="margin-top:14px">Rossz és jó példa</h4>
        <div class="grid g2e">
          <div class="note bad"><b>Gyenge:</b> „Tervezz útvonalat a budapesti vevőinkhez, hogy olcsó legyen.”<br><small>Nincs adat, nincs korlát, nincs formátum: az eredmény nem ellenőrizhető.</small></div>
          <div class="note ok"><b>Erős:</b> „Járattervező vagy. [vevőlista raklappal és határidővel] [távolságmátrix] Kapacitás 12 raklap, indulás 7:00… Minimalizáld a napi költséget. Válasz: soronként egy járat a megadott formában, majd ÖSSZES KM: …”</div>
        </div>
        <h4>Ha az AI hibázik</h4>
        <p>Ne új promptot írj, hanem jelezd a konkrét hibát: „A 3. járat 15 raklapot visz, a kapacitás 12. Javítsd úgy, hogy egyik járat se lépje túl.” Az ellenőrzés után ez a lépés is a munkád része.</p>
        <h4>A beépített promptok szerkezete</h4>
        <p>Mind a négy feladat promptja ugyanazt a vázat követi: <b>SZEREP → ADATOK → SZABÁLYOK → FELADAT → VÁLASZFORMÁTUM</b>. Az adatokat az oldal a te aktuális beállításaidból tölti ki. Minden AI-kártyán a „Miért így van megírva ez a prompt?” rész elmagyarázza az adott prompt elemeit.</p>
      </div></details>
      <details class="box"><summary><span class="ikon">i</span><span>Belépés és technikai tudnivalók<small>Kapcsolat, munkamenet, kilépés</small></span></summary><div class="tartalom">
        <ul class="tight">
          <li>Belépve: <b>${esc(LT.api.team || "")}</b>, munkamenet: <b>${esc(LT.api.session)}</b>.</li>
          <li>A fejlécben a zöld pötty jelzi az élő kapcsolatot. Ha megszakad, a beküldéseid sorba állnak, és automatikusan elmennek.</li>
          <li>A munkád ebben a böngészőben tárolódik. Gépcsere után ugyanazzal a névvel és Neptun-kóddal folytathatod; a beküldött eredményeid megmaradnak.</li>
        </ul>
      </div></details>`;

    function tiles() {
      const my = LT.ui.my;
      $("#tiles", root).innerHTML = [1, 2, 3, 4].map(k => {
        const f = FELADATOK[k];
        return `<a class="tile" style="--c:var(--m${k})" href="#m${k}">
          <div class="num">${k}. feladat · ${esc(f.mod)}</div>
          <h3>${esc(f.cim)}</h3><p>${esc(f.kerdes)}</p>
          <div class="allapot">${f.lepesek.map(([n, id, v]) => `<span class="chk ${(v ? my.get("vote_" + id) : LT.ui.kesz(id)) ? "on" : ""}">${(v ? my.get("vote_" + id) : LT.ui.kesz(id)) ? "✓ " : ""}${n}</span>`).join("")}</div>
        </a>`;
      }).join("");
    }
    tiles();
    document.addEventListener("lt-valtozas", tiles);
    LT.api.onState(tiles);
  }

  /* ---------------- Ranglista ---------------- */
  function lbRows(list, me) {
    if (!list.length) return `<small>Még nincs pontszám.</small>`;
    return list.map(r => {
      const per = { 1: 0, 2: 0, 3: 0, 4: 0 };
      Object.keys(r.reszlet || {}).forEach(a => { const k = LT.actKuldetes(a); if (per[k] !== undefined) per[k] += r.reszlet[a]; });
      return `<div class="lb-row ${r.team === me ? "me" : ""}"><span class="medal ${r.rang <= 3 ? "m" + r.rang : ""}">${r.rang}</span>
        <div><div class="t">${esc(r.team)}</div><div class="br">${[1, 2, 3, 4].map(k => `${LT.KULDETES[k].nev}: ${per[k]}`).join(" · ")}</div></div>
        <div class="p">${r.pont}</div></div>`;
    }).join("");
  }
  function ranglista(root) {
    root.innerHTML = `
      <div class="mission-head mh-0"><div class="eyebrow">Élő ranglista</div><h2>Ki áll nyerésre?</h2>
      <p>Néhány másodpercenként frissül. A verseny-feladatokban a pontok a helyezéstől függnek, ezért egy jobb beküldés mások pontjait is mozgatja.</p></div>
      <div class="grid g2">
        <div class="card"><h3>Összesítés</h3><div id="lb"></div></div>
        <div>
          <div class="card"><h3>Hálózat-verseny</h3><div id="b1"></div></div>
          <div class="card"><h3>Járat-verseny</h3><div id="b2"></div></div>
          <div class="card"><h3>Slotting-verseny</h3><div id="b3"></div></div>
        </div>
      </div>`;
    LT.api.onState(st => { $("#lb", root).innerHTML = lbRows(st.leaderboard || [], LT.api.team); });
    const f = LT.core.fmt;
    LT.ui.board($("#b1", root), "m1_kezi", { mertek: "M Ft/év", fmt: v => f.num(v, 1) });
    LT.ui.board($("#b2", root), "m2_kezi", { mertek: "Ft/nap", fmt: v => f.num(v) });
    LT.ui.board($("#b3", root), "m3_slot", { mertek: "m/nap", fmt: v => f.num(v) });
  }

  /* ---------------- Tanári kivetítő ---------------- */
  function tanar(root) {
    const link = location.origin + location.pathname + "?s=" + encodeURIComponent(LT.api.session);
    const voteIds = Object.keys(LT.ACT).filter(id => ["tipp", "kviz", "velemeny"].includes(LT.ACT[id].tipus));
    root.innerHTML = `
      <div class="grid g2">
        <div class="card big-lb"><h2>Ranglista</h2><div id="tlb"></div></div>
        <div>
          <div class="card join-box"><div class="muted">Belépés a hallgatói gépeken:</div>
            <div class="code">${esc(LT.api.session)}</div>
            <div style="word-break:break-all"><a href="${esc(link)}" target="_blank">${esc(link)}</a></div>
            <div class="btn-row no-print"><button class="btn small" id="cpl">Link másolása</button>
            <label class="btn small"><input type="checkbox" id="auto" style="margin:0"> automatikus lapozás</label></div>
          </div>
          <div class="card"><h3>Résztvevők (<span id="tdb">0</span>)</h3><div id="tteams" class="pill-row"></div></div>
        </div>
      </div>
      <div class="card"><div class="btn-row" id="tsel"></div><div id="tbody"></div></div>`;
    $("#cpl", root).onclick = () => LT.ui.copy(link).then(() => toast("Link másolva"));
    const panels = [
      { id: "verseny", label: "Versenyek" },
      ...voteIds.map(id => ({ id, label: LT.ACT[id].cim })),
      { id: "ai", label: "AI-értékelések" },
      { id: "dontes", label: "Döntési javaslatok" },
      { id: "ossz", label: "Vezetői összefoglalók" }
    ];
    let cur = "verseny";
    $("#tsel", root).innerHTML = panels.map(p => `<button class="btn small" data-p="${p.id}">${esc(p.label)}</button>`).join("");
    $$("#tsel button", root).forEach(b => b.onclick = () => { cur = b.dataset.p; render(LT.api.state); });
    let autoT = null;
    $("#auto", root).onchange = e => {
      clearInterval(autoT);
      if (e.target.checked) autoT = setInterval(() => { const i = panels.findIndex(p => p.id === cur); cur = panels[(i + 1) % panels.length].id; render(LT.api.state); }, 12000);
    };
    const f = LT.core.fmt;
    function results(st, act, mert, fv) {
      const list = (st.results && st.results[act]) || [];
      return `<h3>${esc(LT.ACT[act].cim)}</h3>` + (list.length ? `<table><thead><tr><th>#</th><th>Résztvevő</th><th class="n">${mert}</th><th>Megoldás</th><th class="n">Pont</th></tr></thead><tbody>${list.map(r =>
        `<tr><td><span class="medal ${r.rang <= 3 ? "m" + r.rang : ""}">${r.rang}</span></td><td>${esc(r.team)}</td><td class="n">${fv(r.value)}</td><td><small>${esc(r.text)}</small></td><td class="n">${r.pont}</td></tr>`).join("")}</tbody></table>` : "<small>Még nincs beküldés.</small>");
    }
    function szovegLista(st, ids, szinIdx) {
      return ids.map(a => {
        const list = (st.texts && st.texts[a]) || [];
        return `<h3>${esc(LT.ACT[a].cim)} (${list.length})</h3>` + (list.length ? list.map(t => {
          const [refl] = String(t.text).split(/\n\n--- Az AI/);
          return `<div class="route" style="--c:var(--m${a[1]})"><b>${esc(t.team)}</b> ${t.option ? `<span class="tag">${esc(t.option)}</span>` : ""}<div>${esc(refl)}</div></div>`;
        }).join("") : "<small>Még nincs beküldés.</small>");
      });
    }
    function render(st) {
      if (!st) return;
      $("#tlb", root).innerHTML = lbRows(st.leaderboard || [], null);
      $("#tdb", root).textContent = (st.teams || []).length;
      $("#tteams", root).innerHTML = (st.teams || []).map(t => `<span class="tag">${esc(t)}</span>`).join("");
      $$("#tsel button", root).forEach(b => b.classList.toggle("primary", b.dataset.p === cur));
      const body = $("#tbody", root);
      if (cur === "verseny") {
        body.innerHTML = `<div class="grid g3">
          <div>${results(st, "m1_kezi", "M Ft/év", v => f.num(v, 1))}</div>
          <div>${results(st, "m2_kezi", "Ft/nap", v => f.num(v))}</div>
          <div>${results(st, "m3_slot", "m/nap", v => f.num(v))}</div></div>`;
      } else if (cur === "m4_kpi") {
        const c = (st.votes && st.votes.m4_kpi) || {};
        const data = LT.data.KPI_LISTA.map(k => ({ label: k.nev, value: c[k.id] || 0 })).sort((a, b) => b.value - a.value);
        body.innerHTML = `<h2>KPI-válogató</h2><p>${LT.ACT.m4_kpi.kerdes}</p>` + LT.ui.hbars(data, { labelW: 260, title: "KPI-szavazatok" });
      } else if (LT.ACT[cur] && LT.ACT[cur].opciok) {
        const a = LT.ACT[cur], c = (st.votes && st.votes[cur]) || {};
        const max = Math.max(1, ...Object.values(c));
        body.innerHTML = `<h2>${esc(a.cim)}</h2><p style="font-size:1.15rem">${a.kerdes}</p><div class="bars">${a.opciok.map(o =>
          `<div class="bar ${a.helyes === o.id ? "right" : ""}"><span style="font-size:1.05rem">${o.label}</span><div class="track" style="height:28px"><div class="fill" style="width:${100 * (c[o.id] || 0) / max}%"></div></div><span class="cnt" style="font-size:1.1rem">${c[o.id] || 0}</span></div>`).join("")}</div>
          ${a.tipus === "kviz" ? `<details><summary>Helyes válasz és magyarázat</summary><p>${a.magyarazat}</p></details>` : `<small>A helyes választ a hallgatók a számítás után, a saját gépükön látják.</small>`}`;
      } else if (cur === "ai") {
        body.innerHTML = `<div class="grid g2e">${szovegLista(st, ["m1_ai", "m2_ai", "m3_ai", "m4_ai"]).map(p => `<div class="routes">${p}</div>`).join("")}</div>`;
      } else if (cur === "dontes") {
        body.innerHTML = `<div class="grid g2e">${szovegLista(st, ["m1_dontes", "m2_dontes"]).map(p => `<div class="routes">${p}</div>`).join("")}</div>`;
      } else if (cur === "ossz") {
        const list = (st.texts && st.texts.m4_ossz) || [], pv = (st.peer && st.peer.m4_peer) || {};
        body.innerHTML = `<h2>Vezetői összefoglalók</h2>` + (list.length ? `<div class="grid g2e">${list.slice().sort((a, b) => (pv[b.team] || 0) - (pv[a.team] || 0)).map(t =>
          `<div class="card flat"><div class="step"><h3>${esc(t.team)}</h3><span class="tag ok">${pv[t.team] || 0} szavazat</span></div><div class="fact-text">${esc(t.text)}</div></div>`).join("")}</div>` : "<small>Még nincs beküldött összefoglaló.</small>");
      }
    }
    LT.api.onState(render);
  }

  /* ---------------- Lábléc ---------------- */
  function footer() {
    const f = el(`<footer class="lab">
      <div><b>Oktató:</b> ${esc(C.OKTATO)} · ${esc(C.KURZUS)}<br>${esc(C.INTEZMENY)}</div>
      <div class="ai-info"><b>Tájékoztatás AI-használatról:</b> ez az oldal AI-eszközök (nagy nyelvi modellek) segítségével készült, oktatói felügyelet, ellenőrzés és véglegesítés mellett. A Lumen Ipari Zrt. és minden adata kitalált, oktatási célú.</div>
    </footer>`);
    document.body.insertBefore(f, $(".toasts") || null);
  }

  /* ---------------- Indulás ---------------- */
  async function boot() {
    if (TANAR) document.body.classList.add("tanar");
    $(".logo small").textContent = `${C.KURZUS} · Oktató: ${C.OKTATO}`;
    if (C.LOGO_URL) {
      const img = el(`<img class="logo-img" alt="MATE" src="${esc(C.LOGO_URL)}">`);
      img.onload = () => { const m = $(".logo-mark"); if (m) m.remove(); };
      img.onerror = () => img.remove();
      $(".logo").prepend(img);
    }
    footer();
    const j = await join();
    LT.api.start(j.session, j.team, TANAR, j.neptun);
    header();
    if (TANAR) $("nav.tabs").classList.add("hidden");
    window.addEventListener("hashchange", route);
    route();
  }
  LT.missions = LT.missions || {};
  document.addEventListener("DOMContentLoaded", boot);
})();
