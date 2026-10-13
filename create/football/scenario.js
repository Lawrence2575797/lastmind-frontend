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
  const L = 105, W = 68, PS = 7;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  // engine pitch (length along x, width along y) <-> this board (width along x, length along y)
  const toEng = (p) => ({ x: p.y, y: p.x });
  const fromEng = (p) => ({ x: p.y, y: p.x });
  const PHASES = {
    build: { title: 'Build-up from a goal kick', stage: 'build', end: 'buildEnd', endLine: 0.5, goal: 'Get the ball out of your half, past their press.', next: 'Play through midfield' },
    midfield: { title: 'Play through midfield', stage: 'midfield', end: 'midfield', endLine: 0.72, goal: 'Carry the ball up to the edge of the final third.', next: 'The final third' },
    final: { title: 'The final third', stage: 'final', end: 'final', endLine: null, goal: 'Create a chance: finish the attack with a shot (drag a pass line into the goal).', next: null },
    organised: { title: 'Defending', stage: 'without', end: 'without', defend: true, goal: 'They have the ball. Move your players as they bring it up the pitch, and press when they have it deep, then let them play on.', next: null },
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
  function startPositions(team, phase) {
    const key = phase === 'build' ? 'build' : phase === 'midfield' ? 'buildEnd' : 'midfield';
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
    u.rules = []; o.rules = []; u.phasePos = u.phasePos || {};
    if (opp.baseTactics) o.tactics = Object.assign({}, opp.baseTactics);   // how they usually play: the profile the page quotes
    const m = FM.createMatch(u, o, seed);
    m.userId = u.id;
    if (phase === 'organised') FM.startBuildUpTrial(m, o, 'goalkick');
    else if (phase === 'build') FM.startBuildUpTrial(m, u, 'goalkick');
    else FM.startFinalThirdTrial(m, u);
    m.noOffside = false; m.forcePass = false;
    return { m, u, o };
  }
  // our players, where the scenario has them (and, when we have the ball, the ball with the man who has it)
  function syncOwn(S) {
    const { m, u } = S.eng;
    S.own.forEach((o, i) => { const p = u.players[i]; if (!p) return; p.x = o.y; p.y = o.x; p.vx = 0; p.vy = 0; });
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
    S.own.forEach((q, i) => { const p = u.players[i]; if (p) { p.x = q.y; p.y = q.x; } });
    for (let e = from; e < m.events.length; e++) out.push(m.events[e]);
    readOpp(S);
    return out;
  }
  // The positions the opposition reach after a move of ours.
  function oppReact(S, noPress) {
    S.tackled = null;
    if (!noPress) {
      const m = S.eng.m;
      // the engine must treat the ball as just arrived, so the press picks a new target
      m.plan = null; m.possessionReceivedAt = m.clock;
      runEngine(S, 1.6);
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
  function evaluatePass(S, end) {
    const from = S.own[S.holder], rng = FM.mulberry32((S.seed + S.beats.length * 7919) >>> 0);
    const d = dist(from, end);
    // who it is meant for: the nearest of his own men to where the line ends
    let to = null, bd = 7;
    S.own.forEach((o, i) => { if (i === S.holder) return; const dd = dist(o, end); if (dd < bd) { bd = dd; to = i; } });
    const target = to != null ? S.own[to] : end;
    const lane = laneInfo(S, from, target, to);
    const aerial = d > 32 || (lane.blocker && lane.clearance < 1.8);
    const press = Math.min.apply(null, S.opp.map((o) => dist(o, target)).concat([30]));
    let p;
    if (aerial) {
      // over the top: it does not matter who is in the way, but it is harder to place, and the man waiting for it is contested
      p = FM.passProb(from.p, d, 9, press) * 0.9 - (press < 2.5 ? 0.12 : 0);
    } else {
      p = FM.passProb(from.p, d, lane.clearance, press);
    }
    if (to == null) p *= 0.55;   // into space: nobody is meant to be there
    p = clamp(p, 0.04, 0.97);
    const ok = rng() < p;
    return { from: S.holder, to, end: target, d, aerial, p, ok, lane: lane.clearance, blocker: lane.blocker };
  }

  // ---------- the scenario itself ----------
  function fresh(team, opp, phase) {
    const own = startPositions(team, phase);
    const press = FM.scenarioOppPress(opp);
    const defending = phase === 'organised';
    const seed = (Date.now() & 0xfffff) + 17;
    const eng = makeEngine(team, opp, phase, seed);
    const oppP = eng.o.players.map((p, i) => ({ p: opp.players[i] || p, x: 0, y: 0 }));
    const S = { team, oppTeam: opp, phase, press, own, opp: oppP, ball: startBall(phase), holder: null, beats: [], seed, log: [], lost: false, started: false, start: null, finished: false, eng, attack: !defending, defending, snaps: [], events: [] };
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
    S.holder = phase === 'build' ? Math.max(0, own.findIndex((o) => o.p.group === 'GK')) : nearest.i;
    S.ball = { x: own[S.holder].x + 0.8, y: own[S.holder].y + 0.6 };
    // the opposition stand in their own shape for this ball (not yet reacting to anything); the engine is armed when the scenario starts
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
    const recvs = good.filter((b) => b.to != null).map((b) => S.own[b.to]);
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
    const team = S.team, ph = PHASES[S.phase], ex = FM.scenarioExtract(S), blend = 0.75;
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
      if (o.p.group === 'GK' || Math.hypot(dx, dy) < 9) return;
      const eff = { type: 'position', forward: Math.round(clamp(dy, -15, 15) * 10) / 10, wide: Math.round(clamp((o.x >= W / 2 ? dx : -dx), -12, 12) * 10) / 10, phase: 'with' };
      add({ kind: 'slot', slot: o.p.slotKey }, [eff]);
    });
    // where the team stood before it began is where this phase starts (for the goal kick)
    if (S.phase === 'build') { team.phasePos = team.phasePos || {}; team.phasePos.build = team.phasePos.build || {}; S.own.forEach((o, i) => { team.phasePos.build[o.p.index] = { d: clamp(S.start[i].y / L, 0.03, 0.97), w: clamp(S.start[i].x / W, 0.04, 0.96) }; }); }
    // where the team got to is where the next phase starts (and for the last phase, where the attack finished)
    const end = saved(team);
    end[ph.end] = {}; S.own.forEach((o) => { end[ph.end][o.p.index] = { d: clamp(o.y / L, 0.03, 0.97), w: clamp(o.x / W, 0.04, 0.96) }; });
    team.scenarioInfo = team.scenarioInfo || {};
    team.scenarioInfo[S.phase] = { at: new Date().toISOString(), vs: S.press.label, passes: ex.passes, completed: ex.completed, meanLen: ex.meanLen, aerial: Math.round(ex.aerialShare * 100), dribbled: ex.dribbled, lost: S.lost };
    if (FM.inferShapeTactics) FM.inferShapeTactics(team);
    return ex;
  };

  // The team's defending, from the set-ups shown: where it stood when they had the ball deep in their own half (pressing their build-up), in
  // midfield, and near our goal; and from how high the line was, how many went to the ball and how wide it stood.
  FM.scenarioApplyDefend = function (S) {
    const team = S.team, snaps = S.snaps.length ? S.snaps : [{ ballX: S.eng.m.ball.x, own: S.own.map((o) => ({ x: o.x, y: o.y })) }];
    const zoneOf = (bx) => (bx > 70 ? 'press' : bx > 35 ? 'without' : 'withoutEnd');
    const lastIn = {}; snaps.forEach((sn) => { lastIn[zoneOf(sn.ballX)] = sn; });
    const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
    const out = S.own.map((o, i) => ({ o, i })).filter(({ o }) => o.p.group !== 'GK');
    const pressersOf = (sn) => { const ball = { x: 0, y: 0 }; const be = { x: S.eng.m.ball.y, y: sn.ballX }; return out.filter(({ i }) => Math.hypot(sn.own[i].x - be.x, sn.own[i].y - be.y) < 8).length; };
    const press = mean(snaps.map(pressersOf)), pressDeep = mean(snaps.filter((sn) => sn.ballX > 70).map(pressersOf));
    const lineOf = (sn) => { const ys = out.map(({ i }) => sn.own[i].y).sort((a, b) => a - b).slice(0, 4); return mean(ys) / L; };
    // the height of the line is read where it matters: with the ball in midfield (the shape it holds), not when the ball is far away or on top of the box
    const midSnaps = snaps.filter((sn) => zoneOf(sn.ballX) === 'without');
    const line = mean((midSnaps.length ? midSnaps : snaps).map(lineOf));
    const spread = (sn) => { const xs = out.map(({ i }) => sn.own[i].x), m = mean(xs); return Math.sqrt(mean(xs.map((x) => (x - m) * (x - m)))); };
    const sd = mean(snaps.map(spread));
    const set = (k, v) => { if (team.tactics[k] != null) team.tactics[k] = Math.round((team.tactics[k] * 0.25 + v * 0.75) * 100) / 100; };
    set('lineHeight', clamp((line - 0.14) / 0.42, 0, 1));
    set('pressing', clamp(0.15 + press / 5, 0.1, 0.95));
    if (snaps.some((sn) => sn.ballX > 70)) set('pressBuildUp', clamp(0.1 + pressDeep / 4, 0.05, 0.95));
    set('defWidth', clamp(0.7 + (sd - 9) / 14 * 0.55, 0.7, 1.25));
    // the shapes themselves: for each part of the pitch the ball was in, where the team stood
    team.phasePos = team.phasePos || {};
    Object.keys(lastIn).forEach((k) => {
      team.phasePos[k] = team.phasePos[k] || {};
      S.own.forEach((o, i) => { const q = lastIn[k].own[i]; team.phasePos[k][o.p.index] = { d: clamp(q.y / L, 0.03, 0.97), w: clamp(q.x / W, 0.04, 0.96) }; });
    });
    team.scenarioInfo = team.scenarioInfo || {};
    team.scenarioInfo.organised = { at: new Date().toISOString(), vs: S.press.label, passes: S.events.length, completed: S.events.length, meanLen: 0, aerial: 0, dribbled: 0, lost: false, defend: true, zones: Object.keys(lastIn) };
    if (FM.inferShapeTactics) FM.inferShapeTactics(team);
    const zones = Object.keys(lastIn).map((k) => ({ press: 'when they have it deep in their half', without: 'in midfield', withoutEnd: 'near your goal' }[k]));
    return { text: `You showed ${snaps.length} set-up${snaps.length === 1 ? '' : 's'}, ${zones.length ? 'for the ball ' + zones.join(', ') : ''}. The team will now defend with ${line > 0.4 ? 'a high' : line > 0.26 ? 'a middling' : 'a deep'} line, ${press >= 2.5 ? 'press the ball hard' : press >= 1.4 ? 'close the ball down with a couple of players' : 'sit off and let the ball come'}, and stand ${sd > 15 ? 'wide' : sd < 11 ? 'narrow and compact' : 'at a normal width'}. The positions you set for each part of the pitch are the ones it takes up.` };
  };

  // ---------- drawing ----------
  function pitchSvg() {
    const X = (m) => (m * PS).toFixed(1), Y = (m) => ((L - m) * PS).toFixed(1), ln = 'stroke="rgba(255,255,255,.8)" stroke-width="1.6" fill="none"';
    let s = '';
    for (let i = 0; i < 15; i++) s += `<rect x="0" y="${(i * L * PS / 15).toFixed(1)}" width="${W * PS}" height="${(L * PS / 15 + 0.5).toFixed(1)}" fill="${i % 2 ? '#2E7D3E' : '#2A7539'}"/>`;
    s += `<rect x="0" y="0" width="${W * PS}" height="${L * PS}" ${ln}/><line x1="0" y1="${Y(L / 2)}" x2="${W * PS}" y2="${Y(L / 2)}" ${ln}/><circle cx="${X(W / 2)}" cy="${Y(L / 2)}" r="${9.15 * PS}" ${ln}/>`;
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
      s += `<g data-own="${i}" style="cursor:grab"><circle cx="${X(o.x)}" cy="${Y(o.y)}" r="${1.75 * PS}" fill="${ok.shirt}" stroke="${hold ? '#FFE27A' : ok.number}" stroke-width="${hold ? 3.5 : 2}"/><text x="${X(o.x)}" y="${(+Y(o.y) + 4).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" fill="${ok.number}" font-family="sans-serif" pointer-events="none">${o.p.number}</text><text x="${X(o.x)}" y="${(+Y(o.y) + 1.75 * PS + 12).toFixed(1)}" text-anchor="middle" font-size="10" fill="#fff" stroke="#000" stroke-width="2.5" style="paint-order:stroke" font-family="sans-serif" pointer-events="none">${esc(o.p.name.split(' ').slice(-1)[0])}</text></g>`;
    });
    const b = S.ball;
    s += `<g data-ball="1" style="cursor:grab"><circle cx="${X(b.x)}" cy="${Y(b.y)}" r="${1.25 * PS}" fill="transparent"/><circle cx="${X(b.x)}" cy="${Y(b.y)}" r="${0.95 * PS}" fill="#fff" stroke="#000" stroke-width="2"/></g>`;
    return s;
  }

  // ---------- the screen ----------
  FM.renderScenario = function (host, team, opp, phase, hooks) {
    const ph = PHASES[phase];
    if (!host || !ph || !opp) return;
    const store = (hooks && hooks.store) || (host._scn = host._scn || {});
    let S = store[phase];
    if (!S || S.team !== team || S.oppTeam !== opp) { S = null; store[phase] = null; }
    const info = (team.scenarioInfo || {})[phase], press = FM.scenarioOppPress(opp);
    const draw = () => {
      host.innerHTML = `<div class="scn2">
        <div class="scn2-head"><h2>${esc(ph.title)}</h2>
          <p class="desc">Preparing for ${esc(opp.name)}, who usually <b>${esc(press.label)}</b>. ${esc(ph.goal)}</p>
          ${info ? `<p class="note scn2-last">Last shown: ${info.passes} pass${info.passes === 1 ? '' : 'es'} (${info.completed} came off), ${info.dribbled} m dribbled, ${info.aerial}% in the air, against a side that ${esc(info.vs)}.${info.lost ? ' The ball was lost.' : ''}</p>` : ''}
        </div>
        <div class="scn2-body">
          <div class="scn2-pitch"><svg id="scnSvg" viewBox="0 0 ${W * PS} ${L * PS}" role="img" aria-label="${esc(ph.title)}: drag the players and the ball, and draw passes"></svg></div>
          <div class="scn2-side">
            ${S && S.defending && S.started ? `<div class="scn2-card"><h3>Defend it</h3><ul class="scn2-help">
              <li><b>Drag your players</b> to where you want them as they bring the ball up. Press when they have it deep.</li>
              <li>Then press <b>Play on</b> and watch what they do with the ball.</li></ul>
              <div class="scn2-stats">${S.snaps.length} set-up${S.snaps.length === 1 ? '' : 's'} shown · ${S.events.length} move${S.events.length === 1 ? '' : 's'} by them</div>
              <p class="scn2-say" id="scnSay">${esc(S.say || 'They have the ball. Set your team.')}</p>
              <div class="row"><button class="primary" id="scnPlay"${S.ended ? ' disabled' : ''}>Play on</button><button id="scnReset">Start again</button></div>
              <div class="row"><button class="primary" id="scnFinish">Use this</button></div></div>`
            : S && S.started ? `<div class="scn2-card"><h3>How to play it</h3><ul class="scn2-help">
              <li><b>Drag a player</b> to move him. With the ball, that is a dribble.</li>
              <li><b>Drag the ball</b> to where you want to play it, and let go. Onto a teammate, or into space. A line follows the ball.</li>
              <li>Drag it over an opponent in the way and it is a ball in the air.</li></ul>
              <div class="scn2-stats">${S.beats.filter((b) => b.type === 'pass').length} passes · ${Math.round(S.beats.filter((b) => b.type === 'dribble').reduce((a, b) => a + b.d, 0))} m dribbled</div>
              <p class="scn2-say" id="scnSay">${esc(S.say || 'Your move.')}</p>
              <div class="row"><button id="scnUndo"${S.beats.length ? '' : ' disabled'}>Undo</button><button id="scnReset">Start again</button></div>
              <div class="row"><button class="primary" id="scnFinish">Use this${ph.next ? ' and go on to ' + esc(ph.next.toLowerCase()) : ''}</button></div></div>`
            : `<div class="scn2-card"><h3>${ph.defend ? 'Show the team how to defend' : 'Show the team how to play it'}</h3><p class="desc">${ph.defend ? `${esc(opp.name)} start with the ball at their goalkeeper and build up against you. You set your team as they bring it up, and press when they have it deep. They play as they play in a match, and from what you show LastMind works out how the team defends.` : `You will take the ball from the ${phase === 'build' ? 'goalkeeper' : 'man on it'} and play the phase out against ${esc(opp.name)}. They react to every move the way they play. From what you show, LastMind works out how the team plays this phase.`}</p>
              <p class="desc"><b>Drag your players into position first.</b> ${esc(opp.name)} hold their shape until you start${phase === 'build' ? ', and cannot come into the box before the ball is played' : ''}.</p><div class="row"><button class="primary" id="scnStart">Start scenario</button></div></div>`}
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
    const reactAnimated = () => new Promise((resolve) => {
      const starts = S.opp.map((o) => ({ x: o.x, y: o.y })), targets = oppReact(S);
      S.opp.forEach((o, i) => { o.x = starts[i].x; o.y = starts[i].y; });
      const goal = targets;
      const t0 = Date.now(), dur = 650;
      const step = () => {
        const k = clamp((Date.now() - t0) / dur, 0, 1), e = k * (2 - k);
        S.opp.forEach((o, i) => { o.x = starts[i].x + (goal[i].x - starts[i].x) * e; o.y = starts[i].y + (goal[i].y - starts[i].y) * e; });
        redraw();
        if (k < 1) setTimeout(step, 16); else resolve();
      };
      step();
    });
    const toBoard = (svg, ev) => { const r = svg.getBoundingClientRect(); return { x: clamp((ev.clientX - r.left) / r.width * W, 0, W), y: clamp(L - (ev.clientY - r.top) / r.height * L, 0, L) }; };
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
      svg.addEventListener('pointermove', (ev) => { if (!drag) return; const p = toBoard(svg, ev), o = S.own[drag.i]; o.x = p.x; o.y = p.y; redraw(); });
      svg.addEventListener('pointerup', () => { drag = null; });
      q('#scnPlay').addEventListener('click', async () => {
        if (S.busy || S.ended) return;
        S.busy = true;
        const m = S.eng.m;
        S.snaps.push({ ballX: m.ball.x, own: S.own.map((o) => ({ x: o.x, y: o.y })) });
        S.evFrom = m.events.length; S.t0 = m.clock;
        S.stopOn = (mm) => { const last = mm.events[mm.events.length - 1]; return mm.events.length > S.evFrom && last && ['pass', 'shot', 'dribble', 'tackle', 'goal'].indexOf(last.type) >= 0 && mm.clock - S.t0 > 0.8; };
        const starts = S.opp.map((o) => ({ x: o.x, y: o.y })), b0 = { x: S.ball.x, y: S.ball.y };
        const evs = runEngine(S, 9);
        const ends = S.opp.map((o) => ({ x: o.x, y: o.y })), b1 = { x: m.ball.y, y: m.ball.x };
        S.opp.forEach((o, i) => { o.x = starts[i].x; o.y = starts[i].y; });
        const name = (n) => { const p = S.eng.o.players.find((q2) => q2.number === n); return p ? p.name.split(' ').slice(-1)[0] : '#' + n; };
        const last = evs.filter((e) => ['pass', 'shot', 'dribble', 'tackle', 'goal'].indexOf(e.type) >= 0).pop();
        let text = 'They keep the ball.';
        if (last) {
          S.events.push({ type: last.type });
          if (last.type === 'pass') text = last.ok ? `${name(last.from)} passes to ${name(last.to)}${last.dist > 28 ? ', a long ball' : ''}.` : `${name(last.from)}'s pass goes astray: you have it back.`;
          else if (last.type === 'dribble') text = last.ok ? `${name(last.player)} takes his man on.` : `${name(last.player)} loses it in a dribble.`;
          else if (last.type === 'tackle') text = last.team === S.eng.u.id ? (last.ok ? 'You win the ball back.' : 'Your tackle misses.') : (last.ok ? 'They win it back.' : 'He rides the tackle.');
          else if (last.type === 'shot') { text = `${name(last.player)} shoots${last.outcome === 'goal' ? ' and scores' : last.outcome === 'saved' ? ': saved' : last.outcome === 'blocked' ? ': blocked' : ': wide'}.`; S.ended = true; }
        }
        const lost = m.carrier && m.carrier.team === S.eng.u;
        if (lost && !S.ended) { text += ' The ball is yours: the defending is done.'; S.ended = true; }
        S.say = text;
        const t0 = Date.now(), dur = 650;
        await new Promise((resolve) => {
          const step = () => {
            const k = clamp((Date.now() - t0) / dur, 0, 1), e = k * (2 - k);
            S.opp.forEach((o, i) => { o.x = starts[i].x + (ends[i].x - starts[i].x) * e; o.y = starts[i].y + (ends[i].y - starts[i].y) * e; });
            S.ball = { x: b0.x + (b1.x - b0.x) * e, y: b0.y + (b1.y - b0.y) * e };
            redraw();
            if (k < 1) setTimeout(step, 16); else resolve();
          };
          step();
        });
        S.busy = false;
        draw();
      });
      q('#scnFinish').addEventListener('click', () => {
        const ex = FM.scenarioApplyDefend(S);
        S.finished = true;
        S.learned = ex.text;
        if (hooks && hooks.save) hooks.save();
        draw();
        if (hooks && hooks.applied) hooks.applied(ph);
      });
    }
    function wire() {
      const q = (s) => host.querySelector(s);
      const start = q('#scnStart');
      if (start) start.addEventListener('click', () => {
        S.started = true;
        S.start = S.own.map((o) => ({ x: o.x, y: o.y }));
        if (S.attack) armEngine(S);
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
      q('#scnReset').addEventListener('click', () => { store[phase] = null; S = null; draw(); const b = host.querySelector('#scnStart'); if (b) b.click(); });
      if (S.defending) { wireDefend(); return; }
      q('#scnUndo').addEventListener('click', () => { if (!S.history || !S.history.length) return; const snap = S.history.pop(); S.own = snap.own.map((o, i) => Object.assign({}, S.own[i], { x: o.x, y: o.y })); S.opp.forEach((o, i) => { o.x = snap.opp[i].x; o.y = snap.opp[i].y; }); S.ball = snap.ball; S.holder = snap.holder; S.beats = snap.beats; S.lost = false; say('Taken back.'); draw(); });
      q('#scnFinish').addEventListener('click', () => {
        const ex = FM.scenarioApply(S);
        S.finished = true;
        S.learned = `${ex.passes} pass${ex.passes === 1 ? '' : 'es'}, averaging ${ex.meanLen} m, ${Math.round(ex.aerialShare * 100)}% in the air; ${ex.dribbled} m dribbled. The team will now play this phase ${ex.direct > 0.6 ? 'directly' : ex.direct < 0.35 ? 'short and patient' : 'with a mix of short and longer passes'}${ex.centreShare >= 0.6 ? ', through the middle' : ex.wideShare >= 0.5 ? ', out wide' : ''}${ex.risk > 0.55 ? ', and will take risks' : ex.risk < 0.3 ? ', and will keep it safe' : ''}. Where you finished is where the next phase starts.`;
        if (hooks && hooks.save) hooks.save();
        draw();
        if (hooks && hooks.applied) hooks.applied(ph);
      });
      const svg = q('#scnSvg');
      let drag = null;
      const snapshot = () => { S.history = S.history || []; S.history.push({ own: S.own.map((o) => ({ x: o.x, y: o.y })), opp: S.opp.map((o) => ({ x: o.x, y: o.y })), ball: { x: S.ball.x, y: S.ball.y }, holder: S.holder, beats: S.beats.slice() }); if (S.history.length > 40) S.history.shift(); };
      svg.addEventListener('pointerdown', (ev) => {
        if (S.busy || S.lost) return;
        const own = ev.target.closest && ev.target.closest('[data-own]'), ball = ev.target.closest && ev.target.closest('[data-ball]');
        svg.setPointerCapture(ev.pointerId);
        const p = toBoard(svg, ev);
        if (own) { drag = { kind: 'move', i: +own.dataset.own, from: { x: S.own[+own.dataset.own].x, y: S.own[+own.dataset.own].y }, ballFrom: { x: S.ball.x, y: S.ball.y } }; }
        else if (ball) drag = { kind: 'ball' };
        ev.preventDefault();
      });
      svg.addEventListener('pointermove', (ev) => {
        if (!drag) return;
        const p = toBoard(svg, ev);
        if (drag.kind === 'move') {
          const o = S.own[drag.i]; o.x = p.x; o.y = p.y;
          if (S.holder === drag.i) { S.ball = { x: p.x + 0.8, y: p.y + 0.6 }; }
          redraw();
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
        if (d.kind === 'move') {
          const o = S.own[d.i], moved = dist(o, d.from);
          if (moved < 0.5) { o.x = d.from.x; o.y = d.from.y; S.ball = d.ballFrom; redraw(); return; }
          // undo needs the state from before the drag
          const tmpOwn = { x: o.x, y: o.y }; o.x = d.from.x; o.y = d.from.y; const ballNow = S.ball; S.ball = d.ballFrom; snapshot(); o.x = tmpOwn.x; o.y = tmpOwn.y; S.ball = ballNow;
          if (S.holder === d.i && !S.beats.some((b) => b.type === 'pass' || b.type === 'dribble')) S.start = S.own.map((q2, k) => (k === d.i ? { x: d.from.x, y: d.from.y } : { x: q2.x, y: q2.y }));
          if (S.holder === d.i) { S.beats.push({ type: 'dribble', i: d.i, d: moved, fromXY: d.from, endXY: { x: o.x, y: o.y } }); say(`${o.p.name.split(' ').slice(-1)[0]} carries it ${Math.round(moved)} m.`); }
          else { S.beats.push({ type: 'move', i: d.i, d: moved, fromXY: d.from, endXY: { x: o.x, y: o.y } }); say(`${o.p.name.split(' ').slice(-1)[0]} moves.`); }
          // a man with the ball who is run into: they close down (the opposition reaction can win it)
          S.busy = true; await reactAnimated(); S.busy = false;
          if (S.tackled) { S.lost = true; say(S.tackled.name.split(' ').slice(-1)[0] + ' wins it: the ball is lost. Undo, or start again.'); }
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
          // a line into the goal is a shot (in the final third)
          if (phase === 'final' && p.y > L - 6 && Math.abs(p.x - W / 2) < 12 && h.y > L - 36) {
            const rng = FM.mulberry32((S.seed + S.beats.length * 7919) >>> 0);
            const xg = 1 / (1 + Math.exp(-(FM.xgLogit ? FM.xgLogit(h.p, L - h.y, h.x, 1, Math.min.apply(null, S.opp.map((q) => dist(q, h)).concat([20]))) : -2)));
            const goal = rng() < xg;
            S.beats.push({ type: 'shot', i: S.holder, ok: goal, d: dist(h, p), fromXY: { x: h.x, y: h.y }, endXY: { x: p.x, y: L }, dy: L - h.y });
            say(goal ? 'Goal.' : 'Saved or wide: the attack ends in a shot.'); S.ball = { x: p.x, y: L }; S.lost = false; S.shotTaken = true;
            draw(); return;
          }
          if (!S.beats.some((b) => b.type === 'pass' || b.type === 'dribble')) S.start = S.own.map((o) => ({ x: o.x, y: o.y }));
          const r = evaluatePass(S, p);
          const e = { x: r.end.x, y: r.end.y };
          S.beats.push({ type: 'pass', from: r.from, to: r.to, ok: r.ok, aerial: r.aerial, d: r.d, lane: r.lane, p: r.p, dy: e.y - h.y, fromXY: { x: h.x, y: h.y }, endXY: e });
          const who = (i) => S.own[i].p.name.split(' ').slice(-1)[0];
          if (r.ok) {
            S.holder = r.to != null ? r.to : S.holder;
            if (r.to != null) { S.ball = { x: S.own[r.to].x + 0.8, y: S.own[r.to].y + 0.6 }; }
            else { S.ball = e; }
            say(`${who(r.from)} ${r.aerial ? 'plays it over the top' : 'passes'} ${r.to != null ? 'to ' + who(r.to) : 'into space'}, ${Math.round(r.d)} m. It comes off.`);
            // the man it was meant for goes to the ball; the others stay where the manager put them
            if (r.to != null) { const o = S.own[r.to]; const tgt = { x: e.x, y: e.y }; o.x = tgt.x; o.y = tgt.y; }
          } else {
            // the nearest of them on the line wins it (or it runs out of play)
            const win = (r.blocker && !r.blocker.own) ? r.blocker.o : S.opp.slice().sort((a, b) => dist(a, e) - dist(b, e))[0];
            S.lost = true; S.ball = { x: win.x, y: win.y };
            say(`${who(r.from)} ${r.aerial ? 'tries it over the top' : 'tries a pass'}, but ${r.aerial ? 'it is not won' : (r.blocker && !r.blocker.own ? 'it is cut out by ' + win.p.name.split(' ').slice(-1)[0] : 'it does not reach him')}: the ball is lost. Undo, or start again.`);
          }
          S.busy = true; await reactAnimated(); S.busy = false;
          if (r.ok && S.tackled) { S.lost = true; say(S.tackled.name.split(' ').slice(-1)[0] + ' closes him down and wins it: the ball is lost. Undo, or start again.'); }
          draw();
        }
      });
    }
    draw();
  };
})();
