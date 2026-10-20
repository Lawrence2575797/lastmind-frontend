// The data layer for the Workbench: everything the simulation recorded, laid out as plain tables (one row per thing, one column per fact),
// each column described in words. The Workbench's data drawer shows these, the statistics toolkit fits models to them, and the LastMind AI
// Agent is told only the schema (names, meanings, row counts) and asks for numbers by naming tables and columns, never by inventing them.
//
// Tables:  team_matches (every league match, both clubs), shots, passes, tackles, dribbles, possessions, recoveries (your own matches' detailed
// logs), players (every squad), league_table.  Positions in the event tables are from the point of view of the team doing the thing:
// depth 0 = their own goal line, 1 = the goal they attack; width 0 to 1 across the pitch.
(function () {
  const FM = (window.FM = window.FM || {});
  const T = (FM.tables = {});
  const r2 = (v) => Math.round(v * 100) / 100;
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const num = (name, desc) => ({ name, type: 'num', desc });
  const cat = (name, desc) => ({ name, type: 'cat', desc });

  const SCHEMA = {
    team_matches: {
      desc: 'One row per club per league match played this season (so two rows for every match). Includes the other clubs, not just yours.',
      cols: [
        cat('match', 'match id'), num('round', 'matchday number (1 to 14)'), cat('team', 'the club this row describes'), cat('opponent', 'the club they played'),
        num('you', '1 if the club is yours'), num('home', '1 if played at home'), num('gf', 'goals scored'), num('ga', 'goals conceded'), num('gd', 'goal difference (gf minus ga)'),
        num('points', 'points won (3, 1 or 0)'), num('win', '1 if won'), cat('formation', 'formation used'),
        num('shots', 'shots taken'), num('on_target', 'shots on target'), num('xg', 'expected goals created (sum of chance quality)'), num('xga', 'expected goals conceded'),
        num('shots_against', 'shots faced'), num('xg_diff', 'xg minus xga'), num('possession', 'share of the ball in %'),
        num('passes', 'passes attempted'), num('pass_acc', 'share of passes completed in %'), num('tackles', 'tackles attempted'), num('tackle_win', 'share of tackles won in %'),
        num('dribbles', 'dribbles attempted'), num('dribble_win', 'share of dribbles that came off in %'), num('fouls', 'fouls committed'), num('yellows', 'yellow cards'), num('reds', 'red cards'),
        num('corners', 'corners won'), num('offsides', 'times caught offside'),
        num('press', 'pressing setting, 0 (sit off) to 1 (press hard)'), num('line_height', 'defensive line height, 0 (deep) to 1 (high)'), num('tempo', 'tempo setting, 0 to 1'),
        num('directness', 'how direct the passing is, 0 (short) to 1 (long)'), num('risk', 'risk in possession, 0 to 1'), num('press_buildup', 'how hard they press the opposition build-up, 0 to 1'),
        num('counter_press', 'counter-press setting, 0 to 1'), num('tackle_aggression', 'how hard they tackle, 0 to 1'), num('shoot_freedom', 'freedom to shoot, 0 to 1'),
      ],
    },
    shots: {
      desc: 'Every shot in your own matches, with the chance quality (xg) and what happened.',
      cols: [cat('match', 'match id'), num('round', 'matchday'), num('minute', 'minute of the match'), cat('team', 'club that shot'), num('you', '1 if your club'), cat('player', 'shooter'),
        num('xg', 'chance quality, the probability of a goal'), cat('outcome', 'goal, saved, blocked or off'), num('goal', '1 if a goal'), num('on_target', '1 if goal or saved'),
        num('depth', 'how far up the pitch, 0 to 1'), num('width', 'across the pitch, 0 to 1'), num('distance', 'metres from the centre of the goal'), num('defender_distance', 'metres to the nearest defender'),
        cat('kind', 'open play, header, freekick or penalty'), num('move_passes', 'passes in the move before the shot')],
    },
    passes: {
      desc: 'Every pass in your own matches.',
      cols: [cat('match', 'match id'), num('round', 'matchday'), num('minute', 'minute'), cat('team', 'club that passed'), num('you', '1 if your club'), cat('from', 'passer'), cat('to', 'intended receiver'),
        num('completed', '1 if it reached a team-mate'), num('offside', '1 if flagged offside'), num('depth', 'start depth, 0 to 1'), num('width', 'start width, 0 to 1'), num('end_depth', 'where it was aimed, depth'),
        num('end_width', 'where it was aimed, width'), num('length', 'metres'), num('progress', 'metres gained towards goal (negative = backwards)'), num('forward', '1 if it gained at least 5 m'),
        num('lane_clear', 'metres of room round the passing lane'), num('pressure', 'metres to the nearest opponent at the receiver'), num('p_complete', 'the chance the pass was set to have, 0 to 1')],
    },
    tackles: {
      desc: 'Every tackle in your own matches.',
      cols: [cat('match', 'match id'), num('round', 'matchday'), num('minute', 'minute'), cat('team', 'club that tackled'), num('you', '1 if your club'), cat('player', 'tackler'), cat('against', 'player tackled'),
        num('won', '1 if the ball was won'), num('depth', 'where on the pitch for the tackler, 0 to 1'), num('width', 'across, 0 to 1')],
    },
    dribbles: {
      desc: 'Every dribble in your own matches.',
      cols: [cat('match', 'match id'), num('round', 'matchday'), num('minute', 'minute'), cat('team', 'club'), num('you', '1 if your club'), cat('player', 'dribbler'), num('won', '1 if the dribble came off'),
        num('depth', 'depth, 0 to 1'), num('width', 'width, 0 to 1'), num('defender_distance', 'metres to the nearest defender'), num('p_success', 'chance of success the game set, 0 to 1')],
    },
    possessions: {
      desc: 'Each spell of possession in your own matches, from winning the ball to losing it or shooting.',
      cols: [cat('match', 'match id'), num('round', 'matchday'), cat('team', 'club in possession'), num('you', '1 if your club'), num('minute', 'minute it began'), num('start_depth', 'depth where it began, 0 to 1'),
        cat('how', 'how the possession began'), num('passes', 'passes in the spell'), num('max_depth', 'the furthest up the pitch it reached, 0 to 1'), num('end_depth', 'depth where it ended, 0 to 1'), num('seconds', 'how long it lasted'),
        num('shot', '1 if it ended with a shot'), num('goal', '1 if it ended with a goal'), num('final_third', '1 if it reached the final third')],
    },
    recoveries: {
      desc: 'Every time a club won the ball back in your own matches, and how quickly after losing it.',
      cols: [cat('match', 'match id'), num('round', 'matchday'), cat('team', 'club that won it back'), num('you', '1 if your club'), num('minute', 'minute'), num('depth', 'where, 0 to 1 (for the club that won it)'),
        num('width', 'where across, 0 to 1'), num('seconds_after_loss', 'seconds since that club lost it (60 = the cap)'), num('high', '1 if won in the opposition half'), num('counter_press', '1 if within 6 seconds of losing it')],
    },
    players: {
      desc: 'Every squad player, with ratings and season totals.',
      cols: [cat('player', 'name'), cat('team', 'club'), num('you', '1 if in your squad'), num('number', 'shirt number'), cat('position', 'natural position'), cat('group', 'GK, DEF, MID or FWD'), num('height', 'cm'),
        num('pace', 'rating 0-100'), num('dribbling', 'rating'), num('passing', 'rating'), num('finishing', 'rating'), num('tackling', 'rating'), num('composure', 'rating'), num('heading', 'rating'), num('stamina', 'rating'),
        num('keeping', 'goalkeeping rating'), num('age', 'age in years'), num('value', 'transfer value in £ million'), num('apps', 'appearances'), num('goals', 'goals'), num('shots', 'shots'), num('yellows', 'yellow cards'), num('reds', 'red cards'), num('condition', 'condition now, % (100 = fully fresh)'), num('injury_risk', 'chance of an injury in a match at the club\'s current style and his condition, %')],
    },
    injuries: {
      desc: 'Your own injured players right now: what is wrong, how long is left, and what each kind of treatment would cost and save. Without treatment every injury simply heals in its own time.',
      cols: [cat('player', 'name'), cat('injury', 'what the injury is'), num('days_left', 'days until he is fit'), num('matches_out', 'matches he is expected to miss'), cat('treatment', 'treatment already paid for, if any'),
        num('physio_cost', '£ for extra physiotherapy (about 15% quicker)'), num('physio_days', 'days left with physiotherapy'), num('specialist_cost', '£ for specialist treatment (about 30% quicker)'), num('specialist_days', 'days left with specialist treatment'),
        num('accelerated_cost', '£ for an accelerated return (about half the time, but more chance of a relapse)'), num('accelerated_days', 'days left with an accelerated return'), num('condition', 'his condition now, % (100 = fully fresh)')],
    },
    injury_log: {
      desc: 'Every injury your players have picked up, with the matchday, how long it was expected to last and whether it was treated.',
      cols: [num('season', 'season'), num('round', 'matchday the injury was logged after'), cat('player', 'name'), cat('injury', 'what it was'), num('days', 'days expected out when it happened'), num('matches', 'matches expected to miss'), cat('treated', 'treatment, if any')],
    },
    finances: {
      desc: 'The club\'s books, one row per matchday of yours (home and away): income and costs by category, profit and the bank balance afterwards.',
      cols: [num('season', 'season'), num('round', 'matchday'), num('home', '1 if a home match'), cat('opponent', 'opponent'), num('attendance', 'crowd (home matches)'), num('capacity', 'ground capacity'), num('turned_away', 'fans who wanted to come but could not'),
        num('tickets', 'ticket income £'), num('matchday_spend', 'food, drink and programmes income £'), num('broadcast', 'broadcasting income £'), num('sponsor', 'sponsorship income £'), num('advert', 'advertising board income £'), num('merch', 'merchandise income £'), num('prize', 'prize money £'),
        num('revenue', 'total revenue £'), num('wages', 'wages £'), num('marketing', 'marketing £'), num('running', 'matchday running costs £'), num('admin', 'stadium, administration and custom spending £'), num('interest', 'interest £'), num('profit_before_tax', 'profit before tax £'), num('net_profit', 'profit after tax £'), num('cash', 'bank balance after the matchday £')],
    },
    stands: {
      desc: 'Ticket sales by stand at each of your home matches: the price, the seats, how many sold and the income. Use it to see how each kind of fan reacts to price.',
      cols: [num('season', 'season'), num('round', 'matchday'), cat('opponent', 'opponent'), cat('stand', 'stand'), num('price', 'ticket price £'), num('sold', 'tickets sold'), num('income', 'ticket income £')],
    },
    levers: {
      desc: 'Custom spending you have set up (see Controls): what it costs and what it does.',
      cols: [cat('name', 'what it is'), num('per_matchday', '£ spent a matchday'), num('matchdays_left', 'matchdays still to run'), cat('effects', 'what it changes'), cat('by', 'who set it up')],
    },
    rules: {
      desc: 'Rules you have set up that run by themselves after each matchday.',
      cols: [cat('name', 'name'), cat('when', 'the condition'), cat('then', 'what it does'), num('times_run', 'how many times it has run')],
    },
    league_table: {
      desc: 'The league table as it stands.',
      cols: [num('position', 'place in the table'), cat('team', 'club'), num('you', '1 if your club'), num('played', 'matches played'), num('won', 'wins'), num('drawn', 'draws'), num('lost', 'defeats'),
        num('gf', 'goals for'), num('ga', 'goals against'), num('gd', 'goal difference'), num('points', 'points')],
    },
  };
  T.SCHEMA = SCHEMA;

  // ---------- building the rows ----------

  function build(league) {
    const L = FM.PITCH.L, W = FM.PITCH.W, goalY = W / 2;
    const out = {}; Object.keys(SCHEMA).forEach((k) => { out[k] = []; });
    const nameOf = (id) => (FM.teamById(league, id) || {}).name || id;
    const played = league.fixtures.filter((f) => f.played && !f.friendly && f.stats).sort((a, b) => a.round - b.round);

    played.forEach((fx) => {
      [[fx.homeId, fx.awayId, 1, fx.hg, fx.ag], [fx.awayId, fx.homeId, 0, fx.ag, fx.hg]].forEach(([tid, oid, home, gf, ga]) => {
        const s = fx.stats[tid], o = fx.stats[oid]; if (!s || !o) return;
        const tot = (s.possession + o.possession) || 1, tc = s.tactics || {};
        out.team_matches.push({
          match: fx.id, round: fx.round + 1, team: nameOf(tid), opponent: nameOf(oid), you: tid === league.userId ? 1 : 0, home, gf, ga, gd: gf - ga,
          points: gf > ga ? 3 : gf === ga ? 1 : 0, win: gf > ga ? 1 : 0, formation: s.formation || '',
          shots: s.shots, on_target: s.onTarget, xg: r2(s.xg), xga: r2(o.xg), shots_against: o.shots, xg_diff: r2(s.xg - o.xg), possession: r2(100 * s.possession / tot),
          passes: s.passes, pass_acc: s.passes ? r2(100 * s.passesOk / s.passes) : 0, tackles: s.tackles, tackle_win: s.tackles ? r2(100 * s.tacklesWon / s.tackles) : 0,
          dribbles: s.dribbles, dribble_win: s.dribbles ? r2(100 * s.dribblesWon / s.dribbles) : 0, fouls: s.fouls, yellows: s.yellows, reds: s.reds, corners: s.corners, offsides: s.offsides,
          press: r3(tc.pressing || 0), line_height: r3(tc.lineHeight || 0), tempo: r3(tc.tempo || 0), directness: r3(tc.directness || 0), risk: r3(tc.risk || 0), press_buildup: r3(tc.pressBuildUp || 0),
          counter_press: r3(tc.counterPress || 0), tackle_aggression: r3(tc.tackleAggression || 0), shoot_freedom: r3(tc.shootFreedom || 0),
        });
      });
      if (!fx.log) return;
      // The detailed log. The home side is kept attacking to the right, so for the away side the pitch is turned round.
      const log = fx.log, ids = [fx.homeId, fx.awayId];
      const nm = (side, shirt) => {
        const t = FM.teamById(league, ids[side]); const p = t && t.squad.find((q) => q.number === shirt);
        return p ? p.name : '#' + shirt;
      };
      const tname = (side) => nameOf(ids[side]), you = (side) => (ids[side] === league.userId ? 1 : 0);
      const dp = (side, x) => (side === 0 ? x / L : 1 - x / L), wd = (side, y) => (side === 0 ? y / W : 1 - y / W);
      const base = { match: fx.id, round: fx.round + 1 };
      log.passes.forEach((p) => {
        const side = p[1], d0 = dp(side, p[5]), hasEnd = p[11] >= 0, d1 = hasEnd ? dp(side, p[11]) : null;
        const prog = hasEnd ? (d1 - d0) * L : null;
        out.passes.push(Object.assign({}, base, { minute: r2(p[0] / 60), team: tname(side), you: you(side), from: nm(side, p[2]), to: p[3] >= 0 ? nm(side, p[3]) : '', completed: p[4] === 1 ? 1 : 0, offside: p[4] === 2 ? 1 : 0,
          depth: r3(d0), width: r3(wd(side, p[6])), end_depth: hasEnd ? r3(d1) : null, end_width: hasEnd ? r3(wd(side, p[12])) : null, length: p[7], progress: prog == null ? null : r2(prog), forward: prog == null ? null : prog >= 5 ? 1 : 0,
          lane_clear: p[8], pressure: p[9], p_complete: p[10] }));
      });
      log.tackles.forEach((q) => {
        const side = q[1];
        out.tackles.push(Object.assign({}, base, { minute: r2(q[0] / 60), team: tname(side), you: you(side), player: nm(side, q[2]), against: nm(1 - side, q[3]), won: q[4], depth: r3(dp(side, q[5])), width: r3(wd(side, q[6])) }));
      });
      log.dribbles.forEach((q) => {
        const side = q[1];
        out.dribbles.push(Object.assign({}, base, { minute: r2(q[0] / 60), team: tname(side), you: you(side), player: nm(side, q[2]), won: q[3], depth: r3(dp(side, q[4])), width: r3(wd(side, q[5])), defender_distance: q[6], p_success: q[7] }));
      });
      (log.other || []).filter((e) => e.type === 'shot').forEach((e) => {
        const side = e.team === ids[0] ? 0 : 1, d = dp(side, e.x), dx = (1 - d) * L, dy = (wd(side, e.y) - 0.5) * W;
        out.shots.push(Object.assign({}, base, { minute: r2(e.t / 60), team: tname(side), you: you(side), player: nm(side, e.player), xg: e.xg, outcome: e.outcome, goal: e.outcome === 'goal' ? 1 : 0,
          on_target: e.outcome === 'goal' || e.outcome === 'saved' ? 1 : 0, depth: r3(d), width: r3(wd(side, e.y)), distance: r2(Math.hypot(dx, dy)), defender_distance: e.defDist, kind: e.setPiece || 'open play', move_passes: e.movePasses || 0 }));
      });
      const xr = log.xr;
      if (xr) {
        const HOW = ['loose ball', 'tackle', 'interception', 'keeper save', 'restart'];
        (xr.seq || []).forEach((q) => {
          const side = q[0];
          out.possessions.push(Object.assign({}, base, { team: tname(side), you: you(side), minute: r2(q[1] / 60), start_depth: r3(q[2]), how: typeof q[3] === 'string' ? q[3] : HOW[q[3]] || String(q[3]), passes: q[4], max_depth: r3(q[5]), end_depth: q[8] == null || q[8] < 0 ? null : q[8],
            seconds: q[7], shot: q[6] >= 1 ? 1 : 0, goal: q[6] === 2 ? 1 : 0, final_third: q[5] > 0.66 ? 1 : 0 }));
        });
        (xr.recov || []).forEach((q) => {
          const side = q[0];
          out.recoveries.push(Object.assign({}, base, { team: tname(side), you: you(side), minute: r2(q[1] / 60), depth: r3(q[2]), width: r3(q[3]), seconds_after_loss: q[4] < 0 ? null : q[4], high: q[2] > 0.5 ? 1 : 0, counter_press: q[4] >= 0 && q[4] <= 6 ? 1 : 0 }));
        });
      }
    });

    league.teams.forEach((t) => t.squad.forEach((p) => {
      const r = p.ratings || {};
      out.players.push({ player: p.name, team: t.name, you: t.id === league.userId ? 1 : 0, number: p.number, position: p.natural, group: p.group, height: p.height, pace: r.pace, dribbling: r.dribbling, passing: r.passing,
        finishing: r.finishing, tackling: r.tackling, composure: r.composure, heading: r.heading, stamina: r.stamina, keeping: r.gk, age: FM.ageOf ? FM.ageOf(p) : null, value: FM.valueOf ? r2(FM.valueOf(p)) : null,
        apps: (p.stats || {}).apps || 0, goals: (p.stats || {}).goals || 0, shots: (p.stats || {}).shots || 0, yellows: (p.stats || {}).yellows || 0, reds: (p.stats || {}).reds || 0,
        condition: FM.conditionOf ? Math.round(100 * FM.conditionOf(p)) : null, injury_risk: FM.injuryHazard ? r2(100 * (1 - Math.exp(-FM.injuryHazard(Object.assign({}, p, { energy: FM.conditionOf(p) }), t) * 5400))) : null });
    }));
    buildClub(league, out);
    FM.tableRows(league).forEach((r, i) => out.league_table.push({ position: i + 1, team: r.name, you: r.id === league.userId ? 1 : 0, played: r.p, won: r.w, drawn: r.d, lost: r.l, gf: r.gf, ga: r.ga, gd: r.gf - r.ga, points: r.pts }));
    return out;
  }

  // The club's own books, medical room and custom spending.
  function buildClub(league, out) {
    const lg = league;
    try {
      const b = lg.biz && lg.biz.v === 1 ? lg.biz : null;
      if (b) {
        b.ledger.forEach((e) => {
          const o = e.outflow || {}, i = e.inflow || {};
          out.finances.push({ season: e.season, round: e.round, home: e.home ? 1 : 0, opponent: e.opp, attendance: e.home ? e.attTotal : null, capacity: e.home ? e.capacity : null, turned_away: e.home ? e.away : null,
            tickets: Math.round(i.tickets || 0), matchday_spend: Math.round(i.matchday || 0), broadcast: Math.round(i.broadcast || 0), sponsor: Math.round(i.sponsor || 0), advert: Math.round(i.advert || 0), merch: Math.round(i.merch || 0), prize: Math.round(i.prize || 0),
            revenue: Math.round(e.pl.revenue), wages: Math.round(o.wages || 0), marketing: Math.round(o.marketing || 0), running: Math.round(o.matchday || 0), admin: Math.round(o.admin || 0), interest: Math.round(o.interest || 0), profit_before_tax: Math.round(e.pl.pbt), net_profit: Math.round(e.pl.net), cash: Math.round(e.closing) });
          if (e.home && e.att && e.prices) Object.keys(e.att).forEach((k) => { const sg = (FM.SEGMENTS || []).find((s) => s.id === k); out.stands.push({ season: e.season, round: e.round, opponent: e.opp, stand: sg ? sg.name : k, price: e.prices[k], sold: e.att[k], income: Math.round(e.att[k] * e.prices[k]) }); });
        });
        (b.levers || []).forEach((l) => { out.levers.push({ name: l.name, per_matchday: l.perRound, matchdays_left: Math.max(0, l.left), effects: (l.effects || []).map((x) => (x.pct > 0 ? '+' : '') + x.pct + '% ' + x.target).join(', '), by: l.by || 'manual' }); });
        (b.rules || []).forEach((r) => { out.rules.push({ name: r.name, when: r.when.metric + ' ' + r.when.op + ' ' + r.when.value, then: r.do.action + ' ' + JSON.stringify(r.do.params || {}), times_run: r.fired || 0 }); });
      }
      if (FM.controls) FM.controls.injuries(lg).forEach((i) => { const t = lg.teams.find((x) => x.id === lg.userId), pl = t.squad.find((p) => p.id === i.id);
        out.injuries.push({ player: i.name, injury: i.injury, days_left: i.days, matches_out: i.matches, treatment: i.treatment || '', physio_cost: i.plans.physio.cost, physio_days: i.plans.physio.daysAfter, specialist_cost: i.plans.specialist.cost, specialist_days: i.plans.specialist.daysAfter, accelerated_cost: i.plans.accelerated.cost, accelerated_days: i.plans.accelerated.daysAfter, condition: pl && FM.conditionOf ? Math.round(100 * FM.conditionOf(pl)) : null }); });
      (lg.injuryLog || []).forEach((x) => out.injury_log.push(x));
    } catch (e) { /* the rest of the data is still good */ }
  }

  let cache = null;
  const stamp = (league) => [league.seed, league.season, league.userId, league.fixtures.filter((f) => f.played).length, league.fixtures.filter((f) => f.played && f.log).length, league.teams.reduce((a, t) => a + t.squad.length, 0), league.day, league.biz && league.biz.ledger ? league.biz.ledger.length : 0, (league.biz && league.biz.levers ? league.biz.levers.length : 0) + ':' + (league.biz && league.biz.rules ? league.biz.rules.length : 0), (league.injuryLog || []).length, league.teams.reduce((a, t) => a + t.squad.reduce((s2, p) => s2 + (p.injury ? p.injury.until + (p.injury.treatment ? 1 : 0) : 0), 0), 0)].join('|');
  // Everything, built once and kept until another match has been played.
  T.all = function (league) {
    const st = stamp(league);
    if (!cache || cache.st !== st) cache = { st, data: build(league) };
    Object.keys(extra).forEach((k) => { cache.data[k] = extra[k].rows; });   // tables made by experiments sit beside the recorded ones
    return cache.data;
  };
  // Tables the Workbench makes itself (the rows of a simulated experiment). They are kept with the Workbench document and can be analysed like any other table.
  const extra = {};
  T.register = function (name, desc, cols, rows) { SCHEMA[name] = { desc, cols, extra: true }; extra[name] = { rows }; };
  T.extraTables = () => Object.keys(extra).map((k) => ({ name: k, desc: SCHEMA[k].desc, cols: SCHEMA[k].cols, rows: extra[k].rows }));
  T.num = num; T.cat = cat;
  T.get = function (league, name) { return T.all(league)[name] || null; };

  // What the agent and the data drawer are told: names, meanings and how many rows each table holds. No values.
  T.describe = function (league) {
    const all = T.all(league);
    return Object.keys(SCHEMA).map((k) => ({ table: k, rows: all[k].length, desc: SCHEMA[k].desc, columns: SCHEMA[k].cols.map((c) => ({ name: c.name, type: c.type, desc: c.desc })) }));
  };
  T.digest = function (league) {
    return T.describe(league).map((t) => t.table + ' (' + t.rows + ' rows): ' + t.desc + '\n  ' + t.columns.map((c) => c.name + (c.type === 'cat' ? ' [category]' : '') + ' = ' + c.desc).join('\n  ')).join('\n\n');
  };

  // ---------- a small, safe query: filter, group, summarise ----------
  // spec = { table, where: [{col, op, value}], group: ['col'], agg: [{fn, col, as}], order: {col, dir}, limit, cols: [...] }
  const OPS = {
    '=': (a, b) => a === b || (typeof a === 'number' && a === Number(b)), '!=': (a, b) => !(a === b || (typeof a === 'number' && a === Number(b))), '>': (a, b) => a > b, '>=': (a, b) => a >= b, '<': (a, b) => a < b, '<=': (a, b) => a <= b,
    in: (a, b) => Array.isArray(b) && b.indexOf(a) >= 0, contains: (a, b) => String(a).toLowerCase().indexOf(String(b).toLowerCase()) >= 0,
  };
  const AGG = {
    count: (v) => v.length, sum: (v) => v.reduce((a, b) => a + b, 0), mean: (v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null),
    min: (v) => (v.length ? Math.min.apply(null, v) : null), max: (v) => (v.length ? Math.max.apply(null, v) : null),
    median: (v) => { if (!v.length) return null; const s = v.slice().sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; },
    sd: (v) => { if (v.length < 2) return null; const m = v.reduce((a, b) => a + b, 0) / v.length; return Math.sqrt(v.reduce((a, b) => a + (b - m) * (b - m), 0) / (v.length - 1)); },
  };
  T.query = function (league, spec) {
    const sch = SCHEMA[spec.table]; if (!sch) return { error: 'No table called "' + spec.table + '". Tables: ' + Object.keys(SCHEMA).join(', ') + '.' };
    const names = sch.cols.map((c) => c.name), bad = (c) => names.indexOf(c) < 0;
    for (const w of spec.where || []) { if (bad(w.col)) return { error: 'No column "' + w.col + '" in ' + spec.table + '.' }; if (!OPS[w.op]) return { error: 'Unknown comparison "' + w.op + '".' }; }
    for (const g of spec.group || []) if (bad(g)) return { error: 'No column "' + g + '" in ' + spec.table + '.' };
    for (const a of spec.agg || []) { if (!AGG[a.fn]) return { error: 'Unknown summary "' + a.fn + '".' }; if (a.fn !== 'count' && bad(a.col)) return { error: 'No column "' + a.col + '" in ' + spec.table + '.' }; }
    let rows = T.get(league, spec.table).filter((r) => (spec.where || []).every((w) => r[w.col] != null && OPS[w.op](r[w.col], w.value)));
    let out, cols;
    if ((spec.agg || []).length || (spec.group || []).length) {
      const groups = new Map();
      rows.forEach((r) => { const k = (spec.group || []).map((g) => r[g]).join('\u0001'); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); });
      const aggs = (spec.agg || []).length ? spec.agg : [{ fn: 'count', as: 'n' }];
      out = [...groups.values()].map((rs) => {
        const row = {}; (spec.group || []).forEach((g) => { row[g] = rs[0][g]; });
        aggs.forEach((a) => { const vals = a.fn === 'count' ? rs : rs.map((r) => r[a.col]).filter((v) => typeof v === 'number'); const v = AGG[a.fn](vals); row[a.as || (a.fn + '_' + (a.col || ''))] = typeof v === 'number' ? r3(v) : v; });
        return row;
      });
      cols = (spec.group || []).concat(aggs.map((a) => a.as || (a.fn + '_' + (a.col || ''))));
    } else { out = rows; cols = spec.cols && spec.cols.length ? spec.cols.filter((c) => !bad(c)) : names; }
    if (spec.order && spec.order.col) { const d = spec.order.dir === 'desc' ? -1 : 1; out = out.slice().sort((a, b) => (a[spec.order.col] > b[spec.order.col] ? d : a[spec.order.col] < b[spec.order.col] ? -d : 0)); }
    const total = out.length;
    out = out.slice(0, Math.min(spec.limit || 200, 2000));
    return { columns: cols, rows: out.map((r) => cols.map((c) => (r[c] == null ? null : r[c]))), total };
  };

  // A column of numbers (nulls dropped) for the statistics toolkit.
  T.column = function (league, table, col, where) {
    const rows = T.get(league, table); if (!rows) return [];
    return rows.filter((r) => (where || []).every((w) => OPS[w.op](r[w.col], w.value))).map((r) => r[col]);
  };
})();
