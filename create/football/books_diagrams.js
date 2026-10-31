// Diagrams and project files for the Board papers: each paper has the club's real figures drawn as charts and laid out as the schedules, costings and risk notes a project file carries.
// Nothing here asks the manager anything; it is the material a paper is worked from.
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const gbp = (n) => FM.gbp(n), num = (n) => Math.round(n).toLocaleString('en-GB'), f1 = (n) => (Math.round(n * 10) / 10).toFixed(1), f2 = (n) => (Math.round(n * 100) / 100).toFixed(2);
  const pc = (v) => f1(v * 100) + '%', m1 = (n) => '£' + f1(n / 1e6) + 'm';
  const AX = 'stroke="rgba(244,237,218,.35)" stroke-width="1"', TX = 'fill="rgba(244,237,218,.82)" font-family="Arial,sans-serif" font-size="11"', GOLD = '#d7b86b', GREEN = '#7fd49a', RED = '#e78078', BLUE = '#6fa8dc';

  // ---------- drawing helpers ----------
  const frame = (w, h, label, body) => `<svg class="bd-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">${body}</svg>`;
  function bars(items, o) {
    o = o || {}; const W = o.w || 460, H = o.h || 210, ml = 46, mb = 30, mt = 16, n = items.length, max = (o.max || Math.max.apply(null, items.map((i) => Math.max(i.v, i.v2 || 0)))) * 1.18 || 1;
    const bw = (W - ml - 10) / n, Y = (v) => H - mb - v / max * (H - mb - mt);
    let s = `<line x1="${ml}" y1="${H - mb}" x2="${W - 6}" y2="${H - mb}" ${AX}/><line x1="${ml}" y1="${mt}" x2="${ml}" y2="${H - mb}" ${AX}/>`;
    for (let i = 0; i <= 4; i++) { const v = max * i / 4, y = Y(v); s += `<line x1="${ml}" y1="${y}" x2="${W - 6}" y2="${y}" stroke="rgba(244,237,218,.1)"/><text x="${ml - 5}" y="${y + 3}" text-anchor="end" ${TX}>${esc(o.fmt ? o.fmt(v) : (max >= 100 ? num(v) : f1(v)))}</text>`; }
    items.forEach((it, i) => {
      const x = ml + i * bw, two = it.v2 != null, bwid = two ? (bw - 10) / 2 : bw - 14;
      s += `<rect x="${x + 6}" y="${Y(it.v)}" width="${bwid}" height="${H - mb - Y(it.v)}" fill="${it.c || GREEN}"/>`;
      if (two) s += `<rect x="${x + 6 + bwid}" y="${Y(it.v2)}" width="${bwid}" height="${H - mb - Y(it.v2)}" fill="${it.c2 || GOLD}"/>`;
      s += `<text x="${x + bw / 2}" y="${H - 14}" text-anchor="middle" ${TX}>${esc(it.l)}</text>`;
      if (!two && o.labels !== false) s += `<text x="${x + 6 + bwid / 2}" y="${Y(it.v) - 4}" text-anchor="middle" ${TX}>${esc(o.fmt ? o.fmt(it.v) : (max >= 100 ? num(it.v) : f1(it.v)))}</text>`;
    });
    if (o.legend) o.legend.forEach((lg, i) => { s += `<rect x="${ml + 8 + i * 140}" y="2" width="9" height="9" fill="${lg[1]}"/><text x="${ml + 22 + i * 140}" y="10" ${TX}>${esc(lg[0])}</text>`; });
    if (o.hline) s += `<line x1="${ml}" y1="${Y(o.hline.v)}" x2="${W - 6}" y2="${Y(o.hline.v)}" stroke="${RED}" stroke-dasharray="5 4"/><text x="${W - 8}" y="${Y(o.hline.v) - 4}" text-anchor="end" fill="${RED}" font-size="10" font-family="Arial">${esc(o.hline.l)}</text>`;
    return frame(W, H, o.title || 'Chart', s);
  }
  function lines(series, o) {
    o = o || {}; const W = o.w || 460, H = o.h || 220, ml = 50, mb = 30, mt = 16, all = [].concat.apply([], series.map((s) => s.pts)), xs = all.map((p) => p.x), ys = all.map((p) => p.y);
    const x0 = o.x0 != null ? o.x0 : Math.min.apply(null, xs), x1 = o.x1 != null ? o.x1 : Math.max.apply(null, xs), y0 = o.y0 != null ? o.y0 : Math.min(0, Math.min.apply(null, ys)), y1 = (o.y1 != null ? o.y1 : Math.max.apply(null, ys)) * 1.08 || 1;
    const X = (v) => ml + (v - x0) / ((x1 - x0) || 1) * (W - ml - 12), Y = (v) => H - mb - (v - y0) / ((y1 - y0) || 1) * (H - mb - mt);
    let s = `<line x1="${ml}" y1="${H - mb}" x2="${W - 6}" y2="${H - mb}" ${AX}/><line x1="${ml}" y1="${mt}" x2="${ml}" y2="${H - mb}" ${AX}/>`;
    for (let i = 0; i <= 4; i++) { const v = y0 + (y1 - y0) * i / 4, y = Y(v); s += `<line x1="${ml}" y1="${y}" x2="${W - 6}" y2="${y}" stroke="rgba(244,237,218,.1)"/><text x="${ml - 5}" y="${y + 3}" text-anchor="end" ${TX}>${esc(o.fmtY ? o.fmtY(v) : f1(v))}</text>`; }
    const nt = Math.min(8, Math.round(x1 - x0) + 1);
    for (let i = 0; i < nt; i++) { const v = x0 + (x1 - x0) * i / Math.max(1, nt - 1); s += `<text x="${X(v)}" y="${H - 14}" text-anchor="middle" ${TX}>${esc(o.fmtX ? o.fmtX(v) : Math.round(v))}</text>`; }
    series.forEach((sr) => { s += `<polyline points="${sr.pts.map((p) => X(p.x).toFixed(1) + ',' + Y(p.y).toFixed(1)).join(' ')}" fill="none" stroke="${sr.c || GREEN}" stroke-width="2.4"${sr.dash ? ' stroke-dasharray="6 4"' : ''}/>`; if (sr.dots) sr.pts.forEach((p) => { s += `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="3.6" fill="${sr.c || GREEN}"/>`; }); if (sr.label) { const lp = sr.pts[sr.pts.length - 1]; s += `<text x="${Math.min(W - 6, X(lp.x) + 2)}" y="${Y(lp.y) - 6}" text-anchor="end" fill="${sr.c || GREEN}" font-size="10" font-family="Arial">${esc(sr.label)}</text>`; } });
    if (o.marks) o.marks.forEach((mk) => { s += `<line x1="${X(mk.x)}" y1="${mt}" x2="${X(mk.x)}" y2="${H - mb}" stroke="${GOLD}" stroke-dasharray="4 4"/><text x="${X(mk.x) + 4}" y="${mt + 10}" fill="${GOLD}" font-size="10" font-family="Arial">${esc(mk.l)}</text>`; });
    if (o.hline) s += `<line x1="${ml}" y1="${Y(o.hline.v)}" x2="${W - 6}" y2="${Y(o.hline.v)}" stroke="${RED}" stroke-dasharray="5 4"/><text x="${W - 8}" y="${Y(o.hline.v) - 4}" text-anchor="end" fill="${RED}" font-size="10" font-family="Arial">${esc(o.hline.l)}</text>`;
    if (o.xl) s += `<text x="${(ml + W) / 2}" y="${H - 1}" text-anchor="middle" ${TX}>${esc(o.xl)}</text>`;
    return frame(W, H, o.title || 'Chart', s);
  }
  function matrix(cells, o) {
    o = o || {}; const W = 460, H = 230; let s = '';
    cells.forEach((c, i) => { const x = 10 + (i % 2) * 225, y = 10 + Math.floor(i / 2) * 105; s += `<rect x="${x}" y="${y}" width="215" height="95" fill="rgba(255,255,255,.04)" stroke="rgba(244,237,218,.25)"/><text x="${x + 8}" y="${y + 16}" fill="${GOLD}" font-size="11" font-weight="700" font-family="Arial">${esc(c.t)}</text>`; c.items.slice(0, 4).forEach((it, k) => { s += `<text x="${x + 8}" y="${y + 34 + k * 14}" ${TX}>${esc(it)}</text>`; }); });
    return frame(W, H, o.title || 'Matrix', s);
  }
  function tree(root, o) {
    // root: { l, kids: [{ l, p, v }] } a one-level decision tree with probabilities and pay-offs
    const W = 460, H = 200; let s = `<rect x="14" y="${H / 2 - 12}" width="86" height="24" fill="rgba(255,255,255,.05)" stroke="${GOLD}"/><text x="57" y="${H / 2 + 4}" text-anchor="middle" ${TX}>${esc(root.l)}</text>`;
    root.kids.forEach((k, i) => { const y = 36 + i * (H - 72) / Math.max(1, root.kids.length - 1); s += `<line x1="100" y1="${H / 2}" x2="210" y2="${y}" ${AX}/><text x="150" y="${(H / 2 + y) / 2 - 4}" ${TX}>${esc(k.p)}</text><rect x="210" y="${y - 12}" width="100" height="24" fill="rgba(255,255,255,.05)" stroke="rgba(244,237,218,.35)"/><text x="260" y="${y + 4}" text-anchor="middle" ${TX}>${esc(k.l)}</text><text x="320" y="${y + 4}" fill="${GREEN}" font-size="11" font-family="Arial">${esc(k.v)}</text>`; });
    if (root.note) s += `<text x="14" y="${H - 6}" ${TX}>${esc(root.note)}</text>`;
    return frame(W, H, o && o.title || 'Decision tree', s);
  }
  function network(tasks, o) {
    // tasks: [{ id, d, after: [ids] }] drawn left to right with the critical path in gold
    const W = 460, H = 150, done = {}, earliest = {}; tasks.forEach((t) => { t.es = Math.max.apply(null, [0].concat((t.after || []).map((a) => earliest[a] || 0))); earliest[t.id] = t.es + t.d; });
    const total = Math.max.apply(null, tasks.map((t) => t.es + t.d)), X = (w) => 12 + w / total * (W - 24); let s = '';
    tasks.forEach((t, i) => { const y = 14 + i * 26; s += `<rect x="${X(t.es)}" y="${y}" width="${X(t.es + t.d) - X(t.es)}" height="18" fill="${t.crit ? GOLD : 'rgba(127,212,154,.45)'}"/><text x="${X(t.es) + 4}" y="${y + 13}" font-size="10" font-family="Arial" fill="#14181a">${esc(t.l)} (${t.d} wk)</text>`; });
    s += `<text x="${W - 8}" y="${H - 4}" text-anchor="end" ${TX}>${total} weeks end to end</text>`;
    return frame(W, H, o && o.title || 'Schedule', s);
  }
  function waterfall(steps, o) {
    const W = 460, H = 220, ml = 48, mb = 34, mt = 16; let run = 0; const pts = steps.map((s) => { const start = s.total ? 0 : run; run = s.total ? s.v : run + s.v; return { l: s.l, a: start, b: s.total ? s.v : run, tot: !!s.total }; });
    const max = Math.max.apply(null, pts.map((p) => Math.max(p.a, p.b))) * 1.15 || 1, min = Math.min(0, Math.min.apply(null, pts.map((p) => Math.min(p.a, p.b)))), Y = (v) => H - mb - (v - min) / (max - min) * (H - mb - mt), bw = (W - ml - 8) / pts.length;
    let s = `<line x1="${ml}" y1="${Y(0)}" x2="${W - 6}" y2="${Y(0)}" ${AX}/>`;
    pts.forEach((p, i) => { const x = ml + i * bw, top = Math.min(Y(p.a), Y(p.b)), h = Math.abs(Y(p.a) - Y(p.b)); s += `<rect x="${x + 6}" y="${top}" width="${bw - 12}" height="${Math.max(1, h)}" fill="${p.tot ? GOLD : (p.b >= p.a ? GREEN : RED)}"/><text x="${x + bw / 2}" y="${H - 18}" text-anchor="middle" ${TX}>${esc(p.l)}</text><text x="${x + bw / 2}" y="${top - 4}" text-anchor="middle" ${TX}>${esc(m1(p.b - (p.tot ? 0 : p.a) === 0 ? p.b : (p.tot ? p.b : p.b - p.a)))}</text>`; });
    return frame(W, H, o && o.title || 'Waterfall', s);
  }

  const fig = (title, svg, note) => `<figure class="bd-fig"><figcaption>${esc(title)}</figcaption>${svg}${note ? `<p class="bk-why">${esc(note)}</p>` : ''}</figure>`;
  const table = (title, head, rows) => `<div class="bd-tab"><h4>${esc(title)}</h4><div class="tablewrap"><table class="data"><thead><tr>${head.map((h, i) => `<th${i ? '' : ' class="l"'}>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td${i ? '' : ' class="l"'}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
  const list = (title, items) => `<div class="bd-tab"><h4>${esc(title)}</h4><ul class="bd-list">${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;

  // ---------- per paper: charts (m = the paper's numbers, lg = the league) and the project file ----------
  const D = {};
  D.expansion = {
    figs: (m, lg) => {
      const g = m.market.g, yrs = [0, 1, 2, 3, 4, 5].map((i) => ({ x: i, y: m.market.now * Math.pow(1 + g, i) / 1e6 }));
      const fx = FM.nextUserFixture(lg), dem = fx ? FM.bizDemand(lg, fx) : null, st = FM.SEGMENTS.map((s) => ({ l: s.name.split(' ')[0], v: dem ? dem.rows[s.id].wanted : 0, v2: m.b.seats[s.id], c: BLUE, c2: GOLD }));
      const out = [fig('The town\'s spending on live sport (£ million)', lines([{ pts: [{ x: -1, y: m.market.last / 1e6 }, { x: 0, y: m.market.now / 1e6 }], c: GREEN, dots: true, label: 'actual' }, { pts: yrs.map((p) => ({ x: p.x, y: p.y })), c: GOLD, dash: true, label: 'if growth continues' }], { x0: -1, x1: 5, y0: 0, fmtX: (v) => (v < 0 ? 'last year' : v === 0 ? 'this year' : '+' + Math.round(v) + 'y'), fmtY: (v) => '£' + f1(v) + 'm', title: 'Market size' }), 'Growth of ' + pc(g) + ' a year extended five years: a simple trend forecast, and only as good as the assumption that growth continues.'),
        fig('Fans who want a ticket against seats, by stand (next home match)', bars(st, { legend: [['want a ticket', BLUE], ['seats', GOLD]], title: 'Demand against seats' }), 'Where blue is above gold, supporters are being turned away.')];
      if (m.best) { const cum = [{ x: 0, y: -m.best.cost / 1e6 }]; let run = -m.best.cost, disc = -m.best.cost; const dcum = [{ x: 0, y: -m.best.cost / 1e6 }]; for (let y = 1; y <= 10; y++) { run += m.best.yr; disc += m.best.yr / Math.pow(1.08, y); cum.push({ x: y, y: run / 1e6 }); dcum.push({ x: y, y: disc / 1e6 }); }
        out.push(fig('The ' + m.best.name.toLowerCase() + ' extension: cumulative return over ten years (£ million)', lines([{ pts: cum, c: GREEN, label: 'cash, undiscounted' }, { pts: dcum, c: GOLD, dash: true, label: 'discounted at 8%' }], { hline: { v: 0, l: 'break-even' }, fmtX: (v) => 'yr ' + Math.round(v), fmtY: (v) => '£' + f1(v) + 'm', title: 'Cumulative return' }), 'Where the green line crosses zero is the payback; where the dashed line crosses zero is when it has paid back in today\'s money.')); }
      return out.join('');
    },
    detail: (m, lg) => [
      table('Capacity and demand', ['Measure', 'Figure'], [['Seats in the ground', num(m.f.cap)], ['Average home crowd', num(m.f.att)], ['Capacity utilisation', pc(m.util)], ['Supporters turned away per match', num(m.turned)], ['Home matches in a season', String(m.home)], ['Revenue per spectator (ticket and spend)', gbp(m.f.revHead)], ['Variable cost per spectator', gbp(m.f.varHead)]]),
      table('The options for new seats', ['Stand', 'Seats', 'Cost', 'Fans it would fill', 'Net return a season', 'Payback'], m.rows.length ? m.rows.map((r) => [r.name, num(r.seats), gbp(r.cost), num(r.extra), gbp(r.yr), r.pay ? f1(r.pay) + ' years' : 'never']) : [['No stand can be extended at the moment', '', '', '', '', '']]),
      table('Project plan', ['When', 'What happens'], [['Matchday 0', 'The board approves the project and the money is set aside'], ['Matchdays 1 to ' + m.K.BUILD_TIME, 'The stand is built. The seats cannot be sold, and the ground\'s capacity does not change'], ['Matchday ' + (m.K.BUILD_TIME + 1), 'The new seats open for the next home match'], ['Six matchdays after the decision', 'The review compares the forecast with what was actually earned']]),
      list('Risks and assumptions', ['Only the supporters we currently turn away are counted as demand for the new seats. If those fans are not there on the day, the seats earn nothing.', 'The return is assumed to last ten years, with no more building costs. A stand needs upkeep and eventually replacement.', 'A bigger crowd costs more to run: the figures take off ' + gbp(m.f.varHead) + ' for every extra spectator.', 'Borrowing to pay for it adds interest and raises gearing; issuing shares dilutes the owners; paying cash leaves less in the bank for the season.']),
    ].join(''),
  };
  D.pricing = {
    figs: (m, lg) => {
      const fx = FM.nextUserFixture(lg); if (!fx) return '';
      const rows = [], b = m.b; FM.SEGMENTS.forEach((s) => { const p = b.prices[s.id].price, base = FM.bizDemand(lg, fx).rows[s.id]; b.prices[s.id].price = p * 1.1; const d2 = FM.bizDemand(lg, fx).rows[s.id]; b.prices[s.id].price = p; rows.push({ s, p, w1: base.wanted, w2: d2.wanted, r1: base.revenue, r2: d2.revenue, seats: base.seats }); });
      const g = rows.find((r) => r.s.id === 'general') || rows[0], k = (g.w1 - g.w2) / (g.p * 0.1), a = g.w1 + k * g.p, pts = [], rev = []; for (let i = 0; i <= 30; i++) { const p = i / 30 * a / k; pts.push({ x: p, y: Math.max(0, a - k * p) }); rev.push({ x: p, y: p * Math.max(0, a - k * p) / 1000 }); }
      return fig('Demand for the ' + g.s.name.toLowerCase() + ' (fans against ticket price)', lines([{ pts, c: BLUE, label: 'demand' }], { fmtX: (v) => '£' + Math.round(v), y0: 0, title: 'Demand curve', marks: [{ x: g.p, l: 'now' }] }), 'A straight line fitted to demand at today\'s price and 10% above it.') +
        fig('Income from that stand at each price (£ thousand)', lines([{ pts: rev, c: GREEN, label: 'income' }], { fmtX: (v) => '£' + Math.round(v), fmtY: (v) => '£' + Math.round(v) + 'k', y0: 0, title: 'Income curve', marks: [{ x: g.p, l: 'now' }] }), 'Income rises and then falls as the price goes up: the top of the hill is the price that earns most before the seats run out.') +
        fig('Price elasticity of demand by stand (positive numbers)', bars(rows.map((r) => ({ l: r.s.name.split(' ')[0], v: Math.abs(((r.w2 - r.w1) / Math.max(1, r.w1)) / 0.1), c: Math.abs(((r.w2 - r.w1) / Math.max(1, r.w1)) / 0.1) > 1 ? RED : GREEN })), { hline: { v: 1, l: 'elastic above this' }, title: 'Elasticity' }), 'Above the line, a price rise loses more in fans than it gains per ticket.');
    },
    detail: (m, lg) => { const fx = FM.nextUserFixture(lg); if (!fx) return ''; const d = FM.bizDemand(lg, fx); return table('Pricing by stand', ['Stand', 'Price', 'Seats', 'Fans wanting a ticket', 'Sold', 'Income'], FM.SEGMENTS.map((s) => [s.name, '£' + m.b.prices[s.id].price, num(d.rows[s.id].seats), num(d.rows[s.id].wanted), num(d.rows[s.id].sold), gbp(d.rows[s.id].revenue)])) + list('Notes on the figures', ['Demand for each stand is worked out for the next home match, and moves with form, the opposition and the table.', 'A full stand with fans turned away is a sign the price may be too low; a half-empty one is a sign it may be too high.', 'Season-ticket holders are not modelled separately: each stand\'s price applies to everyone in it.']); },
  };
  D.marketing = {
    figs: (m) => {
      const up = (x) => 100 * 0.1 * Math.log(1 + x / 5000), pts = []; for (let x = 0; x <= 60000; x += 3000) pts.push({ x, y: up(x) });
      const crowds = [0.6, 0.8, 1, 1.25, 1.5].map((k) => ({ l: num(m.f.att * k), v: 2 * Math.max(10000, m.b.marketing || 0) / (m.f.att * k), c: k === 1 ? GOLD : GREEN }));
      return fig('How much a marketing budget lifts demand (% extra fans)', lines([{ pts, c: GREEN }], { fmtX: (v) => '£' + Math.round(v / 1000) + 'k', fmtY: (v) => f1(v) + '%', y0: 0, marks: [{ x: m.b.marketing || 0, l: 'now' }], xl: 'budget a matchday', title: 'Diminishing returns' }), 'Each extra £1,000 lifts demand by less than the one before.') +
        fig('Marketing cost per spectator at a £10,000 budget, by crowd size (£)', bars(crowds, { fmt: (v) => '£' + f2(v), title: 'Cost per spectator' }), 'The same campaign costs less per fan the larger the crowd: a marketing economy of scale.');
    },
    detail: (m) => table('Marketing at the club', ['Measure', 'Figure'], [['Marketing budget a matchday', gbp(m.b.marketing || 0)], ['Spent over a season', gbp((m.b.marketing || 0) * m.K.ROUNDS)], ['Average home crowd', num(m.f.att)], ['Revenue per spectator', gbp(m.f.revHead)], ['Extra fans needed to pay back a £10,000 budget at each home match', num(2 * 10000 / m.f.revHead)]]) + table('The marketing mix at Ashford Rovers', ['Element', 'What it is here'], [['Product', 'The match, the stadium and the club\'s identity as the town\'s only top-flight side'], ['Price', 'Ticket prices by stand, set in the Tickets and Controls tabs'], ['Promotion', 'The marketing budget, shirt sponsors and the advertising boards'], ['Place', 'The ground, the club shop and what can be bought online']]),
  };
  D.finance = {
    figs: (m, lg) => {
      const bal = FM.bizBalance(lg), eq = bal.equity, loans = bal.loans, cap = bal.assets - bal.overdraft, g = (l, c) => (c > 0 ? 100 * l / c : 0);
      return fig('Capital employed: who has put the money in (£ million)', bars([{ l: 'Now: owners', v: eq / 1e6, c: GREEN }, { l: 'Now: lenders', v: loans / 1e6, c: RED }, { l: 'Borrow £0.5m: owners', v: eq / 1e6, c: GREEN }, { l: 'Borrow £0.5m: lenders', v: (loans + 500000) / 1e6, c: RED }, { l: 'Shares £0.5m: owners', v: (eq + 500000) / 1e6, c: GREEN }, { l: 'Shares £0.5m: lenders', v: loans / 1e6, c: RED }], { fmt: (v) => '£' + f1(v) + 'm', w: 520, title: 'Capital employed' }), 'Gearing now ' + f1(g(loans, cap)) + '%; after borrowing ' + f1(g(loans + 500000, cap + 500000)) + '%; after a share issue ' + f1(g(loans, cap + 500000)) + '%.');
    },
    detail: (m, lg) => { const bal = FM.bizBalance(lg); return table('Where the money could come from', ['Source', 'Cost', 'Repaid?', 'Effect on control', 'Used when'], [['Retained profit', 'None', 'No', 'None', 'The club has a cash surplus'], ['Bank loan', 'Interest (6% a year at the shortest term)', 'Yes, in equal parts', 'None', 'A project will earn more than the interest'], ['Share issue', 'A share of future dividends', 'Never', 'Owners diluted', 'The club should not take on more debt'], ['Overdraft', '14% a year, 30% beyond £500,000', 'On demand', 'None', 'A short gap in cash flow'], ['Trade credit', 'None, if paid on time', 'Within weeks', 'None', 'Day-to-day purchases']]) + table('The club\'s balance today', ['Item', 'Amount'], [['Stadium and facilities (net)', gbp(bal.stadium)], ['Player registrations (net)', gbp(bal.players)], ['Cash at bank', gbp(bal.cash)], ['Overdraft', gbp(bal.overdraft)], ['Bank loans', gbp(bal.loans)], ['Owners\' equity', gbp(bal.equity)]]); },
  };
  D.cashflow = {
    figs: (m, lg) => {
      const rows = FM.bizCashFlow(lg) || [], pts = rows.map((r, i) => ({ x: i + 1, y: r.closing / 1e6 }));
      if (!pts.length) return '';
      return fig('Forecast closing bank balance by matchday (£ million)', lines([{ pts, c: GREEN, label: 'forecast' }], { hline: { v: 0, l: 'overdrawn below here' }, fmtX: (v) => 'MD ' + Math.round(v), fmtY: (v) => '£' + f1(v) + 'm', title: 'Cash flow forecast' }), 'A forecast built on the average of recent home crowds, the sponsors and loans already agreed, and this season\'s fixtures.');
    },
    detail: (m) => table('Break-even at a home match', ['Item', 'Figure'], [['Standing costs per home match (wages, admin, interest, depreciation, running the ground)', gbp(m.f.fixedMatch)], ['Income that does not depend on the crowd (broadcasting, sponsors, boards), two matchdays', gbp(2 * m.f.other)], ['Revenue per spectator', gbp(m.f.revHead)], ['Variable cost per spectator', gbp(m.f.varHead)], ['Break-even crowd', num(m.f.netFixed / (m.f.revHead - m.f.varHead))], ['Average crowd', num(m.f.att)], ['Margin of safety', num(m.f.att - m.f.netFixed / (m.f.revHead - m.f.varHead))]]) + list('Why cash and profit differ', ['A signing is paid for in cash on the day, but charged to profit over the contract.', 'A stand is paid for when it is built but depreciates over many seasons.', 'Loans bring cash in, but they are not income: they are repaid with interest.', 'Dividends and tax leave the bank without appearing as costs of running the club.']),
  };
  D.accounts = {
    figs: (m, lg) => {
      const rev = FM.bizSeasonSum(lg, 'revenue'), cos = FM.bizSeasonSum(lg, 'cos'), exp = FM.bizSeasonSum(lg, 'expenses'), op = FM.bizSeasonSum(lg, 'op'), int = FM.bizSeasonSum(lg, 'interest'), tax = FM.bizSeasonSum(lg, 'tax'), net = FM.bizSeasonSum(lg, 'net');
      return fig('From revenue to profit, season to date (£ million)', waterfall([{ l: 'Revenue', v: rev, total: true }, { l: 'Cost of sales', v: -cos }, { l: 'Expenses', v: -exp }, { l: 'Interest', v: -int }, { l: 'Tax', v: -tax }, { l: 'Profit', v: net, total: true }], { title: 'Income statement' }), 'Each bar shows what each line takes away on the way down to the profit for the year.');
    },
    detail: (m, lg) => { const rev = FM.bizSeasonSum(lg, 'revenue') || 1; return table('The margins', ['Measure', 'How it is worked out', 'Result'], [['Gross profit margin', 'gross profit ÷ revenue', pc(FM.bizSeasonSum(lg, 'gross') / rev)], ['Operating profit margin', 'operating profit ÷ revenue', pc(FM.bizSeasonSum(lg, 'op') / rev)], ['Net profit margin', 'profit for the year ÷ revenue', pc(FM.bizSeasonSum(lg, 'net') / rev)]]) + list('How to read the accounts', ['Compare this season with the last, and with other clubs, before judging a single figure.', 'Look at what changed: a fall in margin may mean costs rose, prices fell, or a one-off cost has landed.', 'Ratios use past figures. They ignore the table position, injuries and the mood in the dressing room.']); },
  };
  D.people = {
    figs: (m, lg) => {
      const rev = FM.bizSeasonSum(lg, 'revenue'), per = m.b.ledger.length ? rev / m.b.ledger.length : (m.f.revHead * m.f.att / 2 + m.f.other), seasonRev = per * m.K.ROUNDS, wage = m.wages * m.K.ROUNDS;
      const top = FM.teamById(lg, lg.userId).squad.slice().sort((a, b) => FM.wageOf(b) - FM.wageOf(a)).slice(0, 8);
      return fig('The wage bill against revenue for a season (£ million)', bars([{ l: 'Revenue', v: seasonRev / 1e6, c: GREEN }, { l: 'Wages', v: wage / 1e6, c: RED }, { l: 'Everything else', v: Math.max(0, seasonRev - wage) / 1e6, c: GOLD }], { fmt: (v) => '£' + f1(v) + 'm', title: 'Wages and revenue' }), 'Wages are ' + pc(wage / Math.max(1, seasonRev)) + ' of the season\'s revenue. The board\'s guide is about 65%.') + fig('The eight highest wages (£ thousand a week)', bars(top.map((p) => ({ l: p.name.split(' ').slice(-1)[0], v: FM.wageOf(p), c: GOLD })), { fmt: (v) => f1(v) + 'k', w: 520, title: 'Highest wages' }));
    },
    detail: (m, lg) => table('Contracts in the squad', ['Seasons left', 'Players'], [1, 2, 3, 4, 5].map((y) => [String(y), String(FM.teamById(lg, lg.userId).squad.filter((p) => FM.contractLeft(p) === y).length)])),
  };
  D.structure = { figs: () => (FM.booksLearn && FM.booksLearn.org ? FM.booksLearn.org() : ''), detail: () => table('Spans of control', ['Manager', 'Reports', 'Span'], [['Chairwoman', 'Board of directors', '3'], ['Board', 'Director of Finance, Manager, Commercial director', '3'], ['Manager', 'Assistant manager', '1'], ['Assistant manager', 'First-team, goalkeeping and fitness coaches', '3'], ['First-team coach', 'The squad of players', '22']]) + list('Notes on the structure', ['The chain of command is six layers from the owners to the players: tall, with narrow spans in the football side.', 'A decision on a match day passes through the manager and assistant manager. Delegating match-day decisions to the coaches would shorten the chain.', 'Centralised decisions give control and consistency; decentralised ones give speed and make use of local knowledge.']) };
  D.owners = {
    figs: (m, lg) => {
      const cells = [{ t: 'Keep satisfied (high power, low interest)', items: ['Government and the regulator', 'Lenders'] }, { t: 'Manage closely (high power, high interest)', items: ['Shareholders', 'The supporters\' trust', 'Sponsors'] }, { t: 'Monitor (low power, low interest)', items: ['Most suppliers', 'Local press'] }, { t: 'Keep informed (low power, high interest)', items: ['Supporters', 'Employees', 'Local community', 'Pressure groups'] }];
      const eps = Math.max(0, m.net), pay = [0, 0.1, 0.2, 0.4, 0.6].map((p) => ({ l: Math.round(p * 100) + '%', v: eps * p / m.b.shares.issued * 100, c: p === (m.b.dividend.policy || 0) ? GOLD : GREEN }));
      return fig('Stakeholders by power and interest', matrix(cells, { title: 'Stakeholder map' }), 'Power decides who can change what the club does; interest decides who will try.') + fig('Dividend per share at each payout (pence)', bars(pay, { fmt: (v) => f1(v) + 'p', title: 'Dividend per share' }), 'Gold is the club\'s current policy.');
    },
    detail: (m, lg) => table('What each owner wants', ['Owner', 'Share', 'Aim'], [['Ashford Supporters\' Trust', '24%', 'Fair prices, the club kept in the town'], ['Halden Mutual (insurance)', '18%', 'A steady dividend and a rising share price'], ['The Chairwoman', '15%', 'Long-term growth'], ['Brightwater Energy Pension Fund', '14%', 'Reliable income, low risk'], ['Kestrel Telecom (sponsor)', '9%', 'Brand exposure and a good community image'], ['The founding families', '8%', 'The club\'s history and survival'], ['Small shareholders', '12%', 'The club doing well and staying affordable']]) + list('The sustainability objective', ['Ashford Green Pitch: cut stadium electricity use by 30% within five years and run every home match on renewable energy.', 'It costs money now (lighting and boilers are capital spending) and saves it later.', 'It matches what the local community and pressure groups ask for, and it is a stakeholder aim as well as an environmental one.']),
  };
  D.strategy = {
    figs: (m) => fig('SWOT analysis of the club', matrix([{ t: 'Strengths', items: ['A loyal town', 'A strong first team', 'Only top-flight club locally', 'A growing market'] }, { t: 'Weaknesses', items: ['A small ground', 'Thin cash reserves', 'Wages near the board\'s limit'] }, { t: 'Opportunities', items: ['Market growing ' + pc(m.market.g) + ' a year', 'A new stand', 'Sponsors keen to be seen'] }, { t: 'Threats', items: ['Richer rivals', 'Loss of key players on free transfers', 'A bad run lowering crowds'] }], { title: 'SWOT' })) + fig('A stand costing £1,000,000: the decision tree', tree({ l: 'Build?', kids: [{ l: 'Demand high', p: 'p = 0.6', v: '£2,000,000' }, { l: 'Demand low', p: 'p = 0.4', v: '£500,000' }], note: 'Expected value = 0.6 × 2,000,000 + 0.4 × 500,000 − 1,000,000 = £400,000' }), 'A positive expected value suggests building, but the probabilities are opinions.') + fig('Building the stand: the schedule (weeks)', network([{ id: 'a', l: 'Planning', d: 2, crit: true }, { id: 'b', l: 'Foundations', d: 3, after: ['a'], crit: true }, { id: 'c', l: 'Steelwork', d: 4, after: ['b'], crit: true }, { id: 'd', l: 'Fitting out', d: 2, after: ['c'], crit: true }]), 'Every task is on the critical path here, so none has float: any delay delays the stand.'),
    detail: () => list('Contingency plans', ['If results fall short, cut the marketing budget before touching wages.', 'If a key player leaves on a free transfer, spend the wage saving on the replacement.', 'If the stand is late, sell the extra tickets in the existing stands at a higher price.']),
  };
  D.growth = {
    figs: (m) => fig('Matchday income a year: us, Brightwater and combined (£ million)', bars([{ l: 'Ashford', v: m.annual / 1e6, c: GREEN }, { l: 'Brightwater', v: m.annual * 0.55 / 1e6, c: BLUE }, { l: 'Combined', v: m.annual * 1.55 / 1e6, c: GOLD }], { fmt: (v) => '£' + f2(v) + 'm', title: 'Income' }), 'Scale gives a bigger income to spread the same standing costs over.'),
    detail: () => table('Organic or external growth', ['Route', 'Example', 'Strength', 'Weakness'], [['Organic', 'Build a new stand', 'Keeps control, grows at our own pace', 'Slow, and uses our own money'], ['Merger', 'Join Brightwater Athletic', 'Instant scale, shared costs', 'Two cultures, two sets of supporters'], ['Takeover', 'Buy a rival', 'Control of both', 'Expensive, and fans may revolt'], ['Joint venture', 'Share a youth academy', 'Shared cost and risk', 'Shared control'], ['Franchise / licence', 'Let others use the club\'s name', 'Brand grows with little money', 'Quality is hard to control']]) + list('Problems of growth', ['Communication gets slower as the club gets bigger.', 'Two administrations doing one job are a cost until one is removed.', 'Greiner\'s model: growth brings crises of leadership, autonomy and control, one after another.']),
  };
  D.operations = {
    figs: () => fig('Stock in the club shop: matches\' worth of shirts held', bars([{ l: 'Held now', v: 5, c: RED }, { l: 'Just-in-time', v: 1, c: GREEN }], { fmt: (v) => f1(v) + ' matches', title: 'Stock cover' }), 'Five matches of stock ties up money; holding one needs reliable, fast suppliers.'),
    detail: () => table('A match day as a production process', ['When', 'What happens', 'Who'], [['Early morning', 'Pitch preparation and goods delivered', 'Groundstaff and suppliers'], ['Three hours before', 'Stewards briefed, bars stocked, shop opened', 'Operations and retail'], ['Gates open', 'Entry, programmes and catering', 'Stewards and catering'], ['Kick-off to full-time', 'The match, the screens and the advertising', 'Everyone'], ['After the match', 'Clear the ground, count the takings, restock', 'Operations and finance']]) + table('Stockholding', ['Item', 'Figure'], [['Shirts sold per home match', '120'], ['Shirts in stock', '600'], ['Holding cost per shirt a season', '£4'], ['Cost of holding the stock', '£2,400 a season']]),
  };
  D.environment = {
    figs: () => fig('A rise in interest rates on a £1,000,000 loan: extra interest a year (£ thousand)', bars([{ l: '+1 point', v: 10, c: GOLD }, { l: '+2 points', v: 20, c: GOLD }, { l: '+3 points', v: 30, c: RED }], { fmt: (v) => '£' + Math.round(v) + 'k', title: 'Interest shock' })) + fig('PESTLE: forces outside the club', matrix([{ t: 'Political and economic', items: ['Interest rates and inflation', 'Taxation: corporation tax at 25%', 'Unemployment and spending'] }, { t: 'Social and technological', items: ['Changing ways to watch football', 'Mobile ticketing and e-commerce'] }, { t: 'Legal', items: ['Consumer law on tickets', 'Employment law on contracts', 'Health and safety at the ground'] }, { t: 'Environmental', items: ['Energy costs and emissions', 'Pressure to be sustainable'] }], { title: 'PESTLE' })),
    detail: () => table('Outside forces and what they do to the club', ['Force', 'Change', 'Effect on the club'], [['Interest rates', 'Up 2 points', 'More interest on loans; less borrowing'], ['Inflation', 'Prices up 4%', 'Wages and running costs rise; ticket prices may follow'], ['Unemployment', 'Up', 'Less spending on tickets and merchandise'], ['Corporation tax', '25% of profit', '£200,000 on a profit of £800,000'], ['Legislation', 'New safety rules', 'Capital spending on the ground']]),
  };
  D.global = {
    figs: () => { const pts = []; for (let r = 7; r <= 11; r += 0.5) pts.push({ x: r, y: 480 / r }); return fig('The price of a 480-yuan shirt in pounds at different exchange rates', lines([{ pts, c: GOLD }], { fmtX: (v) => f1(v) + ' yuan', fmtY: (v) => '£' + Math.round(v), y0: 0, marks: [{ x: 8, l: '£60 at 8' }], xl: 'yuan to the pound', title: 'Exchange rate' }), 'A stronger pound (more yuan to the pound) means each overseas sale is worth fewer pounds.'); },
    detail: () => table('Going global: what changes', ['Decision', 'Standardise', 'Adapt'], [['The shirt', 'One design everywhere: cheaper', 'A local colour and sizing: sells better'], ['Pricing', 'One price in pounds', 'Priced to local incomes'], ['Promotion', 'The same video everywhere', 'Local stars and language'], ['Distribution', 'Online only', 'Local shops and partners']]) + list('Questions to settle', ['Is the sponsor\'s tour a way to reach customers, or a cost with little return?', 'Who makes the shirts overseas, and are the working conditions ethical?', 'What happens to profit when the exchange rate moves 20%?']),
  };
  D.enterprise = {
    figs: () => fig('The parents\' survey: would you pay? (200 asked)', bars([{ l: 'Yes', v: 124, c: GREEN }, { l: 'No', v: 76, c: RED }], { fmt: (v) => String(Math.round(v)), title: 'Survey' }), 'A sample of 200 gives an estimate, not a certainty: not everyone who says yes will turn up.') + fig('From the town to the academy\'s income each month', bars([{ l: 'Families', v: 3000, c: BLUE }, { l: 'Would pay (62%)', v: 1860, c: GOLD }, { l: 'Pay £40', v: 74.4, c: GREEN }], { fmt: (v) => String(Math.round(v)) + (v < 100 ? 'k' : ''), title: 'Funnel' }), 'The last bar is the monthly income in £ thousand if all of the 62% came.'),
    detail: () => table('The business plan for the academy', ['Section', 'What it says'], [['The idea', 'A Saturday-morning football academy for children, run by the club'], ['The market', 'About 3,000 families in the catchment; a niche, not a mass market'], ['Research', '200 parents surveyed, 62% said they would pay'], ['Price', '£40 a month'], ['Costs', 'Coaches, pitch hire, insurance and equipment'], ['Location', 'Beside the ground, to save rent'], ['Risks', 'Fewer children than the survey suggests; rival clubs\' schemes']]) + list('Support for new businesses', ['Grants and advice are available from local business support.', 'Tax reliefs apply to some start-up costs.', 'The club can start small as a pilot term before committing.']),
  };

  FM.booksDiagrams = {
    figs(id, m, lg) { try { return D[id] && D[id].figs ? D[id].figs(m, lg) : ''; } catch (e) { return ''; } },
    detail(id, m, lg) { try { return D[id] && D[id].detail ? D[id].detail(m, lg) : ''; } catch (e) { return ''; } },
  };
  FM.booksLearnCss = (FM.booksLearnCss || '') + `
    .bd-fig { margin: 0; display: grid; gap: 6px; border: 1px solid var(--line); padding: 12px 14px; background: rgba(255,255,255,.025); } .bd-fig figcaption { font-weight: 700; font-size: .85rem; } .bd-svg { width: 100%; max-width: 560px; height: auto; display: block; }
    .bd-tab h4 { margin: 0 0 6px; font: 700 .85rem var(--sans); } .bd-list { margin: 0; padding-left: 1.2rem; display: grid; gap: 5px; line-height: 1.55; font-size: .92rem; }
    .bd-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 14px; align-items: start; } .bd-block { display: grid; gap: 14px; }
  `;
})();
