// The decision in each Board paper: a short form with several choices, a preview of what those choices would mean for the club's own figures, and the real controls
// that are used when it is approved.
(function () {
  const FM = (window.FM = window.FM || {});
  const gbp = (n) => FM.gbp(n), num = (n) => Math.round(n).toLocaleString('en-GB'), f1 = (n) => (Math.round(n * 10) / 10).toFixed(1), pc = (n) => f1(n) + '%';
  const run = (lg, id, params) => { const r = FM.controls.run(lg, id, params, 'manual'); return r.text || (r.ok ? 'Done.' : 'That could not be done.'); };
  const rate = (term) => { const o = FM.bizSources.loanOptions.find((x) => x.term === +term) || FM.bizSources.loanOptions[0]; return o.rate; };
  const loanOpts = () => FM.bizSources.loanOptions.map((o) => [String(o.term), o.term + ' matchdays at ' + f1(o.rate * 100) + '% a year']);
  const gearAfter = (lg, borrow, equity) => { const bal = FM.bizBalance(lg), cap = bal.assets - bal.overdraft; const l = bal.loans + borrow, c = cap + borrow + equity; return c > 0 ? 100 * l / c : 0; };
  const gearNow = (lg) => gearAfter(lg, 0, 0);
  const approval = (lg, d) => { const b = FM.biz(lg); b.approvalFin = Math.max(0, Math.min(100, b.approvalFin + d)); };
  const pctOf = (v) => 1 + (Number(v) || 0) / 100;
  const npv = (yr, cost) => { let v = -cost; for (let y = 1; y <= 10; y++) v += yr / Math.pow(1.08, y); return v; };
  const demandIncome = (lg, changes) => {
    // the next home match's ticket income and the fans turned away, with some prices changed (put back afterwards)
    const fx = FM.nextUserFixture(lg), b = FM.biz(lg), keep = {}; if (!fx) return null;
    Object.keys(changes).forEach((id) => { keep[id] = b.prices[id].price; b.prices[id].price = Math.max(3, Math.round(keep[id] * pctOf(changes[id]))); });
    let d; try { d = FM.bizDemand(lg, fx); } finally { Object.keys(keep).forEach((id) => { b.prices[id].price = keep[id]; }); }
    return { income: FM.SEGMENTS.reduce((a, s) => a + d.rows[s.id].revenue, 0), sold: FM.SEGMENTS.reduce((a, s) => a + d.rows[s.id].sold, 0), turned: FM.SEGMENTS.reduce((a, s) => a + Math.max(0, d.rows[s.id].wanted - d.rows[s.id].seats), 0), rows: d.rows };
  };
  const F = {};

  // ---- 1 the stadium expansion ----
  F.expansion = {
    fields: (m) => [
      { id: 'stand', label: 'Which stand to extend', type: 'select', options: m.rows.map((r) => [r.id, r.name + ': +' + num(r.seats) + ' seats for ' + gbp(r.cost)]).concat([['none', 'None this season']]), def: m.best ? m.best.id : 'none', help: 'Each stand has its own cost per seat and its own price, so its return is different.' },
      { id: 'finance', label: 'How to pay for it', type: 'select', options: [['cash', 'From the club\'s cash'], ['loan', 'A bank loan for the whole cost'], ['shares', 'A share issue for the whole cost'], ['mix', 'Half a loan, half cash']], def: 'loan', help: 'This sets the gearing, the interest and how much of the club the owners keep.' },
      { id: 'term', label: 'Loan repaid over', type: 'select', options: loanOpts(), def: String(FM.bizSources.loanOptions[0].term), help: 'Used if part of it is borrowed.' },
      { id: 'price', label: 'Price of the new seats against today\'s price in that stand', type: 'range', min: -10, max: 25, step: 5, def: 0, suffix: '%', help: 'A higher price earns more from each fan but fills fewer seats.' },
    ],
    preview: (v, m, lg) => {
      const r = m.rows.find((x) => x.id === v.stand); if (!r) return [['Cost', gbp(0)], ['The seats', 'No new seats this season'], ['Fans still turned away at each match', num(m.turned)]];
      const cost = r.cost, borrow = v.finance === 'loan' ? cost : v.finance === 'mix' ? cost / 2 : 0, equity = v.finance === 'shares' ? cost : 0, cashOut = cost - borrow - equity;
      const p = (Number(v.price) || 0) / 100, yr = r.yr * (1 + p) * Math.max(0.2, 1 - 0.8 * p), ints = borrow * rate(v.term), after = FM.biz(lg).cash - cashOut;
      const dil = equity ? 100 * (equity / FM.biz(lg).shares.price) / (FM.biz(lg).shares.issued + equity / FM.biz(lg).shares.price) : 0;
      return [['Cost of the stand', gbp(cost)], ['Paid from cash', gbp(cashOut)], ['Borrowed', gbp(borrow)], ['Raised from new shares', gbp(equity) + (dil ? ' (the owners hold ' + f1(dil) + '% less)' : '')], ['Interest in the first season', gbp(ints)], ['Cash left in the bank', gbp(after)], ['Gearing afterwards', pc(gearAfter(lg, borrow, equity)) + ' (now ' + pc(gearNow(lg)) + ')'], ['Return each season', gbp(yr)], ['Payback', yr > 0 ? f1(cost / yr) + ' years' : 'never'], ['Net present value, ten years at 8%', gbp(npv(yr, cost))]];
    },
    apply: (lg, v, m) => {
      const r = m.rows.find((x) => x.id === v.stand); if (!r) return ['No stand is extended. The club waits.'];
      const cost = Math.max(100000, Math.round(r.cost / 10000) * 10000), out = [];
      if (v.finance === 'loan') out.push(run(lg, 'takeLoan', { amount: cost, term: v.term }));
      else if (v.finance === 'mix') out.push(run(lg, 'takeLoan', { amount: Math.max(100000, Math.round(cost / 2 / 10000) * 10000), term: v.term }));
      else if (v.finance === 'shares') out.push(run(lg, 'issueShares', { amount: cost }));
      out.push(run(lg, 'buildStand', { stand: r.id }));
      if (Number(v.price)) out.push(run(lg, 'setTicketPrice', { stand: r.id, price: Math.round(FM.biz(lg).prices[r.id].price * pctOf(v.price)) }));
      return out;
    },
  };

  // ---- 2 pricing the gate ----
  F.pricing = {
    fields: (m) => FM.SEGMENTS.map((s) => ({ id: 'p_' + s.id, label: s.name + ': change from £' + m.b.prices[s.id].price, type: 'range', min: -20, max: 30, step: 5, def: 0, suffix: '%', help: num(m.b.seats[s.id]) + ' seats' })),
    preview: (v, m, lg) => {
      const ch = {}; FM.SEGMENTS.forEach((s) => { ch[s.id] = Number(v['p_' + s.id]) || 0; }); const a = demandIncome(lg, {}), b = demandIncome(lg, ch); if (!a || !b) return [['No home match to price for', '']];
      return [['Ticket income at the next home match now', gbp(a.income)], ['Ticket income at the new prices', gbp(b.income)], ['Change', gbp(b.income - a.income)], ['Fans turned away now / at the new prices', num(a.turned) + ' / ' + num(b.turned)], ['Seats sold now / at the new prices', num(a.sold) + ' / ' + num(b.sold)]].concat(FM.SEGMENTS.filter((s) => ch[s.id]).map((s) => [s.name + ' price', '£' + Math.max(3, Math.round(m.b.prices[s.id].price * pctOf(ch[s.id])))]));
    },
    apply: (lg, v, m) => FM.SEGMENTS.filter((s) => Number(v['p_' + s.id])).map((s) => run(lg, 'setTicketPrice', { stand: s.id, price: Math.max(3, Math.round(m.b.prices[s.id].price * pctOf(v['p_' + s.id]))) })).concat([Object.keys(v).some((k) => Number(v[k])) ? 'The new prices apply from the next home match.' : 'Prices are left as they are.']),
  };

  // ---- 3 marketing ----
  F.marketing = {
    fields: (m) => [
      { id: 'budget', label: 'Advertising and promotion budget a matchday', type: 'range', min: 0, max: 60000, step: 2500, def: Math.max(10000, m.b.marketing || 0), prefix: '£', help: 'It lifts demand with diminishing returns: each extra pound does less.' },
      { id: 'family', label: 'Family stand price: a sales promotion', type: 'range', min: -30, max: 0, step: 5, def: 0, suffix: '%', help: 'A discount to bring families in for the whole season.' },
    ],
    preview: (v, m, lg) => {
      const bud = Number(v.budget) || 0, up = 100 * 0.1 * Math.log(1 + bud / 5000), extraFans = m.f.att * 0.1 * Math.log(1 + bud / 5000), perHome = 2 * bud, gain = Math.min(extraFans, m.f.cap - m.f.att) * m.f.revHead;
      const out = [['Lift in demand', pc(up)], ['Marketing cost per home match', gbp(perHome)], ['Marketing cost per spectator', '£' + (m.f.att ? (perHome / m.f.att).toFixed(2) : '0')], ['Extra fans it brings', num(extraFans)], ['Extra income from them at each home match', gbp(gain)], ['Return on the spend', perHome ? f1(gain / perHome) + ' for every £1' : 'no spend']];
      if (Number(v.family)) { const r = demandIncome(lg, { family: Number(v.family) }), n = demandIncome(lg, {}); if (r && n) out.push(['Family stand: seats filled with the discount', num(r.rows.family.sold) + ' of ' + num(r.rows.family.seats) + ' (now ' + num(n.rows.family.sold) + ')'], ['Family stand income at the next match', gbp(r.rows.family.revenue) + ' (now ' + gbp(n.rows.family.revenue) + ')']); }
      return out;
    },
    apply: (lg, v, m) => [run(lg, 'setMarketing', { perRound: Number(v.budget) || 0 })].concat(Number(v.family) ? [run(lg, 'setTicketPrice', { stand: 'family', price: Math.max(3, Math.round(m.b.prices.family.price * pctOf(v.family))) })] : []),
  };

  // ---- 4 raising finance ----
  F.finance = {
    fields: (m) => [
      { id: 'amount', label: 'How much to raise', type: 'range', min: 100000, max: 3000000, step: 100000, def: 500000, prefix: '£' },
      { id: 'source', label: 'Where it comes from', type: 'select', options: [['loan', 'A bank loan'], ['shares', 'A share issue'], ['half', 'Half a loan, half shares'], ['none', 'Neither: rely on retained profit']], def: 'loan' },
      { id: 'term', label: 'Loan repaid over', type: 'select', options: loanOpts(), def: String(FM.bizSources.loanOptions[0].term) },
    ],
    preview: (v, m, lg) => {
      const a = Number(v.amount) || 0, loan = v.source === 'loan' ? a : v.source === 'half' ? a / 2 : 0, eq = v.source === 'shares' ? a : v.source === 'half' ? a / 2 : 0, b = m.b, add = eq ? eq / b.shares.price : 0;
      return [['Raised', gbp(v.source === 'none' ? 0 : a)], ['Interest in the first season', gbp(loan * rate(v.term))], ['Repaid each matchday', loan ? gbp(loan / Number(v.term)) : '£0'], ['New shares issued', num(add)], ['Existing owners\' holding after', add ? f1(100 * b.shares.issued / (b.shares.issued + add)) + '% of what they held' : 'unchanged'], ['Gearing afterwards', pc(gearAfter(lg, loan, eq)) + ' (now ' + pc(gearNow(lg)) + ')']];
    },
    apply: (lg, v) => { const a = Math.round((Number(v.amount) || 0) / 10000) * 10000, out = []; if (v.source === 'loan') out.push(run(lg, 'takeLoan', { amount: a, term: v.term })); else if (v.source === 'shares') out.push(run(lg, 'issueShares', { amount: a })); else if (v.source === 'half') { out.push(run(lg, 'takeLoan', { amount: Math.max(100000, Math.round(a / 2 / 10000) * 10000), term: v.term })); out.push(run(lg, 'issueShares', { amount: Math.max(100000, Math.round(a / 2 / 10000) * 10000) })); } else out.push('No new finance is raised. The club carries on from its own cash.'); return out; },
  };

  // ---- 5 budgets and cash flow ----
  F.cashflow = {
    fields: (m) => [
      { id: 'budget', label: 'Marketing a matchday', type: 'range', min: 0, max: 60000, step: 2500, def: m.b.marketing || 0, prefix: '£' },
      { id: 'dividend', label: 'Dividend, as a share of the year\'s profit', type: 'range', min: 0, max: 60, step: 5, def: Math.round((m.b.dividend.policy || 0) * 100), suffix: '%' },
      { id: 'prices', label: 'All ticket prices', type: 'range', min: -10, max: 10, step: 5, def: 0, suffix: '%' },
    ],
    preview: (v, m, lg) => {
      const ch = {}; FM.SEGMENTS.forEach((s) => { ch[s.id] = Number(v.prices) || 0; }); const a = demandIncome(lg, {}), b = demandIncome(lg, ch), dBud = ((Number(v.budget) || 0) - (m.b.marketing || 0)) * m.K.ROUNDS, dDiv = ((Number(v.dividend) || 0) / 100 - (m.b.dividend.policy || 0)) * Math.max(0, m.net);
      return [['Marketing over a season', (dBud >= 0 ? '+' : '−') + gbp(Math.abs(dBud)) + ' on the budget'], ['Dividend paid at the year end', (dDiv >= 0 ? '+' : '−') + gbp(Math.abs(dDiv)) + ' on today\'s policy'], ['Ticket income at each home match', a && b ? gbp(b.income - a.income) + ' more than now' : 'n/a'], ['Cash saved or spent over the season', gbp(-dBud - dDiv + (a && b ? (b.income - a.income) * m.home : 0))]];
    },
    apply: (lg, v, m) => [run(lg, 'setMarketing', { perRound: Number(v.budget) || 0 }), run(lg, 'setDividend', { percent: Number(v.dividend) || 0 })].concat(Number(v.prices) ? FM.SEGMENTS.map((s) => run(lg, 'setTicketPrice', { stand: s.id, price: Math.max(3, Math.round(m.b.prices[s.id].price * pctOf(v.prices))) })) : []),
  };

  // ---- 6 the accounts ----
  F.accounts = {
    fields: (m) => [
      { id: 'budget', label: 'Marketing a matchday', type: 'range', min: 0, max: 60000, step: 2500, def: m.b.marketing || 0, prefix: '£', help: 'The marketing line in the expenses.' },
      { id: 'prices', label: 'All ticket prices', type: 'range', min: -10, max: 15, step: 5, def: 0, suffix: '%', help: 'Changes revenue and the margins.' },
    ],
    preview: (v, m, lg) => { const ch = {}; FM.SEGMENTS.forEach((s) => { ch[s.id] = Number(v.prices) || 0; }); const a = demandIncome(lg, {}), b = demandIncome(lg, ch), dBud = ((Number(v.budget) || 0) - (m.b.marketing || 0)) * m.K.ROUNDS, dRev = a && b ? (b.income - a.income) * m.home : 0; return [['Change in ticket revenue over a season', gbp(dRev)], ['Change in marketing expense', gbp(dBud)], ['Change in profit before tax', gbp(dRev - dBud)]]; },
    apply: (lg, v, m) => [run(lg, 'setMarketing', { perRound: Number(v.budget) || 0 })].concat(Number(v.prices) ? FM.SEGMENTS.map((s) => run(lg, 'setTicketPrice', { stand: s.id, price: Math.max(3, Math.round(m.b.prices[s.id].price * pctOf(v.prices))) })) : []),
  };

  // ---- 7 pay and motivation ----
  F.people = {
    fields: () => [
      { id: 'bonus', label: 'Win bonus for each player in the matchday squad', type: 'range', min: 0, max: 5000, step: 500, def: 0, prefix: '£' },
      { id: 'who', label: 'Who gets it', type: 'select', options: [['xi', 'The eleven who start'], ['squad', 'Everyone in the matchday squad']], def: 'xi' },
      { id: 'training', label: 'Build the new training ground', type: 'select', options: [['no', 'No'], ['yes', 'Yes: ' + gbp((FM.FACILITIES.find((f) => f.id === 'training') || { cost: 900000 }).cost)]], def: 'no' },
      { id: 'away', label: 'A squad away day and a recognition scheme', type: 'select', options: [['no', 'No'], ['yes', 'Yes']], def: 'no' },
    ],
    preview: (v, m, lg) => { const n = v.who === 'squad' ? 16 : 11, cost = (Number(v.bonus) || 0) * n * 7, fac = FM.FACILITIES.find((f) => f.id === 'training'); return [['Win bonus over a season, if we win half our matches', gbp(cost)], ['As a share of the wage bill', pc(100 * cost / Math.max(1, m.wages * m.K.ROUNDS))], ['Training ground', v.training === 'yes' ? gbp(fac.cost) + ' now and ' + gbp(fac.upkeep) + ' a matchday upkeep' : 'not built'], ['The wage bill a season now', gbp(m.wages * m.K.ROUNDS)]]; },
    apply: (lg, v) => { const out = []; if (Number(v.bonus)) { approval(lg, -Math.min(2, (Number(v.bonus) / 2500))); out.push('A win bonus of ' + gbp(Number(v.bonus)) + ' is agreed for ' + (v.who === 'squad' ? 'the whole matchday squad' : 'the starting eleven') + '. Rafael will count its cost.'); } if (v.training === 'yes') out.push(run(lg, 'buyFacility', { id: 'training' })); if (v.away === 'yes') { approval(lg, 1); out.push('The squad has an away day and a recognition scheme is set up.'); } return out.length ? out : ['Pay and conditions are left as they are.']; },
  };

  // ---- 8 organising the club ----
  F.structure = {
    fields: () => [
      { id: 'decisions', label: 'Match-day decisions', type: 'select', options: [['central', 'All come to the manager'], ['balanced', 'The manager decides tactics; coaches decide their own units'], ['delegated', 'Coaches decide for their own areas']], def: 'balanced' },
      { id: 'span', label: 'Coaches reporting to the assistant manager', type: 'range', min: 2, max: 6, step: 1, def: 3 },
      { id: 'second', label: 'A second assistant, so that the chain of command is shorter', type: 'select', options: [['no', 'No'], ['yes', 'Yes']], def: 'no' },
    ],
    preview: (v) => [['Span of control for the assistant manager', String(v.span)], ['Layers from the owners to the players', v.second === 'yes' ? '5' : '6'], ['Speed of match-day decisions', v.decisions === 'central' ? 'slower, with tighter control' : v.decisions === 'delegated' ? 'faster, with less oversight' : 'balanced'], ['Staff cost', v.second === 'yes' ? 'one more salary' : 'unchanged']],
    apply: (lg, v) => { approval(lg, v.decisions === 'delegated' ? 1 : v.decisions === 'central' ? -1 : 0); if (v.second === 'yes') approval(lg, 0.5); return ['Match-day decisions: ' + ({ central: 'all with the manager', balanced: 'shared between the manager and the coaches', delegated: 'with the coaches' })[v.decisions] + '.', 'The assistant manager now has ' + v.span + ' coaches reporting to him.', v.second === 'yes' ? 'A second assistant is appointed.' : 'No new appointment is made.']; },
  };

  // ---- 9 owners and stakeholders ----
  F.owners = {
    fields: (m) => [
      { id: 'dividend', label: 'Dividend, as a share of the year\'s profit', type: 'range', min: 0, max: 60, step: 5, def: Math.round((m.b.dividend.policy || 0.2) * 100), suffix: '%' },
      { id: 'green', label: 'Green Pitch: floodlights and a renewable energy contract', type: 'select', options: [['no', 'Not this year'], ['yes', 'Yes: ' + gbp((FM.FACILITIES.find((f) => f.id === 'lights') || { cost: 650000 }).cost)]], def: 'no' },
      { id: 'community', label: 'Community fund, from the year\'s profit', type: 'range', min: 0, max: 10, step: 1, def: 0, suffix: '%' },
    ],
    preview: (v, m) => { const eps = Math.max(0, m.net), pay = eps * (Number(v.dividend) || 0) / 100; return [['Profit after tax this year, estimated', gbp(eps)], ['Dividend paid', gbp(pay)], ['Dividend per share', f1(100 * pay / m.b.shares.issued) + 'p'], ['Community fund', gbp(eps * (Number(v.community) || 0) / 100)], ['Kept in the club', gbp(eps - pay - eps * (Number(v.community) || 0) / 100)]]; },
    apply: (lg, v) => { const out = [run(lg, 'setDividend', { percent: Number(v.dividend) || 0 })]; if (v.green === 'yes') out.push(run(lg, 'buyFacility', { id: 'lights' })); if (Number(v.community)) { approval(lg, 1); out.push('A community fund of ' + v.community + '% of profit is promised to local schools and clubs.'); } return out; },
  };

  // ---- 10 strategy ----
  F.strategy = {
    fields: () => [
      { id: 'ansoff', label: 'The main direction', type: 'select', options: [['pen', 'Market penetration: more marketing for what we have'], ['dev', 'Product development: improve the match-day offer'], ['hold', 'Hold: no change of strategy']], def: 'pen' },
      { id: 'budget', label: 'Marketing a matchday', type: 'range', min: 0, max: 60000, step: 2500, def: 15000, prefix: '£' },
      { id: 'facility', label: 'A new facility', type: 'select', options: [['none', 'None'], ['fanzone', 'Fan zone and bars'], ['screens', 'Big screens and digital boards'], ['shop', 'A bigger club shop']], def: 'none' },
    ],
    preview: (v, m) => { const fac = FM.FACILITIES.find((f) => f.id === v.facility); return [['Marketing over a season', gbp((Number(v.budget) || 0) * m.K.ROUNDS)], ['Facility', fac ? gbp(fac.cost) + ' now, ' + gbp(fac.upkeep) + ' a matchday upkeep' : 'none'], ['Cash left after the facility', gbp(m.b.cash - (fac ? fac.cost : 0))]]; },
    apply: (lg, v) => { const out = []; if (v.ansoff !== 'hold') out.push(run(lg, 'setMarketing', { perRound: Number(v.budget) || 0 })); if (v.facility !== 'none') out.push(run(lg, 'buyFacility', { id: v.facility })); return out.length ? out : ['No change of strategy.']; },
  };

  // ---- 11 growth ----
  F.growth = {
    fields: () => [
      { id: 'response', label: 'The answer to Brightwater', type: 'select', options: [['talks', 'Open merger talks'], ['jv', 'A joint venture on youth football instead'], ['no', 'Decline and stay independent']], def: 'jv' },
      { id: 'share', label: 'Our share of a joint academy\'s costs', type: 'range', min: 30, max: 70, step: 10, def: 50, suffix: '%', help: 'Matters for a joint venture.' },
      { id: 'consult', label: 'Consult the supporters\' trust first', type: 'select', options: [['yes', 'Yes'], ['no', 'No']], def: 'yes' },
    ],
    preview: (v, m) => [['Combined matchday income if merged', gbp(m.annual * 1.55)], ['Saving on shared administration if merged', gbp(100000)], ['Cost of our side of a joint academy, from a £400,000 budget', gbp(400000 * (Number(v.share) || 50) / 100)], ['Supporters', v.consult === 'yes' ? 'consulted: less opposition' : 'not consulted: a risk of protest']],
    apply: (lg, v) => { approval(lg, v.response === 'talks' ? 2 : v.response === 'jv' ? 1 : 0); if (v.consult === 'no' && v.response !== 'no') approval(lg, -1.5); return [({ talks: 'Merger talks open with Brightwater Athletic.', jv: 'A joint youth academy is proposed, with our share of the cost at ' + v.share + '%.', no: 'The approach is declined.' })[v.response], v.consult === 'yes' ? 'The supporters\' trust is consulted first.' : 'The trust learns of it from the press.']; },
  };

  // ---- 12 operations ----
  F.operations = {
    fields: () => [
      { id: 'stock', label: 'Stock of shirts to hold, in home matches\' worth of sales', type: 'range', min: 1, max: 6, step: 1, def: 5 },
      { id: 'shop', label: 'Bigger club shop', type: 'select', options: [['no', 'No'], ['yes', 'Yes: ' + gbp((FM.FACILITIES.find((f) => f.id === 'shop') || { cost: 400000 }).cost)]], def: 'no' },
      { id: 'screens', label: 'Big screens and digital boards', type: 'select', options: [['no', 'No'], ['yes', 'Yes: ' + gbp((FM.FACILITIES.find((f) => f.id === 'screens') || { cost: 300000 }).cost)]], def: 'no' },
      { id: 'service', label: 'Customer-service training for stewards and staff', type: 'select', options: [['no', 'No'], ['yes', 'Yes']], def: 'no' },
    ],
    preview: (v) => { const n = Number(v.stock) || 1, held = 120 * n; return [['Shirts held', num(held)], ['Cost of holding them a season', gbp(held * 4)], ['Risk of selling out on a big match day', n <= 1 ? 'high' : n <= 3 ? 'moderate' : 'low'], ['Money tied up in stock (at £25 a shirt)', gbp(held * 25)]]; },
    apply: (lg, v) => { const out = ['Stock policy: hold ' + (120 * v.stock) + ' shirts, ' + v.stock + ' matches\' worth.']; if (v.shop === 'yes') out.push(run(lg, 'buyFacility', { id: 'shop' })); if (v.screens === 'yes') out.push(run(lg, 'buyFacility', { id: 'screens' })); if (v.service === 'yes') { approval(lg, 1); out.push('A customer-service programme is funded.'); } return out; },
  };

  // ---- 13 the external environment ----
  F.environment = {
    fields: (m) => [
      { id: 'repay', label: 'Repay a loan early', type: 'select', options: [['none', 'None']].concat(m.b.loans.map((l) => [l.id, l.id + ': ' + gbp(l.balance) + ' owed at ' + f1(l.rate * 100) + '%'])), def: 'none' },
      { id: 'prices', label: 'Raise all ticket prices to cover inflation', type: 'range', min: 0, max: 8, step: 1, def: 0, suffix: '%' },
    ],
    preview: (v, m, lg) => { const l = m.b.loans.find((x) => x.id === v.repay), ch = {}; FM.SEGMENTS.forEach((s) => { ch[s.id] = Number(v.prices) || 0; }); const a = demandIncome(lg, {}), b = demandIncome(lg, ch); return [['Interest saved over a season', l ? gbp(l.balance * l.rate) : '£0'], ['Cash used', l ? gbp(l.balance) : '£0'], ['Ticket income at each home match', a && b ? gbp(b.income - a.income) + ' more than now' : 'n/a'], ['Extra interest if rates rise 2 points on the loans still held', gbp(m.b.loans.filter((x) => x.id !== v.repay).reduce((s, x) => s + x.balance * 0.02, 0))]]; },
    apply: (lg, v, m) => { const out = []; if (v.repay !== 'none') out.push(run(lg, 'repayLoan', { id: v.repay })); if (Number(v.prices)) FM.SEGMENTS.forEach((s) => out.push(run(lg, 'setTicketPrice', { stand: s.id, price: Math.round(m.b.prices[s.id].price * pctOf(v.prices)) }))); return out.length ? out : ['The club keeps its options open.']; },
  };

  // ---- 14 going global ----
  F.global = {
    fields: () => [
      { id: 'tour', label: 'The sponsor\'s Asia tour', type: 'select', options: [['no', 'Decline'], ['yes', 'Accept']], def: 'no' },
      { id: 'online', label: 'An overseas online shop', type: 'select', options: [['no', 'No'], ['yes', 'Yes']], def: 'no' },
      { id: 'adapt', label: 'Shirt price abroad against the home price', type: 'range', min: -30, max: 20, step: 10, def: 0, suffix: '%', help: 'Adapting to local incomes, or standardising.' },
    ],
    preview: (v) => { const price = 60 * (1 + (Number(v.adapt) || 0) / 100); return [['Shirt price abroad', '£' + f1(price)], ['Shirt price in yuan at 8 to the pound', num(price * 8)], ['If the pound strengthens to 10 yuan, the same shirt brings in', '£' + f1(price * 8 / 10)], ['Tour', v.tour === 'yes' ? 'accepted: brand reach up, costs in the next budget' : 'declined']]; },
    apply: (lg, v) => { approval(lg, (v.tour === 'yes' ? 2 : 0) + (v.online === 'yes' ? 1 : 0)); return [v.tour === 'yes' ? 'The tour is accepted.' : 'The tour is declined.', v.online === 'yes' ? 'An overseas online shop opens.' : 'There is no overseas shop.', 'Shirts abroad are priced ' + (Number(v.adapt) ? Math.abs(Number(v.adapt)) + '% ' + (Number(v.adapt) > 0 ? 'above' : 'below') : 'at') + ' the home price.']; },
  };

  // ---- 15 the supporters' academy ----
  F.enterprise = {
    fields: (m) => [
      { id: 'go', label: 'The academy', type: 'select', options: [['no', 'Do not start it'], ['pilot', 'A one-term pilot first'], ['full', 'Launch it fully']], def: 'pilot' },
      { id: 'fee', label: 'Monthly fee', type: 'range', min: 20, max: 80, step: 5, def: 40, prefix: '£' },
      { id: 'budget', label: 'Marketing a matchday while it launches', type: 'range', min: 0, max: 30000, step: 2500, def: Math.max(5000, m.b.marketing || 0), prefix: '£' },
    ],
    preview: (v) => { const fee = Number(v.fee) || 40, families = 3000 * 0.62 * Math.max(0.15, 1.3 - fee / 60) / 4, income = families * fee, cost = 14000 + families * 12; return [['Families who join', num(families)], ['Income a month', gbp(income)], ['Running cost a month', gbp(cost)], ['Profit a month', gbp(income - cost)], ['Break-even families', num(14000 / Math.max(1, fee - 12))]]; },
    apply: (lg, v) => { approval(lg, v.go === 'full' ? 1.5 : v.go === 'pilot' ? 1 : 0); return [({ no: 'The academy is not started.', pilot: 'The academy runs for one term as a pilot at £' + v.fee + ' a month.', full: 'The academy launches at £' + v.fee + ' a month.' })[v.go]].concat(v.go !== 'no' ? [run(lg, 'setMarketing', { perRound: Number(v.budget) || 0 })] : []); },
  };

  FM.booksForms = F;
})();
