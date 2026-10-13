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

  // ---------- the opposition's reaction ----------
  function oppReact(S, noPress) {
    const { team, press } = S, opp = S.oppTeam;
    const keep = [];
    // put everyone where the engine expects them, ask the engine where the opposition would stand, then put everything back
    const own = S.own, theirs = S.opp;
    own.forEach((o) => { const e = toEng(o); keep.push([o.p, o.p.x, o.p.y]); o.p.x = e.x; o.p.y = e.y; });
    theirs.forEach((o) => { const e = toEng(o); keep.push([o.p, o.p.x, o.p.y]); o.p.x = e.x; o.p.y = e.y; });
    const oa = opp.attackDir, ta = team.attackDir, orf = opp.oppRef, trf = team.oppRef;
    opp.attackDir = -1; team.attackDir = 1;
    try { Object.defineProperty(opp, 'oppRef', { value: team, writable: true, configurable: true, enumerable: false }); } catch (e) { opp.oppRef = team; }
    const ballE = toEng(S.ball);
    const targets = theirs.map((o) => { try { const t = FM.targetFor(opp, o.p, ballE, false); return fromEng(t); } catch (e) { return { x: o.x, y: o.y }; } });
    opp.attackDir = oa; team.attackDir = ta;
    try { Object.defineProperty(opp, 'oppRef', { value: orf, writable: true, configurable: true, enumerable: false }); } catch (e) { /* fine */ }
    keep.forEach(([p, x, y]) => { p.x = x; p.y = y; });
    // pressing: the nearest of them go to the ball and to the men near it, as many as their pressing says
    const carrier = S.holder != null ? own[S.holder] : null;
    if (carrier && !noPress) {
      const n = clamp(Math.round(1 + 4.5 * press.value), 1, 6);
      const cand = theirs.map((o, i) => ({ o, i })).filter(({ o }) => o.p.group !== 'GK' && ['ST', 'WF', 'AM', 'CM', 'DM'].indexOf(o.p.group) >= 0)
        .sort((a, b) => dist(a.o, carrier) - dist(b.o, carrier)).slice(0, n);
      const taken = new Set([S.holder]);
      cand.forEach(({ o, i }, k) => {
        if (k === 0) { targets[i] = { x: carrier.x + (carrier.x < W / 2 ? 0.8 : -0.8), y: carrier.y + 1.4 }; return; }
        const free = own.map((q, j) => ({ q, j })).filter(({ j }) => !taken.has(j)).sort((a, b) => dist(a.q, o) - dist(b.q, o))[0];
        if (free && dist(free.q, o) < 30) { taken.add(free.j); targets[i] = { x: free.q.x, y: free.q.y + 1.8 }; }
      });
    }
    return targets.map((t) => ({ x: clamp(t.x, 0.5, W - 0.5), y: clamp(t.y, 0.5, L - 0.5) }));
  }
  function moveToward(from, to, maxStep) {
    const d = dist(from, to);
    if (d <= maxStep) return { x: to.x, y: to.y };
    return { x: from.x + (to.x - from.x) * maxStep / d, y: from.y + (to.y - from.y) * maxStep / d };
  }

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
    const oppP = opp.players.map((p) => ({ p, x: 0, y: 0 }));
    const S = { team, oppTeam: opp, phase, press, own, opp: oppP, ball: startBall(phase), holder: null, beats: [], seed: (Date.now() & 0xfffff) + 17, log: [], lost: false, started: false, start: null, finished: false };
    // the man with the ball: the goalkeeper for a goal kick, otherwise the player nearest to where the ball is
    const nearest = own.map((o, i) => ({ i, d: dist(o, S.ball) })).sort((a, b) => a.d - b.d)[0];
    S.holder = phase === 'build' ? Math.max(0, own.findIndex((o) => o.p.group === 'GK')) : nearest.i;
    S.ball = { x: own[S.holder].x + 0.8, y: own[S.holder].y + 0.6 };
    // the opposition start where they would stand for this ball
    S.opp.forEach((o) => { o.x = 34; o.y = 90; });
    const t = oppReact(S, true);   // they begin in their own shape: the pressing starts with the first move
    S.opp.forEach((o, i) => { o.x = t[i].x; o.y = t[i].y; });
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
      s += `<g><circle cx="${X(q.x)}" cy="${Y(q.y)}" r="${1.6 * PS}" fill="${oppKit.shirt}" stroke="${oppKit.number}" stroke-width="2" opacity=".92"/><text x="${X(q.x)}" y="${(Y(q.y) * 1 + 4).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="${oppKit.number}" font-family="sans-serif">${o.p.number}</text></g>`;
    });
    S.own.forEach((o, i) => {
      const hold = i === S.holder;
      s += `<g data-own="${i}" style="cursor:grab"><circle cx="${X(o.x)}" cy="${Y(o.y)}" r="${1.75 * PS}" fill="${ok.shirt}" stroke="${hold ? '#FFE27A' : ok.number}" stroke-width="${hold ? 3.5 : 2}"/><text x="${X(o.x)}" y="${(+Y(o.y) + 4).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" fill="${ok.number}" font-family="sans-serif" pointer-events="none">${o.p.number}</text><text x="${X(o.x)}" y="${(+Y(o.y) + 1.75 * PS + 12).toFixed(1)}" text-anchor="middle" font-size="10" fill="#fff" stroke="#000" stroke-width="2.5" style="paint-order:stroke" font-family="sans-serif" pointer-events="none">${esc(o.p.name.split(' ').slice(-1)[0])}</text></g>`;
    });
    const b = S.ball;
    s += `<g data-ball="1" style="cursor:grab"><circle cx="${X(b.x)}" cy="${Y(b.y)}" r="${0.95 * PS}" fill="#fff" stroke="#000" stroke-width="2"/></g>`;
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
            ${S && S.started ? `<div class="scn2-card"><h3>How to play it</h3><ul class="scn2-help">
              <li><b>Drag a player</b> to move him. With the ball, that is a dribble.</li>
              <li><b>Drag the ball</b> onto a player to give it to him.</li>
              <li><b>Press on the pitch and drag</b> the way you want the pass to go, then let go. Over a player on the line, it is a ball in the air.</li></ul>
              <div class="scn2-stats">${S.beats.filter((b) => b.type === 'pass').length} passes · ${Math.round(S.beats.filter((b) => b.type === 'dribble').reduce((a, b) => a + b.d, 0))} m dribbled</div>
              <p class="scn2-say" id="scnSay">${esc(S.say || 'Your move.')}</p>
              <div class="row"><button id="scnUndo"${S.beats.length ? '' : ' disabled'}>Undo</button><button id="scnReset">Start again</button></div>
              <div class="row"><button class="primary" id="scnFinish">Use this${ph.next ? ' and go on to ' + esc(ph.next.toLowerCase()) : ''}</button></div></div>`
            : `<div class="scn2-card"><h3>Show the team how to play it</h3><p class="desc">You will take the ball from the ${phase === 'build' ? 'goalkeeper' : 'man on it'} and play the phase out against ${esc(opp.name)}. They react to every move the way they play. From what you show, LastMind works out how the team plays this phase.</p><div class="row"><button class="primary" id="scnStart">Start scenario</button></div></div>`}
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
      const targets = oppReact(S), starts = S.opp.map((o) => ({ x: o.x, y: o.y }));
      const goal = S.opp.map((o, i) => moveToward(starts[i], targets[i], 11));
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
    function wire() {
      const q = (s) => host.querySelector(s);
      const start = q('#scnStart');
      if (start) start.addEventListener('click', () => { S.started = true; S.say = 'You have the ball. Move your players into their places first if you like, then play.'; draw(); });
      if (!S.started) return;
      q('#scnReset').addEventListener('click', () => { store[phase] = null; S = null; draw(); const b = host.querySelector('#scnStart'); if (b) b.click(); });
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
        else if (ball && S.holder == null) drag = { kind: 'ball' };
        else if (ball) drag = { kind: 'ball' };
        else if (S.holder != null) drag = { kind: 'pass', start: p, cur: p };
        ev.preventDefault();
      });
      svg.addEventListener('pointermove', (ev) => {
        if (!drag) return;
        const p = toBoard(svg, ev);
        if (drag.kind === 'move') {
          const o = S.own[drag.i]; o.x = p.x; o.y = p.y;
          if (S.holder === drag.i) { S.ball = { x: p.x + 0.8, y: p.y + 0.6 }; }
          redraw();
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
          if (S.holder === d.i) {
            const nearest = Math.min.apply(null, S.opp.map((q) => dist(q, o)));
            if (nearest < 1.1 && FM.dribbleProb) {
              const rng = FM.mulberry32((S.seed + S.beats.length * 104729) >>> 0);
              const pOK = FM.dribbleProb(o.p, nearest, S.opp.sort((a, b) => dist(a, o) - dist(b, o))[0].p);
              if (rng() > pOK) { S.lost = true; say('He was tackled: the ball is lost. Undo, or start again.'); }
            }
          }
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
          S.busy = true; await reactAnimated(); S.busy = false; draw();
        }
      });
    }
    draw();
  };
})();
