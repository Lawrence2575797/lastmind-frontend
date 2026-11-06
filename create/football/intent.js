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

  // The triggers a side has: the standard moments at which it goes to win the ball. A trigger the manager has set (trigGK, trigCB, trigFB, trigMid, trigBack, trigTouch, trigTurn,
  // trigLoose, trigLoss: 1 or 0) is used as set; any other follows from the club's style, so every club has a sensible set from the start. Triggers he has drawn on the pitch
  // (a zone, or the ball going to a named kind of player) are checked as well, in FM.pressFired.
  FM.pressTriggersOf = function (team) {
    const t = team.tactics || {}, set = (k, dflt) => (t[k] === 0 || t[k] === 1 ? t[k] === 1 : dflt);
    const pbu = t.pressBuildUp == null ? 0.4 : t.pressBuildUp, pr = t.pressing == null ? 0.5 : t.pressing, cp = t.counterPress == null ? 0.5 : t.counterPress;
    return {
      gk: set('trigGK', pbu >= 0.75), cb: set('trigCB', pbu >= 0.4), fb: set('trigFB', pbu >= 0.3 || pr >= 0.6), mid: set('trigMid', pr >= 0.45),
      back: set('trigBack', pr >= 0.6), touch: set('trigTouch', pr >= 0.5), turn: set('trigTurn', pr >= 0.55), loose: set('trigLoose', true), loss: set('trigLoss', cp >= 0.45),
    };
  };
  FM.PRESS_TRIGGER_LIST = [
    ['trigGK', 'their goalkeeper has it', 'The whole side steps up to win it from the keeper.'],
    ['trigCB', 'a centre-back has it', ''],
    ['trigFB', 'a full-back has it', 'Usually near the touchline, where the way out is short.'],
    ['trigMid', 'it is in the middle third', ''],
    ['trigBack', 'it is played backwards to him', 'A pass back or square says he has nothing forward: the moment to go.'],
    ['trigTouch', 'he is near the touchline', 'The touchline is another defender: he has one way to turn.'],
    ['trigTurn', 'he has his back to the play', 'He cannot see the pitch, and he cannot turn if you are close.'],
    ['trigLoose', 'he takes a heavy touch', 'The ball is away from his feet: nobody waits for that.'],
  ];

  // Does a trigger fire, with this man on the ball? (lostRecently: his side has only just lost the ball.) The manager's own triggers decide first: one that says hold keeps the
  // side in shape, one that says press sends it; otherwise it is the standard set above.
  FM.pressFired = function (defTeam, carrier, lostRecently) {
    if (!carrier) return false;
    const att = defTeam.oppRef, m = defTeam.matchRef, g = carrier.group, ball = m ? m.ball : carrier;
    if (defTeam.rules && defTeam.rules.length && FM.rulesDelta) {
      let near = null, bd = 1e9; defTeam.players.forEach((p) => { if (p.group === 'GK') return; const d = Math.hypot(p.x - ball.x, p.y - ball.y); if (d < bd) { bd = d; near = p; } });
      // only the triggers and zones he drew on the pitch count here (not the settings of who joins in, which say who goes, not when)
      const all = defTeam.rules; defTeam.rules = all.filter((r) => /^pl:(t|z):/.test(String(r.pid || r.id || '')));
      let custom = 0; try { custom = near && defTeam.rules.length ? FM.rulesDelta(defTeam, near, 'closeDown', ball, false) : 0; } finally { defTeam.rules = all; }
      if (custom < 0) return false;
      if (custom > 0) return true;
    }
    const trig = FM.pressTriggersOf(defTeam), d = att ? FM.toTeamSpace(att.attackDir, carrier.x, carrier.y).d : 0.5;
    if ((g === 'GK' && trig.gk) || (g === 'CB' && trig.cb) || (g === 'FB' && trig.fb) || (!!lostRecently && trig.loss) || (trig.mid && d > 0.33 && d < 0.67)) return true;
    if (trig.back && m && m.recv && m.recv.p === carrier && m.recv.back && m.clock - m.recv.t < 3) return true;
    if (trig.touch && Math.min(carrier.y, 68 - carrier.y) < 6) return true;
    if (trig.turn && att && Number.isFinite(carrier.facing) && Math.cos(carrier.facing - (att.attackDir === 1 ? 0 : Math.PI)) < -0.2) return true;
    if (trig.loose && m && m.carrier && m.carrier.player === carrier && Math.hypot(m.ball.x - carrier.x, m.ball.y - carrier.y) > 1.6) return true;
    return false;
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
