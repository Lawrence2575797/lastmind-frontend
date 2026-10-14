// Preparing a phase of play by showing it. Instead of the computer working tactics out from written instructions only, the manager plays the phase
// out on the pitch against the opposition as they are expected to set up: pick up the ball, move players, dribble, and draw passes. The opposition
// reacts to every move according to their own tactics. From what was shown, the code works out how the team plays that phase (how direct, how
// patient, how wide, how risky, who it looks for and who moves where), and where the team ends up becomes the starting positions for the next phase.
//
//   * drag a player             - he moves (with the ball, that is a dribble)
//   * drag the ball onto a man  - he has the ball
//   * press on the pitch and drag in the direction of a pass, then let go - a pass (over a player on the line it is a ball in the air)
//
// Coordinates here are metres: x across the pitch (0 to 68, left to right), y up the pitch (0 to 105), our goal at the bottom.
(function () {
  const FM = (window.FM = window.FM || {});
  const L = 105, W = 68, PS = 7, GOAL = 2.4;   // GOAL: metres shown beyond each goal line, for the goals
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  // engine pitch (length along x, width along y) <-> this board (width along x, length along y)
  const toEng = (p) => ({ x: p.y, y: p.x });
  const fromEng = (p) => ({ x: p.y, y: p.x });
  const PHASES = {
    build: { title: 'Build-up from a goal kick', stage: 'build', end: 'buildEnd', endLine: 0.5, goal: 'Get the ball out of your half, past their press.', next: 'Play through midfield', nextKey: 'midfield' },
    midfield: { title: 'Play through midfield', stage: 'midfield', end: 'midfield', endLine: 0.72, goal: 'Carry the ball up to the edge of the final third.', next: 'The final third', nextKey: 'final' },
    final: { title: 'The final third', stage: 'final', end: 'final', endLine: null, goal: 'Create a chance: finish the attack with a shot (drag a pass line into the goal).', next: 'Defensive transition', nextKey: 'transdef' },
    press: { title: 'Pressing their build-up', stage: 'without', end: 'press', defend: true, endAtHalf: true, goal: 'They start from their goalkeeper. Show how the team presses them: where the players stand, and who goes to the ball. Press the man on it and he can be tackled.', next: 'Defending your third', nextKey: 'organised' },
    organised: { title: 'Defending your third', stage: 'without', end: 'without', defend: true, goal: 'They have the ball at the edge of your third. Show where the team sits and who closes down, then let them play on. Close the man on the ball down and he can be tackled.', next: 'Attacking transition', nextKey: 'transatt' },
  };
  FM.SCENARIO_PHASES = PHASES;

  // How the opposition are expected to press, from their own settings.
  FM.scenarioOppPress = function (opp) {
    const t = (opp && (opp.baseTactics || opp.tactics)) || {};
    const v = 0.6 * (t.pressBuildUp == null ? 0.4 : t.pressBuildUp) + 0.4 * (t.pressing == null ? 0.5 : t.pressing);
    return { value: v, label: v >= 0.6 ? 'press high' : v >= 0.4 ? 'hold a mid block' : 'sit in a low block' };
  };

  // ---------- the starting positions ----------
  const saved = (team) => (team.scenarioEnd = team.scenarioEnd || {});
  const phaseKey = (phase) => (phase === 'build' ? 'build' : phase === 'midfield' ? 'buildEnd' : 'midfield');
  function startPositions(team, phase) {
    const key = phaseKey(phase);
    return team.players.map((p) => { const q = FM.phasePos(team, p, key); return { p, x: q.w * W, y: q.d * L }; });
  }
  function startBall(phase) { return phase === 'build' ? { x: W / 2, y: 4 } : phase === 'midfield' ? { x: W / 2, y: 40 } : { x: W / 2, y: 68 }; }

  // ---------- the opposition's reaction: the match engine itself ----------
  // The two clubs are put in a real match (copies of them, so nothing in the game is touched) and the engine plays the opposition exactly as it
  // would in a game: their pressing, their line, who marks whom, how they shift toward the ball. Our own players stand where the manager has put
  // them. When the manager moves something, the engine is run on for a moment and the opposition's new positions are read back.
  const TRANSIENT = { oppRef: 1, ruleCtx: 1, phaseCtx: 1, extraOv: 1 };
  const cloneTeam = (t) => JSON.parse(JSON.stringify(t, (k, v) => (TRANSIENT[k] ? undefined : v)));
  function makeEngine(team, opp, phase, seed) {
    const u = cloneTeam(team), o = cloneTeam(opp);
    u.rules = (u.rules || []).filter((r) => r && r.source !== 'scenario'); o.rules = []; u.phasePos = u.phasePos || {};
    if (opp.baseTactics) o.tactics = Object.assign({}, opp.baseTactics);   // how they usually play: the profile the page quotes
    const m = FM.createMatch(u, o, seed);
    m.userId = u.id;
    if (phase === 'press') FM.startBuildUpTrial(m, o, 'goalkick');
    else if (phase === 'organised') FM.startFinalThirdTrial(m, o);
    else if (phase === 'build') FM.startBuildUpTrial(m, u, 'goalkick');
    else FM.startFinalThirdTrial(m, u);
    m.noOffside = false; m.forcePass = false;
    return { m, u, o };
  }
  // our players, where the scenario has them (and, when we have the ball, the ball with the man who has it)
  // The man with the ball and any man the manager has placed himself stay where the board has them; every other player of ours moves as the
  // team would, by its instructions or else the formation's own positions, so the shape follows the ball while someone dribbles or passes.
  // When defending nobody is the man on the ball: only the ones the manager has put somewhere himself stay put, and the rest of the team
  // defends as it would, moving as the other side move the ball.
  const held = (S, i) => (S.attack ? i === S.holder : false) || !!(S.pins && S.pins[i]);
  function syncOwn(S) {
    const { m, u } = S.eng;
    S.own.forEach((o, i) => { const p = u.players[i]; if (!p || !held(S, i)) return; p.x = o.y; p.y = o.x; p.vx = 0; p.vy = 0; });
    if (S.attack && S.holder != null && m.carrier && m.carrier.team === u) {
      const h = u.players[S.holder];
      m.carrier.player = h; m.ball.x = h.x; m.ball.y = h.y; m.ball.state = 'carried';
    }
  }
  // From a goal kick nobody on the other side may be in the penalty area until the ball has been played.
  const BOX_D = 17.5, BOX_HALF = 21;
  function boxLocked(S) { return S.phase === 'build' && S.attack && !S.beats.some((b) => b.type === 'pass'); }
  function keepOutOfBox(S) {
    if (!boxLocked(S)) return;
    S.opp.forEach((q) => { if (q.p.group !== 'GK' && q.y < BOX_D && Math.abs(q.x - W / 2) < BOX_HALF) q.y = BOX_D; });
    S.eng.o.players.forEach((p) => { if (p.group !== 'GK' && p.x < BOX_D && Math.abs(p.y - W / 2) < BOX_HALF) { p.x = BOX_D; p.vx = 0; } });
  }
  // the engine's picture of the ball: with the man the board says has it, our men where the board has them
  function armEngine(S) {
    const { m, u } = S.eng, h = S.own[S.holder];
    m.ball.x = h.y; m.ball.y = h.x; m.ball.state = 'carried';
    m.carrier = { team: u, player: u.players[S.holder] };
    syncOwn(S);
    m.lastTeam = u; m.nextDecision = m.clock + 999;
  }
  // Team-mates do not stand on top of each other: the ones moving as the team would are kept a few metres apart.
  function keepApart(S, minD) {
    const md = minD || 6.5, { u } = S.eng;
    for (let round = 0; round < 3; round++) {
      for (let i = 0; i < S.own.length; i++) {
        for (let j = i + 1; j < S.own.length; j++) {
          const a = S.own[i], b = S.own[j];
          if (a.p.group === 'GK' || b.p.group === 'GK') continue;
          const dx = b.x - a.x, dy = b.y - a.y, dd = Math.hypot(dx, dy);
          if (dd >= md) continue;
          const ha = held(S, i), hb = held(S, j);
          if (ha && hb) continue;
          const ux = dd > 0.01 ? dx / dd : 1, uy = dd > 0.01 ? dy / dd : 0, push = md - dd;
          const fa = ha ? 0 : hb ? 1 : 0.5, fb = hb ? 0 : ha ? 1 : 0.5;
          a.x -= ux * push * fa; a.y -= uy * push * fa; b.x += ux * push * fb; b.y += uy * push * fb;
          a.x = clamp(a.x, 1, W - 1); a.y = clamp(a.y, 1, L - 1); b.x = clamp(b.x, 1, W - 1); b.y = clamp(b.y, 1, L - 1);
        }
      }
    }
    S.own.forEach((q, i) => { if (held(S, i)) return; const p = u.players[i]; if (p) { p.x = q.y; p.y = q.x; } });
  }
  function readOpp(S) { const { o } = S.eng; S.opp.forEach((q, i) => { const p = o.players[i]; if (p) { q.x = p.y; q.y = p.x; } }); }
  // Run the engine on for some seconds with our players held where they are. Returns the events that happened.
  function runEngine(S, seconds) {
    const { m, u, o } = S.eng, out = [];
    const n = Math.round(seconds / 0.1), from = m.events.length;
    for (let k = 0; k < n; k++) {
      if (S.attack) { m.nextDecision = m.clock + 999; m.carry = null; }
      syncOwn(S);
      FM.stepMatch(m, 0.1);
      if (m.restart) m.restart = null;
      keepOutOfBox(S);
      if (S.attack && m.carrier && m.carrier.team !== u) { S.tackled = m.carrier.player; break; }
      if (!S.attack && S.stopOn && S.stopOn(m)) break;
    }
    S.own.forEach((q, i) => { const p = u.players[i]; if (!p) return; if (held(S, i)) { p.x = q.y; p.y = q.x; } else { q.x = p.y; q.y = p.x; } });
    keepApart(S);
    for (let e = from; e < m.events.length; e++) out.push(m.events[e]);
    readOpp(S);
    return out;
  }
  // The positions the opposition reach after a move of ours.
  function oppReact(S, noPress, secs) {
    S.tackled = null;
    S.eng.m.extraOv = null;
    if (!noPress) {
      const m = S.eng.m;
      // the engine must treat the ball as just arrived, so the press picks a new target
      m.plan = null; m.possessionReceivedAt = m.clock;
      runEngine(S, secs || 1.6);
    }
    return S.opp.map((o) => ({ x: o.x, y: o.y }));
  }
  const moveToward = (from, to) => ({ x: to.x, y: to.y });

  // ---------- what a pass does ----------
  // Is any other player standing on the line between the two ends (so a ball along the ground would run into him)?
  function laneInfo(S, a, b, exceptOwn) {
    let blocker = null, bd = 99;
    const ab = { x: b.x - a.x, y: b.y - a.y }, len2 = ab.x * ab.x + ab.y * ab.y || 1;
    const test = (o, own) => {
      const t = clamp(((o.x - a.x) * ab.x + (o.y - a.y) * ab.y) / len2, 0, 1);
      if (t < 0.05 || t > 0.97) return;
      const px = a.x + ab.x * t, py = a.y + ab.y * t, d = Math.hypot(o.x - px, o.y - py);
      if (d < bd) { bd = d; blocker = { o, own, t, d }; }
    };
    S.opp.forEach((o) => test(o, false));
    S.own.forEach((o, i) => { if (i !== S.holder && i !== exceptOwn) test(o, true); });
    return { clearance: bd, blocker };
  }
  // How long a player takes to get to a point: a moment to react, then at his pace.
  const arrive = (q, pt) => 0.3 + Math.max(0, dist(q, pt) - 0.7) / Math.max(5, ((q.p && q.p.maxSpeed) || 7.5) * 0.85);
  // A pass, as it would happen. A ball along the ground can only be cut out by a man who can get to the line before it does; one over the top
  // is contested where it comes down. A pass that does not come off runs loose near the man it was meant for, and whoever gets to it first has it.
  function evaluatePass(S, end) {
    const from = S.own[S.holder], rng = FM.mulberry32((S.seed + S.beats.length * 7919) >>> 0);
    // who it is meant for: the nearest of his own men to where the ball is let go
    let to = null, bd = 7;
    S.own.forEach((o, i) => { if (i === S.holder) return; const dd = dist(o, end); if (dd < bd) { bd = dd; to = i; } });
    const target = to != null ? S.own[to] : end;
    const d = dist(from, target);
    const lane = laneInfo(S, from, target, to);
    const aerial = d > 32 || (lane.blocker && lane.clearance < 1.8);
    const press = Math.min.apply(null, S.opp.map((o) => dist(o, target)).concat([30]));
    // how hard the pass is: only the opposition make a lane difficult (a team-mate near the line is somebody to play it to, not in the way)
    const laneOpp = (() => {
      const ab = { x: target.x - from.x, y: target.y - from.y }, l2 = ab.x * ab.x + ab.y * ab.y || 1;
      let m = 30;
      S.opp.forEach((q) => { const t = clamp(((q.x - from.x) * ab.x + (q.y - from.y) * ab.y) / l2, 0, 1); if (t < 0.05 || t > 0.97) return; m = Math.min(m, Math.hypot(q.x - (from.x + ab.x * t), q.y - (from.y + ab.y * t))); });
      return m;
    })();
    const out = (o) => Object.assign({ from: S.holder, to, end: { x: target.x, y: target.y }, d, aerial, lane: lane.clearance, winner: null, loose: false }, o);
    if (!aerial) {
      const ab = { x: target.x - from.x, y: target.y - from.y }, len2 = ab.x * ab.x + ab.y * ab.y || 1, V = 17;
      const cands = [];
      S.opp.forEach((q, j) => {
        const t = clamp(((q.x - from.x) * ab.x + (q.y - from.y) * ab.y) / len2, 0, 1);
        if (t < 0.06 || t > 0.97) return;
        const P = { x: from.x + ab.x * t, y: from.y + ab.y * t };
        const margin = d * t / V - arrive(q, P);
        if (margin > -0.2) cands.push({ j, t, P, margin });
      });
      cands.sort((a, b) => a.t - b.t);
      for (const c of cands) {
        if (rng() < 1 / (1 + Math.exp(-(c.margin - 0.05) / 0.2))) return out({ ok: false, p: 0, how: 'cut', winner: c.j, land: c.P });
      }
    }
    let p = aerial ? FM.passProb(from.p, d, 9, press) * 0.9 - (press < 2.5 ? 0.12 : 0) : FM.passProb(from.p, d, Math.min(laneOpp, 12), press);
    if (to == null) p *= 0.55;   // into space: nobody is meant to be there
    p = clamp(p, 0.04, 0.97);
    if (rng() < p) return out({ ok: true, p, how: 'ok', land: { x: target.x, y: target.y } });
    // not completed: it runs a few metres from where it was meant to go
    const ang = rng() * Math.PI * 2, rad = 2 + rng() * 3;
    const land = { x: clamp(target.x + Math.cos(ang) * rad, 1, W - 1), y: clamp(target.y + Math.sin(ang) * rad, 1, L - 1) };
    let bj = -1, bt = Infinity;
    S.opp.forEach((q, j) => { const t = arrive(q, land); if (t < bt) { bt = t; bj = j; } });
    // our own side competes for it too: the man it was meant for, or for a ball into space the nearest team-mate who could run onto it
    let tr = Infinity;
    if (to != null) tr = arrive(S.own[to], land);
    else S.own.forEach((q, k) => { if (k === S.holder || (q.p.group === 'GK' && from.p.group !== 'GK')) return; tr = Math.min(tr, arrive(q, land)); });
    if (tr <= bt + 0.15) return out({ ok: true, p, how: 'loose', loose: true, land });
    return out({ ok: false, p, how: aerial ? 'air' : 'loose', winner: bj, land });
  }

  // ---------- the scenario itself ----------
  function fresh(team, opp, phase) {
    const own = startPositions(team, phase);
    const press = FM.scenarioOppPress(opp);
    const defending = phase === 'organised' || phase === 'press';
    const seed = (Date.now() & 0xfffff) + 17;
    const eng = makeEngine(team, opp, phase, seed);
    const oppP = eng.o.players.map((p, i) => ({ p: opp.players[i] || p, x: 0, y: 0 }));
    const S = { sig: team.formationKey + ':' + team.players.map((p) => p.id).join(','), team, oppTeam: opp, phase, press, own, opp: oppP, ball: startBall(phase), holder: null, beats: [], seed, log: [], lost: false, started: false, start: null, finished: false, eng, attack: !defending, defending, snaps: [], events: [] };
    if (defending) {
      // they have the ball at their goal kick; our men stand where the engine would put them for that
      S.own.forEach((o, i) => { const p = eng.u.players[i]; if (p) { o.x = p.y; o.y = p.x; } });
      S.holder = null;
      S.ball = { x: eng.m.ball.y, y: eng.m.ball.x };
      readOpp(S);
      S.start = own.map((o) => ({ x: o.x, y: o.y }));
      return S;
    }
    // the man with the ball: the goalkeeper for a goal kick, otherwise the player nearest to where the ball is
    const nearest = own.map((o, i) => ({ i, d: dist(o, S.ball) })).sort((a, b) => a.d - b.d)[0];
    const carried = phase !== 'build' && team.scenarioBall && team.scenarioBall[phaseKey(phase)];
    const ci = carried ? own.findIndex((o) => o.p.index === carried.pi) : -1;
    S.carried = ci >= 0;
    S.holder = phase === 'build' ? Math.max(0, own.findIndex((o) => o.p.group === 'GK')) : (ci >= 0 ? ci : nearest.i);
    S.ball = { x: own[S.holder].x + 0.8, y: own[S.holder].y + 0.6 };
    // the opposition stand in their own shape for this ball (not yet reacting to anything); the engine is armed when the scenario starts
    if (phase !== 'build') {
      eng.m.ball.x = S.ball.y; eng.m.ball.y = S.ball.x;
      eng.o.players.forEach((p) => { const q = FM.targetFor(eng.o, p, eng.m.ball, false); p.x = q.x; p.y = q.y; p.vx = 0; p.vy = 0; });
    }
    readOpp(S);
    keepOutOfBox(S);
    S.tackled = null;
    S.start = own.map((o) => ({ x: o.x, y: o.y }));
    return S;
  }

  // From the beats, what the team does. Everything is a number the engine already uses.
  FM.scenarioExtract = function (S) {
    const passes = S.beats.filter((b) => b.type === 'pass'), good = passes.filter((b) => b.ok);
    const dribbles = S.beats.filter((b) => b.type === 'dribble');
    const pass = passes.length ? passes : [];
    const mean = (a, f) => (a.length ? a.reduce((s, x) => s + f(x), 0) / a.length : 0);
    const meanLen = mean(pass, (b) => b.d);
    const aerialShare = pass.length ? pass.filter((b) => b.aerial).length / pass.length : 0;
    const tight = pass.length ? pass.filter((b) => !b.aerial && b.lane < 3).length / pass.length : 0;
    const dribbled = dribbles.reduce((s, b) => s + b.d, 0);
    const recvs = good.filter((b) => b.to != null).map((b) => b.endXY);
    const centreShare = recvs.length ? recvs.filter((o) => Math.abs(o.x - W / 2) < 13).length / recvs.length : 0.5;
    const wideShare = recvs.length ? recvs.filter((o) => Math.abs(o.x - W / 2) > 21).length / recvs.length : 0.3;
    const forward = pass.length ? pass.filter((b) => b.dy > 3).length / pass.length : 0.5;
    const out = {
      passes: passes.length, completed: good.length, meanLen: Math.round(meanLen), aerialShare, tight, dribbled: Math.round(dribbled), centreShare, wideShare, forward,
      direct: clamp((meanLen - 9) / 26, 0, 1), width: clamp(0.85 + 0.5 * (mean(recvs, (o) => Math.abs(o.x - W / 2)) / 34), 0.75, 1.2),
      risk: clamp(0.2 + 0.55 * tight + 0.35 * aerialShare, 0, 1), dribbleFreedom: clamp(0.25 + dribbled / 45, 0.1, 0.95),
      tempo: clamp(0.75 - 0.05 * passes.length + 0.2 * forward, 0.2, 0.9),
    };
    return out;
  };
  // Write what was shown into the team: its tactics for this phase, the instructions that follow from it, and where it ends up.
  FM.scenarioApply = function (S) {
    const team = S.team, ph = PHASES[S.phase], shown = FM.scenarioExtract(S), blend = 0.75;
    // Keep each demonstration as evidence. Later scenarios are combined rather than
    // simply replacing the first one, so the inferred style reflects repeated examples.
    team.scenarioEvidence = team.scenarioEvidence || {};
    const evidence = team.scenarioEvidence[S.phase] = team.scenarioEvidence[S.phase] || [];
    evidence.push(shown); if (evidence.length > 10) evidence.shift();
    const avg = (k) => evidence.reduce((sum, item) => sum + (Number(item[k]) || 0), 0) / evidence.length;
    const ex = Object.assign({}, shown, {
      passes: evidence.reduce((sum, item) => sum + item.passes, 0), completed: evidence.reduce((sum, item) => sum + item.completed, 0),
      meanLen: Math.round(avg('meanLen')), aerialShare: avg('aerialShare'), tight: avg('tight'), dribbled: Math.round(avg('dribbled')),
      centreShare: avg('centreShare'), wideShare: avg('wideShare'), forward: avg('forward'), direct: avg('direct'), width: avg('width'),
      risk: avg('risk'), dribbleFreedom: avg('dribbleFreedom'), tempo: avg('tempo'), scenarios: evidence.length,
    });
    const set = (k, v) => { if (v == null || team.tactics[k] == null) return; team.tactics[k] = Math.round((team.tactics[k] * (1 - blend) + v * blend) * 100) / 100; };
    if (S.phase === 'build') { set('buildDirect', ex.direct); set('beatPress', clamp(0.2 + 0.9 * ex.aerialShare + 0.4 * ex.direct, 0, 1)); }
    else if (S.phase === 'midfield') { set('directness', ex.direct); }
    else { set('finalRisk', ex.risk); set('shootFreedom', clamp(0.35 + 0.4 * (S.beats.some((b) => b.type === 'shot') ? 1 : 0), 0, 1)); }
    set('risk', ex.risk); set('tempo', ex.tempo); set('dribbleFreedom', ex.dribbleFreedom);
    if (S.phase !== 'final') set('attackWidth', ex.width);
    // instructions that came from this demonstration replace the ones from the last time
    team.rules = (team.rules || []).filter((r) => !(r.source === 'scenario' && r.when && r.when.stage && r.when.stage[0] === ph.stage));
    const add = (scope, effects, text) => { const r = FM.rulesClean({ scope, when: { stage: [ph.stage] }, effects, source: 'scenario', text }, team.players.map((p) => p.number)); if (r) { team.rules.push(r); } };
    const T = { kind: 'team' };
    if (ex.passes >= 2) {
      add(T, [{ type: 'passLength', pref: ex.meanLen < 15 ? 'short' : 'long', strength: ex.meanLen < 15 ? clamp((15 - ex.meanLen) / 10 + 0.4, 0.4, 0.9) : clamp((ex.meanLen - 15) / 15 + 0.4, 0.4, 0.9) }]);
      if (ex.centreShare >= 0.6) add(T, [{ type: 'passTarget', to: { side: 'centre' }, weight: 0.7 }]);
      else if (ex.wideShare >= 0.5) add(T, [{ type: 'passTarget', to: { side: 'wide' }, weight: 0.7 }]);
      if (ex.aerialShare >= 0.3) add(T, [{ type: 'passDirection', dir: 'forward', weight: 0.5 }]);
    }
    // a man who was moved a long way is asked to stand there
    S.own.forEach((o, i) => {
      const s = S.start[i], dx = o.x - s.x, dy = o.y - s.y;
      if (!(S.pins && S.pins[i]) || o.p.group === 'GK' || Math.hypot(dx, dy) < 9) return;
      const eff = { type: 'position', forward: Math.round(clamp(dy, -15, 15) * 10) / 10, wide: Math.round(clamp((o.x >= W / 2 ? dx : -dx), -12, 12) * 10) / 10, phase: 'with' };
      add({ kind: 'slot', slot: o.p.slotKey }, [eff]);
    });
    // where the team stood before it began is where this phase starts (for the goal kick)
    if (S.phase === 'build' || S.phase === 'midfield') { team.phasePos = team.phasePos || {}; const kk = S.phase === 'build' ? 'build' : 'buildEnd'; team.phasePos[kk] = team.phasePos[kk] || {}; S.own.forEach((o, i) => { team.phasePos[kk][o.p.index] = { d: clamp(S.start[i].y / L, 0.03, 0.97), w: clamp(S.start[i].x / W, 0.04, 0.96) }; }); }
    // where the team got to is where the next phase starts (and for the last phase, where the attack finished)
    const end = saved(team);
    team.scenarioBall = team.scenarioBall || {};
    if (S.holder != null && S.own[S.holder]) team.scenarioBall[ph.end] = { pi: S.own[S.holder].p.index };
    // (a board placed by hand for that diagram no longer takes precedence over where this phase really ended)
    if (team.phasePos && team.phasePos[ph.end]) team.phasePos[ph.end] = {};
    end[ph.end] = {}; S.own.forEach((o) => { end[ph.end][o.p.index] = { d: clamp(o.y / L, 0.03, 0.97), w: clamp(o.x / W, 0.04, 0.96) }; });
    team.scenarioInfo = team.scenarioInfo || {};
    team.scenarioInfo[S.phase] = { at: new Date().toISOString(), vs: S.press.label, passes: ex.passes, completed: ex.completed, meanLen: ex.meanLen, aerial: Math.round(ex.aerialShare * 100), dribbled: ex.dribbled, lost: S.lost, scenarios: evidence.length };
    if (FM.inferShapeTactics) FM.inferShapeTactics(team);
    return ex;
  };

  // The team's defending, from the set-ups shown: where it stood when they had the ball deep in their own half (pressing their build-up), in
  // midfield, and near our goal; and from how high the line was, how many went to the ball and how wide it stood.
  FM.scenarioApplyDefend = function (S) {
    const team = S.team, snaps = S.snaps.length ? S.snaps : [{ ballX: S.eng.m.ball.x, own: S.own.map((o) => ({ x: o.x, y: o.y })) }];
    const pressing = S.phase === 'press';
    // pressing their build-up is one shape (whatever part of their half the ball is in); defending your third is the shape in midfield and near goal
    const zoneOf = (bx) => (pressing ? 'press' : bx > 35 ? 'without' : 'withoutEnd');
    const lastIn = {}; snaps.forEach((sn) => { lastIn[zoneOf(sn.ballX)] = sn; });
    const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
    const out = S.own.map((o, i) => ({ o, i })).filter(({ o }) => o.p.group !== 'GK');
    const pressersOf = (sn) => { const ball = { x: 0, y: 0 }; const be = { x: S.eng.m.ball.y, y: sn.ballX }; return out.filter(({ i }) => Math.hypot(sn.own[i].x - be.x, sn.own[i].y - be.y) < 8).length; };
    let press = mean(snaps.map(pressersOf)), pressDeep = mean(snaps.filter((sn) => sn.ballX > 70).map(pressersOf));
    const lineOf = (sn) => { const ys = out.map(({ i }) => sn.own[i].y).sort((a, b) => a - b).slice(0, 4); return mean(ys) / L; };
    // the height of the line is read where it matters: with the ball in midfield (the shape it holds), not when the ball is far away or on top of the box
    const midSnaps = snaps.filter((sn) => zoneOf(sn.ballX) === 'without');
    let line = mean((midSnaps.length ? midSnaps : snaps).map(lineOf));
    const spread = (sn) => { const xs = out.map(({ i }) => sn.own[i].x), m = mean(xs); return Math.sqrt(mean(xs.map((x) => (x - m) * (x - m)))); };
    let sd = mean(snaps.map(spread));
    team.scenarioDefEvidence = team.scenarioDefEvidence || {};
    const evidence = team.scenarioDefEvidence[S.phase] = team.scenarioDefEvidence[S.phase] || [];
    evidence.push({ press, pressDeep, line, sd, setups: snaps.length }); if (evidence.length > 10) evidence.shift();
    const evidenceMean = (k) => mean(evidence.map((item) => item[k]));
    press = evidenceMean('press'); pressDeep = evidenceMean('pressDeep'); line = evidenceMean('line'); sd = evidenceMean('sd');
    const set = (k, v) => { if (team.tactics[k] != null) team.tactics[k] = Math.round((team.tactics[k] * 0.25 + v * 0.75) * 100) / 100; };
    if (pressing) {
      // how hard they go for a build-up: how many go to the ball, and how high they stand to do it
      set('pressBuildUp', clamp(0.1 + press / 4, 0.05, 0.95));
      set('pressing', clamp(0.2 + press / 6, 0.1, 0.95));
    } else {
      set('lineHeight', clamp((line - 0.14) / 0.42, 0, 1));
      set('pressing', clamp(0.15 + press / 5, 0.1, 0.95));
      set('defWidth', clamp(0.7 + (sd - 9) / 14 * 0.55, 0.7, 1.25));
    }
    // the shapes themselves: for each part of the pitch the ball was in, where the team stood
    team.phasePos = team.phasePos || {};
    Object.keys(lastIn).forEach((k) => {
      team.phasePos[k] = team.phasePos[k] || {};
      S.own.forEach((o, i) => { const q = lastIn[k].own[i]; team.phasePos[k][o.p.index] = { d: clamp(q.y / L, 0.03, 0.97), w: clamp(q.x / W, 0.04, 0.96) }; });
    });
    team.scenarioInfo = team.scenarioInfo || {};
    team.scenarioInfo[S.phase] = { at: new Date().toISOString(), vs: S.press.label, passes: S.events.length, completed: S.events.length, meanLen: 0, aerial: 0, dribbled: 0, lost: false, defend: true, zones: Object.keys(lastIn), scenarios: evidence.length };
    if (FM.inferShapeTactics) FM.inferShapeTactics(team);
    const zones = Object.keys(lastIn).map((k) => ({ press: 'when they build from the back', without: 'when they are in midfield and the edge of your third', withoutEnd: 'when they are near your goal' }[k]));
    return { scenarios: evidence.length, text: `${evidence.length} scenario${evidence.length === 1 ? '' : 's'} applied. The team will defend with ${line > 0.4 ? 'a high' : line > 0.26 ? 'a middling' : 'a deep'} line, ${press >= 2.5 ? 'press the ball hard' : press >= 1.4 ? 'close the ball down with a couple of players' : 'sit off and let the ball come'}, and stand ${sd > 15 ? 'wide' : sd < 11 ? 'narrow and compact' : 'at a normal width'}.` };
  };


  // ---------- the first-time demonstration ----------
  // A short looping picture of what the cursor does here: drag the ball to pass it, drag a player to move him, with the other side reacting.
  FM.scenarioDemo = function () {
    const old = document.getElementById('scnDemo'); if (old) old.remove();
    const T = [0, 0.6, 1.0, 2.2, 2.8, 3.2, 5.0, 6.4, 7.4, 8].map((t) => +(t / 8).toFixed(4)).join(';');
    const anim = (attr, vals) => `<animate attributeName="${attr}" dur="8s" repeatCount="indefinite" keyTimes="${T}" values="${vals.join(';')}"/>`;
    // positions at the ten key times
    const cur = { x: [150, 108, 108, 62, 62, 62, 62, 62, 150, 150], y: [252, 232, 232, 192, 192, 192, 138, 138, 252, 252] };
    const ball = { x: [108, 108, 108, 66, 66, 66, 66, 66, 108, 108], y: [232, 232, 232, 192, 192, 192, 138, 138, 232, 232] };
    const cb = { x: [60, 60, 60, 60, 60, 60, 60, 60, 60, 60], y: [190, 190, 190, 190, 190, 190, 136, 136, 190, 190] };
    const oa = { x: [80, 80, 80, 80, 80, 80, 74, 74, 80, 80], y: [120, 120, 120, 120, 120, 120, 134, 134, 120, 120] };
    const ob = { x: [120, 120, 120, 120, 120, 120, 112, 112, 120, 120], y: [118, 118, 118, 118, 118, 118, 130, 130, 118, 118] };
    const moving = (p, fill) => `<circle r="7" fill="${fill}" stroke="#fff" stroke-width="1.4">${anim('cx', p.x)}${anim('cy', p.y)}</circle>`;
    const still = (x, y, fill) => `<circle cx="${x}" cy="${y}" r="7" fill="${fill}" stroke="#fff" stroke-width="1.4"/>`;
    const svg = `<svg viewBox="0 0 200 284" role="img" aria-label="A cursor drags the ball to a centre-back to pass it, then drags him forward while the opposition shift">
      <rect x="0" y="0" width="200" height="262" rx="8" fill="#2d7a3c"/>
      <rect x="0" y="0" width="200" height="262" rx="8" fill="none" stroke="#e8efe6" stroke-opacity=".7"/>
      <line x1="0" y1="86" x2="200" y2="86" stroke="#e8efe6" stroke-opacity=".6"/><circle cx="100" cy="86" r="22" fill="none" stroke="#e8efe6" stroke-opacity=".6"/>
      <rect x="45" y="210" width="110" height="52" fill="none" stroke="#e8efe6" stroke-opacity=".6"/><rect x="72" y="236" width="56" height="26" fill="none" stroke="#e8efe6" stroke-opacity=".6"/>
      ${still(100, 242, '#c0392b')}${still(150, 188, '#c0392b')}${still(100, 160, '#c0392b')}${still(40, 140, '#c0392b')}${still(160, 140, '#c0392b')}
      ${moving(cb, '#c0392b')}
      ${moving(oa, '#f1c04f')}${moving(ob, '#f1c04f')}${still(100, 80, '#f1c04f')}${still(45, 96, '#f1c04f')}${still(155, 96, '#f1c04f')}
      <line x1="104" y1="238" x2="66" y2="192" stroke="#fff" stroke-width="2" stroke-dasharray="4 5" opacity="0">
        ${anim('x2', ball.x)}${anim('y2', ball.y)}${anim('opacity', [0, 0, 1, 1, 0, 0, 0, 0, 0, 0])}
      </line>
      <circle r="4" fill="#fff" stroke="#000" stroke-width="1">${anim('cx', ball.x)}${anim('cy', ball.y)}</circle>
      <g><path d="M0 0 L0 15 L4 11 L7 17 L10 15.5 L7 10 L12 10 Z" fill="#fff" stroke="#111" stroke-width="1.1" stroke-linejoin="round"/>
        <animateTransform attributeName="transform" type="translate" dur="8s" repeatCount="indefinite" keyTimes="${T}" values="${cur.x.map((x, i) => x + ' ' + cur.y[i]).join(';')}"/></g>
      <text x="100" y="278" text-anchor="middle" font-size="11" font-weight="700" fill="#f4edda">Drag the ball to pass it${anim('opacity', [0, 1, 1, 1, 0, 0, 0, 0, 0, 0])}</text>
      <text x="100" y="278" text-anchor="middle" font-size="11" font-weight="700" fill="#f4edda">Drag a player to move him${anim('opacity', [0, 0, 0, 0, 1, 1, 1, 1, 0, 0])}</text>
    </svg>`;
    const wrap = document.createElement('div');
    wrap.id = 'scnDemo'; wrap.className = 'cap-modal';
    wrap.innerHTML = `<div class="card scn-demo" role="dialog" aria-modal="true" aria-label="How the scenario works">
        <h3>Show the team how to play it</h3>
        <div class="scn-demo-pic">${svg}</div>
        <ul>
          <li><b>Drag the ball</b> to where you want it to go and let go: that is the pass. Over an opponent on the way, it is in the air.</li>
          <li><b>Drag a player</b> to move him. With the ball, he dribbles, and can be tackled.</li>
          <li>The other side reacts as you play. When the ball is carried or passed beyond the halfway line, this phase is done.</li>
        </ul>
        <div class="row" style="justify-content:flex-end"><button type="button" class="cap-intro-ok" id="scnDemoOk">Got it</button></div>
      </div>`;
    document.body.appendChild(wrap);
    const close = () => { wrap.remove(); try { localStorage.setItem('lm_football_scn_demo_seen_v1', '1'); } catch (e) { /* fine */ } };
    wrap.querySelector('#scnDemoOk').addEventListener('click', close);
    wrap.addEventListener('click', (ev) => { if (ev.target === wrap) close(); });
  };
  FM.scenarioDemoSeen = () => { try { return localStorage.getItem('lm_football_scn_demo_seen_v1') === '1'; } catch (e) { return true; } };

  // ---------- drawing ----------
  function pitchSvg() {
    const X = (m) => (m * PS).toFixed(1), Y = (m) => ((L - m) * PS).toFixed(1), ln = 'stroke="rgba(255,255,255,.8)" stroke-width="1.6" fill="none"';
    let s = '';
    for (let i = 0; i < 15; i++) s += `<rect x="0" y="${(i * L * PS / 15).toFixed(1)}" width="${W * PS}" height="${(L * PS / 15 + 0.5).toFixed(1)}" fill="${i % 2 ? '#2E7D3E' : '#2A7539'}"/>`;
    s += `<rect x="0" y="0" width="${W * PS}" height="${L * PS}" ${ln}/><line x1="0" y1="${Y(L / 2)}" x2="${W * PS}" y2="${Y(L / 2)}" ${ln}/><circle cx="${X(W / 2)}" cy="${Y(L / 2)}" r="${9.15 * PS}" ${ln}/>`;
    // the goals: a frame with its net behind each goal line
    [0, L].forEach((gy) => {
      const top = gy === L;
      s += `<rect x="${X(W / 2 - 3.66)}" y="${top ? (-2 * PS).toFixed(1) : (L * PS).toFixed(1)}" width="${(7.32 * PS).toFixed(1)}" height="${(2 * PS).toFixed(1)}" fill="rgba(255,255,255,.14)" stroke="rgba(255,255,255,.95)" stroke-width="2"/>`;
      for (let k = 1; k < 6; k++) s += `<line x1="${X(W / 2 - 3.66 + k * 7.32 / 6)}" y1="${top ? (-2 * PS).toFixed(1) : (L * PS).toFixed(1)}" x2="${X(W / 2 - 3.66 + k * 7.32 / 6)}" y2="${top ? '0' : ((L + 2) * PS).toFixed(1)}" stroke="rgba(255,255,255,.35)" stroke-width="1"/>`;
    });
    [[0, 1], [L, -1]].forEach(([y0, dir]) => {
      s += `<rect x="${X(W / 2 - 20.16)}" y="${dir > 0 ? Y(16.5) : Y(L)}" width="${40.32 * PS}" height="${16.5 * PS}" ${ln}/><rect x="${X(W / 2 - 9.16)}" y="${dir > 0 ? Y(5.5) : Y(L)}" width="${18.32 * PS}" height="${5.5 * PS}" ${ln}/>`;
    });
    return s;
  }
  function boardSvg(S, tween) {
    const X = (m) => (m * PS).toFixed(1), Y = (m) => ((L - m) * PS).toFixed(1);
    let s = pitchSvg();
    // the line he last passed along, and the dribble
    S.beats.slice(-3).forEach((b) => {
      if (b.type === 'pass') { const a = b.fromXY, e = b.endXY; s += `<line x1="${X(a.x)}" y1="${Y(a.y)}" x2="${X(e.x)}" y2="${Y(e.y)}" stroke="${b.ok ? '#FFE27A' : '#FF5A36'}" stroke-width="3.2"${b.aerial ? ' stroke-dasharray="2 7" stroke-linecap="round"' : ''}${b.ok ? '' : ' stroke-dasharray="7 5"'} opacity=".85"/>`; }
      if (b.type === 'dribble') s += `<line x1="${X(b.fromXY.x)}" y1="${Y(b.fromXY.y)}" x2="${X(b.endXY.x)}" y2="${Y(b.endXY.y)}" stroke="#9fd0ff" stroke-width="3" stroke-dasharray="1 6" stroke-linecap="round" opacity=".85"/>`;
    });
    const kit = (t, away) => { const k = t.kit || {}; return away ? { shirt: (t.kits && t.kits.away && t.kits.away[0]) || '#3b82c4', number: (t.kits && t.kits.away && t.kits.away[1]) || '#fff' } : { shirt: k.shirt || '#c0392b', number: k.number || '#fff' }; };
    const ok = kit(S.team, false);
    const oppKit = { shirt: (S.oppTeam.kits && S.oppTeam.kits.away && S.oppTeam.kits.away[0]) || '#3b82c4', number: (S.oppTeam.kits && S.oppTeam.kits.away && S.oppTeam.kits.away[1]) || '#fff' };
    S.opp.forEach((o) => {
      const q = tween && tween.opp ? tween.opp(o) : o;
      const hasIt = S.defending && S.eng && S.eng.m.carrier && S.eng.m.carrier.player && S.eng.m.carrier.player.number === o.p.number && S.eng.m.carrier.team === S.eng.o;
      s += `<g><circle cx="${X(q.x)}" cy="${Y(q.y)}" r="${1.6 * PS}" fill="${oppKit.shirt}" stroke="${hasIt ? '#FFE27A' : oppKit.number}" stroke-width="${hasIt ? 3.5 : 2}" opacity=".92"/><text x="${X(q.x)}" y="${(Y(q.y) * 1 + 4).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="${oppKit.number}" font-family="sans-serif">${o.p.number}</text></g>`;
    });
    S.own.forEach((o, i) => {
      const hold = i === S.holder;
      s += `<g data-own="${i}" style="cursor:grab"><circle cx="${X(o.x)}" cy="${Y(o.y)}" r="${3.25 * PS}" fill="transparent"/><circle cx="${X(o.x)}" cy="${Y(o.y)}" r="${1.75 * PS}" fill="${ok.shirt}" stroke="${hold ? '#FFE27A' : ok.number}" stroke-width="${hold ? 3.5 : 2}"/><text x="${X(o.x)}" y="${(+Y(o.y) + 4).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" fill="${ok.number}" font-family="sans-serif" pointer-events="none">${o.p.number}</text><text x="${X(o.x)}" y="${(+Y(o.y) + 1.75 * PS + 12).toFixed(1)}" text-anchor="middle" font-size="10" fill="#fff" stroke="#000" stroke-width="2.5" style="paint-order:stroke" font-family="sans-serif" pointer-events="none">${esc(o.p.name.split(' ').slice(-1)[0])}</text></g>`;
    });
    const b = S.ball;
    s += `<g data-ball="1" style="cursor:grab"><circle cx="${X(b.x)}" cy="${Y(b.y)}" r="${2.2 * PS}" fill="transparent"/><circle cx="${X(b.x)}" cy="${Y(b.y)}" r="${0.95 * PS}" fill="#fff" stroke="#000" stroke-width="2" pointer-events="none"/></g>`;
    return s;
  }

  // ---------- the screen ----------
  FM.renderScenario = function (host, team, opp, phase, hooks) {
    const ph = PHASES[phase];
    if (!host || !ph || !opp) return;
    const store = (hooks && hooks.store) || (host._scn = host._scn || {});
    let S = store[phase];
    // who is in the eleven and the shape they are in: if either has changed since the scenario was set up, it is set up again from the squad
    const lineupSig = () => team.formationKey + ':' + team.players.map((p) => p.id).join(',');
    if (!S || S.team !== team || S.oppTeam !== opp || S.sig !== lineupSig()) { S = null; store[phase] = null; }
    // A player is named by his surname; one of theirs who shares a surname with one of ours is named with his club, so it is never unclear whose
    // man a message is about.
    const surname = (n) => n.split(' ').slice(-1)[0];
    const nm = (p) => {
      if (!p || !p.name) return 'a defender';
      const sn = surname(p.name), ours = S && S.own && S.own.some((o) => o.p.name === p.name);
      return !ours && S && S.own && S.own.some((o) => surname(o.p.name) === sn) ? `${sn} (${opp.name})` : sn;
    };
    const info = (team.scenarioInfo || {})[phase], press = FM.scenarioOppPress(opp);
    // "sit in a low block" -> "sits in a low block", for a sentence about one side
    const third = (l) => String(l || '').replace(/^(press|hold|sit)/, (w) => w + (w === 'press' ? 'es' : 's'));
    // what the phase is about, said for the side they are up against
    // On the pressing page what matters is how THEY build: out from the back, or long
    const bt = (opp && (opp.baseTactics || opp.tactics)) || {}, bd = bt.buildDirect == null ? 0.4 : bt.buildDirect;
    const buildStyle = bd >= 0.6 ? { you: 'go long from goal kicks', one: 'goes long from goal kicks', how: 'Expect the goal kick to go long, so the press has to be ready for the second ball as well as the short pass.' }
      : bd <= 0.3 ? { you: 'play out from the back, short and patient', one: 'plays out from the back, short and patient', how: 'Expect them to play it out short, so the press has to close the passing lanes and the man on the ball.' }
      : { you: 'mix it, playing out when it is on and going long when it is not', one: 'mixes it, playing out when it is on and going long when it is not', how: 'They could do either, so the press has to be ready for the short pass and the long ball.' };
    const goalText = () => {
      if (phase === 'press') return buildStyle.how + ' ' + ph.goal;
      if (phase === 'build') return press.value >= 0.6 ? 'Get the ball out of your half, past their press.' : press.value >= 0.4 ? 'Get the ball out of your half and past their mid block.' : 'Get the ball out of your half. They will not come to you, so the pass you make and the space you find is the whole problem.';
      return ph.goal;
    };
    const terminal = () => !!(S && (S.done || S.ended || S.lost || S.finished));
    const outcomeTitle = () => {
      if (S.finished) return 'APPLIED';
      if (S.lost) return 'POSSESSION LOST';
      if (phase === 'build') return 'HALFWAY LINE REACHED';
      if (phase === 'midfield') return 'FINAL THIRD REACHED';
      if (phase === 'final') {
        const shot = S.beats && S.beats.filter((b) => b.type === 'shot').slice(-1)[0];
        return shot && shot.outcome === 'goal' ? 'GOAL' : 'ATTACK COMPLETE';
      }
      if (S.won) return 'BALL WON';
      if (phase === 'press') return 'PRESS COMPLETE';
      return 'PHASE COMPLETE';
    };
    const pitchOverlay = () => {
      if (!terminal()) return S && S.started && S.say ? `<div class="scn2-live" role="status">${esc(S.say)}</div>` : '';
      return `<div class="scn2-finish" role="status"><span>${esc(outcomeTitle())}</span><p>${esc((S.finished ? S.learned : S.say) || 'The scenario is complete.')}</p>
        ${S.finished
          ? `<button class="scn2-applied" type="button" disabled>✓ Applied</button><button id="scnAnother" type="button">Start another scenario</button>${ph.nextKey ? `<button class="primary" id="scnNext" type="button">Move on to ${esc(ph.next.toLowerCase())}</button>` : ''}`
          : `<button class="primary" id="scnFinish" type="button">Use this</button><button id="scnReset" type="button">Restart simulation</button>`}
      </div>`;
    };
    const draw = () => {
      if (!S) { S = fresh(team, opp, phase); store[phase] = S; }
      host.innerHTML = `<div class="scn2">
        <div class="scn2-head"><h2>${esc(ph.title)}</h2>
          <p class="desc">Preparing for ${esc(opp.name)}, who usually <b>${esc(phase === 'press' ? buildStyle.you : press.label)}</b>. ${esc(goalText())}</p>
          ${info ? `<p class="note scn2-last">${info.scenarios > 1 ? info.scenarios + ' scenarios combined: ' : 'Last shown: '}${info.passes} pass${info.passes === 1 ? '' : 'es'} (${info.completed} came off), ${info.dribbled} m dribbled, ${info.aerial}% in the air, against a side that ${esc(phase === 'press' ? buildStyle.one : third(info.vs))}.${info.lost ? ' The ball was lost.' : ''}</p>` : ''}
        </div>
        <div class="scn2-body">
          <div class="scn2-pitch"><svg id="scnSvg" viewBox="0 ${-GOAL * PS} ${W * PS} ${(L + 2 * GOAL) * PS}" role="img" aria-label="${esc(ph.title)}: drag the players and the ball, and draw passes"></svg>${pitchOverlay()}</div>
          <div class="scn2-side">
            ${S && S.defending && S.started ? `<div class="scn2-card"><h3>Defend it</h3><ul class="scn2-help">
              <li><b>Drag your players</b> to where you want them as they bring the ball ${phase === 'press' ? 'out from the back' : 'into your third'}.</li>
              <li><b>Drag one onto the man with the ball</b> to close him down: he can be tackled, and the ball is yours if it comes off.</li>
              <li>Then press <b>Play on</b> and watch what they do with the ball.</li></ul>
              <div class="scn2-stats">${S.snaps.length} set-up${S.snaps.length === 1 ? '' : 's'} shown · ${S.events.length} move${S.events.length === 1 ? '' : 's'} by them</div>
              <p class="scn2-say" id="scnSay">${esc(S.say || 'They have the ball. Set your team.')}</p>
              <div class="row"><button class="primary" id="scnPlay"${S.ended ? ' disabled' : ''}>Play on</button>${terminal() ? '' : '<button id="scnReset">Restart simulation</button>'}</div></div>`
            : S && S.started ? `<div class="scn2-card"><h3>How to play it</h3><ul class="scn2-help">
              <li><b>Drag a player</b> to move him. With the ball, that is a dribble.</li>
              <li><b>Drag the ball</b> to where you want to play it, and let go. Onto a teammate, or into space. A line follows the ball.</li>
              <li>Drag it over an opponent in the way and it is a ball in the air.</li></ul>
              <div class="scn2-stats">${S.beats.filter((b) => b.type === 'pass').length} passes · ${Math.round(S.beats.filter((b) => b.type === 'dribble').reduce((a, b) => a + b.d, 0))} m dribbled</div>
              <p class="scn2-say" id="scnSay">${esc(S.say || 'Your move.')}</p>
              <div class="row"><button id="scnUndo"${S.beats.length && !terminal() ? '' : ' disabled'}>Undo</button>${terminal() ? '' : '<button id="scnReset">Restart simulation</button>'}</div></div>`
            : `<div class="scn2-card"><h3>${ph.defend ? 'Show the team how to defend' : 'Show the team how to play it'}</h3><p class="desc">${ph.defend ? `${phase === 'press' ? esc(opp.name) + ' start with the ball at their goalkeeper and build up against you. You set the press: where your players stand, and who goes to the ball.' : esc(opp.name) + ' come at you with the ball at the edge of your third. You set where the team sits and who closes down.'} They play as they play in a match, and from what you show LastMind works out how the team defends. Go for the man on the ball and you can win it.` : `You will take the ball from the ${phase === 'build' ? 'goalkeeper' : 'man on it'} and play the phase out against ${esc(opp.name)}. They react to every move the way they play. From what you show, LastMind works out how the team plays this phase.`}</p>
              ${S && S.carried ? `<p class="desc">This starts where the last phase ended: ${esc(S.own[S.holder].p.name.split(' ').slice(-1)[0])} has the ball and your players stand where they finished.</p>` : ''}<p class="desc"><b>Drag your players into position first.</b> ${esc(opp.name)} hold their shape until you start${phase === 'build' ? ', and cannot come into the box before the ball is played' : ''}.</p><div class="row"><button class="primary" id="scnStart">Start scenario</button><button id="scnHow">How this works</button></div></div>`}
            ${S && S.finished ? `<div class="scn2-card"><h3>What it learned</h3><p class="desc">${esc(S.learned || '')}</p></div>` : ''}
          </div>
        </div></div>`;
      const svg = host.querySelector('#scnSvg');
      if (S) { svg.innerHTML = boardSvg(S); }
      else { S = fresh(team, opp, phase); store[phase] = S; svg.innerHTML = boardSvg(S); }
      wire();
    };
    const say = (t) => { if (S) S.say = t; const el = host.querySelector('#scnSay'); if (el) el.textContent = t; };
    const redraw = (tween) => { const svg = host.querySelector('#scnSvg'); if (svg) svg.innerHTML = boardSvg(S, tween); };
    // move the opposition towards where they want to be, over a moment, so the reaction can be seen
    const reactAnimated = (secs) => new Promise((resolve) => {
      const starts = S.opp.map((o) => ({ x: o.x, y: o.y })), ownStarts = S.own.map((o) => ({ x: o.x, y: o.y })), targets = oppReact(S, false, secs);
      const ownEnds = S.own.map((o) => ({ x: o.x, y: o.y }));
      S.opp.forEach((o, i) => { o.x = starts[i].x; o.y = starts[i].y; });
      S.own.forEach((o, i) => { o.x = ownStarts[i].x; o.y = ownStarts[i].y; });
      const goal = targets;
      const t0 = Date.now(), dur = (secs || 1.6) * 1000;   // the engine ran this long: they cover what that much running covers

      const step = () => {
        const k = clamp((Date.now() - t0) / dur, 0, 1), e = k;
        S.opp.forEach((o, i) => { o.x = starts[i].x + (goal[i].x - starts[i].x) * e; o.y = starts[i].y + (goal[i].y - starts[i].y) * e; });
        S.own.forEach((o, i) => { o.x = ownStarts[i].x + (ownEnds[i].x - ownStarts[i].x) * e; o.y = ownStarts[i].y + (ownEnds[i].y - ownStarts[i].y) * e; });
        redraw();
        if (k < 1) setTimeout(step, 16); else resolve();
      };
      step();
    });
    // one of theirs runs to a point, at his pace
    const tweenOpp = (idx, to) => new Promise((resolve) => {
      const q = S.opp[idx], x0 = q.x, y0 = q.y, dur = clamp(dist(q, to) / Math.max(5, (q.p.maxSpeed || 7.5)) * 1000, 250, 2600), t0 = Date.now();
      const step = () => {
        const k = clamp((Date.now() - t0) / dur, 0, 1);
        q.x = x0 + (to.x - x0) * k; q.y = y0 + (to.y - y0) * k;
        redraw();
        if (k < 1) setTimeout(step, 16); else resolve();
      };
      step();
    });
    const toBoard = (svg, ev) => { const r = svg.getBoundingClientRect(), fingerLift = ev.pointerType === 'touch' ? 28 : 0; return { x: clamp((ev.clientX - r.left) / r.width * W, 0, W), y: clamp((L + GOAL) - (ev.clientY - fingerLift - r.top) / r.height * (L + 2 * GOAL), 0, L) }; };
    function wireDefend() {
      const q = (s2) => host.querySelector(s2), svg = q('#scnSvg');
      let drag = null;
      svg.addEventListener('pointerdown', (ev) => {
        if (S.busy) return;
        const own = ev.target.closest && ev.target.closest('[data-own]');
        if (!own) return;
        try { svg.setPointerCapture(ev.pointerId); } catch (e) { /* fine */ }
        drag = { i: +own.dataset.own };
        ev.preventDefault();
      });
      svg.addEventListener('pointermove', (ev) => { if (!drag) return; const p = toBoard(svg, ev), o = S.own[drag.i]; o.x = p.x; o.y = p.y; S.pins = S.pins || {}; S.pins[drag.i] = true; redraw(); });
      // The man they have the ball with, and whether one of ours is near enough to go for it. Close him down and he can be tackled: his tackling
      // against the carrier's dribbling, a little better the closer he gets. A miss lets the carrier get past him, and play goes on.
      const carrierNow = () => { const c = S.eng.m.carrier; return c && c.team === S.eng.o ? { p: c.player, x: c.player.y, y: c.player.x } : null; };
      const tackleRoll = (idxs, tag) => {
        const c = carrierNow(); if (!c || !FM.tackleProb) return null;
        const near = idxs.filter((i) => dist(S.own[i], c) <= 2.8 && S.own[i].p.group !== 'GK').sort((a, b) => dist(S.own[a], c) - dist(S.own[b], c));
        if (!near.length) return null;
        const i = near[0], rng = FM.mulberry32((S.seed + S.snaps.length * 7919 + i * 131 + (tag || 0)) >>> 0);
        const base = FM.tackleProb(S.own[i].p, c.p), close = clamp(1.15 - dist(S.own[i], c) / 4, 0.4, 1);
        const won = rng() < base * close;
        return { i, won, carrier: c.p };
      };
      const endWon = (t) => {
        S.ended = true; S.won = true; S.events.push({ type: 'tackle' });
        S.say = `${nm(S.own[t.i].p)} wins the ball back from ${nm(t.carrier)}. The defending is done.`;
        S.busy = false; draw();
      };
      let afterMiss = '';
      svg.addEventListener('pointerup', async () => {
        const d = drag; drag = null;
        if (!d || S.busy || S.ended) return;
        const t = tackleRoll([d.i], 1);
        if (!t) return;
        if (t.won) { endWon(t); return; }
        afterMiss = `${nm(S.own[t.i].p)} goes in and misses: ${nm(t.carrier)} gets past him. `;
        const b = host.querySelector('#scnPlay'); if (b) b.click();
      });
      q('#scnPlay').addEventListener('click', async () => {
        if (S.busy || S.ended) return;
        S.busy = true;
        { const t = afterMiss ? null : tackleRoll(S.own.map((_, k) => k), 2);   // somebody already stood on him gets his go first
          if (t && t.won) { endWon(t); return; }
          if (t) afterMiss = `${nm(S.own[t.i].p)} goes in and misses: ${nm(t.carrier)} gets past him. `; }
        const missText = afterMiss; afterMiss = '';
        const m = S.eng.m;
        S.snaps.push({ ballX: m.ball.x, own: S.own.map((o) => ({ x: o.x, y: o.y })) });
        S.evFrom = m.events.length; S.t0 = m.clock;
        S.stopOn = (mm) => { const last = mm.events[mm.events.length - 1]; return mm.events.length > S.evFrom && last && ['pass', 'shot', 'dribble', 'tackle', 'goal'].indexOf(last.type) >= 0 && mm.clock - S.t0 > 0.8; };
        const starts = S.opp.map((o) => ({ x: o.x, y: o.y })), b0 = { x: S.ball.x, y: S.ball.y }, ownStarts = S.own.map((o) => ({ x: o.x, y: o.y }));
        const evs = runEngine(S, 9);
        const ends = S.opp.map((o) => ({ x: o.x, y: o.y })), b1 = { x: m.ball.y, y: m.ball.x }, ownEnds = S.own.map((o) => ({ x: o.x, y: o.y }));
        S.opp.forEach((o, i) => { o.x = starts[i].x; o.y = starts[i].y; });
        S.own.forEach((o, i) => { o.x = ownStarts[i].x; o.y = ownStarts[i].y; });
        const name = (n) => { const p = S.eng.o.players.find((q2) => q2.number === n); return p ? nm(p) : '#' + n; };
        const last = evs.filter((e) => ['pass', 'shot', 'dribble', 'tackle', 'goal'].indexOf(e.type) >= 0).pop();
        let text = 'They keep the ball.';
        if (last) {
          S.events.push({ type: last.type });
          if (last.type === 'pass') text = last.ok ? `${name(last.from)} passes to ${name(last.to)}${last.dist > 28 ? ', a long ball' : ''}.` : `${name(last.from)}'s pass goes astray: you have it back.`;
          else if (last.type === 'dribble') text = last.ok ? `${name(last.player)} takes his man on.` : `${name(last.player)} loses it in a dribble.`;
          else if (last.type === 'tackle') text = last.team === S.eng.u.id ? (last.ok ? 'You win the ball back.' : 'Your tackle misses.') : (last.ok ? 'They win it back.' : 'He rides the tackle.');
          if (last.type === 'tackle' && last.team === S.eng.u.id && last.ok) S.won = true;
          else if (last.type === 'shot') { text = `${name(last.player)} shoots${last.outcome === 'goal' ? ' and scores' : last.outcome === 'saved' ? ': saved' : last.outcome === 'blocked' ? ': blocked' : ': wide'}.`; S.ended = true; }
        }
        const lost = m.carrier && m.carrier.team === S.eng.u;
        if (lost && !S.ended) { text += ' The ball is yours: the defending is done.'; S.ended = true; S.won = true; }
        // pressing a build-up is over once they are through it: the ball carried or played beyond their half
        if (ph.endAtHalf && !S.ended && m.ball.x < L / 2) { text += ' They are through the press: the pressing is done.'; S.ended = true; }
        S.say = missText + text;
        // everyone moves together, over a little under the time the engine ran for
        const t0 = Date.now(), dur = clamp((m.clock - S.t0) * 600, 700, 5000);
        await new Promise((resolve) => {
          const step = () => {
            const k = clamp((Date.now() - t0) / dur, 0, 1), e = k * (2 - k);
            S.opp.forEach((o, i) => { o.x = starts[i].x + (ends[i].x - starts[i].x) * e; o.y = starts[i].y + (ends[i].y - starts[i].y) * e; });
            S.own.forEach((o, i) => { o.x = ownStarts[i].x + (ownEnds[i].x - ownStarts[i].x) * e; o.y = ownStarts[i].y + (ownEnds[i].y - ownStarts[i].y) * e; });
            S.ball = { x: b0.x + (b1.x - b0.x) * e, y: b0.y + (b1.y - b0.y) * e };
            redraw();
            if (k < 1) setTimeout(step, 16); else resolve();
          };
          step();
        });
        S.busy = false;
        draw();
      });
      const finish = q('#scnFinish');
      if (finish) finish.addEventListener('click', () => {
        const ex = FM.scenarioApplyDefend(S);
        S.finished = true;
        S.learned = ex.text;
        if (hooks && hooks.save) hooks.save();
        draw();
      });
    }
    function wire() {
      const q = (s) => host.querySelector(s);
      const another = q('#scnAnother');
      if (another) another.addEventListener('click', () => { store[phase] = null; S = null; draw(); });
      const next = q('#scnNext');
      if (next) next.addEventListener('click', () => { if (hooks && hooks.applied) hooks.applied(ph); });
      const how = q('#scnHow');
      if (how) how.addEventListener('click', () => FM.scenarioDemo());
      const start = q('#scnStart');
      if (start) start.addEventListener('click', () => {
        S.started = true;
        S.start = S.own.map((o) => ({ x: o.x, y: o.y }));
        if (S.attack) {
          // where the shirts are before starting is where the team plays this phase: in this scenario, in the match and in the tests
          const key = phaseKey(phase), put = {};
          S.own.forEach((o) => { put[o.p.index] = { d: clamp(o.y / L, 0.03, 0.97), w: clamp(o.x / W, 0.04, 0.96) }; });
          // the shape the team will have as the ball goes on through the later diagrams: the width the manager placed, with the depth each
          // would have gained
          const CHAIN = ['build', 'buildEnd', 'midfield', 'final'], later = CHAIN.slice(CHAIN.indexOf(key) + 1);
          const apply = (t) => { t.phasePos = t.phasePos || {}; t.phasePos[key] = Object.assign({}, put); if (key !== 'build') { t.scenarioEnd = t.scenarioEnd || {}; t.scenarioEnd[key] = Object.assign({}, put); } };
          const ahead = {};
          later.forEach((k) => {
            ahead[k] = {};
            S.own.forEach((o) => { const a0 = FM.phasePos(team, o.p, key), b0 = FM.phasePos(team, o.p, k), pl = put[o.p.index]; ahead[k][o.p.index] = { d: clamp(pl.d + (b0.d - a0.d), 0.03, 0.97), w: pl.w }; });
          });
          apply(team); apply(S.eng.u);
          const u0 = S.eng.u; u0.scenarioEnd = u0.scenarioEnd || {};
          later.forEach((k) => { u0.phasePos[k] = Object.assign({}, ahead[k]); u0.scenarioEnd[k] = Object.assign({}, ahead[k]); });
          if (hooks && hooks.save) hooks.save();
          armEngine(S);
        } else S.own.forEach((o, i) => { const p = S.eng.u.players[i]; if (p) { p.x = o.y; p.y = o.x; p.vx = 0; p.vy = 0; } });   // the team defends from where it was placed
        S.say = S.defending ? 'They have the ball. Set your team.' : 'You have the ball. Your move.';
        draw();
      });
      if (!S.started) {
        // before the start: put the players where they should be; the opposition stay in their shape
        const svg0 = q('#scnSvg');
        let d0 = null;
        svg0.addEventListener('pointerdown', (ev) => {
          const own = ev.target.closest && ev.target.closest('[data-own]');
          if (!own) return;
          try { svg0.setPointerCapture(ev.pointerId); } catch (e) { /* fine */ }
          d0 = +own.dataset.own;
          ev.preventDefault();
        });
        svg0.addEventListener('pointermove', (ev) => {
          if (d0 == null) return;
          const p = toBoard(svg0, ev), o = S.own[d0];
          // they have the goal kick: our men stay out of their box until it is played
          if (S.defending && o.p.group !== 'GK' && p.y > L - BOX_D && Math.abs(p.x - W / 2) < BOX_HALF) p.y = L - BOX_D;
          o.x = p.x; o.y = p.y;
          if (S.holder === d0) S.ball = { x: p.x + 0.8, y: p.y + 0.6 };
          redraw();
        });
        svg0.addEventListener('pointerup', () => { d0 = null; });
        return;
      }
      const reset = q('#scnReset');
      if (reset) reset.addEventListener('click', () => { store[phase] = null; S = null; draw(); });
      if (S.defending) { wireDefend(); return; }
      const undo = q('#scnUndo');
      if (undo) undo.addEventListener('click', () => { if (!S.history || !S.history.length) return; const snap = S.history.pop(); S.own = snap.own.map((o, i) => Object.assign({}, S.own[i], { x: o.x, y: o.y })); S.opp.forEach((o, i) => { o.x = snap.opp[i].x; o.y = snap.opp[i].y; }); S.ball = snap.ball; S.holder = snap.holder; S.beats = snap.beats; S.pins = Object.assign({}, snap.pins || {}); S.lost = false; S.done = false; S.shotTaken = false; say('Taken back.'); draw(); });
      const finish = q('#scnFinish');
      if (finish) finish.addEventListener('click', () => {
        const ex = FM.scenarioApply(S);
        S.finished = true;
        S.learned = `${ex.scenarios || 1} scenario${(ex.scenarios || 1) === 1 ? '' : 's'} applied. The team will now play this phase ${ex.direct > 0.6 ? 'directly' : ex.direct < 0.35 ? 'short and patient' : 'with a mix of short and longer passes'}${ex.centreShare >= 0.6 ? ', through the middle' : ex.wideShare >= 0.5 ? ', out wide' : ''}${ex.risk > 0.55 ? ', and will take risks' : ex.risk < 0.3 ? ', and will keep it safe' : ''}.${ph.next ? ' Where you finished is where the next phase starts.' : ''}`;
        if (hooks && hooks.save) hooks.save();
        draw();
      });
      const svg = q('#scnSvg');
      let drag = null;
      const snapNow = () => ({ own: S.own.map((o) => ({ x: o.x, y: o.y })), opp: S.opp.map((o) => ({ x: o.x, y: o.y })), ball: { x: S.ball.x, y: S.ball.y }, holder: S.holder, beats: S.beats.slice(), pins: Object.assign({}, S.pins || {}) });
      const pushHist = (sn) => { S.history = S.history || []; S.history.push(sn); if (S.history.length > 40) S.history.shift(); };
      const snapshot = () => pushHist(snapNow());
      S.pins = S.pins || {};
      // The man with the ball walks to where the manager has dragged it, at running pace, while everyone else (their side and ours) carries on in
      // real time. A tackle by the engine ends the run on the spot.
      // In the build-up the scenario is over once the ball is with a man beyond the halfway line (and in midfield, at the edge of the final third).
      const reached = () => {
        if (!ph.endLine || S.holder == null || S.lost || S.done) return false;
        const h = S.own[S.holder];
        if (h.y <= L * ph.endLine) return false;
        S.done = true;
        const nm = h.p.name.split(' ').slice(-1)[0];
        say(`${nm} has it ${phase === 'build' ? 'beyond the halfway line: the build-up is done' : 'at the edge of the final third: the midfield play is done'}. Press Use this to take what it showed.`);
        return true;
      };
      const finishDribble = (d, tackled) => {
        if (d.timer) { clearInterval(d.timer); d.timer = null; }
        drag = null;
        const o = S.own[d.i], moved = dist(o, d.from);
        if (d.pickup) {
          // collecting a pass is not a dribble: nothing is added to the beats, the pass is what was shown
          S.busy = false;
          if (tackled && S.tackled) { S.lost = true; say(nm(S.tackled) + ' gets there first and wins it: the ball is lost. Undo, or end the scenario.'); }
          else { say(`${o.p.name.split(' ').slice(-1)[0]} collects it.`); reached(); }
          draw(); return;
        }
        if (moved < 0.5 && !tackled) {
          S.own.forEach((q, k) => { q.x = d.snap.own[k].x; q.y = d.snap.own[k].y; });
          S.opp.forEach((q, k) => { q.x = d.snap.opp[k].x; q.y = d.snap.opp[k].y; });
          S.ball = d.snap.ball; S.busy = false; draw(); return;
        }
        pushHist(d.snap);
        if (!S.beats.some((b) => b.type === 'pass' || b.type === 'dribble')) S.start = d.snap.own.map((q) => ({ x: q.x, y: q.y }));
        S.beats.push({ type: 'dribble', i: d.i, d: moved, fromXY: d.from, endXY: { x: o.x, y: o.y } });
        if (tackled && S.tackled) { S.lost = true; say(nm(S.tackled) + ' tackles him and wins it: the ball is lost. Undo, or end the scenario.'); }
        else say(`${o.p.name.split(' ').slice(-1)[0]} carries it ${Math.round(moved)} m.`);
        S.busy = false;
        if (!tackled) reached();
        draw();
      };
      const dribbleTick = (d) => {
        if (S.holder !== d.i) { finishDribble(d, false); return; }
        const o = S.own[d.i], tg = d.target || { x: o.x, y: o.y }, dd = dist(o, tg);
        // he can only run as fast as he is: his pace, a little slower with the ball and by how good he is at it
        const rt = o.p.ratings || {}, pace = (o.p.maxSpeed || 8) * clamp(0.72 + 0.004 * ((rt.dribbling || 60) - 60), 0.6, 0.92);
        if (dd > 0.01) { const stp = Math.min(dd, pace * 0.1); o.x += (tg.x - o.x) / dd * stp; o.y += (tg.y - o.y) / dd * stp; }
        // each defender who gets to him has a go, once: his dribbling against the defender's tackling and how close he is
        if (!d.pickup && FM.dribbleProb) {
          d.faced = d.faced || {}; d.n = (d.n || 0) + 1;
          for (let k = 0; k < S.opp.length; k++) {
            const q = S.opp[k];
            if (q.p.group === 'GK' || dist(q, o) > 2.0) continue;
            if (d.faced[k] != null && d.n - d.faced[k] < 15) continue;
            d.faced[k] = d.n;
            const rng = FM.mulberry32((S.seed + S.beats.length * 104729 + k * 977 + d.n * 31) >>> 0);
            const pOK = FM.dribbleProb(o.p, Math.max(dist(q, o), 0.6), q.p);
            if (rng() > pOK) { S.tackled = q.p; S.ball = { x: o.x, y: o.y }; finishDribble(d, true); return; }
            say(`${o.p.name.split(' ').slice(-1)[0]} gets past ${nm(q.p)}.`);
          }
        }
        // a ball played into space stays where it is until the man sent for it gets there; if one of theirs gets to it first it is theirs
        if (d.pickup && dist(o, tg) > 0.6) {
          const thief = S.opp.find((q) => dist(q, tg) < 1.1 && dist(q, tg) < dist(o, tg));
          if (thief) { S.tackled = thief.p; S.ball = { x: tg.x, y: tg.y }; runEngine(S, 0.1); finishDribble(d, true); return; }
        } else S.ball = { x: o.x + 0.8, y: o.y + 0.6 };
        S.tackled = null;
        if (d.pickup) S.eng.m.extraOv = null;
        else {
          // the nearest defender within reach steps out to meet him, whatever the block: a man running at a defence is always met
          const m = S.eng.m; m.extraOv = new Map();
          let near = null, nd = 13;
          S.eng.o.players.forEach((p) => { if (p.group === 'GK') return; const dd = Math.hypot(p.x - o.y, p.y - o.x); if (dd < nd && p.x > o.y - 0.5) { nd = dd; near = p; } });   // one who is ahead of him, to meet him
          if (near) m.extraOv.set(near, { x: o.y + 1.6, y: o.x });
        }
        runEngine(S, 0.1);
        redraw();
        if (S.tackled) { finishDribble(d, true); return; }
        if (!d.pickup && ph.endLine && o.y > L * ph.endLine) { finishDribble(d, false); return; }
        if (d.released && !d.pickup && dist(o, tg) < 0.25) finishDribble(d, false);
        else if (d.pickup && dist(o, tg) < 0.6) { S.ball = { x: o.x + 0.8, y: o.y + 0.6 }; finishDribble(d, false); }
      };
      svg.addEventListener('pointerdown', (ev) => {
        if (S.busy || S.lost || S.done) return;
        const own = ev.target.closest && ev.target.closest('[data-own]'), ball = ev.target.closest && ev.target.closest('[data-ball]');
        svg.setPointerCapture(ev.pointerId);
        const p = toBoard(svg, ev);
        // from a goal kick the keeper has to pass it: he cannot dribble out with it
        if (own && phase === 'build' && +own.dataset.own === S.holder && S.own[S.holder].p.group === 'GK' && !S.beats.some((b) => b.type === 'pass')) {
          say('A goal kick has to be passed: the goalkeeper cannot run with it. Drag the ball to where you want it to go.');
          ev.preventDefault(); return;
        }
        if (own) { drag = { kind: 'move', timer: null, target: null, released: false, i: +own.dataset.own, from: { x: S.own[+own.dataset.own].x, y: S.own[+own.dataset.own].y }, ballFrom: { x: S.ball.x, y: S.ball.y } }; }
        else if (ball) drag = { kind: 'ball' };
        ev.preventDefault();
      });
      svg.addEventListener('pointermove', (ev) => {
        if (!drag || drag.released) return;
        const p = toBoard(svg, ev);
        if (drag.kind === 'move') {
          if (S.holder === drag.i) {
            drag.target = p;
            if (!drag.timer) { drag.snap = snapNow(); S.tackled = null; drag.timer = setInterval(() => dribbleTick(drag), 100); }
          } else { const o = S.own[drag.i]; o.x = p.x; o.y = p.y; redraw(); }
        } else if (drag.kind === 'ball' && S.holder != null) {
          // the ball goes where the pointer goes and the line to it is drawn behind it
          S.ball = { x: p.x, y: p.y }; redraw();
          const h = S.own[S.holder], X = (m) => (m * PS).toFixed(1), Y = (m) => ((L - m) * PS).toFixed(1);
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', X(h.x)); line.setAttribute('y1', Y(h.y)); line.setAttribute('x2', X(p.x)); line.setAttribute('y2', Y(p.y));
          line.setAttribute('stroke', '#fff'); line.setAttribute('stroke-width', '3'); line.setAttribute('stroke-dasharray', '4 5'); line.setAttribute('pointer-events', 'none');
          svg.insertBefore(line, svg.querySelector('[data-ball]'));
        } else if (drag.kind === 'ball') { S.ball = { x: p.x, y: p.y }; redraw(); }
        else if (drag.kind === 'pass') {
          drag.cur = p; redraw();
          const h = S.own[S.holder], X = (m) => (m * PS).toFixed(1), Y = (m) => ((L - m) * PS).toFixed(1);
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', X(h.x)); line.setAttribute('y1', Y(h.y)); line.setAttribute('x2', X(p.x)); line.setAttribute('y2', Y(p.y));
          line.setAttribute('stroke', '#fff'); line.setAttribute('stroke-width', '3'); line.setAttribute('stroke-dasharray', '4 5');
          svg.appendChild(line);
        }
      });
      svg.addEventListener('pointerup', async (ev) => {
        if (!drag) return;
        const d = drag; drag = null;
        const p = toBoard(svg, ev);
        // letting go of the ball is the pass: onto a teammate, into space, or over a player in the way for one in the air
        if (d.kind === 'ball' && S.holder != null) { const h0 = S.own[S.holder]; S.ball = { x: h0.x + 0.8, y: h0.y + 0.6 }; d.kind = 'pass'; d.start = { x: h0.x, y: h0.y }; }
        if (d.kind === 'move' && S.holder === d.i && d.timer) {
          // letting go stops him where he is: he does not run on to where the pointer got to
          finishDribble(d, false); return;
        }
        if (d.kind === 'move') {
          const o = S.own[d.i], moved = dist(o, d.from);
          if (moved < 0.5) { o.x = d.from.x; o.y = d.from.y; S.ball = d.ballFrom; redraw(); return; }
          // undo needs the state from before the drag
          const tmpOwn = { x: o.x, y: o.y }; o.x = d.from.x; o.y = d.from.y; const ballNow = S.ball; S.ball = d.ballFrom; snapshot(); o.x = tmpOwn.x; o.y = tmpOwn.y; S.ball = ballNow;
          S.pins[d.i] = true;
          S.beats.push({ type: 'move', i: d.i, d: moved, fromXY: d.from, endXY: { x: o.x, y: o.y } }); say(`${o.p.name.split(' ').slice(-1)[0]} stands there.`);
          // placing a man is only that: nothing else on the pitch reacts to it (the other side and your own team move when the ball does)
          draw();
        } else if (d.kind === 'ball') {
          let to = null, bd = 3.2;
          S.own.forEach((o, i) => { const dd = dist(o, p); if (dd < bd) { bd = dd; to = i; } });
          snapshot();
          if (to != null) { S.holder = to; S.ball = { x: S.own[to].x + 0.8, y: S.own[to].y + 0.6 }; say(`${S.own[to].p.name.split(' ').slice(-1)[0]} has the ball.`); }
          else { const h = S.holder != null ? S.own[S.holder] : null; S.ball = h ? { x: h.x + 0.8, y: h.y + 0.6 } : S.ball; say('Drop the ball on top of a player.'); }
          S.busy = true; await reactAnimated(); S.busy = false; draw();
        } else if (d.kind === 'pass') {
          if (dist(d.start, p) < 3 || S.holder == null) { redraw(); return; }
          snapshot();
          const h = S.own[S.holder];
          // the ball dragged into the goal from range is a shot, in any phase: goal, saved, blocked or wide
          if (p.y > L - 6 && Math.abs(p.x - W / 2) < 14 && h.y > L - 40) {
            const rng = FM.mulberry32((S.seed + S.beats.length * 7919) >>> 0);
            const nearest = Math.min.apply(null, S.opp.filter((q) => q.p.group !== 'GK').map((q) => dist(q, h)).concat([20]));
            const xg = 1 / (1 + Math.exp(-(FM.xgLogit ? FM.xgLogit(h.p, h.y, h.x, 1, nearest) : -2)));
            const gk = S.opp.find((q) => q.p.group === 'GK'), last = (n) => n.split(' ').slice(-1)[0];
            let outcome;
            if (nearest < 2 && rng() < 0.35) outcome = 'blocked';
            else if (Math.abs(p.x - W / 2) >= 3.66) outcome = 'wide';
            else outcome = rng() < clamp(xg / 0.62, 0.03, 0.92) ? 'goal' : 'saved';
            const goal = outcome === 'goal', who = last(h.p.name);
            S.beats.push({ type: 'shot', i: S.holder, ok: goal, outcome, d: dist(h, p), fromXY: { x: h.x, y: h.y }, endXY: { x: p.x, y: L }, dy: L - h.y });
            S.ball = { x: clamp(p.x, W / 2 - 3.66, W / 2 + 3.66), y: L };
            if (outcome === 'blocked') S.ball = { x: h.x, y: h.y + 1.5 };
            say(goal ? `${who} shoots and scores! GOAL.` : outcome === 'saved' ? `${who} shoots: saved${gk ? ' by ' + nm(gk.p) : ''}.` : outcome === 'blocked' ? `${who} shoots, but it is blocked.` : `${who} shoots: wide of the post.`);
            S.say += ' The attack ends here: press Use this to take what it showed.';
            S.lost = false; S.shotTaken = true; S.done = true;
            draw(); return;
          }
          if (!S.beats.some((b) => b.type === 'pass' || b.type === 'dribble')) S.start = S.own.map((o) => ({ x: o.x, y: o.y }));
          const r = evaluatePass(S, p);
          const e = { x: r.land.x, y: r.land.y };
          S.beats.push({ type: 'pass', from: r.from, to: r.to, ok: r.ok, aerial: r.aerial, d: r.d, lane: r.lane, p: r.p, dy: e.y - h.y, fromXY: { x: h.x, y: h.y }, endXY: e });
          const who = (i) => S.own[i].p.name.split(' ').slice(-1)[0];
          const last = (n) => n.split(' ').slice(-1)[0];
          if (r.ok) {
            // the man it is for runs onto it (a man it was played into space for is the nearest of his team-mates); the ball stays where it
            // comes down until he gets there
            let rc = r.to;
            if (rc == null) {
              let bdist = Infinity;
              S.own.forEach((q, k) => { if (k === r.from || (q.p.group === 'GK' && S.own[r.from].p.group !== 'GK')) return; const dd2 = dist(q, e); if (dd2 < bdist) { bdist = dd2; rc = k; } });
              if (rc == null) rc = S.holder;
            }
            if (r.to == null || dist(S.own[rc], e) > 1.5) {
              S.holder = rc; S.ball = { x: e.x, y: e.y };
              say(r.to == null
                ? `${who(r.from)} ${r.aerial ? (r.d < 22 ? 'chips it' : 'plays it over the top') : 'passes'} into space, ${Math.round(r.d)} m. ${who(rc)} goes to collect it.`
                : `${who(r.from)} ${r.aerial ? (r.d < 22 ? 'chips it' : 'plays it over the top') : 'passes'} to ${who(rc)}, ${Math.round(r.d)} m.${r.loose ? ' It runs a little loose, but he gets to it.' : ''}`);
              const dd0 = { kind: 'move', i: rc, from: { x: S.own[rc].x, y: S.own[rc].y }, target: { x: e.x, y: e.y }, released: true, pickup: true, timer: null, snap: null };
              S.busy = true; S.tackled = null;
              dd0.timer = setInterval(() => dribbleTick(dd0), 100);
              return;
            }
            S.holder = rc;
            S.ball = { x: S.own[rc].x + 0.8, y: S.own[rc].y + 0.6 };
            say(`${who(r.from)} ${r.aerial ? (r.d < 22 ? 'chips it' : 'plays it over the top') : 'passes'} to ${who(rc)}, ${Math.round(r.d)} m. It comes off.`);
          } else {
            const wq = S.opp[r.winner], wn = nm(wq.p);
            S.lost = true; S.ball = { x: e.x, y: e.y };
            say(r.how === 'cut' ? `${who(r.from)} tries a pass, but ${wn} gets across and cuts it out: the ball is lost. Undo, or end the scenario.`
              : r.how === 'air' ? `${who(r.from)} plays it over the top, but ${wn} gets there first: the ball is lost. Undo, or end the scenario.`
              : `${who(r.from)}'s pass runs loose and ${wn} gets to it first: the ball is lost. Undo, or end the scenario.`);
            // he goes to where the ball is; nobody else has to move
            S.busy = true;
            await tweenOpp(r.winner, e);
            S.busy = false;
            draw();
            return;
          }
          S.busy = true; await reactAnimated(clamp(r.d / (r.aerial ? 14 : 17) + 0.35, 0.8, 2.6)); S.busy = false;
          if (r.ok && S.tackled) { S.lost = true; say(nm(S.tackled) + ' closes him down and wins it: the ball is lost. Undo, or end the scenario.'); }
          else if (r.ok) reached();
          draw();
        }
      });
    }
    draw();
    // the first time anyone meets the build-up page, a short demonstration of what the cursor does
    if (phase === 'build' && FM.scenarioDemo && !FM.scenarioDemoSeen()) FM.scenarioDemo();
  };
})();
