// The bond market the club can put its cash into. A bond pays a fixed coupon every matchday and its face value back at the end. Its price moves the opposite way to its yield:
// when yields rise, the price of a bond already issued falls, and when they fall it rises. What moves yields here:
//   the central bank's rate (it steps up or down now and then),
//   the shape of the yield curve (the premium for lending for longer, which can turn negative: an inverted curve),
//   the demand for safe bonds (investors piling in or out), and the supply of bonds (the government issuing more).
// Demand and supply are drawn as curves of price against quantity for a reference five-year bond; a shift in either moves the price, and the price gives the yield.
// A corporate bond pays more for the risk of a company failing: its spread over the government yield widens in a credit scare.
//
// Holdings are valued at the market price (the club's balance sheet carries them at that value), coupons come in every matchday as interest received, and a bond bought
// is paid for out of the cash the board has not tied up. Buying and selling cost a small dealing spread.
(function () {
  const FM = (window.FM = window.FM || {});
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const ROUNDS = 14;   // matchdays in a year
  const SERIES = [
    { id: 'g1', name: 'Treasury note, 1-year', short: '1-year note', years: 1, kind: 'gilt', spread: 0.0015 },
    { id: 'g2', name: 'Treasury note, 2-year', short: '2-year note', years: 2, kind: 'gilt', spread: 0.0015 },
    { id: 'g5', name: 'Treasury bond, 5-year', short: '5-year bond', years: 5, kind: 'gilt', spread: 0.002 },
    { id: 'g10', name: 'Treasury bond, 10-year', short: '10-year bond', years: 10, kind: 'gilt', spread: 0.0025 },
    { id: 'c5', name: 'Corporate bond, 5-year (A-rated)', short: '5-year corporate', years: 5, kind: 'corp', spread: 0.006 },
  ];
  const BETA_D = 1, BETA_S = 1;   // how far the quantity demanded falls, and the quantity supplied rises, for each point of price
  const gauss = (rng) => { let u = 0, v = 0; while (u === 0) u = rng(); while (v === 0) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  // the price of a bond that pays coupon c (a year's worth, as a share of face 100) every matchday for n more matchdays and then 100, at the annual yield y
  function price(c, n, y) {
    if (n <= 0) return 100;
    const q = Math.pow(1 + y, -1 / ROUNDS);
    if (Math.abs(1 - q) < 1e-12) return 100 + 100 * c * n / ROUNDS;
    return 100 * c / ROUNDS * q * (1 - Math.pow(q, n)) / (1 - q) + 100 * Math.pow(q, n);
  }
  function yieldFor(c, n, p) {   // the yield that gives the price p
    let lo = -0.05, hi = 0.5; for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (price(c, n, mid) > p) lo = mid; else hi = mid; } return (lo + hi) / 2;
  }
  function duration(c, n, y) {   // modified duration, in years: how many per cent the price falls for a rise of one per cent in the yield
    const h = 0.0001, p0 = price(c, n, y), p1 = price(c, n, y + h), p2 = price(c, n, y - h); return p0 ? -(p1 - p2) / (2 * h) / p0 : 0;
  }

  function init(lg) {
    const rng = FM.mulberry32((lg.seed || 1) + (lg.runSeed || 0) * 4421 + 99);
    const st = { v: 1, rate: Math.round((0.02 + rng() * 0.04) * 400) / 400, slope: -0.006 + rng() * 0.022, baseSlope: 0.012, dem: 0, sup: 0, credit: 0.013, t: 0, hist: [], holdings: [], realised: 0, seq: 1, coupons: {}, log: [], traded: 0 };
    SERIES.forEach((s) => { const y = fundYield(st, s); st.coupons[s.id] = Math.round(y / 0.0025) * 0.0025; });
    record(st, lg);
    return st;
  }
  const termPremium = (st, T) => st.slope * (1 - Math.exp(-T / 3)) / (1 - Math.exp(-10 / 3));
  // the yield the economy's fundamentals call for, before the pressure of demand and supply
  function fundYield(st, s) { return Math.max(0.001, st.rate + termPremium(st, s.years) + (s.kind === 'corp' ? st.credit : 0)); }
  // the shift in yield from demand and supply (the same for every maturity), from the reference five-year bond
  function pressure(st) { return -((st.dem - st.sup) / (BETA_D + BETA_S)) / 440; }
  function marketYield(st, s, yearsLeft) {
    const T = yearsLeft != null ? Math.max(0.05, yearsLeft) : s.years;
    return Math.max(0.0005, st.rate + termPremium(st, T) + (s.kind === 'corp' ? st.credit : 0) + pressure(st));
  }
  const seriesBy = (id) => SERIES.find((s) => s.id === id);
  // quoted prices and yields of each series (a bond of that term, with the coupon it was set up with)
  function quote(st, s) {
    const y = marketYield(st, s), c = st.coupons[s.id], p = price(c, s.years * ROUNDS, y);
    return { id: s.id, y, c, mid: p, ask: p * (1 + s.spread), bid: p * (1 - s.spread), dur: duration(c, s.years * ROUNDS, y) };
  }
  function record(st, lg) {
    const y = {}, p = {}; SERIES.forEach((s) => { const q = quote(st, s); y[s.id] = q.y; p[s.id] = q.mid; });
    const ref = referenceCurves(st);
    st.hist.push({ t: st.t, rate: st.rate, slope: st.slope, dem: st.dem, sup: st.sup, y, p, q: ref.q, pr: ref.p });
    if (st.hist.length > 90) st.hist.shift();
  }
  // the curves of the reference bond (the five-year Treasury): demand and supply of price against quantity. Without any shift they cross at 100 at a quantity of 100.
  // The central bank and the level of yields move the price through the demand curve (investors want more yield, so demand shifts left), and the pressure of
  // demand and supply adds to it: the total horizontal shift is what puts the price where it is.
  function referenceCurves(st) {
    const s = seriesBy('g5'), c = st.coupons.g5, n = s.years * ROUNDS, Pf = price(c, n, st.rate + termPremium(st, 5)), shiftRate = (Pf - 100) * (BETA_D + BETA_S);
    const dem = shiftRate + st.dem, sup = st.sup;   // demand shifted by the level of yields and by appetite, supply by issuance
    const P = 100 + (dem - sup) / (BETA_D + BETA_S), Q = 100 + (BETA_S * dem + BETA_D * sup) / (BETA_D + BETA_S);
    return { p: P, q: Q, dem, sup, shiftRate, Pf };
  }

  // ---------- the market, a matchday at a time ----------
  function step(lg, st) {
    const rng = FM.mulberry32((lg.seed || 1) + (lg.runSeed || 0) * 4421 + st.t * 7919 + 17), events = [];
    st.t += 1;
    // the central bank moves its rate now and then; the curve flattens when it hikes and steepens when it cuts, and settles back
    if (rng() < 0.085) {
      const d = [-0.0075, -0.005, -0.0025, 0.0025, 0.005, 0.0075][Math.floor(rng() * 6)], nr = clamp(st.rate + d, 0.003, 0.085);
      if (nr !== st.rate) { events.push({ kind: 'rate', d: nr - st.rate, text: 'The central bank ' + (nr > st.rate ? 'raises' : 'cuts') + ' its rate by ' + (Math.abs(nr - st.rate) * 100).toFixed(2) + ' points, to ' + (nr * 100).toFixed(2) + '%.' }); st.slope = st.slope - (nr - st.rate) * 0.9; st.rate = nr; }
    }
    st.slope = clamp(st.slope + (st.baseSlope - st.slope) * 0.05 + 0.0012 * gauss(rng), -0.02, 0.035);
    // appetite for safe bonds: shocks of risk-off (demand up) and risk-on (demand down), which fade
    st.dem = st.dem * 0.88 + 1.1 * gauss(rng);
    if (rng() < 0.07) { const d = (rng() < 0.5 ? 1 : -1) * (6 + rng() * 8); st.dem += d; events.push({ kind: 'demand', d, text: d > 0 ? 'Investors move into safe bonds: demand for Treasuries jumps, and prices rise.' : 'Appetite for risk returns: investors sell bonds for shares, and bond demand falls.' }); }
    // supply: the government issuing more bonds than the market expected pushes prices down
    st.sup = st.sup * 0.9 + 0.8 * gauss(rng);
    if (rng() < 0.06) { const d = rng() < 0.7 ? 4 + rng() * 7 : -(3 + rng() * 4); st.sup += d; events.push({ kind: 'supply', d, text: d > 0 ? 'The Treasury announces a larger bond sale than expected: supply rises, and prices fall.' : 'The Treasury cuts its borrowing plans: fewer new bonds, and prices rise.' }); }
    // corporate credit: the spread over Treasuries drifts back to normal, with the odd scare
    st.credit = clamp(0.013 + (st.credit - 0.013) * 0.9 + 0.0008 * gauss(rng), 0.006, 0.07);
    if (rng() < 0.012) { st.credit += 0.015 + rng() * 0.02; events.push({ kind: 'credit', text: 'A scare in the corporate market: investors want a much bigger premium to lend to companies, and corporate bond prices fall.' }); }
    return events;
  }

  // ---------- the club's holdings ----------
  const played = (b) => b.ledger.length;
  function holdingState(st, b, h) { const left = Math.max(0, h.matures - played(b)), s = seriesBy(h.series), y = marketYield(st, s, left / ROUNDS), mid = price(h.coupon, left, y); return { left, years: left / ROUNDS, y, mid, value: mid * h.qty, income: h.qty * 100 * h.coupon / ROUNDS, bid: mid * (1 - s.spread) }; }
  function get(lg) { const b = FM.biz(lg); if (!b.bonds || b.bonds.v !== 1) b.bonds = init(lg); return b.bonds; }

  FM.bonds = {
    SERIES, price, yieldFor, duration, state: get, seriesBy, quote: (lg, id) => quote(get(lg), seriesBy(id)), referenceCurves: (lg) => referenceCurves(get(lg)),
    fundYield: (lg, id) => fundYield(get(lg), seriesBy(id)), marketYield: (lg, id, years) => marketYield(get(lg), seriesBy(id), years), pressure: (lg) => pressure(get(lg)),
    curve(lg) { const st = get(lg); return [0.25, 0.5, 1, 2, 3, 5, 7, 10].map((T) => ({ T, y: Math.max(0.0005, st.rate + termPremium(st, T) + pressure(st)) })); },
    holdingState(lg, h) { return holdingState(get(lg), FM.biz(lg), h); },
    couponPerRound(b) { if (!b.bonds || !b.bonds.holdings) return 0; return b.bonds.holdings.reduce((a, h) => (h.matures - played(b) > 0 ? a + h.qty * 100 * h.coupon / ROUNDS : a), 0); },
    // for the balance sheet: market value, what was paid, and what has been made on bonds sold
    balance(lg) {
      const b = lg.biz; if (!b || !b.bonds || !b.bonds.holdings) return { value: 0, cost: 0, realised: 0 };
      const st = b.bonds; let value = 0, cost = 0; st.holdings.forEach((h) => { const hs = holdingState(st, b, h); value += hs.value; cost += h.cost; });
      return { value, cost, realised: st.realised || 0 };
    },
    // what is free to invest: cash the board is not holding back
    available(lg) { const b = FM.biz(lg), reserve = Math.max(500000, (b.board && b.board.reserve) || 0); return Math.max(0, Math.floor((b.cash - reserve) / 1e4) * 1e4); },
    portfolio(lg) {
      const st = get(lg), b = FM.biz(lg), rows = st.holdings.map((h) => Object.assign({ h }, holdingState(st, b, h)));
      return { rows, value: rows.reduce((a, r) => a + r.value, 0), cost: st.holdings.reduce((a, h) => a + h.cost, 0), income: rows.reduce((a, r) => a + r.income, 0), realised: st.realised || 0 };
    },
    buy(lg, id, amount) {
      const st = get(lg), b = FM.biz(lg), s = seriesBy(id); if (!s) return { ok: false, text: 'That bond does not exist.' };
      if (lg.mp) return { ok: false, text: 'Bonds are not part of this kind of game.' };
      const q = quote(st, s), avail = FM.bonds.available(lg); amount = Math.floor(Number(amount) / 1e4) * 1e4;
      if (!(amount >= 10000)) return { ok: false, text: 'Enter an amount of at least £10,000.' };
      if (amount > avail) return { ok: false, text: 'The club can invest at most £' + Math.round(avail).toLocaleString('en-GB') + ' now: the board keeps its reserve back.' };
      const qty = Math.floor(amount / q.ask); if (qty < 1) return { ok: false, text: 'That buys less than one bond.' };
      const cost = Math.round(qty * q.ask), hold = { id: 'B' + (st.seq++), series: id, qty, coupon: q.c, cost, bought: played(b), matures: played(b) + s.years * ROUNDS, buyYield: q.y, buyPrice: q.ask };
      st.holdings.push(hold); b.cash -= cost; b.pending.invest += cost; st.traded += cost;
      FM.bizSyncBudget(lg);
      return { ok: true, qty, cost, text: 'Bought ' + qty.toLocaleString('en-GB') + ' bonds (face value £' + (qty * 100).toLocaleString('en-GB') + ') for £' + cost.toLocaleString('en-GB') + ', a yield of ' + (q.y * 100).toFixed(2) + '%.' };
    },
    sell(lg, holdId, qty) {
      const st = get(lg), b = FM.biz(lg), h = st.holdings.find((x) => x.id === holdId); if (!h) return { ok: false, text: 'There is no such holding.' };
      qty = Math.max(1, Math.min(h.qty, Math.floor(Number(qty) || h.qty)));
      const hs = holdingState(st, b, h), proceeds = Math.round(qty * hs.bid), costShare = Math.round(h.cost * qty / h.qty);
      b.cash += proceeds; b.pending.divest += proceeds; st.realised += proceeds - costShare; h.cost -= costShare; h.qty -= qty;
      if (h.qty <= 0) st.holdings = st.holdings.filter((x) => x !== h);
      FM.bizSyncBudget(lg);
      return { ok: true, proceeds, gain: proceeds - costShare, text: 'Sold ' + qty.toLocaleString('en-GB') + ' bonds for £' + proceeds.toLocaleString('en-GB') + ' (' + (proceeds - costShare >= 0 ? 'a gain' : 'a loss') + ' of £' + Math.abs(proceeds - costShare).toLocaleString('en-GB') + ').' };
    },
    // the matchday: the market moves, bonds that have run out are paid back
    afterRound(lg, b) {
      if (lg.mp) return; const st = get(lg), events = step(lg, st);
      // redemptions
      st.holdings = st.holdings.filter((h) => {
        if (h.matures - played(b) > 0) return true;
        const proceeds = h.qty * 100; b.cash += proceeds; b.pending.divest += proceeds; st.realised += proceeds - h.cost;
        events.push({ kind: 'matured', text: 'Your ' + seriesBy(h.series).short + ' has matured: £' + proceeds.toLocaleString('en-GB') + ' repaid at face value.' }); return false;
      });
      record(st, lg);
      events.forEach((e) => { st.log.unshift({ t: st.t, text: e.text, kind: e.kind }); if (e.kind !== 'matured' && FM.pushNews && ['rate', 'credit'].indexOf(e.kind) >= 0) FM.pushNews(lg, { round: b.ledger.length - 1, day: lg.day, kind: 'Markets', headline: e.kind === 'rate' ? (e.d > 0 ? 'Interest rates rise' : 'Interest rates cut') : 'Corporate credit scare', body: e.text, mine: false }); });
      st.log = st.log.slice(0, 40); FM.bizSyncBudget(lg);
    },
  };
})();
