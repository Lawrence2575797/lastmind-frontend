// The top level of the statistics workshop: confidence intervals, t-tests, chi-squared, the Poisson distribution, multiple and
// logistic regression, Bayesian updating, power and effect sizes, and the problem of running many tests. These tools sit
// on top of the GCSE and A-level ones and use the same season data.
(function () {
  const FM = (window.FM = window.FM || {});
  const S = FM.STAT, U = FM.STAT_UI;
  if (!S || !U) return;
  const { esc, f2, pfmt, fin, chart, barChart, tickFmt, scatterSvg, st, tool, values, pairs, varSelect, needN, smallN, record, logNote, SCOPES, VAR, totals } = U;
  const RATES = FM.RATES;
  const stars = (p) => (p < 0.001 ? '***' : p < 0.01 ? '**' : p < 0.05 ? '*' : '');
  const median = (a) => S.median(a);
  const all = (c) => FM.statRows(c.league, 'all');

  // a line through points on a chart frame
  const path = (ch, pts, color, w) => `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + ch.xs(p[0]).toFixed(1) + ' ' + ch.ys(p[1]).toFixed(1)).join('')}" fill="none" stroke="${color}" stroke-width="${w || 2.5}"/>`;

  // ---------- confidence intervals ----------
  tool({
    id: 'ci', level: 'above', title: 'Confidence intervals',
    blurb: 'A confidence interval is a range of plausible values for the true figure behind your sample. A 95% interval comes from a method that captures the true value in 95% of repeated samples. More matches make it narrower.',
    draw(box, c) {
      if (!st.ciKind) st.ciKind = 'mean';
      if (!st.ciLevel) st.ciLevel = 0.95;
      const rows = c.rows, lvl = st.ciLevel;
      box.innerHTML = `<div class="row"><label>Interval for<select id="ciKind"><option value="mean"${st.ciKind === 'mean' ? ' selected' : ''}>The mean of a measure</option><option value="rate"${st.ciKind === 'rate' ? ' selected' : ''}>A rate (a proportion)</option></select></label>
        <label>${st.ciKind === 'mean' ? 'Measure' : 'Rate'}${st.ciKind === 'mean' ? varSelect('ciVar', st.x) : `<select id="ciRate">${Object.keys(RATES).map((k) => `<option value="${k}"${k === (st.rate || 'shotsGoals') ? ' selected' : ''}>${RATES[k][0]}</option>`).join('')}</select>`}</label>
        <label>Confidence level<select id="ciLevel">${[0.9, 0.95, 0.99].map((l) => `<option value="${l}"${l === lvl ? ' selected' : ''}>${l * 100}%</option>`).join('')}</select></label></div>`;
      let html = '';
      if (st.ciKind === 'mean') {
        const v = values(rows, st.x), n = v.length;
        if (n < 3) html = needN(n, 3);
        else {
          const ci = S.meanCI(v, lvl), run = [];
          for (let k = 3; k <= n; k++) { const q = S.meanCI(v.slice(0, k), lvl); run.push([k, q.mean, q.lo, q.hi]); }
          const lo = Math.min.apply(null, run.map((r) => r[2])), hi = Math.max.apply(null, run.map((r) => r[3]));
          const ch = chart({ x0: 2, x1: n + 1, y0: lo - (hi - lo) * 0.05, y1: hi + (hi - lo) * 0.05, xlabel: 'Matches included so far', ylabel: VAR[st.x].label, label: 'Interval narrowing as matches are added' });
          let s = ch.s;
          run.forEach((r) => { s += `<line x1="${ch.xs(r[0])}" x2="${ch.xs(r[0])}" y1="${ch.ys(r[2])}" y2="${ch.ys(r[3])}" stroke="#7FD1FF" stroke-width="3" stroke-linecap="round"/><circle cx="${ch.xs(r[0])}" cy="${ch.ys(r[1])}" r="3.5" fill="#F2C14E"/>`; });
          s += ch.close;
          html = `<p class="desc">${n} matches: mean ${f2(ci.mean)}, standard error ${f2(ci.se, 3)} (s/&radic;n). The ${lvl * 100}% confidence interval is mean &plusmn; t &times; SE = ${f2(ci.mean)} &plusmn; ${f2(ci.t, 3)} &times; ${f2(ci.se, 3)}, that is <b>${f2(ci.lo)} to ${f2(ci.hi)}</b> (t has ${ci.df} degrees of freedom).</p>${s}
            <p class="note">Each blue line is the interval using only the first k matches. Early on it is wide, so the estimate could be a long way out; it settles as matches accumulate. The width falls roughly with 1/&radic;n, so four times the data halves it.</p>` + smallN(n);
        }
      } else {
        const R = RATES[st.rate || 'shotsGoals'], n = totals(rows, R[1]), k = totals(rows, R[2]);
        if (n < 5) html = '<p class="note">Too few attempts so far.</p>';
        else {
          const w = S.wilson(k, n, lvl), run = []; let cn = 0, ck = 0;
          rows.forEach((r, i) => { cn += r[R[1]]; ck += r[R[2]]; if (cn >= 5) { const q = S.wilson(ck, cn, lvl); run.push([i + 1, ck / cn, q.lo, q.hi]); } });
          let s = '';
          if (run.length > 1) {
            const hi = Math.max.apply(null, run.map((r) => r[3])), lo = Math.min.apply(null, run.map((r) => r[2]));
            const ch = chart({ x0: 0, x1: rows.length + 1, y0: Math.max(0, lo - 0.03), y1: Math.min(1, hi + 0.03), xlabel: 'Matches included so far', ylabel: R[0], label: 'Rate interval narrowing' });
            s = ch.s;
            run.forEach((r) => { s += `<line x1="${ch.xs(r[0])}" x2="${ch.xs(r[0])}" y1="${ch.ys(r[2])}" y2="${ch.ys(r[3])}" stroke="#7FD1FF" stroke-width="3" stroke-linecap="round"/><circle cx="${ch.xs(r[0])}" cy="${ch.ys(r[1])}" r="3.5" fill="#F2C14E"/>`; });
            s += ch.close;
          }
          html = `<p class="desc">${k} of ${n} (${f2(100 * k / n, 1)}%). The ${lvl * 100}% Wilson interval for the true rate is <b>${f2(100 * w.lo, 1)}% to ${f2(100 * w.hi, 1)}%</b>.</p>${s}
            <p class="note">Wilson's method is used because the simple "p &plusmn; z&radic;(p(1-p)/n)" interval misbehaves when counts are small or the rate is near 0 or 1.</p>`;
        }
      }
      box.insertAdjacentHTML('beforeend', html);
      box.querySelector('#ciKind').addEventListener('change', (e) => { st.ciKind = e.target.value; c.redraw(); });
      box.querySelector('#ciLevel').addEventListener('change', (e) => { st.ciLevel = parseFloat(e.target.value); c.redraw(); });
      const iv = box.querySelector('#ciVar'); if (iv) iv.addEventListener('change', (e) => { st.x = e.target.value; c.redraw(); });
      const ir = box.querySelector('#ciRate'); if (ir) ir.addEventListener('change', (e) => { st.rate = e.target.value; c.redraw(); });
    },
  });

  // ---------- t-tests ----------
  const SPLITS = {
    meopp: ['You compared with your opponents', null],
    homeaway: ['Home compared with away (every match)', (r) => (r.home ? 'a' : 'b')],
    press: ['High press compared with low press (every match)', (r, m) => ((r.tactics && r.tactics.pressing) > m.pressing ? 'a' : 'b')],
    line: ['High defensive line compared with low (every match)', (r, m) => ((r.tactics && r.tactics.lineHeight) > m.lineHeight ? 'a' : 'b')],
    tempo: ['Fast tempo compared with slow (every match)', (r, m) => ((r.tactics && r.tactics.tempo) > m.tempo ? 'a' : 'b')],
    direct: ['Direct compared with patient passing (every match)', (r, m) => ((r.tactics && r.tactics.directness) > m.directness ? 'a' : 'b')],
  };
  const SPLIT_LABELS = { meopp: ['You', 'Opponents'], homeaway: ['Home', 'Away'], press: ['High press', 'Low press'], line: ['High line', 'Low line'], tempo: ['Fast tempo', 'Slow tempo'], direct: ['Direct', 'Patient'] };
  function splitGroups(c, key, varKey) {
    if (key === 'meopp') return [values(FM.statRows(c.league, 'me'), varKey), values(FM.statRows(c.league, 'opp'), varKey)];
    const rows = all(c), med = {};
    ['pressing', 'lineHeight', 'tempo', 'directness'].forEach((k) => { med[k] = median(rows.map((r) => (r.tactics ? r.tactics[k] : NaN)).filter(fin)); });
    const f = SPLITS[key][1];
    return [values(rows.filter((r) => f(r, med) === 'a'), varKey), values(rows.filter((r) => f(r, med) === 'b'), varKey)];
  }
  const dLabel = (d) => { const a = Math.abs(d); return a < 0.2 ? 'negligible' : a < 0.5 ? 'small' : a < 0.8 ? 'medium' : 'large'; };
  tool({
    id: 'ttest', level: 'above', title: 'The t-test',
    blurb: 'A t-test asks whether a difference between means is bigger than sampling variation alone would usually produce. Welch\'s version does not assume the two groups are equally spread; the paired version compares two numbers from the same match.',
    draw(box, c) {
      if (!st.tKind) { st.tKind = 'welch'; st.tSplit = 'meopp'; st.tAlt = 'two'; st.tAlpha = 0.05; }
      const kind = st.tKind, alt = st.tAlt, alpha = st.tAlpha, key = VAR[st.x] ? st.x : 'goals';
      const baseSel = `<div class="row"><label>Test<select id="ttKind"><option value="one"${kind === 'one' ? ' selected' : ''}>One sample: is the mean different from a value?</option><option value="welch"${kind === 'welch' ? ' selected' : ''}>Two groups (Welch)</option><option value="paired"${kind === 'paired' ? ' selected' : ''}>Paired: you against your opponent, match by match</option></select></label>
        <label>Measure${varSelect('ttVar', key)}</label>
        ${kind === 'welch' ? `<label>Groups<select id="ttSplit">${Object.keys(SPLITS).map((k) => `<option value="${k}"${k === st.tSplit ? ' selected' : ''}>${SPLITS[k][0]}</option>`).join('')}</select></label>` : ''}
        <label>Alternative<select id="ttAlt"><option value="two"${alt === 'two' ? ' selected' : ''}>Different (two-tailed)</option><option value="greater"${alt === 'greater' ? ' selected' : ''}>First is greater</option><option value="less"${alt === 'less' ? ' selected' : ''}>First is smaller</option></select></label>
        <label>Significance level<select id="ttAlpha">${[0.1, 0.05, 0.01].map((a) => `<option value="${a}"${a === alpha ? ' selected' : ''}>${a * 100}%</option>`).join('')}</select></label></div>`;
      let html = '', res = null, label = '';
      if (kind === 'one') {
        const v = values(c.rows, key), mu = st.tMu != null && st.tMuVar === key ? st.tMu : +S.mean(values(all(c), key)).toFixed(2);
        st.tMu = mu; st.tMuVar = key;
        if (v.length < 3) html = needN(v.length, 3);
        else {
          res = S.tOne(v, mu, alt); label = 'One-sample t-test, ' + VAR[key].label + ' against ' + mu;
          html = `<div class="row"><label>H0: the true mean is<input type="number" id="ttMu" value="${mu}" step="any"></label></div>
            <p class="desc">n = ${res.n}, mean ${f2(res.mean)}, standard error ${f2(res.se, 3)}. t = (${f2(res.mean)} - ${mu}) / ${f2(res.se, 3)} = <b>${f2(res.t, 3)}</b> on ${res.df} degrees of freedom.</p>`;
        }
      } else if (kind === 'paired') {
        const me = FM.statRows(c.league, 'me'), opp = FM.statRows(c.league, 'opp'), a = [], b = [];
        me.forEach((r) => { const o = opp.find((x) => x.fxId === r.fxId); if (o && fin(r[key]) && fin(o[key])) { a.push(r[key]); b.push(o[key]); } });
        if (a.length < 3) html = needN(a.length, 3);
        else {
          res = S.tPaired(a, b, alt); label = 'Paired t-test, ' + VAR[key].label + ': you minus opponent';
          html = `<p class="desc">${res.n} matches. In each match we take your figure minus the opponent's. Mean difference ${f2(res.mean)}, standard error ${f2(res.se, 3)}, t = <b>${f2(res.t, 3)}</b> on ${res.df} degrees of freedom. Effect size d<sub>z</sub> = ${f2(res.dz, 2)} (${dLabel(res.dz)}).</p><p class="note">Pairing removes the match-to-match swings both teams share (a wild, open match inflates both), which usually makes the test more sensitive than comparing two separate groups.</p>`;
        }
      } else {
        const [ga, gb] = splitGroups(c, st.tSplit, key), L2 = SPLIT_LABELS[st.tSplit];
        if (ga.length < 3 || gb.length < 3) html = needN(Math.min(ga.length, gb.length), 3);
        else {
          res = S.tWelch(ga, gb, alt); label = 'Welch t-test, ' + VAR[key].label + ': ' + L2[0] + ' v ' + L2[1];
          const tc = S.tInv(1 - alpha / 2, res.df), lo = res.diff - tc * res.se, hi = res.diff + tc * res.se;
          html = `<div class="tablewrap"><table class="data"><thead><tr><th class="l">Group</th><th>n</th><th>Mean</th><th>Std dev</th></tr></thead><tbody>
            <tr><td class="l">${L2[0]}</td><td>${ga.length}</td><td>${f2(res.ma)}</td><td>${f2(S.sd(ga, true))}</td></tr><tr><td class="l">${L2[1]}</td><td>${gb.length}</td><td>${f2(res.mb)}</td><td>${f2(S.sd(gb, true))}</td></tr></tbody></table></div>
            <p class="desc">Difference in means ${f2(res.diff)} (${(1 - alpha) * 100}% interval ${f2(lo)} to ${f2(hi)}). t = <b>${f2(res.t, 3)}</b> on ${f2(res.df, 1)} degrees of freedom (Welch&ndash;Satterthwaite). Cohen's d = ${f2(res.d, 2)}, a <b>${dLabel(res.d)}</b> effect.</p>
            ${st.tSplit !== 'meopp' && st.tSplit !== 'homeaway' ? '<p class="note">The groups are split at the median of that setting across every team-match, so this compares real tactical choices the clubs made. Teams are not randomly assigned to tactics, so a difference could also reflect which kinds of teams choose them.</p>' : ''}`;
        }
      }
      if (res) {
        const sig = res.p < alpha;
        html += `<p class="desc"><b>p-value = ${pfmt(res.p)}</b>${stars(res.p) ? ' ' + stars(res.p) : ''}. ${sig ? `Below ${alpha * 100}%: we <b>reject H0</b>. A difference this large would be unusual by chance alone.` : `Not below ${alpha * 100}%: we <b>do not reject H0</b>. The data are consistent with no difference, but a small sample cannot rule out a real one (see Power).`}</p>
          <p class="note">The t-test assumes roughly bell-shaped data and independent observations. Football counts are skewed and small, so treat a borderline p-value with caution.</p>
          <div class="row"><button id="ttRec">Record this test</button></div>` + logNote(c);
      }
      box.innerHTML = baseSel + html;
      const bind = (id, f) => { const e = box.querySelector(id); if (e) e.addEventListener('change', f); };
      bind('#ttKind', (e) => { st.tKind = e.target.value; c.redraw(); }); bind('#ttVar', (e) => { st.x = e.target.value; c.redraw(); });
      bind('#ttSplit', (e) => { st.tSplit = e.target.value; c.redraw(); }); bind('#ttAlt', (e) => { st.tAlt = e.target.value; c.redraw(); });
      bind('#ttAlpha', (e) => { st.tAlpha = parseFloat(e.target.value); c.redraw(); });
      bind('#ttMu', (e) => { const v = parseFloat(e.target.value); if (fin(v)) { st.tMu = v; c.redraw(); } });
      const rec = box.querySelector('#ttRec');
      if (rec) rec.addEventListener('click', () => { record(c, { tool: 'ttest', label, p: res.p, alpha, n: res.n || (res.na + res.nb), scope: st.scope }); c.redraw(); });
    },
  });

  // ---------- chi-squared ----------
  const CATS = {
    result: ['Result', (r) => (r.win ? 'Win' : r.draw ? 'Draw' : 'Loss'), ['Win', 'Draw', 'Loss']],
    venue: ['Venue', (r) => (r.home ? 'Home' : 'Away'), ['Home', 'Away']],
    poss: ['Possession', (r) => (r.possession > 50 ? 'Over 50%' : '50% or under'), ['Over 50%', '50% or under']],
    shots: ['Shots against the opposition', (r) => (r.shots > r.shotsAgainst ? 'More shots' : 'Fewer or equal'), ['More shots', 'Fewer or equal']],
    xg: ['Chance quality (xG)', (r) => (r.xg > r.xga ? 'Higher xG' : 'Lower or equal xG'), ['Higher xG', 'Lower or equal xG']],
    goals: ['Goals scored', (r) => (r.goals >= 2 ? '2 or more' : r.goals === 1 ? '1' : '0'), ['0', '1', '2 or more']],
    cards: ['Cards', (r) => (r.yellows + r.reds > 0 ? 'Carded' : 'No cards'), ['Carded', 'No cards']],
    press: ['Pressing setting', (r, m) => ((r.tactics && r.tactics.pressing) > m.pressing ? 'High press' : 'Low press'), ['High press', 'Low press']],
    line: ['Defensive line setting', (r, m) => ((r.tactics && r.tactics.lineHeight) > m.lineHeight ? 'High line' : 'Low line'), ['High line', 'Low line']],
  };
  tool({
    id: 'chisq', level: 'above', title: 'Chi-squared test of association',
    blurb: 'Is the result linked to something else, or are they independent? A chi-squared test compares the counts you observed in a table with the counts you would expect if the two were unrelated.',
    draw(box, c) {
      if (!st.csA) { st.csA = 'result'; st.csB = 'poss'; }
      const opt = (sel) => Object.keys(CATS).map((k) => `<option value="${k}"${k === sel ? ' selected' : ''}>${CATS[k][0]}</option>`).join('');
      const rows = c.rows, med = {};
      ['pressing', 'lineHeight', 'tempo', 'directness'].forEach((k) => { med[k] = median(rows.map((r) => (r.tactics ? r.tactics[k] : NaN)).filter(fin)); });
      box.innerHTML = `<div class="row"><label>Down the side<select id="csA">${opt(st.csA)}</select></label><label>Across the top<select id="csB">${opt(st.csB)}</select></label></div>`;
      if (st.csA === st.csB) { box.insertAdjacentHTML('beforeend', '<p class="note">Choose two different things to compare.</p>'); }
      else if (rows.length < 8) box.insertAdjacentHTML('beforeend', needN(rows.length, 8));
      else {
        const A = CATS[st.csA], B = CATS[st.csB];
        const table = A[2].map((a) => B[2].map((b) => rows.filter((r) => A[1](r, med) === a && B[1](r, med) === b).length));
        const keepR = table.map((r) => S.sum(r) > 0), keepC = B[2].map((_, j) => table.some((r) => r[j] > 0));
        const T = table.filter((_, i) => keepR[i]).map((r) => r.filter((_, j) => keepC[j]));
        if (T.length < 2 || T[0].length < 2) { box.insertAdjacentHTML('beforeend', '<p class="note">One of these only takes a single value in this data so far, so there is nothing to compare.</p>'); }
        else {
          const rl = A[2].filter((_, i) => keepR[i]), cl = B[2].filter((_, j) => keepC[j]);
          const x = S.chi2Indep(T), V = Math.sqrt(x.chi2 / (x.n * (Math.min(T.length, T[0].length) - 1)));
          const sig = x.p < 0.05;
          box.insertAdjacentHTML('beforeend', `<div class="tablewrap"><table class="data"><thead><tr><th class="l">Observed (expected)</th>${cl.map((l) => `<th>${esc(l)}</th>`).join('')}<th>Total</th></tr></thead><tbody>${T.map((r, i) => `<tr><td class="l">${esc(rl[i])}</td>${r.map((o, j) => `<td>${o} (${f2(x.expected[i][j], 1)})</td>`).join('')}<td>${S.sum(r)}</td></tr>`).join('')}</tbody></table></div>
            <p class="desc">&chi;&sup2; = &Sigma;(O - E)&sup2;/E = <b>${f2(x.chi2, 3)}</b> on ${x.df} degree${x.df > 1 ? 's' : ''} of freedom, <b>p = ${pfmt(x.p)}</b>. Cram&eacute;r's V = ${f2(V, 2)} (the strength of the link, from 0 to 1).</p>
            <p class="desc">${sig ? 'Below 5%: there is evidence of an association between these two.' : 'Not below 5%: no evidence of an association in this data.'}</p>
            ${x.minExpected < 5 ? `<p class="note warnnote">The smallest expected count is ${f2(x.minExpected, 1)}. Below 5, the chi-squared approximation is unreliable: combine categories or wait for more matches.</p>` : ''}
            <p class="note">Each match counts once per team, so a match between two clubs appears twice and the two rows are not truly independent. Keep that in mind when you read the p-value.</p>
            <div class="row"><button id="csRec">Record this test</button></div>` + logNote(c));
          box.querySelector('#csRec').addEventListener('click', () => { record(c, { tool: 'chisq', label: 'Chi-squared: ' + A[0] + ' and ' + B[0], p: x.p, alpha: 0.05, n: x.n, scope: st.scope }); c.redraw(); });
        }
      }
      box.querySelector('#csA').addEventListener('change', (e) => { st.csA = e.target.value; c.redraw(); });
      box.querySelector('#csB').addEventListener('change', (e) => { st.csB = e.target.value; c.redraw(); });
    },
  });

  // ---------- Poisson ----------
  tool({
    id: 'poisson', level: 'above', title: 'The Poisson distribution',
    blurb: 'Goals, corners and fouls are counts of events happening at some average rate. If they happen independently at a steady rate, the count in a match follows a Poisson distribution, whose mean and variance are equal.',
    draw(box, c) {
      const key = VAR[st.x] && VAR[st.x].whole ? st.x : 'goals';
      // Counts that stay small suit a Poisson picture; the number of passes runs into the hundreds, which does not.
      const wholeVars = FM.STAT_VARS.filter((v) => v[2] && v[0] !== 'passes');
      const v = values(c.rows, key), n = v.length;
      box.innerHTML = `<label>Count${`<select id="poVar">${wholeVars.map((w) => `<option value="${w[0]}"${w[0] === key ? ' selected' : ''}>${w[1]}</option>`).join('')}</select>`}</label>`;
      if (n < 6) { box.insertAdjacentHTML('beforeend', needN(n, 6)); }
      else {
        const lam = S.mean(v), vr = S.variance(v, true), K = Math.max.apply(null, v);
        // observed against expected, with the last cell holding "K or more"
        const exp = [], obs = [];
        for (let k = 0; k <= K; k++) { obs.push(v.filter((x) => x === k).length); exp.push(k < K ? n * S.poisPmf(k, lam) : n * (1 - S.poisCdf(K - 1, lam))); }
        // merge cells from the right until each expected count is at least 5, then check the left
        const O = obs.slice(), E = exp.slice();
        while (E.length > 2 && E[E.length - 1] < 5) { E[E.length - 2] += E.pop(); O[O.length - 2] += O.pop(); }
        while (E.length > 2 && E[0] < 5) { E[1] += E.shift(); O[1] += O.shift(); }
        const chi2 = S.sum(O.map((o, i) => (o - E[i]) ** 2 / E[i])), df = E.length - 2, gp = df > 0 ? S.chi2Sf(chi2, df) : NaN;
        const barsObs = obs.map((o, k) => ({ a: k - 0.5, b: k + 0.5, c: o }));
        const ch = chart({ x0: -0.5, x1: K + 0.5, y0: 0, y1: Math.max.apply(null, obs.concat(exp)) * 1.15, xlabel: VAR[key].label + ' in a match', ylabel: 'Number of matches', xticks: obs.map((_, k) => k), label: 'Observed against Poisson' });
        let s = ch.s;
        barsObs.forEach((b) => { s += `<rect x="${ch.xs(b.a) + 2}" y="${ch.ys(b.c)}" width="${Math.max(1, ch.xs(b.b) - ch.xs(b.a) - 4)}" height="${ch.ys(0) - ch.ys(b.c)}" fill="#F2C14E" fill-opacity="0.85"/>`; });
        exp.forEach((e, k) => { s += `<circle cx="${ch.xs(k)}" cy="${ch.ys(e)}" r="5" fill="#7FD1FF" stroke="#1A232D" stroke-width="1.5"/>`; });
        s += path(ch, exp.map((e, k) => [k, e]), '#7FD1FF', 1.5) + ch.close;
        const lam0 = st.poL0 != null && st.poVar0 === key ? st.poL0 : +S.mean(values(all(c), key)).toFixed(2);
        st.poL0 = lam0; st.poVar0 = key;
        if (!st.poAlt) st.poAlt = 'greater';
        const tot = S.sum(v), mu0 = n * lam0;
        const pv = st.poAlt === 'greater' ? 1 - S.poisCdf(tot - 1, mu0) : st.poAlt === 'less' ? S.poisCdf(tot, mu0) : (() => { const o = S.poisPmf(tot, mu0); let p = 0; for (let i = 0; i < mu0 * 4 + 60; i++) { const q = S.poisPmf(i, mu0); if (q <= o * (1 + 1e-9)) p += q; } return Math.min(1, p); })();
        box.insertAdjacentHTML('beforeend', `<p class="desc">${n} matches. Mean (the rate &lambda;) = ${f2(lam, 3)}, variance = ${f2(vr, 3)}, so variance / mean = <b>${f2(vr / lam, 2)}</b>. For a true Poisson this is about 1; well above 1 means the counts are more bunched than chance alone would give (some matches open, some closed).</p>${s}
          <p class="note">Gold bars: matches that really had each count. Blue dots: how many a Poisson distribution with the same mean predicts.</p>
          <p class="desc">Goodness of fit: &chi;&sup2; = ${f2(chi2, 2)} on ${df} degrees of freedom (cells merged so each expects at least 5; one more degree used because &lambda; was estimated), <b>p = ${pfmt(gp)}</b>. ${fin(gp) ? (gp < 0.05 ? 'The Poisson model is rejected for this measure.' : 'The data are consistent with a Poisson model.') : 'Too few cells left to test.'}</p>
          <h2 style="margin-top:6px">Is the rate different from the league's?</h2>
          <div class="row"><label>H0: the true rate is<input type="number" id="poL0" value="${lam0}" step="0.05"></label><label>H1<select id="poAlt"><option value="greater"${st.poAlt === 'greater' ? ' selected' : ''}>The rate is higher</option><option value="less"${st.poAlt === 'less' ? ' selected' : ''}>The rate is lower</option><option value="two"${st.poAlt === 'two' ? ' selected' : ''}>The rate is different</option></select></label></div>
          <p class="desc">${tot} in total over ${n} matches. If &lambda; = ${lam0} per match, the total is Poisson with mean ${f2(mu0, 1)}. <b>p-value = ${pfmt(pv)}</b>. ${pv < 0.05 ? 'Below 5%: reject H0.' : 'Not below 5%: do not reject H0.'}</p>
          <div class="row"><button id="poRec">Record this test</button></div>` + logNote(c) + smallN(n));
        box.querySelector('#poL0').addEventListener('change', (e) => { const x = parseFloat(e.target.value); if (x > 0) { st.poL0 = x; c.redraw(); } });
        box.querySelector('#poAlt').addEventListener('change', (e) => { st.poAlt = e.target.value; c.redraw(); });
        box.querySelector('#poRec').addEventListener('click', () => { record(c, { tool: 'poisson', label: 'Poisson rate test, ' + VAR[key].label + ': ' + tot + ' in ' + n + ' matches vs ' + lam0 + ' per match', p: pv, alpha: 0.05, n, scope: st.scope }); c.redraw(); });
      }
      box.querySelector('#poVar').addEventListener('change', (e) => { st.x = e.target.value; c.redraw(); });
    },
  });

  // ---------- multiple regression ----------
  const MLR_VARS = ['shots', 'onTarget', 'xg', 'possession', 'passes', 'passPct', 'dribbleWinPct', 'tackleWinPct', 'fouls', 'corners', 'offsides', 'shotsAgainst', 'xga'];
  tool({
    id: 'mlr', level: 'above', title: 'Multiple linear regression',
    blurb: 'Multiple regression predicts one measure from several at once and shows each one\'s effect with the others held fixed. Predictors that move together (collinearity) make the individual effects hard to separate.',
    draw(box, c) {
      if (!st.mlrY) { st.mlrY = 'goals'; st.mlrX = ['shots', 'possession']; }
      const rows = c.rows;
      box.innerHTML = `<label>Predict<select id="mlY">${FM.STAT_VARS.map((v) => `<option value="${v[0]}"${v[0] === st.mlrY ? ' selected' : ''}>${v[1]}</option>`).join('')}</select></label>
        <div><span class="note">From these (tick the ones to use):</span><div class="ins-grid" style="margin-top:6px">${MLR_VARS.filter((k) => k !== st.mlrY).map((k) => `<label class="check"><input type="checkbox" data-mx="${k}"${st.mlrX.includes(k) ? ' checked' : ''}> ${VAR[k].label}</label>`).join('')}</div></div>`;
      const xs = st.mlrX.filter((k) => k !== st.mlrY);
      const ok = rows.filter((r) => fin(r[st.mlrY]) && xs.every((k) => fin(r[k])));
      if (!xs.length) box.insertAdjacentHTML('beforeend', '<p class="note">Tick at least one predictor.</p>');
      else if (ok.length < xs.length + 4) box.insertAdjacentHTML('beforeend', `<p class="note">With ${xs.length} predictor${xs.length > 1 ? 's' : ''} this needs at least ${xs.length + 4} matches and you have ${ok.length}. Use "Every match in the league" above for more data, or tick fewer predictors.</p>`);
      else {
        const X = ok.map((r) => [1].concat(xs.map((k) => r[k]))), y = ok.map((r) => r[st.mlrY]), m = S.ols(X, y);
        if (!m) box.insertAdjacentHTML('beforeend', '<p class="note warnnote">These predictors are perfectly tangled together (one can be worked out from the others), so no separate effects exist. Remove one.</p>');
        else {
          const names = ['Intercept'].concat(xs.map((k) => VAR[k].label));
          // variance inflation factors: how well each predictor is predicted by the others
          const vif = xs.map((k, j) => { if (xs.length < 2) return 1; const others = xs.filter((_, i) => i !== j); const r2 = (S.ols(ok.map((r) => [1].concat(others.map((o) => r[o]))), ok.map((r) => r[k])) || { r2: 0 }).r2; return 1 / Math.max(1e-9, 1 - r2); });
          const fit = X.map((r) => S.sum(r.map((v, j) => v * m.beta[j])));
          box.insertAdjacentHTML('beforeend', `<div class="tablewrap"><table class="data"><thead><tr><th class="l">Term</th><th>Coefficient</th><th>Std error</th><th>t</th><th>p</th><th>VIF</th></tr></thead><tbody>${names.map((nm, j) => `<tr><td class="l">${esc(nm)}</td><td>${f2(m.beta[j], 3)}</td><td>${f2(m.se[j], 3)}</td><td>${f2(m.t[j], 2)}</td><td>${pfmt(m.p[j])} ${stars(m.p[j])}</td><td>${j ? f2(vif[j - 1], 1) : ''}</td></tr>`).join('')}</tbody></table></div>
            <p class="desc">${ok.length} matches. R&sup2; = ${f2(m.r2, 3)}, adjusted R&sup2; = ${f2(m.adjR2, 3)}. Overall F-test p = ${pfmt(m.fp)}. Typical error of a prediction: ${f2(m.sigma, 2)}.</p>
            ${scatterSvg(fit, y, { xlabel: 'Predicted ' + VAR[st.mlrY].label, ylabel: 'Actual ' + VAR[st.mlrY].label, line: { a: 0, b: 1 }, r: 3.5 })}
            <p class="note">Each coefficient is the change in ${esc(VAR[st.mlrY].label.toLowerCase())} for one more unit of that measure with the others held constant. VIF above about 5 means that predictor is largely explained by the others, so its coefficient is unreliable. Adjusted R&sup2; punishes adding predictors that do not help. ${ok.length < 10 * xs.length ? `With ${ok.length} matches and ${xs.length} predictor${xs.length > 1 ? 's' : ''} this is easy to over-fit: aim for ten matches per predictor.` : ''}</p>`);
        }
      }
      box.querySelector('#mlY').addEventListener('change', (e) => { st.mlrY = e.target.value; c.redraw(); });
      box.querySelectorAll('[data-mx]').forEach((cb) => cb.addEventListener('change', () => { st.mlrX = [...box.querySelectorAll('[data-mx]:checked')].map((x) => x.dataset.mx); c.redraw(); }));
    },
  });

  // ---------- logistic regression ----------
  tool({
    id: 'logistic', level: 'above', title: 'Logistic regression: why do passes fail?',
    blurb: 'Logistic regression models the probability of a yes/no outcome. Here every pass in your matches is recorded with its length, how clear the lane was and how close the nearest defender was to the receiver, and the model weighs them up. Coefficients are changes in log-odds; exponentiated they are odds ratios.',
    draw(box, c) {
      if (!st.lgTeam) { st.lgTeam = 'me'; st.lgX = ['dist', 'lane', 'press']; }
      const fxs = c.league.fixtures.filter((f) => f.played && f.log);
      const PRED = { dist: ['Pass length (m)', 7], lane: ['Lane clearance (m)', 8], press: ['Distance of nearest defender to receiver (m)', 9] };
      box.innerHTML = `<div class="row"><label>Passes by<select id="lgTeam"><option value="me"${st.lgTeam === 'me' ? ' selected' : ''}>Your team</option><option value="opp"${st.lgTeam === 'opp' ? ' selected' : ''}>Your opponents</option></select></label></div>
        <div class="ins-grid">${Object.keys(PRED).map((k) => `<label class="check"><input type="checkbox" data-lx="${k}"${st.lgX.includes(k) ? ' checked' : ''}> ${PRED[k][0]}</label>`).join('')}</div>`;
      const data = [];
      fxs.forEach((f) => { const mine = f.homeId === c.league.userId ? 0 : 1; f.log.passes.forEach((p) => { if (p[4] === 2) return; if ((st.lgTeam === 'me') === (p[1] === mine)) data.push(p); }); });
      const xs = st.lgX;
      if (!xs.length) box.insertAdjacentHTML('beforeend', '<p class="note">Tick at least one predictor.</p>');
      else if (data.length < 200) box.insertAdjacentHTML('beforeend', `<p class="note">Only ${data.length} passes recorded so far. Play a match or two and come back.</p>`);
      else {
        const X = data.map((p) => [1].concat(xs.map((k) => p[PRED[k][1]]))), y = data.map((p) => p[4]);
        const m = S.logistic(X, y);
        if (!m) box.insertAdjacentHTML('beforeend', '<p class="note warnnote">The model could not be fitted with these predictors.</p>');
        else {
          const names = ['Intercept'].concat(xs.map((k) => PRED[k][0]));
          if (!st.lgQ) st.lgQ = { dist: 20, lane: 4, press: 4 };
          const pred = (q) => 1 / (1 + Math.exp(-(m.beta[0] + xs.reduce((a, k, j) => a + m.beta[j + 1] * q[k], 0))));
          box.insertAdjacentHTML('beforeend', `<div class="tablewrap"><table class="data"><thead><tr><th class="l">Term</th><th>Coefficient</th><th>Std error</th><th>z</th><th>p</th><th>Odds ratio</th><th>95% interval</th></tr></thead><tbody>${names.map((nm, j) => `<tr><td class="l">${esc(nm)}</td><td>${f2(m.beta[j], 3)}</td><td>${f2(m.se[j], 3)}</td><td>${f2(m.z[j], 1)}</td><td>${pfmt(m.p[j])} ${stars(m.p[j])}</td><td>${j ? f2(Math.exp(m.beta[j]), 3) : ''}</td><td>${j ? f2(Math.exp(m.beta[j] - 1.96 * m.se[j]), 3) + ' to ' + f2(Math.exp(m.beta[j] + 1.96 * m.se[j]), 3) : ''}</td></tr>`).join('')}</tbody></table></div>
            <p class="desc">${data.length} passes, ${S.sum(y)} completed (${f2(100 * S.mean(y), 1)}%). McFadden pseudo-R&sup2; = ${f2(m.mcfadden, 3)}. ${m.converged ? '' : 'The fit did not fully converge. '}An odds ratio below 1 means that factor lowers the odds of the pass being completed: for example an odds ratio of 0.96 for length means each extra metre multiplies the odds by 0.96.</p>
            <div class="row">${xs.map((k) => `<label>${PRED[k][0]}<input type="number" data-lq="${k}" value="${st.lgQ[k]}" step="0.5"></label>`).join('')}<div class="desc" style="align-self:end">Predicted chance of completion: <b>${f2(100 * pred(st.lgQ), 1)}%</b></div></div>
            <p class="note">With thousands of passes almost every effect is "significant", even a tiny one, so look at the size of the odds ratio and not only the p-value: statistical significance is not the same as mattering. This is also exactly the relationship the match engine uses for pass success, so the model is rediscovering how the simulation works.</p>`);
          box.querySelectorAll('[data-lq]').forEach((i) => i.addEventListener('change', () => { st.lgQ[i.dataset.lq] = parseFloat(i.value) || 0; c.redraw(); }));
        }
      }
      box.querySelector('#lgTeam').addEventListener('change', (e) => { st.lgTeam = e.target.value; c.redraw(); });
      box.querySelectorAll('[data-lx]').forEach((cb) => cb.addEventListener('change', () => { st.lgX = [...box.querySelectorAll('[data-lx]:checked')].map((x) => x.dataset.lx); c.redraw(); }));
    },
  });

  // ---------- Bayesian updating ----------
  tool({
    id: 'bayes', level: 'above', title: 'Bayesian updating',
    blurb: 'Bayesian inference starts with a prior belief about a rate, then updates it with the data to give a posterior. With a Beta prior and yes/no data the update is simply to add the successes and failures to the prior\'s two numbers.',
    draw(box, c) {
      if (!st.bRate) { st.bRate = 'shotsGoals'; st.bStrength = 40; }
      const R = RATES[st.bRate], rows = c.rows, a0rows = all(c), N0 = totals(a0rows, R[1]), K0 = totals(a0rows, R[2]);
      const p0 = N0 ? K0 / N0 : 0.1, m = st.bStrength;
      box.innerHTML = `<div class="row"><label>Rate<select id="byRate">${Object.keys(RATES).map((k) => `<option value="${k}"${k === st.bRate ? ' selected' : ''}>${RATES[k][0]}</option>`).join('')}</select></label>
        <label>How strong is the prior? Worth ${m} ${R[3]} of evidence<input type="range" id="byM" min="2" max="300" step="2" value="${m}"></label></div>`;
      const n = totals(rows, R[1]), k = totals(rows, R[2]);
      if (n < 5) box.insertAdjacentHTML('beforeend', '<p class="note">Too few attempts so far.</p>');
      else {
        const a = m * p0, b = m * (1 - p0), a1 = a + k, b1 = b + (n - k);
        const mean = (x, y) => x / (x + y), sd = (x, y) => Math.sqrt(x * y / ((x + y) ** 2 * (x + y + 1)));
        const lo = Math.max(0, Math.min(mean(a, b) - 5 * sd(a, b), mean(a1, b1) - 5 * sd(a1, b1))), hi = Math.min(1, Math.max(mean(a, b) + 5 * sd(a, b), mean(a1, b1) + 5 * sd(a1, b1)));
        const pts = (aa, bb) => { const o = []; for (let i = 0; i <= 160; i++) { const x = lo + (hi - lo) * i / 160; o.push([x, S.betaPdf(Math.min(0.9999, Math.max(0.0001, x)), aa, bb)]); } return o; };
        const P0 = pts(a, b), P1 = pts(a1, b1), ymax = Math.max.apply(null, P0.concat(P1).map((p) => p[1])) * 1.1;
        const ch = chart({ x0: lo, x1: hi, y0: 0, y1: ymax, xlabel: R[0] + ' (rate)', ylabel: 'Density', label: 'Prior and posterior' });
        const post = ch.s + path(ch, P0, '#7FD1FF', 2.5) + path(ch, P1, '#F2C14E', 3) + ch.close;
        const ci = [S.betaInv(0.025, a1, b1), S.betaInv(0.975, a1, b1)], prior = [S.betaInv(0.025, a, b), S.betaInv(0.975, a, b)];
        const pHigher = 1 - S.betaI(p0, a1, b1), freq = S.wilson(k, n, 0.95);
        let run = '', ca = a, cb = b;
        rows.forEach((r) => { ca += r[R[2]]; cb += r[R[1]] - r[R[2]]; run += `<tr><td class="l">After round ${r.round + 1}</td><td>${f2(100 * mean(ca, cb), 2)}%</td><td>${f2(100 * S.betaInv(0.025, ca, cb), 1)}% to ${f2(100 * S.betaInv(0.975, ca, cb), 1)}%</td></tr>`; });
        box.insertAdjacentHTML('beforeend', `<p class="desc"><b>Prior:</b> centred on the league rate ${f2(100 * p0, 1)}%, as Beta(${f2(a, 1)}, ${f2(b, 1)}); 95% of its belief lies between ${f2(100 * prior[0], 1)}% and ${f2(100 * prior[1], 1)}%. <b>Data:</b> ${k} of ${n}. <b>Posterior:</b> Beta(${f2(a1, 1)}, ${f2(b1, 1)}).</p>${post}
          <p class="note"><span style="color:#7FD1FF">Blue</span> is the prior, <span style="color:#F2C14E">gold</span> the posterior after your data. Move the strength slider: a strong prior hardly moves, a weak one is dragged to the data.</p>
          <div class="tablewrap"><table class="data"><tbody>
          <tr><td class="l">Posterior mean</td><td>${f2(100 * mean(a1, b1), 2)}%</td></tr><tr><td class="l">95% credible interval</td><td>${f2(100 * ci[0], 1)}% to ${f2(100 * ci[1], 1)}%</td></tr>
          <tr><td class="l">Probability the true rate is above the league's ${f2(100 * p0, 1)}%</td><td><b>${f2(pHigher, 3)}</b></td></tr>
          <tr><td class="l">For comparison, the plain data (frequentist) 95% interval</td><td>${f2(100 * freq.lo, 1)}% to ${f2(100 * freq.hi, 1)}%</td></tr></tbody></table></div>
          <p class="desc">A credible interval means what people usually want a confidence interval to mean: given the prior and the data, the true rate is in this range with 95% probability. The price is that it depends on a prior you chose.</p>
          <h2 style="margin-top:6px">Belief after each match</h2><div class="tablewrap"><table class="data"><thead><tr><th class="l">When</th><th>Estimate</th><th>95% credible interval</th></tr></thead><tbody>${run}</tbody></table></div>`);
      }
      box.querySelector('#byRate').addEventListener('change', (e) => { st.bRate = e.target.value; c.redraw(); });
      box.querySelector('#byM').addEventListener('input', (e) => { st.bStrength = parseInt(e.target.value, 10); c.redraw(); });
    },
  });

  // ---------- power and effect sizes ----------
  tool({
    id: 'power', level: 'above', title: 'Power and effect sizes',
    blurb: 'An effect size says how big a difference is, in units of the data\'s own spread (Cohen\'s d). Power is the chance a test notices a real effect of that size. A test that is too weak will often miss real effects, and a non-significant result then means very little.',
    draw(box, c) {
      if (st.pwD == null) { st.pwD = 0.5; st.pwN = 14; st.pwA = 0.05; }
      const d = st.pwD, n = st.pwN, alpha = st.pwA, pw = S.powerTwo(d, n, alpha);
      const ch = chart({ x0: 2, x1: 100, y0: 0, y1: 1, xlabel: 'Matches in each group', ylabel: 'Power', label: 'Power against sample size' });
      let s = ch.s; const pts = []; for (let k = 2; k <= 100; k++) pts.push([k, S.powerTwo(d, k, alpha)]);
      s += `<line x1="${ch.l}" x2="${ch.w - ch.r}" y1="${ch.ys(0.8)}" y2="${ch.ys(0.8)}" stroke="#E58C8C" stroke-dasharray="6 5"/><text class="tick" x="${ch.w - ch.r - 4}" y="${ch.ys(0.8) - 5}" text-anchor="end" fill="#E58C8C">80%</text>`;
      s += path(ch, pts, '#F2C14E', 3) + `<circle cx="${ch.xs(Math.min(100, n))}" cy="${ch.ys(pw)}" r="6" fill="#7FD1FF" stroke="#1A232D" stroke-width="2"/>` + ch.close;
      const za = S.normInv(1 - alpha / 2), zb = S.normInv(0.8);
      box.innerHTML = `<div class="row"><label>Effect size d: ${f2(d, 2)} (${dLabel(d)})<input type="range" id="pwD" min="0.1" max="1.5" step="0.05" value="${d}"></label>
        <label>Matches in each group: ${n}<input type="range" id="pwN" min="3" max="100" step="1" value="${n}"></label>
        <label>Significance level<select id="pwA">${[0.1, 0.05, 0.01].map((a) => `<option value="${a}"${a === alpha ? ' selected' : ''}>${a * 100}%</option>`).join('')}</select></label></div>
        <p class="desc">If the true effect is d = ${f2(d, 2)} and you compare ${n} matches against ${n}, a two-tailed test at ${alpha * 100}% has about <b>${Math.round(100 * pw)}% power</b>: it would notice the effect ${Math.round(100 * pw)} times in 100 seasons, and miss it the other ${100 - Math.round(100 * pw)}.</p>${s}
        <div class="tablewrap"><table class="data"><thead><tr><th class="l">True effect</th><th>Matches needed in each group for 80% power</th></tr></thead><tbody>${[[0.2, 'small'], [0.5, 'medium'], [0.8, 'large'], [1.0, 'very large']].map(([e, w]) => `<tr><td class="l">d = ${e} (${w})</td><td>${S.nForPower(e, 0.8, alpha)}</td></tr>`).join('')}</tbody></table></div>
        <p class="desc">In a 14-match season, a group of 14 matches can only reliably detect an effect of about d = <b>${f2((za + zb) * Math.sqrt(2 / 14), 2)}</b> or more. Smaller real effects will usually be missed, and the ones that do reach significance tend to be exaggerated.</p>
        <p class="note">Power is worked out here with a normal approximation. It also depends on the data being spread the way d assumes, so treat these as guides.</p>`;
      box.querySelector('#pwD').addEventListener('input', (e) => { st.pwD = parseFloat(e.target.value); c.redraw(); });
      box.querySelector('#pwN').addEventListener('input', (e) => { st.pwN = parseInt(e.target.value, 10); c.redraw(); });
      box.querySelector('#pwA').addEventListener('change', (e) => { st.pwA = parseFloat(e.target.value); c.redraw(); });
    },
  });

  // ---------- many tests at once ----------
  tool({
    id: 'multiple', level: 'above', title: 'The problem of many tests',
    blurb: 'Every test run at the 5% level has a 1 in 20 chance of "finding" an effect that is not there. Run twenty and you expect one false alarm. Corrections raise the bar for each test to compensate.',
    draw(box, c) {
      const log = (c.league.testLog || []);
      const ps = log.map((t) => t.p).filter(fin), m = ps.length;
      let html = `<p class="desc">Every test you record in the workshop is kept here. You have recorded <b>${m}</b>${m ? '' : '. Record some from the tools above (the "Record this test" buttons) and they will appear.'}</p>`;
      if (m) {
        const bf = S.bonferroni(ps), ho = S.holm(ps), bh = S.benjaminiHochberg(ps);
        html += `<div class="tablewrap"><table class="data"><thead><tr><th class="l">Test</th><th>p</th><th>Bonferroni</th><th>Holm</th><th>Benjamini&ndash;Hochberg</th></tr></thead><tbody>${log.map((t, i) => `<tr><td class="l">${esc(t.id)}: ${esc(t.label)}</td><td>${pfmt(t.p)}</td><td>${pfmt(bf[i])}</td><td>${pfmt(ho[i])}</td><td>${pfmt(bh[i])}</td></tr>`).join('')}</tbody></table></div>
          <p class="desc">Passing 5% on its own: <b>${ps.filter((p) => p < 0.05).length}</b> of ${m}. After correction: Bonferroni <b>${bf.filter((p) => p < 0.05).length}</b>, Holm <b>${ho.filter((p) => p < 0.05).length}</b>, Benjamini&ndash;Hochberg <b>${bh.filter((p) => p < 0.05).length}</b>.</p>
          <p class="desc">If none of your ${m} tests were real effects, the chance that at least one would still pass at 5% is 1 - 0.95<sup>${m}</sup> = <b>${f2(100 * (1 - Math.pow(0.95, m)), 1)}%</b>. The Bonferroni bar for each test is 0.05 / ${m} = ${pfmt(0.05 / m)}.</p>
          <p class="note">Bonferroni and Holm control the chance of even one false alarm (strict). Benjamini&ndash;Hochberg controls the share of your "discoveries" that are false (more forgiving, more appropriate when exploring).</p>`;
      }
      html += `<h2 style="margin-top:6px">Try it on pure noise</h2><div class="row"><label>Number of tests<input type="number" id="mtN" value="${st.mtN || 20}" min="2" max="200"></label><button id="mtRun" style="align-self:end">Run this many tests on random numbers</button></div><div id="mtOut"></div>`;
      box.innerHTML = html;
      box.querySelector('#mtRun').addEventListener('click', () => {
        const N = Math.max(2, Math.min(200, parseInt(box.querySelector('#mtN').value, 10) || 20)); st.mtN = N; st.mtSeed = (st.mtSeed || 0) + 1;
        const rng = FM.mulberry32(c.league.seed + st.mtSeed * 7919), gauss = () => Math.sqrt(-2 * Math.log(Math.max(1e-12, rng()))) * Math.cos(2 * Math.PI * rng());
        const pv = []; for (let i = 0; i < N; i++) { const a = [], b = []; for (let k = 0; k < 14; k++) { a.push(gauss()); b.push(gauss()); } pv.push(S.tWelch(a, b, 'two').p); }
        const bf = S.bonferroni(pv), bh = S.benjaminiHochberg(pv);
        box.querySelector('#mtOut').innerHTML = `<p class="desc">${N} tests, each comparing two groups of 14 numbers drawn from <b>the same</b> distribution, so there is truly nothing to find. <b>${pv.filter((p) => p < 0.05).length}</b> came out "significant" at 5% (about ${f2(0.05 * N, 1)} expected by chance). After Bonferroni: <b>${bf.filter((p) => p < 0.05).length}</b>. After Benjamini&ndash;Hochberg: <b>${bh.filter((p) => p < 0.05).length}</b>. Smallest p-value: ${pfmt(Math.min.apply(null, pv))}.</p><p class="note">Run it again for a new set. If you went looking through a dozen measures for something that "works", this is what you would expect to find even when nothing does.</p>`;
      });
    },
  });
})();
