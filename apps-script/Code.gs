/**
 * Lumen logisztikai műhely – élő összesítő (Google Apps Script + Google Sheet)
 *
 * Telepítés röviden (részletesen: README.md):
 *  1. Hozz létre egy új Google Sheetet, majd Bővítmények → Apps Script.
 *  2. Másold be ezt a teljes fájlt a Code.gs helyére, mentsd.
 *  3. Futtasd egyszer a "setup" függvényt (engedélyt kér a táblához).
 *  4. Telepítés → Új telepítés → Típus: Webalkalmazás
 *       Végrehajtás mint: Én   |   Hozzáférés: Bárki
 *  5. A kapott ".../exec" végű URL-t írd be a js/config.js API_URL mezőjébe.
 *
 * A tábla "Esemenyek" munkalapjára minden szavazat, eredmény és szöveg új sorként kerül.
 * Új óra / új csoport: egyszerűen használj új munkamenet-kódot (session), a régi adatok megmaradnak.
 */

var LAP = "Esemenyek";
var FEJLEC = ["ts", "session", "team", "activity", "kind", "option", "value", "dir", "points", "text", "client"];
var CACHE_MP = 3; // ennyi másodpercig gyorsítótárazzuk az összesítést munkamenetenként

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(LAP) || ss.insertSheet(LAP);
  if (sh.getLastRow() === 0) {
    sh.appendRow(FEJLEC);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, FEJLEC.length).setFontWeight("bold");
  }
  return "Kész: az '" + LAP + "' munkalap használatra kész.";
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.action === "ping") return valasz({ ok: true, ido: new Date().toISOString() });
    if (p.action === "state") return valasz(allapot(tisztit(p.session, 40)));
    if (p.action === "export") return valasz({ ok: true, esemenyek: esemenyek(tisztit(p.session, 40)) });
    return valasz({ ok: false, hiba: "Ismeretlen művelet." });
  } catch (err) {
    return valasz({ ok: false, hiba: String(err) });
  }
}

function doPost(e) {
  var b;
  try { b = JSON.parse(e.postData.contents); } catch (err) { return valasz({ ok: false, hiba: "Hibás kérés." }); }
  if (b.action !== "submit") return valasz({ ok: false, hiba: "Ismeretlen művelet." });
  var ev = b.event || {};
  var sor = {
    ts: Date.now(),
    session: tisztit(ev.session, 40),
    team: tisztit(ev.team, 40),
    activity: tisztit(ev.activity, 60),
    kind: tisztit(ev.kind, 12),
    option: tisztit(ev.option, 400),
    value: ev.value === null || ev.value === undefined || ev.value === "" ? "" : Number(ev.value),
    dir: ev.dir === "max" ? "max" : "min",
    points: Math.max(-50, Math.min(50, Number(ev.points) || 0)),
    text: tisztit(ev.text, 4000),
    client: tisztit(ev.client, 40)
  };
  if (!sor.session || !sor.team || !sor.activity) return valasz({ ok: false, hiba: "Hiányzó munkamenet, csapat vagy feladat." });
  if (["vote", "result", "text", "peer", "bonus"].indexOf(sor.kind) < 0) return valasz({ ok: false, hiba: "Ismeretlen eseménytípus." });
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(LAP);
    if (!sh) { setup(); sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(LAP); }
    sh.appendRow(FEJLEC.map(function (k) { return sor[k]; }));
  } finally {
    lock.releaseLock();
  }
  CacheService.getScriptCache().remove("st_" + sor.session);
  return valasz(allapot(sor.session));
}

function esemenyek(session) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(LAP);
  if (!sh || sh.getLastRow() < 2) return [];
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, FEJLEC.length).getValues();
  var out = [];
  for (var i = 0; i < v.length; i++) {
    if (String(v[i][1]) !== session) continue;
    var o = {};
    for (var k = 0; k < FEJLEC.length; k++) o[FEJLEC[k]] = v[i][k];
    out.push(o);
  }
  return out;
}

function allapot(session) {
  if (!session) return { ok: false, hiba: "Hiányzó munkamenet-kód." };
  var cache = CacheService.getScriptCache();
  var c = cache.get("st_" + session);
  if (c) return JSON.parse(c);
  var st = ltAggregate(esemenyek(session));
  st.session = session;
  st.ido = Date.now();
  var s = JSON.stringify(st);
  if (s.length < 95000) cache.put("st_" + session, s, CACHE_MP);
  return st;
}

function tisztit(s, max) {
  if (s === null || s === undefined) return "";
  return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}

function valasz(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ===================== Összesítés (azonos a js/aggregate.js-sel) ===================== */
/* Összesítő logika: ugyanez a függvény fut a böngészőben (helyi mód)
   és a Google Apps Script-ben (apps-script/Code.gs). Ha módosítod,
   mindkét helyen módosítsd! */
var LT_PONT = {
  RANG: [15, 12, 10, 8], // optimalizálási kihívás: 1., 2., 3., 4. hely
  RANG_TOVABBI: 6,       // minden további érvényes beküldés
  PEER: 3                // minden kapott szavazat a csapatok közti szavazásban
};

function ltAggregate(events) {
  var teams = {}, lastVote = {}, bestResult = {}, lastText = {}, lastPeer = {}, lastBonus = {};
  events.forEach(function (e) {
    if (!e || !e.team || !e.activity) return;
    teams[e.team] = true;
    var key = e.team + "|" + e.activity;
    var ts = Number(e.ts) || 0;
    if (e.kind === "vote") {
      if (!lastVote[key] || ts >= lastVote[key].ts) lastVote[key] = { ts: ts, e: e };
    } else if (e.kind === "result") {
      var v = Number(e.value);
      if (isNaN(v)) return;
      var cur = bestResult[key];
      var better = !cur || (e.dir === "max" ? v > cur.value : v < cur.value);
      if (better) bestResult[key] = { ts: ts, value: v, e: e };
    } else if (e.kind === "text") {
      if (!lastText[key] || ts >= lastText[key].ts) lastText[key] = { ts: ts, e: e };
    } else if (e.kind === "peer") {
      if (e.option && e.option !== e.team && (!lastPeer[key] || ts >= lastPeer[key].ts)) lastPeer[key] = { ts: ts, e: e };
    } else if (e.kind === "bonus") {
      if (!lastBonus[key] || ts >= lastBonus[key].ts) lastBonus[key] = { ts: ts, e: e };
    }
  });

  var pont = {}, reszlet = {};
  Object.keys(teams).forEach(function (t) { pont[t] = 0; reszlet[t] = {}; });
  function add(team, activity, p) {
    p = Number(p) || 0;
    if (!p) return;
    pont[team] += p;
    reszlet[team][activity] = (reszlet[team][activity] || 0) + p;
  }

  var votes = {};
  Object.keys(lastVote).forEach(function (k) {
    var e = lastVote[k].e;
    votes[e.activity] = votes[e.activity] || {};
    String(e.option || "").split("|").forEach(function (o) {
      if (!o) return;
      votes[e.activity][o] = (votes[e.activity][o] || 0) + 1;
    });
    add(e.team, e.activity, e.points);
  });

  var results = {};
  Object.keys(bestResult).forEach(function (k) {
    var r = bestResult[k], e = r.e;
    results[e.activity] = results[e.activity] || [];
    results[e.activity].push({ team: e.team, value: r.value, text: e.text || "", dir: e.dir || "min", ts: r.ts });
  });
  Object.keys(results).forEach(function (a) {
    var list = results[a];
    var dir = list[0].dir;
    list.sort(function (x, y) { return dir === "max" ? y.value - x.value || x.ts - y.ts : x.value - y.value || x.ts - y.ts; });
    list.forEach(function (r, i) {
      r.rang = i + 1;
      r.pont = i < LT_PONT.RANG.length ? LT_PONT.RANG[i] : LT_PONT.RANG_TOVABBI;
      add(r.team, a, r.pont);
    });
  });

  var texts = {};
  Object.keys(lastText).forEach(function (k) {
    var e = lastText[k].e;
    texts[e.activity] = texts[e.activity] || [];
    texts[e.activity].push({ team: e.team, text: e.text || "", value: e.value, option: e.option || "", ts: lastText[k].ts });
    add(e.team, e.activity, e.points);
  });
  Object.keys(texts).forEach(function (a) { texts[a].sort(function (x, y) { return x.ts - y.ts; }); });

  var peer = {};
  Object.keys(lastPeer).forEach(function (k) {
    var e = lastPeer[k].e;
    if (!teams[e.option]) return;
    peer[e.activity] = peer[e.activity] || {};
    peer[e.activity][e.option] = (peer[e.activity][e.option] || 0) + 1;
    add(e.option, e.activity, LT_PONT.PEER);
  });

  Object.keys(lastBonus).forEach(function (k) {
    var e = lastBonus[k].e;
    add(e.team, e.activity, e.points);
  });

  var leaderboard = Object.keys(teams).map(function (t) {
    return { team: t, pont: pont[t], reszlet: reszlet[t] };
  }).sort(function (a, b) { return b.pont - a.pont || (a.team < b.team ? -1 : 1); });
  leaderboard.forEach(function (r, i) { r.rang = i + 1; });

  return {
    ok: true, teams: Object.keys(teams).sort(), votes: votes, results: results,
    texts: texts, peer: peer, leaderboard: leaderboard, esemenyDb: events.length
  };
}

if (typeof window !== "undefined") { window.ltAggregate = ltAggregate; window.LT_PONT = LT_PONT; }
if (typeof module !== "undefined") { module.exports = { ltAggregate: ltAggregate, LT_PONT: LT_PONT }; }
