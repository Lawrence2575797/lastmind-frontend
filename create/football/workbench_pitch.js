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
    const arrows = Object.values(flows).filter((f) => f.n >= Math.max(3, top * 0.2)).sort((a, b) => b.n - a.n).slice(0, 9);
    let svg = '';
    // the lines first, so the arrows sit on top
    const line = shape.n ? shape.line / shape.n : null, front = shape.n ? shape.front / shape.n : null;
    if (line != null) {
      svg += `<rect x="${(line * PW).toFixed(1)}" y="0" width="${((front - line) * PW).toFixed(1)}" height="${PH}" fill="#fff" fill-opacity=".07"/>`;
      svg += `<line x1="${(line * PW).toFixed(1)}" y1="0" x2="${(line * PW).toFixed(1)}" y2="${PH}" stroke="#8FC8FF" stroke-width="3" stroke-dasharray="10 7"/><text x="${(line * PW + 6).toFixed(1)}" y="20" font-size="16" fill="#8FC8FF" font-weight="700">back line ${pc(line)}%</text>`;
      svg += `<line x1="${(front * PW).toFixed(1)}" y1="0" x2="${(front * PW).toFixed(1)}" y2="${PH}" stroke="#FFB4A0" stroke-width="3" stroke-dasharray="10 7"/><text x="${(front * PW - 6).toFixed(1)}" y="${PH - 10}" font-size="16" fill="#FFB4A0" font-weight="700" text-anchor="end">front line ${pc(front)}%</text>`;
    }
    // where the ball was won back: a soft circle per patch of pitch, bigger where it happened more
    const bins = {}; rec.forEach((p) => { const k = Math.min(9, Math.floor(p.d * 10)) + ',' + Math.min(4, Math.floor(p.w * 5)); const b = bins[k] || (bins[k] = { n: 0, x: Math.min(9, Math.floor(p.d * 10)), y: Math.min(4, Math.floor(p.w * 5)) }); b.n++; });
    const bmax = Math.max.apply(null, Object.values(bins).map((b) => b.n).concat([1]));
    svg += Object.values(bins).map((b) => `<circle cx="${Math.round((b.x + 0.5) * PW / 10)}" cy="${Math.round((b.y + 0.5) * PH / 5)}" r="${Math.round(7 + 22 * Math.sqrt(b.n / bmax))}" fill="#7FD49A" fill-opacity="${(0.25 + 0.4 * b.n / bmax).toFixed(2)}" stroke="#7FD49A" stroke-opacity=".7" stroke-width="1.5"/>`).join('');
    svg += shots.map((s) => `<circle cx="${Math.round(s.d * PW)}" cy="${Math.round(s.w * PH)}" r="${Math.round(5 + 16 * Math.sqrt(Math.min(s.xg, 0.8)))}" fill="${s.goal ? '#FFE27A' : '#FF9A3C'}" fill-opacity=".85" stroke="#000" stroke-width="1.5"/>`).join('');
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
    return { title: label, svg: picture, facts, summary: label + ' (' + n + ' match' + (n === 1 ? '' : 'es') + ', scored ' + gf + ', conceded ' + ga + '). ' + (plan ? plan.charAt(0).toUpperCase() + plan.slice(1) + '. ' : '') + words.join('; ') + '.', note: words.join('; ') + (plan ? ' | ' + plan : '') };
  }

  function pitch(league, spec) {
    const mine = league.fixtures.filter((f) => f.played && !f.friendly && f.log && (f.homeId === league.userId || f.awayId === league.userId)).sort((a, b) => a.round - b.round);
    if (!mine.length) return fail('There are no recorded matches of yours to draw yet. The picture fills in once you have played a league match.');
    const sets = Array.isArray(spec.compare) && spec.compare.length >= 2 && spec.compare.every(Array.isArray) ? spec.compare.slice(0, 2) : [Array.isArray(spec.rounds) ? spec.rounds : []];
    const panels = [];
    for (const rs of sets) {
      const want = rs.map(Number).filter(Number.isFinite), fxs = want.length ? mine.filter((f) => want.indexOf(f.round + 1) >= 0) : mine;
      if (!fxs.length) return fail('None of your recorded matches are on ' + roundsText(want) + '. You have matches recorded for matchdays ' + mine.map((f) => f.round + 1).join(', ') + '.');
      panels.push(panel(league, fxs, sets.length > 1 ? (want.length ? 'Matchday' + (want.length > 1 ? 's ' : ' ') + want.join(', ') : 'All matches') : (want.length ? 'Matchday' + (want.length > 1 ? 's ' : ' ') + want.join(', ') : 'Every match this season')));
    }
    return {
      ok: true, method: 'pitch', title: 'tactical picture' + (panels.length > 1 ? ': ' + panels.map((p) => p.title.toLowerCase()).join(' against ') : ''),
      summary: panels.map((p) => p.summary), pictures: panels.map((p) => ({ title: p.title, svg: p.svg, note: p.note })),
      caveats: ['Each picture is built from every pass, recovery and shot recorded in those matches, with your club always attacking to the right. Arrows show where passes typically moved the ball, not single passes.'],
    };
  }
  WB.register('pitch', pitch);
  WB.METHOD_HELP.push('{"method":"pitch","rounds":[1,2]?,"compare":[[1,2,3],[4,5]]?}  a picture of how your club played, drawn on a pitch with arrows: where passes moved the ball, how high the back and front lines stood, where the ball was won back and the shots; with the numbers behind it. "compare" draws two sets of matchdays side by side (before and after a change of plan). Use this whenever the question is about HOW the team played or about tactics, alongside the figures');
})();
