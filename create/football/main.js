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
    FM.setFormation(home, home.formationKey);
    FM.setFormation(away, away.formationKey);
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
    el('clock').textContent = m.phase === 'halftime' ? 'Half time' : m.phase === 'fulltime' ? 'Full time' : FM.formatClock(m.clock);
    const h = m.stats.home, a = m.stats.away, tot = h.possession + a.possession;
    const rows = [
      ['Possession', pct(h.possession, tot), pct(a.possession, tot)],
      ['Shots', h.shots, a.shots], ['On target', h.onTarget, a.onTarget], ['Expected goals', h.xg.toFixed(2), a.xg.toFixed(2)],
      ['Passes', h.passes, a.passes], ['Pass accuracy', pct(h.passesOk, h.passes), pct(a.passesOk, a.passes)],
      ['Dribbles won', h.dribblesWon + '/' + h.dribbles, a.dribblesWon + '/' + a.dribbles],
      ['Challenges won', h.tacklesWon + '/' + h.tackles, a.tacklesWon + '/' + a.tackles],
    ];
    const html = rows.map((r) => '<tr><td>' + r[1] + '</td><td>' + r[0] + '</td><td>' + r[2] + '</td></tr>').join('');
    if (html !== world.lastStats) { el('stats').innerHTML = html; world.lastStats = html; }
    const feed = el('feed');
    for (; world.shownEvents < m.events.length; world.shownEvents++) {
      const e = m.events[world.shownEvents];
      if (e.type !== 'shot' && e.type !== 'goal') continue;
      const team = e.team === 'home' ? home : away;
      const text = e.type === 'goal' ? 'GOAL, ' + team.name + ' (number ' + e.player + ')'
        : 'Shot, ' + team.name + ' number ' + e.player + ': ' + e.outcome + ' (xG ' + e.xg.toFixed(2) + ')';
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

  // ---------- selecting players and tactics controls ----------
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
    if (best) { world.selected = best; renderPlayerPanel(); }
  });

  const SLIDERS = [
    ['lineHeight', 'Defensive line height', 0, 1], ['widthScale', 'Width', 0.7, 1.25],
    ['directness', 'Directness', 0, 1], ['risk', 'Risk', 0, 1], ['tempo', 'Tempo', 0, 1], ['pressing', 'Pressing', 0, 1],
  ];
  function teamControls(team, hostId) {
    const host = el(hostId);
    host.innerHTML = `
      <div class="teamname"><span class="swatch" style="background:${team.kit.shirt}"></span>${team.name}</div>
      <label>Formation
        <select data-k="formation">${Object.keys(FM.FORMATIONS).map((k) => `<option value="${k}"${k === team.formationKey ? ' selected' : ''}>${k}</option>`).join('')}</select>
      </label>` + SLIDERS.map(([k, label, lo, hi]) => `
      <label>${label}: <span data-v="${k}">${team.tactics[k].toFixed(2)}</span>
        <input type="range" min="${lo}" max="${hi}" step="0.05" value="${team.tactics[k]}" data-k="${k}">
      </label>`).join('');
    host.querySelector('[data-k="formation"]').addEventListener('change', (e) => {
      FM.setFormation(team, e.target.value);
      if (world.selected && world.selected.team === team) world.selected = null;
      renderPlayerPanel();
    });
    SLIDERS.forEach(([k]) => host.querySelector(`input[data-k="${k}"]`).addEventListener('input', (e) => {
      team.tactics[k] = parseFloat(e.target.value);
      host.querySelector(`[data-v="${k}"]`).textContent = team.tactics[k].toFixed(2);
    }));
  }

  function renderPlayerPanel() {
    const host = el('playerPanel');
    const sel = world.selected;
    if (!sel) { host.innerHTML = '<h2>Selected player</h2><p class="hint">Click a player on the pitch.</p>'; return; }
    const { team, player } = sel;
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
      <h2>Selected player</h2>
      <div class="teamname"><span class="swatch" style="background:${team.kit.shirt}"></span>${team.name}, number ${player.number} (${player.slotKey})</div>
      <p class="hint">Pace ${r.pace} · Dribbling ${r.dribbling} · Passing ${r.passing} · Finishing ${r.finishing} · Tackling ${r.tackling} · Composure ${r.composure}${player.group === 'GK' ? ' · Goalkeeping ' + r.gk : ''}</p>
      <label>Role<select data-k="role">${roleOptions}</select></label>
      <p class="desc">${role.desc}</p>
      ${extra}`;
    host.querySelector('[data-k="role"]').addEventListener('change', (e) => { FM.setRole(team, player, e.target.value); renderPlayerPanel(); });
    host.querySelectorAll('[data-opt]').forEach((o) => o.addEventListener('change', () => {
      player.options[o.dataset.opt] = o.type === 'checkbox' ? o.checked : o.value;
    }));
  }

  function buildLegend() {
    el('legend').innerHTML = world.teams.map((t) => `<span style="display:inline-flex;align-items:center;gap:6px;"><span class="swatch" style="background:${t.kit.shirt}"></span>${t.name} (${t.id === 'home' ? 'attacks right' : 'attacks left'})</span>`).join('');
  }

  // Debug handle for checking the model from the console.
  window.FM_WORLD = world;

  el('nmHome').textContent = home.name; el('nmAway').textContent = away.name;
  el('swHome').style.background = home.kit.shirt; el('swAway').style.background = away.kit.shirt;
  newMatch();
  teamControls(home, 'homeControls');
  teamControls(away, 'awayControls');
  buildLegend();
  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(frame);
})();
