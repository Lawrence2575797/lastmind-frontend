/*
 * Elena's statistics lessons for the tactics workspace. Each one is built for a level (GCSE, A-level, beyond) and starts a step below it:
 * the GCSE lessons start from what a Year 9 student knows, the A-level ones from what a GCSE student knows, the last set from A-level.
 * Every line is one small step, and every formula is derived from the line before it. The numbers are the student's own where the matches
 * have been played, and plainly labelled examples where they have not.
 */
(function () {
  const FM = (window.FM = window.FM || {});
  const f = (s) => ({ f: s });                                    // a formula, on its own line
  const tb = (head, rows) => ({ table: { head, rows } });         // a small table
  const r1 = (x) => Math.round(x * 10) / 10, r2 = (x) => Math.round(x * 100) / 100, r3 = (x) => Math.round(x * 1000) / 1000, P = (x) => Math.round(x * 100);

  // ---------- the numbers a lesson uses ----------
  // The student's own build-up passes if there are enough of them, and a clearly marked example otherwise.
  FM.lessonData = function () {
    const lg = window.FM_WORLD && FM_WORLD.league, S = lg && FM.phaseStats ? FM.phaseStats(lg) : null;
    const b = S && S.build.n >= 20 && S.build.tight.n >= 8 && S.build.free.n >= 8 ? S.build : null;
    const ex = { n: 60, ok: 48, tight: { n: 18, ok: 10 }, mid: { n: 22, ok: 18 }, free: { n: 20, ok: 20 }, len: [18, 24, 31, 12, 27, 22, 35, 16] };
    const s = b || ex;
    const lens = (s.len || ex.len).slice(0, 8).map((x) => Math.round(x));
    while (lens.length < 5) lens.push(20);
    const n = s.n, ok = s.ok, tn = s.tight.n, tok = s.tight.ok, fn = s.free.n, fok = s.free.ok, mn = s.mid.n, mok = s.mid.ok;
    return { real: !!b, n, ok, p: ok / n, tn, tok, mn, mok, fn, fok, pT: tn ? tok / tn : 0, pF: fn ? fok / fn : 0, lens: lens.slice(0, 5), mean: FM.phaseStatsHelpers ? FM.phaseStatsHelpers.mean(s.len || ex.len) : 22 };
  };
  const who = (D) => (D.real ? 'your' : 'an example set of');
  const own = (D) => (D.real ? 'Across last season, the pre-season friendlies and this season so far, you played ' + D.n + ' passes from your own third.' : 'Here is an example, because you have not played enough matches yet: 60 passes from the back.');

  // ---------- the binomial, for the tests ----------
  const LF = [0]; for (let i = 1; i <= 2000; i++) LF[i] = LF[i - 1] + Math.log(i);
  const pmf = (n, k, p) => (k < 0 || k > n ? 0 : Math.exp(LF[n] - LF[k] - LF[n - k] + k * Math.log(p) + (n - k) * Math.log(1 - p)));
  const tailGE = (n, k, p) => { let s = 0; for (let i = k; i <= n; i++) s += pmf(n, i, p); return s; };
  FM.binomTailGE = tailGE;
  const phi = (z) => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), pr = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - pr : pr; };

  // ---------- the lessons ----------
  const L = [];

  // 1. a share
  L.push({ id: 'proportion', title: 'Turning a count into a share', blurb: 'Why 48 of 60 means more than 48', steps: {
    gcse: (D) => [
      { say: [own(D), D.ok + ' of them found a team-mate.', 'Another match might have 40 passes in the same part of the pitch, or 90.', 'So a count on its own cannot be compared. We want one number that does not care how many passes there were.'],
        q: 'What do we do with ' + D.ok + ' and ' + D.n + ' to get that number?',
        options: [{ t: 'Divide ' + D.ok + ' by ' + D.n, ok: true }, { t: 'Take ' + D.ok + ' away from ' + D.n, hint: 'That gives the passes that failed, which still depends on how many passes there were.' }, { t: 'Add them together', hint: 'Adding makes the number bigger the more passes you play, which is the problem we are trying to remove.' }],
        why: ['The share that worked is the count that worked divided by the total.', f(D.ok + ' ÷ ' + D.n + ' = ' + r2(D.p)), 'Multiply by 100 to read it as a percentage.', f(r2(D.p) + ' × 100 = ' + P(D.p) + '%')],
        name: ['A count divided by the total is called a **proportion**. As a percentage it is the one number you can put next to another match.'] },
      { say: ['Another match: 36 of 48 passes from the back worked.', 'We want the percentage.'],
        q: 'What percentage of those passes worked?', num: { answer: 75, tol: 0, unit: '%' },
        why: [f('36 ÷ 48 = 0.75'), f('0.75 × 100 = 75%')] },
      { say: ['Match A: 30 of 40 passes worked.', 'Match B: 45 of 80 passes worked.', 'Match B has more passes that worked, 45 against 30.'],
        q: 'Which match was better at keeping the ball?',
        options: [{ t: 'Match B, because 45 is more than 30', hint: 'B also had twice as many passes to try.' }, { t: 'Match A, because 30 ÷ 40 = 0.75 is more than 45 ÷ 80 = 0.56', ok: true }, { t: 'They are the same', hint: 'Work out each share.' }],
        why: [f('30 ÷ 40 = 0.75'), f('45 ÷ 80 = 0.5625'), 'A got 75 passes in every 100 to work. B only got 56.', 'The count told you the wrong story. The proportion told you the right one.'] },
      { final: true, say: ['Over the long run, the proportion of passes that work settles down to a steady value.', 'That steady value is the chance that the next pass works.', 'Your ' + (D.real ? '' : 'example ') + 'proportion is ' + P(D.p) + '%.'],
        q: 'Playing 200 more passes in the same way, about how many would you expect to work?', num: { answer: Math.round(D.p * 200), tol: 5, unit: ' passes' },
        why: [f(r2(D.p) + ' × 200 = ' + Math.round(D.p * 200)), 'It is an estimate. The next lessons are about how far wrong an estimate like this can be.'] },
    ],
    alevel: (D) => [
      { say: [own(D), D.ok + ' of them found a team-mate.', 'Write the number of passes as n, and the number that worked as X.', f('n = ' + D.n + ',  X = ' + D.ok), 'The share that worked is the sample proportion, written p̂ ("p-hat").', f('p̂ = X ÷ n = ' + D.ok + ' ÷ ' + D.n + ' = ' + r3(D.p))],
        q: 'If X were ' + (D.ok + 6) + ' out of the same ' + D.n + ' passes, what would p̂ be (as a percentage)?', num: { answer: Math.round(((D.ok + 6) / D.n) * 100), tol: 1, unit: '%' },
        why: [f((D.ok + 6) + ' ÷ ' + D.n + ' = ' + r3((D.ok + 6) / D.n))], name: ['p̂ is a **sample proportion**: a share measured in the passes you actually played.'] },
      { say: ['Each pass either works or it does not.', 'Suppose the true chance that a pass works is p, the same for every pass, and the passes do not affect each other.', 'Then X, the number that work out of n, follows a binomial distribution.', f('X ~ B(n, p)')],
        q: 'If p = 0.8 and n = 50, how many passes would you expect to work on average?', num: { answer: 40, tol: 0, unit: ' passes' },
        why: ['Each pass contributes p to the average count.', 'There are n passes, so the average count is n lots of p.', f('E(X) = n × p = 50 × 0.8 = 40')], name: ['n × p is the **mean of a binomial**, E(X).'] },
      { say: ['The sample proportion is the count divided by n.', f('p̂ = X ÷ n'), 'So its average value is the average of X divided by n.', f('E(p̂) = E(X) ÷ n = np ÷ n = p')],
        q: 'What does E(p̂) = p tell you about a sample proportion?',
        options: [{ t: 'On average it lands on the true value, though any single one is off by luck', ok: true }, { t: 'It is always exactly equal to p', hint: 'It is the average over many samples that equals p, not each sample.' }, { t: 'It is always bigger than p', hint: 'Nothing in the working pushes it up.' }],
        why: ['Averaged over many repeats, p̂ neither over- nor under-shoots.', 'That is the reason we use it as our best estimate of p.', 'How far one p̂ can stray is the next question, and it is the whole idea behind testing a tactic.'], name: ['An estimate that is right on average is called **unbiased**.'] },
      { final: true, say: ['You measured p̂ = ' + r2(D.p) + ' from ' + D.n + ' passes.', 'A teammate says: "So the chance a pass works is ' + P(D.p) + '%."'],
        q: 'What is the most accurate reply?',
        options: [{ t: '"' + P(D.p) + '% is our best estimate of the chance, and a different set of ' + D.n + ' passes would give a different p̂."', ok: true }, { t: '"Yes, that is exactly the chance."', hint: 'p̂ is a measurement from one sample.' }, { t: '"It means nothing with only ' + D.n + ' passes."', hint: 'It means something. It just carries a margin.' }],
        why: ['p̂ estimates p. The estimate is unbiased, and it wobbles from sample to sample.'] },
    ],
    above: (D) => [
      { say: [own(D), 'Let each pass be a Bernoulli trial B, equal to 1 if it works and 0 if it does not, with P(B = 1) = p.', f('E(B) = 1 × p + 0 × (1 − p) = p'), 'To find its variance we need E(B²).', 'B only takes 0 or 1, so B² = B.', f('E(B²) = E(B) = p')],
        q: 'Using Var(B) = E(B²) − [E(B)]², what is Var(B) in terms of p?',
        options: [{ t: 'p(1 − p)', ok: true }, { t: 'p²', hint: 'That is [E(B)]², the part we subtract.' }, { t: 'p − 2p', hint: 'Subtract p² from p and factorise.' }],
        why: [f('Var(B) = p − p² = p(1 − p)')], name: ['p(1 − p) is the variance of a single trial. It is biggest at p = ½ and zero at p = 0 or 1.'] },
      { say: ['X, the number that work in n independent passes, is the sum of n of these trials.', 'The variance of a sum of independent variables is the sum of their variances.', f('Var(X) = n × p(1 − p)'), 'The sample proportion divides X by n, and dividing by n divides the variance by n².', f('Var(p̂) = Var(X) ÷ n² = p(1 − p) ÷ n')],
        q: 'With p = ' + r2(D.p) + ' and n = ' + D.n + ', what is the standard deviation of p̂, in percentage points?', num: { answer: Math.round(Math.sqrt(D.p * (1 - D.p) / D.n) * 1000) / 10, tol: 0.3, unit: ' points' },
        why: [f('√(' + r2(D.p) + ' × ' + r2(1 - D.p) + ' ÷ ' + D.n + ') = ' + r3(Math.sqrt(D.p * (1 - D.p) / D.n))), 'So one sample proportion typically sits about ' + r1(Math.sqrt(D.p * (1 - D.p) / D.n) * 100) + ' points from the truth.'], name: ['This is the **standard error** of a proportion.'] },
      { final: true, say: ['The standard error is √(p(1 − p) ÷ n).', 'A manager wants it halved.'],
        q: 'By what factor must the number of tests n increase?', num: { answer: 4, tol: 0, unit: ' times' },
        why: [f('√(p(1 − p) ÷ 4n) = ½ × √(p(1 − p) ÷ n)'), 'Halving the error needs four times the tests. That square root is the reason accurate answers are expensive.'] },
    ],
  } });

  // 2. what a typical value is, and how much values vary
  L.push({ id: 'mean', title: 'A typical value, and how much they vary', blurb: 'Mean, middle and spread', steps: {
    gcse: (D) => [
      { say: ['Here are the lengths, in metres, of five of ' + who(D) + ' passes from the back:', f(D.lens.join(',  ')), 'We want one number to stand for all five.'],
        q: 'To find the mean, what do you do first?',
        options: [{ t: 'Add the five lengths together', ok: true }, { t: 'Pick the middle one', hint: 'That is the median, which is a different average.' }, { t: 'Take the biggest take away the smallest', hint: 'That is the range.' }],
        why: [f(D.lens.join(' + ') + ' = ' + D.lens.reduce((a, b) => a + b, 0))], name: ['Adding the values is the first step to the **mean**.'] },
      { say: ['The total is ' + D.lens.reduce((a, b) => a + b, 0) + ' metres, for 5 passes.'],
        q: 'What is the mean length of a pass?', num: { answer: r1(D.lens.reduce((a, b) => a + b, 0) / 5), tol: 0.1, unit: ' m' },
        why: [f(D.lens.reduce((a, b) => a + b, 0) + ' ÷ 5 = ' + r1(D.lens.reduce((a, b) => a + b, 0) / 5)), 'The mean is the total shared out equally.'] },
      { say: ['Put the same five in order:', f(D.lens.slice().sort((a, b) => a - b).join(',  '))],
        q: 'What is the median (the middle one)?', num: { answer: D.lens.slice().sort((a, b) => a - b)[2], tol: 0, unit: ' m' },
        why: ['With five values, the middle is the third.', 'The median ignores how extreme the ends are, which is why it is useful when one pass is very long.'], name: ['The middle value, once they are in order, is the **median**.'] },
      { final: true, say: ['The range of the five is the longest take away the shortest.'],
        q: 'What is the range?', num: { answer: Math.max.apply(null, D.lens) - Math.min.apply(null, D.lens), tol: 0, unit: ' m' },
        why: [f(Math.max.apply(null, D.lens) + ' − ' + Math.min.apply(null, D.lens) + ' = ' + (Math.max.apply(null, D.lens) - Math.min.apply(null, D.lens))), 'Mean for the typical value, range for how far apart they are. Together they describe the five.'] },
    ],
    alevel: (D) => {
      const x = D.lens, n = x.length, m = x.reduce((a, b) => a + b, 0) / n, dev = x.map((v) => r1(v - m)), sq = dev.map((d) => r1(d * d)), ss = sq.reduce((a, b) => a + b, 0), v = ss / (n - 1);
      return [
        { say: ['Five of ' + who(D) + ' pass lengths, in metres:', f(x.join(',  ')), 'The mean tells you where they are centred. It does not tell you how much they vary.', 'Two players could both average 20 m, one always 20 and the other from 5 to 35.'],
          q: 'What is the mean?', num: { answer: r1(m), tol: 0.1, unit: ' m' }, why: [f(x.join(' + ') + ' = ' + x.reduce((a, b) => a + b, 0)), f(x.reduce((a, b) => a + b, 0) + ' ÷ 5 = ' + r1(m))] },
        { say: ['To measure variation, start with how far each value is from the mean (its deviation):', f(x.map((v2, i) => v2 + ' − ' + r1(m) + ' = ' + dev[i]).join('\n')), 'Some are negative and some positive.'],
          q: 'What do the five deviations add up to?', num: { answer: 0, tol: 0.2, unit: '' },
          why: ['They always add to zero: the mean is the balance point.', 'So adding the deviations tells us nothing. We need to stop the negatives cancelling the positives.'] },
        { say: ['The fix is to square each deviation, so every one is positive.', f(dev.map((d) => d + '² = ' + r1(d * d)).join('\n')), 'Add the squares:', f('Σ(x − x̄)² = ' + r1(ss))],
          q: 'Averaging them (with n − 1 = 4 for a sample) gives the variance. What is it?', num: { answer: r1(v), tol: 0.2, unit: '' },
          why: [f(r1(ss) + ' ÷ 4 = ' + r1(v)), 'We divide by n − 1 for a sample because the deviations are measured from the sample mean, which sits closer to the data than the true mean would.'], name: ['This is the **variance**, s².'] },
        { final: true, say: ['The variance is in metres squared, which is not a unit anyone feels.', 'Taking the square root brings us back to metres.'],
          q: 'What is the standard deviation s?', num: { answer: r1(Math.sqrt(v)), tol: 0.2, unit: ' m' },
          why: [f('s = √' + r1(v) + ' = ' + r1(Math.sqrt(v))), 'So a typical pass is ' + r1(m) + ' m long, and a typical pass is about ' + r1(Math.sqrt(v)) + ' m away from that.'], name: ['**Standard deviation** is the typical distance from the mean.'] },
      ];
    },
    above: (D) => [
      { say: ['For a sample x₁ … xₙ, the variance divides by n − 1 and not n.', 'Here is why. Suppose the true mean is μ and we measure deviations from the sample mean x̄.', f('Σ(xᵢ − μ)² = Σ(xᵢ − x̄)² + n(x̄ − μ)²'), 'The last term is never negative.'],
        q: 'What does that identity say about Σ(xᵢ − x̄)² compared with Σ(xᵢ − μ)²?',
        options: [{ t: 'It is smaller: the sample mean sits nearer the data than μ does', ok: true }, { t: 'It is larger', hint: 'The extra term n(x̄ − μ)² is added to get the μ version.' }, { t: 'They are equal', hint: 'They are equal only when x̄ = μ exactly.' }],
        why: ['Measured from x̄, the squared deviations come out too small on average.', f('E[Σ(xᵢ − x̄)²] = (n − 1) σ²'), 'Dividing by n − 1 corrects it exactly, so s² is an unbiased estimator of σ².'], name: ['Dividing by n − 1 is **Bessel\'s correction**.'] },
      { final: true, say: ['In the lab, a pass-length sample of n = ' + D.n + ' has Σ(x − x̄)² = 4500.'],
        q: 'What is s² (the unbiased sample variance)?', num: { answer: r1(4500 / (D.n - 1)), tol: 0.5, unit: '' },
        why: [f('4500 ÷ ' + (D.n - 1) + ' = ' + r1(4500 / (D.n - 1)))] },
    ],
  } });

  // 3. conditional probability
  L.push({ id: 'conditional', title: 'The chance of one thing, given another', blurb: 'Does a close defender change whether a pass works?', steps: {
    gcse: (D) => {
      const tf = D.tn - D.tok, ff = D.fn - D.fok;
      return [
        { say: [own(D) + ' We have split them by whether the receiver had a defender within 5 m.', tb(['', 'Worked', 'Failed', 'Total'], [['Marked tightly', D.tok, tf, D.tn], ['With space', D.fok, ff, D.fn]]), 'We will ignore the middle group for now.'],
          q: 'Of the passes to a tightly marked receiver, what fraction worked?', num: { answer: r2(D.tok / D.tn), tol: 0.02, unit: '' },
          why: ['Look only at the "marked tightly" row. The question is asked of those passes and no others.', f(D.tok + ' ÷ ' + D.tn + ' = ' + r2(D.tok / D.tn))], name: ['"Of the passes to a marked receiver" restricts us to one row. The result is a **conditional probability**.'] },
        { say: ['Now the other row.', 'Passes to a receiver with space: ' + D.fok + ' worked out of ' + D.fn + '.'],
          q: 'What fraction of those worked?', num: { answer: r2(D.fok / D.fn), tol: 0.02, unit: '' },
          why: [f(D.fok + ' ÷ ' + D.fn + ' = ' + r2(D.fok / D.fn))] },
        { say: ['Tightly marked: ' + P(D.tok / D.tn) + '% worked.', 'With space: ' + P(D.fok / D.fn) + '% worked.'],
          q: 'What does this tell the manager about the passes to a marked receiver?',
          options: [{ t: 'They work less often, so a pass to a free player is the safer choice', ok: D.tok / D.tn <= D.fok / D.fn }, { t: 'They work more often than passes to a free player', ok: D.tok / D.tn > D.fok / D.fn, hint: 'Compare the two percentages again.' }, { t: 'There is no difference at all', hint: 'The two percentages are not the same.' }],
          why: ['The two conditional probabilities are different, so knowing about the marker changes what you expect.', 'Whether that gap is real or luck is a question for the testing phase.'] },
        { final: true, say: ['Tightly marked: ' + D.tok + ' of ' + D.tn + ' worked.', 'Overall, ' + (D.tok + D.fok) + ' of the ' + (D.tn + D.fn) + ' in the two rows worked.'],
          q: 'Is the overall proportion a good guide to a pass to a tightly marked receiver?',
          options: [{ t: 'No: the proportion for that group is ' + P(D.tok / D.tn) + '% and the overall is ' + P((D.tok + D.fok) / (D.tn + D.fn)) + '%', ok: true }, { t: 'Yes, they are the same', hint: 'Work both out.' }],
          why: ['An overall figure averages groups that behave differently.', 'A conditional probability is the right number once you know which group a pass is in.'] },
      ];
    },
    alevel: (D) => {
      const N = D.tn + D.fn, tf = D.tn - D.tok, ff = D.fn - D.fok;
      return [
        { say: [own(D) + ' Take the two groups at the extremes.', tb(['', 'Worked', 'Failed', 'Total'], [['Receiver marked tightly', D.tok, tf, D.tn], ['Receiver with space', D.fok, ff, D.fn], ['Total', D.tok + D.fok, tf + ff, N]]),
          'Write A for "the pass works" and B for "the receiver is marked tightly".'],
          q: 'From the table, what is P(B), the probability a pass in these two groups goes to a tightly marked receiver?', num: { answer: r2(D.tn / N), tol: 0.02, unit: '' },
          why: [f('P(B) = ' + D.tn + ' ÷ ' + N + ' = ' + r2(D.tn / N))] },
        { say: ['Next, the probability that a pass is both to a marked receiver and works, written P(A ∩ B).', 'That is the top-left cell of the table out of all ' + N + '.'],
          q: 'What is P(A ∩ B)?', num: { answer: r2(D.tok / N), tol: 0.02, unit: '' },
          why: [f('P(A ∩ B) = ' + D.tok + ' ÷ ' + N + ' = ' + r2(D.tok / N))] },
        { say: ['Now ask the conditional question: of the passes to a marked receiver, what proportion work?', 'That is the top-left cell out of the top row total.', f('P(A | B) = ' + D.tok + ' ÷ ' + D.tn),
          'Divide the top and bottom by ' + N + ':', f('P(A | B) = (' + D.tok + ' ÷ ' + N + ') ÷ (' + D.tn + ' ÷ ' + N + ')'), 'The top is P(A ∩ B) and the bottom is P(B).'],
          q: 'So which formula is P(A | B)?',
          options: [{ t: 'P(A ∩ B) ÷ P(B)', ok: true }, { t: 'P(A ∩ B) × P(B)', hint: 'Dividing the counts gave a division of the probabilities.' }, { t: 'P(A) ÷ P(B)', hint: 'The top has to be the cases where both happen.' }],
          why: [f('P(A | B) = P(A ∩ B) ÷ P(B) = ' + r2(D.tok / N) + ' ÷ ' + r2(D.tn / N) + ' = ' + r2(D.tok / D.tn))], name: ['This is the definition of **conditional probability**, and it came straight from the table.'] },
        { say: ['The chance a pass works if the receiver has space:', f('P(A | B′) = ' + D.fok + ' ÷ ' + D.fn + ' = ' + r2(D.fok / D.fn)), 'The chance a pass works if the receiver is tightly marked:', f('P(A | B) = ' + r2(D.tok / D.tn))],
          q: 'Two events are independent if P(A | B) = P(A). Are "the pass works" and "the receiver is tightly marked" independent here?',
          options: [{ t: 'No: knowing the receiver is marked changes the chance it works', ok: true }, { t: 'Yes', hint: 'Compare P(A | B) with P(A | B′).' }],
          why: ['If they were independent, being marked would make no difference and the two conditional probabilities would match.', 'They do not match, so being marked is related to whether a pass works. How much, and whether it is more than luck, is for the testing phase.'], name: ['When P(A | B) ≠ P(A), the events are **not independent**.'] },
        { final: true, say: ['A reminder that it matters which way round we ask.', 'P(works | marked) = ' + r2(D.tok / D.tn) + '.'],
          q: 'Is P(marked | works) the same number?',
          options: [{ t: 'No: it divides by the number that worked, not by the number to a marked receiver', ok: true }, { t: 'Yes, they are always equal', hint: 'The denominators differ.' }],
          why: [f('P(marked | works) = ' + D.tok + ' ÷ ' + (D.tok + D.fok)), 'A different division, a different number. The word after the bar is what you restrict to.'] },
      ];
    },
    above: (D) => {
      const N = D.tn + D.fn, tf = D.tn - D.tok, ff = D.fn - D.fok, pF = tf / D.tn, pFF = ff / D.fn, pB = D.tn / N, pFail = (tf + ff) / N;
      return [
        { say: [own(D), 'Let B be "receiver tightly marked" and F be "the pass fails".', 'From the table: P(B) = ' + r2(pB) + ', P(F | B) = ' + r2(pF) + ', P(F | B′) = ' + r2(pFF) + '.', 'The law of total probability sums over the two ways a pass can fail:', f('P(F) = P(F | B)P(B) + P(F | B′)P(B′)')],
          q: 'What is P(F)?', num: { answer: r3(pF * pB + pFF * (1 - pB)), tol: 0.01, unit: '' },
          why: [f('P(F) = ' + r2(pF) + ' × ' + r2(pB) + ' + ' + r2(pFF) + ' × ' + r2(1 - pB) + ' = ' + r3(pF * pB + pFF * (1 - pB)))] },
        { say: ['Suppose a pass failed. How likely is it that the receiver was marked?', 'We want P(B | F), but the table gave us P(F | B).', 'Start from the definition twice:', f('P(B ∩ F) = P(F | B) P(B)'), f('P(B ∩ F) = P(B | F) P(F)'), 'The left sides are the same event, so the right sides are equal.'],
          q: 'Solving for P(B | F), what do you get?',
          options: [{ t: 'P(F | B) P(B) ÷ P(F)', ok: true }, { t: 'P(F | B) ÷ P(B)', hint: 'The P(F) in the second line has to be divided away.' }, { t: 'P(F) ÷ P(F | B)', hint: 'Isolate P(B | F) on one side.' }],
          why: [f('P(B | F) = P(F | B) P(B) ÷ P(F)'), 'This is **Bayes\' theorem**: it turns P(F | B) into P(B | F).'] },
        { final: true, say: [f('P(B | F) = ' + r2(pF) + ' × ' + r2(pB) + ' ÷ ' + r3(pFail))],
          q: 'What is P(B | F), as a percentage?', num: { answer: P(pF * pB / pFail), tol: 1, unit: '%' },
          why: [f(r3(pF * pB) + ' ÷ ' + r3(pFail) + ' = ' + r3(pF * pB / pFail)), 'Of the passes that fail, this share went to a tightly marked receiver. The press is working on a share of the failures that is different from its share of the passes.'] },
      ];
    },
  } });

  // 4. Monte Carlo
  L.push({ id: 'montecarlo', title: 'Playing it a thousand times', blurb: 'Monte Carlo: asking the computer to try it again and again', steps: {
    gcse: (D) => [
      { say: ['In a real match you get one go at each build-up, and you cannot rewind.', 'Elena\'s computer can replay the same set-up against the same opponent as many times as you like.', 'Each replay uses a little luck: whether a pass comes off, whether a defender steps up.'],
        q: 'Why is playing the same set-up 100 times better than playing it once?',
        options: [{ t: 'One go could be lucky or unlucky. Many goes let the luck average out', ok: true }, { t: 'The players learn from each go', hint: 'Each replay starts afresh.' }, { t: 'The computer is more accurate the more you ask', hint: 'It is the amount of evidence that improves.' }],
        why: ['A single result is one draw from a spread of possible results.', 'A hundred draws show where the results usually fall.'], name: ['Repeating a random experiment many times on a computer is called a **Monte Carlo simulation**.'] },
      { say: ['Results of one set-up, as the number of tests grows:', tb(['Tests', 'Got out', 'Share'], [[10, 7, '70%'], [100, 61, '61%'], [1000, 603, '60.3%']])],
        q: 'What happens to the share as the number of tests grows?',
        options: [{ t: 'It settles down towards a steady value, here close to 60%', ok: true }, { t: 'It keeps going up', hint: 'Look at the three shares.' }, { t: 'It jumps about just as much', hint: '70%, 61%, 60.3%: the changes get smaller.' }],
        why: ['The more tests, the less one run of luck can move the share.', 'That steady value is the true chance for that set-up.'] },
      { final: true, say: ['You run a test and 58 of 100 get out.', 'A friend says: "So it is 58%."'],
        q: 'What is the best reply?',
        options: [{ t: '"58% is the best estimate from 100 tests. Another 100 would give a slightly different number."', ok: true }, { t: '"Yes, exactly 58%."', hint: 'Would another 100 tests give exactly 58 again?' }, { t: '"100 tests are useless."', hint: 'They tell you a lot, just not exactly.' }],
        why: ['The result is an estimate. The next lesson, and the one called "Giving a share a range", show how far out it could be.'] },
    ],
    alevel: (D) => {
      const p = Math.min(0.8, Math.max(0.3, D.p)), se100 = Math.sqrt(p * (1 - p) / 100);
      return [
        { say: ['A Monte Carlo test plays the same set-up n times and records X, the number that get out.', 'Using p̂ = X ÷ n, we know from the binomial that:', f('E(X) = np  and  Var(X) = np(1 − p)'), 'p̂ divides X by n, so its variance is divided by n².'],
          q: 'What is Var(p̂)?',
          options: [{ t: 'p(1 − p) ÷ n', ok: true }, { t: 'np(1 − p)', hint: 'That is Var(X). Divide by n².' }, { t: 'p(1 − p) ÷ n²', hint: 'np(1 − p) ÷ n² simplifies by cancelling one n.' }],
          why: [f('Var(p̂) = np(1 − p) ÷ n² = p(1 − p) ÷ n')], name: ['The square root of this is the **standard error** of p̂.'] },
        { say: ['Take a build-up whose true p is about ' + r2(p) + ', and run n = 100 tests.', f('standard error = √(' + r2(p) + ' × ' + r2(1 - p) + ' ÷ 100)')],
          q: 'What is the standard error, in percentage points?', num: { answer: r1(se100 * 100), tol: 0.3, unit: ' points' },
          why: [f('= √' + r3(p * (1 - p) / 100) + ' = ' + r3(se100)), 'So one run of 100 tests typically lands about ' + r1(se100 * 100) + ' points from the truth.'] },
        { say: ['For a normal distribution about 95% of values lie within 1.96 standard errors of the mean.', 'With 100 tests the standard error is ' + r1(se100 * 100) + ' points.'],
          q: 'About how many points either side can a single run of 100 tests land, 19 times in 20?', num: { answer: r1(1.96 * se100 * 100), tol: 0.5, unit: ' points' },
          why: [f('1.96 × ' + r1(se100 * 100) + ' = ' + r1(1.96 * se100 * 100)), 'That is the "10 points either way" you saw in the test results, and now you know where it comes from.'] },
        { final: true, say: ['The standard error is √(p(1 − p) ÷ n).', 'You want the margin of error to be half what it is with 100 tests.'],
          q: 'How many tests do you need?', num: { answer: 400, tol: 0, unit: ' tests' },
          why: [f('√(p(1 − p) ÷ n) halves when n is multiplied by 4'), 'Twice as precise costs four times the tests: 100 becomes 400. That is the price of certainty.'] },
      ];
    },
    above: (D) => [
      { say: ['A Monte Carlo experiment estimates p by p̂ = X/n with Var(p̂) = p(1 − p)/n.', 'For large n, the central limit theorem says p̂ is approximately normal.', f('p̂ ≈ N(p, p(1 − p)/n)'), 'A margin of error m at 95% confidence satisfies:', f('m = 1.96 √(p(1 − p)/n)')],
        q: 'Solving for n, what is the number of tests for a margin m at the worst case p = ½?',
        options: [{ t: 'n = (1.96)² × 0.25 ÷ m²', ok: true }, { t: 'n = 1.96 × 0.25 ÷ m', hint: 'Square both sides of the margin formula.' }, { t: 'n = m² ÷ (1.96² × 0.25)', hint: 'n goes in the denominator of the margin, so it ends up on top.' }],
        why: [f('m² = 1.96² × p(1 − p) ÷ n  ⟹  n = 1.96² p(1 − p) ÷ m²'), 'At p = ½, p(1 − p) = ¼ is as large as it gets, so this is the number of tests that is always enough.'] },
      { final: true, say: ['You want a margin of error of 2 percentage points (m = 0.02) at the worst case.'],
        q: 'How many tests?', num: { answer: Math.round(1.96 * 1.96 * 0.25 / (0.02 * 0.02)), tol: 20, unit: ' tests' },
        why: [f('n = 1.96² × 0.25 ÷ 0.02² = ' + Math.round(1.96 * 1.96 * 0.25 / (0.02 * 0.02))), 'About 2400 tests. Error falls as 1/√n, so each extra decimal of precision multiplies the cost by a hundred.'] },
    ],
  } });

  // 5. a margin around a share
  L.push({ id: 'interval', title: 'A range you can trust', blurb: 'Building a 95% interval for a share', steps: {
    alevel: (D) => {
      const n = 200, x = Math.round(D.p * n), ph = x / n, se = Math.sqrt(ph * (1 - ph) / n);
      return [
        { say: ['You test a build-up ' + n + ' times and ' + x + ' get out.', f('p̂ = ' + x + ' ÷ ' + n + ' = ' + r3(ph)), 'The standard error of p̂ is estimated by plugging in p̂ for p:', f('s.e. = √(p̂(1 − p̂) ÷ n) = √(' + r3(ph) + ' × ' + r3(1 - ph) + ' ÷ ' + n + ')')],
          q: 'What is the standard error, in percentage points?', num: { answer: r1(se * 100), tol: 0.3, unit: ' points' },
          why: [f('= ' + r3(se) + '  →  ' + r1(se * 100) + ' points')] },
        { say: ['p̂ is approximately normal around p, with this standard error.', 'The normal distribution has 95% of its area within 1.96 standard deviations of the mean.', 'So p̂ is within 1.96 s.e. of p about 95% of the time, and that means p is within 1.96 s.e. of p̂ about 95% of the time too.'],
          q: 'What is the 95% interval (lower end), as a percentage?', num: { answer: r1((ph - 1.96 * se) * 100), tol: 0.5, unit: '%' },
          why: [f('p̂ − 1.96 s.e. = ' + r3(ph) + ' − ' + r3(1.96 * se) + ' = ' + r3(ph - 1.96 * se)), f('p̂ + 1.96 s.e. = ' + r3(ph + 1.96 * se)), 'So the interval is ' + r1((ph - 1.96 * se) * 100) + '% to ' + r1((ph + 1.96 * se) * 100) + '%.'], name: ['This is the **95% confidence interval** for a proportion.'] },
        { final: true, say: ['Your interval is ' + r1((ph - 1.96 * se) * 100) + '% to ' + r1((ph + 1.96 * se) * 100) + '%.'],
          q: 'What does "95%" mean here?',
          options: [{ t: 'If we repeated the whole experiment many times, about 95% of the intervals built this way would contain the true share', ok: true }, { t: 'There is a 95% chance the true share is inside this particular interval', hint: 'The true share is fixed. It is the interval that varies from experiment to experiment.' }, { t: '95% of passes land inside it', hint: 'It is about the share, not about individual passes.' }],
          why: ['The 95% belongs to the method, not to one interval.', 'That is a subtle point, and a common slip in published work.'] },
      ];
    },
    above: (D) => [
      { say: ['A Wald interval, p̂ ± 1.96 √(p̂(1 − p̂)/n), works badly when p is near 0 or 1, or n is small.', 'The Wilson interval solves for p in the inequality |p̂ − p| ≤ 1.96 √(p(1 − p)/n) instead of plugging in p̂.'],
        q: 'Why is that better near the edges?',
        options: [{ t: 'It never produces limits outside 0 and 1, and it does not collapse to zero width when p̂ is 0 or 1', ok: true }, { t: 'It always gives a narrower interval', hint: 'It is not narrower. It is better centred.' }, { t: 'It needs fewer tests', hint: 'It needs the same n.' }],
        why: ['The standard error uses p, not p̂, so the interval cannot shrink to nothing when p̂ = 0.', 'For a proportion near the edge (a rare event such as a goal), prefer it.'] },
      { final: true, say: ['In ' + D.n + ' build-ups none ended with a shot against.'],
        q: 'What is the Wald interval for the chance of a shot against?',
        options: [{ t: '0% to 0%, which is clearly too confident', ok: true }, { t: '0% to 5%', hint: 'The Wald interval uses p̂ = 0 so s.e. = 0.' }],
        why: ['With p̂ = 0 the plug-in standard error is 0, so the interval has no width at all.', 'That is exactly the situation where the Wilson interval, or the "rule of three" (about 3/n), is the honest answer.'] },
    ],
  }, alias: { gcse: 'range' } });

  // 6. is the change real?
  L.push({ id: 'hypothesis', title: 'Is the change real?', blurb: 'Hypothesis tests, from the table to the decision', steps: {
    alevel: (D) => {
      const p0 = Math.min(0.75, Math.max(0.35, Math.round(D.p * 20) / 20)), n = 100, k = Math.min(n, Math.round(n * (p0 + 0.1))), tail = tailGE(n, k, p0);
      return [
        { say: ['Before a change, ' + P(p0) + '% of build-ups got out. You make a change and test it ' + n + ' times: ' + k + ' get out.', 'That is ' + P(k / n) + '%, which looks better.', 'But ' + n + ' tests wobble. Could ' + k + ' have happened with no improvement at all?'],
          q: 'What do we do to answer that?',
          options: [{ t: 'Assume nothing has changed and work out how likely a result this good would be', ok: true }, { t: 'Assume the change worked and check the result matches', hint: 'That would only ever confirm what we wanted to believe.' }, { t: 'Run it again until it looks good', hint: 'That is the way to fool yourself.' }],
          why: ['We set up two statements and test the dull one.'], name: ['The dull statement is the **null hypothesis**, H₀: p = ' + r2(p0) + '. The change is the **alternative**, H₁: p > ' + r2(p0) + '.'] },
        { say: ['If H₀ is true, X, the number out of ' + n + ' that get out, follows B(' + n + ', ' + r2(p0) + ').', 'We ask: how likely is a result at least as good as ' + k + '?', f('P(X ≥ ' + k + ') = P(X = ' + k + ') + P(X = ' + (k + 1) + ') + … + P(X = ' + n + ')')],
          q: 'A calculator or the lab gives this probability as ' + r3(tail) + '. What does it mean?',
          options: [{ t: 'If nothing had changed, a result this good (or better) would happen ' + r3(tail) + ' of the time', ok: true }, { t: 'The probability that the change worked is ' + r3(1 - tail), hint: 'It is calculated assuming nothing changed. It is not the probability of the change.' }, { t: 'The change made ' + r3(tail) + ' more build-ups succeed', hint: 'This is about luck, not size of effect.' }],
          why: ['This is the **p-value**: P(a result at least this extreme | H₀).', 'Notice the conditional probability. It is the probability of the data given the null, not the probability of the null given the data.'], name: ['Small p-values say "this would be surprising if nothing had changed".'] },
        { say: ['Before looking, we agree a line: the **significance level**, usually 5%.', 'If the p-value is below the line, we reject H₀.', 'Here the p-value is ' + r3(tail) + '.'],
          q: 'At the 5% level, what do we conclude?',
          options: [{ t: tail < 0.05 ? 'Reject H₀: there is evidence that the change improved things' : 'Do not reject H₀: the improvement could plausibly be luck', ok: true }, { t: tail < 0.05 ? 'Do not reject H₀' : 'Reject H₀', hint: 'Compare ' + r3(tail) + ' with 0.05.' }],
          why: [tail < 0.05 ? 'The result would happen less than 1 time in 20 if nothing had changed.' : 'A result like this would happen more than 1 time in 20 if nothing had changed, so it is not strong evidence.', 'We never "prove" the null. We only find evidence against it, or fail to.'] },
        { final: true, say: ['You use the 5% level on a test where nothing really changed.'],
          q: 'About how often will you wrongly call it real?', num: { answer: 5, tol: 0, unit: '%' },
          why: ['The level is exactly the rate of **Type I errors**: rejecting a true H₀.', f('P(Type I error) = significance level = 5%'), 'Test twenty changes that do nothing and you will, on average, "find" one. That is why one result is a clue, not a verdict.'] },
      ];
    },
    above: (D) => {
      const n1 = 200, n2 = 200, x1 = Math.round(0.58 * n1), x2 = Math.round(0.66 * n2), p1 = x1 / n1, p2 = x2 / n2, pp = (x1 + x2) / (n1 + n2), se = Math.sqrt(pp * (1 - pp) * (1 / n1 + 1 / n2)), z = (p2 - p1) / se, pv = 2 * (1 - phi(Math.abs(z)));
      return [
        { say: ['Two set-ups, ' + n1 + ' tests each: ' + x1 + ' and ' + x2 + ' get out.', f('p̂₁ = ' + r3(p1) + ',  p̂₂ = ' + r3(p2)), 'H₀: the two true shares are equal, p₁ = p₂ = p.', 'If that is true, the best estimate of the common p pools both samples.'],
          q: 'What is the pooled estimate p̂?', num: { answer: r3(pp), tol: 0.005, unit: '' },
          why: [f('p̂ = (' + x1 + ' + ' + x2 + ') ÷ (' + n1 + ' + ' + n2 + ') = ' + r3(pp))] },
        { say: ['The variance of a difference of independent proportions is the sum of the two variances.', f('Var(p̂₂ − p̂₁) = p(1 − p)/n₂ + p(1 − p)/n₁'), 'Under H₀ both use the pooled p̂.'],
          q: 'What is the standard error of the difference, in percentage points?', num: { answer: r1(se * 100), tol: 0.3, unit: ' points' },
          why: [f('s.e. = √(' + r3(pp) + ' × ' + r3(1 - pp) + ' × (1/' + n1 + ' + 1/' + n2 + ')) = ' + r3(se))] },
        { say: ['Standardise: how many standard errors is the observed difference from zero?', f('z = (p̂₂ − p̂₁) ÷ s.e. = ' + r3(p2 - p1) + ' ÷ ' + r3(se))],
          q: 'What is z?', num: { answer: r2(z), tol: 0.05, unit: '' },
          why: [f('z = ' + r2(z)), 'Under H₀, z follows a standard normal distribution.'] },
        { final: true, say: ['For a two-sided test, the p-value is the chance of |Z| at least ' + r2(Math.abs(z)) + ', which is both tails.'],
          q: 'The two-sided p-value is ' + r3(pv) + '. At the 5% level, what do you do?',
          options: [{ t: pv < 0.05 ? 'Reject H₀, and report the size of the difference and its interval as well' : 'Do not reject H₀, and report the size of the difference and its interval as well', ok: true }, { t: pv < 0.05 ? 'Do not reject H₀' : 'Reject H₀', hint: 'Compare the p-value with 0.05.' }],
          why: ['A p-value tells you whether luck can explain it. The interval for the difference tells you whether it is big enough to matter.', 'You need both, and power (the chance of detecting a real effect of this size) tells you whether to believe a "no".'] },
      ];
    },
  }, alias: { gcse: 'real' } });

  FM.elenaLessons = L;
})();
