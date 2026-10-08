'use strict';

// Deterministic match-engine balance check. It runs the browser engine in a
// tiny Node sandbox so gameplay changes can be tested across hundreds of
// complete matches without clicking through the UI.
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
const runs = Math.max(1, Number(process.argv[2]) || 20);
const totals = { goals: 0, shots: 0, xg: 0, passes: 0, earlyShots: 0, maxGoals: 0, strikerGoals: 0, deepPassGap: 0, deepPassGapCount: 0, unpressuredDeepHold: 0, unpressuredDeepHoldSq: 0, unpressuredDeepHoldCount: 0, progressivePasses: 0, carrierSamples: 0, defendersWithin8: 0, crowdedCarrierSamples: 0, maxDefendersWithin8: 0 };
const scores = [];
const shotsByGroup = {}, xgByGroup = {}, goalsByGroup = {};

for (let seed = 1; seed <= runs; seed++) {
  const home = FM.createTeam({ id: `h${seed}`, name: 'Home', kit: {}, attackDir: 1, formation: seed % 2 ? '4-3-3' : '4-2-2-2', strength: 0, seed: 10000 + seed });
  const away = FM.createTeam({ id: `a${seed}`, name: 'Away', kit: {}, attackDir: -1, formation: seed % 2 ? '4-2-2-2' : '4-3-3', strength: 0, seed: 20000 + seed });
  const match = FM.createMatch(home, away, 30000 + seed);
  let nextShapeSample = 0;
  while (match.phase !== 'fulltime') {
    if (match.phase === 'halftime') FM.startSecondHalf(match);
    FM.stepMatch(match, 0.25);
    if (match.clock >= nextShapeSample) {
      nextShapeSample += 1;
      if (match.carrier) {
        const { team, player } = match.carrier;
        const opponents = team === home ? away.players : home.players;
        const nearby = opponents.filter((opponent) => opponent.group !== 'GK' && Math.hypot(opponent.x - player.x, opponent.y - player.y) <= 8).length;
        totals.carrierSamples++; totals.defendersWithin8 += nearby;
        if (nearby >= 4) totals.crowdedCarrierSamples++;
        totals.maxDefendersWithin8 = Math.max(totals.maxDefendersWithin8, nearby);
      }
    }
  }
  const hs = match.stats[home.id], as = match.stats[away.id];
  const goals = hs.goals + as.goals;
  totals.goals += goals; totals.shots += hs.shots + as.shots; totals.xg += hs.xg + as.xg;
  totals.passes += hs.passes + as.passes; totals.maxGoals = Math.max(totals.maxGoals, goals);
  totals.earlyShots += match.events.filter((event) => event.type === 'shot' && event.t <= 120).length;
  const passEvents = match.events.filter((event) => event.type === 'pass');
  passEvents.forEach((event, index) => {
    const team = event.team === home.id ? home : away;
    const depth = team.attackDir === 1 ? event.x / FM.PITCH.L : (FM.PITCH.L - event.x) / FM.PITCH.L;
    const next = passEvents[index + 1];
    if ((event.tx - event.x) * team.attackDir > 5) totals.progressivePasses++;
    if (event.receivedDepth < .38 && !event.forced && event.minCarrierPressure >= 5.5 && event.plannedHold > 4) {
      totals.unpressuredDeepHold += event.held || 0;
      totals.unpressuredDeepHoldSq += (event.held || 0) * (event.held || 0);
      totals.unpressuredDeepHoldCount++;
    }
    if (depth < .38 && event.ok && next && next.team === event.team && next.t > event.t && next.t - event.t < 20) {
      totals.deepPassGap += next.t - event.t;
      totals.deepPassGapCount++;
    }
  });
  match.events.filter((event) => event.type === 'shot').forEach((event) => {
    const team = event.team === home.id ? home : away;
    const group = (team.players.find((player) => player.number === event.player) || {}).group || 'unknown';
    shotsByGroup[group] = (shotsByGroup[group] || 0) + 1;
    xgByGroup[group] = (xgByGroup[group] || 0) + (event.xg || 0);
    if (event.outcome === 'goal') goalsByGroup[group] = (goalsByGroup[group] || 0) + 1;
  });
  totals.strikerGoals += match.events.filter((event) => {
    if (event.type !== 'goal') return false;
    const scoringTeam = event.team === home.id ? home : away;
    return scoringTeam.players.some((player) => player.number === event.player && player.group === 'ST');
  }).length;
  scores.push(`${hs.goals}-${as.goals}`);
}

const avg = (value) => (value / runs).toFixed(2);
const deepHoldMean = totals.unpressuredDeepHoldCount ? totals.unpressuredDeepHold / totals.unpressuredDeepHoldCount : 0;
const deepHoldVariance = totals.unpressuredDeepHoldCount ? Math.max(0, totals.unpressuredDeepHoldSq / totals.unpressuredDeepHoldCount - deepHoldMean * deepHoldMean) : 0;
const report = {
  matches: runs,
  goalsPerMatch: avg(totals.goals),
  shotsPerMatch: avg(totals.shots),
  xgPerMatch: avg(totals.xg),
  passesPerMatch: avg(totals.passes),
  averageSecondsBetweenDeepBuildUpPasses: totals.deepPassGapCount ? (totals.deepPassGap / totals.deepPassGapCount).toFixed(2) : '0.00',
  averageUnpressuredDeepHoldSeconds: totals.unpressuredDeepHoldCount ? (totals.unpressuredDeepHold / totals.unpressuredDeepHoldCount).toFixed(2) : '0.00',
  unpressuredDeepHoldStdDev: Math.sqrt(deepHoldVariance).toFixed(2),
  progressivePassShare: totals.passes ? (totals.progressivePasses / totals.passes).toFixed(3) : '0.000',
  averageDefendersWithin8mOfCarrier: totals.carrierSamples ? (totals.defendersWithin8 / totals.carrierSamples).toFixed(2) : '0.00',
  shareOfCarrierTimeSurroundedBy4Plus: totals.carrierSamples ? (totals.crowdedCarrierSamples / totals.carrierSamples).toFixed(3) : '0.000',
  maximumDefendersWithin8mOfCarrier: totals.maxDefendersWithin8,
  shotsInFirstTwoMinutesPerMatch: avg(totals.earlyShots),
  strikerShareOfGoals: totals.goals ? (totals.strikerGoals / totals.goals).toFixed(3) : '0.000',
  maximumCombinedGoals: totals.maxGoals,
  shotsByGroup,
  xgByGroup: Object.fromEntries(Object.entries(xgByGroup).map(([group, xg]) => [group, Number(xg.toFixed(2))])),
  goalsByGroup,
  sampleScores: scores.slice(0, 20),
};
console.log(JSON.stringify(report, null, 2));

if (runs >= 20) {
  const failures = [];
  const goals = totals.goals / runs, shots = totals.shots / runs, early = totals.earlyShots / runs;
  const strikerShare = totals.goals ? totals.strikerGoals / totals.goals : 0;
  if (goals < .8 || goals > 4.2) failures.push(`goals per match out of range: ${goals.toFixed(2)}`);
  if (shots < 6 || shots > 24) failures.push(`shots per match out of range: ${shots.toFixed(2)}`);
  if (early > .75) failures.push(`too many shots in the opening two minutes: ${early.toFixed(2)}`);
  if (strikerShare > .78) failures.push(`strikers score too high a share: ${strikerShare.toFixed(3)}`);
  if (totals.maxGoals > 9) failures.push(`implausible combined score: ${totals.maxGoals}`);
  if (totals.carrierSamples && totals.crowdedCarrierSamples / totals.carrierSamples > .04) failures.push(`defensive shape collapses around the carrier too often: ${(totals.crowdedCarrierSamples / totals.carrierSamples).toFixed(3)}`);
  if (failures.length) {
    console.error(`Balance check failed:\n- ${failures.join('\n- ')}`);
    process.exitCode = 1;
  }
}
