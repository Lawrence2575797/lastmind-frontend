// Forecasts for the Workbench. Every forecast says what it assumes, and none of them changes your game: they work on the current state, or on a copy of it.
//   price     - what a ticket price would bring in over the home matches still to come (using the game's own model of the crowd)
//   scenario  - the rest of the season's money with some changes made (actions from Controls) against without them, worked out on a copy of the club
//   season    - where the club is likely to finish, from many simulated runs of the matches still to play
//   trend     - a measure carried forward match by match from a fitted line, with the range it could plausibly fall in
(function () {
  const FM = (window.FM = window.FM || {});
  const S = FM.STAT, T = FM.tables, WB = FM.WB;
  const sig = (v, n) => (Number.isFinite(v) ? Number(v.toPrecision(n || 4)) : v);
  const gbp = (v) => (FM.gbp ? FM.gbp(v) : '£' + Math.round(v).toLocaleString('en-GB'));
  const fail = (error) => ({ ok: false, error });
  const user = (lg) => FM.teamById(lg, lg.userId);
  const remainingMine = (lg) => lg.fixtures.filter((f) => !f.played && !f.friendly && (f.homeId === lg.userId || f.awayId === lg.userId)).sort((a, b) => a.round - b.round);
  function rng(seed) { let a = (seed >>> 0) || 1; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ---------- the rest of the season's money, worked out the way the matches will be settled ----------
  function project(lg) {
    const b = FM.biz(lg), I = FM.bizInternals, fixtures = remainingMine(lg), K = FM.bizConst;
    const keep = { sp: b.sponsors.map((s) => s.left), bo: b.boards.map((s) => s.left), lv: (b.levers || []).map((l) => l.left) };
    let cash = b.cash, revenue = 0, costs = 0, att = 0, homes = 0, minCash = cash; const rounds = [];
    try {
      fixtures.forEach((fx, k) => {
        b.sponsors.forEach((s, i) => { s.left = keep.sp[i] - k; }); b.boards.forEach((s, i) => { s.left = keep.bo[i] - k; }); (b.levers || []).forEach((l, i) => { l.left = keep.lv[i] - k; });
        const home = fx.homeId === lg.userId, l = I.lines(lg, fx, home, false);
        const last = fx.round === K.ROUNDS - 1, prize = last ? FM.bizPrize(lg).amount : 0;
        const rev = I.sum(l.inflow) + prize, out = I.sum(l.outflow);
        revenue += rev; costs += out; cash += rev - out; minCash = Math.min(minCash, cash); if (home) { att += l.att; homes++; }
        rounds.push({ round: fx.round + 1, home, revenue: Math.round(rev), costs: Math.round(out), cash: Math.round(cash), att: home ? Math.round(l.att) : null });
      });
    } finally {
      b.sponsors.forEach((s, i) => { s.left = keep.sp[i]; }); b.boards.forEach((s, i) => { s.left = keep.bo[i]; }); (b.levers || []).forEach((l, i) => { l.left = keep.lv[i]; });
    }
    return { revenue, costs, profit: revenue - costs, cashEnd: cash, minCash, att: homes ? att / homes : 0, homes, matches: fixtures.length, rounds };
  }

  // ---------- price ----------
  function price(lg, s) {
    const b = FM.biz(lg), seg = FM.SEGMENTS.find((x) => x.id === s.stand || x.name.toLowerCase() === String(s.stand).toLowerCase());
    if (!seg) return fail('Say which stand: ' + FM.SEGMENTS.map((x) => x.id).join(', ') + '.');
    const homes = remainingMine(lg).filter((f) => f.homeId === lg.userId); if (!homes.length) return fail('There are no home matches left this season, so there is nothing to forecast.');
    const cur = b.prices[seg.id].price, from = Math.max(3, Math.round(Number(s.from) || Math.max(3, cur * 0.5))), to = Math.min(400, Math.round(Number(s.to) || cur * 1.8)), step = Math.max(1, Math.round(Number(s.step) || Math.max(1, (to - from) / 12)));
    const rows = [];
    try {
      for (let p = from; p <= to; p += step) {
        b.prices[seg.id].price = p; let sold = 0, income = 0, away = 0, all = 0, crowd = 0;
        homes.forEach((fx) => { const d = FM.bizDemand(lg, fx); sold += d.rows[seg.id].sold; income += d.rows[seg.id].revenue; away += d.rows[seg.id].away; all += d.tickets; crowd += d.total; });
        rows.push({ p, sold: sold / homes.length, income, away: away / homes.length, all, crowd: crowd / homes.length });
      }
    } finally { b.prices[seg.id].price = cur; }
    const best = rows.slice().sort((x, y) => y.all - x.all)[0], now = rows.slice().sort((x, y) => Math.abs(x.p - cur) - Math.abs(y.p - cur))[0];
    const out = { ok: true, method: 'forecast', title: 'Forecast: ticket price for the ' + seg.name.toLowerCase() + ' over the ' + homes.length + ' home matches still to play', n: homes.length, summary: [], tables: [], caveats: [] };
    out.tables.push({ title: 'Price against ticket income', cols: ['Price £', 'Sold here (per match)', 'Turned away (per match)', 'Income from this stand (remaining matches)', 'Ticket income, all stands (remaining matches)', 'Total crowd (per match)'], rows: rows.map((r) => [r.p + (r === now ? ' (now ≈ £' + cur + ')' : '') + (r === best ? ' ★' : ''), Math.round(r.sold), Math.round(r.away), gbp(r.income), gbp(r.all), Math.round(r.crowd)]) });
    out.summary.push('Over the remaining ' + homes.length + ' home matches, ticket income across the whole ground is highest at about ' + gbp(best.p) + ' for the ' + seg.name.toLowerCase() + ' (' + gbp(best.all) + ' in all), against ' + gbp(now.all) + ' near today\'s £' + cur + '. A higher price sells fewer seats; the best price is where the extra money per ticket just stops paying for the tickets lost.');
    out.chart = { type: 'bars', x: 'ticket price (£)', y: 'ticket income, all stands (£)', bars: rows.map((r) => ({ label: '£' + r.p, value: Math.round(r.all) })) };
    out.caveats.push('This counts ticket income only. A fuller ground also spends more on food and drink, and the atmosphere helps the team, which this does not measure.');
    out.caveats.push('It assumes the team\'s form, league position and the marketing budget stay as they are now; if results change, so will the crowds.');
    return out;
  }

  // ---------- scenario: the same club with some changes ----------
  function scenario(lg, s) {
    const acts = (Array.isArray(s.actions) ? s.actions : []).slice(0, 5); if (!acts.length) return fail('Give one or more changes to try, as actions.');
    if (!remainingMine(lg).length) return fail('There are no matches left this season to forecast.');
    const base = project(lg);
    let copy; try { copy = FM.deserializeLeague(FM.serializeLeague(lg)); } catch (e) { return fail('Could not make a copy of the club to try the changes on.'); }
    const applied = acts.map((a) => { const r = FM.controls.run(copy, a.action, a.params, 'forecast'); return { a, r }; });
    const alt = project(copy);
    const out = { ok: true, method: 'forecast', title: 'Forecast: the rest of the season with ' + (s.label || 'the changes') + ' against without', n: base.matches, summary: [], tables: [], caveats: [] };
    out.tables.push({ title: 'What was tried (on a copy: nothing in your game has changed)', cols: ['Change', 'Result'], rows: applied.map(({ a, r }) => [a.action + ' ' + JSON.stringify(a.params || {}), (r.ok ? '' : 'NOT DONE: ') + r.text]) });
    const row = (name, f, money) => { const x = f(base), y = f(alt); return [name, money ? gbp(x) : sig(x), money ? gbp(y) : sig(y), (money ? (y - x >= 0 ? '+' : '−') + gbp(Math.abs(y - x)) : (y - x >= 0 ? '+' : '') + sig(y - x))]; };
    out.tables.push({ title: 'The rest of the season (' + base.matches + ' matches)', cols: ['', 'As things are', 'With the changes', 'Difference'], rows: [row('Revenue', (p) => p.revenue, true), row('Costs', (p) => p.costs, true), row('Profit before tax and depreciation', (p) => p.profit, true), row('Bank balance at the end', (p) => p.cashEnd, true), row('Lowest bank balance on the way', (p) => p.minCash, true), row('Average home crowd', (p) => p.att, false)] });
    const d = alt.cashEnd - base.cashEnd;
    out.summary.push('With the changes the club would finish the season with ' + gbp(alt.cashEnd) + ' in the bank against ' + gbp(base.cashEnd) + ' as things are: ' + (d >= 0 ? 'about ' + gbp(d) + ' better' : 'about ' + gbp(-d) + ' worse') + '. The lowest the balance gets on the way is ' + gbp(alt.minCash) + (alt.minCash < 0 ? ', which means using the overdraft' : '') + '.');
    out.chart = { type: 'bars2', x: 'matchday', y: 'bank balance (£)', labels: base.rounds.map((r) => String(r.round)), a: { name: 'as things are', values: base.rounds.map((r) => r.cash) }, b: { name: 'with the changes', values: alt.rounds.map((r) => r.cash) } };
    if (applied.some((x) => !x.r.ok)) out.caveats.push('At least one change could not be made, so it is not in the comparison.');
    out.caveats.push('Crowds are worked out from the game\'s demand model at today\'s form and league position; they will move with results. Prize money is counted at today\'s league position.');
    out.caveats.push('The effects of custom spending are exactly as capped by the game; a bigger spend does not buy a proportionally bigger effect.');
    return out;
  }

  // ---------- where the club is likely to finish ----------
  const poisson = (lam, r) => { const L = Math.exp(-lam); let k = 0, p = 1; do { k++; p *= r(); } while (p > L && k < 20); return k - 1; };
  function season(lg, s) {
    const teams = lg.teams.slice(0, 8), ids = teams.map((t) => t.id), idx = {}; ids.forEach((id, i) => { idx[id] = i; });
    const done = lg.fixtures.filter((f) => f.played && !f.friendly && idx[f.homeId] != null && idx[f.awayId] != null), todo = lg.fixtures.filter((f) => !f.played && !f.friendly && idx[f.homeId] != null && idx[f.awayId] != null);
    if (!todo.length) return fail('The season is over: there are no matches left to simulate.');
    const gf = new Array(8).fill(0), ga = new Array(8).fill(0), gp = new Array(8).fill(0), pts = new Array(8).fill(0);
    done.forEach((f) => { const h = idx[f.homeId], a = idx[f.awayId]; gf[h] += f.hg; ga[h] += f.ag; gf[a] += f.ag; ga[a] += f.hg; gp[h]++; gp[a]++; pts[h] += f.hg > f.ag ? 3 : f.hg === f.ag ? 1 : 0; pts[a] += f.ag > f.hg ? 3 : f.hg === f.ag ? 1 : 0; });
    // Each club starts from what the game itself rates it at, and is moved towards its results as matches are played (as if it had 8 matches of that rating behind it already).
    const tot = gf.reduce((x, y) => x + y, 0), games = gp.reduce((x, y) => x + y, 0), avg = games ? tot / games : 1.35, K = 8, clampv = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const attP = teams.map((t) => clampv(1 + 0.3 * (t.strength || 0), 0.7, 1.3)), defP = teams.map((t) => clampv(1 - 0.3 * (t.strength || 0), 0.7, 1.3));
    const att = teams.map((_, i) => (gp[i] * (gf[i] / Math.max(1, gp[i]) / avg) + K * attP[i]) / (gp[i] + K)), def = teams.map((_, i) => (gp[i] * (ga[i] / Math.max(1, gp[i]) / avg) + K * defP[i]) / (gp[i] + K));
    const R = rng(lg.seed + (lg.runSeed || 0) + lg.season * 13 + done.length), N = 3000, me = idx[lg.userId], posCount = new Array(8).fill(0); let ptsSum = 0; const ptsAll = [];
    for (let n = 0; n < N; n++) {
      const p = pts.slice();
      todo.forEach((f) => { const h = idx[f.homeId], a = idx[f.awayId], gh = poisson(avg * 1.08 * att[h] * def[a], R), gaw = poisson(avg * 0.93 * att[a] * def[h], R); if (gh > gaw) p[h] += 3; else if (gh < gaw) p[a] += 3; else { p[h]++; p[a]++; } });
      const order = p.map((v, i) => ({ v, i, tie: R() })).sort((x, y) => y.v - x.v || y.tie - x.tie), pos = order.findIndex((o) => o.i === me);
      posCount[pos]++; ptsSum += p[me]; ptsAll.push(p[me]);
    }
    ptsAll.sort((x, y) => x - y);
    const ord = (n) => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) || n % 10 > 3 ? 0 : n % 10]);
    const out = { ok: true, method: 'forecast', title: 'Forecast: where ' + user(lg).name + ' are likely to finish (' + N + ' simulated seasons)', n: todo.length, summary: [], tables: [], caveats: [] };
    out.tables.push({ title: 'Chance of each finishing position', cols: ['Position', 'Chance'], rows: posCount.map((c, i) => [ord(i + 1), (Math.round(1000 * c / N) / 10) + '%']) });
    out.tables.push({ title: 'Each club\'s scoring and defending, as the simulation sees them', cols: ['Club', 'Played', 'Points', 'Attack (1 = league average)', 'Defence (1 = average, lower is better)'], rows: teams.map((t, i) => [t.name, gp[i], pts[i], sig(att[i], 3), sig(def[i], 3)]) });
    const top1 = posCount[0] / N, top3 = (posCount[0] + posCount[1] + posCount[2]) / N, bottom2 = (posCount[6] + posCount[7]) / N;
    out.summary.push('From ' + done.length + ' matches played and ' + todo.length + ' still to come, ' + user(lg).name + ' are expected to finish on about ' + Math.round(ptsSum / N) + ' points (middle 90% of simulations: ' + ptsAll[Math.floor(0.05 * N)] + ' to ' + ptsAll[Math.floor(0.95 * N)] + '). The chance of winning the league is ' + Math.round(top1 * 100) + '%, of finishing in the top three ' + Math.round(top3 * 100) + '%, and of finishing in the bottom two ' + Math.round(bottom2 * 100) + '%.');
    out.chart = { type: 'bars', x: 'finishing position', y: 'chance (%)', bars: posCount.map((c, i) => ({ label: ord(i + 1), value: Math.round(1000 * c / N) / 10 })) };
    out.caveats.push('Each club starts from the rating the game gives it and is moved towards its results as matches are played (as if it already had eight matches at that rating behind it), so early in the season the forecast leans on the ratings rather than the results.');
    out.caveats.push('Goals are modelled as independent Poisson counts with a small home advantage. Injuries, tactics and changes of form during the rest of the season are not modelled.');
    return out;
  }

  // ---------- trend ----------
  function trend(lg, s) {
    const table = s.table || 'team_matches', y = s.y; if (!T.SCHEMA[table] || !T.SCHEMA[table].cols.some((c) => c.name === y)) return fail('Say which table and column to carry forward, for example team_matches and xg.');
    const where = (s.where && s.where.length ? s.where : (T.SCHEMA[table].cols.some((c) => c.name === 'you') ? [{ col: 'you', op: '=', value: 1 }] : []));
    const rows = (T.get(lg, table) || []).filter((r) => where.every((w) => ({ '=': (a, b) => a === b, '>': (a, b) => a > b, '<': (a, b) => a < b, '>=': (a, b) => a >= b, '<=': (a, b) => a <= b, '!=': (a, b) => a !== b }[w.op || '='])(r[w.col], w.value)) && Number.isFinite(r[y]));
    const xcol = T.SCHEMA[table].cols.some((c) => c.name === 'round') ? 'round' : null; if (!xcol) return fail('That table has no matchday column to run a trend along.');
    const by = {}; rows.forEach((r) => { (by[r.round] = by[r.round] || []).push(r[y]); });
    const xs = Object.keys(by).map(Number).sort((a, b) => a - b), ys = xs.map((x) => S.mean(by[x]));
    if (xs.length < 4) return fail('There ' + (xs.length === 1 ? 'is only 1 matchday' : 'are only ' + xs.length + ' matchdays') + ' of data so far: a trend needs at least 4.');
    const X = xs.map((x) => [1, x]), f = S.ols(X, ys); if (!f) return fail('Could not fit a trend line.');
    const ahead = Math.max(1, Math.min(10, Math.round(Number(s.ahead) || 5))), n = xs.length, mx = S.mean(xs), sxx = xs.reduce((a, x) => a + (x - mx) * (x - mx), 0), tq = S.tInv(0.975, n - 2);
    const fut = []; for (let k = 1; k <= ahead; k++) { const x0 = xs[n - 1] + k, mu = f.beta[0] + f.beta[1] * x0, se = f.sigma * Math.sqrt(1 + 1 / n + (x0 - mx) * (x0 - mx) / sxx); fut.push({ x: x0, mu, lo: mu - tq * se, hi: mu + tq * se }); }
    const out = { ok: true, method: 'forecast', title: 'Forecast: ' + y + ' over the next ' + ahead + ' matchdays (straight-line trend)', n, summary: [], tables: [], caveats: [] };
    out.tables.push({ title: 'The trend', cols: ['Measure', 'Value'], rows: [['Change per matchday', sig(f.beta[1])], ['p-value for a real trend', sig(f.p[1], 3)], ['R squared', sig(f.r2, 3)], ['Matchdays used', n]] });
    out.tables.push({ title: 'Forecast (average per matchday, with a 95% range for one matchday)', cols: ['Matchday', 'Forecast', 'Low', 'High'], rows: fut.map((r) => [r.x, sig(r.mu), sig(r.lo), sig(r.hi)]) });
    out.summary.push('Across ' + n + ' matchdays ' + y + ' has moved by ' + sig(f.beta[1]) + ' a matchday (p = ' + sig(f.p[1], 3) + '). Carried forward, the next matchday is expected at about ' + sig(fut[0].mu) + ', and a single matchday could plausibly fall anywhere from ' + sig(fut[0].lo) + ' to ' + sig(fut[0].hi) + '.');
    out.chart = { type: 'scatter', x: 'matchday', y: y, points: xs.map((x, i) => [x, ys[i]]).concat(fut.map((r) => [r.x, r.mu])), fit: { a: sig(f.beta[0]), b: sig(f.beta[1]) } };
    out.caveats.push('A straight line assumes nothing changes. With ' + n + ' matchdays a weak trend is very uncertain, and a forecast further ahead is less reliable than the next matchday.');
    return out;
  }

  // ---------- cash: where the bank balance is heading as things are ----------
  function cash(lg) {
    const p = project(lg); if (!p.matches) return fail('There are no matches left this season to forecast.');
    const out = { ok: true, method: 'forecast', title: 'Forecast: the bank balance for the rest of the season, as things are', n: p.matches, summary: [], tables: [], caveats: [] };
    out.tables.push({ title: 'Matchday by matchday', cols: ['Matchday', 'Home', 'Revenue', 'Costs', 'Bank balance after'], rows: p.rounds.map((r) => [r.round, r.home ? 'home' : 'away', gbp(r.revenue), gbp(r.costs), gbp(r.cash)]) });
    out.summary.push('At the current prices, wages, deals and loans the club would finish the season with about ' + gbp(p.cashEnd) + ' in the bank, having brought in ' + gbp(p.revenue) + ' and spent ' + gbp(p.costs) + ' over the ' + p.matches + ' matches left. The lowest the balance gets is ' + gbp(p.minCash) + (p.minCash < 0 ? ', which means using the overdraft' : '') + '.');
    out.chart = { type: 'bars', x: 'matchday', y: 'bank balance (£)', bars: p.rounds.map((r) => ({ label: String(r.round), value: r.cash })) };
    out.caveats.push('Crowds come from the demand model at the current form and league position, and prize money is counted at the current position; both will move with results.');
    return out;
  }

  const KINDS = { price, scenario, season, trend, cash };
  WB.register('forecast', (lg, s) => { const k = KINDS[s.kind]; if (!k) return fail('Unknown forecast "' + s.kind + '". Kinds: ' + Object.keys(KINDS).join(', ') + '.'); return k(lg, s); });
  WB.project = project;
  WB.METHOD_HELP.push('{"method":"forecast","kind":"price","stand":STAND,"from":£?,"to":£?,"step":£?}  ticket income at a range of prices for one stand over the remaining home matches (the game\'s own crowd model)');
  WB.METHOD_HELP.push('{"method":"forecast","kind":"scenario","label":"short name","actions":[{"action":ACTION,"params":{...}}]}  the rest of the season\'s money with those changes tried on a COPY of the club, against without them. Use it to test a change before proposing it');
  WB.METHOD_HELP.push('{"method":"forecast","kind":"cash"}  the bank balance matchday by matchday to the end of the season as things stand');
  WB.METHOD_HELP.push('{"method":"forecast","kind":"season"}  the chance of each finishing position from simulating the matches still to play');
  WB.METHOD_HELP.push('{"method":"forecast","kind":"trend","table":T,"y":COL,"ahead":1-10,"where":[...]?}  a measure carried forward from a fitted straight line with a 95% range');
})();
