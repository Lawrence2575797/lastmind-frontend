// The Books, as the club is run: Board papers from the Director of Finance. Each paper is a case at Ashford Rovers: the situation, the analysis the manager
// works out from the club's own figures, a decision that uses the club's real controls, and a review a few matchdays later. The Edexcel Business
// concepts are met inside the papers; the coverage panel shows which ones the papers have reached.
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const gbp = (n) => FM.gbp(n), num = (n) => Math.round(n).toLocaleString('en-GB'), pc = (n, d) => (Math.round(n * Math.pow(10, d == null ? 1 : d)) / Math.pow(10, d == null ? 1 : d)).toFixed(d == null ? 1 : d) + '%';
  const BL = () => FM.booksLive;
  let LEVEL = 'gcse', UI = { open: null, msg: null };
  const term = (n) => (FM.booksLearn && FM.booksLearn.termBtn ? FM.booksLearn.termBtn(n, LEVEL) : esc(n));
  const P = (arr) => arr.map((t) => `<p>${esc(t).replace(/\{\{([^}]+)\}\}/g, (_, n) => term(n.replace(/&#39;/g, "'")))}</p>`).join('');
  const factsTable = (rows) => `<div class="tablewrap"><table class="data"><tbody>${rows.map((r) => `<tr><td class="l">${esc(r[0])}</td><td><b>${esc(r[1])}</b></td></tr>`).join('')}</tbody></table></div>`;
  const run = (lg, id, params) => { const r = FM.controls.run(lg, id, params, 'manual'); return { ok: !!r.ok, text: r.text }; };
  const rounds = (b) => b.ledger.length;

  // ---------- the club's numbers ----------
  function M(lg) {
    if (!BL() || !BL().facts) throw new Error('part of The Books has not loaded: refresh the page (Ctrl+Shift+R)');
    const f = BL().facts(lg), b = f.b, K = f.K, seed = Math.abs((lg.seed || 1) + (lg.runSeed || 0) * 0), home = K.ROUNDS / 2;
    const g0 = 0.055 + (Math.floor(seed / 8) % 5) * 0.004, last = Math.round((36 + (seed % 7) * 0.4) * 10) * 1e5, now = Math.round(last * (1 + g0) / 1e5) * 1e5;
    let turned = f.turned;
    if (!turned) { try { const fx = FM.nextUserFixture(lg), d = FM.bizDemand(lg, fx); turned = FM.SEGMENTS.reduce((a, s) => a + Math.max(0, d.rows[s.id].wanted - d.rows[s.id].seats), 0); } catch (e) { turned = 0; } }
    const annual = home * f.att * f.revHead, rows = [];
    FM.SEGMENTS.forEach((s) => {
      const e = FM.EXPANSIONS[s.id], room = FM.bizBuild.standRoom(lg, s.id), busy = b.projects.some((p) => p.kind === 'stand' && p.stand === s.id); if (room < e.seats || busy) return;
      const cost = e.seats * e.perSeat, extra = Math.min(e.seats, turned), yr = extra * (b.prices[s.id].price + K.SPEND_PER_HEAD - K.RUN_PER_HEAD) * home;
      let npv = -cost; for (let y = 1; y <= 10; y++) npv += yr / Math.pow(1.08, y);
      rows.push({ id: s.id, name: s.name, seats: e.seats, cost, extra, yr, pay: yr > 0 ? cost / yr : null, arr: ((yr * 10 - cost) / 10) / cost * 100, npv });
    });
    const best = rows.slice().sort((a, c) => c.npv - a.npv)[0] || null;
    return { f, b, K, home, market: { last, now, g: (now - last) / last }, annual, share: annual / now, turned, rows, best, util: f.att / f.cap };
  }
  const best = (m) => m.best;

  // ---------- the papers ----------
  const CASES = [];
  const add = (c) => CASES.push(c);
  const rec = (lg, text, d) => { const b = FM.biz(lg); if (d) b.approvalFin = Math.max(0, Math.min(100, b.approvalFin + d)); return { ok: true, text }; };
  const sinceOk = (lg, st, n) => rounds(FM.biz(lg)) - (st.r0 || 0) >= n;
  const ledgerAvg = (b, key, n, from) => { const r = b.ledger.filter((e) => e.home).slice(from == null ? -n : from, from == null ? undefined : from + n); return r.length ? r.reduce((a, e) => a + (key === 'att' ? e.attTotal : key === 'tickets' ? e.inflow.tickets : key === 'away' ? e.away : 0), 0) / r.length : 0; };

  add({
    id: 'expansion', title: 'Market growth and the stadium expansion', tag: 'Growth and investment',
    concepts: ['Market size', 'Market growth', 'Market share', 'Capacity utilisation', 'Capital expenditure', 'Investment appraisal', 'Payback period', 'Average rate of return', 'Net present value', 'Discounting', 'Organic growth', 'Economies of scale', 'Unit costs', 'Break-even', 'Margin of safety', 'Choosing finance', 'Loan', 'Share issue', 'Gearing', 'Interest', 'Risk', 'Reward', 'Sales forecasting', 'Quantitative sales forecasting', 'Variance', 'Short-term and long-term targets', 'Business objectives', 'Business aims', 'Dynamic business environment', 'Sources of finance', 'Share capital', 'Added value', 'Mass market'],
    stages: [
      { k: 'read', title: 'The situation', memo: (m) => ['Manager, the {{Market size}} for live sport in the town is growing, and I would like you to see what that means for us.', 'Last year local spending on live sport was ' + gbp(m.market.last) + '. This year it is ' + gbp(m.market.now) + '. A growing market is an opportunity only if we have the capacity to serve it: if we are full, the growth goes to someone else.', 'Our ground has ' + num(m.f.cap) + ' seats and we have been filling about ' + pc(m.util * 100, 0) + ' of them. On a typical match day about ' + num(m.turned) + ' supporters who want to come cannot.', 'That is the {{Capacity utilisation}} problem in one line, and the question for you is whether to answer it with {{Organic growth}}: building more seats ourselves, rather than buying another club.'], facts: (m) => [['Market this year', gbp(m.market.now)], ['Market last year', gbp(m.market.last)], ['Our seats', num(m.f.cap)], ['Average crowd', num(m.f.att)], ['Supporters turned away a match', num(m.turned)]] },
      { k: 'calc', title: 'Your analysis', qs: [
        { ask: () => ['First, how fast is the market growing? Give the percentage change from last year to this year.'], ans: (m) => m.market.g * 100, unit: '%', tol: 0.15, hint: () => ['Percentage change = (new − old) ÷ old × 100.'], why: (m) => ['The market is growing at ' + pc(m.market.g * 100) + ' a year. That is {{Market growth}}.', 'On its own it tells us the tide is rising, not whether our boat is.'] },
        { ask: (m) => ['Our own matchday income over a season is about ' + gbp(m.annual) + ' (seven home matches at the average crowd and what each supporter spends).', 'What is our {{Market share}}, as a percentage of this year\'s market?'], ans: (m) => m.share * 100, unit: '%', tol: 0.15, hint: () => ['Market share = our sales ÷ total market sales × 100.'], why: (m) => ['We take ' + pc(m.share * 100) + ' of the town\'s spending on live sport.', 'If the market grows and we cannot fit more people in, that share will fall.'] },
        { ask: (m) => ['What is our capacity utilisation: the average crowd as a percentage of the seats we have?'], ans: (m) => m.util * 100, unit: '%', tol: 1, hint: () => ['Capacity utilisation = output ÷ capacity × 100.'], why: (m) => [pc(m.util * 100, 0) + ' looks comfortable, but an average hides the big matches: those are full and turn people away.'] },
        { ask: (m) => ['If the market keeps growing at the same rate, what will it be worth next year, in £ million? Use this year\'s figure.'], ans: (m) => m.market.now * (1 + m.market.g) / 1e6, unit: '£m', tol: 0.1, hint: () => ['Multiply by (1 + the growth rate) once more.'], why: (m) => ['That is a simple {{Sales forecasting}} method: extend the trend. It is quick, and it is only as good as the assumption that growth continues.'] },
      ] },
      { k: 'calc', title: 'Is the stand worth building?', qs: [
        { ask: (m) => m.best ? ['The best candidate is ' + m.best.name.toLowerCase() + ': ' + num(m.best.seats) + ' seats for ' + gbp(m.best.cost) + '. Only the supporters we turn away would fill them, which is ' + num(m.best.extra) + ' a match, and each home match then adds ' + gbp(m.best.yr / m.home) + '.', 'Over a season of ' + m.home + ' home matches that is ' + gbp(m.best.yr) + '.', 'How many years does it take to earn back the cost? This is the {{Payback period}}.'] : ['Every stand is at its limit or already being built, so there is no stand to appraise.'], ans: (m) => (m.best && m.best.pay) || 0, unit: 'years', tol: 0.3, hint: () => ['Payback = cost ÷ net return each year.'], why: (m) => ['Payback is ' + (m.best && m.best.pay ? m.best.pay.toFixed(1) : '–') + ' years. It is simple and quick, but it ignores what happens after the money comes back.'] },
        { ask: (m) => m.best ? ['Assume the stand lasts ten years. The total return is ten times the yearly return, less the cost, and the average annual profit is that divided by ten.', 'What is the {{Average rate of return}}: average annual profit as a percentage of the cost?'] : ['No stand to appraise.'], ans: (m) => (m.best && m.best.arr) || 0, unit: '%', tol: 0.6, hint: () => ['ARR = (total return − cost) ÷ years ÷ cost × 100.'], why: (m) => ['An average rate of return of ' + pc(m.best ? m.best.arr : 0) + ' a year. Compare it with the interest on a loan to see whether borrowing would pay.'] },
        { ask: (m) => m.best ? ['Money in ten years is worth less than money today. Discount each year\'s return at 8% a year, add them up, and take off the cost: that is the {{Net present value}}.', 'Is it positive?'] : ['No stand to appraise.'], choice: ['Yes, it is positive', 'No, it is negative'], ans: (m) => (m.best && m.best.npv > 0 ? 'Yes, it is positive' : 'No, it is negative'), hint: () => ['Each year\'s return ÷ 1.08 to the power of the year number, summed, less the cost.'], why: (m) => ['The net present value is ' + gbp(m.best ? m.best.npv : 0) + '. A positive number means the project beats the 8% we could earn elsewhere, and it is the method that respects {{Discounting}}.'] },
      ] },
      { k: 'decide', title: 'The decision', ask: (m) => ['The recommendation from my side is to build. The question is how to pay for it: ' + (m.best ? gbp(m.best.cost) : 'the cost') + ' is a large part of our ' + gbp(m.b.cash) + ' in the bank.', 'A {{Loan}} adds interest and raises {{Gearing}}. A {{Share issue}} costs nothing to repay but dilutes the owners. Paying from cash leaves us thinner for the season. Waiting keeps the risk low and the {{Reward}} unclaimed.'], options: [
        { id: 'cash', label: 'Build it from our cash', text: () => 'Cash falls, gearing is unchanged, no interest.', do: (lg, m) => (m.best ? run(lg, 'buildStand', { stand: m.best.id }) : { ok: false, text: 'There is no stand to build.' }) },
        { id: 'loan', label: 'Borrow the cost and build', text: (m) => 'Gearing rises and interest is paid over the term.', do: (lg, m) => { if (!m.best) return { ok: false, text: 'There is no stand to build.' }; const a = run(lg, 'takeLoan', { amount: Math.max(100000, Math.round(m.best.cost / 10000) * 10000), term: FM.bizSources.loanOptions[0].term }); const r = run(lg, 'buildStand', { stand: m.best.id }); return { ok: a.ok && r.ok, text: a.text + ' ' + r.text }; } },
        { id: 'shares', label: 'Issue shares and build', text: () => 'No interest, but the existing owners hold less of the club.', do: (lg, m) => { if (!m.best) return { ok: false, text: 'There is no stand to build.' }; const a = run(lg, 'issueShares', { amount: Math.max(100000, Math.round(m.best.cost / 10000) * 10000) }); const r = run(lg, 'buildStand', { stand: m.best.id }); return { ok: a.ok && r.ok, text: a.text + ' ' + r.text }; } },
        { id: 'wait', label: 'Wait a year', text: () => 'Nothing changes, and neither does the risk.', do: () => ({ ok: true, text: 'We wait. I will show you at the review what that cost us.' }) },
      ], snap: (lg, m) => ({ att: m.f.att, turned: m.turned, yr: m.best ? m.best.yr : 0, rev: m.f.revHead }) },
      { k: 'review', title: 'The review', after: 6, body: (lg, m, st) => {
        const b = m.b, att = ledgerAvg(b, 'att', 3), away = ledgerAvg(b, 'away', 3), s = st.snap || {}, built = st.choice !== 'wait';
        const extra = Math.max(0, att - (s.att || 0)), fcast = (s.yr || 0) / m.home, actual = extra * (s.rev || m.f.revHead), variance = actual - fcast;
        return { lines: [built ? 'Six matchdays on, let us compare what we forecast with what happened. That comparison is {{Variance}} analysis.' : 'We waited, so let me show you what waiting cost.', built ? 'Before the build the average crowd was ' + num(s.att) + '. Over the last three home matches it has been ' + num(att) + '. We now turn away about ' + num(away) + ' a match, against ' + num(s.turned) + ' before.' : 'We turned away about ' + num(away) + ' supporters a match. At ' + gbp(s.rev || m.f.revHead) + ' each, that is ' + gbp(away * (s.rev || m.f.revHead)) + ' of income we did not earn at each home match.', built ? 'We forecast ' + gbp(fcast) + ' of extra income a match and the new seats have brought in about ' + gbp(actual) + ': a ' + (variance >= 0 ? 'favourable' : 'adverse') + ' variance of ' + gbp(Math.abs(variance)) + '.' : 'A decision not to invest is still a decision, and it has a cost.', 'In the end the case rests on the {{Risk}} we took and the {{Reward}} we earned. Well done, Manager.'] };
      } },
    ],
  });

  add({
    id: 'pricing', title: 'Pricing the gate', tag: 'Marketing: price',
    concepts: ['Demand', 'Determinants of demand', 'Supply', 'Determinants of supply', 'Equilibrium price', 'Price elasticity of demand', 'Determinants of price elasticity', 'Income elasticity of demand', 'Substitutes', 'Complements', 'Using elasticity in decisions', 'Pricing strategies', 'Price discrimination', 'Price skimming', 'Penetration pricing', 'Competitive pricing', 'Cost-plus pricing', 'Psychological pricing', 'Price', 'Market segmentation', 'Customer needs', 'Consumer wants', 'Revenue'],
    stages: [
      { k: 'read', title: 'The situation', memo: (m) => ['Manager, we sell the same product, a seat on match day, to very different customers: families, season-ticket holders, the general stand, the executive boxes.', 'That is {{Market segmentation}}, and it means we can charge each group a different {{Price}}. This is {{Price discrimination}}, and it is legal and ordinary when the groups really are different.', 'The question is how each group responds when we change what we charge. That response has a name: {{Price elasticity of demand}}.'], facts: (m) => FM.SEGMENTS.map((s) => [s.name, '£' + m.b.prices[s.id].price + ' · ' + num(m.b.seats[s.id]) + ' seats']), exhibit: 'price' },
      { k: 'calc', title: 'Your analysis', qs: [
        { ask: () => ['Use the table above. For the general stand, find the % change in demand when the price rises 10%, then divide by 10%.', 'What is the price elasticity of demand? Give it as a positive number.'], ans: (m, lg) => { const b = m.b, fx = FM.nextUserFixture(lg), s = FM.SEGMENTS.find((x) => x.id === 'general') || FM.SEGMENTS[0], base = FM.bizDemand(lg, fx), p = b.prices[s.id].price; b.prices[s.id].price = p * 1.1; const d2 = FM.bizDemand(lg, fx); b.prices[s.id].price = p; return Math.abs(((d2.rows[s.id].wanted - base.rows[s.id].wanted) / Math.max(1, base.rows[s.id].wanted)) / 0.1); }, unit: '', tol: 0.15, hint: () => ['PED = % change in demand ÷ % change in price.', 'Take the number of fans wanting a ticket before and after a 10% rise.'], why: () => ['Below 1 a price rise brings in more money; above 1 it brings in less.', 'The things that decide it, the {{Determinants of price elasticity}}, are substitutes, necessity and the share of income spent. A fan with nowhere else to watch has few {{Substitutes}}.'] },
        { ask: () => ['If the general stand is elastic, would raising its price raise or lower the income from it?'], choice: ['Lower it', 'Raise it'], ans: (m, lg) => { const b = m.b, fx = FM.nextUserFixture(lg), s = FM.SEGMENTS.find((x) => x.id === 'general') || FM.SEGMENTS[0], base = FM.bizDemand(lg, fx).rows[s.id].revenue, p = b.prices[s.id].price; b.prices[s.id].price = p * 1.1; const r2 = FM.bizDemand(lg, fx).rows[s.id].revenue; b.prices[s.id].price = p; return r2 < base ? 'Lower it' : 'Raise it'; }, hint: () => ['Compare the revenue column in the table.'], why: () => ['That is {{Using elasticity in decisions}}: the price that earns most is not the lowest or the highest, it is where the elasticity says so.'] },
      ] },
      { k: 'decide', title: 'The decision', ask: () => ['Your strategy for the next few matches. A full stand with fans turned away says the price is too low; an empty one says it is too high.', 'These are {{Pricing strategies}}: {{Competitive pricing}} follows the rivals, {{Cost-plus pricing}} adds a margin to what a seat costs us, {{Price skimming}} starts high and falls, {{Penetration pricing}} starts low to win fans, and {{Psychological pricing}} uses figures like £19.99.'], options: [
        { id: 'raise', label: 'Raise prices 10% in the stands that are full', text: () => 'Skimming where demand is strong.', do: (lg, m) => { const fx = FM.nextUserFixture(lg), d = FM.bizDemand(lg, fx), out = []; FM.SEGMENTS.forEach((s) => { if (d.rows[s.id].wanted > d.rows[s.id].seats) out.push(run(lg, 'setTicketPrice', { stand: s.id, price: Math.round(m.b.prices[s.id].price * 1.1) }).text); }); return { ok: true, text: out.length ? out.join(' ') : 'No stand is full, so nothing was raised.' }; } },
        { id: 'hold', label: 'Hold prices where they are', text: () => 'Stability, and no new information.', do: () => ({ ok: true, text: 'Prices stay as they are.' }) },
        { id: 'cut', label: 'Cut prices 10% everywhere', text: () => 'Penetration pricing to fill the ground.', do: (lg, m) => { FM.SEGMENTS.forEach((s) => run(lg, 'setTicketPrice', { stand: s.id, price: Math.max(3, Math.round(m.b.prices[s.id].price * 0.9)) })); return { ok: true, text: 'Every price is 10% lower from the next home match.' }; } },
      ], snap: (lg, m) => ({ tickets: m.f.avgTicket * m.f.att, att: m.f.att }) },
      { k: 'review', title: 'The review', after: 4, body: (lg, m, st) => { const b = m.b, s = st.snap || {}, att = ledgerAvg(b, 'att', 2), tk = ledgerAvg(b, 'tickets', 2); return { lines: ['Four matchdays on. Ticket income at home is now about ' + gbp(tk) + ' a match, against about ' + gbp(s.tickets) + ' when we decided, and the crowd is ' + num(att) + ' against ' + num(s.att) + '.', tk > (s.tickets || 0) ? 'Income is up: the demand did not fall as fast as the price rose, which is what an inelastic demand looks like.' : 'Income is down or flat: fans were more sensitive to the price than we hoped.', 'Notice that this is one number, from a few matches. {{Income elasticity of demand}} also moves with how well the team is doing.'] }; } },
    ],
  });

  add({
    id: 'marketing', title: 'The marketing campaign', tag: 'Marketing: promotion',
    concepts: ['Marketing mix', 'Product', 'Promotion', 'Place', 'Integrated marketing mix', 'Promotional mix', 'Advertising', 'Sales promotion', 'Public relations', 'Personal selling', 'Digital marketing', 'Social media', 'Branding', 'Marketing strategy', 'Product life cycle', 'Extension strategies', 'Boston matrix', 'Product portfolio', 'Unique selling point', 'Product differentiation', 'Competitive advantage', 'Market positioning', 'Product design', 'Ansoff matrix', 'Distribution', 'Distribution channels', 'Competitive environment', 'Market mapping'],
    stages: [
      { k: 'read', title: 'The situation', memo: (m) => ['Manager, the {{Marketing mix}} has four parts: the {{Product}} (the match, the stadium, the club), the {{Price}}, {{Promotion}} and {{Place}}, which is where and how supporters can buy.', 'You have the marketing budget in your hands. It is ' + gbp(m.b.marketing || 0) + ' a matchday now.', 'Spending on promotion works through the {{Promotional mix}}: {{Advertising}}, {{Sales promotion}}, {{Public relations}}, {{Digital marketing}}. Our {{Unique selling point}} is that we are the only top-flight side in the town.'], facts: (m) => [['Marketing a matchday', gbp(m.b.marketing || 0)], ['Average crowd', num(m.f.att)], ['Revenue per spectator', gbp(m.f.revHead)]], exhibit: 'marketing' },
      { k: 'calc', title: 'Your analysis', qs: [
        { ask: (m) => ['Look at the table above. If the budget is £10,000 a matchday and about ' + num(m.f.att) + ' come to a home match, what does marketing cost per spectator? (A home match covers two matchdays of spending.)'], ans: (m) => 2 * 10000 / m.f.att, unit: '£', tol: 0.1, hint: () => ['Cost per spectator = 2 × budget ÷ crowd.'], why: () => ['A bigger club spreads the same campaign over more people, so each costs less to win. That is an economy of scale in marketing.'] },
        { ask: (m) => ['Is it worth it? Use the figures above: more spectators each bring ' + gbp(m.f.revHead) + '. Does a campaign that costs £20,000 a home match and brings in about 480 extra fans pay for itself?'], choice: ['Yes', 'No'], ans: (m) => (480 * m.f.revHead > 20000 ? 'Yes' : 'No'), hint: () => ['Compare 480 × revenue per spectator with £20,000.'], why: () => ['Marketing is judged by its return, not its size. Here the extra fans earn more than the campaign costs.'] },
      ] },
      { k: 'decide', title: 'The decision', ask: () => ['Set the budget for the next few matches.', 'This is {{Marketing strategy}}: a decision about where to compete and how. In the {{Ansoff matrix}} a higher budget to sell the same product to the same fans is market penetration.'], options: [
        { id: 'zero', label: 'No marketing', text: () => 'Save the money.', do: (lg) => run(lg, 'setMarketing', { perRound: 0 }) },
        { id: 'mid', label: '£10,000 a matchday', text: () => 'A steady campaign.', do: (lg) => run(lg, 'setMarketing', { perRound: 10000 }) },
        { id: 'high', label: '£25,000 a matchday', text: () => 'A big push.', do: (lg) => run(lg, 'setMarketing', { perRound: 25000 }) },
      ], snap: (lg, m) => ({ att: m.f.att, rev: m.f.revHead }) },
      { k: 'review', title: 'The review', after: 4, body: (lg, m, st) => { const b = m.b, s = st.snap || {}, att = ledgerAvg(b, 'att', 2), extra = att - (s.att || 0), spend = (b.marketing || 0) * 2; return { lines: ['Four matchdays on, the crowd is ' + num(att) + ' against ' + num(s.att) + ' before the campaign.', 'The extra ' + num(extra) + ' supporters earn about ' + gbp(extra * (s.rev || m.f.revHead)) + ' a home match, and the campaign costs ' + gbp(spend) + ' for the same two matchdays.', extra * (s.rev || m.f.revHead) > spend ? 'It pays for itself. That is the test of any piece of promotion.' : 'It does not quite pay for itself yet. Promotion often builds slowly, but there is a limit to how long we wait.', 'Our {{Competitive advantage}} is what stops rivals copying this: it has to be something they cannot match.'] }; } },
    ],
  });

  add({
    id: 'finance', title: 'Raising the money', tag: 'Finance',
    concepts: ['Sources of finance', 'Overdraft', 'Trade credit', 'Share capital', 'Retained profit', 'Loan', 'Crowd-funding', 'Venture capital', 'Internal sources of finance', 'External sources of finance', 'Share issue', 'Gearing', 'Revenue expenditure', 'Working capital', 'Public limited company', 'Private limited company', 'Limited liability', 'Unlimited liability', 'Sole trader', 'Partnership', 'Franchise', 'Interest'],
    stages: [
      { k: 'read', title: 'The situation', memo: (m) => ['Manager, a club can pay for what it wants from {{Internal sources of finance}}, such as {{Retained profit}}, or from {{External sources of finance}}: a {{Loan}}, a {{Share issue}}, an {{Overdraft}} or {{Trade credit}} from suppliers.', 'Small firms often use {{Crowd-funding}} or {{Venture capital}}. We are a {{Public limited company}}, so we can sell shares to anyone, and the owners have {{Limited liability}}: they can lose only what they paid in. A {{Sole trader}} has {{Unlimited liability}}.', 'Which to choose depends on cost, risk and control. At present we hold ' + gbp(m.b.cash) + ' in cash and owe ' + gbp(m.b.loans.reduce((a, l) => a + l.balance, 0)) + '.'], facts: (m) => [['Cash', gbp(m.b.cash)], ['Loans', gbp(m.b.loans.reduce((a, l) => a + l.balance, 0))], ['Shares in issue', num(m.b.shares.issued)], ['Share price', '£' + m.b.shares.price.toFixed(2)]], exhibit: 'finance' },
      { k: 'calc', title: 'Your analysis', qs: [
        { ask: () => ['We are considering £500,000. The table above shows what happens to {{Gearing}}.', 'Gearing = loans ÷ capital employed × 100. If we borrowed £500,000, what would gearing be? (Capital employed is total assets less the overdraft.)'], ans: (m, lg) => { const bal = FM.bizBalance(lg), cap = bal.assets - bal.overdraft; return 100 * (bal.loans + 500000) / (cap + 500000); }, unit: '%', tol: 0.3, hint: () => ['Use the "Borrow" row of the table.'], why: () => ['A gearing above about 50% is called highly geared: interest takes a large share of profit and a bad season hurts a lot.'] },
        { ask: () => ['Which would you expect to carry more risk for a club with uncertain results: a loan or a share issue?'], choice: ['A loan', 'A share issue'], ans: () => 'A loan', hint: () => ['Which one has to be paid whether or not we have a good season?'], why: () => ['A loan must be repaid with interest in good years and bad. Shares carry no such promise, which is why investors in them demand a share of the profit instead.'] },
      ] },
      { k: 'decide', title: 'The decision', ask: () => ['We are not in need, but a prudent club arranges finance before it needs it.', 'What would you like me to arrange?'], options: [
        { id: 'loan', label: 'A £500,000 bank loan', text: () => 'Interest to pay, ownership unchanged.', do: (lg) => run(lg, 'takeLoan', { amount: 500000, term: FM.bizSources.loanOptions[0].term }) },
        { id: 'shares', label: '£500,000 of new shares', text: () => 'No interest, existing owners diluted.', do: (lg) => run(lg, 'issueShares', { amount: 500000 }) },
        { id: 'none', label: 'Neither: rely on retained profit', text: () => 'No cost, no flexibility.', do: () => ({ ok: true, text: 'We carry on from our own cash.' }) },
      ], snap: (lg, m) => ({ cash: m.b.cash, loans: m.b.loans.reduce((a, l) => a + l.balance, 0), shares: m.b.shares.issued }) },
      { k: 'review', title: 'The review', after: 4, body: (lg, m, st) => { const b = m.b, interest = b.ledger.slice(-4).reduce((a, e) => a + e.outflow.interest, 0); return { lines: ['Four matchdays on, we have paid ' + gbp(interest) + ' in interest.', st.choice === 'loan' ? 'That is the price of borrowing. It is {{Revenue expenditure}}: it comes out of this season\'s profit.' : st.choice === 'shares' ? 'Shares carry no interest, but the owners now share the dividend with more holders.' : 'No new finance, no new cost: our flexibility is our cash.', 'Cash today is ' + gbp(b.cash) + '. Day-to-day money like that is {{Working capital}}: current assets less current liabilities.'] }; } },
    ],
  });

  add({
    id: 'cashflow', title: 'Budgets and cash flow', tag: 'Finance: planning',
    concepts: ['Cash', 'Cash-flow forecast', 'Cash-flow problems', 'Cash-flow management', 'Budgets', 'Variance', 'Liquidity', 'Current ratio', 'Acid test ratio', 'Business failure', 'Break-even analysis', 'Break-even output', 'Margin of safety', 'Fixed costs', 'Variable costs', 'Total costs', 'Revenue', 'Profit', 'Revenue expenditure'],
    stages: [
      { k: 'read', title: 'The situation', memo: (m) => ['Manager, profit and cash are different things, and clubs fail from running out of the second, not the first.', 'A {{Cash-flow forecast}} shows what we expect to come in and go out each matchday. A {{Budget}} sets the plan. A {{Variance}} is the gap between plan and actual.', 'Most {{Business failure}} is caused by {{Cash-flow problems}}: the money is not there on the day the wages are due.'], facts: (m) => [['Cash now', gbp(m.b.cash)], ['Forecast at season end', gbp((FM.bizCashFlow(m.lg || null) || [{ closing: m.b.cash }]).slice(-1)[0].closing)]], exhibit: 'cashflow' },
      { k: 'calc', title: 'Your analysis', qs: [
        { ask: (m) => ['Standing costs at a home match (wages, administration, interest, depreciation, running the ground) come to ' + gbp(m.f.fixedMatch) + ' and broadcasting and sponsors give ' + gbp(2 * m.f.other) + '. Each spectator brings ' + gbp(m.f.revHead) + ' and costs ' + gbp(m.f.varHead) + '.', 'What crowd do we need to break even? That is the {{Break-even output}}.'], ans: (m) => m.f.netFixed / (m.f.revHead - m.f.varHead), unit: 'spectators', tol: 400, hint: () => ['Break-even = fixed costs ÷ (price − variable cost), after taking off the income that does not depend on the crowd.'], why: (m) => ['We need about ' + num(m.f.netFixed / (m.f.revHead - m.f.varHead)) + ' through the gate. That is {{Break-even analysis}}.'] },
        { ask: (m) => ['The average crowd is ' + num(m.f.att) + '. How many spectators above break-even is that? This is the {{Margin of safety}}.'], ans: (m) => m.f.att - m.f.netFixed / (m.f.revHead - m.f.varHead), unit: 'spectators', tol: 400, hint: () => ['Margin of safety = expected sales − break-even sales.'], why: () => ['A big margin means a few empty seats will not sink us. A negative one means every match loses money.'] },
      ] },
      { k: 'decide', title: 'The decision', ask: () => ['Cash is a cushion; how thick do you want it?', 'This is {{Cash-flow management}}: keeping the money coming in on time and going out on time.'], options: [
        { id: 'cut', label: 'Halve the marketing budget', text: () => 'A smaller outflow each matchday.', do: (lg, m) => run(lg, 'setMarketing', { perRound: Math.round((m.b.marketing || 0) / 2 / 500) * 500 }) },
        { id: 'keep', label: 'Keep spending as planned', text: () => 'Trust the forecast.', do: () => ({ ok: true, text: 'Spending stays as budgeted.' }) },
      ], snap: (lg, m) => ({ cash: m.b.cash, closing: (FM.bizCashFlow(lg)[3] || { closing: m.b.cash }).closing }) },
      { k: 'review', title: 'The review', after: 4, body: (lg, m, st) => { const s = st.snap || {}, v = m.b.cash - (s.closing || 0); return { lines: ['Four matchdays on, we forecast cash of ' + gbp(s.closing) + ' and we have ' + gbp(m.b.cash) + '.', 'The variance is ' + gbp(Math.abs(v)) + ' ' + (v >= 0 ? 'favourable' : 'adverse') + '.', 'A {{Liquidity}} check works the same way every time: could we pay what we owe in the next few weeks? The {{Current ratio}} and the {{Acid test ratio}} put that into a number.'] }; } },
    ],
  });

  add({
    id: 'accounts', title: 'Reading the accounts', tag: 'Finance: accounts', needsMatch: true,
    concepts: ['Income statement', 'Statement of financial position', 'Gross profit', 'Net profit', 'Gross profit margin', 'Net profit margin', 'Operating profit', 'Profit for the year', 'Profit margin', 'Average rate of return', 'Interpreting financial data', 'Ratio analysis', 'Profitability ratios', 'Return on capital employed', 'Liquidity ratios', 'Efficiency ratios', 'Shareholder ratios', 'Gearing ratio', 'Limits of ratio analysis', 'Competitiveness', 'Improving profit', 'Dividends'],
    stages: [
      { k: 'read', title: 'The situation', memo: () => ['Manager, the {{Income statement}} tells you whether we made money over the period; the {{Statement of financial position}} tells you what we own and owe on one day.', 'The statements are in the Accounts tab with the club\'s real figures. Ratios turn them into things you can compare between seasons and between clubs: {{Ratio analysis}}.'], facts: (m) => { const rev = FM.bizSeasonSum(m.lg || null, 'revenue'); return [['Matchdays played', String(m.b.ledger.length)]]; }, exhibit: 'profit' },
      { k: 'calc', title: 'Your analysis', qs: [
        { ask: (m) => ['Use the Accounts tab. Gross profit margin = gross profit ÷ revenue × 100.', 'What is it this season so far?'], ans: (m, lg) => { const r = FM.bizSeasonSum(lg, 'revenue'); return r ? FM.bizSeasonSum(lg, 'gross') / r * 100 : 0; }, unit: '%', tol: 0.5, hint: () => ['Revenue and gross profit are in the income statement.'], why: () => ['{{Gross profit margin}} shows how much of each pound of sales is left after the direct cost of the match.'] },
        { ask: () => ['And the net profit margin: profit for the year ÷ revenue × 100?'], ans: (m, lg) => { const r = FM.bizSeasonSum(lg, 'revenue'); return r ? FM.bizSeasonSum(lg, 'net') / r * 100 : 0; }, unit: '%', tol: 0.5, hint: () => ['Profit for the year is the last line of the income statement.'], why: () => ['{{Net profit margin}} is after wages, administration, depreciation, interest and tax. It is the margin the owners actually see.'] },
      ] },
      { k: 'decide', title: 'The decision', ask: () => ['We can {{Improving profit}} by raising revenue or cutting costs.', 'Which will you pursue first?'], options: [
        { id: 'rev', label: 'Increase revenue: raise the marketing budget', text: () => 'More fans.', do: (lg, m) => run(lg, 'setMarketing', { perRound: Math.max(10000, (m.b.marketing || 0) + 5000) }) },
        { id: 'cost', label: 'Cut costs: lower the marketing budget', text: () => 'Lower outflow.', do: (lg, m) => run(lg, 'setMarketing', { perRound: Math.max(0, (m.b.marketing || 0) - 5000) }) },
      ], snap: (lg) => ({ net: FM.bizSeasonSum(lg, 'net') }) },
      { k: 'review', title: 'The review', after: 4, body: (lg, m, st) => { const net = FM.bizSeasonSum(lg, 'net'); return { lines: ['Four matchdays on, the profit for the year to date is ' + gbp(net) + ', against ' + gbp((st.snap || {}).net) + ' when you decided.', 'Remember the {{Limits of ratio analysis}}: ratios use past figures, ignore things like team spirit or the weather, and mean little without a comparison.'] }; } },
    ],
  });

  add({
    id: 'people', title: 'Pay, motivation and the squad', tag: 'People',
    concepts: ['Financial motivation', 'Non-financial motivation', 'Piece rate', 'Commission', "Taylor's scientific management", "Mayo's human relations", "Maslow's hierarchy of needs", "Herzberg's two-factor theory", 'Financial motivators', 'Non-financial motivators', 'Leadership styles', 'Employer-employee relations', 'Workforce planning', 'Flexible workforce', 'Recruitment and selection', 'Training', 'Internal recruitment', 'External recruitment', 'Induction training', 'On-the-job training', 'Off-the-job training', 'Job description', 'Person specification', 'Productivity', 'Efficiency'],
    stages: [
      { k: 'read', title: 'The situation', memo: (m) => ['Manager, the biggest single cost we have is people. The squad costs ' + gbp(m.wages) + ' a week.', 'Pay is a {{Financial motivators}}, but {{Herzberg\'s two-factor theory}} says it only stops people being unhappy; recognition and the work itself motivate. {{Maslow\'s hierarchy of needs}} says that once pay and security are met, people want belonging and esteem.', '{{Taylor\'s scientific management}} argued for pay by output ({{Piece rate}}); {{Mayo\'s human relations}} found that attention and teamwork matter more. A footballer paid {{Commission}} on goals is a fair modern example.'], facts: (m) => [['Wage bill a week', gbp(m.wages)], ['As a share of revenue', m.wagePct ? pc(m.wagePct) : 'n/a']] },
      { k: 'calc', title: 'Your analysis', qs: [
        { ask: (m) => ['The squad costs ' + gbp(m.wages) + ' a week, and a season is ' + m.K.ROUNDS + ' weeks.', 'What is the wage bill for a season?'], ans: (m) => m.wages * m.K.ROUNDS, unit: '£', tol: 100000, hint: () => ['Weekly wages × number of weeks.'], why: () => ['That is the figure to hold against revenue: it is our biggest {{Fixed costs}}.'] },
        { ask: () => ['If a win bonus of £2,000 a player went to eleven players for each of the 14 matches and we won half of them, what would it cost over the season?'], ans: () => 2000 * 11 * 7, unit: '£', tol: 1000, hint: () => ['Bonus × players × wins.'], why: () => ['A bonus per win is {{Piece rate}} in football: pay linked to output.'] },
      ] },
      { k: 'decide', title: 'The decision', ask: () => ['How will you keep the squad motivated and improving?'], options: [
        { id: 'train', label: 'Invest in the training ground', text: () => 'Off-the-job training and better development.', do: (lg) => run(lg, 'buyFacility', { id: 'training' }) },
        { id: 'bonus', label: 'Introduce a win bonus (policy)', text: () => 'Financial motivation tied to results.', do: (lg) => rec(lg, 'A win bonus is agreed. Rafael will watch the cost.', -1) },
        { id: 'culture', label: 'Invest in team culture (policy)', text: () => 'Non-financial motivation.', do: (lg) => rec(lg, 'You hold a squad away day and open a recognition scheme.', 1) },
      ], snap: (lg, m) => ({ wages: m.wages }) },
      { k: 'review', title: 'The review', after: 4, body: (lg, m, st) => ({ lines: ['Four matchdays on, the wage bill is ' + gbp(m.wages) + ' a week.', st.choice === 'train' ? 'The training ground is {{Off-the-job training}}: players learn away from match day. Do check that squad development has picked up on the squad page.' : 'Decisions about motivation show over a season, not in four matches. Check the club\'s results, then judge it.', 'Hiring is the other side of the same coin: a {{Job description}} lists the work, a {{Person specification}} lists the person; we recruit {{Internal recruitment}} from the academy or {{External recruitment}} in the market.'] }) },
    ],
  });

  add({
    id: 'structure', title: 'Organising the club', tag: 'People: structure',
    concepts: ['Organisational structure', 'Hierarchical structure', 'Flat structure', 'Chain of command', 'Span of control', 'Delegation', 'Centralised', 'Decentralised', 'Organisational design', 'Hierarchy', 'Corporate culture', 'Organisational culture', 'Managing change', 'Resistance to change', 'Force field analysis', 'Internal change', 'Causes of change'],
    stages: [
      { k: 'read', title: 'The situation', memo: () => ['Manager, a club of this size has an {{Organisational structure}} whether anyone drew it or not.', 'Ours is a {{Hierarchical structure}} with several layers, each with a {{Span of control}}: the number of people reporting to one manager. A {{Flat structure}} has fewer layers and wider spans.', 'The {{Chain of command}} is the route orders pass down. Look at the chart in the Shareholders tab: it shows ours.'], exhibit: 'org' },
      { k: 'calc', title: 'Your analysis', qs: [
        { ask: () => ['In our chart, the assistant manager has three coaches reporting to him.', 'What is his span of control?'], ans: () => 3, unit: '', tol: 0.01, hint: () => ['Count the people who report directly to him.'], why: () => ['A span of three is narrow: close supervision, but more layers.'] },
        { ask: () => ['Counting from the shareholders to the players in the chart: shareholders, board, manager, assistant manager, coach, players. How many layers is that?'], ans: () => 6, unit: '', tol: 0.01, hint: () => ['Count the rows from the top to the bottom.'], why: () => ['Six layers is tall. Orders pass through many hands, which can slow decisions: that is the main cost of a tall hierarchy.'] },
      ] },
      { k: 'decide', title: 'The decision', ask: () => ['You want faster decisions on match days. Which direction?'], options: [
        { id: 'delegate', label: 'Delegate: give coaches authority over their areas', text: () => 'Decentralised; faster, less control.', do: (lg) => rec(lg, 'Coaches take charge of their own units. Decisions are faster but you see less of the detail.', 1) },
        { id: 'central', label: 'Centralise: you take the decisions', text: () => 'Centralised; control, but slower.', do: (lg) => rec(lg, 'All decisions come to you. Control is tight; the staff report a slower pace.', -1) },
      ], snap: () => ({}) },
      { k: 'review', title: 'The review', after: 4, body: () => ({ lines: ['Four matchdays on, the staff have settled into the new way of working.', 'Every change meets {{Resistance to change}}. {{Force field analysis}} lists the forces for a change on one side and against it on the other; the change goes ahead when the forces for are stronger.', 'A club\'s {{Organisational culture}} is how it does things when nobody is watching; it is built by structure, but also by what you reward.'] }) },
    ],
  });

  add({
    id: 'owners', title: 'The owners and the stakeholders', tag: 'Objectives and ethics',
    concepts: ['Stakeholders', 'Shareholders', 'Employees', 'Customers', 'Suppliers', 'Local community', 'Pressure groups', 'Government', 'Shareholder versus stakeholder view', 'Business ethics', 'Corporate social responsibility', 'Stakeholder mapping', 'Short-termism', 'Sustainability', 'Environmental considerations', 'Environmental pressures', 'Dividends', 'Corporate culture', 'Mission statement', 'Changing aims', 'Corporate objectives', 'Financial objectives', 'Non-financial objectives', 'Social influences'],
    stages: [
      { k: 'read', title: 'The situation', memo: (m) => ['Manager, every decision at the club affects people who have a stake in it: {{Shareholders}}, {{Employees}}, {{Customers}}, {{Suppliers}}, the {{Local community}}, {{Pressure groups}} and the {{Government}}. Together they are the {{Stakeholders}}.', 'They do not want the same things. The Shareholders tab sets out the owners and their aims; the dividend is where the conflict shows most clearly.', 'A {{Mission statement}} and our {{Corporate objectives}} are how we choose between them.'], exhibit: 'dividend' },
      { k: 'calc', title: 'Your analysis', qs: [
        { ask: (m) => ['The club expects to make a profit after tax of about ' + gbp(m.net) + ' this year and has ' + num(m.b.shares.issued) + ' shares.', 'If the shareholders hope for a 20% dividend, what dividend per share is that, in pence?'], ans: (m) => Math.max(0, m.net) * 0.2 / m.b.shares.issued * 100, unit: 'p', tol: 1, hint: () => ['Dividend per share = profit × payout ÷ number of shares.'], why: () => ['{{Dividends}} are the shareholders\' share of profit.', 'Whatever is not paid out is kept to grow the club.'] },
      ] },
      { k: 'decide', title: 'The decision', ask: () => ['Set the dividend policy, knowing it moves the owners\' approval.', 'The {{Shareholder versus stakeholder view}} asks whether the club\'s job is to maximise returns to owners or to balance everyone\'s interests.'], options: [
        { id: 'low', label: 'Pay 10% of profit and fund the Green Pitch plan', text: () => 'The stakeholder view: sustainability and community first.', do: (lg) => { const r = run(lg, 'setDividend', { percent: 10 }); const q = rec(lg, 'You back the Green Pitch sustainability plan.', 1); return { ok: r.ok, text: r.text + ' ' + q.text }; } },
        { id: 'mid', label: 'Pay the expected 20%', text: () => 'The balance.', do: (lg) => run(lg, 'setDividend', { percent: 20 }) },
        { id: 'high', label: 'Pay 40% of profit', text: () => 'The shareholder view, and {{Short-termism}}: pleasing owners now at the cost of later.', do: (lg) => run(lg, 'setDividend', { percent: 40 }) },
      ], snap: (lg) => ({ appr: FM.bizApprovals(lg).financial }) },
      { k: 'review', title: 'The review', after: 4, body: (lg, m, st) => ({ lines: ['Four matchdays on, financial approval stands at ' + Math.round(FM.bizApprovals(lg).financial) + '%, against ' + Math.round((st.snap || {}).appr) + '% when we decided.', 'It is {{Corporate social responsibility}} that makes a club more than a business; {{Business ethics}} is what stops it taking a shortcut that hurts people. Neither is free, and neither is optional.', 'A {{Stakeholder mapping}} grid sorts the groups by power and interest: owners with high power and high interest need managing closely.'] }) },
    ],
  });

  add({
    id: 'strategy', title: 'Strategy and the big decisions', tag: 'Strategy',
    concepts: ['Corporate objectives', 'Corporate strategy', 'SWOT analysis', 'Ansoff matrix', "Porter's generic strategies", 'Short-term and long-term targets', 'Decision trees', 'Expected value', 'Critical path analysis', 'Float', 'Limits of quantitative methods', 'Scenario planning', 'Contingency planning', 'Business aims', 'Business objectives'],
    stages: [
      { k: 'read', title: 'The situation', memo: () => ['Manager, a {{SWOT analysis}} lists our Strengths and Weaknesses inside the club, and the Opportunities and Threats outside it.', 'Our strengths: a loyal town, a strong first team. Our weaknesses: a small ground and thin cash. Opportunities: a growing market. Threats: richer clubs.', 'From it come our {{Corporate strategy}} and our {{Short-term and long-term targets}}.'] },
      { k: 'calc', title: 'Your analysis', qs: [
        { ask: () => ['A decision tree. We can build a new stand (cost £1,000,000). If demand is high (probability 0.6) it earns £2,000,000; if low (0.4) it earns £500,000.', 'What is the {{Expected value}} of building, after the cost?'], ans: () => 0.6 * 2000000 + 0.4 * 500000 - 1000000, unit: '£', tol: 1, hint: () => ['Expected value = Σ probability × outcome, less the cost.'], why: () => ['A positive expected value says build. {{Decision trees}} are one of the {{Limits of quantitative methods}}: the probabilities are opinions.'] },
        { ask: () => ['The build has four tasks: planning (2 weeks), foundations (3 weeks, after planning), steelwork (4 weeks, after foundations), fitting out (2 weeks, after steelwork). The shortest time to finish is the sum along the critical path.', 'How many weeks?'], ans: () => 11, unit: 'weeks', tol: 0.01, hint: () => ['Add the durations along the one path.'], why: () => ['{{Critical path analysis}} finds the longest chain of dependent tasks. Any task off it has {{Float}}: time it can slip without delaying the project.'] },
      ] },
      { k: 'decide', title: 'The decision', ask: () => ['In the {{Ansoff matrix}}, which strategy do you prefer?'], options: [
        { id: 'pen', label: 'Market penetration: sell more of what we have', text: () => 'The lowest-risk option.', do: (lg) => run(lg, 'setMarketing', { perRound: 15000 }) },
        { id: 'dev', label: 'Product development: a new fan zone', text: () => 'New product, same fans.', do: (lg) => run(lg, 'buyFacility', { id: 'fanzone' }) },
        { id: 'hold', label: 'Stay as we are', text: () => 'No new risk, and no new growth.', do: () => ({ ok: true, text: 'No change of strategy.' }) },
      ], snap: () => ({}) },
      { k: 'review', title: 'The review', after: 4, body: () => ({ lines: ['Four matchdays on, we are still early in the plan.', 'Every plan should have a {{Contingency planning}} answer: what we do if results go badly or a rival bids for our star. {{Scenario planning}} imagines the good, normal and bad futures beforehand so that none of them is a surprise.', '{{Porter\'s generic strategies}} describe how a firm can win: lowest cost, differentiation or a focus on a niche. A club in a town of this size usually wins on differentiation: its identity.'] }) },
    ],
  });

  add({
    id: 'growth', title: 'Growing the club', tag: 'Growth',
    concepts: ['External growth', 'Merger', 'Takeover', 'Inorganic growth', 'Mergers and takeovers', 'Problems of growth', "Greiner's growth model", 'Demerger', 'Reasons for staying small', 'Diseconomies of scale', 'Economies of scale', 'Changing aims', 'Franchise', 'Joint ventures', 'Licensing', 'Organic growth'],
    stages: [
      { k: 'read', title: 'The situation', memo: () => ['Manager, we have received an approach from Brightwater Athletic, a neighbouring club. They suggest a {{Merger}}.', 'That is {{External growth}} ({{Inorganic growth}}): growing by joining with another business, where building our own stand was {{Organic growth}}. A {{Takeover}} would be one club buying the other against its wishes.', 'The attraction is scale: two clubs share costs, so {{Economies of scale}}. The danger is {{Problems of growth}}: two cultures, two sets of supporters, and {{Diseconomies of scale}} when the combined business becomes too large to manage.'] },
      { k: 'calc', title: 'Your analysis', qs: [
        { ask: (m) => ['Brightwater have a matchday income of about ' + gbp(m.annual * 0.55) + ' a year. Together with our ' + gbp(m.annual) + ', what is the combined income?'], ans: (m) => m.annual * 1.55, unit: '£', tol: 100000, hint: () => ['Add the two.'], why: () => ['A combined business has more income to spread its fixed costs over.'] },
        { ask: (m) => ['If the combined club could share £400,000 of administration, saving a quarter of it, what would it save?'], ans: () => 100000, unit: '£', tol: 1, hint: () => ['A quarter of £400,000.'], why: () => ['Those savings are the first economy of scale.'] },
      ] },
      { k: 'decide', title: 'The decision', ask: () => ['What is your answer to Brightwater?'], options: [
        { id: 'merge', label: 'Accept the merger in principle', text: () => 'Scale, but the supporters are divided.', do: (lg) => rec(lg, 'You open merger talks. The shareholders approve; the supporters\' trust is cautious.', 2) },
        { id: 'jv', label: 'Propose a joint venture instead', text: () => 'Share the academy, keep both clubs.', do: (lg) => rec(lg, 'You propose a {{Joint ventures}} on youth football: shared costs, separate clubs.'.replace(/\{\{|\}\}/g, ''), 1) },
        { id: 'small', label: 'Decline and stay independent', text: () => 'The case for staying small.', do: (lg) => rec(lg, 'You decline. The supporters\' trust applauds.', 0) },
      ], snap: () => ({}) },
      { k: 'review', title: 'The review', after: 4, body: () => ({ lines: ['Four matchdays on, the response from the stands has been loud either way.', 'In {{Greiner\'s growth model}} a growing business passes through crises: leadership, autonomy, control. Each solved crisis leads to the next stage.', 'There are good {{Reasons for staying small}}: control, a close relationship with the community, lower risk. A {{Demerger}} undoes a merger when it has not worked. Growth can also come by {{Franchise}} or {{Licensing}} of the club\'s brand.'] }) },
    ],
  });

  add({
    id: 'operations', title: 'Match-day operations', tag: 'Operations',
    concepts: ['Production processes', 'Technology in production', 'Stock control', 'Just-in-time', 'Procurement', 'Logistics', 'Supplier relationships', 'Quality control', 'Quality assurance', 'Customer service', 'Sales process', 'Productivity', 'Efficiency', 'Lean production', 'Supply chain management', 'Quality management', 'Distribution', 'Distribution channels', 'Place', 'Goods', 'Services'],
    stages: [
      { k: 'read', title: 'The situation', memo: () => ['Manager, a match day is a production process: we supply a {{Services}} (the match) and {{Goods}} (shirts, food, programmes) to about ten thousand customers in two hours.', 'The {{Production processes}} behind it are {{Logistics}}, {{Procurement}} (buying from suppliers) and {{Supplier relationships}}. In the club shop we hold stock, so {{Stock control}} matters. {{Just-in-time}} means ordering only what is about to be sold.'] },
      { k: 'calc', title: 'Your analysis', qs: [
        { ask: () => ['The shop sells about 120 shirts a home match and has 600 in stock.', 'How many home matches\' worth of stock is that?'], ans: () => 5, unit: 'matches', tol: 0.01, hint: () => ['Stock ÷ sales per match.'], why: () => ['Five matches of stock ties up money and storage; a {{Just-in-time}} approach would hold perhaps one.'] },
        { ask: () => ['If holding a shirt costs £4 a season and we hold 600 on average, what does stockholding cost?'], ans: () => 2400, unit: '£', tol: 1, hint: () => ['Cost × number held.'], why: () => ['That is the price of safety. Too little stock loses sales; too much costs money.'] },
      ] },
      { k: 'decide', title: 'The decision', ask: () => ['How do we improve the match-day experience?'], options: [
        { id: 'shop', label: 'Build a bigger club shop', text: () => 'More sales space.', do: (lg) => run(lg, 'buyFacility', { id: 'shop' }) },
        { id: 'screens', label: 'Install big screens and digital boards', text: () => 'Technology and advertising.', do: (lg) => run(lg, 'buyFacility', { id: 'screens' }) },
        { id: 'service', label: 'Train stewards and staff in customer service (policy)', text: () => 'Better {{Customer service}}.'.replace(/\{\{|\}\}/g, ''), do: (lg) => rec(lg, 'You fund a customer-service programme.', 1) },
      ], snap: () => ({}) },
      { k: 'review', title: 'The review', after: 4, body: () => ({ lines: ['Four matchdays on, the operation is running smoothly.', '{{Quality control}} checks the product at the end; {{Quality assurance}} builds quality in before it. {{Lean production}} cuts waste at every stage, and {{Supply chain management}} runs the whole chain from supplier to supporter.', 'Productivity is output per worker; {{Efficiency}} is output for the resources used. A fast queue at the bars is both.'] }) },
    ],
  });

  add({
    id: 'environment', title: 'The world outside the club', tag: 'External environment',
    concepts: ['Legislation', 'Economic growth', 'Unemployment', 'Inflation', 'Interest rates', 'Exchange rates', 'Taxation and government spending', 'Taxation', 'Social influences', 'Environmental pressures', 'Technological change', 'PESTLE', 'Consumer law', 'Employment law', 'Health and safety law', 'E-commerce', 'Dynamic business environment', 'Government'],
    stages: [
      { k: 'read', title: 'The situation', memo: () => ['Manager, a {{PESTLE}} analysis looks at Political, Economic, Social, Technological, Legal and Environmental forces. None of them is in our control, and all of them affect us.', 'Economic: {{Interest rates}}, {{Inflation}}, {{Unemployment}} and {{Economic growth}}. Legal: {{Consumer law}}, {{Employment law}} and {{Health and safety law}} (the safety of the ground). {{Taxation}}: we pay corporation tax on profit.'] },
      { k: 'calc', title: 'Your analysis', qs: [
        { ask: (m) => ['We pay corporation tax at 25% of profit. If the year ends with a profit before tax of £800,000, how much tax do we pay?'], ans: () => 200000, unit: '£', tol: 1, hint: () => ['25% of £800,000.'], why: () => ['That is {{Taxation and government spending}} at work: the club pays it, and the town gets roads and schools.'] },
        { ask: (m) => ['The bank raises interest rates by 2 percentage points. On a loan of £1,000,000 at 6%, how much more interest a year?'], ans: () => 20000, unit: '£', tol: 1, hint: () => ['2% of £1,000,000.'], why: () => ['{{Interest rates}} change the cost of every loan we hold on a variable rate.'] },
      ] },
      { k: 'decide', title: 'The decision', ask: () => ['Rates may rise. What do you do about the loans we carry?'], options: [
        { id: 'repay', label: 'Repay what we can from cash', text: () => 'Less exposure to rate rises.', do: (lg, m) => { const l = m.b.loans[0]; return l ? run(lg, 'repayLoan', { id: l.id }) : { ok: true, text: 'We have no loans to repay.' }; } },
        { id: 'keep', label: 'Keep the cash and the loans', text: () => 'Flexibility, at the cost of exposure.', do: () => ({ ok: true, text: 'We keep our options open.' }) },
      ], snap: () => ({}) },
      { k: 'review', title: 'The review', after: 4, body: () => ({ lines: ['Four matchdays on, the economy has moved a little and we have moved with it.', 'The environment is a {{Dynamic business environment}}: it changes, so a plan needs reviewing. {{Social influences}} such as changing tastes in how fans watch and buy tickets lead to {{Technological change}}: mobile tickets and {{E-commerce}} in the club shop.', 'The {{Government}} sets the rules, and {{Environmental pressures}} push us towards the Green Pitch plan.'] }) },
    ],
  });

  add({
    id: 'global', title: 'Going global', tag: 'Global business',
    concepts: ['Globalisation', 'Imports', 'Exports', 'Multinationals', 'Trade', 'Trade liberalisation', 'Trade barriers', 'Trading blocs', 'Protectionism', 'Outsourcing and offshoring', 'Impact of globalisation', 'Reasons to enter global markets', 'Assessing a market', 'Assessing a production location', 'Exchange rate effects', 'Reshoring', 'Global marketing mix', 'Cultural differences', 'Standardisation versus adaptation', 'E-commerce and global reach', 'Global brands', 'Multinational corporation', 'Benefits of multinationals', 'Costs of multinationals', 'Transfer pricing', 'Controlling multinationals', 'Ethical global supply chains', 'Franchising overseas', 'Exchange rates'],
    stages: [
      { k: 'read', title: 'The situation', memo: () => ['Manager, football is a global product. Kestrel Telecom, our sponsor, has asked whether we would tour East Asia and sell shirts there.', 'That is one of the {{Reasons to enter global markets}}: new customers, spreading risk, and a bigger {{Global brands}} presence. It also brings {{Cultural differences}} and the question of {{Standardisation versus adaptation}}: sell the same shirt everywhere, or change it for each place.', 'We would {{Exports}} shirts and {{Imports}} nothing. Shirts made overseas are {{Outsourcing and offshoring}}; an ethical club checks the {{Ethical global supply chains}} behind them.'] },
      { k: 'calc', title: 'Your analysis', qs: [
        { ask: () => ['A shirt sells for £60 in the town and for 480 yuan in China when £1 buys 8 yuan. What is the price in pounds in China?'], ans: () => 60, unit: '£', tol: 0.01, hint: () => ['480 ÷ 8.'], why: () => ['£60: the same price, because 480 ÷ 8 = 60.'] },
        { ask: () => ['If the pound strengthens so that £1 buys 10 yuan, the same 480-yuan shirt is worth how many pounds?'], ans: () => 48, unit: '£', tol: 0.01, hint: () => ['480 ÷ 10.'], why: () => ['A stronger pound means we earn fewer pounds from the same sale abroad. That is the {{Exchange rate effects}} on exporters.'] },
      ] },
      { k: 'decide', title: 'The decision', ask: () => ['Do we go?'], options: [
        { id: 'tour', label: 'Accept the sponsor\'s tour (policy)', text: () => 'A new market and a bigger brand.', do: (lg) => rec(lg, 'The Asia tour is agreed. The brand grows; the cost is in the next budget.', 2) },
        { id: 'online', label: 'Sell online only (policy)', text: () => 'Global reach without the travel.', do: (lg) => rec(lg, 'You open an overseas shop online. It costs little and reaches far.', 1) },
        { id: 'local', label: 'Stay local', text: () => 'No new risk.', do: () => ({ ok: true, text: 'We stay local.' }) },
      ], snap: () => ({}) },
      { k: 'review', title: 'The review', after: 4, body: () => ({ lines: ['Four matchdays on, the first orders from abroad are in.', 'Globalisation, the growth of trade between countries, is helped by {{Trade liberalisation}} and held back by {{Trade barriers}} and {{Protectionism}}. {{Trading blocs}} remove barriers between members.', 'A {{Multinational corporation}} has operations in many countries. Its {{Benefits of multinationals}} (jobs, investment) come with {{Costs of multinationals}}; {{Transfer pricing}} moves profit between its branches to cut tax, and {{Controlling multinationals}} is a matter for governments. {{Reshoring}} brings production back home.'] }) },
    ],
  });

  add({
    id: 'enterprise', title: 'Starting something new: the supporters\' academy', tag: 'Enterprise',
    concepts: ['Entrepreneur', 'Risk', 'Reward', 'Goods', 'Services', 'Consumer wants', 'Role of business enterprise', 'Added value', 'New business ideas', 'Adapting existing products', 'Customer needs', 'Market research', 'Primary research', 'Secondary research', 'Qualitative data', 'Quantitative data', 'Sample size', 'Sampling', 'Primary market research', 'Secondary market research', 'Quantitative research', 'Qualitative research', 'Reliability of research', 'Market segmentation', 'Market positioning', 'Mass market', 'Niche market', 'Business location', 'Business plan', 'Role of an entrepreneur', 'Entrepreneurial motives', 'Entrepreneurial characteristics', 'Intrapreneurship', 'Moving from entrepreneur to leader', 'Government support for entrepreneurs', 'Competitive environment', 'Dynamic business environment', 'New business ideas'],
    stages: [
      { k: 'read', title: 'The situation', memo: () => ['Manager, a young member of our staff has come to me with an idea: a paid supporters\' football academy for children on Saturday mornings. That is {{Intrapreneurship}}: entrepreneurial behaviour inside an existing organisation.', 'An {{Entrepreneur}} takes a {{Risk}} for the chance of a {{Reward}}. The idea meets a {{Consumer wants}}, and adds {{Added value}} to what we already sell.', 'Before anyone spends money, we do {{Market research}}.'] },
      { k: 'calc', title: 'Your analysis', qs: [
        { ask: () => ['We ask 200 local parents (a {{Sample size}}). 124 say they would pay.', 'What percentage is that?'], ans: () => 62, unit: '%', tol: 0.1, hint: () => ['124 ÷ 200 × 100.'], why: () => ['That is {{Quantitative data}}: numbers. A conversation with a few parents about why would be {{Qualitative data}}: opinions.'] },
        { ask: () => ['There are about 3,000 families in the catchment. If 62% of them truly would pay £40 a month, what would the academy take in a month?'], ans: () => 0.62 * 3000 * 40, unit: '£', tol: 100, hint: () => ['Families × 62% × £40.'], why: () => ['An upper bound: not everyone who says yes comes. That is a {{Reliability of research}} issue.'] },
      ] },
      { k: 'decide', title: 'The decision', ask: () => ['Do we back it?', 'A {{Business plan}} would set out the market, the costs, the forecast and the finance. A {{Niche market}} such as this one is small, with specific needs; our league games are a {{Mass market}}.'], options: [
        { id: 'back', label: 'Back the academy with a small marketing budget', text: () => 'A modest start.', do: (lg, m) => run(lg, 'setMarketing', { perRound: Math.max(5000, m.b.marketing || 0) }) },
        { id: 'pilot', label: 'Pilot it for a term first (policy)', text: () => 'Test before committing.', do: (lg) => rec(lg, 'The academy runs as a one-term pilot.', 1) },
        { id: 'drop', label: 'Decline for now', text: () => 'No cost, no new market.', do: () => ({ ok: true, text: 'We decline for now.' }) },
      ], snap: () => ({}) },
      { k: 'review', title: 'The review', after: 4, body: () => ({ lines: ['Four matchdays on, the first children have signed up.', 'The {{Role of an entrepreneur}} is to spot the gap, organise the resources and carry the risk. {{Entrepreneurial motives}} include profit, independence and personal satisfaction; {{Entrepreneurial characteristics}} include a willingness to take risks and drive. Many founders must learn to lead, {{Moving from entrepreneur to leader}}.', '{{Government support for entrepreneurs}} comes as grants, advice and tax help. Its {{Business location}} decision (the academy sits next to the ground) saves rent, and it must fit the {{Competitive environment}}: other clubs offer similar schemes.'] }) },
    ],
  });

  // ---------- state ----------
  const stateOf = (lg, id) => { const b = FM.biz(lg); b.cases = b.cases || {}; return (b.cases[id] = b.cases[id] || { s: 0, q: {}, choice: null, r0: null, snap: null, done: false }); };
  const covered = (lg) => { const b = FM.biz(lg), c = b.cases || {}, done = new Set(), started = new Set(); CASES.forEach((k) => { const st = c[k.id]; if (st && st.done) k.concepts.forEach((x) => done.add(x)); else if (st && (st.s > 0 || st.choice)) k.concepts.forEach((x) => started.add(x)); }); return { done, started }; };

  // ---------- the pages ----------
  function listHtml(lg) {
    const b = FM.biz(lg), cov = covered(lg), list = (FM.BOOKS[LEVEL] || []).reduce((a, th) => a.concat(th.topics.reduce((x, t) => x.concat(t.c.map((c) => c[0])), [])), []), uniq = Array.from(new Set(list)), mapped = new Set(); CASES.forEach((k) => k.concepts.forEach((x) => mapped.add(x)));
    const n = uniq.length, nd = uniq.filter((x) => cov.done.has(x)).length, nm = uniq.filter((x) => mapped.has(x)).length;
    const cards = CASES.map((k, i) => { const st = (b.cases || {})[k.id], status = st && st.done ? 'Complete' : st && (st.s > 0 || st.choice) ? 'In progress' : 'New', k2 = k.concepts.filter((x) => uniq.indexOf(x) >= 0).length; return `<button type="button" class="bc-card ${status === 'Complete' ? 'done' : ''}" data-case="${k.id}"><span class="bc-tag">Board paper ${i + 1} · ${esc(k.tag)}</span><b>${esc(k.title)}</b><span class="bc-meta">${status} · ${k2} concepts</span></button>`; }).join('');
    const missing = uniq.filter((x) => !mapped.has(x));
    return `<div class="bc-head"><div class="eyebrow">From the Director of Finance</div><h2>Board papers</h2><p class="bk-lead">Each paper is a decision the club has to make. Work through it with the club's own figures and controls, then review how it turned out a few matchdays later.</p></div>
      <div class="bc-grid">${cards}</div>
      <div class="card bk-card"><h3>Course coverage</h3><div class="bc-bar"><i style="width:${(100 * nm / n).toFixed(0)}%"></i></div><p class="bk-lead">${nm} of ${n} ${LEVEL === 'gcse' ? 'GCSE' : 'A-level'} concepts are covered by a paper, and you have completed papers covering <b>${nd}</b> of them.</p>
      <details class="bk-keys"><summary>Concepts met so far (${nd})</summary><div class="bc-chips">${uniq.filter((x) => cov.done.has(x)).map((x) => term(x)).join(' ') || '<span class="bk-why">None yet.</span>'}</div></details>
      ${missing.length ? `<details class="bk-keys"><summary>Not yet in a paper (${missing.length})</summary><div class="bc-chips">${missing.map((x) => term(x)).join(' ')}</div></details>` : ''}</div>`;
  }
  const exhibitHtml = (lg, m, k) => { const B = BL(); try { return { price: B.wPrice, marketing: B.wMarketing, finance: B.wFinance, dividend: B.wDividend, invest: B.wInvest, scale: B.wScale, signing: B.wSigning, wages: B.wWages }[k] ? { price: B.wPrice, marketing: B.wMarketing, finance: B.wFinance, dividend: B.wDividend, invest: B.wInvest, scale: B.wScale, signing: B.wSigning, wages: B.wWages }[k](lg) : k === 'cashflow' ? `<div class="card bk-card"><h3>Cash-flow forecast</h3>${FM.bizCashFlowHtml(lg)}</div>` : k === 'profit' ? `<div class="card bk-card"><h3>Income statement</h3>${FM.bizProfitHtml(lg)}</div>` : k === 'org' ? (FM.booksLearn && FM.booksLearn.org ? FM.booksLearn.org() : '') : ''; } catch (e) { return ''; } };

  function caseHtml(lg, c) {
    const st = stateOf(lg, c.id), m = M(lg); m.lg = lg; m.wages = BL().facts ? FM.bizInternals.wageBill(lg) : 0; const rev = FM.bizSeasonSum(lg, 'revenue'); m.wagePct = rev ? 100 * m.wages * m.K.ROUNDS / (rev / Math.max(1, m.b.ledger.length) * m.K.ROUNDS) : 0; m.net = m.b.ledger.length ? FM.bizSeasonSum(lg, 'net') / Math.max(1, m.b.ledger.length) * m.K.ROUNDS : m.K.PROFIT_TARGET;
    const sg = c.stages[Math.min(st.s, c.stages.length - 1)], n = c.stages.length;
    const steps = `<ol class="bc-steps">${c.stages.map((s, i) => `<li class="${i < st.s || st.done ? 'done' : i === st.s ? 'on' : ''}">${esc(s.title)}</li>`).join('')}</ol>`;
    let body = '';
    if (c.needsMatch && !m.b.ledger.length) body = `<div class="card bk-card"><p class="bk-lead">${P(['Manager, this paper uses the real accounts, and we have not played yet.', 'Come back after your first match.'])}</p></div>`;
    else if (st.done) body = `<div class="card bk-card"><h3>Paper complete</h3><p class="bk-lead">${esc('You have worked through this paper. Its concepts are now counted in your course coverage.')}</p><div class="bc-chips">${c.concepts.map((x) => term(x)).join(' ')}</div></div>`;
    else {
      const memo = (lines) => `<div class="bc-memo"><div class="bc-from"><b>Rafael Morales</b> Director of Finance · to the Manager</div>${P(lines)}</div>`;
      if (sg.k === 'read') body = memo(sg.memo(m)) + (sg.facts ? factsTable(sg.facts(m)) : '') + (sg.exhibit ? exhibitHtml(lg, m, sg.exhibit) : '') + `<div class="bk-ctl"><button type="button" class="primary" data-cont>Continue</button></div>`;
      else if (sg.k === 'calc') {
        const qi = sg.qs.findIndex((q, i) => !st.q[st.s + ':' + i]);
        body = sg.qs.map((q, i) => { const key = st.s + ':' + i, doneQ = !!st.q[key]; if (qi >= 0 && i > qi) return ''; const ask = q.ask(m, lg); return `<div class="bc-q ${doneQ ? 'done' : ''}">${memo(ask)}${doneQ ? `<div class="al-good">${q.choice ? 'Correct.' : 'Correct: ' + esc(String(Math.round(q.ans(m, lg) * 100) / 100)) + ' ' + esc(q.unit || '')}</div>` + P(q.why(m, lg)) : (q.choice ? `<div class="bk-ctl">${q.choice.map((o) => `<button type="button" data-qchoice="${i}" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>` : `<div class="bk-ctl"><input type="number" step="any" data-qval="${i}" aria-label="Your answer"><span class="al-unit">${esc(q.unit || '')}</span><button type="button" class="primary" data-qcheck="${i}">Check</button></div>`) + (UI.msg && UI.msg.q === key ? `<p class="bc-fb">${P(UI.msg.lines)}</p>` : '')}</div>`; }).join('') + (qi < 0 ? `<div class="bk-ctl"><button type="button" class="primary" data-cont>Continue</button></div>` : '');
      } else if (sg.k === 'decide') body = memo(sg.ask(m)) + `<div class="bc-opts">${sg.options.map((o) => `<button type="button" class="bc-opt" data-decide="${o.id}"><b>${esc(o.label)}</b><span>${esc(String(o.text(m)).replace(/\{\{|\}\}/g, ''))}</span></button>`).join('')}</div>${UI.msg && UI.msg.d ? `<p class="bc-fb">${esc(UI.msg.d)}</p>` : ''}`;
      else if (sg.k === 'review') { const ready = sinceOk(lg, st, sg.after); body = ready ? memo(sg.body(lg, m, st).lines) + `<div class="bk-ctl"><button type="button" class="primary" data-finish>Close this paper</button></div>` : memo(['Manager, it is too soon to judge this one.', 'I will have the review ready after ' + (sg.after - (rounds(m.b) - (st.r0 || 0))) + ' more matchday' + ((sg.after - (rounds(m.b) - (st.r0 || 0))) === 1 ? '' : 's') + '. Play on and come back.']); }
    }
    return `<div class="bc-head"><button type="button" class="bc-back" data-case-list>← All board papers</button><div class="eyebrow">Board paper · ${esc(c.tag)}</div><h2>${esc(c.title)}</h2></div>${steps}<div class="bc-body">${body}</div>`;
  }

  FM.booksCases = {
    CASES, M, stateOf,
    html(lg, level) {
      LEVEL = level;
      try { return UI.open ? caseHtml(lg, CASES.find((x) => x.id === UI.open)) : listHtml(lg); }
      catch (e) { console.error('Board papers:', e); const was = UI.open; UI.open = null; return `<div class="card bk-card"><h3>This paper could not be opened</h3><p class="bk-lead">${esc((e && e.message) || 'Unknown error')}${was ? ' (paper: ' + esc(was) + ')' : ''}</p><div class="bk-ctl"><button type="button" data-case-list>Back to the list</button></div></div>`; }
    },
    reset() { UI.open = null; UI.msg = null; },
    bind(host, lg, redo, save) {
      host.querySelectorAll('[data-case]').forEach((b) => b.addEventListener('click', () => { UI.open = b.dataset.case; UI.msg = null; redo(); try { window.scrollTo(0, 0); } catch (e) { /* fine */ } }));
      host.querySelectorAll('[data-case-list]').forEach((b) => b.addEventListener('click', () => { UI.open = null; UI.msg = null; redo(); }));
      const c = UI.open && CASES.find((x) => x.id === UI.open); if (!c) return;
      const st = stateOf(lg, c.id), sg = c.stages[Math.min(st.s, c.stages.length - 1)];
      const m = () => { const mm = M(lg); mm.lg = lg; mm.wages = FM.bizInternals.wageBill(lg); const rev = FM.bizSeasonSum(lg, 'revenue'); mm.wagePct = rev ? 100 * mm.wages * mm.K.ROUNDS / (rev / Math.max(1, mm.b.ledger.length) * mm.K.ROUNDS) : 0; mm.net = mm.b.ledger.length ? FM.bizSeasonSum(lg, 'net') / Math.max(1, mm.b.ledger.length) * mm.K.ROUNDS : mm.K.PROFIT_TARGET; return mm; };
      const next = () => { st.s++; UI.msg = null; save && save(); redo(); };
      host.querySelectorAll('[data-cont]').forEach((b) => b.addEventListener('click', next));
      const answer = (i, good) => { const q = sg.qs[i], key = st.s + ':' + i; if (good) { st.q[key] = 1; UI.msg = null; } else { UI.msg = { q: key, lines: q.hint(m(), lg) }; } save && save(); redo(); };
      host.querySelectorAll('[data-qcheck]').forEach((b) => b.addEventListener('click', () => { const i = +b.dataset.qcheck, q = sg.qs[i], v = parseFloat(host.querySelector(`[data-qval="${i}"]`).value); if (!Number.isFinite(v)) return; answer(i, Math.abs(v - q.ans(m(), lg)) <= q.tol); }));
      host.querySelectorAll('[data-qchoice]').forEach((b) => b.addEventListener('click', () => { const i = +b.dataset.qchoice, q = sg.qs[i]; answer(i, b.dataset.v === q.ans(m(), lg)); }));
      host.querySelectorAll('[data-decide]').forEach((b) => b.addEventListener('click', () => {
        const o = sg.options.find((x) => x.id === b.dataset.decide), mm = m(), snap = sg.snap ? sg.snap(lg, mm) : {}, r = o.do(lg, mm);
        UI.msg = { d: r.text };
        if (r.ok) { st.choice = o.id; st.r0 = rounds(mm.b); st.snap = snap; st.s++; UI.msg = { d: r.text }; }
        save && save(); redo();
      }));
      host.querySelectorAll('[data-finish]').forEach((b) => b.addEventListener('click', () => { st.done = true; UI.msg = null; save && save(); redo(); }));
    },
  };
  FM.booksLearnCss = (FM.booksLearnCss || '') + (FM.booksCases.css = `
    .bc-memo .bk-term, .bc-body .bk-term, .bc-chips .bk-term, .bc-head .bk-term { display: inline; width: auto; min-height: 0; height: auto; padding: 0 1px; margin: 0; border: 0; border-bottom: 1px dashed var(--gold); border-radius: 0; background: transparent; box-shadow: none; color: var(--gold); font: inherit; letter-spacing: normal; text-transform: none; cursor: pointer; text-align: left; line-height: inherit; }
    .bc-body .bk-ctl input[type=number] { width: 8rem; padding: 8px 10px; background: #2f3533; color: var(--cream); border: 1px solid var(--line); font: inherit; min-height: 0; } .bc-body .bk-ctl { align-items: center; }
    .bc-head { display: grid; gap: 6px; margin-bottom: 14px; } .bc-head h2 { margin: 0; font-size: 1.5rem; } .bc-back { justify-self: start; background: none; border: 0; color: var(--gold); cursor: pointer; padding: 0; font: inherit; }
    .bc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .bc-card { text-align: left; display: grid; gap: 6px; padding: 14px 16px; background: rgba(255,255,255,.03); border: 1px solid var(--line); cursor: pointer; } .bc-card:hover { border-color: var(--gold); } .bc-card.done { border-color: #7fd49a; }
    .bc-tag { font-size: .7rem; letter-spacing: .1em; text-transform: uppercase; color: var(--gold); } .bc-card b { font-size: 1rem; line-height: 1.3; } .bc-meta { font-size: .8rem; opacity: .7; }
    .bc-bar { height: 8px; background: rgba(255,255,255,.08); } .bc-bar i { display: block; height: 100%; background: var(--gold); } .bc-chips { display: flex; flex-wrap: wrap; gap: 4px 10px; padding-top: 8px; }
    .bc-steps { list-style: none; margin: 0 0 14px; padding: 0; display: flex; gap: 8px; flex-wrap: wrap; } .bc-steps li { padding: 5px 12px; border: 1px solid var(--line); font-size: .78rem; opacity: .6; } .bc-steps li.on { opacity: 1; border-color: var(--gold); color: var(--gold); } .bc-steps li.done { opacity: 1; border-color: #7fd49a; color: #7fd49a; }
    .bc-body { display: grid; gap: 14px; } .bc-memo { border: 1px solid var(--line); padding: 16px 18px; display: grid; gap: 8px; background: rgba(255,255,255,.025); } .bc-memo p, .bc-body p { margin: 0 0 4px; line-height: 1.65; } .bc-from { font-size: .8rem; opacity: .75; border-bottom: 1px solid var(--line); padding-bottom: 6px; } .bc-from b { color: var(--gold); margin-right: 6px; }
    .bc-q { display: grid; gap: 8px; } .bc-q.done .bc-memo { opacity: .75; } .bc-fb { color: #f2c14e; } .bc-opts { display: grid; gap: 10px; } .bc-opt { text-align: left; display: grid; gap: 3px; padding: 12px 14px; background: rgba(255,255,255,.03); border: 1px solid var(--line); cursor: pointer; } .bc-opt:hover { border-color: var(--gold); } .bc-opt span { font-size: .85rem; opacity: .75; }
  `);
})();
