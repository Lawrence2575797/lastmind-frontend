// The game page: a season of eight clubs, a day-by-day calendar, the league table and squad, the live match
// and the tactics page. All the football itself is in engine.js, match.js and league.js.
(function () {
  const { L, W } = FM.PITCH;
  const el = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const world = { league: null, view: 'home', match: null, fixture: null, running: true, speed: 1, shownEvents: 0, lastStats: '', tab: 'squad', selSlot: null, selBench: null, saveTimer: null };
  const REAL_SECONDS_FOR_MATCH = 600; // a full 90 minutes takes about ten real minutes at 1x
  const MATCH_SPEED = 5400 / REAL_SECONDS_FOR_MATCH;
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
  }

  function drawPlayers() {
    const r = Math.max(8, scale * 1.55);
    const m = world.match;
    m.teams.forEach((team) => {
      team.players.forEach((p) => {
        const cx = px(p.x), cy = py(p.y);
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
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const m = world.match;
    if (world.view === 'match' && m) {
      if (world.running && m.phase !== 'halftime' && m.phase !== 'fulltime') advanceMatch(dt * MATCH_SPEED * world.speed);
      draw();
      updateHud();
    }
    requestAnimationFrame(frame);
  }
  function draw() { drawPitch(); drawPlayers(); }

  const pct = (a, b) => (b ? Math.round(100 * a / b) + '%' : '-');
  const RESTART_NAMES = { throw: 'Throw-in', goalkick: 'Goal kick', corner: 'Corner', freekick: 'Free kick', penalty: 'Penalty' };
  function updateHud() {
    const m = world.match, home = m.home, away = m.away;
    el('scHome').textContent = m.score[home.id]; el('scAway').textContent = m.score[away.id];
    el('clock').textContent = m.phase === 'halftime' ? 'Half time' : m.phase === 'fulltime' ? 'Full time' : FM.formatClock(m.clock) + (m.restart ? ' · ' + RESTART_NAMES[m.restart.kind] : '');
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
    for (; world.shownEvents < m.events.length; world.shownEvents++) {
      const e = m.events[world.shownEvents];
      const team = e.team === home.id ? home : e.team === away.id ? away : null;
      if (!team) continue;
      const who = (n) => { const p = playerBy(team, n); return p ? shortName(p) : 'number ' + n; };
      let text = null;
      if (e.type === 'goal') text = 'GOAL, ' + team.name + ': ' + who(e.player);
      else if (e.type === 'shot') text = (e.setPiece ? ({ header: 'Header', freekick: 'Free kick', penalty: 'Penalty' }[e.setPiece]) : 'Shot') + ', ' + who(e.player) + ' (' + team.name + '): ' + e.outcome + ' (xG ' + e.xg.toFixed(2) + ')';
      else if (e.type === 'foul') text = 'Foul by ' + who(e.player) + ' (' + team.name + ')' + (e.card ? ', ' + e.card.toUpperCase() : '');
      else if (e.type === 'offside') text = 'Offside, ' + who(e.player) + ' (' + team.name + ')';
      else if (e.type === 'restart' && (e.kind === 'corner' || e.kind === 'penalty')) text = (e.kind === 'corner' ? 'Corner' : 'PENALTY') + ' to ' + team.name;
      else if (e.type === 'sub') text = 'Substitution, ' + team.name + ': ' + who(e.on) + ' on for ' + who(e.off);
      else if (e.type === 'tactic') text = team.name + (e.direction === 'attack' ? ' have changed approach: more attacking' : ' have changed approach: more cautious');
      else if (e.type === 'keeperSwap') text = team.name + ' goalkeeper change: ' + who(e.on) + ' in goal' + (e.emergency ? ' (an outfield player)' : '');
      if (!text) continue;
      const div = document.createElement('div');
      div.innerHTML = '<b>' + FM.formatClock(e.t) + '</b> ' + esc(text);
      feed.prepend(div);
    }
    const playing = world.running && m.phase !== 'halftime' && m.phase !== 'fulltime';
    el('playBtn').textContent = m.phase === 'halftime' ? 'Start second half' : m.phase === 'fulltime' ? 'Full time' : world.running ? 'Pause' : 'Play';
    el('playBtn').classList.toggle('on', playing);
    const done = m.phase === 'fulltime';
    el('finishBox').hidden = !done;
    if (done) el('finishText').textContent = 'Full time: ' + home.name + ' ' + m.score[home.id] + '-' + m.score[away.id] + ' ' + away.name + '.';
  }

  el('playBtn').addEventListener('click', () => {
    const m = world.match;
    if (!m) return;
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
    if (!m) return;
    if (m.phase === 'halftime') FM.startSecondHalf(m);
    let guard = 0;
    while (m.phase !== 'halftime' && m.phase !== 'fulltime' && guard++ < 100000) FM.stepMatch(m, SUBSTEP);
  });
  el('finishBtn').addEventListener('click', () => {
    const btn = el('finishBtn');
    btn.disabled = true; btn.textContent = 'Playing the other matches...';
    setTimeout(() => {
      FM.completeRound(world.league, world.fixture, world.match);
      world.match = null; world.fixture = null;
      FM.saveLeague(world.league);
      btn.disabled = false; btn.textContent = 'Finish and see the table';
      setView('home');
    }, 40);
  });

  function startMatch() {
    const fx = FM.userFixtureToday(world.league);
    if (!fx || fx.played) return;
    world.fixture = fx;
    world.match = FM.startFixture(world.league, fx);
    world.running = true; world.speed = 1; world.shownEvents = 0; world.lastStats = '';
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

  // ---------- views and navigation ----------
  const VIEWS = ['home', 'league', 'squad', 'analysis', 'reports', 'hypotheses', 'match'];
  const NAV = [['home', 'Home'], ['tactics', 'Tactics'], ['league', 'League'], ['squad', 'Squad'], ['reports', 'Reports'], ['analysis', 'Analysis'], ['hypotheses', 'Hypotheses']];
  function setView(v) {
    world.view = v;
    VIEWS.forEach((k) => { el('view-' + k).hidden = k !== v; });
    el('newGame').hidden = true;
    el('tactics').hidden = !(v === 'tactics' || v === 'match');
    el('nav').hidden = v === 'match';
    renderTop();
    renderNav();
    if (v === 'home') renderHome();
    else if (v === 'league') renderLeague();
    else if (v === 'squad') renderSquad();
    else if (v === 'analysis') FM.renderAnalysis(el('view-analysis'), world.league);
    else if (v === 'reports') FM.renderReports(el('view-reports'), world.league);
    else if (v === 'hypotheses') FM.renderHypotheses(el('view-hypotheses'), world.league);
    else if (v === 'tactics' || v === 'match') renderTactics();
    if (v === 'match') resize();
  }
  function renderNav() {
    const nav = el('nav');
    nav.innerHTML = NAV.map(([k, label]) => `<button data-nav="${k}" class="${world.view === k ? 'on' : ''}">${label}</button>`).join('');
    nav.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.nav)));
  }
  function renderTop() {
    const lg = world.league;
    const host = el('topRight');
    if (!lg) { host.innerHTML = ''; el('subtitle').textContent = ''; return; }
    const user = userTeam();
    el('subtitle').textContent = user.name + ' · Season ' + lg.season + ' · ' + TIER_NAMES[lg.tier] + ' statistics';
    const over = FM.seasonOver(lg);
    const todayFx = FM.userFixtureToday(lg);
    const mustPlay = todayFx && !todayFx.played;
    let label;
    if (over) label = 'Season complete';
    else if (mustPlay) label = 'Play the match';
    else label = 'Advance to ' + FM.weekdayName(lg.day + 1);
    host.innerHTML = `<span class="hint" style="color:inherit;opacity:0.8">${esc(FM.dayLabel(lg.day))}</span>
      <button class="primary" id="advBtn"${over || world.view === 'match' ? ' disabled' : ''}>${label}</button>
      <button id="newBtn" title="Abandon this season and start again">New game</button>`;
    el('advBtn').addEventListener('click', () => {
      if (mustPlay) { startMatch(); return; }
      const err = FM.advanceDay(lg);
      if (!err) { FM.saveLeague(lg); setView(world.view === 'tactics' ? 'tactics' : 'home'); }
    });
    el('newBtn').addEventListener('click', () => {
      if (!confirm('Abandon this season and start a new game?')) return;
      FM.clearSave(); world.league = null; world.match = null; showNewGame();
    });
  }

  // ---------- home ----------
  function tableHtml(rows, compact) {
    const me = world.league.userId;
    const head = compact ? '' : '<th>GF</th><th>GA</th>';
    return `<div class="tablewrap"><table class="data"><thead><tr><th class="l">#</th><th class="l">Club</th><th>P</th><th>W</th><th>D</th><th>L</th>${head}<th>GD</th><th>Pts</th>${compact ? '' : '<th class="l">Form</th>'}</tr></thead><tbody>` +
      rows.map((r, i) => `<tr class="${r.id === me ? 'me' : ''}"><td class="l">${i + 1}</td><td class="l">${esc(r.name)}</td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td>${compact ? '' : `<td>${r.gf}</td><td>${r.ga}</td>`}<td>${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td><b>${r.pts}</b></td>${compact ? '' : `<td class="l">${r.form.slice(-5).map((f) => `<span class="pill ${f}">${f}</span>`).join('')}</td>`}</tr>`).join('') +
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
      next = `<h2>Season complete</h2><div class="fixture-big">${esc(rows[0].name)} are champions.</div><p class="desc">You finished ${pos}${['st', 'nd', 'rd'][pos - 1] || 'th'} of 8 with ${rows[pos - 1].pts} points.</p>`;
    } else if (nextFx) {
      const home = FM.teamById(lg, nextFx.homeId), away = FM.teamById(lg, nextFx.awayId);
      const opp = home.id === me ? away : home;
      const days = FM.daysUntilMatch(lg);
      const when = days === 0 ? 'Today, matchday' : days === 1 ? 'Tomorrow' : 'In ' + days + ' days, on Saturday';
      next = `<h2>Next match</h2>
        <div class="fixture-big">${esc(home.name)} <span style="opacity:.6">v</span> ${esc(away.name)}</div>
        <p class="desc">${when} · Round ${nextFx.round + 1} of 14 · ${home.id === me ? 'Home' : 'Away'} against ${esc(opp.name)} (${FM.STYLE_NAMES[opp.style] ? 'known for ' + FM.STYLE_NAMES[opp.style].toLowerCase() : ''})</p>
        ${today && !today.played ? '<div class="banner">It is matchday. Check your tactics, then play the match.</div>' : '<p class="note">Use the days before the match to adjust your tactics. Advance the calendar when you are ready.</p>'}`;
    }
    const played = lg.fixtures.filter((f) => f.played && (f.homeId === me || f.awayId === me)).sort((a, b) => b.round - a.round);
    let lastCard = '<h2>Last result</h2><p class="note">No match played yet.</p>';
    if (played.length) {
      const f = played[0], home = FM.teamById(lg, f.homeId), away = FM.teamById(lg, f.awayId);
      const hs = f.stats[home.id], as = f.stats[away.id], tot = hs.possession + as.possession;
      lastCard = `<h2>Last result</h2><div class="fixture-big">${esc(home.name)} ${f.hg}-${f.ag} ${esc(away.name)}</div>
        <p class="desc">Shots ${hs.shots}-${as.shots} · On target ${hs.onTarget}-${as.onTarget} · xG ${hs.xg.toFixed(2)}-${as.xg.toFixed(2)} · Possession ${pct(hs.possession, tot)}-${pct(as.possession, tot)}</p>`;
    }
    host.innerHTML = `<div class="two">
      <div style="display:grid;gap:16px"><div class="card">${next}</div><div class="card">${lastCard}</div></div>
      <div class="card"><h2>League table</h2>${tableHtml(rows, true)}</div></div>`;
  }

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
    host.innerHTML = `<div class="two"><div class="card"><h2>League table</h2>${tableHtml(rows, false)}</div><div class="card"><h2>Results and fixtures</h2><div class="rounds">${roundHtml}</div></div></div>`;
  }
  function renderSquad() {
    const team = userTeam(), host = el('view-squad');
    const onPitch = team.players.slice().sort((a, b) => a.index - b.index);
    const all = onPitch.concat(team.bench);
    const row = (p) => `<tr><td class="l">${p.number}</td><td class="l">${esc(p.name)}</td><td class="l">${esc(p.nation)}</td><td class="l">${p.natural}</td><td class="l">${p.slotKey ? p.slotKey : 'Bench'}</td>
      <td>${p.ratings.pace}</td><td>${p.ratings.dribbling}</td><td>${p.ratings.passing}</td><td>${p.ratings.finishing}</td><td>${p.ratings.tackling}</td><td>${p.ratings.heading}</td><td>${p.ratings.composure}</td><td>${p.natural === 'GK' ? p.ratings.gk : '-'}</td>
      <td>${p.stats.apps}</td><td>${p.stats.goals}</td><td>${p.stats.shots}</td><td>${p.stats.yellows}</td><td>${p.stats.reds}</td></tr>`;
    host.innerHTML = `<div class="card"><h2>${esc(team.name)}: squad of ${all.length}</h2>
      <div class="tablewrap"><table class="data"><thead><tr><th class="l">#</th><th class="l">Name</th><th class="l">Nation</th><th class="l">Pos</th><th class="l">Now</th><th>Pac</th><th>Dri</th><th>Pas</th><th>Fin</th><th>Tck</th><th>Hea</th><th>Com</th><th>GK</th><th>Apps</th><th>Goals</th><th>Shots</th><th>YC</th><th>RC</th></tr></thead><tbody>${all.map(row).join('')}</tbody></table></div>
      <p class="note">Ratings run from about 25 to 95 and change the odds of what a player tries: a better dribbler wins more dribbles, a better finisher scores more of the same chances.</p></div>`;
  }

  // ---------- the tactics page ----------
  // One page, used on any preparation day and again when the match is paused. Changes apply to the rest of the match.
  const TABS = [
    ['squad', 'Squad and formation'], ['build', 'Build-up'], ['final', 'Final third'],
    ['transatt', 'Transition to attack'], ['transdef', 'Transition to defence'], ['without', 'Without the ball'], ['setpieces', 'Set pieces'],
  ];
  // Each tab with a board shows the team in that phase of play.
  const BOARD_KEY = { squad: 'shape', build: 'build', final: 'final', transatt: 'transAtt', transdef: 'transDef', without: 'without' };
  const PHASE_TEXT = {
    shape: 'The team set up in its formation. Drag a shirt anywhere on the pitch; every other phase follows from this shape, the role and the instructions. Drag one shirt onto another to swap those two players.',
    build: 'The team with the ball in its own half. A shirt you drag here moves for this phase only, and only as far as the player could run from his other positions. A shirt with a gold dot has been placed by hand.',
    final: 'The team with the ball near the opposition goal. Attackers can stand on the edge of the box or inside it, but they are held at the offside line, and the same role and instructions apply as in every other phase.',
    transAtt: 'The few seconds just after winning the ball, before the team settles. This is where the first runs are made, so positions here pull players toward where the attack will go.',
    transDef: 'The few seconds just after losing the ball. Players here are pulled toward the positions that cut the counter-attack off, or toward the ball if the team presses.',
    without: 'The team without the ball, set to defend. The line height, pressing and width settings move these positions further.',
  };
  const BALL_AT = { build: 0.18, final: 0.86, transAtt: 0.42, transDef: 0.55, without: 0.45 };
  const PHASE_CODE = { build: 'B', final: 'F', transAtt: 'TA', transDef: 'TD', without: 'D' };
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
  const overall = (p) => { const r = p.ratings; return p.natural === 'GK' ? r.gk : Math.round((r.pace + r.dribbling + r.passing + r.finishing + r.tackling) / 5); };
  const inLive = () => world.match && world.match.clock > 0 && world.match.phase !== 'fulltime';

  function renderTactics() {
    if (!world.league) return;
    const team = userTeam();
    el('subInfo').textContent = 'Substitutions used: ' + team.subsUsed + ' of ' + team.maxSubs + (inLive() ? '' : ' (changes before kick-off are free)');
    el('tabs').innerHTML = TABS.map(([k, label]) => `<button data-tab="${k}" class="${world.tab === k ? 'on' : ''}">${label}</button>`).join('');
    el('tabs').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { world.tab = b.dataset.tab; renderTactics(); }));
    if (world.tab === 'setpieces') renderSetPieces(team);
    else renderBoardTab(team, world.tab);
  }

  function takerSelect(team, key, label) {
    const opts = ['<option value="">Automatic (best on the pitch)</option>'].concat(team.players.filter((p) => p.group !== 'GK').map((p) =>
      `<option value="${p.id}"${team.tactics[key] === p.id ? ' selected' : ''}>${esc(shortName(p))} (${p.slotKey}): passing ${p.ratings.passing}, finishing ${p.ratings.finishing}</option>`)).join('');
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
      team.tactics[k] = parseFloat(e.target.value);
      host.querySelector(`[data-v="${k}"]`).textContent = team.tactics[k].toFixed(2);
      saveSoon();
    }));
  }

  // ---------- the tactics board ----------
  // A vertical pitch, attacking up. Positions are team space: d (0 own goal, 1 opposition goal) and w (0 the team's left).
  const BS = 6.5, BW = 68 * BS, BH = 105 * BS;
  const bpt = (pos) => ({ x: pos.w * BW, y: (1 - pos.d) * BH });

  function boardPitchSvg(key) {
    const cx = BW / 2, S = BS;
    const ln = 'stroke="rgba(255,255,255,0.85)" stroke-width="2.5" fill="none"';
    let s = '';
    for (let i = 0; i < 14; i++) s += `<rect x="0" y="${(i * BH / 14).toFixed(1)}" width="${BW}" height="${(BH / 14).toFixed(1)}" fill="${i % 2 ? '#2E7D3E' : '#2A7539'}"/>`;
    if (key === 'final') s += `<rect x="0" y="0" width="${BW}" height="${BH / 3}" fill="rgba(255,255,255,0.07)"/>`;
    if (key === 'build') s += `<rect x="0" y="${BH * 2 / 3}" width="${BW}" height="${BH / 3}" fill="rgba(255,255,255,0.07)"/>`;
    s += `<rect x="0" y="0" width="${BW}" height="${BH}" ${ln}/><line x1="0" y1="${BH / 2}" x2="${BW}" y2="${BH / 2}" ${ln}/>`;
    s += `<circle cx="${cx}" cy="${BH / 2}" r="${9.15 * S}" ${ln}/><circle cx="${cx}" cy="${BH / 2}" r="3" fill="rgba(255,255,255,0.85)"/>`;
    [[0, 1], [BH, -1]].forEach(([y0, dir]) => {
      const y = (m) => y0 + dir * m * S;
      s += `<rect x="${cx - 20.16 * S}" y="${dir > 0 ? y0 : y(16.5)}" width="${40.32 * S}" height="${16.5 * S}" ${ln}/>`;
      s += `<rect x="${cx - 9.16 * S}" y="${dir > 0 ? y0 : y(5.5)}" width="${18.32 * S}" height="${5.5 * S}" ${ln}/>`;
      s += `<rect x="${cx - 3.66 * S}" y="${dir > 0 ? y0 - 2 * S : y0}" width="${7.32 * S}" height="${2 * S}" ${ln}/>`;
      s += `<circle cx="${cx}" cy="${y(11)}" r="3" fill="rgba(255,255,255,0.85)"/>`;
      s += `<path d="M ${cx - 7.31 * S} ${y(16.5)} A ${9.15 * S} ${9.15 * S} 0 0 ${dir > 0 ? 0 : 1} ${cx + 7.31 * S} ${y(16.5)}" ${ln}/>`;
    });
    return s;
  }

  function drawBoard(host, team, key) {
    const selected = world.selSlot && team.players.includes(world.selSlot) ? world.selSlot : null;
    const posOf = (p) => (key === 'shape' ? FM.slotBase(team, p) : FM.phasePos(team, p, key));
    let ghosts = '';
    if (selected && key !== 'shape') {
      const reach = FM.reachMetres(selected) * BS;
      FM.PHASES.forEach((ph) => {
        if (ph === key) return;
        const g = bpt(FM.phasePos(team, selected, ph));
        ghosts += `<circle cx="${g.x}" cy="${g.y}" r="${reach}" fill="rgba(242,193,78,0.05)" stroke="rgba(242,193,78,0.55)" stroke-width="2" stroke-dasharray="9 7"/>`;
        ghosts += `<circle cx="${g.x}" cy="${g.y}" r="11" fill="rgba(242,193,78,0.9)"/><text x="${g.x}" y="${g.y + 4.5}" text-anchor="middle" font-size="12" font-weight="700" fill="#1A232D">${PHASE_CODE[ph]}</text>`;
      });
    }
    let ball = '';
    if (BALL_AT[key] != null) {
      const bp = bpt({ d: BALL_AT[key], w: 0.5 });
      ball = `<circle cx="${bp.x + 120}" cy="${bp.y}" r="9" fill="#fff" stroke="#111" stroke-width="2"/><text x="${bp.x + 136}" y="${bp.y + 5}" font-size="14" fill="#fff" style="paint-order:stroke" stroke="#000" stroke-width="3">${key === 'without' || key === 'transDef' ? 'opposition have the ball about here' : 'ball about here'}</text>`;
    }
    const dots = team.players.map((p) => {
      const pt = bpt(posOf(p)), sel = selected === p;
      const manual = key === 'shape' ? !!(team.shape && team.shape[p.index]) : FM.isManual(team, p, key);
      return `<g class="dot" data-idx="${p.index}" transform="translate(${pt.x.toFixed(1)},${pt.y.toFixed(1)})">
        <circle r="20" fill="${team.kit.shirt}" stroke="${sel ? '#F2C14E' : '#fff'}" stroke-width="${sel ? 5 : 3}"/>
        <text y="6" text-anchor="middle" font-size="18" font-weight="700" fill="${team.kit.number}">${p.number}</text>
        <text y="38" text-anchor="middle" font-size="14" fill="#fff" stroke="#000" stroke-width="3" style="paint-order:stroke">${esc(shortName(p))}</text>
        ${manual ? '<circle cx="15" cy="-15" r="5.5" fill="#F2C14E" stroke="#1A232D" stroke-width="1.5"/>' : ''}</g>`;
    }).join('');
    host.innerHTML = `<svg class="board" viewBox="-20 -26 ${BW + 40} ${BH + 52}" role="img" aria-label="Tactics board">${boardPitchSvg(key)}${ghosts}${ball}${dots}</svg>`;
    const svg = host.firstChild;
    const toPos = (e) => {
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const q = pt.matrixTransform(svg.getScreenCTM().inverse());
      return { d: clamp01(1 - q.y / BH, 0.02, 0.98), w: clamp01(q.x / BW, 0.03, 0.97), x: q.x, y: q.y };
    };
    let drag = null;
    svg.addEventListener('pointerdown', (e) => {
      const g = e.target.closest('.dot');
      if (!g) return;
      const p = team.players.find((x) => x.index === +g.dataset.idx);
      world.selSlot = p;
      drag = { p, g, sx: e.clientX, sy: e.clientY, moved: false, pos: null };
      svg.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    svg.addEventListener('pointermove', (e) => {
      if (!drag) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5) return;
      drag.moved = true;
      let pos = toPos(e);
      if (key !== 'shape') pos = FM.clampToReach(team, drag.p, key, pos);
      drag.pos = pos;
      const pt = bpt(pos);
      drag.g.setAttribute('transform', `translate(${pt.x.toFixed(1)},${pt.y.toFixed(1)})`);
    });
    svg.addEventListener('pointerup', (e) => {
      if (!drag) return;
      const d = drag; drag = null;
      if (!d.moved && world.selBench) { host.dispatchEvent(new CustomEvent('sub', { detail: { idx: d.p.index, id: world.selBench.id } })); return; }
      world.selBench = null;
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
      renderTactics();
    });
    // a bench player dragged from the list onto a shirt is a substitution
    svg.addEventListener('dragover', (e) => { if (e.target.closest('.dot')) e.preventDefault(); });
    svg.addEventListener('drop', (e) => {
      const g = e.target.closest('.dot');
      if (!g) return;
      e.preventDefault();
      const [kind, id] = e.dataTransfer.getData('text/plain').split(':');
      if (kind === 'bench') host.dispatchEvent(new CustomEvent('sub', { detail: { idx: +g.dataset.idx, id } }));
    });
  }
  const clamp01 = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function renderBoardTab(team, tab) {
    const host = el('tabBody'), key = BOARD_KEY[tab], isShape = key === 'shape';
    const bench = team.bench.map((p) => `
      <button class="chip${world.selBench === p ? ' sel' : ''}" draggable="true" data-bench="${p.id}">
        <span class="num" style="${KITNUM(team)}">${p.number}</span><span>${p.natural} ${esc(shortName(p))}</span><span class="meta">${overall(p)}</span>
      </button>`).join('');
    host.innerHTML = `
      <div class="tb-grid">
        <div class="tb-left">
          ${isShape ? `<label>Formation<select id="formSel">${Object.keys(FM.FORMATIONS).map((k) => `<option value="${k}"${k === team.formationKey ? ' selected' : ''}>${k}</option>`).join('')}</select></label>` : `<h2>${FM.PHASE_NAMES[key]}</h2>`}
          <p class="note">${PHASE_TEXT[key]}</p>
          <div id="board"></div>
          <p class="note" id="reachNote"></p>
          <div class="row"><button id="resetPhase">${isShape ? 'Reset the shape to the formation' : 'Reset this phase to the role defaults'}</button></div>
          <p class="err" id="subErr"></p>
        </div>
        <div class="tb-right">
          <div id="phaseSliders"></div>
          ${isShape ? `<div><h2 style="margin-bottom:8px">Bench</h2><div class="bench" id="bench">${bench}</div><p class="note" style="margin-top:8px">Drag a bench player onto a shirt, or pick one and click a shirt, to substitute.</p></div>` : ''}
          <div id="rolePanel"></div>
          <div id="warnPanel"></div>
        </div>
      </div>`;
    const board = host.querySelector('#board');
    drawBoard(board, team, key);
    if (SLIDER_TABS[tab]) renderSliderTab(team, SLIDER_TABS[tab], host.querySelector('#phaseSliders'));
    const err = (msg) => { host.querySelector('#subErr').textContent = msg || ''; };
    const sel = world.selSlot && team.players.includes(world.selSlot) ? world.selSlot : null;
    if (sel && !isShape) host.querySelector('#reachNote').textContent = `${sel.name} can cover about ${Math.round(FM.reachMetres(sel))} m between phases. The gold circles show where he can stand here, given where he is in the other phases (B build-up, F final third, TA and TD the transitions, D defending).`;
    else host.querySelector('#reachNote').textContent = isShape ? '' : 'Click a shirt to see how far that player can move between phases.';

    if (isShape) host.querySelector('#formSel').addEventListener('change', (e) => { FM.setFormation(team, e.target.value); world.selSlot = null; saveSoon(); renderTactics(); });
    host.querySelector('#resetPhase').addEventListener('click', () => { FM.clearPhase(team, key); saveSoon(); renderTactics(); });

    const slotPlayer = (i) => team.players.find((p) => p.index === i);
    function doSub(outP, inP) {
      const msg = FM.substitute(team, outP, inP, world.match);
      if (msg) { err(msg); return; }
      if (inLive()) world.running = false; // a substitution pauses play, press Play to continue
      world.selBench = null; world.selSlot = inP; saveSoon(); renderTactics();
    }
    board.addEventListener('sub', (e) => { const inP = team.bench.find((p) => p.id === e.detail.id); if (inP) doSub(slotPlayer(e.detail.idx), inP); });
    host.querySelectorAll('[data-bench]').forEach((b) => {
      b.addEventListener('click', () => { const p = team.bench.find((x) => x.id === b.dataset.bench); world.selBench = world.selBench === p ? null : p; renderTactics(); });
      b.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', 'bench:' + b.dataset.bench); });
    });
    renderRolePanel(team);
    renderWarnPanel(team);
  }

  function renderWarnPanel(team) {
    const host = el('warnPanel');
    if (!host) return;
    const all = FM.teamProblems(team);
    const sel = world.selSlot && team.players.includes(world.selSlot) ? world.selSlot : null;
    let html = '<h2 style="margin-bottom:8px">Do the phases fit together?</h2>';
    if (!all.length) html += '<p class="note">Yes. Every player can reach each of his positions in time, and each position fits his role.</p>';
    else {
      html += '<div class="warns">' + all.map(({ p, list }) => `<div class="warn${p === sel ? ' me' : ''}"><b>${esc(shortName(p))}</b> (${p.slotKey})<ul>${list.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>`).join('') + '</div>';
      html += '<div class="row" style="margin-top:8px"><button id="fixAll">Pull impossible positions back within reach</button></div>';
    }
    host.innerHTML = html;
    const fix = host.querySelector('#fixAll');
    if (fix) fix.addEventListener('click', () => { team.players.forEach((p) => FM.fixSlot(team, p)); saveSoon(); renderTactics(); });
  }

  function renderRolePanel(team) {
    const host = el('rolePanel');
    const player = world.selSlot && team.players.includes(world.selSlot) ? world.selSlot : null;
    if (!player) { host.innerHTML = '<p class="note">Click a shirt to see that player, set his role and give him instructions.</p>'; return; }
    const role = FM.ROLES[player.roleId];
    const roleOptions = FM.rolesForGroup(player.group).map((id) => `<option value="${id}"${id === player.roleId ? ' selected' : ''}>${FM.ROLES[id].name}</option>`).join('');
    let extra = '';
    Object.keys(role.options || {}).forEach((k) => {
      const o = role.options[k];
      if (o.type === 'choice') extra += `<label>${o.label}<select data-opt="${k}">${o.choices.map(([v, t]) => `<option value="${v}"${player.options[k] === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>`;
      else extra += `<label class="check"><input type="checkbox" data-opt="${k}"${player.options[k] ? ' checked' : ''}> ${o.label}</label>`;
    });
    const r = player.ratings;
    const list = FM.instructionsFor(player.group);
    const sections = ['Movement', 'On the ball', 'Off the ball', 'Set pieces'];
    const ins = sections.map((sec) => {
      const items = list.filter((i) => i.section === sec);
      if (!items.length) return '';
      return `<div class="ins"><h3>${sec}</h3>` + items.map((i) => `<label title="${esc(i.desc)}">${i.label}<select data-ins="${i.key}">${i.options.map(([v, t]) => `<option value="${v}"${(+(player.instr || {})[i.key] || 0) === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>`).join('') + '</div>';
    }).join('');
    host.innerHTML = `
      <h2 style="margin-bottom:8px">${esc(player.name)}, number ${player.number}</h2>
      <div style="display:grid;gap:10px">
        <p class="note">${esc(player.nation)} · natural position ${player.natural}, playing ${player.slotKey}. Pace ${r.pace} · Dribbling ${r.dribbling} · Passing ${r.passing} · Finishing ${r.finishing} · Tackling ${r.tackling} · Heading ${r.heading} · Composure ${r.composure}${player.natural === 'GK' ? ' · Goalkeeping ' + r.gk : ''}</p>
        <label>Role<select data-k="role">${roleOptions}</select></label>
        <p class="desc">${role.desc}</p>
        ${extra}
        <h2>Instructions <span class="note" style="text-transform:none;letter-spacing:0">(${FM.countInstructions(player)} set, they hold in every phase)</span></h2>
        <div class="ins-grid">${ins}</div>
        <div class="row"><button id="resetPlayer">Reset his positions in every phase</button></div>
        <label>Your notes on him (these do not change how he plays)<textarea id="playerNote" rows="2">${esc(player.note || '')}</textarea></label>
      </div>`;
    host.querySelector('[data-k="role"]').addEventListener('change', (e) => { FM.setRole(team, player, e.target.value); FM.fixSlot(team, player); saveSoon(); renderTactics(); });
    host.querySelectorAll('[data-opt]').forEach((o) => o.addEventListener('change', () => {
      player.options[o.dataset.opt] = o.type === 'checkbox' ? o.checked : o.value; saveSoon(); renderTactics();
    }));
    host.querySelectorAll('[data-ins]').forEach((o) => o.addEventListener('change', () => {
      player.instr = player.instr || {};
      player.instr[o.dataset.ins] = +o.value;
      FM.fixSlot(team, player); saveSoon(); renderTactics();
    }));
    host.querySelector('#resetPlayer').addEventListener('click', () => { FM.clearPlayerPositions(team, player); saveSoon(); renderTactics(); });
    host.querySelector('#playerNote').addEventListener('input', (e) => { player.note = e.target.value; saveSoon(); });
  }

  // ---------- starting up ----------
  function showNewGame() {
    ['home', 'league', 'squad', 'analysis', 'reports', 'hypotheses', 'match'].forEach((k) => { el('view-' + k).hidden = true; });
    el('tactics').hidden = true; el('nav').hidden = true; el('newGame').hidden = false;
    el('topRight').innerHTML = ''; el('subtitle').textContent = 'Eight clubs, one season, and a lot of numbers.';
  }
  el('ngTeam').innerHTML = FM.TEAM_DEFS.map((d, i) => `<option value="${i}">${esc(d.name)}</option>`).join('');
  el('ngStart').addEventListener('click', () => {
    const tier = document.querySelector('input[name="tier"]:checked').value;
    world.league = FM.createLeague({ userIndex: +el('ngTeam').value, tier });
    FM.saveLeague(world.league);
    setView('home');
  });

  window.FM_WORLD = world; // debug handle for the console
  window.addEventListener('resize', resize);
  world.league = FM.loadLeague();
  if (world.league) setView('home'); else showNewGame();
  requestAnimationFrame(frame);
})();
