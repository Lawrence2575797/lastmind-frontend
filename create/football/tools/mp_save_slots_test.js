'use strict';
// A single-player season and a multiplayer game are saved side by side: saving one never touches the other.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.resolve(__dirname, '..');
const storage = new Map();
const localStorage = { getItem: (k) => storage.has(k) ? storage.get(k) : null, setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k) };
function environment(uid, rows) {
  const sandbox = { console, window: { FM: {} }, document: { addEventListener() {} }, localStorage, location: { search: '' }, setTimeout, clearTimeout };
  sandbox.window.window = sandbox.window; sandbox.window.document = sandbox.document; sandbox.window.localStorage = localStorage; sandbox.window.location = sandbox.location; sandbox.window.addEventListener = function () {};
  sandbox.window.FM.apiCall = async (method, route) => route === '/create/projects' && method === 'GET' ? { ok: true, uid, json: { projects: rows || [] } } : { ok: true, uid, json: { id: 'x' } };
  vm.createContext(sandbox);
  ['formations.js', 'roles.js', 'ratings.js', 'names.js', 'engine.js', 'rules.js', 'instructions.js', 'fitness.js', 'match.js', 'league.js']
    .forEach((file) => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file }));
  return sandbox.window.FM;
}
(async () => {
  const a = environment('u1');
  await a.pullCloud();
  const solo = a.createLeague({ userIndex: 0, tier: 'gcse', seed: 101, runSeed: 111 });
  const mp = a.createLeague({ userIndex: 0, tier: 'gcse', seed: 101, runSeed: 222 });
  mp.mp = { code: 'ABCD', kind: 'league', teamId: mp.userId, hostTeam: mp.userId, localRound: 0, state: {}, submitted: -1, polledAt: 0 };
  a.saveLeagueRaw(solo); a.saveLeagueRaw(mp); a.saveLeagueRaw(solo);   // alternating saves
  await a.flushStore();
  const slots = storage.has('lm_football_save_v1:u1') || true;
  const b = environment('u1'); await b.pullCloud();
  const games = await b.savedGames();
  const loadedSolo = b.loadLeague('solo'), loadedMp = b.loadLeague('mp');
  const lastMode = b.activeMode();
  const c = environment('u1'); await c.pullCloud();
  const defaultLoad = c.loadLeague();   // the one played last
  const ok = games.solo && games.mp && games.mp.mpKind === 'league' && games.solo.mpKind === '' && loadedSolo && !loadedSolo.mp && loadedMp && loadedMp.mp && loadedMp.mp.code === 'ABCD' && lastMode === 'mp' && defaultLoad && !!defaultLoad.mp;
  // a multiplayer game that an older version put in the single-player slot moves to its own slot
  storage.clear();
  const old = environment('u2'); await old.pullCloud();
  storage.set('lm_football_save_v1:u2', old.serializeLeague(mp));
  const d = environment('u2'); await d.pullCloud();
  const moved = d.loadLeague(); await d.flushStore();
  const migrated = moved && moved.mp && d.activeMode() === 'mp' && storage.has('lm_football_mpsave_v1:u2') && !storage.has('lm_football_save_v1:u2');
  console.log(JSON.stringify({ bothListed: !!(games.solo && games.mp), loadedSeparately: !!(loadedSolo && loadedMp && !loadedSolo.mp && loadedMp.mp), lastPlayedOpensByDefault: !!(defaultLoad && defaultLoad.mp), oldMpMigrated: !!migrated }, null, 2));
  if (!ok || !migrated) process.exitCode = 1;
})().catch((e) => { console.error(e); process.exitCode = 1; });
