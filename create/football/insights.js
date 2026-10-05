// Strengths and weaknesses of one match, worked out ONLY from what is already saved for it (the match statistics and the compact log of
// passes, challenges, dribbles and shots), so it applies to every match played so far and not just to new ones.
// Each candidate compares your side with the opposition (or with a sensible benchmark) and gets a score from -1 (a clear weakness) to +1
// (a clear strength). The five best become the strengths and the five worst the weaknesses. Everything is relative to this one match.
(function () {
  const FM = (window.FM = window.FM || {});
  const L = 105;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const ds = (a, b) => (a + b > 0 ? (a - b) / (a + b) : 0);
  const pc = (a, b) => (b ? Math.round(100 * a / b) : 0);
  const n2 = (v) => (Math.round(v * 100) / 100).toFixed(2);

  FM.matchInsights = function (league, fx) {
    const empty = { strengths: [], weaknesses: [] };
    try {
      const U = league.userId, oppId = fx.homeId === U ? fx.awayId : fx.homeId, ui = fx.homeId === U ? 0 : 1, oi = 1 - ui;
      const su = fx.stats && fx.stats[U], so = fx.stats && fx.stats[oppId];
      if (!su || !so) return empty;
      const log = fx.log || {};
      const passesAll = log.passes || [], tackles = log.tackles || [], others = log.other || [];
      const dOf = (idx, x) => (idx === 0 ? x / L : 1 - x / L);                    // 0 = own goal, 1 = the goal that side attacks
      const passesOf = (idx) => passesAll.filter((p) => p[1] === idx && p[4] !== 2);
      const okOf = (a) => a.filter((p) => p[4] === 1).length;
      const pu = passesOf(ui), po = passesOf(oi);
      const cands = [];
      const add = (title, fact, score, good, bad) => { if (Number.isFinite(score)) cands.push({ title, fact, score: clamp(score, -1, 1), good, bad }); };
      const guard = (fn) => { try { fn(); } catch (e) { /* a missing field in an old save just drops that one observation */ } };

      guard(() => add('Chances created', `Expected goals ${n2(su.xg)} to ${n2(so.xg)}`, (su.xg - so.xg) / (su.xg + so.xg + 0.8) * 1.6, 'We made the better chances.', 'They made the better chances.'));
      guard(() => { if (su.shots >= 2 && so.shots >= 2) { const a = su.xg / su.shots, b = so.xg / so.shots; add('Quality of our shots', `${n2(a)} xG per shot (them ${n2(b)})`, ds(a, b) * 1.5, 'We worked the ball into better positions before shooting.', 'We shot from poorer positions than they did.'); } });
      guard(() => add('Finishing', `${su.goals} goal${su.goals === 1 ? '' : 's'} from ${n2(su.xg)} xG`, (su.goals - su.xg) / (su.xg + 1.2), 'Clinical: we scored more than the chances were worth.', 'Wasteful: the chances were worth more goals than we scored.'));
      guard(() => add('Goalkeeper and last-ditch defending', `${so.goals} conceded from ${n2(so.xg)} xG against`, (so.xg - so.goals) / (so.xg + 1.2), 'We conceded fewer than their chances deserved.', 'They scored more than their chances deserved.'));
      guard(() => { if (su.shots + so.shots >= 4) add('Shots', `${su.shots} shots for us, ${so.shots} against`, ds(su.shots, so.shots) * 1.2, 'We shot more than they did.', 'They had more shots than we did.'); });
      guard(() => { if (su.shots >= 3 && so.shots >= 3) add('Hitting the target', `${su.onTarget} of ${su.shots} shots on target (them ${so.onTarget} of ${so.shots})`, ds(su.onTarget / su.shots, so.onTarget / so.shots) * 1.5, 'Our shooting was more accurate.', 'Too many of our shots missed the target.'); });
      guard(() => { const share = su.possession / ((su.possession + so.possession) || 1); add('Possession', `${Math.round(100 * share)}% of the ball`, (share - 0.5) * 2.2, 'We had the ball more than they did.', 'They had the ball more than we did.'); });
      guard(() => {
        const heat = log.heat && log.heat.ball, GX = FM.HEAT && FM.HEAT.GX;
        if (!heat || !GX) return;
        const att = (idx) => { let a = 0, t = 0; heat.forEach((n, i) => { const d = dOf(idx, ((i % GX) + 0.5) / GX * L); t += n; if (d > 2 / 3) a += n; }); return t ? a / t : 0; };
        const a = att(ui), b = att(oi);
        add('Territory', `The ball was in the final third ${Math.round(100 * a)}% of the time for us, ${Math.round(100 * b)}% for them`, ds(a, b) * 1.2, 'We pinned them back.', 'They pinned us back.');
      });
      guard(() => { if (pu.length >= 20 && po.length >= 20) { const a = okOf(pu) / pu.length, b = okOf(po) / po.length; add('Passing accuracy', `${Math.round(100 * a)}% of passes completed (them ${Math.round(100 * b)}%)`, (a - b) * 4, 'We kept the ball better.', 'We gave the ball away more than they did.'); } });
      guard(() => {
        const mine = pu.filter((p) => dOf(ui, p[5]) < 0.33), theirs = po.filter((p) => dOf(oi, p[5]) < 0.33);
        if (mine.length >= 6 && theirs.length >= 6) {
          const a = okOf(mine) / mine.length, b = okOf(theirs) / theirs.length;
          add('Playing out from the back', `${pc(okOf(mine), mine.length)}% of our passes from our own third came off (them ${pc(okOf(theirs), theirs.length)}% from theirs)`, (a - b) * 4, 'We kept the ball better than they did when building from the back.', 'We lost the ball more than they did when building from the back.');
        }
      });
      guard(() => { const a = pu.filter((p) => p[9] < 3), b = po.filter((p) => p[9] < 3); if (a.length >= 6 && b.length >= 6) add('Passing when closed down', `${pc(okOf(a), a.length)}% completed when the receiver was closed down (them ${pc(okOf(b), b.length)}%)`, (okOf(a) / a.length - okOf(b) / b.length) * 3, 'We kept the ball even when pressed.', 'Being closed down made us lose the ball.'); });
      guard(() => { const lg = pu.filter((p) => p[7] >= 25); if (lg.length >= 6 && pu.length >= 20) { const c = okOf(lg) / lg.length; add('Long passes', `${lg.length} long passes (25 m or more), ${pc(okOf(lg), lg.length)}% completed`, (c - okOf(pu) / pu.length) * 2.5, 'Our long passes found their man.', 'Most long passes were lost: going long handed them the ball.'); } });
      guard(() => { if (su.tackles >= 4 && so.tackles >= 4) add('Winning challenges', `${su.tacklesWon} of ${su.tackles} challenges won (them ${so.tacklesWon} of ${so.tackles})`, ds(su.tacklesWon / su.tackles, so.tacklesWon / so.tackles) * 2, 'We won more of the duels.', 'They won more of the duels.'); });
      guard(() => {
        const high = (idx) => tackles.filter((p) => p[1] === idx && p[4] === 1 && dOf(idx, p[5]) > 0.5).length;
        const a = high(ui), b = high(oi);
        if (a + b >= 3) add('Winning the ball high up', `${a} challenge${a === 1 ? '' : 's'} won in their half, ${b} for them in ours`, (a - b) / (a + b + 2) * 1.6, 'Our press won the ball in dangerous areas.', 'We rarely won the ball high up, and they did in our half.');
      });
      guard(() => { if (su.dribbles >= 3 && so.dribbles >= 3) add('Dribbling', `${su.dribblesWon} of ${su.dribbles} dribbles won (them ${so.dribblesWon} of ${so.dribbles})`, ds(su.dribblesWon / su.dribbles, so.dribblesWon / so.dribbles) * 1.5, 'Our players beat their men.', 'Our dribbles were mostly stopped.'); });
      guard(() => add('Discipline', `${su.fouls} fouls, ${su.yellows} yellow and ${su.reds} red (them ${so.fouls}, ${so.yellows} and ${so.reds})`, (so.fouls - su.fouls) / (so.fouls + su.fouls + 4) * 2 - 0.5 * su.reds - 0.15 * su.yellows + 0.15 * so.yellows, 'We were the cleaner side.', 'Too many fouls and cards: it gave them free kicks and cost us players.'));
      guard(() => add('Timing our runs', `${su.offsides} offside${su.offsides === 1 ? '' : 's'} for us, ${so.offsides} for them`, (so.offsides - su.offsides) / (so.offsides + su.offsides + 4) * 2, 'We timed our runs better than they did.', 'We were caught offside far more than they were, which ended attacks for nothing.'));
      guard(() => { if (su.corners + so.corners >= 2) add('Set pieces', `${su.corners} corner${su.corners === 1 ? '' : 's'} won, ${so.corners} conceded`, ds(su.corners + 1, so.corners + 1) * 1.4, 'We won the territory battle that wins corners.', 'We gave away far more corners than we won.'); });
      guard(() => {
        const shots = others.filter((e) => e.type === 'shot' && e.team === U);
        if (shots.length < 5) return;
        const by = {}; shots.forEach((e) => { by[e.player] = (by[e.player] || 0) + 1; });
        const top = Object.keys(by).sort((a, b) => by[b] - by[a])[0], share = by[top] / shots.length;
        const team = FM.teamById(league, U), p = team.squad && team.squad.find((q) => String(q.number) === String(top));
        add('Who takes the shots', `${p ? (FM.shortName ? FM.shortName(p) : p.name) : 'One player'} took ${by[top]} of our ${shots.length} shots`, (0.4 - share) * 2.5, 'The chances were shared around, which makes us harder to plan for.', 'Almost all our shooting came from one player, which makes us easy to plan for.');
      });

      cands.sort((a, b) => b.score - a.score);
      const per = Math.min(5, Math.floor(cands.length / 2));
      const shape = (c, strength) => {
        const clear = strength ? c.score >= 0.08 : c.score <= -0.08;
        return { title: c.title, fact: c.fact, score: c.score, text: clear ? (strength ? c.good : c.bad) : (strength ? 'A small edge, but the best of an even match.' : 'A small difference, but the weakest part of an even match.'), clear };
      };
      return { strengths: cands.slice(0, per).map((c) => shape(c, true)), weaknesses: cands.slice(-per).reverse().map((c) => shape(c, false)) };
    } catch (e) { return empty; }
  };
})();
