// A-level Pure Mathematics lessons (Edexcel 9MA0): proof, algebra and functions, coordinate geometry, sequences and series, trigonometry.
(function () {
  const K = window.FM && window.FM.K; if (!K) return;
  const { m, m1, m3, fr, sum, mean, eg, A, ask, step, gbp, num } = K;
  const PI = Math.PI, deg = (x) => x * PI / 180;
  const demandOf = (s) => { const k = 0.9 * s.sold / s.price, a = s.sold + k * s.price; return { k, a }; };

  K.add('p-proofalg', (d) => {
    const n = 5, v = 4 * n * (n + 1);
    return {
      analogy: ['A proof is the opposite of a test: a test checks a few cases, a proof shows a statement is true for every case. Analysts need that when a rule has to hold for every match, every shirt number and every crowd.', 'Proof by deduction means starting from letters that stand for any number of a kind and reasoning step by step.'],
      why: 'Algebra lets you prove a statement for every number of a kind at once, instead of checking cases.',
      steps: [
        step(['Claim: the square of any odd number, minus 1, is a multiple of 4. Check: $3^2 - 1 = 8$, $5^2 - 1 = 24$. Two cases are not a proof.']),
        step(['Any odd number can be written $2n + 1$ where $n$ is an integer. That one expression stands for every odd number.']),
        step(['Square it and subtract 1.'], '$(2n + 1)^2 - 1 = 4n^2 + 4n + 1 - 1 = 4n^2 + 4n$'),
        step(['Factorise to expose the multiple of 4.'], '$4n^2 + 4n = 4n(n + 1)$'),
        step(['$4n(n + 1)$ has a factor of 4 whatever $n$ is, so it is a multiple of 4. That proves the claim for every odd number. Ending with "so, for all $n$" is what makes it a proof.']),
      ],
      ask: ask('Use the proof: $(2n + 1)^2 - 1 = 4n(n + 1)$. For the shirt number 11 (so $n = 5$), what is $(2n + 1)^2 - 1$?', v, '', { tol: 0, worked: ['$4 \\times 5 \\times 6 = 120$, and $11^2 - 1 = 120$.'], apply: A.price(d, 'second', 3) }),
      next: 'Proof by exhaustion and counter-example: other ways to settle a claim.',
    };
  });

  K.add('p-proofcontra', (d) => ({
    analogy: ['A pundit says "no team that concedes first ever wins". One win from behind kills the claim: a single counter-example disproves a universal statement.', 'Some claims are proved by checking every possibility (exhaustion), and some by assuming the opposite and reaching nonsense (contradiction).'],
    why: 'One counter-example disproves a claim; exhaustion proves it by covering every case; contradiction proves it by showing the opposite is impossible.',
    steps: [
      step(['Counter-example. Claim: "every prime number is odd". The prime 2 is even, so the claim is false. One case is enough to disprove.']),
      step(['Exhaustion. Claim: "the square of an integer ends in 0, 1, 4, 5, 6 or 9". Any integer ends in 0 to 9, and the last digit of the square depends only on the last digit, so check ten cases.'], '$0^2 = 0, 1^2 = 1, 2^2 = 4, 3^2 = 9, 4^2 = 16, \\ldots$'),
      step(['Contradiction. Claim: $\\sqrt{2}$ is irrational. Suppose $\\sqrt{2} = ' + fr('a', 'b') + '$ in lowest terms. Then $a^2 = 2b^2$, so $a$ is even, so $a = 2c$ and $b^2 = 2c^2$, so $b$ is even too. Both even contradicts "lowest terms", so $\\sqrt{2}$ cannot be rational.']),
      step(['Pick the method to fit: universal claims fall to a counter-example, finite sets of cases can be exhausted, and "cannot be" claims usually need contradiction.']),
    ],
    ask: ask('Use exhaustion: a perfect square can end in how many different digits? (List the last digits of $0^2$ to $9^2$ and count the different ones.)', 6, 'digits', { tol: 0, worked: ['Last digits: 0, 1, 4, 9, 6, 5, 6, 9, 4, 1.', 'Different: 0, 1, 4, 5, 6, 9, which is 6.'], apply: A.marketing(d) }),
    next: 'Indices and surds at A-level go further than GCSE. Next.',
  }));

  K.add('p-indices', (d) => ({
    analogy: ['The scenario for this whole lesson: the club\'s analysts forecast that demand for ' + d.big.name + ' will multiply by 8 over the next three seasons, growing by the same factor every season. Today ' + d.num(d.big.sold) + ' fans buy tickets there and the stand holds ' + d.num(d.big.seats) + '.', 'Every law of indices below answers a question about that forecast: what the yearly factor is, what it was a season ago, how seasons combine, and what it means for the stand. A power is just repeated growth written short.'],
    why: 'Fractional powers are roots, negative powers look backwards, and the laws let growth over many seasons be combined without a calculator.',
    steps: [
      step(['The yearly factor $r$ is the same each season, so after three seasons demand is $r \\times r \\times r = r^3$. The forecast says that is 8, so $r = 8^{1/3}$. A power of $\\frac{1}{3}$ is a cube root: the number that multiplies itself three times to make 8.'], '$8^{1/3} = \\sqrt[3]{8} = 2$: demand doubles every season'),
      step(['After two seasons demand has multiplied by $r^2$. In terms of the forecast that is $8^{2/3}$: $a^{m/n} = (\\sqrt[n]{a})^m$, so take the cube root first and then square.'], '$8^{2/3} = (\\sqrt[3]{8})^2 = 2^2 = 4$'),
      step(['Looking back. A season ago demand was half of today\'s, because going back one season undoes one doubling. A negative power is a reciprocal: $a^{-n} = ' + fr(1, 'a^n') + '$.'], '$2^{-1} = ' + fr(1, 2) + '$, and two seasons ago $2^{-2} = ' + fr(1, 4) + '$. Equally $8^{-2/3} = ' + fr(1, '8^{2/3}') + ' = ' + fr(1, 4) + '$'),
      step(['Combining seasons. Demand in season 3 compared with season 1 is $' + fr('2^3', '2^1') + '$. Dividing powers of the same base subtracts the indices, and multiplying adds them.'], '$' + fr('2^3', '2^1') + ' = 2^{3-1} = 2^2 = 4$, and $(2^3)^2 = 2^6 = 64$ is the factor over six seasons'),
      step(['Surds. Suppose a second stand\'s demand multiplies by 12 over two seasons, so its yearly factor is $\\sqrt{12}$. A surd is simplified by pulling out square factors: $\\sqrt{12} = 2\\sqrt{3}$, about 3.46 a season.']),
      step(['Comparing two stands\' growth gives a ratio with a surd on the bottom, such as $' + fr(6, '3 - \\sqrt{3}') + '$. To rationalise, multiply top and bottom by the conjugate $3 + \\sqrt{3}$.'], '$' + fr(6, '3 - \\sqrt{3}') + ' \\times ' + fr('3 + \\sqrt{3}', '3 + \\sqrt{3}') + ' = ' + fr('6(3 + \\sqrt{3})', 6) + ' = 3 + \\sqrt{3}$'),
      step(['Back to the stand. Demand is multiplied by 4 over two seasons, so about ' + d.num(Math.round(d.big.sold * 4)) + ' fans want a place at today\'s price, against ' + d.num(d.big.seats) + ' seats. That is why the question below ends with a ticket price: the price is how the club keeps the stand full as demand grows, and the factor you evaluate is what tells it how much.'].concat(eg(d, 'crowds'))),
    ],
    ask: ask('Evaluate $27^{2/3}$.', 9, '', { tol: 0, worked: ['$\\sqrt[3]{27} = 3$ and $3^2 = 9$.'], apply: A.price(d, 'third', 3) }),
    next: 'Simultaneous equations with one quadratic: where a curve meets a line.',
  }));

  K.add('p-simul', (d) => ({
    analogy: ['Revenue from a stand is a curve and a cost is a line. Where they cross is break-even: you neither gain nor lose. Finding it means solving a quadratic and a linear equation together.', 'Substitute the linear one into the quadratic.'],
    why: 'To solve a line and a curve together, substitute the line into the curve and solve the quadratic you get.',
    steps: [
      step(['In £ thousand, revenue is $R = 20p - p^2$ and cost is $C = 4p + 15$, with price $p$ in pounds.']),
      step(['Break-even is where $R = C$.'], '$20p - p^2 = 4p + 15$'),
      step(['Collect everything on one side.'], '$p^2 - 16p + 15 = 0$'),
      step(['Factorise: two numbers that multiply to 15 and add to $-16$ are $-1$ and $-15$.'], '$(p - 1)(p - 15) = 0$'),
      step(['So $p = 1$ or $p = 15$. Revenue beats cost for prices between them; outside that range the club loses money.']),
    ],
    ask: ask('Solve $20p - p^2 = 4p + 15$. What is the larger break-even price, in pounds?', 15, '£', { tol: 0, worked: ['$p^2 - 16p + 15 = 0$.', '$(p - 1)(p - 15) = 0$, so $p = 15$.'], apply: A.price(d, 'big', 3) }),
    next: 'Inequalities say where the profit is positive. Next.',
  }));

  K.add('p-inequalities', (d) => ({
    analogy: ['Between the two break-even prices the club makes a profit. That region is the solution of a quadratic inequality, and it is the safe zone for ticket prices.', 'Sketch the parabola and read off where it is above or below the axis.'],
    why: 'A quadratic inequality is solved by finding the roots and reading the region from a sketch.',
    steps: [
      step(['Profit in £ thousand: $P = -p^2 + 16p - 15$. We want $P > 0$.']),
      step(['Factorise: $-(p - 1)(p - 15) > 0$, so $(p - 1)(p - 15) < 0$.']),
      step(['The roots are 1 and 15. The parabola $(p - 1)(p - 15)$ opens upward, so it is below the axis between them.'], '$1 < p < 15$'),
      step(['Linear inequalities flip when you multiply by a negative: $-2x < 6$ gives $x > -3$.']),
      step(['In words: any price strictly between £1 and £15 makes a profit on this model. At £15 you only break even.']),
    ],
    ask: ask('Profit is positive when $1 < p < 15$ (prices in whole pounds). What is the highest whole-pound price that still makes a profit?', 14, '£', { tol: 0, worked: ['$p < 15$ so the largest whole number is 14.'], apply: A.price(d, 'fourth', 5) }),
    next: 'Polynomials: higher powers and how to break them down with the factor theorem.',
  }));

  K.add('p-polynomials', (d) => ({
    analogy: ['A form curve over a season can wiggle: up, down, up. That is a cubic, a polynomial with an $x^3$ term. To find where it crosses zero you factorise, and the factor theorem tells you where to start.', 'If $f(a) = 0$ then $(x - a)$ is a factor.'],
    why: 'The factor theorem links roots to factors, and algebraic division splits a polynomial into simpler parts.',
    steps: [
      step(['Let $f(x) = x^3 - 6x^2 + 11x - 6$. Try $x = 1$.'], '$f(1) = 1 - 6 + 11 - 6 = 0$'),
      step(['So $(x - 1)$ is a factor. Divide to find the rest.'], '$x^3 - 6x^2 + 11x - 6 = (x - 1)(x^2 - 5x + 6)$'),
      step(['Factorise the quadratic.'], '$(x - 1)(x - 2)(x - 3)$'),
      step(['The roots are 1, 2 and 3. The remainder theorem: dividing $f(x)$ by $(x - a)$ leaves the remainder $f(a)$.']),
      step(['A cubic crosses the axis at most three times: here exactly at those three points.']),
    ],
    ask: ask('$f(x) = x^3 - 6x^2 + 11x - 6$ factorises as $(x - 1)(x - 2)(x - 3)$. What is the sum of its three roots?', 6, '', { tol: 0, worked: ['$1 + 2 + 3 = 6$.'], apply: A.marketing(d) }),
    next: 'Algebraic fractions and partial fractions, which split a messy fraction into simple ones.',
  }));

  K.add('p-algfrac', (d) => ({
    analogy: ['A club shares a pot between two partners in the proportion that depends on a price: the shares are algebraic fractions. Partial fractions split one complicated fraction into easier ones you can work with.', 'It reverses adding fractions over a common denominator.'],
    why: 'Partial fractions write one fraction as a sum of simpler ones, using the roots of the denominator.',
    steps: [
      step(['Write $' + fr(5, '(x + 1)(x + 2)') + '$ as $' + fr('A', 'x + 1') + ' + ' + fr('B', 'x + 2') + '$.']),
      step(['Multiply through by the denominator.'], '$5 = A(x + 2) + B(x + 1)$'),
      step(['Choose $x$ to kill one term. $x = -1$ leaves $5 = A(1)$, so $A = 5$.']),
      step(['$x = -2$ leaves $5 = B(-1)$, so $B = -5$.'], '$' + fr(5, 'x + 1') + ' - ' + fr(5, 'x + 2') + '$'),
      step(['Check at $x = 0$: left side $' + fr(5, 2) + '$, right side $5 - 2.5 = 2.5$. Good. This also makes integrating such fractions easy later.']),
    ],
    ask: ask('Write $' + fr(5, '(x + 1)(x + 2)') + ' = ' + fr('A', 'x + 1') + ' + ' + fr('B', 'x + 2') + '$. What is $A$?', 5, '', { tol: 0, worked: ['Put $x = -1$: $5 = A(1)$.'], apply: A.price(d, 'second', 4) }),
    next: 'Functions at A-level: domain, range, composite and inverse.',
  }));

  K.add('p-functions', (d) => {
    const s = d.big, dm = demandOf(s), q = Math.round(s.sold * 0.8), pr = (dm.a - q) / dm.k;
    return {
      analogy: ['The crowd at ' + s.name + ' as a function of price is $f(p) = ' + m(dm.a) + ' - ' + m(dm.k) + 'p$. Its inverse answers "what price brings a crowd of exactly $q$?", which is the question a manager asks.', 'The domain is the prices that make sense; the range is the crowds that can result.'],
      why: 'A function maps inputs to outputs; its inverse runs the machine backwards, and a composite chains two.',
      steps: [
        step(['$f(p) = ' + m(dm.a) + ' - ' + m(dm.k) + 'p$. A sensible domain is $0 \\le p \\le ' + m(dm.a / dm.k) + '$ (beyond that the crowd would be negative), and the range is then $0 \\le f \\le ' + m(dm.a) + '$.'].concat(eg(d, 'crowds'))),
        step(['To find the inverse, swap the roles: write $q = ' + m(dm.a) + ' - ' + m(dm.k) + 'p$ and make $p$ the subject.'], '$p = ' + fr(m(dm.a) + ' - q', m(dm.k)) + '$'),
        step(['Check: $f(f^{-1}(q)) = q$. A function and its inverse undo each other, and their graphs are mirror images in $y = x$.']),
        step(['Composite functions: $g(f(p))$ means do $f$ first. If $g$ is "revenue from a crowd at a fixed £' + s.price + '", $g(f(p)) = ' + s.price + '(' + m(dm.a) + ' - ' + m(dm.k) + 'p)$.']),
        step(['For a crowd of ' + num(q) + ' (80% of today\'s), the price is $' + fr(m(dm.a) + ' - ' + q, m(dm.k)) + ' = ' + m(pr) + '$.']),
      ],
      ask: ask('For ' + s.name + ' the crowd is $f(p) = ' + m(dm.a) + ' - ' + m(dm.k) + 'p$. Use the inverse to find the price that would bring a crowd of ' + num(q) + ' (80% of today\'s). Give it in pounds to 2 decimal places.', pr, '£', { tol: 0.02, worked: ['$p = (' + m(dm.a) + ' - ' + q + ') / ' + m(dm.k) + ' = ' + m(pr) + '$.'], apply: A.price(d, 'big', 3) }),
      next: 'The modulus function measures size ignoring sign: goal difference magnitude, for one.',
    };
  });

  K.add('p-modulus', (d) => ({
    analogy: ['"We lost by two" and "we won by two" are the same margin: the size of the goal difference, $|gd|$. The modulus drops the sign and keeps the distance from zero.', 'Equations with a modulus often have two solutions.'],
    why: '$|x|$ is the distance of $x$ from zero; $|x - a| < b$ means "within $b$ of $a$".',
    steps: [
      step(['$|-3| = 3$ and $|3| = 3$. In goal difference: $|-2| = |2| = 2$, a margin of two.']),
      step(['$|x| = 5$ has two solutions: $x = 5$ and $x = -5$.']),
      step(['$|x - 3| < 2$ means $x$ is within 2 of 3: $1 < x < 5$.'], '$-2 < x - 3 < 2 \\Rightarrow 1 < x < 5$'),
      step(['Graph of $y = |x|$: a V with its point at the origin. $y = |x - 3|$ is the same V slid 3 to the right.']),
      step(['For $|x - 3| < 2$ the whole numbers that fit are 2, 3 and 4: three solutions.']),
    ],
    ask: ask('How many whole numbers satisfy $|x - 3| < 2$?', 3, '', { tol: 0, worked: ['$1 < x < 5$, so $x = 2, 3, 4$.'], apply: A.plan('transDef', 'react', 'std', 'Margins matter as much as results: keep the team reacting to a lost ball as it is') }),
    next: 'Sketching graphs of cubics and reciprocals, with asymptotes.',
  }));

  K.add('p-sketch', (d) => ({
    analogy: ['An analyst sketches the shape of a model before computing anything: where it crosses the axes, where it turns, and what it does for very big values. Sketching is thinking, and you can do it in thirty seconds.', 'The factorised form shows the roots; the leading term shows the ends.'],
    why: 'A sketch uses the roots, the intercept and the behaviour at the ends; asymptotes are lines a curve approaches.',
    steps: [
      step(['Sketch $y = x(x - 2)(x + 3)$. The roots are $x = -3$, $0$ and $2$.']),
      step(['The coefficient of $x^3$ is $+1$, so for large $x$ the curve goes up on the right and down on the left (positive cubic).']),
      step(['Put the pieces together: it comes up from the bottom left, crosses at $-3$, turns, crosses at $0$, turns, crosses at $2$ and goes up.']),
      step(['A point to check: $x = 1$ gives $1 \\times (-1) \\times 4 = -4$, below the axis between 0 and 2.']),
      step(['A reciprocal such as $y = ' + fr(1, 'x') + '$ has asymptotes $x = 0$ and $y = 0$: it gets as close as you like but never touches.']),
    ],
    ask: ask('For $y = x(x - 2)(x + 3)$ find $y$ when $x = 1$.', -4, '', { tol: 0, worked: ['$1 \\times (1 - 2) \\times (1 + 3) = 1 \\times (-1) \\times 4 = -4$.'], apply: A.price(d, 'emptiest', 4) }),
    next: 'Transformations move and stretch graphs.',
  }));

  K.add('p-transform', (d) => {
    const s = d.big, dm = demandOf(s), pk = dm.a / (2 * dm.k);
    return {
      analogy: ['If every ticket carries a £3 booking fee that the fan pays, the demand curve is the same curve shifted in price. Moving, stretching and reflecting a graph changes its equation in predictable ways.', 'Inside the bracket moves left and right (opposite to what you expect); outside moves up and down.'],
      why: '$f(x + a)$ shifts left, $f(x) + a$ shifts up, $af(x)$ stretches vertically, $f(ax)$ stretches horizontally.',
      steps: [
        step(['Start from the revenue peak at price $p^* = ' + m(pk) + '$ in a simple model for ' + s.name + '.'].concat(eg(d, 'crowds'))),
        step(['$y = f(x - 3)$ slides the graph 3 to the right: the peak moves to $' + m(pk) + ' + 3 = ' + m(pk + 3) + '$.']),
        step(['$y = f(x) + 3$ slides it up by 3, so the peak is higher but at the same price.']),
        step(['$y = 2f(x)$ stretches vertically by 2: peak height doubles, position unchanged. $y = f(2x)$ halves the horizontal scale: the peak moves to half the price.']),
        step(['$y = -f(x)$ reflects in the $x$-axis; $y = f(-x)$ reflects in the $y$-axis.']),
      ],
      ask: ask('A revenue curve peaks at a price of £' + m(pk) + '. After the transformation $f(x - 3)$ (a shift 3 to the right) where is the peak, in pounds?', pk + 3, '£', { tol: 0.05, worked: [m(pk) + ' + 3 = ' + m(pk + 3) + '.'], apply: A.price(d, 'big', 3) }),
      next: 'Coordinate geometry: lines in full.',
    };
  });

  K.add('p-lines', (d) => ({
    analogy: ['Season-ticket income rises steadily: £3,000 with 10 fans paying and £7,000 with 30. That is a straight line, and an equation of a line lets you predict any point on it.', 'Gradient first, then the intercept.'],
    why: 'A straight line is fixed by two points: the gradient comes from the change in $y$ over the change in $x$.',
    steps: [
      step(['Points $(10, 3000)$ and $(30, 7000)$.']),
      step(['Gradient.'], '$m = ' + fr('7000 - 3000', '30 - 10') + ' = 200$'),
      step(['Use $y - y_1 = m(x - x_1)$ with the first point.'], '$y - 3000 = 200(x - 10)$'),
      step(['Tidy up.'], '$y = 200x + 1000$'),
      step(['Perpendicular lines have gradients that multiply to $-1$. A line perpendicular to this has gradient $-' + fr(1, 200) + '$. Parallel lines share a gradient.']),
    ],
    ask: ask('A line passes through $(10, 3000)$ and $(30, 7000)$, so $y = 200x + 1000$. What is $y$ when $x = 25$?', 6000, '', { tol: 0, worked: ['$200 \\times 25 + 1000 = 6000$.'], apply: A.price(d, 'third', 4) }),
    next: 'Circles: the centre circle and every equation of a circle.',
  }));

  K.add('p-circles', (d) => {
    const dist = Math.hypot(60 - 52.5, 40 - 34);
    return {
      analogy: ['The centre circle: centre $(52.5, 34)$ and radius 9.15 m. Is a player standing at $(60, 40)$ inside it? A circle has an equation, and points either satisfy it, or are inside or outside.', 'The equation comes from Pythagoras.'],
      why: 'A circle with centre $(a, b)$ and radius $r$ has the equation $(x - a)^2 + (y - b)^2 = r^2$.',
      steps: [
        step(['Centre $(52.5, 34)$ and radius 9.15.'], '$(x - 52.5)^2 + (y - 34)^2 = 9.15^2$'),
        step(['For the point $(60, 40)$, find the squared distance from the centre.'], '$(60 - 52.5)^2 + (40 - 34)^2 = 56.25 + 36 = 92.25$'),
        step(['Compare with $r^2 = 83.72$: it is bigger, so the point is outside.']),
        step(['Distance $= \\sqrt{92.25} = ' + m(dist) + '$ m, more than 9.15.']),
        step(['Expanded form $x^2 + y^2 + 2gx + 2fy + c = 0$ has centre $(-g, -f)$; complete the square to find a centre and radius from an equation.']),
      ],
      ask: ask('A player is at $(60, 40)$. How far is he from the centre spot $(52.5, 34)$, in metres to 1 decimal place?', dist, 'm', { tol: 0.06, worked: ['$\\sqrt{7.5^2 + 6^2} = \\sqrt{92.25} = ' + m1(dist) + '$.'], apply: A.plan('defence', 'compact', 'tight', 'Distances from the centre decide who is in the circle: keep the defence compact') }),
      next: 'Parametric equations describe a path with time.',
    };
  });

  K.add('p-parametric', (d) => ({
    analogy: ['A ball in flight: its distance along the pitch and its height both depend on time. Instead of one equation in $x$ and $y$ we write each as a function of time $t$.', 'That is a parametric equation, and $t$ is the parameter.'],
    why: 'Parametric equations write $x$ and $y$ separately in terms of $t$; eliminate $t$ to get the path.',
    steps: [
      step(['A chip: $x = 20t$ metres along and $y = 10t - 5t^2$ metres high.']),
      step(['At $t = 1.5$ s: $x = 30$ and $y = 15 - 11.25 = 3.75$.'], '$x = 20(1.5) = 30,\\quad y = 10(1.5) - 5(1.5)^2 = 3.75$'),
      step(['Highest point: $y$ is largest at $t = 1$ (halfway to landing), $y = 5$ m. Lands when $y = 0$: $t(10 - 5t) = 0$, so $t = 2$ s and $x = 40$ m.']),
      step(['Eliminate $t$: $t = ' + fr('x', 20) + '$, so $y = ' + fr('x', 2) + ' - ' + fr('x^2', 80) + '$, a parabola.']),
      step(['The path is a parabola because gravity acts only on the vertical motion.']),
    ],
    ask: ask('A chip has $x = 20t$ and $y = 10t - 5t^2$. What is the height $y$ (in metres) at $t = 1.5$ s?', 3.75, 'm', { tol: 0.01, worked: ['$10(1.5) - 5(2.25) = 15 - 11.25 = 3.75$.'], apply: A.plan('build', 'keeper', 'std', 'Flight times of about 2 s give defenders time to reset: keep the keeper\'s distribution standard') }),
    next: 'The binomial expansion finds powers of a bracket fast.',
  }));

  K.add('p-binomial', (d) => {
    const v3 = 1 + 5 * 0.03 + 10 * 0.0009;
    return {
      analogy: ['Five matches of 3% growth is $1.03^5$. Multiplying 1.03 five times by hand is slow. The binomial expansion gives it as a short sum of terms, and the first few terms are already very accurate.', 'The coefficients come from Pascal\'s triangle or from $\\binom{n}{r}$.'],
      why: '$(1 + x)^n = 1 + nx + ' + fr('n(n - 1)', 2) + 'x^2 + \\ldots$, and for small $x$ the first few terms give a good estimate.',
      steps: [
        step(['Expand $(1 + x)^5$ using Pascal\'s triangle row 1, 5, 10, 10, 5, 1.'], '$1 + 5x + 10x^2 + 10x^3 + 5x^4 + x^5$'),
        step(['With $x = 0.03$: the first three terms.'], '$1 + 5(0.03) + 10(0.03)^2 = 1 + 0.15 + 0.009 = ' + m3(v3) + '$'),
        step(['The exact $1.03^5 = ' + m3(Math.pow(1.03, 5)) + '$. The three-term estimate is within $' + m3(Math.pow(1.03, 5) - v3) + '$.']),
        step(['General term: $\\binom{n}{r} a^{n-r} b^r$. For $(2 + 3x)^4$ the $x^2$ term is $\\binom{4}{2} 2^2 (3x)^2 = 6 \\times 4 \\times 9x^2 = 216x^2$.']),
        step(['For non-integer or negative $n$ the series goes on forever and is valid only for $|x| < 1$.']),
      ],
      ask: ask('Use the first three terms of $(1 + x)^5$ with $x = 0.03$ to estimate $1.03^5$. Give $1 + 5x + 10x^2$ to 3 decimal places.', v3, '', { tol: 0.001, worked: ['$1 + 0.15 + 0.009 = 1.159$.'], apply: A.price(d, 'second', 4) }),
      next: 'Sequences and recurrence relations: each term defined from the one before.',
    };
  });

  K.add('p-seq', (d) => {
    const u1 = d.crowd, u4 = u1 * Math.pow(1.03, 3);
    return {
      analogy: ['A crowd grows 3% each home match: $u_{n+1} = 1.03u_n$. Each term is defined from the one before, which is exactly how a season unfolds.', 'A recurrence relation plus a starting value defines the whole sequence.'],
      why: 'A recurrence relation gives each term from the previous term; the sequence may grow, shrink, oscillate or converge.',
      steps: [
        step(['Start with $u_1 = ' + num(u1) + '$, the last crowd.'].concat(eg(d, 'crowds'))),
        step(['The rule $u_{n+1} = 1.03u_n$. Then $u_2 = ' + m(u1 * 1.03) + '$ and $u_3 = ' + m(u1 * 1.0609) + '$.']),
        step(['This is geometric: each term is the previous times 1.03, so $u_n = ' + num(u1) + ' \\times 1.03^{n-1}$.'], '$u_4 = ' + num(u1) + ' \\times 1.03^3 = ' + m(u4) + '$'),
        step(['A sequence is increasing if $u_{n+1} > u_n$ for all $n$, periodic if it repeats after $k$ terms, and convergent if it settles to a limit.']),
        step(['If the rule were $u_{n+1} = 0.5u_n + 4000$ it would settle at 8000: the fixed point where $u = 0.5u + 4000$.']),
      ],
      ask: ask('A crowd of ' + num(u1) + ' grows by 3% each match ($u_{n+1} = 1.03u_n$). What is $u_4$, the crowd three matches later, to the nearest fan?', Math.round(u4), 'fans', { tol: 2, worked: [num(u1) + ' x 1.03^3 = ' + m(u4) + '.'], apply: A.marketing(d) }),
      next: 'Arithmetic series: adding up a steady increase.',
    };
  });

  K.add('p-ap', (d) => {
    const a = d.crowd, dd = 120, n = 14, s = n / 2 * (2 * a + (n - 1) * dd);
    return {
      analogy: ['If the crowd rises by 120 every home match, the total attendance over a season is an arithmetic series. There is a formula that adds it in one go, as Gauss did for the numbers 1 to 100.', 'The first term and the common difference are all you need.'],
      why: 'An arithmetic series adds terms that differ by a constant: $S_n = ' + fr('n', 2) + '(2a + (n - 1)d)$.',
      steps: [
        step(['First term $a = ' + num(a) + '$, common difference $d = ' + dd + '$, $n = ' + n + '$ matches.'].concat(eg(d, 'crowds'))),
        step(['The $n$th term is $a + (n - 1)d$. The last: $' + a + ' + 13 \\times ' + dd + ' = ' + (a + 13 * dd) + '$.']),
        step(['Pair first and last: each pair sums to the same amount, and there are $' + fr('n', 2) + '$ pairs.'], '$S_n = ' + fr('n', 2) + '(a + l)$'),
        step(['With numbers.'], '$S_{14} = 7(' + a + ' + ' + (a + 13 * dd) + ') = ' + m(s) + '$'),
        step(['So the season\'s total attendance on that pattern is ' + num(s) + ' fans, about ' + num(s / n) + ' per match.']),
      ],
      ask: ask('The crowd is ' + num(a) + ' and rises by ' + dd + ' every home match. Use $S_n = ' + fr('n', 2) + '(2a + (n - 1)d)$ to find the total attendance over ' + n + ' matches.', s, 'fans', { tol: 1, worked: ['$7(2 \\times ' + a + ' + 13 \\times ' + dd + ') = ' + m(s) + '$.'], apply: A.marketing(d) }),
      next: 'Geometric series: a steady percentage growth added up.',
    };
  });

  K.add('p-gp', (d) => {
    const a = d.gate, r = 1.03, n = 14, s = a * (Math.pow(r, n) - 1) / (r - 1);
    return {
      analogy: ['Gate money grows 3% a match: ' + gbp(a) + ', then ' + gbp(a * r) + ', and so on. Adding up a season of that is a geometric series, and the formula saves fourteen separate multiplications.', 'The common ratio is 1.03.'],
      why: 'A geometric series has a constant ratio $r$; $S_n = ' + fr('a(r^n - 1)', 'r - 1') + '$, and if $|r| < 1$ it has a sum to infinity ' + fr('a', '1 - r') + '.',
      steps: [
        step(['$a = ' + m(a) + '$, $r = 1.03$, $n = ' + n + '$.'].concat(eg(d, 'gate'))),
        step(['The terms: $a, ar, ar^2, \\ldots, ar^{13}$.']),
        step(['Subtract $rS_n$ from $S_n$: nearly everything cancels, leaving $S_n(1 - r) = a(1 - r^n)$.']),
        step(['So the formula.'], '$S_{14} = ' + fr(m(a) + '(1.03^{14} - 1)', '0.03') + ' = ' + m(s) + '$'),
        step(['If $|r| < 1$ (decay) the sum to infinity is $' + fr('a', '1 - r') + '$: money that shrinks forever adds to a finite total.']),
      ],
      ask: ask('Gate money is ' + gbp(a) + ' and grows 3% a match. Use $S_n = ' + fr('a(r^n - 1)', 'r - 1') + '$ to find the total over ' + n + ' matches, to the nearest pound.', Math.round(s), '£', { tol: Math.max(2, s * 0.0005), worked: ['$' + m(a) + ' \\times (1.03^{14} - 1) / 0.03 = ' + m(s) + '$.'], apply: A.price(d, 'big', 4) }),
      next: 'Sigma notation writes a sum compactly.',
    };
  });

  K.add('p-sigma', (d) => {
    const g = d.goals.slice(0, 5), x = d.xg.slice(0, 5), sg = sum(g), sx = sum(x);
    return {
      analogy: ['Your goals so far, match by match, are $g_1, g_2, \\ldots$. The total is written with a sigma: $\\sum_{i=1}^{5} g_i$. It is shorthand for "add them all up", and every table of totals in the game is one.', 'The limits say where to start and stop.'],
      why: '$\\sum_{i=1}^{n} u_i$ means $u_1 + u_2 + \\cdots + u_n$; it can hold a formula for the terms.',
      steps: [
        step(['Goals in the first five matches: ' + g.join(', ') + '.'].concat(eg(d, 'results'))),
        step(['The total.'], '$\\sum_{i=1}^{5} g_i = ' + g.join(' + ') + ' = ' + sg + '$'),
        step(['A formula can sit inside: $\\sum_{r=1}^{4} (2r + 1) = 3 + 5 + 7 + 9 = 24$.']),
        step(['Compare with the expected goals over the same matches: $\\sum x_i = ' + m(sx) + '$.']),
        step(['Scored ' + sg + ' from ' + m1(sx) + ' expected: ' + (sg < sx ? 'fewer than the chances deserved' : 'at least as many as the chances deserved') + '.']),
      ],
      ask: ask('Your goals in the first five matches were ' + g.join(', ') + '. Work out $\\sum_{i=1}^{5} g_i$.', sg, 'goals', { tol: 0, worked: [g.join(' + ') + ' = ' + sg + '.'], apply: sg < sx ? A.plan('final', 'shooting', 'patient', 'You scored ' + sg + ' from ' + m1(sx) + ' expected goals: be patient and pick better shooting moments') : A.plan('final', 'shooting', 'std', 'You scored ' + sg + ' from ' + m1(sx) + ' expected goals: keep the finishing as it is') }),
      next: 'Trigonometry: sine, cosine and tangent including exact values.',
    };
  });

  K.add('p-trigratios', (d) => {
    const comp = 20 * Math.sin(deg(60));
    return {
      analogy: ['A driven pass of 20 m leaves at 60° to the touchline. How far across has it moved and how far along? Sine and cosine split a length into components, and the exact values for 30°, 45° and 60° come from two simple triangles.', 'Learn the exact values: they save the calculator.'],
      why: 'Sine, cosine and tangent give the components of a length at an angle, and 30°, 45° and 60° have exact values.',
      steps: [
        step(['In a right-angled triangle $\\sin\\theta = ' + fr('\\text{opp}', '\\text{hyp}') + '$, $\\cos\\theta = ' + fr('\\text{adj}', '\\text{hyp}') + '$, $\\tan\\theta = ' + fr('\\text{opp}', '\\text{adj}') + '$.']),
        step(['Exact values.'], ['$\\sin 30° = ' + fr(1, 2) + ',\\ \\cos 30° = ' + fr('\\sqrt{3}', 2) + ',\\ \\tan 30° = ' + fr(1, '\\sqrt{3}') + '$', '$\\sin 45° = \\cos 45° = ' + fr('\\sqrt{2}', 2) + ',\\ \\tan 45° = 1$', '$\\sin 60° = ' + fr('\\sqrt{3}', 2) + ',\\ \\cos 60° = ' + fr(1, 2) + '$']),
        step(['A pass of 20 m at 60° to the touchline: component across the pitch.'], '$20 \\sin 60° = 20 \\times ' + fr('\\sqrt{3}', 2) + ' = 10\\sqrt{3} = ' + m1(comp) + '$ m'),
        step(['Along the pitch: $20\\cos 60° = 10$ m.']),
        step(['Check with Pythagoras: $\\sqrt{10^2 + (10\\sqrt{3})^2} = \\sqrt{100 + 300} = 20$. Good.']),
      ],
      ask: ask('A 20 m pass leaves at 60° to the touchline. How many metres across the pitch does it travel? (20 sin 60°, to 1 decimal place.)', comp, 'm', { tol: 0.06, worked: ['$20 \\times 0.866 = ' + m1(comp) + '$.'], apply: A.plan('midfield', 'width', 'wide', 'A pass at 60° covers ' + m1(comp) + ' m across the pitch: use the width') }),
      next: 'The sine and cosine rules work in any triangle.',
    };
  });

  K.add('p-triangles', (d) => {
    const a = 15, b = 20, A_ = 30, sB = b * Math.sin(deg(A_)) / a, B = Math.asin(sB) * 180 / PI;
    return {
      analogy: ['Three players make a triangle with no right angle. The cosine rule gives a side when you know two sides and the angle between; the sine rule links each side with the angle opposite.', 'Watch for the ambiguous case: the sine rule can give two possible angles.'],
      why: 'Sine rule: $' + fr('a', '\\sin A') + ' = ' + fr('b', '\\sin B') + '$. Cosine rule: $a^2 = b^2 + c^2 - 2bc\\cos A$. Area: $\\tfrac{1}{2}ab\\sin C$.',
      steps: [
        step(['A triangle has side $a = ' + a + '$ opposite angle $A = ' + A_ + '°$, and side $b = ' + b + '$.']),
        step(['Use the sine rule to find the angle $B$ opposite $b$.'], '$\\sin B = ' + fr('b\\sin A', 'a') + ' = ' + fr(b + ' \\times 0.5', a) + ' = ' + m3(sB) + '$'),
        step(['So $B = \\sin^{-1}(' + m3(sB) + ') = ' + m1(B) + '°$.']),
        step(['The ambiguous case: $\\sin B$ is also true for $180° - ' + m1(B) + '° = ' + m1(180 - B) + '°$. Both fit when the angles still sum to less than 180°.']),
        step(['Use the cosine rule when you have two sides and the included angle, or three sides.']),
      ],
      ask: ask('Side $a = 15$ is opposite $A = 30°$ and side $b = 20$. Use the sine rule to find the acute angle $B$ in degrees, to 1 decimal place.', B, '°', { tol: 0.15, worked: ['$\\sin B = 20 \\sin 30° / 15 = 0.667$.', '$B = ' + m1(B) + '°$.'], apply: A.price(d, 'fourth', 4) }),
      next: 'Radians measure angles by arc length, the natural unit for calculus.',
    };
  });

  K.add('p-radians', (d) => {
    const r = 9.15, th = 1.2, arc = r * th, area = 0.5 * r * r * th;
    return {
      analogy: ['The centre circle can be measured by angle in degrees or in radians. A radian is the angle that makes the arc the same length as the radius, and it makes arc length and sector area simple formulae.', 'Convert with $\\pi$ radians = 180°.'],
      why: 'An angle in radians is arc length over radius; arc length is $r\\theta$ and sector area is $\\tfrac{1}{2}r^2\\theta$.',
      steps: [
        step(['$180° = \\pi$ radians. So $90° = ' + fr('\\pi', 2) + '$, $60° = ' + fr('\\pi', 3) + '$, and $1$ radian $\\approx 57.3°$.']),
        step(['A sector of the centre circle of angle $\\theta = 1.2$ rad and radius $r = 9.15$. Arc length.'], '$s = r\\theta = 9.15 \\times 1.2 = ' + m(arc) + '$ m'),
        step(['Sector area.'], '$A = \\tfrac{1}{2}r^2\\theta = \\tfrac{1}{2} \\times 9.15^2 \\times 1.2 = ' + m(area) + '$ m²'),
        step(['Segment area (the sector minus the triangle) is $\\tfrac{1}{2}r^2(\\theta - \\sin\\theta)$.']),
        step(['Calculators must be in radian mode for calculus: $\\sin(1.2)$ is not the same as $\\sin(1.2°)$.']),
      ],
      ask: ask('A sector of the centre circle has radius 9.15 m and angle 1.2 radians. What is its area in square metres, to 1 decimal place?', area, 'm²', { tol: 0.1, worked: ['$\\tfrac{1}{2} \\times 83.7225 \\times 1.2 = ' + m1(area) + '$.'], apply: A.plan('press', 'start', 'std', 'Pressing starts in set zones: keep the pressing start line standard') }),
      next: 'Graphs of the trigonometric functions: waves with period and amplitude.',
    };
  });

  K.add('p-trigraphs', (d) => ({
    analogy: ['Crowds and form swing in cycles over a season: up, down, up again. A sine wave is the standard model of anything that repeats: it has an amplitude (how high), a period (how long a cycle) and a phase (where it starts).', 'The graph of $y = a\\sin(bx)$ has amplitude $a$ and period $' + fr('2\\pi', 'b') + '$.'],
    why: 'Sine and cosine are waves: amplitude is the height from the middle, period is the length of one cycle.',
    steps: [
      step(['$y = \\sin x$ oscillates between $-1$ and $1$ with period $2\\pi$. $y = \\cos x$ is the same wave shifted left by $' + fr('\\pi', 2) + '$. $y = \\tan x$ repeats every $\\pi$ and has asymptotes at $' + fr('\\pi', 2) + '$, $' + fr('3\\pi', 2) + '$.']),
      step(['A crowd that swings by 800 either side of 8,000 over a 4-match cycle: $y = 8000 + 800\\sin\\left(' + fr('\\pi t', 2) + '\\right)$.']),
      step(['Amplitude is 800. The period is $' + fr('2\\pi', '\\pi/2') + ' = 4$ matches.']),
      step(['Transformations: $\\sin(x + c)$ shifts left by $c$; $\\sin(bx)$ squeezes by a factor $b$; $a\\sin x$ stretches vertically.']),
      step(['For $y = 3\\sin 2x$ the amplitude is 3 and the period is $' + fr('2\\pi', 2) + ' = \\pi = 3.14$.']),
    ],
    ask: ask('What is the period of $y = 3\\sin 2x$ (in radians, to 2 decimal places)?', PI, '', { tol: 0.01, worked: ['Period $= 2\\pi / 2 = \\pi = 3.14$.'], apply: A.marketing(d) }),
    next: 'Solving trigonometric equations, with all the solutions in a range.',
  }));

  K.add('p-trigeq', (d) => ({
    analogy: ['A through-ball must be played at a particular angle for the winger to reach it: $\\sin\\theta = 0.5$. There are two angles between 0° and 180° that give that sine, and a good analyst finds both.', 'Use the graph or the CAST diagram to find every solution in the range.'],
    why: 'A trigonometric equation has several solutions in a range; use the symmetry of the graph to find them all.',
    steps: [
      step(['Solve $\\sin x = 0.5$ for $0° \\le x \\le 360°$. Your calculator gives $x = 30°$.']),
      step(['The sine graph is symmetric about 90°: the second solution is $180° - 30° = 150°$.']),
      step(['No more in this range: $\\sin$ is negative between 180° and 360°.']),
      step(['For cosine: $\\cos x = 0.5$ gives $60°$ and $360° - 60° = 300°$. For tangent: $\\tan x = 1$ gives $45°$ and $225°$ (add 180°).']),
      step(['For a double angle: $\\sin 2x = 0.5$ for $0 \\le x \\le 180$: $2x$ ranges to 360, so $2x = 30$ or $150$ giving $x = 15$ or $75$ (and 195, 345 for the next cycle, outside the range).']),
    ],
    ask: ask('Solve $\\sin x = 0.5$ for $0° \\le x \\le 180°$. What is the larger solution, in degrees?', 150, '°', { tol: 0, worked: ['$180 - 30 = 150$.'], apply: A.plan('transAtt', 'outlet', 'wing', 'There are two angles to play the ball at: send the first outlet to the wing after winning it') }),
    next: 'Trigonometric identities connect all the ratios.',
  }));

  K.add('p-trigid', (d) => ({
    analogy: ['Two analysts compute the same angle two ways and get different-looking formulae. Identities show they are the same. The most useful: $\\sin^2\\theta + \\cos^2\\theta = 1$, which is Pythagoras on a unit circle.', 'Once you know one of sine or cosine, you know the other.'],
    why: '$\\sin^2\\theta + \\cos^2\\theta \\equiv 1$ and $\\tan\\theta \\equiv ' + fr('\\sin\\theta', '\\cos\\theta') + '$ let you convert between the ratios.',
    steps: [
      step(['On a unit circle the point at angle $\\theta$ is $(\\cos\\theta, \\sin\\theta)$. Its distance from the centre is 1, so:'], '$\\cos^2\\theta + \\sin^2\\theta = 1$'),
      step(['If $\\sin\\theta = 0.6$ with $\\theta$ acute, then $\\cos^2\\theta = 1 - 0.36 = 0.64$, so $\\cos\\theta = 0.8$.']),
      step(['$\\tan\\theta = ' + fr('\\sin\\theta', '\\cos\\theta') + ' = ' + fr(0.6, 0.8) + ' = 0.75$.']),
      step(['An identity holds for all $\\theta$ (the symbol $\\equiv$). To prove one, work on one side until it matches the other: $\\tan\\theta\\cos\\theta = \\sin\\theta$.']),
      step(['To solve $2\\sin^2 x + \\cos x = 1$, replace $\\sin^2 x$ by $1 - \\cos^2 x$ to get a quadratic in $\\cos x$.']),
    ],
    ask: ask('If $\\sin\\theta = 0.6$ and $\\theta$ is acute, what is $\\cos\\theta$?', 0.8, '', { tol: 0.001, worked: ['$\\cos^2\\theta = 1 - 0.36 = 0.64$.', '$\\cos\\theta = 0.8$.'], apply: A.price(d, 'emptiest', 4) }),
    next: 'Reciprocal and inverse trig functions.',
  }));

  K.add('p-trigrecip', (d) => ({
    analogy: ['Some quantities are best written as reciprocals: the time a ball takes to cross a gap, for instance, divides by the speed component. The reciprocal trig functions (secant, cosecant, cotangent) give names to those, and the inverse functions give angles back.', 'Inverse functions have restricted ranges so they have just one answer.'],
    why: '$\\sec\\theta = ' + fr(1, '\\cos\\theta') + '$, $\\csc\\theta = ' + fr(1, '\\sin\\theta') + '$, $\\cot\\theta = ' + fr(1, '\\tan\\theta') + '$; and $\\sin^{-1}$, $\\cos^{-1}$, $\\tan^{-1}$ undo sine, cosine and tangent.',
    steps: [
      step(['$\\sec 60° = ' + fr(1, '\\cos 60°') + ' = ' + fr(1, 0.5) + ' = 2$.']),
      step(['$\\csc 30° = ' + fr(1, '\\sin 30°') + ' = 2$, and $\\cot 45° = 1$.']),
      step(['Two more identities: $1 + \\tan^2\\theta = \\sec^2\\theta$ and $1 + \\cot^2\\theta = \\csc^2\\theta$ (divide $\\sin^2 + \\cos^2 = 1$ by $\\cos^2$ or $\\sin^2$).']),
      step(['Inverse functions: $\\sin^{-1}x$ is the angle whose sine is $x$. Its range is $-90°$ to $90°$ for $\\sin^{-1}$, $0°$ to $180°$ for $\\cos^{-1}$.']),
      step(['So $\\sin^{-1}(0.5) = 30°$, not 150°: the inverse gives one answer in its range.']),
    ],
    ask: ask('Evaluate $\\sec 60°$.', 2, '', { tol: 0, worked: ['$1 / \\cos 60° = 1 / 0.5 = 2$.'], apply: A.price(d, 'third', 4) }),
    next: 'Addition and double-angle formulae let you split and combine waves.',
  }));
})();
