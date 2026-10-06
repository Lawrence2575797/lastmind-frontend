/*
 * LastMind Be the Chancellor: the Treasury analysis lab, data side.
 * Pure logic (no page code, runs in Node) that makes the datasets the analysis methods work on:
 *   - peer(): other countries, built from the SAME economic model as the player's, that adopted the same kind of policy at different
 *     dates, with common world shocks, shocks of their own, and measurement error. A panel like the ones real economists get.
 *   - the true effect of the policy on each treated country is known (the model is re-run without it), so an estimate can be marked
 *     against the truth once the analyst has committed to it.
 * Difficulty comes from two knobs: how noisy the data are, and how much the countries that adopt the policy differ from the ones
 * that do not (selection), which is what makes a naive before-and-after comparison, or a simple cross-section, mislead.
 */
(function (root) {
  'use strict';
  var E = root.LMEcon || (typeof require !== 'undefined' ? require('./econModel.js') : null);
  var L = root.LMPolicy || (typeof require !== 'undefined' ? (root.LMEcon = E, require('./econPolicy.js')) : null);
  var OUTCOMES = [['g', 'GDP growth', '% a year'], ['pi', 'Inflation', '% a year'], ['u', 'Unemployment', '%'], ['deficit', 'Budget deficit', '% of GDP'], ['debtGDP', 'Public debt', '% of GDP'], ['T', 'Tax revenue', '% of GDP']];
  var clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
  var gauss = function (rng) { var u = 0, v = 0; while (u === 0) u = rng(); while (v === 0) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  function entry(id) { return L.CAT.filter(function (c) { return c.id === id; })[0]; }

  // The same rule the game uses to turn a list of decisions into the settings in force in quarter t (lags and a gradual phase-in).
  function settingsAt(decisions, t, phase) {
    var by = {}, ph = phase || 2, out = {};
    decisions.forEach(function (d) { (by[d.id] = by[d.id] || []).push(d); });
    Object.keys(by).forEach(function (id) {
      var e = entry(id), lag = e ? L.lagOf(e.area) : 0, sel = !!(e && e.ctl && e.ctl.t === 'select');
      var eff = by[id].filter(function (d) { return t >= d.at + lag; });
      if (!eff.length) return;
      var last = eff[eff.length - 1], prev = eff.length > 1 ? eff[eff.length - 2].v : 0, k = t - (last.at + lag);
      var v = sel ? last.v : prev + (last.v - prev) * Math.min(1, (k + 1) / ph);
      out[id] = { v: v, opt: last.opt, dur: last.dur, k: k, noRamp: true };
    });
    return out;
  }
  function policyAt(pf, decisions, t) { return L.compile(settingsAt(decisions, t), pf, { start: 0, phase: 1, flags: { unlock: true } })(t) || {}; }

  // Random shocks, in the model's own units, that hit demand, confidence and risk. `scale` sets how noisy the world is.
  function noise(rng, scale) { return { hh: 0.22 * scale * gauss(rng), biz: 0.22 * scale * gauss(rng), demand: 0.16 * scale * gauss(rng), risk: 0.03 * scale * gauss(rng) }; }
  function add(a, b) { var o = {}; Object.keys(a).forEach(function (k) { o[k] = a[k]; }); Object.keys(b || {}).forEach(function (k) { o[k] = (o[k] || 0) + b[k]; }); return o; }

  // Run one economy for Q quarters. world[t] and own[t] are shock objects; decisions are the policies adopted.
  function simulate(pf, decisions, Q, world, own) {
    var s = E.init(pf), rows = [];
    for (var t = 1; t <= Q; t++) { E.step(s, pf, policyAt(pf, decisions, t), add(world[t] || {}, own[t] || {}), null); rows.push(E.snapshot(s, pf)); }
    return rows;
  }
  // Each peer is a similar but not identical economy: its parameters are nudged a little.
  function jitter(pf, rng, amount) {
    var p = JSON.parse(JSON.stringify(pf)), keys = ['exportShare', 'commExport', 'energyImpDep', 'foodImpDep', 'rstar'];
    keys.forEach(function (k) { if (typeof p[k] === 'number') p[k] = p[k] * (1 + amount * (rng() * 2 - 1)); });
    return p;
  }

  /*
   * A panel of peer countries for one policy lever.
   *   o.pf        the player's economy profile
   *   o.lever     { id, v, opt, dur }: the policy being investigated, as proposed (the peers adopt different sizes of it)
   *   o.units     number of peer countries (default 12), o.treated how many adopt it (default 6), o.Q quarters of data (default 32)
   *   o.noise     0.5 (tidy) to 2 (messy); o.selection 0 (adopters are like everyone else) to 1 (they adopt when things are going badly)
   *   o.seed      makes the whole panel reproducible
   * Returns { rows, units, outcomes, truth } where rows are what the analyst sees and truth is hidden until they have committed.
   */
  function peerPanel(o) {
    var Q = o.Q || 32, N = o.units || 12, K = Math.min(o.treated || 6, N - 2), scale = o.noise == null ? 1 : o.noise, sel = o.selection == null ? 0.5 : o.selection;
    var rng = E.mulberry((o.seed || 1) >>> 0), lever = o.lever, e = entry(lever.id), step = e && e.ctl && e.ctl.step ? e.ctl.step : 0.5;
    var world = {}; for (var t = 1; t <= Q; t++) world[t] = noise(rng, scale * 0.8);                 // the shocks every country shares
    var units = [], idx = []; for (var i = 0; i < N; i++) idx.push(i);
    for (var j = idx.length - 1; j > 0; j--) { var k = Math.floor(rng() * (j + 1)), tmp = idx[j]; idx[j] = idx[k]; idx[k] = tmp; }
    var treatedSet = idx.slice(0, K);
    for (i = 0; i < N; i++) {
      var treated = treatedSet.indexOf(i) > -1;
      var pf = jitter(o.pf, rng, o.heterogeneity == null ? 0.03 : o.heterogeneity), own = {}, tq = treated ? 10 + Math.floor(rng() * (Q - 18)) : null;
      var dose = treated ? clamp(lever.v * (0.6 + 0.8 * rng()), e && e.ctl && e.ctl.min != null ? e.ctl.min : -1e9, e && e.ctl && e.ctl.max != null ? e.ctl.max : 1e9) : 0;
      if (e && e.ctl && step) dose = Math.round(dose / step) * step;
      for (t = 1; t <= Q; t++) {
        var n = noise(rng, scale * 0.7);
        // Selection: a country that is about to adopt has been doing badly for a few quarters, which is why it acts.
        if (treated && sel > 0 && t > tq - 10 && t <= tq) { var ramp = (t - (tq - 10)) / 10; n.demand = (n.demand || 0) - 1.0 * sel * ramp; n.hh = (n.hh || 0) - 0.6 * sel * ramp; }   // a worsening slide that ends in adoption
        own[t] = n;
      }
      units.push({ id: 'C' + (i + 1), name: 'Country ' + String.fromCharCode(65 + i), treated: treated, tq: tq, dose: dose, pf: pf, own: own });
    }
    var rows = [], truth = { byK: {}, att: 0, n: 0, effects: [] }, obsRng = E.mulberry(((o.seed || 1) * 7919) >>> 0);
    units.forEach(function (u) {
      var dec = u.treated ? [{ id: lever.id, at: u.tq, v: u.dose, opt: lever.opt || null, dur: lever.dur || null }] : [];
      var actual = simulate(u.pf, dec, Q, world, u.own), cf = u.treated ? simulate(u.pf, [], Q, world, u.own) : null;
      var lag = e ? L.lagOf(e.area) : 0;
      for (var q = 0; q < Q; q++) {
        var r = { unit: u.id, name: u.name, q: q + 1, cohort: u.treated ? u.tq : 0, post: u.treated && q + 1 >= u.tq + lag ? 1 : 0, rel: u.treated ? q + 1 - u.tq : null };
        OUTCOMES.forEach(function (oc) { r[oc[0]] = actual[q][oc[0]] + (oc[0] === 'g' || oc[0] === 'pi' || oc[0] === 'u' ? 0.12 * scale * gauss(obsRng) : 0.08 * scale * gauss(obsRng)); r['true_' + oc[0]] = actual[q][oc[0]]; });
        rows.push(r);
        if (cf && q + 1 >= u.tq) {
          var kk = q + 1 - u.tq; truth.byK[kk] = truth.byK[kk] || { n: 0 }; truth.byK[kk].n++;
          OUTCOMES.forEach(function (oc) { truth.byK[kk][oc[0]] = (truth.byK[kk][oc[0]] || 0) + (actual[q][oc[0]] - cf[q][oc[0]]); });
        }
      }
    });
    Object.keys(truth.byK).forEach(function (kk) { OUTCOMES.forEach(function (oc) { truth.byK[kk][oc[0]] /= truth.byK[kk].n; }); });
    // The true average effect over the whole post-adoption period, per outcome.
    var ks = Object.keys(truth.byK).map(Number).filter(function (x) { return x >= (e ? L.lagOf(e.area) : 0) && x <= 10; });   // the first ten quarters after the policy takes effect
    OUTCOMES.forEach(function (oc) { truth.att = truth.att || {}; var sum = 0, n = 0; ks.forEach(function (x) { sum += truth.byK[x][oc[0]] * truth.byK[x].n; n += truth.byK[x].n; }); truth.att[oc[0]] = n ? sum / n : 0; });
    // The player's own country, which has also tried this policy once in its past. It shares the world's shocks with the peers but has its own, and
    // like the adopting peers it acted after a slide. It is kept apart from the peer rows so that the peer panel itself is unchanged.
    var home = null;
    if (o.home) {
      var hr = E.mulberry((((o.seed || 1) * 104729) + 17) >>> 0), htq = 11 + Math.floor(hr() * (Q - 24)), lo0 = e && e.ctl && e.ctl.min != null ? e.ctl.min : -1e9, hi0 = e && e.ctl && e.ctl.max != null ? e.ctl.max : 1e9;
      var hdose = clamp(lever.v * (0.7 + 0.5 * hr()), lo0, hi0); if (e && e.ctl && step) hdose = Math.round(hdose / step) * step;
      var hown = {}; for (t = 1; t <= Q; t++) { var hn = noise(hr, scale * 0.7); if (sel > 0 && t > htq - 10 && t <= htq) { var hramp = (t - (htq - 10)) / 10; hn.demand = (hn.demand || 0) - 1.0 * sel * hramp; hn.hh = (hn.hh || 0) - 0.6 * sel * hramp; } hown[t] = hn; }
      var hdec = [{ id: lever.id, at: htq, v: hdose, opt: lever.opt || null, dur: lever.dur || null }], hact = simulate(o.pf, hdec, Q, world, hown), hcf = simulate(o.pf, [], Q, world, hown), hlag = e ? L.lagOf(e.area) : 0, hobs = E.mulberry((((o.seed || 1) * 7919) + 31) >>> 0), hrows = [];
      for (var hq = 0; hq < Q; hq++) {
        var hrw = { unit: 'HOME', name: o.homeName || 'Your country', q: hq + 1, cohort: htq, post: hq + 1 >= htq + hlag ? 1 : 0, rel: hq + 1 - htq };
        OUTCOMES.forEach(function (oc) { hrw[oc[0]] = hact[hq][oc[0]] + (oc[0] === 'g' || oc[0] === 'pi' || oc[0] === 'u' ? 0.12 * scale * gauss(hobs) : 0.08 * scale * gauss(hobs)); hrw['true_' + oc[0]] = hact[hq][oc[0]]; });
        hrows.push(hrw);
      }
      var hatt = {}; OUTCOMES.forEach(function (oc) { var sum = 0, n = 0; for (var x = hlag; x <= 10; x++) { var ix = htq - 1 + x; if (ix < Q) { sum += hact[ix][oc[0]] - hcf[ix][oc[0]]; n++; } } hatt[oc[0]] = n ? sum / n : 0; });
      home = { rows: hrows, tq: htq, dose: hdose, lag: hlag, truth: { att: hatt } };
    }
    return { home: home, rows: rows, outcomes: OUTCOMES, Q: Q, lever: lever, units: units.map(function (u) { return { id: u.id, name: u.name, treated: u.treated, tq: u.tq, dose: u.dose }; }), truth: truth, lag: e ? L.lagOf(e.area) : 0 };
  }

  var api = { OUTCOMES: OUTCOMES, settingsAt: settingsAt, policyAt: policyAt, simulate: simulate, peerPanel: peerPanel, noise: noise, gauss: gauss };
  root.LMLab = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
