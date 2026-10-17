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

  // ---------- the data from the last match ----------
  function context(league) {
    const me = league.userId, played = league.fixtures.filter((f) => f.played && f.log && (f.homeId === me || f.awayId === me)).sort((a, b) => a.round - b.round);
    if (!played.length) return null;
    const fx = played[played.length - 1], before = played.slice(0, -1), home = fx.homeId === me;
    const opp = FM.teamById(league, home ? fx.awayId : fx.homeId), team = FM.teamById(league, me), side = home ? 0 : 1;
    const gf = home ? fx.hg : fx.ag, ga = home ? fx.ag : fx.hg;
    // positions are kept as if the home side attacked to the right; this puts any team's on the page attacking to the right
    const flip = (teamIsHome, x, y) => (teamIsHome ? [x, y] : [L - x, W - y]);
    return { league, fx, before, home, opp, team, side, gf, ga, me, flip };
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

  // ---------- the test, set out the way it would be written down ----------
  function testBlock(t) {
    return `<div class="rv-test"><h4>The test</h4><table class="books-table calc"><tbody>
      <tr><td class="l">Null hypothesis</td><td class="l">${t.h0}</td></tr>
      <tr><td class="l">Alternative hypothesis</td><td class="l">${t.h1}</td></tr>
      <tr><td class="l">Baseline</td><td class="l">${t.baseline}</td></tr>
      <tr><td class="l">What we would expect</td><td class="l">${t.expect}</td></tr>
      <tr><td class="l">Model</td><td class="l">${t.model}</td></tr>
      <tr><td class="l">Probability of a result this bad or worse</td><td class="l"><b>${pc(t.p)}</b></td></tr>
      <tr><td class="l">Significance level</td><td class="l">5%</td></tr>
      <tr class="tot"><td class="l">Conclusion</td><td class="l">${t.p < SIG ? `<b>${pc(t.p)}</b> is below 5%, so the result is statistically significant: ${t.sig}` : `<b>${pc(t.p)}</b> is above 5%, so the result is not statistically significant: ${t.notSig}`}</td></tr></tbody></table></div>`;
  }
  // The improvement: written out for the manager to carry into the tactics themselves. When the test says something is wrong (or close to it) it is a
  // full explanation: why, where to change it, what to expect, and how to check it worked. Otherwise it says to leave it alone and what to watch.
  function improve(p, o) {
    if (p < ACT) {
      return `<div class="rv-improve"><h4>What I would change</h4>${o.why.map((x) => `<p>${x}</p>`).join('')}
        <p><b>Where to make the change</b></p><ol>${o.steps.map((s) => `<li>${s}</li>`).join('')}</ol>
        <p><b>What you should see:</b> ${o.expect}</p><p><b>How to check it worked:</b> ${o.check}</p>
        <p class="note">These are suggestions to think through, not a single right answer. Make the change you believe in, in your own words and positions, and the tests will tell you whether you were right.</p></div>`;
    }
    return `<div class="rv-improve rv-calm"><h4>Does anything need changing?</h4><p>${o.leave}</p><p><b>What to keep an eye on:</b> ${o.watch}</p></div>`;
  }
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
        steps: [`<b>Prepare tactics ▸ Final third:</b> drag your attacking midfielder and one central midfielder a few metres closer to the edge of the box, so there is someone for a cut-back and the shooter is not left isolated.`, `Drag your wide players a little wider and higher. Defenders have to stretch to cover them, and that opens the central lanes the shots come from.`, `<b>Squad ▸ ${esc(shooterName)} ▸ Shooting:</b> try <i>Shoot less</i>, so he is less likely to try the speculative effort and more likely to wait for a better position or pass.`, `Optionally tell the team in the box at the bottom of the Final third page what you want, in your own words, for example that they should look for the cut-back before shooting from outside the box.`],
        expect: `Fewer shots in total, but a higher average xG per shot, and more of them from inside the box. Goals follow the quality of the chances over time.`,
        check: `Go to Test phases ▸ Final third and run it before and after the change. Look at the average quality of the chances and how often the move ends in a shot, not just at the goals: goals are rare, so they are a slow way to see whether a change worked.`,
        leave: `The chances were on the low side, but one match is a small sample and the test does not say the finishing is a problem.`, watch: `the average xG per shot over the next two matches. If it stays below about 0.10, the shots are coming from poor positions and the changes above are worth making.` });
    }
    return improve(pv, {
      why: [`The chances were good ones: the average was <b>${f2(d.xgEach)} xG</b>, from about ${f1(d.dist)} m out. When good chances are missed this often, it is a question of finishing, not of how the chances were created, so changing where the team plays would be fixing the wrong thing.`,
        `With so few shots, finishing is very noisy, so the right response is a measured one: give the best finishers more of the chances, and do not rip up a tactic that is working.`],
      steps: [`<b>Squad:</b> compare the Finishing ratings of your forwards. If another striker is clearly better in front of goal, consider starting him.`, `<b>Squad ▸ ${esc(shooterName)}:</b> if he is not the best finisher in the side, try <i>Shoot less</i> for him, so the better finisher is the one who takes the chance.`, `If finishing is a recurring weakness, look at Recruitment for a striker with a higher Finishing rating, and use the books to see what he would cost against what he could add.`],
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
      ${testBlock({ h0: `${esc(surname(b.p))} converts shots at the league rate for ${esc(grp)} (p = ${f2(b.p0)}).`, h1: `${esc(surname(b.p))} converts shots at a lower rate than the league for ${esc(grp)} (p &lt; ${f2(b.p0)}).`, baseline: `${b.conv.goals} goals from ${b.conv.shots} shots = ${f2(b.p0)}`, expect: `n × p = ${n} × ${f2(b.p0)} = ${f2(n * b.p0)} goals (he scored ${b.goals}; the chances were worth ${f2(b.xg)} xG)`, model: `X ~ B(n = ${n}, p = ${f2(b.p0)}); P(X ≤ ${b.goals})`, p: b.pv,
        sig: `his finishing really is below the league average, and that is worth working on.`, notSig: `his finishing is not necessarily below the league average, and the misses may simply be bad luck. Despite the figures looking underwhelming at face value, I would not worry about him yet.` })}
      <p class="note">In hindsight, comparing his goals with his xG (${b.goals} against ${f2(b.xg)}) uses the quality of each chance, which this simple test does not. That is a more sophisticated test you could ask me about.</p>
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
      ${testBlock({ h0: `Our shots become goals at the league rate (p = ${f2(p0)}).`, h1: `Our shots become goals at a lower rate than the league (p &lt; ${f2(p0)}).`, baseline: `${conv.goals} goals from ${conv.shots} shots = ${f2(p0)}`, expect: `n × p = ${shots.length} × ${f2(p0)} = ${f2(shots.length * p0)} goals (we scored ${goals}; the chances were worth ${f2(xg)} xG)`, model: `X ~ B(n = ${shots.length}, p = ${f2(p0)}); P(X ≤ ${goals})`, p: pv, sig: 'our finishing is genuinely below the league average.', notSig: 'we cannot say our finishing is worse than the rest of the league: this could well be one of those days.' })}
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
      steps: [`<b>Prepare tactics ▸ ${page}:</b> drag one player (a midfielder or the nearest full-back) a few metres closer to where the ball usually is, so there is a short outlet, and spread the others so no two stand in the same line.`, marked ? `Move a receiver who is often marked to a position where he comes off his marker: a little deeper, or across to the side the defender cannot see.` : `Make the passer's job easier: a more direct option kept in reserve, with a short option always on.`, `<b>Squad ▸ the players making the failed passes ▸ Passing:</b> try <i>Shorter, simpler passes</i>${long ? '' : ' or, if they are good passers, leave it'}, and <i>Risk: Play it safe</i> for the ones who give it away most.`, `If you want the team to stay ambitious, tell them what to look for in the box at the bottom of the page.`],
      expect: `A higher share of completed passes in ${where}, and fewer turnovers there. You may lose a little speed in the move, which is the price of keeping the ball.`,
      check: `Run the matching test on Test phases before and after, and compare completion in ${where} and the number of times the move ends in a shot. In the next match, this box will test the same thing again against the new baseline.`,
      leave: `That is within the normal swing from game to game for us.`, watch: `completion in ${where} in the next two matches. Two bad ones in a row would be a pattern worth acting on.` });
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
      <p>Giving the ball away ${label} wastes what we have built or hands the opposition a chance. I wanted to know whether this was a real drop in our passing or an ordinary swing from match to match, so I tested it against our own record.</p>
      ${testBlock({ h0: `Our passing ${label} was the same as usual this match (p = ${f2(p0)}).`, h1: `Our passing ${label} was worse than usual (p &lt; ${f2(p0)}).`, baseline: `${h.k} completed of ${h.n} in our earlier matches = ${f2(p0)}`, expect: `n × p = ${rows.length} × ${f2(p0)} = ${f1(rows.length * p0)} completed (we completed ${ok})`, model: `X ~ B(n = ${rows.length}, p = ${f2(p0)}); P(X ≤ ${ok})`, p: pv, sig: `our passing ${label} really was worse than our usual level.`, notSig: 'that is within the normal swing from game to game, so it does not look like a lasting problem.' })}
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
      ${testBlock({ h0: `Our crossing was as successful as usual (p = ${f2(p0)}).`, h1: `Our crossing was less successful than usual (p &lt; ${f2(p0)}).`, baseline: `${h.k} found a teammate from ${h.n} earlier = ${f2(p0)}`, expect: `n × p = ${rows.length} × ${f2(p0)} = ${f1(rows.length * p0)} (${ok} did)`, model: `X ~ B(n = ${rows.length}, p = ${f2(p0)}); P(X ≤ ${ok})`, p: pv, sig: 'our crossing really was less effective than usual.', notSig: 'that is within the usual variation for our crossing.' })}
      ${improve(pv, {
        why: [`A cross only works if there is someone to meet it. The crosses came in from an average of ${f1(d.badDist)} m on the failures, with the nearest defender about ${f1(d.badPress)} m from the target. The crossers cannot be blamed if the middle of the box is empty, and the box is only full if the team has chosen to fill it.`, `There are two honest answers. Either put more bodies in the box so the ball has a target, or cross less and let the wide players cut inside or play it along the floor. Which is better depends on whether you have the aerial presence in the box to win the ball.`],
        steps: [`<b>Prepare tactics ▸ Final third:</b> drag your striker towards the penalty spot and the far-side winger or attacking midfielder to the back post, so there are two or three attackers in the box when the cross comes in.`, `Keep the full-back on the crossing side high and wide, so the winger can cut in and the full-back overlaps for the cross.`, `<b>Squad ▸ the striker ▸ Runs beyond the defence:</b> set <i>Run in behind often</i> if you want him attacking the near post; or <i>Holding the ball up</i> for a target man.`, `If you do not have the aerial presence, <b>Squad ▸ the winger ▸ Dribbling:</b> <i>Dribble more</i> and <i>Passing: Shorter, simpler passes</i> will turn crosses into cut-backs.`],
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
      ${testBlock({ h0: `The number of own-third turnovers this match is in line with our usual rate (${f1(lam)} a match).`, h1: `The number was higher than our usual rate.`, baseline: `${n0} own-third turnovers in ${m0} earlier match${m0 === 1 ? '' : 'es'} = ${f1(lam)} a match`, expect: `${f1(lam)} turnovers (we lost it ${now.length} times)`, model: `X ~ Poisson(λ = ${f1(lam)}); P(X ≥ ${now.length})`, p: pv, sig: 'we really did lose it more often than usual.', notSig: 'that is within the normal variation for us, so it is not clear that anything has changed.' })}
      ${improve(pv, {
        why: [ownFails.length ? `Of the passes we lost in our own third, <b>${ownFails.length}</b> were failed passes, averaging ${f1(d.badDist)} m, with the receiver ${f1(d.badPress)} m from the nearest defender${longShare >= 0.4 ? `. ${d.long} of them went more than 25 m: we are asking the back line and the keeper to find a distant teammate under pressure.` : '. Most were short passes under pressure: the ball was played to a teammate who was already being closed down.'}` : `Most of the lost balls came from challenges and dribbles rather than failed passes, so the players on the ball are being caught holding it.`,
          `Losing the ball near your own goal is the most expensive mistake there is, because the opposition are already close to goal. The aim is to make the safe pass the easy pass, and to keep the dangerous ball for when the opposition cannot reach it.`],
        steps: [`<b>Prepare tactics ▸ Build-up:</b> make sure the player on the ball has a short outlet on each side: drag a defensive midfielder close to the centre-backs and the full-backs a little deeper and wider than the defenders.`, longShare >= 0.4 ? `<b>Squad ▸ goalkeeper ▸ Distribution:</b> <i>Roll it out short</i> instead of long, and <b>centre-backs ▸ Passing:</b> <i>Shorter, simpler passes</i>.` : `<b>Squad ▸ the defenders ▸ Risk:</b> <i>Play it safe</i>, so they take the simple pass instead of the ambitious one when pressed.`, `If the opposition press you hard, consider a more direct route past them: <b>Squad ▸ goalkeeper ▸ Distribution:</b> <i>Kick it long</i> to a target man (<i>Holding the ball up</i> on your striker), and have the rest of the team push up to win the second ball.`],
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
      ${testBlock({ h0: `The shots we conceded are in line with a typical match in the league (${f1(lam)}).`, h1: `We conceded more shots than a typical match.`, baseline: `${num(total)} shots across ${count} team-matches = ${f1(lam)} a match`, expect: `${f1(lam)} shots against (we faced ${theirs.length})`, model: `X ~ Poisson(λ = ${f1(lam)}); P(X ≥ ${theirs.length})`, p: pv, sig: 'we really are conceding more than normal.', notSig: 'that is within the normal range, so I would not rebuild the defence on the strength of this one game.' })}
      ${improve(pv, {
        why: [`${inside} of their ${theirs.length} shots came from inside the box (within 16 m of goal), their nearest marker was on average <b>${f1(dg.def)} m</b> away, and the average chance was worth ${f2(dg.xgEach)} xG${heads ? `; ${heads} were headers` : ''}.${shape.length ? ` Our own shape was ${f1(comp)} m on average from the centre of the team to the players, with the back line at ${f1(line * 100)}% of the pitch.` : ''}`,
          dg.def >= 3.5 ? `Their shooters had time and space. That points to loose marking in and around the box: the defenders are holding zones and letting the man arrive unmarked, or the midfield line is not protecting the space in front of the defence.` : `Their shooters were being closed down, so the chances came from how easily they got into those positions: the pressure on the ball further up the pitch, and the gaps between our lines, matter more than the marking.`],
        steps: [`<b>Prepare tactics ▸ Defending your third:</b> drag the midfield line closer to the back four, so the gap between the lines is smaller (a tighter, more compact block gives the opposition fewer places to receive the ball between them).`, dg.def >= 3.5 ? `<b>Squad ▸ centre-backs and a defensive midfielder ▸ Marking:</b> <i>Mark his man tightly</i>, so the man on the edge of the box has someone with him.` : `<b>Defending page ▸ Pressing:</b> raise it a little (toward <i>Press hard</i>) so the ball is closed down earlier, before it gets to the box.`, `If they scored or had chances from set pieces, <b>Squad ▸ the defenders ▸ Defending corners:</b> <i>Mark in the box</i>.`, `Consider dropping the back line a few metres if their forwards are running in behind, using the <b>Defensive block</b> buttons (Low block, Mid block, High press) as a starting point.`],
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
      ${testBlock({ h0: `Our success in challenges was the same as usual (p = ${f2(p0)}).`, h1: `Our success in challenges was lower than usual (p &lt; ${f2(p0)}).`, baseline: `${h.k} won of ${h.n} earlier = ${f2(p0)}`, expect: `n × p = ${rows.length} × ${f2(p0)} = ${f1(rows.length * p0)} won (we won ${won})`, model: `X ~ B(n = ${rows.length}, p = ${f2(p0)}); P(X ≤ ${won})`, p: pv, sig: 'we really did win fewer challenges than usual.', notSig: 'that is within the normal variation for us, so it is not a lasting problem.' })}
      ${improve(pv, {
        why: [wp ? `${esc(wp.name)} lost <b>${lostBy[worst]}</b> of our challenges, more than anyone${wp.ratings && wp.ratings.tackling != null ? `. His Tackling rating is ${FM.shown ? FM.shown(wp.ratings.tackling) : wp.ratings.tackling}, so it is worth asking whether he is the right man to be going in` : ''}.` : `The lost challenges were spread across the team.`,
          `The team's pressing is set at ${Math.round(press * 100)}% and its tackling at ${Math.round(agg * 100)}%. Closing down a long way from goal means more one-against-one challenges, and a player who is not a good tackler will lose most of them. Losing a challenge also leaves a gap behind him.`],
        steps: [`<b>Squad ▸ ${wp ? esc(wp.name) : 'the player who loses most'} ▸ Closing down:</b> try <i>Close down less</i> and <i>Tackling: Stay on his feet</i>, so he holds his position and jockeys instead of diving in.`, `<b>Defending page ▸ Pressing:</b> if the team presses very high, ease it back toward <i>Stay compact</i>, so challenges happen in numbers and closer to our own shape.`, `Give your best tacklers the ball-winning jobs: <b>Squad ▸ a defensive midfielder ▸ role</b> set to a ball-winning midfielder, and the others ▸ <i>Close down less</i>.`],
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
      ${testBlock({ h0: `Our dribbling success was the same as usual (p = ${f2(p0)}).`, h1: `Our dribbling success was lower than usual (p &lt; ${f2(p0)}).`, baseline: `${h.k} came off from ${h.n} earlier = ${f2(p0)}`, expect: `n × p = ${rows.length} × ${f2(p0)} = ${f1(rows.length * p0)} (${won} did)`, model: `X ~ B(n = ${rows.length}, p = ${f2(p0)}); P(X ≤ ${won})`, p: pv, sig: 'our dribbling really was less successful than usual.', notSig: 'that is within the normal variation.' })}
      ${improve(pv, {
        why: [wp ? `${esc(wp.name)} lost the ball ${lostBy[worst]} time${lostBy[worst] === 1 ? '' : 's'} trying to take a man on, and on the dribbles that were lost the defender was on average only <b>${f1(defLost)} m</b> away. A dribble against a defender that close is a coin flip at best, and losing it hands over the ball in a dangerous place.` : `The lost dribbles came from several players.`,
          `Dribbling is worth it when a player is isolated one-on-one in space, and not worth it when a defender is already on top of him. The instructions decide how often a player tries.`],
        steps: [`<b>Squad ▸ ${wp ? esc(wp.name) : 'the player who loses it most'} ▸ Dribbling:</b> <i>Dribble less</i>, so he passes unless the way past really is open.`, `<b>Prepare tactics ▸ the phase page:</b> give the dribbler a passing option by moving a teammate closer, so passing is the easier decision than dribbling.`, `Keep <i>Dribble more</i> for the one or two players who win these duels, usually the wide players with high Dribbling ratings.`],
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
      ${testBlock({ h0: `The number of fouls we committed is in line with a typical match (${f1(lam)}).`, h1: `We committed more fouls than a typical match.`, baseline: `${num(total)} fouls across ${count} team-matches = ${f1(lam)} a match`, expect: `${f1(lam)} fouls (we committed ${fouls})`, model: `X ~ Poisson(λ = ${f1(lam)}); P(X ≥ ${fouls})`, p: pv, sig: 'we really are fouling more than normal.', notSig: 'that is within the normal range.' })}
      ${improve(pv, {
        why: [wp ? `${esc(wp.name)} gave away <b>${by[worst]}</b> of them${cards ? `, and cards are a cost twice over: they limit what a player can do for the rest of the match and can mean a suspension` : ''}. Fouls come from players committing to challenges they are not sure of, usually late or from behind.` : `The fouls were spread across the team.`,
          `The team's tackling is set at ${c.team.tactics ? Math.round(c.team.tactics.tackleAggression * 100) : 50}%: the higher it is, the more challenges, and the more fouls and cards that come with them.`],
        steps: [`<b>Defending page ▸ Tackling:</b> move it toward <i>Stay on feet</i>, so the team jockeys and waits for the mistake instead of going in.`, `<b>Squad ▸ ${wp ? esc(wp.name) : 'the player who fouls most'} ▸ Tackling:</b> <i>Stay on his feet</i> and, if he is often beaten, <i>Closing down: Close down less</i> so he is not put in positions where the foul is the only answer.`, `Check the fouls that were near our box: a deeper, more compact block (Defending page) puts fewer players in positions to commit them there.`],
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
      ${testBlock({ h0: `We win the ball back within six seconds as often as usual (p = ${f2(p0)}).`, h1: `We win it back quickly less often than usual (p &lt; ${f2(p0)}).`, baseline: `${h.k} quick regains from ${h.n} earlier = ${f2(p0)}`, expect: `n × p = ${rec.length} × ${f2(p0)} = ${f1(rec.length * p0)} (${quick} were quick)`, model: `X ~ B(n = ${rec.length}, p = ${f2(p0)}); P(X ≤ ${quick})`, p: pv, sig: 'we really are slower to win it back than usual.', notSig: 'that is within the normal variation.' })}
      ${improve(pv, {
        why: [`Our counter-press setting (what the team does in the seconds after losing the ball) is at ${Math.round(press * 100)}%. At a low setting the team drops back into shape first, which is safer but means the opposition keep the ball longer; at a high setting several players hunt it back at once.`, `Only ${high} of our ${rec.length} recoveries were high up the pitch, so the wins were mostly deep, after the opposition had already progressed.`],
        steps: [`<b>Prepare tactics ▸ Defensive transition ▸ After losing the ball:</b> slide the setting toward <i>Win it back at once</i>, so the nearest three or four players press the new carrier immediately.`, `<b>Prepare tactics ▸ the attacking phases:</b> keep a midfielder and a full-back close behind the ball when we attack, so they are in range to press the moment we lose it (a team that is stretched cannot counter-press).`, `<b>Squad ▸ the nearest midfielders ▸ Closing down:</b> <i>Close down more</i>, and check they have the Stamina to keep doing it.`],
        expect: `A higher share of quick regains, more recoveries high up the pitch, and more chances created from them. The cost is that if the press is beaten, there is space behind it.`,
        check: `Test phases ▸ Defensive transition before and after, and the next review will compare the share of regains inside six seconds.`,
        leave: `Our regain speed was within the normal range.`, watch: `the share of regains inside six seconds over the next two matches.` })}`;
    return { kind: 'regains', p: pv, impact: (p0 - quick / rec.length) * rec.length, title: 'Winning the ball back quickly', html };
  }

  // ---------- the page ----------
  FM.matchReview = function (league) {
    const c = context(league); if (!c) return null;
    const mid = (d) => d >= 1 / 3 && d < 2 / 3, back = (d) => d < 1 / 3, final = (d) => d >= 2 / 3;
    const cands = [candShooting(c), candTeamFinishing(c), candPassingZone(c, 'passFinal', 'in the final third', final, 'Final third'), candPassingZone(c, 'passMid', 'through midfield', mid, 'Play through midfield'), candPassingZone(c, 'passBuild', 'in our own third', back, 'Build-up'),
      candCrossing(c), candOwnThirdLosses(c), candShotsConceded(c), candDuels(c), candDribbling(c), candFouls(c), candRegains(c)].filter(Boolean);
    // the two where things went most wrong: the smallest chance of being just a bad day, at most one from each family (finishing, passing...)
    cands.sort((a, b) => (a.p - b.p) || (b.impact - a.impact));
    const picked = [], fams = new Set();
    cands.forEach((x) => { const fam = x.family || x.kind; if (picked.length < 2 && !fams.has(fam)) { picked.push(x); fams.add(fam); } });
    return { c, picked, all: cands };
  };
  FM.renderMatchReview = function (host, league) {
    const r = FM.matchReview(league);
    if (!r) { host.innerHTML = '<div class="card rv-intro"><h2>Last match</h2><p class="desc">Hi boss. Once we have played a match I will go through it with you here: what went wrong, whether it was down to bad luck, and what to look at.</p></div>'; return; }
    const c = r.c, res = c.gf > c.ga ? 'won' : c.gf === c.ga ? 'drew' : 'lost';
    host.innerHTML = `<div class="card rv-intro"><div class="eyebrow">The last match: round ${c.fx.round + 1}</div><h2>${esc(c.team.name)} ${c.gf}-${c.ga} ${esc(c.opp.name)}</h2>
      <p class="desc">Hi boss, I have done some analysis on the previous match, which we ${res} ${c.gf}-${c.ga}, and here are some things you may want to look over:</p></div>
      ${r.picked.length ? r.picked.map((x) => box(x.title, x.html)).join('') : '<div class="card"><p class="desc">There was not enough in that match to build a proper test from. Play another and I will have more for you.</p></div>'}
      <div class="card rv-outro"><p class="desc">If you want to explore any other points from the last game, just ask, and I can provide the data and assistance. Any techniques you need help with, I can explain too. I looked at ${r.all.length} different areas of the game to choose these two, including finishing, passing, crossing, tackling, dribbling, fouls and how quickly we win the ball back, so if you want any of the others, say which.</p><div class="row"><button type="button" class="primary" id="rvAsk">Ask the LastMind AI Agent</button></div></div>`;
    const b = host.querySelector('#rvAsk'); if (b) b.addEventListener('click', () => { if (FM.agentOpen) FM.agentOpen(); });
  };
})();
