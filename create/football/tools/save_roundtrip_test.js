'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const sandbox = {
  console,
  window: {},
  document: { addEventListener() {}, querySelector() { return null; }, getElementById() { return null; } },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  setTimeout, clearTimeout,
};
sandbox.window.window = sandbox.window;
sandbox.window.document = sandbox.document;
sandbox.window.localStorage = sandbox.localStorage;
vm.createContext(sandbox);
['formations.js', 'roles.js', 'ratings.js', 'names.js', 'engine.js', 'rules.js', 'instructions.js', 'fitness.js', 'match.js', 'league.js']
  .forEach((file) => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file }));

const FM = sandbox.window.FM;
const league = FM.createLeague({ userIndex: 0, tier: 'gcse', seed: 901 });
league.tacticalPlans.push({ id: 'plan-test', name: 'Wide build-up', formationKey: '4-3-3', tactics: { attackWidth: 1.1 }, shape: {}, phasePos: {}, rules: [], players: [] });
const restored = FM.deserializeLeague(FM.serializeLeague(league));
const ok = restored.tacticalPlans.length === 1 && restored.tacticalPlans[0].name === 'Wide build-up' && restored.tacticalPlans[0].tactics.attackWidth === 1.1;
console.log(JSON.stringify({ tacticalPlanRoundTrip: ok, existingTeams: restored.teams.length, existingFixtures: restored.fixtures.length }, null, 2));
if (!ok) process.exitCode = 1;
