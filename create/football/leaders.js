// League and club leaders: who is top of each statistic this season, for the division on the table and for the manager's own club. The figures are kept player by player as each match
// finishes (FM.recordPlayerStats) and read straight from the squads, so the boards are right after every matchday.
(function () {
  const FM = (window.FM = window.FM || {});
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // The rating a player earns for one match, out of ten: a base of six, what he did (goals, assists, winning the ball, passing), what his side did around him (a clean sheet for the back line,
  // goals let in, the result) and what it cost (cards).
  FM.matchRating = function (m, g, team) {
    let r = 6.0 + 0.9 * m.g + 0.55 * m.a + 0.35 * Math.min(1.2, m.xg || 0);
    r += 0.1 * m.tw - 0.04 * (m.tk - m.tw) + 0.06 * Math.min(4, m.sv || 0);
    if (m.pa >= 8) r += 1.1 * (m.po / m.pa - 0.78) * Math.min(1, m.pa / 35);
    if (['GK', 'CB', 'FB', 'DM'].indexOf(g) >= 0) r += (team.gc === 0 ? 0.55 : -0.22 * Math.max(0, team.gc - 1));
    r += team.res > 0 ? 0.3 : team.res < 0 ? -0.3 : 0;
    r -= 0.2 * m.yc + 1.6 * m.rc;
    return clamp(r, 3.5, 10);
  };

  // Called once a league match has finished: adds each player's match to his season figures (assists, passes, tackles, clean sheets, expected goals and his rating).
  FM.recordPlayerStats = function (league, fx, match, home, away, played) {
    if (fx && (fx.cup || fx.friendly || fx.preseason)) return;
    const goalsBy = { [home.id]: 0, [away.id]: 0 };
    match.events.forEach((e) => { if (e.type === 'goal' && goalsBy[e.team] != null) goalsBy[e.team]++; });
    const find = (team, n) => team.squad.find((p) => p.number === n);
    const ml = new Map(), line = (p) => { let l = ml.get(p.id); if (!l) { l = { g: 0, a: 0, xg: 0, sh: 0, pa: 0, po: 0, tk: 0, tw: 0, sv: 0, yc: 0, rc: 0 }; ml.set(p.id, l); } return l; };
    const lastPass = {};
    match.events.forEach((e) => {
      const team = e.team === home.id ? home : e.team === away.id ? away : null; if (!team) return;
      const opp = team === home ? away : home;
      if (e.type === 'pass') { const p = find(team, e.from); if (p) { const l = line(p); l.pa++; if (e.ok) l.po++; } if (e.ok) lastPass[team.id] = { from: e.from, to: e.to, t: e.t }; }
      else if (e.type === 'tackle') { const p = find(team, e.player); if (p) { const l = line(p); l.tk++; if (e.ok) l.tw++; } }
      else if (e.type === 'shot') { const p = find(team, e.player); if (p) { const l = line(p); l.sh++; l.xg += e.xg || 0; } if (e.outcome === 'saved') { const gk = opp.players.find((q) => q.group === 'GK'); if (gk) line(gk).sv++; } }
      else if (e.type === 'goal') {
        const p = find(team, e.player); if (p) line(p).g++;
        const lp = lastPass[team.id];
        if (lp && lp.to === e.player && lp.from !== e.player && (e.t || 0) - (lp.t || 0) < 14) { const q = find(team, lp.from); if (q) line(q).a++; }
        lastPass[team.id] = null;
      } else if (e.type === 'foul' && e.card) { const p = find(team, e.player); if (p) { const l = line(p); if (e.card === 'red') l.rc++; else if (e.card === 'second yellow') { l.yc++; l.rc++; } else l.yc++; } }
    });
    [home, away].forEach((t) => {
      const opp = t === home ? away : home, gc = goalsBy[opp.id], res = goalsBy[t.id] > gc ? 1 : goalsBy[t.id] < gc ? -1 : 0;
      t.squad.forEach((p) => {
        if (!played.has(p.id)) return;
        const m = line(p), s = p.stats || (p.stats = { apps: 0, goals: 0, shots: 0, yellows: 0, reds: 0 });
        s.assists = (s.assists || 0) + m.a; s.passes = (s.passes || 0) + m.pa; s.passesOk = (s.passesOk || 0) + m.po;
        s.tackles = (s.tackles || 0) + m.tk; s.tacklesWon = (s.tacklesWon || 0) + m.tw; s.xg = (s.xg || 0) + m.xg; s.saves = (s.saves || 0) + m.sv;
        if (p.group === 'GK' && gc === 0) s.cleanSheets = (s.cleanSheets || 0) + 1;
        const r = FM.matchRating(m, p.group, { gc, res });
        s.rSum = (s.rSum || 0) + r; s.rN = (s.rN || 0) + 1; s.rBest = Math.max(s.rBest || 0, r);
      });
    });
  };

  // ---------- the boards ----------
  const rows = (club, p) => ({ p, club, s: p.stats || {} });
  const avgRating = (s) => (s.rN ? s.rSum / s.rN : 0);
  const BOARDS = [
    { id: 'goals', title: 'Top goalscorer', unit: 'goals', val: (r) => r.s.goals || 0, min: 1 },
    { id: 'assists', title: 'Most assists', unit: 'assists', val: (r) => r.s.assists || 0, min: 1 },
    { id: 'cs', title: 'Most clean sheets', unit: 'clean sheets', val: (r) => r.s.cleanSheets || 0, min: 1, gk: true },
    { id: 'perf', title: 'Top performer', unit: 'average rating', val: (r) => avgRating(r.s), min: 0.1, fmt: (v) => v.toFixed(2), need: (r) => (r.s.rN || 0) >= 3 },
    { id: 'passes', title: 'Most passes completed', unit: 'passes', val: (r) => r.s.passesOk || 0, min: 1 },
    { id: 'tackles', title: 'Most tackles won', unit: 'tackles', val: (r) => r.s.tacklesWon || 0, min: 1 },
    { id: 'saves', title: 'Most saves', unit: 'saves', val: (r) => r.s.saves || 0, min: 1, gk: true },
  ];
  const board = (def, list, n) => list.filter((r) => (!def.gk || r.p.group === 'GK') && (!def.need || def.need(r)) && def.val(r) >= def.min)
    .sort((a, b) => def.val(b) - def.val(a) || (b.s.apps || 0) - (a.s.apps || 0)).slice(0, n)
    .map((r) => ({ name: r.p.name, club: r.club, v: def.val(r), shown: def.fmt ? def.fmt(def.val(r)) : String(def.val(r)) }));

  // Clubs doing better or worse than their squad suggests: where each stands in the table against where its squad strength puts it.
  FM.clubOverperformers = function (league, level) {
    const div = FM.allDivisions(league).find((d) => d.level === level) || FM.allDivisions(league)[0]; if (!div) return { over: [], under: [] };
    const tbl = FM.divisionTableRows(div), played = Math.max(...tbl.map((r) => r.p));
    if (!played) return { over: [], under: [] };
    const byStr = div.teams.slice().sort((a, b) => (b.strength || 0) - (a.strength || 0)), rank = (t) => byStr.indexOf(t) + 1;
    const out = tbl.map((r, i) => { const t = div.teams.find((x) => x.id === r.id); return { name: r.name, id: r.id, pos: i + 1, exp: rank(t), diff: rank(t) - (i + 1), pts: r.pts }; });
    return { over: out.filter((o) => o.diff > 0).sort((a, b) => b.diff - a.diff).slice(0, 4), under: out.filter((o) => o.diff < 0).sort((a, b) => a.diff - b.diff).slice(0, 4) };
  };

  FM.leagueLeaders = function (league, level) {
    const div = FM.allDivisions(league).find((d) => d.level === level) || FM.allDivisions(league)[0]; if (!div) return [];
    const list = []; div.teams.forEach((t) => t.squad.forEach((p) => list.push(rows(t.name, p))));
    return BOARDS.map((d) => ({ id: d.id, title: d.title, unit: d.unit, top: board(d, list, 5) }));
  };
  FM.clubLeaders = function (league) {
    const me = FM.teamById(league, league.userId); if (!me) return [];
    const list = me.squad.map((p) => rows(me.name, p));
    return BOARDS.map((d) => ({ id: d.id, title: d.title, unit: d.unit, top: board(d, list, 5) }));
  };

  // One leader per board, the figure beside him; the boards are stacked one above the other.
  const lead = (name, sub, fig) => `<div class="ld-lead"><span class="nm"><b>${esc(name)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span><strong>${esc(fig)}</strong></div>`;
  const boardHtml = (b) => `<div class="ld-board"><h3>${esc(b.title)}</h3>${b.top.length ? lead(b.top[0].name, b.top[0].club, b.top[0].shown) : '<p class="note">Nobody yet.</p>'}</div>`;
  const ord = (n) => n + ['th', 'st', 'nd', 'rd'][n % 10 < 4 && (n % 100 < 11 || n % 100 > 13) ? n % 10 : 0];
  const clubBoard = (title, list, sign) => `<div class="ld-board"><h3>${title}</h3>${list.length ? lead(list[0].name, ord(list[0].pos) + ', squad says ' + ord(list[0].exp), sign + Math.abs(list[0].diff)) : '<p class="note">None yet.</p>'}</div>`;

  FM.leadersCss = '.ld-grid{display:grid;grid-template-columns:1fr;gap:10px}.ld-board{border:1px solid var(--line,#3a4540);padding:10px 14px}.ld-board h3{margin:0 0 6px;font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;opacity:.75}.ld-lead{display:flex;justify-content:space-between;align-items:baseline;gap:12px}.ld-lead .nm{display:grid;gap:2px}.ld-lead .nm b{font-size:1.05rem}.ld-lead small{opacity:.65;font-size:.82rem}.ld-lead strong{font-size:1.6rem;font-variant-numeric:tabular-nums}.ld-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px}.ld-tabs button.on{background:var(--accent,#f4c34d);color:#111}';
  // mode: 'league' (the division on show) or 'club' (the manager's own)
  FM.leadersHtml = function (league, mode, level) {
    const boards = mode === 'club' ? FM.clubLeaders(league) : FM.leagueLeaders(league, level);
    let html = `<div class="ld-grid">${boards.map(boardHtml).join('')}`;
    if (mode !== 'club') { const o = FM.clubOverperformers(league, level); html += clubBoard('Overperforming club', o.over, '+') + clubBoard('Underperforming club', o.under, '−'); }
    return html + '</div><p class="note">Updated after every matchday. League Cup ties are not counted. A player needs three appearances to be rated. Overperforming means a club stands higher in the table than its squad strength says it should.</p>';
  };
})();
