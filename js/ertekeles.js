/* Kurzusértékelés: névtelen, pont nélküli, önkéntes visszajelzés.
   A válaszok egyetlen eseményként, külön munkamenetbe (<munkamenet>_ERT) kerülnek,
   véletlen azonosítóval: se név, se Neptun-kód nem kapcsolódik hozzájuk. */
(function () {
  const LT = (window.LT = window.LT || {});
  LT.missions = LT.missions || {};
  const NV = "nv"; // nem tudom / nem kívánok válaszolni

  const TEMAK = [
    { id: "ker", nev: "Kereslet-előrejelzés és készlet", sub: "1. konzultáció, notebook" },
    { id: "besz", nev: "Beszállítóértékelés", sub: "2. konzultáció, notebook" },
    { id: "hal", nev: "Hálózattervezés", sub: "3. konzultáció, HTML-felület" },
    { id: "jar", nev: "Járattervezés", sub: "3. konzultáció, HTML-felület" },
    { id: "rak", nev: "Raktár, slotting", sub: "3. konzultáció, HTML-felület" },
    { id: "kpi", nev: "KPI-pult", sub: "3. konzultáció, HTML-felület" },
    { id: "ai", nev: "AI-eszközök kritikus használata", sub: "mindhárom alkalom" }
  ];
  const SZEMPONTOK = [
    { id: "erd", nev: "Érdekes volt" },
    { id: "has", nev: "Hasznos a munkámban" },
    { id: "uj", nev: "Új tudást adott" }
  ];
  const OSSZEGZO = [
    { id: "o_erd", kerdes: "Összességében mennyire volt érdekes a kurzus?" },
    { id: "o_has", kerdes: "Összességében mennyire hasznos a munkám szempontjából?" },
    { id: "o_uj", kerdes: "Mennyi új tudást adott ahhoz képest, amit korábban tudtam?" },
    { id: "o_ajanl", kerdes: "Mennyire ajánlanám a kurzust egy kollégámnak?" }
  ];
  const ZART = [
    { id: "z_tema", kerdes: "Melyik téma volt a legértékesebb számodra?", opciok: TEMAK.map(t => ({ id: t.id, label: t.nev })) },
    { id: "z_forma", kerdes: "Melyik formában tanultál jobban?", opciok: [{ id: "nb", label: "Notebook (Google Colab)" }, { id: "html", label: "HTML-felület (tervezőasztal)" }, { id: "egy", label: "Nagyjából egyformán" }] }
  ];
  const SZOVEG = [
    { id: "s_tetszett", kerdes: "Mi tetszett leginkább?" },
    { id: "s_haszn", kerdes: "Mit fogsz a legnagyobb valószínűséggel használni a munkádban a tanultakból?" },
    { id: "s_valt", kerdes: "Mi hiányzott, vagy min változtatnál?" }
  ];
  const MAX_SZOVEG = 800;
  LT.ERT = { TEMAK, SZEMPONTOK, OSSZEGZO, ZART, SZOVEG, NV };
  LT.ertSession = () => LT.api.session + "_ERT";

  /* ---------------- Hallgatói űrlap ---------------- */
  LT.missions.ertekeles = function (root) {
    const { esc, $, $$, toast } = LT.ui;
    const kulcs = () => "lt_ert_kesz_" + LT.ertSession();
    const piszkozat = () => "lt_ert_piszkozat_" + LT.ertSession();
    const kesz = () => !!LT.api.store.get(kulcs(), false);
    let v = LT.api.store.get(piszkozat(), {});
    const ment = () => LT.api.store.set(piszkozat(), v);

    const skala = (nev, ertek) => `<div class="skala" role="radiogroup" aria-label="${esc(nev)}">${[1, 2, 3, 4, 5].map(n =>
      `<button type="button" class="sk ${ertek === String(n) ? "on" : ""}" data-n="${esc(nev)}" data-v="${n}" aria-pressed="${ertek === String(n)}">${n}</button>`).join("")}
      <button type="button" class="sk nv ${ertek === NV ? "on" : ""}" data-n="${esc(nev)}" data-v="${NV}" aria-pressed="${ertek === NV}">Nem tudom / nem válaszolok</button></div>`;
    const cellaSel = (nev, ertek) => `<select data-sel="${esc(nev)}" aria-label="${esc(nev)}">
      <option value="">–</option>${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${ertek === String(n) ? "selected" : ""}>${n}</option>`).join("")}
      <option value="${NV}" ${ertek === NV ? "selected" : ""}>nem tudom</option></select>`;

    function render() {
      if (kesz()) {
        root.innerHTML = `<div class="mission-head mh-0"><div class="eyebrow">Kurzusértékelés</div><h2>Köszönöm a visszajelzésedet!</h2>
          <p>A válaszaidat névtelenül rögzítettük. A visszajelzés segít abban, hogy a következő évfolyam kurzusa jobb legyen.</p></div>
          <div class="card"><p style="margin:0">Az értékelést ebből a böngészőből már beküldted. Ha kérdésed vagy további észrevételed van, keresd az oktatót.</p></div>`;
        return;
      }
      root.innerHTML = `
        <div class="mission-head mh-0"><div class="eyebrow">Kurzusértékelés · AGELG157L</div>
          <h2>Milyen volt a kurzus?</h2>
          <p>Néhány perc az egész. A visszajelzés <b>névtelen</b>, <b>nem jár érte pont</b>, és <b>önkéntes</b>: bármelyik kérdést kihagyhatod, vagy jelölheted, hogy nem tudsz vagy nem kívánsz válaszolni.</p></div>

        <div class="note info"><b>Adatvédelem:</b> a válaszaid egy véletlen azonosítóval, a többi beküldésedtől elkülönítve kerülnek rögzítésre. Sem a neved, sem a Neptun-kódod nem kapcsolódik hozzájuk, és a ranglistán sem jelennek meg.</div>

        <div class="card">
          <h3>1. Témánként: mennyire volt érdekes, hasznos, és mennyi új tudást adott?</h3>
          <p class="muted">1 = egyáltalán nem, 5 = nagyon. A „–” azt jelenti, hogy kihagyod; a „nem tudom” azt, hogy nem tudsz vagy nem kívánsz válaszolni.</p>
          <div class="tbl-wrap"><table class="ert-matrix"><thead><tr><th>Téma</th>${SZEMPONTOK.map(s => `<th class="n">${esc(s.nev)}</th>`).join("")}</tr></thead><tbody>
            ${TEMAK.map(t => `<tr><td><b>${esc(t.nev)}</b><br><small>${esc(t.sub)}</small></td>${SZEMPONTOK.map(s => `<td class="n">${cellaSel("m_" + t.id + "_" + s.id, v["m_" + t.id + "_" + s.id])}</td>`).join("")}</tr>`).join("")}
          </tbody></table></div>
        </div>

        <div class="card">
          <h3>2. Összegzés</h3>
          <p class="muted">1 = egyáltalán nem, 5 = nagyon.</p>
          ${OSSZEGZO.map(k => `<div class="ert-k"><p class="kerdes">${esc(k.kerdes)}</p>${skala(k.id, v[k.id])}</div>`).join("")}
        </div>

        <div class="card">
          <h3>3. Választás</h3>
          ${ZART.map(k => `<div class="ert-k"><p class="kerdes">${esc(k.kerdes)}</p><div class="skala">${k.opciok.concat([{ id: NV, label: "Nem tudom / nem válaszolok" }]).map(o =>
            `<button type="button" class="sk wide ${o.id === NV ? "nv" : ""} ${v[k.id] === o.id ? "on" : ""}" data-n="${k.id}" data-v="${o.id}" aria-pressed="${v[k.id] === o.id}">${esc(o.label)}</button>`).join("")}</div></div>`).join("")}
        </div>

        <div class="card">
          <h3>4. Saját szavaiddal (nem kötelező)</h3>
          ${SZOVEG.map(k => `<div class="field"><label for="ert-${k.id}">${esc(k.kerdes)}</label>
            <textarea id="ert-${k.id}" data-t="${k.id}" maxlength="${MAX_SZOVEG}" style="min-height:90px">${esc(v[k.id] || "")}</textarea></div>`).join("")}
        </div>

        <div class="card">
          <div class="btn-row"><button class="btn accent" id="ert-send">Értékelés beküldése</button><span class="muted" id="ert-szam"></span></div>
          <small>Egyszer küldhető be. A kitöltetlen kérdések kihagyottnak számítanak.</small>
        </div>`;
      $$("[data-sel]", root).forEach(s => s.onchange = () => { v[s.dataset.sel] = s.value; if (!s.value) delete v[s.dataset.sel]; ment(); szam(); });
      $$(".sk", root).forEach(b => b.onclick = () => {
        const n = b.dataset.n;
        v[n] = v[n] === b.dataset.v ? undefined : b.dataset.v;
        if (v[n] === undefined) delete v[n];
        ment();
        $$(`.sk[data-n="${n}"]`, root).forEach(x => { const on = v[n] === x.dataset.v; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on); });
        szam();
      });
      $$("[data-t]", root).forEach(t => t.oninput = () => { v[t.dataset.t] = t.value.slice(0, MAX_SZOVEG); if (!t.value.trim()) delete v[t.dataset.t]; ment(); szam(); });
      $("#ert-send", root).onclick = bekuld;
      szam();
    }
    function szam() {
      const n = Object.keys(v).filter(k => v[k] !== undefined && v[k] !== "").length;
      const el = $("#ert-szam", root);
      if (el) el.textContent = `${n} kérdésre válaszoltál.`;
    }
    async function bekuld() {
      const valasz = {};
      Object.keys(v).forEach(k => { if (v[k] !== undefined && String(v[k]).trim() !== "") valasz[k] = String(v[k]).trim().slice(0, MAX_SZOVEG); });
      if (!Object.keys(valasz).length) { toast("Még egyetlen kérdésre sem válaszoltál.", "err"); return; }
      if (!confirm("Beküldöd az értékelést? Névtelen, és utána nem módosítható.")) return;
      const r = await LT.api.submitAnon(LT.ertSession(), { activity: "ertekeles", kind: "text", points: 0, text: JSON.stringify(valasz) });
      if (r.ok || r.sorban) {
        LT.api.store.set(kulcs(), true);
        LT.api.store.set(piszkozat(), {});
        toast(r.ok ? "Köszönöm a visszajelzést!" : "Nincs kapcsolat: az értékelés sorban áll, automatikusan elküldjük.", r.ok ? "" : "err");
        render();
        window.scrollTo(0, 0);
      }
    }
    render();
  };

  /* ---------------- Tanári összesítő ---------------- */
  LT.ertekelesPanel = function (body) {
    const { esc } = LT.ui;
    const f = LT.core.fmt;
    if (body.dataset.ert !== "1") body.innerHTML = `<small>Betöltés…</small>`;
    const most = Date.now();
    if (body.dataset.ert === "1" && most - (LT._ertT || 0) < 10000) return;
    LT._ertT = most;
    LT.api.sessionState(LT.ertSession()).then(st => {
      body.dataset.ert = "1";
      const valaszok = ((st && st.texts && st.texts.ertekeles) || []).map(t => { try { return JSON.parse(t.text); } catch (e) { return null; } }).filter(Boolean);
      const n = valaszok.length;
      const stat = id => {
        const vals = valaszok.map(v => v[id]).filter(x => x && x !== NV).map(Number).filter(x => x >= 1 && x <= 5);
        const nv = valaszok.filter(v => v[id] === NV).length;
        return { atlag: vals.length ? vals.reduce((s, x) => s + x, 0) / vals.length : null, db: vals.length, nv };
      };
      const szin = a => a === null ? "var(--panel-2)" : `color-mix(in srgb, var(--mate-zold) ${Math.round(12 + (a - 1) / 4 * 70)}%, var(--panel))`;
      const cella = s => `<td class="n" style="background:${szin(s.atlag)};${s.atlag !== null && s.atlag >= 3.6 ? "color:#fff;" : ""}"><b>${s.atlag === null ? "–" : f.num(s.atlag, 1)}</b><br><small style="color:inherit;opacity:.8">${s.db} válasz${s.nv ? `, ${s.nv} nem tudja` : ""}</small></td>`;
      if (!n) { body.innerHTML = `<h2>Kurzusértékelés</h2><small>Még nincs beküldött értékelés.</small>`; return; }
      const eloszlas = (k) => {
        const c = {}; valaszok.forEach(v => { if (v[k.id]) c[v[k.id]] = (c[v[k.id]] || 0) + 1; });
        const opts = k.opciok.concat([{ id: NV, label: "Nem tudja / nem válaszol" }]);
        return LT.ui.hbars(opts.map(o => ({ label: o.label, value: c[o.id] || 0 })), { labelW: 250, title: k.kerdes });
      };
      body.innerHTML = `<h2>Kurzusértékelés <small class="muted">(${n} névtelen válasz)</small></h2>
        <h3>Témánként (átlag 1–5)</h3>
        <div class="tbl-wrap"><table class="ert-matrix"><thead><tr><th>Téma</th>${SZEMPONTOK.map(s => `<th class="n">${esc(s.nev)}</th>`).join("")}</tr></thead><tbody>
          ${TEMAK.map(t => `<tr><td><b>${esc(t.nev)}</b><br><small>${esc(t.sub)}</small></td>${SZEMPONTOK.map(s => cella(stat("m_" + t.id + "_" + s.id))).join("")}</tr>`).join("")}
        </tbody></table></div>
        <h3 style="margin-top:16px">Összegzés</h3>
        <table><tbody>${OSSZEGZO.map(k => { const s = stat(k.id); return `<tr><td>${esc(k.kerdes)}</td>${cella(s)}</tr>`; }).join("")}</tbody></table>
        <div class="grid g2e" style="margin-top:16px">${ZART.map(k => `<div><h3>${esc(k.kerdes)}</h3>${eloszlas(k)}</div>`).join("")}</div>
        ${SZOVEG.map(k => { const l = valaszok.map(v => v[k.id]).filter(Boolean); return `<h3 style="margin-top:16px">${esc(k.kerdes)} (${l.length})</h3>${l.length ? `<div class="routes">${l.map(t => `<div class="route" style="--c:var(--mate-vzold);white-space:pre-wrap">${esc(t)}</div>`).join("")}</div>` : "<small>Nincs szöveges válasz.</small>"}`; }).join("")}`;
    }).catch(e => { body.innerHTML = `<div class="note bad">Nem sikerült betölteni az értékeléseket: ${esc(e.message || e)}</div>`; });
  };
})();
