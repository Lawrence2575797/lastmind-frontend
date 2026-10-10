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
      finalRisk: 0.5, shootFreedom: 0.5, dribbleFreedom: 0.5, pressBuildUp: 0.4, beatPress: 0.5,
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
    const body = FM.generatePhysique(natural, rng);
    const ratings = FM.generateRatings(natural, rng, strength, body.height);
    return { id, number, natural, height: body.height, foot: body.foot, group: natural, index: -1, slotKey: null, roleId: null, options: {}, ratings, x: 0, y: 0, vx: 0, vy: 0, maxSpeed: FM.speedFromPace(ratings.pace) };
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
      shape: {}, phasePos: {}, pages: {}, pageDefaults: {}, scenarios: [], defScenarios: [],
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
  // Every stage of play has two diagrams: where the team stands when the stage begins and where it is by the time the stage ends. The ball goes with
  // them, so the shirts are read as "this is where the ball is and this is where everyone should be". Possession stages form one chain:
  //   build (a goal kick) -> buildEnd (the build-up has reached midfield) -> midfield (the move has reached the final third) -> final (a chance)
  // so the end of one stage is the start of the next, and the team is shown moving through the keyframes as the ball goes forward.
  FM.PHASES = ['build', 'buildEnd', 'midfield', 'final', 'transAtt', 'transAttEnd', 'transDef', 'transDefEnd', 'press', 'without', 'withoutEnd'];
  FM.PHASE_NAMES = { build: 'Build-up from a goal kick', buildEnd: 'Build-up: reaching midfield', midfield: 'Play through midfield', final: 'Final third', transAtt: 'Attacking transition', transAttEnd: 'Attacking transition: settled', transDef: 'Defensive transition', transDefEnd: 'Defensive transition: settled', press: 'Pressing their build-up', without: 'Organised defending', withoutEnd: 'Organised defending: under pressure' };
  // Where the ball is in each diagram (team space: d 0 is our goal, 1 theirs), unless the manager has moved it.
  const BALL_DEFAULT = { build: { d: 0.07, w: 0.6 }, buildEnd: { d: 0.34, w: 0.5 }, midfield: { d: 0.62, w: 0.5 }, final: { d: 0.86, w: 0.5 }, transAtt: { d: 0.4, w: 0.5 }, transAttEnd: { d: 0.6, w: 0.5 }, transDef: { d: 0.6, w: 0.5 }, transDefEnd: { d: 0.4, w: 0.5 }, without: { d: 0.58, w: 0.5 }, withoutEnd: { d: 0.2, w: 0.5 } };
  // A page the manager has added (a scenario) keeps its own copy of the possession diagrams under the key 'phase#id'. Anything on it that has
  // not been placed by hand is the same as on the default page, so an added page only differs where it has been changed.
  FM.baseKey = (key) => String(key).split('#')[0];
  FM.scnSuffix = (key) => { const i = String(key).indexOf('#'); return i < 0 ? '' : String(key).slice(i); };
  FM.phaseBall = function (team, key) {
    const own = team && team.phaseBall && team.phaseBall[key];
    if (own) return own;
    const base = FM.baseKey(key);
    if (base !== key) return FM.phaseBall(team, base);
    return BALL_DEFAULT[key] || { d: 0.5, w: 0.5 };
  };
  FM.setPhaseBall = function (team, key, pos) {
    team.phaseBall = team.phaseBall || {};
    const chain = ['build', 'buildEnd', 'midfield', 'final'], i = chain.indexOf(FM.baseKey(key));
    let d = pos.d;
    if (i >= 0) {   // the ball only goes forward through the chain
      const lo = i > 0 ? FM.phaseBall(team, chain[i - 1]).d + 0.04 : 0.02, hi = i < chain.length - 1 ? FM.phaseBall(team, chain[i + 1]).d - 0.04 : 0.98;
      d = clamp(d, lo, Math.max(lo, hi));
    }
    team.phaseBall[key] = { d: clamp(d, 0.02, 0.98), w: clamp(pos.w, 0.03, 0.97) };
  };
  const PUSH = { GK: 0, CB: 0.04, FB: 0.10, DM: 0.08, CM: 0.18, AM: 0.16, WF: 0.14, ST: 0.12 };
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
    // Each possession phase begins where the previous phase finished until the manager moves the shirt again.
    // Until the manager moves a shirt, each stage starts where the one before it ended (the same as before the stages had two diagrams).
    const carry = { buildEnd: 'build', midfield: 'buildEnd', final: 'midfield', transAttEnd: 'transAtt', transDefEnd: 'transDef', withoutEnd: 'without' };

    if (carry[phase]) { const q = FM.phasePos(team, p, carry[phase]); return { d: q.d, w: q.w }; }
    const base = FM.slotBase(team, p), role = FM.ROLES[p.roleId], m = FM.instrMods(p);
    const inPos = phase === 'build' || phase === 'final' || phase === 'transAtt';
    const o = inPos ? role.inPoss : role.outPoss;
    let depth = o.depth, wTarget = o.wTarget;
    const width = o.width;
    const k = phase === 'build' ? 0.6 : phase === 'transAtt' ? 0.8 : 1; // how much of the role's movement shows in this phase
    let d = base.d + depth * k, w = base.w;
    const centre = Math.abs(base.w - 0.5) < 0.01;
    if (wTarget != null) { const tw = base.w < 0.5 ? wTarget : 1 - wTarget; w = base.w + (tw - base.w) * k; }
    else if (width) w += (base.w < 0.5 ? -1 : 1) * width * k * (centre ? 0 : 1);
    const push = PUSH[p.group] || 0;
    if (phase === 'transAtt') d += push * 0.6; else if (phase === 'transDef') d -= 0.03; else if (phase === 'press') d += PRESS_PUSH[p.group] || 0;
    d += m.depth;
    if (!centre) w += (base.w < 0.5 ? -1 : 1) * m.width;
    return { d: clamp(d, 0.02, 0.97), w: clamp(w, 0.04, 0.96) };
  };
  FM.phasePos = function (team, p, phase) {
    const man = team.phasePos && team.phasePos[phase] && team.phasePos[phase][p.index];
    if (man) return man;
    const base = FM.baseKey(phase);
    if (base !== phase) return FM.phasePos(team, p, base);   // an added page that has not been changed here is the default page
    return FM.defaultPhasePos(team, p, phase);
  };
  // Every key positions are kept under: the phases, and the pages the manager has added.
  FM.allPhaseKeys = (team) => FM.PHASES.concat(Object.keys(team.phasePos || {}).filter((k) => k.indexOf('#') > 0));
  FM.isManual = (team, p, phase) => !!(team.phasePos && team.phasePos[phase] && team.phasePos[phase][p.index]);

  // ---------- how far can he get between phases? ----------
  // About six seconds at top speed: a full-back can come inside, a winger cannot be on the left in build-up and the
  // right in the final third.
  FM.REACH_SECONDS = 6;
  FM.reachMetres = (p) => FM.REACH_SECONDS * p.maxSpeed;
  // Phase positions must be reachable in both dimensions. Movement is still
  // paid for through each player's speed, but the editor no longer accepts an
  // impossible end-to-end change merely because it has no sideways component.
  FM.DEPTH_WEIGHT = 1;
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
  FM.OFFSIDE_PHASES = ['build', 'buildEnd', 'midfield', 'final', 'transAtt', 'transAttEnd'];
  // The line is exactly where the opposition's deepest outfield player stands (the keeper is the last defender, so he is the second-last).
  // With the opposition not shown, the line is the same whoever the opponent is: where a side in an ordinary defensive shape keeps its
  // deepest outfield player. It only differs when the opposition shirts are shown and moved, in which case lineOverride is the line
  // read from those shirts, in this team's space.
  FM.STANDARD_OFFSIDE = 0.8;
  FM.offsideLimit = function (opp, p, lineOverride) {
    const line = lineOverride == null ? FM.STANDARD_OFFSIDE : lineOverride;
    const runs = p ? FM.instrMods(p).runs : 0; // a player told to run in behind may stand a little beyond it, one told to hold the line a little short
    return Math.max(line + (runs > 0 ? 0.5 : runs < 0 ? -1.2 : 0) / L, 0.5);
  };
  FM.clampOffside = function (team, p, phase, pos, opp, lineOverride) {
    if (!opp || p.group === 'GK' || FM.OFFSIDE_PHASES.indexOf(FM.baseKey(phase)) < 0) return pos;
    return { d: Math.min(pos.d, FM.offsideLimit(opp, p, lineOverride)), w: pos.w };
  };
  FM.setPhasePos = function (team, p, phase, pos) {
    team.phasePos[phase] = team.phasePos[phase] || {};
    team.phasePos[phase][p.index] = { d: pos.d, w: pos.w };
  };
  FM.setSlotBase = function (team, p, pos) {
    team.shape[p.index] = { d: clamp(pos.d, 0.02, 0.98), w: clamp(pos.w, 0.03, 0.97) };
    FM.fixSlot(team, p);
  };
  // Shape values used by the match model and reports are derived from the shirts on the phase pitches.
  FM.inferShapeTactics = function (team) {
    if (!team || !team.players || !team.players.length) return;
    const positions = (phase, filter) => team.players.filter(filter || (() => true)).map((p) => FM.phasePos(team, p, phase));
    const backs = positions('without', (p) => p.group === 'CB' || p.group === 'FB');
    if (backs.length) team.tactics.lineHeight = clamp((backs.reduce((sum, p) => sum + p.d, 0) / backs.length - 0.14) / 0.3, 0, 1);
    const width = (phase) => {
      const ps = positions(phase, (p) => p.group !== 'GK');
      if (!ps.length) return 1;
      const span = Math.max.apply(null, ps.map((p) => p.w)) - Math.min.apply(null, ps.map((p) => p.w));
      return clamp(span / 0.72, 0.7, 1.25);
    };
    team.tactics.attackWidth = width('final');
    team.tactics.defWidth = width('without');
  };
  // After anything moves, any hand-placed position that is now out of reach is pulled back.
  FM.fixSlot = function (team, p, opp, lineFor) {
    FM.allPhaseKeys(team).forEach((ph) => { if (FM.isManual(team, p, ph)) FM.setPhasePos(team, p, ph, FM.clampOffside(team, p, ph, FM.clampToReach(team, p, ph, FM.phasePos(team, p, ph)), opp, lineFor ? lineFor(ph) : null)); });
  };
  // Moving the defensive line moves every player's default position (see defaultPhasePos), and it must move the ones the manager has placed by hand
  // as well: a full-back dragged to a spot on the Defending board still goes up and down with the line, by the same amount as everyone else.
  FM.shiftLine = function (team, from, to) {
    const k = (to - from) * 0.28;
    team.players.forEach((p) => {
      const wgt = FM.GROUP_LINE_WEIGHT[p.group] || 0; if (!wgt) return;
      let moved = false;
      FM.allPhaseKeys(team).forEach((ph) => {
        if (!FM.isManual(team, p, ph)) return;
        const b0 = FM.baseKey(ph), pos = FM.phasePos(team, p, ph), f = (b0 === 'build' || b0 === 'buildEnd' || b0 === 'final' || b0 === 'transAtt' || b0 === 'transAttEnd') ? 0.6 : 1;
        FM.setPhasePos(team, p, ph, { d: clamp(pos.d + k * wgt * f, 0.02, 0.97), w: pos.w }); moved = true;
      });
      if (moved) FM.fixSlot(team, p);
    });
  };
  FM.clearPhase = function (team, phase) { if (phase === 'shape') team.shape = {}; else if (team.phasePos) delete team.phasePos[phase]; };
  FM.clearPlayerPositions = function (team, p) {
    delete team.shape[p.index];
    FM.allPhaseKeys(team).forEach((ph) => { if (team.phasePos[ph]) delete team.phasePos[ph][p.index]; });
  };
  // ---------- pages the manager adds (scenarios) ----------
  // A scenario is a page of possession diagrams (build-up, through midfield, final third) that applies while its condition holds. 'Default' is
  // the page that always exists, and the first added page whose condition holds wins. The manager gives each page its own label, and the
  // match records which page was in use, by that label.
  // Two sets of pages: the possession stages (build-up, through midfield, final third, attacking transition) and the defending stages
  // (organised defending, defensive transition), each with the situations that make sense for it.
  const GAME_STATE_CONDS = [
    { key: 'leading', label: 'We are winning' },
    { key: 'level', label: 'The score is level' },
    { key: 'trailing', label: 'We are losing' },
    { key: 'late', label: 'It is the last 15 minutes' },
  ];
  // The same choices are offered on every page, the default one included. 'The opposition line up like the shirts I place' compares where the
  // opposition really stand with the opposition shirts the manager dragged into place on that page's diagram.
  const ALWAYS = { key: 'always', label: 'Otherwise (when nothing else applies)' };
  const OPP_SHAPE = { key: 'opp_shape', label: 'The opposition line up like the shirts I place' };
  FM.SCENARIO_CONDS = [ALWAYS,
    { key: 'opp_press', label: 'The opposition press us' },
    { key: 'opp_sit', label: 'The opposition sit off us' },
  ].concat(GAME_STATE_CONDS, [OPP_SHAPE]);
  FM.SCENARIO_CONDS_DEF = [ALWAYS,
    { key: 'opp_direct', label: 'The opposition play long and direct' },
    { key: 'opp_short', label: 'The opposition build short' },
  ].concat(GAME_STATE_CONDS, [OPP_SHAPE]);
  // How the opposition stand, in two numbers (in their own space, 0 their own goal, 1 ours): the average depth of their outfield players and
  // the average depth of their three most advanced.
  FM.oppSignature = function (ds) {
    const v = ds.slice().sort((a, b) => b - a);
    if (!v.length) return null;
    const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
    return [mean(v), mean(v.slice(0, 3))];
  };
  FM.sigDistance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  FM.scenarioHolds = function (cond, info, page) {
    if (cond === 'always') return true;
    if (cond === 'from_prev') return !!page && !!page.from && info.prevPage === page.from;
    if (cond === 'opp_shape') return !!page && info.shapeWinner === (page.id || 'default');
    if (cond === 'opp_press') return info.oppPress >= 0.5;
    if (cond === 'opp_sit') return info.oppPress < 0.5;
    if (cond === 'opp_direct') return info.oppDirect >= 0.5;
    if (cond === 'opp_short') return info.oppDirect < 0.5;
    if (cond === 'leading') return info.diff > 0;
    if (cond === 'level') return info.diff === 0;
    if (cond === 'trailing') return info.diff < 0;
    if (cond === 'late') return (info.minute || 0) >= 75;
    return false;
  };
  // Pages belong to the second diagram of a stage (where the stage ends): team.pages[endKey] is the list of added versions of it, endKey being
  // buildEnd, midfield, final, transAttEnd, withoutEnd or transDefEnd. The first diagram of a stage is fixed (a goal kick for build-up, the
  // end of the stage before for the stages that follow, one for each version of it), so it has no pages of its own.
  FM.PAGE_ENDS = ['buildEnd', 'midfield', 'final', 'transAttEnd', 'withoutEnd', 'transDefEnd'];
  FM.PAGE_ENDS_DEF = ['withoutEnd', 'transDefEnd'];
  // The default page is the first one looked at (it has a condition of its own, 'otherwise' unless it was changed), then the added pages in
  // order. Null means the default page.
  FM.pickPage = function (list, info, dflt) {
    if (dflt && dflt.cond && dflt.cond !== 'always' && FM.scenarioHolds(dflt.cond, info, { id: null })) return null;
    for (let i = 0; i < (list || []).length; i++) if (FM.scenarioHolds(list[i].cond, info, list[i])) return list[i];
    return null;
  };
  // Pages first added when they were whole-chain scenarios are carried over: each becomes a version of every end diagram it applied to.
  FM.ensurePages = function (team) {
    team.pages = team.pages || {};
    team.pageDefaults = team.pageDefaults || {};
    const copy = (l) => JSON.parse(JSON.stringify(l || []));
    if (team.scenarios && team.scenarios.length) { ['buildEnd', 'midfield', 'final', 'transAttEnd'].forEach((k) => { if (!team.pages[k]) team.pages[k] = copy(team.scenarios); }); team.scenarios = []; }
    if (team.defScenarios && team.defScenarios.length) { ['withoutEnd', 'transDefEnd'].forEach((k) => { if (!team.pages[k]) team.pages[k] = copy(team.defScenarios); }); team.defScenarios = []; }
    // A stage that follows another starts from one diagram for each version of the stage before, so it has an end page following on from each of
    // them by default (a linked page: it is used when the stage before ended on the page it follows). They come first, in the same order as the
    // starting diagrams, then any pages the manager adds.
    Object.keys(FM.PREV_END).forEach((end) => {
      const prev = team.pages[FM.PREV_END[end]] || [], list = team.pages[end] = team.pages[end] || [];
      const wanted = prev.map((p) => p.id);
      // a page carried over from the days when pages were shared by the whole chain follows the page of the same id
      list.forEach((x) => { if (!x.from && wanted.indexOf(x.id) >= 0) { x.from = x.id; x.cond = 'from_prev'; } });
      for (let i = list.length - 1; i >= 0; i--) if (list[i].from && wanted.indexOf(list[i].from) < 0) list.splice(i, 1);
      prev.forEach((p) => { if (!list.some((x) => x.from === p.id)) list.push({ id: 'l' + p.id, label: p.label, cond: 'from_prev', from: p.id }); });
      const linked = wanted.map((id) => list.find((x) => x.from === id)).filter(Boolean);
      team.pages[end] = linked.concat(list.filter((x) => !x.from));
    });
  };
  FM.PREV_END = { midfield: 'buildEnd', final: 'midfield' };

  // The target position for one player, in pitch metres.
  // With the ball he moves from his build-up position toward his final-third position as the ball goes forward; for a few
  // seconds after winning it he is drawn toward his transition position, and after losing it toward his defensive one.
  FM.targetFor = function (team, player, ball, hasBall) {
    const role = FM.ROLES[player.roleId], m = FM.instrMods(player), ctx = team.phaseCtx || {};
    const b = toTeamSpace(team.attackDir, ball.x, ball.y);
    const mix = (a, c, t) => ({ d: a.d + (c.d - a.d) * t, w: a.w + (c.w - a.w) * t });
    // The version of a stage's end diagram that applies right now (see FM.pickPage): the default one unless an added page's condition holds.
    const pn = (k) => (team.pageNow && team.pageNow[k] ? k + '#' + team.pageNow[k] : k);
    let pos;
    if (hasBall) {
      // The possession diagrams in order, each with the ball where it is drawn: the team is read off them as the ball goes forward.
      const chain = ['build', 'buildEnd', 'midfield', 'final'].map((k) => ({ d: FM.phaseBall(team, pn(k)).d, pos: FM.phasePos(team, player, pn(k)) }));
      pos = chain[chain.length - 1].pos;
      if (b.d <= chain[0].d) pos = chain[0].pos;
      else for (let i = 0; i < chain.length - 1; i++) {
        if (b.d <= chain[i + 1].d) { pos = mix(chain[i].pos, chain[i + 1].pos, clamp((b.d - chain[i].d) / Math.max(0.05, chain[i + 1].d - chain[i].d), 0, 1)); break; }
      }
      if (ctx.transAtt > 0) {
        const zone = b.d < 0.33 ? 'defensive' : b.d < 0.67 ? 'middle' : 'attacking';
        const choice = (team.tactics.transAttChoices || {})[zone] || 'counter';
        const target = choice === 'reset' ? chain[0].pos : choice === 'secure' ? chain[1].pos : mix(FM.phasePos(team, player, 'transAtt'), FM.phasePos(team, player, pn('transAttEnd')), clamp(ctx.taProg || 0, 0, 1));
        pos = mix(pos, target, ctx.transAtt);
      }
    } else {
      // Defending: the first diagram is the team set up while the ball is still far away; the second is the team with the ball close to the goal.
      const far = FM.phaseBall(team, 'without').d, near = FM.phaseBall(team, pn('withoutEnd')).d;
      pos = mix(FM.phasePos(team, player, 'without'), FM.phasePos(team, player, pn('withoutEnd')), clamp((far - b.d) / Math.max(0.05, far - near), 0, 1));
      // While the opposition build from their own end, a team that presses their build-up takes its pressing positions instead.
      const pw = clamp((b.d - 0.5) / 0.25, 0, 1) * clamp((team.tactics.pressBuildUp == null ? 0.4 : team.tactics.pressBuildUp) * 1.25, 0, 1);
      if (pw > 0) pos = mix(pos, FM.phasePos(team, player, 'press'), pw);
      if (ctx.transDef > 0) {
        const zone = b.d < 0.33 ? 'defensive' : b.d < 0.67 ? 'middle' : 'attacking';
        const choice = (team.tactics.transDefChoices || {})[zone] || 'contain';
        const target = choice === 'regroup' ? FM.phasePos(team, player, 'without') : choice === 'counterpress' ? mix(FM.phasePos(team, player, 'transDef'), FM.phasePos(team, player, pn('transDefEnd')), clamp(ctx.tdProg || 0, 0, 1)) : mix(pos, FM.phasePos(team, player, 'without'), 0.5);
        pos = mix(pos, target, ctx.transDef);
      }
    }
    let d = pos.d, w = pos.w;
    const phase = hasBall ? role.inPoss : role.outPoss;

    // (The height of the defensive line is part of each phase's default position: see defaultPhasePos.)

    // Shape shifts toward the ball (a roaming player follows it more, a player told to hold less).
    const pull = clamp((FM.GROUP_BALL_PULL[player.group] || 0.4) + phase.ballPull + 0.25 * m.roam, 0, 1);
    d += (b.d - d) * pull * 0.3;
    w += (b.w - w) * pull * 0.22;
    // The manager's own instructions can move him further forward or wider, in the situations they name.
    const rs = FM.rulesShift ? FM.rulesShift(team, player, ball, hasBall) : null;
    if (rs) { d += rs.d; w += (w >= 0.5 ? 1 : -1) * rs.w; }
    const pl = FM.rulesPlace ? FM.rulesPlace(team, player, ball, hasBall) : null;   // 'stand where this says', for the situations the manager named
    if (pl) pl.forEach((e) => { if (e.dm != null) d += (e.dm / L - d) * e.k; if (e.wm != null) w += (e.wm / W - w) * e.k; });

    // Preserve a rest defence while attacking. Centre-backs and holding
    // midfielders can support play but do not all drift beyond the ball.
    if (hasBall) {
      const cap = player.group === 'CB' ? Math.min(.58, b.d - .08) : player.group === 'DM' ? Math.min(.7, b.d + .02) : null;
      if (cap != null) d = Math.min(d, Math.max(.2, cap));
    }

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
        const runs = FM.instrMods(p).runs + (FM.rulesDelta ? FM.rulesDelta(team, p, 'runs', ball, hasBall) : 0);
        const l = lim + team.attackDir * (runs > 0 ? 0.5 : runs < 0 ? -1.2 : 0);
        t.x = team.attackDir === 1 ? Math.min(t.x, l) : Math.max(t.x, l);
      }
      return t;
    });
    team.players.forEach((p, i) => {
      const t = targets[i];
      const dx = t.x - p.x, dy = t.y - p.y;
      const rawDist = Math.hypot(dx, dy);
      const dist = rawDist || 1e-6;
      const speed = Math.min(p.maxSpeed, dist * 1.4);
      const wanted = rawDist < 0.05 && Number.isFinite(p.facing) ? p.facing : Math.atan2(dy, dx);
      if (!Number.isFinite(p.facing)) p.facing = wanted;
      let turn = wanted - p.facing;
      while (turn > Math.PI) turn -= Math.PI * 2;
      while (turn < -Math.PI) turn += Math.PI * 2;
      const maxTurn = (p.group === 'GK' ? 3.2 : 2.5) * dt;
      p.facing += clamp(turn, -maxTurn, maxTurn);
      const alignment = clamp(1 - Math.abs(turn) / Math.PI, .18, 1);
      // How quickly a player changes his velocity toward the one he wants. Written so that it gives the same response however long a step is:
      // the live match (0.1 s steps) and the background matches (0.25 s) must play out alike, and 1 - exp(-5.1 dt) is exactly the 40% a 0.1 s step
      // always used. (It used to be min(1, 4 dt), which at 0.25 s meant no smoothing at all, so background players were far twitchier.)
      const k = 1 - Math.exp(-5.1 * dt);
      p.vx += (Math.cos(p.facing) * speed * alignment - p.vx) * k;
      p.vy += (Math.sin(p.facing) * speed * alignment - p.vy) * k;
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
