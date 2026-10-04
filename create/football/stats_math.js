// Statistical functions for the Analysis Centre: summaries, the normal, t, chi-squared, binomial and Poisson distributions,
// correlation and regression. Written out in full (no libraries) so each can be checked against published values.
(function () {
  const S = ((window.FM = window.FM || {}).STAT = {});

  // ---------- summaries ----------
  S.sum = (a) => a.reduce((x, y) => x + y, 0);
  S.mean = (a) => (a.length ? S.sum(a) / a.length : NaN);
  const sorted = (a) => a.slice().sort((x, y) => x - y);
  S.median = (a) => { const s = sorted(a), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN; };
  // Quartiles the way they are taught: the median of the lower half and of the upper half (the middle value left out when n is odd).
  S.quartiles = (a) => {
    const s = sorted(a), n = s.length;
    if (!n) return { q1: NaN, q2: NaN, q3: NaN };
    const lower = s.slice(0, Math.floor(n / 2)), upper = s.slice(Math.ceil(n / 2));
    return { q1: S.median(lower.length ? lower : s), q2: S.median(s), q3: S.median(upper.length ? upper : s) };
  };
  S.mode = (a) => {
    const c = {}; a.forEach((v) => { c[v] = (c[v] || 0) + 1; });
    const best = Math.max.apply(null, Object.values(c));
    return best > 1 ? Object.keys(c).filter((k) => c[k] === best).map(Number).sort((x, y) => x - y) : [];
  };
  S.range = (a) => Math.max.apply(null, a) - Math.min.apply(null, a);
  S.variance = (a, sample) => { const m = S.mean(a), n = a.length; return n - (sample ? 1 : 0) > 0 ? S.sum(a.map((v) => (v - m) * (v - m))) / (n - (sample ? 1 : 0)) : NaN; };
  S.sd = (a, sample) => Math.sqrt(S.variance(a, sample));

  // ---------- special functions ----------
  const LG = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  S.lgamma = (x) => {
    let y = x, tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let j = 0; j < 6; j++) ser += LG[j] / ++y;
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  };
  // regularised lower incomplete gamma P(a, x)
  S.gammaP = (a, x) => {
    if (x <= 0) return 0;
    if (x < a + 1) {
      let ap = a, del = 1 / a, sum = del;
      for (let n = 0; n < 500; n++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-14) break; }
      return sum * Math.exp(-x + a * Math.log(x) - S.lgamma(a));
    }
    let b = x + 1 - a, c = 1 / 1e-300, d = 1 / b, h = d;
    for (let i = 1; i < 500; i++) {
      const an = -i * (i - a); b += 2;
      d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
      c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d; const del = d * c; h *= del;
      if (Math.abs(del - 1) < 1e-14) break;
    }
    return 1 - Math.exp(-x + a * Math.log(x) - S.lgamma(a)) * h;
  };
  function betacf(a, b, x) {
    let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    d = 1 / d; let h = d;
    for (let m = 1; m <= 500; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300;
      c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300;
      c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d; const del = d * c; h *= del;
      if (Math.abs(del - 1) < 1e-14) break;
    }
    return h;
  }
  // regularised incomplete beta I_x(a, b)
  S.betaI = (x, a, b) => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    const bt = Math.exp(S.lgamma(a + b) - S.lgamma(a) - S.lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  };

  // ---------- distributions ----------
  S.normPdf = (x, mu, sd) => Math.exp(-0.5 * Math.pow((x - (mu || 0)) / (sd || 1), 2)) / ((sd || 1) * Math.sqrt(2 * Math.PI));
  S.normCdf = (x, mu, sd) => {
    const z = (x - (mu || 0)) / (sd || 1);
    const p = S.gammaP(0.5, z * z / 2);
    return z >= 0 ? 0.5 * (1 + p) : 0.5 * (1 - p);
  };
  // inverse normal (Acklam's rational approximation, then one Newton step)
  S.normInv = (p) => {
    if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    let x;
    if (p < 0.02425) { const q = Math.sqrt(-2 * Math.log(p)); x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    else if (p > 1 - 0.02425) { const q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    else { const q = p - 0.5, r = q * q; x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
    const e = S.normCdf(x) - p;
    return x - e / S.normPdf(x);
  };
  S.tCdf = (t, df) => { const x = df / (df + t * t), tail = 0.5 * S.betaI(x, df / 2, 0.5); return t > 0 ? 1 - tail : tail; };
  S.tInv = (p, df) => { let lo = -60, hi = 60; for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (S.tCdf(mid, df) < p) lo = mid; else hi = mid; } return (lo + hi) / 2; };
  S.chi2Cdf = (x, df) => S.gammaP(df / 2, x / 2);
  S.chi2Sf = (x, df) => 1 - S.chi2Cdf(x, df);
  S.chi2Inv = (p, df) => { let lo = 0, hi = 1000; for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (S.chi2Cdf(mid, df) < p) lo = mid; else hi = mid; } return (lo + hi) / 2; };
  const lchoose = (n, k) => S.lgamma(n + 1) - S.lgamma(k + 1) - S.lgamma(n - k + 1);
  S.binomPmf = (k, n, p) => (k < 0 || k > n ? 0 : p <= 0 ? (k === 0 ? 1 : 0) : p >= 1 ? (k === n ? 1 : 0) : Math.exp(lchoose(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p)));
  S.binomCdf = (k, n, p) => { let s = 0; for (let i = 0; i <= Math.min(Math.floor(k), n); i++) s += S.binomPmf(i, n, p); return Math.min(1, s); };
  S.poisPmf = (k, lam) => (k < 0 ? 0 : Math.exp(-lam + k * Math.log(lam) - S.lgamma(k + 1)));
  S.poisCdf = (k, lam) => { let s = 0; for (let i = 0; i <= Math.floor(k); i++) s += S.poisPmf(i, lam); return Math.min(1, s); };

  // ---------- correlation and regression ----------
  S.pmcc = (x, y) => {
    const n = x.length, mx = S.mean(x), my = S.mean(y);
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
    return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : NaN;
  };
  // test of H0: rho = 0, two-tailed, p-value from t = r * sqrt((n - 2) / (1 - r^2))
  S.corrTest = (r, n) => {
    if (n < 3 || !isFinite(r)) return { t: NaN, p: NaN, df: n - 2 };
    const t = r * Math.sqrt((n - 2) / Math.max(1e-12, 1 - r * r)), df = n - 2;
    return { t, df, p: 2 * (1 - S.tCdf(Math.abs(t), df)) };
  };
  S.linreg = (x, y) => {
    const n = x.length, mx = S.mean(x), my = S.mean(y);
    let sxy = 0, sxx = 0;
    for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; }
    const b = sxx > 0 ? sxy / sxx : NaN, a = my - b * mx, r = S.pmcc(x, y);
    return { a, b, r, r2: r * r, n };
  };

  // ---------- matrices (for multiple and logistic regression) ----------
  S.solve = (A, b) => {
    const n = A.length, M = A.map((row, i) => row.concat([b[i]]));
    for (let c = 0; c < n; c++) {
      let piv = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      if (Math.abs(M[piv][c]) < 1e-12) return null;
      [M[c], M[piv]] = [M[piv], M[c]];
      for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
    }
    return M.map((row, i) => row[n] / row[i]);
  };
  S.invert = (A) => {
    const n = A.length, cols = [];
    for (let j = 0; j < n; j++) { const e = new Array(n).fill(0); e[j] = 1; const s = S.solve(A, e); if (!s) return null; cols.push(s); }
    return A.map((_, i) => cols.map((c) => c[i]));
  };

  // ---------- beyond A-level ----------
  S.betaPdf = (x, a, b) => (x <= 0 || x >= 1 ? 0 : Math.exp(S.lgamma(a + b) - S.lgamma(a) - S.lgamma(b) + (a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x)));
  S.betaInv = (p, a, b) => { let lo = 0, hi = 1; for (let i = 0; i < 100; i++) { const mid = (lo + hi) / 2; if (S.betaI(mid, a, b) < p) lo = mid; else hi = mid; } return (lo + hi) / 2; };

  // confidence interval for a proportion (Wilson's method, which behaves well for small counts)
  S.wilson = (k, n, level) => {
    const z = S.normInv(1 - (1 - (level || 0.95)) / 2), ph = k / n, d = 1 + z * z / n;
    const c = (ph + z * z / (2 * n)) / d, h = z * Math.sqrt(ph * (1 - ph) / n + z * z / (4 * n * n)) / d;
    return { lo: Math.max(0, c - h), hi: Math.min(1, c + h) };
  };
  S.meanCI = (a, level) => {
    const n = a.length, m = S.mean(a), se = S.sd(a, true) / Math.sqrt(n), t = S.tInv(1 - (1 - (level || 0.95)) / 2, n - 1);
    return { mean: m, se, lo: m - t * se, hi: m + t * se, t, df: n - 1 };
  };

  // t-tests
  S.tOne = (a, mu0, alt) => {
    const n = a.length, m = S.mean(a), se = S.sd(a, true) / Math.sqrt(n), t = (m - mu0) / se, df = n - 1;
    return { n, mean: m, se, t, df, p: tP(t, df, alt) };
  };
  function tP(t, df, alt) { return alt === 'greater' ? 1 - S.tCdf(t, df) : alt === 'less' ? S.tCdf(t, df) : 2 * (1 - S.tCdf(Math.abs(t), df)); }
  S.tWelch = (a, b, alt) => {
    const na = a.length, nb = b.length, ma = S.mean(a), mb = S.mean(b), va = S.variance(a, true), vb = S.variance(b, true);
    const sa = va / na, sb = vb / nb, se = Math.sqrt(sa + sb), t = (ma - mb) / se;
    const df = (sa + sb) * (sa + sb) / (sa * sa / (na - 1) + sb * sb / (nb - 1));
    const sp = Math.sqrt(((na - 1) * va + (nb - 1) * vb) / (na + nb - 2));
    return { na, nb, ma, mb, diff: ma - mb, se, t, df, p: tP(t, df, alt), d: sp > 0 ? (ma - mb) / sp : NaN };
  };
  S.tPaired = (a, b, alt) => { const d = a.map((v, i) => v - b[i]); const r = S.tOne(d, 0, alt); r.dz = S.sd(d, true) > 0 ? S.mean(d) / S.sd(d, true) : NaN; return r; };
  // approximate power of a two-sample test with n per group and standardised effect size d (normal approximation)
  S.powerTwo = (d, n, alpha) => { const z = S.normInv(1 - alpha / 2), ncp = Math.abs(d) * Math.sqrt(n / 2); return 1 - S.normCdf(z - ncp) + S.normCdf(-z - ncp); };
  S.nForPower = (d, power, alpha) => { const za = S.normInv(1 - alpha / 2), zb = S.normInv(power); return Math.ceil(2 * Math.pow((za + zb) / Math.abs(d), 2)); };

  // chi-squared test of independence for a table of counts
  S.chi2Indep = (table) => {
    const R = table.length, C = table[0].length, rs = table.map((r) => S.sum(r)), cs = table[0].map((_, j) => S.sum(table.map((r) => r[j]))), n = S.sum(rs);
    let chi2 = 0, minE = Infinity; const E = table.map((r, i) => r.map((_, j) => rs[i] * cs[j] / n));
    table.forEach((r, i) => r.forEach((o, j) => { const e = E[i][j]; if (e > 0) chi2 += (o - e) * (o - e) / e; minE = Math.min(minE, e); }));
    const df = (R - 1) * (C - 1);
    return { chi2, df, p: df > 0 ? S.chi2Sf(chi2, df) : NaN, expected: E, minExpected: minE, n };
  };

  // ordinary least squares: X is an array of rows, each starting with 1 for the intercept
  S.ols = (X, y) => {
    const n = y.length, p = X[0].length;
    const XtX = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => S.sum(X.map((r) => r[i] * r[j]))));
    const Xty = Array.from({ length: p }, (_, i) => S.sum(X.map((r, k) => r[i] * y[k])));
    const inv = S.invert(XtX);
    if (!inv || n <= p) return null;
    const beta = inv.map((row) => S.sum(row.map((v, j) => v * Xty[j])));
    const fit = X.map((r) => S.sum(r.map((v, j) => v * beta[j])));
    const sse = S.sum(y.map((v, i) => (v - fit[i]) ** 2)), my = S.mean(y), sst = S.sum(y.map((v) => (v - my) ** 2));
    const df = n - p, sigma2 = sse / df;
    const se = beta.map((_, j) => Math.sqrt(sigma2 * inv[j][j]));
    const t = beta.map((b, j) => b / se[j]), pv = t.map((tt) => 2 * (1 - S.tCdf(Math.abs(tt), df)));
    const r2 = sst > 0 ? 1 - sse / sst : NaN, adj = 1 - (1 - r2) * (n - 1) / df;
    const F = p > 1 ? ((sst - sse) / (p - 1)) / sigma2 : NaN;
    const fp = p > 1 ? 1 - S.betaI((p - 1) * F / ((p - 1) * F + df), (p - 1) / 2, df / 2) : NaN;
    return { beta, se, t, p: pv, r2, adjR2: adj, F, fp, sigma: Math.sqrt(sigma2), df, n, pCount: p };
  };

  // logistic regression by iteratively reweighted least squares (Newton-Raphson on the log-likelihood)
  S.logistic = (X, y) => {
    const n = y.length, p = X[0].length;
    let beta = new Array(p).fill(0), converged = false, it = 0, cov = null;
    const sigm = (z) => 1 / (1 + Math.exp(-z));
    for (; it < 50; it++) {
      const mu = X.map((r) => sigm(S.sum(r.map((v, j) => v * beta[j]))));
      const grad = Array.from({ length: p }, (_, j) => S.sum(X.map((r, i) => r[j] * (y[i] - mu[i]))));
      const H = Array.from({ length: p }, (_, a) => Array.from({ length: p }, (_, b) => S.sum(X.map((r, i) => r[a] * r[b] * mu[i] * (1 - mu[i])))));
      const step = S.solve(H, grad);
      if (!step) return null;
      beta = beta.map((b, j) => b + step[j]);
      cov = S.invert(H);
      if (Math.max.apply(null, step.map(Math.abs)) < 1e-8) { converged = true; break; }
    }
    if (!cov) return null;
    const mu = X.map((r) => sigm(S.sum(r.map((v, j) => v * beta[j]))));
    const ll = S.sum(y.map((v, i) => (v ? Math.log(Math.max(mu[i], 1e-12)) : Math.log(Math.max(1 - mu[i], 1e-12)))));
    const pbar = S.mean(y), ll0 = n * (pbar > 0 && pbar < 1 ? pbar * Math.log(pbar) + (1 - pbar) * Math.log(1 - pbar) : 0);
    const se = beta.map((_, j) => Math.sqrt(cov[j][j])), z = beta.map((b, j) => b / se[j]), pv = z.map((zz) => 2 * (1 - S.normCdf(Math.abs(zz))));
    return { beta, se, z, p: pv, ll, ll0, mcfadden: 1 - ll / ll0, converged, iterations: it + 1, n };
  };

  // corrections for running many tests; each returns adjusted p-values in the original order
  S.bonferroni = (ps) => ps.map((p) => Math.min(1, p * ps.length));
  S.holm = (ps) => {
    const m = ps.length, idx = ps.map((p, i) => i).sort((a, b) => ps[a] - ps[b]), out = new Array(m);
    let run = 0;
    idx.forEach((i, rank) => { run = Math.max(run, Math.min(1, (m - rank) * ps[i])); out[i] = run; });
    return out;
  };
  S.benjaminiHochberg = (ps) => {
    const m = ps.length, idx = ps.map((p, i) => i).sort((a, b) => ps[b] - ps[a]), out = new Array(m);
    let run = 1;
    idx.forEach((i, k) => { const rank = m - k; run = Math.min(run, ps[i] * m / rank); out[i] = Math.min(1, run); });
    return out;
  };
})();
