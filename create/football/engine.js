// Engine, step 1: where the 22 players stand and move.
// Pitch coordinates are metres: x along the length (0 to 105), y across the width (0 to 68).
// The formation, each player's role and the team's instructions decide a TARGET position for every
// player, and the player then runs toward it, limited by pace. Nothing else moves the players yet
// (no passing, tackling or shooting): those come in the next build step.
(function () {
  const FM = (window.FM = window.FM || {});
  const L = 105, W = 68;
  FM.PITCH = { L, W };

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Team space (d, w) <-> pitch metres. A team with attackDir = 1 attacks toward x = L.
  function toMetres(attackDir, d, w) {
    return attackDir === 1 ? { x: d * L, y: w * W } : { x: (1 - d) * L, y: (1 - w) * W };
  }
  function toTeamSpace(attackDir, x, y) {
    return attackDir === 1 ? { d: x / L, w: y / W } : { d: 1 - x / L, w: 1 - y / W };
  }
  FM.toMetres = toMetres;
  FM.toTeamSpace = toTeamSpace;

  // Instructions for each phase of play. All run from 0 to 1 unless noted.
  //   Build-up:            buildDirect (own third), directness (middle third), risk, tempo, attackWidth
  //   Final third:         finalRisk, shootFreedom, dribbleFreedom
  //   Transition to attack: counterAttack (how fast and direct the first moves after winning the ball are)
  //   Transition to defence: counterPress (win it back at once, versus drop back into shape)
  //   Without the ball:    pressing, lineHeight, defWidth
  FM.defaultTactics = function () {
    return {
      lineHeight: 0.5, defWidth: 1, attackWidth: 1, pressing: 0.5,
      buildDirect: 0.35, directness: 0.5, risk: 0.5, tempo: 0.5,
      finalRisk: 0.5, shootFreedom: 0.5, dribbleFreedom: 0.5, pressBuildUp: 0.4,
      counterAttack: 0.5, counterPress: 0.5,
      tackleAggression: 0.5, offsideTrap: 0.3,
      cornerDelivery: 'near', cornerAttackers: 4, cornerMarkers: 7, fkStyle: 'shoot',
      cornerTaker: null, fkTaker: null, penTaker: null,
    };
  };

  function freshOptions(roleId) {
    const role = FM.ROLES[roleId];
    const options = {};
    Object.keys(role.options || {}).forEach((k) => { options[k] = role.options[k].default != null ? role.options[k].default : false; });
    return options;
  }

  // A squad is 20 players: 11 start, 9 are on the bench (one of each kind of position, plus extra cover).
  const BENCH_GROUPS = ['GK', 'CB', 'CB', 'FB', 'DM', 'CM', 'AM', 'WF', 'ST'];

  function makePlayer(id, number, natural, rng, strength) {
    const ratings = FM.generateRatings(natural, rng, strength);
    return { id, number, natural, group: natural, index: -1, slotKey: null, roleId: null, options: {}, ratings, x: 0, y: 0, vx: 0, vy: 0, maxSpeed: FM.speedFromPace(ratings.pace) };
  }
  function putInSlot(player, formation, i) {
    const slot = formation.slots[i];
    player.index = i; player.slotKey = slot.key; player.group = slot.group;
    player.roleId = slot.defaultRole; player.options = freshOptions(slot.defaultRole);
    player.instr = FM.roleInstr ? FM.roleInstr(slot.defaultRole) : {};
  }

  FM.putInSlot = putInSlot;

  // Builds a team: a squad of 20, with 11 on the formation's slots (each with a default role) and 9 on the bench.
  FM.createTeam = function (spec) {
    const formation = FM.FORMATIONS[spec.formation];
    const team = {
      id: spec.id, name: spec.name, kit: spec.kit, attackDir: spec.attackDir,
      formationKey: spec.formation, tactics: FM.defaultTactics(), players: [], bench: [], squad: [],
      strength: spec.strength || 0, seed: spec.seed || FM.hashString(spec.id), subsUsed: 0, maxSubs: 5,
      shape: {}, phasePos: {},
    };
    const rng = FM.mulberry32(team.seed);
    formation.slots.forEach((slot, i) => {
      const p = makePlayer(team.id + '-' + slot.number, slot.number, slot.group, rng, team.strength);
      p.number = slot.number;
      putInSlot(p, formation, i);
      team.players.push(p); team.squad.push(p);
    });
    BENCH_GROUPS.forEach((g, i) => {
      const p = makePlayer(team.id + '-' + (12 + i), 12 + i, g, rng, team.strength - 3);
      team.bench.push(p); team.squad.push(p);
    });
    FM.resetToKickoff(team);
    return team;
  };

  // Top running speed in metres per second, from the pace rating.
  FM.speedFromPace = function (pace) { return 6 + (pace / 100) * 2.6; };

  // Changes formation. The same 11 players stay on; each goes to the slot that best fits his natural position.
  const GROUP_NEAR = { GK: ['GK'], CB: ['CB', 'DM', 'FB'], FB: ['FB', 'CB', 'WF', 'DM'], DM: ['DM', 'CM', 'CB'], CM: ['CM', 'DM', 'AM'], AM: ['AM', 'CM', 'WF', 'ST'], WF: ['WF', 'AM', 'FB', 'ST'], ST: ['ST', 'AM', 'WF'] };
  FM.GROUP_NEAR = GROUP_NEAR;
  FM.setFormation = function (team, formationKey) {
    const formation = FM.FORMATIONS[formationKey];
    team.formationKey = formationKey;
    team.shape = {}; team.phasePos = {}; // a new formation starts from its own preset positions
    const free = team.players.slice();
    const pairs = [];
    // Slots in order, each taking the free player whose natural position is nearest (a side with ten men fills the first ten).
    formation.slots.forEach((slot, i) => {
      if (!free.length) return;
      const prefs = GROUP_NEAR[slot.group] || [slot.group];
      let best = 0, bestRank = 99;
      free.forEach((p, k) => { const r = prefs.indexOf(p.natural); const rank = r < 0 ? 50 : r; if (rank < bestRank) { bestRank = rank; best = k; } });
      pairs.push([free.splice(best, 1)[0], i]);
    });
    team.players = pairs.map((x) => x[0]);
    pairs.forEach(([p, i]) => putInSlot(p, formation, i));
  };

  // Puts a bench player on in place of one on the pitch. In a match the sub counts toward the limit.
  // Returns an error string if it is not allowed.
  FM.substitute = function (team, outPlayer, inPlayer, match) {
    const k = team.players.indexOf(outPlayer);
    const bi = team.bench.indexOf(inPlayer);
    if (k < 0 || bi < 0) return 'Not a valid substitution.';
    if (FM.isInjured && FM.isInjured(inPlayer)) return inPlayer.name + ' is injured and cannot play.';
    const live = match && match.phase !== 'kickoff' || (match && match.clock > 0);
    if (live && team.subsUsed >= team.maxSubs) return 'No substitutions left.';
    inPlayer.x = outPlayer.x; inPlayer.y = outPlayer.y; inPlayer.vx = outPlayer.vx; inPlayer.vy = outPlayer.vy;
    inPlayer.index = outPlayer.index; inPlayer.slotKey = outPlayer.slotKey; inPlayer.group = outPlayer.group;
    // The new player takes over the role if it suits his slot, otherwise the slot's default role.
    inPlayer.roleId = outPlayer.roleId; inPlayer.options = Object.assign({}, outPlayer.options); inPlayer.instr = Object.assign({}, outPlayer.instr || {});
    team.players[k] = inPlayer;
    team.bench[bi] = outPlayer;
    outPlayer.index = -1; outPlayer.slotKey = null; outPlayer.group = outPlayer.natural;
    if (live) team.subsUsed++;
    if (match && match.injuryPause && match.injuryPause.player === outPlayer) match.injuryPause = null;
    if (match && match.carrier && match.carrier.player === outPlayer) match.carrier.player = inPlayer;
    if (match && match.restart && match.restart.taker === outPlayer) match.restart.taker = inPlayer;
    if (match && match.flight && match.flight.target === outPlayer) match.flight.target = inPlayer;
    if (match && live) match.events.push({ type: 'sub', t: match.clock, team: team.id, off: outPlayer.number, on: inPlayer.number });
    return null;
  };

  // Swaps two players already on the pitch (they trade slots and roles).
  FM.swapSlots = function (team, a, b) {
    const ia = a.index, ib = b.index;
    const ka = team.players.indexOf(a), kb = team.players.indexOf(b);
    const formation = FM.FORMATIONS[team.formationKey];
    team.players[ka] = b; team.players[kb] = a;
    putInSlot(a, formation, ib); putInSlot(b, formation, ia);
  };

  FM.setRole = function (team, player, roleId) {
    player.roleId = roleId;
    player.instr = FM.roleInstr ? FM.roleInstr(roleId) : {}; // a role brings its own usual instructions
    const role = FM.ROLES[roleId];
    player.options = {};
    Object.keys(role.options || {}).forEach((k) => { player.options[k] = role.options[k].default != null ? role.options[k].default : false; });
  };

  FM.resetToKickoff = function (team) {
    const formation = FM.FORMATIONS[team.formationKey];
    team.players.forEach((p) => {
      const slot = FM.slotBase(team, p);
      const pos = toMetres(team.attackDir, Math.min(slot.d, 0.47), slot.w);
      p.x = pos.x; p.y = pos.y; p.vx = 0; p.vy = 0;
    });
  };

  // ---------- positions in each phase of play ----------
  // Every player has a position (team space) in each phase. Unless the manager has dragged him somewhere, it follows
  // from where his slot is in the shape, his role and his instructions. The same role and instructions feed every phase,
  // so the phases agree with each other: an inverted full-back is inside in build-up AND in the final third.
  FM.PHASES = ['build', 'final', 'transAtt', 'transDef', 'press', 'without'];
  FM.PHASE_NAMES = { build: 'Build-up', final: 'Final third', transAtt: 'Transition to attack', transDef: 'Transition to defence', press: 'Pressing their build-up', without: 'Without the ball' };
  const PUSH = { GK: 0, CB: 0.04, FB: 0.10, DM: 0.08, CM: 0.12, AM: 0.14, WF: 0.14, ST: 0.12 };
  // How far each kind of player steps up from his defending position when the team is pressing the opposition's build-up.
  const PRESS_PUSH = { GK: 0.03, CB: 0.10, FB: 0.14, DM: 0.14, CM: 0.16, AM: 0.14, WF: 0.12, ST: 0.08 };

  // Where his slot stands in the team's shape (the formation's preset, or where the manager has dragged it).
  FM.slotBase = function (team, p) {
    const s = team.shape && team.shape[p.index];
    if (s) return s;
    const slot = FM.FORMATIONS[team.formationKey].slots[p.index];
    return { d: slot.d, w: slot.w };
  };

  FM.defaultPhasePos = function (team, p, phase) {
    const base = FM.slotBase(team, p), role = FM.ROLES[p.roleId], m = FM.instrMods(p);
    const inPos = phase === 'build' || phase === 'final' || phase === 'transAtt';
    const o = inPos ? role.inPoss : role.outPoss;
    let depth = o.depth, wTarget = o.wTarget;
    const width = o.width;
    // Settings on a role can replace its movement (for example where an inverted full-back inverts to).
    if (inPos && role.invertTargets) {
      const t = role.invertTargets[p.options.invertTo] || role.invertTargets[role.options.invertTo.default];
      depth = t.depth; wTarget = t.wTarget;
    }
    const k = phase === 'build' ? 0.6 : phase === 'transAtt' ? 0.8 : 1; // how much of the role's movement shows in this phase
    let d = base.d + depth * k, w = base.w;
    const centre = Math.abs(base.w - 0.5) < 0.01;
    if (wTarget != null) { const tw = base.w < 0.5 ? wTarget : 1 - wTarget; w = base.w + (tw - base.w) * k; }
    else if (width) w += (base.w < 0.5 ? -1 : 1) * width * k * (centre ? 0 : 1);
    const push = PUSH[p.group] || 0;
    if (phase === 'final') d += push; else if (phase === 'transAtt') d += push * 0.6; else if (phase === 'transDef') d -= 0.03; else if (phase === 'press') d += PRESS_PUSH[p.group] || 0;
    d += m.depth;
    // Team setting, the height of the defensive line: it moves the defaults of every phase (the back line most, the front line least),
    // and counts for more when the team does not have the ball. A position placed by hand is left where the manager put it.
    d += (team.tactics.lineHeight - 0.5) * 0.28 * (FM.GROUP_LINE_WEIGHT[p.group] || 0) * (inPos ? 0.6 : 1);
    if (!centre) w += (base.w < 0.5 ? -1 : 1) * m.width;
    return { d: clamp(d, 0.02, 0.97), w: clamp(w, 0.04, 0.96) };
  };
  FM.phasePos = function (team, p, phase) {
    const man = team.phasePos && team.phasePos[phase] && team.phasePos[phase][p.index];
    return man || FM.defaultPhasePos(team, p, phase);
  };
  FM.isManual = (team, p, phase) => !!(team.phasePos && team.phasePos[phase] && team.phasePos[phase][p.index]);

  // ---------- how far can he get between phases? ----------
  // About six seconds at top speed: a full-back can come inside, a winger cannot be on the left in build-up and the
  // right in the final third.
  FM.REACH_SECONDS = 6;
  FM.reachMetres = (p) => FM.REACH_SECONDS * p.maxSpeed;
  // Only sideways distance is limited. Running up and down the pitch is not a limit, it is a cost: a striker can drop deep to help
  // build, and the deeper he is the later he gets forward when play moves on, because every player moves at his own top speed.
  // (Switching sides is different: nobody gets from one touchline to the other in the time a phase lasts.)
  FM.DEPTH_WEIGHT = 0;
  FM.posDist = (a, b) => Math.hypot((a.d - b.d) * L * FM.DEPTH_WEIGHT, (a.w - b.w) * W);
  FM.trueDist = (a, b) => Math.hypot((a.d - b.d) * L, (a.w - b.w) * W);
  // Pulls a wished-for position back until he could reach it from where he stands in every other phase.
  FM.clampToReach = function (team, p, phase, pos) {
    const reach = FM.reachMetres(p);
    let cur = { d: pos.d, w: pos.w };
    for (let it = 0; it < 8; it++) {
      let moved = false;
      FM.PHASES.forEach((ph) => {
        if (ph === phase) return;
        const o = FM.phasePos(team, p, ph);
        const dist = FM.posDist(cur, o);
        if (dist > reach) { const f = reach / dist; cur = { d: o.d + (cur.d - o.d) * f, w: o.w + (cur.w - o.w) * f }; moved = true; }
      });
      if (!moved) break;
    }
    return { d: clamp(cur.d, 0.02, 0.98), w: clamp(cur.w, 0.03, 0.97) };
  };
  // ---------- the offside line ----------
  // With the ball, a player cannot stand beyond the opposition's second-last defender (the keeper is the last), and in the match the
  // team's targets are held there. In the editor the opposition's line is read from where their defenders stand when defending, which
  // depends on how high they have set their defensive line, so a high line lets your forwards stand higher and a deep one holds them back.
  FM.OFFSIDE_PHASES = ['build', 'final', 'transAtt'];
  FM.offsideLimit = function (opp, p) {
    const ds = opp.players.filter((q) => q.group !== 'GK').map((q) => FM.phasePos(opp, q, 'without').d);
    if (!ds.length) return 1;
    const line = 1 - Math.min.apply(null, ds); // their second-last defender, in this team's space
    const runs = p ? FM.instrMods(p).runs : 0; // a player told to run in behind stands a little beyond it, one told to hold the line a little short
    return Math.max(line - 1.5 / L + (runs > 0 ? 0.5 : runs < 0 ? -1.2 : 0) / L, 0.5);
  };
  FM.clampOffside = function (team, p, phase, pos, opp) {
    if (!opp || p.group === 'GK' || FM.OFFSIDE_PHASES.indexOf(phase) < 0) return pos;
    return { d: Math.min(pos.d, FM.offsideLimit(opp, p)), w: pos.w };
  };
  FM.setPhasePos = function (team, p, phase, pos) {
    team.phasePos[phase] = team.phasePos[phase] || {};
    team.phasePos[phase][p.index] = { d: pos.d, w: pos.w };
  };
  FM.setSlotBase = function (team, p, pos) {
    team.shape[p.index] = { d: clamp(pos.d, 0.02, 0.98), w: clamp(pos.w, 0.03, 0.97) };
    FM.fixSlot(team, p);
  };
  // After anything moves, any hand-placed position that is now out of reach is pulled back.
  FM.fixSlot = function (team, p, opp) {
    FM.PHASES.forEach((ph) => { if (FM.isManual(team, p, ph)) FM.setPhasePos(team, p, ph, FM.clampOffside(team, p, ph, FM.clampToReach(team, p, ph, FM.phasePos(team, p, ph)), opp)); });
  };
  FM.clearPhase = function (team, phase) { if (phase === 'shape') team.shape = {}; else if (team.phasePos) delete team.phasePos[phase]; };
  FM.clearPlayerPositions = function (team, p) {
    delete team.shape[p.index];
    FM.PHASES.forEach((ph) => { if (team.phasePos[ph]) delete team.phasePos[ph][p.index]; });
  };

  // The target position for one player, in pitch metres.
  // With the ball he moves from his build-up position toward his final-third position as the ball goes forward; for a few
  // seconds after winning it he is drawn toward his transition position, and after losing it toward his defensive one.
  FM.targetFor = function (team, player, ball, hasBall) {
    const role = FM.ROLES[player.roleId], m = FM.instrMods(player), ctx = team.phaseCtx || {};
    const b = toTeamSpace(team.attackDir, ball.x, ball.y);
    const mix = (a, c, t) => ({ d: a.d + (c.d - a.d) * t, w: a.w + (c.w - a.w) * t });
    let pos;
    if (hasBall) {
      pos = mix(FM.phasePos(team, player, 'build'), FM.phasePos(team, player, 'final'), clamp((b.d - 0.33) / 0.4, 0, 1));
      if (ctx.transAtt > 0) pos = mix(pos, FM.phasePos(team, player, 'transAtt'), ctx.transAtt);
    } else {
      pos = FM.phasePos(team, player, 'without');
      // While the opposition build from their own end, a team that presses their build-up takes its pressing positions instead.
      const pw = clamp((b.d - 0.5) / 0.25, 0, 1) * clamp((team.tactics.pressBuildUp == null ? 0.4 : team.tactics.pressBuildUp) * 1.25, 0, 1);
      if (pw > 0) pos = mix(pos, FM.phasePos(team, player, 'press'), pw);
      if (ctx.transDef > 0) pos = mix(pos, FM.phasePos(team, player, 'transDef'), ctx.transDef);
    }
    let d = pos.d, w = pos.w;
    const phase = hasBall ? role.inPoss : role.outPoss;

    // (The height of the defensive line is part of each phase's default position: see defaultPhasePos.)

    // Shape shifts toward the ball (a roaming player follows it more, a player told to hold less).
    const pull = clamp((FM.GROUP_BALL_PULL[player.group] || 0.4) + phase.ballPull + 0.25 * m.roam, 0, 1);
    d += (b.d - d) * pull * 0.3;
    w += (b.w - w) * pull * 0.22;

    // Width instruction: spreads or squeezes the whole shape around the centre line.
    w = 0.5 + (w - 0.5) * (hasBall ? team.tactics.attackWidth : team.tactics.defWidth);

    if (player.group === 'GK') d = clamp(d, 0.02, 0.2);
    d = clamp(d, 0.02, 0.97);
    w = clamp(w, 0.04, 0.96);
    return toMetres(team.attackDir, d, w);
  };

  // Moves every player of one team one time step toward their target.
  FM.stepTeam = function (team, ball, hasBall, dt, overrides) {
    // With the ball, attackers hold the offside line instead of standing beyond it.
    const lim = hasBall ? team.offsideLine : null;
    const targets = team.players.map((p) => {
      const o = overrides && overrides.get(p);
      if (o) return o;
      const t = FM.targetFor(team, p, ball, hasBall);
      if (lim != null && p.group !== 'GK') {
        const runs = FM.instrMods(p).runs;
        const l = lim + team.attackDir * (runs > 0 ? 0.5 : runs < 0 ? -1.2 : 0);
        t.x = team.attackDir === 1 ? Math.min(t.x, l) : Math.max(t.x, l);
      }
      return t;
    });
    team.players.forEach((p, i) => {
      const t = targets[i];
      const dx = t.x - p.x, dy = t.y - p.y;
      const dist = Math.hypot(dx, dy) || 1e-6;
      const speed = Math.min(p.maxSpeed, dist * 1.4);
      const k = Math.min(1, dt * 4);
      p.vx += (dx / dist * speed - p.vx) * k;
      p.vy += (dy / dist * speed - p.vy) * k;
    });
    // Teammates keep a little space from each other.
    for (let i = 0; i < team.players.length; i++) {
      for (let j = i + 1; j < team.players.length; j++) {
        const a = team.players[i], c = team.players[j];
        const dx = c.x - a.x, dy = c.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d > 0 && d < 3.5) {
          const push = (3.5 - d) * 0.6;
          a.vx -= dx / d * push * dt * 4; a.vy -= dy / d * push * dt * 4;
          c.vx += dx / d * push * dt * 4; c.vy += dy / d * push * dt * 4;
        }
      }
    }
    team.players.forEach((p) => {
      p.x = clamp(p.x + p.vx * dt, 0.5, L - 0.5);
      p.y = clamp(p.y + p.vy * dt, 0.5, W - 0.5);
    });
  };
})();
