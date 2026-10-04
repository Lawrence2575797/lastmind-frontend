// Seeded random numbers and player ratings.
// Ratings (roughly 25 to 95) change the odds of the events a player is involved in: a better dribbler
// wins more dribbles, a better finisher scores more of the same chances, a better tackler wins more
// challenges. They do not decide where a player goes: the tactics do.
(function () {
  const FM = (window.FM = window.FM || {});
  FM.RATING_SD = FM.RATING_SD || 7; // how widely individual ratings vary around their position average

  FM.mulberry32 = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  FM.hashString = function (s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  function gauss(rng) {
    const u = Math.max(1e-9, rng()), v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // Typical rating for each kind of position (mean of a normal distribution).
  const PROFILES = {
    GK: { pace: 45, dribbling: 35, passing: 55, finishing: 25, tackling: 35, composure: 62, heading: 40, stamina: 60 },
    CB: { pace: 56, dribbling: 45, passing: 58, finishing: 32, tackling: 72, composure: 60, heading: 72, stamina: 62 },
    FB: { pace: 70, dribbling: 58, passing: 62, finishing: 40, tackling: 64, composure: 58, heading: 50, stamina: 72 },
    DM: { pace: 58, dribbling: 56, passing: 70, finishing: 42, tackling: 70, composure: 64, heading: 58, stamina: 68 },
    CM: { pace: 62, dribbling: 64, passing: 72, finishing: 52, tackling: 60, composure: 64, heading: 52, stamina: 70 },
    AM: { pace: 68, dribbling: 72, passing: 72, finishing: 62, tackling: 42, composure: 66, heading: 48, stamina: 66 },
    WF: { pace: 78, dribbling: 76, passing: 64, finishing: 66, tackling: 38, composure: 62, heading: 46, stamina: 66 },
    ST: { pace: 70, dribbling: 66, passing: 56, finishing: 76, tackling: 34, composure: 66, heading: 70, stamina: 62 },
  };

  FM.generateRatings = function (group, rng, strength) {
    const prof = PROFILES[group] || PROFILES.CM;
    const r = {};
    Object.keys(prof).forEach((k) => {
      r[k] = Math.round(Math.max(25, Math.min(95, prof[k] + (strength || 0) + gauss(rng) * FM.RATING_SD)));
    });
    r.gk = group === 'GK' ? Math.round(Math.max(45, Math.min(92, 68 + (strength || 0) + gauss(rng) * FM.RATING_SD))) : 20;
    return r;
  };

  // A single rating out of 10 for a player in a position, so you do not have to read every stat: a weighted average of the ratings
  // that matter most for that position (a striker's finishing counts for far more than his tackling), shown to one decimal place.
  // It uses his rested ratings, so it does not dip during a match. The individual ratings are still there for anyone who wants them.
  const RATING_WEIGHTS = {
    GK: { gk: 0.75, composure: 0.1, passing: 0.1, stamina: 0.05 },
    CB: { tackling: 0.35, heading: 0.25, composure: 0.15, pace: 0.1, passing: 0.1, stamina: 0.05 },
    FB: { pace: 0.2, tackling: 0.2, stamina: 0.2, passing: 0.15, dribbling: 0.1, composure: 0.1, heading: 0.05 },
    DM: { tackling: 0.3, passing: 0.25, composure: 0.15, stamina: 0.15, heading: 0.1, pace: 0.05 },
    CM: { passing: 0.3, stamina: 0.15, tackling: 0.15, dribbling: 0.15, composure: 0.15, pace: 0.05, finishing: 0.05 },
    AM: { passing: 0.25, dribbling: 0.25, composure: 0.15, finishing: 0.15, pace: 0.1, stamina: 0.05, heading: 0.05 },
    WF: { pace: 0.25, dribbling: 0.25, finishing: 0.15, passing: 0.15, composure: 0.1, stamina: 0.1 },
    ST: { finishing: 0.3, composure: 0.15, pace: 0.15, heading: 0.15, dribbling: 0.1, stamina: 0.1, passing: 0.05 },
  };
  FM.playerRating = function (p, group) {
    const w = RATING_WEIGHTS[group || p.natural] || RATING_WEIGHTS.CM, r = p.baseRatings || p.ratings;
    let sum = 0;
    Object.keys(w).forEach((k) => { sum += w[k] * (r[k] != null ? r[k] : 50); });
    return Math.round(sum) / 10;
  };
  FM.ratingText = (p, group) => FM.playerRating(p, group).toFixed(1) + '/10';
})();
