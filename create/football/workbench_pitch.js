// The Workbook's tactical picture: how the club actually played, drawn on a pitch (always attacking to the right).
//   arrows  - where completed passes moved the ball between parts of the pitch (gold forward, white across, blue back; thicker = more often)
//   lines   - how high the back line and the front line stood on average (dashed)
//   green   - where the ball was won back (a ring: within six seconds of losing it)
//   orange  - shots, sized by the chance
// One panel for the chosen matches, or two side by side to compare (before and after a change, say). Everything is read from the recorded matches.
(function () {
  const FM = (window.FM = window.FM || {});
  const WB = FM.WB, A = () => FM.ANALYSIS_DRAW;
  const L = FM.PITCH.L, W = FM.PITCH.W;
  const r1 = (v) => Math.round(v * 10) / 10, pc = (v) => Math.round(v * 100);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fail = (error) => ({ ok: false, error });
  const COLS = 6, ROWS = 3;

  function roundsText(rs) { return rs.length ? (rs.length === 1 ? 'matchday ' + rs[0] : 'matchdays ' + rs.join(', ')) : 'all matches'; }

  function panel(league, fxs, label) {
    const me = league.userId, PW = A().PW, PH = A().PH;
    const flows = {}, rec = [], shots = [], cards = {}, origin = {}, shape = { line: 0, front: 0, n: 0 }, tac = { pressing: 0, lineHeight: 0, counterPress: 0, directness: 0, tempo: 0, n: 0 };
    let made = 0, ok = 0, fwd = 0, len = 0, gf = 0, ga = 0, xg = 0, goals = 0;
    fxs.forEach((fx) => {
      const side = fx.homeId === me ? 0 : 1, D = (x) => (side === 0 ? x / L : 1 - x / L), Wd = (y) => (side === 0 ? y / W : 1 - y / W);
      gf += side === 0 ? fx.hg : fx.ag; ga += side === 0 ? fx.ag : fx.hg;
      const st = fx.stats && fx.stats[me]; if (st) { xg += st.xg || 0; const t = st.tactics || {}; Object.keys(tac).forEach((k) => { if (k !== 'n' && Number.isFinite(t[k])) tac[k] += t[k]; }); tac.n++; }
      fx.log.passes.forEach((p) => {
        if (p[1] !== side) return;
        { const o = origin[p[2]] || (origin[p[2]] = { d: 0, w: 0, n: 0 }); o.d += D(p[5]); o.w += Wd(p[6]); o.n++; }
        made++; if (p[4] !== 1) return; ok++; len += p[7] || 0;
        if (!(p[11] >= 0 && p[12] >= 0)) return;
        const d0 = D(p[5]), w0 = Wd(p[6]), d1 = D(p[11]), w1 = Wd(p[12]);
        if ((d1 - d0) * L >= 5) fwd++;
        const z0 = Math.min(COLS - 1, Math.floor(d0 * COLS)), r0 = Math.min(ROWS - 1, Math.floor(w0 * ROWS)), z1 = Math.min(COLS - 1, Math.floor(d1 * COLS)), r2 = Math.min(ROWS - 1, Math.floor(w1 * ROWS));
        if (z0 === z1 && r0 === r2) return;
        const k = z0 + ',' + r0 + '>' + z1 + ',' + r2, f = flows[k] || (flows[k] = { n: 0, d0: 0, w0: 0, d1: 0, w1: 0 });
        f.n++; f.d0 += d0; f.w0 += w0; f.d1 += d1; f.w1 += w1;
      });
      const xr = fx.log.xr;
      if (xr) {
        (xr.recov || []).forEach((q) => { if (q[0] === side) rec.push({ d: q[2], w: q[3], quick: q[4] >= 0 && q[4] <= 6 }); });
        Object.keys(xr.pos || {}).forEach((k) => { if (+k.split(':')[0] !== side) return; const q = xr.pos[k], no = +k.split(':')[1], n = q[2] + q[5]; const c = cards[no] || (cards[no] = { d: 0, w: 0, n: 0 }); c.d += (q[0] * q[2] + q[3] * q[5]) ; c.w += (q[1] * q[2] + q[4] * q[5]); c.n += n; });
        (xr.shape || []).forEach((q) => { if (q[1] === side) { shape.line += q[2]; shape.front += q[3]; shape.n++; } });
      }
      (fx.log.other || []).forEach((e) => { if (e.type === 'shot' && e.team === me) { shots.push({ d: D(e.x), w: Wd(e.y), xg: e.xg || 0, goal: e.outcome === 'goal' }); if (e.outcome === 'goal') goals++; } });
    });
    const top = Math.max.apply(null, Object.values(flows).map((f) => f.n).concat([1]));
    const arrows = Object.values(flows).filter((f) => f.n >= Math.max(3, top * 0.2)).sort((a, b) => b.n - a.n).slice(0, 5);
    let svg = '';
    // the lines first, so the arrows sit on top
    const line = shape.n ? shape.line / shape.n : null, front = shape.n ? shape.front / shape.n : null;
    if (line != null) {
      svg += `<rect x="${(line * PW).toFixed(1)}" y="0" width="${((front - line) * PW).toFixed(1)}" height="${PH}" fill="#fff" fill-opacity=".07"/>`;
      svg += `<line x1="${(line * PW).toFixed(1)}" y1="0" x2="${(line * PW).toFixed(1)}" y2="${PH}" stroke="#8FC8FF" stroke-width="3" stroke-dasharray="10 7"/><text x="${(line * PW + 6).toFixed(1)}" y="20" font-size="16" fill="#8FC8FF" font-weight="700">back line</text>`;
      svg += `<line x1="${(front * PW).toFixed(1)}" y1="0" x2="${(front * PW).toFixed(1)}" y2="${PH}" stroke="#FFB4A0" stroke-width="3" stroke-dasharray="10 7"/><text x="${(front * PW - 6).toFixed(1)}" y="${PH - 10}" font-size="16" fill="#FFB4A0" font-weight="700" text-anchor="end">front line</text>`;
    }
    svg += arrows.map((f) => {
      const x0 = f.d0 / f.n * PW, y0 = f.w0 / f.n * PH, x1 = f.d1 / f.n * PW, y1 = f.w1 / f.n * PH, dd = f.d1 / f.n - f.d0 / f.n;
      const col = dd > 0.04 ? '#FFD54A' : dd < -0.04 ? '#7FB5FF' : '#FFFFFF', w = 2 + 7 * f.n / top, hl = 11 + w * 1.4, ang = Math.atan2(y1 - y0, x1 - x0);
      const bx = x1 - Math.cos(ang) * hl * 0.8, by = y1 - Math.sin(ang) * hl * 0.8, nx = -Math.sin(ang), ny = Math.cos(ang), hw = hl * 0.55;
      return `<g stroke="#000" stroke-opacity=".35" stroke-width=".8"><line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="${col}" stroke-opacity=".88" stroke-width="${w.toFixed(1)}" stroke-linecap="round"/><polygon points="${x1.toFixed(1)},${y1.toFixed(1)} ${(bx + nx * hw).toFixed(1)},${(by + ny * hw).toFixed(1)} ${(bx - nx * hw).toFixed(1)},${(by - ny * hw).toFixed(1)}" fill="${col}" fill-opacity=".95"/></g>`;
    }).join('');
    // player cards at where each one stood on average (from the match record; older matches fall back to where he passed from)
    const squad = (FM.teamById(league, me) || {}).squad || [];
    let spots = Object.keys(cards).filter((k) => cards[k].n >= 20).map((k) => ({ no: +k, d: cards[k].d / cards[k].n, w: cards[k].w / cards[k].n }));
    if (spots.length < 8) spots = Object.keys(origin).filter((k) => origin[k].n >= 12).map((k) => ({ no: +k, d: origin[k].d / origin[k].n, w: origin[k].w / origin[k].n }));
    spots = spots.map((c) => { const pl = squad.find((q) => q.number === c.no); return Object.assign(c, { name: pl ? String(pl.name).split(' ').slice(-1)[0] : '#' + c.no, group: pl ? pl.group : '' }); }).sort((a, b) => b.n - a.n).slice(0, 11);
    const RING = { GK: '#FFD54A', CB: '#8FC8FF', FB: '#8FC8FF', DM: '#7FD49A', CM: '#7FD49A', AM: '#7FD49A', WF: '#FFB4A0', ST: '#FFB4A0' };
    svg += spots.map((c) => { const x = Math.round(c.d * PW), y = Math.round(c.w * PH), nm = c.name.length > 8 ? c.name.slice(0, 7) + '.' : c.name; return `<g><rect x="${x - 36}" y="${y - 17}" width="72" height="34" rx="5" fill="#0E1822" fill-opacity=".9" stroke="${RING[c.group] || '#fff'}" stroke-width="2.2"/><text x="${x - 31}" y="${y + 6}" font-size="16" font-weight="700" fill="#FFD54A">${c.no}</text><text x="${x + 12}" y="${y + 4}" font-size="10" font-weight="600" fill="#fff" text-anchor="middle">${esc(nm.toUpperCase())}</text></g>`; }).join('');
    svg += `<text x="12" y="${PH - 34}" font-size="15" fill="#fff" fill-opacity=".85">attacking →</text>`;
    const picture = `<svg class="amap" viewBox="0 0 ${PW} ${PH}" role="img" aria-label="${esc(label)}: how the team played">${A().pitchLines()}${svg}</svg>`;
    const n = fxs.length, hi = rec.filter((p) => p.d > 0.5).length, quick = rec.filter((p) => p.quick).length;
    const T = (k) => (tac.n ? tac[k] / tac.n : 0);
    const facts = {
      matches: n, goals_for: gf, goals_against: ga, xg: r1(xg), recoveries: rec.length, recoveries_in_their_half: hi, regains_within_6s: quick,
      forward_pass_pct: ok ? pc(fwd / ok) : 0, pass_pct: made ? pc(ok / made) : 0, avg_pass_m: ok ? r1(len / ok) : 0,
      back_line_pct: line == null ? null : pc(line), front_line_pct: front == null ? null : pc(front), press: r1(T('pressing')), line_setting: Math.round(T('lineHeight') * 100) / 100, counter_press: r1(T('counterPress')), directness: r1(T('directness')), tempo: r1(T('tempo')),
    };
    const words = [];
    if (line != null) words.push('back line at ' + pc(line) + '% of the pitch and front line at ' + pc(front) + '% (a gap of ' + Math.round((front - line) * L) + 'm between them)');
    words.push(rec.length + ' balls won back, ' + hi + ' in their half and ' + quick + ' within six seconds of losing it');
    words.push(ok ? pc(fwd / ok) + '% of completed passes went forward, averaging ' + r1(len / ok) + 'm' : 'no completed passes');
    words.push(shots.length + ' shots (' + goals + ' goals), expected goals ' + r1(xg));
    const plan = tac.n ? 'plan: line height ' + (Math.round(T('lineHeight') * 100) / 100) + ', pressing ' + r1(T('pressing')) + ', counter-press ' + r1(T('counterPress')) + ', directness ' + r1(T('directness')) + ', tempo ' + r1(T('tempo')) : '';
    return { title: label, svg: picture, facts, note: '', summary: label + ' (' + n + ' match' + (n === 1 ? '' : 'es') + ', scored ' + gf + ', conceded ' + ga + '). ' + (plan ? plan.charAt(0).toUpperCase() + plan.slice(1) + '. ' : '') + words.join('; ') + '.', note: words.join('; ') + (plan ? ' | ' + plan : '') };
  }


  // ---------- maps: where the ball was lost, won back, or shot from ----------
  const LAYERS = {
    losses: { col: '#FF6B5A', title: 'Where we lost the ball', note: 'Each red circle is a place where possession was lost; a bigger circle means it happened more often there.' },
    recoveries: { col: '#7FD49A', title: 'Where we won the ball back', note: 'Each green circle is a place where the ball was won back; a bigger circle means it happened more often there.' },
    shots: { col: '#FF9A3C', title: 'Where we shot from', note: 'Each circle is a shot, bigger for a better chance; yellow is a goal.' },
  };
  function mapPanel(league, fxs, label, kind) {
    const me = league.userId, PW = A().PW, PH = A().PH, L0 = LAYERS[kind], pts = [];
    fxs.forEach((fx) => {
      const side = fx.homeId === me ? 0 : 1, xr = fx.log.xr, D = (x) => (side === 0 ? x / L : 1 - x / L), Wd = (y) => (side === 0 ? y / W : 1 - y / W);
      if (kind === 'losses' && xr) (xr.seq || []).forEach((q) => { if (q[0] === side && q[6] === 0 && q[8] >= 0) pts.push({ d: q[8], w: q[9] }); });
      else if (kind === 'recoveries' && xr) (xr.recov || []).forEach((q) => { if (q[0] === side) pts.push({ d: q[2], w: q[3] }); });
      else if (kind === 'shots') (fx.log.other || []).forEach((e) => { if (e.type === 'shot' && e.team === me) pts.push({ d: D(e.x), w: Wd(e.y), xg: e.xg || 0, goal: e.outcome === 'goal' }); });
    });
    if (!pts.length) return null;
    let svg = '';
    if (kind === 'shots') svg += pts.map((q) => `<circle cx="${Math.round(q.d * PW)}" cy="${Math.round(q.w * PH)}" r="${Math.round(6 + 18 * Math.sqrt(Math.min(q.xg, 0.8)))}" fill="${q.goal ? '#FFE27A' : L0.col}" fill-opacity=".85" stroke="#000" stroke-width="1.5"/>`).join('');
    else {
      const bins = {}; pts.forEach((q) => { const bx = Math.min(9, Math.floor(q.d * 10)), by = Math.min(4, Math.floor(q.w * 5)), k = bx + ',' + by; (bins[k] = bins[k] || { n: 0, x: bx, y: by }).n++; });
      const top = Math.max.apply(null, Object.values(bins).map((b) => b.n).concat([1]));
      svg += Object.values(bins).map((b) => `<circle cx="${Math.round((b.x + 0.5) * PW / 10)}" cy="${Math.round((b.y + 0.5) * PH / 5)}" r="${Math.round(9 + 26 * Math.sqrt(b.n / top))}" fill="${L0.col}" fill-opacity="${(0.28 + 0.5 * b.n / top).toFixed(2)}" stroke="${L0.col}" stroke-width="2"/>`).join('');
    }
    svg += `<text x="12" y="${PH - 12}" font-size="14" fill="#fff" fill-opacity=".85">attacking →</text>`;
    const third = [0, 0, 0]; pts.forEach((q) => { third[q.d < 0.33 ? 0 : q.d < 0.67 ? 1 : 2]++; });
    const facts = L0.title + ' (' + label + '): ' + pts.length + ' in all, ' + third[0] + ' in our own third, ' + third[1] + ' in the middle third, ' + third[2] + ' in their third.';
    return { title: L0.title + (label ? ': ' + label.toLowerCase() : ''), svg: `<svg class="amap" viewBox="0 0 ${PW} ${PH}" role="img" aria-label="${esc(L0.title)}">${A().pitchLines()}${svg}</svg>`, note: L0.note, facts };
  }
  function pitch(league, spec) {
    let mine = league.fixtures.filter((f) => f.played && !f.friendly && f.log && (f.homeId === league.userId || f.awayId === league.userId)).sort((a, b) => a.round - b.round);
    if (!mine.length) mine = (league.friendlies || []).filter((f) => f.played && f.log && (f.homeId === league.userId || f.awayId === league.userId)).sort((a, b) => a.round - b.round);   // before the season starts, the pre-season friendlies are the games there are
    if (!mine.length) return fail('There are no recorded matches of yours to draw yet. The picture fills in once you have played a league match.');
    const sets = Array.isArray(spec.compare) && spec.compare.length >= 2 && spec.compare.every(Array.isArray) ? spec.compare.slice(0, 2) : [Array.isArray(spec.rounds) ? spec.rounds : []];
    if (LAYERS[spec.layer]) {
      const want0 = Array.isArray(spec.rounds) ? spec.rounds.map(Number).filter(Number.isFinite) : [], fxs0 = want0.length ? mine.filter((f) => want0.indexOf(f.round + 1) >= 0) : mine;
      const mp = mapPanel(league, fxs0.length ? fxs0 : mine, want0.length ? 'matchday' + (want0.length > 1 ? 's ' : ' ') + want0.join(', ') : 'every match this season', spec.layer);
      if (!mp) return fail('There is nothing recorded for that map yet.');
      return { ok: true, method: 'pitch', title: mp.title, summary: [mp.facts], pictures: [{ title: mp.title, svg: mp.svg, note: mp.note, facts: mp.facts }], caveats: [], map: true };
    }
    const panels = [];
    for (const rs of sets) {
      const want = rs.map(Number).filter(Number.isFinite), fxs = want.length ? mine.filter((f) => want.indexOf(f.round + 1) >= 0) : mine;
      if (!fxs.length) return fail('None of your recorded matches are on ' + roundsText(want) + '. You have matches recorded for matchdays ' + mine.map((f) => f.round + 1).join(', ') + '.');
      panels.push(panel(league, fxs, sets.length > 1 ? (want.length ? 'Matchday' + (want.length > 1 ? 's ' : ' ') + want.join(', ') : 'All matches') : (want.length ? 'Matchday' + (want.length > 1 ? 's ' : ' ') + want.join(', ') : 'Every match this season')));
    }
    return {
      ok: true, method: 'pitch', title: 'tactical picture' + (panels.length > 1 ? ': ' + panels.map((p) => p.title.toLowerCase()).join(' against ') : ''),
      summary: panels.map((p) => p.summary), pictures: panels.map((p) => ({ title: p.title, svg: p.svg, note: '', facts: p.note })),
      caveats: ['Each picture is built from every pass, recovery and shot recorded in those matches, with your club always attacking to the right. Arrows show where passes typically moved the ball, not single passes.'],
    };
  }

  // ---------- a tactical idea, drawn ----------
  // The idea is a few moves (a player and where he could go), roles for the players who move, and the space the movement opens up. It is drawn on the pitch from
  // where the manager's board for that phase puts each player, with arrows for the moves and a shaded rectangle for the space. The distances behind the arrows
  // are not printed: the picture is the explanation. It can be tested (100 runs now, 100 with the change) and applied from the Workbook.
  function tacticPicture(league, spec) {
    const team = FM.teamById(league, league.userId), B0 = FM.lab && FM.lab.BOARDS[spec.phase] ? FM.lab.BOARDS[spec.phase] : FM.lab.BOARDS.build, key = B0.keys[0];
    const PW = A().PW, PH = A().PH, at = {};
    team.players.forEach((p) => { const q = FM.phasePos(team, p, key); at[p.number] = { p, x: q.d * L, y: q.w * W }; });
    const moves = (spec.moves || []).filter((m) => at[m.number]).map((m) => { const f = at[m.number]; return { number: m.number, name: f.p.name.split(' ').slice(-1)[0], from: { x: f.x, y: f.y }, to: { x: Math.max(3, Math.min(L - 3, f.x + m.dx)), y: Math.max(3, Math.min(W - 3, f.y + m.dy)) }, tag: m.tag || '' }; });
    if (!moves.length) return null;
    const roleOf = {}; (spec.roles || []).forEach((r) => { roleOf[r.number] = r.role; });
    const moved = new Set(moves.map((m) => m.number));
    let svg = '';
    const sp = spec.space;
    if (sp && sp.x1 > sp.x0 && sp.y1 > sp.y0) svg += `<rect x="${(sp.x0 / L * PW).toFixed(1)}" y="${(sp.y0 / W * PH).toFixed(1)}" width="${((sp.x1 - sp.x0) / L * PW).toFixed(1)}" height="${((sp.y1 - sp.y0) / W * PH).toFixed(1)}" fill="#7FD6FF" fill-opacity=".22" stroke="#7FD6FF" stroke-width="2.5" stroke-dasharray="9 6"/>` + (sp.label ? `<text x="${((sp.x0 + sp.x1) / 2 / L * PW).toFixed(1)}" y="${((sp.y0 + 2.2) / W * PH).toFixed(1)}" text-anchor="middle" font-size="15" font-weight="700" fill="#CFF1FF" stroke="#0b2530" stroke-width="3" paint-order="stroke">${esc(sp.label)}</text>` : '');
    Object.keys(at).forEach((n) => { if (moved.has(+n)) return; const f = at[n]; svg += `<circle cx="${(f.x / L * PW).toFixed(1)}" cy="${(f.y / W * PH).toFixed(1)}" r="11" fill="#1F8A4C" fill-opacity=".85" stroke="#fff" stroke-width="2"/><text x="${(f.x / L * PW).toFixed(1)}" y="${(f.y / W * PH + 4.5).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="800" fill="#fff">${n}</text>`; });
    moves.forEach((m) => {
      const x0 = m.from.x / L * PW, y0 = m.from.y / W * PH, x1 = m.to.x / L * PW, y1 = m.to.y / W * PH, ang = Math.atan2(y1 - y0, x1 - x0), hl = 15, bx = x1 - Math.cos(ang) * hl * 0.8, by = y1 - Math.sin(ang) * hl * 0.8, nx = -Math.sin(ang), ny = Math.cos(ang);
      svg += `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="#FFD54A" stroke-width="5" stroke-linecap="round" stroke-opacity=".95"/><polygon points="${x1.toFixed(1)},${y1.toFixed(1)} ${(bx + nx * 8).toFixed(1)},${(by + ny * 8).toFixed(1)} ${(bx - nx * 8).toFixed(1)},${(by - ny * 8).toFixed(1)}" fill="#FFD54A"/>`;
      svg += `<circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="13" fill="none" stroke="#FFD54A" stroke-width="2.5" stroke-dasharray="4 4"/>`;
      svg += `<circle cx="${x0.toFixed(1)}" cy="${y0.toFixed(1)}" r="13" fill="#1F8A4C" stroke="#FFD54A" stroke-width="3"/><text x="${x0.toFixed(1)}" y="${(y0 + 5).toFixed(1)}" text-anchor="middle" font-size="13" font-weight="800" fill="#fff">${m.number}</text>`;
      const label = (roleOf[m.number] || m.tag || '').trim();
      svg += `<text x="${x0.toFixed(1)}" y="${(y0 + 29).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" stroke="#000" stroke-width="3" paint-order="stroke">${esc(m.name)}</text>`;
      if (label) svg += `<text x="${x1.toFixed(1)}" y="${(y1 - 19).toFixed(1)}" text-anchor="middle" font-size="13" font-weight="800" fill="#FFE27A" stroke="#000" stroke-width="3" paint-order="stroke">${esc(label)}</text>`;
    });
    svg += `<text x="12" y="${PH - 12}" font-size="14" fill="#fff" fill-opacity=".85">attacking →</text>`;
    return { svg: `<svg class="amap" viewBox="0 0 ${PW} ${PH}" role="img" aria-label="${esc(spec.title || 'Tactical idea')}">${A().pitchLines()}${svg}</svg>`, moves, team };
  }
  function tactic(league, spec) {
    const pic = tacticPicture(league, spec);
    if (!pic) return fail('That idea names players who are not in the team, so there is nothing to draw.');
    const steps = (spec.steps || []).filter(Boolean).slice(0, 5);
    const facts = 'TACTIC (' + (spec.phase || 'build') + '): ' + (spec.title || '') + '. ' + (spec.note || '') + (steps.length ? ' Steps: ' + steps.join(' ') : '') + ' Moves: ' + pic.moves.map((m) => m.name + (m.tag ? ' (' + m.tag + ')' : '')).join(', ') + (spec.space && spec.space.label ? '. Space: ' + spec.space.label : '') + '.';
    return { ok: true, method: 'tactic', title: spec.title || 'Tactical idea', summary: [spec.note || ''], pictures: [{ title: spec.title || 'Tactical idea', svg: pic.svg, note: spec.note || '', facts }], caveats: [], tactic: { phase: spec.phase || 'build', title: spec.title || '', note: spec.note || '', moves: (spec.moves || []).filter((m) => pic.moves.some((x) => x.number === m.number)).map((m) => ({ number: m.number, dx: m.dx, dy: m.dy })), roles: spec.roles || [], space: spec.space || null, steps } };
  }
  WB.register('tactic', tactic);
  WB.register('pitch', pitch);
  WB.METHOD_HELP.push('{"method":"pitch","layer":"losses|recoveries|shots"?,"rounds":[1,2]?,"compare":[[1,2,3],[4,5]]?}  with "layer" it is a MAP of where the ball was lost (losses), won back (recoveries) or shot from (shots), over the matchdays given or all of them. Without "layer":   a picture of how your club played, drawn on a pitch with arrows: where passes moved the ball, how high the back and front lines stood, where the ball was won back and the shots; with the numbers behind it. "compare" draws two sets of matchdays side by side (before and after a change of plan). Use this whenever the question is about HOW the team played or about tactics, alongside the figures');
})();
