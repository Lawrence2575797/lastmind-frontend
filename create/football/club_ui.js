// The Board: the shareholders, the matchday market, the books, the sources of finance and the commercial deals. It never explains the business
// ideas; it shows the numbers a company would see, laid out as a company's accounts are, and leaves the reading to the manager (the LastMind AI
// Agent explains an idea when it is asked).
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const st = { tab: 'overview', books: 'cash' };
  const gbp = (n) => FM.gbp(n), num = (n) => Math.round(n).toLocaleString('en-GB');
  const cell = (n) => `<td class="n${n < 0 ? ' neg' : ''}">${n === 0 ? '–' : gbp(n)}</td>`;
  const pct = (a, b) => (b ? Math.round(1000 * a / b) / 10 + '%' : '–');
  const ord = (n) => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) || n % 10 > 3 ? 0 : n % 10]);
  const meter = (label, value, sub) => `<div class="approval-line"><span><b>${esc(label)}</b><small>${esc(FM.approvalBand(value))}${sub ? ' · ' + esc(sub) : ''}</small></span><div class="approval-track"><i style="width:${Math.max(0, Math.min(100, value))}%"></i></div><strong>${Math.round(value)}%</strong></div>`;

  // ---------- the books: tables laid out as a company's accounts are ----------
  const CF_IN = [['tickets', 'Ticket sales'], ['matchday', 'Food, drink and programmes'], ['broadcast', 'Broadcasting rights'], ['sponsor', 'Sponsorship'], ['advert', 'Advertising boards'], ['merch', 'Merchandise'], ['sales', 'Sale of players'], ['loans', 'Bank loans received'], ['shares', 'Shares issued']];
  const CF_OUT = [['wages', 'Wages'], ['matchday', 'Matchday running costs'], ['merchCost', 'Cost of merchandise'], ['marketing', 'Marketing'], ['admin', 'Stadium and administration'], ['fees', 'Transfer fees paid'], ['loanPay', 'Loan repayments'], ['interest', 'Interest paid'], ['tax', 'Corporation tax']];
  FM.bizCashFlowHtml = function (lg) {
    const cols = FM.bizCashFlow(lg), tot = (key, grp) => cols.reduce((a, c) => a + (c[grp][key] || 0), 0);
    const head = `<tr><th class="l">Cash flow forecast</th>${cols.map((c) => `<th class="${c.actual ? '' : 'fc'}">${c.round}${c.actual ? '' : '<br><small>forecast</small>'}</th>`).join('')}<th>Season</th></tr>`;
    const row = (label, key, grp) => `<tr><td class="l">${label}</td>${cols.map((c) => cell(c[grp][key] || 0).replace('<td class="n', '<td class="n' + (c.actual ? '' : ' fc'))).join('')}${cell(tot(key, grp))}</tr>`;
    const totalRow = (label, f) => `<tr class="tot"><td class="l">${label}</td>${cols.map((c) => `<td class="n${f(c) < 0 ? ' neg' : ''}${c.actual ? '' : ' fc'}">${gbp(f(c))}</td>`).join('')}<td class="n${cols.reduce((a, c) => a + f(c), 0) < 0 ? ' neg' : ''}">${gbp(cols.reduce((a, c) => a + f(c), 0))}</td></tr>`;
    const inSum = (c) => CF_IN.reduce((a, [k]) => a + (c.inflow[k] || 0), 0), outSum = (c) => CF_OUT.reduce((a, [k]) => a + (c.outflow[k] || 0), 0);
    const body = `<tr class="sec"><td class="l" colspan="${cols.length + 2}">Cash inflows</td></tr>${CF_IN.map(([k, l]) => row(l, k, 'inflow')).join('')}${totalRow('Total cash inflows', inSum)}
      <tr class="sec"><td class="l" colspan="${cols.length + 2}">Cash outflows</td></tr>${CF_OUT.map(([k, l]) => row(l, k, 'outflow')).join('')}${totalRow('Total cash outflows', outSum)}
      ${totalRow('Net cash flow', (c) => inSum(c) - outSum(c))}
      <tr><td class="l">Opening balance</td>${cols.map((c) => `<td class="n${c.opening < 0 ? ' neg' : ''}${c.actual ? '' : ' fc'}">${gbp(c.opening)}</td>`).join('')}<td class="n">${cols.length ? gbp(cols[0].opening) : ''}</td></tr>
      <tr class="tot"><td class="l">Closing balance</td>${cols.map((c) => `<td class="n${c.closing < 0 ? ' neg' : ''}${c.actual ? '' : ' fc'}">${gbp(c.closing)}</td>`).join('')}<td class="n${cols.length && cols[cols.length - 1].closing < 0 ? ' neg' : ''}">${cols.length ? gbp(cols[cols.length - 1].closing) : ''}</td></tr>`;
    return `<div class="books-wrap"><table class="books-table"><thead>${head}</thead><tbody>${body}</tbody></table></div><p class="note">Columns are matchdays. Shaded columns are forecasts from today's prices, wages, deals and loans. Brackets are negative figures.</p>`;
  };

  function seasonTotals(lg) {
    const b = FM.biz(lg), rows = b.ledger.filter((e) => e.season === lg.season);
    const t = {}; rows.forEach((e) => { Object.keys(e.pl).forEach((k) => { t[k] = (t[k] || 0) + e.pl[k]; }); });
    const sumIn = (k) => rows.reduce((a, e) => a + (e.inflow[k] || 0), 0), sumOut = (k) => rows.reduce((a, e) => a + (e.outflow[k] || 0), 0);
    return { rows, t, sumIn, sumOut, dep: rows.reduce((a, e) => a + (e.dep || 0), 0) };
  }
  FM.bizProfitHtml = function (lg) {
    const { rows, t, sumIn, sumOut, dep } = seasonTotals(lg), last = rows[rows.length - 1];
    if (!rows.length) return '<p class="note">The accounts start with the first matchday.</p>';
    const L = last ? last.pl : null;
    const line = (label, season, lastv, cls) => `<tr class="${cls || ''}"><td class="l">${label}</td>${cell(season)}${cell(lastv == null ? 0 : lastv)}</tr>`;
    const rev = [['Ticket sales', sumIn('tickets'), last.inflow.tickets], ['Food, drink and programmes', sumIn('matchday'), last.inflow.matchday], ['Broadcasting rights', sumIn('broadcast'), last.inflow.broadcast], ['Sponsorship', sumIn('sponsor'), last.inflow.sponsor], ['Advertising boards', sumIn('advert'), last.inflow.advert], ['Merchandise', sumIn('merch'), last.inflow.merch]];
    const html = `<div class="books-wrap"><table class="books-table"><thead><tr><th class="l">Income statement</th><th>Season to date</th><th>Last matchday</th></tr></thead><tbody>
      <tr class="sec"><td class="l" colspan="3">Revenue</td></tr>${rev.map((r) => line(r[0], r[1], r[2])).join('')}${line('Total revenue', t.revenue, L.revenue, 'tot')}
      <tr class="sec"><td class="l" colspan="3">Cost of sales</td></tr>${line('Matchday running costs', sumOut('matchday'), last.outflow.matchday)}${line('Cost of merchandise', sumOut('merchCost'), last.outflow.merchCost)}${line('Total cost of sales', t.cos, L.cos, 'tot')}
      ${line('Gross profit', t.gross, L.gross, 'tot key')}
      <tr class="sec"><td class="l" colspan="3">Expenses</td></tr>${line('Wages', sumOut('wages'), last.outflow.wages)}${line('Marketing', sumOut('marketing'), last.outflow.marketing)}${line('Stadium and administration', sumOut('admin'), last.outflow.admin)}${line('Depreciation of signings', dep, last.dep)}${line('Total expenses', t.expenses, L.expenses, 'tot')}
      ${t.saleProfit ? line('Profit on sale of players', t.saleProfit, L.saleProfit) : ''}
      ${line('Operating profit', t.op, L.op, 'tot key')}
      ${line('Interest paid', -t.interest, -L.interest)}
      ${line('Profit before tax', t.pbt, L.pbt, 'tot key')}
      ${line('Corporation tax', -t.tax, -L.tax)}
      ${line('Profit for the year', t.net, L.net, 'tot key')}
      </tbody></table></div>
      <div class="books-wrap"><table class="books-table calc"><thead><tr><th class="l">The calculations</th><th class="l">Working</th><th>Result</th></tr></thead><tbody>
      <tr><td class="l">Gross profit</td><td class="l">revenue − cost of sales = ${gbp(t.revenue)} − ${gbp(t.cos)}</td>${cell(t.gross)}</tr>
      <tr><td class="l">Operating profit</td><td class="l">gross profit − expenses${t.saleProfit ? ' + profit on sale of players' : ''} = ${gbp(t.gross)} − ${gbp(t.expenses)}${t.saleProfit ? ' + ' + gbp(t.saleProfit) : ''}</td>${cell(t.op)}</tr>
      <tr><td class="l">Profit before tax</td><td class="l">operating profit − interest = ${gbp(t.op)} − ${gbp(t.interest)}</td>${cell(t.pbt)}</tr>
      <tr><td class="l">Profit for the year</td><td class="l">profit before tax − tax = ${gbp(t.pbt)} − ${gbp(t.tax)}</td>${cell(t.net)}</tr>
      <tr><td class="l">Gross profit margin</td><td class="l">gross profit ÷ revenue × 100 = ${gbp(t.gross)} ÷ ${gbp(t.revenue)} × 100</td><td class="n">${pct(t.gross, t.revenue)}</td></tr>
      <tr><td class="l">Net profit margin</td><td class="l">profit for the year ÷ revenue × 100 = ${gbp(t.net)} ÷ ${gbp(t.revenue)} × 100</td><td class="n">${pct(t.net, t.revenue)}</td></tr>
      </tbody></table></div>`;
    return html;
  };

  function costsHtml(lg) {
    const { rows, t, sumIn, sumOut, dep } = seasonTotals(lg);
    if (!rows.length) return '<p class="note">Nothing to break down until a matchday has been played.</p>';
    const rev = [['Ticket sales', sumIn('tickets')], ['Food, drink and programmes', sumIn('matchday')], ['Broadcasting rights', sumIn('broadcast')], ['Sponsorship', sumIn('sponsor')], ['Advertising boards', sumIn('advert')], ['Merchandise', sumIn('merch')]];
    const fixed = [['Wages', sumOut('wages')], ['Stadium and administration', sumOut('admin')], ['Marketing', sumOut('marketing')], ['Depreciation of signings', dep], ['Interest', t.interest]];
    const variable = [['Matchday running costs', sumOut('matchday')], ['Cost of merchandise', sumOut('merchCost')]];
    const tf = fixed.reduce((a, r) => a + r[1], 0), tv = variable.reduce((a, r) => a + r[1], 0);
    const lines = (arr, total) => arr.map(([l, v]) => `<tr><td class="l">${l}</td>${cell(v)}<td class="n">${pct(v, total)}</td></tr>`).join('');
    // the break-even: how many people through the gate cover the fixed costs
    const home = rows.filter((e) => e.home), att = home.reduce((a, e) => a + e.attTotal, 0);
    const perHeadRev = att ? (sumIn('tickets') + sumIn('matchday')) / att : 0, perHeadVar = att ? sumOut('matchday') / att : 0, contribution = perHeadRev - perHeadVar;
    const fixedSeason = (sumOut('wages') + sumOut('admin') + sumOut('marketing') + dep + t.interest - sumIn('broadcast') - sumIn('sponsor') - sumIn('advert') - sumIn('merch') + sumOut('merchCost'));
    const be = contribution > 0 ? Math.max(0, fixedSeason / contribution) : 0;
    return `<div class="books-two"><div class="books-wrap"><table class="books-table"><thead><tr><th class="l">Revenue by source</th><th>Season to date</th><th>Share</th></tr></thead><tbody>${lines(rev, t.revenue)}<tr class="tot"><td class="l">Total revenue</td>${cell(t.revenue)}<td class="n">100%</td></tr></tbody></table></div>
      <div class="books-wrap"><table class="books-table"><thead><tr><th class="l">Costs by type</th><th>Season to date</th><th>Share</th></tr></thead><tbody>
        <tr class="sec"><td class="l" colspan="3">Fixed costs</td></tr>${lines(fixed, tf + tv)}<tr class="tot"><td class="l">Total fixed costs</td>${cell(tf)}<td class="n">${pct(tf, tf + tv)}</td></tr>
        <tr class="sec"><td class="l" colspan="3">Variable costs</td></tr>${lines(variable, tf + tv)}<tr class="tot"><td class="l">Total variable costs</td>${cell(tv)}<td class="n">${pct(tv, tf + tv)}</td></tr>
        <tr class="tot key"><td class="l">Total costs</td>${cell(tf + tv)}<td class="n">100%</td></tr></tbody></table></div></div>
      ${att ? `<div class="books-wrap"><table class="books-table calc"><thead><tr><th class="l">Matchday break-even (home matches so far)</th><th>Figure</th></tr></thead><tbody>
        <tr><td class="l">Average spend per supporter (tickets + food and drink)</td><td class="n">${gbp(perHeadRev)}</td></tr>
        <tr><td class="l">Variable cost per supporter</td><td class="n">${gbp(perHeadVar)}</td></tr>
        <tr><td class="l">Contribution per supporter</td><td class="n">${gbp(contribution)}</td></tr>
        <tr><td class="l">Fixed costs not covered by sponsors, TV and merchandise</td><td class="n${fixedSeason < 0 ? ' neg' : ''}">${gbp(fixedSeason)}</td></tr>
        <tr class="tot"><td class="l">Break-even attendance over the season (fixed ÷ contribution)</td><td class="n">${num(be)} supporters</td></tr>
        <tr><td class="l">Actual attendance over the season</td><td class="n">${num(att)} supporters</td></tr>
        <tr><td class="l">Margin of safety</td><td class="n${att - be < 0 ? ' neg' : ''}">${num(att - be)} supporters</td></tr></tbody></table></div>` : ''}`;
  }

  function signingsHtml(lg) {
    const b = FM.biz(lg);
    if (!b.signings.length) return '<p class="note">No signings yet. Every player the club buys is recorded here, with what he cost and what he is worth now.</p>';
    const rows = b.signings.map((s) => {
      const p = FM.findPlayer(lg, s.pid), value = p ? Math.round(FM.valueOf(p) * 1e6) : 0, apps = p && p.stats ? p.stats.apps : 0, goals = p && p.stats ? p.stats.goals : 0;
      const played = lg.fixtures.filter((f) => f.played && (f.homeId === lg.userId || f.awayId === lg.userId)).length - s.round;
      const wageCost = Math.round(s.wage * 1000 * Math.max(0, played));
      const status = s.sold ? 'Sold' : !p || (p && FM.clubOf(lg, p) && FM.clubOf(lg, p).id !== lg.userId) ? 'Left the club' : '';
      return { s, p, value, apps, goals, wageCost, status };
    });
    const t = (k) => rows.reduce((a, r) => a + r[k], 0);
    return `<div class="books-wrap"><table class="books-table"><thead><tr><th class="l">Player</th><th>Fee</th><th>Wage a week</th><th>Wages paid</th><th>Book value</th><th>Market value</th><th>Gain or loss if sold</th><th>Apps</th><th>Goals</th><th>Cost per app</th></tr></thead><tbody>${rows.map((r) => {
      const gain = r.s.sold ? r.s.sold.fee - r.s.fee : r.value - r.s.book;
      return `<tr><td class="l">${esc(r.s.name)}<br><small>${r.status || ('signed in season ' + r.s.season + ', ' + r.s.years + ' years')}</small></td>${cell(r.s.fee)}${cell(r.s.wage * 1000)}${cell(r.wageCost)}${cell(r.s.sold ? 0 : r.s.book)}${cell(r.s.sold ? r.s.sold.fee : r.value)}${cell(gain)}<td class="n">${r.apps}</td><td class="n">${r.goals}</td><td class="n">${r.apps ? gbp((r.s.fee + r.wageCost) / r.apps) : '–'}</td></tr>`;
    }).join('')}<tr class="tot"><td class="l">All signings</td>${cell(t('fee') || rows.reduce((a, r) => a + r.s.fee, 0))}<td></td>${cell(t('wageCost'))}<td></td><td></td><td></td><td class="n">${t('apps')}</td><td class="n">${t('goals')}</td><td></td></tr></tbody></table></div>`;
  }

  // ---------- the tabs ----------
  function overview(lg) {
    const b = FM.biz(lg), ap = FM.bizApprovals(lg), board = lg.board || {}, rows = FM.tableRows(lg), pos = rows.findIndex((r) => r.id === lg.userId) + 1, played = rows.find((r) => r.id === lg.userId).p;
    const { t } = seasonTotals(lg), target = FM.bizConst.PROFIT_TARGET, got = b.ledger.filter((e) => e.season === lg.season).length;
    const overall = Math.round((ap.financial + ap.football) / 2);
    const mood = overall >= 70 ? 'The shareholders are delighted with the way the club is being run.' : overall >= 55 ? 'The shareholders are content, and watching.' : overall >= 40 ? 'The shareholders have questions about the direction of the club.' : 'The shareholders are losing patience.';
    const finWords = ap.financial >= 70 ? 'They like what they see in the accounts.' : ap.financial >= 45 ? 'They want to see more profit.' : 'The accounts worry them.';
    const footWords = ap.football >= 70 ? 'They are happy with results on the pitch.' : ap.football >= 45 ? 'They expect a better league position.' : 'They are unhappy with results on the pitch.';
    const news = (lg.news || []).filter((n) => n.kind === 'Board').slice(-3).reverse();
    const shareMove = ap.prevShare != null ? ap.share - ap.prevShare : 0;
    return `<div class="two"><div style="display:grid;gap:16px">
      <div class="card"><div class="eyebrow">The shareholders</div><h2>Ashford Rovers PLC</h2><p class="desc">${esc(mood)} ${esc(finWords)} ${esc(footWords)}</p>
        <div class="home-approvals">${meter('Approval of the finances', ap.financial)}${meter('Approval of the football', ap.football)}</div>
        <div class="board-money"><span>Share price<b>£${ap.share.toFixed(2)}</b></span><span>Shares in issue<b>${num(b.shares.issued)}</b></span><span>Cash in the bank<b${b.cash < 0 ? ' class="neg"' : ''}>${gbp(b.cash)}</b></span></div></div>
      <div class="card"><div class="eyebrow">What they expect this season</div>
        <p class="desc"><b>On the pitch:</b> ${esc(board.expectation || 'Establish the club')}. Expected finish ${board.expectedPosition ? ord(board.expectedPosition) : '–'} in the ${esc(lg.divisionName)}${played ? `; you are ${ord(pos)} after ${played}` : ''}.</p>
        <p class="desc"><b>In the accounts:</b> a profit for the year of at least ${gbp(target)}, cash kept above zero and borrowing kept modest.</p>
        <div class="goal-bar"><span>Profit for the year so far</span><div class="approval-track"><i style="width:${Math.max(0, Math.min(100, 100 * (t.net || 0) / target))}%"></i></div><strong class="${(t.net || 0) < 0 ? 'neg' : ''}">${gbp(t.net || 0)} of ${gbp(target)}</strong></div>
        <p class="note">${got} of ${FM.bizConst.ROUNDS} matchdays in the accounts.</p></div></div>
      <div style="display:grid;gap:16px"><div class="card"><div class="eyebrow">Where to look</div><div class="row"><button type="button" data-btab="matchday" class="primary">Ticket prices and the matchday</button><button type="button" data-btab="books">The books</button><button type="button" data-btab="finance">Sources of finance</button><button type="button" data-btab="commercial">Sponsors and advertising</button></div></div>
      <div class="card"><div class="eyebrow">From the boardroom</div>${news.length ? news.map((n) => `<p class="desc"><b>${esc(n.headline)}</b><br>${esc(n.body)}</p>`).join('') : '<p class="note">Nothing yet. The shareholders write when something in the accounts needs saying.</p>'}</div></div></div>`;
  }

  function nextHome(lg) {
    const me = lg.userId, fxs = lg.fixtures.filter((f) => f.homeId === me).sort((a, b) => a.round - b.round);
    return fxs.find((f) => !f.played) || null;
  }
  function matchday(lg) {
    const b = FM.biz(lg), fx = nextHome(lg), d = FM.bizDemand(lg, fx, { neutral: true });
    const inputs = FM.SEGMENTS.map((s) => `<tr data-seg="${s.id}"><td class="l"><b>${esc(s.name)}</b><br><small>${esc(s.who)}</small></td><td class="n">${num(s.seats)}</td>
        <td class="n"><span class="pounds">£</span><input type="number" min="3" max="400" step="1" value="${b.prices[s.id].price}" data-price="${s.id}" aria-label="Price, ${esc(s.name)}"></td>
        <td class="n" data-out="sold"></td><td class="n" data-out="full"></td><td class="n" data-out="away"></td><td class="n" data-out="rev"></td></tr>`).join('');
    const home = b.ledger.filter((e) => e.home).slice(-8).reverse();
    return `<div style="display:grid;gap:16px"><div class="card"><h2>Ticket prices</h2>
      <p class="desc">${fx ? `Next home match: <b>${esc(FM.teamById(lg, fx.awayId).name)}</b> (round ${fx.round + 1}). The figures below are what the prices would bring in for an ordinary crowd.` : 'No home matches left this season. The prices stay set for next season.'}</p>
      <div class="books-wrap"><table class="books-table prices"><thead><tr><th class="l">Stand</th><th>Seats</th><th>Price</th><th>Expected crowd</th><th>Full</th><th>Turned away</th><th>Ticket income</th></tr></thead><tbody>${inputs}
        <tr class="tot"><td class="l">Whole ground</td><td class="n">${num(FM.bizConst.CAPACITY)}</td><td></td><td class="n" data-tot="sold"></td><td class="n" data-tot="full"></td><td class="n" data-tot="away"></td><td class="n" data-tot="rev"></td></tr></tbody></table></div>
      <div class="row"><label>Marketing budget a matchday <span class="pounds">£</span><input type="number" min="0" max="60000" step="500" value="${b.marketing || 0}" id="bzMarketing"></label></div></div>
      <div class="card"><h2>Home matches so far</h2>${home.length ? `<div class="books-wrap"><table class="books-table"><thead><tr><th class="l">Opponent</th>${FM.SEGMENTS.map((s) => `<th>${esc(s.name)}</th>`).join('')}<th>Crowd</th><th>Full</th><th>Turned away</th><th>Ticket income</th></tr></thead><tbody>${home.map((e) => `<tr><td class="l">Round ${e.round}: ${esc(e.opp)}</td>${FM.SEGMENTS.map((s) => `<td class="n">${num(e.att[s.id])}<br><small>at £${e.prices[s.id]}</small></td>`).join('')}<td class="n">${num(e.attTotal)}</td><td class="n">${pct(e.attTotal, FM.bizConst.CAPACITY)}</td><td class="n">${num(e.away)}</td>${cell(e.inflow.tickets)}</tr>`).join('')}</tbody></table></div>` : '<p class="note">The first home match will show up here.</p>'}</div></div>`;
  }
  function fillMatchday(host, lg) {
    const fx = nextHome(lg), d = FM.bizDemand(lg, fx, { neutral: true });
    FM.SEGMENTS.forEach((s) => {
      const r = d.rows[s.id], row = host.querySelector(`[data-seg="${s.id}"]`); if (!row) return;
      row.querySelector('[data-out="sold"]').textContent = num(r.sold);
      row.querySelector('[data-out="full"]').textContent = Math.round(100 * r.sold / s.seats) + '%';
      row.querySelector('[data-out="away"]').textContent = r.away ? num(r.away) : '–';
      row.querySelector('[data-out="rev"]').textContent = gbp(r.revenue);
    });
    const set = (k, v) => { const e = host.querySelector(`[data-tot="${k}"]`); if (e) e.textContent = v; };
    set('sold', num(d.total)); set('full', Math.round(100 * d.total / d.capacity) + '%'); set('away', d.turnedAway ? num(d.turnedAway) : '–'); set('rev', gbp(d.tickets));
  }

  function books(lg) {
    const tabs = [['cash', 'Cash flow'], ['profit', 'Profit'], ['costs', 'Revenue and costs'], ['signings', 'Signings']];
    const body = st.books === 'cash' ? FM.bizCashFlowHtml(lg) : st.books === 'profit' ? FM.bizProfitHtml(lg) : st.books === 'costs' ? costsHtml(lg) : signingsHtml(lg);
    return `<div class="card"><h2>The books</h2><div class="row books-tabs">${tabs.map(([k, l]) => `<button type="button" data-books="${k}" class="${st.books === k ? 'on' : ''}">${l}</button>`).join('')}</div>${body}</div>`;
  }

  function finance(lg) {
    const b = FM.biz(lg), S = FM.bizSources, od = b.cash < 0 ? -b.cash : 0;
    const loans = b.loans.length ? `<div class="books-wrap"><table class="books-table"><thead><tr><th class="l">Loan</th><th>Borrowed</th><th>Still owed</th><th>Interest a year</th><th>Repaid each matchday</th><th></th></tr></thead><tbody>${b.loans.map((l) => `<tr><td class="l">${l.id}, taken in season ${l.season}</td>${cell(l.principal)}${cell(l.balance)}<td class="n">${Math.round(l.rate * 1000) / 10}%</td>${cell(l.perRound)}<td><button type="button" data-repay="${l.id}"${b.cash < l.balance ? ' disabled' : ''}>Repay now</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="note">No loans.</p>';
    return `<div style="display:grid;gap:16px"><div class="card"><h2>Cash and overdraft</h2>
      <div class="board-money"><span>Cash in the bank<b${b.cash < 0 ? ' class="neg"' : ''}>${gbp(b.cash)}</b></span><span>Overdraft limit<b>${gbp(S.overdraft.limit)}</b></span><span>Overdraft in use<b>${gbp(od)}</b></span><span>Overdraft interest<b>${Math.round(S.overdraft.rate * 100)}% a year</b></span></div>
      <p class="note">When the balance goes below zero the club is in its overdraft automatically, up to the limit. Past the limit the interest is ${Math.round(S.overdraft.penalty * 100)}% and the bank stops the club spending.</p></div>
      <div class="card"><h2>Bank loan</h2><div class="row finrow"><label>Amount <select id="loanAmt">${[250000, 500000, 1000000, 2500000, 5000000].map((a) => `<option value="${a}">${gbp(a)}</option>`).join('')}</select></label>
        <label>Repaid over <select id="loanTerm">${S.loanOptions.map((o) => `<option value="${o.term}">${o.term / 14} season${o.term > 14 ? 's' : ''} (${Math.round(o.rate * 1000) / 10}% a year)</option>`).join('')}</select></label>
        <span class="note" id="loanInfo"></span><button type="button" class="primary" id="loanGo">Take the loan</button></div>${loans}</div>
      <div class="card"><h2>Issue new shares</h2><div class="row finrow"><label>Raise <select id="shareAmt">${[500000, 1000000, 2500000, 5000000].map((a) => `<option value="${a}">${gbp(a)}</option>`).join('')}</select></label>
        <span class="note" id="shareInfo"></span><button type="button" class="primary" id="shareGo">Issue the shares</button></div>
        <p class="note">Shares in issue: ${num(b.shares.issued)} at £${b.shares.price.toFixed(2)} each.</p></div>
      <div class="card"><h2>Selling players</h2><p class="desc">Offers for your players come in through Recruitment. The money from a sale goes straight into the bank.</p><div class="row"><button type="button" data-goto="recruit">Open Recruitment</button></div></div></div>`;
  }
  function commercial(lg) {
    const b = FM.biz(lg), open = b.offers.filter((o) => o.status === 'open');
    const deals = b.sponsors.map((s) => `<tr><td class="l">${esc(s.kind)}</td><td class="l">${esc(s.company)}</td>${cell(s.perRound)}<td class="n">${s.left}</td></tr>`).join('');
    const slots = []; for (let i = 0; i < 8; i++) { const a = b.boards[i]; slots.push(a ? `<tr><td class="l">Board ${i + 1}</td><td class="l">${esc(a.company)}</td>${cell(a.perRound)}<td class="n">${a.left}</td></tr>` : `<tr class="empty"><td class="l">Board ${i + 1}</td><td class="l" colspan="3">Empty: no advertiser yet</td></tr>`); }
    return `<div style="display:grid;gap:16px"><div class="card"><h2>Offers waiting</h2>${open.length ? open.map((o) => `<div class="offer"><div><b>${esc(o.company)}</b><br><small>${esc(FM.bizOfferText(o))}</small></div><div class="row"><button type="button" class="primary" data-offer="${o.id}" data-accept="1">Accept</button><button type="button" data-offer="${o.id}">Decline</button></div></div>`).join('') : '<p class="note">No offers at the moment. Companies get in touch after matches; they also appear in the News.</p>'}</div>
      <div class="card"><h2>Sponsors</h2><div class="books-wrap"><table class="books-table"><thead><tr><th class="l">Deal</th><th class="l">Company</th><th>A matchday</th><th>Matchdays left</th></tr></thead><tbody>${deals || '<tr><td class="l" colspan="4">No sponsors.</td></tr>'}</tbody></table></div></div>
      <div class="card"><h2>Advertising boards</h2><div class="books-wrap"><table class="books-table"><thead><tr><th class="l">Board</th><th class="l">Company</th><th>A matchday</th><th>Matchdays left</th></tr></thead><tbody>${slots.join('')}</tbody></table></div></div></div>`;
  }

  // ---------- the page ----------
  FM.renderBoard = function (host, lg, hooks) {
    const save = (hooks && hooks.save) || (() => {}), go = (hooks && hooks.goto) || (() => {});
    FM.biz(lg);
    FM.bizSyncBudget(lg);
    const tabs = [['overview', 'The board'], ['matchday', 'Matchday'], ['books', 'The books'], ['finance', 'Sources of finance'], ['commercial', 'Commercial']];
    const body = st.tab === 'matchday' ? matchday(lg) : st.tab === 'books' ? books(lg) : st.tab === 'finance' ? finance(lg) : st.tab === 'commercial' ? commercial(lg) : overview(lg);
    host.innerHTML = `<div class="board-page"><div class="row board-tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" data-tab="${k}" class="${st.tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>${body}</div>`;
    const redo = () => FM.renderBoard(host, lg, hooks);
    host.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { st.tab = b.dataset.tab; redo(); }));
    host.querySelectorAll('[data-btab]').forEach((b) => b.addEventListener('click', () => { st.tab = b.dataset.btab; redo(); }));
    host.querySelectorAll('[data-books]').forEach((b) => b.addEventListener('click', () => { st.books = b.dataset.books; redo(); }));
    host.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => go(b.dataset.goto)));
    if (st.tab === 'matchday') {
      fillMatchday(host, lg);
      host.querySelectorAll('[data-price]').forEach((i) => i.addEventListener('input', () => {
        const v = Math.max(3, Math.min(400, Number(i.value) || 3)); FM.biz(lg).prices[i.dataset.price].price = v; fillMatchday(host, lg); save();
      }));
      const mk = host.querySelector('#bzMarketing');
      if (mk) mk.addEventListener('input', () => { FM.biz(lg).marketing = Math.max(0, Math.min(60000, Math.round(Number(mk.value) || 0))); fillMatchday(host, lg); save(); });
    }
    if (st.tab === 'finance') {
      const info = () => {
        const a = +host.querySelector('#loanAmt').value, term = +host.querySelector('#loanTerm').value, o = FM.bizSources.loanOptions.find((x) => x.term === term);
        host.querySelector('#loanInfo').textContent = `${gbp(Math.round(a / term))} a matchday in repayments, about ${gbp(Math.round(a * o.rate * (term / 14) / 2))} interest in all.`;
        const s = +host.querySelector('#shareAmt').value, b = FM.biz(lg), add = Math.round(s / b.shares.price);
        host.querySelector('#shareInfo').textContent = `${num(add)} new shares at £${b.shares.price.toFixed(2)}: ${(100 * add / (b.shares.issued + add)).toFixed(1)}% of the club goes to new owners.`;
      };
      ['#loanAmt', '#loanTerm', '#shareAmt'].forEach((q) => host.querySelector(q).addEventListener('change', info)); info();
      host.querySelector('#loanGo').addEventListener('click', () => { FM.bizSources.takeLoan(lg, +host.querySelector('#loanAmt').value, +host.querySelector('#loanTerm').value); save(); redo(); });
      host.querySelector('#shareGo').addEventListener('click', () => { FM.bizSources.issueShares(lg, +host.querySelector('#shareAmt').value); save(); redo(); });
      host.querySelectorAll('[data-repay]').forEach((b) => b.addEventListener('click', () => { FM.bizSources.repayLoan(lg, b.dataset.repay); save(); redo(); }));
    }
    if (st.tab === 'commercial') host.querySelectorAll('[data-offer]').forEach((b) => b.addEventListener('click', () => { FM.bizOffer(lg, b.dataset.offer, !!b.dataset.accept); save(); redo(); }));
  };

  // An offer shown inside a news story: the same buttons, in the story itself.
  FM.bizOfferBlock = function (lg, id) {
    const o = FM.biz(lg).offers.find((x) => x.id === id);
    if (!o) return '';
    if (o.status !== 'open') return `<p class="note offer-done">${o.status === 'accepted' ? 'You accepted this offer.' : o.status === 'declined' ? 'You declined this offer.' : 'This offer has run out.'}</p>`;
    return `<div class="offer"><div><b>${esc(o.company)}</b><br><small>${esc(FM.bizOfferText(o))}</small></div><div class="row"><button type="button" class="primary" data-news-offer="${o.id}" data-accept="1">Accept</button><button type="button" data-news-offer="${o.id}">Decline</button></div></div>`;
  };
})();
