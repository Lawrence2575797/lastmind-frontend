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
    const sum = { goals: [], reds: [], injuries: [], potm: null, hat: [], drama: [], derby: null };
    const dby = FM.derbyForFixture ? FM.derbyForFixture(league, fx) : null; if (dby) sum.derby = dby.key;
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
        if (e.card === 'red' || e.card === 'second yellow') { add(team, p.number, -2); sum.reds.push({ t: Math.round(e.t / 60), team: team.id, n: p.number, name: p.name, second: e.card === 'second yellow', violent: !!e.drama && e.card === 'red' }); }
      } else if (e.type === 'drama') {
        sum.drama.push({ t: Math.round(e.t / 60), kind: e.kind, team: e.team, player: e.player != null ? e.player : null, vs: e.vs != null ? e.vs : null, vsTeam: e.vsTeam || null, outcome: e.outcome || null, teams: e.teams || null, both: !!e.both, names: { player: e.player != null && p ? p.name : null, vs: e.vs != null ? ((byNum(teamOf(e.vsTeam || e.team), e.vs) || {}).name || null) : null } });
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
    item.reporter = item.reporter || ({ Injury: 'Maya Cole', 'Player of the Match': 'Daniel Reed', Interview: 'Sofia Bennett', Preview: 'Owen Price' }[item.kind] || 'The LastMind Football desk');
    item.publication = item.publication || 'The Touchline';
    league.news.push(item);
  };

  // Where the club finished last season (the same for every game: see tools/gen_preseason.js), and what that asks of this one.
  FM.lastSeasonStory = function (league) {
    const L = FM.LAST_SEASON;
    if (!L || !L.table || league.seed !== FM.WORLD_SEED) return null;
    const me = L.table.find((r) => r.id === league.userId);
    if (!me) return null;
    const n = L.table.length, champion = L.table[0], third = L.table[2];
    const rec = me.W + ' win' + (me.W === 1 ? '' : 's') + ', ' + me.D + ' draw' + (me.D === 1 ? '' : 's') + ' and ' + me.L + ' defeat' + (me.L === 1 ? '' : 's');
    const goals = 'scoring ' + me.GF + ' and conceding ' + me.GA;
    const upper = me.pos <= Math.ceil(n * 3 / 8), top = me.pos <= Math.ceil(n / 2), bottom = me.pos > n - Math.ceil(n / 4), gap = champion.Pts - me.Pts;
    let headline, ask;
    if (me.pos === 1) { headline = 'Champions last season: can Ashford Rovers do it again?'; ask = 'The difficult part now is that every other club has spent the summer planning how to beat them. Repeating a title is harder than winning one, and the squad will have to find something new rather than rely on last year.'; }
    else if (upper) { headline = `Ashford Rovers finished ${ordinal(me.pos)} last season: can they go one better?`; ask = gap <= 4 ? `The gap to ${champion.name} at the top was ${gap} point${gap === 1 ? '' : 's'}, small enough that a handful of results turning would change the picture. The question this year is whether they can turn good into great.` : `${champion.name} finished ${gap} points clear at the top, so there is real ground to make up. A place near the top is a good base: the question this year is whether the team can close that gap.`; }
    else if (top) { headline = `Ashford Rovers finished ${ordinal(me.pos)} last season: a solid base to build on?`; ask = `Comfortably in the top half but ${third.Pts - me.Pts > 0 ? (third.Pts - me.Pts) + ' point' + (third.Pts - me.Pts === 1 ? '' : 's') + ' short of the top three' : 'level with the top three'}. The squad has shown it can compete; the next step is to do it more often.`; }
    else if (!bottom) { headline = `Ashford Rovers finished ${ordinal(me.pos)} last season: can they climb?`; ask = 'Mid-table is a comfortable place to sit and a hard one to leave. It will take a clearer plan, and better use of the chances the side already creates, to move up.'; }
    else { headline = `Ashford Rovers finished ${ordinal(me.pos)} last season: will they improve?`; ask = 'A difficult year, and the pressure on this season is real. The squad is the same, so any improvement has to come from how the team is set up and what is done with the ball.'; }
    return { headline, body: `Ashford Rovers ended last season in ${ordinal(me.pos)} place of ${n} with ${me.Pts} points: ${rec}, ${goals}. ${ask}` };
  };

  FM.ensurePreseasonNews = function (league) {
    ensurePreseasonBasics(league);
    ensureHistoryPack(league);
    // Where the club finished last season goes in after the others, so it is the newest story and is read first.
    if (!league.news.some((n) => n.lastSeason)) {
      const st = FM.lastSeasonStory(league);
      if (st) FM.pushNews(league, { round: -1, day: 0, preseason: true, lastSeason: true, kind: 'Season preview', headline: st.headline, body: st.body });
    }
  };

  // The history of the league, written up as the stories a league's papers would run before the season: the Iron Derby first, then a
  // short piece on each of the other clubs. (Newest is read first, so the derby is pushed last.)
  function ensureHistoryPack(league) {
    if (!FM.CLUB_HISTORY || league.news.some((n) => n.historyPack)) return;
    const me = FM.teamById(league, league.userId);
    const order = ['Harbour City', 'Kingsbridge Athletic', 'Westmoor Albion', 'Redcliffe Town', 'Stoneham Wanderers', 'Eastgate Rangers'];
    order.forEach((nm) => {
      const h = FM.CLUB_HISTORY[nm], t = league.teams.find((x) => x.name === nm);
      if (!h || !t) return;
      FM.pushNews(league, { round: -1, day: 0, preseason: true, historyPack: true, kind: 'Club history', publication: 'The Westhaven Post', club: t.id, headline: `${nm}: ${h.tagline.charAt(0).toLowerCase() + h.tagline.slice(1)}`, body: `${h.paras.join(' ')} ${h.board}` });
    });
    const d = FM.DERBIES[0], r = d.record;
    FM.pushNews(league, { round: -1, day: 0, preseason: true, historyPack: true, kind: 'Club history', publication: 'The Westhaven Post', club: league.teams.find((x) => x.name === 'Northfield United').id, headline: 'Northfield United: the ruthless neighbours', body: `${FM.CLUB_HISTORY['Northfield United'].paras.join(' ')} ${FM.CLUB_HISTORY['Northfield United'].board}` });
    FM.pushNews(league, { round: -1, day: 0, preseason: true, historyPack: true, kind: 'Derby', publication: 'The Westhaven Post', club: me.id, mine: true, headline: 'Judgement Day, the Theft of \'97: how a penalty split two towns', body: `${d.timeline[3].text} Northfield supporters celebrate the anniversary as Judgement Day. In Ashford they call it the Theft of '97, and in the thirty years since it has become the way the town measures every injustice.` });
    FM.pushNews(league, { round: -1, day: 0, preseason: true, historyPack: true, kind: 'Derby', publication: 'The Westhaven Post', club: me.id, mine: true, headline: `Ashford open the season with the Iron Derby: ${r.total} meetings, and neither town has forgiven the other`, body: `Ashford Rovers ${r.a}, Northfield United ${r.b}, ${r.d} drawn: that is the all-time record over ${r.total} meetings, and the new manager's first game is the next one, at the Foundry. ${d.line} ${d.today} ${d.aView} ${d.bView}` });
  }
  function ensurePreseasonBasics(league) {
    league.news = league.news || [];
    if (league.news.some((n) => n.preseason && !n.lastSeason)) return;
    const team = FM.teamById(league, league.userId), squad = team.squad.slice().sort((a, b) => FM.playerRating(b) - FM.playerRating(a)), featured = squad[0];
    FM.pushNews(league, { round: -1, day: 0, preseason: true, kind: 'Player profile', headline: `${featured.name}: the player at the heart of Ashford's new season`, body: `${featured.name}, Ashford Rovers' ${NOUN[featured.natural] || 'player'}, enters the season as one of the squad's key figures. His quality could shape how the side play when matches become tight.`, club: team.id, mine: true, reporter: 'Amelia Hart' });
    FM.pushNews(league, { round: -1, day: 0, preseason: true, kind: 'Season preview', headline: 'Ashford Rovers prepare for a season of new ideas', body: 'A new campaign begins with selection decisions, tactical experiments and a squad eager to establish its identity. The first fixtures should reveal which ideas are ready for competitive football.', club: team.id, mine: true, reporter: 'Daniel Reed' });
    FM.pushNews(league, { round: -1, day: 0, preseason: true, kind: 'Interview roundup', headline: 'Managers strike a careful tone before opening weekend', body: 'Across the league, managers have spoken about patience, preparation and the need to begin well. Confidence is growing, but nobody is giving much away before the first team sheets arrive.', club: null, mine: false, reporter: 'Sofia Bennett' });
  }

  FM.publishInterview = function (league, record, fx) {
    if (!record.answers.length) return;
    const team = FM.teamById(league, league.userId), opp = FM.teamById(league, fx.homeId === team.id ? fx.awayId : fx.homeId);
    const pre = record.kind === 'pre';
    const mood = record.answers.some((a) => a.mood === 'provocative') ? 'provocative' : record.answers.some((a) => a.mood === 'confident') ? 'confident' : 'measured';
    const lead = record.answers.find((a) => a.mood === mood) || record.answers[0];
    const follow = record.answers.find((a) => a !== lead && a.answer);
    const before = Number.isFinite(Number(record.opinionBefore)) ? Number(record.opinionBefore) : 50;
    const after = Number.isFinite(Number(record.opinionAfter)) ? Number(record.opinionAfter) : 50;
    const delta = after - before;
    const reaction = delta >= 3 ? 'The comments landed well with supporters.' : delta > 0 ? 'Supporters broadly welcomed the tone.' : delta <= -3 ? 'The remarks drew a sharp response from supporters.' : delta < 0 ? 'The comments divided opinion among supporters.' : 'The reaction from supporters was mixed.';
    const headline = mood === 'provocative'
      ? (pre ? `${team.name} manager fires warning at ${opp.name}` : `${team.name} manager sparks reaction after ${opp.name}`)
      : mood === 'confident'
        ? (pre ? `${team.name} manager backs his side to beat ${opp.name}` : `${team.name} manager strikes defiant note after ${opp.name}`)
        : (pre ? `${team.name} manager keeps calm before ${opp.name}` : `${team.name} manager gives measured verdict after ${opp.name}`);
    const secondQuote = follow ? ` The manager later added: “${follow.answer}”` : '';
    FM.pushNews(league, { round: record.round, day: record.day, kind: 'Interview', headline, body: `“${lead.answer}”${secondQuote} ${reaction} Public opinion now stands at ${Math.round(after)}%.`, club: team.id, mine: true, reporter: 'Sofia Bennett', interviewMood: mood });
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
    const rng = FM.mulberry32(league.seed + (league.runSeed || 0) + round * 131 + 17);
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
    fxs.forEach((f) => (f.summary ? f.summary.reds.filter((r) => !r.violent) : []).forEach((r) => push('Red card', `${r.name} sent off for ${name(r.team)}`, `${name(f.homeId)} ${f.hg}-${f.ag} ${name(f.awayId)}. ${r.name} was shown ${r.second ? 'a second yellow card' : 'a straight red'} in the ${r.t}th minute and ${name(r.team)} played on with ten.`, r.team)));


    // ---- the history of the league, told through what happened ----
    const mgr = (id) => (id === me ? 'the manager' : ((FM.CLUB_HISTORY[name(id)] || {}).manager || 'the manager'));
    fxs.forEach((f) => {
      const dby = f.summary && f.summary.derby ? FM.DERBIES.find((d) => d.key === f.summary.derby) : (FM.derbyForFixture ? FM.derbyForFixture(league, f) : null);
      if (!dby) return;
      const home = name(f.homeId), away = name(f.awayId), res = `${home} ${f.hg}-${f.ag} ${away}`;
      const winner = f.hg > f.ag ? f.homeId : f.hg < f.ag ? f.awayId : null;
      const isA = (id) => name(id) === dby.a;
      const rec = FM.derbyRecord ? FM.derbyRecord(league, dby) : null;
      const sum = f.summary || {};
      const bits = [];
      (sum.reds || []).forEach((r) => bits.push(`${r.name} (${name(r.team)}) was sent off on ${r.t} minutes${r.violent ? ' for violent conduct' : ''}`));
      (sum.drama || []).forEach((dr) => {
        if (dr.kind === 'managers') bits.push(dr.both ? 'the two managers had to be separated on the touchline and both were sent to the stands' : `${mgr(dr.team)} was sent to the stands after a touchline row`);
        else if (dr.kind === 'penalty') bits.push(`a contentious penalty was awarded to ${name(dr.team)} on ${dr.t} minutes`);
        else if (dr.kind === 'invader') bits.push('a supporter got onto the pitch and held up play');
        else if (dr.kind === 'scuffle') bits.push(`players squared up after a late challenge by ${dr.names && dr.names.player ? dr.names.player : 'a defender'} on ${dr.t} minutes`);
      });
      const drama = bits.length ? ` ${bits.map((b, i) => (i === 0 ? b.charAt(0).toUpperCase() + b.slice(1) : b)).join('; ')}.` : '';
      let head, body;
      if (dby.key === 'iron') {
        const aWon = winner && isA(winner), bWon = winner && !isA(winner);
        head = aWon ? pick(['Ashford win the Iron Derby', 'The Foundry erupts: Ashford beat Northfield', 'Ashford beat Northfield and a town breathes out']) : bWon ? pick(['Northfield win the Iron Derby again', 'Northfield silence the Foundry', 'Another Iron Derby goes to Northfield']) : pick(['The Iron Derby ends level, and nobody is happy', 'Ashford and Northfield cannot be separated']);
        const rs = rec ? ` The all-time record now reads Ashford ${rec.a}, Northfield ${rec.b}, ${rec.d} drawn, over ${rec.total} meetings.` : '';
        const mood = FM.derbyMood(dby, bWon ? 'b' : 'a', aWon || bWon ? 'win' : 'draw');
        const echo = (f.homeId && sum.reds && sum.reds.length >= 2) ? ' It was the kind of afternoon the fixture is remembered for.' : '';
        body = `${res}. ${mood}${rs}${drama}${echo}`;
        // what it does to the table talk
        if (winner) body += ` ${isA(winner) ? 'In Ashford they will be talking about the 1997 penalty for some time, and for once not as an open wound.' : 'In Millbank the song about the Theft of \'97 will be sung in the pubs tonight.'}`;
      } else {
        const wn = winner ? name(winner) : null;
        head = wn ? `${dby.name}: ${wn} come out on top` : `${dby.name} ends level`;
        body = `${res}. ${dby.line}${drama}`;
      }
      const involvesMe = f.homeId === me || f.awayId === me;
      push('Derby', head, body, involvesMe ? me : (winner || f.homeId));
      if (involvesMe) items[items.length - 1].mine = true;
    });
    // incidents get a story of their own in the user's match, and in any other that had one
    fxs.forEach((f) => {
      const sum = f.summary; if (!sum || !sum.drama) return;
      const involvesMe = f.homeId === me || f.awayId === me;
      sum.drama.filter((dr) => dr.kind === 'managers').forEach((dr) => {
        const tn = (dr.teams || [dr.team]).map((id) => name(id));
        push('Touchline', dr.both ? `Managers sent to the stands as ${name(f.homeId)} v ${name(f.awayId)} boils over` : `${tn[0]} manager sent to the stands`, `${name(f.homeId)} ${f.hg}-${f.ag} ${name(f.awayId)}. ${dr.both ? 'Both benches were on their feet and the fourth official had to step between the two managers; both were sent to the stands.' : `${mgr(dr.team)} was sent to the stands after a heated exchange with the fourth official and could not make changes for ten minutes.`}`, involvesMe ? me : dr.team);
      });
      sum.drama.filter((dr) => dr.kind === 'scuffle').forEach((dr) => {
        const p1 = dr.names && dr.names.player, p2 = dr.names && dr.names.vs;
        push('Red card', `${p1 || 'A defender'} and ${p2 || 'an opponent'} squared up: ${dr.outcome === 'both' ? 'both sent off' : dr.outcome === 'aggressor' ? 'one sent off' : 'both booked'}`, `${name(f.homeId)} ${f.hg}-${f.ag} ${name(f.awayId)}. A late challenge by ${p1 || 'a defender'} on ${p2 || 'an opponent'} brought players from both sides running in. ${dr.outcome === 'both' ? 'The referee sent both players off for violent conduct, and each will miss the next two matches.' : dr.outcome === 'aggressor' ? `${p1 || 'The defender'} was sent off and ${p2 || 'his opponent'} was booked.` : 'Both players were booked and the free kick was given.'}`, involvesMe ? me : dr.team);
      });
    });
    // bragging rights: where the Iron Derby clubs stand in the table
    if (round >= 3 && round % 3 === 0) {
      const tbl2 = FM.tableRows(league), ia = tbl2.findIndex((r) => r.name === 'Ashford Rovers'), ib = tbl2.findIndex((r) => r.name === 'Northfield United');
      if (ia >= 0 && ib >= 0) push('Derby', ia < ib ? 'Ashford above Northfield: the table that matters most in the town' : 'Northfield ahead of Ashford in the table: nobody at the Foundry wants to look', `${ia < ib ? 'Ashford Rovers' : 'Northfield United'} sit ${ordinal((ia < ib ? ia : ib) + 1)}, ${ia < ib ? 'Northfield United' : 'Ashford Rovers'} ${ordinal((ia < ib ? ib : ia) + 1)}. For both clubs, finishing above the other is almost as important as the title: the second meeting is at Millbank later in the season.`, me);
    }

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
    // the bottom of the table
    const tbl = FM.tableRows(league), bottom = tbl.slice(-2), me2 = league.userId;
    const mineBottom = bottom.some((b) => b.id === me2) ? me2 : null;
    if (round === 13) {
      push('Champions', `${tbl[0].name} are champions`, `${tbl[0].name} finish top of the table on ${tbl[0].pts} points, ${tbl[0].pts - tbl[1].pts} clear of ${tbl[1].name}.`, tbl[0].id);
      push('Relegation', `${bottom[0].name} and ${bottom[1].name} are relegated`, `${bottom[0].name} (${bottom[0].pts} points) and ${bottom[1].name} (${bottom[1].pts}) finish in the bottom two and go down.`, mineBottom);
    } else if (round >= 5 && round % 3 === 2) {
      const gap = tbl[5].pts - tbl[6].pts;
      push('Relegation', `${bottom[1].name} and ${bottom[0].name} in the relegation zone`, `${bottom[1].name} (${bottom[1].pts} points) and ${bottom[0].name} (${bottom[0].pts}) occupy the bottom two places, ${gap > 0 ? gap + ' point' + (gap > 1 ? 's' : '') + ' from safety' : 'level on points with the club above them'}.`, mineBottom);
    }
    items.forEach((it) => FM.pushNews(league, it));
    return items.length;
  };

  // ---------- the page ----------
  const fstate = { mine: false };
  FM.renderNews = function (host, league) {
    FM.ensurePreseasonNews(league);
    const all = (league.news || []).slice().reverse(), me = league.userId;
    const list = fstate.mine ? all.filter((n) => n.mine) : all;
    const rounds = {}; list.forEach((n) => { (rounds[n.round] = rounds[n.round] || []).push(n); });
    const keys = Object.keys(rounds).map(Number).sort((a, b) => b - a);
    host.innerHTML = `<div style="display:grid;gap:16px"><div class="card"><h2>News</h2>
      <p class="desc">Stories from the league, the training ground and the press room.</p>
      <div class="row"><button id="nwAll" class="${fstate.mine ? '' : 'on'}">Whole league</button><button id="nwMine" class="${fstate.mine ? 'on' : ''}">My club</button></div></div>
      ${keys.length ? keys.map((r) => `<div class="card"><h2>${r < 0 ? 'Pre-season' : 'After round ' + (r + 1)}</h2>${rounds[r].map((n) => `<article class="hyp news-story"><div class="hyp-head"><span class="lvl ${n.mine ? 'alevel' : 'gcse'}">${esc(n.kind)}</span> <b>${esc(n.headline)}</b></div><p class="note news-byline">${esc(n.reporter || 'The LastMind Football desk')} · ${esc(n.publication || 'The Touchline')}</p><p class="desc">${esc(n.body)}</p></article>`).join('')}</div>`).join('') : '<div class="card"><p class="note">No stories yet.</p></div>'}</div>`;
    host.querySelector('#nwAll').addEventListener('click', () => { fstate.mine = false; FM.renderNews(host, league); });
    host.querySelector('#nwMine').addEventListener('click', () => { fstate.mine = true; FM.renderNews(host, league); });
    void me;
  };
})();
