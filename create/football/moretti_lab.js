// The Analysis lessons. Francesco looks at the last match, finds the problem that mattered most, and teaches the maths behind it twice:
// first on the match just played (a worked example, in his own words), then as a drill against the next opponent, where the manager works it out,
// drags players on a pitch, and runs a short simulation of the moment (it is not a real-time game and changes nothing in a match until a change is applied).
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const L = 105, W = 68, V_BALL = 16, V_RUN = 7, V_COUNTER = 8, REACT = 0.4, BOX = 16.5;
  const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1), f2 = (n) => (Math.round(n * 100) / 100).toFixed(2);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lines = (arr) => arr.map((t) => `<p>${t}</p>`).join('');
  const nm = (o) => '#' + o.p.number + ' ' + ((o.p.name || '').split(' ').slice(1).join(' ') || o.p.name || '');

  // ---------- geometry ----------
  function segInfo(A, B, C) {
    const dx = B.x - A.x, dy = B.y - A.y, d2 = dx * dx + dy * dy || 1, t = clamp(((C.x - A.x) * dx + (C.y - A.y) * dy) / d2, 0, 1);
    const p = { x: A.x + t * dx, y: A.y + t * dy };
    return { t, d: dist(p, C), p };
  }
  // could this defender be on the ball's path before the ball is? He reacts, then runs; the ball just travels.
  function intercept(A, B, C) {
    const D = dist(A, B);
    for (let i = 1; i <= 50; i++) {
      const t = i / 50, p = { x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t }, tb = t * D / V_BALL, td = REACT + dist(C, p) / V_RUN;
      if (td <= tb) return { t, p, tb, td };
    }
    return null;
  }

  // ---------- where everyone stands (metres: x along the pitch from our goal, y across) ----------
  function squad(team, phase, theirs) {
    return team.players.map((p, i) => { const q = FM.phasePos(team, p, phase); return theirs ? { p, id: 't' + i, x: (1 - q.d) * L, y: (1 - q.w) * W } : { p, id: 'o' + i, x: q.d * L, y: q.w * W }; });
  }

  // ---------- the lessons ----------
  // Each has: title, scenario(me, opp, tier) -> S, steps(S, level) -> [..], run(S) -> {dur, at(t), ok, text}, apply(S, lg) and a worked-example voice.
  const LESSONS = {};

  LESSONS.build = {
    title: 'Playing out from the back',
    view: [0, 62],
    scenario(me, opp) {
      const ours = squad(me, 'build', false), theirs = squad(opp, 'press', true);
      const cands = ours.filter((o) => ['CB', 'FB', 'DM'].indexOf(o.p.group) >= 0);
      let best = null;
      (cands.length ? cands : ours).forEach((c, ci) => ours.forEach((o, oi) => {
        if (o === c || o.p.group === 'GK') return; const d = dist(c, o); if (d < 8 || d > 30 || o.x - c.x < 0) return;
        const w = theirs.filter((t) => t.p.group !== 'GK').reduce((m, t) => Math.min(m, segInfo(c, o, t).d), 99);
        const open = ours.filter((q) => q !== c && q.p.group !== 'GK' && dist(c, q) > 8 && dist(c, q) < 40 && theirs.every((t) => segInfo(c, q, t).d > 4)).length;
        const sc = (w < 4 ? 20 : 0) - open * 3 + (o.x - c.x) * 0.1 - w;
        if (!best || sc > best.sc) best = { sc, c, o };
      }));
      const S = { ours, theirs, passer: ours.indexOf(best.c), target: ours.indexOf(best.o), draggable: true, pickTarget: true, view: [0, 62], zone: 'build' };
      return S;
    },
    nearest(S) { const A = S.ours[S.passer], B = S.ours[S.target]; let w = null; S.theirs.forEach((c) => { if (c.p.group === 'GK') return; const s = segInfo(A, B, c); if (!w || s.d < w.d) w = { c, d: s.d, t: s.t, p: s.p }; }); return w; },
    steps(S, level) {
      const me = this, A = () => S.ours[S.passer], B = () => S.ours[S.target], Dd = () => dist(A(), B()), w = () => me.nearest(S);
      const tb = () => Dd() / V_BALL;
      const common = [];
      if (level === 'gcse') {
        common.push({
          skills: ['pythagoras'], unit: 'm', tol: 0.8, answer: () => Dd(),
          ask: () => ['Click ' + nm(A()) + ' and ' + nm(B()) + ' on the pitch to see where each one stands.', 'A position is two numbers: metres from our goal, and metres across from the touchline.', 'How long is the pass between them?'],
          hint: () => ['Make a right-angled triangle. One side is how far apart they are along the pitch, the other is how far apart across it.', 'The pass is the long side.'],
          worked: () => 'The ball goes from ' + nm(A()) + ' at (' + f1(A().x) + ', ' + f1(A().y) + ') to ' + nm(B()) + ' at (' + f1(B().x) + ', ' + f1(B().y) + '). Across and along make a right-angled triangle, so the pass is the square root of ' + f1(B().x - A().x) + '² + ' + f1(B().y - A().y) + '², which is ' + f1(Dd()) + ' m.',
          why: () => ['That is Pythagoras at work. Nearly every distance on a pitch is one.', 'Every pass you ever look at starts here.'],
        });
        common.push({
          skills: ['speed-distance-time'], unit: 's', tol: 0.12, answer: () => tb(),
          ask: () => ['A firm ground pass travels at about ' + V_BALL + ' metres every second.', 'How long does the ball take to arrive?'],
          hint: () => ['Time is distance divided by speed.', 'You have just worked out the distance.'],
          worked: () => 'A firm pass travels at about ' + V_BALL + ' m/s, so ' + f1(Dd()) + ' m takes ' + f2(tb()) + ' seconds.',
          why: () => ['That little number matters more than it looks.', 'It is how long the other side has to do something about it.'],
        });
        common.push({
          skills: ['coordinate-geometry', 'pythagoras'], unit: 'm', tol: 0.9, answer: () => w().d,
          ask: () => ['Look at the shirts in the way, then pick the one whose circle the passing line comes closest to.', 'How far is the middle of that defender from the passing line?'],
          hint: () => ['The shortest distance from a point to a line is the one that meets it at a right angle.', 'Slide along the line until you are level with him, then measure straight across.'],
          worked: () => 'The defender who worries me is ' + nm(w().c) + '. The shortest way from him to the line meets it at a right angle, and that distance is ' + f1(w().d) + ' m.',
          why: () => ['That right-angle idea is the heart of coordinate geometry.', 'You will use it for lines, circles and later for vectors.'],
        });
        common.push({
          skills: ['speed-distance-time', 'reasoning'], unit: 'm', tol: 0.9, answer: () => Math.max(0, (w().t * tb() - REACT) * V_RUN),
          ask: () => ['He needs ' + REACT + ' of a second to react, then he runs at ' + V_RUN + ' m/s.', 'The ball reaches the point of the line nearest him after ' + f2(w().t * tb()) + ' s.', 'How far can he run before the ball gets there?'],
          hint: () => ['Take his reaction time off the time the ball takes, then multiply by his speed.'],
          worked: () => 'The ball reaches the spot nearest him after ' + f2(w().t * tb()) + ' s. Take off ' + REACT + ' s to react and he has ' + f2(Math.max(0, w().t * tb() - REACT)) + ' s to run at ' + V_RUN + ' m/s, so he can cover ' + f1(Math.max(0, (w().t * tb() - REACT) * V_RUN)) + ' m.',
          why: () => ['That is his reach: the radius of the dashed circle round him.', 'Anything the ball passes through inside it can be cut out.'],
        });
      } else {
        common.push({
          skills: ['vectors'], unit: 'm', tol: 0.8, answer: () => Dd(),
          ask: () => ['Click ' + nm(A()) + ' and ' + nm(B()) + ' to see their positions as coordinates.', 'The pass is a vector, d = B − A. Its length is the distance of the pass.', 'How long is the pass?'],
          hint: () => ['Write d as (change in x, change in y).', 'Its magnitude is √(x² + y²).'],
          worked: () => 'The pass is the vector d = (' + f1(B().x - A().x) + ', ' + f1(B().y - A().y) + '). Its magnitude is √(' + f1(B().x - A().x) + '² + ' + f1(B().y - A().y) + '²) = ' + f1(Dd()) + ' m.',
          why: () => ['Writing the pass as a vector lets us describe every point along it with one letter, t.'],
        });
        common.push({
          skills: ['speed-distance-time', 'vectors'], unit: 's', tol: 0.12, answer: () => tb(),
          ask: () => ['The ball travels at about ' + V_BALL + ' m/s.', 'How long does it take to arrive?'],
          hint: () => ['Time = distance ÷ speed.'],
          worked: () => 'At ' + V_BALL + ' m/s the ball takes ' + f2(tb()) + ' s.',
          why: () => ['Keep that time. The whole question is whether a defender can be on the line before the ball is.'],
        });
        common.push({
          skills: ['differentiation', 'indices', 'dot-product'], unit: '', tol: 0.06, answer: () => w().t,
          ask: () => {
            const C = w().c, A0 = A(), d = { x: B().x - A0.x, y: B().y - A0.y };
            return ['Every point on the pass is r(t) = A + t·d, with t from 0 (passer) to 1 (receiver).', 'The defender ' + nm(C) + ' stands at (' + f1(C.x) + ', ' + f1(C.y) + ').', 'The square of his distance from the ball is f(t) = |A + t·d − C|².', 'Expand it, differentiate with respect to t, and set the derivative to zero.', 'At what value of t is the ball closest to him?'];
          },
          hint: () => ['f(t) = |d|²t² + 2((A − C)·d)t + |A − C|².', 'Differentiating gives 2|d|²t + 2(A − C)·d, so t = −(A − C)·d ÷ |d|².', 'Keep t between 0 and 1.'],
          worked: () => 'Write the square of his distance as f(t) = |d|²t² + 2((A − C)·d)t + |A − C|². Differentiate: f′(t) = 2|d|²t + 2(A − C)·d. Set that to zero and the ball is closest at t = ' + f2(w().t) + '.',
          why: () => ['You have just used differentiation to find where two things are nearest.', 'The t² and t terms are indices doing quiet work: the power rule turns t² into 2t.'],
        });
        common.push({
          skills: ['surds', 'reasoning'], unit: 'm', tol: 0.9, answer: () => w().d,
          ask: () => ['Put that value of t back into f(t) and take the square root.', 'How close does the ball get to him?'],
          hint: () => ['Substitute t, then √f(t) is the distance.'],
          worked: () => 'Put t = ' + f2(w().t) + ' back into f and take the square root: the ball passes ' + f1(w().d) + ' m from ' + nm(w().c) + '.',
          why: () => ['A square root of a quadratic is the distance formula wearing different clothes.'],
        });
        common.push({
          skills: ['speed-distance-time', 'reasoning'], unit: 'm', tol: 0.9, answer: () => Math.max(0, (w().t * tb() - REACT) * V_RUN),
          ask: () => ['He needs ' + REACT + ' s to react, then runs at ' + V_RUN + ' m/s.', 'The ball reaches that closest point after t × (ball time) = ' + f2(w().t * tb()) + ' s.', 'How far can he run before it gets there?'],
          hint: () => ['Time left to run = ball time − reaction. Then multiply by his speed.'],
          worked: () => 'The ball is at that point after ' + f2(w().t * tb()) + ' s. After his ' + REACT + ' s reaction he can run for ' + f2(Math.max(0, w().t * tb() - REACT)) + ' s and cover ' + f1(Math.max(0, (w().t * tb() - REACT) * V_RUN)) + ' m.',
          why: () => ['So his reach is that distance. If it is more than the gap to the line, he gets there.'],
        });
      }
      common.push({
        choice: ['He gets there', 'The pass gets through'], answer: () => (intercept(A(), B(), w().c) || SCORE_CUT(S) ? 'He gets there' : 'The pass gets through'), skills: ['reasoning'],
        ask: () => ['Compare the two numbers: how far he is from the line, and how far he can run.', 'Does the pass get through?'],
        hint: () => ['If he is closer than he can run, he is there before the ball.'],
        worked: () => (SCORE_CUT(S) ? 'He is ' + f1(w().d) + ' m from the line and can run ' + f1(Math.max(0, (w().t * tb() - REACT) * V_RUN)) + ' m, so he is there first. The pass is cut out.' : 'He is ' + f1(w().d) + ' m from the line and cannot run that far in time, so the pass gets through.'),
        why: () => ['That is the whole decision a defender makes in half a second.', 'You can now make it for him, before the match.'],
      });
      common.push({
        drag: true, skills: ['reasoning'],
        ask: () => ['Now put it right.', 'Drag any of our players, or click a different team-mate to pass to, until you think the ball gets through.', 'Then press Try the pass and watch what the defenders do.'],
        why: () => ['Their circles do not move until the ball is played; then they run for the line, and you can see who gets there.'],
      });
      return common;
    },
    run(S) {
      const A = S.ours[S.passer], B = S.ours[S.target], D = dist(A, B) || 1, Tb = D / V_BALL;
      let first = null;
      S.theirs.forEach((c, i) => { if (c.p.group === 'GK') return; const ic = intercept(A, B, c); if (ic && (!first || ic.tb < first.ic.tb)) first = { i, ic }; });
      const stop = first ? first.ic.tb : Tb;
      const goal = S.theirs.map((c, i) => (first && first.i === i ? first.ic.p : segInfo(A, B, c).p));
      const at = (t) => ({
        ours: S.ours.map((o) => ({ x: o.x, y: o.y })),
        theirs: S.theirs.map((c, i) => { const T = goal[i], d = dist(c, T), m = Math.min(d, V_RUN * Math.max(0, t - REACT)), k = d ? m / d : 0; return { x: c.x + (T.x - c.x) * k, y: c.y + (T.y - c.y) * k }; }),
        ball: (() => { const f = Math.min(1, Math.min(t, stop) * V_BALL / D); return { x: A.x + (B.x - A.x) * f, y: A.y + (B.y - A.y) * f }; })(),
      });
      return { dur: stop + 0.9, at, ok: !first, text: first ? nm(S.theirs[first.i]) + ' is on the line after ' + f2(stop) + ' s and the pass is cut out. Try moving the receiver out of his reach, or change who you pass to.' : 'Nobody can get to the line before the ball. The pass arrives after ' + f2(Tb) + ' s.' };
    },
    apply(S, lg) {
      const me = FM.teamById(lg, lg.userId), o = S.ours[S.target]; FM.setPhasePos(me, o.p, 'build', { d: clamp(o.x / L, 0.03, 0.97), w: clamp(o.y / W, 0.04, 0.96) });
      return nm(o) + ' now starts at (' + f1(o.x) + ', ' + f1(o.y) + ') when we build from the back.';
    },
  };
  const SCORE_CUT = (S) => { const A = S.ours[S.passer], B = S.ours[S.target]; return S.theirs.some((c) => c.p.group !== 'GK' && intercept(A, B, c)); };

  // a striker who has his back to goal: can someone get to him before the defender wins it?
  LESSONS.holdup = {
    title: 'Holding the ball up front',
    scenario(me, opp) {
      const ours = squad(me, 'final', false), theirs = squad(opp, 'without', true);
      const st = ours.filter((o) => o.p.group === 'ST').sort((a, b) => b.x - a.x)[0] || ours.slice().sort((a, b) => b.x - a.x)[0];
      const def = theirs.filter((t) => t.p.group !== 'GK').sort((a, b) => dist(a, st) - dist(b, st))[0];
      const sup = ours.filter((o) => o !== st && o.p.group !== 'GK' && o.p.group !== 'CB').sort((a, b) => dist(a, st) - dist(b, st))[0];
      return { ours, theirs, striker: ours.indexOf(st), def: theirs.indexOf(def), sup: ours.indexOf(sup), draggable: true, view: [38, 105], zone: 'final' };
    },
    steps(S, level) {
      const st = () => S.ours[S.striker], df = () => S.theirs[S.def], sp = () => S.ours[S.sup];
      const dS = () => dist(st(), sp()), dD = () => dist(st(), df()), tS = () => dS() / V_RUN, tD = () => REACT + dD() / V_RUN;
      const angle = () => { const u = { x: sp().x - st().x, y: sp().y - st().y }, v = { x: df().x - st().x, y: df().y - st().y }; return Math.acos(clamp((u.x * v.x + u.y * v.y) / ((Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y)) || 1), -1, 1)) * 180 / Math.PI; };
      const out = [
        { skills: ['pythagoras'], unit: 'm', tol: 0.8, answer: () => dS(), ask: () => ['The ball is played up to ' + nm(st()) + ', who has his back to goal.', nm(sp()) + ' is the nearest team-mate who can come and help.', 'Click them both. How far apart are they?'], hint: () => ['Right-angled triangle again: along the pitch and across it.'], worked: () => nm(st()) + ' is at (' + f1(st().x) + ', ' + f1(st().y) + ') and ' + nm(sp()) + ' is at (' + f1(sp().x) + ', ' + f1(sp().y) + '). The gap is ' + f1(dS()) + ' m.', why: () => ['Every support run starts with a distance.'] },
        { skills: ['speed-distance-time'], unit: 's', tol: 0.15, answer: () => tS(), ask: () => [nm(sp()) + ' runs at about ' + V_RUN + ' m/s.', 'How long does he take to reach the striker?'], hint: () => ['Time = distance ÷ speed.'], worked: () => 'At ' + V_RUN + ' m/s he needs ' + f2(tS()) + ' s.', why: () => ['That is the time the striker has to survive on his own.'] },
        { skills: ['speed-distance-time'], unit: 's', tol: 0.15, answer: () => tD(), ask: () => ['The defender ' + nm(df()) + ' is ' + f1(dD()) + ' m behind the striker.', 'He needs ' + REACT + ' s to react and then runs at ' + V_RUN + ' m/s.', 'How long before he is on the striker?'], hint: () => ['Add his reaction time to distance ÷ speed.'], worked: () => nm(df()) + ' is ' + f1(dD()) + ' m away. ' + REACT + ' s to react plus ' + f2(dD() / V_RUN) + ' s to run is ' + f2(tD()) + ' s.', why: () => ['So the striker is safe for just over that long.'] },
        { choice: ['Our team-mate', 'The defender'], skills: ['reasoning'], answer: () => (tS() < tD() ? 'Our team-mate' : 'The defender'), ask: () => ['Who gets there first?'], hint: () => ['Compare the two times.'], worked: () => (tS() < tD() ? 'Our team-mate arrives first, so the striker can lay it off.' : 'The defender arrives first. The striker is alone and loses it.'), why: () => ['That comparison is the whole of "hold-up play".'] },
        level === 'gcse'
          ? { skills: ['trigonometry'], unit: '°', tol: 6, answer: () => Math.atan2(Math.abs(sp().y - st().y), Math.abs(sp().x - st().x)) * 180 / Math.PI, ask: () => ['The lay-off goes from the striker to his team-mate.', 'How many degrees is that line from the pitch\'s length? Use the sides of the triangle: across over along.'], hint: () => ['tan(angle) = across ÷ along. Use the inverse tangent.'], worked: () => 'Across is ' + f1(Math.abs(sp().y - st().y)) + ' m, along is ' + f1(Math.abs(sp().x - st().x)) + ' m, so tan⁻¹(across ÷ along) = ' + f1(Math.atan2(Math.abs(sp().y - st().y), Math.abs(sp().x - st().x)) * 180 / Math.PI) + '°.', why: () => ['Triangles do the work again: a right-angled one gives you an angle.'] }
          : { skills: ['dot-product', 'vectors'], unit: '°', tol: 6, answer: () => angle(), ask: () => ['From the striker, one vector points to his team-mate and another to the defender.', 'Use the dot product to find the angle between them.'], hint: () => ['cos θ = (u·v) ÷ (|u||v|).'], worked: () => 'u·v ÷ (|u||v|) gives cos θ, so the angle between the lay-off and the defender is ' + f1(angle()) + '°. The bigger it is, the more the striker\'s body shields the ball.', why: () => ['A lay-off that goes away from the defender is safer than one that goes across him.'] },
        { drag: true, skills: ['reasoning'], ask: () => ['Drag ' + nm(sp()) + ', or the striker, until the team-mate arrives first.', 'Then press Try the pass.'], why: () => ['The defender is already running; move the help closer or the striker deeper.'] },
      ];
      return out;
    },
    run(S) {
      const st = S.ours[S.striker], df = S.theirs[S.def], sp = S.ours[S.sup], tS = dist(st, sp) / V_RUN, tD = REACT + dist(st, df) / V_RUN, ok = tS < tD, end = Math.min(tS, tD);
      const mv = (a, b, t, t0) => { const d = dist(a, b), m = Math.min(d, V_RUN * Math.max(0, t - t0)), k = d ? m / d : 0; return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }; };
      const at = (t) => ({ ours: S.ours.map((o, i) => (i === S.sup ? mv(sp, st, t, 0) : { x: o.x, y: o.y })), theirs: S.theirs.map((c, i) => (i === S.def ? mv(df, st, t, REACT) : { x: c.x, y: c.y })), ball: { x: st.x, y: st.y } });
      return { dur: end + 0.9, at, ok, text: ok ? nm(sp) + ' is there after ' + f2(tS) + ' s, before ' + nm(df) + ' (' + f2(tD) + ' s). The striker can lay it off.' : nm(df) + ' gets there after ' + f2(tD) + ' s and our help is still ' + f2(tS - tD) + ' s away. The ball is lost.' };
    },
    apply(S, lg) { const me = FM.teamById(lg, lg.userId), o = S.ours[S.sup]; FM.setPhasePos(me, o.p, 'final', { d: clamp(o.x / L, 0.03, 0.97), w: clamp(o.y / W, 0.04, 0.96) }); return nm(o) + ' now starts at (' + f1(o.x) + ', ' + f1(o.y) + ') when we attack.'; },
  };

  // the ball is lost: who is back in time?
  LESSONS.restdef = {
    title: 'Staying safe when we lose the ball',
    scenario(me, opp) {
      const ours = squad(me, 'final', false), theirs = squad(opp, 'transAtt', true);
      const fw = theirs.filter((t) => ['ST', 'WF', 'AM'].indexOf(t.p.group) >= 0 && t.x >= 28).sort((a, b) => a.x - b.x), runner = fw[0] || theirs.filter((t) => t.p.group !== 'GK').sort((a, b) => b.x - a.x)[0];
      const back = ours.filter((o) => o.p.group !== 'GK').sort((a, b) => a.x - b.x);
      const rec = back[1] || back[0];
      return { ours, theirs, runner: theirs.indexOf(runner), rec: ours.indexOf(rec), draggable: true, view: [0, 105], zone: 'rest' };
    },
    steps(S, level) {
      const R = () => S.theirs[S.runner], D = () => S.ours[S.rec], E = () => ({ x: BOX, y: W / 2 });
      const tR = () => dist(R(), E()) / V_COUNTER, tD = () => dist(D(), E()) / V_RUN, gap = () => dist(R(), D()), meet = () => gap() / (V_COUNTER + V_RUN);
      const behind = () => S.ours.filter((o) => o.p.group !== 'GK' && o.x < R().x).length;
      return [
        { skills: ['counting', 'reasoning'], unit: 'players', tol: 0.01, answer: () => behind(), ask: () => ['We have just lost the ball in their half. ' + nm(R()) + ' is the first of their players to break.', 'How many of our outfield players are between him and our goal?'], hint: () => ['Count the shirts of ours with a smaller x than his.'], worked: () => 'When the ball is lost, ' + behind() + ' of our outfield players are goal-side of ' + nm(R()) + '.', why: () => ['That number is "rest defence": the players who stay back so a loss does not become a goal.'] },
        { skills: ['pythagoras', 'speed-distance-time'], unit: 's', tol: 0.3, answer: () => tR(), ask: () => [nm(R()) + ' runs with the ball at ' + V_COUNTER + ' m/s.', 'How long does he take to reach the edge of our box, at (' + BOX + ', 34)?'], hint: () => ['Find the distance with Pythagoras, then divide by his speed.'], worked: () => 'From (' + f1(R().x) + ', ' + f1(R().y) + ') to the box edge is ' + f1(dist(R(), E())) + ' m, and at ' + V_COUNTER + ' m/s that takes ' + f2(tR()) + ' s.', why: () => ['That is how long we have to get organised.'] },
        { skills: ['pythagoras', 'speed-distance-time'], unit: 's', tol: 0.3, answer: () => tD(), ask: () => [nm(D()) + ' is our deepest player after the goalkeeper and the centre-backs.', 'He runs at ' + V_RUN + ' m/s. How long does he take to reach the same spot?'], hint: () => ['Same method: distance, then ÷ speed.'], worked: () => nm(D()) + ' is ' + f1(dist(D(), E())) + ' m from the box edge, which is ' + f2(tD()) + ' s at ' + V_RUN + ' m/s.', why: () => ['Two times, one comparison.'] },
        { choice: ['We are there first', 'He is there first'], skills: ['reasoning'], answer: () => (tD() <= tR() ? 'We are there first' : 'He is there first'), ask: () => ['Who gets to the edge of the box first?'], hint: () => ['The smaller time wins.'], worked: () => (tD() <= tR() ? 'We get there first, so he meets a defender in time.' : 'He is there first, with space and the ball.'), why: () => ['The question for the match is always this one.'] },
        level === 'gcse'
          ? { skills: ['linear-equations', 'speed-distance-time'], unit: 's', tol: 0.15, answer: () => meet(), ask: () => ['Suppose ' + nm(D()) + ' runs straight at him and he runs straight at ' + nm(D()) + '.', 'They are ' + f1(gap()) + ' m apart, and together they close ' + (V_COUNTER + V_RUN) + ' m every second.', 'How long until they meet?'], hint: () => ['Time = gap ÷ combined speed.'], worked: () => 'Together they close ' + (V_COUNTER + V_RUN) + ' m each second, so a gap of ' + f1(gap()) + ' m closes in ' + f2(meet()) + ' s.', why: () => ['Whenever two things move towards each other, add the speeds.'] }
          : { skills: ['simultaneous-equations', 'linear-equations'], unit: 's', tol: 0.15, answer: () => meet(), ask: () => ['Measure along the line between them. He is at position 0 and moves at ' + V_COUNTER + ' t. ' + nm(D()) + ' starts ' + f1(gap()) + ' m away and moves back at ' + V_RUN + ' t.', 'They meet when ' + V_COUNTER + 't = ' + f1(gap()) + ' − ' + V_RUN + 't.', 'Solve for t.'], hint: () => ['Collect the t terms: ' + (V_COUNTER + V_RUN) + 't = ' + f1(gap()) + '.'], worked: () => V_COUNTER + 't = ' + f1(gap()) + ' − ' + V_RUN + 't gives ' + (V_COUNTER + V_RUN) + 't = ' + f1(gap()) + ', so t = ' + f2(meet()) + ' s.', why: () => ['That is a pair of linear equations meeting: the same shape as two lines crossing on a graph.'] },
        { drag: true, skills: ['reasoning'], ask: () => ['Drag ' + nm(D()) + ', or any of our players, to a place where we are back in time.', 'Then press Try the pass to see the counter.'], why: () => ['A player a few metres deeper turns a goal into a tackle.'] },
      ];
    },
    run(S) {
      const R = S.theirs[S.runner], D = S.ours[S.rec], E = { x: BOX, y: W / 2 }, tR = dist(R, E) / V_COUNTER, tD = dist(D, E) / V_RUN, ok = tD <= tR, end = Math.min(tR, tD);
      const mv = (a, b, v, t) => { const d = dist(a, b), m = Math.min(d, v * t), k = d ? m / d : 0; return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }; };
      const at = (t) => { const rr = mv(R, E, V_COUNTER, t); return { ours: S.ours.map((o, i) => (i === S.rec ? mv(D, E, V_RUN, t) : { x: o.x, y: o.y })), theirs: S.theirs.map((c, i) => (i === S.runner ? rr : { x: c.x, y: c.y })), ball: rr }; };
      return { dur: end + 0.9, at, ok, text: ok ? nm(D) + ' is back after ' + f2(tD) + ' s, before ' + nm(R) + ' (' + f2(tR) + ' s). The break is stopped.' : nm(R) + ' is at the edge of our box after ' + f2(tR) + ' s and ' + nm(D) + ' needs ' + f2(tD) + ' s. We are too late.' };
    },
    apply(S, lg) { const me = FM.teamById(lg, lg.userId), o = S.ours[S.rec]; FM.setPhasePos(me, o.p, 'final', { d: clamp(o.x / L, 0.03, 0.97), w: clamp(o.y / W, 0.04, 0.96) }); return nm(o) + ' now holds (' + f1(o.x) + ', ' + f1(o.y) + ') when we attack, as rest defence.'; },
  };

  // three pressers who do not set off together
  LESSONS.press = {
    title: 'Pressing together',
    scenario(me, opp) {
      const ours = squad(me, 'press', false), theirs = squad(opp, 'build', true);
      const carrier = theirs.filter((t) => t.p.group === 'CB').sort((a, b) => a.x - b.x)[0] || theirs.filter((t) => t.p.group !== 'GK')[0];
      const pressers = ours.filter((o) => o.p.group !== 'GK' && o.p.group !== 'CB').sort((a, b) => dist(a, carrier) - dist(b, carrier)).slice(0, 3);
      const delays = [0, 0.5, 1.0];
      return { ours, theirs, carrier: theirs.indexOf(carrier), pressers: pressers.map((p) => ours.indexOf(p)), delays, draggable: true, view: [38, 105], zone: 'press' };
    },
    steps(S, level) {
      const C = () => S.theirs[S.carrier], P = (i) => S.ours[S.pressers[i]], arr = (i) => S.delays[i] + dist(P(i), C()) / V_RUN, all = () => [0, 1, 2].map(arr), spread = () => Math.max.apply(null, all()) - Math.min.apply(null, all());
      return [
        { skills: ['pythagoras', 'speed-distance-time'], unit: 's', tol: 0.25, answer: () => arr(0), ask: () => [nm(P(0)) + ' goes first, the moment ' + nm(C()) + ' gets the ball.', 'He runs at ' + V_RUN + ' m/s.', 'How long until he is on the ball carrier?'], hint: () => ['Distance between them with Pythagoras, then ÷ speed.'], worked: () => nm(P(0)) + ' is ' + f1(dist(P(0), C())) + ' m away, so he arrives after ' + f2(arr(0)) + ' s.', why: () => ['That is the pressure arriving.'] },
        level === 'gcse'
          ? { skills: ['speed-distance-time', 'reasoning'], unit: 's', tol: 0.25, answer: () => arr(2), ask: () => [nm(P(2)) + ' sets off ' + S.delays[2] + ' s after the first, because he reads the trigger later.', 'How long after the ball is received does he arrive?'], hint: () => ['His waiting time plus distance ÷ speed.'], worked: () => nm(P(2)) + ' waits ' + S.delays[2] + ' s and then needs ' + f2(dist(P(2), C()) / V_RUN) + ' s, so he arrives after ' + f2(arr(2)) + ' s.', why: () => ['Waiting counts as time just as running does.'] }
          : { skills: ['parametric-equations', 'linear-equations'], unit: 's', tol: 0.25, answer: () => arr(2), ask: () => ['After his delay τ = ' + S.delays[2] + ' s, ' + nm(P(2)) + ' moves in a straight line to the carrier: r(t) = P + 7(t − τ)û, where û is the unit vector from him to the carrier.', 'Find the time t when r(t) reaches the carrier.'], hint: () => ['|r(t) − P| = 7(t − τ) must equal the distance ' + f1(dist(P(2), C())) + ' m.'], worked: () => 'r(t) = P + 7(t − τ)û reaches the carrier when 7(t − τ) = ' + f1(dist(P(2), C())) + ', so t = ' + S.delays[2] + ' + ' + f2(dist(P(2), C()) / V_RUN) + ' = ' + f2(arr(2)) + ' s.', why: () => ['Parametric equations describe where a player is at every moment, which is exactly what a press is.'] },
        { skills: ['reasoning'], unit: 's', tol: 0.25, answer: () => spread(), ask: () => ['Work out when all three arrive.', 'How long is it between the first to arrive and the last?'], hint: () => ['Largest arrival time minus smallest.'], worked: () => 'The three arrive after ' + all().map(f2).join(' s, ') + ' s. The gap between first and last is ' + f2(spread()) + ' s.', why: () => ['That gap is how "disjointed" the press is.'] },
        { choice: ['Together', 'Disjointed'], skills: ['reasoning'], answer: () => (spread() <= 0.7 ? 'Together' : 'Disjointed'), ask: () => ['A press is together if everyone is on him within about 0.7 s of each other.', 'Is this one together or disjointed?'], hint: () => ['Compare the gap with 0.7 s.'], worked: () => (spread() <= 0.7 ? 'It is together: they arrive within 0.7 s of each other.' : 'It is disjointed: the first is on him ' + f2(spread()) + ' s before the last, which is time enough to pass out of it.'), why: () => ['A disjointed press is the one that hurts you: the first man runs himself out of the game.'] },
        { drag: true, skills: ['reasoning'], ask: () => ['Drag the presser who arrives last a few metres nearer, or the first one a little deeper, until the three arrive together.', 'Then press Try the pass.'], why: () => ['Closing the gap is a matter of metres.'] },
      ];
    },
    run(S) {
      const C = S.theirs[S.carrier], arr = S.pressers.map((pi, i) => S.delays[i] + dist(S.ours[pi], C) / V_RUN), spread = Math.max.apply(null, arr) - Math.min.apply(null, arr), ok = spread <= 0.7;
      const at = (t) => ({ ours: S.ours.map((o, oi) => { const i = S.pressers.indexOf(oi); if (i < 0) return { x: o.x, y: o.y }; const d = dist(o, C), m = Math.min(d, V_RUN * Math.max(0, t - S.delays[i])), k = d ? m / d : 0; return { x: o.x + (C.x - o.x) * k, y: o.y + (C.y - o.y) * k }; }), theirs: S.theirs.map((c) => ({ x: c.x, y: c.y })), ball: { x: C.x, y: C.y } });
      return { dur: Math.max.apply(null, arr) + 0.9, at, ok, text: ok ? 'All three are on him within ' + f2(spread) + ' s. He has nowhere to go.' : 'The first is on him after ' + f2(Math.min.apply(null, arr)) + ' s but the last takes ' + f2(Math.max.apply(null, arr)) + ' s. He plays out of it.' };
    },
    apply(S, lg) { const me = FM.teamById(lg, lg.userId), i = S.pressers.slice().sort((a, b) => (S.delays[b === S.pressers[0] ? 0 : b === S.pressers[1] ? 1 : 2]) - 0)[0]; void i; S.pressers.forEach((pi) => { const o = S.ours[pi]; FM.setPhasePos(me, o.p, 'press', { d: clamp(o.x / L, 0.03, 0.97), w: clamp(o.y / W, 0.04, 0.96) }); }); return 'The three pressers now start where you put them in the press.'; },
  };

  // ---------- what went wrong last time? ----------
  const rate = (s) => (s && s.passes ? (s.passesOk != null ? s.passesOk : (s.passesCompleted || 0)) / s.passes : null);
  const BASE_ACC = 0.55;   // about what a side completes in this game
  FM.anLab = { LESSONS };
  FM.anLab.pickIssue = function (lg, fx) {
    const me = lg.userId, opp = fx.homeId === me ? fx.awayId : fx.homeId, a = fx.stats && fx.stats[me], b = fx.stats && fx.stats[opp];
    const gf = fx.homeId === me ? fx.hg : fx.ag, ga = fx.homeId === me ? fx.ag : fx.hg;
    if (!a || !b) return { id: 'build', why: ['I do not have the numbers from that match, so let us start where most good teams start: getting out from the back.'] };
    const accA = rate(a), accB = rate(b), tot = (a.possession || 0) + (b.possession || 0) || 1, pos = (a.possession || 0) / tot;
    const score = {
      restdef: ga * 1.1 + Math.max(0, ((b.shots || 0) - (a.shots || 0)) / 8) + (pos > 0.52 && ga > 1 ? 0.6 : 0),
      build: accA == null || accB == null ? 0 : Math.max(0, (accB - accA) * 20 + (BASE_ACC - accA) * 6) + ((b.tackles || 0) > (a.tackles || 0) + 8 ? 0.6 : 0),
      holdup: Math.max(0, ((b.shots || 0) - (a.shots || 0)) / 5) + (gf === 0 ? 0.9 : 0) + ((a.xg || 0) < 1 ? 0.6 : 0),
      press: accB == null ? 0 : Math.max(0, (accB - BASE_ACC) * 16) + (accA != null && accB > accA ? (accB - accA) * 6 : 0),
    };
    const id = Object.keys(score).sort((x, y) => score[y] - score[x])[0];
    const pcs = (v) => Math.round(v * 100) + '%';
    const why = {
      restdef: ['We conceded ' + ga + ' and they had ' + (b.shots || 0) + ' shots.', pos > 0.5 ? 'We had the ball more than they did, so the goals did not come from them attacking us for long. They came from what happened the moment we lost it.' : 'Several of those chances came quickly after we lost the ball.', 'So I want us to look at who is back when the ball is lost.'],
      build: ['Only ' + pcs(accA == null ? 0.5 : accA) + ' of our passes found a team-mate' + (accB != null ? ', against ' + pcs(accB) + ' for them' : '') + '.', 'A lot of that happens when we try to play out from the back under pressure.', 'So let us look at the passes we choose, and why some of them were never really on.'],
      holdup: ['We only had ' + (a.shots || 0) + ' shots' + (gf === 0 ? ' and did not score' : '') + '.', 'When the ball goes up to our striker he is often on his own, with no-one near enough to play off him.', 'So let us look at how quickly help can reach him.'],
      press: ['They completed ' + pcs(accB == null ? 0.85 : accB) + ' of their passes.', 'That tells me they played through our press more easily than they should have.', 'Let us look at whether our pressers arrive together or one at a time.'],
    }[id];
    return { id, why };
  };

  // ---------- the maths we are working through ----------
  const SKILLS = {
    gcse: [['pythagoras', "Pythagoras' theorem"], ['speed-distance-time', 'Speed, distance and time'], ['coordinate-geometry', 'Coordinates and perpendicular distance'], ['trigonometry', 'Right-angled trigonometry'], ['linear-equations', 'Solving linear equations'], ['reasoning', 'Using results to decide']],
    alevel: [['vectors', 'Vectors in two dimensions'], ['dot-product', 'The scalar product'], ['differentiation', 'Differentiation (with indices)'], ['parametric-equations', 'Parametric equations'], ['simultaneous-equations', 'Simultaneous equations'], ['surds', 'Surds and square roots']],
  };
  FM.anLab.SKILLS = SKILLS;
  FM.anLab.mark = (lg, skills) => { lg.anaMaths = lg.anaMaths || {}; (skills || []).forEach((k) => { lg.anaMaths[k] = (lg.anaMaths[k] || 0) + 1; }); };

  // ---------- the board ----------
  function boardSvg(S, tag, sel) {
    const v = S.view || [0, 62], w = v[1] - v[0], ln = 'stroke="rgba(255,255,255,.5)" stroke-width="0.25" fill="none"';
    let s = `<svg class="al-pitch" data-tag="${tag}" viewBox="${v[0] - 1} -4 ${w + 2} ${W + 8}" role="img" aria-label="Pitch for the drill">`;
    s += `<rect x="${v[0]}" y="0" width="${w}" height="${W}" fill="#3A4A40"/><rect x="0" y="0" width="${L}" height="${W}" ${ln}/><line x1="${L / 2}" y1="0" x2="${L / 2}" y2="${W}" ${ln}/><circle cx="${L / 2}" cy="${W / 2}" r="9.15" ${ln}/>`;
    s += `<rect x="0" y="${W / 2 - 20.16}" width="${BOX}" height="40.32" ${ln}/><rect x="${L - BOX}" y="${W / 2 - 20.16}" width="${BOX}" height="40.32" ${ln}/>`;
    for (let x = Math.ceil(v[0] / 10) * 10; x <= v[1]; x += 10) s += `<line x1="${x}" y1="0" x2="${x}" y2="${W}" stroke="rgba(255,255,255,.1)" stroke-width="0.15"/><text x="${x}" y="-1.2" font-size="1.9" text-anchor="middle" fill="rgba(244,237,218,.7)">${x}</text>`;
    for (let y = 10; y < W; y += 10) s += `<line x1="${v[0]}" y1="${y}" x2="${v[1]}" y2="${y}" stroke="rgba(255,255,255,.1)" stroke-width="0.15"/><text x="${v[0] + 0.5}" y="${y - 0.5}" font-size="1.9" fill="rgba(244,237,218,.7)">${y}</text>`;
    s += '<g class="al-lines"></g>';
    S.theirs.forEach((c) => { if (c.x < v[0] - 3 || c.x > v[1] + 3) return; s += `<g id="${tag}-${c.id}" class="al-th" transform="translate(${c.x.toFixed(2)},${c.y.toFixed(2)})"><circle r="${(V_RUN * 0.55).toFixed(2)}" fill="rgba(231,128,120,.12)" stroke="rgba(231,128,120,.75)" stroke-width="0.2" stroke-dasharray="0.8 0.8"/><circle r="1.3" fill="#1b1b1b" stroke="#fff" stroke-width="0.2"/></g>`; });
    S.ours.forEach((o, i) => { if (o.x < v[0] - 3 || o.x > v[1] + 3) return; const isT = S.target === i && S.pickTarget, isP = S.passer === i; s += `<g id="${tag}-${o.id}" class="al-me" data-i="${i}" transform="translate(${o.x.toFixed(2)},${o.y.toFixed(2)})" style="cursor:${S.draggable ? 'grab' : 'default'}"><circle r="2.6" fill="transparent"/><circle r="1.5" fill="#1f9d57" stroke="${isP ? '#d7b86b' : isT ? '#7fd49a' : '#fff'}" stroke-width="${isP || isT ? 0.5 : 0.25}"/><text y="0.7" text-anchor="middle" font-size="1.7" font-weight="700" fill="#fff" pointer-events="none">${o.p.number}</text></g>`; });
    s += `<circle id="${tag}-ball" r="0.7" fill="#fff" stroke="#111" stroke-width="0.2" cx="-50" cy="-50"/>`;
    return s + '</svg>';
  }

  // ---------- one drill on the page ----------
  function mountDrill(host, lg, S, lesson, level, onDone) {
    const tag = 'd' + Math.floor(Math.random() * 1e6), steps = lesson.steps(S, level), state = { i: 0, tries: 0, ran: false, ok: false };
    const mkStep = (st, i) => `<div class="al-step" data-step="${i}" ${i > state.i ? 'hidden' : ''}><div class="al-q">${lines(st.ask())}</div>${st.drag ? `<div class="al-row"><button type="button" class="primary" data-try>Try the pass</button><button type="button" data-reset>Put them back</button></div>` : st.choice ? `<div class="al-row">${st.choice.map((c) => `<button type="button" data-choice="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : `<div class="al-row"><input type="number" step="any" inputmode="decimal" data-val aria-label="Your answer"><span class="al-unit">${esc(st.unit || '')}</span><button type="button" class="primary" data-check>Check</button></div>`}<div class="al-fb" aria-live="polite"></div></div>`;
    host.innerHTML = `<div class="al-board">${boardSvg(S, tag)}<div class="al-read" id="${tag}-read">Click or drag a player to see where he stands.</div><div class="al-play"><span id="${tag}-out" class="al-out"></span><input type="range" min="0" max="100" value="0" id="${tag}-scrub" aria-label="Scrub the simulation" hidden></div></div><div class="al-steps">${steps.map(mkStep).join('')}</div>`;
    const svg = host.querySelector('svg'), q = (id) => host.querySelector('#' + tag + '-' + id), original = JSON.parse(JSON.stringify(S.ours.map((o) => ({ x: o.x, y: o.y }))));
    const place = (frame) => {
      S.ours.forEach((o, i) => { const e = q(o.id); if (e) e.setAttribute('transform', `translate(${frame.ours[i].x.toFixed(2)},${frame.ours[i].y.toFixed(2)})`); });
      S.theirs.forEach((c, i) => { const e = q(c.id); if (e) e.setAttribute('transform', `translate(${frame.theirs[i].x.toFixed(2)},${frame.theirs[i].y.toFixed(2)})`); });
      const b = q('ball'); if (b) { b.setAttribute('cx', frame.ball.x.toFixed(2)); b.setAttribute('cy', frame.ball.y.toFixed(2)); }
    };
    const drawLines = () => {
      const g = svg.querySelector('.al-lines'); if (!g) return; const A = S.ours[S.passer], B = S.ours[S.target];
      g.innerHTML = S.pickTarget && B ? `<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" stroke="#d7b86b" stroke-width="0.35"/>` : '';
      const bl = q('ball'); if (bl && S.pickTarget) { bl.setAttribute('cx', A.x); bl.setAttribute('cy', A.y); }
      if (!S.pickTarget && lesson === LESSONS.holdup) { const st = S.ours[S.striker], bl2 = q('ball'); if (bl2) { bl2.setAttribute('cx', st.x); bl2.setAttribute('cy', st.y); } }
    };
    drawLines();
    const point = (e) => { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const m = svg.getScreenCTM(); return m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 }; };
    const readout = (o) => { q('read').textContent = nm(o) + ' stands at (' + f1(o.x) + ', ' + f1(o.y) + ')'; };
    let drag = null;
    svg.addEventListener('pointerdown', (e) => { const g = e.target.closest('.al-me'); if (!g) return; const o = S.ours[+g.dataset.i]; drag = { o, i: +g.dataset.i, moved: false, el: g }; readout(o); if (S.draggable) { try { svg.setPointerCapture(e.pointerId); } catch (x) { /* fine */ } } });
    svg.addEventListener('pointermove', (e) => { if (!drag || !S.draggable) return; const p = point(e), v = S.view || [0, 62]; const nx = clamp(p.x, Math.max(1, v[0]), Math.min(L - 1, v[1])), ny = clamp(p.y, 1, W - 1); if (Math.hypot(nx - drag.o.x, ny - drag.o.y) > 0.3) drag.moved = true; if (drag.moved) { drag.o.x = nx; drag.o.y = ny; drag.el.setAttribute('transform', `translate(${nx.toFixed(2)},${ny.toFixed(2)})`); readout(drag.o); drawLines(); } });
    svg.addEventListener('pointerup', () => { if (!drag) return; if (!drag.moved && S.pickTarget && drag.i !== S.passer) { S.target = drag.i; svg.querySelectorAll('.al-me circle:nth-of-type(2)').forEach(() => {}); host.querySelectorAll('.al-me').forEach((g) => { const c = g.querySelectorAll('circle')[1], i = +g.dataset.i; c.setAttribute('stroke', i === S.passer ? '#d7b86b' : i === S.target ? '#7fd49a' : '#fff'); c.setAttribute('stroke-width', i === S.passer || i === S.target ? 0.5 : 0.25); }); drawLines(); } drag = null; });
    const fb = (i) => host.querySelector(`[data-step="${i}"] .al-fb`);
    const unlock = (i) => { state.i = i + 1; state.tries = 0; const nx = host.querySelector(`[data-step="${state.i}"]`); if (nx) { nx.hidden = false; nx.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } };
    const correct = (i, st) => { FM.anLab.mark(lg, st.skills); try { FM.saveLeague(lg); } catch (e) { /* kept in the game */ } fb(i).innerHTML = `<div class="al-good">${(st.choice ? 'Yes.' : 'Yes: ' + f1(st.answer()) + (st.unit ? ' ' + esc(st.unit) : '') + '.')}</div>${lines(st.why ? st.why() : [])}`; host.querySelectorAll(`[data-step="${i}"] button, [data-step="${i}"] input`).forEach((b) => { b.disabled = true; }); unlock(i); };
    const wrong = (i, st) => { state.tries++; const ans = st.choice ? st.answer() : f1(st.answer()); fb(i).innerHTML = state.tries >= 3 ? `<div class="al-warn">Not quite, and that is fine. Here is how I get it.</div>${lines([st.worked ? st.worked() : ''])}<p>The answer is ${esc(ans)}${st.unit ? ' ' + esc(st.unit) : ''}. Type it in to carry on.</p>` : `<div class="al-warn">${state.tries === 1 ? 'Not quite.' : 'Still not quite.'}</div>${lines(st.hint ? st.hint() : [])}`; };
    host.querySelectorAll('[data-check]').forEach((b) => b.addEventListener('click', () => { const i = +b.closest('.al-step').dataset.step, st = steps[i], inp = b.closest('.al-step').querySelector('[data-val]'), v = parseFloat(inp.value); if (!Number.isFinite(v)) { fb(i).innerHTML = '<div class="al-warn">Put a number in the box first.</div>'; return; } if (Math.abs(v - st.answer()) <= st.tol) correct(i, st); else wrong(i, st); }));
    host.querySelectorAll('[data-choice]').forEach((b) => b.addEventListener('click', () => { const i = +b.closest('.al-step').dataset.step, st = steps[i]; if (b.dataset.choice === st.answer()) correct(i, st); else wrong(i, st); }));
    let raf = 0;
    const play = () => {
      cancelAnimationFrame(raf); const r = lesson.run(S), out = q('out'), scrub = q('scrub'); scrub.hidden = false; out.textContent = ''; state.ran = true; const t0 = performance.now(), slow = 0.6;
      const frame = (t) => place(r.at(Math.max(0, Math.min(r.dur, t)))); scrub.oninput = () => { cancelAnimationFrame(raf); frame(+scrub.value / 100 * r.dur); };
      const tick = (now) => { const t = (now - t0) / 1000 * slow; frame(t); scrub.value = String(Math.min(100, t / r.dur * 100)); if (t < r.dur) raf = requestAnimationFrame(tick); else { out.textContent = r.text; out.className = 'al-out ' + (r.ok ? 'good' : 'bad'); finish(r); } };
      raf = requestAnimationFrame(tick);
    };
    const finish = (r) => {
      const i = steps.findIndex((s) => s.drag); if (i < 0) return;
      if (r.ok && state.i === i) { FM.anLab.mark(lg, steps[i].skills); fb(i).innerHTML = `<div class="al-good">That works.</div>${lines(steps[i].why ? steps[i].why() : [])}<div class="al-row"><button type="button" class="primary" data-apply>Use this in my tactics</button><span class="al-applied"></span></div>`; fb(i).querySelector('[data-apply]').addEventListener('click', (e) => { const msg = lesson.apply(S, lg); try { FM.saveLeague(lg); } catch (x) { /* fine */ } e.target.disabled = true; fb(i).querySelector('.al-applied').textContent = msg; }); }
    };
    host.querySelectorAll('[data-try]').forEach((b) => b.addEventListener('click', play));
    host.querySelectorAll('[data-reset]').forEach((b) => b.addEventListener('click', () => { cancelAnimationFrame(raf); S.ours.forEach((o, i) => { o.x = original[i].x; o.y = original[i].y; }); place({ ours: S.ours, theirs: S.theirs, ball: { x: -50, y: -50 } }); drawLines(); q('out').textContent = ''; }));
    return state;
  }

  // the picture of the last match, worked through by Francesco
  function worked(host, S, lesson, level) {
    const tag = 'w' + Math.floor(Math.random() * 1e6), steps = lesson.steps(S, level).filter((s) => s.worked);
    const SS = Object.assign({}, S, { draggable: false });
    host.innerHTML = `<div class="al-board">${boardSvg(SS, tag)}</div><div class="al-story">${steps.map((s) => `<div class="al-line">${s.worked()}</div>`).join('')}</div>`;
    const svg = host.querySelector('svg'), g = svg.querySelector('.al-lines'), A = S.ours[S.passer], B = S.ours[S.target];
    if (S.pickTarget && B) { g.innerHTML = `<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" stroke="#ff8a7a" stroke-width="0.35"/>`; const ball = svg.querySelector('#' + tag + '-ball'); ball.setAttribute('cx', A.x); ball.setAttribute('cy', A.y); }
  }
  FM.anLab.mountDrill = mountDrill; FM.anLab.worked = worked;
  FM.anLab.css = `
    .al-board { display: grid; gap: 6px; } .al-pitch { width: 100%; height: auto; display: block; touch-action: none; user-select: none; }
    .al-read { font-size: .8rem; opacity: .8; min-height: 1.2em; } .al-play { display: grid; gap: 6px; } .al-play input[type=range] { width: 100%; }
    .al-out { font-weight: 700; line-height: 1.5; } .al-out.good { color: #7fd49a; } .al-out.bad { color: #ff8a7a; }
    .al-steps { display: grid; gap: 14px; margin-top: 10px; } .al-step { border-top: 1px solid var(--line); padding-top: 12px; display: grid; gap: 8px; } .al-step[hidden] { display: none; }
    .al-q p, .al-fb p, .al-story .al-line { margin: 0 0 4px; line-height: 1.6; } .al-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; } .al-row input { width: 7.5rem; padding: 7px 9px; background: #2f3533; color: var(--cream); border: 1px solid var(--line); font: inherit; } .al-unit { opacity: .75; }
    .al-good { color: #7fd49a; font-weight: 700; margin-bottom: 4px; } .al-warn { color: #f2c14e; font-weight: 700; margin-bottom: 4px; }
    .al-story { display: grid; gap: 10px; margin-top: 8px; } .al-skills { display: flex; flex-wrap: wrap; gap: 6px; } .al-skills span { padding: 3px 9px; border: 1px solid var(--line); font-size: .78rem; opacity: .6; } .al-skills span.on { opacity: 1; border-color: #7fd49a; color: #7fd49a; }
  `;
})();
