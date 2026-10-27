// What each lesson's question does to the club. A change a lesson offers should matter: for the pricing lessons it moves a stand toward the price the
// lesson's own maths says earns the most (or, where the lesson is about a cost, earns the most profit), on the stand the lesson was about, with what it is
// worth stated beside the button. Each lesson works on a different stand, so by the time the course has covered pricing the whole ground has been priced
// with mathematics rather than by guess. (The statistics lessons already change tactics from the club's own results.)
(function () {
  const FM = (window.FM = window.FM || {});
  const L = FM.knowledgeLessons; if (!L) return;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // The game's own demand for a stand at a price (club.js: base x (price/ref)^-e, cut away by a quartic far above what that fan would pay, times how much the
  // club appeals now), capped by the seats. `mult` is how much the club appeals now, read back from the last crowd. This is the real thing the lessons' straight-line
  // model approximates, so a price chosen with it is a price that really does earn more.
  FM.knowledgePriceModel = function (st, mode) {
    const seg = (FM.SEGMENTS || []).find((x) => x.id === st.id); if (!seg) return null;
    const unit = (p) => seg.base * Math.pow(p / seg.ref, -seg.e) / (1 + Math.pow(p / (seg.ref * 2.4), 4));
    const capped = st.sold >= st.seats - 2, mult = capped ? st.seats * 1.1 / unit(st.price) : st.sold / unit(st.price);
    const sold = (p) => Math.min(st.seats, Math.round(unit(p) * mult)), c = 0.06 * st.price / Math.max(1, st.sold);
    const score = (p) => (mode === 'profit' ? p * sold(p) - c * sold(p) * sold(p) : p * sold(p));
    let best = st.price, bv = score(st.price); for (let p = 3; p <= 260; p += 0.5) { const v = score(p); if (v > bv + 1e-6) { bv = v; best = p; } }
    return { best, revenue: (p) => p * sold(p), sold, mult };
  };
  // Marketing lifts the crowd's appeal by 0.1 ln(1 + M/5000) (club.js), so on a home match worth `gate` in tickets the extra a pound brings in is
  // gate x 0.1 / (promo x (5000 + M)); it stops paying for itself where that falls to £1: M = 0.1 gate / promo - 5000.
  FM.knowledgeMarketingModel = function (d) {
    const gate = d.gate, promo = (M) => 1 + 0.1 * Math.log(1 + M / 5000), M0 = d.marketing || 0;
    const best = clamp(Math.round((0.1 * gate / promo(M0) - 5000) / 500) * 500, 0, 60000);
    return { best, now: M0, net: (M) => gate * (promo(M) / promo(M0) - 1) - (M - M0) };
  };
  const model = (s) => { const k = 0.9 * s.sold / s.price, A = s.sold + k * s.price; return { k, A, R: (p) => Math.max(0, p * (A - k * p)), best: A / (2 * k) }; };
  const pick = (d, which) => {
    const bySeats = d.stands.slice().sort((a, c) => c.seats - a.seats);
    if (which === 'emptiest') return d.stands.slice().sort((a, c) => a.sold / a.seats - c.sold / c.seats)[0] || d.big;
    return bySeats[{ big: 0, second: 1, third: 2, fourth: 3 }[which] || 0] || d.big;
  };
  // the price that earns the most profit when stewarding costs c n^2 (the model of the chain rule lesson): the root of dR/dp - dC/dp = 0
  const profitBest = (s) => { const m = model(s), n = s.sold, c = 0.06 * s.price / n; return clamp(m.A * (1 + 2 * c * m.k) / (2 * m.k * (1 + c * m.k)), 3, 120); };
  const SPEC = {
    'g-frac': { stand: 'emptiest', step: 99, why: 'It is your emptiest stand, so the price is the thing to fix' },
    'g-pct': { stand: 'second', step: 99, why: 'A discount only helps if the price is above the revenue peak' },
    'g-pctchange': { stand: 'third', step: 99 },
    'g-rates': { stand: 'fourth', step: 99 },
    'g-formulae': { stand: 'second', step: 99 },
    'p-gradient': { stand: 'big', step: 4 },
    'p-firstprin': { stand: 'big', step: 6 },
    'p-diffpowers': { stand: 'second', step: 8 },
    'p-product': { stand: 'third', step: 8 },
    'p-chain': { stand: 'big', mode: 'profit', step: 99 },
  };
  // lessons whose question is about spending: the marketing budget goes to the level where another pound stops paying for itself
  const MKT = { 'g-ops': 'The marketing budget is a sum with parts: this is the sum that pays', 'g-inequal': 'The ceiling is an inequality: this is the best place under it', 'p-exp': 'Growth compounds: this is the spend that pays for the growth', 'p-quotient': 'Fixed costs spread over a bigger crowd: this is the spend that fills it for the money' };
  Object.keys(MKT).forEach((id) => {
    const orig = L[id]; if (!orig) return;
    L[id] = (d) => {
      const les = orig(d);
      try {
        const m = FM.knowledgeMarketingModel(d), gain = Math.round(m.net(m.best));
        les.ask.apply = Math.abs(m.best - m.now) < 500 ? { kind: 'control', action: 'setMarketing', params: { perRound: m.now }, say: 'Marketing is already near the level that pays (£' + m.best.toLocaleString('en-GB') + '): keep it at £' + m.now.toLocaleString('en-GB') }
          : { kind: 'control', action: 'setMarketing', params: { perRound: m.best }, say: 'Set marketing to £' + m.best.toLocaleString('en-GB') + ' a matchday: ' + (gain >= 0 ? 'about +£' : 'about -£') + Math.abs(gain).toLocaleString('en-GB') + ' a home match after the spend' };
      } catch (e) { /* the lesson keeps the change it had */ }
      return les;
    };
    L[id].graphed = true;
  });
  Object.keys(SPEC).forEach((id) => {
    const orig = L[id]; if (!orig) return; const sp = SPEC[id];
    L[id] = (d) => {
      const les = orig(d);
      try {
        const s = pick(d, sp.stand), pm = FM.knowledgePriceModel(s, sp.mode), best = pm ? pm.best : (sp.mode === 'profit' ? profitBest(s) : clamp(model(s).best, 3, 120)), step = sp.step || 99;
        const target = Math.round(s.price + clamp(best - s.price, -step, step));
        const what = sp.mode === 'profit' ? 'the price that earns the most profit once stewarding costs are counted' : "the price that earns the most in the game's own demand";
        if (Math.abs(best - s.price) < 1) les.ask.apply = { kind: 'control', action: 'setTicketPrice', params: { stand: s.id, price: s.price }, say: s.name + ' is already within £1 of ' + what + ' (£' + Math.round(best) + '): keep it at £' + s.price };
        else les.ask.apply = { kind: 'control', action: 'setTicketPrice', params: { stand: s.id, price: Math.max(3, target) }, say: (target > s.price ? 'Raise ' : 'Cut ') + s.name + ' to £' + Math.max(3, target) + (Math.abs(target - best) >= 1 ? ' (a step toward £' + Math.round(best) + ', ' + what + ')' : ', ' + what) };
      } catch (e) { /* the lesson keeps the change it had */ }
      return les;
    };
    L[id].graphed = true;
  });
})();
