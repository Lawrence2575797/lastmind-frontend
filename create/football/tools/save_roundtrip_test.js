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
  location: { search: '' },
  setTimeout, clearTimeout,
};
sandbox.window.window = sandbox.window;
sandbox.window.document = sandbox.document;
sandbox.window.localStorage = sandbox.localStorage;
sandbox.window.location = sandbox.location;
sandbox.window.addEventListener = function () {};
vm.createContext(sandbox);
['formations.js', 'roles.js', 'ratings.js', 'names.js', 'engine.js', 'rules.js', 'instructions.js', 'fitness.js', 'match.js', 'league.js', 'news.js', 'transfers.js']
  .forEach((file) => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file }));

const FM = sandbox.window.FM;
const league = FM.createLeague({ userIndex: 0, tier: 'gcse', seed: 901 });
const customTeam = league.teams[0];
const movedForward = customTeam.players.find((p) => p.group !== 'GK');
FM.setSlotBase(customTeam, movedForward, { d: 0.78, w: 0.2 });
const customFormation = FM.formationName(customTeam);
league.tacticalPlans.push({ id: 'plan-test', name: 'Wide build-up', formationKey: '4-3-3', tactics: { attackWidth: 1.1 }, shape: {}, phasePos: {}, rules: [], players: [] });
league.phaseLabRuns = { final: [{ id: 'fr1', hyp: 'Create one extra passing lane.' }], press: [{ id: 'pr1', hyp: 'Press higher.' }], without: [{ id: 'wr1', hyp: 'Protect the middle.' }] };
league.interviews = [{ key: 'pre:0', kind: 'pre', answers: [{ answer: 'We are ready.' }] }];
FM.updateTacticalFamiliarity(customTeam);
customTeam.rules = customTeam.rules || [];
customTeam.rules.push({ id: 'familiarity-test', text: 'Change the pressing trigger' });
const changedFamiliarity = FM.updateTacticalFamiliarity(customTeam);
const restored = FM.deserializeLeague(FM.serializeLeague(league));
const plansOk = restored.tacticalPlans.length === 1 && restored.tacticalPlans[0].name === 'Wide build-up' && restored.tacticalPlans[0].tactics.attackWidth === 1.1;
const phasesOk = restored.phaseLabRuns.final.length === 1 && restored.phaseLabRuns.press.length === 1 && restored.phaseLabRuns.without.length === 1;
const interviewsOk = restored.interviews.length === 1 && restored.interviews[0].key === 'pre:0';
const formationOk = !!customFormation && FM.formationName(restored.teams[0]) === customFormation;
const pyramidOk = restored.otherLeague && restored.otherLeague.teams.length === 8 && restored.otherLeague.fixtures.length === 56 && restored.divisionLevel === 1;
const approvalOk = restored.board && restored.board.expectation && restored.boardApproval === 50;
const familiarityOk = changedFamiliarity.score < 100 && restored.teams[0].tacticalFamiliarity && restored.teams[0].tacticalFamiliarity.score === changedFamiliarity.score;
restored.fixtures.forEach((f) => { f.played = true; f.hg = f.homeId === restored.userId ? 0 : f.awayId === restored.userId ? 2 : 1; f.ag = f.awayId === restored.userId ? 0 : f.homeId === restored.userId ? 2 : 0; });
restored.otherLeague.fixtures.forEach((f) => { f.played = true; f.hg = 1; f.ag = 0; });
const nextSeason = FM.startNextSeason(restored);
const relegationOk = nextSeason && restored.season === 2 && restored.divisionLevel === 2 && restored.teams.some((t) => t.id === restored.userId) && restored.otherLeague.level === 1 && restored.fixtures.length === 56 && restored.fixtures.every((f) => !f.played);
const relegatedBudget = restored.transfer.budget[restored.userId];
const historyOk = restored.seasonHistory.length === 1 && restored.seasonHistory[0].relegated.indexOf('Ashford Rovers') >= 0;
restored.fixtures.forEach((f) => { f.played = true; f.hg = f.homeId === restored.userId ? 3 : f.awayId === restored.userId ? 0 : 1; f.ag = f.awayId === restored.userId ? 3 : f.homeId === restored.userId ? 0 : 0; });
restored.otherLeague.fixtures.forEach((f) => { f.played = true; f.hg = 1; f.ag = 0; });
const promotionOk = FM.startNextSeason(restored) && restored.season === 3 && restored.divisionLevel === 1 && restored.teams.some((t) => t.id === restored.userId) && restored.otherLeague.level === 2;
const promotedBudget = restored.transfer.budget[restored.userId], budgetOk = promotedBudget > relegatedBudget;
const ok = plansOk && phasesOk && interviewsOk && formationOk && pyramidOk && approvalOk && familiarityOk && relegationOk && historyOk && promotionOk && budgetOk;
console.log(JSON.stringify({ tacticalPlanRoundTrip: plansOk, phaseTestsRoundTrip: phasesOk, interviewsRoundTrip: interviewsOk, customFormationRoundTrip: formationOk, pyramidRoundTrip: pyramidOk, boardRoundTrip: approvalOk, tacticalFamiliarityRoundTrip: familiarityOk, changedFamiliarity: changedFamiliarity.score, relegationCareer: relegationOk, promotionCareer: promotionOk, performanceBudgets: budgetOk, relegatedBudget, promotedBudget, seasonHistory: historyOk, customFormation, existingTeams: restored.teams.length, existingFixtures: restored.fixtures.length, otherTeams: restored.otherLeague.teams.length }, null, 2));
if (!ok) process.exitCode = 1;
