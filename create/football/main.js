// The game page: a season of eight clubs, a day-by-day calendar, the league table and squad, the live match
// and the tactics page. All the football itself is in engine.js, match.js and league.js.
(function () {
  const { L, W } = FM.PITCH;
  const el = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const world = { league: null, view: 'home', match: null, fixture: null, running: true, speed: 1, highlightsOnly: false, highlightUntil: 0, highlightSearching: false, highlightRevealFrom: 0, shownEvents: 0, lastStats: '', trails: [], impacts: [], vt: 0, commentaryUntil: 0, commentaryTurns: {}, tab: 'squad', selSlot: null, selBench: null, saveTimer: null, renderPos: new Map(), renderBall: null, frameDt: .016 };
  const REAL_SECONDS_FOR_MATCH = 600; // a full 90 minutes takes about ten real minutes at 1x
  const MATCH_SPEED = 5400 / REAL_SECONDS_FOR_MATCH / 6;   // speeds are shown against a pace six times slower than the first version's
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
  function isImportantMoment(m) {
    if (world.vt < world.highlightUntil) return true;
    if (m.restart && (m.restart.kind === 'corner' || m.restart.kind === 'penalty' || (m.restart.kind === 'freekick' && FM.toTeamSpace(m.restart.team.attackDir, m.restart.x, m.restart.y).d > .72))) return true;
    if (!m.carrier) return false;
    const p = m.carrier.player;
    const depth = FM.toTeamSpace(m.carrier.team.attackDir, p.x, p.y).d;
    const opponents = m.carrier.team === m.home ? m.away.players : m.home.players;
    const pressure = opponents.some((d) => d.group !== 'GK' && Math.hypot(d.x - p.x, d.y - p.y) < 4.5);
    return depth > .79 || (depth > .73 && pressure);
  }
  function importantEvent(e) {
    if (e.type === 'goal' || (e.type === 'shot' && (e.xg || 0) >= .1) || (e.type === 'foul' && e.card === 'red')) return true;
    if (e.type === 'restart' && (e.kind === 'corner' || e.kind === 'penalty')) return true;
    if (e.type === 'tackle' && e.ok && e.x != null && (e.x < L * .22 || e.x > L * .78)) return true;
    return false;
  }
  function seekHighlight(m) {
    const startedAt = m.events.length, t0 = performance.now();
    world.highlightSearching = true;
    while (performance.now() - t0 < 26 && m.phase !== 'halftime' && m.phase !== 'fulltime' && !m.injuryPause) {
      FM.stepMatch(m, SUBSTEP);
      const added = m.events.slice(startedAt), hit = added.findIndex(importantEvent);
      if (isImportantMoment(m) || hit >= 0) { world.highlightRevealFrom = hit >= 0 ? startedAt + hit : m.events.length; world.highlightSearching = false; return true; }
    }
    if (m.phase === 'halftime' || m.phase === 'fulltime' || m.injuryPause) world.highlightSearching = false;
    return false;
  }
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    world.frameDt = dt;
    last = now;
    const m = world.match;
    if (world.view === 'match' && m) {
      if (FM.scout && world.league) FM.scout.watch(world.league, m);
      if (world.skipTo) { skipSlice(m); if (!world.skipTo) world.trails = []; }
      else if (world.running && m.phase !== 'halftime' && m.phase !== 'fulltime') {
        if (world.highlightsOnly && !isImportantMoment(m)) seekHighlight(m);
        else { advanceMatch(dt * MATCH_SPEED * (world.highlightsOnly ? 1 : world.speed)); world.highlightSearching = false; }
        world.vt += dt;
      }
      if (!world.highlightSearching) { draw(); updateHud(); }
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
      const reveal = !world.highlightsOnly || world.shownEvents >= world.highlightRevealFrom;
      if (reveal && e.type === 'pass' && e.tx != null) world.trails.push({ x0: e.x, y0: e.y, x1: e.tx, y1: e.ty, kind: e.ok ? 'pass' : 'fail', born: world.vt });
      else if (reveal && e.type === 'shot') world.trails.push({ x0: e.x, y0: e.y, x1: team.attackDir === 1 ? L : 0, y1: W / 2, kind: e.outcome === 'goal' ? 'goal' : 'shot', born: world.vt });
      if (reveal && e.type === 'tackle' && e.x != null) world.impacts.push({ x: e.x, y: e.y, kind: 'tackle', born: world.vt });
      let text = null;
      if (e.type === 'goal') text = 'GOAL, ' + team.name + ': ' + who(e.player);
      else if (e.type === 'shot') text = (e.setPiece ? ({ header: 'Header', freekick: 'Free kick', penalty: 'Penalty' }[e.setPiece]) : 'Shot') + ', ' + who(e.player) + ' (' + team.name + '): ' + e.outcome + ' (xG ' + e.xg.toFixed(2) + ')';
      else if (e.type === 'foul') text = 'Foul by ' + who(e.player) + ' (' + team.name + ')' + (e.card ? ', ' + e.card.toUpperCase() : '');
      else if (e.type === 'offside') text = 'Offside, ' + who(e.player) + ' (' + team.name + ')';
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
        if (e.outcome === 'goal') say(call('shotGoal', ['It is in!', 'That finds the net!', 'A clinical finish!']), 'goal', 3.5);
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
    const ip = m.injuryPause;
    el('injuryBox').hidden = !ip;
    if (ip) { world.running = false; el('injuryText').textContent = ip.player.name + ' (number ' + ip.player.number + ') is injured and cannot continue, so play is stopped. Substitute him on the tactics board below (click a bench player, then his shirt), or play on with ten men.'; }
    const done = m.phase === 'fulltime';
    el('finishBox').hidden = !done;
    if (done) el('finishText').textContent = 'Full time: ' + home.name + ' ' + m.score[home.id] + '-' + m.score[away.id] + ' ' + away.name + '.';
  }

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
    world.highlightUntil = world.vt; world.highlightSearching = false; world.highlightRevealFrom = m.events.length;
    world.running = true;
    say(world.highlightsOnly ? 'Highlights on — moving quickly to the next dangerous moment.' : 'Full match view restored.', '', 2.2);
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

  const INTERVIEW_ANSWERS = {
    calm: ['We have prepared well. Now the players need to trust the work.', 'We will respect them, but we will play our own game.', 'The performance matters. If we get that right, the result can follow.', 'There is no need for a grand promise. We know what we need to do.', 'The group is ready and looking forward to it.'],
    response: ['We were brave at the right moments and deserved the result.', 'There were good spells and difficult spells. We will learn from both.', 'The score does not tell the whole story, but we have to own the result.', 'The players gave everything. Our next job is to improve the details.', 'We will review it honestly, then move forward together.']
  };
  function interviewQuestions(kind, fx, result) {
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
    const room = el('interviewRoom'), body = el('pressRoomBody'), questions = interviewQuestions(kind, fx, result), answers = INTERVIEW_ANSWERS[kind === 'pre' ? 'calm' : 'response'];
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
      { const mine = FM.teamById(world.league, world.league.userId); if (mine && mine.rules) mine.rules = mine.rules.filter((r) => !r.game); }   // instructions for that one game are done with
      world.match = null; world.fixture = null;
      FM.saveLeague(world.league);
      btn.disabled = false; btn.textContent = 'Finish and see the table';
      runInterview('post', fx, result, () => setView('home'));
    }, 40);
  });

  function startMatch() {
    world.skipTo = null;
    const fx = FM.userFixtureToday(world.league);
    if (!fx || fx.played) return;
    world.fixture = fx;
    world.match = FM.startFixture(world.league, fx, { interactive: true });
    world.renderPos.clear(); world.renderBall = null;
    world.running = true; world.speed = 1; world.highlightsOnly = false; world.highlightUntil = 0; world.highlightSearching = false; world.highlightRevealFrom = 0; world.shownEvents = 0; world.lastStats = ''; world.trails = []; world.impacts = []; world.vt = 0; world.commentaryUntil = 0; world.commentaryTurns = {};
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
  const VIEWS = ['home', 'league', 'squad', 'analysis', 'reports', 'news', 'preview', 'match'];
  const NAV = [];
  const SCREEN_TITLES = { home: 'Club overview', league: 'League centre', squad: 'First-team squad', reports: 'Opposition intelligence', news: 'Football world', analysis: 'Performance analysis', preview: 'Match preview' };
  // Lets another page (the Analysis Centre) open one of the tactics pages.
  FM.goToTactics = (tab) => { world.testing = false; world.tab = tab; setView('tactics'); };
  function setView(v) {
    world.view = v;
    document.body.dataset.view = v;
    VIEWS.forEach((k) => { el('view-' + k).hidden = k !== v; });
    el('newGame').hidden = true;
    el('tactics').hidden = !(v === 'tactics' || v === 'match');
    el('nav').hidden = v === 'match';
    VIEWS.forEach((k) => { const section = el('view-' + k); if (section) { if (SCREEN_TITLES[k]) section.dataset.screenTitle = SCREEN_TITLES[k]; else delete section.dataset.screenTitle; } });
    renderTop();
    renderNav();
    renderPrepFlow();
    if (v === 'home') renderHome();
    else if (v === 'league') renderLeague();
    else if (v === 'squad') renderSquad();
    else if (v === 'analysis') FM.renderAnalysis(el('view-analysis'), world.league);
    else if (v === 'reports') FM.renderReports(el('view-reports'), world.league);
    else if (v === 'news') FM.renderNews(el('view-news'), world.league);
    else if (v === 'preview') renderPreview();
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
    const active = world.view === 'analysis' ? 'analysis' : world.view === 'tactics' ? (world.testing ? 'test' : 'prepare') : world.view === 'reports' ? 'evidence' : world.view === 'preview' ? 'preview' : '';
    const steps = [['analysis', 'Analysis'], ['prepare', 'Prepare tactics'], ['test', 'Test phases'], ['evidence', 'Read evidence'], ['preview', 'Match preview']];
    host.hidden = false;
    const max = world.league.prepStep || 0;
    host.innerHTML = steps.map(([k, label], i) => `${i ? '<span class="flow-arrow">›</span>' : ''}<button data-flow="${k}" data-step="${i + 1}" class="${active === k ? 'on' : ''}"${i > max ? ' disabled' : ''}>${label}</button>`).join('');
    host.querySelectorAll('[data-flow]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.flow;
      if (k === 'analysis') { world.league.prepStep = Math.max(world.league.prepStep || 0, 1); saveSoon(); setView('analysis'); }
      else if (k === 'prepare') { world.testing = false; world.tab = 'squad'; world.league.prepPhaseMax = Math.max(world.league.prepPhaseMax || 0, 1); saveSoon(); setView('tactics'); }
      else if (k === 'test') { world.testing = true; world.tab = 'build'; setView('tactics'); }
      else if (k === 'evidence') { world.league.prepStep = Math.max(world.league.prepStep || 0, 4); saveSoon(); setView('reports'); }
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
      <button data-top="news" class="${world.view === 'news' ? 'on' : ''}">News</button>
      <button id="newBtn" title="Abandon this season and start again">New game</button>`;
    host.querySelectorAll('[data-top]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.top)));
    el('newBtn').addEventListener('click', () => {
      if (!confirm('Abandon this season and start a new game?')) return;
      FM.clearSave(); world.league = null; world.match = null; showNewGame();
    });
  }

  function renderPreview() {
    const lg = world.league, host = el('view-preview'), fx = FM.nextUserFixture(lg), me = userTeam();
    if (!fx) { host.innerHTML = '<div class="card"><h2>No fixture to preview</h2></div>'; return; }
    const home = FM.teamById(lg, fx.homeId), away = FM.teamById(lg, fx.awayId), opp = home.id === me.id ? away : home;
    const profile = FM.clubProfile(opp), runs = (lg.labRuns || []).filter((r) => !r.opp || r.opp === opp.name), last = runs[runs.length - 1];
    const result = last && last.result, rate = result && result.beat ? Math.round(result.beat.p * 100) : null;
    const problems = FM.teamProblems(me, opp, (ph) => oppLine(ph));
    const today = FM.userFixtureToday(lg), canPlay = !FM.seasonOver(lg);
    const findings = result ? `${last.n} build-up tests gave a ${rate}% press-beating rate${result.beat.lo != null ? `, with a ${Math.round(result.beat.lo * 100)}–${Math.round(result.beat.hi * 100)}% interval` : ''}.` : 'No phase experiment has been run for this opponent. That is optional—you can still use the current plan.';
    host.innerHTML = `<div class="match-preview">
      <div class="preview-hero"><div class="eyebrow">Round ${fx.round + 1} · ${home.id === me.id ? 'Home' : 'Away'}</div>
        <div class="preview-clubs"><div class="preview-club"><strong>${esc(home.name)}</strong><span>${home.formationKey}</span></div><div class="preview-v">VS</div><div class="preview-club"><strong>${esc(away.name)}</strong><span>${away.formationKey}</span></div></div>
        <div class="preview-actions"><button id="previewTactics">Review tactics</button><button id="previewTest">Run an experiment</button><button class="primary" id="enterMatch"${canPlay ? '' : ' disabled'}>${canPlay ? 'Play match' : 'Season complete'}</button></div></div>
      <div class="preview-grid">
        <div class="card"><h2>Your match plan</h2><p class="fixture-big">${esc(me.formationKey)}</p><p class="desc">${(me.rules || []).filter((r) => !r.off).length} active player or team instruction${(me.rules || []).filter((r) => !r.off).length === 1 ? '' : 's'}.</p><p class="note">${problems.length ? problems.length + ' positional issue' + (problems.length === 1 ? '' : 's') + ' still need attention.' : 'Every phase currently fits together.'}</p></div>
        <div class="card"><h2>Opponent</h2><p class="fixture-big">${esc(opp.name)}</p><p class="desc">${esc(profile.tag || 'Opponent')} · likely ${esc(opp.formationKey)} · ${esc({ balanced:'balanced',possession:'patient in possession',counter:'dangerous in transition',press:'aggressive without the ball',direct:'direct with the ball' }[opp.style] || opp.style)}.</p><button id="previewReport">Open scouting report</button></div>
        <div class="card"><h2>Evidence so far</h2><p class="desc">${findings}</p><p class="note">Experiments inform the decision; they never give the team a hidden bonus.</p></div>
      </div></div>`;
    host.querySelector('#previewTactics').addEventListener('click', () => { world.testing = false; world.tab = 'squad'; setView('tactics'); });
    host.querySelector('#previewTest').addEventListener('click', () => { world.testing = true; world.tab = 'build'; setView('tactics'); });
    host.querySelector('#previewReport').addEventListener('click', () => setView('reports'));
    host.querySelector('#enterMatch').addEventListener('click', () => {
      if (!canPlay) return;
      let guard = 0; while (!FM.userFixtureToday(lg) && !FM.seasonOver(lg) && guard++ < 8) FM.advanceDay(lg);
      FM.saveLeague(lg); beginPreMatchInterview();
    });
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
  function renderSquad() {
    const team = userTeam(), host = el('view-squad');
    const onPitch = team.players.slice().sort((a, b) => a.index - b.index);
    const all = onPitch.concat(team.bench);
    const row = (p) => `<tr class="player-row" data-player="${p.id}" tabindex="0"><td>${portraitCache[p.id] ? `<img class="squad-thumb" src="${portraitCache[p.id]}" alt="">` : `<span class="squad-thumb fallback">${esc(p.name.split(/\s+/).map((x) => x[0]).slice(0, 2).join(''))}</span>`}</td><td class="l">${p.number}</td><td class="l"><button class="player-link" data-player="${p.id}">${esc(p.name)}</button></td><td class="l">${esc(p.nation)}</td><td class="l">${p.natural}</td><td class="l">${p.slotKey ? p.slotKey : 'Bench'}</td><td class="l">${{ right: 'Right', left: 'Left', both: 'Both' }[p.foot] || ''}</td><td>${p.height || '-'}</td><td class="${condClass(p)}">${Math.round(100 * FM.conditionOf(p))}%</td><td class="l ${FM.isInjured(p) ? 'out' : ''}">${FM.isInjured(p) ? esc(injuryText(p)) : 'Fit'}</td>
      <td><b>${FM.playerRating(p).toFixed(1)}</b></td><td>${FM.shown(p.ratings.pace)}</td><td>${FM.shown(p.ratings.dribbling)}</td><td>${FM.shown(p.ratings.passing)}</td><td>${FM.shown(p.ratings.finishing)}</td><td>${FM.shown(p.ratings.tackling)}</td><td>${FM.shown(p.ratings.heading)}</td><td>${FM.shown(p.ratings.composure)}</td><td>${p.ratings.stamina ? FM.shown(p.ratings.stamina) : '-'}</td><td>${p.natural === 'GK' ? FM.shown(p.ratings.gk) : '-'}</td>
      <td>${p.stats.apps}</td><td>${p.stats.goals}</td><td>${p.stats.shots}</td><td>${p.stats.yellows}</td><td>${p.stats.reds}</td></tr>`;
    const selected = all.find((p) => p.id === world.profilePlayerId) || all[0];
    const missingPortraits = team.name === 'Ashford Rovers' ? all.filter((p) => !portraitCache[p.id]) : [];
    host.innerHTML = `<div id="playerProfile"></div><div class="card"><div class="row" style="justify-content:space-between"><h2>${esc(team.name)}: squad of ${all.length}</h2>${team.name === 'Ashford Rovers' ? `<button id="makeSquadPortraits"${missingPortraits.length ? '' : ' disabled'}>${missingPortraits.length ? `Create ${missingPortraits.length} squad portrait${missingPortraits.length === 1 ? '' : 's'}` : 'All squad portraits created'}</button>` : ''}</div><p class="note" id="portraitProgress">${missingPortraits.length ? 'Portraits are generated one player at a time and completed players are kept if the process is interrupted.' : 'Every player has his club portrait.'}</p>
      <div class="tablewrap"><table class="data"><thead><tr><th>Player</th><th class="l">#</th><th class="l">Name</th><th class="l">Nation</th><th class="l">Pos</th><th class="l">Now</th><th class="l">Foot</th><th title="Height in cm. Taller players are better in the air.">Ht</th><th>Cond</th><th class="l">Fitness</th><th title="Overall rating out of 10 in his natural position">Rating</th><th>Pac</th><th>Dri</th><th>Pas</th><th>Fin</th><th>Tck</th><th>Hea</th><th>Com</th><th>Sta</th><th>GK</th><th>Apps</th><th>Goals</th><th>Shots</th><th>YC</th><th>RC</th></tr></thead><tbody>${all.map(row).join('')}</tbody></table></div>
      </div>`;
    const open = (id) => { world.profilePlayerId = id; renderSquad(); };
    host.querySelectorAll('[data-player]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); open(b.dataset.player); }));
    const squadBtn = host.querySelector('#makeSquadPortraits');
    if (squadBtn && missingPortraits.length) squadBtn.addEventListener('click', async () => {
      squadBtn.disabled = true;
      const progress = host.querySelector('#portraitProgress'); let made = 0, failed = 0; const requestTimes = [];
      for (const player of missingPortraits) {
        while (requestTimes.length && Date.now() - requestTimes[0] > 61000) requestTimes.shift();
        if (requestTimes.length >= 9) {
          const wait = Math.max(0, 61500 - (Date.now() - requestTimes[0]));
          progress.textContent = `Keeping the image service steady… ${made + failed} of ${missingPortraits.length} complete`;
          await new Promise((resolve) => setTimeout(resolve, wait));
          while (requestTimes.length && Date.now() - requestTimes[0] > 61000) requestTimes.shift();
        }
        progress.textContent = `Creating ${player.name}… ${made + failed + 1} of ${missingPortraits.length}`;
        requestTimes.push(Date.now());
        try { await createFootballPortrait(player); made++; } catch (e) { failed++; }
      }
      renderSquad();
      const done = el('view-squad').querySelector('#portraitProgress');
      if (done && failed) done.textContent = `${made} portrait${made === 1 ? '' : 's'} created. ${failed} could not be created; use the button to retry only those players.`;
    });
    renderPlayerProfile(team, selected, host.querySelector('#playerProfile'));
    ensurePortraitsLoaded(all);
  }

  const PORTRAIT_STORE = 'lm_football_ashford_portraits_v2';
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
  async function savedPortrait(id, image) {
    portraitCache[id] = image;
    const db = await portraitDb(); if (!db) return;
    await new Promise((resolve) => { const tx = db.transaction('portraits', 'readwrite'); tx.objectStore('portraits').put(image, id); tx.oncomplete = resolve; tx.onerror = resolve; });
  }
  async function ensurePortraitsLoaded(players) {
    if (world.portraitsLoaded || world.portraitsLoading) return;
    world.portraitsLoading = true;
    const db = await portraitDb();
    if (db) for (const p of players) if (!portraitCache[p.id]) await new Promise((resolve) => { const req = db.transaction('portraits').objectStore('portraits').get(p.id); req.onsuccess = () => { if (req.result) portraitCache[p.id] = req.result; resolve(); }; req.onerror = resolve; });
    world.portraitsLoaded = true; world.portraitsLoading = false;
    if (world.view === 'squad') renderSquad();
  }
  function footballPortraitDescription(p) {
    const h = p.height || 180, build = h >= 190 ? 'very tall, long-limbed and powerfully athletic' : h >= 184 ? 'tall and strongly athletic' : h <= 174 ? 'shorter, compact and lean athletic' : 'medium-height, lean and athletic';
    const role = { GK: 'goalkeeper with a broad upper-body build', CB: 'centre-back with a strong physical build', FB: 'full-back with a lean endurance-athlete build', DM: 'defensive midfielder with a sturdy athletic build', CM: 'central midfielder with a balanced athletic build', AM: 'attacking midfielder with a light agile build', WF: 'wide forward with a lean fast-sprinter build', ST: 'striker with a powerful athletic build' }[p.natural] || 'professional footballer';
    return `${p.name}, an entirely fictional adult male professional footballer from ${p.nation}, age ${20 + (p.number % 14)}, exactly ${h} cm tall, ${build}, a ${role}. His face, hair and complexion should plausibly and respectfully reflect ${p.nation} heritage without caricature. Unique natural facial features. Ashford Rovers media day.`;
  }
  async function createFootballPortrait(p) {
    const data = await FM.api('/playtest/football-portrait', { description: footballPortraitDescription(p) });
    if (!data.image) throw new Error('No portrait was returned.');
    await savedPortrait(p.id, data.image); return data.image;
  }
  function portraitFallback(p) { return `<div class="player-portrait fallback">${esc(p.name.split(/\s+/).map((x) => x[0]).slice(0, 2).join(''))}</div>`; }
  function renderPlayerProfile(team, p, host) {
    if (!p || !host) return;
    const ashford = team.name === 'Ashford Rovers', image = ashford && portraitCache[p.id];
    const ratings = [['Pace',p.ratings.pace],['Dribbling',p.ratings.dribbling],['Passing',p.ratings.passing],['Finishing',p.ratings.finishing],['Tackling',p.ratings.tackling],['Heading',p.ratings.heading],['Composure',p.ratings.composure],['Stamina',p.ratings.stamina],['Goalkeeping',p.ratings.gk]].filter((x) => x[1] != null);
    host.innerHTML = `<article class="player-profile card"><div id="profilePortrait">${image ? `<img class="player-portrait" src="${image}" alt="Portrait of ${esc(p.name)}">` : portraitFallback(p)}</div><div><span class="eyebrow">${esc(team.name)} · #${p.number}</span><h2 class="profile-name">${esc(p.name)}</h2><p class="desc">${esc(p.nation)} · ${p.natural} · ${p.height || '—'} cm · ${p.foot || '—'} foot</p><div class="profile-stats"><b>${FM.playerRating(p).toFixed(1)}<small>Overall</small></b><b>${Math.round(100 * FM.conditionOf(p))}%<small>Condition</small></b><b>${p.stats.apps}<small>Apps</small></b><b>${p.stats.goals}<small>Goals</small></b></div>${ashford && !image ? '<button id="makePortrait">Create player portrait</button>' : ''}</div><div class="attribute-grid">${ratings.map(([n,v]) => `<div><span>${n}</span><b>${FM.shown(v)}</b><i style="--v:${v}%"></i></div>`).join('')}</div></article>`;
    const btn = host.querySelector('#makePortrait'); if (!btn) return;
    btn.addEventListener('click', async () => {
      btn.disabled = true; btn.textContent = 'Creating portrait…';
      try {
        await createFootballPortrait(p);
        renderPlayerProfile(team, p, host);
      } catch (e) { btn.disabled = false; btn.textContent = 'Try portrait again'; btn.insertAdjacentHTML('afterend', `<p class="err">${esc(e.message)}</p>`); }
    });
  }

  // ---------- the tactics page ----------
  // One page, used on any preparation day and again when the match is paused. Changes apply to the rest of the match.
  const PREP_TABS = [
    ['squad', '1. Squad and formation'], ['build', '2. Build-up'], ['midfield', '3. Play through midfield'], ['final', '4. Final third'],
    ['transdef', '5. Defensive transition'], ['organised', '6. Organised defending'], ['transatt', '7. Attacking transition'], ['setpieces', 'Set pieces'],
  ];
  const TEST_TABS = [['build','Build-up'],['midfield','Midfield'],['final','Final third'],['organised','Organised defending'],['transdef','Defensive transition'],['transatt','Attacking transition']];
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
      { key: 'build', title: '1. The start: a goal kick', note: 'Where everyone stands before the ball is played, and where the ball is.' },
      { key: 'buildEnd', title: '2. Building out: the ball reaches midfield', note: 'Where the team gets to as it plays out. This is where the next page starts.' },
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
  function mountPair(host, team, tab) {
    const pair = BOARD_PAIRS[tab];
    host.innerHTML = `<div class="board-pair">${pair.map((d, i) => `<figure class="bp${d.locked ? ' locked' : ''}"><figcaption><b>${esc(d.title)}</b><span class="note">${esc(d.note)}</span></figcaption><div class="board-host" id="board${i}"></div>${d.locked ? '' : `<div class="row"><button data-reset="${d.key}">Reset this diagram</button></div>`}</figure>`).join('')}</div>`;
    const draw = () => pair.forEach((d, i) => drawBoard(host.querySelector('#board' + i), team, d.key, { locked: !!d.locked }));
    draw();
    host.querySelectorAll('[data-reset]').forEach((b) => b.addEventListener('click', () => { FM.clearPhase(team, b.dataset.reset); if (team.phaseBall) delete team.phaseBall[b.dataset.reset]; saveSoon(); renderTactics(); }));
    world.redrawBoards = draw;
  }
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
    return { id: 'plan-' + Date.now(), name, savedAt: Date.now(), formationKey: team.formationKey,
      tactics: JSON.parse(JSON.stringify(team.tactics)), shape: JSON.parse(JSON.stringify(team.shape || {})), phasePos: JSON.parse(JSON.stringify(team.phasePos || {})), phaseBall: JSON.parse(JSON.stringify(team.phaseBall || {})), rules: JSON.parse(JSON.stringify(team.rules || [])),
      players: team.players.map((p) => ({ id: p.id, roleId: p.roleId, options: JSON.parse(JSON.stringify(p.options || {})), instr: JSON.parse(JSON.stringify(p.instr || {})) })) };
  }
  function restorePlan(team, plan) {
    if (!plan) return;
    if (plan.formationKey !== team.formationKey) FM.setFormation(team, plan.formationKey);
    team.tactics = Object.assign(FM.defaultTactics(), JSON.parse(JSON.stringify(plan.tactics || {})));
    team.shape = JSON.parse(JSON.stringify(plan.shape || {})); team.phasePos = JSON.parse(JSON.stringify(plan.phasePos || {})); team.phaseBall = JSON.parse(JSON.stringify(plan.phaseBall || {})); team.rules = JSON.parse(JSON.stringify(plan.rules || []));
    (plan.players || []).forEach((saved) => { const p = team.players.find((x) => x.id === saved.id); if (p) { if (saved.roleId && FM.ROLES[saved.roleId]) p.roleId = saved.roleId; p.options = JSON.parse(JSON.stringify(saved.options || {})); p.instr = JSON.parse(JSON.stringify(saved.instr || {})); } });
  }
  function renderPlanBar(team) {
    const host = el('planBar'), plans = world.league.tacticalPlans = world.league.tacticalPlans || [];
    host.innerHTML = `<select id="planSelect" aria-label="Saved tactical plans"><option value="">Saved match plans</option>${plans.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select><button id="savePlan">Save current plan</button><button id="loadPlan" disabled>Restore</button><button id="deletePlan" disabled>Delete</button>`;
    const select = host.querySelector('#planSelect'), sync = () => { const yes = !!select.value; host.querySelector('#loadPlan').disabled = !yes; host.querySelector('#deletePlan').disabled = !yes; };
    select.addEventListener('change', sync);
    host.querySelector('#savePlan').addEventListener('click', () => { const name = prompt('Name this tactical plan:', 'Plan ' + (plans.length + 1)); if (!name || !name.trim()) return; plans.push(capturePlan(team, name.trim())); saveSoon(); renderTactics(); });
    host.querySelector('#loadPlan').addEventListener('click', () => { const plan = plans.find((p) => p.id === select.value); if (!plan) return; restorePlan(team, plan); world.selSlot = null; saveSoon(); renderTactics(); });
    host.querySelector('#deletePlan').addEventListener('click', () => { const plan = plans.find((p) => p.id === select.value); if (!plan || !confirm('Delete the saved plan “' + plan.name + '”?')) return; world.league.tacticalPlans = plans.filter((p) => p.id !== plan.id); saveSoon(); renderTactics(); });
  }

  function renderTactics() {
    if (!world.league) return;
    const team = userTeam();
    if (FM.inferShapeTactics) FM.inferShapeTactics(team);
    renderPlanBar(team);
    el('subInfo').textContent = '';
    el('subInfo').hidden = true;
    const tabs = world.testing ? TEST_TABS : PREP_TABS;
    const progressKey = world.testing ? 'testPhaseMax' : 'prepPhaseMax', maxPhase = world.league[progressKey] || 0;
    // A step you have visited and moved on from turns green.
    // In the testing phase every test is open at once (they are largely the same statistical work, so only one has to be done), and a test you have
    // run turns green.
    const testRuns = (k) => (k === 'build' ? (world.league.labRuns || []) : ((world.league.phaseLabRuns || {})[k] || [])).length > 0;
    el('tabs').innerHTML = tabs.map(([k, label], i) => world.testing
      ? `<button data-tab="${k}" data-phase-index="${i}" class="${world.tab === k ? 'on' : (testRuns(k) ? 'done' : '')}">${label}</button>`
      : `<button data-tab="${k}" data-phase-index="${i}" class="${world.tab === k ? 'on' : (i < maxPhase ? 'done' : '')}"${i > maxPhase ? ' disabled' : ''}>${label}</button>`).join('');
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
    else renderBoardTab(team, world.tab);
  }

  function renderTransitionTab(team, tab) {
    const host = el('tabBody'), defensive = tab === 'transdef', key = defensive ? 'transDefChoices' : 'transAttChoices';
    const zones = [['defensive','Defensive third'],['middle','Middle third'],['attacking','Attacking third']];
    const options = defensive
      ? [['counterpress','Counterpress'],['contain','Delay and contain'],['regroup','Regroup']]
      : [['counter','Counter quickly'],['secure','Secure possession'],['reset','Reset the attack']];
    const fallback = defensive ? 'contain' : 'secure';
    team.tactics[key] = team.tactics[key] || {};
    host.innerHTML = `<div class="card transition-plan"><span class="eyebrow">${defensive ? 'Lost the ball in…' : 'Won the ball in…'}</span><h2>${defensive ? 'Defensive transition' : 'Attacking transition'}</h2><p class="desc">Choose the first response in each part of the pitch, and place the team at the moment it happens and a few seconds on. The instructions decide the rest.</p><div id="transPair"></div><div class="transition-zones">${zones.map(([z,n]) => `<label><b>${n}</b><select data-zone="${z}">${options.map(([v,l]) => `<option value="${v}"${(team.tactics[key][z] || fallback) === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>`).join('')}</div><div id="phaseInstr"></div></div>`;
    host.querySelectorAll('[data-zone]').forEach((s) => s.addEventListener('change', () => { team.tactics[key][s.dataset.zone] = s.value; saveSoon(); }));
    mountPair(host.querySelector('#transPair'), team, tab);
    FM.renderInstructions(host.querySelector('#phaseInstr'), team, { save: saveSoon, opp: nextOpponent, changed: () => FM.elena.refresh() }, { stage: defensive ? 'transDef' : 'transAtt' });
    FM.elena.sync({ mode: 'tactics', tab, key: defensive ? 'transDef' : 'transAtt', team, opp: nextOpponent(), stage: defensive ? 'transDef' : 'transAtt' });
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
    if (testsDoneCount() > 0 && last) return '<button id="labToEvidence">Read the evidence</button>';
    return last ? '<button id="labSkip" disabled title="Do at least one test before moving on">Skip</button>' : '<button id="labSkip">' + (testsDoneCount() > 0 ? 'Next test' : 'Skip this test') + '</button>';
  }
  function skipNote(phase) {
    const n = testsDoneCount();
    return '<p class="note">' + (n === 0 ? 'You do not have to do every test, because they are largely the same statistical work. Do at least one, then you can skip the rest and read the evidence.' : 'You have completed ' + n + ' test' + (n === 1 ? '' : 's') + ', so you can skip any others and read the evidence whenever you like.') + (n > 0 ? ' <button class="linkbtn" id="labToEvidence2">Read the evidence now</button>' : '') + '</p>';
  }
  function renderLab(team, host, phase) {
    phase = phase || 'build';
    const lg = world.league, opp = nextOpponent(); if (!lg || !opp) { host.innerHTML = ''; if (FM.elena) FM.elena.hide(); return; }
    lg.labRuns = lg.labRuns || []; lg.phaseLabRuns = lg.phaseLabRuns || {};
    const reverse = phase === 'organised' || phase === 'transdef';
    const title = { build: 'Test the build-up', midfield: 'Test playing through midfield', final: 'Test the final third', organised: 'Test organised defending', transdef: 'Test the defensive transition', transatt: 'Test the attacking transition' }[phase];
    const target = { build: 'goal-kick build-ups that reach midfield', midfield: 'moves that play through midfield', final: 'attacks that produce a shot', organised: 'opposition attacks stopped without a shot', transdef: 'attacks stopped after losing the ball', transatt: 'ball wins that produce a shot' }[phase];
    const runs = phase === 'build' ? lg.labRuns : (lg.phaseLabRuns[phase] = lg.phaseLabRuns[phase] || []);
    world.phaseLabs = world.phaseLabs || {};
    const st = world.phaseLabs[phase] = world.phaseLabs[phase] || { start: 'keeper', n: 100, pred: '', hyp: '', busy: false, prog: 0, a: null, b: null, err: '' };
    const last = runs[runs.length - 1];
    const cmpRuns = runs.length >= 2 ? runs : [];
    const a = st.a != null && runs[st.a] ? st.a : Math.max(0, runs.length - 2), b = st.b != null && runs[st.b] ? st.b : runs.length - 1;
    host.innerHTML = `<div class="lab">
      <h2>${title}</h2>
      <div class="two"><label>Scenario<select id="labStart">${phase === 'final' || phase === 'transatt' ? '<option value="attack">An attack entering the final third</option>' : phase === 'organised' || phase === 'transdef' ? '<option value="defend">The opposition attack your goal</option>' : `<option value="goalkick">A goal kick, played short</option>`}</select></label>
        <label>Number of tests<select id="labN">${[100, 400, 1000].map((n) => `<option value="${n}"${st.n === n ? ' selected' : ''}>${n}</option>`).join('')}</select></label></div>
      <label>Before you run it: what share will succeed? (${target}, %)<input type="number" id="labPred" min="0" max="100" step="1" value="${esc(st.pred)}" placeholder="e.g. 60"></label>
      ${runs.length ? `<label>What are you changing, and what do you expect to happen?<textarea id="labHyp" placeholder="Write one clear tactical change and the effect you expect in this phase.">${esc(st.hyp)}</textarea></label>` : ''}
      <div class="row"><button class="primary" id="labRun"${st.busy ? ' disabled' : ''}>${st.busy ? (st.planning ? 'Their manager is preparing…' : 'Running… ' + st.prog + ' of ' + st.n) : 'Run ' + st.n + ' tests'}</button>${skipHtml(phase, st)}</div>
      ${skipNote(phase)}
      <p class="err">${esc(st.err)}</p>
      ${last ? phaseResultHtml(phase, last.result) + `<p class="note">Run ${runs.length} is done. Change one tactical choice, write your expectation above, then test again.</p>${phaseHistoryHtml(phase, runs)}` : ''}
    </div>`;
    const q = (id) => host.querySelector(id);
    q('#labStart').addEventListener('change', (e) => { st.start = e.target.value; });
    const goEvidence = () => { world.league.prepStep = Math.max(world.league.prepStep || 0, 4); saveSoon(); setView('reports'); };
    if (q('#labSkip')) q('#labSkip').addEventListener('click', () => { const i = TEST_TABS.findIndex(([k]) => k === phase); world.tab = TEST_TABS[Math.min(TEST_TABS.length - 1, i + 1)][0]; renderTactics(); });
    if (q('#labToEvidence')) q('#labToEvidence').addEventListener('click', goEvidence);
    if (q('#labToEvidence2')) q('#labToEvidence2').addEventListener('click', goEvidence);
    q('#labN').addEventListener('change', (e) => { st.n = +e.target.value; renderLab(team, host, phase); });
    q('#labPred').addEventListener('input', (e) => { st.pred = e.target.value; });
    if (q('#labHyp')) q('#labHyp').addEventListener('input', (e) => { st.hyp = e.target.value; });
    q('#labRun').addEventListener('click', async () => {
      if (st.busy) return;
      st.busy = true; st.prog = 0; st.err = ''; st.planning = true; renderLab(team, host, phase);
      let oppPlan = null; try { oppPlan = await FM.scout.labPlan(lg, team, opp); } catch (e) { oppPlan = FM.scout.plan1(FM.scout.profile(lg)); }
      st.planning = false;
      const snap = FM.lab.snapshot(team), pred = st.pred === '' ? '' : Math.max(0, Math.min(100, +st.pred));
      try {
        const attackTest = ['final','transatt','organised','transdef'].includes(phase);
        const result = await FM.lab.run(lg, { n: st.n, phase: attackTest ? 'final' : 'build', user: reverse ? opp : team, opp: reverse ? team : opp, start: st.start, record: true, oppRules: reverse ? (team.rules || []) : oppPlan.rules, oppNudge: reverse ? {} : oppPlan.tactics }, (d) => { st.prog = d; const b2 = host.querySelector('#labRun'); if (b2) b2.textContent = 'Running… ' + d + ' of ' + st.n; });
        runs.push({ id: phase[0] + 'r' + (runs.length + 1), phase, oppPlan: { source: oppPlan.source, rationale: oppPlan.rationale, scouted: oppPlan.scouted, note: oppPlan.note || '', rules: FM.scout.describe(oppPlan.rules, opp, team) }, n: st.n, start: st.start, opp: opp.name, pred, hyp: st.hyp, snap, changes: FM.lab.changes(last && last.snap, snap), result });
        runs.forEach((r, i) => { if (i < runs.length - 2 && r.result) delete r.result.clips; });
        st.a = Math.max(0, runs.length - 2); st.b = runs.length - 1; st.pred = ''; st.hyp = ''; saveSoon();
        const phaseIndex = TEST_TABS.findIndex(([k]) => k === phase);
        if (phaseIndex >= 0) {
          lg.testPhaseMax = Math.max(lg.testPhaseMax || 0, phaseIndex + 1);
          lg.prepStep = Math.max(lg.prepStep || 0, 3);     // one completed test is enough to go on and read the evidence
          renderTactics(); renderPrepFlow();
        }
      } catch (err) { st.err = 'The test could not run: ' + (err && err.message ? err.message : 'unknown error'); }
      st.busy = false;
      if (document.body.contains(host)) renderLab(team, host, phase);
    });
    let tac = null; try { tac = FM.aiTacticsFor(lg, opp, team); } catch (e) { tac = null; }
    const setCompare = (x, y) => { st.a = x; st.b = y; renderLab(team, host, phase); };
    const clearRuns = () => { if (phase === 'build') lg.labRuns = []; else lg.phaseLabRuns[phase] = []; st.a = st.b = null; saveSoon(); renderLab(team, host, phase); };
    if (phase === 'build') FM.elena.sync({ opp, runs, a, b, st, team, tac, setCompare, clearRuns, instrStage: 'build' });
    else FM.elena.sync({ mode: 'instr', stage: phase, team, opp });
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
    FM.elena.sync({ mode: 'tactics', tab: 'setpieces', key: 'setpieces', team, opp: nextOpponent(), stage: null });
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
    const scaleText = 'font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="rgba(255,255,255,.9)" stroke="rgba(0,0,0,.72)" stroke-width="3" style="paint-order:stroke;pointer-events:none"';
    s += '<g aria-hidden="true">';
    [0, 17, 34, 51, 68].forEach((m) => { const x = m * S; s += `<line x1="${x}" y1="${BH}" x2="${x}" y2="${BH + 8}" stroke="rgba(255,255,255,.75)" stroke-width="2"/><text x="${x}" y="${BH + 24}" text-anchor="middle" ${scaleText}>${m}m</text>`; });
    [0, 25, 50, 75, 100, 105].forEach((m) => { const y = BH - m * S, yy = Math.max(13, Math.min(BH - 5, y + 4)); s += `<line x1="0" y1="${y}" x2="9" y2="${y}" stroke="rgba(255,255,255,.75)" stroke-width="2"/><text x="12" y="${yy}" text-anchor="start" ${scaleText}>${m}m</text>`; });
    s += '</g>';
    return s;
  }

  // When you are in one phase, the opposition are in the one that answers it.
  const OPP_PHASE = { build: 'press', buildEnd: 'press', midfield: 'without', final: 'without', press: 'build', without: 'final', withoutEnd: 'final' };
  function nextOpponent() {
    const lg = world.league, nx = lg && FM.nextUserFixture(lg);
    return nx ? FM.teamById(lg, nx.homeId === lg.userId ? nx.awayId : nx.homeId) : null;
  }
  // The offside line as drawn: where the deepest outfield player of the opposition shirts on the board stands (their moved positions
  // included), in the team's own space. Null when the opposition are not shown, and the editor falls back to their usual defending shape.
  // 'live' puts one shirt at a position it is being dragged to.
  function oppLine(key, live) {
    if (key === 'shape') return null;                // the line follows their scouted defence whether or not their shirts are shown
    const sc = scoutFor(), cells = sc && sc.shape.phases[OPP_PHASE[key]];
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
  function scoutFor() {
    const opp = nextOpponent();
    if (!opp) return null;
    const shape = FM.scoutedShape(world.league, opp.id);
    return shape ? { opp, shape } : null;
  }

  function drawBoard(host, team, key, opts) {
    const locked = !!(opts && opts.locked);
    const selected = world.selSlot && team.players.includes(world.selSlot) ? world.selSlot : null;
    const posOf = (p) => (key === 'shape' ? FM.slotBase(team, p) : FM.phasePos(team, p, key));
    let ghosts = '';
    if (selected && key !== 'shape') {
      // The sideways limit still applies when dragging (see FM.clampToReach); nothing is drawn for it.
    }
    // The next opponent as scouted: where their players have stood in the phase that answers this one (when you build, they press).
    let opp = '';
    const sc = key !== 'shape' ? scoutFor() : null;
    if (sc && sc.shape.phases[OPP_PHASE[key]]) {
      const cells = sc.shape.phases[OPP_PHASE[key]];
      const kit = FM.kitAgainst(sc.opp, FM.teamById(world.league, world.league.userId));
      // Their shirts can be dragged to try out "what if they stood here". These moves are only for looking at, not saved, and the
      // button under the board puts them back where they were scouted.
      const moved = (world.oppMoved && world.oppMoved[key]) || {};
      opp = '<g>' + Object.keys(cells).map((slot) => {
        const c = moved[slot] || cells[slot], pt = bpt({ d: 1 - c.d, w: 1 - c.w });
        const player = sc.opp.players.find((p) => p.slotKey === slot), name = player ? boardName(player) : slot;
        return `<g class="odot" data-slot="${slot}" transform="translate(${pt.x.toFixed(1)},${pt.y.toFixed(1)})"><circle r="19" fill="${kit.shirt}" fill-opacity="0.9" stroke="${kit.number}" stroke-width="2.5" stroke-dasharray="4 3"/><text y="4.5" text-anchor="middle" font-size="12.5" font-weight="700" fill="${kit.number}" style="pointer-events:none">${player ? player.number : slot}</text><text y="39" text-anchor="middle" font-size="14" font-weight="700" fill="#fff" stroke="#000" stroke-width="3.5" style="paint-order:stroke">${esc(name)}</text>${moved[slot] ? '<circle cx="14" cy="-14" r="5" fill="#F2C14E" stroke="#1A232D" stroke-width="1.5"/>' : ''}</g>`;
      }).join('') + '</g>';
    }
    // With the ball, nobody can stand beyond the opposition's second-last defender: show that line, which moves with their defensive line.
    let offLine = '';
    const opp0 = nextOpponent();
    if (key !== 'shape' && opp0 && FM.OFFSIDE_PHASES.indexOf(key) >= 0) {
      const y = (1 - FM.offsideLimit(opp0, null, oppLine(key))) * BH;
      offLine = `<g class="offline" style="pointer-events:none"><line x1="0" y1="${y.toFixed(1)}" x2="${BW}" y2="${y.toFixed(1)}" stroke="#FF6B5A" stroke-width="2.5" stroke-dasharray="3 7" stroke-opacity="0.9"/><text x="6" y="${(y - 6).toFixed(1)}" font-size="14" fill="#fff" stroke="#000" stroke-width="3" style="paint-order:stroke">Offside line (${esc(opp0.name)}'s deepest defender)</text></g>`;
    }
    let ball = '';
    if (key !== 'shape') {
      const bp = bpt(FM.phaseBall(team, key));
      ball = `<g class="ball" transform="translate(${bp.x.toFixed(1)},${bp.y.toFixed(1)})"><circle r="16" fill="#fff" stroke="#111" stroke-width="3"/><circle r="6" fill="#111"/><text y="36" text-anchor="middle" font-size="15" fill="#fff" stroke="#000" stroke-width="3.5" style="paint-order:stroke">ball</text></g>`;
    }
    const dots = team.players.map((p) => {
      const pt = bpt(posOf(p)), sel = selected === p;
      const manual = key === 'shape' ? !!(team.shape && team.shape[p.index]) : FM.isManual(team, p, key);
      return `<g class="dot" data-idx="${p.index}" transform="translate(${pt.x.toFixed(1)},${pt.y.toFixed(1)})">
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
    if (['build', 'buildEnd', 'midfield', 'final', 'transAtt', 'transAttEnd'].indexOf(key) >= 0) {
      const width = Math.min(.94, .58 * team.tactics.attackWidth), x1 = BW * (.5 - width/2), x2 = BW * (.5 + width/2);
      guides += `<g class="tactic-guide width"><line x1="${x1}" y1="30" x2="${x1}" y2="${BH-30}"/><line x1="${x2}" y1="30" x2="${x2}" y2="${BH-30}"/><text x="${BW/2}" y="24" text-anchor="middle">Attacking width</text></g>`;
    }
    host.innerHTML = `<svg class="board${key === 'shape' ? ' short' : ''}${locked ? ' locked' : ''}" viewBox="-24 -30 ${BW + 48} ${BH + 92}" role="img" aria-label="Tactics board">${boardPitchSvg(key)}${guides}${ghosts}${offLine}${opp}${dots}${ball}</svg>`;
    const svg = host.firstChild;
    const toPos = (e) => {
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
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
      if (dragBall) { if (dragBall.pos) { FM.setPhaseBall(team, key, { d: dragBall.pos.d, w: dragBall.pos.w }); saveSoon(); } dragBall = null; renderTactics(); return; }
      if (!drag) return;
      const d = drag; drag = null;
      if (d.opp) {
        if (d.moved && d.pos) { world.oppMoved = world.oppMoved || {}; (world.oppMoved[key] = world.oppMoved[key] || {})[d.slot] = { d: 1 - d.pos.d, w: 1 - d.pos.w }; renderTactics(); }
        return;
      }
      if (!d.moved && world.selBench) { host.dispatchEvent(new CustomEvent('sub', { detail: { idx: d.p.index, id: world.selBench.id } })); return; }
      world.selBench = null;
      if (key === 'shape') {
        // The only thing a drag does here is swap two players: drop one shirt on another. Dropped anywhere else, it springs back.
        // A plain click only selects a player, and clicking the same player again lets go of him.
        if (d.moved) {
          const q = toPos(e);
          const other = team.players.find((x) => { if (x === d.p) return false; const o = bpt(FM.slotBase(team, x)); return Math.hypot(o.x - q.x, o.y - q.y) < 34; });
          if (other) { FM.swapSlots(team, d.p, other); FM.fixSlot(team, d.p); FM.fixSlot(team, other); world.selSlot = null; saveSoon(); }
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
      renderTactics();
    });
    // a bench player dragged from the list onto a shirt is a substitution
  }
  const clamp01 = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function renderBoardTab(team, tab) {
    const host = el('tabBody'), key = BOARD_KEY[tab], isShape = key === 'shape';
    const bench = team.bench.map((p) => `
      <button class="chip${world.selBench === p ? ' sel' : ''}" data-bench="${p.id}">
        <span class="num" style="${KITNUM(team)}">${p.number}</span><span>${p.natural} ${esc(shortName(p))}</span><span class="meta ${FM.isInjured(p) ? 'out' : FM.conditionOf(p) < 0.6 ? 'low' : ''}">${FM.ratingText(p)} · ${FM.isInjured(p) ? 'injured' : Math.round(100 * FM.conditionOf(p)) + '%'}</span>
      </button>`).join('');
    const pair = BOARD_PAIRS[tab];
    host.innerHTML = `
      <div class="tb-grid${pair ? ' tb-pair' : ''}">
        <aside class="tb-controls">
          ${isShape ? `<label>Formation<select id="formSel">${Object.keys(FM.FORMATIONS).map((k) => `<option value="${k}"${k === team.formationKey ? ' selected' : ''}>${k}</option>`).join('')}</select></label>` : ((world.oppMoved && world.oppMoved[key] && Object.keys(world.oppMoved[key]).length) ? '<button class="phase-report-reset" id="oppReset">Reset their shirts to the scouted positions</button>' : '')}
          ${tab === 'organised' ? '<div class="block-presets"><b>Defensive block</b><button data-block="low">Low block</button><button data-block="mid">Mid block</button><button data-block="high">High press</button></div>' : ''}
          <div id="phaseSliders"></div>
        </aside>
        <div class="tb-left">
          <h2>${isShape ? 'Team shape' : (PAIR_TITLE[tab] || FM.PHASE_NAMES[key])}</h2>
          ${pair ? '<div id="pairHost"></div>' : '<div id="board"></div>'}
          ${pair ? '' : `<div class="row"><button id="resetPhase">${isShape ? 'Reset the shape to the formation' : 'Reset this phase to its default positions'}</button></div>`}
          <p class="err" id="subErr"></p>
        </div>
        <div class="tb-right">
          ${isShape ? '' : '<div id="phaseInstr"></div>'}
          ${isShape ? `<div><h2 style="margin-bottom:8px">Bench</h2><div class="bench" id="bench">${bench}</div><p class="note" style="margin-top:8px">To substitute, click a bench player and then click the shirt he replaces.</p></div>` : ''}
          <div id="playerPanel"></div>
          <div id="warnPanel"></div>
        </div>
      </div>`;
    const board = host.querySelector('#board') || host.querySelector('#pairHost');
    if (pair) mountPair(host.querySelector('#pairHost'), team, tab); else drawBoard(board, team, key);
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
      // The big instruction box for this stage of play, and the assistant's drawing and review of the instructions.
      const hooks = { save: saveSoon, opp: nextOpponent, changed: () => FM.elena.refresh(), afterAdd: () => { FM.elena.refresh(); FM.elena.review(); } };
      FM.renderInstructions(host.querySelector('#phaseInstr'), team, hooks, { stage: key });
    }
    FM.elena.sync({ mode: 'tactics', tab, key, team, opp: nextOpponent(), stage: isShape ? null : key });
    const err = (msg) => { host.querySelector('#subErr').textContent = msg || ''; };
    if (isShape) host.querySelector('#formSel').addEventListener('change', (e) => { FM.setFormation(team, e.target.value); world.selSlot = null; saveSoon(); renderTactics(); });
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
      b.addEventListener('click', () => { const p = team.bench.find((x) => x.id === b.dataset.bench); world.selBench = world.selBench === p ? null : p; renderTactics(); });
    });
    renderPlayerPanel(team);
    renderWarnPanel(team);
  }

  function renderWarnPanel(team) {
    const host = el('warnPanel');
    if (!host) return;
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
    const cond = FM.isInjured(p) ? `<span class="out">injured: ${esc(injuryText(p))}</span>` : `condition ${Math.round(100 * FM.conditionOf(p))}%`;
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
          <p class="note">${FM.isInjured(b) ? 'He is injured and cannot be brought on.' : 'To bring him on, click one of the shirts on the board, or drag him onto one. Click him again to deselect.'}</p></div>`;
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
    ['home', 'league', 'squad', 'analysis', 'reports', 'news', 'preview', 'match'].forEach((k) => { el('view-' + k).hidden = true; });
    el('tactics').hidden = true; el('nav').hidden = true; el('prepFlow').hidden = true; el('newGame').hidden = false;
    el('topRight').innerHTML = ''; el('subtitle').textContent = 'Eight clubs, one season, and a lot of numbers.';
  }
  el('ngTeam').innerHTML = `<option value="0">${esc(FM.TEAM_DEFS[0].name)}</option>`;
  el('ngTeam').value = '0'; // Ashford Rovers is the default club for the supported portrait experience.
  el('ngStart').addEventListener('click', async () => {
    const btn = el('ngStart'), tier = document.querySelector('input[name="tier"]:checked').value;
    btn.disabled = true; btn.textContent = 'Setting up the clubs...';
    await new Promise((r) => setTimeout(r, 30));
    world.league = FM.createLeague({ userIndex: +el('ngTeam').value, tier });
    if (FM.ensurePreseasonNews) FM.ensurePreseasonNews(world.league);
    await FM.playFriendlies(world.league, (i, n) => { btn.textContent = 'Playing pre-season friendlies (' + i + ' of ' + n + ')...'; });
    FM.saveLeague(world.league);
    btn.disabled = false; btn.textContent = 'Start the season';
    setView('home');
  });

  window.FM_WORLD = world; // debug handle for the console
  window.addEventListener('resize', resize);
  world.league = FM.loadLeague();
  if (world.league) {
    if (FM.ensurePreseasonNews) { FM.ensurePreseasonNews(world.league); FM.saveLeague(world.league); }
    setView('home');
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
