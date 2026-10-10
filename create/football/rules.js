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
  const scopeMatches = (scope, p) => !scope || scope.kind === 'team' || (scope.kind === 'line' && LINES[scope.line] && LINES[scope.line].indexOf(p.group) >= 0) || (scope.kind === 'group' && scope.group === p.group) || (scope.kind === 'slot' && scope.slot === p.slotKey) || (scope.kind === 'player' && scope.number === p.number);
  const zoneOf = (d) => (d < 0.34 ? 'own_third' : d < 0.67 ? 'middle_third' : 'final_third');
  const sideOf = (w) => (w < 0.38 ? 'left' : w > 0.62 ? 'right' : 'centre');
  // The situation a rule is checked against. ball is in pitch metres; pressed is only known for the side with the ball.
  FM.rulesCtx = function (team, ball, hasBall, pressed) {
    const b = FM.toTeamSpace(team.attackDir, ball.x, ball.y), rc = team.ruleCtx || {}, pc = team.phaseCtx || {};
    // The stage of play uses the same boundaries and names as the preparation workflow.
    const stage = hasBall ? ((pc.transAtt || 0) > 0.35 ? 'transAtt' : b.d < 0.33 ? 'build' : b.d < 0.7 ? 'midfield' : 'final') : ((pc.transDef || 0) > 0.35 ? 'transDef' : (b.d > 0.6 && (team.tactics.pressBuildUp == null ? 0.4 : team.tactics.pressBuildUp) > 0.2) ? 'press' : 'without');
    // Each stage has a first diagram (its start) and a second (its end); the stage is in its first part while the ball is nearer where the first
    // diagram has it, and in its second part once it is nearer the second.
    const KEYS = { build: ['build', 'buildEnd'], midfield: ['buildEnd', 'midfield'], final: ['midfield', 'final'], without: ['without', 'withoutEnd'], press: ['without', 'withoutEnd'] };
    let part = null;
    if (stage === 'transAtt') part = (pc.taProg || 0) < 0.5 ? 'start' : 'end';
    else if (stage === 'transDef') part = (pc.tdProg || 0) < 0.5 ? 'start' : 'end';
    else if (KEYS[stage] && FM.phaseBall) { const a = FM.phaseBall(team, KEYS[stage][0]).d, e = FM.phaseBall(team, KEYS[stage][1]).d; part = Math.abs(b.d - a) <= Math.abs(b.d - e) ? 'start' : 'end'; }
    return { team, ball, hasBall: !!hasBall, zone: zoneOf(b.d), side: sideOf(b.w), pressed: !!pressed, stage, part, scoreDiff: rc.scoreDiff || 0, minute: rc.minute || 0 };
  };
  // ---------- expressions and conditions (see the backend's footballRules.ts for the form they arrive in) ----------
  // The things a rule can talk about, with their positions in metres in the evaluating team's own space: dm is the distance from its own goal line
  // towards the opposition's goal (0 to 105), wm the distance from its left touchline (0 to 68).
  FM.rulesEv = function (team, me, ball, hasBall) {
    const rc = team.ruleCtx || {};
    return { team, opp: team.oppRef || null, me, ball, hasBall: !!hasBall, carrier: rc.carrier || null, minute: rc.minute || 0, scoreDiff: rc.scoreDiff || 0, pressed: rc.pressed ? 1 : 0, receiver: null };
  };
  const posOf = (team, x, y) => { const s = FM.toTeamSpace(team.attackDir, x, y); return { dm: s.d * L, wm: s.w * W }; };
  const pl2 = (ev, p) => (p ? Object.assign({ p }, posOf(ev.team, p.x, p.y)) : null);
  const nameMatch = (p, e) => (e.name ? p.name === e.name : e.number == null || p.number === e.number);
  function entity(e, ev, depth) {
    if (!e || (depth || 0) > 2) return null;
    switch (e.e) {
      case 'me': return pl2(ev, ev.me);
      case 'ball': return ev.ball ? Object.assign({ p: null }, posOf(ev.team, ev.ball.x, ev.ball.y)) : null;
      case 'carrier': return pl2(ev, ev.carrier);
      case 'receiver': return pl2(ev, ev.receiver);
      case 'own_goal': return { p: null, dm: 0, wm: W / 2 };
      case 'their_goal': return { p: null, dm: L, wm: W / 2 };
      case 'centre': return { p: null, dm: L / 2, wm: W / 2 };
      case 'opp_last': { if (!ev.opp) return null; let best = null; ev.opp.players.forEach((q) => { if (q.group === 'GK') return; const o = pl2(ev, q); if (!best || o.dm > best.dm) best = o; }); return best; }
      case 'slot': { const team = e.side === 'opp' ? ev.opp : ev.team; if (!team) return null; return pl2(ev, team.players.find((q) => q.slotKey === e.slot)); }
      case 'group': case 'line': {
        const team = e.side === 'opp' ? ev.opp : ev.team; if (!team) return null;
        const mine = team.players.filter((q) => (e.e === 'group' ? q.group === e.group : LINES[e.line] && LINES[e.line].indexOf(q.group) >= 0));
        if (!mine.length) return null;
        const pts = mine.map((q) => pl2(ev, q)), f = (k) => (e.agg === 'min' ? Math.min.apply(null, pts.map((o) => o[k])) : e.agg === 'max' ? Math.max.apply(null, pts.map((o) => o[k])) : pts.reduce((a, o) => a + o[k], 0) / pts.length);
        return { p: mine.length === 1 ? mine[0] : null, dm: f('dm'), wm: f('wm') };
      }
      case 'player': { const team = e.side === 'opp' ? ev.opp : ev.team; if (!team) return null; return pl2(ev, team.players.find((q) => nameMatch(q, e))); }
      case 'nearest': {
        const team = e.side === 'own' ? ev.team : ev.opp; if (!team) return null;
        const to = e.to ? entity(e.to, ev, (depth || 0) + 1) : pl2(ev, ev.me); if (!to) return null;
        let best = null, bd = 1e9;
        team.players.forEach((q) => { if (q === (to.p || null) || (e.group && q.group !== e.group)) return; const o = pl2(ev, q), d = Math.hypot(o.dm - to.dm, o.wm - to.wm); if (d < bd) { bd = d; best = o; } });
        return best;
      }
      default: return null;
    }
  }
  const fin = (v) => (typeof v === 'number' && isFinite(v) ? v : null);
  function expr(x, ev) {
    if (typeof x === 'number') return fin(x);
    if (!x || typeof x !== 'object') return null;
    if (x.var) return x.var === 'minute' ? ev.minute : x.var === 'scoreDiff' ? ev.scoreDiff : x.var === 'pressed' ? ev.pressed : null;
    if (x.attr) {
      const a = entity(x.of, ev); if (!a) return null;
      if (x.attr === 'dm' || x.attr === 'wm') return fin(a[x.attr]);
      if (x.attr === 'dist') { const b = x.to ? entity(x.to, ev) : pl2(ev, ev.me); return b ? fin(Math.hypot(a.dm - b.dm, a.wm - b.wm)) : null; }
      if (x.attr === 'press') { if (!ev.opp) return null; let bd = 1e9; ev.opp.players.forEach((q) => { const o = posOf(ev.team, q.x, q.y), d = Math.hypot(o.dm - a.dm, o.wm - a.wm); if (d < bd) bd = d; }); return fin(bd); }
      return null;
    }
    const args = (x.args || []).map((y) => expr(y, ev));
    if (args.some((v) => v == null)) return null;
    switch (x.op) {
      case 'add': return fin(args[0] + args[1]); case 'sub': return fin(args[0] - args[1]); case 'mul': return fin(args[0] * args[1]);
      case 'div': return args[1] ? fin(args[0] / args[1]) : null;
      case 'min': return Math.min(args[0], args[1]); case 'max': return Math.max(args[0], args[1]); case 'abs': return Math.abs(args[0]);
      case 'clamp': return clamp(args[0], Math.min(args[1], args[2]), Math.max(args[1], args[2]));
      default: return null;
    }
  }
  function pred(x, ev) {
    if (!x || typeof x !== 'object') return false;
    if (x.op === 'and') return (x.args || []).every((y) => pred(y, ev));
    if (x.op === 'or') return (x.args || []).some((y) => pred(y, ev));
    if (x.op === 'not') return !pred((x.args || [])[0], ev);
    if (x.cmp) { const a = expr(x.a, ev), b = expr(x.b, ev); if (a == null || b == null) return false; return x.cmp === 'lt' ? a < b : x.cmp === 'gt' ? a > b : x.cmp === 'lte' ? a <= b : x.cmp === 'gte' ? a >= b : Math.abs(a - b) < 1e-6; }
    if (x.is === 'group') { const a = entity(x.of, ev); return !!(a && a.p && a.p.group === x.value); }
    if (x.is === 'slot') { const a = entity(x.of, ev); return !!(a && a.p && a.p.slotKey === x.value); }
    if (x.is === 'player') { const a = entity(x.of, ev); return !!(a && a.p && nameMatch(a.p, x)); }
    return false;
  }
  FM.rulesExpr = expr; FM.rulesPred = pred;

  const PAGE_END_OF_STAGE = { build: 'buildEnd', midfield: 'midfield', final: 'final', transAtt: 'transAttEnd', transDef: 'transDefEnd', without: 'withoutEnd', press: 'withoutEnd' };
  const PREV_END_OF_STAGE = { midfield: 'buildEnd', final: 'midfield' };
  const whenHolds = (when, c) => {
    if (!when) return true;
    if (when.possession === 'with' && !c.hasBall) return false;
    if (when.possession === 'without' && c.hasBall) return false;
    if (when.zone && when.zone.indexOf(c.zone) < 0) return false;
    if (when.stage && when.stage.indexOf(c.stage) < 0) return false;
    // An instruction written under a diagram applies in that part of the stage (the start or the end), and for a start that came from a version of
    // the stage before, only while that version is the one in use.
    if (when.part && c.part && when.part !== c.part) return false;
    if (when.from) {
      const pk = PREV_END_OF_STAGE[c.stage], now = (c.team && c.team.pageNow && pk && c.team.pageNow[pk]) || null;
      if (when.from === 'default' ? now !== null : now !== when.from) return false;
    }
    // An instruction written for one tactics page applies only while that page is the one in use ('default' is the page that is not an added one).
    if (when.page) {
      const k = PAGE_END_OF_STAGE[c.stage], cur = (c.team && c.team.pageNow && k && c.team.pageNow[k]) || null;
      if (when.page === 'default' ? cur !== null : cur !== when.page) return false;
    }
    if (when.pressed === 'pressed' && !c.pressed) return false;
    if (when.pressed === 'free' && c.pressed) return false;
    if (when.side === 'wide' ? c.side === 'centre' : when.side && when.side !== c.side) return false;
    if (when.score === 'winning' && c.scoreDiff <= 0) return false;
    if (when.score === 'losing' && c.scoreDiff >= 0) return false;
    if (when.score === 'drawing' && c.scoreDiff !== 0) return false;
    if (when.minFrom != null && c.minute < when.minFrom) return false;
    if (when.minTo != null && c.minute > when.minTo) return false;
    if (when.expr && !pred(when.expr, FM.rulesEv(c.team, c.me, c.ball, c.hasBall))) return false;
    return true;
  };
  // Every effect, from every rule that is for this player and holds now.
  FM.rulesActive = function (team, p, c) {
    const out = [];
    c.me = p;
    const oppId = team.oppRef ? String(team.oppRef.id || '') : '';   // an instruction for one game applies only against that opponent
    (team.rules || []).forEach((r) => { if (r.off || (r.game && r.game.vs && oppId && r.game.vs !== oppId) || !scopeMatches(r.scope, p) || !whenHolds(r.when, c)) return; r.effects.forEach((e) => out.push(e)); });
    return out;
  };
  // A passer's rules folded into the numbers the decision uses.
  FM.rulesFold = function (effects) {
    const f = { short: 0, long: 0, passTo: [], passScore: [], dir: { forward: 0, sideways: 0, backward: 0 }, freeMan: 0, risk: 0, dribble: 0, shoot: 0, holdUp: false, tempo: 0 };
    effects.forEach((e) => {
      if (e.type === 'passLength') f[e.pref] = clamp(f[e.pref] + e.strength, 0, 1);
      else if (e.type === 'passTarget') f.passTo.push({ to: e.to, w: e.weight });
      else if (e.type === 'passScore') f.passScore.push({ where: e.where, w: e.weight });
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
    if (to.slot && t.slotKey !== to.slot) return false;
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
  // 'place' effects: where an expression says he should stand. Returns metres for each axis it controls, with how strongly he is pulled there.
  FM.rulesPlace = function (team, p, ball, hasBall) {
    if (!team.rules || !team.rules.length) return null;
    const eff = FM.rulesActive(team, p, FM.rulesCtx(team, ball, hasBall, false)).filter((e) => e.type === 'place' && (e.phase === 'both' || (e.phase === 'with') === !!hasBall));
    if (!eff.length) return null;
    const ev = FM.rulesEv(team, p, ball, hasBall), out = [];
    eff.forEach((e) => { const dm = e.dm != null ? expr(e.dm, ev) : null, wm = e.wm != null ? expr(e.wm, ev) : null; if (dm != null || wm != null) out.push({ dm, wm, k: e.weight }); });
    return out.length ? out : null;
  };
  // 'attract' effects: the opposition players this player is meant to draw, with how strongly.
  FM.rulesAttract = function (team, p, ball) {
    if (!team.rules || !team.rules.length) return [];
    return FM.rulesActive(team, p, FM.rulesCtx(team, ball, true, false)).filter((e) => e.type === 'attract');
  };
  // Who he is told to follow (a defender), as the groups of attacker he may follow.
  FM.rulesMark = function (team, p, ball) {
    if (!team.rules || !team.rules.length) return null;
    const e = FM.rulesActive(team, p, FM.rulesCtx(team, ball, false, false)).filter((x) => x.type === 'mark')[0];
    return e ? e.target : null;
  };
  FM.rulesAttackerOf = (target, q) => (target.name ? q.name === target.name : target.number == null || q.number === target.number) && (!target.slot || q.slotKey === target.slot) && (!target.group || q.group === target.group) && (!target.line || LINES[target.line].indexOf(q.group) >= 0);

  // ---------- plain words ----------
  // The shirt numbers and names of both clubs (filled in by the pages that show rules), so a rule reads "Dubois (#18)" and not "player #18".
  FM.rulesRoster = FM.rulesRoster || { own: {}, opp: {} };
  const nameOf = (side, n) => { const nm = FM.rulesRoster[side] && FM.rulesRoster[side][n]; return nm ? nm + ' (#' + n + ')' : 'player #' + n; };
  const SLOT_WORD = { LB: 'left back', RB: 'right back', LCB: 'left centre-back', RCB: 'right centre-back', CCB: 'central centre-back', LWB: 'left wing-back', RWB: 'right wing-back', DM: 'defensive midfielder', LDM: 'left defensive midfielder', RDM: 'right defensive midfielder', CM: 'central midfielder', LCM: 'left central midfielder', RCM: 'right central midfielder', CAM: 'attacking midfielder', LAM: 'left attacking midfielder', RAM: 'right attacking midfielder', LM: 'left midfielder', RM: 'right midfielder', LW: 'left winger', RW: 'right winger', ST: 'striker', LST: 'left striker', RST: 'right striker', GK: 'goalkeeper' };
  const who = (s) => (!s || s.kind === 'team' ? 'The team' : s.kind === 'slot' ? 'The ' + (SLOT_WORD[s.slot] || s.slot) : s.kind === 'line' ? LINE_WORD[s.line].replace(/^the /, 'The ') : s.kind === 'group' ? 'The ' + GROUP_WORD[s.group] : nameOf('own', s.number).replace(/^player/, 'Player'));
  const whenText = (w) => {
    const bits = [];
    if (w.possession === 'with') bits.push('with the ball'); if (w.possession === 'without') bits.push('without the ball');
    if (w.zone) bits.push('when the ball is in ' + w.zone.map((z) => ({ own_third: 'our own third', middle_third: 'the middle third', final_third: 'their third' }[z])).join(' or '));
    if (w.stage) bits.push('in ' + w.stage.map((z) => ({ build: 'build-up', midfield: 'midfield progression', final: 'the final third', transAtt: 'the transition to attack', transDef: 'the transition to defence', press: 'the press on their build-up', without: 'organised defending' }[z])).join(' and '));
    if (w.pressed === 'pressed') bits.push('when pressed'); if (w.pressed === 'free') bits.push('when not pressed');
    if (w.side) bits.push('when the ball is ' + (w.side === 'wide' ? 'out wide' : 'on the ' + w.side));
    if (w.score) bits.push('when ' + w.score);
    if (w.minFrom != null || w.minTo != null) bits.push('from minute ' + (w.minFrom || 0) + (w.minTo != null ? ' to ' + w.minTo : ' on'));
    return bits.join(', ');
  };
  const recv = (t) => [t.number != null ? nameOf('own', t.number) : '', t.slot ? 'the ' + (SLOT_WORD[t.slot] || t.slot) : '', t.group ? GROUP_WORD[t.group] : '', t.line ? LINE_WORD[t.line] : '', t.side ? ({ same: 'on the same side', opposite: 'on the opposite side', left: 'on the left', right: 'on the right', centre: 'in the middle', wide: 'out wide' }[t.side]) : ''].filter(Boolean).join(' ');
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
      case 'place': return 'stand where the manager has set (' + placeText(e) + ')';
      case 'passScore': return (e.weight > 0 ? 'favour' : 'avoid') + ' passes to players who meet a condition set by the manager' + strong(e.weight);
      case 'attract': return 'draw ' + (e.target.name ? e.target.name + ' (#' + e.target.number + ')' : 'player #' + e.target.number) + ' towards him';
      default: return e.type;
    }
  };
  // A simple description of a placement: level with someone, behind someone, between limits.
  const entText = (e) => (!e ? 'a point' : e.e === 'player' ? (e.name || '#' + e.number) : e.e === 'me' ? 'his own position' : e.e === 'ball' ? 'the ball' : e.e === 'carrier' ? 'the ball carrier' : e.e === 'own_goal' ? 'our goal' : e.e === 'their_goal' ? 'their goal' : e.e === 'centre' ? 'the centre of the pitch' : e.e === 'opp_last' ? 'their last defender' : e.e === 'nearest' ? 'the nearest ' + (e.side === 'own' ? 'team-mate' : 'opponent') : 'a player');
  function placeText(e) {
    const bits = [];
    const one = (x, axis) => {
      if (!x) return;
      if (x.attr === axis && x.of) bits.push((axis === 'dm' ? 'as far up the pitch as ' : 'as far across as ') + entText(x.of));
      else if (x.op === 'clamp' && x.args[0].attr === axis && x.args[0].of && x.args[0].of.e === 'me') bits.push((axis === 'wm' ? 'between ' + x.args[1] + ' and ' + x.args[2] + ' m from our left touchline' : 'between ' + x.args[1] + ' and ' + x.args[2] + ' m from our goal line'));
      else if (x.op && (x.op === 'add' || x.op === 'sub') && x.args[0].attr === axis && typeof x.args[1] === 'number') bits.push(Math.abs(x.args[1]) + ' m ' + ((x.op === 'add') === (axis === 'dm') ? 'ahead of ' : 'behind ') + entText(x.args[0].of));
      else bits.push(axis === 'dm' ? 'at a depth set by a formula' : 'at a width set by a formula');
    };
    one(e.dm, 'dm'); one(e.wm, 'wm');
    return bits.join(', ') + (e.phase === 'with' ? ', with the ball' : e.phase === 'without' ? ', without it' : '');
  }
  const complex = (r) => r.effects.some((e) => e.type === 'place' || e.type === 'passScore' || e.type === 'attract') || (r.when && r.when.expr);
  FM.rulesText = function (r) {
    if (r.source === 'ai' && r.text && complex(r)) return r.text.replace(/\.?$/, '.');
    const w = whenText(r.when || {}), t = r.effects.map(FM.rulesEffectText).join(', and '); return t.charAt(0).toUpperCase() + t.slice(1) + (w ? ', ' + w : '') + '.';
  };
  FM.rulesWho = (r) => who(r.scope);
  FM.RULES = { LINES, GROUPS, GROUP_WORD, LINE_WORD, lineOf, scopeMatches, who };

  // ---------- checking what comes from the builder or the backend ----------
  const num = (v, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? clamp(n, lo, hi) : null; };
  const r2 = (n) => Math.round(n * 100) / 100;
  const sizeOf = (x, d) => (x && typeof x === 'object' ? 1 + Object.keys(x).reduce((n, k) => n + (k === 'name' || k === 'value' ? 0 : sizeOf(x[k], (d || 0) + 1)), 0) : 0) + ((d || 0) > 8 ? 999 : 0);
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
      else if (t === 'place' && (e.dm != null || e.wm != null) && sizeOf(e) < 120) ok.push({ type: t, dm: e.dm, wm: e.wm, weight: r2(num(e.weight == null ? 0.85 : e.weight, 0.1, 1)), phase: ['with', 'without', 'both'].indexOf(e.phase) >= 0 ? e.phase : 'both' });
      else if (t === 'passScore' && e.where && num(e.weight, -1, 1) != null && sizeOf(e) < 120) ok.push({ type: t, where: e.where, weight: r2(num(e.weight, -1, 1)) });
      else if (t === 'attract' && e.target && (e.target.number != null || e.target.name)) ok.push({ type: t, target: { number: +e.target.number, name: String(e.target.name || '') }, strength: r2(num(e.strength == null ? 0.7 : e.strength, 0.1, 1)) });
      else if (t === 'mark' && e.target && (e.target.group || e.target.line || e.target.number != null)) ok.push({ type: t, target: e.target.number != null ? { number: +e.target.number, name: String(e.target.name || '') } : e.target, tight: true });
    });
    if (!ok.length) return null;
    const s = r.scope || { kind: 'team' };
    const scope = s.kind === 'team' ? { kind: 'team' } : s.kind === 'slot' && s.slot ? { kind: 'slot', slot: String(s.slot) } : s.kind === 'line' && LINES[s.line] ? { kind: 'line', line: s.line } : s.kind === 'group' && GROUPS.indexOf(s.group) >= 0 ? { kind: 'group', group: s.group } : s.kind === 'player' && (!numbers || numbers.indexOf(+s.number) >= 0) ? { kind: 'player', number: +s.number } : null;
    if (!scope) return null;
    return { id: r.id || 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), text: String(r.text || '').slice(0, 300), scope, when: r.when || {}, effects: ok, off: !!r.off, source: r.source || 'builder', ...(r.game ? { game: { vs: String(r.game.vs || '').slice(0, 60), name: String(r.game.name || '').slice(0, 60) } } : {}) };
  };
})();
