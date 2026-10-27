// Graphs for the lessons: for each lesson, the diagram that goes with a given step (by step number, counting from 0). Wraps the lesson so the text stays where it is.
(function () {
  const FM = (window.FM = window.FM || {});
  const L = FM.knowledgeLessons, COL = () => FM.knowledgeDiagramColors;
  const r2 = (v) => Math.round(v * 100) / 100;
  const demand = (s) => { const k = 0.9 * s.sold / s.price, A = s.sold + k * s.price; return { k, A, R: (p) => p * (A - k * p) }; };
  const span = (f, a, b, pad) => { let lo = Infinity, hi = -Infinity; for (let i = 0; i <= 60; i++) { const v = f(a + (b - a) * i / 60); if (isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } } const e = (hi - lo) * (pad == null ? 0.1 : pad); return [lo - e, hi + e]; };
  const tangent = (f, x, slope, color) => ({ p1: [x, f(x)], p2: [x + 1, f(x) + slope], ext: true, color: color || '#deb862', width: 2 });
  // the revenue curve of the big stand, with the price you charge now
  const rev = (d) => { const s = d.big, dm = demand(s), p = s.price, pk = dm.A / (2 * dm.k), top = dm.R(pk), c = COL(); return { s, dm, p, pk, top, c, base: { x: [0, dm.A / dm.k], y: [0, top * 1.15], xlabel: 'Ticket price p (£)', ylabel: 'Revenue R (£)', curves: [{ f: dm.R, color: c.main, label: 'R(p)', lx: dm.A / dm.k * 0.78 }] } }; };

  const G = {
    'p-gradient': (d) => {
      const { s, dm, p, pk, top, c, base } = rev(d), R0 = dm.R(p), g = dm.A - 2 * dm.k * p, here = { x: p, y: R0, label: 'today £' + p, color: c.gold, dy: -12 };
      const chord = (h) => ({ p1: [p, R0], p2: [p + h, dm.R(p + h)], color: h === 4 ? c.red : c.green, width: 2, ext: true });
      return {
        0: { x: [0, dm.A / dm.k], y: [0, dm.A * 1.05], xlabel: 'Ticket price p (£)', ylabel: 'Seats sold q', curves: [{ f: (x) => dm.A - dm.k * x, color: c.main, label: 'q = A - kp', lx: dm.A / dm.k * 0.5, ly: dm.A * 0.62 }], points: [{ x: p, y: s.sold, label: d.num(s.sold) + ' seats at £' + p, color: c.gold }], caption: 'The crowd falls in a straight line as the price rises.' },
        1: Object.assign({}, base, { points: [here], caption: 'Revenue rises, peaks and then falls: an upside-down U.' }),
        2: Object.assign({}, base, { vlines: [{ x: pk }], points: [here, { x: pk, y: top, label: 'peak £' + r2(pk), color: c.green, dy: -12, anchor: 'middle', dx: 0 }], caption: 'Left of the peak a price rise helps. Right of it, a price rise hurts.' }),
        3: Object.assign({}, base, { lines: [chord(4)], points: [here, { x: p + 4, y: dm.R(p + 4), color: c.red, label: '£' + (p + 4), dy: 18 }], caption: 'The chord joins today\'s price to a price £4 higher. Its steepness is the average rate of change.' }),
        4: Object.assign({}, base, { lines: [chord(4), chord(2), chord(1)], points: [here], caption: 'As the second price moves in, the chords swing round and settle.' }),
        5: Object.assign({}, base, { lines: [chord(4), tangent(dm.R, p, g)], points: [here], caption: 'The limit of the chords is the tangent. Its gradient is ' + r2(g) + ' £ per £1.' }),
      };
    },
    'p-firstprin': (d) => {
      const { s, dm, p, c } = rev(d), A = dm.A, k = dm.k, g = (q) => A - 2 * k * q, pk = A / (2 * k), f = (x) => x * x;
      return {
        1: { x: [0, 4], y: [0, 16], xlabel: 'x', ylabel: 'f(x)', curves: [{ f, color: c.main, label: 'f(x) = x²', lx: 3.3 }], lines: [{ p1: [2, 4], p2: [3, 9], ext: true, color: c.red, width: 2 }], points: [{ x: 2, y: 4, label: 'x', dy: 18, dx: -4, anchor: 'end' }, { x: 3, y: 9, label: 'x + h', color: c.red, dx: 8, dy: 16 }], texts: [{ x: 2.45, y: 2.2, t: 'h = 1', color: c.red }, { x: 3.1, y: 6.3, t: '2xh + h²', color: c.red }], caption: 'A chord from x to x + h. The rise is 2xh + h² and the run is h.' },
        7: { x: [0, A / k], y: span(g, 0, A / k), xlabel: 'Ticket price p (£)', ylabel: 'Gradient dR/dp (£ per £1)', curves: [{ f: g, color: c.green, label: 'dR/dp', lx: A / k * 0.7, ly: g(A / k * 0.7) }], points: [{ x: p, y: g(p), label: '£' + p + ': ' + r2(g(p)), color: c.gold, dy: -10 }, { x: pk, y: 0, label: 'zero at £' + r2(pk), color: c.main, dy: -10 }], caption: 'The gradient function is a straight line. Where it crosses zero, revenue stops rising and starts falling.' },
        8: { x: [0, 3], y: [0, 28], xlabel: 'x', curves: [{ f: (x) => x * x * x, color: c.main, label: 'x³', lx: 2.45, ly: 15 }, { f: (x) => 3 * x * x, color: c.green, label: '3x²', lx: 2.3, ly: 22 }], caption: 'The cube and its gradient function.' },
      };
    },
    'p-diffpowers': (d) => {
      const { s, dm, p, c } = rev(d), A = dm.A, k = dm.k, g = (q) => A - 2 * k * q, n = s.sold, F = 3 * s.seats, cn = -F / (n * n), cf = (x) => F / x, pk = A / (2 * k);
      return {
        3: { x: [0, A / k], y: span(g, 0, A / k), xlabel: 'Ticket price p (£)', ylabel: 'dR/dp', curves: [{ f: g, color: c.green, label: 'dR/dp = ' + r2(A) + ' - ' + r2(2 * k) + 'p', lx: A / k * 0.3, ly: g(A / k * 0.3) }], points: [{ x: p, y: g(p), color: c.gold, label: 'today', dy: -10 }, { x: pk, y: 0, color: c.main, label: 'peak', dy: -10 }], caption: 'Differentiating term by term gives a straight line for the gradient.' },
        6: { x: [n * 0.35, n * 1.7], y: span(cf, n * 0.35, n * 1.7), xlabel: 'Crowd n (fans)', ylabel: 'Fixed cost per fan (£)', curves: [{ f: cf, color: c.main, label: 'F / n', lx: n * 1.45 }], lines: [tangent(cf, n, cn)], points: [{ x: n, y: cf(n), label: 'today: ' + d.num(n) + ' fans', color: c.gold, dy: -12 }], caption: 'The cost per fan falls as the crowd grows. The tangent\'s gradient is dc/dn.' },
      };
    },
    'p-chain': (d) => {
      const { s, dm, p, c } = rev(d), A = dm.A, k = dm.k, n = s.sold, cc = 0.06 * p / n, C = (x) => cc * x * x, Cp = (q) => C(A - k * q), ans = -2 * cc * k * n;
      return {
        0: { x: [0, A / k], y: [0, A * 1.05], xlabel: 'Ticket price p (£)', ylabel: 'Crowd n', curves: [{ f: (x) => A - k * x, color: c.main }], points: [{ x: p, y: n, color: c.gold, label: 'link one: dn/dp = -' + r2(k), dy: -12 }], caption: 'Link one: the price sets the crowd.' },
        1: { x: [0, A], y: [0, C(A) * 1.05], xlabel: 'Crowd n (fans)', ylabel: 'Stewarding cost C (£)', curves: [{ f: C, color: c.main, label: 'C = cn²', lx: A * 0.6 }], lines: [tangent(C, n, 2 * cc * n)], points: [{ x: n, y: C(n), color: c.gold, label: 'dC/dn = ' + r2(2 * cc * n), dy: -12, dx: -10, anchor: 'end' }], caption: 'Link two: the crowd sets the cost. The cost curve is steep at this crowd.' },
        7: { x: [0, A / k], y: [0, C(0) * 1.05], xlabel: 'Ticket price p (£)', ylabel: 'Stewarding cost C (£)', curves: [{ f: Cp, color: c.main, label: 'C(p)', lx: A / k * 0.15, ly: Cp(A / k * 0.15) }], lines: [tangent(Cp, p, ans)], points: [{ x: p, y: Cp(p), color: c.gold, label: 'dC/dp = ' + r2(ans), dy: -12 }], caption: 'Putting the two links together: cost against price, falling at ' + r2(-ans) + ' £ per £1 at today\'s price.' },
      };
    },
    'p-product': (d) => {
      const { s, dm, p, c, base } = rev(d), A = dm.A, k = dm.k, n = s.sold, h = 3, g = A - 2 * k * p;
      return {
        1: { x: [0, p * 1.5], y: [0, A * 0.85], xlabel: 'Ticket price p (£)', ylabel: 'Seats sold q', rects: [{ x: 0, y: 0, w: p, h: n - k * h, fill: 'rgba(127,214,255,.22)', label: 'revenue ' + d.num(dm.R(p)) }, { x: p, y: 0, w: h, h: n - k * h, fill: 'rgba(98,208,146,.5)' }, { x: 0, y: n - k * h, w: p, h: k * h, fill: 'rgba(238,122,112,.5)' }], curves: [{ f: (x) => A - k * x, color: c.main }], texts: [{ x: p + h * 0.15, y: (n - k * h) / 2, t: 'gain', color: c.green }, { x: p * 0.55, y: n - k * h * 0.4, t: 'loss', color: c.red, anchor: 'middle' }], caption: 'Revenue is a rectangle: price across, crowd up. Raise the price by £' + h + ': the green strip is gained, the red strip is lost.' },
        5: Object.assign({}, base, { lines: [tangent(dm.R, p, g)], points: [{ x: p, y: dm.R(p), color: c.gold, label: 'gradient ' + r2(g), dy: -12 }], caption: 'Gain and loss nearly cancel here, so the tangent is almost flat: you are close to the best price.' }),
      };
    },
    'p-quotient': (d) => {
      const { s, dm, p, c } = rev(d), A = dm.A, k = dm.k, n = s.sold, F = 3 * s.seats, w = 1.2, cp = (q) => (F + w * (A - k * q)) / (A - k * q), ans = k * F / (n * n), lo = p * 0.3, hi = Math.min(A / k * 0.92, p * 1.8);
      return {
        1: { x: [lo, hi], y: span(cp, lo, hi), xlabel: 'Ticket price p (£)', ylabel: 'Cost per fan (£)', curves: [{ f: cp, color: c.main, label: 'cost per fan', lx: lo + (hi - lo) * 0.1 }], lines: [tangent(cp, p, ans)], points: [{ x: p, y: cp(p), label: 'today £' + r2(cp(p)), color: c.gold, dy: -12 }], caption: 'Cost per fan climbs as the price rises, because fewer fans share the fixed cost.' },
      };
    },
  };
  FM.knowledgeGraphs = G; FM.knowledgeGraphHelpers = { demand, span, tangent, rev, r2 };
  FM.knowledgeGraphWrap = () => Object.keys(G).forEach((id) => {
    const orig = L[id]; if (!orig || orig.graphed) return;
    L[id] = (d) => { const les = orig(d); try { const gs = G[id](d, les); Object.keys(gs).forEach((i) => { if (les.steps[i]) les.steps[i].diagram = gs[i]; }); } catch (e) { /* the lesson stands without its graph */ } return les; };
    L[id].graphed = true;
  });
  FM.knowledgeGraphWrap();
})();
