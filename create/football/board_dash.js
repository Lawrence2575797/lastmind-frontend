// The board's dashboard: the Overview tab opens on it. Key figures with a small trend line each, the bank balance played and forecast,
// where the money comes from and goes, and the balance sheet. Everything is drawn from the club's accounts (FM.bizCashFlow, FM.bizBalance).
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const gbp = (v) => (FM.gbp ? FM.gbp(v) : '£' + Math.round(v).toLocaleString('en-GB'));
  const short = (v) => { const a = Math.abs(v), s = v < 0 ? '−' : ''; return a >= 1e6 ? s + '£' + (a / 1e6).toFixed(a >= 1e7 ? 1 : 2) + 'm' : a >= 1e3 ? s + '£' + Math.round(a / 1e3) + 'k' : s + '£' + Math.round(a); };
  const sum = (o) => Object.keys(o || {}).reduce((a, k) => a + (o[k] || 0), 0);
  const IN = { tickets: 'Tickets', matchday: 'Matchday extras', broadcast: 'Broadcasting', sponsor: 'Sponsors', advert: 'Advertising', merch: 'Merchandise', prize: 'Prize money', cup: 'Cup ties (gate and prizes)', sales: 'Player sales' };
  const OUT = { wages: 'Wages', fees: 'Transfer fees', admin: 'Running costs', matchday: 'Matchday costs', merchCost: 'Merchandise costs', marketing: 'Marketing', loanPay: 'Loan repayments', interest: 'Interest', tax: 'Tax', dividends: 'Dividends', capex: 'Ground and facilities' };

  // a small trend line with the last point marked
  function spark(vals, good) {
    const w = 120, h = 34, v = vals.filter(Number.isFinite); if (v.length < 2) return '<svg class="bd-spark" viewBox="0 0 120 34" aria-hidden="true"></svg>';
    let lo = Math.min.apply(null, v), hi = Math.max.apply(null, v); if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
    const X = (i) => 2 + (w - 4) * i / (v.length - 1), Y = (x) => h - 3 - (h - 6) * (x - lo) / (hi - lo);
    const pts = v.map((x, i) => X(i).toFixed(1) + ',' + Y(x).toFixed(1)).join(' ');
    return `<svg class="bd-spark ${good === false ? 'bad' : ''}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts} ${X(v.length - 1).toFixed(1)},${h} 2,${h}" class="fill"/><polyline points="${pts}" class="line"/><circle cx="${X(v.length - 1).toFixed(1)}" cy="${Y(v[v.length - 1]).toFixed(1)}" r="2.6"/></svg>`;
  }
  const tile = (label, value, sub, vals, good) => `<div class="bd-tile"><span class="bd-l">${esc(label)}</span><b class="${good === false ? 'neg' : ''}">${value}</b><small>${sub || ''}</small>${vals ? spark(vals, good) : ''}</div>`;

  FM.boardDash = function (lg) {
    const b = FM.biz(lg), cf = FM.bizCashFlow(lg) || [], bal = FM.bizBalance(lg), ap = FM.bizApprovals(lg);
    if (!cf.length) return '';
    const played = cf.filter((r) => r.actual), cur = played[played.length - 1] || cf[0];
    const closing = cf.map((r) => r.closing), net = cf.map((r) => sum(r.inflow) - sum(r.outflow));
    let run = 0; const cumNet = net.map((n) => (run += n));
    const income = cf.map((r) => sum(r.inflow)), wages = cf.map((r) => (r.outflow.wages || 0)), wageShare = (() => { let cw = 0, ci = 0; return cf.map((r, i) => { cw += wages[i]; ci += income[i]; return ci ? 100 * cw / ci : 0; }); })();
    const season = FM.bizSeasonSum ? FM.bizSeasonSum(lg, 'net') : 0, endBal = cf[cf.length - 1].closing, owed = b.loans.reduce((a, l) => a + l.balance, 0);
    const ws = wageShare[wageShare.length - 1] || 0, bonds = bal.bonds || 0;
    const tiles = [
      tile('Cash', short(b.cash), 'Forecast at season end ' + short(endBal), closing, b.cash >= 0),
      tile('Profit this season', short(season), played.length ? played.length + ' matchday' + (played.length === 1 ? '' : 's') + ' played' : 'Nothing played yet', cumNet, season >= 0),
      tile('Wages as a share of income', ws ? ws.toFixed(0) + '%' : '–', ws > 70 ? 'High: the board would like under 70%' : 'Season to date, with the forecast', wageShare, ws <= 70),
      tile('Owed on loans', short(owed), (b.loans.length || 'No') + ' loan' + (b.loans.length === 1 ? '' : 's'), null, true),
      tile('Held in bonds', short(bonds), bonds ? 'See the Bonds page' : 'Nothing invested', null, true),
      tile('Shareholder approval', Math.round(Math.min(ap.financial, ap.football)) + '%', 'Finances ' + Math.round(ap.financial) + '% · Football ' + Math.round(ap.football) + '%', null, Math.min(ap.financial, ap.football) >= 40),
    ].join('');
    // the bank balance, played and forecast
    const A = cf.filter((r) => r.actual).map((r) => [r.round, r.closing]), F = cf.filter((r) => !r.actual).map((r) => [r.round, r.closing]);
    if (A.length && F.length) F.unshift(A[A.length - 1]);
    const series = []; if (A.length) series.push({ label: 'Played', pts: A, cls: 'gold' }); series.push({ label: 'Forecast', pts: F.length ? F : A, cls: 'blue', dash: true });
    const lim = FM.bizSources && FM.bizSources.overdraft ? -FM.bizSources.overdraft.limit : null;
    if (lim != null) series.push({ label: 'Overdraft limit', pts: cf.map((r) => [r.round, lim]), cls: 'warn', dash: true });
    const cash = FM.charts ? FM.charts.lines(series, { h: 260, xl: 'Matchday', yl: 'Bank balance', yFmt: short }) : '';
    // where the money comes from and goes, over the season (played and forecast together)
    const tot = (map, side) => Object.keys(map).map((k) => ({ k, v: cf.reduce((a, r) => a + (r[side][k] || 0), 0) })).filter((x) => x.v > 0).sort((a, b2) => b2.v - a.v);
    const ins = tot(IN, 'inflow'), outs = tot(OUT, 'outflow'), bar = (rows, names, cls) => FM.charts ? FM.charts.bars(rows.map((x) => ({ l: names[x.k], v: x.v, s: short(x.v), t: gbp(x.v), cls })), { w: 460, ml: 150 }) : '';
    // the balance sheet, two columns of the same height
    const assets = [['Stadium', bal.stadium], ['Players', bal.players], ['Bonds', bal.bonds], ['Cash', Math.max(0, bal.cash)], ['Owed to the club', bal.receivables]].filter((r) => r[1] > 0);
    const claims = [['Loans', bal.loans], ['Overdraft', bal.overdraft], ['Owed for players', bal.payables], ['Share capital', bal.capital + (bal.premium || 0)], ['Retained profit', bal.retained]].filter((r) => r[1] !== 0);
    const stack = (rows, total) => `<div class="bd-stack">${rows.map((r, i) => `<div class="bd-seg s${i % 6}" style="flex:${Math.max(0.5, 100 * Math.abs(r[1]) / (total || 1)).toFixed(1)}" title="${esc(r[0])}: ${esc(gbp(r[1]))}"><span>${esc(r[0])}</span><b>${esc(short(r[1]))}</b></div>`).join('')}</div>`;
    return `<section class="bd" aria-label="Club finances at a glance">
      <div class="bd-tiles">${tiles}</div>
      <div class="bd-row"><div class="card bd-card"><div class="eyebrow">Bank balance, played and forecast</div>${cash}</div>
        <div class="card bd-card"><div class="eyebrow">Balance sheet</div><div class="bd-bs"><div><h5>What the club owns</h5>${stack(assets, bal.assets)}<p>${esc(gbp(bal.assets))}</p></div><div><h5>What it owes and what is left for the owners</h5>${stack(claims, bal.liabilities + bal.equity)}<p>${esc(gbp(bal.liabilities + bal.equity))}</p></div></div></div></div>
      <div class="bd-row"><div class="card bd-card"><div class="eyebrow">Money in this season</div>${bar(ins, IN, 'good')}</div><div class="card bd-card"><div class="eyebrow">Money out this season</div>${bar(outs, OUT, 'bad')}</div></div></section>`;
  };

  FM.boardDash.css = `
    .bd { display: grid; gap: 14px; margin-bottom: 16px; } .bd-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px; }
    .bd-tile { position: relative; display: grid; gap: 2px; padding: 12px 14px 8px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.03); overflow: hidden; }
    .bd-l { font: 700 .64rem var(--sans); letter-spacing: .12em; text-transform: uppercase; opacity: .65; } .bd-tile b { font: 800 1.5rem var(--sans); font-variant-numeric: tabular-nums; } .bd-tile b.neg { color: #e77a6a; } .bd-tile small { font-size: .74rem; opacity: .68; line-height: 1.35; min-height: 2em; }
    .bd-spark { width: 100%; height: 34px; display: block; margin-top: 4px; } .bd-spark .line { fill: none; stroke: #f2c14e; stroke-width: 1.8; } .bd-spark .fill { fill: rgba(242,193,78,.12); stroke: none; } .bd-spark circle { fill: #f2c14e; } .bd-spark.bad .line { stroke: #e77a6a; } .bd-spark.bad .fill { fill: rgba(231,122,106,.12); } .bd-spark.bad circle { fill: #e77a6a; }
    .bd-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; } @media (max-width: 960px) { .bd-row { grid-template-columns: minmax(0, 1fr); } } .bd-card { display: grid; gap: 10px; align-content: start; min-width: 0; }
    .bd-bs { display: grid; gap: 14px; } .bd-bs h5 { margin: 0 0 6px; font: 700 .72rem var(--sans); letter-spacing: .08em; text-transform: uppercase; opacity: .7; } .bd-bs p { margin: 6px 0 0; font: 700 .9rem var(--sans); font-variant-numeric: tabular-nums; }
    .bd-stack { display: flex; height: 64px; gap: 2px; } .bd-seg { display: grid; align-content: center; gap: 1px; padding: 4px 8px; min-width: 0; overflow: hidden; color: #0e1512; } .bd-seg span { font: 700 .66rem var(--sans); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .bd-seg b { font: 800 .8rem var(--sans); }
    .bd-seg.s0 { background: #f2c14e; } .bd-seg.s1 { background: #6fb7ff; } .bd-seg.s2 { background: #7fe3a6; } .bd-seg.s3 { background: #c9a3ff; } .bd-seg.s4 { background: #ff9d85; } .bd-seg.s5 { background: #9fb0a8; }
  `;
})();
