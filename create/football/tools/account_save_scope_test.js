'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const storage = new Map();
const localStorage = { getItem: (k) => storage.has(k) ? storage.get(k) : null, setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k) };

function environment(uid) {
  const sandbox = { console, window: { FM: {} }, document: { addEventListener() {} }, localStorage, location: { search: '' }, setTimeout, clearTimeout };
  sandbox.window.window = sandbox.window; sandbox.window.document = sandbox.document; sandbox.window.localStorage = localStorage; sandbox.window.location = sandbox.location; sandbox.window.addEventListener = function () {};
  sandbox.window.FM.apiCall = async (method, route) => route === '/create/projects' && method === 'GET'
    ? { ok: true, uid, json: { projects: [] } }
    : { ok: true, uid, json: {} };
  vm.createContext(sandbox);
  ['formations.js', 'roles.js', 'ratings.js', 'names.js', 'engine.js', 'rules.js', 'instructions.js', 'fitness.js', 'match.js', 'league.js']
    .forEach((file) => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file }));
  return sandbox.window.FM;
}

(async () => {
  const seedEnv = environment('austin');
  const austinLegacy = seedEnv.createLeague({ userIndex: 0, tier: 'gcse', seed: 101, runSeed: 111 });
  storage.set('lm_football_save_v1', seedEnv.serializeLeague(austinLegacy));
  storage.set('lm_football_save_v1_owner', 'austin');

  const james = environment('james');
  await james.pullCloud();
  const jamesSawAustin = !!james.loadLeague();
  const jamesLeague = james.createLeague({ userIndex: 0, tier: 'gcse', seed: 202, runSeed: 222 });
  const jamesSaved = james.saveLeagueRaw(jamesLeague);

  const austin = environment('austin');
  await austin.pullCloud();
  const austinLoaded = austin.loadLeague();
  await james.flushStore(); await austin.flushStore();   // saves reach the browser's storage a moment after they are made
  const separate = storage.has('lm_football_save_v1:james') && storage.has('lm_football_save_v1:austin') && storage.get('lm_football_save_v1:james') !== storage.get('lm_football_save_v1:austin');
  const ok = !jamesSawAustin && jamesSaved && austinLoaded && austinLoaded.runSeed === 111 && separate;
  console.log(JSON.stringify({ jamesSawAustin, jamesSaved, austinLegacyMigrated: !!austinLoaded, accountSlotsSeparate: separate }, null, 2));
  if (!ok) process.exitCode = 1;
})().catch((err) => { console.error(err); process.exitCode = 1; });
