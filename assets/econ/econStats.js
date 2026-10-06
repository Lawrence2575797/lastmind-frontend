/*
 * LastMind Be the Chancellor: the Treasury analysis lab, estimation side.
 * The methods an applied economist actually uses, written out in plain JavaScript so nothing is a black box:
 *   ols, robust and cluster-robust standard errors, t and normal tails, confidence intervals
 *   naive before-and-after, two-way fixed-effects difference-in-differences, event studies with a pre-trend test,
 *   group-time (Callaway-Sant'Anna style) effects for staggered adoption, synthetic control with placebo tests,
 *   randomisation inference and the cluster bootstrap, and cost-benefit analysis with Monte Carlo sensitivity.
 * Pure logic, no page code, runs in Node. Panels are arrays of rows { unit, q, cohort, post, rel, <outcome> } as made by econLab.js.
 */
(function (root) {
  'use strict';
  var mean = function (a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return a.length ? s / a.length : NaN; };
  var sd = function (a) { var m = mean(a), s = 0; for (var i = 0; i < a.length; i++) s += (a[i] - m) * (a[i] - m); return a.length > 1 ? Math.sqrt(s / (a.length - 1)) : NaN; };
  var uniq = function (a) { var o = {}, r = []; a.forEach(function (x) { if (!o[x]) { o[x] = 1; r.push(x); } }); return r; };

  /* ---------- distributions ---------- */
  function lgamma(x) { var c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5], y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); var s = 1.000000000190015; for (var j = 0; j < 6; j++) s += c[j] / ++y; return -t + Math.log(2.5066282746310005 * s / x); }
  function betacf(a, b, x) { var qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d; var h = d; for (var m = 1; m <= 200; m++) { var m2 = 2 * m, aa = m * (b - m) * x / ((qam + m2) * (a + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; h *= d * c; aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; var del = d * c; h *= del; if (Math.abs(del - 1) < 3e-12) break; } return h; }
  function ibeta(x, a, b) { if (x <= 0) return 0; if (x >= 1) return 1; var bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x)); return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b; }
  function tCdf(t, df) { var x = df / (df + t * t), p = 0.5 * ibeta(x, df / 2, 0.5); return t > 0 ? 1 - p : p; }
  function pTwoSided(t, df) { return 2 * (1 - tCdf(Math.abs(t), df)); }
  function tCrit(df, level) { level = level || 0.95; var lo = 0, hi = 60, target = 1 - (1 - level) / 2; for (var i = 0; i < 80; i++) { var mid = (lo + hi) / 2; if (tCdf(mid, df) < target) lo = mid; else hi = mid; } return (lo + hi) / 2; }
  function normCdf(z) { var t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; }
  function fCdf(x, d1, d2) { if (x <= 0) return 0; return ibeta(d1 * x / (d1 * x + d2), d1 / 2, d2 / 2); }
  function chi2Cdf(x, k) { if (x <= 0) return 0; var a = k / 2, xx = x / 2; // regularised lower incomplete gamma by series
    var sum = 1 / a, term = 1 / a; for (var n = 1; n < 300; n++) { term *= xx / (a + n); sum += term; if (Math.abs(term) < 1e-12) break; } return Math.min(1, sum * Math.exp(-xx + a * Math.log(xx) - lgamma(a))); }

  /* ---------- linear algebra ---------- */
  function transpose(A) { var r = A.length, c = A[0].length, T = []; for (var j = 0; j < c; j++) { T.push([]); for (var i = 0; i < r; i++) T[j].push(A[i][j]); } return T; }
  function matmul(A, B) { var n = A.length, m = B[0].length, k = B.length, C = []; for (var i = 0; i < n; i++) { var row = new Array(m).fill(0); for (var l = 0; l < k; l++) { var a = A[i][l]; if (a === 0) continue; for (var j = 0; j < m; j++) row[j] += a * B[l][j]; } C.push(row); } return C; }
  function inverse(M) {
    var n = M.length, A = M.map(function (r, i) { return r.concat(new Array(n).fill(0).map(function (_, j) { return i === j ? 1 : 0; })); });
    for (var c = 0; c < n; c++) {
      var p = c; for (var r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      if (Math.abs(A[p][c]) < 1e-12) return null;
      var tmp = A[c]; A[c] = A[p]; A[p] = tmp;
      var d = A[c][c]; for (var j = 0; j < 2 * n; j++) A[c][j] /= d;
      for (r = 0; r < n; r++) if (r !== c) { var f = A[r][c]; if (f !== 0) for (j = 0; j < 2 * n; j++) A[r][j] -= f * A[c][j]; }
    }
    return A.map(function (r) { return r.slice(n); });
  }

  /* ---------- regression ---------- */
  // X is an array of rows (include a column of 1s yourself for an intercept). cluster: optional array of group ids, one per row.
  function ols(X, y, cluster) {
    var n = X.length, k = X[0].length, Xt = transpose(X), XtX = matmul(Xt, X), inv = inverse(XtX);
    if (!inv) return null;
    var Xty = Xt.map(function (row) { var s = 0; for (var i = 0; i < n; i++) s += row[i] * y[i]; return s; });
    var beta = inv.map(function (row) { var s = 0; for (var j = 0; j < k; j++) s += row[j] * Xty[j]; return s; });
    var e = y.map(function (yi, i) { var f = 0; for (var j = 0; j < k; j++) f += X[i][j] * beta[j]; return yi - f; });
    var ssr = 0, ybar = mean(y), sst = 0; e.forEach(function (v, i) { ssr += v * v; sst += (y[i] - ybar) * (y[i] - ybar); });
    var s2 = ssr / (n - k), V = inv.map(function (r) { return r.map(function (v) { return v * s2; }); });
    var Vr = null, G = null;
    if (cluster) {
      var ids = uniq(cluster); G = ids.length;
      var meat = []; for (var a = 0; a < k; a++) meat.push(new Array(k).fill(0));
      ids.forEach(function (g) { var s = new Array(k).fill(0); for (var i = 0; i < n; i++) if (cluster[i] === g) for (var j = 0; j < k; j++) s[j] += X[i][j] * e[i]; for (var p = 0; p < k; p++) for (var q = 0; q < k; q++) meat[p][q] += s[p] * s[q]; });
      var adj = (G / (G - 1)) * ((n - 1) / (n - k)), B = matmul(matmul(inv, meat), inv);
      Vr = B.map(function (r) { return r.map(function (v) { return v * adj; }); });
    } else {
      var meat2 = []; for (a = 0; a < k; a++) meat2.push(new Array(k).fill(0));
      for (var i2 = 0; i2 < n; i2++) for (var p2 = 0; p2 < k; p2++) for (var q2 = 0; q2 < k; q2++) meat2[p2][q2] += X[i2][p2] * X[i2][q2] * e[i2] * e[i2];
      var B2 = matmul(matmul(inv, meat2), inv), adj2 = n / (n - k); Vr = B2.map(function (r) { return r.map(function (v) { return v * adj2; }); });
    }
    return { beta: beta, resid: e, V: V, Vrobust: Vr, se: V.map(function (r, i) { return Math.sqrt(r[i]); }), seRobust: Vr.map(function (r, i) { return Math.sqrt(Math.max(0, r[i])); }), n: n, k: k, r2: 1 - ssr / sst, clusters: G, df: G ? G - 1 : n - k };
  }
  function ci(est, se, df, level) { var c = tCrit(df, level || 0.95); return [est - c * se, est + c * se]; }

  /* ---------- panels ---------- */
  function panelIndex(rows) { var units = uniq(rows.map(function (r) { return r.unit; })), qs = uniq(rows.map(function (r) { return r.q; })).sort(function (a, b) { return a - b; }), at = {}; rows.forEach(function (r) { at[r.unit + '|' + r.q] = r; }); return { units: units, qs: qs, at: at }; }
  // Remove unit and time means (the two-way "within" transform, exact for a balanced panel).
  function twoWayDemean(rows, vals, P) {
    var byU = {}, byQ = {}, n = rows.length, grand = mean(vals); rows.forEach(function (r, i) { (byU[r.unit] = byU[r.unit] || []).push(vals[i]); (byQ[r.q] = byQ[r.q] || []).push(vals[i]); });
    var mu = {}, mq = {}; Object.keys(byU).forEach(function (u) { mu[u] = mean(byU[u]); }); Object.keys(byQ).forEach(function (q) { mq[q] = mean(byQ[q]); });
    return vals.map(function (v, i) { return v - mu[rows[i].unit] - mq[rows[i].q] + grand; });
  }

  // The naive answer: how much did the outcome change in the treated countries between the five quarters before and after adoption?
  function beforeAfter(rows, outcome, window) {
    window = window || 6; var diffs = [], byU = {}; rows.forEach(function (r) { (byU[r.unit] = byU[r.unit] || []).push(r); });
    Object.keys(byU).forEach(function (u) {
      var rs = byU[u]; if (!rs[0].cohort) return; var tq = rs[0].cohort, lag = rs.filter(function (r) { return r.post; })[0]; lag = lag ? lag.q - tq : 0;
      var pre = rs.filter(function (r) { return r.q < tq && r.q >= tq - window; }).map(function (r) { return r[outcome]; }), post = rs.filter(function (r) { return r.q >= tq + lag && r.q < tq + lag + window; }).map(function (r) { return r[outcome]; });
      if (pre.length && post.length) diffs.push(mean(post) - mean(pre));
    });
    var est = mean(diffs), se = sd(diffs) / Math.sqrt(diffs.length);
    return { est: est, se: se, n: diffs.length, ci: ci(est, se, diffs.length - 1), p: pTwoSided(est / se, diffs.length - 1), perUnit: diffs };
  }

  // Two-way fixed effects difference-in-differences: outcome on a post-adoption indicator with country and quarter effects.
  function twfe(rows, outcome) {
    var P = panelIndex(rows), y = twoWayDemean(rows, rows.map(function (r) { return r[outcome]; }), P), d = twoWayDemean(rows, rows.map(function (r) { return r.post; }), P);
    var fit = ols(d.map(function (v) { return [v]; }), y, rows.map(function (r) { return r.unit; }));
    if (!fit) return null;
    var est = fit.beta[0], se = fit.seRobust[0], df = fit.clusters - 1;
    return { est: est, se: se, seNaive: fit.se[0], df: df, ci: ci(est, se, df), p: pTwoSided(est / se, df), n: rows.length, units: P.units.length };
  }

  // Classic 2x2: treated vs never-treated, the quarters before adoption vs after (cohort-by-cohort), for teaching the arithmetic.
  function did2x2(rows, outcome, window) {
    window = window || 6; var byU = {}; rows.forEach(function (r) { (byU[r.unit] = byU[r.unit] || []).push(r); });
    var lagOf = function (rs) { var p = rs.filter(function (r) { return r.post; })[0]; return p ? p.q - rs[0].cohort : 0; };
    var treated = Object.keys(byU).filter(function (u) { return byU[u][0].cohort; }), never = Object.keys(byU).filter(function (u) { return !byU[u][0].cohort; });
    var tPre = [], tPost = [], cPre = [], cPost = [];
    treated.forEach(function (u) { var rs = byU[u], tq = rs[0].cohort, lg = lagOf(rs);
      var pre = rs.filter(function (r) { return r.q < tq && r.q >= tq - window; }), post = rs.filter(function (r) { return r.q >= tq + lg && r.q < tq + lg + window; });
      tPre.push(mean(pre.map(function (r) { return r[outcome]; }))); tPost.push(mean(post.map(function (r) { return r[outcome]; })));
      never.forEach(function (c) { var cr = byU[c]; cPre.push(mean(cr.filter(function (r) { return r.q < tq && r.q >= tq - window; }).map(function (r) { return r[outcome]; }))); cPost.push(mean(cr.filter(function (r) { return r.q >= tq + lg && r.q < tq + lg + window; }).map(function (r) { return r[outcome]; }))); });
    });
    var a = mean(tPost), b = mean(tPre), c = mean(cPost), d = mean(cPre);
    return { treatedBefore: b, treatedAfter: a, controlBefore: d, controlAfter: c, change: a - b, controlChange: c - d, est: (a - b) - (c - d), nTreated: treated.length, nControl: never.length };
  }

  // Event study: effect by quarters since adoption, the quarter before adoption as the reference. Leads should be zero if trends were parallel.
  function eventStudy(rows, outcome, lead, lag) {
    lead = lead || 6; lag = lag || 10; var P = panelIndex(rows), ks = []; for (var k = -lead; k <= lag; k++) if (k !== -1) ks.push(k);
    var y = twoWayDemean(rows, rows.map(function (r) { return r[outcome]; }), P);
    var cols = ks.map(function (kk) { var v = rows.map(function (r) { if (!r.cohort) return 0; var rel = r.rel; if (kk === -lead && rel < -lead) return 1; if (kk === lag && rel > lag) return 1; return rel === kk ? 1 : 0; }); return twoWayDemean(rows, v, P); });
    var X = rows.map(function (_, i) { return cols.map(function (c) { return c[i]; }); });
    var fit = ols(X, y, rows.map(function (r) { return r.unit; }));
    if (!fit) return null;
    var df = fit.clusters - 1, points = ks.map(function (kk, j) { var est = fit.beta[j], se = fit.seRobust[j]; return { k: kk, est: est, se: se, ci: ci(est, se, df) }; });
    points.push({ k: -1, est: 0, se: 0, ci: [0, 0], ref: true }); points.sort(function (a, b) { return a.k - b.k; });
    // Joint test that every lead is zero: a Wald statistic with the clustered covariance, referred to a chi-squared distribution.
    var li = []; ks.forEach(function (kk, j) { if (kk < -1) li.push(j); });
    var wald = null, pv = null;
    if (li.length) { var Vs = li.map(function (a) { return li.map(function (b) { return fit.Vrobust[a][b]; }); }), Vi = inverse(Vs), bs = li.map(function (a) { return fit.beta[a]; });
      if (Vi) { wald = 0; for (var a = 0; a < li.length; a++) for (var b = 0; b < li.length; b++) wald += bs[a] * Vi[a][b] * bs[b]; pv = 1 - fCdf(wald / li.length, li.length, Math.max(1, fit.clusters - 1)); } }   // an F reference, because there are few clusters for a chi-squared one
    return { points: points, preTest: { stat: wald, df: li.length, p: pv }, df: df };
  }

  // Staggered adoption: the effect for each adoption quarter g and each quarter t, using never-treated countries as the comparison and the
  // quarter before adoption as the base. Averaged by event time, weighting cohorts by size. Standard errors by bootstrap over countries.
  function groupTime(rows, outcome, opts) {
    opts = opts || {}; var reps = opts.reps == null ? 200 : opts.reps, rng = opts.rng || Math.random, maxK = opts.maxK || 10, minK = opts.minK || -6;
    function est(rs) {
      var byU = {}; rs.forEach(function (r) { (byU[r.unit] = byU[r.unit] || {})[r.q] = r; });
      var units = Object.keys(byU), never = units.filter(function (u) { return !byU[u][Object.keys(byU[u])[0]].cohort; });
      var cohorts = uniq(units.map(function (u) { return byU[u][Object.keys(byU[u])[0]].cohort; }).filter(function (c) { return c; }));
      var agg = {};
      cohorts.forEach(function (g) {
        var tr = units.filter(function (u) { return byU[u][Object.keys(byU[u])[0]].cohort === g; }); if (!tr.length || !never.length) return;
        for (var k = minK; k <= maxK; k++) { var t = g + k; if (k === -1 || t < 1) continue; var base = g - 1; if (base < 1) continue;
          var dT = [], dC = []; tr.forEach(function (u) { if (byU[u][t] && byU[u][base]) dT.push(byU[u][t][outcome] - byU[u][base][outcome]); }); never.forEach(function (u) { if (byU[u][t] && byU[u][base]) dC.push(byU[u][t][outcome] - byU[u][base][outcome]); });
          if (!dT.length || !dC.length) continue; agg[k] = agg[k] || { s: 0, w: 0 }; agg[k].s += tr.length * (mean(dT) - mean(dC)); agg[k].w += tr.length; }
      });
      var out = {}; Object.keys(agg).forEach(function (k) { out[k] = agg[k].s / agg[k].w; }); return out;
    }
    var point = est(rows), draws = {}, units = uniq(rows.map(function (r) { return r.unit; }));
    for (var b = 0; b < reps; b++) {
      var pick = []; for (var i = 0; i < units.length; i++) pick.push(units[Math.floor(rng() * units.length)]);
      var rs = []; pick.forEach(function (u, idx) { rows.forEach(function (r) { if (r.unit === u) { var c = {}; for (var key in r) c[key] = r[key]; c.unit = u + '#' + idx; rs.push(c); } }); });
      var e = est(rs); Object.keys(e).forEach(function (k) { (draws[k] = draws[k] || []).push(e[k]); });
    }
    var points = Object.keys(point).map(Number).sort(function (a, b) { return a - b; }).map(function (k) { var s = draws[k] ? sd(draws[k]) : NaN; return { k: k, est: point[k], se: s, ci: [point[k] - 1.96 * s, point[k] + 1.96 * s] }; });
    points.push({ k: -1, est: 0, se: 0, ci: [0, 0], ref: true }); points.sort(function (a, b) { return a.k - b.k; });
    var post = points.filter(function (p) { return p.k >= (opts.lag || 0) && !p.ref; }), att = mean(post.map(function (p) { return p.est; }));
    var attDraws = []; for (b = 0; b < reps; b++) { var vals = []; post.forEach(function (p) { if (draws[p.k] && draws[p.k][b] != null) vals.push(draws[p.k][b]); }); if (vals.length) attDraws.push(mean(vals)); }
    var attSe = sd(attDraws);
    // Pre-trend test: are all the lead effects (before adoption) jointly zero? The statistic is the sum of squared standardised leads; how large it
    // would be by chance comes from the same bootstrap draws re-centred on zero.
    var leads = points.filter(function (p) { return p.k <= -2 && draws[p.k] && draws[p.k].length === reps; }).map(function (p) { return p.k; }), preTest = { stat: null, df: leads.length, p: null };
    if (leads.length && reps >= 50) {
      var mu = {}, va = {}; leads.forEach(function (k) { mu[k] = mean(draws[k]); va[k] = Math.pow(sd(draws[k]), 2) + 1e-12; });
      var stat = 0; leads.forEach(function (k) { stat += point[k] * point[k] / va[k]; });
      var over = 0; for (var r = 0; r < reps; r++) { var sr = 0; leads.forEach(function (k) { var d = draws[k][r] - mu[k]; sr += d * d / va[k]; }); if (sr >= stat) over++; }
      preTest = { stat: stat, df: leads.length, p: (over + 1) / (reps + 1) };
    }
    return { points: points, att: att, attSe: attSe, attCi: [att - 1.96 * attSe, att + 1.96 * attSe], reps: reps, preTest: preTest };
  }

  /* ---------- synthetic control ---------- */
  // Weights on donor countries (non-negative, summing to one) that reproduce the treated country's path before adoption.
  function synthWeights(Y1, Y0) { // Y1: pre-period vector (T), Y0: T x J matrix. Minimise ||Y1 - Y0 w||^2 on the simplex by projected gradient.
    var T = Y1.length, J = Y0[0].length, w = new Array(J).fill(1 / J), lr = 0.5 / (1e-9 + (function () { var m = 0; for (var j = 0; j < J; j++) { var s = 0; for (var t = 0; t < T; t++) s += Y0[t][j] * Y0[t][j]; if (s > m) m = s; } return m * J; })());
    function proj(v) { var u = v.slice().sort(function (a, b) { return b - a; }), css = 0, rho = 0, th = 0; for (var i = 0; i < u.length; i++) { css += u[i]; var t = (css - 1) / (i + 1); if (u[i] - t > 0) { rho = i + 1; th = t; } } return v.map(function (x) { return Math.max(x - th, 0); }); }
    for (var it = 0; it < 4000; it++) { var resid = []; for (var t2 = 0; t2 < T; t2++) { var f = 0; for (var j2 = 0; j2 < J; j2++) f += Y0[t2][j2] * w[j2]; resid.push(f - Y1[t2]); } var grad = new Array(J).fill(0); for (j2 = 0; j2 < J; j2++) for (t2 = 0; t2 < T; t2++) grad[j2] += 2 * Y0[t2][j2] * resid[t2]; w = proj(w.map(function (x, j) { return x - lr * grad[j]; })); }
    return w;
  }
  function synthOne(rows, outcome, unit, donors, tq, preLen) {
    var P = panelIndex(rows), qs = P.qs, pre = qs.filter(function (q) { return q < tq && q >= tq - preLen; }), all = qs;
    var Y1 = pre.map(function (q) { return P.at[unit + '|' + q][outcome]; }), Y0 = pre.map(function (q) { return donors.map(function (d) { return P.at[d + '|' + q][outcome]; }); });
    var w = synthWeights(Y1, Y0), path = all.map(function (q) { var s = 0; donors.forEach(function (d, j) { s += w[j] * P.at[d + '|' + q][outcome]; }); return { q: q, actual: P.at[unit + '|' + q][outcome], synth: s, gap: P.at[unit + '|' + q][outcome] - s }; });
    var rm = function (list) { var s = 0; list.forEach(function (p) { s += p.gap * p.gap; }); return Math.sqrt(s / Math.max(1, list.length)); };
    var preList = path.filter(function (p) { return p.q < tq && p.q >= tq - preLen; }), postList = path.filter(function (p) { return p.q >= tq; });
    return { weights: donors.map(function (d, j) { return { unit: d, w: w[j] }; }).sort(function (a, b) { return b.w - a.w; }), path: path, preRmspe: rm(preList), postRmspe: rm(postList), tq: tq };
  }
  // Synthetic control for one treated country, with the placebo test: pretend each untreated country was treated and see how big its gap looks.
  function syntheticControl(rows, outcome, unit, opts) {
    opts = opts || {}; var P = panelIndex(rows), U = rows.filter(function (r) { return r.unit === unit; })[0], tq = U.cohort, preLen = opts.preLen || Math.min(tq - 1, 12), lag = opts.lag || 0;
    var donors = P.units.filter(function (u) { return !P.at[u + '|' + P.qs[0]].cohort; }), main = synthOne(rows, outcome, unit, donors, tq, preLen), placebos = [];
    donors.forEach(function (d) { var others = donors.filter(function (x) { return x !== d; }); if (others.length < 2) return; var pr = synthOne(rows, outcome, d, others, tq, preLen); placebos.push({ unit: d, path: pr.path, ratio: pr.postRmspe / (pr.preRmspe + 1e-9) }); });
    var ratio = main.postRmspe / (main.preRmspe + 1e-9), rank = placebos.filter(function (p) { return p.ratio >= ratio; }).length + 1;
    var postGaps = main.path.filter(function (p) { return p.q >= tq + lag; }).map(function (p) { return p.gap; });
    return { weights: main.weights, path: main.path, tq: tq, preRmspe: main.preRmspe, postRmspe: main.postRmspe, ratio: ratio, placebos: placebos, pValue: rank / (placebos.length + 1), avgEffect: mean(postGaps) };
  }

  /* ---------- inference with few clusters ---------- */
  // Randomisation inference: reassign which countries are "treated" (keeping the same adoption dates) and see how often chance alone gives an estimate this large.
  function randomisationInference(rows, outcome, reps, rng) {
    rng = rng || Math.random; reps = reps || 400;
    var byU = {}; rows.forEach(function (r) { (byU[r.unit] = byU[r.unit] || []).push(r); });
    var units = Object.keys(byU), tr = units.filter(function (u) { return byU[u][0].cohort; }), actual = twfe(rows, outcome).est, draws = [];
    var lag = 0; rows.forEach(function (r) { if (r.post && r.cohort) lag = r.q - r.cohort; }); lag = rows.filter(function (r) { return r.post; }).length ? (function () { var r = rows.filter(function (x) { return x.post; })[0]; return r.q - r.cohort; })() : 0;
    var cohorts = tr.map(function (u) { return byU[u][0].cohort; });
    for (var b = 0; b < reps; b++) {
      var sh = units.slice(); for (var i = sh.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), t = sh[i]; sh[i] = sh[j]; sh[j] = t; }
      var pseudo = {}; sh.slice(0, tr.length).forEach(function (u, idx) { pseudo[u] = cohorts[idx]; });
      var rs = rows.map(function (r) { var c = pseudo[r.unit] || 0; return { unit: r.unit, q: r.q, cohort: c, post: c && r.q >= c + lag ? 1 : 0, rel: c ? r.q - c : null, y: r[outcome] }; });
      var e = twfe(rs.map(function (r) { var o = { unit: r.unit, q: r.q, cohort: r.cohort, post: r.post, rel: r.rel }; o[outcome] = r.y; return o; }), outcome); if (e) draws.push(e.est);
    }
    var p = draws.filter(function (v) { return Math.abs(v) >= Math.abs(actual) - 1e-12; }).length / draws.length;
    return { actual: actual, p: p, draws: draws, reps: draws.length };
  }

  /* ---------- cost-benefit analysis ---------- */
  // ens = LMSim.ensemble(...) output; the net benefit of the policy in each run, as a share of one year's GDP, in present value.
  //   rate       annual discount rate (%), horizon quarters counted, scar share of the output gain that persists past the horizon
  //   mcpf       marginal cost of public funds: each unit of extra borrowing costs society (1 + mcpf) in distortions and interest
  //   weights    value placed on a gain to each income group: { low, mid, high }; incidence says who gets the output gain
  //   effectScale  uncertainty about how big the true effect is (a lognormal-ish multiplier with this spread), the analyst's own estimate error
  function cba(ens, o) {
    o = o || {}; var rate = (o.rate == null ? 3.5 : o.rate) / 100, mcpf = o.mcpf == null ? 0.25 : o.mcpf, eps = o.inequalityAversion == null ? 0 : o.inequalityAversion, inc = o.incidence || { low: 1 / 3, mid: 1 / 3, high: 1 / 3 }, spread = o.effectSpread || 0, tail = o.tail == null ? 0 : o.tail;
    var rng = o.rng || Math.random, gs = function () { var u = 0, v = 0; while (u === 0) u = rng(); while (v === 0) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    var inc2 = Object.keys(inc), norm = 0; inc2.forEach(function (k) { norm += inc[k]; });
    var living = { low: 0.5, mid: 1, high: 2 }, welfare = 0, wsum = 0; // a gain to a richer group is worth less when inequality aversion is above zero
    inc2.forEach(function (k) { var wk = Math.pow(1 / living[k], eps); welfare += (inc[k] / norm) * wk; });
    var runs = ens.base.length, n = ens.quarters, npvs = [], parts = { output: [], fiscal: [] };
    for (var r = 0; r < runs; r++) {
      var scale = spread ? Math.exp(spread * gs() - spread * spread / 2) : 1, out = 0, fis = 0;
      for (var q = 0; q < n; q++) {
        var df = Math.pow(1 + rate, -(q + 1) / 4), dY = (ens.policy[r][q].Y - ens.base[r][q].Y) / 4 * scale, dDef = (ens.policy[r][q].deficit - ens.base[r][q].deficit) / 4;
        out += df * dY * welfare; fis += df * dDef * (1 + mcpf);
      }
      if (tail) { var last = (ens.policy[r][n - 1].Y - ens.base[r][n - 1].Y) * scale * welfare, dfN = Math.pow(1 + rate, -n / 4); out += last * tail * dfN / (rate + 0.15) / 1; }
      npvs.push((out - fis) / 100 * 100); parts.output.push(out); parts.fiscal.push(-fis);
    }
    npvs.sort(function (a, b) { return a - b; });
    var pct = function (p) { return npvs[Math.min(npvs.length - 1, Math.floor(p * npvs.length))]; };
    return { mean: mean(npvs), sd: sd(npvs), p05: pct(0.05), p25: pct(0.25), p50: pct(0.5), p75: pct(0.75), p95: pct(0.95), probPositive: npvs.filter(function (v) { return v > 0; }).length / npvs.length, output: mean(parts.output), fiscal: mean(parts.fiscal), draws: npvs, welfareWeight: welfare };
  }

  root.LMStats = { mean: mean, sd: sd, tCdf: tCdf, pTwoSided: pTwoSided, tCrit: tCrit, normCdf: normCdf, chi2Cdf: chi2Cdf, fCdf: fCdf, ols: ols, ci: ci, beforeAfter: beforeAfter, did2x2: did2x2, twfe: twfe, eventStudy: eventStudy, groupTime: groupTime, syntheticControl: syntheticControl, randomisationInference: randomisationInference, cba: cba };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.LMStats;
})(typeof window !== 'undefined' ? window : globalThis);
