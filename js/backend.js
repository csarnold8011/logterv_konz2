/* Kapcsolat az élő összesítővel (Apps Script), illetve helyi mód, ha nincs URL
   vagy a kapcsolat megszakad. A beküldések sorba állnak, és később újrapróbálkozik. */
(function () {
  const LT = (window.LT = window.LT || {});
  const C = window.LT_CONFIG;
  const listeners = [];
  let state = null, session = null, team = null, neptun = null, timer = null, interval = C.POLL_DIAK;
  let status = { mod: C.API_URL ? "online" : "helyi", varakozo: 0, utolso: null, hiba: null };
  const statusListeners = [];

  const clientId = (() => {
    try {
      let c = localStorage.getItem("lt_client");
      if (!c) { c = Math.random().toString(36).slice(2, 10); localStorage.setItem("lt_client", c); }
      return c;
    } catch (e) { return "anon"; }
  })();

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* nem baj */ } }
  };
  const localKey = () => "lt_events_" + session;
  const queueKey = () => "lt_queue_" + session;

  function setStatus(p) {
    Object.assign(status, p);
    statusListeners.forEach(f => { try { f(status); } catch (e) { console.error(e); } });
  }
  function emit(st) {
    if (!st || st.ok === false) return;
    state = st;
    listeners.forEach(f => { try { f(state); } catch (e) { console.error(e); } });
  }
  function localState() {
    return Object.assign(window.ltAggregate(store.get(localKey(), [])), { session, helyi: true });
  }

  async function fetchState() {
    if (!session) return;
    if (!C.API_URL) { emit(localState()); setStatus({ utolso: Date.now() }); return; }
    try {
      const r = await fetch(C.API_URL + "?action=state&session=" + encodeURIComponent(session) + "&_=" + Date.now());
      const j = await r.json();
      if (j.ok === false) throw new Error(j.hiba || "hiba");
      emit(j);
      setStatus({ mod: "online", utolso: Date.now(), hiba: null });
      flushQueue();
    } catch (e) {
      setStatus({ mod: "kapcsolat nélkül", hiba: String(e.message || e) });
    }
  }

  async function post(ev) {
    const r = await fetch(C.API_URL, { method: "POST", body: JSON.stringify({ action: "submit", event: ev }) });
    const j = await r.json();
    if (j.ok === false) throw new Error(j.hiba || "hiba");
    return j;
  }

  let flushing = false;
  async function flushQueue() {
    if (flushing || !C.API_URL) return;
    const q = store.get(queueKey(), []);
    if (!q.length) return;
    flushing = true;
    try {
      while (q.length) {
        const j = await post(q[0]);
        q.shift(); store.set(queueKey(), q);
        emit(j);
      }
    } catch (e) { /* majd legközelebb */ }
    flushing = false;
    setStatus({ varakozo: store.get(queueKey(), []).length });
  }

  async function submit(ev) {
    setTimeout(() => document.dispatchEvent(new Event("lt-valtozas")), 0);
    const full = Object.assign({ session, team, client: neptun || clientId, ts: Date.now() }, ev);
    // a hallgató saját másolata (a KPI-pult és az összefoglalók ebből is dolgoznak)
    const mine = store.get("lt_mine_" + session + "_" + neptun, []);
    mine.push(full); store.set("lt_mine_" + session + "_" + neptun, mine.slice(-300));
    if (!C.API_URL) {
      const all = store.get(localKey(), []);
      all.push(full); store.set(localKey(), all);
      emit(localState());
      return { ok: true, helyi: true };
    }
    try {
      const j = await post(full);
      emit(j);
      setStatus({ mod: "online", utolso: Date.now(), hiba: null });
      return { ok: true };
    } catch (e) {
      const q = store.get(queueKey(), []); q.push(full); store.set(queueKey(), q);
      setStatus({ mod: "kapcsolat nélkül", varakozo: q.length, hiba: String(e.message || e) });
      return { ok: false, sorban: true };
    }
  }


  /* ---- Névtelen beküldés (kurzusértékelés): külön munkamenet, véletlen azonosító,
     se név, se Neptun-kód nem kerül az eseménybe ---- */
  const anonId = (() => {
    try {
      let a = localStorage.getItem("lt_anon");
      if (!a) { a = "anon-" + Math.random().toString(36).slice(2, 10); localStorage.setItem("lt_anon", a); }
      return a;
    } catch (e) { return "anon-" + Math.random().toString(36).slice(2, 10); }
  })();
  async function submitAnon(sessKod, ev) {
    const full = Object.assign({ session: sessKod, team: anonId, client: "", ts: Date.now() }, ev);
    if (!C.API_URL) {
      const k = "lt_events_" + sessKod, all = store.get(k, []);
      all.push(full); store.set(k, all);
      return { ok: true, helyi: true };
    }
    try { await post(full); return { ok: true }; }
    catch (e) {
      const q = store.get(queueKey(), []); q.push(full); store.set(queueKey(), q);
      setStatus({ mod: "kapcsolat nélkül", varakozo: q.length, hiba: String(e.message || e) });
      return { ok: false, sorban: true };
    }
  }
  async function sessionState(sessKod) {
    if (!C.API_URL) return window.ltAggregate(store.get("lt_events_" + sessKod, []));
    const r = await fetch(C.API_URL + "?action=state&session=" + encodeURIComponent(sessKod) + "&_=" + Date.now());
    return r.json();
  }

  function start(sess, tm, isTeacher, np) {
    session = sess; team = tm; neptun = np || null;
    interval = isTeacher ? C.POLL_TANAR : C.POLL_DIAK;
    setStatus({ varakozo: store.get(queueKey(), []).length });
    if (timer) clearInterval(timer);
    fetchState();
    timer = setInterval(() => { if (!document.hidden) fetchState(); }, interval);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) fetchState(); });
    // Helyi módban több fül (pl. tanári nézet ugyanazon a gépen) is lássa a változást
    window.addEventListener("storage", ev => { if (!C.API_URL && ev.key === localKey()) emit(localState()); });
  }

  LT.api = {
    start, submit, submitAnon, sessionState, refresh: fetchState, store, clientId,
    onState(f) { listeners.push(f); if (state) f(state); },
    onStatus(f) { statusListeners.push(f); f(status); },
    get state() { return state; },
    get status() { return status; },
    get session() { return session; },
    get team() { return team; },
    get neptun() { return neptun; },
    // a hallgató saját beküldései (legutóbbi először)
    mine(activity) {
      const all = store.get("lt_mine_" + session + "_" + neptun, []);
      return all.filter(e => !activity || e.activity === activity).reverse();
    }
  };
})();
