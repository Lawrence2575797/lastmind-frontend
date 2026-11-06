// What decides a match, besides who the players are: how the two plans fit together, and how in form everyone is.
//
// 1. Ratings are softened. A rating counts less than it used to (RATING_W) and counts for less and less the higher it goes (eff), so a 99 is better than an 80 but
//    nowhere near invincible. Every probability in the match reads a rating through FM.sk.
// 2. Momentum. Every player has a form (-1 to 1) and every club a momentum (-1 to 1) that follow the results and performances of recent matches. A single match
//    moves them only a little; matches in a row move them further, with less and less effect as they near their limits. They add to (or take from) ratings in the
//    next match: up to 8 rating points for a player's own form and up to 4 for the club's momentum, before the softening above.
(function () {
  const FM = (window.FM = window.FM || {});
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

  FM.RATING_W = 0.7;
  FM.eff = (r) => 60 + 22 * Math.tanh((r - 60) / 22);
  // A rating as the match uses it: softened, weighted, and moved by the player's form and the club's momentum (p.mbonus is set when the match starts).
  FM.sk = (p, key) => {
    const r = p && p.ratings && Number.isFinite(p.ratings[key]) ? p.ratings[key] : 60;
    return FM.RATING_W * (FM.eff(r + ((p && p.mbonus) || 0)) - 60);
  };
  FM.MOM = { player: 8, club: 4, lr: 0.3 };

  // ---------- tactics ----------
  // There is no tactical edge. Nothing here scores one plan against another: a plan only works through where the players stand, what they see and what they
  // choose, in the match itself. (FM.edgeFor stays so the probabilities that take an edge read zero.)
  FM.edgeFor = () => 0;

  // ---------- momentum ----------
  FM.setMomentumBonus = function (team) {
    team.squad.forEach((p) => { p.mbonus = FM.MOM.player * clamp(p.form || 0, -1, 1) + FM.MOM.club * clamp(team.momentum || 0, -1, 1); });
  };
  // The game leans a little towards the manager, as a career game does: a club with a good manager can climb the divisions over a few seasons, and a smaller club can
  // beat a better one more often than the ratings alone say. A steady lift (base) for the managed club's players, and a further lift when the other side is the
  // better one (a share of the gap, up to the cap). It is a few rating points, which the softening in FM.sk shrinks again: a nudge, not a different sport.
  FM.USER_EDGE = { base: 2, gapK: 0.35, cap: 6 };
  const XI_KEYS = ['pace', 'dribbling', 'passing', 'finishing', 'tackling', 'heading', 'composure', 'stamina'];
  const xiLevel = (t) => { const ps = (t.players && t.players.length ? t.players : t.squad.slice(0, 11)).filter((p) => p.group !== 'GK'); return ps.length ? mean(ps.map((p) => mean(XI_KEYS.map((k) => ((p.baseRatings || p.ratings || {})[k]) || 55)))) : 55; };
  FM.userEdgeFor = function (league, team, opp) {
    if (!league || league.mp || !team || team.id !== league.userId || FM.NO_USER_EDGE) return 0;
    const gap = opp ? xiLevel(opp) - xiLevel(team) : 0, E = FM.USER_EDGE;
    return clamp(E.base + E.gapK * Math.max(0, gap), 0, E.cap);
  };
  FM.applyUserEdge = function (league, team, opp) {
    const lm = FM.userMod && league && team.id === league.userId && !league.mp ? FM.userMod('performance') : 1;   // spending on the players' motivation (bonuses, team programmes) shows in match-day effort
    const e = FM.userEdgeFor(league, team, opp) + (lm - 1) * 100; if (!e) return 0;
    team.squad.forEach((p) => { p.mbonus = (p.mbonus || 0) + e; });
    return e;
  };
  FM.clearMomentumBonus = function (team) { team.squad.forEach((p) => { delete p.mbonus; }); };
  // After a league match: every club's momentum follows its result; every player's form follows how he played against what was expected of him (passes,
  // tackles, dribbles and shots against their odds, goals) and the result. Each moves a fraction of the way to what the match says, so one match
  // is a small step, matches in a row add up, and the nearer to the limit the smaller each further step is.
  FM.updateMomentum = function (league, fx, match, played) {
    const LR = FM.MOM.lr;
    [match.home, match.away].forEach((t) => {
      const o = t === match.home ? match.away : match.home, gf = match.score[t.id] || 0, ga = match.score[o.id] || 0, result = gf > ga ? 1 : gf === ga ? 0 : -1;
      const acc = {}, A = (n) => (acc[n] || (acc[n] = { pe: 0, pv: 0, pn: 0, te: 0, tv: 0, tn: 0, de: 0, dv: 0, dn: 0, sh: 0, goals: 0 }));
      match.events.forEach((e) => {
        if (e.team !== t.id) return;
        if (e.type === 'pass' && e.from != null) { const a = A(e.from), p = Number.isFinite(e.p) ? e.p : 0.75; a.pe += (e.ok ? 1 : 0) - p; a.pv += p * (1 - p); a.pn++; }
        else if (e.type === 'tackle' && e.player != null) { const a = A(e.player), p = Number.isFinite(e.p) ? e.p : 0.5; a.te += (e.ok ? 1 : 0) - p; a.tv += p * (1 - p); a.tn++; }
        else if (e.type === 'dribble' && e.player != null) { const a = A(e.player), p = Number.isFinite(e.p) ? e.p : 0.5; a.de += (e.ok ? 1 : 0) - p; a.dv += p * (1 - p); a.dn++; }
        else if (e.type === 'shot' && e.player != null) { const a = A(e.player); a.sh += (e.outcome === 'goal' ? 1 : 0) - (e.xg || 0); }
        else if (e.type === 'goal' && e.player != null) { A(e.player).goals++; }
      });
      t.squad.forEach((p) => {
        if (!played || !played.has(p.id)) { p.form = (p.form || 0) * 0.85; return; }
        const a = acc[p.number] || A(p.number);
        const z = (e, v, n) => (n ? (e / Math.sqrt(v + 1)) * (n / (n + 8)) : 0);
        const raw = 0.30 * z(a.pe, a.pv, a.pn) + 0.25 * z(a.te, a.tv, a.tn) + 0.25 * z(a.de, a.dv, a.dn) + 0.45 * clamp(a.sh, -1, 1) + 0.35 * Math.min(3, a.goals) + 0.22 * result;
        const perf = Math.tanh(raw), f0 = clamp(p.form || 0, -1, 1);
        p.form = clamp(f0 + LR * (perf - f0), -1, 1);
      });
      const target = clamp(0.6 * result + 0.12 * clamp(gf - ga, -3, 3), -1, 1), m0 = clamp(t.momentum || 0, -1, 1);
      t.momentum = clamp(m0 + LR * (target - m0), -1, 1);
    });
  };
  FM.formLabel = function (p) {
    const f = p.form || 0;
    return f >= 0.5 ? 'in outstanding form' : f >= 0.2 ? 'in good form' : f <= -0.5 ? 'in dreadful form' : f <= -0.2 ? 'out of form' : '';
  };
})();
