// Tactical analysis for each page of the plan, worked out here from the shirts on the page and the choices made for that phase (no outside service):
//   1. who controls the space and who is free      (a pitch-control surface: which side gets to each patch of grass first)
//   2. numbers and passing lanes                   (how many of each side in every zone, and which passes are actually open)
//   3. formation lines                             (the shape of the back, middle and front lines, and the gaps between them)
// Every number comes from the positions on the page (the plan's moves, the dials and the manager's own drags are all in them), from the opposition as scouted
// for the phase that answers this one, and from the choices (how we play out, pressing, counter-press...) which change who is where and who is quick to the ball.
// Pitch coordinates here are metres, our goal on the left and the one we attack on the right; the top of the picture is our left.
(function () {
  const FM = (window.FM = window.FM || {});
  const L = 105, W = 68, S = 10, PAD = 18, VW = L * S + PAD * 2, VH = W * S + PAD * 2;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const C = { us: '#4C8DFF', them: '#E5574B', gold: '#FFD54A', line: 'rgba(255,255,255,.55)', text: '#F2F5F0' };
  const OUR_BALL = ['build', 'midfield', 'final', 'transAtt'];
  const BALL_AT = { build: 20, midfield: 52, final: 86, transAtt: 38, transDef: 66, defence: 48, press: 90 };   // typical ball position (metres from our goal) for each phase
  const LINES = { defence: ['CB', 'FB'], midfield: ['DM', 'CM', 'AM'], attack: ['WF', 'ST'] };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const X = (m) => PAD + m * S, Y = (m) => PAD + m * S;
  const chanName = (y) => { const w = y / W; return w < 0.2 ? 'left wing' : w < 0.4 ? 'left half-space' : w < 0.6 ? 'centre' : w < 0.8 ? 'right half-space' : 'right wing'; };
  const thirdName = (x) => (x < 35 ? 'our third' : x < 70 ? 'the middle third' : 'their third');
  const sname = (p) => { const n = String(p.name || '').split(' ').slice(1).join(' ') || p.name || ''; return n.length > 10 ? n.slice(0, 9) + '.' : n; };

  // ---------- the people on the page ----------
  function snapshot(team, ph, hooks) {
    const info = FM.planPhase(ph), eng = info.eng[0], ours = OUR_BALL.indexOf(ph) >= 0, tac = team.tactics || {}, dials = team.dials || {};
    const lineShift = (eng === 'without' || eng === 'withoutEnd' || eng === 'press' || eng === 'transDef') ? (dials.line || 0) : 0;
    const us = team.players.map((p) => {
      const q = FM.phasePos(team, p, eng);
      return { p, x: clamp(q.d * L + (p.group === 'GK' ? 0 : lineShift), 1, L - 1), y: clamp(q.w * W, 1, W - 1), group: p.group, speed: p.maxSpeed || 7, num: p.number, side: 'us' };
    });
    const od = hooks && hooks.opp ? hooks.opp(eng) : null;
    let them = [], generic = false;
    if (od) {
      them = Object.keys(od.cells).map((slot) => {
        const c = od.cells[slot], op = od.opp.players.find((q) => q.slotKey === slot);
        return { p: op, x: clamp((1 - c.d) * L, 1, L - 1), y: clamp((1 - c.w) * W, 1, W - 1), group: op ? op.group : 'CM', speed: (op && op.maxSpeed) || 7, num: op ? op.number : 0, side: 'them' };
      });
    }
    if (!them.length) {
      generic = true;
      const rows = ours ? [[0.03, [0.5]], [0.26, [0.15, 0.38, 0.62, 0.85]], [0.46, [0.15, 0.38, 0.62, 0.85]], [0.64, [0.4, 0.6]]] : [[0.03, [0.5]], [0.2, [0.15, 0.38, 0.62, 0.85]], [0.4, [0.15, 0.38, 0.62, 0.85]], [0.58, [0.4, 0.6]]];
      const grp = ['GK', 'DEF', 'MID', 'ATT'];
      rows.forEach((r, i) => r[1].forEach((w) => them.push({ p: null, x: (1 - r[0]) * L, y: (1 - w) * W, group: grp[i] === 'DEF' ? 'CB' : grp[i] === 'MID' ? 'CM' : grp[i] === 'ATT' ? 'ST' : 'GK', speed: 7, num: 0, side: 'them' })));
    }
    // the ball: with the nearest man of the side that has it to the usual place for this phase
    const poss = ours ? us : them, at = { x: BALL_AT[ph], y: W / 2 };
    const carrier = poss.filter((q) => q.group !== 'GK' || ph === 'build').sort((a, b) => dist(a, at) - dist(b, at))[0];
    return { ph, eng, ours, us, them, generic, ball: { x: carrier.x, y: carrier.y }, carrier, tac, dials, opp: od ? od.opp : null };
  }

  // ---------- 1. pitch control: the time each man needs to get to a point ----------
  // Time to a point = reaction + distance / speed. The share of a point a side holds is the sum of exp(-time / tau) for its men over all the men: near enough to a
  // man of ours and a man of theirs equally far away and it is 50-50; ten metres closer and it is ours almost for certain.
  function control(S0) {
    const ph = S0.ph, tac = S0.tac, dials = S0.dials;
    const press = tac.pressing == null ? 0.5 : tac.pressing, trig = 6 + 8 * press + (dials.press || 0), cp = tac.counterPress == null ? 0.5 : tac.counterPress;
    const defending = !S0.ours, tau = 0.85, RES = 3;   // grid squares per metre
    const nx = L * RES, ny = W * RES, grid = new Float32Array(nx * ny);
    const members = S0.us.concat(S0.them).map((q) => {
      let react = 0.35, sp = q.speed * 0.85;
      // possession gives the side with the ball the first touch
      if ((S0.ours && q.side === 'us') || (!S0.ours && q.side === 'them')) react -= 0.12;
      // the manager's pressing choices: our men inside the trigger distance of the ball go at it, and after a loss the counter-press sets how fast they react
      if (q.side === 'us' && defending && dist(q, S0.ball) < trig) { react -= 0.12; sp *= 1.1; }
      if (q.side === 'us' && ph === 'transDef') { react -= (cp - 0.5) * 0.5; sp *= 1 + (cp - 0.5) * 0.2; }
      if (q.side === 'us' && ph === 'transAtt') { react -= ((tac.counterAttack == null ? 0.5 : tac.counterAttack) - 0.5) * 0.4; }
      return { q, react: Math.max(0.1, react), sp };
    });
    let wUs = 0, wAll = 0, finalUs = 0, finalN = 0, ownUs = 0, ownN = 0;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const px = (i + 0.5) / RES, py = (j + 0.5) / RES; let a = 0, b = 0;
      for (let k = 0; k < members.length; k++) {
        const m = members[k], t = m.react + Math.hypot(m.q.x - px, m.q.y - py) / m.sp, w = Math.exp(-t / tau);
        if (m.q.side === 'us') a += w; else b += w;
      }
      const c = a / (a + b || 1); grid[j * nx + i] = c; wUs += c; wAll++;
      if (px > 70) { finalUs += c; finalN++; } else if (px < 35) { ownUs += c; ownN++; }
    }
    // free space: the room each of our men has (distance to the nearest opponent), and the patch of the pitch that is nearest to him
    const owned = new Map(); S0.us.forEach((q) => owned.set(q, 0));
    for (let j = 0; j < ny; j += 3) for (let i = 0; i < nx; i += 3) {
      const px = (i + 0.5) / RES, py = (j + 0.5) / RES; let best = null, bt = 1e9;
      members.forEach((m) => { const t = m.react + Math.hypot(m.q.x - px, m.q.y - py) / m.sp; if (t < bt) { bt = t; best = m.q; } });
      if (best && best.side === 'us') owned.set(best, owned.get(best) + 9 / (RES * RES));
    }
    const free = S0.us.map((q) => { const dn = S0.them.reduce((m, o) => Math.min(m, dist(q, o)), 99); return { q, free: dn, area: owned.get(q) || 0 }; });
    return { grid, nx, ny, pct: wUs / wAll, finalPct: finalN ? finalUs / finalN : 0, ownPct: ownN ? ownUs / ownN : 0, free, trig, defending };
  }
  // colour for a control value: ten bands, red (theirs) through a pale neutral to blue (ours)
  function bandColour(c) {
    const b = clamp(Math.floor(c * 11), 0, 10), t = (b - 5) / 5;   // -1 .. 1
    const lerp = (a, z, u) => Math.round(a + (z - a) * u);
    if (t < 0) { const u = -t; return [lerp(236, 178, u), lerp(228, 36, u), lerp(222, 50, u)]; }
    const u = t; return [lerp(236, 62, u), lerp(228, 84, u), lerp(222, 178, u)];
  }
  function controlImage(ctl) {
    try {
      const cv = document.createElement('canvas'); cv.width = ctl.nx; cv.height = ctl.ny; const cx = cv.getContext('2d'), im = cx.createImageData(ctl.nx, ctl.ny);
      for (let i = 0; i < ctl.grid.length; i++) { const col = bandColour(ctl.grid[i]); im.data[i * 4] = col[0]; im.data[i * 4 + 1] = col[1]; im.data[i * 4 + 2] = col[2]; im.data[i * 4 + 3] = 255; }
      cx.putImageData(im, 0, 0); return cv.toDataURL('image/png');
    } catch (e) { return null; }
  }

  // ---------- 2. numbers in every zone, and the passing lanes ----------
  const ZX = 5, ZY = 3;
  function zones(S0) {
    const zs = []; for (let r = 0; r < ZY; r++) for (let c = 0; c < ZX; c++) zs.push({ c, r, us: 0, them: 0, x0: c * L / ZX, x1: (c + 1) * L / ZX, y0: r * W / ZY, y1: (r + 1) * W / ZY });
    const at = (q) => zs[clamp(Math.floor(q.y / (W / ZY)), 0, ZY - 1) * ZX + clamp(Math.floor(q.x / (L / ZX)), 0, ZX - 1)];
    S0.us.forEach((q) => { if (q.group !== 'GK') at(q).us++; }); S0.them.forEach((q) => { if (q.group !== 'GK') at(q).them++; });
    return zs;
  }
  const segDist = (p, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1, t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / l2, 0, 1); return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)); };
  function lanes(S0, team) {
    const plan = FM.planGet(team), ch = (plan && plan.team && plan.team[S0.ph]) || {};
    const style = ch.style || 'std', route = ch.route || 'std';
    const out = [], men = S0.us.filter((q) => q !== null);
    // only the passes that the choices for this phase make sense of: short play keeps to short passes, direct play to long ones
    const maxD = style === 'short' ? 24 : style === 'direct' ? 55 : 36, minD = style === 'direct' ? 22 : 5;
    for (let i = 0; i < men.length; i++) for (let j = 0; j < men.length; j++) {
      if (i === j) continue; const a = men[i], b = men[j], d = dist(a, b);
      if (a !== S0.carrier) continue;   // passes from the man on the ball: what can he actually do right now
      if (d < minD || d > maxD || (b.x - a.x < -6 && ['build', 'midfield', 'final'].indexOf(S0.ph) >= 0 && b.group !== 'GK' && a.group !== 'GK' && style !== 'short')) continue;
      const block = S0.them.filter((o) => segDist(o, a, b) < 2.4 || (dist(o, b) < 3 && dist(o, a) > dist(o, b))).length;
      const near = S0.them.reduce((m, o) => Math.min(m, dist(o, b)), 99);
      const wide = b.y < W * 0.22 || b.y > W * 0.78;
      out.push({ a, b, d, open: block === 0, near, fwd: b.x - a.x, wide, pref: (route === 'flanks' && wide) || (route === 'centre' && !wide) });
    }
    return out;
  }
  function overloads(zs) {
    const list = zs.filter((z) => z.us + z.them > 0).map((z) => Object.assign({ diff: z.us - z.them }, z));
    const best = list.filter((z) => z.us >= 2 && z.diff >= 1).sort((a, b) => b.diff - a.diff || b.us - a.us)[0] || null, worst = list.filter((z) => z.them >= 2 && z.diff <= -1).sort((a, b) => a.diff - b.diff || b.them - a.them)[0] || null;
    return { best, worst };
  }
  const zoneName = (z) => chanName((z.y0 + z.y1) / 2) + ' of ' + thirdName((z.x0 + z.x1) / 2);

  // ---------- 3. the lines ----------
  function hull(pts) {
    const p = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y); if (p.length < 3) return p;
    const cr = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x), lo = [], up = [];
    p.forEach((q) => { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); });
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    up.pop(); lo.pop(); return lo.concat(up);
  }
  const area = (h) => { let a = 0; for (let i = 0; i < h.length; i++) { const p = h[i], q = h[(i + 1) % h.length]; a += p.x * q.y - q.x * p.y; } return Math.abs(a) / 2; };
  function formation(S0) {
    const mk = (side, list) => {
      const res = {};
      // the lines are found from where the players stand: the outfield men in order up the pitch, cut at the two biggest gaps (each line at least two strong),
      // so a holding midfielder who drops between the centre-backs is part of the back line and a front three is a line, whatever the shirts say
      const outf = list.filter((q) => q.group !== 'GK').sort((a, b) => (side === 'us' ? a.x - b.x : b.x - a.x));
      let cuts = []; for (let i = 2; i <= outf.length - 2; i++) cuts.push({ i, gap: Math.abs(outf[i].x - outf[i - 1].x) });
      let best = null; cuts.forEach((c1) => cuts.forEach((c2) => { if (c2.i - c1.i >= 2 && outf.length - c2.i >= 2) { const v = c1.gap + c2.gap; if (!best || v > best.v) best = { v, a: c1.i, b: c2.i }; } }));
      const parts = best ? { defence: outf.slice(0, best.a), midfield: outf.slice(best.a, best.b), attack: outf.slice(best.b) } : { defence: outf.slice(0, 4), midfield: outf.slice(4, 8), attack: outf.slice(8) };
      Object.keys(LINES).forEach((k) => {
        const pts = parts[k]; if (!pts || !pts.length) return;
        res[k] = { pts, hull: hull(pts), cx: pts.reduce((s, q) => s + q.x, 0) / pts.length, cy: pts.reduce((s, q) => s + q.y, 0) / pts.length, n: pts.length, width: Math.max.apply(null, pts.map((q) => q.y)) - Math.min.apply(null, pts.map((q) => q.y)) };
      });
      const out = list.filter((q) => q.group !== 'GK');
      res.length = Math.max.apply(null, out.map((q) => q.x)) - Math.min.apply(null, out.map((q) => q.x)); res.width = Math.max.apply(null, out.map((q) => q.y)) - Math.min.apply(null, out.map((q) => q.y));
      res.area = area(hull(out)); res.cx = out.reduce((s, q) => s + q.x, 0) / out.length; res.cy = out.reduce((s, q) => s + q.y, 0) / out.length;
      res.last = side === 'us' ? out.reduce((m, q) => Math.min(m, q.x), 999) : out.reduce((m, q) => Math.max(m, q.x), -1); res.spread = out.reduce((s, q) => s + Math.hypot(q.x - res.cx, q.y - res.cy), 0) / out.length;
      return res;
    };
    return { us: mk('us', S0.us), them: mk('them', S0.them) };
  }

  // ---------- drawing ----------
  function pitchBase() {
    const ln = 'fill="none" stroke="' + C.line + '" stroke-width="1.6"';
    let s = '<rect x="' + X(0) + '" y="' + Y(0) + '" width="' + L * S + '" height="' + W * S + '" ' + ln + '/><line x1="' + X(L / 2) + '" y1="' + Y(0) + '" x2="' + X(L / 2) + '" y2="' + Y(W) + '" stroke="' + C.line + '" stroke-width="1.6"/><circle cx="' + X(L / 2) + '" cy="' + Y(W / 2) + '" r="' + 9.15 * S + '" ' + ln + '/>';
    [0, 1].forEach((e) => { const gx = e ? L : 0, sg = e ? -1 : 1, ex = (d) => X(gx + sg * d); s += '<rect x="' + Math.min(ex(0), ex(16.5)) + '" y="' + Y(13.84) + '" width="' + 16.5 * S + '" height="' + 40.32 * S + '" ' + ln + '/><rect x="' + Math.min(ex(0), ex(5.5)) + '" y="' + Y(24.84) + '" width="' + 5.5 * S + '" height="' + 18.32 * S + '" ' + ln + '/>'; });
    return s;
  }
  const dot = (q, o) => {
    o = o || {}; const col = q.side === 'us' ? C.us : C.them, r = o.r || 11;
    return '<g transform="translate(' + X(q.x).toFixed(1) + ',' + Y(q.y).toFixed(1) + ')"><circle r="' + r + '" fill="' + (o.fill || col) + '" stroke="' + (o.stroke || '#fff') + '" stroke-width="' + (o.sw || 1.8) + '"/>' + (o.label !== false ? '<text y="3.6" text-anchor="middle" font-size="10.5" font-weight="800" fill="#fff">' + (q.num || '') + '</text>' : '') + '</g>';
  };
  const svgWrap = (inner, label) => '<svg class="pa-svg" viewBox="0 0 ' + VW + ' ' + VH + '" role="img" aria-label="' + esc(label) + '" xmlns="http://www.w3.org/2000/svg">' + inner + '</svg>';

  function drawControl(S0, ctl) {
    const img = controlImage(ctl);
    let s = img ? '<image href="' + img + '" x="' + X(0) + '" y="' + Y(0) + '" width="' + L * S + '" height="' + W * S + '" preserveAspectRatio="none" style="image-rendering:auto"/>' : '<rect x="' + X(0) + '" y="' + Y(0) + '" width="' + L * S + '" height="' + W * S + '" fill="#6b7a70"/>';
    s += pitchBase().replace(/rgba\(255,255,255,\.55\)/g, 'rgba(0,0,0,.45)');
    // how far the nearest opponent is: a ring of free space round each of ours, gold when there is real room
    ctl.free.forEach((f) => { const r = clamp(f.free, 0, 9) * S; s += '<circle cx="' + X(f.q.x).toFixed(1) + '" cy="' + Y(f.q.y).toFixed(1) + '" r="' + r.toFixed(1) + '" fill="none" stroke="' + (f.free >= 6 ? C.gold : 'rgba(255,255,255,.55)') + '" stroke-width="' + (f.free >= 6 ? 2.2 : 1) + '" stroke-dasharray="' + (f.free >= 6 ? '0' : '4 4') + '" opacity="' + (f.free >= 6 ? 0.9 : 0.45) + '"/>'; });
    if (ctl.defending) s += '<circle cx="' + X(S0.ball.x) + '" cy="' + Y(S0.ball.y) + '" r="' + ctl.trig * S + '" fill="rgba(255,213,74,.06)" stroke="' + C.gold + '" stroke-width="1.6" stroke-dasharray="7 5"/><text x="' + X(S0.ball.x) + '" y="' + (Y(S0.ball.y) - ctl.trig * S - 6) + '" text-anchor="middle" font-size="12" font-weight="800" fill="#7a5d00">press trigger ' + ctl.trig.toFixed(0) + ' m</text>';
    S0.them.forEach((q) => { s += dot(q, { r: 9, fill: C.them, sw: 1.5 }); });
    S0.us.forEach((q) => { s += dot(q); });
    s += '<circle cx="' + X(S0.ball.x) + '" cy="' + Y(S0.ball.y) + '" r="6.5" fill="#fff" stroke="#111" stroke-width="2"/>';
    return svgWrap(s, 'Pitch control and free space');
  }
  function drawNumbers(S0, zs, ln) {
    let s = '<rect x="' + X(0) + '" y="' + Y(0) + '" width="' + L * S + '" height="' + W * S + '" fill="#2d6a3e"/>';
    zs.forEach((z) => {
      const d = z.us - z.them, a = clamp(Math.abs(d) / 3, 0, 1) * 0.7, col = d > 0 ? C.us : d < 0 ? C.them : '#ffffff';
      s += '<rect x="' + X(z.x0).toFixed(1) + '" y="' + Y(z.y0).toFixed(1) + '" width="' + ((z.x1 - z.x0) * S).toFixed(1) + '" height="' + ((z.y1 - z.y0) * S).toFixed(1) + '" fill="' + col + '" fill-opacity="' + (d === 0 ? 0.04 : a).toFixed(2) + '" stroke="rgba(255,255,255,.22)"/>';
      if (z.us + z.them > 0) s += '<text x="' + X((z.x0 + z.x1) / 2).toFixed(1) + '" y="' + (Y(z.y0) + 22).toFixed(1) + '" text-anchor="middle" font-size="17" font-weight="800" fill="#fff" stroke="rgba(0,0,0,.55)" stroke-width="3" paint-order="stroke">' + z.us + ' v ' + z.them + '</text>';
    });
    // zone 14 and the half-spaces, where the final-third chances come from
    if (S0.ph === 'final' || S0.ph === 'midfield') { s += '<rect x="' + X(L - 16.5 - 15) + '" y="' + Y(W / 2 - 13.5) + '" width="' + 15 * S + '" height="' + 27 * S + '" fill="rgba(255,213,74,.12)" stroke="' + C.gold + '" stroke-dasharray="5 4"/><text x="' + X(L - 16.5 - 7.5) + '" y="' + (Y(W / 2 - 13.5) + 15) + '" text-anchor="middle" font-size="12" font-weight="800" fill="' + C.gold + '">zone 14</text>'; }
    s += pitchBase();
    // lanes from the man on the ball: open ones solid, blocked ones dotted red
    ln.forEach((l) => {
      const col = l.open ? (l.pref ? C.gold : '#ffffff') : C.them;
      s += '<line x1="' + X(l.a.x).toFixed(1) + '" y1="' + Y(l.a.y).toFixed(1) + '" x2="' + X(l.b.x).toFixed(1) + '" y2="' + Y(l.b.y).toFixed(1) + '" stroke="' + col + '" stroke-width="' + (l.open ? (l.pref ? 3.2 : 2.2) : 1.4) + '" stroke-dasharray="' + (l.open ? '0' : '3 6') + '" opacity="' + (l.open ? 0.9 : 0.55) + '"/>';
    });
    S0.them.forEach((q) => { s += dot(q, { r: 9, fill: C.them, sw: 1.5 }); });
    S0.us.forEach((q) => { s += dot(q, q === S0.carrier ? { stroke: '#fff', sw: 3.2 } : {}); });
    s += '<circle cx="' + (X(S0.ball.x) + 12) + '" cy="' + (Y(S0.ball.y) + 11) + '" r="5.5" fill="#fff" stroke="#111" stroke-width="1.6"/>';
    return svgWrap(s, 'Numbers in each zone and the passing lanes');
  }
  function drawLines(S0, fm) {
    let s = '<rect x="' + X(0) + '" y="' + Y(0) + '" width="' + L * S + '" height="' + W * S + '" fill="#2d6a3e"/>' + pitchBase();
    const poly = (h, col, op) => (h.length >= 3 ? '<polygon points="' + h.map((q) => X(q.x).toFixed(1) + ',' + Y(q.y).toFixed(1)).join(' ') + '" fill="' + col + '" fill-opacity="' + op + '" stroke="' + col + '" stroke-width="2" stroke-linejoin="round"/>' : (h.length === 2 ? '<line x1="' + X(h[0].x) + '" y1="' + Y(h[0].y) + '" x2="' + X(h[1].x) + '" y2="' + Y(h[1].y) + '" stroke="' + col + '" stroke-width="6" stroke-linecap="round" opacity="' + op + '"/>' : ''));
    const draw = (m, col, op, mine) => {
      Object.keys(LINES).forEach((k) => { if (m[k]) s += poly(m[k].hull, col, op); });
      const ks = Object.keys(LINES).filter((k) => m[k]).sort((a, b) => m[a].cx - m[b].cx);
      if (ks.length > 1) s += '<polyline points="' + ks.map((k) => X(m[k].cx).toFixed(1) + ',' + Y(m[k].cy).toFixed(1)).join(' ') + '" fill="none" stroke="' + (mine ? '#ff4d4d' : '#ffb3a8') + '" stroke-width="' + (mine ? 4 : 2.5) + '" stroke-linecap="round"' + (mine ? '' : ' stroke-dasharray="6 5"') + '/>';
      ks.forEach((k) => { s += '<circle cx="' + X(m[k].cx).toFixed(1) + '" cy="' + Y(m[k].cy).toFixed(1) + '" r="5" fill="#fff" stroke="#111"/>'; if (mine) s += '<text x="' + X(m[k].cx).toFixed(1) + '" y="' + (Math.min.apply(null, m[k].hull.map((q) => Y(q.y))) - 18).toFixed(1) + '" text-anchor="middle" font-size="12" font-weight="800" fill="#fff" stroke="rgba(0,0,0,.6)" stroke-width="3" paint-order="stroke">' + (k === 'defence' ? 'back ' : k === 'midfield' ? 'mid ' : 'front ') + m[k].n + ' · ' + m[k].cx.toFixed(0) + ' m</text>'; });
    };
    draw(fm.them, C.them, 0.16, false); draw(fm.us, C.us, 0.32, true);
    S0.them.forEach((q) => { s += dot(q, { r: 8, fill: C.them, sw: 1.3, label: false }); });
    S0.us.forEach((q) => { s += dot(q, { r: 9.5, label: true }); });
    // the offside line: the last outfield man of the side without the ball, as a thin line across the pitch
    const off = S0.ours ? fm.them.last : fm.us.last; if (off > 0 && off < L) s += '<line x1="' + X(off) + '" y1="' + Y(0) + '" x2="' + X(off) + '" y2="' + Y(W) + '" stroke="' + C.gold + '" stroke-width="1.8" stroke-dasharray="9 6"/><text x="' + (X(off) + 5) + '" y="' + (Y(0) + 14) + '" font-size="11" font-weight="800" fill="' + C.gold + '">offside line</text>';
    return svgWrap(s, 'Formation lines');
  }

  // ---------- what the plan chose, in words ----------
  function choices(team, ph) {
    const pl = FM.planGet(team), ch = (pl.team && pl.team[ph]) || {}, out = [];
    (FM.PLAN_TEAM[ph] || []).forEach((t) => { const v = ch[t.key]; if (v == null || v === 'std') return; const op = t.opts.find((x) => x.v === v); if (op) out.push({ key: t.key, label: t.label, option: op.label }); });
    return out;
  }
  const DIAL_PHASE = { without: ['line', 'press', 'counterPress', 'tackle', 'trap'], attack: ['buildDirect', 'directness', 'width', 'tempo', 'risk', 'finalRisk', 'dribble', 'shootRange', 'shootFreedom'] };
  function dialsUsed(team, ph) { const ids = OUR_BALL.indexOf(ph) >= 0 ? DIAL_PHASE.attack : DIAL_PHASE.without, d = team.dials || {}; return ids.filter((i) => d[i] != null).map((i) => FM.DIAL_BY[i].label + ' ' + FM.dialShow(i, d[i])); }

  // ---------- the readings: what each picture is telling you, in this phase, for this plan ----------
  const pc = (v) => Math.round(v * 100) + '%';
  function readControl(S0, ctl, fm) {
    const out = [], ph = S0.ph, free = ctl.free.filter((f) => f.q.group !== 'GK').sort((a, b) => b.free - a.free), top = free[0], tight = free.filter((f) => f.free < 3).length;
    out.push('Your side controls <b>' + pc(ctl.pct) + '</b> of the pitch in this phase (' + pc(ctl.ownPct) + ' of your own third, ' + pc(ctl.finalPct) + ' of the third you are attacking). ' + (ctl.pct > 0.55 ? 'That is a clear territorial edge.' : ctl.pct > 0.45 ? 'That is an even contest for space.' : 'They hold more of the pitch than you do here.'));
    if (S0.ours) {
      const pocket = (() => { let best = null; const nx = ctl.nx, RES = 3; for (let j = 0; j < ctl.ny; j += 6) for (let i = Math.floor(nx * 0.55); i < nx; i += 6) { const c = ctl.grid[j * nx + i], x = (i + 0.5) / RES, y = (j + 0.5) / RES, nearT = S0.them.reduce((m, o) => Math.min(m, Math.hypot(o.x - x, o.y - y)), 99); const v = c * 0.6 + Math.min(nearT, 12) / 12 * 0.4 - Math.abs(y - W / 2) / W * 0.2; if (!best || v > best.v) best = { v, x, y, c, nearT }; } return best; })();
      if (pocket) out.push('The best pocket of space you could play into is in <b>' + chanName(pocket.y) + ' of ' + thirdName(pocket.x) + '</b>, about ' + (L - pocket.x).toFixed(0) + ' m from goal: you reach it first and the nearest defender is ' + pocket.nearT.toFixed(0) + ' m away.');
    } else {
      out.push('Gold dashed circle: your <b>press trigger</b> (' + ctl.trig.toFixed(0) + ' m from the ball). Only your players inside it go at the ball. ' + (S0.dials.press ? 'You have moved it ' + (S0.dials.press > 0 ? 'out' : 'in') + ' by ' + Math.abs(S0.dials.press) + ' m with the press dial.' : 'Raise "Pressing" or the press dial and it grows; the control map then shifts toward the ball.'));
    }
    if (!S0.ours) {
      const th = S0.them.filter((q) => q.group !== 'GK').map((q) => ({ q, free: S0.us.reduce((m, o) => Math.min(m, dist(q, o)), 99) })).sort((a, b) => b.free - a.free), t0 = th[0];
      if (t0) out.push('Most dangerous free man of theirs: <b>' + (t0.q.p ? sname(t0.q.p) + ' ' : '') + '(' + t0.q.num + ')</b> in the ' + chanName(t0.q.y) + ' of ' + thirdName(t0.q.x) + ', ' + t0.free.toFixed(1) + ' m from your nearest player. ' + (t0.free > 8 ? 'Nobody is picking him up: a pass to him turns your press.' : 'He is covered.'));
    } else if (top) out.push('Most free: <b>' + sname(top.q.p || { name: '' }) + ' (' + top.q.num + ')</b> with ' + top.free.toFixed(1) + ' m to the nearest opponent' + (free[1] ? ', then ' + sname(free[1].q.p || { name: '' }) + ' (' + free[1].q.num + ') with ' + free[1].free.toFixed(1) + ' m' : '') + '. ' + (tight >= 5 ? tight + ' of your outfield players have an opponent within 3 m, so passes will be tight.' : tight === 0 ? 'Nobody is tightly marked.' : tight + ' of your players are tightly marked.'));
    if (S0.ph === 'transDef') out.push('Counter-press is at <b>' + pc(S0.tac.counterPress == null ? 0.5 : S0.tac.counterPress) + '</b>: it sets how soon your players react after losing the ball, which is why the nearest ones reach the ball first.');
    return out;
  }
  function readNumbers(S0, zs, ln, ov) {
    const out = [], ph = S0.ph;
    if (!ov.best) out.push('<b>No real overload anywhere</b>: no zone has two or more of yours and more than theirs. ' + (S0.ours ? 'You will have to win a duel to get through, or move players together (a full-back inside, a winger drifting in, a midfielder dropping) to create one.' : 'They have no easy numbers either.'));
    if (ov.best) out.push('Biggest overload: <b>' + ov.best.us + ' v ' + ov.best.them + ' in the ' + zoneName(ov.best) + '</b>. ' + (ov.best.diff >= 2 ? 'Two or more extra players is where a one-touch combination beats the defenders without a dribble.' : 'One extra player is a start, but a good defender can still cover it.'));
    if (ov.worst && ov.worst.diff < 0) out.push('Biggest deficit: <b>' + ov.worst.us + ' v ' + ov.worst.them + ' in the ' + zoneName(ov.worst) + '</b>. ' + (S0.ours ? 'Avoid forcing the ball there.' : 'They can use that area against you: cover it or press before they get there.'));
    const r = 14, near = (side) => S0.us.concat(S0.them).filter((q) => q.side === side && dist(q, S0.ball) < r).length, nu = near('us'), nt = near('them');
    out.push('Within ' + r + ' m of the ball it is <b>' + nu + ' v ' + nt + '</b>' + (nu > nt ? ': local superiority, so a quick combination is on.' : nu < nt ? ': you are outnumbered round the ball, so play away from it or play it quickly out of there.' : ': level, so the first touch decides it.'));
    const ahead = S0.us.filter((q) => q.group !== 'GK' && q.x > S0.ball.x + 2).length, behind = S0.them.filter((q) => q.group !== 'GK' && q.x > S0.ball.x + 2).length;
    if (S0.ours) out.push('Ahead of the ball: <b>' + ahead + ' of yours against ' + behind + ' of theirs</b> between the ball and their goal.');
    if (ln.length) { const open = ln.filter((l) => l.open), pref = open.filter((l) => l.pref); out.push('Passing lanes from the man on the ball: <b>' + open.length + ' open of ' + ln.length + '</b> that fit this phase (solid), the rest blocked (dotted red)' + (pref.length ? '; ' + pref.length + ' of the open ones use the route you chose, in gold' : '') + '.'); }
    return out;
  }
  function readLines(S0, fm) {
    const out = [], u = fm.us, t = fm.them, gap = (a, b) => (u[a] && u[b] ? Math.abs(u[b].cx - u[a].cx) : null), g1 = gap('defence', 'midfield'), g2 = gap('midfield', 'attack');
    const word = (g) => (g == null ? '' : g < 12 ? 'very tight' : g < 20 ? 'well connected' : g < 28 ? 'getting stretched' : 'too far apart: the ball cannot link them');
    if (g1 != null) out.push('Gap from your back line to your midfield: <b>' + g1.toFixed(0) + ' m</b> (' + word(g1) + '). ' + (g2 != null ? 'Midfield to attack: <b>' + g2.toFixed(0) + ' m</b> (' + word(g2) + ').' : ''));
    out.push('Team length <b>' + u.length.toFixed(0) + ' m</b> and width <b>' + u.width.toFixed(0) + ' m</b>; the shape covers ' + u.area.toFixed(0) + ' m² (they cover ' + t.area.toFixed(0) + ' m²). ' + (u.length > 48 ? 'That is long: space opens between the lines.' : u.length < 30 ? 'That is a compact block: hard to play through, but little room to attack into.' : 'A normal length.'));
    const off = S0.ours ? t.last : u.last;
    if (S0.ours) out.push('Their last outfield defender stands <b>' + (L - off).toFixed(0) + ' m from his goal line</b>' + (u.attack ? '; your front line is at ' + u.attack.cx.toFixed(0) + ' m, ' + (Math.abs(off - u.attack.cx)).toFixed(0) + ' m from the offside line' : '') + '. ' + (L - off > 38 ? 'A high line leaves room behind it for a ball over the top.' : 'A deep line gives you little space behind but lots in front of it.'));
    else out.push('Your last outfield defender stands <b>' + off.toFixed(0) + ' m from your goal line</b>. ' + (off > 34 ? 'High line: it squeezes the pitch but leaves space behind.' : off < 22 ? 'A deep line keeps the space behind small but lets them play in front.' : 'A mid-height line.') + (S0.dials.line ? ' (The line dial has moved it ' + (S0.dials.line > 0 ? 'up' : 'back') + ' ' + Math.abs(S0.dials.line) + ' m.)' : ''));
    out.push('Red line joins the centres of your three lines: the flatter it runs across the pitch the more evenly your lines are spread, and a bend towards one flank means the team is leaning that way.');
    return out;
  }

  // ---------- the section ----------
  const PREV = {};
  FM.planAnalysis = function (team, ph, hooks) {
    const S0 = snapshot(team, ph, hooks), ctl = control(S0), zs = zones(S0), ln = lanes(S0, team), ov = overloads(zs), fm = formation(S0);
    const metrics = { ctl: ctl.pct, fin: ctl.finalPct, own: ctl.ownPct, over: ov.best ? ov.best.diff : 0, open: ln.filter((l) => l.open).length, length: fm.us.length, width: fm.us.width, g1: fm.us.defence && fm.us.midfield ? Math.abs(fm.us.midfield.cx - fm.us.defence.cx) : 0 };
    const sig = JSON.stringify(S0.us.map((q) => [Math.round(q.x), Math.round(q.y)])) + JSON.stringify(S0.them.map((q) => [Math.round(q.x), Math.round(q.y)])) + JSON.stringify(team.dials || {}) + JSON.stringify(team.tactics ? [team.tactics.pressing, team.tactics.counterPress] : 0), key = team.id + ':' + ph, rec = PREV[key];
    let prev = null; if (rec && rec.sig !== sig) { prev = rec.metrics; PREV[key] = { sig, metrics, before: rec.metrics }; } else if (!rec) PREV[key] = { sig, metrics, before: null }; else prev = rec.before;
    return { S0, ctl, zs, ln, ov, fm, metrics, prev, ch: choices(team, ph), dl: dialsUsed(team, ph) };
  };
  const chip = (label, now, before, fmt, goodUp) => { if (before == null) return ''; const d = now - before; if (Math.abs(d) < 0.005) return ''; const good = goodUp ? d > 0 : d < 0; return '<span class="pa-chip ' + (good ? 'up' : 'down') + '">' + esc(label) + ' ' + (d > 0 ? '+' : '') + fmt(d) + '</span>'; };
  FM.planAnalysisHtml = function (team, ph, hooks) {
    const A = FM.planAnalysis(team, ph, hooks), S0 = A.S0, info = FM.planPhase(ph), m = A.metrics, p = A.prev;
    const ul = (arr) => '<ul>' + arr.map((x) => '<li>' + x + '</li>').join('') + '</ul>';
    const pct = (v) => Math.round(v * 100) + ' pts', mt = (v) => v.toFixed(0) + ' m';
    const why = A.ch.length || A.dl.length ? '<p class="pa-why"><b>Built from your choices for this phase:</b> ' + A.ch.map((c) => esc(c.label) + ': ' + esc(c.option)).concat(A.dl.map(esc)).join('; ') + '. Change any of them and every picture below is recalculated.</p>' : '<p class="pa-why">Nothing has been chosen for this phase yet, so these pictures show your roles\' own shape. Make a choice above or move a dial and they change.</p>';
    const deltas = p ? '<div class="pa-deltas">Since your last change: ' + [chip('space', m.ctl, p.ctl, pct, true), chip('final third', m.fin, p.fin, pct, true), chip('open lanes', m.open, p.open, (d) => d.toFixed(0), true), chip('team length', m.length, p.length, mt, false), chip('best overload', m.over, p.over, (d) => d.toFixed(0), true)].filter(Boolean).join(' ') + '</div>' : '';
    const note = S0.generic ? '<p class="pa-note">No next opponent is scouted, so the other side is shown as a standard 4-4-2 block.</p>' : '<p class="pa-note">Against <b>' + esc(S0.opp ? S0.opp.name : 'the next opponent') + '</b>, standing as they do in the phase that answers yours.</p>';
    return '<div class="pa"><h4>Analysis: ' + esc(info.name.toLowerCase()) + '</h4>' + why + note + deltas +
      '<article class="pa-card"><h5>1. Space and free men</h5><div class="pa-fig">' + drawControl(S0, A.ctl) + '</div><div class="pa-legend"><span><i style="background:#3E54B2"></i>you reach it first</span><span><i style="background:#ECE4DE"></i>contested</span><span><i style="background:#B22432"></i>they reach it first</span><span><i class="ring"></i>room round a player (gold: over 6 m)</span></div>' +
      '<p class="pa-what"><b>What this tells you.</b> Each patch of grass is coloured by which side would get there first, given where everybody stands, how quick each player is and how soon he reacts. It is a map of <i>space you own</i>, not of where players are. The rings show how much room each of your players has before an opponent is on him: a gold ring means he can take a pass and turn.</p>' + ul(readControl(S0, A.ctl, A.fm)) + '</article>' +
      '<article class="pa-card"><h5>2. Numbers and passing lanes</h5><div class="pa-fig">' + drawNumbers(S0, A.zs, A.ln) + '</div><div class="pa-legend"><span><i style="background:#4C8DFF"></i>you have more</span><span><i style="background:#E5574B"></i>they have more</span><span><i class="ln"></i>open pass</span><span><i class="ln gold"></i>open, on your chosen route</span><span><i class="ln red"></i>blocked pass</span></div>' +
      '<p class="pa-what"><b>What this tells you.</b> The pitch is cut into 15 zones and each shows your players against theirs. Blue zones are overloads, where an extra player lets you pass round a defender; red zones are where you are outnumbered. The lines are the passes the man on the ball (thick ring) could play in this phase: solid if no opponent is in the way, dotted red if one is. Short play keeps to short passes and direct play to long ones.</p>' + ul(readNumbers(S0, A.zs, A.ln, A.ov)) + '</article>' +
      '<article class="pa-card"><h5>3. Lines and shape</h5><div class="pa-fig">' + drawLines(S0, A.fm) + '</div><div class="pa-legend"><span><i style="background:#4C8DFF"></i>your lines</span><span><i style="background:#E5574B"></i>their lines</span><span><i class="ln red"></i>joins the line centres</span><span><i class="ln gold"></i>offside line</span></div>' +
      '<p class="pa-what"><b>What this tells you.</b> The shaded shapes wrap each unit: back line, midfield and attack. The distance between the lines is how easily the ball can travel from one to the next; the length and width are how much of the pitch you cover. Too far apart and the lines cannot support each other; too close and there is nothing to attack or defend in front of them.</p>' + ul(readLines(S0, A.fm)) + '</article></div>';
  };
})();
