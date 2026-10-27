// A-level Maths lessons, first set (Pure, Statistics, Mechanics). Same shape as the GCSE lessons: a function of the student's club that returns { why, steps, ask, next }.
(function () {
  const FM = (window.FM = window.FM || {});
  const L = (FM.knowledgeLessons = FM.knowledgeLessons || {});
  const m = (v) => String(Math.round(v * 1000) / 1000);
  const m2 = (v) => String(Math.round(v * 100) / 100);
  const price = (stand, p, say) => ({ kind: 'control', action: 'setTicketPrice', params: { stand: stand.id, price: Math.max(3, Math.round(p)) }, say: say || 'Set ' + stand.name + ' tickets to £' + Math.max(3, Math.round(p)) });
  const marketing = (x, say) => ({ kind: 'control', action: 'setMarketing', params: { perRound: Math.max(0, Math.min(60000, Math.round(x))) }, say: say || 'Set the marketing budget to £' + Math.round(x).toLocaleString('en-GB') + ' a matchday' });
  const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
  const phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
  const choose = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };
  const binom = (n, p, k) => choose(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
  // a demand line for a stand: the crowd falls as the price rises (about 9% fewer for every 10% on the price). The revenue from it is a quadratic in the price.
  const demand = (s) => { const k = 0.9 * s.sold / s.price, A = s.sold + k * s.price; return { k, A, pStar: A / (2 * k), R: (p) => p * (A - k * p) }; };

  L['p-quadratics'] = (d) => {
    const s = d.big, dm = demand(s), A = dm.A, k = dm.k, h = A / (2 * k), top = A * A / (4 * k);
    return {
      why: 'The revenue from a stand follows a quadratic in the price, and completing the square shows where they peak.',
      steps: [
        { say: ['Take ' + s.name + ': at £' + s.price + ' you sold ' + d.num(s.sold) + ' seats.', 'Suppose every extra £1 on the price loses about ' + m2(k) + ' fans. Then the crowd at price $p$ is $q = ' + m2(A) + ' - ' + m2(k) + 'p$.'].concat(d.example.crowds ? ['(Example figures until you have home matches.)'] : []) },
        { say: ['Revenue is price times crowd.'], maths: '$R = p(' + m2(A) + ' - ' + m2(k) + 'p) = -' + m2(k) + 'p^2 + ' + m2(A) + 'p$' },
        { say: ['That is a quadratic with a negative $p^2$ term, so its graph is an upside-down U: it has a highest point.', 'Completing the square finds that point without any calculus.'] },
        { say: ['Take out the coefficient of $p^2$: $R = -' + m2(k) + '\\left(p^2 - \\frac{' + m2(A) + '}{' + m2(k) + '}p\\right)$.', 'Half the coefficient of $p$ is ' + m2(h) + ', so complete the square inside the bracket.'], maths: '$R = -' + m2(k) + '\\left[(p - ' + m2(h) + ')^2 - ' + m2(h * h) + '\\right] = ' + m2(top) + ' - ' + m2(k) + '(p - ' + m2(h) + ')^2$' },
        { say: ['A square is never negative, so the revenue is largest when the bracket is zero: when $p = ' + m2(h) + '$.', 'The maximum revenue is £' + d.num(top) + '.'] },
      ],
      ask: { q: 'For $R = -' + m2(k) + 'p^2 + ' + m2(A) + 'p$, which price (to the nearest pound) gives the greatest revenue from ' + s.name + '?', kind: 'number', answer: h, unit: '£', tol: 0.5, rubric: 'Correct £' + m2(h) + ', so accept £' + Math.round(h) + '. The vertex of the quadratic, at p = A/(2k).', worked: ['Complete the square: $R = ' + m2(top) + ' - ' + m2(k) + '(p - ' + m2(h) + ')^2$.', 'The maximum is where $p = ' + m2(h) + '$.'], apply: price(s, h) },
      next: 'There is a quicker way to find that peak: differentiate. Shall we try it?',
    };
  };

  L['p-diffpowers'] = (d) => {
    const s = d.big, dm = demand(s), p = s.price, slope = dm.A - 2 * dm.k * p;
    return {
      why: 'The slope of the revenue curve tells you whether a price rise helps or hurts, and differentiation gives it.',
      steps: [
        { say: ['The revenue from ' + s.name + ' were $R = -' + m2(dm.k) + 'p^2 + ' + m2(dm.A) + 'p$.', 'The question the board asks is: "if we add £1 to the price, does revenue goes up or down, and by how much?"', 'That is a rate of change, and the rate of change of a curve at a point is its gradient.'] },
        { say: ['The derivative $\\frac{dR}{dp}$ is the gradient function. For powers there is one rule to learn:'], maths: '$\\frac{d}{dp}(p^n) = np^{n-1}$' },
        { say: ['Multiply by the power, then reduce the power by one.', 'So $p^2$ becomes $2p$, and $p$ (which is $p^1$) becomes $1$.', 'A constant disappears, and a number multiplying a term just stays.'] },
        { say: ['Apply it term by term to the revenue.'], maths: '$\\frac{dR}{dp} = -2 \\times ' + m2(dm.k) + 'p + ' + m2(dm.A) + ' = ' + m2(dm.A) + ' - ' + m2(2 * dm.k) + 'p$' },
        { say: ['Now put in the price you charge today, $p = ' + p + '$.'], maths: '$\\frac{dR}{dp} = ' + m2(dm.A) + ' - ' + m2(2 * dm.k) + ' \\times ' + p + ' = ' + m2(slope) + '$' },
        { say: [slope > 0 ? 'The gradient is positive, so revenue is still rising: another £1 on the price would bring in about £' + m2(slope) + ' more.' : 'The gradient is negative, so revenue is falling: another £1 would cost you about £' + m2(-slope) + '.', 'Where the gradient is zero, you are at the top.'] },
      ],
      ask: { q: 'Differentiate $R = -' + m2(dm.k) + 'p^2 + ' + m2(dm.A) + 'p$ and find $\\frac{dR}{dp}$ at $p = ' + p + '$ (the current price of ' + s.name + ').', kind: 'number', answer: slope, unit: '£ per £1', tol: 0.06, rubric: 'Correct ' + m2(slope) + ' (A − 2kp). Accept within 0.06.', worked: ['$\\frac{dR}{dp} = ' + m2(dm.A) + ' - ' + m2(2 * dm.k) + 'p$.', 'At $p = ' + p + '$ this is ' + m2(slope) + '.'], apply: price(s, p + (slope > 0 ? 1 : -1), (slope > 0 ? 'Revenue is rising with price: raise ' : 'Revenue is falling with price: cut ') + s.name + ' by £1') },
      next: 'If the gradient is zero at the top, can you find the price where that happens? That is optimisation.',
    };
  };

  L['p-optimise'] = (d) => {
    const s = d.big, dm = demand(s), ps = dm.pStar, top = dm.R(ps);
    return {
      why: 'The best ticket price is where revenue stops rising and start falling: a stationary point.',
      steps: [
        { say: ['For ' + s.name + ' the revenue is $R = -' + m2(dm.k) + 'p^2 + ' + m2(dm.A) + 'p$, and the gradient is $\\frac{dR}{dp} = ' + m2(dm.A) + ' - ' + m2(2 * dm.k) + 'p$.', 'At the top of the curve the gradient is zero. Set it to zero.'], maths: '$' + m2(dm.A) + ' - ' + m2(2 * dm.k) + 'p = 0$' },
        { say: ['Solve for $p$.'], maths: '$p = \\frac{' + m2(dm.A) + '}{' + m2(2 * dm.k) + '} = ' + m2(ps) + '$' },
        { say: ['A gradient of zero could be a top or a bottom, so check with the second derivative.', 'Differentiate again: $\\frac{d^2R}{dp^2} = -' + m2(2 * dm.k) + '$.'], maths: '$\\frac{d^2R}{dp^2} = -' + m2(2 * dm.k) + ' < 0$' },
        { say: ['Negative means the curve is bending downwards, so it is a maximum. Good: that is a peak, not a dip.'] },
        { say: ['The revenue at that price:'], maths: '$R(' + m2(ps) + ') = ' + m2(ps) + '(' + m2(dm.A) + ' - ' + m2(dm.k) + ' \\times ' + m2(ps) + ') = ' + d.num(top) + '$' },
        { say: ['Compare with today: at £' + s.price + ' the same model gives £' + d.num(dm.R(s.price)) + '.', 'So the best price is worth ' + (top > dm.R(s.price) ? 'about £' + d.num(top - dm.R(s.price)) + ' more per match' : 'the same, you are already at the top') + '.'] },
      ],
      ask: { q: 'Find the ticket price for ' + s.name + ' that maximises the revenue $R = -' + m2(dm.k) + 'p^2 + ' + m2(dm.A) + 'p$, to the nearest pound.', kind: 'number', answer: ps, unit: '£', tol: 0.5, rubric: 'Correct £' + m2(ps) + ' (accept £' + Math.round(ps) + '): set dR/dp = 0 and solve; ideally with a check that d²R/dp² < 0.', worked: ['$\\frac{dR}{dp} = ' + m2(dm.A) + ' - ' + m2(2 * dm.k) + 'p = 0$ gives $p = ' + m2(ps) + '$.', 'The second derivative is $-' + m2(2 * dm.k) + ' < 0$, so it is a maximum.'], apply: price(s, ps, 'Set ' + s.name + ' tickets to the best price, £' + Math.round(ps)) },
      next: 'Would you like to see how the real game found the best price from your three matches, using an exponential curve instead of a straight line?',
    };
  };

  L['p-exp'] = (d) => {
    const n0 = d.crowd, r = 1.03, t = 6, nt = n0 * Math.pow(r, t);
    return {
      why: 'A crowd that grows by a percentage each match grows exponentially, not in a straight line.',
      steps: [
        { say: ['Your last crowd was ' + d.num(n0) + '. Suppose good results lift the crowd by 3% each home match.', 'Is that a straight line or a curve?'].concat(d.example.crowds ? ['(Example crowd until you have home matches.)'] : []) },
        { say: ['A straight line adds the same number each time: +' + d.num(n0 * 0.03) + ' every match.', 'But 3% of a bigger crowd is bigger, so the growth speeds up.'], maths: '$N_1 = ' + d.num(n0) + ' \\times 1.03 = ' + d.num(n0 * 1.03) + '$' },
        { say: ['Each match multiplies by the same factor 1.03. After $t$ matches that is 1.03 multiplied $t$ times, which is a power.'], maths: '$N = N_0 \\times 1.03^t$' },
        { say: ['An exponential function has the variable in the power: $y = ab^x$.', 'If $b > 1$ it grows, and the larger $b$ is, the steeper it gets. If $0 < b < 1$ it decays.'] },
        { say: ['After 6 matches:'], maths: '$N = ' + d.num(n0) + ' \\times 1.03^6 = ' + d.num(nt) + '$' },
        { say: ['The graph starts at ' + d.num(n0) + ' when $t = 0$ (it passes through $(0, N_0)$) and curves up, never touching zero.'] },
      ],
      ask: { q: 'A crowd of ' + d.num(n0) + ' grows by 3% each home match. Use $N = N_0 \\times 1.03^t$ to find the crowd after 6 matches, to the nearest whole number.', kind: 'number', answer: nt, unit: '', tol: 1.5, rubric: 'Correct about ' + Math.round(nt) + ' (accept ±2). Method: multiply by 1.03 six times, or 1.03^6.', worked: ['$1.03^6 = ' + m(Math.pow(r, t)) + '$.', '$' + d.num(n0) + ' \\times ' + m(Math.pow(r, t)) + ' = ' + d.num(nt) + '$.'], apply: marketing(Math.min(60000, 8000 + Math.round((nt - n0) * 2)), 'Back the growth: set marketing to a level that fits a crowd of ' + d.num(nt)) },
      next: 'You can now grow a crowd. Do you want to work the other way, and find how long it takes to fill the stadium? That needs logarithms.',
    };
  };

  L['p-logs'] = (d) => {
    const n0 = d.crowd, cap = d.capacity, r = 1.03, t = Math.log(cap / n0) / Math.log(r);
    return {
      why: 'Working out how many matches until the ground is full means solving for a power, and logarithms undo powers.',
      steps: [
        { say: ['The ground holds ' + d.num(cap) + ' and you have ' + d.num(n0) + ' coming. With 3% growth a match, how many matches until it is full?'].concat(d.example.crowds ? ['(Example crowd until you have home matches.)'] : []), maths: '$' + d.num(n0) + ' \\times 1.03^t = ' + d.num(cap) + '$' },
        { say: ['Tidy it so the power is alone: divide both sides by ' + d.num(n0) + '.'], maths: '$1.03^t = \\frac{' + cap + '}{' + n0 + '} = ' + m(cap / n0) + '$' },
        { say: ['We need $t$, which is up in the power. Squaring undoes a square root; a logarithm undoes a power.', 'The definition: $\\log_a x = y$ means $a^y = x$.'] },
        { say: ['Take logs of both sides. A key law: the power comes down as a multiplier.'], maths: '$\\log(a^t) = t\\log a$' },
        { say: ['So $t \\log 1.03 = \\log ' + m(cap / n0) + '$ and'], maths: '$t = \\frac{\\log ' + m(cap / n0) + '}{\\log 1.03} = ' + m2(t) + '$' },
        { say: ['About ' + m2(t) + ' matches, so it takes ' + Math.ceil(t) + ' whole home matches to fill the ground.', 'Check: $1.03^{' + Math.ceil(t) + '} \\times ' + d.num(n0) + ' = ' + d.num(n0 * Math.pow(r, Math.ceil(t))) + '$, which is at least the capacity.'] },
      ],
      ask: { q: 'Solve $' + d.num(n0) + ' \\times 1.03^t = ' + d.num(cap) + '$. How many whole home matches until the ground is full?', kind: 'number', answer: Math.ceil(t), unit: '', tol: 0, rubric: 'Exact t = ' + m2(t) + ', so the answer is ' + Math.ceil(t) + ' matches (rounded up). Method: logs of both sides, t = log(cap/crowd)/log 1.03.', worked: ['$1.03^t = ' + m(cap / n0) + '$, so $t = \\frac{\\log ' + m(cap / n0) + '}{\\log 1.03} = ' + m2(t) + '$.', 'Round up to ' + Math.ceil(t) + '.'], apply: marketing(Math.min(60000, Math.round(25000 / Math.max(1, Math.ceil(t) / 8))), 'Plan for a full ground in ' + Math.ceil(t) + ' matches: set the marketing budget') },
      next: 'Would you like to see how the sum of a growing crowd across a season works, using geometric series?',
    };
  };

  L['s-measures'] = (d) => {
    const x = d.crowdSeries, n = x.length, mean = x.reduce((a, v) => a + v, 0) / n, ss = x.reduce((a, v) => a + (v - mean) * (v - mean), 0), sd = Math.sqrt(ss / n), sxx = x.reduce((a, v) => a + v * v, 0);
    return {
      why: 'The standard deviation says how much your crowds wobble, and that tells you how far to trust an average.',
      steps: [
        { say: ['Your home crowds: ' + x.map(d.num).join(', ') + '.'].concat(d.example.series ? ['(Example crowds until you have more home matches.)'] : []).concat(['Their mean is ' + d.num(mean) + '. But two grounds with that mean can behave completely differently: one steady, one wild.']) },
        { say: ['The variance measures how far values sit from the mean, squared so that high and low do not cancel.'], maths: '$\\sigma^2 = \\frac{\\sum (x - \\bar{x})^2}{n} = \\frac{\\sum x^2}{n} - \\bar{x}^2$' },
        { say: ['Use the second form, it is quicker. $\\sum x^2 = ' + d.num(sxx) + '$ and $n = ' + n + '$.'], maths: '$\\sigma^2 = \\frac{' + d.num(sxx) + '}{' + n + '} - ' + m2(mean) + '^2 = ' + d.num(ss / n) + '$' },
        { say: ['The variance is in squared fans, which is awkward. Square-root it to get back to fans: the standard deviation.'], maths: '$\\sigma = \\sqrt{' + d.num(ss / n) + '} = ' + m2(sd) + '$' },
        { say: ['A rough guide: about two-thirds of your crowds sit within one standard deviation of the mean. That is from ' + d.num(mean - sd) + ' to ' + d.num(mean + sd) + '.', 'A small $\\sigma$ means a steady ground. A large one means crowds that jump around, which makes budgeting hard.'] },
        { say: ['Coding: if you subtract the same number from every crowd, the mean moves by that much but the standard deviation does not change. If you divide every crowd by 100, both are divided by 100.'] },
      ],
      ask: { q: 'Find the standard deviation of these home crowds (treat them as the whole population): ' + x.map(d.num).join(', ') + '. Give it to the nearest whole fan.', kind: 'number', answer: sd, unit: '', tol: 1.5, rubric: 'Correct about ' + Math.round(sd) + ' (accept ±2). Population sd = sqrt(Σx²/n − mean²).', worked: ['Mean = ' + m2(mean) + '.', 'Variance = Σx²/n − mean² = ' + d.num(ss / n) + '.', 'σ = √' + d.num(ss / n) + ' = ' + m2(sd) + '.'], apply: marketing(Math.round(sd * 1.5), 'Spend roughly 1.5 standard deviations (£' + d.num(sd * 1.5) + ') a matchday on marketing to steady the crowd') },
      next: 'Do you want to see how a normal distribution uses that mean and standard deviation to give you the chance of a sell-out?',
    };
  };

  L['s-binom'] = (d) => {
    const p = Math.max(0.1, Math.min(0.8, d.wins / d.played)), pp = Math.round(p * 100) / 100, n = 5, k = 3, pr = binom(n, pp, k);
    return {
      why: 'The number of wins in the next five matches is a binomial random variable.',
      steps: [
        { say: ['Say each match is a win with probability ' + pp + ', and the matches do not affect one another.', 'How many wins in the next 5? We cannot know, but we can give the chance of each number.'] },
        { say: ['This is a binomial situation: a fixed number of trials $n$, two outcomes, a constant chance $p$ of a win, and independent trials.', 'We write $X \\sim B(' + n + ', ' + pp + ')$, where $X$ is the number of wins.'] },
        { say: ['The probability of exactly $k$ wins:'], maths: '$P(X = k) = \{}^{n}C_{k}p^k(1-p)^{n-k}$' },
        { say: ['The pieces: $p^k$ is the chance of the wins, $(1-p)^{n-k}$ is the chance of the other matches not being wins, and $\{}^{n}C_{k}$ counts the different orders in which the wins can happen.'] },
        { say: ['For exactly 3 wins in 5 matches:'], maths: '$P(X = 3) = \{}^{5}C_{3}(' + pp + ')^3(' + m2(1 - pp) + ')^2 = 10 \\times ' + m(Math.pow(pp, 3)) + ' \\times ' + m(Math.pow(1 - pp, 2)) + ' = ' + m(pr) + '$' },
        { say: ['The mean number of wins is $np = ' + m2(n * pp) + '$.', 'And the variance is $np(1-p) = ' + m2(n * pp * (1 - pp)) + '$.'] },
      ],
      ask: { q: 'With $X \\sim B(5, ' + pp + ')$, find $P(X = 3)$ to 3 decimal places.', kind: 'number', answer: pr, unit: '', tol: 0.0015, rubric: 'Correct ' + m(pr) + '. Method: 10 × p³ × (1−p)².', worked: ['$\{}^{5}C_{3} = 10$.', '$P(X = 3) = 10 \\times ' + pp + '^3 \\times ' + m2(1 - pp) + '^2 = ' + m(pr) + '$.'], apply: { kind: 'plan', phase: 'press', key: 'intensity', value: pr < 0.2 ? 'high' : 'std', say: pr < 0.2 ? 'Three wins in five is unlikely at this rate, so raise the pressing to Heavy to lift your chance' : 'Three wins in five is a realistic target; keep the pressing at Medium' } },
      next: 'Do you want to use this to decide whether a new tactic has genuinely improved your results, a hypothesis test?',
    };
  };

  L['s-hypbinom'] = (d) => {
    const p0 = 0.3, n = 10, x = 6, tail = (() => { let s = 0; for (let k = x; k <= n; k++) s += binom(n, p0, k); return s; })(), sig = tail < 0.05;
    return {
      why: 'To decide whether a tactical change really worked, you test it against the idea that nothing changed.',
      steps: [
        { say: ['Before the change you won about 30% of matches. After it, you won ' + x + ' of the next ' + n + '.', 'Is the tactic working, or did you get lucky?'] },
        { say: ['A hypothesis test starts by assuming nothing has changed, and asks if the result would be surprising.', 'The null hypothesis is $H_0: p = 0.3$. The alternative is $H_1: p > 0.3$, because we want to know if wins have increased.'] },
        { say: ['If $H_0$ is true then the number of wins is $X \\sim B(10, 0.3)$.', 'The question is: how likely is a result as good as 6 wins, or better?'], maths: '$P(X \\ge 6) = 1 - P(X \\le 5) = ' + m(tail) + '$' },
        { say: ['Compare it with the significance level, normally 5% (0.05).', 'If the probability is smaller than 0.05, the result would be very unlikely under $H_0$, so we reject $H_0$.'] },
        { say: [sig ? 'Here ' + m(tail) + ' < 0.05, so we reject $H_0$: there is evidence that the tactic has raised the chance of winning.' : 'Here ' + m(tail) + ' > 0.05, so we do not reject $H_0$: six wins in ten is not unusual enough, so there is no evidence the tactic has worked.', 'Notice we never say "proved". A test gives evidence, not proof.'] },
        { say: ['Always finish a test in context: "There is / is not sufficient evidence at the 5% level that the new tactic has increased the proportion of matches won."'] },
      ],
      ask: { q: 'Under $H_0: p = 0.3$ with $n = 10$, the probability of 6 or more wins is ' + m(tail) + '. At the 5% significance level, is there evidence that the tactic has improved your results? Answer "yes" or "no" and explain in one sentence.', kind: 'text', answer: sig ? 'yes' : 'no', rubric: 'The correct decision is ' + (sig ? 'YES: reject H0 since ' + m(tail) + ' < 0.05' : 'NO: do not reject H0 since ' + m(tail) + ' > 0.05') + '. Look for comparing with 0.05 and a conclusion in context (the tactic and winning).', worked: ['Compare ' + m(tail) + ' with 0.05.', sig ? 'It is smaller, so reject $H_0$: evidence the tactic helped.' : 'It is larger, so do not reject $H_0$: no evidence the tactic helped.'], apply: { kind: 'plan', phase: 'press', key: 'intensity', value: sig ? 'high' : 'std', say: sig ? 'The test supports the change: keep the Heavy press' : 'There is no evidence of improvement: go back to a Medium press' } },
      next: 'Would you like to see how the normal distribution handles results that are not just wins and losses, like crowd sizes?',
    };
  };

  L['s-normal'] = (d) => {
    const x = d.crowdSeries, n = x.length, mean = x.reduce((a, v) => a + v, 0) / n, sd = Math.sqrt(x.reduce((a, v) => a + (v - mean) * (v - mean), 0) / n) || 400, cap = d.capacity, z = (cap - mean) / sd, pr = 1 - phi(z);
    return {
      why: 'Crowds cluster around a typical size, and the normal distribution gives the chance of a sell-out.',
      steps: [
        { say: ['Your crowds have a mean of ' + d.num(mean) + ' and a standard deviation of ' + d.num(sd) + '.'].concat(d.example.series ? ['(Example figures until you have more home matches.)'] : []).concat(['When a measurement is the sum of many small causes, as a crowd is, its values often form a bell curve: the normal distribution.']) },
        { say: ['We write $X \\sim N(\\mu, \\sigma^2)$. Here $X \\sim N(' + d.num(mean) + ', ' + d.num(sd) + '^2)$.', 'The curve is symmetrical about the mean, and the area under it is 1, so area means probability.'] },
        { say: ['To find the chance of a sell-out we need $P(X > ' + d.num(cap) + ')$.', 'To use the standard tables we convert to a z-score: how many standard deviations above the mean is the capacity?'], maths: '$z = \\frac{x - \\mu}{\\sigma} = \\frac{' + cap + ' - ' + Math.round(mean) + '}{' + Math.round(sd) + '} = ' + m2(z) + '$' },
        { say: ['Now $Z \\sim N(0, 1)$. The table gives $P(Z < z)$, so for "bigger than" take one minus it.'], maths: '$P(X > ' + cap + ') = 1 - \\Phi(' + m2(z) + ') = ' + m(pr) + '$' },
        { say: ['So the chance of a sell-out on any given day is about ' + m2(pr * 100) + '%.', pr < 0.05 ? 'That is rare: the ground is much bigger than your normal crowd.' : 'That is a real chance, so it is worth planning for.'] },
      ],
      ask: { q: 'Crowds are $N(' + Math.round(mean) + ', ' + Math.round(sd) + '^2)$. Find the z-score for a capacity of ' + d.num(cap) + ', to 2 decimal places.', kind: 'number', answer: z, unit: '', tol: 0.02, rubric: 'Correct z = ' + m2(z) + ' ((cap − mean)/sd). Accept ±0.02.', worked: ['$z = \\frac{' + cap + ' - ' + Math.round(mean) + '}{' + Math.round(sd) + '} = ' + m2(z) + '$.'], apply: price(d.big, Math.max(3, d.big.price - (pr < 0.05 ? 2 : 0)), pr < 0.05 ? 'A sell-out is unlikely, so cut ' + d.big.name + ' by £2 to bring more fans in' : 'A sell-out is realistic; keep ' + d.big.name + ' where it is') },
      next: 'Do you want to see how you could use a regression line to predict the crowd from the ticket price?',
    };
  };

  L['m-suvat'] = (d) => {
    const w = d.fast, v = 9.0, a = 4.5, t = 3, s = 0.5 * a * t * t, vt = a * t;
    return {
      why: 'A winger accelerating down the touchline is constant-acceleration motion, and five formulas describe all of it.',
      steps: [
        { say: [w.name + ' is your quickest player. Suppose he starts from rest and accelerates at ' + a + ' m/s² down the wing.', 'How far has he run after 3 seconds, and how fast is he going?'] },
        { say: ['Motion in a straight line with constant acceleration has five quantities: $s$ (distance), $u$ (start speed), $v$ (end speed), $a$ (acceleration) and $t$ (time).', 'Any three of them let you find the other two.', 'We call the formulas "suvat".'] },
        { say: ['Here: $u = 0$ (from rest), $a = ' + a + '$, $t = 3$. We want $s$ and $v$.', 'The distance formula uses exactly those:'], maths: '$s = ut + \\tfrac{1}{2}at^2 = 0 + \\tfrac{1}{2}(' + a + ')(3)^2 = ' + m2(s) + '$' },
        { say: ['For the speed, use the formula that links $v$, $u$, $a$ and $t$.'], maths: '$v = u + at = 0 + ' + a + ' \\times 3 = ' + m2(vt) + '$' },
        { say: ['That is ' + m2(vt) + ' m/s, about ' + m2(vt * 3.6) + ' km/h.', 'Check with a third formula: $v^2 = u^2 + 2as$ gives $' + m2(vt * vt) + ' = 2 \\times ' + a + ' \\times ' + m2(s) + '$, which is ' + m2(2 * a * s) + '. It matches.'] },
        { say: ['The skill is picking the formula that has the three things you know and the one you want, and nothing else.'] },
      ],
      ask: { q: 'A winger starts from rest and accelerates at ' + a + ' m/s². How far does he run in 3 seconds, in metres?', kind: 'number', answer: s, unit: 'm', tol: 0.05, rubric: 'Correct ' + m2(s) + ' m (s = ut + ½at²).', worked: ['$s = ut + \\tfrac{1}{2}at^2$ with $u = 0$, $a = ' + a + '$, $t = 3$.', '$s = \\tfrac{1}{2} \\times ' + a + ' \\times 9 = ' + m2(s) + '$ m.'], apply: { kind: 'plan', phase: 'build', key: 'tempo', value: 'fast', say: 'A quick winger covers ' + m2(s) + ' m in 3 seconds: speed up the tempo of your build-up to use him' } },
      next: 'Do you want to see how forces make that acceleration happen, using Newton\'s second law?',
    };
  };
})();
