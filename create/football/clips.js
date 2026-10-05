// Analysis Centre clips: short replays of the moments worth studying (goals either way, the best chances, build-up from the back),
// drawn from the positions recorded during the match. The numbers beside each pass are the ones the engine used to decide it:
// the chance it would work, how close the nearest defender was to the pass line, and to the receiver.
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const L = 105, W = 68, PS = 6, PW = L * PS, PH = W * PS;
  const KIND_NAMES = { goal: 'Goals scored', conceded: 'Goals conceded', chance: 'Our best chances', chanceAgainst: 'Their best chances', buildup: 'Build-up from the back',
    press: 'Our press: winning the ball high up', counter: 'Our counter-attacks', counterAgainst: 'Their counter-attacks', turnover: 'Ball lost in our own third', setpiece: 'Our set pieces', setpieceAgainst: 'Their set pieces' };
  const KIND_ORDER = ['goal', 'conceded', 'chance', 'chanceAgainst', 'buildup', 'press', 'counter', 'counterAgainst', 'turnover', 'setpiece', 'setpieceAgainst'];
  const state = { clipId: null, speed: 0.5, playing: false, t: 0, raf: 0 };

  function stop() { state.playing = false; if (state.raf) cancelAnimationFrame(state.raf); state.raf = 0; }

  // The clip, unpacked: per frame the ball and each player (in decimetres, -1 when he is not on the pitch at that moment).
  function unpack(c, mirror) {
    const m = (x, y) => (mirror ? [(L - x), (W - y)] : [x, y]);
    const frames = c.f.map((r) => {
      const b = m(r[0] / 10, r[1] / 10), pl = [];
      let i = 2;
      [0, 1].forEach((side) => c.roster[side].forEach((num) => { pl.push({ side, num, x: r[i] < 0 ? null : m(r[i] / 10, r[i + 1] / 10)[0], y: r[i] < 0 ? null : m(r[i] / 10, r[i + 1] / 10)[1] }); i += 2; }));
      return { b, pl };
    });
    const ev = c.ev.map((e) => {
      const o = { type: e[0], t: e[1], side: e[2] };
      if (e[0] === 'pass') { const p0 = m(e[5] / 10, e[6] / 10), p1 = m(e[7] / 10, e[8] / 10); Object.assign(o, { from: e[3], to: e[4], x: p0[0], y: p0[1], tx: p1[0], ty: p1[1], ok: e[9], p: e[10], dist: e[11], lane: e[12], press: e[13] }); }
      else if (e[0] === 'shot') { const p0 = m(e[4] / 10, e[5] / 10); Object.assign(o, { player: e[3], x: p0[0], y: p0[1], xg: e[6], outcome: e[7], setPiece: e[8] }); }
      else if (e[0] === 'goal') o.player = e[3];
      else if (e[0] === 'tackle') Object.assign(o, { player: e[3], vs: e[4], ok: e[5] });
      return o;
    });
    return { frames, ev };
  }

  function lerp(a, b, k) { return a + (b - a) * k; }

  function draw(svgHost, c, data, t, nameOf, kitOf) {
    const dt = c.dt, fi = Math.min(data.frames.length - 1, Math.max(0, Math.floor(t / dt))), k = Math.min(1, (t - fi * dt) / dt);
    const f0 = data.frames[fi], f1 = data.frames[Math.min(fi + 1, data.frames.length - 1)];
    const X = (x) => (x * PS).toFixed(1), Y = (y) => (y * PS).toFixed(1);
    let s = FM.ANALYSIS_DRAW.pitchLines();
    // passes made in the last few seconds stay on the pitch, fading
    data.ev.forEach((e) => {
      if (e.type !== 'pass') return;
      const age = t - e.t;
      if (age < 0 || age > 3.5) return;
      const op = (1 - age / 3.5) * 0.9, col = e.ok ? '#FFE27A' : '#FF5A36';
      s += `<line x1="${X(e.x)}" y1="${Y(e.y)}" x2="${X(e.tx)}" y2="${Y(e.ty)}" stroke="${col}" stroke-width="3" stroke-dasharray="${e.ok ? '' : '6 5'}" stroke-opacity="${op.toFixed(2)}"/>`;
      s += `<circle cx="${X(e.tx)}" cy="${Y(e.ty)}" r="5" fill="${col}" fill-opacity="${op.toFixed(2)}"/>`;
    });
    data.ev.forEach((e) => {
      if (e.type !== 'shot') return;
      const age = t - e.t;
      if (age < 0 || age > 5) return;
      s += `<path d="M${X(e.x)} ${(e.y * PS - 11).toFixed(1)} l3 8 8 .5 -6 5 2 8 -7 -4.5 -7 4.5 2 -8 -6 -5 8 -.5z" fill="#fff" stroke="#000" stroke-width="1.5" fill-opacity="${(1 - age / 5).toFixed(2)}"/>`;
    });
    f0.pl.forEach((p0, i) => {
      const p1 = f1.pl[i];
      if (p0.x == null) return;
      const x = p1.x == null ? p0.x : lerp(p0.x, p1.x, k), y = p1.x == null ? p0.y : lerp(p0.y, p1.y, k);
      const kit = kitOf[p0.side];
      s += `<circle cx="${X(x)}" cy="${Y(y)}" r="11" fill="${kit.shirt}" stroke="${kit.number}" stroke-width="2.5"/><text x="${X(x)}" y="${(y * PS + 4.5).toFixed(1)}" text-anchor="middle" font-size="13" font-weight="700" fill="${kit.number}" font-family="sans-serif">${p0.num}</text>`;
    });
    const bx = lerp(f0.b[0], f1.b[0], k), by = lerp(f0.b[1], f1.b[1], k);
    s += `<circle cx="${X(bx)}" cy="${Y(by)}" r="6.5" fill="#fff" stroke="#000" stroke-width="2"/>`;
    s += `<text x="${PW - 12}" y="${PH - 12}" text-anchor="end" font-size="20" fill="#fff" stroke="#000" stroke-width="4" style="paint-order:stroke">your team attacks &#8594;</text>`;
    svgHost.innerHTML = s;
  }

  const clock = (t, c) => { const s = Math.max(0, t); return (s).toFixed(1) + ' s'; };
  const ms = (m) => Math.round(m) + ' m';

  function describe(e, nameOf, sideName) {
    if (e.type === 'pass') {
      const who = `${sideName[e.side]} ${nameOf(e.side, e.from)} to ${nameOf(e.side, e.to)}`;
      return `<b>${esc(who)}</b>, ${ms(e.dist)}: the pass ${e.ok ? 'came off' : 'was lost'}. The engine gave it a <b>${e.p}%</b> chance. The nearest defender was <b>${e.lane.toFixed(1)} m</b> from the pass line and <b>${e.press.toFixed(1)} m</b> from the receiver${e.lane >= 30 ? ' (no defender anywhere near the line)' : ''}.`;
    }
    if (e.type === 'shot') return `<b>${esc(sideName[e.side])} ${esc(nameOf(e.side, e.player))}</b> shoots${e.setPiece ? ' from a ' + esc(e.setPiece) : ''}: the chance was worth <b>${(e.xg / 100).toFixed(2)} xG</b> and ended as ${esc(e.outcome)}.`;
    if (e.type === 'goal') return `<b>Goal</b> for ${esc(sideName[e.side])}, scored by ${esc(nameOf(e.side, e.player))}.`;
    if (e.type === 'tackle') return `<b>${esc(sideName[e.side])} ${esc(nameOf(e.side, e.player))}</b> challenges ${esc(nameOf(1 - e.side, e.vs))} and ${e.ok ? 'wins the ball' : 'does not win it'}.`;
    return '';
  }

  FM.renderClips = function (host, league, fx) {
    stop();
    const clips = fx.clips || [];
    const user = FM.teamById(league, league.userId);
    if (!clips.length) {
      host.innerHTML = `<h2>Clips</h2><p class="note">${fx.clipsDropped ? 'The clips from this match were removed to make room in your browser storage.' : 'No clips were recorded for this match. Clips are cut from the matches you play yourself, from round to round, so a match simulated before this feature existed has none.'}</p>`;
      return;
    }
    if (!clips.find((c) => c.id === state.clipId)) state.clipId = clips[0].id;
    const c = clips.find((x) => x.id === state.clipId);
    const homeIsUser = fx.homeId === league.userId;
    // draw so the user's team always attacks to the right; in the clip, side 0 is the home team
    const mirror = !homeIsUser;
    const userSide = homeIsUser ? 0 : 1;
    const sideNames = [FM.teamById(league, fx.homeId).name, FM.teamById(league, fx.awayId).name];
    const teams = [FM.teamById(league, fx.homeId), FM.teamById(league, fx.awayId)];
    const nameOf = (side, num) => { const p = teams[side].squad ? teams[side].squad.find((q) => q.number === num) : (teams[side].players || []).concat(teams[side].bench || []).find((q) => q.number === num); return p ? FM.shortName(p) : '#' + num; };
    const kitOf = c.kits;
    const data = unpack(c, mirror);
    const dur = (c.f.length - 1) * c.dt;
    state.t = Math.min(state.t, dur);

    const groups = KIND_ORDER.filter((k) => clips.some((x) => x.kind === k)).map((k) => `<optgroup label="${KIND_NAMES[k]}">${clips.filter((x) => x.kind === k).map((x) => `<option value="${x.id}"${x.id === c.id ? ' selected' : ''}>${x.minute}' ${esc(x.label.replace(/^[^:]*: /, ''))}</option>`).join('')}</optgroup>`).join('');
    host.innerHTML = `
      <h2>Clips</h2>
      <p class="note">Watch the moments behind the numbers. The shirts are the players, the white dot is the ball, a yellow line is a pass that came off and a dashed red one a pass that was lost. Your team always attacks to the right.</p>
      <div class="row">
        <label>Clip<select id="clipSel">${groups}</select></label>
        <label>Speed<select id="clipSpeed">${[0.25, 0.5, 1].map((v) => `<option value="${v}"${state.speed === v ? ' selected' : ''}>${v === 1 ? 'Real time' : v + 'x'}</option>`).join('')}</select></label>
      </div>
      <div class="clipwrap">
        <svg id="clipSvg" class="amap" viewBox="0 0 ${PW} ${PH}" role="img" aria-label="${esc(c.label)}"></svg>
      </div>
      <div class="row" style="align-items:center">
        <button id="clipPlay" type="button">Play</button>
        <button id="clipBack" type="button" title="Back one second">&#8722;1 s</button>
        <button id="clipFwd" type="button" title="Forward one second">+1 s</button>
        <input id="clipScrub" type="range" min="0" max="${dur.toFixed(2)}" step="0.05" value="${state.t}" style="flex:1;min-width:140px" aria-label="Position in the clip"/>
        <span id="clipTime" class="note" style="min-width:90px;text-align:right"></span>
      </div>
      <p class="note"><b>${esc(c.label)}</b> (minute ${c.minute}; score at the end of the clip: ${esc(sideNames[0])} ${c.score[0]}-${c.score[1]} ${esc(sideNames[1])}). Click an action to jump to it.</p>
      <div id="clipEvents" class="clipevents"></div>
      <div id="clipInfo" class="note clipinfo"></div>`;

    const svg = host.querySelector('#clipSvg'), scrub = host.querySelector('#clipScrub'), timeEl = host.querySelector('#clipTime'), info = host.querySelector('#clipInfo'), btn = host.querySelector('#clipPlay');
    const evs = data.ev.filter((e) => e.type !== 'tackle' || true);
    host.querySelector('#clipEvents').innerHTML = evs.map((e, i) => `<button type="button" class="clipev" data-i="${i}"><span class="pm">${e.t.toFixed(1)} s</span> ${e.type === 'pass' ? `${esc(nameOf(e.side, e.from))} &#8594; ${esc(nameOf(e.side, e.to))} ${e.ok ? '' : '(lost)'}` : e.type === 'shot' ? `Shot, ${esc(nameOf(e.side, e.player))}` : e.type === 'goal' ? `<b>GOAL</b> ${esc(nameOf(e.side, e.player))}` : `Challenge, ${esc(nameOf(e.side, e.player))}`}</button>`).join('');

    function show() {
      draw(svg, c, data, state.t, nameOf, kitOf);
      scrub.value = state.t;
      timeEl.textContent = state.t.toFixed(1) + ' / ' + dur.toFixed(1) + ' s';
      // describe the most recent action
      let cur = null; evs.forEach((e) => { if (e.t <= state.t + 0.02) cur = e; });
      info.innerHTML = cur ? describe(cur, nameOf, sideNames) : 'Press play, or click an action.';
      host.querySelectorAll('.clipev').forEach((b, i) => b.classList.toggle('on', evs[i] === cur));
    }
    function tick(ts) {
      if (!state.playing) return;
      if (!tick.last) tick.last = ts;
      state.t += Math.min(0.1, (ts - tick.last) / 1000) * state.speed; tick.last = ts;
      if (state.t >= dur) { state.t = dur; stop(); btn.textContent = 'Replay'; show(); return; }
      show(); state.raf = requestAnimationFrame(tick);
    }
    function play() { if (state.t >= dur) state.t = 0; state.playing = true; tick.last = 0; btn.textContent = 'Pause'; state.raf = requestAnimationFrame(tick); }
    btn.addEventListener('click', () => { if (state.playing) { stop(); btn.textContent = 'Play'; } else play(); });
    scrub.addEventListener('input', () => { state.t = +scrub.value; show(); });
    host.querySelector('#clipBack').addEventListener('click', () => { state.t = Math.max(0, state.t - 1); show(); });
    host.querySelector('#clipFwd').addEventListener('click', () => { state.t = Math.min(dur, state.t + 1); show(); });
    host.querySelector('#clipSpeed').addEventListener('change', (e) => { state.speed = +e.target.value; });
    host.querySelector('#clipSel').addEventListener('change', (e) => { state.clipId = e.target.value; state.t = 0; FM.renderClips(host, league, fx); });
    host.querySelectorAll('.clipev').forEach((b) => b.addEventListener('click', () => { stop(); btn.textContent = 'Play'; state.t = Math.max(0, evs[+b.dataset.i].t - 0.4); show(); }));
    state.t = state.t || Math.max(0, c.at - 5);
    show();
  };
  // A moment can be opened from elsewhere on the page (for example a goal in the key facts).
  FM.openClip = function (id) { state.clipId = id; state.t = 0; };
  FM.stopClips = stop;
})();
