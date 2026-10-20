// The Workbook's method runner. One call, FM.WB.run(league, spec), takes a plain description of an analysis (which table, which columns, which method) and
// returns the numbers, a short list of plain facts, tables and a chart description. The LastMind AI Agent never calculates anything itself: it only writes
// the spec, and this file does the arithmetic (with the same routines as the Analysis Centre's statistics workshop, plus maximum likelihood fitting,
// difference-in-differences and resampling tests). Everything here is deterministic: resampling uses a seeded generator, so a result is the same every time.
//
// Methods:  describe, compare, correlation, ols, logistic, mle (poisson, negbin, probit, logit, normal), did, bootstrap
(function () {
  const FM = (window.FM = window.FM || {});
  const S = FM.STAT, T = FM.tables;
  const WB = (FM.WB = FM.WB || {});

  const fin = Number.isFinite;
  const f3 = (v) => (fin(v) ? Math.round(v * 1000) / 1000 : v);
  const sig = (v, n) => (fin(v) ? Number(v.toPrecision(n || 4)) : v);
  const pFmt = (p) => (!fin(p) ? '–' : p < 0.0001 ? '< 0.0001' : String(sig(p, 3)));
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const mean = (a) => (a.length ? sum(a) / a.length : NaN);
  const fail = (error) => ({ ok: false, error });

  // a seeded generator, so resampling gives the same answer every time
  function rng(seed) { let a = (seed >>> 0) || 12345; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ---------- reading the data ----------
  function colInfo(table, name) { const s = T.SCHEMA[table]; return s ? s.cols.find((c) => c.name === name) : null; }
  function checkCols(table, names) {
    if (!T.SCHEMA[table]) return 'There is no table called "' + table + '". The tables are: ' + Object.keys(T.SCHEMA).join(', ') + '.';
    for (const n of names) if (!colInfo(table, n)) return 'The table "' + table + '" has no column "' + n + '".';
    return null;
  }
  const OPS = { '=': (a, b) => a === b || (typeof a === 'number' && a === Number(b)), '!=': (a, b) => !(a === b || (typeof a === 'number' && a === Number(b))), '>': (a, b) => a > b, '>=': (a, b) => a >= b, '<': (a, b) => a < b, '<=': (a, b) => a <= b, in: (a, b) => Array.isArray(b) && b.indexOf(a) >= 0, contains: (a, b) => String(a).toLowerCase().indexOf(String(b).toLowerCase()) >= 0 };
  function filtered(league, table, where) {
    const rows = T.get(league, table) || [];
    return rows.filter((r) => (where || []).every((w) => OPS[w.op] && r[w.col] != null && OPS[w.op](r[w.col], w.value)));
  }
  const whereText = (where) => (where && where.length ? ' (where ' + where.map((w) => w.col + ' ' + w.op + ' ' + (Array.isArray(w.value) ? w.value.join('/') : w.value)).join(' and ') + ')' : '');

  // the design matrix: numeric columns as they are, category columns turned into 0/1 columns (the first level is the baseline)
  function design(rows, table, xs) {
    const cols = [], names = ['Intercept'];
    xs.forEach((x) => {
      const info = colInfo(table, x);
      if (info.type === 'cat') {
        const levels = [...new Set(rows.map((r) => r[x]))].sort();
        if (levels.length > 12) throw new Error('"' + x + '" has too many different values (' + levels.length + ') to use as a predictor.');
        levels.slice(1).forEach((lv) => { cols.push(rows.map((r) => (r[x] === lv ? 1 : 0))); names.push(x + ' = ' + lv + ' (against ' + levels[0] + ')'); });
      } else { cols.push(rows.map((r) => r[x])); names.push(x); }
    });
    return { X: rows.map((_, i) => [1].concat(cols.map((c) => c[i]))), names };
  }
  // keep rows where every named column is a real number (or a category), and return them
  function complete(rows, table, names) { return rows.filter((r) => names.every((n) => r[n] != null && (colInfo(table, n).type === 'cat' || fin(r[n])))); }

  // ---------- results ----------
  function coefTable(names, beta, se, stat, p, statName) {
    return { title: 'Coefficients', cols: ['Term', 'Estimate', 'Std. error', statName, 'p-value'], rows: names.map((n, i) => [n, sig(beta[i]), sig(se[i]), sig(stat[i], 3), pFmt(p[i])]) };
  }
  function histogram(vals, bins) {
    const lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), k = bins || Math.max(5, Math.min(20, Math.round(Math.sqrt(vals.length))));
    const w = (hi - lo) / k || 1, c = new Array(k).fill(0);
    vals.forEach((v) => { c[Math.min(k - 1, Math.floor((v - lo) / w))]++; });
    return { type: 'hist', x: 'value', y: 'count', bins: c.map((n, i) => ({ from: sig(lo + i * w), to: sig(lo + (i + 1) * w), n })) };
  }
  const sample = (xs, ys, n) => { const step = Math.max(1, Math.ceil(xs.length / n)), o = []; for (let i = 0; i < xs.length; i += step) o.push([xs[i], ys[i]]); return o; };

  // ---------- describe ----------
  function describe(league, s) {
    const e = checkCols(s.table, [s.y].concat(s.group ? [s.group] : [])); if (e) return fail(e);
    if (colInfo(s.table, s.y).type === 'cat') return fail('"' + s.y + '" is a category, not a number. Use a count or a numeric column.');
    const rows = complete(filtered(league, s.table, s.where), s.table, [s.y]);
    if (!rows.length) return fail('No rows match.');
    const one = (vals) => { const q = S.quartiles(vals); return [vals.length, sig(mean(vals)), sig(S.sd(vals, true)), Math.min.apply(null, vals), sig(q.q1 != null ? q.q1 : q[0]), sig(S.median(vals)), sig(q.q3 != null ? q.q3 : q[2]), Math.max.apply(null, vals)]; };
    const head = ['n', 'mean', 'sd', 'min', 'Q1', 'median', 'Q3', 'max'];
    const tables = [], out = { ok: true, method: 'describe', title: 'Summary of ' + s.y + ' in ' + s.table + whereText(s.where), n: rows.length, summary: [], tables, caveats: [] };
    if (s.group) {
      const by = {}; rows.forEach((r) => { (by[r[s.group]] = by[r[s.group]] || []).push(r[s.y]); });
      tables.push({ title: s.y + ' by ' + s.group, cols: [s.group].concat(head), rows: Object.keys(by).sort().map((k) => [k].concat(one(by[k]))) });
      out.chart = { type: 'bars', x: s.group, y: 'mean of ' + s.y, bars: Object.keys(by).sort().map((k) => ({ label: k, value: sig(mean(by[k])), n: by[k].length })) };
      out.summary.push('Mean ' + s.y + ' for each ' + s.group + ' is in the table; the chart shows the means.');
    } else {
      const vals = rows.map((r) => r[s.y]); const d = one(vals);
      tables.push({ title: s.y, cols: head, rows: [d] });
      out.chart = histogram(vals); out.chart.x = s.y;
      out.summary.push('Across ' + d[0] + ' rows, ' + s.y + ' has a mean of ' + d[1] + ' and a standard deviation of ' + d[2] + ' (median ' + d[5] + ').');
    }
    return out;
  }

  // ---------- compare two groups ----------
  function compare(league, s) {
    const e = checkCols(s.table, [s.y].concat(s.by ? [s.by] : [])); if (e) return fail(e);
    let A, B, labelA, labelB;
    if (s.by) {
      const rows = filtered(league, s.table, s.where), levels = [...new Set(rows.map((r) => r[s.by]))].sort();
      const a = s.a != null ? s.a : levels[0], b = s.b != null ? s.b : levels[1];
      if (b === undefined) return fail('"' + s.by + '" has only one value here, so there is nothing to compare.');
      if (s.a == null && s.b == null && levels.length > 2) return fail('"' + s.by + '" has ' + levels.length + ' values; say which two to compare (a and b).');
      A = rows.filter((r) => OPS['='](r[s.by], a)); B = rows.filter((r) => OPS['='](r[s.by], b)); labelA = s.by + ' = ' + a; labelB = s.by + ' = ' + b;
    } else if (s.groupA && s.groupB) {
      A = filtered(league, s.table, (s.where || []).concat(s.groupA)); B = filtered(league, s.table, (s.where || []).concat(s.groupB)); labelA = whereText(s.groupA).replace(/^ \(where |\)$/g, '') || 'group A'; labelB = whereText(s.groupB).replace(/^ \(where |\)$/g, '') || 'group B';
    } else return fail('Say how to split the rows: "by" (a column, with a and b for the two values) or "groupA" and "groupB" (two filters).');
    const a = complete(A, s.table, [s.y]).map((r) => r[s.y]), b = complete(B, s.table, [s.y]).map((r) => r[s.y]);
    if (a.length < 2 || b.length < 2) return fail('There are too few rows to compare (' + a.length + ' and ' + b.length + ').');
    const binary = a.concat(b).every((v) => v === 0 || v === 1);
    const t = S.tWelch(a, b), rand = rng(s.seed || 7), nA = a.length, all = a.concat(b);
    // a permutation test: shuffle which rows count as which group, many times
    let extreme = 0; const R = 4000, obs = Math.abs(mean(a) - mean(b));
    for (let i = 0; i < R; i++) {
      const idx = all.map((_, j) => j); for (let j = idx.length - 1; j > 0; j--) { const k = Math.floor(rand() * (j + 1)); [idx[j], idx[k]] = [idx[k], idx[j]]; }
      let sa = 0, sb = 0; for (let j = 0; j < idx.length; j++) { if (j < nA) sa += all[idx[j]]; else sb += all[idx[j]]; }
      if (Math.abs(sa / nA - sb / (all.length - nA)) >= obs - 1e-12) extreme++;
    }
    const pPerm = (extreme + 1) / (R + 1);
    // a bootstrap interval for the difference in means
    const diffs = []; for (let i = 0; i < 2000; i++) { let sa = 0, sb = 0; for (let j = 0; j < a.length; j++) sa += a[Math.floor(rand() * a.length)]; for (let j = 0; j < b.length; j++) sb += b[Math.floor(rand() * b.length)]; diffs.push(sa / a.length - sb / b.length); }
    diffs.sort((x, y) => x - y); const lo = diffs[Math.floor(0.025 * diffs.length)], hi = diffs[Math.floor(0.975 * diffs.length)];
    const out = { ok: true, method: 'compare', title: s.y + ': ' + labelA + ' against ' + labelB, n: a.length + b.length, summary: [], tables: [], caveats: [] };
    out.tables.push({ title: 'The two groups', cols: ['Group', 'n', binary ? 'share' : 'mean', 'sd'], rows: [[labelA, a.length, sig(mean(a)), sig(S.sd(a, true))], [labelB, b.length, sig(mean(b)), sig(S.sd(b, true))]] });
    out.tables.push({ title: 'Tests of the difference', cols: ['Test', 'Statistic', 'p-value'], rows: [['Welch t-test', 't = ' + sig(t.t, 3) + ' (df ' + sig(t.df, 3) + ')', pFmt(t.p)], ['Permutation test (4000 shuffles)', 'difference ' + sig(mean(a) - mean(b)), pFmt(pPerm)]] });
    out.summary.push(labelA + ' averages ' + sig(mean(a)) + ' against ' + sig(mean(b)) + ' for ' + labelB + ', a difference of ' + sig(mean(a) - mean(b)) + ' (95% bootstrap interval ' + sig(lo) + ' to ' + sig(hi) + ').');
    out.summary.push('The probability of a difference this large from chance alone is about ' + pFmt(pPerm) + ' (permutation test) or ' + pFmt(t.p) + ' (t-test). Effect size (Cohen\'s d) is ' + sig(t.d, 3) + '.');
    out.chart = { type: 'bars', x: 'group', y: 'mean of ' + s.y, bars: [{ label: labelA, value: sig(mean(a)), n: a.length, lo: sig(S.meanCI(a).lo), hi: sig(S.meanCI(a).hi) }, { label: labelB, value: sig(mean(b)), n: b.length, lo: sig(S.meanCI(b).lo), hi: sig(S.meanCI(b).hi) }], note: 'Bars show the mean with a 95% interval.' };
    if (Math.min(a.length, b.length) < 15) out.caveats.push('Fewer than 15 rows in one group, so the result is shaky. More matches would settle it.');
    out.caveats.push('This compares groups; it does not on its own show that one thing caused the other, because other differences between the rows may explain it.');
    return out;
  }

  // ---------- correlation ----------
  const ranks = (v) => { const idx = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]), r = new Array(v.length); let i = 0; while (i < idx.length) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; const rk = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k][1]] = rk; i = j + 1; } return r; };
  function correlation(league, s) {
    const e = checkCols(s.table, [s.x, s.y]); if (e) return fail(e);
    const rows = complete(filtered(league, s.table, s.where), s.table, [s.x, s.y]);
    if (rows.length < 4) return fail('There are only ' + rows.length + ' rows; a correlation needs a few more.');
    const x = rows.map((r) => r[s.x]), y = rows.map((r) => r[s.y]), n = x.length, r = S.pmcc(x, y), ct = S.corrTest(r, n), lr = S.linreg(x, y), rho = S.pmcc(ranks(x), ranks(y));
    const z = Math.atanh(Math.max(-0.9999, Math.min(0.9999, r))), zc = S.normInv(0.975), ciLo = Math.tanh(z - zc / Math.sqrt(Math.max(1, n - 3))), ciHi = Math.tanh(z + zc / Math.sqrt(Math.max(1, n - 3)));
    const out = { ok: true, method: 'correlation', title: s.y + ' against ' + s.x + whereText(s.where), n, summary: [], tables: [], caveats: [] };
    out.tables.push({ title: 'Correlation', cols: ['Measure', 'Value'], rows: [['Pearson r', sig(r, 3)], ['95% interval for r', sig(ciLo, 3) + ' to ' + sig(ciHi, 3)], ['p-value (r = 0)', pFmt(ct.p)], ['Spearman rank correlation', sig(rho, 3)], ['r squared', sig(lr.r2, 3)], ['Line of best fit', s.y + ' = ' + sig(lr.a) + ' + ' + sig(lr.b) + ' × ' + s.x]] });
    out.summary.push('Across ' + n + ' rows the correlation between ' + s.x + ' and ' + s.y + ' is r = ' + sig(r, 3) + ' (p ' + (ct.p < 0.0001 ? '< 0.0001' : '= ' + pFmt(ct.p)) + '). Each extra unit of ' + s.x + ' goes with ' + sig(lr.b) + ' ' + s.y + ' on the line of best fit, and ' + Math.round(100 * lr.r2) + '% of the variation in ' + s.y + ' is accounted for by ' + s.x + '.');
    out.chart = { type: 'scatter', x: s.x, y: s.y, points: sample(x, y, 400), fit: { a: sig(lr.a), b: sig(lr.b) } };
    out.caveats.push('Correlation is not cause: something else may drive both. The controlled experiment tool can test cause directly.');
    if (n < 20) out.caveats.push('Only ' + n + ' rows, so a large correlation can appear by chance.');
    return out;
  }

  // ---------- ordinary least squares and logistic regression ----------
  function regression(league, s, kind) {
    const xs = Array.isArray(s.x) ? s.x : [s.x]; const e = checkCols(s.table, [s.y].concat(xs)); if (e) return fail(e);
    if (colInfo(s.table, s.y).type === 'cat') return fail('"' + s.y + '" is a category; the outcome must be a number (use a 0/1 column for a logistic model).');
    const rows = complete(filtered(league, s.table, s.where), s.table, [s.y].concat(xs));
    let D; try { D = design(rows, s.table, xs); } catch (er) { return fail(er.message); }
    const y = rows.map((r) => r[s.y]), p = D.X[0].length;
    if (rows.length < p + 3) return fail('Only ' + rows.length + ' rows for ' + p + ' terms; that is too few to fit this model.');
    const out = { ok: true, method: kind, title: (kind === 'logistic' ? 'Logistic regression: ' : 'Linear regression: ') + s.y + ' on ' + xs.join(', '), n: rows.length, summary: [], tables: [], caveats: [] };
    if (kind === 'logistic') {
      if (!y.every((v) => v === 0 || v === 1)) return fail('A logistic model needs an outcome that is only 0 or 1; "' + s.y + '" is not.');
      const f = S.logistic(D.X, y); if (!f) return fail('The model could not be fitted. This usually means one predictor separates the outcomes perfectly or two predictors are copies of each other.');
      out.tables.push(coefTable(D.names, f.beta, f.se, f.z, f.p, 'z'));
      out.tables.push({ title: 'Odds ratios', cols: ['Term', 'Odds ratio', '95% interval'], rows: D.names.map((nm, i) => [nm, sig(Math.exp(f.beta[i]), 3), sig(Math.exp(f.beta[i] - 1.96 * f.se[i]), 3) + ' to ' + sig(Math.exp(f.beta[i] + 1.96 * f.se[i]), 3)]).slice(1) });
      out.tables.push({ title: 'Fit', cols: ['Measure', 'Value'], rows: [['Log-likelihood', sig(f.ll, 5)], ['McFadden pseudo R²', sig(f.mcfadden, 3)], ['Converged', f.converged ? 'yes (' + f.iterations + ' steps)' : 'no']] });
      const top = D.names.map((nm, i) => ({ nm, i })).slice(1).sort((a, b) => f.p[a.i] - f.p[b.i])[0];
      if (top) out.summary.push('The clearest predictor is ' + top.nm + ': each extra unit multiplies the odds of ' + s.y + ' = 1 by ' + sig(Math.exp(f.beta[top.i]), 3) + ' (p ' + (f.p[top.i] < 0.0001 ? '< 0.0001' : '= ' + pFmt(f.p[top.i])) + ').');
      if (!f.converged) out.caveats.push('The fitting did not fully settle, so treat the numbers with care.');
    } else {
      const f = S.ols(D.X, y); if (!f) return fail('The model could not be fitted: either there are too few rows or two predictors are exact copies of each other.');
      out.tables.push(coefTable(D.names, f.beta, f.se, f.t, f.p, 't'));
      out.tables.push({ title: 'Fit', cols: ['Measure', 'Value'], rows: [['R squared', sig(f.r2, 3)], ['Adjusted R squared', sig(f.adjR2, 3)], ['Residual standard error', sig(f.sigma, 3)], ['F-test of the whole model', 'F = ' + sig(f.F, 3) + ', p ' + pFmt(f.fp)]] });
      const top = D.names.map((nm, i) => ({ nm, i })).slice(1).sort((a, b) => f.p[a.i] - f.p[b.i])[0];
      if (top) out.summary.push('Holding the other terms fixed, ' + top.nm + ' goes with a change of ' + sig(f.beta[top.i]) + ' in ' + s.y + ' (p ' + (f.p[top.i] < 0.0001 ? '< 0.0001' : '= ' + pFmt(f.p[top.i])) + '). The model accounts for ' + Math.round(100 * f.r2) + '% of the variation in ' + s.y + '.');
      if (xs.length === 1 && colInfo(s.table, xs[0]).type !== 'cat') out.chart = { type: 'scatter', x: xs[0], y: s.y, points: sample(rows.map((r) => r[xs[0]]), y, 400), fit: { a: sig(f.beta[0]), b: sig(f.beta[1]) } };
    }
    if (rows.length < 10 * p) out.caveats.push('There are fewer than 10 rows for each term (' + rows.length + ' rows, ' + p + ' terms), so estimates will be unstable.');
    out.caveats.push('A regression shows association after allowing for the other terms. It does not prove cause: matches where a team presses hard may differ in other ways too.');
    return out;
  }

  // ---------- maximum likelihood ----------
  // Each model gives the log-likelihood of the data for a vector of parameters. The fitter climbs it with Newton's method (numerical gradient and
  // Hessian, step halving), reads standard errors from the curvature at the top, and tests the model against one with no predictors (a likelihood-ratio test).
  const LG = (x) => S.lgamma(x);
  const MODELS = {
    poisson: { name: 'Poisson', extra: [], ll(X, y, b) { let s = 0; for (let i = 0; i < y.length; i++) { const eta = dot(X[i], b), mu = Math.exp(Math.max(-30, Math.min(30, eta))); s += y[i] * eta - mu - LG(y[i] + 1); } return s; }, init: (y, p) => { const b = new Array(p).fill(0); b[0] = Math.log(Math.max(mean(y), 0.05)); return b; }, ok: (y) => y.every((v) => v >= 0 && Number.isInteger(v)) || 'Poisson needs counts (0, 1, 2, ...).', fitted: (X, b) => X.map((r) => Math.exp(dot(r, b))) },
    negbin: { name: 'Negative binomial', extra: ['log(alpha)'], ll(X, y, b) { const p = X[0].length, al = Math.exp(Math.max(-8, Math.min(8, b[p]))), r = 1 / al; let s = 0; for (let i = 0; i < y.length; i++) { const mu = Math.exp(Math.max(-30, Math.min(30, dot(X[i], b)))); s += LG(y[i] + r) - LG(r) - LG(y[i] + 1) + r * Math.log(r / (r + mu)) + y[i] * Math.log(mu / (r + mu)); } return s; }, init: (y, p) => { const b = new Array(p + 1).fill(0); b[0] = Math.log(Math.max(mean(y), 0.05)); b[p] = -0.5; return b; }, ok: (y) => y.every((v) => v >= 0 && Number.isInteger(v)) || 'The negative binomial needs counts (0, 1, 2, ...).', fitted: (X, b) => X.map((r) => Math.exp(dot(r, b))) },
    logit: { name: 'Logit', extra: [], ll(X, y, b) { let s = 0; for (let i = 0; i < y.length; i++) { const z = dot(X[i], b); s += y[i] * z - Math.log1p(Math.exp(-Math.abs(z))) - Math.max(z, 0); } return s; }, init: (y, p) => new Array(p).fill(0), ok: (y) => y.every((v) => v === 0 || v === 1) || 'Logit needs a 0/1 outcome.', fitted: (X, b) => X.map((r) => 1 / (1 + Math.exp(-dot(r, b)))) },
    probit: { name: 'Probit', extra: [], ll(X, y, b) { let s = 0; for (let i = 0; i < y.length; i++) { const c = Math.min(1 - 1e-12, Math.max(1e-12, S.normCdf(dot(X[i], b)))); s += y[i] ? Math.log(c) : Math.log(1 - c); } return s; }, init: (y, p) => new Array(p).fill(0), ok: (y) => y.every((v) => v === 0 || v === 1) || 'Probit needs a 0/1 outcome.', fitted: (X, b) => X.map((r) => S.normCdf(dot(r, b))) },
    normal: { name: 'Normal (least squares by likelihood)', extra: ['log(sigma)'], ll(X, y, b) { const p = X[0].length, sg = Math.exp(Math.max(-10, Math.min(10, b[p]))); let s = 0; for (let i = 0; i < y.length; i++) { const z = (y[i] - dot(X[i], b)) / sg; s += -0.5 * z * z - Math.log(sg) - 0.9189385332046727; } return s; }, init: (y, p) => { const b = new Array(p + 1).fill(0); b[0] = mean(y); b[p] = Math.log(Math.max(S.sd(y, true), 1e-3)); return b; }, ok: () => true, fitted: (X, b) => X.map((r) => dot(r, b)) },
  };
  function dot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }

  function maximise(model, X, y) {
    const p = X[0].length, k = p + model.extra.length; let b = model.init(y, p);
    const f = (v) => { const r = model.ll(X, y, v); return fin(r) ? r : -1e18; };
    const grad = (v) => v.map((_, j) => { const h = 1e-5 * Math.max(1, Math.abs(v[j])), u = v.slice(), d = v.slice(); u[j] += h; d[j] -= h; return (f(u) - f(d)) / (2 * h); });
    const hess = (v) => { const g0 = grad(v), H = Array.from({ length: k }, () => new Array(k).fill(0)); for (let j = 0; j < k; j++) { const h = 1e-4 * Math.max(1, Math.abs(v[j])), u = v.slice(); u[j] += h; const g1 = grad(u); for (let i = 0; i < k; i++) H[i][j] = (g1[i] - g0[i]) / h; } return H.map((r, i) => r.map((v2, j) => (v2 + H[j][i]) / 2)); };
    let cur = f(b), converged = false, it = 0;
    for (; it < 60; it++) {
      const g = grad(b), H = hess(b), negH = H.map((r) => r.map((v) => -v));
      // Newton's step where the likelihood curves the right way; where it does not (far from the top) the curvature is damped until the step really goes uphill.
      let nb = b, nv = cur, lam = 0;
      const scale = Math.max.apply(null, negH.map((r, i) => Math.abs(r[i]))) || 1;
      for (let tries = 0; tries < 14; tries++) {
        const A = negH.map((r, i) => r.map((v, j) => v + (i === j ? lam : 0)));
        let step = S.solve(A, g);
        if (step && step.every(fin) && sum(step.map((v, j) => v * g[j])) > 0) {
          let t = 1;
          for (let h = 0; h < 25; h++) { const cand = b.map((v, j) => v + t * step[j]), val = f(cand); if (val > cur - 1e-12) { nb = cand; nv = val; break; } t /= 2; }
          if (nb !== b) break;
        }
        lam = lam ? lam * 10 : 1e-4 * scale;
      }
      const move = Math.max.apply(null, nb.map((v, j) => Math.abs(v - b[j]))), gain = nv - cur; b = nb; cur = nv;
      if (move < 1e-7 || (gain >= 0 && gain < 1e-10 && it > 3)) { converged = true; break; }
    }
    const H = hess(b), cov = S.invert(H.map((r) => r.map((v) => -v)));
    return { b, ll: cur, cov, converged, iterations: it + 1, k };
  }
  function mle(league, s) {
    const model = MODELS[s.model]; if (!model) return fail('Unknown model "' + s.model + '". Models: ' + Object.keys(MODELS).join(', ') + '.');
    const xs = Array.isArray(s.x) ? s.x : s.x ? [s.x] : []; const e = checkCols(s.table, [s.y].concat(xs)); if (e) return fail(e);
    const rows = complete(filtered(league, s.table, s.where), s.table, [s.y].concat(xs)).slice(0, 6000);
    let D; try { D = design(rows, s.table, xs); } catch (er) { return fail(er.message); }
    const y = rows.map((r) => r[s.y]), p = D.X[0].length, chk = model.ok(y);
    if (chk !== true) return fail(chk + ' "' + s.y + '" does not fit.');
    if (rows.length < p + 5) return fail('Only ' + rows.length + ' rows for ' + p + ' terms.');
    const fit = maximise(model, D.X, y);
    if ((!fit.cov || !fit.cov.every((r) => r.every(fin)) || fit.b[p] < -7) && s.model === 'negbin') {   // no extra spread: the negative binomial is just a Poisson
      const r = mle(league, Object.assign({}, s, { model: 'poisson' })); if (r.ok) { r.caveats.unshift('The data are no more spread out than a Poisson model allows (the extra spread parameter went to zero), so the negative binomial reduces to the Poisson, shown here.'); } return r;
    }
    if (!fit.cov || !fit.cov.every((r) => r.every(fin))) return fail('The fit could not be pinned down (the likelihood is too flat or two predictors are copies of each other).');
    const names = D.names.concat(model.extra), se = fit.b.map((_, j) => Math.sqrt(Math.max(0, fit.cov[j][j]))), z = fit.b.map((v, j) => v / se[j]), pv = z.map((v) => 2 * (1 - S.normCdf(Math.abs(v))));
    const null0 = maximise(model, D.X.map((r) => [r[0]]), y), n = rows.length, k = fit.k, lr = 2 * (fit.ll - null0.ll), ldf = p - 1;
    const out = { ok: true, method: 'mle', title: model.name + ' model by maximum likelihood: ' + s.y + (xs.length ? ' on ' + xs.join(', ') : ' (no predictors)'), n, summary: [], tables: [], caveats: [] };
    out.tables.push(coefTable(names, fit.b, se, z, pv, 'z'));
    const fitRows = [['Log-likelihood', sig(fit.ll, 6)], ['AIC', sig(2 * k - 2 * fit.ll, 6)], ['BIC', sig(Math.log(n) * k - 2 * fit.ll, 6)]];
    if (ldf > 0) { fitRows.push(['Log-likelihood with no predictors', sig(null0.ll, 6)]); fitRows.push(['Likelihood-ratio test', 'χ² = ' + sig(lr, 4) + ' on ' + ldf + ' df, p ' + pFmt(S.chi2Sf(Math.max(0, lr), ldf))]); fitRows.push(['McFadden pseudo R²', sig(1 - fit.ll / null0.ll, 3)]); }
    fitRows.push(['Converged', fit.converged ? 'yes (' + fit.iterations + ' steps)' : 'no']);
    out.tables.push({ title: 'Fit', cols: ['Measure', 'Value'], rows: fitRows });
    if (s.model === 'poisson' || s.model === 'negbin') {
      const mu = model.fitted(D.X, fit.b), lim = 4, obs = new Array(lim + 1).fill(0), exp = new Array(lim + 1).fill(0);
      y.forEach((v) => { obs[Math.min(lim, v)]++; });
      mu.forEach((m, i) => { let cum = 0; for (let c = 0; c < lim; c++) { let pr; if (s.model === 'poisson') pr = Math.exp(c * Math.log(m) - m - LG(c + 1)); else { const r = 1 / Math.exp(fit.b[p]); pr = Math.exp(LG(c + r) - LG(r) - LG(c + 1) + r * Math.log(r / (r + m)) + c * Math.log(m / (r + m))); } exp[c] += pr; cum += pr; } exp[lim] += Math.max(0, 1 - cum); });
      out.tables.push({ title: 'Observed against what the model expects', cols: ['Count', 'Observed', 'Expected'], rows: obs.map((o, c) => [c === lim ? lim + ' or more' : String(c), o, sig(exp[c], 4)]) });
      out.chart = { type: 'bars2', x: 'count', y: 'rows', labels: obs.map((_, c) => (c === lim ? lim + '+' : String(c))), a: { name: 'observed', values: obs }, b: { name: 'expected', values: exp.map((v) => sig(v, 4)) } };
    }
    if (xs.length) {
      const i = D.names.map((nm, j) => ({ nm, j })).slice(1).sort((a, b) => pv[a.j] - pv[b.j])[0];
      const link = s.model === 'poisson' || s.model === 'negbin' ? 'multiplies the expected ' + s.y + ' by ' + sig(Math.exp(fit.b[i.j]), 3) : s.model === 'logit' ? 'multiplies the odds by ' + sig(Math.exp(fit.b[i.j]), 3) : s.model === 'normal' ? 'changes ' + s.y + ' by ' + sig(fit.b[i.j], 3) : 'raises the probit index (the z-score of the chance) by ' + sig(fit.b[i.j], 3);
      out.summary.push('The most informative term is ' + i.nm + ': each extra unit ' + link + ' (p ' + (pv[i.j] < 0.0001 ? '< 0.0001' : '= ' + pFmt(pv[i.j])) + ').');
    } else out.summary.push('Fitted ' + model.name + ' to ' + n + ' values of ' + s.y + (s.model === 'poisson' ? ': the rate is ' + sig(Math.exp(fit.b[0]), 4) + ' per row.' : '.'));
    if (!fit.converged) out.caveats.push('The fitting did not fully settle, so treat the numbers with care.');
    if (n < 10 * p) out.caveats.push('Few rows for the number of terms (' + n + ' rows, ' + p + ' terms), so estimates will be unstable.');
    out.caveats.push('Maximum likelihood finds the parameter values that make the data you saw most probable. The standard errors rely on having enough rows for the curvature to be a good guide.');
    return out;
  }

  // ---------- difference in differences ----------
  function did(league, s) {
    const e = checkCols(s.table, [s.y, s.treat.col, s.after.col]); if (e) return fail(e);
    const rows = complete(filtered(league, s.table, s.where), s.table, [s.y]);
    const tr = (r) => (OPS[s.treat.op || '='](r[s.treat.col], s.treat.value) ? 1 : 0), af = (r) => (OPS[s.after.op || '>='](r[s.after.col], s.after.value) ? 1 : 0);
    const cell = { '00': [], '01': [], '10': [], '11': [] }; rows.forEach((r) => { cell[tr(r) + '' + af(r)].push(r[s.y]); });
    if (Object.keys(cell).some((k) => cell[k].length < 2)) return fail('Each of the four groups (treated or not, before or after) needs at least 2 rows. Counts: ' + Object.keys(cell).map((k) => (k[0] === '1' ? 'treated' : 'comparison') + ' ' + (k[1] === '1' ? 'after' : 'before') + ' = ' + cell[k].length).join(', ') + '.');
    const X = rows.map((r) => [1, tr(r), af(r), tr(r) * af(r)]), y = rows.map((r) => r[s.y]), f = S.ols(X, y); if (!f) return fail('The model could not be fitted.');
    const m = (k) => mean(cell[k]), est = f.beta[3];
    const out = { ok: true, method: 'did', title: 'Difference in differences: ' + s.y, n: rows.length, summary: [], tables: [], caveats: [] };
    out.tables.push({ title: 'Average ' + s.y, cols: ['', 'Before', 'After', 'Change'], rows: [['Treated', sig(m('10')), sig(m('11')), sig(m('11') - m('10'))], ['Comparison', sig(m('00')), sig(m('01')), sig(m('01') - m('00'))], ['Difference in differences', '', '', sig(est)]] });
    out.tables.push(coefTable(['Intercept (comparison, before)', 'Treated group', 'After', 'Treated × After (the DiD estimate)'], f.beta, f.se, f.t, f.p, 't'));
    out.summary.push('The treated group changed by ' + sig(m('11') - m('10')) + ' while the comparison group changed by ' + sig(m('01') - m('00')) + ', so the difference in differences is ' + sig(est) + ' (95% interval ' + sig(est - S.tInv(0.975, f.df) * f.se[3]) + ' to ' + sig(est + S.tInv(0.975, f.df) * f.se[3]) + ', p ' + pFmt(f.p[3]) + ').');
    out.chart = { type: 'bars2', x: 'period', y: 'mean ' + s.y, labels: ['Before', 'After'], a: { name: 'treated', values: [sig(m('10')), sig(m('11'))] }, b: { name: 'comparison', values: [sig(m('00')), sig(m('01'))] } };
    out.caveats.push('This only measures the effect of the change if the treated and comparison groups would have moved in parallel without it (the parallel-trends assumption). Check that their trends match before the change.');
    if (Math.min.apply(null, Object.keys(cell).map((k) => cell[k].length)) < 8) out.caveats.push('One of the four groups has fewer than 8 rows, so the estimate is rough.');
    return out;
  }

  // ---------- bootstrap interval for one statistic ----------
  function bootstrap(league, s) {
    const e = checkCols(s.table, [s.y]); if (e) return fail(e);
    const vals = complete(filtered(league, s.table, s.where), s.table, [s.y]).map((r) => r[s.y]);
    if (vals.length < 5) return fail('Only ' + vals.length + ' rows; a bootstrap needs a few more.');
    const stat = { mean, median: S.median, sd: (v) => S.sd(v, true) }[s.statistic || 'mean']; if (!stat) return fail('The statistic must be mean, median or sd.');
    const rand = rng(s.seed || 11), B = 4000, est = []; for (let i = 0; i < B; i++) { const smp = []; for (let j = 0; j < vals.length; j++) smp.push(vals[Math.floor(rand() * vals.length)]); est.push(stat(smp)); }
    est.sort((a, b) => a - b); const lo = est[Math.floor(0.025 * B)], hi = est[Math.floor(0.975 * B)];
    const out = { ok: true, method: 'bootstrap', title: 'Bootstrap interval for the ' + (s.statistic || 'mean') + ' of ' + s.y, n: vals.length, summary: [], tables: [], caveats: [] };
    out.tables.push({ title: 'Result', cols: ['Measure', 'Value'], rows: [['Observed ' + (s.statistic || 'mean'), sig(stat(vals))], ['95% bootstrap interval', sig(lo) + ' to ' + sig(hi)], ['Resamples', B]] });
    out.summary.push('The ' + (s.statistic || 'mean') + ' of ' + s.y + ' is ' + sig(stat(vals)) + ', and resampling the ' + vals.length + ' rows 4000 times puts a 95% interval on it of ' + sig(lo) + ' to ' + sig(hi) + '.');
    out.chart = histogram(est, 20); out.chart.x = 'resampled ' + (s.statistic || 'mean');
    return out;
  }

  WB._maximise = maximise; WB._models = MODELS;
  const METHODS = { describe, compare, correlation, ols: (l, s) => regression(l, s, 'ols'), logistic: (l, s) => regression(l, s, 'logistic'), mle, did, bootstrap };
  WB.METHODS = Object.keys(METHODS);
  WB.run = function (league, spec) {
    try {
      if (!spec || !METHODS[spec.method]) return fail('Unknown method "' + (spec && spec.method) + '". Methods: ' + Object.keys(METHODS).join(', ') + '.');
      const r = (WB.extraMethods && WB.extraMethods[spec.method]) ? WB.extraMethods[spec.method](league, spec) : METHODS[spec.method](league, spec);
      r.spec = spec; return r;
    } catch (e) { return fail('That analysis could not be run: ' + (e && e.message ? e.message : e)); }
  };
  WB.register = function (name, fn) { METHODS[name] = fn; WB.METHODS = Object.keys(METHODS); };

  // What the agent is told about the methods (kept next to the code so the two cannot drift apart).
  WB.METHOD_HELP = [
    '{"method":"describe","table":T,"y":COL,"group":COL?,"where":[...]?}  summary figures and a histogram (or means by group)',
    '{"method":"compare","table":T,"y":COL,"by":COL,"a":VALUE?,"b":VALUE?,"where":[...]?}  or with "groupA":[...],"groupB":[...] filters instead of "by"; Welch t-test, permutation test, bootstrap interval, effect size',
    '{"method":"correlation","table":T,"x":COL,"y":COL,"where":[...]?}  Pearson and Spearman, interval, line of best fit, scatter',
    '{"method":"ols","table":T,"y":COL,"x":[COLS],"where":[...]?}  multiple linear regression (category columns become dummies)',
    '{"method":"logistic","table":T,"y":0/1 COL,"x":[COLS],"where":[...]?}  logistic regression with odds ratios',
    '{"method":"mle","model":"poisson"|"negbin"|"logit"|"probit"|"normal","table":T,"y":COL,"x":[COLS] (may be empty),"where":[...]?}  maximum likelihood fit with standard errors, likelihood-ratio test, AIC/BIC, observed against expected counts',
    '{"method":"did","table":T,"y":COL,"treat":{"col":COL,"op":"=","value":V},"after":{"col":COL,"op":">=","value":V},"where":[...]?}  difference in differences',
    '{"method":"bootstrap","table":T,"y":COL,"statistic":"mean"|"median"|"sd","where":[...]?}  bootstrap interval',
    '{"method":"experiment", ...}  a controlled experiment that replays the same matches with one tactic changed (see below)',
  ];
})();
