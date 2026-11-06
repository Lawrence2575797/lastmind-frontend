// Tactical dials: continuous team settings in real units (metres, 0-1 scales) that sit on top of the drawn plan.
// team.dials holds only what the manager has moved; FM.dialsApply writes it into team.tactics and the engine reads the metre dials directly.
(function () {
  const FM = (window.FM = window.FM || {});
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  // unit: how the number is shown. tac: the tactics field a 0-1 dial writes. lo/hi/def: range and neutral value.
  FM.DIALS = [
    { id: 'line', label: 'Defensive line', unit: 'm', lo: -12, hi: 14, def: 0, step: 1, phases: ['defence'], words: 'metres higher (+) or deeper (-) than the drawn line stands' },
    { id: 'press', label: 'Press trigger', unit: 'm', lo: -5, hi: 9, def: 0, step: 1, phases: ['press'], words: 'extra metres from the ball at which the nearest man starts to close down' },
    { id: 'counterPress', label: 'Counter-press', unit: '', lo: 0, hi: 1, def: .5, step: .05, tac: 'counterPress', phases: ['transDef'], words: 'how hard the side hunts the ball in the seconds after losing it' },
    { id: 'tackle', label: 'Tackle aggression', unit: '', lo: 0, hi: 1, def: .5, step: .05, tac: 'tackleAggression', phases: ['defence', 'press'], words: 'how often a tackle is committed to rather than a man shepherded (more fouls, more wins)' },
    { id: 'trap', label: 'Offside trap', unit: '', lo: 0, hi: 1, def: .3, step: .05, tac: 'offsideTrap', phases: ['defence'], words: 'how often the line steps up together to catch a runner' },
    { id: 'buildDirect', label: 'Build-up length', unit: '', lo: 0, hi: 1, def: .35, step: .05, tac: 'buildDirect', phases: ['build'], words: '0 is short passes out from the back, 1 is long balls forward' },
    { id: 'directness', label: 'Midfield directness', unit: '', lo: 0, hi: 1, def: .5, step: .05, tac: 'directness', phases: ['midfield', 'transAtt'], words: 'how quickly the ball goes forward through the middle third' },
    { id: 'width', label: 'Attacking width', unit: 'x', lo: .7, hi: 1.25, def: 1, step: .05, tac: 'attackWidth', phases: ['build', 'midfield', 'final'], words: '1 is the drawn width; more stretches the pitch, less packs the middle' },
    { id: 'tempo', label: 'Tempo', unit: '', lo: 0, hi: 1, def: .5, step: .05, tac: 'tempo', phases: ['build', 'midfield', 'transAtt'], words: 'how quickly players take a decision and the ball is moved on' },
    { id: 'risk', label: 'Risk in build-up', unit: '', lo: 0, hi: 1, def: .5, step: .05, tac: 'risk', phases: ['build', 'midfield', 'transAtt'], words: 'how often a pass that might be lost is tried' },
    { id: 'finalRisk', label: 'Risk in the final third', unit: '', lo: 0, hi: 1, def: .5, step: .05, tac: 'finalRisk', phases: ['final'], words: 'how adventurous the last pass or dribble is near goal' },
    { id: 'dribble', label: 'Dribbling freedom', unit: '', lo: 0, hi: 1, def: .5, step: .05, tac: 'dribbleFreedom', phases: ['midfield', 'final'], words: 'how readily a player takes his man on' },
    { id: 'shootRange', label: 'Shooting range', unit: 'm', lo: 18, hi: 42, def: 32, step: 1, phases: ['final'], words: 'the furthest distance from goal at which a shot is even considered' },
    { id: 'shootFreedom', label: 'Shot selection', unit: '', lo: 0, hi: 1, def: .5, step: .05, tac: 'shootFreedom', phases: ['final'], words: '0 waits for a clear chance, 1 shoots at the first sight of goal' },
  ];
  FM.DIAL_BY = {}; FM.DIALS.forEach((d) => { FM.DIAL_BY[d.id] = d; });
  FM.dialGet = function (team, id) { const d = FM.DIAL_BY[id]; if (!d) return null; const v = team && team.dials && team.dials[id]; return v == null ? d.def : v; };
  FM.dialShow = function (id, v) { const d = FM.DIAL_BY[id]; if (!d) return String(v); if (d.unit === 'm') return (v > 0 && d.def === 0 ? '+' : '') + Math.round(v) + ' m'; if (d.unit === 'x') return v.toFixed(2) + '×'; return Math.round(v * 100) + '%'; };
  FM.dialSet = function (team, id, v) {
    const d = FM.DIAL_BY[id]; if (!d || !team) return false;
    team.dials = team.dials || {};
    const x = clamp(Number(v), d.lo, d.hi); if (!Number.isFinite(x)) return false;
    if (Math.abs(x - d.def) < 1e-9) delete team.dials[id]; else team.dials[id] = x;
    FM.dialsApply(team); return true;
  };
  // numeric dials overwrite the tactics value the plan gave; metre dials are read by the engine through FM.dialM
  FM.dialsApply = function (team) {
    if (!team || !team.dials || !team.tactics) return;
    FM.DIALS.forEach((d) => { if (d.tac && team.dials[d.id] != null) team.tactics[d.tac] = team.dials[d.id]; });
    if (team.dials.line != null && team.tactics.lineHeight != null) team.tactics.lineHeight = clamp(team.tactics.lineHeight + team.dials.line / 30, 0, 1);
  };
  FM.dialM = function (team, id) { return (team && team.dials && team.dials[id]) || (FM.DIAL_BY[id] ? FM.DIAL_BY[id].def : 0); };
})();
