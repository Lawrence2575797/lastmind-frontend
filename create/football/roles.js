// Roles: what kind of player this is. A role sets the instructions he usually carries (see instructions.js) and a small default shift in
// each phase. Where a player stands in a phase is placed by hand on that phase's board, so there are no roles that exist only to put a
// player somewhere (a libero, an inverted full-back, a false 9): those are done by placing him there. Roles that remain differ in behaviour.
// Each role has a movement rule for each phase the player can be in.
// All offsets are in TEAM space (see formations.js), as fractions of the pitch.
//   depth      shift forward (+) or back (-) from the formation slot
//   width      push away from the centre line (+) or towards it (-)
//   wTarget    instead of a shift, move to this width (0 to 0.5, mirrored per side)
//   ballPull   how strongly this player is drawn toward the ball, added to the position's base pull
// `inPoss` applies when the team has the ball, `outPoss` when it does not.
// Transition phases are layered on top of these later.
(function () {
  const FM = (window.FM = window.FM || {});
  const P = (depth, width, ballPull, wTarget) => ({ depth: depth || 0, width: width || 0, ballPull: ballPull || 0, wTarget: wTarget == null ? null : wTarget });

  FM.ROLES = {
    // Goalkeeper
    goalkeeper:     { name: 'Goalkeeper', groups: ['GK'], desc: 'Standard. Stays close to the six-yard box, handles shots and crosses, plays simple distribution.', inPoss: P(0, 0, 0), outPoss: P(0, 0, 0) },
    sweeper_keeper: { name: 'Sweeper Keeper', groups: ['GK'], desc: 'More aggressive. Starts higher, sweeps up through-balls, and joins build-up as an extra passing option.', inPoss: P(0.14, 0, 0.3), outPoss: P(0.09, 0, 0.3) },

    // Centre-half
    centre_half:      { name: 'Centre-Half', groups: ['CB'], desc: 'Standard. Holds the defensive line, marks the striker, wins headers.', inPoss: P(0.03, 0, 0), outPoss: P(0, 0, 0), options: { stepUp: { label: 'Step up to follow a forward who drops deep', type: 'bool' } } },

    // Full-back
    full_back:           { name: 'Full-Back', groups: ['FB'], desc: 'Balanced. Supports the attack on the flank and tracks back.', inPoss: P(0.14, 0, 0.1), outPoss: P(0, 0, 0) },
    defensive_full_back: { name: 'Defensive Full-Back', groups: ['FB'], desc: 'Stays back, rarely goes forward, keeps the back line compact.', inPoss: P(0.03, 0, 0), outPoss: P(-0.01, 0, 0) },
    attacking_full_back: { name: 'Attacking Full-Back', groups: ['FB'], desc: 'Gets forward often and joins attacks, but still starts from a defensive position.', inPoss: P(0.22, 0.02, 0.1), outPoss: P(0.02, 0, 0) },

    // Defensive midfield
    defensive_midfielder:  { name: 'Defensive Midfielder', groups: ['DM'], desc: 'Standard. Covers space in front of the defence and links to midfield.', inPoss: P(0.04, 0, 0.1), outPoss: P(0, 0, 0.1) },
    anchor:                { name: 'Anchor', groups: ['DM'], desc: 'Screens the back four, rarely leaves his zone, breaks up attacks.', inPoss: P(0, 0, -0.2), outPoss: P(-0.02, 0, -0.2) },
    deep_lying_playmaker:  { name: 'Deep-Lying Playmaker', groups: ['DM'], desc: 'Sits deep and dictates play with long and short passes.', inPoss: P(-0.02, 0, 0.3), outPoss: P(-0.02, 0, 0) },
    ball_winning_midfielder: { name: 'Ball-Winning Midfielder', groups: ['DM', 'CM'], desc: 'Presses hard and tackles aggressively, then passes simply.', inPoss: P(0.02, 0, 0.1), outPoss: P(0.05, 0, 0.5) },

    // Central midfield
    central_midfielder:  { name: 'Central Midfielder', groups: ['CM'], desc: 'Balanced. Takes part in both attack and defence.', inPoss: P(0.08, 0, 0.1), outPoss: P(0, 0, 0.1) },
    box_to_box:          { name: 'Box-to-Box Midfielder', groups: ['CM'], desc: 'Covers huge distances, supports defence, then makes late runs into the box.', inPoss: P(0.22, 0, 0.1), outPoss: P(-0.04, 0, 0.2) },
    advanced_playmaker:  { name: 'Advanced Playmaker', groups: ['CM', 'AM'], desc: 'Plays between the lines and creates chances with through-balls and key passes.', inPoss: P(0.16, 0, 0.3), outPoss: P(0, 0, 0.1) },

    // Wide midfield and attacking midfield
    number_10:       { name: 'Number 10', groups: ['AM'], desc: 'Sits behind the striker, links play, and arrives in the box for chances.', inPoss: P(0.12, 0, 0.1, 0.5), outPoss: P(0, 0, 0.1) },
    shadow_striker:  { name: 'Shadow Striker', groups: ['AM'], desc: 'Runs beyond the striker from deep, attacking space rather than dropping to link.', inPoss: P(0.24, 0, 0, 0.45), outPoss: P(0.02, 0, 0) },

    // Wide forward
    winger:          { name: 'Winger', groups: ['WF', 'AM'], desc: 'Stays wide, beats the full-back, and crosses.', inPoss: P(0.06, 0.08, 0.1), outPoss: P(-0.08, 0.04, 0.1) },
    inside_forward:  { name: 'Inside Forward', groups: ['WF', 'AM'], desc: 'Moves inside quickly to attack the box, finishing more than creating.', inPoss: P(0.14, 0, 0, 0.32), outPoss: P(-0.04, 0, 0.1) },

    // Striker
    striker:          { name: 'Striker', groups: ['ST'], desc: 'Balanced. Leads the line and finishes chances.', inPoss: P(0.06, 0, 0.1), outPoss: P(0, 0, 0.1) },
    poacher:          { name: 'Poacher', groups: ['ST'], desc: "Stays on the last defender's shoulder and in the box, waiting for chances.", inPoss: P(0.12, 0, -0.1), outPoss: P(0.04, 0, -0.1) },
    target_man:       { name: 'Target Man', groups: ['ST'], desc: 'Holds the ball up, wins aerial duels, and brings others into play.', inPoss: P(-0.04, 0, 0.3), outPoss: P(0, 0, 0.1) },
    pressing_forward: { name: 'Pressing Forward', groups: ['ST'], desc: 'Leads the press, closing defenders and goalkeeper down.', inPoss: P(0.05, 0, 0.1), outPoss: P(-0.02, 0, 0.8) },
  };

  FM.rolesForGroup = function (group) {
    return Object.keys(FM.ROLES).filter((id) => FM.ROLES[id].groups.indexOf(group) >= 0);
  };

  // How strongly each kind of position follows the ball by default.
  FM.GROUP_BALL_PULL = { GK: 0.15, CB: 0.55, FB: 0.6, DM: 0.6, CM: 0.65, AM: 0.55, WF: 0.4, ST: 0.35 };
  // How much the team's line height instruction moves each kind of position.
  FM.GROUP_LINE_WEIGHT = { GK: 0, CB: 1, FB: 1, DM: 0.9, CM: 0.8, AM: 0.5, WF: 0.35, ST: 0.2 };
})();
