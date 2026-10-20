// Controlled experiments for the Workbook. A football season gives a handful of matches, and the clubs that press hard differ from the others in many
// other ways, so a regression on the season's data can only show association. The simulation can do better: it can replay the same match again and again
// with exactly one thing changed. Two methods:
//   experiment: the same matches (same seeds, same opponent) played twice, with a tactic set to a for one and to b for the other. The pairs give the
//               effect of the change, with the matches themselves cancelled out.
//   simulate:   many matches with a tactic set to a random value in a range (a randomised trial). The rows go into a new table, experiment_runs, which
//               the other methods (correlation, ols, mle ...) can then analyse: because the setting was chosen at random, the slope is a causal effect.
// Matches are played on copies of the clubs, so nothing in the saved game changes. They run in short browser turns so the page stays responsive.
(function () {
  const FM = (window.FM = window.FM || {});
  const S = FM.STAT, T = FM.tables, WB = FM.WB;
  const sig = (v, n) => (Number.isFinite(v) ? Number(v.toPrecision(n || 4)) : v);
  const pFmt = (p) => (!Number.isFinite(p) ? '–' : p < 0.0001 ? '< 0.0001' : String(sig(p, 3)));
  const TRANSIENT = new Set(['oppRef', 'ruleCtx', 'phaseCtx', 'extraOv']);
  const clone = (t) => JSON.parse(JSON.stringify(t, (key, value) => (TRANSIENT.has(key) ? undefined : value)));
  const TACTICS = { pressing: 'how hard the team presses', pressBuildUp: 'how hard it presses the opposition build-up', lineHeight: 'how high the defensive line is', tempo: 'tempo', directness: 'how direct the passing is', buildDirect: 'how directly it builds from the back',
    risk: 'risk in possession', finalRisk: 'risk in the final third', shootFreedom: 'freedom to shoot', dribbleFreedom: 'freedom to dribble', counterAttack: 'counter-attacking', counterPress: 'counter-pressing', tackleAggression: 'tackling aggression', offsideTrap: 'offside trap', attackWidth: 'width in attack', defWidth: 'width in defence' };
  WB.TACTICS = TACTICS;
  const ALIASES = { press: 'pressing', press_buildup: 'pressBuildUp', line_height: 'lineHeight', counter_press: 'counterPress', tackle_aggression: 'tackleAggression', shoot_freedom: 'shootFreedom' };
  const tick = () => new Promise((r) => setTimeout(r, 0));

  function pickOpponent(league, spec) {
    if (spec.opponent) { const t = league.teams.find((x) => x.name.toLowerCase() === String(spec.opponent).toLowerCase() || x.name.toLowerCase().indexOf(String(spec.opponent).toLowerCase()) >= 0); if (t && t.id !== league.userId) return t; }
    try { const nx = FM.nextUserFixture && FM.nextUserFixture(league); if (nx) return FM.teamById(league, nx.homeId === league.userId ? nx.awayId : nx.homeId); } catch (e) { /* fine */ }
    return league.teams.find((t) => t.id !== league.userId);
  }

  // One run: the manager's club at home to the opponent, with some tactics overridden, played for the first `minutes` of the match. Returns what happened for your club.
  function play(league, opp, overrides, seed, minutes) {
    const u = clone(FM.teamById(league, league.userId)), o = clone(opp);
    o.phasePos = null; o.rules = [];
    Object.keys(overrides).forEach((k) => { u.tactics[k] = overrides[k]; });
    const match = FM.createMatch(u, o, seed >>> 0);
    match.userId = u.id; match.aiTeams = [o];
    let guard = 0; const dt = 0.25;
    while (match.phase !== 'fulltime' && match.clock < minutes * 60 && guard++ < 60000) {
      if (match.phase === 'halftime') FM.startSecondHalf(match);
      FM.stepMatch(match, dt);
    }
    const s = match.stats[u.id], q = match.stats[o.id], tot = (s.possession + q.possession) || 1;
    const rec = (FM.xrSummary(match) || { recov: [] }).recov, mine = rec.filter((r) => r[0] === 0 && r[4] >= 0), lost = rec.filter((r) => r[0] === 1 && r[4] >= 0);
    return { gf: match.score[u.id], ga: match.score[o.id], shots: s.shots, shots_against: q.shots, xg: s.xg, xga: q.xg, xg_diff: s.xg - q.xg, possession: 100 * s.possession / tot,
      passes: s.passes, pass_acc: s.passes ? 100 * s.passesOk / s.passes : 0, tackles: s.tackles, fouls: s.fouls, turnovers: lost.length, recoveries: mine.length, high_recoveries: mine.filter((r) => r[2] > 0.5).length,
      regain_seconds: mine.length ? mine.reduce((a, r) => a + r[4], 0) / mine.length : null };
  }
  const METRICS = [['gf', 'goals scored'], ['ga', 'goals conceded'], ['xg', 'expected goals created'], ['xga', 'expected goals conceded'], ['xg_diff', 'xg minus xga'], ['shots', 'shots taken'], ['shots_against', 'shots faced'], ['possession', 'share of the ball in %'],
    ['pass_acc', 'pass completion in %'], ['turnovers', 'times your club lost the ball to the opposition'], ['recoveries', 'times your club won the ball back'], ['high_recoveries', 'times it won the ball back in the opposition half'], ['fouls', 'fouls committed']];

  function parseSpec(league, spec) {
    const key = ALIASES[spec.tactic] || spec.tactic;
    if (!TACTICS[key]) return { error: 'Unknown tactic "' + spec.tactic + '". You can change: ' + Object.keys(TACTICS).join(', ') + '.' };
    const num = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.min(1.3, Number(v))) : null);
    return { key, minutes: Math.max(10, Math.min(90, Math.round(spec.minutes || 30))), opp: pickOpponent(league, spec), num };
  }

  async function experiment(league, spec, progress) {
    const P = parseSpec(league, spec); if (P.error) return { ok: false, error: P.error };
    const a = P.num(spec.a), b = P.num(spec.b); if (a == null || b == null || a === b) return { ok: false, error: 'Give two different settings, a and b (each from 0 to 1).' };
    const n = Math.max(4, Math.min(24, Math.round(spec.matches || 10))), base = (league.seed * 31 + (spec.seed || 5)) >>> 0, A = [], B = [];
    for (let i = 0; i < n; i++) {
      const seed = (base + i * 7919) >>> 0;
      if (progress && progress(i * 2, n * 2, 'Match ' + (i + 1) + ' of ' + n + ': ' + P.key + ' = ' + a) === false) return { ok: false, error: 'Stopped.' };
      await tick(); A.push(play(league, P.opp, { [P.key]: a }, seed, P.minutes));
      if (progress && progress(i * 2 + 1, n * 2, 'Match ' + (i + 1) + ' of ' + n + ': ' + P.key + ' = ' + b) === false) return { ok: false, error: 'Stopped.' };
      await tick(); B.push(play(league, P.opp, { [P.key]: b }, seed, P.minutes));
    }
    const rows = [], out = { ok: true, method: 'experiment', title: 'Controlled experiment: ' + P.key + ' ' + a + ' against ' + b + ' (' + n + ' matched replays vs ' + P.opp.name + ', first ' + P.minutes + ' minutes)', n, summary: [], tables: [], caveats: [], spec };
    METRICS.forEach(([k, d]) => {
      const x = A.map((r) => r[k]), y = B.map((r) => r[k]); if (x.some((v) => v == null) || y.some((v) => v == null)) return;
      const diff = y.map((v, i) => v - x[i]), t = S.tOne(diff, 0), ci = S.tInv(0.975, n - 1) * t.se;
      rows.push({ k, d, ma: S.mean(x), mb: S.mean(y), diff: t.mean, lo: t.mean - ci, hi: t.mean + ci, p: t.p, dz: S.sd(diff, true) > 0 ? t.mean / S.sd(diff, true) : NaN });
    });
    out.tables.push({ title: 'Effect of setting ' + P.key + ' to ' + b + ' instead of ' + a + ' (paired differences, per ' + P.minutes + ' minutes)', cols: ['Measure', 'At ' + a, 'At ' + b, 'Difference (b − a)', '95% interval', 'p-value'], rows: rows.map((r) => [r.k + ' (' + r.d + ')', sig(r.ma), sig(r.mb), sig(r.diff), sig(r.lo) + ' to ' + sig(r.hi), pFmt(r.p)]) });
    const lead = rows.filter((r) => Number.isFinite(r.p) && ['turnovers', 'recoveries', 'high_recoveries', 'xg', 'xga', 'xg_diff', 'gf', 'ga'].indexOf(r.k) >= 0).sort((x, y) => x.p - y.p)[0];
    if (lead) out.summary.push('Moving ' + P.key + ' from ' + a + ' to ' + b + ' changed ' + lead.k + ' by ' + sig(lead.diff) + ' per ' + P.minutes + ' minutes (95% interval ' + sig(lead.lo) + ' to ' + sig(lead.hi) + ', p ' + (lead.p < 0.0001 ? '< 0.0001' : '= ' + pFmt(lead.p)) + '). The same matches were played both ways, so this is the effect of the change itself and nothing else.');
    out.chart = { type: 'bars2', x: 'measure', y: 'mean per ' + P.minutes + ' min', labels: rows.filter((r) => ['xg', 'xga', 'turnovers', 'recoveries', 'high_recoveries'].indexOf(r.k) >= 0).map((r) => r.k), a: { name: P.key + ' = ' + a, values: rows.filter((r) => ['xg', 'xga', 'turnovers', 'recoveries', 'high_recoveries'].indexOf(r.k) >= 0).map((r) => sig(r.ma)) }, b: { name: P.key + ' = ' + b, values: rows.filter((r) => ['xg', 'xga', 'turnovers', 'recoveries', 'high_recoveries'].indexOf(r.k) >= 0).map((r) => sig(r.mb)) } };
    out.caveats.push('This is the effect against one opponent, in the simulation, over ' + P.minutes + ' minutes. A different opponent or a full match could behave differently.');
    out.caveats.push('With ' + n + ' pairs, small effects may not show up: a non-significant result is not proof of no effect.');
    return out;
  }

  async function simulate(league, spec, progress) {
    const P = parseSpec(league, spec); if (P.error) return { ok: false, error: P.error };
    const lo = P.num(spec.lo), hi = P.num(spec.hi); if (lo == null || hi == null || hi <= lo) return { ok: false, error: 'Give a range, lo to hi (each from 0 to 1, with lo below hi).' };
    const n = Math.max(6, Math.min(40, Math.round(spec.matches || 16))), base = (league.seed * 17 + (spec.seed || 3)) >>> 0, rows = [];
    let r = base || 1; const rand = () => { r = (Math.imul(r, 1664525) + 1013904223) >>> 0; return r / 4294967296; };
    for (let i = 0; i < n; i++) {
      const setting = Math.round((lo + rand() * (hi - lo)) * 1000) / 1000;
      if (progress && progress(i, n, 'Match ' + (i + 1) + ' of ' + n + ': ' + P.key + ' = ' + setting) === false) return { ok: false, error: 'Stopped.' };
      await tick();
      const m = play(league, P.opp, { [P.key]: setting }, (base + i * 104729) >>> 0, P.minutes);
      const row = { run: i + 1, opponent: P.opp.name }; row[P.key] = setting; METRICS.forEach(([k]) => { row[k] = m[k] == null ? null : Math.round(m[k] * 1000) / 1000; }); rows.push(row);
    }
    const cols = [T.num('run', 'run number'), T.cat('opponent', 'the opponent played'), T.num(P.key, 'the setting of ' + TACTICS[P.key] + ' for this run, chosen at random'), ...METRICS.map(([k, d]) => T.num(k, d))];
    T.register('experiment_runs', 'Simulated matches played with ' + TACTICS[P.key] + ' set at random between ' + lo + ' and ' + hi + ' (first ' + P.minutes + ' minutes against ' + P.opp.name + ').', cols, rows);
    const out = { ok: true, method: 'simulate', title: 'Simulated trial: ' + n + ' matches with ' + P.key + ' set at random between ' + lo + ' and ' + hi, n, summary: [], tables: [], caveats: [], spec };
    out.tables.push({ title: 'First rows of the new table experiment_runs', cols: ['run', P.key, 'xg', 'xga', 'turnovers', 'recoveries', 'gf', 'ga'], rows: rows.slice(0, 8).map((x) => [x.run, x[P.key], x.xg, x.xga, x.turnovers, x.recoveries, x.gf, x.ga]) });
    out.summary.push('Played ' + n + ' matches against ' + P.opp.name + ' with ' + P.key + ' chosen at random between ' + lo + ' and ' + hi + '. The results are now in a table called experiment_runs. Because the setting was chosen at random, a correlation or regression of any outcome on ' + P.key + ' in that table shows the effect of the setting itself.');
    return out;
  }

  WB.extraAsync = { experiment, simulate };
  WB.METHODS = WB.METHODS.concat(['experiment', 'simulate']);
  // Runs any method; the experiments take a while and report progress.
  WB.runAsync = async function (league, spec, progress) {
    try {
      if (spec && WB.extraAsync[spec.method]) { const r = await WB.extraAsync[spec.method](league, spec, progress); r.spec = spec; return r; }
      return WB.run(league, spec);
    } catch (e) { return { ok: false, error: 'That analysis could not be run: ' + (e && e.message ? e.message : e) }; }
  };
  WB.METHOD_HELP.push('{"method":"simulate","tactic":KEY,"lo":0-1,"hi":0-1,"matches":6-40?,"minutes":10-90?,"opponent":CLUB?}  randomised trial: matches played with the tactic set at random in a range; the rows go in the table experiment_runs, which later analyses can use. Because the setting was random, a slope there is a causal effect');
  WB.METHOD_HELP.push('{"method":"experiment","tactic":KEY,"a":0-1,"b":0-1,"matches":4-24?,"minutes":10-90?,"opponent":CLUB?}  the same matches played with the tactic at a and at b; paired differences in goals, xg, turnovers, recoveries and more. Tactics you can change: ' + Object.keys(TACTICS).join(', '));
})();
