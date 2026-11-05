// The Analysis page as a searchable explorer. A list of investigations (shot maps, passing lanes, pressing, season trends, scouting ...), each
// drawn from the match logs by code. Pick a match and a side at the top; search or filter the list; open one to see the diagrams and tables.
// Loaded after moretti.js: it replaces FM.renderAnalysis. The old two-column page stays as FM.renderAnalysisLessons.
(function () {
  const FM = (window.FM = window.FM || {});
  if (FM.renderAnalysis && !FM.renderAnalysisLessons) FM.renderAnalysisLessons = FM.renderAnalysis;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1), f2 = (v) => (Math.round(v * 100) / 100).toFixed(2), pct = (a, b) => (b ? Math.round(100 * a / b) + '%' : '–');
  const sum = (a, f) => a.reduce((x, y) => x + (f ? f(y) : y), 0);

  // ---------- context: the match, the side, and the log turned so that the side attacks to the right ----------
  function playedWithLogs(lg) {
    const all = (lg.fixtures || []).concat((lg.cup && lg.cup.fixtures) || []).concat(lg.preseason ? [lg.preseason] : []).concat(lg.friendlies || []);
    return all.filter((f) => f.played && f.log && (f.homeId === lg.userId || f.awayId === lg.userId)).sort((a, b) => (a.round - b.round) || (a.cup ? 1 : 0) - (b.cup ? 1 : 0));
  }
  function makeCtx(lg, fx, side) {
    const L = FM.PITCH.L, W = FM.PITCH.W, log = fx.log, home = fx.homeId, away = fx.awayId;
    const meIdx = (fx.homeId === lg.userId) ? 0 : 1, ti = side === 'them' ? 1 - meIdx : meIdx;
    const teamId = ti === 0 ? home : away, oppId = ti === 0 ? away : home, team = FM.teamById(lg, teamId), opp = FM.teamById(lg, oppId);
    const fx_ = (x) => (ti === 0 ? x : L - x), fy_ = (y) => (ti === 0 ? y : W - y);
    const name = (t, n) => { const p = t.players && t.players.find((q) => q.number === n); return p ? p.name : '#' + n; };
    const short = (t, n) => { const p = t.players && t.players.find((q) => q.number === n); return p ? (p.name.split(' ').slice(-1)[0] || p.name) : '#' + n; };
    const shots = log.other.filter((e) => e.type === 'shot').map((e) => ({ mine: e.team === teamId, x: fx_(e.x), y: fy_(e.y), xg: e.xg, outcome: e.outcome, player: e.player, t: e.t, setPiece: e.setPiece, defDist: e.defDist, raw: e }));
    // a side's own shots are drawn attacking right; the other side's shots are drawn attacking the same way when that side is looked at
    const myShots = shots.filter((s) => s.mine), theirShots = log.other.filter((e) => e.type === 'shot' && e.team !== teamId).map((e) => ({ raw: e, x: (ti === 0 ? L - e.x : e.x), y: (ti === 0 ? W - e.y : e.y), xg: e.xg, outcome: e.outcome, player: e.player, t: e.t, setPiece: e.setPiece }));
    const passes = log.passes.filter((p) => p[1] === ti).map((p) => ({ t: p[0], from: p[2], to: p[3], res: p[4], x: p[5] == null ? NaN : fx_(p[5]), y: p[6] == null ? NaN : fy_(p[6]), dist: p[7], lane: p[8], press: p[9], p: p[10], tx: p[11] < 0 ? null : fx_(p[11]), ty: p[12] < 0 ? null : fy_(p[12]), box: p[13] }));
    const tackles = log.tackles.filter((p) => p[1] === ti).map((p) => ({ t: p[0], player: p[2], vs: p[3], ok: p[4], x: fx_(p[5]), y: fy_(p[6]), depth: p[7], cover: p[8] }));
    const dribbles = log.dribbles.filter((p) => p[1] === ti).map((p) => ({ t: p[0], player: p[2], ok: p[3], x: fx_(p[4]), y: fy_(p[5]), def: p[6], p: p[7] }));
    const others = log.other.filter((e) => e.team === teamId);
    const heatPos = (num) => {
      const pl = team.players && team.players.find((q) => q.number === num), g = pl && log.heat && log.heat.players && log.heat.players[pl.id]; if (!g) return null;
      const GX = FM.HEAT.GX; let sx = 0, sy = 0, sn = 0; g.forEach((n, i) => { if (!n) return; sx += n * ((i % GX) + 0.5) / GX * L; sy += n * (Math.floor(i / GX) + 0.5) / FM.HEAT.GY * W; sn += n; });
      return sn ? { x: fx_(sx / sn), y: fy_(sy / sn) } : null;
    };
    return { lg, fx, log, L, W, ti, team, opp, teamId, oppId, heatPos, name: (n) => name(team, n), short: (n) => short(team, n), oname: (n) => name(opp, n), shots: myShots, against: theirShots, passes, tackles, dribbles, others, heat: (log.heat && log.heat.teams && log.heat.teams[teamId]) || null, heatPlayers: (log.heat && log.heat.players) || {}, fxAt: fx_, fyAt: fy_ };
  }

  // ---------- drawing ----------
  const D = () => FM.ANALYSIS_DRAW, C = () => FM.charts;
  const PS = 6, PW = 105 * PS, PH = 68 * PS;
  const px = (x) => (x * PS).toFixed(1), py = (y) => (y * PS).toFixed(1);
  function pitch(inner, o) {
    o = o || {};
    return `<svg class="ex-pitch" viewBox="0 0 ${PW} ${PH}" role="img" aria-label="${esc(o.label || 'Pitch diagram')}">${D().pitchLines()}${inner}<text x="${PW - 10}" y="22" text-anchor="end" font-size="13" fill="#fff" stroke="#000" stroke-width="3" style="paint-order:stroke;font-family:Arial,sans-serif;font-weight:700">attacking this way &#8594;</text></svg>`;
  }
  const arrow = (x1, y1, x2, y2, col, w, op) => {
    const a = Math.atan2(y2 - y1, x2 - x1), hx = x2 - Math.cos(a) * 6, hy = y2 - Math.sin(a) * 6, s = 4;
    return `<g stroke="${col}" fill="${col}" opacity="${op == null ? 0.85 : op}"><line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" stroke-width="${w || 1.6}"/><polygon stroke="none" points="${x2.toFixed(1)},${y2.toFixed(1)} ${(hx + Math.cos(a + 2.5) * s * 1.6).toFixed(1)},${(hy + Math.sin(a + 2.5) * s * 1.6).toFixed(1)} ${(hx + Math.cos(a - 2.5) * s * 1.6).toFixed(1)},${(hy + Math.sin(a - 2.5) * s * 1.6).toFixed(1)}"/></g>`;
  };
  const legend = (items) => `<div class="ex-legend">${items.map((i) => `<span><i style="background:${i[0]}"></i>${esc(i[1])}</span>`).join('')}</div>`;
  const kpis = (rows) => `<div class="ex-kpis">${rows.map((r) => `<div><span>${esc(r[0])}</span><b>${r[1]}</b>${r[2] ? `<small>${esc(r[2])}</small>` : ''}</div>`).join('')}</div>`;
  const table = (head, rows, cls) => `<div class="tablewrap"><table class="data ex-table ${cls || ''}"><thead><tr>${head.map((h, i) => `<th class="${i === 0 ? 'l' : ''}">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td class="${i === 0 ? 'l' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const section = (title, body, note) => `<div class="ex-sec"><h4>${esc(title)}</h4>${note ? `<p class="ex-note">${esc(note)}</p>` : ''}${body}</div>`;
  const GREEN = '#7fe3a6', RED = '#ff8a7a', GOLD = '#f2c14e', BLUE = '#6fb7ff';

  // ---------- the investigations ----------
  const INV = [];
  const add = (o) => INV.push(o);

  add({ id: 'shotmap', group: 'Attack', title: 'Shot map', tags: 'shots xg chances finishing goals scoring location quality big chances', blurb: 'Where each shot came from, how good the chance was, and whether it went in.', needs: 'match',
    render(c) {
      const sh = c.shots, goals = sh.filter((s) => s.outcome === 'goal'), xg = sum(sh, (s) => s.xg), on = sh.filter((s) => s.outcome === 'goal' || s.outcome === 'saved');
      let g = ''; sh.slice().sort((a, b) => a.xg - b.xg).forEach((s) => { const r = 4 + Math.sqrt(s.xg) * 17, col = s.outcome === 'goal' ? GREEN : s.outcome === 'saved' ? GOLD : s.outcome === 'blocked' ? BLUE : RED; g += `<circle cx="${px(s.x)}" cy="${py(s.y)}" r="${r.toFixed(1)}" fill="${col}" fill-opacity="${s.outcome === 'goal' ? 0.95 : 0.45}" stroke="${col}" stroke-width="1.6"><title>${esc(c.short(s.player))}, ${Math.floor(s.t / 60) + 1}': xG ${f2(s.xg)}, ${s.outcome}${s.setPiece ? ' (' + s.setPiece + ')' : ''}</title></circle>`; });
      const by = {}; sh.forEach((s) => { const b = by[s.player] || (by[s.player] = { n: 0, on: 0, g: 0, xg: 0 }); b.n++; b.xg += s.xg; if (s.outcome === 'goal') b.g++; if (s.outcome === 'goal' || s.outcome === 'saved') b.on++; });
      const rows = Object.keys(by).map((k) => [c.name(+k), by[k].n, by[k].on, by[k].g, f2(by[k].xg), (by[k].g - by[k].xg >= 0 ? '+' : '−') + f2(Math.abs(by[k].g - by[k].xg))]).sort((a, b) => b[4] - a[4]);
      return kpis([['Shots', sh.length, sh.length ? sh.filter((s) => s.xg >= 0.2).length + ' good chances' : ''], ['On target', on.length, pct(on.length, sh.length)], ['Goals', goals.length], ['Expected goals', f2(xg), sh.length ? f2(xg / sh.length) + ' a shot' : ''], ['Against', c.against.length + ' shots', f2(sum(c.against, (s) => s.xg)) + ' xG']]) +
        `<div class="ex-fig">${pitch(g, { label: 'Shot map' })}${legend([[GREEN, 'Goal'], [GOLD, 'Saved'], [BLUE, 'Blocked'], [RED, 'Off target']])}<p class="ex-note">Circle size is the quality of the chance (expected goals). Hover a shot for the player and minute.</p></div>` +
        section('By player', rows.length ? table(['Player', 'Shots', 'On target', 'Goals', 'xG', 'Goals − xG'], rows) : '<p class="note">No shots.</p>');
    } });

  add({ id: 'xgline', group: 'Attack', title: 'Expected goals through the match', tags: 'xg timeline momentum chances flow cumulative score game state', blurb: 'The running total of chance quality for each side, with the goals marked on it.', needs: 'match',
    render(c) {
      const dur = Math.max(5400, c.log.duration || 5400), mine = c.shots.slice().sort((a, b) => a.t - b.t), theirs = c.against.slice().sort((a, b) => a.t - b.t);
      const cum = (arr) => { let t = 0; const pts = [[0, 0]]; arr.forEach((s) => { pts.push([s.t / 60, t]); t += s.xg; pts.push([s.t / 60, t]); }); pts.push([dur / 60, t]); return pts; };
      const marks = []; mine.forEach((s, i) => { if (s.outcome === 'goal') marks.push({ x: s.t / 60, y: cum(mine.slice(0, i + 1)).slice(-2)[0][1] + s.xg, cls: 'hl', t: c.short(s.player) + ' ' + Math.floor(s.t / 60 + 1) + "'", label: c.short(s.player) }); });
      const chart = C().lines([{ label: c.team.name, pts: cum(mine), cls: 'gold' }, { label: c.opp.name, pts: cum(theirs), cls: 'blue', dash: true }], { h: 320, xl: 'Minute', yl: 'Cumulative xG', x0: 0, x1: dur / 60, y0: 0, marks, legendRight: false });
      const first = mine.filter((s) => s.t < 2700), second = mine.filter((s) => s.t >= 2700), f2n = theirs.filter((s) => s.t < 2700), s2n = theirs.filter((s) => s.t >= 2700);
      return `<div class="ex-fig">${chart}</div>` + section('By half', table(['', 'Shots', 'xG', 'Against: shots', 'Against: xG'], [['First half', first.length, f2(sum(first, (s) => s.xg)), f2n.length, f2(sum(f2n, (s) => s.xg))], ['Second half', second.length, f2(sum(second, (s) => s.xg)), s2n.length, f2(sum(s2n, (s) => s.xg))]]));
    } });

  add({ id: 'setpieces', group: 'Attack', title: 'Set pieces', tags: 'corners free kicks penalties headers restarts dead ball crosses', blurb: 'Shots that came from headers, free kicks and penalties, and the crosses into the box.', needs: 'match',
    render(c) {
      const sp = c.shots.filter((s) => s.setPiece), kinds = {}; sp.forEach((s) => { const k = s.setPiece, b = kinds[k] || (kinds[k] = { n: 0, g: 0, xg: 0 }); b.n++; b.xg += s.xg; if (s.outcome === 'goal') b.g++; });
      const crosses = c.others.filter((e) => e.type === 'cross'), ok = crosses.filter((e) => e.ok || e.outcome === 'complete').length;
      const rest = {}; c.log.other.filter((e) => e.type === 'restart').forEach((e) => { const k = e.kind || e.how || 'restart', t = e.team === c.teamId ? 'us' : 'them'; rest[k] = rest[k] || { us: 0, them: 0 }; rest[k][t]++; });
      let g = ''; sp.forEach((s) => { g += `<circle cx="${px(s.x)}" cy="${py(s.y)}" r="${(4 + Math.sqrt(s.xg) * 17).toFixed(1)}" fill="${s.outcome === 'goal' ? GREEN : GOLD}" fill-opacity=".6" stroke="#fff" stroke-width="1.2"><title>${esc(s.setPiece)}: ${esc(c.short(s.player))}, xG ${f2(s.xg)}, ${s.outcome}</title></circle>`; });
      return kpis([['Set-piece shots', sp.length, f2(sum(sp, (s) => s.xg)) + ' xG'], ['Goals from them', sp.filter((s) => s.outcome === 'goal').length], ['Crosses', crosses.length, crosses.length ? pct(ok, crosses.length) + ' found a team-mate' : '']]) +
        `<div class="ex-fig">${pitch(g, { label: 'Set-piece shots' })}</div>` +
        section('By kind', Object.keys(kinds).length ? table(['Kind', 'Shots', 'Goals', 'xG'], Object.keys(kinds).map((k) => [esc(k), kinds[k].n, kinds[k].g, f2(kinds[k].xg)])) : '<p class="note">No shots from set pieces in this match.</p>') +
        (Object.keys(rest).length ? section('Restarts', table(['Restart', 'Us', 'Them'], Object.keys(rest).map((k) => [esc(k), rest[k].us, rest[k].them]))) : '');
    } });

  add({ id: 'passmap', group: 'Passing', title: 'Pass map', tags: 'passes passing completion progressive final third long short direction forward', blurb: 'Every pass as an arrow, filtered by what you want to see.', needs: 'match', controls: [{ id: 'pf', label: 'Show', opts: [['all', 'All passes'], ['fail', 'Failed passes'], ['prog', 'Progressive (10 m or more forward)'], ['final', 'Into the final third'], ['box', 'Into the box'], ['long', 'Long (30 m or more)']] }],
    render(c, st) {
      const mode = st.pf || 'all', box = (x, y) => x >= 105 - 16.5 && y >= 34 - 20.16 && y <= 34 + 20.16;
      const keep = (p) => p.tx != null && Number.isFinite(p.x) && (mode === 'all' || (mode === 'fail' && p.res !== 1) || (mode === 'prog' && p.tx - p.x >= 10) || (mode === 'final' && p.tx >= 70 && p.x < 70) || (mode === 'box' && box(p.tx, p.ty) && !box(p.x, p.y)) || (mode === 'long' && p.dist >= 30));
      const list = c.passes.filter(keep); let g = '';
      list.forEach((p) => { g += arrow(+px(p.x), +py(p.y), +px(p.tx), +py(p.ty), p.res === 1 ? 'rgba(127,227,166,.9)' : p.res === 2 ? '#e8d27a' : RED, 1.3, list.length > 220 ? 0.35 : 0.75); });
      const all = c.passes, ok = all.filter((p) => p.res === 1), fwd = all.filter((p) => p.tx != null && p.tx - p.x >= 10), long = all.filter((p) => p.dist >= 30);
      const zones = [['Own third', 0, 35], ['Middle third', 35, 70], ['Final third', 70, 106]].map((z) => { const a = all.filter((p) => p.x >= z[1] && p.x < z[2]); return [z[0], a.length, pct(a.filter((p) => p.res === 1).length, a.length), f1(a.length ? sum(a, (p) => p.dist) / a.length : 0) + ' m']; });
      return kpis([['Passes', all.length], ['Completed', pct(ok.length, all.length), ok.length + ' of ' + all.length], ['Progressive', fwd.length, pct(fwd.filter((p) => p.res === 1).length, fwd.length) + ' completed'], ['Long', long.length, pct(long.filter((p) => p.res === 1).length, long.length) + ' completed'], ['Average length', f1(all.length ? sum(all, (p) => p.dist) / all.length : 0) + ' m']]) +
        `<div class="ex-fig">${pitch(g, { label: 'Pass map' })}${legend([[GREEN, 'Completed'], [RED, 'Failed'], ['#e8d27a', 'Offside']])}<p class="ex-note">${list.length} passes shown.</p></div>` +
        section('By third of the pitch', table(['Where the pass started', 'Passes', 'Completed', 'Average length'], zones));
    } });

  add({ id: 'network', group: 'Passing', title: 'Pass network', tags: 'network connections combinations links who passes to whom shape average positions triangles', blurb: 'Average positions of the starters, joined by how often they found each other.', needs: 'match',
    render(c) {
      const cameOn = new Set(c.log.other.filter((e) => (e.type === 'sub' || e.type === 'keeperSwap') && e.team === c.teamId).map((e) => e.on));
      const ps = c.passes.filter((p) => !cameOn.has(p.from) && !cameOn.has(p.to)), pos = {}, edges = {}, made = {};
      ps.forEach((p) => { if (!Number.isFinite(p.x)) return; const o = pos[p.from] || (pos[p.from] = { x: 0, y: 0, n: 0 }); o.x += p.x; o.y += p.y; o.n++; made[p.from] = (made[p.from] || 0) + 1; if (p.res === 1) { const k = p.from + '>' + p.to; edges[k] = (edges[k] || 0) + 1; } });
      const pair = {}; Object.keys(edges).forEach((k) => { const [a, b] = k.split('>').map(Number), key = Math.min(a, b) + '-' + Math.max(a, b); pair[key] = (pair[key] || 0) + edges[k]; });
      let fallback = false;
      if (!Object.keys(pos).length) { const nums = {}; ps.forEach((p) => { nums[p.from] = 1; made[p.from] = (made[p.from] || 0) + 1; if (p.res === 1) { const k = p.from + '>' + p.to; edges[k] = (edges[k] || 0) + 1; } }); Object.keys(nums).forEach((k) => { const q = c.heatPos(+k); if (q) pos[k] = { x: q.x, y: q.y, n: 1 }; }); fallback = true; Object.keys(edges).forEach((k) => { const [a, b] = k.split('>').map(Number), key = Math.min(a, b) + '-' + Math.max(a, b); pair[key] = (pair[key] || 0) + edges[k]; }); }
      const max = Math.max.apply(null, Object.values(pair).concat([1])); let g = '';
      Object.keys(pair).filter((k) => pair[k] >= 3).forEach((k) => { const [a, b] = k.split('-').map(Number), A = pos[a], B = pos[b]; if (!A || !B) return; g += `<line x1="${px(A.x / A.n)}" y1="${py(A.y / A.n)}" x2="${px(B.x / B.n)}" y2="${py(B.y / B.n)}" stroke="#f2c14e" stroke-opacity="${(0.18 + 0.7 * pair[k] / max).toFixed(2)}" stroke-width="${(1 + 7 * pair[k] / max).toFixed(1)}"><title>${esc(c.short(a))} and ${esc(c.short(b))}: ${pair[k]} completed passes</title></line>`; });
      Object.keys(pos).forEach((k) => { const o = pos[k], r = 8 + 10 * (made[k] || 0) / Math.max.apply(null, Object.values(made)); g += `<circle cx="${px(o.x / o.n)}" cy="${py(o.y / o.n)}" r="${r.toFixed(1)}" fill="#1c2420" stroke="#fff" stroke-width="2"/><text x="${px(o.x / o.n)}" y="${(o.y / o.n * PS + 4).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" style="font-family:Arial,sans-serif">${k}</text><title>${esc(c.name(+k))}: ${made[k]} passes</title>`; });
      const top = Object.keys(pair).map((k) => { const [a, b] = k.split('-').map(Number); return [esc(c.name(a)) + ' and ' + esc(c.name(b)), pair[k]]; }).sort((a, b) => b[1] - a[1]).slice(0, 8);
      return `<div class="ex-fig">${pitch(g, { label: 'Pass network' })}<p class="ex-note">Starters only. Node size is the number of passes made; line width is completed passes between the pair (3 or more shown).${fallback ? ' This match was saved before pass positions were kept, so each player is placed where he spent most of his time instead.' : ''}</p></div>` + section('Strongest links', table(['Pair', 'Completed passes'], top));
    } });

  add({ id: 'lanes', group: 'Passing', title: 'Passing lanes and pressure', tags: 'lanes pressure clearance defender interception risk completion receiver marked space tight', blurb: 'How completion changes as the lane narrows and the receiver is closed down.', needs: 'match',
    render(c) {
      const ps = c.passes.filter((p) => p.lane != null && p.lane >= 0), bucket = (arr, f, edges, labels) => labels.map((lb, i) => { const a = arr.filter((p) => f(p) >= edges[i] && f(p) < edges[i + 1]); return { l: lb, n: a.length, ok: a.filter((p) => p.res === 1).length, exp: a.length ? sum(a, (p) => p.p) / a.length : 0 }; });
      const lane = bucket(ps, (p) => p.lane, [0, 1, 2, 4, 8, 99], ['Under 1 m', '1 to 2 m', '2 to 4 m', '4 to 8 m', '8 m or more']);
      const prs = bucket(ps, (p) => p.press, [0, 2, 4, 7, 12, 99], ['Under 2 m', '2 to 4 m', '4 to 7 m', '7 to 12 m', '12 m or more']);
      const bar = (rows) => C().bars(rows.map((r) => ({ l: r.l + ' (' + r.n + ')', v: r.n ? 100 * r.ok / r.n : 0, s: r.n ? Math.round(100 * r.ok / r.n) + '%' : '–' })), { max: 100, w: 400, ml: 120 });
      const tbl = (rows) => table(['Band', 'Passes', 'Completed', 'Expected'], rows.map((r) => [r.l, r.n, pct(r.ok, r.n), r.n ? Math.round(100 * r.exp) + '%' : '–']));
      let g = ''; ps.filter((p) => p.tx != null && Number.isFinite(p.x) && p.lane < 2).forEach((p) => { g += arrow(+px(p.x), +py(p.y), +px(p.tx), +py(p.ty), p.res === 1 ? 'rgba(127,227,166,.9)' : RED, 1.4, 0.7); });
      const tight = ps.filter((p) => p.lane < 2);
      return kpis([['Passes measured', ps.length], ['Through a tight lane (under 2 m)', tight.length, pct(tight.filter((p) => p.res === 1).length, tight.length) + ' completed'], ['Receiver closed down (under 4 m)', ps.filter((p) => p.press < 4).length, pct(ps.filter((p) => p.press < 4 && p.res === 1).length, ps.filter((p) => p.press < 4).length) + ' completed']]) +
        `<div class="ex-cols"><div>${section('Completion by lane clearance', bar(lane) + tbl(lane), 'Lane clearance is the distance from the pass line to the nearest opponent.')}</div><div>${section('Completion by pressure on the receiver', bar(prs) + tbl(prs), 'Pressure is the distance from the receiver to the nearest opponent.')}</div></div>` +
        section('Passes through tight lanes', `<div class="ex-fig">${pitch(g, { label: 'Passes through tight lanes' })}${legend([[GREEN, 'Completed'], [RED, 'Failed']])}</div>`);
    } });

  add({ id: 'receivers', group: 'Passing', title: 'Who gets the ball', tags: 'receivers targets distribution playmakers involvement passers touches key passers', blurb: 'Passes made and received by each player, and how safely they hand it on.', needs: 'match',
    render(c) {
      const made = {}, got = {}; c.passes.forEach((p) => { const m = made[p.from] || (made[p.from] = { n: 0, ok: 0, fwd: 0, dist: 0 }); m.n++; m.dist += p.dist; if (p.res === 1) m.ok++; if (p.tx != null && p.tx - p.x >= 10) m.fwd++; if (p.res === 1) got[p.to] = (got[p.to] || 0) + 1; });
      const rows = Object.keys(made).map((k) => [esc(c.name(+k)), made[k].n, pct(made[k].ok, made[k].n), made[k].fwd, f1(made[k].dist / made[k].n) + ' m', got[k] || 0]).sort((a, b) => b[1] - a[1]);
      return section('Passing by player', table(['Player', 'Passes', 'Completed', 'Progressive', 'Average length', 'Received'], rows)) +
        `<div class="ex-fig">${C().bars(rows.slice(0, 11).map((r) => ({ l: r[0].split(' ').slice(-1)[0], v: r[1], s: String(r[1]) })), { w: 600, ml: 120 })}</div>`;
    } });

  add({ id: 'defence', group: 'Defence', title: 'Defensive actions', tags: 'tackles duels won lost defending pressing regains winning the ball clearances interceptions', blurb: 'Where tackles were won and lost, and how deep they happened.', needs: 'match',
    render(c) {
      let g = ''; c.tackles.forEach((t) => { g += `<circle cx="${px(t.x)}" cy="${py(t.y)}" r="6" fill="${t.ok ? GREEN : RED}" fill-opacity=".55" stroke="${t.ok ? GREEN : RED}" stroke-width="1.5"><title>${esc(c.short(t.player))} ${t.ok ? 'won' : 'lost'} a duel with ${esc(c.oname(t.vs))}, ${Math.floor(t.t / 60) + 1}'</title></circle>`; });
      const won = c.tackles.filter((t) => t.ok), by = {}; c.tackles.forEach((t) => { const b = by[t.player] || (by[t.player] = { n: 0, ok: 0 }); b.n++; if (t.ok) b.ok++; });
      const high = won.filter((t) => t.x >= 52.5).length, cl = c.others.filter((e) => e.type === 'clearance').length;
      const thirds = [['Own third', 0, 35], ['Middle third', 35, 70], ['Final third', 70, 106]].map((z) => { const a = c.tackles.filter((t) => t.x >= z[1] && t.x < z[2]); return [z[0], a.length, a.filter((t) => t.ok).length, pct(a.filter((t) => t.ok).length, a.length)]; });
      return kpis([['Duels', c.tackles.length, pct(won.length, c.tackles.length) + ' won'], ['Won in the opposition half', high, pct(high, won.length) + ' of wins'], ['Clearances', cl], ['Fouls', c.others.filter((e) => e.type === 'foul').length]]) +
        `<div class="ex-fig">${pitch(g, { label: 'Defensive duels' })}${legend([[GREEN, 'Won'], [RED, 'Lost']])}</div>` +
        `<div class="ex-cols"><div>${section('By third', table(['Third', 'Duels', 'Won', 'Win rate'], thirds))}</div><div>${section('By player', table(['Player', 'Duels', 'Won'], Object.keys(by).map((k) => [esc(c.name(+k)), by[k].n, by[k].ok]).sort((a, b) => b[1] - a[1]).slice(0, 10)))}</div></div>`;
    } });

  add({ id: 'pressing', group: 'Defence', title: 'Winning the ball back', tags: 'press pressing regains high press counterpress turnovers recoveries intensity ppda', blurb: 'How high up the pitch the ball was won, and how quickly after losing it.', needs: 'match',
    render(c) {
      const won = c.tackles.filter((t) => t.ok), opassN = c.log.passes.filter((p) => p[1] !== c.ti).length, opp = c.log.passes.filter((p) => p[1] !== c.ti && (c.ti === 0 ? p[5] : 105 - p[5]) >= 0), ownHalfOpp = c.log.passes.filter((p) => p[1] !== c.ti && (c.ti === 0 ? p[5] >= 52.5 : p[5] <= 52.5));
      const ppda = (won.length + c.others.filter((e) => e.type === 'foul').length) ? ownHalfOpp.length / (won.length + c.others.filter((e) => e.type === 'foul').length) : 0;
      const bins = [0, 0, 0, 0, 0, 0, 0]; won.forEach((t) => { bins[Math.min(6, Math.floor(t.x / 15))]++; });
      const rows = bins.map((n, i) => ({ l: Math.round(i * 15) + ' to ' + Math.min(105, Math.round((i + 1) * 15)) + ' m', v: n, s: String(n) }));
      return kpis([['Duels won', won.length], ['Won in the final 45 m', won.filter((t) => t.x >= 60).length], ['Passes the opposition made in their half', ownHalfOpp.length], ['Opposition passes per defensive action', f1(ppda), 'lower means a more aggressive press']]) +
        section('Where the ball was won', `<div class="ex-fig">${C().bars(rows, { w: 600, ml: 120 })}</div>`, 'Distance from our own goal line. A press that works shows up as longer bars towards the right.') +
        (c.heat ? section('Where the team spent the match', `<div class="ex-fig">${pitch(D().heatSvg(c.ti === 0 ? c.heat : c.heat.slice().reverse(), '#ff5a36'), { label: 'Time on the pitch' })}</div>`) : '');
    } });

  add({ id: 'dribbles', group: 'Attack', title: 'Take-ons', tags: 'dribbles take ons 1v1 duels wingers carries beating defender success', blurb: 'Where players took on a defender and how often it worked, against how close the defender was.', needs: 'match',
    render(c) {
      let g = ''; c.dribbles.forEach((d) => { g += `<circle cx="${px(d.x)}" cy="${py(d.y)}" r="${(5 + (1 - d.p) * 6).toFixed(1)}" fill="${d.ok ? GREEN : RED}" fill-opacity=".55" stroke="${d.ok ? GREEN : RED}" stroke-width="1.5"><title>${esc(c.short(d.player))}: ${d.ok ? 'beat' : 'lost to'} a defender ${f1(d.def)} m away (chance ${Math.round(d.p * 100)}%)</title></circle>`; });
      const ok = c.dribbles.filter((d) => d.ok), band = [['Under 2 m', 0, 2], ['2 to 4 m', 2, 4], ['4 m or more', 4, 99]].map((b) => { const a = c.dribbles.filter((d) => d.def >= b[1] && d.def < b[2]); return [b[0], a.length, pct(a.filter((d) => d.ok).length, a.length), a.length ? Math.round(100 * sum(a, (d) => d.p) / a.length) + '%' : '–']; });
      const by = {}; c.dribbles.forEach((d) => { const b = by[d.player] || (by[d.player] = { n: 0, ok: 0 }); b.n++; if (d.ok) b.ok++; });
      return kpis([['Take-ons', c.dribbles.length, pct(ok.length, c.dribbles.length) + ' successful'], ['In the final third', c.dribbles.filter((d) => d.x >= 70).length]]) +
        `<div class="ex-fig">${pitch(g, { label: 'Take-ons' })}${legend([[GREEN, 'Beat the defender'], [RED, 'Lost the ball']])}</div>` +
        `<div class="ex-cols"><div>${section('By distance of the defender', table(['Defender', 'Take-ons', 'Success', 'Expected'], band))}</div><div>${section('By player', table(['Player', 'Take-ons', 'Successful'], Object.keys(by).map((k) => [esc(c.name(+k)), by[k].n, by[k].ok]).sort((a, b) => b[1] - a[1]).slice(0, 10)))}</div></div>`;
    } });

  add({ id: 'territory', group: 'Shape', title: 'Territory and zones', tags: 'heat map territory possession zones third channels width where the team played positions shape', blurb: 'Where the team spent its time, a player at a time, and how the action split across the thirds and channels.', needs: 'match', controls: [{ id: 'pl', label: 'Player', opts: 'players' }],
    render(c, st) {
      const flip = (arr) => (c.ti === 0 ? arr : arr.slice().reverse()), pid = st.pl && st.pl !== 'all' ? st.pl : null;
      const cells = pid && c.heatPlayers[pid] ? flip(c.heatPlayers[pid]) : c.heat ? flip(c.heat) : null;
      const total = c.passes.length + c.tackles.length + c.dribbles.length || 1, thirds = [['Own third', 0, 35], ['Middle third', 35, 70], ['Final third', 70, 106]], chan = [['Left', 0, 22.7], ['Centre', 22.7, 45.3], ['Right', 45.3, 69]];
      const mat = chan.map((ch) => thirds.map((th) => c.passes.filter((p) => p.x >= th[1] && p.x < th[2] && p.y >= ch[1] && p.y < ch[2]).length + c.tackles.filter((p) => p.x >= th[1] && p.x < th[2] && p.y >= ch[1] && p.y < ch[2]).length));
      return (cells ? `<div class="ex-fig">${pitch(D().heatSvg(cells, '#ff5a36'), { label: 'Heat map' })}</div>` : '<p class="note">There is no position record for this match.</p>') +
        section('Share of the team\'s actions by zone', table(['', 'Own third', 'Middle third', 'Final third'], mat.map((r, i) => [chan[i][0] + ' channel'].concat(r.map((n) => Math.round(100 * n / total) + '%')))), 'Passes, duels and take-ons together. Channels are read from the side the team attacks from.');
    } });

  add({ id: 'timeline', group: 'Shape', title: 'Match events', tags: 'timeline goals cards substitutions injuries fouls offsides sequence events minute by minute', blurb: 'Goals, cards, substitutions and injuries in the order they happened.', needs: 'match',
    render(c) {
      const ev = c.log.other.filter((e) => ['goal', 'foul', 'sub', 'injury', 'offside', 'keeperSwap'].indexOf(e.type) >= 0).filter((e) => e.type !== 'foul' || e.card || e.yellow || e.red);
      const tn = (id) => (id === c.teamId ? c.team.name : c.opp.name), who = (e) => { const t = e.team === c.teamId ? c.team : c.opp; const p = t.players && t.players.find((q) => q.number === (e.player || e.on)); return p ? p.name : ''; };
      const rows = ev.sort((a, b) => a.t - b.t).map((e) => [Math.floor(e.t / 60) + 1 + "'", esc(e.type === 'foul' ? (e.red ? 'Red card' : 'Yellow card') : e.type === 'sub' ? 'Substitution' : e.type === 'keeperSwap' ? 'Goalkeeper change' : e.type === 'goal' ? 'Goal' : e.type === 'offside' ? 'Offside' : 'Injury'), esc(tn(e.team)), esc(who(e))]);
      return rows.length ? table(['Minute', 'Event', 'Side', 'Player'], rows) : '<p class="note">Nothing of note was recorded.</p>';
    } });

  // ---------- season and squad ----------
  add({ id: 'xgseason', group: 'Season', title: 'Expected goals, match by match', tags: 'season form xg for against trend results luck over performing underperforming', blurb: 'Chance quality created and conceded in every match with a record, against the goals scored.', needs: 'season',
    render(c) {
      const fxs = c.matches, rows = fxs.map((fx, i) => { const cc = makeCtx(c.lg, fx, 'us'); return { i: i + 1, opp: cc.opp.name, gf: cc.shots.filter((s) => s.outcome === 'goal').length, ga: cc.against.filter((s) => s.outcome === 'goal').length, xf: sum(cc.shots, (s) => s.xg), xa: sum(cc.against, (s) => s.xg) }; });
      const ch = C().lines([{ label: 'xG for', pts: rows.map((r) => [r.i, r.xf]), cls: 'gold' }, { label: 'xG against', pts: rows.map((r) => [r.i, r.xa]), cls: 'blue', dash: true }, { label: 'Goals scored', pts: rows.map((r) => [r.i, r.gf]), cls: 'good', opacity: 0.6 }], { h: 300, xl: 'Match', yl: 'Goals', x0: 1, x1: Math.max(2, rows.length), y0: 0 });
      return `<div class="ex-fig">${ch}</div>` + kpis([['Goals for', sum(rows, (r) => r.gf), f2(sum(rows, (r) => r.xf)) + ' expected'], ['Goals against', sum(rows, (r) => r.ga), f2(sum(rows, (r) => r.xa)) + ' expected'], ['Matches', rows.length]]) +
        section('Match by match', table(['#', 'Opponent', 'Goals', 'xG for', 'xG against', 'Goals − xG'], rows.map((r) => [r.i, esc(r.opp), r.gf + '-' + r.ga, f2(r.xf), f2(r.xa), (r.gf - r.xf >= 0 ? '+' : '−') + f2(Math.abs(r.gf - r.xf))])));
    } });

  add({ id: 'finishing', group: 'Season', title: 'Finishing: goals against chances', tags: 'finishing xg goals over performance clinical shooters strikers scatter conversion', blurb: 'For each player, the quality of chance he has had against the goals he scored.', needs: 'season',
    render(c) {
      const by = {}; c.matches.forEach((fx) => { const cc = makeCtx(c.lg, fx, 'us'); cc.shots.forEach((s) => { const b = by[s.player] || (by[s.player] = { name: cc.name(s.player), n: 0, g: 0, xg: 0 }); b.n++; b.xg += s.xg; if (s.outcome === 'goal') b.g++; }); });
      const arr = Object.keys(by).map((k) => by[k]).filter((b) => b.n >= 2);
      const pts = arr.map((b) => ({ k: 'mine', x: b.xg, y: b.g, label: b.name.split(' ').slice(-1)[0], t: b.name + ': ' + b.g + ' goals from ' + f2(b.xg) + ' xG' }));
      const mx = Math.max.apply(null, pts.map((p) => Math.max(p.x, p.y)).concat([1]));
      return (pts.length ? `<div class="ex-fig">${C().scatter(pts, { h: 340, xl: 'Expected goals (chance quality)', yl: 'Goals scored', line: { a: 0, b: 1 } })}<p class="ex-note">The line is goals equal to expected goals. Above it is finishing better than the chances deserved.</p></div>` : '<p class="note">Not enough shots yet.</p>') +
        section('Shooters', table(['Player', 'Shots', 'Goals', 'xG', 'Goals − xG'], arr.sort((a, b) => b.xg - a.xg).map((b) => [esc(b.name), b.n, b.g, f2(b.xg), (b.g - b.xg >= 0 ? '+' : '−') + f2(Math.abs(b.g - b.xg))])));
    } });

  add({ id: 'squad', group: 'Squad', title: 'Squad age and quality', tags: 'squad age rating quality depth ageing contract replacements balance scatter positions', blurb: 'The squad on one chart: how old each player is, how good, and where the gaps are.', needs: 'none',
    render(c) {
      const me = FM.teamById(c.lg, c.lg.userId), ov = (p) => (p.natural === 'GK' ? ((p.ratings || {}).gk || 60) : (((p.ratings || {}).pace || 60) + ((p.ratings || {}).dribbling || 60) + ((p.ratings || {}).passing || 60) + ((p.ratings || {}).finishing || 60) + ((p.ratings || {}).tackling || 60)) / 5);
      const sq = me.squad || me.players, age = (p) => FM.ageOf(p), pts = sq.map((p) => ({ k: 'mine', x: age(p), y: ov(p), label: p.name.split(' ').slice(-1)[0], t: p.name + ' (' + (p.natural || p.group) + '), age ' + age(p) + ', rating ' + f1(ov(p)) }));
      const groups = {}; sq.forEach((p) => { const g = p.group || p.natural; (groups[g] = groups[g] || []).push(p); });
      return `<div class="ex-fig">${C().scatter(pts, { h: 340, xl: 'Age', yl: 'Rating' })}</div>` + section('By position group', table(['Group', 'Players', 'Average age', 'Average rating'], Object.keys(groups).map((k) => [esc(k), groups[k].length, f1(sum(groups[k], age) / groups[k].length), f1(sum(groups[k], ov) / groups[k].length)])));
    } });

  add({ id: 'scout', group: 'Opposition', title: 'Scouting the next opponent', tags: 'opposition scouting next match opponent strengths weaknesses compare ratings radar form', blurb: 'The next opponent beside us, rating by rating and line by line.', needs: 'none',
    render(c) {
      const me = FM.teamById(c.lg, c.lg.userId), nx = FM.nextUserFixture(c.lg), oid = nx ? (nx.homeId === c.lg.userId ? nx.awayId : nx.homeId) : null, opp = oid ? FM.teamById(c.lg, oid) : null;
      if (!opp) return '<p class="note">There is no match to scout for at the moment.</p>';
      const KEYS = [['pace', 'Pace'], ['dribbling', 'Dribbling'], ['passing', 'Passing'], ['finishing', 'Finishing'], ['tackling', 'Tackling']], avg = (t, k) => { const a = t.players.filter((p) => p.natural !== 'GK'); return sum(a, (p) => (p.ratings || {})[k] || 60) / (a.length || 1); };
      const radar = C().radar(KEYS.map((k) => k[1]), [{ label: me.name, values: KEYS.map((k) => avg(me, k[0])), cls: 'gold' }, { label: opp.name, values: KEYS.map((k) => avg(opp, k[0])), cls: 'blue' }], 360);
      const gr = (t, g) => t.players.filter((p) => p.group === g);
      const line = (g) => { const a = gr(me, g), b = gr(opp, g), r = (arr) => (arr.length ? sum(arr, (p) => (p.natural === 'GK' ? ((p.ratings || {}).gk || 60) : (((p.ratings || {}).pace || 60) + ((p.ratings || {}).dribbling || 60) + ((p.ratings || {}).passing || 60) + ((p.ratings || {}).finishing || 60) + ((p.ratings || {}).tackling || 60)) / 5)) / arr.length : 0); return [g, f1(r(a)), f1(r(b)), (r(a) - r(b) >= 0 ? '+' : '−') + f1(Math.abs(r(a) - r(b)))]; };
      const groups = Array.from(new Set(me.players.map((p) => p.group))).filter(Boolean);
      return `<div class="ex-cols"><div class="ex-fig">${radar}${legend([[GOLD, me.name], [BLUE, opp.name]])}</div><div>${section('By line', table(['Line', me.name, opp.name, 'Difference'], groups.map(line)))}</div></div>`;
    } });

  // ---------- the page ----------
  const GROUPS = ['All', 'Report', 'Attack', 'Passing', 'Defence', 'Shape', 'Season', 'Squad', 'Opposition'];
  const css = `
    .ex { display: grid; gap: 14px; } .ex-top { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; justify-content: space-between; } .ex-top h2 { margin: 0; font-size: 1.05rem; }
    .ex-ctl { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; } .ex select, .ex input[type=search] { background: #2f3533; color: var(--cream); border: 1px solid var(--line); padding: 8px 10px; font: inherit; max-width: 100%; }
    .ex input[type=search] { min-width: 260px; flex: 1; }
    .ex-chips { display: flex; gap: 6px; flex-wrap: wrap; } .ex-chips button { padding: 5px 12px; border: 1px solid var(--line); background: transparent; color: var(--cream); font: 600 .78rem var(--sans); cursor: pointer; } .ex-chips button.on { background: rgba(242,193,78,.14); border-color: var(--gold); color: var(--gold); }
    .ex-layout { display: grid; grid-template-columns: minmax(250px, 320px) minmax(0, 1fr); gap: 16px; align-items: start; } @media (max-width: 900px) { .ex-layout { grid-template-columns: minmax(0, 1fr); } }
    .ex-list { display: grid; gap: 4px; max-height: 76vh; overflow: auto; } .ex-item { text-align: left; border: 1px solid var(--line); background: rgba(255,255,255,.025); color: var(--cream); padding: 10px 12px; cursor: pointer; display: grid; gap: 3px; font: inherit; } .ex-item:hover { background: rgba(255,255,255,.06); } .ex-item.on { border-color: var(--gold); background: rgba(242,193,78,.08); }
    .ex-item b { font: 700 .92rem var(--sans); } .ex-item small { opacity: .7; line-height: 1.4; } .ex-item i { font: normal 700 .62rem var(--sans); letter-spacing: .1em; text-transform: uppercase; color: var(--gold); }
    .ex-view { border: 1px solid var(--line); padding: 18px; display: grid; gap: 16px; min-width: 0; } .ex-view > h3 { margin: 0; font-size: 1.25rem; font-family: var(--serif); } .ex-view > .ex-sub { margin: -10px 0 0; opacity: .75; }
    .ex-pitch { width: 100%; max-width: 680px; height: auto; display: block; } .ex-fig { display: grid; gap: 8px; } .ex-note { font-size: .8rem; opacity: .72; line-height: 1.5; margin: 0; }
    .ex-legend { display: flex; gap: 14px; flex-wrap: wrap; font-size: .78rem; } .ex-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 5px; vertical-align: -1px; }
    .ex-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; } .ex-kpis div { border: 1px solid var(--line); background: rgba(255,255,255,.03); padding: 9px 12px; display: grid; gap: 1px; } .ex-kpis span { font-size: .66rem; letter-spacing: .08em; text-transform: uppercase; opacity: .65; } .ex-kpis b { font: 700 1.3rem var(--sans); } .ex-kpis small { opacity: .65; font-size: .74rem; }
    .ex-sec h4 { margin: 0 0 6px; font: 700 .82rem var(--sans); letter-spacing: .05em; text-transform: uppercase; color: var(--gold); } .ex-cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; } @media (max-width: 900px) { .ex-cols { grid-template-columns: minmax(0, 1fr); } }
    .ex-table td, .ex-table th { text-align: right; padding: 6px 10px; } .ex-table td.l, .ex-table th.l { text-align: left; }
    .ex-drill { min-height: 200px; } .ex-empty { padding: 24px; opacity: .75; }
    .ex-wb { position: fixed; left: 0; top: 0; bottom: 0; width: min(1000px, 96vw); z-index: 80; background: #1f2322; border-right: 1px solid var(--line); display: grid; grid-template-rows: auto 1fr; box-shadow: 20px 0 60px rgba(0,0,0,.4); } .ex-wb-head { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid var(--line); } .ex-wb-host { overflow: auto; }
  `;
  let SEL = 'report_match', QUERY = '', GROUP = 'All', MATCH = null, SIDE = 'us', STATE = {};
  const matchLabel = (lg, fx) => { const mine = fx.homeId === lg.userId, opp = FM.teamById(lg, mine ? fx.awayId : fx.homeId); return (fx.preseason ? 'Pre-season' : fx.cup ? 'Cup' : 'Round ' + fx.round) + ': ' + (mine ? 'vs ' : 'at ') + opp.name + ' ' + (mine ? fx.hg + '-' + fx.ag : fx.ag + '-' + fx.hg); };

  FM.renderAnalysis = function (host, lg) {
    if (!document.getElementById('exCss')) { const st = document.createElement('style'); st.id = 'exCss'; st.textContent = css + (FM.anLab ? FM.anLab.css : ''); document.head.appendChild(st); }
    if (FM.mountAgent && !document.getElementById('lmAgent')) FM.mountAgent(() => (FM.agentContext ? FM.agentContext(lg, 'analysis') : ''));
    if (FM.agentHide) FM.agentHide(false);
    FM.curLeague = lg;
    const matches = playedWithLogs(lg);
    if (!MATCH || !matches.find((f) => f.id === MATCH)) MATCH = matches.length ? matches[matches.length - 1].id : null;
    const fx = matches.find((f) => f.id === MATCH) || null;
    const q = QUERY.trim().toLowerCase(), words = q.split(/\s+/).filter(Boolean);
    const hit = (i) => (GROUP === 'All' || i.group === GROUP) && words.every((w) => (i.title + ' ' + i.tags + ' ' + i.blurb + ' ' + i.group).toLowerCase().indexOf(w) >= 0);
    const items = INV.filter(hit);
    if (!INV.find((i) => i.id === SEL)) SEL = INV[0].id;
    const cur = INV.find((i) => i.id === SEL);
    const list = items.length ? items.map((i) => `<button type="button" class="ex-item ${i.id === SEL ? 'on' : ''}" data-id="${i.id}"><i>${esc(i.group)}</i><b>${esc(i.title)}</b><small>${esc(i.blurb)}</small></button>`).join('') : '<div class="ex-empty">Nothing matches that search. Try "passes", "tackles", "xg" or "press".</div>';
    host.innerHTML = `<div class="ex">
      <div class="ex-top"><h2>Analysis</h2><div class="ex-ctl">
        <select id="exMatch" aria-label="Match">${matches.length ? matches.map((f) => `<option value="${f.id}"${f.id === MATCH ? ' selected' : ''}>${esc(matchLabel(lg, f))}</option>`).join('') : '<option>No matches with a record yet</option>'}</select>
        <select id="exSide" aria-label="Side"><option value="us"${SIDE === 'us' ? ' selected' : ''}>Our side</option><option value="them"${SIDE === 'them' ? ' selected' : ''}>The opposition</option></select>
        <button type="button" id="exWbOpen">Workbook</button></div></div>
      <div class="ex-ctl"><input type="search" id="exQ" placeholder="Search investigations: passing lanes, shots, press, finishing ..." value="${esc(QUERY)}" aria-label="Search investigations"></div>
      <div class="ex-chips">${GROUPS.map((g) => `<button type="button" data-g="${g}" class="${g === GROUP ? 'on' : ''}">${g}</button>`).join('')}</div>
      <div class="ex-layout"><div class="ex-list" id="exList">${list}</div><div class="ex-view" id="exView"></div></div>
      <aside class="ex-wb" id="exWb" hidden><div class="ex-wb-head"><b>Workbook</b><button type="button" id="exWbClose">Close</button></div><div class="ex-wb-host" id="exWbHost"></div></aside></div>`;
    const view = host.querySelector('#exView');
    const draw = () => {
      const inv = INV.find((i) => i.id === SEL), st = STATE[inv.id] = STATE[inv.id] || {};
      let ctrl = '';
      if (inv.controls && fx) {
        const cc = makeCtx(lg, fx, SIDE);
        ctrl = `<div class="ex-ctl">${inv.controls.map((k) => { const opts = k.opts === 'players' ? [['all', 'Whole team']].concat(Object.keys(cc.heatPlayers).map((id) => { const p = cc.team.players.find((x) => x.id === id) || (cc.team.squad || []).find((x) => x.id === id); return p ? [id, p.name] : null; }).filter(Boolean)) : k.opts; return `<label>${esc(k.label)} <select data-ctl="${k.id}">${opts.map((o) => `<option value="${esc(o[0])}"${(st[k.id] || opts[0][0]) === o[0] ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select></label>`; }).join('')}</div>`;
      }
      let body = '';
      try {
        if (inv.needs === 'scenario') {
          body = '<div class="ex-drill" id="exDrill"></div><p class="ex-note">Drag your players, or click a team-mate to choose the pass, then press Try it to run it against the next opponent.</p>';
          view.innerHTML = `<h3>${esc(inv.title)}</h3><p class="ex-sub">${esc(inv.blurb)}</p>${body}`;
          const AL = FM.anLab, lesson = AL && AL.LESSONS[inv.scenario], me = FM.teamById(lg, lg.userId), nx = FM.nextUserFixture(lg), played = matches[matches.length - 1];
          const ref = nx || played, opp = ref ? FM.teamById(lg, ref.homeId === lg.userId ? ref.awayId : ref.homeId) : null;
          if (!lesson || !opp) { view.querySelector('#exDrill').innerHTML = '<p class="note">A scenario needs an opponent: there is no fixture to build one from yet.</p>'; return; }
          const S = lesson.scenario(me, opp, lg, nx ? null : ref);
          if (S.chart) view.querySelector('#exDrill').innerHTML = `<div class="al-board">${S.chart('x')}</div>`; else AL.mountDrill(view.querySelector('#exDrill'), lg, S, lesson, 'alevel');
          return;
        }
        if (inv.needs === 'match' && !fx) body = '<p class="ex-empty">This needs a match with a record. Play a match first, and it will appear here.</p>';
        else if (inv.needs === 'season' && !matches.length) body = '<p class="ex-empty">This needs at least one match with a record.</p>';
        else { const c = inv.needs === 'match' ? makeCtx(lg, fx, SIDE) : { lg, matches }; body = inv.render(c, st); }
      } catch (e) { body = `<p class="ex-empty">This view could not be drawn from the data (${esc(e && e.message)}).</p>`; if (window.console) console.error(e); }
      view.innerHTML = `<h3>${esc(inv.title)}</h3><p class="ex-sub">${esc(inv.blurb)}</p>${inv.needs === 'match' && fx ? `<p class="ex-note">${esc(matchLabel(lg, fx))} · ${SIDE === 'us' ? 'our side' : 'the opposition'}</p>` : ''}${ctrl}${body}`;
      view.querySelectorAll('[data-ctl]').forEach((s) => s.addEventListener('change', () => { st[s.dataset.ctl] = s.value; draw(); }));
    };
    draw();
    host.querySelectorAll('.ex-item').forEach((b) => b.addEventListener('click', () => { SEL = b.dataset.id; host.querySelectorAll('.ex-item').forEach((x) => x.classList.toggle('on', x === b)); draw(); view.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }));
    host.querySelector('#exQ').addEventListener('input', (e) => { QUERY = e.target.value; const pos = e.target.selectionStart; FM.renderAnalysis(host, lg); const n = host.querySelector('#exQ'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (er) { /* fine */ } });
    host.querySelectorAll('[data-g]').forEach((b) => b.addEventListener('click', () => { GROUP = b.dataset.g; FM.renderAnalysis(host, lg); }));
    host.querySelector('#exMatch').addEventListener('change', (e) => { MATCH = e.target.value; FM.renderAnalysis(host, lg); });
    host.querySelector('#exSide').addEventListener('change', (e) => { SIDE = e.target.value; FM.renderAnalysis(host, lg); });
    const wb = host.querySelector('#exWb'), wbHost = host.querySelector('#exWbHost');
    host.querySelector('#exWbOpen').addEventListener('click', () => { wb.hidden = false; if (!wbHost.dataset.ready && FM.renderWorkbench) { wbHost.dataset.ready = '1'; try { FM.renderWorkbench(wbHost, lg, { save: () => FM.saveLeague(lg) }); } catch (e) { wbHost.textContent = 'The Workbook could not open.'; } } });
    host.querySelector('#exWbClose').addEventListener('click', () => { wb.hidden = true; });
  };
  // Opens the Workbook drawer on this page and puts the example into its Notes (and onto the clipboard, in case the notebook is slow to open).
  function openWorkbook(lg, text) {
    const wb = document.querySelector('#exWb'), wbH = document.querySelector('#exWbHost'); if (!wb || !wbH) return;
    wb.hidden = false;
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text); } catch (e) { /* the notes get it anyway */ }
    const send = () => { const f = wbH.querySelector('#wbNotes'); if (f && f.contentWindow) f.contentWindow.postMessage({ lm: 'wb-notes', op: 'append', text }, location.origin); };
    if (wbH.dataset.ready && wbH.querySelector('#wbNotes')) { send(); return; }
    let sent = false; const once = () => { if (sent) return; sent = true; window.removeEventListener('message', onMsg); send(); };
    const onMsg = (e) => { if (e.origin === location.origin && e.data && e.data.lm === 'wb-notes' && e.data.op === 'ready') once(); };
    window.addEventListener('message', onMsg); setTimeout(once, 60000);
    wbH.dataset.ready = '1';
    if (FM.renderWorkbench) { try { FM.renderWorkbench(wbH, lg, { save: () => FM.saveLeague(lg) }); } catch (e) { wbH.textContent = 'The Workbook could not open.'; } }
  }
  FM.explorer = { openWorkbook, INV, makeCtx, playedWithLogs, add, kpis, table, section, legend, ensureCss: () => { if (!document.getElementById('exCss')) { const st = document.createElement('style'); st.id = 'exCss'; st.textContent = css + (FM.anLab ? FM.anLab.css : ''); document.head.appendChild(st); } } };
})();
