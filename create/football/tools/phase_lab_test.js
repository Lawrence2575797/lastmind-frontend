'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const sandbox = { console, window: {}, document: { addEventListener() {}, querySelector() { return null; }, getElementById() { return null; } }, localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }, setTimeout, clearTimeout };
sandbox.window.window = sandbox.window; sandbox.window.document = sandbox.document; sandbox.window.localStorage = sandbox.localStorage;
vm.createContext(sandbox);
['formations.js','roles.js','ratings.js','names.js','engine.js','rules.js','instructions.js','fitness.js','stats_math.js','match.js','lab.js']
  .forEach((file) => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file }));
const FM = sandbox.window.FM;
const home = FM.createTeam({ id:'home', name:'Ashford Rovers', kit:{}, attackDir:1, formation:'4-3-3', strength:0, seed:101 });
const away = FM.createTeam({ id:'away', name:'Visitors', kit:{}, attackDir:-1, formation:'4-2-2-2', strength:0, seed:202 });
const league = { userId:home.id, teams:[home,away] };
Promise.all([
  FM.lab.run(league, { n:20, user:home, opp:away, phase:'build', start:'keeper', seed:401 }),
  FM.lab.run(league, { n:20, user:home, opp:away, phase:'final', start:'attack', seed:402 })
]).then(([build, final]) => {
  const total = (r) => r.beat.k + r.lost.k + r.still.k;
  const ok = total(build) === 20 && total(final) === 20 && final.shot.k === final.beat.k;
  console.log(JSON.stringify({ ok, build: { escaped:build.beat.k, lost:build.lost.k, still:build.still.k }, final: { shots:final.shot.k, goals:final.goal.k, brokeDown:final.lost.k, still:final.still.k } }, null, 2));
  if (!ok) process.exitCode = 1;
});
