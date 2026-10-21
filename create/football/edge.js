// What decides a match, besides who the players are: how the two plans fit together, and how in form everyone is.
//
// 1. Ratings are softened. A rating counts less than it used to (RATING_W) and counts for less and less the higher it goes (eff), so a 99 is better than an 80 but
//    nowhere near invincible. Every probability in the match reads a rating through FM.sk.
// 2. Tactical edge. For each match the two sides' plans are compared (FM.tactEdge): a plan that exploits what the other side has chosen to do, and that suits its own
//    players, gains an edge; one that walks into the other's strengths loses it. The edge is a nudge to the odds of every pass, dribble, tackle and shot the side
//    makes, recomputed each minute so that changing the plan in the match matters. It is zero-sum between the two sides, and no single setting is best against
//    every opponent: a high line is a gift to a side that plays long and has pace, a short build-up is a gift to a side that presses it, a team that goes forward
//    at all costs is a gift to a counter-attack, a patient side is frustrated by a deep block less than a reckless one.
// 3. Momentum. Every player has a form (-1 to 1) and every club a momentum (-1 to 1) that follow the results and performances of recent matches. A single match
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

  // ---------- tactical edge ----------
  const tv = (t, k, d) => (t.tactics && Number.isFinite(t.tactics[k]) ? t.tactics[k] : d);
  const avg = (team, groups, key) => { const ps = (team.players || []).filter((p) => groups.indexOf(p.group) >= 0); return ps.length ? mean(ps.map((p) => FM.eff((p.ratings && p.ratings[key]) || 60))) : 60; };
  // How well team a's plan hurts team d's plan.
  function exploit(a, d) {
    const pace = clamp((avg(a, ['ST', 'WF', 'AM'], 'pace') - avg(d, ['CB'], 'pace')) / 12, -1, 1);
    const long = 0.6 * tv(a, 'directness', 0.45) + 0.4 * tv(a, 'counterAttack', 0.5);
    const e1 = clamp((tv(d, 'lineHeight', 0.5) - 0.45) * (long - 0.45) * 5 * (0.65 + 0.35 * pace), -1, 1);                     // long balls and pace against a high line
    const bypass = 0.6 * tv(a, 'buildDirect', 0.35) + 0.5 * tv(a, 'beatPress', 0.4);
    const e2 = clamp((tv(d, 'pressBuildUp', 0.4) - 0.45) * (bypass - 0.5) * 5, -1, 1);                                       // playing round a press, or into it
    const e3 = clamp(((tv(d, 'risk', 0.5) + tv(d, 'tempo', 0.5)) / 2 - 0.45) * (tv(a, 'counterAttack', 0.5) - 0.45) * 4, -1, 1);   // a counter-attack against a side that goes forward at all costs
    const block = 0.45 - (tv(d, 'lineHeight', 0.5) + tv(d, 'pressing', 0.5)) / 2;
    const e4 = clamp(-(block * ((tv(a, 'tempo', 0.5) + tv(a, 'risk', 0.5)) / 2 - 0.45) * 3), -1, 1);                         // forcing it against a deep, passive block gets nowhere
    return clamp(1.3 * (e1 + e2 + e3 + e4), -2.2, 2.2);
  }
  // How well a plan suits the side's own players (pressing needs stamina, a high line needs quick centre-backs, short passing needs passers, long balls need
  // forwards who can run and jump).
  function coherence(t) {
    const stam = avg(t, ['CB', 'FB', 'DM', 'CM', 'AM', 'WF', 'ST'], 'stamina'), cbPace = avg(t, ['CB'], 'pace'), pass = avg(t, ['CB', 'FB', 'DM', 'CM', 'AM'], 'passing'), fwd = (avg(t, ['ST', 'WF'], 'pace') + avg(t, ['ST', 'WF'], 'heading')) / 2;
    const press = (tv(t, 'pressing', 0.5) - 0.5) * (stam - 62) / 18, line = (tv(t, 'lineHeight', 0.5) - 0.5) * (cbPace - 62) / 14;
    const style = (0.5 - tv(t, 'directness', 0.45)) * (pass - 60) / 15 + (tv(t, 'directness', 0.45) - 0.5) * (fwd - 60) / 15;
    // a plan that pulls the team apart (pressing high behind a deep line, or the reverse) or burns it out (maximum risk and tempo together) costs it
    const gap = Math.abs(tv(t, 'pressing', 0.5) - tv(t, 'lineHeight', 0.5)), disc = gap > 0.3 ? -(gap - 0.3) * 1.6 : 0, burn = Math.max(0, tv(t, 'risk', 0.5) + tv(t, 'tempo', 0.5) - 1.45) * 1.2;
    return clamp(press + line + style + disc - burn, -1, 1);
  }
  const execution = (t) => 0.5 + 0.5 * ((t.tacticalFamiliarity && Number.isFinite(t.tacticalFamiliarity.score) ? t.tacticalFamiliarity.score : 100) / 100);
  FM.tactEdge = function (a, d) {
    const xa = execution(a) * exploit(a, d) + 0.8 * coherence(a), xd = execution(d) * exploit(d, a) + 0.8 * coherence(d);
    return clamp(xa - xd, -2.5, 2.5);
  };
  FM.computeEdges = function (match) {
    const e = FM.tactEdge(match.home, match.away);
    match.edge = { [match.home.id]: e, [match.away.id]: -e };
    match.edgeSum = match.edgeSum || {}; match.edgeN = (match.edgeN || 0) + 1;
    match.edgeSum[match.home.id] = (match.edgeSum[match.home.id] || 0) + e; match.edgeSum[match.away.id] = (match.edgeSum[match.away.id] || 0) - e;
  };
  FM.edgeFor = (match, team) => (match && match.edge && team && match.edge[team.id]) || 0;

  // ---------- momentum ----------
  FM.setMomentumBonus = function (team) {
    team.squad.forEach((p) => { p.mbonus = FM.MOM.player * clamp(p.form || 0, -1, 1) + FM.MOM.club * clamp(team.momentum || 0, -1, 1); });
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
