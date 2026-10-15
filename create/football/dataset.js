// The season's data, from every match the manager has played: one large dataset for the Analysis page and for the LastMind AI Agent to draw
// from. Everything here is read from what the simulation recorded (the compact match logs), so it grows with every game. The agent asks for
// pictures by name ("heatmap", "passnetwork", "buildup", "trend", "table") and this file draws them.
(function () {
  const FM = (window.FM = window.FM || {});
  const { L, W } = FM.PITCH;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pc = (a, b) => (b ? Math.round(100 * a / b) : 0);
  const r1 = (v) => Math.round(v * 10) / 10;

  // ---------- reading the matches ----------
  function matchesOf(league) {
    return league.fixtures.filter((f) => f.played && f.log && (f.homeId === league.userId || f.awayId === league.userId)).sort((a, b) => a.round - b.round);
  }
  // A position from the log (kept as if the home side attacked to the right) as depth and width from the manager's team's point of view.
  const view = (fx, league) => {
    const mine = fx.homeId === league.userId;
    return (x, y) => (mine ? { d: x / L, w: y / W } : { d: 1 - x / L, w: 1 - y / W });
  };

  // Moves of the manager's team: passes in a row, started deep, with nobody else touching it in between.
  function buildUps(fx, league) {
    const side = fx.homeId === league.userId ? 0 : 1, to = view(fx, league), all = fx.log.passes.slice().sort((a, b) => a[0] - b[0]);
    const out = []; let cur = null;
    const close = () => { if (cur && cur.pts.length >= 4) out.push(cur); cur = null; };
    all.forEach((p) => {
      if (p[1] !== side) { close(); return; }
      const from = to(p[5], p[6]);
      const target = p[11] >= 0 ? to(p[11], p[12]) : null;
      if (!cur) { if (from.d > 0.4) return; cur = { t: p[0], pts: [from], ok: true, n: 0, round: fx.round }; }
      else if (p[0] - cur.last > 9) { close(); if (from.d > 0.4) return; cur = { t: p[0], pts: [from], ok: true, n: 0, round: fx.round }; }
      cur.last = p[0]; cur.n++;
      if (target) cur.pts.push(target);
      if (p[4] !== 1) { cur.ok = false; close(); }
    });
    close();
    out.forEach((c) => { const end = c.pts[c.pts.length - 1]; c.endDepth = end.d; c.reachedFinal = end.d > 0.66; c.passes = c.n; });
    return out.filter((c) => c.passes >= 3);
  }

  FM.dataset = function (league) {
    const fxs = matchesOf(league), me = FM.teamById(league, league.userId);
    const ms = fxs.map((fx) => {
      const mine = fx.homeId === league.userId, opp = FM.teamById(league, mine ? fx.awayId : fx.homeId);
      const s = fx.stats[league.userId], o = fx.stats[opp.id], tot = (s.possession + o.possession) || 1;
      const to = view(fx, league), side = mine ? 0 : 1;
      const mp = fx.log.passes.filter((p) => p[1] === side);
      const third = [0, 0, 0], thirdOk = [0, 0, 0]; let len = 0, long = 0, lenN = 0, press = 0;
      mp.forEach((p) => {
        const d = to(p[5], p[6]).d, k = d < 1 / 3 ? 0 : d < 2 / 3 ? 1 : 2;
        third[k]++; if (p[4] === 1) thirdOk[k]++;
        len += p[7]; lenN++; if (p[7] > 30) long++; press += p[9];
      });
      const bu = buildUps(fx, league);
      // from the extra things recorded in the match: possessions, balls won back, the team's shape, how far they ran
      const xr = fx.log.xr, ex = { seqs: 0, seqPasses: 0, seqFinal: 0, lostOwn: 0, lostMid: 0, lostFinal: 0, rec: 0, recHigh: 0, regain: 0, regainN: 0, quick: 0, line: 0, width: 0, comp: 0, shapeN: 0, lineIn: 0, lineOut: 0, nIn: 0, nOut: 0, km: 0, sprints: 0 };
      if (xr) {
        xr.seq.filter((q) => q[0] === side).forEach((q) => {
          ex.seqs++; ex.seqPasses += q[4]; if (q[5] > 0.66) ex.seqFinal++;
          if (q[6] === 0 && q[8] >= 0) { if (q[8] < 1 / 3) ex.lostOwn++; else if (q[8] < 2 / 3) ex.lostMid++; else ex.lostFinal++; }
        });
        xr.recov.filter((q) => q[0] === side).forEach((q) => { ex.rec++; if (q[2] > 0.6) ex.recHigh++; if (q[4] >= 0) { ex.regain += q[4]; ex.regainN++; if (q[4] <= 6) ex.quick++; } });
        xr.shape.filter((q) => q[1] === side).forEach((q) => {
          ex.shapeN++; ex.line += q[2]; ex.width += q[4]; ex.comp += q[5];
          if (q[7]) { ex.lineIn += q[2]; ex.nIn++; } else { ex.lineOut += q[2]; ex.nOut++; }
        });
        const mine = new Set((FM.teamById(league, league.userId).squad || []).map((p) => String(p.id)));
        Object.keys(xr.load).forEach((id) => { if (mine.has(String(id))) { ex.km += xr.load[id][0] / 1000; ex.sprints += xr.load[id][1]; } });
      }
      // the opposition's shape and running, from the same record
      const oppSide = 1 - side, oex = { n: 0, line: 0, width: 0, comp: 0, km: 0, sprints: 0 };
      if (xr) {
        xr.shape.filter((q) => q[1] === oppSide).forEach((q) => { oex.n++; oex.line += q[2]; oex.width += q[4]; oex.comp += q[5]; });
        const theirs = new Set((FM.teamById(league, opp.id).squad || []).map((p) => String(p.id)));
        Object.keys(xr.load).forEach((id) => { if (theirs.has(String(id))) { oex.km += xr.load[id][0] / 1000; oex.sprints += xr.load[id][1]; } });
      }
      // how the shots came about
      const myShots = fx.log.other.filter((e) => e.type === 'shot' && e.team === league.userId), sh = { n: myShots.length, assisted: 0, def: 0, dist: 0, heads: 0, crowd: 0, movePasses: 0, goals: 0, big: 0, quickMoves: 0 };
      myShots.forEach((e) => {
        if (e.from) sh.assisted++;
        sh.def += e.defDist || 0; sh.crowd += e.crowd || 0; sh.movePasses += e.movePasses || 0;
        if (e.setPiece === 'header') sh.heads++;
        if (e.outcome === 'goal') sh.goals++;
        if ((e.xg || 0) >= 0.2) sh.big++;
        if ((e.movePasses || 0) <= 2) sh.quickMoves++;
        const gx = mine ? L : 0; sh.dist += Math.hypot((e.x || 0) - gx, (e.y || 0) - W / 2);
      });
      return {
        shotAssistedPct: myShots.some((e) => e.movePasses !== undefined) ? pc(sh.assisted, sh.n) : 0, shotDefDist: sh.n ? r1(sh.def / sh.n) : -1, shotDist: sh.n ? r1(sh.dist / sh.n) : -1, shotHeaderPct: pc(sh.heads, sh.n),
        shotMovePasses: sh.n && myShots.some((e) => e.movePasses !== undefined) ? r1(sh.movePasses / sh.n) : -1, shotBig: sh.big, shotQuickPct: pc(sh.quickMoves, sh.n),
        oppLine: oex.n ? r1(100 * oex.line / oex.n) : -1, oppWidth: oex.n ? r1(oex.width / oex.n) : -1, oppComp: oex.n ? r1(oex.comp / oex.n) : -1, oppKm: r1(oex.km), oppSprints: oex.sprints,
        clipCount: (fx.clips || []).length, clipList: (fx.clips || []).map((c) => c.kind + ' ' + c.minute + "'").join(', '),
        seqs: ex.seqs, seqAvgPasses: ex.seqs ? r1(ex.seqPasses / ex.seqs) : 0, seqFinalPct: pc(ex.seqFinal, ex.seqs), lostOwn: ex.lostOwn, lostMid: ex.lostMid, lostFinal: ex.lostFinal,
        recoveries: ex.rec, highRecoveries: ex.recHigh, regainSeconds: ex.regainN ? r1(ex.regain / ex.regainN) : -1, quickRegains: ex.quick,
        lineHeight: ex.shapeN ? r1(100 * ex.line / ex.shapeN) : -1, lineInPoss: ex.nIn ? r1(100 * ex.lineIn / ex.nIn) : -1, lineOutPoss: ex.nOut ? r1(100 * ex.lineOut / ex.nOut) : -1,
        width: ex.shapeN ? r1(ex.width / ex.shapeN) : -1, compactness: ex.shapeN ? r1(ex.comp / ex.shapeN) : -1, distanceKm: r1(ex.km), sprints: ex.sprints, hasXr: !!xr,
        id: fx.id, round: fx.round + 1, opp: opp.name, oppId: opp.id, home: mine, gf: mine ? fx.hg : fx.ag, ga: mine ? fx.ag : fx.hg,
        shots: s.shots, shotsA: o.shots, onTarget: s.onTarget, xg: s.xg, xgA: o.xg, poss: pc(s.possession, tot),
        passes: s.passes, passPct: pc(s.passesOk, s.passes), passPctOwn: pc(thirdOk[0], third[0]), passPctMid: pc(thirdOk[1], third[1]), passPctFinal: pc(thirdOk[2], third[2]),
        avgPass: lenN ? r1(len / lenN) : 0, longPct: pc(long, lenN), avgPress: lenN ? r1(press / lenN) : 0,
        tackles: s.tackles, tacklesWon: s.tacklesWon, dribbles: s.dribbles, dribblesWon: s.dribblesWon, fouls: s.fouls, corners: s.corners,
        buildUps: bu.length, buildUpsToFinal: bu.filter((c) => c.reachedFinal).length,
      };
    });
    return { club: me.name, matches: ms, fixtures: fxs, count: ms.length };
  };

  // A short plain-text digest of the whole dataset, for the agent to read.
  FM.datasetDigest = function (league) {
    const d = FM.dataset(league);
    if (!d.count) return 'No league match has been recorded yet.';
    const sum = (k) => d.matches.reduce((a, m) => a + (m[k] || 0), 0), avg = (k) => r1(sum(k) / d.count);
    const lines = [`Season so far (${d.count} match${d.count === 1 ? '' : 'es'}): goals for ${sum('gf')}, against ${sum('ga')}. Average per match: shots ${avg('shots')} (against ${avg('shotsA')}), expected goals ${r1(sum('xg') / d.count)} (against ${r1(sum('xgA') / d.count)}), possession ${Math.round(sum('poss') / d.count)}%, pass completion ${Math.round(sum('passPct') / d.count)}%, average pass length ${avg('avgPass')} m, long passes ${Math.round(sum('longPct') / d.count)}%, build-up moves ${avg('buildUps')} (reaching the final third ${avg('buildUpsToFinal')}).`];
    const withX = d.matches.filter((m) => m.hasXr);
    if (withX.length) {
      const av = (k) => { const v = withX.map((m) => m[k]).filter((x) => x >= 0); return v.length ? r1(v.reduce((a, b) => a + b, 0) / v.length) : 'n/a'; };
      lines.push(`Possession and shape (${withX.length} matches): possessions per match ${av('seqs')}, average passes per possession ${av('seqAvgPasses')}, share of possessions reaching the final third ${av('seqFinalPct')}%; ball lost in own third ${av('lostOwn')}, middle ${av('lostMid')}, final third ${av('lostFinal')} per match; balls won back ${av('recoveries')} per match, ${av('highRecoveries')} in the opposition half, taking on average ${av('regainSeconds')} seconds after losing it; back line height ${av('lineHeight')}% of the pitch (with the ball ${av('lineInPoss')}%, without it ${av('lineOutPoss')}%), team width ${av('width')} m, compactness ${av('compactness')} m; distance covered ${av('distanceKm')} km, sprints ${av('sprints')}.`);
    }
    const shotsM = d.matches.filter((m) => m.shotDist >= 0);
    if (shotsM.length) {
      const av2 = (k) => r1(shotsM.map((m) => m[k]).reduce((a, b) => a + b, 0) / shotsM.length);
      lines.push(`How your shots came about (${shotsM.length} matches): ${av2('shotAssistedPct')}% came straight from a teammate's pass, average distance from goal ${av2('shotDist')} m, nearest defender ${av2('shotDefDist')} m away, ${av2('shotHeaderPct')}% headers, ${av2('shotMovePasses')} passes in the move before a shot, ${av2('shotQuickPct')}% after two passes or fewer.`);
    }
    const oppM = d.matches.filter((m) => m.oppLine >= 0);
    if (oppM.length) {
      const av3 = (k) => r1(oppM.map((m) => m[k]).reduce((a, b) => a + b, 0) / oppM.length);
      lines.push(`The opposition on average: back line height ${av3('oppLine')}% of the pitch, width ${av3('oppWidth')} m, compactness ${av3('oppComp')} m, distance covered ${av3('oppKm')} km, sprints ${av3('oppSprints')}.`);
    }
    d.matches.slice(-12).forEach((m) => {
      lines.push(`id ${m.id}: round ${m.round} ${m.home ? 'home' : 'away'} v ${m.opp} ${m.gf}-${m.ga}; shots ${m.shots}-${m.shotsA}; xG ${m.xg.toFixed(2)}-${m.xgA.toFixed(2)}; possession ${m.poss}%; passes ${m.passes} (${m.passPct}%: own third ${m.passPctOwn}%, middle ${m.passPctMid}%, final third ${m.passPctFinal}%); long ${m.longPct}%; build-up moves ${m.buildUps} (${m.buildUpsToFinal} to final third)${m.hasXr ? `; possessions ${m.seqs}, ${m.seqFinalPct}% reached the final third; lost in own third ${m.lostOwn}; won back ${m.recoveries} (${m.highRecoveries} high, ${m.regainSeconds >= 0 ? m.regainSeconds + ' s to regain' : 'n/a'}); back line ${m.lineHeight}%, width ${m.width} m, compactness ${m.compactness} m; ${m.distanceKm} km, ${m.sprints} sprints` : ''}; tackles won ${m.tacklesWon}/${m.tackles}; dribbles won ${m.dribblesWon}/${m.dribbles}.${m.clipCount ? ' Replays kept: ' + m.clipList + '.' : ''}`);
    });
    return lines.join('\n');
  };

  // ---------- pictures ----------
  const A = () => FM.ANALYSIS_DRAW;
  const svgWrap = (inner, label) => `<svg class="amap" viewBox="0 0 ${A().PW} ${A().PH}" role="img" aria-label="${esc(label)}">${A().pitchLines()}${inner}</svg>`;
  const pick = (d, spec) => {
    if (!spec || !spec.match || spec.match === 'all') return d.fixtures;
    const f = d.fixtures.find((x) => String(x.id) === String(spec.match));
    return f ? [f] : d.fixtures;
  };
  const caption = (fxs, d, what) => (fxs.length === 1 ? `${what}: round ${fxs[0].round + 1}.` : `${what}: all ${fxs.length} matches so far.`);

  function heatmap(league, d, spec) {
    const fxs = pick(d, spec), want = spec && spec.team === 'opp' ? 'opp' : 'user', GX = FM.HEAT.GX, GY = FM.HEAT.GY, cells = new Array(GX * GY).fill(0);
    fxs.forEach((fx) => {
      const id = want === 'user' ? league.userId : (fx.homeId === league.userId ? fx.awayId : fx.homeId);
      const g = fx.log.heat.teams[id]; if (g) g.forEach((n, i) => { cells[i] += n; });
    });
    const name = want === 'user' ? d.club : 'The opposition';
    return `<figure class="ds-fig">${svgWrap(A().heatSvg(cells, want === 'user' ? '#FFB020' : '#FF5A36'), name + ' heat map')}<figcaption>${esc(name)}: where the team spent its time, attacking to the right. ${esc(caption(fxs, d, 'Over'))}</figcaption></figure>`;
  }

  function passnetwork(league, d, spec) {
    const fxs = pick(d, spec), origins = {}, edges = {}, made = {};
    fxs.forEach((fx) => {
      const side = fx.homeId === league.userId ? 0 : 1, to = view(fx, league);
      fx.log.passes.filter((p) => p[1] === side).forEach((p) => {
        const q = to(p[5], p[6]), o = origins[p[2]] || (origins[p[2]] = { d: 0, w: 0, n: 0 });
        o.d += q.d; o.w += q.w; o.n++; made[p[2]] = (made[p[2]] || 0) + 1;
        if (p[4] === 1) { const k = p[2] + '>' + p[3]; edges[k] = (edges[k] || 0) + 1; }
      });
    });
    const nodes = Object.keys(origins).map((n) => ({ n: +n, d: origins[n].d / origins[n].n, w: origins[n].w / origins[n].n, made: made[n] }));
    if (!nodes.length) return '<p class="note">No passes recorded yet.</p>';
    const pos = {}; nodes.forEach((o) => { pos[o.n] = o; o.x = o.d * A().PW; o.y = o.w * A().PH; });
    const top = Math.max.apply(null, Object.values(edges).concat([1]));
    const lines = Object.keys(edges).filter((k) => edges[k] >= Math.max(2, top * 0.25)).map((k) => { const [a, b] = k.split('>').map(Number); if (!pos[a] || !pos[b]) return ''; return `<line x1="${pos[a].x.toFixed(1)}" y1="${pos[a].y.toFixed(1)}" x2="${pos[b].x.toFixed(1)}" y2="${pos[b].y.toFixed(1)}" stroke="#fff" stroke-opacity=".7" stroke-width="${(1 + 6 * edges[k] / top).toFixed(1)}"/>`; }).join('');
    const biggest = Math.max.apply(null, nodes.map((o) => o.made));
    const dots = nodes.map((o) => `<circle cx="${o.x.toFixed(1)}" cy="${o.y.toFixed(1)}" r="${(10 + 12 * o.made / biggest).toFixed(1)}" fill="#1F8A4C" stroke="#fff" stroke-width="3"/><text x="${o.x.toFixed(1)}" y="${(o.y + 5).toFixed(1)}" text-anchor="middle" font-size="15" font-weight="700" fill="#fff">${o.n}</text>`).join('');
    return `<figure class="ds-fig">${svgWrap(lines + dots, 'Pass network')}<figcaption>${esc(caption(fxs, d, 'Pass network'))} Each circle is a shirt number, placed where he passed from on average; a thicker line is more completed passes between two players.</figcaption></figure>`;
  }

  function buildup(league, d, spec) {
    const fxs = pick(d, spec), n = Math.max(1, Math.min(8, +(spec && spec.n) || 4));
    let all = []; fxs.forEach((fx) => { buildUps(fx, league).forEach((c) => all.push(c)); });
    if (!all.length) return '<p class="note">No build-up moves of three or more passes have been recorded yet.</p>';
    // a mix: those that reached the final third first, then those that were lost, the longest of each
    const good = all.filter((c) => c.reachedFinal).sort((a, b) => b.passes - a.passes), bad = all.filter((c) => !c.ok).sort((a, b) => b.passes - a.passes), rest = all.filter((c) => c.ok && !c.reachedFinal).sort((a, b) => b.passes - a.passes);
    const chosen = []; [good, bad, rest].forEach((g) => g.slice(0, Math.ceil(n / 2)).forEach((c) => { if (chosen.length < n) chosen.push(c); }));
    const colors = ['#FFE27A', '#7FD49A', '#7FB5FF', '#FFB4D8', '#D8B4FF', '#FFC48A', '#9AE6E6', '#E6E67F'];
    const body = chosen.map((c, i) => {
      const col = c.ok ? colors[i % colors.length] : '#FF5A36', pts = c.pts.map((p) => [p.d * A().PW, p.w * A().PH]);
      const segs = pts.slice(1).map((p, k) => `<line x1="${pts[k][0].toFixed(1)}" y1="${pts[k][1].toFixed(1)}" x2="${p[0].toFixed(1)}" y2="${p[1].toFixed(1)}" stroke="${col}" stroke-width="4" stroke-opacity=".9"${c.ok ? '' : ' stroke-dasharray="8 6"'}/>`).join('');
      const dots = pts.map((p, k) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${k === 0 ? 8 : 5}" fill="${col}" stroke="#000" stroke-width="1.5"/>`).join('');
      return segs + dots;
    }).join('');
    const list = chosen.map((c, i) => `<li><i style="background:${c.ok ? colors[i % colors.length] : '#FF5A36'}"></i>Round ${c.round + 1}: ${c.passes} passes, ${c.reachedFinal ? 'reached the final third' : c.ok ? 'kept the ball but stayed in the middle of the pitch' : 'lost the ball'}</li>`).join('');
    return `<figure class="ds-fig">${svgWrap(body, 'Build-up play')}<figcaption>Moves that began in your own third and had three or more passes. Dashed red is a move that ended with a lost ball.</figcaption><ul class="ds-key">${list}</ul></figure>`;
  }

  const STATS = {
    goals: ['Goals', (m) => m.gf], conceded: ['Goals conceded', (m) => m.ga], shots: ['Shots', (m) => m.shots], shotsAgainst: ['Shots against', (m) => m.shotsA],
    xg: ['Expected goals', (m) => m.xg], xgAgainst: ['Expected goals against', (m) => m.xgA], possession: ['Possession %', (m) => m.poss], passPct: ['Pass completion %', (m) => m.passPct],
    longPct: ['Long passes %', (m) => m.longPct], buildUps: ['Build-up moves', (m) => m.buildUps], buildUpsToFinal: ['Build-ups reaching the final third', (m) => m.buildUpsToFinal],
    tacklesWon: ['Challenges won', (m) => m.tacklesWon], avgPass: ['Average pass length (m)', (m) => m.avgPass],
    lineHeight: ['Back line height (% of pitch)', (m) => Math.max(0, m.lineHeight)], width: ['Team width (m)', (m) => Math.max(0, m.width)], compactness: ['Team compactness (m, lower is tighter)', (m) => Math.max(0, m.compactness)],
    regainSeconds: ['Seconds to win the ball back', (m) => Math.max(0, m.regainSeconds)], recoveries: ['Balls won back', (m) => m.recoveries], highRecoveries: ['Balls won back high up', (m) => m.highRecoveries],
    possessions: ['Possessions', (m) => m.seqs], possessionPasses: ['Passes per possession', (m) => m.seqAvgPasses], lostOwnThird: ['Balls lost in own third', (m) => m.lostOwn],
    distanceKm: ['Distance covered (km)', (m) => m.distanceKm], sprints: ['Sprints', (m) => m.sprints],
    shotDistance: ['Average shot distance (m)', (m) => Math.max(0, m.shotDist)], shotDefender: ['Nearest defender when shooting (m)', (m) => Math.max(0, m.shotDefDist)],
    shotAssisted: ['Shots straight from a pass %', (m) => m.shotAssistedPct], bigChances: ['Big chances (0.2+ xG)', (m) => m.shotBig],
    oppLineHeight: ['Opposition back line height (%)', (m) => Math.max(0, m.oppLine)], oppDistanceKm: ['Opposition distance covered (km)', (m) => m.oppKm],
  };
  FM.DATA_STATS = Object.keys(STATS);
  function trend(league, d, spec) {
    const key = STATS[spec && spec.stat] ? spec.stat : 'shots', [label, get] = STATS[key];
    if (!d.matches.length) return '<p class="note">No matches recorded yet.</p>';
    const vals = d.matches.map(get), max = Math.max.apply(null, vals.concat([1])), w = 420, h = 170, pad = 28, bw = Math.min(40, (w - pad * 2) / vals.length - 6);
    const bars = vals.map((v, i) => { const x = pad + i * ((w - pad * 2) / vals.length) + 3, bh = (h - 56) * v / max, m = d.matches[i];
      return `<rect x="${x.toFixed(1)}" y="${(h - 30 - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="${m.gf > m.ga ? '#1F8A4C' : m.gf < m.ga ? '#B8402E' : '#8A8F94'}"/><text x="${(x + bw / 2).toFixed(1)}" y="${(h - 33 - bh).toFixed(1)}" text-anchor="middle" font-size="11" fill="currentColor">${Number.isInteger(v) ? v : v.toFixed(1)}</text><text x="${(x + bw / 2).toFixed(1)}" y="${h - 14}" text-anchor="middle" font-size="10" fill="currentColor" opacity=".75">R${m.round}</text>`; }).join('');
    return `<figure class="ds-fig"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)} by match" style="width:100%;height:auto"><text x="${pad}" y="16" font-size="12" font-weight="700" fill="currentColor">${esc(label)} by match</text>${bars}</svg><figcaption>Green is a win, red a defeat, grey a draw.</figcaption></figure>`;
  }

  // Where the ball was won back (or lost), in the manager's team's own view of the pitch, attacking to the right.
  function spots(league, d, spec, kind) {
    const fxs = pick(d, spec), pts = [];
    fxs.forEach((fx) => {
      const xr = fx.log.xr; if (!xr) return;
      const side = fx.homeId === league.userId ? 0 : 1;
      if (kind === 'recoveries') xr.recov.filter((q) => q[0] === side).forEach((q) => pts.push({ d: q[2], w: q[3], quick: q[4] >= 0 && q[4] <= 6 }));
      else xr.seq.filter((q) => q[0] === side && q[6] === 0 && q[8] >= 0).forEach((q) => pts.push({ d: q[8], w: q[9], quick: false }));
    });
    if (!pts.length) return '<p class="note">That has not been recorded yet. It fills in from your next match.</p>';
    const col = kind === 'recoveries' ? '#7FD49A' : '#FF5A36';
    const dots = pts.map((p) => `<circle cx="${(p.d * A().PW).toFixed(1)}" cy="${(p.w * A().PH).toFixed(1)}" r="${p.quick ? 8 : 6}" fill="${col}" fill-opacity=".7" stroke="${p.quick ? '#fff' : 'none'}" stroke-width="2"/>`).join('');
    const what = kind === 'recoveries' ? 'Where you won the ball back' : 'Where you lost the ball';
    return `<figure class="ds-fig">${svgWrap(dots, what)}<figcaption>${esc(what)}, ${pts.length} times, attacking to the right.${kind === 'recoveries' ? ' A white ring is a ball won back within six seconds of losing it.' : ''} ${esc(caption(fxs, d, 'Over'))}</figcaption></figure>`;
  }

  // Every shot, sized by its chance, attacking to the right: a goal is a star.
  function shotmap(league, d, spec) {
    const fxs = pick(d, spec), want = spec && spec.team === 'opp' ? 'opp' : 'user', dots = [];
    fxs.forEach((fx) => {
      const mine = fx.homeId === league.userId;
      fx.log.other.filter((e) => e.type === 'shot' && ((want === 'user') === (e.team === league.userId))).forEach((e) => {
        // positions are kept as if the home side attacked to the right; the picture has the team shown attacking to the right
        const homeShooter = e.team === fx.homeId, x = homeShooter ? e.x : L - e.x, y = homeShooter ? e.y : W - e.y;
        dots.push({ d: x / L, w: y / W, xg: e.xg || 0, goal: e.outcome === 'goal', out: e.outcome });
      });
      void mine;
    });
    if (!dots.length) return '<p class="note">No shots recorded yet.</p>';
    const body = dots.map((p) => {
      const r = 5 + 22 * Math.sqrt(Math.min(p.xg, 0.8)), x = (p.d * A().PW).toFixed(1), y = (p.w * A().PH).toFixed(1);
      return p.goal ? `<path d="M${x} ${(y - r * 1.4).toFixed(1)} l${(r * .45).toFixed(1)} ${(r * 1.1).toFixed(1)} ${(r * 1.3).toFixed(1)} 0 -${(r * 1.05).toFixed(1)} ${(r * .8).toFixed(1)} ${(r * .45).toFixed(1)} ${(r * 1.3).toFixed(1)} -${(r * 1.2).toFixed(1)} -${(r * .8).toFixed(1)} -${(r * 1.2).toFixed(1)} ${(r * .8).toFixed(1)} ${(r * .45).toFixed(1)} -${(r * 1.3).toFixed(1)} -${(r * 1.05).toFixed(1)} -${(r * .8).toFixed(1)} ${(r * 1.3).toFixed(1)} 0z" fill="#FFE27A" stroke="#000" stroke-width="1.5"/>` : `<circle cx="${x}" cy="${y}" r="${r.toFixed(1)}" fill="${want === 'user' ? '#FFB020' : '#FF5A36'}" fill-opacity=".55" stroke="#fff" stroke-width="1.5"/>`;
    }).join('');
    const goals = dots.filter((p) => p.goal).length;
    return `<figure class="ds-fig">${svgWrap(body, 'Shot map')}<figcaption>${want === 'user' ? 'Your' : 'Their'} ${dots.length} shots, ${goals} goal${goals === 1 ? '' : 's'}. A bigger circle is a better chance; a star is a goal. ${esc(caption(fxs, d, 'Over'))}</figcaption></figure>`;
  }

  // A replay of one moment from a match, played from the positions recorded in it. spec.what is the kind of moment, spec.n which of them.
  function clip(league, d, spec) {
    const fxs = (spec && spec.match && spec.match !== 'all' ? pick(d, spec) : d.fixtures.slice().reverse());
    const what = spec && spec.what, n = Math.max(0, Math.round(+(spec && spec.n) || 0));
    const all = [];
    fxs.forEach((fx) => (fx.clips || []).forEach((c) => { if (!what || c.kind === what) all.push({ fx, c }); }));
    if (!all.length) return '<p class="note">I do not have a replay of that kept. Replays are recorded from your next match on, for every match you play.</p>';
    const pickd = all[Math.min(n, all.length - 1)];
    return `<figure class="ds-fig"><div class="ds-clip" data-clip-fx="${esc(pickd.fx.id)}" data-clip-id="${esc(pickd.c.id)}"></div><figcaption>${esc(pickd.c.label || 'Replay')}, minute ${pickd.c.minute}, round ${pickd.fx.round + 1}.</figcaption></figure>`;
  }

  function table(league, d) {
    if (!d.matches.length) return '<p class="note">No matches recorded yet.</p>';
    return `<div class="tablewrap"><table class="data ds-table"><thead><tr><th>R</th><th class="l">Opponent</th><th>Score</th><th>Shots</th><th>xG</th><th>Poss</th><th>Pass %</th><th>Build-ups</th></tr></thead><tbody>${d.matches.map((m) => `<tr><td>${m.round}</td><td class="l">${esc(m.opp)} (${m.home ? 'H' : 'A'})</td><td><b>${m.gf}-${m.ga}</b></td><td>${m.shots}-${m.shotsA}</td><td>${m.xg.toFixed(1)}-${m.xgA.toFixed(1)}</td><td>${m.poss}%</td><td>${m.passPct}%</td><td>${m.buildUpsToFinal}/${m.buildUps}</td></tr>`).join('')}</tbody></table></div>`;
  }

  // One picture by its name: what the agent asks for.
  FM.dataVisual = function (league, spec) {
    const d = FM.dataset(league);
    if (!d.count) return '<p class="note">There is no match data yet. Play a match and it will fill in.</p>';
    switch (spec && spec.kind) {
      case 'heatmap': return heatmap(league, d, spec);
      case 'passnetwork': return passnetwork(league, d, spec);
      case 'buildup': return buildup(league, d, spec);
      case 'trend': return trend(league, d, spec);
      case 'shotmap': return shotmap(league, d, spec);
      case 'clip': return clip(league, d, spec);
      case 'recoveries': return spots(league, d, spec, 'recoveries');
      case 'turnovers': return spots(league, d, spec, 'turnovers');
      case 'table': return table(league, d, spec);
      default: return '';
    }
  };

  // The top of the Analysis page: the season at a glance, drawn from the whole dataset.
  FM.renderDatasetTop = function (host, league) {
    const d = FM.dataset(league);
    if (!d.count) { host.innerHTML = '<div class="card"><h2>Season data</h2><p class="desc">The data fills in as you play: every pass, shot, tackle and position is recorded in each match and kept here for the whole season.</p></div>'; return; }
    const sum = (k) => d.matches.reduce((a, m) => a + (m[k] || 0), 0), n = d.count;
    const stat = (label, v, sub) => `<div class="ds-stat"><b>${v}</b><span>${esc(label)}</span>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
    host.innerHTML = `<div class="card ds-top"><h2>The season so far</h2>
      <p class="desc">${n} match${n === 1 ? '' : 'es'} recorded. This is everything the simulation saw, averaged across all of them. Ask the LastMind AI Agent to show you any of it another way.</p>
      <div class="ds-stats">${stat('Goals for / against', sum('gf') + ' / ' + sum('ga'))}${stat('Shots per match', r1(sum('shots') / n), 'against ' + r1(sum('shotsA') / n))}${stat('Expected goals per match', r1(sum('xg') / n), 'against ' + r1(sum('xgA') / n))}${stat('Possession', Math.round(sum('poss') / n) + '%')}${stat('Pass completion', Math.round(sum('passPct') / n) + '%')}${stat('Build-ups reaching the final third', r1(sum('buildUpsToFinal') / n), 'of ' + r1(sum('buildUps') / n) + ' per match')}</div>
      <div class="ds-grid"><div>${FM.dataVisual(league, { kind: 'heatmap', match: 'all', team: 'user' })}</div><div>${FM.dataVisual(league, { kind: 'buildup', match: 'all', n: 4 })}</div></div>
      <div class="ds-grid"><div>${FM.dataVisual(league, { kind: 'trend', stat: 'xg' })}</div><div>${FM.dataVisual(league, { kind: 'table' })}</div></div>
      <div class="row"><button type="button" class="primary" id="dsAsk">Ask the LastMind AI Agent about this</button></div></div>`;
    const b = host.querySelector('#dsAsk'); if (b) b.addEventListener('click', () => { if (FM.agentOpen) FM.agentOpen(); });
  };
})();
