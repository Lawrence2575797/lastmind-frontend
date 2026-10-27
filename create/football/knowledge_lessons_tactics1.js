// Tactical lessons, full depth. Each one rebuilds a compact lesson (same node id) around a decision the manager makes on the tactics board, with pitch diagrams,
// and ends with a question whose answer sets a tactical dial (dials.js), sometimes with a business change alongside it.
// Numbers about shot quality are the game's own: FM.xgLogit for a shooter of average finishing with a defender 4 m away.
(function () {
  const K = window.FM && window.FM.K; if (!K) return;
  const { m, m1, m3, fr, mean, A, ask, step } = K;
  const D2R = Math.PI / 180, deg = (r) => r / D2R;
  const XG = { 6: 0.85, 10: 0.24, 14: 0.07, 18: 0.034, 22: 0.02, 26: 0.014, 30: 0.011, 34: 0.009 };   // chance of a goal from that many metres, central
  const P = (x, y, label, extra) => Object.assign({ x, y, team: 'us', label }, extra || {});
  const O = (x, y, label, extra) => Object.assign({ x, y, team: 'them', label }, extra || {});

  // ---------- Pythagoras: how long is the pass, and what the build-up dial means ----------
  K.add('g-pythag', (d) => {
    const a = 24, b = 32, c = Math.hypot(a, b), diag = Math.hypot(105, 68);
    const gk = [5, 34], cb = [30, 14], st = [62, 46], pass2 = Math.hypot(st[0] - cb[0], st[1] - cb[1]);
    const T = 18;   // a ball played firmly travels about 18 metres a second
    return {
      analogy: [
        'Look at the tactics board for the build-up phase. Every arrow you draw between two players looks like one line, but the pitch measures it in two directions: how far across, and how far up. A pass that goes 24 m across and 32 m forward is not 56 m long, and it is not 32 m long either. It is the straight line between the two players.',
        'That length matters on the pitch. A long pass spends longer in the air, which gives the other side more time to move, and it is harder to place. The length of a pass is one of the main things a manager chooses with the "build-up length" dial, so we need a reliable way to measure it.',
      ],
      why: 'In any right-angled triangle $a^2 + b^2 = c^2$. Across-and-up distances on the pitch form a right angle, so this gives the true length of any pass, run or shot.',
      steps: [
        step(['Put two players on the pitch. The centre-back is 30 m from his own goal line and 14 m from the left touchline. The striker is 62 m from the goal line and 46 m from the same touchline.', 'The pass has two parts: ' + (st[0] - cb[0]) + ' m forward and ' + (st[1] - cb[1]) + ' m across. Draw them as the two short sides of a triangle. The pass itself is the long side, the **hypotenuse**.'], null,
          { pitch: true, view: 'full', caption: 'A pass is the long side of a right-angled triangle. The two short sides are how far up and how far across.', players: [P(cb[0], cb[1], 'CB', { ball: true }), P(st[0], st[1], 'ST')],
            lines: [{ p1: cb, p2: [st[0], cb[1]], color: '#9fb0bf', dash: '5 4', label: '32 m forward', dy: 16 }, { p1: [st[0], cb[1]], p2: st, color: '#9fb0bf', dash: '5 4', label: '32 m across', dx: 38 }], arrows: [{ from: cb, to: st, color: '#deb862', label: 'how long?' }] }),
        step(['Why is it the square of the sides? Draw a square on each of the three sides of a right-angled triangle. The area of the big square on the long side is exactly the area of the two smaller squares added together.', 'Take the 3, 4, 5 triangle: $3^2 = 9$, $4^2 = 16$, and $9 + 16 = 25 = 5^2$. That is not a coincidence for that one triangle, it is true for every right angle.'], '$a^2 + b^2 = c^2$'),
        step(['Use it on the pass above. Square each side, add, then take the square root to get back from an area to a length.'], ['$c^2 = ' + (st[0] - cb[0]) + '^2 + ' + (st[1] - cb[1]) + '^2 = ' + ((st[0] - cb[0]) ** 2 + (st[1] - cb[1]) ** 2) + '$', '$c = \\sqrt{' + ((st[0] - cb[0]) ** 2 + (st[1] - cb[1]) ** 2) + '} = ' + m1(pass2) + '$ m']),
        step(['Check that "across plus up" would have been wrong. Adding the sides gives ' + ((st[0] - cb[0]) + (st[1] - cb[1])) + ' m, nearly 19 m too long. A diagonal is always shorter than going round two sides, which is why a diagonal ball is the quickest way to move the ball somewhere.']),
        step(['Sometimes you know the long side and one short side and want the other. A pass is measured at 41 m and goes 32 m forward. How wide is it? Rearrange: the unknown short side squared is the long side squared minus the known short side squared.'], ['$a^2 = c^2 - b^2 = 41^2 - 32^2 = 1681 - 1024 = 657$', '$a = \\sqrt{657} = ' + m1(Math.sqrt(657)) + '$ m']),
        step(['The same rule gives the longest straight line on the pitch, corner flag to corner flag: $\\sqrt{105^2 + 68^2} \\approx ' + m1(diag) + '$ m. No pass can be longer than that.'], null,
          { pitch: true, view: 'full', caption: 'The pitch diagonal is the longest possible pass (about ' + m1(diag) + ' m).', players: [P(2, 3, 'GK', { ball: true }), P(103, 65, 'ST')], arrows: [{ from: [2, 3], to: [103, 65], color: '#deb862', label: m1(diag) + ' m', dy: 18 }] }),
        step(['Now connect length to time. A firmly hit pass travels at about ' + T + ' m a second, so time in the air is distance over speed. The ' + m1(pass2) + ' m ball takes ' + m1(pass2 / T) + ' s. A 12 m ball takes ' + m1(12 / T) + ' s.', 'A defender running at 6 m a second covers ' + m1(6 * pass2 / T) + ' m while the long ball is in the air, and only ' + m1(6 * 12 / T) + ' m during the short one. The longer the pass, the more time he has to arrive.'], '$t = ' + fr('d', 'v') + '$'),
        step(['Short passes keep the ball but make slow progress; long passes gain ground but give the ball away more often. The manager\'s "build-up length" dial runs from 0 (short passes out from the back, 12 to 25 m) to 1 (long balls forward, 35 m and more). Put the pass above on that scale: at ' + m1(pass2) + ' m it is already a direct ball.'],
          null, { pitch: true, view: 'left', caption: 'Short build-up (blue, about 15 m each) against one long ball (gold, ' + m1(pass2) + ' m).', players: [P(5, 34, 'GK', { ball: true }), P(18, 18, 'CB'), P(18, 50, 'CB'), P(30, 14, '4'), P(40, 34, 'DM'), P(55, 46, 'ST')],
            arrows: [{ from: [5, 34], to: [18, 18], color: '#7FD6FF' }, { from: [18, 18], to: [30, 14], color: '#7FD6FF' }, { from: [30, 14], to: [55, 46], color: '#deb862', label: 'long ball', dx: -16 }] }),
      ],
      ask: ask('Your goalkeeper is on his own goal line, 34 m from the touchline. He kicks to your striker who stands 62 m up the pitch and 10 m from that touchline. Work out the length of the kick in metres, to 1 decimal place. Then say whether it belongs to a short or a direct build-up.', Math.hypot(62, 24), 'm', { tol: 0.2,
        worked: ['Forward $62$ m, across $34 - 10 = 24$ m.', '$62^2 + 24^2 = 3844 + 576 = 4420$.', '$\\sqrt{4420} = ' + m1(Math.hypot(62, 24)) + '$ m. That is a direct ball: well over 35 m.'],
        apply: A.both('Set a shorter build-up (20%) and slower tempo (45%)', 'Passes out from the back become shorter, so the keeper plays to a defender instead of kicking long. Expect more passes, slower progress and fewer aimless long balls.', [A.dial('buildDirect', 0.2, 'Short build-up'), A.dial('tempo', 0.45, 'A little slower')]) }),
      next: 'Pythagoras gives the length of a line. Trigonometry gives the angles, and the angle a shooter has to aim at decides how good his chance is.',
    };
  });

  // ---------- Trigonometry: the angle of the goal, and the shooting and width dials ----------
  K.add('g-trig', (d) => {
    const H = 3.66, depth = 12, off = 12;
    const ang = (dist, lat) => deg(Math.atan((lat + H) / dist) - Math.atan(Math.max(0, lat - H) / dist));
    const sideAng = (lat) => deg(Math.atan((lat + H) / depth) - Math.atan((lat - H) / depth));
    const centre = deg(2 * Math.atan(H / depth));
    const w = sideAng(off);
    return {
      analogy: [
        'Stand on the penalty spot and the goal looks wide. Walk to the corner of the box, the same distance from the goal line, and the same goal looks like a narrow gap between two posts. The goal has not changed size. What changed is the **angle** it takes up in your view.',
        'The angle decides how many places the ball can go in. It is the main thing your shot quality depends on once the distance is fixed, and it is why the attacking width dial on the tactics board matters. Trigonometry is the tool for measuring that angle from distances you can read off the pitch.',
      ],
      why: 'In a right-angled triangle the ratio of two sides depends only on the angle: $\\tan\\theta = \\text{opposite} / \\text{adjacent}$. So an angle can be found from two distances, or a distance from an angle.',
      steps: [
        step(['A goal is 7.32 m wide, so each post is ' + H + ' m from the centre line. Start with a shooter in the middle, ' + depth + ' m from the goal line. Draw a line from him to each post.'], null,
          { pitch: true, view: 'box', caption: 'A shooter 12 m out, in the middle. The two lines to the posts make the angle he has to hit.', players: [P(105 - depth, 34, 'ST', { ball: true })], lines: [{ p1: [105 - depth, 34], p2: [105, 34 + H], color: '#deb862' }, { p1: [105 - depth, 34], p2: [105, 34 - H], color: '#deb862' }, { p1: [105 - depth, 34], p2: [105, 34], color: '#9fb0bf', dash: '4 4' }],
            texts: [{ x: 105 - depth + 1.5, y: 40.5, t: centre.toFixed(1) + '°' }] }),
        step(['Split the angle down the middle with a line straight at the centre of the goal. Now each half is a right-angled triangle: the side next to the angle is the ' + depth + ' m to the goal line, and the side opposite the angle is ' + H + ' m, half of the goal.', 'Label the sides from the angle: **opposite** (across from it), **adjacent** (next to it), **hypotenuse** (the long side).']),
        step(['Three ratios link an angle to the sides: sine = opposite / hypotenuse, cosine = adjacent / hypotenuse, tangent = opposite / adjacent. Here we know opposite and adjacent, so use the tangent. Learn it as SOH CAH TOA.'], ['$\\sin\\theta = ' + fr('\\text{opp}', '\\text{hyp}') + '$', '$\\cos\\theta = ' + fr('\\text{adj}', '\\text{hyp}') + '$', '$\\tan\\theta = ' + fr('\\text{opp}', '\\text{adj}') + '$']),
        step(['For half of the angle: $\\tan\\theta = ' + fr(H, depth) + ' = ' + m3(H / depth) + '$. To go from the ratio back to the angle, press the inverse tangent button, written $\\tan^{-1}$.', 'Double it for the whole goal.'], ['$\\theta = \\tan^{-1}(' + m3(H / depth) + ') = ' + m1(deg(Math.atan(H / depth))) + '°$', 'Whole goal: $2 \\times ' + m1(deg(Math.atan(H / depth))) + '° = ' + m1(centre) + '°$']),
        step(['Now move the shooter wide. Same ' + depth + ' m from the goal line, but ' + off + ' m to the side of the centre. The triangle is no longer split evenly, so work out the angle to each post separately: the near post is ' + m1(off - H) + ' m across, the far post ' + m1(off + H) + ' m.'], null,
          { pitch: true, view: 'box', caption: 'The same distance from the goal line, but 12 m wide: the goal is a thin sliver.', players: [P(105 - depth, 34 + off, 'WF', { ball: true })], lines: [{ p1: [105 - depth, 34 + off], p2: [105, 34 + H], color: '#deb862' }, { p1: [105 - depth, 34 + off], p2: [105, 34 - H], color: '#deb862' }],
            texts: [{ x: 105 - depth - 2, y: 34 + off - 3, t: w.toFixed(1) + '°' }] }),
        step(['Each post gives its own right-angled triangle, with the same adjacent side (' + depth + ' m) and a different opposite side. The angle the goal fills is the difference between the two.'], ['$\\tan\\alpha = ' + fr(m1(off + H), depth) + ' \\Rightarrow \\alpha = ' + m1(deg(Math.atan((off + H) / depth))) + '°$', '$\\tan\\beta = ' + fr(m1(off - H), depth) + ' \\Rightarrow \\beta = ' + m1(deg(Math.atan((off - H) / depth))) + '°$', '$\\alpha - \\beta = ' + m1(w) + '°$']),
        step(['Compare: the middle gives ' + m1(centre) + '° and the wide position gives ' + m1(w) + '°, less than half, at the same distance from the goal line. In the game the chance of scoring from here follows the angle. A centre-forward with a defender 4 m away scores about 24% of the time from 10 m in the middle. From the same line but 8 m wide it is about 4%, and 16 m wide about 1%.'], null,
          { x: [0, 20], y: [0, 0.3], xlabel: 'metres to the side of the centre', ylabel: 'chance of a goal', caption: 'The game\'s own shot model, shooting from 12 m out: the chance of a goal collapses as the shooter goes wide.', curves: [], points: [{ x: 0, y: 0.125, label: '12.5%', dx: 6, dy: -8 }, { x: 8, y: 0.04, label: '4%', dx: 6, dy: -8 }, { x: 16, y: 0.009, label: '0.9%', dx: 6, dy: -8 }], bars: [{ x: 0, w: 3, h: 0.125, fill: '#62d092' }, { x: 8, w: 3, h: 0.04, fill: '#deb862' }, { x: 16, w: 3, h: 0.009, fill: '#ee7a70' }] }),
        step(['So a wide player\'s best option is rarely to shoot from where he is. He crosses, cuts inside towards the middle, or passes to somebody with a better angle. On the tactics board that is the **attacking width** dial: wide enough to stretch the defence and make room in the middle, but not so wide that every attack ends in a shot from a poor angle.']),
      ],
      ask: ask('A winger receives the ball 12 m from the goal line and ' + off + ' m from the centre line. Find the angle the goal fills from there, in degrees to 1 decimal place. (Posts are 3.66 m either side of the centre line.)', w, '°', { tol: 0.3,
        worked: ['Far post: $\\tan\\alpha = 15.66 / 12 = 1.305$, so $\\alpha = ' + m1(deg(Math.atan(15.66 / 12))) + '°$.', 'Near post: $\\tan\\beta = 8.34 / 12 = 0.695$, so $\\beta = ' + m1(deg(Math.atan(8.34 / 12))) + '°$.', 'Angle of the goal = $\\alpha - \\beta = ' + m1(w) + '°$, against ' + m1(centre) + '° from the middle.'],
        apply: A.both('Narrow the attack a little (0.9×) and shoot only from better angles', 'Wingers come in a little earlier, and the shot-selection dial moves to 40% so fewer shots are taken from a poor angle. Expect fewer shots but a higher share of them from central areas.', [A.dial('width', 0.9, 'A little narrower'), A.dial('shootFreedom', 0.4, 'Wait for a better angle')]) }),
      next: 'The angle is one reason a shot is good or bad. The other is distance, and how a probability changes with distance tells you how far out your team should shoot from.',
    };
  });

  // ---------- Probability: expected goals and the shooting-range dial ----------
  K.add('g-probspace', (d) => {
    const sh = d.shots.slice(), xg = d.xg.slice(), n = sh.reduce((a, b) => a + b, 0), g = xg.reduce((a, b) => a + b, 0), per = n ? g / n : 0.1;
    const passP = 0.6, passXG = XG[10] * 0.9;
    const pass = passP * passXG, shoot = XG[26];
    return {
      analogy: [
        'Before a shot is taken, nobody knows whether it will go in. But some shots go in far more often than others: a tap-in from six yards almost always scores, a hopeful strike from 30 m almost never does. **Probability** is the number between 0 and 1 that measures this, and the tactics board has a dial that depends entirely on it: how far from goal your players are allowed to shoot.',
        'This lesson builds up the probability rules you need, uses the game\'s own shot data, and ends by deciding where on the pitch your team should stop shooting.',
      ],
      why: 'A probability is a number from 0 (never) to 1 (always). The probabilities of every possible outcome add to 1, and the expected number of goals from a shot is its probability of scoring.',
      steps: [
        step(['List every thing that can happen to a shot: it is saved, it goes wide, it is blocked, or it is a goal. That list is the **sample space**. Every shot ends in exactly one of them, so their probabilities add up to 1.', 'Suppose from one position the chances are goal 0.24, saved 0.30, off target 0.30. What is left for "blocked"? $1 - 0.24 - 0.30 - 0.30 = 0.16$.'], '$P(\\text{goal}) + P(\\text{saved}) + P(\\text{wide}) + P(\\text{blocked}) = 1$'),
        step(['The game gives every shot a chance of scoring, called its **expected goals** (xG), based on its distance, angle and the nearest defender. Here is that chance for a central shot with a defender 4 m away, at the distances the game uses:'], null,
          { x: [0, 38], y: [0, 0.9], xlabel: 'distance from goal (metres)', ylabel: 'chance of a goal', caption: 'The game\'s xG for a central shot with a defender 4 m away. It falls off very quickly.', bars: Object.keys(XG).map((k) => ({ x: +k, w: 3, h: XG[k], fill: +k <= 14 ? '#62d092' : '#deb862' })) }),
        step(['Read the shape: from 6 m the chance is ' + XG[6] + ', from 10 m ' + XG[10] + ', and from 18 m only ' + XG[18] + '. Three metres further out cost almost 80% of the chance between 10 m and 14 m. After 20 m the line is nearly flat and very low: ' + XG[22] + ', ' + XG[26] + ', ' + XG[30] + '.']),
        step(['Expected goals from many shots is the sum of the chances. If a team takes 10 shots from 26 m, each worth ' + XG[26] + ', it expects $10 \\times ' + XG[26] + ' = ' + m(10 * XG[26]) + '$ goals. Three shots from 10 m, each worth ' + XG[10] + ', expect $3 \\times ' + XG[10] + ' = ' + m(3 * XG[10]) + '$ goals. Fewer shots, five times the goals.'], '$\\text{expected goals} = \\text{number of shots} \\times P(\\text{goal})'.replace('\\text', '\\text') + '$'),
        step(['Mark the shooting zones on the pitch. The green zone is where shots are worth taking; the grey ring is where they are not.'], null,
          { pitch: true, view: 'attack', caption: 'Chance of a goal by distance (central shots). Inside 14 m a shot is worth taking; beyond 22 m it almost never is.', rings: [{ x: 105, y: 34, r: 10, color: '#62d092', label: '24%' }, { x: 105, y: 34, r: 18, color: '#deb862', label: '3%' }, { x: 105, y: 34, r: 26, color: '#ee7a70', label: '1.4%' }], players: [P(83, 34, 'AM', { ball: true })] }),
        step(['A shot is never free: it ends the attack. Compare shooting with passing on. Your attacker has the ball 26 m out. He can shoot, worth ' + XG[26] + ' goals. Or he can pass to a team-mate who would then have a chance 10 m out, worth ' + XG[10] + '. But the pass only gets there ' + Math.round(passP * 100) + ' times in 100, and the shot that follows gets taken with a defender closing in, so say it is worth $0.9 \\times ' + XG[10] + '$.', 'When there are two ways to reach an outcome you multiply along each route: the chance the pass arrives, times the value of what follows.'], ['$\\text{shoot: } ' + XG[26] + '$', '$\\text{pass: } ' + passP + ' \\times (0.9 \\times ' + XG[10] + ') = ' + m3(pass) + '$']),
        step(['The pass is worth ' + m3(pass) + ' goals and the shot ' + XG[26] + '. Passing is better by a factor of ' + m1(pass / shoot) + '. That is why the **shooting range** dial exists: it sets the distance beyond which your players are told to look for a pass first.']),
        step(['Your club\'s own numbers: over ' + sh.length + ' recent matches you took ' + n + ' shots worth ' + m1(g) + ' expected goals, so an average shot of yours is worth ' + m3(per) + '. ' + (per < 0.09 ? 'That is low: a lot of your shots come from poor positions.' : per > 0.13 ? 'That is high: you are mostly shooting from good positions.' : 'That is middling.'), ...(d.example && d.example.shots ? ['(Example figures until you have played enough matches.)'] : [])]),
      ],
      ask: ask('Your winger can shoot from 26 m (chance of a goal ' + XG[26] + ') or pass to a team-mate who would then shoot from 10 m (the pass arrives ' + Math.round(passP * 100) + '% of the time and the chance after it is worth ' + m3(passXG) + '). Work out the expected goals from the pass route, to 3 decimal places.', pass, 'goals', { tol: 0.005,
        worked: ['Multiply the chance the pass arrives by the chance after it: $' + passP + ' \\times ' + m3(passXG) + ' = ' + m3(pass) + '$.', 'That is ' + m1(pass / shoot) + ' times the ' + XG[26] + ' from shooting at once.'],
        apply: A.both('Shoot only inside 22 m and wait for chances', 'The longest distance at which a shot is even considered drops from 32 m to 22 m, and shot selection moves to 40%. Expect noticeably fewer shots, but a bigger share of them from places that score.', [A.dial('shootRange', 22, 'Shoot inside 22 m'), A.dial('shootFreedom', 0.4, 'Wait for a clear chance')]) }),
      next: 'Probabilities of two things both happening multiply, and that idea (a chance that depends on another) is exactly how pressing and counter-attacks work.',
    };
  });

  // ---------- Quadratic graphs: how high the defensive line should stand ----------
  K.add('g-quadgraph', (d) => {
    const a = 0.05, b = 0.0016;   // a teaching model: net chances per match = a*h - b*h^2
    const net = (h) => a * h - b * h * h, best = a / (2 * b), top = net(best);
    const pts = [0, 5, 10, 15, 20, 25, 30];
    return {
      analogy: [
        'A defensive line that stands high squeezes the pitch: the other team has little room to play in, and your team wins the ball near their goal. But the space behind the line grows, and one long pass over the top can leave a striker alone with the keeper. Stand deep and it is the other way round: safe, but your team is stuck in its own half.',
        'So there is a gain from standing higher, and a cost that grows faster the higher you go. When a gain grows steadily and a cost grows with the square, the net result is a curve, a **parabola**, and its highest point tells you the best height. This lesson is about drawing and reading that curve.',
      ],
      why: 'A quadratic $y = ax^2 + bx + c$ draws a parabola. If $a$ is negative it is an upside-down U, and its highest point (the vertex) is the best value you can reach.',
      steps: [
        step(['Measure the line\'s height $h$ as the number of metres it stands above the edge of your own penalty area. At $h = 0$ it is on the edge of the area. At $h = 30$ it is about on the halfway line.'], null,
          { pitch: true, view: 'left', caption: 'Three heights of the defensive line, measured from the edge of the penalty area (16.5 m from the goal line).', zones: [{ x: 16.5, y: 0, w: 1, h: 68, fill: 'rgba(238,122,112,.35)', stroke: '#ee7a70' }, { x: 31.5, y: 0, w: 1, h: 68, fill: 'rgba(222,184,98,.35)', stroke: '#deb862' }, { x: 46.5, y: 0, w: 1, h: 68, fill: 'rgba(98,208,146,.35)', stroke: '#62d092' }],
            texts: [{ x: 14, y: 4, t: 'h = 0', anchor: 'end', color: '#ee7a70' }, { x: 29, y: 4, t: 'h = 15', anchor: 'end', color: '#deb862' }, { x: 44, y: 4, t: 'h = 30', anchor: 'end', color: '#62d092' }] }),
        step(['As a teaching model, each metre the line moves up gains about ' + a + ' of a net chance per match (the other team has less room, and you win the ball higher). But the space behind it grows, and the cost goes up with the square of the height: $' + b + 'h^2$. The net gain is the difference:'], '$N(h) = ' + a + 'h - ' + b + 'h^2$'),
        step(['This is a quadratic with $a = -' + b + '$ (negative, so the curve is an upside-down U). Check it by trying values. Put each height into the formula:'], pts.map((h) => '$N(' + h + ') = ' + a + '(' + h + ') - ' + b + '(' + h + ')^2 = ' + m3(net(h)) + '$')),
        step(['Plot them, with the height across and the net gain up.'], null,
          { x: [0, 32], y: [-0.1, 0.45], xlabel: 'height of the line above the penalty area (m)', ylabel: 'net chances per match', caption: 'The gain and the cost combine into a parabola. Standing too deep and too high are both worse than the middle.', curves: [{ f: (h) => net(h), color: '#7FD6FF' }, { f: (h) => a * h, color: '#62d092', dash: '5 4', label: 'gain', lx: 24 }, { f: (h) => -b * h * h, color: '#ee7a70', dash: '5 4', label: 'cost', lx: 24 }], points: pts.map((h) => ({ x: h, y: net(h), r: 3.5 })) }),
        step(['The curve rises, flattens at the top, then falls. It crosses zero in two places. Where? Solve $N(h) = 0$ by factorising: take out a common factor of $h$.'], ['$' + a + 'h - ' + b + 'h^2 = h(' + a + ' - ' + b + 'h) = 0$', '$h = 0 \\quad \\text{or} \\quad h = ' + fr(a, b) + ' = ' + m1(a / b) + '$']),
        step(['So the net gain is zero at the edge of the area, and zero again at ' + m1(a / b) + ' m. Higher than that the line costs you more than it wins. A parabola is symmetrical, so its top is exactly halfway between the two roots.'], ['$h_{\\text{best}} = ' + fr('0 + ' + m1(a / b), 2) + ' = ' + m1(best) + '$ m', '$N(' + m1(best) + ') = ' + a + '(' + m1(best) + ') - ' + b + '(' + m1(best) + ')^2 = ' + m3(top) + '$']),
        step(['Mark it on the graph: the highest point, the vertex, is at $(' + m1(best) + ', ' + m3(top) + ')$.'], null,
          { x: [0, 34], y: [-0.1, 0.45], xlabel: 'height of the line above the penalty area (m)', ylabel: 'net chances per match', caption: 'The vertex is halfway between the roots.', curves: [{ f: (h) => net(h), color: '#7FD6FF' }], vlines: [{ x: best, color: '#deb862' }], points: [{ x: 0, y: 0, label: 'root', dx: 6, dy: -8 }, { x: a / b, y: 0, label: 'root', dx: -26, dy: -8 }, { x: best, y: top, label: 'best: ' + m1(best) + ' m', color: '#62d092', dx: 8, dy: -10 }] }),
        step(['A line at ' + m1(best) + ' m above the area is about ' + m1(best + 16.5) + ' m from your goal line, around the middle of your own half. On the tactics board that is a line a little deeper than halfway, with a moderate press. Real matches are noisier than this model, and a team with slow centre-backs should stand deeper than one with quick ones, but the shape of the idea is right: there is a best height, and both extremes lose.']),
      ],
      ask: ask('Another team\'s model is $N(h) = 0.06h - 0.002h^2$ (net chances per match, $h$ the height of the line in metres above the penalty area). At what height $h$ is the net gain greatest?', 0.06 / (2 * 0.002), 'm', { tol: 0.2,
        worked: ['Factorise: $0.06h - 0.002h^2 = h(0.06 - 0.002h)$, so the roots are $h = 0$ and $h = 0.06 / 0.002 = 30$.', 'The best height is halfway between the roots: $(0 + 30) / 2 = 15$ m.', 'Check with the formula $-b/2a$: $0.06 / (2 \\times 0.002) = 15$.'],
        apply: A.both('Raise the defensive line ' + Math.round(best / 2) + ' m (halfway to the best height) and step up together', 'Your whole back line moves ' + Math.round(best / 2) + ' m up the pitch. The match becomes more open: more shots at both ends, but you win the ball further from your goal.', [A.dial('line', Math.round(best / 2), 'Higher line'), A.dial('trap', 0.45, 'Step up together')]) }),
      next: 'The line is one part of closing the other team down. The other is how soon a player decides to run at the ball, and that is a question of speed and vectors.',
    };
  });

  // ---------- Vectors: closing speed and the press trigger ----------
  K.add('g-vectors', (d) => {
    const dist = 12, vP = 6.5, vC = 3.5, close = vP - vC, t = dist / close;
    const ang = 35, vCx = vC * Math.cos(ang * D2R), vCy = vC * Math.sin(ang * D2R);
    return {
      analogy: [
        'A press is a chase. A forward runs at the player with the ball, and the player with the ball is moving too, sometimes towards the presser, more often away or across. Whether the chase works depends on how fast the gap between them closes, and that depends on the **direction** each is running as well as how fast.',
        'A quantity with both a size and a direction is a **vector**. On the tactics board the "press trigger" dial sets how far from the ball a forward must be before he starts to chase. To set it well you need to know how long a chase takes.',
      ],
      why: 'A vector has a size and a direction. Velocities add as vectors, so the speed at which two players close on each other is found by subtracting their velocities.',
      steps: [
        step(['Draw a velocity as an arrow: the length is the speed, the direction is where he is going. A presser runs at ' + vP + ' m/s directly at a defender on the ball. The defender carries it directly away at ' + vC + ' m/s. The gap is ' + dist + ' m.'], null,
          { pitch: true, view: 'attack', caption: 'The forward closes at 6.5 m/s while the carrier moves away at 3.5 m/s.', players: [P(80, 34, 'ST'), O(92, 34, 'CB', { ball: true })], arrows: [{ from: [80, 34], to: [88, 34], color: '#7FD6FF', label: vP + ' m/s', dy: 20 }, { from: [92, 34], to: [97, 34], color: '#ee7a70', label: vC + ' m/s', dy: 20 }] }),
        step(['They run in the same direction, so the gap closes by the difference of their speeds. Every second the forward gains ' + vP + ' - ' + vC + ' = ' + close + ' metres.'], '$v_{\\text{closing}} = ' + vP + ' - ' + vC + ' = ' + close + '$ m/s'),
        step(['Time is distance over speed: $t = d / v$. With a gap of ' + dist + ' m, it takes ' + m1(t) + ' s for the forward to reach the carrier. In that time the carrier can look up, choose a pass and play it.'], '$t = ' + fr(dist, close) + ' = ' + m1(t) + '$ s'),
        step(['If the carrier runs **towards** the presser instead, speeds add, because they are moving along the same line in opposite directions: ' + vP + ' + ' + vC + ' = ' + (vP + vC) + ' m/s, and the same ' + dist + ' m is gone in ' + m1(dist / (vP + vC)) + ' s. That is why a defender turning the wrong way is always the moment to press.'], '$t = ' + fr(dist, vP + vC) + ' = ' + m1(dist / (vP + vC)) + '$ s'),
        step(['Most of the time the two are not running along one line. Suppose the carrier is moving at ' + vC + ' m/s but ' + ang + '° away from the line between them. Split his velocity into two perpendicular parts, or **components**: how fast he goes straight away, and how fast he goes sideways.'], ['$v_{\\text{away}} = ' + vC + '\\cos ' + ang + '° = ' + m1(vCx) + '$ m/s', '$v_{\\text{sideways}} = ' + vC + '\\sin ' + ang + '° = ' + m1(vCy) + '$ m/s'],
          { pitch: true, view: 'attack', caption: 'The carrier runs 35° off the line. Only the "away" component works against the presser, and the sideways part must be chased too.', players: [P(80, 34, 'ST'), O(92, 34, 'CB', { ball: true })], arrows: [{ from: [92, 34], to: [92 + 5 * Math.cos(ang * D2R) * 1.4, 34 + 5 * Math.sin(ang * D2R) * 1.4], color: '#ee7a70', label: vC + ' m/s' }, { from: [92, 34], to: [97, 34], color: '#9fb0bf', dash: '4 3', label: m1(vCx), dy: 24 }, { from: [92, 34], to: [92, 37], color: '#9fb0bf', dash: '4 3', label: m1(vCy), dx: -26, dy: 0 }] }),
        step(['The pressing forward\'s job is to cut off the sideways part as well, which is why presses run in a curve rather than a straight line, to stop the carrier getting outside. The simple version, ' + m1(vCx) + ' m/s straight away, gives a closing speed of ' + vP + ' - ' + m1(vCx) + ' = ' + m1(vP - vCx) + ' m/s.']),
        step(['Now the dial. The press trigger sets how far the nearest forward may be before he runs. If it is 8 m, then at ' + close + ' m/s closing he reaches the carrier in ' + m1(8 / close) + ' s. If it is 14 m, ' + m1(14 / close) + ' s. A longer trigger means more of the pitch is covered, but the forward is farther from his marked player, and more tired by the end of the match.'], null,
          { x: [0, 20], y: [0, 8], xlabel: 'gap when the forward starts the press (metres)', ylabel: 'time to reach the carrier (s)', caption: 'At a closing speed of 3 m/s, each extra metre of trigger distance costs a third of a second of chase.', lines: [{ p1: [0, 0], p2: [20, 20 / close], color: '#7FD6FF', width: 2.6 }], points: [{ x: 8, y: 8 / close, label: '8 m: ' + m1(8 / close) + ' s', dx: 8, dy: 14 }, { x: 14, y: 14 / close, label: '14 m: ' + m1(14 / close) + ' s', dx: -62, dy: -4 }] }),
      ],
      ask: ask('A forward is ' + dist + ' m from the defender on the ball. He runs straight at him at ' + vP + ' m/s while the defender carries the ball straight away at ' + vC + ' m/s. How many seconds does it take the forward to reach him?', t, 's', { tol: 0.1,
        worked: ['They run the same way, so the closing speed is $' + vP + ' - ' + vC + ' = ' + close + '$ m/s.', 'Time = distance / speed = $' + dist + ' / ' + close + ' = ' + m1(t) + '$ s.', 'The defender has ' + m1(t) + ' s to pass, which is plenty. A trigger that starts the press earlier, or a second player cutting the lane, is needed to force an error.'],
        apply: A.both('Start closing down 3 m earlier and press harder after losing the ball', 'Your nearest forward starts chasing when the ball is 3 m further away, and the counter-press rises to 70%. Expect the ball won back higher up the pitch, with more fouls and tired legs late in matches.', [A.dial('press', 3, 'Earlier trigger'), A.dial('counterPress', 0.7, 'Hunt the ball back'), A.dial('tackle', 0.55, 'A little firmer')]) }),
      next: 'We have been using one chance at a time. When a shot depends on several things going right, the chances multiply, and that is conditional probability.',
    };
  });
})();
