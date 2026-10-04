// The Analysis Centre. Statistics are never shown over the match; they are collected silently and studied here afterwards.
// This file holds the match-by-match views: key facts, heatmaps and the pass network.
// (The statistics tiers, GCSE, A-level and beyond, live in stats.js and are drawn below these.)
(function () {
  const FM = (window.FM = window.FM || {});
  const L = 105, W = 68;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pct = (a, b) => (b ? Math.round(100 * a / b) + '%' : '-');

  const state = { fxId: null, teamSel: 'user', playerSel: 'all', mapKind: 'heat' };

  function userFixtures(league) {
    return league.fixtures.filter((f) => f.played && f.log && (f.homeId === league.userId || f.awayId === league.userId)).sort((a, b) => a.round - b.round);
  }
  const shortName = (p) => { const parts = p.name.split(' '); return parts.length > 1 ? parts[0][0] + '. ' + parts.slice(1).join(' ') : p.name; };
  FM.shortName = FM.shortName || shortName;

  // Share of sampled time the ball spent in each third of the pitch, from one team's point of view.
  function territory(fx, teamId) {
    const heat = fx.log.heat, GX = FM.HEAT.GX;
    const dir = teamId === fx.homeId ? 1 : -1;
    let own = 0, mid = 0, att = 0;
    heat.ball.forEach((n, i) => {
      const col = i % GX, d = dir === 1 ? (col + 0.5) / GX : 1 - (col + 0.5) / GX;
      if (d < 1 / 3) own += n; else if (d < 2 / 3) mid += n; else att += n;
    });
    const tot = own + mid + att || 1;
    return { own: own / tot, mid: mid / tot, att: att / tot };
  }

  // ---------- key facts ----------
  function keyFactsHtml(league, fx) {
    const h = FM.teamById(league, fx.homeId), a = FM.teamById(league, fx.awayId);
    const hs = fx.stats[h.id], as = fx.stats[a.id];
    const poss = hs.possession + as.possession;
    const th = territory(fx, h.id), ta = territory(fx, a.id);
    const rows = [
      ['Goals', hs.goals, as.goals],
      ['Shots', hs.shots, as.shots],
      ['Shots on target', hs.onTarget, as.onTarget],
      ['Expected goals (xG)', hs.xg.toFixed(2), as.xg.toFixed(2)],
      ['Possession', pct(hs.possession, poss), pct(as.possession, poss)],
      ['Ball in the attacking third', Math.round(100 * th.att) + '%', Math.round(100 * ta.att) + '%'],
      ['Passes', hs.passes, as.passes],
      ['Pass completion', pct(hs.passesOk, hs.passes), pct(as.passesOk, as.passes)],
      ['Dribbles won', hs.dribblesWon + ' of ' + hs.dribbles, as.dribblesWon + ' of ' + as.dribbles],
      ['Challenges won', hs.tacklesWon + ' of ' + hs.tackles, as.tacklesWon + ' of ' + as.tackles],
      ['Fouls', hs.fouls, as.fouls],
      ['Yellow cards', hs.yellows, as.yellows],
      ['Red cards', hs.reds, as.reds],
      ['Offsides', hs.offsides, as.offsides],
      ['Corners', hs.corners, as.corners],
      ['Free kicks', hs.freeKicks, as.freeKicks],
      ['Throw-ins', hs.throwIns, as.throwIns],
      ['Penalties', hs.penalties, as.penalties],
    ];
    return `<div class="tablewrap"><table class="data"><thead><tr><th class="l">${esc(h.name)}</th><th class="l" style="text-align:center">Key facts</th><th>${esc(a.name)}</th></tr></thead><tbody>` +
      rows.map((r) => `<tr><td class="l"><b>${r[1]}</b></td><td class="l" style="text-align:center;color:var(--cream-soft)">${r[0]}</td><td><b>${r[2]}</b></td></tr>`).join('') + '</tbody></table></div>';
  }

  // ---------- pitch drawing (horizontal, the selected team attacking to the right) ----------
  const PS = 6, PW = L * PS, PH = W * PS;
  function pitchLines() {
    const ln = 'stroke="rgba(255,255,255,0.8)" stroke-width="2" fill="none"';
    let s = `<rect x="0" y="0" width="${PW}" height="${PH}" fill="#2E7D3E"/><rect x="0" y="0" width="${PW}" height="${PH}" ${ln}/><line x1="${PW / 2}" y1="0" x2="${PW / 2}" y2="${PH}" ${ln}/>`;
    s += `<circle cx="${PW / 2}" cy="${PH / 2}" r="${9.15 * PS}" ${ln}/>`;
    [0, 1].forEach((side) => {
      const x0 = side ? PW : 0, dir = side ? -1 : 1;
      s += `<rect x="${side ? PW - 16.5 * PS : 0}" y="${PH / 2 - 20.16 * PS}" width="${16.5 * PS}" height="${40.32 * PS}" ${ln}/>`;
      s += `<rect x="${side ? PW - 5.5 * PS : 0}" y="${PH / 2 - 9.16 * PS}" width="${5.5 * PS}" height="${18.32 * PS}" ${ln}/>`;
    });
    return s;
  }
  const toSvg = (d, w) => ({ x: d * PW, y: w * PH });

  function heatSvg(cells, color) {
    const GX = FM.HEAT.GX, GY = FM.HEAT.GY;
    const max = Math.max.apply(null, cells) || 1;
    let s = '';
    cells.forEach((n, i) => {
      if (!n) return;
      const a = Math.pow(n / max, 0.65) * 0.8;
      s += `<rect x="${((i % GX) * PW / GX).toFixed(1)}" y="${(Math.floor(i / GX) * PH / GY).toFixed(1)}" width="${(PW / GX + 0.5).toFixed(1)}" height="${(PH / GY + 0.5).toFixed(1)}" fill="${color}" fill-opacity="${a.toFixed(2)}"/>`;
    });
    return s;
  }

  function playersOf(league, fx, teamId) {
    const team = FM.teamById(league, teamId);
    const grids = fx.log.heat.players;
    return team.squad.filter((p) => grids[p.id]).map((p) => ({ p, minutes: Math.round(grids[p.id].reduce((a, b) => a + b, 0) * 2 / 60) }));
  }

  function mapHtml(league, fx, teamId) {
    const heat = fx.log.heat, team = FM.teamById(league, teamId);
    let cells, label;
    if (state.playerSel !== 'all' && heat.players[state.playerSel]) {
      cells = heat.players[state.playerSel];
      const p = team.squad.find((x) => x.id === state.playerSel);
      label = (p ? p.name : 'Player') + ': where he spent his time';
    } else { cells = heat.teams[teamId] || []; label = team.name + ': where the team spent its time, all players together'; }
    return `<svg class="amap" viewBox="0 0 ${PW} ${PH}" role="img" aria-label="${esc(label)}">${pitchLines()}${heatSvg(cells, '#FF5A36')}<text x="${PW - 12}" y="${PH - 12}" text-anchor="end" font-size="20" fill="#fff" stroke="#000" stroke-width="4" style="paint-order:stroke">attacking this way &#8594;</text></svg><p class="note">${esc(label)}. Darker means more time. Based on a position sample every two seconds.</p>`;
  }

  function networkHtml(league, fx, teamId) {
    const team = FM.teamById(league, teamId), ti = teamId === fx.homeId ? 0 : 1, dir = ti === 0 ? 1 : -1;
    const passes = fx.log.passes.filter((p) => p[1] === ti);
    const origins = {}, edges = {}, made = {};
    passes.forEach((p) => {
      const d = dir === 1 ? p[5] / L : 1 - p[5] / L, w = dir === 1 ? p[6] / W : 1 - p[6] / W;
      const o = origins[p[2]] || (origins[p[2]] = { d: 0, w: 0, n: 0 });
      o.d += d; o.w += w; o.n++;
      made[p[2]] = (made[p[2]] || 0) + 1;
      if (p[4] === 1) { const k = p[2] + '>' + p[3]; edges[k] = (edges[k] || 0) + 1; }
    });
    const nodes = Object.keys(origins).map((n) => ({ n: +n, d: origins[n].d / origins[n].n, w: origins[n].w / origins[n].n, made: made[n] }));
    const pos = {}; nodes.forEach((o) => { pos[o.n] = o; });
    const maxE = Math.max.apply(null, Object.values(edges).concat([1]));
    let lines = '';
    Object.keys(edges).forEach((k) => {
      const [a, b] = k.split('>').map(Number), c = edges[k];
      if (c < Math.max(4, 0.3 * maxE) || !pos[a] || !pos[b]) return;
      const A = toSvg(pos[a].d, pos[a].w), B = toSvg(pos[b].d, pos[b].w);
      lines += `<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" stroke="#F2C14E" stroke-opacity="${(0.25 + 0.65 * c / maxE).toFixed(2)}" stroke-width="${(1.5 + 7 * c / maxE).toFixed(1)}" stroke-linecap="round"/>`;
    });
    const maxMade = Math.max.apply(null, nodes.map((o) => o.made).concat([1]));
    const dots = nodes.map((o) => {
      const P = toSvg(o.d, o.w), r = 13 + 9 * o.made / maxMade;
      const pl = team.squad.find((x) => x.number === o.n);
      return `<circle cx="${P.x}" cy="${P.y}" r="${r.toFixed(1)}" fill="${team.kits.home[0]}" stroke="#fff" stroke-width="3"/><text x="${P.x}" y="${P.y + 6}" text-anchor="middle" font-size="17" font-weight="700" fill="${team.kits.home[1]}">${o.n}</text><text x="${P.x}" y="${P.y + r + 17}" text-anchor="middle" font-size="15" fill="#fff" stroke="#000" stroke-width="3" style="paint-order:stroke">${esc(pl ? shortName(pl) : '')}</text>`;
    }).join('');
    return `<svg class="amap" viewBox="0 0 ${PW} ${PH}" role="img" aria-label="Pass network">${pitchLines()}${lines}${dots}</svg>
      <p class="note">Each circle is a player, placed where he made his passes on average, bigger the more passes he made. A line joins two players who completed a lot of passes between them (at least four, and at least 30% of the busiest link), thicker for more. ${passes.length} passes in total.</p>`;
  }

  // ---------- the page ----------
  FM.renderAnalysis = function (host, league) {
    const fxs = userFixtures(league);
    if (!fxs.length) {
      host.innerHTML = '<div class="card"><h2>Analysis Centre</h2><p class="desc">Nothing to analyse yet. Play a match first: every pass, tackle, shot and position is recorded silently while you watch, and studied here afterwards.</p></div>';
      return;
    }
    if (!fxs.find((f) => f.id === state.fxId)) state.fxId = fxs[fxs.length - 1].id;
    const fx = fxs.find((f) => f.id === state.fxId);
    const user = FM.teamById(league, league.userId);
    const oppId = fx.homeId === league.userId ? fx.awayId : fx.homeId;
    const teamId = state.teamSel === 'user' ? league.userId : oppId;
    const opp = FM.teamById(league, oppId);
    const pl = playersOf(league, fx, teamId);
    if (state.playerSel !== 'all' && !pl.find((x) => x.p.id === state.playerSel)) state.playerSel = 'all';
    const h = FM.teamById(league, fx.homeId), a = FM.teamById(league, fx.awayId);

    host.innerHTML = `
      <div style="display:grid;gap:16px">
        <div class="card">
          <h2>Analysis Centre</h2>
          <label>Match
            <select id="anMatch">${fxs.map((f) => { const fh = FM.teamById(league, f.homeId), fa = FM.teamById(league, f.awayId); return `<option value="${f.id}"${f.id === fx.id ? ' selected' : ''}>Round ${f.round + 1}: ${esc(fh.name)} ${f.hg}-${f.ag} ${esc(fa.name)}</option>`; }).join('')}</select>
          </label>
          <p class="note">Everything here comes from one match, a single sample. Over the season you will have fourteen, and what holds across them is what you can trust.</p>
        </div>
        <div class="two">
          <div class="card"><h2>Key facts</h2>${keyFactsHtml(league, fx)}</div>
          <div class="card">
            <h2>Where the match was played</h2>
            <div class="row">
              <label>Team<select id="anTeam"><option value="user"${state.teamSel === 'user' ? ' selected' : ''}>${esc(user.name)} (you)</option><option value="opp"${state.teamSel === 'opp' ? ' selected' : ''}>${esc(opp.name)}</option></select></label>
              <label>Show<select id="anKind"><option value="heat"${state.mapKind === 'heat' ? ' selected' : ''}>Heatmap</option><option value="net"${state.mapKind === 'net' ? ' selected' : ''}>Pass network</option></select></label>
              ${state.mapKind === 'heat' ? `<label>Player<select id="anPlayer"><option value="all">All players</option>${pl.map((x) => `<option value="${x.p.id}"${state.playerSel === x.p.id ? ' selected' : ''}>${x.p.number} ${esc(x.p.name)} (${x.minutes} min)</option>`).join('')}</select></label>` : ''}
            </div>
            ${state.mapKind === 'heat' ? mapHtml(league, fx, teamId) : networkHtml(league, fx, teamId)}
          </div>
        </div>
        <div id="anStats"></div>
      </div>`;
    host.querySelector('#anMatch').addEventListener('change', (e) => { state.fxId = e.target.value; FM.renderAnalysis(host, league); });
    host.querySelector('#anTeam').addEventListener('change', (e) => { state.teamSel = e.target.value; state.playerSel = 'all'; FM.renderAnalysis(host, league); });
    host.querySelector('#anKind').addEventListener('change', (e) => { state.mapKind = e.target.value; FM.renderAnalysis(host, league); });
    const ps = host.querySelector('#anPlayer');
    if (ps) ps.addEventListener('change', (e) => { state.playerSel = e.target.value; FM.renderAnalysis(host, league); });
    if (FM.renderStatsTiers) FM.renderStatsTiers(host.querySelector('#anStats'), league, fxs, state);
  };
})();
