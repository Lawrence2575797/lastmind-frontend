// The Board: the shareholders and their aims, the matchday market, the stadium, the books, the sources of finance and the commercial deals. It
// never explains the business ideas; it shows the numbers a company would see, laid out as a company's accounts are, and leaves the reading to
// the manager (the LastMind AI Agent explains an idea when it is asked). The crowd is only shown once a match has been played.
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const st = { tab: 'overview', books: 'cash', neg: {}, trail: [], ok: null };
  const okMsg = (title, text) => { st.ok = { title, text }; };
  // a business word is a button that opens its lesson (the same lessons and buttons as the match review)
  const T = (id, words) => esc(words);   // the Board is figures only: a word is just the word
  const fmtT = (html) => (FM.teach && FM.teach.fmt ? FM.teach.fmt(html) : html.replace(/\[\[[a-z]+\|([^\]]+)\]\]/g, '$1'));

  // ---------- how the club talks to its manager ----------
  // The manager is addressed in a few different ways, and it changes from day to day rather than repeating one word.
  const ADDR = ['Gaffer', 'Boss', 'Manager'];
  const addr = (lg, salt) => ADDR[FM.hashString([lg.seed, lg.season || 1, lg.day || 0, salt].join(':')) % ADDR.length];
  // Four pages instead of seven: what is happening, tickets and the ground, finance and deals, and the books.
  const TAB_OF = { controls: 'controls', overview: 'home', report: 'home', home: 'home', matchday: 'ground', stadium: 'ground', ground: 'ground', finance: 'funding', commercial: 'funding', funding: 'funding', books: 'books' };
  const ANCHORS = { matchday: 1, stadium: 1, finance: 1, commercial: 1 };
  const tableOf = (lg) => { const rows = FM.tableRows(lg); return { rows, pos: (id) => rows.findIndex((r) => r.id === id) + 1, row: (id) => rows.find((r) => r.id === id) }; };
  // What the last result means, in football terms: who it was against, where that side are, and what it does for the club.
  function resultContext(lg, last) {
    if (!last) return '';
    const me = lg.userId, fx = lg.fixtures.find((f) => f.played && !f.friendly && f.round === last.round - 1 && (f.homeId === me || f.awayId === me));
    if (!fx) return '';
    const home = fx.homeId === me, gf = home ? fx.hg : fx.ag, ga = home ? fx.ag : fx.hg, oppId = home ? fx.awayId : fx.homeId, T = tableOf(lg), op = T.pos(oppId), mp = T.pos(me), n = T.rows.length;
    const opp = FM.teamById(lg, oppId), on = opp ? opp.name : 'the opposition', venue = home ? 'at home' : 'away';
    const exp = (lg.board || {}).expectedPosition;
    let line;
    if (gf > ga) {
      if (op && op < mp) line = `A ${gf}-${ga} win ${venue} against ${on}, who are ${ord(op)} and above you, is a big result. It is the kind of win that closes a gap in the table and makes the shareholders sit up.`;
      else if (op && op >= n - 2) line = `A ${gf}-${ga} win ${venue} against ${on}, who are ${ord(op)}, is what everybody expected. It earns no extra credit, but the points are what keep you where the board wants you.`;
      else line = `A ${gf}-${ga} win ${venue} against ${on}, who are ${ord(op)}, is a solid three points.`;
    } else if (gf === ga) {
      if (!home && op && op < mp) line = `A ${gf}-${ga} draw away to ${on}, ${ord(op)} in the table, is a good point to take from a hard place.`;
      else if (home && op && op > mp) line = `A ${gf}-${ga} draw at home to ${on}, who are ${ord(op)}, will feel like two points dropped.`;
      else line = `A ${gf}-${ga} draw ${venue} to ${on} keeps things ticking over without moving you anywhere.`;
    } else {
      if (op && op > mp) line = `Losing ${ga}-${gf} ${venue} to ${on}, who are ${ord(op)} and below you, is a poor result. This is the sort of defeat the shareholders remember.`;
      else line = `Losing ${ga}-${gf} ${venue} to ${on}, ${ord(op)} in the table, is no disgrace on paper, but the points still matter.`;
    }
    const sgR = seasonStage(lg), form = (T.row(me) || {}).form || [], run = form.slice(-3).join('');
    const mood = run === 'WWW' ? ' Three wins in a row is the kind of form that fills the ground.' : run === 'LLL' ? ' Three defeats on the trot, and the mood around the club is turning.' : '';
    const money = gf > ga ? ' Winning raises the next crowds and sells more shirts.' : gf < ga ? ' Defeats cool the crowds a little and slow the merchandise.' : '';
    return `<p class="desc rep-ctx">${esc(line + mood + money)}${exp && mp ? esc(sgR.early ? ` You are ${ord(mp)} after only ${sgR.played} game${sgR.played === 1 ? '' : 's'}; the table is too young to read much into.` : ` You are ${ord(mp)}; the shareholders expected ${ord(exp)}.`) : ''}</p>`;
  }
  // How far into the season the club is decides how much the league table is worth reading: two games in, it says very little; ten in, it is nearly the whole story.
  function seasonStage(lg) {
    const played = lg.fixtures.filter((f) => f.played && !f.friendly && (f.homeId === lg.userId || f.awayId === lg.userId)).length, total = lg.fixtures.filter((f) => !f.friendly && (f.homeId === lg.userId || f.awayId === lg.userId)).length || 14;
    return { played, left: total - played, early: played <= 4, late: played >= 10 };
  }
  // The season so far in a few plain sentences.
  function story(lg) {
    const b = FM.biz(lg), ap = FM.bizApprovals(lg), pz = FM.bizPrize(lg), exp = (lg.board || {}).expectedPosition, net = FM.bizSeasonSum(lg, 'net');
    const played = lg.fixtures.filter((f) => f.played && !f.friendly && (f.homeId === lg.userId || f.awayId === lg.userId)).length;
    if (!played) return 'The season has not kicked off yet. This is the time to set your ticket prices, look at the offers waiting for you, and make sure the club can afford what you plan.';
    const parts = [];
    const sg = seasonStage(lg), gm = (n) => n + ' game' + (n === 1 ? '' : 's');
    if (exp) {
      if (sg.early) parts.push(pz.position <= exp ? `After ${gm(sg.played)} you are ${ord(pz.position)}, which is a good start, though it is far too early for the table to mean much.` : `After ${gm(sg.played)} you are ${ord(pz.position)}, below the ${ord(exp)} the shareholders hoped for. With so few games played that is nothing to worry about yet: the table will move a lot before it settles.`);
      else if (sg.late) parts.push(pz.position <= exp ? `With only ${gm(sg.left)} left you are ${ord(pz.position)}, ahead of the ${ord(exp)} the shareholders hoped for. The table has settled and this is a real achievement.` : `With only ${gm(sg.left)} left you are ${ord(pz.position)}, behind the ${ord(exp)} the shareholders hoped for. There is not much time to change that, and they know it.`);
      else parts.push(pz.position <= exp ? `On the pitch you are ${ord(pz.position)} after ${gm(sg.played)}, ahead of the ${ord(exp)} the shareholders hoped for, which keeps them on your side.` : `On the pitch you are ${ord(pz.position)} after ${gm(sg.played)}, behind the ${ord(exp)} the shareholders hoped for, so they are starting to ask questions.`);
    }
    parts.push(net >= 0 ? `The club is making money this season: ${gbp(net)} profit so far.` : `The club is losing money this season: ${gbp(-net)} loss so far${b.cash < 0 ? ', and the bank is overdrawn' : `, though there is still ${gbp(b.cash)} in the bank`}.`);
    const mood = (ap.financial + ap.football) / 2;
    parts.push(sg.early ? 'The shareholders are not judging the season yet: they will want to see a pattern before they decide what they think.' : mood >= 65 ? 'The shareholders are happy at the moment.' : mood >= 45 ? 'The shareholders are watching, neither pleased nor worried.' : sg.late ? 'The shareholders are uneasy, and there is little of the season left to turn it round.' : 'The shareholders are uneasy, and a few more bad weeks would put the job at risk.');
    return parts.join(' ');
  }
  // What the ticket prices have been doing, in the words of economics. When a price changed between the last two home matches, what happened to the crowd
  // and the takings says how sensitive that kind of fan is to price (price elasticity of demand).
  function ticketInsights(lg) {
    const b = FM.biz(lg), homes = b.ledger.filter((e) => e.home && e.att && e.prices), out = [];
    if (!homes.length) return out;
    const e2 = homes[homes.length - 1], e1 = homes[homes.length - 2];
    FM.SEGMENTS.forEach((sg) => {
      const nm = sg.name, who = sg.who.toLowerCase(), p2 = e2.prices[sg.id], q2 = e2.att[sg.id], seats = b.seats[sg.id] || sg.seats;
      if (e1) {
        const p1 = e1.prices[sg.id], q1 = e1.att[sg.id];
        if (p1 && q1 > 0 && Math.abs(p2 - p1) / p1 >= 0.05) {
          const dP = Math.round(100 * (p2 - p1) / p1), dQ = Math.round(100 * (q2 - q1) / q1), r1 = p1 * q1, r2 = p2 * q2, up = p2 > p1;
          if (up && r2 < r1) out.push({ sev: 'warn', title: `Boss, raising the ${nm} price to £${p2} cost the club money`, why: `You moved it from £${p1} to £${p2} (${dP > 0 ? '+' : ''}${dP}%) and the crowd there fell ${Math.abs(dQ)}%, so [[revenue|takings]] dropped from ${gbp(r1)} to ${gbp(r2)}. When a price rise loses a bigger share of the crowd than the share you added to the price, demand is [[elasticity|elastic]] ([[elasticity|price elasticity]] above 1). That fits these fans, ${who}: they react strongly to price. Moving the price back towards £${p1} should bring in more money overall.`, fix: [{ label: 'Review ticket prices', tab: 'matchday' }] });
          else if (up) out.push({ sev: 'good', title: `Boss, the ${nm} price rise paid off`, why: `You went from £${p1} to £${p2} (${dP > 0 ? '+' : ''}${dP}%) and the crowd only changed by ${dQ}%, so [[revenue|takings]] rose from ${gbp(r1)} to ${gbp(r2)}. That is [[elasticity|inelastic]] demand (elasticity below 1): ${who} do not mind paying a little more. There may be room to go higher, but watch for the point where the stand starts to empty.`, fix: [{ label: 'Review ticket prices', tab: 'matchday' }] });
          else if (r2 > r1) out.push({ sev: 'good', title: `Boss, cutting the ${nm} price filled the seats`, why: `The price came down from £${p1} to £${p2} and the crowd rose ${dQ}%, more than the price fell, so takings went up from ${gbp(r1)} to ${gbp(r2)}. That is [[elasticity|elastic]] demand: cheaper tickets bring in far more of ${who}. It is worth leaving it there, or trying a touch lower.`, fix: [{ label: 'Review ticket prices', tab: 'matchday' }] });
          else out.push({ sev: 'warn', title: `Boss, cutting the ${nm} price gave money away`, why: `You dropped it from £${p1} to £${p2} but the crowd rose only ${dQ}%, so [[revenue|takings]] fell from ${gbp(r1)} to ${gbp(r2)}. That is [[elasticity|inelastic]] demand: ${who} were going to come anyway, so the discount did not win many new fans. Putting the price back up should earn more.`, fix: [{ label: 'Review ticket prices', tab: 'matchday' }] });
        }
      }
      if (q2 >= seats * 0.99 && p2 > 0) out.push({ sev: 'info', title: `Boss, the ${nm} was full at £${p2}`, why: `Every seat was taken, so more people wanted to come than the stand can hold. That means the price can rise without losing anyone until the stand stops filling${sg.e < 1 ? `, and ${who} are the kind of fan who barely reacts to price, so you can go higher with little risk` : ''}. Another route is more seats if you have the room.`, fix: [{ label: 'Review ticket prices', tab: 'matchday' }, { label: 'Look at the stadium', tab: 'stadium' }] });
      else if (seats > 0 && q2 < seats * 0.55 && p2 >= sg.ref) out.push({ sev: 'warn', title: `Boss, the ${nm} was barely half full`, why: `Only ${Math.round(100 * q2 / seats)}% of the seats were sold at £${p2}, which is above the usual price for this stand (£${sg.ref}). ${sg.e > 1 ? `${who.charAt(0).toUpperCase() + who.slice(1)} are very sensitive to price, so a cut should fill more seats than it costs you in price and takings should rise.` : `${who.charAt(0).toUpperCase() + who.slice(1)} do not react much to price, so a cut may not fill many more seats; extra marketing is the better lever here.`}`, fix: [{ label: 'Review ticket prices', tab: 'matchday' }] });
    });
    return out.slice(0, 3);
  }

  const gbp = (n) => FM.gbp(n), num = (n) => Math.round(n).toLocaleString('en-GB');
  const cell = (n) => `<td class="n${n < 0 ? ' neg' : ''}">${n === 0 || n == null ? '–' : gbp(n)}</td>`;
  const pct = (a, b) => (b ? Math.round(1000 * a / b) / 10 + '%' : '–');
  const ord = (n) => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) || n % 10 > 3 ? 0 : n % 10]);
  const meter = (label, value, sub) => `<div class="approval-line"><span><b>${esc(label)}</b><small>${esc(FM.approvalBand(value))}${sub ? ' · ' + esc(sub) : ''}</small></span><div class="approval-track"><i style="width:${Math.max(0, Math.min(100, value))}%"></i></div><strong>${Math.round(value)}%</strong></div>`;

  // ---------- the books: tables laid out as a company's accounts are ----------
  const CF_IN = [['tickets', 'Ticket sales'], ['matchday', 'Food, drink and programmes'], ['broadcast', 'Broadcasting rights'], ['sponsor', 'Sponsorship'], ['advert', 'Advertising boards'], ['merch', 'Merchandise'], ['prize', 'League prize money'], ['sales', 'Sale of players'], ['loans', 'Bank loans received'], ['shares', 'Shares issued']];
  const CF_OUT = [['wages', 'Wages'], ['matchday', 'Matchday running costs'], ['merchCost', 'Cost of merchandise'], ['marketing', 'Marketing'], ['admin', 'Stadium and administration'], ['fees', 'Transfer fees paid'], ['capex', 'Stadium and facilities'], ['loanPay', 'Loan repayments'], ['interest', 'Interest paid'], ['tax', 'Corporation tax'], ['dividends', 'Dividends paid']];
  const val = (c, grp, key) => (c[grp][key] || 0);
  FM.bizCashFlowHtml = function (lg) {
    const cols = FM.bizCashFlow(lg), tot = (key, grp) => cols.reduce((a, c) => a + val(c, grp, key), 0);
    if (!cols.length) return '<p class="note">No fixtures left to show.</p>';
    const head = `<tr><th class="l">${T('cashflow', 'Cash flow forecast')}</th>${cols.map((c) => `<th class="${c.actual ? '' : 'fc'}">${c.round}${c.actual ? '' : '<br><small>forecast</small>'}</th>`).join('')}<th>Season</th></tr>`;
    const row = (label, key, grp) => `<tr><td class="l">${label}</td>${cols.map((c) => cell(val(c, grp, key)).replace('<td class="n', '<td class="n' + (c.actual ? '' : ' fc'))).join('')}${cell(tot(key, grp))}</tr>`;
    const totalRow = (label, f) => `<tr class="tot"><td class="l">${label}</td>${cols.map((c) => `<td class="n${f(c) < 0 ? ' neg' : ''}${c.actual ? '' : ' fc'}">${gbp(f(c))}</td>`).join('')}<td class="n${cols.reduce((a, c) => a + f(c), 0) < 0 ? ' neg' : ''}">${gbp(cols.reduce((a, c) => a + f(c), 0))}</td></tr>`;
    const inSum = (c) => CF_IN.reduce((a, [k]) => a + val(c, 'inflow', k), 0), outSum = (c) => CF_OUT.reduce((a, [k]) => a + val(c, 'outflow', k), 0);
    const body = `<tr class="sec"><td class="l" colspan="${cols.length + 2}">Cash inflows</td></tr>${CF_IN.map(([k, l]) => row(l, k, 'inflow')).join('')}${totalRow('Total cash inflows', inSum)}
      <tr class="sec"><td class="l" colspan="${cols.length + 2}">Cash outflows</td></tr>${CF_OUT.map(([k, l]) => row(l, k, 'outflow')).join('')}${totalRow('Total cash outflows', outSum)}
      ${totalRow('Net cash flow', (c) => inSum(c) - outSum(c))}
      <tr><td class="l">Opening balance</td>${cols.map((c) => `<td class="n${c.opening < 0 ? ' neg' : ''}${c.actual ? '' : ' fc'}">${gbp(c.opening)}</td>`).join('')}<td class="n">${gbp(cols[0].opening)}</td></tr>
      <tr class="tot"><td class="l">Closing balance</td>${cols.map((c) => `<td class="n${c.closing < 0 ? ' neg' : ''}${c.actual ? '' : ' fc'}">${gbp(c.closing)}</td>`).join('')}<td class="n${cols[cols.length - 1].closing < 0 ? ' neg' : ''}">${gbp(cols[cols.length - 1].closing)}</td></tr>`;
    return `<div class="books-wrap"><table class="books-table"><thead>${head}</thead><tbody>${body}</tbody></table></div><p class="note">Columns are matchdays. Shaded columns are forecasts from today's wages, deals and loans, with matchday income taken from the crowds that have actually come. Brackets are negative figures.</p>`;
  };

  function seasonTotals(lg) {
    const b = FM.biz(lg), rows = b.ledger.filter((e) => e.season === lg.season);
    const t = {}; rows.forEach((e) => { Object.keys(e.pl).forEach((k) => { t[k] = (t[k] || 0) + e.pl[k]; }); });
    const sumIn = (k) => rows.reduce((a, e) => a + (e.inflow[k] || 0), 0), sumOut = (k) => rows.reduce((a, e) => a + (e.outflow[k] || 0), 0);
    return { rows, t, sumIn, sumOut, dep: rows.reduce((a, e) => a + (e.dep || 0), 0), depSign: rows.reduce((a, e) => a + (e.depSign || 0), 0) };
  }
  FM.bizProfitHtml = function (lg) {
    const { rows, t, sumIn, sumOut, dep, depSign } = seasonTotals(lg), last = rows[rows.length - 1];
    if (!rows.length) return '<p class="note">The accounts start with the first matchday.</p>';
    const L = last.pl;
    const line = (label, season, lastv, cls) => `<tr class="${cls || ''}"><td class="l">${label}</td>${cell(season)}${cell(lastv == null ? 0 : lastv)}</tr>`;
    const rev = [['Ticket sales', sumIn('tickets'), last.inflow.tickets], ['Food, drink and programmes', sumIn('matchday'), last.inflow.matchday], ['Broadcasting rights', sumIn('broadcast'), last.inflow.broadcast], ['Sponsorship', sumIn('sponsor'), last.inflow.sponsor], ['Advertising boards', sumIn('advert'), last.inflow.advert], ['Merchandise', sumIn('merch'), last.inflow.merch]];
    if (sumIn('prize')) rev.push(['League prize money', sumIn('prize'), last.inflow.prize]);
    return `<div class="books-wrap"><table class="books-table"><thead><tr><th class="l">${T('profit', 'Income statement')}</th><th>Season to date</th><th>Last matchday</th></tr></thead><tbody>
      <tr class="sec"><td class="l" colspan="3">Revenue</td></tr>${rev.map((r) => line(r[0], r[1], r[2])).join('')}${line(T('revenue', 'Total revenue'), t.revenue, L.revenue, 'tot')}
      <tr class="sec"><td class="l" colspan="3">Cost of sales</td></tr>${line('Matchday running costs', sumOut('matchday'), last.outflow.matchday)}${line('Cost of merchandise', sumOut('merchCost'), last.outflow.merchCost)}${line('Total cost of sales', t.cos, L.cos, 'tot')}
      ${line(T('profit', 'Gross profit'), t.gross, L.gross, 'tot key')}
      <tr class="sec"><td class="l" colspan="3">Expenses</td></tr>${line('Wages', sumOut('wages'), last.outflow.wages)}${line('Marketing', sumOut('marketing'), last.outflow.marketing)}${line('Stadium and administration', sumOut('admin'), last.outflow.admin)}${line(T('depreciation', 'Depreciation of the stadium'), dep - depSign, last.dep - (last.depSign || 0))}${line('Signing fees written off (player amortisation)', depSign, last.depSign || 0)}${line('Total expenses', t.expenses, L.expenses, 'tot')}
      ${t.saleProfit ? line('Profit on sale of players', t.saleProfit, L.saleProfit) : ''}
      ${line(T('profit', 'Operating profit'), t.op, L.op, 'tot key')}
      ${line(T('loans', 'Interest paid'), -t.interest, -L.interest)}
      ${line(T('profit', 'Profit before tax'), t.pbt, L.pbt, 'tot key')}
      ${line(T('profit', 'Corporation tax'), -t.tax, -L.tax)}
      ${line(T('profit', 'Profit for the year'), t.net, L.net, 'tot key')}
      </tbody></table></div>
      <div class="books-wrap"><table class="books-table calc"><thead><tr><th class="l">The calculations</th><th class="l">Working</th><th>Result</th></tr></thead><tbody>
      <tr><td class="l">Signing fees written off</td><td class="l">fee ÷ contract years, charged every matchday: the cash goes out on the day of the signing, the cost reaches profit in equal parts over the contract</td>${cell(depSign)}</tr>
      <tr><td class="l">Gross profit</td><td class="l">revenue − cost of sales = ${gbp(t.revenue)} − ${gbp(t.cos)}</td>${cell(t.gross)}</tr>
      <tr><td class="l">Operating profit</td><td class="l">gross profit − expenses${t.saleProfit ? ' + profit on sale of players' : ''} = ${gbp(t.gross)} − ${gbp(t.expenses)}${t.saleProfit ? ' + ' + gbp(t.saleProfit) : ''}</td>${cell(t.op)}</tr>
      <tr><td class="l">Profit before tax</td><td class="l">operating profit − interest = ${gbp(t.op)} − ${gbp(t.interest)}</td>${cell(t.pbt)}</tr>
      <tr><td class="l">Profit for the year</td><td class="l">profit before tax − tax = ${gbp(t.pbt)} − ${gbp(t.tax)}</td>${cell(t.net)}</tr>
      <tr><td class="l">Gross profit margin</td><td class="l">gross profit ÷ revenue × 100 = ${gbp(t.gross)} ÷ ${gbp(t.revenue)} × 100</td><td class="n">${pct(t.gross, t.revenue)}</td></tr>
      <tr><td class="l">Net profit margin</td><td class="l">profit for the year ÷ revenue × 100 = ${gbp(t.net)} ÷ ${gbp(t.revenue)} × 100</td><td class="n">${pct(t.net, t.revenue)}</td></tr>
      </tbody></table></div>`;
  };

  FM.bizBalanceHtml = function (lg) {
    const b = FM.bizBalance(lg), row = (l, v, cls) => `<tr class="${cls || ''}"><td class="l">${l}</td>${cell(v)}</tr>`;
    return `<div class="books-wrap"><table class="books-table"><thead><tr><th class="l">${T('balancesheet', 'Statement of financial position')}</th><th>£</th></tr></thead><tbody>
      <tr class="sec"><td class="l" colspan="2">Non-current assets</td></tr>${row(`Stadium and facilities (net of ${T('depreciation', 'depreciation')})`, b.stadium)}${row(`Player registrations (net of ${T('depreciation', 'depreciation')})`, b.players)}${row('Total non-current assets', b.stadium + b.players, 'tot')}
      <tr class="sec"><td class="l" colspan="2">Current assets</td></tr>${row('Cash at bank', b.cash)}${row(T('balancesheet', 'Total assets'), b.assets, 'tot key')}
      <tr class="sec"><td class="l" colspan="2">Current liabilities</td></tr>${row(T('overdraft', 'Bank overdraft'), b.overdraft)}
      <tr class="sec"><td class="l" colspan="2">Non-current liabilities</td></tr>${row(T('loans', 'Bank loans'), b.loans)}${row('Total liabilities', b.liabilities, 'tot key')}
      ${row('Net assets (total assets − total liabilities)', b.assets - b.liabilities, 'tot')}
      <tr class="sec"><td class="l" colspan="2">Equity</td></tr>${row(T('shares', 'Share capital'), b.capital)}${row('Share premium', b.premium)}${row(T('shares', 'Retained earnings'), b.retained)}${row(T('balancesheet', 'Total equity'), b.equity, 'tot key')}
      </tbody></table></div><p class="note">As at the last matchday. Total assets − total liabilities = total equity: ${gbp(b.assets)} − ${gbp(b.liabilities)} = ${gbp(b.assets - b.liabilities)}${b.balanced ? '' : ' (the books are out by ' + gbp(b.assets - b.liabilities - b.equity) + ')'}.</p>`;
  };

  function costsHtml(lg) {
    const { rows, t, sumIn, sumOut, dep } = seasonTotals(lg);
    if (!rows.length) return '<p class="note">Nothing to break down until a matchday has been played.</p>';
    const rev = [['Ticket sales', sumIn('tickets')], ['Food, drink and programmes', sumIn('matchday')], ['Broadcasting rights', sumIn('broadcast')], ['Sponsorship', sumIn('sponsor')], ['Advertising boards', sumIn('advert')], ['Merchandise', sumIn('merch')], ['League prize money', sumIn('prize')]].filter((r) => r[1] || r[0] !== 'League prize money');
    const fixed = [['Wages', sumOut('wages')], ['Stadium and administration', sumOut('admin')], ['Marketing', sumOut('marketing')], ['Depreciation', dep], ['Interest', t.interest]];
    const variable = [['Matchday running costs', sumOut('matchday')], ['Cost of merchandise', sumOut('merchCost')]];
    const tf = fixed.reduce((a, r) => a + r[1], 0), tv = variable.reduce((a, r) => a + r[1], 0);
    const lines = (arr, total) => arr.map(([l, v]) => `<tr><td class="l">${l}</td>${cell(v)}<td class="n">${pct(v, total)}</td></tr>`).join('');
    const home = rows.filter((e) => e.home), att = home.reduce((a, e) => a + e.attTotal, 0);
    const perHeadRev = att ? (sumIn('tickets') + sumIn('matchday')) / att : 0, perHeadVar = att ? sumOut('matchday') / att : 0, contribution = perHeadRev - perHeadVar;
    const other = sumIn('broadcast') + sumIn('sponsor') + sumIn('advert') + sumIn('prize') + (sumIn('merch') - sumOut('merchCost'));
    const fixedSeason = tf - other;
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
        <tr><td class="l">Fixed costs not covered by sponsors, TV, prize money and merchandise</td><td class="n${fixedSeason < 0 ? ' neg' : ''}">${gbp(fixedSeason)}</td></tr>
        <tr class="tot"><td class="l">Break-even attendance over the season (fixed ÷ contribution)</td><td class="n">${num(be)} supporters</td></tr>
        <tr><td class="l">Actual attendance over the season</td><td class="n">${num(att)} supporters</td></tr>
        <tr><td class="l">Margin of safety</td><td class="n${att - be < 0 ? ' neg' : ''}">${num(att - be)} supporters</td></tr></tbody></table></div>` : ''}`;
  }

  function signingsHtml(lg) {
    const b = FM.biz(lg);
    if (!b.signings.length) return '<p class="note">No signings yet. Every player the club buys is recorded here, with what he cost and what he is worth now.</p>';
    const played = lg.fixtures.filter((f) => f.played && (f.homeId === lg.userId || f.awayId === lg.userId)).length;
    const rows = b.signings.map((s) => {
      const p = FM.findPlayer(lg, s.pid), value = p ? Math.round(FM.valueOf(p) * 1e6) : 0, apps = p && p.stats ? p.stats.apps : 0, goals = p && p.stats ? p.stats.goals : 0;
      const wageCost = Math.round(s.wage * 1000 * Math.max(0, played - s.round));
      const club = p ? FM.clubOf(lg, p) : null, status = s.sold ? 'Sold' : club && club.id !== lg.userId ? 'Left the club' : '';
      return { s, value, apps, goals, wageCost, status };
    });
    return `<div class="books-wrap"><table class="books-table"><thead><tr><th class="l">Player</th><th>Fee</th><th>Wage a week</th><th>Wages paid</th><th>Book value</th><th>Market value</th><th>Gain or loss if sold</th><th>Apps</th><th>Goals</th><th>Cost per app</th></tr></thead><tbody>${rows.map((r) => {
      const gain = r.s.sold ? r.s.sold.fee - r.s.fee : r.value - r.s.book;
      return `<tr><td class="l">${esc(r.s.name)}<br><small>${r.status || ('signed in season ' + r.s.season + ', ' + r.s.years + ' years')}</small></td>${cell(r.s.fee)}${cell(r.s.wage * 1000)}${cell(r.wageCost)}${cell(r.s.sold ? 0 : r.s.book)}${cell(r.s.sold ? r.s.sold.fee : r.value)}${cell(gain)}<td class="n">${r.apps}</td><td class="n">${r.goals}</td><td class="n">${r.apps ? gbp((r.s.fee + r.wageCost) / r.apps) : '–'}</td></tr>`;
    }).join('')}<tr class="tot"><td class="l">All signings</td>${cell(rows.reduce((a, r) => a + r.s.fee, 0))}<td></td>${cell(rows.reduce((a, r) => a + r.wageCost, 0))}<td></td><td></td><td></td><td class="n">${rows.reduce((a, r) => a + r.apps, 0)}</td><td class="n">${rows.reduce((a, r) => a + r.goals, 0)}</td><td></td></tr></tbody></table></div>`;
  }

  // The Board only shows the club's figures. Everything that changes something is done in the Workbook (by hand, or by asking the agent).
  const wbBtn = () => '';   // changes are made in the Workbook; the Board only shows the figures

  // ---------- offers from companies ----------
  const offerCard = (lg, o, bind) => {
    const talk = (o.talk || []).slice(-2).map((t) => `<p class="neg-reply">${esc(t)}</p>`).join('');
    return `<div class="offer" data-offer-card="${o.id}"><div class="offer-top"><div><b>${esc(o.company)}</b><br><small>${esc(FM.bizOfferText(o))}</small></div>
      <div class="row offer-btns"><button type="button" class="primary" data-oa="accept" data-id="${o.id}">Accept</button><button type="button" data-oa="decline" data-id="${o.id}">Reject</button></div></div>${talk}</div>`;
  };
  // Buttons for offers anywhere (the Board page, and a story in the News).
  FM.bizBindOffers = function (root, lg, after) {
    root.querySelectorAll('[data-oa]').forEach((btn) => btn.addEventListener('click', () => {
      const id = btn.dataset.id, act = btn.dataset.oa;
      const offer = FM.biz(lg).offers.find((x) => x.id === id);
      if (act === 'accept') { FM.bizOffer(lg, id, true); if (offer) okMsg('Accepted.', `${offer.company}: ${gbp(offer.perRound)} a matchday for ${offer.rounds} matchdays, ${gbp(offer.perRound * offer.rounds)} in all.`); after(); }
      else if (act === 'decline') { FM.bizOffer(lg, id, false); if (offer) okMsg('Rejected.', `${offer.company}: ${gbp(offer.perRound)} a matchday.`); after(); }
      else if (act === 'negotiate') { st.neg[id] = !st.neg[id]; const card = root.querySelector(`[data-offer-card="${id}"] .neg`); if (card) card.classList.toggle('open', !!st.neg[id]); }
      else if (act === 'counter') {
        const input = root.querySelector(`[data-ask="${id}"]`); st.neg[id] = true;
        FM.bizNegotiate(lg, id, input ? input.value : 0);
        after();
      }
    }));
  };
  FM.bizOfferBlock = function (lg, id) {
    const o = FM.biz(lg).offers.find((x) => x.id === id);
    if (!o) return '';
    if (o.status !== 'open') return `<p class="note offer-done">${{ accepted: 'You accepted this offer.', declined: 'You declined this offer.', walked: 'They walked away from the talks.' }[o.status] || 'This offer has run out.'}</p>${(o.talk || []).slice(-2).map((t) => `<p class="neg-reply">${esc(t)}</p>`).join('')}`;
    return offerCard(lg, o);
  };

  // ---------- the tabs ----------
  const STATE_WORD = { 'on track': 'On track', 'behind': 'Behind', 'met': 'Met', 'missed': 'Missed', 'failed': 'Failed', 'not started': 'Not started' };
  function overview(lg) {
    const b = FM.biz(lg), ap = FM.bizApprovals(lg), board = lg.board || {}, objs = FM.bizObjectives(lg), pz = FM.bizPrize(lg);
    const overall = Math.round((ap.financial + ap.football) / 2);
    const mood = overall >= 70 ? 'The shareholders are delighted with the way the club is being run.' : overall >= 55 ? 'The shareholders are content, and watching.' : overall >= 40 ? 'The shareholders have questions about the direction of the club.' : 'The shareholders are losing patience.';
    const finWords = ap.financial >= 70 ? 'They like what they see in the accounts.' : ap.financial >= 45 ? 'They want to see more profit.' : 'The accounts worry them.';
    const footWords = ap.football >= 70 ? 'They are happy with results on the pitch.' : ap.football >= 45 ? 'They expect a better league position.' : 'They are unhappy with results on the pitch.';
    const news = (lg.news || []).filter((n) => n.kind === 'Board').slice(-3).reverse();
    const warn = b.conf.low ? `<p class="banner warn">The shareholders have lost faith for ${b.conf.low} matchday${b.conf.low === 1 ? '' : 's'} running. If it goes on, they will call a vote of no confidence.</p>` : '';
    return `<div class="two"><div style="display:grid;gap:16px">
      <div class="card"><div class="eyebrow">${T('stakeholders', 'The shareholders')}</div><h2>${esc(FM.teamById(lg, lg.userId).name)} PLC</h2><p class="desc">${esc(mood)} ${esc(finWords)} ${esc(footWords)}</p>${warn}
        <div class="home-approvals">${meter('Approval of the finances', ap.financial)}${meter('Approval of the football', ap.football)}</div>
        <div class="board-money"><span>Share price<b>£${ap.share.toFixed(2)}</b></span><span>Shares in issue<b>${num(b.shares.issued)}</b></span><span>Cash in the bank<b${b.cash < 0 ? ' class="neg"' : ''}>${gbp(b.cash)}</b></span></div></div>
      <div class="card"><div class="eyebrow">${T('aims', 'Their aims and objectives this season')}</div>
        <div class="books-wrap"><table class="books-table objectives"><thead><tr><th class="l">${T('aims', 'Aim')}</th><th class="l">${T('aims', 'Objective')}</th><th>Now</th><th>Status</th></tr></thead><tbody>${objs.map((o) => `<tr><td class="l"><b>${esc(o.aim)}</b></td><td class="l">${esc(o.title)}</td><td class="n">${esc(o.value)}</td><td class="n st-${o.state.replace(' ', '-')}">${STATE_WORD[o.state] || o.state}</td></tr>`).join('')}</tbody></table></div>
        <p class="note">Expected league finish: ${board.expectedPosition ? ord(board.expectedPosition) : '–'} in the ${esc(lg.divisionName)}.${board.expectReason ? ' ' + esc(board.expectReason) : ''}</p></div></div>
      <div style="display:grid;gap:16px">
      <div class="card"><div class="eyebrow">League prize money</div><div class="books-wrap"><table class="books-table"><thead><tr><th class="l">Finishing position</th><th>Prize money</th></tr></thead><tbody>${pz.table.map((v, i) => `<tr class="${i + 1 === pz.position ? 'key' : ''}"><td class="l">${ord(i + 1)}${i + 1 === pz.position ? ' (the club now)' : ''}</td>${cell(v)}</tr>`).join('')}</tbody></table></div><p class="note">Paid at the end of the season, by where the club finishes in the ${esc(lg.divisionName)}.</p></div>
      <div class="card"><div class="eyebrow">From the boardroom</div>${news.length ? news.map((n) => `<p class="desc"><b>${esc(n.headline)}</b><br>${esc(n.body)}</p>`).join('') : '<p class="note">Nothing yet. The shareholders write when something in the accounts needs saying.</p>'}</div></div></div>`;
  }

  const nextHome = (lg) => lg.fixtures.filter((f) => f.homeId === lg.userId).sort((a, b) => a.round - b.round).find((f) => !f.played) || null;
  function matchday(lg) {
    const b = FM.biz(lg), fx = nextHome(lg), last = b.ledger.filter((e) => e.home).slice(-1)[0];
    const inputs = FM.SEGMENTS.map((s) => `<tr><td class="l"><b>${esc(s.name)}</b><br><small>${esc(s.who)}</small></td><td class="n">${num(b.seats[s.id])}</td>
        <td class="n"><b>£${b.prices[s.id].price}</b></td>
        <td class="n">${last ? num(last.att[s.id]) + '<br><small>at £' + last.prices[s.id] + '</small>' : '–'}</td></tr>`).join('');
    const home = b.ledger.filter((e) => e.home).slice(-8).reverse();
    const away = b.ledger.filter((e) => !e.home).slice(-8).reverse();
    return `<div style="display:grid;gap:16px"><div class="card"><h2>Ticket prices</h2>
      <p class="desc">${fx ? `Next home match: <b>${esc(FM.teamById(lg, fx.awayId).name)}</b> (round ${fx.round + 1}). The crowd is counted at the final whistle.` : 'No home matches left this season. The prices stay set for next season.'}</p>
      <div class="books-wrap"><table class="books-table prices"><thead><tr><th class="l">Stand</th><th>Seats</th><th>Price</th><th>${last ? 'Sold at the last home match' : 'Last home match'}</th></tr></thead><tbody>${inputs}</tbody></table></div>
      <p class="note">${T('segments', 'Why each stand has its own price')} · ${T('elasticity', 'How fans react when a price changes')} · ${T('revenue', 'What revenue is')}</p>
      <p class="desc">${T('marketing', 'Marketing budget a matchday')}: <b>${gbp(b.marketing || 0)}</b></p>${FM.bizLeverCard ? FM.bizLeverCard(lg) : ''}
      <div class="row">${wbBtn('setTicketPrice', 'Change a ticket price')}${wbBtn('setMarketing', 'Change the marketing budget')}</div></div>
      <div class="card"><h2>Home matches so far</h2>${home.length ? `<div class="books-wrap"><table class="books-table"><thead><tr><th class="l">Opponent</th>${FM.SEGMENTS.map((s) => `<th>${esc(s.name)}</th>`).join('')}<th>Crowd</th><th>Full</th><th>Turned away</th><th>Ticket income</th></tr></thead><tbody>${home.map((e) => `<tr><td class="l">Round ${e.round}: ${esc(e.opp)}</td>${FM.SEGMENTS.map((s) => `<td class="n">${num(e.att[s.id])}<br><small>at £${e.prices[s.id]}</small></td>`).join('')}<td class="n">${num(e.attTotal)}</td><td class="n">${pct(e.attTotal, e.capacity || FM.bizCapacity(lg))}</td><td class="n">${num(e.away)}</td>${cell(e.inflow.tickets)}</tr>`).join('')}</tbody></table></div>` : '<p class="note">The first home match will show up here.</p>'}</div>
      <div class="card"><h2>Away matches so far</h2>${away.length ? `<div class="books-wrap"><table class="books-table"><thead><tr><th class="l">Opponent</th><th>Share of the gate</th></tr></thead><tbody>${away.map((e) => `<tr><td class="l">Round ${e.round}: ${esc(e.opp)}</td>${cell(e.inflow.tickets)}</tr>`).join('')}</tbody></table></div><p class="note">Away from home the club takes a share of the gate at the other ground. It is much less than a home match brings in, because the home club keep most of it.</p>` : '<p class="note">The first away match will show up here. The club takes a share of the gate at the other ground.</p>'}</div></div>`;
  }

  function stadium(lg) {
    const b = FM.biz(lg), B = FM.bizBuild, msg = st.msg ? `<p class="banner warn" role="status">${esc(st.msg)}</p>` : '';
    const stands = FM.SEGMENTS.map((s) => {
      const e = FM.EXPANSIONS[s.id], room = B.standRoom(lg, s.id), proj = b.projects.find((p) => p.kind === 'stand' && p.stand === s.id), cost = B.standCost(s.id);
      return `<tr><td class="l"><b>${esc(s.name)}</b><br><small>${esc(s.who)}</small></td><td class="n">${num(b.seats[s.id])}</td><td class="n">${proj ? '+' + num(proj.seats) + ' in ' + proj.left + ' matchday' + (proj.left === 1 ? '' : 's') : '–'}</td>
        <td class="n">${room >= e.seats ? `${num(e.seats)} more seats: ${gbp(cost)}${proj ? '' : '<br>' + wbBtn('buildStand:' + s.id, 'Arrange in the Workbook')}` : 'No more room'}</td></tr>`;
    }).join('');
    const facs = FM.FACILITIES.map((f) => {
      const have = b.facilities.indexOf(f.id) >= 0;
      return `<tr><td class="l"><b>${esc(f.name)}</b><br><small>${esc(f.text)}</small></td>${cell(f.cost)}${cell(f.upkeep)}<td class="n">${have ? 'Built' : wbBtn('buyFacility:' + f.id, 'Buy in the Workbook')}</td></tr>`;
    }).join('');
    return `<div style="display:grid;gap:16px">${msg}<div class="card"><h2>The ground</h2><div class="board-money"><span>Capacity<b>${num(FM.bizCapacity(lg))}</b></span><span>Cash in the bank<b${b.cash < 0 ? ' class="neg"' : ''}>${gbp(b.cash)}</b></span><span>Stadium and facilities, at cost<b>${gbp(b.assets.cost)}</b></span></div>
      <div class="books-wrap"><table class="books-table"><thead><tr><th class="l">Stand</th><th>Seats</th><th>Being built</th><th></th></tr></thead><tbody>${stands}</tbody></table></div>
      <p class="note">A new block of seats takes ${FM.bizConst.BUILD_TIME} matchdays to build and is paid for up front. Every seat added costs a little more to look after each matchday. ${T('investment', 'Is it worth it? Payback and return')}</p></div>
      <div class="card"><h2>${T('investment', 'Buy for the club')}</h2><div class="books-wrap"><table class="books-table"><thead><tr><th class="l">Purchase</th><th>Cost</th><th>Upkeep a matchday</th><th></th></tr></thead><tbody>${facs}</tbody></table></div><p class="note">Paid for from the bank. If there is not enough cash, see Sources of finance.</p></div></div>`;
  }

  function books(lg) {
    const tabs = [['cash', 'Cash flow'], ['profit', 'Profit'], ['balance', 'Balance sheet'], ['costs', 'Revenue and costs'], ['signings', 'Signings']];
    const body = st.books === 'cash' ? FM.bizCashFlowHtml(lg) : st.books === 'profit' ? FM.bizProfitHtml(lg) : st.books === 'balance' ? FM.bizBalanceHtml(lg) : st.books === 'costs' ? costsHtml(lg) : signingsHtml(lg);
    return `<div class="card"><h2>The books</h2><div class="row books-tabs">${tabs.map(([k, l]) => `<button type="button" data-books="${k}" class="${st.books === k ? 'on' : ''}">${l}</button>`).join('')}</div>${st.books === 'costs' ? `<p class="note">${T('costs', 'Fixed and variable costs')} · ${T('breakeven', 'Break-even')} · ${T('ratios', 'Profit margins and returns')} · ${T('liquidity', 'Liquidity')}</p>` : ''}${body}</div>`;
  }

  function finance(lg) {
    const b = FM.biz(lg), S = FM.bizSources, od = b.cash < 0 ? -b.cash : 0, pol = Math.round((b.dividend.policy || 0) * 100);
    const loans = b.loans.length ? `<div class="books-wrap"><table class="books-table"><thead><tr><th class="l">Loan</th><th>Borrowed</th><th>Owed</th><th>Interest</th><th>Each matchday</th></tr></thead><tbody>${b.loans.map((l) => `<tr><td class="l">${l.id} · season ${l.season}</td>${cell(l.principal)}${cell(l.balance)}<td class="n">${Math.round(l.rate * 1000) / 10}%</td>${cell(l.perRound)}</tr>`).join('')}</tbody></table></div>` : '';
    return `<div class="card"><h2>Finance</h2>
      <div class="board-money"><span>Cash in the bank<b${b.cash < 0 ? ' class="neg"' : ''}>${gbp(b.cash)}</b></span><span>Overdraft limit<b>${gbp(S.overdraft.limit)}</b></span><span>Overdraft in use<b>${gbp(od)}</b></span><span>Overdraft rate<b>${Math.round(S.overdraft.rate * 100)}%</b></span>
      <span>Shares in issue<b>${num(b.shares.issued)}</b></span><span>Share price<b>£${b.shares.price.toFixed(2)}</b></span><span>Dividend policy<b>${pol}%</b></span><span>Dividends paid<b>${gbp(b.dividendsPaid || 0)}</b></span></div>${loans}</div>`;
  }
  function commercial(lg) {
    const b = FM.biz(lg), open = b.offers.filter((o) => o.status === 'open'), gone = b.offers.filter((o) => o.status === 'walked').slice(-2);
    const deals = b.sponsors.map((s) => `<tr><td class="l">${esc(s.kind)}</td><td class="l">${esc(s.company)}</td>${cell(s.perRound)}<td class="n">${s.left}</td></tr>`).join('');
    const slots = []; for (let i = 0; i < 8; i++) { const a = b.boards[i]; slots.push(a ? `<tr><td class="l">Board ${i + 1}</td><td class="l">${esc(a.company)}</td>${cell(a.perRound)}<td class="n">${a.left}</td></tr>` : `<tr class="empty"><td class="l">Board ${i + 1}</td><td class="l" colspan="3">Empty: no advertiser yet</td></tr>`); }
    return `<div style="display:grid;gap:16px"><div class="card"><h2>Offers waiting</h2>${open.length ? open.map((o) => offerCard(lg, o)).join('') : '<p class="note">No offers at the moment. Companies get in touch after matches; they also appear in the News.</p>'}${gone.map((o) => `<p class="note">${esc(o.company)} walked away from the talks.</p>`).join('')}</div>
      <div class="card"><h2>${T('sponsors', 'Sponsors')}</h2><div class="books-wrap"><table class="books-table"><thead><tr><th class="l">Deal</th><th class="l">Company</th><th>A matchday</th><th>Matchdays left</th></tr></thead><tbody>${deals || '<tr><td class="l" colspan="4">No sponsors.</td></tr>'}</tbody></table></div></div>
      <div class="card"><h2>${T('sponsors', 'Advertising boards')}</h2><div class="books-wrap"><table class="books-table"><thead><tr><th class="l">Board</th><th class="l">Company</th><th>A matchday</th><th>Matchdays left</th></tr></thead><tbody>${slots.join('')}</tbody></table></div></div></div>`;
  }


  // ---------- the money report: last match, where the club stands, where it is heading and what to do about it ----------
  const OUT_NAMES = { wages: 'Wages', matchday: 'Matchday running costs', merchCost: 'Cost of merchandise', marketing: 'Marketing', admin: 'Stadium and administration', fees: 'Transfer fees', capex: 'Stadium and facilities', loans: 'Loan repayments', interest: 'Interest', tax: 'Corporation tax', dividends: 'Dividends' };
  const IN_NAMES = { tickets: 'Ticket sales', matchday: 'Food, drink and programmes', broadcast: 'Broadcasting rights', sponsor: 'Sponsorship', advert: 'Advertising boards', merch: 'Merchandise', prize: 'League prize money', sales: 'Player sales', loans: 'Loans taken', shares: 'Shares issued' };
  const sumv = (o) => Object.keys(o || {}).reduce((a, k) => a + (o[k] || 0), 0);
  function spark(cols, limit) {
    const W = 600, H = 130, P = 8, vals = cols.map((c) => c.closing).concat([0, -limit]), lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), span = Math.max(1, hi - lo);
    const x = (i) => P + (W - 2 * P) * (cols.length < 2 ? 0.5 : i / (cols.length - 1)), y = (v) => P + (H - 2 * P) * (1 - (v - lo) / span);
    const pts = cols.map((c, i) => [x(i), y(c.closing), c.actual]);
    const split = pts.findIndex((q) => !q[2]), a = (split < 0 ? pts : pts.slice(0, Math.max(split, 1))), f = split < 0 ? [] : pts.slice(Math.max(split - 1, 0));
    const path = (q) => q.map((t, i) => (i ? 'L' : 'M') + t[0].toFixed(1) + ' ' + t[1].toFixed(1)).join(' ');
    return `<svg class="rep-spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="Bank balance by matchday, played and forecast"><line x1="${P}" x2="${W - P}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}" stroke="currentColor" stroke-opacity=".35"/><line x1="${P}" x2="${W - P}" y1="${y(-limit).toFixed(1)}" y2="${y(-limit).toFixed(1)}" stroke="#ff8a7a" stroke-dasharray="4 4"/><text x="${W - P}" y="${(y(-limit) - 4).toFixed(1)}" text-anchor="end" font-size="11" fill="#ff8a7a">overdraft limit</text><text x="${P}" y="${(y(0) - 4).toFixed(1)}" font-size="11" fill="currentColor" fill-opacity=".7">£0</text>${a.length > 1 ? `<path d="${path(a)}" fill="none" stroke="#7FD49A" stroke-width="2.5"/>` : ''}${f.length > 1 ? `<path d="${path(f)}" fill="none" stroke="#FFE27A" stroke-width="2.5" stroke-dasharray="6 5"/>` : ''}</svg>`;
  }
  function advice(lg) {
    const b = FM.biz(lg), cols = FM.bizCashFlow(lg), K = FM.bizConst, limit = FM.bizSources.overdraft.limit, rows = b.ledger.filter((e) => e.season === lg.season), last = b.ledger[b.ledger.length - 1];
    const fut = cols.filter((c) => !c.actual), end = cols.length ? cols[cols.length - 1].closing : b.cash;
    const neg = fut.find((c) => c.closing < 0), over = fut.find((c) => c.closing < -limit);
    const low = cols.reduce((m, c) => (!m || c.closing < m.closing ? c : m), null);
    const revYear = rows.reduce((a, e) => a + e.pl.revenue, 0), wagesYear = rows.reduce((a, e) => a + (e.outflow.wages || 0), 0);
    const repay = b.loans.reduce((a, l) => a + Math.min(l.balance, l.perRound), 0), owed = b.loans.reduce((a, l) => a + l.balance, 0);
    const homeRows = rows.filter((e) => e.home), lastHome = homeRows[homeRows.length - 1];
    const w = [];
    const S = (label, tab, books) => ({ label, tab, books });
    if (over) w.push({ sev: 'bad', title: `Boss, the club goes past its overdraft limit in round ${over.round}`, why: `The forecast takes the bank balance to ${gbp(over.closing)}, which is beyond the ${gbp(limit)} [[overdraft|overdraft]] limit the bank allows. Past that limit the interest rate jumps and the bank stops the club spending, so there would be no signings and no building.`, fix: [S('Raise ticket prices', 'matchday'), S('Look at sponsors', 'commercial'), S('Borrow or raise shares', 'finance'), S('Sell a player', 'recruit')] });
    else if (neg) w.push({ sev: 'warn', title: `Boss, the bank balance goes below zero in round ${neg.round}`, why: `At today's prices, wages and deals the forecast ends the season at ${gbp(end)}. Going below zero puts the club in its [[overdraft|overdraft]], which costs ${Math.round(FM.bizSources.overdraft.rate * 100)}% a year in interest and worries the shareholders.`, fix: [S('Ticket prices', 'matchday'), S('Sponsor offers', 'commercial'), S('See the cash flow', 'books', 'cash')] });
    if (revYear > 0 && wagesYear / revYear > 0.7) w.push({ sev: 'warn', title: `Boss, wages are eating ${Math.round(100 * wagesYear / revYear)}% of what the club earns`, why: `Of every £100 of revenue this season, about £${Math.round(100 * wagesYear / revYear)} has gone on wages. That leaves too little for the [[costs|running costs]], interest and any [[profit|profit]], and the shareholders judge the accounts on profit.`, fix: [S('See revenue and costs', 'books', 'costs'), S('Sell a player', 'recruit'), S('Grow income: sponsors', 'commercial')] });
    if (b.loans.length && repay > 0 && fut.length) { const avgNet = fut.reduce((a, c) => a + sumv(c.inflow) - sumv(c.outflow), 0) / fut.length; if (avgNet < 0) w.push({ sev: 'warn', title: `Boss, you still owe ${gbp(owed)} and the repayments are weighing on the club`, why: `Each matchday ${gbp(repay)} goes on repaying [[loans|loans]], plus [[loans|interest]]. The forecast is losing ${gbp(-avgNet)} a matchday on average, so the debt is making the gap wider.`, fix: [S('See the loans', 'finance'), S('See the balance sheet', 'books', 'balance')] }); }
    if (lastHome && lastHome.away > 0 && lastHome.capacity && lastHome.attTotal >= 0.97 * lastHome.capacity) w.push({ sev: 'good', title: `Boss, the ground is full and ${num(lastHome.away)} fans were turned away`, why: `That is ticket income the club could have had. Either raise the prices a little, or build more seats so more people can come.`, fix: [S('Raise ticket prices', 'matchday'), S('Expand the stadium', 'stadium')] });
    else if (lastHome && lastHome.capacity && lastHome.attTotal < 0.6 * lastHome.capacity) w.push({ sev: 'warn', title: `Boss, the last home crowd filled only ${Math.round(100 * lastHome.attTotal / lastHome.capacity)}% of the ground`, why: `Empty seats earn nothing. Prices may be above what the fans will pay, or the club needs more marketing to bring them in.`, fix: [S('Lower prices or add marketing', 'matchday')] });
    const empty = 8 - b.boards.length;
    if (empty >= 4) w.push({ sev: 'info', title: `Boss, ${empty} of the 8 advertising boards are empty`, why: 'An empty board earns nothing. Companies get in touch after matches, and you can negotiate their price.', fix: [S('Commercial offers', 'commercial')] });
    if ((b.dividend.policy || 0) > 0.3 && end < 150000) w.push({ sev: 'warn', title: 'Boss, the dividend may be too generous for a club this short of cash', why: `The policy pays ${Math.round(b.dividend.policy * 100)}% of the year's [[profit|profit]] to [[shares|shareholders]], but the forecast leaves only ${gbp(end)} in the bank at the end of the season.`, fix: [S('Change the dividend', 'finance')] });
    if (!w.length) w.push({ sev: 'good', title: 'Boss, nothing in the accounts is worrying me', why: `The forecast ends the season with ${gbp(end)} in the bank${rows.length ? ` after a profit of ${gbp(rows.reduce((a, e) => a + e.pl.net, 0))} so far` : ''}. Keep an eye on it after each match.`, fix: [] });
    const all = ticketInsights(lg).concat(w).map((x, i) => Object.assign({}, x, { title: x.title.replace(/^Boss,\s*/, '').replace(/^./, (c) => c.toUpperCase()) }));
    return { w: all, cols, end, low, neg, over, limit, last, rows, repay, owed };
  }
  function report(lg) {
    const b = FM.biz(lg), A = advice(lg), bal = FM.bizBalance(lg), last = A.last, K = FM.bizConst;
    const worst = A.w.some((x) => x.sev === 'bad') ? 'bad' : A.w.some((x) => x.sev === 'warn') ? 'warn' : 'good';
    const who0 = addr(lg, 'h'), headline = { bad: `${who0}, we have a problem with the money.`, warn: `${who0}, the money needs watching.`, good: `${who0}, the money is in good shape.` }[worst];
    const yearNet = A.rows.reduce((a, e) => a + e.pl.net, 0);
    let lastHtml = '<p class="note">No matchday has been played yet, ${who0.toLowerCase()}. The report of each match appears here once it has.</p>';
    if (last) {
      const ins = Object.keys(IN_NAMES).filter((k) => (last.inflow[k] || 0) > 0).sort((x, y) => last.inflow[y] - last.inflow[x]), outs = Object.keys(OUT_NAMES).filter((k) => (last.outflow[k] || 0) > 0).sort((x, y) => last.outflow[y] - last.outflow[x]);
      const tin = sumv(last.inflow), tout = sumv(last.outflow), net = tin - tout, trade = last.pl.revenue;
      const topIn = ins.filter((k) => ['loans', 'shares', 'sales'].indexOf(k) < 0)[0], topOut = outs[0];
      lastHtml = `<p class="desc">${last.home ? 'Home' : 'Away'} against <b>${esc(last.opp)}</b> (round ${last.round}). ${last.home && last.attTotal ? `The crowd was ${num(last.attTotal)}${last.capacity ? ' of ' + num(last.capacity) : ''}${last.away ? ', with ' + num(last.away) + ' turned away' : ''}. ` : last.home ? '' : `Away from home the club takes a share of the gate: ${gbp(last.inflow.tickets)} from ${esc(last.opp)}'s crowd. `}Cash in was <b>${gbp(tin)}</b> and cash out was <b>${gbp(tout)}</b>, so the bank ${net >= 0 ? 'rose' : 'fell'} by <b class="${net < 0 ? 'neg' : ''}">${gbp(Math.abs(net))}</b>. ${topIn ? `The biggest source of money was ${IN_NAMES[topIn].toLowerCase()} (${gbp(last.inflow[topIn])}) ` : ''}${topOut ? `and the biggest cost was ${OUT_NAMES[topOut].toLowerCase()} (${gbp(last.outflow[topOut])}).` : ''} ${last.pl.net >= 0 ? `The match made a profit of ${gbp(last.pl.net)}.` : `The match made a loss of ${gbp(-last.pl.net)} once wages, running costs and the wear on the stadium and players are counted.`}</p>
        <div class="rep-two"><div class="books-wrap"><table class="books-table"><thead><tr><th class="l">Money in</th><th>£</th></tr></thead><tbody>${ins.map((k) => `<tr><td class="l">${IN_NAMES[k]}</td>${cell(last.inflow[k])}</tr>`).join('') || '<tr><td class="l" colspan="2">Nothing</td></tr>'}<tr class="tot"><td class="l">Total in</td>${cell(tin)}</tr></tbody></table></div>
        <div class="books-wrap"><table class="books-table"><thead><tr><th class="l">Money out</th><th>£</th></tr></thead><tbody>${outs.map((k) => `<tr><td class="l">${OUT_NAMES[k]}</td>${cell(-last.outflow[k])}</tr>`).join('') || '<tr><td class="l" colspan="2">Nothing</td></tr>'}<tr class="tot"><td class="l">Total out</td>${cell(-tout)}</tr></tbody></table></div></div>`;
    }
    const loans = b.loans.length ? `<div class="books-wrap"><table class="books-table"><thead><tr><th class="l">Loan</th><th>Still owed</th><th>Each matchday</th><th>Interest a matchday</th></tr></thead><tbody>${b.loans.map((l) => `<tr><td class="l">${l.id}, season ${l.season}</td>${cell(l.balance)}${cell(Math.min(l.balance, l.perRound))}${cell(Math.round(l.balance * l.rate / 14))}</tr>`).join('')}</tbody></table></div>` : `<p class="note">The club has no loans, ${who0.toLowerCase()}.</p>`;
    const next = A.cols.filter((c) => !c.actual)[0];
    const fc = A.cols.length ? `<p class="desc">${A.cols.some((c) => !c.actual) ? `Taking today's wages, deals, loans and the crowds you have been getting, I forecast the bank at <b class="${A.end < 0 ? 'neg' : ''}">${gbp(A.end)}</b> at the end of the season${A.low && A.low.closing < b.cash ? `, with the low point of <b class="${A.low.closing < 0 ? 'neg' : ''}">${gbp(A.low.closing)}</b> in round ${A.low.round}` : ''}.` : `The season is over, ${who0.toLowerCase()}. Here is how it finished.`}</p>${spark(A.cols, A.limit)}<p class="note"><span style="color:#7FD49A">Solid line</span>: matches played. <span style="color:#FFE27A">Dashed line</span>: forecast. The red line is the most the bank will let the club borrow.</p>` : '';
    const warns = A.w.map((x, i) => `<div class="rep-warn rep-${x.sev}"><h3>${esc(x.title)}</h3><p>${fmtT(esc(x.why))}</p>${x.fix.length ? `<div class="row">${x.fix.map((f) => `<button type="button" data-short="${f.tab}${f.books ? ':' + f.books : ''}">${esc(f.label)} →</button>`).join('')}</div>` : ''}</div>`).join('');
    return `<div style="display:grid;gap:16px"><div class="card rep-hero rep-${worst}"><div class="eyebrow">How the club is doing</div><h2>${esc(headline)}</h2><p class="desc">${esc(story(lg))}</p>
      <div class="board-money"><span>Cash in the bank<b${b.cash < 0 ? ' class="neg"' : ''}>${gbp(b.cash)}</b></span><span>Profit this season<b${yearNet < 0 ? ' class="neg"' : ''}>${gbp(yearNet)}</b></span><span>Owed on loans<b>${gbp(A.owed)}</b></span><span>Forecast, end of season<b${A.end < 0 ? ' class="neg"' : ''}>${gbp(A.end)}</b></span></div></div>
      <div class="card"><div class="eyebrow">What I would keep an eye on</div>${warns}</div>
      <div class="card"><div class="eyebrow">The last match</div>${resultContext(lg, last)}${lastHtml}</div>
      <div class="card"><div class="eyebrow">Where the club stands</div>
        <div class="board-money"><span>Owned: stadium and facilities<b>${gbp(bal.stadium)}</b></span><span>Owned: players<b>${gbp(bal.players)}</b></span><span>Owed: overdraft<b>${gbp(bal.overdraft)}</b></span><span>Owed: loans<b>${gbp(bal.loans)}</b></span></div>
        ${loans}<p class="note"><button type="button" data-short="books:balance">Full balance sheet →</button> <button type="button" data-short="finance">Loans and shares →</button></p></div>
      <div class="card"><div class="eyebrow">${T('cashflow', 'Where the money is heading')}</div>${fc}<p class="note"><button type="button" data-short="books:cash">Full cash flow forecast →</button></p></div></div>`;
  }

  // What custom spending (set up in the Workbook) is running now.
  // The Board's front page: where the shareholders stand, the aims, the bank balance by matchday, and the money in and out at the last match.
  function overviewMin(lg) {
    const b = FM.biz(lg), ap = FM.bizApprovals(lg), board = lg.board || {}, objs = FM.bizObjectives(lg), cols = FM.bizCashFlow(lg), limit = FM.bizSources.overdraft.limit, last = b.ledger[b.ledger.length - 1];
    const ins = last ? Object.keys(IN_NAMES).filter((k) => (last.inflow[k] || 0) > 0).sort((x, y) => last.inflow[y] - last.inflow[x]) : [], outs = last ? Object.keys(OUT_NAMES).filter((k) => (last.outflow[k] || 0) > 0).sort((x, y) => last.outflow[y] - last.outflow[x]) : [];
    const money = last ? `<div class="rep-two"><div class="books-wrap"><table class="books-table"><thead><tr><th class="l">Money in</th><th>£</th></tr></thead><tbody>${ins.map((k) => `<tr><td class="l">${IN_NAMES[k]}</td>${cell(last.inflow[k])}</tr>`).join('')}<tr class="tot"><td class="l">Total</td>${cell(sumv(last.inflow))}</tr></tbody></table></div>
        <div class="books-wrap"><table class="books-table"><thead><tr><th class="l">Money out</th><th>£</th></tr></thead><tbody>${outs.map((k) => `<tr><td class="l">${OUT_NAMES[k]}</td>${cell(-last.outflow[k])}</tr>`).join('')}<tr class="tot"><td class="l">Total</td>${cell(-sumv(last.outflow))}</tr></tbody></table></div></div>` : '';
    return `<div class="board-grid"><div class="card"><div class="eyebrow">Shareholders</div><div class="home-approvals">${meter('Finances', ap.financial)}${meter('Football', ap.football)}</div>
        <div class="books-wrap"><table class="books-table objectives"><thead><tr><th class="l">Objective</th><th>Now</th><th>Status</th></tr></thead><tbody>${objs.map((o) => `<tr><td class="l">${esc(o.title)}</td><td class="n">${esc(o.value)}</td><td class="n st-${o.state.replace(' ', '-')}">${STATE_WORD[o.state] || o.state}</td></tr>`).join('')}<tr><td class="l">Expected finish</td><td class="n" colspan="2">${board.expectedPosition ? ord(board.expectedPosition) : '–'}</td></tr></tbody></table></div></div>
      <div class="card"><div class="eyebrow">Bank balance</div>${cols.length ? spark(cols, limit) : ''}<div class="board-legend"><span class="a">Played</span><span class="f">Forecast</span><span class="r">Overdraft limit</span></div></div></div>
      ${last ? `<div class="card"><div class="eyebrow">Last matchday · round ${last.round} · ${last.home ? 'home' : 'away'} v ${esc(last.opp)}</div>${money}</div>` : ''}`;
  }
  // The money controls, all in one place: each row is the current figure and the input that changes it. They run through the same controls the Workbook uses.
  const CTL_CONFIRM = { buildStand: 'Start building?', buyFacility: 'Buy it?', takeLoan: 'Take this loan?', issueShares: 'Issue these shares?' };
  function controlsTab(lg) {
    const b = FM.biz(lg), C = FM.controls; if (!C) return '';
    const opts = (id, k) => (C.optionsFor(lg, C.ACTIONS[id].params.find((x) => x.k === k)) || []).map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');
    const row = (label, now, inputs, btn) => `<div class="ctl-row"><div class="ctl-l"><b>${label}</b><span>${now}</span></div><div class="ctl-in">${inputs}${btn}</div></div>`;
    const go = (action, label, extra) => `<button type="button" class="ctl-go" data-ctl="${action}"${extra || ''}>${label}</button>`;
    const inp = (k, v, step, min) => `<input type="number" data-k="${k}" value="${v}" step="${step}" min="${min}">`;
    const prices = FM.SEGMENTS.map((s) => `${esc(s.name)} £${b.prices[s.id].price}`).join(' · ');
    const stands = FM.SEGMENTS.map((s) => { const e = FM.EXPANSIONS[s.id], room = FM.bizBuild.standRoom(lg, s.id), proj = b.projects.find((q) => q.kind === 'stand' && q.stand === s.id), cost = FM.bizBuild.standCost(s.id);
      return `<tr><td class="l">${esc(s.name)}</td><td class="n">${num(b.seats[s.id])}</td><td class="n">${proj ? '+' + num(proj.seats) + ' · ' + proj.left + ' left' : '–'}</td>${cell(cost)}<td class="n">${room >= e.seats && !proj ? `<button type="button" class="ctl-go" data-ctl="buildStand" data-fix='{"stand":"${s.id}"}'>Add ${num(e.seats)} seats</button>` : proj ? 'Building' : 'Full'}</td></tr>`; }).join('');
    const facs = FM.FACILITIES.map((f) => { const have = b.facilities.indexOf(f.id) >= 0; return `<tr><td class="l">${esc(f.name)}</td>${cell(f.cost)}${cell(f.upkeep)}<td class="n">${have ? 'Built' : `<button type="button" class="ctl-go" data-ctl="buyFacility" data-fix='{"id":"${f.id}"}'>Buy</button>`}</td></tr>`; }).join('');
    const loans = b.loans.length ? `<div class="books-wrap"><table class="books-table"><thead><tr><th class="l">Loan</th><th>Owed</th><th>Each matchday</th><th></th></tr></thead><tbody>${b.loans.map((l) => `<tr><td class="l">${l.id} · season ${l.season}</td>${cell(l.balance)}${cell(l.perRound)}<td class="n"><button type="button" class="ctl-go" data-ctl="repayLoan" data-fix='{"id":"${l.id}"}'>Repay</button></td></tr>`).join('')}</tbody></table></div>` : '';
    return `<div class="card ctl-card"><div class="eyebrow">Money</div>
        ${row('Ticket price', prices, `<select data-k="stand">${opts('setTicketPrice', 'stand')}</select>${inp('price', 25, 1, 3)}`, go('setTicketPrice', 'Set'))}
        ${row('Marketing a matchday', gbp(b.marketing || 0), inp('perRound', b.marketing || 0, 500, 0), go('setMarketing', 'Set'))}
        ${row('Dividend', Math.round((b.dividend.policy || 0) * 100) + '% of profit', inp('percent', Math.round((b.dividend.policy || 0) * 100), 5, 0), go('setDividend', 'Set'))}
        ${row('Bank loan', b.loans.length ? b.loans.length + ' running' : 'None', `${inp('amount', 500000, 50000, 100000)}<select data-k="term">${opts('takeLoan', 'term')}</select>`, go('takeLoan', 'Borrow'))}
        ${row('Issue shares', num(b.shares.issued) + ' in issue', inp('amount', 500000, 50000, 100000), go('issueShares', 'Issue'))}${loans}</div>
      <div class="card ctl-card"><div class="eyebrow">Ground</div><div class="books-wrap"><table class="books-table"><thead><tr><th class="l">Stand</th><th>Seats</th><th>Building</th><th>Cost</th><th></th></tr></thead><tbody>${stands}</tbody></table></div>
        <div class="books-wrap"><table class="books-table"><thead><tr><th class="l">Facility</th><th>Cost</th><th>Upkeep</th><th></th></tr></thead><tbody>${facs}</tbody></table></div></div>`;
  }
  FM.bizBindControls = function (host, lg, after) {
    host.querySelectorAll('[data-ctl]').forEach((btn) => btn.addEventListener('click', () => {
      const id = btn.dataset.ctl, scope = btn.closest('.ctl-row') || btn, params = {};
      if (btn.dataset.fix) Object.assign(params, JSON.parse(btn.dataset.fix));
      scope.querySelectorAll('[data-k]').forEach((x) => { params[x.dataset.k] = x.value; });
      if (CTL_CONFIRM[id] && !window.confirm(CTL_CONFIRM[id])) return;
      const r = FM.controls.run(lg, id, params, 'manual');
      st.ok = r.ok ? { title: 'Done.', text: r.text } : { title: 'Not done.', text: r.text };
      after();
    }));
  };
  FM.bizLeverCard = function (lg) {
    const b = FM.biz(lg), live = (b.levers || []).filter((l) => l.left > 0); if (!live.length && !(b.rules || []).length) return '';
    const T2 = FM.controls ? FM.controls.TARGETS : {};
    return `<div class="board-levers"><div class="eyebrow">Custom spending and rules</div>${live.map((l) => `<p class="desc"><b>${esc(l.name)}</b>: ${gbp(l.perRound)} a matchday, ${l.left} matchdays left. ${l.effects.map((e) => (e.pct > 0 ? '+' : '') + e.pct + '% ' + esc((T2[e.target] || {}).label || e.target)).join(', ')}.</p>`).join('')}${(b.rules || []).map((r) => `<p class="desc"><b>Rule: ${esc(r.name)}</b> (has run ${r.fired || 0} time${r.fired === 1 ? '' : 's'})</p>`).join('')}</div>`;
  };
  FM.bizReportHtml = report;
  // ---------- the page ----------
  FM.renderBoard = function (host, lg, hooks) {
    const save = (hooks && hooks.save) || (() => {}), go = (hooks && hooks.goto) || (() => {});
    const b0 = FM.biz(lg);
    FM.bizSyncBudget(lg);
    const BL = FM.booksLearn;
    st.tab = BL && BL.isTab(st.tab) ? st.tab : (TAB_OF[st.tab] || 'home');
    const tabs = [['home', 'Overview'], ['ground', 'Tickets'], ['funding', 'Finance'], ['books', 'Accounts'], ['controls', 'Controls']].concat(BL ? BL.tabs(lg) : []);
    if (BL && !document.getElementById('bkCss')) { const sty = document.createElement('style'); sty.id = 'bkCss'; sty.textContent = FM.booksLearnCss; document.head.appendChild(sty); }
    const NAMES = Object.assign({}, ...tabs.map(([k, l]) => ({ [k]: l })));
    const ap0 = FM.bizApprovals(lg), yr0 = FM.bizSeasonSum(lg, 'net');
    const owed = b0.loans.reduce((a, l) => a + l.balance, 0), endBal = (() => { const c = FM.bizCashFlow(lg); return c.length ? c[c.length - 1].closing : b0.cash; })();
    const strip = `<div class="board-strip"><span>Cash<b${b0.cash < 0 ? ' class="neg"' : ''}>${gbp(b0.cash)}</b></span><span>Profit this season<b${yr0 < 0 ? ' class="neg"' : ''}>${gbp(yr0)}</b></span><span>Forecast, season end<b${endBal < 0 ? ' class="neg"' : ''}>${gbp(endBal)}</b></span><span>Owed on loans<b>${gbp(owed)}</b></span><span>Approval<b>${Math.round((ap0.financial + ap0.football) / 2)}%</b></span><span>Share price<b>£${ap0.share.toFixed(2)}</b></span></div>`;
    const back = false && st.trail.length ? `<button type="button" class="board-back" id="bzBack">← Back to ${esc(NAMES[st.trail[st.trail.length - 1].tab] || 'the board')}</button>` : '';
    const sec = (id, html) => `<div id="sec-${id}" class="board-sec">${html}</div>`;
    const body = BL && BL.isTab(st.tab) ? BL.html(lg, st.tab) : st.tab === 'home' ? overviewMin(lg) : st.tab === 'ground' ? `<div style="display:grid;gap:22px">${sec('matchday', matchday(lg))}${sec('stadium', stadium(lg))}</div>` : st.tab === 'books' ? books(lg) : st.tab === 'controls' ? controlsTab(lg) : `<div style="display:grid;gap:22px">${sec('finance', finance(lg))}${sec('commercial', commercial(lg))}</div>`;
    const ro = '';
    host.innerHTML = `<div class="board-page">${strip}<div class="board-nav"><div class="row board-tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" data-tab="${k}" class="${st.tab === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>${st.ok ? `<p class="banner ok" role="status"><b>${esc(st.ok.title)}</b> ${esc(st.ok.text)}</p>` : ''}${body}</div>`;
    const redo = () => FM.renderBoard(host, lg, hooks);
    if (st.anchor) { const target = host.querySelector('#sec-' + st.anchor); st.anchor = null; if (target && target.scrollIntoView) target.scrollIntoView(); }
    host.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { if (FM.booksCases && b.dataset.tab === 'bk:papers') FM.booksCases.reset(); st.tab = BL && BL.isTab(b.dataset.tab) ? b.dataset.tab : (TAB_OF[b.dataset.tab] || 'home'); st.trail = []; st.msg = ''; st.ok = null; redo(); }));
    host.querySelectorAll('[data-btab]').forEach((b) => b.addEventListener('click', () => { st.tab = TAB_OF[b.dataset.btab] || 'home'; st.trail = []; st.msg = ''; st.ok = null; redo(); }));
    // shortcuts from the money report: they remember where they came from, so there is always a way back
    host.querySelectorAll('[data-short]').forEach((b) => b.addEventListener('click', () => {
      const [t, sub] = b.dataset.short.split(':');
      if (t === 'recruit') { go('recruit'); return; }
      st.trail.push({ tab: st.tab, books: st.books }); st.tab = TAB_OF[t] || 'home'; st.anchor = ANCHORS[t] ? t : null; if (sub) st.books = sub; st.msg = ''; st.ok = null; redo(); if (!st.anchor) window.scrollTo(0, 0);
    }));
    if (BL) { try { BL.bind(host, lg, redo, save, go); } catch (e) { console.error('The Books:', e); } }
    const bk = host.querySelector('#bzBack');
    if (bk) bk.addEventListener('click', () => { const prev = st.trail.pop(); if (prev) { st.tab = prev.tab; st.books = prev.books; } redo(); window.scrollTo(0, 0); });
    if (FM.bizBindOffers) FM.bizBindOffers(host, lg, () => { save(); redo(); });
    FM.bizBindControls(host, lg, () => { save(); redo(); });
    host.querySelectorAll('[data-books]').forEach((b) => b.addEventListener('click', () => { st.books = b.dataset.books; redo(); }));
    host.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => go(b.dataset.goto)));
    if (FM.mountRafael && !document.getElementById('lmRafael')) FM.mountRafael(() => (FM.agentContext ? FM.agentContext(lg, 'the books') : ''));
    if (FM.rafaelHide) FM.rafaelHide(false);
    if (!b0.rafaelSeen && !document.getElementById('rafaelWelcome')) {
      const m = document.createElement('div'); m.id = 'rafaelWelcome'; m.className = 'cap-modal';
      m.innerHTML = '<div class="card" style="max-width:520px;margin:12vh auto 0;position:relative;padding:24px 24px 64px;display:grid;gap:10px"><div class="eyebrow">Director of Finance</div><h2 style="margin:0">Rafael Morales</h2><p class="desc">Welcome to The Books. I am Rafael Morales, the Director of Finance at Ashford Rovers plc. I look after the money, and I would like to give you a short introduction to how the club works as a business.</p><button type="button" class="primary" id="rafaelOk" style="position:absolute;right:18px;bottom:16px">OK</button></div>';
      document.body.appendChild(m);
      m.querySelector('#rafaelOk').addEventListener('click', () => {
        m.remove(); b0.rafaelSeen = true; save();
        if (FM.rafaelSay) FM.rafaelSay('Thank you, boss. First of all, Ashford Rovers plc supplies both goods (our physical products, like club shirts) and services (actions, like actually playing the football matches). To supply these goods and services and satisfy what our customers want, we take a risk. To get the reward for that risk, it will take lots of long hours and hard work.' + String.fromCharCode(10, 10) + 'Every business idea in The Books is explained in the tabs above. Click any underlined word and I will explain it here, or ask me anything in the box below.');
      });
    }
  };
})();
