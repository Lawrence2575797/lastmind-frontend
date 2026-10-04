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
    return -5.5 + 7.6 * FM.shotAngle(x, y, attackDir) + 0.03 * (shooter.ratings.finishing - 60) - 0.9 * Math.exp(-defDist / 2);
  };

  // ---------- roles' tendencies when on the ball ----------
  const GROUP_DRIBBLE = { GK: -1.2, CB: -0.3, FB: 0, DM: -0.1, CM: 0, AM: 0.1, WF: 0.25, ST: 0.05 };
  const ROLE_DRIBBLE = { winger: 0.15, inverted_winger: 0.25, inside_forward: 0.2, advanced_playmaker: 0.05, box_to_box: 0.1, wing_back: 0.1 };
  const ROLE_RISK = { advanced_playmaker: 0.2, deep_lying_playmaker: 0.15, number_10: 0.2, sweeper_keeper: 0.1, libero: 0.1, anchor: -0.2, defensive_full_back: -0.15, centre_half: -0.1, goalkeeper: -0.1 };

  // ---------- match ----------
  FM.createMatch = function (home, away, seed) {
    const match = {
      home, away, teams: [home, away],
      rng: FM.mulberry32(seed || 1),
      seed: seed || 1,
      clock: 0, phase: 'kickoff', kickoffTimer: KICKOFF_PAUSE, kickoffTeam: home,
      score: { home: 0, away: 0 },
      ball: { x: L / 2, y: W / 2, state: 'carried' },
      carrier: null, flight: null, carry: null, lastTeam: home,
      events: [],
      stats: { home: blankStats(), away: blankStats() },
    };
    FM.beginKickoff(match, home);
    return match;
  };
  function blankStats() {
    return { passes: 0, passesOk: 0, shots: 0, onTarget: 0, goals: 0, tackles: 0, tacklesWon: 0, dribbles: 0, dribblesWon: 0, possession: 0, xg: 0 };
  }
  const other = (match, team) => (team === match.home ? match.away : match.home);
  const statsOf = (match, team) => match.stats[team.id];

  function record(match, ev) {
    ev.t = match.clock;
    match.events.push(ev);
    if (match.events.length > 3000) match.events.shift();
  }

  FM.beginKickoff = function (match, team) {
    match.teams.forEach((t) => FM.resetToKickoff(t));
    match.phase = 'kickoff';
    match.kickoffTimer = KICKOFF_PAUSE;
    match.kickoffTeam = team;
    match.flight = null; match.carry = null;
    match.ball.x = L / 2; match.ball.y = W / 2; match.ball.state = 'carried';
    // The kicking side's most advanced player takes the kick-off.
    const players = team.players.filter((p) => p.group !== 'GK');
    players.sort((a, b) => (team.attackDir === 1 ? b.x - a.x : a.x - b.x));
    const taker = players[0];
    taker.x = L / 2 - team.attackDir * 0.8; taker.y = W / 2;
    giveBall(match, team, taker, 1.2);
  };

  function giveBall(match, team, player, delay) {
    match.carrier = { team, player };
    match.flight = null;
    match.lastTeam = team;
    match.ball.state = 'carried';
    match.nextDecision = match.clock + delay;
    match.carry = null;
  }

  function possessionTeam(match) {
    if (match.carrier) return match.carrier.team;
    if (match.flight) return match.flight.team;
    return match.lastTeam;
  }

  // ---------- target overrides: carrying, pressing, chasing the ball ----------
  function buildOverrides(match) {
    const ov = new Map();
    const c = match.carrier;
    if (c) {
      const opp = other(match, c.team);
      if (match.carry && match.carry.player === c.player && match.clock < match.carry.until) {
        ov.set(c.player, { x: clamp(c.player.x + match.carry.dx * 9, 1, L - 1), y: clamp(c.player.y + match.carry.dy * 9, 1, W - 1) });
      }
      // Defenders press the carrier: how many, and from how far, is the team's pressing instruction.
      const press = opp.tactics.pressing;
      const n = 1 + Math.round(2 * press);
      const ranked = opp.players.filter((p) => p.group !== 'GK').map((p) => ({ p, d: dist(p, c.player) })).sort((a, b) => a.d - b.d);
      ranked.slice(0, n).forEach(({ p, d }) => {
        if (d < pressTrigger(opp, p)) ov.set(p, { x: c.player.x + c.player.vx * 0.4, y: c.player.y + c.player.vy * 0.4 });
      });
    } else if (match.flight && match.flight.target) {
      ov.set(match.flight.target, { x: match.flight.target.x, y: match.flight.target.y });
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
  function pressTrigger(team, player) {
    const role = player.roleId;
    const bonus = role === 'pressing_forward' ? 10 : role === 'ball_winning_midfielder' ? 8 : 0;
    return 12 + 20 * team.tactics.pressing + bonus;
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
    const risk = clamp(tac.risk + (ROLE_RISK[role] || 0), 0, 1);
    const goal = { x: team.attackDir === 1 ? L : 0, y: W / 2 };
    const dGoal = dist(carrier, goal);
    const ownDepth = FM.toTeamSpace(team.attackDir, carrier.x, carrier.y).d;
    const lossFactor = 1 + 1.3 * (1 - ownDepth); // losing the ball deep in your own half costs more
    const options = [];

    team.players.forEach((t) => {
      if (t === carrier) return;
      const d = dist(carrier, t);
      if (d < 4 || d > 60) return;
      const leadT = d / clamp(10 + d * 0.5, 12, 26);
      const tx = clamp(t.x + t.vx * leadT, 1, L - 1), ty = clamp(t.y + t.vy * leadT, 1, W - 1);
      const { lane, press } = laneInfo(match, team, carrier, tx, ty);
      const p = FM.passProb(carrier, d, lane, press);
      const prog = clamp((dGoal - Math.hypot(tx - goal.x, ty - goal.y)) / 25, -0.6, 1.2);
      const score = p * (0.35 + tac.directness * 1.4 * prog + 0.5 * prog * risk) - (1 - p) * 0.6 * (1 - risk) * lossFactor;
      options.push({ kind: 'pass', target: t, tx, ty, d, lane, press, p, score });
    });

    const { opp: nearOpp, d: nearD } = nearestOpponent(match, team, carrier);
    const dp = FM.dribbleProb(carrier, nearD, nearOpp);
    const dribbleBias = (GROUP_DRIBBLE[carrier.group] || 0) + (ROLE_DRIBBLE[role] || 0);
    options.push({ kind: 'dribble', p: dp, nearOpp, nearD, score: dp * (0.3 + 0.9 * tac.directness * 0.4 + dribbleBias) - (1 - dp) * 0.55 * (1 - risk) * lossFactor });

    const attackingThird = FM.toTeamSpace(team.attackDir, carrier.x, carrier.y).d > 0.6;
    if (dGoal < 32 && attackingThird && carrier.group !== 'GK') {
      const xg = sig(FM.xgLogit(carrier, carrier.x, carrier.y, team.attackDir, nearD) - 0.5 * crowd(match, team, carrier));
      options.push({ kind: 'shoot', xg, score: xg * 0.55 * (0.5 + risk * 0.9) - (1 - xg) * 0.12 });
    }

    // Softmax: the manager's settings favour an action, but nothing is certain.
    const temp = 0.22 + 0.25 * (1 - carrier.ratings.composure / 100);
    const maxScore = Math.max.apply(null, options.map((o) => o.score));
    const weights = options.map((o) => Math.exp((o.score - maxScore) / temp));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rng() * total;
    for (let i = 0; i < options.length; i++) { r -= weights[i]; if (r <= 0) return options[i]; }
    return options[options.length - 1];
  }

  function delayBeforeNextDecision(match, team, carrier) {
    const base = 4.2 - 2.6 * team.tactics.tempo;
    const { d } = nearestOpponent(match, team, carrier);
    const pressureFactor = d < 3 ? 0.55 : d < 6 ? 0.8 : 1;
    return base * pressureFactor * (0.8 + 0.4 * match.rng());
  }

  // ---------- performing an action ----------
  function doPass(match, team, carrier, opt) {
    const rng = match.rng;
    const st = statsOf(match, team);
    st.passes++;
    const ok = rng() < opt.p;
    const speed = clamp(10 + opt.d * 0.5, 12, 26);
    const flight = { kind: 'pass', team, passer: carrier, speed, target: null, ex: opt.tx, ey: opt.ty, outcome: 'complete' };
    if (ok) {
      flight.target = opt.target;
      st.passesOk++;
    } else {
      // Failed: usually cut out by the defender nearest the lane, otherwise it runs loose.
      const opp = other(match, team);
      let best = null, bd = 99;
      opp.players.forEach((o) => { const s = segInfo(o.x, o.y, carrier.x, carrier.y, opt.tx, opt.ty); if (s.t > 0.05 && s.d < bd) { bd = s.d; best = o; } });
      if (best && bd < 6 && rng() < 0.75) { flight.outcome = 'intercepted'; flight.target = best; flight.interceptor = best; }
      else {
        flight.outcome = 'loose';
        const spread = 2 + opt.d * 0.12;
        flight.ex = clamp(opt.tx + (rng() - 0.5) * 2 * spread, 1, L - 1);
        flight.ey = clamp(opt.ty + (rng() - 0.5) * 2 * spread, 1, W - 1);
      }
    }
    record(match, { type: 'pass', team: team.id, from: carrier.number, to: opt.target.number, p: opt.p, ok, outcome: flight.outcome, dist: opt.d, lane: opt.lane, press: opt.press, x: carrier.x, y: carrier.y });
    match.carrier = null; match.carry = null;
    match.flight = flight;
    match.ball.state = 'flight';
  }

  function doDribble(match, team, carrier, opt) {
    const st = statsOf(match, team);
    st.dribbles++;
    const ok = match.rng() < opt.p;
    if (!ok && opt.nearOpp && opt.nearD < 4) {
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
    st.shots++;
    st.xg += opt.xg;

    // Blocked by a defender standing on the shooting line?
    let blocker = null, bd = 99;
    opp.players.forEach((o) => {
      if (o === gk) return;
      const s = segInfo(o.x, o.y, carrier.x, carrier.y, goalX, aimY);
      if (s.t > 0.05 && s.t < 0.95 && s.d < bd) { bd = s.d; blocker = o; }
    });
    const nearD = nearestOpponent(match, team, carrier).d;
    let outcome;
    if (blocker && rng() < 0.8 * Math.exp(-bd / 1.5)) outcome = 'blocked';
    else {
      const pOn = sig(0.15 + 0.03 * (carrier.ratings.finishing - 60) - 0.6 * Math.exp(-nearD / 2));
      if (rng() > pOn) outcome = 'off';
      else {
        st.onTarget++;
        const xgAdj = sig(FM.xgLogit(carrier, carrier.x, carrier.y, team.attackDir, nearD) - 0.5 * crowd(match, team, carrier) - 0.03 * ((gk ? gk.ratings.gk : 60) - 60));
        outcome = rng() < clamp(xgAdj / pOn, 0.02, 0.9) ? 'goal' : 'saved';
      }
    }
    let ex = goalX, ey = aimY;
    if (outcome === 'off') { ex = goalX; ey = W / 2 + (rng() < 0.5 ? -1 : 1) * (4.5 + rng() * 4); }
    if (outcome === 'blocked') { const s = segInfo(blocker.x, blocker.y, carrier.x, carrier.y, goalX, aimY); ex = s.cx; ey = s.cy; }
    if (outcome === 'saved') { ex = goalX + (team.attackDir === 1 ? -0.5 : 0.5); ey = gk.y; }
    record(match, { type: 'shot', team: team.id, player: carrier.number, xg: opt.xg, outcome, defDist: nearD, x: carrier.x, y: carrier.y });
    match.carrier = null; match.carry = null;
    match.flight = { kind: 'shot', team, shooter: carrier, speed: 28, target: null, ex, ey: clamp(ey, 0.5, W - 0.5), outcome, gk, blocker };
    match.ball.state = 'flight';
  }

  // ---------- one simulation step ----------
  FM.stepMatch = function (match, dt) {
    if (match.phase === 'halftime' || match.phase === 'fulltime') return;

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

    const ov = buildOverrides(match);
    match.teams.forEach((t) => FM.stepTeam(t, match.ball, t === poss, dt, ov));

    updateBall(match, dt);

    const c = match.carrier;
    if (c) {
      const team = c.team, opp = other(match, team);
      // Tackles from defenders who are close enough.
      for (const d of opp.players) {
        if (d.group === 'GK') continue;
        if (dist(d, c.player) > 1.8) continue;
        const rate = 0.05 + 0.12 * opp.tactics.pressing + (d.roleId === 'ball_winning_midfielder' ? 0.06 : 0);
        if (match.clock >= (match.tackleLock || 0) && match.rng() < rate * dt) {
          match.tackleLock = match.clock + 1.2;
          const p = FM.tackleProb(d, c.player);
          const ok = match.rng() < p;
          const st = statsOf(match, opp);
          st.tackles++;
          if (ok) st.tacklesWon++;
          record(match, { type: 'tackle', team: opp.id, player: d.number, vs: c.player.number, p, ok, x: c.player.x, y: c.player.y });
          if (ok) { giveBall(match, opp, d, 0.9 + delayBeforeNextDecision(match, opp, d) * 0.4); break; }
        }
      }
    }
    if (match.carrier && match.clock >= match.nextDecision) {
      const { team, player } = match.carrier;
      const opt = chooseAction(match, team, player);
      if (opt.kind === 'pass') doPass(match, team, player, opt);
      else if (opt.kind === 'shoot') doShot(match, team, player, opt);
      else doDribble(match, team, player, opt);
    }

    if (match.clock >= HALF_SECONDS && match.phase === 'play' && !match.firstHalfDone) { match.firstHalfDone = true; match.phase = 'halftime'; }
    if (match.clock >= FULL_SECONDS) { match.phase = 'fulltime'; }
  };

  FM.startSecondHalf = function (match) {
    if (match.phase !== 'halftime') return;
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
    if (f.kind === 'pass') {
      match.flight = null;
      if (f.outcome === 'complete') giveBall(match, f.team, f.target, 0.3 + delayBeforeNextDecision(match, f.team, f.target));
      else if (f.outcome === 'intercepted') giveBall(match, other(match, f.team), f.interceptor, 0.6 + delayBeforeNextDecision(match, other(match, f.team), f.interceptor) * 0.5);
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
      FM.beginKickoff(match, opp);
    } else if (f.outcome === 'saved') {
      giveBall(match, opp, f.gk, 1.6);
    } else if (f.outcome === 'blocked') {
      match.ball.state = 'loose'; match.lastTeam = opp;
    } else {
      // Off target: goal kick.
      giveBall(match, opp, f.gk, 2);
      f.gk.x = opp.attackDir === 1 ? 5 : L - 5; f.gk.y = W / 2;
    }
  }

  FM.formatClock = function (seconds) {
    const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  };
})();
