// The season: eight teams, a double round robin (14 matchdays), a day-by-day calendar with a match every Saturday,
// the league table, saving, and the bookkeeping that follows a match (results, player statistics, lineups restored).
(function () {
  const FM = (window.FM = window.FM || {});
  const SAVE_KEY = 'lm_football_save_v1';

  const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const MATCHDAY_WEEKDAY = 5; // Saturday
  FM.weekdayName = (day) => WEEKDAYS[day % 7];
  FM.isMatchday = (day) => day % 7 === MATCHDAY_WEEKDAY;
  FM.roundOfDay = (day) => (FM.isMatchday(day) ? (day - MATCHDAY_WEEKDAY) / 7 : null);
  FM.dayLabel = (day) => 'Week ' + (Math.floor(day / 7) + 1) + ', ' + WEEKDAYS[day % 7];

  // Eight fictional clubs. Each has a home and an away kit, a starting style, a formation and a strength.
  FM.TEAM_DEFS = [
    { name: 'Ashford Rovers', style: 'balanced', formation: '4-3-3', strength: 0, home: ['#D62828', '#FFFFFF'], away: ['#F4F4F4', '#1A232D'] },
    { name: 'Kingsbridge Athletic', style: 'possession', formation: '4-2-2-2', strength: 1, home: ['#1E5AE0', '#FFFFFF'], away: ['#F2C94C', '#1A232D'] },
    { name: 'Northfield United', style: 'counter', formation: '4-3-3', strength: -0.5, home: ['#1F8A4C', '#FFFFFF'], away: ['#F2C94C', '#1A232D'] },
    { name: 'Redcliffe Town', style: 'press', formation: '4-2-2-2', strength: 0.5, home: ['#7B1E3A', '#FFFFFF'], away: ['#8FC7E8', '#1A232D'] },
    { name: 'Harbour City', style: 'possession', formation: '4-3-3', strength: 1.5, home: ['#0F8B8D', '#FFFFFF'], away: ['#F28C6B', '#1A232D'] },
    { name: 'Stoneham Wanderers', style: 'direct', formation: '4-2-2-2', strength: -1.5, home: ['#F28C28', '#1A232D'], away: ['#2B2B2B', '#FFFFFF'] },
    { name: 'Westmoor Albion', style: 'balanced', formation: '4-3-3', strength: 0, home: ['#F4F4F4', '#1D3557'], away: ['#6A3FA0', '#FFFFFF'] },
    { name: 'Eastgate Rangers', style: 'counter', formation: '4-2-2-2', strength: -1, home: ['#C9A227', '#1A232D'], away: ['#1D3557', '#FFFFFF'] },
  ];

  const STYLES = {
    balanced: {},
    possession: { buildDirect: 0.2, directness: 0.35, tempo: 0.4, risk: 0.4, pressing: 0.45, counterPress: 0.6, attackWidth: 1.1, pressBuildUp: 0.5 },
    counter: { lineHeight: 0.4, pressing: 0.4, counterAttack: 0.8, directness: 0.62, buildDirect: 0.4, tempo: 0.58, defWidth: 0.95, pressBuildUp: 0.2 },
    press: { lineHeight: 0.57, pressing: 0.7, counterPress: 0.75, tackleAggression: 0.55, pressBuildUp: 0.8 },
    direct: { buildDirect: 0.7, directness: 0.7, tempo: 0.56, shootFreedom: 0.6, risk: 0.56, pressing: 0.45, pressBuildUp: 0.3 },
  };
  FM.STYLE_NAMES = { balanced: 'Balanced', possession: 'Possession football', counter: 'Counter-attacking', press: 'High press', direct: 'Direct play' };
  function styleTactics(style, rng) {
    const t = Object.assign(FM.defaultTactics(), STYLES[style] || {});
    ['buildDirect', 'directness', 'tempo', 'risk', 'pressing', 'counterAttack', 'counterPress', 'lineHeight', 'shootFreedom', 'dribbleFreedom', 'finalRisk', 'pressBuildUp'].forEach((k) => {
      t[k] = Math.max(0, Math.min(1, t[k] + (rng() - 0.5) * 0.1));
    });
    return t;
  }

  // Colour clash: if the away side's shirt is too like the home side's, the away side changes kit.
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const colourDistance = (a, b) => { const x = rgb(a), y = rgb(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
  FM.chooseKits = function (home, away) {
    home.kit = { shirt: home.kits.home[0], number: home.kits.home[1] };
    const awayHome = { shirt: away.kits.home[0], number: away.kits.home[1] };
    const awayAway = { shirt: away.kits.away[0], number: away.kits.away[1] };
    away.kit = colourDistance(home.kit.shirt, awayHome.shirt) < 110 ? awayAway : awayHome;
    if (colourDistance(home.kit.shirt, away.kit.shirt) < 110) away.kit = away.kit === awayAway ? awayHome : awayAway;
  };

  FM.teamById = (league, id) => league.teams.find((t) => t.id === id);

  // ---------- creating a season ----------
  FM.createLeague = function (opts) {
    const seed = opts.seed || Math.floor(Math.random() * 1e9);
    const rng = FM.mulberry32(seed);
    const used = new Set();
    const teams = FM.TEAM_DEFS.map((def, i) => {
      const team = FM.createTeam({ id: 't' + (i + 1), name: def.name, kit: { shirt: def.home[0], number: def.home[1] }, attackDir: 1, formation: def.formation, strength: def.strength, seed: seed + i * 7919 });
      team.kits = { home: def.home, away: def.away };
      team.style = def.style;
      team.tactics = styleTactics(def.style, rng);
      team.baseTactics = Object.assign({}, team.tactics);
      team.drift = {};
      team.squad.forEach((p) => {
        const id = FM.generateIdentity(rng, used);
        p.name = id.name; p.nation = id.nation;
        p.stats = { apps: 0, goals: 0, shots: 0, yellows: 0, reds: 0 };
      });
      return team;
    });
    const league = { seed, tier: opts.tier || 'gcse', userId: teams[opts.userIndex || 0].id, season: 1, day: 0, teams, fixtures: [], testLog: [], hypotheses: [], news: [] };
    league.fixtures = makeFixtures(teams.map((t) => t.id), rng, seed);
    // Three pre-season friendlies each, played before the season starts. They give the opposition reports something to read, but
    // they do not count: not in the table, not in player records, injuries or fatigue, and not in the statistics workshop.
    league.friendlies = makeFixtures(teams.map((t) => t.id), FM.mulberry32(seed + 555), seed + 555)
      .filter((f) => f.round < 3).map((f, i) => Object.assign(f, { id: 'p' + i, round: f.round - 3, friendly: true }));
    return league;
  };

  // Circle method: seven rounds where everyone plays once, then the same seven with home and away reversed.
  function makeFixtures(ids, rng, seed) {
    const order = ids.slice();
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const n = order.length, rounds = [];
    let ring = order.slice();
    for (let r = 0; r < n - 1; r++) {
      const pairs = [];
      for (let i = 0; i < n / 2; i++) {
        const a = ring[i], b = ring[n - 1 - i];
        pairs.push((r + i) % 2 === 0 ? [a, b] : [b, a]);
      }
      rounds.push(pairs);
      ring = [ring[0], ring[n - 1]].concat(ring.slice(1, n - 1));
    }
    const fixtures = [];
    let k = 0;
    const add = (round, h, a) => fixtures.push({ id: 'f' + (k++), round, homeId: h, awayId: a, played: false, hg: null, ag: null, seed: seed + 104729 * k, stats: null });
    rounds.forEach((pairs, r) => pairs.forEach(([h, a]) => add(r, h, a)));
    rounds.forEach((pairs, r) => pairs.forEach(([h, a]) => add(r + n - 1, a, h)));
    return fixtures;
  }

  // ---------- calendar ----------
  FM.userFixtureToday = function (league) {
    const r = FM.roundOfDay(league.day);
    if (r == null) return null;
    return league.fixtures.find((f) => f.round === r && (f.homeId === league.userId || f.awayId === league.userId)) || null;
  };
  FM.nextUserFixture = function (league) {
    return league.fixtures.find((f) => !f.played && (f.homeId === league.userId || f.awayId === league.userId)) || null;
  };
  FM.seasonOver = (league) => league.fixtures.every((f) => f.played);
  FM.daysUntilMatch = function (league) {
    const f = FM.nextUserFixture(league);
    if (!f) return null;
    return (MATCHDAY_WEEKDAY + 7 * f.round) - league.day;
  };
  // Returns an error string if the day cannot be advanced (a match has to be played first).
  FM.advanceDay = function (league) {
    if (FM.seasonOver(league)) return 'The season is over.';
    const f = FM.userFixtureToday(league);
    if (f && !f.played) return 'Matchday: play your match before moving on.';
    league.day++;
    FM.today = league.day;
    FM.recoverDay(league);
    return null;
  };

  // ---------- lineups ----------
  FM.snapshotLineup = function (team) {
    return {
      formationKey: team.formationKey,
      slots: team.players.map((p) => ({ id: p.id, index: p.index, roleId: p.roleId, options: Object.assign({}, p.options) })),
      bench: team.bench.map((p) => p.id),
    };
  };
  FM.restoreLineup = function (team, snap) {
    const formation = FM.FORMATIONS[snap.formationKey];
    const byId = (id) => team.squad.find((p) => p.id === id);
    team.formationKey = snap.formationKey;
    team.squad.forEach((p) => {
      p.yellows = 0; p.sentOff = false;
      if (p.origGk != null) { p.ratings.gk = p.origGk; delete p.origGk; }
      p.emergencyKeeper = false;
      if (p.baseRatings) { Object.assign(p.ratings, p.baseRatings); p.maxSpeed = FM.speedFromPace(p.baseRatings.pace); delete p.baseRatings; }
      delete p.energy;
    });
    team.retired = [];
    team.players = snap.slots.map((s) => {
      const p = byId(s.id), slot = formation.slots[s.index];
      p.index = s.index; p.slotKey = slot.key; p.group = slot.group; p.roleId = s.roleId; p.options = Object.assign({}, s.options);
      return p;
    });
    team.bench = snap.bench.map((id) => { const p = byId(id); p.index = -1; p.slotKey = null; p.group = p.natural; return p; });
    team.sentOff = []; team.subsUsed = 0;
    FM.resetToKickoff(team);
  };


  // ---------- AI managers between matches ----------
  // Each AI club has a base set of tactics from its style. Before a match it plays that base, plus a small drift that
  // wanders after results (bounded), plus a counter-plan against the manager it is about to face, built from what
  // that manager did when they last met (full weight for a return fixture, half weight from their latest match otherwise).
  const AI_KEYS = ['buildDirect', 'directness', 'tempo', 'risk', 'finalRisk', 'shootFreedom', 'dribbleFreedom', 'counterAttack', 'counterPress', 'pressing', 'pressBuildUp', 'lineHeight', 'tackleAggression', 'offsideTrap', 'attackWidth', 'defWidth'];
  const DRIFT_KEYS = ['lineHeight', 'pressing', 'counterPress', 'counterAttack', 'offsideTrap', 'attackWidth', 'defWidth', 'dribbleFreedom', 'finalRisk'];
  const WIDTHS = ['attackWidth', 'defWidth'];
  const clampKey = (k, v) => (WIDTHS.indexOf(k) >= 0 ? Math.max(0.7, Math.min(1.25, v)) : Math.max(0, Math.min(1, v)));

  function scoutedTactics(league, team, opp) {
    const played = league.fixtures.filter((f) => f.played && f.stats && f.stats[opp.id]).sort((a, b) => b.round - a.round);
    const meeting = played.find((f) => (f.homeId === team.id || f.awayId === team.id) && (f.homeId === opp.id || f.awayId === opp.id));
    if (meeting) {
      const mine = meeting.homeId === team.id ? meeting.hg : meeting.ag, theirs = meeting.homeId === team.id ? meeting.ag : meeting.hg;
      return { tactics: meeting.stats[opp.id].tactics, weight: 1, lost: mine < theirs, meeting: true };
    }
    if (played.length) return { tactics: played[0].stats[opp.id].tactics, weight: 0.5, lost: false, meeting: false };
    return null;
  }

  // The adjustment against a manager who played like this.
  function counterPlan(t) {
    const adj = {};
    const add = (k, v) => { adj[k] = (adj[k] || 0) + v; };
    if (t.pressing > 0.6) { add('buildDirect', 0.15); add('counterAttack', 0.15); add('directness', 0.1); }
    if (t.pressing < 0.4) { add('pressing', 0.12); add('counterPress', 0.1); }
    if (t.lineHeight > 0.6) { add('directness', 0.12); add('counterAttack', 0.15); }
    if (t.lineHeight < 0.4) { add('buildDirect', -0.1); add('risk', -0.05); add('tempo', -0.05); }
    if (t.tempo > 0.6) add('tackleAggression', 0.1);
    if (t.attackWidth > 1.08) add('defWidth', 0.08);
    if (t.attackWidth < 0.92) add('defWidth', -0.08);
    if (t.directness > 0.65 || t.buildDirect > 0.65) { add('lineHeight', -0.08); add('offsideTrap', 0.15); }
    if (t.shootFreedom > 0.65) add('lineHeight', -0.05);
    return adj;
  }

  // Settings a computer-run club tries out in a friendly: its usual ones, with a wide random shake.
  FM.friendlyTactics = function (team, rng) {
    const base = team.baseTactics || team.tactics, t = Object.assign({}, base);
    AI_KEYS.forEach((k) => { t[k] = clampKey(k, base[k] + (rng() - 0.5) * 0.3); });
    return t;
  };

  FM.aiTacticsFor = function (league, team, opp) {
    const base = team.baseTactics || team.tactics;
    const scout = scoutedTactics(league, team, opp);
    const adj = {};
    if (scout) {
      const s = 0.5 * scout.weight * (scout.lost ? 1.3 : 1), plan = counterPlan(scout.tactics);
      Object.keys(plan).forEach((k) => { adj[k] = plan[k] * s; });
    }
    const t = Object.assign({}, base);
    AI_KEYS.forEach((k) => {
      const d = ((team.drift && team.drift[k]) || 0) + (adj[k] || 0);
      t[k] = clampKey(k, base[k] + Math.max(-0.3, Math.min(0.3, d)));
    });
    return t;
  };

  FM.aiAfterRound = function (league, round) {
    league.teams.forEach((team, idx) => {
      if (team.id === league.userId) return;
      const f = league.fixtures.find((x) => x.round === round && (x.homeId === team.id || x.awayId === team.id));
      if (!f || !f.played) return;
      const gf = f.homeId === team.id ? f.hg : f.ag, ga = f.homeId === team.id ? f.ag : f.hg;
      const rng = FM.mulberry32(league.seed + round * 977 + idx * 31);
      team.drift = team.drift || {};
      // Only settings that shape the style of play wander; tempo, directness and risk swing scoring too hard to drift at random.
      DRIFT_KEYS.forEach((k) => { team.drift[k] = (team.drift[k] || 0) * 0.75 + (rng() - 0.5) * 0.05; });
      const nudge = (k, v) => { team.drift[k] = (team.drift[k] || 0) + v; };
      if (ga >= 3) { nudge('lineHeight', -0.03); nudge('pressing', -0.02); }
      if (gf === 0) { nudge('dribbleFreedom', 0.03); nudge('finalRisk', 0.02); }
      DRIFT_KEYS.forEach((k) => { team.drift[k] = Math.max(-0.06, Math.min(0.06, team.drift[k])); });
    });
  };

  // ---------- playing a fixture ----------
  FM.startFixture = function (league, fx, opts) {
    const home = FM.teamById(league, fx.homeId), away = FM.teamById(league, fx.awayId);
    FM.today = league.day;
    FM.chooseKits(home, away);
    // AI clubs prepare for this opponent; the user's tactics are never touched.
    // In a friendly a computer-run club experiments a little with its settings instead of preparing for this opponent.
    const friendly = !!fx.friendly;
    const prepare = (t, o) => { if (t.id !== league.userId) Object.assign(t.tactics, friendly ? FM.friendlyTactics(t, FM.mulberry32(fx.seed + (t === home ? 1 : 2))) : FM.aiTacticsFor(league, t, o)); };
    prepare(home, away); prepare(away, home);
    // Injured players cannot play, and computer-run clubs also rest exhausted ones. Your own line-up only changes for injuries.
    [home, away].forEach((t) => {
      const changes = FM.autoLineup(t, { rotate: t.id !== league.userId });
      if (t.id === league.userId && !friendly && FM.pushNews) changes.filter((c) => c.injured).forEach((c) => FM.pushNews(league, { round: fx.round, day: league.day, kind: 'Injury', headline: c.off.name + ' is injured, ' + c.on.name + ' starts', body: c.off.name + ' (' + c.off.natural + ') is unavailable' + (c.off.injury ? ' with ' + c.off.injury.name : '') + ', so ' + c.on.name + ' takes his place in your starting line-up.', club: t.id, mine: true }));
    });
    [home, away].forEach((t) => { t.snap = FM.snapshotLineup(t); t.subsUsed = 0; t.sentOff = []; t.retired = []; delete t.liveBase; delete t.liveLean; FM.fitnessBegin(t); });
    const match = FM.createMatch(home, away, fx.seed);
    match.day = league.day; match.userId = league.userId; match.interactive = !!(opts && opts.interactive); match.friendly = friendly;
    match.aiTeams = [home, away].filter((t) => t.id !== league.userId);
    match.fixture = fx;
    // Clips are cut from your own matches (not friendlies, and not matches between other clubs).
    if (!friendly && (home.id === league.userId || away.id === league.userId)) { match.clips = []; match.rec = { buf: [], next: 0, pending: [], cands: [], chain: null }; }
    match.starters = { [home.id]: home.players.map((p) => p.id), [away.id]: away.players.map((p) => p.id) };
    return match;
  };

  FM.finishFixture = function (league, fx, match) {
    const home = match.home, away = match.away;
    fx.played = true;
    fx.hg = match.score[home.id]; fx.ag = match.score[away.id];
    fx.stats = {};
    [home, away].forEach((t) => {
      fx.stats[t.id] = Object.assign({}, match.stats[t.id]);
      fx.stats[t.id].formation = t.formationKey;
      fx.stats[t.id].tactics = Object.assign({}, t.tactics);
    });
    // A friendly leaves everything else alone: only the result and team figures are kept (with the goalscorers, for the reports).
    if (fx.friendly) {
      if (FM.summariseMatch) fx.summary = FM.summariseMatch(league, fx, match);
      [home, away].forEach((t) => { FM.fitnessEnd(t, new Set()); FM.restoreLineup(t, t.snap); t.snap = null; delete t.liveBase; delete t.liveLean; });
      return;
    }
    // Player statistics from the event log.
    const find = (team, n) => team.squad.find((p) => p.number === n);
    const played = new Set();
    [home, away].forEach((t) => match.starters[t.id].forEach((id) => played.add(id)));
    match.events.forEach((e) => {
      const team = e.team === home.id ? home : e.team === away.id ? away : null;
      if (!team) return;
      if (e.type === 'sub' || e.type === 'keeperSwap') { const p = find(team, e.on); if (p) played.add(p.id); }
      if (e.type === 'shot') { const p = find(team, e.player); if (p) p.stats.shots++; }
      if (e.type === 'goal') { const p = find(team, e.player); if (p) p.stats.goals++; }
      if (e.type === 'foul' && e.card) {
        const p = find(team, e.player);
        if (p) { if (e.card === 'red') p.stats.reds++; else if (e.card === 'second yellow') { p.stats.yellows++; p.stats.reds++; } else p.stats.yellows++; }
      }
    });
    [home, away].forEach((t) => t.squad.forEach((p) => { if (played.has(p.id)) p.stats.apps++; }));
    // For the user's own matches, keep a compact log for the Analysis Centre.
    if (fx.homeId === league.userId || fx.awayId === league.userId) { fx.log = FM.compactLog(match); fx.clips = FM.finaliseClips(match); }
    if (FM.summariseMatch) fx.summary = FM.summariseMatch(league, fx, match);
    [home, away].forEach((t) => { FM.fitnessEnd(t, played); FM.restoreLineup(t, t.snap); t.snap = null; delete t.liveBase; delete t.liveLean; });
  };

  // A compact copy of what happened, small enough to keep for every match of a season. Passes are arrays:
  //   [seconds, 0 home / 1 away, from shirt, to shirt, result (1 completed, 0 failed, 2 offside), x, y, distance, lane clearance, receiver pressure, probability]
  // Tackles: [seconds, team, player, opponent, won, x, y]. Dribbles: [seconds, team, player, won, x, y, defender distance, probability].
  FM.compactLog = function (match) {
    const r1 = (v) => Math.round(v * 10) / 10, r3 = (v) => Math.round(v * 1000) / 1000;
    const idx = (id) => (id === match.home.id ? 0 : 1);
    const log = { teams: [match.home.id, match.away.id], passes: [], tackles: [], dribbles: [], other: [], heat: match.heat, duration: Math.round(match.clock) };
    match.events.forEach((e) => {
      if (e.type === 'pass') log.passes.push([Math.round(e.t), idx(e.team), e.from, e.to, e.outcome === 'offside' ? 2 : e.ok ? 1 : 0, r1(e.x), r1(e.y), r1(e.dist), r1(Math.min(e.lane, 30)), r1(Math.min(e.press, 30)), r3(e.p)]);
      else if (e.type === 'tackle') log.tackles.push([Math.round(e.t), idx(e.team), e.player, e.vs, e.ok ? 1 : 0, r1(e.x), r1(e.y)]);
      else if (e.type === 'dribble') log.dribbles.push([Math.round(e.t), idx(e.team), e.player, e.ok ? 1 : 0, r1(e.x), r1(e.y), r1(Math.min(e.defDist, 30)), r3(e.p)]);
      else {
        const o = {};
        Object.keys(e).forEach((k) => { o[k] = typeof e[k] === 'number' ? (k === 't' ? Math.round(e[k]) : r3(e[k])) : e[k]; });
        log.other.push(o);
      }
    });
    return log;
  };

  // Plays the pre-season friendlies in the background, one match at a time so a page can show progress.
  FM.playFriendlies = function (league, onProgress) {
    const todo = (league.friendlies || []).filter((f) => !f.played);
    return new Promise((resolve) => {
      let i = 0;
      const next = () => {
        if (i >= todo.length) { resolve(); return; }
        FM.simulateFixture(league, todo[i], 0.25); // nobody is watching, so a coarser time step is fine and much quicker
        i++;
        if (onProgress) onProgress(i, todo.length);
        setTimeout(next, 0);
      };
      next();
    });
  };

  // Plays a whole match without watching it.
  FM.simulateFixture = function (league, fx, step) {
    const match = FM.startFixture(league, fx);
    const dt = step || 0.1;
    let guard = 0;
    while (match.phase !== 'fulltime' && guard++ < 200000) {
      if (match.phase === 'halftime') FM.startSecondHalf(match);
      FM.stepMatch(match, dt);
    }
    FM.finishFixture(league, fx, match);
  };

  // After the user's match: record it, then play the rest of that round in the background.
  FM.completeRound = function (league, userFx, userMatch) {
    FM.finishFixture(league, userFx, userMatch);
    league.fixtures.filter((f) => f.round === userFx.round && !f.played).forEach((f) => FM.simulateFixture(league, f));
    FM.aiAfterRound(league, userFx.round);
    if (FM.testPendingHypotheses) FM.testPendingHypotheses(league, userFx);
    if (FM.makeNews) FM.makeNews(league, userFx.round);
  };

  // ---------- table ----------
  FM.tableRows = function (league) {
    const rows = {};
    league.teams.forEach((t) => { rows[t.id] = { id: t.id, name: t.name, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] }; });
    league.fixtures.filter((f) => f.played).sort((a, b) => a.round - b.round).forEach((f) => {
      const h = rows[f.homeId], a = rows[f.awayId];
      h.p++; a.p++; h.gf += f.hg; h.ga += f.ag; a.gf += f.ag; a.ga += f.hg;
      if (f.hg > f.ag) { h.w++; a.l++; h.pts += 3; h.form.push('W'); a.form.push('L'); }
      else if (f.hg < f.ag) { a.w++; h.l++; a.pts += 3; a.form.push('W'); h.form.push('L'); }
      else { h.d++; a.d++; h.pts++; a.pts++; h.form.push('D'); a.form.push('D'); }
    });
    return Object.values(rows).sort((x, y) => (y.pts - x.pts) || ((y.gf - y.ga) - (x.gf - x.ga)) || (y.gf - x.gf) || x.name.localeCompare(y.name));
  };

  // ---------- saving ----------
  const PLAYER_KEYS = ['id', 'number', 'natural', 'name', 'nation', 'ratings', 'maxSpeed', 'roleId', 'options', 'index', 'slotKey', 'group', 'stats', 'origGk', 'emergencyKeeper', 'instr', 'note', 'condition', 'injury'];
  FM.serializeLeague = function (league) {
    const teams = league.teams.map((t) => ({
      id: t.id, name: t.name, kit: t.kit, kits: t.kits, style: t.style, strength: t.strength, seed: t.seed, formationKey: t.formationKey, tactics: t.tactics,
      subsUsed: t.subsUsed, maxSubs: t.maxSubs, snap: t.snap || null, baseTactics: t.baseTactics, drift: t.drift, shape: t.shape, phasePos: t.phasePos,
      squad: t.squad.map((p) => { const o = {}; PLAYER_KEYS.forEach((k) => { if (p[k] !== undefined) o[k] = p[k]; }); if (p.baseRatings) o.ratings = p.baseRatings; return o; }),
      players: t.players.map((p) => p.id), bench: t.bench.map((p) => p.id),
    }));
    return JSON.stringify({ v: 1, seed: league.seed, tier: league.tier, userId: league.userId, season: league.season, day: league.day, fixtures: league.fixtures, teams, testLog: league.testLog || [], hypotheses: league.hypotheses || [], news: league.news || [], friendlies: league.friendlies || [] });
  };
  FM.deserializeLeague = function (text) {
    const d = JSON.parse(text);
    const teams = d.teams.map((t) => {
      const squad = t.squad.map((p) => Object.assign({ x: 0, y: 0, vx: 0, vy: 0, yellows: 0 }, p));
      const byId = (id) => squad.find((p) => p.id === id);
      const team = {
        id: t.id, name: t.name, kit: t.kit, kits: t.kits, style: t.style, strength: t.strength, seed: t.seed, attackDir: 1, formationKey: t.formationKey,
        tactics: Object.assign(FM.defaultTactics(), t.tactics), subsUsed: t.subsUsed || 0, maxSubs: t.maxSubs || 5, snap: t.snap || null, baseTactics: Object.assign(FM.defaultTactics(), t.baseTactics || t.tactics), drift: t.drift || {}, shape: t.shape || {}, phasePos: t.phasePos || {},
        squad, players: t.players.map(byId), bench: t.bench.map(byId), sentOff: [],
      };
      return team;
    });
    const league = { seed: d.seed, tier: d.tier, userId: d.userId, season: d.season, day: d.day, fixtures: d.fixtures, teams, testLog: d.testLog || [], hypotheses: d.hypotheses || [], news: d.news || [], friendlies: d.friendlies || [] };
    FM.today = d.day;
    // A match that was abandoned part way: put the lineups back as they were before kick-off.
    league.teams.forEach((t) => { if (t.snap) { FM.restoreLineup(t, t.snap); t.snap = null; } else FM.resetToKickoff(t); });
    return league;
  };
  FM.saveLeague = function (league) {
    try { localStorage.setItem(SAVE_KEY, FM.serializeLeague(league)); return true; } catch (e) { /* storage full: drop the oldest clips and try again */ }
    const withClips = league.fixtures.filter((f) => f.clips && f.clips.length).sort((a, b) => a.round - b.round);
    for (const f of withClips) {
      f.clips = []; f.clipsDropped = true;
      try { localStorage.setItem(SAVE_KEY, FM.serializeLeague(league)); return true; } catch (e) { /* keep trimming */ }
    }
    return false;
  };
  FM.loadLeague = function () {
    try { const t = localStorage.getItem(SAVE_KEY); return t ? FM.deserializeLeague(t) : null; } catch (e) { return null; }
  };
  FM.clearSave = function () { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } };
})();
