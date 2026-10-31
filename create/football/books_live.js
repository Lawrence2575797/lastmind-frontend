// The Books, tied to the real club: for a topic in the Business course, a card that works from the club's own figures and one of its real controls
// (marketing, ticket prices, stands, loans, shares, dividend), so the idea is met as a decision at Ashford Rovers before it is met as a definition.
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const gbp2 = (n) => '£' + n.toFixed(2), gbp = (n) => FM.gbp(n), num = (n) => Math.round(n).toLocaleString('en-GB'), pc = (n, d) => (n >= 0 ? '' : '−') + Math.abs(n).toFixed(d == null ? 1 : d) + '%';
  const AX = 'stroke="rgba(244,237,218,.35)" stroke-width="1"', TXT = 'fill="rgba(244,237,218,.8)" font-family="Arial,sans-serif" font-size="11"';
  let MSG = null, LEVEL = 'gcse';
  const t = (name) => (FM.booksLearn && FM.booksLearn.termBtn ? FM.booksLearn.termBtn(name, LEVEL) : esc(name));

  // ---------- the club's numbers, read once ----------
  function facts(lg) {
    const b = FM.biz(lg), I = FM.bizInternals, K = FM.bizConst, cap = FM.bizCapacity(lg);
    const past = b.ledger.filter((e) => e.home).slice(-4);
    const att = past.length ? past.reduce((a, e) => a + e.attTotal, 0) / past.length : Math.round(cap * 0.75);
    const turned = past.length ? past.reduce((a, e) => a + (e.away || 0), 0) / past.length : 0;
    const avgTicket = FM.SEGMENTS.reduce((a, s) => a + (b.seats[s.id] || s.seats) * b.prices[s.id].price, 0) / Math.max(1, cap);
    const away = I.lines(lg, null, false, true), other = away.inflow.broadcast + away.inflow.sponsor + away.inflow.advert;
    const roundFixed = away.outflow.wages + away.outflow.marketing + away.outflow.admin + away.outflow.interest + I.depPerRound(b);
    const fixedMatch = 2 * roundFixed + K.RUN_FIXED;   // a home match comes every second round, so it carries two rounds of the standing costs
    return { b, I, K, cap, att, turned, avgTicket, other, roundFixed, fixedMatch, revHead: avgTicket + K.SPEND_PER_HEAD, varHead: K.RUN_PER_HEAD, netFixed: Math.max(0, fixedMatch - 2 * other) };
  }
  const card = (key, title, lead, body, why) => `<div class="card bk-card bk-live" data-card="${key}"><div class="eyebrow">At Ashford Rovers</div><h3>${title}</h3><p class="bk-lead">${lead}</p>${MSG && MSG.key === key ? `<p class="banner ${MSG.ok ? 'ok' : ''}" role="status">${esc(MSG.text)}</p>` : ''}${body}${why ? `<p class="bk-why">${why}</p>` : ''}</div>`;
  const table = (head, rows) => `<div class="tablewrap"><table class="data"><thead><tr>${head.map((h, i) => `<th${i ? '' : ' class="l"'}>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td${i ? '' : ' class="l"'}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const ctl = (inputs, action, label, key) => `<div class="bk-ctl">${inputs}<button type="button" class="ctl-go" data-live="${action}" data-card-key="${key}">${label}</button></div>`;
  const inp = (k, label, v, step, min) => `<label class="bk-in"><span>${label}</span><input type="number" data-k="${k}" value="${v}" step="${step}" min="${min}"></label>`;
  const optsOf = (id, k, lg) => { const C = FM.controls; return (C.optionsFor(lg, C.ACTIONS[id].params.find((x) => x.k === k)) || []).map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join(''); };

  // ---------- marketing: the advertising economy of scale ----------
  function wMarketing(lg) {
    const f = facts(lg), m = f.b.marketing || 0, ex = m || 10000, up = (x) => 100 * 0.1 * Math.log(1 + x / 5000);
    const dm = ex, extra = Math.min(f.cap - f.att, f.att * (Math.exp((up(ex + dm) - up(ex)) / 10) - 1) + 0), gainSeats = Math.max(0, Math.round(f.att * (0.1 * Math.log(1 + (ex + dm) / 5000) - 0.1 * Math.log(1 + ex / 5000))));
    const gainRev = Math.min(gainSeats, f.cap - f.att) * f.revHead, cost = 2 * dm;
    const rows = [0.6, 0.8, 1, 1.25, 1.5].map((k) => { const c = Math.min(f.att * k, 99999); return [num(c) + (k === 1 ? ' (now)' : ''), gbp2(2 * ex / c), k === 1 ? 'the crowd the club has been getting' : k < 1 ? 'a smaller club carries the same campaign over fewer fans' : 'a bigger crowd spreads it thinner']; });
    return card('mkt', 'Advertising and its economy of scale', `The club spends ${gbp(m)} a matchday on marketing. A campaign costs about the same whether the crowd is 6,000 or 12,000, so the bigger the crowd, the less each spectator costs to win.`,
      table(['Crowd', `Marketing per spectator at ${gbp(ex)} a matchday`, 'What it shows'], rows) +
      `<p>At ${gbp(ex)} a matchday, promotion lifts demand by about <b>${up(ex).toFixed(1)}%</b>. Doubling it to ${gbp(2 * ex)} lifts it to <b>${up(2 * ex).toFixed(1)}%</b>: another ${gbp(cost)} per home match buys about <b>${num(gainSeats)}</b> more spectators, worth <b>${gbp(gainRev)}</b>. Each extra pound does less than the one before.</p>` +
      ctl(inp('perRound', 'Marketing a matchday (£)', m, 500, 0), 'setMarketing', 'Set the budget', 'mkt'),
      `This is a ${t('Marketing economies of scale')} case: spending on the ${t('Promotional mix')} is a ${t('Fixed costs')} that a large club spreads over more fans, and a large club can also buy advertising at lower rates. Whether to spend more is decided by the return on it: ${t('Return on marketing spend')}.`);
  }

  // ---------- ticket prices: elasticity worked out from the real demand ----------
  function wPrice(lg) {
    const b = FM.biz(lg), fx = FM.nextUserFixture ? FM.nextUserFixture(lg) : null; if (!fx) return '';
    const base = FM.bizDemand(lg, fx), rows = [];
    FM.SEGMENTS.forEach((s) => {
      const p = b.prices[s.id].price, p2 = p * 1.1; b.prices[s.id].price = p2; const d2 = FM.bizDemand(lg, fx); b.prices[s.id].price = p;
      const w1 = base.rows[s.id].wanted, w2 = d2.rows[s.id].wanted, ped = ((w2 - w1) / Math.max(1, w1)) / 0.1, r1 = base.rows[s.id].revenue, r2 = d2.rows[s.id].revenue;
      rows.push([esc(s.name), '£' + p, num(w1), num(base.rows[s.id].seats) + (w1 > base.rows[s.id].seats ? ' (full, ' + num(w1 - base.rows[s.id].seats) + ' turned away)' : ''), '<b>' + ped.toFixed(2) + '</b> ' + (Math.abs(ped) > 1 ? 'elastic' : 'inelastic'), (r2 - r1 >= 0 ? '+' : '−') + gbp(Math.abs(r2 - r1)).replace(/[()]/g, '')]);
    });
    return card('price', 'Ticket prices and price elasticity of demand', 'For the next home match, the demand at today\'s prices, and what happens to it if each stand\'s price rises by 10%.',
      table(['Stand', 'Price', 'Fans wanting a ticket', 'Seats', 'Price elasticity of demand', 'Ticket revenue if +10%'], rows) +
      ctl(`<label class="bk-in"><span>Stand</span><select data-k="stand">${optsOf('setTicketPrice', 'stand', lg)}</select></label>${inp('price', 'New price (£)', 25, 1, 3)}`, 'setTicketPrice', 'Set the price', 'price'),
      `${t('Price elasticity of demand')} = % change in demand ÷ % change in price. Below 1 (inelastic) a price rise raises revenue; above 1 (elastic) it lowers it. A full stand with fans turned away says the price is too low: that is where ${t('Price discrimination')} and ${t('Pricing strategies')} come in.`);
  }

  // ---------- the cost per spectator: unit costs and economies of scale ----------
  function wScale(lg) {
    const f = facts(lg), W = 420, H = 210, ml = 48, mb = 30, maxC = Math.max(f.cap * 1.25, f.att * 1.3), cost = (c) => (f.fixedMatch + f.varHead * c) / c, lo = cost(maxC), hi = cost(maxC * 0.18), X = (c) => ml + c / maxC * (W - ml - 12), Y = (v) => H - mb - (v - lo * 0.8) / (hi - lo * 0.8) * (H - mb - 14);
    let pts = ''; for (let i = 0; i <= 40; i++) { const c = maxC * (0.18 + 0.82 * i / 40); pts += X(c).toFixed(1) + ',' + Y(cost(c)).toFixed(1) + ' '; }
    const svg = `<svg class="bk-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Average cost per spectator"><line x1="${ml}" y1="${H - mb}" x2="${W - 8}" y2="${H - mb}" ${AX}/><line x1="${ml}" y1="10" x2="${ml}" y2="${H - mb}" ${AX}/><polyline points="${pts}" fill="none" stroke="#e78078" stroke-width="2.6"/><circle cx="${X(f.att)}" cy="${Y(cost(f.att))}" r="5" fill="#fff"/><text x="${X(f.att)}" y="${Y(cost(f.att)) - 9}" text-anchor="middle" ${TXT}>now ${gbp2(cost(f.att))}</text><line x1="${X(f.cap)}" y1="14" x2="${X(f.cap)}" y2="${H - mb}" stroke="rgba(215,184,107,.7)" stroke-dasharray="4 3"/><text x="${X(f.cap) - 4}" y="24" text-anchor="end" ${TXT}>stadium full: ${num(f.cap)}</text><text x="${(ml + W) / 2}" y="${H - 8}" text-anchor="middle" ${TXT}>spectators at a home match</text><text x="12" y="${H / 2 - 10}" transform="rotate(-90 12 ${H / 2 - 10})" text-anchor="middle" ${TXT}>cost per spectator (£)</text></svg>`;
    const room = FM.SEGMENTS.find((s) => FM.bizBuild.standRoom(lg, s.id) >= FM.EXPANSIONS[s.id].seats && !f.b.projects.some((p) => p.kind === 'stand' && p.stand === s.id)), e = room ? FM.EXPANSIONS[room.id] : null;
    const newCap = e ? f.cap + e.seats : f.cap;
    return card('scale', 'Unit costs and economies of scale', `At a home match the club pays ${gbp(f.fixedMatch)} whatever the crowd (wages, administration, interest, depreciation, running the ground) and ${gbp(f.varHead)} for each spectator. The average cost of each one falls as the crowd grows.`,
      `<div class="bk-two"><div>${svg}</div><div>${table(['', 'Crowd', 'Cost per spectator'], [['Now', num(f.att), gbp2(cost(f.att))], ['Stadium full', num(f.cap), gbp2(cost(f.cap))], e ? [`With ${num(e.seats)} more ${esc(room.name.toLowerCase())} seats`, num(newCap), gbp2(cost(newCap))] : ['Every stand is at its limit', '', '']])}${e ? ctl('', 'buildStand', `Add ${num(e.seats)} seats (${gbp(e.seats * e.perSeat)})`, 'scale').replace('data-live="buildStand"', `data-live="buildStand" data-fix='{"stand":"${room.id}"}'`) : ''}</div></div>`,
      `${t('Fixed costs')} do not change with output; ${t('Variable costs')} do. Spreading the fixed costs over more output lowers ${t('Unit costs')}: that is ${t('Economies of scale')}. The limit here is the ${t('Capacity utilisation')}: once the ground is full the club cannot sell more, so it must build, which is ${t('Capital expenditure')}.`);
  }

  // ---------- finance: loan or shares ----------
  function financeTable(lg, amt, term) {
    const b = FM.biz(lg), bal = FM.bizBalance(lg), opt = FM.bizSources.loanOptions.find((o) => o.term === term) || FM.bizSources.loanOptions[0], capEmp = bal.assets - bal.overdraft;
    const gear = (l, c) => (c > 0 ? 100 * l / c : 0), add = Math.round(amt / b.shares.price), dil = 100 * add / (b.shares.issued + add);
    return table(['', 'Gearing afterwards', 'Interest in the first season', 'Existing owners', 'Repaid?'], [
      ['Now', pc(gear(bal.loans, capEmp)), gbp(b.loans.reduce((a, l) => a + l.balance * l.rate, 0)), '100% of their holding', ''],
      [`Borrow ${gbp(amt)}`, pc(gear(bal.loans + amt, capEmp + amt)), gbp(amt * opt.rate), 'unchanged', `yes, with interest at ${(opt.rate * 100).toFixed(1)}%`],
      [`Issue ${gbp(amt)} of shares`, pc(gear(bal.loans, capEmp + amt)), '£0 (a dividend may be asked for)', `diluted by ${dil.toFixed(1)}%`, 'never']]);
  }
  function wFinance(lg) {
    const b = FM.biz(lg), bal = FM.bizBalance(lg);
    return card('fin', 'Raising finance: a loan or a share issue', `The club has ${gbp(b.cash)} in the bank, owes ${gbp(bal.loans)} on loans and has ${num(b.shares.issued)} shares in issue at £${b.shares.price.toFixed(2)}. Change the amount to compare the two ways of raising it.`,
      `<div class="bk-ctl">${inp('amount', 'Amount (£)', 500000, 50000, 100000)}<label class="bk-in"><span>Repay over</span><select data-k="term">${optsOf('takeLoan', 'term', lg)}</select></label></div><div id="bkFinTable">${financeTable(lg, 500000, FM.bizSources.loanOptions[0].term)}</div><div class="bk-ctl"><button type="button" class="ctl-go" data-live="takeLoan" data-card-key="fin" data-scope="fin">Borrow it</button><button type="button" class="ctl-go" data-live="issueShares" data-card-key="fin" data-scope="fin">Issue shares for it</button></div>`,
      `${t('Gearing')} = loans ÷ capital employed × 100. A ${t('Loan')} keeps ownership but adds interest and raises gearing; a ${t('Share issue')} adds no interest but ${t('Dilution of ownership')} makes the existing shareholders hold less. The right choice depends on ${t('Choosing finance')}.`);
  }

  // ---------- signings: how a fee reaches profit ----------
  function wSigning(lg) {
    const b = FM.biz(lg), I = FM.bizInternals, mine = b.signings.filter((s) => !s.sold), net = FM.bizSeasonSum(lg, 'net');
    const dSeason = b.ledger.filter((e) => e.season === lg.season).reduce((a, e) => a + (e.depSign || 0), 0), feesNow = b.signings.filter((s) => s.season === lg.season).reduce((a, s) => a + s.fee, 0);
    const rows = mine.slice(-6).map((s) => [esc(s.name), gbp(s.fee), s.years + ' years', gbp(s.fee / s.years), gbp(s.book)]);
    return card('sign', 'Signing a player: capital expenditure, then a charge to profit', 'A transfer fee is paid in cash at once, but it buys something that lasts the length of the contract, so profit is charged a share each matchday and the rest stays on the balance sheet as an asset.',
      (rows.length ? table(['Signing', 'Fee paid', 'Contract', 'Charged to profit each season', 'Still on the balance sheet'], rows) : '<p class="bk-why">No signings yet. A £10m player on a 4-year contract takes £10m from the bank on the day, charges £2.5m a season to profit, and is worth £7.5m on the balance sheet after the first season.</p>') +
      `<p>This season: ${gbp(dSeason)} of signing fees has been written off against profit, so profit for the year to date is <b>${gbp(net)}</b>. Had every fee paid this season (${gbp(feesNow)}) been charged at once, it would be <b>${gbp(net + dSeason - feesNow)}</b>, while cash would be the same either way.</p><div class="bk-ctl"><button type="button" class="ctl-go" data-golive="recruit">Open Recruitment</button></div>`,
      `Buying a player is ${t('Capital expenditure')}, not ${t('Revenue expenditure')}. ${t('Depreciation')} spreads the cost over the useful life, so ${t('Profit')} and ${t('Cash flow')} tell different stories: a big signing hurts the bank balance immediately and profit slowly.`);
  }

  // ---------- wages ----------
  function wWages(lg) {
    const f = facts(lg), I = f.I, wk = I.wageBill(lg), season = wk * f.K.ROUNDS, rows = f.b.ledger.filter((e) => e.season === lg.season), rev = rows.length ? rows.reduce((a, e) => a + e.pl.revenue, 0) / rows.length * f.K.ROUNDS : 0, ratio = rev ? 100 * season / rev : 0;
    const top = FM.teamById(lg, lg.userId).squad.slice().sort((a, b) => FM.wageOf(b) - FM.wageOf(a)).slice(0, 5);
    return card('wage', 'Pay and motivation: the wage bill', `The squad costs ${gbp(wk)} a week, ${gbp(season)} a season${rev ? `, which is ${ratio.toFixed(0)}% of this season's projected revenue (the board's guide is 65%)` : ''}.`,
      table(['Highest paid', 'Wage a week'], top.map((p) => [esc(p.name), gbp(FM.wageOf(p) * 1000)])) + `<div class="bk-ctl"><button type="button" class="ctl-go" data-golive="squad">Open the Squad</button><button type="button" class="ctl-go" data-golive="recruit">Open Recruitment</button></div>`,
      `Pay is a ${t('Financial motivators')} and, in ${t('Herzberg')}'s terms, a hygiene factor: it stops dissatisfaction but does not on its own motivate. Wages are the club's biggest ${t('Fixed costs')}, so the wage-to-revenue ratio is the first thing to check in ${t('Labour costs')}.`);
  }

  // ---------- the dividend ----------
  function wDividend(lg) {
    const f = facts(lg), b = f.b, rows = b.ledger.filter((e) => e.season === lg.season), net = rows.length ? rows.reduce((a, e) => a + e.pl.net, 0) / rows.length * f.K.ROUNDS : f.K.PROFIT_TARGET, pol = b.dividend.policy || 0;
    const out = [0, 0.2, 0.4, 0.6].concat(pol && [0, 0.2, 0.4, 0.6].indexOf(pol) < 0 ? [pol] : []).sort((a, c) => a - c).map((p) => [Math.round(p * 100) + '%' + (p === pol ? ' (now)' : ''), gbp(Math.max(0, net * p)), '£' + (Math.max(0, net * p) / b.shares.issued).toFixed(3), gbp(Math.max(0, net * (1 - p)))]);
    return card('div', 'Dividends and retained profit', `If the year ends with a profit after tax of about ${gbp(net)}, the policy decides how much is paid to the ${num(b.shares.issued)} shareholders and how much the club keeps. Shareholders hope for about ${Math.round(f.K.EXPECTED_DIVIDEND * 100)}%.`,
      table(['Payout', 'Dividend paid', 'Per share', 'Retained for the club'], out) + ctl(inp('percent', 'Dividend (% of profit)', Math.round(pol * 100), 5, 0), 'setDividend', 'Set the dividend', 'div'),
      `${t('Dividends')} are a share of ${t('Profit')} paid to ${t('Shareholders')}; what is not paid becomes ${t('Retained profit')} for growth. Paying more pleases the pension fund and lowers the cash for the stand the supporters' trust wants: the ${t('Shareholder versus stakeholder view')} in a single control.`);
  }

  // ---------- investment appraisal on a stand ----------
  function wInvest(lg) {
    const f = facts(lg), b = f.b, K = f.K, home = K.ROUNDS / 2, rows = [];
    FM.SEGMENTS.forEach((s) => {
      const e = FM.EXPANSIONS[s.id], room = FM.bizBuild.standRoom(lg, s.id), busy = b.projects.some((p) => p.kind === 'stand' && p.stand === s.id); if (room < e.seats || busy) return;
      const cost = e.seats * e.perSeat, extra = Math.min(e.seats, f.turned), price = b.prices[s.id].price, perMatch = extra * (price + K.SPEND_PER_HEAD - K.RUN_PER_HEAD), yr = perMatch * home, pay = yr > 0 ? cost / yr : null;
      const npv = (() => { let v = -cost; for (let y = 1; y <= 10; y++) v += yr / Math.pow(1.08, y); return v; })();
      rows.push([esc(s.name), num(e.seats), gbp(cost), num(extra), gbp(yr), pay ? pay.toFixed(1) + ' years' : 'never', yr > 0 ? pc(100 * yr / cost) : '–', gbp(npv), `<button type="button" class="ctl-go" data-live="buildStand" data-card-key="inv" data-fix='{"stand":"${s.id}"}'>Build</button>`]);
    });
    return card('inv', 'Investment appraisal: is a new stand worth building?', `Fans turned away at home matches (${num(f.turned)} a match on average lately) are the only extra crowd a new stand could serve. Only the seats they would fill earn money; empty seats earn none.`,
      rows.length ? table(['Stand', 'Seats', 'Cost', 'Extra spectators a match', 'Net return a season', 'Payback', 'Average rate of return', 'Net present value (10 years, 8%)', ''], rows) : '<p class="bk-why">Every stand is at its limit or already being built.</p>',
      `${t('Payback period')} = cost ÷ net return a year. ${t('Average rate of return')} = average annual profit ÷ cost × 100. ${t('Net present value')} discounts each year's return, because money later is worth less than money now. All three are ${t('Investment appraisal')}; they also decide ${t('Organic growth')}.`);
  }

  // ---------- which topics get which cards ----------
  const MAP = {
    gcse: { '1.3': ['scale'], '1.4': ['dividend'], '2.1': ['invest'], '2.2': ['price', 'marketing'], '2.3': ['scale'], '2.4': ['signing'], '2.5': ['wages'] },
    alevel: { '1.2': ['price'], '1.3': ['marketing', 'price'], '1.4': ['wages'], '2.1': ['finance', 'invest'], '2.3': ['signing', 'dividend'], '2.4': ['scale'], '3.2': ['marketing', 'invest'], '3.3': ['invest'], '3.4': ['dividend'], '3.5': ['signing'] },
  };
  const BUILD = { price: wPrice, marketing: wMarketing, scale: wScale, finance: wFinance, signing: wSigning, wages: wWages, dividend: wDividend, invest: wInvest };

  // the break-even chart opens on the club's own figures
  function beSeed(lg) { const f = facts(lg); return { price: Math.round(f.revHead * 100) / 100, vc: f.varHead, fc: Math.round(f.netFixed / 1000) * 1000, att: Math.round(f.att / 100) * 100 }; }

  FM.booksLive = {
    beSeed, facts, card, ctl, inp, table, optsOf, wPrice, wMarketing, wScale, wFinance, wSigning, wWages, wDividend, wInvest,
    has(level, id) { return !!(MAP[level] && MAP[level][id]); },
    html(lg, level, id) {
      LEVEL = level;
      return ((MAP[level] || {})[id] || []).map((k) => { try { return BUILD[k](lg); } catch (e) { return ''; } }).join('');
    },
    bind(host, lg, redo, save, go) {
      host.querySelectorAll('[data-golive]').forEach((b) => b.addEventListener('click', () => go && go(b.dataset.golive)));
      host.querySelectorAll('[data-live]').forEach((btn) => btn.addEventListener('click', () => {
        const id = btn.dataset.live, scope = btn.closest('.bk-ctl'), cardEl = btn.closest('.bk-live'), params = {};
        if (btn.dataset.fix) Object.assign(params, JSON.parse(btn.dataset.fix));
        (btn.dataset.scope ? cardEl : scope).querySelectorAll('[data-k]').forEach((x) => { params[x.dataset.k] = x.value; });
        const sure = { takeLoan: 'Take this loan?', issueShares: 'Issue these shares?', buildStand: 'Start building?' }[id];
        if (sure && !window.confirm(sure)) return;
        const r = FM.controls.run(lg, id, params, 'manual');
        MSG = { key: btn.dataset.cardKey || (cardEl && cardEl.dataset.card), ok: !!r.ok, text: r.text };
        save && save(); redo();
      }));
      const fin = host.querySelector('[data-card="fin"]');
      if (fin) fin.querySelectorAll('[data-k]').forEach((x) => x.addEventListener('input', () => {
        const amt = Math.max(100000, +fin.querySelector('[data-k="amount"]').value || 0), term = +fin.querySelector('[data-k="term"]').value;
        fin.querySelector('#bkFinTable').innerHTML = financeTable(lg, amt, term);
      }));
    },
  };
})();
