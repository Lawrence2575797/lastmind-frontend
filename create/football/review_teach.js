// The explanations behind the match review. Every technical word in a review is a button; pressing it opens a short lesson written for someone who has never
// met the idea, in an order where each step follows from the one before and nothing is used before it has been explained. A lesson's own technical words are
// buttons too, so a reader can keep following the chain back to things they already know. Nothing here is a formula to be accepted: each is built.
(function () {
  const FM = (window.FM = window.FM || {});
  // [[id|words]] in a lesson becomes a button for that lesson.
  const L = {};
  const add = (id, title, needs, steps) => { L[id] = { id, title, needs, steps }; };

  add('average', 'An average, and "our usual rate"', [], [
    'Suppose that in match one we lost the ball in our own third 30 times, and in match two we lost it 26 times.',
    'To find what is <b>usual</b> for us, we share the total out equally. First add the matches up: 30 + 26 = 56. Then divide by the number of matches: 56 ÷ 2 = 28.',
    'That answer, 28, is called the <b>average</b> (some people say the <b>mean</b>). It says: in an ordinary match, we lose the ball about 28 times.',
    'An average is not a promise. Real matches wobble around it: 30 one week, 26 the next. Nobody expects exactly 28 every time.',
    'When the average is "how many times something happens in one match" it has a special name, the <b>rate</b>, and people write it with the Greek letter λ (say "lambda"). Here λ = 28. We will keep using λ for "the usual number per match".',
    'The question the rest of these explanations answer is exactly this: <i>how big does the wobble have to be before it stops being normal wobble and starts meaning that something changed?</i>',
  ]);

  add('chance', 'What a probability is', [], [
    'A <b>probability</b> is a number that says how likely something is. It is how we turn "probably" and "hardly ever" into something we can calculate with.',
    'It always sits between 0 and 1. 0 means it cannot happen. 1 means it is certain. Halfway, 0.5, means it is as likely as not. People often write it as a percentage instead: 0.5 is 50%, and 0.04 is 4%.',
    'Take a coin. It can land heads or tails, and both are equally likely. So the chance of heads is 1 out of 2, which is 1 ÷ 2 = 0.5, or 50%.',
    'Take a dice. It has six sides and each is equally likely, so the chance of a 4 is 1 out of 6, which is 1 ÷ 6 = 0.167, or about 16.7%.',
    'That gives us the basic rule for things that are equally likely: <b>probability = (the number of ways it can happen) ÷ (the total number of things that could happen)</b>. The chance of an even number on a dice is 3 ways (2, 4, 6) out of 6, which is 3 ÷ 6 = 0.5.',
    'The chance something does <b>not</b> happen is 1 minus the chance it does. The chance of <i>not</i> rolling a 4 is 1 − 1/6 = 5/6.',
    'Sometimes we want "<b>at least</b> 5" on a dice, meaning 5 <i>or more</i>. We list each result that counts and add their chances: the chance of a 5 is 1/6 and the chance of a 6 is 1/6, so the chance of at least 5 is 1/6 + 1/6 = 2/6. Adding up every result at or beyond a point like this is something we will do again.',
  ]);

  add('independent', 'Chances that do not affect each other', ['chance'], [
    'Two things are <b>independent</b> when what happens in one tells you nothing about the other. Flipping a coin twice is the example: the first flip has no influence on the second.',
    'What is the chance of two heads in a row? List everything that can happen with two flips: heads-heads, heads-tails, tails-heads, tails-tails. That is 4 possibilities, all equally likely, and only one is two heads, so the chance is 1 out of 4 = 0.25.',
    'Now look at where 0.25 comes from: the chance of heads on the first flip is 1/2, the chance of heads on the second is 1/2, and 1/2 × 1/2 = 1/4. So for independent things, <b>"and" means multiply</b>.',
    'Three heads in a row: 1/2 × 1/2 × 1/2 = 1/8, which is 0.125. Four heads: 1/16. Chances get small quickly when many things must all happen.',
    'When two results <b>cannot both happen</b> and we want "this one <i>or</i> that one", we add instead. A single flip is heads or tails: 1/2 + 1/2 = 1, certain, as it should be.',
    'Why this matters to us: we will treat each pass, or each tiny slice of a match, as independent of the others. That is what lets us multiply and add chances to build bigger answers.',
  ]);

  add('factorial', 'Factorials, and counting the ways to choose', ['chance'], [
    'A <b>factorial</b> is a product of counting down. Written 4!, it means 4 × 3 × 2 × 1 = 24. So 3! = 3 × 2 × 1 = 6, and 5! = 120. By agreement 0! = 1 and 1! = 1.',
    'Why would anyone want it? It counts <b>arrangements</b>. Put the letters A, B, C in a row. There are 3 choices for the first spot, then 2 left for the second, then 1 for the last: 3 × 2 × 1 = 3! = 6 ways (ABC, ACB, BAC, BCA, CAB, CBA).',
    'A second kind of counting: <b>choosing</b> without caring about order. From four players A, B, C, D, how many different pairs can we pick? List them: AB, AC, AD, BC, BD, CD. That is 6.',
    'There is a way to get 6 without listing. Picking two <i>in order</i> gives 4 choices then 3: 4 × 3 = 12. But that counts AB and BA as different, and so on for every pair, so each pair has been counted 2 times (that 2 is 2!). Divide: 12 ÷ 2 = 6.',
    'In general the number of ways to choose <i>k</i> things from <i>n</i> is <b>n! ÷ (k! × (n − k)!)</b>. For n = 4, k = 2: 24 ÷ (2 × 2) = 6, which matches our list. This is written C(n, k) and read "n choose k".',
    'More examples: C(5, 2) = 5! ÷ (2! × 3!) = 120 ÷ 12 = 10. C(3, 1) = 3. C(3, 0) = 1 (there is exactly one way to choose nothing). We will need these numbers to count how many different ways something can happen.',
  ]);

  add('binomial', 'Yes-or-no attempts: the binomial distribution', ['chance', 'independent', 'factorial'], [
    'Many things in football are a series of attempts that each either work or do not: a pass is completed or not, a shot is a goal or not. Suppose there are <b>n</b> attempts, every attempt has the same chance <b>p</b> of working, and the attempts do not affect each other.',
    'Start small. Three passes, each with a chance 0.8 of being completed, which is p = 0.8. What is the chance that <b>exactly 2</b> of the 3 are completed?',
    'First list the ways it can happen (C = completed, F = failed): C C F, C F C, F C C. There are 3 ways. That number 3 is C(3, 2), the number of ways to choose which 2 of the 3 passes were completed (see the lesson on choosing).',
    'Now the chance of <i>one</i> of those ways, say C C F. The passes are independent, so we multiply: 0.8 × 0.8 × 0.2 = 0.128. (The 0.2 is 1 − 0.8, the chance of a failure.) C F C and F C C work out to the same 0.128 each, because the same numbers are being multiplied in a different order.',
    'The three ways cannot happen together, so we add: 0.128 + 0.128 + 0.128 = 3 × 0.128 = 0.384. So the chance of exactly 2 completed out of 3 is 38.4%.',
    'Put that in words as a rule: <b>chance of exactly k = (number of ways to choose which k worked) × p to the power k × (1 − p) to the power (n − k)</b>, or in symbols C(n, k) × p<sup>k</sup> × (1 − p)<sup>n−k</sup>. Check it on our example: C(3, 2) = 3, p² = 0.64, (1 − p)¹ = 0.2, and 3 × 0.64 × 0.2 = 0.384. ✓',
    'The same rule for every possible number of completions with n = 3, p = 0.8: exactly 0 → 0.8%, exactly 1 → 9.6%, exactly 2 → 38.4%, exactly 3 → 51.2%. They add up to 100%, as they must, because one of them has to happen.',
    'Real questions are about "<b>k or fewer</b>" (for example "30 or fewer passes completed"), so we add the chances for 0, 1, 2 and so on up to k, just as we added the chances of a 5 and a 6 on the dice.',
    'The <b>expected number</b> of successes is n × p. With 3 passes at 0.8 that is 2.4. With 38 passes at 0.77 it is about 29.3. A real match will usually land near that, sometimes above, sometimes below.',
    'With 38 attempts there are 39 numbers to add up and each needs a big count of ways, so a computer does the adding. But every step it takes is the one you just did by hand.',
  ]);

  add('e', 'The number e', [], [
    'A <b>power</b> means multiplying a number by itself: 2<sup>3</sup> = 2 × 2 × 2 = 8. A power of 1.01 repeated 100 times is written 1.01<sup>100</sup>.',
    'Here is something odd. Take the number (1 + 1/n), and multiply it by itself n times, for bigger and bigger n. For n = 1 we get 2. For n = 2 we get 1.5 × 1.5 = 2.25. For n = 10 we get 2.594. For n = 100 we get 2.705. For n = 1000 we get 2.717. For n = 1,000,000 we get 2.71828.',
    'It stops getting bigger in any way that matters: it <b>settles down</b> towards one number, 2.71828… That number is called <b>e</b>. Like π, it is just a number that turns up in nature, and mathematicians gave it a letter.',
    'We need a close relative of this. Take (1 − λ/n) and multiply it by itself n times. Try λ = 2. With n = 4: 0.5 × 0.5 × 0.5 × 0.5 = 0.0625. With n = 10: 0.107. With n = 100: 0.1326. With n = 1000: 0.1351. With n = 100,000: 0.13533.',
    'Again it settles, this time at 0.13534. And that is exactly 1 ÷ e², written <b>e<sup>−2</sup></b> (a minus sign in the power means "1 divided by"). So (1 − 2/n)<sup>n</sup> settles at e<sup>−2</sup>.',
    'The general fact we will use: <b>(1 − λ/n)<sup>n</sup> settles at e<sup>−λ</sup></b> as n gets very large. We have not proved this for every λ; we have seen it happen with real numbers, and that is enough to follow how the Poisson formula arises.',
  ]);

  add('poisson', 'The Poisson distribution', ['average', 'chance', 'independent', 'factorial', 'binomial', 'e'], [
    '<b>The question.</b> Some things happen at random moments through a match: we lose the ball in our own third, a foul is committed, a shot is taken. We know the average number per match, λ. We want the chance of seeing exactly some other number, say 38, in a match. The Poisson distribution answers that.',
    '<b>Step 1: chop the match into tiny slices.</b> Split the 90 minutes into n very small slices, for example 5,400 one-second slices. Make them so short that a slice either has one event in it or none, never two.',
    '<b>Step 2: the chance in one slice.</b> Over all n slices we expect λ events in total. Every slice is the same length, so each has the same small chance p. That p must satisfy n × p = λ, so <b>p = λ ÷ n</b>.',
    '<b>Step 3: this is the binomial.</b> Each slice is a yes-or-no attempt ("did an event happen?") with chance p, and the slices do not affect each other. So the number of events is exactly the situation in the binomial lesson: chance of exactly k events = C(n, k) × p<sup>k</sup> × (1 − p)<sup>n−k</sup> with p = λ/n.',
    '<b>Step 4: make the slices tiny.</b> The more slices there are, the more exactly this models time that flows continuously. So we let n become enormous, and watch what each part of the formula turns into.',
    '<b>Part A: C(n, k) × (λ/n)<sup>k</sup>.</b> C(n, k) is n × (n − 1) × … × (n − k + 1) divided by k! (the choosing lesson). When n is huge those k numbers are almost all the same size as n: for n = 1000 and k = 3, 1000 × 999 × 998 = 997,002,000, which is almost 1000³ = 1,000,000,000. So C(n, k) is almost n<sup>k</sup> ÷ k!. Multiply by (λ/n)<sup>k</sup> = λ<sup>k</sup> ÷ n<sup>k</sup>: the n<sup>k</sup> cancels, leaving <b>λ<sup>k</sup> ÷ k!</b>.',
    '<b>Part B: (1 − λ/n)<sup>n−k</sup>.</b> Taking away k of the n multiplications changes almost nothing when n is huge, because each factor is almost exactly 1. So it behaves like (1 − λ/n)<sup>n</sup>, and the lesson on <b>e</b> showed that this settles at e<sup>−λ</sup>.',
    '<b>Step 5: put the parts together.</b> The chance of exactly k events is <b>e<sup>−λ</sup> × λ<sup>k</sup> ÷ k!</b>. That is the Poisson formula. Everything in it was built, not guessed: λ<sup>k</sup> ÷ k! from counting the ways, and e<sup>−λ</sup> from the empty slices.',
    '<b>Step 6: try it with small numbers.</b> If λ = 2 events per match on average, then e<sup>−2</sup> = 0.1353. Exactly 0 events: 0.1353 × 2<sup>0</sup> ÷ 0! = 13.5%. Exactly 1: 0.1353 × 2 ÷ 1 = 27.1%. Exactly 2: 0.1353 × 4 ÷ 2 = 27.1%. Exactly 3: 0.1353 × 8 ÷ 6 = 18.0%. Exactly 4: 9.0%. Exactly 5: 3.6%. Those six add to 98.3%; the rest (6, 7, 8 … events) share the last 1.7%. Sensible: with an average of 2, you will usually see 1, 2 or 3.',
    '<b>What it tells us.</b> The most likely numbers sit around λ. The typical wobble is about the square root of λ: with λ = 28, √28 is about 5.3, so ordinary matches land roughly between 23 and 33. A match with 38 is further out than that, which is why it needs a closer look.',
    '<b>When it is a fair model.</b> It works when events happen independently of each other, at a roughly steady average rate, and one at a time. Turnovers, fouls and shots are close to that. It is a model, not a law, so it is a good guide and not a certainty.',
    '<b>How we use it.</b> To ask "how often would we see 38 <i>or more</i>?" we work out the chance of exactly 38, of exactly 39, of exactly 40 and so on, and add them. That total is the [[pvalue|p-value]].',
  ]);

  add('hypothesis', 'Testing an idea: the null and alternative hypotheses', ['average'], [
    'We have a number from the match (38 turnovers) and a usual number (28). Did something change, or is this just the normal wobble? We need a fair way to decide, and it is the same way a court works.',
    'In court, the starting position is <b>"innocent until proven guilty"</b>. You do not start by assuming guilt and asking the defendant to disprove it. In statistics the starting position is "<b>nothing has changed</b>": this match was an ordinary one, and the true average is still the usual one. That starting position is called the <b>null hypothesis</b> (people write H<sub>0</sub>).',
    'The idea we are testing it against is the <b>alternative hypothesis</b> (H<sub>1</sub>): something <i>did</i> change, in the direction we are worried about, such as "we lose the ball more often than usual".',
    'We never try to prove the alternative directly. Instead we ask: <b>if the null were true, how surprising would my result be?</b> If it would be very surprising, that is a reason to doubt the null and take the alternative seriously. If it would not be surprising, we have no good reason to say anything changed.',
    'Measuring "how surprising" needs a number. That number is the [[pvalue|p-value]].',
  ]);

  add('pvalue', 'The p-value', ['chance', 'hypothesis'], [
    'We want one number for "how surprising is my result, <i>if nothing has changed</i>?"',
    'First, a trap. Flip a coin 10 times and get exactly 6 heads, 4 tails. Is that surprising? The chance of <i>that exact result</i> is only about 21%, and the chance of any exact result is smallish, so "this exact thing is unlikely" cannot be the test. Every exact result is fairly unlikely.',
    'So we ask a better question: how likely is a result <b>as extreme as mine, or more extreme</b>? With 10 heads out of 10, "as extreme or more" is just 10 heads, a chance of 1 in 1024, about 0.1%: very surprising for a fair coin. With 6 heads, "6 or more" is more than a third of all outcomes, not surprising at all.',
    'That is the <b>p-value</b>: <b>the chance, if the null hypothesis is true, of getting a result at least as extreme as the one we saw, in the direction of the alternative</b>. For our turnovers it is "if the usual average of 28 still holds, what is the chance of 38 <i>or more</i>?" The [[poisson|Poisson distribution]] gives us the chance of each exact count, and we add the counts from 38 upwards.',
    'A small p-value means: "if nothing changed, this would almost never happen". A big one means: "this happens quite often when nothing changes".',
    'What it is <b>not</b>: it is not the chance that the null is true, and it does not say how big or important the change is. It only measures how awkward our result is for the "nothing changed" idea.',
    'To turn a p-value into a decision we need a line to compare it with. That line is the [[significance|significance level]].',
  ]);

  add('significance', 'The significance level, and what "significant" means', ['pvalue'], [
    'Once we have a p-value, how small is small enough? There is no law of nature here; people agreed a convention: <b>5%</b>, or 1 in 20.',
    'If the p-value is <b>below 5%</b>, we call the result <b>statistically significant</b>. In plain words: "if nothing had changed this would happen less than 1 time in 20, which is rare enough that I am willing to say something probably did change."',
    'If the p-value is <b>5% or more</b>, the result is <b>not significant</b>. That does <i>not</i> prove nothing changed. A court that says "not guilty" has not said "innocent", only that the evidence was not strong enough. In the same way, "not significant" means "the evidence from this match is not strong enough to say".',
    'Why 5%? It balances two mistakes: being fooled by luck, and missing something real. With a 5% line, even if nothing ever changed, about 1 test in 20 would cross it by pure luck. So one significant result is a strong hint, and a result that keeps appearing over several matches is much stronger.',
    'Why one match is a small sample: a few dozen events cannot settle a question for good. That is why the review tells you it will check again after the next match.',
    'And "significant" is not the same as "important" or "the cause". It tells us the change was probably real, not how much it matters, and not why it happened. Those are separate questions, and the review handles them separately.',
  ]);

  const esc = (s) => String(s);
  // [[id|words]] -> button
  const fmt = (html) => html.replace(/\[\[([a-z]+)\|([^\]]+)\]\]/g, (m, id, w) => (L[id] ? `<button type="button" class="rv-term" data-lesson="${id}">${w}</button>` : w));
  const link = (id, words) => `<button type="button" class="rv-term" data-lesson="${id}">${words}</button>`;

  let overlay = null, stack = [];
  function render() {
    if (!overlay) return;
    const id = stack[stack.length - 1], lesson = L[id]; if (!lesson) return;
    const needs = lesson.needs.length ? `<p class="rv-needs"><b>Before this, it helps to know:</b> ${lesson.needs.map((n) => link(n, esc(L[n].title))).join(' · ')}</p>` : '';
    overlay.querySelector('.rv-lesson-panel').innerHTML = `<div class="rv-lesson-bar"><button type="button" class="rv-lesson-back"${stack.length > 1 ? '' : ' hidden'}>← Back to ${stack.length > 1 ? esc(L[stack[stack.length - 2]].title) : ''}</button><button type="button" class="rv-lesson-close">Close</button></div>
      <h3>${esc(lesson.title)}</h3>${needs}<ol class="rv-steps">${lesson.steps.map((s) => `<li>${fmt(s)}</li>`).join('')}</ol>`;
    overlay.querySelector('.rv-lesson-panel').scrollTop = 0;
  }
  function open(id) {
    if (!L[id]) return;
    if (!overlay) {
      overlay = document.createElement('div'); overlay.className = 'rv-lesson';
      overlay.innerHTML = '<div class="rv-lesson-panel" role="dialog" aria-modal="true" aria-label="Explanation"></div>';
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay || e.target.closest('.rv-lesson-close')) close();
        else if (e.target.closest('.rv-lesson-back')) { stack.pop(); render(); }
        else { const t = e.target.closest('.rv-term'); if (t) { stack.push(t.dataset.lesson); render(); } }
      });
      document.body.appendChild(overlay);
      document.addEventListener('keydown', onKey, true);
    }
    stack.push(id); render();
  }
  function close() { if (overlay) { overlay.remove(); overlay = null; stack = []; document.removeEventListener('keydown', onKey, true); } }
  function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); close(); } }
  // buttons in a review open a lesson
  document.addEventListener('click', (e) => { const t = e.target.closest && e.target.closest('.rv-term'); if (t && !t.closest('.rv-lesson')) open(t.dataset.lesson); });

  FM.teach = { lessons: L, link, open, close };
})();
