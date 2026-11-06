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
    // The three below are read by the man who would go: the defender who can get to the ball carrier soonest.
    const opps = att ? att.players : [], presser = defTeam.players.filter((p) => p.group !== 'GK').reduce((b, p) => (!b || FM.timeTo(p, carrier.x, carrier.y) < FM.timeTo(b, carrier.x, carrier.y) ? p : b), null);
    if (!presser || FM.timeTo(presser, carrier.x, carrier.y) > 4) return false;   // nobody is close enough in time to make anything of it
    // against the touchline: he has few ways out, and the line is as good as a second defender
    if (trig.touch && FM.escapeShare(defTeam.players, carrier) <= 0.4) return true;
    // his back to the play: he cannot see the man coming and cannot turn if he is already close
    if (trig.turn && FM.unsightedBy(presser, carrier) && FM.timeTo(presser, carrier.x, carrier.y) < 2.2) return true;
    // a heavy touch: the presser judges it, from where the ball is against the carrier's feet and his own way to it
    if (trig.loose && m && m.carrier && m.carrier.player === carrier && FM.touchLooksHeavy(presser, carrier, m.ball, m.rng)) return true;
    return false;
  };

  // ---------- seeing the game ----------
  // Distances in the game's own terms: how long it takes to get somewhere. A man runs at about four fifths of his top speed once he has to get going, and a pass travels at about
  // twenty metres a second, so "can he get there" and "is he free" are questions about seconds, and a quicker man simply sees more as winnable than a slower one.
  const speedOf = (p) => Math.max(4, (p && p.maxSpeed) || 7);
  FM.BALL_SPEED = 20;
  FM.timeTo = (p, x, y) => Math.max(0, Math.hypot(p.x - x, p.y - y) - 0.7) / (0.82 * speedOf(p));
  // How hard the man on the ball is squeezed: each opponent counts for how soon he can be on him (a man a second away counts a lot, three seconds away hardly at all).
  FM.pressureOf = function (opps, carrier) {
    let sum = 0; opps.forEach((o) => { if (o.group === 'GK') return; sum += Math.exp(-FM.timeTo(o, carrier.x, carrier.y) / 0.9); });
    return sum;
  };
  // How much time the man on the ball has before the nearest opponent is on him.
  FM.timeFree = (opps, carrier) => opps.reduce((m, o) => (o.group === 'GK' ? m : Math.min(m, FM.timeTo(o, carrier.x, carrier.y))), 9);
  // The share of ways out he has: of sixteen directions, those in which he can get a few steps away before any opponent can close the gap, and stay on the pitch. A man with
  // his back to the touchline and a defender in front of him has few; a man in the open has most. This is what a defender reads as "he is pinned".
  FM.escapeShare = function (opps, carrier) {
    const stepLen = 0.82 * speedOf(carrier) * 0.8, stepT = 0.8; let free = 0;
    for (let k = 0; k < 16; k++) {
      const a = k * Math.PI / 8, x = carrier.x + Math.cos(a) * stepLen, y = carrier.y + Math.sin(a) * stepLen;
      if (x < 0.5 || x > 104.5 || y < 0.5 || y > 67.5) continue;
      if (opps.every((o) => o.group === 'GK' || FM.timeTo(o, x, y) > stepT)) free++;
    }
    return free / 16;
  };
  // What one defender makes of the ball at the carrier's feet. A touch is heavy when the man has to go and get the ball (it is further from him than he can control it from, in the
  // time it takes him to reach it); it is winnable when this defender can get there clearly before the carrier does. Nobody reads it exactly: the less composed the defender,
  // the more his judgement wanders.
  FM.touchLooksHeavy = function (presser, carrier, ball, rng) {
    const read = (v) => v * (1 + (rng() - 0.5) * 0.5 * (1 - ((presser.ratings && presser.ratings.composure) || 60) / 110));
    const carrierT = read(FM.timeTo(carrier, ball.x, ball.y)), presserT = read(FM.timeTo(presser, ball.x, ball.y));
    return carrierT > 0.32 && presserT < carrierT - 0.12;
  };
  // Is the carrier's back to this defender? He cannot see him coming if the defender is behind the line of his shoulders.
  FM.unsightedBy = function (presser, carrier) {
    if (!Number.isFinite(carrier.facing)) return false;
    const to = Math.atan2(presser.y - carrier.y, presser.x - carrier.x);
    return Math.cos(carrier.facing - to) < -0.3;
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
