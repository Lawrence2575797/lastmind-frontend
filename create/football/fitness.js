// Fitness: energy within a match, condition across the season, and injuries.
//
// Energy (0 to 1) drains as a player runs. How fast depends on how hard the team presses and how fast it plays, and on the
// player's stamina. As energy falls his speed and his technical ratings fall with it, so a tired side makes more mistakes late
// in the match. The energy he finishes with is his condition for the next match, and condition only recovers a little each day,
// so a player who plays every week at high intensity starts matches tired. Injuries become likelier as energy falls and as
// intensity rises, and they keep a player out for a number of days.
(function () {
  const FM = (window.FM = window.FM || {});
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const TECH = ['dribbling', 'passing', 'finishing', 'tackling', 'heading', 'composure'];
  FM.today = 0;

  FM.isInjured = (p) => !!(p.injury && p.injury.until > FM.today);
  FM.stamina = (p) => (p.ratings && p.ratings.stamina) || (p.baseRatings && p.baseRatings.stamina) || 65;
  FM.conditionOf = (p) => (p.energy != null ? p.energy : p.condition != null ? p.condition : 1);

  // ---------- energy ----------
  // Seconds of running at full pace and at rest cost differently; intensity and stamina scale the cost.
  FM.drainFor = function (p, team, dt) {
    const vr = Math.hypot(p.vx, p.vy) / (p.maxSpeed || 8);
    const t = team.tactics;
    const intensity = 0.8 + 0.4 * t.pressing + 0.2 * (t.tempo - 0.5);
    const stam = 1.7 - FM.stamina(p) / 100;
    return dt * (0.000045 + 0.000075 * vr) * intensity * stam;
  };
  // Ratings of a tired player: every technical rating and his top speed fall as energy falls.
  FM.applyFatigue = function (p) {
    const base = p.baseRatings;
    if (!base) return;
    const e = clamp(p.energy == null ? 1 : p.energy, 0, 1), m = 0.7 + 0.3 * e;
    TECH.forEach((k) => { p.ratings[k] = Math.round(base[k] * m); });
    p.maxSpeed = FM.speedFromPace(base.pace) * (0.82 + 0.18 * e);
  };

  FM.fitnessBegin = function (team) {
    team.squad.forEach((p) => {
      if (!p.baseRatings) p.baseRatings = Object.assign({}, p.ratings);
      p.energy = p.condition == null ? 1 : p.condition;
      FM.applyFatigue(p);
    });
  };
  // At the final whistle: ratings back to normal, and the energy a player has left becomes his condition.
  FM.fitnessEnd = function (team, played) {
    team.squad.forEach((p) => {
      if (p.baseRatings) { const keep = p.ratings.gk; Object.assign(p.ratings, p.baseRatings); if (p.emergencyKeeper) p.ratings.gk = keep; p.maxSpeed = FM.speedFromPace(p.baseRatings.pace); delete p.baseRatings; }
      if (played.has(p.id)) p.condition = clamp(p.energy == null ? 1 : p.energy, 0.2, 1);
      delete p.energy;
    });
  };
  FM.recoverDay = function (league) {
    league.teams.forEach((t) => t.squad.forEach((p) => { if (p.condition != null && p.condition < 1) p.condition = Math.min(1, p.condition + 0.05); }));
  };

  // ---------- injuries ----------
  // Chance per second, about 0.15 injuries per team per match at normal intensity and energy, rising when tired.
  FM.injuryHazard = function (p, team) {
    const e = clamp(p.energy == null ? 1 : p.energy, 0, 1), t = team.tactics;
    return 2.2e-6 * (1 + 3.5 * (1 - e) * (1 - e) + 1.2 * (1 - e)) * (0.7 + 0.6 * t.pressing + 0.2 * t.tackleAggression);
  };
  // How long: mostly short knocks, sometimes a long lay-off.
  FM.rollInjury = function (rng) {
    const r = rng();
    const matches = r < 0.4 ? 1 : r < 0.65 ? 2 : r < 0.8 ? 3 : r < 0.9 ? 4 + Math.floor(rng() * 3) : 7 + Math.floor(rng() * 6);
    const name = matches <= 2 ? ['a knock', 'a muscle strain', 'a twisted ankle'][Math.floor(rng() * 3)] : matches <= 6 ? ['a hamstring tear', 'a calf injury', 'a groin strain'][Math.floor(rng() * 3)] : ['a knee ligament injury', 'a broken foot', 'a torn thigh muscle'][Math.floor(rng() * 3)];
    return { matches, days: matches * 7 + 1, name };
  };

  // ---------- lineups ----------
  // Puts the best available players on the pitch. Injured players are replaced; for clubs run by the computer, a player who
  // is exhausted is rested as well. Returns a list of what changed.
  FM.autoLineup = function (team, opts) {
    const changes = [], near = FM.GROUP_NEAR;
    const ovr = (p) => p.ratings.pace + p.ratings.dribbling + p.ratings.passing + p.ratings.finishing + p.ratings.tackling;
    const rank = (slotGroup, p) => { const r = (near[slotGroup] || [slotGroup]).indexOf(p.natural); return r < 0 ? 9 : r; };
    team.players.slice().forEach((out) => {
      const injured = FM.isInjured(out), tired = opts && opts.rotate && FM.conditionOf(out) < 0.6 && out.group !== 'GK';
      if (!injured && !tired) return;
      const cands = team.bench.filter((b) => !FM.isInjured(b) && FM.conditionOf(b) > (injured ? 0 : FM.conditionOf(out) + 0.15));
      if (!cands.length) return;
      cands.sort((a, b) => (rank(out.group, a) - rank(out.group, b)) || (ovr(b) - ovr(a)));
      const inn = cands[0];
      if (!injured && (rank(out.group, inn) > 1 || ovr(inn) < ovr(out) - 25)) return; // do not rest a star for a poor alternative
      if (FM.substitute(team, out, inn, null) === null) changes.push({ off: out, on: inn, injured });
    });
    return changes;
  };
})();
