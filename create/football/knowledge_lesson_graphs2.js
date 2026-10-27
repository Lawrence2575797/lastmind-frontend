// More lesson graphs: statistics, proportion, growth, motion. Same idea as knowledge_lesson_graphs.js: step number -> diagram.
(function () {
  const FM = (window.FM = window.FM || {});
  const G = FM.knowledgeGraphs, H = FM.knowledgeGraphHelpers, COL = () => FM.knowledgeDiagramColors;
  if (!G || !H) return;
  const { demand, span, tangent, rev, r2 } = H;
  const med = (a) => { const n = a.length, m = Math.floor(n / 2); return n % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
  const phi = (z) => { const t = 1 / (1 + 0.3275911 * Math.abs(z / Math.SQRT2)), x = Math.abs(z / Math.SQRT2), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return 0.5 * (1 + (z >= 0 ? y : -y)); };
  const choose = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };

  G['p-quadratics'] = (d) => {
    const { dm, p, pk, top, c, base } = rev(d);
    return { 2: Object.assign({}, base, { caption: 'Revenue against price is an upside-down U: it has a highest point.' }), 4: Object.assign({}, base, { vlines: [{ x: pk }], points: [{ x: p, y: dm.R(p), label: 'today £' + p, color: c.gold, dy: -12 }, { x: pk, y: top, label: 'maximum £' + r2(pk), color: c.green, dy: -12, anchor: 'middle', dx: 0 }], caption: 'Completing the square gives the top of the curve without calculus.' }) };
  };
  G['p-optimise'] = (d) => {
    const { dm, p, pk, top, c, base } = rev(d), g = (q) => dm.A - 2 * dm.k * q;
    return {
      1: { x: [0, dm.A / dm.k], y: span(g, 0, dm.A / dm.k), xlabel: 'Ticket price p (£)', ylabel: 'dR/dp', curves: [{ f: g, color: c.green, label: 'dR/dp', lx: dm.A / dm.k * 0.6, ly: g(dm.A / dm.k * 0.6) }], points: [{ x: pk, y: 0, label: 'gradient zero at £' + r2(pk), color: c.main, dy: -12 }, { x: p, y: g(p), label: 'today', color: c.gold, dy: -10 }], caption: 'The best price is where the gradient function crosses zero.' },
      4: Object.assign({}, base, { vlines: [{ x: pk }], points: [{ x: p, y: dm.R(p), label: 'today', color: c.gold, dy: 18 }, { x: pk, y: top, label: '£' + r2(pk), color: c.green, dy: -12, anchor: 'middle', dx: 0 }], lines: [tangent(dm.R, pk, 0, c.green)], caption: 'At the maximum the tangent is flat.' }),
    };
  };
  G['p-exp'] = (d) => {
    const c = COL(), n0 = d.crowd, r = 1.03, T = 12;
    const ex = (t) => n0 * Math.pow(r, t), ln = (t) => n0 + n0 * 0.03 * t;
    return { 2: { x: [0, T], y: [n0 * 0.95, ex(T) * 1.03], xlabel: 'Home matches from now (t)', ylabel: 'Crowd', curves: [{ f: ex, color: c.main, label: 'exponential', lx: 8, ly: ex(8) + n0 * 0.04 }, { f: ln, color: c.gold, dash: '6 5', label: 'straight line', lx: 8, ly: ln(8) - n0 * 0.09 }], points: [{ x: 0, y: n0, label: d.num(n0), dy: -10 }], caption: 'Adding 3% of the crowd each time bends the line upwards; adding a fixed number would not.' } };
  };
  G['g-scatter'] = (d) => {
    const c = COL(), n = Math.min(d.shots.length, d.goals.length), xs = d.shots.slice(0, n), ys = d.goals.slice(0, n), mx = xs.reduce((a, v) => a + v, 0) / n, my = ys.reduce((a, v) => a + v, 0) / n;
    let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) * (xs[i] - mx); } const m = sxx ? sxy / sxx : 0, pts = xs.map((x, i) => ({ x, y: ys[i], color: c.main, r: 5 }));
    const x1 = Math.max.apply(null, xs) + 3, y1 = Math.max(Math.max.apply(null, ys), my + m * (x1 - mx)) + 1;
    const base = { x: [0, x1], y: [0, y1], xlabel: 'Shots in the match', ylabel: 'Goals' };
    return { 1: Object.assign({ points: pts, caption: 'One dot for each match: more shots tends to mean more goals.' }, base), 3: Object.assign({ points: pts.concat([{ x: mx, y: my, color: c.gold, label: 'mean', dy: 18, r: 6 }]), lines: [{ p1: [mx, my], p2: [mx + 1, my + m], ext: true, color: c.gold, width: 2.2 }], caption: 'The line of best fit passes through the mean point and rises ' + r2(m) + ' goals for each extra shot.' }, base) };
  };
  G['g-averages'] = (d) => {
    const c = COL(), gs = d.goals.slice(0, 12), mean = gs.reduce((a, v) => a + v, 0) / gs.length;
    return { 1: { x: [0.4, gs.length + 0.6], y: [0, Math.max.apply(null, gs) + 1], xlabel: 'Match', ylabel: 'Goals scored', bars: gs.map((v, i) => ({ x: i + 1, w: 0.7, h: v, label: String(i + 1), fill: c.main })), lines: [{ p1: [0.4, mean], p2: [gs.length + 0.6, mean], color: c.gold, dash: '6 4', width: 2 }], texts: [{ x: gs.length + 0.5, y: mean + 0.12, t: 'mean ' + r2(mean), color: c.gold, anchor: 'end' }], caption: 'The mean is the level the bars would sit at if the goals were shared out equally.' } };
  };
  G['g-box'] = (d) => {
    const c = COL(), a = d.crowdSeries.slice().sort((x, y) => x - y), n = a.length, m = med(a), lo = a.slice(0, Math.floor(n / 2)), hi = a.slice(Math.ceil(n / 2)), q1 = med(lo), q3 = med(hi), mn = a[0], mx = a[n - 1], pad = (mx - mn) * 0.15 + 1;
    return { 3: { x: [mn - pad, mx + pad], y: [0, 1], h: 220, noy: true, xlabel: 'Home crowd', rects: [{ x: q1, y: 0.3, w: q3 - q1, h: 0.4, fill: 'rgba(127,214,255,.3)', stroke: c.main }], lines: [{ p1: [mn, 0.5], p2: [q1, 0.5], color: c.main, width: 2 }, { p1: [q3, 0.5], p2: [mx, 0.5], color: c.main, width: 2 }, { p1: [m, 0.3], p2: [m, 0.7], color: c.gold, width: 3 }, { p1: [mn, 0.4], p2: [mn, 0.6], color: c.main, width: 2 }, { p1: [mx, 0.4], p2: [mx, 0.6], color: c.main, width: 2 }], texts: [{ x: q1, y: 0.2, t: 'Q1 ' + d.num(q1), anchor: 'middle' }, { x: q3, y: 0.2, t: 'Q3 ' + d.num(q3), anchor: 'middle' }, { x: m, y: 0.8, t: 'median ' + d.num(m), anchor: 'middle', color: c.gold }], caption: 'The box holds the middle half of your crowds. The whiskers run to the smallest and largest.' } };
  };
  G['g-directprop'] = (d) => {
    const c = COL(), s = d.big, p = s.price, nmax = s.seats;
    return { 1: { x: [0, nmax], y: [0, p * nmax * 1.02], xlabel: 'Fans', ylabel: 'Money (£)', lines: [{ p1: [0, 0], p2: [nmax, p * nmax], color: c.main, width: 2.6 }], points: [{ x: s.sold, y: p * s.sold, label: d.num(s.sold) + ' fans: £' + d.num(p * s.sold), color: c.gold, dx: -10, dy: -12, anchor: 'end' }], caption: 'At £' + p + ' each, the money is a straight line through zero: double the fans, double the money.' } };
  };
  G['g-lineareq'] = (d, les) => {
    const c = COL(), s = d.big, nn = s.sold, mt = /£([\d,]+)/.exec((les.steps[0].say[0] || '')), cost = mt ? +mt[1].replace(/,/g, '') : 15000, pb = cost / nn;
    return { 2: { x: [0, pb * 3], y: [0, cost * 2.4], xlabel: 'Ticket price p (£)', ylabel: '£', lines: [{ p1: [0, 0], p2: [pb * 3, nn * pb * 3], color: c.main, width: 2.4, label: 'money in', lx: pb * 2.1, ly: nn * pb * 2.1 }, { p1: [0, cost], p2: [pb * 3, cost], color: c.red, width: 2, dash: '6 4' }], points: [{ x: pb, y: cost, label: 'break-even £' + r2(pb), color: c.gold, dx: 10, dy: 20 }], texts: [{ x: pb * 2.2, y: cost * 0.9, t: 'cost £' + d.num(cost), color: c.red }], caption: 'Where money in meets the cost is the break-even price.' } };
  };
  G['s-binom'] = (d) => {
    const c = COL(), n = 5, p = 0.6, bars = []; for (let k = 0; k <= n; k++) bars.push({ x: k, w: 0.8, h: choose(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k), label: String(k), fill: k === 3 ? c.gold : c.main });
    return { 4: { x: [-0.6, n + 0.6], y: [0, Math.max.apply(null, bars.map((b) => b.h)) * 1.15], xlabel: 'Wins in the next 5 matches', ylabel: 'Probability', bars, caption: 'The binomial distribution for n = 5, p = 0.6. The gold bar is exactly 3 wins: ' + r2(bars[3].h) + '.' } };
  };
  G['s-normal'] = (d) => {
    const c = COL(), mu = d.crowd, ms = d.crowdSeries, mean = ms.reduce((a, v) => a + v, 0) / ms.length, sd = Math.sqrt(ms.reduce((a, v) => a + v * v, 0) / ms.length - mean * mean) || 1, f = (x) => Math.exp(-0.5 * Math.pow((x - mean) / sd, 2)) / (sd * Math.sqrt(2 * Math.PI));
    const base = { x: [mean - 4 * sd, mean + 4 * sd], y: [0, f(mean) * 1.15], xlabel: 'Crowd', ylabel: 'Density', noy: true, curves: [{ f, color: c.main }] };
    return { 1: Object.assign({}, base, { vlines: [{ x: mean }], texts: [{ x: mean, y: f(mean) * 1.08, t: 'mean ' + d.num(mean), anchor: 'middle', color: c.gold }], areas: [{ f, from: mean - sd, to: mean + sd, fill: 'rgba(222,184,98,.22)' }], caption: 'The bell curve for your crowds. About two thirds sit within one standard deviation (shaded).' }), 2: Object.assign({}, base, { areas: [{ f, from: mean + 3 * sd, to: mean + 4 * sd, fill: 'rgba(238,122,112,.5)' }], texts: [{ x: mean + 4 * sd, y: f(mean) * 0.55, t: 'a sell-out is far off to the right', anchor: 'end', color: c.red }], caption: 'The tail above a sell-out is so thin it cannot be seen. The z-value measures how far out it is.' }) };
  };
  G['m-suvat'] = (d, les) => {
    const c = COL(), mt = /a = ([\d.]+)\$, \$t = ([\d.]+)/.exec(String((les.steps[2].say || [])[0])), a = mt ? +mt[1] : 4.5, t = mt ? +mt[2] : 3, v = (x) => a * x;
    return { 2: { x: [0, t * 1.2], y: [0, a * t * 1.15], xlabel: 'Time (s)', ylabel: 'Speed (m/s)', areas: [{ f: v, from: 0, to: t, fill: 'rgba(222,184,98,.3)' }], curves: [{ f: v, color: c.main, label: 'v = ' + a + 't', lx: t * 0.55, ly: v(t * 0.55) + 1 }], points: [{ x: t, y: v(t), label: 'v = ' + r2(v(t)), color: c.gold, dx: -8, dy: -10, anchor: 'end' }], texts: [{ x: t * 0.6, y: a * t * 0.12, t: 'area = distance = ' + r2(0.5 * a * t * t) + ' m', color: c.gold }], caption: 'On a speed-time graph the gradient is the acceleration and the area is the distance travelled.' } };
  };
  FM.knowledgeGraphWrap();
})();
