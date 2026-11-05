// The player profile: everything the game knows about a player, drawn and measured, and tools to test whether signing him is a good idea. It opens over Recruitment.
//   Overview       the player against the others in his position (radar), strengths and weaknesses
//   Last season    his record from the season already played, per 90, against the others (percentiles), match by match
//   Price and value   what the market charges for a player like him (a regression on the whole market), his wage, how his value is likely to move
//   Regression lab    choose an outcome and some predictors, fit a model on the market, and see what it says about him
//   Squad fit      how he compares with the men he would play alongside or instead of, and what he does to the wage bill and the budget
//   The case       the evidence for and against, in one place
// Everything is computed from the game's own numbers: his attributes, last season's record (prior.js) and the prices the market sets.
(function () {
  const FM = (window.FM = window.FM || {});
  const S = FM.STAT;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = (v) => (Number.isFinite(v) ? (Math.round(v * 10) / 10).toFixed(1) : '–'), f2 = (v) => (Number.isFinite(v) ? (Math.round(v * 100) / 100).toFixed(2) : '–'), f0 = (v) => (Number.isFinite(v) ? String(Math.round(v)) : '–');
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const money = (m) => (FM.money ? FM.money(m) : '£' + f1(m) + 'm');
  const ATTR = [['pace', 'Pace'], ['dribbling', 'Dribbling'], ['passing', 'Passing'], ['finishing', 'Finishing'], ['tackling', 'Tackling'], ['heading', 'Heading'], ['composure', 'Composure'], ['stamina', 'Stamina']];
  const POSNAME = { GK: 'Goalkeeper', CB: 'Centre-back', FB: 'Full-back', DM: 'Defensive midfielder', CM: 'Central midfielder', AM: 'Attacking midfielder', WF: 'Winger', ST: 'Striker' };
  const KEY = {
    ST: ['goals', 'xg', 'shots', 'sotPct', 'assists', 'xa', 'keyPasses', 'dribbles', 'aerialsWon', 'passPct'],
    WF: ['goals', 'xg', 'shots', 'assists', 'xa', 'keyPasses', 'dribbles', 'dribblePct', 'passPct', 'tackles'],
    AM: ['goals', 'xg', 'assists', 'xa', 'keyPasses', 'shots', 'dribbles', 'passes', 'passPct', 'tackles'],
    CM: ['passes', 'passPct', 'keyPasses', 'assists', 'tackles', 'interceptions', 'dribbles', 'goals', 'aerialsWon', 'fouls'],
    DM: ['tackles', 'tackleWin', 'interceptions', 'passes', 'passPct', 'clearances', 'aerialsWon', 'keyPasses', 'fouls', 'dribbles'],
    FB: ['tackles', 'tackleWin', 'interceptions', 'keyPasses', 'dribbles', 'passes', 'passPct', 'assists', 'clearances', 'aerialsWon'],
    CB: ['tackles', 'tackleWin', 'interceptions', 'clearances', 'aerialsWon', 'aerialPct', 'passes', 'passPct', 'fouls', 'goals'],
    GK: ['savePct', 'conceded', 'saves', 'passPct', 'passes'],
  };

  // ---------- the market as a table ----------
  const cache = { key: null, rows: null };
  function levelMap(league) { const m = {}; FM.allDivisions(league).forEach((d) => d.teams.forEach((t) => { m[t.id] = d.level; })); return m; }
  function marketRows(league) {
    const t = FM.transfer(league), prior = FM.ensurePrior(league), key = league.season + ':' + league.day + ':' + t.moves.length + ':' + (prior && prior.divisions.length);
    if (cache.key === key && cache.rows) return cache.rows;
    const lv = levelMap(league), me = FM.teamById(league, league.userId), out = [];
    const teams = FM.allTeams(league).concat(t.pool ? [t.pool] : []);
    teams.forEach((tm) => tm.squad.forEach((p) => {
      const line = prior.players[p.id] || null, p90 = FM.per90(line), r = p.baseRatings || p.ratings;
      const ask = tm.isPool ? 0 : FM.askingPrice(league, p), value = FM.valueOf(p), row = {
        id: p.id, p, club: tm.name, clubId: tm.id, pool: !!tm.isPool, mine: tm === me, level: tm.isPool ? 0 : (lv[tm.id] || 1), pos: p.natural, age: FM.ageOf(p), ability: FM.abilityOf(p), potential: FM.potentialOf(p), rating: FM.playerRating(p, p.natural),
        price: tm.isPool ? 0 : ask, value, wage: FM.wageOf(p), contract: FM.contractLeft(p), line, p90, apps: line ? line.ap : 0, mins: line ? line.mn : 0, mrating: line ? line.rs : NaN,
      };
      ATTR.forEach(([k]) => { row['a_' + k] = FM.shown(r[k]); }); row.a_gk = FM.shown(r.gk != null ? r.gk : 40);
      out.push(row);
    }));
    cache.key = key; cache.rows = out; return out;
  }
  // the things that can be measured, for the lab and the charts
  const METRICS = [
    ['Player', [['age', 'Age', (r) => r.age], ['ability', 'Ability', (r) => r.ability], ['potential', 'Potential', (r) => r.potential], ['rating', 'Rating (0–10)', (r) => r.rating], ['contract', 'Contract (years left)', (r) => r.contract]]],
    ['Attributes', ATTR.map(([k, n]) => ['a_' + k, n, (r) => r['a_' + k]]).concat([['a_gk', 'Goalkeeping', (r) => r.a_gk]])],
    ['Market', [['price', 'Asking price (£m)', (r) => r.price], ['lnprice', 'ln(price)', (r) => (r.price > 0 ? Math.log(r.price) : NaN)], ['value', 'Value (£m)', (r) => r.value], ['wage', 'Wage (k a week)', (r) => r.wage], ['lnwage', 'ln(wage)', (r) => Math.log(Math.max(0.5, r.wage))], ['level', 'Division (1 = top)', (r) => r.level]]],
    ['Last season', [['mins', 'Minutes', (r) => r.mins], ['apps', 'Appearances', (r) => r.apps], ['mrating', 'Average match rating', (r) => r.mrating],
      ['goals', 'Goals per 90', (r) => (r.p90 ? r.p90.goals : NaN)], ['xg', 'xG per 90', (r) => (r.p90 ? r.p90.xg : NaN)], ['assists', 'Assists per 90', (r) => (r.p90 ? r.p90.assists : NaN)], ['xa', 'xA per 90', (r) => (r.p90 ? r.p90.xa : NaN)],
      ['shots', 'Shots per 90', (r) => (r.p90 ? r.p90.shots : NaN)], ['sotPct', 'Shots on target %', (r) => (r.line && r.line.sh ? 100 * r.line.sot / r.line.sh : NaN)], ['keyPasses', 'Key passes per 90', (r) => (r.p90 ? r.p90.keyPasses : NaN)],
      ['passes', 'Passes per 90', (r) => (r.p90 ? r.p90.passes : NaN)], ['passPct', 'Pass completion %', (r) => (r.p90 ? r.p90.passPct : NaN)], ['tackles', 'Tackles per 90', (r) => (r.p90 ? r.p90.tackles : NaN)], ['tackleWin', 'Tackle success %', (r) => (r.p90 ? r.p90.tackleWin : NaN)],
      ['interceptions', 'Interceptions per 90', (r) => (r.p90 ? r.p90.interceptions : NaN)], ['clearances', 'Clearances per 90', (r) => (r.p90 ? r.p90.clearances : NaN)], ['aerialsWon', 'Aerial duels won per 90', (r) => (r.p90 ? r.p90.aerialsWon : NaN)], ['aerialPct', 'Aerial duel success %', (r) => (r.p90 ? r.p90.aerialPct : NaN)],
      ['dribbles', 'Dribbles per 90', (r) => (r.p90 ? r.p90.dribbles : NaN)], ['dribblePct', 'Dribble success %', (r) => (r.p90 ? r.p90.dribblePct : NaN)], ['fouls', 'Fouls per 90', (r) => (r.p90 ? r.p90.fouls : NaN)], ['saves', 'Saves per 90', (r) => (r.p90 ? r.p90.saves : NaN)], ['savePct', 'Save %', (r) => (r.p90 ? r.p90.savePct : NaN)], ['conceded', 'Goals conceded per 90', (r) => (r.p90 ? r.p90.conceded : NaN)]]],
  ];
  const MET = {}; const METLIST = []; METRICS.forEach(([g, list]) => list.forEach(([id, label, get]) => { MET[id] = { id, label, get, group: g }; METLIST.push(MET[id]); }));
  const val = (r, id) => { const m = MET[id]; return m ? m.get(r) : NaN; };

  const pctile = (arr, v) => { const a = arr.filter(Number.isFinite); if (!a.length || !Number.isFinite(v)) return NaN; let below = 0, eq = 0; a.forEach((x) => { if (x < v) below++; else if (x === v) eq++; }); return 100 * (below + eq / 2) / a.length; };

  // ---------- drawing ----------
  const W = 640, H = 360;
  const niceTicks = (lo, hi, n) => { if (!(hi - lo > 1e-9)) { hi = lo + 1; } const span = hi - lo, step0 = span / Math.max(2, n), mag = Math.pow(10, Math.floor(Math.log10(step0))), norm = step0 / mag, step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag, out = []; for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v / step) * step); return out; };
  const tickLabel = (v) => (Math.abs(v) >= 100 ? String(Math.round(v)) : Math.abs(v) >= 10 ? f1(v).replace(/\.0$/, '') : String(Math.round(v * 100) / 100));
  function frame(w, h, body, cls) { return `<svg class="pf-svg ${cls || ''}" viewBox="0 0 ${w} ${h}" role="img" preserveAspectRatio="xMidYMid meet">${body}</svg>`; }
  // a scatter plot with an optional fitted line and prediction band; points are {x, y, k: 'peer'|'mine'|'hl', t: tooltip}
  function scatter(points, o) {
    o = o || {}; const w = o.w || W, h = o.h || H, ml = 56, mr = 16, mt = 14, mb = 44;
    const xs = points.map((p) => p.x).filter(Number.isFinite), ys = points.map((p) => p.y).filter(Number.isFinite); if (!xs.length) return '<p class="note">Nothing to plot.</p>';
    let x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    if (o.line) { y0 = Math.min(y0, o.line.a + o.line.b * x0, o.line.a + o.line.b * x1); y1 = Math.max(y1, o.line.a + o.line.b * x0, o.line.a + o.line.b * x1); }
    const px = (x1 - x0) > 1e-6 ? (x1 - x0) * 0.04 : 1, py = (y1 - y0) > 1e-6 ? (y1 - y0) * 0.06 : 1; x0 -= px; x1 += px; y0 -= py; y1 += py;
    const X = (v) => ml + (v - x0) / (x1 - x0) * (w - ml - mr), Y = (v) => h - mb - (v - y0) / (y1 - y0) * (h - mt - mb);
    const xf = o.xFmt || tickLabel, yf = o.yFmt || tickLabel;
    let g = '';
    niceTicks(x0, x1, 7).forEach((v) => { g += `<line x1="${X(v)}" x2="${X(v)}" y1="${mt}" y2="${h - mb}" class="pf-grid"/><text x="${X(v)}" y="${h - mb + 16}" class="pf-tick" text-anchor="middle">${esc(xf(v))}</text>`; });
    (o.yTicks ? o.yTicks.map(o.yTickMap || ((v) => v)).filter((v) => v > y0 && v < y1) : niceTicks(y0, y1, 6)).forEach((v) => { g += `<line x1="${ml}" x2="${w - mr}" y1="${Y(v)}" y2="${Y(v)}" class="pf-grid"/><text x="${ml - 6}" y="${Y(v) + 4}" class="pf-tick" text-anchor="end">${esc(yf(v))}</text>`; });
    g += `<text x="${(ml + w - mr) / 2}" y="${h - 6}" class="pf-axis" text-anchor="middle">${esc(o.xl || '')}</text><text transform="translate(14 ${(mt + h - mb) / 2}) rotate(-90)" class="pf-axis" text-anchor="middle">${esc(o.yl || '')}</text>`;
    if (o.line && o.band) {
      const pts = []; for (let i = 0; i <= 30; i++) { const x = x0 + (x1 - x0) * i / 30, se = o.band.sigma * Math.sqrt(1 + 1 / o.band.n + Math.pow(x - o.band.mx, 2) / o.band.sxx); pts.push([x, o.line.a + o.line.b * x + o.band.t * se]); }
      for (let i = 30; i >= 0; i--) { const x = x0 + (x1 - x0) * i / 30, se = o.band.sigma * Math.sqrt(1 + 1 / o.band.n + Math.pow(x - o.band.mx, 2) / o.band.sxx); pts.push([x, o.line.a + o.line.b * x - o.band.t * se]); }
      g += `<polygon points="${pts.map((p) => X(p[0]).toFixed(1) + ',' + Y(clamp(p[1], y0, y1)).toFixed(1)).join(' ')}" class="pf-band"/>`;
    }
    if (o.line) g += `<line x1="${X(x0)}" y1="${Y(o.line.a + o.line.b * x0)}" x2="${X(x1)}" y2="${Y(o.line.a + o.line.b * x1)}" class="pf-fit"/>`;
    if (o.diag) g += `<line x1="${X(Math.max(x0, y0))}" y1="${Y(Math.max(x0, y0))}" x2="${X(Math.min(x1, y1))}" y2="${Y(Math.min(x1, y1))}" class="pf-fit"/>`;
    const order = { peer: 0, mine: 1, hl: 2 };
    points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y)).sort((a, b) => order[a.k || 'peer'] - order[b.k || 'peer']).forEach((p) => { const r = p.k === 'hl' ? 6 : p.k === 'mine' ? 4 : 2.6; g += `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${r}" class="pf-pt ${p.k || 'peer'}"><title>${esc(p.t || '')}</title></circle>`; });
    const hl = points.find((p) => p.k === 'hl' && Number.isFinite(p.x)); if (hl && o.hlLabel) g += `<text x="${clamp(X(hl.x) + 9, ml, w - 90)}" y="${Y(hl.y) - 8}" class="pf-hl">${esc(o.hlLabel)}</text>`;
    return frame(w, h, g, 'pf-scatter');
  }
  function radar(axes, series, size) {
    const s = size || 360, c = s / 2, R = s / 2 - 52, n = axes.length, ang = (i) => -Math.PI / 2 + 2 * Math.PI * i / n, pt = (i, v) => [c + Math.cos(ang(i)) * R * v / 100, c + Math.sin(ang(i)) * R * v / 100];
    let g = ''; [25, 50, 75, 100].forEach((lvl) => { g += `<polygon points="${axes.map((_, i) => pt(i, lvl).map((v) => v.toFixed(1)).join(',')).join(' ')}" class="pf-ring"/>`; });
    axes.forEach((a, i) => { const e = pt(i, 100), l = pt(i, 118); g += `<line x1="${c}" y1="${c}" x2="${e[0].toFixed(1)}" y2="${e[1].toFixed(1)}" class="pf-grid"/><text x="${l[0].toFixed(1)}" y="${(l[1] + 4).toFixed(1)}" class="pf-tick" text-anchor="${Math.abs(l[0] - c) < 8 ? 'middle' : l[0] > c ? 'start' : 'end'}">${esc(a)}</text>`; });
    series.forEach((se) => { g += `<polygon points="${se.values.map((v, i) => pt(i, clamp(v, 0, 100)).map((q) => q.toFixed(1)).join(',')).join(' ')}" class="pf-poly ${se.cls}"><title>${esc(se.label)}</title></polygon>`; se.values.forEach((v, i) => { const q = pt(i, clamp(v, 0, 100)); g += `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="2.6" class="pf-dot ${se.cls}"><title>${esc(axes[i] + ': ' + f0(v))}</title></circle>`; }); });
    return frame(s, s, g, 'pf-radar');
  }
  function lines(series, o) {
    o = o || {}; const w = o.w || W, h = o.h || 300, ml = 52, mr = 16, mt = 14, mb = 40, all = [].concat.apply([], series.map((s) => s.pts)).filter((p) => Number.isFinite(p[1]));
    if (!all.length) return '<p class="note">Nothing to plot.</p>';
    let x0 = o.x0 != null ? o.x0 : Math.min.apply(null, all.map((p) => p[0])), x1 = o.x1 != null ? o.x1 : Math.max.apply(null, all.map((p) => p[0])), y0 = o.y0 != null ? o.y0 : Math.min.apply(null, all.map((p) => p[1])), y1 = o.y1 != null ? o.y1 : Math.max.apply(null, all.map((p) => p[1])); if (o.marks) o.marks.forEach((mk) => { y0 = Math.min(y0, mk.y); y1 = Math.max(y1, mk.y); }); if (x1 === x0) x1 = x0 + 1; const py = (y1 - y0) > 1e-6 ? (y1 - y0) * 0.08 : 1; if (o.y0 == null) y0 -= py; y1 += py;
    const X = (v) => ml + (v - x0) / (x1 - x0) * (w - ml - mr), Y = (v) => h - mb - (v - y0) / (y1 - y0) * (h - mt - mb); let g = '';
    niceTicks(x0, x1, 8).forEach((v) => { g += `<line x1="${X(v)}" x2="${X(v)}" y1="${mt}" y2="${h - mb}" class="pf-grid"/><text x="${X(v)}" y="${h - mb + 16}" class="pf-tick" text-anchor="middle">${esc((o.xFmt || tickLabel)(v))}</text>`; });
    niceTicks(y0, y1, 6).forEach((v) => { g += `<line x1="${ml}" x2="${w - mr}" y1="${Y(v)}" y2="${Y(v)}" class="pf-grid"/><text x="${ml - 6}" y="${Y(v) + 4}" class="pf-tick" text-anchor="end">${esc((o.yFmt || tickLabel)(v))}</text>`; });
    g += `<text x="${(ml + w - mr) / 2}" y="${h - 6}" class="pf-axis" text-anchor="middle">${esc(o.xl || '')}</text><text transform="translate(14 ${(mt + h - mb) / 2}) rotate(-90)" class="pf-axis" text-anchor="middle">${esc(o.yl || '')}</text>`;
    series.forEach((s) => { const pts = s.pts.filter((p) => Number.isFinite(p[1])); if (s.band) g += `<polygon points="${pts.map((p) => X(p[0]).toFixed(1) + ',' + Y(p[1] + s.band).toFixed(1)).join(' ')} ${pts.slice().reverse().map((p) => X(p[0]).toFixed(1) + ',' + Y(p[1] - s.band).toFixed(1)).join(' ')}" class="pf-band"/>`; g += `<polyline points="${pts.map((p) => X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(' ')}" class="pf-line ${s.cls || ''}"${s.dash ? ' stroke-dasharray="6 4"' : ''}${s.opacity ? ' opacity="' + s.opacity + '"' : ''}/>`; if (s.dots) pts.forEach((p) => { g += `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="3" class="pf-dot ${s.cls || ''}"><title>${esc(s.label + ': ' + f1(p[1]))}</title></circle>`; }); });
    (o.marks || []).forEach((mk) => { if (mk.guide) g += `<line x1="${X(mk.x)}" x2="${X(mk.x)}" y1="${Y(mk.y)}" y2="${h - mb}" class="pf-guide"/><line x1="${ml}" x2="${X(mk.x)}" y1="${Y(mk.y)}" y2="${Y(mk.y)}" class="pf-guide"/>`; g += `<circle cx="${X(mk.x).toFixed(1)}" cy="${Y(mk.y).toFixed(1)}" r="5.5" class="pf-dot ${mk.cls || 'hl'}"><title>${esc(mk.t || '')}</title></circle>`; if (mk.label) g += `<text x="${clamp(X(mk.x) + 9, ml, w - 120)}" y="${Y(mk.y) - 8}" class="pf-hl">${esc(mk.label)}</text>`; });
    const lx = o.legendRight ? w - mr - 170 : ml + 8; series.forEach((s, i) => { g += `<line x1="${lx}" x2="${lx + 18}" y1="${mt + 8 + i * 15}" y2="${mt + 8 + i * 15}" class="pf-line ${s.cls || ''}"${s.dash ? ' stroke-dasharray="6 4"' : ''}/><text x="${lx + 24}" y="${mt + 12 + i * 15}" class="pf-tick">${esc(s.label)}</text>`; });
    return frame(w, h, g, 'pf-lines');
  }
  function bars(items, o) {
    o = o || {}; const rowH = 24, w = o.w || 560, ml = o.ml || 170, h = items.length * rowH + 20, max = o.max != null ? o.max : Math.max.apply(null, items.map((i) => i.v)) || 1; let g = '';
    items.forEach((it, i) => { const y = 10 + i * rowH, bw = Math.max(0, (w - ml - 70) * clamp(it.v / max, 0, 1)); g += `<text x="${ml - 8}" y="${y + 14}" class="pf-tick" text-anchor="end">${esc(it.l)}</text><rect x="${ml}" y="${y + 3}" width="${w - ml - 70}" height="14" class="pf-track"/><rect x="${ml}" y="${y + 3}" width="${bw.toFixed(1)}" height="14" class="pf-bar ${it.cls || ''}"><title>${esc(it.t || '')}</title></rect>${o.mid != null ? `<line x1="${ml + (w - ml - 70) * o.mid / max}" x2="${ml + (w - ml - 70) * o.mid / max}" y1="${y}" y2="${y + 20}" class="pf-mid"/>` : ''}<text x="${w - 62}" y="${y + 14}" class="pf-val">${esc(it.s || '')}</text>`; });
    return frame(w, h, g, 'pf-bars');
  }
  function matchBars(rt) {
    const w = 640, h = 190, ml = 40, mb = 26, mt = 12, n = rt.length; if (!n) return '<p class="note">He did not play.</p>'; const lo = 4, hi = 10, bw = (w - ml - 10) / Math.max(n, 1), Y = (v) => h - mb - (v - lo) / (hi - lo) * (h - mb - mt); let g = '';
    [5, 6, 7, 8, 9].forEach((v) => { g += `<line x1="${ml}" x2="${w - 8}" y1="${Y(v)}" y2="${Y(v)}" class="pf-grid"/><text x="${ml - 6}" y="${Y(v) + 4}" class="pf-tick" text-anchor="end">${v}</text>`; });
    const avg = rt.reduce((a, r) => a + r[0], 0) / n; g += `<line x1="${ml}" x2="${w - 8}" y1="${Y(avg)}" y2="${Y(avg)}" class="pf-fit"/>`;
    rt.forEach((r, i) => { const x = ml + i * bw + bw * 0.14, y = Y(r[0]); g += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw * 0.72).toFixed(1)}" height="${(h - mb - y).toFixed(1)}" class="pf-bar ${r[0] >= 7 ? 'good' : r[0] < 6 ? 'bad' : ''}" opacity="${(0.35 + 0.65 * r[1] / 90).toFixed(2)}"><title>Match ${i + 1}: ${r[0]} in ${r[1]} minutes</title></rect><text x="${(x + bw * 0.36).toFixed(1)}" y="${h - 8}" class="pf-tick" text-anchor="middle">${i + 1}</text>`; });
    return frame(w, h, g, 'pf-match');
  }

  // ---------- the models ----------
  // ordinary least squares with leverage, so that a prediction for one player comes with an interval
  function fit(rows, yId, xIds) {
    const use = rows.filter((r) => Number.isFinite(val(r, yId)) && xIds.every((x) => Number.isFinite(val(r, x))));
    const p = xIds.length + 1; if (use.length < p + 6) return { error: 'Only ' + use.length + ' players have all of these measures: too few for a model with ' + xIds.length + ' predictor' + (xIds.length === 1 ? '' : 's') + '. Loosen the filters or use fewer predictors.', n: use.length };
    const X = use.map((r) => [1].concat(xIds.map((x) => val(r, x)))), y = use.map((r) => val(r, yId)), res = S.ols(X, y);
    if (!res) return { error: 'The predictors are too closely related to each other for the model to separate them (they say the same thing). Remove one.', n: use.length };
    const XtX = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => S.sum(X.map((r) => r[i] * r[j])))), inv = S.invert(XtX);
    const fitted = X.map((r) => S.sum(r.map((v, j) => v * res.beta[j]))), resid = y.map((v, i) => v - fitted[i]);
    const sdY = S.sd(y, true), std = xIds.map((x, j) => res.beta[j + 1] * S.sd(use.map((r) => val(r, x)), true) / (sdY || 1));
    return { use, X, y, res, inv, fitted, resid, std, tcrit: S.tInv(0.975, res.df), xIds, yId, n: use.length };
  }
  function predict(m, row) {
    if (!m || m.error) return null; const xv = [1].concat(m.xIds.map((x) => val(row, x))); if (xv.some((v) => !Number.isFinite(v))) return null;
    const yhat = S.sum(xv.map((v, j) => v * m.res.beta[j])); let h = 0; if (m.inv) for (let i = 0; i < xv.length; i++) for (let j = 0; j < xv.length; j++) h += xv[i] * m.inv[i][j] * xv[j];
    const se = m.res.sigma * Math.sqrt(1 + h); return { yhat, lo: yhat - m.tcrit * se, hi: yhat + m.tcrit * se, se, h };
  }
  const stars = (p) => (p < 0.001 ? '***' : p < 0.01 ? '**' : p < 0.05 ? '*' : '');

  // ---------- the pieces of the profile ----------
  const mean = (a) => { const b = a.filter(Number.isFinite); return b.length ? S.mean(b) : NaN; };

  function overview(ctx) {
    const { row, rows, league } = ctx, peers = rows.filter((r) => r.pos === row.pos && !r.pool), me = FM.teamById(league, league.userId);
    const pk = ATTR.map(([k]) => 'a_' + k), pm = pk.map((k) => mean(peers.map((r) => r[k]))), pv = pk.map((k) => row[k]);
    const mine = me.squad.filter((q) => q.natural === row.pos && q !== row.p).sort((a, b) => FM.playerRating(b, b.natural) - FM.playerRating(a, a.natural))[0];
    const mv = mine ? ATTR.map(([k]) => FM.shown((mine.baseRatings || mine.ratings)[k])) : null;
    const z = ATTR.map(([k, n], i) => { const sd = S.sd(peers.map((r) => r[pk[i]]), true) || 1; return { n, z: (pv[i] - pm[i]) / sd, v: pv[i] }; }).sort((a, b) => b.z - a.z);
    const series = [{ label: 'Average ' + (POSNAME[row.pos] || row.pos).toLowerCase(), values: pm, cls: 'avg' }].concat(mv ? [{ label: mine.name, values: mv, cls: 'mine' }] : []).concat([{ label: row.p.name, values: pv, cls: 'hl' }]);
    const facts = [['Club', row.club + (row.pool ? '' : ' · ' + ((FM.allDivisions(league).find((d) => d.level === row.level) || {}).name || ''))], ['Position', POSNAME[row.pos] || row.pos], ['Age', row.age], ['Nation', row.p.nation || '–'], ['Contract', row.pool ? 'Free agent' : row.contract + ' year' + (row.contract === 1 ? '' : 's') + ' left'],
      ['Wage', f1(row.wage) + 'k a week'], ['Value', money(row.value)], ['Asking price', row.pool ? 'Free' : money(row.price)], ['Ability / potential', row.ability + ' / ' + row.potential + ' (' + FM.potentialWord(row.p) + ')'], ['How he learns', FM.learningWord(row.p)], ['Condition', FM.isInjured(row.p) ? 'Injured' : Math.round(100 * FM.conditionOf(row.p)) + '% fit']];
    return `<div class="pf-two"><div class="pf-card"><h3>The player</h3><dl class="pf-facts">${facts.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl></div>
      <div class="pf-card"><h3>Against the other ${esc((POSNAME[row.pos] || row.pos).toLowerCase())}s in the game</h3>${radar(ATTR.map((a) => a[1]), series, 380)}<div class="pf-key"><span class="avg">Average</span>${mine ? `<span class="mine">${esc(mine.name)} (yours)</span>` : ''}<span class="hl">${esc(row.p.name)}</span></div></div></div>
      <div class="pf-two"><div class="pf-card"><h3>Strengths and weaknesses</h3><p class="note">Measured in standard deviations from the average ${esc((POSNAME[row.pos] || row.pos).toLowerCase())}, across ${peers.length} players.</p>${bars(z.map((a) => ({ l: a.n, v: Math.abs(a.z), s: (a.z >= 0 ? '+' : '−') + f1(Math.abs(a.z)) + ' sd', cls: a.z >= 0 ? 'good' : 'bad', t: a.n + ' ' + a.v })), { max: 3, w: 520 })}</div>
      <div class="pf-card"><h3>Attributes</h3><table class="data pf-table"><thead><tr><th class="l">Attribute</th><th>Him</th><th>Position average</th><th>${mine ? esc(mine.name.split(' ').slice(-1)[0]) + ' (yours)' : 'Your best'}</th></tr></thead><tbody>${ATTR.map(([k, n], i) => `<tr><td class="l">${n}</td><td><b>${pv[i]}</b></td><td>${f0(pm[i])}</td><td>${mv ? mv[i] : '–'}</td></tr>`).join('')}</tbody></table></div></div>`;
  }

  function lastSeason(ctx) {
    const { row, rows, league } = ctx, line = row.line, prior = league.prior;
    if (!line) return '<div class="pf-card"><h3>Last season</h3><p class="note">He has no record: he did not play in any division last season.</p></div>';
    const peers = rows.filter((r) => r.pos === row.pos && !r.pool && r.mins >= 360), keys = KEY[row.pos] || KEY.CM;
    const pcts = keys.map((k) => ({ id: k, p: pctile(peers.map((r) => val(r, k)), val(row, k)), v: val(row, k) }));
    const inverse = { fouls: 1, conceded: 1 };
    const tbl = [['Appearances', line.ap + ' (' + line.st + ' starts)'], ['Minutes', line.mn], ['Goals / assists', line.g + ' / ' + line.a], ['xG / xA', f1(line.xg) + ' / ' + f1(line.xa)], ['Shots (on target)', line.sh + ' (' + line.sot + ')'], ['Key passes', line.kp], ['Passes (completed)', line.ps + ' (' + f0(100 * line.pok / Math.max(1, line.ps)) + '%)'], ['Tackles (won)', line.tk + ' (' + line.tkw + ')'], ['Interceptions / clearances', line.ic + ' / ' + line.cl], ['Aerial duels won', line.aw + ' of ' + (line.aw + line.al)], ['Dribbles (won)', line.dr + ' (' + line.drw + ')'], ['Fouls, yellow, red', line.fl + ', ' + line.yc + ', ' + line.rc], ['Average rating', f2(line.rs)]].concat(row.pos === 'GK' ? [['Saves, conceded, clean sheets', line.sv + ', ' + line.ga + ', ' + line.cs]] : []);
    const rt = (line.rt || []).map((s) => { const q = s.split(','); return [+q[0] / 10, +q[1]]; });
    const t = (prior.divisions.find((d) => d.level === row.level) || {}).table || [], tr = t.find((r) => r.id === row.clubId);
    const over = line.g - line.xg;
    return `<div class="pf-two"><div class="pf-card"><h3>Last season</h3><table class="data pf-table"><tbody>${tbl.map(([a, b]) => `<tr><td class="l">${esc(a)}</td><td><b>${esc(b)}</b></td></tr>`).join('')}</tbody></table>
      ${tr ? `<p class="note">${esc(row.club)} finished ${tr.pos}${['st', 'nd', 'rd'][tr.pos - 1] || 'th'} with ${tr.Pts} points (${tr.GF} scored, ${tr.GA} conceded).</p>` : ''}
      ${row.pos !== 'GK' ? `<p class="note">${over > 1.5 ? 'He scored ' + f1(over) + ' more than his chances were worth: some of that may be finishing, some luck, and luck does not carry over.' : over < -1.5 ? 'He scored ' + f1(-over) + ' fewer than his chances were worth, which usually evens out.' : 'His goals are close to what his chances were worth.'}</p>` : ''}</div>
      <div class="pf-card"><h3>Against ${peers.length} other ${esc((POSNAME[row.pos] || row.pos).toLowerCase())}s</h3><p class="note">Percentile of each measure per 90 minutes (players with at least 360 minutes). Fifty is the middle.</p>${bars(pcts.map((a) => { const pc = Number.isFinite(a.p) ? (inverse[a.id] ? 100 - a.p : a.p) : 0; return { l: MET[a.id].label.replace(/ per 90| %/, ''), v: pc, s: Number.isFinite(a.p) ? f0(inverse[a.id] ? 100 - a.p : a.p) + 'th · ' + f2(a.v) : '–', cls: pc >= 66 ? 'good' : pc < 33 ? 'bad' : '', t: MET[a.id].label + ': ' + f2(a.v) }; }), { max: 100, mid: 50, w: 600, ml: 190 })}</div></div>
      <div class="pf-card"><h3>Match by match</h3><p class="note">His rating in each match he played (the height is the rating, the shade is the minutes). The line is his average.</p>${matchBars(rt)}</div>`;
  }

  // the price model: ln(asking price) on rating, age and potential, fitted on every player at a club
  function priceModel(rows, row) {
    const base = rows.filter((r) => !r.pool && r.price > 0.25 && r.pos === row.pos), all = rows.filter((r) => !r.pool && r.price > 0.25);
    const set = base.length >= 40 ? base : all;
    const m = fit(set, 'lnprice', ['rating', 'age', 'potential']); if (m.error) return { m, set };
    return { m, set, predicted: predict(m, row) };
  }
  function priceAndValue(ctx) {
    const { row, rows, league } = ctx, me = FM.teamById(league, league.userId), t = FM.transfer(league), pm = priceModel(rows, row);
    const peers = rows.filter((r) => !r.pool && r.price > 0.25 && r.pos === row.pos).filter((r) => (ctx.local.sameDiv ? r.level === row.level : true));
    const lm = S.linreg(peers.map((r) => r.rating), peers.map((r) => Math.log(r.price))), sig = Math.sqrt(S.sum(peers.map((r) => Math.pow(Math.log(r.price) - (lm.a + lm.b * r.rating), 2))) / Math.max(1, peers.length - 2)), mx = S.mean(peers.map((r) => r.rating)), sxx = S.sum(peers.map((r) => Math.pow(r.rating - mx, 2)));
    const pts = peers.map((r) => ({ x: r.rating, y: Math.log(r.price), k: r.id === row.id ? 'hl' : r.mine ? 'mine' : 'peer', t: r.p.name + ' (' + r.age + ', ' + r.club + '): rating ' + r.rating + ', ' + money(r.price) }));
    if (!row.pool && !pts.some((p) => p.k === 'hl')) pts.push({ x: row.rating, y: Math.log(Math.max(0.1, row.price)), k: 'hl', t: row.p.name });
    const exp = pm.predicted ? Math.exp(pm.predicted.yhat) : NaN, lo = pm.predicted ? Math.exp(pm.predicted.lo) : NaN, hi = pm.predicted ? Math.exp(pm.predicted.hi) : NaN, ratio = row.price > 0 && Number.isFinite(exp) ? row.price / exp : NaN;
    const z = pm.predicted ? (Math.log(Math.max(0.1, row.price)) - pm.predicted.yhat) / pm.predicted.se : NaN;
    // wages: wage against rating
    const wp = peers.map((r) => ({ x: r.rating, y: Math.log(Math.max(0.5, r.wage)), k: r.id === row.id ? 'hl' : r.mine ? 'mine' : 'peer', t: r.p.name + ': ' + f1(r.wage) + 'k a week' })), wl = S.linreg(wp.map((p) => p.x), wp.map((p) => p.y));
    const wsig = Math.sqrt(S.sum(wp.map((p) => Math.pow(p.y - (wl.a + wl.b * p.x), 2))) / Math.max(1, wp.length - 2)), wexp = Math.exp(wl.a + wl.b * row.rating);
    // age curve for the position
    const byAge = {}; rows.filter((r) => !r.pool && r.pos === row.pos).forEach((r) => { (byAge[r.age] = byAge[r.age] || []).push(r); });
    const ages = Object.keys(byAge).map(Number).sort((a, b) => a - b).filter((a) => byAge[a].length >= 3), curve = ages.map((a) => [a, S.mean(byAge[a].map((r) => r.rating))]), pcurve = ages.map((a) => [a, S.mean(byAge[a].map((r) => r.potential / 10))]);
    const proj = projection(row), dev = ages.map(() => 0); void dev;
    const verdictPrice = !Number.isFinite(ratio) ? 'He is a free agent: there is no fee to judge.' : ratio < 0.8 ? 'cheap for what he is: the market would charge about ' + money(exp) + '.' : ratio > 1.25 ? 'dear for what he is: the market would charge about ' + money(exp) + '.' : 'about the going rate (the model says ' + money(exp) + ').';
    return `<div class="pf-two"><div class="pf-card"><h3>What the market charges</h3>
      <p class="note">Every ${esc((POSNAME[row.pos] || row.pos).toLowerCase())} priced above £0.25m, ln(price) against rating. The line is the fit; the shaded area is where 95% of players fall. ${ctx.local.sameDiv ? 'Same division only.' : ''}</p>
      <label class="pf-check"><input type="checkbox" id="pfSameDiv"${ctx.local.sameDiv ? ' checked' : ''}> Same division only</label>
      ${scatter(pts, { xl: 'Rating (0–10)', yl: 'Asking price', yTicks: [0.3, 0.5, 1, 2, 5, 10, 20, 50], yTickMap: Math.log, yFmt: (v) => '£' + tickLabel(Math.exp(v)) + 'm', line: { a: lm.a, b: lm.b }, band: { sigma: sig, t: 1.96, n: peers.length, mx, sxx }, hlLabel: row.p.name })}
      <p class="pf-stat">ln(price) = ${f2(lm.a)} + ${f2(lm.b)} × rating &nbsp;·&nbsp; r² = ${f2(lm.r2)} &nbsp;·&nbsp; n = ${peers.length}</p></div>
      <div class="pf-card"><h3>Is he fairly priced?</h3>${pm.predicted ? `<table class="data pf-table"><tbody><tr><td class="l">Asking price</td><td><b>${row.pool ? 'Free' : money(row.price)}</b></td></tr><tr><td class="l">Model price (rating, age and potential)</td><td><b>${money(exp)}</b></td></tr><tr><td class="l">95% range for a player like him</td><td>${money(lo)} to ${money(hi)}</td></tr><tr><td class="l">Asking ÷ model</td><td><b>${Number.isFinite(ratio) ? f2(ratio) : '–'}</b></td></tr><tr><td class="l">Standard deviations from the model</td><td>${Number.isFinite(z) ? (z > 0 ? '+' : '') + f2(z) : '–'}</td></tr><tr><td class="l">Model fit</td><td>r² ${f2(pm.m.res.r2)}, n = ${pm.m.n}</td></tr></tbody></table>
      <p>He is ${esc(verdictPrice)}</p><table class="data pf-table"><thead><tr><th class="l">Predictor</th><th>Coefficient</th><th>Std. error</th><th>p</th></tr></thead><tbody>${['Intercept', 'Rating', 'Age', 'Potential'].map((n, i) => `<tr><td class="l">${n}</td><td>${f2(pm.m.res.beta[i])}</td><td>${f2(pm.m.res.se[i])}</td><td>${pm.m.res.p[i] < 0.001 ? '<0.001' : f2(pm.m.res.p[i])} ${stars(pm.m.res.p[i])}</td></tr>`).join('')}</tbody></table>
      <p class="note">The coefficients are on ln(price): each extra point of rating multiplies the price by about ${f2(Math.exp(pm.m.res.beta[1]))}, and each year of age by ${f2(Math.exp(pm.m.res.beta[2]))}.</p>` : '<p class="note">The model could not be fitted.</p>'}</div></div>
      <div class="pf-two"><div class="pf-card"><h3>His wage</h3><p class="note">Wage against rating for the same position.</p>${scatter(wp, { xl: 'Rating (0–10)', yl: 'Wage a week', yTicks: [2, 5, 10, 20, 50, 100], yTickMap: Math.log, yFmt: (v) => tickLabel(Math.exp(v)) + 'k', line: { a: wl.a, b: wl.b }, band: { sigma: wsig, t: 1.96, n: wp.length, mx, sxx }, hlLabel: row.p.name })}
        <p class="pf-stat">He earns ${f1(row.wage)}k a week; the fit says ${f1(wexp)}k for his rating (${row.wage > wexp * 1.15 ? 'above' : row.wage < wexp * 0.87 ? 'below' : 'about'} the line). Expect him to ask about ${f1(row.wage * 1.25)}k.</p></div>
      <div class="pf-card"><h3>How players of his position age</h3><p class="note">Average rating by age (all ${esc((POSNAME[row.pos] || row.pos).toLowerCase())}s) and what they could become. He is ${row.age}.</p>${lines([{ label: 'Average rating', pts: curve, cls: 'avg', dots: true }, { label: 'Average potential', pts: pcurve, cls: 'mine' }, { label: row.p.name + ' (projected)', pts: proj.map((p) => [row.age + p.y, p.rating]), cls: 'hl', dots: true }], { xl: 'Age', yl: 'Rating (0–10)', y0: 5 })}</div></div>
      <div class="pf-card"><h3>Where his value is heading</h3><p class="note">Projected ability and value over the next five seasons, from his potential and how players of his age usually move. His value now is ${money(row.value)}${row.pool ? '' : ' against an asking price of ' + money(row.price)}.</p>
      ${lines([{ label: 'Projected value (£m)', pts: proj.map((p) => [p.y, p.value]), cls: 'hl', dots: true }].concat(row.pool ? [] : [{ label: 'Price paid (£m)', pts: proj.map((p) => [p.y, row.price]), cls: 'avg' }]), { xl: 'Seasons from now', yl: '£m' })}
      <p class="pf-stat">${proj[3].value >= row.price ? 'In three seasons he is projected to be worth ' + money(proj[3].value) + ', so the fee is recovered if he is sold then.' : 'In three seasons he is projected to be worth ' + money(proj[3].value) + ': about ' + money(Math.max(0, row.price - proj[3].value)) + ' of the fee would be lost on resale.'}</p></div>`;
  }
  // a simple development path: towards potential while young, level through the prime, declining after thirty
  function projection(row) {
    const out = []; let ab = row.ability, age = row.age;
    for (let y = 0; y <= 5; y++) {
      const a = age + y; const room = row.potential - ab;
      if (y > 0) ab += a <= 24 ? Math.max(0, room) * 0.35 : a <= 27 ? Math.max(0, room) * 0.15 : a <= 30 ? 0 : -(1.2 + 0.5 * (a - 31));
      const rating = ab / 10, v = FM.valueOf(Object.assign({}, row.p, { age: a, baseRatings: shiftRatings(row.p, (ab - row.ability) / 10 * 1) }));
      out.push({ y, ability: ab, rating, value: Number.isFinite(v) ? v : row.value });
    }
    return out;
  }
  const shiftRatings = (p, d) => { const r = Object.assign({}, p.baseRatings || p.ratings), k = d * 3.2; Object.keys(r).forEach((x) => { if (typeof r[x] === 'number') r[x] = clamp(r[x] + k, 20, 99); }); return r; };

  // ---------- the regression lab ----------
  const PRESETS = [
    { name: 'What predicts goals per 90?', y: 'goals', x: ['a_finishing', 'a_composure', 'xg'], scope: 'outfield' },
    { name: 'What drives the asking price?', y: 'lnprice', x: ['rating', 'age', 'potential', 'contract'], scope: 'pos' },
    { name: 'Do attributes explain match rating?', y: 'mrating', x: ['a_pace', 'a_dribbling', 'a_passing', 'a_finishing', 'a_tackling', 'a_composure'], scope: 'outfield' },
    { name: 'Does age matter once rating is known?', y: 'ability', x: ['age', 'potential'], scope: 'pos' },
    { name: 'What makes a good passer?', y: 'passPct', x: ['a_passing', 'a_composure', 'a_stamina', 'age'], scope: 'outfield' },
    { name: 'Wages: rating or age?', y: 'lnwage', x: ['rating', 'age', 'level'], scope: 'pos' },
  ];
  function lab(ctx) {
    const L = ctx.local, row = ctx.row, rows = ctx.rows;
    let scoped = rows.filter((r) => !r.pool || L.scope === 'market');
    if (L.scope === 'pos') scoped = scoped.filter((r) => r.pos === row.pos); else if (L.scope === 'posdiv') scoped = scoped.filter((r) => r.pos === row.pos && r.level === row.level); else if (L.scope === 'outfield') scoped = scoped.filter((r) => r.pos !== 'GK'); else if (L.scope === 'level') scoped = scoped.filter((r) => r.level === row.level);
    if (L.minMins > 0) scoped = scoped.filter((r) => r.mins >= L.minMins);
    const m = L.y && L.x.length ? fit(scoped, L.y, L.x) : { error: 'Choose an outcome and at least one predictor.' };
    const pr = !m.error ? predict(m, row) : null, actual = val(row, L.y);
    const names = ['Intercept'].concat(L.x.map((x) => MET[x].label));
    let chart = '', out = '';
    if (m.error) out = `<div class="pf-card"><p class="note">${esc(m.error)}</p></div>`;
    else {
      const k = m.xIds.length;
      if (k === 1) {
        const xs = m.use.map((r) => val(r, m.xIds[0])), mx = S.mean(xs), sxx = S.sum(xs.map((v) => Math.pow(v - mx, 2)));
        chart = scatter(m.use.map((r, i) => ({ x: xs[i], y: m.y[i], k: r.id === row.id ? 'hl' : r.mine ? 'mine' : 'peer', t: r.p.name + ': ' + f2(xs[i]) + ', ' + f2(m.y[i]) })), { xl: MET[m.xIds[0]].label, yl: MET[L.y].label, line: { a: m.res.beta[0], b: m.res.beta[1] }, band: { sigma: m.res.sigma, t: m.tcrit, n: m.n, mx, sxx }, hlLabel: row.p.name });
      } else chart = scatter(m.use.map((r, i) => ({ x: m.fitted[i], y: m.y[i], k: r.id === row.id ? 'hl' : r.mine ? 'mine' : 'peer', t: r.p.name + ': predicted ' + f2(m.fitted[i]) + ', actual ' + f2(m.y[i]) })), { xl: 'Predicted ' + MET[L.y].label, yl: 'Actual ' + MET[L.y].label, diag: true, hlLabel: row.p.name });
      // residuals against fitted, to see whether a straight-line model is a fair description
      const resChart = scatter(m.use.map((r, i) => ({ x: m.fitted[i], y: m.resid[i], k: r.id === row.id ? 'hl' : r.mine ? 'mine' : 'peer', t: r.p.name + ': residual ' + f2(m.resid[i]) })), { xl: 'Fitted ' + MET[L.y].label, yl: 'Residual', line: { a: 0, b: 0 } });
      // correlations
      const ids = [L.y].concat(m.xIds), corr = ids.map((a) => ids.map((b) => S.pmcc(m.use.map((r) => val(r, a)), m.use.map((r) => val(r, b)))));
      const heat = `<table class="data pf-table pf-corr"><thead><tr><th></th>${ids.map((i) => `<th title="${esc(MET[i].label)}">${esc(MET[i].label.replace(/ per 90| \(.*\)/g, '').slice(0, 11))}</th>`).join('')}</tr></thead><tbody>${ids.map((a, i) => `<tr><td class="l">${esc(MET[a].label.replace(/ per 90| \(.*\)/g, ''))}</td>${corr[i].map((c) => `<td style="background:${Number.isFinite(c) ? (c >= 0 ? 'rgba(127,227,166,' : 'rgba(231,122,106,') + Math.min(0.75, Math.abs(c)) + ')' : 'transparent'}">${f2(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      const nSig = m.res.p.slice(1).filter((p) => p < 0.05).length, vif = null; void vif;
      out = `<div class="pf-two"><div class="pf-card"><h3>The model</h3><p class="pf-stat">${esc(MET[L.y].label)} = ${m.res.beta.map((b, i) => (i === 0 ? f2(b) : (b < 0 ? ' − ' : ' + ') + f2(Math.abs(b)) + ' × ' + esc(MET[m.xIds[i - 1]].label))).join('')}</p>
        <table class="data pf-table"><thead><tr><th class="l">Term</th><th>Coefficient</th><th>Std. error</th><th>t</th><th>p</th><th>Std. beta</th></tr></thead><tbody>${m.res.beta.map((b, i) => `<tr><td class="l">${esc(names[i])}</td><td><b>${f2(b)}</b></td><td>${f2(m.res.se[i])}</td><td>${f2(m.res.t[i])}</td><td>${m.res.p[i] < 0.001 ? '<0.001' : f2(m.res.p[i])} ${stars(m.res.p[i])}</td><td>${i === 0 ? '' : f2(m.std[i - 1])}</td></tr>`).join('')}</tbody></table>
        <table class="data pf-table"><tbody><tr><td class="l">Players in the model</td><td><b>${m.n}</b></td></tr><tr><td class="l">r² / adjusted r²</td><td><b>${f2(m.res.r2)}</b> / ${f2(m.res.adjR2)}</td></tr><tr><td class="l">F-test (all predictors together)</td><td>${Number.isFinite(m.res.F) ? 'F = ' + f2(m.res.F) + ', p ' + (m.res.fp < 0.001 ? '< 0.001' : '= ' + f2(m.res.fp)) : '–'}</td></tr><tr><td class="l">Residual standard error</td><td>${f2(m.res.sigma)}</td></tr></tbody></table>
        <p class="note">${m.res.r2 >= 0.6 ? 'The predictors explain most of the differences between players.' : m.res.r2 >= 0.25 ? 'The predictors explain a fair part of the differences, and a lot is left over.' : 'The predictors explain little: treat the coefficients with care.'} ${nSig === m.xIds.length ? 'Every predictor is significant at 5%.' : nSig === 0 ? 'No predictor is significant at 5%, so the model should not be trusted.' : nSig + ' of ' + m.xIds.length + ' predictors are significant at 5%.'} Stars: * p&lt;0.05, ** p&lt;0.01, *** p&lt;0.001. The standardised betas compare the predictors on one scale.</p></div>
        <div class="pf-card"><h3>What it says about ${esc(row.p.name)}</h3>${pr ? `<table class="data pf-table"><tbody><tr><td class="l">Model predicts for him</td><td><b>${f2(pr.yhat)}</b></td></tr><tr><td class="l">95% prediction interval</td><td>${f2(pr.lo)} to ${f2(pr.hi)}</td></tr><tr><td class="l">His actual figure</td><td><b>${Number.isFinite(actual) ? f2(actual) : '–'}</b></td></tr><tr><td class="l">Difference (actual − predicted)</td><td>${Number.isFinite(actual) ? (actual - pr.yhat >= 0 ? '+' : '') + f2(actual - pr.yhat) : '–'}</td></tr><tr><td class="l">In standard errors</td><td>${Number.isFinite(actual) ? f2((actual - pr.yhat) / pr.se) : '–'}</td></tr></tbody></table><p class="note">${!Number.isFinite(actual) ? 'He has no figure for this outcome.' : Math.abs(actual - pr.yhat) <= (pr.hi - pr.lo) / 2 ? 'He is inside the interval: nothing unusual about him given these predictors.' : actual > pr.yhat ? 'He is above the interval: he does more than the model expects from his predictors. Check whether that is skill or luck.' : 'He is below the interval: he does less than the model expects.'}${pr.h > 0.2 ? ' He is unusual on these predictors, so the prediction is less reliable.' : ''}</p>` : '<p class="note">He is missing one of the measures, so the model cannot predict for him.</p>'}
        <h3>Correlations</h3>${heat}</div></div>
        <div class="pf-two"><div class="pf-card"><h3>${k === 1 ? 'The fit' : 'Predicted against actual'}</h3>${chart}</div><div class="pf-card"><h3>Residuals</h3><p class="note">A model is only a fair description if the residuals show no pattern around zero.</p>${resChart}</div></div>`;
    }
    const opts = (sel, f) => METLIST.filter(f || (() => true)).map((x) => `<option value="${x.id}"${sel === x.id ? ' selected' : ''}>${esc(x.group)}: ${esc(x.label)}</option>`).join('');
    const xbox = METRICS.map(([g, list]) => `<fieldset class="pf-xset"><legend>${esc(g)}</legend>${list.map(([id, label]) => `<label><input type="checkbox" data-x="${id}"${L.x.indexOf(id) >= 0 ? ' checked' : ''}> ${esc(label)}</label>`).join('')}</fieldset>`).join('');
    return `<div class="pf-card"><h3>Regression lab</h3><p class="note">Fit a model on the market and see what it says about ${esc(row.p.name)}. Choose what to explain, what to explain it with, and which players to use.</p>
      <div class="pf-presets">${PRESETS.map((p, i) => `<button type="button" data-preset="${i}">${esc(p.name)}</button>`).join('')}</div>
      <div class="pf-ctl"><label>Explain<select id="pfY">${opts(L.y)}</select></label><label>Players<select id="pfScope">${[['pos', 'Same position'], ['posdiv', 'Same position and division'], ['outfield', 'All outfield players'], ['level', 'His division'], ['market', 'The whole market, free agents too']].map(([v, n]) => `<option value="${v}"${L.scope === v ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      <label>At least this many minutes last season<input type="number" id="pfMins" min="0" step="90" value="${L.minMins}"></label></div>
      <details class="pf-x"${L.xOpen ? ' open' : ''}><summary>Predictors (${L.x.length} chosen)</summary><div class="pf-xgrid">${xbox}</div></details></div>${out}`;
  }

  // ---------- his place in my squad ----------
  function squadFit(ctx) {
    const { row, rows, league } = ctx, me = FM.teamById(league, league.userId), t = FM.transfer(league), room = FM.wageRoom(league, me.id);
    const mates = me.squad.filter((q) => q.natural === row.pos).sort((a, b) => FM.playerRating(b, b.natural) - FM.playerRating(a, a.natural));
    const myRows = mates.map((q) => rows.find((r) => r.id === q.id)).filter(Boolean), starters = me.players.filter((q) => q.natural === row.pos).length;
    const best = myRows[0], worstStarter = myRows[Math.max(0, Math.min(myRows.length - 1, starters - 1))];
    const cmpMetrics = row.pos === 'GK' ? ['rating', 'age', 'wage', 'mrating', 'savePct'] : ['rating', 'potential', 'age', 'wage', 'mrating'].concat((KEY[row.pos] || []).slice(0, 4));
    const items = myRows.map((r) => ({ l: r.p.name, v: r.rating, s: f1(r.rating), cls: 'mine', t: r.p.name })).concat([{ l: row.p.name + ' (target)', v: row.rating, s: f1(row.rating), cls: 'hl' }]).sort((a, b) => b.v - a.v);
    const wageNow = me.squad.reduce((a, q) => a + FM.wageOf(q), 0), wageAfter = wageNow + row.wage * 1.25, bill = (x) => x * (FM.bizInternals ? 1 : 1);
    const ages = me.squad.map((q) => FM.ageOf(q)), hist = {}; ages.concat([row.age]).forEach((a) => { const b = Math.floor(a / 3) * 3; hist[b] = hist[b] || { mine: 0, hl: 0 }; });
    ages.forEach((a) => { hist[Math.floor(a / 3) * 3].mine++; }); hist[Math.floor(row.age / 3) * 3].hl++;
    const hb = Object.keys(hist).map(Number).sort((a, b) => a - b).map((b) => ({ l: b + '–' + (b + 2), v: hist[b].mine + hist[b].hl, s: hist[b].mine + (hist[b].hl ? ' + 1' : ''), cls: hist[b].hl ? 'hl' : 'mine' }));
    const budget = t.budget[me.id] || 0, after = budget - (row.pool ? 0 : row.price);
    const gain = best ? row.rating - (starters > 0 ? worstStarter.rating : best.rating) : row.rating;
    return `<div class="pf-two"><div class="pf-card"><h3>Against your ${esc((POSNAME[row.pos] || row.pos).toLowerCase())}s</h3>${bars(items, { max: 10, w: 560 })}
      <table class="data pf-table"><thead><tr><th class="l">Measure</th><th>Him</th>${myRows.slice(0, 3).map((r) => `<th>${esc(r.p.name.split(' ').slice(-1)[0])}</th>`).join('')}</tr></thead><tbody>${cmpMetrics.filter((k) => MET[k]).map((k) => `<tr><td class="l">${esc(MET[k].label)}</td><td><b>${f2(val(row, k))}</b></td>${myRows.slice(0, 3).map((r) => `<td>${f2(val(r, k))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <div class="pf-card"><h3>What he does for the squad</h3><table class="data pf-table"><tbody>
        <tr><td class="l">You start ${starters} ${esc((POSNAME[row.pos] || row.pos).toLowerCase())}${starters === 1 ? '' : 's'}; the weakest starter is</td><td><b>${worstStarter ? esc(worstStarter.p.name) + ' (' + f1(worstStarter.rating) + ')' : 'nobody'}</b></td></tr>
        <tr><td class="l">He would be</td><td><b>${gain > 0.4 ? 'a clear improvement (+' + f1(gain) + ')' : gain > 0 ? 'a small improvement (+' + f1(gain) + ')' : gain > -0.5 ? 'about the same (' + f1(gain) + ')' : 'a squad player (' + f1(gain) + ')'}</b></td></tr>
        <tr><td class="l">Cover in the position now</td><td>${mates.length} player${mates.length === 1 ? '' : 's'}${FM.clubNeeds(me).indexOf(row.pos) >= 0 ? ' (short of cover)' : ''}</td></tr>
        <tr><td class="l">Wage room / his likely wage</td><td>${f1(room)}k / ${f1(row.wage * 1.25)}k ${room >= row.wage * 1.25 ? '' : '<b class="bad">(over)</b>'}</td></tr>
        <tr><td class="l">Wage bill after (a week)</td><td>${f1(wageAfter)}k (now ${f1(wageNow)}k, +${f1(row.wage * 1.25)}k)</td></tr>
        <tr><td class="l">Transfer budget / price</td><td>${money(budget)} / ${row.pool ? 'free' : money(row.price)} ${row.pool ? '' : after >= 0 ? '' : '<b class="bad">(over)</b>'}</td></tr>
        <tr><td class="l">Budget left after the fee</td><td><b>${money(Math.max(0, after))}</b></td></tr></tbody></table></div></div>
      <div class="pf-card"><h3>The age of the squad with him in it</h3><p class="note">Players in each three-year age band (yours, plus him).</p>${bars(hb, { max: Math.max.apply(null, hb.map((b) => b.v)) + 1, w: 480, ml: 70 })}</div>`;
  }

  // ---------- the case ----------
  function theCase(ctx) {
    const { row, rows, league } = ctx, me = FM.teamById(league, league.userId), t = FM.transfer(league), room = FM.wageRoom(league, me.id), pm = priceModel(rows, row);
    const peers = rows.filter((r) => r.pos === row.pos && !r.pool && r.mins >= 360), mates = me.squad.filter((q) => q.natural === row.pos).sort((a, b) => FM.playerRating(b, b.natural) - FM.playerRating(a, a.natural)), starters = Math.max(1, me.players.filter((q) => q.natural === row.pos).length), cut = mates[Math.min(mates.length - 1, starters - 1)];
    const items = [];
    const add = (name, score, text, detail) => items.push({ name, score: clamp(score, -1, 1), text, detail });
    if (pm.predicted && !row.pool && row.price > 0) { const z = (Math.log(row.price) - pm.predicted.yhat) / pm.predicted.se; add('Price', -z / 2, (z < -0.5 ? 'Cheaper' : z > 0.5 ? 'Dearer' : 'In line with') + ' the market for his rating, age and potential (model £' + f1(Math.exp(pm.predicted.yhat)) + 'm against £' + f1(row.price) + 'm asked).', 'regression on ' + pm.m.n + ' players, r² ' + f2(pm.m.res.r2)); } else if (row.pool) add('Price', 0.8, 'A free agent: no fee, only wages.', '');
    if (cut) { const d = row.rating - cut.rating; add('Quality', d / 0.8, d > 0 ? 'Better than ' + cut.name + ' (+' + f1(d) + ') who starts in his position.' : 'Not better than ' + cut.name + ' who starts in his position (' + f1(d) + ').', 'rating on the 0–10 scale'); }
    const p3 = projection(row)[3]; add('Future', (p3.value - row.value) / Math.max(1, row.value) * 1.6, 'Projected value in three seasons ' + money(p3.value) + ' against ' + money(row.value) + ' now; potential ' + row.potential + '.', 'age ' + row.age);
    const pc = row.line && row.line.mn >= 360 ? pctile(peers.map((r) => r.mrating), row.mrating) : NaN; if (Number.isFinite(pc)) add('Form', (pc - 50) / 40, 'Last season he rated in the ' + f0(pc) + 'th percentile for his position (' + f2(row.mrating) + ' a match).', row.line.mn + ' minutes'); else add('Form', 0, 'Too little playing time last season to judge him by his record.', '');
    add('Wages', room >= row.wage * 1.25 ? Math.min(0.6, (room - row.wage * 1.25) / Math.max(5, room)) : -0.9, room >= row.wage * 1.25 ? 'His likely wage (' + f1(row.wage * 1.25) + 'k) fits in the wage room (' + f1(room) + 'k).' : 'His likely wage (' + f1(row.wage * 1.25) + 'k) is more than the wage room (' + f1(room) + 'k).', '');
    if (!row.pool) { const left = (t.budget[me.id] || 0) - row.price; add('Budget', left >= 0 ? clamp(left / Math.max(2, t.budget[me.id] || 1), 0, 0.6) : -1, left >= 0 ? 'Affordable: ' + money(left) + ' of the budget is left after the fee.' : 'Not affordable now: ' + money(-left) + ' short.', ''); }
    add('Availability', FM.isInjured(row.p) ? -0.7 : 0.2, FM.isInjured(row.p) ? 'He is injured.' : 'He is fit.', '');
    add('Contract', row.pool ? 0 : (row.contract >= 3 ? 0.3 : row.contract === 1 ? -0.3 : 0), row.pool ? 'Free agent: you set the contract.' : row.contract + ' year' + (row.contract === 1 ? '' : 's') + ' left: ' + (row.contract === 1 ? 'a short deal, with a renewal to pay for soon.' : 'a settled deal.'), '');
    const total = items.reduce((a, i) => a + i.score, 0) / items.length;
    const label = total > 0.35 ? 'The evidence is mostly in favour.' : total > 0.1 ? 'More for than against, but not by much.' : total > -0.1 ? 'The evidence is mixed.' : total > -0.35 ? 'More against than for.' : 'The evidence is mostly against.';
    return `<div class="pf-card"><h3>The case for and against</h3><p class="pf-verdict"><b>${esc(label)}</b> This summarises the numbers on the other tabs. It does not know what your squad needs on the pitch, so it is a prompt for the decision, not the decision.</p>
      <div class="pf-case">${items.map((i) => `<div class="pf-row ${i.score > 0.15 ? 'good' : i.score < -0.15 ? 'bad' : ''}"><div class="pf-rn">${esc(i.name)}</div><div class="pf-meter"><i style="left:${50 + i.score * 50}%"></i></div><div class="pf-rt">${esc(i.text)}${i.detail ? ' <small>(' + esc(i.detail) + ')</small>' : ''}</div></div>`).join('')}</div>
      <p class="note">Each bar runs from against (left) to for (right). Open the Regression lab to test a claim: for example, whether his goals last season were more than his chances were worth.</p></div>`;
  }

  // ---------- the page ----------
  const TABS = [['overview', 'Overview', overview], ['season', 'Last season', lastSeason], ['value', 'Price and value', priceAndValue], ['lab', 'Regression lab', lab], ['fit', 'Squad fit', squadFit], ['case', 'The case', theCase]];
  FM.openPlayerProfile = function (league, p, opts) {
    opts = opts || {}; const inline = opts.inline || null; if (!inline) { const old = document.getElementById('pfOverlay'); if (old) old.remove(); }
    const state = { tab: opts.tab || 'overview', local: { sameDiv: false, y: 'goals', x: ['a_finishing', 'xg'], scope: 'pos', minMins: 360, xOpen: false } };
    const row0 = () => marketRows(league).find((r) => r.id === p.id);
    const defaults = () => { const r = row0(); if (!r) return; if (r.pos === 'GK') { state.local.y = 'savePct'; state.local.x = ['a_gk', 'age']; state.local.scope = 'pos'; } else if (['CB', 'FB', 'DM'].indexOf(r.pos) >= 0) { state.local.y = 'tackles'; state.local.x = ['a_tackling', 'a_stamina']; } else if (['CM', 'AM'].indexOf(r.pos) >= 0) { state.local.y = 'keyPasses'; state.local.x = ['a_passing', 'a_composure']; } };
    defaults();
    const host = inline || document.createElement('div'); if (inline) host.classList.add('pf-inline'); else { host.id = 'pfOverlay'; host.className = 'pf-overlay'; document.body.appendChild(host); document.body.classList.add('pf-open'); }
    const close = () => { if (!inline) { host.remove(); document.body.classList.remove('pf-open'); } document.removeEventListener('keydown', onKey); if (opts.onClose) opts.onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') close(); }; document.addEventListener('keydown', onKey);
    const draw = () => {
      const rows = marketRows(league), row = rows.find((r) => r.id === p.id); if (!row) { host.innerHTML = '<div class="pf-shell"><p>He is no longer in the game.</p><button type="button" id="pfClose">Close</button></div>'; host.querySelector('#pfClose').addEventListener('click', close); return; }
      const ctx = { row, rows, league, local: state.local }, tab = TABS.find((t) => t[0] === state.tab) || TABS[0];
      let body; try { body = tab[2](ctx); } catch (e) { console.error('Player profile:', e); body = '<div class="pf-card"><h3>This tab could not be drawn</h3><p class="note">' + esc(e && e.message) + '</p></div>'; }
      const club = row.pool ? 'Free agent' : row.club;
      host.innerHTML = `<div class="pf-shell"><header class="pf-head"><div><div class="eyebrow">${esc(POSNAME[row.pos] || row.pos)} · ${esc(club)}</div><h2>${esc(row.p.name)}</h2><div class="pf-sub">Age ${row.age} · ability ${row.ability} · potential ${row.potential} · ${row.pool ? 'free agent' : money(row.price)} · ${f1(row.wage)}k a week</div></div><button type="button" id="pfClose" class="pf-x-btn" aria-label="${inline ? 'Back to the list' : 'Close the profile'}">${inline ? '← Back to the list' : 'Close ✕'}</button></header>
        <nav class="pf-tabs" role="tablist">${TABS.map(([k, n]) => `<button type="button" role="tab" data-pftab="${k}" class="${state.tab === k ? 'on' : ''}">${n}</button>`).join('')}</nav><div class="pf-body">${body}</div></div>`;
      host.querySelector('#pfClose').addEventListener('click', close);
      host.querySelectorAll('[data-pftab]').forEach((b) => b.addEventListener('click', () => { state.tab = b.dataset.pftab; draw(); if (!inline) host.scrollTop = 0; }));
      const sd = host.querySelector('#pfSameDiv'); if (sd) sd.addEventListener('change', () => { state.local.sameDiv = sd.checked; draw(); });
      const L = state.local, y = host.querySelector('#pfY'); if (y) y.addEventListener('change', () => { L.y = y.value; draw(); });
      const sc = host.querySelector('#pfScope'); if (sc) sc.addEventListener('change', () => { L.scope = sc.value; draw(); });
      const mi = host.querySelector('#pfMins'); if (mi) mi.addEventListener('change', () => { L.minMins = Math.max(0, +mi.value || 0); draw(); });
      const dt = host.querySelector('.pf-x'); if (dt) dt.addEventListener('toggle', () => { L.xOpen = dt.open; });
      host.querySelectorAll('[data-x]').forEach((c) => c.addEventListener('change', () => { const id = c.dataset.x; L.x = c.checked ? L.x.concat([id]).filter((v, i, a) => a.indexOf(v) === i) : L.x.filter((v) => v !== id); L.xOpen = true; draw(); }));
      host.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => { const pr = PRESETS[+b.dataset.preset]; L.y = pr.y; L.x = pr.x.slice(); L.scope = pr.scope; L.minMins = pr.y === 'goals' || pr.y === 'mrating' || pr.y === 'passPct' ? 360 : 0; draw(); }));
    };
    draw(); return { close, redraw: draw };
  };
  FM.charts = { scatter, lines, bars, radar, niceTicks, tickLabel, frame, esc };
  FM.profileData = { marketRows, METLIST, fit, predict, projection };
})();
