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

  FM.defaultTactics = function () {
    return { lineHeight: 0.5, widthScale: 1 };
  };

  // Builds a team: 11 players on the formation's slots, each with a default role.
  FM.createTeam = function (spec) {
    const formation = FM.FORMATIONS[spec.formation];
    const team = {
      id: spec.id, name: spec.name, kit: spec.kit, attackDir: spec.attackDir,
      formationKey: spec.formation, tactics: FM.defaultTactics(), players: [],
    };
    formation.slots.forEach((slot, i) => {
      const role = FM.ROLES[slot.defaultRole];
      const options = {};
      Object.keys(role.options || {}).forEach((k) => { options[k] = role.options[k].default != null ? role.options[k].default : false; });
      team.players.push({ index: i, slotKey: slot.key, group: slot.group, number: slot.number, roleId: slot.defaultRole, options, x: 0, y: 0, vx: 0, vy: 0, maxSpeed: 6.8 });
    });
    FM.resetToKickoff(team);
    return team;
  };

  // Changes formation, keeping the same 11 players by moving them to the matching slots.
  FM.setFormation = function (team, formationKey) {
    const formation = FM.FORMATIONS[formationKey];
    team.formationKey = formationKey;
    team.players.forEach((p, i) => {
      const slot = formation.slots[i];
      p.slotKey = slot.key; p.group = slot.group; p.number = slot.number; p.roleId = slot.defaultRole;
      const role = FM.ROLES[p.roleId];
      p.options = {};
      Object.keys(role.options || {}).forEach((k) => { p.options[k] = role.options[k].default != null ? role.options[k].default : false; });
    });
  };

  FM.setRole = function (team, player, roleId) {
    player.roleId = roleId;
    const role = FM.ROLES[roleId];
    player.options = {};
    Object.keys(role.options || {}).forEach((k) => { player.options[k] = role.options[k].default != null ? role.options[k].default : false; });
  };

  FM.resetToKickoff = function (team) {
    const formation = FM.FORMATIONS[team.formationKey];
    team.players.forEach((p, i) => {
      const slot = formation.slots[i];
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
    w = 0.5 + (w - 0.5) * team.tactics.widthScale;

    if (player.group === 'GK') d = clamp(d, 0.02, 0.2);
    d = clamp(d, 0.02, 0.97);
    w = clamp(w, 0.04, 0.96);
    return toMetres(team.attackDir, d, w);
  };

  // Moves every player of one team one time step toward their target.
  FM.stepTeam = function (team, ball, hasBall, dt) {
    const targets = team.players.map((p) => FM.targetFor(team, p, ball, hasBall));
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
