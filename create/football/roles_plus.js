// More roles. A role is what a player is FOR: where he stands in each phase (roles.js: depth, width, how strongly he is drawn to the ball) and the
// instructions he carries with him (instructions.js: ROLE_INSTR). Every role below is a real, different kind of player; none is only a position, because
// positions now come from roles and the plan's toggles (plan.js), not from dragging shirts about.
//   P(depth, width, ballPull, wTarget): depth is a shift forward (+) or back, width a push out (+) or in, wTarget a width to move to (0 to 0.5, mirrored by side).
(function () {
  const FM = (window.FM = window.FM || {});
  const P = (depth, width, ballPull, wTarget) => ({ depth: depth || 0, width: width || 0, ballPull: ballPull || 0, wTarget: wTarget == null ? null : wTarget });
  const add = (id, name, groups, desc, inP, outP, instr, tag) => { FM.ROLES[id] = { name, groups, desc, inPoss: inP, outPoss: outP, tag: tag || '' }; if (instr) FM.ROLE_INSTR[id] = instr; };

  // Goalkeeper
  add('ball_playing_gk', 'Ball-Playing Goalkeeper', ['GK'], 'Comfortable with the ball at his feet: takes passes back, plays short and finds the free man instead of kicking long.', P(0.02, 0, 0.1), P(0.02, 0, 0), { distribution: -1, passing: -1, risk: 1 }, 'Starts the move');
  add('line_keeper', 'Line Keeper', ['GK'], 'Stays on his line and is at his best saving shots. Rarely comes for crosses, and kicks it long.', P(0, 0, 0), P(-0.01, 0, 0), { distribution: 1 }, 'Shot-stopper');

  // Centre-backs
  add('ball_playing_cb', 'Ball-Playing Centre-Back', ['CB'], 'Steps out with the ball and picks a forward pass instead of clearing. Good on the ball, a little more exposed.', P(0.07, 0, 0.1), P(0, 0, 0), { passing: 1, risk: 1 }, 'Starts attacks');
  add('stopper', 'Stopper', ['CB'], 'Steps up to meet the forward before he can turn, and tackles. Leaves space behind him.', P(0.03, 0, 0.1), P(0.03, 0, 0.2), { closeDown: 1, tackle: 1, stepUp: 1 }, 'Aggressive');
  add('cover_cb', 'Covering Centre-Back', ['CB'], 'Plays a step behind his partner and sweeps up what gets past. Slower to close down, safer behind.', P(0.01, 0, -0.1), P(-0.03, 0, -0.1), { closeDown: -1, depth: -1, stepUp: -1 }, 'Sweeper');
  add('no_nonsense_cb', 'No-Nonsense Centre-Back', ['CB'], 'Clears his lines and wins his headers. Never takes a risk on the ball.', P(0, 0, 0), P(0, 0, 0), { passing: -1, risk: -1, dribble: -1, tackle: 1 }, 'Safe');

  add('libero', 'Libero', ['CB'], 'A sweeper who plays behind the line when the other side has the ball, then steps out of it with the ball and carries it into midfield to start the move.', P(0.16, 0, 0.3), P(-0.06, 0, -0.1), { position: 1, passing: 1, risk: 1, closeDown: -1 }, 'Sweeper who carries it');
  add('wide_cb', 'Overlapping Centre-Back', ['CB'], 'Plays as the wide one of a back three and goes up the flank when the team has the ball, then recovers into the line.', P(0.12, 0.05, 0.2), P(0, 0.02, 0.1), { width: 1, runs: 1, passing: 1 }, 'Back-three runner');

  // Full-backs
  add('wing_back', 'Wing-Back', ['FB'], 'Plays as the whole width of the pitch: high up the touchline in attack, back down it in defence.', P(0.3, 0.03, 0.1), P(0.06, 0.02, 0), { width: 1, depth: 1, runs: 1, dribble: 1 }, 'Whole flank');
  add('inverted_full_back', 'Inverted Full-Back', ['FB'], 'Steps inside into midfield when the team has the ball, to help keep it and shield against counters.', P(0.1, 0, 0.1, 0.3), P(0, 0, 0), { risk: -1, passing: -1 }, 'Comes inside');
  add('pressing_full_back', 'Pressing Full-Back', ['FB'], 'Steps out aggressively onto the winger when the other side has the ball.', P(0.12, 0, 0.1), P(0.05, 0, 0.4), { closeDown: 1, tackle: 1 }, 'Aggressive');
  add('complete_wing_back', 'Complete Wing-Back', ['FB'], 'Does every job on the flank: overlaps, underlaps, crosses and tracks back, and is rarely out of breath.', P(0.26, 0.03, 0.2), P(0.04, 0.02, 0.1), { width: 1, depth: 1, runs: 1, dribble: 1, closeDown: 1 }, 'Does everything');
  add('holding_wing_back', 'Holding Wing-Back', ['FB'], 'A wing-back who keeps the width but stays deeper, joining the attack only when it is safe.', P(0.1, 0.03, 0), P(0.01, 0.02, 0), { width: 1, runs: -1, risk: -1 }, 'Wide but disciplined');
  add('inside_wing_back', 'Inside Wing-Back', ['FB'], 'A wing-back who starts wide but moves into the middle of the pitch to overload midfield when the team has the ball.', P(0.22, 0, 0.2, 0.28), P(0.02, 0, 0), { position: 1, passing: 1 }, 'Wide then inside');
  add('playmaking_full_back', 'Playmaking Full-Back', ['FB'], 'Plays like a midfielder from the back: takes the ball short and picks passes.', P(0.12, -0.02, 0.3), P(0, 0, 0), { passing: 1, risk: 1, position: 1 }, 'Creator');

  // Defensive midfield
  add('half_back', 'Half-Back', ['DM'], 'Drops between the centre-backs to make a back three when the team builds, and shields them when it does not.', P(-0.08, 0, 0.1), P(-0.04, 0, 0), { depth: -1, risk: -1, closeDown: -1 }, 'Drops in');
  add('segundo_volante', 'Segundo Volante', ['DM'], 'A holding midfielder who breaks forward late into the box when the attack is on.', P(0.2, 0, 0.1), P(-0.01, 0, 0.2), { runs: 1, shoot: 1 }, 'Late runner');
  add('regista', 'Regista', ['DM'], 'A deep playmaker with licence to roam. Wants the ball all the time and passes long and ambitiously.', P(-0.01, 0, 0.5), P(-0.02, 0, 0.1), { position: 1, risk: 1, passing: 1, closeDown: -1 }, 'Deep creator');

  add('volante', 'Volante', ['DM'], 'A holding midfielder who carries the ball forward himself, breaking the first line, before passing.', P(0.1, 0, 0.3), P(-0.01, 0, 0.1), { dribble: 1, position: 1, runs: 1 }, 'Carries it forward');
  add('metodista', 'Metodista', ['DM', 'CM'], 'The team\'s metronome: always available, plays the simple pass and keeps the shape in the middle of the pitch.', P(0, 0, 0.4), P(-0.01, 0, 0.1), { risk: -1, passing: -1, position: -1 }, 'Keeps the tempo');

  // Central midfield
  add('mezzala', 'Mezzala', ['CM'], 'Drifts into the channel between the full-back and the centre-back and runs there with and without the ball.', P(0.16, 0.05, 0.1, 0.22), P(0, 0, 0.2), { runs: 1, dribble: 1, shoot: 1 }, 'Half-space runner');
  add('central_winger', 'Central Winger', ['CM', 'AM'], 'A central midfielder who drifts wide to deliver crosses and take players on, leaving the middle to the others.', P(0.1, 0.06, 0.1), P(0, 0.03, 0.2), { width: 1, dribble: 1, runs: 1 }, 'Drifts wide');
  add('carrilero', 'Carrilero', ['CM'], 'Shuttles across the pitch to cover the flank and let the full-back go. Wins it, passes simply.', P(0.04, 0.04, 0.2), P(0, 0.03, 0.3), { closeDown: 1, risk: -1, passing: -1 }, 'Shuttler');
  add('roaming_playmaker', 'Roaming Playmaker', ['CM'], 'Looks for the ball all over the pitch and sets the tempo from wherever he finds it.', P(0.08, 0, 0.6), P(0, 0, 0.3), { position: 1, risk: 1 }, 'Free creator');
  add('midfield_enforcer', 'Midfield Enforcer', ['CM', 'DM'], 'Hunts the ball, tackles hard and gives it to someone better. Picks up bookings.', P(0.02, 0, 0.1), P(0.04, 0, 0.5), { closeDown: 1, tackle: 1, risk: -1, marking: 1 }, 'Ball-winner');

  add('second_striker', 'Second Striker', ['AM', 'ST'], 'Plays just behind the main striker, linking up with him and arriving in the box for the loose ball.', P(0.16, 0, 0.1, 0.5), P(0.03, 0, 0), { runs: 1, shoot: 1, holdUp: 1 }, 'Alongside the striker');

  // Attacking midfield
  add('trequartista', 'Trequartista', ['AM'], 'A free creator who does no defending: finds space between the lines and wants every chance for himself.', P(0.14, 0, 0.1, 0.5), P(0.05, 0, 0), { position: 1, risk: 1, dribble: 1, shoot: 1, closeDown: -1 }, 'Free role');
  add('enganche', 'Enganche', ['AM'], 'A static playmaker: stands in his pocket of space and lets the team play to him, then threads the pass.', P(0.06, 0, 0.3, 0.5), P(0, 0, -0.1), { position: -1, risk: 1, closeDown: -1 }, 'Pocket playmaker');
  add('wide_playmaker', 'Wide Playmaker', ['AM', 'WF'], 'Starts wide and drifts infield to create, leaving the flank to the full-back.', P(0.1, 0, 0.2, 0.28), P(-0.02, 0, 0.1), { position: 1, risk: 1 }, 'Drifts in');

  // Wide forwards
  add('inverted_winger', 'Inverted Winger', ['WF'], 'Starts wide on his weaker side and cuts inside to shoot or play the pass.', P(0.12, 0, 0, 0.3), P(-0.04, 0, 0.1), { dribble: 1, shoot: 1 }, 'Cuts in');
  add('raumdeuter', 'Raumdeuter', ['WF'], 'Searches for space behind the defence off the ball, with little interest in the ball itself.', P(0.18, 0, -0.1, 0.34), P(0, 0, 0), { runs: 1, shoot: 1, closeDown: -1, dribble: -1 }, 'Space finder');
  add('defensive_winger', 'Defensive Winger', ['WF'], 'Works back to double up on the full-back, then runs the flank on the counter.', P(0.02, 0.05, 0.1), P(-0.14, 0.02, 0.3), { closeDown: 1, depth: -1, tackle: 1 }, 'Tracks back');
  add('wide_forward', 'Wide Forward', ['WF'], 'Stays high and wide on the touchline, stretching the defence and attacking the full-back with pace.', P(0.14, 0.06, -0.05), P(-0.05, 0.03, 0), { width: 1, runs: 1, dribble: 1, closeDown: -1 }, 'Stretches the pitch');
  add('wide_target', 'Wide Target Man', ['WF'], 'A big winger who holds the ball up on the flank and attacks crosses from the far side.', P(0.04, 0.03, 0.2), P(-0.04, 0, 0.1), { holdUp: 1, runs: -1, cornerAtt: 1 }, 'Aerial wide man');

  // Strikers
  add('false_nine', 'False Nine', ['ST'], 'Drops deep into midfield to link play and pull a centre-back out of the line.', P(-0.14, 0, 0.5), P(-0.02, 0, 0.1), { position: 1, risk: 1, passing: 1, shoot: -1 }, 'Drops deep');
  add('complete_forward', 'Complete Forward', ['ST'], 'Does everything: holds it up, runs in behind, dribbles and scores.', P(0.04, 0, 0.3), P(0, 0, 0.2), { holdUp: 1, runs: 1, dribble: 1, shoot: 1 }, 'All-round');
  add('deep_lying_forward', 'Deep-Lying Forward', ['ST'], 'Drops off the defenders to receive and lay the ball off, bringing the runners past him.', P(-0.08, 0, 0.4), P(0, 0, 0.1), { holdUp: 1, passing: -1, risk: 1 }, 'Link player');
  add('advanced_forward', 'Advanced Forward', ['ST'], 'Lives on the last defender, running the channels and the space behind them.', P(0.1, 0, -0.1), P(0.02, 0, 0), { runs: 1, shoot: 1, closeDown: -1 }, 'Runs in behind');
  add('channel_forward', 'Channel Forward', ['ST'], 'Pulls out to the flank to run the channel between full-back and centre-back, and crosses from there.', P(0.06, 0.08, 0.2), P(0, 0, 0.1), { runs: 1, dribble: 1 }, 'Wide runner');
})();
