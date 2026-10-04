// Hypotheses. You can write down as many as you like, or adopt ones the game proposes from what it sees in the data. Each is
// tested after your next match, using everything known by then, with the method that fits your statistics level:
// at GCSE, a plain comparison of averages; at A-level, a binomial or correlation test; at the top level, a t-test with an
// effect size and interval. Every test with a p-value also goes into the log that the "many tests" panel corrects.
(function () {
  const FM = (window.FM = window.FM || {});
  const S = FM.STAT;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const f2 = (v, d) => (typeof v === 'number' && isFinite(v) ? v.toFixed(d == null ? 2 : d) : 'n/a');
  const fin = (v) => typeof v === 'number' && isFinite(v);
  const pf = (p) => (!fin(p) ? 'n/a' : p < 0.0001 ? '< 0.0001' : p.toFixed(4));
  const RANK = { gcse: 1, alevel: 2, above: 3 };

  const TACTICS = { pressing: 'pressing', lineHeight: 'a high defensive line', tempo: 'a fast tempo', directness: 'direct passing', risk: 'risk in possession', shootFreedom: 'shooting on sight' };
  const NEXT = {
    win: ['win', (a, b, f, me) => (me === f.homeId ? f.hg > f.ag : f.ag > f.hg)],
    moreShots: ['have more shots than the opposition', (a, b) => a.shots > b.shots],
    morePoss: ['have more than half the possession', (a, b) => a.possession > b.possession],
    moreXg: ['create more xG than the opposition', (a, b) => a.xg > b.xg],
    score2: ['score two or more goals', (a, b, f, me) => (me === f.homeId ? f.hg : f.ag) >= 2],
    clean: ['keep a clean sheet', (a, b, f, me) => (me === f.homeId ? f.ag : f.hg) === 0],
  };
  FM.HYP_NEXT = NEXT; FM.HYP_TACTICS = TACTICS;
  const metricName = (k) => (FM.STAT_VAR_INFO[k] ? FM.STAT_VAR_INFO[k].label.toLowerCase() : k);

  FM.hypothesisLabel = function (league, h) {
    const p = h.params;
    if (h.kind === 'rate') {
      const who = p.team === 'me' ? 'Our' : FM.teamById(league, p.team).name + "'s";
      return `${who} rate of "${FM.RATES[p.rate][0].toLowerCase()}" is ${p.dir === 'greater' ? 'higher' : 'lower'} than the rest of the league's`;
    }
    if (h.kind === 'corr') return `More ${metricName(p.x)} goes with ${p.dir === 'positive' ? 'more' : 'less'} ${metricName(p.y)}, across matches`;
    if (h.kind === 'tactic') return `A higher setting for ${TACTICS[p.tactic]} goes with ${p.dir === 'higher' ? 'higher' : 'lower'} ${metricName(p.metric)}, across clubs and matches`;
    if (h.kind === 'next') return `In the next match we will ${NEXT[p.what][0]}`;
    return 'Hypothesis';
  };
  const same = (a, b) => a.kind === b.kind && JSON.stringify(a.params) === JSON.stringify(b.params);

  FM.addHypothesis = function (league, spec) {
    const next = FM.nextUserFixture(league);
    if (!next) return null;
    league.hypotheses = league.hypotheses || [];
    const seq = league.hypotheses.reduce((m, x) => Math.max(m, +String(x.id).slice(1) || 0), 0) + 1;
    const h = { id: 'H' + seq, kind: spec.kind, params: spec.params, note: spec.note || '', source: spec.source || 'you', created: league.day, afterFxId: next.id, status: 'pending', result: null };
    h.label = FM.hypothesisLabel(league, h);
    league.hypotheses.push(h);
    FM.saveLeague(league);
    return h;
  };

  // ---------- testing ----------
  const totals = (rows, key) => rows.reduce((a, r) => a + (r[key] || 0), 0);
  function runRate(league, h) {
    const t = h.params.team === 'me' ? league.userId : h.params.team, R = FM.RATES[h.params.rate], rows = FM.statRows(league, 'all');
    const mine = rows.filter((r) => r.teamId === t), others = rows.filter((r) => r.teamId !== t);
    const n = totals(mine, R[1]), k = totals(mine, R[2]), n0 = totals(others, R[1]), k0 = totals(others, R[2]);
    if (n < 10 || n0 < 10) return { decision: 'inconclusive', lines: ['There are not enough attempts yet to say anything.'], n };
    const p0 = k0 / n0, rate = k / n, tier = RANK[league.tier] || 1, greater = h.params.dir === 'greater';
    const lines = [`${k} of ${n} (${f2(100 * rate, 1)}%) against ${f2(100 * p0, 1)}% for the rest of the league, over ${mine.length} matches.`];
    if (tier === 1) {
      const right = greater ? rate > p0 : rate < p0, big = Math.abs(rate - p0) / p0 > 0.2;
      return { decision: right && big ? 'looks supported' : right ? 'weak, within the usual swing' : 'not supported', informal: true, n, lines: lines.concat(['At this level the comparison is by eye: the gap is ' + (right ? 'in the direction you expected' : 'not in the direction you expected') + (right && big ? ' and more than a fifth of the league rate' : '') + '. Only a handful of matches stand behind it, so it could be chance.']) };
    }
    const p = FM.binomTest(k, n, p0, h.params.dir);
    lines.push(`Binomial test of H0: p = ${f2(p0, 3)}: p-value ${pf(p)}.`);
    if (tier === 3) { const w = S.wilson(k, n, 0.95); lines.push(`95% interval for their true rate: ${f2(100 * w.lo, 1)}% to ${f2(100 * w.hi, 1)}%.`); }
    return { decision: p < 0.05 ? 'supported' : 'not supported (not enough evidence)', p, n, lines };
  }
  function runCorr(league, h) {
    const rows = FM.statRows(league, 'all'), a = [], b = [];
    rows.forEach((r) => { if (fin(r[h.params.x]) && fin(r[h.params.y])) { a.push(r[h.params.x]); b.push(r[h.params.y]); } });
    const n = a.length, tier = RANK[league.tier] || 1;
    if (n < 8) return { decision: 'inconclusive', lines: ['There are not enough matches yet.'], n };
    const r = S.pmcc(a, b), pos = h.params.dir === 'positive', lines = [`${n} team-matches: correlation r = ${f2(r, 3)}.`];
    if (tier === 1) {
      const right = pos ? r > 0 : r < 0, str = Math.abs(r);
      return { decision: right && str >= 0.4 ? 'looks supported' : right && str >= 0.2 ? 'weak' : 'not supported', informal: true, n, lines: lines.concat(['At this level, judge it from the scatter graph: a correlation of 0.4 or more in the expected direction is a fair sign, under 0.2 is hardly anything.']) };
    }
    const t = S.corrTest(r, n), p1 = (pos ? r > 0 : r < 0) ? t.p / 2 : 1 - t.p / 2;
    lines.push(`One-tailed test of H0: no correlation: p-value ${pf(p1)}.`);
    return { decision: p1 < 0.05 ? 'supported' : 'not supported (not enough evidence)', p: p1, n, lines };
  }
  function runTactic(league, h) {
    const rows = FM.statRows(league, 'all').filter((r) => r.tactics && fin(r.tactics[h.params.tactic]) && fin(r[h.params.metric]));
    const n = rows.length, tier = RANK[league.tier] || 1, hi = h.params.dir === 'higher';
    if (n < 10) return { decision: 'inconclusive', lines: ['There are not enough matches yet.'], n };
    const tv = rows.map((r) => r.tactics[h.params.tactic]), y = rows.map((r) => r[h.params.metric]), med = S.median(tv);
    const ga = y.filter((_, i) => tv[i] > med), gb = y.filter((_, i) => tv[i] <= med);
    const lines = [`${n} team-matches, split at the middle setting for ${TACTICS[h.params.tactic]}. Higher setting: ${ga.length} matches, mean ${f2(S.mean(ga))}. Lower: ${gb.length} matches, mean ${f2(S.mean(gb))}.`];
    if (ga.length < 3 || gb.length < 3) return { decision: 'inconclusive', lines: lines.concat(['One of the groups is too small.']), n };
    const diff = S.mean(ga) - S.mean(gb), right = hi ? diff > 0 : diff < 0;
    if (tier === 1) {
      const sd = S.sd(y, true), big = Math.abs(diff) > 0.5 * sd;
      return { decision: right && big ? 'looks supported' : right ? 'weak' : 'not supported', informal: true, n, lines: lines.concat([`The gap between the group averages is ${f2(Math.abs(diff))}, ${big ? 'more' : 'less'} than half the typical spread (${f2(sd)}) of the measure, ${right ? 'in the expected direction' : 'not in the expected direction'}.`]) };
    }
    if (tier === 2) {
      const r = S.pmcc(tv, y), t = S.corrTest(r, n), p1 = (hi ? r > 0 : r < 0) ? t.p / 2 : 1 - t.p / 2;
      lines.push(`Correlation between the setting and ${metricName(h.params.metric)}: r = ${f2(r, 3)}; one-tailed p-value ${pf(p1)}.`);
      return { decision: p1 < 0.05 ? 'supported' : 'not supported (not enough evidence)', p: p1, n, lines };
    }
    const w = S.tWelch(ga, gb, hi ? 'greater' : 'less'), tc = S.tInv(0.975, w.df);
    lines.push(`Welch t-test (one-tailed): t = ${f2(w.t, 2)} on ${f2(w.df, 1)} degrees of freedom, p-value ${pf(w.p)}. Cohen's d = ${f2(w.d, 2)}. 95% interval for the difference: ${f2(w.diff - tc * w.se)} to ${f2(w.diff + tc * w.se)}.`);
    lines.push('Clubs choose their own settings, so even a real difference may reflect which kinds of club choose them, not what the setting does.');
    return { decision: w.p < 0.05 ? 'supported' : 'not supported (not enough evidence)', p: w.p, n, lines };
  }
  function runNext(league, h, fx) {
    const me = league.userId, a = FM.statRows(league, 'me').find((r) => r.fxId === fx.id), b = FM.statRows(league, 'opp').find((r) => r.fxId === fx.id);
    if (!a || !b) return { decision: 'inconclusive', lines: ['The match data was not found.'], n: 1 };
    const hit = !!NEXT[h.params.what][1](a, b, fx, me);
    const done = (league.hypotheses || []).filter((x) => x.kind === 'next' && x.status === 'tested' && x.result).concat([{ result: { decision: hit ? 'hit' : 'miss' } }]);
    const hits = done.filter((x) => x.result.decision === 'hit').length;
    return { decision: hit ? 'hit' : 'miss', n: 1, lines: [`${hit ? 'It happened' : 'It did not happen'}: ${fx.hg}-${fx.ag}, shots ${a.shots}-${b.shots}, possession ${f2(a.possession, 0)}%-${f2(b.possession, 0)}%.`, `One match is a sample of one: ${hit ? 'getting it right does not show you understand why' : 'getting it wrong does not show your reasoning was bad'}. Your record on predictions so far: ${hits} of ${done.length}.`] };
  }

  FM.testPendingHypotheses = function (league, fx) {
    (league.hypotheses || []).forEach((h) => {
      if (h.status !== 'pending' || h.afterFxId !== fx.id) return;
      const res = h.kind === 'rate' ? runRate(league, h) : h.kind === 'corr' ? runCorr(league, h) : h.kind === 'tactic' ? runTactic(league, h) : runNext(league, h, fx);
      h.result = res; h.status = 'tested'; h.testedRound = fx.round;
      if (fin(res.p)) {
        league.testLog = league.testLog || [];
        league.testLog.push({ id: 'T' + (league.testLog.length + 1), tool: 'hypothesis', label: h.id + ': ' + h.label, p: res.p, alpha: 0.05, n: res.n, scope: 'all', day: league.day });
      }
    });
  };

  // ---------- proposals ----------
  FM.proposeHypotheses = function (league) {
    const out = [], rows = FM.statRows(league, 'all');
    const have = (spec) => (league.hypotheses || []).some((h) => same(h, spec) && h.status === 'pending');
    const push = (spec, why) => { if (!have(spec) && !out.some((o) => same(o.spec, spec))) out.push({ spec, why }); };
    const next = FM.nextUserFixture(league);
    if (rows.length >= 16) {
      // the strongest-looking link between a few pairs that make football sense
      const cands = [['shots', 'goals'], ['possession', 'goals'], ['passes', 'points'], ['xg', 'points'], ['corners', 'goals'], ['shotsAgainst', 'goalsAgainst'], ['fouls', 'yellows'], ['onTarget', 'goals']];
      let best = null;
      cands.forEach(([x, y]) => { const a = [], b = []; rows.forEach((r) => { if (fin(r[x]) && fin(r[y])) { a.push(r[x]); b.push(r[y]); } }); const r = S.pmcc(a, b); if (fin(r) && (!best || Math.abs(r) > Math.abs(best.r))) best = { x, y, r }; });
      if (best) push({ kind: 'corr', params: { x: best.x, y: best.y, dir: best.r > 0 ? 'positive' : 'negative' } }, `In the data so far these two look related (r = ${f2(best.r, 2)}). Is that a real pattern or a coincidence of a few matches?`);
      // which tactical setting looks most linked to scoring
      let bt = null;
      Object.keys(TACTICS).forEach((k) => { const a = [], b = []; rows.forEach((r) => { if (r.tactics && fin(r.tactics[k])) { a.push(r.tactics[k]); b.push(r.goals); } }); const r = S.pmcc(a, b); if (fin(r) && (!bt || Math.abs(r) > Math.abs(bt.r))) bt = { k, r }; });
      if (bt) push({ kind: 'tactic', params: { tactic: bt.k, metric: 'goals', dir: bt.r > 0 ? 'higher' : 'lower' } }, `Clubs with a higher ${TACTICS[bt.k]} setting have been scoring ${bt.r > 0 ? 'more' : 'fewer'} goals so far (r = ${f2(bt.r, 2)}).`);
      // your own conversion against the league
      const mine = rows.filter((r) => r.teamId === league.userId), others = rows.filter((r) => r.teamId !== league.userId);
      if (totals(mine, 'shots') >= 15) { const r1 = totals(mine, 'goals') / totals(mine, 'shots'), r0 = totals(others, 'goals') / totals(others, 'shots'); push({ kind: 'rate', params: { team: 'me', rate: 'shotsGoals', dir: r1 > r0 ? 'greater' : 'less' } }, `You have scored from ${f2(100 * r1, 1)}% of shots against ${f2(100 * r0, 1)}% for everyone else. Skill, or luck?`); }
      // the next opponent's rate of winning challenges
      if (next) { const oid = next.homeId === league.userId ? next.awayId : next.homeId, om = rows.filter((r) => r.teamId === oid), oo = rows.filter((r) => r.teamId !== oid); if (totals(om, 'tackles') >= 15) { const a = totals(om, 'tacklesWon') / totals(om, 'tackles'), b = totals(oo, 'tacklesWon') / totals(oo, 'tackles'); push({ kind: 'rate', params: { team: oid, rate: 'tackles', dir: a > b ? 'greater' : 'less' } }, `${FM.teamById(league, oid).name} have won ${f2(100 * a, 0)}% of their challenges against ${f2(100 * b, 0)}% for the rest. Is that a real strength?`); } }
    }
    push({ kind: 'next', params: { what: 'moreShots' } }, 'A prediction for the next match. It is settled by one match, so it tells you little about whether your reasoning is sound.');
    push({ kind: 'next', params: { what: 'win' } }, 'The simplest prediction there is.');
    return out.slice(0, 5);
  };

  // ---------- the page ----------
  const bstate = { kind: 'corr' };
  const sel = (id, opts, cur) => `<select id="${id}">${opts.map(([v, t]) => `<option value="${v}"${v === cur ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
  FM.renderHypotheses = function (host, league) {
    league.hypotheses = league.hypotheses || [];
    const next = FM.nextUserFixture(league), tier = RANK[league.tier] || 1;
    const hs = league.hypotheses, pending = hs.filter((h) => h.status === 'pending'), tested = hs.filter((h) => h.status === 'tested').reverse();
    const props = next ? FM.proposeHypotheses(league) : [];
    const vars = FM.STAT_VARS.map((v) => [v[0], v[1]]);
    const opp = league.teams.map((t) => [t.id, t.name]);
    const kinds = [['corr', 'Two measures are related'], ['tactic', 'A tactical setting goes with a result'], ['rate', 'A rate is higher or lower than the league'], ['next', 'A prediction for the next match']];
    const b = bstate;
    b.x = b.x || 'shots'; b.y = b.y || 'goals'; b.cdir = b.cdir || 'positive'; b.tactic = b.tactic || 'pressing'; b.metric = b.metric || 'goals'; b.tdir = b.tdir || 'higher';
    b.team = b.team || 'me'; b.rate = b.rate || 'shotsGoals'; b.rdir = b.rdir || 'greater'; b.what = b.what || 'win';
    let fields = '';
    if (b.kind === 'corr') fields = `<label>More of<select id="hbX">${vars.map(([v, t]) => `<option value="${v}"${v === b.x ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label><label>goes with<select id="hbCdir"><option value="positive"${b.cdir === 'positive' ? ' selected' : ''}>more</option><option value="negative"${b.cdir === 'negative' ? ' selected' : ''}>less</option></select></label><label>of<select id="hbY">${vars.map(([v, t]) => `<option value="${v}"${v === b.y ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
    else if (b.kind === 'tactic') fields = `<label>A higher setting for<select id="hbTac">${Object.keys(TACTICS).map((k) => `<option value="${k}"${k === b.tactic ? ' selected' : ''}>${esc(TACTICS[k])}</option>`).join('')}</select></label><label>goes with<select id="hbTdir"><option value="higher"${b.tdir === 'higher' ? ' selected' : ''}>higher</option><option value="lower"${b.tdir === 'lower' ? ' selected' : ''}>lower</option></select></label><label>of<select id="hbMet">${vars.map(([v, t]) => `<option value="${v}"${v === b.metric ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
    else if (b.kind === 'rate') fields = `<label>Whose rate<select id="hbTeam"><option value="me"${b.team === 'me' ? ' selected' : ''}>Ours</option>${opp.filter(([id]) => id !== league.userId).map(([id, t]) => `<option value="${id}"${id === b.team ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label><label>Rate<select id="hbRate">${Object.keys(FM.RATES).map((k) => `<option value="${k}"${k === b.rate ? ' selected' : ''}>${esc(FM.RATES[k][0])}</option>`).join('')}</select></label><label>is<select id="hbRdir"><option value="greater"${b.rdir === 'greater' ? ' selected' : ''}>higher than the rest of the league</option><option value="less"${b.rdir === 'less' ? ' selected' : ''}>lower than the rest of the league</option></select></label>`;
    else fields = `<label>In the next match we will<select id="hbWhat">${Object.keys(NEXT).map((k) => `<option value="${k}"${k === b.what ? ' selected' : ''}>${esc(NEXT[k][0])}</option>`).join('')}</select></label>`;
    const spec = () => ({ kind: b.kind, params: b.kind === 'corr' ? { x: b.x, y: b.y, dir: b.cdir } : b.kind === 'tactic' ? { tactic: b.tactic, metric: b.metric, dir: b.tdir } : b.kind === 'rate' ? { team: b.team, rate: b.rate, dir: b.rdir } : { what: b.what } });
    const preview = FM.hypothesisLabel(league, { kind: b.kind, params: spec().params });
    const card = (h, actions) => `<div class="hyp"><div class="hyp-head"><b>${h.id}</b> ${esc(h.label)} <span class="pm">${h.source === 'proposed' ? '(proposed)' : '(yours)'}</span></div>${h.note ? `<p class="note">Your note: ${esc(h.note)}</p>` : ''}${actions || ''}</div>`;
    host.innerHTML = `<div style="display:grid;gap:16px">
      <div class="card"><h2>Hypotheses</h2>
        <p class="desc">A hypothesis is a claim you can check against the data. Write down as many as you like. Each is tested after your next match, using everything known by then. ${tier === 1 ? 'At your level the test is a plain comparison of averages.' : tier === 2 ? 'At your level the tests give p-values from binomial and correlation tests.' : 'At your level the tests give p-values, effect sizes and intervals.'}</p>
        <p class="note">Write the hypothesis before you look at the result. The more you test, the more will pass by chance: see "The problem of many tests" in the Analysis Centre, which collects every test with a p-value.</p>
        ${next ? '' : '<p class="note">The season is over, so there is no next match to test against.</p>'}</div>
      <div class="two">
        <div class="card"><h2>Proposed for you</h2>${props.length ? props.map((p, i) => `<div class="hyp"><div class="hyp-head">${esc(FM.hypothesisLabel(league, { kind: p.spec.kind, params: p.spec.params }))}</div><p class="note">${esc(p.why)}</p><div class="row"><button data-adopt="${i}">Test this after the next match</button></div></div>`).join('') : '<p class="note">Nothing new to propose right now. Proposals appear once there are some matches to look at.</p>'}</div>
        <div class="card"><h2>Write your own</h2>
          <label>What kind<select id="hbKind">${kinds.map(([v, t]) => `<option value="${v}"${v === b.kind ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
          <div class="row">${fields}</div>
          <p class="desc"><b>${esc(preview)}</b></p>
          <label>Why do you think so? (optional, for your own record)<textarea id="hbNote" rows="2"></textarea></label>
          <div class="row"><button class="primary" id="hbAdd"${next ? '' : ' disabled'}>Add to be tested after the next match</button></div></div>
      </div>
      <div class="card"><h2>Waiting for the next match (${pending.length})</h2>${pending.length ? pending.map((h) => card(h, `<div class="row"><button data-cancel="${h.id}">Withdraw</button></div>`)).join('') : '<p class="note">None waiting.</p>'}</div>
      <div class="card"><h2>Tested (${tested.length})</h2>${tested.length ? tested.map((h) => { const r = h.result; return card(h, `<p class="desc"><b>Round ${h.testedRound + 1}: ${esc(r.decision)}</b>${r.informal ? ' (judged by eye)' : ''}${fin(r.p) ? ' (p = ' + pf(r.p) + ')' : ''}</p>${r.lines.map((l) => `<p class="note">${esc(l)}</p>`).join('')}${h.kind !== 'next' && next ? `<div class="row"><button data-retest="${h.id}">Test again after the next match</button></div>` : ''}`); }).join('') : '<p class="note">Nothing tested yet.</p>'}</div></div>`;
    const bind = (id, fn) => { const e = host.querySelector(id); if (e) e.addEventListener('change', fn); };
    const re = () => FM.renderHypotheses(host, league);
    bind('#hbKind', (e) => { b.kind = e.target.value; re(); });
    bind('#hbX', (e) => { b.x = e.target.value; re(); }); bind('#hbY', (e) => { b.y = e.target.value; re(); }); bind('#hbCdir', (e) => { b.cdir = e.target.value; re(); });
    bind('#hbTac', (e) => { b.tactic = e.target.value; re(); }); bind('#hbMet', (e) => { b.metric = e.target.value; re(); }); bind('#hbTdir', (e) => { b.tdir = e.target.value; re(); });
    bind('#hbTeam', (e) => { b.team = e.target.value; re(); }); bind('#hbRate', (e) => { b.rate = e.target.value; re(); }); bind('#hbRdir', (e) => { b.rdir = e.target.value; re(); });
    bind('#hbWhat', (e) => { b.what = e.target.value; re(); });
    const add = host.querySelector('#hbAdd');
    if (add) add.addEventListener('click', () => { if ((b.kind === 'corr' && b.x === b.y)) return; FM.addHypothesis(league, Object.assign(spec(), { note: host.querySelector('#hbNote').value, source: 'you' })); re(); });
    host.querySelectorAll('[data-adopt]').forEach((btn) => btn.addEventListener('click', () => { FM.addHypothesis(league, Object.assign({}, props[+btn.dataset.adopt].spec, { source: 'proposed' })); re(); }));
    host.querySelectorAll('[data-cancel]').forEach((btn) => btn.addEventListener('click', () => { league.hypotheses = league.hypotheses.filter((h) => h.id !== btn.dataset.cancel); FM.saveLeague(league); re(); }));
    host.querySelectorAll('[data-retest]').forEach((btn) => btn.addEventListener('click', () => { const h = hs.find((x) => x.id === btn.dataset.retest); FM.addHypothesis(league, { kind: h.kind, params: h.params, note: h.note, source: h.source }); re(); }));
  };
})();
