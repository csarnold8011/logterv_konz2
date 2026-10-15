/* Közös felületi elemek: szavazás, verseny-ranglista, AI-kártya, egyszeri beküldés,
   kapu (zárolás), apró segédek */
(function () {
  const LT = (window.LT = window.LT || {});
  const C = window.LT_CONFIG;
  const fmt = () => LT.core.fmt;

  function esc(s) {
    return String(s === null || s === undefined ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }
  function el(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }

  function toast(msg, type) {
    let box = $(".toasts");
    if (!box) { box = el('<div class="toasts" aria-live="polite"></div>'); document.body.appendChild(box); }
    const t = el(`<div class="toast ${type || ""}">${esc(msg)}</div>`);
    box.appendChild(t);
    setTimeout(() => t.remove(), 3800);
  }

  // A hallgató saját, munkamenethez kötött tárolója (Neptun-kód szerint)
  const my = {
    key: k => "lt_my_" + LT.api.session + "_" + (LT.api.neptun || LT.api.team) + "_" + k,
    get(k, d) { return LT.api.store.get(my.key(k), d); },
    set(k, v) { LT.api.store.set(my.key(k), v); valtozas(); }
  };
  function valtozas() { setTimeout(() => document.dispatchEvent(new Event("lt-valtozas")), 0); }

  // Beküldött-e már valamit az adott feladatra (helyi jelző VAGY a szerver szerint)
  function kesz(id) {
    if (my.get("kesz_" + id)) return true;
    const st = LT.api.state;
    if (st && st.results && st.results[id] && st.results[id].some(r => r.team === LT.api.team)) return true;
    if (st && st.texts && st.texts[id] && st.texts[id].some(r => r.team === LT.api.team)) return true;
    return false;
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      const ta = el("<textarea></textarea>"); ta.value = text; document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand("copy"); } catch (x) { ok = false; }
      ta.remove(); return ok;
    }
  }

  async function submit(ev, okMsg) {
    const r = await LT.api.submit(ev);
    if (r.ok) toast(okMsg || "Beküldve");
    else if (r.sorban) toast("Nincs kapcsolat: a beküldés sorban áll, automatikusan elküldjük.", "err");
    valtozas();
    return r;
  }

  /* ---------------- Kapu: egy blokk csak a feltételek teljesülése után nyílik meg ----------------
     feltetelek: [{ kesz: () => bool, szoveg: "Előbb küldd be a tippedet." }]                       */
  function kapu(blokk, feltetelek, onNyit) {
    const uz = el(`<div class="zar-uzenet" role="status"></div>`);
    blokk.prepend(uz);
    let nyitva = null;
    function frissit() {
      const hiany = feltetelek.filter(f => !f.kesz());
      const most = hiany.length === 0;
      blokk.classList.toggle("zarolt", !most);
      uz.innerHTML = most ? "" : `<span class="lakat" aria-hidden="true">🔒</span><div><b>Ez a lépés még zárva van.</b><br>${hiany.map(f => esc(f.szoveg)).join("<br>")}</div>`;
      uz.classList.toggle("hidden", most);
      blokk.querySelectorAll("button, textarea, input, select, a.ai-link").forEach(x => {
        if (x.closest(".zar-uzenet")) return;
        if (!most) { if (!x.dataset.zarKi) { x.dataset.zarKi = x.disabled ? "1" : "0"; } x.disabled = true; x.setAttribute("tabindex", "-1"); }
        else if (x.dataset.zarKi !== undefined) { x.disabled = x.dataset.zarKi === "1"; delete x.dataset.zarKi; x.removeAttribute("tabindex"); }
      });
      if (most && nyitva === false && onNyit) onNyit();
      nyitva = most;
    }
    document.addEventListener("lt-valtozas", frissit);
    LT.api.onState(frissit);
    frissit();
    return frissit;
  }

  /* ---------------- Szavazás / tipp / kvíz ----------------
     Minden mód egyszer küldhető be, utána nem módosítható.
     mod: "tipp"      – a helyes válasz később derül ki (reveal), pont csak akkor
          "kviz"      – azonnali visszajelzés és pont
          "velemeny"  – nincs helyes válasz, csak összesítés                      */
  function vote(container, cfg) {
    const id = cfg.id;
    const multi = !!cfg.pontosan;
    const root = el(`<div class="vote" data-vote="${esc(id)}"></div>`);
    container.appendChild(root);
    let sel = new Set((my.get("vote_" + id) || "").split("|").filter(Boolean));
    let revealed = my.get("rev_" + id) || null;

    function render() {
      const st = LT.api.state;
      const counts = (st && st.votes && st.votes[id]) || {};
      const total = Math.round(Object.values(counts).reduce((s, v) => s + v, 0) / (cfg.pontosan || 1));
      const voted = !!my.get("vote_" + id);
      const helyes = cfg.mod === "kviz" ? cfg.helyes : revealed ? revealed.helyes : null;
      root.innerHTML = `
        <p class="kerdes">${cfg.kerdes}</p>
        ${multi && !voted ? `<small>Válassz pontosan ${cfg.pontosan} elemet. (${sel.size}/${cfg.pontosan})</small>` : ""}
        <div class="vote-opts">${cfg.opciok.map(o => {
          let c = sel.has(o.id) ? "sel" : "";
          if (helyes !== null && helyes !== undefined && voted) {
            if (o.id === helyes) c += " right"; else if (sel.has(o.id)) c += " wrong";
          }
          return `<button class="vote-opt ${c}" data-o="${esc(o.id)}" ${voted ? "disabled" : ""}>${o.label}${o.sub ? `<br><small>${o.sub}</small>` : ""}${o.cimke ? `<span class="opt-cimke">${esc(o.cimke)}</span>` : ""}</button>`;
        }).join("")}</div>
        ${!voted ? `<div class="btn-row"><button class="btn primary" data-send ${multi ? (sel.size !== cfg.pontosan ? "disabled" : "") : (sel.size !== 1 ? "disabled" : "")}>${cfg.mod === "kviz" ? "Válasz véglegesítése" : cfg.mod === "tipp" ? "Tipp véglegesítése" : "Választás véglegesítése"}</button><small>A beküldés után nem módosítható.</small></div>` : ""}
        <div class="vote-res"></div>`;
      const res = $(".vote-res", root);
      if (voted) {
        let h = "";
        if (cfg.mod === "tipp" && !revealed) h += `<div class="note info"><b>Tipp rögzítve, véglegesen.</b> A helyes választ a következő lépésben, a számítás után ismered meg.</div>`;
        if (helyes !== null && helyes !== undefined && cfg.mod !== "velemeny") {
          const jo = sel.has(helyes);
          h += `<div class="note ${jo ? "ok" : "bad"}"><b>${jo ? "Talált! +" + (cfg.pont || 0) + " pont." : "Nem talált."}</b> ${cfg.magyarazat ? (typeof cfg.magyarazat === "function" ? cfg.magyarazat() : cfg.magyarazat) : ""}</div>`;
        }
        if (cfg.utoKommentar) h += cfg.utoKommentar([...sel]);
        const max = Math.max(1, ...Object.values(counts));
        h += `<details class="mini" ${cfg.mod === "velemeny" ? "open" : ""}><summary>Hogyan szavazott a csoport? (${total} fő)</summary><div class="bars">${cfg.opciok.map(o => {
          const n = counts[o.id] || 0;
          const cls = (sel.has(o.id) ? "mine " : "") + (helyes === o.id ? "right" : "");
          return `<div class="bar ${cls}"><span>${o.label.replace(/<[^>]+>/g, "")}</span><div class="track"><div class="fill" style="width:${100 * n / max}%"></div></div><span class="cnt">${n}</span></div>`;
        }).join("")}</div><small>Az arany sáv a te választásod.</small></details>`;
        res.innerHTML = h;
      }
      if (!voted) {
        $$(".vote-opt", root).forEach(b => b.onclick = () => {
          const o = b.dataset.o;
          if (multi) { if (sel.has(o)) sel.delete(o); else if (sel.size < cfg.pontosan) sel.add(o); }
          else sel = new Set([o]);
          render();
        });
        const sb = $("[data-send]", root);
        if (sb) sb.onclick = send;
      }
    }

    async function send() {
      if (my.get("vote_" + id)) return;
      const option = [...sel].join("|");
      const pts = cfg.mod === "kviz" ? (sel.has(cfg.helyes) ? cfg.pont || 0 : 0) : cfg.mod === "velemeny" ? (cfg.pontFv ? cfg.pontFv([...sel]) : cfg.pont || 0) : 0;
      my.set("vote_" + id, option);
      my.set("kesz_" + id, true);
      render();
      await submit({ activity: id, kind: "vote", option, points: pts }, cfg.mod === "kviz" ? (pts ? `Helyes válasz: +${pts} pont` : "Válasz rögzítve") : cfg.mod === "tipp" ? "Tipp rögzítve" : "Választás rögzítve");
    }

    LT.api.onState(render);
    render();
    return {
      async reveal(helyes) {
        if (revealed) { render(); return revealed; }
        const voted = my.get("vote_" + id);
        revealed = { helyes, ido: Date.now() };
        my.set("rev_" + id, revealed);
        render();
        if (voted) {
          const pts = voted.split("|").includes(helyes) ? cfg.pont || 0 : 0;
          await submit({ activity: id + "_ert", kind: "bonus", points: pts }, pts ? `A tipped bejött: +${pts} pont` : "A tipp nem jött be, de most már látod, miért.");
        }
        return revealed;
      },
      get voted() { return !!my.get("vote_" + id); }
    };
  }
  const tippKesz = id => () => !!my.get("vote_" + id);

  /* ---------------- Verseny-ranglista egy feladatra ---------------- */
  function board(container, activity, opts) {
    opts = opts || {};
    const root = el(`<div class="board"></div>`);
    container.appendChild(root);
    function render(st) {
      const list = (st && st.results && st.results[activity]) || [];
      if (!list.length) { root.innerHTML = `<small>Még nincs beküldött eredmény.</small>`; return; }
      const me = LT.api.team;
      const top = list.slice(0, opts.max || 8);
      const mine = list.find(r => r.team === me);
      if (mine && !top.includes(mine)) top.push(mine);
      root.innerHTML = `<table><thead><tr><th>#</th><th>Résztvevő</th><th class="n">${esc(opts.mertek || "Eredmény")}</th><th class="n">Pont</th></tr></thead><tbody>${top.map(r =>
        `<tr class="${r.team === me ? "me" : ""}"><td><span class="medal ${r.rang <= 3 ? "m" + r.rang : ""}">${r.rang}</span></td><td>${esc(r.team)}${opts.reszlet && r.text ? `<br><small>${esc(r.text)}</small>` : ""}</td><td class="n">${opts.fmt ? opts.fmt(r.value) : r.value}</td><td class="n">${r.pont}</td></tr>`
      ).join("")}</tbody></table><small>${list.length} fő küldött be eredményt. A pontok a helyezéstől függnek, és élőben változnak.</small>`;
    }
    LT.api.onState(render);
    return root;
  }

  /* ---------------- Egyszeri szöveges beküldés (döntés, összefoglaló) ---------------- */
  function szoveg(container, cfg) {
    const id = cfg.id;
    const root = el(`<div class="szoveg-bekuldes"></div>`);
    container.appendChild(root);
    function render() {
      const done = kesz(id);
      const txt = my.get("szoveg_" + id, "");
      root.innerHTML = done
        ? `<div class="fact-text">${esc(txt || "(beküldve)")}</div><div class="btn-row"><span class="done-mark">✓ Beküldve, véglegesen.</span></div>`
        : `<textarea data-t placeholder="${esc(cfg.placeholder || "")}" style="min-height:${cfg.magassag || 110}px">${esc(txt)}</textarea>
           <div class="btn-row"><button class="btn accent" data-s>${esc(cfg.gomb || "Beküldés")}</button><small>${cfg.pont ? "+" + cfg.pont + " pont. " : ""}A beküldés után nem módosítható.</small><span class="muted" data-n></span></div>`;
      if (done) return;
      const ta = $("[data-t]", root);
      const n = () => { const w = (ta.value.trim().match(/\S+/g) || []).length; $("[data-n]", root).textContent = w + " szó"; };
      ta.addEventListener("input", () => { LT.api.store.set(my.key("szoveg_" + id), ta.value); n(); });
      n();
      $("[data-s]", root).onclick = async () => {
        const t = ta.value.trim(), w = (t.match(/\S+/g) || []).length;
        if (w < (cfg.minSzo || 15)) { toast(`Legalább ${cfg.minSzo || 15} szót írj.`, "err"); return; }
        if (cfg.maxSzo && w > cfg.maxSzo) { toast(`Legfeljebb kb. ${cfg.maxSzo} szó legyen.`, "err"); return; }
        if (!confirm("Biztosan beküldöd? Utána nem módosítható.")) return;
        const extra = cfg.extra ? cfg.extra(t) : {};
        my.set("szoveg_" + id, t);
        my.set("kesz_" + id, true);
        render();
        await submit(Object.assign({ activity: id, kind: "text", text: t, points: cfg.pont || 0 }, extra), cfg.okUzenet || "Beküldve");
        if (cfg.onSubmit) cfg.onSubmit(t);
      };
    }
    render();
    document.addEventListener("lt-valtozas", () => { if (kesz(id) && root.querySelector("[data-t]")) render(); });
    return { get kesz() { return kesz(id); } };
  }

  /* ---------------- AI-kártya ----------------
     A hallgató a saját AI-szolgáltatásába másolja a promptot, a választ visszamásolja,
     az oldal újraszámolja az állításokat. Csak a tipp és a saját megoldás után nyílik meg. */
  function ai(container, cfg) {
    const id = cfg.id;
    const root = el(`<div class="card ai-card"></div>`);
    container.appendChild(root);
    root.innerHTML = `
      <div class="step"><span class="step-badge ai">AI-kihívás</span><h3>${cfg.cim}</h3><span class="pts">+${cfg.pont || 4} pont az értékelésért</span></div>
      ${cfg.bevezeto ? `<p>${cfg.bevezeto}</p>` : ""}
      <div class="lepes-sor">
        <div class="lepes"><span class="sz">1</span><div><b>Másold ki a promptot.</b> A gomb a saját adataiddal állítja össze.</div></div>
        <div class="lepes"><span class="sz">2</span><div><b>Illeszd be</b> az általad választott AI-ba, majd a választ másold vissza ide.</div></div>
        <div class="lepes"><span class="sz">3</span><div><b>Ellenőrizd:</b> az oldal újraszámolja, amit az AI állít.</div></div>
        <div class="lepes"><span class="sz">4</span><div><b>Ítélj:</b> mit talált el, mit rontott el, elfogadnád-e?</div></div>
      </div>
      <div class="btn-row">
        <button class="btn ai" data-copy>Prompt másolása</button>
        ${(C.AI_LINKS || []).map(l => `<a class="btn small ai-link" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.nev)} ↗</a>`).join("")}
      </div>
      <details class="mini"><summary>A prompt szövege</summary><div class="prompt-box" data-prompt></div></details>
      ${cfg.magyarazat ? `<details class="mini"><summary>Miért így van megírva ez a prompt?</summary><div class="prompt-magy">${cfg.magyarazat.map(m => `<div class="pm-sor"><span class="pm-resz">${esc(m[0])}</span><span>${m[1]}</span></div>`).join("")}</div></details>` : ""}
      <div class="field" style="margin-top:12px"><label>Az AI válasza</label>
        <textarea data-ans placeholder="Ide illeszd be az AI teljes válaszát…"></textarea></div>
      <div class="btn-row"><button class="btn primary" data-check>Ellenőrzés</button></div>
      <div data-eval></div>
      <div data-refl class="hidden">
        <div class="field"><label>Szakmai ítéleted <span class="hint">(legalább 2 mondat: mit talált el, mit rontott el, elfogadnád-e?)</span></label>
          <div class="btn-row" style="margin:0 0 6px"><label class="hint" for="ai-src-${esc(id)}">Melyik AI-t használtad?</label>
            <select id="ai-src-${esc(id)}" data-src style="width:auto">${(C.AI_LINKS || []).map(l => `<option>${esc(l.nev)}</option>`).join("")}<option>Egyéb</option></select></div>
          <textarea data-reflt style="min-height:90px"></textarea></div>
        <div class="btn-row"><button class="btn accent" data-send>Értékelés beküldése</button><small>A beküldés után nem módosítható.</small></div>
      </div>
      <div data-done></div>`;
    const ans = $("[data-ans]", root), evalBox = $("[data-eval]", root);
    ans.value = my.get("ai_" + id, "");
    let last = null;
    $("[data-copy]", root).onclick = async () => {
      const p = cfg.prompt();
      $("[data-prompt]", root).textContent = p;
      const ok = await copy(p);
      toast(ok ? "Prompt a vágólapon. Illeszd be az AI-ba!" : "Nem sikerült a másolás: nyisd le „A prompt szövege” részt, és másold kézzel.", ok ? "" : "err");
    };
    $("details", root).addEventListener("toggle", () => { $("[data-prompt]", root).textContent = cfg.prompt(); });
    $("[data-check]", root).onclick = () => {
      LT.api.store.set(my.key("ai_" + id), ans.value);
      if (ans.value.trim().length < 10) { evalBox.innerHTML = `<div class="note warn">Előbb illeszd be az AI válaszát.</div>`; return; }
      try {
        last = cfg.ertekel(ans.value);
        evalBox.innerHTML = last.html;
        if (!kesz(id)) $("[data-refl]", root).classList.remove("hidden");
      } catch (e) {
        console.error(e);
        evalBox.innerHTML = `<div class="note bad">Nem sikerült értelmezni a választ. Kérd meg az AI-t, hogy pontosan a kért formátumban válaszoljon.</div>`;
      }
    };
    function done() {
      if (!kesz(id)) return;
      $("[data-refl]", root).classList.add("hidden");
      $("[data-done]", root).innerHTML = `<div class="note ok"><b>Értékelés beküldve, véglegesen.</b> ${esc(my.get("refl_" + id, ""))}</div>`;
    }
    $("[data-send]", root).onclick = async () => {
      const refl = $("[data-reflt]", root).value.trim();
      if (refl.length < 40) { toast("Írj legalább két mondatot a saját ítéletedről.", "err"); return; }
      if (!confirm("Biztosan beküldöd? Utána nem módosítható.")) return;
      const src = $("[data-src]", root).value;
      my.set("refl_" + id, refl);
      my.set("kesz_" + id, true);
      done();
      await submit({
        activity: id, kind: "text", value: last && last.value !== undefined ? last.value : "",
        option: (src + ": " + (last ? last.osszegzes || "" : "")).slice(0, 380), points: cfg.pont || 4,
        text: refl + "\n\n--- Az AI (" + src + ") válasza ---\n" + ans.value.slice(0, 2500)
      }, `AI-értékelés beküldve: +${cfg.pont || 4} pont`);
    };
    done();
    if (cfg.kapu) kapu(root, cfg.kapu);
    return root;
  }

  /* ---------------- Vízszintes oszlopdiagram (SVG) ---------------- */
  function hbars(data, opts) {
    opts = opts || {};
    const w = 560, rowH = 26, lw = opts.labelW || 170, h = data.length * rowH + 8;
    const max = Math.max(...data.map(d => d.value), 1e-9);
    return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(opts.title || "diagram")}">${data.map((d, i) => {
      const bw = (w - lw - 90) * d.value / max;
      return `<text x="${lw - 8}" y="${i * rowH + 18}" text-anchor="end" font-size="12">${esc(d.label)}</text>
        <rect x="${lw}" y="${i * rowH + 5}" width="${Math.max(bw, 1)}" height="${rowH - 9}" rx="4" fill="${d.color || "var(--m1)"}"></rect>
        <text x="${lw + bw + 6}" y="${i * rowH + 18}" font-size="12" font-weight="600">${esc(opts.fmt ? opts.fmt(d.value) : d.value)}</text>`;
    }).join("")}</svg>`;
  }

  function kpi(label, value, delta, goodWhenDown, egyseg) {
    let d = "";
    if (delta !== undefined && delta !== null && isFinite(delta)) {
      const good = goodWhenDown ? delta < 0 : delta > 0;
      d = `<div class="d ${Math.abs(delta) < 0.05 ? "" : good ? "up-good" : "up-bad"}">${delta > 0 ? "▲" : delta < 0 ? "▼" : "■"} ${fmt().num(Math.abs(delta), 1)}${egyseg || "%"} a kiinduláshoz képest</div>`;
    }
    return `<div class="kpi"><div class="l">${label}</div><div class="v">${value}</div>${d}</div>`;
  }

  function step(badge, cls, title, pts) {
    return `<div class="step"><span class="step-badge ${cls}">${badge}</span><h3>${title}</h3>${pts ? `<span class="pts">${pts}</span>` : ""}</div>`;
  }

  LT.ui = { esc, $, $$, el, toast, my, kesz, copy, submit, kapu, vote, tippKesz, board, szoveg, ai, hbars, kpi, step };
})();
