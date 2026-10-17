// The review of the last match: the assistant looks over the previous game, picks the two places where things went most wrong, and works through
// each one: what happened, a picture of it, and a hypothesis test to see whether it was bad luck or something underneath. It is written as the
// assistant talking to the manager, and it ends by inviting questions (the LastMind AI Agent can take any of it further).
(function () {
  const FM = (window.FM = window.FM || {});
  const { L, W } = FM.PITCH;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1), f2 = (v) => (Math.round(v * 100) / 100).toFixed(2);
  const pc = (p) => (Math.round(p * 1000) / 10).toFixed(1) + '%';
  const surname = (p) => p.name.split(' ').slice(-1)[0];
  const A = () => FM.ANALYSIS_DRAW;
  const poissonUpper = (k, lam) => { let c = 0, t = Math.exp(-lam); for (let i = 0; i < k; i++) { c += t; t *= lam / (i + 1); } return Math.max(0, Math.min(1, 1 - c)); };   // P(X >= k)
  const SIG = 0.05;

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
  const nameOf = (team, number) => { const p = team.squad.find((q) => q.number === number); return p ? (p.name ? p : Object.assign({}, p, { name: 'Number ' + number })) : { name: 'Number ' + number, natural: '?' }; };

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
  function dotMap(points, color, label, caption, extra) {
    const dots = points.map((p) => `<circle cx="${px(p[0])}" cy="${py(p[1])}" r="9" fill="${p[2] || color}" fill-opacity=".72" stroke="#fff" stroke-width="2"/>`).join('');
    return `<figure class="rv-fig">${pitch((extra || '') + dots, label)}<figcaption>${caption}</figcaption></figure>`;
  }

  // ---------- one box of the test, set out the way it would be written down ----------
  function testBlock(t) {
    return `<div class="rv-test"><h4>The test</h4><table class="books-table calc"><tbody>
      <tr><td class="l">Null hypothesis</td><td class="l">${t.h0}</td></tr>
      <tr><td class="l">Alternative hypothesis</td><td class="l">${t.h1}</td></tr>
      <tr><td class="l">Baseline</td><td class="l">${t.baseline}</td></tr>
      <tr><td class="l">What we would expect</td><td class="l">${t.expect}</td></tr>
      <tr><td class="l">Binomial model</td><td class="l">${t.model}</td></tr>
      <tr><td class="l">Probability of a result this bad or worse</td><td class="l"><b>${pc(t.p)}</b></td></tr>
      <tr><td class="l">Significance level</td><td class="l">5%</td></tr>
      <tr class="tot"><td class="l">Conclusion</td><td class="l">${t.p < SIG ? `<b>${pc(t.p)}</b> is below 5%, so the result is statistically significant: ${t.sig}` : `<b>${pc(t.p)}</b> is above 5%, so the result is not statistically significant: ${t.notSig}`}</td></tr></tbody></table></div>`;
  }
  const box = (title, html) => `<article class="card rv-box"><h3>${esc(title)}</h3>${html}</article>`;
  const costLine = (c, missed) => {
    const extra = Math.round(missed);
    if (extra < 1) return 'Even so, the extra goals would not have changed how the match ended.';
    const gf2 = c.gf + extra, was = c.gf > c.ga ? 'win' : c.gf === c.ga ? 'draw' : 'defeat', now = gf2 > c.ga ? 'win' : gf2 === c.ga ? 'draw' : 'defeat';
    return now !== was ? `Had those chances gone in as expected the score would have been ${gf2}-${c.ga} rather than ${c.gf}-${c.ga}: a ${now} instead of a ${was}. So it could arguably have cost us the game.` : `Had they gone in as expected the score would have been ${gf2}-${c.ga} rather than ${c.gf}-${c.ga}, which would still have been a ${was}.`;
  };

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

  function candShooting(c) {
    const mine = c.fx.log.other.filter((e) => e.type === 'shot' && e.team === c.me);
    const by = {}; mine.forEach((e) => { (by[e.player] = by[e.player] || []).push(e); });
    let best = null;
    Object.keys(by).forEach((num) => {
      const shots = by[num]; if (shots.length < 3) return;
      const p = nameOf(c.team, +num), goals = shots.filter((e) => e.outcome === 'goal').length, xg = shots.reduce((a, e) => a + (e.xg || 0), 0);
      const conv = leagueConversion(c.league, p.natural), p0 = conv.goals / Math.max(1, conv.shots);
      if (!(p0 > 0 && p0 < 1)) return;
      const pv = FM.binomTest(goals, shots.length, p0, 'less'), gap = xg - goals;
      if (!best || gap > best.gap) best = { shots, p, goals, xg, conv, p0, pv, gap };
    });
    if (!best) return null;
    const b = best, n = b.shots.length, onT = b.shots.filter((e) => e.outcome === 'goal' || e.outcome === 'saved').length, off = b.shots.filter((e) => e.outcome === 'off').length, grp = b.conv.group ? POS[b.conv.group] || 'players' : 'players';
    const html = `<p><b>${esc(b.p.name)}</b> had ${n} shots in our last game against ${esc(c.opp.name)}: ${onT} on target, ${off} off target, ${b.shots.length - onT - off} blocked, and he scored ${b.goals}. The chances were worth a total of <b>${f2(b.xg)} xG</b>. Below is a shot map showing each shot ${esc(surname(b.p))} had, with the xG of each one.</p>
      ${shotMap(c, b.shots, b.p.name, c.home)}
      <p>${b.gap >= 0.8 ? 'As you can see, ' + (b.goals === 0 ? 'this many missed chances' : 'this gap between the chances and the goals') + ' could arguably have cost us points' : 'This is worth a look'}, so I looked into whether it was just chance or an underlying pattern. ${esc(costLine(c, b.gap))}</p>
      <p>To find out whether ${esc(surname(b.p))}'s finishing is really a problem, I performed a hypothesis test to see if his performance differs from the other ${esc(grp)} in the league.</p>
      <p>${esc(grp.charAt(0).toUpperCase() + grp.slice(1))} in the league have had <b>${b.conv.shots} shots</b> combined this season, scoring <b>${b.conv.goals}</b> of them, which is <b>${pc(b.p0)}</b> of shots resulting in a goal. So if we calculate ${esc(surname(b.p))}'s expected number of goals in the last match using that probability, it is ${n} × ${f2(b.p0)} = <b>${f2(n * b.p0)} goals</b>.</p>
      ${testBlock({ h0: `${esc(surname(b.p))} converts shots at the league rate for ${esc(grp)} (p = ${f2(b.p0)}).`, h1: `${esc(surname(b.p))} converts shots at a lower rate than the league for ${esc(grp)} (p &lt; ${f2(b.p0)}).`, baseline: `${b.conv.goals} goals from ${b.conv.shots} shots = ${f2(b.p0)}`, expect: `n × p = ${n} × ${f2(b.p0)} = ${f2(n * b.p0)} goals (he scored ${b.goals}; the chances were worth ${f2(b.xg)} xG)`, model: `X ~ B(n = ${n}, p = ${f2(b.p0)}); P(X ≤ ${b.goals})`, p: b.pv,
        sig: `his finishing really is below the league average, and that is worth working on.`, notSig: `his finishing is not necessarily below the league average, and the misses may simply be bad luck. Despite the figures looking underwhelming at face value, I would not worry about him yet.` })}
      <p class="note">In hindsight, comparing his goals with his xG (${b.goals} against ${f2(b.xg)}) uses the quality of each chance, which this simple test does not. That is a more sophisticated test you could ask me about.</p>`;
    return { kind: 'finishing', p: b.pv, impact: b.gap, title: `${b.p.name} shooting`, html };
  }

  function candTeamFinishing(c) {
    const mine = c.fx.log.other.filter((e) => e.type === 'shot' && e.team === c.me);
    if (mine.length < 5) return null;
    const goals = mine.filter((e) => e.outcome === 'goal').length, xg = mine.reduce((a, e) => a + (e.xg || 0), 0), conv = leagueConversion(c.league, null), p0 = conv.goals / Math.max(1, conv.shots);
    if (!(p0 > 0 && p0 < 1)) return null;
    const pv = FM.binomTest(goals, mine.length, p0, 'less'), gap = xg - goals;
    const html = `<p>We had <b>${mine.length} shots</b> against ${esc(c.opp.name)} and scored <b>${goals}</b>. The chances were worth <b>${f2(xg)} xG</b> between them. Here is every shot, with its xG.</p>
      ${shotMap(c, mine, 'Our', c.home)}
      <p>${esc(costLine(c, gap))} To see whether the team's finishing is really a problem, or just a bad day, I tested it against the league.</p>
      <p>Across the league, ${conv.shots} shots have been taken this season and ${conv.goals} scored: <b>${pc(p0)}</b>. At that rate, ${mine.length} shots would give ${f2(mine.length * p0)} goals.</p>
      ${testBlock({ h0: `Our shots become goals at the league rate (p = ${f2(p0)}).`, h1: `Our shots become goals at a lower rate than the league (p &lt; ${f2(p0)}).`, baseline: `${conv.goals} goals from ${conv.shots} shots = ${f2(p0)}`, expect: `n × p = ${mine.length} × ${f2(p0)} = ${f2(mine.length * p0)} goals (we scored ${goals}; the chances were worth ${f2(xg)} xG)`, model: `X ~ B(n = ${mine.length}, p = ${f2(p0)}); P(X ≤ ${goals})`, p: pv, sig: 'our finishing is genuinely below the league average, so it is worth working on the quality of the final ball and who takes the shots.', notSig: 'we cannot say our finishing is worse than the rest of the league: this could well be one of those days.' })}`;
    return { kind: 'finishing', p: pv, impact: gap, title: 'Our finishing', html };
  }

  function candPassing(c) {
    const log = c.fx.log, side = c.side;
    const finalThird = (row) => (c.home ? row[5] / L : 1 - row[5] / L) > 2 / 3;
    const mine = log.passes.filter((r) => r[1] === side && finalThird(r));
    if (mine.length < 12 || !c.before.length) return null;
    const ok = mine.filter((r) => r[4] === 1).length;
    let n0 = 0, k0 = 0;
    c.before.forEach((f) => { const s = f.homeId === c.me ? 0 : 1, home = s === 0; f.log.passes.forEach((r) => { if (r[1] === s && (home ? r[5] / L : 1 - r[5] / L) > 2 / 3) { n0++; if (r[4] === 1) k0++; } }); });
    if (n0 < 30) return null;
    const p0 = k0 / n0, pv = FM.binomTest(ok, mine.length, p0, 'less');
    const fails = mine.filter((r) => r[4] !== 1).map((r) => { const [x, y] = c.flip(c.home, r[5], r[6]), [tx, ty] = r[11] >= 0 ? c.flip(c.home, r[11], r[12]) : [x, y]; return { x, y, tx, ty }; });
    const lines = fails.map((p) => `<line x1="${px(p.x)}" y1="${py(p.y)}" x2="${px(p.tx)}" y2="${py(p.ty)}" stroke="#FF5A36" stroke-width="3.5" stroke-dasharray="7 5" stroke-opacity=".9"/><circle cx="${px(p.tx)}" cy="${py(p.ty)}" r="6" fill="#FF5A36" stroke="#fff" stroke-width="1.5"/><circle cx="${px(p.x)}" cy="${py(p.y)}" r="5" fill="#fff" stroke="#000" stroke-width="1.5"/>`).join('');
    const rate = ok / mine.length;
    const html = `<p>In the final third we attempted <b>${mine.length} passes</b> against ${esc(c.opp.name)} and <b>${ok}</b> reached a teammate: <b>${pc(rate)}</b>. In our earlier matches this season the figure was <b>${pc(p0)}</b> (${k0} of ${n0}). Below, each failed final-third pass is a dashed line from where it started (white dot) to where it was meant to go (red dot).</p>
      <figure class="rv-fig">${pitch(lines, 'Failed final-third passes')}<figcaption>${fails.length} passes in the final third did not find a teammate. Attacking to the right.</figcaption></figure>
      <p>Giving the ball away in the final third wastes the moves we have worked hard to build. I wanted to know whether this was a real drop in our passing there or an ordinary swing from match to match, so I tested it against our own record.</p>
      ${testBlock({ h0: `Our final-third passing was the same as usual this match (p = ${f2(p0)}).`, h1: `Our final-third passing was worse than usual (p &lt; ${f2(p0)}).`, baseline: `${k0} completed of ${n0} in our earlier matches = ${f2(p0)}`, expect: `n × p = ${mine.length} × ${f2(p0)} = ${f1(mine.length * p0)} completed (we completed ${ok})`, model: `X ~ B(n = ${mine.length}, p = ${f2(p0)}); P(X ≤ ${ok})`, p: pv, sig: 'our final-third passing really was worse than our usual level. Look at who is receiving in tight spaces and how far we are asking those passes to go.', notSig: 'that is within the normal swing from game to game, so it does not look like a lasting problem.' })}`;
    return { kind: 'passing', p: pv, impact: (p0 - rate) * mine.length, title: 'Passing in the final third', html };
  }

  function candOwnThirdLosses(c) {
    const xr = c.fx.log.xr; if (!xr) return null;
    const lost = (x, side) => x.seq.filter((q) => q[0] === side && q[6] === 0 && q[8] >= 0 && q[8] < 1 / 3);
    const now = lost(xr, c.side);
    let n0 = 0, m0 = 0; c.before.forEach((f) => { if (f.log.xr) { n0 += lost(f.log.xr, f.homeId === c.me ? 0 : 1).length; m0++; } });
    if (m0 < 1 || now.length < 3) return null;
    const lam = n0 / m0, pv = poissonUpper(now.length, lam);
    const pts = now.map((q) => [q[8] * L, q[9] * W]);
    const html = `<p>We lost the ball <b>${now.length} times in our own third</b> against ${esc(c.opp.name)}. Over our earlier ${m0} match${m0 === 1 ? '' : 'es'} we averaged <b>${f1(lam)}</b> a game. Each dot is a place where we gave it away, attacking to the right.</p>
      ${dotMap(pts, '#FF5A36', 'Where we lost the ball in our own third', `${now.length} turnovers in our own third. The closer to our goal, the more dangerous.`)}
      <p>Turnovers that deep give the opposition their best chances, so I checked whether ${now.length} was just a random bad day for us or a real rise on our normal number.</p>
      ${testBlock({ h0: `The number of own-third turnovers this match is in line with our usual rate (${f1(lam)} a match).`, h1: `The number was higher than our usual rate.`, baseline: `${n0} own-third turnovers in ${m0} earlier match${m0 === 1 ? '' : 'es'} = ${f1(lam)} a match`, expect: `${f1(lam)} turnovers (we lost it ${now.length} times)`, model: `X ~ Poisson(λ = ${f1(lam)}); P(X ≥ ${now.length})`, p: pv, sig: 'we really did lose it more often than usual, so something in how we build from the back is going wrong: look at the pressing we face and who is on the ball.', notSig: 'that is within the normal variation for us, so it is not clear that anything has changed.' })}`;
    return { kind: 'turnovers', p: pv, impact: now.length - lam, title: 'Losing the ball in our own third', html };
  }

  function candShotsConceded(c) {
    const theirs = c.fx.log.other.filter((e) => e.type === 'shot' && e.team !== c.me);
    const fixtures = c.league.fixtures.filter((f) => f.played && f.stats);
    if (!fixtures.length || theirs.length < 3) return null;
    let total = 0, count = 0; fixtures.forEach((f) => { [f.homeId, f.awayId].forEach((id) => { if (f.stats[id]) { total += f.stats[id].shots; count++; } }); });
    const lam = total / Math.max(1, count), pv = poissonUpper(theirs.length, lam), xg = theirs.reduce((a, e) => a + (e.xg || 0), 0);
    const oppIsHome = !c.home;
    const html = `<p>${esc(c.opp.name)} had <b>${theirs.length} shots</b> against us, worth <b>${f2(xg)} xG</b> in total. The average side in the league has about <b>${f1(lam)}</b> shots in a match. Here is each one, drawn attacking to the right (their goal is not shown; read it as their chances).</p>
      ${shotMap(c, theirs, 'Their', oppIsHome)}
      <p>I wanted to know whether we are giving up too many chances or whether they simply had a good afternoon.</p>
      ${testBlock({ h0: `The shots we conceded are in line with a typical match in the league (${f1(lam)}).`, h1: `We conceded more shots than a typical match.`, baseline: `${num(total)} shots across ${count} team-matches = ${f1(lam)} a match`, expect: `${f1(lam)} shots against (we faced ${theirs.length})`, model: `X ~ Poisson(λ = ${f1(lam)}); P(X ≥ ${theirs.length})`, p: pv, sig: 'we really are conceding more than normal, so look at how the side defends the box and how quickly it regains shape.', notSig: 'that is within the normal range, so I would not rebuild the defence on the strength of this one game.' })}`;
    function num(n) { return Math.round(n).toLocaleString('en-GB'); }
    return { kind: 'defending', p: pv, impact: theirs.length - lam, title: 'Chances we gave away', html };
  }

  function candDuels(c) {
    const side = c.side, mine = c.fx.log.tackles.filter((r) => r[1] === side);
    if (mine.length < 8 || !c.before.length) return null;
    const won = mine.filter((r) => r[4] === 1).length;
    let n0 = 0, k0 = 0; c.before.forEach((f) => { const s = f.homeId === c.me ? 0 : 1; f.log.tackles.forEach((r) => { if (r[1] === s) { n0++; if (r[4] === 1) k0++; } }); });
    if (n0 < 20) return null;
    const p0 = k0 / n0, pv = FM.binomTest(won, mine.length, p0, 'less');
    const pts = mine.map((r) => { const [x, y] = c.flip(c.home, r[5], r[6]); return [x, y, r[4] === 1 ? '#7FD49A' : '#FF5A36']; });
    const html = `<p>We went into <b>${mine.length} challenges</b> against ${esc(c.opp.name)} and won <b>${won}</b>: <b>${pc(won / mine.length)}</b>. Over our earlier matches we have won <b>${pc(p0)}</b> of them. Each dot is a challenge: <span style="color:#7FD49A">green</span> won, <span style="color:#FF5A36">red</span> lost.</p>
      ${dotMap(pts, '#FF5A36', 'Our challenges', 'Where our challenges were made, attacking to the right.')}
      <p>I tested whether that was a real fall in how well we win the ball, or an ordinary variation.</p>
      ${testBlock({ h0: `Our success in challenges was the same as usual (p = ${f2(p0)}).`, h1: `Our success in challenges was lower than usual (p &lt; ${f2(p0)}).`, baseline: `${k0} won of ${n0} earlier = ${f2(p0)}`, expect: `n × p = ${mine.length} × ${f2(p0)} = ${f1(mine.length * p0)} won (we won ${won})`, model: `X ~ B(n = ${mine.length}, p = ${f2(p0)}); P(X ≤ ${won})`, p: pv, sig: 'we really did win fewer challenges than usual: look at how we press and how much space we are giving the man on the ball.', notSig: 'that is within the normal variation for us, so it is not a lasting problem.' })}`;
    return { kind: 'duels', p: pv, impact: (p0 - won / mine.length) * mine.length, title: 'Winning the ball back in challenges', html };
  }

  // ---------- the page ----------
  FM.matchReview = function (league) {
    const c = context(league); if (!c) return null;
    const cands = [candShooting(c), candTeamFinishing(c), candPassing(c), candOwnThirdLosses(c), candShotsConceded(c), candDuels(c)].filter(Boolean);
    // the two where things went most wrong: the smallest chance of being just a bad day, at most one from the finishing family
    cands.sort((a, b) => (a.p - b.p) || (b.impact - a.impact));
    const picked = [];
    cands.forEach((x) => { if (picked.length < 2 && !picked.some((y) => y.kind === x.kind)) picked.push(x); });
    return { c, picked };
  };
  FM.renderMatchReview = function (host, league) {
    const r = FM.matchReview(league);
    if (!r) { host.innerHTML = '<div class="card rv-intro"><h2>Last match</h2><p class="desc">Hi boss. Once we have played a match I will go through it with you here: what went wrong, whether it was down to bad luck, and what to look at.</p></div>'; return; }
    const c = r.c, res = c.gf > c.ga ? 'won' : c.gf === c.ga ? 'drew' : 'lost';
    host.innerHTML = `<div class="card rv-intro"><div class="eyebrow">The last match: round ${c.fx.round + 1}</div><h2>${esc(c.team.name)} ${c.gf}-${c.ga} ${esc(c.opp.name)}</h2>
      <p class="desc">Hi boss, I have done some analysis on the previous match, which we ${res} ${c.gf}-${c.ga}, and here are some things you may want to look over:</p></div>
      ${r.picked.length ? r.picked.map((x) => box(x.title, x.html)).join('') : '<div class="card"><p class="desc">There was not enough in that match to build a proper test from. Play another and I will have more for you.</p></div>'}
      <div class="card rv-outro"><p class="desc">If you want to explore any other points from the last game, just ask, and I can provide the data and assistance. Any techniques you need help with, I can explain too.</p><div class="row"><button type="button" class="primary" id="rvAsk">Ask the LastMind AI Agent</button></div></div>`;
    const b = host.querySelector('#rvAsk'); if (b) b.addEventListener('click', () => { if (FM.agentOpen) FM.agentOpen(); });
  };
})();
