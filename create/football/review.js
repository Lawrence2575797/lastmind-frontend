// The review of the last match: the assistant looks over the previous game, picks the two places where things went most wrong, and works through
// each one: what happened, a picture of it, a hypothesis test to see whether it was bad luck or something underneath, and, where something does
// need changing, a detailed and explained improvement for the manager to put into the tactics themselves. It is written as the assistant talking
// to the manager, and it ends by inviting questions (the LastMind AI Agent can take any of it further).
(function () {
  const FM = (window.FM = window.FM || {});
  const { L, W } = FM.PITCH;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1), f2 = (v) => (Math.round(v * 100) / 100).toFixed(2);
  const pc = (p) => (Math.round(p * 1000) / 10).toFixed(1) + '%';
  const num = (n) => Math.round(n).toLocaleString('en-GB');
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const surname = (p) => p.name.split(' ').slice(-1)[0];
  const A = () => FM.ANALYSIS_DRAW;
  const poissonUpper = (k, lam) => { let c = 0, t = Math.exp(-lam); for (let i = 0; i < k; i++) { c += t; t *= lam / (i + 1); } return Math.max(0, Math.min(1, 1 - c)); };   // P(X >= k)
  const SIG = 0.05, ACT = 0.1;   // a result is significant below 5%; below 10% something is worth changing

  // ---------- the techniques ----------
  // Used where each one is needed and not otherwise: a binomial or Poisson test for "is this more than luck", a Poisson match model and expected points for
  // "what did the chances say about the result", correlation and regression for "does this really go with winning", a chi-square test for "does it
  // depend on where or how", confidence intervals for "is this difference bigger than the noise", and a look at the seconds after an event for cause.
  function lgam(x) { const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let y = x, tmp = x + 5.5; tmp -= (x + 0.5) * Math.log(tmp); let ser = 1.000000000190015; for (let j = 0; j < 6; j++) ser += c[j] / ++y; return -tmp + Math.log(2.5066282746310005 * ser / x); }
  function betacf(a, b, x) {
    const FP = 1e-30; let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < FP) d = FP; d = 1 / d; let h = d;
    for (let m = 1; m <= 200; m++) {
      const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FP) d = FP; c = 1 + aa / c; if (Math.abs(c) < FP) c = FP; d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FP) d = FP; c = 1 + aa / c; if (Math.abs(c) < FP) c = FP; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 3e-7) break;
    }
    return h;
  }
  function ibeta(x, a, b) { if (x <= 0) return 0; if (x >= 1) return 1; const bt = Math.exp(lgam(a + b) - lgam(a) - lgam(b) + a * Math.log(x) + b * Math.log(1 - x)); return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b; }
  const tTwoSided = (t, df) => ibeta(df / (df + t * t), df / 2, 0.5);
  const erfc = (x) => { const z = Math.abs(x), t = 1 / (1 + 0.5 * z); const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))); return x >= 0 ? r : 2 - r; };
  const chi2p = (x, df) => (df === 1 ? erfc(Math.sqrt(Math.max(0, x) / 2)) : Math.exp(-Math.max(0, x) / 2));   // df 1 or 2
  const wilson = (k, n) => { if (!n) return [0, 0]; const z = 1.96, p = k / n, d = 1 + z * z / n, ctr = (p + z * z / (2 * n)) / d, w = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d; return [Math.max(0, ctr - w), Math.min(1, ctr + w)]; };
  function pearson(xs, ys) {
    const n = xs.length, mx = mean(xs), my = mean(ys); let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
    if (!(sxx > 0 && syy > 0)) return null;
    const r = sxy / Math.sqrt(sxx * syy), t = r * Math.sqrt((n - 2) / Math.max(1e-9, 1 - r * r)), slope = sxy / sxx;
    return { r, n, slope, intercept: my - slope * mx, r2: r * r, p: tTwoSided(t, n - 2) };
  }
  const pois = (l, k) => { let p = Math.exp(-l); for (let i = 1; i <= k; i++) p *= l / i; return p; };
  function outcomeProbs(lf, la) {
    let w = 0, d = 0, l = 0;
    for (let i = 0; i <= 10; i++) { const pi = pois(lf, i); for (let j = 0; j <= 10; j++) { const pj = pois(la, j); if (i > j) w += pi * pj; else if (i === j) d += pi * pj; else l += pi * pj; } }
    const s = w + d + l; return { win: w / s, draw: d / s, loss: l / s, pts: 3 * w / s + d / s };
  }
  // How a shot is shown. The match engine's own shot positions and xG are tuned for how it plays; the page shows shots where a real match would
  // have them (almost nobody shoots from inside the six-yard box) and gives them the xG a shot from there is really worth. Only the display
  // changes: the match, its goals and the stored log are untouched.
  function shotShown(e, L, W, homeShooter) {
    if (e.setPiece === 'penalty' || e.setPiece === 'freekick') return e;
    const gx = homeShooter ? L : 0, dx = Math.max(0.5, Math.abs(gx - e.x)), dy = e.y - W / 2, d = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
    const d2 = 6 + 0.95 * d, dx2 = Math.max(1.5, d2 * Math.cos(th)), dy2 = Math.max(-W / 2 + 2, Math.min(W / 2 - 2, d2 * Math.sin(th)));
    const dd = Math.hypot(dx2, dy2), ang = Math.abs(Math.atan2(dy2 + 3.66, dx2) - Math.atan2(dy2 - 3.66, dx2)), cen = 2 * Math.atan(3.66 / dd);
    let xg = 0.62 * Math.exp(-0.115 * dd) * Math.pow(Math.min(1, ang / cen), 1.2) * (e.setPiece === 'header' ? 0.6 : 1) * (0.65 + 0.35 * Math.min(e.defDist == null ? 4 : e.defDist, 4) / 4);
    return Object.assign({}, e, { x: homeShooter ? L - dx2 : dx2, y: W / 2 + dy2, xg: Math.max(0.01, Math.min(0.6, xg)) });
  }
  function shotsShown(f) {
    const home = f.homeId;
    return Object.assign({}, f, { log: Object.assign({}, f.log, { other: f.log.other.map((e) => (e.type === 'shot' ? shotShown(e, L, W, e.team === home) : e)) }) });
  }
  const shownXg = (f, teamId) => f.log && f.log.other ? f.log.other.reduce((a, e) => a + (e.type === 'shot' && e.team === teamId ? (shotShown(e, L, W, e.team === f.homeId).xg || 0) : 0), 0) : null;
  FM.shownXg = shownXg;
  // every team-match this season (league and pre-season) as a row, for asking what goes with winning
  function leagueRows(league) {
    const rows = [];
    league.fixtures.concat(league.friendlies || []).forEach((f) => {
      if (!f.played || !f.stats) return; const h = f.stats[f.homeId], a = f.stats[f.awayId]; if (!h || !a) return;
      const xh = shownXg(f, f.homeId), xa = shownXg(f, f.awayId);
      const row = (me, ag, gf, ga, xm, xo) => ({ xgd: (xm != null && xo != null ? xm - xo : me.xg - ag.xg), gd: gf - ga, pass: me.passes ? 100 * me.passesOk / me.passes : 0, poss: 100 * me.possession / Math.max(1, me.possession + ag.possession), shots: me.shots, fouls: me.fouls });
      rows.push(row(h, a, f.hg, f.ag, xh, xa)); rows.push(row(a, h, f.ag, f.hg, xa, xh));
    });
    return rows;
  }
  function scatter(rows, xk, yk, xl, yl, reg, now) {
    const W0 = 560, H0 = 300, padL = 52, padB = 44, padT = 14, padR = 16;
    const xs = rows.map((r) => r[xk]).concat([now.x]), ys = rows.map((r) => r[yk]).concat([now.y]);
    let x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    if (x1 - x0 < 1e-6) { x0 -= 1; x1 += 1; } if (y1 - y0 < 1e-6) { y0 -= 1; y1 += 1; }
    const mx = (x1 - x0) * 0.06, my = (y1 - y0) * 0.1; x0 -= mx; x1 += mx; y0 -= my; y1 += my;
    const X = (v) => padL + (v - x0) / (x1 - x0) * (W0 - padL - padR), Y = (v) => H0 - padB - (v - y0) / (y1 - y0) * (H0 - padB - padT);
    const ticks = (a, b) => [0, 0.25, 0.5, 0.75, 1].map((t) => a + (b - a) * t);
    const grid = ticks(x0, x1).map((v) => `<line x1="${X(v).toFixed(1)}" y1="${padT}" x2="${X(v).toFixed(1)}" y2="${H0 - padB}" stroke="currentColor" stroke-opacity=".12"/><text x="${X(v).toFixed(1)}" y="${H0 - padB + 16}" text-anchor="middle" font-size="11" fill="currentColor" opacity=".75">${f1(v)}</text>`).join('')
      + ticks(y0, y1).map((v) => `<line x1="${padL}" y1="${Y(v).toFixed(1)}" x2="${W0 - padR}" y2="${Y(v).toFixed(1)}" stroke="currentColor" stroke-opacity=".12"/><text x="${padL - 6}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="currentColor" opacity=".75">${f1(v)}</text>`).join('');
    const dots = rows.map((r) => `<circle cx="${X(r[xk]).toFixed(1)}" cy="${Y(r[yk]).toFixed(1)}" r="4" fill="#7FB5FF" fill-opacity=".55"/>`).join('');
    const line = reg ? `<line x1="${X(x0).toFixed(1)}" y1="${Y(reg.intercept + reg.slope * x0).toFixed(1)}" x2="${X(x1).toFixed(1)}" y2="${Y(reg.intercept + reg.slope * x1).toFixed(1)}" stroke="#FFB020" stroke-width="2.5"/>` : '';
    const me = `<circle cx="${X(now.x).toFixed(1)}" cy="${Y(now.y).toFixed(1)}" r="7" fill="#FFE27A" stroke="#000" stroke-width="2"/><text x="${(X(now.x) + 10).toFixed(1)}" y="${(Y(now.y) - 8).toFixed(1)}" font-size="12" font-weight="700" fill="currentColor">last match</text>`;
    return `<figure class="rv-fig"><svg viewBox="0 0 ${W0} ${H0}" class="rv-scatter" role="img" aria-label="${esc(yl)} against ${esc(xl)}" style="width:100%;height:auto">${grid}${line}${dots}${me}<text x="${(padL + W0 - padR) / 2}" y="${H0 - 6}" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor">${esc(xl)}</text><text x="14" y="${(padT + H0 - padB) / 2}" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor" transform="rotate(-90 14 ${(padT + H0 - padB) / 2})">${esc(yl)}</text></svg><figcaption>Each blue dot is one team in one match this season; the gold line is the line of best fit, and the yellow dot is our last match.</figcaption></figure>`;
  }
  const sumOf = (a, f) => a.reduce((x, y) => x + f(y), 0);

  // What the chances said about the result, where the gap between result and chances came from, whether chances go with results across the
  // league, and what that does and does not tell us about cause. `who` is a player (or the team) whose finishing is being asked about.
  function resultSection(c, who) {
    const ours = c.fx.log.other.filter((e) => e.type === 'shot' && e.team === c.me), theirs = c.fx.log.other.filter((e) => e.type === 'shot' && e.team !== c.me);
    const xgUs = sumOf(ours, (e) => e.xg || 0), xgThem = sumOf(theirs, (e) => e.xg || 0), pr = outcomeProbs(xgUs, xgThem);
    const pts = c.gf > c.ga ? 3 : c.gf === c.ga ? 1 : 0, short = xgUs - c.gf, over = c.ga - xgThem, swing = short + over;
    const verdictWord = pr.win >= pr.draw && pr.win >= pr.loss ? 'win' : pr.draw >= pr.loss ? 'draw' : 'defeat', actualWord = c.gf > c.ga ? 'win' : c.gf === c.ga ? 'draw' : 'defeat';
    const adj = who ? c.gf + (who.expected - who.goals) : c.gf, adjRound = Math.round(adj), adjWord = adjRound > c.ga ? 'win' : adjRound === c.ga ? 'draw' : 'defeat';
    const rows = leagueRows(c.league), reg = rows.length >= 10 ? pearson(rows.map((r) => r.xgd), rows.map((r) => r.gd)) : null;
    const share = who && short > 0.05 ? Math.min(1, Math.max(0, who.missed / Math.max(short, 0.01))) : 0, ofSwing = who && swing > 0.3 ? Math.min(1, Math.max(0, who.missed / swing)) : 0;
    const name = who ? who.name : 'our finishing';
    const tbl = `<table class="books-table calc"><thead><tr><th class="l">What the chances say about the result</th><th>Us</th><th>${esc(c.opp.name)}</th></tr></thead><tbody>
      <tr><td class="l">Expected goals (xG) from the chances created</td><td class="n">${f2(xgUs)}</td><td class="n">${f2(xgThem)}</td></tr>
      <tr><td class="l">Goals scored</td><td class="n">${c.gf}</td><td class="n">${c.ga}</td></tr>
      <tr><td class="l">Goals compared with the chances (goals − xG)</td><td class="n">${(c.gf - xgUs >= 0 ? '+' : '') + f2(c.gf - xgUs)}</td><td class="n">${(c.ga - xgThem >= 0 ? '+' : '') + f2(c.ga - xgThem)}</td></tr>
      <tr class="tot"><td class="l">How likely each result was, from the chances alone (Poisson model)</td><td class="l" colspan="2">win <b>${pc(pr.win)}</b> · draw <b>${pc(pr.draw)}</b> · defeat <b>${pc(pr.loss)}</b></td></tr>
      <tr><td class="l">Expected points from the chances / points we took</td><td class="n" colspan="2">${f2(pr.pts)} / ${pts}</td></tr></tbody></table>`;
    const gap = `<table class="books-table calc"><thead><tr><th class="l">Where the gap between chances and result came from</th><th>Goals</th></tr></thead><tbody>
      <tr><td class="l">${short >= 0 ? 'We scored fewer' : 'We scored more'} than our chances were worth</td><td class="n">${f2(Math.abs(short))}</td></tr>
      ${who ? `<tr><td class="l">&nbsp;&nbsp;of which ${esc(who.name)}'s own ${who.missed >= 0 ? 'shortfall' : 'surplus'}</td><td class="n">${f2(Math.abs(who.missed))}</td></tr>` : ''}
      <tr><td class="l">${esc(c.opp.name)} scored ${over >= 0 ? 'more' : 'fewer'} than their chances were worth</td><td class="n">${f2(Math.abs(over))}</td></tr>
      <tr class="tot"><td class="l">${swing >= 0 ? 'Total swing against us: the result was worse than the chances deserved' : 'Total swing in our favour: the result was better than the chances deserved'}</td><td class="n">${f2(Math.abs(swing))}</td></tr></tbody></table>`;
    const corr = reg ? `${scatter(rows, 'xgd', 'gd', 'xG difference in the match (for − against)', 'Goal difference', reg, { x: xgUs - xgThem, y: c.gf - c.ga })}
      <p>Across ${reg.n} team-matches this season, the correlation between the xG difference and the goal difference is <b>r = ${f2(reg.r)}</b> (r² = ${f2(reg.r2)}, so the chances explain about ${Math.round(reg.r2 * 100)}% of the variation in results). ${reg.p < 0.05 ? `With a p-value of ${reg.p < 0.001 ? 'below 0.1%' : pc(reg.p)}, that is statistically significant.` : `With a p-value of ${pc(reg.p)}, that is not yet statistically significant.`} The line of best fit says each extra 1.0 of xG difference goes with about <b>${f2(reg.slope)}</b> more goals of goal difference.</p>` : `<p>There are not yet enough matches in the league to measure how closely chances go with results (it needs about ten team-matches); it will appear as the season goes on.</p>`;
    const caution = `<p><b>Correlation is not causation.</b> That the chances and the results go together across the league shows they are associated; it does not by itself show that ${esc(name)}${who ? "'s misses" : ''} decided this match. To get nearer to cause I asked three things. <b>Does it come first and can it work?</b> A chance that is missed is a goal that is not scored, so ${who ? 'his misses' : 'the misses'} did reduce our total, and goals decide matches by definition. <b>Is there another explanation?</b> ${over > 0.4 ? `Yes: ${esc(c.opp.name)} scored ${c.ga} from chances worth ${f2(xgThem)}, which is ${f2(over)} more than expected. Some of the swing is their good luck, not our failing.` : `Not really: ${esc(c.opp.name)} scored about what their chances were worth, so there is no large piece of luck on their side to point to.`} <b>How big is it?</b> ${who ? `${esc(who.name)}'s shortfall of ${f2(who.missed)} goals is ${Math.round(ofSwing * 100)}% of the total swing of ${f2(swing)}.` : `Our shortfall is ${f2(short)} goals out of a total swing of ${f2(swing)}.`}</p>`;
    let verdict;
    if (swing < -0.3) verdict = `The result was better than the chances deserved, so ${esc(name)} did not cost us here: we were helped by luck${over < -0.4 ? ' at the other end, where ' + esc(c.opp.name) + ' scored fewer than their chances were worth' : ''}. A result like this should not be read as proof that the way we play is working.`;
    else if (swing <= 0.3) verdict = `The result was about what the chances deserved, so ${esc(name)} was not the reason we got what we got.`;
    else if (adjWord !== actualWord && ofSwing >= 0.4) verdict = `Taken together: had ${who ? esc(who.name) : 'we'} converted at the league rate, the score would have been about ${adjRound}-${c.ga} (a ${adjWord}, not a ${actualWord}), and the shortfall is a large part of the swing. So it is fair to say the finishing was the main reason the result went against us. Whether that is something to fix depends on the test above: if it says it was probably chance, the sensible reading is that we were unlucky, not that the finishing is poor.`;
    else if (ofSwing >= 0.4) verdict = `Taken together: ${who ? esc(who.name) : 'our finishing'} accounts for a large part of the swing, but even at the league rate the match would have finished ${adjRound}-${c.ga}, still a ${adjWord}. So it explains part of why we did not do better, not why the result was what it was.`;
    else verdict = `Taken together: ${who ? esc(who.name) : 'our finishing'} is only a small part of the swing (${Math.round(ofSwing * 100)}%). Most of why the result was not better lies elsewhere: ${over > 0.4 ? 'the opposition finished well above what their chances deserved, and ' : ''}the other areas of the game matter more here.`;
    return `<div class="rv-cause"><h4>${c.gf > c.ga ? 'Did it matter for the result?' : c.gf === c.ga ? 'Was it the reason we did not win?' : 'Was it the reason we lost?'}</h4><p>${verdictWord === actualWord ? `From the chances alone, the most likely result was a ${verdictWord}, which is what we got.` : `From the chances alone, the most likely result was a <b>${verdictWord}</b> (${pc(pr[verdictWord === 'defeat' ? 'loss' : verdictWord])}), and we got a ${actualWord}.`} Here is what the chances said, and where the difference came from.</p>
      <div class="books-wrap">${tbl}</div><div class="books-wrap">${gap}</div>
      ${who ? `<p>If ${esc(who.name)} had converted his ${who.n} shot${who.n === 1 ? '' : 's'} at the league rate ${f2(who.p0)}, he would have scored ${f2(who.expected)} instead of ${who.goals}, which gives an adjusted score of about ${f1(adj)}-${c.ga}.</p>` : ''}
      ${corr}${caution}<p class="rv-verdict">${verdict}</p></div>`;
  }

  // Does this go with winning? One thing, set against the goal difference over every team-match this season.
  function matterSection(c, key, label, unit) {
    const rows = leagueRows(c.league).filter((r) => key !== 'pass' || r.pass > 0), reg = rows.length >= 10 ? pearson(rows.map((r) => r[key]), rows.map((r) => r.gd)) : null;
    if (!reg) return `<p>I would also like to check whether ${esc(label)} goes with winning across the league, but there are not enough matches in the league yet (about ten team-matches are needed).</p>`;
    const now = c.fx.stats && c.fx.stats[c.me] ? (key === 'pass' ? (c.fx.stats[c.me].passes ? 100 * c.fx.stats[c.me].passesOk / c.fx.stats[c.me].passes : 0) : 0) : 0;
    return `<div class="rv-cause"><h4>Does ${esc(label)} actually go with winning?</h4>
      ${scatter(rows, key, 'gd', label + ' (' + unit + ')', 'Goal difference', reg, { x: now, y: c.gf - c.ga })}
      <p>Across ${reg.n} team-matches this season the correlation between ${esc(label)} and goal difference is <b>r = ${f2(reg.r)}</b> (p = ${reg.p < 0.001 ? 'below 0.1%' : pc(reg.p)}), so ${reg.p < 0.05 ? (Math.abs(reg.r) >= 0.5 ? 'it is strongly' : 'it is somewhat') + ' associated with results' : 'it has not been shown to be associated with results so far'}. The line says each extra ${unit.indexOf('%') >= 0 ? 'percentage point' : 'unit'} goes with about <b>${f2(reg.slope)}</b> goals of goal difference.</p>
      <p><b>Correlation is not causation.</b> Teams that pass the ball well also tend to be the better teams, and teams that are winning also tend to keep the ball. So this tells us the figure is worth improving only if the improvement comes without losing something else: it does not tell us that passing more accurately <i>makes</i> a team win. Treat it as a reason to try a change and then test whether the change worked, which is a fairer test of cause.</p></div>`;
  }

  // What happened in the seconds after we lost the ball: did the shots against follow our turnovers?
  function linkSection(c, mode) {
    const xr = c.fx.log.xr; if (!xr) return '';
    const dur = Math.max(600, c.fx.log.duration || 5400), losses = xr.seq.filter((q) => q[0] === c.side && q[6] === 0 && q[8] >= 0 && (mode === 'all' || q[8] < 1 / 3));
    const theirs = c.fx.log.other.filter((e) => e.type === 'shot' && e.team !== c.me);
    if (losses.length < 3) return '';
    const WINDOW = 15, followed = losses.filter((q) => { const T = q[1] + q[7]; return theirs.some((e) => e.t >= T && e.t <= T + WINDOW); }).length;
    const base = Math.min(0.95, theirs.length * WINDOW / dur), pv = FM.binomTest(followed, losses.length, Math.max(0.001, base), 'greater');
    return `<div class="rv-cause"><h4>Did losing the ball lead to their chances?</h4>
      <p>Whether one thing caused another is easier to judge when you can see one follow the other. I looked at the ${WINDOW} seconds after each of our ${losses.length} ${mode === 'all' ? '' : 'own-third '}turnovers, and counted how many were followed by a shot for ${esc(c.opp.name)}. <b>${followed}</b> of them (${pc(followed / losses.length)}) were. A shot happens in about ${pc(base)} of ordinary ${WINDOW}-second stretches in this match, so if turnovers made no difference we would expect about ${f1(losses.length * base)} of them to be followed by a shot.</p>
      <p>The probability of seeing ${followed} or more by chance, if the turnovers made no difference (a binomial test with p = ${f2(base)}), is <b>${pc(pv)}</b>: ${pv < SIG ? 'significant, so the shots really do tend to follow our turnovers. That fits a cause you can act on: the chances are coming from the ball we give away, not only from how the opposition attack.' : 'not significant, so there is no clear sign from this match that the turnovers are what led to their chances.'}</p>
      <p class="note">One match is a small sample, and the opposition may be both pressing us into mistakes and attacking well: those would produce the same pattern. It is the best evidence one match can give, and the next review will check it again.</p></div>`;
  }
  function sourceSection(c) {
    const xr = c.fx.log.xr, theirs = c.fx.log.other.filter((e) => e.type === 'shot' && e.team !== c.me);
    if (!theirs.length) return '';
    const losses = xr ? xr.seq.filter((q) => q[0] === c.side && q[6] === 0 && q[8] >= 0).map((q) => q[1] + q[7]) : [];
    let turn = 0, setp = 0, other = 0, xgTurn = 0, xgSet = 0, xgOther = 0;
    theirs.forEach((e) => { const xg = e.xg || 0; if (e.setPiece === 'freekick' || e.setPiece === 'penalty') { setp++; xgSet += xg; } else if (losses.some((T) => e.t >= T && e.t <= T + 15)) { turn++; xgTurn += xg; } else { other++; xgOther += xg; } });
    return `<div class="books-wrap"><table class="books-table calc"><thead><tr><th class="l">Where their shots came from</th><th>Shots</th><th>xG</th></tr></thead><tbody>
      <tr><td class="l">Within 15 seconds of us losing the ball</td><td class="n">${turn}</td><td class="n">${f2(xgTurn)}</td></tr>
      <tr><td class="l">From free kicks and penalties</td><td class="n">${setp}</td><td class="n">${f2(xgSet)}</td></tr>
      <tr><td class="l">After a settled attack</td><td class="n">${other}</td><td class="n">${f2(xgOther)}</td></tr></tbody></table></div>`;
  }
  // Does where we challenge go with whether we win? (chi-square test of independence)
  function zoneSection(c, rows) {
    const zones = [['our own third', (d) => d < 1 / 3], ['the middle third', (d) => d >= 1 / 3 && d < 2 / 3], ['their third', (d) => d >= 2 / 3]];
    const data = zones.map(([n, f]) => { const r = rows.filter((x) => f(mine(c, x[5], x[6]).d)); return { n, tot: r.length, won: r.filter((x) => x[4] === 1).length }; });
    if (data.filter((d) => d.tot >= 3).length < 2) return '';
    const T = sumOf(data, (d) => d.tot), Wn = sumOf(data, (d) => d.won), pw = Wn / T;
    let chi = 0; data.forEach((d) => { if (!d.tot) return; const ew = d.tot * pw, el = d.tot * (1 - pw); chi += (d.won - ew) ** 2 / Math.max(ew, 1e-9) + ((d.tot - d.won) - el) ** 2 / Math.max(el, 1e-9); });
    const df = data.filter((d) => d.tot > 0).length - 1, pv = chi2p(chi, Math.min(2, Math.max(1, df)));
    return `<div class="rv-cause"><h4>Does where we challenge change whether we win?</h4><div class="books-wrap"><table class="books-table"><thead><tr><th class="l">Where</th><th>Challenges</th><th>Won</th><th>Won (95% interval)</th></tr></thead><tbody>${data.map((d) => { const [lo, hi] = wilson(d.won, d.tot); return `<tr><td class="l">${d.n}</td><td class="n">${d.tot}</td><td class="n">${d.won}</td><td class="n">${d.tot ? pc(d.won / d.tot) + ' (' + pc(lo) + ' to ' + pc(hi) + ')' : '–'}</td></tr>`; }).join('')}</tbody></table></div>
      <p>I used a chi-square test of independence to see whether the share we win depends on the part of the pitch: χ² = ${f2(chi)} with ${Math.min(2, Math.max(1, df))} degree${df === 1 ? '' : 's'} of freedom gives a p-value of <b>${pc(pv)}</b>. ${pv < SIG ? 'That is significant: where we challenge really does go with whether we win, so the zone where we win least is the one to change.' : 'That is not significant, so with this sample we cannot say the zone matters. The intervals are wide because there are only a few challenges in each zone.'}</p></div>`;
  }
  // Does the defender's distance go with whether a dribble comes off? (chi-square on a 2 × 2 table)
  function distanceSection(c, rows) {
    const near = rows.filter((r) => r[6] < 2), far = rows.filter((r) => r[6] >= 2);
    if (near.length < 3 || far.length < 3) return '';
    const a = near.filter((r) => r[3] === 1).length, b = near.length - a, cc = far.filter((r) => r[3] === 1).length, d = far.length - cc, n = a + b + cc + d;
    const num2 = n * (Math.abs(a * d - b * cc) - n / 2) ** 2, den = (a + b) * (cc + d) * (a + cc) * (b + d), chi = den > 0 ? Math.max(0, num2) / den : 0, pv = chi2p(chi, 1);
    return `<div class="rv-cause"><h4>Does the defender's distance decide the dribble?</h4><div class="books-wrap"><table class="books-table"><thead><tr><th class="l">Nearest defender</th><th>Dribbles</th><th>Came off</th><th>Share</th></tr></thead><tbody>
      <tr><td class="l">Closer than 2 m</td><td class="n">${near.length}</td><td class="n">${a}</td><td class="n">${pc(a / near.length)}</td></tr><tr><td class="l">2 m or more</td><td class="n">${far.length}</td><td class="n">${cc}</td><td class="n">${pc(cc / far.length)}</td></tr></tbody></table></div>
      <p>A chi-square test (with a continuity correction, because the counts are small) gives χ² = ${f2(chi)} and a p-value of <b>${pc(pv)}</b>. ${pv < SIG ? 'The difference is significant: the dribble really is much more likely to fail with a defender that close, so the lesson is about when to dribble, not who.' : `It is not significant with this few dribbles, but the direction (${pc(a / near.length)} against ${pc(cc / far.length)}) is what you would expect, and it is the pattern to watch.`}</p></div>`;
  }
  // The shares of passes completed this match and earlier, with their 95% intervals: is the difference bigger than the noise?
  function intervalTable(label, k, n, k0, n0) {
    const [a, b] = wilson(k, n), [a0, b0] = wilson(k0, n0), overlap = !(a > b0 || a0 > b);
    return `<div class="books-wrap"><table class="books-table calc"><thead><tr><th class="l">${esc(label)}</th><th>Attempts</th><th>Completed</th><th>Share</th><th>95% interval</th></tr></thead><tbody>
      <tr><td class="l">This match</td><td class="n">${n}</td><td class="n">${k}</td><td class="n">${pc(k / n)}</td><td class="n">${pc(a)} to ${pc(b)}</td></tr><tr><td class="l">Earlier matches</td><td class="n">${n0}</td><td class="n">${k0}</td><td class="n">${pc(k0 / n0)}</td><td class="n">${pc(a0)} to ${pc(b0)}</td></tr></tbody></table></div>
      <p>The two 95% intervals ${overlap ? 'overlap, which already hints that the difference may be within the noise' : 'do not overlap, which already hints that the difference is real'}. The test below puts a precise number on it.</p>`;
  }

  // ---------- the data from the last match ----------
  function context(league) {
    const me = league.userId, played = league.fixtures.filter((f) => f.played && f.log && (f.homeId === me || f.awayId === me)).sort((a, b) => a.round - b.round);
    if (!played.length) return null;
    const fx = played[played.length - 1], before = played.slice(0, -1), home = fx.homeId === me;
    const opp = FM.teamById(league, home ? fx.awayId : fx.homeId), team = FM.teamById(league, me), side = home ? 0 : 1;
    const gf = home ? fx.hg : fx.ag, ga = home ? fx.ag : fx.hg;
    // positions are kept as if the home side attacked to the right; this puts any team's on the page attacking to the right
    const flip = (teamIsHome, x, y) => (teamIsHome ? [x, y] : [L - x, W - y]);
    return { league, fx: shotsShown(fx), before, home, opp, team, side, gf, ga, me, flip };
  }
  const nameOf = (team, number) => { const p = team.squad.find((q) => q.number === number); return p ? (p.name ? p : Object.assign({}, p, { name: 'Number ' + number })) : { name: 'Number ' + number, natural: '?', ratings: {} }; };
  // a position from a log row, as depth and width (0 to 1) from our own team's point of view
  const mine = (c, x, y) => (c.home ? { d: x / L, w: y / W } : { d: 1 - x / L, w: 1 - y / W });

  // ---------- drawing ----------
  const pitch = (inner, label) => `<svg class="amap rv-map" viewBox="0 0 ${A().PW} ${A().PH}" role="img" aria-label="${esc(label)}">${A().pitchLines()}${inner}</svg>`;
  const px = (x) => (x / L * A().PW).toFixed(1), py = (y) => (y / W * A().PH).toFixed(1);
  function shotMap(c, shots, who, shooterIsHome) {
    const dots = shots.map((e) => {
      const [x, y] = c.flip(shooterIsHome, e.x, e.y), r = 7 + 22 * Math.sqrt(Math.min(e.xg || 0, 0.8)), goal = e.outcome === 'goal', col = goal ? '#FFE27A' : e.outcome === 'saved' ? '#7FB5FF' : e.outcome === 'blocked' ? '#C9A0FF' : '#FF5A36';
      return `<g><circle cx="${px(x)}" cy="${py(y)}" r="${r.toFixed(1)}" fill="${col}" fill-opacity=".62" stroke="#fff" stroke-width="2"/><text x="${px(x)}" y="${(+py(y) + 4.5).toFixed(1)}" text-anchor="middle" font-size="13" font-weight="800" fill="#000" stroke="#fff" stroke-width="3" style="paint-order:stroke">${f2(e.xg || 0)}</text></g>`;
    }).join('');
    return `<figure class="rv-fig">${pitch(dots, who + ' shot map')}<figcaption>Each circle is a shot, with its xG written on it and its size showing the quality of the chance. <span style="color:#FFE27A">Yellow</span> scored, <span style="color:#7FB5FF">blue</span> was saved, <span style="color:#C9A0FF">purple</span> was blocked, <span style="color:#FF5A36">red</span> missed the target. Attacking to the right.</figcaption></figure>`;
  }
  function dotMap(points, color, label, caption) {
    const dots = points.map((p) => `<circle cx="${px(p[0])}" cy="${py(p[1])}" r="9" fill="${p[2] || color}" fill-opacity=".72" stroke="#fff" stroke-width="2"/>`).join('');
    return `<figure class="rv-fig">${pitch(dots, label)}<figcaption>${caption}</figcaption></figure>`;
  }
  function passMap(c, rows, label, caption, onlyFails) {
    const lines = rows.filter((r) => !onlyFails || r[4] !== 1).map((r) => {
      const [x, y] = c.flip(c.home, r[5], r[6]), [tx, ty] = r[11] >= 0 ? c.flip(c.home, r[11], r[12]) : [x, y], ok = r[4] === 1, col = ok ? '#7FD49A' : '#FF5A36';
      return `<line x1="${px(x)}" y1="${py(y)}" x2="${px(tx)}" y2="${py(ty)}" stroke="${col}" stroke-width="3.5"${ok ? '' : ' stroke-dasharray="7 5"'} stroke-opacity=".85"/><circle cx="${px(tx)}" cy="${py(ty)}" r="6" fill="${col}" stroke="#fff" stroke-width="1.5"/><circle cx="${px(x)}" cy="${py(y)}" r="5" fill="#fff" stroke="#000" stroke-width="1.5"/>`;
    }).join('');
    return `<figure class="rv-fig">${pitch(lines, label)}<figcaption>${caption}</figcaption></figure>`;
  }

  // ---------- the test, worked through the way it would be explained to someone who has never met it ----------
  // Every step says what is being done and why, in an order where nothing is used before it has been explained. The technical words are buttons that open a lesson
  // (review_teach.js), and those lessons have buttons of their own.
  const TL = (id, words) => (FM.teach ? FM.teach.link(id, words) : words);
  const cap1 = (x) => String(x).charAt(0).toUpperCase() + String(x).slice(1);
  function binPmf(n, k, p) {
    if (p <= 0) return k === 0 ? 1 : 0; if (p >= 1) return k === n ? 1 : 0;
    const lf = (m) => { let a = 0; for (let i = 2; i <= m; i++) a += Math.log(i); return a; };
    return Math.exp(lf(n) - lf(k) - lf(n - k) + k * Math.log(p) + (n - k) * Math.log(1 - p));
  }
  // a tiny chance is said as "less than 0.1%" rather than shown as 0.0%
  const pcs = (x) => (x < 0.001 ? 'less than 0.1%' : pc(x));
  function alevelWork(t) {
    const verdict = t.p < SIG
      ? `<b>${pcs(t.p)}</b> is below 5%, so the result is <b>statistically significant</b>: ${t.sig}`
      : `<b>${pcs(t.p)}</b> is 5% or more, so the result is <b>not statistically significant</b>: ${t.notSig}`;
    const decide = `<li><b>I compared that with the line.</b> The usual line for "surprising enough" is 5%, called the ${TL('significance', 'significance level')}. Our ${TL('pvalue', 'p-value')} is ${pcs(t.p)}. ${verdict}${t.p < SIG ? '' : ' That does not prove nothing has changed: it means this one match is not enough evidence to say.'} One match is a small sample, so the next review will test it again with more evidence.</li>`;
    const alt = `<li><b>I assumed nothing had changed.</b> I began by assuming this was an ordinary match for us, so that the true average has not moved. Starting from "nothing has changed" is the standard fair way to test an idea, and it is called the ${TL('hypothesis', 'null hypothesis')}. The idea I tested against it, the ${TL('hypothesis', 'alternative hypothesis')}, was: <i>${t.h1.replace(/\s*\(p &lt;[^)]*\)/, '').replace(/\.$/, '')}.</i></li>`;
    const aim = t.aim ? `<p class="rv-aim">${t.aim}</p>` : '';
    if (t.kind === 'poisson') {
      const lam = t.lam, k = t.k, m = Math.max(0, Math.round(lam)), Pm = pois(lam, m), Pk = pois(lam, k), three = pois(lam, k) + pois(lam, k + 1) + pois(lam, k + 2);
      return `${aim}<div class="rv-work"><h4>What I did</h4><ol class="rv-do">
        <li><b>I started with what is normal for us.</b> Our record so far: ${t.baseline}. That is our usual ${TL('average', 'rate')}, which I write as λ = ${f1(lam)}.</li>
        ${alt}
        <li><b>I asked the question the fair way.</b> ${k} is ${k > lam ? 'more than' : 'not more than'} ${f1(lam)}, but no two matches are ever the same, so one bigger number proves nothing on its own. The fair question is: <i>if the average really is still ${f1(lam)}, how often would a match give ${k} or more just by chance?</i> That chance is called the ${TL('pvalue', 'p-value')}.</li>
        <li><b>I used the Poisson distribution to count the chances.</b> Things that happen at random moments through a match, like ${t.thing}, are described by the ${TL('poisson', 'Poisson distribution')}. It gives the chance of exactly <i>j</i> of them as e<sup>−λ</sup> × λ<sup><i>j</i></sup> ÷ <i>j</i>!, and the lesson builds that from scratch (you do not need to remember it). Using λ = ${f1(lam)}: exactly ${m}, the most likely number, has a chance of ${pcs(Pm)}; exactly ${k} has a chance of only ${pcs(Pk)}.</li>
        <li><b>I added up every result at least as surprising.</b> "${k} or more" means exactly ${k}, or exactly ${k + 1}, or exactly ${k + 2}, and so on upwards. The first three of those add up to ${pcs(three)}. Carrying on until the chances are too small to matter, the total comes to ${pcs(t.p)}. That total is the p-value: the chance of a match like this one, or more extreme, if nothing had changed.</li>
        ${decide}</ol></div>`;
    }
    if (t.kind === 'binom') {
      const n = t.n, p0 = t.p0, k = t.k, E = n * p0, m = Math.round(E);
      let partial = 0; for (let j = 0; j <= Math.min(k, 2); j++) partial += binPmf(n, j, p0);
      return `${aim}<div class="rv-work"><h4>What I did</h4><ol class="rv-do">
        <li><b>I started with what is normal for us.</b> Our record so far: ${t.baseline}. That is our usual success rate, ${f2(p0)} (${Math.round(p0 * 100)}%): about ${Math.round(p0 * 100)} in every 100 ${t.what}. It is the ${TL('average', 'average')} of how we have done so far.</li>
        ${alt}
        <li><b>I worked out what to expect.</b> This match there were ${n} ${t.what}. At our usual rate I would expect ${n} × ${f2(p0)} = ${f1(E)} of them ${t.yes}. We actually had ${k}. But no two matches are the same, so a gap on its own proves nothing. The fair question is: <i>if our usual rate still holds, how often would we get ${k} or fewer out of ${n} just by chance?</i> That chance is the ${TL('pvalue', 'p-value')}.</li>
        <li><b>I used the binomial distribution to count the chances.</b> Each of the ${n} ${t.what} either works or does not, with the same chance each time, and one does not affect the next. That is exactly the situation the ${TL('binomial', 'binomial distribution')} describes. It gives the chance of exactly <i>j</i> successes as C(${n}, <i>j</i>) × ${f2(p0)}<sup><i>j</i></sup> × ${f2(1 - p0)}<sup>${n} − <i>j</i></sup>, and the lesson builds it from scratch (using ${TL('factorial', 'counting the ways to choose')}). Here, exactly ${m}, the most likely number, has a chance of ${pcs(binPmf(n, m, p0))}; exactly ${k} has a chance of ${pcs(binPmf(n, k, p0))}.</li>
        <li><b>I added up every result at least as bad.</b> "${k} or fewer" means exactly ${k}, or exactly ${Math.max(0, k - 1)}, or exactly ${Math.max(0, k - 2)}, and so on down to 0. ${k >= 2 ? `The three at the bottom end (0, 1 and 2) alone add to ${pcs(partial)}; ` : ''}adding every one from 0 up to ${k} gives ${pcs(t.p)}. That total is the p-value: the chance of a match this poor, or poorer, if nothing had changed.</li>
        ${decide}</ol></div>`;
    }
    return `${aim}<div class="rv-test"><h4>The test</h4><p>${verdict}</p></div>`;
  }
  // GCSE: the same question, asked with ideas from GCSE maths (averages, expected counts, probability as a chance, 1 in 20). The calculation behind the
  // number is done for the reader and pointed to, not required.
  function gcseWork(t) {
    const E = t.kind === 'poisson' ? t.lam : t.n * t.p0, d = t.k - E, oneIn = Math.max(2, Math.round(1 / Math.max(t.p, 0.0005)));
    const aim = t.aim ? `<p class="rv-aim">${t.aim}</p>` : '';
    const unit = t.kind === 'poisson' ? t.thing : t.what;
    const verdict = t.p < SIG
      ? `That is less than 5%, so a gap this big would be <b>unusual</b> if nothing had changed: ${t.sig}`
      : `That is more than 5%, so a gap like this is <b>not unusual</b>: ${t.notSig}`;
    return `${aim}<div class="rv-work"><h4>What I did</h4><ol class="rv-do">
      <li><b>I started with what is normal for us.</b> Our record so far: ${t.baseline}. ${t.kind === 'poisson' ? `That means in a normal match we get about ${f1(t.lam)}.` : `That means about ${Math.round(t.p0 * 100)} in every 100 ${t.what} ${t.yes.replace(/^to be /, 'are ').replace(/^to /, '')}.`} This is the ${TL('average', 'average')}, and it is what I compared this match with.</li>
      <li><b>I worked out what I would expect.</b> ${t.kind === 'poisson' ? `At our usual average, a match gives about ${f1(E)}.` : `With ${t.n} ${t.what}, at our usual rate I would expect ${t.n} × ${f2(t.p0)} = ${f1(E)} of them ${t.yes.replace(/^to be /, 'to be ').replace(/^to /, 'to ')}.`} This match we got ${t.k}. That is ${d === 0 ? 'exactly what I expected' : `${f1(Math.abs(d))} ${d > 0 ? 'more' : 'fewer'} than expected`}.</li>
      <li><b>I asked whether that gap is a lot or just luck.</b> No two matches are the same, so there is always some gap, even when nothing has changed. What matters is how often luck <i>alone</i> would give a gap as big as this one. That is a ${TL('chance', 'probability')} (a chance written as a percentage). A computer worked it out from how counts like ${unit} normally scatter around an average (if you are curious how, the ${TL('poisson', 'Poisson')} lesson builds it from scratch, but you do not need it to use the answer). The answer is <b>${pcs(t.p)}</b>, which is about 1 match in ${oneIn}.</li>
      <li><b>I read the number.</b> A common rule of thumb is the ${TL('unusual', '1-in-20 rule')}: if luck alone would do it less than 1 time in 20 (5%), it is unusual enough to take seriously. ${verdict} One match is a small amount of evidence, so the next review will look again.</li></ol></div>`;
  }
  // Beyond A-level: the A-level test, then how big the change is, with an interval, and the problem of looking in many places at once.
  function aboveWork(t) {
    const base = alevelWork(t);
    let lo, hi, what;
    if (t.kind === 'poisson') { const w = 1.96 * Math.sqrt(Math.max(t.k, 1)); lo = Math.max(0, t.k - w); hi = t.k + w; what = `the underlying number for a match like this one is between ${f1(lo)} and ${f1(hi)}, against our usual ${f1(t.lam)}`; }
    else { const [a, b] = wilson(t.k, t.n); lo = a; hi = b; what = `the underlying success rate in a match like this one is between ${pc(a)} and ${pc(b)}, against our usual ${pc(t.p0)}`; }
    const usual = t.kind === 'poisson' ? t.lam : t.p0, inside = usual >= lo && usual <= hi;
    const extra = `<li><b>I measured how big the change is, not only whether it exists.</b> A significant result only says "probably not luck"; it does not say how large the change is. So I put a ${TL('interval', '95% confidence interval')} on this match: ${what}. ${inside ? 'Our usual figure sits inside that range, which fits with the result being luck or only a small change.' + (t.p < SIG ? ' (The test above only asked about "more than usual" in one direction, so it can call the result significant while a two-sided 95% range still just reaches our usual figure: they are answering slightly different questions.)' : '') : 'Our usual figure sits outside that range, which agrees with there having been a real change, and the distance between them shows how big.'}</li>
      <li><b>I allowed for how many places I looked.</b> I checked ${reviewAreas} different areas of this match, not one. Each test has a 1-in-20 chance of a false alarm, so even if nothing at all had changed I would expect about ${f1(reviewAreas * 0.05)} of them to look significant by luck alone. That is the ${TL('multiple', 'problem of testing many things at once')}. So treat a result like this as a lead to check in the next match, not a conclusion.</li>`;
    return base.replace('</ol></div>', extra + '</ol></div>');
  }
  function testBlock(t) {
    if (!t.kind) return alevelWork(t);
    return reviewTier === 'gcse' ? gcseWork(t) : reviewTier === 'above' ? aboveWork(t) : alevelWork(t);
  }
  // The improvement: written out for the manager to carry into the tactics themselves. When the test says something is wrong (or close to it) it is a
  // full explanation: why, where to change it, what to expect, and how to check it worked. Otherwise it says to leave it alone and what to watch.
  // Instruction box on a phase page: the recommendation is always something the manager can actually write or drag.
  const IB = (page, text) => `<b>${page} page ▸ the box “Anything else you want to tell them”:</b> write an instruction such as <i>“${text}”</i>`;
  function improve(p, o) {
    const steps = `<p><b>Where to make the change</b></p><ol>${o.steps.map((s) => `<li>${s}</li>`).join('')}</ol>
        <p><b>What you should see:</b> ${o.expect}</p><p><b>How to check it worked:</b> ${o.check}</p>`;
    const pct = (p * 100).toFixed(1) + '%';
    if (p < SIG) {
      return `<div class="rv-improve"><h4>What I would change</h4>${o.why.map((x) => `<p>${x}</p>`).join('')}${steps}
        <p class="note">These are suggestions, not orders. Written instructions are the most direct way to change what the team does, because the team follows what you write before it follows the shape you have drawn. Put them in your own words and the tests will tell you whether you were right.</p></div>`;
    }
    if (p < ACT) {
      return `<div class="rv-improve rv-calm"><h4>Nothing here needs changing</h4><p>The result is <b>not statistically significant</b> (p = ${pct}), so the data does not show a real problem and you do not have to change anything. ${o.leave}</p>
        <details><summary><b>If you still want to try something (optional)</b></summary>${o.why.map((x) => `<p>${x}</p>`).join('')}${steps}
        <p class="note">Everything above is optional. With a result this uncertain, changing a working tactic could just as easily make things worse, so only try it if you have your own reason to.</p></details>
        <p><b>What to keep an eye on:</b> ${o.watch}</p></div>`;
    }
    return `<div class="rv-improve rv-calm"><h4>Does anything need changing?</h4><p>${o.leave}</p><p><b>What to keep an eye on:</b> ${o.watch}</p></div>`;
  }
  const METHOD = {
    finishing: 'a binomial test, because each shot is either a goal or not; an expected-goals (Poisson) model, to see what the chances said the result should have been; and a correlation across the league, to ask whether chances really go with winning and what that does and does not prove.',
    passFinal: 'confidence intervals and a binomial test against our own record, then a correlation across the league to ask whether passing goes with winning.', passMid: 'confidence intervals and a binomial test against our own record, then a correlation across the league to ask whether passing goes with winning.', passBuild: 'confidence intervals and a binomial test against our own record, then a correlation across the league to ask whether passing goes with winning.',
    crossing: 'a binomial test against our own record, because each cross either finds a teammate or does not.',
    turnovers: 'a Poisson test, because these are counts of events, and a look at what happened in the seconds after each loss, to judge cause.',
    defending: 'a Poisson test against the league, a breakdown of where the shots came from, and a look at the seconds after our turnovers, to judge cause.',
    duels: 'a binomial test against our own record and a chi-square test to see whether where we challenge matters.',
    dribbling: 'a binomial test against our own record and a chi-square test to see whether the defender\'s distance matters.',
    fouls: 'a Poisson test against the league, because fouls are counts of events.', regains: 'a binomial test against our own record.'
  };
  const box = (title, html) => `<article class="card rv-box"><h3>${esc(title)}</h3>${html}</article>`;
  const costLine = (c, missed) => {
    const extra = Math.round(missed);
    if (extra < 1) return 'Even so, the extra goals would not have changed how the match ended.';
    const gf2 = c.gf + extra, was = c.gf > c.ga ? 'win' : c.gf === c.ga ? 'draw' : 'defeat', now = gf2 > c.ga ? 'win' : gf2 === c.ga ? 'draw' : 'defeat';
    return now !== was ? `Had those chances gone in as expected the score would have been ${gf2}-${c.ga} rather than ${c.gf}-${c.ga}: a ${now} instead of a ${was}. So it could arguably have cost us the game.` : `Had they gone in as expected the score would have been ${gf2}-${c.ga} rather than ${c.gf}-${c.ga}, which would still have been a ${was}.`;
  };
  // the earlier matches, summed for one thing
  const history = (c, fn) => { const out = { n: 0, k: 0, matches: 0 }; c.before.forEach((f) => { const r = fn(f, f.homeId === c.me ? 0 : 1, f.homeId === c.me); if (r) { out.n += r.n; out.k += r.k; out.matches++; } }); return out; };

  // ---------- the things that can go wrong ----------
  function leagueConversion(league, group) {
    let shots = 0, goals = 0, all = { shots: 0, goals: 0 };
    league.teams.forEach((t) => t.squad.forEach((p) => {
      const s = p.stats || {}; all.shots += s.shots || 0; all.goals += s.goals || 0;
      if (p.natural === group) { shots += s.shots || 0; goals += s.goals || 0; }
    }));
    if (shots < 30) return { shots: all.shots, goals: all.goals, group: null };
    return { shots, goals, group };
  }
  const POS = { GK: 'goalkeepers', CB: 'centre-backs', FB: 'full-backs', DM: 'defensive midfielders', CM: 'central midfielders', AM: 'attacking midfielders', WF: 'wingers', ST: 'strikers' };
  const distGoal = (c, e, shooterIsHome) => { const [x, y] = c.flip(shooterIsHome, e.x, e.y); return Math.hypot(L - x, y - W / 2); };

  // How good the chances were: the part of finishing that is about where the shots came from, not who took them.
  function shotDiagnosis(c, shots, shooterIsHome, who) {
    const xgEach = mean(shots.map((e) => e.xg || 0)), dist = mean(shots.map((e) => distGoal(c, e, shooterIsHome))), def = mean(shots.map((e) => e.defDist || 0)), poor = shots.filter((e) => (e.xg || 0) < 0.08).length;
    return { xgEach, dist, def, poor, poorChances: xgEach < 0.11 };
  }
  function finishingImprove(c, d, who, pv, shooterName) {
    if (d.poorChances) {
      return improve(pv, {
        why: [`Looking at the shots themselves, the average chance was worth only <b>${f2(d.xgEach)} xG</b>, ${d.poor} of the shots were worth less than 0.08, and they were taken from about <b>${f1(d.dist)} m</b> out with a defender on average ${f1(d.def)} m away. That points to where ${esc(who)} are shooting from more than how well they finish: a long, hurried shot with a defender close is a low-probability attempt for any striker in the league.`,
          `A tactic that creates better chances beats one that asks the player to be a better finisher. Better chances come from getting the ball into the penalty area with time to hit it, and from having a teammate to play the last pass to.`],
        steps: [`<b>Prepare tactics ▸ Final third:</b> drag your attacking midfielder and one central midfielder a few metres closer to the edge of the box, so there is someone for a cut-back and the shooter is not left isolated.`, `On the same board, drag your wide players a little wider and higher. Defenders have to stretch to cover them, and that opens the central lanes the shots come from.`, IB('Final third', `Be patient in the final third. Do not shoot from outside the box unless nobody is near ${esc(shooterName)}; look for the cut-back or a pass into the box first.`)],
        expect: `Fewer shots in total, but a higher average xG per shot, and more of them from inside the box. Goals follow the quality of the chances over time.`,
        check: `Go to Test phases ▸ Final third and run it before and after the change. Look at the average quality of the chances and how often the move ends in a shot, not just at the goals: goals are rare, so they are a slow way to see whether a change worked.`,
        leave: `The chances were on the low side, but one match is a small sample and the test does not say the finishing is a problem.`, watch: `the average xG per shot over the next two matches. If it stays below about 0.10, the shots are coming from poor positions and the changes above are worth making.` });
    }
    return improve(pv, {
      why: [`The chances were good ones: the average was <b>${f2(d.xgEach)} xG</b>, from about ${f1(d.dist)} m out. When good chances are missed this often, it is a question of finishing, not of how the chances were created, so changing where the team plays would be fixing the wrong thing.`,
        `With so few shots, finishing is very noisy, so the right response is a measured one: give the best finishers more of the chances, and do not rip up a tactic that is working.`],
      steps: [`<b>Squad:</b> compare the Finishing ratings of your forwards. If another striker is clearly better in front of goal, consider starting him.`, IB('Final third', `When the chance is on, make sure it falls to our best finisher: lay it off to the striker rather than shooting from a poor angle yourself.`), `If finishing is a recurring weakness, look at Recruitment for a striker with a higher Finishing rating, and use the books to see what he would cost against what he could add.`],
      expect: `A higher share of your best chances ending up with your best finishers, and goals closer to the xG totals over the next few matches.`,
      check: `Compare goals with xG over the next three or four matches. If goals keep falling short of xG by a similar amount, it is a real finishing problem and worth a personnel change.`,
      leave: `The chances were good and the sample is small, so I would not change the tactic on this alone.`, watch: `goals against xG over the next few matches. If the gap closes, it was luck.` });
  }

  function candShooting(c) {
    const shots0 = c.fx.log.other.filter((e) => e.type === 'shot' && e.team === c.me);
    const by = {}; shots0.forEach((e) => { (by[e.player] = by[e.player] || []).push(e); });
    let best = null;
    Object.keys(by).forEach((num2) => {
      const shots = by[num2]; if (shots.length < 3) return;
      const p = nameOf(c.team, +num2), goals = shots.filter((e) => e.outcome === 'goal').length, xg = shots.reduce((a, e) => a + (e.xg || 0), 0);
      const conv = leagueConversion(c.league, p.natural), p0 = conv.goals / Math.max(1, conv.shots);
      if (!(p0 > 0 && p0 < 1)) return;
      const pv = FM.binomTest(goals, shots.length, p0, 'less'), gap = xg - goals;
      if (!best || gap > best.gap) best = { shots, p, goals, xg, conv, p0, pv, gap };
    });
    if (!best) return null;
    const b = best, n = b.shots.length, onT = b.shots.filter((e) => e.outcome === 'goal' || e.outcome === 'saved').length, off = b.shots.filter((e) => e.outcome === 'off').length, grp = b.conv.group ? POS[b.conv.group] || 'players' : 'players';
    const dg = shotDiagnosis(c, b.shots, c.home);
    const html = `<p><b>${esc(b.p.name)}</b> had ${n} shots in our last game against ${esc(c.opp.name)}: ${onT} on target, ${off} off target, ${n - onT - off} blocked, and he scored ${b.goals}. The chances were worth a total of <b>${f2(b.xg)} xG</b>. Below is a shot map showing each shot ${esc(surname(b.p))} had, with the xG of each one.</p>
      ${shotMap(c, b.shots, b.p.name, c.home)}
      <p>${b.gap >= 0.8 ? 'As you can see, ' + (b.goals === 0 ? 'this many missed chances' : 'this gap between the chances and the goals') + ' could arguably have cost us points' : 'This is worth a look'}, so I looked into whether it was just chance or an underlying pattern. ${esc(costLine(c, b.gap))}</p>
      <p>To find out whether ${esc(surname(b.p))}'s finishing is really a problem, I performed a hypothesis test to see if his performance differs from the other ${esc(grp)} in the league.</p>
      <p>${esc(grp.charAt(0).toUpperCase() + grp.slice(1))} in the league have had <b>${b.conv.shots} shots</b> combined this season, scoring <b>${b.conv.goals}</b> of them, which is <b>${pc(b.p0)}</b> of shots resulting in a goal. So if we calculate ${esc(surname(b.p))}'s expected number of goals in the last match using that probability, it is ${n} × ${f2(b.p0)} = <b>${f2(n * b.p0)} goals</b>.</p>
      ${testBlock({ kind: 'binom', n, p0: b.p0, k: b.goals, what: 'shots', yes: 'to become goals', aim: `I wanted to test whether ${esc(surname(b.p))}'s finishing really was below the league rate, or whether it was just an off day in front of goal.`, h0: `${esc(surname(b.p))} converts shots at the league rate for ${esc(grp)} (p = ${f2(b.p0)}).`, h1: `${esc(surname(b.p))} converts shots at a lower rate than the league for ${esc(grp)} (p &lt; ${f2(b.p0)}).`, baseline: `${b.conv.goals} goals from ${b.conv.shots} shots = ${f2(b.p0)}`, expect: `n × p = ${n} × ${f2(b.p0)} = ${f2(n * b.p0)} goals (he scored ${b.goals}; the chances were worth ${f2(b.xg)} xG)`, model: `X ~ B(n = ${n}, p = ${f2(b.p0)}); P(X ≤ ${b.goals})`, p: b.pv,
        sig: `his finishing really is below the league average, and that is worth working on.`, notSig: `his finishing is not necessarily below the league average, and the misses may simply be bad luck. Despite the figures looking underwhelming at face value, I would not worry about him yet.` })}
      ${resultSection(c, { name: surname(b.p), missed: b.gap, expected: n * b.p0, goals: b.goals, n, p0: b.p0 })}
      ${finishingImprove(c, dg, surname(b.p), b.pv, b.p.name)}`;
    return { kind: 'finishing', p: b.pv, impact: b.gap, title: `${b.p.name} shooting`, html };
  }

  function candTeamFinishing(c) {
    const shots = c.fx.log.other.filter((e) => e.type === 'shot' && e.team === c.me);
    if (shots.length < 5) return null;
    const goals = shots.filter((e) => e.outcome === 'goal').length, xg = shots.reduce((a, e) => a + (e.xg || 0), 0), conv = leagueConversion(c.league, null), p0 = conv.goals / Math.max(1, conv.shots);
    if (!(p0 > 0 && p0 < 1)) return null;
    const pv = FM.binomTest(goals, shots.length, p0, 'less'), gap = xg - goals, dg = shotDiagnosis(c, shots, c.home);
    const html = `<p>We had <b>${shots.length} shots</b> against ${esc(c.opp.name)} and scored <b>${goals}</b>. The chances were worth <b>${f2(xg)} xG</b> between them. Here is every shot, with its xG.</p>
      ${shotMap(c, shots, 'Our', c.home)}
      <p>${esc(costLine(c, gap))} To see whether the team's finishing is really a problem, or just a bad day, I tested it against the league.</p>
      <p>Across the league, ${conv.shots} shots have been taken this season and ${conv.goals} scored: <b>${pc(p0)}</b>. At that rate, ${shots.length} shots would give ${f2(shots.length * p0)} goals.</p>
      ${testBlock({ kind: 'binom', n: shots.length, p0, k: goals, what: 'shots', yes: 'to become goals', aim: 'I wanted to test whether our finishing really was below the league rate, or whether it was just a quiet day in front of goal.', h0: `Our shots become goals at the league rate (p = ${f2(p0)}).`, h1: `Our shots become goals at a lower rate than the league (p &lt; ${f2(p0)}).`, baseline: `${conv.goals} goals from ${conv.shots} shots = ${f2(p0)}`, expect: `n × p = ${shots.length} × ${f2(p0)} = ${f2(shots.length * p0)} goals (we scored ${goals}; the chances were worth ${f2(xg)} xG)`, model: `X ~ B(n = ${shots.length}, p = ${f2(p0)}); P(X ≤ ${goals})`, p: pv, sig: 'our finishing is genuinely below the league average.', notSig: 'we cannot say our finishing is worse than the rest of the league: this could well be one of those days.' })}
      ${resultSection(c, null)}
      ${finishingImprove(c, dg, 'the team', pv, 'the player who took most of them')}`;
    return { kind: 'finishing', p: pv, impact: gap, title: 'Our finishing', html };
  }

  // Passing: completion in a part of the pitch against our own earlier matches, and why the failures failed.
  function passDiagnosis(c, rows) {
    const bad = rows.filter((r) => r[4] !== 1), good = rows.filter((r) => r[4] === 1);
    return { badDist: mean(bad.map((r) => r[7])), goodDist: mean(good.map((r) => r[7])), badPress: mean(bad.map((r) => r[9])), goodPress: mean(good.map((r) => r[9])), badLane: mean(bad.map((r) => r[8])), long: bad.filter((r) => r[7] > 25).length, n: bad.length,
      forward: bad.filter((r) => r[11] >= 0 && mine(c, r[11], r[12]).d - mine(c, r[5], r[6]).d > 0.06).length };
  }
  function passingImprove(c, d, where, pv, page) {
    const marked = d.badPress < 3.2, long = d.long >= d.n * 0.4 || d.badDist > d.goodDist + 6;
    const reasons = [];
    if (marked) reasons.push(`the receivers on the failed passes had a defender only <b>${f1(d.badPress)} m</b> away on average (against ${f1(d.goodPress)} m on the ones that worked), so they were being closed down before the ball arrived`);
    if (long) reasons.push(`the failed passes were longer: <b>${f1(d.badDist)} m</b> on average, against ${f1(d.goodDist)} m for the completed ones, and ${d.long} of the ${d.n} went more than 25 m`);
    if (d.forward >= d.n * 0.5) reasons.push(`${d.forward} of the ${d.n} failures were forward passes, so we are being punished for being ambitious`);
    if (!reasons.length) reasons.push(`the failures were not clearly longer or more closely marked than the successes (${f1(d.badDist)} m and ${f1(d.badPress)} m from the nearest defender), which suggests it is about the angles our players are offering`);
    return improve(pv, {
      why: [`Looking at the failed passes: ${reasons.join('; ')}.`, `A pass fails when the receiver is not available at the right angle, or when it asks too much of the passer. ${marked ? 'Here the receivers were too well marked, so the fix is to give the player on the ball a nearer, freer option rather than ask for the same pass more carefully.' : long ? 'Here the passes are asking too much, so the fix is shorter, safer options with the more ambitious pass kept for when it is really on.' : 'The fix is in the shape, not the instruction: players need to stand where the passer can find them.'}`],
      steps: [`<b>Prepare tactics ▸ ${page}:</b> drag one player (a midfielder or the nearest full-back) a few metres closer to where the ball usually is, so there is a short outlet, and spread the others so no two stand in the same line.`, marked ? `Move a receiver who is often marked to a position where he comes off his marker: a little deeper, or across to the side the defender cannot see.` : `Make sure the player on the ball always has a short option, and keep a more direct one in reserve.`, IB(page, marked ? `Do not force the pass to a man who is tightly marked; play to the free player, short and simple, and keep the ambitious ball for when the space is really there.` : long ? `Prefer short, safe passes ${where}; only play the long ball when a teammate is clearly free.` : `Keep the passing simple ${where}: always give the player on the ball a short option.`)],
      expect: `A higher share of completed passes ${where}, and fewer turnovers there. You may lose a little speed in the move, which is the price of keeping the ball.`,
      check: `Run the matching test on Test phases before and after, and compare completion ${where} and the number of times the move ends in a shot. In the next match, this box will test the same thing again against the new baseline.`,
      leave: `That is within the normal swing from game to game for us.`, watch: `completion ${where} in the next two matches. Two bad ones in a row would be a pattern worth acting on.` });
  }
  function candPassingZone(c, key, label, test, page) {
    const log = c.fx.log, side = c.side, inZone = test;
    const rows = log.passes.filter((r) => r[1] === side && inZone(mine(c, r[5], r[6]).d));
    if (rows.length < 12 || !c.before.length) return null;
    const ok = rows.filter((r) => r[4] === 1).length;
    const h = history(c, (f, s, home) => { let n = 0, k = 0; f.log.passes.forEach((r) => { if (r[1] === s && inZone(home ? r[5] / L : 1 - r[5] / L)) { n++; if (r[4] === 1) k++; } }); return { n, k }; });
    if (h.n < 30) return null;
    const p0 = h.k / h.n, pv = FM.binomTest(ok, rows.length, p0, 'less'), rate = ok / rows.length, d = passDiagnosis(c, rows);
    const html = `<p>${esc(label.charAt(0).toUpperCase() + label.slice(1))} we attempted <b>${rows.length} passes</b> against ${esc(c.opp.name)} and <b>${ok}</b> reached a teammate: <b>${pc(rate)}</b>. In our earlier matches this season the figure was <b>${pc(p0)}</b> (${h.k} of ${h.n}). Below, each failed pass is a dashed red line from where it started (white dot) to where it was meant to go (red dot).</p>
      ${passMap(c, rows, 'Failed passes', `${rows.length - ok} passes ${label} did not find a teammate. Attacking to the right.`, true)}
      <p>Giving the ball away ${label} wastes what we have built or hands the opposition a chance. I wanted to know whether this was a real drop in our passing or an ordinary swing from match to match. First, the plain comparison with how sure we can be of each figure:</p>
      ${intervalTable('Passes ' + label, ok, rows.length, h.k, h.n)}
      ${testBlock({ kind: 'binom', n: rows.length, p0, k: ok, what: 'passes', yes: 'to be completed', aim: `I wanted to test whether our passing ${label} really was worse than usual, or just the normal ups and downs.`, h0: `Our passing ${label} was the same as usual this match (p = ${f2(p0)}).`, h1: `Our passing ${label} was worse than usual (p &lt; ${f2(p0)}).`, baseline: `${h.k} completed of ${h.n} in our earlier matches = ${f2(p0)}`, expect: `n × p = ${rows.length} × ${f2(p0)} = ${f1(rows.length * p0)} completed (we completed ${ok})`, model: `X ~ B(n = ${rows.length}, p = ${f2(p0)}); P(X ≤ ${ok})`, p: pv, sig: `our passing ${label} really was worse than our usual level.`, notSig: 'that is within the normal swing from game to game, so it does not look like a lasting problem.' })}
      ${matterSection(c, 'pass', 'overall pass completion', '%')}
      ${passingImprove(c, d, label, pv, page)}`;
    return { kind: key, family: 'passing', p: pv, impact: (p0 - rate) * rows.length, title: key === 'passFinal' ? 'Passing in the final third' : key === 'passBuild' ? 'Passing out from the back' : 'Passing through midfield', html };
  }

  // Crossing: passes from wide in the final third into the box, which we read from the passes themselves.
  function isCross(c, r) {
    if (r[11] < 0) return false;
    const a = mine(c, r[5], r[6]), b = mine(c, r[11], r[12]);
    return a.d > 0.72 && (a.w < 0.24 || a.w > 0.76) && b.d > 0.84 && b.w > 0.3 && b.w < 0.7;
  }
  function candCrossing(c) {
    const rows = c.fx.log.passes.filter((r) => r[1] === c.side && isCross(c, r));
    if (rows.length < 5 || !c.before.length) return null;
    const ok = rows.filter((r) => r[4] === 1).length;
    const h = history(c, (f, s, home) => { let n = 0, k = 0; f.log.passes.forEach((r) => { if (r[1] !== s || r[11] < 0) return; const fake = { home }; const a = home ? { d: r[5] / L, w: r[6] / W } : { d: 1 - r[5] / L, w: 1 - r[6] / W }, b = home ? { d: r[11] / L, w: r[12] / W } : { d: 1 - r[11] / L, w: 1 - r[12] / W }; void fake; if (a.d > 0.72 && (a.w < 0.24 || a.w > 0.76) && b.d > 0.84 && b.w > 0.3 && b.w < 0.7) { n++; if (r[4] === 1) k++; } }); return { n, k }; });
    if (h.n < 8) return null;
    const p0 = h.k / h.n, pv = FM.binomTest(ok, rows.length, p0, 'less'), rate = ok / rows.length, d = passDiagnosis(c, rows);
    const html = `<p>We put <b>${rows.length} crosses</b> into the box against ${esc(c.opp.name)} (passes from wide in the final third to the middle of the area) and <b>${ok}</b> found a teammate: <b>${pc(rate)}</b>. Over our earlier matches it was <b>${pc(p0)}</b> (${h.k} of ${h.n}).</p>
      ${passMap(c, rows, 'Our crosses', 'Each line is a cross: green found a teammate, dashed red did not. Attacking to the right.', false)}
      <p>A cross that is not met is a possession given away for a very small chance, so I tested whether this was a real drop in how well our crossing works.</p>
      ${testBlock({ kind: 'binom', n: rows.length, p0, k: ok, what: 'crosses', yes: 'to find a teammate', aim: 'I wanted to test whether our crossing really was less effective than usual, or just a normal swing.', h0: `Our crossing was as successful as usual (p = ${f2(p0)}).`, h1: `Our crossing was less successful than usual (p &lt; ${f2(p0)}).`, baseline: `${h.k} found a teammate from ${h.n} earlier = ${f2(p0)}`, expect: `n × p = ${rows.length} × ${f2(p0)} = ${f1(rows.length * p0)} (${ok} did)`, model: `X ~ B(n = ${rows.length}, p = ${f2(p0)}); P(X ≤ ${ok})`, p: pv, sig: 'our crossing really was less effective than usual.', notSig: 'that is within the usual variation for our crossing.' })}
      ${improve(pv, {
        why: [`A cross only works if there is someone to meet it. The crosses came in from an average of ${f1(d.badDist)} m on the failures, with the nearest defender about ${f1(d.badPress)} m from the target. The crossers cannot be blamed if the middle of the box is empty, and the box is only full if the team has chosen to fill it.`, `There are two honest answers. Either put more bodies in the box so the ball has a target, or cross less and let the wide players cut inside or play it along the floor. Which is better depends on whether you have the aerial presence in the box to win the ball.`],
        steps: [`<b>Prepare tactics ▸ Final third:</b> drag your striker towards the penalty spot and the far-side winger or attacking midfielder to the back post, so there are two or three attackers in the box when the cross comes in.`, `Keep the full-back on the crossing side high and wide on the same board, so the winger can cut in and the full-back overlaps for the cross.`, IB('Final third', `Only cross when at least two of us are in the box: the striker at the penalty spot and a runner at the back post. If nobody is there, cut the ball back or play it along the floor instead.`)],
        expect: `A higher share of crosses finding a teammate if you add bodies to the box, or fewer crosses (and more shots from the cut-back) if you take the other route.`,
        check: `Test phases ▸ Final third before and after, and look at how often the move ends in a shot. In the next match, this box tests crossing against the new level.`,
        leave: `Crossing was within the normal range for us.`, watch: `how many of our crosses are met over the next two matches.` })}`;
    return { kind: 'crossing', p: pv, impact: (p0 - rate) * rows.length, title: 'Our crossing', html };
  }

  function candOwnThirdLosses(c) {
    const xr = c.fx.log.xr; if (!xr) return null;
    const lost = (x, side) => x.seq.filter((q) => q[0] === side && q[6] === 0 && q[8] >= 0 && q[8] < 1 / 3);
    const now = lost(xr, c.side);
    let n0 = 0, m0 = 0; c.before.forEach((f) => { if (f.log.xr) { n0 += lost(f.log.xr, f.homeId === c.me ? 0 : 1).length; m0++; } });
    if (m0 < 1 || now.length < 3) return null;
    const lam = n0 / m0, pv = poissonUpper(now.length, lam);
    const pts = now.map((q) => [q[8] * L, q[9] * W]);
    const ownFails = c.fx.log.passes.filter((r) => r[1] === c.side && r[4] !== 1 && mine(c, r[5], r[6]).d < 1 / 3), d = passDiagnosis(c, ownFails.length ? ownFails : [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]);
    const longShare = ownFails.length ? d.long / ownFails.length : 0;
    const html = `<p>We lost the ball <b>${now.length} times in our own third</b> against ${esc(c.opp.name)}. Over our earlier ${m0} match${m0 === 1 ? '' : 'es'} we averaged <b>${f1(lam)}</b> a game. Each dot is a place where we gave it away, attacking to the right.</p>
      ${dotMap(pts, '#FF5A36', 'Where we lost the ball in our own third', `${now.length} turnovers in our own third. The closer to our goal, the more dangerous.`)}
      <p>Turnovers that deep give the opposition their best chances, so I checked whether ${now.length} was just a random bad day for us or a real rise on our normal number.</p>
      ${testBlock({ kind: 'poisson', lam, k: now.length, thing: 'losing the ball in our own third', aim: 'I wanted to test whether that was a real change in how we play, and then whether it hurt us on the scoreline.', h0: `The number of own-third turnovers this match is in line with our usual rate (${f1(lam)} a match).`, h1: `The number was higher than our usual rate.`, baseline: `${n0} own-third turnovers in ${m0} earlier match${m0 === 1 ? '' : 'es'} = ${f1(lam)} a match`, expect: `${f1(lam)} turnovers (we lost it ${now.length} times)`, model: `X ~ Poisson(λ = ${f1(lam)}); P(X ≥ ${now.length})`, p: pv, sig: 'we really did lose it more often than usual.', notSig: 'that is within the normal variation for us, so it is not clear that anything has changed.' })}
      ${linkSection(c, 'own')}
      ${improve(pv, {
        why: [ownFails.length ? `Of the passes we lost in our own third, <b>${ownFails.length}</b> were failed passes, averaging ${f1(d.badDist)} m, with the receiver ${f1(d.badPress)} m from the nearest defender${longShare >= 0.4 ? `. ${d.long} of them went more than 25 m: we are asking the back line and the keeper to find a distant teammate under pressure.` : '. Most were short passes under pressure: the ball was played to a teammate who was already being closed down.'}` : `Most of the lost balls came from challenges and dribbles rather than failed passes, so the players on the ball are being caught holding it.`,
          `Losing the ball near your own goal is the most expensive mistake there is, because the opposition are already close to goal. The aim is to make the safe pass the easy pass, and to keep the dangerous ball for when the opposition cannot reach it.`],
        steps: [`<b>Prepare tactics ▸ Build-up:</b> make sure the player on the ball has a short outlet on each side: drag a defensive midfielder close to the centre-backs and the full-backs a little deeper and wider than the defenders.`, longShare >= 0.4 ? IB('Build-up', `Goalkeeper and centre-backs: play it short to the nearest free player, never a long pass under pressure.`) : IB('Build-up', `Defenders: take the simple pass when pressed; if there is no safe pass, clear it out of play rather than dribble.`), `If the opposition press you hard, you can play past them instead. ${IB('Build-up', `If they press us high, the goalkeeper plays it long over the top to the striker rather than passing short.`)}`],
        expect: `Fewer turnovers in your own third, and fewer shots conceded from them. You may play a little slower out of defence.`,
        check: `Test phases ▸ Build-up: compare the share of builds that reach the halfway line, and the balls lost in the own third, before and after the change.`,
        leave: `The number of losses was within our normal range.`, watch: `balls lost in our own third in the next two matches.` })}`;
    return { kind: 'turnovers', p: pv, impact: now.length - lam, title: 'Losing the ball in our own third', html };
  }

  function candShotsConceded(c) {
    const theirs = c.fx.log.other.filter((e) => e.type === 'shot' && e.team !== c.me);
    const fixtures = c.league.fixtures.filter((f) => f.played && f.stats);
    if (!fixtures.length || theirs.length < 3) return null;
    let total = 0, count = 0; fixtures.forEach((f) => { [f.homeId, f.awayId].forEach((id) => { if (f.stats[id]) { total += f.stats[id].shots; count++; } }); });
    const lam = total / Math.max(1, count), pv = poissonUpper(theirs.length, lam), xg = theirs.reduce((a, e) => a + (e.xg || 0), 0);
    const dg = shotDiagnosis(c, theirs, !c.home), inside = theirs.filter((e) => distGoal(c, e, !c.home) < 16).length, heads = theirs.filter((e) => e.setPiece === 'header').length;
    const xrNow = c.fx.log.xr, shape = xrNow ? xrNow.shape.filter((q) => q[1] === c.side) : [];
    const comp = shape.length ? mean(shape.map((q) => q[5])) : 0, line = shape.length ? mean(shape.map((q) => q[2])) : 0;
    const html = `<p>${esc(c.opp.name)} had <b>${theirs.length} shots</b> against us, worth <b>${f2(xg)} xG</b> in total. The average side in the league has about <b>${f1(lam)}</b> shots in a match. Here is each one, drawn attacking to the right (read it as their chances).</p>
      ${shotMap(c, theirs, 'Their', !c.home)}
      <p>I wanted to know whether we are giving up too many chances or whether they simply had a good afternoon.</p>
      ${testBlock({ kind: 'poisson', lam, k: theirs.length, thing: 'shots against us', aim: 'I wanted to test whether we really gave away more chances than a normal match, or whether it was just how this game went.', h0: `The shots we conceded are in line with a typical match in the league (${f1(lam)}).`, h1: `We conceded more shots than a typical match.`, baseline: `${num(total)} shots across ${count} team-matches = ${f1(lam)} a match`, expect: `${f1(lam)} shots against (we faced ${theirs.length})`, model: `X ~ Poisson(λ = ${f1(lam)}); P(X ≥ ${theirs.length})`, p: pv, sig: 'we really are conceding more than normal.', notSig: 'that is within the normal range, so I would not rebuild the defence on the strength of this one game.' })}
      ${sourceSection(c)}${linkSection(c, 'all')}
      ${improve(pv, {
        why: [`${inside} of their ${theirs.length} shots came from inside the box (within 16 m of goal), their nearest marker was on average <b>${f1(dg.def)} m</b> away, and the average chance was worth ${f2(dg.xgEach)} xG${heads ? `; ${heads} were headers` : ''}.${shape.length ? ` Our own shape was ${f1(comp)} m on average from the centre of the team to the players, with the back line at ${f1(line * 100)}% of the pitch.` : ''}`,
          dg.def >= 3.5 ? `Their shooters had time and space. That points to loose marking in and around the box: the defenders are holding zones and letting the man arrive unmarked, or the midfield line is not protecting the space in front of the defence.` : `Their shooters were being closed down, so the chances came from how easily they got into those positions: the pressure on the ball further up the pitch, and the gaps between our lines, matter more than the marking.`],
        steps: [`<b>Prepare tactics ▸ Defending your third:</b> drag the midfield line closer to the back four, so the gap between the lines is smaller (a tighter, more compact block gives the opposition fewer places to receive the ball between them).`, dg.def >= 3.5 ? IB('Defending your third', `Defenders and the defensive midfielder: stay close to the man nearest you inside the box, so nobody is left free on the edge of the area.`) : `<b>Prepare tactics ▸ the Defending board:</b> choose the <i>High press</i> block (instead of Low block or Mid block) so the ball is closed down earlier, before it gets to the box.`, `If they scored or had chances from set pieces, check the <b>Set pieces</b> tab for who marks whom, and make sure your tallest defenders are in the box.`],
        expect: `Fewer shots from inside the box, a lower xG conceded per match, and the nearest defender closer to the shooter when shots are taken.`,
        check: `Test phases ▸ Defending your third, before and after: look at how often the attack is stopped before a shot, and in the next match's review the shots conceded and the nearest defender's distance.`,
        leave: `The number of shots we conceded was within the normal range.`, watch: `the shots conceded and the xG against over the next two matches.` })}`;
    return { kind: 'defending', p: pv, impact: theirs.length - lam, title: 'Chances we gave away', html };
  }

  function candDuels(c) {
    const rows = c.fx.log.tackles.filter((r) => r[1] === c.side);
    if (rows.length < 8 || !c.before.length) return null;
    const won = rows.filter((r) => r[4] === 1).length;
    const h = history(c, (f, s) => { let n = 0, k = 0; f.log.tackles.forEach((r) => { if (r[1] === s) { n++; if (r[4] === 1) k++; } }); return { n, k }; });
    if (h.n < 20) return null;
    const p0 = h.k / h.n, pv = FM.binomTest(won, rows.length, p0, 'less');
    const pts = rows.map((r) => { const [x, y] = c.flip(c.home, r[5], r[6]); return [x, y, r[4] === 1 ? '#7FD49A' : '#FF5A36']; });
    const lostBy = {}; rows.filter((r) => r[4] !== 1).forEach((r) => { lostBy[r[2]] = (lostBy[r[2]] || 0) + 1; });
    const worst = Object.keys(lostBy).sort((a, b) => lostBy[b] - lostBy[a])[0], wp = worst ? nameOf(c.team, +worst) : null;
    const press = c.team.tactics ? c.team.tactics.pressing : 0.5, agg = c.team.tactics ? c.team.tactics.tackleAggression : 0.5;
    const html = `<p>We went into <b>${rows.length} challenges</b> against ${esc(c.opp.name)} and won <b>${won}</b>: <b>${pc(won / rows.length)}</b>. Over our earlier matches we have won <b>${pc(p0)}</b> of them. Each dot is a challenge: <span style="color:#7FD49A">green</span> won, <span style="color:#FF5A36">red</span> lost.</p>
      ${dotMap(pts, '#FF5A36', 'Our challenges', 'Where our challenges were made, attacking to the right.')}
      <p>I tested whether that was a real fall in how well we win the ball, or an ordinary variation.</p>
      ${testBlock({ kind: 'binom', n: rows.length, p0, k: won, what: 'challenges', yes: 'to be won', aim: 'I wanted to test whether we really won fewer challenges than usual, or whether it was just a normal swing.', h0: `Our success in challenges was the same as usual (p = ${f2(p0)}).`, h1: `Our success in challenges was lower than usual (p &lt; ${f2(p0)}).`, baseline: `${h.k} won of ${h.n} earlier = ${f2(p0)}`, expect: `n × p = ${rows.length} × ${f2(p0)} = ${f1(rows.length * p0)} won (we won ${won})`, model: `X ~ B(n = ${rows.length}, p = ${f2(p0)}); P(X ≤ ${won})`, p: pv, sig: 'we really did win fewer challenges than usual.', notSig: 'that is within the normal variation for us, so it is not a lasting problem.' })}
      ${zoneSection(c, rows)}
      ${improve(pv, {
        why: [wp ? `${esc(wp.name)} lost <b>${lostBy[worst]}</b> of our challenges, more than anyone${wp.ratings && wp.ratings.tackling != null ? `. His Tackling rating is ${FM.shown ? FM.shown(wp.ratings.tackling) : wp.ratings.tackling}, so it is worth asking whether he is the right man to be going in` : ''}.` : `The lost challenges were spread across the team.`,
          `The team's pressing is set at ${Math.round(press * 100)}% and its tackling at ${Math.round(agg * 100)}%. Closing down a long way from goal means more one-against-one challenges, and a player who is not a good tackler will lose most of them. Losing a challenge also leaves a gap behind him.`],
        steps: [IB('Defending your third', `${wp ? esc(wp.name) : 'The defender who loses most'}: do not dive in. Hold your position and wait for the ball to be played; only tackle when a teammate is covering.`), `<b>Prepare tactics ▸ the Defending board:</b> if the team presses very high, choose the <i>Mid block</i> or <i>Low block</i> instead of <i>High press</i>, so challenges happen in numbers and closer to our own shape.`, `Put your best tacklers in the areas where the challenges happen: check the Tackling ratings in <b>Squad</b> and change the line-up or formation if a weak tackler keeps being exposed.`],
        expect: `A higher share of challenges won, fewer fouls and cards, and fewer gaps left behind after lost challenges.`,
        check: `Test phases ▸ Defending your third and Pressing their build-up, before and after; in the next review, compare the share of challenges won against ${pc(p0)}.`,
        leave: `Our success in challenges was within the normal range.`, watch: `the share of challenges won over the next two matches.` })}`;
    return { kind: 'duels', p: pv, impact: (p0 - won / rows.length) * rows.length, title: 'Winning the ball back in challenges', html };
  }

  function candDribbling(c) {
    const rows = c.fx.log.dribbles.filter((r) => r[1] === c.side);
    if (rows.length < 8 || !c.before.length) return null;
    const won = rows.filter((r) => r[3] === 1).length;
    const h = history(c, (f, s) => { let n = 0, k = 0; f.log.dribbles.forEach((r) => { if (r[1] === s) { n++; if (r[3] === 1) k++; } }); return { n, k }; });
    if (h.n < 20) return null;
    const p0 = h.k / h.n, pv = FM.binomTest(won, rows.length, p0, 'less');
    const pts = rows.map((r) => { const [x, y] = c.flip(c.home, r[4], r[5]); return [x, y, r[3] === 1 ? '#7FD49A' : '#FF5A36']; });
    const lostBy = {}; rows.filter((r) => r[3] !== 1).forEach((r) => { lostBy[r[2]] = (lostBy[r[2]] || 0) + 1; });
    const worst = Object.keys(lostBy).sort((a, b) => lostBy[b] - lostBy[a])[0], wp = worst ? nameOf(c.team, +worst) : null;
    const defLost = mean(rows.filter((r) => r[3] !== 1).map((r) => r[6]));
    const html = `<p>We tried <b>${rows.length} dribbles</b> against ${esc(c.opp.name)} and <b>${won}</b> came off: <b>${pc(won / rows.length)}</b>. In our earlier matches, <b>${pc(p0)}</b> did. Each dot is a dribble: <span style="color:#7FD49A">green</span> came off, <span style="color:#FF5A36">red</span> lost the ball.</p>
      ${dotMap(pts, '#FF5A36', 'Our dribbles', 'Where our dribbles were attempted, attacking to the right.')}
      <p>I tested whether that was a real fall in how well we beat players, or an ordinary swing.</p>
      ${testBlock({ kind: 'binom', n: rows.length, p0, k: won, what: 'dribbles', yes: 'to come off', aim: 'I wanted to test whether our dribbling really was less successful than usual, or just a normal swing.', h0: `Our dribbling success was the same as usual (p = ${f2(p0)}).`, h1: `Our dribbling success was lower than usual (p &lt; ${f2(p0)}).`, baseline: `${h.k} came off from ${h.n} earlier = ${f2(p0)}`, expect: `n × p = ${rows.length} × ${f2(p0)} = ${f1(rows.length * p0)} (${won} did)`, model: `X ~ B(n = ${rows.length}, p = ${f2(p0)}); P(X ≤ ${won})`, p: pv, sig: 'our dribbling really was less successful than usual.', notSig: 'that is within the normal variation.' })}
      ${distanceSection(c, rows)}
      ${improve(pv, {
        why: [wp ? `${esc(wp.name)} lost the ball ${lostBy[worst]} time${lostBy[worst] === 1 ? '' : 's'} trying to take a man on, and on the dribbles that were lost the defender was on average only <b>${f1(defLost)} m</b> away. A dribble against a defender that close is a coin flip at best, and losing it hands over the ball in a dangerous place.` : `The lost dribbles came from several players.`,
          `Dribbling is worth it when a player is isolated one-on-one in space, and not worth it when a defender is already on top of him. The instructions decide how often a player tries.`],
        steps: [IB('Final third', `${wp ? esc(wp.name) : 'The player who loses it most'}: only dribble when there is clear space in front of you. If a defender is within a couple of metres, pass instead.`), `<b>Prepare tactics ▸ the phase page:</b> give the dribbler a passing option by dragging a teammate closer, so passing is the easier decision than dribbling.`, `Keep the dribbling for the one or two players who win these duels, usually the wide players with high Dribbling ratings: ${IB('Final third', `Wingers: take your man on when you are one-against-one in space.`)}`],
        expect: `Fewer dribbles in total, a higher share that come off, and fewer turnovers in crowded areas.`,
        check: `Next match's review will test the success rate against ${pc(p0)} again; in Test phases ▸ Final third, look at how often the move reaches a shot.`,
        leave: `Our dribbling was within the normal range.`, watch: `dribbles won over the next two matches.` })}`;
    return { kind: 'dribbling', p: pv, impact: (p0 - won / rows.length) * rows.length, title: 'Dribbling', html };
  }

  function candFouls(c) {
    const me = c.me, st = c.fx.stats && c.fx.stats[me], fixtures = c.league.fixtures.filter((f) => f.played && f.stats);
    if (!st || fixtures.length < 2) return null;
    let total = 0, count = 0; fixtures.forEach((f) => { [f.homeId, f.awayId].forEach((id) => { if (f.stats[id]) { total += f.stats[id].fouls; count++; } }); });
    const lam = total / Math.max(1, count), fouls = st.fouls, pv = poissonUpper(fouls, lam);
    if (fouls < 4) return null;
    const ev = c.fx.log.other.filter((e) => e.type === 'foul' && e.team === me), by = {}; ev.forEach((e) => { by[e.player] = (by[e.player] || 0) + 1; });
    const worst = Object.keys(by).sort((a, b) => by[b] - by[a])[0], wp = worst ? nameOf(c.team, +worst) : null, cards = ev.filter((e) => e.card).length;
    const pts = ev.filter((e) => e.x != null).map((e) => { const [x, y] = c.flip(c.home, e.x, e.y); return [x, y, e.card ? '#FFE27A' : '#FF5A36']; });
    const html = `<p>We committed <b>${fouls} fouls</b> against ${esc(c.opp.name)}${cards ? `, and picked up ${cards} card${cards === 1 ? '' : 's'}` : ''}. The average side in the league commits about <b>${f1(lam)}</b> in a match.${pts.length ? ' Each dot is a foul (yellow where it earned a card).' : ''}</p>
      ${pts.length ? dotMap(pts, '#FF5A36', 'Our fouls', 'Where we committed fouls, attacking to the right.') : ''}
      <p>Fouls give away free kicks and, near our box, dangerous ones, so I tested whether this was more than the normal amount.</p>
      ${testBlock({ kind: 'poisson', lam, k: fouls, thing: 'fouls', aim: 'I wanted to test whether we really committed more fouls than a normal match, or whether it was just how this game went.', h0: `The number of fouls we committed is in line with a typical match (${f1(lam)}).`, h1: `We committed more fouls than a typical match.`, baseline: `${num(total)} fouls across ${count} team-matches = ${f1(lam)} a match`, expect: `${f1(lam)} fouls (we committed ${fouls})`, model: `X ~ Poisson(λ = ${f1(lam)}); P(X ≥ ${fouls})`, p: pv, sig: 'we really are fouling more than normal.', notSig: 'that is within the normal range.' })}
      ${improve(pv, {
        why: [wp ? `${esc(wp.name)} gave away <b>${by[worst]}</b> of them${cards ? `, and cards are a cost twice over: they limit what a player can do for the rest of the match and can mean a suspension` : ''}. Fouls come from players committing to challenges they are not sure of, usually late or from behind.` : `The fouls were spread across the team.`,
          `The team's tackling is set at ${c.team.tactics ? Math.round(c.team.tactics.tackleAggression * 100) : 50}%: the higher it is, the more challenges, and the more fouls and cards that come with them.`],
        steps: [IB('Defending your third', `Stay on your feet and jockey the attacker; do not go in late or from behind. Let him go if a teammate is covering.`), `<b>Prepare tactics ▸ the Defending board:</b> a deeper, more compact block (<i>Low block</i> or <i>Mid block</i>) puts fewer players in positions where the foul is the only answer.`, `Check the fouls that were near our box. If they were conceded in dangerous places, the same instruction applies, and the <b>Set pieces</b> tab is where you set up how the team defends the free kicks that result.`],
        expect: `Fewer fouls and cards. You may win fewer challenges outright, so watch the shots conceded in the same match.`,
        check: `The next review will test fouls against the league again. Also look at free kicks conceded near your box.`,
        leave: `The number of fouls we committed was within the normal range.`, watch: `fouls and cards over the next two matches.` })}`;
    return { kind: 'fouls', p: pv, impact: fouls - lam, title: 'Fouls and cards', html };
  }

  function candRegains(c) {
    const xr = c.fx.log.xr; if (!xr) return null;
    const rec = xr.recov.filter((q) => q[0] === c.side && q[4] >= 0), quick = rec.filter((q) => q[4] <= 6).length;
    if (rec.length < 15) return null;
    const h = history(c, (f, s) => { if (!f.log.xr) return null; const r = f.log.xr.recov.filter((q) => q[0] === s && q[4] >= 0); return { n: r.length, k: r.filter((q) => q[4] <= 6).length }; });
    if (h.n < 30) return null;
    const p0 = h.k / h.n, pv = FM.binomTest(quick, rec.length, p0, 'less');
    const pts = rec.map((q) => [q[2] * L, q[3] * W, q[4] <= 6 ? '#7FD49A' : '#FF5A36']);
    const high = rec.filter((q) => q[2] > 0.6).length, press = c.team.tactics ? c.team.tactics.counterPress : 0.5;
    const html = `<p>We won the ball back <b>${rec.length} times</b> after losing it against ${esc(c.opp.name)}, but only <b>${quick}</b> were within six seconds of losing it: <b>${pc(quick / rec.length)}</b>. In our earlier matches the figure was <b>${pc(p0)}</b>. Each dot is where we won it back: <span style="color:#7FD49A">green</span> within six seconds, <span style="color:#FF5A36">red</span> later.</p>
      ${dotMap(pts, '#FF5A36', 'Where we won the ball back', `${high} of the ${rec.length} recoveries were in the opposition half. Attacking to the right.`)}
      <p>Winning it back quickly is the cheapest way to create a chance, because the opposition are not yet organised. I tested whether we are slower to win it back than usual.</p>
      ${testBlock({ kind: 'binom', n: rec.length, p0, k: quick, what: 'chances to win the ball back', yes: 'to be won back within six seconds', aim: 'I wanted to test whether we really were slower to win the ball back than usual, or whether it was a normal swing.', h0: `We win the ball back within six seconds as often as usual (p = ${f2(p0)}).`, h1: `We win it back quickly less often than usual (p &lt; ${f2(p0)}).`, baseline: `${h.k} quick regains from ${h.n} earlier = ${f2(p0)}`, expect: `n × p = ${rec.length} × ${f2(p0)} = ${f1(rec.length * p0)} (${quick} were quick)`, model: `X ~ B(n = ${rec.length}, p = ${f2(p0)}); P(X ≤ ${quick})`, p: pv, sig: 'we really are slower to win it back than usual.', notSig: 'that is within the normal variation.' })}
      ${improve(pv, {
        why: [`Our counter-press setting (what the team does in the seconds after losing the ball) is at ${Math.round(press * 100)}%. At a low setting the team drops back into shape first, which is safer but means the opposition keep the ball longer; at a high setting several players hunt it back at once.`, `Only ${high} of our ${rec.length} recoveries were high up the pitch, so the wins were mostly deep, after the opposition had already progressed.`],
        steps: [`<b>Prepare tactics ▸ Defensive transition:</b> in the zone after losing the ball, choose <i>Counterpress</i> (rather than <i>Delay and contain</i> or <i>Regroup</i>) so the nearest players press the new carrier immediately.`, IB('Defensive transition', `As soon as we lose it, the nearest three players close the ball down at once and the rest squeeze up behind them. If the press is beaten, drop back into shape.`), `<b>Prepare tactics ▸ the attacking phases:</b> keep a midfielder and a full-back close behind the ball when we attack, so they are in range to press the moment we lose it (a team that is stretched cannot counter-press).`],
        expect: `A higher share of quick regains, more recoveries high up the pitch, and more chances created from them. The cost is that if the press is beaten, there is space behind it.`,
        check: `Test phases ▸ Defensive transition before and after, and the next review will compare the share of regains inside six seconds.`,
        leave: `Our regain speed was within the normal range.`, watch: `the share of regains inside six seconds over the next two matches.` })}`;
    return { kind: 'regains', p: pv, impact: (p0 - quick / rec.length) * rec.length, title: 'Winning the ball back quickly', html };
  }

  // ---------- the page ----------
  FM._testBlock = testBlock;
  let reviewTier = 'alevel', reviewAreas = 12;   // the level being studied (gcse, alevel or above), and how many areas this review looked at
  FM._setTier = (x) => { reviewTier = x; };
  FM.matchReview = function (league) {
    const c = context(league); if (!c) return null;
    const mid = (d) => d >= 1 / 3 && d < 2 / 3, back = (d) => d < 1 / 3, final = (d) => d >= 2 / 3;
    const cands = [candShooting(c), candTeamFinishing(c), candPassingZone(c, 'passFinal', 'in the final third', final, 'Final third'), candPassingZone(c, 'passMid', 'through midfield', mid, 'Play through midfield'), candPassingZone(c, 'passBuild', 'in our own third', back, 'Build-up'),
      candCrossing(c), candOwnThirdLosses(c), candShotsConceded(c), candDuels(c), candDribbling(c), candFouls(c), candRegains(c)].filter(Boolean);
    // the two where things went most wrong: the smallest chance of being just a bad day, at most one from each family (finishing, passing...)
    cands.sort((a, b) => (a.p - b.p) || (b.impact - a.impact));
    const picked = [], fams = new Set();
    cands.forEach((x) => { const fam = x.family || x.kind; if (picked.length < 1 && !fams.has(fam)) { picked.push(x); fams.add(fam); } });
    reviewTier = league.tier || 'gcse'; reviewAreas = cands.length;
    return { c, picked, all: cands };
  };
  // The review is a LastMind analysis, so opening it costs Locks (a fixed amount for each match, charged once; see /football/review-charge). Guests with no
  // account cannot be charged and see it free; if the server cannot be reached the review still opens.
  FM.renderMatchReview = function (host, league) {
    const r = FM.matchReview(league);
    if (!r) { host.innerHTML = '<div class="card rv-intro"><h2>Last match</h2><p class="desc">Hi boss. Once we have played a match I will go through it with you here: what went wrong, whether it was down to bad luck, and what to look at.</p></div>'; return; }
    const real = league.fixtures.find((f) => f.id === r.c.fx.id);
    const draw = () => paint(host, r);
    if (!real || real.reviewPaid || !FM.apiCall) { draw(); return; }
    host.innerHTML = '<div class="card rv-intro"><h2>Going through the match…</h2><p class="desc">Working through the match with you. This analysis costs a few Locks.</p></div>';
    FM.apiCall('POST', '/football/review-charge', {}).then((res) => {
      if (res && res.status === 402) { host.innerHTML = '<div class="card rv-intro"><h2>Out of Locks</h2><p class="desc">The analysis of the last match costs a few Locks, and you have used your allowance for now. Your game and everything saved in it carry on as normal.</p></div>'; return; }
      if (res && res.ok) { real.reviewPaid = true; if (FM.requestSave) FM.requestSave(); }
      draw();
    }).catch(() => draw());
  };
  function paint(host, r) {
    const c = r.c, gd = c.gf - c.ga, hour = new Date().getHours(), tod = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
    const A = ['Gaffer', 'Boss', 'Manager'][FM.hashString([c.league.seed, c.league.season || 1, c.league.day || 0, 'rv'].join(':')) % 3];
    const verdictWord = gd >= 3 ? 'a brilliant win, and congratulations' : gd >= 1 ? 'a good win, and well done' : gd === 0 ? 'a draw, so a point on the board' : gd <= -3 ? 'a heavy defeat, and I know that is hard to read' : 'a defeat, but there is plenty in it to learn from';
    const lvl = { gcse: 'GCSE', alevel: 'A-level', above: 'beyond A-level' }[reviewTier] || 'GCSE';
    host.innerHTML = `<div class="card rv-intro"><div class="eyebrow">The last match: round ${c.fx.round + 1}</div><h2>${esc(c.team.name)} ${c.gf}-${c.ga} ${esc(c.opp.name)}</h2>
      <p class="desc">${tod}, ${A}. I have been going through our latest game against ${esc(c.opp.name)}, ${verdictWord}. One thing stood out that was worth testing properly, and I show exactly how I tested it, one step at a time, as if I were explaining it across the table, at ${lvl} level. Any word that looks like <button type="button" class="rv-term" data-lesson="average">this</button> is something I will explain from the beginning if you press it, and every explanation has links of its own back to the basics.</p></div>
      ${r.picked.length ? r.picked.map((x) => box(x.title, x.html)).join('') : '<div class="card"><p class="desc">There was not enough in that match to build a proper test from. Play another and I will have more for you.</p></div>'}
      <div class="card rv-outro"><p class="desc">If you want to explore any other points from the last game, just ask, and I can provide the data and assistance. Any techniques you need help with, I can explain too. I looked at ${r.all.length} different areas of the game to choose this one, including finishing, passing, crossing, tackling, dribbling, fouls and how quickly we win the ball back, so if you want any of the others, say which.</p><div class="row"><button type="button" class="primary" id="rvAsk">Ask the LastMind AI Agent</button></div></div>`;
    const b = host.querySelector('#rvAsk'); if (b) b.addEventListener('click', () => { if (FM.agentOpen) FM.agentOpen(); });
  }
})();
