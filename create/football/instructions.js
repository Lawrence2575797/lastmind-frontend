// Player instructions. A role says what kind of player this is; instructions fine-tune how he plays. They belong to the
// PLAYER, not to a phase, so they hold in every phase of play: a full-back told to invert is inverted in build-up and
// in the final third alike. Every instruction is a choice from a short list, and every choice changes a number the
// match engine uses, so each one is a clean variable whose effect can be tested (and replayed exactly).
(function () {
  const FM = (window.FM = window.FM || {});
  const OUT = ['CB', 'FB', 'DM', 'CM', 'AM', 'WF', 'ST'];

  // value -1 / 0 / +1; 0 is always the default and means "no instruction"
  FM.INSTRUCTIONS = [
    { key: 'position', section: 'Movement', label: 'Position on the pitch', groups: OUT, options: [[-1, 'Hold his position'], [0, 'Default'], [1, 'Roam from his position']], desc: 'A roaming player follows the ball and the play around the pitch. A player told to hold stays closer to his spot.' },
    { key: 'width', section: 'Movement', label: 'Width', groups: OUT, options: [[-1, 'Stay narrower'], [0, 'Default'], [1, 'Stay wider']], desc: 'Moves his position toward the middle or toward the touchline in every phase.' },
    { key: 'depth', section: 'Movement', label: 'Depth', groups: OUT, options: [[-1, 'Sit deeper'], [0, 'Default'], [1, 'Get further forward']], desc: 'Moves his position back or forward in every phase.' },
    { key: 'runs', section: 'Movement', label: 'Runs beyond the defence', groups: ['FB', 'CM', 'AM', 'WF', 'ST'], options: [[-1, 'Hold the line'], [0, 'Default'], [1, 'Run in behind often']], desc: 'Stands level with the last defender and runs in behind, or stays safely onside.' },
    { key: 'dribble', section: 'On the ball', label: 'Dribbling', groups: OUT, options: [[-1, 'Dribble less'], [0, 'Default'], [1, 'Dribble more']], desc: 'How often he takes his man on instead of passing.' },
    { key: 'shoot', section: 'On the ball', label: 'Shooting', groups: OUT, options: [[-1, 'Shoot less'], [0, 'Default'], [1, 'Shoot more']], desc: 'How readily he shoots when he has a chance.' },
    { key: 'passing', section: 'On the ball', label: 'Passing', groups: OUT.concat(['GK']), options: [[-1, 'Shorter, simpler passes'], [0, 'Default'], [1, 'More direct passes']], desc: 'Simple passes to a nearby teammate, or the forward ball.' },
    { key: 'risk', section: 'On the ball', label: 'Risk', groups: OUT, options: [[-1, 'Play it safe'], [0, 'Default'], [1, 'Try the ambitious pass']], desc: 'How willing he is to try a pass that might be lost.' },
    { key: 'holdUp', section: 'On the ball', label: 'Holding the ball up', groups: ['CM', 'AM', 'WF', 'ST'], options: [[0, 'No'], [1, 'Hold it up for the team to arrive']], desc: 'Keeps the ball a little longer and plays it simply, to let teammates get forward.' },
    { key: 'distribution', section: 'On the ball', label: 'Distribution', groups: ['GK'], options: [[-1, 'Roll it out short'], [0, 'Default'], [1, 'Kick it long']], desc: 'How the goalkeeper restarts play.' },
    { key: 'closeDown', section: 'Off the ball', label: 'Closing down', groups: OUT, options: [[-1, 'Close down less'], [0, 'Default'], [1, 'Close down more']], desc: 'How far away he will chase the player with the ball.' },
    { key: 'tackle', section: 'Off the ball', label: 'Tackling', groups: OUT, options: [[-1, 'Stay on his feet'], [0, 'Default'], [1, 'Tackle harder']], desc: 'More challenges, but more fouls and more cards.' },
    { key: 'marking', section: 'Off the ball', label: 'Marking', groups: ['CB', 'FB', 'DM', 'CM'], options: [[0, 'Default (zonal)'], [1, 'Mark his man tightly']], desc: 'Follows the nearest attacker instead of holding a zone.' },
    { key: 'stepUp', section: 'Off the ball', label: 'Stepping up', groups: ['CB', 'DM'], options: [[-1, 'Hold the line'], [0, 'Default'], [1, 'Step up to follow the false 9']], desc: 'Follows a forward who drops deep, leaving space behind, or stays with the back line.' },
    { key: 'cornerAtt', section: 'Set pieces', label: 'Attacking corners and free kicks', groups: OUT, options: [[-1, 'Stay back'], [0, 'Default'], [1, 'Join the attack']], desc: 'Whether he goes into the box.' },
    { key: 'cornerDef', section: 'Set pieces', label: 'Defending corners', groups: OUT, options: [[-1, 'Stay up the pitch'], [0, 'Default'], [1, 'Mark in the box']], desc: 'Whether he defends the box or stays up for the counter.' },
  ];

  FM.instructionsFor = (group) => FM.INSTRUCTIONS.filter((i) => i.groups.indexOf(group) >= 0);

  // The numbers the engine uses, from a player's instructions.
  FM.instrMods = function (p) {
    const i = p.instr || {};
    const v = (k) => +i[k] || 0;
    return {
      roam: v('position'), width: 0.07 * v('width'), depth: 0.06 * v('depth'), runs: v('runs'),
      dribble: 0.35 * v('dribble'), shoot: v('shoot') < 0 ? 0.5 : v('shoot') > 0 ? 1.6 : 1,
      passDirect: 0.25 * v('passing'), risk: 0.2 * v('risk'), holdUp: v('holdUp') > 0,
      closeDown: v('closeDown'), tackle: v('tackle'), marking: v('marking'),
      stepUp: v('stepUp') || (p.options && p.options.stepUp ? 1 : 0),
      distribution: v('distribution'), cornerAtt: v('cornerAtt'), cornerDef: v('cornerDef'),
    };
  };
  FM.countInstructions = (p) => Object.keys(p.instr || {}).filter((k) => +p.instr[k] !== 0).length;

  // ---------- do the phases agree with each other and with the player's role? ----------
  const PHASE_SHORT = { build: 'build-up', final: 'the final third', transAtt: 'the transition to attack', transDef: 'the transition to defence', without: 'defending' };
  const POSSESSION = ['build', 'final', 'transAtt'];
  const side = (pos) => Math.abs(pos.w - 0.5);

  // Returns a list of plain-English problems for one player.
  FM.checkPlayer = function (team, p) {
    const out = [];
    const reach = FM.reachMetres(p);
    // 1. Can he get from one phase position to another in time?
    const bad = [];
    for (let a = 0; a < FM.PHASES.length; a++) for (let b = a + 1; b < FM.PHASES.length; b++) {
      const pa = FM.phasePos(team, p, FM.PHASES[a]), pb = FM.phasePos(team, p, FM.PHASES[b]);
      const d = FM.posDist(pa, pb);
      if (d > reach + 0.5) bad.push(PHASE_SHORT[FM.PHASES[a]] + ' and ' + PHASE_SHORT[FM.PHASES[b]] + ' (' + Math.round(d) + ' m apart)');
    }
    if (bad.length) out.push('He cannot get between these positions in time, he covers about ' + Math.round(reach) + ' m: ' + bad.join('; ') + '.');
    // 2. Do the positions fit the role? The role is the same in every phase, so its shape has to show in each of them.
    const role = p.roleId;
    POSSESSION.forEach((ph) => {
      const pos = FM.phasePos(team, p, ph);
      if (role === 'inverted_full_back' && side(pos) > 0.3) out.push('He is an inverted full-back but stands wide in ' + PHASE_SHORT[ph] + '. Move him inside, or change his role.');
      if (['wing_back', 'attacking_full_back', 'winger'].indexOf(role) >= 0 && ph !== 'build' && side(pos) < 0.22) out.push('A ' + FM.ROLES[role].name.toLowerCase() + ' is expected to stay wide, but he is central in ' + PHASE_SHORT[ph] + '.');
      if (['inside_forward', 'inverted_winger'].indexOf(role) >= 0 && ph === 'final' && side(pos) > 0.34) out.push('An ' + FM.ROLES[role].name.toLowerCase() + ' cuts inside in the final third, but he stands out wide.');
    });
    if (['anchor', 'defensive_midfielder', 'deep_lying_playmaker'].indexOf(role) >= 0) {
      FM.PHASES.forEach((ph) => { if (side(FM.phasePos(team, p, ph)) > 0.24) out.push('A ' + FM.ROLES[role].name.toLowerCase() + ' works in the middle, but he is wide in ' + PHASE_SHORT[ph] + '.'); });
    }
    if (role === 'false_9') {
      const fin = FM.phasePos(team, p, 'final');
      const front = team.players.filter((q) => q !== p && ['ST', 'WF', 'AM'].indexOf(q.group) >= 0).map((q) => FM.phasePos(team, q, 'final').d);
      if (front.length && fin.d >= Math.max.apply(null, front) - 0.02) out.push('A false 9 drops off the front line, but he is the most advanced player in the final third.');
    }
    return out;
  };
  FM.teamProblems = (team) => team.players.map((p) => ({ p, list: FM.checkPlayer(team, p) })).filter((x) => x.list.length);
})();
