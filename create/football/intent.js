// What players do from what they can see, in place of team-wide settings.
//
// Pressing is not a slider. A manager sets triggers: the moments at which his side goes to win the ball (their goalkeeper has it, a centre-back has it, a full-back has it,
// the ball is in the middle third, it has just been lost). Between triggers a side holds its shape and the nearest man only shadows the ball. When a trigger fires, how many
// go, how far, and whether it works come from the match itself: who is near the ball, what each defender leaves open behind him, and how quickly the carrier can get rid of it.
//
// A computer-run club has its triggers worked out once from its style (see FM.pressTriggersOf); the manager's own come from his choices on the pressing page.
(function () {
  const FM = (window.FM = window.FM || {});
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // The triggers a side has. A trigger the manager has set (trigGK, trigCB, trigFB, trigMid, trigLoss: 1 or 0) is used as set; any other follows from the club's style,
  // so every club has a sensible set from the start.
  FM.pressTriggersOf = function (team) {
    const t = team.tactics || {}, set = (k, dflt) => (t[k] === 0 || t[k] === 1 ? t[k] === 1 : dflt);
    const pbu = t.pressBuildUp == null ? 0.4 : t.pressBuildUp, pr = t.pressing == null ? 0.5 : t.pressing, cp = t.counterPress == null ? 0.5 : t.counterPress;
    return { gk: set('trigGK', pbu >= 0.75), cb: set('trigCB', pbu >= 0.4), fb: set('trigFB', pbu >= 0.3 || pr >= 0.6), mid: set('trigMid', pr >= 0.45), loss: set('trigLoss', cp >= 0.45) };
  };

  // Does a trigger fire, with this man on the ball? (lostRecently: his side has only just lost the ball)
  FM.pressFired = function (defTeam, carrier, lostRecently) {
    if (!carrier) return false;
    const trig = FM.pressTriggersOf(defTeam), g = carrier.group;
    const att = defTeam.oppRef, d = att ? FM.toTeamSpace(att.attackDir, carrier.x, carrier.y).d : 0.5;   // how far up the pitch the carrier is, for his own side
    return (g === 'GK' && trig.gk) || (g === 'CB' && trig.cb) || (g === 'FB' && trig.fb) || (!!lostRecently && trig.loss) || (trig.mid && d > 0.33 && d < 0.67);
  };

  // The man who has the ball, as the defending side sees it from the pitch alone: the opponent nearest to it.
  FM.carrierOf = function (defTeam, ball) {
    const att = defTeam.oppRef; if (!att) return null;
    let best = null, bd = 1e9; att.players.forEach((p) => { const d = Math.hypot(p.x - ball.x, p.y - ball.y); if (d < bd) { bd = d; best = p; } });
    return bd < 4 ? best : null;
  };

  // How much a position is worth to the side that holds the ball there: the chance of scoring from it, roughly (the angle and distance, with a man a few metres away),
  // and a little for being far up the pitch. Used to weigh a shot against a pass, and a run against staying put.
  FM.threat = function (dir, x, y) {
    const gx = dir === 1 ? 105 : 0, depth = dir === 1 ? x / 105 : 1 - x / 105;
    const xg = 1 / (1 + Math.exp(-(FM.xgLogit({ ratings: { finishing: 60 }, group: 'CM' }, x, y, dir, 3.5, 0))));
    return 0.75 * xg + 0.04 * depth * depth;
  };
})();
