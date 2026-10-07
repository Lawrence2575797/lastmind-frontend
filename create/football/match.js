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
  FM.passProb = function (passer, distance, lane, press) {
    return sig(3.1 + 0.04 * (passer.ratings.passing - 60) - 0.04 * distance - 2.2 * Math.exp(-lane / 2) - 1.0 * Math.exp(-press / 3));
  };
  // Dribble past the nearest defender.
  FM.dribbleProb = function (carrier, defDist, defender) {
    const dfn = defender ? 0.03 * (defender.ratings.tackling - 60) : 0;
    return sig(1.4 + 0.05 * (carrier.ratings.dribbling - 60) - 1.8 * Math.exp(-defDist / 2.5) - dfn);
  };
  // Tackle: the defender's tackling against the carrier's dribbling.
  FM.tackleProb = function (defender, carrier) {
    return sig(-0.35 + 0.05 * (defender.ratings.tackling - carrier.ratings.dribbling));
  };
  // Expected goals from a shooting position: the wider the goal looks from there, the better the chance.
  FM.shotAngle = function (x, y, attackDir) {
    const gx = attackDir === 1 ? L : 0;
    const dx = Math.max(0.5, Math.abs(gx - x)), dy = y - W / 2;
    return Math.abs(Math.atan2(dy + 3.66, dx) - Math.atan2(dy - 3.66, dx));
  };
  FM.xgLogit = function (shooter, x, y, attackDir, defDist) {
    return -3.92 + 7.6 * FM.shotAngle(x, y, attackDir) + 0.03 * (shooter.ratings.finishing - 60) - 0.9 * Math.exp(-defDist / 2);
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
    if (mine) return FM.toTeamSpace(team.attackDir, match.ball.x, match.ball.y).d < 0.5 ? 'build' : 'final';
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
    h.ball[heatCell(match.ball.x / L, match.ball.y / W)]++;
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
  }

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

  function giveBall(match, team, player, delay) {
    if (match.rec) chainOnBall(match, team, player, match.lastTeam !== team);
    if (match.lastTeam !== team || !match.lastChange) match.lastChange = { team, t: match.clock };
    match.carrier = { team, player };
    match.flight = null;
    match.lastTeam = team;
    match.ball.state = 'carried';
    match.nextDecision = match.clock + delay;
    match.carry = null;
  }

  // The build-up lab: one short, repeatable trial. Both sides stand where their own phase positions put them, with the ball beside the keeper.
  FM.startBuildUpTrial = function (match, team, kind) {
    const opp = other(match, team), dir = team.attackDir;
    match.phase = 'play'; match.kickoffTimer = 0; match.clock = 0; match.restart = null; match.flight = null; match.carry = null; match.events = [];
    match.teams.forEach((t) => { t.phaseCtx = {}; t.offsideLine = null; });
    const gk = team.players.find((p) => p.group === 'GK') || team.players[0];
    const spot = FM.toMetres(dir, kind === 'goalkick' ? 0.05 : 0.07, 0.6);
    match.ball.x = spot.x; match.ball.y = spot.y; match.ball.state = 'carried';
    [team, opp].forEach((t) => t.players.forEach((p) => { const q = FM.targetFor(t, p, match.ball, t === team); p.x = q.x; p.y = q.y; p.vx = 0; p.vy = 0; }));
    gk.x = spot.x - dir * 0.7; gk.y = spot.y;
    match.lastTeam = team; match.lastChange = null;
    giveBall(match, team, gk, 1.2);
    match.lastChange = null;   // the keeper has the ball in open play or from a goal kick: nobody has just lost it, so there is no counter-press to begin with
    if (kind === 'goalkick') { match.forcePass = true; match.noOffside = true; }
  };
  FM.holderOf = function (match) { return possessionTeam(match); };
  function possessionTeam(match) {
    if (match.restart) return match.restart.team;
    if (match.carrier) return match.carrier.team;
    if (match.flight) return match.flight.team;
    return match.lastTeam;
  }

  // Clear through on goal: close to goal, in the middle of the pitch, with every outfield defender at least 2.5 m behind him.
  function clearThrough(match, team, p) {
    return p.group !== 'GK' && FM.toTeamSpace(team.attackDir, p.x, p.y).d > (FM.CLEAR_D == null ? 0.92 : FM.CLEAR_D) && Math.abs(p.y - W / 2) < 24 && !other(match, team).players.some((o) => o.group !== 'GK' && (o.x - p.x) * team.attackDir > -(FM.CLEAR_GAP == null ? 4 : FM.CLEAR_GAP));
  }
  // ---------- target overrides: carrying, pressing, chasing the ball ----------
  function buildOverrides(match) {
    const ov = new Map();
    const c = match.carrier;
    if (c) {
      const opp = other(match, c.team);
      if (match.carry && match.carry.player === c.player && match.clock < match.carry.until) {
        const reach = FM.toTeamSpace(c.team.attackDir, c.player.x, c.player.y).d > 0.66 ? 9 * (FM.CARRY_FINAL == null ? 0.7 : FM.CARRY_FINAL) : 9;   // in the final third the cover is close: a touch past the man, not a run past the whole defence
        ov.set(c.player, { x: clamp(c.player.x + match.carry.dx * reach, 1, L - 1), y: clamp(c.player.y + match.carry.dy * reach, 1, W - 1) });
      } else if (!match.forcePass && match.nextDecision - match.clock > 0.3) {
        // Waiting to decide: a man with room keeps moving with the ball (a jog, toward goal and a little toward the middle) instead of standing
        // still holding it. Closed down, or already in the box, he holds the ball where he is (a man backing away from a defender can never be
        // tackled, which breaks the game: 30+ goals a match).
        const nd = nearestOpponent(match, c.team, c.player).d, toward = FM.toTeamSpace(c.team.attackDir, c.player.x, c.player.y).d;
        if (nd > 5 && toward < 0.84) ov.set(c.player, { x: clamp(c.player.x + c.team.attackDir * (nd > 10 ? 8 : 3.2), 1, L - 1), y: clamp(c.player.y + (W / 2 - c.player.y) * 0.04, 1, W - 1) });
      }
      // Whatever the moment, a man with the ball is never sent back to his usual position: past the last defender he goes on, otherwise he holds.
      // A man clear through on goal runs on at the keeper; he is never sent back toward his usual position into the men chasing him.
      if (!FM.NO_LATE && !ov.has(c.player) && clearThrough(match, c.team, c.player)) ov.set(c.player, { x: clamp(c.player.x + c.team.attackDir * 3, 1, L - 1), y: clamp(c.player.y + (W / 2 - c.player.y) * 0.08, 1, W - 1) });
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
      const press = clamp(Math.max(pressingNow(match, opp) + (deep ? 0.35 * (pbu - 0.4) : 0), nearGoal ? (FM.DEF_BOX_PRESS || 0.8) : 0), 0, 1);
      const lostIt = match.lastChange && match.lastChange.team === c.team && match.clock - match.lastChange.t < PRESS_WINDOW;
      const n = 1 + (press > 0.65 && (lostIt || nearGoal || (deep && pbu > 0.6)) ? 1 : 0);
      const ranked = opp.players.filter((p) => p.group !== 'GK').map((p) => ({ p, d: dist(p, c.player) })).sort((a, b) => a.d - b.d);
      ranked.slice(0, n).forEach(({ p, d }, i) => {
        if (d >= pressTrigger(opp, p, press, match)) return;
        const stand = 0.5 + 2.2 * (1 - press) + 0.8 * i; // how far off the carrier he stops, in metres
        const dx = p.x - c.player.x, dy = p.y - c.player.y, dd = Math.max(d, 0.1);
        ov.set(p, { x: c.player.x + c.player.vx * 0.4 + dx / dd * stand, y: c.player.y + c.player.vy * 0.4 + dy / dd * stand });
      });
      // Recovery. A defender who has been beaten does not stay behind the ball: he sprints to get goal-side again, between the man with the ball and
      // his goal, rather than trailing after him.
      if (FM.toTeamSpace(c.team.attackDir, c.player.x, c.player.y).d > 0.6) {
        opp.players.forEach((p) => {
          if (p.group === 'GK' || ov.has(p)) return;
          const gap = (c.player.x - p.x) * c.team.attackDir;
          if (gap > 1 && gap < 30 && Math.abs(p.y - c.player.y) < 26) ov.set(p, { x: c.player.x + c.team.attackDir * (FM.RECOVER_AHEAD == null ? 4 : FM.RECOVER_AHEAD), y: c.player.y + (p.y - c.player.y) * 0.3 });
        });
      }
      // Tight markers follow the nearest attacker; a centre-half told to step up follows a forward who drops deep.
      const att = c.team.players.filter((q) => q.group !== 'GK');
      opp.players.forEach((p) => {
        if (p.group === 'GK' || ov.has(p)) return;
        const mm = FM.instrMods(p);
        let target = null, reach = 0;
        const rm = FM.rulesMark(opp, p, match.ball), rStep = FM.rulesDelta(opp, p, 'stepUp', match.ball, false) > 0;
        if (rm) { reach = rm.number != null || rm.name ? 40 : 18; target = att.filter((q) => FM.rulesAttackerOf(rm, q)); }
        else if (mm.marking > 0) { reach = 14; target = att; }
        else if ((mm.stepUp > 0 || rStep) && (p.group === 'CB' || p.group === 'DM')) { reach = 24; target = att.filter((q) => q.group === 'ST' || q.group === 'AM'); }
        if (!target) return;
        let best = null, bd = reach;
        target.forEach((q) => { const dd = dist(p, q); if (dd < bd) { bd = dd; best = q; } });
        if (best) ov.set(p, { x: best.x - opp.attackDir * 1.5, y: best.y });
      });
      // The press on a build-up as a plan. Their forwards go to the deepest of your players, their attacking midfielders to the next, and so on, each
      // taking the nearest of your players not already taken. Whether a player follows his job is a chance, drawn again every few seconds: a team that
      // presses hard mostly sticks to it, and one that presses lightly often does not. The ones left over (usually their full-backs and centre-backs)
      // mark nobody, which is what leaves your man free.
      const plan = press >= 0.3 && FM.toTeamSpace(c.team.attackDir, c.player.x, c.player.y).d < 0.5 ? pressPlan(match, opp, c.team, c.player, press, ov) : null;
      if (plan) {
        const stand = 1.2 + 2.6 * (1 - press);
        plan.assign.forEach((q, p) => {
          if (ov.has(p)) return;
          const dx = c.player.x - q.x, dy = c.player.y - q.y, dd = Math.max(Math.hypot(dx, dy), 0.1);
          const sd = stand * (1 - 0.4 * (plan.cd ? plan.cd.get(p) || 0 : 0));
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
      const cutters = Math.max(2, Math.round((FM.DEF_CUTTERS || 3) * (0.5 + 0.5 * press) + 1.5 * hardPress));
      const taken = new Set();
      let used = 0;
      for (const { q } of recv) {
        if (used >= cutters) break;
        const lx = c.player.x + (q.x - c.player.x) * laneAt, ly = c.player.y + (q.y - c.player.y) * laneAt;
        let who = null, bd = 18;
        free.forEach((m) => { if (taken.has(m)) return; const dd = Math.hypot(m.x - lx, m.y - ly); if (dd < bd) { bd = dd; who = m; } });
        if (who) { taken.add(who); used++; ov.set(who, { x: lx, y: ly }); }
      }
    } else if (match.flight && match.flight.target) {
      const f = match.flight;
      ov.set(f.target, f.outcome === 'complete' ? { x: f.ex, y: f.ey } : { x: f.target.x, y: f.target.y });
    } else if (!match.flight) {
      match.teams.forEach((team) => {
        team.players.map((p) => ({ p, d: Math.hypot(p.x - match.ball.x, p.y - match.ball.y) }))
          .filter(({ p, d }) => p.group !== 'GK' || d < 14)
          .sort((a, b) => a.d - b.d).slice(0, 2)
          .forEach(({ p }) => ov.set(p, { x: match.ball.x, y: match.ball.y }));
      });
    }
    return ov;
  }
  // Who presses whom. Redrawn every three seconds, or when the ball changes hands.
  const PRESS_ROLES = ['ST', 'WF', 'AM', 'CM', 'DM'];
  function pressPlan(match, opp, att, carrier, press, ov) {
    const pl = match.plan;
    if (pl && pl.def === opp.id && pl.carrier === carrier && match.clock - pl.t < 3) return pl;
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
    return 9 + 11 * press + bonus + 5 * (FM.instrMods(player).closeDown + (match ? FM.rulesDelta(team, player, 'closeDown', match.ball, false) : 0));
  }
  // Pressing as the manager set it, adjusted for the seconds just after losing the ball:
  // a high counter-press instruction hunts it back at once, a low one drops into shape first.
  const PRESS_WINDOW = 6, COUNTER_WINDOW = 8;
  function pressingNow(match, team) {
    const ch = match.lastChange;
    let p = team.tactics.pressing;
    if (ch && ch.team !== team) {
      const since = match.clock - ch.t;
      if (since < PRESS_WINDOW) p += (team.tactics.counterPress - 0.5) * 1.2 * (1 - since / PRESS_WINDOW);
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
        if (ch.team !== team && since < PRESS_WINDOW) td = (1 - since / PRESS_WINDOW) * (0.25 + 0.45 * team.tactics.counterPress);
      }
      team.phaseCtx = { transAtt: ta, transDef: td };
    });
  }
  // How strongly the team is in a counter-attack, from 0 (not) to 1, in the seconds just after winning the ball.
  function counterNow(match, team) {
    const ch = match.lastChange;
    if (!ch || ch.team !== team) return 0;
    const since = match.clock - ch.t;
    if (since >= COUNTER_WINDOW) return 0;
    return team.tactics.counterAttack * (1 - since / COUNTER_WINDOW);
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

  function chooseAction(match, team, carrier) {
    const tac = team.tactics;
    const rng = match.rng;
    const role = carrier.roleId;
    const ownDepth0 = FM.toTeamSpace(team.attackDir, carrier.x, carrier.y).d;
    const counter = counterNow(match, team);
    // Which phase the ball is in decides which of the manager's instructions apply.
    const zone = ownDepth0 < 0.38 ? 'build' : ownDepth0 > 0.68 ? 'final' : 'mid';
    const mods = FM.instrMods(carrier);
    const directness = clamp((zone === 'build' ? tac.buildDirect : tac.directness) + 0.5 * counter + mods.passDirect - (mods.holdUp ? 0.2 : 0) + (carrier.group === 'GK' ? 0.4 * mods.distribution : 0), 0, 1);
    const baseRisk = zone === 'final' ? tac.finalRisk : tac.risk;
    let risk = clamp(baseRisk + (ROLE_RISK[role] || 0) + 0.25 * counter + mods.risk, 0, 1);
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
      const ty = clamp(t.y + t.vy * leadT, 1, W - 1);
      // The ball is played to where the receiver can meet it: a run is timed off the last defender, so the pass lands level with the line or
      // a step beyond it, not several metres behind a defence that is still goal-side.
      if (forward) { const lastX = lastDefenderX; if (lastX != null && (tx - lastX) * team.attackDir > (FM.BEHIND_LINE == null ? 3 : FM.BEHIND_LINE)) tx = lastX + team.attackDir * (FM.BEHIND_LINE == null ? 3 : FM.BEHIND_LINE); }
      const { lane, press } = laneInfo(match, team, carrier, tx, ty);
      let p = FM.passProb(carrier, d, lane, press);
      // Played in behind the last defender: the ball has to be weighted and the runner has to time it, so these are hard passes to complete.
      if ((tx - carrier.x) * team.attackDir > 6 && !other(match, team).players.some((o) => o.group !== 'GK' && (o.x - tx) * team.attackDir > 0)) p *= (FM.OVER_TOP == null ? 1 : FM.OVER_TOP);
      const prog = clamp((dGoal - Math.hypot(tx - goal.x, ty - goal.y)) / 25, -0.6, 1.2);
      const boxBonus = Math.hypot(tx - goal.x, ty - goal.y) < 19 && Math.abs(ty - W / 2) < 18 ? 0.45 * (0.5 + risk) : 0;
      const score = p * (0.35 + directness * 0.9 * prog + 0.5 * prog * risk + boxBonus) - (1 - p) * 0.6 * (1 - risk) * lossFactor;
      // The chance it creates. A pass that puts a team-mate somewhere he is clearly likelier to score from than the man on the ball is the
      // pass a player looks for: it counts for what the receiver could do with it, whoever he is.
      let chance = 0;
      if (t.group !== 'GK' && Math.hypot(tx - goal.x, ty - goal.y) < 32) {
        const rx = sig(FM.xgLogit(t, tx, ty, team.attackDir, press));
        const cx = sig(FM.xgLogit(carrier, carrier.x, carrier.y, team.attackDir, nearNow));
        chance = (FM.CHANCE_BONUS == null ? 2.5 : FM.CHANCE_BONUS) * p * Math.max(0, rx - cx);
      }
      const off = match.noOffside ? 'on' : offsideStatus(match, team, carrier, t.x);
      // A player through on goal does not turn and play it back, and near the opposition box a pass backwards is a last resort
      // (when he is being closed down hard) rather than the usual choice.
      const back = (carrier.x - t.x) * team.attackDir;
      let adj = 0;
      // The free man. A teammate with no defender near him is the pass a real player looks for, so an open receiver (nearest defender
      // well away) is favoured, more so for a pass that goes forward or across than one that goes back; a marked one is not.
      adj += (FM.OPEN_BONUS == null ? 0.5 : FM.OPEN_BONUS) * clamp((press - 3) / 9, 0, 1) * (back < -3 ? 1 : back < 3 ? 0.7 : 0.3);
      if (through && back > 3) adj = -2.0;
      else if (through && back > -3) adj = -(FM.SQUARE_PEN == null ? 1.4 : FM.SQUARE_PEN);   // past the last defender he goes on, he does not square it
      else if (ownDepth0 > 0.66 && back > 8) adj = (nearNow < 2.5 ? 0.45 : 1) * -(FM.BACK_PEN == null ? 0 : FM.BACK_PEN);
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
      options.push({ kind: 'pass', target: t, tx, ty, d, lane, press, p, score: off === 'off' ? -4 : score + adj + chance });
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
    const dp = FM.dribbleProb(carrier, nearBehind ? nearD * 2.4 : nearD, nearOpp) * (ownDepth0 > 0.66 ? (FM.DRIB_FINAL == null ? 1 : FM.DRIB_FINAL) : 1);
    const dribbleBias = (GROUP_DRIBBLE[carrier.group] || 0) + (ROLE_DRIBBLE[role] || 0);
    options.push({ kind: 'dribble', p: dp, nearOpp, nearD, behind: nearBehind, score: dp * (0.3 + 0.9 * directness * 0.4 + (dribbleBias + mods.dribble + (tac.dribbleFreedom - 0.5) * 0.9 + (zone === 'final' && nearD > 3.5 ? 0.45 : 0) + (through ? (FM.THROUGH_DRIB == null ? 0.4 : FM.THROUGH_DRIB) : 0))) - (1 - dp) * 0.55 * (1 - risk) * lossFactor });

    if (RE) options[options.length - 1].score += 0.45 * RE.dribble;
    // In his own third with a defender close, taking the man on is the last thing a defender wants to do.
    if (zone === 'build' && nearD < 3.5) { const dr = options[options.length - 1]; dr.score -= 0.5 * (1 - nearD / 3.5) * (1 + (1 - risk)) * (['GK', 'CB', 'FB'].indexOf(carrier.group) >= 0 ? 2.4 : ['DM', 'CM'].indexOf(carrier.group) >= 0 ? 1.5 : 1) * (FM.DRIBBLE_BUILD_PEN == null ? 1 : FM.DRIBBLE_BUILD_PEN); }
    const attackingThird = FM.toTeamSpace(team.attackDir, carrier.x, carrier.y).d > 0.6;
    if (((dGoal < 28 && attackingThird) || (through && dGoal < 42)) && carrier.group !== 'GK') {
      const xg = sig(FM.xgLogit(carrier, carrier.x, carrier.y, team.attackDir, nearD) - 0.55 * crowd(match, team, carrier));
      options.push({ kind: 'shoot', xg, score: xg * 3.2 * (0.5 + risk * 0.9) * (0.4 + 1.2 * tac.shootFreedom) * mods.shoot - (1 - xg) * 0.12 - Math.max(0, 0.09 - xg) * 8 * (1.2 - tac.shootFreedom) * (['AM', 'WF', 'CM'].indexOf(carrier.group) >= 0 ? (FM.MID_LOWXG == null ? 0.2 : FM.MID_LOWXG) : 1) + 0.35 * clamp((nearD - 1.2) / 2.5, 0, 1) * clamp((28 - dGoal) / 14, 0, 1) + (through ? (FM.THROUGH_SHOOT == null ? 0.7 : FM.THROUGH_SHOOT) * clamp((42 - dGoal) / 22, 0, 1) : 0) + (FM.LONG_SHOT == null ? 3 : FM.LONG_SHOT) * (({ ST: 0.5, WF: 1, AM: 1.4, CM: 1.2, DM: 0.5, FB: 0.4, CB: 0.2 })[carrier.group] || 0.5) * clamp((27 - dGoal) / 8, 0, 1) * clamp((nearD - 1.2) / 2.5, 0, 1) });
    }

    if (RE && RE.shoot) options.forEach((o) => { if (o.kind === 'shoot' && o.score > 0) o.score *= clamp(1 + 0.9 * RE.shoot, 0.1, 2); });

    // Softmax: the manager's settings favour an action, but nothing is certain.
    const temp = 0.22 + 0.25 * (1 - carrier.ratings.composure / 100);
    let pool = options;
    if (match.forcePass) { const only = options.filter((o) => o.kind === 'pass' && o.d < 40); if (only.length) pool = only; }
    if (carrier.group === 'GK' && nearNow < 6 && directness >= 0.45) { const longs = options.filter((o) => o.kind === 'pass' && o.d >= 26); if (longs.length) pool = longs; }
    if (FM.debugChoose) FM.debugChoose(carrier, options, pool, directness, risk, { through, ownDepth0, throughDef });
    const maxScore = Math.max.apply(null, pool.map((o) => o.score));
    const weights = pool.map((o) => Math.exp((o.score - maxScore) / temp));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rng() * total;
    for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }

  function delayBeforeNextDecision(match, team, carrier) {
    // Out of the final third a player is quick: about a second and a half in space, under a second with a defender on him. Near goal the old, slower
    // pace stays: every extra decision there is a chance to shoot, and the number of chances in a match is what the game is balanced on.
    const quick = FM.toTeamSpace(team.attackDir, carrier.x, carrier.y).d < 0.66;
    const tempoK = clamp(team.tactics.tempo + 0.4 * counterNow(match, team), 0, 1);
    const base = quick ? (FM.HOLD_BASE == null ? 2.1 : FM.HOLD_BASE) - 0.9 * tempoK : 3.9 - 1.5 * tempoK;
    const { d } = nearestOpponent(match, team, carrier);
    const pressureFactor = quick ? (d < 3 ? 0.5 : d < 6 ? 0.68 : d < 10 ? 0.85 : 1) : (d < 3 ? 0.55 : d < 6 ? 0.8 : 1);
    let tempoD = 0, hold = false;
    if (team.rules && team.rules.length) { const f = FM.rulesFold(FM.rulesActive(team, carrier, FM.rulesCtx(team, match.ball, true, d < 4))); tempoD = f.tempo; hold = f.holdUp; }
    const clear = clearThrough(match, team, carrier) ? 0.3 : 1;   // one on one with the keeper there is no time to think
    return (base * clear * (1 - 0.35 * tempoD) * pressureFactor + (FM.instrMods(carrier).holdUp || hold ? 0.9 : 0)) * (0.8 + 0.4 * match.rng()) + (quick ? 0 : 0.18);
  }

  // ---------- performing an action ----------
  function doPass(match, team, carrier, opt) {
    const rng = match.rng;
    const st = statsOf(match, team);
    st.passes++;
    const ok = rng() < opt.p;
    const speed = clamp(13 + opt.d * 0.55, 15, 29);
    const flight = { kind: 'pass', team, passer: carrier, speed, target: null, ex: opt.tx, ey: opt.ty, outcome: 'complete' };
    if (ok) {
      flight.target = opt.target;
      const os = match.noOffside ? 'on' : offsideStatus(match, team, carrier, opt.target.x);
      if (os === 'off' || (os === 'marginal' && rng() < 0.1 + 0.3 * other(match, team).tactics.offsideTrap)) flight.outcome = 'offside';
      else st.passesOk++;
    } else {
      // Failed: usually cut out by the defender nearest the lane, otherwise it runs loose.
      const opp = other(match, team);
      let best = null, bd = 99;
      opp.players.forEach((o) => { const s = segInfo(o.x, o.y, carrier.x, carrier.y, opt.tx, opt.ty); if (s.t > 0.05 && s.d < bd) { bd = s.d; best = o; } });
      if (best && bd < 6 && rng() < 0.75) { flight.outcome = 'intercepted'; flight.target = best; flight.interceptor = best; }
      else {
        flight.outcome = 'loose';
        const spread = (2 + opt.d * 0.12) * (rng() < 0.45 ? 3 : 1);
        flight.ex = clamp(opt.tx + (rng() - 0.5) * 2 * spread, -4, L + 4);
        flight.ey = clamp(opt.ty + (rng() - 0.5) * 2 * spread, -4, W + 4);
        const gx0 = team.attackDir === 1 ? L : 0;
        if (Math.hypot(opt.tx - gx0, opt.ty - W / 2) < 24 && rng() < 0.85) { flight.ex = clamp(flight.ex, 2, L - 2); flight.ey = clamp(flight.ey, 2, W - 2); }
      }
    }
    record(match, { type: 'pass', team: team.id, from: carrier.number, to: opt.target.number, by: flight.interceptor ? flight.interceptor.number : undefined, p: opt.p, ok, outcome: flight.outcome, dist: opt.d, lane: opt.lane, press: opt.press, x: carrier.x, y: carrier.y, tx: flight.ex, ty: flight.ey });
    match.carrier = null; match.carry = null;
    match.flight = flight;
    match.ball.state = 'flight';
  }

  function doDribble(match, team, carrier, opt) {
    const oppGK = other(match, team).players.find((p) => p.group === 'GK');
    if (oppGK && dist(oppGK, carrier) < 7 && inBox(team.attackDir, carrier.x, carrier.y) && match.rng() < 0.08) {
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
    st.dribblesWon++;
    record(match, { type: 'dribble', team: team.id, player: carrier.number, p: opt.p, ok: true, defDist: opt.nearD, x: carrier.x, y: carrier.y });
    const goalY = W / 2;
    const gx = team.attackDir === 1 ? L : 0;
    const dx = gx - carrier.x, dy = (goalY - carrier.y) * 0.3;
    const len = Math.hypot(dx, dy) || 1;
    match.carry = { player: carrier, until: match.clock + 1.1, dx: dx / len, dy: dy / len };
    match.nextDecision = match.clock + delayBeforeNextDecision(match, team, carrier);
  }

  function doShot(match, team, carrier, opt) {
    const rng = match.rng;
    const st = statsOf(match, team);
    const opp = other(match, team);
    const gk = opp.players.find((p) => p.group === 'GK');
    const goalX = team.attackDir === 1 ? L : 0;
    const aimY = W / 2 + (rng() - 0.5) * 6.5;
    const shooter = opt.rating != null ? { ratings: { finishing: opt.rating } } : carrier;
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
    const xgAdj = sig(FM.xgLogit(shooter, carrier.x, carrier.y, team.attackDir, nearD) - 0.55 * crowd(match, team, carrier) - 0.03 * ((gk ? gk.ratings.gk : 60) - 60));
    const shotXg = (1 - pBlock) * xgAdj;
    st.xg += shotXg;
    let outcome;
    if (blocker && rng() < pBlock) outcome = 'blocked';
    else {
      const pOn = sig(0.15 + 0.03 * (shooter.ratings.finishing - 60) - 0.6 * Math.exp(-nearD / 2));
      if (rng() > pOn) outcome = 'off';
      else {
        st.onTarget++;
        outcome = rng() < clamp(xgAdj / pOn, 0.02, 0.97) ? 'goal' : 'saved';
      }
    }
    let ex = goalX, ey = aimY;
    if (outcome === 'off') { ex = goalX; ey = W / 2 + (rng() < 0.5 ? -1 : 1) * (4.5 + rng() * 4); }
    if (outcome === 'blocked') { const s = segInfo(blocker.x, blocker.y, carrier.x, carrier.y, goalX, aimY); ex = s.cx; ey = s.cy; }
    if (outcome === 'saved') { ex = goalX + (team.attackDir === 1 ? -0.5 : 0.5); ey = gk.y; }
    if (match.rec) noteShotForClips(match, team, carrier, shotXg);
    if (match.rec && outcome !== 'goal' && shotXg >= 0.1) clipChance(match, team, carrier, shotXg);
    record(match, { type: 'shot', team: team.id, player: carrier.number, xg: shotXg, outcome, defDist: nearD, x: carrier.x, y: carrier.y, setPiece: opt.header ? 'header' : undefined });
    match.carrier = null; match.carry = null;
    match.flight = { kind: 'shot', team, shooter: carrier, speed: 28, target: null, ex, ey: clamp(ey, 0.5, W - 0.5), outcome, gk, blocker };
    match.ball.state = 'flight';
  }

  // ---------- offsides ----------
  // 'off' if the receiver (at the point the pass is aimed) is beyond the second-last defender, the ball and the halfway line.
  // 'marginal' if he is within the trap's reach: a high offside-trap instruction catches some who were just onside.
  function offsideStatus(match, team, passer, tx) {
    const opp = other(match, team), dir = team.attackDir;
    const xs = opp.players.map((o) => o.x * dir).sort((a, b) => b - a);
    const line = xs.length > 1 ? xs[1] : xs[0];
    const recv = tx * dir, ball = passer.x * dir, mid = dir * L / 2;
    if (recv <= ball || recv <= mid) return 'on';
    if (recv > line) return 'off';
    if (recv > line - 1.25) return 'marginal';
    return 'on';
  }

  // The line each team's attackers must not pass (second-last opposing defender), kept just onside.
  function setOffsideLines(match) {
    match.teams.forEach((team) => {
      const opp = other(match, team), dir = team.attackDir;
      const xs = opp.players.map((o) => o.x * dir).sort((a, b) => b - a);
      const line = xs.length > 1 ? xs[1] : xs[0];
      team.offsideLine = Math.max(line - 1.5, dir * L / 2) * dir;
    });
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
    const pRed = 0.002 + 0.006 * aggr + (dangerous ? 0.006 : 0) + (denial ? 0.3 : 0);
    const pYellow = (0.04 + 0.18 * aggr + (dangerous ? 0.08 : 0) + (denial ? 0.4 : 0)) * (fouler.yellows ? 0.6 : 1);
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
      !(style === 'shoot' && Math.hypot(goalX - x, W / 2 - y) <= 30 && !r.extra.indirect));
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
      if (t.fkStyle === 'shoot' && dg <= 30 && !r.extra.indirect) { takeFreeKickShot(match, team, taker, dg); return; }
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
    const p = sig(-2.4 + 0.03 * (taker.ratings.finishing - 60) + 0.02 * (taker.ratings.passing - 60) - 0.12 * (dg - 20) - 0.02 * ((gk ? gk.ratings.gk : 60) - 60));
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
    const p = sig(1.25 + 0.03 * (taker.ratings.finishing - 60) + 0.015 * (taker.ratings.composure - 60) - 0.03 * ((gk ? gk.ratings.gk : 60) - 60));
    st.shots++; st.xg += 0.78;
    let outcome;
    if (rng() < p) { outcome = 'goal'; st.onTarget++; }
    else if (rng() < 0.55) { outcome = 'saved'; st.onTarget++; } else outcome = 'off';
    const ey = outcome === 'off' ? W / 2 + (rng() < 0.5 ? -1 : 1) * 4.5 : W / 2 + (rng() - 0.5) * 6;
    record(match, { type: 'shot', team: team.id, player: taker.number, xg: 0.78, outcome, defDist: 11, x: taker.x, y: taker.y, setPiece: 'penalty' });
    match.flight = { kind: 'shot', team, shooter: taker, speed: 28, target: null, ex: goalX, ey, outcome, gk, blocker: null };
    match.ball.state = 'flight';
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
    p.injury = { until: (match.day || 0) + inj.days, name: inj.name, matches: inj.matches };
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
        const push = clamp(0.35 - diff * 0.35, 0, 1) * urgency;
        add('tempo', 0.25 * push); add('risk', 0.3 * push); add('directness', 0.25 * push); add('buildDirect', 0.2 * push);
        add('shootFreedom', 0.25 * push); add('pressing', 0.2 * push); add('lineHeight', 0.15 * push); add('counterPress', 0.15 * push);
        add('cornerAttackers', 2 * push);
      } else if (diff > 0 && minute > 55) {
        const protect = clamp(diff * 0.5, 0, 1) * urgency;
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
  FM.stepMatch = function (match, dt) {
    if (match.phase === 'halftime' || match.phase === 'fulltime') return;
    if (match.injuryPause) return;

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
    fitnessTick(match, dt);

    updateBall(match, dt);

    const c = match.carrier;
    if (c) {
      const team = c.team, opp = other(match, team);
      // Tackles from defenders who are close enough.
      for (const d of opp.players) {
        if (d.group === 'GK') continue;
        if (dist(d, c.player) > 1.8) continue;
        if (!FM.TACKLE_ANY && (d.x - c.player.x) * team.attackDir < -0.6 && c.player.vx * team.attackDir > 1.5) continue;   // beaten: a defender chasing a man who is running on cannot tackle him from behind
        const rate = (0.05 + 0.08 * opp.tactics.pressing + (d.roleId === 'ball_winning_midfielder' ? 0.06 : 0)) * (0.6 + 0.8 * opp.tactics.tackleAggression) * ((FM.CLOSE_TACKLE == null ? 1 : FM.CLOSE_TACKLE) > 1 && dist(c.player, { x: opp.attackDir === 1 ? 0 : L, y: W / 2 }) < 24 ? (FM.CLOSE_TACKLE == null ? 1 : FM.CLOSE_TACKLE) : 1) * (1 + 0.35 * (FM.instrMods(d).tackle + FM.rulesDelta(opp, d, 'tackle', match.ball, false)));
        if (match.clock >= (match.tackleLock || 0) && match.rng() < rate * dt) {
          match.tackleLock = match.clock + 1.2;
          const p = FM.tackleProb(d, c.player);
          const ok = match.rng() < p;
          const st = statsOf(match, opp);
          st.tackles++;
          if (ok) st.tacklesWon++;
          record(match, { type: 'tackle', team: opp.id, player: d.number, vs: c.player.number, p, ok, x: c.player.x, y: c.player.y });
          if (ok && (c.player.y < 5 || c.player.y > W - 5) && match.rng() < 0.2) { startRestart(match, 'throw', team, clamp(c.player.x, 1, L - 1), c.player.y < W / 2 ? 0.5 : W - 0.5); break; }
          if (ok) { giveBall(match, opp, d, 0.9 + delayBeforeNextDecision(match, opp, d) * 0.4); break; }
          if (match.rng() < 0.06 + 0.1 * opp.tactics.tackleAggression + 0.002 * (60 - d.ratings.tackling) + 0.04 * FM.instrMods(d).tackle) { commitFoul(match, d, c.player, opp, team); break; }
        }
      }
    }
    // A player with the ball sees a defender coming and plays before he arrives, as in a real match, instead of waiting to be closed down.
    if (match.carrier && !match.carry && match.nextDecision - match.clock > 0.4 && match.nextDecision - match.clock < 9 && FM.toTeamSpace(match.carrier.team.attackDir, match.carrier.player.x, match.carrier.player.y).d < 0.66) {
      const nd = nearestOpponent(match, match.carrier.team, match.carrier.player).d;
      if (nd < (FM.RELEASE_AT == null ? 9 : FM.RELEASE_AT)) match.nextDecision = match.clock + 0.2 + 0.25 * match.rng();
    }
    if (match.carrier && match.clock >= match.nextDecision) {
      const { team, player } = match.carrier;
      const opt = chooseAction(match, team, player);
      if (opt.kind === 'pass') doPass(match, team, player, opt);
      else if (opt.kind === 'shoot') doShot(match, team, player, opt);
      else doDribble(match, team, player, opt);
      match.forcePass = false; match.noOffside = false;
    }

    checkEnd(match);
  };
  function checkEnd(match) {
    if (match.clock >= HALF_SECONDS && match.phase === 'play' && !match.firstHalfDone) { match.firstHalfDone = true; match.phase = 'halftime'; }
    if (match.clock >= FULL_SECONDS) { match.phase = 'fulltime'; }
  }

  FM.startSecondHalf = function (match) {
    if (match.phase !== 'halftime') return;
    match.teams.forEach((t) => t.players.forEach((p) => { p.energy = Math.min(1, (p.energy == null ? 1 : p.energy) + 0.08); FM.applyFatigue(p); }));
    FM.beginKickoff(match, match.away);
  };

  function syncBall(match) {
    if (match.carrier && match.ball.state === 'carried') {
      const p = match.carrier.player;
      match.ball.x = p.x + match.carrier.team.attackDir * 0.7; match.ball.y = p.y;
    }
  }

  function updateBall(match, dt) {
    const ball = match.ball;
    if (match.carrier) { syncBall(match); return; }
    const f = match.flight;
    if (f) {
      const tx = f.target ? f.target.x + f.target.vx * 0.15 : f.ex;
      const ty = f.target ? f.target.y + f.target.vy * 0.15 : f.ey;
      const dx = tx - ball.x, dy = ty - ball.y;
      const d = Math.hypot(dx, dy);
      const move = f.speed * dt;
      if (d <= move + 0.4) { ball.x = tx; ball.y = ty; arrive(match, f); }
      else { ball.x += dx / d * move; ball.y += dy / d * move; }
      return;
    }
    // Loose ball: whoever gets to it first controls it.
    let best = null, bd = 1.5;
    match.teams.forEach((t) => t.players.forEach((p) => { const d = Math.hypot(p.x - ball.x, p.y - ball.y); if (d < bd) { bd = d; best = { team: t, player: p }; } }));
    if (best) giveBall(match, best.team, best.player, 0.5);
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
      else if (f.outcome === 'intercepted' && match.rng() < 0.15) startRestart(match, 'throw', f.team, clamp(match.ball.x, 1, L - 1), match.ball.y < W / 2 ? 0.5 : W - 0.5);
      else if (f.outcome === 'intercepted') giveBall(match, other(match, f.team), f.interceptor, 0.4 + delayBeforeNextDecision(match, other(match, f.team), f.interceptor) * 0.5);
      else if (match.ball.x < 1 || match.ball.x > L - 1 || match.ball.y < 1 || match.ball.y > W - 1) handleOut(match, f.team, match.ball.x < 1 ? Math.min(match.ball.x, -0.1) : match.ball.x > L - 1 ? Math.max(match.ball.x, L + 0.1) : match.ball.x, match.ball.y < 1 ? Math.min(match.ball.y, -0.1) : match.ball.y > W - 1 ? Math.max(match.ball.y, W + 0.1) : match.ball.y);
      else { match.ball.state = 'loose'; match.lastTeam = f.team; }
      return;
    }
    // Shot
    match.flight = null;
    const team = f.team, opp = other(match, team);
    if (f.outcome === 'goal') {
      const st = statsOf(match, team); st.goals++;
      match.score[team.id]++;
      record(match, { type: 'goal', team: team.id, player: f.shooter.number });
      const goalSpec = match.rec ? clipGoal(match, team, f.shooter) : null;
      if (goalSpec) { goalSpec.pre = snapTeams(match); goalSpec.ballAt = [match.ball.x, match.ball.y]; }
      FM.beginKickoff(match, opp);
      if (goalSpec) goalSpec.tail = goalTail(match, goalSpec, team, f.shooter);
    } else if (f.outcome === 'saved') {
      if (match.rng() < 0.45) startRestart(match, 'corner', team, team.attackDir === 1 ? L - 0.5 : 0.5, f.ey < W / 2 ? 0.5 : W - 0.5);
      else giveBall(match, opp, f.gk, 1.6);
    } else if (f.outcome === 'blocked') {
      if (match.rng() < 0.45) startRestart(match, 'corner', team, team.attackDir === 1 ? L - 0.5 : 0.5, f.ey < W / 2 ? 0.5 : W - 0.5);
      else { match.ball.state = 'loose'; match.lastTeam = opp; }
    } else {
      // Off target: goal kick.
      startRestart(match, 'goalkick', opp, opp.attackDir === 1 ? 5.5 : L - 5.5, W / 2);
    }
  }

  FM.formatClock = function (seconds) {
    const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  };
})();
