// A small kit for writing lessons quickly and consistently: formatting, the step shape, the question shape, and the changes a question can make to the club.
// Every lesson is K.add(id, (d, k) => spec) where d is the student's club (knowledge_data.js) and the spec is { analogy, why, steps, ask, next }.
(function () {
  const FM = (window.FM = window.FM || {});
  const L = (FM.knowledgeLessons = FM.knowledgeLessons || {});
  const r2 = (v) => Math.round(v * 100) / 100;
  const m = (v) => { const x = r2(v); return Number.isInteger(x) ? String(x) : String(x); };
  const m1 = (v) => String(Math.round(v * 10) / 10);
  const m3 = (v) => String(Math.round(v * 1000) / 1000);
  const sf = (v) => String(+Number(v).toPrecision(3));
  const fr = (a, b) => '\\frac{' + a + '}{' + b + '}';
  const sum = (a) => a.reduce((x, y) => x + y, 0), mean = (a) => (a.length ? sum(a) / a.length : 0);
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { const t = b; b = a % b; a = t; } return a || 1; };
  const eg = (d, key) => (d.example && d.example[key] ? ['(Example figures until you have played enough matches. The lesson uses your own as the season goes on.)'] : []);
  const standBy = (d, which) => {
    const bySeats = d.stands.slice().sort((a, c) => c.seats - a.seats);
    if (which === 'emptiest') return d.stands.slice().sort((a, c) => a.sold / a.seats - c.sold / c.seats)[0] || d.big;
    if (which === 'fullest') return d.stands.slice().sort((a, c) => c.sold / c.seats - a.sold / a.seats)[0] || d.big;
    return bySeats[{ big: 0, second: 1, third: 2, fourth: 3 }[which] || 0] || d.big;
  };
  // ----- what a question can change in the club
  const A = {
    // move a stand toward the price that earns the most in the game's own demand (step = the most it may move at once)
    price: (d, which, step) => {
      const s = standBy(d, which || 'big'), pm = FM.knowledgePriceModel ? FM.knowledgePriceModel(s) : null, best = pm ? pm.best : s.price, st = step || 99;
      const target = Math.max(3, Math.round(s.price + Math.max(-st, Math.min(st, best - s.price))));
      if (Math.abs(best - s.price) < 1) return { kind: 'control', action: 'setTicketPrice', params: { stand: s.id, price: s.price }, say: s.name + ' is already within £1 of its best price (£' + Math.round(best) + '): keep it at £' + s.price };
      return { kind: 'control', action: 'setTicketPrice', params: { stand: s.id, price: target }, say: (target > s.price ? 'Raise ' : 'Cut ') + s.name + ' to £' + target + (Math.abs(target - best) >= 1 ? ' (a step toward £' + Math.round(best) + ', the price that earns the most)' : ', the price that earns the most') };
    },
    // marketing to the level where another pound stops paying for itself
    marketing: (d) => {
      const mm = FM.knowledgeMarketingModel ? FM.knowledgeMarketingModel(d) : { best: d.marketing || 0, now: d.marketing || 0, net: () => 0 }, gain = Math.round(mm.net(mm.best));
      if (Math.abs(mm.best - mm.now) < 500) return { kind: 'control', action: 'setMarketing', params: { perRound: mm.now }, say: 'Marketing is already near the level that pays (£' + mm.best.toLocaleString('en-GB') + '): keep it at £' + mm.now.toLocaleString('en-GB') };
      return { kind: 'control', action: 'setMarketing', params: { perRound: mm.best }, say: 'Set marketing to £' + mm.best.toLocaleString('en-GB') + ' a matchday (about ' + (gain >= 0 ? '+' : '-') + '£' + Math.abs(gain).toLocaleString('en-GB') + ' a home match after the spend)' };
    },
    // a tactic, changed or kept according to what the club's own figures say
    plan: (phase, key, value, say) => ({ kind: 'plan', phase, key, value, say }),
    // a tactical dial moved to a value (metres, or a 0-1 setting); say explains why
    dial: (id, value, say) => ({ kind: 'control', action: 'setDial', params: { dial: id, value }, say }),
    // several changes from one answer: tactical dials and club business together; note is the expected effect in words
    both: (say, note, acts) => ({ kind: 'multi', say, note, acts }),
    when: (cond, ifYes, ifNo) => (cond ? ifYes : ifNo),
  };
  // ----- the shape of a question
  const ask = (q, answer, unit, o) => {
    o = o || {}; const tol = o.tol != null ? o.tol : Math.max(0.005, Math.abs(answer) * 0.01);
    return { q, kind: o.kind || 'number', answer, unit: unit || '', tol, rubric: o.rubric || ('Correct answer ' + m3(answer) + (unit ? ' ' + unit : '') + '. Accept within ' + tol + '.' + (o.note ? ' ' + o.note : '')), worked: o.worked || [], apply: o.apply };
  };
  const step = (say, maths, diagram) => { const st = { say: [].concat(say) }; if (maths) st.maths = maths; if (diagram) st.diagram = diagram; return st; };
  const K = { r2, m, m1, m3, sf, fr, sum, mean, gcd, eg, standBy, A, ask, step, gbp: (v) => (v < 0 ? '-£' : '£') + Math.abs(Math.round(v)).toLocaleString('en-GB'), num: (v) => Math.round(v).toLocaleString('en-GB') };
  K.add = (id, fn) => { L[id] = (d) => { const o = fn(d, K); return o; }; };
  FM.K = K;
})();
