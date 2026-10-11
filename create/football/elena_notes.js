/*
 * What Elena says on each page of the match-preparation process, and the short explanations behind every statistical word she uses.
 *
 * The statistics are the ones a football analyst would reach for at that point in the preparation: describing the squad (mean, median, mode,
 * standard deviation, quartiles, outliers), reading passing and defending as proportions and conditional probabilities, expected goals and the
 * models behind them, then Monte Carlo experiments and hypothesis tests when a change is tested. A word that is a button opens its explanation in
 * her panel, with the formula and a worked example from your own numbers where there are any.
 *
 * FM.elenaNotes[page](ctx) returns the HTML for a page. FM.elenaExplain[id] is { title, min, html(ctx) } for a word.
 */
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LV = { gcse: 0, alevel: 1, above: 2 };
  const world = () => window.FM_WORLD || {};
  const league = () => world().league || null;
  const level = () => LV[(league() && league().tier) || 'gcse'] || 0;
  // A word that opens its explanation. At a lower level than `min` it is plain text, so each level meets only its own words.
  const kw = (id, label, min) => ((min && level() < LV[min]) ? esc(label || id) : '<button type="button" class="el-kw" data-explain="' + id + '">' + esc(label || id) + '</button>');
  const r2 = (x) => Math.round(x * 100) / 100;
  const fmt = (x) => (Number.isFinite(x) ? String(r2(x)) : '-');
  const pct = (x) => Math.round(x * 100) + '%';
  const share = (k, n) => (n ? pct(k / n) : '-');
  const F = (s) => '<div class="el-f">' + s + '</div>';
  const P = (s) => '<p>' + s + '</p>';
  const H = (s) => '<h4>' + esc(s) + '</h4>';

  // ---------- descriptive statistics ----------
  const med = (a) => { const n = a.length; if (!n) return NaN; return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2; };
  // Sorted values, mean, median, mode, range, population standard deviation, quartiles (the median of each half) and the outlier fences.
  function summary(vals) {
    const v = vals.slice().sort((a, b) => a - b), n = v.length;
    const mean = v.reduce((s, x) => s + x, 0) / Math.max(1, n);
    const count = {}; v.forEach((x) => { count[x] = (count[x] || 0) + 1; });
    const top = Math.max.apply(null, v.map((x) => count[x]));
    const modes = top > 1 ? Object.keys(count).filter((k) => count[k] === top).map(Number).sort((a, b) => a - b) : [];
    const devs = v.map((x) => x - mean), sq = devs.map((d) => d * d), ss = sq.reduce((s, x) => s + x, 0);
    const q1 = med(v.slice(0, Math.floor(n / 2))), q2 = med(v), q3 = med(v.slice(Math.ceil(n / 2)));
    const iqr = q3 - q1, lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
    return { v, n, mean, median: q2, modes, mode: modes.length === 1 ? modes[0] : null, range: v[n - 1] - v[0], devs, sq, ss, variance: ss / Math.max(1, n), sd: Math.sqrt(ss / Math.max(1, n)), q1, q3, iqr, lo, hi, out: v.filter((x) => x < lo || x > hi) };
  }
  FM.elenaSummary = summary;
  const list = (a) => a.map(fmt).join(', ');
  const lastTwo = (a) => (a.length > 1 ? a.slice(0, -1).map(fmt).join(', ') + ' and ' + fmt(a[a.length - 1]) : fmt(a[0]));

  // The example the squad page works through: the pace of the centre-backs (the group of defenders), as shown in the squad list.
  function hubExample(team) {
    const all = (team.players || []).concat(team.bench || []).filter((p) => p && p.ratings);
    const groups = [['CB', 'centre-backs', 'pace', 'speed'], ['FB', 'full-backs', 'pace', 'speed'], ['CM', 'central midfielders', 'passing', 'passing'], ['WF', 'wingers', 'pace', 'speed']];
    for (const g of groups) {
      const ps = all.filter((p) => p.natural === g[0]);
      if (ps.length >= 3) { const vals = ps.map((p) => FM.shown(p.ratings[g[2]])); return { code: g[0], name: g[1], stat: g[2], word: g[3], players: ps, vals, s: summary(vals) }; }
    }
    return null;
  }
  FM.elenaExample = null;

  // ---------- the explanations behind each word ----------
  const EX = (FM.elenaExplain = FM.elenaExplain || {});
  const ex = () => FM.elenaExample;
  const eg = () => { const e = ex(); return e ? e.s : summary([75, 75, 75, 72]); };
  const egWords = () => { const e = ex(); return e ? { name: e.name, word: e.word } : { name: 'centre-backs', word: 'speed' }; };

  EX.descriptive = { title: 'Descriptive statistics', html: () => P('A list of fifty numbers is hard to hold in your head. <b>Descriptive statistics</b> organise and summarise a dataset into a handful of numbers, so you can see it at a glance.') +
    P('There are two questions they answer. <b>Where is the middle?</b> That is the ' + kw('mean') + ', the ' + kw('median') + ' and the ' + kw('mode') + '. <b>How spread out is it?</b> That is the ' + kw('range') + ', the ' + kw('sd', 'standard deviation') + ' and the ' + kw('iqr', 'interquartile range') + '.') +
    P('And a summary lets you spot a value that does not fit with the rest: an ' + kw('outlier') + '.') };

  EX.mean = { title: 'The mean', html: () => { const s = eg(), w = egWords(); return P('The <b>mean</b> is the everyday "average": share the total out equally.') + F('mean = (sum of the values) ÷ (how many values)') +
    P('For the ' + esc(w.name) + ' and their ' + esc(w.word) + ' of ' + lastTwo(s.v.slice().reverse()) + ':') + F('(' + s.v.join(' + ') + ') ÷ ' + s.n + ' = ' + fmt(s.v.reduce((a, b) => a + b, 0)) + ' ÷ ' + s.n + ' = <b>' + fmt(s.mean) + '</b>') +
    P('The mean uses every value, so one very high or very low value pulls it. That is why we also look at the ' + kw('median') + '.'); } };

  EX.median = { title: 'The median', html: () => { const s = eg(); const mid = s.n % 2 ? 'The middle value of ' + s.n + ' is the ' + ((s.n + 1) / 2) + 'th: <b>' + fmt(s.median) + '</b>.' : 'With ' + s.n + ' values there are two in the middle (' + fmt(s.v[s.n / 2 - 1]) + ' and ' + fmt(s.v[s.n / 2]) + '), so take their mean: <b>' + fmt(s.median) + '</b>.';
    return P('The <b>median</b> is the middle value once the values are put in order.') + F('put them in order, then take the middle one<br>(with two in the middle, the mean of those two)') + P('In order: ' + list(s.v) + '. ' + mid) +
      P('An unusual value hardly moves the median, so it is a steadier "typical value" than the ' + kw('mean') + ' when there are extremes.'); } };

  EX.mode = { title: 'The mode', html: () => { const s = eg(); return P('The <b>mode</b> is the value that appears most often.') + F('mode = the most frequent value') +
    P(s.mode != null ? 'The values are ' + list(s.v) + '. The value ' + fmt(s.mode) + ' appears more often than any other, so the mode is <b>' + fmt(s.mode) + '</b>.' : s.modes.length > 1 ? 'The values are ' + list(s.v) + '. More than one value is equally common (' + list(s.modes) + '), so there is more than one mode.' : 'The values are ' + list(s.v) + '. Every value appears once, so there is no mode.') +
    P('A dataset can have one mode, several, or none. It is the only one of the three averages that also works for categories, such as the most common formation.'); } };

  EX.range = { title: 'The range', html: () => { const s = eg(); return P('The <b>range</b> is the distance from the smallest value to the largest: the simplest measure of spread.') + F('range = largest − smallest') +
    P(fmt(s.v[s.n - 1]) + ' − ' + fmt(s.v[0]) + ' = <b>' + fmt(s.range) + '</b>.') + P('It uses only two values, so one extreme value changes it a lot. The ' + kw('sd', 'standard deviation') + ' and the ' + kw('iqr', 'IQR') + ' are steadier.'); } };

  EX.sd = { title: 'The standard deviation', html: () => { const s = eg();
    const rows = '<table class="el-tbl"><tr><th>value</th><th>− mean</th><th>squared</th></tr>' + s.v.map((x, i) => '<tr><td>' + fmt(x) + '</td><td>' + fmt(x - s.mean) + '</td><td>' + fmt((x - s.mean) * (x - s.mean)) + '</td></tr>').join('') + '</table>';
    return P('The <b>standard deviation</b> is the typical distance of a value from the ' + kw('mean') + '. A small one means the values are bunched together; a large one means they are scattered.') +
      F('σ = √( Σ(x − mean)² ÷ n )') + P('Work it out one step at a time. The mean is ' + fmt(s.mean) + '. Subtract it from each value and square the result:') + rows +
      P('Add the squares: ' + fmt(s.ss) + '. Divide by ' + s.n + ': ' + fmt(s.variance) + ' (this is the <b>variance</b>). Take the square root:') + F('σ = √' + fmt(s.variance) + ' = <b>' + fmt(s.sd) + '</b>') +
      P('We square the differences so that values below the mean do not cancel the ones above it, then square-root to get back to the original units.') +
      (level() >= 1 ? P('When the numbers are a <i>sample</i> from a bigger population, divide by (n − 1) instead of n: ' + F('s = √( Σ(x − mean)² ÷ (n − 1) )') + 'This corrects for a sample\'s tendency to look less spread out than the population it came from. Here we have the whole group of defenders, so we divide by n.') : ''); } };

  EX.iqr = { title: 'Quartiles and the interquartile range', html: () => { const s = eg(), lowerHalf = s.v.slice(0, Math.floor(s.n / 2)), upperHalf = s.v.slice(Math.ceil(s.n / 2));
    return P('Put the values in order and cut them into four equal parts. The cut points are the <b>quartiles</b>. Q2 is the ' + kw('median') + '; Q1 is the median of the lower half, and Q3 the median of the upper half.') +
      F('IQR = Q3 − Q1') + P('In order: ' + list(s.v) + '.') +
      P('Lower half: ' + list(lowerHalf) + ', so Q1 = <b>' + fmt(s.q1) + '</b>. Upper half: ' + list(upperHalf) + ', so Q3 = <b>' + fmt(s.q3) + '</b>.') + F('IQR = ' + fmt(s.q3) + ' − ' + fmt(s.q1) + ' = <b>' + fmt(s.iqr) + '</b>') +
      P('The IQR is the width of the middle half of the data. Because it ignores the ends, an extreme value cannot stretch it. That is exactly what makes it useful for spotting an ' + kw('outlier') + '.'); } };

  EX.outlier = { title: 'Outliers', html: () => { const s = eg();
    return P('An <b>outlier</b> is a value that sits unusually far from the rest. A common test uses the ' + kw('iqr', 'quartiles') + ': anything more than 1.5 × IQR beyond Q1 or Q3 is an outlier.') +
      F('lower fence = Q1 − 1.5 × IQR<br>upper fence = Q3 + 1.5 × IQR') +
      P('For ' + list(s.v) + ': Q1 = ' + fmt(s.q1) + ', Q3 = ' + fmt(s.q3) + ', IQR = ' + fmt(s.iqr) + '.') + F('lower fence = ' + fmt(s.q1) + ' − 1.5 × ' + fmt(s.iqr) + ' = <b>' + fmt(s.lo) + '</b><br>upper fence = ' + fmt(s.q3) + ' + 1.5 × ' + fmt(s.iqr) + ' = <b>' + fmt(s.hi) + '</b>') +
      P(s.out.length ? 'The values outside ' + fmt(s.lo) + ' to ' + fmt(s.hi) + ' are ' + list(s.out) + ': ' + (s.out.length > 1 ? 'outliers.' : 'an outlier.') : 'Every value sits between ' + fmt(s.lo) + ' and ' + fmt(s.hi) + ', so there are <b>no outliers</b>. The lowest value, ' + fmt(s.v[0]) + ', is the smallest in the group, but it is not unusual.') +
      P('An outlier is not a mistake. It is the value worth a closer look: a player who is far quicker, or far weaker, than the others in his position. That is what Elena marks in green and red.') +
      (level() >= 1 ? P('Another rule you will meet marks values more than 2 standard deviations from the ' + kw('mean') + '. It works well for bell-shaped data, but one extreme value inflates the ' + kw('sd', 'standard deviation') + ', which can hide it. The quartile rule has no such problem.') : ''); } };

  // ----- proportions, conditional probability, sampling -----
  EX.proportion = { title: 'Proportions and relative frequency', html: () => { const S = stats(); const b = S && S.build.n >= 20 ? S.build : null, n = b ? b.n : 60, k = b ? b.ok : 48;
    return P('A <b>proportion</b> (also called a <b>relative frequency</b>) is the fraction of cases that did something.') + F('proportion = (number that did it) ÷ (number of cases)') +
      P('From your matches: ' + k + ' of ' + n + ' passes in your own third found a team-mate.') + F(k + ' ÷ ' + n + ' = <b>' + fmt(k / n) + '</b> (' + pct(k / n) + ')') +
      P('A proportion lets you compare groups of different sizes fairly: 8 out of 10 and 80 out of 100 are the same rate, but you can trust the second more. That leads to ' + kw('samplesize', 'sample size') + '.'); } };

  EX.conditional = { title: 'Conditional probability', html: () => { const S = stats(), b = S && S.build.tight.n >= 8 && S.build.free.n >= 8 ? S.build : null;
    const tn = b ? b.tight.n : 18, tok = b ? b.tight.ok : 10, fn = b ? b.free.n : 20, fok = b ? b.free.ok : 20;
    return P('A <b>conditional probability</b> is the chance of something <i>given</i> that something else is true. It is written P(A | B), "the probability of A given B".') + F('P(A | B) = (number with A and B) ÷ (number with B)') +
      P('Take A = "the pass is completed" and B = "the receiver is marked tightly". Of ' + tn + ' passes to a tightly marked receiver, ' + tok + ' were completed:') + F('P(completed | marked tightly) = ' + tok + ' ÷ ' + tn + ' = <b>' + fmt(tok / tn) + '</b>') +
      P('Of ' + fn + ' passes to a receiver with space, ' + fok + ' were completed: <b>' + fmt(fok / fn) + '</b>. The gap between the two is what tells you marking matters, and by how much.') +
      P('If the condition made no difference, the two conditional probabilities would match the overall proportion, and we would say the events are ' + kw('independent') + '.'); } };

  EX.independent = { title: 'Independent events', html: () => P('Two events are <b>independent</b> if knowing one tells you nothing about the other.') + F('A and B independent  ⇔  P(A | B) = P(A)') +
    P('If a pass is just as likely to be completed whether the receiver is marked or not, completion and marking are independent. If the ' + kw('conditional', 'conditional probabilities') + ' differ, they are not, and the marking is doing something.') };

  EX.samplesize = { title: 'Sample size', html: () => P('A result from a few cases can be a fluke. The more cases, the closer a ' + kw('proportion') + ' sits to the true underlying rate.') +
    P('Flip a fair coin 10 times and you can easily see 7 heads (70%). Flip it 1,000 times and you will almost always be within a few percent of 50%. This is the <b>law of large numbers</b>.') +
    (level() >= 1 ? F('standard error of a proportion = √( p(1 − p) ÷ n )') + P('Quadruple n and the standard error halves: you pay four times the data for twice the precision. See ' + kw('ci', 'confidence intervals') + '.') : P('That is why a finding from three matches should be held loosely, and one from thirty matches carries much more weight.')) };

  EX.ci = { title: 'Confidence intervals', min: 'alevel', html: () => { const S = stats(), b = S && S.all.n >= 40 ? S.all : null, n = b ? b.n : 100, k = b ? b.ok : 70, p = k / n, se = Math.sqrt(p * (1 - p) / n), lo = p - 1.96 * se, hi = p + 1.96 * se;
    return P('A <b>confidence interval</b> is a range that is likely to contain the true value, given the data you have.') + F('p ± 1.96 × √( p(1 − p) ÷ n )   (95% interval for a proportion)') +
      P('Your pass completion: p = ' + k + ' ÷ ' + n + ' = ' + fmt(p) + ' and the standard error is √(' + fmt(p) + ' × ' + fmt(1 - p) + ' ÷ ' + n + ') = ' + fmt(se) + '.') + F(fmt(p) + ' ± 1.96 × ' + fmt(se) + ' = <b>' + fmt(lo) + ' to ' + fmt(hi) + '</b>') +
      P('Read it as: the true completion rate is very probably between ' + pct(lo) + ' and ' + pct(hi) + '. More passes make the interval narrower. If two clubs\' intervals do not overlap, the difference is unlikely to be chance.'); } };

  EX.binomial = { title: 'The binomial distribution', min: 'alevel', html: () => P('When something either happens or does not on each of <i>n</i> independent tries, with the same chance <i>p</i> each time, the number of times it happens follows a <b>binomial distribution</b>, B(n, p).') +
    F('P(X = k) = C(n, k) × p<sup>k</sup> × (1 − p)<sup>n − k</sup>') + P('Mean = n p and standard deviation = √(n p (1 − p)). Passes completed, shots saved and tackles won all behave like this, which is what lets you say how surprising a count is.') };

  EX.normal = { title: 'The normal distribution', min: 'alevel', html: () => P('Many measurements pile up in a bell shape around the ' + kw('mean') + '. That is the <b>normal distribution</b>, set by its mean μ and ' + kw('sd', 'standard deviation') + ' σ.') +
    F('z = (x − μ) ÷ σ') + P('About 68% of values lie within 1σ of the mean, 95% within 2σ and 99.7% within 3σ. A <b>z-score</b> says how many standard deviations a value is from the mean, so a z-score beyond ±2 is unusual.') };

  EX.correlation = { title: 'Correlation', min: 'alevel', html: () => P('<b>Correlation</b> measures how closely two quantities move together, from −1 (opposite) through 0 (unrelated) to +1 (in step).') +
    F('r = Σ(x − x̄)(y − ȳ) ÷ √( Σ(x − x̄)² × Σ(y − ȳ)² )') + P('A strong correlation between, say, passes into the box and shots does not prove one causes the other: both may follow how long the team has the ball.') };

  // ----- expected goals and the models behind it -----
  EX.xg = { title: 'Expected goals (xG)', html: () => { const S = stats(), sh = S && S.shots.n >= 10 ? S.shots : null;
    return P('<b>Expected goals</b> give each shot a probability of being a goal, from where and how it was taken. A shot with xG 0.30 goes in about 3 times in 10.') + F('xG of a match = sum of the xG of every shot') +
      (sh ? P('In your matches: ' + sh.n + ' shots worth ' + fmt(sh.xg) + ' xG, and ' + sh.goals + ' goals. The mean xG per shot is ' + fmt(sh.xg / sh.n) + '.') : '') +
      P('Goals are rare and lumpy, so a single result is a noisy measure. xG measures the <i>quality of the chances</i>, which is far steadier. If xG and goals disagree over a few matches, it is usually luck, not skill.'); } };

  EX.poisson = { title: 'The Poisson distribution', min: 'alevel', html: () => { const l = 1.4, row = [0, 1, 2, 3, 4].map((k) => { let f = 1; for (let i = 2; i <= k; i++) f *= i; return [k, Math.exp(-l) * Math.pow(l, k) / f]; });
    return P('Goals arrive one at a time, at random, at a fairly steady average rate λ per match. A count like that follows a <b>Poisson distribution</b>.') + F('P(X = k) = e<sup>−λ</sup> × λ<sup>k</sup> ÷ k!') +
      P('If a team is expected to score 1.4 goals, the chance of exactly k:') + '<table class="el-tbl"><tr><th>goals</th>' + row.map((r) => '<th>' + r[0] + '</th>').join('') + '</tr><tr><td>chance</td>' + row.map((r) => '<td>' + pct(r[1]) + '</td>').join('') + '</tr></table>' +
      P('Even a good attack scores nothing about one match in four. That is why a single scoreline tells you so little.'); } };

  EX.logistic = { title: 'Logistic regression', min: 'above', html: () => P('A probability must stay between 0 and 1, so we cannot model it with a straight line. <b>Logistic regression</b> fits a straight line to the <i>log-odds</i> instead, then turns that back into a probability.') +
    F('log( p ÷ (1 − p) ) = b<sub>0</sub> + b<sub>1</sub>x<sub>1</sub> + b<sub>2</sub>x<sub>2</sub> + …<br>p = 1 ÷ (1 + e<sup>−(b<sub>0</sub> + b<sub>1</sub>x<sub>1</sub> + …)</sup>)') +
    P('An expected-goals model is exactly this: x<sub>1</sub> might be the distance to goal and x<sub>2</sub> the angle, and each shot in a large dataset is a 1 (goal) or 0 (no goal). Each coefficient says how the log-odds change for one more unit of that factor, with the others held fixed. A negative b<sub>1</sub> for distance says: the further out, the lower the chance.') +
    P('The same tool answers other yes/no questions in preparation: the chance a pass is completed given the pressure on the receiver and its length, or the chance a press wins the ball given how close the nearest player is.') };

  EX.bayes = { title: "Bayes' theorem", min: 'above', html: () => P('<b>Bayes\' theorem</b> turns a conditional probability around: from P(evidence | idea) to P(idea | evidence).') + F('P(A | B) = P(B | A) × P(A) ÷ P(B)') +
    P('A counter-attack makes a shot likely, but what you actually see is a shot. Bayes tells you how likely it was a counter given a shot, which depends on how common counters are in the first place (the <i>prior</i>). New evidence updates a prior into a <i>posterior</i>, and that is how a scout\'s opinion should change as matches are played.') };

  EX.chisq = { title: 'Chi-squared test', min: 'above', html: () => P('A <b>chi-squared test</b> asks whether counts in a table differ from what you would expect if the two things were unrelated.') + F('χ² = Σ (observed − expected)² ÷ expected') +
    P('For "passes completed or not" against "receiver marked or free", the expected count in each cell comes from the row and column totals. The larger χ² is, the less likely it is that marking and completion are independent.') };

  // ----- testing -----
  EX.montecarlo = { title: 'Monte Carlo simulation', html: () => P('A <b>Monte Carlo</b> experiment answers "what happens if…?" by running the situation many times with the luck re-drawn each time, then looking at what came out.') +
    P('One match is one random draw. A hundred runs of the same plan show you the <i>spread</i> of what can happen: how often you score, how often you lose the ball in your third, how often you win. The share of runs that end a given way estimates its probability.') + F('estimated probability = (runs where it happened) ÷ (runs)') +
    P('This is how analysts test a tactic without needing a season of real matches. It is only as good as the model behind it, so it is a way to compare plans, not to predict a result.') };

  EX.lln = { title: 'More runs, a steadier answer', html: () => P('Each run has its own luck, so two sets of 100 runs never agree exactly. How far apart they typically are shrinks as you add runs:') + F('standard error = √( p(1 − p) ÷ runs )') +
    P('With 100 runs and p = 0.4 the standard error is about 0.05, so ± 10 percentage points covers most of the noise. With 400 runs it halves to 0.025. Compare two plans with enough runs that the difference you see is bigger than that noise.') };

  EX.hypothesis = { title: 'Hypothesis tests', min: 'alevel', html: () => P('A <b>hypothesis test</b> asks whether a difference you see could just be luck. Start by assuming nothing changed.') +
    F('H<sub>0</sub>: the change made no difference<br>H<sub>1</sub>: it did') +
    P('Then ask: <i>if</i> H<sub>0</sub> were true, how surprising would a result like mine be? That probability is the ' + kw('pvalue', 'p-value') + '. If it is below the significance level (commonly 5%), the result is too surprising to be luck and you reject H<sub>0</sub>.') +
    P('Failing to reject H<sub>0</sub> does not prove the plans are the same. It only says this evidence is not strong enough.') };

  EX.pvalue = { title: 'The p-value', min: 'alevel', html: () => P('The <b>p-value</b> is the probability of seeing a result at least as extreme as yours <i>if there were really no difference</i>.') + F('p-value = P( result this extreme or more | H<sub>0</sub> true )') +
    P('A p-value of 0.03 means: if the two plans were truly equal, a gap this big would happen about 3 times in 100. It is <b>not</b> the probability that your tactic works, and a small p-value does not say the difference is large enough to matter.') +
    (level() >= 2 ? P('Run many tests and some will fall under 0.05 by chance alone: test 20 unrelated things and you expect one false alarm. See ' + kw('multiple', 'multiple testing') + '.') : '') };

  EX.effect = { title: 'Effect size', min: 'alevel', html: () => P('A tiny difference can be "significant" with enough data and still not matter. The <b>effect size</b> says how big it is, relative to the natural spread:') + F("Cohen's d = (mean<sub>1</sub> − mean<sub>2</sub>) ÷ pooled standard deviation") +
    P('Around 0.2 is small, 0.5 medium, 0.8 large. Ask both: is it unlikely to be luck (the ' + kw('pvalue', 'p-value') + '), and is it big enough to be worth changing the plan (the effect size)?') };

  EX.multiple = { title: 'Multiple testing', min: 'above', html: () => P('Each test at the 5% level has a 1-in-20 chance of a false alarm. Run 20 tests and the chance of at least one is 1 − 0.95<sup>20</sup> ≈ 64%.') + F('Bonferroni: test each at α ÷ (number of tests)') +
    P('So 20 tests each need p < 0.0025 to keep the overall false-alarm rate at 5%. A result found by searching through many comparisons deserves much less trust than one you predicted in advance.') };

  // the numbers behind the examples, from the matches played so far (this season, the friendlies and last season)
  function stats() { const lg = league(); try { return lg && FM.phaseStats ? FM.phaseStats(lg) : null; } catch (e) { return null; } }
  FM.elenaStatsNow = stats;

  // ---------- the notes for each page ----------
  const N = (FM.elenaNotes = FM.elenaNotes || {});

  // The squad page: descriptive statistics, worked through on the players' own numbers.
  N.hub = (c) => {
    const team = c.team, e = hubExample(team); FM.elenaExample = e;
    const nm = FM.userNameNow ? FM.userNameNow() : '';
    let h = P((nm ? esc(nm) + ', that' : 'That') + ' is a lot to take in at once, isn\'t it?') + P('Do not worry. This is exactly what the next few minutes are for.') +
      P('That is why statisticians use ' + kw('descriptive', 'descriptive statistics') + '. They organise and summarise a dataset, and it is worth going through some now.');
    if (e) {
      const s = e.s;
      h += P('Look at the defenders first. Each player has his own set of numbers, and instead of studying them one by one and trying to remember them, we can summarise.') +
        P('Start with ' + esc(e.word) + '. The ' + esc(e.name) + ' have ' + esc(e.word) + 's of ' + lastTwo(s.v.slice().reverse()) + '.') +
        P('In this dataset the ' + kw('mode') + ' is ' + (s.mode != null ? fmt(s.mode) : 'not defined') + ', the ' + kw('median') + ' is ' + fmt(s.median) + ' and the ' + kw('mean') + ' is ' + fmt(s.mean) + '. The ' + kw('sd', 'standard deviation') + ' is ' + fmt(s.sd) +
          ' and the ' + kw('iqr', 'IQR') + ' is ' + fmt(s.iqr) + ', so the fences are ' + fmt(s.lo) + ' and ' + fmt(s.hi) + ', and hence ' + (s.out.length ? 'there ' + (s.out.length > 1 ? 'are ' + s.out.length + ' outliers' : 'is one ' + kw('outlier')) : 'there are no ' + kw('outlier', 'outliers')) + '.') +
        (s.out.length ? '' : P('The lowest, ' + fmt(s.v[0]) + ', is the smallest in the group but it is not unusual, so it is not marked.'));
    }
    // outliers against every player in the league in the same position
    const h2 = FM.squadHighlights ? FM.squadHighlights(team) : { picks: [] }, picks = h2.picks.slice().sort((a, b) => b.z - a.z);
    h += H('Against the rest of the league');
    h += P('A squad of four is a small group to judge a player against. So each player is also compared with every player in the league who plays his position. A value beyond the ' + kw('outlier', 'outlier fences') + ' of that group is marked red (unusually low) or green (unusually high) in the list.');
    if (!picks.length) h += P('Nobody in your squad is an outlier for his position, so nothing is marked. That is itself a finding: no glaring weakness to protect and no single player who is far beyond the rest.');
    else {
      h += P(picks.length === 1 ? 'One number is an outlier:' : picks.length + ' numbers are outliers:');
      const items = picks.map((c1) => '<li class="' + c1.kind + '">' + (FM.squadMeaning ? FM.squadMeaning(c1) : '') + ' <span class="sq-chip ' + c1.kind + '">' + esc(c1.label || c1.s) + ' ' + fmt(c1.val) + '</span><br><span class="el-small">' + c1.n + ' ' + esc(c1.groupName) + ' in the league: Q1 = ' + fmt(c1.q1) + ', Q3 = ' + fmt(c1.q3) + ', fences ' + fmt(c1.lo) + ' to ' + fmt(c1.hi) + '.</span></li>').join('');
      h += '<ul class="el-list">' + items + '</ul>';
    }
    h += P('When you have read the list, go on to the formation.');
    return h;
  };

  // Squad and formation: comparing the lines with the same summaries.
  N.squad = (c) => {
    const team = c.team; if (!team) return '';
    const by = (grp) => team.players.filter((p) => grp.indexOf(p.group) >= 0).map((p) => FM.playerRating(p));
    const lines = [['Defence', ['CB', 'FB']], ['Midfield', ['DM', 'CM', 'AM']], ['Attack', ['WF', 'ST']]].map(([n, g]) => [n, summary(by(g))]).filter((x) => x[1].n);
    let h = P('A formation is three numbers, and so is your squad: how many are in defence, midfield and attack. To choose, compare the <b>lines</b> with the summaries you have just met.');
    if (lines.length) h += '<table class="el-tbl"><tr><th>Line</th><th>Players</th><th>' + 'Mean rating' + '</th><th>Range</th></tr>' + lines.map(([n, s]) => '<tr><td>' + n + '</td><td>' + s.n + '</td><td>' + fmt(s.mean) + '</td><td>' + fmt(s.range) + '</td></tr>').join('') + '</table>' +
      P('The ' + kw('mean') + ' tells you how strong a line is. The ' + kw('range') + ' tells you whether it is even, or whether one player is dragging it down. A line with a high mean and a small range is dependable; a high mean with a big range hides a weak link.');
    h += P('Put more players where the squad is strongest, and think about who will be left one-on-one against a quick forward. Drag one player onto another to swap them; the bench is on the right.');
    return h;
  };

  const needs = (n, S) => P('There are not enough matches to say much yet (' + (S ? S.matches : 0) + ' so far). The numbers fill in as you play.');
  N.build = () => {
    const S = stats(), b = S && S.build.n >= 20 ? S.build : null;
    let h = P('Building from the back is about <b>keeping the ball</b>, so the number to watch is how often a pass is completed: a ' + kw('proportion') + '.');
    if (!b) return h + needs(0, S);
    h += P('In your own third you have played <b>' + b.n + '</b> passes and <b>' + share(b.ok, b.n) + '</b> found a team-mate.');
    h += P('The more useful question is what changes that. The chance a pass works <i>given</i> that the receiver is marked tightly is a ' + kw('conditional', 'conditional probability') + ':');
    h += '<table class="el-tbl"><tr><th>Receiver…</th><th>Completed</th><th>Share</th></tr>' +
      [['marked tightly (under 5 m)', b.tight], ['with a defender 5 to 10 m away', b.mid], ['with space (10 m or more)', b.free]].map(([l, x]) => '<tr><td>' + l + '</td><td>' + x.ok + ' of ' + x.n + '</td><td><b>' + share(x.ok, x.n) + '</b></td></tr>').join('') + '</table>';
    h += P('That is where your build-up shape earns its keep: positions that leave the receiver with space. Check each figure\'s ' + kw('samplesize', 'sample size') + ' before trusting it' + (level() >= 1 ? ', and its ' + kw('ci', 'confidence interval') + '.' : '.'));
    return h;
  };

  N.midfield = () => {
    const S = stats(), b = S && S.midfield.n >= 20 ? S.midfield : null;
    let h = P('Through midfield the question is about <b>lanes</b>: is there a defender on the line between the passer and the receiver?');
    if (!b) return h + needs(0, S);
    const pc = b.lane.cut, pl = b.lane.clear;
    h += P('Of the ' + b.n + ' midfield passes, ' + share(b.ok, b.n) + ' arrived. Split by the lane:');
    h += '<table class="el-tbl"><tr><th>Lane</th><th>Completed</th><th>Share</th></tr><tr><td>defender within 1.5 m of the line</td><td>' + pc.ok + ' of ' + pc.n + '</td><td><b>' + share(pc.ok, pc.n) + '</b></td></tr><tr><td>clear (1.5 m or more)</td><td>' + pl.ok + ' of ' + pl.n + '</td><td><b>' + share(pl.ok, pl.n) + '</b></td></tr></table>';
    h += P('If the lane made no difference these two shares would match the overall ' + share(b.ok, b.n) + ' and the events would be ' + kw('independent') + '. The gap is the lane\'s effect.');
    if (level() >= 1) h += P('Put a number on how sure you can be: a ' + kw('ci', 'confidence interval') + ' for each share, and for the difference between them. If the intervals do not overlap, the gap is unlikely to be chance.');
    if (level() >= 2) h += P('To account for several things at once (the lane, the pressure and the length of the pass), a ' + kw('logistic', 'logistic regression') + ' puts them in one model.');
    return h;
  };

  N.final = () => {
    const S = stats(), sh = S && S.shots.n >= 8 ? S.shots : null, f = S && S.final.n >= 20 ? S.final : null;
    let h = P('In the final third the currency is the <b>chance</b>. Goals are too rare to learn from quickly, so analysts count ' + kw('xg', 'expected goals') + ' instead: how good each shot was.');
    if (f) h += P('You have played ' + f.n + ' passes in the attacking third, ' + share(f.ok, f.n) + ' completed.');
    if (sh) h += P('You have had <b>' + sh.n + '</b> shots, worth <b>' + fmt(sh.xg) + '</b> expected goals (a ' + kw('mean') + ' of ' + fmt(sh.xg / sh.n) + ' per shot) and scored <b>' + sh.goals + '</b>. If those two disagree, it is mostly luck: goals arrive at random.');
    else h += needs(0, S);
    if (level() >= 1) h += P('How many goals a team scores in a match is modelled by a ' + kw('poisson', 'Poisson distribution') + ': even a strong attack scores nothing about one match in four.');
    if (level() >= 2) h += P('Where the xG of each shot comes from is a ' + kw('logistic', 'logistic regression') + ' on distance, angle and the situation of the shot.');
    return h;
  };

  N.transdef = () => {
    const S = stats(), l = S && S.losses.n >= 10 ? S.losses : null;
    let h = P('The moments after losing the ball are the most dangerous. The question is a ' + kw('conditional', 'conditional probability') + ': how likely is a shot against <i>given</i> where the ball was lost?');
    if (!l) return h + needs(0, S);
    h += '<table class="el-tbl"><tr><th>Ball lost…</th><th>Shot within 15 s</th><th>Share</th></tr><tr><td>in your own third</td><td>' + l.own.shot + ' of ' + l.own.n + '</td><td><b>' + share(l.own.shot, l.own.n) + '</b></td></tr><tr><td>anywhere else</td><td>' + l.else.shot + ' of ' + l.else.n + '</td><td><b>' + share(l.else.shot, l.else.n) + '</b></td></tr></table>';
    h += P('Overall you gave it away ' + l.n + ' times and the other side shot within 15 seconds after ' + share(l.shot, l.n) + ' of them. A counter-press is worth it where that share is high. Mind the ' + kw('samplesize', 'sample size') + ': some of these counts are small.');
    if (level() >= 2) h += P(kw('bayes', "Bayes' theorem") + ' turns this round: given that a shot came, how likely was it that the ball was lost in your third?');
    return h;
  };

  N.organised = () => {
    const S = stats(), t = S && S.tackles.n >= 8 ? S.tackles : null, d = S && S.defend.n >= 20 ? S.defend : null;
    let h = P('Defending in shape is judged by what the opposition manage to do against it. Again the building block is a ' + kw('proportion') + '.');
    if (d) h += P('Their passes in your defensive third: <b>' + d.n + '</b>, of which ' + share(d.ok, d.n) + ' were completed. When their receiver had space ' + share(d.free.ok, d.free.n) + ' were completed; when he was marked tightly, ' + share(d.tight.ok, d.tight.n) + '.');
    if (t) h += P('You made <b>' + S.tackles.n + '</b> challenges and won <b>' + share(S.tackles.won, S.tackles.n) + '</b>' + (S.tackles.ownThird.n ? ', and in your own third ' + share(S.tackles.ownThird.won, S.tackles.ownThird.n) + ' of ' + S.tackles.ownThird.n + '.' : '.'));
    if (!d && !t) return h + needs(0, S);
    if (level() >= 1) h += P('Challenges won out of challenges made is a count of successes in a fixed number of tries, so it follows a ' + kw('binomial', 'binomial distribution') + '. That lets you say how surprising a tackling record is, and put a ' + kw('ci', 'confidence interval') + ' on it.');
    return h;
  };

  N.transatt = () => {
    const S = stats(), w = S && S.wins.n >= 10 ? S.wins : null;
    let h = P('Winning the ball is only useful if it becomes a chance. The question: how likely is a shot within 15 seconds <i>given</i> where the ball was won (a ' + kw('conditional', 'conditional probability') + ')?');
    if (!w) return h + needs(0, S);
    h += '<table class="el-tbl"><tr><th>Ball won…</th><th>Shot within 15 s</th><th>Share</th></tr><tr><td>in their half</td><td>' + w.high.shot + ' of ' + w.high.n + '</td><td><b>' + share(w.high.shot, w.high.n) + '</b></td></tr><tr><td>in your half</td><td>' + w.low.shot + ' of ' + w.low.n + '</td><td><b>' + share(w.low.shot, w.low.n) + '</b></td></tr></table>';
    h += P('A big gap says where pressing pays. A small number of cases says to be careful: look at the ' + kw('samplesize', 'sample size') + ' before changing anything.');
    return h;
  };

  N.setpieces = () => {
    let h = P('Set pieces are rare, so each routine has only a handful of cases. That is exactly when a pattern is easiest to imagine and hardest to trust: a ' + kw('samplesize', 'small sample') + ' can show a routine "working" three times in four by pure luck.');
    h += P('Treat each routine as a count of successes in a few tries and be slow to draw conclusions from it.');
    if (level() >= 1) h += P('The number of goals from set pieces over a season is a count of rare events, which a ' + kw('poisson', 'Poisson distribution') + ' describes well.');
    return h;
  };

  // The testing phase.
  N.test = (c) => {
    const n = (c && c.runs && c.runs.length) || 0;
    let h = P('Until now you have looked at what <i>has</i> happened. Testing asks what <i>would</i> happen with a plan, and whether a change really helps.');
    h += P('Each run plays your plan many times against the next opponent, with the luck drawn again every time: a ' + kw('montecarlo', 'Monte Carlo experiment') + '. The share of runs that end a given way estimates how likely it is.');
    h += P('Two sets of runs never agree exactly. How close they are depends on how many runs there are (' + kw('lln', 'more runs, a steadier answer') + ').');
    if (level() >= 1) h += P('To decide whether a change helped, set up a ' + kw('hypothesis', 'hypothesis test') + ': assume nothing changed, then see how surprising your result would be (the ' + kw('pvalue', 'p-value') + ') and how big the difference is (the ' + kw('effect', 'effect size') + ').');
    if (level() >= 2) h += P('If you test many changes, some will look significant by luck. Plan the comparison before you run it, and allow for ' + kw('multiple', 'multiple testing') + '.');
    if (n) h += P('You have run <b>' + n + '</b> test' + (n === 1 ? '' : 's') + ' so far. Change one thing at a time so you know what caused a difference.');
    return h;
  };

  N.evidence = () => {
    let h = P('This page puts the opposition under the microscope: what they have done, from the matches they have played.');
    h += P('Averages hide how often something happens, so look at the spread as well as the ' + kw('mean') + ': a club that usually presses high but varies a lot is hard to plan for.');
    if (level() >= 1) h += P('Every average here comes with a ' + kw('ci', 'confidence interval') + ': the wider it is, the less reliable the average.');
    h += P('This is a report of what they did, not what they will do. Treat three matches as a clue, not a fact (' + kw('samplesize', 'sample size') + ').');
    return h;
  };

  N.preview = () => {
    const S = stats(); const lam = S && S.matches ? (S.shots.xg / S.matches) : 1.3;
    let h = P('Before the match, translate your preparation into expectations. A team\'s expected goals is its average rate; the goals actually scored then scatter around it at random.');
    if (level() >= 1) {
      const row = [0, 1, 2, 3].map((k) => { let f = 1; for (let i = 2; i <= k; i++) f *= i; return [k, Math.exp(-lam) * Math.pow(lam, k) / f]; });
      h += P('With an expectation of ' + fmt(lam) + ' goals, a ' + kw('poisson', 'Poisson distribution') + ' gives the chance of each scoreline: ' + row.map((r) => r[0] + ' goals ' + pct(r[1])).join(', ') + '.');
    } else h += P('An average of ' + fmt(lam) + ' expected goals a match still means some matches with none. One result is a ' + kw('samplesize', 'sample') + ' of one.');
    h += P('Whatever happens, the result is not the verdict on the plan: compare the ' + kw('xg', 'expected goals') + ' on both sides afterwards.');
    return h;
  };

  N.analysis = () => {
    let h = P('One match is a single draw. What you want from it is information about the plan, so look at the chances created and conceded (' + kw('xg', 'expected goals') + ') and not only the score.');
    h += P('Compare this match with the one before using the same summaries: the ' + kw('mean') + ' and ' + kw('sd', 'standard deviation') + ' across matches show what is typical and how much it swings.');
    if (level() >= 1) h += P('A ' + kw('hypothesis', 'hypothesis test') + ' across several matches is what tells a real improvement from a lucky one.');
    return h;
  };
})();
