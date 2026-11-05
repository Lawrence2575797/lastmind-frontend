// The Analysis page's written reports: what happened in a match, and across the season, as a write-up of what went well and what went wrong. Every
// sentence is built by code from the match logs, with the figures and the players named: a finding is only written when the numbers are far enough from
// ordinary to be worth saying, and the ones with the biggest gap come first. Nothing is sent anywhere or written by a model.
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1), f2 = (v) => (Math.round(v * 100) / 100).toFixed(2), pc = (a, b) => (b ? Math.round(100 * a / b) : 0);
  const sum = (a, f) => a.reduce((x, y) => x + (f ? f(y) : y), 0);
  const min = (t) => Math.floor(t / 60) + 1;
  const plural = (n, w, ws) => n + ' ' + (n === 1 ? w : ws || w + 's');
  const list = (a) => (a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);

  // ---------- one match, from one side ----------
  // Returns { good: [...], bad: [...], facts } where each finding is { id, score, title, text, look, who }. score is how far from ordinary it is (0 to 1 and a bit).
  function matchFindings(lg, fx, side) {
    const E = FM.explorer, c = E.makeCtx(lg, fx, side), o = E.makeCtx(lg, fx, side === 'us' ? 'them' : 'us');
    const good = [], bad = [], add = (list, f) => list.push(f);
    const xf = sum(c.shots, (s) => s.xg), xa = sum(c.against, (s) => s.xg), gf = c.shots.filter((s) => s.outcome === 'goal').length, ga = c.against.filter((s) => s.outcome === 'goal').length;
    const pName = (n) => c.name(n);
    const dist = (s) => Math.hypot(105 - s.x, 34 - s.y);
    const opp = c.opp.name, us = c.team.name;

    // finishing against the chances made
    const fin = gf - xf;
    const missed = c.shots.filter((s) => s.outcome !== 'goal' && s.xg >= 0.25).sort((a, b) => b.xg - a.xg);
    if (fin >= 1.3 && gf >= 2) add(good, { id: 'finishing', score: Math.min(1.2, fin / 3), title: 'Clinical finishing', text: `${us} scored ${gf} from ${f2(xf)} expected goals, ${f1(fin)} more than the chances deserved. ${list(c.shots.filter((s) => s.outcome === 'goal').map((s) => pName(s.player) + ' (' + min(s.t) + "', xG " + f2(s.xg) + ')'))} scored.`, look: 'Finishing at this level rarely lasts: look at whether the chances were as good next time.', who: null });
    if (fin <= -1.3 && missed.length) add(bad, { id: 'wasteful', score: Math.min(1.2, -fin / 3), title: 'Wasteful in front of goal', text: `${us} scored ${gf} from ${f2(xf)} expected goals. The best chances that were not taken: ${list(missed.slice(0, 3).map((s) => pName(s.player) + ' at ' + min(s.t) + "' (xG " + f2(s.xg) + ', ' + (s.outcome === 'saved' ? 'saved' : s.outcome === 'blocked' ? 'blocked' : 'off target') + ')'))}.`, look: 'Check whether these shots were taken under pressure or from tight angles, and who is taking them.', who: missed[0] ? pName(missed[0].player) : null });

    // the balance of chances
    const dx = xf - xa;
    if (dx >= 0.9) add(good, { id: 'chances', score: Math.min(1.2, dx / 2.5), title: 'Created the better chances', text: `The chances were ${f2(xf)} expected goals to ${f2(xa)}, from ${c.shots.length} shots to ${c.against.length}${gf <= ga ? ', though the score did not show it' : ''}.`, look: '', who: null });
    if (dx <= -0.9) add(bad, { id: 'outchanced', score: Math.min(1.2, -dx / 2.5), title: 'Gave up the better chances', text: `${opp} had ${f2(xa)} expected goals to ${f2(xf)}, from ${c.against.length} shots to ${c.shots.length}${gf >= ga ? ', and were unlucky not to have got more' : ''}.`, look: 'The sections below show where those chances came from.', who: null });

    // speculative shooting
    const far = c.shots.filter((s) => dist(s) > 20 && s.outcome !== 'goal'), farAll = c.shots.filter((s) => dist(s) > 20);
    if (c.shots.length >= 6 && farAll.length / c.shots.length >= 0.45) add(bad, { id: 'speculative', score: Math.min(1, farAll.length / c.shots.length), title: 'Too many shots from distance', text: `${farAll.length} of ${c.shots.length} shots came from outside 20 m. They averaged ${f2(sum(farAll, (s) => s.xg) / farAll.length)} expected goals each and made up ${pc(sum(farAll, (s) => s.xg), xf)}% of the total chance quality.`, look: 'More patience, or more bodies in the box, would turn some of these into better chances.', who: null });
    const inBox = c.shots.filter((s) => dist(s) <= 14);
    if (c.shots.length >= 8 && inBox.length / c.shots.length >= 0.6) add(good, { id: 'boxshots', score: 0.6, title: 'Shots taken from good places', text: `${inBox.length} of ${c.shots.length} shots came from inside 14 m of goal, averaging ${f2(sum(inBox, (s) => s.xg) / inBox.length)} expected goals each.`, look: '', who: null });

    // how the chances against arrived
    const big = c.against.filter((s) => s.xg >= 0.2);
    const quick = c.against.filter((s) => s.raw && s.raw.movePasses != null && s.raw.movePasses <= 3 && s.raw.moveSecs <= 8 && !s.setPiece), air = c.against.filter((s) => (s.raw && s.raw.leadAir) || s.setPiece === 'header'), sp = c.against.filter((s) => s.setPiece === 'freekick' || s.setPiece === 'corner' || s.setPiece === 'penalty');
    if (c.against.length >= 4 && quick.length >= 3 && quick.length / c.against.length >= 0.4) add(bad, { id: 'breaks', score: Math.min(1.2, quick.length / c.against.length + sum(quick, (s) => s.xg) / 2), title: 'Opened up by quick attacks', text: `${quick.length} of ${opp}'s ${c.against.length} shots came within eight seconds and three passes of them winning the ball, worth ${f2(sum(quick, (s) => s.xg))} expected goals. ${list(Array.from(new Set(quick.filter((s) => s.xg >= 0.15).map((s) => min(s.t) + "'"))).slice(0, 3)) ? 'The most dangerous came at ' + list(Array.from(new Set(quick.filter((s) => s.xg >= 0.15).map((s) => min(s.t) + "'"))).slice(0, 3)) + '.' : ''}`, look: 'The shape when the ball is lost: the defensive transition and how many players are caught ahead of the ball.', who: null });
    if (air.length >= 3 && air.length / Math.max(1, c.against.length) >= 0.3) add(bad, { id: 'aerial', score: Math.min(1, air.length / c.against.length + 0.2), title: 'Chances from the air', text: `${air.length} of ${opp}'s ${c.against.length} shots were headers or came from balls over the top, worth ${f2(sum(air, (s) => s.xg))} expected goals.`, look: 'The back line\'s height and the cover for crosses and set pieces.', who: null });
    if (sp.length >= 2) add(bad, { id: 'setpiece_against', score: Math.min(1, sum(sp, (s) => s.xg) / 1.2 + 0.2), title: 'Dangerous from set pieces', text: `${plural(sp.length, 'shot')} from free kicks, corners or penalties against, ${f2(sum(sp, (s) => s.xg))} expected goals in all.`, look: 'Marking at corners and the wall at free kicks.', who: null });
    if (c.against.length <= 8 && xa < 0.9 && c.against.length) add(good, { id: 'controlled', score: Math.min(1, (1.3 - xa) / 1.3 + 0.2), title: 'Gave very little away', text: `${opp} managed ${plural(c.against.length, 'shot')} worth ${f2(xa)} expected goals all match${ga === 0 ? ', and did not score' : ''}.`, look: '', who: null });
    if (big.length >= 3) { const wide = big.filter((s) => Math.abs(s.y - 34) > 12); if (wide.length / big.length >= 0.7) add(bad, { id: 'wide_chances', score: 0.7, title: 'Chances conceded from the flanks', text: `${wide.length} of the ${big.length} best chances against (expected goals 0.2 or more) came from wide areas.`, look: 'The full-backs and wide midfielders, and who covers the cross.', who: null }); }

    // giving the ball away in our own half, and what it cost
    const lostPasses = c.passes.filter((p) => p.res !== 1 && p.x < 52.5);
    const costly = lostPasses.map((p) => ({ p, shot: c.against.find((s) => s.t > p.t && s.t <= p.t + 12) })).filter((x) => x.shot);
    if (costly.length >= 2) {
      const by = {}; costly.forEach((x) => { by[x.p.from] = (by[x.p.from] || 0) + 1; });
      const top = Object.keys(by).sort((a, b) => by[b] - by[a])[0];
      add(bad, { id: 'giveaways', score: Math.min(1.2, costly.length / 4 + sum(costly, (x) => x.shot.xg) / 2), title: 'Careless in our own half', text: `${plural(costly.length, 'give-away')} in our half led to an opposition shot within twelve seconds (${f2(sum(costly, (x) => x.shot.xg))} expected goals). ${by[top] >= 2 ? pName(+top) + ' was behind ' + by[top] + ' of them.' : ''}`, look: 'The pass chosen under pressure: a safer outlet or a clearance would have cost less.', who: by[top] >= 2 ? pName(+top) : null });
    }

    // passing against what the situation allowed
    const per = {}; c.passes.forEach((p) => { const b = per[p.from] || (per[p.from] = { n: 0, ok: 0, e: 0 }); b.n++; if (p.res === 1) b.ok++; b.e += p.p; });
    const lines = Object.keys(per).filter((k) => per[k].n >= 12).map((k) => ({ k: +k, n: per[k].n, ok: per[k].ok, e: per[k].e, diff: per[k].ok - per[k].e })).sort((a, b) => a.diff - b.diff);
    if (lines.length && lines[0].diff <= -3) { const l = lines[0]; add(bad, { id: 'passer_poor', score: Math.min(1.1, -l.diff / 7), title: pName(l.k) + ' struggled to keep the ball', text: `${pName(l.k)} completed ${pc(l.ok, l.n)}% of ${l.n} passes, where the lanes and pressure should have allowed ${pc(l.e, l.n)}%: ${f1(-l.diff)} passes fewer than expected.`, look: 'Whether he is being asked to play passes beyond his range, or is being closed down too easily.', who: pName(l.k) }); }
    const bestP = lines[lines.length - 1];
    if (bestP && bestP.diff >= 3) add(good, { id: 'passer_good', score: Math.min(1.1, bestP.diff / 7), title: pName(bestP.k) + ' kept the ball well', text: `${pName(bestP.k)} completed ${pc(bestP.ok, bestP.n)}% of ${bestP.n} passes, against ${pc(bestP.e, bestP.n)}% expected from where and how he was passing: ${f1(bestP.diff)} more than expected.`, look: '', who: pName(bestP.k) });
    const press = c.passes.filter((p) => p.press != null && p.press >= 0 && p.press < 4);
    if (press.length >= 10) { const ok = press.filter((p) => p.res === 1).length, e = sum(press, (p) => p.p), d = (ok - e) / press.length * 100;
      if (d <= -9) add(bad, { id: 'pressure', score: Math.min(1.1, -d / 20), title: 'Poor under pressure', text: `With an opponent within 4 m of the receiver, ${pc(ok, press.length)}% of ${press.length} passes were completed, against ${pc(e, press.length)}% expected.`, look: 'The receiving angles and how close the nearest team-mate is to the man on the ball.', who: null });
      if (d >= 7) add(good, { id: 'pressure_good', score: Math.min(1.1, d / 18), title: 'Composed under pressure', text: `${pc(ok, press.length)}% of ${press.length} passes were completed with an opponent within 4 m of the receiver, against ${pc(e, press.length)}% expected.`, look: '', who: null }); }

    // getting into the final third
    const entries = c.passes.filter((p) => p.tx != null && p.tx >= 70 && p.x < 70), entOk = entries.filter((p) => p.res === 1).length;
    if (entries.length >= 8 && entOk / entries.length < 0.5) add(bad, { id: 'entries', score: Math.min(1, (0.6 - entOk / entries.length) * 2 + 0.3), title: 'Final-third entries mostly failed', text: `Only ${entOk} of ${entries.length} passes into the final third were completed (${pc(entOk, entries.length)}%).`, look: 'The pass that breaks the last line: its length and the pressure on the receiver.', who: null });
    if (entries.length >= 14 && entOk / entries.length >= 0.65) add(good, { id: 'entries_good', score: Math.min(1, entOk / entries.length), title: 'Moved the ball into the final third often and safely', text: `${entOk} of ${entries.length} passes into the final third were completed (${pc(entOk, entries.length)}%).`, look: '', who: null });
    const total = c.passes.length, oTotal = o.passes.length, share = total / Math.max(1, total + oTotal);
    if (share >= 0.58 && dx < 0.2) add(bad, { id: 'sterile', score: Math.min(1, (share - 0.5) * 3 + 0.2), title: 'Possession without penetration', text: `${us} made ${pc(total, total + oTotal)}% of the passes but the chances were ${f2(xf)} expected goals to ${f2(xa)}.`, look: 'How the ball is moved once it reaches the final third.', who: null });
    if (share <= 0.42 && dx >= 0.3) add(good, { id: 'efficient', score: Math.min(1, (0.5 - share) * 3 + 0.2), title: 'Efficient without the ball', text: `${opp} made ${pc(oTotal, total + oTotal)}% of the passes, yet the chances were ${f2(xf)} expected goals to ${f2(xa)} in ${us}'s favour.`, look: '', who: null });

    // duels
    const won = c.tackles.filter((t) => t.ok), own = c.tackles.filter((t) => t.x < 35), ownWon = own.filter((t) => t.ok).length, high = won.filter((t) => t.x > 52.5);
    if (own.length >= 6 && ownWon / own.length <= 0.4) add(bad, { id: 'duels_own', score: Math.min(1, (0.55 - ownWon / own.length) * 2.2), title: 'Beaten in duels in our own third', text: `Only ${ownWon} of ${own.length} duels in our own third were won (${pc(ownWon, own.length)}%).`, look: 'Who is being left one-against-one, and how close the cover is.', who: null });
    if (high.length >= 7) add(good, { id: 'high_regains', score: Math.min(1, high.length / 14), title: 'Winning the ball high up the pitch', text: `${high.length} duels were won in the opposition half, ${won.length ? pc(high.length, won.length) + '% of all that were won' : ''}.`, look: '', who: null });
    const drib = c.dribbles, dOk = drib.filter((d) => d.ok).length;
    if (drib.length >= 5 && dOk / drib.length >= 0.6) add(good, { id: 'takeons', score: dOk / drib.length * 0.7, title: 'Take-ons worked', text: `${dOk} of ${drib.length} take-ons beat the defender (${pc(dOk, drib.length)}%).`, look: '', who: null });
    if (drib.length >= 5 && dOk / drib.length <= 0.3) add(bad, { id: 'takeons_bad', score: (0.45 - dOk / drib.length) * 1.6, title: 'Take-ons lost the ball', text: `Only ${dOk} of ${drib.length} take-ons beat the defender; the rest gave the ball away.`, look: 'Whether the ball-carriers are going at defenders who are not close enough to be beaten.', who: null });

    // when it happened
    const periods = [0, 900, 1800, 2700, 3600, 4500], names = ["1' to 15'", "16' to 30'", "31' to 45'", "46' to 60'", "61' to 75'", "76' to 90'"];
    const inP = (s, i) => s.t >= periods[i] && s.t < (periods[i + 1] || 1e9);
    const xaP = names.map((_, i) => sum(c.against.filter((s) => inP(s, i)), (s) => s.xg)), xfP = names.map((_, i) => sum(c.shots.filter((s) => inP(s, i)), (s) => s.xg));
    const iA = xaP.indexOf(Math.max.apply(null, xaP)), iF = xfP.indexOf(Math.max.apply(null, xfP));
    if (xa >= 1.2 && xaP[iA] / xa >= 0.45) add(bad, { id: 'spell_against', score: Math.min(1, xaP[iA] / xa), title: 'Vulnerable from ' + names[iA], text: `${pc(xaP[iA], xa)}% of the chances against (${f2(xaP[iA])} of ${f2(xa)} expected goals) came in that spell.`, look: 'What changed then: a substitution, a tired player, or a change in how the opposition played.', who: null });
    if (xf >= 1.5 && xfP[iF] / xf >= 0.45) add(good, { id: 'spell_for', score: Math.min(1, xfP[iF] / xf), title: 'Strongest from ' + names[iF], text: `${pc(xfP[iF], xf)}% of the chance quality (${f2(xfP[iF])} of ${f2(xf)} expected goals) came in that spell.`, look: '', who: null });

    // discipline and set pieces for
    const cards = c.others.filter((e) => e.type === 'foul' && e.card), fouls = c.others.filter((e) => e.type === 'foul').length;
    if (cards.length >= 3 || fouls >= 14) add(bad, { id: 'discipline', score: Math.min(1, cards.length / 4 + fouls / 30), title: 'Discipline', text: `${plural(fouls, 'foul')} and ${plural(cards.length, 'card')}${cards.length ? ' (' + list(cards.map((e) => pName(e.player))) + ')' : ''}.`, look: 'Players already on a yellow, and where the fouls are being given away.', who: null });
    const sf = c.shots.filter((s) => s.setPiece === 'freekick' || s.setPiece === 'corner' || s.setPiece === 'penalty');
    if (sf.length >= 2) add(good, { id: 'setpiece_for', score: Math.min(1, sum(sf, (s) => s.xg) / 1.2), title: 'Threat from set pieces', text: `${plural(sf.length, 'shot')} from set pieces, ${f2(sum(sf, (s) => s.xg))} expected goals${sf.some((s) => s.outcome === 'goal') ? ', including a goal' : ''}.`, look: '', who: null });

    const rank = (a) => a.sort((x, y) => y.score - x.score);
    const facts = { gf, ga, xf, xa, shots: c.shots.length, against: c.against.length, share, passes: total, opp, us, c };
    return { good: rank(good), bad: rank(bad), facts };
  }

  // ---------- the write-up ----------
  const card = (f, kind) => `<article class="rp-card ${kind}"><h5>${esc(f.title)}</h5><p>${esc(f.text)}</p>${f.look ? `<p class="rp-look">Worth looking at: ${esc(f.look)}</p>` : ''}</article>`;
  function lead(F, n) {
    const r = F.gf > F.ga ? 'won' : F.gf < F.ga ? 'lost' : 'drew', rs = F.gf + '-' + F.ga;
    let s = `${F.us} ${r} ${rs} against ${F.opp}. The chances were ${f2(F.xf)} expected goals to ${f2(F.xa)}, from ${plural(F.shots, 'shot')} to ${F.against}, and ${F.us} had ${Math.round(F.share * 100)}% of the passes.`;
    const luck = (F.gf - F.ga) - (F.xf - F.xa);
    if (luck >= 1.5) s += ' The score flattered them: the chances alone would not have given that margin.'; else if (luck <= -1.5) s += ' The score did not reflect the play: the chances pointed to a better result.';
    else s += ' The result was about what the chances deserved.';
    return s;
  }
  FM.report = {
    matchHtml(lg, fx, side) {
      const F = matchFindings(lg, fx, side), top = (a) => a.slice(0, 5);
      const goods = top(F.good), bads = top(F.bad);
      return `<div class="rp"><p class="rp-lead">${esc(lead(F.facts))}</p><div class="rp-cols"><section><h4 class="rp-h good">What went well</h4>${goods.length ? goods.map((f) => card(f, 'good')).join('') : '<p class="note">Nothing stood out as clearly good in the numbers. That is itself a finding: the match did not give the side a platform to build on.</p>'}</section>
        <section><h4 class="rp-h bad">What went wrong</h4>${bads.length ? bads.map((f) => card(f, 'bad')).join('') : '<p class="note">Nothing stood out as clearly wrong. A match with no big weakness is worth noting too.</p>'}</section></div>
        <p class="ex-note">Each point is only written when the figure is well away from ordinary, and the biggest gaps come first. The other pages of Analysis show the maps and tables behind them.</p></div>`;
    },
    // across the matches played with a record: what keeps coming up
    seasonHtml(lg) {
      const E = FM.explorer, fxs = E.playedWithLogs(lg).filter((f) => !f.preseason && !f.friendly), used = fxs.length ? fxs : E.playedWithLogs(lg);
      if (!used.length) return '<p class="note">Once matches with a record have been played, this page collects what keeps coming up.</p>';
      const all = used.map((fx) => ({ fx, F: matchFindings(lg, fx, 'us') })), n = all.length;
      const group = (kind) => { const g = {}; all.forEach(({ F, fx }) => F[kind].forEach((f) => { const e = g[f.id] || (g[f.id] = { id: f.id, n: 0, score: 0, items: [], title: f.title }); e.n++; e.score += f.score; e.items.push({ f, fx }); })); return Object.keys(g).map((k) => g[k]).sort((a, b) => (b.n - a.n) || (b.score - a.score)); };
      const gs = group('good'), bs = group('bad');
      const GENERIC = { passer_poor: 'Players losing the ball in passes they should complete', passer_good: 'Players keeping the ball better than expected' };
      const row = (e, kind) => { const last = e.items[e.items.length - 1], names = {}; e.items.forEach(({ f }) => { if (f.who) names[f.who] = (names[f.who] || 0) + 1; }); const ranked = Object.keys(names).sort((a, b) => names[b] - names[a]), who = ranked[0];
        const generic = !!GENERIC[e.id], named = ranked.length ? ' Named: ' + ranked.slice(0, 4).map((k) => k + (names[k] > 1 ? ' (' + names[k] + ' matches)' : '')).join(', ') + '.' : '';
        return `<article class="rp-card ${kind}"><h5>${esc(GENERIC[e.id] || e.title)}</h5><p>Came up in <b>${e.n} of ${n}</b> match${n === 1 ? '' : 'es'}${!generic && e.n >= 2 && who && names[who] >= 2 ? ', with ' + esc(who) + ' involved in ' + names[who] : ''}. ${generic ? esc(named.trim()) + ' The latest: ' + esc(last.f.text) : 'The latest: ' + esc(last.f.text)}</p>${e.n >= 3 && n >= 5 ? `<p class="rp-look">That is not a one-off: it has shown up in ${Math.round(100 * e.n / n)}% of the matches.</p>` : ''}${last.f.look ? `<p class="rp-look">Worth looking at: ${esc(last.f.look)}</p>` : ''}</article>`; };
      const recurring = (a) => a.filter((e) => e.n >= (n >= 4 ? 2 : 1)).slice(0, 6);
      const fa = FM.seasonAnalysis ? FM.seasonAnalysis(lg, { compact: true }) : '';
      const w = n >= 3 ? '' : '<p class="ex-note">Only ' + n + ' match' + (n === 1 ? '' : 'es') + ' with a record so far: a pattern needs several matches before it means much.</p>';
      return `<div class="rp"><p class="rp-lead">${n} match${n === 1 ? '' : 'es'} with a record. What keeps coming up:</p>${w}<div class="rp-cols"><section><h4 class="rp-h good">Strengths that keep showing</h4>${recurring(gs).length ? recurring(gs).map((e) => row(e, 'good')).join('') : '<p class="note">No strength has repeated yet.</p>'}</section>
        <section><h4 class="rp-h bad">Weaknesses that keep showing</h4>${recurring(bs).length ? recurring(bs).map((e) => row(e, 'bad')).join('') : '<p class="note">No weakness has repeated yet.</p>'}</section></div>${fa}</div>`;
    },
  };
  const css = '.rp { display: grid; gap: 14px; } .rp-lead { margin: 0; font-size: 1.02rem; line-height: 1.6; max-width: 90ch; } .rp-cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; align-items: start; } @media (max-width: 900px) { .rp-cols { grid-template-columns: minmax(0, 1fr); } }'
    + ' .rp-h { margin: 0 0 8px; font: 700 .8rem var(--sans); letter-spacing: .1em; text-transform: uppercase; } .rp-h.good { color: #7fe3a6; } .rp-h.bad { color: #ff8a7a; } .rp-card { border: 1px solid var(--line); border-left-width: 3px; padding: 12px 14px; margin-bottom: 10px; background: rgba(255,255,255,.03); } .rp-card.good { border-left-color: #7fe3a6; } .rp-card.bad { border-left-color: #ff8a7a; }'
    + ' .rp-card h5 { margin: 0 0 4px; font: 700 .98rem var(--sans); } .rp-card p { margin: 0; line-height: 1.55; font-size: .92rem; } .rp-card p + p { margin-top: 6px; } .rp-look { opacity: .75; font-size: .84rem !important; }';
  if (!document.getElementById('rpCss')) { const st = document.createElement('style'); st.id = 'rpCss'; st.textContent = css; document.head.appendChild(st); }
  if (FM.explorer) {
    // these come first in the list
    FM.explorer.INV.unshift(
      { id: 'report_match', group: 'Report', title: 'Match report', tags: 'report write up summary what went well wrong weaknesses strengths insight analysis review match verdict', blurb: 'A write-up of the match: what went well, and what went wrong, with the figures behind each point.', needs: 'match', render(c) { return FM.report.matchHtml(c.lg, c.fx, c.teamId === c.lg.userId ? 'us' : 'them'); } },
      { id: 'report_season', group: 'Report', title: 'Season report', tags: 'report season write up what keeps coming up recurring weaknesses strengths pattern trend insight', blurb: 'Across every match with a record: the strengths and weaknesses that keep appearing.', needs: 'season', render() { return FM.report.seasonHtml(FM.curLeague); } });
  }
})();
