// News. Every story is written from a template out of something that really happened in the matches: a Player of the Match, a
// hat-trick, the race for top scorer, a winning or losing run, a clean sheet, a red card, a shock result, an injury, a club going
// top. Nothing is invented. Where a player is named, his nationality is woven in.
(function () {
  const FM = (window.FM = window.FM || {});
  const S = FM.STAT;
  FM.DEMONYM = { England: 'English', Spain: 'Spanish', France: 'French', Germany: 'German', Brazil: 'Brazilian', Nigeria: 'Nigerian', Ghana: 'Ghanaian', Netherlands: 'Dutch', Portugal: 'Portuguese', Italy: 'Italian', Argentina: 'Argentine', Japan: 'Japanese', 'South Korea': 'South Korean', Poland: 'Polish', Croatia: 'Croatian', Morocco: 'Moroccan', Senegal: 'Senegalese', Sweden: 'Swedish', Ireland: 'Irish', USA: 'American' };
  const NOUN = { GK: 'goalkeeper', CB: 'centre-back', FB: 'full-back', DM: 'midfielder', CM: 'midfielder', AM: 'playmaker', WF: 'winger', ST: 'striker' };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ordinal = (n) => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : (n % 10 < 4 ? n % 10 : 0)]);
  const weeks = (m) => (m === 1 ? 'one match' : m + ' matches');
  const poss = (n) => (/s$/.test(n) ? n + "'" : n + "'s");

  // ---------- what happened in one match ----------
  FM.summariseMatch = function (league, fx, match) {
    const home = match.home, away = match.away, byNum = (team, n) => team.squad.find((p) => p.number === n);
    const teamOf = (id) => (id === home.id ? home : away);
    const sum = { goals: [], reds: [], injuries: [], potm: null, hat: [] };
    const score = {}; const add = (team, n, v) => { const k = team.id + ':' + n; score[k] = (score[k] || 0) + v; };
    const goalsBy = {};
    match.events.forEach((e) => {
      const team = teamOf(e.team);
      if (!team) return;
      const p = e.player != null ? byNum(team, e.player) : null;
      if (e.type === 'goal' && p) { sum.goals.push({ t: Math.round(e.t / 60), team: team.id, n: p.number, name: p.name }); add(team, p.number, 4); goalsBy[team.id + ':' + p.number] = (goalsBy[team.id + ':' + p.number] || 0) + 1; }
      else if (e.type === 'shot' && p) add(team, p.number, e.outcome === 'goal' || e.outcome === 'saved' ? 0.4 : 0.15);
      else if (e.type === 'pass') { const q = byNum(team, e.from); if (q) add(team, q.number, e.ok ? 0.015 : -0.02); }
      else if (e.type === 'tackle' && p) add(team, p.number, e.ok ? 0.3 : -0.05);
      else if (e.type === 'dribble' && p) add(team, p.number, e.ok ? 0.3 : -0.05);
      else if (e.type === 'foul' && p) {
        add(team, p.number, -0.25);
        if (e.card === 'yellow') add(team, p.number, -0.3);
        if (e.card === 'red' || e.card === 'second yellow') { add(team, p.number, -2); sum.reds.push({ t: Math.round(e.t / 60), team: team.id, n: p.number, name: p.name, second: e.card === 'second yellow' }); }
      } else if (e.type === 'injury' && p) sum.injuries.push({ team: team.id, n: p.number, name: p.name, matches: e.matches, what: e.name });
    });
    Object.keys(goalsBy).forEach((k) => { if (goalsBy[k] >= 3) { const [tid, n] = k.split(':'); const p = byNum(teamOf(tid), +n); sum.hat.push({ team: tid, n: +n, name: p.name, goals: goalsBy[k] }); } });
    const hg = match.score[home.id], ag = match.score[away.id];
    [home, away].forEach((team) => {
      const conceded = team === home ? ag : hg, won = team === home ? hg > ag : ag > hg;
      team.squad.forEach((p) => {
        const k = team.id + ':' + p.number;
        if (score[k] == null) return;
        if (conceded === 0 && ['GK', 'CB', 'FB'].indexOf(p.natural) >= 0) score[k] += 1;
        if (won) score[k] += 0.5;
      });
    });
    let best = null;
    Object.keys(score).forEach((k) => { if (!best || score[k] > best.score) best = { k, score: score[k] }; });
    if (best) { const [tid, n] = best.k.split(':'); const p = byNum(teamOf(tid), +n); if (p) sum.potm = { team: tid, n: +n, name: p.name, nation: p.nation, pos: p.natural, score: +best.score.toFixed(2) }; }
    return sum;
  };

  // ---------- writing the stories ----------
  FM.pushNews = function (league, item) {
    league.news = league.news || [];
    item.id = 'N' + (league.news.length + 1);
    league.news.push(item);
  };

  const tableBefore = (league, round) => {
    const rows = {}; league.teams.forEach((t) => { rows[t.id] = { id: t.id, pts: 0, gd: 0, gf: 0 }; });
    league.fixtures.filter((f) => f.played && f.round < round).forEach((f) => {
      const h = rows[f.homeId], a = rows[f.awayId];
      h.gf += f.hg; a.gf += f.ag; h.gd += f.hg - f.ag; a.gd += f.ag - f.hg;
      if (f.hg > f.ag) h.pts += 3; else if (f.hg < f.ag) a.pts += 3; else { h.pts++; a.pts++; }
    });
    return Object.values(rows).sort((x, y) => (y.pts - x.pts) || (y.gd - x.gd) || (y.gf - x.gf));
  };

  FM.makeNews = function (league, round) {
    const rng = FM.mulberry32(league.seed + round * 131 + 17);
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];
    const me = league.userId, name = (id) => FM.teamById(league, id).name;
    const fxs = league.fixtures.filter((f) => f.round === round && f.played);
    const items = [];
    const push = (kind, headline, body, club) => items.push({ round, day: league.day, kind, headline, body, club: club || null, mine: club === me });
    const who = (p) => `the ${FM.DEMONYM[p.nation] || ''} ${NOUN[p.pos] || 'player'}`.replace('the  ', 'the ');
    const player = (id, n) => FM.teamById(league, id).squad.find((p) => p.number === n);

    // Player of the Match: in the user's match, and in the most one-sided other match
    const userFx = fxs.find((f) => f.homeId === me || f.awayId === me);
    const others = fxs.filter((f) => f !== userFx && f.summary && f.summary.potm).sort((a, b) => Math.abs(b.hg - b.ag) - Math.abs(a.hg - a.ag));
    [userFx].concat(others[0] ? [others[0]] : []).forEach((f) => {
      if (!f || !f.summary || !f.summary.potm) return;
      const pm = f.summary.potm, h = name(f.homeId), a = name(f.awayId), club = pm.team, opp = pm.team === f.homeId ? a : h, mine = pm.team;
      const gs = f.summary.goals.filter((g) => g.team === pm.team && g.n === pm.n).length;
      const res = `${h} ${f.hg}-${f.ag} ${a}`;
      const won = (pm.team === f.homeId ? f.hg > f.ag : f.ag > f.hg), drew = f.hg === f.ag;
      const head = won ? pick([`${pm.name} stars as ${name(club)} beat ${opp}`, `${pm.name} the difference as ${name(club)} win`, `Man of the match ${pm.name} leads ${name(club)} past ${opp}`]) : drew ? pick([`${pm.name} the pick of the players in ${h} ${f.hg}-${f.ag} ${a}`, `${pm.name} stands out in a draw`]) : `${pm.name} shines in defeat for ${name(club)}`;
      push('Player of the Match', head, `${res}. Our player of the match is ${who(pm)} ${pm.name} (${name(club)}), ${gs ? `who scored ${gs === 1 ? 'a goal' : gs + ' goals'}` : 'who was involved all over the pitch'}.`, club);
      void mine;
    });

    // hat-tricks anywhere
    fxs.forEach((f) => (f.summary ? f.summary.hat : []).forEach((h) => {
      const p = player(h.team, h.n);
      push('Hat-trick', pick([`${h.name} hits ${h.goals === 3 ? 'a hat-trick' : h.goals + ' goals'} for ${name(h.team)}`, `Treble for ${who({ nation: p.nation, pos: p.natural })} ${h.name}`]), `${name(f.homeId)} ${f.hg}-${f.ag} ${name(f.awayId)}. ${h.name} scored ${h.goals} of ${h.team === f.homeId ? f.hg : f.ag}, a ${FM.DEMONYM[p.nation] || ''} ${NOUN[p.natural]} in form.`.replace('a  ', 'a '), h.team);
    }));

    // red cards
    fxs.forEach((f) => (f.summary ? f.summary.reds : []).forEach((r) => push('Red card', `${r.name} sent off for ${name(r.team)}`, `${name(f.homeId)} ${f.hg}-${f.ag} ${name(f.awayId)}. ${r.name} was shown ${r.second ? 'a second yellow card' : 'a straight red'} in the ${r.t}th minute and ${name(r.team)} played on with ten.`, r.team)));

    // injuries
    fxs.forEach((f) => (f.summary ? f.summary.injuries : []).forEach((i) => {
      const p = player(i.team, i.n);
      push('Injury', `${i.name} ruled out for ${weeks(i.matches)}`, `${poss(name(i.team))} ${FM.DEMONYM[p.nation] || ''} ${NOUN[p.natural]} suffered ${i.what} against ${name(i.team === f.homeId ? f.awayId : f.homeId)} and will miss ${i.matches === 1 ? 'the next match' : 'the next ' + i.matches + ' matches'}.`.replace('  ', ' '), i.team);
    }));

    // shock results and thrashings
    const before = tableBefore(league, round), rank = {}; before.forEach((r, i) => { rank[r.id] = i + 1; });
    fxs.forEach((f) => {
      const winner = f.hg > f.ag ? f.homeId : f.hg < f.ag ? f.awayId : null; if (!winner) return;
      const loser = winner === f.homeId ? f.awayId : f.homeId, margin = Math.abs(f.hg - f.ag);
      if (round >= 3 && rank[winner] - rank[loser] >= 4) push('Shock result', pick([`Shock: ${name(winner)} beat ${name(loser)}`, `${name(winner)} stun ${ordinal(rank[loser])}-placed ${name(loser)}`]), `${name(f.homeId)} ${f.hg}-${f.ag} ${name(f.awayId)}. ${name(winner)}, ${ordinal(rank[winner])} in the table, took the points off ${name(loser)}, who started the day ${ordinal(rank[loser])}.`, winner);
      else if (margin >= 4) push('Big win', `${name(winner)} thrash ${name(loser)}`, `${name(f.homeId)} ${f.hg}-${f.ag} ${name(f.awayId)}: a ${margin}-goal margin.`, winner);
    });

    // runs, and clean sheets
    const played = (id) => league.fixtures.filter((f) => f.played && (f.homeId === id || f.awayId === id) && f.round <= round).sort((a, b) => a.round - b.round);
    league.teams.forEach((t) => {
      const fs = played(t.id); if (fs.length < 2) return;
      const res = fs.map((f) => { const gf = f.homeId === t.id ? f.hg : f.ag, ga = f.homeId === t.id ? f.ag : f.hg; return { gf, ga, r: gf > ga ? 'W' : gf === ga ? 'D' : 'L' }; });
      const run = (pred) => { let n = 0; for (let i = res.length - 1; i >= 0 && pred(res[i]); i--) n++; return n; };
      const w = run((x) => x.r === 'W'), u = run((x) => x.r !== 'L'), l = run((x) => x.r === 'L'), cs = run((x) => x.ga === 0), nogoal = run((x) => x.gf === 0);
      if ([3, 5, 7].indexOf(w) >= 0) push('Run', `${t.name} win ${w} in a row`, `${t.name} have now won their last ${w} league matches.`, t.id);
      else if ([5, 8, 11].indexOf(u) >= 0 && w < u) push('Run', `${t.name} unbeaten in ${u}`, `${t.name} have not lost in their last ${u} matches.`, t.id);
      if ([3, 5].indexOf(l) >= 0) push('Run', `${t.name} slump: ${l} defeats in a row`, `${t.name} have lost their last ${l} and are under pressure.`, t.id);
      if ([2, 3, 4].indexOf(cs) >= 0) push('Clean sheets', `${t.name} keep ${cs} clean sheets in a row`, `${t.name} have not conceded in their last ${cs} matches.`, t.id);
      if (nogoal === 3) push('Run', `${t.name} cannot find a goal`, `${t.name} have now gone three matches without scoring.`, t.id);
    });

    // the race for top scorer and a new leader
    if (round >= 2) {
      const scorers = [].concat.apply([], league.teams.map((t) => t.squad.map((p) => ({ p, t, g: p.stats ? p.stats.goals : 0 })))).sort((a, b) => b.g - a.g);
      if (scorers[0].g >= 3 && (round % 2 === 1 || scorers[0].g - scorers[1].g <= 1)) {
        const a = scorers[0], b = scorers[1], gap = a.g - b.g;
        push('Top scorer', gap === 0 ? `${a.p.name} and ${b.p.name} level on ${a.g} goals` : `${a.p.name} leads the scoring on ${a.g}`, gap === 0 ? `${a.p.name} (${a.t.name}) and ${b.p.name} (${b.t.name}) share the top of the scoring charts.` : `${a.p.name}, ${who({ nation: a.p.nation, pos: a.p.natural })} for ${a.t.name}, has ${a.g} goals, ${gap} ahead of ${b.p.name} (${b.t.name}) on ${b.g}.`, a.t.id);
      }
      const nowTop = FM.tableRows(league)[0], prevTop = tableBefore(league, round)[0];
      if (nowTop && prevTop && nowTop.id !== prevTop.id) push('Table', `${nowTop.name} go top`, `${nowTop.name} move to the top of the table on ${nowTop.pts} points, replacing ${name(prevTop.id)}.`, nowTop.id);
    }
    items.forEach((it) => FM.pushNews(league, it));
    return items.length;
  };

  // ---------- the page ----------
  const fstate = { mine: false };
  FM.renderNews = function (host, league) {
    const all = (league.news || []).slice().reverse(), me = league.userId;
    const list = fstate.mine ? all.filter((n) => n.mine) : all;
    const rounds = {}; list.forEach((n) => { (rounds[n.round] = rounds[n.round] || []).push(n); });
    const keys = Object.keys(rounds).map(Number).sort((a, b) => b - a);
    host.innerHTML = `<div style="display:grid;gap:16px"><div class="card"><h2>News</h2>
      <p class="desc">Every story here comes from something that actually happened in the league's matches.</p>
      <div class="row"><button id="nwAll" class="${fstate.mine ? '' : 'on'}">Whole league</button><button id="nwMine" class="${fstate.mine ? 'on' : ''}">My club</button></div></div>
      ${keys.length ? keys.map((r) => `<div class="card"><h2>After round ${r + 1}</h2>${rounds[r].map((n) => `<div class="hyp"><div class="hyp-head"><span class="lvl ${n.mine ? 'alevel' : 'gcse'}">${esc(n.kind)}</span> <b>${esc(n.headline)}</b></div><p class="note">${esc(n.body)}</p></div>`).join('')}</div>`).join('') : '<div class="card"><p class="note">No news yet. It appears after the first round of matches.</p></div>'}</div>`;
    host.querySelector('#nwAll').addEventListener('click', () => { fstate.mine = false; FM.renderNews(host, league); });
    host.querySelector('#nwMine').addEventListener('click', () => { fstate.mine = true; FM.renderNews(host, league); });
    void me;
  };
})();
