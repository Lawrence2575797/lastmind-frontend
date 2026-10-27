// A-level Statistics and Mechanics lessons (Edexcel 9MA0), the points not yet covered.
(function () {
  const K = window.FM && window.FM.K; if (!K) return;
  const { m, m1, m3, fr, sum, mean, eg, A, ask, step, gbp, num } = K;
  const PI = Math.PI, G = 9.8;
  const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
  const phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
  const sd = (a) => { const mu = mean(a); return Math.sqrt(mean(a.map((x) => (x - mu) * (x - mu)))); };
  const quart = (a) => { const s = a.slice().sort((x, y) => x - y), n = s.length, med = (b) => (b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2); return { q1: med(s.slice(0, Math.floor(n / 2))), q3: med(s.slice(Math.ceil(n / 2))), med: med(s) }; };
  const corr = (x, y) => { const mx = mean(x), my = mean(y); let sxy = 0, sxx = 0, syy = 0; x.forEach((v, i) => { sxy += (v - mx) * (y[i] - my); sxx += (v - mx) * (v - mx); syy += (y[i] - my) * (y[i] - my); }); return { r: sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0, b: sxx ? sxy / sxx : 0, mx, my }; };

  K.add('s-sample', (d) => {
    const cap = d.capacity, n = 100, big = d.big, k = Math.round(n * big.seats / cap);
    return {
      analogy: ['The board wants the views of the ' + num(cap) + ' people the ground holds. Asking all is impossible, so you take a sample. How you choose the sample decides whether the answer can be trusted.', 'Random, stratified, systematic, quota and opportunity samples each have a use and a weakness.'],
      why: 'A good sample represents the population: random and stratified samples reduce bias, convenience samples do not.',
      steps: [
        step(['Population: everyone in the ground, ' + num(cap) + ' seats in four stands.']),
        step(['Simple random: every fan has an equal chance, such as drawing seat numbers at random. Fair, but you may miss a small stand.']),
        step(['Stratified: split by stand and sample from each in proportion. ' + big.name + ' holds ' + num(big.seats) + ' of ' + num(cap) + ' seats, so in a sample of ' + n + ' it gets'], '$' + n + ' \\times ' + fr(big.seats, cap) + ' = ' + m(n * big.seats / cap) + '$'),
        step(['Systematic: every 40th fan through the turnstile. Quick, and fair if there is no pattern in the queue.']),
        step(['Opportunity or quota samples (ask whoever is nearby) are quick but can be badly biased, such as only asking people at the club shop.']),
      ],
      ask: ask('A stratified sample of ' + n + ' fans is taken from a ground of ' + num(cap) + ' seats. ' + big.name + ' has ' + num(big.seats) + ' seats. How many of the ' + n + ' should come from ' + big.name + '? Round to the nearest whole fan.', k, 'fans', { tol: 0.6, worked: [n + ' x ' + big.seats + ' / ' + cap + ' = ' + m(n * big.seats / cap) + '.'], apply: A.price(d, 'emptiest', 4) }),
      next: 'Once you have data, present it and spot the outliers.',
    };
  });

  K.add('s-data', (d) => {
    const cs = d.crowdSeries, q = quart(cs), iqr = q.q3 - q.q1, hi = q.q3 + 1.5 * iqr, lo = q.q1 - 1.5 * iqr;
    return {
      analogy: ['A crowd of 20,000 on a day when it is normally 8,000 is probably a data error or a special event. Analysts use a rule to flag such outliers before they distort the average.', 'The usual rule: a value more than 1.5 interquartile ranges beyond a quartile is an outlier.'],
      why: 'An outlier lies outside $Q_1 - 1.5\\times IQR$ or $Q_3 + 1.5\\times IQR$; a box plot shows them as separate points.',
      steps: [
        step(['Home crowds: ' + cs.map(num).join(', ') + '.'].concat(eg(d, 'series'))),
        step(['Quartiles: $Q_1 = ' + m(q.q1) + '$ and $Q_3 = ' + m(q.q3) + '$, so the IQR is'], '$' + m(q.q3) + ' - ' + m(q.q1) + ' = ' + m(iqr) + '$'),
        step(['Upper fence.'], '$Q_3 + 1.5 \\times IQR = ' + m(q.q3) + ' + ' + m(1.5 * iqr) + ' = ' + m(hi) + '$'),
        step(['Lower fence: $' + m(lo) + '$. A crowd above ' + num(hi) + ' or below ' + num(lo) + ' would be an outlier.']),
        step(['Large data sets in the specification (like the weather data) are used the same way: clean the outliers before you summarise.']),
      ],
      ask: ask('Home crowds have $Q_1 = ' + m(q.q1) + '$ and $Q_3 = ' + m(q.q3) + '$. Using the rule "outlier if above $Q_3 + 1.5\\times IQR$", what is the upper fence?', hi, 'fans', { tol: 0.6, worked: ['IQR = ' + m(iqr) + '.', m(q.q3) + ' + ' + m(1.5 * iqr) + ' = ' + m(hi) + '.'], apply: A.marketing(d) }),
      next: 'Correlation and regression: how two quantities move together.',
    };
  });

  K.add('s-corr', (d) => {
    const n = Math.min(d.shots.length, d.goals.length), x = d.shots.slice(0, n), y = d.goals.slice(0, n), c = corr(x, y);
    return {
      analogy: ['Do more shots mean more goals? Correlation puts a number on how closely two things move together, from $-1$ (opposite) through 0 (unrelated) to $+1$ (perfect), and the regression line predicts one from the other.', 'Correlation is not causation: shots and goals move together because good teams take shots.'],
      why: 'The product moment correlation coefficient $r$ measures linear association; the regression line $y = a + bx$ predicts $y$ from $x$.',
      steps: [
        step(['Shots: ' + x.join(', ') + '. Goals: ' + y.join(', ') + '.'].concat(eg(d, 'stats'))),
        step(['Means: shots ' + m(c.mx) + ', goals ' + m(c.my) + '. The line of best fit passes through the mean point.']),
        step(['Regression gradient: $b = ' + fr('S_{xy}', 'S_{xx}') + ' = ' + m3(c.b) + '$, so each extra shot is worth about ' + m3(c.b) + ' goals.']),
        step(['The correlation is $r = ' + m3(c.r) + '$: ' + (Math.abs(c.r) > 0.7 ? 'strong' : Math.abs(c.r) > 0.4 ? 'moderate' : 'weak') + ' ' + (c.r >= 0 ? 'positive' : 'negative') + '.']),
        step(['Predicting inside the range of the data (interpolation) is reliable; going far outside it (extrapolation) is not.']),
      ],
      ask: ask('Work out the correlation coefficient $r$ between your shots (' + x.join(', ') + ') and goals (' + y.join(', ') + '), to 2 decimal places.', c.r, '', { tol: 0.02, worked: ['$r = S_{xy} / \\sqrt{S_{xx}S_{yy}} = ' + m3(c.r) + '$.'], apply: c.r > 0.5 ? A.plan('final', 'shooting', 'sight', 'Shots and goals are strongly linked (r = ' + m(c.r) + '): shoot on sight and let the volume work') : A.plan('final', 'shooting', 'patient', 'Shots and goals are only weakly linked (r = ' + m(c.r) + '): be patient and shoot from better places') }),
      next: 'Probability with sets, Venn diagrams and trees.',
    };
  });

  K.add('s-prob', (d) => {
    const R = d.results, n = R.length, w = R.filter((r) => r.gf > r.ga).length, cs = R.filter((r) => r.ga === 0).length, both = R.filter((r) => r.gf > r.ga && r.ga === 0).length, pe = (w + cs - both) / n;
    return {
      analogy: ['Out of your ' + n + ' matches, ' + w + ' were wins and ' + cs + ' were clean sheets, and ' + both + ' were both. A Venn diagram holds that picture, and the addition rule counts the matches that were at least one of them.', 'Sets, Venn diagrams and tree diagrams are three ways to see the same probabilities.'],
      why: '$P(A \\cup B) = P(A) + P(B) - P(A \\cap B)$: add, then take off the overlap you counted twice.',
      steps: [
        step(['Let $W$ be "won" and $C$ be "clean sheet" over ' + n + ' matches.'].concat(eg(d, 'results')), ['$P(W) = ' + fr(w, n) + ' = ' + m3(w / n) + '$', '$P(C) = ' + fr(cs, n) + ' = ' + m3(cs / n) + '$', '$P(W \\cap C) = ' + fr(both, n) + ' = ' + m3(both / n) + '$']),
        step(['In the Venn diagram the overlap is counted in both circles, so add the two probabilities and subtract the overlap once.']),
        step(['$P(W \\cup C) = ' + m3(w / n) + ' + ' + m3(cs / n) + ' - ' + m3(both / n) + ' = ' + m3(pe) + '$.']),
        step(['The complement: $P(\\text{neither}) = 1 - ' + m3(pe) + ' = ' + m3(1 - pe) + '$.']),
        step(['Mutually exclusive events cannot happen together ($P(A \\cap B) = 0$), so the overlap term vanishes.']),
      ],
      ask: ask('In ' + n + ' matches you won ' + w + ', kept ' + cs + ' clean sheets, and ' + both + ' matches were both. What is the probability that a match was a win or a clean sheet (or both), to 2 decimal places?', pe, '', { tol: 0.011, worked: ['(' + w + ' + ' + cs + ' - ' + both + ') / ' + n + ' = ' + m3(pe) + '.'], apply: mean(d.conceded) > 1.4 ? A.plan('defence', 'block', 'low', 'You concede ' + m1(mean(d.conceded)) + ' a match: drop the defensive block deeper') : A.plan('defence', 'block', 'std', 'You concede ' + m1(mean(d.conceded)) + ' a match: keep the defensive block standard') }),
      next: 'Conditional probability: the chance of one thing given another.',
    };
  });

  K.add('s-cond', (d) => {
    const R = d.results, n = R.length, cs = R.filter((r) => r.ga === 0).length, both = R.filter((r) => r.gf > r.ga && r.ga === 0).length, p = cs ? both / cs : 0;
    return {
      analogy: ['Given that you kept a clean sheet, how likely was the win? A clean sheet makes a win more likely, and that changed likelihood is a conditional probability: $P(W \\mid C)$.', 'Restrict to the matches where the condition holds, then ask what fraction have the other event.'],
      why: '$P(A \\mid B) = ' + fr('P(A \\cap B)', 'P(B)') + '$: the overlap as a fraction of the condition.',
      steps: [
        step(['Of ' + n + ' matches, ' + cs + ' were clean sheets and ' + both + ' of those were also wins.'].concat(eg(d, 'results'))),
        step(['Restrict to the clean sheets: that is the new sample space.']),
        step(['$P(W \\mid C)$ is the fraction of those that were wins.'], '$P(W \\mid C) = ' + fr(both, cs || 1) + ' = ' + m3(p) + '$'),
        step(['The formula agrees: $' + fr(both + '/' + n, cs + '/' + n) + ' = ' + m3(p) + '$.']),
        step(['If $P(A \\mid B) = P(A)$ the events are independent: knowing $B$ tells you nothing about $A$.']),
      ],
      ask: ask('You kept ' + cs + ' clean sheets in ' + n + ' matches, and ' + both + ' of them were also wins. What is $P(\\text{win} \\mid \\text{clean sheet})$, to 2 decimal places?', p, '', { tol: 0.011, worked: [both + ' / ' + (cs || 1) + ' = ' + m3(p) + '.'], apply: p > 0.7 ? A.plan('defence', 'tackle', 'stay', 'A clean sheet nearly guarantees a win for you: defend without risk and stay on your feet') : A.plan('defence', 'tackle', 'std', 'Clean sheets do not always bring wins: keep tackling standard') }),
      next: 'Independent events and mutually exclusive events: not the same thing.',
    };
  });

  K.add('s-indep', (d) => {
    const R = d.results, n = R.length, w = R.filter((r) => r.gf > r.ga).length / n, cs = R.filter((r) => r.ga === 0).length / n, both = R.filter((r) => r.gf > r.ga && r.ga === 0).length / n;
    return {
      analogy: ['If winning and keeping a clean sheet were independent, the chance of both would be the product of the two chances. Compare that with what actually happened to see how closely they are tied.', 'Mutually exclusive events cannot both happen; independent events do not affect each other. They are different ideas.'],
      why: 'Events $A$ and $B$ are independent if $P(A \\cap B) = P(A) \\times P(B)$; mutually exclusive means $P(A \\cap B) = 0$.',
      steps: [
        step(['$P(W) = ' + m3(w) + '$, $P(C) = ' + m3(cs) + '$, and $P(W \\cap C) = ' + m3(both) + '$.'].concat(eg(d, 'results'))),
        step(['If they were independent.'], '$P(W) \\times P(C) = ' + m3(w) + ' \\times ' + m3(cs) + ' = ' + m3(w * cs) + '$'),
        step(['The actual figure is ' + m3(both) + (both > w * cs ? ', higher: wins and clean sheets go together' : ', not higher: no sign they go together') + '.']),
        step(['So they are ' + (Math.abs(both - w * cs) < 0.03 ? 'close to independent' : 'not independent') + ' in your data.']),
        step(['Mutually exclusive example: "win" and "lose" in the same match: $P(W \\cap L) = 0$. Mutually exclusive events with non-zero probability can never be independent.']),
      ],
      ask: ask('If winning ($P = ' + m3(w) + '$) and a clean sheet ($P = ' + m3(cs) + '$) were independent, what would $P(W \\cap C)$ be, to 3 decimal places?', w * cs, '', { tol: 0.002, worked: [m3(w) + ' x ' + m3(cs) + ' = ' + m3(w * cs) + '.'], apply: A.plan('transDef', 'recover', both > w * cs ? 'track' : 'std', both > w * cs ? 'Clean sheets and wins go together: make defenders track back' : 'Wins and clean sheets look independent: keep the recovery runs as they are') }),
      next: 'Back to the normal distribution: finding values from probabilities.',
    };
  });

  K.add('s-normalinv', (d) => {
    const cs = d.crowdSeries, mu = mean(cs), s = sd(cs) || 1, v = mu + 1.2816 * s;
    return {
      analogy: ['The board asks: "on how large a crowd should we plan so that we are only exceeded one match in ten?" That is the reverse of finding a probability: you know the probability and want the value. It uses the inverse normal.', 'z for the top 10% is 1.2816.'],
      why: 'To find $x$ with $P(X < x) = p$: find $z$ for that probability, then $x = \\mu + z\\sigma$.',
      steps: [
        step(['Crowds: mean $\\mu = ' + m(mu) + '$, standard deviation $\\sigma = ' + m(s) + '$.'].concat(eg(d, 'series'))),
        step(['We want the crowd exceeded only 10% of the time, so $P(X < x) = 0.9$.']),
        step(['The standard normal table (inverse) gives $z = 1.2816$ for 0.9.']),
        step(['Convert back.'], '$x = \\mu + z\\sigma = ' + m(mu) + ' + 1.2816 \\times ' + m(s) + ' = ' + m(v) + '$'),
        step(['So plan for ' + num(v) + ': one match in ten will be bigger. For unknown $\\mu$ or $\\sigma$, use two known probabilities to build two equations and solve.']),
      ],
      ask: ask('Crowds are modelled as $N(' + m(mu) + ',\\ ' + m(s) + '^2)$. Find the crowd that is exceeded 10% of the time (the 90th percentile; $z = 1.2816$), to the nearest fan.', Math.round(v), 'fans', { tol: 2, worked: [m(mu) + ' + 1.2816 x ' + m(s) + ' = ' + m(v) + '.'], apply: v > d.capacity * 0.95 ? A.price(d, 'big', 4) : A.marketing(d) }),
      next: 'The binomial distribution can be approximated by the normal.',
    };
  });

  K.add('s-normbinom', (d) => {
    const n = 40, p = 0.11, mu = n * p, v = n * p * (1 - p), z = (4.5 - mu) / Math.sqrt(v), pr = 1 - phi(z);
    return {
      analogy: ['Over forty shots, each with an 11% chance of scoring, how many goals should you expect, and how likely are five or more? With many trials the binomial is heavy to calculate, but its shape is close to a normal curve.', 'Use the continuity correction: count 5 or more as above 4.5.'],
      why: 'For large $n$, $B(n, p)$ is approximately $N(np,\\ np(1 - p))$, with a continuity correction of $\\pm 0.5$.',
      steps: [
        step(['$X \\sim B(40, 0.11)$: forty shots, each a 0.11 chance.']),
        step(['Mean $np = ' + m(mu) + '$ and variance $np(1 - p) = ' + m(v) + '$.']),
        step(['Approximate by $N(' + m(mu) + ',\\ ' + m(v) + ')$.']),
        step(['$P(X \\ge 5)$ becomes $P(Y > 4.5)$ with the continuity correction.'], '$z = ' + fr('4.5 - ' + m(mu), '\\sqrt{' + m(v) + '}') + ' = ' + m3(z) + '$'),
        step(['$P(Z > ' + m3(z) + ') = ' + m3(pr) + '$. So about ' + m(pr * 100) + '% of forty-shot spells give five or more goals.']),
      ],
      ask: ask('$X \\sim B(40, 0.11)$. Approximate $P(X \\ge 5)$ with a normal distribution and continuity correction, to 2 decimal places.', pr, '', { tol: 0.02, worked: ['$z = (4.5 - 4.4) / \\sqrt{3.916} = ' + m3(z) + '$.', '$P = ' + m3(pr) + '$.'], apply: A.plan('final', 'box', 'many', 'Forty shots at 11% give about 4 goals; to get five you need more shooters near goal: put more players in the box') }),
      next: 'Hypothesis tests for the mean and for correlation.',
    };
  });

  K.add('s-hypcorr', (d) => {
    const n = Math.min(d.shots.length, d.goals.length, 6), x = d.shots.slice(0, n), y = d.goals.slice(0, n), c = corr(x, y), crit = { 5: 0.8054, 6: 0.7293, 7: 0.6694 }[n] || 0.7293;
    return {
      analogy: ['Are shots and goals genuinely linked, or did your small sample just happen to line up? A hypothesis test for correlation compares the sample correlation with a critical value from a table.', 'With few matches you need a very high $r$ to be confident.'],
      why: 'Compare $|r|$ with the critical value for your $n$: if it is bigger, reject $H_0: \\rho = 0$.',
      steps: [
        step(['$H_0: \\rho = 0$ (no link) and $H_1: \\rho > 0$ (more shots, more goals), a one-tailed test at 5%.']),
        step(['Your sample of ' + n + ' matches has $r = ' + m3(c.r) + '$.'].concat(eg(d, 'stats'))),
        step(['The critical value for $n = ' + n + '$ at 5% one-tailed is ' + crit + '.']),
        step(['Compare: ' + m3(c.r) + (c.r > crit ? ' is greater than ' : ' is not greater than ') + crit + '.']),
        step(['Conclusion in context: ' + (c.r > crit ? 'there is evidence at the 5% level of a positive link between shots and goals.' : 'there is not enough evidence at the 5% level of a link between shots and goals in this sample.')]),
      ],
      ask: ask('For $n = ' + n + '$ matches the 5% one-tailed critical value is ' + crit + '. Your correlation is $r = ' + m3(c.r) + '$. By how much does $r$ exceed (or fall short of) the critical value? Give $r - ' + crit + '$ to 2 decimal places.', c.r - crit, '', { tol: 0.011, worked: [m3(c.r) + ' - ' + crit + ' = ' + m3(c.r - crit) + '.'], apply: c.r > crit ? A.plan('final', 'shooting', 'sight', 'The link between shots and goals is statistically significant: shoot on sight') : A.plan('final', 'shooting', 'std', 'The link is not yet significant: keep the finishing as it is and gather more matches') }),
      next: 'Testing the mean of a normal distribution.',
    };
  });

  K.add('s-hypmean', (d) => {
    const cs = d.crowdSeries, n = cs.length, xb = mean(cs), mu0 = 8000, sig = 320, z = (xb - mu0) / (sig / Math.sqrt(n));
    return {
      analogy: ['The board claims the average home crowd is 8,000. Your last ' + n + ' crowds average ' + num(xb) + '. Is that different enough, given how much crowds vary, to say the claim is wrong?', 'The test uses the distribution of the sample mean: it is $N(\\mu,\\ \\sigma^2 / n)$.'],
      why: 'Test a claim about $\\mu$ by finding $z = ' + fr('\\bar{x} - \\mu_0', '\\sigma / \\sqrt{n}') + '$ and comparing with the critical value.',
      steps: [
        step(['$H_0: \\mu = ' + mu0 + '$ and $H_1: \\mu < ' + mu0 + '$ (one-tailed, 5%). Known $\\sigma = ' + sig + '$, sample mean $\\bar{x} = ' + m(xb) + '$ from $n = ' + n + '$.'].concat(eg(d, 'series'))),
        step(['The standard error is $' + fr(sig, '\\sqrt{' + n + '}') + ' = ' + m(sig / Math.sqrt(n)) + '$.']),
        step(['Test statistic.'], '$z = ' + fr(m(xb) + ' - ' + mu0, m(sig / Math.sqrt(n))) + ' = ' + m(z) + '$'),
        step(['The 5% one-tailed critical value is $-1.645$. ' + (z < -1.645 ? m(z) + ' is below it, so reject $H_0$.' : m(z) + ' is not below it, so do not reject $H_0$.')]),
        step(['In context: ' + (z < -1.645 ? 'there is evidence the average crowd is below 8,000.' : 'there is no evidence the average crowd is below 8,000.')]),
      ],
      ask: ask('Test $H_0: \\mu = ' + mu0 + '$ with $\\sigma = ' + sig + '$, $n = ' + n + '$ and $\\bar{x} = ' + m(xb) + '$. Find the test statistic $z$ to 2 decimal places.', z, '', { tol: 0.02, worked: ['$z = (' + m(xb) + ' - ' + mu0 + ') / (' + sig + ' / \\sqrt{' + n + '}) = ' + m(z) + '$.'], apply: z < -1.645 ? A.marketing(d) : A.price(d, 'big', 3) }),
      next: 'Now Mechanics: the modelling that makes motion into maths.',
    };
  });

  K.add('m-model', (d) => ({
    analogy: ['To use maths on a football, you pretend it is a particle: a point with mass and no size, no spin, no air. A model is only as good as its assumptions, and a good analyst says what they are.', 'Units come first: always convert to metres, kilograms and seconds.'],
    why: 'Mechanics models simplify reality; stating assumptions and using SI units keeps the answer meaningful.',
    steps: [
      step(['Model the ball as a particle: its mass is at a point, so size and spin are ignored.']),
      step(['Other common assumptions: no air resistance, a smooth pitch, constant gravity ($g = 9.8$ m/s²), a light inextensible rope, a rigid body.']),
      step(['The SI units: length in metres, mass in kilograms, time in seconds, force in newtons.']),
      step(['A winger runs at 36 km/h. Convert: $36 \\times ' + fr(1000, 3600) + ' = 10$ m/s.'], '$36 \\text{ km/h} = 10 \\text{ m/s}$'),
      step(['Say what each assumption changes: ignoring air resistance makes a kicked ball go further than it really does.']),
    ],
    ask: ask('A winger runs at 36 km/h. What is that in metres per second?', 10, 'm/s', { tol: 0, worked: ['$36 \\times 1000 / 3600 = 10$.'], apply: A.plan('build', 'tempo', 'std', 'Models assume steady speed: keep the build-up tempo standard') }),
    next: 'Kinematic graphs: distance, speed and acceleration drawn.',
  }));

  K.add('m-graphs', (d) => ({
    analogy: ['A winger accelerates for 2 seconds to 8 m/s then holds that speed for 3 seconds. On a speed-time graph that is a ramp then a flat line, and everything he does is read off it: gradient is acceleration, area is distance.', 'Reading graphs is faster than using formulae.'],
    why: 'On a velocity-time graph the gradient is acceleration and the area under the graph is displacement.',
    steps: [
      step(['From 0 to 2 s the speed rises from 0 to 8 m/s: a straight line.']),
      step(['Gradient (acceleration).'], '$' + fr('8 - 0', '2 - 0') + ' = 4$ m/s²'),
      step(['Area of the ramp (a triangle).'], '$\\tfrac{1}{2} \\times 2 \\times 8 = 8$ m'),
      step(['Area of the flat part from 2 to 5 s (a rectangle).'], '$3 \\times 8 = 24$ m'),
      step(['Total distance $8 + 24 = 32$ m in 5 s, an average speed of $6.4$ m/s. A negative gradient is deceleration; area below the axis is movement backwards.']),
    ],
    ask: ask('A winger\'s speed rises uniformly from 0 to 8 m/s in 2 s, then stays at 8 m/s for a further 3 s. How far does he run in the 5 seconds, in metres?', 32, 'm', { tol: 0, worked: ['Triangle $8$ m + rectangle $24$ m = 32 m.'], apply: A.plan('build', 'tempo', 'fast', 'He gets to top speed in 2 s: raise the build-up tempo so passes reach him as he gets there') }),
    next: 'Under gravity a ball has a constant acceleration downward.',
  }));

  K.add('m-vertical', (d) => {
    const u = 12, h = u * u / (2 * G), t = 2 * u / G;
    return {
      analogy: ['A goalkeeper punts the ball straight up at 12 m/s. How high does it go, and how long until it comes back? The only acceleration is gravity, 9.8 m/s² downward, and the constant-acceleration formulae do the rest.', 'At the top the velocity is zero.'],
      why: 'Vertical motion under gravity uses $v = u + at$, $s = ut + \\tfrac{1}{2}at^2$ and $v^2 = u^2 + 2as$ with $a = -9.8$.',
      steps: [
        step(['Take up as positive: $u = 12$, $a = -9.8$.']),
        step(['At the highest point $v = 0$. Use $v^2 = u^2 + 2as$.'], '$0 = 144 - 19.6s \\Rightarrow s = ' + m(h) + '$ m'),
        step(['Time to the top: $v = u + at$ gives $0 = 12 - 9.8t$, so $t = ' + m(u / G) + '$ s.']),
        step(['It returns to the start after twice that.'], '$t = ' + fr('2u', 'g') + ' = ' + m(t) + '$ s'),
        step(['The ball arrives back at the same speed it left, 12 m/s downward, in this model (no air resistance).']),
      ],
      ask: ask('A ball is kicked straight up at 12 m/s ($g = 9.8$). What is its greatest height above the foot, in metres to 2 decimal places?', h, 'm', { tol: 0.02, worked: ['$s = u^2 / (2g) = 144 / 19.6 = ' + m(h) + '$.'], apply: A.plan('build', 'keeper', 'short', 'A ball that spends ' + m1(t) + ' s in the air gives the opposition time to press: have the keeper play it short') }),
      next: 'When acceleration changes, calculus is needed.',
    };
  });

  K.add('m-varacc', (d) => ({
    analogy: ['A sprinter does not accelerate at a constant rate: he starts hard and eases off. When acceleration varies, position, velocity and acceleration are linked by calculus: velocity is the derivative of position, acceleration the derivative of velocity.', 'Integrate to go the other way.'],
    why: '$v = \\dfrac{ds}{dt}$ and $a = \\dfrac{dv}{dt}$; integrate to go back, using known values to find the constants.',
    steps: [
      step(['A player\'s distance from the start is $s = t^3 + 2t$ metres.']),
      step(['Velocity is the derivative.'], '$v = \\dfrac{ds}{dt} = 3t^2 + 2$'),
      step(['At $t = 2$ s.'], '$v = 3(4) + 2 = 14$ m/s'),
      step(['Acceleration.'], '$a = \\dfrac{dv}{dt} = 6t = 12$ m/s² at $t = 2$'),
      step(['To go backwards, integrate: if $a = 6t$ and $v = 2$ at $t = 0$, then $v = 3t^2 + 2$.']),
    ],
    ask: ask('A player\'s distance is $s = t^3 + 2t$ metres. What is his velocity at $t = 2$ s, in m/s?', 14, 'm/s', { tol: 0, worked: ['$v = 3t^2 + 2 = 14$.'], apply: A.plan('transAtt', 'react', 'counter', 'Speed that keeps rising favours a counter-attack: set the team to counter') }),
    next: 'Kinematics with vectors extends this to position vectors in two dimensions.',
  }));

  K.add('m-kinvec', (d) => {
    const vx = 6, vy = 4, sp = Math.hypot(vx, vy);
    return {
      analogy: ['A winger\'s position on the pitch is a vector that changes with time: $\\mathbf{r} = 6t\\,\\mathbf{i} + t^2\\mathbf{j}$. Differentiate each component to get his velocity vector, and again for his acceleration vector.', 'Speed is the magnitude of velocity.'],
      why: 'For $\\mathbf{r}(t)$, $\\mathbf{v} = \\dot{\\mathbf{r}}$ and $\\mathbf{a} = \\ddot{\\mathbf{r}}$, component by component.',
      steps: [
        step(['$\\mathbf{r} = 6t\\,\\mathbf{i} + t^2\\mathbf{j}$ metres.']),
        step(['Differentiate each part.'], '$\\mathbf{v} = 6\\mathbf{i} + 2t\\,\\mathbf{j}$'),
        step(['At $t = 2$.'], '$\\mathbf{v} = 6\\mathbf{i} + 4\\mathbf{j}$'),
        step(['Speed.'], '$|\\mathbf{v}| = \\sqrt{36 + 16} = ' + m(sp) + '$ m/s'),
        step(['Acceleration: $\\mathbf{a} = 2\\mathbf{j}$, constant and across the pitch only.']),
      ],
      ask: ask('A player has position $\\mathbf{r} = 6t\\,\\mathbf{i} + t^2\\mathbf{j}$. What is his speed at $t = 2$ s, in m/s to 2 decimal places?', sp, 'm/s', { tol: 0.02, worked: ['$\\mathbf{v} = 6\\mathbf{i} + 4\\mathbf{j}$, $|\\mathbf{v}| = \\sqrt{52} = ' + m(sp) + '$.'], apply: A.plan('midfield', 'width', 'wide', 'A run that bends away from the line is an overlap: set the midfield to play wide') }),
      next: 'Projectiles combine horizontal and vertical motion.',
    };
  });

  K.add('m-proj', (d) => {
    const u = 20, th = 40, R = u * u * Math.sin(deg2(2 * th)) / G, T = 2 * u * Math.sin(deg2(th)) / G, H = Math.pow(u * Math.sin(deg2(th)), 2) / (2 * G);
    function deg2(x) { return x * PI / 180; }
    return {
      analogy: ['A long pass is kicked at 20 m/s at 40° above the ground. How far does it travel, how long is it in the air, and how high does it go? Horizontal motion is steady and vertical motion is under gravity: two simple problems joined by the time.', 'Resolve the velocity first.'],
      why: 'Resolve into $u\\cos\\theta$ (horizontal, constant) and $u\\sin\\theta$ (vertical, under gravity); time of flight links them.',
      steps: [
        step(['Components of $u = 20$ at $40°$: horizontal $20\\cos 40° = ' + m(u * Math.cos(deg2(th))) + '$, vertical $20\\sin 40° = ' + m(u * Math.sin(deg2(th))) + '$.']),
        step(['Time of flight: back to the ground when vertical displacement is zero.'], '$T = ' + fr('2u\\sin\\theta', 'g') + ' = ' + m(T) + '$ s'),
        step(['Range: horizontal speed times time.'], '$R = u\\cos\\theta \\times T = ' + m(R) + '$ m'),
        step(['Maximum height.'], '$H = ' + fr('(u\\sin\\theta)^2', '2g') + ' = ' + m(H) + '$ m'),
        step(['The same range $' + fr('u^2\\sin 2\\theta', 'g') + '$ comes from $\\theta$ and $90° - \\theta$; 45° gives the maximum range.']),
      ],
      ask: ask('A pass is kicked at 20 m/s at 40° to the ground ($g = 9.8$). Using $R = u^2\\sin 2\\theta / g$, find its range in metres to 1 decimal place.', R, 'm', { tol: 0.15, worked: ['$400 \\sin 80° / 9.8 = ' + m1(R) + '$.'], apply: R > 35 ? A.plan('build', 'style', 'direct', 'A ' + m1(R) + ' m pass in ' + m1(T) + ' s switches play over the press: set the build-up style to direct') : A.plan('build', 'style', 'std', 'Keep the build-up style standard') }),
      next: 'Forces: resolving them into components.',
    };
  });

  K.add('m-forces', (d) => {
    const F = 100, th = 30, h = F * Math.cos(deg3(th)), v = F * Math.sin(deg3(th));
    function deg3(x) { return x * PI / 180; }
    return {
      analogy: ['A defender pushes a striker with 100 N at 30° above horizontal. Only part of that push drives the striker sideways and part lifts him. Forces are vectors, and you resolve them into horizontal and vertical components to see what each does.', 'Equilibrium means all forces cancel.'],
      why: 'A force $F$ at angle $\\theta$ resolves into $F\\cos\\theta$ and $F\\sin\\theta$; in equilibrium the components in each direction sum to zero.',
      steps: [
        step(['$F = 100$ N at $30°$ above the horizontal.']),
        step(['Horizontal component.'], '$100\\cos 30° = ' + m(h) + '$ N'),
        step(['Vertical component.'], '$100\\sin 30° = ' + m(v) + '$ N'),
        step(['If a player of weight $mg$ stands still, the ground pushes up with a normal reaction $R = mg$; in equilibrium horizontal and vertical forces each balance.']),
        step(['The resultant of two forces is their vector sum: find components, add, then use Pythagoras for its size.']),
      ],
      ask: ask('A force of 100 N acts at 30° above the horizontal. What is its horizontal component, in newtons to 1 decimal place?', h, 'N', { tol: 0.06, worked: ['$100 \\cos 30° = ' + m1(h) + '$.'], apply: A.plan('defence', 'tackle', 'std', 'Only part of a shove drives the opponent: keep tackling standard and use the body well') }),
      next: 'Newton\'s laws relate force to acceleration: $F = ma$.',
    };
  });

  K.add('m-newton', (d) => {
    const mass = 75, a = 4.5, F = mass * a;
    return {
      analogy: ['A 75 kg player accelerates at 4.5 m/s². What force are his legs delivering? Newton\'s second law links the two: resultant force equals mass times acceleration. It explains why heavy players are slow to start and why lighter ones turn quickly.', 'Always find the resultant force first.'],
      why: '$F = ma$: the resultant force on a body equals its mass times its acceleration.',
      steps: [
        step(['A 75 kg player accelerates at 4.5 m/s² from rest.']),
        step(['The forward force (resultant).'], '$F = ma = 75 \\times 4.5 = ' + m(F) + '$ N'),
        step(['Weight is $mg = 75 \\times 9.8 = 735$ N, acting down; the ground pushes up with the same 735 N so there is no vertical acceleration.']),
        step(['A 60 kg winger needs only $60 \\times 4.5 = 270$ N for the same acceleration, which is why lighter players start faster.']),
        step(['Newton\'s third law: the ground pushes back with a force equal and opposite to the push of his boots.']),
      ],
      ask: ask('A 75 kg player accelerates at 4.5 m/s². What resultant force acts on him, in newtons?', F, 'N', { tol: 0.1, worked: ['$F = 75 \\times 4.5 = 337.5$.'], apply: A.plan('build', 'tempo', 'fast', 'Players that can generate ' + m(F) + ' N accelerate quickly: set the build-up tempo to fast') }),
      next: 'Friction opposes sliding: the slide tackle for a start.',
    };
  });

  K.add('m-friction', (d) => {
    const mu = 0.5, a = mu * G, v = 7, dist = v * v / (2 * a);
    return {
      analogy: ['A player slides on wet grass at 7 m/s. Friction slows him: the friction force is $\\mu R$, where $R$ is the normal reaction and $\\mu$ the coefficient of friction. It decides how far he slides before stopping and whether a slide tackle reaches the ball.', 'Friction opposes motion and has a maximum.'],
      why: 'Friction $F \\le \\mu R$; when sliding $F = \\mu R$ and it provides the deceleration.',
      steps: [
        step(['Mass $m$, coefficient $\\mu = 0.5$ between him and the grass.']),
        step(['On flat ground $R = mg$, so $F = \\mu mg$ and the deceleration is $a = ' + fr('\\mu mg', 'm') + ' = \\mu g = ' + m(a) + '$ m/s².']),
        step(['He slides until his speed is zero. Use $v^2 = u^2 + 2as$ with $v = 0$, $u = 7$, $a = -' + m(a) + '$.'], '$s = ' + fr('7^2', '2 \\times ' + m(a)) + ' = ' + m(dist) + '$ m'),
        step(['So he slides ' + m1(dist) + ' m. On a dry pitch ($\\mu$ larger) he stops sooner; on a wet one ($\\mu$ smaller) he slides further.']),
        step(['If he is just about to slip the friction is at its limit $\\mu R$; below that it only needs to balance the other forces.']),
      ],
      ask: ask('A player slides at 7 m/s on grass with $\\mu = 0.5$ ($g = 9.8$). How far does he slide before stopping, in metres to 1 decimal place?', dist, 'm', { tol: 0.06, worked: ['$a = 0.5 \\times 9.8 = 4.9$.', '$s = 49 / 9.8 = ' + m1(dist) + '$.'], apply: A.plan('defence', 'tackle', 'stay', 'A slide of ' + m1(dist) + ' m is a gamble: tell defenders to stay on their feet') }),
      next: 'Connected particles: two bodies pulled together by a rope.',
    };
  });

  K.add('m-connected', (d) => {
    const m1_ = 60, m2_ = 40, F = 200, a = F / (m1_ + m2_), T = m2_ * a;
    return {
      analogy: ['Two training sleds of 60 kg and 40 kg are tied together and pulled by a 200 N force. They accelerate together, and the rope between them carries a tension. Treat them as one body to find the acceleration, then each separately to find the tension.', 'Connected particles share an acceleration.'],
      why: 'Connected bodies share the acceleration: treat them as one system for $a$, then apply $F = ma$ to one of them for the tension.',
      steps: [
        step(['Sleds of ' + m1_ + ' kg (front) and ' + m2_ + ' kg (behind) are pulled with 200 N on the front sled. Ignore friction.']),
        step(['Whole system: $F = (m_1 + m_2)a$.'], '$a = ' + fr(F, m1_ + m2_) + ' = ' + m(a) + '$ m/s²'),
        step(['Consider the rear sled alone: only the tension pulls it.'], '$T = ' + m2_ + ' \\times ' + m(a) + ' = ' + m(T) + '$ N'),
        step(['Check with the front sled: $200 - T = ' + m1_ + ' \\times ' + m(a) + '$, so $T = 200 - 120 = 80$. Both methods agree.']),
        step(['A rope that is light and inextensible has the same tension all along and lets both ends accelerate equally.']),
      ],
      ask: ask('Sleds of 60 kg and 40 kg are pulled by a 200 N force on the front sled (no friction). What is the tension in the rope between them, in newtons?', T, 'N', { tol: 0.2, worked: ['$a = 200 / 100 = 2$.', '$T = 40 \\times 2 = 80$.'], apply: A.plan('transAtt', 'support', 'many', 'Players moving together share the load: send more support after winning the ball') }),
      next: 'Motion on a slope, where gravity has a component down it.',
    };
  });

  K.add('m-inclined', (d) => {
    const th = 15, a = G * Math.sin(th * PI / 180);
    return {
      analogy: ['The training ground has a 15° slope. A ball rolling down it feels only part of gravity: the component along the slope. Resolving along and perpendicular to the slope gives the acceleration, and friction is added if the surface is rough.', 'Along the slope: $mg\\sin\\theta$. Perpendicular: $R = mg\\cos\\theta$.'],
      why: 'On a slope at angle $\\theta$, the component of weight along it is $mg\\sin\\theta$ and the normal reaction is $mg\\cos\\theta$.',
      steps: [
        step(['A smooth slope at ' + th + '°: only the weight component pulls the player down it.']),
        step(['Along the slope: $ma = mg\\sin\\theta$, so'], '$a = g\\sin ' + th + '° = 9.8 \\times ' + m3(Math.sin(th * PI / 180)) + ' = ' + m(a) + '$ m/s²'),
        step(['Perpendicular to the slope: $R = mg\\cos ' + th + '°$.']),
        step(['With friction ($\\mu$) opposing: $ma = mg\\sin\\theta - \\mu mg\\cos\\theta$. If this is $\\le 0$ the player does not slide.']),
        step(['Running up the slope costs the same component, which is why hill sprints are hard training.']),
      ],
      ask: ask('A smooth slope is at ' + th + '° to the horizontal. What is the acceleration down it, in m/s² to 2 decimal places? ($g = 9.8$)', a, 'm/s²', { tol: 0.02, worked: ['$9.8 \\sin 15° = ' + m(a) + '$.'], apply: A.plan('transDef', 'recover', 'track', 'Recovering uphill takes real effort: make defenders track back early') }),
      next: 'Moments and equilibrium: the last point in the Mechanics strand.',
    };
  });

  K.add('m-moments', (d) => {
    const m1_ = 75, d1 = 2, m2_ = 50, x = m1_ * d1 / m2_;
    return {
      analogy: ['Two players on a seesaw-style training beam balance when the turning effects match: a heavier player sitting nearer the middle balances a lighter one sitting further out. The turning effect of a force is its moment: force times perpendicular distance from the pivot.', 'In equilibrium clockwise moments equal anticlockwise moments.'],
      why: 'Moment = force $\\times$ perpendicular distance from the pivot; a body in equilibrium has no resultant force and equal clockwise and anticlockwise moments.',
      steps: [
        step(['A light beam is pivoted at its middle. A ' + m1_ + ' kg player sits ' + d1 + ' m from the pivot on one side.']),
        step(['His moment: $' + m1_ + 'g \\times ' + d1 + '$ (clockwise, say).']),
        step(['A ' + m2_ + ' kg player sits $x$ m from the pivot on the other side. His moment is $' + m2_ + 'g \\times x$.']),
        step(['Balance the moments (the $g$ cancels).'], '$' + m2_ + 'x = ' + m1_ + ' \\times ' + d1 + ' \\Rightarrow x = ' + m(x) + '$ m'),
        step(['The lighter player must sit further out. The reaction at the pivot carries the total weight: $(' + m1_ + ' + ' + m2_ + ')g$.']),
      ],
      ask: ask('A beam balances on its centre. A 75 kg player sits 2 m from the pivot. Where must a 50 kg player sit on the other side to balance it, in metres from the pivot?', x, 'm', { tol: 0.01, worked: ['$50x = 75 \\times 2$.', '$x = 3$.'], apply: A.plan('defence', 'compact', 'tight', 'Balance is about distances from the centre: keep the defence compact around its centre') }),
      next: 'That completes the course. Every point on the map now has a lesson, and the schedule runs through them in order.',
    };
  });
})();
