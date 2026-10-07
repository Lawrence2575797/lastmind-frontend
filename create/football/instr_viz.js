// What the manager's instructions do, drawn: for one stage of play, each player who is made to stand somewhere else gets an arrow from where he
// would have stood to where he stands now; named opponents the instructions point at are shown, with a line for who follows whom and who is being
// drawn in; and a player told how to pass shows his preferred and avoided passes. All of it is worked out by the same rules the match engine uses.
(function () {
  const FM = (window.FM = window.FM || {});
  const L = 105, W = 68, PS = 4, VW = W * PS, VH = L * PS;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const STAGES = [['build', 'Build-up'], ['final', 'Final third'], ['transAtt', 'Winning the ball'], ['transDef', 'Losing the ball'], ['press', 'Pressing them'], ['without', 'Defending']];
  const SCEN = { build: { has: true, d: 0.16 }, final: { has: true, d: 0.82 }, transAtt: { has: true, d: 0.45, ph: { transAtt: 1 } }, transDef: { has: false, d: 0.55, ph: { transDef: 1 } }, press: { has: false, d: 0.9 }, without: { has: false, d: 0.42 } };
  const surname = (p) => p.name.split(' ').slice(1).join(' ') || p.name;

  function positions(team, opp, stage) {
    const sc = SCEN[stage], ball = FM.toMetres(team.attackDir, sc.d, 0.5);
    // Work with temporary team shells. The old version wrote oppRef onto
    // the real teams and left team -> opponent -> team behind, which made
    // the next lab run impossible to clone or save as JSON.
    const viewTeam = Object.assign({}, team), viewOpp = Object.assign({}, opp);
    viewTeam.oppRef = viewOpp; viewOpp.oppRef = viewTeam;
    viewTeam.phaseCtx = Object.assign({}, sc.ph || {}); viewOpp.phaseCtx = {};
    viewTeam.ruleCtx = { scoreDiff: 0, minute: 30, carrier: null }; viewOpp.ruleCtx = { scoreDiff: 0, minute: 30, carrier: null };
    const oppRules = viewOpp.rules; viewOpp.rules = [];    // their manager's own rules are not what is being drawn
    const mk = (t, has, withRules) => { const keep = t.rules; if (!withRules) t.rules = []; const m = new Map(); t.players.forEach((p) => { m.set(p, FM.targetFor(t, p, ball, has)); }); t.rules = keep; return m; };
    const base = mk(viewTeam, sc.has, false), baseO = mk(viewOpp, !sc.has, false);
    const near = (m) => { let best = null, bd = 1e9; m.forEach((q, p) => { const d = Math.hypot(q.x - ball.x, q.y - ball.y); if (d < bd) { bd = d; best = p; } }); return best; };
    const carrier = near(sc.has ? base : baseO);
    viewTeam.ruleCtx.carrier = carrier; viewOpp.ruleCtx.carrier = carrier;
    const now = mk(viewTeam, sc.has, true);
    viewOpp.rules = oppRules;
    return { sc, ball, base, now, baseO, carrier };
  }

  // The first line of every explanation: how far someone is made to move.
  const moveText = (p, a, b, dir) => {
    const dd = (b.x - a.x) * dir, dw = (b.y - a.y) * dir;     // forward, and towards the right of his own team's attack
    const bits = [];
    if (Math.abs(dd) >= 2) bits.push(Math.round(Math.abs(dd)) + ' m ' + (dd > 0 ? 'further up the pitch' : 'deeper'));
    if (Math.abs(dw) >= 2) bits.push(Math.round(Math.abs(dw)) + ' m further ' + (dw > 0 ? 'to the right' : 'to the left'));
    return bits.length ? surname(p) + ' stands ' + bits.join(' and ') + ' than he otherwise would.' : '';
  };

  FM.instrViz = {
    stages: STAGES,
    name: (k) => (STAGES.find((x) => x[0] === k) || [0, k])[1].toLowerCase(),
    // Returns { svg, lines } for one stage.
    draw(team, opp, stage) {
      const P = positions(team, opp, stage), dir = team.attackDir;
      const toS = (x, y) => { const s = FM.toTeamSpace(team.attackDir, x, y); return { x: s.w * VW, y: (1 - s.d) * VH }; };
      const live = (team.rules || []).filter((r) => !r.off);
      let s = '<defs><marker id="ivA" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#F2C14E"/></marker><marker id="ivG" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#7fd49a"/></marker><marker id="ivR" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#ff7a5c"/></marker><marker id="ivP" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#c8a2ff"/></marker></defs>';
      s += `<rect width="${VW}" height="${VH}" rx="6" fill="#2A7539"/><rect x="1" y="1" width="${VW - 2}" height="${VH - 2}" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="1.5"/><line x1="0" y1="${VH / 2}" x2="${VW}" y2="${VH / 2}" stroke="rgba(255,255,255,.75)" stroke-width="1.5"/><circle cx="${VW / 2}" cy="${VH / 2}" r="${9.15 * PS}" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="1.5"/>`;
      [[0, 1], [VH, -1]].forEach(([y0, sgn]) => { s += `<rect x="${VW / 2 - 20.16 * PS}" y="${sgn > 0 ? y0 : y0 - 16.5 * PS}" width="${40.32 * PS}" height="${16.5 * PS}" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="1.5"/>`; });
      const lines = [];
      const refOpp = new Set();   // opponents the instructions mention
      const oppByNum = (n) => opp.players.find((q) => q.number === n);
      const cur = (p) => P.now.get(p), was = (p) => P.base.get(p);
      // who the instructions are about
      const moved = [];
      team.players.forEach((p) => {
        const a = was(p), b = cur(p), d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d >= 1.5) { moved.push(p); const t = moveText(p, a, b, dir); if (t) lines.push(t); }
      });
      // opponents mentioned by marks and attractions
      live.forEach((r) => r.effects.forEach((e) => {
        if ((e.type === 'mark' || e.type === 'attract') && e.target && e.target.number != null) { const q = oppByNum(e.target.number); if (q) refOpp.add(q); }
      }));
      const pos = (p) => toS(cur(p).x, cur(p).y), posB = (p) => toS(was(p).x, was(p).y), posO = (q) => toS(P.baseO.get(q).x, P.baseO.get(q).y);
      // faint "where he would have stood"
      moved.forEach((p) => { const a = posB(p); s += `<circle cx="${a.x.toFixed(1)}" cy="${a.y.toFixed(1)}" r="7" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.5" stroke-dasharray="3 3"/>`; });
      // marking and drawing in
      live.forEach((r) => {
        const owners = team.players.filter((p) => FM.RULES.scopeMatches(r.scope, p));
        r.effects.forEach((e) => {
          if (e.type === 'mark' && e.target && e.target.number != null) {
            const q = oppByNum(e.target.number); if (!q) return;
            owners.forEach((p) => { if (SCEN[stage].has) return; const a = pos(p), b = posO(q); s += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="#FF9F43" stroke-width="2.2" stroke-dasharray="5 4" marker-end="url(#ivA)"/>`; lines.push(surname(p) + ' follows ' + surname(q) + ' (#' + q.number + ') wherever he goes.'); });
          }
          if (e.type === 'attract' && e.target && e.target.number != null) {
            const q = oppByNum(e.target.number); if (!q) return;
            owners.forEach((p) => { const a = posO(q), b = pos(p); s += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="#c8a2ff" stroke-width="2.2" stroke-dasharray="2 4" marker-end="url(#ivP)"/>`; lines.push(surname(p) + ' is there to draw ' + surname(q) + ' (#' + q.number + ') towards him.'); });
          }
        });
      });
      // movement arrows
      moved.forEach((p) => { const a = posB(p), b = pos(p); s += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="#F2C14E" stroke-width="3" marker-end="url(#ivA)"/>`; });
      // passing preferences, for a player who has any, as if he had the ball where he stands
      if (SCEN[stage].has) {
        const seen = {}, passLines = [];
        team.players.forEach((p) => {
          const ctx = FM.rulesCtx(team, P.now.get(p), true, true);   // drawn as if he is being pressed, which is when passing instructions matter most
          const eff = FM.rulesActive(team, p, ctx); if (!eff.some((e) => /^pass|freeMan/.test(e.type))) return;
          const RE = FM.rulesFold(eff), me = P.now.get(p), ev = FM.rulesEv(team, p, P.now.get(p), true), out = [];
          team.players.forEach((t) => {
            if (t === p) return; const tp = P.now.get(t), d = Math.hypot(tp.x - me.x, tp.y - me.y); if (d < 4) return;
            const back = (me.x - tp.x) * dir; let adj = 0;
            if (RE.short) adj -= RE.short * 3 * clamp((d - 18) / 22, 0, 1);
            if (RE.long) adj -= RE.long * 3 * clamp((24 - d) / 14, 0, 1);
            RE.passTo.forEach((pt) => { if (FM.rulesReceiver(pt.to, Object.assign({ x: tp.x, y: tp.y, group: t.group, number: t.number, slotKey: t.slotKey }, {}), Object.assign({ x: me.x, y: me.y }, {}), team)) adj += pt.w * 1.1; });
            adj += (RE.dir[back < -3 ? 'forward' : back > 3 ? 'backward' : 'sideways'] || 0) * 0.9;
            if (RE.passScore.length) { ev.me = p; ev.receiver = t; RE.passScore.forEach((ps) => { if (FM.rulesPred(ps.where, ev)) adj += ps.w * 1.1; }); }
            out.push({ t, adj });
          });
          out.sort((a, b) => b.adj - a.adj);
          out.filter((o) => o.adj > 0.4).slice(0, 2).forEach((o) => { const a = pos(p), b = pos(o.t); s += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="#7fd49a" stroke-width="2.4" marker-end="url(#ivG)"/>`; seen[p.number + '>' + o.t.number] = 1; passLines.push(surname(p) + ' looks for ' + surname(o.t) + ' first.'); });
          out.slice().reverse().filter((o) => o.adj < -0.8).slice(0, 2).forEach((o) => { const a = pos(p), b = pos(o.t); s += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="#ff7a5c" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#ivR)"/>`; passLines.push(surname(p) + ' is steered away from passing to ' + surname(o.t) + '.'); });
        });
        passLines.slice(0, 3).forEach((l) => lines.push(l));
        if (passLines.length > 3) lines.push('And ' + (passLines.length - 3) + ' more passes like those.');
      }
      // everyone: our players (moved ones brighter), then the opponents who are mentioned
      team.players.forEach((p) => { const a = pos(p), mv = moved.indexOf(p) >= 0; s += `<circle cx="${a.x.toFixed(1)}" cy="${a.y.toFixed(1)}" r="${mv ? 10 : 8}" fill="${team.kit ? team.kit.shirt : '#c0392b'}" stroke="${mv ? '#F2C14E' : (team.kit ? team.kit.number : '#fff')}" stroke-width="${mv ? 3 : 1.5}" opacity="${mv ? 1 : 0.8}"/><text x="${a.x.toFixed(1)}" y="${(a.y + 4).toFixed(1)}" text-anchor="middle" font-size="10.5" font-weight="800" fill="${team.kit ? team.kit.number : '#fff'}" font-family="sans-serif">${p.number}</text>`; });
      refOpp.forEach((q) => { const a = posO(q); s += `<circle cx="${a.x.toFixed(1)}" cy="${a.y.toFixed(1)}" r="9" fill="rgba(70,130,200,.55)" stroke="#9cc7ff" stroke-width="2" stroke-dasharray="3 2"/><text x="${a.x.toFixed(1)}" y="${(a.y + 3.5).toFixed(1)}" text-anchor="middle" font-size="9.5" font-weight="800" fill="#fff" font-family="sans-serif">${q.number}</text><text x="${a.x.toFixed(1)}" y="${(a.y - 13).toFixed(1)}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#cfe6ff" stroke="#000" stroke-width="2.5" style="paint-order:stroke" font-family="sans-serif">${esc(surname(q))}</text>`; });
      const b = toS(P.ball.x, P.ball.y); s += `<circle cx="${b.x.toFixed(1)}" cy="${b.y.toFixed(1)}" r="4.5" fill="#fff" stroke="#000" stroke-width="1.5"/>`;
      s += `<text x="${VW - 6}" y="${VH - 6}" text-anchor="end" font-size="10" fill="#fff" stroke="#000" stroke-width="2.5" style="paint-order:stroke" font-family="sans-serif">you attack &#8593;</text>`;
      const uniq = []; lines.forEach((l) => { if (uniq.indexOf(l) < 0) uniq.push(l); });
      return { svg: `<svg class="iv-pitch" viewBox="0 0 ${VW} ${VH}" role="img" aria-label="What your instructions do in this stage of play">${s}</svg>`, lines: uniq, movedCount: moved.length };
    },
  };
})();
