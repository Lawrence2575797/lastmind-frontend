// The tactical plan. A team's tactics are described in football terms and nothing is dragged about:
//   shape + roles       who plays where and what each player is for (formations.js, roles.js, roles_plus.js)
//   team toggles        for each of seven phases, a few plain choices (how we build, how high we defend, how we press...)
//   player toggles      for each player and each phase, a few more choices (a full-back tucks inside in the build-up and overlaps in the final third...)
//   zones and triggers  areas of the pitch that are tagged ("press here", "play safe here"), and "if this happens, they do that" rules
// All of it is a choice from a short list. This file turns the choices into what the match engine already runs: the instruction rules of rules.js (what a
// player prefers to do, when) and an offset on each player's board position for each phase (where he stands, so the engine's own leash and shape logic hold).
// Nothing here is interpreted while a match plays, so a match or a test can always be replayed exactly.
(function () {
  const FM = (window.FM = window.FM || {});
  const L = 105, W = 68, clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // ---------- the seven phases ----------
  // key: the plan's; stage: what the rules engine calls it (rules.js rulesCtx); eng: the board positions it moves (engine.js)
  FM.PLAN_PHASES = [
    { key: 'build', stage: 'build', eng: ['build'], name: 'Build-up', blurb: 'The ball is near our own goal and we are trying to get out of our half.' },
    { key: 'midfield', stage: 'midfield', eng: ['midfield'], name: 'Through midfield', blurb: 'We have the ball in the middle of the pitch and are looking for a way through.' },
    { key: 'final', stage: 'final', eng: ['final'], name: 'Final third', blurb: 'We are attacking their box: creating and finishing chances.' },
    { key: 'transDef', stage: 'transDef', eng: ['transDef'], name: 'Losing the ball', blurb: 'The moment we lose it, and the seconds that follow.' },
    { key: 'defence', stage: 'without', eng: ['without', 'withoutEnd'], name: 'Organised defence', blurb: 'They have the ball and we are set up to defend.' },
    { key: 'press', stage: 'press', eng: ['press'], name: 'Pressing their build-up', blurb: 'They are building from the back and we decide whether to go and get it.' },
    { key: 'transAtt', stage: 'transAtt', eng: ['transAtt'], name: 'Winning the ball', blurb: 'The moment we win it, and the seconds that follow.' },
  ];
  const PHASE = {}; FM.PLAN_PHASES.forEach((p) => { PHASE[p.key] = p; });
  FM.planPhase = (k) => PHASE[k];

  // ---------- scopes: who a toggle talks about ----------
  const LINE_OF = { CB: 'defence', FB: 'defence', DM: 'midfield', CM: 'midfield', AM: 'midfield', WF: 'attack', ST: 'attack', GK: 'goalkeeper' };
  const SCOPES = { team: null, def: ['CB', 'FB'], mid: ['DM', 'CM', 'AM'], att: ['WF', 'ST'], out: ['CB', 'FB', 'DM', 'CM', 'AM', 'WF', 'ST'] };
  const GROUPS = ['GK', 'CB', 'FB', 'DM', 'CM', 'AM', 'WF', 'ST'];
  const scopeRule = (s) => (String(s).indexOf('slot:') === 0 ? { kind: 'slot', slot: String(s).slice(5) } : s === 'team' ? { kind: 'team' } : s === 'def' ? { kind: 'line', line: 'defence' } : s === 'mid' ? { kind: 'line', line: 'midfield' } : s === 'att' ? { kind: 'line', line: 'attack' } : s === 'out' ? { kind: 'team' } : GROUPS.indexOf(s) >= 0 ? { kind: 'group', group: s } : { kind: 'slot', slot: s });
  const inScope = (s, p) => (s === 'team' || s === 'out' ? p.group !== 'GK' || s === 'team' : SCOPES[s] ? SCOPES[s].indexOf(p.group) >= 0 : p.group === s || p.slotKey === s);
  // option helpers
  const E = {
    len: (pref, strength) => ({ type: 'passLength', pref, strength }), dir: (d, weight) => ({ type: 'passDirection', dir: d, weight }), to: (t, weight) => ({ type: 'passTarget', to: t, weight }),
    risk: (d) => ({ type: 'risk', delta: d }), drib: (d) => ({ type: 'dribble', delta: d }), shoot: (d) => ({ type: 'shoot', delta: d }), tempo: (d) => ({ type: 'tempo', delta: d }),
    runs: (d) => ({ type: 'runs', delta: d }), close: (d) => ({ type: 'closeDown', delta: d }), tackle: (d) => ({ type: 'tackle', delta: d }), hold: () => ({ type: 'holdUp', on: true }),
    step: () => ({ type: 'stepUp', on: true }), free: (w) => ({ type: 'freeMan', weight: w }), mark: (target) => ({ type: 'mark', target }),
  };
  const o = (v, label, fx) => Object.assign({ v, label }, fx || {});
  const STD = (label) => o('std', label || 'As the role');

  // ---------- team toggles, by phase ----------
  // r: [[scope, [effects], whenExtra]] are rules; pos: [[scope, forward metres, wider metres (mirrored by side), absolute?]] move where players stand; tac: team numbers.
  const T = (key, label, help, opts) => ({ key, label, help, opts });
  FM.PLAN_TEAM = {
    build: [
      T('style', 'How we play out', 'Short passes keep the ball but are slower; direct passes get it forward quickly and lose it more.', [
        o('short', 'Short and patient', { r: [['team', [E.len('short', 0.8)]]] }), STD('Mixed'), o('direct', 'Direct', { r: [['team', [E.len('long', 0.7), E.dir('forward', 0.4)]]] })]),
      T('route', 'Where we build', 'Through the flanks stretches them; through the middle is shorter but more crowded.', [
        o('flanks', 'Through the flanks', { r: [['team', [E.to({ side: 'wide' }, 0.5)]]] }), STD('Balanced'), o('centre', 'Through the middle', { r: [['team', [E.to({ side: 'centre' }, 0.5)]]] })]),
      T('shape', 'Build-up shape', 'How the back players arrange themselves to start the move.', [
        STD('Back four'), o('three', 'Back three (the holding midfielder drops in)', { pos: [['DM', -9, 0], ['CB', 0, 5], ['FB', 7, 0]] }), o('box', 'Box (full-backs tuck inside)', { pos: [['FB', 5, -9]] }), o('wide', 'Wide centre-backs', { pos: [['CB', 0, 7], ['GK', 3, 0]] })]),
      T('keeper', 'Goalkeeper', 'A keeper who plays short is another passer; one who kicks long saves a risk and gives the ball away.', [
        o('short', 'Plays short', { r: [['GK', [E.len('short', 1)]]] }), STD('Either'), o('long', 'Kicks it long', { r: [['GK', [E.len('long', 1)]]] })]),
      T('tempo', 'Tempo', 'How quickly the ball is moved on.', [o('slow', 'Slow it down', { r: [['team', [E.tempo(-0.6)]]] }), STD('Normal'), o('fast', 'Quick', { r: [['team', [E.tempo(0.6)]]] })]),
      T('fullbacks', 'Full-backs', '', [o('hold', 'Stay back', { pos: [['FB', -6, 0]] }), STD('Balanced'), o('push', 'Push on high', { pos: [['FB', 8, 2]] })]),
      T('pressed', 'When they press us', 'What we do when the other side come to close us down.', [
        o('through', 'Play through the press', { r: [['team', [E.risk(0.3), E.dir('forward', 0.3)], { pressed: 'pressed' }]] }), STD('Whatever is on'),
        o('long', 'Go long over it', { r: [['team', [E.len('long', 0.8), E.dir('forward', 0.5)], { pressed: 'pressed' }]] }), o('safe', 'Go back and keep it', { r: [['team', [E.dir('backward', 0.6), E.risk(-0.4)], { pressed: 'pressed' }]] })]),
    ],
    midfield: [
      T('patience', 'Patience', 'How long we are willing to keep the ball in midfield before going forward.', [
        o('patient', 'Patient', { r: [['team', [E.tempo(-0.5), E.risk(-0.2), E.len('short', 0.4)]]] }), STD('Balanced'), o('direct', 'Direct', { r: [['team', [E.tempo(0.5), E.dir('forward', 0.5), E.risk(0.2)]]] })]),
      T('overload', 'Overload a side', 'Bring midfielders over to one flank to outnumber them there.', [
        STD('No overload'), o('left', 'Overload the left', { r: [['team', [E.to({ side: 'left' }, 0.5)]]], pos: [['mid', 0, -5, true], ['FB', 3, 0]] }), o('right', 'Overload the right', { r: [['team', [E.to({ side: 'right' }, 0.5)]]], pos: [['mid', 0, 5, true], ['FB', 3, 0]] })]),
      T('switch', 'Switching play', 'Moving the ball to the far side to stretch them.', [o('often', 'Switch often', { r: [['team', [E.to({ side: 'opposite' }, 0.5)]]] }), STD('Sometimes'), o('rarely', 'Stay on one side', { r: [['team', [E.to({ side: 'opposite' }, -0.4)]]] })]),
      T('through', 'Passes between the lines', '', [o('safe', 'Safe ones only', { r: [['team', [E.risk(-0.4)]]] }), STD('Mixed'), o('ambitious', 'Ambitious', { r: [['team', [E.risk(0.4), E.free(0.4)]]] })]),
      T('width', 'Width of the midfield', '', [o('narrow', 'Narrow', { pos: [['mid', 0, -4], ['WF', 0, -3]] }), STD('Normal'), o('wide', 'Wide', { pos: [['mid', 0, 4], ['WF', 0, 3]] })]),
    ],
    final: [
      T('approach', 'How we create', 'Crossing needs people in the box; through-balls need runners and space.', [
        o('cross', 'Get it wide and cross', { r: [['team', [E.to({ side: 'wide' }, 0.6)]]], pos: [['WF', 0, 3], ['FB', 5, 2]] }), STD('Mixed'), o('through', 'Through the middle', { r: [['team', [E.to({ side: 'centre' }, 0.5), E.free(0.4)]]], pos: [['WF', 0, -3]] })]),
      T('shooting', 'Shooting', '', [o('patient', 'Work a better chance', { r: [['team', [E.shoot(-0.5)]]] }), STD('Normal'), o('sight', 'Shoot on sight', { r: [['team', [E.shoot(0.6)]]] })]),
      T('box', 'Bodies in the box', 'More players in the box means more chances, and fewer players covering a counter.', [
        o('few', 'Few', { r: [['mid', [E.runs(-0.5)]]], pos: [['mid', -3, 0]] }), STD('Normal'), o('many', 'Many', { r: [['mid', [E.runs(0.6)]], ['WF', [E.runs(0.4)]]], pos: [['mid', 5, 0]] })]),
      T('rest', 'Rest defence', 'Who stays back to stop the counter when we attack.', [
        o('more', 'More stay back', { pos: [['FB', -6, 0], ['DM', -4, 0]] }), STD('Normal'), o('less', 'Fewer stay back', { pos: [['FB', 6, 0], ['DM', 3, 0]] })]),
      T('dribbling', 'Taking players on', '', [o('less', 'Move it quickly', { r: [['att', [E.drib(-0.5)]], ['AM', [E.drib(-0.5)]]] }), STD('Normal'), o('more', 'Take them on', { r: [['att', [E.drib(0.5)]], ['AM', [E.drib(0.5)]]] })]),
    ],
    transDef: [
      T('react', 'The moment we lose it', 'Winning it straight back is dangerous when it works and costly when it does not.', [
        o('counterpress', 'Counter-press at once', { r: [['team', [E.close(0.8), E.tackle(0.3)]]] }), STD('Mixed'), o('regroup', 'Drop and regroup', { r: [['team', [E.close(-0.7)]]], pos: [['out', -4, 0]] })]),
      T('recover', 'Forwards getting back', '', [STD('Normal'), o('track', 'Track back quickly', { pos: [['AM', -6, 0], ['WF', -7, 0], ['ST', -5, 0]] })]),
      T('foul', 'Stopping a break', '', [STD('Never foul'), o('foul', 'Foul to stop it if needed', { r: [['DM', [E.tackle(0.7)]], ['CM', [E.tackle(0.5)]]] })]),
    ],
    defence: [
      T('block', 'How high we defend', 'A high line squeezes the game but leaves space behind; a low block is safe and invites pressure.', [
        o('low', 'Low block', { pos: [['out', -8, 0], ['CB', -2, 0]], tac: { block: 'low', pressing: 0.25, pressBuildUp: 0.1 } }), STD('Mid block'), o('high', 'High line', { pos: [['out', 6, 0], ['CB', 2, 0]], tac: { block: 'high', pressing: 0.55 } })]),
      T('compact', 'Compactness', 'Narrow is harder to play through; wide covers the flanks.', [o('tight', 'Narrow and tight', { pos: [['CM', 0, -3], ['AM', 0, -4], ['WF', 0, -4], ['FB', 0, -3]] }), STD('Normal'), o('wide', 'Wide', { pos: [['CM', 0, 3], ['AM', 0, 3], ['WF', 0, 4], ['FB', 0, 2]] })]),
      T('marking', 'Marking', 'Zonal holds an area; man-marking follows the nearest attacker.', [
        STD('Zonal'), o('man', 'Man-marking', { r: [['CB', [E.mark({ group: 'ST' })]], ['FB', [E.mark({ group: 'WF' })]], ['DM', [E.mark({ group: 'AM' })]]] }), o('mixed', 'Mixed (defenders man-mark)', { r: [['CB', [E.mark({ group: 'ST' })]]] })]),
      T('trap', 'Offside trap', '', [STD('Off'), o('on', 'Step up together', { r: [['CB', [E.step()]]], pos: [['CB', 3, 0]] })]),
      T('tackle', 'Tackling', '', [o('stay', 'Stay on feet', { r: [['team', [E.tackle(-0.5)]]] }), STD('Normal'), o('hard', 'Tackle hard', { r: [['team', [E.tackle(0.5)]]] })]),
    ],
    press: [
      T('intensity', 'Intensity', 'A hard press wins it high up but tires the team and leaves space.', [
        o('low', 'Light', { tac: { pressing: 0.25, pressBuildUp: 0.1 } }), o('std', 'Medium', { tac: { pressing: 0.5, pressBuildUp: 0.4 } }), o('high', 'Heavy', { tac: { pressing: 0.85, pressBuildUp: 0.85 } })]),
      T('start', 'Where we start the press', '', [
        o('keeper', 'On their goalkeeper', { tac: { pressBuildUp: 0.9 }, pos: [['ST', 4, 0]] }), o('std', 'On their centre-backs', {}), o('half', 'From halfway', { tac: { pressBuildUp: 0.3 }, pos: [['ST', -6, 0], ['out', -3, 0]] })]),
      T('who', 'Who joins in', '', [
        o('front', 'Forwards only', { r: [['mid', [E.close(-0.5)]], ['def', [E.close(-0.5)]], ['att', [E.close(0.5)]]] }), o('std', 'Forwards and midfield', { r: [['def', [E.close(-0.3)]], ['att', [E.close(0.3)]], ['mid', [E.close(0.3)]]] }), o('all', 'Everyone', { r: [['team', [E.close(0.6)]]] })]),
      T('mode', 'When we press', 'Always, or only when one of your triggers on the pitch fires.', [o('always', 'Always', {}), o('triggers', 'Only on my triggers', { r: [['team', [E.close(-0.8)]]] })]),
    ],
    transAtt: [
      T('react', 'The moment we win it', '', [
        o('counter', 'Counter at once', { r: [['team', [E.dir('forward', 0.7), E.runs(0.8), E.tempo(0.6), E.risk(0.3)]]] }), STD('Mixed'), o('secure', 'Secure it first', { r: [['team', [E.tempo(-0.5), E.len('short', 0.6), E.dir('sideways', 0.4)]]] })]),
      T('outlet', 'First pass to', '', [STD('Whoever is free'), o('wing', 'A winger', { r: [['team', [E.to({ group: 'WF' }, 0.7)]]] }), o('striker', 'The striker', { r: [['team', [E.to({ group: 'ST' }, 0.7)]]] }), o('mid', 'A midfielder', { r: [['team', [E.to({ line: 'midfield' }, 0.6)]]] })]),
      T('support', 'Support for the runner', '', [o('few', 'Few join', { pos: [['CM', -3, 0]] }), STD('Normal'), o('many', 'Many join', { r: [['mid', [E.runs(0.5)]]], pos: [['CM', 5, 0], ['AM', 5, 0]] })]),
    ],
  };

  // ---------- player toggles, by phase ----------
  // A toggle belongs to a player in a phase; `groups` says which kinds of player are offered it. The same shape as the team toggles, with the scope the player's own slot.
  const G = (groups, key, label, help, opts) => ({ groups, key, label, help, opts });
  const ALL = ['CB', 'FB', 'DM', 'CM', 'AM', 'WF', 'ST'];
  FM.PLAN_PLAYER = {
    build: [
      G(['CB'], 'move', 'Movement', '', [o('out', 'Step out with the ball', { pos: [[0, 4, 0]], r: [[0, [E.risk(0.3)]]] }), STD(), o('deep', 'Stay deep', { pos: [[0, -3, 0]] })]),
      G(['FB'], 'move', 'Movement', '', [o('wide', 'Hold the width', { pos: [[0, 0, 4]] }), STD(), o('inside', 'Tuck in as a midfielder', { pos: [[0, 6, -9]] }), o('high', 'Push on high', { pos: [[0, 10, 2]] }), o('deep', 'Stay deep', { pos: [[0, -4, 0]] })]),
      G(['DM'], 'move', 'Movement', '', [o('drop', 'Drop between the centre-backs', { pos: [[0, -9, 0]] }), STD(), o('short', 'Come short to the ball', { pos: [[0, -4, 0]] }), o('high', 'Stay higher', { pos: [[0, 5, 0]] })]),
      G(['CM'], 'move', 'Movement', '', [o('drop', 'Drop to receive', { pos: [[0, -6, 0]] }), STD(), o('high', 'Stay high', { pos: [[0, 5, 0]] }), o('wide', 'Move wide', { pos: [[0, 0, 7]] })]),
      G(['AM'], 'move', 'Movement', '', [o('drop', 'Drop into midfield', { pos: [[0, -9, 0]] }), STD(), o('wide', 'Drift wide', { pos: [[0, 0, 8]] })]),
      G(['WF'], 'move', 'Movement', '', [o('feet', 'Drop to feet', { pos: [[0, -9, 0]] }), STD(), o('wide', 'Stay wide', { pos: [[0, 0, 5]] }), o('inside', 'Come inside', { pos: [[0, 0, -8]] })]),
      G(['ST'], 'move', 'Movement', '', [o('drop', 'Drop deep to link', { pos: [[0, -10, 0]], r: [[0, [E.hold()]]] }), STD(), o('shoulder', 'Stay on the last defender', { pos: [[0, 2, 0]] })]),
      G(ALL, 'pass', 'Passing', '', [o('short', 'Short and simple', { r: [[0, [E.len('short', 0.8)]]] }), STD(), o('direct', 'Forward early', { r: [[0, [E.len('long', 0.6), E.dir('forward', 0.5)]]] })]),
      G(ALL, 'risk', 'Risk', '', [o('safe', 'Play it safe', { r: [[0, [E.risk(-0.6)]]] }), STD(), o('bold', 'Try the ambitious pass', { r: [[0, [E.risk(0.6)]]] })]),
    ],
    midfield: [
      G(['CB'], 'move', 'Movement', '', [o('hold', 'Hold the line', { pos: [[0, -2, 0]] }), STD(), o('step', 'Step into midfield', { pos: [[0, 5, 0]] })]),
      G(['FB'], 'move', 'Movement', '', [o('high', 'Get forward', { pos: [[0, 8, 2]] }), STD(), o('hold', 'Stay level with the midfield', { pos: [[0, -3, 0]] }), o('inside', 'Come inside', { pos: [[0, 4, -8]] })]),
      G(['DM'], 'move', 'Movement', '', [o('screen', 'Screen the back line', { pos: [[0, -4, 0]] }), STD(), o('arrive', 'Arrive in the second wave', { pos: [[0, 7, 0]], r: [[0, [E.runs(0.6)]]] })]),
      G(['CM'], 'move', 'Movement', '', [o('runs', 'Make late runs', { pos: [[0, 6, 0]], r: [[0, [E.runs(1)]]] }), STD(), o('hold', 'Hold position', { pos: [[0, -2, 0]] }), o('wide', 'Support the wide player', { pos: [[0, 0, 7]] })]),
      G(['AM'], 'move', 'Movement', '', [o('between', 'Find space between the lines', { pos: [[0, 2, 0]], r: [[0, [E.free(0.5)]]] }), STD(), o('wide', 'Drift wide', { pos: [[0, 0, 8]] }), o('forward', 'Join the striker', { pos: [[0, 8, 0]] })]),
      G(['WF'], 'move', 'Movement', '', [o('wide', 'Hold the width', { pos: [[0, 0, 5]] }), STD(), o('inside', 'Come inside', { pos: [[0, 0, -8]] }), o('behind', 'Run in behind', { pos: [[0, 6, 0]], r: [[0, [E.runs(1)]]] })]),
      G(['ST'], 'move', 'Movement', '', [o('drop', 'Come short', { pos: [[0, -8, 0]], r: [[0, [E.hold()]]] }), STD(), o('behind', 'Run in behind', { pos: [[0, 5, 0]], r: [[0, [E.runs(1)]]] })]),
      G(ALL, 'pass', 'Passing', '', [o('simple', 'Keep it simple', { r: [[0, [E.len('short', 0.7), E.risk(-0.3)]]] }), STD(), o('forward', 'Forward early', { r: [[0, [E.dir('forward', 0.6)]]] }), o('switch', 'Switch play', { r: [[0, [E.to({ side: 'opposite' }, 0.6)]]] })]),
      G(['CM', 'AM', 'WF', 'ST'], 'take', 'Taking players on', '', [o('less', 'Move it on quickly', { r: [[0, [E.drib(-0.6)]]] }), STD(), o('more', 'Take them on', { r: [[0, [E.drib(0.6)]]] })]),
    ],
    final: [
      G(['FB'], 'move', 'Movement', '', [o('overlap', 'Overlap', { pos: [[0, 8, 4]], r: [[0, [E.runs(1)]]] }), STD(), o('underlap', 'Underlap (run inside)', { pos: [[0, 8, -5]], r: [[0, [E.runs(0.6)]]] }), o('cover', 'Stay back as cover', { pos: [[0, -7, 0]] })]),
      G(['DM'], 'move', 'Movement', '', [o('edge', 'Sit on the edge of the box', { pos: [[0, 6, 0]], r: [[0, [E.shoot(0.4)]]] }), STD(), o('cover', 'Stay back as cover', { pos: [[0, -5, 0]] })]),
      G(['CM'], 'move', 'Movement', '', [o('box', 'Late runs into the box', { pos: [[0, 7, 0]], r: [[0, [E.runs(1)]]] }), STD(), o('edge', 'Wait on the edge of the box', { pos: [[0, 1, 0]], r: [[0, [E.shoot(0.4)]]] })]),
      G(['AM'], 'move', 'Movement', '', [o('between', 'Stay between the lines', { pos: [[0, -2, 0]] }), STD(), o('box', 'Get into the box', { pos: [[0, 7, 0]], r: [[0, [E.runs(1)]]] }), o('wide', 'Create from wide', { pos: [[0, 0, 8]] })]),
      G(['WF'], 'move', 'Movement', '', [o('line', 'Hug the touchline', { pos: [[0, 0, 5]] }), STD(), o('cut', 'Cut inside', { pos: [[0, 0, -8]], r: [[0, [E.drib(0.4), E.shoot(0.4)]]] }), o('behind', 'Run in behind', { pos: [[0, 5, 0]], r: [[0, [E.runs(1)]]] }), o('far', 'Attack the far post', { pos: [[0, 5, -9]], r: [[0, [E.runs(0.8)]]] })]),
      G(['ST'], 'move', 'Movement', '', [o('hold', 'Hold up play', { pos: [[0, -4, 0]], r: [[0, [E.hold()]]] }), STD(), o('shoulder', 'Stay on the last defender', { pos: [[0, 3, 0]] }), o('channel', 'Run the channels', { pos: [[0, 2, 0]], r: [[0, [E.runs(1)]]] })]),
      G(ALL.filter((g) => g !== 'CB'), 'finish', 'Finishing', '', [o('patient', 'Work a better chance', { r: [[0, [E.shoot(-0.6)]]] }), STD(), o('sight', 'Shoot on sight', { r: [[0, [E.shoot(0.8)]]] })]),
      G(['FB', 'CM', 'AM', 'WF'], 'deliver', 'Delivery', '', [o('early', 'Cross early', { r: [[0, [E.to({ group: 'ST' }, 0.4)]]] }), STD(), o('cutback', 'Get to the byline and cut back', { r: [[0, [E.to({ line: 'midfield' }, 0.5), E.drib(0.3)]]] })]),
    ],
    transDef: [
      G(ALL, 'react', 'The moment we lose it', '', [o('press', 'Press the ball at once', { r: [[0, [E.close(1), E.tackle(0.4)]]] }), STD(), o('drop', 'Recover to shape', { pos: [[0, -6, 0]], r: [[0, [E.close(-0.6)]]] }), o('delay', 'Delay the attack', { r: [[0, [E.close(-0.2), E.tackle(-0.4)]]] })]),
      G(['DM', 'CM', 'CB'], 'foul', 'Stopping a break', '', [STD('Never foul'), o('foul', 'Foul to stop it', { r: [[0, [E.tackle(0.8)]]] })]),
    ],
    defence: [
      G(['CB'], 'duty', 'Duty', '', [o('step', 'Step up to challenge', { pos: [[0, 3, 0]], r: [[0, [E.step(), E.close(0.4)]]] }), STD(), o('drop', 'Drop off and cover', { pos: [[0, -4, 0]], r: [[0, [E.close(-0.6)]]] })]),
      G(['FB'], 'duty', 'Duty', '', [o('tuck', 'Tuck in', { pos: [[0, 0, -4]] }), STD(), o('wide', 'Hold the touchline', { pos: [[0, 0, 4]] }), o('jockey', 'Jockey, do not dive in', { r: [[0, [E.tackle(-0.5)]]] })]),
      G(['DM'], 'duty', 'Duty', '', [o('screen', 'Screen the back line', { pos: [[0, -3, 0]], r: [[0, [E.close(-0.4)]]] }), STD(), o('wide', 'Cover the wide areas', { pos: [[0, 0, 5]] }), o('hunt', 'Hunt the ball', { r: [[0, [E.close(0.8), E.tackle(0.4)]]] })]),
      G(['CM'], 'duty', 'Duty', '', [o('hold', 'Hold the midfield line', { pos: [[0, -2, 0]] }), STD(), o('mark', 'Mark the nearest runner', { r: [[0, [E.mark({ group: 'CM' })]]] })]),
      G(['AM', 'WF', 'ST'], 'duty', 'Duty', '', [o('back', 'Track back', { pos: [[0, -8, 0]], r: [[0, [E.close(0.3)]]] }), STD(), o('high', 'Stay high for the counter', { pos: [[0, 5, 0]], r: [[0, [E.close(-0.6)]]] })]),
      G(ALL, 'tackle', 'Tackling', '', [o('stay', 'Stay on his feet', { r: [[0, [E.tackle(-0.7)]]] }), STD(), o('hard', 'Tackle hard', { r: [[0, [E.tackle(0.7)]]] })]),
      G(['CB', 'FB', 'DM', 'CM'], 'mark', 'Marking', '', [STD('Zonal'), o('man', 'Follow his man', { r: [[0, [{ type: 'mark', target: { line: 'attack' } }]]] })]),
    ],
    press: [
      G(ALL, 'engage', 'In the press', '', [o('ball', 'Press the ball', { r: [[0, [E.close(1), E.tackle(0.3)]]] }), STD(), o('lane', 'Cut the passing lane, do not chase', { r: [[0, [E.close(-0.3)]]] }), o('wait', 'Mark and wait', { r: [[0, [E.close(-0.8)]]] })]),
      G(['ST'], 'keeper', 'Their goalkeeper', '', [o('press', 'Press the goalkeeper', { pos: [[0, 4, 0]], r: [[0, [E.close(1)]]] }), STD(), o('ignore', 'Leave the goalkeeper', { r: [[0, [E.close(-0.4)]]] })]),
      G(['CB', 'FB', 'DM'], 'line', 'Holding the line', '', [o('up', 'Step up with the press', { pos: [[0, 5, 0]] }), STD(), o('hold', 'Hold the line', { pos: [[0, -4, 0]] })]),
    ],
    transAtt: [
      G(['FB', 'DM', 'CM', 'AM', 'WF', 'ST'], 'run', 'Our run', '', [o('sprint', 'Sprint beyond the ball', { pos: [[0, 7, 0]], r: [[0, [E.runs(1)]]] }), STD('Support the ball'), o('stay', 'Stay back', { pos: [[0, -4, 0]] })]),
      G(ALL, 'ball', 'With the ball', '', [o('carry', 'Run with it', { r: [[0, [E.drib(0.6)]]] }), STD(), o('pass', 'Pass quickly forward', { r: [[0, [E.dir('forward', 0.7)]]] }), o('keep', 'Keep it', { r: [[0, [E.len('short', 0.6), E.risk(-0.4)]]] })]),
    ],
  };
  FM.planPlayerToggles = (phaseKey, group) => (FM.PLAN_PLAYER[phaseKey] || []).filter((g) => g.groups.indexOf(group) >= 0);

  // ---------- zones and triggers ----------
  // The pitch is a grid: six depths (from around our own box to their penalty area) by five channels (far left to far right), seen by the team attacking up the page.
  FM.PLAN_DEPTHS = [{ k: 0, lo: 0, hi: 1 / 6, name: 'around our box' }, { k: 1, lo: 1 / 6, hi: 1 / 3, name: 'the rest of our third' }, { k: 2, lo: 1 / 3, hi: 1 / 2, name: 'our side of midfield' }, { k: 3, lo: 1 / 2, hi: 2 / 3, name: 'their side of midfield' }, { k: 4, lo: 2 / 3, hi: 5 / 6, name: 'the edge of their box' }, { k: 5, lo: 5 / 6, hi: 1, name: 'their penalty area' }];
  FM.PLAN_CHANNELS = [{ k: 0, lo: 0, hi: 0.2, name: 'far left' }, { k: 1, lo: 0.2, hi: 0.4, name: 'left' }, { k: 2, lo: 0.4, hi: 0.6, name: 'central' }, { k: 3, lo: 0.6, hi: 0.8, name: 'right' }, { k: 4, lo: 0.8, hi: 1, name: 'far right' }];
  FM.PLAN_WHO = { forwards: ['att'], mids: ['mid'], defenders: ['def'], everyone: ['team'], nearest: ['team'], wingers: ['WF'], striker: ['ST'], fullbacks: ['FB'] };
  FM.PLAN_WHO_NAMES = { nearest: 'the nearest two players', forwards: 'the forwards', mids: 'the midfield', defenders: 'the defence', everyone: 'everyone', wingers: 'the wingers', striker: 'the striker', fullbacks: 'the full-backs' };
  // what a zone can mean: where the ball is (and who has it) decides when it applies
  FM.PLAN_ZONE_TAGS = [
    { k: 'press', name: 'Press here', side: 'without', help: 'When the ball is here and they have it, we close down hard.', who: true, fx: [E.close(1), E.tackle(0.3)] },
    { k: 'sit', name: 'Do not chase here', side: 'without', help: 'When the ball is here we hold our shape instead of chasing.', who: true, fx: [E.close(-1)] },
    { k: 'protect', name: 'Protect this area', side: 'without', help: 'We stand in this area when they have the ball.', who: true, place: 0.7 },
    { k: 'safe', name: 'Play safe here', side: 'with', help: 'With the ball here: short, simple passes, no dribbles.', who: true, fx: [E.risk(-0.8), E.len('short', 0.6), E.drib(-0.6)] },
    { k: 'risk', name: 'Take risks here', side: 'with', help: 'With the ball here: ambitious passes, take players on, shoot.', who: true, fx: [E.risk(0.8), E.drib(0.6), E.shoot(0.4)] },
    { k: 'overload', name: 'Overload here', side: 'with', help: 'With the ball near here, the chosen players come into this area.', who: true, place: 0.6 },
    { k: 'target', name: 'Attack this area', side: 'with', help: 'With the ball in the attack, runners aim for this area.', who: true, place: 0.7, fx: [E.runs(0.8)] },
    { k: 'switch', name: 'Switch out of here', side: 'with', help: 'With the ball here, move it quickly to the far side.', who: false, fx: [E.to({ side: 'opposite' }, 0.7), E.dir('sideways', 0.5)] },
    { k: 'keep', name: 'Keep the ball here', side: 'with', help: 'With the ball here, slow it down and keep possession.', who: false, fx: [E.tempo(-0.7), E.len('short', 0.7), E.risk(-0.4)] },
  ];
  // when a trigger fires
  FM.PLAN_WHEN = [
    { k: 'carrier', name: 'The ball goes to their...', side: 'without', needs: 'carrier', options: [['FB', 'full-back'], ['CB', 'centre-back'], ['GK', 'goalkeeper'], ['DM', 'holding midfielder'], ['CM', 'central midfielder'], ['WF', 'winger'], ['ST', 'striker']] },
    { k: 'inzone', name: 'The ball is in a zone and they have it', side: 'without', needs: 'zone' },
    { k: 'ourzone', name: 'We have the ball in a zone', side: 'with', needs: 'zone' },
    { k: 'pressed', name: 'We are pressed in a zone', side: 'with', needs: 'zone', pressed: true },
    { k: 'won', name: 'We win the ball in a zone', side: 'with', needs: 'zone', stage: 'transAtt' },
    { k: 'lost', name: 'We lose the ball in a zone', side: 'without', needs: 'zone', stage: 'transDef' },
  ];
  FM.PLAN_DO = [
    { k: 'press', name: 'press', side: 'without', fx: [E.close(1), E.tackle(0.3)], help: 'closing down hard' },
    { k: 'hold', name: 'drop off and hold shape', side: 'without', fx: [E.close(-1)], help: 'not chasing' },
    { k: 'mark', name: 'close him down and follow him', side: 'without', fx: [E.close(0.8), E.step()], help: 'closing down and stepping up' },
    { k: 'run', name: 'run in behind', side: 'with', fx: [E.runs(1)], help: 'making a run beyond the defence' },
    { k: 'long', name: 'play it long', side: 'with', fx: [E.len('long', 0.9), E.dir('forward', 0.5)], help: 'going long' },
    { k: 'safe', name: 'play it safe', side: 'with', fx: [E.risk(-0.8), E.len('short', 0.6)], help: 'keeping it simple' },
    { k: 'switch', name: 'switch play', side: 'with', fx: [E.to({ side: 'opposite' }, 0.8)], help: 'moving it to the far side' },
    { k: 'take', name: 'take his man on', side: 'with', fx: [E.drib(0.8), E.risk(0.3)], help: 'dribbling' },
    { k: 'shoot', name: 'shoot', side: 'with', fx: [E.shoot(0.9)], help: 'shooting early' },
  ];
  FM.PLAN_ZONE_TAG = {}; FM.PLAN_ZONE_TAGS.forEach((t) => { FM.PLAN_ZONE_TAG[t.k] = t; });
  FM.PLAN_WHEN_BY = {}; FM.PLAN_WHEN.forEach((t) => { FM.PLAN_WHEN_BY[t.k] = t; });
  FM.PLAN_DO_BY = {}; FM.PLAN_DO.forEach((t) => { FM.PLAN_DO_BY[t.k] = t; });

  // ---------- the plan ----------
  FM.planGet = function (team) {
    if (!team.plan || team.plan.v !== 1) team.plan = { v: 1, team: {}, player: {}, zones: [], triggers: [] };
    const pl = team.plan; pl.team = pl.team || {}; pl.player = pl.player || {}; pl.zones = pl.zones || []; pl.triggers = pl.triggers || [];
    return pl;
  };
  FM.planTeamChoice = (team, phase, key) => { const t = (FM.planGet(team).team[phase] || {})[key]; return t == null ? null : t; };
  FM.planPlayerChoice = (team, slot, phase, key) => { const t = ((FM.planGet(team).player[slot] || {})[phase] || {})[key]; return t == null ? null : t; };
  FM.planSetTeam = function (team, phase, key, v) { const pl = FM.planGet(team); pl.team[phase] = pl.team[phase] || {}; if (v == null || v === 'std') delete pl.team[phase][key]; else pl.team[phase][key] = v; FM.planApply(team); };
  FM.planSetPlayer = function (team, slot, phase, key, v) { const pl = FM.planGet(team); pl.player[slot] = pl.player[slot] || {}; pl.player[slot][phase] = pl.player[slot][phase] || {}; if (v == null || v === 'std') delete pl.player[slot][phase][key]; else pl.player[slot][phase][key] = v; FM.planApply(team); };
  FM.planCount = (team) => { const pl = FM.planGet(team); let n = 0; Object.keys(pl.team).forEach((ph) => { n += Object.keys(pl.team[ph]).length; }); Object.keys(pl.player).forEach((s) => Object.keys(pl.player[s]).forEach((ph) => { n += Object.keys(pl.player[s][ph]).length; })); return n + pl.zones.length + pl.triggers.length; };
  const uid = () => 'z' + Math.random().toString(36).slice(2, 7);
  FM.planAddZone = function (team, z) { const pl = FM.planGet(team); const zone = Object.assign({ id: uid(), who: 'everyone', on: true, g: 2 }, z); pl.zones.push(zone); FM.planApply(team); return zone; };
  FM.planAddTrigger = function (team, t) { const pl = FM.planGet(team); const trig = Object.assign({ id: uid(), who: 'nearest', on: true, g: 2 }, t); pl.triggers.push(trig); FM.planApply(team); return trig; };
  FM.planRemove = function (team, kind, id) { const pl = FM.planGet(team), a = kind === 'zone' ? pl.zones : pl.triggers; const i = a.findIndex((x) => x.id === id); if (i >= 0) a.splice(i, 1); FM.planApply(team); };
  FM.planToggleItem = function (team, kind, id) { const pl = FM.planGet(team), a = kind === 'zone' ? pl.zones : pl.triggers, x = a.find((y) => y.id === id); if (x) x.on = !x.on; FM.planApply(team); };
  FM.planReset = function (team) { team.plan = { v: 1, team: {}, player: {}, zones: [], triggers: [] }; FM.planApply(team); };

  // ---------- compiling the plan ----------
  const baseSide = (team, p) => { const s = FM.slotBase ? FM.slotBase(team, p) : { w: 0.5 }; return Math.abs(s.w - 0.5) < 0.06 ? 0 : s.w < 0.5 ? -1 : 1; };
  // region of selected cells as an expression on the ball's position in metres from our goal (dm) and our left touchline (wm)
  function cellExpr(cells) {
    const box = (c) => { const dp = FM.PLAN_DEPTHS[c[0]], ch = FM.PLAN_CHANNELS[c[1]]; return { op: 'and', args: [{ cmp: 'gte', a: { attr: 'dm', of: { e: 'ball' } }, b: dp.lo * L }, { cmp: 'lt', a: { attr: 'dm', of: { e: 'ball' } }, b: dp.hi * L + (dp.hi === 1 ? 1 : 0) }, { cmp: 'gte', a: { attr: 'wm', of: { e: 'ball' } }, b: ch.lo * W }, { cmp: 'lt', a: { attr: 'wm', of: { e: 'ball' } }, b: ch.hi * W + (ch.hi === 1 ? 1 : 0) }] }; };
    const list = (cells || []).map(box);
    return list.length === 1 ? list[0] : { op: 'or', args: list };
  }
  const nearBall = (m) => ({ cmp: 'lt', a: { attr: 'dist', of: { e: 'me' }, to: { e: 'ball' } }, b: m });
  const cellsCentre = (cells) => { let d = 0, w = 0; (cells || []).forEach((c) => { d += (FM.PLAN_DEPTHS[c[0]].lo + FM.PLAN_DEPTHS[c[0]].hi) / 2; w += (FM.PLAN_CHANNELS[c[1]].lo + FM.PLAN_CHANNELS[c[1]].hi) / 2; }); const n = (cells || []).length || 1; return { dm: d / n * L, wm: w / n * W }; };
  FM.planCellsName = function (cells) {
    if (!cells || !cells.length) return 'nowhere';
    const ds = [...new Set(cells.map((c) => c[0]))].sort(), cs = [...new Set(cells.map((c) => c[1]))].sort();
    const dn = ds.length === 6 ? 'the whole length' : ds.map((d) => FM.PLAN_DEPTHS[d].name).join(' and '), cn = cs.length === 5 ? 'across the pitch' : cs.map((c) => FM.PLAN_CHANNELS[c].name).join(' and ');
    return (cs.length === 5 ? dn + ', ' + cn : dn + ', ' + cn);
  };

  FM.planApply = function (team) {
    if (!team || !team.players) return;
    const pl = FM.planGet(team), rules = [], off = {}, tac = {};
    // marks made on the old grid of three depths become the same area on the grid of six
    pl.zones.concat(pl.triggers).forEach((it) => { if (!it.g) { it.cells = (it.cells || []).reduce((a, c) => a.concat([[c[0] * 2, c[1]], [c[0] * 2 + 1, c[1]]]), []); it.g = 2; } });
    const addOff = (phaseKey, slot, dm, wm, abs, p) => { const eng = PHASE[phaseKey].eng; const sd = abs ? 1 : baseSide(team, p); const dw = abs ? wm / W : sd * wm / W; if (!dw && !dm) return; eng.forEach((ek) => { off[ek] = off[ek] || {}; const c = off[ek][slot] || [0, 0]; off[ek][slot] = [c[0] + dm / L, c[1] + dw]; }); };
    const push = (phaseKey, scope, effects, when, text, pid) => { if (!effects || !effects.length) return; rules.push({ id: pid, pid, text: text || '', scope: scopeRule(scope), when: Object.assign({ stage: [PHASE[phaseKey].stage] }, when || {}), effects: effects.map((e) => Object.assign({}, e)), off: false, source: 'plan' }); };
    const slotsFor = (scope) => team.players.filter((p) => inScope(scope, p));
    // team toggles
    Object.keys(pl.team).forEach((ph) => {
      if (!PHASE[ph]) return;
      (FM.PLAN_TEAM[ph] || []).forEach((t) => {
        const ch = pl.team[ph][t.key]; if (ch == null) return; const op = t.opts.find((x) => x.v === ch); if (!op) return;
        (op.r || []).forEach((r, i) => push(ph, r[0], r[1], r[2], t.label + ': ' + op.label, 'pl:' + ph + ':' + t.key + ':' + i));
        (op.pos || []).forEach((q) => slotsFor(q[0]).forEach((p) => addOff(ph, p.slotKey, q[1], q[2], q[3], p)));
        if (op.tac) Object.assign(tac, op.tac);
      });
    });
    // player toggles
    Object.keys(pl.player).forEach((slot) => {
      const p = team.players.find((q) => q.slotKey === slot); if (!p) return;
      Object.keys(pl.player[slot]).forEach((ph) => {
        if (!PHASE[ph]) return;
        FM.planPlayerToggles(ph, p.group).forEach((t) => {
          const ch = pl.player[slot][ph][t.key]; if (ch == null) return; const op = t.opts.find((x) => x.v === ch); if (!op) return;
          (op.r || []).forEach((r, i) => push(ph, 'slot:' + slot, r[1], r[2], p.name + ' (' + t.label + '): ' + op.label, 'pl:' + slot + ':' + ph + ':' + t.key + ':' + i));
          (op.pos || []).forEach((q) => addOff(ph, slot, q[1], q[2], q[3], p));
        });
      });
    });
    // zones: where the ball is decides when the tag applies
    pl.zones.forEach((z) => {
      const tag = FM.PLAN_ZONE_TAG[z.tag]; if (!tag || z.on === false || !z.cells || !z.cells.length) return;
      const phases = z.phase && z.phase !== 'any' && PHASE[z.phase] ? [z.phase] : FM.PLAN_PHASES.filter((p) => (tag.side === 'with' ? ['build', 'midfield', 'final', 'transAtt'] : ['transDef', 'defence', 'press']).indexOf(p.key) >= 0).map((p) => p.key);
      const who = z.who && FM.PLAN_WHO[z.who] ? z.who : 'everyone';
      const scopes = FM.PLAN_WHO[who];
      phases.forEach((ph) => scopes.forEach((sc, si) => {
        const ex = [cellExpr(z.cells)]; if (who === 'nearest') ex.push(nearBall(20));
        const when = { possession: tag.side, expr: ex.length === 1 ? ex[0] : { op: 'and', args: ex } };
        const c = cellsCentre(z.cells);
        const eff = (tag.fx || []).map((e) => Object.assign({}, e));
        if (tag.place) eff.push({ type: 'place', dm: c.dm, wm: c.wm, weight: tag.place, phase: tag.side });
        push(ph, sc, eff, when, tag.name, 'pl:z:' + z.id + ':' + ph + ':' + si);
      }));
    });
    // triggers
    pl.triggers.forEach((t) => {
      const w = FM.PLAN_WHEN_BY[t.when], d = FM.PLAN_DO_BY[t.do]; if (!w || !d || t.on === false) return;
      const preds = [];
      if (w.needs === 'carrier') preds.push({ is: 'group', of: { e: 'carrier' }, value: t.group || 'FB' });
      if (t.cells && t.cells.length) preds.push(cellExpr(t.cells));
      const who = t.who && FM.PLAN_WHO[t.who] ? t.who : 'nearest';
      const phases = w.stage ? [w.stage === 'transAtt' ? 'transAtt' : 'transDef'] : (w.side === 'with' ? ['build', 'midfield', 'final'] : ['defence', 'press']);
      phases.forEach((ph) => FM.PLAN_WHO[who].forEach((sc, si) => {
        const ex = preds.slice(); if (who === 'nearest') ex.push(nearBall(20));
        const when = { possession: w.side, expr: ex.length === 1 ? ex[0] : { op: 'and', args: ex } };
        if (w.pressed) when.pressed = 'pressed';
        push(ph, sc, d.fx, when, FM.planTriggerText(t), 'pl:t:' + t.id + ':' + ph + ':' + si);
      }));
    });
    team.rules = (team.rules || []).filter((r) => r.source !== 'plan').concat(rules);
    team.planOut = { off, n: rules.length };
    team.tactics = team.tactics || {};
    ['block', 'pressing', 'pressBuildUp'].forEach((k) => { if (tac[k] !== undefined) team.tactics[k] = tac[k]; });
    if (FM.inferShapeTactics) FM.inferShapeTactics(team);
  };

  // ---------- plain words ----------
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  FM.planZoneText = function (z) {
    const tag = FM.PLAN_ZONE_TAG[z.tag]; if (!tag) return '';
    const who = tag.who ? (z.who && z.who !== 'everyone' ? ' (' + FM.PLAN_WHO_NAMES[z.who] + ')' : '') : '';
    const where = FM.planCellsName(z.cells), ph = z.phase && z.phase !== 'any' && PHASE[z.phase] ? ' in the ' + PHASE[z.phase].name.toLowerCase() : '';
    return cap(tag.name.toLowerCase().replace('this area', where).replace('here', 'in ' + where)) + (tag.name.indexOf('here') < 0 && tag.name.indexOf('this area') < 0 ? ': ' + where : '') + who + ph + '.';
  };
  FM.planTriggerText = function (t) {
    const w = FM.PLAN_WHEN_BY[t.when], d = FM.PLAN_DO_BY[t.do]; if (!w || !d) return '';
    const sit = w.needs === 'carrier' ? 'the ball goes to their ' + ((w.options.find((o2) => o2[0] === (t.group || 'FB')) || [])[1] || 'full-back') + (t.cells && t.cells.length ? ' in ' + FM.planCellsName(t.cells) : '')
      : w.k === 'inzone' ? 'they have the ball in ' + FM.planCellsName(t.cells) : w.k === 'ourzone' ? 'we have the ball in ' + FM.planCellsName(t.cells) : w.k === 'pressed' ? 'we are pressed in ' + FM.planCellsName(t.cells) : w.k === 'won' ? 'we win the ball in ' + FM.planCellsName(t.cells) : 'we lose the ball in ' + FM.planCellsName(t.cells);
    return 'When ' + sit + ', ' + FM.PLAN_WHO_NAMES[t.who || 'nearest'] + ' ' + d.name + '.';
  };
  // the whole plan in a few lines
  FM.planSummary = function (team) {
    const pl = FM.planGet(team), out = [];
    FM.PLAN_PHASES.forEach((ph) => {
      const bits = [];
      (FM.PLAN_TEAM[ph.key] || []).forEach((t) => { const ch = (pl.team[ph.key] || {})[t.key]; if (ch == null) return; const op = t.opts.find((x) => x.v === ch); if (op) bits.push(op.label.toLowerCase()); });
      let np = 0; Object.keys(pl.player).forEach((s) => { np += Object.keys((pl.player[s] || {})[ph.key] || {}).length; });
      if (bits.length || np) out.push({ phase: ph.name, text: bits.join(', ') + (np ? (bits.length ? '; ' : '') + np + ' player instruction' + (np === 1 ? '' : 's') : '') });
    });
    return out;
  };

  // ---------- how often each area and trigger was used in the last test ----------
  // The lab plays a phase many times; while it does, rules.js counts how often each of the plan's rules came into force. That is kept with the plan, per item.
  FM.planWatchLab = function () {
    if (!FM.lab || FM.lab._planWatched || typeof FM.lab.run !== 'function') return;
    const run0 = FM.lab.run; FM.lab._planWatched = true;
    FM.lab.run = async function (lg, opts) {
      FM._planHits = {};
      const R = await run0.apply(this, arguments), hits = FM._planHits; FM._planHits = null;
      try {
        const team = lg && FM.teamById ? FM.teamById(lg, lg.userId) : null, pl = team && team.plan;
        if (pl && R && R.n) {
          const sum = {}; Object.keys(hits || {}).forEach((pid) => { const q = pid.split(':'); if (q[0] === 'pl' && (q[1] === 'z' || q[1] === 't')) sum[q[2]] = (sum[q[2]] || 0) + hits[pid].fires; });
          pl.stats = pl.stats || {};
          pl.zones.concat(pl.triggers).forEach((it) => { pl.stats[it.id] = { fires: sum[it.id] || 0, n: R.n, phase: opts && opts.phase }; });
        }
      } catch (e) { /* the test result matters more than the count */ }
      return R;
    };
  };
  window.addEventListener('load', () => FM.planWatchLab());

  // ---------- changes proposed by the agent ----------
  // A change is checked against the catalogue before anything is done with it, so whatever the agent sends can only ever be one of the choices above.
  //   {kind:'team', phase, key, value}   {kind:'player', slot, phase, key, value}   {kind:'role', slot, role}
  //   {kind:'zone', tag, cells, who, phase}   {kind:'trigger', when, group, who, do, cells}
  const cellsOk = (cells) => (Array.isArray(cells) ? cells.slice(0, 9).filter((c) => Array.isArray(c) && Number.isInteger(c[0]) && Number.isInteger(c[1]) && c[0] >= 0 && c[0] <= 5 && c[1] >= 0 && c[1] <= 4).map((c) => [c[0], c[1]]) : []);
  FM.planDescribeChange = function (team, ch) {
    if (!ch || typeof ch !== 'object') return null;
    const slotP = (sl) => team.players.find((p) => p.slotKey === sl);
    if (ch.kind === 'team') {
      const t = (FM.PLAN_TEAM[ch.phase] || []).find((x) => x.key === ch.key), op = t && t.opts.find((x) => x.v === ch.value); if (!op) return null;
      return { text: FM.planPhase(ch.phase).name + ': ' + t.label.toLowerCase() + ' set to "' + op.label.toLowerCase() + '".', apply: () => { const pl = FM.planGet(team); pl.team[ch.phase] = pl.team[ch.phase] || {}; if (ch.value === 'std') delete pl.team[ch.phase][ch.key]; else pl.team[ch.phase][ch.key] = ch.value; } };
    }
    if (ch.kind === 'player') {
      const p = slotP(ch.slot); if (!p || !PHASE[ch.phase]) return null;
      const t = FM.planPlayerToggles(ch.phase, p.group).find((x) => x.key === ch.key), op = t && t.opts.find((x) => x.v === ch.value); if (!op) return null;
      return { text: p.name + ' (' + FM.planPhase(ch.phase).name.toLowerCase() + '): "' + op.label.toLowerCase() + '".', apply: () => { const pl = FM.planGet(team); pl.player[ch.slot] = pl.player[ch.slot] || {}; pl.player[ch.slot][ch.phase] = pl.player[ch.slot][ch.phase] || {}; if (ch.value === 'std') delete pl.player[ch.slot][ch.phase][ch.key]; else pl.player[ch.slot][ch.phase][ch.key] = ch.value; } };
    }
    if (ch.kind === 'role') {
      const p = slotP(ch.slot), r = FM.ROLES[ch.role]; if (!p || !r || r.groups.indexOf(p.group) < 0) return null;
      return { text: p.name + ' plays as a ' + r.name.toLowerCase() + '.', apply: () => FM.setRole(team, p, ch.role) };
    }
    if (ch.kind === 'zone') {
      const tag = FM.PLAN_ZONE_TAG[ch.tag], cells = cellsOk(ch.cells); if (!tag || !cells.length) return null;
      const z = { tag: ch.tag, cells, who: FM.PLAN_WHO[ch.who] ? ch.who : 'everyone', phase: PHASE[ch.phase] ? ch.phase : 'any' };
      return { text: FM.planZoneText(z), apply: () => { FM.planGet(team).zones.push(Object.assign({ id: uid(), on: true, g: 2 }, z)); } };
    }
    if (ch.kind === 'trigger') {
      const w = FM.PLAN_WHEN_BY[ch.when], d = FM.PLAN_DO_BY[ch.do], cells = cellsOk(ch.cells); if (!w || !d || d.side !== w.side || (w.needs === 'zone' && !cells.length)) return null;
      const t = { when: ch.when, group: w.needs === 'carrier' && w.options.some((x) => x[0] === ch.group) ? ch.group : 'FB', who: FM.PLAN_WHO[ch.who] ? ch.who : 'nearest', do: ch.do, cells };
      return { text: FM.planTriggerText(t), apply: () => { FM.planGet(team).triggers.push(Object.assign({ id: uid(), on: true, g: 2 }, t)); } };
    }
    return null;
  };
  // Checks a list of changes and, when asked, makes them. Returns the plain-words list of what is (or would be) done.
  FM.planChanges = function (team, changes, doIt) {
    const done = []; let skipped = 0;
    (Array.isArray(changes) ? changes : []).slice(0, 8).forEach((ch) => { const d = FM.planDescribeChange(team, ch); if (!d) { skipped++; return; } if (doIt) d.apply(); done.push(d.text); });
    if (doIt && done.length) FM.planApply(team);
    return { done, skipped };
  };

  // What the agent is told it can choose from, in as few words as it can be said.
  FM.planCatalogText = function (team) {
    const out = [];
    out.push('SLOTS (name each by its slot key): ' + team.players.map((p) => p.slotKey + '=#' + p.number + ' ' + p.name.split(' ').slice(-1)[0] + ' (' + p.group + ', ' + (FM.ROLES[p.roleId] || {}).name + ')').join('; '));
    out.push('TEAM CHOICES {kind:"team",phase,key,value}: ' + FM.PLAN_PHASES.map((ph) => ph.key + ' -> ' + (FM.PLAN_TEAM[ph.key] || []).map((t) => t.key + '=[' + t.opts.map((x) => x.v + ':' + x.label).join(' | ') + ']').join('; ')).join('\n  '));
    out.push('PLAYER CHOICES {kind:"player",slot,phase,key,value}, by phase and kind of player: ' + FM.PLAN_PHASES.map((ph) => ph.key + ' -> ' + ['CB', 'FB', 'DM', 'CM', 'AM', 'WF', 'ST'].map((g) => g + ': ' + FM.planPlayerToggles(ph.key, g).map((t) => t.key + '=[' + t.opts.map((x) => x.v).join('|') + ']').join(' ')).join(' / ')).join('\n  '));
    out.push('ROLES {kind:"role",slot,role}: ' + GROUPS.map((g) => g + ': ' + FM.rolesForGroup(g).join(',')).join(' / '));
    out.push('PITCH GRID: depth 0 = around our own box, 1 = rest of our third, 2 = our side of midfield, 3 = their side of midfield, 4 = the edge of their box, 5 = their penalty area; channel 0 far left, 1 left, 2 central, 3 right, 4 far right; a cell is [depth,channel]. Left and right are as seen by the team attacking.');
    out.push('ZONES {kind:"zone",tag,cells:[[d,c]..],who,phase}: tags ' + FM.PLAN_ZONE_TAGS.map((t) => t.k + '(' + t.side + ')').join(', ') + '; who one of ' + Object.keys(FM.PLAN_WHO).join(',') + '; phase one of ' + FM.PLAN_PHASES.map((p) => p.key).join(',') + ' or "any"');
    out.push('TRIGGERS {kind:"trigger",when,group,who,do,cells}: when one of ' + FM.PLAN_WHEN.map((w) => w.k + '(' + w.side + (w.needs === 'carrier' ? ', group one of FB,CB,GK,DM,CM,WF,ST' : ', needs cells') + ')').join(', ') + '; do one of ' + FM.PLAN_DO.map((d) => d.k + '(' + d.side + ')').join(', ') + ' (do must be on the same side as when)');
    return out.join('\n');
  };

  // a test that changes the plan must put the plan back afterwards: the lab's snapshot carries it
  FM.planWatchSnapshot = function () {
    if (!FM.lab || FM.lab._planSnap || typeof FM.lab.snapshot !== 'function') return;
    FM.lab._planSnap = true;
    const snap0 = FM.lab.snapshot, rest0 = FM.lab.restore;
    FM.lab.snapshot = function (team) { const s0 = snap0.apply(this, arguments); if (s0 && s0.full) s0.full.plan = JSON.parse(JSON.stringify({ plan: team.plan || null, planOut: team.planOut || null })); return s0; };
    FM.lab.restore = function (team, snap) { const ok = rest0.apply(this, arguments); if (ok && snap && snap.full && snap.full.plan) { const q = JSON.parse(JSON.stringify(snap.full.plan)); if (q.plan) team.plan = q.plan; else delete team.plan; team.planOut = q.planOut || { off: {}, n: 0 }; } return ok; };
  };
  window.addEventListener('load', () => FM.planWatchSnapshot());

  // ---------- the engine reads the plan's position offsets ----------
  const baseDefault = FM.defaultPhasePos;
  FM.defaultPhasePos = function (team, p, phase) {
    const r = baseDefault(team, p, phase);
    const o2 = team.planOut && team.planOut.off && team.planOut.off[phase] && team.planOut.off[phase][p.slotKey];
    if (!o2) return r;
    return { d: clamp(r.d + clamp(o2[0], -0.2, 0.2), 0.02, 0.97), w: clamp(r.w + clamp(o2[1], -0.3, 0.3), 0.04, 0.96) };
  };
})();
