// Build step 1 page: draws the pitch and dots, runs the movement model, and provides a few controls
// so the formation, roles and instructions can be changed and their effect watched.
(function () {
  const { L, W } = FM.PITCH;
  const canvas = document.getElementById('pitch');
  const ctx = canvas.getContext('2d');

  const home = FM.createTeam({ id: 'home', name: 'Ashford Rovers', attackDir: 1, formation: '4-3-3', kit: { shirt: '#D62828', number: '#FFFFFF' } });
  const away = FM.createTeam({ id: 'away', name: 'Kingsbridge Athletic', attackDir: -1, formation: '4-2-2-2', kit: { shirt: '#1E5AE0', number: '#FFFFFF' } });
  const world = { teams: [home, away], ball: { x: L / 2, y: W / 2 }, ballTarget: null, possession: 'home', selected: null };

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
    world.teams.forEach((team) => {
      team.players.forEach((p) => {
        const cx = px(p.x), cy = py(p.y);
        ctx.beginPath(); ctx.arc(cx + 1.5, cy + 2.5, r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = team.kit.shirt; ctx.fill();
        const selected = world.selected && world.selected.player === p;
        ctx.lineWidth = selected ? Math.max(3, r * 0.3) : Math.max(1.5, r * 0.14);
        ctx.strokeStyle = selected ? '#F2C14E' : '#FFFFFF';
        ctx.stroke();
        ctx.fillStyle = team.kit.number;
        ctx.font = `700 ${Math.round(r * 1.05)}px Helvetica, Arial, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(p.number), cx, cy + r * 0.06);
      });
    });
    const bx = px(world.ball.x), by = py(world.ball.y);
    ctx.beginPath(); ctx.arc(bx, by, Math.max(5, scale * 0.9), 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#111'; ctx.stroke();
  }

  function draw() { drawPitch(); drawPlayers(); }

  // ---------- simulation loop ----------
  let last = performance.now();
  let demoClock = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (document.getElementById('demo').checked) runDemo(dt);
    const steps = 2;
    for (let i = 0; i < steps; i++) {
      FM.stepTeam(home, world.ball, world.possession === 'home', dt / steps);
      FM.stepTeam(away, world.ball, world.possession === 'away', dt / steps);
    }
    draw();
    requestAnimationFrame(frame);
  }

  // Demo only: wanders the ball toward points ahead of whichever team has it, and swaps possession now and then.
  function runDemo(dt) {
    demoClock += dt;
    if (!world.ballTarget || Math.hypot(world.ballTarget.x - world.ball.x, world.ballTarget.y - world.ball.y) < 1) {
      const team = world.possession === 'home' ? home : away;
      const ahead = team.attackDir === 1 ? 1 : -1;
      const nx = Math.max(4, Math.min(L - 4, world.ball.x + ahead * (6 + Math.random() * 16) * (Math.random() < 0.8 ? 1 : -0.6)));
      const ny = Math.max(4, Math.min(W - 4, world.ball.y + (Math.random() - 0.5) * 30));
      world.ballTarget = { x: nx, y: ny };
    }
    if (demoClock > 9) { demoClock = 0; setPossession(world.possession === 'home' ? 'away' : 'home'); }
    const speed = 9;
    const dx = world.ballTarget.x - world.ball.x, dy = world.ballTarget.y - world.ball.y;
    const dist = Math.hypot(dx, dy) || 1;
    const move = Math.min(dist, speed * dt);
    world.ball.x += dx / dist * move; world.ball.y += dy / dist * move;
  }

  // ---------- controls ----------
  function setPossession(which) {
    world.possession = which;
    document.getElementById('posHome').classList.toggle('on', which === 'home');
    document.getElementById('posAway').classList.toggle('on', which === 'away');
  }
  document.getElementById('posHome').addEventListener('click', () => setPossession('home'));
  document.getElementById('posAway').addEventListener('click', () => setPossession('away'));

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
    if (best) { world.selected = best; renderPlayerPanel(); return; }
    document.getElementById('demo').checked = false;
    world.ballTarget = null;
    world.ball.x = Math.max(0, Math.min(L, pt.x));
    world.ball.y = Math.max(0, Math.min(W, pt.y));
  });

  function teamControls(team, hostId) {
    const host = document.getElementById(hostId);
    host.innerHTML = `
      <div class="teamname"><span class="swatch" style="background:${team.kit.shirt}"></span>${team.name}</div>
      <label>Formation
        <select data-k="formation">${Object.keys(FM.FORMATIONS).map((k) => `<option value="${k}"${k === team.formationKey ? ' selected' : ''}>${k}</option>`).join('')}</select>
      </label>
      <label>Defensive line height: <span data-v="lineHeight">${team.tactics.lineHeight.toFixed(2)}</span>
        <input type="range" min="0" max="1" step="0.05" value="${team.tactics.lineHeight}" data-k="lineHeight">
      </label>
      <label>Width: <span data-v="widthScale">${team.tactics.widthScale.toFixed(2)}</span>
        <input type="range" min="0.7" max="1.25" step="0.05" value="${team.tactics.widthScale}" data-k="widthScale">
      </label>`;
    host.querySelector('[data-k="formation"]').addEventListener('change', (e) => {
      FM.setFormation(team, e.target.value);
      if (world.selected && world.selected.team === team) world.selected = null;
      renderPlayerPanel();
    });
    ['lineHeight', 'widthScale'].forEach((k) => host.querySelector(`[data-k="${k}"]`).addEventListener('input', (e) => {
      team.tactics[k] = parseFloat(e.target.value);
      host.querySelector(`[data-v="${k}"]`).textContent = team.tactics[k].toFixed(2);
    }));
  }

  function renderPlayerPanel() {
    const host = document.getElementById('playerPanel');
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
    host.innerHTML = `
      <h2>Selected player</h2>
      <div class="teamname"><span class="swatch" style="background:${team.kit.shirt}"></span>${team.name}, number ${player.number} (${player.slotKey})</div>
      <label>Role<select data-k="role">${roleOptions}</select></label>
      <p class="desc">${role.desc}</p>
      ${extra}`;
    host.querySelector('[data-k="role"]').addEventListener('change', (e) => { FM.setRole(team, player, e.target.value); renderPlayerPanel(); });
    host.querySelectorAll('[data-opt]').forEach((el) => el.addEventListener('change', () => {
      player.options[el.dataset.opt] = el.type === 'checkbox' ? el.checked : el.value;
    }));
  }

  function buildLegend() {
    document.getElementById('legend').innerHTML = world.teams.map((t) => `<span style="display:inline-flex;align-items:center;gap:6px;"><span class="swatch" style="background:${t.kit.shirt}"></span>${t.name} (${t.id === 'home' ? 'attacks right' : 'attacks left'})</span>`).join('');
  }

  // Debug handle for checking the model from the console.
  window.FM_WORLD = world;

  teamControls(home, 'homeControls');
  teamControls(away, 'awayControls');
  buildLegend();
  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(frame);
})();
