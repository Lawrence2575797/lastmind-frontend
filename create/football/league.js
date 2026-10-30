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
  // The rest of the pyramid is fully playable too. Their ability bands deliberately overlap: a strong League One side can
  // contain a player good enough for the Championship, while a struggling Championship side can have players at this level.
  FM.THIRD_TEAM_DEFS = [
    { tag: 'The river town club', story: 'A club built around a riverworks community, whose compact old ground is loud whenever a bigger side visits.', name: 'Rivermere FC', style: 'balanced', formation: '4-3-3', strength: -0.4, home: ['#0F766E', '#F8FAFC'], away: ['#F8FAFC', '#0F766E'] },
    { tag: 'The dockyard revival', story: 'Once a fixture of the old industrial league, now rebuilt with academy graduates and a fierce travelling support.', name: 'Portwell United', style: 'press', formation: '4-4-2', strength: -1.0, home: ['#1D4ED8', '#FBBF24'], away: ['#FBBF24', '#1D4ED8'] },
    { tag: 'The hill country side', story: 'A tidy club from the uplands, famous for patient possession football and a pitch that catches every winter storm.', name: 'Highmere Town', style: 'possession', formation: '4-2-3-1', strength: -0.7, home: ['#7C2D12', '#FDE68A'], away: ['#FDE68A', '#7C2D12'] },
    { tag: 'The local rivals', story: 'Born from a breakaway supporters group, they measure every season against the clubs from the neighbouring cities.', name: 'Dunford Borough', style: 'counter', formation: '5-3-2', strength: -1.4, home: ['#6D28D9', '#FFFFFF'], away: ['#FFFFFF', '#6D28D9'] },
    { tag: 'The factory club', story: 'Their steelworks have long gone, but the club still wears the same colours and produces hard-running midfielders.', name: 'Marlowe Steel', style: 'direct', formation: '4-4-2', strength: -0.9, home: ['#374151', '#EF4444'], away: ['#EF4444', '#FFFFFF'] },
    { tag: 'The market town club', story: 'Family-run and quietly ambitious, their careful recruitment has made them regular contenders at this level.', name: 'Fenwick Rovers', style: 'balanced', formation: '4-2-2-2', strength: -0.2, home: ['#166534', '#F3E7C8'], away: ['#F3E7C8', '#166534'] },
    { tag: 'The coastal battlers', story: 'A windy seaside ground, a small budget and an uncompromising team that never gives visitors an easy afternoon.', name: 'Saltwick Athletic', style: 'press', formation: '4-3-3', strength: -1.6, home: ['#0C4A6E', '#FFFFFF'], away: ['#FFFFFF', '#0C4A6E'] },
    { tag: 'The new city project', story: 'Backed by a local consortium, they have invested in coaching and expect to climb quickly through the pyramid.', name: 'Vallerton City', style: 'possession', formation: '4-2-3-1', strength: 0.1, home: ['#BE123C', '#FDE047'], away: ['#FDE047', '#BE123C'] },
  ];
  FM.FOURTH_TEAM_DEFS = [
    { tag: 'The moorland club', story: 'A small club from the edge of the moors, sustained by volunteers and a generation of local players.', name: 'Moorbridge Town', style: 'direct', formation: '4-4-2', strength: -0.8, home: ['#854D0E', '#FFFFFF'], away: ['#FFFFFF', '#854D0E'] },
    { tag: 'The university outsiders', story: 'They share a city with bigger names but have built a loyal following around energetic, technical football.', name: 'Belgrave Athletic', style: 'possession', formation: '4-3-3', strength: -0.3, home: ['#1E40AF', '#E0F2FE'], away: ['#E0F2FE', '#1E40AF'] },
    { tag: 'The railwaymen', story: 'A station-town side with a proud cup history and a patient board that trusts young players to grow.', name: 'Creston Rail', style: 'balanced', formation: '4-2-3-1', strength: -1.1, home: ['#9F1239', '#F8FAFC'], away: ['#F8FAFC', '#9F1239'] },
    { tag: 'The stubborn underdogs', story: 'They have spent decades punching above their weight through organisation, set pieces and a fierce home crowd.', name: 'Oakridge United', style: 'counter', formation: '5-3-2', strength: -1.5, home: ['#365314', '#FACC15'], away: ['#FACC15', '#365314'] },
    { tag: 'The foundry club', story: 'Their modern training ground sits beside a former foundry, and the owners believe steady progress beats quick fixes.', name: 'Ironvale FC', style: 'press', formation: '4-3-3', strength: -0.6, home: ['#334155', '#F97316'], away: ['#F97316', '#334155'] },
    { tag: 'The border county side', story: 'A remote county club with a strong scouting network and a habit of uncovering overlooked talent.', name: 'Kestrel County', style: 'balanced', formation: '4-2-2-2', strength: -0.1, home: ['#0369A1', '#FFFFFF'], away: ['#FFFFFF', '#0369A1'] },
    { tag: 'The night-game specialists', story: 'Their floodlit ground has become an awkward place to visit, particularly for teams unused to their high press.', name: 'Brindle FC', style: 'press', formation: '4-4-2', strength: -1.7, home: ['#4C1D95', '#F3E8FF'], away: ['#F3E8FF', '#4C1D95'] },
    { tag: 'The upwardly mobile club', story: 'Promoted from the regional game only recently, they are ambitious, well coached and backed by an expanding town.', name: 'Norchester Vale', style: 'possession', formation: '4-3-3', strength: 0.2, home: ['#B91C1C', '#FFFFFF'], away: ['#FFFFFF', '#B91C1C'] },
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

  FM.allDivisions = function (league) {
    FM.ensureFourDivisions(league);
    return [{ level: league.divisionLevel, name: league.divisionName, teams: league.teams, fixtures: league.fixtures }].concat(league.otherLeagues || []);
  };
  FM.allTeams = (league) => FM.allDivisions(league).flatMap((d) => d.teams);
  FM.teamById = (league, id) => FM.allTeams(league).find((t) => t.id === id);
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
  FM.clubProfile = (team) => FM.TEAM_DEFS.concat(FM.LOWER_TEAM_DEFS || [], FM.THIRD_TEAM_DEFS || [], FM.FOURTH_TEAM_DEFS || []).find((d) => d.name === (team.origName || team.name)) || { tag: '', story: '' };

  // ---------- creating a season ----------
  FM.WORLD_SEED = 20261004;
  FM.RATING_BASE = 58; FM.STRENGTH_SCALE = 4.5; // the league average starting eleven, and rating points per step of club strength
  FM.createLeague = function (opts) {
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
    const league = { seed, tier: opts.tier || 'gcse', userId: teams[opts.userIndex || 0].id, season: 1, day: 0, nameFix: 2, teams, fixtures: [], testLog: [], hypotheses: [], news: [], tacticalPlans: [], publicOpinion: 50, boardApproval: 50, divisionLevel: 1, divisionName: 'Premier Division', seasonHistory: [] };
    { const ash0 = teams.find((t) => t.name === 'Ashford Rovers'), nor0 = teams.find((t) => t.name === 'Northfield United'); league.fixtures = makeFixtures(teams.map((t) => t.id), rng, seed + runSeed, ash0 && nor0 ? [ash0.id, nor0.id] : null); }
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
    if (league.friendlies && FM.namesFromSquads) FM.namesFromSquads(league, league.friendlies);
    league.runSeed = runSeed;
    FM.ensureTwoDivisions(league);
    // Intentionally created here, rather than repaired into deserializeLeague: the League Cup is for new careers only.
    // Existing saves keep their original season structure exactly as the manager left it.
    league.cup = FM.newCup(league);
    FM.setBoardExpectation(league);
    // a new game replaces the account's saved one: marked on THIS league, so that a save of the old season that happens while the new one is being set up cannot use up the
    // replacement (and leave the new game to be refused as 'further back' than the old one)
    if (FM.markReplaceNext) FM.markReplaceNext(league);
    return league;
  };

  // Circle method: seven rounds where everyone plays once, then the same seven with home and away reversed.
  // `fixed`, when given, is [homeId, awayId]: the match that opens the season, at that ground, which the rest of the schedule is built around
  function makeFixtures(ids, rng, seed, fixed) {
    const order = ids.slice();
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const n = order.length, rounds = [], base = [];
    let ring = order.slice();
    for (let r = 0; r < n - 1; r++) {
      const pairs = [];
      for (let i = 0; i < n / 2; i++) pairs.push([ring[i], ring[n - 1 - i]]);
      base.push(pairs);
      ring = [ring[0], ring[n - 1]].concat(ring.slice(1, n - 1));
    }
    const isFixed = (x, y) => !!fixed && ((x === fixed[0] && y === fixed[1]) || (x === fixed[1] && y === fixed[0]));
    if (fixed) { const r0 = base.findIndex((pairs) => pairs.some(([x, y]) => isFixed(x, y))); if (r0 > 0) { const t = base[0]; base[0] = base[r0]; base[r0] = t; } }
    // Who is at home when. Every club should alternate home and away as far as it can, never more than two in a row of either, and have a fair
    // share of each in either half of the season (so the first half is not mostly home and the second mostly away). The orientation of each pairing is
    // chosen by a randomised search with the second half the mirror of the first, and the best schedule found is used.
    const evalSched = (rs) => {
      const seqs = {}; order.forEach((id) => { seqs[id] = []; });
      rs.concat(rs.map((pairs) => pairs.map(([h, a]) => [a, h]))).forEach((pairs) => pairs.forEach(([h, a]) => { seqs[h].push(1); seqs[a].push(0); }));
      let bad = 0;
      order.forEach((id) => {
        const q = seqs[id]; let run = 1, maxRun = 1;
        for (let i = 1; i < q.length; i++) { run = q[i] === q[i - 1] ? run + 1 : 1; maxRun = Math.max(maxRun, run); }
        const h1 = q.slice(0, n - 1).reduce((x, y) => x + y, 0), lo = Math.floor((n - 1) / 2), hi = Math.ceil((n - 1) / 2);
        bad += Math.max(0, maxRun - 2) * 3 + (h1 < lo || h1 > hi ? 4 : 0);
        for (let i = 1; i < q.length; i++) if (q[i] === q[i - 1]) bad += 0.25;
      });
      return bad;
    };
    let best = null, bestBad = Infinity;
    for (let tries = 0; tries < 4000 && bestBad > 0; tries++) {
      const last = {}; order.forEach((id) => { last[id] = rng() < 0.5 ? 1 : 0; });
      const cand = base.map((pairs) => pairs.map(([x, y]) => {
        // the club that was away last time is the one that goes home, if only one of them wants to; otherwise a coin
        const wx = last[x] === 0 ? 1 : 0, wy = last[y] === 0 ? 1 : 0;
        const xHome = isFixed(x, y) ? x === fixed[0] : wx === wy ? rng() < 0.5 : wx > wy;
        last[x] = xHome ? 1 : 0; last[y] = xHome ? 0 : 1;
        return xHome ? [x, y] : [y, x];
      }));
      const bad = evalSched(cand);
      if (bad < bestBad) { bestBad = bad; best = cand; }
    }
    // then improve it a pairing at a time: turn one fixture round, keep it if the schedule is no worse
    for (let k = 0; k < 6000 && bestBad > 0; k++) {
      const r = Math.floor(rng() * best.length), i = Math.floor(rng() * best[r].length), cand = best.map((pairs) => pairs.map((pr) => pr.slice()));
      if (isFixed(cand[r][i][0], cand[r][i][1])) continue;
      cand[r][i] = [cand[r][i][1], cand[r][i][0]];
      const bad = evalSched(cand);
      if (bad <= bestBad) { bestBad = bad; best = cand; }
    }
    best.forEach((pairs) => rounds.push(pairs));
    const fixtures = [];
    let k = 0;
    const add = (round, h, a) => fixtures.push({ id: 'f' + (k++), round, homeId: h, awayId: a, played: false, hg: null, ag: null, seed: seed + 104729 * k, stats: null });
    rounds.forEach((pairs, r) => pairs.forEach(([h, a]) => add(r, h, a)));
    rounds.forEach((pairs, r) => pairs.forEach(([h, a]) => add(r + n - 1, a, h)));
    return fixtures;
  }

  function makeDivisionTeams(league, defs, prefix, level, ratingBase, seedOffset) {
    const seed = league.seed + seedOffset, rng = FM.mulberry32(seed), used = new Set();
    return defs.map((def, i) => {
      const team = FM.createTeam({ id: prefix + (i + 1), name: def.name, kit: { shirt: def.home[0], number: def.home[1] }, attackDir: 1, formation: def.formation, strength: def.strength, seed: seed + i * 7919 });
      team.kits = { home: def.home, away: def.away }; team.style = def.style;
      team.tactics = styleTactics(def.style, rng); team.baseTactics = Object.assign({}, team.tactics); team.drift = {};
      team.squad.forEach((p) => { const id = FM.generateIdentity(rng, used); p.name = id.name; p.nation = id.nation; p.stats = { apps: 0, goals: 0, shots: 0, yellows: 0, reds: 0 }; });
      const keys = ['pace', 'dribbling', 'passing', 'finishing', 'tackling', 'heading', 'composure', 'stamina'];
      const xiMean = team.players.reduce((a, p) => a + keys.reduce((m, k) => m + p.ratings[k], 0) / keys.length, 0) / team.players.length;
      const shift = Math.round(ratingBase + FM.STRENGTH_SCALE * def.strength - xiMean);
      team.squad.forEach((p) => { keys.forEach((k) => { p.ratings[k] = Math.max(25, Math.min(92, p.ratings[k] + shift)); }); if (p.natural === 'GK') p.ratings.gk = Math.max(40, Math.min(90, p.ratings.gk + shift)); p.maxSpeed = FM.speedFromPace(p.ratings.pace); });
      return team;
    });
  }

  const DIVISION_NAMES = { 1: 'Premier Division', 2: 'Championship', 3: 'League One', 4: 'League Two' };
  const divisionConfig = [
    { level: 1, name: DIVISION_NAMES[1], defs: () => FM.TEAM_DEFS, prefix: 't', ratingBase: FM.RATING_BASE, seed: 1 },
    { level: 2, name: DIVISION_NAMES[2], defs: () => FM.LOWER_TEAM_DEFS, prefix: 'l', ratingBase: FM.RATING_BASE - 5, seed: 88001 },
    { level: 3, name: DIVISION_NAMES[3], defs: () => FM.THIRD_TEAM_DEFS, prefix: 'm', ratingBase: FM.RATING_BASE - 10, seed: 176003 },
    { level: 4, name: DIVISION_NAMES[4], defs: () => FM.FOURTH_TEAM_DEFS, prefix: 'n', ratingBase: FM.RATING_BASE - 15, seed: 264007 },
  ];
  const makeDivision = (league, cfg) => {
    const teams = makeDivisionTeams(league, cfg.defs(), cfg.prefix, cfg.level, cfg.ratingBase, cfg.seed);
    return { level: cfg.level, name: cfg.name, teams, fixtures: makeFixtures(teams.map((t) => t.id), FM.mulberry32(league.seed + cfg.seed + 110), league.seed + cfg.seed + 200) };
  };

  FM.ensureFourDivisions = function (league) {
    if (!league.divisionLevel) league.divisionLevel = 1;
    if (!league.divisionName) league.divisionName = DIVISION_NAMES[league.divisionLevel] || DIVISION_NAMES[1];
    if (!Number.isFinite(league.boardApproval)) league.boardApproval = 50;
    league.seasonHistory = league.seasonHistory || [];
    // Old saves had one parallel division. Keep it exactly as it was, and add the two new populated tiers around it.
    const existing = Array.isArray(league.otherLeagues) ? league.otherLeagues.slice() : (league.otherLeague && league.otherLeague.teams ? [league.otherLeague] : []);
    const byLevel = new Map(existing.filter((d) => d && d.teams && d.teams.length === 8).map((d) => [Number(d.level), d]));
    const needed = [1, 2, 3, 4].filter((level) => level !== league.divisionLevel);
    league.otherLeagues = needed.map((level) => {
      const old = byLevel.get(level);
      if (old) { old.level = level; old.name = old.name || DIVISION_NAMES[level]; old.fixtures = old.fixtures || makeFixtures(old.teams.map((t) => t.id), FM.mulberry32(league.seed + level * 991), league.seed + level * 997); return old; }
      return makeDivision(league, divisionConfig.find((c) => c.level === level));
    });
    // Compatibility for older multiplayer and saved-game helpers. New solo code always uses otherLeagues/allDivisions.
    league.otherLeague = league.otherLeagues.find((d) => d.level === (league.divisionLevel === 1 ? 2 : league.divisionLevel - 1)) || league.otherLeagues[0];
    return league.otherLeague;
  };
  FM.ensureTwoDivisions = FM.ensureFourDivisions;

  FM.divisionTableRows = function (division) {
    return FM.tableRows({ teams: division.teams, fixtures: division.fixtures });
  };

  // What the board expect of the club this season. It is worked out once at the start of every season and then held for that season (the board's mood is judged
  // against it every matchday, so it must not move under the manager's feet). It depends on how strong the squad is now against the rest of the division, on
  // how last season ended (a good finish raises expectations, a poor one lowers them; promotion and relegation reset them) and, a little, on the board's own
  // temperament that year. A game saved before this existed gets its expectation worked out the first time it is opened.
  const ordinal = (n) => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) || n % 10 > 3 ? 0 : n % 10]);
  FM.setBoardExpectation = function (league, force) {
    league.board = league.board || {};
    const b = league.board, n = league.teams.length;
    const words = (e) => (e <= 2 ? 'Challenge for the title' : e <= 4 ? 'Finish in the top half' : e <= 6 ? 'Stay clear of relegation' : 'Fight to stay up');
    if (!force && b.expectedPosition && b.expectSeason === league.season && b.expectDivision === league.divisionName) { b.expectation = words(b.expectedPosition); b.division = league.divisionName; return; }
    const teamRating = (t) => {
      try { const r = t.squad.map((p) => FM.playerRating(p)).filter(Number.isFinite).sort((x, y) => y - x).slice(0, 14); return r.length ? r.reduce((x, y) => x + y, 0) / r.length : (t.strength || 0); } catch (e) { return t.strength || 0; }
    };
    const rankBy = (f) => league.teams.slice().sort((x, y) => f(y) - f(x)).findIndex((t) => t.id === league.userId) + 1;
    const rankNow = Math.max(1, rankBy(teamRating)), rankBase = Math.max(1, rankBy((t) => t.strength || 0));
    const me = league.teams.find((t) => t.id === league.userId);
    const hist = (league.seasonHistory || [])[(league.seasonHistory || []).length - 1];
    const lastPos = league.biz && league.biz.seasons && league.biz.seasons.length ? league.biz.seasons[league.biz.seasons.length - 1].pos : null;
    let exp = Math.round(0.65 * rankNow + 0.35 * rankBase), reason;
    const squadText = 'the squad ranks ' + ordinal(rankNow) + ' of ' + n + ' on ability';
    if (hist && me && (hist.promoted || []).indexOf(me.name) >= 0) { exp = Math.max(exp, Math.min(n, 5)); reason = 'The club has just been promoted, so the board want to establish themselves in the ' + league.divisionName + ': ' + squadText + '.'; }
    else if (hist && me && (hist.relegated || []).indexOf(me.name) >= 0) { exp = Math.min(exp, 2); reason = 'The club has just been relegated, so the board expect an immediate return: ' + squadText + '.'; }
    else if (lastPos) { exp = Math.round(0.5 * exp + 0.5 * lastPos); reason = 'Last season ended ' + ordinal(lastPos) + ' and ' + squadText + ', so the board expect ' + ordinal(Math.max(1, Math.min(n, exp))) + ' or better.'; }
    else reason = 'The board judge the club by its squad, which ranks ' + ordinal(rankNow) + ' of ' + n + ' on ability (the table has not told them anything else yet).';
    // the board's temperament that year: some seasons they are more ambitious, some more cautious (the same every time the season is opened)
    const r = FM.mulberry32((league.seed || 1) + (league.runSeed || 0) + league.season * 977 + 61)();
    if (r < 0.2) { exp -= 1; reason += ' They are in an ambitious mood this year.'; } else if (r > 0.8) { exp += 1; reason += ' They are feeling cautious this year.'; }
    exp = Math.max(1, Math.min(n, exp));
    b.expectedPosition = exp; b.expectation = words(exp); b.division = league.divisionName; b.expectSeason = league.season; b.expectDivision = league.divisionName; b.expectReason = reason;
  };

  FM.approvalBand = function (n) {
    n = Math.round(Number.isFinite(n) ? n : 50);
    return n >= 85 ? 'Outstanding' : n >= 70 ? 'Very good' : n >= 58 ? 'Good' : n >= 45 ? 'Stable' : n >= 32 ? 'Under pressure' : n >= 18 ? 'On the brink' : 'Critical';
  };

  // ---------- calendar ----------
  FM.userFixtureToday = function (league) {
    const cup = FM.cupUserFixture && FM.cupUserFixture(league);
    if (cup) return cup;
    const r = FM.roundOfDay(league.day);
    if (r == null) return null;
    return league.fixtures.find((f) => f.round === r && (f.homeId === league.userId || f.awayId === league.userId)) || null;
  };
  FM.nextUserFixture = function (league) {
    const cup = FM.cupUserFixture && FM.cupUserFixture(league);
    if (cup) return cup;
    return league.fixtures.find((f) => !f.played && (f.homeId === league.userId || f.awayId === league.userId)) || null;
  };
  FM.seasonOver = (league) => league.fixtures.every((f) => f.played) && (!league.cup || league.cup.completed);
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

  // ---------- League Cup (new saves only) ----------
  FM.newCup = function (league) { return { name: 'League Cup', entrants: FM.allTeams(league).map((t) => t.id), stages: [
    { key: 'r32', label: 'Round of 32', afterLeagueRound: 0 }, { key: 'r16', label: 'Round of 16', afterLeagueRound: 3 },
    { key: 'qf', label: 'Quarter-finals', afterLeagueRound: 6 }, { key: 'sf', label: 'Semi-finals', afterLeagueRound: 9 }, { key: 'final', label: 'Final', afterLeagueRound: 13 },
  ], activeKey: null, drawPending: 'r32', completed: false, draws: [], fixtures: [] }; };
  FM.cupStage = (league, key) => league.cup && league.cup.stages.find((s) => s.key === key);
  FM.cupUserFixture = function (league) {
    const cup = league.cup;
    if (!cup || cup.completed || !cup.activeKey) return null;
    return (cup.fixtures || []).find((f) => f.stage === cup.activeKey && !f.played && (f.homeId === league.userId || f.awayId === league.userId)) || null;
  };
  FM.cupNeedsDrawAfterRound = function (league, round) {
    const cup = league.cup;
    if (!cup || cup.completed || !cup.drawPending) return null;
    const stage = FM.cupStage(league, cup.drawPending);
    return stage && stage.afterLeagueRound === round ? stage : null;
  };
  const cupWinner = (fx) => fx.shootout ? fx.shootout.winnerId : (fx.hg > fx.ag ? fx.homeId : fx.awayId);
  FM.cupDraw = function (league, key, order) {
    const cup = league.cup, stage = FM.cupStage(league, key);
    if (!cup || !stage || cup.drawPending !== key) return null;
    const previous = cup.stages[cup.stages.findIndex((s) => s.key === key) - 1];
    const entrants = previous ? cup.fixtures.filter((f) => f.stage === previous.key && f.played).map(cupWinner) : cup.entrants.slice();
    if (!entrants.length || entrants.length % 2) return null;
    const rng = FM.mulberry32(league.seed + (league.runSeed || 0) * 31 + league.season * 1009 + cup.draws.length * 917);
    const shuffled = order && order.length === entrants.length ? order.slice() : entrants.slice().sort(() => rng() - 0.5);
    const fixtures = [];
    for (let i = 0; i < shuffled.length; i += 2) fixtures.push({ id: 'cup-' + key + '-' + (i / 2), cup: true, stage: key, round: stage.afterLeagueRound, homeId: shuffled[i], awayId: shuffled[i + 1], played: false, hg: null, ag: null, seed: league.seed + league.season * 100000 + cup.draws.length * 1000 + i * 37 });
    cup.fixtures.push(...fixtures); cup.draws.push({ key, entrants: shuffled.slice() }); cup.activeKey = key; cup.drawPending = null;
    return { stage, entrants: shuffled, fixtures };
  };
  function cupQuickResult(league, fx) {
    FM.quickFixture(league, fx);
    if (fx.hg === fx.ag) {
      const rng = FM.mulberry32((fx.seed || 1) + 4444), homeWins = rng() < 0.5;
      fx.shootout = { home: 3 + Math.floor(rng() * 3), away: 3 + Math.floor(rng() * 3), winnerId: homeWins ? fx.homeId : fx.awayId, summary: 'won on penalties' };
      if (fx.shootout.home === fx.shootout.away) fx.shootout[homeWins ? 'home' : 'away']++;
    }
  }
  FM.completeCupFixture = async function (league, fx, match, onResult) {
    FM.finishFixture(league, fx, match);
    const cup = league.cup;
    for (const other of cup.fixtures.filter((f) => f.stage === fx.stage && !f.played)) { cupQuickResult(league, other); if (onResult) await onResult(other, league, true); }
    const stageIndex = cup.stages.findIndex((s) => s.key === fx.stage), next = cup.stages[stageIndex + 1];
    cup.activeKey = null;
    if (next) cup.drawPending = next.key;
    else {
      cup.completed = true;
      const winner = FM.teamById(league, cupWinner(fx));
      if (FM.pushNews) FM.pushNews(league, { round: fx.round, day: league.day, kind: 'League Cup', headline: (winner ? winner.name : 'The winners') + ' lift the League Cup', body: 'The League Cup final is complete. Open this article to see the completed tournament tree.', cupTree: true, cupWinner: winner && winner.name, mine: cupWinner(fx) === league.userId });
    }
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
    FM.today = league.day; FM.curLeague = league;
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
      fx.stats[t.id].edge = match.edgeN ? Math.round(100 * (match.edgeSum[t.id] || 0) / match.edgeN) / 100 : 0;   // the tactical edge the club had, on average
    });
    fx.scout = FM.scoutSummary(match);
    if (match.oppLog) fx.oppLog = match.oppLog.slice(-8);
    [home, away].forEach((t) => { if (!FM.isHuman(league, t.id)) t.rules = []; });   // an opposing manager's rules are for this match only
    // A friendly leaves everything else alone: only the result and team figures are kept (with the goalscorers, for the reports).
    if (fx.friendly) {
      if (FM.summariseMatch) fx.summary = FM.summariseMatch(league, fx, match);
      // The managed club's friendlies keep their log too, so the statistics have numbers to work on before the first league match.
      if (FM.isWatched(league, fx.homeId) || FM.isWatched(league, fx.awayId)) fx.log = FM.compactLog(match);
      [home, away].forEach((t) => { FM.fitnessEnd(t, new Set()); t.attackDir = t === home ? 1 : -1; FM.restoreLineup(t, t.snap); t.snap = null; delete t.liveBase; delete t.liveLean; });
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
    if (FM.updateMomentum) FM.updateMomentum(league, fx, match, played);   // form and momentum follow the result and how each player did
    // minutes on the pitch, which is what a player's development follows
    { const mins = new Map(); [home, away].forEach((t) => match.starters[t.id].forEach((id) => mins.set(id, 90)));
      match.events.forEach((e) => {
        const team = e.team === home.id ? home : e.team === away.id ? away : null; if (!team || (e.type !== 'sub' && e.type !== 'keeperSwap')) return;
        const on = find(team, e.on), off = e.off != null ? find(team, e.off) : null, m = Math.max(0, Math.min(90, (e.t || 0) / 60));
        if (off && mins.has(off.id)) mins.set(off.id, m);
        if (on) mins.set(on.id, Math.max(0, 90 - m));
      });
      [home, away].forEach((t) => t.squad.forEach((p) => { p.lastMins = mins.get(p.id) || 0; })); }
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
    [home, away].forEach((t) => { FM.fitnessEnd(t, played); t.attackDir = t === home ? 1 : -1; FM.restoreLineup(t, t.snap); t.snap = null; delete t.liveBase; delete t.liveLean; });
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

  // A result for a match nobody will watch or study: the other division's games. Played properly each one costs seconds of the browser's time; this is a result worked out from how
  // good the two squads are (their best eleven), with the usual spread of scores, in an instant. It fills in what the tables and the league page read (the score and the team figures).
  FM.quickFixture = function (league, fx) {
    const home = FM.teamById(league, fx.homeId), away = FM.teamById(league, fx.awayId), rng = FM.mulberry32((fx.seed || 1) + 7919);
    const quality = (t) => { const r = (t.squad || []).filter((p) => !FM.isInjured || !FM.isInjured(p)).map((p) => FM.playerRating(p, p.group || p.natural)).sort((a, b) => b - a).slice(0, 11); return r.length ? r.reduce((a, b) => a + b, 0) / r.length : 7; };
    const qh = quality(home), qa = quality(away), clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const lh = clamp(1.35 * Math.exp(0.45 * (qh - qa)), 0.3, 3.6), la = clamp(1.05 * Math.exp(0.45 * (qa - qh)), 0.25, 3.2);
    const poisson = (lam) => { const L = Math.exp(-lam); let k = 0, p = 1; do { k++; p *= rng(); } while (p > L && k < 12); return k - 1; };
    const hg = poisson(lh), ag = poisson(la);
    fx.played = true; fx.hg = hg; fx.ag = ag;
    const share = clamp(0.5 + 0.35 * (qh - qa), 0.3, 0.7);
    fx.stats = {};
    [[home, hg, lh, share], [away, ag, la, 1 - share]].forEach(([t, g, lam, sh]) => {
      const shots = Math.max(g, Math.round(lam * 7 + rng() * 5)), onTarget = Math.max(g, Math.min(shots, Math.round(shots * 0.38 + rng() * 2)));
      fx.stats[t.id] = { goals: g, shots, onTarget, possession: Math.round(5400 * sh), passes: Math.round(340 + 280 * sh + rng() * 60), passesOk: Math.round((340 + 280 * sh) * (0.74 + 0.1 * sh)), xg: Math.round(lam * 100) / 100, formation: FM.formationName ? FM.formationName(t) : t.formationKey, tactics: Object.assign({}, t.tactics), edge: 0 };
    });
  };

  // The other matches of the round, played while the user's own match is on the screen. They are the same matches, with the same seeds and the same engine, only
  // played in short slices between the live match's frames instead of one after another at the end, so there is little left to wait for at the full-time whistle.
  // A slice is a few milliseconds when the live match is running (so it stays smooth), longer when it is paused, and long once it has finished.
  FM.roundBackground = function (league, userFx) {
    const tasks = [], done = [];
    league.fixtures.filter((f) => f.round === userFx.round && !f.played && f !== userFx).forEach((f) => tasks.push({ lg: league, fx: f, other: false }));
    let shadow = null;
    try {
      FM.allDivisions(league).filter((d) => d.level !== league.divisionLevel).forEach((od) => {
        const shadow = { seed: league.seed + 44000 + od.level * 701, runSeed: league.runSeed || 0, day: league.day, userId: '__none__', teams: od.teams, fixtures: od.fixtures, news: [], friendlies: [], captains: {} };
        od.fixtures.filter((f) => f.round === userFx.round && !f.played).forEach((f) => tasks.push({ lg: shadow, fx: f, other: true }));
      });
    } catch (e) { shadow = null; }
    let cur = null, timer = 0, stopped = false;
    const ctl = { done, shadow, finished: false };
    // steps whatever is being played for about ms milliseconds; returns true while there is more to do
    const pump = (ms) => {
      if (stopped || ctl.finished) return false;
      const t0 = performance.now(), keep = [FM.curLeague, FM.today];
      try {
        while (performance.now() - t0 < ms) {
          if (!cur) {
            const t = tasks.shift(); if (!t) { ctl.finished = true; return false; }
            if (t.other) { FM.quickFixture(t.lg, t.fx); done.push({ fx: t.fx, lg: t.lg, other: true }); continue; }
            FM.curLeague = t.lg; FM.today = t.lg.day;
            cur = { t, match: FM.startFixture(t.lg, t.fx), guard: 0 };
          }
          FM.curLeague = cur.t.lg; FM.today = cur.t.lg.day;
          for (let i = 0; i < 40 && cur.match.phase !== 'fulltime' && cur.guard++ < 200000; i++) {
            if (cur.match.phase === 'halftime') FM.startSecondHalf(cur.match);
            FM.stepMatch(cur.match, 0.25);   // the coarser step the pre-season friendlies use: nobody is watching, and it is two and a half times as quick
          }
          if (cur.match.phase === 'fulltime' || cur.guard >= 200000) { FM.finishFixture(cur.t.lg, cur.t.fx, cur.match); done.push({ fx: cur.t.fx, lg: cur.t.lg, other: cur.t.other }); cur = null; }
        }
      } finally { FM.curLeague = keep[0]; FM.today = keep[1]; }
      return true;
    };
    // state() says how the live match is doing: { alive, paused, over }
    let looping = false;
    ctl.start = function (state) {
      looping = true;
      // the browser's idle time: between two frames of the live match there is nearly always a few milliseconds nobody is using
      // (a page nobody is looking at gets no idle callbacks and no frames, so there a plain timer is used, with longer slices)
      const later = (f) => (window.requestIdleCallback && !document.hidden ? window.requestIdleCallback(f, { timeout: 150 }) : setTimeout(() => f({ timeRemaining: () => (document.hidden ? 40 : 7) }), document.hidden ? 20 : 30));
      const loop = () => later((d) => {
        if (!looping || stopped || ctl.finished) return;
        const s = state() || {};
        if (!s.alive) { ctl.stop(); return; }
        const room = Math.max(0, (d.timeRemaining ? d.timeRemaining() : 7) - 1.5);
        pump(s.over ? 50 : Math.min(room, s.paused ? 40 : 12));
        loop();
      });
      loop();
    };
    ctl.stop = function () { stopped = true; looping = false; clearInterval(timer); };
    // plays whatever is left (the match in progress, then the rest), each one reported as it finishes
    ctl.drain = async function (onResult) {
      looping = false; clearInterval(timer); stopped = false;
      for (let n = 0; n < done.length; n++) if (onResult) await onResult(done[n].fx, done[n].lg, done[n].other, true);
      let shown = done.length;
      while (pump(document.hidden ? 200 : 25)) {
        while (shown < done.length) { if (onResult) await onResult(done[shown].fx, done[shown].lg, done[shown].other, false); shown++; }
        await new Promise((r) => setTimeout(r, 0));
      }
      while (shown < done.length) { if (onResult) await onResult(done[shown].fx, done[shown].lg, done[shown].other, false); shown++; }
      stopped = true;
    };
    return ctl;
  };

  // After the user's match: record it, then play the rest of that round (most of it has usually been played already, see roundBackground).
  FM.completeRound = async function (league, userFx, userMatch, onResult, bg) {
    if (userFx && userFx.cup) return FM.completeCupFixture(league, userFx, userMatch, onResult);
    FM.finishFixture(league, userFx, userMatch);
    if (bg) await bg.drain(onResult);
    for (const fixture of league.fixtures.filter((f) => f.round === userFx.round && !f.played)) { await FM.simulateFixtureAsync(league, fixture, 0.25); if (onResult) await onResult(fixture, league, false); }
    // Every other tier plays on the same matchday too. They use the quick engine because nobody is managing them,
    // but their squads, results, tables and players are all real and persist through promotion and transfers.
    for (const other of FM.allDivisions(league).filter((d) => d.level !== league.divisionLevel)) {
      const shadow = { seed: league.seed + 44000 + other.level * 701, runSeed: league.runSeed || 0, day: league.day, userId: '__none__', teams: other.teams, fixtures: other.fixtures, news: [], friendlies: [], captains: {} };
      for (const fixture of other.fixtures.filter((f) => f.round === userFx.round && !f.played)) { FM.quickFixture(shadow, fixture); if (onResult) await onResult(fixture, shadow, true); }
    }
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
    // How much the table says depends on how much of the season has been played: sixth after two games is nothing to worry about, sixth after ten is.
    const stage = Math.max(0.2, Math.min(1.2, played / 10));
    const positionScore = (expected - pos) * 1.15 * stage;
    const pointsRate = played ? mine.pts / played : 1.35;
    const resultScore = (pointsRate - 1.35) * 1.5 * stage;
    const target = Math.max(8, Math.min(92, 52 + (expected - pos) * 7 + (pointsRate - 1.35) * 12));
    const before = Number.isFinite(league.boardApproval) ? league.boardApproval : 50;
    league.boardApproval = Math.max(0, Math.min(100, Math.round((before + Math.max(-4, Math.min(4, positionScore + resultScore)) + (target - before) * 0.08 * stage) * 10) / 10));
    league.board.currentPosition = pos; league.board.points = mine ? mine.pts : 0; league.board.played = played;
  };

  function resetClubForSeason(team) {
    team.squad.forEach((p) => {
      p.stats = { apps: 0, goals: 0, shots: 0, yellows: 0, reds: 0 };
      p.condition = 1; p.form = (p.form || 0) * 0.5; delete p.injury; p.age = FM.ageOf ? FM.ageOf(p) + 1 : (p.age || 24) + 1;
      if (p.contract != null) p.contract = Math.max(1, p.contract - 1);
    });
    team.momentum = (team.momentum || 0) * 0.5;
    team.drift = {}; team.rules = []; team.scenarios = []; team.defScenarios = []; team.scenarioEvidence = {}; team.scenarioDefEvidence = {};
    // Summer interrupts the rhythm, but a club does not forget its entire base.
    if (team.tacticalFamiliarity) { team.tacticalFamiliarity.score = Math.max(75, Math.round(team.tacticalFamiliarity.score * 0.9)); team.tacticalFamiliarity.delta = 0; }
    FM.resetToKickoff(team);
  }

  FM.startNextSeason = function (league) {
    if (!FM.seasonOver(league)) return false;
    const divisions = FM.allDivisions(league).map((d) => Object.assign({}, d, { rows: FM.divisionTableRows(d) })).sort((a, b) => a.level - b.level);
    const promoted = [], relegated = [], movement = [];
    const outgoingUp = {}, outgoingDown = {};
    divisions.forEach((d, i) => {
      if (i > 0) { const ids = d.rows.slice(0, 2).map((r) => r.id); outgoingUp[d.level] = ids; promoted.push(...ids); movement.push(...d.rows.slice(0, 2).map((r) => r.name + ' promoted from ' + d.name)); }
      if (i < divisions.length - 1) { const ids = d.rows.slice(-2).map((r) => r.id); outgoingDown[d.level] = ids; relegated.push(...ids); movement.push(...d.rows.slice(-2).map((r) => r.name + ' relegated from ' + d.name)); }
    });
    const nextDivisions = divisions.map((d, i) => {
      const stay = d.teams.filter((t) => (outgoingUp[d.level] || []).indexOf(t.id) < 0 && (outgoingDown[d.level] || []).indexOf(t.id) < 0);
      const fromAbove = i > 0 ? divisions[i - 1].teams.filter((t) => (outgoingDown[divisions[i - 1].level] || []).indexOf(t.id) >= 0) : [];
      const fromBelow = i < divisions.length - 1 ? divisions[i + 1].teams.filter((t) => (outgoingUp[divisions[i + 1].level] || []).indexOf(t.id) >= 0) : [];
      return { level: d.level, name: DIVISION_NAMES[d.level], teams: stay.concat(fromAbove, fromBelow) };
    });
    const oldPos = divisions.find((d) => d.level === league.divisionLevel).rows.findIndex((r) => r.id === league.userId) + 1;
    const userLevel = nextDivisions.find((d) => d.teams.some((t) => t.id === league.userId)).level;
    league.seasonHistory = league.seasonHistory || [];
    league.seasonHistory.push({ season: league.season, champion: divisions[0].rows[0].name, promoted: promoted.map((id) => divisions.flatMap((d) => d.rows).find((r) => r.id === id).name), relegated: relegated.map((id) => divisions.flatMap((d) => d.rows).find((r) => r.id === id).name), movements: movement, divisions: divisions.map((d) => ({ level: d.level, name: d.name, rows: d.rows })) });
    league.season += 1; league.day = 0; FM.today = 0; league.divisionLevel = userLevel; league.divisionName = DIVISION_NAMES[userLevel];
    nextDivisions.forEach((d) => { d.fixtures = makeFixtures(d.teams.map((t) => t.id), FM.mulberry32(league.seed + league.season * 1709 + d.level), league.seed + league.season * 97003 + d.level); });
    const active = nextDivisions.find((d) => d.level === userLevel);
    league.teams = active.teams; league.fixtures = active.fixtures;
    league.otherLeagues = nextDivisions.filter((d) => d.level !== userLevel);
    league.otherLeague = league.otherLeagues.find((d) => d.level === (userLevel === 1 ? 2 : userLevel - 1)) || league.otherLeagues[0];
    // Only careers which started with the cup receive it again; older saves have no cup property and remain cup-free.
    if (league.cup) league.cup = FM.newCup(league);
    nextDivisions.flatMap((d) => d.teams).forEach(resetClubForSeason);
    league.friendlies = []; league.prepStep = 0; league.prepPhaseMax = 0; league.testPhaseMax = 0; league.labRuns = []; league.phaseLabRuns = {}; league.testLog = []; league.hypotheses = [];
    FM.setBoardExpectation(league);
    league.board.currentPosition = null; league.board.points = 0; league.board.played = 0;
    if (FM.bizNewSeason) FM.bizNewSeason(league);
    league.boardApproval = Math.max(0, Math.min(100, (Number.isFinite(league.boardApproval) ? league.boardApproval : 50) + (promoted.indexOf(league.userId) >= 0 ? 6 : relegated.indexOf(league.userId) >= 0 ? -8 : 0)));
    const tr = FM.transfer ? FM.transfer(league) : league.transfer;
    if (tr) {
      tr.deals = {}; tr.offers = []; tr.shortlist = []; tr.ai = {}; tr.listed = tr.listed || {}; tr.opening = false;
      const me = FM.teamById(league, league.userId), bill = me.squad.reduce((a, p) => a + (FM.wageOf ? FM.wageOf(p) : 0), 0);
      nextDivisions.flatMap((d) => d.teams).forEach((t) => {
        const wages = t.squad.reduce((a, p) => a + (FM.wageOf ? FM.wageOf(p) : 0), 0);
        const level = nextDivisions.find((d) => d.teams.indexOf(t) >= 0).level;
        if (!Number.isFinite(tr.budget[t.id])) tr.budget[t.id] = Math.round((level === 1 ? 12 : level === 2 ? 5 : level === 3 ? 2.5 : 1.2) * 10) / 10;
        if (!Number.isFinite(tr.wageBudget[t.id])) tr.wageBudget[t.id] = Math.round((wages + (level === 1 ? 25 : level === 2 ? 12 : level === 3 ? 7 : 4)) * 10) / 10;
      });
      const performance = userLevel === 1 ? Math.max(0, 9 - oldPos) * 1.4 : userLevel === 2 ? Math.max(0, 9 - oldPos) * 0.75 : Math.max(0, 9 - oldPos) * 0.4;
      const status = userLevel === 1 ? (promoted.indexOf(me.id) >= 0 ? 9 : 12) : userLevel === 2 ? 5 : userLevel === 3 ? 2.5 : 1.2;
      tr.budget[me.id] = Math.round((status + performance + Math.max(0, (tr.budget[me.id] || 0) * 0.2)) * 10) / 10;
      tr.wageBudget[me.id] = Math.round((bill + (userLevel === 1 ? 30 : userLevel === 2 ? 14 : userLevel === 3 ? 8 : 5) + performance * 1.5) * 10) / 10;
    }
    league.news = league.news || [];
    league.news.push({ round: -1, day: 0, kind: 'League', headline: 'Season ' + league.season + ' begins in the ' + league.divisionName, body: promoted.indexOf(league.userId) >= 0 ? 'Promotion brings a new division, a larger budget and a tougher board target.' : relegated.indexOf(league.userId) >= 0 ? 'Relegation resets the target, budget and recruitment challenge for the season ahead.' : 'The board has set its target and confirmed the new season budgets.', club: league.userId, mine: true });
    return true;
  };

  // ---------- saving ----------
  const PLAYER_KEYS = ['id', 'number', 'natural', 'name', 'nation', 'ratings', 'height', 'foot', 'maxSpeed', 'roleId', 'options', 'index', 'slotKey', 'group', 'stats', 'origGk', 'emergencyKeeper', 'instr', 'note', 'condition', 'injury', 'relapse', 'form', 'wage', 'contract', 'joined', 'age', 'pot', 'side'];
  function packTeam(t) {
    return {
      id: t.id, name: t.name, kit: t.kit, kits: t.kits, style: t.style, strength: t.strength, seed: t.seed, formationKey: t.formationKey, formationLabel: t.formationLabel || null, tactics: t.tactics,
      subsUsed: t.subsUsed, maxSubs: t.maxSubs, snap: t.snap || null, baseTactics: t.baseTactics, drift: t.drift, shape: t.shape, phasePos: t.phasePos, phaseBall: t.phaseBall || {}, pages: t.pages || {}, pageDefaults: t.pageDefaults || {}, scenarios: t.scenarios || [], defScenarios: t.defScenarios || [], rules: t.rules || [],
      scenarioEnd: t.scenarioEnd || {}, scenarioInfo: t.scenarioInfo || {}, scenarioBall: t.scenarioBall || {}, scenarioEvidence: t.scenarioEvidence || {}, scenarioDefEvidence: t.scenarioDefEvidence || {},
      tacticalFamiliarity: t.tacticalFamiliarity || null, momentum: t.momentum || 0,
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
      tacticalFamiliarity: t.tacticalFamiliarity || null, tacticalFactor: 1, momentum: t.momentum || 0,
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
    const teams = league.teams.map(packTeam); FM.ensureFourDivisions(league);
    const otherLeagues = (league.otherLeagues || []).map((d) => ({ level: d.level, name: d.name, fixtures: d.fixtures, teams: d.teams.map(packTeam) }));
    return JSON.stringify({ v: 4, cid: league.cid || undefined, saveName: league.saveName || undefined, nameFix: league.nameFix || 0, seed: league.seed, runSeed: league.runSeed || 0, tier: league.tier, userId: league.userId, season: league.season, day: league.day, divisionLevel: league.divisionLevel || 1, divisionName: league.divisionName || 'Premier Division', fixtures: league.fixtures, teams, otherLeagues, otherLeague: otherLeagues[0], cup: league.cup || null, seasonHistory: league.seasonHistory || [], workbench: league.workbench || null, skin: league.skin || null, injuryLog: league.injuryLog || [], board: league.board || null, boardApproval: Number.isFinite(league.boardApproval) ? league.boardApproval : 50, prepStep: league.prepStep || 0, prepPhaseMax: league.prepPhaseMax || 0, testPhaseMax: league.testPhaseMax || 0, testLog: league.testLog || [], hypotheses: league.hypotheses || [], news: league.news || [], friendlies: league.friendlies || [], labRuns: league.labRuns || [], labCtx: league.labCtx || null, labArchive: league.labArchive || [], phaseLabRuns: league.phaseLabRuns || {}, interviews: league.interviews || [], publicOpinion: Number.isFinite(league.publicOpinion) ? league.publicOpinion : 50, tacticalPlans: league.tacticalPlans || [], activePlanId: league.activePlanId || null, transfer: league.transfer || null, develop: league.develop || null, captains: league.captains || {}, captainIntroSeen: !!league.captainIntroSeen, mp: league.mp || null, biz: league.biz || null });
  };
  FM.deserializeLeague = function (text) {
    const d = JSON.parse(text);
    const teams = d.teams.map(unpackTeam);
    const league = { cid: d.cid || undefined, saveName: typeof d.saveName === 'string' ? d.saveName : undefined, nameFix: d.nameFix || 0, seed: d.seed, runSeed: d.runSeed || 0, tier: d.tier, userId: d.userId, season: d.season, day: d.day, divisionLevel: d.divisionLevel || 1, divisionName: d.divisionName || 'Premier Division', fixtures: d.fixtures, teams, cup: d.cup || null, seasonHistory: d.seasonHistory || [], workbench: d.workbench || null, skin: d.skin || null, injuryLog: d.injuryLog || [], board: d.board || null, boardApproval: Number.isFinite(d.boardApproval) ? d.boardApproval : 50, prepStep: d.prepStep || 0, prepPhaseMax: d.prepPhaseMax || 0, testPhaseMax: d.testPhaseMax || 0, testLog: d.testLog || [], hypotheses: d.hypotheses || [], news: d.news || [], friendlies: d.friendlies || [], labRuns: d.labRuns || [], labCtx: d.labCtx || null, labArchive: d.labArchive || [], phaseLabRuns: d.phaseLabRuns || {}, interviews: d.interviews || [], publicOpinion: Number.isFinite(d.publicOpinion) ? d.publicOpinion : 50, tacticalPlans: d.tacticalPlans || [], activePlanId: d.activePlanId || null, transfer: d.transfer || null, develop: d.develop || null, captains: d.captains || {}, captainIntroSeen: !!d.captainIntroSeen, mp: d.mp || null, biz: d.biz || null };
    if (Array.isArray(d.otherLeagues)) league.otherLeagues = d.otherLeagues.filter((x) => x && x.teams).map((x) => ({ level: x.level, name: x.name, fixtures: x.fixtures || [], teams: x.teams.map(unpackTeam) }));
    else if (d.otherLeague && d.otherLeague.teams) league.otherLeague = { level: d.otherLeague.level, name: d.otherLeague.name, fixtures: d.otherLeague.fixtures || [], teams: d.otherLeague.teams.map(unpackTeam) };
    FM.ensureFourDivisions(league); FM.setBoardExpectation(league);
    if (FM.fixStaleNames) FM.fixStaleNames(league);   // friendlies written with the earlier player names (see name_fix.js)
    if (FM.installSkin) FM.installSkin(league.skin || null);   // a saved game with a league setting reads its history from that setting
    FM.today = d.day;
    // A match that was abandoned part way: put the lineups back as they were before kick-off.
    FM.allTeams(league).forEach((t) => { if (t.snap) { FM.restoreLineup(t, t.snap); t.snap = null; } else FM.resetToKickoff(t); });
    return league;
  };
  // The Create page's "Your projects" list reads this entry (same browser storage), so the season shows up there with a Resume button.
  const PROJECTS_KEY = 'lastmind-create-projects', PROJECT_IDS = { solo: DEMO_MODE ? 'local-football-demo' : 'local-football-manager', mp: 'local-football-mp' };
  FM.syncProject = function (league, which0) {
    try {
      const which = league ? (league.mp ? 'mp' : 'solo') : (which0 || mode), PROJECT_ID = PROJECT_IDS[which];
      let list = JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]');
      list = list.filter((p) => p.id !== PROJECT_ID);
      if (league && which === 'mp') {
        const user = FM.teamById(league, league.userId);
        list.unshift({ id: PROJECT_ID, title: 'Multiplayer: ' + (user ? user.name : 'My club'), kind: 'football-manager', updatedAt: new Date().toISOString(), isReference: false,
          data: { href: '/create/football/?game=mp', meta: league.mp.kind === 'match' ? 'Multiplayer match' : 'Multiplayer league · season ' + league.season } });
      } else if (league) {
        const user = FM.teamById(league, league.userId), played = league.fixtures.filter((f) => f.played && (f.homeId === league.userId || f.awayId === league.userId)).length;
        const pos = FM.tableRows(league).findIndex((r) => r.id === league.userId) + 1;
        const ord = (n) => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) || n % 10 > 3 ? 0 : n % 10]);
        const tier = { gcse: 'GCSE Maths', alevel: 'A-level Maths', above: 'Beyond A-level' }[league.tier] || league.tier;
        list.unshift({ id: PROJECT_ID, title: DEMO_MODE ? 'Lastmind football demo' : league.saveName || 'Be the manager: ' + user.name, kind: DEMO_MODE ? 'football-demo' : 'football-manager', updatedAt: new Date().toISOString(), isReference: false,
          data: { href: DEMO_MODE ? '/create/football/?demo=1' : '/create/football/?game=solo', meta: DEMO_MODE ? 'Opening match' : 'Season ' + league.season + ' · ' + (played >= 14 ? 'season complete' : played + ' of 14 played') + (played ? ' · ' + ord(pos) + ' in the table' : '') } });
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
  // A single-player season and a multiplayer game are kept as two separate saves, each on this device and on the account (kind 'football-manager'
  // and 'football-mp'). `mode` is the one that is open; the other stays exactly as it was.
  const MP_KEY = 'lm_football_mpsave_v1', MODE_KEY = 'lm_football_active_mode';
  let mode = 'solo';
  const baseOf = (m) => ((m || mode) === 'mp' ? MP_KEY : SAVE_KEY);
  const saveKey = (m) => accountKey(baseOf(m));
  const atKey = (m) => accountKey(baseOf(m) + '_at');
  const cloudIdKey = (m) => accountKey(baseOf(m) + '_cloud_id');
  const currentSaveKey = () => saveKey();
  const currentAtKey = () => atKey();
  const currentCloudIdKey = () => cloudIdKey();
  function setMode(m) {
    if (DEMO_MODE) return;
    if (m !== mode) { mode = m; knownProgress = null; }
    lsSet(accountKey(MODE_KEY), m);
  }
  FM.activeMode = () => mode;
  let cloudTimer = 0, cloudBusy = false, cloudAgain = false, cloudLeague = null, replaceNext = false, cloudDirty = false;   // cloudDirty: this device has a change the account does not have yet
  // How far on a season is: the season number and the matches played in it. A save further back never replaces one further on.
  const progressOfLeague = (lg) => (lg.season || 1) * 1000 + lg.fixtures.filter((f) => f.played && (f.homeId === lg.userId || f.awayId === lg.userId)).length;
  const progressOfText = (text) => { try { const d = JSON.parse(text); return (d.season || 1) * 1000 + (d.fixtures || []).filter((f) => f.played && (f.homeId === d.userId || f.awayId === d.userId)).length; } catch (e) { return -1; } };
  FM.leagueProgress = progressOfLeague;
  let replaceLeague = null;
  // A new game is a save of its own: it gets its own row on the account the first time it is written, and the seasons already saved stay where they are (Your projects lists
  // every one, each can be resumed or deleted). Each game carries the id of its row (league.cid), so any device that opens it writes to the same row.
  FM.markReplaceNext = (lg) => { if (lg) { replaceLeague = lg; delete lg.cid; } else replaceNext = true; lsSet(accountKey(SAVE_KEY + '_prefer'), null); lsSet(cloudIdKey('solo'), null); lsSet(atKey('solo'), null); };
  async function cloudWrite() {
    const league = cloudLeague; if (!league || DEMO_MODE || !accountUid) return false;
    if (cloudBusy) { cloudAgain = true; return false; }
    cloudBusy = true; cloudDirty = false;
    let ok = false, refused = false;
    try {
      let text = FM.serializeLeague(league);
      // the size is measured as the server measures it: the save is sent as a string inside JSON, which escapes every quote
      if (JSON.stringify(text).length > 4700000) {   // too big for the account copy: the oldest match clips (replays) are left out of it, nothing else
        const kept = league.fixtures.map((f) => f.clips);
        const order = league.fixtures.map((f, i) => i).filter((i) => kept[i] && kept[i].length).sort((a, b) => league.fixtures[a].round - league.fixtures[b].round);
        try {
          for (const i of order) { league.fixtures[i].clips = []; text = FM.serializeLeague(league); if (JSON.stringify(text).length <= 4700000) break; }
        } finally { league.fixtures.forEach((f, i) => { f.clips = kept[i]; }); }
      }
      const user = FM.teamById(league, league.userId), m = league.mp ? 'mp' : 'solo';
      const body = { id: league.cid || (league.mp ? lsGet(cloudIdKey(m)) : (replaceLeague === league ? undefined : lsGet(cloudIdKey(m)))) || undefined, title: league.saveName || (m === 'mp' ? 'Multiplayer: ' : 'Be the manager: ') + (user ? user.name : 'My club'), kind: m === 'mp' ? 'football-mp' : 'football-manager', data: { href: m === 'mp' ? '/create/football/?game=mp' : '/create/football/?game=solo', meta: (m === 'mp' ? 'Multiplayer · season ' : 'Season ') + league.season, football: { save: text, savedAt: new Date().toISOString(), progress: progressOfLeague(league) } } };
      const replacing = m === 'mp' && (replaceNext || (replaceLeague && replaceLeague === league));
      if (replacing) body.replace = true;
      const r = await FM.apiCall('POST', '/create/projects', body);
      if (r && r.ok && r.json && r.json.id && r.uid === accountUid) { ok = true; league.cid = r.json.id; if (m === 'mp' || cloudLeague === league) lsSet(cloudIdKey(m), r.json.id); lsSet(atKey(m), r.json.updatedAt || new Date().toISOString()); replaceNext = false; if (replaceLeague === league) replaceLeague = null; }
      else if (r && r.status === 409) { replaceNext = false; if (replaceLeague === league) replaceLeague = null; refused = true; FM.cloudRefused = true; }   // the account holds a season further on than this one: the next page open offers it
    } catch (e) { /* the browser copy is still saved; the next change tries again */ }
    cloudBusy = false;
    if (!ok && !refused) cloudDirty = true;   // not on the account yet: the next change, or the page being hidden, tries again
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
    cloudLeague = league; cloudDirty = true; clearTimeout(cloudTimer); cloudTimer = setTimeout(cloudWrite, 1200);
  };
  // A phone often suspends a page without ever sending pagehide, so the moment the page is hidden anything not yet on the account is sent. When the page
  // comes back after a while (another device may have moved the game on), the account is asked whether it holds a newer save, and if it does and this
  // device has nothing unsent, the page asks to reload and take it (FM.remoteNewer).
  let hiddenAt = 0;
  const flushHidden = () => { if (cloudLeague && cloudDirty) { clearTimeout(cloudTimer); cloudTimer = 0; cloudWrite(); } };
  window.addEventListener('pagehide', flushHidden);
  document.addEventListener('visibilitychange', () => {
    if (DEMO_MODE) return;
    if (document.hidden) { hiddenAt = Date.now(); flushHidden(); }
    else if (hiddenAt && Date.now() - hiddenAt > 10000) { hiddenAt = 0; FM.checkRemote(); }
  });
  FM.checkRemote = async function () {
    try {
      if (DEMO_MODE || !accountUid || cloudBusy || cloudDirty) return false;
      const list = await FM.apiCall('GET', '/create/projects');
      if (!list || !list.ok || !list.json || !list.uid || list.uid !== accountUid || cloudBusy || cloudDirty) return false;
      const kind = mode === 'mp' ? 'football-mp' : 'football-manager', id = lsGet(cloudIdKey());
      const rows = (list.json.projects || []).filter((p) => p.kind === kind);
      const row = rows.find((p) => p.id === id) || rows.sort((a, b) => ((b.progress || 0) - (a.progress || 0)) || String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
      if (!row) return false;
      const at = Date.parse(lsGet(atKey()) || ''), theirs = Date.parse(row.updatedAt);
      const newer = Number.isFinite(theirs) && (!Number.isFinite(at) || theirs > at + 1500) && (row.progress || 0) >= (knownProgress || 0);
      if (newer && FM.remoteNewer) FM.remoteNewer();
      return newer;
    } catch (e) { return false; }
  };
  // Called once as the page opens: when the account holds a newer game than this browser (or this browser's game belongs to a different
  // account), the account's game is loaded here. Resolves quickly if nobody is signed in.
  FM.pullCloud = async function () {
    if (DEMO_MODE) { await storeEnsure(saveKey('solo')); return 'none'; }
    try {
      // Wait for the signed-in account's cloud save. Render can take a while
      // to wake, and an arbitrary browser-side cutoff can open the wrong local
      // state before the account response arrives.
      const list = await FM.apiCall('GET', '/create/projects');
      if (!list) return 'nosession';   // not signed in
      if (list.uid) { accountUid = list.uid; await storeEnsure(saveKey('solo')); await storeEnsure(saveKey('mp')); }   // the account is known as soon as the sign-in is, even if the server is slow or down
      if (list.netError || list.status >= 500 || list.status === 429 || list.status === 0) return storeGet(saveKey('solo')) || storeGet(saveKey('mp')) ? 'ok' : 'error';   // a game kept on this device still opens
      if (!list.ok || !list.json || list.json.unavailable || !list.uid) return 'none';
      try { await pullOne(list, 'mp'); } catch (e) { /* the multiplayer game opens from this device; the next page open tries again */ }
      return pullOne(list, 'solo');
    } catch (e) { return 'error'; }
  };
  async function pullOne(list, m) {
    {
      const uid = list.uid, sk = saveKey(m), ak = atKey(m), ck = cloudIdKey(m);
      // One-time migration from the old device-wide slot, but only when its
      // recorded owner is this exact account. Another account's save is never copied.
      await storeEnsure(sk);
      if (m === 'solo') {
        await storeEnsure(SAVE_KEY);
        const owner = lsGet(OWNER_KEY), legacyText = storeGet(SAVE_KEY);
        if (!storeGet(sk) && legacyText && (!owner || owner === uid)) {   // the old shared slot: this browser's own game from before saves were kept per account
          storeSet(sk, legacyText); storeDrop(SAVE_KEY);
          if (lsGet(AT_KEY)) lsSet(ak, lsGet(AT_KEY));
          if (lsGet(CLOUD_ID_KEY)) lsSet(ck, lsGet(CLOUD_ID_KEY));
        }
      }
      const localText = storeGet(sk);
      // the season furthest on is the one to carry on with (then the most recently saved)
      const kind = m === 'mp' ? 'football-mp' : 'football-manager';
      const rows = (list.json.projects || []).filter((p) => p.kind === kind).sort((a, b) => ((m === 'mp' ? (b.progress || 0) - (a.progress || 0) : 0)) || String(b.updatedAt).localeCompare(String(a.updatedAt)));
      let row;
      if (m === 'mp') { const chosen = null; row = (chosen && rows.find((p) => p.id === chosen)) || rows[0]; }
      else {
        // single-player: every game is its own row. This device carries on with the game it holds (the id travels inside the save), and a device with nothing takes the one saved last.
        const held = (() => { try { return (localText && JSON.parse(localText).cid) || lsGet(ck) || null; } catch (e) { return lsGet(ck) || null; } })();
        row = rows.find((p) => p.id === held) || (!localText ? rows[0] : null);
        if (held && !rows.find((p) => p.id === held)) { lsSet(ck, null); lsSet(ak, null); }   // its row is gone from the account (deleted elsewhere): the game on this device is kept and written as a new one
      }
      if (!row) return 'ok';
      const at = lsGet(ak);
      const localProg = localText ? progressOfText(localText) : -1; knownProgress = Math.max(0, localProg);
      const cloudNewer = !localText || !at || !(Date.parse(at) >= Date.parse(row.updatedAt) - 1500) || (row.progress || 0) > localProg;   // by the server's own time, not this device's clock
      if (!cloudNewer) { lsSet(ck, row.id); return 'ok'; }
      const got = await FM.apiCall('GET', '/create/projects/' + encodeURIComponent(row.id));
      if (!got || !got.ok) return localText ? 'ok' : 'error';
      const text = got.json && got.json.data && got.json.data.football && got.json.data.football.save;
      if (!text) return 'ok';
      try { FM.deserializeLeague(text); } catch (e) { return 'ok'; }
      // never swap a season for one that is further back
      if (localText && progressOfText(text) < localProg) { lsSet(ck, row.id); return 'ok'; }
      storeSet(sk, text); lsSet(ak, String(row.updatedAt)); lsSet(ck, row.id);
      return 'ok';
    }
  }

  // ---- finding an earlier season, and bringing it back ----
  // Every season this device or the account still holds: the saves kept in this browser (under any account, and the archive of seasons that a new game
  // replaced), the account's saved game, and the backups the server keeps of every season that was replaced. Nothing is ever deleted by looking.
  const peekSave = (text) => {
    try {
      const d = JSON.parse(text), me = (d.teams || []).find((t) => t.id === d.userId), played = (d.fixtures || []).filter((f) => f.played && (f.homeId === d.userId || f.awayId === d.userId)).length;
      return { club: me ? me.name : 'a club', season: d.season || 1, played, tier: d.tier, bytes: text.length, skin: d.skin ? d.skin.title : '', mpKind: d.mp ? (d.mp.kind || 'league') : '' };
    } catch (e) { return null; }
  };
  const idbKeys = async () => { const d = await idb(); if (!d) return []; return new Promise((res) => { try { const r = d.transaction('saves').objectStore('saves').getAllKeys(); r.onsuccess = () => res(r.result || []); r.onerror = () => res([]); } catch (e) { res([]); } }); };
  // The games saved on this device for the signed-in account, one per kind: { solo, mp } (null where there is none).
  FM.savedGames = async function () {
    const out = { solo: null, mp: null };
    if (!DEMO_MODE && !accountUid) return out;
    for (const m of ['solo', 'mp']) { await storeEnsure(saveKey(m)); const t = storeGet(saveKey(m)); out[m] = t ? peekSave(t) : null; }
    return out;
  };
  FM.listSavedSeasons = async function () {
    const out = [], keys = new Set((await idbKeys()).map(String));
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf(SAVE_KEY) === 0 && !/_(owner|at|cloud_id|prefer)(:|$)/.test(k)) keys.add(k); } } catch (e) { /* fine */ }
    for (const k of keys) {
      if (k.indexOf(SAVE_KEY) !== 0 || /_(owner|at|cloud_id|prefer)(:|$)/.test(k)) continue;
      let text = await idbGet(k); if (text == null) text = lsGet(k); if (!text) continue;
      const pk = peekSave(text); if (!pk) continue;
      out.push(Object.assign({ source: 'device', key: k, current: k === saveKey('solo'), archive: k.indexOf(':archive:') >= 0, otherAccount: k !== saveKey('solo') && k.indexOf(':archive:') < 0, progress: pk.season * 1000 + pk.played, at: (k.split(':archive:')[1] || '').split(':')[1] || null }, pk));
    }
    let cloud = null;
    if (!DEMO_MODE) {
      const list = await FM.apiCall('GET', '/create/projects');
      if (list && list.ok && list.json && Array.isArray(list.json.projects)) cloud = list.json.projects.filter((p) => p.kind === 'football-manager' || p.kind === 'football-backup').map((p) => ({ source: 'account', id: p.id, backup: p.kind === 'football-backup', title: p.title, updatedAt: p.updatedAt, progress: p.progress || 0, season: Math.floor((p.progress || 0) / 1000), played: (p.progress || 0) % 1000 }));
    }
    return { device: out.sort((a, b) => b.progress - a.progress), account: cloud, signedIn: !!(cloud || accountUid) };
  };
  // What is saved here now is kept before anything replaces it with a season that is further back (a new game, or a restore).
  let knownProgress = null;
  const KEEP_ARCHIVES = 8;
  function archiveCurrent() {
    if (mode === 'mp') return;   // only a single-player season is archived
    const key = currentSaveKey(), cur = storeGet(key); if (!cur) return;
    const pk = peekSave(cur); if (!pk || pk.season * 1000 + pk.played < 1001) return;   // nothing was played: nothing to keep
    const mine = SAVE_KEY + ':archive:' + (accountUid || 'x') + ':';
    storeSet(mine + Date.now(), cur);
    idbKeys().then((all) => all.map(String).filter((k) => k.indexOf(mine) === 0).sort().slice(0, -KEEP_ARCHIVES).forEach((k) => storeDrop(k)));
  }
  // Open one particular saved game (Your projects sends the manager here with ?save=<id>): it becomes the game on this device, and carries on writing to its own row.
  FM.openSave = async function (id) {
    if (DEMO_MODE || !accountUid || !id) return false;
    try {
      const got = await FM.apiCall('GET', '/create/projects/' + encodeURIComponent(id));
      const row = got && got.ok && got.json, text = row && row.data && row.data.football && row.data.football.save;
      if (!text || row.kind !== 'football-manager') return false;
      const lg = FM.deserializeLeague(text); if (lg.mp) return false;
      if (lsGet(cloudIdKey('solo')) !== id) archiveCurrent();
      lg.cid = id; storeSet(saveKey('solo'), FM.serializeLeague(lg));
      await FM.flushStore();
      lsSet(cloudIdKey('solo'), id); lsSet(atKey('solo'), String(row.updatedAt || new Date().toISOString()));
      setMode('solo'); knownProgress = progressOfLeague(lg);
      return true;
    } catch (e) { return false; }
  };
  FM.restoreSavedSeason = async function (entry) {
    if (DEMO_MODE || !accountUid) return { ok: false, error: 'Sign in to LastMind first.' };
    let text = null;
    if (entry.source === 'device') { text = await idbGet(entry.key); if (text == null) text = lsGet(entry.key); }
    else { const got = await FM.apiCall('GET', '/create/projects/' + encodeURIComponent(entry.id)); text = got && got.ok && got.json && got.json.data && got.json.data.football && got.json.data.football.save; }
    if (!text) return { ok: false, error: 'That save could not be read.' };
    let lg; try { lg = FM.deserializeLeague(text); } catch (e) { return { ok: false, error: 'That save is damaged and cannot be opened.' }; }
    setMode('solo');   // a recovered season is a single-player season
    archiveCurrent();
    storeSet(currentSaveKey(), text); knownProgress = progressOfLeague(lg);
    const wrote = await FM.flushStore();
    clearTimeout(cloudTimer); cloudTimer = 0; cloudLeague = lg; replaceNext = true;
    for (let i = 0; cloudBusy && i < 80; i++) await new Promise((r) => setTimeout(r, 250));
    const synced = await cloudWrite();
    lsSet(accountKey(SAVE_KEY + '_prefer'), lsGet(currentCloudIdKey()) || null);   // this season stays the account's, even though another copy may be further on
    FM.syncProject(lg);
    return { ok: !!wrote, device: !!wrote, account: synced };
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
    try {
      setMode(league.mp ? 'mp' : 'solo');   // a game is saved to its own slot, whichever was open before
      const now = progressOfLeague(league);
      if (knownProgress == null) { const cur = storeGet(currentSaveKey()); knownProgress = cur ? progressOfText(cur) : 0; }
      if (knownProgress > now && !DEMO_MODE) archiveCurrent();   // a season further on is about to be replaced: it is kept first
      knownProgress = now;
      return storeSet(currentSaveKey(), FM.serializeLeague(league));
    } catch (e) { return false; }
  };
  // A game saved before pre-season friendlies existed has none: if no match has been played yet, add them so the reports have data.
  // Pre-season friendlies that name a club which is not in this division (it was relegated, or promoted away) cannot be shown or played: they go.
  FM.dropStrangeFriendlies = function (league) {
    const ids = new Set((league.teams || []).map((t) => t.id));
    if ((league.friendlies || []).some((f) => !ids.has(f.homeId) || !ids.has(f.awayId))) league.friendlies = (league.friendlies || []).filter((f) => ids.has(f.homeId) && ids.has(f.awayId));
    if (league.friendlies && league.friendlies.length < 4 && (league.season || 1) > 1 && !league.fixtures.some((f) => f.played)) league.friendlies = [];   // too few left to mean anything: they are made afresh
  };
  FM.ensureFriendlies = function (league) {
    FM.dropStrangeFriendlies(league);
    if (league.fixtures.some((f) => f.played)) return false;
    // the shared league: just load the friendlies that were played in advance
    if (league.seed === FM.WORLD_SEED && FM.PRESEASON && (league.season || 1) === 1) {
      const have = (league.friendlies || []).length === FM.PRESEASON.length && league.friendlies.every((f) => f.played && f.scout);
      if (have) return false;
      league.friendlies = JSON.parse(JSON.stringify(FM.PRESEASON));
      if (FM.namesFromSquads) FM.namesFromSquads(league, league.friendlies);   // the pre-played friendlies name players as they are now
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
  // want: 'solo' or 'mp' opens that saved game; with none given, the one played last (or the only one there is).
  FM.loadLeague = function (want) {
    try {
      if (!DEMO_MODE && !accountUid) return null;
      let m = want === 'mp' || want === 'solo' ? want : (lsGet(accountKey(MODE_KEY)) === 'mp' ? 'mp' : 'solo');
      const other = m === 'mp' ? 'solo' : 'mp';
      if (!DEMO_MODE && want !== 'mp' && want !== 'solo' && !storeGet(saveKey(m)) && storeGet(saveKey(other))) m = other;
      setMode(m);
      let t = storeGet(saveKey(m)), lg = t ? FM.deserializeLeague(t) : null;
      if (lg && lg.mp && m === 'solo' && !DEMO_MODE && !storeGet(saveKey('mp'))) {   // a multiplayer game saved before it had its own slot: moved there
        storeSet(saveKey('mp'), t); storeDrop(saveKey('solo'));
        const cid = lsGet(cloudIdKey('solo')), at = lsGet(atKey('solo'));
        if (cid) { lsSet(cloudIdKey('mp'), cid); lsSet(cloudIdKey('solo'), null); }
        if (at) { lsSet(atKey('mp'), at); lsSet(atKey('solo'), null); }
        FM.syncProject(null, 'solo'); m = 'mp'; setMode('mp');
      }
      if (lg && !lg.mp && m === 'solo' && !DEMO_MODE) { const k = lsGet(cloudIdKey('solo')); if (!lg.cid && k) lg.cid = k; else if (lg.cid && lg.cid !== k) lsSet(cloudIdKey('solo'), lg.cid); }
      if (lg) FM.dropStrangeFriendlies(lg);
      if (lg) lg.teams.forEach((tm) => { tm.squad.forEach((p) => FM.backfillPhysique(p)); FM.migrateRoles(tm); }); // saves from before heights existed and before the positional roles went
      FM.syncProject(lg, m);
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
