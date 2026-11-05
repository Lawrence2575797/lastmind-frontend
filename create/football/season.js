// Analysis across the season. One match is mostly noise: a team can create more chances and still lose. This section puts every match with a
// record together and asks, for each measure, how big the effect is, how sure we can be (a confidence interval and a p-value from a t-test on the
// match-by-match figures), and whether it is a pattern or just the luck of the games so far. All of it is worked out by code from the match logs.
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f2 = (v) => (Math.round(v * 100) / 100).toFixed(2), sg = (v, d) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(d == null ? 2 : d);
  const pfmt = (p) => (p < 0.001 ? '< 0.001' : p.toFixed(3));

  // one row per match: the figures each test is run on
  function perMatch(lg, fxs) {
    return fxs.map((fx) => {
      const c = FM.explorer.makeCtx(lg, fx, 'us'), xf = c.shots.reduce((a, s) => a + s.xg, 0), xa = c.against.reduce((a, s) => a + s.xg, 0);
      const gf = c.shots.filter((s) => s.outcome === 'goal').length, ga = c.against.filter((s) => s.outcome === 'goal').length;
      const ok = c.passes.filter((p) => p.res === 1).length, n = c.passes.length, exp = c.passes.reduce((a, p) => a + p.p, 0);
      const won = c.tackles.filter((t) => t.ok).length, d = c.tackles.length;
      return { fx, opp: c.opp.name, xf, xa, gf, ga, xgd: xf - xa, fin: gf - xf, con: xa - ga, pass: n ? 100 * (ok - exp) / n : null, duel: d ? 100 * (won / d) - 50 : null, shots: c.shots.length, pts: gf > ga ? 3 : gf === ga ? 1 : 0 };
    });
  }
  const TESTS = [
    { k: 'xgd', name: 'Chances created minus chances conceded', unit: 'xG a match', good: 'We have created more good chances than we have given up.', bad: 'We have given up more good chances than we have created.', zero: 'No clear edge either way.' },
    { k: 'fin', name: 'Goals scored against the chances created', unit: 'goals a match', good: 'We have scored more than the chances deserved. Check whether it is the same finishers each time before trusting it.', bad: 'We have scored fewer than the chances deserved: either bad luck, or shots taken from poor angles.', zero: 'Our goals are about what the chances deserved.' },
    { k: 'con', name: 'Goals conceded against the chances given up', unit: 'goals a match', good: 'We have conceded fewer than the chances deserved (a good goalkeeper, or luck).', bad: 'We have conceded more than the chances deserved (a weak goalkeeper, or bad luck).', zero: 'Our goals conceded are about what the chances deserved.' },
    { k: 'pass', name: 'Pass completion against what the lanes allowed', unit: 'points', good: 'Our passing is better than the pressure and lanes would predict.', bad: 'We are losing the ball in passes that should have been completed: look at the technique and the choice of pass.', zero: 'Our passing is about as good as the situations allow.' },
    { k: 'duel', name: 'Duels won, against an even split', unit: 'points', good: 'We win more than half of our duels.', bad: 'We lose more than half of our duels.', zero: 'About half of the duels are won.' },
  ];
  function tests(rows) {
    const S = FM.STAT, out = TESTS.map((t) => {
      const v = rows.map((r) => r[t.k]).filter((x) => x != null && Number.isFinite(x)), n = v.length;
      if (n < 3) return Object.assign({ n }, t, { ok: false });
      const r = S.tOne(v, 0), ci = S.meanCI(v, 0.95);
      return Object.assign({ n, mean: r.mean, p: r.p, lo: ci.lo, hi: ci.hi, ok: true, sd: S.sd(v, true) }, t);
    });
    const ps = out.filter((o) => o.ok).map((o) => o.p), adj = ps.length ? S.holm(ps) : []; let i = 0; out.forEach((o) => { if (o.ok) o.padj = adj[i++]; });
    out.forEach((o) => {
      if (!o.ok) { o.verdict = 'wait'; o.say = 'Too few matches (' + o.n + ') to say anything: at least 3 are needed, and more than 8 for a small effect.'; return; }
      o.verdict = o.padj < 0.05 ? 'sig' : o.p < 0.1 ? 'maybe' : 'noise';
      const dir = o.mean > 0 ? o.good : o.mean < 0 ? o.bad : o.zero;
      o.say = o.verdict === 'sig' ? dir + ' Over ' + o.n + ' matches this is too big to be luck.' : o.verdict === 'maybe' ? dir + ' It points that way, but ' + o.n + ' matches is not enough to be sure: wait for more before changing anything.' : 'Nothing separates this from the luck of the games so far. ' + o.zero;
    });
    return out;
  }
  // how many more matches it would take for an effect this size to be clear
  const moreNeeded = (o) => { if (!o.ok || o.verdict === 'sig' || !o.mean || !o.sd) return null; const S = FM.STAT, need = Math.ceil(Math.pow((S.normInv(0.975) + S.normInv(0.8)) * o.sd / Math.abs(o.mean), 2)); return Math.max(0, need - o.n); };

  FM.seasonAnalysis = function (lg, opt) {
    opt = opt || {}; const fxs = FM.explorer.playedWithLogs(lg).filter((f) => !f.preseason && !f.friendly);
    if (!fxs.length) return '<div class="ex-sec"><h4>Across the season</h4><p class="note">Once matches with a record have been played, this section puts them together and says which patterns are real and which are just the luck of single games.</p></div>';
    const rows = perMatch(lg, fxs), T = tests(rows), n = rows.length;
    FM.explorer.ensureCss();
    const pts = rows.reduce((a, r) => a + r.pts, 0), mean = (k) => rows.reduce((a, r) => a + r[k], 0) / n;
    const kp = FM.explorer.kpis([['Matches analysed', n, 'league and cup, with a record'], ['Points a match', (pts / n).toFixed(2), pts + ' in all'], ['xG for', mean('xf').toFixed(2), 'a match, ' + mean('xa').toFixed(2) + ' against'], ['Goals for', f2(mean('gf')), 'a match, ' + f2(mean('ga')) + ' against']]);
    const tbl = FM.explorer.table(['Measure', 'Average', '95% interval', 'p-value', 'Adjusted p', 'What it says'], T.map((o) => {
      const more = moreNeeded(o);
      return [esc(o.name) + '<br><small>' + esc(o.unit) + '</small>', o.ok ? sg(o.mean) : '–', o.ok ? sg(o.lo) + ' to ' + sg(o.hi) : '–', o.ok ? pfmt(o.p) : '–', o.ok ? pfmt(o.padj) : '–', '<span class="se-v ' + o.verdict + '">' + { sig: 'Real pattern', maybe: 'Possible', noise: 'Could be luck', wait: 'Too early' }[o.verdict] + '</span> ' + esc(o.say) + (more ? ' About ' + more + ' more match' + (more === 1 ? '' : 'es') + ' would settle it if it holds.' : '')];
    }), 'se-table');
    // the running picture: the average chance difference after each match, with its 95% interval narrowing as matches add up
    let chart = '';
    if (FM.charts && n >= 4) {
      const S = FM.STAT, run = [], lo = [], hi = [];
      for (let i = 3; i <= n; i++) { const v = rows.slice(0, i).map((r) => r.xgd), c = S.meanCI(v, 0.95); run.push([i, c.mean]); lo.push([i, c.lo]); hi.push([i, c.hi]); }
      chart = FM.charts.lines([{ label: 'Average chances created minus conceded', pts: run, cls: 'gold' }, { label: '95% interval', pts: hi, cls: 'blue', dash: true }, { label: 'Lower limit', pts: lo, cls: 'blue', dash: true }, { label: 'No edge', pts: [[3, 0], [n, 0]], cls: 'warn', dash: true }], { h: 280, xl: 'Matches played', yl: 'xG a match', x0: 3, x1: Math.max(4, n) });
    }
    let cf = 0, ca = 0, cg = 0, cx = 0;
    const gx = FM.charts && n >= 2 ? FM.charts.lines([{ label: 'Goals scored', pts: rows.map((r, i) => [i + 1, (cg += r.gf)]), cls: 'gold' }, { label: 'xG created', pts: rows.map((r, i) => [i + 1, (cx += r.xf)]), cls: 'blue', dash: true }, { label: 'Goals conceded', pts: rows.map((r, i) => [i + 1, (ca += r.ga)]), cls: 'warn' }, { label: 'xG conceded', pts: rows.map((r, i) => [i + 1, (cf += r.xa)]), cls: 'good', dash: true }], { h: 280, xl: 'Matches played', yl: 'Running total', x0: 1, x1: Math.max(2, n), y0: 0 }) : '';
    // has it changed? the first half of the matches against the second
    let drift = '';
    if (n >= 8) { const h = Math.floor(n / 2), a = rows.slice(0, h).map((r) => r.xgd), b = rows.slice(h).map((r) => r.xgd), w = FM.STAT.tWelch(b, a); drift = '<p class="ex-note">First ' + h + ' matches: ' + sg(FM.STAT.mean(a)) + ' xG a match. Since then: ' + sg(FM.STAT.mean(b)) + '. ' + (w.p < 0.05 ? 'That change is bigger than luck would usually give (p = ' + pfmt(w.p) + ').' : 'That change is within what luck would give (p = ' + pfmt(w.p) + ').') + '</p>'; }
    const rec = rows.slice(-8).reverse().map((r) => [esc(r.opp), r.gf + '-' + r.ga, f2(r.xf), f2(r.xa), sg(r.xgd)]);
    const how = '<p class="ex-note">Each match gives one figure per measure. The test asks whether the average of those figures is really different from zero, or only looks it because of the luck of a few games. The interval is where the true average probably lies; the adjusted p-value allows for running several tests at once.</p>';
    if (opt.compact) return '<div class="card ex-sec se-card"><h4>Across the season: ' + n + ' match' + (n === 1 ? '' : 'es') + '</h4>' + kp + tbl + (chart ? '<div class="ex-fig">' + chart + '</div>' : '') + how + '</div>';
    const E = FM.explorer;
    return kp + E.section('What is real and what is luck', tbl + how) + (chart ? E.section('The evidence as matches add up', '<div class="ex-fig">' + chart + '</div>' + drift) : '') + (gx ? E.section('Goals against chances, running', '<div class="ex-fig">' + gx + '</div>') : '') + E.section('Latest matches', E.table(['Opponent', 'Score', 'xG for', 'xG against', 'Difference'], rec));
  };
  FM.seasonAnalysis.css = '.se-table td:last-child { text-align: left; min-width: 260px; font-size: .84rem; line-height: 1.45; } .se-v { display: inline-block; padding: 1px 8px; margin-right: 4px; font: 700 .68rem var(--sans); letter-spacing: .06em; text-transform: uppercase; border: 1px solid var(--line); } .se-v.sig { color: #7fe3a6; border-color: #7fe3a6; } .se-v.maybe { color: #f2c14e; border-color: #f2c14e; } .se-v.noise { color: #9fb0a8; } .se-v.wait { color: #9fb0a8; border-style: dashed; } .se-card { display: grid; gap: 12px; padding: 16px 18px; margin-top: 14px; }';
  if (!document.getElementById('seCss')) { const st = document.createElement('style'); st.id = 'seCss'; st.textContent = FM.seasonAnalysis.css; document.head.appendChild(st); }
  FM.explorer.add({ id: 'season', group: 'Season', title: 'What is real and what is luck', tags: 'season significance p value confidence interval t test sample size noise luck pattern trend sustainable results', blurb: 'Every match put together: which patterns are statistically real, and which are just the luck of single games.', needs: 'season', render() { return FM.seasonAnalysis(FM.curLeague); } });
})();
