// Real figures for lessons. When a student asks to be taught something about their own club's ticket prices (differentiation, elasticity, the best price), the lesson has to be built on
// the club's own records, not on made-up numbers: the price and the crowd in a stand at each of the last few home matches. This file reads them, fits a curve through them
// (a quadratic, least squares: with three matches it passes through all three points), works out the revenue curve, its derivative and the price that makes the most money, and says all of
// it in plain text for the agent to teach from (it may use these numbers and no others). The same figures draw the graphs in the lesson (see FM.lessonFit.diagram), so the picture
// and the working always agree. The browser does the arithmetic; the agent never does.
(function () {
  const FM = (window.FM = window.FM || {});
  const r = (v, d) => { const k = Math.pow(10, d); return Math.round(v * k) / k; };
  const fmt = (v, d) => { const x = r(v, d); return (x < 0 ? '-' : '') + Math.abs(x).toLocaleString('en-GB', { useGrouping: false, maximumFractionDigits: d }); };
  const gbp = (v) => '£' + Math.round(v).toLocaleString('en-GB');
  const WANTS = /\b(ticket|price|pricing|attendance|crowd|elastic\w*|demand|revenue|takings|optimal|optimum|differentiat\w*|derivative)\b/i;

  // the three numbers a, b, c of  q = a + b p + c p^2 , by least squares through the points
  function fitQuadratic(pts) {
    const n = pts.length; let s0 = n, s1 = 0, s2 = 0, s3 = 0, s4 = 0, t0 = 0, t1 = 0, t2 = 0;
    pts.forEach(({ p, q }) => { s1 += p; s2 += p * p; s3 += p * p * p; s4 += p * p * p * p; t0 += q; t1 += p * q; t2 += p * p * q; });
    const M = [[s0, s1, s2, t0], [s1, s2, s3, t1], [s2, s3, s4, t2]];
    for (let i = 0; i < 3; i++) {
      let piv = i; for (let k = i + 1; k < 3; k++) if (Math.abs(M[k][i]) > Math.abs(M[piv][i])) piv = k;
      if (Math.abs(M[piv][i]) < 1e-12) return null;
      [M[i], M[piv]] = [M[piv], M[i]];
      for (let k = 0; k < 3; k++) if (k !== i) { const f = M[k][i] / M[i][i]; for (let j = i; j < 4; j++) M[k][j] -= f * M[i][j]; }
    }
    return { a: M[0][3] / M[0][0], b: M[1][3] / M[1][1], c: M[2][3] / M[2][2] };
  }

  // The records for one stand: the price and the crowd at each of the last few home matches.
  FM.lessonFitFor = function (league, standId, n) {
    const b = FM.biz ? FM.biz(league) : null; if (!b) return null;
    const sg = (FM.SEGMENTS || []).find((s) => s.id === standId); if (!sg) return null;
    const homes = (b.ledger || []).filter((e) => e.home && e.att && e.prices && e.prices[standId] != null).slice(-(n || 3));
    const pts = homes.map((e) => ({ round: e.round, p: e.prices[standId], q: e.att[standId] }));
    const seats = (b.seats && b.seats[standId]) || sg.seats, pr = b.prices && b.prices[standId], current = pr && pr.price != null ? pr.price : (pts.length ? pts[pts.length - 1].p : sg.ref);
    const out = { stand: standId, name: sg.name, seats, current, points: pts, ok: false };
    const distinct = new Set(pts.map((x) => x.p)).size;
    if (pts.length < 3 || distinct < 3) { out.why = pts.length < 3 ? 'Only ' + pts.length + ' home match' + (pts.length === 1 ? ' has' : 'es have') + ' been played, and a curve needs three.' : 'The price was the same in some of these matches, so they do not give three different points. Change the price between home matches to see how the crowd reacts.'; return out; }
    const f = fitQuadratic(pts); if (!f) { out.why = 'The points do not give a curve.'; return out; }
    // the coefficients as shown are the ones used from here on, so the equation on the page is exactly the one that is differentiated
    out.fit = { a: r(f.a, 1), b: r(f.b, 2), c: r(f.c, 4) };
    return derive(out);
  };

  // everything that follows from the curve and the points: revenue, its derivative, the best price (kept as figures, so a lesson can be drawn again from a saved copy)
  function derive(out) {
    const { a, b: bb, c } = out.fit, pts = out.points, seats = out.seats, current = out.current;
    const q = (p) => a + bb * p + c * p * p, R = (p) => p * q(p), dR = (p) => a + 2 * bb * p + 3 * c * p * p, d2R = (p) => 2 * bb + 6 * c * p;
    // the price that makes the most money: where the slope of revenue is zero and is falling
    const lo = Math.max(1, Math.min.apply(null, pts.map((x) => x.p)) * 0.5), hi = Math.max.apply(null, pts.map((x) => x.p)) * 2.5;
    let turn = null;
    if (Math.abs(c) > 1e-9) { const disc = 4 * bb * bb - 12 * a * c; if (disc >= 0) [(-2 * bb + Math.sqrt(disc)) / (6 * c), (-2 * bb - Math.sqrt(disc)) / (6 * c)].forEach((x) => { if (x >= lo && x <= hi && d2R(x) < 0 && q(x) > 0 && (turn == null || R(x) > R(turn))) turn = x; }); }
    else if (Math.abs(bb) > 1e-9) { const x = -a / (2 * bb); if (x >= lo && x <= hi && d2R(x) < 0) turn = x; }
    out.ok = true; out.q = q; out.R = R; out.dR = dR; out.turn = turn;
    // at the whole-pound price either side of it; and the stand cannot hold more than its seats
    let best = null;
    if (turn != null) [Math.floor(turn), Math.ceil(turn)].forEach((p) => { if (p < 1) return; const qq = Math.min(q(p), seats); if (qq > 0 && (!best || p * qq > best.revenue)) best = { p, q: Math.round(qq), revenue: p * qq, capped: q(p) > seats }; });
    out.best = best; out.curQ = Math.min(q(current), seats); out.curRevenue = current * out.curQ;
    const slope = bb + 2 * c * current;   // the slope of the crowd against the price, at the price now
    out.elasticity = q(current) > 0 ? slope * current / q(current) : null;
    out.pmin = lo; out.pmax = hi;
    return out;
  }

  // the lesson's data as plain text: the figures, and the working done in full, for the agent to teach from
  FM.lessonDataText = function (league, text) {
    if (!WANTS.test(String(text || '')) || !FM.biz) return '';
    let sg = (FM.SEGMENTS || []).find((s) => new RegExp(s.name.split(' ')[0], 'i').test(text)) || null;
    const asked = !!sg; if (!sg) sg = (FM.SEGMENTS || []).find((s) => s.id === 'general');
    const f = FM.lessonFitFor(league, sg.id, 3); if (!f) return '';
    FM.lessonFit.current = f;
    const L = ['Stand: ' + f.name + ' (' + f.seats.toLocaleString('en-GB') + ' seats); the price now is ' + gbp(f.current) + '.'];
    L.push('The last home matches (price, then crowd): ' + f.points.map((x) => 'round ' + x.round + ': ' + gbp(x.p) + ', ' + x.q.toLocaleString('en-GB')).join('; ') + '.');
    if (!f.ok) { L.push('A curve cannot be fitted yet: ' + f.why); return L.join('\n') + (asked ? '' : '\n(The stand was not named, so the general admission stand is shown.)'); }
    const { a, b, c } = f.fit, sgn = (v, d) => (v < 0 ? '- ' : '+ ') + fmt(Math.abs(v), d);
    L.push('A curve through those points (least squares, a quadratic): q = ' + fmt(a, 1) + ' ' + sgn(b, 2) + 'p ' + sgn(c, 4) + 'p^2, where p is the price in pounds and q the crowd.');
    L.push('Revenue is price times crowd: R = p q = ' + fmt(a, 1) + 'p ' + sgn(b, 2) + 'p^2 ' + sgn(c, 4) + 'p^3.');
    L.push('Its derivative: dR/dp = ' + fmt(a, 1) + ' ' + sgn(2 * b, 2) + 'p ' + sgn(3 * c, 4) + 'p^2, and its second derivative: d2R/dp2 = ' + fmt(2 * b, 2) + ' ' + sgn(6 * c, 4) + 'p.');
    if (f.turn != null) L.push('dR/dp = 0 at p = ' + fmt(f.turn, 2) + ' (where d2R/dp2 is negative: a maximum of revenue). To the whole pound the best price is ' + (f.best ? gbp(f.best.p) + ', with a crowd of about ' + f.best.q.toLocaleString('en-GB') + ' and takings of about ' + gbp(f.best.revenue) + ' a match' + (f.best.capped ? ' (the stand is full at that price, so the crowd is capped by its seats)' : '') : 'not usable') + '. At the current price the takings are about ' + gbp(f.curRevenue) + '.');
    else L.push('dR/dp = 0 has no maximum between ' + gbp(f.pmin) + ' and ' + gbp(f.pmax) + ' on this curve, so the three matches do not point to a best price yet. Say so honestly and suggest trying a different price.');
    if (f.elasticity != null) L.push('Price elasticity of demand at the current price (the slope of the curve times p over q): ' + fmt(f.elasticity, 2) + (Math.abs(f.elasticity) > 1 ? ' (elastic: cutting the price raises takings)' : ' (inelastic: raising the price raises takings)') + '.');
    L.push('To put it in the game: the action setTicketPrice with params {"stand":"' + f.stand + '","price":' + (f.best ? f.best.p : Math.round(f.current)) + '}.');
    L.push('The lesson\'s graphs use {"fit":"points"} (the matches as points), {"fit":"demand"} (the curve through them), {"fit":"revenue"} (revenue, with the best price marked) and {"fit":"marginal"} (the derivative, which crosses zero at the best price).');
    return L.join('\n');
  };

  // ---------- the lesson's graphs, from the same figures ----------
  const term = (v, p, d) => '(' + r(v, d) + ')*x' + (p === 1 ? '' : '^' + p);
  FM.lessonFit = {
    current: null,
    // what is kept with a lesson (plain figures), and the full set of working rebuilt from it
    snapshot(f) { return f && f.ok ? { stand: f.stand, name: f.name, seats: f.seats, current: f.current, points: f.points, fit: f.fit } : null; },
    rebuild(snap) { return snap && snap.fit ? derive(Object.assign({}, snap)) : null; },
    // kind: 'points' | 'demand' | 'revenue' | 'marginal'; f: the fit this lesson was built on
    diagram(kind, f) {
      if (!f || !f.ok) return null;
      const { a, b, c } = f.fit, xs = [Math.max(1, Math.floor(f.pmin)), Math.ceil(f.pmax * 0.8)];
      const base = { x: xs, xLabel: 'Ticket price (£)' }, mk = f.points.map((x) => ({ x: x.p, y: x.q, label: '£' + x.p }));
      const qExpr = '(' + r(a, 1) + ')+' + term(b, 1, 2) + '+' + term(c, 2, 4), RExpr = '(' + r(a, 1) + ')*x+' + term(b, 2, 2) + '+' + term(c, 3, 4), dExpr = '(' + r(a, 1) + ')+' + '(' + r(2 * b, 2) + ')*x+' + '(' + r(3 * c, 4) + ')*x^2';
      if (kind === 'points' || kind === 'demand') {
        const top = Math.max.apply(null, f.points.map((x) => x.q).concat([f.q(xs[0])])) * 1.15;
        return Object.assign(base, { y: [0, Math.ceil(top / 100) * 100], yLabel: 'Crowd', curves: kind === 'demand' ? [{ label: 'q', expr: qExpr }] : [], points: mk });
      }
      if (kind === 'revenue') {
        const top = Math.max(f.R(f.best ? f.best.p : f.current), f.curRevenue) * 1.25;
        return Object.assign(base, { y: [0, Math.ceil(top / 1000) * 1000], yLabel: 'Takings (£)', curves: [{ label: 'R', expr: RExpr }], points: [{ x: f.current, y: f.R(f.current), label: 'now' }].concat(f.best ? [{ x: f.best.p, y: f.R(f.best.p), label: 'best' }] : []) });
      }
      const slope0 = f.dR(xs[0]), slopeN = f.dR(xs[1]), ymin = Math.min(slope0, slopeN, 0) * 1.1, ymax = Math.max(slope0, slopeN, 0) * 1.1 || 1;
      return Object.assign(base, { y: [Math.floor(ymin / 100) * 100, Math.ceil(ymax / 100) * 100], yLabel: 'dR/dp', curves: [{ label: 'dR/dp', expr: dExpr }, { label: '0', expr: '0' }], points: f.turn != null ? [{ x: f.turn, y: 0, label: 'best' }] : [] });
    },
  };
})();
