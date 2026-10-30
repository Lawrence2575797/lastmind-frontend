// The tactics pages for the plan (plan.js): one page for each phase of play. Players can be dragged on them to where they should stand. Each page has
//   the pitch        the players as cards where this phase puts them; pick a card to give that player instructions for the phase
//   team approach    a few plain choices for the whole team in this phase
//   player           that player's role and his choices for this phase
//   pitch plans      zones (an area tagged "press here", "play safe here"...) and triggers ("when the ball goes to their full-back, the wingers press"),
//                    both made from menus, and each shown back as a sentence
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const PW = 544, PH = 840;   // 8 drawing units a metre: the pitch is drawn at its true 68 x 105 proportions
  const TAB_PHASES = { build: ['build'], midfield: ['midfield'], final: ['final'], transdef: ['transDef'], organised: ['defence', 'press'], transatt: ['transAtt'] };
  const SIDE_OF = { build: 'with', midfield: 'with', final: 'with', transAtt: 'with', transDef: 'without', defence: 'without', press: 'without' };
  const TAG_COL = { press: '#FF6B4A', sit: '#9FB0BF', protect: '#5EA8FF', safe: '#6FD08C', risk: '#FFA94D', overload: '#B58CFF', target: '#FFD54A', switch: '#4FD1C5', keep: '#B8E986' };
  const UI = { sel: null, mode: 'view', cells: [], sub: null, draft: {}, openTog: {}, showOpp: false, ovl: (() => { const d = { space: false, lanes: false, lines: false, moves: false, path: false }; try { return Object.assign(d, JSON.parse(localStorage.getItem('lm_pl_ovl') || '{}')); } catch (e) { return d; } })() };
  const sname = (p) => { const n = p.name.split(' ').slice(1).join(' ') || p.name; return n.length > 11 ? n.slice(0, 10) + '.' : n; };

  // ---------- the pitch ----------
  // Drawn to the true proportions of a 68 x 105 m pitch (8 drawing units a metre both ways), so every marking is the right shape at every size and a player's place on the
  // page is his place on the pitch. Positions are kept as depth (d, 0 = our goal line) and width (w), as before.
  const SC = PW / 68;
  let NOISE = null;
  function noiseTile() {
    if (NOISE !== null) return NOISE;
    try {
      const c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d'), im = x.createImageData(96, 96); let r = 20261027;
      for (let i = 0; i < im.data.length; i += 4) { r = (r * 1664525 + 1013904223) >>> 0; const v = r >>> 24, l = v & 1 ? 255 : 0; im.data[i] = im.data[i + 1] = im.data[i + 2] = l; im.data[i + 3] = (v >> 1) % 14; }
      x.putImageData(im, 0, 0); NOISE = c.toDataURL('image/png');
    } catch (e) { NOISE = ''; }
    return NOISE;
  }
  function surface(id) {
    let s = `<defs><pattern id="${id}n" width="96" height="96" patternUnits="userSpaceOnUse">${noiseTile() ? `<image href="${noiseTile()}" width="96" height="96"/>` : ''}</pattern>
      <marker id="${id}a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#FFD54A"/></marker></defs>`;
    s += `<rect width="${PW}" height="${PH}" fill="#3A4A40"/>`;   // a muted charcoal-green that sits on the charcoal page
    for (let i = 0; i < 15; i++) s += `<rect y="${(i * 7 * SC).toFixed(1)}" width="${PW}" height="${(7 * SC).toFixed(1)}" fill="${i % 2 ? '#000' : '#fff'}" fill-opacity="${i % 2 ? 0.045 : 0.035}"/>`;
    if (noiseTile()) s += `<rect width="${PW}" height="${PH}" fill="url(#${id}n)" opacity=".3"/>`;
    return s;
  }
  function markings() {
    const m = SC, cx = PW / 2, ln = 'fill="none" stroke="#F4F8F1" stroke-opacity=".8" stroke-width="1.3"', hw = 20.16 * m;
    let s = `<g ${ln}><rect x=".65" y=".65" width="${PW - 1.3}" height="${PH - 1.3}"/><line x1="0" y1="${PH / 2}" x2="${PW}" y2="${PH / 2}"/><circle cx="${cx}" cy="${PH / 2}" r="${(9.15 * m).toFixed(2)}"/>`;
    [0, 1].forEach((bot) => {
      const gy = bot ? PH : 0, sg = bot ? -1 : 1, y = (d) => (gy + sg * d * m).toFixed(2), r = 9.15 * m, dx = Math.sqrt(9.15 * 9.15 - 5.5 * 5.5) * m;
      s += `<rect x="${(cx - hw).toFixed(2)}" y="${bot ? y(16.5) : 0.65}" width="${(hw * 2).toFixed(2)}" height="${(16.5 * m - 0.65).toFixed(2)}"/><rect x="${(cx - 9.16 * m).toFixed(2)}" y="${bot ? y(5.5) : 0.65}" width="${(18.32 * m).toFixed(2)}" height="${(5.5 * m - 0.65).toFixed(2)}"/>`;
      s += `<path d="M${(cx - dx).toFixed(2)} ${y(16.5)} A${r.toFixed(2)} ${r.toFixed(2)} 0 0 ${bot ? 1 : 0} ${(cx + dx).toFixed(2)} ${y(16.5)}"/>`;
      s += `<path d="M${(3.66 * -m + cx).toFixed(2)} ${(gy).toFixed(2)} v${(sg * -2 * m).toFixed(2)} h${(7.32 * m).toFixed(2)} v${(sg * 2 * m).toFixed(2)}" stroke-opacity=".5"/>`;
    });
    s += `</g><g fill="#F4F8F1" fill-opacity=".85"><circle cx="${cx}" cy="${PH / 2}" r="2.2"/><circle cx="${cx}" cy="${(11 * m).toFixed(1)}" r="2"/><circle cx="${cx}" cy="${(PH - 11 * m).toFixed(1)}" r="2"/></g>`;
    const c = 1 * m; s += `<g ${ln}><path d="M${c} 0.65 A${c} ${c} 0 0 0 0.65 ${c}"/><path d="M${PW - c} 0.65 A${c} ${c} 0 0 1 ${PW - 0.65} ${c}"/><path d="M0.65 ${PH - c} A${c} ${c} 0 0 0 ${c} ${PH - 0.65}"/><path d="M${PW - 0.65} ${PH - c} A${c} ${c} 0 0 0 ${PW - c} ${PH - 0.65}"/></g>`;
    return s;
  }
  // a top-down shirt: body, two sleeves and the collar, with the number on the chest
  const SHIRT = 'M-8.5,-12.5 L-3,-14.2 Q0,-10.6 3,-14.2 L8.5,-12.5 L18,-5.2 L13.2,2.2 L8.5,-1.2 L8.5,12.5 L-8.5,12.5 L-8.5,-1.2 L-13.2,2.2 L-18,-5.2 Z';
  function shirt(kit, num, o) {
    o = o || {};
    return `<path d="${SHIRT}" transform="translate(1.6,2.6)" fill="#06150b" fill-opacity="${o.ghost ? 0.12 : 0.3}"/><path d="${SHIRT}" fill="${kit.shirt}" fill-opacity="${o.ghost ? 0.88 : 1}" stroke="${o.stroke || 'rgba(255,255,255,.88)'}" stroke-width="${o.sw || 1}" stroke-linejoin="round"${o.dash ? ' stroke-dasharray="3 2"' : ''}/><text y="7.2" text-anchor="middle" font-size="${String(num).length > 1 ? 12.5 : 14}" font-weight="800" fill="${kit.number}" style="font-variant-numeric:tabular-nums">${esc(num)}</text>`;
  }
  FM.planGfx = { surface, markings, shirt, PW, PH };   // the same pitch and shirts are drawn on the squad, substitution and test boards (main.js)
  // Labels sit under their shirt; where two would land on each other (or on another shirt) one moves to the side or above. Only the label moves, never the player.
  function labelSpots(items) {
    const placed = [], out = new Map(), hit = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
    const shirts = items.map((i) => ({ x0: i.x - 23, x1: i.x + 23, y0: i.y - 20, y1: i.y + 18, k: i.k }));
    items.slice().sort((a, b) => a.y - b.y || a.x - b.x).forEach((it) => {
      const w = Math.max(it.name.length * 6.6, 20) + 4, opts = [
        { dx: 0, ny: 33, ry: 45, a: 'middle', box: { x0: it.x - w / 2, x1: it.x + w / 2, y0: it.y + 21, y1: it.y + 48 } },
        { dx: 28, ny: 1, ry: 13, a: 'start', box: { x0: it.x + 26, x1: it.x + 28 + w, y0: it.y - 11, y1: it.y + 16 } },
        { dx: -28, ny: 1, ry: 13, a: 'end', box: { x0: it.x - 28 - w, x1: it.x - 26, y0: it.y - 11, y1: it.y + 16 } },
        { dx: 0, ny: -33, ry: -21, a: 'middle', box: { x0: it.x - w / 2, x1: it.x + w / 2, y0: it.y - 48, y1: it.y - 21 } },
      ];
      const ok = (o) => o.box.x0 > -22 && o.box.x1 < PW + 22 && !placed.some((b) => hit(o.box, b)) && !shirts.some((b) => b.k !== it.k && hit(o.box, b));
      const pick = opts.find(ok) || opts[0]; placed.push(pick.box); out.set(it.k, pick);
    });
    return out;
  }
  // the optional overlays, built from the same analysis the pages below use (plan_analysis.js) and from the page positions themselves
  const OVL = [['space', 'Space control'], ['lanes', 'Passing lanes'], ['lines', 'Lines and press'], ['path', 'Selected player']];
  const MOVE_NEXT = { build: 'buildEnd', midfield: 'final', transAtt: 'transAttEnd', transDef: 'transDefEnd', without: 'withoutEnd', press: 'without' };
  const CHAIN = { with: ['build', 'buildEnd', 'midfield', 'final'], without: ['press', 'without', 'withoutEnd'] };
  function overlays(team, ph, A) {
    const o = UI.ovl, eng = FM.planPhase(ph).eng[0], mx = SC, tx = (y) => (y / 68 * PW).toFixed(1), ty = (x) => ((1 - x / 105) * PH).toFixed(1);
    let under = '', over = '';
    if (o.space && A) { const img = FM.planControlPortrait(A.ctl); if (img) under += `<image href="${img}" x="0" y="0" width="${PW}" height="${PH}" preserveAspectRatio="none" opacity=".42" pointer-events="none"/>`; }
    if (o.lines && A) {
      const lab = (x, y, t, col, a) => `<text x="${x}" y="${y}" text-anchor="${a || 'start'}" font-size="9.5" font-weight="700" fill="${col}" stroke="rgba(6,21,11,.6)" stroke-width="2.4" style="paint-order:stroke">${esc(t)}</text>`;
      const names = { defence: 'back line', midfield: 'midfield', attack: 'front line' };
      // the shape of each line, and the line that joins their centres
      const poly = (h, col, op) => (h.length >= 3 ? `<polygon points="${h.map((q) => tx(q.y) + ',' + ty(q.x)).join(' ')}" fill="${col}" fill-opacity="${op}" stroke="${col}" stroke-width="1.6" stroke-linejoin="round"/>` : (h.length === 2 ? `<line x1="${tx(h[0].y)}" y1="${ty(h[0].x)}" x2="${tx(h[1].y)}" y2="${ty(h[1].x)}" stroke="${col}" stroke-width="5" stroke-linecap="round" opacity="${op * 3}"/>` : ''));
      Object.keys(names).forEach((k) => { if (A.fm.them[k]) under += poly(A.fm.them[k].hull, '#FF7B6B', 0.1); });
      Object.keys(names).forEach((k) => { if (A.fm.us[k]) under += poly(A.fm.us[k].hull, '#7FD0FF', 0.2); });
      { const ks = Object.keys(names).filter((k) => A.fm.us[k]).sort((a, b) => A.fm.us[a].cx - A.fm.us[b].cx); if (ks.length > 1) under += `<polyline points="${ks.map((k) => tx(A.fm.us[k].cy) + ',' + ty(A.fm.us[k].cx)).join(' ')}" fill="none" stroke="#FF6B5B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>` + ks.map((k) => `<circle cx="${tx(A.fm.us[k].cy)}" cy="${ty(A.fm.us[k].cx)}" r="4" fill="#fff" stroke="#111"/>`).join(''); }
      Object.keys(names).forEach((k) => { const u = A.fm.us[k]; if (!u) return; const ys = u.pts.map((q) => q.y), a = Math.min.apply(null, ys), b = Math.max.apply(null, ys), yy = ty(u.cx); over += `<line x1="${(+tx(a) - 14).toFixed(1)}" y1="${yy}" x2="${(+tx(b) + 14).toFixed(1)}" y2="${yy}" stroke="#7FD0FF" stroke-width="1.8" stroke-dasharray="7 4"/>` + lab((+tx(a) - 14).toFixed(1), (+yy - 4).toFixed(1), names[k] + ' ' + u.cx.toFixed(0) + ' m', '#BFE6FF'); });
      const off = A.S0.ours ? A.fm.them.last : A.fm.us.last; if (off > 0 && off < 105) over += `<line x1="0" y1="${ty(off)}" x2="${PW}" y2="${ty(off)}" stroke="#FFD54A" stroke-width="1.3" stroke-dasharray="3 4" opacity=".9"/>` + lab(PW - 4, (+ty(off) - 4).toFixed(1), 'offside line', '#FFE58A', 'end');
      if (!A.S0.ours) over += `<circle cx="${tx(A.S0.ball.y)}" cy="${ty(A.S0.ball.x)}" r="${(A.ctl.trig * mx).toFixed(1)}" fill="rgba(255,213,74,.07)" stroke="#FFD54A" stroke-width="1.3" stroke-dasharray="6 4"/>` + lab(tx(A.S0.ball.y), (+ty(A.S0.ball.x) - A.ctl.trig * mx - 4).toFixed(1), 'press trigger ' + A.ctl.trig.toFixed(0) + ' m', '#FFE58A', 'middle');
    }
    if (o.lanes && A && A.ln.length) {
      // The lanes open to the man on the ball, drawn as passes: an arrow from him to each team-mate he can find, gold for the preferred routes, white for the rest, blue when the ball goes back.
      // A pass that is blocked is shown only when it goes forward (it is the one the other side is stopping), faint and short of the receiver.
      const MK = { g: '#FFD54A', w: '#FFFFFF', b: '#8EC8FF', r: '#FF7B6B' };
      over += '<defs>' + Object.keys(MK).map((k) => `<marker id="lnA${k}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,1 L9,5 L0,9 z" fill="${MK[k]}"/></marker>`).join('') + '</defs>';
      const seg = (l, k, w, op, dash) => { const x1 = +tx(l.a.y), y1 = +ty(l.a.x), x2 = +tx(l.b.y), y2 = +ty(l.b.x), dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, a = 17 / len, b = Math.min(0.9, 22 / len); return `<line x1="${(x1 + dx * a).toFixed(1)}" y1="${(y1 + dy * a).toFixed(1)}" x2="${(x2 - dx * b).toFixed(1)}" y2="${(y2 - dy * b).toFixed(1)}" stroke="${MK[k]}" stroke-width="${w}" stroke-linecap="round" ${dash ? 'stroke-dasharray="3 5"' : ''} opacity="${op}" marker-end="url(#lnA${k})"/>`; };
      A.ln.filter((l) => !l.open && l.fwd > 6).sort((p, q) => q.fwd - p.fwd).slice(0, 3).forEach((l) => { over += seg(l, 'r', 1.3, 0.5, true); });
      A.ln.filter((l) => l.open).forEach((l) => { const k = l.pref ? 'g' : l.fwd < -4 ? 'b' : 'w'; over += seg(l, k, l.pref ? 2.8 : 1.9, 0.88, false); });
      if (A.S0.carrier) over += `<circle cx="${tx(A.S0.carrier.y)}" cy="${ty(A.S0.carrier.x)}" r="21" fill="none" stroke="#FFD54A" stroke-width="2.2"/>`;
    }
    if (false) {
      const nk = MOVE_NEXT[eng];
      if (nk) team.players.forEach((p) => { const a = FM.phasePos(team, p, eng), b = FM.phasePos(team, p, nk); if (Math.hypot((b.d - a.d) * 105, (b.w - a.w) * 68) < 3) return; const dx = (b.w - a.w) * PW, dy = -(b.d - a.d) * PH, len = Math.hypot(dx, dy), k = Math.max(0, (len - 15) / len); over += `<line x1="${(a.w * PW).toFixed(1)}" y1="${((1 - a.d) * PH).toFixed(1)}" x2="${(a.w * PW + dx * k).toFixed(1)}" y2="${((1 - a.d) * PH + dy * k).toFixed(1)}" stroke="#FFD54A" stroke-width="1.5" opacity=".9" marker-end="url(#plsa)"/>`; });
    }
    if (o.path && UI.sel) {
      const p = team.players.find((q) => q.slotKey === UI.sel), side = SIDE_OF[ph] === 'with' ? 'with' : 'without';
      if (p) {
        const pts = CHAIN[side].map((k) => ({ k, q: FM.phasePos(team, p, k) })), nm = { build: 'build', buildEnd: 'reaches midfield', midfield: 'midfield', final: 'final third', press: 'press', without: 'block', withoutEnd: 'drops' };
        over += `<polyline points="${pts.map((z) => (z.q.w * PW).toFixed(1) + ',' + ((1 - z.q.d) * PH).toFixed(1)).join(' ')}" fill="none" stroke="#FFD54A" stroke-width="2" stroke-linejoin="round" stroke-dasharray="1 0" opacity=".9"/>`;
        pts.forEach((z) => { const cur = FM.planPhase(ph).eng.indexOf(z.k) >= 0; over += `<circle cx="${(z.q.w * PW).toFixed(1)}" cy="${((1 - z.q.d) * PH).toFixed(1)}" r="${cur ? 6 : 3.6}" fill="${cur ? '#FFD54A' : '#2D6B40'}" stroke="#FFD54A" stroke-width="1.6"/><text x="${(z.q.w * PW + 9).toFixed(1)}" y="${((1 - z.q.d) * PH + 3).toFixed(1)}" font-size="9" font-weight="700" fill="#FFE58A" stroke="rgba(6,21,11,.6)" stroke-width="2.4" style="paint-order:stroke">${esc(nm[z.k] || z.k)}</text>`; });
      }
    }
    return { under, over };
  }
  function pitchSvg(team, ph, hooks, A) {
    const eng = FM.planPhase(ph).eng[0], pl = FM.planGet(team), kit = team.kit || { shirt: '#244', number: '#fff' }, id = 'plp';
    const X = (w) => (w * PW).toFixed(1), Y = (d) => ((1 - d) * PH).toFixed(1);
    const ov = overlays(team, ph, A);
    let s = surface(id) + ov.under + markings();
    // zones of this page
    pl.zones.filter((z) => z.on !== false && (z.phase === ph || (!z.phase || z.phase === 'any') && FM.PLAN_ZONE_TAG[z.tag] && FM.PLAN_ZONE_TAG[z.tag].side === SIDE_OF[ph])).forEach((z) => {
      (z.cells || []).forEach((c) => { const dp = FM.PLAN_DEPTHS[c[0]], ch = FM.PLAN_CHANNELS[c[1]], col = TAG_COL[z.tag] || '#fff'; s += `<rect x="${X(ch.lo)}" y="${Y(dp.hi)}" width="${(ch.hi - ch.lo) * PW}" height="${(dp.hi - dp.lo) * PH}" fill="${col}" fill-opacity=".22" stroke="${col}" stroke-width="1.4" stroke-dasharray="6 4"/>`; });
      const c0 = (z.cells || [])[0]; if (c0) { const dp = FM.PLAN_DEPTHS[c0[0]], ch = FM.PLAN_CHANNELS[c0[1]]; s += `<text x="${(+X(ch.lo) + 6).toFixed(0)}" y="${(+Y(dp.hi) + 14).toFixed(0)}" font-size="11" font-weight="800" fill="#fff" stroke="rgba(6,21,11,.6)" stroke-width="2.6" style="paint-order:stroke">${esc((FM.PLAN_ZONE_TAG[z.tag] || {}).name || '')}</text>`; }
    });
    pl.triggers.filter((t) => t.on !== false && t.cells && t.cells.length && (FM.PLAN_WHEN_BY[t.when] || {}).side === SIDE_OF[ph]).forEach((t) => (t.cells || []).forEach((c) => { const dp = FM.PLAN_DEPTHS[c[0]], ch = FM.PLAN_CHANNELS[c[1]]; s += `<rect x="${X(ch.lo)}" y="${Y(dp.hi)}" width="${(ch.hi - ch.lo) * PW}" height="${(dp.hi - dp.lo) * PH}" fill="none" stroke="#fff" stroke-width="1.4" stroke-dasharray="2 5"/>`; }));
    // the opposition as scouted for the next match: where they stand in the phase that answers this one
    const od = UI.showOpp && hooks.opp ? hooks.opp(eng) : null;
    // Nobody is drawn offside. Where they have the ball (we are defending), their attackers stand no nearer our goal than our second-last defender (on the line, never beyond it);
    // where we have it, our attackers stand no nearer their goal than their second-last defender. Positions placed by hand are left as they were put.
    const theyAttack = ['without', 'withoutEnd', 'press', 'transDef', 'transDefEnd'].indexOf(eng) >= 0, weAttack = ['build', 'buildEnd', 'midfield', 'final', 'transAtt', 'transAttEnd'].indexOf(eng) >= 0;
    let ourLine = null, theirLine = null;
    if (od) {
      const ours = team.players.map((p) => FM.phasePos(team, p, eng).d).sort((a, b) => a - b); ourLine = ours.length > 1 ? ours[1] : null;           // second-last of ours (our goalkeeper is the last)
      const theirs = Object.keys(od.cells).map((k) => 1 - od.cells[k].d).sort((a, b) => b - a); theirLine = theirs.length > 1 ? theirs[1] : null;  // second-last of theirs, in our space
    }
    if (od) {
      Object.keys(od.cells).forEach((slot) => {
        let c = od.cells[slot];
        const op = od.opp.players.find((q) => q.slotKey === slot);
        if (theyAttack && ourLine != null && op && op.group !== 'GK' && 1 - c.d < ourLine) c = { d: 1 - Math.min(0.97, ourLine + 0.012), w: c.w };
        // a shirt of theirs is never drawn on top of one of ours: it stands just clear of it (the way a marker stands beside the man he marks)
        if (op && op.group !== 'GK') { let px = (1 - c.d) * 105, py = (1 - c.w) * 68; for (let it = 0; it < 2; it++) team.players.forEach((p) => { const q = FM.phasePos(team, p, eng), qx = q.d * 105, qy = q.w * 68; let dx = px - qx, dy = py - qy, dd = Math.hypot(dx, dy); if (dd < 5.2) { if (dd < 0.3) { dx = 1; dy = 0; dd = 1; } px += dx / dd * (5.2 - dd); py += dy / dd * (5.2 - dd); } }); c = { d: Math.max(0.02, Math.min(0.98, 1 - px / 105)), w: Math.max(0.03, Math.min(0.97, 1 - py / 68)) }; }
        const x = (1 - c.w) * PW, y = c.d * PH;
        s += `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) scale(.82)" pointer-events="none">${shirt(od.kit, op ? op.number : '', { ghost: true, dash: true, stroke: od.kit.number })}</g>`;
      });
    }
    // the grid, when a zone is being chosen
    if (UI.mode === 'zone' || UI.mode === 'trigger') FM.PLAN_DEPTHS.forEach((dp) => FM.PLAN_CHANNELS.forEach((ch) => {
      const on = UI.cells.some((c) => c[0] === dp.k && c[1] === ch.k);
      s += `<rect class="pl-cell" data-cell="${dp.k},${ch.k}" x="${X(ch.lo)}" y="${Y(dp.hi)}" width="${(ch.hi - ch.lo) * PW}" height="${(dp.hi - dp.lo) * PH}" fill="${on ? '#FFD54A' : '#fff'}" fill-opacity="${on ? 0.38 : 0.04}" stroke="#fff" stroke-opacity=".3"/>`;
    }));
    s += ov.over;
    // the players: a shirt with his number, his name and rating beneath
    const cards = team.players.map((p) => {
      let q = FM.phasePos(team, p, eng);
      if (od && weAttack && theirLine != null && p.group !== 'GK' && !(FM.isManual && FM.isManual(team, p, eng)) && q.d > theirLine) q = { d: Math.max(0.02, theirLine - 0.012), w: q.w };
      return { p, q, k: p.slotKey, x: q.w * PW, y: (1 - q.d) * PH, name: sname(p) };
    });
    const spots = labelSpots(cards);
    cards.forEach(({ p, q }) => {
      const sel = UI.sel === p.slotKey, inj = FM.isInjured && FM.isInjured(p), nChoices = Object.keys(((pl.player[p.slotKey] || {})[ph]) || {}).length, rating = FM.playerRating ? FM.playerRating(p, p.group).toFixed(1) : '', sp = spots.get(p.slotKey);
      s += `<g class="pl-card${sel ? ' sel' : ''}" data-slot="${esc(p.slotKey)}" transform="translate(${X(q.w)},${Y(q.d)})" style="cursor:pointer"><title>${esc(p.name + ' · ' + ((FM.ROLES[p.roleId] || {}).name || '') + ': ' + ((FM.ROLES[p.roleId] || {}).desc || ''))}</title>
        <circle r="31" fill="transparent"/>
        <circle class="pl-ring" r="27" fill="rgba(242,193,78,${sel ? 0.12 : 0})" stroke="#F2C14E" stroke-width="1.7" opacity="${sel ? 1 : 0}"/>
        <g transform="scale(1.22)">${shirt(kit, p.number)}</g>
        <text x="${sp.dx}" y="${sp.ny}" text-anchor="${sp.a}" font-size="12" font-weight="650" fill="#F6F8F3" stroke="rgba(6,21,11,.55)" stroke-width="2.4" style="paint-order:stroke;letter-spacing:.01em">${esc(sname(p))}</text>
        <text x="${sp.dx}" y="${sp.ry}" text-anchor="${sp.a}" font-size="10" font-weight="500" fill="${inj ? '#FFB3B3' : '#BFD2C2'}" stroke="rgba(6,21,11,.5)" stroke-width="2" style="paint-order:stroke">${inj ? 'injured' : rating}</text>
        ${FM.isManual && FM.isManual(team, p, eng) ? `<circle cx="-16" cy="-15" r="3.6" fill="#fff" stroke="#1A232D" stroke-width="1"/>` : ''}${nChoices ? `<circle cx="16" cy="-15" r="5.6" fill="#F2C14E" stroke="#1A232D" stroke-width="1"/><text x="16" y="-12" text-anchor="middle" font-size="8" font-weight="800" fill="#1A232D">${nChoices}</text>` : ''}</g>`;
    });
    return `<svg class="pl-pitch" viewBox="-24 -26 ${PW + 48} ${PH + 52}" role="img" aria-label="Where the team stands in this phase">${s}</svg>`;
  }

  // ---------- team approach ----------
  function teamPanel(team, ph) {
    const pl = FM.planGet(team);
    return (FM.PLAN_TEAM[ph] || []).map((t) => {
      const cur = (pl.team[ph] || {})[t.key], def = t.opts.some((x) => x.v === 'std') ? 'std' : t.opts[Math.floor(t.opts.length / 2)].v;
      return `<div class="pl-tog"><div class="pl-tog-h"><b>${esc(t.label)}</b>${t.help ? `<span class="pl-help">${esc(t.help)}</span>` : ''}</div>
        <div class="pl-seg" role="group">${t.opts.map((op) => `<button type="button" class="${(cur == null ? def : cur) === op.v ? 'on' : ''}" data-team-tog="${esc(t.key)}" data-v="${esc(op.v)}">${esc(op.label)}</button>`).join('')}</div></div>`;
    }).join('');
  }

  // ---------- zones and triggers ----------
  function planItems(team, ph) {
    const pl = FM.planGet(team), side = SIDE_OF[ph];
    const zs = pl.zones.filter((z) => z.phase === ph || ((!z.phase || z.phase === 'any') && (FM.PLAN_ZONE_TAG[z.tag] || {}).side === side));
    const ts = pl.triggers.filter((t) => (FM.PLAN_WHEN_BY[t.when] || {}).side === side && ((FM.PLAN_WHEN_BY[t.when] || {}).stage ? (FM.PLAN_WHEN_BY[t.when].stage === ph) : ph !== 'transAtt' && ph !== 'transDef'));
    const stat = (x) => { const st = pl.stats && pl.stats[x.id]; return st ? `<span class="pl-stat">${st.fires ? 'Came into play ' + st.fires + (st.fires === 1 ? ' time' : ' times') + ' in the last test (' + st.n + ' runs)' : 'Never came into play in the last test (' + st.n + ' runs)'}</span>` : ''; };
    const row = (kind, x, text) => `<li class="${x.on === false ? 'off' : ''}"><span class="pl-sent">${esc(text)}${stat(x)}</span><span class="pl-item-b"><button type="button" data-item-toggle="${kind}:${x.id}">${x.on === false ? 'Off' : 'On'}</button><button type="button" data-item-del="${kind}:${x.id}" aria-label="Remove">×</button></span></li>`;
    const list = zs.map((z) => row('zone', z, FM.planZoneText(z))).concat(ts.map((t) => row('trigger', t, FM.planTriggerText(t))));
    return list.length ? `<ul class="pl-items">${list.join('')}</ul>` : '<p class="pl-empty">Nothing marked on the pitch for this phase yet.</p>';
  }
  const sel = (id, opts, cur) => `<select id="${id}">${opts.map((o2) => `<option value="${esc(o2[0])}"${o2[0] === cur ? ' selected' : ''}>${esc(o2[1])}</option>`).join('')}</select>`;
  function builder(team, ph) {
    const side = SIDE_OF[ph], d = UI.draft;
    if (UI.mode === 'view') return `<div class="pl-add"><button type="button" data-mode="zone">+ Tag an area</button><button type="button" data-mode="trigger">+ Add a trigger</button></div>`;
    const cellsText = UI.cells.length ? FM.planCellsName(UI.cells) : 'none chosen: click squares on the pitch';
    if (UI.mode === 'zone') {
      const tags = FM.PLAN_ZONE_TAGS.filter((t) => t.side === side), tag = FM.PLAN_ZONE_TAG[d.tag] && FM.PLAN_ZONE_TAG[d.tag].side === side ? d.tag : tags[0].k, t = FM.PLAN_ZONE_TAG[tag];
      const preview = UI.cells.length ? FM.planZoneText({ tag, who: d.who || 'everyone', cells: UI.cells, phase: ph }) : '';
      return `<div class="pl-build"><h4>Tag an area</h4><p class="pl-help">Click the squares on the pitch that make up the area (${esc(cellsText)}).</p>
        <label>What it means ${sel('plTag', tags.map((x) => [x.k, x.name]), tag)}</label><p class="pl-help">${esc(t.help)}</p>
        ${t.who ? `<label>Who ${sel('plWho', ['everyone', 'forwards', 'mids', 'defenders', 'nearest', 'wingers', 'fullbacks'].map((k) => [k, FM.PLAN_WHO_NAMES[k]]), d.who || 'everyone')}</label>` : ''}
        ${preview ? `<p class="pl-sent pl-preview">${esc(preview)}</p>` : ''}
        <div class="pl-add"><button type="button" class="primary" data-build="zone"${UI.cells.length ? '' : ' disabled'}>Add this</button><button type="button" data-mode="view">Cancel</button></div></div>`;
    }
    const whens = FM.PLAN_WHEN.filter((w) => w.side === side && (w.stage ? w.stage === ph : ph !== 'transAtt' && ph !== 'transDef')), w = FM.PLAN_WHEN_BY[d.when] && whens.some((x) => x.k === d.when) ? FM.PLAN_WHEN_BY[d.when] : whens[0];
    const dos = FM.PLAN_DO.filter((x) => x.side === w.side), doK = dos.some((x) => x.k === d.do) ? d.do : dos[0].k;
    const draft = { when: w.k, group: d.group || 'FB', who: d.who || 'nearest', do: doK, cells: UI.cells };
    const preview = (w.needs === 'zone' && !UI.cells.length) ? '' : FM.planTriggerText(draft);
    return `<div class="pl-build"><h4>Add a trigger</h4>
      <label>When ${sel('plWhen', whens.map((x) => [x.k, x.name]), w.k)}</label>
      ${w.needs === 'carrier' ? `<label>the ball goes to their ${sel('plGroup', w.options.map((x) => [x[0], x[1]]), draft.group)}</label>` : ''}
      <p class="pl-help">${w.needs === 'zone' ? 'Click the squares that make up the area (' + esc(cellsText) + ').' : 'Optionally click squares on the pitch to say where (' + esc(cellsText) + ').'}</p>
      <label>Who reacts ${sel('plWho', ['nearest', 'forwards', 'mids', 'defenders', 'wingers', 'striker', 'fullbacks', 'everyone'].map((k) => [k, FM.PLAN_WHO_NAMES[k]]), draft.who)}</label>
      <label>What they do ${sel('plDo', dos.map((x) => [x.k, x.name]), draft.do)}</label>
      ${preview ? `<p class="pl-sent pl-preview">${esc(preview)}</p>` : ''}
      <div class="pl-add"><button type="button" class="primary" data-build="trigger"${(w.needs === 'zone' && !UI.cells.length) ? ' disabled' : ''}>Add this</button><button type="button" data-mode="view">Cancel</button></div></div>`;
  }

  const manualCount = (team, ph) => team.players.filter((p) => FM.planPhase(ph).eng.some((k) => FM.isManual(team, p, k))).length;

  // ---------- the page ----------
  // dials: real-unit sliders under the pitch; the engine reads them straight away
  function dialsHtml(team, ph) {
    const list = FM.DIALS.filter((d) => d.phases.indexOf(ph) >= 0); if (!list.length) return '';
    return '<div class="pl-dialgrid">' + list.map((d) => { const v = FM.dialGet(team, d.id); return `<label class="pl-dial" for="dial-${d.id}"><span class="pl-dial-h"><b>${esc(d.label)}</b><output id="dial-out-${d.id}">${esc(FM.dialShow(d.id, v))}</output></span><input id="dial-${d.id}" type="range" data-dial="${d.id}" min="${d.lo}" max="${d.hi}" step="${d.step}" value="${v}"><small>${esc(d.words)}</small></label>`; }).join('') + '</div>';
  }
  FM.renderPlanTab = function (host, team, tab, hooks) {
    const phases = TAB_PHASES[tab]; if (!phases) return false;
    if (!UI.sub || phases.indexOf(UI.sub) < 0) UI.sub = phases[0];
    const ph = UI.sub, info = FM.planPhase(ph), pl = FM.planGet(team);
    if (!pl.migrated) { migrate(team); pl.migrated = true; hooks.save(); }
    if (!UI.sel || !team.players.some((p) => p.slotKey === UI.sel)) UI.sel = null;
    const draw = () => {
      const A = (UI.ovl.space || UI.ovl.lanes || UI.ovl.lines) ? FM.planAnalysis(team, ph, hooks) : null, selP = UI.sel && team.players.find((q) => q.slotKey === UI.sel);
      const legacy = (team.rules || []).filter((r) => r.source !== 'plan');
      host.innerHTML = `<div class="pl">
        ${phases.length > 1 ? `<div class="pl-sub">${phases.map((k) => `<button type="button" class="${k === ph ? 'on' : ''}" data-sub="${k}">${esc(FM.planPhase(k).name)}</button>`).join('')}</div>` : ''}
        <div class="pl-head"><h3>${esc(info.name)}</h3></div>
        <div class="pl-grid">
          <section class="card pl-left"><div class="pl-ovl" role="group" aria-label="Pitch overlays"><span>Overlays</span>${OVL.map(([k, n]) => `<button type="button" class="${UI.ovl[k] ? 'on' : ''}" data-ovl="${k}" aria-pressed="${UI.ovl[k]}">${n}</button>`).join('')}</div><div class="pl-pitchbar">${manualCount(team, ph) ? '<button type="button" data-resetpos="1">Put this phase\'s players back where their roles put them</button>' : ''}<button type="button" class="${UI.showOpp ? 'on' : ''}" data-opp="1"${hooks.opp ? '' : ' disabled'}>${UI.showOpp ? 'Hide' : 'Show'} the opposition</button></div><div class="pl-pitchwrap${UI.mode !== 'view' ? ' picking' : ''}">${pitchSvg(team, ph, hooks, A)}</div>${(() => { const rp = hooks.report ? hooks.report(FM.planPhase(ph).eng[0]) : ''; return rp ? `<div class="pl-oppreport">${UI.showOpp ? '' : '<p class="pl-help">Show the opposition to see how they stand in this phase.</p>'}${rp}</div>` : ''; })()}
            ${selP ? `<div class="pl-selbar"><b>${esc(selP.name)}</b> <span>${esc((FM.ROLES[selP.roleId] || {}).name || '')}</span><button type="button" data-openp="1">Open role and instructions</button><button type="button" data-unsel="1">Clear</button></div>` : ''}</section>
          <section class="card pl-right"><h4>Team approach: ${esc(info.name.toLowerCase())}</h4>${teamPanel(team, ph)}</section>
        </div>
        ${dialsHtml(team, ph) ? `<section class="card pl-dials"><h4>Dials for ${esc(info.name.toLowerCase())}</h4>${dialsHtml(team, ph)}</section>` : ''}
        <section class="card pl-analysis">${FM.planAnalysisHtml ? FM.planAnalysisHtml(team, ph, hooks) : ''}</section>
        <section class="card pl-plans"><h4>On the pitch: areas and triggers</h4>${planItems(team, ph)}${builder(team, ph)}</section>
        <section class="card pl-sum"><h4>The plan so far</h4>${FM.planSummary(team).map((x) => `<p><b>${esc(x.phase)}:</b> ${esc(x.text)}</p>`).join('') || '<p class="pl-empty">Everything is as the roles set it. Make a choice above and it appears here.</p>'}</section></div>`;
      bind();
    };
    const again = () => { hooks.save(); draw(); };
    const bind = () => {
      host.querySelectorAll('[data-dial]').forEach((r) => {
        r.addEventListener('input', () => { FM.dialSet(team, r.dataset.dial, +r.value); const o = host.querySelector('#dial-out-' + r.dataset.dial); if (o) o.textContent = FM.dialShow(r.dataset.dial, FM.dialGet(team, r.dataset.dial)); });
        r.addEventListener('change', () => hooks.save());
      });
      host.querySelectorAll('[data-sub]').forEach((b) => b.addEventListener('click', () => { UI.sub = b.dataset.sub; UI.mode = 'view'; UI.cells = []; UI.sel = null; FM.renderPlanTab(host, team, tab, hooks); }));   // the page is opened again for that phase (its name, choices and pitch all belong to it)
      host.querySelectorAll('[data-team-tog]').forEach((b) => b.addEventListener('click', () => { FM.planSetTeam(team, ph, b.dataset.teamTog, b.dataset.v); again(); }));
      host.querySelectorAll('[data-player-tog]').forEach((b) => b.addEventListener('click', () => { FM.planSetPlayer(team, UI.sel, ph, b.dataset.playerTog, b.dataset.v); again(); }));
      // Drag a player to where he should stand in this phase. A placed position is the one he stands in (his role and instructions still decide how he plays from it);
      // a click that does not move opens him on the squad page.
      const svg = host.querySelector('.pl-pitch');
      const toPos = (e) => { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const q = pt.matrixTransform(svg.getScreenCTM().inverse()); return { w: Math.max(0.03, Math.min(0.97, q.x / PW)), d: Math.max(0.02, Math.min(0.98, 1 - q.y / PH)) }; };
      host.querySelectorAll('.pl-card').forEach((g) => g.addEventListener('pointerdown', (e) => {
        if (UI.mode !== 'view' || (e.pointerType === 'mouse' && e.button !== 0)) return;
        e.preventDefault();
        const p = team.players.find((q) => q.slotKey === g.dataset.slot), start = { x: e.clientX, y: e.clientY }; let moved = false, at = null;
        try { g.setPointerCapture(e.pointerId); } catch (_) { /* a plain drag still works */ }
        const mv = (ev) => { if (!moved && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 5) return; moved = true; at = toPos(ev); g.setAttribute('transform', 'translate(' + (at.w * PW).toFixed(1) + ',' + ((1 - at.d) * PH).toFixed(1) + ')'); };
        const up = () => {
          g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up); g.removeEventListener('pointercancel', up);
          if (!moved || !at || !p) { if (!moved) { UI.sel = UI.sel === g.dataset.slot ? null : g.dataset.slot; draw(); } return; }
          team.phasePos = team.phasePos || {};
          info.eng.forEach((k) => FM.setPhasePos(team, p, k, { d: at.d, w: at.w }));
          if (FM.inferShapeTactics) FM.inferShapeTactics(team);
          again();
        };
        g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up);
      }));
      const rp = host.querySelector('[data-resetpos]'); if (rp) rp.addEventListener('click', () => { info.eng.forEach((k) => { if (team.phasePos && team.phasePos[k]) delete team.phasePos[k]; }); if (FM.inferShapeTactics) FM.inferShapeTactics(team); again(); });
      host.querySelectorAll('.pl-cell').forEach((c) => c.addEventListener('click', () => { const k = c.dataset.cell.split(',').map(Number), i = UI.cells.findIndex((q) => q[0] === k[0] && q[1] === k[1]); if (i >= 0) UI.cells.splice(i, 1); else UI.cells.push(k); draw(); }));

      host.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { UI.mode = b.dataset.mode; UI.cells = []; UI.draft = {}; draw(); }));
      const rd = () => { UI.draft = { tag: (host.querySelector('#plTag') || {}).value, who: (host.querySelector('#plWho') || {}).value, when: (host.querySelector('#plWhen') || {}).value, group: (host.querySelector('#plGroup') || {}).value, do: (host.querySelector('#plDo') || {}).value }; draw(); };
      ['plTag', 'plWho', 'plWhen', 'plGroup', 'plDo'].forEach((id) => { const e = host.querySelector('#' + id); if (e) e.addEventListener('change', rd); });
      host.querySelectorAll('[data-build]').forEach((b) => b.addEventListener('click', () => {
        const d = UI.draft;
        if (b.dataset.build === 'zone') FM.planAddZone(team, { tag: d.tag || FM.PLAN_ZONE_TAGS.find((t) => t.side === SIDE_OF[ph]).k, who: d.who || 'everyone', cells: UI.cells.slice(), phase: ph });
        else FM.planAddTrigger(team, { when: d.when || 'carrier', group: d.group || 'FB', who: d.who || 'nearest', do: d.do, cells: UI.cells.slice() });
        UI.mode = 'view'; UI.cells = []; UI.draft = {}; again();
      }));
      host.querySelectorAll('[data-item-toggle]').forEach((b) => b.addEventListener('click', () => { const [k, id] = b.dataset.itemToggle.split(':'); FM.planToggleItem(team, k, id); again(); }));
      host.querySelectorAll('[data-item-del]').forEach((b) => b.addEventListener('click', () => { const [k, id] = b.dataset.itemDel.split(':'); FM.planRemove(team, k, id); again(); }));
      host.querySelectorAll('[data-ovl]').forEach((b) => b.addEventListener('click', () => { UI.ovl[b.dataset.ovl] = !UI.ovl[b.dataset.ovl]; try { localStorage.setItem('lm_pl_ovl', JSON.stringify(UI.ovl)); } catch (e) { /* not kept */ } draw(); }));
      const op = host.querySelector('[data-openp]'); if (op) op.addEventListener('click', () => { if (hooks.openPlayer && UI.sel) hooks.openPlayer(UI.sel); });
      const us = host.querySelector('[data-unsel]'); if (us) us.addEventListener('click', () => { UI.sel = null; draw(); });
      const ob = host.querySelector('[data-opp]'); if (ob) ob.addEventListener('click', () => { UI.showOpp = !UI.showOpp; draw(); });
      const nt = host.querySelector('[data-notice]'); if (nt) nt.addEventListener('click', () => { pl.noticeSeen = true; again(); });
      const cl = host.querySelector('[data-clear-legacy]'); if (cl) cl.addEventListener('click', () => { team.legacyTactics = team.legacyTactics || {}; team.legacyTactics.rules = (team.rules || []).filter((r) => r.source !== 'plan'); team.rules = (team.rules || []).filter((r) => r.source === 'plan'); FM.planApply(team); again(); });
    };
    draw();
    return true;
  };

  // ---------- one player's role and instructions, for the squad and formation page ----------
  // A panel that sits at the top of the page, above its other controls, and closes. His role is chosen from large buttons (rest the mouse on one to read what it is),
  // his general instructions are the ones that hold whenever they make sense (the ones about playing on the ball only count with the ball, the ones about winning it
  // only without it), and below them are his choices for each phase of play.
  FM.planPlayerPanel = function (host, team, p, hooks) {
    if (!host) return;
    if (!p) { host.innerHTML = ''; return; }
    const pl = FM.planGet(team), role = FM.ROLES[p.roleId] || {};
    const roleBtns = FM.rolesForGroup(p.group).map((id) => { const r = FM.ROLES[id]; return `<button type="button" class="pl-rolebtn${id === p.roleId ? ' on' : ''}" data-roleid="${id}" title="${esc(r.name + ': ' + r.desc)}"><b>${esc(r.name)}</b><span>${esc(r.tag || '')}</span></button>`; }).join('');
    const SIDE = { with: 'with the ball', without: 'without the ball', both: 'all the time' };
    const general = FM.instructionsFor(p.group).map((ins) => {
      const cur = (p.instr || {})[ins.key] || 0;
      return `<div class="pl-tog"><div class="pl-tog-h"><b>${esc(ins.label)}</b><span class="pl-help">${esc(SIDE[(FM.INSTR_SIDE || {})[ins.key]] || '')}</span></div><div class="pl-seg" role="group">${ins.options.map((o) => `<button type="button" class="${+o[0] === +cur ? 'on' : ''}" data-instr="${esc(ins.key)}" data-v="${o[0]}">${esc(o[1])}</button>`).join('')}</div></div>`;
    }).join('');
    const phases = FM.PLAN_PHASES.map((ph) => {
      const tg = FM.planPlayerToggles(ph.key, p.group); if (!tg.length) return '';
      const mine = ((pl.player[p.slotKey] || {})[ph.key]) || {}, n = Object.keys(mine).length;
      return `<details class="pl-phase"${n ? ' open' : ''}><summary>${esc(ph.name)}${n ? ` <i>${n}</i>` : ''}</summary>${tg.map((t) => {
        const cur = mine[t.key], def = t.opts.some((x) => x.v === 'std') ? 'std' : t.opts[0].v;
        return `<div class="pl-tog"><div class="pl-tog-h"><b>${esc(t.label)}</b></div><div class="pl-seg" role="group">${t.opts.map((op) => `<button type="button" class="${(cur == null ? def : cur) === op.v ? 'on' : ''}" data-player-tog="${esc(t.key)}" data-phase="${ph.key}" data-v="${esc(op.v)}">${esc(op.label)}</button>`).join('')}</div></div>`;
      }).join('')}</details>`;
    }).join('');
    host.innerHTML = `<div class="pl-pop pl-pop-top" role="dialog" aria-label="Role and instructions for ${esc(p.name)}"><button type="button" class="pl-pop-x" data-close="1" aria-label="Close">×</button>
      <div class="pl-who"><b>${esc(p.name)}</b><span>#${p.number} · ${esc(p.group)}${FM.playerRating ? ' · ' + FM.playerRating(p, p.group).toFixed(1) : ''}</span></div>
      ${FM.SHOW_INSTRUCTIONS ? `<h5>Role</h5><div class="pl-roles">${roleBtns}</div>
      <p class="pl-roledesc" id="plRoleDesc"><b>${esc(role.name || '')}.</b> ${esc(role.desc || '')}</p>
      <h5>General instructions</h5>${general}` : ''}
      <h5>By phase of play</h5>${phases || '<p class="pl-empty">Nothing to choose by phase for this player.</p>'}</div>`;
    // Choosing something rebuilds the panel (and the page behind it): where it and the page were scrolled to is kept, so a click never throws you back to the top.
    const redraw = () => {
      const kept = []; for (let n = host; n; n = n.parentElement) if (n.scrollTop) kept.push([n, n.scrollTop]);
      const pop0 = host.querySelector('.pl-pop'), inner = pop0 ? pop0.scrollTop : 0, wx = window.scrollX, wy = window.scrollY, h0 = host.offsetHeight;
      host.style.minHeight = h0 + 'px';   // the page does not get shorter while the panel is rebuilt, so the browser has no reason to move the scroll
      const restore = () => { kept.forEach(([n, v]) => { n.scrollTop = v; }); const pop1 = host.querySelector('.pl-pop'); if (pop1 && inner) pop1.scrollTop = inner; window.scrollTo(wx, wy); };
      if (hooks && hooks.save) hooks.save(); FM.planPlayerPanel(host, team, p, hooks); restore(); if (hooks && hooks.changed) hooks.changed(); restore();
      host.style.minHeight = ''; restore();
    };
    host.querySelectorAll('[data-roleid]').forEach((b) => {
      b.addEventListener('click', () => { FM.setRole(team, p, b.dataset.roleid); FM.planApply(team); redraw(); });
      const say = (id) => { const r = FM.ROLES[id], d = host.querySelector('#plRoleDesc'); if (r && d) d.innerHTML = '<b>' + esc(r.name) + '.</b> ' + esc(r.desc); };
      b.addEventListener('mouseenter', () => say(b.dataset.roleid)); b.addEventListener('focus', () => say(b.dataset.roleid)); b.addEventListener('mouseleave', () => say(p.roleId));
    });
    host.querySelectorAll('[data-instr]').forEach((b) => b.addEventListener('click', () => { p.instr = p.instr || {}; const v = +b.dataset.v; if (v === 0) delete p.instr[b.dataset.instr]; else p.instr[b.dataset.instr] = v; if (FM.inferShapeTactics) FM.inferShapeTactics(team); redraw(); }));
    host.querySelectorAll('[data-player-tog]').forEach((b) => b.addEventListener('click', () => { FM.planSetPlayer(team, p.slotKey, b.dataset.phase, b.dataset.playerTog, b.dataset.v); redraw(); }));
    const cx = host.querySelector('[data-close]'); if (cx) cx.addEventListener('click', () => { if (hooks && hooks.close) hooks.close(); else host.innerHTML = ''; });
  };

  // First time the plan is used: hand-placed positions are kept (where a player was dragged is where he stands; roles and choices decide how he plays), with a backup copy.
  function migrate(team) {
    const man = team.phasePos && Object.keys(team.phasePos).some((k) => Object.keys(team.phasePos[k] || {}).length);
    if (man) team.legacyTactics = { phasePos: JSON.parse(JSON.stringify(team.phasePos || {})), rules: [] };
    FM.planApply(team);
  }
})();
