// Instruction rules: the manager's own instructions, for the whole team, a line (defence, midfield, attack, goalkeeper), a position group or one player.
// A rule is  who it is for  +  when it applies  +  what changes. The match engine reads them while it plays: they change which pass a player likes,
// where he stands, who he follows and how hard he closes down, only while their conditions hold. The words typed by a manager are turned into this
// form once, when the instruction is saved (see the backend route /football/compile-instruction); nothing is interpreted during a match, so a
// match or a test can always be replayed exactly. The vocabulary here must match lastmind-compile-backend/src/services/footballRules.ts.
(function () {
  const FM = (window.FM = window.FM || {});
  const L = 105, W = 68;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const LINES = { goalkeeper: ['GK'], defence: ['CB', 'FB'], midfield: ['DM', 'CM', 'AM'], attack: ['WF', 'ST'] };
  const GROUPS = ['GK', 'CB', 'FB', 'DM', 'CM', 'AM', 'WF', 'ST'];
  const GROUP_WORD = { GK: 'goalkeeper', CB: 'centre-backs', FB: 'full-backs', DM: 'defensive midfielders', CM: 'central midfielders', AM: 'attacking midfielders', WF: 'wingers', ST: 'strikers' };
  const LINE_WORD = { goalkeeper: 'the goalkeeper', defence: 'the defence', midfield: 'the midfield', attack: 'the attack' };
  const lineOf = (g) => (LINES.defence.indexOf(g) >= 0 ? 'defence' : LINES.midfield.indexOf(g) >= 0 ? 'midfield' : LINES.attack.indexOf(g) >= 0 ? 'attack' : 'goalkeeper');

  // ---------- who a rule is for, when it holds ----------
  const scopeMatches = (scope, p) => !scope || scope.kind === 'team' || (scope.kind === 'line' && LINES[scope.line] && LINES[scope.line].indexOf(p.group) >= 0) || (scope.kind === 'group' && scope.group === p.group) || (scope.kind === 'player' && scope.number === p.number);
  const zoneOf = (d) => (d < 0.34 ? 'own_third' : d < 0.67 ? 'middle_third' : 'final_third');
  const sideOf = (w) => (w < 0.38 ? 'left' : w > 0.62 ? 'right' : 'centre');
  // The situation a rule is checked against. ball is in pitch metres; pressed is only known for the side with the ball.
  FM.rulesCtx = function (team, ball, hasBall, pressed) {
    const b = FM.toTeamSpace(team.attackDir, ball.x, ball.y), rc = team.ruleCtx || {}, pc = team.phaseCtx || {};
    // The stage of play, as the tactics board names them: the same five the manager sets positions for, plus pressing their build-up.
    const stage = hasBall ? ((pc.transAtt || 0) > 0.35 ? 'transAtt' : b.d < 0.5 ? 'build' : 'final') : ((pc.transDef || 0) > 0.35 ? 'transDef' : (b.d > 0.6 && (team.tactics.pressBuildUp == null ? 0.4 : team.tactics.pressBuildUp) > 0.2) ? 'press' : 'without');
    return { hasBall: !!hasBall, zone: zoneOf(b.d), side: sideOf(b.w), pressed: !!pressed, stage, scoreDiff: rc.scoreDiff || 0, minute: rc.minute || 0 };
  };
  const whenHolds = (when, c) => {
    if (!when) return true;
    if (when.possession === 'with' && !c.hasBall) return false;
    if (when.possession === 'without' && c.hasBall) return false;
    if (when.zone && when.zone.indexOf(c.zone) < 0) return false;
    if (when.stage && when.stage.indexOf(c.stage) < 0) return false;
    if (when.pressed === 'pressed' && !c.pressed) return false;
    if (when.pressed === 'free' && c.pressed) return false;
    if (when.side === 'wide' ? c.side === 'centre' : when.side && when.side !== c.side) return false;
    if (when.score === 'winning' && c.scoreDiff <= 0) return false;
    if (when.score === 'losing' && c.scoreDiff >= 0) return false;
    if (when.score === 'drawing' && c.scoreDiff !== 0) return false;
    if (when.minFrom != null && c.minute < when.minFrom) return false;
    if (when.minTo != null && c.minute > when.minTo) return false;
    return true;
  };
  // Every effect, from every rule that is for this player and holds now.
  FM.rulesActive = function (team, p, c) {
    const out = [];
    (team.rules || []).forEach((r) => { if (r.off || !scopeMatches(r.scope, p) || !whenHolds(r.when, c)) return; r.effects.forEach((e) => out.push(e)); });
    return out;
  };
  // A passer's rules folded into the numbers the decision uses.
  FM.rulesFold = function (effects) {
    const f = { short: 0, long: 0, passTo: [], dir: { forward: 0, sideways: 0, backward: 0 }, freeMan: 0, risk: 0, dribble: 0, shoot: 0, holdUp: false, tempo: 0 };
    effects.forEach((e) => {
      if (e.type === 'passLength') f[e.pref] = clamp(f[e.pref] + e.strength, 0, 1);
      else if (e.type === 'passTarget') f.passTo.push({ to: e.to, w: e.weight });
      else if (e.type === 'passDirection') f.dir[e.dir] = clamp(f.dir[e.dir] + e.weight, -1, 1);
      else if (e.type === 'freeMan') f.freeMan = clamp(f.freeMan + e.weight, 0, 1);
      else if (e.type === 'holdUp') f.holdUp = f.holdUp || e.on;
      else if (['risk', 'dribble', 'shoot', 'tempo'].indexOf(e.type) >= 0) f[e.type] = clamp(f[e.type] + e.delta, -1, 1);
    });
    return f;
  };
  // Is this receiver one the pass-target effect talks about?
  FM.rulesReceiver = function (to, t, passer, team) {
    if (to.group && t.group !== to.group) return false;
    if (to.line && LINES[to.line].indexOf(t.group) < 0) return false;
    if (to.number != null && t.number !== to.number) return false;
    if (to.side) {
      const tw = FM.toTeamSpace(team.attackDir, t.x, t.y).w, cw = FM.toTeamSpace(team.attackDir, passer.x, passer.y).w;
      if (to.side === 'same' && !((tw - 0.5) * (cw - 0.5) >= 0 && Math.abs(tw - cw) < 0.3)) return false;
      if (to.side === 'opposite' && !((tw - 0.5) * (cw - 0.5) < 0 && Math.abs(tw - cw) > 0.25)) return false;
      if (['left', 'centre', 'right'].indexOf(to.side) >= 0 && sideOf(tw) !== to.side) return false;
      if (to.side === 'wide' && sideOf(tw) === 'centre') return false;
    }
    return true;
  };
  // One kind of effect, summed, for a player in a situation (used for closing down, tackling, runs, stepping up).
  FM.rulesDelta = function (team, p, type, ball, hasBall) {
    if (!team.rules || !team.rules.length) return 0;
    const eff = FM.rulesActive(team, p, FM.rulesCtx(team, ball, hasBall, false));
    let v = 0; eff.forEach((e) => { if (e.type === type) v += e.delta != null ? e.delta : e.on ? 1 : 0; });
    return clamp(v, -1, 1);
  };
  // Positions: how far further forward and wider a player stands because of his rules.
  FM.rulesShift = function (team, p, ball, hasBall) {
    if (!team.rules || !team.rules.length) return null;
    let df = 0, dw = 0;
    FM.rulesActive(team, p, FM.rulesCtx(team, ball, hasBall, false)).forEach((e) => { if (e.type === 'position' && (e.phase === 'both' || (e.phase === 'with') === !!hasBall)) { df += e.forward; dw += e.wide; } });
    return df || dw ? { d: df / L, w: dw / W } : null;
  };
  // Who he is told to follow (a defender), as the groups of attacker he may follow.
  FM.rulesMark = function (team, p, ball) {
    if (!team.rules || !team.rules.length) return null;
    const e = FM.rulesActive(team, p, FM.rulesCtx(team, ball, false, false)).filter((x) => x.type === 'mark')[0];
    return e ? e.target : null;
  };
  FM.rulesAttackerOf = (target, q) => (target.name ? q.name === target.name : target.number == null || q.number === target.number) && (!target.group || q.group === target.group) && (!target.line || LINES[target.line].indexOf(q.group) >= 0);

  // ---------- plain words ----------
  // The shirt numbers and names of both clubs (filled in by the pages that show rules), so a rule reads "Dubois (#18)" and not "player #18".
  FM.rulesRoster = FM.rulesRoster || { own: {}, opp: {} };
  const nameOf = (side, n) => { const nm = FM.rulesRoster[side] && FM.rulesRoster[side][n]; return nm ? nm + ' (#' + n + ')' : 'player #' + n; };
  const who = (s) => (!s || s.kind === 'team' ? 'The team' : s.kind === 'line' ? LINE_WORD[s.line].replace(/^the /, 'The ') : s.kind === 'group' ? 'The ' + GROUP_WORD[s.group] : nameOf('own', s.number).replace(/^player/, 'Player'));
  const whenText = (w) => {
    const bits = [];
    if (w.possession === 'with') bits.push('with the ball'); if (w.possession === 'without') bits.push('without the ball');
    if (w.zone) bits.push('when the ball is in ' + w.zone.map((z) => ({ own_third: 'our own third', middle_third: 'the middle third', final_third: 'their third' }[z])).join(' or '));
    if (w.stage) bits.push('in ' + w.stage.map((z) => ({ build: 'build-up', final: 'the final third', transAtt: 'the transition to attack', transDef: 'the transition to defence', press: 'the press on their build-up', without: 'defending' }[z])).join(' and '));
    if (w.pressed === 'pressed') bits.push('when pressed'); if (w.pressed === 'free') bits.push('when not pressed');
    if (w.side) bits.push('when the ball is ' + (w.side === 'wide' ? 'out wide' : 'on the ' + w.side));
    if (w.score) bits.push('when ' + w.score);
    if (w.minFrom != null || w.minTo != null) bits.push('from minute ' + (w.minFrom || 0) + (w.minTo != null ? ' to ' + w.minTo : ' on'));
    return bits.join(', ');
  };
  const recv = (t) => [t.number != null ? nameOf('own', t.number) : '', t.group ? GROUP_WORD[t.group] : '', t.line ? LINE_WORD[t.line] : '', t.side ? ({ same: 'on the same side', opposite: 'on the opposite side', left: 'on the left', right: 'on the right', centre: 'in the middle', wide: 'out wide' }[t.side]) : ''].filter(Boolean).join(' ');
  const strong = (x) => (Math.abs(x) >= 0.75 ? ' strongly' : Math.abs(x) >= 0.4 ? '' : ' slightly');
  FM.rulesEffectText = function (e) {
    switch (e.type) {
      case 'passLength': return (e.pref === 'short' ? 'prefer short passes' : 'prefer long passes') + strong(e.strength);
      case 'passTarget': return (e.weight > 0 ? 'look for passes to ' : 'avoid passes to ') + recv(e.to) + strong(e.weight);
      case 'passDirection': return (e.weight > 0 ? 'favour ' : 'avoid ') + ({ forward: 'forward', sideways: 'sideways', backward: 'backward' }[e.dir]) + ' passes' + strong(e.weight);
      case 'freeMan': return 'look for the unmarked player' + strong(e.weight);
      case 'risk': return e.delta > 0 ? 'try more ambitious passes' : 'play safer passes';
      case 'dribble': return e.delta > 0 ? 'dribble more' : 'dribble less';
      case 'shoot': return e.delta > 0 ? 'shoot more readily' : 'shoot less';
      case 'tempo': return e.delta > 0 ? 'play faster' : 'play slower';
      case 'runs': return e.delta > 0 ? 'run in behind more' : 'hold the line';
      case 'closeDown': return e.delta > 0 ? 'close the ball down more' : 'close the ball down less';
      case 'tackle': return e.delta > 0 ? 'tackle harder' : 'stay on their feet';
      case 'holdUp': return 'hold the ball up';
      case 'stepUp': return 'step up to follow a forward who drops';
      case 'position': return 'stand ' + [e.forward ? Math.abs(e.forward) + ' m ' + (e.forward > 0 ? 'further forward' : 'deeper') : '', e.wide ? Math.abs(e.wide) + ' m ' + (e.wide > 0 ? 'wider' : 'narrower') : ''].filter(Boolean).join(' and ') + (e.phase === 'with' ? ' with the ball' : e.phase === 'without' ? ' without the ball' : '');
      case 'mark': return e.target.number != null ? 'follow ' + (e.target.name ? e.target.name + ' (#' + e.target.number + ')' : nameOf('opp', e.target.number)) + ' closely, wherever he goes' : 'follow the nearest ' + (e.target.group ? GROUP_WORD[e.target.group].replace(/s$/, '') : e.target.line ? 'player in their ' + e.target.line : 'attacker') + ' closely';
      default: return e.type;
    }
  };
  FM.rulesText = function (r) { const w = whenText(r.when || {}), t = r.effects.map(FM.rulesEffectText).join(', and '); return t.charAt(0).toUpperCase() + t.slice(1) + (w ? ', ' + w : '') + '.'; };
  FM.rulesWho = (r) => who(r.scope);
  FM.RULES = { LINES, GROUPS, GROUP_WORD, LINE_WORD, lineOf, scopeMatches, who };

  // ---------- checking what comes from the builder or the backend ----------
  const num = (v, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? clamp(n, lo, hi) : null; };
  const r2 = (n) => Math.round(n * 100) / 100;
  FM.rulesClean = function (r, numbers) {
    if (!r || !Array.isArray(r.effects)) return null;
    const ok = [];
    r.effects.slice(0, 6).forEach((e) => {
      if (!e) return;
      const t = e.type;
      if (t === 'passLength' && (e.pref === 'short' || e.pref === 'long') && num(e.strength, 0, 1) != null) ok.push({ type: t, pref: e.pref, strength: r2(num(e.strength, 0, 1)) });
      else if (t === 'passTarget' && e.to && num(e.weight, -1, 1) != null) ok.push({ type: t, to: e.to, weight: r2(num(e.weight, -1, 1)) });
      else if (t === 'passDirection' && ['forward', 'sideways', 'backward'].indexOf(e.dir) >= 0 && num(e.weight, -1, 1) != null) ok.push({ type: t, dir: e.dir, weight: r2(num(e.weight, -1, 1)) });
      else if (t === 'freeMan' && num(e.weight, 0, 1) != null) ok.push({ type: t, weight: r2(num(e.weight, 0, 1)) });
      else if (['risk', 'dribble', 'shoot', 'tempo', 'runs', 'closeDown', 'tackle'].indexOf(t) >= 0 && num(e.delta, -1, 1) != null) ok.push({ type: t, delta: r2(num(e.delta, -1, 1)) });
      else if (t === 'holdUp' || t === 'stepUp') ok.push({ type: t, on: e.on !== false });
      else if (t === 'position') { const f = num(e.forward || 0, -15, 15), w = num(e.wide || 0, -12, 12); if (f != null && w != null && (f || w)) ok.push({ type: t, forward: r2(f), wide: r2(w), phase: ['with', 'without', 'both'].indexOf(e.phase) >= 0 ? e.phase : 'both' }); }
      else if (t === 'mark' && e.target && (e.target.group || e.target.line || e.target.number != null)) ok.push({ type: t, target: e.target.number != null ? { number: +e.target.number, name: String(e.target.name || '') } : e.target, tight: true });
    });
    if (!ok.length) return null;
    const s = r.scope || { kind: 'team' };
    const scope = s.kind === 'team' ? { kind: 'team' } : s.kind === 'line' && LINES[s.line] ? { kind: 'line', line: s.line } : s.kind === 'group' && GROUPS.indexOf(s.group) >= 0 ? { kind: 'group', group: s.group } : s.kind === 'player' && (!numbers || numbers.indexOf(+s.number) >= 0) ? { kind: 'player', number: +s.number } : null;
    if (!scope) return null;
    return { id: r.id || 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), text: String(r.text || '').slice(0, 300), scope, when: r.when || {}, effects: ok, off: !!r.off, source: r.source || 'builder' };
  };
})();
