// A-level Pure Mathematics lessons (Edexcel 9MA0), second set: more trigonometry, logarithms, differentiation, integration, numerical methods, vectors.
(function () {
  const K = window.FM && window.FM.K; if (!K) return;
  const { m, m1, m3, fr, sum, mean, eg, A, ask, step, gbp, num } = K;
  const PI = Math.PI, deg = (x) => x * PI / 180;
  const demandOf = (s) => { const k = 0.9 * s.sold / s.price, a = s.sold + k * s.price; return { k, a, pk: a / (2 * k) }; };

  K.add('p-trigadd', (d) => {
    const v = Math.sin(deg(75));
    return {
      analogy: ['Two waves combine: the crowd has a weekly swing and a seasonal swing, and the formula for the sine of a sum splits or joins them. The same formulae give exact values for angles like 75°.', 'The double-angle formulae are the special case $B = A$.'],
      why: '$\\sin(A + B) = \\sin A\\cos B + \\cos A\\sin B$ and $\\cos(A + B) = \\cos A\\cos B - \\sin A\\sin B$; setting $B = A$ gives the double-angle formulae.',
      steps: [
        step(['$\\sin(A + B) = \\sin A\\cos B + \\cos A\\sin B$ and $\\sin(A - B) = \\sin A\\cos B - \\cos A\\sin B$.']),
        step(['Exact value of $\\sin 75°$: write it as $\\sin(45° + 30°)$.'], '$' + fr('\\sqrt{2}', 2) + ' \\times ' + fr('\\sqrt{3}', 2) + ' + ' + fr('\\sqrt{2}', 2) + ' \\times ' + fr(1, 2) + ' = ' + fr('\\sqrt{6} + \\sqrt{2}', 4) + ' = ' + m3(v) + '$'),
        step(['Double angle: $\\sin 2A = 2\\sin A\\cos A$.']),
        step(['$\\cos 2A = \\cos^2 A - \\sin^2 A = 2\\cos^2 A - 1 = 1 - 2\\sin^2 A$. Three forms, so pick the one that matches what you know.']),
        step(['$\\tan 2A = ' + fr('2\\tan A', '1 - \\tan^2 A') + '$. These turn up when the angle of a shot is doubled or halved.']),
      ],
      ask: ask('Use $\\sin(45° + 30°)$ to find $\\sin 75°$, to 3 decimal places.', v, '', { tol: 0.002, worked: ['$(\\sqrt{6} + \\sqrt{2}) / 4 = ' + m3(v) + '$.'], apply: A.price(d, 'second', 4) }),
      next: 'Combining a sine and a cosine into one wave: the R form.',
    };
  });

  K.add('p-trigr', (d) => ({
    analogy: ['The weekly swing and the form swing in the crowd have the same period but different timings. Added together they make one wave with a new height and a new start. Writing $a\\sin x + b\\cos x$ as $R\\sin(x + \\alpha)$ finds that height and start.', '$R = \\sqrt{a^2 + b^2}$.'],
    why: '$a\\sin x + b\\cos x = R\\sin(x + \\alpha)$ with $R = \\sqrt{a^2 + b^2}$ and $\\tan\\alpha = ' + fr('b', 'a') + '$.',
    steps: [
      step(['Write $3\\sin x + 4\\cos x = R\\sin(x + \\alpha)$.']),
      step(['Expand the right side with the addition formula.'], '$R\\sin x\\cos\\alpha + R\\cos x\\sin\\alpha$'),
      step(['Match coefficients: $R\\cos\\alpha = 3$ and $R\\sin\\alpha = 4$.']),
      step(['Square and add: $R^2 = 9 + 16 = 25$, so $R = 5$. Divide: $\\tan\\alpha = ' + fr(4, 3) + '$, so $\\alpha = 53.13°$.'], '$3\\sin x + 4\\cos x = 5\\sin(x + 53.13°)$'),
      step(['The maximum value is $R = 5$ (when the sine is 1) and the minimum $-5$. That is the biggest the combined swing can reach.']),
    ],
    ask: ask('Write $3\\sin x + 4\\cos x$ as $R\\sin(x + \\alpha)$. What is $R$?', 5, '', { tol: 0, worked: ['$R = \\sqrt{3^2 + 4^2} = 5$.'], apply: A.marketing(d) }),
    next: 'For small angles, the trig functions simplify to something very easy.',
  }));

  K.add('p-smallangle', (d) => {
    const w = 7.32, dist = 30, th = w / dist, ex = 2 * Math.atan(w / (2 * dist));
    return {
      analogy: ['From 30 m out the goal (7.32 m wide) fills a small angle. For small angles in radians, $\\sin\\theta \\approx \\theta$ and $\\tan\\theta \\approx \\theta$, so the angle is simply width over distance: a one-line estimate of how much goal a shooter can see.', 'The approximation works for angles under about 0.2 radians.'],
      why: 'For small $\\theta$ in radians, $\\sin\\theta \\approx \\theta$, $\\tan\\theta \\approx \\theta$ and $\\cos\\theta \\approx 1 - ' + fr('\\theta^2', 2) + '$.',
      steps: [
        step(['The goal is 7.32 m wide. From 30 m directly in front, the angle it fills is about'], '$\\theta \\approx ' + fr('7.32', 30) + ' = ' + m3(th) + '$ radians'),
        step(['Exact: $2\\tan^{-1}(3.66 / 30) = ' + m3(ex) + '$ rad. The estimate is within ' + m3(Math.abs(ex - th)) + '.']),
        step(['In degrees: $' + m3(th) + ' \\times ' + fr(180, '\\pi') + ' = ' + m1(th * 180 / PI) + '°$.']),
        step(['Closer in, the angle grows quickly: from 10 m it is about $2\\tan^{-1}(0.366) = 40°$, and the approximation has failed.']),
        step(['Use small-angle approximations to simplify limits and to estimate quickly; always check the angle really is small.']),
      ],
      ask: ask('The goal is 7.32 m wide and the shooter is 30 m away. Use $\\theta \\approx ' + fr('w', 'd') + '$ to estimate the angle in radians, to 3 decimal places.', th, 'rad', { tol: 0.001, worked: ['$7.32 / 30 = 0.244$.'], apply: A.plan('final', 'shooting', 'patient', 'From 30 m the goal fills only ' + m1(th * 180 / PI) + '°: wait for closer chances') }),
      next: 'Logarithms solve for an unknown power.',
    };
  });

  K.add('p-logeq', (d) => {
    const t = Math.log(2) / Math.log(1.03);
    return {
      analogy: ['How many home matches until a crowd growing 3% a match has doubled? You need to solve $1.03^t = 2$, and the tool for an unknown power is a logarithm.', 'Take logs of both sides and bring the power down.'],
      why: 'To solve $a^t = b$, take logarithms: $t = ' + fr('\\log b', '\\log a') + '$.',
      steps: [
        step(['The crowd is $N = N_0 \\times 1.03^t$. Doubling means $1.03^t = 2$.']),
        step(['Take logs of both sides.'], '$t\\log 1.03 = \\log 2$'),
        step(['Divide.'], '$t = ' + fr('\\log 2', '\\log 1.03') + ' = ' + m(t) + '$'),
        step(['So the crowd doubles after about ' + m1(t) + ' matches. (Check: $1.03^{23.45} \\approx 2$.)']),
        step(['Laws of logs: $\\log(ab) = \\log a + \\log b$, $\\log(' + fr('a', 'b') + ') = \\log a - \\log b$, $\\log(a^n) = n\\log a$. Equations such as $2^{x} = 5^{x-1}$ are solved the same way.']),
      ],
      ask: ask('A crowd grows 3% a home match. Solve $1.03^t = 2$ for $t$, the number of matches to double, to 1 decimal place.', t, 'matches', { tol: 0.06, worked: ['$t = \\log 2 / \\log 1.03 = ' + m1(t) + '$.'], apply: A.marketing(d) }),
      next: 'The number $e$ and the natural logarithm: continuous growth.',
    };
  });

  K.add('p-natural', (d) => {
    const v = Math.exp(0.3), n = d.crowd;
    return {
      analogy: ['If a crowd grows continuously at 3% per match, it follows $N = N_0e^{0.03t}$. The number $e \\approx 2.718$ is the base for which the growth rate of the curve equals its value, which is why it appears whenever growth is proportional to size.', '$\\ln$ is the logarithm to base $e$, the inverse of $e^x$.'],
      why: '$e^x$ is its own derivative and $\\ln x$ is its inverse: $\\ln(e^x) = x$.',
      steps: [
        step(['$e = 2.71828\\ldots$ is the limit of $(1 + ' + fr(1, 'n') + ')^n$ as $n$ grows.']),
        step(['Continuous growth at a rate $k$ per match: $N = N_0e^{kt}$. With $k = 0.03$ and $t = 10$.'], '$e^{0.3} = ' + m3(v) + '$'),
        step(['So the crowd grows by a factor of ' + m3(v) + ' in 10 matches: from ' + num(n) + ' to ' + num(n * v) + '.'].concat(eg(d, 'crowds'))),
        step(['To solve for time use $\\ln$: $e^{0.03t} = 2$ gives $0.03t = \\ln 2$, so $t = ' + fr('\\ln 2', 0.03) + ' = ' + m1(Math.log(2) / 0.03) + '$ matches.']),
        step(['The graph of $y = e^x$ passes through $(0, 1)$ and is always above the $x$-axis; $y = \\ln x$ is its mirror image in $y = x$.']),
      ],
      ask: ask('A crowd grows continuously as $N = N_0e^{0.03t}$. By what factor does it grow in 10 matches? Evaluate $e^{0.3}$ to 3 decimal places.', v, '', { tol: 0.002, worked: ['$e^{0.3} = ' + m3(v) + '$.'], apply: A.price(d, 'big', 3) }),
      next: 'Modelling with exponentials and logarithms turns data into a model.',
    };
  });

  K.add('p-modelexp', (d) => {
    const s = d.big, b = 0.85 / s.price, np = s.price + 4, q = s.sold * Math.exp(-b * 4);
    return {
      analogy: ['The game\'s ticket demand follows a power of price; a good approximation near today\'s price is an exponential $q = q_0e^{-bp}$. Fitting it means turning the curve into a straight line with logarithms.', 'Take $\\ln$ of $q = ae^{-bp}$ and you get a line: $\\ln q = \\ln a - bp$.'],
      why: 'An exponential model $y = ae^{bx}$ becomes a straight line when you plot $\\ln y$ against $x$.',
      steps: [
        step([s.name + ': ' + num(s.sold) + ' fans at £' + s.price + '. For this kind of fan demand falls about ' + m(0.85 * 100) + '% for every 100% rise in price, so near today\'s price $b \\approx ' + m3(b) + '$.'].concat(eg(d, 'crowds'))),
        step(['Model: $q = ' + num(s.sold) + 'e^{-' + m3(b) + '(p - ' + s.price + ')}$.']),
        step(['At £' + np + ' (£4 more).'], '$q = ' + num(s.sold) + 'e^{-' + m3(b * 4) + '} = ' + m(q) + '$'),
        step(['Take logs to check linearity: $\\ln q = \\ln ' + num(s.sold) + ' - ' + m3(b) + '(p - ' + s.price + ')$ is a straight line of gradient $-' + m3(b) + '$.']),
        step(['Real data rarely fit exactly; a model is judged by how well its predictions match what happens, which the game will show you after the next home match.']),
      ],
      ask: ask('Model the crowd at ' + s.name + ' as $q = ' + num(s.sold) + 'e^{-' + m3(b) + '(p - ' + s.price + ')}$. How many fans does it predict at £' + np + '? Round to the nearest whole fan.', Math.round(q), 'fans', { tol: 3, worked: [num(s.sold) + ' e^(-' + m3(b * 4) + ') = ' + m(q) + '.'], apply: A.price(d, 'big', 99) }),
      next: 'Now differentiation applied to curves: tangents and normals.',
    };
  });

  K.add('p-tangents', (d) => {
    const s = d.big, dm = demandOf(s), p = s.price, g = dm.a - 2 * dm.k * p, normal = -1 / g;
    return {
      analogy: ['The tangent to the revenue curve at today\'s price is the straight line that just touches it: it tells you how revenue changes for small price moves. The normal is perpendicular to it.', 'The gradient of the tangent is the derivative at that point.'],
      why: 'The tangent at $x = a$ has gradient $f\'(a)$ and passes through $(a, f(a))$; the normal has gradient $-' + fr(1, 'f\'(a)') + '$.',
      steps: [
        step(['Model for ' + s.name + ': $R = -' + m(dm.k) + 'p^2 + ' + m(dm.a) + 'p$, so $\\dfrac{dR}{dp} = ' + m(dm.a) + ' - ' + m(2 * dm.k) + 'p$.']),
        step(['At the price you charge today, $p = ' + p + '$.'], '$\\dfrac{dR}{dp} = ' + m(g) + '$'),
        step(['Tangent: $R - R(' + p + ') = ' + m(g) + '(p - ' + p + ')$, a line through today\'s point with that slope.']),
        step(['The normal is perpendicular: its gradient is $-1 / ' + m(g) + ' = ' + m(normal * 1000) + ' \\times 10^{-3}$.']),
        step(['A steep tangent means revenue is very sensitive to price here; a flat one means you are near the top.']),
      ],
      ask: ask('For $R = -' + m(dm.k) + 'p^2 + ' + m(dm.a) + 'p$ the gradient at $p = ' + p + '$ is ' + m(g) + '. What is the gradient of the normal there, to 4 decimal places?', normal, '', { tol: Math.abs(normal) * 0.01 + 0.00005, worked: ['$-1 / ' + m(g) + ' = ' + m3(normal) + '$.'], apply: A.price(d, 'big', 4) }),
      next: 'Where the gradient is zero: stationary points.',
    };
  });

  K.add('p-stationary', (d) => {
    const s = d.big, dm = demandOf(s);
    return {
      analogy: ['Revenue rises with price until a peak, then falls. At the peak the gradient is zero: a stationary point. Where the gradient is positive the function is increasing, where negative decreasing.', 'Setting $f\'(x) = 0$ finds every stationary point.'],
      why: 'A stationary point is where $f\'(x) = 0$; the sign of $f\'$ either side tells you its nature.',
      steps: [
        step(['$R = -' + m(dm.k) + 'p^2 + ' + m(dm.a) + 'p$, $R\' = ' + m(dm.a) + ' - ' + m(2 * dm.k) + 'p$.'].concat(eg(d, 'crowds'))),
        step(['Set the gradient to zero.'], '$' + m(dm.a) + ' - ' + m(2 * dm.k) + 'p = 0 \\Rightarrow p = ' + m(dm.pk) + '$'),
        step(['For $p < ' + m(dm.pk) + '$ the gradient is positive: revenue increasing. For $p > ' + m(dm.pk) + '$ it is negative: decreasing.']),
        step(['So the stationary point is a maximum: the gradient changes from $+$ to $-$.']),
        step(['A minimum changes from $-$ to $+$; a point of inflection does not change sign.']),
      ],
      ask: ask('For $R = -' + m(dm.k) + 'p^2 + ' + m(dm.a) + 'p$, find the price $p$ at the stationary point, in pounds to 2 decimal places.', dm.pk, '£', { tol: 0.02, worked: ['$' + m(dm.a) + ' / (2 \\times ' + m(dm.k) + ') = ' + m(dm.pk) + '$.'], apply: A.price(d, 'big', 99) }),
      next: 'The second derivative tells you which kind of stationary point it is.',
    };
  });

  K.add('p-secondderiv', (d) => {
    const s = d.second || d.stands[1], dm = demandOf(s);
    return {
      analogy: ['The second derivative is how quickly the gradient is changing. Negative means the curve is bending downwards, like the top of the revenue curve: a maximum. Positive bends upward: a minimum, like the lowest point of costs per fan.', 'It is the quickest test of the nature of a stationary point.'],
      why: 'At a stationary point, $f\'\'(x) < 0$ means a maximum, $f\'\'(x) > 0$ a minimum, and $f\'\'(x) = 0$ needs more checking.',
      steps: [
        step(['Model for ' + s.name + ': $R\' = ' + m(dm.a) + ' - ' + m(2 * dm.k) + 'p$.']),
        step(['Differentiate again.'], '$R\'\' = -' + m(2 * dm.k) + '$'),
        step(['It is negative everywhere, so the curve always bends downwards: the stationary point is a maximum.']),
        step(['Concave means $f\'\' < 0$ (bends down), convex means $f\'\' > 0$ (bends up). A point where the sign of $f\'\'$ changes is a point of inflection.']),
        step(['For a cubic like $x^3 - 3x$: $f\'\' = 6x$, negative for $x < 0$ and positive for $x > 0$, so it changes concavity at $x = 0$.']),
      ],
      ask: ask('For $R = -' + m(dm.k) + 'p^2 + ' + m(dm.a) + 'p$ find $R\'\'$ (the second derivative), to 2 decimal places.', -2 * dm.k, '', { tol: 0.02, worked: ['$R\' = ' + m(dm.a) + ' - ' + m(2 * dm.k) + 'p$, so $R\'\' = -' + m(2 * dm.k) + '$.'], apply: A.price(d, 'second', 99) }),
      next: 'Optimisation problems use all of this to find the best.',
    };
  });

  K.add('p-diffexp', (d) => {
    const n0 = d.crowd, rate = 0.03 * n0;
    return {
      analogy: ['A crowd growing as $N = N_0e^{0.03t}$ has a growth rate of $0.03N$: bigger crowds grow faster. That is what differentiating an exponential shows, and it is the heart of compound growth.', '$\\dfrac{d}{dx}e^{kx} = ke^{kx}$.'],
      why: '$e^{kx}$ differentiates to $ke^{kx}$; $\\ln x$ to $' + fr(1, 'x') + '$; $a^x$ to $a^x\\ln a$.',
      steps: [
        step(['$N = N_0e^{0.03t}$ with $N_0 = ' + num(n0) + '$.'].concat(eg(d, 'crowds'))),
        step(['Differentiate with the chain rule: the derivative of $e^{0.03t}$ is $0.03e^{0.03t}$.'], '$\\dfrac{dN}{dt} = 0.03N_0e^{0.03t}$'),
        step(['At $t = 0$: $\\dfrac{dN}{dt} = 0.03 \\times ' + num(n0) + ' = ' + m(rate) + '$ fans per match.']),
        step(['$\\ln x$ differentiates to $' + fr(1, 'x') + '$, and $\\ln(3x)$ also gives $' + fr(1, 'x') + '$. $\\dfrac{d}{dx}a^x = a^x\\ln a$, so $2^x$ gives $2^x\\ln 2$.']),
        step(['The rate is proportional to the size: that is the defining property of exponential growth.']),
      ],
      ask: ask('A crowd follows $N = ' + num(n0) + 'e^{0.03t}$. At $t = 0$, how fast is it growing in fans per match? ($\\dfrac{dN}{dt}$ at $t = 0$.)', rate, 'fans/match', { tol: 0.5, worked: ['$\\dfrac{dN}{dt} = 0.03 \\times ' + num(n0) + ' = ' + m(rate) + '$.'], apply: A.marketing(d) }),
      next: 'Sine and cosine differentiate too, in a loop.',
    };
  });

  K.add('p-difftrig', (d) => {
    const v = 400 * PI;
    return {
      analogy: ['A crowd swinging 800 either side of 8,000 over a 4-match cycle is $N = 8000 + 800\\sin(' + fr('\\pi t', 2) + ')$. How fast is it rising at the start of the cycle? That is a derivative of a sine.', 'In radians, $\\sin$ differentiates to $\\cos$, and $\\cos$ to $-\\sin$.'],
      why: '$\\dfrac{d}{dx}\\sin x = \\cos x$ and $\\dfrac{d}{dx}\\cos x = -\\sin x$ (in radians), with the chain rule for $\\sin(kx)$.',
      steps: [
        step(['$N = 8000 + 800\\sin(' + fr('\\pi t', 2) + ')$.']),
        step(['The chain rule: differentiate the sine to a cosine, then multiply by the derivative of the inside, $' + fr('\\pi', 2) + '$.'], '$\\dfrac{dN}{dt} = 800 \\times ' + fr('\\pi', 2) + '\\cos(' + fr('\\pi t', 2) + ') = 400\\pi\\cos(' + fr('\\pi t', 2) + ')$'),
        step(['At $t = 0$, $\\cos 0 = 1$.'], '$\\dfrac{dN}{dt} = 400\\pi = ' + m(v) + '$ fans per match'),
        step(['At $t = 1$ (the peak) $\\cos(' + fr('\\pi', 2) + ') = 0$: the rate is zero, as it should be at the top of a wave.']),
        step(['Why radians? Only in radians is the derivative of $\\sin x$ exactly $\\cos x$ with no extra constant.']),
      ],
      ask: ask('A crowd follows $N = 8000 + 800\\sin(' + fr('\\pi t', 2) + ')$. At $t = 0$, how fast is it rising? Give $\\dfrac{dN}{dt}$ in fans per match to the nearest whole number.', Math.round(v), 'fans/match', { tol: 1, worked: ['$400\\pi \\cos 0 = 400\\pi = ' + m(v) + '$.'], apply: A.price(d, 'fourth', 4) }),
      next: 'Tangent, secant and friends differentiate using the rules you already have.',
    };
  });

  K.add('p-difftrig2', (d) => ({
    analogy: ['The angle of the through-ball changes as the winger runs; how fast depends on tangent. Differentiating $\\tan x$ uses the quotient rule on $' + fr('\\sin x', '\\cos x') + '$, and the others follow the same way.', 'Learn the results and know where they come from.'],
    why: '$\\dfrac{d}{dx}\\tan x = \\sec^2 x$; $\\sec x$ differentiates to $\\sec x\\tan x$; $\\csc x$ to $-\\csc x\\cot x$; $\\cot x$ to $-\\csc^2 x$.',
    steps: [
      step(['Quotient rule on $\\tan x = ' + fr('\\sin x', '\\cos x') + '$.'], '$' + fr('\\cos x\\cos x - \\sin x(-\\sin x)', '\\cos^2 x') + ' = ' + fr(1, '\\cos^2 x') + ' = \\sec^2 x$'),
      step(['$\\sec x = (\\cos x)^{-1}$: chain rule gives $-(\\cos x)^{-2}(-\\sin x) = ' + fr('\\sin x', '\\cos^2 x') + ' = \\sec x\\tan x$.']),
      step(['At $x = ' + fr('\\pi', 4) + '$, $\\sec^2 x = 1 / \\cos^2 45° = 1 / 0.5 = 2$. So the tangent graph is twice as steep as a 45° line there.']),
      step(['With the chain rule: $\\dfrac{d}{dx}\\tan 3x = 3\\sec^2 3x$.']),
      step(['The pattern: every "co-" function has a minus sign in its derivative.']),
    ],
    ask: ask('Differentiate $y = \\tan x$ and evaluate the gradient at $x = ' + fr('\\pi', 4) + '$.', 2, '', { tol: 0.001, worked: ['$\\dfrac{dy}{dx} = \\sec^2 x$. At 45° $\\sec^2 = 2$.'], apply: A.price(d, 'emptiest', 4) }),
    next: 'Implicit differentiation handles equations that are not solved for $y$.',
  }));

  K.add('p-implicit', (d) => ({
    analogy: ['The centre circle is $x^2 + y^2 = r^2$: you cannot write $y$ alone as one function, but you can still find the slope at any point on it. Implicit differentiation differentiates both sides and treats $y$ as a function of $x$.', 'Every time you differentiate a $y$ term, you multiply by $\\dfrac{dy}{dx}$.'],
    why: 'Differentiate each term with respect to $x$, using the chain rule on $y$ terms, then solve for $\\dfrac{dy}{dx}$.',
    steps: [
      step(['A circle of radius 10 centred on the origin: $x^2 + y^2 = 100$.']),
      step(['Differentiate both sides with respect to $x$.'], '$2x + 2y\\dfrac{dy}{dx} = 0$'),
      step(['Solve for the gradient.'], '$\\dfrac{dy}{dx} = -' + fr('x', 'y') + '$'),
      step(['At the point $(6, 8)$ (which is on the circle: $36 + 64 = 100$).'], '$\\dfrac{dy}{dx} = -' + fr(6, 8) + ' = -0.75$'),
      step(['A product like $xy$ needs the product rule: $\\dfrac{d}{dx}(xy) = y + x\\dfrac{dy}{dx}$.']),
    ],
    ask: ask('A circle has the equation $x^2 + y^2 = 100$. Use implicit differentiation to find the gradient at $(6, 8)$.', -0.75, '', { tol: 0.001, worked: ['$\\dfrac{dy}{dx} = -x / y = -6/8 = -0.75$.'], apply: A.plan('defence', 'block', 'std', 'A circle has no flat side to attack: keep the defensive block standard') }),
    next: 'Parametric differentiation: the gradient of a path through time.',
  }));

  K.add('p-parametricdiff', (d) => ({
    analogy: ['A chip has $x = 20t$ and $y = 10t - 5t^2$. How steeply is the ball rising when $t = 0.5$ s? The gradient of the path is the vertical speed over the horizontal speed.', '$\\dfrac{dy}{dx} = \\dfrac{dy/dt}{dx/dt}$.'],
    why: 'For parametric curves, $\\dfrac{dy}{dx} = \\dfrac{dy/dt}{dx/dt}$.',
    steps: [
      step(['$x = 20t$ so $\\dfrac{dx}{dt} = 20$. $y = 10t - 5t^2$ so $\\dfrac{dy}{dt} = 10 - 10t$.']),
      step(['Divide.'], '$\\dfrac{dy}{dx} = ' + fr('10 - 10t', 20) + ' = ' + fr('1 - t', 2) + '$'),
      step(['At $t = 0.5$: $\\dfrac{dy}{dx} = 0.25$. The path rises at a slope of 0.25 (about 14°).']),
      step(['At $t = 1$ the gradient is 0: the top of the flight. At $t = 2$, $\\dfrac{dy}{dx} = -0.5$ as the ball comes down.']),
      step(['The launch angle comes from $t = 0$: $\\dfrac{dy}{dx} = 0.5$, so $\\tan^{-1}0.5 = 26.6°$.']),
    ],
    ask: ask('A chip has $x = 20t$ and $y = 10t - 5t^2$. Find $\\dfrac{dy}{dx}$ at $t = 0.5$.', 0.25, '', { tol: 0.001, worked: ['$(10 - 5) / 20 = 0.25$.'], apply: A.plan('build', 'keeper', 'std', 'A flat-flighted chip of slope 0.25 is hard to defend: keep the keeper\'s distribution standard') }),
    next: 'Connected rates of change link two quantities that both change with time.',
  }));

  K.add('p-connected', (d) => {
    const s = d.big, dm = demandOf(s), g = dm.a - 2 * dm.k * s.price;
    return {
      analogy: ['If the price is raised £1 each match, how fast is revenue changing? Two quantities change with time, and the chain rule connects them: $\\dfrac{dR}{dt} = \\dfrac{dR}{dp} \\times \\dfrac{dp}{dt}$.', 'This is the same chain rule as before, now read as speeds.'],
      why: 'Connected rates of change multiply: $\\dfrac{dR}{dt} = \\dfrac{dR}{dp}\\dfrac{dp}{dt}$.',
      steps: [
        step(['Model for ' + s.name + ': $\\dfrac{dR}{dp} = ' + m(dm.a) + ' - ' + m(2 * dm.k) + 'p$. At £' + s.price + ' this is ' + m(g) + '.'].concat(eg(d, 'crowds'))),
        step(['The club raises the price by £1 a match: $\\dfrac{dp}{dt} = 1$ pound per match.']),
        step(['Multiply.'], '$\\dfrac{dR}{dt} = ' + m(g) + ' \\times 1 = ' + m(g) + '$ pounds per match'),
        step(['So at today\'s price, each match the revenue changes by about £' + m(g) + ' because of the price rise alone.']),
        step(['A ball inflating: $V = \\tfrac{4}{3}\\pi r^3$ so $\\dfrac{dV}{dt} = 4\\pi r^2\\dfrac{dr}{dt}$. Same idea with volume and radius.']),
      ],
      ask: ask('For ' + s.name + ', $\\dfrac{dR}{dp} = ' + m(g) + '$ at today\'s price and the price is rising at £1 per match. What is $\\dfrac{dR}{dt}$ in pounds per match?', g, '£/match', { tol: 0.06, worked: [m(g) + ' x 1 = ' + m(g) + '.'], apply: A.price(d, 'big', 3) }),
      next: 'Integration is the reverse of differentiation. Powers of $x$ first.',
    };
  });

  K.add('p-intpowers', (d) => {
    const s = d.big, dm = demandOf(s), R = s.price * (dm.a - dm.k * s.price);
    return {
      analogy: ['Differentiating revenue gave the gradient, the extra pound from each extra £1 on the price. Integration goes the other way: from the rate back to the total. If you know the gradient $A - 2kp$, the revenue is its integral.', 'Add one to the power and divide by the new power.'],
      why: '$\\int x^n\\,dx = ' + fr('x^{n+1}', 'n + 1') + ' + c$, and the constant $c$ is fixed by a known point.',
      steps: [
        step(['The gradient of revenue is $\\dfrac{dR}{dp} = ' + m(dm.a) + ' - ' + m(2 * dm.k) + 'p$.']),
        step(['Integrate term by term.'], '$R = ' + m(dm.a) + 'p - ' + m(dm.k) + 'p^2 + c$'),
        step(['At a price of zero there is no revenue: $R(0) = 0$, so $c = 0$.']),
        step(['Check at today\'s price £' + s.price + ': $' + m(dm.a) + ' \\times ' + s.price + ' - ' + m(dm.k) + ' \\times ' + s.price + '^2 = ' + m(R) + '$, the revenue from ' + s.name + '.']),
        step(['Always add $+ c$ for an indefinite integral, and check by differentiating your answer.']),
      ],
      ask: ask('The gradient of revenue is $' + m(dm.a) + ' - ' + m(2 * dm.k) + 'p$ and $R = 0$ at $p = 0$. Integrate and evaluate the revenue at $p = ' + s.price + '$, to the nearest pound.', Math.round(R), '£', { tol: Math.max(2, R * 0.0006), worked: ['$R = ' + m(dm.a) + 'p - ' + m(dm.k) + 'p^2$.', 'At $p = ' + s.price + '$: ' + m(R) + '.'], apply: A.price(d, 'third', 4) }),
      next: 'Definite integrals give areas: the total between two limits.',
    };
  });

  K.add('p-intarea', (d) => {
    const fp = (d.fast && d.fast.ratings && d.fast.ratings.pace) || 80, a = 4.5, t = 3, dist = 0.5 * a * t * t;
    return {
      analogy: ['A winger accelerating at 4.5 m/s² has a speed $v = 4.5t$. The distance he covers in 3 seconds is the area under the speed-time graph. A definite integral computes it exactly.', 'The limits say where the area starts and ends.'],
      why: '$\\int_a^b f(x)\\,dx$ is the area under the curve between $a$ and $b$; evaluate the antiderivative at the top then the bottom and subtract.',
      steps: [
        step(['Speed $v = 4.5t$ for $0 \\le t \\le 3$.']),
        step(['Distance is the area under the graph.'], '$\\int_0^3 4.5t\\,dt$'),
        step(['Integrate.'], '$\\left[2.25t^2\\right]_0^3 = 2.25 \\times 9 - 0 = ' + m(dist) + '$'),
        step(['So he covers ' + m(dist) + ' m. A triangle with base 3 and height 13.5 has area $\\tfrac{1}{2} \\times 3 \\times 13.5 = 20.25$: the same.']),
        step(['Areas below the axis count as negative, so for a curve that crosses the axis split the integral at the crossing point.']),
      ],
      ask: ask('A winger\'s speed is $v = 4.5t$ m/s. Evaluate $\\int_0^3 4.5t\\,dt$ to find the distance covered in 3 seconds, in metres.', dist, 'm', { tol: 0.01, worked: ['$[2.25t^2]_0^3 = 20.25$.'], apply: fp >= 75 ? A.plan('build', 'tempo', 'fast', 'Your winger covers ' + m1(dist) + ' m in 3 s from rest: raise the build-up tempo so he is played into space') : A.plan('build', 'tempo', 'std', 'Keep the build-up tempo standard') }),
      next: 'Areas between curves: profit as the gap between revenue and cost.',
    };
  });

  K.add('p-intbetween', (d) => {
    const ans = (-Math.pow(15, 3) / 3 + 8 * 225 - 15 * 15) - (-1 / 3 + 8 - 15);
    return {
      analogy: ['Profit is revenue minus cost, and the total profit over a range of prices is the area between the two curves. Between the break-even prices 1 and 15 the revenue curve lies above the cost line, so the area between them is a measure of the whole profit zone.', 'Top curve minus bottom curve, then integrate.'],
      why: 'The area between two curves is $\\int_a^b (f(x) - g(x))\\,dx$ where $f \\ge g$.',
      steps: [
        step(['$R = 20p - p^2$ and $C = 4p + 15$ meet at $p = 1$ and $p = 15$.']),
        step(['Between them $R > C$. The gap is'], '$(20p - p^2) - (4p + 15) = -p^2 + 16p - 15$'),
        step(['Integrate from 1 to 15.'], '$\\left[-' + fr('p^3', 3) + ' + 8p^2 - 15p\\right]_1^{15}$'),
        step(['At 15: $-1125 + 1800 - 225 = 450$. At 1: $-0.333 + 8 - 15 = -7.333$.'], '$450 - (-7.333) = ' + m(ans) + '$'),
        step(['So the area (profit summed over all prices in the zone) is ' + m(ans) + ' units. Always check which curve is on top and where they cross.']),
      ],
      ask: ask('Find the area between $R = 20p - p^2$ and $C = 4p + 15$ from $p = 1$ to $p = 15$: $\\int_1^{15}(-p^2 + 16p - 15)\\,dp$, to 1 decimal place.', ans, '', { tol: 0.1, worked: ['$[-p^3/3 + 8p^2 - 15p]_1^{15} = 450 + 7.33 = ' + m1(ans) + '$.'], apply: A.price(d, 'big', 5) }),
      next: 'Integrating exponentials, $1/x$ and the trig functions.',
    };
  });

  K.add('p-inttrigexp', (d) => {
    const n0 = d.crowd, tot = n0 * (Math.exp(0.3) - 1) / 0.03 * 0.03;
    return {
      analogy: ['If the crowd grows at a rate of $0.03N_0e^{0.03t}$ fans per match, the total extra fans over 10 matches is the integral of that rate. $\\int e^{kx}dx = ' + fr('e^{kx}', 'k') + '$ and $\\int ' + fr(1, 'x') + 'dx = \\ln|x|$.', 'The sine and cosine integrate in a loop too.'],
      why: '$\\int e^{kx}dx = ' + fr('e^{kx}', 'k') + ' + c$, $\\int ' + fr(1, 'x') + 'dx = \\ln|x| + c$, $\\int\\sin x\\,dx = -\\cos x + c$, $\\int\\cos x\\,dx = \\sin x + c$.',
      steps: [
        step(['The rate of growth: $\\dfrac{dN}{dt} = 0.03N_0e^{0.03t}$ with $N_0 = ' + num(n0) + '$.'].concat(eg(d, 'crowds'))),
        step(['The total change over 10 matches is the definite integral.'], '$\\int_0^{10} 0.03N_0e^{0.03t}\\,dt = N_0\\left[e^{0.03t}\\right]_0^{10}$'),
        step(['Evaluate.'], '$' + num(n0) + '(e^{0.3} - 1) = ' + m(tot) + '$'),
        step(['So the crowd grows by about ' + num(tot) + ' fans in ten matches.']),
        step(['$\\int_0^{\\pi}\\sin x\\,dx = [-\\cos x]_0^{\\pi} = 1 + 1 = 2$: the area under one hump of a sine wave is exactly 2.']),
      ],
      ask: ask('A crowd of ' + num(n0) + ' grows continuously at 3% per match. By how many fans does it grow over 10 matches? Evaluate $' + num(n0) + '(e^{0.3} - 1)$ to the nearest fan.', Math.round(tot), 'fans', { tol: Math.max(2, tot * 0.001), worked: [num(n0) + ' x 0.34986 = ' + m(tot) + '.'], apply: A.marketing(d) }),
      next: 'Substitution is the reverse of the chain rule.',
    };
  });

  K.add('p-intsubst', (d) => ({
    analogy: ['The chain rule peels one function off another. Substitution undoes it: when an integrand contains a function and its derivative, replace the inner function by $u$ and the integral collapses. Analysts use it for compound growth inside compound growth.', 'Look for the inside and for its derivative sitting outside.'],
    why: 'In $\\int f(g(x))g\'(x)\\,dx$, let $u = g(x)$ and the integral becomes $\\int f(u)\\,du$.',
    steps: [
      step(['Evaluate $\\int_0^1 2x(x^2 + 1)^3\\,dx$.']),
      step(['Let $u = x^2 + 1$. Then $du = 2x\\,dx$, which is exactly what is outside the bracket.']),
      step(['Change the limits: $x = 0$ gives $u = 1$ and $x = 1$ gives $u = 2$.'], '$\\int_1^2 u^3\\,du$'),
      step(['Integrate.'], '$\\left[' + fr('u^4', 4) + '\\right]_1^2 = ' + fr(16, 4) + ' - ' + fr(1, 4) + ' = 3.75$'),
      step(['Check by differentiating the antiderivative $' + fr('(x^2 + 1)^4', 4) + '$: the chain rule gives $2x(x^2 + 1)^3$. Good.']),
    ],
    ask: ask('Use $u = x^2 + 1$ to evaluate $\\int_0^1 2x(x^2 + 1)^3\\,dx$.', 3.75, '', { tol: 0.005, worked: ['$[u^4/4]_1^2 = 4 - 0.25 = 3.75$.'], apply: A.price(d, 'second', 4) }),
    next: 'Integration by parts is the reverse of the product rule.',
  }));

  K.add('p-intparts', (d) => ({
    analogy: ['When income grows with time AND the rate itself grows, you get a product of $t$ and $e^t$. The product rule has a reverse, integration by parts, which handles integrals of products.', '$\\int u\\,dv = uv - \\int v\\,du$.'],
    why: 'Integration by parts: $\\int u\\,\\dfrac{dv}{dx}\\,dx = uv - \\int v\\,\\dfrac{du}{dx}\\,dx$; choose $u$ to be the function that gets simpler when differentiated.',
    steps: [
      step(['Evaluate $\\int_0^1 xe^x\\,dx$. Let $u = x$ (it simplifies) and $\\dfrac{dv}{dx} = e^x$.']),
      step(['Then $\\dfrac{du}{dx} = 1$ and $v = e^x$.']),
      step(['Apply the formula.'], '$\\int xe^x\\,dx = xe^x - \\int e^x\\,dx = xe^x - e^x$'),
      step(['Evaluate from 0 to 1.'], '$\\left[xe^x - e^x\\right]_0^1 = (e - e) - (0 - 1) = 1$'),
      step(['For $\\int\\ln x\\,dx$ take $u = \\ln x$ and $\\dfrac{dv}{dx} = 1$, giving $x\\ln x - x$. The rule LATE (Log, Algebra, Trig, Exponential) helps you choose $u$.']),
    ],
    ask: ask('Use integration by parts to evaluate $\\int_0^1 xe^x\\,dx$.', 1, '', { tol: 0.005, worked: ['$[xe^x - e^x]_0^1 = 0 - (-1) = 1$.'], apply: A.price(d, 'fourth', 4) }),
    next: 'Partial fractions make hard fractions integrable.',
  }));

  K.add('p-intpartfrac', (d) => {
    const v = 5 * Math.log(4 / 3);
    return {
      analogy: ['Splitting a share between two partners gives a fraction with two factors in the denominator. You cannot integrate it directly, but split into partial fractions each part is just a logarithm.', 'Earlier you found $' + fr(5, '(x + 1)(x + 2)') + ' = ' + fr(5, 'x + 1') + ' - ' + fr(5, 'x + 2') + '$.'],
      why: 'Write the fraction in partial fractions, then each part integrates to a logarithm: $\\int ' + fr('a', 'x + b') + ' dx = a\\ln|x + b| + c$.',
      steps: [
        step(['Evaluate $\\int_0^1 ' + fr(5, '(x + 1)(x + 2)') + '\\,dx$.']),
        step(['Split.'], '$\\int_0^1 \\left(' + fr(5, 'x + 1') + ' - ' + fr(5, 'x + 2') + '\\right)dx$'),
        step(['Integrate each.'], '$\\left[5\\ln(x + 1) - 5\\ln(x + 2)\\right]_0^1$'),
        step(['Combine logs: $5\\ln' + fr('x + 1', 'x + 2') + '$. At 1: $5\\ln ' + fr(2, 3) + '$. At 0: $5\\ln ' + fr(1, 2) + '$.'], '$5\\ln ' + fr(2, 3) + ' - 5\\ln ' + fr(1, 2) + ' = 5\\ln ' + fr(4, 3) + ' = ' + m3(v) + '$'),
        step(['Check numerically: $5 \\times 0.2877 = 1.438$. Good.']),
      ],
      ask: ask('Evaluate $\\int_0^1 ' + fr(5, '(x + 1)(x + 2)') + '\\,dx = 5\\ln ' + fr(4, 3) + '$, to 3 decimal places.', v, '', { tol: 0.002, worked: ['$5 \\ln(1.3333) = 5 \\times 0.28768 = ' + m3(v) + '$.'], apply: A.price(d, 'emptiest', 4) }),
      next: 'Differential equations: where the rate depends on the thing itself.',
    };
  });

  K.add('p-diffeq', (d) => {
    const n0 = d.crowd, v = n0 * Math.exp(0.3);
    return {
      analogy: ['"The crowd grows at 3% of its current size per match" is an equation that links a quantity to its own rate: $\\dfrac{dN}{dt} = 0.03N$. Solving it gives the crowd at any time. This is the first differential equation, and it describes growth, decay and cooling.', 'Separate the variables and integrate both sides.'],
      why: 'A first-order separable equation $\\dfrac{dy}{dx} = f(x)g(y)$ is solved by writing $\\int ' + fr(1, 'g(y)') + 'dy = \\int f(x)dx$.',
      steps: [
        step(['$\\dfrac{dN}{dt} = 0.03N$ with $N = ' + num(n0) + '$ at $t = 0$.'].concat(eg(d, 'crowds'))),
        step(['Separate the variables.'], '$' + fr(1, 'N') + ' dN = 0.03\\,dt$'),
        step(['Integrate both sides.'], '$\\ln N = 0.03t + c$'),
        step(['Undo the log: $N = Ae^{0.03t}$. At $t = 0$, $N = ' + num(n0) + '$, so $A = ' + num(n0) + '$.'], '$N = ' + num(n0) + 'e^{0.03t}$'),
        step(['After 10 matches: $N = ' + num(n0) + 'e^{0.3} = ' + m(v) + '$.']),
      ],
      ask: ask('A crowd satisfies $\\dfrac{dN}{dt} = 0.03N$ with $N = ' + num(n0) + '$ at $t = 0$. What is the crowd at $t = 10$, to the nearest fan?', Math.round(v), 'fans', { tol: Math.max(2, v * 0.001), worked: ['$N = ' + num(n0) + 'e^{0.03 \\times 10} = ' + m(v) + '$.'], apply: A.marketing(d) }),
      next: 'The trapezium rule estimates integrals when you cannot do them exactly.',
    };
  });

  K.add('p-trapezium', (d) => {
    const y = d.crowdSeries.concat(d.crowdSeries).slice(0, 5), est = 0.5 * 1 * (y[0] + 2 * (y[1] + y[2] + y[3]) + y[4]);
    return {
      analogy: ['You have five crowd figures and want the total area under their graph: roughly the total attendance-matches. There is no formula for the curve, but you can cut the area into trapeziums and add them.', 'More strips, better estimate.'],
      why: 'The trapezium rule: $\\int_a^b y\\,dx \\approx \\tfrac{1}{2}h\\left[y_0 + 2(y_1 + \\cdots + y_{n-1}) + y_n\\right]$.',
      steps: [
        step(['Five home crowds: ' + y.map(num).join(', ') + ', one per match, so $h = 1$ and $n = 4$ strips.'].concat(eg(d, 'series'))),
        step(['The ends count once, the middle values twice.'], '$\\tfrac{1}{2}(1)[' + y[0] + ' + 2(' + y[1] + ' + ' + y[2] + ' + ' + y[3] + ') + ' + y[4] + ']$'),
        step(['Evaluate.'], '$= ' + m(est) + '$'),
        step(['If the curve is concave (bends down) the trapeziums sit under it, so the estimate is an underestimate; convex gives an overestimate.']),
        step(['Doubling the number of strips roughly quarters the error.']),
      ],
      ask: ask('Use the trapezium rule with $h = 1$ on the crowds ' + y.map(num).join(', ') + '. What is the estimate of the area?', est, '', { tol: 1, worked: ['$\\tfrac{1}{2}[' + y[0] + ' + 2(' + y[1] + ' + ' + y[2] + ' + ' + y[3] + ') + ' + y[4] + '] = ' + m(est) + '$.'], apply: A.marketing(d) }),
      next: 'Numerical methods: locating roots by a change of sign.',
    };
  });

  K.add('p-roots', (d) => ({
    analogy: ['Some equations cannot be solved with algebra. To find a break-even price you can still bracket it: find two prices where profit changes sign and the break-even lies between.', 'A continuous function that changes sign crosses zero in between.'],
    why: 'If $f$ is continuous and $f(a)$ and $f(b)$ have opposite signs, there is a root between $a$ and $b$.',
    steps: [
      step(['Let $f(x) = x^3 - 3x - 1$. Find a root.']),
      step(['$f(1) = 1 - 3 - 1 = -3$ (negative) and $f(2) = 8 - 6 - 1 = 1$ (positive).']),
      step(['The sign changes between 1 and 2, so there is a root in $[1, 2]$.']),
      step(['Halve the interval: $f(1.5) = 3.375 - 4.5 - 1 = -2.125$ (negative), so the root is in $[1.5, 2]$.'], '$f(1.5) = -2.125$'),
      step(['Keep halving to narrow it. (A function with an asymptote can change sign without a root, like $' + fr(1, 'x') + '$ across 0.)']),
    ],
    ask: ask('For $f(x) = x^3 - 3x - 1$ find $f(1.5)$.', -2.125, '', { tol: 0.001, worked: ['$3.375 - 4.5 - 1 = -2.125$.'], apply: A.price(d, 'third', 4) }),
    next: 'Iteration homes in on a root with a repeated rule.',
  }));

  K.add('p-iterate', (d) => {
    const x1 = Math.cbrt(3 * 2 + 1), x2 = Math.cbrt(3 * x1 + 1);
    return {
      analogy: ['Take a guess at the break-even price, apply a rule to improve it, and repeat. If each step gets closer, the sequence converges to the answer. That is iteration, and it is how every optimiser in the game works.', 'Rearrange the equation as $x = g(x)$.'],
      why: 'Iteration $x_{n+1} = g(x_n)$ can converge to a root of $x = g(x)$; start close and it often settles in a few steps.',
      steps: [
        step(['Rearrange $x^3 - 3x - 1 = 0$ as $x^3 = 3x + 1$, so $x = \\sqrt[3]{3x + 1}$.']),
        step(['Iterate $x_{n+1} = \\sqrt[3]{3x_n + 1}$ from $x_0 = 2$.'], '$x_1 = \\sqrt[3]{7} = ' + m3(x1) + '$'),
        step(['Again.'], '$x_2 = \\sqrt[3]{3(' + m3(x1) + ') + 1} = ' + m3(x2) + '$'),
        step(['The values 2, ' + m3(x1) + ', ' + m3(x2) + ' are closing in on 1.879, the root. Draw a cobweb or staircase diagram to see why.']),
        step(['It converges when the gradient of $g$ at the root is between $-1$ and $1$; a different rearrangement may diverge.']),
      ],
      ask: ask('Iterate $x_{n+1} = \\sqrt[3]{3x_n + 1}$ starting from $x_0 = 2$. What is $x_2$, to 3 decimal places?', x2, '', { tol: 0.002, worked: ['$x_1 = \\sqrt[3]{7} = ' + m3(x1) + '$.', '$x_2 = \\sqrt[3]{' + m3(3 * x1 + 1) + '} = ' + m3(x2) + '$.'], apply: A.price(d, 'second', 4) }),
      next: 'Newton-Raphson converges much faster, using the gradient.',
    };
  });

  K.add('p-newton', (d) => {
    const x1 = 2 - 1 / 9;
    return {
      analogy: ['Newton-Raphson uses the tangent: from a guess, draw the tangent to the curve and see where it hits zero; that is a better guess. Because it uses the gradient it homes in far faster than plain iteration, which is why it is the default in pricing and optimisation tools.', 'It can fail if the gradient is near zero.'],
      why: '$x_{n+1} = x_n - ' + fr('f(x_n)', 'f\'(x_n)') + '$ uses the tangent at $x_n$ to find a closer root.',
      steps: [
        step(['For $f(x) = x^3 - 3x - 1$, $f\'(x) = 3x^2 - 3$. Start at $x_0 = 2$.']),
        step(['$f(2) = 1$ and $f\'(2) = 9$.']),
        step(['Apply the formula.'], '$x_1 = 2 - ' + fr(1, 9) + ' = ' + m3(x1) + '$'),
        step(['Again: $f(' + m3(x1) + ') = ' + m3(Math.pow(x1, 3) - 3 * x1 - 1) + '$, $f\' = ' + m3(3 * x1 * x1 - 3) + '$.'], '$x_2 = ' + m3(x1 - (Math.pow(x1, 3) - 3 * x1 - 1) / (3 * x1 * x1 - 3)) + '$'),
        step(['After two steps it already agrees with the root 1.8794 to three places: roughly doubling the number of correct digits each time.']),
      ],
      ask: ask('Use Newton-Raphson on $f(x) = x^3 - 3x - 1$ with $x_0 = 2$. What is $x_1$, to 3 decimal places?', x1, '', { tol: 0.002, worked: ['$2 - 1/9 = 1.889$.'], apply: A.price(d, 'big', 4) }),
      next: 'Vectors: quantities with a direction.',
    };
  });

  K.add('p-vec2d', (d) => {
    const vf = (d.fast && d.fast.ratings && d.fast.ratings.pace) || 80, v = [6, 2.5], mag = Math.hypot(v[0], v[1]);
    return {
      analogy: ['A winger runs at 6 m/s along the pitch while drifting 2.5 m/s toward the touchline. His velocity is a vector with two components, and his actual speed is its length.', 'Vectors add and scale; position vectors locate a point from the origin.'],
      why: 'A 2D vector $\\mathbf{v} = a\\mathbf{i} + b\\mathbf{j}$ has magnitude $\\sqrt{a^2 + b^2}$ and direction $\\tan^{-1}(b/a)$.',
      steps: [
        step(['$\\mathbf{v} = 6\\mathbf{i} + 2.5\\mathbf{j}$ metres per second.']),
        step(['Magnitude (speed).'], '$|\\mathbf{v}| = \\sqrt{6^2 + 2.5^2} = \\sqrt{42.25} = ' + m(mag) + '$ m/s'),
        step(['Direction: $\\tan^{-1}(2.5 / 6) = ' + m1(Math.atan(2.5 / 6) * 180 / PI) + '°$ from the $\\mathbf{i}$ direction.']),
        step(['Add vectors by adding components. If a defender runs at $-4\\mathbf{i} + 3\\mathbf{j}$ the closing velocity is the difference of the two.']),
        step(['A unit vector has magnitude 1: $' + fr(1, '|\\mathbf{v}|') + '\\mathbf{v}$ points the same way with length one.']),
      ],
      ask: ask('A winger\'s velocity is $6\\mathbf{i} + 2.5\\mathbf{j}$ m/s. What is his speed in m/s?', mag, 'm/s', { tol: 0.01, worked: ['$\\sqrt{36 + 6.25} = 6.5$.'], apply: vf >= 78 ? A.plan('transAtt', 'outlet', 'wing', 'Your winger has real pace: make him the first outlet after winning the ball') : A.plan('transAtt', 'outlet', 'std', 'No standout pace: keep the first outlet standard') }),
      next: 'Three dimensions add a height: the flight of a lofted ball.',
    };
  });

  K.add('p-vec3d', (d) => {
    const v = [20, 5, 3], mag = Math.sqrt(400 + 25 + 9);
    return {
      analogy: ['A lofted pass has a component along the pitch, one across it, and one up: $20\\mathbf{i} + 5\\mathbf{j} + 3\\mathbf{k}$ m/s. The speed of the ball is the length of that vector in three dimensions.', 'The same rules as 2D, with one more component.'],
      why: 'In 3D, $|\\mathbf{v}| = \\sqrt{a^2 + b^2 + c^2}$ and vectors add component by component.',
      steps: [
        step(['A lofted ball leaves at $\\mathbf{v} = 20\\mathbf{i} + 5\\mathbf{j} + 3\\mathbf{k}$ m/s.']),
        step(['Magnitude.'], '$|\\mathbf{v}| = \\sqrt{20^2 + 5^2 + 3^2} = \\sqrt{' + (400 + 25 + 9) + '} = ' + m(mag) + '$ m/s'),
        step(['The horizontal speed is $\\sqrt{20^2 + 5^2} = ' + m(Math.hypot(20, 5)) + '$, and the angle above the ground is $\\tan^{-1}(3 / ' + m(Math.hypot(20, 5)) + ') = ' + m1(Math.atan(3 / Math.hypot(20, 5)) * 180 / PI) + '°$.']),
        step(['Position vectors give the displacement between two points: from $A(10, 10, 0)$ to $B(30, 15, 2)$ it is $\\mathbf{AB} = 20\\mathbf{i} + 5\\mathbf{j} + 2\\mathbf{k}$.']),
        step(['Two vectors are parallel if one is a multiple of the other.']),
      ],
      ask: ask('A ball leaves at $20\\mathbf{i} + 5\\mathbf{j} + 3\\mathbf{k}$ m/s. What is its speed, in m/s to 1 decimal place?', mag, 'm/s', { tol: 0.06, worked: ['$\\sqrt{434} = ' + m1(mag) + '$.'], apply: A.plan('midfield', 'through', 'ambitious', 'A lofted pass at ' + m1(mag) + ' m/s beats a press: set the midfield to attempt ambitious balls') }),
      next: 'Vectors in geometry: dividing a line and finding where paths meet.',
    };
  });

  K.add('p-vecgeom', (d) => ({
    analogy: ['Where should a midfielder stand to be three-quarters of the way along the line between two team-mates? Position vectors answer it, and also tell you whether two runs will meet.', 'The point dividing $AB$ in the ratio $\\lambda : 1 - \\lambda$ is $\\mathbf{a} + \\lambda(\\mathbf{b} - \\mathbf{a})$.'],
    why: 'Position vectors let you find points on a line, the midpoint, and whether two paths meet.',
    steps: [
      step(['Two players: $A$ at $\\mathbf{a} = 10\\mathbf{i} + 10\\mathbf{j}$ and $B$ at $\\mathbf{b} = 50\\mathbf{i} + 30\\mathbf{j}$ (metres).']),
      step(['The vector from $A$ to $B$.'], '$\\mathbf{AB} = \\mathbf{b} - \\mathbf{a} = 40\\mathbf{i} + 20\\mathbf{j}$'),
      step(['The midpoint is $\\mathbf{a} + ' + fr(1, 2) + '\\mathbf{AB} = 30\\mathbf{i} + 20\\mathbf{j}$.']),
      step(['Three-quarters of the way.'], '$\\mathbf{a} + \\tfrac{3}{4}\\mathbf{AB} = (10 + 30)\\mathbf{i} + (10 + 15)\\mathbf{j} = 40\\mathbf{i} + 25\\mathbf{j}$'),
      step(['To test whether two moving players meet, write each position as $\\mathbf{r} = \\mathbf{p} + t\\mathbf{v}$ and see if some $t$ gives the same point for both.']),
    ],
    ask: ask('$A$ is at $10\\mathbf{i} + 10\\mathbf{j}$ and $B$ at $50\\mathbf{i} + 30\\mathbf{j}$. The point three-quarters of the way from $A$ to $B$ has $\\mathbf{i}$ component:', 40, 'm', { tol: 0, worked: ['$10 + 0.75 \\times 40 = 40$.'], apply: A.plan('midfield', 'overload', 'std', 'Positions are points on lines between players: keep the team balanced without an overload') }),
    next: 'That completes the Pure strand. The next point in the schedule continues with Statistics and Mechanics.',
  }));
})();
