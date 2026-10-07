// Replays of build-up tests, drawn with the arrows that explain them: the passes (yellow if they came off, red dashed if they did not), who the
// opposition had gone to (orange dashed lines), and which of your players had nobody on him (green rings). Each replay is one of the tests in a run,
// kept as it happened. The picture is the first 66 m of the pitch, your goal on the left.
(function () {
  const FM = (window.FM = window.FM || {});
  const L = 105, W = 68, PS = 6, VW = 66 * PS, VH = W * PS;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lerp = (a, b, k) => a + (b - a) * k;
  const S = { raf: 0, playing: false, t: 0, speed: 1, clip: null, host: null, ctx: null, last: 0 };

  // The clip as plain numbers in metres, with your team attacking to the right.
  function unpack(c) {
    const m = (x, y) => (c.mirror ? [L - x, W - y] : [x, y]);
    const players = c.f.map((row) => { const out = []; let i = 0; ['u', 'o'].forEach((side) => (side === 'u' ? c.ru : c.ro).forEach((n) => { const p = m(row[i] / 10, row[i + 1] / 10); out.push({ side, n, x: p[0], y: p[1] }); i += 2; })); return out; });
    const ball = c.b.map((r) => m(r[0] / 10, r[1] / 10));
    const ev = c.ev.map((e) => { const o = Object.assign({}, e); const p0 = m(e.x / 10, e.y / 10); o.x = p0[0]; o.y = p0[1]; if (e.tx != null) { const p1 = m(e.tx / 10, e.ty / 10); o.tx = p1[0]; o.ty = p1[1]; } return o; });
    return { players, ball, ev, plan: c.plan, dt: c.dt, dtb: c.dtb, end: c.end };
  }
  const planAt = (d, t) => { let cur = null; d.plan.forEach((p) => { if (p.t <= t + 1e-6) cur = p; }); return cur; };
  function posAt(d, t) {
    const fi = Math.min(d.players.length - 1, Math.floor(t / d.dt)), k = Math.min(1, (t - fi * d.dt) / d.dt), a = d.players[fi], b = d.players[Math.min(fi + 1, d.players.length - 1)];
    const pl = a.map((p, i) => ({ side: p.side, n: p.n, x: lerp(p.x, b[i].x, k), y: lerp(p.y, b[i].y, k) }));
    const bi = Math.min(d.ball.length - 1, Math.floor(t / d.dtb)), bk = Math.min(1, (t - bi * d.dtb) / d.dtb), b0 = d.ball[bi], b1 = d.ball[Math.min(bi + 1, d.ball.length - 1)];
    return { pl, ball: [lerp(b0[0], b1[0], bk), lerp(b0[1], b1[1], bk)] };
  }
  const X = (x) => (x * PS).toFixed(1), Y = (y) => (y * PS).toFixed(1);

  function frame(d, c, t, kits) {
    const { pl, ball } = posAt(d, t), plan = planAt(d, t), pairs = plan ? plan.pairs : [];
    const U = (n) => pl.find((p) => p.side === 'u' && p.n === n), O = (n) => pl.find((p) => p.side === 'o' && p.n === n);
    let s = '<defs><marker id="elArrOk" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#FFE27A"/></marker><marker id="elArrNo" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#FF5A36"/></marker></defs>';
    s += FM.ANALYSIS_DRAW.pitchLines();
    // the player with the ball, and who is free
    const holder = pl.filter((p) => p.side === 'u').sort((a, b) => Math.hypot(a.x - ball[0], a.y - ball[1]) - Math.hypot(b.x - ball[0], b.y - ball[1]))[0];
    if (plan) pl.filter((p) => p.side === 'u' && p !== holder && !pairs.some((pr) => pr[1] === p.n) && Math.hypot(p.x - ball[0], p.y - ball[1]) < 40).forEach((p) => { s += '<circle cx="' + X(p.x) + '" cy="' + Y(p.y) + '" r="19" fill="rgba(127,212,154,.18)" stroke="#7fd49a" stroke-width="2.5" stroke-dasharray="4 3"/>'; });
    pairs.forEach((pr) => { const a = O(pr[0]), b = U(pr[1]); if (a && b) s += '<line x1="' + X(a.x) + '" y1="' + Y(a.y) + '" x2="' + X(b.x) + '" y2="' + Y(b.y) + '" stroke="#FF9F43" stroke-width="2.5" stroke-dasharray="5 4" stroke-opacity=".9"/>'; });
    // passes made so far, fading
    d.ev.forEach((e) => {
      if (e.type !== 'pass' || e.t > t) return;
      const age = t - e.t; if (age > 4.5) return;
      const op = Math.max(0.25, 1 - age / 4.5), ok = e.ok;
      s += '<line x1="' + X(e.x) + '" y1="' + Y(e.y) + '" x2="' + X(e.tx) + '" y2="' + Y(e.ty) + '" stroke="' + (ok ? '#FFE27A' : '#FF5A36') + '" stroke-width="3.5"' + (ok ? '' : ' stroke-dasharray="7 5"') + ' stroke-opacity="' + op.toFixed(2) + '" marker-end="url(#' + (ok ? 'elArrOk' : 'elArrNo') + ')"/>';
    });
    // where the ball was lost
    if (c.lost != null && t >= c.lost) { const lb = posAt(d, c.lost).ball, k = Math.min(1, (t - c.lost) / 0.5); s += '<circle cx="' + X(lb[0]) + '" cy="' + Y(lb[1]) + '" r="' + (14 + 10 * (1 - k)).toFixed(1) + '" fill="none" stroke="#FF5A36" stroke-width="3.5"/><text x="' + X(lb[0]) + '" y="' + (lb[1] * PS - 22).toFixed(1) + '" text-anchor="middle" font-size="15" font-weight="800" fill="#fff" stroke="#000" stroke-width="4" style="paint-order:stroke" font-family="sans-serif">ball lost</text>'; }
    pl.forEach((p) => {
      const kit = kits[p.side];
      s += '<circle cx="' + X(p.x) + '" cy="' + Y(p.y) + '" r="11" fill="' + kit.shirt + '" stroke="' + kit.number + '" stroke-width="2.5"/><text x="' + X(p.x) + '" y="' + (p.y * PS + 4.5).toFixed(1) + '" text-anchor="middle" font-size="12.5" font-weight="700" fill="' + kit.number + '" font-family="sans-serif">' + p.n + '</text>';
    });
    s += '<circle cx="' + X(ball[0]) + '" cy="' + Y(ball[1]) + '" r="6" fill="#fff" stroke="#000" stroke-width="2"/>';
    s += '<text x="' + (VW - 8) + '" y="' + (VH - 8) + '" text-anchor="end" font-size="13" fill="#fff" stroke="#000" stroke-width="3" style="paint-order:stroke" font-family="sans-serif">you attack &#8594;</text>';
    return s;
  }

  // What is happening, in words, up to this moment.
  function narrate(d, c, t, nm) {
    const lines = [];
    const jobAt = (te) => { const p = planAt(d, te); return p ? p.pairs : []; };
    d.ev.forEach((e) => {
      if (e.t > t) return;
      const clk = e.t.toFixed(1) + ' s';
      if (e.type === 'pass') {
        const from = nm('u', e.from), to = nm('u', e.to);
        let txt = '<b>' + clk + '</b> ' + esc(from) + ' passes to ' + esc(to) + ', ' + Math.round(e.dist) + ' m. The engine gave it a ' + Math.round(e.p * 100) + '% chance: the nearest defender was ' + e.lane.toFixed(1) + ' m from the line and ' + e.press.toFixed(1) + ' m from the receiver.';
        if (e.ok) txt += ' <b>It came off.</b>';
        else if (e.outcome === 'intercepted' && e.by != null) {
          const on = jobAt(e.t).some((pr) => pr[0] === e.by && pr[1] === e.to), onOther = jobAt(e.t).find((pr) => pr[0] === e.by);
          txt += ' <b>Cut out by ' + esc(nm('o', e.by)) + '.</b> ' + (on ? 'He was the one sent to mark ' + esc(to) + ': the press went to plan.' : onOther ? 'He was marking another player (' + esc(nm('u', onOther[1])) + ') and read the pass.' : 'He had no one to mark, so he got across and cut the lane.');
        } else txt += ' <b>The pass went astray.</b>';
        lines.push(txt);
      } else if (e.type === 'dribble') lines.push('<b>' + clk + '</b> ' + esc(nm('u', e.player)) + ' ' + (e.ok ? 'beats his man.' : 'tries to take the defender on and <b>loses the ball</b>.'));
      else if (e.type === 'tackle' && e.ok) lines.push('<b>' + clk + '</b> ' + esc(nm('o', e.player)) + ' <b>tackles ' + esc(nm('u', e.vs)) + ' and wins the ball.</b>');
    });
    if (c.outcome === 'beat' && t >= c.end - 0.01) lines.push('<b>The ball reaches the halfway line with your team still holding it.</b>');
    return lines.slice(-3);
  }

  function stop() { S.playing = false; if (S.raf) cancelAnimationFrame(S.raf); S.raf = 0; }
  // host: where to draw. clip: one stored clip. ctx: { team, opp } for names and kits.
  function mount(host, clip, ctx) {
    stop(); S.host = host; S.clip = clip; S.ctx = ctx; S.t = 0;
    const d = unpack(clip), kits = [ctx.team.kit || { shirt: '#c0392b', number: '#fff' }, ctx.opp.kit || { shirt: '#3b82c4', number: '#fff' }];
    const kitMap = { u: kits[0], o: kits[1] };
    const nm = (side, n) => { const q = clip.names[side][n]; return q ? q.split(' ').slice(-1)[0] + ' (#' + n + ')' : '#' + n; };
    host.innerHTML = '<svg class="rp-pitch" viewBox="0 0 ' + VW + ' ' + VH + '" role="img" aria-label="Replay of the test"></svg>' +
      '<div class="rp-bar"><button type="button" class="el-go primary rp-play">Play</button><input type="range" class="rp-seek" min="0" max="' + Math.round(clip.end * 100) + '" value="0" aria-label="Position in the replay"><select class="rp-speed" aria-label="Speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></div>' +
      '<div class="rp-key"><span><i class="rp-k ok"></i> pass that came off</span><span><i class="rp-k no"></i> pass lost</span><span><i class="rp-k job"></i> their job: goes to this player</span><span><i class="rp-k free"></i> your player with nobody on him</span></div>' +
      '<div class="rp-say" aria-live="polite"></div>';
    const svg = host.querySelector('.rp-pitch'), say = host.querySelector('.rp-say'), seek = host.querySelector('.rp-seek'), btn = host.querySelector('.rp-play');
    const draw = () => { svg.innerHTML = frame(d, clip, S.t, kitMap); say.innerHTML = narrate(d, clip, S.t, nm).map((l) => '<p>' + l + '</p>').join('') || '<p>Press Play. Each pass appears as an arrow, and the explanation appears here.</p>'; seek.value = String(Math.round(S.t * 100)); };
    const tick = (ts) => { if (!S.playing) return; if (!S.last) S.last = ts; S.t = Math.min(clip.end, S.t + (ts - S.last) / 1000 * S.speed); S.last = ts; draw(); if (S.t >= clip.end) { stop(); btn.textContent = 'Replay'; return; } S.raf = requestAnimationFrame(tick); };
    btn.addEventListener('click', () => { if (S.playing) { stop(); btn.textContent = 'Play'; return; } if (S.t >= clip.end) S.t = 0; S.playing = true; S.last = 0; btn.textContent = 'Pause'; S.raf = requestAnimationFrame(tick); });
    seek.addEventListener('input', () => { S.t = +seek.value / 100; draw(); });
    host.querySelector('.rp-speed').addEventListener('change', (e) => { S.speed = +e.target.value; });
    draw();
  }
  FM.labReplay = { mount, stop };
})();
