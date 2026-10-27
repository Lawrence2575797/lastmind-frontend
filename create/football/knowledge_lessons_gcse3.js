// GCSE Maths lessons, Algebra (Edexcel 1MA1 A strand).
(function () {
  const K = window.FM && window.FM.K; if (!K) return;
  const { m, m1, m3, fr, sum, mean, eg, A, ask, step, gbp, num } = K;

  K.add('g-notation', (d) => {
    const s = d.stands.slice().sort((a, b) => b.seats - a.seats)[1] || d.big, R = s.price * s.sold;
    return {
      analogy: ['The club game is full of formulas: revenue = price times fans, points = 3 wins + draws. Algebra is writing those with letters so one rule works for every stand and every match.', 'Substitution means putting your own numbers in the letters.'],
      why: 'A letter stands for a number you can change, and substitution puts your own number in.',
      steps: [
        step(['Let $p$ be the price in pounds and $n$ the number of fans. Then revenue $R$ is:'], '$R = p \\times n$, which we write $R = pn$'),
        step(['In algebra we leave out the times sign: $3n$ means $3 \\times n$, and $n^2$ means $n \\times n$.']),
        step(['Substitute for ' + s.name + ': $p = ' + s.price + '$ and $n = ' + s.sold + '$.'].concat(eg(d, 'crowds')), '$R = ' + s.price + ' \\times ' + s.sold + ' = ' + R + '$'),
        step(['Brackets and powers keep their usual order. If a booking fee of £2 is added to every ticket, the income is $n(p + 2)$.'], '$' + s.sold + '(' + s.price + ' + 2) = ' + s.sold * (s.price + 2) + '$'),
        step(['An expression has no equals sign ($3p + 2$). An equation has one ($3p + 2 = 14$). A formula links quantities ($R = pn$).']),
      ],
      ask: ask('Revenue is $R = pn$. For ' + s.name + ' take $p = ' + s.price + '$ and $n = ' + s.sold + '$. What is $R$?', R, '£', { tol: 0, worked: ['$R = ' + s.price + ' \\times ' + s.sold + ' = ' + R + '$.'], apply: A.price(d, 'second', 99) }),
      next: 'Next: tidying an algebraic expression by collecting like terms.',
    };
  });

  K.add('g-simplify', (d) => {
    const a = 12, b = 8, tot = 5 * a + 5 * b;
    return {
      analogy: ['The wage bill is £$a$k a week for each forward and £$b$k for each midfielder. Three forwards, four midfielders, then two more forwards and one more midfielder arrive. How do you write the bill?', 'Collecting like terms is adding up the same kind of thing: forwards with forwards, midfielders with midfielders.'],
      why: 'You can only add terms that are the same kind of thing: $3a + 2a$ is $5a$, but $3a + 2b$ stays as it is.',
      steps: [
        step(['The first squad: three forwards and four midfielders.'], '$3a + 4b$'),
        step(['Two more forwards and one more midfielder:'], '$3a + 4b + 2a + b$'),
        step(['Group the $a$ terms and the $b$ terms. Keep each term\'s sign with it.'], '$(3a + 2a) + (4b + b)$'),
        step(['Add the numbers in front (the coefficients). Note $b$ means $1b$.'], '$5a + 5b$'),
        step(['Check by substitution. If a forward earns £12k and a midfielder £8k:'], '$5 \\times 12 + 5 \\times 8 = ' + tot + '$'),
      ],
      ask: ask('Simplify $3a + 4b + 2a + b$ and then find its value in £ thousand when $a = ' + a + '$ and $b = ' + b + '$.', tot, '£k', { tol: 0, worked: ['$5a + 5b$.', '$5 \\times 12 + 5 \\times 8 = ' + tot + '$.'], apply: A.price(d, 'third', 99) }),
      next: 'Next: expanding brackets, which turns a ticket surcharge into a formula you can use.',
    };
  });

  K.add('g-expand', (d) => {
    const s = d.big, f = 3, n = s.sold, ex = n * (s.price + f);
    return {
      analogy: ['A £' + f + ' fee is added to every ticket in ' + s.name + '. The income is the number of fans times the new price, $n(p + ' + f + ')$. Expanding the bracket splits it into the original income and the money from the fee.', 'Expanding is multiplying everything inside the bracket by what is outside.'],
      why: 'A number outside a bracket multiplies everything inside it.',
      steps: [
        step(['With ' + n + ' fans, income from a price of $p$ plus a fee of £' + f + ' is:'].concat(eg(d, 'crowds')), '$n(p + ' + f + ')$'),
        step(['Multiply each term inside by $n$.'], '$n \\times p + n \\times ' + f + ' = np + ' + f + 'n$'),
        step(['That says: the old income $np$ plus ' + f + ' times the fans.']),
        step(['With numbers: $p = ' + s.price + '$ and $n = ' + n + '$.'], '$' + n + ' \\times ' + s.price + ' + ' + f + ' \\times ' + n + ' = ' + n * s.price + ' + ' + f * n + ' = ' + ex + '$'),
        step(['A negative outside flips the signs inside: $-2(x - 5) = -2x + 10$.']),
      ],
      ask: ask('Expand $3(2x + 5)$ and give the value when $x = 4$.', 3 * (2 * 4 + 5), '', { tol: 0, worked: ['$3(2x+5) = 6x + 15$.', 'At $x = 4$: $24 + 15 = 39$.'], apply: A.price(d, 'big', 2) }),
      next: 'Factorising is expanding backwards. Next.',
    };
  });

  K.add('g-factorise', (d) => {
    const a = d.stands[0], b = d.stands[1] || d.stands[0];
    return {
      analogy: ['Two stands charge the same price $p$. The income is $p \\times n_1 + p \\times n_2$. Taking out the common $p$ gives $p(n_1 + n_2)$: price times total fans. That is factorising.', 'Look for the biggest number (and letter) that goes into every term.'],
      why: 'Factorising pulls out what every term shares, the reverse of expanding.',
      steps: [
        step(['Same price, two stands: $pn_1 + pn_2$.']),
        step(['The common factor is $p$.'], '$pn_1 + pn_2 = p(n_1 + n_2)$'),
        step(['With numbers: $12x + 18$. The biggest number that goes into 12 and 18 is 6.'], '$12x + 18 = 6(2x + 3)$'),
        step(['Check by expanding: $6 \\times 2x = 12x$ and $6 \\times 3 = 18$.']),
        step(['Letters count too: $4x^2 + 6x = 2x(2x + 3)$, because $2x$ divides both.']),
      ],
      ask: ask('Factorise $12x + 18$ fully. What is the number in front of the bracket?', 6, '', { tol: 0, worked: ['HCF of 12 and 18 is 6.', '$6(2x + 3)$.'], apply: A.price(d, 'emptiest', 99) }),
      next: 'Double brackets are next: a pitch with both sides extended.',
    };
  });

  K.add('g-quadexpand', (d) => {
    const L1 = 105, W1 = 68, e = 4, f = 3, area = (L1 + e) * (W1 + f);
    return {
      analogy: ['The stadium plan extends the pitch by ' + e + ' m in length and ' + f + ' m in width. The new area is $(l + ' + e + ')(w + ' + f + ')$. Multiplying two brackets means every term in the first meets every term in the second.', 'FOIL (first, outer, inner, last) is a way to remember the four products.'],
      why: 'Each term in the first bracket multiplies each term in the second, then like terms are collected.',
      steps: [
        step(['Expand $(x + 3)(x + 5)$.']),
        step(['First: $x \\times x = x^2$. Outer: $x \\times 5 = 5x$. Inner: $3 \\times x = 3x$. Last: $3 \\times 5 = 15$.'], '$x^2 + 5x + 3x + 15$'),
        step(['Collect the $x$ terms.'], '$x^2 + 8x + 15$'),
        step(['A picture: a rectangle $(x + 3)$ by $(x + 5)$ splits into four smaller areas that match those four products.']),
        step(['The extended pitch: $(105 + ' + e + ')(68 + ' + f + ') = ' + area + '$ square metres.']),
      ],
      ask: ask('Expand $(x + 4)(x + 7)$. What is the number in front of $x$ in the answer?', 11, '', { tol: 0, worked: ['$x^2 + 7x + 4x + 28 = x^2 + 11x + 28$.'], apply: A.marketing(d) }),
      next: 'Factorising a quadratic is the reverse, and finds the roots of curves like revenue.',
    };
  });

  K.add('g-quadfactorise', (d) => {
    return {
      analogy: ['The revenue curve is a quadratic, and its two zeros (the prices where the revenue is nothing) come from factorising. To factorise $x^2 + 7x + 12$ you hunt for two numbers that multiply to 12 and add to 7.', 'It is a puzzle with a short list of answers, and the club game is full of those.'],
      why: 'A quadratic $x^2 + bx + c$ factorises into two brackets with numbers that multiply to $c$ and add to $b$.',
      steps: [
        step(['Factorise $x^2 + 7x + 12$.']),
        step(['List the pairs that multiply to 12: 1 and 12, 2 and 6, 3 and 4.']),
        step(['Which pair adds to 7? 3 and 4.']),
        step(['Write the brackets.'], '$(x + 3)(x + 4)$'),
        step(['Check by expanding: $x^2 + 4x + 3x + 12 = x^2 + 7x + 12$. If the last number is negative, one of the pair is negative: $x^2 + x - 12 = (x + 4)(x - 3)$.']),
      ],
      ask: ask('Factorise $x^2 + 9x + 20$ into $(x + a)(x + b)$ with $a < b$. What is $b$?', 5 > 4 ? 5 : 4, '', { tol: 0, worked: ['Two numbers that multiply to 20 and add to 9: 4 and 5.', '$(x + 4)(x + 5)$, so $b = 5$.'], apply: A.price(d, 'big', 3) }),
      next: 'Now we can use brackets to solve equations. First, forming and solving them.',
    };
  });

  K.add('g-forming', (d) => {
    const s = d.big, target = Math.round(s.sold * (s.price + 3));
    return {
      analogy: ['The board sets a target: "bring in ' + gbp(target) + ' from ' + s.name + '". With ' + num(s.sold) + ' fans, what price would reach it? That sentence is an equation waiting to be written.', 'Forming an equation means turning a sentence into algebra; solving it means undoing the steps.'],
      why: 'A worded target becomes an equation, and undoing the operations in reverse order solves it.',
      steps: [
        step(['Let $p$ be the price. With ' + num(s.sold) + ' fans the income is $' + s.sold + 'p$.'].concat(eg(d, 'crowds'))),
        step(['The board wants ' + gbp(target) + '. So:'], '$' + s.sold + 'p = ' + target + '$'),
        step(['Undo the multiplication by dividing both sides by ' + s.sold + '.'], '$p = ' + fr(target, s.sold) + ' = ' + m(target / s.sold) + '$'),
        step(['Check by putting it back: $' + s.sold + ' \\times ' + m(target / s.sold) + ' = ' + target + '$.']),
        step(['A longer one: "three more than twice the price is 25". $2p + 3 = 25$, so $2p = 22$ and $p = 11$. Undo in reverse order.']),
      ],
      ask: ask('The board wants ' + gbp(target) + ' from ' + s.name + ' and ' + num(s.sold) + ' fans come. Form and solve the equation $' + s.sold + 'p = ' + target + '$. What is the price $p$ in pounds?', target / s.sold, '£', { tol: 0.01, worked: ['$p = ' + target + ' \\div ' + s.sold + ' = ' + m(target / s.sold) + '$.'], apply: A.price(d, 'big', 99) }),
      next: 'Two unknowns need two equations. Simultaneous equations.',
    };
  });

  K.add('g-simul', (d) => {
    const a = 24, c = 12, e1 = 2 * a + 3 * c, e2 = a + 2 * c;
    return {
      analogy: ['A family of two adults and three children pays £' + e1 + ' for tickets. A group of one adult and two children pays £' + e2 + '. What is the price of an adult ticket and of a child ticket?', 'Two unknowns and two facts: simultaneous equations solve the pair together.'],
      why: 'Two equations with two unknowns can be solved by eliminating one of them.',
      steps: [
        step(['Let $a$ be an adult ticket and $c$ a child ticket.'], ['$2a + 3c = ' + e1 + '$', '$a + 2c = ' + e2 + '$']),
        step(['Make the number of $a$ the same: double the second equation.'], '$2a + 4c = ' + 2 * e2 + '$'),
        step(['Subtract the first from it. The $a$ terms cancel.'], '$(2a + 4c) - (2a + 3c) = ' + 2 * e2 + ' - ' + e1 + '$'),
        step(['What is left is $c$.'], '$c = ' + (2 * e2 - e1) + '$'),
        step(['Put it back into the second equation to find $a$.'], '$a + 2(' + c + ') = ' + e2 + ' \\Rightarrow a = ' + a + '$'),
      ],
      ask: ask('A family (2 adults, 3 children) pays £' + e1 + ' and a group (1 adult, 2 children) pays £' + e2 + '. What is the price of an adult ticket, in pounds?', a, '£', { tol: 0, worked: ['Double the second: $2a + 4c = ' + 2 * e2 + '$. Subtract: $c = ' + c + '$. Then $a = ' + a + '$.'], apply: A.price(d, 'emptiest', 99) }),
      next: 'Quadratic equations come next. They find the break-even points of a curve.',
    };
  });

  K.add('g-quadsolve', (d) => {
    return {
      analogy: ['A long ball is kicked and its height in metres after $t$ seconds is $h = 12t - 4t^2$ (a model). When does it land? When $h = 0$. That is a quadratic equation.', 'A quadratic can be solved by factorising, with the formula, or by completing the square.'],
      why: 'A quadratic equation has up to two solutions, found by factorising and setting each bracket to zero.',
      steps: [
        step(['Set the height to zero.'], '$12t - 4t^2 = 0$'),
        step(['Factorise: take out $4t$.'], '$4t(3 - t) = 0$'),
        step(['A product is zero only if one factor is zero. So $4t = 0$ or $3 - t = 0$.'], '$t = 0$ or $t = 3$'),
        step(['$t = 0$ is the kick; $t = 3$ is the landing. The ball was in the air for 3 seconds.']),
        step(['When it will not factorise, use the formula: $x = ' + fr('-b \\pm \\sqrt{b^2 - 4ac}', '2a') + '$.']),
      ],
      ask: ask('A kick has height $h = 12t - 4t^2$ metres after $t$ seconds. How many seconds until it lands?', 3, 's', { tol: 0, worked: ['Set $h = 0$: $4t(3 - t) = 0$.', '$t = 3$.'], apply: A.plan('build', 'keeper', 'std', 'Long kicks of 3 s hang a lot: keep the keeper\'s distribution standard') }),
      next: 'Sequences are patterns in numbers, like crowds growing match to match.',
    };
  });

  K.add('g-seq', (d) => {
    const base = 4000, inc = 120, nth = (n) => base + inc * (n - 1);
    return {
      analogy: ['Season-ticket sales rise by ' + inc + ' a match: ' + [1, 2, 3, 4].map(nth).join(', ') + '... A sequence is an ordered list and the nth term is the rule that gives any term.', 'Add the same amount each time and it is arithmetic.'],
      why: 'An arithmetic sequence adds the same amount each step; its nth term is $a + (n-1)d$, written as $dn + c$.',
      steps: [
        step(['The sequence: ' + [1, 2, 3, 4].map(nth).join(', ') + '.']),
        step(['The common difference is ' + inc + '.'], '$d = ' + inc + '$'),
        step(['The nth term starts with $' + inc + 'n$. Compare with the first term: $' + inc + ' \\times 1 = ' + inc + '$, and the first term is ' + base + '.']),
        step(['So add ' + (base - inc) + ' to fix it.'], '$' + inc + 'n + ' + (base - inc) + '$'),
        step(['Check: $n = 4$ gives $' + inc * 4 + ' + ' + (base - inc) + ' = ' + nth(4) + '$. To find the 20th term: $' + inc + ' \\times 20 + ' + (base - inc) + ' = ' + nth(20) + '$.']),
      ],
      ask: ask('Season-ticket sales are ' + [1, 2, 3, 4].map(nth).join(', ') + ', rising by ' + inc + ' each home match. How many season tickets are sold in the 12th match?', nth(12), '', { tol: 0, worked: ['nth term $' + inc + 'n + ' + (base - inc) + '$.', 'n = 12: ' + nth(12) + '.'], apply: A.marketing(d) }),
      next: 'A function is a machine: put a number in, get a number out.',
    };
  });

  K.add('g-functions', (d) => {
    const s = d.big, f = (x) => x + 2, g = (x) => 0.8 * x;
    return {
      analogy: ['The ticket machine takes a price and returns what the fan pays. A 20% discount is one machine, a £2 booking fee is another. Chained together they make a composite function.', 'A function $f(x)$ gives exactly one output for each input.'],
      why: 'A function is a rule; $f(g(x))$ means do $g$ first, then $f$.',
      steps: [
        step(['Let $f(x) = x + 2$ add the booking fee and $g(x) = 0.8x$ take 20% off.']),
        step(['$g(' + s.price + ') = 0.8 \\times ' + s.price + ' = ' + m(g(s.price)) + '$: the discounted price of a ' + s.name + ' ticket.']),
        step(['Then add the fee: $f(g(' + s.price + ')) = ' + m(g(s.price)) + ' + 2 = ' + m(f(g(s.price))) + '$.']),
        step(['Order matters: $g(f(' + s.price + ')) = 0.8(' + s.price + ' + 2) = ' + m(g(f(s.price))) + '$, a different amount.']),
        step(['An inverse function undoes the original: the inverse of $f(x) = x + 2$ is $f^{-1}(x) = x - 2$.']),
      ],
      ask: ask('Let $f(x) = x + 2$ and $g(x) = 0.8x$. For a ticket at £' + s.price + ', find $f(g(' + s.price + '))$ (discount first, then the fee).', f(g(s.price)), '£', { tol: 0.01, worked: ['$g(' + s.price + ') = ' + m(g(s.price)) + '$.', '$f$ of that is ' + m(f(g(s.price))) + '$.'], apply: A.price(d, 'big', 2) }),
      next: 'Graphs show functions. Coordinates first: the pitch is a grid.',
    };
  });

  K.add('g-coords', (d) => {
    const p1 = [20, 14], p2 = [44, 38], mid = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
    return {
      analogy: ['The pitch is a grid: $x$ metres along from the goal and $y$ metres across. Every player has a coordinate pair, which is how the analysis tools store positions.', 'Coordinates $(x, y)$ place a point. The midpoint of two points is the average of each coordinate.'],
      why: 'Coordinates put a position on a grid, and the midpoint is the average of the two points.',
      steps: [
        step(['Two midfielders stand at $(' + p1 + ')$ and $(' + p2 + ')$, in metres from the goal line and the right touchline.']),
        step(['$x$ is first (across the page), $y$ second (up).']),
        step(['The midpoint is the average of the $x$ values and the average of the $y$ values.'], '$\\left(' + fr(p1[0] + '+' + p2[0], 2) + ',\\ ' + fr(p1[1] + '+' + p2[1], 2) + '\\right) = (' + mid + ')$'),
        step(['That is the best place for a team-mate to receive a pass played between them: equally close to both.']),
        step(['The distance between them uses Pythagoras, which we do in the geometry strand.']),
      ],
      ask: ask('Two midfielders are at $(' + p1 + ')$ and $(' + p2 + ')$. What is the $x$ coordinate of the midpoint?', mid[0], 'm', { tol: 0, worked: ['$(20 + 44) / 2 = 32$.'], apply: A.plan('defence', 'compact', 'tight', 'The space between two players is the midpoint of the pair: keep the defence compact so no gap opens') }),
      next: 'A straight line graph has a gradient and an intercept: $y = mx + c$.',
    };
  });

  K.add('g-straight', (d) => {
    const s = d.big, spons = 5000, f = (n) => s.price * n + spons;
    return {
      analogy: ['The income from ' + s.name + ' is the price times the fans, plus a fixed sponsor bonus of £' + spons + ' for the match. Plot income against fans and you get a straight line.', 'The gradient is the price per fan; the intercept is the sponsor money paid even if nobody comes.'],
      why: 'A line has the equation $y = mx + c$: $m$ is the gradient and $c$ is where it crosses the $y$-axis.',
      steps: [
        step(['Income $I$ as a function of fans $n$.'], '$I = ' + s.price + 'n + ' + spons + '$'),
        step(['Compare with $y = mx + c$: $m = ' + s.price + '$ (pounds per fan) and $c = ' + spons + '$ (the sponsor bonus).']),
        step(['To draw it, find two points. $n = 0$ gives $' + spons + '$. $n = 1000$ gives $' + f(1000) + '$.']),
        step(['With ' + num(s.sold) + ' fans: $' + s.price + ' \\times ' + s.sold + ' + ' + spons + ' = ' + f(s.sold) + '$.'].concat(eg(d, 'crowds'))),
        step(['Parallel lines have the same gradient. Two stands at the same price give parallel income lines.']),
      ],
      ask: ask('Income from ' + s.name + ' is $I = ' + s.price + 'n + ' + spons + '$ where $n$ is the number of fans. What is the income with ' + num(s.sold) + ' fans?', f(s.sold), '£', { tol: 0, worked: [s.price + ' x ' + s.sold + ' + ' + spons + ' = ' + f(s.sold) + '.'], apply: A.price(d, 'big', 99) }),
      next: 'The revenue curve is not a line but a parabola: quadratic graphs.',
    };
  });

  K.add('g-quadgraph', (d) => {
    const s = d.big, k = 0.9 * s.sold / s.price, a = s.sold + k * s.price, root = a / k;
    return {
      analogy: ['Revenue against price is an upside-down U (a parabola): at a price of zero you earn nothing, and at a price so high that nobody comes you earn nothing again. In between there is a peak.', 'The two points where the curve hits zero are its roots.'],
      why: 'A quadratic graph is a U-shape; its roots are where it crosses the axis and its turning point is the best (or worst) value.',
      steps: [
        step(['A simple model for ' + s.name + ': revenue $R = -' + m(k) + 'p^2 + ' + m(a) + 'p$.'].concat(eg(d, 'crowds'))),
        step(['The coefficient of $p^2$ is negative, so the graph is an upside-down U.']),
        step(['The roots: set $R = 0$ and factorise.'], '$p(' + m(a) + ' - ' + m(k) + 'p) = 0$'),
        step(['So $p = 0$ or $p = ' + m(a) + ' \\div ' + m(k) + ' = ' + m(root) + '$.']),
        step(['The peak is exactly halfway between the roots, at $p = ' + m(root / 2) + '$. That symmetry is a quick way to find the best price of a quadratic.']),
      ],
      ask: ask('For $R = -' + m(k) + 'p^2 + ' + m(a) + 'p$, the roots are $p = 0$ and a second value. What is the second root, as a price in pounds?', root, '£', { tol: 0.1, worked: ['$p(' + m(a) + ' - ' + m(k) + 'p) = 0$.', '$p = ' + m(a) + ' / ' + m(k) + ' = ' + m(root) + '$.'], apply: A.price(d, 'big', 99) }),
      next: 'Other curves have their own shapes: cubics, reciprocals and exponentials.',
    };
  });

  K.add('g-othergraphs', (d) => {
    const k = d.big.price * d.big.sold;
    return {
      analogy: ['Not every relationship is a line or a parabola. If the money fans spend is fixed, the crowd is a reciprocal curve of price. A crowd growing by a percentage is an exponential curve. A cubic can describe the swing of a long run of form.', 'Recognising the shape of a graph is the first step in choosing a model.'],
      why: 'Each family of functions has a recognisable shape: reciprocals fall steeply and flatten, exponentials grow faster and faster, cubics wiggle.',
      steps: [
        step(['A reciprocal: $y = ' + fr('k', 'x') + '$. Double $x$ and $y$ halves. The curve never touches either axis.'], '$n = ' + fr(k, 'p') + '$'),
        step(['For a price of £$p$ the fans are $' + k + ' \\div p$. At £10: ' + k / 10 + '; at £20: ' + k / 20 + '.']),
        step(['An exponential: $y = a^x$ with $a > 1$. It starts slowly and then rockets. Crowd growth of 3% a match is $N = N_0 \\times 1.03^t$.']),
        step(['A cubic: $y = x^3$. It passes through the origin and has an S-shape: flat in the middle, steep at the ends.']),
        step(['To tell them apart, check a few values: a table of $x$ and $y$ shows whether $y$ halves, doubles, or grows by a squared or cubed pattern.']),
      ],
      ask: ask('If the total spent on tickets in a stand is always ' + gbp(k) + ', fans $n = ' + k + ' \\div p$. How many fans would come at a price of £' + (d.big.price + 5) + '? Give the nearest whole number.', Math.round(k / (d.big.price + 5)), 'fans', { tol: 2, worked: [k + ' / ' + (d.big.price + 5) + ' = ' + m(k / (d.big.price + 5)) + '.'], apply: A.price(d, 'third', 99) }),
      next: 'Real-life graphs: a straight line of distance against time is a speed.',
    };
  });

  K.add('g-realgraphs', (d) => {
    const pace = (d.fast && d.fast.ratings && d.fast.ratings.pace) || 80, sp = 6 + pace / 100 * 2.6, t = 4, dist = sp * t;
    return {
      analogy: ['A distance-time graph of ' + (d.fast ? d.fast.name : 'your winger') + '\'s sprint shows how far he is from where he started after each second. A straight line means steady speed, and its gradient is the speed.', 'A horizontal line means he has stopped. A steeper line is quicker.'],
      why: 'On a distance-time graph the gradient is the speed.',
      steps: [
        step(['In the engine, ' + (d.fast ? d.fast.name : 'your winger') + ' (pace ' + pace + ') tops out near ' + m1(sp) + ' m/s.']),
        step(['After 0 s he is at 0 m. After ' + t + ' s at that speed he has gone ' + m1(dist) + ' m.'], '$(0, 0)$ and $(' + t + ',\\ ' + m1(dist) + ')$'),
        step(['The gradient is the change in distance over the change in time.'], '$' + fr(m1(dist), t) + ' = ' + m1(sp) + '$ m/s'),
        step(['A speed-time graph is different: the gradient is acceleration and the area under it is distance.']),
        step(['Use the right graph for the right question: distance-time for where he is, speed-time for how quickly he is speeding up.']),
      ],
      ask: ask('A winger runs 30 m in 4 s at a steady speed. What is his speed, in metres per second?', 7.5, 'm/s', { tol: 0.01, worked: ['$30 \\div 4 = 7.5$.'], apply: pace >= 75 ? A.plan('build', 'tempo', 'fast', 'Your quickest player has pace ' + pace + ': raise the build-up tempo so he gets the ball in space') : A.plan('build', 'tempo', 'std', 'No real pace to use: keep the build-up tempo standard') }),
      next: 'That completes the algebra strand. Geometry is next: angles, shapes and the maths of the pitch.',
    };
  });
})();
