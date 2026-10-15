'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const sandbox = {
  console,
  window: {},
  document: { addEventListener() {}, querySelector() { return null; }, getElementById() { return null; }, body: { appendChild() {} } },
  navigator: { clipboard: { writeText() {} } },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  location: { search: '' },
  setTimeout, clearTimeout, setInterval, clearInterval,
};
sandbox.window.window = sandbox.window;
sandbox.window.document = sandbox.document;
sandbox.window.localStorage = sandbox.localStorage;
sandbox.window.location = sandbox.location;
sandbox.window.addEventListener = function () {};
vm.createContext(sandbox);
['formations.js', 'roles.js', 'ratings.js', 'names.js', 'engine.js', 'rules.js', 'instructions.js', 'fitness.js', 'match.js', 'league.js', 'news.js', 'transfers.js', 'multiplayer.js']
  .forEach((file) => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file }));

const FM = sandbox.window.FM;
const teams = Array.from({ length: 8 }, (_, i) => 't' + (i + 1)).concat(Array.from({ length: 8 }, (_, i) => 'l' + (i + 1)));
const game = { code: 'ABC234', kind: 'league', seed: FM.WORLD_SEED, runSeed: 12345, state: { kind: 'league', hostTeam: 't1', teams, seats: { l1: { name: 'Lower manager' } }, plans: {}, played: [], round: 0, finished: false } };
const lower = FM.mpOpen(game, 'l1');
const lowerActive = lower.userId === 'l1' && lower.divisionLevel === 2 && lower.teams.some((t) => t.id === 'l1') && lower.otherLeague.level === 1 && lower.otherLeague.teams.some((t) => t.id === 't1');
const planWorks = FM.mpPlanOf(FM.teamById(lower, 'l1')).formationKey != null;
const restored = FM.deserializeLeague(FM.serializeLeague(lower));
const roundTrip = restored.userId === 'l1' && restored.divisionLevel === 2 && restored.teams.some((t) => t.id === 'l1') && restored.otherLeague.teams.some((t) => t.id === 't1');
(async () => {
  // Exercise the two-division round coordinator without spending minutes in
  // the match engine: each fixture is deterministically marked 1-0.
  lower.mp.teamId = null;
  FM.startFixture = () => ({ phase: 'fulltime' });
  FM.finishFixture = (_league, fixture) => { fixture.played = true; fixture.hg = 1; fixture.ag = 0; };
  FM.aiAfterRound = () => {};
  FM.makeNews = () => {};
  FM.recoverDay = () => {};
  const scores = await FM.mpResolve(lower, 0, {}, []);
  const bothDivisionsPlayed = scores.length === 8 && lower.fixtures.filter((f) => f.round === 0 && f.played).length === 4 && lower.otherLeague.fixtures.filter((f) => f.round === 0 && f.played).length === 4;
  const matchState = { kind: 'match', hostTeam: 't1', teams: teams.slice(0, 8), seats: { t1: { name: 'A' }, t2: { name: 'B' } }, plans: {}, played: [], round: 0, finished: false };
  const oneOff = FM.mpOpen({ code: 'DEF345', kind: 'match', seed: FM.WORLD_SEED, runSeed: 999, state: matchState }, 't1');
  oneOff.mp.teamId = null;
  const oneOffScores = await FM.mpResolve(oneOff, 0, {}, []);
  const oneOffStayedOneMatch = oneOffScores.length === 1;
  const ok = teams.length === 16 && lowerActive && planWorks && roundTrip && bothDivisionsPlayed && oneOffStayedOneMatch;
  console.log(JSON.stringify({ clubs: teams.length, lowerDivisionCanBeManaged: lowerActive, lowerDivisionPlan: planWorks, twoDivisionSave: roundTrip, bothDivisionsPlayed, oneOffStayedOneMatch }, null, 2));
  if (!ok) process.exitCode = 1;
})().catch((err) => { console.error(err); process.exitCode = 1; });
