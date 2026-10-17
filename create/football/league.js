// The season: eight teams, a double round robin (14 matchdays), a day-by-day calendar with a match every Saturday,
// the league table, saving, and the bookkeeping that follows a match (results, player statistics, lineups restored).
(function () {
  const FM = (window.FM = window.FM || {});
  const DEMO_MODE = /(?:^|[?&])demo=1(?:&|$)/.test(location.search);
  const SAVE_KEY = DEMO_MODE ? 'lm_football_demo_save_v1' : 'lm_football_save_v1';

  const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const MATCHDAY_WEEKDAY = 5; // Saturday
  FM.weekdayName = (day) => WEEKDAYS[day % 7];
  FM.isMatchday = (day) => day % 7 === MATCHDAY_WEEKDAY;
  FM.roundOfDay = (day) => (FM.isMatchday(day) ? (day - MATCHDAY_WEEKDAY) / 7 : null);
  FM.dayLabel = (day) => 'Week ' + (Math.floor(day / 7) + 1) + ', ' + WEEKDAYS[day % 7];

  // Eight fictional clubs. Each has a home and an away kit, a starting style, a formation and a strength.
  FM.TEAM_DEFS = [
    { tag: 'The working-class giants', story: "Formed by the workers of Ashford Ironworks. Three titles in six seasons in the 1970s, a near-death in 2004, and a town that sees every match as the defence of its identity.", name: 'Ashford Rovers', style: 'balanced', formation: '4-3-3', strength: 0, home: ['#1F8A4C', '#FFFFFF'], away: ['#F4F4F4', '#1F8A4C'] },
    { tag: 'The Scholars', story: "Born at the university, and the club that learned to buy players by statistics. Champions in 2005 on a quarter of Harbour City's wage bill.", name: 'Kingsbridge Athletic', style: 'possession', formation: '4-2-2-2', strength: 1, home: ['#1E5AE0', '#F2C94C'], away: ['#F2C94C', '#1E5AE0'] },
    { tag: 'The ruthless rivals', story: "Founded by three players who walked out of Ashford in 1894. Champions in 1997 after a penalty Ashford still call the Theft of '97.", name: 'Northfield United', style: 'counter', formation: '4-3-3', strength: -0.5, home: ['#151515', '#FFFFFF'], away: ['#F2C94C', '#1A232D'] },
    { tag: 'The little club that conquered the giants', story: "A quarrying town of 30,000 that won the league in 2015 with part-timers and a former postman. Sells almost everyone good.", name: 'Redcliffe Town', style: 'press', formation: '4-2-2-2', strength: 0.5, home: ['#7B1E3A', '#F3E7C8'], away: ['#8FC7E8', '#1A232D'] },
    { tag: 'The richest club with the emptiest trophy cabinet', story: "A dockworkers' club until a shipping billionaire bought it in 2016. A squad of stars, an impatient owner, and no title since 1962.", name: 'Harbour City', style: 'possession', formation: '4-3-3', strength: 1.5, home: ['#16325C', '#8EC9F0'], away: ['#8EC9F0', '#16325C'] },
    { tag: 'The fallen aristocrats', story: "The oldest club in the league and once its greatest: eleven titles between 1900 and 1930. A crumbling Victorian stadium is bankrupting them.", name: 'Stoneham Wanderers', style: 'direct', formation: '4-2-2-2', strength: -1.5, home: ['#5E1224', '#FFFFFF'], away: ['#F4F4F4', '#5E1224'] },
    { tag: 'The ambitious newcomers', story: "Two village clubs merged in the Depression. Owner Eleanor Price built them on analytics and coaching, and they finished third in 2025.", name: 'Westmoor Albion', style: 'balanced', formation: '4-3-3', strength: 0, home: ['#E3A008', '#14233F'], away: ['#14233F', '#E3A008'] },
    { tag: 'The club that always finishes second', story: "Runners-up seven times, and the side that threw away a 2-0 lead on the last day of 2019. The supporters believe the club is cursed.", name: 'Eastgate Rangers', style: 'counter', formation: '4-2-2-2', strength: -1, home: ['#C0262F', '#111111'], away: ['#E9E9E9', '#C0262F'] },
  ];
  FM.LOWER_TEAM_DEFS = [
    { tag: 'The old railway club', story: 'Founded by depot workers in 1908. Two generations still remember their single top-flight season in 1986, and the club has spent four decades trying to return.', name: 'Bramley Junction', style: 'direct', formation: '4-4-2', strength: -1.3, home: ['#7A263A', '#F4E7C8'], away: ['#F4E7C8', '#7A263A'] },
    { tag: 'The academy club', story: 'A small coastal club whose academy has produced internationals but whose best players rarely stay beyond their twenty-first birthday.', name: 'Seabourne Athletic', style: 'possession', formation: '4-3-3', strength: -0.7, home: ['#26A6A1', '#FFFFFF'], away: ['#FFFFFF', '#155E75'] },
    { tag: 'The former cup winners', story: 'Cup winners in 1974 and a top-flight fixture until financial collapse in the 1990s. Their rebuilt ground still carries photographs of better days.', name: 'Calder Vale', style: 'balanced', formation: '4-2-3-1', strength: -0.9, home: ['#6D28D9', '#FFFFFF'], away: ['#FFFFFF', '#6D28D9'] },
    { tag: 'The community-owned club', story: 'Saved by a supporters trust after their owner disappeared in 2012. Every major decision is debated in the social club beneath the main stand.', name: 'Mereford Town', style: 'press', formation: '4-3-3', strength: -1.1, home: ['#D97706', '#111827'], away: ['#111827', '#D97706'] },
    { tag: 'The sleeping city club', story: 'A large-city club with a famous ground and crowds bigger than several teams above them. Poor recruitment has kept them down for nine seasons.', name: 'Wexley City', style: 'possession', formation: '4-2-3-1', strength: -0.3, home: ['#7C3AED', '#FDE68A'], away: ['#FDE68A', '#7C3AED'] },
    { tag: 'The hard-running miners', story: 'Built around the former coalfield, they reached the top division twice through relentless pressing and were relegated both times on the final day.', name: 'Coalbrook United', style: 'press', formation: '4-4-2', strength: -0.5, home: ['#111827', '#F59E0B'], away: ['#F59E0B', '#111827'] },
    { tag: 'The cup specialists', story: 'Never promoted to the top division, but famous for three improbable cup runs and a ground where visiting favourites regularly struggle.', name: 'Alderwich', style: 'counter', formation: '5-3-2', strength: -1.5, home: ['#166534', '#FFFFFF'], away: ['#FFFFFF', '#166534'] },
    { tag: 'The ambitious county side', story: 'A young club financed by local technology firms. Their new training ground has made promotion feel inevitable, which has only increased the pressure.', name: 'Linton County', style: 'balanced', formation: '4-3-3', strength: -0.1, home: ['#DC2626', '#FFFFFF'], away: ['#FFFFFF', '#1E3A8A'] },
  ];

  const STYLES = {
    balanced: {},
    possession: { buildDirect: 0.2, directness: 0.35, tempo: 0.4, risk: 0.4, pressing: 0.45, counterPress: 0.6, attackWidth: 1.1, pressBuildUp: 0.5, beatPress: 0.3 },
    counter: { lineHeight: 0.4, pressing: 0.4, counterAttack: 0.8, directness: 0.62, buildDirect: 0.4, tempo: 0.58, defWidth: 0.95, pressBuildUp: 0.2 },
    press: { lineHeight: 0.57, pressing: 0.7, counterPress: 0.75, tackleAggression: 0.55, pressBuildUp: 0.8 },
    direct: { buildDirect: 0.7, directness: 0.7, tempo: 0.56, shootFreedom: 0.6, risk: 0.56, pressing: 0.45, pressBuildUp: 0.3, beatPress: 0.7 },
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
  // In a game played with other managers, every club a person manages is looked after by that person's own plan (the computer leaves it alone), and
  // 'watched' clubs also have their matches recorded for highlights. In a single-player game both are just the club you manage.
  FM.isHuman = (league, id) => id === league.userId || (league.humanIds || []).indexOf(id) >= 0;
  FM.isWatched = (league, id) => id === league.userId || (league.watchIds || []).indexOf(id) >= 0;
  // The kit a club would wear against another (its home kit, unless that clashes with the other side's), for drawing it on a pitch.
  FM.kitAgainst = function (team, vs) {
    const home = { shirt: team.kits.home[0], number: team.kits.home[1] }, away = { shirt: team.kits.away[0], number: team.kits.away[1] };
    const mine = { shirt: vs.kits.home[0] };
    return colourDistance(home.shirt, mine.shirt) < 110 ? away : home;
  };
  // What a club is known for: where it is expected to finish and the story behind it.
  FM.clubProfile = (team) => FM.TEAM_DEFS.concat(FM.LOWER_TEAM_DEFS || []).find((d) => d.name === team.name) || { tag: '', story: '' };

  // ---------- creating a season ----------
  FM.WORLD_SEED = 20261004;
  FM.RATING_BASE = 58; FM.STRENGTH_SCALE = 4.5; // the league average starting eleven, and rating points per step of club strength
  FM.createLeague = function (opts) {
    if (FM.markReplaceNext) FM.markReplaceNext();
    // Every game is the same league (same clubs, squads and fixtures), so the pre-season friendlies could be played once, in advance.
    const seed = opts.seed || FM.WORLD_SEED;
    const runSeed = opts.runSeed | 0;   // what makes one game's matches different from another's; 0 for the shared pre-made history
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
      // A club's standing has to show in its players. Random ratings alone swamp a small strength offset, so shift the whole squad
      // until the starting eleven averages what the club's strength says it should: title challengers clearly better than relegation candidates.
      const keys = ['pace', 'dribbling', 'passing', 'finishing', 'tackling', 'heading', 'composure', 'stamina'];
      const xiMean = team.players.reduce((a, p) => a + keys.reduce((m, k) => m + p.ratings[k], 0) / keys.length, 0) / team.players.length;
      const shift = Math.round(FM.RATING_BASE + FM.STRENGTH_SCALE * def.strength - xiMean);
      team.squad.forEach((p) => {
        keys.forEach((k) => { p.ratings[k] = Math.max(25, Math.min(95, p.ratings[k] + shift)); });
        if (p.natural === 'GK') p.ratings.gk = Math.max(45, Math.min(92, p.ratings.gk + shift));
        p.maxSpeed = FM.speedFromPace(p.ratings.pace);
      });
      return team;
    });
    const league = { seed, tier: opts.tier || 'gcse', userId: teams[opts.userIndex || 0].id, season: 1, day: 0, teams, fixtures: [], testLog: [], hypotheses: [], news: [], tacticalPlans: [], publicOpinion: 50, boardApproval: 50, divisionLevel: 1, divisionName: 'Premier Division', seasonHistory: [] };
    league.fixtures = makeFixtures(teams.map((t) => t.id), rng, seed + runSeed);
    // The first game of every season is the Iron Derby: Ashford Rovers at home to Northfield United. The rounds are re-ordered so the pairing falls
    // in round one, and the return game is the mirror of it.
    (function () {
      const ash = teams.find((t) => t.name === 'Ashford Rovers'), nor = teams.find((t) => t.name === 'Northfield United');
      if (!ash || !nor) return;
      const half = teams.length - 1;
      const fx = league.fixtures.find((f) => f.round < half && ((f.homeId === ash.id && f.awayId === nor.id) || (f.homeId === nor.id && f.awayId === ash.id)));
      if (!fx) return;
      const r = fx.round;
      if (r !== 0) league.fixtures.forEach((f) => {
        const k = f.round >= half ? f.round - half : f.round, second = f.round >= half;
        const nk = k === 0 ? r : k === r ? 0 : k;
        f.round = second ? nk + half : nk;
      });
      const pair = league.fixtures.filter((f) => (f.homeId === ash.id && f.awayId === nor.id) || (f.homeId === nor.id && f.awayId === ash.id));
      pair.forEach((f) => { if (f.round < half && f.homeId !== ash.id) { const h = f.homeId; f.homeId = f.awayId; f.awayId = h; } if (f.round >= half && f.homeId !== nor.id) { const h = f.homeId; f.homeId = f.awayId; f.awayId = h; } });
    })();
    // Three pre-season friendlies each, played before the season starts. They give the opposition reports something to read, but
    // they do not count: not in the table, not in player records, injuries or fatigue, and not in the statistics workshop.
    league.friendlies = makeFixtures(teams.map((t) => t.id), FM.mulberry32(seed + 555), seed + 555)
      .filter((f) => f.round < 3).map((f, i) => Object.assign(f, { id: 'p' + i, round: f.round - 3, friendly: true }));
    // The friendlies for the shared league are played in advance (see tools/gen_preseason.js) and simply loaded here.
    if (seed === FM.WORLD_SEED && FM.PRESEASON) league.friendlies = JSON.parse(JSON.stringify(FM.PRESEASON));
    league.runSeed = runSeed;
    FM.ensureTwoDivisions(league);
    FM.setBoardExpectation(league);
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

  function makeLowerTeams(league) {
    const seed = league.seed + 88001, rng = FM.mulberry32(seed), used = new Set();
    return FM.LOWER_TEAM_DEFS.map((def, i) => {
      const team = FM.createTeam({ id: 'l' + (i + 1), name: def.name, kit: { shirt: def.home[0], number: def.home[1] }, attackDir: 1, formation: def.formation, strength: def.strength, seed: seed + i * 7919 });
      team.kits = { home: def.home, away: def.away }; team.style = def.style;
      team.tactics = styleTactics(def.style, rng); team.baseTactics = Object.assign({}, team.tactics); team.drift = {};
      team.squad.forEach((p) => { const id = FM.generateIdentity(rng, used); p.name = id.name; p.nation = id.nation; p.stats = { apps: 0, goals: 0, shots: 0, yellows: 0, reds: 0 }; });
      const keys = ['pace', 'dribbling', 'passing', 'finishing', 'tackling', 'heading', 'composure', 'stamina'];
      const xiMean = team.players.reduce((a, p) => a + keys.reduce((m, k) => m + p.ratings[k], 0) / keys.length, 0) / team.players.length;
      const shift = Math.round((FM.RATING_BASE - 5) + FM.STRENGTH_SCALE * def.strength - xiMean);
      team.squad.forEach((p) => { keys.forEach((k) => { p.ratings[k] = Math.max(25, Math.min(92, p.ratings[k] + shift)); }); if (p.natural === 'GK') p.ratings.gk = Math.max(40, Math.min(90, p.ratings.gk + shift)); p.maxSpeed = FM.speedFromPace(p.ratings.pace); });
      return team;
    });
  }

  FM.ensureTwoDivisions = function (league) {
    if (!league.divisionLevel) league.divisionLevel = 1;
    if (!league.divisionName) league.divisionName = league.divisionLevel === 1 ? 'Premier Division' : 'Championship';
    if (!Number.isFinite(league.boardApproval)) league.boardApproval = 50;
    league.seasonHistory = league.seasonHistory || [];
    if (!league.otherLeague || !league.otherLeague.teams || league.otherLeague.teams.length !== 8) {
      const teams = makeLowerTeams(league);
      league.otherLeague = { level: 2, name: 'Championship', teams, fixtures: makeFixtures(teams.map((t) => t.id), FM.mulberry32(league.seed + 88111), league.seed + 88201) };
    }
    return league.otherLeague;
  };

  FM.divisionTableRows = function (division) {
    return FM.tableRows({ teams: division.teams, fixtures: division.fixtures });
  };

  FM.setBoardExpectation = function (league) {
    const sorted = league.teams.slice().sort((a, b) => (b.strength || 0) - (a.strength || 0));
    const expected = Math.max(1, sorted.findIndex((t) => t.id === league.userId) + 1);
    league.board = league.board || {};
    league.board.expectedPosition = expected;
    league.board.expectation = expected <= 2 ? 'Challenge for the title' : expected <= 4 ? 'Finish in the top half' : expected <= 6 ? 'Stay clear of relegation' : 'Fight to stay up';
    league.board.division = league.divisionName;
  };

  FM.approvalBand = function (n) {
    n = Math.round(Number.isFinite(n) ? n : 50);
    return n >= 85 ? 'Outstanding' : n >= 70 ? 'Very good' : n >= 58 ? 'Good' : n >= 45 ? 'Stable' : n >= 32 ? 'Under pressure' : n >= 18 ? 'On the brink' : 'Critical';
  };

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
      formationLabel: team.formationLabel || null,
      slots: team.players.map((p) => ({ id: p.id, index: p.index, roleId: p.roleId, options: Object.assign({}, p.options) })),
      bench: team.bench.map((p) => p.id),
    };
  };
  FM.restoreLineup = function (team, snap) {
    const formation = FM.FORMATIONS[snap.formationKey];
    const byId = (id) => team.squad.find((p) => p.id === id);
    team.formationKey = snap.formationKey;
    if (snap.formationLabel) team.formationLabel = snap.formationLabel; else delete team.formationLabel;
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
      if (FM.isHuman(league, team.id)) return;
      const f = league.fixtures.find((x) => x.round === round && (x.homeId === team.id || x.awayId === team.id));
      if (!f || !f.played) return;
      const gf = f.homeId === team.id ? f.hg : f.ag, ga = f.homeId === team.id ? f.ag : f.hg;
      const rng = FM.mulberry32(league.seed + (league.runSeed || 0) + round * 977 + idx * 31);
      team.drift = team.drift || {};
      // Only settings that shape the style of play wander; tempo, directness and risk swing scoring too hard to drift at random.
      DRIFT_KEYS.forEach((k) => { team.drift[k] = (team.drift[k] || 0) * 0.75 + (rng() - 0.5) * 0.05; });
      const nudge = (k, v) => { team.drift[k] = (team.drift[k] || 0) + v; };
      if (ga >= 3) { nudge('lineHeight', -0.03); nudge('pressing', -0.02); }
      if (gf === 0) { nudge('dribbleFreedom', 0.03); nudge('finalRisk', 0.02); }
      DRIFT_KEYS.forEach((k) => { team.drift[k] = Math.max(-0.06, Math.min(0.06, team.drift[k])); });
    });
  };

  // Assessed once at kick-off against the previous competitive match. Editing
  // during preparation is free; repeatedly taking a new structure into games is not.
  const FAMILIARITY_KEYS = ['buildDirect', 'directness', 'tempo', 'risk', 'finalRisk', 'shootFreedom', 'dribbleFreedom', 'counterAttack', 'counterPress', 'pressing', 'pressBuildUp', 'lineHeight', 'tackleAggression', 'offsideTrap', 'attackWidth', 'defWidth'];
  function planPoints(value, path, out) {
    if (!value || typeof value !== 'object') return;
    if (Number.isFinite(value.x) && Number.isFinite(value.y)) { out[path] = [value.x / 105, value.y / 68]; return; }
    Object.keys(value).sort().forEach((k) => planPoints(value[k], path + '/' + k, out));
  }
  FM.tacticalPlanSnapshot = function (team) {
    const points = {};
    planPoints(team.phasePos || {}, 'phase', points); planPoints(team.shape || {}, 'shape', points);
    const tactics = {};
    FAMILIARITY_KEYS.forEach((k) => { tactics[k] = Number.isFinite(team.tactics[k]) ? Math.round(team.tactics[k] * 1000) / 1000 : 0; });
    const rules = (team.rules || []).filter((r) => !r.off).map((r) => JSON.stringify(r)).sort();
    return { formation: FM.formationName ? FM.formationName(team) : team.formationKey, tactics, points, rules };
  };
  FM.tacticalPlanChange = function (before, after) {
    if (!before || !after) return 0;
    let change = before.formation === after.formation ? 0 : 0.3;
    const tk = FAMILIARITY_KEYS.filter((k) => Number.isFinite(before.tactics[k]) && Number.isFinite(after.tactics[k]));
    const tacticMean = tk.length ? tk.reduce((sum, k) => sum + Math.abs(before.tactics[k] - after.tactics[k]), 0) / tk.length : 0;
    change += Math.min(0.35, tacticMean * 0.9);
    const pk = Object.keys(before.points || {}).filter((k) => after.points && after.points[k]);
    const pointMean = pk.length ? pk.reduce((sum, k) => sum + Math.hypot(before.points[k][0] - after.points[k][0], before.points[k][1] - after.points[k][1]), 0) / pk.length : 0;
    change += Math.min(0.3, pointMean * 0.65);
    if (JSON.stringify(before.rules || []) !== JSON.stringify(after.rules || [])) change += 0.08;
    return Math.min(1, change);
  };
  FM.familiarityLabel = (score) => score >= 90 ? 'Settled' : score >= 75 ? 'Familiar' : score >= 60 ? 'Adjusting' : 'Disjointed';
  FM.previewTacticalFamiliarity = function (team) {
    const state = team.tacticalFamiliarity || { score: 100, baseline: null };
    const previous = Number.isFinite(state.score) ? state.score : 100;
    const change = FM.tacticalPlanChange(state.baseline, FM.tacticalPlanSnapshot(team));
    const score = !state.baseline ? previous : change <= 0.035 ? Math.min(100, previous + 7) : Math.max(45, previous - Math.max(2, Math.ceil((change - 0.035) * 45)));
    return { score, change, delta: score - previous, label: FM.familiarityLabel(score), firstMatch: !state.baseline };
  };
  FM.updateTacticalFamiliarity = function (team) {
    const current = FM.tacticalPlanSnapshot(team), state = team.tacticalFamiliarity || { score: 100, baseline: null, change: 0, delta: 0 };
    const change = FM.tacticalPlanChange(state.baseline, current), previous = Number.isFinite(state.score) ? state.score : 100;
    const score = !state.baseline ? previous : change <= 0.035 ? Math.min(100, previous + 7) : Math.max(45, previous - Math.max(2, Math.ceil((change - 0.035) * 45)));
    team.tacticalFamiliarity = { score, baseline: current, change, delta: score - previous };
    team.tacticalFactor = 0.88 + 0.12 * score / 100;
    return team.tacticalFamiliarity;
  };

  // ---------- playing a fixture ----------
  FM.startFixture = function (league, fx, opts) {
    const home = FM.teamById(league, fx.homeId), away = FM.teamById(league, fx.awayId);
    FM.today = league.day;
    FM.chooseKits(home, away);
    // AI clubs prepare for this opponent; the user's tactics are never touched.
    // In a friendly a computer-run club experiments a little with its settings instead of preparing for this opponent.
    const friendly = !!fx.friendly;
    const prepare = (t, o) => { if (!FM.isHuman(league, t.id)) Object.assign(t.tactics, friendly ? FM.friendlyTactics(t, FM.mulberry32(fx.seed + (t === home ? 1 : 2))) : FM.aiTacticsFor(league, t, o)); };
    prepare(home, away); prepare(away, home);
    // Injured players cannot play, and computer-run clubs also rest exhausted ones. Your own line-up only changes for injuries.
    [home, away].forEach((t) => {
      const changes = FM.autoLineup(t, { rotate: !FM.isHuman(league, t.id) });
      if (t.id === league.userId && !friendly && FM.pushNews) changes.filter((c) => c.injured).forEach((c) => FM.pushNews(league, { round: fx.round, day: league.day, kind: 'Injury', headline: c.off.name + ' is injured, ' + c.on.name + ' starts', body: c.off.name + ' (' + c.off.natural + ') is unavailable' + (c.off.injury ? ' with ' + c.off.injury.name : '') + ', so ' + c.on.name + ' takes his place in your starting line-up.', club: t.id, mine: true }));
    });
    [home, away].forEach((t) => {
      if (!friendly) FM.updateTacticalFamiliarity(t);
      else t.tacticalFactor = 0.88 + 0.12 * ((t.tacticalFamiliarity && t.tacticalFamiliarity.score) || 100) / 100;
    });
    [home, away].forEach((t) => { t.snap = FM.snapshotLineup(t); t.subsUsed = 0; t.sentOff = []; t.retired = []; delete t.liveBase; delete t.liveLean; FM.fitnessBegin(t); });
    const match = FM.createMatch(home, away, fx.seed);
    match.day = league.day; match.userId = league.userId; match.interactive = !!(opts && opts.interactive); match.friendly = friendly;
    match.aiTeams = [home, away].filter((t) => !FM.isHuman(league, t.id));
    match.fixture = fx;
    // a rivalry (the Iron Derby above all) makes a match hotter, and plans the incidents that go with it
    if (FM.setupDrama) FM.setupDrama(match, FM.derbyForFixture ? FM.derbyForFixture(league, fx) : null, fx.seed);
    if (FM.scout) FM.scout.startMatch(league, match);   // computer-run clubs read your recent matches and set their rules
    // Clips are cut from your own matches (not friendlies, and not matches between other clubs).
    if (!friendly && (FM.isWatched(league, home.id) || FM.isWatched(league, away.id))) { match.clips = []; match.rec = { buf: [], next: 0, pending: [], cands: [], chain: null }; }
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
      fx.stats[t.id].formation = FM.formationName ? FM.formationName(t) : t.formationKey;
      fx.stats[t.id].tactics = Object.assign({}, t.tactics);
    });
    fx.scout = FM.scoutSummary(match);
    if (match.oppLog) fx.oppLog = match.oppLog.slice(-8);
    [home, away].forEach((t) => { if (!FM.isHuman(league, t.id)) t.rules = []; });   // an opposing manager's rules are for this match only
    // A friendly leaves everything else alone: only the result and team figures are kept (with the goalscorers, for the reports).
    if (fx.friendly) {
      if (FM.summariseMatch) fx.summary = FM.summariseMatch(league, fx, match);
      // The managed club's friendlies keep their log too, so the statistics have numbers to work on before the first league match.
      if (FM.isWatched(league, fx.homeId) || FM.isWatched(league, fx.awayId)) fx.log = FM.compactLog(match);
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
    if (FM.isWatched(league, fx.homeId) || FM.isWatched(league, fx.awayId)) { fx.log = FM.compactLog(match); fx.clips = FM.finaliseClips(match);
      // Every match's clips are kept so they can be played again on request; if the saved game gets too large the oldest are dropped first.
    }
    if (FM.summariseMatch) fx.summary = FM.summariseMatch(league, fx, match);
    // a player sent off misses the next match (two after a violent act)
    if (fx.summary) fx.summary.reds.forEach((r) => {
      const t = r.team === home.id ? home : away, p = t.squad.find((x) => x.number === r.n);
      if (!p) return;
      const games = r.violent ? 2 : 1, until = (match.day || league.day || 0) + 7 * games + 1;
      if (!p.injury || p.injury.until < until) p.injury = { until, name: 'Suspended (' + (r.second ? 'second yellow card' : r.violent ? 'violent conduct' : 'red card') + ')', matches: games, suspended: true };
    });
    [home, away].forEach((t) => { FM.fitnessEnd(t, played); FM.restoreLineup(t, t.snap); t.snap = null; delete t.liveBase; delete t.liveLean; });
  };

  // A compact copy of what happened, small enough to keep for every match of a season. Passes are arrays:
  //   [seconds, 0 home / 1 away, from shirt, to shirt, result (1 completed, 0 failed, 2 offside), x, y, distance, lane clearance, receiver pressure, probability]
  // Tackles: [seconds, team, player, opponent, won, x, y]. Dribbles: [seconds, team, player, won, x, y, defender distance, probability].
  FM.compactLog = function (match) {
    const r1 = (v) => Math.round(v * 10) / 10, r3 = (v) => Math.round(v * 1000) / 1000;
    const idx = (id) => (id === match.home.id ? 0 : 1);
    const log = { teams: [match.home.id, match.away.id], passes: [], tackles: [], dribbles: [], other: [], heat: match.heat, duration: Math.round(match.clock), xr: FM.xrSummary ? FM.xrSummary(match) : null };
    // The sides change ends at half time. The log is kept as if the home side attacked the same way all match (the way the analysis pages
    // read it), so positions from the second half are turned round.
    const PL = FM.PITCH.L, PW = FM.PITCH.W, swapAt = match.swapAt == null ? Infinity : match.swapAt;
    const X = (e, v) => (e.t >= swapAt && typeof v === 'number' ? PL - v : v), Y = (e, v) => (e.t >= swapAt && typeof v === 'number' ? PW - v : v);
    match.events.forEach((e) => {
      if (e.type === 'pass') log.passes.push([Math.round(e.t), idx(e.team), e.from, e.to, e.outcome === 'offside' ? 2 : e.ok ? 1 : 0, r1(X(e, e.x)), r1(Y(e, e.y)), r1(e.dist), r1(Math.min(e.lane, 30)), r1(Math.min(e.press, 30)), r3(e.p), r1(e.tx == null ? -1 : X(e, e.tx)), r1(e.ty == null ? -1 : Y(e, e.ty)), e.box == null ? -1 : e.box]);
      else if (e.type === 'tackle') log.tackles.push([Math.round(e.t), idx(e.team), e.player, e.vs, e.ok ? 1 : 0, r1(X(e, e.x)), r1(Y(e, e.y)), r3(e.depth == null ? -1 : e.depth), r1(e.cover == null ? -1 : e.cover)]);
      else if (e.type === 'dribble') log.dribbles.push([Math.round(e.t), idx(e.team), e.player, e.ok ? 1 : 0, r1(X(e, e.x)), r1(Y(e, e.y)), r1(Math.min(e.defDist, 30)), r3(e.p)]);
      else {
        const o = {};
        Object.keys(e).forEach((k) => {
          const v = k === 'x' || k === 'tx' ? X(e, e[k]) : k === 'y' || k === 'ty' ? Y(e, e[k]) : e[k];
          o[k] = typeof v === 'number' ? (k === 't' ? Math.round(v) : r3(v)) : v;
        });
        log.other.push(o);
      }
    });
    // Which of the manager's added pages applied, and for how much of the match (by the page's own label).
    const tally = match.pageTime || {}, pages = {};
    Object.keys(tally).forEach((k) => {
      const parts = k.split('|'), tid = parts[0], stage = parts[1], label = parts.slice(2).join('|');
      (pages[tid] = pages[tid] || []).push({ stage, label, n: tally[k] });
    });
    Object.keys(pages).forEach((tid) => {
      const stages = {};
      pages[tid].forEach((r) => { stages[r.stage] = (stages[r.stage] || 0) + r.n; });
      pages[tid].forEach((r) => { r.share = Math.round(1000 * r.n / (stages[r.stage] || 1)) / 1000; delete r.n; });
    });
    if (Object.keys(pages).length) log.pages = pages;
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

  // The same simulation, split across short browser turns. This prevents the
  // browser's "not responding" warning while the other league games are played.
  FM.simulateFixtureAsync = async function (league, fx, step) {
    const match = FM.startFixture(league, fx);
    const dt = step || 0.1;
    let guard = 0;
    while (match.phase !== 'fulltime' && guard < 200000) {
      const stop = Math.min(guard + 750, 200000);
      while (match.phase !== 'fulltime' && guard++ < stop) {
        if (match.phase === 'halftime') FM.startSecondHalf(match);
        FM.stepMatch(match, dt);
      }
      if (match.phase !== 'fulltime') await new Promise((resolve) => setTimeout(resolve, 0));
    }
    FM.finishFixture(league, fx, match);
  };

  // After the user's match: record it, then play the rest of that round in the background.
  FM.completeRound = async function (league, userFx, userMatch, onResult) {
    FM.finishFixture(league, userFx, userMatch);
    for (const fixture of league.fixtures.filter((f) => f.round === userFx.round && !f.played)) { await FM.simulateFixtureAsync(league, fixture); if (onResult) await onResult(fixture, league, false); }
    // The parallel division plays on the same matchday. It is simulated with
    // the same engine, but without a human-controlled club or match logs.
    const other = FM.ensureTwoDivisions(league);
    const shadow = { seed: league.seed + 44000, runSeed: league.runSeed || 0, day: league.day, userId: '__none__', teams: other.teams, fixtures: other.fixtures, news: [], friendlies: [], captains: {} };
    for (const fixture of other.fixtures.filter((f) => f.round === userFx.round && !f.played)) { await FM.simulateFixtureAsync(shadow, fixture); if (onResult) await onResult(fixture, shadow, true); }
    FM.aiAfterRound(league, userFx.round);
    FM.updateBoardApproval(league);
    if (FM.bizAfterRound) FM.bizAfterRound(league, userFx);   // the club's accounts for the matchday
    if (FM.testPendingHypotheses) FM.testPendingHypotheses(league, userFx);
    if (FM.makeNews) FM.makeNews(league, userFx.round);
    if (FM.transfersAfterRound) FM.transfersAfterRound(league, userFx.round);
    if (FM.developAfterRound) FM.developAfterRound(league, userFx.round);
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

  FM.updateBoardApproval = function (league) {
    FM.setBoardExpectation(league);
    const rows = FM.tableRows(league), pos = rows.findIndex((r) => r.id === league.userId) + 1;
    const mine = rows[pos - 1], expected = league.board.expectedPosition || 4;
    const played = mine ? mine.p : 0;
    const positionScore = (expected - pos) * 1.15;
    const pointsRate = played ? mine.pts / played : 1.35;
    const resultScore = (pointsRate - 1.35) * 1.5;
    const target = Math.max(8, Math.min(92, 52 + (expected - pos) * 7 + (pointsRate - 1.35) * 12));
    const before = Number.isFinite(league.boardApproval) ? league.boardApproval : 50;
    league.boardApproval = Math.max(0, Math.min(100, Math.round((before + Math.max(-4, Math.min(4, positionScore + resultScore)) + (target - before) * 0.08) * 10) / 10));
    league.board.currentPosition = pos; league.board.points = mine ? mine.pts : 0; league.board.played = played;
  };

  function resetClubForSeason(team) {
    team.squad.forEach((p) => {
      p.stats = { apps: 0, goals: 0, shots: 0, yellows: 0, reds: 0 };
      p.condition = 1; delete p.injury; p.age = FM.ageOf ? FM.ageOf(p) + 1 : (p.age || 24) + 1;
      if (p.contract != null) p.contract = Math.max(1, p.contract - 1);
    });
    team.drift = {}; team.rules = []; team.scenarios = []; team.defScenarios = []; team.scenarioEvidence = {}; team.scenarioDefEvidence = {};
    // Summer interrupts the rhythm, but a club does not forget its entire base.
    if (team.tacticalFamiliarity) { team.tacticalFamiliarity.score = Math.max(75, Math.round(team.tacticalFamiliarity.score * 0.9)); team.tacticalFamiliarity.delta = 0; }
    FM.resetToKickoff(team);
  }

  FM.startNextSeason = function (league) {
    if (!FM.seasonOver(league)) return false;
    const other = FM.ensureTwoDivisions(league);
    const currentRows = FM.tableRows(league), otherRows = FM.divisionTableRows(other);
    const current = { level: league.divisionLevel, name: league.divisionName, teams: league.teams, fixtures: league.fixtures, rows: currentRows };
    const second = { level: other.level, name: other.name, teams: other.teams, fixtures: other.fixtures, rows: otherRows };
    const upper = current.level === 1 ? current : second, lower = current.level === 2 ? current : second;
    const relegated = upper.rows.slice(-2).map((r) => r.id), promoted = lower.rows.slice(0, 2).map((r) => r.id);
    league.seasonHistory = league.seasonHistory || [];
    league.seasonHistory.push({ season: league.season, champion: upper.rows[0].name, promoted: lower.rows.slice(0, 2).map((r) => r.name), relegated: upper.rows.slice(-2).map((r) => r.name), divisions: [{ level: 1, name: upper.name, rows: upper.rows }, { level: 2, name: lower.name, rows: lower.rows }] });
    const upperTeams = upper.teams.filter((t) => relegated.indexOf(t.id) < 0).concat(lower.teams.filter((t) => promoted.indexOf(t.id) >= 0));
    const lowerTeams = lower.teams.filter((t) => promoted.indexOf(t.id) < 0).concat(upper.teams.filter((t) => relegated.indexOf(t.id) >= 0));
    const userLevel = upperTeams.some((t) => t.id === league.userId) ? 1 : 2;
    const activeTeams = userLevel === 1 ? upperTeams : lowerTeams, otherTeams = userLevel === 1 ? lowerTeams : upperTeams;
    const oldPos = currentRows.findIndex((r) => r.id === league.userId) + 1;
    league.season += 1; league.day = 0; FM.today = 0; league.divisionLevel = userLevel; league.divisionName = userLevel === 1 ? 'Premier Division' : 'Championship';
    league.teams = activeTeams; league.fixtures = makeFixtures(activeTeams.map((t) => t.id), FM.mulberry32(league.seed + league.season * 1709 + userLevel), league.seed + league.season * 97003 + userLevel);
    league.otherLeague = { level: userLevel === 1 ? 2 : 1, name: userLevel === 1 ? 'Championship' : 'Premier Division', teams: otherTeams, fixtures: makeFixtures(otherTeams.map((t) => t.id), FM.mulberry32(league.seed + league.season * 1877 + 9), league.seed + league.season * 99007 + 9) };
    activeTeams.concat(otherTeams).forEach(resetClubForSeason);
    league.friendlies = []; league.prepStep = 0; league.prepPhaseMax = 0; league.testPhaseMax = 0; league.labRuns = []; league.phaseLabRuns = {}; league.testLog = []; league.hypotheses = [];
    FM.setBoardExpectation(league);
    league.board.currentPosition = null; league.board.points = 0; league.board.played = 0;
    if (FM.bizNewSeason) FM.bizNewSeason(league);
    league.boardApproval = Math.max(0, Math.min(100, (Number.isFinite(league.boardApproval) ? league.boardApproval : 50) + (promoted.indexOf(league.userId) >= 0 ? 6 : relegated.indexOf(league.userId) >= 0 ? -8 : 0)));
    const tr = FM.transfer ? FM.transfer(league) : league.transfer;
    if (tr) {
      tr.deals = {}; tr.offers = []; tr.shortlist = []; tr.opening = false;
      const me = FM.teamById(league, league.userId), bill = me.squad.reduce((a, p) => a + (FM.wageOf ? FM.wageOf(p) : 0), 0);
      activeTeams.forEach((t) => {
        const wages = t.squad.reduce((a, p) => a + (FM.wageOf ? FM.wageOf(p) : 0), 0);
        if (!Number.isFinite(tr.budget[t.id])) tr.budget[t.id] = Math.round((league.divisionLevel === 1 ? 12 : 5) * 10) / 10;
        if (!Number.isFinite(tr.wageBudget[t.id])) tr.wageBudget[t.id] = Math.round((wages + (league.divisionLevel === 1 ? 25 : 12)) * 10) / 10;
      });
      const performance = league.divisionLevel === 1 ? Math.max(0, 9 - oldPos) * 1.4 : Math.max(0, 9 - oldPos) * 0.75;
      const status = league.divisionLevel === 1 ? (promoted.indexOf(me.id) >= 0 ? 9 : 12) : 5;
      tr.budget[me.id] = Math.round((status + performance + Math.max(0, (tr.budget[me.id] || 0) * 0.2)) * 10) / 10;
      tr.wageBudget[me.id] = Math.round((bill + (league.divisionLevel === 1 ? 30 : 14) + performance * 1.5) * 10) / 10;
    }
    league.news = league.news || [];
    league.news.push({ round: -1, day: 0, kind: 'League', headline: 'Season ' + league.season + ' begins in the ' + league.divisionName, body: promoted.indexOf(league.userId) >= 0 ? 'Promotion brings a new division, a larger budget and a tougher board target.' : relegated.indexOf(league.userId) >= 0 ? 'The club begins the work of returning after relegation. The budget has been reset for the Championship.' : 'The board has set its target and confirmed the new season budgets.', club: league.userId, mine: true });
    return true;
  };

  // ---------- saving ----------
  const PLAYER_KEYS = ['id', 'number', 'natural', 'name', 'nation', 'ratings', 'height', 'foot', 'maxSpeed', 'roleId', 'options', 'index', 'slotKey', 'group', 'stats', 'origGk', 'emergencyKeeper', 'instr', 'note', 'condition', 'injury', 'wage', 'contract', 'joined', 'age', 'pot'];
  function packTeam(t) {
    return {
      id: t.id, name: t.name, kit: t.kit, kits: t.kits, style: t.style, strength: t.strength, seed: t.seed, formationKey: t.formationKey, formationLabel: t.formationLabel || null, tactics: t.tactics,
      subsUsed: t.subsUsed, maxSubs: t.maxSubs, snap: t.snap || null, baseTactics: t.baseTactics, drift: t.drift, shape: t.shape, phasePos: t.phasePos, phaseBall: t.phaseBall || {}, pages: t.pages || {}, pageDefaults: t.pageDefaults || {}, scenarios: t.scenarios || [], defScenarios: t.defScenarios || [], rules: t.rules || [],
      scenarioEnd: t.scenarioEnd || {}, scenarioInfo: t.scenarioInfo || {}, scenarioBall: t.scenarioBall || {}, scenarioEvidence: t.scenarioEvidence || {}, scenarioDefEvidence: t.scenarioDefEvidence || {},
      tacticalFamiliarity: t.tacticalFamiliarity || null,
      squad: t.squad.map((p) => { const o = {}; PLAYER_KEYS.forEach((k) => { if (p[k] !== undefined) o[k] = p[k]; }); if (p.baseRatings) o.ratings = p.baseRatings; return o; }),
      players: t.players.map((p) => p.id), bench: t.bench.map((p) => p.id),
    };
  }
  function unpackTeam(t) {
    const squad = t.squad.map((p) => Object.assign({ x: 0, y: 0, vx: 0, vy: 0, yellows: 0 }, p));
    const byId = (id) => squad.find((p) => p.id === id);
    return {
      id: t.id, name: t.name, kit: t.kit, kits: t.kits, style: t.style, strength: t.strength, seed: t.seed, attackDir: 1, formationKey: t.formationKey, formationLabel: t.formationLabel || null,
      tactics: Object.assign(FM.defaultTactics(), t.tactics), subsUsed: t.subsUsed || 0, maxSubs: t.maxSubs || 5, snap: t.snap || null, baseTactics: Object.assign(FM.defaultTactics(), t.baseTactics || t.tactics), drift: t.drift || {}, shape: t.shape || {}, phasePos: t.phasePos || {}, phaseBall: t.phaseBall || {}, pages: t.pages || {}, pageDefaults: t.pageDefaults || {}, scenarios: t.scenarios || [], defScenarios: t.defScenarios || [], rules: t.rules || [],
      scenarioEnd: t.scenarioEnd || {}, scenarioInfo: t.scenarioInfo || {}, scenarioBall: t.scenarioBall || {}, scenarioEvidence: t.scenarioEvidence || {}, scenarioDefEvidence: t.scenarioDefEvidence || {},
      tacticalFamiliarity: t.tacticalFamiliarity || null, tacticalFactor: 1,
      squad, players: t.players.map(byId), bench: t.bench.map(byId), sentOff: [],
    };
  }
  // Each club has a captain. Until the manager names one, it is the most senior, composed player in the squad (an outfield player when there is one).
  FM.captainOf = function (league, team) {
    if (!team) return null;
    const all = (team.players || []).concat(team.bench || []);
    league.captains = league.captains || {};
    const kept = all.find((p) => p.id === league.captains[team.id]);
    if (kept) return kept;
    const score = (p) => (p.ratings ? FM.shown(p.ratings.composure) : 0) + Math.min(10, Math.max(0, (FM.ageOf ? FM.ageOf(p) : 20) - 21)) * 2 + (p.natural === 'GK' ? -25 : 0) + (FM.abilityOf ? FM.abilityOf(p) * 0.3 : 0);
    const best = all.slice().sort((a, b) => score(b) - score(a) || String(a.id).localeCompare(String(b.id)))[0] || null;
    if (best) league.captains[team.id] = best.id;
    return best;
  };
  FM.serializeLeague = function (league) {
    const teams = league.teams.map(packTeam), other = FM.ensureTwoDivisions(league);
    return JSON.stringify({ v: 2, seed: league.seed, runSeed: league.runSeed || 0, tier: league.tier, userId: league.userId, season: league.season, day: league.day, divisionLevel: league.divisionLevel || 1, divisionName: league.divisionName || 'Premier Division', fixtures: league.fixtures, teams, otherLeague: { level: other.level, name: other.name, fixtures: other.fixtures, teams: other.teams.map(packTeam) }, seasonHistory: league.seasonHistory || [], board: league.board || null, boardApproval: Number.isFinite(league.boardApproval) ? league.boardApproval : 50, prepStep: league.prepStep || 0, prepPhaseMax: league.prepPhaseMax || 0, testPhaseMax: league.testPhaseMax || 0, testLog: league.testLog || [], hypotheses: league.hypotheses || [], news: league.news || [], friendlies: league.friendlies || [], labRuns: league.labRuns || [], labCtx: league.labCtx || null, labArchive: league.labArchive || [], phaseLabRuns: league.phaseLabRuns || {}, interviews: league.interviews || [], publicOpinion: Number.isFinite(league.publicOpinion) ? league.publicOpinion : 50, tacticalPlans: league.tacticalPlans || [], activePlanId: league.activePlanId || null, transfer: league.transfer || null, develop: league.develop || null, captains: league.captains || {}, captainIntroSeen: !!league.captainIntroSeen, mp: league.mp || null, biz: league.biz || null });
  };
  FM.deserializeLeague = function (text) {
    const d = JSON.parse(text);
    const teams = d.teams.map(unpackTeam);
    const league = { seed: d.seed, runSeed: d.runSeed || 0, tier: d.tier, userId: d.userId, season: d.season, day: d.day, divisionLevel: d.divisionLevel || 1, divisionName: d.divisionName || 'Premier Division', fixtures: d.fixtures, teams, seasonHistory: d.seasonHistory || [], board: d.board || null, boardApproval: Number.isFinite(d.boardApproval) ? d.boardApproval : 50, prepStep: d.prepStep || 0, prepPhaseMax: d.prepPhaseMax || 0, testPhaseMax: d.testPhaseMax || 0, testLog: d.testLog || [], hypotheses: d.hypotheses || [], news: d.news || [], friendlies: d.friendlies || [], labRuns: d.labRuns || [], labCtx: d.labCtx || null, labArchive: d.labArchive || [], phaseLabRuns: d.phaseLabRuns || {}, interviews: d.interviews || [], publicOpinion: Number.isFinite(d.publicOpinion) ? d.publicOpinion : 50, tacticalPlans: d.tacticalPlans || [], activePlanId: d.activePlanId || null, transfer: d.transfer || null, develop: d.develop || null, captains: d.captains || {}, captainIntroSeen: !!d.captainIntroSeen, mp: d.mp || null, biz: d.biz || null };
    if (d.otherLeague && d.otherLeague.teams) league.otherLeague = { level: d.otherLeague.level, name: d.otherLeague.name, fixtures: d.otherLeague.fixtures || [], teams: d.otherLeague.teams.map(unpackTeam) };
    FM.ensureTwoDivisions(league); FM.setBoardExpectation(league);
    FM.today = d.day;
    // A match that was abandoned part way: put the lineups back as they were before kick-off.
    league.teams.concat(league.otherLeague.teams).forEach((t) => { if (t.snap) { FM.restoreLineup(t, t.snap); t.snap = null; } else FM.resetToKickoff(t); });
    return league;
  };
  // The Create page's "Your projects" list reads this entry (same browser storage), so the season shows up there with a Resume button.
  const PROJECTS_KEY = 'lastmind-create-projects', PROJECT_ID = DEMO_MODE ? 'local-football-demo' : 'local-football-manager';
  FM.syncProject = function (league) {
    try {
      let list = JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]');
      list = list.filter((p) => p.id !== PROJECT_ID);
      if (league) {
        const user = FM.teamById(league, league.userId), played = league.fixtures.filter((f) => f.played && (f.homeId === league.userId || f.awayId === league.userId)).length;
        const pos = FM.tableRows(league).findIndex((r) => r.id === league.userId) + 1;
        const ord = (n) => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) || n % 10 > 3 ? 0 : n % 10]);
        const tier = { gcse: 'GCSE', alevel: 'A-level', above: 'Beyond A-level' }[league.tier] || league.tier;
        list.unshift({ id: PROJECT_ID, title: DEMO_MODE ? 'Lastmind football demo' : 'Be the manager: ' + user.name, kind: DEMO_MODE ? 'football-demo' : 'football-manager', updatedAt: new Date().toISOString(), isReference: false,
          data: { href: DEMO_MODE ? '/create/football/?demo=1' : '/create/football/', meta: DEMO_MODE ? 'Opening match' : 'Season ' + league.season + ' · ' + (played >= 14 ? 'season complete' : played + ' of 14 played') + (played ? ' · ' + ord(pos) + ' in the table' : '') } });
      }
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
    } catch (e) { /* the projects list is a convenience */ }
  };
  // ---- the season is kept on the account as well as in this browser, so it follows the manager to any device ----
  // One saved game per account (the same single slot as the browser copy). The write goes out a moment after each local save, so every change
  // is on the account almost at once; the page also writes straight away when it is closed.
  const OWNER_KEY = SAVE_KEY + '_owner', AT_KEY = SAVE_KEY + '_at', CLOUD_ID_KEY = SAVE_KEY + '_cloud_id';
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* fine */ } };
  // ---- where the game is kept on this device ----
  // The browser's small storage (about 5 MB for the whole site) was full, so saving failed and the season was lost. The game is now kept in
  // the browser's much larger database (IndexedDB). A copy in memory answers straight away; the database write follows, and the Save button
  // waits for it. Anything an older version left in the small storage is moved across and then removed to free the space.
  const mem = new Map();
  let idbPromise = null, writes = Promise.resolve(true), lastWriteOk = true;
  const idb = () => {
    if (!idbPromise) idbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open('lastmind-football', 1);
        req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('saves')) req.result.createObjectStore('saves'); };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch (e) { resolve(null); }
    });
    return idbPromise;
  };
  const idbGet = async (key) => { const d = await idb(); if (!d) return null; return new Promise((res) => { try { const r = d.transaction('saves').objectStore('saves').get(key); r.onsuccess = () => res(r.result == null ? null : r.result); r.onerror = () => res(null); } catch (e) { res(null); } }); };
  const idbPut = async (key, val) => { const d = await idb(); if (!d) return false; return new Promise((res) => { try { const tx = d.transaction('saves', 'readwrite'); tx.objectStore('saves')[val == null ? 'delete' : 'put'](...(val == null ? [key] : [val, key])); tx.oncomplete = () => res(true); tx.onerror = () => res(false); tx.onabort = () => res(false); } catch (e) { res(false); } }); };
  // load a save into memory: from the database, or (once) from the old small storage, moving it across
  async function storeEnsure(key) {
    if (mem.has(key)) return mem.get(key);
    let v = await idbGet(key);
    if (v == null) {
      const old = (() => { try { return localStorage.getItem(key); } catch (e) { return null; } })();
      if (old) { v = old; const ok = await idbPut(key, old); if (ok) { try { localStorage.removeItem(key); } catch (e) { /* fine */ } } }
    }
    mem.set(key, v == null ? null : v);
    return mem.get(key);
  }
  const storeGet = (key) => (mem.has(key) ? mem.get(key) : null);
  function storeSet(key, text) {
    mem.set(key, text);
    writes = writes.then(async () => {
      let ok = await idbPut(key, text);
      if (!ok) { try { localStorage.setItem(key, text); ok = true; } catch (e) { ok = false; } }   // no database in this browser: the small storage, if it has room
      else { try { localStorage.removeItem(key); } catch (e) { /* fine */ } }   // anything an older version left there is no longer needed
      lastWriteOk = ok; return ok;
    });
    return true;
  }
  function storeDrop(key) { mem.set(key, null); writes = writes.then(async () => { await idbPut(key, null); try { localStorage.removeItem(key); } catch (e) { /* fine */ } return true; }); }
  FM.flushStore = async () => { await writes; return lastWriteOk; };
  let accountUid = null;
  FM.accountId = () => accountUid;
  const accountKey = (base) => (!DEMO_MODE && accountUid ? base + ':' + accountUid : base);
  const currentSaveKey = () => accountKey(SAVE_KEY);
  const currentAtKey = () => accountKey(AT_KEY);
  const currentCloudIdKey = () => accountKey(CLOUD_ID_KEY);
  let cloudTimer = 0, cloudBusy = false, cloudAgain = false, cloudLeague = null, replaceNext = false;
  // How far on a season is: the season number and the matches played in it. A save further back never replaces one further on.
  const progressOfLeague = (lg) => (lg.season || 1) * 1000 + lg.fixtures.filter((f) => f.played && (f.homeId === lg.userId || f.awayId === lg.userId)).length;
  const progressOfText = (text) => { try { const d = JSON.parse(text); return (d.season || 1) * 1000 + (d.fixtures || []).filter((f) => f.played && (f.homeId === d.userId || f.awayId === d.userId)).length; } catch (e) { return -1; } };
  FM.leagueProgress = progressOfLeague;
  FM.markReplaceNext = () => { replaceNext = true; };
  async function cloudWrite() {
    const league = cloudLeague; if (!league || DEMO_MODE || !accountUid) return false;
    if (cloudBusy) { cloudAgain = true; return false; }
    cloudBusy = true;
    let ok = false;
    try {
      let text = FM.serializeLeague(league);
      if (text.length > 4400000) {   // too big for the account copy: the oldest match clips (replays) are left out of it, nothing else
        const kept = league.fixtures.map((f) => f.clips);
        const order = league.fixtures.map((f, i) => i).filter((i) => kept[i] && kept[i].length).sort((a, b) => league.fixtures[a].round - league.fixtures[b].round);
        try {
          for (const i of order) { league.fixtures[i].clips = []; text = FM.serializeLeague(league); if (text.length <= 4400000) break; }
        } finally { league.fixtures.forEach((f, i) => { f.clips = kept[i]; }); }
      }
      const user = FM.teamById(league, league.userId);
      const body = { id: lsGet(currentCloudIdKey()) || undefined, title: 'Be the manager: ' + (user ? user.name : 'My club'), kind: 'football-manager', data: { href: '/create/football/', meta: 'Season ' + league.season, football: { save: text, savedAt: new Date().toISOString(), progress: progressOfLeague(league) } } };
      if (replaceNext) body.replace = true;
      const r = await FM.apiCall('POST', '/create/projects', body);
      if (r && r.ok && r.json && r.json.id && r.uid === accountUid) { ok = true; lsSet(currentCloudIdKey(), r.json.id); lsSet(currentAtKey(), new Date().toISOString()); replaceNext = false; }
      else if (r && r.status === 409) { replaceNext = false; FM.cloudRefused = true; }   // the account holds a season further on than this one: the next page open offers it
    } catch (e) { /* the browser copy is still saved; the next change tries again */ }
    cloudBusy = false;
    if (cloudAgain) { cloudAgain = false; cloudTimer = setTimeout(cloudWrite, 800); }
    return ok;
  }
  // The Save button: writes the game to this device and to the account now, and says how it went:
  // 'saved' (both), 'device' (this device only: the account could not be reached) or 'failed'.
  FM.saveNow = async function (league) {
    let local = FM.saveLeagueRaw(league);
    if (local) { FM.syncProject(league); local = await FM.flushStore(); }   // the database write has really finished
    if (DEMO_MODE) return local ? 'saved' : 'failed';
    clearTimeout(cloudTimer); cloudTimer = 0;
    cloudLeague = league;
    for (let i = 0; cloudBusy && i < 80; i++) await new Promise((r) => setTimeout(r, 250));   // let a write already on its way finish first
    const ok = await cloudWrite();
    return local && ok ? 'saved' : local ? 'device' : ok ? 'account' : 'failed';
  };
  FM.cloudSaveSoon = function (league) {
    if (DEMO_MODE) return;
    cloudLeague = league; clearTimeout(cloudTimer); cloudTimer = setTimeout(cloudWrite, 1200);
  };
  window.addEventListener('pagehide', () => { if (cloudLeague && cloudTimer) { clearTimeout(cloudTimer); cloudWrite(); } });
  // Called once as the page opens: when the account holds a newer game than this browser (or this browser's game belongs to a different
  // account), the account's game is loaded here. Resolves quickly if nobody is signed in.
  FM.pullCloud = async function () {
    if (DEMO_MODE) { await storeEnsure(currentSaveKey()); return 'none'; }
    try {
      // Wait for the signed-in account's cloud save. Render can take a while
      // to wake, and an arbitrary browser-side cutoff can open the wrong local
      // state before the account response arrives.
      const list = await FM.apiCall('GET', '/create/projects');
      if (!list) return 'nosession';   // not signed in
      if (list.uid) { accountUid = list.uid; await storeEnsure(currentSaveKey()); }   // the account is known as soon as the sign-in is, even if the server is slow or down
      if (list.netError || list.status >= 500 || list.status === 429 || list.status === 0) return storeGet(currentSaveKey()) ? 'ok' : 'error';   // a game kept on this device still opens
      if (!list.ok || !list.json || list.json.unavailable || !list.uid) return 'none';
      const uid = list.uid;
      // One-time migration from the old device-wide slot, but only when its
      // recorded owner is this exact account. Another account's save is never copied.
      await storeEnsure(currentSaveKey()); await storeEnsure(SAVE_KEY);
      const owner = lsGet(OWNER_KEY), legacyText = storeGet(SAVE_KEY);
      if (!storeGet(currentSaveKey()) && legacyText && (!owner || owner === uid)) {   // the old shared slot: this browser's own game from before saves were kept per account
        storeSet(currentSaveKey(), legacyText); storeDrop(SAVE_KEY);
        if (lsGet(AT_KEY)) lsSet(currentAtKey(), lsGet(AT_KEY));
        if (lsGet(CLOUD_ID_KEY)) lsSet(currentCloudIdKey(), lsGet(CLOUD_ID_KEY));
      }
      const localText = storeGet(currentSaveKey());
      // the season furthest on is the one to carry on with (then the most recently saved)
      const row = (list.json.projects || []).filter((p) => p.kind === 'football-manager').sort((a, b) => ((b.progress || 0) - (a.progress || 0)) || String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
      if (!row) return 'ok';
      const at = lsGet(currentAtKey());
      const localProg = localText ? progressOfText(localText) : -1;
      const cloudNewer = !localText || !at || String(row.updatedAt) > at || (row.progress || 0) > localProg;
      if (!cloudNewer) { lsSet(currentCloudIdKey(), row.id); return 'ok'; }
      const got = await FM.apiCall('GET', '/create/projects/' + encodeURIComponent(row.id));
      if (!got || !got.ok) return localText ? 'ok' : 'error';
      const text = got.json && got.json.data && got.json.data.football && got.json.data.football.save;
      if (!text) return 'ok';
      try { FM.deserializeLeague(text); } catch (e) { return 'ok'; }
      // never swap a season for one that is further back
      if (localText && progressOfText(text) < localProg) { lsSet(currentCloudIdKey(), row.id); return 'ok'; }
      storeSet(currentSaveKey(), text); lsSet(currentAtKey(), String(row.updatedAt)); lsSet(currentCloudIdKey(), row.id);
      return 'ok';
    } catch (e) { return 'error'; }
  };
  FM.saveLeague = function (league) {
    const done = FM.saveLeagueRaw(league);
    if (done) { FM.syncProject(league); FM.cloudSaveSoon(league); }
    return done;
  };
  FM.saveLeagueRaw = function (league) {
    // Paid saves are account-scoped. If identity has not been established,
    // refuse to write into a device-wide slot that another account could see.
    if (!DEMO_MODE && !accountUid) return false;
    try { return storeSet(currentSaveKey(), FM.serializeLeague(league)); } catch (e) { return false; }
  };
  // A game saved before pre-season friendlies existed has none: if no match has been played yet, add them so the reports have data.
  FM.ensureFriendlies = function (league) {
    if (league.fixtures.some((f) => f.played)) return false;
    // the shared league: just load the friendlies that were played in advance
    if (league.seed === FM.WORLD_SEED && FM.PRESEASON) {
      const have = (league.friendlies || []).length === FM.PRESEASON.length && league.friendlies.every((f) => f.played && f.scout);
      if (have) return false;
      league.friendlies = JSON.parse(JSON.stringify(FM.PRESEASON));
      return false;
    }
    // friendlies played before scouting existed have no positions recorded; they change nothing, so before the season they are simply replayed
    const stale = (league.friendlies || []).filter((f) => f.played && !f.scout);
    stale.forEach((f) => { f.played = false; delete f.hg; delete f.ag; delete f.stats; delete f.summary; });
    if ((league.friendlies || []).length) return stale.length > 0;
    const ids = league.teams.map((t) => t.id);
    league.friendlies = makeFixtures(ids, FM.mulberry32(league.seed + 555), league.seed + 555).filter((f) => f.round < 3).map((f, i) => Object.assign(f, { id: 'p' + i, round: f.round - 3, friendly: true }));
    return true;
  };
  // A saved game from before the purely positional roles were removed: each such player takes the nearest role that remains. His
  // instructions and his hand-placed positions are left exactly as they were.
  const ROLE_RENAMES = { wide_centre_half: 'centre_half', libero: 'centre_half', wing_back: 'attacking_full_back', inverted_full_back: 'full_back', half_back: 'defensive_midfielder', mezzala: 'central_midfielder', carrilero: 'central_midfielder', wide_midfielder: 'winger', inverted_winger: 'winger', advanced_forward: 'poacher', false_9: 'striker' };
  FM.migrateRoles = function (team) {
    team.squad.forEach((p) => {
      const to = ROLE_RENAMES[p.roleId];
      if (!to) return;
      p.roleId = to; p.options = {};
      const role = FM.ROLES[to];
      Object.keys(role.options || {}).forEach((k) => { p.options[k] = role.options[k].default != null ? role.options[k].default : false; });
    });
  };
  FM.loadLeague = function () {
    try {
      if (!DEMO_MODE && !accountUid) return null;
      const t = storeGet(currentSaveKey()), lg = t ? FM.deserializeLeague(t) : null;
      if (lg) lg.teams.forEach((tm) => { tm.squad.forEach((p) => FM.backfillPhysique(p)); FM.migrateRoles(tm); }); // saves from before heights existed and before the positional roles went
      FM.syncProject(lg);
      return lg;
    } catch (e) { return null; }
  };
  FM.clearSave = function () {
    storeDrop(currentSaveKey());
    clearTimeout(cloudTimer); cloudLeague = null;
    const id = lsGet(currentCloudIdKey());
    if (id && !DEMO_MODE) { FM.apiCall('DELETE', '/create/projects/' + encodeURIComponent(id)); lsSet(currentCloudIdKey(), null); lsSet(currentAtKey(), null); }
  };
})();
