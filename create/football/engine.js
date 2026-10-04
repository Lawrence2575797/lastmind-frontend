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
      finalRisk: 0.5, shootFreedom: 0.5, dribbleFreedom: 0.5,
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
  }

  // Builds a team: a squad of 20, with 11 on the formation's slots (each with a default role) and 9 on the bench.
  FM.createTeam = function (spec) {
    const formation = FM.FORMATIONS[spec.formation];
    const team = {
      id: spec.id, name: spec.name, kit: spec.kit, attackDir: spec.attackDir,
      formationKey: spec.formation, tactics: FM.defaultTactics(), players: [], bench: [], squad: [],
      strength: spec.strength || 0, seed: spec.seed || FM.hashString(spec.id), subsUsed: 0, maxSubs: 5,
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
  FM.setFormation = function (team, formationKey) {
    const formation = FM.FORMATIONS[formationKey];
    team.formationKey = formationKey;
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
    const live = match && match.phase !== 'kickoff' || (match && match.clock > 0);
    if (live && team.subsUsed >= team.maxSubs) return 'No substitutions left.';
    inPlayer.x = outPlayer.x; inPlayer.y = outPlayer.y; inPlayer.vx = outPlayer.vx; inPlayer.vy = outPlayer.vy;
    inPlayer.index = outPlayer.index; inPlayer.slotKey = outPlayer.slotKey; inPlayer.group = outPlayer.group;
    // The new player takes over the role if it suits his slot, otherwise the slot's default role.
    inPlayer.roleId = outPlayer.roleId; inPlayer.options = Object.assign({}, outPlayer.options);
    team.players[k] = inPlayer;
    team.bench[bi] = outPlayer;
    outPlayer.index = -1; outPlayer.slotKey = null; outPlayer.group = outPlayer.natural;
    if (live) team.subsUsed++;
    if (match && match.carrier && match.carrier.player === outPlayer) match.carrier.player = inPlayer;
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
    const role = FM.ROLES[roleId];
    player.options = {};
    Object.keys(role.options || {}).forEach((k) => { player.options[k] = role.options[k].default != null ? role.options[k].default : false; });
  };

  FM.resetToKickoff = function (team) {
    const formation = FM.FORMATIONS[team.formationKey];
    team.players.forEach((p) => {
      const slot = formation.slots[p.index];
      const pos = toMetres(team.attackDir, Math.min(slot.d, 0.47), slot.w);
      p.x = pos.x; p.y = pos.y; p.vx = 0; p.vy = 0;
    });
  };

  // The target position for one player, in pitch metres.
  FM.targetFor = function (team, player, ball, hasBall) {
    const formation = FM.FORMATIONS[team.formationKey];
    const slot = formation.slots[player.index];
    const role = FM.ROLES[player.roleId];
    let phase = hasBall ? role.inPoss : role.outPoss;
    let depthShift = phase.depth;
    let wTarget = phase.wTarget;
    let widthShift = phase.width;

    // Settings on a role can replace its movement (for example where an inverted full-back inverts to).
    if (hasBall && role.invertTargets) {
      const t = role.invertTargets[player.options.invertTo] || role.invertTargets[role.options.invertTo.default];
      depthShift = t.depth; wTarget = t.wTarget;
    }

    let d = slot.d + depthShift;
    let w = slot.w;
    if (wTarget != null) w = slot.w < 0.5 ? wTarget : 1 - wTarget;
    else if (widthShift) w += (slot.w < 0.5 ? -1 : 1) * widthShift * (Math.abs(slot.w - 0.5) < 0.01 ? 0 : 1);

    // Team instruction: how high the defensive line sits. Counts for more when the team does not have the ball.
    const weight = FM.GROUP_LINE_WEIGHT[player.group] || 0;
    d += (team.tactics.lineHeight - 0.5) * 0.28 * weight * (hasBall ? 0.6 : 1);

    // Shape shifts toward the ball.
    const b = toTeamSpace(team.attackDir, ball.x, ball.y);
    const pull = clamp((FM.GROUP_BALL_PULL[player.group] || 0.4) + phase.ballPull, 0, 1);
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
      if (lim != null && p.group !== 'GK') t.x = team.attackDir === 1 ? Math.min(t.x, lim) : Math.max(t.x, lim);
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
