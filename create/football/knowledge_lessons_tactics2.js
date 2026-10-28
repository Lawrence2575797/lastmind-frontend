// Tactical lessons, second tranche (same shape as knowledge_lessons_tactics1.js): conditional probability and the counter-press, loci and the press zone, bearings and
// the direction of a pass, a stationary point for the best shooting distance, vectors for leading a pass, and relative frequency from the club's own shots.
(function () {
  const K = window.FM && window.FM.K; if (!K) return;
  const { m, m1, m3, fr, A, ask, step } = K;
  const D2R = Math.PI / 180, deg = (r) => r / D2R;
  const P = (x, y, label, extra) => Object.assign({ x, y, team: 'us', label }, extra || {});
  const O = (x, y, label, extra) => Object.assign({ x, y, team: 'them', label }, extra || {});

  // ---------- Conditional probability: winning the ball back and what follows ----------
  K.add('g-probcond', (d) => {
    const pWin = 0.35, pShot = 0.4, pGoal = 0.09, chain = pWin * pShot * pGoal;
    return {
      analogy: [
        'Lose the ball in the other side\'s half and a short race begins. Either you win it back at once, or you do not. If you win it back, the other defence is still out of shape and a shot may follow. If you get a shot, it may score. Each of these chances only matters if the one before it happened.',
        'A chance that depends on something else having happened first is a **conditional probability**. It is exactly what the counter-press dial on the tactics board changes: it raises the first link in this chain, and the rest follows.',
      ],
      why: '$P(A \\text{ then } B) = P(A) \\times P(B \\mid A)$: the chance of the second thing is worked out as if the first had happened, and the two are multiplied.',
      steps: [
        step(['Lose the ball near their box. Draw a ring of 6 m round it. Your players inside the ring are the ones who can win it straight back; everyone outside is too far.'], null,
          { pitch: true, view: 'box', caption: 'A ball lost 18 m from goal. Players inside the 6 m ring can press at once.', rings: [{ x: 87, y: 34, r: 6, color: '#deb862', label: 'counter-press ring' }], players: [O(87, 34, '5', { ball: true }), P(84, 30, '9'), P(83, 40, '10'), P(78, 34, '8'), P(76, 22, '7'), O(93, 40, '4'), O(95, 28, '3')] }),
        step(['Suppose that from past matches the chance of winning the ball back within five seconds of losing it is ' + pWin + '. Write it $P(\\text{win}) = ' + pWin + '$. Out of 100 such losses you win it back about ' + Math.round(pWin * 100) + ' times.']),
        step(['Now the second link. If you did win it back, the defence is out of shape, and you get a shot ' + Math.round(pShot * 100) + '% of the time. This is a **conditional** probability, written with a vertical bar and read "given that":'], '$P(\\text{shot} \\mid \\text{win}) = ' + pShot + '$'),
        step(['The third link: given a shot, the chance it scores is ' + pGoal + '. Draw all three links as a tree. Each branch carries its own chance, and a path from left to right is one possible sequence.'], null,
          { x: [0, 4], y: [0, 1], xlabel: 'stage of the move', ylabel: 'chance at that stage', caption: 'Chance at each stage, given the one before: win it back, shot, goal.', bars: [{ x: 1, w: 0.7, h: pWin, fill: '#7FD6FF', label: 'win it back' }, { x: 2, w: 0.7, h: pShot, fill: '#deb862', label: 'shot' }, { x: 3, w: 0.7, h: pGoal, fill: '#62d092', label: 'goal' }] }),
        step(['To get the chance of the whole path, multiply along it. The rule behind this is that the chance of both is the chance of the first times the chance of the second given the first:'], ['$P(\\text{win and shot and goal}) = ' + pWin + ' \\times ' + pShot + ' \\times ' + pGoal + ' = ' + m3(chain) + '$']),
        step(['That is ' + m(chain * 100) + '% of a goal for each ball lost high up the pitch. It looks tiny, but a side loses the ball in the final third 15 to 20 times a match: $15 \\times ' + m3(chain) + ' = ' + m3(15 * chain) + '$ goals from the counter-press alone.']),
        step(['Raise the first link and everything after it rises with it. At a counter-press of 70% suppose the chance of winning it back goes from ' + pWin + ' to 0.45. The chain becomes $0.45 \\times ' + pShot + ' \\times ' + pGoal + ' = ' + m3(0.45 * pShot * pGoal) + '$, a rise of ' + Math.round((0.45 / pWin - 1) * 100) + '%. The price is in the legs: a harder press tires players and leaves space behind when it fails.']),
        step(['Reading it the other way: $P(B \\mid A) = ' + fr('P(A \\text{ and } B)', 'P(A)') + '$. If 12 of your 30 ball-wins ended in a shot, then $P(\\text{shot} \\mid \\text{win}) = 12 / 30 = 0.4$. That is how the ' + pShot + ' above is found from match data.']),
      ],
      ask: ask('Winning the ball back after a loss in the final third has probability 0.35. Given that you win it back, a shot follows with probability 0.4, and given a shot the chance of a goal is 0.09. What is the probability of a goal following a loss, to 4 decimal places?', chain, '', { tol: 0.0006,
        worked: ['Multiply along the path: $0.35 \\times 0.4 \\times 0.09$.', '$0.35 \\times 0.4 = 0.14$ and $0.14 \\times 0.09 = 0.0126$.'],
        apply: A.both('Hunt the ball back harder: counter-press 70% and an earlier press trigger', 'Players inside the ring after a loss go for the ball sooner, which raises the first link of the chain. Expect more ball won back high up, more fouls and more tired legs late on.', [A.dial('counterPress', 0.7, 'Counter-press'), A.dial('press', 2, 'Earlier trigger')]) }),
      next: 'The ring round the ball is a locus: all the points a fixed distance away. Loci are the geometry of pressing zones.',
    };
  });

  // ---------- Loci: the press zone and who covers which side ----------
  K.add('g-loci', (d) => {
    const ball = { x: 80, y: 34 }, def = { x: 74, y: 40 }, dist = Math.hypot(def.x - ball.x, def.y - ball.y);
    return {
      analogy: [
        'A manager says "press anyone within ten metres of the ball". That sentence describes a shape on the pitch: every point exactly ten metres from the ball is a circle, and everything inside the circle is the press zone. A **locus** is the set of all points that obey one rule, and football is full of them.',
        'Three loci cover most of what a manager asks of a back line: points a fixed distance from a spot (a press zone), points the same distance from two players (the line where their responsibility changes), and points a fixed distance from a line (a channel along the touchline).',
      ],
      why: 'A locus is the path or region of every point that satisfies a rule: a fixed distance from a point is a circle, equidistant from two points is their perpendicular bisector, a fixed distance from a line is a parallel line.',
      steps: [
        step(['**Rule 1: a fixed distance from a point.** The press trigger is 10 m: a player starts to close down only when the ball is within 10 m of him, or equivalently he is within 10 m of the ball. The locus of those points is a circle of radius 10 m centred on the ball.'], null,
          { pitch: true, view: 'attack', caption: 'Locus 1: everything within 10 m of the ball is the press zone.', rings: [{ x: ball.x, y: ball.y, r: 10, color: '#deb862', fill: 'rgba(222,184,98,.12)', label: 'press zone: 10 m' }], players: [O(ball.x, ball.y, '5', { ball: true }), P(def.x, def.y, '9'), P(70, 22, '10'), P(66, 46, '8')] }),
        step(['A player is in the zone if his distance to the ball is less than 10. Use Pythagoras for the distance: the striker is 6 m behind the ball and 6 m to the side.'], ['$d = \\sqrt{6^2 + 6^2} = \\sqrt{72} = ' + m1(dist) + '$ m', '$' + m1(dist) + ' < 10$, so he is inside the circle and he presses.']),
        step(['**Rule 2: the same distance from two points.** Two centre-backs stand 20 m apart. A ball played into the gap between them: whose is it? Every point equally far from both is a straight line halfway between them, at right angles to the line joining them. That is the **perpendicular bisector**.'], null,
          { pitch: true, view: 'left', caption: 'Locus 2: the line equally far from both centre-backs. On either side, the nearer centre-back takes the ball.', players: [P(20, 24, '5'), P(20, 44, '4'), O(36, 34, '9', { ball: true })], lines: [{ p1: [20, 24], p2: [20, 44], color: '#9fb0bf', dash: '4 4' }, { p1: [8, 34], p2: [52, 34], color: '#deb862', width: 2.4, label: 'responsibility changes here', dy: -8 }] }),
        step(['This line is why a back four slides as one: when the ball moves, the line moves with it, so every attacker stays in the area of one defender. If one centre-back drifts the line shifts towards the other and a gap opens on his side. To find the line, take the midpoint of the two players and draw it at right angles.'], ['$\\text{midpoint} = \\left(\\frac{20 + 20}{2}, \\frac{24 + 44}{2}\\right) = (20, 34)$']),
        step(['**Rule 3: a fixed distance from a line.** A winger told to hug the touchline stays within 4 m of it. The locus is a strip along the line, with straight edges parallel to it. A full-back told to protect the half-space stands in the strip 10 to 20 m from the touchline.'], null,
          { pitch: true, view: 'attack', caption: 'Locus 3: the strip within 4 m of the touchline (gold) and the half-space strip behind it (blue).', zones: [{ x: 60, y: 0, w: 45, h: 4, fill: 'rgba(222,184,98,.3)', label: 'wide: 4 m' }, { x: 60, y: 10, w: 45, h: 10, fill: 'rgba(127,214,255,.2)', stroke: '#7FD6FF', label: 'half-space' }] }),
        step(['Put the rules to work. The press zone is a circle, so its area grows with the square of the radius: $A = \\pi r^2$. A trigger of 10 m covers $' + m1(Math.PI * 100) + '$ m². Add 3 m and it covers $' + m1(Math.PI * 169) + '$ m², a ' + Math.round((169 / 100 - 1) * 100) + '% larger area from 30% more distance.']),
        step(['That square is why the press trigger dial costs so much. Each extra metre makes the zone bigger, but it also pulls more of your players out of their own areas, so the lines between them (rule 2) open up if the press is beaten. The dial is a trade between the ring and the bisector.']),
      ],
      ask: ask('The ball is at (80, 34) on the pitch. Your striker stands at (74, 40), measured in metres. How far is he from the ball? Round to 1 decimal place, and say whether he is inside a 10 m press zone.', dist, 'm', { tol: 0.15,
        worked: ['Across and along: $80 - 74 = 6$ and $40 - 34 = 6$.', '$d = \\sqrt{6^2 + 6^2} = \\sqrt{72} = ' + m1(dist) + '$ m.', 'It is less than 10 m, so he is inside the zone.'],
        apply: A.both('Make the press zone 3 m wider', 'The circle round the ball grows from 10 m to 13 m, about 70% more area. More of your forwards start to press, so expect the ball won higher and gaps opening between the lines when a press is beaten.', [A.dial('press', 3, 'Press trigger +3 m')]) }),
      next: 'We measured distances. Bearings measure direction, and the direction of a pass is what separates a forward ball from a safe one.',
    };
  });

  // ---------- Bearings: the direction of a pass ----------
  K.add('g-bearings', (d) => {
    const fwd = 20, side = 15, b = deg(Math.atan(side / fwd));
    return {
      analogy: [
        'Whether a pass is "forward" or "sideways" is a question of direction, and direction can be given as a number. A **bearing** is the angle measured clockwise from north, written with three figures: 000° is straight ahead, 090° is directly to the right, 180° is straight back, 270° is to the left.',
        'On the tactics board "north" is the direction your team is attacking. A pass with a bearing between 315° and 045° goes forward, one between 045° and 135° goes mostly sideways to the right, and so on. The directness dials are really choices about which bearings your players prefer.',
      ],
      why: 'A bearing is an angle clockwise from north, always written with three figures. It is found with trigonometry from how far a pass goes forward and across.',
      steps: [
        step(['Draw the compass on the pitch with north up the pitch, towards the goal you attack. A pass straight ahead has bearing 000°, a ball square to the right has bearing 090°, a back pass 180°.'], null,
          { pitch: true, view: 'attack', caption: 'North is the direction of attack. The bearing of a pass is measured clockwise from it.', players: [P(70, 34, '8', { ball: true })], arrows: [{ from: [70, 34], to: [90, 34], color: '#62d092', label: '000° forward' }, { from: [70, 34], to: [70, 54], color: '#deb862', label: '090°', dx: -4, dy: 16 }, { from: [70, 34], to: [60, 34], color: '#ee7a70', label: '180°', dy: 18 }] }),
        step(['A pass that goes ' + fwd + ' m forward and ' + side + ' m to the right is between 000° and 090°. Draw the right-angled triangle: ' + fwd + ' m up (adjacent to the angle from north) and ' + side + ' m across (opposite).'], null,
          { pitch: true, view: 'attack', caption: 'A pass 20 m forward and 15 m right.', players: [P(66, 28, '8', { ball: true }), P(66 + fwd, 28 + side, '10')], lines: [{ p1: [66, 28], p2: [66 + fwd, 28], color: '#9fb0bf', dash: '4 4', label: '20 m', dy: -6 }, { p1: [66 + fwd, 28], p2: [66 + fwd, 28 + side], color: '#9fb0bf', dash: '4 4', label: '15 m', dx: 18 }], arrows: [{ from: [66, 28], to: [66 + fwd, 28 + side], color: '#deb862' }] }),
        step(['Opposite over adjacent is the tangent, so the angle from north is'], ['$\\tan\\theta = ' + fr(side, fwd) + ' = ' + m3(side / fwd) + '$', '$\\theta = \\tan^{-1}(' + m3(side / fwd) + ') = ' + m1(b) + '°$', 'Bearing: $' + String(Math.round(b)).padStart(3, '0') + '°$ (three figures)']),
        step(['If the same pass went to the left, the bearing is measured all the way round clockwise, so it is $360° - ' + m1(b) + '° = ' + m1(360 - b) + '°$. A bearing of ' + String(Math.round(360 - b)) + '° is the mirror image of ' + String(Math.round(b)).padStart(3, '0') + '°.']),
        step(['A back pass to the right has a bearing between 090° and 180°: for 10 m back and 10 m right the angle below the horizontal is 45°, so the bearing is $90° + 45° = 135°$.']),
        step(['Now count your own passes by direction. If most of a team\'s passes have bearings within 40° of north (320° to 040°) the team is direct. If most are between 060° and 120° or 240° and 300° it plays across the pitch, and if a lot are near 180° it recycles the ball backwards. The board\'s direction dials push the pass towards one of those three groups.']),
      ],
      ask: ask('A pass goes ' + fwd + ' m forward and ' + side + ' m to the right. What is its bearing, to the nearest degree? (Give the angle in degrees.)', Math.round(b), '°', { tol: 1,
        worked: ['$\\tan\\theta = 15 / 20 = 0.75$.', '$\\theta = \\tan^{-1}(0.75) = 36.9°$, which is 037° to three figures.'],
        apply: A.both('Aim for more forward passes: directness 65%, but keep risk where it is', 'More passes get bearings close to north (forward), fewer go square or back. Expect faster progress and more lost balls in midfield.', [A.dial('directness', 0.65, 'More forward passes')]) }),
      next: 'Calculus finds the best value of something that rises and then falls. One of the best uses in football is the best distance to shoot from.',
    };
  });

  // ---------- Stationary points: the best distance to shoot from ----------
  K.add('p-stationary', (d) => {
    const k = 0.05, c = 0.16, S = (x) => 1 - k * (30 - x), G = (x) => 1.2 * Math.exp(-c * x), E = (x) => S(x) * G(x);
    const best = 1 / c - (1 - 30 * k) / k, bestE = E(best), kq = 0.04, bestQ = 1 / c - (1 - 30 * kq) / kq;
    const E2 = (x) => (1 - kq * (30 - x)) * G(x);
    return {
      analogy: [
        'A player has the ball 30 m from goal. Every metre he carries it forward makes the shot better, but every metre also risks a tackle. Shoot early and the chance is poor; wait too long and he is dispossessed. Somewhere between, there is a best moment.',
        'Wherever a quantity rises and then falls there is a top, and at the top the curve is momentarily flat: its gradient is zero. Finding the point where $dE/dx = 0$ is how calculus finds the best value, and here it finds the best shooting distance for the shooting range dial.',
      ],
      why: 'At the top of a smooth curve the gradient is zero. Set the derivative to zero, solve for $x$, and check it is a maximum by seeing the gradient change from positive to negative.',
      steps: [
        step(['Let $x$ be the distance from goal in metres when the shot is taken. Two things change with $x$. First, the chance a shot scores. For a shooter with a defender close, the game\'s shot model is well matched between 8 m and 30 m by an exponential fall:'], '$G(x) = 1.2e^{-0.16x}$'),
        step(['Check it against the table: at 10 m it gives $1.2e^{-1.6} = ' + m3(G(10)) + '$ (the game says 0.24) and at 18 m ' + m3(G(18)) + ' (the game says 0.034, so the model is generous that far out). It halves roughly every 4.3 m: closer is much better.']),
        step(['Second, the chance of still having the ball. Each metre he carries it forward from 30 m costs ' + Math.round(k * 100) + '% of that chance (a defender steps in). So the chance he gets to take the shot at distance $x$ is'], '$S(x) = 1 - ' + k + '(30 - x) = ' + m3(1 - 30 * k) + ' + ' + k + 'x$'),
        step(['The expected goals from carrying the ball to $x$ and then shooting is the product of the two:'], '$E(x) = S(x) \\times G(x) = (' + m3(1 - 30 * k) + ' + ' + k + 'x) \\times 1.2e^{-0.16x}$'),
        step(['Draw it. Shooting from far (large $x$) has a good chance of reaching the spot but a poor shot; very close (small $x$) has a great shot that is rarely reached. The curve is a hill.'], null,
          { x: [10, 30], y: [0, 0.04], xlabel: 'distance from goal when he shoots (m)', ylabel: 'expected goals per attack', caption: 'Expected goals from carrying the ball to each distance and shooting: a hill with its top near 16 m.', curves: [{ f: E, color: '#7FD6FF' }], vlines: [{ x: best, color: '#deb862' }], points: [{ x: best, y: bestE, label: m1(best) + ' m', color: '#62d092', dx: 8, dy: -10 }] }),
        step(['Differentiate with the product rule, $(uv)\' = u\'v + uv\'$, where $u = S(x)$ and $v = G(x)$. Here $u\' = ' + k + '$ and $v\' = -0.16 \\times 1.2e^{-0.16x}$.'], ['$E\'(x) = ' + k + ' \\times 1.2e^{-0.16x} + (' + m3(1 - 30 * k) + ' + ' + k + 'x)(-0.16)(1.2e^{-0.16x})$', '$E\'(x) = 1.2e^{-0.16x}\\left[' + k + ' - 0.16(' + m3(1 - 30 * k) + ' + ' + k + 'x)\\right]$']),
        step(['The exponential is never zero, so $E\'(x) = 0$ only when the bracket is zero. Solve it:'], ['$' + k + ' - 0.16(' + m3(1 - 30 * k) + ' + ' + k + 'x) = 0$', '$' + k + ' + ' + m3(0.16 * (30 * k - 1)) + ' = ' + m3(0.16 * k) + 'x$', '$x = ' + m1(best) + '$ m']),
        step(['Check it is a maximum. For $x$ a little below ' + m1(best) + ' the bracket is positive, so $E$ is rising; a little above, the bracket is negative, so $E$ is falling. The gradient goes from positive to negative, which is the top of a hill. The best distance to shoot from is about ' + m1(best) + ' m, worth ' + m3(bestE) + ' expected goals per attack.']),
        step(['If tackles are less of a danger, say only 4% a metre, the same working gives $x = ' + m1(bestQ) + '$ m: a team that keeps the ball better can afford to carry it nearer. A leaky team should shoot from further out. That is the logic of the shooting range dial.']),
      ],
      ask: ask('Another team loses only 4% of its chance for each metre it carries the ball forward, so $S(x) = 1 - 0.04(30 - x)$, with the same shot model $G(x) = 1.2e^{-0.16x}$. Using $E\'(x) = 0$, find the best distance to shoot from, in metres.', bestQ, 'm', { tol: 0.15,
        worked: ['$E\'(x) = 1.2e^{-0.16x}[0.04 - 0.16(-0.2 + 0.04x)]$.', 'Set the bracket to zero: $0.04 + 0.032 = 0.0064x$, so $x = 0.072 / 0.0064 = 11.25$ m.'],
        apply: A.both('Set the shooting range from your own side: shoot from about ' + Math.round(best + 4) + ' m or closer, and be patient inside it', 'The model says the best shooting distance is about ' + m1(best) + ' m for a side that loses 5% per metre, so the range dial goes to ' + Math.round(best + 4) + ' m (a margin for variety) and shot selection to 45%.', [A.dial('shootRange', Math.round(best + 4), 'Shooting range'), A.dial('shootFreedom', 0.45, 'Wait for a good one')]) }),
      next: 'Distances and directions are vectors with a size and a direction. Adding them tells you where to put a pass in front of a running player.',
    };
  });

  // ---------- Vectors in two dimensions: leading a pass ----------
  K.add('p-vec2d', (d) => {
    const R = { x: 60, y: 40 }, v = { x: 6, y: -2 }, t = 1.5, aim = { x: R.x + v.x * t, y: R.y + v.y * t };
    return {
      analogy: [
        'A through ball is not played to where the runner is. By the time it arrives he has moved on. The passer has to aim at where the runner will be, which is his position now plus the distance he will cover while the ball is travelling.',
        'Positions on the pitch, and the movements between them, are **vectors**: pairs of numbers $(x, y)$ with a size and a direction. Adding and scaling vectors is the whole calculation behind leading a pass.',
      ],
      why: 'A vector $\\begin{pmatrix} a \\\\ b \\end{pmatrix}$ describes a movement of $a$ along and $b$ across. Vectors add component by component, and multiplying by a number scales the movement.',
      steps: [
        step(['Give every position a pair of numbers: metres from our goal line (along the pitch) and from the left touchline (across). The striker stands at $(60, 40)$. The passer is at $(40, 34)$. The **displacement** from the passer to the striker is the vector from one to the other.'], ['$\\overrightarrow{PS} = \\begin{pmatrix} 60 - 40 \\\\ 40 - 34 \\end{pmatrix} = \\begin{pmatrix} 20 \\\\ 6 \\end{pmatrix}$', 'Length: $\\sqrt{20^2 + 6^2} = ' + m1(Math.hypot(20, 6)) + '$ m'],
          { pitch: true, view: 'attack', window: [30, 90, 14, 56], caption: 'The vector from the passer to the striker: 20 m along, 6 m across.', players: [P(40, 34, 'P', { ball: true }), P(60, 40, 'S')], arrows: [{ from: [40, 34], to: [60, 40], color: '#deb862', label: '(20, 6)' }] }),
        step(['The striker is running, not standing. His **velocity** is also a vector: $\\begin{pmatrix} 6 \\\\ -2 \\end{pmatrix}$ m/s means 6 m/s along the pitch and 2 m/s back across towards the left. Its speed is the length $\\sqrt{36 + 4} = ' + m1(Math.hypot(6, 2)) + '$ m/s.']),
        step(['The ball will take ' + t + ' s to reach him. In that time the runner covers velocity times time, which is the vector multiplied by the number ' + t + ':'], ['$' + t + ' \\begin{pmatrix} 6 \\\\ -2 \\end{pmatrix} = \\begin{pmatrix} ' + m(t * 6) + ' \\\\ ' + m(t * -2) + ' \\end{pmatrix}$']),
        step(['Add that movement to where he is now. The aiming point is his position vector plus his movement:'], ['$\\begin{pmatrix} 60 \\\\ 40 \\end{pmatrix} + \\begin{pmatrix} ' + m(t * 6) + ' \\\\ ' + m(t * -2) + ' \\end{pmatrix} = \\begin{pmatrix} ' + m(aim.x) + ' \\\\ ' + m(aim.y) + ' \\end{pmatrix}$'],
          { pitch: true, view: 'attack', window: [30, 90, 14, 56], caption: 'Aim at where he will be (gold), not where he is.', players: [P(40, 34, 'P', { ball: true }), P(R.x, R.y, 'S'), P(aim.x, aim.y, 'S', { ghost: true }), O(66, 36, '4')], arrows: [{ from: [R.x, R.y], to: [aim.x, aim.y], color: '#62d092', label: 'run', dy: -8 }, { from: [40, 34], to: [aim.x, aim.y], color: '#deb862' }] }),
        step(['The pass is then the vector from the passer to the aiming point:'], ['$\\begin{pmatrix} ' + m(aim.x) + ' - 40 \\\\ ' + m(aim.y) + ' - 34 \\end{pmatrix} = \\begin{pmatrix} ' + m(aim.x - 40) + ' \\\\ ' + m(aim.y - 34) + ' \\end{pmatrix}$, length $' + m1(Math.hypot(aim.x - 40, aim.y - 34)) + '$ m']),
        step(['That is ' + m1(Math.hypot(aim.x - 40, aim.y - 34) / t) + ' m/s, a firm pass. If it were played slower it would take longer, and the aim point moves further on: with a flight time of 2.5 s the aim point is $(60 + 15, 40 - 5) = (75, 35)$, nearly 15 m beyond the runner now.']),
        step(['This is why a through ball is risky: it depends on the runner holding his pace and direction. Defenders also move, so the further ahead you aim the more they can change the meeting point. A tight, low-risk team plays to feet (a short flight time and little lead); a direct team plays into space (a long flight time and a big lead).']),
      ],
      ask: ask('The striker is at $(60, 40)$ with velocity $\\begin{pmatrix} 6 \\\\ -2 \\end{pmatrix}$ m/s. The ball will take 1.5 s to reach him. What is the along-the-pitch coordinate (the first number) of the point you should aim at, in metres?', aim.x, 'm', { tol: 0.1,
        worked: ['Movement in 1.5 s: $1.5 \\times 6 = 9$ m along.', 'Aim point: $60 + 9 = 69$, and across $40 + 1.5 \\times (-2) = 37$, so $(69, 37)$.'],
        apply: A.both('Play more balls into space: directness 65%, final-third risk 60%', 'Passes into the final third are played ahead of the runner rather than to his feet. Expect more through balls, more passes that miss, and more clear chances when they work.', [A.dial('directness', 0.65, 'More into space'), A.dial('finalRisk', 0.6, 'Bolder final ball')]) }),
      next: 'All these tactical choices come down to chances: how often does something happen? The best estimate comes from counting what actually happened.',
    };
  });

  // ---------- Relative frequency: what the club\'s own shots say ----------
  K.add('g-probfreq', (d) => {
    const shots = d.shots.reduce((a, b) => a + b, 0), goals = d.goals.reduce((a, b) => a + b, 0), n = d.shots.length, conv = shots ? goals / shots : 0, per = shots / (n || 1);
    const pool = [0.08, 0.09, 0.1, 0.11, 0.12];
    return {
      analogy: [
        'Nobody knows the chance of a shot going in. What we can do is count: how many shots did the team take, and how many scored? The share that scored is the **relative frequency**, and it is the best estimate of the probability.',
        'The tactical question it feeds is simple and very practical: is your team\'s shot-taking working, or are you wasting possession on shots that do not score?',
      ],
      why: 'Relative frequency = number of times it happened divided by number of trials. With more trials it settles down towards the true probability.',
      steps: [
        step(['Your own record: in ' + n + ' matches the team took ' + shots + ' shots and scored ' + goals + ' goals.' + (d.example && d.example.shots ? ' (Example figures until you have played enough matches.)' : '')]),
        step(['Relative frequency of a goal per shot:'], ['$' + fr('\\text{goals}', '\\text{shots}') + ' = ' + fr(goals, shots) + ' = ' + m3(conv) + '$', 'That is about ' + m1(conv * 100) + '%, or one goal for every ' + (conv > 0 ? m1(1 / conv) : '-') + ' shots.']),
        step(['Is that good? Compare with the usual: across the game about 10% of shots score. ' + (conv < 0.085 ? 'Yours is below that, so a lot of your shots are not worth taking.' : conv > 0.125 ? 'Yours is above that, so you are shooting from good places (or have had good finishing luck).' : 'Yours is about average.')]),
        step(['More matches make the estimate steadier. Here is how the estimate wobbles when it is built on only a few shots and settles as the sample grows (an illustration with the true chance 0.1):'], null,
          { x: [0, 6], y: [0, 0.3], xlabel: 'number of matches counted', ylabel: 'estimated chance per shot', caption: 'Small samples bounce about; a longer record settles near the true value.', points: [{ x: 1, y: 0.2, r: 4 }, { x: 2, y: 0.05, r: 4 }, { x: 3, y: 0.14, r: 4 }, { x: 4, y: 0.08, r: 4 }, { x: 5, y: 0.11, r: 4 }], lines: [{ p1: [0, 0.1], p2: [6, 0.1], color: '#62d092', dash: '5 4', label: 'true 0.1', ly: 0.1, lx: 5 }] }),
        step(['Use it to predict: with the relative frequency ' + m3(conv) + ' and ' + m1(per) + ' shots a match, you expect $' + m1(per) + ' \\times ' + m3(conv) + ' = ' + m1(per * conv) + '$ goals a match.', 'To score one more goal a match at the same rate you would need $' + m1(1 / (conv || 1)) + '$ more shots, or better shots.']),
        step(['The game\'s own scale of shot quality (expected goals) lets you tell which of those it is: if your shots are many but poor the fix is to shoot less and wait for better ones; if they are good but rare the fix is to attack more.']),
      ],
      ask: ask('Over ' + n + ' matches the team took ' + shots + ' shots and scored ' + goals + ' goals. What fraction of shots scored? Give it as a decimal to 3 places.', conv, '', { tol: 0.006,
        worked: ['Divide goals by shots: $' + goals + ' / ' + shots + ' = ' + m3(conv) + '$.'],
        apply: A.when(conv < 0.1, A.both('Shoot less and wait: shot selection 40%, shooting range 24 m', 'Your conversion is below the usual 10%, so fewer, better shots: the range is cut and the player waits for a clearer chance.', [A.dial('shootFreedom', 0.4, 'More patient'), A.dial('shootRange', 24, 'Closer range')]), A.both('Keep shooting as you are, with a little more freedom', 'Your conversion is at or above the usual 10%, so shots are being taken from good places. Shot selection goes up a little to use that.', [A.dial('shootFreedom', 0.55, 'A little freer')])) }),
      next: 'Conditional probability links one chance to another. That is how you work out how much a high press, or a long ball, is really worth.',
    };
  });
})();
