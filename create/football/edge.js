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
  // A run of results. Two or three wins in a row and a side plays with a confidence that shows in everything it does; a run of defeats does the same the other way. It is carried as a
  // streak (wins counted up, defeats counted down; a draw only slows it) and moves every player's ratings like the club's momentum and the manager's edge do. Streaks do not run for ever:
  // on any game one can simply be broken (a bad day, a good one), and a change of plan breaks one more often than not (a shake-up: a new shape, a new way of playing, and neither the
  // confidence nor the doubt carries over). The computer's managers make such changes now and then at random (see FM.updateMomentum).
  FM.STREAK = { per: 1.0, from: 2, cap: 3.5, breakBase: 0.10, breakPer: 0.05, shakeWin: 0.35, shakeLose: 0.6, aiChange: 0.14 };
  const run = (t) => t.run || (t.run = { streak: 0, broken: 0, sig: null });
  const SIG_KEYS = ['tempo', 'pressing', 'lineHeight', 'directness', 'risk', 'buildDirect', 'counterAttack', 'attackWidth', 'defWidth'];
  const planSig = (t) => { const T = t.baseTactics || t.tactics || {}, o = { f: t.formationKey, t: {} }; SIG_KEYS.forEach((k) => { o.t[k] = Math.round((T[k] == null ? 0.5 : T[k]) * 100) / 100; }); return o; };
  const planShift = (a, b) => (!a || !b ? 0 : (a.f !== b.f ? 1.2 : 0) + SIG_KEYS.reduce((n, k) => n + Math.abs((a.t[k] || 0) - (b.t[k] || 0)), 0));
  FM.streakBonus = (t) => { const r = run(t), n = Math.abs(r.streak), S = FM.STREAK; if (r.broken || n < S.from) return 0; return Math.sign(r.streak) * Math.min(S.cap, S.per * (n - S.from + 1) + 0.5); };
  FM.setMomentumBonus = function (team) {
    const r = run(team), sig = planSig(team);
    // a change of plan since the last match breaks a run, more often when it is a run of defeats (the shake-up) than of wins (a winning side that changes loses its rhythm less often)
    if (r.sig && Math.abs(r.streak) >= FM.STREAK.from && !r.broken && planShift(r.sig, sig) >= 0.6 && Math.random() < (r.streak < 0 ? FM.STREAK.shakeLose : FM.STREAK.shakeWin)) r.broken = 1;
    r.sig = sig;
    const sb = FM.streakBonus(team);
    team.squad.forEach((p) => { p.mbonus = FM.MOM.player * clamp(p.form || 0, -1, 1) + FM.MOM.club * clamp(team.momentum || 0, -1, 1) + sb; });
  };
  // The game leans a little towards the manager, as a career game does: a club with a good manager can climb the divisions over a few seasons, and a smaller club can
  // beat a better one more often than the ratings alone say. A steady lift (base) for the managed club's players, and a further lift when the other side is the
  // better one (a share of the gap, up to the cap). It is a few rating points, which the softening in FM.sk shrinks again: a nudge, not a different sport.
  FM.USER_EDGE = { base: 2, gapK: 0.35, cap: 6 };
  const XI_KEYS = ['pace', 'dribbling', 'passing', 'finishing', 'tackling', 'heading', 'composure', 'stamina'];
  const xiLevel = (t) => { const ps = (t.players && t.players.length ? t.players : t.squad.slice(0, 11)).filter((p) => p.group !== 'GK'); return ps.length ? mean(ps.map((p) => mean(XI_KEYS.map((k) => ((p.baseRatings || p.ratings || {})[k]) || 55)))) : 55; };
  // A cup tie is where a small club can beat a big one, so the lean is stronger there when the other side stands higher than the manager's (a higher division, or a better place in the
  // same one): without that a manager of a lower-league club would never get past the bigger clubs. It reads where both clubs stand now, so it applies to saves already begun.
  FM.CUP_EDGE = { base: 3, gapK: 0.7, cap: 10, perLevel: 1.5, perPlace: 0.25 };
  const standingOf = (league, t) => { const d = FM.allDivisions(league).find((x) => x.teams.indexOf(t) >= 0); if (!d) return null; const rows = FM.divisionTableRows(d), i = rows.findIndex((r) => r.id === t.id); return { level: d.level, pos: i < 0 ? d.teams.length : i + 1 }; };
  FM.userEdgeFor = function (league, team, opp, fx) {
    if (!league || league.mp || !team || team.id !== league.userId || FM.NO_USER_EDGE) return 0;
    const gap = opp ? xiLevel(opp) - xiLevel(team) : 0, E = FM.USER_EDGE;
    if (fx && fx.stage && opp && !fx.friendly) {
      const C = FM.CUP_EDGE, me = standingOf(league, team), them = standingOf(league, opp);
      let up = 0; if (me && them) up = me.level > them.level ? (me.level - them.level) * C.perLevel + 1 : me.level === them.level && them.pos < me.pos ? Math.min(6, me.pos - them.pos) * C.perPlace : 0;
      if (up > 0) return clamp(C.base + C.gapK * Math.max(0, gap) + up, 0, C.cap);
    }
    return clamp(E.base + E.gapK * Math.max(0, gap), 0, E.cap);
  };
  FM.applyUserEdge = function (league, team, opp, fx) {
    const lm = FM.userMod && league && team.id === league.userId && !league.mp ? FM.userMod('performance') : 1;   // spending on the players' motivation (bonuses, team programmes) shows in match-day effort
    const e = FM.userEdgeFor(league, team, opp, fx) + (lm - 1) * 100; if (!e) return 0;
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
      // the streak: a run that was broken for this game starts again from this result; otherwise wins and defeats add up, a draw slows it
      const r = run(t), S = FM.STREAK; if (r.broken) { r.streak = 0; r.broken = 0; }
      r.streak = result > 0 ? (r.streak > 0 ? r.streak + 1 : 1) : result < 0 ? (r.streak < 0 ? r.streak - 1 : -1) : Math.trunc(r.streak / 2);
      const n = Math.abs(r.streak);
      if (n >= S.from) {
        // on any game it may simply break; and a computer-run manager now and then changes things at random (a tweak to tempo, pressing, the line or how direct they are), which
        // shows up as a change of plan when the next match starts and may break the run that way
        if (Math.random() < S.breakBase + S.breakPer * (n - S.from)) r.broken = 1;
        else if (t.id !== league.userId && Math.random() < S.aiChange) {
          const ks = ['tempo', 'pressing', 'lineHeight', 'directness', 'risk'].sort(() => Math.random() - 0.5).slice(0, 2);
          ks.forEach((k) => { const d = (Math.random() < 0.5 ? -1 : 1) * (0.14 + 0.1 * Math.random()); [t.baseTactics, t.tactics, t.liveBase].forEach((T) => { if (T && T[k] != null) T[k] = clamp(T[k] + d, 0, 1); }); });
        }
      }
    });
  };
  FM.formLabel = function (p) {
    const f = p.form || 0;
    return f >= 0.5 ? 'in outstanding form' : f >= 0.2 ? 'in good form' : f <= -0.5 ? 'in dreadful form' : f <= -0.2 ? 'out of form' : '';
  };
})();
