// Real figures for lessons. When a student asks to be taught something about their own club's ticket prices (differentiation, elasticity, the best price), the lesson is built on the
// club's own records: the price and the crowd in a stand at each of the last few home matches. This file reads them and fits a demand curve through them, then works out the revenue
// curve, its derivative and the price that makes the most money, and says all of it in plain text for the agent to teach from (it may use these numbers and no others). The same
// figures draw the graphs in the lesson (FM.lessonFit.diagram), so the picture and the working always agree. The browser does the arithmetic; the agent never does.
//
// The demand curve is q = A e^(-k p): price p along the bottom, the crowd q up the side. It always falls as the price rises and it bends (the crowd falls by the same share of itself for
// each pound added), which is what a demand curve does, and it always gives a best price, which a student can find by differentiating the takings p q: R = A p e^(-k p),
// R' = A e^(-k p) (1 - k p), so the takings are greatest at p = 1/k. A curve fitted through a few noisy matches (a quadratic, say) can bend upwards, which a demand curve never does,
// so that is not used. k comes from the matches by a least-squares line through ln q; where the matches are too flat or point the wrong way to give a believable slope, k is
// kept within a believable range for the stand and the figure is still given, and the lesson says so. There is always a figure.
(function () {
  const FM = (window.FM = window.FM || {});
  const r = (v, d) => { const k = Math.pow(10, d); return Math.round(v * k) / k; };
  const fmt = (v, d) => { const x = r(v, d); return (x < 0 ? '-' : '') + Math.abs(x).toLocaleString('en-GB', { useGrouping: false, maximumFractionDigits: d }); };
  const gbp = (v) => '£' + Math.round(v).toLocaleString('en-GB');
  const WANTS = /\b(ticket|price|pricing|attendance|crowd|elastic\w*|demand|revenue|takings|optimal|optimum|differentiat\w*|derivative)\b/i;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // The records for one stand: the price and the crowd at each of the last few home matches, and the curve through them.
  FM.lessonFitFor = function (league, standId, n) {
    const b = FM.biz ? FM.biz(league) : null; if (!b) return null;
    const sg = (FM.SEGMENTS || []).find((s) => s.id === standId); if (!sg) return null;
    const homes = (b.ledger || []).filter((e) => e.home && e.att && e.prices && e.prices[standId] != null && e.att[standId] > 0).slice(-(n || 3));
    const pts = homes.map((e) => ({ round: e.round, p: e.prices[standId], q: e.att[standId] }));
    const seats = (b.seats && b.seats[standId]) || sg.seats, pr = b.prices && b.prices[standId], current = pr && pr.price != null ? pr.price : (pts.length ? pts[pts.length - 1].p : sg.ref);
    const out = { stand: standId, name: sg.name, seats, current, points: pts };
    const pbar = pts.length ? pts.reduce((a, x) => a + x.p, 0) / pts.length : current;
    // the slope of ln q against p, from the matches (needs two different prices)
    let kFit = null;
    const distinct = new Set(pts.map((x) => x.p)).size;
    if (distinct >= 2) {
      const lbar = pts.reduce((a, x) => a + Math.log(x.q), 0) / pts.length; let sxy = 0, sxx = 0;
      pts.forEach((x) => { sxy += (x.p - pbar) * (Math.log(x.q) - lbar); sxx += (x.p - pbar) * (x.p - pbar); });
      kFit = -sxy / sxx;
    }
    // a believable slope: elasticity at the average price (k p) between 0.35 and 4. Outside that, or with no slope to read, the stand's own typical elasticity is used
    const kLo = 0.35 / pbar, kHi = 4 / pbar, typical = clamp((sg.e || 0.85) / pbar, kLo, kHi);
    let k, how;
    if (kFit == null) { k = typical; how = pts.length ? 'The matches did not give two different prices, so how fast the crowd falls with the price is taken from the stand\'s typical elasticity (' + fmt(sg.e || 0.85, 2) + ').' : 'No home match has been played yet, so the curve starts from the stand\'s typical crowd and elasticity (' + fmt(sg.e || 0.85, 2) + ').'; }
    else if (kFit < kLo) { k = typical; how = 'The matches show the crowd barely moving, or moving the wrong way, as the price changed (other things were at work too), so how fast it falls with the price is taken from the stand\'s typical elasticity (' + fmt(sg.e || 0.85, 2) + ') and the curve is centred on the crowd you had.'; }
    else { k = Math.min(kFit, kHi); how = k === kFit ? '' : 'The matches show an unusually steep fall, so it is capped at a believable one.'; }
    // the height of the curve: the average of the points once k is fixed (with no matches, the game's own crowd at the current price)
    let A;
    if (pts.length) A = Math.exp(pts.reduce((a, x) => a + Math.log(x.q) + k * x.p, 0) / pts.length);
    else A = (sg.base || seats) * Math.pow(current / (sg.ref || current), -(sg.e || 0.85)) * Math.exp(k * current);
    // the numbers as shown are the numbers used from here on, so the equation on the page is exactly the one that is differentiated
    out.fit = { A: Math.round(A), k: r(k, 4) }; out.how = how; out.fromData = kFit != null && kFit >= kLo;
    return derive(out);
  };

  // everything that follows from the curve: revenue, its derivative, the best price (kept as plain figures, so a lesson can be drawn again from a saved copy)
  function derive(out) {
    const { A, k } = out.fit, seats = out.seats, current = out.current;
    const q = (p) => A * Math.exp(-k * p), R = (p) => p * q(p), dR = (p) => A * Math.exp(-k * p) * (1 - k * p), d2R = (p) => A * Math.exp(-k * p) * (k * k * p - 2 * k);
    const pStar = 1 / k, pCap = Math.log(A / seats) / k;   // the price that makes the most money, and the lowest price at which the stand is no longer full
    out.ok = true; out.q = q; out.R = R; out.dR = dR; out.d2R = d2R; out.turn = pStar; out.pCap = pCap;
    let best = null;
    [Math.floor(pStar), Math.ceil(pStar), Math.ceil(pCap)].forEach((p) => { if (!(p >= 1)) return; const qq = Math.min(q(p), seats); if (!best || p * qq > best.revenue) best = { p, q: Math.round(qq), revenue: p * qq, capped: q(p) > seats }; });
    out.best = best; out.curQ = Math.min(q(current), seats); out.curRevenue = current * out.curQ;
    out.elasticity = -k * current;   // for this curve the elasticity at a price is just -k p
    const ps = out.points.map((x) => x.p).concat([current, pStar]);
    out.pmin = Math.max(1, Math.floor(Math.min.apply(null, ps) * 0.6)); out.pmax = Math.ceil(Math.max.apply(null, ps) * 1.5);
    return out;
  }

  // the lesson's data as plain text: the figures, and the working done in full, for the agent to teach from
  FM.lessonDataText = function (league, text) {
    if (!WANTS.test(String(text || '')) || !FM.biz) return '';
    let sg = (FM.SEGMENTS || []).find((s) => new RegExp(s.name.split(' ')[0], 'i').test(text)) || null;
    const asked = !!sg; if (!sg) sg = (FM.SEGMENTS || []).find((s) => s.id === 'general');
    const f = FM.lessonFitFor(league, sg.id, 3); if (!f) return '';
    FM.lessonFit.current = f;
    const { A, k } = f.fit, Ae = fmt(A, 0), ke = fmt(k, 4);
    const L = ['Stand: ' + f.name + ' (' + f.seats.toLocaleString('en-GB') + ' seats); the price now is ' + gbp(f.current) + '.'];
    L.push(f.points.length ? 'The last home matches (price, then crowd): ' + f.points.map((x) => 'round ' + x.round + ': ' + gbp(x.p) + ', ' + x.q.toLocaleString('en-GB')).join('; ') + '.' : 'No home match has been played yet, so there are no points to plot.');
    L.push('The demand curve (price p in pounds along the bottom, the crowd q up the side), fitted to those matches: q = ' + Ae + ' e^(-' + ke + 'p). It slopes down and bends: each extra pound takes the same share of the crowd away, ' + fmt(100 * (1 - Math.exp(-k)), 1) + '% of it.' + (f.how ? ' Note for the student, to be said plainly and briefly: ' + f.how : ''));
    L.push('The takings are price times crowd, x times y on the graph: R = p q = ' + Ae + ' p e^(-' + ke + 'p). On the graph each point of the curve makes a rectangle whose area is the takings; the best price is where that rectangle is biggest.');
    L.push('Differentiating R with the product rule and the chain rule (the derivative of e^(-' + ke + 'p) is -' + ke + ' e^(-' + ke + 'p)): dR/dp = ' + Ae + ' e^(-' + ke + 'p) + ' + Ae + ' p (-' + ke + ') e^(-' + ke + 'p) = ' + Ae + ' e^(-' + ke + 'p) (1 - ' + ke + 'p).');
    L.push('Setting dR/dp = 0: because e^(-' + ke + 'p) is never zero, 1 - ' + ke + 'p = 0, so p = 1/' + ke + ' = ' + fmt(f.turn, 2) + '. The second derivative is d2R/dp2 = ' + Ae + ' e^(-' + ke + 'p) (' + ke + '^2 p - 2 x ' + ke + '), which at that price is ' + fmt(f.d2R(f.turn), 1) + ', negative, so it is a maximum.');
    L.push('To the whole pound the best price is ' + (f.best ? gbp(f.best.p) + ', with a crowd of about ' + f.best.q.toLocaleString('en-GB') + ' and takings of about ' + gbp(f.best.revenue) + ' a match' + (f.best.capped ? ' (the stand is full at that price, so the crowd is capped by its ' + f.seats.toLocaleString('en-GB') + ' seats)' : '') : 'not usable') + '. At the current price the takings are about ' + gbp(f.curRevenue) + (f.best ? ', so the change is worth about ' + gbp(f.best.revenue - f.curRevenue) + ' a match' : '') + '.');
    if (f.pCap > f.turn) L.push('The seats matter here: at ' + gbp(f.turn) + ' the curve says ' + Math.round(f.q(f.turn)).toLocaleString('en-GB') + ' people would want tickets but the stand holds only ' + f.seats.toLocaleString('en-GB') + ', so the crowd cannot follow the curve there. While the stand is full the takings are just seats times price, which keeps rising with the price, until the curve comes down to meet the seats: q = ' + f.seats.toLocaleString('en-GB') + ' gives p = ln(' + Ae + '/' + f.seats.toLocaleString('en-GB') + ')/' + ke + ' = ' + fmt(f.pCap, 2) + '. So the best price is the one where demand just meets the seats, ' + gbp(f.best ? f.best.p : f.pCap) + ', not the peak of the curve alone: say this plainly as a step, as a limit on the problem.');
    L.push('Elasticity of demand for this curve at a price p is -' + ke + 'p: ' + fmt(f.elasticity, 2) + ' at the current price (' + (Math.abs(f.elasticity) > 1 ? 'elastic: cutting the price would raise takings' : 'inelastic: raising the price would raise takings') + '), and exactly -1 at the best price, which is the general rule: takings are largest where the elasticity is -1.');
    L.push('To put it in the game: the action setTicketPrice with params {"stand":"' + f.stand + '","price":' + (f.best ? f.best.p : Math.round(f.current)) + '}.');
    L.push('The lesson\'s graphs use {"fit":"points"} (the matches as points), {"fit":"demand"} (the curve through them), {"fit":"revenue"} (takings, with the best price marked) and {"fit":"marginal"} (the derivative, which crosses zero at the best price).' + (asked ? '' : ' (The stand was not named, so the general admission stand is shown.)'));
    return L.join('\n');
  };

  // ---------- the lesson's graphs, from the same figures ----------
  const num = (v, d) => String(r(v, d));
  FM.lessonFit = {
    current: null,
    // what is kept with a lesson (plain figures), and the full set of working rebuilt from it
    snapshot(f) { return f && f.ok ? { stand: f.stand, name: f.name, seats: f.seats, current: f.current, points: f.points, fit: f.fit } : null; },
    rebuild(snap) { return snap && snap.fit && snap.fit.A ? derive(Object.assign({}, snap)) : null; },
    // kind: 'points' | 'demand' | 'revenue' | 'marginal'; f: the fit this lesson was built on
    diagram(kind, f) {
      if (!f || !f.ok) return null;
      const { A, k } = f.fit, xs = [f.pmin, f.pmax], base = { x: xs, xLabel: 'Ticket price (£)' };
      const mk = f.points.map((x) => ({ x: x.p, y: x.q, label: '£' + x.p }));
      const e = '(' + num(A, 0) + ')*exp((' + num(-k, 4) + ')*x)';
      if (kind === 'points' || kind === 'demand') {
        const top = Math.max.apply(null, f.points.map((x) => x.q).concat([f.seats, f.curQ])) * 1.2;
        return Object.assign(base, { y: [0, Math.ceil(top / 500) * 500], yLabel: 'Visitors', curves: (kind === 'demand' ? [{ label: 'q', expr: e }] : []).concat([{ label: 'Seats', expr: String(f.seats) }]), points: mk });
      }
      if (kind === 'revenue') {
        const top = Math.max(f.R(f.turn), f.curRevenue) * 1.25;
        return Object.assign(base, { y: [0, Math.ceil(top / 1000) * 1000], yLabel: 'Takings (£)', curves: [{ label: 'R', expr: 'x*' + e }], points: [{ x: f.current, y: f.R(f.current), label: 'now' }].concat(f.best ? [{ x: f.best.p, y: f.R(f.best.p), label: 'best' }] : []) });
      }
      const d = (p) => f.dR(p), hi = Math.max(d(xs[0]), 1), lo = Math.min(d(xs[1]), -1);
      return Object.assign(base, { y: [Math.floor(lo * 1.1 / 100) * 100, Math.ceil(hi * 1.1 / 100) * 100], yLabel: 'dR/dp', curves: [{ label: 'dR/dp', expr: e + '*(1-(' + num(k, 4) + ')*x)' }, { label: '0', expr: '0' }], points: [{ x: f.turn, y: 0, label: 'best' }] });
    },
  };
})();
