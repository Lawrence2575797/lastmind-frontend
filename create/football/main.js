// The game page: a season of eight clubs, a day-by-day calendar, the league table and squad, the live match
// and the tactics page. All the football itself is in engine.js, match.js and league.js.
(function () {
  const DEMO_MODE = /(?:^|[?&])demo=1(?:&|$)/.test(location.search);
  const cleanUrl = () => location.pathname + (DEMO_MODE ? '?demo=1' : '');
  const { L, W } = FM.PITCH;
  const el = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const world = { league: null, view: 'home', match: null, fixture: null, running: true, speed: 1, highlightsOnly: false, highlightUntil: 0, highlightSearching: false, highlightRevealFrom: 0, shownEvents: 0, lastStats: '', trails: [], impacts: [], vt: 0, commentaryUntil: 0, commentaryTurns: {}, tab: 'squad', selSlot: null, selBench: null, saveTimer: null, renderPos: new Map(), renderBall: null, frameDt: .016 };
  const REAL_SECONDS_FOR_MATCH = 600; // a full 90 minutes takes about ten real minutes at 1x
  const MATCH_SPEED = 5400 / REAL_SECONDS_FOR_MATCH / 6 * 1.5;   // speeds are shown against a pace six times slower than the first version's
  const SUBSTEP = 0.1;
  const TIER_NAMES = { gcse: 'GCSE', alevel: 'A-level', above: 'Beyond A-level' };

  const userTeam = () => FM.teamById(world.league, world.league.userId);
  const shortName = (p) => { const parts = p.name.split(' '); return parts.length > 1 ? parts[0][0] + '. ' + parts.slice(1).join(' ') : p.name; };
  const playerBy = (team, number) => team.squad.find((p) => p.number === number);
  const saveSoon = () => { clearTimeout(world.saveTimer); world.saveTimer = setTimeout(() => { if (world.league) FM.saveLeague(world.league); }, 500); };

  // ---------- drawing the match ----------
  const canvas = el('pitch');
  const ctx = canvas.getContext('2d');
  const MARGIN = 3; // metres of grass drawn around the pitch lines
  let scale = 1;
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.parentElement.clientWidth - 20;
    if (cssW <= 0) return;
    const cssH = cssW * (W + 2 * MARGIN) / (L + 2 * MARGIN);
    canvas.style.height = cssH + 'px';
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    scale = canvas.width / (L + 2 * MARGIN);
  }
  const px = (x) => (x + MARGIN) * scale;
  const py = (y) => (y + MARGIN) * scale;

  function drawPitch() {
    ctx.fillStyle = '#2E7D3E';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const stripes = 14;
    for (let i = 0; i < stripes; i++) {
      if (i % 2) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.055)';
      ctx.fillRect(px(i * L / stripes), 0, (L / stripes) * scale, canvas.height);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = Math.max(1.5, scale * 0.18);
    ctx.strokeRect(px(0), py(0), L * scale, W * scale);
    ctx.beginPath(); ctx.moveTo(px(L / 2), py(0)); ctx.lineTo(px(L / 2), py(W)); ctx.stroke();
    ctx.beginPath(); ctx.arc(px(L / 2), py(W / 2), 9.15 * scale, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath(); ctx.arc(px(L / 2), py(W / 2), scale * 0.3, 0, Math.PI * 2); ctx.fill();
    [0, 1].forEach((side) => {
      const dir = side === 0 ? 1 : -1;
      const gx = side === 0 ? 0 : L;
      const box = (depth, halfW) => ctx.strokeRect(px(side === 0 ? gx : gx - depth), py(W / 2 - halfW), depth * scale, halfW * 2 * scale);
      box(16.5, 20.16); box(5.5, 9.16);
      const spotX = gx + dir * 11;
      ctx.beginPath(); ctx.arc(px(spotX), py(W / 2), scale * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      const a = Math.acos((16.5 - 11) / 9.15);
      ctx.arc(px(spotX), py(W / 2), 9.15 * scale, side === 0 ? -a : Math.PI - a, side === 0 ? a : Math.PI + a);
      ctx.stroke();
      ctx.strokeRect(px(side === 0 ? -2 : L), py(W / 2 - 3.66), 2 * scale, 7.32 * scale);
    });
    // Real-metre scale, kept inside the touchline so it remains visible at
    // every responsive canvas size without increasing the pitch footprint.
    ctx.save();
    ctx.font = `700 ${Math.max(9, Math.round(scale * 1.15))}px Arial, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.strokeStyle = 'rgba(0,0,0,.72)'; ctx.lineWidth = Math.max(2, scale * .28);
    ctx.textBaseline = 'bottom';
    [0, 25, 50, 75, 100, 105].forEach((m) => {
      const x = px(m); ctx.textAlign = m === 0 ? 'left' : m === 105 ? 'right' : 'center';
      const label = m + 'm'; ctx.strokeText(label, x, py(W) - 4); ctx.fillText(label, x, py(W) - 4);
    });
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    [0, 17, 34, 51, 68].forEach((m) => { const label = m + 'm', x = px(0) + 5, y = py(m); ctx.strokeText(label, x, y); ctx.fillText(label, x, y); });
    ctx.restore();
  }

  function drawPlayers() {
    const r = Math.max(8, scale * 1.55);
    const m = world.match;
    m.teams.forEach((team) => {
      team.players.forEach((p) => {
        let rp = world.renderPos.get(p.id);
        if (!rp) { rp = { x: p.x, y: p.y, facing: Number.isFinite(p.facing) ? p.facing : (team.attackDir === 1 ? 0 : Math.PI) }; world.renderPos.set(p.id, rp); }
        const follow = 1 - Math.exp(-10 * Math.min(.05, world.frameDt || .016));
        rp.x += (p.x - rp.x) * follow; rp.y += (p.y - rp.y) * follow;
        let da = (Number.isFinite(p.facing) ? p.facing : rp.facing) - rp.facing;
        while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
        rp.facing += da * (1 - Math.exp(-8 * Math.min(.05, world.frameDt || .016)));
        const cx = px(rp.x), cy = py(rp.y);
        ctx.beginPath(); ctx.arc(cx + 1.5, cy + 2.5, r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = team.kit.shirt; ctx.fill();
        if (m.carrier && m.carrier.player === p) {
          ctx.beginPath(); ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = Math.max(2, r * 0.18); ctx.stroke();
        }
        const selected = world.selSlot === p;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.lineWidth = selected ? Math.max(3, r * 0.3) : Math.max(1.5, r * 0.14);
        ctx.strokeStyle = selected ? '#F2C14E' : '#FFFFFF';
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(rp.facing) * r * .65, cy + Math.sin(rp.facing) * r * .65);
        ctx.lineTo(cx + Math.cos(rp.facing) * r * 1.28, cy + Math.sin(rp.facing) * r * 1.28);
        ctx.strokeStyle = selected ? '#F2C14E' : 'rgba(255,255,255,.9)'; ctx.lineWidth = Math.max(2, r * .16); ctx.stroke();
        ctx.fillStyle = team.kit.number;
        ctx.font = `700 ${Math.round(r * 1.05)}px Helvetica, Arial, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(p.number), cx, cy + r * 0.06);
      });
    });
    if (!world.renderBall) world.renderBall = { x: m.ball.x, y: m.ball.y };
    const ballFollow = 1 - Math.exp(-16 * Math.min(.05, world.frameDt || .016));
    world.renderBall.x += (m.ball.x - world.renderBall.x) * ballFollow;
    world.renderBall.y += (m.ball.y - world.renderBall.y) * ballFollow;
    const bx = px(world.renderBall.x), by = py(world.renderBall.y);
    ctx.beginPath(); ctx.arc(bx, by, Math.max(5, scale * 0.9), 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#111'; ctx.stroke();
  }

  // ---------- running the match ----------
  function advanceMatch(matchSeconds) {
    const m = world.match;
    let left = matchSeconds;
    while (left > 1e-6 && m.phase !== 'halftime' && m.phase !== 'fulltime') {
      const dt = Math.min(SUBSTEP, left);
      FM.stepMatch(m, dt);
      left -= dt;
    }
  }
  // Skipping (to the next break, or to full time) used to run the whole stretch in one go, which freezes the page for as long as it takes
  // and ignores every click meanwhile. It now runs a few milliseconds at a time between screen updates, so the page stays alive, the Play
  // button turns into "Stop skipping", and it stops by itself at a break, at full time, or when a player is injured.
  function skipSlice(m) {
    const t0 = performance.now();
    while (performance.now() - t0 < 30) {
      if (m.injuryPause || m.phase === 'fulltime') { world.skipTo = null; return; }
      if (m.phase === 'halftime') {
        if (world.skipTo === 'end') FM.startSecondHalf(m);
        else { world.skipTo = null; return; }
      }
      FM.stepMatch(m, SUBSTEP);
    }
  }
  // Highlights are goals and missed penalties, and nothing else. Between them the match is simulated at speed behind a loading screen that
  // shows the clock running; each highlight then plays from a few seconds before it (from the match's own recording of where everyone was).
  function isImportantMoment() { return world.vt < world.highlightUntil; }   // the seconds after a highlight, played live
  const HL_CLOCK = (m) => { const t = Math.max(0, Math.floor(m.clock)); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); };
  function hlOverlay(on, m) {
    let box = document.getElementById('hlLoad');
    if (!box) {
      const wrap = document.querySelector('.pitch-wrap'); if (!wrap) return;
      box = document.createElement('div'); box.id = 'hlLoad'; box.className = 'hl-load'; box.hidden = true;
      box.innerHTML = '<div class="hl-clock" id="hlClock">00:00</div><div class="hl-bar"><i></i></div><div class="hl-sub">Playing on to the next highlight</div>';
      wrap.appendChild(box);
    }
    box.hidden = !on;
    if (on && m) { const c = document.getElementById('hlClock'); if (c) c.textContent = HL_CLOCK(m); }
  }
  function hlRestore() {
    const h = world.hl;
    if (!h || !h.saved) return;
    h.saved.players.forEach((q) => { q.p.x = q.x; q.p.y = q.y; });
    h.saved.ball.p.x = h.saved.ball.x; h.saved.ball.p.y = h.saved.ball.y;
  }
  function hlCancel() {
    hlRestore(); world.hl = null; world.hlScanned = null; world.hlWait = null; world.highlightSearching = false; hlOverlay(false);
  }
  function hlStartReplay(m, e, index, tail) {
    const r = m.rec, t0 = e.t - (e.type === 'goal' ? 10 : 8), t1 = e.t + tail;
    const frames = r && r.buf ? r.buf.filter((f) => f.t >= t0 && f.t <= t1 + 0.01) : [];
    world.highlightRevealFrom = index;
    world.highlightSearching = false; hlOverlay(false);
    world.hlScanned = m.events.length; world.hlWait = null;
    if (frames.length < 4) { world.highlightUntil = world.vt + 4.5; return true; }   // nothing recorded: carry on live from here
    const saved = { players: m.home.players.concat(m.away.players).map((p) => ({ p, x: p.x, y: p.y })), ball: { p: m.ball, x: m.ball.x, y: m.ball.y } };
    const span = frames[frames.length - 1].t - frames[0].t;
    // A highlight is a replay of recorded positions, but it must keep the same
    // viewing pace as the rest of the match instead of dropping into slow motion.
    world.hl = { phase: 'replay', frames, start: performance.now(), span, dur: span * 1000 / (MATCH_SPEED * world.speed), saved };
    // the score and the goal's commentary wait for the ball to cross the line in the replay: until then the scoreboard shows what it showed before
    if (e.type === 'goal') world.hlHold = { index, goalT: e.t, home: m.score[m.home.id] - (e.team === m.home.id ? 1 : 0), away: m.score[m.away.id] - (e.team === m.away.id ? 1 : 0) };
    return true;
  }
  function hlReplayStep(m, now, dt) {
    const h = world.hl, el = now - h.start, fr = h.frames;
    world.vt += dt;
    const tt = fr[0].t + h.span * Math.min(1, el / Math.max(1, h.dur));
    let k = 0; while (k < fr.length - 2 && fr[k + 1].t <= tt) k++;
    const a = fr[k], b = fr[Math.min(k + 1, fr.length - 1)], u = b.t > a.t ? Math.max(0, Math.min(1, (tt - a.t) / (b.t - a.t))) : 0;
    const put = (list, from, to) => list.forEach((p) => { const f = from.find((z) => z[0] === p.number), g = to.find((z) => z[0] === p.number); if (f) { p.x = f[1] + ((g ? g[1] : f[1]) - f[1]) * u; p.y = f[2] + ((g ? g[2] : f[2]) - f[2]) * u; } });
    put(m.home.players, a.h, b.h); put(m.away.players, a.a, b.a);
    m.ball.x = a.b[0] + (b.b[0] - a.b[0]) * u; m.ball.y = a.b[1] + (b.b[1] - a.b[1]) * u;
    draw();
    if (world.hlHold && tt >= world.hlHold.goalT) { world.hlHold = null; updateHud(); }   // the ball is in the net: now the score and the call
    if (el >= h.dur) { hlRestore(); world.hl = null; world.hlHold = null; world.highlightUntil = world.vt + 4.5; }
  }
  function seekHighlight(m) {
    if (world.hlScanned == null) world.hlScanned = m.events.length;
    world.highlightSearching = true; hlOverlay(true, m);
    const t0 = performance.now();
    let scanned = world.hlScanned;
    while (performance.now() - t0 < 34 && m.phase !== 'halftime' && m.phase !== 'fulltime' && !m.injuryPause) {
      FM.stepMatch(m, SUBSTEP);
      for (; scanned < m.events.length; scanned++) {
        const e = m.events[scanned];
        if (e.type === 'goal') return hlStartReplay(m, e, scanned, 0.2);
        if (e.type === 'shot' && e.setPiece === 'penalty' && e.outcome !== 'goal') world.hlWait = { until: m.clock + 2.2, ev: e, index: scanned };
      }
      if (world.hlWait && m.clock >= world.hlWait.until) { const w = world.hlWait; return hlStartReplay(m, w.ev, w.index, 2.2); }
    }
    world.hlScanned = scanned;
    const c = document.getElementById('hlClock'); if (c) c.textContent = HL_CLOCK(m);
    if (m.phase === 'halftime' || m.phase === 'fulltime' || m.injuryPause) { world.highlightSearching = false; world.hlScanned = null; world.hlWait = null; hlOverlay(false); }
    return false;
  }
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    world.frameDt = dt;
    last = now;
    const m = world.match;
    if (world.view === 'match' && m && world.hl && world.hl.phase === 'replay') { hlReplayStep(m, now, dt); requestAnimationFrame(frame); return; }
    if (world.view === 'match' && m) {
      if (FM.scout && world.league) FM.scout.watch(world.league, m);
      if (world.skipTo) { skipSlice(m); if (!world.skipTo) world.trails = []; }
      else if (world.running && m.phase !== 'halftime' && m.phase !== 'fulltime') {
        if (world.highlightsOnly && !isImportantMoment(m)) seekHighlight(m);
        else { advanceMatch(dt * MATCH_SPEED * world.speed); world.highlightSearching = false; }
        world.vt += dt;
      }
      if (!world.highlightSearching) { draw(); updateHud(); } else if (!world.highlightsOnly) hlOverlay(false);
    }
    requestAnimationFrame(frame);
  }
  // Where the ball just went: a fading line for each recent pass and shot. They fade with time spent watching, so they stay while paused.
  function drawTrails() {
    const t = world.vt;
    world.trails = world.trails.filter((tr) => t - tr.born < 3).slice(-12);
    world.trails.forEach((tr) => {
      const a = Math.max(0, 1 - (t - tr.born) / 3);
      const col = tr.kind === 'pass' ? '255,255,255' : tr.kind === 'fail' ? '255,110,110' : tr.kind === 'goal' ? '242,193,78' : '255,205,130';
      ctx.strokeStyle = `rgba(${col},${(0.8 * a).toFixed(2)})`;
      ctx.lineWidth = Math.max(2, scale * (tr.kind === 'pass' || tr.kind === 'fail' ? 0.3 : 0.55));
      ctx.setLineDash(tr.kind === 'fail' ? [7, 7] : []);
      ctx.beginPath(); ctx.moveTo(px(tr.x0), py(tr.y0)); ctx.lineTo(px(tr.x1), py(tr.y1)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(px(tr.x1), py(tr.y1), Math.max(3, scale * 0.55), 0, Math.PI * 2); ctx.fillStyle = `rgba(${col},${(0.95 * a).toFixed(2)})`; ctx.fill();
    });
  }
  function drawImpacts() {
    world.impacts = world.impacts.filter((hit) => world.vt - hit.born < 1.15);
    world.impacts.forEach((hit) => {
      const age = (world.vt - hit.born) / 1.15, radius = (1.8 + age * 5.5) * scale;
      ctx.beginPath(); ctx.arc(px(hit.x), py(hit.y), radius, 0, Math.PI * 2);
      ctx.strokeStyle = hit.kind === 'tackle' ? `rgba(255,214,112,${1 - age})` : `rgba(255,255,255,${.8 * (1 - age)})`;
      ctx.lineWidth = Math.max(2, scale * .34 * (1 - age * .5)); ctx.stroke();
    });
  }
  function draw() { drawPitch(); drawTrails(); drawImpacts(); drawPlayers(); }

  const pct = (a, b) => (b ? Math.round(100 * a / b) + '%' : '-');
  const RESTART_NAMES = { throw: 'Throw-in', goalkick: 'Goal kick', corner: 'Corner', freekick: 'Free kick', penalty: 'Penalty' };
  function say(text, mood, seconds) {
    const ribbon = el('matchCommentary');
    if (!ribbon) return;
    ribbon.textContent = text; ribbon.className = 'match-commentary' + (mood ? ' ' + mood : '');
    world.commentaryUntil = world.vt + (seconds || 2.5);
  }
  function call(key, choices) {
    const turn = world.commentaryTurns[key] || 0;
    world.commentaryTurns[key] = turn + 1;
    const choice = choices[turn % choices.length];
    return typeof choice === 'function' ? choice() : choice;
  }
  function liveCommentary(m) {
    if (world.vt < world.commentaryUntil || !m.carrier) return;
    const c = m.carrier, p = c.player, depth = FM.toTeamSpace(c.team.attackDir, p.x, p.y).d;
    const goalSide = (c.team === m.home ? m.away : m.home).players.filter((d) => d.group !== 'GK' && (d.x - p.x) * c.team.attackDir > -1 && Math.abs(d.y - p.y) < 18).length;
    const name = shortName(p);
    const wide = Math.abs(p.y - W / 2) > W * .28;
    if (depth > .86 && goalSide <= 1) say(call('through', [() => name + ' is in behind — one defender to beat!', () => name + ' has broken the line!', () => 'This is the chance for ' + name + '!', () => name + ' is bearing down on goal!']), 'hot', 1.15);
    else if (depth > .78 && wide) say(call('wideAttack', [() => name + ' attacks the outside channel.', () => c.team.name + ' stretch the defence out wide.', () => name + ' looks up for the delivery.', () => 'Space on the flank for ' + name + '.']), 'hot', 1.55);
    else if (depth > .78) say(call('boxAttack', [() => c.team.name + ' work it around the box.', () => name + ' searches for a shooting lane.', () => 'The defence are being pushed deeper now.', () => c.team.name + ' keep the pressure on.']), 'hot', 1.55);
    else if (depth < .34 && goalSide >= 4) say(call('deepCalm', [() => c.team.name + ' are allowed to build patiently.', () => 'No hurry for ' + name + ' at the back.', () => c.team.name + ' recycle possession and reset.', () => name + ' waits for the shape to open.']), '', 2.7);
    else if (depth < .38) say(call('deepPress', [() => name + ' has pressure arriving.', () => c.team.name + ' try to play through the first press.', () => name + ' needs an option here.', () => 'The press begins to close around ' + name + '.']), '', 2.2);
    else if (wide) say(call('wideMid', [() => name + ' carries down the line.', () => c.team.name + ' switch the point of attack.', () => name + ' advances into space out wide.', () => 'The flank opens up for ' + name + '.']), '', 2.25);
    else say(call('midfield', [() => name + ' carries it through midfield.', () => c.team.name + ' look for a route through the middle.', () => name + ' turns into space.', () => c.team.name + ' move the ball between the lines.']), '', 2.35);
  }
  // Cards and flashpoints along the top of the match, so a sent-off player or a manager in the stands is never missed.
  function renderIncidents(m) {
    const box = el('incidents'); if (!box) return;
    const items = [];
    const nameOf = (id, n) => { const t = id === m.home.id ? m.home : m.away, p = t.squad.find((x) => x.number === n); return (p ? shortName(p) : 'number ' + n) + ' (' + t.name + ')'; };
    const min = (t) => Math.floor(t / 60) + "'";
    m.events.forEach((e) => {
      if (e.type === 'foul' && (e.card === 'red' || e.card === 'second yellow')) items.push('<span class="inc"><i class="card-red"></i>' + min(e.t) + ' ' + esc(nameOf(e.team, e.player)) + (e.card === 'second yellow' ? ' (second yellow)' : '') + ' sent off</span>');
      else if (e.type === 'drama' && e.kind === 'managers') items.push('<span class="inc hot">' + min(e.t) + ' Touchline row: ' + (e.both ? 'both managers' : esc(((e.team === m.home.id ? m.home : m.away).name)) + ' manager') + ' sent to the stands</span>');
      else if (e.type === 'drama' && e.kind === 'penalty') items.push('<span class="inc hot">' + min(e.t) + ' Disputed penalty</span>');
      else if (e.type === 'drama' && e.kind === 'scuffle') items.push('<span class="inc hot">' + min(e.t) + ' Flashpoint</span>');
    });
    [m.home, m.away].forEach((t) => { const until = m.stands && m.stands[t.id]; if (until && until > m.clock) items.push('<span class="inc stand">' + esc(t.name) + ' manager in the stands: no changes until ' + FM.formatClock(until) + '</span>'); });
    const html = items.join('');
    if (html !== world.lastIncidents) { box.innerHTML = html; world.lastIncidents = html; }
  }
  function updateHud() {
    const m = world.match, home = m.home, away = m.away;
    { const hold = world.hlHold; el('scHome').textContent = hold ? hold.home : m.score[home.id]; el('scAway').textContent = hold ? hold.away : m.score[away.id]; }
    el('clock').textContent = m.phase === 'halftime' ? 'Half time' : m.phase === 'fulltime' ? 'Full time' : FM.formatClock(m.clock) + (m.restart ? ' · ' + RESTART_NAMES[m.restart.kind] : '');
    renderIncidents(m);
    const h = m.stats[home.id], a = m.stats[away.id], tot = h.possession + a.possession;
    const rows = [
      ['Possession', pct(h.possession, tot), pct(a.possession, tot)],
      ['Shots', h.shots, a.shots], ['On target', h.onTarget, a.onTarget], ['Expected goals', h.xg.toFixed(2), a.xg.toFixed(2)],
      ['Passes', h.passes, a.passes], ['Pass accuracy', pct(h.passesOk, h.passes), pct(a.passesOk, a.passes)],
      ['Dribbles won', h.dribblesWon + '/' + h.dribbles, a.dribblesWon + '/' + a.dribbles],
      ['Challenges won', h.tacklesWon + '/' + h.tackles, a.tacklesWon + '/' + a.tackles],
      ['Fouls', h.fouls, a.fouls], ['Yellow cards', h.yellows, a.yellows], ['Red cards', h.reds, a.reds],
      ['Offsides', h.offsides, a.offsides], ['Corners', h.corners, a.corners], ['Free kicks', h.freeKicks, a.freeKicks],
    ];
    const html = rows.map((r) => '<tr><td>' + r[1] + '</td><td>' + r[0] + '</td><td>' + r[2] + '</td></tr>').join('');
    if (html !== world.lastStats) { el('stats').innerHTML = html; world.lastStats = html; }
    const feed = el('feed');
    const evLimit = world.hlHold ? Math.min(world.hlHold.index, m.events.length) : m.events.length;
    for (; world.shownEvents < evLimit; world.shownEvents++) {
      const e = m.events[world.shownEvents];
      const team = e.team === home.id ? home : e.team === away.id ? away : null;
      if (!team) continue;
      const who = (n) => { const p = playerBy(team, n); return p ? shortName(p) : 'number ' + n; };
      const reveal = !world.highlightsOnly || world.shownEvents >= world.highlightRevealFrom;
      if (reveal && e.type === 'pass' && e.tx != null) world.trails.push({ x0: e.x, y0: e.y, x1: e.tx, y1: e.ty, kind: e.ok ? 'pass' : 'fail', born: world.vt });
      else if (reveal && e.type === 'shot') world.trails.push({ x0: e.x, y0: e.y, x1: team.attackDir === 1 ? L : 0, y1: W / 2, kind: e.outcome === 'goal' ? 'goal' : 'shot', born: world.vt });
      if (reveal && e.type === 'tackle' && e.x != null) world.impacts.push({ x: e.x, y: e.y, kind: 'tackle', born: world.vt });
      let text = null;
      if (e.type === 'goal') text = 'GOAL, ' + team.name + ': ' + who(e.player);
      else if (e.type === 'shot') text = (e.setPiece ? ({ header: 'Header', freekick: 'Free kick', penalty: 'Penalty' }[e.setPiece]) : 'Shot') + ', ' + who(e.player) + ' (' + team.name + '): ' + (e.outcome === 'goal' ? 'on target' : e.outcome) + ' (xG ' + e.xg.toFixed(2) + ')';
      else if (e.type === 'foul') text = 'Foul by ' + who(e.player) + ' (' + team.name + ')' + (e.card ? ', ' + e.card.toUpperCase() : '');
      else if (e.type === 'offside') text = 'Offside, ' + who(e.player) + ' (' + team.name + ')';
      else if (e.type === 'drama') {
        const ot = team === home ? away : home, vsName = (n) => { const q = playerBy(e.vsTeam === home.id ? home : e.vsTeam === away.id ? away : ot, n); return q ? shortName(q) : 'number ' + n; };
        if (e.kind === 'scuffle') text = 'FLASHPOINT: ' + who(e.player) + ' (' + team.name + ') and ' + vsName(e.vs) + ' square up' + (e.outcome === 'both' ? ': both sent off' : e.outcome === 'aggressor' ? ': ' + who(e.player) + ' sent off' : ': both booked');
        else if (e.kind === 'managers') text = 'TOUCHLINE ROW: ' + (e.both ? 'both managers sent to the stands' : team.name + ' manager sent to the stands');
        else if (e.kind === 'penalty') text = 'CONTROVERSY: a penalty to ' + team.name + ', and the defenders are furious';
        else if (e.kind === 'invader') text = 'A supporter is on the pitch: play is held up';
      }
      else if (e.type === 'restart' && (e.kind === 'corner' || e.kind === 'penalty')) text = (e.kind === 'corner' ? 'Corner' : 'PENALTY') + ' to ' + team.name;
      else if (e.type === 'sub') text = 'Substitution, ' + team.name + ': ' + who(e.on) + ' on for ' + who(e.off);
      else if (e.type === 'injury') text = 'Injury: ' + who(e.player) + ' (' + team.name + ') with ' + e.name + ', out for ' + (e.matches === 1 ? 'one match' : e.matches + ' matches');
      else if (e.type === 'tactic') text = team.name + (e.direction === 'attack' ? ' have changed approach: more attacking' : ' have changed approach: more cautious');
      else if (e.type === 'keeperSwap') text = team.name + ' goalkeeper change: ' + who(e.on) + ' in goal' + (e.emergency ? ' (an outfield player)' : '');
      if (reveal && e.type === 'goal') {
        world.highlightUntil = world.vt + 4.5;
        say(call('goal', [() => 'GOAL! ' + who(e.player) + ' finishes it for ' + team.name + '!', () => who(e.player) + ' scores! ' + team.name + ' have their breakthrough!', () => 'It is in! ' + who(e.player) + ' makes no mistake!', () => team.name + ' strike through ' + who(e.player) + '!']), 'goal', 4.5);
      } else if (reveal && e.type === 'shot') {
        world.highlightUntil = world.vt + 3;
        const shooter = who(e.player), big = (e.xg || 0) >= .28;
        if (e.outcome === 'goal') say(call('shotOn', [() => shooter + ' shoots!', () => 'A strike from ' + shooter + '!', 'He lets fly!']), 'hot', 2.4);
        else if (e.outcome === 'saved') say(call(big ? 'bigSave' : 'save', [() => (big ? 'What a save! ' : '') + 'The goalkeeper denies ' + shooter + '!', () => shooter + ' shoots — strong hands from the keeper!', () => 'Saved! ' + shooter + ' cannot find a way through.']), 'hot', 2.8);
        else if (e.outcome === 'blocked') say(call('block', [() => shooter + ' pulls the trigger — blocked!', 'A defender throws himself in the way!', 'The shot never gets through the crowd!']), 'hot', 2.6);
        else say(call(big ? 'bigMiss' : 'miss', [() => shooter + (big ? ' has to score — but puts it wide!' : ' shoots just wide!'), 'That flashes past the post!', () => shooter + ' cannot quite find the corner.']), 'hot', 2.7);
      } else if (reveal && e.type === 'tackle') {
        if (e.ok && e.x != null && (e.x < L * .22 || e.x > L * .78)) world.highlightUntil = Math.max(world.highlightUntil, world.vt + 1.8);
        say(e.ok ? call('wonTackle', [() => 'Superb challenge! ' + who(e.player) + ' wins it cleanly.', () => who(e.player) + ' times the tackle perfectly.', () => 'Brilliant defending from ' + who(e.player) + '.', () => who(e.player) + ' steps in and takes it.']) : call('lostTackle', [() => who(e.player) + ' dives in but cannot win it.', () => 'The attacker escapes ' + who(e.player) + '.', () => who(e.player) + ' mistimes the challenge.']), 'tackle', 2.2);
      } else if (reveal && e.type === 'restart' && e.kind === 'penalty') say(call('penalty', [() => 'PENALTY TO ' + team.name + '!', 'The referee points to the spot!', () => team.name + ' have a penalty!']), 'hot', 3.2);
      else if (reveal && e.type === 'restart' && e.kind === 'corner') say(call('corner', [() => team.name + ' force a corner.', () => 'Corner — another chance for ' + team.name + ' to load the box.', 'The pressure brings a corner.']), 'hot', 2.2);
      else if (reveal && e.type === 'foul' && e.card === 'red') say(call('red', [() => 'RED CARD! ' + who(e.player) + ' is sent off!', () => who(e.player) + ' is dismissed — ' + team.name + ' are down to ten!']), 'hot', 4);
      else if (reveal && e.type === 'foul' && e.card === 'yellow') say(call('yellow', [() => who(e.player) + ' goes into the book.', () => 'Yellow card for ' + who(e.player) + '.', () => who(e.player) + ' will have to be careful now.']), '', 2.2);
      else if (reveal && e.type === 'drama') {
        world.highlightUntil = Math.max(world.highlightUntil, world.vt + 4);
        if (e.kind === 'scuffle') say('Trouble! ' + who(e.player) + ' goes in late and both sides come running in. The referee has a lot to deal with.', 'hot', 5);
        else if (e.kind === 'managers') say('Chaos on the touchline: the benches are on their feet and the fourth official is between the two managers.', 'hot', 5);
        else if (e.kind === 'penalty') say('The referee points to the spot, and the protests are furious. That one will be talked about.', 'hot', 5);
        else if (e.kind === 'invader') say('A supporter has run onto the pitch and the stewards are chasing him across the penalty area.', 'hot', 4);
      }
      else if (reveal && e.type === 'offside') say(call('offside', [() => who(e.player) + ' went too early — offside.', 'The flag is up. The run came a fraction too soon.', () => who(e.player) + ' strays beyond the line.', 'A promising move ends with the offside flag.']), '', 2.1);
      if (!text) continue;
      const div = document.createElement('div');
      div.innerHTML = '<b>' + FM.formatClock(e.t) + '</b> ' + esc(text);
      feed.prepend(div);
    }
    liveCommentary(m);
    const playing = world.running && m.phase !== 'halftime' && m.phase !== 'fulltime';
    el('playBtn').textContent = world.skipTo ? 'Stop skipping' : m.phase === 'halftime' ? 'Start second half' : m.phase === 'fulltime' ? 'Full time' : world.running ? 'Pause' : 'Play';
    el('skipBtn').disabled = el('simEndBtn').disabled = !!world.skipTo;
    el('highlightBtn').classList.toggle('on', world.highlightsOnly);
    el('highlightBtn').setAttribute('aria-pressed', String(world.highlightsOnly));
    document.querySelectorAll('[data-speed]').forEach((x) => { x.disabled = world.highlightsOnly; });
    el('playBtn').classList.toggle('on', playing);
    { const pz = el('pitchPause'); if (pz) { const running = (playing || !!world.skipTo || (world.highlightsOnly && world.running)) && m.phase !== 'fulltime' && m.phase !== 'halftime'; pz.hidden = !running; pz.textContent = world.skipTo ? 'Stop skipping' : 'Pause'; } }
    { const pp = el('pitchPlay'); if (pp) { pp.hidden = playing || m.phase === 'fulltime' || !!m.injuryPause || !!world.skipTo; pp.textContent = m.phase === 'halftime' ? 'Start second half' : (m.clock > 0 ? 'Play on' : 'Kick off'); } }
    const ip = m.injuryPause;
    el('injuryBox').hidden = !ip;
    if (ip) { world.running = false; el('injuryText').textContent = ip.player.name + ' (number ' + ip.player.number + ') is injured and cannot continue, so play is stopped. Substitute him on the tactics board below (click a bench player, then his shirt), or play on with ten men.'; }
    const done = m.phase === 'fulltime';
    el('finishBox').hidden = !done;
    if (done) el('finishText').textContent = 'Full time: ' + home.name + ' ' + m.score[home.id] + '-' + m.score[away.id] + ' ' + away.name + '.';
  }

  el('pitchPlay').addEventListener('click', () => el('playBtn').click());
  el('pitchPause').addEventListener('click', () => el('playBtn').click());
  el('playBtn').addEventListener('click', () => {
    const m = world.match;
    if (world.skipTo) { world.skipTo = null; world.running = false; return; } // stop skipping
    if (!m || m.injuryPause) return;
    if (m.phase === 'halftime') { FM.startSecondHalf(m); world.running = true; return; }
    if (m.phase === 'fulltime') return;
    world.running = !world.running;
  });
  document.querySelectorAll('[data-speed]').forEach((b) => b.addEventListener('click', () => {
    world.speed = parseFloat(b.dataset.speed);
    document.querySelectorAll('[data-speed]').forEach((x) => x.classList.toggle('on', x === b));
  }));
  el('highlightBtn').addEventListener('click', () => {
    const m = world.match;
    if (!m || m.phase === 'fulltime') return;
    world.highlightsOnly = !world.highlightsOnly;
    hlCancel();
    world.highlightUntil = world.vt; world.highlightSearching = false; world.highlightRevealFrom = m.events.length;
    world.running = true;
    say(world.highlightsOnly ? 'Highlights on: goals and missed penalties only.' : 'Full match view restored.', '', 2.2);
  });
  el('stepBtn').addEventListener('click', () => {
    const m = world.match;
    if (!m || world.running || world.skipTo || m.injuryPause || m.phase === 'halftime' || m.phase === 'fulltime') return;
    advanceMatch(1);
    world.vt += 0.4;
  });
  el('skipBtn').addEventListener('click', () => {
    const m = world.match;
    if (!m || world.skipTo || m.phase === 'fulltime') return;
    if (m.phase === 'halftime') FM.startSecondHalf(m);
    world.running = false;
    world.skipTo = 'break';
  });
  el('simEndBtn').addEventListener('click', () => {
    const m = world.match;
    if (!m || m.injuryPause || world.skipTo || m.phase === 'fulltime') return;
    world.running = false;
    world.skipTo = 'end';
  });


  // In a derby the press asks about the derby. The Iron Derby has its own questions (1997, the fans, the tempers); the lesser rivalries are
  // asked about the fixture's name and story. After the match, what happened in it is asked about too: a red card, a row on the touchline.
  function derbyInterview(kind, fx, result) {
    const lg = world.league, me = userTeam(), home = FM.teamById(lg, fx.homeId), away = FM.teamById(lg, fx.awayId), opp = home.id === me.id ? away : home;
    const d = FM.derbyBetween ? FM.derbyBetween(me.name, opp.name) : null;
    if (!d) return null;
    const iron = d.key === 'iron', sum = fx.summary || {}, reds = sum.reds || [], drama = sum.drama || [];
    if (kind === 'pre') {
      if (iron) return {
        questions: [
          'This is the Iron Derby, in your first game in charge, and all of Ashford has been waiting for it. How do you handle that?',
          'Some in Ashford have never forgiven Northfield for 1997, or for what happened with James Whitlock. Do you share that, or is it just another game?',
          'Derbies bring tempers: cards, rows on the touchline. How do you keep your players, and yourself, under control?',
        ],
        answers: [
          ['It means everything to the town, and I understand that. My job is to turn it into focus rather than nerves.', 'I will not pretend it is just another game. I will make sure the players are ready for what the Foundry will be like.', 'The supporters have waited a long time for this. We owe them a performance first and a result second.', 'I have been told what this match is. Now I want the players to enjoy the occasion and do their jobs.', 'It is a big game. It is also three points, and I will treat it that way in the dressing room.'],
          ['I understand where the feeling comes from. I want it in the stands, and I want the players clear-headed on the pitch.', 'I was not here for 1997. What I owe the club is a team that plays the game properly and wins it.', 'The history is real and I respect it. But the way to answer it is by winning on Saturday.', 'It is not just another game, and I will not insult the supporters by saying it is.', 'What happened before I arrived is for the people who lived it. My concern is the next ninety minutes.'],
          ['I have asked the players to be hard and fair. Win your challenges, and keep your heads.', 'Discipline wins derbies. I will tell them that again before kick-off.', 'Passion is welcome. Losing our heads is not, and I will make sure they know the difference.', 'I will not tell them to hold back: they are in a derby. I will tell them to stay in control.', 'I will keep myself in check too. I want to be on the touchline at the end.'],
        ],
      };
      return {
        questions: [
          `${d.name}: what does a game against ${opp.name} mean to your supporters?`,
          `${d.line} Does that history matter to you?`,
          'How do you stop the occasion getting to your players?',
        ],
        answers: [
          ['It means a great deal to them, and I want to give them something to be proud of.', 'The supporters have been talking about it all week. We are ready.', `${opp.name} are the game our people look for first. I understand that.`, 'It is a big one. We want it as much as they do.', 'The fans make a game like this, and I want the team to be worthy of them.'],
          ['It matters to the people at this club, so it matters to me.', 'The history is real, but it will not kick a ball on Saturday. That is up to us.', 'I know the story. I want to write the next chapter.', 'I respect it, and then I get on with the football.', 'It is a part of why we love the game, and I do not want to ignore it.'],
          ['By keeping the routine simple: the same preparation as any other game.', 'I will remind them that they are good enough, and that the occasion is a reason to play, not to worry.', 'Experience helps, and we have good senior players in the dressing room.', 'We talk about it openly. Nobody pretends it is not a derby.', 'We keep our shape, our discipline and our heads. That is the plan.'],
        ],
      };
    }
    // after the match
    const R = result === 'W' ? 'W' : result === 'L' ? 'L' : 'D';
    const incident = reds.length || drama.length;
    const q2 = incident
      ? (reds.length ? `There ${reds.length === 1 ? 'was a sending-off' : 'were ' + reds.length + ' sendings-off'} and ${drama.some((x) => x.kind === 'managers') ? 'a row on the touchline' : 'plenty of flashpoints'}. What did you make of the match?` : 'There was a row on the touchline and a few flashpoints. What did you make of the match?')
      : 'It was a hard match without much trouble. Was it as demanding as you expected?';
    const first = iron
      ? { W: 'You have beaten Northfield in the Iron Derby. What do you say to the supporters?', L: 'You have lost the Iron Derby. What do you say to the supporters?', D: 'The Iron Derby ends level. What do you say to the supporters?' }[R]
      : { W: `You have won ${d.name}. What do you say to the supporters?`, L: `You have lost ${d.name}. What do you say to the supporters?`, D: `${d.name} ends level. What do you say to the supporters?` }[R];
    const third = iron ? 'The return at Millbank is in a few weeks. What does this result mean for it?' : `What does this result mean for the rest of the season?`;
    const a1 = {
      W: ['We have given them something to enjoy tonight. Now we keep our feet on the ground.', 'I am very proud of them. This is a result the whole town will remember.', 'It is one of the best afternoons I will have in this job. Tomorrow we get back to work.', 'The supporters were magnificent. They carried us through the difficult parts.', 'It is only three points on paper. I know what it means to them, and I am glad we got it.'],
      L: ['I am sorry. They deserved better and so do the players. We will answer it.', 'It hurts, and I will not hide from that. We take the lesson and go again.', 'I know what that result means to the town. I take the responsibility.', 'It is a difficult night. The supporters stayed with us, and we owe them a response.', 'We were not good enough on the day, and that is the end of it. The next game is the one that matters now.'],
      D: ['A point is not what anyone wanted in a derby, and we will say so. But it is not nothing.', 'We came to win and we did not. The supporters have every right to be frustrated.', 'There was not much between the teams. We move on.', 'I understand if it feels flat. We had chances, and so did they.', 'It is a fair result and an incomplete one. We go again.'],
    }[R];
    const a2 = incident
      ? ['The occasion got to a few people. That happens in derbies, and I will deal with it with the players.', 'I do not like seeing it, and I will speak to my players. The referee did what he felt he had to.', 'It was a derby. It was hot, and it boiled over a couple of times. I will not add to it.', 'I will watch it again before saying more. The emotion on the pitch was real on both sides.', 'We have to be better than that, and I include myself. A manager should set the tone.']
      : ['It was demanding and honest, and both teams stayed within themselves. That is to the credit of the players.', 'Harder than anyone watching would think. It was a tight game and nothing was given.', 'Yes. Every challenge was a contest, and the players handled it well.', 'It was a derby without the drama, which was a surprise. But the intensity was there.', 'Both sets of supporters got what they came for in terms of effort.'];
    const a3 = {
      W: ['It does a lot for belief. We go to Millbank knowing we can beat them there.', 'It lifts us, and we will use it. But Northfield will come to us for revenge.', 'Everyone will tell us what it means. I want to see it again at their place first.', 'It gives us a lead in the story. They will want it back.', 'It means we have got the first word. The second meeting is another game.'],
      L: ['It means we go to Millbank with something to prove, and I want the players to feel that.', 'It is not the end of anything. There are thirteen more games and a second derby.', 'We pay attention to what they did well, and then we answer it at their place.', 'It makes the return more important, and the players know it.', 'It means we have work to do. We do it quietly.'],
      D: ['It leaves everything for Millbank. That is fine by me.', 'The second meeting will decide who has the better of it. We have to be ready.', 'Neither of us has the advantage. That will change in a few weeks.', 'It keeps it open. We go there believing we can win.', 'A point here and a good game there would be the whole story.'],
    }[R];
    return { questions: [first, q2, third], answers: [a1, a2, a3] };
  }

  // The ready-made answers belong to the question they answer, and the ones after a match depend on the result.
  function interviewAnswers(kind, fx, result) {
    { const dk = derbyInterview(kind, fx, result); if (dk) return dk.answers; }
    const lg = world.league, me = userTeam(), home = FM.teamById(lg, fx.homeId), away = FM.teamById(lg, fx.awayId), opp = home.id === me.id ? away : home;
    if (kind === 'pre') return [
      [
        `A hard game. ${opp.name} are well organised and they will make it difficult for us.`,
        `They are dangerous when they break, so we have to look after the ball and be careful when we lose it.`,
        `I expect them to sit deep and test our patience, so we will need to be sharp with the ball.`,
        `A close game. They have good players, and so do we.`,
        `Nothing different from any other match: ninety minutes of hard work, and the team that is better at the details will win it.`,
      ],
      [
        `Keeping our shape and being patient until the chances come.`,
        `Winning the ball back quickly and attacking before they can reset.`,
        `Controlling the middle of the pitch, because that is where the game will be decided.`,
        `Not giving them easy chances. Our defensive discipline comes first.`,
        `Getting the ball to our best players in space, and trusting them.`,
      ],
      [
        `Trust the work we have done, and enjoy the game.`,
        `Be brave on the ball and work for each other when we do not have it.`,
        `Stay calm, stick to the plan and take the chances we create.`,
        `Start with intensity from the first minute. We cannot wait for the game to come to us.`,
        `Nothing complicated: do your jobs, and the rest will follow.`,
      ],
    ];
    const R = result === 'W' ? 'W' : result === 'L' ? 'L' : 'D';
    const performance = {
      W: [`I am very pleased. The players carried out the plan well.`, `We deserved it, though there are things we can still do better.`, `A good performance, and the result reflects it.`, `It was not perfect, but the attitude and the effort were excellent.`, `Pleased with the result. We were a little fortunate at times, and I will say so to the players.`],
      L: [`Disappointed. We did not do enough, and the result is deserved.`, `There were some good moments, but we did not take our chances.`, `We were not good enough today, and I take responsibility for that.`, `The effort was there, but the details let us down.`, `It is a harsh result on the performance, but we have to take it.`],
      D: [`A fair result. Both sides had chances.`, `We wanted more, but it is a point we can build on.`, `Frustrating. We created enough to win it.`, `A solid performance, but we lacked the final touch.`, `We can be happy enough with a point, given how the match went.`],
    }[R];
    const decided = {
      W: [`In the key moments in both boxes. We were clean at the back and clinical at the other end.`, `In midfield: we won enough of the ball there to control the game.`, `In the first half, when we set the tone and made it difficult for them.`, `A moment of quality from us made the difference.`, `We stayed in the game and were sharper when it mattered.`],
      L: [`In the key moments in both boxes. They took theirs and we did not take ours.`, `In midfield: they won too much of the ball there.`, `Early on. We were slow to settle and we let them get a grip on the game.`, `One mistake at the wrong moment made the difference.`, `Over the whole game they were just that bit sharper.`],
      D: [`In the key moments in both boxes. Neither side took enough of theirs.`, `Nowhere, really. Midfield was very even and nobody could break the other down.`, `It was settled by who made the fewest mistakes, and that was neither of us.`, `A moment of quality, or a mistake, could have decided it and neither came.`, `Both teams had spells on top, and the draw reflects that.`],
    }[R];
    const next = {
      W: [`The belief that we can do it again. We keep the standards we set today.`, `Enjoy it tonight, and then back to work. The next one is a new game.`, `We build on what worked, and we do not get ahead of ourselves.`, `The same intensity. A win does not count for anything in the next match.`, `That we are a good side when we play as a group.`],
      L: [`The anger, and then the response. We learn from it quickly.`, `Look at what went wrong honestly, fix it on the training pitch and move on.`, `That one result does not define us. We back ourselves and go again.`, `The details. We were close, and the details are what we can change.`, `That we are better than that, and we have to show it next time.`],
      D: [`The things we did well, and we fix the final touch.`, `A point is a point. We take the positives and we go again.`, `That we are hard to beat, and now we need to be sharper in the final third.`, `More of the same, with the courage to go and win it.`, `We stay together and keep the standard high.`],
    }[R];
    return [performance, decided, next];
  }
  function interviewQuestions(kind, fx, result) {
    { const dk = derbyInterview(kind, fx, result); if (dk) return dk.questions; }
    const lg = world.league, me = userTeam(), home = FM.teamById(lg, fx.homeId), away = FM.teamById(lg, fx.awayId), opp = home.id === me.id ? away : home;
    if (kind === 'pre') return [
      `What do you expect from ${opp.name} today?`,
      `What will matter most in your game plan?`,
      `What is your message to the players before kick-off?`
    ];
    const lead = result === 'W' ? 'After that win' : result === 'L' ? 'After that defeat' : 'After that draw';
    return [`${lead}, how do you assess the performance?`, 'Where was the match decided?', 'What do you want the players to take into the next game?'];
  }
  function runInterview(kind, fx, result, done) {
    const room = el('interviewRoom'), body = el('pressRoomBody'), questions = interviewQuestions(kind, fx, result);
    // Press conferences are read at a glance: three distinct choices, each no
    // longer than one short sentence, even for the bespoke derby interviews.
    const concise = (answer) => {
      const text = String(answer || '').trim(), sentence = (text.match(/^.*?[.!?](?:\s|$)/) || [text])[0].trim();
      if (sentence.length <= 86) return sentence;
      const cut = sentence.slice(0, 83).replace(/\s+\S*$/, '');
      return (cut || sentence.slice(0, 83)).replace(/[,.!?;:]$/, '') + '…';
    };
    const answerSets = interviewAnswers(kind, fx, result).map((answers) => answers.slice(0, 3).map(concise));
    const lg = world.league, key = kind + ':' + fx.round;
    lg.interviews = lg.interviews || [];
    if (lg.interviews.some((x) => x.key === key)) { done(); return; }
    const record = { key, kind, round: fx.round, day: lg.day, answers: [] };
    let index = 0;
    const close = (publish) => {
      room.hidden = true;
      if (publish) { lg.interviews.push(record); if (FM.publishInterview) FM.publishInterview(lg, record, fx); FM.saveLeague(lg); }
      done();
    };
    const draw = () => {
      el('pressRoomKicker').textContent = kind === 'pre' ? 'Before the match' : 'After the match';
      el('pressRoomTitle').textContent = kind === 'pre' ? 'Pre-match press conference' : 'Post-match press conference';
      const answers = answerSets[index] || [];
      body.innerHTML = `<div class="press-progress">${questions.map((_, i) => `<i class="${i <= index ? 'on' : ''}"></i>`).join('')}</div><p class="press-question">${esc(questions[index])}</p><div class="press-answers">${answers.map((a, i) => `<button class="press-answer" data-answer="${i}">${esc(a)}</button>`).join('')}</div><button id="skipInterview">Skip interview</button>`;
      body.querySelectorAll('[data-answer]').forEach((b) => b.addEventListener('click', () => {
        record.answers.push({ question: questions[index], answer: answers[+b.dataset.answer] });
        index++;
        if (index >= questions.length) close(true); else draw();
      }));
      body.querySelector('#skipInterview').addEventListener('click', () => close(false));
    };
    room.hidden = false; draw();
  }
  function beginPreMatchInterview() {
    const fx = FM.userFixtureToday(world.league);
    if (!fx || fx.played) return;
    runInterview('pre', fx, null, startMatch);
  }
  el('finishBtn').addEventListener('click', () => {
    const btn = el('finishBtn');
    btn.disabled = true; btn.textContent = 'Playing the other matches...';
    setTimeout(() => {
      const fx = world.fixture, m = world.match, me = world.league.userId;
      const mine = m.score[me], theirs = m.score[m.home.id === me ? m.away.id : m.home.id], result = mine > theirs ? 'W' : mine < theirs ? 'L' : 'D';
      FM.completeRound(world.league, world.fixture, world.match);
      world.league.prepStep = 0; world.league.prepPhaseMax = 0; world.league.testPhaseMax = 0;
      // The instructions stay for the next game, to be changed in the same preparation as everything else. One that was written for a single game
      // is kept too, as an ordinary instruction that now applies whoever the opposition are.
      { const mine = FM.teamById(world.league, world.league.userId); if (mine && mine.rules) mine.rules.forEach((r) => { delete r.game; }); }
      world.match = null; world.fixture = null;
      FM.saveLeague(world.league);
      btn.disabled = false; btn.textContent = 'Finish and see the table';
      if (DEMO_MODE) showDemoComplete();
      else runInterview('post', fx, result, () => setView('home'));
    }, 40);
  });

  function startMatch() {
    world.skipTo = null;
    const fx = FM.userFixtureToday(world.league);
    if (!fx || fx.played) return;
    world.fixture = fx;
    world.match = FM.startFixture(world.league, fx, { interactive: true });
    world.renderPos.clear(); world.renderBall = null;
    world.hl = null; world.hlScanned = null; world.hlWait = null; world.running = true; world.speed = 1; world.highlightsOnly = false; world.highlightUntil = 0; world.highlightSearching = false; world.highlightRevealFrom = 0; world.shownEvents = 0; world.lastStats = ''; world.trails = []; world.impacts = []; world.vt = 0; world.commentaryUntil = 0; world.commentaryTurns = {};
    say('The teams are ready. The match is about to begin.', '', 2.5);
    world.selSlot = null; world.selBench = null; world.tab = 'squad';
    document.querySelectorAll('[data-speed]').forEach((x) => x.classList.toggle('on', x.dataset.speed === '1'));
    const m = world.match;
    el('feed').innerHTML = '';
    el('nmHome').textContent = m.home.name; el('nmAway').textContent = m.away.name;
    el('swHome').style.background = m.home.kit.shirt; el('swAway').style.background = m.away.kit.shirt;
    el('legend').innerHTML = m.teams.map((t) => `<span style="display:inline-flex;align-items:center;gap:6px;"><span class="swatch" style="background:${t.kit.shirt}"></span>${esc(t.name)}${t === userTeam() ? ' (you)' : ''}</span>`).join('');
    setView('match');
    resize();
    saveSoon();
  }

  canvas.addEventListener('click', (evt) => {
    if (!world.match) return;
    const rect = canvas.getBoundingClientRect();
    const x = (evt.clientX - rect.left) / rect.width * canvas.width / scale - MARGIN;
    const y = (evt.clientY - rect.top) / rect.height * canvas.height / scale - MARGIN;
    const team = userTeam();
    let best = null, bestD = 2.6;
    team.players.forEach((p) => { const d = Math.hypot(p.x - x, p.y - y); if (d < bestD) { bestD = d; best = p; } });
    if (best) { world.selSlot = best; world.selBench = null; world.tab = 'squad'; renderTactics(); }
  });

  el('injuryTen').addEventListener('click', () => { if (world.match) FM.resolveInjury(world.match); });

  // ---------- views and navigation ----------
  const VIEWS = ['home', 'league', 'squad', 'recruit', 'develop', 'analysis', 'reports', 'news', 'preview', 'mp', 'match'];
  const NAV = [];
  const SCREEN_TITLES = { home: 'Club overview', league: 'League centre', squad: 'First-team squad', recruit: 'Recruitment', develop: 'Player development', reports: 'Opposition intelligence', news: 'Football world', analysis: 'Performance analysis', preview: 'Match preview', mp: 'Playing with other managers' };
  function demoMatchPlayed() {
    return !!(DEMO_MODE && world.league && world.league.fixtures.some((f) => f.played && (f.homeId === world.league.userId || f.awayId === world.league.userId)));
  }
  function showDemoComplete() {
    if (!DEMO_MODE || document.getElementById('demoComplete')) return;
    const modal = document.createElement('section');
    modal.id = 'demoComplete'; modal.className = 'demo-complete';
    modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-labelledby', 'demoCompleteTitle');
    modal.innerHTML = `<div class="demo-complete-inner">
      <a class="demo-return" href="/learn/">← Return to LastMind</a>
      <article class="demo-football-card">
        <img src="/assets/create/football-manager.jpg" alt="A football manager on the touchline under stadium floodlights">
        <div><span class="eyebrow">Your season starts here</span><h2 id="demoCompleteTitle">LastMind Football</h2><p>You have played the free match. Take Ashford Rovers through the full season, with every opponent, report and tactical test.</p></div>
      </article>
      <button class="demo-purchase" type="button">Purchase LastMind Football · £4.99/month</button>
    </div>`;
    document.body.appendChild(modal);
    modal.querySelector('.demo-purchase').addEventListener('click', async (event) => {
      const button = event.currentTarget;
      button.disabled = true; button.textContent = 'Opening secure checkout…';
      try { await FM.purchaseFootball(); }
      catch (err) { button.disabled = false; button.textContent = 'Purchase LastMind Football · £4.99/month'; alert(err.message || 'Could not open the secure checkout.'); }
    });
    modal.querySelector('.demo-return').focus();
  }
  // Lets another page (the Analysis Centre) open one of the tactics pages.
  // "Take me there" from another screen: a button stays on the tactics page that returns to the same place on the screen it came from.
  let backBtn = null;
  function dropBackBtn() { if (backBtn) { backBtn.remove(); backBtn = null; } }
  FM.goToTactics = (tab, from) => {
    dropBackBtn();
    world.testing = false; world.tab = tab; setView('tactics');
    if (!from) return;
    backBtn = document.createElement('button');
    backBtn.type = 'button'; backBtn.className = 'take-back'; backBtn.textContent = '‹ ' + (from.label || 'Take me back');
    backBtn.addEventListener('click', () => {
      dropBackBtn();
      if (from.fxId && FM.setAnalysisMatch) FM.setAnalysisMatch(from.fxId);
      setView('analysis');
      const sc = document.scrollingElement || document.documentElement;
      const go = () => { const a = from.anchor && document.getElementById(from.anchor); if (a) a.scrollIntoView({ block: 'start' }); else sc.scrollTop = from.scrollTop || 0; };
      go(); requestAnimationFrame(go); setTimeout(go, 120);
    });
    document.body.appendChild(backBtn);
  };
  function setView(v) {
    if (v !== 'tactics' && backBtn) dropBackBtn();
    world.view = v;
    document.body.dataset.view = v;
    VIEWS.forEach((k) => { el('view-' + k).hidden = k !== v; });
    el('newGame').hidden = true;
    el('tactics').hidden = !(v === 'tactics' || v === 'match');
    el('nav').hidden = v === 'match';
    VIEWS.forEach((k) => { const section = el('view-' + k); if (section) { if (SCREEN_TITLES[k]) section.dataset.screenTitle = SCREEN_TITLES[k]; else delete section.dataset.screenTitle; } });
    document.querySelectorAll('body > .cap-modal').forEach((n) => n.remove());
    renderTop();
    renderNav();
    renderPrepFlow();
    // In a game with other managers, the match you have not yet watched back keeps its result to itself: the screens that would show it wait
    const mpHold = world.league && world.league.mp && FM.mpReplay && !FM.mpReplay.seen && ['home', 'league', 'news', 'reports', 'analysis', 'squad', 'develop', 'recruit'].indexOf(v) >= 0;
    if (mpHold) {
      const sec = el('view-' + v);
      sec.innerHTML = '<div class="card"><h2>Watch your match first</h2><p class="desc">The round has been played, and the result is kept back until you have watched the match. Nothing can be changed in it now.</p><div class="row"><button class="primary" id="gateWatch">Go to the match</button></div></div>';
      sec.querySelector('#gateWatch').addEventListener('click', () => setView('mp'));
    }
    else if (v === 'home') renderHome();
    else if (v === 'league') renderLeague();
    else if (v === 'squad') renderSquad();
    else if (v === 'develop') FM.renderDevelop(el('view-develop'), world.league, { save: saveSoon });
    else if (v === 'recruit') FM.renderRecruit(el('view-recruit'), world.league, { save: saveSoon, openSquad: () => setView('squad') });
    else if (v === 'analysis') {
      const av = el('view-analysis');
      FM.renderAnalysis(av, world.league);
      // the opposition report comes first: it is what the preparation is for
      const oppBox = document.createElement('div'); oppBox.id = 'analysisOpp'; av.insertBefore(oppBox, av.firstChild);
      try { FM.renderReports(oppBox, world.league); } catch (e) { oppBox.remove(); }
      // before anything else: who the next opponent are to this club (and, for a derby, how much the two sides hate each other)
      try {
        const nx = nextOpponent(), hc = FM.historyCardHtml ? FM.historyCardHtml(world.league, nx) : '';
        if (hc) { const hb = document.createElement('div'); hb.id = 'analysisHistory'; hb.innerHTML = hc; av.insertBefore(hb, av.firstChild); }
      } catch (e) { /* the history is a nicety */ }
    }
    else if (v === 'reports') FM.renderReports(el('view-reports'), world.league);
    else if (v === 'news') FM.renderNews(el('view-news'), world.league);
    else if (v === 'preview') renderPreview();
    else if (v === 'mp') FM.renderMp(el('view-mp'), world.league, { prepare: () => { world.testing = false; world.tab = 'squad'; setView('tactics'); }, afterSync: () => { FM.saveLeague(world.league); renderTop(); } });
    else if (v === 'tactics' || v === 'match') renderTactics();
    const activeSection = SCREEN_TITLES[v] ? el('view-' + v) : null;
    if (activeSection && !activeSection.querySelector('.screen-heading')) activeSection.insertAdjacentHTML('afterbegin', `<div class="screen-heading">${SCREEN_TITLES[v]}</div>`);
    if (v === 'match') resize();
  }
  function renderNav() {
    const nav = el('nav');
    nav.innerHTML = ''; nav.hidden = true;
  }
  function renderPrepFlow() {
    const host = el('prepFlow');
    if (!world.league || world.view === 'match') { host.hidden = true; return; }
    const active = world.view === 'analysis' ? 'analysis' : world.view === 'tactics' ? (world.testing ? 'test' : 'prepare') : world.view === 'preview' ? 'preview' : '';
    const oneOff = world.league.mp && world.league.mp.kind === 'match';
    const steps = oneOff ? [['prepare', 'Prepare tactics'], ['preview', 'Match preview']] : [['analysis', 'Analysis'], ['prepare', 'Prepare tactics'], ['test', 'Test phases'], ['preview', 'Match preview']];
    host.hidden = false;
    const max = world.league.prepStep || 0;
    host.innerHTML = steps.map(([k, label], i) => `${i ? '<span class="flow-arrow">›</span>' : ''}<button data-flow="${k}" data-step="${i + 1}" class="${active === k ? 'on' : ''}">${label}</button>`).join('');
    host.querySelectorAll('[data-flow]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.flow;
      if (k === 'analysis') { world.league.prepStep = Math.max(world.league.prepStep || 0, 1); saveSoon(); setView('analysis'); }
      else if (k === 'prepare') { world.testing = false; world.tab = 'squad'; world.league.prepPhaseMax = Math.max(world.league.prepPhaseMax || 0, 1); saveSoon(); setView('tactics'); }
      else if (k === 'test') { world.testing = true; world.tab = 'build'; setView('tactics'); }
      else setView('preview');
    }));
  }
  function renderTop() {
    const lg = world.league;
    const host = el('topRight');
    if (!lg) { host.innerHTML = ''; el('subtitle').textContent = ''; return; }
    const user = userTeam();
    el('subtitle').textContent = user.name + ' · Season ' + lg.season + ' · ' + TIER_NAMES[lg.tier] + ' statistics';
    host.innerHTML = `<span class="hint" style="color:inherit;opacity:0.8">${esc(FM.dayLabel(lg.day))}</span>
      <button data-top="home" class="${world.view === 'home' ? 'on' : ''}">Home</button>
      <button data-top="squad" class="${world.view === 'squad' ? 'on' : ''}">Squad</button>
      ${lg.mp ? '' : `<button data-top="recruit" class="${world.view === 'recruit' ? 'on' : ''}">Recruitment</button>
      <button data-top="develop" class="${world.view === 'develop' ? 'on' : ''}">Development</button>`}
      ${lg.mp && lg.mp.kind === 'match' ? '' : `<button data-top="news" class="${world.view === 'news' ? 'on' : ''}">News</button>`}
      ${lg.mp ? `<button data-top="mp" class="${world.view === 'mp' ? 'on' : ''}">Online</button>` : ''}
      <button id="newBtn" title="Abandon this season and start again">New game</button>`;
    host.querySelectorAll('[data-top]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.top)));
    el('newBtn').addEventListener('click', () => {
      if (!confirm('Abandon this season and start a new game?')) return;
      FM.clearSave(); world.league = null; world.match = null; showNewGame();
    });
  }

  function renderPreview() {
    syncLabContext();
    const lg = world.league, host = el('view-preview'), fx = FM.nextUserFixture(lg), me = userTeam();
    if (!fx) {
      host.innerHTML = lg.mp ? '<div class="card"><h2>Waiting for the match</h2><p class="desc">There is nothing to preview until the other manager has joined.</p><div class="row"><button class="primary" id="mpBackOnline">Back to the game</button></div></div>' : '<div class="card"><h2>No fixture to preview</h2></div>';
      const bo = host.querySelector('#mpBackOnline'); if (bo) bo.addEventListener('click', () => setView('mp'));
      return;
    }
    const home = FM.teamById(lg, fx.homeId), away = FM.teamById(lg, fx.awayId), opp = home.id === me.id ? away : home;
    const profile = FM.clubProfile(opp), runs = (lg.labRuns || []).filter((r) => !r.opp || r.opp === opp.name), last = runs[runs.length - 1];
    const result = last && last.result, rate = result && result.beat ? Math.round(result.beat.p * 100) : null;
    const problems = FM.teamProblems(me, opp, (ph) => oppLine(ph));
    const today = FM.userFixtureToday(lg), canPlay = !FM.seasonOver(lg);
    const mpState = lg.mp && lg.mp.state;
    const mpRoundPlans = mpState && mpState.plans ? (mpState.plans[String(mpState.round)] || {}) : {};
    const mpSeats = mpState ? Object.keys(mpState.seats || {}) : [];
    const mpYourPlan = !!(lg.mp && mpRoundPlans[lg.mp.teamId]);
    const mpEveryoneReady = !!(lg.mp && mpSeats.length > 0 && (!lg.mp.kind || lg.mp.kind !== 'match' || mpSeats.length === 2) && mpSeats.every((id) => mpRoundPlans[id]));
    const mpButtonLabel = mpYourPlan ? (mpEveryoneReady ? 'Start match' : 'Waiting for other players') : 'Lock in my plan';
    const findings = result ? `${last.n} build-up tests gave a ${rate}% press-beating rate${result.beat.lo != null ? `, with a ${Math.round(result.beat.lo * 100)}–${Math.round(result.beat.hi * 100)}% interval` : ''}.` : 'No phase experiment has been run for this opponent. That is optional—you can still use the current plan.';
    host.innerHTML = `<div class="match-preview">
      <div class="preview-hero"><div class="eyebrow">Round ${fx.round + 1} · ${home.id === me.id ? 'Home' : 'Away'}</div>
        <div class="preview-clubs"><div class="preview-club"><strong>${esc(home.name)}</strong><span>${esc(FM.formationName ? FM.formationName(home) : home.formationKey)}</span></div><div class="preview-v">VS</div><div class="preview-club"><strong>${esc(away.name)}</strong><span>${esc(FM.formationName ? FM.formationName(away) : away.formationKey)}</span></div></div>
        <div class="preview-actions"><button id="previewTactics">Review tactics</button>${lg.mp && lg.mp.kind === 'match' ? '' : '<button id="previewTest">Run an experiment</button>'}<button class="primary" id="enterMatch"${canPlay && (!lg.mp || !mpYourPlan || mpEveryoneReady) ? '' : ' disabled'}>${canPlay ? (lg.mp ? mpButtonLabel : 'Play match') : 'Season complete'}</button></div></div>
      <div class="preview-grid">
        <div class="card"><h2>Your match plan</h2><p class="fixture-big">${esc(FM.formationName ? FM.formationName(me) : me.formationKey)}</p><p class="desc">${(me.rules || []).filter((r) => !r.off).length} active player or team instruction${(me.rules || []).filter((r) => !r.off).length === 1 ? '' : 's'}.</p><p class="note">${problems.length ? problems.length + ' positional issue' + (problems.length === 1 ? '' : 's') + ' still need attention.' : 'Every phase currently fits together.'}</p></div>
        <div class="card"><h2>Opponent</h2><p class="fixture-big">${esc(opp.name)}</p><p class="desc">${FM.derbyBetween && FM.derbyBetween(me.name, opp.name) ? '<b>' + esc(FM.derbyBetween(me.name, opp.name).name) + '</b> · ' : ''}${esc(profile.tag || 'Opponent')} · likely ${esc(opp.formationKey)} · ${esc({ balanced:'balanced',possession:'patient in possession',counter:'dangerous in transition',press:'aggressive without the ball',direct:'direct with the ball' }[opp.style] || opp.style)}.</p></div>
        <div class="card"><h2>Evidence so far</h2><p class="desc">${findings}</p></div>
      </div></div>`;
    host.querySelector('#previewTactics').addEventListener('click', () => { world.testing = false; world.tab = 'squad'; setView('tactics'); });
    const pt = host.querySelector('#previewTest'); if (pt) pt.addEventListener('click', () => { world.testing = true; world.tab = 'build'; setView('tactics'); });
    const rep = host.querySelector('#previewReport'); if (rep) rep.addEventListener('click', () => setView('reports'));
    host.querySelector('#enterMatch').addEventListener('click', async () => {
      if (!canPlay) return;
      // With other managers the round is not played from here: the plan is handed in, and the round is played once everybody has
      if (lg.mp) {
        const b = host.querySelector('#enterMatch');
        b.disabled = true;
        if (mpYourPlan && mpEveryoneReady) {
          b.textContent = 'Starting match...';
          try { await FM.mpSync(lg, { playReady: true }); FM.saveLeague(lg); setView('mp'); } catch (e) { b.disabled = false; b.textContent = 'Start match'; }
        } else {
          b.textContent = 'Handing in...';
          try { await FM.mpSubmit(lg); FM.saveLeague(lg); renderPreview(); } catch (e) { b.disabled = false; b.textContent = 'Lock in my plan'; }
        }
        return;
      }
      // Move on to the next matchday. The day is still the one the last match was played on, so "a fixture today" is not enough: it has to be one
      // that has not been played yet.
      for (let guard = 0; guard < 30 && !FM.seasonOver(lg); guard++) { const today = FM.userFixtureToday(lg); if (today && !today.played) break; if (FM.advanceDay(lg)) break; }
      FM.saveLeague(lg); beginPreMatchInterview();
    });
    if (host._mpPreviewTimer) clearInterval(host._mpPreviewTimer);
    if (lg.mp && !mpState?.finished) host._mpPreviewTimer = setInterval(async () => {
      if (!host.isConnected || world.view !== 'preview') { clearInterval(host._mpPreviewTimer); host._mpPreviewTimer = null; return; }
      try { await FM.mpSync(lg); renderPreview(); } catch (e) { /* keep the current readiness state and try again */ }
    }, 3000);
  }

  // ---------- home ----------
  function tableHtml(rows, compact) {
    const me = world.league.userId;
    const head = compact ? '' : '<th>GF</th><th>GA</th>';
    const n = rows.length;
    const cls = (r, i) => [r.id === me ? 'me' : '', i >= n - 2 ? 'rel' : '', i === n - 2 ? 'rel-first' : '', i === 0 ? 'champ' : ''].filter(Boolean).join(' ');
    return `<div class="tablewrap"><table class="data"><thead><tr><th class="l">#</th><th class="l">Club</th><th>P</th><th>W</th><th>D</th><th>L</th>${head}<th>GD</th><th>Pts</th>${compact ? '' : '<th class="l">Form</th>'}</tr></thead><tbody>` +
      rows.map((r, i) => `<tr class="${cls(r, i)}"><td class="l">${i + 1}</td><td class="l">${esc(r.name)}${compact ? '' : ` <span class="pm">${esc(FM.clubProfile(r).tag)}</span>`}</td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td>${compact ? '' : `<td>${r.gf}</td><td>${r.ga}</td>`}<td>${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td><b>${r.pts}</b></td>${compact ? '' : `<td class="l">${r.form.slice(-5).map((f) => `<span class="pill ${f}">${f}</span>`).join('')}</td>`}</tr>`).join('') +
      '</tbody></table></div>';
  }
  function renderHome() {
    const lg = world.league, host = el('view-home'), me = lg.userId;
    const rows = FM.tableRows(lg);
    const over = FM.seasonOver(lg);
    const nextFx = FM.nextUserFixture(lg);
    const today = FM.userFixtureToday(lg);
    let next = '';
    if (over) {
      const pos = rows.findIndex((r) => r.id === me) + 1;
      const down = rows.slice(-2), mine = pos === 1 ? 'You won the league.' : pos >= 7 ? `You finished ${pos}${pos === 7 ? 'th' : 'th'} of 8 with ${rows[pos - 1].pts} points, in the relegation zone: your club goes down.` : `You finished ${pos}${['st', 'nd', 'rd'][pos - 1] || 'th'} of 8 with ${rows[pos - 1].pts} points, safe from relegation.`;
      next = `<h2>Season complete</h2><div class="fixture-big">${esc(rows[0].name)} are champions.</div><p class="desc">${esc(down[0].name)} and ${esc(down[1].name)} are relegated.</p><p class="desc">${mine}</p><div class="row"><button class="primary" id="newSeasonBtn" style="flex:0 0 auto">Start a new season</button></div>`;
    } else if (nextFx) {
      const home = FM.teamById(lg, nextFx.homeId), away = FM.teamById(lg, nextFx.awayId);
      const opp = home.id === me ? away : home;
      const days = FM.daysUntilMatch(lg);
      const when = days === 0 ? 'Today, matchday' : days === 1 ? 'Tomorrow' : 'In ' + days + ' days, on Saturday';
      next = `<h2>Next match</h2>
        <div class="fixture-big">${esc(home.name)} <span style="opacity:.6">v</span> ${esc(away.name)}</div>
        <p class="desc">${when} · Round ${nextFx.round + 1} of 14 · ${home.id === me ? 'Home' : 'Away'} against ${esc(opp.name)}</p>
        ${today && !today.played ? '<div class="banner">Matchday. Complete the preparation flow, then play from Match preview.</div>' : '<p class="note">Work through the preparation flow above. The match begins from Match preview.</p>'}`;
    }
    const played = lg.fixtures.filter((f) => f.played && (f.homeId === me || f.awayId === me)).sort((a, b) => b.round - a.round);
    const myFriendlies = (lg.friendlies || []).filter((f) => f.played && (f.homeId === me || f.awayId === me));
    let lastCard = '<h2>Last result</h2><p class="note">No league match played yet.</p>' + (myFriendlies.length ? '<p class="desc">Pre-season friendlies:</p>' + myFriendlies.map((f) => `<p class="note">${esc(FM.teamById(lg, f.homeId).name)} ${f.hg}-${f.ag} ${esc(FM.teamById(lg, f.awayId).name)}</p>`).join('') : '');
    if (played.length) {
      const f = played[0], home = FM.teamById(lg, f.homeId), away = FM.teamById(lg, f.awayId);
      const hs = f.stats[home.id], as = f.stats[away.id], tot = hs.possession + as.possession;
      lastCard = `<h2>Last result</h2><div class="fixture-big">${esc(home.name)} ${f.hg}-${f.ag} ${esc(away.name)}</div>
        <p class="desc">Shots ${hs.shots}-${as.shots} · On target ${hs.onTarget}-${as.onTarget} · xG ${hs.xg.toFixed(2)}-${as.xg.toFixed(2)} · Possession ${pct(hs.possession, tot)}-${pct(as.possession, tot)}</p>`;
    }
    const team = userTeam();
    const hurt = team.squad.filter(FM.isInjured), tired = team.players.filter((p) => !FM.isInjured(p) && FM.conditionOf(p) < 0.7);
    const hurtXI = team.players.filter(FM.isInjured);
    const fitCard = '<h2>Squad fitness</h2>' + (hurt.length ? '<div class="tablewrap"><table class="data"><tbody>' + hurt.map((p) => `<tr class="out"><td class="l">${esc(p.name)} (${p.natural})</td><td class="l">${esc(injuryText(p))}</td></tr>`).join('') + '</tbody></table></div>' : '<p class="desc">No injuries.</p>') +
      (hurtXI.length ? `<p class="note warnnote">${hurtXI.map((p) => esc(p.name)).join(', ')} ${hurtXI.length > 1 ? 'are' : 'is'} in your starting line-up but injured. The best available replacement will start unless you change it on the Tactics page.</p>` : '') +
      (tired.length ? `<p class="desc">Tired starters: ${tired.map((p) => esc(shortName(p)) + ' ' + Math.round(100 * FM.conditionOf(p)) + '%').join(', ')}.</p><p class="note">Tired players slow down, make more mistakes and risk injury. Rest helps.</p>` : '<p class="note">The starting eleven is fresh.</p>');
    const latest = (world.league.news || []).slice(-3).reverse();
    const newsCard = '<h2>Latest news</h2>' + (latest.length ? latest.map((n) => `<div class="hyp"><div class="hyp-head"><span class="lvl ${n.mine ? 'alevel' : 'gcse'}">${esc(n.kind)}</span> <b>${esc(n.headline)}</b></div></div>`).join('') + '<div class="row"><button data-nav-news>All the news</button></div>' : '<p class="note">News appears after the first round of matches.</p>');
    host.innerHTML = `<div class="two">
      <div style="display:grid;gap:16px"><div class="card">${next}</div><div class="card">${lastCard}</div><div class="card">${fitCard}</div><div class="card">${newsCard}</div></div>
      <div class="card"><h2>League table</h2>${tableHtml(rows, true)}</div></div>`;
    const nb = host.querySelector('[data-nav-news]'); if (nb) nb.addEventListener('click', () => setView('news'));
    const ns = host.querySelector('#newSeasonBtn'); if (ns) ns.addEventListener('click', () => { FM.clearSave(); world.league = null; world.match = null; showNewGame(); });
  }

  // How many matches an injured player will still miss, counting from the next Saturday.
  function missesCount(until) {
    const today = FM.userFixtureToday(world.league);
    let sat = world.league.day + (today && !today.played ? 0 : 1); // today's match only counts if it has not been played yet
    while (sat % 7 !== 5) sat++;
    return Math.max(1, Math.ceil((until - sat) / 7));
  }
  const injuryText = (p) => (p.injury ? p.injury.name + ', misses ' + (missesCount(p.injury.until) === 1 ? 'the next match' : 'the next ' + missesCount(p.injury.until) + ' matches') : '');
  const condClass = (p) => (FM.isInjured(p) ? 'out' : FM.conditionOf(p) < 0.6 ? 'low' : '');

  // ---------- league and squad ----------
  function renderLeague() {
    const lg = world.league, host = el('view-league'), me = lg.userId;
    const rows = FM.tableRows(lg);
    const rounds = {};
    lg.fixtures.forEach((f) => { (rounds[f.round] = rounds[f.round] || []).push(f); });
    const nextRound = FM.nextUserFixture(lg) ? FM.nextUserFixture(lg).round : 13;
    const keys = Object.keys(rounds).map(Number).filter((r) => r <= nextRound + 1).sort((a, b) => b - a);
    const roundHtml = keys.map((r) => `<div><h3>Round ${r + 1}</h3>` + rounds[r].map((f) => {
      const h = FM.teamById(lg, f.homeId), a = FM.teamById(lg, f.awayId);
      return `<div class="res ${f.homeId === me || f.awayId === me ? 'me' : ''}"><span>${esc(h.name)}</span><b>${f.played ? f.hg + ' - ' + f.ag : 'v'}</b><span>${esc(a.name)}</span></div>`;
    }).join('') + '</div>').join('');
    const fr = (lg.friendlies || []).filter((f) => f.played);
    const friendlyCard = fr.length ? `<div class="card"><h2>Pre-season friendlies</h2><p class="note">These did not count toward the table.</p><div class="rounds">${fr.map((f) => `<div class="res ${f.homeId === me || f.awayId === me ? 'me' : ''}"><span>${esc(FM.teamById(lg, f.homeId).name)}</span><b>${f.hg} - ${f.ag}</b><span>${esc(FM.teamById(lg, f.awayId).name)}</span></div>`).join('')}</div></div>` : '';
    host.innerHTML = `<div class="two"><div class="card"><h2>League table</h2>${tableHtml(rows, false)}</div><div style="display:grid;gap:16px"><div class="card"><h2>Results and fixtures</h2><div class="rounds">${roundHtml}</div></div>${friendlyCard}</div></div>`;
  }
  // The ratings that matter for each kind of player, and how each of them compares with the whole league's players in that position.
  const SQ_STATS = { GK: ['gk'], CB: ['pace', 'tackling', 'heading', 'composure'], FB: ['pace', 'tackling', 'passing', 'stamina', 'dribbling'], DM: ['tackling', 'passing', 'stamina', 'composure'], CM: ['passing', 'dribbling', 'stamina', 'tackling'], AM: ['passing', 'dribbling', 'finishing', 'composure'], WF: ['pace', 'dribbling', 'finishing', 'passing'], ST: ['finishing', 'pace', 'heading', 'composure'] };
  function squadMarks(players) {
    const lg = world.league, pool = lg ? [].concat.apply([], lg.teams.map((t) => t.squad || [])) : players;
    const cache = {}, marks = {};
    const dist = (g, s) => {
      const k = g + ':' + s; if (cache[k]) return cache[k];
      const v = pool.filter((q) => q.natural === g && q.ratings).map((q) => FM.shown(q.ratings[s])), n = v.length;
      if (n < 6) return (cache[k] = null);
      const m = v.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(v.reduce((a, b) => a + (b - m) * (b - m), 0) / n) || 1;
      return (cache[k] = { m, sd });
    };
    players.forEach((p) => (SQ_STATS[p.natural] || []).forEach((s) => {
      const d = dist(p.natural, s); if (!d || !p.ratings || p.ratings[s] == null) return;
      const z = (FM.shown(p.ratings[s]) - d.m) / d.sd;
      if (z >= 0.9) (marks[p.id] = marks[p.id] || {})[s] = 'good'; else if (z <= -0.9) (marks[p.id] = marks[p.id] || {})[s] = 'bad';
    }));
    return marks;
  }
  FM.squadMarks = squadMarks;
  function renderSquad() {
    const team = userTeam(), host = el('view-squad');
    const onPitch = team.players.slice().sort((a, b) => a.index - b.index);
    const all = onPitch.concat(team.bench);
    // Green and red give a feel for the squad at a glance: a number is green when it is clearly above, and red when it is clearly below, what
    // the other players in the league who play the same position have, in the ratings that matter for that position.
    const marks = squadMarks(all);
    // high potential: room to grow well beyond what he is now, and a ceiling that is high in its own right
    const highPot = (p) => FM.potentialOf(p) >= 85 && FM.potentialOf(p) - FM.abilityOf(p) >= 8;
    const cell = (p, stat, text) => { const k = marks[p.id] && marks[p.id][stat]; return `<td${k ? ' class="hl-' + k + '" title="' + (k === 'good' ? 'Well above' : 'Well below') + ' the other ' + p.natural + 's in the league"' : ''}>${text}</td>`; };
    const row = (p) => `<tr class="player-row" data-player="${p.id}" tabindex="0"><td>${portraitCache[p.id] ? `<img class="squad-thumb" src="${portraitCache[p.id]}" alt="">` : `<span class="squad-thumb fallback">${esc(p.name.split(/\s+/).map((x) => x[0]).slice(0, 2).join(''))}</span>`}</td><td class="l">${p.number}</td><td class="l"><button class="player-link" data-player="${p.id}">${esc(p.name)}</button>${captain && p.id === captain.id ? ' <span class="cap-badge" title="Captain">C</span>' : ''}</td><td class="l">${esc(p.nation)}</td><td class="l">${p.natural}</td><td class="l">${p.slotKey ? p.slotKey : 'Bench'}</td><td class="l">${{ right: 'Right', left: 'Left', both: 'Both' }[p.foot] || ''}</td><td>${p.height || '-'}</td><td class="${condClass(p)}">${Math.round(100 * FM.conditionOf(p))}%</td><td class="l ${FM.isInjured(p) ? 'out' : ''}">${FM.isInjured(p) ? esc(injuryText(p)) : 'Fit'}</td>
      <td>${FM.ageOf(p)}</td><td><b>${FM.abilityOf(p)}</b></td><td${highPot(p) ? ' class="hl-good" title="High potential: far more to come"' : ''}>${FM.potentialOf(p)}</td>${cell(p, 'pace', FM.shown(p.ratings.pace))}${cell(p, 'dribbling', FM.shown(p.ratings.dribbling))}${cell(p, 'passing', FM.shown(p.ratings.passing))}${cell(p, 'finishing', FM.shown(p.ratings.finishing))}${cell(p, 'tackling', FM.shown(p.ratings.tackling))}${cell(p, 'heading', FM.shown(p.ratings.heading))}${cell(p, 'composure', FM.shown(p.ratings.composure))}${cell(p, 'stamina', p.ratings.stamina ? FM.shown(p.ratings.stamina) : '-')}${cell(p, 'gk', p.natural === 'GK' ? FM.shown(p.ratings.gk) : '-')}
      <td>${p.stats.apps}</td><td>${p.stats.goals}</td><td>${p.stats.shots}</td><td>${p.stats.yellows}</td><td>${p.stats.reds}</td></tr>`;
    const captain = FM.captainOf(world.league, team);
    const selected = all.find((p) => p.id === world.profilePlayerId) || captain || all[0];
    const head = `<thead><tr><th>Player</th><th class="l">#</th><th class="l">Name</th><th class="l">Nation</th><th class="l">Pos</th><th class="l">Now</th><th class="l">Foot</th><th title="Height in cm. Taller players are better in the air.">Ht</th><th>Cond</th><th class="l">Fitness</th><th title="Age in years">Age</th><th title="What he is worth to a team now, out of 100, in his natural position">Ability</th><th title="The most he can reach, out of 100. Develop him in the Development tab.">Potential</th><th>Pac</th><th>Dri</th><th>Pas</th><th>Fin</th><th>Tck</th><th>Hea</th><th>Com</th><th>Sta</th><th>GK</th><th>Apps</th><th>Goals</th><th>Shots</th><th>YC</th><th>RC</th></tr></thead>`;
    const GROUPS = [['Goalkeepers', ['GK']], ['Defenders', ['CB', 'FB']], ['Midfielders', ['DM', 'CM', 'AM']], ['Forwards', ['WF', 'ST']]];
    const open = world.squadOpen || (world.squadOpen = {});
    const groups = GROUPS.map(([title, kinds]) => {
      const list = all.filter((p) => kinds.indexOf(p.natural) >= 0);
      if (!list.length) return '';
      return `<details class="sq-group" data-group="${title}"${open[title] === false ? '' : ' open'}><summary>${title} <small>${list.length} player${list.length === 1 ? '' : 's'}</small></summary><div class="tablewrap"><table class="data">${head}<tbody>${list.map(row).join('')}</tbody></table></div></details>`;
    }).join('');
    const capIntro = !world.league.captainIntroSeen && captain ? `<div class="cap-modal" role="dialog" aria-modal="true" aria-label="A message from your captain"><div class="card cap-intro"><div class="cap-intro-who">${portraitCache[captain.id] ? `<img class="squad-thumb" src="${portraitCache[captain.id]}" alt="">` : `<span class="squad-thumb fallback">${esc(captain.name.split(/\s+/).map((x) => x[0]).slice(0, 2).join(''))}</span>`}<div><b>${esc(captain.name)}</b><small>Captain</small></div></div><p>“Welcome boss, the lads and I are really excited to have you here. To help you get started, this is the list of all of us. Take a look through when you get the chance, then work through the numbered stages to prepare us for our first game.”</p><button type="button" class="cap-intro-ok">Thanks, captain</button></div></div>` : '';
    host.innerHTML = `<div class="sq-layout"><div class="sq-main">${capIntro}<div id="playerProfile"></div><div class="card"><div class="row" style="justify-content:space-between"><h2>${esc(team.name)}: squad of ${all.length}</h2></div>
      <p class="sq-key"><span><i class="g"></i>Well above the other players in the league in that position</span><span><i class="r"></i>Well below</span></p>
      ${groups}
      </div></div>
      </div>`;
    const openPlayer = (id) => { world.profilePlayerId = id; renderSquad(); const pp = el('view-squad').querySelector('#playerProfile'); if (pp && pp.scrollIntoView) pp.scrollIntoView({ block: 'start', behavior: 'smooth' }); };
    host.querySelectorAll('[data-player]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); openPlayer(b.dataset.player); }));
    host.querySelectorAll('.sq-group').forEach((d) => d.addEventListener('toggle', () => { open[d.dataset.group] = d.open; }));
    // the pop-up sits on the body so it is centred on what is in view, whatever the page around it is doing
    document.querySelectorAll('body > .cap-modal').forEach((n) => n.remove());
    const capModal = host.querySelector('.cap-modal');
    if (capModal) document.body.appendChild(capModal);
    const okBtn = document.querySelector('.cap-modal .cap-intro-ok');
    if (okBtn) okBtn.addEventListener('click', () => { const mm = document.querySelector('body > .cap-modal'); if (mm) mm.remove(); world.league.captainIntroSeen = true; saveSoon(); renderSquad(); });
    renderPlayerProfile(team, selected, host.querySelector('#playerProfile'));
    ensurePortraitsLoaded(all);
  }

  const PORTRAIT_STORE = 'lm_football_ashford_portraits_v4';
  const PORTRAIT_KEY = (id) => 'v4:' + id;
  const portraitCache = (() => { try { return JSON.parse(localStorage.getItem(PORTRAIT_STORE) || '{}') || {}; } catch (e) { return {}; } })();
  let portraitDbPromise = null;
  function portraitDb() {
    if (!window.indexedDB) return Promise.resolve(null);
    if (!portraitDbPromise) portraitDbPromise = new Promise((resolve) => {
      const req = indexedDB.open('lastmind-football-media', 1);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('portraits')) req.result.createObjectStore('portraits'); };
      req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(null);
    });
    return portraitDbPromise;
  }
  async function ensurePortraitsLoaded(players) {
    if (world.portraitsLoaded || world.portraitsLoading) return;
    world.portraitsLoading = true;
    const db = await portraitDb();
    if (db) for (const p of players) if (!portraitCache[p.id]) await new Promise((resolve) => { const req = db.transaction('portraits').objectStore('portraits').get(PORTRAIT_KEY(p.id)); req.onsuccess = () => { if (req.result) portraitCache[p.id] = req.result; resolve(); }; req.onerror = resolve; });
    world.portraitsLoaded = true; world.portraitsLoading = false;
    if (world.view === 'squad') renderSquad();
  }
  function portraitFallback(p) { return `<div class="player-portrait fallback">${esc(p.name.split(/\s+/).map((x) => x[0]).slice(0, 2).join(''))}</div>`; }
  function renderPlayerProfile(team, p, host) {
    if (!p || !host) return;
    const ashford = team.name === 'Ashford Rovers', image = ashford && portraitCache[p.id];
    const ratings = [['Pace',p.ratings.pace],['Dribbling',p.ratings.dribbling],['Passing',p.ratings.passing],['Finishing',p.ratings.finishing],['Tackling',p.ratings.tackling],['Heading',p.ratings.heading],['Composure',p.ratings.composure],['Stamina',p.ratings.stamina],['Goalkeeping',p.ratings.gk]].filter((x) => x[1] != null);
    const capBtnHook = () => { const b = host.querySelector('.cap-make'); if (b) b.addEventListener('click', () => { world.league.captains = world.league.captains || {}; world.league.captains[team.id] = b.dataset.cap; saveSoon(); renderSquad(); }); };
    host.innerHTML = `<article class="player-profile card"><div id="profilePortrait">${image ? `<img class="player-portrait" src="${image}" alt="Portrait of ${esc(p.name)}">` : portraitFallback(p)}</div><div><span class="eyebrow">${esc(team.name)} · #${p.number}</span><h2 class="profile-name">${esc(p.name)}</h2><p class="desc">${esc(p.nation)} · ${p.natural} · ${p.height || '—'} cm · ${p.foot || '—'} foot</p>${FM.captainOf(world.league, team) && FM.captainOf(world.league, team).id === p.id ? '<p class="cap-line"><span class="cap-badge">C</span> Club captain</p>' : (team.id === world.league.userId ? '<p class="cap-line"><button type="button" class="cap-make" data-cap="' + p.id + '">Make captain</button></p>' : '')}<div class="profile-stats"><b>${FM.playerRating(p).toFixed(1)}<small>Overall</small></b><b>${Math.round(100 * FM.conditionOf(p))}%<small>Condition</small></b><b>${p.stats.apps}<small>Apps</small></b><b>${p.stats.goals}<small>Goals</small></b></div></div><div class="attribute-grid">${ratings.map(([n,v]) => `<div><span>${n}</span><b>${FM.shown(v)}</b><i style="--v:${v}%"></i></div>`).join('')}</div></article><div id="pfHost"></div>`;
    capBtnHook();
    if (FM.renderForm) FM.renderForm(host.querySelector('#pfHost'), world.league, p, team);
  }

  // ---------- the tactics page ----------
  // One page, used on any preparation day and again when the match is paused. Changes apply to the rest of the match.
  const PREP_TABS = [
    ['squad', '1. Squad and formation'], ['build', '2. Build-up'], ['midfield', '3. Play through midfield'], ['final', '4. Final third'],
    ['transdef', '5. Defensive transition'], ['organised', '6. Organised defending'], ['transatt', '7. Attacking transition'], ['setpieces', 'Set pieces'],
  ];
  const TEST_TABS = [['build','Build-up'],['midfield','Midfield'],['final','Final third'],['press','Pressing their build-up'],['organised','Defending your third'],['transdef','Defensive transition'],['transatt','Attacking transition']];
  // Each tab with a board shows the team in that phase of play.
  const BOARD_KEY = { squad: 'shape', build: 'build', midfield: 'midfield', final: 'final', organised: 'without' };
  const PHASE_TEXT = {
    shape: 'The team set up in its formation. Choose the formation here, and drag one player onto another to swap them (a shirt dropped anywhere else springs back). Every other phase follows from this shape and your instructions, and is where you place players by hand.',
    build: 'The team with the ball close to its own goal, which is why the ball starts beside the goalkeeper. These positions apply while the ball is in the team\'s own third, and the team moves toward the final-third positions as the ball goes forward. The ball here is only a guide, so you can drag it to picture other situations. A shirt you drag moves for this phase only, and only as far as the player could run from his other positions. A shirt with a gold dot has been placed by hand.',
    midfield: 'This phase starts from the positions chosen in build-up. Move the shirts again to show how the team plays through midfield; these become the starting positions for the final third. Each shirt position is an instruction in itself, so it does not need to be repeated in writing.',
    final: 'The team with the ball near the opposition goal. Attackers can stand on the edge of the box or inside it, but they are held at the offside line, and the same instructions apply as in every other phase.',
    transAtt: 'The few seconds just after winning the ball, before the team settles. This is where the first runs are made, so positions here pull players toward where the attack will go.',
    transDef: 'The few seconds just after losing the ball. Players here are pulled toward the positions that cut the counter-attack off, or toward the ball if the team presses.',
    press: 'The team pressing the opposition while they build from their own end. Place the shirts where you want each player to engage; their positions define how high and wide the press is.',
    without: 'The team without the ball, set to defend. The positions of the back line define its height, and the spread of the shirts defines the defensive width.',
  };
  // Every stage of play has two diagrams, each with the ball: how the team stands at the start of the stage and how it stands by the end. The
  // possession stages are one chain, so the end of one is the start of the next (the first diagram of the next page is the last of this one and
  // cannot be changed there). `locked` marks a diagram that belongs to another page.
  const BOARD_PAIRS = {
    build: [
      { key: 'build', title: 'The start: a goal kick', note: 'Where everyone stands before the ball is played. How the team then plays out is decided by the instructions below; where it gets to is worked out from them and shown on the next page.' },
      { key: 'buildEnd', title: 'Building out: the ball reaches midfield', note: 'Worked out from the goal kick and the instructions.' },
    ],
    midfield: [
      { key: 'buildEnd', title: '1. The start: where the build-up ended', locked: 'build', note: 'Set on the Build-up page.' },
      { key: 'midfield', title: '2. Through midfield: the ball is at the edge of the final third', note: 'How the team gets the ball up to the final third. This is where the final third starts.' },
    ],
    final: [
      { key: 'midfield', title: '1. The start: where the move through midfield ended', locked: 'midfield', note: 'Set on the Play through midfield page.' },
      { key: 'final', title: '2. Creating and taking a chance', note: 'How the team gets into the box and scores.' },
    ],
    organised: [
      { key: 'without', title: '1. They have the ball in midfield', note: 'How the team is set while the opposition are still some way from your goal.' },
      { key: 'withoutEnd', title: '2. They have the ball near your goal', note: 'How the team defends the area once the attack arrives.' },
    ],
    transdef: [
      { key: 'transDef', title: '1. The moment the ball is lost', note: 'Where everyone stands the instant you lose it.' },
      { key: 'transDefEnd', title: '2. A few seconds later', note: 'The shape you want to have reached.' },
    ],
    transatt: [
      { key: 'transAtt', title: '1. The moment the ball is won', note: 'Where everyone stands the instant you win it.' },
      { key: 'transAttEnd', title: '2. The attack is under way', note: 'Where the team wants to be a few seconds into the break.' },
    ],
  };
  const PAIR_TITLE = { build: 'Build-up from a goal kick', midfield: 'Play through midfield', final: 'The final third', organised: 'Organised defending', transdef: 'Defensive transition', transatt: 'Attacking transition' };
  // Draws the two diagrams of a page into the given host, and redraws them when asked.
  // Each stage has a first diagram that is fixed (the goal kick for build-up; for the stages after it, where the stage before ended) and a second
  // diagram where the stage ends. The second one can have more than one version: the default, and any "page" the manager adds, each with a label
  // and a condition the match checks. The stage after then shows one starting diagram for every version of the end before it.
  const DEF_ENDS = { withoutEnd: true, transDefEnd: true };
  function mountPair(host, team, tab, instr) {
    FM.ensurePages(team);
    const pair = BOARD_PAIRS[tab], startDef = pair[0], endDef = pair[1], endKey = endDef.key;
    // Tactics now have one clear version per phase. Older saves may still
    // contain conditional pages, so collapse them into the default view.
    team.pages[endKey] = [];
    const conds = tab === 'build' ? FM.BUILD_CONDS : (DEF_ENDS[endKey] ? FM.SCENARIO_CONDS_DEF : FM.SCENARIO_CONDS);
    const pagesOf = (k) => (team.pages && team.pages[k]) || [];
    team.pageDefaults = team.pageDefaults || {};
    const dfl = team.pageDefaults[endKey] = Object.assign({ label: 'Default page', cond: 'always' }, team.pageDefaults[endKey] || {});
    // When a page is chosen by how the opposition line up, the shirts are the ones dragged into place on its own diagram.
    const shapeNote = (pg) => (pg.cond === 'opp_shape' ? `<p class="note scn-shape">${pg.oppSig ? 'Their shape for this page is saved from the shirts you placed. Drag their shirts on its diagram to change it.' : 'Drag the opposition shirts on this page\'s diagram to show how they should line up when it applies.'}</p>` : '');
    const withKey = (k, pg) => (pg.id ? k + '#' + pg.id : k);
    const pname = (pg) => FM.pageName(team, endKey, pg && pg.id ? pg : null);
    const condOpts = (cur) => conds.map((c) => `<option value="${c.key}"${c.key === cur ? ' selected' : ''}>${esc(c.label)}</option>`).join('');
    // the starting diagrams: one fixed one, or one for each version of the end of the stage before (those are drawn on that stage's page)
    const prev = startDef.locked ? [{ id: null, label: 'Default page' }].concat(pagesOf(startDef.key)) : null;
    let starts = prev
      ? prev.map((pg) => ({ key: withKey(startDef.key, pg), locked: true, def: startDef, label: FM.pageName(team, startDef.key, pg.id ? pg : null) }))
      : [{ key: startDef.key, locked: false, def: startDef, label: null }];   // the goal kick is the start of the build-up, and is shown beside where it ends
    // The build-up has no default page: the pages are the ways the opposition may press that the manager has prepared for. Anything else is
    // set up from the formation, following the instructions of the nearest prepared page.
    const buildPages = false;
    const ends = (buildPages ? [] : [{ id: null, label: dfl.label, cond: dfl.cond }]).concat(pagesOf(endKey)).map((pg) => ({ key: withKey(endKey, pg), locked: false, def: endDef, pg }));
    if (buildPages) starts = ends.map((e) => ({ key: withKey('build', e.pg), locked: false, def: startDef, label: null, pg: e.pg, pgLink: e.pg }));
    // When a fixed start sits beside the end with its name and condition above it, the start carries an invisible copy of that row, so the two
    // diagrams begin at the same height.
    const levelWithEnd = buildPages || (starts.length === 1 && ends.length === 1);
    const holdHead = '';
    // Kept only to read old saved tactics; conditional-page controls are no
    // longer rendered and every phase now has one editable version.
    const presetLabel = (key) => ((conds.concat(FM.LINKED_CONDS).find((c) => c.key === key) || {}).label || '');
    const condKey = (h) => (h.from ? (h.extra || '') : (h.cond && h.cond !== 'always' ? h.cond : ''));
    const extraText = (h) => { const k = condKey(h); return k === 'custom' ? (h.custom && h.custom.text) || '' : k ? ((h.custom && h.custom.text) || presetLabel(k)) : ''; };
    const extraLabel = (h) => { const k = condKey(h); return k === 'custom' ? ((h.custom && (h.custom.summary || h.custom.text)) || 'Your own condition') : k ? ((h.custom && (h.custom.summary || h.custom.text)) || presetLabel(k)) : (h.from ? 'No extra condition' : 'No condition'); };
    const extraNote = (h) => { const k = condKey(h); return k === 'custom' ? (h.custom && h.custom.when ? 'Understood as: ' + (h.custom.summary || h.custom.text) + '.' : 'Not set yet, so this page is not used until it is.') : k ? '' : (h.from ? 'It is used whenever the stage before ended on the page it follows.' : ''); };
    // The build-up: a drop-down of the ways the opposition may press the goal kick, nothing to type
    const presetField = () => '';
    const ddFieldFree = () => '';
    const ddField = (h, id) => (tab === 'build' ? presetField(h, id) : ddFieldFree(h, id));
    const ddNote = (h, id) => (tab === 'build' ? '' : `<p class="note scn-custom-note" data-extra-note="${id}">${esc(extraNote(h))}</p>`);
    const customRow = (holder, id) => {
      const c = holder.custom || {};
      return `<div class="scn-custom"><input type="text" class="scn-custom-text" maxlength="200" placeholder="Say when, in your own words: for example when our full-backs have stepped high and we are drawing" value="${esc(c.text || '')}" data-custom-text="${id}" aria-label="When this page should be used"><button type="button" data-custom-go="${id}">${c.when ? 'Update' : 'Save'}</button></div><p class="note scn-custom-note" data-custom-note="${id}">${c.when ? 'Understood as: ' + esc(c.summary || c.text) + '.' : 'Not set yet, so this page is not used until it is.'}</p>`;
    };
    // Old saves can still be read, but no extra pages can be created.
    const startIdOf = (e) => (e.pg && e.pg.from) || 'default';
    const addAbove = () => '';
    const figure = (f, n) => `<figure class="bp${f.locked ? ' locked' : ''}" data-fig="${n}">
        ${buildPages ? '' : addAbove(f)}${!f.pg && levelWithEnd ? holdHead : ''}
        ${buildPages ? '' : `<figcaption><b>${esc(starts.length || !f.pg ? f.def.title : f.def.title.replace(/^\d+\.\s*/, ''))}</b><span class="note">${esc(f.label ? 'From the stage before: ' + f.label : f.def.note)}</span></figcaption>`}
        <div class="board-host" id="board${n}"></div>${f.locked ? '' : `<div class="row"><button data-reset="${f.key}">Reset this diagram</button></div>`}
      </figure>`;
    // One start and one end sit side by side. Otherwise the starts are along the top and the ends (the versions of the second diagram) below
    // them. Every diagram has its own instruction box directly beneath it, the same width as the diagram; a start that is alone at the top has
    // its box beside it instead.
    const all = buildPages ? starts : starts.concat(ends);
    const fig = (list, offset) => list.map((f, k) => figure(f, offset + k));
    const row = (items, cls) => `<div class="board-pair${cls ? ' ' + cls : ''}">${items.join('')}</div>`;
    const box = (n) => `<div class="bp bp-instr" id="dgInstr${n}"></div>`;
    const startBox = (n) => (starts[n].locked ? '<div class="bp bp-spacer"></div>' : box(n));
    const loneStart = starts.length === 1 && ends.length >= 2;
    let html;
    const addTop = '';
    if (buildPages && !starts.length) html = addTop + '<p class="note scn-empty">Add a page for each way the opposition might press your goal kick. Anything you have not prepared for, the team sets up from its formation.</p>';
    else if (buildPages) html = addTop + (starts.length === 1 ? row([figure(starts[0], 0)], 'solo') + row([box(0)], 'solo') : `<div class="board-pair cols" style="--n:${Math.min(starts.length, 3)}">` + starts.map((s, i) => `<div class="scn-col">${figure(s, i)}${box(i)}</div>`).join('') + '</div>');   // several pages sit side by side, each with its own box under it
    else if (!starts.length) html = ends.length === 1 ? row(fig(ends, 0), 'solo') + row([box(0)], 'solo') : row(fig(ends, 0), 'ends-row') + row(ends.map((e, i) => box(i)));
    else if (starts.length === 1 && ends.length === 1) html = row(fig(all, 0), 'linked') + row([startBox(0), box(1)]);
    else if (loneStart) html = row(fig(starts, 0).concat(starts[0].locked ? [] : [box(0)])) + row(fig(ends, 1), 'ends-row') + row(ends.map((e, i) => box(1 + i)));
    else {
      // several starts: a column for each, its own diagram on top and the pages that follow it underneath
      const startId = (s) => (s.key.indexOf('#') > 0 ? s.key.slice(s.key.indexOf('#') + 1) : 'default');
      const ids = starts.map(startId);
      const colOf = (e) => { const k = ids.indexOf(startIdOf(e)); return k < 0 ? 0 : k; };
      html = `<div class="board-pair cols" style="--n:${starts.length}">` + starts.map((s, i) => `<div class="scn-col">${figure(s, i)}${s.locked ? '' : box(i)}${ends.map((e, j) => (colOf(e) === i ? figure(e, starts.length + j) + box(starts.length + j) : '')).join('')}</div>`).join('') + '</div>';
    }
    host.innerHTML = `<div class="scn">${html}</div>`;
    // An arrow from each starting diagram to the end diagram that follows it (labelled with the page it came from), so it is plain which version
    // of the stage before leads to which version of this one.
    const drawArrows = () => {
      const scn = host.querySelector('.scn');
      if (!scn) return;
      const old = scn.querySelector('.scn-arrows'); if (old) old.remove();
      const figOf = (k) => scn.querySelector('figure.bp[data-fig="' + k + '"]');
      if (!starts.length || scn.querySelectorAll('figure.bp').length < 2) return;
      const seenStart = {};
      const o = scn.getBoundingClientRect(), W = Math.round(o.width), H = Math.round(o.height);
      const R = (el) => { const r = el.getBoundingClientRect(); return { l: r.left - o.left, t: r.top - o.top, r: r.right - o.left, b: r.bottom - o.top, cx: (r.left + r.right) / 2 - o.left, cy: (r.top + r.bottom) / 2 - o.top }; };
      let svg = '<defs><marker id="scnArr" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#F2C14E"/></marker></defs>';
      ends.forEach((e, j) => {
        let i = buildPages ? j : 0;
        if (!buildPages && e.pg.from && e.pg.from !== 'default') { const k = starts.findIndex((s) => s.key.slice(s.key.indexOf('#') + 1) === e.pg.from && s.key.indexOf('#') > 0); if (k >= 0) i = k; }
        if (!buildPages && seenStart[i]) return; seenStart[i] = true;
        const sf = figOf(i), ef = figOf(starts.length + j);
        if (!sf || !ef) return;
        const label = starts[i].label || pname(e.pg) || '';
        const sr = R(sf), er = R(ef), rs = R(sf.parentElement), re = R(ef.parentElement);
        let d, mx, my;
        const sameParent = sf.parentElement === ef.parentElement, sameRow = sameParent && Math.abs(sr.t - er.t) < 20;
        if (sameRow) {   // side by side: straight across the gap, at the height of the middle of the pitch
          const bs = R(sf.querySelector('.board-host')), y = bs.cy;
          d = `M${sr.r + 4},${y} L${er.l - 6},${y}`; mx = (sr.r + er.l) / 2; my = y;
        } else {
          const x1 = sr.cx, y1 = (sameParent ? sr.b : rs.b) + 4, x2 = er.cx, y2 = (sameParent ? er.t : re.t) - 6, ym = (y1 + y2) / 2;
          d = Math.abs(x1 - x2) < 4 ? `M${x1},${y1} L${x2},${y2}` : `M${x1},${y1} C${x1},${ym} ${x2},${ym} ${x2},${y2}`;
          mx = (x1 + x2) / 2; my = ym;
        }
        svg += `<path d="${d}" fill="none" stroke="#F2C14E" stroke-width="3.5" stroke-linecap="round" marker-end="url(#scnArr)" opacity="0.95"/>`;
        if (label && !sameRow) {
          const text = label.length > 40 ? label.slice(0, 39) + '…' : label, w = Math.max(56, text.length * 6.9 + 18);
          svg += `<g><rect x="${(mx - w / 2).toFixed(1)}" y="${(my - 11).toFixed(1)}" width="${w.toFixed(1)}" height="22" rx="11" fill="#1A232D" stroke="#F2C14E" stroke-width="1.5"/><text x="${mx.toFixed(1)}" y="${(my + 4.5).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" font-family="Arial,sans-serif" fill="#F1EAD6">${esc(text)}</text></g>`;
        }
      });
      scn.insertAdjacentHTML('beforeend', `<svg class="scn-arrows" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${svg}</svg>`);
    };
    const draw = () => { if (!host.isConnected) return; all.forEach((f, n) => drawBoard(host.querySelector('#board' + n), team, f.key, { locked: f.locked, fit: true, big: !starts.length && ends.length === 1 })); drawArrows(); };
    draw();
    // The instruction box under one diagram. It is drawn again when a page is renamed, so its title follows the name as it is typed.
    const renderBox = (n) => {
      const f = all[n], at = host.querySelector('#dgInstr' + n);
      if (DEMO_MODE) { if (at) at.remove(); return; }
      if (!instr || !f || !at) return;
      {
        // where the shirts are for this box's diagram: from its start to its end, which is what Haiku is given along with the wording
        const startKeyFor = n < starts.length ? f.key : (f.pg.from && f.pg.from !== 'default' ? startDef.key + '#' + f.pg.from : startDef.key);
        const endKeyFor = n < starts.length ? endKey : f.key;
        const positions = () => team.players.map((p) => ({ number: p.number, name: p.name, slot: p.slotKey || '', start: FM.phasePos(team, p, startKeyFor), end: FM.phasePos(team, p, endKeyFor) }));
        if (n < starts.length) {
          if (f.locked) return;   // a start that came from the stage before has no box of its own: that stage's end page has it
          FM.renderInstructions(at, team, instr.hooks, { stage: instr.stage, part: buildPages ? null : 'start', fromId: null, pageId: buildPages ? (f.pgLink.id || 'default') : undefined, title: buildPages ? (ends.length > 1 ? 'How we build up: ' + pname(f.pgLink) : 'How we build up') : 'Instructions: the start', applies: buildPages ? 'applies to the whole build-up on this page: centrally or wide, short or long, who to find' : 'applies to the first part of this stage', positions });
        } else {
          const pgId = f.pg.id || 'default';
          FM.renderInstructions(at, team, instr.hooks, { stage: instr.stage, part: 'end', pageId: pgId, pageLabel: ends.length > 1 ? pname(f.pg) : null, title: ends.length > 1 ? 'Instructions: ' + pname(f.pg) : 'Instructions: the end', applies: ends.length > 1 ? 'applies to the end of this stage, on this page only' : 'applies to the end of this stage', positions });
        }
      }
    };
    all.forEach((f, n) => renderBox(n));
    host.querySelectorAll('[data-reset]').forEach((b) => b.addEventListener('click', () => { FM.clearPhase(team, b.dataset.reset); if (team.phaseBall) delete team.phaseBall[b.dataset.reset]; saveSoon(); renderTactics(); }));
    const endIndex = (id) => (buildPages ? 0 : starts.length) + ends.findIndex((e) => (e.pg.id || null) === (id || null));
    host.querySelectorAll('[data-def-label]').forEach((inp) => inp.addEventListener('input', () => { const v = inp.value.trim().slice(0, 40); dfl.label = v || 'Default page'; dfl.named = !!v; saveSoon(); renderBox(endIndex(null)); }));
    host.querySelectorAll('[data-preset]').forEach((sel) => sel.addEventListener('change', () => {
      const id = sel.dataset.preset, h = id === 'default' ? dfl : pagesOf(endKey).find((x) => x.id === id);
      if (!h) return;
      h.cond = sel.value; h.custom = null; h.extra = null; if (id !== 'default') h.named = false; else h.named = false;
      saveSoon(); renderTactics();
    }));
    host.querySelectorAll('[data-def-cond]').forEach((sel) => sel.addEventListener('change', () => { dfl.cond = sel.value; saveSoon(); renderTactics(); }));
    host.querySelectorAll('[data-add-after]').forEach((addBtn) => addBtn.addEventListener('click', () => {
      team.pages[endKey] = team.pages[endKey] || [];
      if (starts.length > 1 && !buildPages) {
        // a page that follows this start diagram: it is used when the stage before ended there and whatever is written for it holds
        team.pages[endKey].push({ id: 's' + Date.now().toString(36), label: 'Another page', cond: 'from_prev', from: addBtn.dataset.addAfter, extra: 'custom', custom: null, added: true });
        saveSoon(); renderTactics(); return;
      }
      const used = new Set(team.pages[endKey].map((x) => x.cond).concat([dfl.cond])), c = conds.find((x) => x.key !== 'always' && x.key !== 'opp_shape' && !used.has(x.key)) || conds[1];
      team.pages[endKey].push({ id: 's' + Date.now().toString(36), label: c.label.replace(/^The /, '').replace(/^./, (ch) => ch.toUpperCase()), cond: c.key, named: false });
      saveSoon(); renderTactics();
    }));
    host.querySelectorAll('[data-scn-label]').forEach((inp) => inp.addEventListener('input', () => {
      const pg = pagesOf(endKey).find((x) => x.id === inp.dataset.scnLabel); if (!pg) return;
      const v = inp.value.trim().slice(0, 40); pg.label = v || pg.label || 'Page'; pg.named = !!v; saveSoon();
      const n = endIndex(pg.id); renderBox(n);
    }));
    // a condition described in words: read once when it is saved, and kept as the situation the match checks
    host.querySelectorAll('[data-custom-go]').forEach((btn) => btn.addEventListener('click', async () => {
      const id = btn.dataset.customGo, holder = id === 'default' ? dfl : pagesOf(endKey).find((x) => x.id === id);
      if (!holder) return;
      const input = host.querySelector('[data-custom-text="' + id + '"]'), note = host.querySelector('[data-custom-note="' + id + '"]');
      const text = (input.value || '').trim();
      if (text.length < 3) { note.textContent = 'Write when this page should be used first.'; return; }
      btn.disabled = true; note.textContent = 'Reading it…';
      try {
        const opp = instr && instr.hooks && instr.hooks.opp ? instr.hooks.opp() : null;
        const out = { when: {}, summary: text };
        holder.custom = { text, when: out.when || {}, summary: out.summary || text };
        saveSoon(); renderTactics();
      } catch (err) { btn.disabled = false; note.textContent = err.message || 'LastMind could not read that just now. Try again.'; }
    }));
    // a following page's own condition: the box is empty for none, and whatever is written in it is read once and kept
    const holderOf = (id) => (id === 'default' ? dfl : pagesOf(endKey).find((x) => x.id === id));
    const setNone = (h) => { if (h.from) h.extra = null; else h.cond = 'always'; h.custom = null; };
    const saveExtra = async (id) => {
      const h = holderOf(id); if (!h) return;
      const input = host.querySelector('[data-extra-text="' + id + '"]'), note = host.querySelector('[data-extra-note="' + id + '"]'), btn = host.querySelector('[data-extra-go="' + id + '"]');
      const text = (input.value || '').trim();
      if (!text) { setNone(h); saveSoon(); renderTactics(); return; }
      if (text === extraText(h)) return;
      if (text.length < 3) { note.textContent = 'Say when this page should be used, or choose no condition.'; return; }
      btn.disabled = true; note.textContent = 'Reading it…';
      try {
        const opp = instr && instr.hooks && instr.hooks.opp ? instr.hooks.opp() : null;
        const presets = (h.from ? FM.LINKED_CONDS : conds).filter((c) => !['always', 'none', 'custom', 'opp_shape', 'from_prev'].includes(c.key)).map((c) => ({ key: c.key, label: c.label }));
        const out = { when: {}, summary: text, preset: null };
        const key = out.preset && presets.some((p) => p.key === out.preset) ? out.preset : 'custom';
        if (h.from) h.extra = key; else h.cond = key;
        h.custom = { text, when: out.when || {}, summary: out.summary || text };
        saveSoon(); renderTactics();
      } catch (err) { btn.disabled = false; note.textContent = err.message || 'LastMind could not read that just now. Try again.'; }
    };
    host.querySelectorAll('[data-extra-go]').forEach((b) => b.addEventListener('click', () => saveExtra(b.dataset.extraGo)));
    host.querySelectorAll('[data-dd-none]').forEach((b) => b.addEventListener('click', () => {
      const h = holderOf(b.dataset.ddNone); if (!h) return;
      setNone(h); saveSoon(); renderTactics();
    }));
    host.querySelectorAll('[data-dd-btn]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const panel = b.parentNode.querySelector('.scn-dd-panel'), open = panel.hidden;
      host.querySelectorAll('.scn-dd-panel').forEach((pn) => { pn.hidden = true; });
      host.querySelectorAll('[data-dd-btn]').forEach((x) => x.setAttribute('aria-expanded', 'false'));
      panel.hidden = !open; b.setAttribute('aria-expanded', String(open));
      if (open) { const i = panel.querySelector('input'); if (i) i.focus(); }
    }));
    host.querySelectorAll('.scn-dd-panel').forEach((pn) => pn.addEventListener('click', (e) => e.stopPropagation()));
    const closeDd = (e) => {
      if (!host.isConnected) { document.removeEventListener('click', closeDd); return; }
      host.querySelectorAll('.scn-dd-panel').forEach((pn) => { pn.hidden = true; });
      host.querySelectorAll('[data-dd-btn]').forEach((x) => x.setAttribute('aria-expanded', 'false'));
    };
    document.addEventListener('click', closeDd);
    host.querySelectorAll('[data-extra-text]').forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); saveExtra(i.dataset.extraText); } }));
    host.querySelectorAll('[data-scn-cond]').forEach((sel) => sel.addEventListener('change', () => {
      const pg = pagesOf(endKey).find((x) => x.id === sel.dataset.scnCond); if (!pg) return;
      pg.cond = sel.value; saveSoon(); renderTactics();
    }));
    host.querySelectorAll('[data-scn-del]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.scnDel, pg = pagesOf(endKey).find((x) => x.id === id); if (!pg) return;
      if (!confirm('Remove "' + pname(pg) + '" and its diagram?')) return;
      team.pages[endKey] = team.pages[endKey].filter((x) => x.id !== id);
      const k = endKey + '#' + id;
      if (team.phasePos) delete team.phasePos[k];
      if (team.phaseBall) delete team.phaseBall[k];
      if (buildPages) { const sk = 'build#' + id; if (team.phasePos) delete team.phasePos[sk]; if (team.phaseBall) delete team.phaseBall[sk]; }
      saveSoon(); renderTactics();
    }));
    world.redrawBoards = draw;
  }
  let boardResizeTimer = null, boardResizeW = 0;
  // One instruction box for each tactics page of the stage (the default page, then the ones the manager added), each applying only while its
  // own page is in use.
  function renderPageInstructions(host, team, hooks, tab, stage) {
    if (!host) return;
    if (DEMO_MODE) { host.innerHTML = ''; return; }
    FM.ensurePages(team);
    const pair = BOARD_PAIRS[tab], endKey = pair && pair[1].key;
    const dfl = (team.pageDefaults && team.pageDefaults[endKey]) || { label: 'Default page' };
    const pages = [{ id: 'default', label: dfl.label || 'Default page' }].concat(((team.pages && team.pages[endKey]) || []).map((p) => ({ id: p.id, label: p.label })));
    host.innerHTML = pages.map((p, i) => `<div class="page-instr" id="pageInstr${i}"></div>`).join('');
    pages.forEach((p, i) => FM.renderInstructions(host.querySelector('#pageInstr' + i), team, hooks, { stage, pageId: p.id, pageLabel: pages.length > 1 ? p.label : null }));
  }
  window.addEventListener('resize', () => { clearTimeout(boardResizeTimer); boardResizeTimer = setTimeout(() => { if (world.redrawBoards && Math.abs(window.innerWidth - boardResizeW) > 2) world.redrawBoards(); boardResizeW = window.innerWidth; }, 150); });
  const PHASE_CODE = { build: 'B', midfield: 'M', final: 'F', without: 'D' };
  // [key, label, left end, right end, min, max, what it does]
  const SLIDER_TABS = {
    squad: [],
    build: [],
    midfield: [],
    final: [
    ],
    transatt: [
      ['counterAttack', 'After winning the ball', 'Hold shape and build', 'Counter at once', 0, 1, 'For about eight seconds after a win, passes go forward faster and with more risk, before things settle.'],
    ],
    transdef: [
      ['counterPress', 'After losing the ball', 'Drop back into shape', 'Win it back at once', 0, 1, 'For about six seconds after a loss, more players press the new carrier, and harder.'],
    ],
    press: [
      ['pressBuildUp', 'Pressing their build-up', 'Let them play out', 'Press them high', 0, 1, 'When they build from their own third: how far up the pitch you press them, and how many players join in. At the top setting the team squeezes their goalkeeper and defenders hard, which wins the ball high but leaves space behind.'],
      ['pressing', 'Pressing everywhere else (same as on the Without the ball tab)', 'Stay compact', 'Press hard', 0, 1, 'How many players close down the ball carrier, and from how far away, once the ball is past their own third.'],
    ],
    without: [
      ['pressing', 'Pressing', 'Stay compact, let them have it', 'Press hard', 0, 1, 'How many players close down the ball carrier, and from how far away.'],
      ['tackleAggression', 'Tackling', 'Stay on feet', 'Go in hard', 0, 1, 'More challenges, but more fouls and more cards.'],
      ['offsideTrap', 'Offside trap', 'Do not play it', 'Step up together', 0, 1, 'Catches more runners who are only just onside, but a mistimed step leaves a gap.'],
    ],
  };

  // Surname only, shortened, so labels stay readable on a phone.
  const boardName = (p) => { const n = p.name.split(' ').slice(1).join(' ') || p.name; return n.length > 10 ? n.slice(0, 9) + '.' : n; };
  const KITNUM = (team) => 'background:' + team.kit.shirt + ';color:' + team.kit.number;
  const overall = (p) => { const r = p.ratings; return p.natural === 'GK' ? r.gk : Math.round((r.pace + r.dribbling + r.passing + r.finishing + r.tackling) / 5); };
  const inLive = () => world.match && world.match.clock > 0 && world.match.phase !== 'fulltime';

  function capturePlan(team, name) {
    return { id: 'plan-' + Date.now(), name, savedAt: Date.now(), formationKey: team.formationKey, formationLabel: team.formationLabel || null,
      tactics: JSON.parse(JSON.stringify(team.tactics)), shape: JSON.parse(JSON.stringify(team.shape || {})), phasePos: JSON.parse(JSON.stringify(team.phasePos || {})), phaseBall: JSON.parse(JSON.stringify(team.phaseBall || {})), pages: JSON.parse(JSON.stringify(team.pages || {})), pageDefaults: JSON.parse(JSON.stringify(team.pageDefaults || {})), rules: JSON.parse(JSON.stringify(team.rules || [])),
      players: team.players.map((p) => ({ id: p.id, roleId: p.roleId, options: JSON.parse(JSON.stringify(p.options || {})), instr: JSON.parse(JSON.stringify(p.instr || {})) })) };
  }
  function restorePlan(team, plan) {
    if (!plan) return;
    if (plan.formationKey !== team.formationKey) FM.setFormation(team, plan.formationKey);
    if (plan.formationLabel) team.formationLabel = plan.formationLabel; else delete team.formationLabel;
    team.tactics = Object.assign(FM.defaultTactics(), JSON.parse(JSON.stringify(plan.tactics || {})));
    team.shape = JSON.parse(JSON.stringify(plan.shape || {})); team.phasePos = JSON.parse(JSON.stringify(plan.phasePos || {})); team.phaseBall = JSON.parse(JSON.stringify(plan.phaseBall || {})); team.pages = JSON.parse(JSON.stringify(plan.pages || {})); team.pageDefaults = JSON.parse(JSON.stringify(plan.pageDefaults || {})); team.scenarios = JSON.parse(JSON.stringify(plan.scenarios || [])); team.defScenarios = JSON.parse(JSON.stringify(plan.defScenarios || [])); FM.ensurePages(team); team.rules = JSON.parse(JSON.stringify(plan.rules || []));
    (plan.players || []).forEach((saved) => { const p = team.players.find((x) => x.id === saved.id); if (p) { if (saved.roleId && FM.ROLES[saved.roleId]) p.roleId = saved.roleId; p.options = JSON.parse(JSON.stringify(saved.options || {})); p.instr = JSON.parse(JSON.stringify(saved.instr || {})); } });
  }
  // Saved match plans. Picking one applies it to the team straight away (it is what plays the next game), and "Save current plan" writes the
  // team as it now stands back into the picked plan; "Save as new plan" keeps the picked one and makes another.
  function renderPlanBar(team) {
    const host = el('planBar'), lg = world.league, plans = lg.tacticalPlans = lg.tacticalPlans || [];
    const active = plans.find((p) => p.id === lg.activePlanId) || null;
    if (!active) lg.activePlanId = null;
    host.innerHTML = `<select id="planSelect" aria-label="Saved tactical plans"><option value="">Saved match plans</option>${plans.map((p) => `<option value="${p.id}"${active && active.id === p.id ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select><button id="savePlan" class="primary" title="${active ? 'Write the team as it is now into this plan' : 'Save the team as it is now as a new plan'}">${active ? 'Save current plan' : 'Save current plan'}</button>${active ? '<button id="saveNewPlan">Save as new plan</button>' : ''}<button id="loadPlan"${active ? '' : ' disabled'} title="Discard changes since the plan was saved">Restore</button><button id="deletePlan"${active ? '' : ' disabled'}>Delete</button>${active ? `<span class="note plan-active">Playing the next game with “${esc(active.name)}”.</span>` : ''}`;
    const select = host.querySelector('#planSelect');
    select.addEventListener('change', () => {
      const plan = plans.find((p) => p.id === select.value);
      lg.activePlanId = plan ? plan.id : null;
      if (plan) { restorePlan(team, plan); world.selSlot = null; }
      saveSoon(); renderTactics();
    });
    const saveNew = () => {
      const name = prompt('Name this tactical plan:', 'Plan ' + (plans.length + 1));
      if (!name || !name.trim()) return;
      const plan = capturePlan(team, name.trim());
      plans.push(plan); lg.activePlanId = plan.id; lg.labCtx = plan.id + '|' + ((nextOpponent() || {}).name || '');   // a copy of the team as it is: the tests still apply
      saveSoon(); renderTactics();
    };
    host.querySelector('#savePlan').addEventListener('click', () => {
      if (!active) { saveNew(); return; }
      Object.assign(active, capturePlan(team, active.name), { id: active.id });
      lg.activePlanId = active.id; saveSoon(); renderTactics();
    });
    const sn = host.querySelector('#saveNewPlan'); if (sn) sn.addEventListener('click', saveNew);
    host.querySelector('#loadPlan').addEventListener('click', () => { if (!active) return; restorePlan(team, active); world.selSlot = null; saveSoon(); renderTactics(); });
    host.querySelector('#deletePlan').addEventListener('click', () => { if (!active || !confirm('Delete the saved plan “' + active.name + '”?')) return; lg.tacticalPlans = plans.filter((p) => p.id !== active.id); lg.activePlanId = null; saveSoon(); renderTactics(); });
  }

  // The tests belong to the opposition they were run against and to the match plan that was in use: a different opponent (the next game), or a
  // different saved plan picked, starts the tests afresh. The earlier runs are kept in an archive, not thrown away.
  function syncLabContext() {
    const lg = world.league; if (!lg) return;
    const opp = nextOpponent(); if (!opp) return;
    const ctx = (lg.activePlanId || 'current') + '|' + opp.name;
    if (lg.labCtx !== undefined && lg.labCtx !== null && lg.labCtx !== ctx) {
      const had = (lg.labRuns || []).length || Object.keys(lg.phaseLabRuns || {}).some((k) => (lg.phaseLabRuns[k] || []).length);
      if (had) { lg.labArchive = (lg.labArchive || []).concat([{ ctx: lg.labCtx, at: Date.now(), build: lg.labRuns || [], phases: lg.phaseLabRuns || {} }]).slice(-12); }
      lg.labRuns = []; lg.phaseLabRuns = {}; world.phaseLabs = {};
    }
    lg.labCtx = ctx;
  }
  function renderTactics() {
    if (!world.league) return;
    syncLabContext();
    // Dropping a shirt (or any change on the page) redraws it; stay where the manager was on the same page, and start at the top on a new one.
    const keepY = world._tacTab === world.tab && world._tacTesting === world.testing ? (window.scrollY || document.documentElement.scrollTop || 0) : null;
    const keepX = window.scrollX || document.documentElement.scrollLeft || 0;
    try { renderTacticsInner(); } finally {
      world._tacTab = world.tab; world._tacTesting = world.testing;
      if (keepY != null) window.scrollTo(keepX, keepY);
    }
  }
  function renderTacticsInner() {
    const team = userTeam();
    if (FM.inferShapeTactics) FM.inferShapeTactics(team);
    // During a match the board under the pitch is the squad and formation page, with the substitutes on the side: no tabs, no tests, no plans.
    const inMatch = world.view === 'match';
    if (inMatch) { world.testing = false; world.tab = 'squad'; }
    el('tabs').hidden = inMatch; el('planBar').hidden = inMatch;
    const head = document.querySelector('#tactics .tac-head h2'); if (head) head.textContent = inMatch ? 'Squad and substitutes' : 'Tactics';
    renderPlanBar(team);
    el('subInfo').textContent = '';
    el('subInfo').hidden = true;
    if (world.backToTests && !world.testing && !inMatch) {
      const si = el('subInfo'); si.hidden = false;
      si.innerHTML = '<button type="button" class="primary" id="backToTests">Back to tests</button> <span>Make your change here, then go back and test it again.</span>';
      const bb = si.querySelector('#backToTests');
      bb.addEventListener('click', () => { const ph = world.backToTests.phase; world.backToTests = null; world.testing = true; world.tab = ph; if (world.phaseLabs && world.phaseLabs[ph]) { world.phaseLabs[ph].view = 'results'; world.phaseLabs[ph].toAgain = true; } renderTactics(); renderPrepFlow(); });
    }
    // arriving at the tests afresh shows the controls (and what we recommend), not the last reading
    if (world.testing && world._tacTesting !== true) Object.keys(world.phaseLabs || {}).forEach((k) => { const lg0 = world.league, rr = k === 'build' ? (lg0.labRuns || []) : ((lg0.phaseLabRuns || {})[k] || []); if (!world.phaseLabs[k].busy) world.phaseLabs[k].view = rr.length ? 'results' : 'setup'; });
    const tabs = world.testing ? TEST_TABS : PREP_TABS;
    const progressKey = world.testing ? 'testPhaseMax' : 'prepPhaseMax', maxPhase = world.league[progressKey] || 0;
    // A step you have visited and moved on from turns green.
    // In the testing phase every test is open at once (they are largely the same statistical work, so only one has to be done), and a test you have
    // run turns green.
    const testRuns = (k) => (k === 'build' ? (world.league.labRuns || []) : ((world.league.phaseLabRuns || {})[k] || [])).length > 0;
    el('tabs').innerHTML = tabs.map(([k, label], i) => world.testing
      ? `<button data-tab="${k}" data-phase-index="${i}" class="${world.tab === k ? 'on' : (testRuns(k) ? 'done' : '')}">${label}</button>`
      : `<button data-tab="${k}" data-phase-index="${i}" class="${world.tab === k ? 'on' : (i < maxPhase ? 'done' : '')}">${label}</button>`).join('');
    el('tabs').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      const i = +b.dataset.phaseIndex; world.tab = b.dataset.tab;
      if (!world.testing) {
        world.league[progressKey] = Math.max(world.league[progressKey] || 0, i + 1);
        if (i >= 6) world.league.prepStep = Math.max(world.league.prepStep || 0, 2);
      }
      saveSoon(); renderTactics(); renderPrepFlow();
    }));
    if (world.testing) renderTestPhase(team, world.tab);
    else if (world.tab === 'setpieces') renderSetPieces(team);
    else if (world.tab === 'transdef' || world.tab === 'transatt') renderTransitionTab(team, world.tab);
    else if (['build', 'midfield', 'final', 'organised'].indexOf(world.tab) >= 0 && FM.renderScenario && nextOpponent()) renderScenarioTab(team, world.tab);
    else renderBoardTab(team, world.tab);
  }

  // Build-up, through midfield and the final third are prepared by showing the phase against the opposition (see scenario.js).
  function renderScenarioTab(team, tab) {
    const host = el('tabBody');
    const defTab = tab === 'organised', sub = defTab ? (world.defSub || 'press') : tab;
    host.innerHTML = (defTab ? '<div class="def-sub" role="tablist"><button data-sub="press" class="' + (sub === 'press' ? 'on' : '') + '">1. Pressing their build-up</button><button data-sub="organised" class="' + (sub === 'organised' ? 'on' : '') + '">2. Defending your third</button></div>' : '') + '<div id="scnHost"></div>' + (DEMO_MODE ? '' : '<div id="scnInstr"></div>');
    host.querySelectorAll('[data-sub]').forEach((b) => b.addEventListener('click', () => { world.defSub = b.dataset.sub; renderScenarioTab(team, tab); }));
    world.scn = world.scn || {};
    FM.renderScenario(host.querySelector('#scnHost'), team, nextOpponent(), sub, { store: world.scn, save: saveSoon, applied: (done) => {
      FM.inferShapeTactics(team); renderPrepFlow();
      try { FM.fixTeam(team, nextOpponent(), (ph) => oppLine(ph)); } catch (e) { /* the warnings on the squad page still say what is wrong */ }
      // "Use this and go on to ..." takes you to that phase's page
      const nk = done && done.nextKey, nb = nk && el('tabs').querySelector('button[data-tab="' + nk + '"]');
      if (nk === 'organised' && tab === 'organised') { world.defSub = 'organised'; renderScenarioTab(team, tab); }
      else if (nb) nb.click();
    } });
    const ph = FM.SCENARIO_PHASES[sub];
    if (!DEMO_MODE) FM.renderInstructions(host.querySelector('#scnInstr'), team, { save: saveSoon, opp: nextOpponent }, { stage: ph.stage, title: 'Anything else you want to tell them', applies: 'applies to this phase' });
  }
  function renderTransitionTab(team, tab) {
    const host = el('tabBody'), defensive = tab === 'transdef', key = defensive ? 'transDefChoices' : 'transAttChoices';
    // each third of the pitch, with the diagram of the team's set-up for that part of the game beside the choice (small, and not editable here)
    // After losing the ball the shapes shown are the ones the team attacks in; after winning it, the ones it defends in.
    const zones = defensive
      ? [['defensive', 'Defensive third', 'buildEnd', 'Your build-up'], ['middle', 'Middle third', 'midfield', 'Your play through midfield'], ['attacking', 'Attacking third', 'final', 'Your final third']]
      : [['defensive', 'Defensive third', 'withoutEnd', 'Your shape defending near your goal'], ['middle', 'Middle third', 'without', 'Your shape defending in midfield'], ['attacking', 'Attacking third', 'press', 'Your pressing shape']];
    const options = defensive
      ? [['counterpress', 'Counterpress'], ['contain', 'Delay and contain'], ['regroup', 'Regroup']]
      : [['counter', 'Counter quickly'], ['secure', 'Secure possession'], ['reset', 'Reset the attack']];
    const fallback = defensive ? 'contain' : 'secure';
    team.tactics[key] = team.tactics[key] || {};
    host.innerHTML = `<div class="card transition-plan"><span class="eyebrow">${defensive ? 'Lost the ball in…' : 'Won the ball in…'}</span><h2>${defensive ? 'Defensive transition' : 'Attacking transition'}</h2><p class="desc">Choose what the team does first when it ${defensive ? 'loses' : 'wins'} the ball in each third of the pitch. The small pitches show how you have set the team up ${defensive ? 'for that part of the game' : 'to defend'}.</p>
      <div class="transition-zones">${zones.map(([z, n, k, cap]) => `<label><b>${n}</b><select data-zone="${z}">${options.map(([v, l]) => `<option value="${v}"${(team.tactics[key][z] || fallback) === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>`).join('')}</div>
      ${DEMO_MODE ? '' : '<div id="transInstr"></div>'}</div>`;
    host.querySelectorAll('[data-zone]').forEach((s) => s.addEventListener('change', () => { team.tactics[key][s.dataset.zone] = s.value; saveSoon(); }));
    world.redrawBoards = null;
    // one instruction box for the stage, as on the other pages
    if (!DEMO_MODE) FM.renderInstructions(host.querySelector('#transInstr'), team, { save: saveSoon, opp: nextOpponent }, { stage: defensive ? 'transDef' : 'transAtt', title: 'Instructions: ' + (defensive ? 'after losing the ball' : 'after winning the ball'), applies: 'applies to this stage only' });
  }

  function renderTestPhase(team, phase) {
    const host = el('tabBody'); host.innerHTML = '<div id="labPanel"></div>';
    renderLab(team, host.querySelector('#labPanel'), phase);
  }


  // ---------- the build-up lab ----------
  // Runs the first 40 seconds of your build-up many times (a Monte Carlo experiment) and reports the share of tests that end each way, each with
  // a 95% interval. The student predicts first, runs it, then changes one thing and runs it again to see whether the difference is real.
  const lpct = (x) => Math.round(x * 100) + '%';
  // Skipping and moving on. Any test may be skipped (they are largely the same statistical work), but at least one has to be done before you can
  // go on to read the evidence.
  function testsDoneCount() { const lg = world.league; return (lg.labRuns || []).length > 0 ? 1 + Object.keys(lg.phaseLabRuns || {}).filter((k) => (lg.phaseLabRuns[k] || []).length).length : Object.keys(lg.phaseLabRuns || {}).filter((k) => (lg.phaseLabRuns[k] || []).length).length; }
  function skipHtml(phase, st) {
    if (st.busy) return '';
    const idx = TEST_TABS.findIndex(([k]) => k === phase), last = idx === TEST_TABS.length - 1;
    if (testsDoneCount() > 0 && last) return '<button id="labToEvidence">Go to the match preview</button>';
    return last ? '<button id="labSkip" disabled title="Do at least one test before moving on">Skip</button>' : '<button id="labSkip">' + (testsDoneCount() > 0 ? 'Next test' : 'Skip this test') + '</button>';
  }
  function skipNote(phase) {
    const n = testsDoneCount();
    return '<p class="note">' + (n === 0 ? 'Run at least one test before the match preview. The others are optional.' : 'You have completed ' + n + ' test' + (n === 1 ? '' : 's') + '. Run the others, or go to the match preview now.') + (n > 0 ? ' <button class="linkbtn" id="labToEvidence2">Go to the match preview</button>' : '') + '</p>';
  }
  const SAT_TARGET = { build: 0.7, midfield: 0.65, final: 0.08, transatt: 0.06, organised: 0.92, transdef: 0.92, press: 0.5 };
  const SUCCESS_KEY = { build: 'beat', midfield: 'beat', final: 'shot', transatt: 'shot', organised: 'lost', transdef: 'lost', press: 'lost' };
  function renderLab(team, host, phase) {
    phase = phase || 'build';
    const lg = world.league, opp = nextOpponent(); if (!lg || !opp) { host.innerHTML = ''; return; }
    lg.labRuns = lg.labRuns || []; lg.phaseLabRuns = lg.phaseLabRuns || {};
    const reverse = phase === 'organised' || phase === 'transdef' || phase === 'press';
    const title = { build: 'Test the build-up', midfield: 'Test playing through midfield', final: 'Test the final third', organised: 'Test defending your third', press: 'Test pressing their build-up', transdef: 'Test the defensive transition', transatt: 'Test the attacking transition' }[phase];
    const lede = {
      build: 'We will play the same goal kick against ' + opp.name + ' again and again, with your players where you put them, and count how often you get out.',
      midfield: 'We will play the move through midfield against ' + opp.name + ' again and again and count how often it works.',
      final: 'We will send the same attack at ' + opp.name + '\'s goal again and again and count how often it ends in a shot.',
      organised: 'We will have ' + opp.name + ' come at your third again and again and count how often your shape stops them.',
      press: 'We will have ' + opp.name + ' build from their goalkeeper again and again, with your team pressing as you have set it, and count how often they are stopped before they get out.',
      transdef: 'We will have you lose the ball against ' + opp.name + ' again and again and count how often you stop the counter.',
      transatt: 'We will have you win the ball against ' + opp.name + ' again and again and count how often it becomes a shot.',
    }[phase];
    const runs = phase === 'build' ? lg.labRuns : (lg.phaseLabRuns[phase] = lg.phaseLabRuns[phase] || []);
    world.phaseLabs = world.phaseLabs || {};
    const st = world.phaseLabs[phase] = world.phaseLabs[phase] || { start: 'keeper', n: 100, view: runs.length ? 'results' : 'setup', busy: false, prog: 0, a: null, b: null, err: '' };
    const last = runs[runs.length - 1];
    const goEvidence = () => { world.league.prepStep = Math.max(world.league.prepStep || 0, 4); saveSoon(); setView('preview'); };
    // The shortcut to the tactics page for a change, with a way straight back to this test.
    const toTactics = (tab) => { world.testing = false; world.tab = tab; world.backToTests = { phase }; renderTactics(); renderPrepFlow(); window.scrollTo(0, 0); };

    // ---- the results page: the controls go, and the reading takes their place ----
    if (last && st.view === 'results' && !st.busy && FM.labResults) {
      host.innerHTML = '<div class="lab"><div id="labOutcome"></div></div>';
      const fresh = !!st.fresh; st.fresh = false;
      FM.labResults.outcome(host.querySelector('#labOutcome'), { phase, opp, team, runs, fresh, onAgain: () => { st.view = 'setup'; renderLab(team, host, phase); window.scrollTo(0, 0); }, onTactics: toTactics, onPreview: goEvidence,
        onImplement: (id) => { const out = FM.lab.implement(team, phase, id, last.result, { opp }); saveSoon(); if (FM.inferShapeTactics) FM.inferShapeTactics(team); return out; },
        onRevert: () => { const prevRun = runs[runs.length - 2]; const ok = prevRun && FM.lab.restore(team, prevRun.snap); if (ok) { if (FM.inferShapeTactics) FM.inferShapeTactics(team); saveSoon(); } return !!ok; } });
      if (st.toAgain) { st.toAgain = false; const tgt = host.querySelector('[data-act="again"]'); if (tgt && tgt.scrollIntoView) setTimeout(() => tgt.scrollIntoView({ block: 'center', behavior: 'smooth' }), 80); }
      return;
    }

    // ---- the set-up: where to test from, how many, and (after a first run) what we recommend ----
    const sat = SAT_TARGET[phase] || 0.6, key = SUCCESS_KEY[phase] || 'beat';
    const lastRate = last && last.result && FM.labResults && FM.labResults.successRate ? FM.labResults.successRate(phase, last.result) : null;
    const unsat = lastRate != null && lastRate < sat;
    const fixedN = runs.length ? runs[runs.length - 1].n : st.n;
    if (runs.length) st.n = fixedN;
    const reco = !runs.length ? '' : `<p class="lab-lede">${unsat ? 'Your last result was ' + Math.round(lastRate * 100) + '%. Run the same ' + fixedN + ' tests again and we will check whether the change helped.' : 'Run the same ' + fixedN + ' tests again to see whether you can push the last result of ' + Math.round(lastRate * 100) + '% any further.'}</p><p><button type="button" class="el-go" id="labSeeLast">Back to your last results</button></p>`;
    const busyText = st.busy ? (st.planning ? 'Their manager is preparing…' : st.done ? st.n + '/' + st.n + ' tests run' : st.prog + '/' + st.n + ' tests run') : (runs.length ? 'Run ' + st.n + ' tests again' : 'Run ' + st.n + ' tests');
    host.innerHTML = `<div class="lab">
      <h2>${title}</h2>
      <p class="lab-lede">${esc(lede)}</p>
      ${reco}
      <div class="two"><div class="lab-how"><span class="eyebrow">What the test is</span><p>${({
        build: 'Every test starts with a goal kick, with your players where you put them. It counts as a success if the ball is played out and reaches the halfway line with one of your players.',
        midfield: 'Every test starts with a midfielder on the ball on the edge of your own third, with your team in the shape you have for that moment. It counts as a success if the ball reaches the edge of the final third without being lost.',
        final: 'Every test starts with an attack entering the final third with the ball. It counts as a success if it ends in a shot.',
        press: 'Every test starts with their goalkeeper about to take a goal kick, with your team pressing as you have set it. It counts as a success if they are stopped before they get the ball out of their own half.',
        organised: 'Every test starts with them in your third with the ball, against your team as you have set it. It counts as a success if they are stopped before they can shoot.',
        transdef: 'Every test starts with your team losing the ball. It counts as a success if you stop the counter-attack before they can shoot.',
        transatt: 'Every test starts with your team winning the ball. It counts as a success if the move ends in a shot.',
      })[phase] || ''}</p></div>
        <label>Number of tests<select id="labN"${runs.length ? ' disabled title="The same number of tests as last time, so the two results can be compared fairly"' : ''}>${[100, 400, 1000].map((n) => `<option value="${n}"${st.n === n ? ' selected' : ''}>${n}</option>`).join('')}</select></label></div>
      <div class="row"><button class="primary" id="labRun"${st.busy ? ' disabled' : ''}>${busyText}</button>${skipHtml(phase, st)}</div>
      ${skipNote(phase)}
      <p class="err">${esc(st.err)}</p>
    </div>`;
    const q = (id) => host.querySelector(id);
    if (q('#labSkip')) q('#labSkip').addEventListener('click', () => { const i = TEST_TABS.findIndex(([k]) => k === phase); world.tab = TEST_TABS[Math.min(TEST_TABS.length - 1, i + 1)][0]; renderTactics(); });
    if (q('#labToEvidence')) q('#labToEvidence').addEventListener('click', goEvidence);
    if (q('#labToEvidence2')) q('#labToEvidence2').addEventListener('click', goEvidence);
    if (q('#labSeeLast')) q('#labSeeLast').addEventListener('click', () => { st.view = 'results'; renderLab(team, host, phase); });
    if (q('#labToTactics')) q('#labToTactics').addEventListener('click', () => toTactics(phase === 'press' ? 'organised' : phase));
    q('#labN').addEventListener('change', (e) => { st.n = +e.target.value; renderLab(team, host, phase); });
    q('#labRun').addEventListener('click', async () => {
      if (st.busy) return;
      st.busy = true; st.done = false; st.prog = 0; st.err = ''; st.planning = true; renderLab(team, host, phase);
      let oppPlan = null; try { oppPlan = await FM.scout.labPlan(lg, team, opp); } catch (e) { oppPlan = FM.scout.plan1(FM.scout.profile(lg)); }
      st.planning = false;
      const snap = FM.lab.snapshot(team);
      try {
        const attackTest = ['final','transatt','organised','transdef'].includes(phase);
        const result = await FM.lab.run(lg, { n: st.n, phase: attackTest ? 'final' : (phase === 'midfield' ? 'midfield' : 'build'), user: reverse ? opp : team, opp: reverse ? team : opp, start: st.start, record: true, oppRules: reverse ? (team.rules || []) : oppPlan.rules, oppNudge: reverse ? {} : oppPlan.tactics }, (d) => { st.prog = d; const b2 = host.querySelector('#labRun'); if (b2) b2.textContent = d + '/' + st.n + ' tests run'; });
        runs.push({ id: phase[0] + 'r' + (runs.length + 1), phase, oppPlan: { source: oppPlan.source, rationale: oppPlan.rationale, scouted: oppPlan.scouted, note: oppPlan.note || '', rules: FM.scout.describe(oppPlan.rules, opp, team) }, n: st.n, start: st.start, opp: opp.name, pred: '', hyp: '', snap, changes: FM.lab.changes(last && last.snap, snap), result });
        runs.forEach((r, i) => { if (i < runs.length - 2 && r.result) delete r.result.clips; });
        st.a = Math.max(0, runs.length - 2); st.b = runs.length - 1; saveSoon();
        const phaseIndex = TEST_TABS.findIndex(([k]) => k === phase);
        if (phaseIndex >= 0) { lg.testPhaseMax = Math.max(lg.testPhaseMax || 0, phaseIndex + 1); lg.prepStep = Math.max(lg.prepStep || 0, 3); }
        // the button says all the tests have run, then the page refreshes into the results
        st.done = true;
        const b3 = host.querySelector('#labRun'); if (b3) b3.textContent = st.n + '/' + st.n + ' tests run';
        await new Promise((r) => setTimeout(r, 1100));
        st.view = 'results'; st.fresh = true;
      } catch (err) { st.err = 'The test could not run: ' + (err && err.message ? err.message : 'unknown error'); }
      st.busy = false; st.done = false;
      if (document.body.contains(host)) { renderTactics(); renderPrepFlow(); }
    });
  }

  function phaseResultHtml(phase, r) {
    if (!r) return '';
    const pc = (x) => Math.round((x && x.p || 0) * 100) + '%';
    const xg = r.xg ? r.xg.mean.toFixed(2) : '0.00';
    const kpis = phase === 'build' || phase === 'midfield' ? [['Reached the next phase',pc(r.beat)],['Lost it',pc(r.lost)],['Shot conceded',pc(r.shot)],['Goal conceded',pc(r.goal)]]
      : phase === 'final' || phase === 'transatt' ? [['xG per attack',xg],['Shot generated',pc(r.shot)],['Goal scored',pc(r.goal)],['Attack broke down',pc(r.lost)]]
      : [['xG conceded / attack',xg],['Attack stopped',pc(r.lost)],['Shot conceded',pc(r.shot)],['Goal conceded',pc(r.goal)]];
    return `<div class="phase-kpis">${kpis.map(([a,b]) => `<div><b>${b}</b><span>${a}</span></div>`).join('')}</div>`;
  }

  function phaseHistoryHtml(phase, runs) {
    if (!runs.length) return '';
    const metric = (r) => ['final','transatt','organised','transdef'].includes(phase) ? `${(r.result.xg && r.result.xg.mean || 0).toFixed(2)} xG` : `${Math.round(r.result.beat.p * 100)}% reached the next phase`;
    return `<div class="phase-history"><h3>Tests in this phase</h3>${runs.slice(-4).reverse().map((r, i) => `<div class="hyp"><b>Run ${runs.length - i}: ${metric(r)}</b><p class="note">${r.hyp ? esc(r.hyp) : 'Baseline run — no change was recorded.'}</p></div>`).join('')}</div>`;
  }

  function takerSelect(team, key, label) {
    const opts = ['<option value="">Automatic (best on the pitch)</option>'].concat(team.players.filter((p) => p.group !== 'GK').map((p) =>
      `<option value="${p.id}"${team.tactics[key] === p.id ? ' selected' : ''}>${esc(shortName(p))} (${p.slotKey}): passing ${FM.shown(p.ratings.passing)}, finishing ${FM.shown(p.ratings.finishing)}</option>`)).join('');
    return `<label>${label}<select data-sp="${key}">${opts}</select></label>`;
  }
  function renderSetPieces(team) {
    const t = team.tactics, host = el('tabBody');
    host.innerHTML = `<div class="sliders">
      <label>Corner delivery
        <select data-sp="cornerDelivery">${[['near', 'Near post'], ['far', 'Far post'], ['edge', 'Edge of the box'], ['short', 'Short, played to a teammate']].map(([v, n]) => `<option value="${v}"${t.cornerDelivery === v ? ' selected' : ''}>${n}</option>`).join('')}</select>
      </label>
      <label><span class="lbl"><span>Attackers in the box for corners and crossed free kicks</span><span data-v="cornerAttackers">${t.cornerAttackers}</span></span>
        <input type="range" min="1" max="7" step="1" value="${t.cornerAttackers}" data-sp="cornerAttackers">
        <span class="note">Your best headers go forward. The more you send, the fewer are left to defend a counter.</span></label>
      <label><span class="lbl"><span>Defenders marking when defending a corner</span><span data-v="cornerMarkers">${t.cornerMarkers}</span></span>
        <input type="range" min="3" max="9" step="1" value="${t.cornerMarkers}" data-sp="cornerMarkers">
        <span class="note">The rest stay up the pitch, ready to break.</span></label>
      <label>Free kicks in the attacking half
        <select data-sp="fkStyle">${[['shoot', 'Shoot when in range, otherwise cross'], ['cross', 'Cross into the box'], ['short', 'Play it short']].map(([v, n]) => `<option value="${v}"${t.fkStyle === v ? ' selected' : ''}>${n}</option>`).join('')}</select>
      </label>
      ${takerSelect(team, 'cornerTaker', 'Corner taker')}
      ${takerSelect(team, 'fkTaker', 'Free-kick taker')}
      ${takerSelect(team, 'penTaker', 'Penalty taker')}
    </div>`;
    host.querySelectorAll('[data-sp]').forEach((c) => c.addEventListener('input', () => {
      const k = c.dataset.sp;
      if (c.type === 'range') { t[k] = parseFloat(c.value); host.querySelector(`[data-v="${k}"]`).textContent = t[k]; }
      else t[k] = c.value || null;
      saveSoon();
    }));
  }

  function renderSliderTab(team, list, host) {
    host.innerHTML = '<div class="sliders">' + list.map(([k, label, lo, hi, min, max, why]) => `
      <label><span class="lbl"><span>${label}</span><span data-v="${k}">${team.tactics[k].toFixed(2)}</span></span>
        <input type="range" min="${min}" max="${max}" step="0.05" value="${team.tactics[k]}" data-k="${k}">
        <span class="ends"><span>${lo}</span><span>${hi}</span></span>
        <span class="note">${why}</span>
      </label>`).join('') + '</div>';
    list.forEach(([k]) => host.querySelector(`input[data-k="${k}"]`).addEventListener('input', (e) => {
      if (k === 'lineHeight') FM.shiftLine(team, team.tactics.lineHeight, parseFloat(e.target.value));
      team.tactics[k] = parseFloat(e.target.value);
      host.querySelector(`[data-v="${k}"]`).textContent = team.tactics[k].toFixed(2);
      if (world.redrawBoards) world.redrawBoards();
      saveSoon();
    }));
  }

  // ---------- the tactics board ----------
  // A vertical pitch, attacking up. Positions are team space: d (0 own goal, 1 opposition goal) and w (0 the team's left).
  // The pitch is BW wide in drawing units. A pair of diagrams stretches the pitch sideways so that each fills its half of the screen at whatever
  // size the screen is (see fitBoardWidth); SX is the number of units to a metre across the pitch, BS the same down it.
  const BS = 6.5, BH = 105 * BS;
  let BW = 68 * BS, SX = BS;
  const bpt = (pos) => ({ x: pos.w * BW, y: (1 - pos.d) * BH });
  // Width (in drawing units) that makes the board exactly fill its column: the picture is limited in height by the page (max-height in
  // the stylesheet), so its width follows from the column width over that height.
  function fitBoardWidth(host, big) {
    const w = host.clientWidth || host.parentElement && host.parentElement.clientWidth || 0;
    const maxH = big ? Math.min(0.92 * window.innerHeight, 1000) : Math.min(0.72 * window.innerHeight, 860);
    if (!w || !maxH) return 68 * BS;
    const ratio = Math.max(0.633, Math.min(1.5, w / maxH));    // drawing width over drawing height, within the pitch's own sensible range
    return Math.round(ratio * (BH + 92) - 48);
  }

  function boardPitchSvg(key) {
    const cx = BW / 2, S = BS, X = SX;
    const ln = 'stroke="rgba(255,255,255,0.85)" stroke-width="2.5" fill="none"';
    let s = '';
    for (let i = 0; i < 14; i++) s += `<rect x="0" y="${(i * BH / 14).toFixed(1)}" width="${BW}" height="${(BH / 14).toFixed(1)}" fill="${i % 2 ? '#2E7D3E' : '#2A7539'}"/>`;
    if (key === 'final') s += `<rect x="0" y="0" width="${BW}" height="${BH / 3}" fill="rgba(255,255,255,0.07)"/>`;
    if (key === 'build') s += `<rect x="0" y="${BH * 2 / 3}" width="${BW}" height="${BH / 3}" fill="rgba(255,255,255,0.07)"/>`;
    s += `<rect x="0" y="0" width="${BW}" height="${BH}" ${ln}/><line x1="0" y1="${BH / 2}" x2="${BW}" y2="${BH / 2}" ${ln}/>`;
    s += `<ellipse cx="${cx}" cy="${BH / 2}" rx="${9.15 * X}" ry="${9.15 * S}" ${ln}/><circle cx="${cx}" cy="${BH / 2}" r="3" fill="rgba(255,255,255,0.85)"/>`;
    [[0, 1], [BH, -1]].forEach(([y0, dir]) => {
      const y = (m) => y0 + dir * m * S;
      s += `<rect x="${cx - 20.16 * X}" y="${dir > 0 ? y0 : y(16.5)}" width="${40.32 * X}" height="${16.5 * S}" ${ln}/>`;
      s += `<rect x="${cx - 9.16 * X}" y="${dir > 0 ? y0 : y(5.5)}" width="${18.32 * X}" height="${5.5 * S}" ${ln}/>`;
      s += `<rect x="${cx - 3.66 * X}" y="${dir > 0 ? y0 - 2 * S : y0}" width="${7.32 * X}" height="${2 * S}" ${ln}/>`;
      s += `<circle cx="${cx}" cy="${y(11)}" r="3" fill="rgba(255,255,255,0.85)"/>`;
      s += `<path d="M ${cx - 7.31 * X} ${y(16.5)} A ${9.15 * X} ${9.15 * S} 0 0 ${dir > 0 ? 0 : 1} ${cx + 7.31 * X} ${y(16.5)}" ${ln}/>`;
    });
    const scaleText = 'font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="rgba(255,255,255,.9)" stroke="rgba(0,0,0,.72)" stroke-width="3" style="paint-order:stroke;pointer-events:none"';
    s += '<g aria-hidden="true">';
    [0, 17, 34, 51, 68].forEach((m) => { const x = m * X; s += `<line x1="${x}" y1="${BH}" x2="${x}" y2="${BH + 8}" stroke="rgba(255,255,255,.75)" stroke-width="2"/><text x="${x}" y="${BH + 24}" text-anchor="middle" ${scaleText}>${m}m</text>`; });
    [0, 25, 50, 75, 100, 105].forEach((m) => { const y = BH - m * S, yy = Math.max(13, Math.min(BH - 5, y + 4)); s += `<line x1="0" y1="${y}" x2="9" y2="${y}" stroke="rgba(255,255,255,.75)" stroke-width="2"/><text x="12" y="${yy}" text-anchor="start" ${scaleText}>${m}m</text>`; });
    s += '</g>';
    return s;
  }

  // When you are in one phase, the opposition are in the one that answers it.
  const OPP_PHASE = { build: 'press', buildEnd: 'press', midfield: 'without', final: 'without', press: 'build', without: 'final', withoutEnd: 'final' };
  // The opposition shirts as placed on a page's diagram are kept on that page, as a two-number description of how they stand, so the match can
  // tell which page the opposition's real shape is closest to (see the condition 'The opposition line up like the shirts I place').
  function saveOppShape(team, key) {
    const base = FM.baseKey(key), sfx = FM.scnSuffix(key);
    if (FM.PAGE_ENDS.indexOf(base) < 0) return;
    const sc = scoutFor(), cells = sc && oppCellsFor(sc, key);
    if (!cells) return;
    const all = Object.assign({}, cells, (world.oppMoved && world.oppMoved[key]) || {});
    const sig = FM.oppSignature(Object.keys(all).filter((k) => !/^GK/.test(k)).map((k) => all[k].d));
    if (!sig) return;
    FM.ensurePages(team);
    const holder = sfx ? (team.pages[base] || []).find((x) => x.id === sfx.slice(1)) : (team.pageDefaults[base] = team.pageDefaults[base] || { label: 'Default page', cond: 'always' });
    if (holder) { holder.oppSig = sig; saveSoon(); }
  }
  function nextOpponent() {
    const lg = world.league, nx = lg && FM.nextUserFixture(lg);
    return nx ? FM.teamById(lg, nx.homeId === lg.userId ? nx.awayId : nx.homeId) : null;
  }
  // The offside line as drawn: where the deepest outfield player of the opposition shirts on the board stands (their moved positions
  // included), in the team's own space. Null when the opposition are not shown, and the editor falls back to their usual defending shape.
  // 'live' puts one shirt at a position it is being dragged to.
  function oppLine(key, live) {
    if (key === 'shape') return null;                // the line follows their scouted defence whether or not their shirts are shown
    const sc = scoutFor(), cells = sc && oppCellsFor(sc, key);
    if (!cells) return null;
    const moved = (world.oppMoved && world.oppMoved[key]) || {};
    let min = 1, any = false;
    Object.keys(cells).forEach((slot) => {
      if (/^GK/.test(slot)) return;
      const c = live && live.slot === slot ? live.c : (moved[slot] || cells[slot]);
      min = Math.min(min, c.d); any = true;
    });
    return any ? 1 - min : null;
  }
  // The condition a page applies under (a linked page takes the condition of the page it follows).
  function pageCondOf(key) {
    const team = userTeam(), base0 = FM.baseKey(key), sfx = FM.scnSuffix(key);
    const base = base0 === 'build' ? 'buildEnd' : base0;   // a page of the build-up has the goal kick as its start and the end beside it
    if (!team || FM.PAGE_ENDS.indexOf(base) < 0) return 'always';
    FM.ensurePages(team);
    const pg = sfx ? (team.pages[base] || []).find((x) => x.id === sfx.slice(1)) : (team.pageDefaults || {})[base];
    if (!pg) return 'always';
    if (pg.cond === 'from_prev' && pg.extra && /^opp_/.test(pg.extra)) return pg.extra;   // an extra condition about how they set up shows them that way
    if (pg.cond === 'from_prev' && pg.from && FM.PREV_END && FM.PREV_END[base]) return pageCondOf(FM.PREV_END[base] + (pg.from === 'default' ? '' : '#' + pg.from));
    return pg.cond || 'always';
  }
  // How the opposition stand on a page's diagram. Their scouted shape is the starting point; a page that applies when they press us shows them
  // pressed up the pitch, and one that applies when they sit off shows a compact, deep block. (d: 0 their own goal, 1 ours.)
  const shapeCache = new Map();
  function oppCellsFor(sc, key) {
    const cells = sc.shape.phases[OPP_PHASE[FM.baseKey(key)]];
    if (!cells) return null;
    const base = FM.baseKey(key);
    // A page that applies when they press high shows them pressed up the pitch, a mid block shows them around the halfway line and a low block
    // shows them compact in their own half. A page for "otherwise" shows the mid block.
    let cond = pageCondOf(key);
    const kick = base === 'buildEnd' || base === 'build';
    if (cond === 'opp_press') cond = 'opp_high'; else if (cond === 'opp_sit') cond = 'opp_low';
    if (cond === 'always' && kick) cond = 'opp_mid';
    const block = { opp_high: 1, opp_mid: 1, opp_low: 1 }[cond];
    const special = block || cond === 'opp_direct' || cond === 'opp_short';
    const finalThird = base === 'final';
    if (!special && !kick && !finalThird) return cells;
    const ck = sc.opp.id + '|' + OPP_PHASE[base] + '|' + cond + '|' + (kick ? 'k' : '');
    const hit = shapeCache.get(ck);
    if (hit && hit.src === cells) return hit.out;
    const slots = Object.keys(cells), outfield = slots.filter((k) => !/^GK/.test(k));
    const mean = outfield.reduce((a, k) => a + cells[k].d, 0) / Math.max(1, outfield.length);
    const front = outfield.slice().sort((a, b) => cells[b].d - cells[a].d).slice(0, 3);
    const out = {}, cl = (v) => Math.max(0.02, Math.min(0.97, v));
    // where the block's average depth sits (0 their goal, 1 ours), how much of the scouted spread it keeps, and how wide it stands
    const BLOCK = { opp_high: { m: kick ? 0.56 : 0.62, spread: 0.85, wide: 0.95 }, opp_mid: { m: 0.43, spread: 0.8, wide: 0.85 }, opp_low: { m: 0.28, spread: 0.6, wide: 0.7 } }[cond];
    slots.forEach((k) => {
      const c = cells[k]; let d = c.d, w = c.w;
      if (!/^GK/.test(k)) {
        if (BLOCK) { d = BLOCK.m + (c.d - mean) * BLOCK.spread; w = 0.5 + (c.w - 0.5) * BLOCK.wide; }
        else if (cond === 'opp_direct') { d = front.indexOf(k) >= 0 ? c.d + (1 - c.d) * 0.5 : c.d * 0.82; }
        else if (cond === 'opp_short') { d = mean + (c.d - mean) * 0.6; w = 0.5 + (c.w - 0.5) * 0.8; }
      }
      out[k] = Object.assign({}, c, { d: cl(d), w: Math.max(0.03, Math.min(0.97, w)) });
    });
    if (finalThird) {
      // we are attacking their goal: their back line sits on the edge of their own penalty area (it ends 0.157 of the pitch from their goal
      // line) and the rest of the team stands compact in front of it, as a defence does in reality
      const low = Math.min.apply(null, outfield.map((k) => out[k].d));
      const edge = cond === 'opp_high' ? 0.2 : 0.175;
      outfield.forEach((k) => { out[k].d = Math.max(0.02, Math.min(0.97, edge + (out[k].d - low) * 0.75)); });
    }
    if (kick) {
      // goal kick: nobody in the penalty area, and even a high press stands on its edge (the area ends 0.157 of the pitch from our goal line)
      const cap = cond === 'opp_high' ? 0.72 : cond === 'opp_low' ? 0.46 : 0.58;
      const top = Math.max.apply(null, outfield.map((k) => out[k].d));
      if (top > cap) outfield.forEach((k) => { out[k].d = Math.max(0.02, out[k].d * cap / top); });
    }
    shapeCache.set(ck, { src: cells, out });
    return out;
  }
  function scoutFor() {
    const opp = nextOpponent();
    if (!opp) return null;
    const shape = FM.scoutedShape(world.league, opp.id);
    return shape ? { opp, shape } : null;
  }

  // After a shirt (or the ball) has been dropped: draw the diagrams again in place and bring the side panels up to date, without redrawing the
  // whole page. A full redraw empties the page for a moment, which throws a zoomed-in view (or a scrolled one) to somewhere else.
  function afterBoardChange(team) {
    if (FM.inferShapeTactics) FM.inferShapeTactics(team);
    if (world.redrawBoards) {
      try { world.redrawBoards(); } catch (e) { renderTactics(); return; }
      if (el('playerPanel')) renderPlayerPanel(team);
      if (el('warnPanel')) renderWarnPanel(team);
    } else renderTactics();
  }
  function drawBoard(host, team, key, opts) {
    const locked = !!(opts && opts.locked);
    BW = opts && opts.fit ? fitBoardWidth(host, opts.big) : 68 * BS; SX = BW / 68;
    const selected = world.selSlot && team.players.includes(world.selSlot) ? world.selSlot : null;
    const posOf = (p) => (key === 'shape' ? FM.slotBase(team, p) : FM.phasePos(team, p, key));
    let ghosts = '';
    if (selected && key !== 'shape') {
      // The sideways limit still applies when dragging (see FM.clampToReach); nothing is drawn for it.
    }
    // The next opponent as scouted: where their players have stood in the phase that answers this one (when you build, they press).
    let opp = '';
    const sc = key !== 'shape' ? scoutFor() : null;
    if (sc && oppCellsFor(sc, key)) {
      const cells = oppCellsFor(sc, key);
      const kit = FM.kitAgainst(sc.opp, FM.teamById(world.league, world.league.userId));
      // Their shirts can be dragged to try out "what if they stood here". These moves are only for looking at, not saved, and the
      // button under the board puts them back where they were scouted.
      const moved = (world.oppMoved && world.oppMoved[key]) || {};
      opp = '<g>' + Object.keys(cells).map((slot) => {
        const c = moved[slot] || cells[slot], pt = bpt({ d: 1 - c.d, w: 1 - c.w });
        const player = sc.opp.players.find((p) => p.slotKey === slot), name = player ? boardName(player) : slot;
        return `<g class="odot" data-slot="${slot}" transform="translate(${pt.x.toFixed(1)},${pt.y.toFixed(1)})"><circle r="34" fill="transparent"/><circle r="19" fill="${kit.shirt}" fill-opacity="0.9" stroke="${kit.number}" stroke-width="2.5" stroke-dasharray="4 3"/><text y="4.5" text-anchor="middle" font-size="12.5" font-weight="700" fill="${kit.number}" style="pointer-events:none">${player ? player.number : slot}</text><text y="39" text-anchor="middle" font-size="14" font-weight="700" fill="#fff" stroke="#000" stroke-width="3.5" style="paint-order:stroke">${esc(name)}</text>${moved[slot] ? '<circle cx="14" cy="-14" r="5" fill="#F2C14E" stroke="#1A232D" stroke-width="1.5"/>' : ''}</g>`;
      }).join('') + '</g>';
    }
    // With the ball, nobody can stand beyond the opposition's second-last defender: show that line, which moves with their defensive line.
    let offLine = '';
    const opp0 = nextOpponent();
    if (key !== 'shape' && opp0 && FM.OFFSIDE_PHASES.indexOf(FM.baseKey(key)) >= 0) {
      const y = (1 - FM.offsideLimit(opp0, null, oppLine(key))) * BH;
      offLine = `<g class="offline" style="pointer-events:none"><line x1="0" y1="${y.toFixed(1)}" x2="${BW}" y2="${y.toFixed(1)}" stroke="#FF6B5A" stroke-width="2.5" stroke-dasharray="3 7" stroke-opacity="0.9"/><text x="6" y="${(y - 6).toFixed(1)}" font-size="14" fill="#fff" stroke="#000" stroke-width="3" style="paint-order:stroke">Offside line (${esc(opp0.name)}'s deepest defender)</text></g>`;
    }
    let ball = '';
    if (key !== 'shape') {
      const bp = bpt(FM.phaseBall(team, key));
      ball = `<g class="ball" transform="translate(${bp.x.toFixed(1)},${bp.y.toFixed(1)})"><circle r="27" fill="transparent"/><circle r="16" fill="#fff" stroke="#111" stroke-width="3"/><circle r="6" fill="#111"/><text y="36" text-anchor="middle" font-size="15" fill="#fff" stroke="#000" stroke-width="3.5" style="paint-order:stroke">ball</text></g>`;
    }
    const dots = team.players.map((p) => {
      const pt = bpt(posOf(p)), sel = selected === p;
      const manual = key === 'shape' ? !!(team.shape && team.shape[p.index]) : FM.isManual(team, p, key);
      return `<g class="dot" data-idx="${p.index}" transform="translate(${pt.x.toFixed(1)},${pt.y.toFixed(1)})">
        <circle r="36" fill="transparent"/>
        <circle r="23" fill="${team.kit.shirt}" stroke="${sel ? '#F2C14E' : '#fff'}" stroke-width="${sel ? 5 : 3}"/>
        <text y="8" text-anchor="middle" font-size="22" font-weight="700" fill="${team.kit.number}">${p.number}</text>
        <text y="46" text-anchor="middle" font-size="20" font-weight="700" fill="#fff" stroke="#000" stroke-width="4" style="paint-order:stroke">${esc(boardName(p))}</text>
        <text y="65" text-anchor="middle" font-size="16" fill="${FM.isInjured(p) ? '#FF9A9A' : FM.conditionOf(p) < 0.6 ? '#F2C8A0' : '#cfe8cf'}" stroke="#000" stroke-width="3.5" style="paint-order:stroke">${FM.isInjured(p) ? 'injured' : FM.playerRating(p, p.group).toFixed(1) + ' · ' + Math.round(100 * FM.conditionOf(p)) + '%'}</text>
        ${manual ? '<circle cx="18" cy="-18" r="6.5" fill="#F2C14E" stroke="#1A232D" stroke-width="1.5"/>' : ''}</g>`;
    }).join('');
    let guides = '';
    if (key === 'shape' || key === 'without' || key === 'withoutEnd' || key === 'press') {
      const defenders = team.players.filter((p) => p.group === 'CB' || p.group === 'FB').map(posOf);
      const depth = defenders.length ? defenders.reduce((a,p) => a + p.d, 0) / defenders.length : .28;
      const y = (1 - depth) * BH;
      guides += `<g class="tactic-guide"><line x1="4" y1="${y}" x2="${BW-4}" y2="${y}"/><text x="${BW-8}" y="${y-8}" text-anchor="end">Defensive line</text></g>`;
    }
    if (['build', 'buildEnd', 'midfield', 'final', 'transAtt', 'transAttEnd'].indexOf(FM.baseKey(key)) >= 0) {
      const width = Math.min(.94, .58 * team.tactics.attackWidth), x1 = BW * (.5 - width/2), x2 = BW * (.5 + width/2);
      guides += `<g class="tactic-guide width"><line x1="${x1}" y1="30" x2="${x1}" y2="${BH-30}"/><line x1="${x2}" y1="30" x2="${x2}" y2="${BH-30}"/><text x="${BW/2}" y="24" text-anchor="middle">Attacking width</text></g>`;
    }
    host.innerHTML = `<svg class="board${key === 'shape' ? ' short' : ''}${locked ? ' locked' : ''}" viewBox="-24 -30 ${BW + 48} ${BH + 92}" role="img" aria-label="Tactics board">${boardPitchSvg(FM.baseKey(key))}${guides}${ghosts}${offLine}${opp}${dots}${ball}</svg>`;
    const svg = host.firstChild;
    const toPos = (e) => {
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY - (e.pointerType === 'touch' ? 28 : 0);
      const q = pt.matrixTransform(svg.getScreenCTM().inverse());
      return { d: clamp01(1 - q.y / BH, 0.02, 0.98), w: clamp01(q.x / BW, 0.03, 0.97), x: q.x, y: q.y };
    };
    let drag = null, dragBall = null;
    svg.addEventListener('pointerdown', (e) => {
      if (locked) return;   // this diagram belongs to another page
      const bl = e.target.closest('.ball');
      if (bl) { dragBall = { g: bl, pos: null }; svg.setPointerCapture(e.pointerId); e.preventDefault(); return; }
      const og = e.target.closest('.odot');
      if (og && !e.target.closest('.dot')) { drag = { opp: true, slot: og.dataset.slot, g: og, sx: e.clientX, sy: e.clientY, moved: false, pos: null }; svg.setPointerCapture(e.pointerId); e.preventDefault(); return; }
      const g = e.target.closest('.dot');
      if (!g) return;
      const p = team.players.find((x) => x.index === +g.dataset.idx);
      const prev = world.selSlot;
      world.selSlot = p;
      drag = { p, prev, g, sx: e.clientX, sy: e.clientY, moved: false, pos: null };
      svg.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    svg.addEventListener('pointermove', (e) => {
      if (dragBall) { const pos = toPos(e); dragBall.pos = pos; const pt = bpt(pos); dragBall.g.setAttribute('transform', `translate(${pt.x.toFixed(1)},${pt.y.toFixed(1)})`); return; }
      if (!drag) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5) return;
      drag.moved = true;
      let pos = toPos(e);
      if (key !== 'shape' && !drag.opp) pos = FM.clampOffside(team, drag.p, key, FM.clampToReach(team, drag.p, key, pos), nextOpponent(), oppLine(key));
      drag.pos = pos;
      const pt = bpt(pos);
      drag.g.setAttribute('transform', `translate(${pt.x.toFixed(1)},${pt.y.toFixed(1)})`);
      // dragging one of their shirts moves the offside line with their deepest defender
      if (drag.opp) {
        const og = svg.querySelector('.offline'), ln = oppLine(key, { slot: drag.slot, c: { d: 1 - pos.d, w: 1 - pos.w } });
        if (og && ln != null) { const y = (1 - Math.max(ln, 0.5)) * BH; const l = og.querySelector('line'), t = og.querySelector('text'); l.setAttribute('y1', y.toFixed(1)); l.setAttribute('y2', y.toFixed(1)); t.setAttribute('y', (y - 6).toFixed(1)); }
      }
    });
    svg.addEventListener('pointerup', (e) => {
      if (dragBall) { if (dragBall.pos) { FM.setPhaseBall(team, key, { d: dragBall.pos.d, w: dragBall.pos.w }); saveSoon(); } dragBall = null; afterBoardChange(team); return; }
      if (!drag) return;
      const d = drag; drag = null;
      if (d.opp) {
        if (d.moved && d.pos) { world.oppMoved = world.oppMoved || {}; (world.oppMoved[key] = world.oppMoved[key] || {})[d.slot] = { d: 1 - d.pos.d, w: 1 - d.pos.w }; saveOppShape(team, key); afterBoardChange(team); }
        return;
      }
      // a plain click on a shirt arms it for a substitution: click a bench player next and he takes that shirt's place
      world.subArmed = (!d.moved && d.prev !== d.p && !world.selBench) ? d.p : null;
      if (!d.moved && world.selBench) { host.dispatchEvent(new CustomEvent('sub', { detail: { idx: d.p.index, id: world.selBench.id } })); return; }
      world.selBench = null;
      if (key === 'shape') {
        // Dropping on another shirt swaps the two players. Dropping into space
        // redraws the formation, and that new position is used by the engine.
        if (d.moved) {
          const q = toPos(e);
          const other = team.players.find((x) => { if (x === d.p) return false; const o = bpt(FM.slotBase(team, x)); return Math.hypot(o.x - q.x, o.y - q.y) < 34; });
          if (other) { FM.swapSlots(team, d.p, other); FM.fixSlot(team, d.p); FM.fixSlot(team, other); world.selSlot = null; saveSoon(); }
          else { FM.setSlotBase(team, d.p, d.pos || q); world.selSlot = null; saveSoon(); }
        } else if (d.prev === d.p) world.selSlot = null;
        renderTactics();
        return;
      }
      if (d.moved) {
        if (key === 'shape') {
          // dropped on another shirt: swap the two players
          const q = toPos(e);
          const other = team.players.find((x) => { if (x === d.p) return false; const o = bpt(FM.slotBase(team, x)); return Math.hypot(o.x - q.x, o.y - q.y) < 30; });
          if (other) { FM.swapSlots(team, d.p, other); FM.fixSlot(team, d.p); FM.fixSlot(team, other); }
          else FM.setSlotBase(team, d.p, d.pos);
        } else FM.setPhasePos(team, d.p, key, d.pos);
        saveSoon();
      }
      afterBoardChange(team);
    });
    // a bench player dragged from the list onto a shirt is a substitution
  }
  const clamp01 = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function renderBoardTab(team, tab) {
    const host = el('tabBody'), key = BOARD_KEY[tab], isShape = key === 'shape';
    const formationTitle = FM.formationName ? FM.formationName(team) : team.formationKey;
    const formationOptions = Object.keys(FM.FORMATIONS).map((k) => `<option value="${k}"${!team.formationLabel && k === team.formationKey ? ' selected' : ''}>${k}</option>`).join('');
    const bench = team.bench.map((p) => `
      <button class="chip${world.selBench === p ? ' sel' : ''}" data-bench="${p.id}">
        <span class="num" style="${KITNUM(team)}">${p.number}</span><span>${p.natural} ${esc(shortName(p))}</span><span class="meta ${FM.isInjured(p) ? 'out' : FM.conditionOf(p) < 0.6 ? 'low' : ''}">${FM.ratingText(p)} · ${FM.isInjured(p) ? 'injured' : Math.round(100 * FM.conditionOf(p)) + '%'}</span>
      </button>`).join('');
    const pair = BOARD_PAIRS[tab];
    host.innerHTML = `
      <div class="tb-grid${pair ? ' tb-pair' : ''}${isShape ? ' tb-shape' : ''}">
        <aside class="tb-controls">
          ${isShape ? `<label>Formation<select id="formSel">${team.formationLabel ? `<option value="__custom" selected disabled>Current shape: ${esc(formationTitle)}</option>` : ''}${formationOptions}</select></label>${world.view === 'match' ? '' : '<button type="button" class="primary" id="useFormationDefaults">Use default tactics with this formation</button><p class="note">This keeps the formation, replaces manual phase pages and written tactical instructions with sensible defaults, and takes you straight to testing.</p>'}` : ((world.oppMoved && world.oppMoved[key] && Object.keys(world.oppMoved[key]).length) ? '<button class="phase-report-reset" id="oppReset">Reset their shirts to the scouted positions</button>' : '')}
          ${tab === 'organised' ? '<div class="block-presets"><b>Defensive block</b><button data-block="low">Low block</button><button data-block="mid">Mid block</button><button data-block="high">High press</button></div>' : ''}
          <div id="phaseSliders"></div>
        </aside>
        <div class="tb-left">
          <h2>${isShape ? 'Formation: ' + esc(formationTitle) : (PAIR_TITLE[tab] || FM.PHASE_NAMES[key])}</h2>
          ${pair ? '<div id="pairHost"></div>' : '<div id="board"></div>'}
          ${pair ? '' : `<div class="row"><button id="resetPhase">${isShape ? 'Reset the shape to the formation' : 'Reset this phase to its default positions'}</button></div>`}
          <p class="err" id="subErr"></p>
        </div>
        <div class="tb-right">
          ${isShape ? '' : '<div id="phaseInstr"></div>'}
          ${isShape ? `<div><h2 style="margin-bottom:8px">Bench</h2><div class="bench" id="bench">${bench}</div><p class="note" style="margin-top:8px">To substitute, click a bench player and the shirt he replaces, in either order.</p></div>` : ''}
          <div id="playerPanel"></div>
          <div id="warnPanel"></div>
        </div>
      </div>`;
    const board = host.querySelector('#board') || host.querySelector('#pairHost');
    if (pair) mountPair(host.querySelector('#pairHost'), team, tab, { hooks: { save: saveSoon, opp: nextOpponent }, stage: key });
    else {
      // On the squad page the pitch fills the left of the screen and follows its width.
      drawBoard(board, team, key, isShape ? { fit: true } : undefined);
      if (isShape) world.redrawBoards = () => { if (board.isConnected) drawBoard(board, team, key, { fit: true }); };
    }
    host.querySelectorAll('[data-block]').forEach((b) => b.addEventListener('click', () => {
      const target = { low: 0.2, mid: 0.32, high: 0.46 }[b.dataset.block];
      const backs = team.players.filter((p) => p.group === 'CB' || p.group === 'FB'), now = backs.reduce((s,p) => s + FM.phasePos(team,p,'without').d, 0) / Math.max(1, backs.length), shift = target - now;
      team.players.forEach((p) => { const q = FM.phasePos(team,p,'without'); FM.setPhasePos(team,p,'without',{ d: Math.max(.03,Math.min(.82,q.d + shift)), w:q.w }); });
      team.tactics.pressing = b.dataset.block === 'high' ? .82 : b.dataset.block === 'mid' ? .5 : .22;
      FM.inferShapeTactics(team); saveSoon(); renderTactics();
    }));
    const oppReset = host.querySelector('#oppReset');
    if (oppReset) oppReset.addEventListener('click', () => { delete world.oppMoved[key]; renderTactics(); });
    if (SLIDER_TABS[tab]) renderSliderTab(team, SLIDER_TABS[tab], host.querySelector('#phaseSliders'));
    if (!isShape) {
      const hooks = { save: saveSoon, opp: nextOpponent };
    }
    const err = (msg) => { host.querySelector('#subErr').textContent = msg || ''; };
    if (isShape) host.querySelector('#formSel').addEventListener('change', (e) => { FM.setFormation(team, e.target.value); world.selSlot = null; saveSoon(); renderTactics(); });
    const defaultsBtn = host.querySelector('#useFormationDefaults');
    if (defaultsBtn) defaultsBtn.addEventListener('click', () => {
      team.tactics = FM.defaultTactics();
      team.phasePos = {}; team.phaseBall = {}; team.pages = {}; team.pageDefaults = {};
      team.scenarios = []; team.defScenarios = []; team.scenarioEnd = {}; team.scenarioInfo = {}; team.scenarioBall = {}; team.scenarioEvidence = {}; team.scenarioDefEvidence = {};
      team.rules = [];
      if (FM.inferShapeTactics) FM.inferShapeTactics(team);
      world.league.prepPhaseMax = PREP_TABS.length;
      world.league.prepStep = Math.max(world.league.prepStep || 0, 2);
      world.testing = true; world.tab = 'build'; world.selSlot = null;
      saveSoon(); renderTactics(); renderPrepFlow(); window.scrollTo(0, 0);
    });
    const resetBtn = host.querySelector('#resetPhase');
    if (resetBtn) resetBtn.addEventListener('click', () => { FM.clearPhase(team, key); saveSoon(); renderTactics(); });

    const slotPlayer = (i) => team.players.find((p) => p.index === i);
    function doSub(outP, inP) {
      const msg = FM.substitute(team, outP, inP, world.match);
      if (msg) { err(msg); return; }
      if (inLive()) world.running = false; // a substitution pauses play, press Play to continue
      world.selBench = null; world.selSlot = inP; saveSoon(); renderTactics();
    }
    board.addEventListener('sub', (e) => { const inP = team.bench.find((p) => p.id === e.detail.id); if (inP) doSub(slotPlayer(e.detail.idx), inP); });
    host.querySelectorAll('[data-bench]').forEach((b) => {
      b.addEventListener('click', () => {
        const p = team.bench.find((x) => x.id === b.dataset.bench);
        const armed = world.subArmed && team.players.includes(world.subArmed) ? world.subArmed : null;
        world.subArmed = null;
        if (armed && p) { doSub(armed, p); return; }          // shirt first, then the substitute
        world.selBench = world.selBench === p ? null : p; renderTactics();
      });
    });
    renderPlayerPanel(team);
    renderWarnPanel(team);
  }

  function renderWarnPanel(team) {
    const host = el('warnPanel');
    if (!host) return;
    // Positions that are out of reach between phases, or offside, are not allowed to stand: they are pulled back as soon as they are made.
    if (!inLive()) { try { FM.fixTeam(team, nextOpponent(), (ph) => oppLine(ph)); saveSoon(); } catch (e) { /* the warnings below still say what is wrong */ } }
    const all = FM.teamProblems(team, nextOpponent(), (ph) => oppLine(ph));
    const sel = world.selSlot && team.players.includes(world.selSlot) ? world.selSlot : null;
    const hurt = team.players.filter(FM.isInjured);
    let html = hurt.length && !inLive() ? `<p class="note warnnote">${hurt.map((p) => esc(p.name)).join(', ')} ${hurt.length > 1 ? 'are' : 'is'} injured. Substitute ${hurt.length > 1 ? 'them' : 'him'} here, or the best available replacement will start at kick-off.</p>` : '';
    const hard = all;
    if (hard.length) {
      html += '<h2 style="margin-bottom:8px">These phases do not fit together yet</h2><div class="warns">' + hard.map(({ p, list }) => `<div class="warn${p === sel ? ' me' : ''}"><b>${esc(shortName(p))}</b> (${p.slotKey})<ul>${list.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>`).join('') + '</div>';
      html += '<div class="row" style="margin-top:8px"><button id="fixAll">Pull impossible and offside positions back</button></div>';
    }
    host.innerHTML = html;
    const fix = host.querySelector('#fixAll');
    if (fix) fix.addEventListener('click', () => { const op = nextOpponent(); team.players.forEach((p) => FM.fixSlot(team, p, op, (ph) => oppLine(ph))); saveSoon(); renderTactics(); });
  }

  // A player's profile: where he is from, his ratings as bars, his condition, and what he has done this season.
  const RATING_ROWS = [['pace', 'Pace'], ['dribbling', 'Dribbling'], ['passing', 'Passing'], ['finishing', 'Finishing'], ['tackling', 'Tackling'], ['heading', 'Heading'], ['composure', 'Composure'], ['stamina', 'Stamina']];
  function profileHtml(p, playingAs) {
    const r = p.ratings, rows = RATING_ROWS.concat(p.natural === 'GK' ? [['gk', 'Goalkeeping']] : []);
    const bars = rows.map(([k, l]) => `<div class="rrow"><span>${l}</span><span class="rbar"><i style="width:${Math.max(0, Math.min(100, FM.shown(r[k] || 0)))}%"></i></span><b>${r[k] != null ? FM.shown(r[k]) : '-'}</b></div>`).join('');
    const st = p.stats || { apps: 0, goals: 0, shots: 0, yellows: 0, reds: 0 };
    const cond = FM.isInjured(p) ? `<span class="out">${p.injury && p.injury.suspended ? '' : 'injured: '}${esc(injuryText(p))}</span>` : `condition ${Math.round(100 * FM.conditionOf(p))}%`;
    return `<p class="note">${esc(p.nation)} · natural position ${p.natural}${playingAs ? ', playing ' + playingAs : ''} · ${FM.FOOT_TEXT[p.foot] || ''}, ${p.height || '?'} cm · <b>rated ${FM.ratingText(p)}</b>${p.group && p.group !== p.natural ? ' (' + FM.ratingText(p, p.group) + ' as a ' + p.group + ')' : ''} · ${cond}</p>
      <div class="ratings">${bars}</div>
      <p class="note">This season: ${st.apps} appearance${st.apps === 1 ? '' : 's'}, ${st.goals} goal${st.goals === 1 ? '' : 's'}, ${st.shots} shot${st.shots === 1 ? '' : 's'}, ${st.yellows} yellow card${st.yellows === 1 ? '' : 's'}, ${st.reds} red.</p>`;
  }

  function renderPlayerPanel(team) {
    const host = el('playerPanel');
    if (world.tab !== 'squad') { host.innerHTML = ''; return; }
    // A substitute picked from the bench: show his profile, with how to bring him on.
    if (world.selBench && team.bench.includes(world.selBench)) {
      const b = world.selBench;
      host.innerHTML = `<h2 style="margin-bottom:8px">${esc(b.name)}, number ${b.number} (on the bench)</h2>
        <div style="display:grid;gap:10px">${profileHtml(b, null)}
          <p class="note">${FM.isInjured(b) ? (b.injury && b.injury.suspended ? 'He is suspended and cannot be brought on.' : 'He is injured and cannot be brought on.') : 'To bring him on, click one of the shirts on the board, or drag him onto one. Click him again to deselect.'}</p></div>`;
      return;
    }
    const player = world.selSlot && team.players.includes(world.selSlot) ? world.selSlot : null;
    if (!player) { host.innerHTML = '<p class="note">Click a shirt to see that player.</p>'; return; }
    host.innerHTML = `
      <h2 style="margin-bottom:8px">${esc(player.name)}, number ${player.number}</h2>
      <div style="display:grid;gap:10px">
        ${profileHtml(player, player.slotKey)}
        <div class="row"><button id="resetPlayer">Reset his positions in every phase</button></div>
        <label>Your notes on him (these do not change how he plays)<textarea id="playerNote" rows="2">${esc(player.note || '')}</textarea></label>
      </div>`;
    host.querySelector('#resetPlayer').addEventListener('click', () => { FM.clearPlayerPositions(team, player); saveSoon(); renderTactics(); });
    host.querySelector('#playerNote').addEventListener('input', (e) => { player.note = e.target.value; saveSoon(); });
  }

  // ---------- starting up ----------
  function showNewGame() {
    document.body.dataset.view = 'new';
    VIEWS.forEach((k) => { el('view-' + k).hidden = true; });
    el('tactics').hidden = true; el('nav').hidden = true; el('prepFlow').hidden = true; el('newGame').hidden = false;
    el('topRight').innerHTML = ''; el('subtitle').textContent = 'Eight clubs, one season, and a lot of numbers.';
    if (DEMO_MODE) {
      const modes = el('newGame').querySelectorAll('.ng-mode');
      modes.forEach((mode, i) => { mode.hidden = i !== 0; });
      el('newGame').querySelector('h2').textContent = 'Play the free first match';
      modes[0].querySelector('h3').textContent = 'Lastmind football demo';
      modes[0].querySelector('.desc').textContent = 'Take charge of Ashford Rovers and play the opening match. No account or purchase is needed.';
      el('ngStart').textContent = 'Start the demo';
    }
  }
  const openMp = (first) => FM.mpMenu({ start: (league) => { world.league = league; world.match = null; FM.saveLeague(league); if (FM.ensurePreseasonNews) FM.ensurePreseasonNews(league); try { history.replaceState(null, '', cleanUrl()); } catch (e) { /* fine */ } setView('mp'); } }, first);
  el('ngLeague').addEventListener('click', () => openMp('league'));
  el('ngMatch').addEventListener('click', () => openMp('match'));
  el('ngJoin').addEventListener('click', () => openMp('join'));
  el('ngStart').addEventListener('click', async () => {
    const btn = el('ngStart'), tier = document.querySelector('input[name="tier"]:checked').value;
    btn.disabled = true; btn.textContent = 'Setting up the clubs...';
    await new Promise((r) => setTimeout(r, 30));
    // The league is the same each time (clubs, squads, fixtures, last season), but each new game rolls its own dice: injuries and results differ.
    world.league = FM.createLeague({ userIndex: 0, tier, runSeed: Math.floor(Math.random() * 1e9) });   // Ashford Rovers is the only club to take charge of
    if (FM.ensurePreseasonNews) FM.ensurePreseasonNews(world.league);
    if (FM.transfer) FM.transfer(world.league);   // the opening offers are made now and saved with the game, not when a screen first asks
    await FM.playFriendlies(world.league, (i, n) => { btn.textContent = 'Playing pre-season friendlies (' + i + ' of ' + n + ')...'; });
    FM.saveLeague(world.league);
    btn.disabled = false; btn.textContent = DEMO_MODE ? 'Start the demo' : 'Start the season';
    try { history.replaceState(null, '', cleanUrl()); } catch (e) { /* fine */ }
    setView('squad');
  });

  // This is a paid project: an account without the subscription is sent to the checkout (and one that is not signed in is asked to sign in).
  // The AI features and the multiplayer are also refused by the server, whatever this page does.
  if (!DEMO_MODE && FM.api) {
    FM.api('/projects/access', { project: 'football' })
      .then((r) => { if (r && r.allowed === false) location.replace('/learn/?needs=football'); })
      .catch((e) => { if (e && (e.code === 'NO_SESSION' || e.code === '401' || e.code === '402' || e.code === 'PROJECT_SUBSCRIPTION_REQUIRED')) location.replace('/learn/?needs=football'); });
  }
  window.FM_WORLD = world; // debug handle for the console
  window.addEventListener('resize', resize);
  world.league = FM.loadLeague();
  // "New project" comes here with ?new=1: the set-up choices, even when a game is saved (resuming is what Your projects is for)
  const wantsNew = /[?&]new=1/.test(location.search);
  if (world.league && wantsNew) { el('ngResume').hidden = false; world.league = null; showNewGame(); requestAnimationFrame(frame); return; }
  if (world.league) {
    if (FM.transfer) FM.transfer(world.league);
    if (FM.ensurePreseasonNews) { FM.ensurePreseasonNews(world.league); }
    FM.saveLeague(world.league);
    setView('home');
    if (demoMatchPlayed()) { showDemoComplete(); requestAnimationFrame(frame); return; }
    // a game saved before friendlies existed: play them now so the reports have something to read
    if (FM.ensureFriendlies(world.league)) {
      const lg = world.league, redraw = () => { if (['reports', 'home', 'league'].indexOf(world.view) >= 0) setView(world.view); };
      lg.frProgress = { i: 0, n: lg.friendlies.filter((f) => !f.played).length };
      redraw();
      FM.playFriendlies(lg, (i, n) => { lg.frProgress = { i, n }; if (world.view === 'reports') redraw(); }).then(() => { lg.frProgress = null; FM.saveLeague(lg); redraw(); });
    }
  } else showNewGame();
  requestAnimationFrame(frame);
})();
