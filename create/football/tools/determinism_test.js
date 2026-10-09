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
['formations.js', 'roles.js', 'ratings.js', 'names.js', 'engine.js', 'rules.js', 'instructions.js', 'fitness.js', 'match.js']
  .forEach((file) => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file }));
const FM = sandbox.window.FM;

function run(dt) {
  const home = FM.createTeam({ id: 'home', name: 'Home', kit: {}, attackDir: 1, formation: '4-3-3', strength: 0, seed: 101 });
  const away = FM.createTeam({ id: 'away', name: 'Away', kit: {}, attackDir: -1, formation: '4-2-2-2', strength: 0, seed: 202 });
  const match = FM.createMatch(home, away, 303);
  while (match.phase !== 'fulltime') {
    if (match.phase === 'halftime') FM.startSecondHalf(match);
    if (match.injuryPause) FM.resolveInjury(match);
    FM.stepMatch(match, dt);
  }
  return {
    score: [match.score.home, match.score.away],
    stats: match.stats,
    events: match.events.map((event) => JSON.stringify(event)),
  };
}

const fineA = run(.1);
const fineB = run(.1);
const chunky = run(.25);
const sameSeed = JSON.stringify(fineA) === JSON.stringify(fineB);
const sameAcrossCallerSteps = JSON.stringify(fineA) === JSON.stringify(chunky);
console.log(JSON.stringify({ sameSeed, sameAcrossCallerSteps, score: fineA.score, events: fineA.events.length }, null, 2));
if (!sameSeed || !sameAcrossCallerSteps) process.exitCode = 1;
