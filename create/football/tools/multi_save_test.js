'use strict';
// Two devices, one account, several saved games: each game is its own row, a device carries on with the game it holds, a new game never replaces another,
// and Your projects can send a device to any one of them.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');

const rows = new Map(); let nextId = 1;   // the account's saved projects
function server(uid) {
  return async (method, route, body) => {
    if (route === '/create/projects' && method === 'GET') return { ok: true, uid, json: { projects: [...rows.values()].map((r) => ({ id: r.id, title: r.title, kind: r.kind, updatedAt: r.updatedAt, progress: r.data && r.data.football ? r.data.football.progress : undefined })) } };
    if (route === '/create/projects' && method === 'POST') {
      const now = new Date(Date.now() + rows.size).toISOString();
      if (body.id && rows.has(body.id)) { const old = rows.get(body.id); if (old.data.football && body.data.football && body.data.football.progress < old.data.football.progress && !body.replace) return { ok: false, status: 409, uid, json: {} }; Object.assign(old, { title: body.title, data: body.data, updatedAt: now }); return { ok: true, uid, json: { id: body.id, updatedAt: now } }; }
      const id = 'row' + nextId++; rows.set(id, { id, title: body.title, kind: body.kind, data: body.data, updatedAt: now }); return { ok: true, uid, json: { id, updatedAt: now } };
    }
    const m = route.match(/^\/create\/projects\/(.+)$/);
    if (m && method === 'GET') { const r = rows.get(decodeURIComponent(m[1])); return r ? { ok: true, uid, json: { id: r.id, kind: r.kind, title: r.title, updatedAt: r.updatedAt, data: r.data } } : { ok: false, status: 404, uid, json: {} }; }
    if (m && method === 'DELETE') { rows.delete(decodeURIComponent(m[1])); return { ok: true, uid, json: {} }; }
    return { ok: true, uid, json: {} };
  };
}

function device(uid) {
  const storage = new Map();
  const localStorage = { getItem: (k) => storage.has(k) ? storage.get(k) : null, setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k), key: (i) => [...storage.keys()][i], get length() { return storage.size; } };
  const sandbox = { console, window: { FM: {} }, document: { addEventListener() {}, hidden: false }, localStorage, location: { search: '' }, setTimeout, clearTimeout };
  sandbox.window.window = sandbox.window; sandbox.window.document = sandbox.document; sandbox.window.localStorage = localStorage; sandbox.window.location = sandbox.location; sandbox.window.addEventListener = () => {};
  sandbox.window.FM.apiCall = server(uid);
  vm.createContext(sandbox);
  ['formations.js', 'roles.js', 'ratings.js', 'names.js', 'engine.js', 'rules.js', 'instructions.js', 'fitness.js', 'match.js', 'league.js'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f }));
  return sandbox.window.FM;
}
const ok = (c, m) => { if (!c) { console.error('FAIL: ' + m); process.exitCode = 1; } else console.log('ok: ' + m); };

(async () => {
  const A = device('u1'), B = device('u1');
  await A.pullCloud();
  // device A: first game, saved
  const g1 = A.createLeague({ userIndex: 0, tier: 'gcse', seed: 101, runSeed: 111 });
  A.setBoardExpectation && 0;
  let r = await A.saveNow(g1); ok(rows.size === 1, 'the first game is a row on the account (' + r + ')');
  const id1 = g1.cid; ok(!!id1, 'the game knows its row');
  // a new game on the same device is a second row, the first stays
  const g2 = A.createLeague({ userIndex: 0, tier: 'alevel', seed: 202, runSeed: 222 });
  await A.saveNow(g2); ok(rows.size === 2, 'a new game adds a row: ' + rows.size);
  ok(g2.cid && g2.cid !== id1, 'the new game has its own row');
  ok(rows.get(id1).data.football.save.indexOf('"tier":"gcse"') > 0, 'the first game is untouched on the account');
  // device B opens fresh: it takes the game saved last
  await B.pullCloud(); const lb = B.loadLeague('solo');
  ok(lb && lb.tier === 'alevel' && lb.cid === g2.cid, 'a new device opens the game saved last');
  // device B opens the first game from Your projects and carries on with it
  const opened = await B.openSave(id1); const lb1 = B.loadLeague('solo');
  ok(opened && lb1 && lb1.tier === 'gcse' && lb1.cid === id1, 'a device can open any one saved game');
  lb1.day = (lb1.day || 0) + 1; await B.saveNow(lb1);
  ok(rows.size === 2 && rows.get(id1).data.football.save.indexOf('"cid":"' + id1 + '"') > 0, 'saving it writes to its own row, not a new one');
  ok(rows.get(g2.cid).data.football.save.indexOf('"tier":"alevel"') > 0, 'the other game is unchanged');
  // device B restarts: it still carries on with the game it holds, even though the other row was saved more recently
  await rows.get(g2.cid) && (rows.get(g2.cid).updatedAt = new Date(Date.now() + 99999).toISOString());
  await B.pullCloud(); const again = B.loadLeague('solo');
  ok(again && again.cid === id1, 'a device keeps the game it holds');
  // deleting the row elsewhere does not lose the game on this device: it is written as a new row
  rows.delete(id1); await B.pullCloud(); const kept = B.loadLeague('solo');
  ok(kept && kept.tier === 'gcse', 'a game whose row was deleted elsewhere stays on the device');
  await B.saveNow(kept); ok([...rows.values()].some((x) => x.data.football.save.indexOf('"tier":"gcse"') > 0), 'and is written again as a new row');
})();

// a saved game can be named: the name is kept in the save and is the row's title
(async () => {
  await new Promise((r) => setTimeout(r, 1500));
  const A = device('u1'); await A.pullCloud();
  const g = A.createLeague({ userIndex: 0, tier: 'gcse', seed: 303, runSeed: 333 }); g.saveName = 'My first title run';
  await A.saveNow(g); const row = rows.get(g.cid);
  ok(row && row.title === 'My first title run', 'the row is titled with the save name: ' + (row && row.title));
  const B = device('u1'); await B.pullCloud(); await B.openSave(g.cid); const lb = B.loadLeague('solo');
  ok(lb && lb.saveName === 'My first title run', 'another device opens it with the name');
  delete lb.saveName; await B.saveNow(lb); ok(/^Be the manager: /.test(rows.get(g.cid).title), 'clearing the name goes back to the club name: ' + rows.get(g.cid).title);
})();
