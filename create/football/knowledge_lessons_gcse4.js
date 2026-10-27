// GCSE Maths lessons, Geometry and measures, Probability, Statistics.
(function () {
  const K = window.FM && window.FM.K; if (!K) return;
  const { m, m1, m3, fr, sum, mean, eg, A, ask, step, gbp, num } = K;
  const PI = Math.PI;

  K.add('g-angles', (d) => ({
    analogy: ['A shot at goal is a triangle: the shooter at one corner and the two posts at the other two. The angle at the shooter is how much goal he can see.', 'Angle facts are the rules that let you work out an unknown angle from the ones you know.'],
    why: 'Angles on a straight line add to 180°, around a point to 360°, and in a triangle to 180°.',
    steps: [
      step(['Angles on a straight line add to 180°. A pass runs along the touchline; a second pass leaves it at 117°. The angle on the other side:'], '$180 - 117 = 63$'),
      step(['Angles around a point add to 360°. Four runs from the centre spot at 90° each fill the full turn.']),
      step(['Angles in a triangle add to 180°. A shooter sees the goal at an angle; if the two angles at the posts are 71° and 74°, the shooter\'s angle is:'], '$180 - 71 - 74 = 35$'),
      step(['Vertically opposite angles are equal; corresponding and alternate angles on parallel lines are equal. The touchlines are parallel: that is why runs along them make matching angles.']),
      step(['A wider shooting angle means a better chance. That is why shots from the middle of the box are worth more than ones from the byline.']),
    ],
    ask: ask('A triangle has two angles of 71° and 74°. What is the third angle, in degrees?', 35, '°', { tol: 0, worked: ['$180 - 71 - 74 = 35$.'], apply: mean(d.shots) < 12 ? A.plan('final', 'approach', 'through', 'You take under 12 shots a match: look for through-balls that open a wider shooting angle') : A.plan('final', 'approach', 'std', 'You take plenty of shots: keep the approach in the final third as it is') }),
    next: 'Shapes with more sides have angle rules too. Polygons next.',
  }));

  K.add('g-polygons', (d) => ({
    analogy: ['A back four and a three-man midfield make shapes on the pitch: a quadrilateral and a triangle. The corner flags make a rectangle. Each shape has an angle sum you can calculate.', 'The sum of the interior angles of an n-sided polygon is $(n - 2) \\times 180$.'],
    why: 'Any polygon can be cut into triangles, and each triangle contributes 180°.',
    steps: [
      step(['A triangle has 3 sides and angles totalling 180°. A quadrilateral (like the pitch) is two triangles: 360°.']),
      step(['The rule: interior angles of an $n$-sided polygon add to $(n - 2) \\times 180$.'], '$(5 - 2) \\times 180 = 540$'),
      step(['A regular polygon has equal angles. A regular pentagon: $540 \\div 5 = 108$° each.']),
      step(['Exterior angles of any polygon add to 360°. For a regular polygon each is $360 \\div n$.'], '$360 \\div 5 = 72$'),
      step(['A back four standing on a line and a midfield in a diamond: the angle of the diamond at its widest is the angle between runners.']),
    ],
    ask: ask('A regular hexagon has 6 equal interior angles. How big is each, in degrees?', 120, '°', { tol: 0, worked: ['Sum $= (6 - 2) \\times 180 = 720$.', '$720 \\div 6 = 120$.'], apply: A.plan('build', 'shape', 'box', 'Regular shapes give equal angles to pass along: set the build-up to a box shape') }),
    next: 'Area is how much grass you have to look after, and how much space there is to attack.',
  }));

  K.add('g-area', (d) => {
    const area = 105 * 68, box = 16.5 * 40.32;
    return {
      analogy: ['The pitch is 105 m by 68 m. The penalty area is 16.5 m deep and 40.32 m wide. The grounds staff need areas to know how much grass, paint and water to buy.', 'Area is length times width for a rectangle, with a half for a triangle.'],
      why: 'Area is how much surface a shape covers, and each shape has a formula for it.',
      steps: [
        step(['Rectangle: length times width.'], '$105 \\times 68 = ' + area + '$ m²'),
        step(['The penalty area: $16.5 \\times 40.32 = ' + m1(box) + '$ m².']),
        step(['Triangle: half base times height. A triangular training zone with base 20 m and height 12 m:'], '$\\tfrac{1}{2} \\times 20 \\times 12 = 120$ m²'),
        step(['Parallelogram: base times perpendicular height. Trapezium: half the sum of the parallel sides times the height.']),
        step(['Perimeter is the distance round the edge: the pitch\'s is $2(105 + 68) = 346$ m.']),
      ],
      ask: ask('The penalty area is 16.5 m by 40.32 m. What is its area in square metres, to 1 decimal place?', box, 'm²', { tol: 0.06, worked: ['$16.5 \\times 40.32 = ' + m1(box) + '$.'], apply: A.marketing(d) }),
      next: 'Circles come next: the centre circle and everything round.',
    };
  });

  K.add('g-circles', (d) => {
    const r = 9.15, c = 2 * PI * r, a = PI * r * r;
    return {
      analogy: ['The centre circle has a radius of 9.15 m: the distance a defending wall must stand back at a free kick. The circle is the shape of that rule.', 'Circumference is the distance round, area is the space inside.'],
      why: 'Circumference is $2\\pi r$ and area is $\\pi r^2$.',
      steps: [
        step(['Radius $r = 9.15$ m (centre to edge). Diameter is twice that, 18.3 m.']),
        step(['Circumference.'], '$C = 2\\pi r = 2 \\times \\pi \\times 9.15 = ' + m1(c) + '$ m'),
        step(['Area.'], '$A = \\pi r^2 = \\pi \\times 9.15^2 = ' + m1(a) + '$ m²'),
        step(['A sector is a slice. The fraction of the circle times the whole: a quarter-circle corner arc of radius 1 m has an arc length $\\tfrac{1}{4} \\times 2\\pi \\times 1 \\approx 1.57$ m.']),
        step(['Keep $\\pi$ on your calculator until the end to avoid rounding early.']),
      ],
      ask: ask('The centre circle has a radius of 9.15 m. What is its circumference in metres, to 1 decimal place?', c, 'm', { tol: 0.06, worked: ['$2 \\pi \\times 9.15 = ' + m1(c) + '$.'], apply: A.plan('transDef', 'foul', 'std', 'Free kicks are set 9.15 m back: keep tactical fouls standard so you do not give away dangerous ones') }),
      next: 'Volume and surface area: the third dimension.',
    };
  });

  K.add('g-volume', (d) => {
    const area = 105 * 68, depth = 0.02, vol = area * depth;
    return {
      analogy: ['The groundsman waters the pitch to a depth of 2 cm. How much water is that? Volume is the space inside a solid: area of the base times the height.', 'The ball itself is a sphere, and its surface and volume have formulas too.'],
      why: 'Volume is base area times height for a prism; a sphere has its own formula.',
      steps: [
        step(['A prism: volume = cross-section area times length.'], '$V = A \\times h$'),
        step(['The pitch is 7140 m². A layer of water 2 cm (0.02 m) deep:'], '$7140 \\times 0.02 = ' + m(vol) + '$ m³'),
        step(['Cylinder: $V = \\pi r^2 h$. Sphere: $V = \\tfrac{4}{3}\\pi r^3$. Cone: $\\tfrac{1}{3}\\pi r^2 h$.']),
        step(['A ball has radius 0.11 m. Its volume:'], '$\\tfrac{4}{3}\\pi \\times 0.11^3 = ' + m3(4 / 3 * PI * Math.pow(0.11, 3)) + '$ m³'),
        step(['Surface area of a sphere is $4\\pi r^2$: the leather needed to cover it.']),
      ],
      ask: ask('A layer of water 2 cm deep covers the 105 m by 68 m pitch. What is the volume of water, in cubic metres?', vol, 'm³', { tol: 0.2, worked: ['$105 \\times 68 \\times 0.02 = ' + m1(vol) + '$.'], apply: A.price(d, 'fourth', 99) }),
      next: 'Pythagoras gives the distance between two players. The first big theorem.',
    };
  });

  K.add('g-pythag', (d) => {
    const a = 24, b = 32, c = Math.sqrt(a * a + b * b), diag = Math.sqrt(105 * 105 + 68 * 68);
    return {
      analogy: ['A pass of 24 m across and 32 m forward is not 56 m long: it goes in a straight line between the two. The true length is the hypotenuse of a right-angled triangle.', 'Pythagoras: the square on the longest side equals the sum of the squares on the other two.'],
      why: 'In a right-angled triangle $a^2 + b^2 = c^2$, and it gives the straight-line distance between two players.',
      steps: [
        step(['A pass goes ' + a + ' m across and ' + b + ' m forward.'], '$c^2 = ' + a + '^2 + ' + b + '^2 = ' + (a * a + b * b) + '$'),
        step(['Take the square root.'], '$c = \\sqrt{' + (a * a + b * b) + '} = ' + c + '$ m'),
        step(['The same idea gives the pitch diagonal: $\\sqrt{105^2 + 68^2} \\approx ' + m1(diag) + '$ m, the longest pass on the field.']),
        step(['To find a shorter side, subtract: if the pass is 41 m and 32 m of it was forward, the width is $\\sqrt{41^2 - 32^2} = 25.6$ m.']),
        step(['Whole-number triples like 3, 4, 5 and 5, 12, 13 are handy to spot. 24, 32, 40 is just the 3, 4, 5 triangle with every side multiplied by 8.']),
      ],
      ask: ask('A pass travels 24 m across the pitch and 32 m forward. How long is the pass in a straight line, in metres?', c, 'm', { tol: 0.1, worked: ['$24^2 + 32^2 = 576 + 1024 = 1600$.', '$\\sqrt{1600} = 40$.'], apply: A.plan('midfield', 'switch', 'often', 'A diagonal pass is longer than it looks (here 40 m): set the team to switch play often and use the space on the far side') }),
      next: 'Trigonometry finds angles and sides from ratios. Sine, cosine and tangent.',
    };
  });

  K.add('g-trig', (d) => {
    const o = 12, a = 16, ang = Math.atan(o / a) * 180 / PI, h = Math.sqrt(o * o + a * a);
    return {
      analogy: ['A shooter is ' + a + ' m from the goal line and ' + o + ' m from the near post along it. What angle is he at to the post? Right-angled trigonometry links angles to ratios of sides.', 'SOH CAH TOA: sine is opposite over hypotenuse, cosine is adjacent over hypotenuse, tangent is opposite over adjacent.'],
      why: 'The ratios of sides in a right-angled triangle depend only on the angle, which lets you find angles from lengths and lengths from angles.',
      steps: [
        step(['Label the sides from the angle $\\theta$: opposite, adjacent, hypotenuse.']),
        step(['SOH CAH TOA.'], ['$\\sin\\theta = ' + fr('\\text{opp}', '\\text{hyp}') + '$', '$\\cos\\theta = ' + fr('\\text{adj}', '\\text{hyp}') + '$', '$\\tan\\theta = ' + fr('\\text{opp}', '\\text{adj}') + '$']),
        step(['The shooter has opposite ' + o + ' and adjacent ' + a + ', so use tangent.'], '$\\tan\\theta = ' + fr(o, a) + ' = ' + m3(o / a) + '$'),
        step(['To get the angle, use the inverse.'], '$\\theta = \\tan^{-1}(' + m3(o / a) + ') = ' + m1(ang) + '$°'),
        step(['The hypotenuse (the length of the shot) is $\\sqrt{' + o + '^2 + ' + a + '^2} = ' + m1(h) + '$ m.']),
      ],
      ask: ask('A shooter is ' + a + ' m from the goal line, ' + o + ' m along it from the post. Use $\\tan\\theta = ' + fr(o, a) + '$ to find the angle $\\theta$, in degrees to 1 decimal place.', ang, '°', { tol: 0.15, worked: ['$\\tan^{-1}(0.75) = ' + m1(ang) + '$.'], apply: A.plan('final', 'box', 'many', 'Angles open up when more runners arrive in the box: send more bodies into the area') }),
      next: 'The sine and cosine rules extend this to any triangle, not just right-angled ones.',
    };
  });

  K.add('g-sinecos', (d) => {
    const a = 20, b = 24, C = 50, area = 0.5 * a * b * Math.sin(C * PI / 180), c2 = a * a + b * b - 2 * a * b * Math.cos(C * PI / 180);
    return {
      analogy: ['Three players make a triangle with no right angle: two are 20 m and 24 m from the ball and the angle between them at the ball is 50°. How far apart are they, and how much space do they cover?', 'The cosine rule gives the third side, the sine rule gives angles and the area formula gives the space.'],
      why: 'These rules work in any triangle, not just right-angled ones.',
      steps: [
        step(['Sides ' + a + ' m and ' + b + ' m with an angle of ' + C + '° between.']),
        step(['Cosine rule for the third side: $c^2 = a^2 + b^2 - 2ab\\cos C$.'], '$c^2 = ' + a + '^2 + ' + b + '^2 - 2(' + a + ')(' + b + ')\\cos ' + C + ' = ' + m1(c2) + '$'),
        step(['So $c = \\sqrt{' + m1(c2) + '} = ' + m1(Math.sqrt(c2)) + '$ m.']),
        step(['Area of a triangle: $\\tfrac{1}{2}ab\\sin C$.'], '$\\tfrac{1}{2} \\times ' + a + ' \\times ' + b + ' \\times \\sin ' + C + ' = ' + m1(area) + '$ m²'),
        step(['The sine rule: $' + fr('a', '\\sin A') + ' = ' + fr('b', '\\sin B') + '$ finds an angle when you know a side opposite it.']),
      ],
      ask: ask('Three players make a triangle with sides 20 m and 24 m and an angle of 50° between them. What is the area of the triangle, in square metres to 1 decimal place?', area, 'm²', { tol: 0.2, worked: ['$\\tfrac{1}{2} \\times 20 \\times 24 \\times \\sin 50° = ' + m1(area) + '$.'], apply: A.plan('defence', 'compact', 'tight', 'A smaller triangle between defenders leaves less space inside it: set the defence compact') }),
      next: 'Similar shapes have the same angles but different sizes: the tactics board again.',
    };
  });

  K.add('g-similar', (d) => ({
    analogy: ['The tactics board is a copy of the pitch, smaller in every direction by the same amount. Shapes like that are similar: same angles, lengths in the same ratio.', 'Congruent shapes are identical in size and shape, like two kits of the same design.'],
    why: 'Similar shapes have equal angles and matching sides in the same ratio; areas scale with the square of that ratio.',
    steps: [
      step(['A penalty area on the board is 8.25 cm by 20.16 cm. The real one is 16.5 m by 40.32 m. The scale factor is:'], '$' + fr('1650', '8.25') + ' = 200$'),
      step(['Every length is multiplied by 200. Check the other side: $20.16 \\times 200 = 4032$ cm, which is 40.32 m.']),
      step(['The angles are unchanged: the corners are still 90°.']),
      step(['Areas change by the square of the scale factor: $200^2 = 40000$. The board area $166.3$ cm² becomes $6.65 \\times 10^6$ cm², about 665 m².']),
      step(['Congruence tests: SSS, SAS, ASA and RHS. Two triangles that satisfy one of them match exactly.']),
    ],
    ask: ask('A small triangle is similar to a larger one with a scale factor of 3. The small one has an area of 12 cm². What is the area of the larger one, in cm²?', 108, 'cm²', { tol: 0, worked: ['Area scale factor $3^2 = 9$.', '$12 \\times 9 = 108$.'], apply: A.price(d, 'second', 99) }),
    next: 'Transformations move shapes: reflect, rotate, translate, enlarge.',
  }));

  K.add('g-trans', (d) => ({
    analogy: ['Your analysts rotate the pitch picture so the attack always runs left to right, reflect it so the left wing and right wing can be compared, and enlarge a zone to inspect it. Those are transformations.', 'A transformation moves a shape without changing what it is (except enlargement, which changes size).'],
    why: 'Translations slide, reflections flip, rotations turn and enlargements scale, each with its own description.',
    steps: [
      step(['Translation: slide by a vector. A midfielder at $(30, 20)$ moving $(+12, -4)$ ends at $(42, 16)$.'], '$' + fr('+12', '-4') + '$'),
      step(['Reflection: flip in a mirror line. Reflecting the left winger at $(20, 10)$ in the line $y = 34$ (the pitch centre line) gives $(20, 58)$: the right winger\'s mirror position.']),
      step(['Rotation: turn about a centre by an angle. Turning the attack 180° about the centre spot swaps the two goals.']),
      step(['Enlargement: scale from a centre by a scale factor. A scale factor of 2 doubles every distance from the centre.']),
      step(['To describe a transformation fully give its type and the vector, mirror line, centre and angle or scale factor.']),
    ],
    ask: ask('A reflection in the line $y = 34$ (the centre line of the pitch) sends the point $(20, 10)$ to $(20, y)$. What is $y$?', 58, 'm', { tol: 0, worked: ['$10$ is $24$ below $34$.', 'The mirror image is $24$ above: $34 + 24 = 58$.'], apply: A.plan('midfield', 'overload', 'std', 'Left and right are mirror images: keep the team balanced and do not overload a single side') }),
    next: 'Vectors describe moves as an amount and a direction. Next.',
  }));

  K.add('g-vectors', (d) => {
    const pass = [30, 12], run = [-6, 8], sum2 = [pass[0] + run[0], pass[1] + run[1]];
    return {
      analogy: ['A pass has a size and a direction: 30 m forward and 12 m across. That pair is a vector. A runner moves 6 m back and 8 m across while it flies. Adding the vectors gives where they meet.', 'Vectors add by adding their components.'],
      why: 'A vector has both a size and a direction, written as components, and vectors add component by component.',
      steps: [
        step(['A pass: 30 m forward, 12 m across.'], '$\\mathbf{p} = ' + fr(pass[0], pass[1]) + '$'),
        step(['A run: 6 m back and 8 m across.'], '$\\mathbf{r} = ' + fr(run[0], run[1]) + '$'),
        step(['Add the components.'], '$\\mathbf{p} + \\mathbf{r} = ' + fr(sum2[0], sum2[1]) + '$'),
        step(['The size (magnitude) is found by Pythagoras: $\\sqrt{' + sum2[0] + '^2 + ' + sum2[1] + '^2} = ' + m1(Math.hypot(sum2[0], sum2[1])) + '$ m.']),
        step(['A scalar multiple scales a vector: $2\\mathbf{p}$ is the same direction, twice as long.']),
      ],
      ask: ask('A pass is $' + fr(pass[0], pass[1]) + '$ and a run is $' + fr(run[0], run[1]) + '$. What is the first component of $\\mathbf{p} + \\mathbf{r}$?', sum2[0], 'm', { tol: 0, worked: ['$30 + (-6) = 24$.'], apply: A.plan('transAtt', 'support', 'many', 'Vectors add up when several players move together: send more support after a turnover') }),
      next: 'Bearings give a direction as an angle from north. Next.',
    };
  });

  K.add('g-bearings', (d) => ({
    analogy: ['A bearing is how a scout gives a direction: an angle from north, measured clockwise, written with three figures. A winger running toward the far corner from the halfway line has a bearing you can measure.', 'Three rules: from north, clockwise, three figures.'],
    why: 'A bearing is the clockwise angle from north, written with three digits.',
    steps: [
      step(['Draw a north line at the starting point. Measure clockwise to the direction of travel.']),
      step(['East is 090°, south is 180°, west is 270°. Always three figures: 45° is 045°.']),
      step(['If the bearing from A to B is 065°, the back bearing from B to A is $65 + 180 = 245°$. Add 180 if the answer is below 180, subtract if above.']),
      step(['Combine with trigonometry: a run of 40 m on a bearing of 060° goes $40\\sin 60 = ' + m1(40 * Math.sin(PI / 3)) + '$ m east and $40\\cos 60 = 20$ m north.']),
      step(['On a tactics board, the "north" is the direction of the attack, so all runs have bearings.']),
    ],
    ask: ask('The bearing of B from A is 065°. What is the bearing of A from B?', 245, '°', { tol: 0, worked: ['Add 180: $65 + 180 = 245$.'], apply: A.plan('transAtt', 'outlet', 'wing', 'Runs have bearings: send the first outlet to the wing after winning the ball') }),
    next: 'Constructions and loci: the paths points can take.',
  }));

  K.add('g-loci', (d) => ({
    analogy: ['The wall at a free kick stands at least 9.15 m from the ball: every position that distance away is a circle. A locus is the set of all points that follow a rule.', 'Constructions draw them with only a compass and ruler.'],
    why: 'A locus is every point that satisfies a rule: a fixed distance gives a circle, equal distance from two points gives a perpendicular bisector.',
    steps: [
      step(['Points 9.15 m from the ball: a circle centred on the ball with radius 9.15 m.']),
      step(['Points equidistant from two players A and B: the perpendicular bisector of AB. It is where a pass between them is equally easy to reach.']),
      step(['Points equidistant from two lines: the angle bisector. A winger running down it is equally far from the touchline and the byline.']),
      step(['A line parallel to the touchline at 5 m: the zone in which full-backs are told to run.']),
      step(['Construct with a compass: arcs from each end of a line, the same radius, meet above and below; join them for the bisector.']),
    ],
    ask: ask('The wall must stand at least 9.15 m from the ball. The locus of points exactly 9.15 m from the ball is a circle. What is its diameter, in metres?', 18.3, 'm', { tol: 0.01, worked: ['Diameter is twice the radius: $2 \\times 9.15 = 18.3$.'], apply: A.plan('defence', 'trap', 'on', 'A line of defenders is a locus too: set the offside trap on') }),
    next: 'Probability next, from the first look at chance to conditional probability.',
  }));

  K.add('g-probfreq', (d) => {
    const w = d.wins, p = Math.max(1, d.played), rf = w / p, exp = Math.round(rf * 14);
    return {
      analogy: ['If you have won ' + w + ' of ' + p + ' matches, your relative frequency of winning is ' + w + '/' + p + '. It is your best estimate of the chance of winning the next, and with more matches it settles down.', 'Expected outcomes multiply the chance by the number of tries.'],
      why: 'Relative frequency is successes divided by trials, and it estimates the probability when there is no formula.',
      steps: [
        step(['You have won ' + w + ' of ' + p + '.'].concat(eg(d, 'results')), '$' + fr(w, p) + ' = ' + m3(rf) + '$'),
        step(['That is the relative frequency of a win. It is an estimate: with only ' + p + ' matches it can change a lot.']),
        step(['More trials gives a better estimate. A coin tossed 10 times might give 7 heads; tossed 1000 times it gets close to 500.']),
        step(['Expected outcomes: the chance times the number of tries. In 14 matches you can expect:'], '$' + m3(rf) + ' \\times 14 = ' + m1(rf * 14) + '$ wins'),
        step(['Expected is not guaranteed. It is the average over many seasons.']),
      ],
      ask: ask('You have won ' + w + ' of ' + p + ' matches. At that rate, how many wins would you expect in 14 matches? Round to the nearest whole number.', exp, 'wins', { tol: 0.6, worked: [fr(w, p) + ' x 14 = ' + m1(rf * 14) + '.'], apply: rf < 0.4 ? A.plan('press', 'intensity', 'high', 'Winning ' + m1(rf * 100) + '% of matches is below what a season needs: raise the pressing') : A.plan('press', 'intensity', 'std', 'You win ' + m1(rf * 100) + '% of matches: keep the pressing as it is') }),
      next: 'Sample spaces list every possible outcome so none is missed.',
    };
  });

  K.add('g-probspace', (d) => ({
    analogy: ['Before a match, the outcomes are win, draw or lose. In a penalty shootout each kick is a goal or a miss. A sample space lists every outcome so you can count the ones you want.', 'A Venn diagram shows overlap: players who score and players who assist.'],
    why: 'A sample space is the full list of outcomes; the probability of an event is the number of ways it can happen over the total.',
    steps: [
      step(['Two matches, each W, D or L. The sample space has $3 \\times 3 = 9$ outcomes: WW, WD, WL, DW, DD, DL, LW, LD, LL.']),
      step(['Winning both: 1 outcome out of 9.'], '$P(WW) = ' + fr(1, 9) + '$'),
      step(['At least one win: WW, WD, WL, DW, LW is 5 outcomes.'], '$P = ' + fr(5, 9) + '$'),
      step(['These nine are only equally likely if W, D and L are. In real football they are not, which is why we use a tree with real probabilities.']),
      step(['A Venn diagram: of 11 starters, 4 scored, 5 assisted, 2 did both. Those who did either: $4 + 5 - 2 = 7$.']),
    ],
    ask: ask('Of your 11 starters, 4 scored and 5 assisted, and 2 players both scored and assisted. How many players did at least one of the two?', 7, 'players', { tol: 0, worked: ['$4 + 5 - 2 = 7$.'], apply: A.plan('final', 'box', 'std', 'Shared credit means chances come from many players: keep the number in the box standard') }),
    next: 'Conditional probability: the chance of one thing when you know another has happened.',
  }));

  K.add('g-probcond', (d) => {
    const w = Math.max(1, d.wins), p = Math.max(2, d.played), pw = w / p, afterWin = Math.min(0.95, pw + 0.1);
    return {
      analogy: ['The chance of winning is not the same after a win as after a loss: confidence, form and rest all change it. That is a conditional probability: the chance of A given that B has happened.', 'A tree diagram makes it visible: the second set of branches depends on the first.'],
      why: '$P(A \\text{ given } B)$ is the probability of A when you already know B; on a tree it is the number on the second branch.',
      steps: [
        step(['Suppose after a win you win again with probability ' + m(afterWin) + ', and after a non-win with ' + m(pw) + '.']),
        step(['Draw the first branch: win ' + m(pw) + ' or not ' + m(1 - pw) + '.']),
        step(['From "win", the second branch: win ' + m(afterWin) + ', not win ' + m(1 - afterWin) + '.']),
        step(['Multiply along the branches for "win then win".'], '$' + m(pw) + ' \\times ' + m(afterWin) + ' = ' + m3(pw * afterWin) + '$'),
        step(['Compare with independent events, where $P(\\text{both}) = P(A) \\times P(B)$ with no change. Here the second chance depends on the first.']),
      ],
      ask: ask('The chance of winning is ' + m(pw) + ', and the chance of winning again after a win is ' + m(afterWin) + '. What is the chance of winning two in a row, to 3 decimal places?', pw * afterWin, '', { tol: 0.002, worked: [m(pw) + ' x ' + m(afterWin) + ' = ' + m3(pw * afterWin) + '.'], apply: pw * afterWin < 0.25 ? A.plan('transDef', 'react', 'regroup', 'Back-to-back wins are rare at ' + m3(pw * afterWin) + ': protect each result by regrouping when the ball is lost') : A.plan('transDef', 'react', 'std', 'Back-to-back wins are a realistic ' + m3(pw * afterWin) + ': keep the reaction to a lost ball as it is') }),
      next: 'Statistics: how to collect fair samples from a population.',
    };
  });

  K.add('g-sampling', (d) => ({
    analogy: ['The board wants to know what supporters think of ticket prices. Asking all 8,000 is impractical; asking the ten nearest to the exit at the gate would not be fair. Sampling is choosing a few so they represent all.', 'The population is everyone you care about; the sample is the part you ask.'],
    why: 'A sample must be chosen fairly and be big enough, or it gives a biased picture of the population.',
    steps: [
      step(['Population: all season-ticket holders. Sample: those you ask.']),
      step(['A random sample gives every member an equal chance of being picked: put every membership number in a hat or use a random number generator.']),
      step(['Bias comes from how you choose: asking only people at the family stand misses everyone in the safe-standing end.']),
      step(['A stratified sample takes the right share from each group: 25% of the sample from the stand holding 25% of the fans.']),
      step(['Bigger samples are less affected by chance, but cost more to collect.']),
    ],
    ask: ask('The ground holds 8,000 fans and 2,000 of them sit in the family stand. A stratified sample of 200 fans is taken. How many of the 200 should come from the family stand?', 50, 'fans', { tol: 0, worked: ['$2000/8000 = 1/4$.', '$200 \\times 1/4 = 50$.'], apply: A.price(d, 'emptiest', 99) }),
    next: 'Once collected, data must be drawn clearly: tables, charts and diagrams.',
  }));

  K.add('g-charts', (d) => {
    const g = d.goals.slice(0, 8), cnt = {}; g.forEach((x) => { cnt[x] = (cnt[x] || 0) + 1; });
    return {
      analogy: ['Your goals per match are a list of numbers. A frequency table counts how often each appears, and a chart shows it. Analysts live in charts like these.', 'A pictogram, bar chart and pie chart each show the same facts in different ways.'],
      why: 'A frequency table counts each value; a chart draws the counts so the pattern can be seen.',
      steps: [
        step(['Goals in your first ' + g.length + ' matches: ' + g.join(', ') + '.'].concat(eg(d, 'results'))),
        step(['Tally them: how often did you score 0, 1, 2, 3?'], Object.keys(cnt).sort().map((k) => '$' + k + ' \\text{ goals: } ' + cnt[k] + '$')),
        step(['A bar chart draws a bar for each value, as tall as its frequency. Bars have gaps between them for separate categories.']),
        step(['A pie chart shares 360° by frequency: the angle for a value is $' + fr('\\text{frequency}', '\\text{total}') + ' \\times 360$. Two of ' + g.length + ' matches is $' + fr(2, g.length) + ' \\times 360 = ' + m(2 / g.length * 360) + '$°.']),
        step(['Choose the chart to match the data: bar charts for counts, pie charts for shares, line graphs for change over time.']),
      ],
      ask: ask('In your first ' + g.length + ' matches you scored ' + g.join(', ') + '. How many matches did you score exactly ' + g[0] + ' goals in? (Count the tally.)', g.filter((x) => x === g[0]).length, 'matches', { tol: 0, worked: ['Count the ' + g[0] + 's in the list.'], apply: mean(g) < 1.3 ? A.plan('final', 'dribbling', 'more', 'You score under 1.3 a match: encourage dribbling to create more chances') : A.plan('final', 'dribbling', 'std', 'You score ' + m1(mean(g)) + ' a match: keep the dribbling at standard') }),
      next: 'Grouped data is when values are put into class intervals. Histograms and cumulative frequency.',
    };
  });

  K.add('g-grouped', (d) => {
    const c = d.crowdSeries.slice(0, 8), lo = Math.floor(Math.min.apply(null, c) / 500) * 500, bins = [0, 1, 2, 3].map((i) => [lo + i * 500, lo + (i + 1) * 500]), cnt = bins.map((b) => c.filter((x) => x >= b[0] && x < b[1]).length);
    return {
      analogy: ['Crowds are too many different numbers to tally one by one. We group them: 7,500 to 8,000, 8,000 to 8,500, and so on. That is grouped data, and a histogram draws it.', 'Cumulative frequency adds up as you go, so you can read the median and quartiles from a curve.'],
      why: 'Grouped data hides the exact values, so we estimate the mean from the midpoints and read the median from a cumulative curve.',
      steps: [
        step(['Your recent home crowds: ' + c.map(num).join(', ') + '.']),
        step(['Group them in 500s.'], bins.map((b, i) => '$' + b[0] + ' \\le x < ' + b[1] + ': ' + cnt[i] + '$')),
        step(['A histogram uses frequency density (frequency divided by class width) for the height when the classes differ in width.']),
        step(['Estimate the mean using midpoints times frequencies.'], '$' + fr('\\sum fx', '\\sum f') + '$'),
        step(['Cumulative frequency is a running total: plot it against the upper class boundary and join with a smooth curve. The median is the value at half the total.']),
      ],
      ask: ask('Your recent home crowds were ' + c.map(num).join(', ') + '. How many of them were at least ' + bins[1][0] + '?', c.filter((x) => x >= bins[1][0]).length, 'matches', { tol: 0, worked: ['Count the values of ' + bins[1][0] + ' or more.'], apply: A.marketing(d) }),
      next: 'A time series is data recorded across time, like a season of results.',
    };
  });

  K.add('g-timeseries', (d) => {
    const cs0 = d.crowdSeries, g = cs0.concat(cs0).slice(0, 6), mavg = [0, 1, 2, 3].map((i) => (g[i] + g[i + 1] + g[i + 2]) / 3);
    return {
      analogy: ['Crowds over the season go up and down. A time series is those numbers in time order, and a moving average smooths out the bumps so you see the trend.', 'The trend is where it is heading; the bumps are the match-to-match noise.'],
      why: 'A moving average smooths a time series so the trend stands out from the bumps.',
      steps: [
        step(['Home crowds in order: ' + g.map(num).join(', ') + '.'].concat(eg(d, 'series'))),
        step(['A 3-point moving average: add three in a row and divide by 3. Move along one place and repeat.'], '$' + fr(g[0] + '+' + g[1] + '+' + g[2], 3) + ' = ' + m(mavg[0]) + '$'),
        step(['The averages: ' + mavg.map(m).join(', ') + '. Notice they change less than the raw crowds.']),
        step(['The trend is whether those averages rise, fall or stay level.']),
        step(['Seasonal variation repeats every cycle: a derby or a cup tie always lifts the crowd. A trend line and the seasonal pattern together give a forecast.']),
      ],
      ask: ask('Home crowds were ' + g.slice(0, 3).map(num).join(', ') + '. What is the first 3-point moving average, to the nearest whole fan?', Math.round(mavg[0]), 'fans', { tol: 1, worked: ['$(' + g.slice(0, 3).join(' + ') + ') \\div 3 = ' + m(mavg[0]) + '$.'], apply: mavg[3] < mavg[0] ? A.marketing(d) : A.price(d, 'big', 3) }),
      next: 'That completes GCSE. The next point in the schedule continues with what is still due.',
    };
  });
})();
