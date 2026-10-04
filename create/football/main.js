// Build step 2 page: draws the pitch, runs a live match at a chosen speed, and shows the score, stats and events.
// The formation, roles and instructions can be changed at any time and apply to the rest of the match.
(function () {
  const { L, W } = FM.PITCH;
  const canvas = document.getElementById('pitch');
  const ctx = canvas.getContext('2d');
  const el = (id) => document.getElementById(id);

  const home = FM.createTeam({ id: 'home', name: 'Ashford Rovers', attackDir: 1, formation: '4-3-3', kit: { shirt: '#D62828', number: '#FFFFFF' }, seed: 101 });
  const away = FM.createTeam({ id: 'away', name: 'Kingsbridge Athletic', attackDir: -1, formation: '4-2-2-2', kit: { shirt: '#1E5AE0', number: '#FFFFFF' }, seed: 901 });
  const world = { teams: [home, away], selected: null, match: null, running: true, speed: 1, seedCounter: 1, shownEvents: 0, lastStats: '' };
  const REAL_SECONDS_FOR_MATCH = 600; // a full 90 minutes takes about ten real minutes at 1x
  const MATCH_SPEED = 5400 / REAL_SECONDS_FOR_MATCH;
  const SUBSTEP = 0.1;

  // ---------- drawing ----------
  const MARGIN = 3; // metres of grass drawn around the pitch lines
  let scale = 1;
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.parentElement.clientWidth - 20;
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
  }

  function drawPlayers() {
    const r = Math.max(8, scale * 1.55);
    const m = world.match;
    world.teams.forEach((team) => {
      team.players.forEach((p) => {
        const cx = px(p.x), cy = py(p.y);
        ctx.beginPath(); ctx.arc(cx + 1.5, cy + 2.5, r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = team.kit.shirt; ctx.fill();
        const hasBall = m.carrier && m.carrier.player === p;
        if (hasBall) {
          ctx.beginPath(); ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = Math.max(2, r * 0.18); ctx.stroke();
        }
        const selected = world.selected && world.selected.player === p;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.lineWidth = selected ? Math.max(3, r * 0.3) : Math.max(1.5, r * 0.14);
        ctx.strokeStyle = selected ? '#F2C14E' : '#FFFFFF';
        ctx.stroke();
        ctx.fillStyle = team.kit.number;
        ctx.font = `700 ${Math.round(r * 1.05)}px Helvetica, Arial, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(p.number), cx, cy + r * 0.06);
      });
    });
    const bx = px(m.ball.x), by = py(m.ball.y);
    ctx.beginPath(); ctx.arc(bx, by, Math.max(5, scale * 0.9), 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#111'; ctx.stroke();
  }

  function draw() { drawPitch(); drawPlayers(); }

  // ---------- match control ----------
  function newMatch() {
    [home, away].forEach((t) => { t.subsUsed = 0; });
    world.match = FM.createMatch(home, away, world.seedCounter++);
    world.shownEvents = 0;
    world.lastStats = '';
    el('feed').innerHTML = '';
    updateHud();
  }
  function advance(matchSeconds) {
    const m = world.match;
    let left = matchSeconds;
    while (left > 1e-6 && m.phase !== 'halftime' && m.phase !== 'fulltime') {
      const dt = Math.min(SUBSTEP, left);
      FM.stepMatch(m, dt);
      left -= dt;
    }
  }
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const m = world.match;
    if (world.running && m.phase !== 'halftime' && m.phase !== 'fulltime') advance(dt * MATCH_SPEED * world.speed);
    draw();
    updateHud();
    requestAnimationFrame(frame);
  }

  // ---------- scoreboard, stats, event feed ----------
  const pct = (a, b) => (b ? Math.round(100 * a / b) + '%' : '-');
  function updateHud() {
    const m = world.match;
    el('scHome').textContent = m.score.home; el('scAway').textContent = m.score.away;
    const RESTART_NAMES = { throw: 'Throw-in', goalkick: 'Goal kick', corner: 'Corner', freekick: 'Free kick', penalty: 'Penalty' };
    el('clock').textContent = m.phase === 'halftime' ? 'Half time' : m.phase === 'fulltime' ? 'Full time' : FM.formatClock(m.clock) + (m.restart ? ' · ' + RESTART_NAMES[m.restart.kind] : '');
    const h = m.stats.home, a = m.stats.away, tot = h.possession + a.possession;
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
    for (; world.shownEvents < m.events.length; world.shownEvents++) {
      const e = m.events[world.shownEvents];
      const team = e.team === 'home' ? home : away;
      let text = null;
      if (e.type === 'goal') text = 'GOAL, ' + team.name + ' (number ' + e.player + ')';
      else if (e.type === 'shot') text = (e.setPiece ? ({ header: 'Header', freekick: 'Free kick', penalty: 'Penalty' }[e.setPiece]) : 'Shot') + ', ' + team.name + ' number ' + e.player + ': ' + e.outcome + ' (xG ' + e.xg.toFixed(2) + ')';
      else if (e.type === 'foul') text = 'Foul by ' + team.name + ' number ' + e.player + (e.card ? ', ' + e.card.toUpperCase() : '');
      else if (e.type === 'offside') text = 'Offside, ' + team.name + ' number ' + e.player;
      else if (e.type === 'restart' && (e.kind === 'corner' || e.kind === 'penalty')) text = (e.kind === 'corner' ? 'Corner' : 'PENALTY') + ' to ' + team.name;
      else if (e.type === 'sub') text = 'Substitution, ' + team.name + ': number ' + e.on + ' on for number ' + e.off;
      if (!text) continue;
      const div = document.createElement('div');
      div.innerHTML = '<b>' + FM.formatClock(e.t) + '</b> ' + text;
      feed.prepend(div);
    }
    const playing = world.running && m.phase !== 'halftime' && m.phase !== 'fulltime';
    el('playBtn').textContent = m.phase === 'halftime' ? 'Start second half' : m.phase === 'fulltime' ? 'Full time' : world.running ? 'Pause' : 'Play';
    el('playBtn').classList.toggle('on', playing);
  }

  el('playBtn').addEventListener('click', () => {
    const m = world.match;
    if (m.phase === 'halftime') { FM.startSecondHalf(m); world.running = true; return; }
    if (m.phase === 'fulltime') return;
    world.running = !world.running;
  });
  document.querySelectorAll('[data-speed]').forEach((b) => b.addEventListener('click', () => {
    world.speed = parseFloat(b.dataset.speed);
    document.querySelectorAll('[data-speed]').forEach((x) => x.classList.toggle('on', x === b));
  }));
  el('skipBtn').addEventListener('click', () => {
    const m = world.match;
    if (m.phase === 'halftime') FM.startSecondHalf(m);
    let guard = 0;
    while (m.phase !== 'halftime' && m.phase !== 'fulltime' && guard++ < 100000) FM.stepMatch(m, SUBSTEP);
  });
  el('restartBtn').addEventListener('click', () => { newMatch(); world.running = true; });

  // ---------- selecting players ----------
  function pitchPoint(evt) {
    const rect = canvas.getBoundingClientRect();
    const cx = (evt.clientX - rect.left) / rect.width * canvas.width;
    const cy = (evt.clientY - rect.top) / rect.height * canvas.height;
    return { x: cx / scale - MARGIN, y: cy / scale - MARGIN };
  }
  canvas.addEventListener('click', (evt) => {
    const pt = pitchPoint(evt);
    let best = null, bestD = 2.6;
    world.teams.forEach((team) => team.players.forEach((p) => {
      const d = Math.hypot(p.x - pt.x, p.y - pt.y);
      if (d < bestD) { bestD = d; best = { team, player: p }; }
    }));
    if (best) {
      world.edit = best.team; world.selSlot = best.player; world.selBench = null; world.tab = 'squad';
      renderTactics();
    }
  });

  // ---------- the tactics page ----------
  // One page, used on any preparation day and again when the match is paused. Changes apply to the rest of the match.
  const TABS = [
    ['squad', 'Squad and formation'], ['build', 'Build-up'], ['final', 'Final third'],
    ['transatt', 'Transition to attack'], ['transdef', 'Transition to defence'], ['without', 'Without the ball'], ['setpieces', 'Set pieces'],
  ];
  // [key, label, left end, right end, min, max, what it does]
  const SLIDER_TABS = {
    build: [
      ['buildDirect', 'Playing out from the back', 'Short and patient', 'Long and direct', 0, 1, 'In your own third: short passes to feet, or the ball sent forward early.'],
      ['directness', 'Progressing through midfield', 'Patient', 'Direct', 0, 1, 'In the middle third: how much the carrier looks for the forward pass over the safe one.'],
      ['tempo', 'Tempo', 'Slow', 'Fast', 0, 1, 'How quickly the ball is moved on. Quicker means more actions and less time for the opposition to set.'],
      ['risk', 'Risk in possession', 'Safe', 'Ambitious', 0, 1, 'How willing players are to try a pass that might be lost.'],
      ['attackWidth', 'Width when attacking', 'Narrow', 'Wide', 0.7, 1.25, 'Spreads or squeezes your whole shape across the pitch with the ball.'],
    ],
    final: [
      ['finalRisk', 'Risk in the final third', 'Patient', 'Gamble', 0, 1, 'Near the opposition goal: wait for a clear chance, or force the issue.'],
      ['shootFreedom', 'Shooting', 'Work it into a better position', 'Shoot on sight', 0, 1, 'How readily a player shoots when he has a chance.'],
      ['dribbleFreedom', 'Take-ons', 'Pass it', 'Take players on', 0, 1, 'How much carriers are encouraged to dribble at defenders.'],
    ],
    transatt: [
      ['counterAttack', 'After winning the ball', 'Hold shape and build', 'Counter at once', 0, 1, 'For about eight seconds after a win, passes go forward faster and with more risk, before things settle.'],
    ],
    transdef: [
      ['counterPress', 'After losing the ball', 'Drop back into shape', 'Win it back at once', 0, 1, 'For about six seconds after a loss, more players press the new carrier, and harder.'],
    ],
    without: [
      ['pressing', 'Pressing', 'Stay compact, let them have it', 'Press hard', 0, 1, 'How many players close down the ball carrier, and from how far away.'],
      ['lineHeight', 'Defensive line', 'Deep', 'High', 0, 1, 'A high line squeezes space but leaves room behind.'],
      ['defWidth', 'Width without the ball', 'Narrow', 'Wide', 0.7, 1.25, 'Compact through the middle, or covering the flanks.'],
      ['tackleAggression', 'Tackling', 'Stay on feet', 'Go in hard', 0, 1, 'More challenges, but more fouls and more cards.'],
      ['offsideTrap', 'Offside trap', 'Do not play it', 'Step up together', 0, 1, 'Catches more runners who are only just onside, but a mistimed step leaves a gap.'],
    ],
  };

  const KITNUM = (team) => 'background:' + team.kit.shirt + ';color:' + team.kit.number;
  function overall(p) {
    const r = p.ratings;
    if (p.natural === 'GK') return r.gk;
    return Math.round((r.pace + r.dribbling + r.passing + r.finishing + r.tackling) / 5);
  }
  function inLive() { const m = world.match; return m.clock > 0 && m.phase !== 'fulltime'; }

  function renderTactics() {
    const team = world.edit, m = world.match;
    el('teamPick').innerHTML = world.teams.map((t) => `<button data-team="${t.id}" class="${t === team ? 'on' : ''}">${t.name}</button>`).join('');
    el('teamPick').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      world.edit = world.teams.find((t) => t.id === b.dataset.team); world.selSlot = null; world.selBench = null; renderTactics();
    }));
    el('subInfo').textContent = 'Substitutions used: ' + team.subsUsed + ' of ' + team.maxSubs + (inLive() ? '' : ' (changes before kick-off are free)');
    el('tabs').innerHTML = TABS.map(([k, label]) => `<button data-tab="${k}" class="${world.tab === k ? 'on' : ''}">${label}</button>`).join('');
    el('tabs').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { world.tab = b.dataset.tab; renderTactics(); }));
    if (world.tab === 'squad') renderSquadTab(team);
    else if (SLIDER_TABS[world.tab]) renderSliderTab(team, SLIDER_TABS[world.tab]);
    else renderSetPieces(team);
  }

  function takerSelect(team, key, label) {
    const opts = ['<option value="">Automatic (best on the pitch)</option>'].concat(team.players.filter((p) => p.group !== 'GK').map((p) =>
      `<option value="${p.id}"${team.tactics[key] === p.id ? ' selected' : ''}>Number ${p.number} (${p.slotKey}): passing ${p.ratings.passing}, finishing ${p.ratings.finishing}</option>`)).join('');
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
        <span class="note">Your tallest players go forward. The more you send, the fewer are left to defend a counter.</span></label>
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
    }));
  }

  function renderSliderTab(team, list) {
    const host = el('tabBody');
    host.innerHTML = '<div class="sliders">' + list.map(([k, label, lo, hi, min, max, why]) => `
      <label><span class="lbl"><span>${label}</span><span data-v="${k}">${team.tactics[k].toFixed(2)}</span></span>
        <input type="range" min="${min}" max="${max}" step="0.05" value="${team.tactics[k]}" data-k="${k}">
        <span class="ends"><span>${lo}</span><span>${hi}</span></span>
        <span class="note">${why}</span>
      </label>`).join('') + '</div>';
    list.forEach(([k]) => host.querySelector(`input[data-k="${k}"]`).addEventListener('input', (e) => {
      team.tactics[k] = parseFloat(e.target.value);
      host.querySelector(`[data-v="${k}"]`).textContent = team.tactics[k].toFixed(2);
    }));
  }

  function renderSquadTab(team) {
    const host = el('tabBody');
    const formation = FM.FORMATIONS[team.formationKey];
    const slots = team.players.map((p) => {
      const slot = formation.slots[p.index];
      const sel = world.selSlot === p ? ' sel' : '';
      return `<button class="slot${sel}" draggable="true" data-slot="${p.index}" style="left:${(Math.max(slot.d, 0.04) * 94 + 3).toFixed(1)}%;top:${(slot.w * 84 + 8).toFixed(1)}%;${KITNUM(team)}" title="${p.slotKey}">${p.number}<small>${p.slotKey}</small></button>`;
    }).join('');
    const bench = team.bench.map((p) => `
      <button class="chip${world.selBench === p ? ' sel' : ''}" draggable="true" data-bench="${p.id}">
        <span class="num" style="${KITNUM(team)}">${p.number}</span><span>${p.natural}</span><span class="meta">${overall(p)}</span>
      </button>`).join('');
    host.innerHTML = `
      <div class="squad-grid">
        <div style="display:grid;gap:10px">
          <label>Formation
            <select id="formSel">${Object.keys(FM.FORMATIONS).map((k) => `<option value="${k}"${k === team.formationKey ? ' selected' : ''}>${k}</option>`).join('')}</select>
          </label>
          <div class="formpitch" id="formpitch">${slots}</div>
          <p class="note">Drag a bench player onto a shirt to make the substitution, or pick a bench player and then click the shirt. Drag one shirt onto another to swap them. Click a shirt to set his role.</p>
          <p class="err" id="subErr"></p>
        </div>
        <div style="display:grid;gap:14px">
          <div><h2 style="margin-bottom:8px">Bench</h2><div class="bench" id="bench">${bench}</div></div>
          <div id="rolePanel"></div>
        </div>
      </div>`;
    host.querySelector('#formSel').addEventListener('change', (e) => { FM.setFormation(team, e.target.value); world.selSlot = null; renderTactics(); });

    const err = (msg) => { host.querySelector('#subErr').textContent = msg || ''; };
    const slotPlayer = (i) => team.players.find((p) => p.index === i);
    function doSub(outP, inP) {
      const msg = FM.substitute(team, outP, inP, world.match);
      if (msg) { err(msg); return; }
      if (inLive()) world.running = false; // a substitution pauses play, press Play to continue
      world.selBench = null; world.selSlot = inP; renderTactics();
    }
    host.querySelectorAll('[data-slot]').forEach((b) => {
      const idx = +b.dataset.slot;
      b.addEventListener('click', () => {
        if (world.selBench) { doSub(slotPlayer(idx), world.selBench); return; }
        world.selSlot = slotPlayer(idx); renderTactics();
      });
      b.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', 'slot:' + idx); });
      b.addEventListener('dragover', (e) => { e.preventDefault(); b.classList.add('over'); });
      b.addEventListener('dragleave', () => b.classList.remove('over'));
      b.addEventListener('drop', (e) => {
        e.preventDefault(); b.classList.remove('over');
        const [kind, id] = e.dataTransfer.getData('text/plain').split(':');
        if (kind === 'bench') doSub(slotPlayer(idx), team.bench.find((p) => p.id === id));
        else if (kind === 'slot' && +id !== idx) { FM.swapSlots(team, slotPlayer(+id), slotPlayer(idx)); renderTactics(); }
      });
    });
    host.querySelectorAll('[data-bench]').forEach((b) => {
      b.addEventListener('click', () => {
        const p = team.bench.find((x) => x.id === b.dataset.bench);
        world.selBench = world.selBench === p ? null : p; renderTactics();
      });
      b.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', 'bench:' + b.dataset.bench); });
    });
    renderRolePanel(team);
  }

  function renderRolePanel(team) {
    const host = el('rolePanel');
    const player = world.selSlot && world.selSlot.index >= 0 && team.players.includes(world.selSlot) ? world.selSlot : null;
    if (!player) { host.innerHTML = '<p class="note">Click a shirt to see that player and set his role.</p>'; return; }
    const role = FM.ROLES[player.roleId];
    const roleOptions = FM.rolesForGroup(player.group).map((id) => `<option value="${id}"${id === player.roleId ? ' selected' : ''}>${FM.ROLES[id].name}</option>`).join('');
    let extra = '';
    Object.keys(role.options || {}).forEach((k) => {
      const o = role.options[k];
      if (o.type === 'choice') extra += `<label>${o.label}<select data-opt="${k}">${o.choices.map(([v, t]) => `<option value="${v}"${player.options[k] === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>`;
      else extra += `<label class="check"><input type="checkbox" data-opt="${k}"${player.options[k] ? ' checked' : ''}> ${o.label}</label>`;
    });
    const r = player.ratings;
    host.innerHTML = `
      <h2 style="margin-bottom:8px">Number ${player.number} (${player.slotKey})</h2>
      <div style="display:grid;gap:10px">
        <p class="note">Natural position ${player.natural}. Pace ${r.pace} · Dribbling ${r.dribbling} · Passing ${r.passing} · Finishing ${r.finishing} · Tackling ${r.tackling} · Heading ${r.heading} · Composure ${r.composure}${player.natural === 'GK' ? ' · Goalkeeping ' + r.gk : ''}</p>
        <label>Role<select data-k="role">${roleOptions}</select></label>
        <p class="desc">${role.desc}</p>
        ${extra}
      </div>`;
    host.querySelector('[data-k="role"]').addEventListener('change', (e) => { FM.setRole(team, player, e.target.value); renderRolePanel(team); });
    host.querySelectorAll('[data-opt]').forEach((o) => o.addEventListener('change', () => {
      player.options[o.dataset.opt] = o.type === 'checkbox' ? o.checked : o.value;
    }));
  }

  function buildLegend() {
    el('legend').innerHTML = world.teams.map((t) => `<span style="display:inline-flex;align-items:center;gap:6px;"><span class="swatch" style="background:${t.kit.shirt}"></span>${t.name} (${t.id === 'home' ? 'attacks right' : 'attacks left'})</span>`).join('');
  }

  // Debug handle for checking the model from the console.
  window.FM_WORLD = world;

  world.edit = home; world.tab = 'squad'; world.selSlot = null; world.selBench = null;
  el('nmHome').textContent = home.name; el('nmAway').textContent = away.name;
  el('swHome').style.background = home.kit.shirt; el('swAway').style.background = away.kit.shirt;
  newMatch();
  renderTactics();
  buildLegend();
  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(frame);
})();
