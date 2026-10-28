// Match, step 2: the ball, and what players do with it.
//
// How decisions work: the manager's instructions (directness, risk, tempo, pressing) and the
// player's role decide what KIND of action is favoured. The player does not look for the best
// football action on his own. The outcome of each action is then a probability worked out from
// the positions the tactics created (passing lane, pressure, space) and the player's ratings.
// Every action is logged with the numbers that applied, for the Analysis Centre later.
(function () {
  const FM = (window.FM = window.FM || {});
  const { L, W } = FM.PITCH;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const sig = (x) => 1 / (1 + Math.exp(-x));

  const HALF_SECONDS = 45 * 60, FULL_SECONDS = 90 * 60;
  const KICKOFF_PAUSE = 3;

  // Distance from point p to the segment a-b, and where along it (0 to 1) the nearest point is.
  function segInfo(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy || 1e-9;
    const t = clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
    const cx = ax + t * dx, cy = ay + t * dy;
    return { d: Math.hypot(px - cx, py - cy), t, cx, cy };
  }

  // ---------- probabilities ----------
  // Pass: shorter, with a clear lane and a free receiver, from a better passer, is likelier to work.
  // (A rating is read through FM.sk: softened, weighted and moved by form; edge is the side's tactical edge, see edge.js.)
  const SK = (p, k) => (FM.sk ? FM.sk(p, k) : (p.ratings[k] - 60));
  const clampP = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  FM.passProb = function (passer, distance, lane, press, edge) {
    return clampP(sig(3.1 + 0.04 * SK(passer, 'passing') - 0.04 * distance - 2.2 * Math.exp(-lane / 2) - 1.0 * Math.exp(-press / 3) + 0.45 * (edge || 0)), 0.1, 0.96);
  };
  // Dribble past the nearest defender.
  FM.dribbleProb = function (carrier, defDist, defender, edge) {
    const dfn = defender ? 0.03 * SK(defender, 'tackling') : 0;
    return clampP(sig((FM.TAKEON_BASE == null ? 0.25 : FM.TAKEON_BASE) + 0.05 * SK(carrier, 'dribbling') - 1.8 * Math.exp(-defDist / 2.5) - dfn + 0.35 * (edge || 0)), 0.05, 0.85);
  };
  // Tackle: the defender's tackling against the carrier's dribbling.
  FM.tackleProb = function (defender, carrier, edge) {
    return clampP(sig((FM.TACKLE_BASE == null ? -0.1 : FM.TACKLE_BASE) + 0.05 * (SK(defender, 'tackling') - SK(carrier, 'dribbling')) + 0.35 * (edge || 0)), 0.08, 0.88);
  };
  // Expected goals from a shooting position: the wider the goal looks from there, the better the chance.
  FM.shotAngle = function (x, y, attackDir) {
    const gx = attackDir === 1 ? L : 0;
    const dx = Math.max(0.5, Math.abs(gx - x)), dy = y - W / 2;
    return Math.abs(Math.atan2(dy + 3.66, dx) - Math.atan2(dy - 3.66, dx));
  };
  FM.xgLogit = function (shooter, x, y, attackDir, defDist, edge) {
    // Centre-forwards occupy the best areas but are also the defence's first
    // marking priority. Nearest-defender distance alone misses that attention,
    // which previously made almost every goal belong to a striker.
    const marking = shooter.group === 'ST' ? 2.2 : (shooter.group === 'WF' || shooter.group === 'AM' ? -.08 : 0);
    return -6.2 + 7.35 * FM.shotAngle(x, y, attackDir) + 0.026 * SK(shooter, 'finishing') - 1.05 * Math.exp(-defDist / 2) - marking + 0.8 * (edge || 0);
  };

  // ---------- roles' tendencies when on the ball ----------
  const GROUP_DRIBBLE = { GK: -1.2, CB: -0.3, FB: 0, DM: -0.1, CM: 0, AM: 0.1, WF: 0.25, ST: 0.05 };
  const ROLE_DRIBBLE = { winger: 0.15, inside_forward: 0.2, advanced_playmaker: 0.05, box_to_box: 0.1 };
  const ROLE_RISK = { advanced_playmaker: 0.2, deep_lying_playmaker: 0.15, number_10: 0.2, sweeper_keeper: 0.1, anchor: -0.2, defensive_full_back: -0.15, centre_half: -0.1, goalkeeper: -0.1 };

  // ---------- match ----------
  FM.createMatch = function (home, away, seed) {
    const match = {
      home, away, teams: [home, away],
      rng: FM.mulberry32(seed || 1),
      seed: seed || 1,
      clock: 0, phase: 'kickoff', kickoffTimer: KICKOFF_PAUSE, kickoffTeam: home,
      score: {},
      ball: { x: L / 2, y: W / 2, state: 'carried' },
      carrier: null, flight: null, carry: null, lastTeam: home,
      fixedStepRemainder: 0,
      events: [], aiTeams: [], aiSubStep: {}, nextAiCheck: 1200,
      stats: {}, heat: { next: 0, ball: new Array(FM.HEAT.GX * FM.HEAT.GY).fill(0), teams: {}, players: {} },
    };
    home.attackDir = 1; away.attackDir = -1;
    match.score[home.id] = 0; match.score[away.id] = 0;
    match.stats[home.id] = blankStats(); match.stats[away.id] = blankStats();
    FM.beginKickoff(match, home);
    return match;
  };
  // Where the ball and the players are, sampled every two seconds, on a 21 by 14 grid. Players are recorded in their own
  // team's space (attacking left to right), the ball on the actual pitch. Heatmaps and territory come from these counts.
  FM.HEAT = { GX: 21, GY: 14 };
  const heatCell = (u, v) => Math.min(FM.HEAT.GY - 1, Math.max(0, Math.floor(v * FM.HEAT.GY))) * FM.HEAT.GX + Math.min(FM.HEAT.GX - 1, Math.max(0, Math.floor(u * FM.HEAT.GX)));
  // Scouting: every two seconds, note which phase of play each team is in and where each player stands (in his team's space).
  // Afterwards this shows how a club really lines up in build-up, the press and so on, from the matches it has played.
  function scoutPhase(match, team) {
    const ctx = team.phaseCtx || {};
    if (ctx.transAtt > 0.05) return 'transAtt';
    if (ctx.transDef > 0.05) return 'transDef';
    const mine = match.lastTeam === team;
    if (mine) {
      const d = FM.toTeamSpace(team.attackDir, match.ball.x, match.ball.y).d;
      return d < 0.33 ? 'build' : d < 0.7 ? 'midfield' : 'final';
    }
    const opp = other(match, team);
    return FM.toTeamSpace(opp.attackDir, match.ball.x, match.ball.y).d < 0.33 ? 'press' : 'without';
  }
  function sampleScout(match) {
    if (!match.scout) match.scout = {};
    match.teams.forEach((team) => {
      const ph = scoutPhase(match, team);
      const book = match.scout[team.id] || (match.scout[team.id] = {});
      const row = book[ph] || (book[ph] = {});
      team.players.forEach((p) => {
        const k = team.formationKey + '|' + p.slotKey, ts = FM.toTeamSpace(team.attackDir, p.x, p.y);
        const c = row[k] || (row[k] = [0, 0, 0]);
        c[0]++; c[1] += ts.d; c[2] += ts.w;
      });
    });
  }
  // Compact form for storing with the fixture: for each phase and slot, the sample count and the average position.
  FM.scoutSummary = function (match) {
    const out = {};
    Object.keys(match.scout || {}).forEach((tid) => {
      out[tid] = {};
      Object.keys(match.scout[tid]).forEach((ph) => {
        out[tid][ph] = {};
        Object.keys(match.scout[tid][ph]).forEach((k) => { const c = match.scout[tid][ph][k]; out[tid][ph][k] = [c[0], Math.round(1000 * c[1] / c[0]) / 1000, Math.round(1000 * c[2] / c[0]) / 1000]; });
      });
    });
    return out;
  };

  function sampleHeat(match) {
    const h = match.heat;
    if (match.clock < h.next) return;
    h.next = match.clock + 2;
    sampleScout(match);
    xrSample(match);
    h.ball[match.swapped ? heatCell(1 - match.ball.x / L, 1 - match.ball.y / W) : heatCell(match.ball.x / L, match.ball.y / W)]++;   // kept as if the home side attacked one way all match
    const size = FM.HEAT.GX * FM.HEAT.GY;
    match.teams.forEach((team) => {
      const arr = h.teams[team.id] || (h.teams[team.id] = new Array(size).fill(0));
      team.players.forEach((p) => {
        const c = heatCell(...Object.values(FM.toTeamSpace(team.attackDir, p.x, p.y)));
        arr[c]++;
        (h.players[p.id] || (h.players[p.id] = new Array(size).fill(0)))[c]++;
      });
    });
  }

  function blankStats() {
    return { passes: 0, passesOk: 0, shots: 0, onTarget: 0, goals: 0, tackles: 0, tacklesWon: 0, dribbles: 0, dribblesWon: 0, possession: 0, xg: 0, fouls: 0, yellows: 0, reds: 0, offsides: 0, corners: 0, freeKicks: 0, throwIns: 0, penalties: 0 };
  }
  const other = (match, team) => (team === match.home ? match.away : match.home);
  const statsOf = (match, team) => match.stats[team.id];

  function record(match, ev) {
    ev.t = match.clock;
    match.events.push(ev);
    if (match.events.length > 8000) match.events.shift();
    const cur = match.xr && match.xr.cur;
    if (cur && ev.team === cur.team) {
      if (ev.type === 'pass') cur.passes++;
      else if (ev.type === 'shot') cur.shot = true;
      else if (ev.type === 'goal') cur.goal = true;
    }
  }

  // ---------- extra things kept about each match, for the analysis ----------
  // Possessions (where each began and ended, how the ball was won, how many passes, whether it ended in a shot), the ball won back
  // (where, and how soon after it was lost), the team's shape every half minute (how high the line stood, how wide, how compact) and how far
  // each player ran. Everything here only reads the match: it never changes how it is played.
  const xrOf = (match) => match.xr || (match.xr = { cur: null, seq: [], recov: [], shape: [], load: {}, last: {}, lostAt: {}, pos: {}, n: 0 });
  const r2 = (v) => Math.round(v * 100) / 100;
  function xrPossession(match, team, player) {
    const x = xrOf(match);
    if (x.cur && x.cur.team === team.id) return;
    const bd = FM.toTeamSpace(team.attackDir, match.ball.x, match.ball.y);
    if (x.cur) {
      const c = x.cur, tm = match.teams.find((t) => t.id === c.team), end = tm ? FM.toTeamSpace(tm.attackDir, match.ball.x, match.ball.y) : { d: 0, w: 0.5 };
      x.seq.push([c.team === match.home.id ? 0 : 1, Math.round(c.t), r2(c.d0), c.how, c.passes, r2(Math.max(c.maxD, end.d)), c.goal ? 2 : c.shot ? 1 : 0, Math.round(match.clock - c.t), r2(end.d), r2(end.w)]);
      x.lostAt[c.team] = match.clock;
    }
    const last = match.events.length ? match.events[match.events.length - 1] : null;
    let how = 0;   // 0 loose ball or other, 1 tackle, 2 interception, 3 saved or caught by the keeper, 4 restart
    if (match.restart) how = 4;
    else if (last && match.clock - last.t < 1.5) {
      if (last.type === 'tackle' && last.ok && last.team === team.id) how = 1;
      else if (last.type === 'pass' && last.outcome === 'intercepted') how = 2;
      else if (last.type === 'shot') how = 3;
    }
    const lost = x.lostAt[team.id];
    if (x.cur) x.recov.push([team === match.home ? 0 : 1, Math.round(match.clock), r2(bd.d), r2(bd.w), lost == null ? -1 : r2(Math.min(60, match.clock - lost)), how]);
    x.cur = { team: team.id, t: match.clock, d0: bd.d, maxD: bd.d, how, passes: 0, shot: false, goal: false };
  }
  function xrSample(match) {
    const x = xrOf(match);
    x.n++;
    if (x.cur) { const tm = match.teams.find((t) => t.id === x.cur.team); if (tm) x.cur.maxD = Math.max(x.cur.maxD, FM.toTeamSpace(tm.attackDir, match.ball.x, match.ball.y).d); }
    const poss0 = match.carrier ? match.carrier.team : null;
    match.teams.forEach((team) => team.players.forEach((p) => {
      // where each player stands on average, with and without the ball (in his own team's view of the pitch), for the tactical picture
      if (x.n % 4 === 0) { const ts = FM.toTeamSpace(team.attackDir, p.x, p.y), k = (team === match.home ? 0 : 1) + ':' + p.number, e = x.pos[k] || (x.pos[k] = [0, 0, 0, 0, 0, 0]), o = poss0 === team ? 0 : 3; e[o] += ts.d; e[o + 1] += ts.w; e[o + 2]++; }
      const l = x.last[p.id];
      if (l) {
        const ds = Math.hypot(p.x - l[0], p.y - l[1]);
        if (ds < 40) { const e = x.load[p.id] || (x.load[p.id] = [0, 0]); e[0] += ds; if (ds / 2 > 6.5) e[1]++; }
      }
      x.last[p.id] = [p.x, p.y];
    }));
    if (x.n % 30 === 0) {
      const poss = match.carrier ? match.carrier.team : null;
      match.teams.forEach((team) => {
        const out = team.players.filter((p) => p.group !== 'GK').map((p) => FM.toTeamSpace(team.attackDir, p.x, p.y));
        if (out.length < 6) return;
        const ds = out.map((q) => q.d).sort((a, b) => a - b), ws = out.map((q) => q.w * W);
        const line = ds[0], front = ds.slice(-3).reduce((a, b) => a + b, 0) / 3;
        const mw = ws.reduce((a, b) => a + b, 0) / ws.length, width = Math.sqrt(ws.reduce((a, b) => a + (b - mw) * (b - mw), 0) / ws.length);
        const md = ds.reduce((a, b) => a + b, 0) / ds.length * L;
        const comp = Math.sqrt(out.reduce((a, q, i) => a + ((q.d * L - md) ** 2) + ((ws[i] - mw) ** 2), 0) / out.length);
        x.shape.push([Math.round(match.clock), team === match.home ? 0 : 1, r2(line), r2(front), Math.round(width * 10) / 10, Math.round(comp * 10) / 10, r2(FM.toTeamSpace(team.attackDir, match.ball.x, match.ball.y).d), poss === team ? 1 : 0]);
      });
    }
  }
  FM.xrSummary = function (match) {
    const x = match.xr;
    if (!x) return null;
    const seq = x.seq.slice();
    if (x.cur) { const c = x.cur; seq.push([c.team === match.home.id ? 0 : 1, Math.round(c.t), r2(c.d0), c.how, c.passes, r2(c.maxD), c.goal ? 2 : c.shot ? 1 : 0, Math.round(match.clock - c.t), -1, -1]); }
    const load = {}; Object.keys(x.load).forEach((id) => { load[id] = [Math.round(x.load[id][0]), x.load[id][1]]; });
    const pos = {}; Object.keys(x.pos || {}).forEach((k) => { const e = x.pos[k]; if (e[2] + e[5] >= 20) pos[k] = [e[2] ? r2(e[0] / e[2]) : -1, e[2] ? r2(e[1] / e[2]) : -1, e[2], e[5] ? r2(e[3] / e[5]) : -1, e[5] ? r2(e[4] / e[5]) : -1, e[5]]; });
    return { seq, recov: x.recov, shape: x.shape, load, pos };
  };

  FM.beginKickoff = function (match, team) {
    match.teams.forEach((t) => FM.resetToKickoff(t));
    match.phase = 'kickoff';
    match.kickoffTimer = KICKOFF_PAUSE;
    match.kickoffTeam = team;
    match.flight = null; match.carry = null; match.restart = null; match.forcePass = false; match.noOffside = false;
    match.teams.forEach((t) => { t.phaseCtx = {}; });
    match.ball.x = L / 2; match.ball.y = W / 2; match.ball.state = 'carried';
    // The kicking side's most advanced player takes the kick-off.
    const players = team.players.filter((p) => p.group !== 'GK');
    players.sort((a, b) => (team.attackDir === 1 ? b.x - a.x : a.x - b.x));
    const taker = players[0];
    taker.x = L / 2 - team.attackDir * 0.8; taker.y = W / 2;
    giveBall(match, team, taker, 1.2);
  };

  function giveBall(match, team, player, delay, keep) {
    xrPossession(match, team, player);
    if (match.rec) chainOnBall(match, team, player, match.lastTeam !== team);
    if (match.lastTeam !== team || !match.lastChange) match.lastChange = { team, t: match.clock };
    match.carrier = { team, player };
    match.flight = null; match.ball.vx = (match.ball.vx || 0) * (keep || 0); match.ball.vy = (match.ball.vy || 0) * (keep || 0);
    match.lastTeam = team;
    match.ball.state = 'carried';
    match.nextDecision = match.clock + delay;
    match.possessionReceivedAt = match.clock;
    match.possessionPlannedDelay = delay;
    match.possessionReceivedDepth = FM.toTeamSpace(team.attackDir, player.x, player.y).d;
    match.possessionMinPressure = nearestOpponent(match, team, player).d;
    if (!match.possessionTeamSince || match.possessionTeamSince.team !== team) match.possessionTeamSince = { team, t: match.clock };
    match.carry = null;
  }

  // A man who is passed the ball does not always bring it under control and look around. When the next ball is there, the move is quick or he is closed down, he plays it
  // first time: the ball arrives, he moves it on with one touch, and the decision is made as it comes, not seconds later.
  function receive(match, team, p, keep, delay) {
    giveBall(match, team, p, delay, keep);
    if (match.restart || match.forcePass || p.group === 'GK' || FM.NO_ONE_TOUCH) return;
    const nd = nearestOpponent(match, team, p).d, depth = FM.toTeamSpace(team.attackDir, p.x, p.y).d, r = p.ratings || {}, sk = ((r.passing || 60) + (r.composure || 60)) / 200;
    const pr = clamp((FM.ONE_TOUCH == null ? 1 : FM.ONE_TOUCH) * (0.16 + 0.4 * team.tactics.tempo + (nd < 6 ? 0.16 : 0) + (nd < 3 ? 0.14 : 0) + (depth > 0.55 ? 0.1 : 0) + 0.35 * (sk - 0.6) + 0.2 * counterNow(match, team)), 0, 0.85);
    if (match.rng() >= pr) return;
    const opt = chooseAction(match, team, p);
    if (!(opt.kind === 'shoot' || (opt.kind === 'pass' && opt.p >= 0.7 && opt.d <= 30) || (opt.kind === 'clear' && nd < 2.5))) return;
    FM.ftCount = (FM.ftCount || 0) + 1; match.firstTime = { player: p, opt }; match.nextDecision = match.clock + 0.05;
  }

  // The build-up lab: one short, repeatable trial. Both sides stand where their own phase positions put them, with the ball beside the keeper.
  // From a goal kick nobody on the other side may be in the penalty area until the ball has been played.
  function clearBoxOfOpponents(match, team) {
    const opp = other(match, team), gx = team.attackDir === 1 ? 0 : L, inward = team.attackDir === 1 ? 1 : -1;
    opp.players.forEach((p) => {
      if (p.group === 'GK') return;
      if (Math.abs(p.x - gx) < 17 && Math.abs(p.y - W / 2) < 20.7) { p.x = gx + inward * 17.4; p.vx = 0; }
    });
  }
  FM.startBuildUpTrial = function (match, team, kind) {
    const opp = other(match, team), dir = team.attackDir;
    match.phase = 'play'; match.kickoffTimer = 0; match.clock = 0; match.restart = null; match.flight = null; match.carry = null; match.events = [];
    match.teams.forEach((t) => { t.phaseCtx = {}; t.offsideLine = null; });
    const gk = team.players.find((p) => p.group === 'GK') || team.players[0];
    const goalKick = kind === 'goalkick' || kind === 'keeper';   // a goal kick has to be passed: the keeper cannot run with it
    const spot = FM.toMetres(dir, goalKick ? 0.05 : 0.07, 0.6);
    match.ball.x = spot.x; match.ball.y = spot.y; match.ball.state = 'carried';
    [team, opp].forEach((t) => t.players.forEach((p) => { const q = FM.targetFor(t, p, match.ball, t === team); p.x = q.x; p.y = q.y; p.vx = 0; p.vy = 0; }));
    gk.x = spot.x - dir * 0.7; gk.y = spot.y;
    match.lastTeam = team; match.lastChange = null;
    giveBall(match, team, gk, 1.2);
    match.lastChange = null;   // the keeper has the ball in open play or from a goal kick: nobody has just lost it, so there is no counter-press to begin with
    if (goalKick) { match.forcePass = true; match.noOffside = true; clearBoxOfOpponents(match, team); match.boxLock = { team }; }
  };
  // A move through midfield: the ball with a midfielder on the edge of his own third, the team in the shape it has for that moment, the
  // opposition set up for it. Used by the midfield test.
  FM.startMidfieldTrial = function (match, team) {
    const opp = other(match, team), dir = team.attackDir;
    match.phase = 'play'; match.kickoffTimer = 0; match.clock = 0; match.restart = null; match.flight = null; match.carry = null; match.events = [];
    match.teams.forEach((t) => { t.phaseCtx = {}; t.offsideLine = null; });
    const spot = FM.toMetres(dir, 0.36, 0.5);
    match.ball.x = spot.x; match.ball.y = spot.y; match.ball.state = 'carried';
    [team, opp].forEach((t) => t.players.forEach((p) => { const q = FM.targetFor(t, p, match.ball, t === team); p.x = q.x; p.y = q.y; p.vx = 0; p.vy = 0; }));
    const carrier = team.players.filter((p) => p.group !== 'GK').sort((a, b) => Math.hypot(a.x - spot.x, a.y - spot.y) - Math.hypot(b.x - spot.x, b.y - spot.y))[0];
    carrier.x = spot.x - dir * 0.4; carrier.y = spot.y;
    match.lastTeam = team; match.lastChange = null; giveBall(match, team, carrier, 0.8); match.lastChange = null;
  };
  // A repeatable settled attack, used by the final-third and defensive-third tactical labs.
  // It enters with the ball rather than skipping straight to a shot, so width, roles,
  // opposition shape and written instructions all have time to influence the outcome.
  FM.startFinalThirdTrial = function (match, team) {
    const opp = other(match, team), dir = team.attackDir;
    match.phase = 'play'; match.kickoffTimer = 0; match.clock = 0; match.restart = null; match.flight = null; match.carry = null; match.events = [];
    match.teams.forEach((t) => { t.phaseCtx = {}; t.offsideLine = null; });
    const spot = FM.toMetres(dir, 0.7, 0.5);
    match.ball.x = spot.x; match.ball.y = spot.y; match.ball.state = 'carried';
    [team, opp].forEach((t) => t.players.forEach((p) => { const q = FM.targetFor(t, p, match.ball, t === team); p.x = q.x; p.y = q.y; p.vx = 0; p.vy = 0; }));
    const carrier = team.players.filter((p) => p.group !== 'GK').sort((a,b) => Math.hypot(a.x-spot.x,a.y-spot.y)-Math.hypot(b.x-spot.x,b.y-spot.y))[0];
    carrier.x = spot.x - dir * 0.4; carrier.y = spot.y;
    match.lastTeam = team; match.lastChange = null; giveBall(match, team, carrier, 0.8); match.lastChange = null;
  };
  FM.holderOf = function (match) { return possessionTeam(match); };
  function possessionTeam(match) {
    if (match.restart) return match.restart.team;
    if (match.carrier) return match.carrier.team;
    if (match.flight) return match.flight.team;
    return match.lastTeam;
  }

  // Clear through on goal: close to goal, in the middle of the pitch, with every outfield defender at least 2.5 m behind him.
  // Nobody between him and goal: no defender (the keeper aside) in the corridor ahead of him, so he can run at it.
  function clearAhead(match, team, p, reach) {
    const dir = team.attackDir;
    for (const o of other(match, team).players) {
      if (o.group === 'GK') continue;
      const dx = (o.x - p.x) * dir;
      if (dx < -1.5 || dx > reach) continue;
      if (Math.abs(o.y - p.y) < (FM.CONE_BASE == null ? 2.5 : FM.CONE_BASE) + (FM.CONE_SLOPE == null ? 0.42 : FM.CONE_SLOPE) * Math.max(dx, 0)) return false;
    }
    return true;
  }
  function clearThrough(match, team, p) {
    return p.group !== 'GK' && FM.toTeamSpace(team.attackDir, p.x, p.y).d > (FM.CLEAR_D == null ? 0.92 : FM.CLEAR_D) && Math.abs(p.y - W / 2) < 24 && !other(match, team).players.some((o) => o.group !== 'GK' && (o.x - p.x) * team.attackDir > -(FM.CLEAR_GAP == null ? 4 : FM.CLEAR_GAP));
  }
  // ---------- target overrides: carrying, pressing, chasing the ball ----------
  FM.debugOverrides = (m) => buildOverrides(m);
  // What each man is doing is kept on him (p.job, in words) so it can be seen and checked against what a player in that spot of the game would really be doing.
  let JOB = '';
  function buildOverrides(match) {
    const ov = new Map(); JOB = '';
    { const set0 = Map.prototype.set; ov.set = function (p, v) { if (p && typeof p === 'object') p.job = JOB; return set0.call(this, p, v); }; }
    match.teams.forEach((t) => t.players.forEach((p) => { p.job = ''; }));
    const c = match.carrier;
    if (c) {
      const opp = other(match, c.team);
      if (match.carry && match.carry.player === c.player && match.clock < match.carry.until) {
        const reach = FM.toTeamSpace(c.team.attackDir, c.player.x, c.player.y).d > 0.66 ? 9 * (FM.CARRY_FINAL == null ? 0.7 : FM.CARRY_FINAL) : 9;   // in the final third the cover is close: a touch past the man, not a run past the whole defence
        JOB = 'carries it';
        ov.set(c.player, { x: clamp(c.player.x + match.carry.dx * reach, 1, L - 1), y: clamp(c.player.y + match.carry.dy * reach, 1, W - 1) });
      } else if (!match.forcePass && match.nextDecision - match.clock > (FM.BRAKE_T == null ? -1 : FM.BRAKE_T)) {   // he keeps moving right up to the moment he plays it: he does not brake for the last third of a second
        // Waiting to decide: a man with room keeps moving with the ball (a jog, toward goal and a little toward the middle) instead of standing
        // still holding it. Closed down, or already in the box, he holds the ball where he is (a man backing away from a defender can never be
        // tackled, which breaks the game: 30+ goals a match).
        const nd = nearestOpponent(match, c.team, c.player).d, toward = FM.toTeamSpace(c.team.attackDir, c.player.x, c.player.y).d;
        JOB = 'drives forward';
        if (nd > 3.5 && toward > 0.5 && toward < 0.97 && c.player.group !== 'GK' && ['AM', 'WF', 'ST', 'CM', 'FB', 'DM'].includes(c.player.group) && clearAhead(match, c.team, c.player, 14)) ov.set(c.player, { x: clamp(c.player.x + c.team.attackDir * (FM.DRIVE_RUN == null ? 2.5 : FM.DRIVE_RUN), 1, L - 1), y: clamp(c.player.y + (W / 2 - c.player.y) * 0.22, 1, W - 1) });
        else if (nd > (FM.JOG_ND == null ? 0 : FM.JOG_ND) && toward < 0.84 && c.player.group !== 'GK') {
          // moving on with the ball while he decides, but across the pitch as much as up it, so territory is gained by passing and carrying, not by drifting
          JOB = 'carries it';
          const dj = nd > 10 ? 8 * (FM.JOG_K == null ? .34 : FM.JOG_K) : 3.2, fw = FM.JOG_FWD == null ? 0.15 : FM.JOG_FWD, side = ((c.player.number + Math.floor(match.clock / 5)) % 2 ? 1 : -1) * (c.player.y < 9 ? -1 : c.player.y > W - 9 ? 1 : 1) * (c.player.y < 9 ? -1 : 1);
          ov.set(c.player, { x: clamp(c.player.x + c.team.attackDir * dj * fw, 1, L - 1), y: clamp(c.player.y + (W / 2 - c.player.y) * 0.04 * fw + side * dj * (1 - fw), 1, W - 1) });
        }
      }
      // Whatever the moment, a man with the ball is never sent back to his usual position: past the last defender he goes on, otherwise he holds.
      // A man clear through on goal runs on at the keeper; he is never sent back toward his usual position into the men chasing him.
      JOB = 'runs at goal';
      if (!FM.NO_LATE && !ov.has(c.player) && clearThrough(match, c.team, c.player)) ov.set(c.player, { x: clamp(c.player.x + c.team.attackDir * (FM.THROUGH_RUN == null ? 9 : FM.THROUGH_RUN), 1, L - 1), y: clamp(c.player.y + (W / 2 - c.player.y) * 0.08, 1, W - 1) });
      // The carrier keeps possession where he is while turning or weighing a
      // pass. His generic phase position must never pull him backwards with
      // the ball simply because the rest of the team is resetting its shape.
      if (!ov.has(c.player) && !match.forcePass && c.player.group !== 'GK' && (!match.pendingAct || match.pendingAct.ang == null)) {
        const sp = Math.hypot(c.player.vx || 0, c.player.vy || 0);
        JOB = 'carries it';
        if (sp > 1.5 && nearestOpponent(match, c.team, c.player).d > (FM.MOM_ND == null ? 4.2 : FM.MOM_ND) && FM.toTeamSpace(c.team.attackDir, c.player.x, c.player.y).d < (FM.MOM_DEPTH == null ? 0.75 : FM.MOM_DEPTH)) { const J = FM.MOM_DIST == null ? 2.4 : FM.MOM_DIST; ov.set(c.player, { x: clamp(c.player.x + c.player.vx / sp * J, 1, L - 1), y: clamp(c.player.y + c.player.vy / sp * J, 1, W - 1) }); }   // on at a jog, not stopped, not at a sprint
      }
      // A ball that is not at his feet (a pass that arrived behind him, his own touch that ran on) is something he goes to, not something that comes back to him.
      { const bp = match.ball, bdx = bp.x - c.player.x, bdy = bp.y - c.player.y, bdd = Math.hypot(bdx, bdy), psp = Math.hypot(c.player.vx || 0, c.player.vy || 0);
        JOB = 'goes to the ball';
        if (bdd > 1.3 && !(psp > 2 && (bdx * c.player.vx + bdy * c.player.vy) / (bdd * psp) > 0.5)) ov.set(c.player, { x: clamp(bp.x + (bp.vx || 0) * 0.3, 1, L - 1), y: clamp(bp.y + (bp.vy || 0) * 0.3, 1, W - 1) }); }
      JOB = 'shields the ball';
      if (!ov.has(c.player)) ov.set(c.player, { x: c.player.x, y: c.player.y });
      // Defending the man on the ball. Most of the time one defender goes to him, and he closes down rather than charging in: how
      // tightly depends on the team's pressing instruction (a hard press gets right on top of him, a soft one holds off and jockeys).
      // A second defender joins only for a counter-press just after losing the ball, or when the team is set to press their build-up
      // hard and the ball is deep in their own third. The rest do not chase the ball: see the passing lanes below.
      // Pressing their build-up: when the ball is deep in the carrier's own third, the defending team's setting for it adds to the press.
      const deep = FM.toTeamSpace(c.team.attackDir, c.player.x, c.player.y).d < 0.33;
      const pbu = opp.tactics.pressBuildUp == null ? 0.4 : opp.tactics.pressBuildUp;
      // Near their own goal defenders do close the man on the ball down, whatever the team's pressing setting: a shot has to be stopped.
      const ownGoal = { x: opp.attackDir === 1 ? 0 : L, y: W / 2 };
      const nearGoal = dist(c.player, ownGoal) < (FM.DEF_BOX || 30);
      // Against a build-up the side's profile is the press-the-build-up setting weighed with its general pressing: the same figure the scouting
      // report calls a low block, a mid block or a high press, so a side that "sits in a low block" does not come out to hunt the keeper.
      const now = pressingNow(match, opp);
      const press = clamp(Math.max(deep ? 0.6 * pbu + 0.4 * now : now, nearGoal ? (FM.DEF_BOX_PRESS || 0.8) : 0), 0, 1);
      const lostIt = match.lastChange && match.lastChange.team === c.team && match.clock - match.lastChange.t < PRESS_WINDOW;
      const cpx = lostIt ? (opp.tactics.counterPress > 0.6 ? 1 : 0) + (opp.tactics.counterPress > 0.85 ? 1 : 0) : 0, cpl = lostIt ? (opp.tactics.counterPress < 0.3 ? -1 : 0) : 0;   // the counter-press setting: how many close the ball down just after it is lost
      const n = Math.max(1, 1 + (press > 0.65 && (lostIt || nearGoal || (deep && pbu > 0.6)) ? 1 : 0) + cpx + cpl);
      const ranked = opp.players.filter((p) => p.group !== 'GK').map((p) => ({ p, d: dist(p, c.player) })).sort((a, b) => a.d - b.d);
      JOB = 'presses the ball';
      ranked.slice(0, n).forEach(({ p, d }, i) => {
        if (d >= (i === 0 ? Math.max(pressTrigger(opp, p, press, match), (FM.FIRST_PRESS == null ? 0 : FM.FIRST_PRESS) * (0.4 + 0.6 * press)) : pressTrigger(opp, p, press, match))) return;   // the nearest man always comes to the ball
        const stand = 0.5 + 2.2 * (1 - press) + 0.8 * i; // how far off the carrier he stops, in metres
        const dx = p.x - c.player.x, dy = p.y - c.player.y, dd = Math.max(d, 0.1);
        // He closes from the goal side and from the inside, not straight down the line he happens to be on: he is between the man and his goal, and when the man is near a touchline
        // he shows him the line, so he is forced wide where a pass or a clearance is the only way out.
        const ownGX = opp.attackDir === 1 ? 0 : L, gx = ownGX - c.player.x, gy = W / 2 - c.player.y, gl = Math.hypot(gx, gy) || 1, wide = Math.abs(c.player.y - W / 2) > W / 2 - 13 ? Math.sign(W / 2 - c.player.y) * 1.3 : 0;
        const k = FM.PRESS_ANGLE == null ? 0.6 : FM.PRESS_ANGLE;
        JOB = i === 0 ? (lostIt ? 'counter-presses' : 'closes the ball down') : 'supports the press';
        ov.set(p, { x: c.player.x + c.player.vx * 0.4 + (gx / gl * k + dx / dd * (1 - k)) * stand, y: c.player.y + c.player.vy * 0.4 + (gy / gl * k + dy / dd * (1 - k)) * stand + wide });
      });
      // Recovery. A defender who has been beaten does not stay behind the ball: he sprints to get goal-side again, between the man with the ball and
      // his goal, rather than trailing after him.
      if (FM.toTeamSpace(c.team.attackDir, c.player.x, c.player.y).d > 0.6) {
        opp.players.forEach((p) => {
          if (p.group === 'GK' || ov.has(p)) return;
          const gap = (c.player.x - p.x) * c.team.attackDir;
          JOB = 'recovers goal-side';
          if (gap > 1 && gap < 30 && Math.abs(p.y - c.player.y) < 26) ov.set(p, { x: c.player.x + c.team.attackDir * (FM.RECOVER_AHEAD == null ? 4 : FM.RECOVER_AHEAD), y: c.player.y + (p.y - c.player.y) * 0.3 });
        });
      }
      // Tight markers follow the nearest attacker; a centre-half told to step up follows a forward who drops deep.
      const att = c.team.players.filter((q) => q.group !== 'GK');
      opp.players.forEach((p) => {
        if (p.group === 'GK' || ov.has(p)) return;
        const mm = FM.instrMods(p, false);
        let target = null, reach = 0;
        const rm = FM.rulesMark(opp, p, match.ball), rStep = FM.rulesDelta(opp, p, 'stepUp', match.ball, false) > 0;
        if (rm) { reach = rm.number != null || rm.name ? 40 : 18; target = att.filter((q) => FM.rulesAttackerOf(rm, q)); }
        else if (mm.marking > 0) { reach = 14; target = att; }
        else if ((mm.stepUp > 0 || rStep) && (p.group === 'CB' || p.group === 'DM')) { reach = 24; target = att.filter((q) => q.group === 'ST' || q.group === 'AM'); }
        if (!target) return;
        let best = null, bd = reach;
        target.forEach((q) => { const dd = dist(p, q); if (dd < bd) { bd = dd; best = q; } });
        JOB = 'marks his man';
        if (best) ov.set(p, { x: best.x - opp.attackDir * 1.5, y: best.y });
      });
      // The press on a build-up as a plan. Their forwards go to the deepest of your players, their attacking midfielders to the next, and so on, each
      // taking the nearest of your players not already taken. Whether a player follows his job is a chance, drawn again every few seconds: a team that
      // presses hard mostly sticks to it, and one that presses lightly often does not. The ones left over (usually their full-backs and centre-backs)
      // mark nobody, which is what leaves your man free.
      const plan = press >= 0.4 && FM.toTeamSpace(c.team.attackDir, c.player.x, c.player.y).d < 0.5 ? pressPlan(match, opp, c.team, c.player, press, ov) : null;
      if (plan) {
        const stand = 1.2 + 2.6 * (1 - press);
        plan.assign.forEach((q, p) => {
          if (ov.has(p)) return;
          const dx = c.player.x - q.x, dy = c.player.y - q.y, dd = Math.max(Math.hypot(dx, dy), 0.1);
          const sd = stand * (1 - 0.4 * (plan.cd ? plan.cd.get(p) || 0 : 0));
          JOB = 'presses his man';
          ov.set(p, { x: clamp(q.x + dx / dd * sd, 1, L - 1), y: clamp(q.y + dy / dd * sd, 1, W - 1) });
        });
      }
      // Cutting the passing lanes. Defenders nearest the likeliest passes stand between the carrier and the receiver, so the pass is
      // hard to make and easy to intercept, instead of every defender running at the ball. Most advanced receivers first, a few at a time.
      const goalPt = { x: c.team.attackDir === 1 ? L : 0, y: W / 2 };
      const free = opp.players.filter((q) => q.group !== 'GK' && !ov.has(q));
      const recv = att.filter((q) => q !== c.player).map((q) => ({ q, d: dist(c.player, q) })).filter((o) => o.d > 6 && o.d < 38)
        .sort((x, y) => dist(x.q, goalPt) - dist(y.q, goalPt));
      // How tightly: a soft press cuts the lane well off the receiver (a cover shadow), but a team that is set to press high closes the
      // receiver down as well, getting right up to him and covering more of the carrier's options. Only when the instructions say press high.
      const hardPress = clamp((press - 0.5) / 0.4, 0, 1);
      const laneAt = (FM.DEF_LANE_AT || 0.6) + 0.3 * hardPress;
      // A low block does not go into the carrier's own third to cut the lanes out of a goal kick: it waits for the ball to come to it.
      const cutters = press < 0.4 && deep ? 0 : Math.max(2, Math.round((FM.DEF_CUTTERS || 3) * (0.5 + 0.5 * press) + 1.5 * hardPress));
      const taken = new Set();
      let used = 0;
      for (const { q } of recv) {
        if (used >= cutters) break;
        const lx = c.player.x + (q.x - c.player.x) * laneAt, ly = c.player.y + (q.y - c.player.y) * laneAt;
        let who = null, bd = 18;
        free.forEach((m) => { if (taken.has(m)) return; const dd = Math.hypot(m.x - lx, m.y - ly); if (dd < bd) { bd = dd; who = m; } });
        JOB = 'cuts the passing lane';
        if (who) { taken.add(who); used++; ov.set(who, { x: lx, y: ly }); }
      }

      // Several independent defensive jobs can point into the same patch of
      // grass: the primary press, a marker and two lane cutters. Without a
      // final team-shape check those individually sensible assignments make
      // the whole side swarm the carrier. Keep one presser plus support close
      // (three only during a genuine counter-press or emergency near goal),
      // and hold everybody else outside the immediate pressure circle.
      const closeLimit = lostIt && press > .78 && match.clock - match.lastChange.t < 2.5 ? 3 : 2;
      const projected = opp.players.filter((p) => p.group !== 'GK').map((p) => {
        const target = ov.get(p) || { x: p.x, y: p.y };
        return { p, target, d: Math.hypot(target.x - c.player.x, target.y - c.player.y) };
      }).sort((a, b) => a.d - b.d);
      projected.slice(closeLimit).forEach(({ p, target, d }, index) => {
        if (d >= 13.5) return;
        let dx = target.x - c.player.x, dy = target.y - c.player.y;
        let len = Math.hypot(dx, dy);
        if (len < .1) { dx = p.x - c.player.x; dy = p.y - c.player.y; len = Math.hypot(dx, dy) || 1; }
        const radius = 13.5 + Math.min(3, index * .35);
        JOB = 'holds off: keeps shape';
        ov.set(p, { x: clamp(c.player.x + dx / len * radius, 1, L - 1), y: clamp(c.player.y + dy / len * radius, 1, W - 1) });
      });
    } else if (match.flight && match.flight.target) {
      const f = match.flight;
      if (f.free) {
        JOB = 'runs onto the pass';
        ov.set(f.target, runPoint(f.target, f, match.ball));
        JOB = 'meets the ball';
        if (f.claim) ov.set(f.claim.p, runPoint(f.claim.p, f, match.ball));   // he goes onto the ball
        JOB = 'covers the pass';
        if (f.t > 0.2) other(match, f.team).players.filter((q) => q.group !== 'GK' || segInfo(q.x, q.y, match.ball.x, match.ball.y, match.ball.x + f.dir.x * 20, match.ball.y + f.dir.y * 20).d < 10).map((q) => ({ q, d: segInfo(q.x, q.y, match.ball.x, match.ball.y, match.ball.x + f.dir.x * Math.max(0, f.len + 6 - f.run), match.ball.y + f.dir.y * Math.max(0, f.len + 6 - f.run)).d })).filter((o) => o.d < 14).sort((a, b) => a.d - b.d).slice(0, 2).forEach(({ q }) => ov.set(q, runPoint(q, f, match.ball)));
      JOB = 'waits for the ball';
      } else ov.set(f.target, f.outcome === 'complete' ? { x: f.ex, y: f.ey } : { x: f.target.x, y: f.target.y });
    } else if (!match.flight) {
      match.teams.forEach((team) => {
        JOB = 'chases the loose ball';
        team.players.map((p) => ({ p, d: Math.hypot(p.x - match.ball.x, p.y - match.ball.y) }))
          .filter(({ p, d }) => p.group !== 'GK' || d < 14)
          .sort((a, b) => a.d - b.d).slice(0, 2)
          .forEach(({ p }) => { const bs = Math.hypot(match.ball.vx || 0, match.ball.vy || 0), lead = Math.min(0.8, Math.hypot(p.x - match.ball.x, p.y - match.ball.y) / 7); ov.set(p, { x: clamp(match.ball.x + (match.ball.vx || 0) * lead, 0.5, L - 0.5), y: clamp(match.ball.y + (match.ball.vy || 0) * lead, 0.5, W - 0.5) }); });
      });
    }
    offBall(match, ov);
    addTeamPlay(match, ov);
    { const poss = match.carrier ? match.carrier.team : match.flight && match.flight.team || null;
      // the rest are doing the job of their place in that state of the game
      match.teams.forEach((t) => t.players.forEach((p) => {
        if (p.job) return;
        const g = p.group, dirT = t.attackDir, bd = FM.toTeamSpace(dirT, match.ball.x, match.ball.y).d, side = Math.abs(p.y - match.ball.y);
        if (g === 'GK') p.job = bd > 0.6 ? 'sweeps behind the line' : 'keeps goal';
        else if (!poss) p.job = 'goes for the ball';
        else if (t === poss) p.job = g === 'CB' ? (bd < 0.35 ? 'splits to receive' : 'holds the rest defence') : g === 'DM' ? (bd < 0.55 ? 'shows in front of the back line' : 'holds the rest defence') : g === 'ST' ? (bd > 0.45 ? 'pins the back line' : 'drops to link') : (g === 'WF' || (g === 'FB' && Math.abs(p.y - W / 2) > 22)) ? 'holds the width' : g === 'FB' ? 'supports from the flank' : 'holds the shape between the lines';
        else p.job = g === 'CB' || g === 'FB' ? (side > 24 ? 'tucks in, far side' : 'holds the line') : g === 'DM' ? 'screens the middle' : (g === 'ST' || g === 'WF') ? (side > 24 ? 'stays up, far side' : 'cuts the pass back') : (side > 24 ? 'tucks in, far side' : 'shifts across to the ball');
      })); }
    return ov;
  }
  // ---------- what a side does without the ball that reads as a plan ----------
  // The man who has just passed moves on (a one-two, or on to the next place), a full-back overlaps the winger, the box fills when the ball is wide and deep, and the winger on
  // the far side stays wide and high. Each is a small job with an end time, and it carries on while the ball is in the air instead of being dropped the moment it is struck.
  function offBall(match, ov) {
    if (FM.NO_OFFBALL || match.restart || match.phase !== 'play' || match.forcePass) return;
    const c = match.carrier, f = match.flight;
    if (f && f.kind !== 'pass' && f.kind !== 'cross') return;
    const T = c ? c.team : f && f.team;
    if (!T) { match.oba = null; return; }
    const O = other(match, T), dir = T.attackDir, now = match.clock, rng = match.rng;
    let st = match.oba;
    if (!st || st.team !== T) st = match.oba = { team: T, runs: new Map(), last: null, lastAt: -9, ovl: 0, box: 0 };
    st.runs.forEach((r, p) => { if (now > r.until || (c && p === c.player)) st.runs.delete(p); });
    if (c && !match.pendingAct) {
      const cp = c.player, depth = FM.toTeamSpace(dir, cp.x, cp.y).d, wide = Math.abs(cp.y - W / 2), side = cp.y >= W / 2 ? 1 : -1;
      const back = O.players.filter((o) => o.group !== 'GK').map((o) => o.x * dir).sort((a, b) => b - a)[1], lim = (back == null ? L : back) - 1.0;
      const cap = (x) => dir * Math.min(x * dir, lim), gx = dir === 1 ? L : 0;
      const open = (q) => q !== cp && q.group !== 'GK' && !ov.has(q) && !st.runs.has(q);
      const give = (q, x, y, secs, kind) => { st.runs.set(q, { pt: { x: clamp(cap(x), 1.5, L - 1.5), y: clamp(y, 2.5, W - 2.5) }, until: now + secs, kind }); };
      // 1. he has passed it: he does not stay where he struck it. Forward players go on beyond the new man, into the channel with the most room; a full-back stays on his flank.
      if (cp !== st.last) {
        const from = st.last, fresh = now - st.lastAt < 3.5; st.last = cp; st.lastAt = now;
        if (from && fresh && T.players.indexOf(from) >= 0 && from !== cp && ['CM', 'AM', 'DM', 'WF', 'FB', 'ST'].indexOf(from.group) >= 0 && open(from) && depth > 0.28 && dist(from, cp) < 32 && rng() < (FM.PM_P == null ? 0.42 : FM.PM_P) + 0.25 * (T.tactics.directness - 0.5)) {
          const tx = cp.x + dir * (from.group === 'FB' ? 10 : 9);
          if ((tx - from.x) * dir > 4) {
            let ty = from.group === 'FB' ? from.y : cp.y, bd = -1;
            if (from.group !== 'FB') for (let off = -12; off <= 12; off += 3) { const y = clamp(cp.y + off, 4, W - 4), d = O.players.reduce((m, o) => (Math.abs(o.x - tx) < 12 ? Math.min(m, Math.hypot(o.x - tx, o.y - y)) : m), 30) - 0.12 * Math.abs(off); if (d > bd) { bd = d; ty = y; } }
            give(from, tx, ty, 2.6, 'pm');
          }
        }
      }
      // 2. the overlap: a team-mate behind the winger runs on the outside of him (or inside him, now and then) while he has the ball
      if (now > st.ovl && wide > 13 && depth > 0.42 && depth < 0.9 && ['WF', 'FB', 'AM', 'CM'].indexOf(cp.group) >= 0) {
        let who = null, bd = 22;
        T.players.forEach((q) => { if (!open(q) || ['FB', 'CM', 'WF', 'DM'].indexOf(q.group) < 0 || (q.x - cp.x) * dir > 2 || (q.y >= W / 2 ? 1 : -1) !== side) return; const d = dist(q, cp); if (d < bd) { bd = d; who = q; } });
        if (who && rng() < (FM.OVERLAP_P == null ? 0.55 : FM.OVERLAP_P)) { const inside = rng() < 0.25; give(who, cp.x + dir * 12, cp.y + (inside ? -side * 6 : side * (wide > 26 ? 1 : 5)), 2.8, 'ovl'); st.ovl = now + 6; }
      }
      // 3. the ball is wide and deep: the box fills (near post, penalty spot, far post, and the edge of the area to recycle a cut-back)
      if (wide > 15 && depth > 0.72 && now > st.box) {
        const spots = [[gx - dir * 7, W / 2 + side * 4], [gx - dir * 11.5, W / 2 - side], [gx - dir * 8.5, W / 2 - side * 7.5], [gx - dir * 19, W / 2 - side * 2]], used = new Set();
        spots.forEach((s, i) => {
          let who = null, bd = 34;
          T.players.forEach((q) => { if (used.has(q) || !open(q) || (i === 3 ? ['CM', 'DM', 'AM', 'WF'] : ['ST', 'AM', 'WF', 'CM']).indexOf(q.group) < 0) return; const d = dist(q, { x: s[0], y: s[1] }) - (q.group === 'ST' ? 6 : 0); if (d < bd) { bd = d; who = q; } });
          if (who) { used.add(who); give(who, s[0], s[1], 2.4, 'box'); }
        });
        st.box = now + 2.4;
      }
      // 4. the winger on the far side stays wide and high, so the ball can be switched to a man with room
      if (wide > 12 && depth > 0.4 && depth < 0.92) {
        T.players.forEach((q) => { if (!open(q) || (q.group !== 'WF' && q.group !== 'FB') || (q.y >= W / 2 ? 1 : -1) === side || Math.abs(q.y - W / 2) < 8) return; give(q, Math.max(q.x * dir, cp.x * dir + 2) * dir, W / 2 - side * (W / 2 - 7), 1.4, 'wide'); });
      }
      // 5. everyone else looks for a place he can be found: an open line from the ball, in space, a pass away, and not far from his own place in the shape. This is what
      // a man without the ball is doing in possession: making himself an option. (The centre-backs, and the holding midfielder once the ball is up the pitch, keep the rest defence.)
      if (!FM.NO_OFFER && depth < 0.92) {
        const mates = T.players.filter((q) => q !== cp && q.group !== 'GK');
        T.players.forEach((q) => {
          if (!open(q) || q.group === 'CB' || (q.group === 'DM' && depth > 0.55)) return;
          const home = FM.targetFor(T, q, match.ball, true);
          let best = null, bs = -1e9, cur = null;
          const score = (x, y) => {
            const dd = Math.hypot(x - cp.x, y - cp.y); if (dd < 0.1) return -1e9;
            const blocked = O.players.reduce((n, o) => (n + (segInfo(o.x, o.y, cp.x, cp.y, x, y).d < 2.2 ? 1 : 0)), 0);
            const od = Math.min(8, O.players.reduce((m, o) => Math.min(m, Math.hypot(o.x - x, o.y - y)), 99));
            const crowd = mates.some((m2) => m2 !== q && Math.hypot((st.runs.has(m2) ? st.runs.get(m2).pt.x : m2.x) - x, (st.runs.has(m2) ? st.runs.get(m2).pt.y : m2.y) - y) < 6.5) ? 3 : 0;
            return (blocked ? -4 - blocked : 3) + 0.6 * od + (dd < 7 ? -3 : dd > 26 ? -(dd - 26) * 0.4 : -Math.abs(dd - 14) * 0.1) + 0.07 * Math.max(-8, Math.min(10, (x - cp.x) * dir)) - 0.13 * Math.hypot(x - home.x, y - home.y) - crowd;
          };
          cur = score(q.x, q.y);
          for (let ox = -8; ox <= 8; ox += 4) for (let oy = -8; oy <= 8; oy += 4) {
            const x = clamp(cap(q.x + ox), 2, L - 2), y = clamp(q.y + oy, 2.5, W - 2.5), sc = score(x, y);
            if (sc > bs) { bs = sc; best = { x, y }; }
          }
          if (best && bs > cur + 1.5) give(q, best.x, best.y, FM.OFFER_SECS == null ? 1.1 : FM.OFFER_SECS, 'offer');
        });
      }
    }
    st.runs.forEach((r, p) => { if (!ov.has(p)) { JOB = ({ pm: 'passes and moves', ovl: 'overlaps', box: 'attacks the box', wide: 'holds the width', offer: 'finds space to be found' })[r.kind] || 'moves into space'; ov.set(p, r.pt); } });
  }
  // ---------- what the rest of the side does while one man has the ball ----------
  // The two team-mates nearest the carrier move to angles from which they can be found (about ten metres off, wide of him and ahead or behind, where no opponent is on the
  // line to them); one forward at a time makes a run beyond the ball, behind the line or into the gap between defenders, never past the offside line; and for the first
  // seconds after a loss the men who are ahead of the ball run back to their defending places at full pace. All of it follows the manager's settings (directness, runs).
  const SUP_ANG = [0.75, -0.75, 1.95, -1.95];
  function addTeamPlay(match, ov) {
    const c = match.carrier; if (!c || match.restart || match.phase !== 'play' || match.flight || match.forcePass) return;
    const T = c.team, O = other(match, T), cp = c.player, dir = T.attackDir, now = match.clock, depth = FM.toTeamSpace(dir, cp.x, cp.y).d;
    const heading = Number.isFinite(cp.facing) ? cp.facing : (dir === 1 ? 0 : Math.PI);
    // support
    if (depth < (FM.SUP_DEPTH == null ? 0.5 : FM.SUP_DEPTH) && !FM.NO_SUP) {
      let st = match.sup;
      if (!st || st.who !== cp || now > st.until) {
        const tg = new Map(), taken = [];
        T.players.filter((q) => q !== cp && q.group !== 'GK' && !ov.has(q)).map((q) => ({ q, d: dist(q, cp) })).filter((o) => o.d < 30).sort((a, b) => a.d - b.d).slice(0, FM.SUP_N == null ? 1 : FM.SUP_N).forEach(({ q }) => {
          let best = null, bs = -1e9; const R = q.group === 'CB' ? 8 : q.group === 'ST' || q.group === 'WF' ? 13 : 10;
          SUP_ANG.forEach((a) => {
            const x = clamp(cp.x + Math.cos(heading + a) * R, 2, L - 2), y = clamp(cp.y + Math.sin(heading + a) * R, 2, W - 2);
            if (taken.some((t) => Math.hypot(t.x - x, t.y - y) < 7)) return;
            const od = Math.min(8, O.players.reduce((m, o) => Math.min(m, Math.hypot(o.x - x, o.y - y)), 99)), lane = O.players.some((o) => segInfo(o.x, o.y, cp.x, cp.y, x, y).d < 2.2) ? -4 : 0;
            const score = od + lane + 0.12 * (x - cp.x) * dir + (Math.abs(y - W / 2) > 29 ? -2 : 0) - 0.06 * Math.hypot(x - q.x, y - q.y);
            if (score > bs) { bs = score; best = { x, y }; }
          });
          if (best) { taken.push(best); tg.set(q, best); }
        });
        st = match.sup = { who: cp, until: now + 1.6, tg };
      }
      JOB = 'offers a short pass';
      st.tg.forEach((pt, q) => { if (!ov.has(q)) ov.set(q, pt); });
    }
    // an off-ball run
    const rs = match.runs || (match.runs = { until: 0, cool: 0, q: null, pt: null, team: null });
    if (rs.q && (now > rs.until || rs.team !== T || rs.q === cp)) { rs.q = null; rs.cool = now + 2.5; }
    if (!FM.NO_RUNS && !rs.q && depth > 0.38 && depth < 0.88 && now > rs.cool && match.rng() < 0.1 * (0.4 + T.tactics.directness + 0.5 * T.tactics.risk)) {
      const cands = T.players.filter((q) => q !== cp && ['ST', 'WF', 'AM', 'CM'].indexOf(q.group) >= 0 && !ov.has(q) && FM.toTeamSpace(dir, q.x, q.y).d > 0.35 && FM.instrMods(q, true).runs >= 0);
      if (cands.length) {
        const wts = cands.map((q) => (q.group === 'ST' ? 3 : q.group === 'WF' ? 2.5 : q.group === 'AM' ? 2 : 1)), tot = wts.reduce((a, b) => a + b, 0); let r = match.rng() * tot, q = cands[0]; for (let i = 0; i < cands.length; i++) { r -= wts[i]; if (r <= 0) { q = cands[i]; break; } }
        const last = O.players.filter((o) => o.group !== 'GK').map((o) => o.x * dir).sort((a, b) => b - a)[1], limit = (last == null ? L : last) - 1.0, tx = dir === 1 ? Math.min(q.x + 16, limit) : Math.max(q.x - 16, -limit);
        if ((tx - q.x) * dir > 5) {
          let ty = q.y, bd = -1; for (let off = -15; off <= 15; off += 3) { const y = clamp(q.y + off, 3, W - 3), d = O.players.reduce((m, o) => (Math.abs(o.x - tx) < 12 ? Math.min(m, Math.hypot(o.x - tx, o.y - y)) : m), 30); if (d > bd) { bd = d; ty = y; } }
          rs.q = q; rs.pt = { x: tx, y: ty }; rs.until = now + 2.4; rs.team = T;
        }
      }
    }
    JOB = 'runs in behind';
    if (rs.q && !ov.has(rs.q)) ov.set(rs.q, rs.pt);
    // recovery: just after a loss, the men who are ahead of the ball run back to where they defend
    if (!FM.NO_REC && match.lastChange && match.lastChange.team === T && now - match.lastChange.t < 5) {
      const bd = FM.toTeamSpace(O.attackDir, cp.x, cp.y).d;
      JOB = 'tracks back';
      O.players.forEach((p) => { if (p.group === 'GK' || ov.has(p)) return; if (FM.toTeamSpace(O.attackDir, p.x, p.y).d > bd + 0.03) ov.set(p, FM.targetFor(O, p, match.ball, false)); });
    }
  }
  // Nobody stands inside anybody else: bodies keep apart (a little closer for opponents in a challenge, wider for team-mates).
  function separate(match) {
    if (FM.NO_SEP || match.phase !== 'play' || match.restart || match.celeb) return;
    const all = match.home.players.map((p) => [p, 0]).concat(match.away.players.map((p) => [p, 1])), cp = match.carrier && match.carrier.player;
    for (let a = 0; a < all.length; a++) for (let b = a + 1; b < all.length; b++) {
      const A = all[a][0], B = all[b][0]; if (A.sliding || B.sliding) continue;
      const R = all[a][1] === all[b][1] ? 1.5 : 0.95, dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy); if (d >= R || d < 1e-4) continue;
      const push = (R - d) * 0.5, ka = A === cp ? 0.3 : 1, kb = B === cp ? 0.3 : 1, ux = dx / d, uy = dy / d;
      A.x = clamp(A.x - ux * push * ka, 0.5, L - 0.5); A.y = clamp(A.y - uy * push * ka, 0.5, W - 0.5); B.x = clamp(B.x + ux * push * kb, 0.5, L - 0.5); B.y = clamp(B.y + uy * push * kb, 0.5, W - 0.5);
    }
  }
  // Who presses whom. Keep assignments long enough for a press to look like a
  // coordinated choice rather than eleven players repeatedly retargeting the ball.
  const PRESS_ROLES = ['ST', 'WF', 'AM', 'CM', 'DM'];
  function pressPlan(match, opp, att, carrier, press, ov) {
    const pl = match.plan;
    if (pl && pl.def === opp.id && match.clock - pl.t < 5 && dist(pl.carrier, carrier) < 14) return pl;
    const rng = match.rng, follow = clamp(0.5 + 0.45 * press, 0.4, 0.95);
    const cd = new Map(); opp.players.forEach((p) => { if (p.group !== 'GK') cd.set(p, FM.rulesDelta(opp, p, 'closeDown', match.ball, false)); });
    let more = 0, fewer = 0; cd.forEach((v) => { if (v > 0) more += v; else fewer -= v; });
    const nPress = clamp(Math.round(1 + 5 * press + 0.8 * more - 0.8 * fewer), 1, 8);
    const chasers = new Set(); ov.forEach((v, p) => chasers.add(p));
    const pressers = opp.players.filter((p) => PRESS_ROLES.indexOf(p.group) >= 0 && !chasers.has(p) && (cd.get(p) || 0) > -0.5)
      .sort((a, b) => (b.x * opp.attackDir) - (a.x * opp.attackDir)).slice(0, nPress);
    const taken = new Set(), assign = new Map();
    // A player told to draw a named opponent in: that opponent comes to him, in the proportion the instruction says.
    att.players.forEach((q) => {
      if (q === carrier || !(att.rules && att.rules.length)) return;
      FM.rulesAttract(att, q, match.ball).forEach((e) => {
        const x = pressers.find((p) => !assign.has(p) && (e.target.name ? p.name === e.target.name : p.number === e.target.number));
        if (x && !taken.has(q) && rng() < e.strength) { assign.set(x, q); taken.add(q); }
      });
    });
    pressers.forEach((p) => {
      if (assign.has(p)) return;
      const cands = att.players.filter((q) => q !== carrier && !taken.has(q)).map((q) => ({ q, d: dist(p, q) })).filter((o) => o.d < 45).sort((a, b) => a.d - b.d);
      if (!cands.length) return;
      let pick = 0;
      if (rng() > follow) pick = rng() < 0.3 ? -1 : Math.min(1, cands.length - 1);   // not this time: he takes the next one, or sits
      if (pick < 0) return;
      taken.add(cands[pick].q); assign.set(p, cands[pick].q);
    });
    match.plan = { def: opp.id, carrier, t: match.clock, assign, cd, pairs: Array.from(assign.entries()).map(([p, q]) => [p.number, q.number]) };
    return match.plan;
  }
  function pressTrigger(team, player, press, match) {
    const role = player.roleId;
    const bonus = role === 'pressing_forward' ? 8 : role === 'ball_winning_midfielder' ? 6 : 0;
    // A mid-block should not behave like a permanent high press. At the
    // neutral setting the nearest forward now holds the block until the ball
    // is roughly ten metres away; aggressive pressing roles and instructions
    // still jump much earlier.
    return (FM.PRESS_BASE == null ? 6 : FM.PRESS_BASE) + 8 * press + bonus + FM.dialM(team, 'press') + 5 * (FM.instrMods(player, false).closeDown + (match ? FM.rulesDelta(team, player, 'closeDown', match.ball, false) : 0));
  }
  // Pressing as the manager set it, adjusted for the seconds just after losing the ball:
  // a high counter-press instruction hunts it back at once, a low one drops into shape first.
  const PRESS_WINDOW = 6, COUNTER_WINDOW = 8;
  function pressingNow(match, team) {
    const ch = match.lastChange;
    let p = team.tactics.pressing;
    if (ch && ch.team !== team) {
      const since = match.clock - ch.t;
      if (since < PRESS_WINDOW) p += (team.tactics.counterPress - 0.5) * (FM.CPRESS_K == null ? 2.4 : FM.CPRESS_K) * (1 - since / PRESS_WINDOW);
    }
    return clamp(p, 0, 1);
  }
  // For a few seconds after winning the ball a team is drawn toward its transition-to-attack positions, and after losing it
  // toward its transition-to-defence positions. How strongly depends on the counter-attack and counter-press settings.
  function setPhaseContext(match) {
    const ch = match.lastChange;
    match.teams.forEach((team) => {
      let ta = 0, td = 0;
      if (ch) {
        const since = match.clock - ch.t;
        if (ch.team === team && since < COUNTER_WINDOW) ta = (1 - since / COUNTER_WINDOW) * (0.25 + 0.45 * team.tactics.counterAttack);
        if (ch.team !== team && since < PRESS_WINDOW) td = (1 - since / PRESS_WINDOW) * (0.08 + 0.9 * team.tactics.counterPress);
      }
      let taProg = 0, tdProg = 0;
      if (ch) { const since = match.clock - ch.t; if (ch.team === team) taProg = since / COUNTER_WINDOW; else tdProg = since / PRESS_WINDOW; }
      team.phaseCtx = { transAtt: ta, transDef: td, taProg, tdProg };
      // The version of each stage's end diagram in use: the first added page whose condition holds (the default one otherwise).
      FM.ensurePages(team);
      team.pageNow = {};
      const ORDER = ['buildEnd', 'midfield', 'final'];   // a stage's page can depend on the page the stage before ended on, so these go in order
      const keys = Object.keys(team.pages).filter((k) => (team.pages[k] || []).length).sort((a, b) => (ORDER.indexOf(a) < 0 ? 9 : ORDER.indexOf(a)) - (ORDER.indexOf(b) < 0 ? 9 : ORDER.indexOf(b)));
      if (keys.length) {
        const oo = other(match, team), ot = oo.tactics;
        const info = {
          oppPress: 0.6 * (ot.pressBuildUp == null ? 0.4 : ot.pressBuildUp) + 0.4 * pressingNow(match, oo),
          oppDirect: 0.5 * (ot.buildDirect == null ? 0.35 : ot.buildDirect) + 0.5 * (ot.directness == null ? 0.5 : ot.directness),
          diff: (match.score[team.id] || 0) - (match.score[oo.id] || 0), minute: match.clock / 60,
        };
        // a condition the manager wrote in words, checked against the same situation the instructions use
        const hasBallNow = possessionTeam(match) === team, pressedNow = !!(team.ruleCtx && team.ruleCtx.pressed);
        info.when = (w) => { try { const cx = FM.rulesCtx(team, match.ball, hasBallNow, pressedNow); cx.scoreDiff = info.diff; cx.minute = info.minute; cx.me = null; return !!FM.rulesWhen(w, cx); } catch (e) { return false; } };
        // our full-backs: have they stepped up the pitch (past about the middle of our own half and the halfway line)?
        const fbs = team.players.filter((q) => q.group === 'FB');
        info.fbHigh = fbs.length ? fbs.reduce((a, q) => a + FM.toTeamSpace(team.attackDir, q.x, q.y).d, 0) / fbs.length >= 0.45 : false;
        match.pageTime = match.pageTime || {};
        // Where the opposition really stand, for the pages that are chosen by the shirts the manager placed for them.
        const ds = oo.players.filter((q) => q.group !== 'GK').map((q) => FM.toTeamSpace(oo.attackDir, q.x, q.y).d);
        const live = FM.oppSignature(ds);
        keys.forEach((k) => {
          const list = team.pages[k], dflt = (team.pageDefaults && team.pageDefaults[k]) || null;
          const cands = list.filter((x) => x.cond === 'opp_shape' && x.oppSig).map((x) => ({ id: x.id, sig: x.oppSig }));
          if (dflt && dflt.cond === 'opp_shape' && dflt.oppSig) cands.push({ id: 'default', sig: dflt.oppSig });
          let win = null, best = 0.18;   // close enough to count as lining up like the shirts that were placed
          if (live) cands.forEach((c) => { const dd = FM.sigDistance(live, c.sig); if (dd < best) { best = dd; win = c.id; } });
          info.shapeWinner = win;
          info.prevPage = (FM.PREV_END[k] && team.pageNow[FM.PREV_END[k]]) || null;
          const sc = FM.pickPage(list, info, dflt);
          team.pageNow[k] = sc ? sc.id : null;
          const dl = FM.pageName(team, k, null);
          [dl].concat(list.map((x) => FM.pageName(team, k, x))).forEach((l) => { const kk = team.id + '|' + k + '|' + l; if (match.pageTime[kk] == null) match.pageTime[kk] = 0; });
          const t = team.id + '|' + k + '|' + (sc ? FM.pageName(team, k, sc) : dl);
          match.pageTime[t] = (match.pageTime[t] || 0) + 1;
        });
        // The build-up is prepared for the ways the opposition may press. If one of them is how they are pressing, that page is used. If not, the
        // team is set up from its formation, and follows the instructions of the prepared page closest to how they are pressing.
        const bl = team.pages.buildEnd || [];
        team.buildUnmatched = false;
        if (team.pageNow.buildEnd) team.pageNow.build = team.pageNow.buildEnd;
        else if (bl.length) {
          const LVL = { opp_high: 0.75, opp_mid: 0.5, opp_low: 0.25 };
          let near = null, nd = 9;
          bl.forEach((x) => { const dd = Math.abs((LVL[x.cond] == null ? 0.5 : LVL[x.cond]) - info.oppPress); if (dd < nd) { nd = dd; near = x; } });
          team.pageNow.buildEnd = near ? near.id : null; team.pageNow.build = null; team.buildUnmatched = true;
        } else team.pageNow.build = null;
      }
    });
  }
  // How strongly the team is in a counter-attack, from 0 (not) to 1, in the seconds just after winning the ball.
  function counterNow(match, team) {
    const ch = match.lastChange;
    if (!ch || ch.team !== team) return 0;
    const since = match.clock - ch.t;
    if (since >= COUNTER_WINDOW) return 0;
    const securedFor = match.possessionTeamSince && match.possessionTeamSince.team === team ? match.clock - match.possessionTeamSince.t : 0;
    const secure = clamp(1 - Math.max(0, securedFor - 3) / 3, 0, 1);
    return team.tactics.counterAttack * (1 - since / COUNTER_WINDOW) * secure;
  }

  // ---------- the decision a ball carrier makes ----------
  function laneInfo(match, team, from, toX, toY) {
    const opp = other(match, team);
    let lane = 99;
    opp.players.forEach((o) => {
      const s = segInfo(o.x, o.y, from.x, from.y, toX, toY);
      if (s.t > 0.03 && s.d < lane) lane = s.d;
    });
    let press = 99;
    opp.players.forEach((o) => { const d = Math.hypot(o.x - toX, o.y - toY); if (d < press) press = d; });
    return { lane, press };
  }
  // Defenders standing between the shooter and the goal, within 9 m, make a good chance a worse one.
  function crowd(match, team, p) {
    const gx = team.attackDir === 1 ? L : 0;
    let n = 0;
    other(match, team).players.forEach((o) => {
      if (o.group === 'GK') return;
      const goalSide = team.attackDir === 1 ? o.x > p.x - 1 : o.x < p.x + 1;
      if (goalSide && Math.hypot(o.x - p.x, o.y - p.y) < 9 && Math.abs(gx - o.x) < Math.abs(gx - p.x) + 1) n++;
    });
    return n;
  }
  function nearestOpponent(match, team, p) {
    let best = null, bd = 99;
    other(match, team).players.forEach((o) => { const d = dist(o, p); if (d < bd) { bd = d; best = o; } });
    return { opp: best, d: bd };
  }

  // Live context changes while the player is on the ball. This is deliberately
  // separate from the manager's underlying tactic: tempo and directness set a
  // preference, while pressure, an opening and match state decide whether this
  // particular moment should be played faster or more vertically.
  function liveBallContext(match, team, carrier) {
    const depth = FM.toTeamSpace(team.attackDir, carrier.x, carrier.y).d;
    const pressureD = nearestOpponent(match, team, carrier).d;
    const pressure = clamp((8 - pressureD) / 6, 0, 1);
    let forwardOpening = 0;
    team.players.forEach((mate) => {
      if (mate === carrier || mate.group === 'GK') return;
      const forward = (mate.x - carrier.x) * team.attackDir;
      if (forward < 5 || forward > 38) return;
      const receiverSpace = nearestOpponent(match, team, mate).d;
      if (receiverSpace < 5) return;
      const lane = laneInfo(match, team, carrier, mate.x, mate.y).lane;
      forwardOpening = Math.max(forwardOpening, clamp((receiverSpace - 5) / 8, 0, 1) * clamp(lane / 5, 0, 1));
    });
    const minute = match.clock / 60;
    const deficit = Math.max(0, (match.score[other(match, team).id] || 0) - (match.score[team.id] || 0));
    const chase = deficit ? clamp((minute - 55) / 30, 0, 1) * clamp(deficit / 2, 0, 1) : 0;
    const counter = counterNow(match, team);
    const directBoost = clamp(.3 * counter + .24 * chase + .15 * pressure * forwardOpening, 0, .42);
    const urgency = clamp(.55 * pressure + .42 * counter + .22 * forwardOpening + .38 * chase, 0, 1.35);
    const patience = clamp((1 - pressure) * (1 - counter) * (1 - .7 * chase) * (depth < .42 ? 1 : .45), 0, 1);
    return { pressure, forwardOpening, chase, counter, directBoost, urgency, patience };
  }

  // a record of what players in the final third chose, for tuning (FM.DBG = {} switches it on)
  function chooseAction(match, team, carrier) {
    const opt = chooseActionInner(match, team, carrier);
    if (FM.DBG) {
      const depth = FM.toTeamSpace(team.attackDir, carrier.x, carrier.y).d;
      if (depth > 0.72 && carrier.group !== 'GK') {
        const clr = clearAhead(match, team, carrier, 9), nd = nearestOpponent(match, team, carrier).d;
        const k = opt.kind + (opt.kind === 'pass' ? ((opt.tx - carrier.x) * team.attackDir < 5 ? ':side/back' : ':forward') : '');
        const key = (clr ? 'clear' : 'covered') + '|' + (nd > 2.2 ? 'free' : 'pressed') + '|' + k; FM.DBG[key] = (FM.DBG[key] || 0) + 1;
      }
    }
    return opt;
  }
  function chooseActionInner(match, team, carrier) {
    const tac = team.tactics;
    const rng = match.rng;
    const role = carrier.roleId;
    const ownDepth0 = FM.toTeamSpace(team.attackDir, carrier.x, carrier.y).d;
    const counter = counterNow(match, team);
    const live = liveBallContext(match, team, carrier);
    // Which phase the ball is in decides which of the manager's instructions apply.
    const zone = ownDepth0 < 0.38 ? 'build' : ownDepth0 > 0.68 ? 'final' : 'mid';
    const mods = FM.instrMods(carrier, true);
    // A side that is well ahead plays the game out: it keeps the ball, takes fewer risks and does not keep shooting. Without this a lopsided match feeds on itself.
    const lead = (match.score[team.id] || 0) - (match.score[other(match, team).id] || 0);
    const coast = clamp((lead - 1) / 3, 0, 1) * (FM.COAST == null ? 1 : FM.COAST);
    const directness = clamp((zone === 'build' ? tac.buildDirect : tac.directness) + 0.5 * counter + live.directBoost + mods.passDirect - (mods.holdUp ? 0.2 : 0) + (carrier.group === 'GK' ? 0.4 * mods.distribution : 0) - 0.25 * coast, 0, 1);
    const baseRisk = zone === 'final' ? tac.finalRisk : tac.risk;
    let risk = clamp(baseRisk + (ROLE_RISK[role] || 0) + 0.25 * counter + .18 * live.chase + mods.risk - 0.3 * coast, 0, 1);
    const goal = { x: team.attackDir === 1 ? L : 0, y: W / 2 };
    const dGoal = dist(carrier, goal);
    const ownDepth = FM.toTeamSpace(team.attackDir, carrier.x, carrier.y).d;
    const lossFactor = 1 + 1.3 * (1 - ownDepth); // losing the ball deep in your own half costs more
    const options = [];
    // Through on goal: no defender is goal-side of him in his channel, so he is past the last line.
    const throughDef = other(match, team).players.filter((o) => o.group !== 'GK' && (o.x - carrier.x) * team.attackDir > -1 && Math.abs(o.y - carrier.y) < 24).length;
    const through = carrier.group !== 'GK' && throughDef === 0 && ownDepth0 > 0.55;
    const nearNow = nearestOpponent(match, team, carrier).d;
    // The manager's own instructions, for this player in this situation.
    const RE = team.rules && team.rules.length ? FM.rulesFold(FM.rulesActive(team, carrier, FM.rulesCtx(team, match.ball, true, nearNow < 4))) : null;
    if (RE) risk = clamp(risk + 0.35 * RE.risk, 0, 1);
    const evPass = RE && RE.passScore.length ? FM.rulesEv(team, carrier, match.ball, true) : null;

    const lastDefs = other(match, team).players.filter((o) => o.group !== 'GK').map((o) => o.x * team.attackDir);
    const lastDefenderX = lastDefs.length ? Math.max.apply(null, lastDefs) * team.attackDir : null;
    team.players.forEach((t) => {
      if (t === carrier) return;
      const d = dist(carrier, t);
      if (d < 4 || d > 60) return;
      const leadT = d / clamp(10 + d * 0.5, 12, 26);
      const forward = (t.x - carrier.x) * team.attackDir > -5;
      // Space behind a high defensive line is easier to run into, and the counter-attack finds it fastest.
      const space = clamp(1 + 3 * (other(match, team).tactics.lineHeight - 0.5), 0.5, 2.2) * (1 + 0.6 * counter) * (0.8 + 0.4 * t.ratings.pace / 70);
      const ahead = forward ? (2 + 8 * directness) * space * (['WF', 'ST', 'AM'].includes(t.group) ? 1 : 0.35) * team.attackDir : 0;
      let tx = clamp(t.x + t.vx * leadT + ahead, 1, L - 1);
      let ty = clamp(t.y + t.vy * leadT, 1, W - 1);
      // In the final third, attacking midfielders and wide forwards make
      // diagonal runs into useful shooting lanes instead of remaining pinned
      // to a low-value angle beside the touchline.
      if (Math.hypot(tx - goal.x, ty - goal.y) < 34 && (t.group === 'WF' || t.group === 'AM')) {
        ty += (W / 2 - ty) * (t.group === 'WF' ? .65 : .4);
      }
      // The ball is played to where the receiver can meet it: a run is timed off the last defender, so the pass lands level with the line or
      // a step beyond it, not several metres behind a defence that is still goal-side.
      if (forward) { const lastX = lastDefenderX; if (lastX != null && (tx - lastX) * team.attackDir > (FM.BEHIND_LINE == null ? 1.5 : FM.BEHIND_LINE)) tx = lastX + team.attackDir * (FM.BEHIND_LINE == null ? 1.5 : FM.BEHIND_LINE); }
      const { lane, press } = laneInfo(match, team, carrier, tx, ty);
      let p = FM.passProb(carrier, d, lane, press, FM.edgeFor(match, team)) * (team.tacticalFactor || 1);
      // Played in behind the last defender: the ball has to be weighted and the runner has to time it, so these are hard passes to complete.
      if ((tx - carrier.x) * team.attackDir > 6 && !other(match, team).players.some((o) => o.group !== 'GK' && (o.x - tx) * team.attackDir > 0)) p *= (FM.OVER_TOP == null ? .7 : FM.OVER_TOP);
      const prog = clamp((dGoal - Math.hypot(tx - goal.x, ty - goal.y)) / 25, -0.6, 1.2);
      const boxBonus = Math.hypot(tx - goal.x, ty - goal.y) < 19 && Math.abs(ty - W / 2) < 18 ? 0.45 * (0.5 + risk) : 0;
      // Outside the final third a team is patient: going forward is worth less than keeping the ball, so play is circulated and the ball is moved up in stages.
      const progK = zone === 'final' ? 1 : (FM.PROG_K == null ? .38 : FM.PROG_K);
      const score = p * (0.35 + directness * 0.9 * prog * progK + 0.5 * prog * risk * progK + boxBonus) - (1 - p) * 0.6 * (1 - risk) * lossFactor;
      // The chance it creates. A pass that puts a team-mate somewhere he is clearly likelier to score from than the man on the ball is the
      // pass a player looks for: it counts for what the receiver could do with it, whoever he is.
      let chance = 0;
      if (t.group !== 'GK' && Math.hypot(tx - goal.x, ty - goal.y) < 32) {
        const rx = sig(FM.xgLogit(t, tx, ty, team.attackDir, press));
        const cx = sig(FM.xgLogit(carrier, carrier.x, carrier.y, team.attackDir, nearNow));
        // Do not turn every promising possession into the same straight pass
        // to the centre-forward. Wide forwards and attacking midfielders must
        // also receive the ball in scoring positions, as they do in a real
        // attack, while the striker remains the likeliest single scorer.
        const chanceRole = ({ ST: .28, WF: 1, AM: .95, CM: .62, FB: .35, DM: .25, CB: .12 })[t.group] || .5;
        chance = (FM.CHANCE_BONUS == null ? 1.35 : FM.CHANCE_BONUS) * chanceRole * p * Math.max(0, rx - cx);
      }
      const off = match.noOffside ? 'on' : offsideStatus(match, team, carrier, t.x);
      // A player through on goal does not turn and play it back, and near the opposition box a pass backwards is a last resort
      // (when he is being closed down hard) rather than the usual choice.
      const back = (carrier.x - t.x) * team.attackDir;
      let adj = 0;
      if (zone !== 'final' && nearNow > 4) adj += (FM.CIRC == null ? 1.4 : FM.CIRC) * p * (back > 3 ? (ownDepth0 > 0.45 ? 0.3 : 0.8) : back > -3 ? 1 : 0.1);   // a safe pass to keep the ball when nobody is on him
      // The free man. A teammate with no defender near him is the pass a real player looks for, so an open receiver (nearest defender
      // well away) is favoured, more so for a pass that goes forward or across than one that goes back; a marked one is not.
      adj += (FM.OPEN_BONUS == null ? 0.5 : FM.OPEN_BONUS) * clamp((press - 3) / 9, 0, 1) * (back < -3 ? 1 : back < 3 ? 0.7 : 0.3);
      if (through && back > 3) adj = -2.0;
      else if (through && back > -3) adj = -(FM.SQUARE_PEN == null ? 1.4 : FM.SQUARE_PEN);   // past the last defender he goes on, he does not square it
      else if (ownDepth0 > 0.66 && back > 8) adj = (nearNow < 2.5 ? 0.45 : 1) * -(FM.BACK_PEN == null ? 0 : FM.BACK_PEN);
      if (!through && back > 6 && ownDepth0 > 0.42) {
        // Being closed down is a reason to lay it off, and a short lay-off to a midfielder is fine; a long ball back to a centre-back from the
        // attacking half is not what a player does with a team-mate beside him, so the longer the pass back to a defender the less he wants it.
        const toDef = t.group === 'CB' || t.group === 'GK';
        adj -= (FM.BACKPASS_K == null ? 1.5 : FM.BACKPASS_K) * (clamp((back - 6) / 14, 0.25, 1) * (toDef ? 1.6 : 1) * clamp((ownDepth0 - 0.42) / 0.3, 0.3, 1)) * (nearNow > 2.0 ? 1 : 0.55) + (toDef ? (FM.BACKLONG_K == null ? 1.0 : FM.BACKLONG_K) * clamp((d - 18) / 18, 0, 1) : 0);
      }
      // Playing out short. A team set to build patiently does not send the ball a long way when it has a shorter pass: the longer the pass, and the
      // more patient the setting, the less the player wants it. (A team set to go long has no such penalty.)
      if (zone === 'build' && tac.buildDirect < 0.5) adj -= Math.pow(0.5 - tac.buildDirect, 2) * (FM.SHORT_PREF == null ? 14 : FM.SHORT_PREF) * clamp((d - 12) / 20, 0, 1);
      if (RE) {
        if (RE.short) adj -= RE.short * 3 * clamp((d - 18) / 22, 0, 1);
        if (RE.long) adj -= RE.long * 3.2 * clamp((24 - d) / 14, 0, 1);
        RE.passTo.forEach((pt) => { if (FM.rulesReceiver(pt.to, t, carrier, team)) adj += pt.w * 1.1; });
        adj += (RE.dir[back < -3 ? 'forward' : back > 3 ? 'backward' : 'sideways'] || 0) * 0.9;
        adj += RE.freeMan * clamp((press - 3) / 9, 0, 1);
        if (RE.passScore.length) { evPass.receiver = t; RE.passScore.forEach((ps) => { if (FM.rulesPred(ps.where, evPass)) adj += ps.w * 1.1; }); }
      }
      const targetGoalD = Math.hypot(tx - goal.x, ty - goal.y);
      const attackSpread = zone === 'final' && targetGoalD < 32
        ? (({ ST: (FM.ST_SPREAD == null ? -0.6 : FM.ST_SPREAD), WF: .58, AM: .5, CM: .28, FB: .1 })[t.group] || 0)
        : 0;
      options.push({ kind: 'pass', target: t, tx, ty, d, lane, press, p, score: off === 'off' ? -4 : score + adj + chance + attackSpread });
    });

    // Beating the press. How likely a team is to go long depends on how the other side press its build-up. Against a side that press high
    // and hard, the short passes are the ones that get closed down, so a team set to beat the press sends the ball long up the pitch;
    // against a side that is not pressing like that the short passes are safe, the setting does nothing, and the usual build-up settings
    // decide. The press is read from the opposition's own settings for pressing its build-up and pressing generally.
    if (ownDepth0 < 0.5) {
      const beat = tac.beatPress == null ? 0.5 : tac.beatPress, ot = other(match, team).tactics;
      const oppPress = 0.6 * (ot.pressBuildUp == null ? 0.4 : ot.pressBuildUp) + 0.4 * pressingNow(match, other(match, team));
      const pressure = clamp((oppPress - 0.4) / 0.45, 0, 1);
      // ...but nobody hoofs it away while a team-mate is standing in the clear close by: the long ball is for when the short ones are closed.
      const freeClose = options.some((o) => o.kind === 'pass' && o.d < 26 && o.p >= 0.82 && o.press >= 6 && o.score > -3);
      if (pressure > 0) options.forEach((o) => { if (o.kind === 'pass' && o.d >= 28 && (o.tx - carrier.x) * team.attackDir > 15 && o.score > -3) o.score += beat * (FM.BEAT_K || 2.5) * pressure * (0.4 + o.p) * (0.4 + 0.6 * directness) * (freeClose ? 0.25 : 1); });
    }
    // The sensible pass. With a team-mate open and safe close by, a long pass that is much less likely to arrive is not the choice a player
    // makes, whatever the team's settings: the settings decide between sensible passes, they do not make a bad one good.
    {
      let bestOpen = null;
      options.forEach((o) => { if (o.kind === 'pass' && o.d < 28 && o.p >= 0.8 && o.press >= 6 && o.score > -3 && (!bestOpen || o.p > bestOpen.p)) bestOpen = o; });
      if (bestOpen) options.forEach((o) => {
        if (o.kind !== 'pass' || o.d < bestOpen.d + 10 || o.p > bestOpen.p - 0.08) return;
        o.score -= (FM.SENSIBLE_PEN == null ? 1.6 : FM.SENSIBLE_PEN) * clamp((o.d - bestOpen.d - 8) / 14, 0, 1) * clamp((bestOpen.p - o.p) / 0.3 + 0.35, 0, 1) * (1 - 0.5 * directness);
      });
    }

    const { opp: nearOpp, d: nearD } = nearestOpponent(match, team, carrier);
    // A defender who is behind the ball-carrier has been beaten: he is chasing, he is not in the way.
    const nearBehind = !!nearOpp && (nearOpp.x - carrier.x) * team.attackDir < -0.5;
    // Beating a man in the final third is harder than in midfield: the cover is close, and one beaten man is not the whole defence.
    const dp = FM.dribbleProb(carrier, nearBehind ? nearD * 2.4 : nearD, nearOpp, FM.edgeFor(match, team)) * (team.tacticalFactor || 1) * (ownDepth0 > 0.66 ? (FM.DRIB_FINAL == null ? 1 : FM.DRIB_FINAL) : 1);
    const dribbleBias = (GROUP_DRIBBLE[carrier.group] || 0) + (ROLE_DRIBBLE[role] || 0);
    // A carry into empty grass is not a take-on. Previously both used the
    // dribble duel, producing hundreds of apparent one-v-ones per match.
    const carrySpace = clamp((nearD - 3.5) / 8, 0, 1);
    // With open grass ahead in the attacking half a forward runs at goal instead of standing and passing: he drives until a defender engages him or
    // he is in range to shoot.
    const drive = ownDepth0 > 0.5 && nearD > 2.2 && ['AM', 'WF', 'ST', 'CM', 'FB', 'DM'].includes(carrier.group) && clearAhead(match, team, carrier, ownDepth0 > 0.72 ? 9 : 14);
    if ((nearD > 3.5 || drive) && carrier.group !== 'GK') options.push({ kind: 'carry', nearD, drive, score: .38 + (.4 + (FM.CARRY_BONUS == null ? .3 : FM.CARRY_BONUS)) * carrySpace + .22 * directness + .18 * counter - .22 * (zone === 'build' && carrier.group === 'CB' ? 1 : 0) + (drive ? (FM.DRIVE_K == null ? 0.5 : FM.DRIVE_K) * (ownDepth0 > 0.72 ? 1.7 : 1) * (['WF', 'ST', 'AM'].includes(carrier.group) ? 1 : .7) : 0) });
    let dribbleOption = null;
    const willingDribbler = ['WF', 'AM', 'ST', 'CM'].includes(carrier.group) || mods.dribble > 0 || tac.dribbleFreedom > .65;
    if (nearD < 3.1 && willingDribbler && (zone === 'final' || mods.dribble > 0 || tac.dribbleFreedom > .72)) {
      dribbleOption = { kind: 'dribble', p: dp, nearOpp, nearD, behind: nearBehind, score: dp * (.05 + .3 * directness + dribbleBias + mods.dribble + (tac.dribbleFreedom - .5) * .55 + (zone === 'final' ? .15 : 0) + (through ? .2 : 0)) - (1 - dp) * .9 * (1 - risk) * lossFactor - .25 };
      options.push(dribbleOption);
    }

    if (drive && ownDepth0 > 0.7) options.forEach((o) => { if (o.kind === 'pass' && (o.tx - carrier.x) * team.attackDir < 5) o.score -= (FM.DRIVE_PASS_PEN == null ? 1.3 : FM.DRIVE_PASS_PEN); });
    // In the final third a pass sideways or back is the safe choice and the one a player makes when he has run out of ideas; a forward player is
    // expected to try something: take the man on, play it forward, shoot. So sideways and back passes there lose a little, and a take-on gains a little.
    if (ownDepth0 > 0.72 && carrier.group !== 'GK') {
      // free: nobody within a few metres, so there is time and room to run at them; pressed: he is being closed down and may need to lay it off
      const freeK = nearD > (FM.FREE_ND == null ? 3.2 : FM.FREE_ND) ? 1 : 0;
      options.forEach((o) => {
        if (o.kind === 'pass' && (o.tx - carrier.x) * team.attackDir < 5 && !through) o.score -= (FM.FINAL_SIDE_PEN == null ? 0.15 : FM.FINAL_SIDE_PEN) + freeK * (FM.FREE_SIDE_PEN == null ? 0.5 : FM.FREE_SIDE_PEN);
        if (o.kind === 'carry' && freeK) o.score += (FM.FREE_CARRY == null ? 0.4 : FM.FREE_CARRY);
      });
      if (dribbleOption) dribbleOption.score += (FM.FINAL_DRIB == null ? 0 : FM.FINAL_DRIB);
    }
    // Clear through on goal (nobody between him and the keeper): he runs at goal and shoots. Laying it off sideways or back is not on.
    if (through && carrier.group !== 'GK' && ownDepth0 > 0.6 && !options.some((o) => o.kind === 'carry')) options.push({ kind: 'carry', nearD, drive: true, score: 0.9 });   // even with a man on his heels he runs on at goal
    if (through && carrier.group !== 'GK' && ownDepth0 > 0.6) options.forEach((o) => {
      if (o.kind === 'pass' && (o.tx - carrier.x) * team.attackDir < 8) o.score -= 3;
      else if (o.kind === 'carry') o.score += 1.5;
      else if (o.kind === 'shoot') o.score += 0.6;
    });
    if (RE && dribbleOption) dribbleOption.score += 0.35 * RE.dribble;
    // In his own third with a defender close, taking the man on is the last thing a defender wants to do.
    if (dribbleOption && zone === 'build' && nearD < 3.5) dribbleOption.score -= 0.5 * (1 - nearD / 3.5) * (1 + (1 - risk)) * (['GK', 'CB', 'FB'].indexOf(carrier.group) >= 0 ? 2.4 : ['DM', 'CM'].indexOf(carrier.group) >= 0 ? 1.5 : 1) * (FM.DRIBBLE_BUILD_PEN == null ? 1 : FM.DRIBBLE_BUILD_PEN);
    const attackingThird = FM.toTeamSpace(team.attackDir, carrier.x, carrier.y).d > 0.6;
    if (((dGoal < FM.dialM(team, 'shootRange') && attackingThird) || (through && dGoal < FM.dialM(team, 'shootRange') + 6)) && carrier.group !== 'GK') {
      const xg = sig(FM.xgLogit(carrier, carrier.x, carrier.y, team.attackDir, nearD) - 0.55 * crowd(match, team, carrier));
      options.push({ kind: 'shoot', xg, score: xg * 2.75 * (0.5 + risk * 0.8) * (0.45 + tac.shootFreedom) * mods.shoot - (1 - xg) * 0.2 - Math.max(0, 0.1 - xg) * 6.5 * (1.2 - tac.shootFreedom) * (['AM', 'WF', 'CM'].indexOf(carrier.group) >= 0 ? (FM.MID_LOWXG == null ? .85 : FM.MID_LOWXG) : 1) + 0.25 * clamp((nearD - 1.2) / 2.5, 0, 1) * clamp((25 - dGoal) / 13, 0, 1) + (through ? .28 * clamp((36 - dGoal) / 20, 0, 1) : 0) + .75 * (({ ST: 0.45, WF: .85, AM: 1, CM: .8, DM: .3, FB: .25, CB: .1 })[carrier.group] || 0.4) * clamp((26 - dGoal) / 12, 0, 1) * clamp((nearD - 1.2) / 2.5, 0, 1) + .32 - Math.max(0, .045 - xg) * 5 + (({ ST: -.28, WF: .12, AM: .1, CM: .02 })[carrier.group] || 0) });
    }

    // Under severe pressure near their own goal, defenders can deliberately
    // clear rather than disguising a clearance as an ambitious normal pass.
    const safeOutlet = options.some((o) => o.kind === 'pass' && o.d < 25 && o.p > .76 && o.press > 4.5);
    const clearanceReady = !match.lastClearance || match.clock - (match.lastClearance[team.id] || -99) > 18;
    if (clearanceReady && !safeOutlet && ownDepth0 < .24 && nearNow < 1.9 && ['GK', 'CB', 'FB', 'DM'].includes(carrier.group)) {
      const forwardPasses = options.filter((o) => o.kind === 'pass' && o.d > 24 && (o.tx - carrier.x) * team.attackDir > 12);
      if (forwardPasses.length) {
        forwardPasses.sort((a, b) => b.d - a.d);
        options.push({ kind: 'clear', pass: forwardPasses[0], score: .25 + .55 * (1 - risk) + .3 * live.pressure });
      }
    }

    // Keeping the ball is a real decision. It is most attractive in settled,
    // unpressured possession and prevents every decision clock becoming an action.
    if (nearNow > 4 && !through && !drive) options.push({ kind: 'hold', score: .48 + .55 * live.patience - .4 * live.urgency - .2 * directness });

    if (coast > 0) options.forEach((o) => { if (o.kind === 'shoot' && o.score > 0) o.score *= 1 - 0.45 * coast; });
    options.forEach((o) => { if (o.kind === 'shoot' && o.score > 0) o.score *= (FM.SHOT_K == null ? 1.45 : FM.SHOT_K); });
    if (RE && RE.shoot) options.forEach((o) => { if (o.kind === 'shoot' && o.score > 0) o.score *= clamp(1 + 0.9 * RE.shoot, 0.1, 2); });

    if (!options.length) options.push({ kind: 'carry', nearD: 3, drive: false, score: 0 });   // never nothing to do: he keeps the ball and moves on
    // Softmax: the manager's settings favour an action, but nothing is certain.
    const temp = 0.22 + 0.25 * (1 - carrier.ratings.composure / 100);
    let pool = options;
    if (match.forcePass || carrier.group === 'GK') { const only = options.filter((o) => o.kind === 'pass' && o.d < 40); if (only.length) pool = only; }   // a goalkeeper plays it: he does not dribble out with it
    if (carrier.group === 'GK' && nearNow < 6 && directness >= 0.45) { const longs = options.filter((o) => o.kind === 'pass' && o.d >= 26); if (longs.length) pool = longs; }
    // A goalkeeper never gives the ball away in front of his own goal: he plays only a pass that is very likely to arrive (a free team-mate, a clear lane),
    // and with none of those he kicks it long, well away from goal, rather than rolling it to a man a striker is about to close down.
    if (carrier.group === 'GK' && !match.forcePass) {
      const safe = options.filter((o) => o.kind === 'pass' && o.d < 40 && o.p >= (FM.GK_SAFE_P == null ? 0.88 : FM.GK_SAFE_P) && o.press >= 6 && o.lane >= 3);
      if (safe.length) pool = safe;
      else { const kicks = options.filter((o) => o.kind === 'pass' && o.d >= 30 && (o.tx - carrier.x) * team.attackDir > 20); if (kicks.length) pool = kicks.sort((x, y) => y.p - x.p).slice(0, 2); }   // the two likeliest to find someone: he hits the best target, he does not gamble
    }
    if (FM.debugChoose) FM.debugChoose(carrier, options, pool, directness, risk, { through, ownDepth0, throughDef });
    const maxScore = Math.max.apply(null, pool.map((o) => o.score));
    const weights = pool.map((o) => Math.exp((o.score - maxScore) / temp));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rng() * total;
    for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }

  // how long a man takes over the ball before he plays it; the side's tempo scales all of it (about 1.4 times as long at the slowest setting, 0.6 at the quickest)
  function delayBeforeNextDecision(match, team, carrier) {
    // nobody stands over the ball for ten seconds: a keeper plays it within a few, an outfield man within about five
    return Math.min(delayRaw(match, team, carrier) * clamp(1.4 - 0.8 * team.tactics.tempo - 0.25 * counterNow(match, team), 0.55, 1.45), carrier.group === 'GK' ? (FM.GK_HOLD_MAX == null ? 3.6 : FM.GK_HOLD_MAX) : (FM.HOLD_MAX == null ? 5.2 : FM.HOLD_MAX));
  }
  function delayRaw(match, team, carrier) {
    // Settled first-phase possession has its own rhythm. Centre-backs and the
    // goalkeeper commonly hold the ball for several seconds while the press
    // and passing lanes develop; midfield is quicker, and the final third is
    // quicker still. Previously all of the first two thirds shared one short
    // timer, which made calm circulation look like an automatic passing drill.
    const depth = FM.toTeamSpace(team.attackDir, carrier.x, carrier.y).d;
    const build = depth < .38;
    const midfield = depth < .66;
    const tempoK = clamp(team.tactics.tempo + 0.4 * counterNow(match, team), 0, 1);
    const base = build
      ? (FM.BUILD_HOLD_BASE == null ? 10.2 : FM.BUILD_HOLD_BASE) - 1.3 * tempoK
      : midfield
        ? (FM.HOLD_BASE == null ? 7.8 : FM.HOLD_BASE) - 1.2 * tempoK
        : 6.5 - 1.5 * tempoK;
    const { d } = nearestOpponent(match, team, carrier);
    const pressureFactor = midfield ? (d < 3 ? 0.58 : d < 6 ? 0.76 : d < 10 ? 0.92 : 1) : (d < 3 ? 0.62 : d < 6 ? 0.84 : 1);
    let tempoD = 0, hold = false;
    if (team.rules && team.rules.length) { const f = FM.rulesFold(FM.rulesActive(team, carrier, FM.rulesCtx(team, match.ball, true, d < 4))); tempoD = f.tempo; hold = f.holdUp; }
    const clear = clearThrough(match, team, carrier) ? 0.3 : 1;   // one on one with the keeper there is no time to think
    const planned = (base * clear * (1 - 0.35 * tempoD) * pressureFactor + (FM.instrMods(carrier, true).holdUp || hold ? 0.9 : 0)) * (0.82 + 0.36 * match.rng()) + (midfield ? 0 : 0.18);
    // A man with a defender on top of him does not stand and think: he gets rid of it, or moves it on, within a second or two.
    if (d < 2.5) return Math.min(planned, 1.7 + 1.0 * match.rng());
    if (d < 4.5) return Math.min(planned, Math.max(2.6, planned * 0.75));
    return Math.max(counterNow(match, team) > .45 || clear < 1 ? 2.1 : 3.8, planned);
  }

  function reassessDecisionTiming(match, dt) {
    if (!match.carrier || match.carry || match.forcePass) return;
    const { team, player } = match.carrier;
    const elapsed = match.clock - (match.possessionReceivedAt == null ? match.clock : match.possessionReceivedAt);
    if (elapsed < .3) return; // control the pass before reading the next action
    const live = liveBallContext(match, team, player);
    // Urgency continuously consumes the remaining thinking time; calm deep
    // possession adds a little patience, but only up to a bounded ceiling.
    // Thus the same player can wait, release, or suddenly go vertical as the
    // picture around him changes rather than obeying one receive-time timer.
    if (live.urgency > .12) match.nextDecision -= dt * .16 * live.urgency;
    if (live.patience > .05 && live.forwardOpening < .35) {
      const receivedAt = match.possessionReceivedAt == null ? match.clock : match.possessionReceivedAt;
      const ceiling = receivedAt + (player.group === 'GK' ? 3.8 : 5.4);
      match.nextDecision = Math.min(ceiling, match.nextDecision + dt * .6 * live.patience);
    }
    // Close pressure always wins over patience, but a player still needs a
    // readable touch rather than releasing in the same animation frame.
    if (live.pressure > .7) match.nextDecision = Math.min(match.nextDecision, match.clock + 1.05 + .65 * (1 - live.pressure));
  }

  // ---------- performing an action ----------
  function doPass(match, team, carrier, opt) {
    const rng = match.rng;
    const st = statsOf(match, team);
    st.passes++;
    // a goalkeeper's short pass is the most rehearsed pass in the game: half as likely to go wrong as the same pass from anyone else
    const pEff = carrier.group === 'GK' && opt.d < 35 ? 1 - (1 - opt.p) * 0.5 : opt.p;
    // How well the ball is struck depends on how good the pass is (its lane, the pressure, the distance): the worse it is, the more the direction and the weight can go
    // astray. Nothing else is decided here: where the ball ends up is what happens to it on the way.
    const err = 1 - pEff, g = () => (rng() + rng() + rng() - 1.5) / 0.5;
    const sigma = (FM.PASS_SIGMA == null ? 1.15 : FM.PASS_SIGMA) * (0.012 + 0.22 * Math.pow(err, 1.2)) * (0.7 + 0.5 * (1 - (carrier.ratings.passing || 60) / 100));
    // the pass is played to where the man will be, not to where he is: his run is led by the time the ball takes
    const tf = opt.d / Math.max(10, clamp(11 + opt.d * 0.4, 12, 23) * 0.85), aimX = clamp(opt.tx, 4.5, L - 4.5), aimY = opt.ty;   // nobody plays a pass to a spot on the end line: it is played just inside it
    const wideK = 1 + (FM.WIDE_ERR == null ? 3 : FM.WIDE_ERR) * clamp((Math.abs(aimY - W / 2) - 20) / 10, 0, 1);   // a ball played to a man on the touchline is harder to weight
    const ang = Math.atan2(aimY - carrier.y, aimX - carrier.x) + g() * sigma * wideK, len = Math.max(2, Math.hypot(aimX - carrier.x, aimY - carrier.y) * (1 + g() * 0.045 * (0.4 + 2 * err)));
    // Metres per simulated second. A routine ground pass should be readable on the pitch rather than flashing between players.
    const speed = clamp(11 + opt.d * 0.4, 12, 23) * (1 + g() * 0.03);
    const flight = { kind: 'pass', team, passer: carrier, speed, target: opt.target, ex: carrier.x + Math.cos(ang) * len, ey: carrier.y + Math.sin(ang) * len, free: true, dir: { x: Math.cos(ang), y: Math.sin(ang) }, len, run: 0, t: 0, outcome: 'pending' };
    const os = match.noOffside ? 'on' : offsideStatus(match, team, carrier, opt.target.x);
    flight.offside = os === 'off' || (os === 'marginal' && rng() < 0.1 + 0.3 * other(match, team).tactics.offsideTrap);
    // for the manager's analysis: where the pass was going, and how many team-mates were in the box when it left
    let boxMates = 0; { const gxA = team.attackDir === 1 ? L : 0; team.players.forEach((q) => { if (q !== carrier && Math.abs(q.x - gxA) <= 16.5 && Math.abs(q.y - W / 2) <= 20.2) boxMates++; }); }
    record(match, { type: 'pass', kd: dist(match.ball, carrier), team: team.id, from: carrier.number, to: opt.target.number, tx: opt.tx, ty: opt.ty, box: boxMates, p: opt.p, ok: false, outcome: 'pending', dist: opt.d, lane: opt.lane, press: opt.press, forced: !!match.forcePass, carrierPressure: nearestOpponent(match, team, carrier).d });
    flight.ev = match.events[match.events.length - 1];
    flight.ev.hold = match.clock - (match.possessionReceivedAt == null ? match.clock : match.possessionReceivedAt); flight.ev.zone = FM.toTeamSpace(team.attackDir, carrier.x, carrier.y).d; flight.ev.grp = carrier.group;
    match.carrier = null; match.carry = null;
    match.flight = flight;
    match.ball.state = 'flight';
  }

  // ---------- the ball in flight and loose ----------
  // A pass goes where it was struck. The man it was meant for runs to meet it, the other side's nearest men read it and go for it too, and anyone whose reach the ball passes
  // through may get a touch: a team-mate controls it (or takes it badly and it runs loose), an opponent cuts it out cleanly, gets a foot to it (a deflection that runs loose),
  // or cannot get to it. A ball nobody touches rolls on and stops. Skill, the speed of the ball and how tightly he is marked all count.
  const gaussR = (rng) => (rng() + rng() + rng() - 1.5) / 0.5;
  function runPoint(p, f, ball) {
    const v = Math.max(f.speed, 6) * 0.88, ps = Math.max(5, (p.maxSpeed || 7) * 1.0), rem = Math.max(0, Math.min(f.len + 6 - f.run, 60));
    let best = null, bs = 1e9;
    for (let s = 0; s <= rem; s += 1.2) { const x = ball.x + f.dir.x * s, y = ball.y + f.dir.y * s, slack = Math.hypot(x - p.x, y - p.y) / ps - s / v; if (slack <= 0.1) return { x, y }; if (slack < bs) { bs = slack; best = { x, y }; } }
    return best || { x: ball.x + f.dir.x * rem, y: ball.y + f.dir.y * rem };
  }
  function knockLoose(match, p, tm, dirx, diry, speed, spread) {
    const ball = match.ball, a = Math.atan2(diry, dirx) + (match.rng() < 0.5 ? -1 : 1) * (0.35 + match.rng() * spread);
    match.flight = null; match.carrier = null; ball.state = 'loose'; match.lastTeam = tm; ball.vx = Math.cos(a) * speed; ball.vy = Math.sin(a) * speed; p.noPick = match.clock + 0.3;
  }
  // A ball rolling on grass: a steady rolling resistance plus a little drag that grows with speed, so it runs on, slows, and comes to rest with a decelerating roll
  // (braking hard and then creeping on, which is what an exponential does, does not look like a ball).
  function rollSpeed(v, dt, floor) {
    if (FM.OLD_ROLL) return Math.max(floor, v * Math.exp(-(FM.PASS_ROLL == null ? 2.6 : FM.PASS_ROLL) * dt));
    return Math.max(floor, v - dt * ((FM.ROLL_A == null ? 1.6 : FM.ROLL_A) + (FM.ROLL_B == null ? 0.9 : FM.ROLL_B) * v));
  }
  function stepFreePass(match, f, dt) {
    const ball = match.ball, rng = match.rng, team = f.team, opp = other(match, team);
    f.t += dt;
    if (f.v0 == null) { f.v0 = f.speed; f.speed *= (FM.PASS_BOOST == null ? 1.25 : FM.PASS_BOOST); }
    const x0 = ball.x, y0 = ball.y, sp = f.speed, move = sp * dt;
    // it slows on the grass; past the place it was aimed at it is rolling out
    if (f.run < f.len) f.speed = Math.max(f.v0 * 0.62, f.speed * Math.exp(-(FM.PASS_DECAY == null ? 0.45 : FM.PASS_DECAY) * dt)); else f.speed = rollSpeed(f.speed, dt, 0.4);
    ball.x += f.dir.x * move; ball.y += f.dir.y * move; f.run += move;
    // a pass that has been completed to a man: the ball is his, and he plays it
    const complete = (p) => {
      const ev = f.ev;
      if (f.offside && p === f.target) {
        statsOf(match, team).offsides++; if (ev) ev.outcome = 'offside';
        record(match, { type: 'offside', team: team.id, player: p.number, x: p.x, y: p.y });
        match.flight = null; startRestart(match, 'freekick', opp, clamp(ball.x, 0.5, L - 0.5), clamp(ball.y, 0.5, W - 0.5), { indirect: true }); return;
      }
      if (FM.claimLog) FM.claimLog.push({ g: Math.hypot(p.x - ball.x, p.y - ball.y), claimed: !!f.claim, sp: f.speed, why: f.claimWhy || 'direct' });
      statsOf(match, team).passesOk++; if (ev) { ev.ok = true; ev.outcome = 'complete'; }
      ball.vx = f.dir.x * f.speed; ball.vy = f.dir.y * f.speed; receive(match, team, p, 0.3, 0.12 + delayBeforeNextDecision(match, team, p));
    };
    // A man who has the ball coming to him (it passed within his reach) does not take it from three metres away: he goes onto it, and it is his when it is at his feet.
    if (f.claim) {
      const cp = f.claim.p, g = Math.hypot(cp.x - ball.x, cp.y - ball.y); f.claim.gap = Math.min(f.claim.gap, g);
      // the ball bends toward his feet at a limited rate (a pass with a little curl on it), so a man who is a few metres off the line can still be met by it
      { const tx = cp.x + (cp.vx || 0) * 0.15 - ball.x, ty = cp.y + (cp.vy || 0) * 0.15 - ball.y, want = Math.atan2(ty, tx), cur = Math.atan2(f.dir.y, f.dir.x); let d = want - cur; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
        if (g > 0.4 && Math.abs(d) < 1.6) { const a = cur + clamp(d, -(FM.STEER == null ? 1.6 : FM.STEER) * dt, (FM.STEER == null ? 1.6 : FM.STEER) * dt); f.dir.x = Math.cos(a); f.dir.y = Math.sin(a); } }
      if (g < (FM.CLAIM_AT == null ? 0.8 : FM.CLAIM_AT) || f.t > f.claim.until || g > f.claim.gap + 0.3) { f.claimWhy = g < (FM.CLAIM_AT == null ? 0.8 : FM.CLAIM_AT) ? 'arrived' : f.t > f.claim.until ? 'timeout' : 'passed'; complete(cp); return; }   // at his feet, or it has gone by him, or he has been waiting long enough
    }
    // who gets a touch: the first man along the ball's path whose reach it passes through
    let hit = null;
    const consider = (p, tm) => {
      if (f.claim && p === f.claim.p) return;
      if (p === f.passer && f.t < 0.5) return;
      const s = segInfo(p.x, p.y, x0, y0, ball.x, ball.y), reach = (p === f.target ? (FM.RECV_REACH == null ? 3.3 : FM.RECV_REACH) : tm === team ? 1.1 : 0.9) + (p.group === 'GK' ? 1.0 : 0) + (p.sliding ? 0.6 : 0);
      if (p === f.target) f.minD = Math.min(f.minD == null ? 99 : f.minD, s.d);
      if (s.d > reach) return; if (!hit || s.t < hit.t) hit = { p, tm, t: s.t, c: 1 - s.d / reach };
    };
    team.players.forEach((p) => consider(p, team)); opp.players.forEach((p) => consider(p, opp));
    if (hit) {
      const p = hit.p, mine = hit.tm === team, sk = (k) => ((p.ratings && p.ratings[k]) == null ? 60 : p.ratings[k]) / 100, ev = f.ev, tmx = hit.tm;
      if (mine) {
        const markD = nearestOpponent(match, team, p).d, ctrl = clamp((FM.CONTROL_BASE == null ? 0.92 : FM.CONTROL_BASE) + 0.2 * sk('composure') - 0.008 * Math.max(0, sp - 14) - (markD < 2.2 ? 0.06 : 0), 0.35, 0.985) * (p === f.target ? clamp(0.88 + 0.12 * Math.min(1, hit.c / 0.45), 0.88, 1) : 0.92);   // the man it is meant for stretches for it: a ball far from his feet is less sure to be controlled
        if (rng() < ctrl) {
          const gap = Math.hypot(p.x - ball.x, p.y - ball.y);
          if (!FM.NO_CLAIM && gap > (FM.CLAIM_AT == null ? 0.8 : FM.CLAIM_AT) && p.group !== 'GK') { f.claim = { p, until: f.t + 1.1, gap }; return; }
          complete(p); return;
        }
        if (ev) { ev.outcome = 'loose'; ev.how = 'heavy'; }
        knockLoose(match, p, team, f.dir.x, f.dir.y, Math.max(1.2, sp * (p === f.target ? 0.16 : 0.3)), 1.2); return;   // a heavy touch: it runs away from him (less far when it was meant for him: he was already on it)
      }
      const pi = clamp(((FM.INTERCEPT_BASE == null ? 0.24 : FM.INTERCEPT_BASE) + 0.45 * hit.c) * (0.7 + 0.5 * sk('tackling')) * clamp(1.25 - sp / 30, 0.5, 1), 0.05, 0.95) * (p.group === 'GK' ? 1.4 : 1);
      if (rng() < pi) {
        if (rng() < 0.55 + 0.3 * sk('tackling')) { if (ev) { ev.outcome = 'intercepted'; ev.by = p.number; } giveBall(match, opp, p, 0.4 + delayBeforeNextDecision(match, opp, p) * 0.5); return; }
        if (ev) { ev.outcome = 'loose'; ev.how = 'deflect'; }
        knockLoose(match, p, opp, f.dir.x, f.dir.y, Math.max(2, sp * 0.5), 1.3); return;   // a deflection: it flies off in a new direction
      }
      // he could not get to it: the ball goes on
    }
    if (ball.x < 0.3 || ball.x > L - 0.3 || ball.y < 0.3 || ball.y > W - 0.3) {
      if (f.ev && f.ev.outcome === 'pending') { f.ev.outcome = 'loose'; f.ev.how = 'out'; } match.flight = null; ball.vx = ball.vy = 0;
      handleOut(match, team, ball.x < 0.3 ? Math.min(ball.x, -0.1) : ball.x > L - 0.3 ? Math.max(ball.x, L + 0.1) : ball.x, ball.y < 0.3 ? Math.min(ball.y, -0.1) : ball.y > W - 0.3 ? Math.max(ball.y, W + 0.1) : ball.y); return;
    }
    if (f.speed <= 1.0 && f.run >= f.len) {
      if (f.claim) { complete(f.claim.p); return; }   // it has stopped and he is on his way to it: it is his
      // it has rolled to a stop with nobody on it
      if (f.ev && f.ev.outcome === 'pending') { f.ev.outcome = 'loose'; f.ev.how = 'stopped'; f.ev.minD = f.minD; f.ev.len = f.len; f.ev.tdist = Math.hypot(f.target.x - ball.x, f.target.y - ball.y); }
      match.flight = null; ball.state = 'loose'; ball.vx = f.dir.x * f.speed; ball.vy = f.dir.y * f.speed;
    }
  }

  function doDribble(match, team, carrier, opt) {
    const oppGK = other(match, team).players.find((p) => p.group === 'GK');
    if (oppGK && dist(oppGK, carrier) < 7 && inBox(team.attackDir, carrier.x, carrier.y) && match.rng() < 0.03) {
      commitFoul(match, oppGK, carrier, other(match, team), team, { denial: true });
      return;
    }
    const st = statsOf(match, team);
    st.dribbles++;
    const ok = match.rng() < opt.p;
    if (!ok && opt.nearOpp && opt.nearD < 4 && !opt.behind) {
      record(match, { type: 'dribble', team: team.id, player: carrier.number, p: opt.p, ok: false, defDist: opt.nearD, x: carrier.x, y: carrier.y });
      giveBall(match, other(match, team), opt.nearOpp, 0.6);
      return;
    }
    if (ok) st.dribblesWon++;   // a take-on that goes wrong but costs him nothing (the man was already beaten) is still not a take-on won
    record(match, { type: 'dribble', team: team.id, player: carrier.number, p: opt.p, ok, defDist: opt.nearD, x: carrier.x, y: carrier.y });
    const goalY = W / 2;
    const gx = team.attackDir === 1 ? L : 0;
    // Wide attackers drive diagonally towards goal after beating a player,
    // rather than repeatedly shooting from the touchline. This creates goals
    // for wingers and cut-back runners instead of funnelling every finish to STs.
    const cutInside = carrier.group === 'WF' ? .82 : carrier.group === 'AM' ? .48 : .3;
    const dx = gx - carrier.x, dy = (goalY - carrier.y) * cutInside;
    const len = Math.hypot(dx, dy) || 1;
    match.carry = { player: carrier, until: match.clock + 1.1, dx: dx / len, dy: dy / len };
    match.nextDecision = match.clock + delayBeforeNextDecision(match, team, carrier);
  }

  function doCarry(match, team, carrier) {
    const gx = team.attackDir === 1 ? L : 0;
    const dx = gx - carrier.x, dy = (W / 2 - carrier.y) * (carrier.group === 'WF' ? .55 : .18);
    const len = Math.hypot(dx, dy) || 1;
    match.carry = { player: carrier, until: match.clock + (FM.CARRY_T == null ? 1.3 : FM.CARRY_T), dx: dx / len, dy: dy / len };
    match.nextDecision = match.clock + 1.5 + 1.3 * match.rng();
  }

  function doHold(match, team, carrier) {
    match.carry = null;
    match.nextDecision = match.clock + (1.4 + 2.1 * match.rng()) * (1.5 - team.tactics.tempo);   // tempo: the time a man takes over the ball, from about 3.5 s to 1.3 s
  }

  function doClear(match, team, carrier, opt) {
    const pass = Object.assign({}, opt.pass, { p: clamp(opt.pass.p * .82, .2, .78) });
    record(match, { type: 'clearance', team: team.id, player: carrier.number, x: carrier.x, y: carrier.y, tx: pass.tx, ty: pass.ty });
    if (!match.lastClearance) match.lastClearance = {};
    match.lastClearance[team.id] = match.clock;
    // Under pressure a defender often just gets it away: kicked up the line into touch rather than to a team-mate (this is where most throw-ins come from).
    if (match.rng() < (FM.CLEAR_TOUCH == null ? 0.85 : FM.CLEAR_TOUCH)) { const ty = carrier.y < W / 2 ? 1.2 : W - 1.2, tx = clamp(carrier.x + team.attackDir * 20, 3, L - 3); pass.tx = tx; pass.ty = ty; pass.d = Math.hypot(tx - carrier.x, ty - carrier.y); pass.p = 0.7; }
    if (Math.abs(carrier.x - (team.attackDir === 1 ? 0 : L)) < 14 && match.rng() < (FM.CLEAR_CORNER == null ? 0.35 : FM.CLEAR_CORNER)) { pass.tx = team.attackDir === 1 ? -2 : L + 2; pass.ty = clamp(carrier.y + (carrier.y < W / 2 ? -6 : 6), 2, W - 2); pass.d = Math.hypot(pass.tx - carrier.x, pass.ty - carrier.y); pass.target = { x: pass.tx, y: pass.ty, vx: 0, vy: 0, number: 0, group: 'CB', id: 'out' }; }   // scrambled behind for a corner
    doPass(match, team, carrier, pass);
  }

  function doShot(match, team, carrier, opt) {
    const rng = match.rng;
    const st = statsOf(match, team);
    const opp = other(match, team);
    const gk = opp.players.find((p) => p.group === 'GK');
    const goalX = team.attackDir === 1 ? L : 0;
    const aimY = W / 2 + (rng() - 0.5) * 6.5;
    const shooter = opt.rating != null ? { ratings: { finishing: opt.rating }, group: carrier.group } : carrier;
    st.shots++;

    // Blocked by a defender standing on the shooting line?
    let blocker = null, bd = 99;
    opp.players.forEach((o) => {
      if (o === gk) return;
      const s = segInfo(o.x, o.y, carrier.x, carrier.y, goalX, aimY);
      if (s.t > 0.05 && s.t < 0.95 && s.d < bd) { bd = s.d; blocker = o; }
    });
    const nearD = nearestOpponent(match, team, carrier).d;
    // The true chance of this shot going in: it must get past a defender on the line, then the goalkeeper. This is what is recorded as
    // its xG, so that over many shots expected goals and goals agree (the chance the shooter weighed up beforehand, opt.xg, ignores both).
    const pBlock = blocker ? 0.8 * Math.exp(-bd / 1.5) : 0;
    const xgAdj = sig(FM.xgLogit(shooter, carrier.x, carrier.y, team.attackDir, nearD, FM.edgeFor(match, team)) - 0.55 * crowd(match, team, carrier) - 0.03 * (gk ? SK(gk, 'gk') : 0));
    const pOn = sig(0.15 + 0.03 * SK(shooter, 'finishing') - 0.6 * Math.exp(-nearD / 2));
    // Record the probability the actual outcome routine uses. Previously xG
    // could exceed the chance of even hitting the target, so match xG and
    // long-run goals described two different models.
    // The geometric model describes the chance before the keeper, imperfect
    // contact and the small target inside the goal are considered.
    const scoringChance = xgAdj * (FM.GOAL_K == null ? 1.9 : FM.GOAL_K);
    const conditionalGoal = clamp(scoringChance / pOn, 0.02, 0.97);
    const shotXg = (1 - pBlock) * pOn * conditionalGoal;
    st.xg += shotXg;
    let outcome;
    if (blocker && rng() < pBlock) outcome = 'blocked';
    else {
      if (rng() > pOn) outcome = 'off';
      else {
        st.onTarget++;
        outcome = rng() < conditionalGoal ? 'goal' : 'saved';
      }
    }
    let ex = goalX, ey = aimY;
    if (outcome === 'off') { ex = goalX; ey = W / 2 + (rng() < 0.5 ? -1 : 1) * (4.5 + rng() * 4); }
    if (outcome === 'blocked') { const s = segInfo(blocker.x, blocker.y, carrier.x, carrier.y, goalX, aimY); ex = s.cx; ey = s.cy; }
    if (outcome === 'saved') { ex = goalX + (team.attackDir === 1 ? -0.5 : 0.5); ey = gk.y; }
    if (match.rec) noteShotForClips(match, team, carrier, shotXg);
    if (match.rec && outcome !== 'goal' && shotXg >= 0.1) clipChance(match, team, carrier, shotXg);
    // what led to it, for the analysis: the pass he received it from, how long the move had gone on, how crowded he was and where the keeper stood
    let lead = null;
    for (let i = match.events.length - 1; i >= 0 && match.clock - match.events[i].t < 6; i--) {
      const q = match.events[i];
      if (q.type === 'pass' && q.team === team.id && q.ok && q.to === carrier.number) { lead = q; break; }
    }
    const cur = match.xr && match.xr.cur;
    record(match, { type: 'shot', team: team.id, player: carrier.number, xg: shotXg, outcome, defDist: nearD, x: carrier.x, y: carrier.y, setPiece: opt.header ? 'header' : undefined,
      from: lead ? lead.from : 0, leadDist: lead ? lead.dist : 0, leadAir: lead && lead.aerial ? 1 : 0, movePasses: cur && cur.team === team.id ? cur.passes : 0, moveSecs: cur && cur.team === team.id ? match.clock - cur.t : 0,
      gkDist: gk ? Math.hypot(gk.x - carrier.x, gk.y - carrier.y) : 0, crowd: crowd(match, team, carrier) });
    match.carrier = null; match.carry = null;
    match.flight = { kind: 'shot', team, shooter: carrier, speed: 28, target: null, ex, ey: clamp(ey, 0.5, W - 0.5), outcome, gk, blocker };
    match.ball.state = 'flight';
  }

  // ---------- offsides ----------
  // 'off' if the receiver (at the point the pass is aimed) is beyond the second-last defender, the ball and the halfway line.
  // 'marginal' if he is within the trap's reach: a high offside-trap instruction catches some who were just onside.
  function offsideStatus(match, team, passer, tx) {
    const opp = other(match, team), dir = team.attackDir;
    const line = deepestOutfield(opp, dir);   // the line is the deepest outfield player, whoever that is
    const recv = tx * dir, ball = passer.x * dir, mid = dir * L / 2;
    if (recv <= ball || recv <= mid) return 'on';
    if (recv > line) return 'off';
    if (recv > line - 1.25) return 'marginal';
    return 'on';
  }

  // How deep the deepest outfield player of a team stands, measured along the attacking direction of the side playing against them (the keeper does not count).
  function deepestOutfield(opp, dir) {
    const xs = opp.players.filter((o) => o.group !== 'GK').map((o) => o.x * dir);
    return xs.length ? Math.max.apply(null, xs) : L * dir;
  }
  // The line each team's attackers must not pass (the deepest opposing outfield player), kept just onside.
  function setOffsideLines(match) {
    match.teams.forEach((team) => {
      const opp = other(match, team), dir = team.attackDir;
      const line = deepestOutfield(opp, dir);
      team.offsideLine = Math.max(line - 1.5, dir * L / 2) * dir;
    });
  }


  // ---------- drama ----------
  // A rivalry makes a match hotter: more cards, and moments that are not part of the football. They are planned before kick-off from the
  // fixture's seed (so a match always plays the same), spread through the game, and carried out when play is live.
  //   scuffle: a late challenge and a squaring-up between players of both sides, ending in cards, perhaps in a red or two
  //   penalty: a contentious penalty is given, and the defenders protest (one of them is booked)
  //   invader: a supporter gets onto the pitch and play is held up
  FM.setupDrama = function (match, derby, seed) {
    if (match.friendly) { match.drama = null; return; }
    const rng = FM.mulberry32(((seed >>> 0) ^ 0x9E3779B1) >>> 0), heat = derby ? derby.heat : 0;
    const list = [];
    const plan = (kind, p, lo, hi) => { if (rng() < p) list.push({ kind, at: (lo + rng() * (hi - lo)) * 60 }); };
    // an ordinary game: now and then; a derby: several times as often; the Iron Derby: nearly always, and often more than one
    const at = (base, top) => base + (top - base) * Math.pow(heat, 1.5);
    plan('scuffle', at(0.07, 0.92), 12, 84);
    plan('penalty', at(0.04, 0.5), 15, 88);
    plan('invader', at(0.03, 0.38), 10, 80);
    if (heat >= 1 && !list.length) list.push({ kind: 'scuffle', at: (25 + rng() * 50) * 60 });
    list.sort((a, b) => a.at - b.at);
    match.derby = derby || null;
    match.drama = { list, rng };
    match.stands = {};
  };
  function bookPlayer(match, team, p) {
    const st = statsOf(match, team);
    p.yellows = (p.yellows || 0) + 1; st.yellows++;
    if (p.yellows >= 2) { st.reds++; sendOff(match, team, p); return 'second yellow'; }
    return 'yellow';
  }
  function redPlayer(match, team, p) { statsOf(match, team).reds++; sendOff(match, team, p); return 'red'; }
  function runDrama(match) {
    const d = match.drama;
    if (!d || !d.list.length || match.phase !== 'play' || match.flight || match.restart) return;
    const next = d.list[0];
    if (match.clock < next.at || !match.carrier) return;
    const c = match.carrier, attT = c.team, defT = other(match, attT), rng = d.rng;
    const nearTo = (team, pt, skip) => team.players.filter((p) => p.group !== 'GK' && p !== skip).sort((a, b) => Math.hypot(a.x - pt.x, a.y - pt.y) - Math.hypot(b.x - pt.x, b.y - pt.y));
    if (next.kind === 'penalty') {
      // wait for a moment when the attack is in the final third; give up if one does not come
      const deep = FM.toTeamSpace(attT.attackDir, c.player.x, c.player.y).d;
      if (deep < 0.74) { if (match.clock > next.at + 600) d.list.shift(); return; }
      d.list.shift();
      const prot = nearTo(defT, c.player)[0];
      record(match, { type: 'drama', kind: 'penalty', team: attT.id, player: c.player.number, vs: prot ? prot.number : null, vsTeam: defT.id, x: c.player.x, y: c.player.y });
      if (prot) { const card = bookPlayer(match, defT, prot); record(match, { type: 'foul', team: defT.id, player: prot.number, vs: c.player.number, card, x: prot.x, y: prot.y, drama: true }); }
      startRestart(match, 'penalty', attT, attT.attackDir === 1 ? L - 11 : 11, W / 2);
      return;
    }
    d.list.shift();
    if (next.kind === 'scuffle') {
      const victim = c.player, aggressor = nearTo(defT, victim)[0];
      if (!aggressor) return;
      const r = rng(), cards = [];
      const give = (team, p, how) => { const card = how === 'red' ? redPlayer(match, team, p) : bookPlayer(match, team, p); cards.push({ team: team.id, player: p.number, card }); record(match, { type: 'foul', team: team.id, player: p.number, vs: p === aggressor ? victim.number : aggressor.number, card, x: victim.x, y: victim.y, drama: true }); };
      let outcome;
      if (r < 0.4) { outcome = 'booked'; give(defT, aggressor, 'yellow'); give(attT, victim, 'yellow'); }
      else if (r < 0.8) { outcome = 'aggressor'; give(defT, aggressor, 'red'); give(attT, victim, 'yellow'); }
      else { outcome = 'both'; give(defT, aggressor, 'red'); give(attT, victim, 'red'); }
      record(match, { type: 'drama', kind: 'scuffle', team: defT.id, player: aggressor.number, vs: victim.number, vsTeam: attT.id, outcome, cards, x: victim.x, y: victim.y });
      startRestart(match, 'freekick', attT, clamp(victim.x, 0.5, L - 0.5), clamp(victim.y, 0.5, W - 0.5));
      return;
    }
    if (next.kind === 'invader') {
      record(match, { type: 'drama', kind: 'invader', team: attT.id });
      startRestart(match, 'freekick', attT, clamp(c.player.x, 0.5, L - 0.5), clamp(c.player.y, 0.5, W - 0.5));
    }
  }

  // ---------- fouls and cards ----------
  function inBox(attackDir, x, y) {
    const gx = attackDir === 1 ? L : 0;
    return Math.abs(x - gx) < 16.5 && Math.abs(y - W / 2) < 20.16;
  }
  function sendOff(match, team, p) {
    team.players = team.players.filter((x) => x !== p);
    team.sentOff = (team.sentOff || []).concat(p);
    p.sentOff = true;
    if (p.group === 'GK') replaceKeeper(match, team, p);
  }

  FM.sendOffPlayer = function (match, team, p) { sendOff(match, team, p); };

  // A sent-off goalkeeper must be replaced. With a spare keeper on the bench and a substitution left, the weakest
  // forward is taken off and the keeper comes on; otherwise an outfield player goes in goal with poor goalkeeping.
  function replaceKeeper(match, team, gk) {
    const formation = FM.FORMATIONS[team.formationKey];
    const slotIdx = gk.index;
    const benchGK = team.bench.find((p) => p.natural === 'GK' && !FM.isInjured(p));
    const goalX = team.attackDir === 1 ? 3 : L - 3;
    if (benchGK && team.subsUsed < team.maxSubs) {
      const rank = { ST: 0, WF: 1, AM: 2, CM: 3, DM: 4, FB: 5, CB: 6 };
      const ovr = (p) => p.ratings.pace + p.ratings.dribbling + p.ratings.passing + p.ratings.finishing + p.ratings.tackling;
      const off = team.players.filter((p) => p.group !== 'GK').sort((a, b) => (rank[a.group] - rank[b.group]) || (ovr(a) - ovr(b)))[0];
      team.players[team.players.indexOf(off)] = benchGK;
      team.bench.splice(team.bench.indexOf(benchGK), 1);
      team.bench.push(off);
      FM.putInSlot(benchGK, formation, slotIdx);
      benchGK.x = goalX; benchGK.y = W / 2; benchGK.vx = 0; benchGK.vy = 0;
      off.index = -1; off.slotKey = null; off.group = off.natural;
      team.subsUsed++;
      record(match, { type: 'keeperSwap', team: team.id, on: benchGK.number, off: off.number, emergency: false });
    } else {
      const ok = team.players.filter((p) => p.group !== 'GK');
      const pick = ok.sort((a, b) => (b.ratings.composure + b.ratings.passing) - (a.ratings.composure + a.ratings.passing))[0];
      if (!pick) return;
      FM.putInSlot(pick, formation, slotIdx);
      pick.origGk = pick.ratings.gk;
      pick.ratings = Object.assign({}, pick.ratings, { gk: Math.max(pick.ratings.gk, 38) });
      pick.emergencyKeeper = true;
      pick.x = goalX; pick.y = W / 2; pick.vx = 0; pick.vy = 0;
      record(match, { type: 'keeperSwap', team: team.id, on: pick.number, off: null, emergency: true });
    }
  }
  function commitFoul(match, fouler, victim, foulTeam, team, opts) {
    const st = statsOf(match, foulTeam);
    st.fouls++;
    const aggr = foulTeam.tactics.tackleAggression;
    const dangerous = FM.toTeamSpace(team.attackDir, victim.x, victim.y).d > 0.6;
    const r = match.rng();
    const denial = opts && opts.denial;
    const heat = match.derby ? match.derby.heat : 0;   // a rivalry: more cards
    const pRed = (0.002 + 0.006 * aggr + (dangerous ? 0.006 : 0) + (denial ? 0.3 : 0)) * (1 + heat);
    const pYellow = (0.04 + 0.18 * aggr + (dangerous ? 0.08 : 0) + (denial ? 0.4 : 0)) * (1 + 0.5 * heat) * (fouler.yellows ? 0.6 : 1);
    let card = null;
    if (r < pRed) card = 'red';
    else if (r < pRed + pYellow) {
      card = 'yellow';
      fouler.yellows = (fouler.yellows || 0) + 1;
      st.yellows++;
      if (fouler.yellows >= 2) card = 'second yellow';
    }
    if (card === 'red' || card === 'second yellow') { st.reds++; sendOff(match, foulTeam, fouler); }
    record(match, { type: 'foul', team: foulTeam.id, player: fouler.number, vs: victim.number, card, x: victim.x, y: victim.y });
    if (inBox(team.attackDir, victim.x, victim.y)) startRestart(match, 'penalty', team, team.attackDir === 1 ? L - 11 : 11, W / 2);
    else startRestart(match, 'freekick', team, clamp(victim.x, 0.5, L - 0.5), clamp(victim.y, 0.5, W - 0.5));
  }

  // ---------- out of play ----------
  function handleOut(match, lastTouchTeam, x, y) {
    const lastTouchOpp = other(match, lastTouchTeam);
    if (y < 0 || y > W) {
      startRestart(match, 'throw', lastTouchOpp, clamp(x, 1, L - 1), y < 0 ? 0.5 : W - 0.5);
      return;
    }
    const defTeam = match.teams.find((t) => t.attackDir === (x < 0 ? 1 : -1));
    if (lastTouchTeam === defTeam) {
      const attackers = other(match, defTeam);
      startRestart(match, 'corner', attackers, x < 0 ? 0.5 : L - 0.5, y < W / 2 ? 0.5 : W - 0.5);
    } else {
      startRestart(match, 'goalkick', defTeam, defTeam.attackDir === 1 ? 5.5 : L - 5.5, W / 2);
    }
  }

  // ---------- restarts ----------
  const RESTART_SECONDS = { throw: 3, goalkick: 4, corner: 6, freekick: 5, penalty: 7 };
  const outfield = (team) => team.players.filter((p) => p.group !== 'GK');
  const byId = (team, id) => team.players.find((p) => p.id === id);

  function pickTaker(match, kind, team, x, y) {
    const t = team.tactics;
    const best = (list, f) => list.reduce((a, b) => (f(b) > f(a) ? b : a), list[0]);
    const nearest = (list) => list.reduce((a, b) => (Math.hypot(b.x - x, b.y - y) < Math.hypot(a.x - x, a.y - y) ? b : a));
    if (kind === 'goalkick') return team.players.find((p) => p.group === 'GK') || best(team.players, (p) => p.ratings.passing);
    if (kind === 'throw') return nearest(outfield(team));
    if (kind === 'penalty') return (t.penTaker && byId(team, t.penTaker)) || best(outfield(team), (p) => p.ratings.finishing + 0.5 * p.ratings.composure);
    if (kind === 'corner') return (t.cornerTaker && byId(team, t.cornerTaker)) || best(outfield(team), (p) => p.ratings.passing + (['WF', 'AM', 'FB', 'CM'].includes(p.group) ? 10 : 0));
    // Free kick: a named taker near goal, otherwise the best dead-ball player; far from goal, whoever is closest.
    const goalX = team.attackDir === 1 ? L : 0;
    if (Math.hypot(goalX - x, W / 2 - y) > 45) return nearest(outfield(team));
    return (t.fkTaker && byId(team, t.fkTaker)) || best(outfield(team), (p) => p.ratings.passing + p.ratings.finishing);
  }

  function startRestart(match, kind, team, x, y, extra) {
    match.carrier = null; match.flight = null; match.carry = null;
    const taker = pickTaker(match, kind, team, x, y);
    const r = { kind, team, x, y, taker, timer: RESTART_SECONDS[kind], extra: extra || {} };
    match.restart = r;
    match.lastTeam = team;
    match.ball.x = x; match.ball.y = y; match.ball.state = 'dead';
    const st = statsOf(match, team);
    if (kind === 'corner') st.corners++;
    if (kind === 'freekick') st.freeKicks++;
    if (kind === 'throw') st.throwIns++;
    if (kind === 'penalty') st.penalties++;
    const goalX = team.attackDir === 1 ? L : 0;
    const style = team.tactics.fkStyle;
    const crossing = kind === 'corner' || (kind === 'freekick' && FM.toTeamSpace(team.attackDir, x, y).d > 0.55 && style !== 'short' &&
      !(style === 'shoot' && Math.hypot(goalX - x, W / 2 - y) <= (FM.FK_RANGE == null ? 23 : FM.FK_RANGE) && !r.extra.indirect));
    if (crossing) planBox(match, r);
    record(match, { type: 'restart', kind, team: team.id, x, y });
    if (match.rec && (kind === 'corner' || (kind === 'freekick' && FM.toTeamSpace(team.attackDir, x, y).d > 0.55))) match.rec.sp = { team: team.id, kind, t: match.clock };
  }

  // Box points for attackers and the defenders marking them, for corners and crossed free kicks.
  function boxPoints(team, nearSign) {
    const gx = team.attackDir === 1 ? L : 0, inward = team.attackDir === 1 ? -1 : 1;
    const pt = (d, off) => ({ x: gx + inward * d, y: W / 2 + off });
    return [pt(11, 0), pt(7, -nearSign * 5), pt(6.5, nearSign * 4), pt(15, nearSign * 9), pt(15, -nearSign * 9), pt(17.5, 0), pt(11, nearSign * 7), pt(11, -nearSign * 7)];
  }
  function planBox(match, r) {
    const team = r.team, opp = other(match, team), t = team.tactics;
    const nearSign = r.y < W / 2 ? -1 : 1;
    const points = boxPoints(team, nearSign);
    const nAtt = clamp(Math.round(t.cornerAttackers), 1, 7);
    const pool = outfield(team).filter((p) => p !== r.taker && FM.instrMods(p).cornerAtt >= 0).sort((a, b) => (b.ratings.heading + 15 * FM.instrMods(b).cornerAtt) - (a.ratings.heading + 15 * FM.instrMods(a).cornerAtt));
    const attackers = pool.slice(0, nAtt);
    const short = t.cornerDelivery === 'short' && r.kind === 'corner'
      ? outfield(team).filter((p) => p !== r.taker && !attackers.includes(p)).sort((a, b) => Math.hypot(a.x - r.x, a.y - r.y) - Math.hypot(b.x - r.x, b.y - r.y))[0] : null;
    const goalX = team.attackDir === 1 ? L : 0;
    const defenders = outfield(opp).filter((p) => FM.instrMods(p).cornerDef >= 0).sort((a, b) => (Math.abs(a.x - goalX) - 25 * FM.instrMods(a).cornerDef) - (Math.abs(b.x - goalX) - 25 * FM.instrMods(b).cornerDef)).slice(0, clamp(Math.round(opp.tactics.cornerMarkers), 3, 9));
    const marks = new Map(), targets = new Map();
    attackers.forEach((a, i) => targets.set(a, points[i % points.length]));
    const free = defenders.slice();
    attackers.forEach((a) => {
      if (!free.length) return;
      const pt = targets.get(a);
      let bi = 0;
      free.forEach((d, k) => { if (Math.hypot(d.x - pt.x, d.y - pt.y) < Math.hypot(free[bi].x - pt.x, free[bi].y - pt.y)) bi = k; });
      marks.set(free.splice(bi, 1)[0], { mark: a });
    });
    // Defenders left over hold zones in the box.
    const spare = points.slice().reverse();
    free.forEach((d, k) => marks.set(d, { zone: spare[k % spare.length] }));
    r.extra.attackers = attackers; r.extra.targets = targets; r.extra.marks = marks; r.extra.short = short; r.extra.nearSign = nearSign;
  }

  function restartOverrides(match, held) {
    const r = held || match.restart, ov = new Map();
    const team = r.team, opp = other(match, team);
    ov.set(r.taker, { x: r.x, y: r.y });
    const goalX = team.attackDir === 1 ? L : 0;
    if (r.extra.attackers) {
      r.extra.attackers.forEach((a) => ov.set(a, r.extra.targets.get(a)));
      r.extra.marks.forEach((m, d) => {
        if (m.zone) ov.set(d, m.zone);
        else { const pt = r.extra.targets.get(m.mark); ov.set(d, { x: pt.x + (goalX - pt.x) * 0.06, y: pt.y + (W / 2 - pt.y) * 0.1 }); }
      });
      const gk = opp.players.find((p) => p.group === 'GK');
      if (gk) ov.set(gk, { x: goalX + (team.attackDir === 1 ? -2 : 2), y: W / 2 + r.extra.nearSign * 1.5 });
      if (r.extra.short) ov.set(r.extra.short, { x: r.x + (r.x < L / 2 ? 6 : -6), y: r.y + (r.y < W / 2 ? 6 : -6) });
    }
    if (r.kind === 'freekick' && !r.extra.attackers) {
      // A wall of defenders stands 9.15 m from the ball on the line to goal when a shot is possible.
      const dg = Math.hypot(goalX - r.x, W / 2 - r.y);
      if (dg <= 32) {
        const ux = (goalX - r.x) / dg, uy = (W / 2 - r.y) / dg;
        const wall = outfield(opp).sort((a, b) => Math.hypot(a.x - r.x, a.y - r.y) - Math.hypot(b.x - r.x, b.y - r.y)).slice(0, dg < 22 ? 4 : 3);
        wall.forEach((p, k) => { const o = (k - (wall.length - 1) / 2) * 0.9; ov.set(p, { x: r.x + ux * 9.15 - uy * o, y: r.y + uy * 9.15 + ux * o }); });
      }
    }
    if (r.kind === 'goalkick') {
      const own = goalX === L ? 0 : L, inward = own === 0 ? 1 : -1;
      outfield(opp).forEach((p) => {
        const t = FM.targetFor(opp, p, match.ball, false);
        const depth = (t.x - own) * inward;
        if (depth < 20 && Math.abs(t.y - W / 2) < 23) ov.set(p, { x: own + inward * 20, y: t.y });
        else ov.set(p, t);
      });
    }
    if (r.kind === 'penalty') {
      const inward = team.attackDir === 1 ? -1 : 1;
      let k = 0;
      match.teams.forEach((t) => t.players.forEach((p) => {
        if (p === r.taker || p.group === 'GK') return;
        ov.set(p, { x: goalX + inward * (20 + (k % 3) * 2), y: 10 + (k * 2.7) % 48 }); k++;
      }));
      const gk = opp.players.find((p) => p.group === 'GK');
      if (gk) ov.set(gk, { x: goalX, y: W / 2 });
    }
    return ov;
  }

  function runRestart(match, dt) {
    if (match.restart.kind === 'penalty') { runPenalty(match, dt); return; }
    const r = match.restart;
    match.teams.forEach((t) => { t.offsideLine = null; t.phaseCtx = {}; });
    const ov = restartOverrides(match);
    match.teams.forEach((t) => FM.stepTeam(t, match.ball, t === r.team, dt, ov));
    fitnessTick(match, dt);
    r.timer -= dt;
    if (r.timer <= 0 && (Math.hypot(r.taker.x - r.x, r.taker.y - r.y) < 1.6 || r.timer < -4)) execRestart(match);
  }

  function execRestart(match) {
    const r = match.restart, team = r.team, taker = r.taker, t = team.tactics;
    match.restart = null;
    taker.x = r.x; taker.y = r.y; taker.vx = 0; taker.vy = 0;
    if (r.kind === 'throw' || r.kind === 'goalkick') { match.forcePass = true; match.noOffside = true; giveBall(match, team, taker, 0.4); return; }
    if (r.kind === 'penalty') { takePenalty(match, team, taker); return; }
    const goalX = team.attackDir === 1 ? L : 0;
    if (r.kind === 'freekick') {
      const dg = Math.hypot(goalX - r.x, W / 2 - r.y);
      const attackingHalf = FM.toTeamSpace(team.attackDir, r.x, r.y).d > 0.55;
      if (t.fkStyle === 'shoot' && dg <= (FM.FK_RANGE == null ? 23 : FM.FK_RANGE) && !r.extra.indirect) { takeFreeKickShot(match, team, taker, dg); return; }
      if (t.fkStyle !== 'short' && attackingHalf && r.extra.attackers) { match.crossHold = r; const zones = ['near', 'far', 'centre']; deliverCross(match, team, taker, r, zones[Math.floor(match.rng() * 3)]); return; }
      match.forcePass = true; giveBall(match, team, taker, 0.4); return;
    }
    // corner
    if (t.cornerDelivery === 'short' && r.extra.short) { match.forcePass = true; match.noOffside = true; giveBall(match, team, taker, 0.2); return; }
    match.crossHold = r;   // while the ball is in the air the box stays as it was set: nobody wanders out as the kick is taken
    deliverCross(match, team, taker, r, t.cornerDelivery === 'short' ? 'near' : t.cornerDelivery);
  }

  function deliverCross(match, team, taker, r, zone) {
    const rng = match.rng;
    const gx = team.attackDir === 1 ? L : 0, inward = team.attackDir === 1 ? -1 : 1;
    const ns = r.extra.nearSign != null ? r.extra.nearSign : (r.y < W / 2 ? -1 : 1);
    const spot = zone === 'near' ? { d: 6, off: ns * 3.5 } : zone === 'far' ? { d: 7, off: -ns * 5 } : zone === 'edge' ? { d: 17, off: 0 } : { d: 11, off: 0 };
    const quality = sig(0.07 * (taker.ratings.passing - 60));
    const noise = 1.0 + (1 - quality) * 7;
    const ex = gx + inward * spot.d + (rng() - 0.5) * 2 * noise;
    const ey = W / 2 + spot.off + (rng() - 0.5) * 2 * noise;
    record(match, { type: 'cross', team: team.id, player: taker.number, zone, kind: r.kind, quality });
    match.flight = { kind: 'cross', team, passer: taker, speed: 20, target: null, ex: clamp(ex, 0.3, L - 0.3), ey: clamp(ey, 0.3, W - 0.3), quality, zone };
    match.ball.state = 'flight';
  }

  // The ball arrives from a cross: players near the landing point contest it in the air.
  function crossArrive(match, f) {
    match.flight = null;
    const team = f.team, opp = other(match, team), rng = match.rng;
    if (rng() < (FM.CROSS_OUT == null ? 0.18 : FM.CROSS_OUT)) { match.ball.vx = match.ball.vy = 0; handleOut(match, team, team.attackDir === 1 ? L + 0.2 : -0.2, clamp(f.ey, 1, W - 1)); return; }   // overhit: behind for a goal kick
    const cands = [];
    const at = (p) => Math.hypot(p.x - f.ex, p.y - f.ey);
    team.players.forEach((p) => { if (p.group === 'GK') return; const d = at(p); if (d <= 4.5) cands.push({ p, team, w: Math.exp((p.ratings.heading + 14 * f.quality - 4 * d) / 14) }); });
    opp.players.forEach((p) => {
      const d = at(p);
      if (p.group === 'GK') { if (d <= 7) cands.push({ p, team: opp, w: 0.9 * Math.exp((p.ratings.gk + 6 - 3 * d) / 14) }); }
      else if (d <= 4.5) cands.push({ p, team: opp, w: 1.1 * Math.exp((p.ratings.heading + 4 - 4 * d) / 14) });
    });
    if (!cands.length) { match.ball.state = 'loose'; match.lastTeam = team; return; }
    const total = cands.reduce((a, c) => a + c.w, 0);
    let r = rng() * total, win = cands[cands.length - 1];
    for (const c of cands) { r -= c.w; if (r <= 0) { win = c; break; } }
    const p = win.p;
    if (win.team === team) {
      p.x = f.ex; p.y = f.ey;
      const nearD = nearestOpponent(match, team, p).d;
      const xg = sig(FM.xgLogit({ ratings: { finishing: p.ratings.heading - 10 } }, p.x, p.y, team.attackDir, nearD) - 0.55 * crowd(match, team, p));
      if (xg < 0.04 && rng() < 0.5) { giveBall(match, team, p, 0.8); return; }
      doShot(match, team, p, { xg, rating: p.ratings.heading - 10, header: true });
    } else if (p.group === 'GK') {
      giveBall(match, opp, p, 1.6);
    } else if (rng() < 0.35) {
      giveBall(match, opp, p, 0.8);
    } else {
      // Cleared out of the box, possibly out of play.
      const ex = f.ex + opp.attackDir * (14 + rng() * 16), ey = f.ey + (rng() - 0.5) * 34;
      record(match, { type: 'clearance', team: opp.id, player: p.number });
      match.flight = { kind: 'pass', team: opp, passer: p, speed: 22, target: null, ex: clamp(ex, -3, L + 3), ey: clamp(ey, -3, W + 3), outcome: 'loose' };
      match.ball.state = 'flight';
    }
  }

  function takeFreeKickShot(match, team, taker, dg) {
    const rng = match.rng, opp = other(match, team), st = statsOf(match, team);
    const gk = opp.players.find((p) => p.group === 'GK');
    const goalX = team.attackDir === 1 ? L : 0;
    const p = sig(-2.4 + 0.03 * SK(taker, 'finishing') + 0.02 * SK(taker, 'passing') - 0.12 * (dg - 20) - 0.02 * (gk ? SK(gk, 'gk') : 0));
    st.shots++; st.xg += p;
    let outcome;
    if (rng() < p) { outcome = 'goal'; st.onTarget++; }
    else {
      const q = rng();
      if (q < 0.3) { outcome = 'saved'; st.onTarget++; } else if (q < 0.55) outcome = 'blocked'; else outcome = 'off';
    }
    let ey = W / 2 + (rng() - 0.5) * 6.5;
    if (outcome === 'off') ey = W / 2 + (rng() < 0.5 ? -1 : 1) * (4.5 + rng() * 5);
    if (match.rec) noteShotForClips(match, team, taker, p);
    record(match, { type: 'shot', team: team.id, player: taker.number, xg: p, outcome, defDist: 9.15, x: taker.x, y: taker.y, setPiece: 'freekick' });
    match.flight = { kind: 'shot', team, shooter: taker, speed: 26, target: null, ex: outcome === 'blocked' ? taker.x + (goalX - taker.x) * 0.5 : goalX, ey: clamp(ey, 0.5, W - 0.5), outcome, gk, blocker: null };
    match.ball.state = 'flight';
  }

  function takePenalty(match, team, taker) {
    const rng = match.rng, opp = other(match, team), st = statsOf(match, team);
    const gk = opp.players.find((p) => p.group === 'GK');
    const goalX = team.attackDir === 1 ? L : 0;
    const p = sig(1.25 + 0.03 * SK(taker, 'finishing') + 0.015 * SK(taker, 'composure') - 0.03 * (gk ? SK(gk, 'gk') : 0));
    st.shots++; st.xg += 0.78;
    let outcome;
    if (rng() < p) { outcome = 'goal'; st.onTarget++; }
    else if (rng() < 0.55) { outcome = 'saved'; st.onTarget++; } else outcome = 'off';
    const ey = outcome === 'off' ? W / 2 + (rng() < 0.5 ? -1 : 1) * 4.5 : W / 2 + (rng() - 0.5) * 6;
    record(match, { type: 'shot', team: team.id, player: taker.number, xg: 0.78, outcome, defDist: 11, x: taker.x, y: taker.y, setPiece: 'penalty' });
    match.flight = { kind: 'shot', team, shooter: taker, speed: 28, target: null, ex: outcome === 'off' ? goalX + team.attackDir * 2.5 : goalX, ey, outcome, gk, blocker: null, penalty: true };
    match.ball.state = 'flight';
  }

  // A penalty is taken properly: the taker walks back from the ball, waits, runs up and strikes it. The ball is on the spot for all of it, and the kick is cued
  // (match.kickCue) so the picture can time the swing of the leg to the moment the ball goes.
  const PEN_RUN = 1.3;
  function runPenalty(match, dt) {
    const r = match.restart, team = r.team, taker = r.taker, inward = team.attackDir === 1 ? -1 : 1;
    match.teams.forEach((t) => { t.offsideLine = null; t.phaseCtx = {}; });
    const ov = restartOverrides(match), start = { x: r.x + inward * 5.5, y: r.y + 1.4 };
    if (!r.run) ov.set(taker, start);
    match.teams.forEach((t) => FM.stepTeam(t, match.ball, t === r.team, dt, ov));
    fitnessTick(match, dt);
    r.timer -= dt;
    if (!r.run && r.timer <= PEN_RUN && Math.hypot(taker.x - start.x, taker.y - start.y) < 1.2) {
      r.run = { t: 0, from: { x: taker.x, y: taker.y } };
      match.kickCue = { player: taker, team, release: match.clock + PEN_RUN, penalty: true };
    }
    // a run-up that starts slowly and gathers pace: the ball is struck as he arrives at the spot
    if (r.run) {
      r.run.t += dt; const u = Math.min(1, r.run.t / PEN_RUN), s = Math.pow(u, 1.5), px = taker.x, py = taker.y;
      taker.x = r.run.from.x + (r.x - r.run.from.x) * s; taker.y = r.run.from.y + (r.y - r.run.from.y) * s;
      taker.vx = (taker.x - px) / Math.max(dt, 1e-3); taker.vy = (taker.y - py) / Math.max(dt, 1e-3); taker.facing = Math.atan2(W / 2 - taker.y, (team.attackDir === 1 ? L : 0) - taker.x);
      if (u >= 1) { match.kickCue = null; execRestart(match); }
    } else if (r.timer < -6) { match.kickCue = null; execRestart(match); }
  }

  // After a goal: the scorer sprints to the corner flag and slides on his knees, the rest of his side run to join him and the other side walk back; only then the
  // kick-off. The movement is scripted (the picture plays the sprint-to-backslide clip when the stage turns to 'slide') so the slide ends exactly at the flag.
  const CELEB = { run: 6.8, slide: 2.07, hold: 2.4 };
  // how far the sprint-to-backslide clip carries him, every tenth of a second (metres on the pitch): in the clip he is already diving as it starts, slides on his back,
  // gets up and walks on, so the clip starts at a sprint and ends about nine metres on
  const SLIDE_TRAVEL = [0, 0.53, 1.05, 1.7, 2.4, 2.93, 3.45, 3.92, 4.32, 4.68, 5.05, 5.41, 5.83, 6.36, 6.81, 7.22, 7.56, 7.92, 8.28, 8.7, 9.13, 9.26];
  const slideAt = (t) => { const k = Math.max(0, Math.min(t, CELEB.slide)) * 10, i = Math.min(SLIDE_TRAVEL.length - 2, Math.floor(k)); return SLIDE_TRAVEL[i] + (SLIDE_TRAVEL[i + 1] - SLIDE_TRAVEL[i]) * Math.min(1, k - i); };
  function beginCelebration(match, team, shooter, opp, goalSpec) {
    const goalX = team.attackDir === 1 ? L : 0, fy = shooter.y < W / 2 ? 0 : W, inw = -team.attackDir;
    const end = { x: goalX + inw * 1.5, y: fy === 0 ? 1.6 : W - 1.6 };
    const dx = end.x - shooter.x, dy = end.y - shooter.y, dist = Math.hypot(dx, dy) || 1, ux = dx / dist, uy = dy / dist;
    // the slide follows the clip's own travel; close to the flag it is scaled down
    const slideLen = Math.min(SLIDE_TRAVEL[SLIDE_TRAVEL.length - 1], dist * 0.75), v0 = 0;
    const S = { x: end.x - ux * slideLen, y: end.y - uy * slideLen };
    // where everybody goes for the kick-off, found by borrowing the kick-off set-up and putting everybody back
    const keep = match.teams.map((t) => t.players.map((p) => [p, p.x, p.y, p.vx, p.vy, p.facing]));
    match.teams.forEach((t) => FM.resetToKickoff(t));
    const ko = new Map(); match.teams.forEach((t) => t.players.forEach((p) => ko.set(p, { x: p.x, y: p.y })));
    keep.forEach((l) => l.forEach((k) => { k[0].x = k[1]; k[0].y = k[2]; k[0].vx = k[3]; k[0].vy = k[4]; k[0].facing = k[5]; }));
    const join = new Map(); let i = 0;
    team.players.forEach((p) => { if (p === shooter || p.group === 'GK') return; const ring = i++; join.set(p, { x: end.x - ux * (4.5 + (ring % 4) * 1.6) + (ring % 2 ? 1 : -1) * uy * (1.2 + (ring % 3) * 1.1), y: end.y - uy * (4.5 + (ring % 4) * 1.6) - (ring % 2 ? 1 : -1) * ux * (1.2 + (ring % 3) * 1.1) }); });
    match.celeb = { team, opp, shooter, goalSpec, stage: 'run', t: 0, from: { x: shooter.x, y: shooter.y }, S, end, ux, uy, slideLen, v0, runDist: dist - slideLen, ran: 0, st: 0, ht: 0, ko, join, goalClock: match.clock };
    match.phase = 'celebration'; match.flight = null; match.carrier = null; match.carry = null; match.restart = null; match.pendingAct = null; match.hold = null; match.kickCue = null; match.ball.state = 'dead';
  }
  function moveTo(p, tx, ty, speed, dt) {
    const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy), step = Math.min(d, speed * dt);
    if (d > 0.05) { p.x += dx / d * step; p.y += dy / d * step; p.vx = dx / d * (step / Math.max(dt, 1e-3)); p.vy = dy / d * (step / Math.max(dt, 1e-3)); p.facing = Math.atan2(dy, dx); } else { p.vx = 0; p.vy = 0; }
  }
  function stepCelebration(match, dt) {
    const c = match.celeb, sc = c.shooter; c.t += dt;
    if (c.stage === 'run') {
      c.ran = Math.min(c.runDist, c.ran + CELEB.run * dt); const px = sc.x, py = sc.y;
      sc.x = c.from.x + (c.S.x - c.from.x) * (c.runDist > 0.01 ? c.ran / c.runDist : 1); sc.y = c.from.y + (c.S.y - c.from.y) * (c.runDist > 0.01 ? c.ran / c.runDist : 1);
      sc.vx = (sc.x - px) / Math.max(dt, 1e-3); sc.vy = (sc.y - py) / Math.max(dt, 1e-3); sc.facing = Math.atan2(c.uy, c.ux);
      if (c.ran >= c.runDist - 1e-6) { c.stage = 'slide'; c.st = 0; }
    } else if (c.stage === 'slide') {
      const px = sc.x, py = sc.y; c.st = Math.min(CELEB.slide, c.st + dt);
      const T = CELEB.slide, s = slideAt(c.st) * c.slideLen / SLIDE_TRAVEL[SLIDE_TRAVEL.length - 1];
      sc.x = c.S.x + c.ux * s; sc.y = c.S.y + c.uy * s; sc.vx = (sc.x - px) / Math.max(dt, 1e-3); sc.vy = (sc.y - py) / Math.max(dt, 1e-3); sc.facing = Math.atan2(c.uy, c.ux);
      if (c.st >= T - 1e-6) { c.stage = 'hold'; c.ht = 0; }
    } else { c.ht += dt; sc.vx = 0; sc.vy = 0; }
    match.teams.forEach((t) => t.players.forEach((p) => {
      if (p === sc) return;
      if (t === c.team && c.join.has(p)) { const j = c.join.get(p); moveTo(p, j.x, j.y, c.stage === 'run' ? 6.2 : 5, dt); }
      else if (t === c.team) moveTo(p, c.ko.get(p).x, c.ko.get(p).y, 2.2, dt);
      else moveTo(p, c.ko.get(p).x, c.ko.get(p).y, 1.7, dt);
    }));
    if (c.stage === 'hold' && c.ht >= CELEB.hold) {
      if (match.wantReplay) { match.phase = 'replay'; match.replayWait = 0; match.replayDone = false; }
      else endCelebration(match);
    }
  }
  function endCelebration(match) {
    const c = match.celeb; match.celeb = null;
    FM.beginKickoff(match, c.opp);
    if (c.goalSpec) c.goalSpec.tail = goalTail(match, c.goalSpec, c.team, c.shooter);
  }

  // Slide tackles. A defender closing fast on a man who is running with the ball can go to ground for it. The slide is scripted from the slide-tackle clip's own travel
  // (every tenth of a second, in metres), aimed at where the carrier will be; contact comes about 0.4 s in and is settled then: the ball won cleanly, a miss, or a foul.
  // Coming from behind is the riskiest way: it wins the ball less often and is fouled more.
  const SLIDE_T = [0, 0.7, 1.2, 1.8, 2.5, 3.0, 3.3, 3.7, 3.9, 4.2, 4.3, 4.4, 4.6, 4.7, 4.9, 5.0, 5.1, 5.1];
  const slideTravel = (t) => { const k = Math.max(0, Math.min(t, 1.7)) * 10, i = Math.min(SLIDE_T.length - 2, Math.floor(k)); return SLIDE_T[i] + (SLIDE_T[i + 1] - SLIDE_T[i]) * Math.min(1, k - i); };
  function trySlide(match, d, cp, team, opp) {
    const aimX = clamp(cp.x + (cp.vx || 0) * 0.4, 1, L - 1), aimY = clamp(cp.y + (cp.vy || 0) * 0.4, 1, W - 1), dd = Math.hypot(aimX - d.x, aimY - d.y) || 1;
    const behind = (d.x - cp.x) * team.attackDir < -0.6;
    match.tackleLock = match.clock + 1.5; match.slideLock = match.clock + 2.5;
    const p = FM.tackleProb(d, cp, FM.edgeFor(match, opp)) * (opp.tacticalFactor || 1) * (behind ? 0.5 : 0.88), ok = match.rng() < p, st = statsOf(match, opp);
    st.tackles++; if (ok) st.tacklesWon++;
    let coverD = 40; opp.players.forEach((q) => { if (q !== d) coverD = Math.min(coverD, Math.hypot(q.x - d.x, q.y - d.y)); });
    record(match, { type: 'tackle', team: opp.id, player: d.number, vs: cp.number, p, ok, slide: true, x: cp.x, y: cp.y, depth: FM.toTeamSpace(opp.attackDir, cp.x, cp.y).d, cover: coverD });
    const foulP = (ok ? 0.05 : 0.28) * (behind ? 2.2 : 1) * (0.6 + 0.8 * opp.tactics.tackleAggression) * (inBox(team.attackDir, cp.x, cp.y) ? 0.6 : 1);
    (match.slides = match.slides || []).push({ p: d, x0: d.x, y0: d.y, ux: (aimX - d.x) / dd, uy: (aimY - d.y) / dd, k: Math.min(2, (dd + 0.3) / 3.0), t: 0, cp, team, opp, ok, foul: match.rng() < foulP, done: false });
    d.sliding = true;
  }
  function stepSlides(match, dt) {
    if (!match.slides || !match.slides.length) return;
    match.slides = match.slides.filter((s) => {
      s.t += dt; const px = s.p.x, py = s.p.y, tr = slideTravel(s.t) * s.k;
      s.p.x = clamp(s.x0 + s.ux * tr, 0.5, L - 0.5); s.p.y = clamp(s.y0 + s.uy * tr, 0.5, W - 0.5); s.p.vx = (s.p.x - px) / dt; s.p.vy = (s.p.y - py) / dt; s.p.facing = Math.atan2(s.uy, s.ux);
      if (!s.done && s.t >= 0.4) {
        s.done = true;
        const live = match.carrier && match.carrier.player === s.cp && !match.restart;
        if (live && s.foul) commitFoul(match, s.p, s.cp, s.opp, s.team);
        else if (live && s.ok) {
          // the ball is won: it runs loose from the man on the ground, and neither he nor the man who lost it can pick it up for a moment, so it goes to whoever is nearest
          match.carrier = null; match.carry = null; match.pendingAct = null; match.ball.state = 'loose'; match.lastTeam = s.opp; s.p.noPick = match.clock + 1.1; s.cp.noPick = match.clock + 0.9;
          const ang = Math.atan2(s.uy, s.ux); match.ball.x = clamp(s.cp.x + Math.cos(ang) * 0.8, 0.5, L - 0.5); match.ball.y = clamp(s.cp.y + Math.sin(ang) * 0.8, 0.5, W - 0.5);
        }
      }
      if (s.t >= 1.7) { s.p.sliding = false; s.p.vx = 0; s.p.vy = 0; return false; }
      return true;
    });
  }

  // ---------- clips ----------
  // For the user's own matches the engine keeps a rolling record of where every player and the ball are, three times a second.
  // When something worth studying happens (a goal either way, a big chance, a build-up from the back that reaches the final
  // third) the last few seconds are cut out as a clip, with the passes and shots in it, for the Analysis Centre to replay.
  // Coordinates are stored as whole decimetres to keep a season's worth small.
  const CLIP_DT = 1 / 3, BUFFER_SECONDS = 32;
  function recordFrame(match) {
    const r = match.rec;
    if (!r || match.clock < r.next) return;
    r.next = match.clock + CLIP_DT;
    const snap = (team) => team.players.map((p) => [p.number, p.x, p.y]);
    r.buf.push({ t: match.clock, b: [match.ball.x, match.ball.y], h: snap(match.home), a: snap(match.away) });
    while (r.buf.length && r.buf[0].t < match.clock - BUFFER_SECONDS) r.buf.shift();
    for (let i = r.pending.length - 1; i >= 0; i--) if (match.clock >= r.pending[i].until) extractClip(match, r.pending.splice(i, 1)[0]);
  }
  function extractClip(match, spec) {
    const r = match.rec, d1 = (v) => Math.round(v * 10);
    const frames = r.buf.filter((f) => f.t >= spec.from && f.t <= spec.to + 1e-6).concat(spec.tail || []);
    if (frames.length < 4) return;
    const roster = [[], []];
    frames.forEach((f) => { f.h.forEach((q) => { if (roster[0].indexOf(q[0]) < 0) roster[0].push(q[0]); }); f.a.forEach((q) => { if (roster[1].indexOf(q[0]) < 0) roster[1].push(q[0]); }); });
    const f = frames.map((fr) => {
      const row = [d1(fr.b[0]), d1(fr.b[1])];
      [['h', 0], ['a', 1]].forEach(([k, si]) => roster[si].forEach((n) => { const q = fr[k].find((z) => z[0] === n); row.push(q ? d1(q[1]) : -1, q ? d1(q[2]) : -1); }));
      return row;
    });
    const t0 = frames[0].t, off = (t) => Math.round((t - t0) * 10) / 10, idx = (id) => (id === match.home.id ? 0 : 1);
    const ev = [];
    match.events.forEach((e) => {
      if (e.t < t0 || e.t > frames[frames.length - 1].t) return;
      if (e.type === 'pass' && e.tx != null) ev.push(['pass', off(e.t), idx(e.team), e.from, e.to, d1(e.x), d1(e.y), d1(e.tx), d1(e.ty), e.ok ? 1 : 0, Math.round(e.p * 100), Math.round(e.dist), Math.round(Math.min(e.lane, 30) * 10) / 10, Math.round(Math.min(e.press, 30) * 10) / 10]);
      else if (e.type === 'shot') ev.push(['shot', off(e.t), idx(e.team), e.player, d1(e.x), d1(e.y), Math.round(e.xg * 100), e.outcome, e.setPiece || '']);
      else if (e.type === 'goal') ev.push(['goal', off(e.t), idx(e.team), e.player]);
      else if (e.type === 'tackle') ev.push(['tackle', off(e.t), idx(e.team), e.player, e.vs, e.ok ? 1 : 0]);
    });
    r.cands.push({
      kind: spec.kind, label: spec.label, rank: spec.rank || 0, minute: Math.floor((spec.event != null ? spec.event : t0) / 60) + 1,
      at: Math.round(((spec.event != null ? spec.event : t0) - t0) * 10) / 10, dt: Math.round(CLIP_DT * 1000) / 1000, roster, f, ev,
      kits: [{ shirt: match.home.kit.shirt, number: match.home.kit.number }, { shirt: match.away.kit.shirt, number: match.away.kit.number }],
      score: [match.score[match.home.id], match.score[match.away.id]],
      hd: match.home.attackDir,   // which way the home side was attacking (the sides change ends at half time)
    });
  }
  function clipGoal(match, team, shooter) {
    const t = match.clock, mine = team.id === match.userId;
    const spec = { kind: mine ? 'goal' : 'conceded', label: (mine ? 'Goal: ' : 'Goal conceded: ') + shooter.name + ' (' + team.name + ')', from: t - 14, to: t, until: t + 0.05, event: t };
    match.rec.pending.push(spec);
    return spec;
  }
  function snapTeams(match) { const snap = (team) => team.players.map((p) => [p.number, p.x, p.y]); return { h: snap(match.home), a: snap(match.away) }; }
  // The seconds after a goal, built from the positions at the moment it went in and the kick-off positions: a pause with the ball in the net while
  // the scoring side run to the scorer, then everyone walks back to the centre circle and the ball is placed on the spot.
  function goalTail(match, spec, team, shooter) {
    const dt = CLIP_DT, t0 = spec.event, goalX = team.attackDir === 1 ? L : 0, pre = spec.pre, post = snapTeams(match);
    const net = [goalX === L ? L - 0.5 : 0.5, clamp(spec.ballAt[1], W / 2 - 3.5, W / 2 + 3.5)];
    const sk = team === match.home ? 'h' : 'a';
    const gk = new Set(); match.teams.forEach((t) => t.players.forEach((p) => { if (p.group === 'GK') gk.add(t.id + ':' + p.number); }));
    const sc = pre[sk].find((q) => q[0] === shooter.number) || [0, spec.ballAt[0], spec.ballAt[1]];
    const run = [clamp(sc[1] - team.attackDir * 9, 4, L - 4), sc[2] < W / 2 ? 4 : W - 4];
    const A = 2.6, Bt = 3.4, ease = (k) => k * k * (3 - 2 * k), lerp = (a, b, k) => a + (b - a) * k;
    const mid = {}; // where everyone is when the celebration ends
    const tail = [];
    for (let t = dt; t <= A + Bt + 1e-6; t += dt) {
      const row = { t: t0 + t, b: null, h: [], a: [] };
      const inA = t <= A, kA = ease(Math.min(1, t / (A * 0.8))), kB = ease(Math.min(1, Math.max(0, (t - A) / Bt)));
      ['h', 'a'].forEach((k) => {
        const tid = k === 'h' ? match.home.id : match.away.id;
        pre[k].forEach((q, i) => {
          const n = q[0], key = k + n; let x = q[1], y = q[2];
          if (k === sk && !gk.has(tid + ':' + n)) {
            const ring = (i % 5) * 1.3 - 2.6, tx = n === shooter.number ? run[0] : run[0] - team.attackDir * (1.8 + (i % 3) * 1.2), ty = n === shooter.number ? run[1] : run[1] + (run[1] < W / 2 ? 1 : -1) * (1.5 + (i % 4) * 1.1) + ring * 0.3;
            x = lerp(q[1], clamp(tx, 1, L - 1), kA); y = lerp(q[2], clamp(ty, 1, W - 1), kA);
          }
          mid[key] = mid[key] || [x, y];
          if (inA) mid[key] = [x, y];
          else { const p = post[k].find((z) => z[0] === n) || q; x = lerp(mid[key][0], p[1], kB); y = lerp(mid[key][1], p[2], kB); }
          row[k].push([n, x, y]);
        });
      });
      row.b = inA ? net : [L / 2, W / 2];
      tail.push(row);
    }
    return tail;
  }
  function clipChance(match, team, shooter, xg) {
    const t = match.clock, mine = team.id === match.userId;
    match.rec.pending.push({ kind: mine ? 'chance' : 'chanceAgainst', label: (mine ? 'Chance: ' : 'Chance against: ') + shooter.name + ' (xG ' + xg.toFixed(2) + ')', from: t - 10, to: t + 3, until: t + 3, event: t, rank: xg });
  }
  // A build-up from the back: the user's team wins the ball in its own third and, keeping it, gets it into the final third
  // after at least four passes. Called each time the ball is given to a player.
  function chainOnBall(match, team, player, changed) {
    trackTransitions(match, team, player, changed);
    const r = match.rec, ch = r.chain;
    const d = FM.toTeamSpace(team.attackDir, player.x, player.y).d;
    if (team.id !== match.userId) { r.chain = null; return; }
    if (changed || !ch || match.clock - ch.start > 28) { r.chain = d < 0.33 ? { start: match.clock, passes: 0, done: false } : null; return; }
    ch.passes++;
    if (!ch.done && d > 0.66 && ch.passes >= 4) {
      ch.done = true;
      const t = match.clock;
      r.pending.push({ kind: 'buildup', label: 'Build-up from the back: ' + ch.passes + ' passes', from: ch.start - 1.5, to: t + 2, until: t + 2, event: ch.start, rank: ch.passes });
    }
  }
  // The other moments worth a clip, all cut from the user's own matches and all found as the ball changes hands:
  //   press        our team wins the ball high up the pitch (in the opposition's half)
  //   counter      we win it in our own half and are in their final third within about ten seconds, in five passes or fewer
  //   counterAgainst  the same, done to us
  //   turnover     we lose the ball in our own third and they have a shot within twelve seconds of it
  //   setpiece / setpieceAgainst  a corner or a free kick in the attacking half that ends in a shot
  // `changed` is true only when the ball truly changes hands in open play (restarts such as throw-ins set the side beforehand, so they do not count).
  function trackTransitions(match, team, player, changed) {
    const r = match.rec, mine = team.id === match.userId;
    const d = FM.toTeamSpace(team.attackDir, player.x, player.y).d;       // 0 = this team's own goal, 1 = the goal it attacks
    if (changed) {
      r.tr = { team: team.id, t: match.clock, d, passes: 0, done: false };
      if (mine && d > 0.58 && match.clock - (r.lastPress || -99) > 18) {
        r.lastPress = match.clock;
        r.pending.push({ kind: 'press', label: 'Pressing: the ball won ' + Math.round(100 * d) + '% of the way up the pitch', from: match.clock - 9, to: match.clock + 5, until: match.clock + 5, event: match.clock, rank: d });
      }
      if (!mine && 1 - d < 0.4) r.turn = { t: match.clock };                // they took it off us in our own third
      else if (mine) r.turn = null;
    } else if (r.tr && r.tr.team === team.id) {
      const k = r.tr;
      k.passes++;
      if (!k.done && d > 0.75 && k.d < 0.55 && match.clock - k.t <= 11 && k.passes <= 5) {
        k.done = true;
        const t = match.clock;
        r.pending.push({ kind: mine ? 'counter' : 'counterAgainst', label: (mine ? 'Counter-attack: ' : 'Their counter-attack: ') + Math.round(t - k.t) + ' seconds from winning the ball to their final third', from: k.t - 3, to: t + 2.5, until: t + 2.5, event: k.t, rank: 12 - (t - k.t) });
      }
    }
  }
  // Called for every shot: turns a loss in our own third, or a set piece, that ends in a shot into a clip.
  function noteShotForClips(match, team, shooter, xg) {
    const r = match.rec, t = match.clock, mine = team.id === match.userId;
    if (!mine && r.turn && t - r.turn.t <= 12 && xg >= 0.03) {
      r.pending.push({ kind: 'turnover', label: 'Ball lost in our own third, then a shot against: ' + shooter.name + ' (xG ' + xg.toFixed(2) + ')', from: r.turn.t - 8, to: t + 3, until: t + 3, event: r.turn.t, rank: xg });
      r.turn = null;
    }
    if (r.sp && r.sp.team === team.id && t - r.sp.t <= 9) {
      r.pending.push({ kind: mine ? 'setpiece' : 'setpieceAgainst', label: (mine ? '' : 'Against: ') + (r.sp.kind === 'corner' ? 'Corner' : 'Free kick') + ', shot by ' + shooter.name + ' (xG ' + xg.toFixed(2) + ')', from: r.sp.t - 3, to: t + 3, until: t + 3, event: r.sp.t, rank: xg });
      r.sp = null;
    }
  }
  // At the final whistle: cut anything still waiting, then keep the clips worth keeping (every goal, the best few chances
  // and build-ups) so a season stays a reasonable size.
  FM.finaliseClips = function (match) {
    const r = match.rec;
    if (!r) return [];
    r.pending.splice(0).forEach((s) => { s.to = Math.min(s.to, match.clock); extractClip(match, s); });
    const top = (kind, n) => r.cands.filter((c) => c.kind === kind).sort((a, b) => b.rank - a.rank).slice(0, n);
    const keep = r.cands.filter((c) => c.kind === 'goal' || c.kind === 'conceded').concat(top('chance', 3), top('chanceAgainst', 2), top('buildup', 2),
      top('press', 2), top('counter', 1), top('counterAgainst', 1), top('turnover', 1), top('setpiece', 1), top('setpieceAgainst', 1));
    keep.sort((a, b) => a.score[0] + a.score[1] - (b.score[0] + b.score[1]) || a.minute - b.minute);
    keep.sort((a, b) => a.minute - b.minute);
    keep.forEach((c, i) => { c.id = 'c' + i; delete c.rank; });
    return keep;
  };

  // ---------- energy and injuries during play ----------
  function fitnessTick(match, dt) {
    recordFrame(match);
    match.teams.forEach((team) => team.players.forEach((p) => { p.energy = Math.max(0.05, (p.energy == null ? 1 : p.energy) - FM.drainFor(p, team, dt)); }));
    if (match.clock >= (match.fitNext || 0)) { match.fitNext = match.clock + 30; match.teams.forEach((t) => t.players.forEach(FM.applyFatigue)); }
    if (!match.friendly && match.clock >= (match.injNext || 0)) {
      match.injNext = match.clock + 1;
      match.teams.forEach((team) => team.players.slice().forEach((p) => {
        if (match.injuryPause || FM.isInjured(p)) return;
        if (match.rng() < FM.injuryHazard(p, team)) handleInjury(match, team, p);
      }));
    }
  }
  // An injured player is out for a number of days. In the user's own match play stops so a substitute can be chosen;
  // for computer-run clubs (and when there is no one to bring on) the replacement is made at once.
  function handleInjury(match, team, p) {
    const inj = FM.rollInjury(match.rng);
    const heal = team.id === match.userId && FM.userMod ? FM.userMod('injuryRecovery') : 1;   // custom spending can shorten a lay-off
    p.injury = { until: (match.day || 0) + Math.max(1, Math.round(inj.days * heal)), name: inj.name, matches: Math.max(1, Math.round(inj.matches * heal)) };
    record(match, { type: 'injury', team: team.id, player: p.number, matches: inj.matches, name: inj.name });
    const manual = match.interactive && team.id === match.userId;
    const options = team.subsUsed < team.maxSubs && team.bench.some((b) => !FM.isInjured(b) && (p.group === 'GK' ? b.natural === 'GK' : b.natural !== 'GK'));
    if (!manual || !options) { replaceInjured(match, team, p); return; }
    match.injuryPause = { team, player: p };
  }
  function replaceInjured(match, team, p) {
    const near = FM.GROUP_NEAR[p.group] || [p.group];
    const rank = (b) => { const r = near.indexOf(b.natural); return r < 0 ? 9 : r; };
    const ovr = (b) => b.ratings.pace + b.ratings.dribbling + b.ratings.passing + b.ratings.finishing + b.ratings.tackling;
    if (team.subsUsed < team.maxSubs) {
      const cands = team.bench.filter((b) => !FM.isInjured(b) && (p.group === 'GK' ? b.natural === 'GK' : b.natural !== 'GK')).sort((a, b) => (rank(a) - rank(b)) || (ovr(b) - ovr(a)));
      if (cands.length) { FM.substitute(team, p, cands[0], match); return; }
    }
    retire(match, team, p);
  }
  // The injured player leaves and is not replaced: the side plays on with ten (an outfield player goes in goal if it was the keeper).
  function retire(match, team, p) {
    const wasKeeper = p.group === 'GK';
    team.players = team.players.filter((x) => x !== p);
    team.retired = (team.retired || []).concat(p);
    if (match.carrier && match.carrier.player === p) { const alt = team.players.filter((x) => x.group !== 'GK').sort((a, b) => dist(a, p) - dist(b, p))[0]; if (alt) match.carrier.player = alt; else match.carrier = null; }
    if (match.flight && match.flight.target === p) { match.flight.target = null; match.flight.outcome = 'loose'; }
    if (match.restart && match.restart.taker === p) { const alt = team.players.filter((x) => x.group !== 'GK')[0]; if (alt) match.restart.taker = alt; }
    if (wasKeeper) replaceKeeper(match, team, p);
  }
  // The manager chooses to play on without replacing the injured player.
  FM.resolveInjury = function (match) {
    if (!match.injuryPause) return;
    const { team, player } = match.injuryPause;
    match.injuryPause = null;
    retire(match, team, player);
  };

  // ---------- AI managers ----------
  // Teams the user does not manage change their approach during a match. Every five minutes (from the 20th) each one
  // looks at the score, the minute, the numbers on the pitch and how the match is going, and sets its tactics to its
  // pre-match tactics plus an adjustment. The adjustment is recalculated each time, never piled up, so it can reverse.
  FM.AI_SCALE = 0.5;
  const AI_CHECK_SECONDS = 300, AI_FIRST_CHECK = 1200, AI_SUB_MINUTES = [55, 65, 75, 83];
  const RANGES = { attackWidth: [0.7, 1.25], defWidth: [0.7, 1.25], cornerAttackers: [1, 7], cornerMarkers: [3, 9] };

  function runAI(match) {
    match.aiTeams.forEach((team) => {
      const opp = other(match, team);
      if (!team.liveBase) team.liveBase = Object.assign({}, team.tactics);
      const base = team.liveBase;
      const minute = match.clock / 60;
      const diff = match.score[team.id] - match.score[opp.id];
      const st = statsOf(match, team), so = statsOf(match, opp);
      const oppPoss = so.possession / ((st.possession + so.possession) || 1);
      const urgency = clamp((minute - 25) / 55, 0, 1);
      const adj = {};
      const add = (k, v) => { adj[k] = (adj[k] || 0) + v * FM.AI_SCALE; };

      if (diff < 0) {
        const push = clamp(0.35 + 0.35 * Math.min(-diff, 2), 0, 0.9) * urgency * (diff <= -3 ? 0.6 : 1);   // a heavy deficit is not chased with everybody forward
        add('tempo', 0.25 * push); add('risk', 0.3 * push); add('directness', 0.25 * push); add('buildDirect', 0.2 * push);
        add('shootFreedom', 0.25 * push); add('pressing', 0.2 * push); add('lineHeight', 0.15 * push); add('counterPress', 0.15 * push);
        add('cornerAttackers', 2 * push);
      } else if (diff > 0 && minute > 30) {
        const protect = clamp(diff * 0.5, 0, 1) * Math.max(urgency, 0.5);
        add('tempo', -0.25 * protect); add('risk', -0.3 * protect); add('directness', -0.15 * protect); add('lineHeight', -0.2 * protect);
        add('pressing', -0.1 * protect); add('counterAttack', 0.1 * protect); add('cornerAttackers', -1.5 * protect);
      } else if (diff === 0 && minute > 70) {
        add('tempo', 0.08); add('risk', 0.1); add('shootFreedom', 0.1);
      }
      // How the match is going: being pinned back, or being outplayed on chances.
      if (oppPoss > 0.58) { add('counterAttack', 0.15); add('lineHeight', -0.06); }
      if (so.xg - st.xg > 0.8 && diff <= 0) { add('lineHeight', -0.1); add('pressing', -0.05); }
      if (1 - oppPoss > 0.62 && diff <= 0 && minute > 50) add('directness', 0.1);
      // Numbers on the pitch.
      if (team.players.length < opp.players.length) { add('lineHeight', -0.15); add('pressing', -0.15); add('tempo', -0.05); }
      else if (team.players.length > opp.players.length) { add('lineHeight', 0.08); add('pressing', 0.1); add('risk', 0.05); }

      const lean = (adj.tempo || 0) + (adj.risk || 0) + (adj.lineHeight || 0);
      Object.keys(adj).forEach((k) => {
        const r = RANGES[k] || [0, 1];
        const v = clamp(base[k] + adj[k], r[0], r[1]);
        team.tactics[k] = (k === 'cornerAttackers' || k === 'cornerMarkers') ? Math.round(v) : v;
      });
      // Tell the user when an opponent visibly changes approach.
      const prev = team.liveLean || 0;
      if (Math.abs(lean - prev) > 0.12) {
        record(match, { type: 'tactic', team: team.id, direction: lean > prev ? 'attack' : 'defend' });
        team.liveLean = lean;
      }
    });
  }

  function aiSubstitution(match, team, minute) {
    const opp = other(match, team);
    if (team.subsUsed >= 4 || !team.bench.length) return;
    const diff = match.score[team.id] - match.score[opp.id];
    const near = (slotGroup, p) => (FM.GROUP_NEAR[slotGroup] || [slotGroup]).indexOf(p.natural) >= 0;
    const att = (p) => p.ratings.finishing + p.ratings.dribbling + p.ratings.passing;
    const def = (p) => p.ratings.tackling + p.ratings.heading + p.ratings.composure;
    const ovr = (p) => p.ratings.pace + p.ratings.dribbling + p.ratings.passing + p.ratings.finishing + p.ratings.tackling;
    const on = team.players.filter((p) => p.group !== 'GK' && !p.emergencyKeeper);
    const bench = team.bench.filter((p) => p.natural !== 'GK');
    let best = null, bestGain = 0;
    const consider = (out, inn, gain) => { if (gain > bestGain) { bestGain = gain; best = [out, inn]; } };
    if (diff < 0 && minute >= 55) {
      // Trailing: a more attacking player in place of a defensive one.
      on.filter((p) => ['FB', 'DM', 'CM', 'CB'].indexOf(p.group) >= 0).forEach((o) => bench.filter((b) => near(o.group, b)).forEach((b) => consider(o, b, att(b) - att(o))));
    } else if (diff > 0 && minute >= 70) {
      // Protecting a lead: a defensive player in place of an attacking one.
      on.filter((p) => ['WF', 'ST', 'AM'].indexOf(p.group) >= 0).forEach((o) => bench.filter((b) => near(o.group, b)).forEach((b) => consider(o, b, def(b) - def(o))));
    } else if (minute >= 60 && match.rng() < 0.5) {
      // Otherwise freshen up: a better like-for-like replacement for the weakest player.
      on.forEach((o) => bench.filter((b) => b.natural === o.natural).forEach((b) => consider(o, b, ovr(b) - ovr(o) - 3)));
    }
    if (best) FM.substitute(team, best[0], best[1], match);
  }

  function aiTick(match) {
    const minute = match.clock / 60;
    runAI(match);
    match.aiTeams.forEach((team) => {
      const i = match.aiSubStep[team.id] || 0;
      if (i < AI_SUB_MINUTES.length && minute >= AI_SUB_MINUTES[i]) {
        match.aiSubStep[team.id] = i + 1;
        aiSubstitution(match, team, minute);
      }
    });
  }

  // ---------- one simulation step ----------
  function stepMatchFixed(match, dt) {
    if (match.phase === 'halftime' || match.phase === 'fulltime') return;
    if (match.injuryPause) return;

    if (match.phase === 'celebration') { stepCelebration(match, dt); return; }
    if (match.phase === 'replay') { match.replayWait += dt; if (match.replayDone || !match.wantReplay || match.replayWait > 40) endCelebration(match); return; }
    if (match.hold) { match.hold.t -= dt; match.teams.forEach((t) => FM.stepTeam(t, match.ball, false, dt)); if (match.hold.t <= 0) { const fn = match.hold.fn; match.hold = null; fn(); } return; }
    if (match.phase === 'kickoff') {
      const poss = match.kickoffTeam;
      match.teams.forEach((t) => FM.stepTeam(t, match.ball, t === poss, dt));
      match.kickoffTimer -= dt;
      if (match.kickoffTimer <= 0) { match.phase = 'play'; }
      syncBall(match);
      return;
    }

    match.clock += dt;
    const poss = possessionTeam(match);
    statsOf(match, poss).possession += dt;
    sampleHeat(match);

    if (match.restart) { runRestart(match, dt); checkEnd(match); return; }
    if (match.drama && match.drama.list.length) runDrama(match);
    if (match.restart) { runRestart(match, dt); checkEnd(match); return; }

    if (match.aiTeams.length && match.carrier && match.clock >= match.nextAiCheck) { match.nextAiCheck += AI_CHECK_SECONDS; aiTick(match); }

    // Runtime context for the instruction rules. Set as hidden (non-enumerable) properties: team -> opponent -> team is a cycle, and it must never be
    // visible to JSON.stringify, which clones teams for the build-up lab and saves them.
    match.teams.forEach((t) => {
      const oo = other(match, t), ctx = { scoreDiff: (match.score[t.id] || 0) - (match.score[oo.id] || 0), minute: match.clock / 60, carrier: match.carrier ? match.carrier.player : null, pressed: false };
      Object.defineProperty(t, 'oppRef', { value: oo, writable: true, configurable: true, enumerable: false });
      Object.defineProperty(t, 'ruleCtx', { value: ctx, writable: true, configurable: true, enumerable: false });
    });
    setOffsideLines(match);
    setPhaseContext(match);
    const ov = buildOverrides(match);
    if (match.crossHold) {
      if (match.flight && match.flight.kind === 'cross') restartOverrides(match, match.crossHold).forEach((v, p) => ov.set(p, v));
      else match.crossHold = null;
    }
    if (match.extraOv) match.extraOv.forEach((v, p) => { if (!ov.has(p)) ov.set(p, v); });   // the lab: opponents following a player who has moved
    match.teams.forEach((t) => FM.stepTeam(t, match.ball, t === poss, dt, ov));
    // a goal kick that has not been played yet: the other side stay out of the box
    if (match.boxLock) {
      const bl = match.boxLock;
      if (match.clock > 40 || match.events.some((e) => e.type === 'pass' && e.team === bl.team.id)) match.boxLock = null;
      else clearBoxOfOpponents(match, bl.team);
    }
    fitnessTick(match, dt);

    updateBall(match, dt);

    const c = match.carrier;
    if (c) {
      const team = c.team, opp = other(match, team);
      // Tackles from defenders who are close enough.
      for (const d of opp.players) {
        if (d.group === 'GK' || d.sliding) continue;
        if (c.player.group === 'GK') continue;   // a goalkeeper with the ball is not tackled: he has it in his hands or is protected by the referee, and the ball is cleared from him
        const cSpeed = Math.hypot(c.player.vx || 0, c.player.vy || 0);   // a man running with the ball is in contact for less time but is easier to catch and hit
        const dd0 = Math.min(dist(d, c.player), dist(d, match.ball) + 0.3);
        // closing fast on a man who is running: go to ground for it
        if (dd0 > 1.8 + (FM.MOVE_REACH == null ? 0.25 : FM.MOVE_REACH) * cSpeed && dd0 < 4.4 && cSpeed > 2.2 && match.clock >= (match.tackleLock || 0) && match.clock >= (match.slideLock || 0) && !match.pendingAct && !match.restart) {
          const ux = (c.player.x - d.x) / dd0, uy = (c.player.y - d.y) / dd0, closing = (d.vx || 0) * ux + (d.vy || 0) * uy;
          if (closing > 3.2 && match.rng() < (FM.SLIDE_RATE == null ? 0.045 : FM.SLIDE_RATE) * (0.35 + 0.9 * opp.tactics.tackleAggression) * dt) { trySlide(match, d, c.player, team, opp); break; }
        }
        if (dd0 > 1.8 + (FM.MOVE_REACH == null ? 0.25 : FM.MOVE_REACH) * cSpeed) continue;   // (the man or the ball, whichever is nearer)
        if (!FM.TACKLE_ANY && (d.x - c.player.x) * team.attackDir < -0.6 && c.player.vx * team.attackDir > 1.5) continue;   // beaten: a defender chasing a man who is running on cannot tackle him from behind
        const rate = (FM.TACKLE_RATE == null ? 1.0 : FM.TACKLE_RATE) * (1 + (FM.MOVE_TACKLE == null ? 0.5 : FM.MOVE_TACKLE) * cSpeed / 3) * .65 * (opp.tacticalFactor || 1) * (0.05 + 0.08 * opp.tactics.pressing + (d.roleId === 'ball_winning_midfielder' ? 0.06 : 0)) * (0.6 + 0.8 * opp.tactics.tackleAggression) * ((FM.CLOSE_TACKLE == null ? 1 : FM.CLOSE_TACKLE) > 1 && dist(c.player, { x: opp.attackDir === 1 ? 0 : L, y: W / 2 }) < 24 ? (FM.CLOSE_TACKLE == null ? 1 : FM.CLOSE_TACKLE) : 1) * (1 + 0.35 * (FM.instrMods(d).tackle + FM.rulesDelta(opp, d, 'tackle', match.ball, false)));
        if (match.clock >= (match.tackleLock || 0) && match.rng() < rate * dt) {
          match.tackleLock = match.clock + 1.2;
          const p = FM.tackleProb(d, c.player, FM.edgeFor(match, opp)) * (opp.tacticalFactor || 1);
          const ok = match.rng() < p;
          const st = statsOf(match, opp);
          st.tackles++;
          if (ok) st.tacklesWon++;
          let coverD = 40; opp.players.forEach((q) => { if (q !== d) coverD = Math.min(coverD, Math.hypot(q.x - d.x, q.y - d.y)); });
          record(match, { type: 'tackle', team: opp.id, player: d.number, vs: c.player.number, p, ok, x: c.player.x, y: c.player.y, depth: FM.toTeamSpace(opp.attackDir, c.player.x, c.player.y).d, cover: coverD });
          // A tackle can only force a throw when it happens right beside a
          // touchline. Central challenges must leave the ball in play.
          if (ok && (c.player.y < 2.5 || c.player.y > W - 2.5) && match.rng() < 0.2) { startRestart(match, 'throw', team, clamp(c.player.x, 1, L - 1), c.player.y < W / 2 ? 0.5 : W - 0.5); break; }
          if (ok) { const lost = c.player; giveBall(match, opp, d, 0.9 + delayBeforeNextDecision(match, opp, d) * 0.4); match.regain = { player: lost, team, target: d, from: match.clock, until: match.clock + 2.6, count: 1 }; break; }
          if (match.rng() < (FM.FOUL_K == null ? 2.2 : FM.FOUL_K) * (0.06 + 0.1 * opp.tactics.tackleAggression + 0.002 * (60 - d.ratings.tackling) + 0.04 * FM.instrMods(d, false).tackle) * (inBox(team.attackDir, c.player.x, c.player.y) ? (FM.BOX_FOUL == null ? 0.35 : FM.BOX_FOUL) : 1)) { commitFoul(match, d, c.player, opp, team); break; }
        }
      }
    }
    if (match.carrier) {
      const currentPressure = nearestOpponent(match, match.carrier.team, match.carrier.player).d;
      match.possessionMinPressure = Math.min(match.possessionMinPressure == null ? currentPressure : match.possessionMinPressure, currentPressure);
    }
    // Winning the ball is not the end of it. The man who has just lost it goes straight back in, and if he gets a foot in the ball is his again:
    // a scrap of tackle and counter-tackle, three at most, before somebody gets away with it.
    const rg = match.regain;
    if (rg) {
      if (!match.carrier || match.carrier.player !== rg.target || match.clock > rg.until || rg.count > 3) match.regain = null;
      else if (match.clock - rg.from > 0.3 && match.clock >= (match.tackleLock || 0) && dist(rg.player, rg.target) < 1.9 && match.rng() < 2.4 * dt) {
        match.tackleLock = match.clock + 0.8;
        const p = FM.tackleProb(rg.player, rg.target, FM.edgeFor(match, rg.team)) * 0.9 * (rg.team.tacticalFactor || 1), ok = match.rng() < p, st = statsOf(match, rg.team);
        st.tackles++; if (ok) st.tacklesWon++;
        record(match, { type: 'tackle', team: rg.team.id, player: rg.player.number, vs: rg.target.number, p, ok, x: rg.target.x, y: rg.target.y, depth: FM.toTeamSpace(rg.team.attackDir, rg.target.x, rg.target.y).d, cover: 20, duel: rg.count });
        if (ok) { const t0 = rg.target, t1 = rg.player, tm = rg.team; giveBall(match, tm, t1, 0.7); match.regain = { player: t0, team: other(match, tm), target: t1, from: match.clock, until: match.clock + 2.2, count: rg.count + 1 }; }
      }
    }
    reassessDecisionTiming(match, dt);
    // A pass or a shot is played with the body pointing at it. A player facing one way who wants to play the ball the other way has to turn first, and
    // that takes time (about 0.3 s for a quarter turn, over half a second for a full one) in which he can be closed down: nobody plays it backwards
    // while running forwards.
    // Only the man lining up a pass or a shot is ever turning on the spot. (Several things end a wind-up without going through the code below: a tackle, a lost ball, a goal.
    // A man left with a turn he was never released from ran on along that heading until he reached a corner flag.)
    match.teams.forEach((t) => t.players.forEach((q) => { if (q.turnTo !== undefined && !(match.pendingAct && match.pendingAct.player === q && match.pendingAct.ang != null)) q.turnTo = undefined; }));
    const pa = match.pendingAct;
    if (pa) {
      if (pa.ang != null && match.clock >= pa.turnEnd && pa.player.turnTo !== undefined) pa.player.turnTo = undefined;   // turned: the wind-up goes on facing the target
      if (!match.carrier || match.carrier.player !== pa.player) { pa.player.turnTo = undefined; match.pendingAct = null; }
      // He was lining up a sideways or back pass, but the last defender has been beaten while he did: he is through, so the pass is off and he decides again.
      else if (pa.opt.kind === 'pass' && !match.forcePass && !match.restart && pa.player.group !== 'GK' && (pa.opt.tx - pa.player.x) * pa.team.attackDir < 8 && FM.toTeamSpace(pa.team.attackDir, pa.player.x, pa.player.y).d > 0.6 && !other(match, pa.team).players.some((o) => o.group !== 'GK' && (o.x - pa.player.x) * pa.team.attackDir > -1 && Math.abs(o.y - pa.player.y) < 24)) {
        pa.player.turnTo = undefined; match.pendingAct = null; match.nextDecision = match.clock;
      }
      else if (match.clock >= pa.release && (dist(match.ball, pa.player) < KICK_REACH || match.clock > pa.release + 0.6)) {
        pa.player.turnTo = undefined; match.pendingAct = null;
        const o = pa.opt, lag = match.clock - pa.start;
        if (o.target) { o.tx = clamp(o.tx + (o.target.vx || 0) * lag * 0.6, 1, L - 1); o.ty = clamp(o.ty + (o.target.vy || 0) * lag * 0.6, 1, W - 1); }
        runAction(match, pa.team, pa.player, o);
      }
    }
    if (match.carrier && !match.pendingAct && match.clock >= match.nextDecision) {
      const { team, player } = match.carrier;
      const ft = match.firstTime && match.firstTime.player === player ? match.firstTime : null; match.firstTime = null;
      const opt = ft ? ft.opt : chooseAction(match, team, player);
      const aim = aimOf(team, opt);
      const need = aim && !match.forcePass && Number.isFinite(player.facing) ? Math.abs(angleDiff(player.facing, Math.atan2(aim.y - player.y, aim.x - player.x))) : 0;
      if (aim && !match.forcePass) {
        // A pass or a shot takes a moment: turn if he has to, then the backswing and the strike, and the ball leaves the foot at the end of it. (The
        // motion-captured kick in the 3D view is timed to this.)
        const turnT = need > (FM.TURN_FREE == null ? 1.75 : FM.TURN_FREE) ? Math.min(0.9, need / (FM.TURN_RATE == null ? 5.2 : FM.TURN_RATE)) : 0, wind = (FM.WIND == null ? 0.3 : FM.WIND) * (turnT > 0 ? 0.65 : 1) * (ft ? 0.4 : 1);
        const ang = turnT > 0 ? Math.atan2(aim.y - player.y, aim.x - player.x) : null;
        match.pendingAct = { opt, team, player, ang, start: match.clock, turnEnd: match.clock + turnT, release: match.clock + turnT + wind, kick: true };
        if (ang != null) player.turnTo = ang; match.carry = null;
      } else runAction(match, team, player, opt);
    }

    checkEnd(match);
  }

  const angleDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
  // where the ball is going to be sent, for the kinds of action that need the body turned to it
  function aimOf(team, opt) {
    if (opt.kind === 'pass') return { x: opt.tx, y: opt.ty };
    if (opt.kind === 'clear' && opt.pass) return { x: opt.pass.tx, y: opt.pass.ty };
    if (opt.kind === 'shoot') return { x: team.attackDir === 1 ? L : 0, y: W / 2 };
    return null;
  }
  function runAction(match, team, player, opt) {
    if (opt.kind === 'pass') doPass(match, team, player, opt);
    else if (opt.kind === 'shoot') doShot(match, team, player, opt);
    else if (opt.kind === 'dribble') doDribble(match, team, player, opt);
    else if (opt.kind === 'carry') doCarry(match, team, player);
    else if (opt.kind === 'clear') doClear(match, team, player, opt);
    else doHold(match, team, player);
    match.forcePass = false; match.noOffside = false;
  }

  // All callers advance the same 0.1-second simulation. Rendering, fast
  // forwarding and background fixtures may request different chunks, but no
  // longer change the number or ordering of random decisions.
  FM.debugRestart = (m, kind, team, x, y) => startRestart(m, kind, team, x, y);
  // Where everyone and the ball were before the latest step, so the picture can be drawn between the last two steps (main.js interpolate) rather than jumping each step.
  const PREV = new WeakMap();
  function keepPrev(match) { match.teams.forEach((t) => t.players.forEach((p) => PREV.set(p, { x: p.x, y: p.y, f: p.facing }))); PREV.set(match.ball, { x: match.ball.x, y: match.ball.y }); }
  FM.prevOf = (o) => PREV.get(o);
  FM.stepMatch = function (match, dt) {
    if (!(dt > 0)) return;
    // timers that are kept as a time on this match's clock (a man who cannot pick the ball up for a moment, a man on the ground) start clean in every match
    if (!match.cleaned) { match.cleaned = true; match.teams.forEach((t) => t.players.concat(t.bench || []).forEach((p) => { p.noPick = 0; p.sliding = false; p.turnTo = undefined; })); match.ball.vx = 0; match.ball.vy = 0; match.ball.of = null; }
    if (FM.computeEdges && match.clock >= (match.edgeAt || 0)) { FM.computeEdges(match); match.edgeAt = match.clock + 60; }
    match.fixedStepRemainder = (match.fixedStepRemainder || 0) + dt;
    while (match.fixedStepRemainder >= .1 - 1e-9 && match.phase !== 'halftime' && match.phase !== 'fulltime' && !match.injuryPause) {
      keepPrev(match);
      stepMatchFixed(match, .1);
      stepSlides(match, .1); separate(match);
      match.fixedStepRemainder -= .1;
    }
    if (match.fixedStepRemainder < 1e-9) match.fixedStepRemainder = 0;
  };
  function checkEnd(match) {
    if (match.clock >= HALF_SECONDS && match.phase === 'play' && !match.firstHalfDone) { match.firstHalfDone = true; match.phase = 'halftime'; }
    if (match.clock >= FULL_SECONDS) { match.phase = 'fulltime'; }
  }

  FM.startSecondHalf = function (match) {
    if (match.phase !== 'halftime') return;
    match.teams.forEach((t) => t.players.forEach((p) => { p.energy = Math.min(1, (p.energy == null ? 1 : p.energy) + 0.08); FM.applyFatigue(p); }));
    // as in real football the sides change ends: each attacks the goal the other attacked in the first half
    match.teams.forEach((t) => { t.attackDir = -t.attackDir; });
    match.swapped = true; match.swapAt = match.clock;
    FM.beginKickoff(match, match.away);
  };

  function syncBall(match) {
    if (match.carrier && match.ball.state === 'carried') {
      const p = match.carrier.player;
      const face = Number.isFinite(p.facing) ? p.facing : (match.carrier.team.attackDir === 1 ? 0 : Math.PI);
      match.ball.x = p.x + Math.cos(face) * 0.72; match.ball.y = p.y + Math.sin(face) * 0.72;
    }
  }

  // A man running with the ball does not have it fixed to his boots. At a jog he plays it on every stride and it stays at his feet; at a sprint he knocks it several metres ahead
  // and runs onto it, so the touches come every few strides. Standing, or lining up a pass or a shot, he has it at his foot. The ball is a real thing with a position and a
  // speed that slows on the grass, and a pass or shot can only be struck when it is within reach of his foot.
  const TOUCH_REACH = 0.62, KICK_REACH = 1.0;
  function carryBall(match, dt) {
    const ball = match.ball, p = match.carrier.player, face = Number.isFinite(p.facing) ? p.facing : (match.carrier.team.attackDir === 1 ? 0 : Math.PI);
    const ux = Math.cos(face), uy = Math.sin(face), nx = -uy, ny = ux, sp = Math.hypot(p.vx || 0, p.vy || 0), run = sp > 4.3;
    if (ball.of !== p) { ball.of = p; ball.lastTouch = match.clock - 0.5; ball.side = 1; }
    const pa = match.pendingAct && match.pendingAct.player === p, dB = Math.hypot(ball.x - p.x, ball.y - p.y);
    if ((pa || sp < 0.9) && dB < 1.1) {
      // standing, or lining up a pass or shot, with the ball at his foot: it is settled there
      const kk = Math.min(1, dt * (pa ? 12 : 8)), d = pa ? 0.55 : 0.5;
      ball.x += (p.x + ux * d - ball.x) * kk; ball.y += (p.y + uy * d - ball.y) * kk; ball.vx = p.vx || 0; ball.vy = p.vy || 0; return;
    }
    // otherwise the ball is its own: it rolls and slows on the grass
    ball.x += ball.vx * dt; ball.y += ball.vy * dt; const fr = Math.exp(-1.25 * dt); ball.vx *= fr; ball.vy *= fr;
    const along = (ball.x - p.x) * ux + (ball.y - p.y) * uy, lat = (ball.x - p.x) * nx + (ball.y - p.y) * ny, lost = along > (run ? 4.4 : 2.4) || along < -2.2 || Math.abs(lat) > 2.4;
    if (lost) { match.carrier = null; match.carry = null; match.pendingAct = null; ball.state = 'loose'; p.noPick = match.clock + 0.05; return; }   // a heavy touch: he has to go and get it
    // A touch is decided, and the foot swings to the ball; the ball is pushed when the foot reaches it (a step later), not before the swing has begun.
    const pushNow = () => { const push = run ? 4.6 + 0.3 * sp : 0.62 + 0.08 * sp, sd = (run ? 0.5 : 0.25) * ball.side; ball.vx = ux * (sp + push) + nx * sd; ball.vy = uy * (sp + push) + ny * sd; };
    if (ball.pushAt != null) {
      if (match.clock - ball.lastTouch > 0.5 || ball.pushOf !== p) ball.pushAt = null;
      else if (match.clock >= ball.pushAt - 1e-6) { ball.pushAt = null; pushNow(); }
    }
    else if (along > -0.4 && along < (run ? 0.56 : TOUCH_REACH) && Math.abs(lat) < 0.9 && match.clock - ball.lastTouch > 0.17 && !pa) {
      ball.side = -ball.side; ball.lastTouch = match.clock; ball.touchBy = p; ball.touchSide = ball.side; ball.touchAt = match.clock;
      if (FM.PUSH_DELAY === 0) pushNow(); else { ball.pushAt = match.clock + (FM.PUSH_DELAY == null ? 0.1 : FM.PUSH_DELAY); ball.pushOf = p; }
    }
    ball.x = clamp(ball.x, 0.2, L - 0.2);   // (the end lines hold a carried ball in; the touchlines do not)
    if ((ball.y < 2 || ball.y > W - 2) && !pa && match.rng() < (FM.SQUEEZE == null ? 0.08 : FM.SQUEEZE) && nearestOpponent(match, match.carrier.team, p).d < 2.8) ball.y = ball.y < W / 2 ? -0.2 : W + 0.2;   // pressed against the line, it goes out
    if (ball.y < 0 || ball.y > W) { const bx = ball.x < 0 ? Math.min(ball.x, -0.1) : ball.x > L ? Math.max(ball.x, L + 0.1) : ball.x, by = ball.y < 0 ? Math.min(ball.y, -0.1) : ball.y > W ? Math.max(ball.y, W + 0.1) : ball.y, tm = match.carrier.team; ball.vx = ball.vy = 0; match.carrier = null; match.carry = null; match.pendingAct = null; handleOut(match, tm, bx, by); }
  }

  function updateBall(match, dt) {
    const ball = match.ball;
    if (match.carrier) { carryBall(match, dt); return; }
    const f = match.flight;
    if (f && f.free) { stepFreePass(match, f, dt); return; }
    if (f) {
      const tx = f.target ? f.target.x + f.target.vx * 0.15 : f.ex;
      const ty = f.target ? f.target.y + f.target.vy * 0.15 : f.ey;
      const dx = tx - ball.x, dy = ty - ball.y;
      const d = Math.hypot(dx, dy);
      // A ground pass leaves the foot fast and slows on the grass: it does not travel at one speed and stop dead at the receiver.
      if (f.kind === 'pass' && f.v0 == null) { f.v0 = f.speed; f.speed *= (FM.PASS_BOOST == null ? 1.25 : FM.PASS_BOOST); }
      const move = f.speed * dt;
      if (f.kind === 'pass' && f.v0 != null) f.speed = Math.max(f.v0 * 0.62, f.speed * Math.exp(-(FM.PASS_DECAY == null ? 0.45 : FM.PASS_DECAY) * dt));
      if (d <= move + 0.4) { ball.x = tx; ball.y = ty; arrive(match, f); }
      else { ball.x += dx / d * move; ball.y += dy / d * move; }
      return;
    }
    // Loose ball: it rolls on and slows; whoever gets to it first has to win it (a fast ball is hard to control, and a man can knock it on instead).
    { const sp0 = Math.hypot(ball.vx || 0, ball.vy || 0);
      if (sp0 > 0.05) {
        ball.x += ball.vx * dt; ball.y += ball.vy * dt; const fr = FM.OLD_ROLL ? Math.exp(-(FM.LOOSE_FRIC == null ? 1.3 : FM.LOOSE_FRIC) * dt) : rollSpeed(sp0, dt, 0) / sp0; ball.vx *= fr; ball.vy *= fr; if (sp0 < 0.35) { ball.vx = 0; ball.vy = 0; }
        if (ball.x < 0 || ball.x > L || ball.y < 0 || ball.y > W) { const bx = ball.x < 0 ? Math.min(ball.x, -0.1) : ball.x > L ? Math.max(ball.x, L + 0.1) : ball.x, by = ball.y < 0 ? Math.min(ball.y, -0.1) : ball.y > W ? Math.max(ball.y, W + 0.1) : ball.y; ball.vx = ball.vy = 0; handleOut(match, match.lastTeam || match.home, bx, by); return; }
      }
    }
    let best = null, bd = 1.25;
    match.teams.forEach((t) => t.players.forEach((p) => { if ((p.noPick || 0) > match.clock) return; const d = Math.hypot(p.x - ball.x, p.y - ball.y); if (d < bd) { bd = d; best = { team: t, player: p }; } }));
    if (best) {
      const sp1 = Math.hypot(ball.vx || 0, ball.vy || 0);
      if (match.rng() < clamp(0.97 - sp1 * 0.07, 0.3, 0.97)) giveBall(match, best.team, best.player, 0.5, 0.4);
      else knockLoose(match, best.player, best.team, ball.vx || 1, ball.vy || 0, Math.max(1.2, sp1 * 0.6), 1.5);
    }
  }

  function arrive(match, f) {
    if (f.kind === 'cross') { crossArrive(match, f); return; }
    if (f.kind === 'pass') {
      match.flight = null;
      if (f.outcome === 'offside') {
        statsOf(match, f.team).offsides++;
        record(match, { type: 'offside', team: f.team.id, player: f.target.number, x: f.target.x, y: f.target.y });
        startRestart(match, 'freekick', other(match, f.team), clamp(match.ball.x, 0.5, L - 0.5), clamp(match.ball.y, 0.5, W - 0.5), { indirect: true });
        return;
      }
      if (f.outcome === 'complete') giveBall(match, f.team, f.target, 0.12 + delayBeforeNextDecision(match, f.team, f.target));
      // Deflections only become throw-ins when the pass has physically
      // reached the touchline. Previously any interception, including one in
      // central midfield, could randomly jump straight to a throw-in.
      else if (f.outcome === 'intercepted' && (match.ball.y < 1 || match.ball.y > W - 1) && match.rng() < 0.15) startRestart(match, 'throw', f.team, clamp(match.ball.x, 1, L - 1), match.ball.y < W / 2 ? 0.5 : W - 0.5);
      else if (f.outcome === 'intercepted') giveBall(match, other(match, f.team), f.interceptor, 0.4 + delayBeforeNextDecision(match, other(match, f.team), f.interceptor) * 0.5);
      else if (match.ball.x < 1 || match.ball.x > L - 1 || match.ball.y < 1 || match.ball.y > W - 1) handleOut(match, f.team, match.ball.x < 1 ? Math.min(match.ball.x, -0.1) : match.ball.x > L - 1 ? Math.max(match.ball.x, L + 0.1) : match.ball.x, match.ball.y < 1 ? Math.min(match.ball.y, -0.1) : match.ball.y > W - 1 ? Math.max(match.ball.y, W + 0.1) : match.ball.y);
      else { match.ball.state = 'loose'; match.lastTeam = f.team; }
      return;
    }
    // Shot
    match.flight = null;
    const team = f.team, opp = other(match, team);
    const after = (fn) => { if (f.penalty) { match.hold = { t: 2, fn }; match.ball.state = 'dead'; } else fn(); };   // a penalty miss or save stays on screen for a moment
    if (f.outcome === 'goal') {
      const st = statsOf(match, team); st.goals++;
      match.score[team.id]++;
      record(match, { type: 'goal', team: team.id, player: f.shooter.number });
      const goalSpec = match.rec ? clipGoal(match, team, f.shooter) : null;
      if (goalSpec) { goalSpec.pre = snapTeams(match); goalSpec.ballAt = [match.ball.x, match.ball.y]; }
      if (match.rec) {
        const r = match.rec, gx = team.attackDir === 1 ? L : 0, ny = clamp(f.ey, W / 2 - 3.4, W / 2 + 3.4), snap = (t) => t.players.map((p) => [p.number, p.x, p.y]);
        [0, 0.35, 0.7].forEach((dt) => r.buf.push({ t: match.clock + dt, b: [gx + (gx === L ? -0.4 : 0.4), ny], h: snap(match.home), a: snap(match.away) }));
        r.next = match.clock + 0.7 + CLIP_DT;
      }
      if (match.skipFx) { FM.beginKickoff(match, opp); if (goalSpec) goalSpec.tail = goalTail(match, goalSpec, team, f.shooter); }
      else beginCelebration(match, team, f.shooter, opp, goalSpec);
    } else if (f.outcome === 'saved') {
      after(() => {
        if (match.rng() < (FM.SHOT_CORNER == null ? 0.62 : FM.SHOT_CORNER)) startRestart(match, 'corner', team, team.attackDir === 1 ? L - 0.5 : 0.5, f.ey < W / 2 ? 0.5 : W - 0.5);
        else giveBall(match, opp, f.gk, 1.6);
      });
    } else if (f.outcome === 'blocked') {
      if (match.rng() < (FM.SHOT_CORNER == null ? 0.62 : FM.SHOT_CORNER)) startRestart(match, 'corner', team, team.attackDir === 1 ? L - 0.5 : 0.5, f.ey < W / 2 ? 0.5 : W - 0.5);
      else { match.ball.state = 'loose'; match.lastTeam = opp; }
    } else {
      // Off target: goal kick.
      after(() => startRestart(match, 'goalkick', opp, opp.attackDir === 1 ? 5.5 : L - 5.5, W / 2));
    }
  }

  FM.formatClock = function (seconds) {
    const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  };
})();
