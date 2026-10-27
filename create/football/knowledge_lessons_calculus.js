// A-level Pure: differentiation, one rule per lesson, each derived from the chord idea rather than handed over.
// Every lesson works on the ticket-price model of the student's own stand: seats sold q = A - k p, revenue R = p q.
(function () {
  const FM = (window.FM = window.FM || {});
  const L = (FM.knowledgeLessons = FM.knowledgeLessons || {});
  const m2 = (v) => String(Math.round(v * 100) / 100);
  const sf = (v) => String(+Number(v).toPrecision(3));
  const fr = (a, b) => '\\frac{' + a + '}{' + b + '}';
  const price = (stand, p, say) => ({ kind: 'control', action: 'setTicketPrice', params: { stand: stand.id, price: Math.max(3, Math.round(p)) }, say });
  const demand = (s) => { const k = 0.9 * s.sold / s.price, A = s.sold + k * s.price; return { k, A, R: (p) => p * (A - k * p) }; };
  const second = (d) => d.stands.slice().sort((a, c) => c.seats - a.seats)[1] || d.big;
  const modelLine = (s, dm) => 'Seats sold at price $p$ is $q = ' + m2(dm.A) + ' - ' + m2(dm.k) + 'p$.';
  const example = (d) => (d.example.crowds ? ['(These are example figures until you have played a home match.)'] : []);

  L['p-gradient'] = (d) => {
    const s = d.big, dm = demand(s), p = s.price, k = dm.k, A = dm.A, R0 = dm.R(p), ch = (h) => (dm.R(p + h) - R0) / h;
    const g2 = ch(2);
    return {
      analogy: [
        'Open the ticket prices screen and look at one stand. You choose a price, and the crowd responds: raise it and some fans stay at home, lower it and the stand fills up. The money that comes in is the price multiplied by the number of seats sold. Call that the stand\'s **revenue**.',
        'Every differentiation lesson uses this one idea. The price you set is $p$ (in pounds), the seats you sell is $q$, and the revenue is $R = p \\times q$. Your own ' + s.name + ' numbers are used throughout, so the maths is about your club and not a textbook\'s.',
        'This first lesson asks the question underneath all of calculus: when you move the price a little, how fast does the revenue change?',
      ],
      why: 'The steepness of the revenue curve at today\'s price tells you whether a price rise helps or hurts. Before we can calculate steepness on a curve, we need to know what it even means.',
      steps: [
        { say: ['Last home match ' + s.name + ' sold ' + d.num(s.sold) + ' seats at £' + p + '.'].concat(example(d), ['Use the simple model that about 9% fewer fans come for every 10% added to the price. That is a straight line:', modelLine(s, dm)]), maths: '$q = ' + m2(A) + ' - ' + m2(k) + 'p$' },
        { say: ['Revenue is price times seats sold, so write it as a function of the price alone.'], maths: ['$R(p) = p \\times q = p(' + m2(A) + ' - ' + m2(k) + 'p) = -' + m2(k) + 'p^2 + ' + m2(A) + 'p$', '$R(' + p + ') = £' + d.num(R0) + '$'] },
        { say: ['Plot revenue up the page and price across. It is an upside-down U.', 'At a very low price the stand is full but each seat earns almost nothing. At a very high price each seat earns a lot but the stand is empty. The best price is somewhere between.', 'The board\'s question is not "what is the revenue?" but "if we add a little to the price, does the revenue go up, and how fast?" That is the steepness of the curve at the price you charge now.'] },
        { say: ['A straight line has one steepness: the change up divided by the change across.', 'A curve has a different steepness at every point, so we start by drawing a straight line between two points on it and see what that tells us. That line is called a **chord**.', 'Take the price you charge now, £' + p + ', and a price £4 higher, £' + (p + 4) + '.'], maths: ['$R(' + p + ') = ' + d.num(R0) + '$ and $R(' + (p + 4) + ') = ' + d.num(dm.R(p + 4)) + '$', '$\\text{gradient of the chord} = ' + fr('R(' + (p + 4) + ') - R(' + p + ')', '4') + ' = ' + fr(d.num(dm.R(p + 4) - R0), '4') + ' = ' + m2(ch(4)) + '$'] },
        { say: ['That says: on average, between £' + p + ' and £' + (p + 4) + ', each extra £1 on the price changes the revenue by about £' + m2(ch(4)) + '.', 'But the curve bends in that gap, so the average is not the steepness at £' + p + ' itself. It is partly the steepness at £' + p + ' and partly the steepness at £' + (p + 4) + '.', 'So move the second price closer. Same calculation, a smaller step $h$ each time:'], maths: [2, 1, 0.1, 0.01].map((h) => '$h = ' + h + ':\\quad ' + fr('R(' + m2(p + h) + ') - R(' + p + ')', h) + ' = ' + m2(ch(h)) + '$') },
        { say: ['Look at the answers: ' + m2(ch(4)) + ', ' + m2(ch(2)) + ', ' + m2(ch(1)) + ', ' + m2(ch(0.1)) + ', ' + m2(ch(0.01)) + '. They are settling on one number, about ' + m2(A - 2 * k * p) + '.', 'As the second price closes in on the first, the chord turns into the line that just touches the curve at £' + p + ': the **tangent**. The steepness of the tangent is what we call the gradient of the curve at that point.'] },
        { say: ['Mathematicians write "the step shrinks to nothing" as a limit. The gradient of the revenue curve at $p$ is called the derivative, and it is written like this:'], maths: '$\\frac{dR}{dp} = \\lim_{h \\to 0} ' + fr('R(p + h) - R(p)', 'h') + '$' },
        { say: ['Read $\\frac{dR}{dp}$ as "how many pounds of revenue per extra £1 on the price". Positive means a rise in price still helps. Negative means a rise now costs you. Zero means you are at the top of the curve.', 'Next lesson we do the chord algebra once with $h$ left as a letter, so we never have to shrink steps by hand again.'] },
      ],
      ask: { q: 'Use the chord method on ' + s.name + '. Work out the average rate of change of $R(p) = -' + m2(k) + 'p^2 + ' + m2(A) + 'p$ between £' + p + ' and £' + (p + 2) + ': that is $' + fr('R(' + (p + 2) + ') - R(' + p + ')', '2') + '$.', kind: 'number', answer: g2, unit: '£ per £1', tol: 0.1, rubric: 'Correct ' + m2(g2) + ' (R(' + (p + 2) + ') - R(' + p + ')) / 2, using R(p) = p(A - kp) with A = ' + m2(A) + ', k = ' + m2(k) + '. Accept within 0.1. Working should show both revenues.', worked: ['$R(' + p + ') = ' + d.num(R0) + '$ and $R(' + (p + 2) + ') = ' + d.num(dm.R(p + 2)) + '$.', 'The difference is ' + d.num(dm.R(p + 2) - R0) + ', divided by 2 is ' + m2(g2) + '.'], apply: price(s, p + (g2 > 0 ? 1 : -1), (g2 > 0 ? 'Revenue is still rising with price: raise ' : 'Revenue is falling with price: cut ') + s.name + ' by £1') },
      next: 'Doing that chord calculation for every price would be slow. Can we do the algebra once, with $h$ left as a letter, and get the gradient at every price in one go? That is differentiation from first principles.',
    };
  };

  L['p-firstprin'] = (d) => {
    const s = d.big, dm = demand(s), p = s.price, k = dm.k, A = dm.A, g = (q) => A - 2 * k * q;
    return {
      analogy: [
        'Last lesson you found the steepness of your revenue curve by drawing chords to a nearby price and shrinking the gap. It worked, but it meant a new set of calculations for every price. A tactics analyst would never accept that: they want one formula that gives the answer at any price.',
        'First principles means doing the chord algebra once, keeping the step size as a letter $h$, and then letting $h$ shrink. We do it first on a pitch-sized picture (a square training grid) and then on the revenue from ' + s.name + '.',
      ],
      why: 'Do the chord algebra once with $h$ as a letter, and you get the gradient at every point. The power rule you will use for the rest of the course is just the outcome.',
      steps: [
        { say: ['Recall the definition of the gradient at $x$:'], maths: '$f\'(x) = \\lim_{h \\to 0} ' + fr('f(x + h) - f(x)', 'h') + '$' },
        { say: ['Start with the simplest curve that bends: $f(x) = x^2$.', 'Picture a square training grid that is $x$ metres on each side. Its area is $x^2$. Now push each side out by a small $h$. How much extra grass do you add?', 'Two long strips of $x$ by $h$, and a tiny corner square $h$ by $h$.'], maths: ['$f(x + h) = (x + h)^2 = x^2 + 2xh + h^2$', '$f(x + h) - f(x) = 2xh + h^2$'] },
        { say: ['Divide by $h$ to get the gradient of the chord, then let $h$ shrink.'], maths: ['$' + fr('2xh + h^2', 'h') + ' = 2x + h$', '$f\'(x) = \\lim_{h \\to 0} (2x + h) = 2x$'] },
        { say: ['The corner square $h^2$ is the reason $h$ stays in the answer until the very end. Once $h$ shrinks to nothing that corner vanishes, and only the two strips are left: $2x$.'] },
        { say: ['Now the same algebra on the real thing: the revenue from ' + s.name + ', $R(p) = -' + m2(k) + 'p^2 + ' + m2(A) + 'p$.', 'Replace $p$ by $p + h$ and expand the bracket.'].concat(example(d)), maths: ['$R(p + h) = -' + m2(k) + '(p + h)^2 + ' + m2(A) + '(p + h)$', '$R(p + h) = -' + m2(k) + 'p^2 - ' + m2(2 * k) + 'ph - ' + m2(k) + 'h^2 + ' + m2(A) + 'p + ' + m2(A) + 'h$'] },
        { say: ['Subtract $R(p)$. The $p^2$ and $p$ terms cancel, leaving only the terms with an $h$ in them.', 'Then divide everything by $h$.'], maths: ['$R(p + h) - R(p) = -' + m2(2 * k) + 'ph - ' + m2(k) + 'h^2 + ' + m2(A) + 'h$', '$' + fr('R(p + h) - R(p)', 'h') + ' = ' + m2(A) + ' - ' + m2(2 * k) + 'p - ' + m2(k) + 'h$'] },
        { say: ['Let $h \\to 0$. The last term disappears.'], maths: '$\\frac{dR}{dp} = ' + m2(A) + ' - ' + m2(2 * k) + 'p$' },
        { say: ['That is the gradient at every price. Put in the price you charge today, £' + p + ', and you get ' + m2(g(p)) + '. Compare with the chords last lesson: they were heading for exactly this number.'] },
        { say: ['Try one more shape, $f(x) = x^3$, because the pattern is about to appear.', 'Expanding $(x + h)^3$ gives $x^3 + 3x^2h + 3xh^2 + h^3$.'], maths: ['$' + fr('(x + h)^3 - x^3', 'h') + ' = ' + fr('3x^2h + 3xh^2 + h^3', 'h') + ' = 3x^2 + 3xh + h^2$', '$f\'(x) = 3x^2$'] },
        { say: ['Square gave $2x$. Cube gave $3x^2$. For a general power $x^n$, the binomial expansion gives $(x + h)^n = x^n + nx^{n-1}h + (\\text{terms with } h^2 \\text{ or more})$.', 'Subtract $x^n$ and divide by $h$: the first term survives as $nx^{n-1}$, and every other term still has an $h$ in it, so it vanishes as $h \\to 0$.'], maths: '$\\frac{d}{dx}(x^n) = nx^{n-1}$' },
        { say: ['That is the power rule, and now you know where it comes from: not magic, just the chord algebra done once for every $n$. The next lesson puts it to work.'] },
      ],
      ask: { q: 'You worked out that the chord gradient of $R(p) = -' + m2(k) + 'p^2 + ' + m2(A) + 'p$ is $' + m2(A) + ' - ' + m2(2 * k) + 'p - ' + m2(k) + 'h$. Let $h \\to 0$ and find the gradient of the revenue curve at £' + (p + 4) + ', a price you might move ' + s.name + ' up to.', kind: 'number', answer: g(p + 4), unit: '£ per £1', tol: 0.1, rubric: 'Correct ' + m2(g(p + 4)) + ': the limit as h->0 gives A - 2kp = ' + m2(A) + ' - ' + m2(2 * k) + 'p, evaluated at p = ' + (p + 4) + '. Accept within 0.1.', worked: ['As $h \\to 0$ the $-' + m2(k) + 'h$ term vanishes, so $\\frac{dR}{dp} = ' + m2(A) + ' - ' + m2(2 * k) + 'p$.', 'At $p = ' + (p + 4) + '$: $' + m2(A) + ' - ' + m2(2 * k) + ' \\times ' + (p + 4) + ' = ' + m2(g(p + 4)) + '$.'], apply: price(s, p + (g(p + 4) > 0 ? 2 : -2), (g(p + 4) > 0 ? 'The curve is still rising there: move ' : 'The curve is already falling there: move ') + s.name + (g(p + 4) > 0 ? ' up by £2' : ' down by £2')) },
      next: 'With the power rule in hand, shall we use it on the whole revenue curve, and see why constants vanish and negative powers work too?',
    };
  };

  L['p-diffpowers'] = (d) => {
    const s = d.big, dm = demand(s), p = s.price, k = dm.k, A = dm.A, n = s.sold, F = 3 * s.seats, o = second(d), od = demand(o), g = A - 2 * k * p;
    const og = od.A - 2 * od.k * o.price, cn = -F / (n * n);
    return {
      analogy: [
        'Differentiation from first principles gave one result: the derivative of $x^n$ is $nx^{n-1}$. Real revenue and cost models are sums of several such terms, with numbers multiplying them and fixed amounts added on. This lesson shows how to differentiate all of that, using the revenue from your stand and the cost of staging a match.',
        'Two quantities appear. **Revenue** $R(p)$ comes from tickets. **Fixed matchday cost** is the money that is spent whether or not anyone comes: floodlights, the pitch crew, rostered stewards. We take it as £3 for every seat in the stand, so for ' + s.name + ' it is £' + d.num(F) + '.',
      ],
      why: 'Revenue models are sums of powers of the price with numbers in front. The power rule, plus two small facts about multiples and sums, differentiates all of them.',
      steps: [
        { say: ['From first principles: $\\frac{d}{dx}(x^n) = nx^{n-1}$. Multiply by the power, then drop the power by one.', 'Check it with two values you already know: $x^2 \\to 2x$ and $x^3 \\to 3x^2$.'] },
        { say: ['A number multiplying a function. Take the chord of $3f$: it is $3\\times$ the chord of $f$, because every height is multiplied by 3. So the gradient is multiplied by 3 too.', 'Revenue has $-' + m2(k) + 'p^2$ in it, so the $-' + m2(k) + '$ simply rides along.'], maths: '$\\frac{d}{dx}\\big(a f(x)\\big) = a f\'(x)$' },
        { say: ['A sum. The chord of $f + g$ is the chord of $f$ plus the chord of $g$, for the same reason: heights add, so differences add.', 'That means you can differentiate a sum one term at a time.'], maths: '$\\frac{d}{dx}\\big(f(x) + g(x)\\big) = f\'(x) + g\'(x)$' },
        { say: ['Apply both to ' + s.name + '\'s revenue, $R = -' + m2(k) + 'p^2 + ' + m2(A) + 'p$. The second term is $' + m2(A) + 'p^1$.'].concat(example(d)), maths: ['$\\frac{d}{dp}(-' + m2(k) + 'p^2) = -' + m2(k) + ' \\times 2p = -' + m2(2 * k) + 'p$', '$\\frac{d}{dp}(' + m2(A) + 'p^1) = ' + m2(A) + ' \\times 1 \\times p^0 = ' + m2(A) + '$', '$\\frac{dR}{dp} = ' + m2(A) + ' - ' + m2(2 * k) + 'p$'] },
        { say: ['Now the fixed matchday cost of £' + d.num(F) + '. Profit from the stand is revenue minus that cost:'], maths: '$P = -' + m2(k) + 'p^2 + ' + m2(A) + 'p - ' + d.num(F) + '$' },
        { say: ['What happens to a constant when you differentiate? Draw it: a constant is a flat horizontal line, and a flat line has gradient 0. From first principles the chord is $\\frac{c - c}{h} = 0$.', 'So the £' + d.num(F) + ' disappears. A fixed cost has no effect on how profit changes when the price changes. It shifts the whole curve down but does not tilt it.'], maths: '$\\frac{dP}{dp} = ' + m2(A) + ' - ' + m2(2 * k) + 'p$' },
        { say: ['The power rule works for negative powers too. The cost spread over each fan is the fixed cost divided by the crowd, $c = ' + fr('F', 'n') + ' = F n^{-1}$.', 'Multiply by the power, reduce it by one: $-1 \\times n^{-2}$.'], maths: ['$c = ' + d.num(F) + 'n^{-1}$', '$\\frac{dc}{dn} = -' + d.num(F) + 'n^{-2} = -' + fr(d.num(F), 'n^2') + '$'] },
        { say: ['At today\'s crowd of ' + d.num(n) + ', that is ' + sf(cn) + '. In words: one extra fan reduces the fixed cost carried by each fan by about ' + sf(-cn * 100) + 'p.', 'Fractional powers work too: $\\sqrt{x}$ is $x^{1/2}$, so its derivative is $\\frac{1}{2}x^{-1/2}$. We will prove the negative and fractional cases properly in the quotient and chain rule lessons.'] },
      ],
      ask: { q: 'Differentiate the profit from ' + o.name + ', $P = -' + m2(od.k) + 'p^2 + ' + m2(od.A) + 'p - ' + d.num(3 * o.seats) + '$ (the last term is its fixed matchday cost), and find $\\frac{dP}{dp}$ at its current price of £' + o.price + '.', kind: 'number', answer: og, unit: '£ per £1', tol: 0.1, rubric: 'Correct ' + m2(og) + ': dP/dp = A - 2kp (the constant disappears) with A = ' + m2(od.A) + ', k = ' + m2(od.k) + ', p = ' + o.price + '. Accept within 0.1. Penalise anyone who differentiates the constant into anything.', worked: ['The constant ' + d.num(3 * o.seats) + ' differentiates to 0.', '$\\frac{dP}{dp} = ' + m2(od.A) + ' - ' + m2(2 * od.k) + 'p$.', 'At $p = ' + o.price + '$ this is ' + m2(og) + '.'], apply: price(o, o.price + (og > 0 ? 1 : -1), (og > 0 ? 'Profit is still rising with price: raise ' : 'Profit is falling with price: cut ') + o.name + ' by £1') },
      next: 'Where the gradient is exactly zero, profit is neither rising nor falling. That is where we will look for the best price. But first, two more tools for differentiating products and nested functions: the chain rule and the product rule.',
    };
  };

  L['p-chain'] = (d) => {
    const s = d.big, dm = demand(s), p = s.price, k = dm.k, A = dm.A, n = s.sold, c = 0.06 * p / n, dCdn = 2 * c * n, dndp = -k, ans = dCdn * dndp;
    return {
      analogy: [
        'Some things in a football club do not depend on the price directly, but through something else. The ticket price changes how many fans come. The number of fans then changes the stewarding and safety bill: more fans means more stewards, more barriers, more cleaning, and the cost grows faster than the crowd does.',
        'So there is a chain of two machines: price $p$ goes into the demand machine and out comes the crowd $n$; the crowd goes into the cost machine and out comes the stewarding cost $C$. The chain rule is how you get the speed of the whole chain from the speed of each link.',
        'In this model the stewarding cost is $C = ' + sf(c) + 'n^2$, set so that at today\'s crowd of ' + d.num(n) + ' it is 6% of the stand\'s ticket revenue. It is a model, not a measurement, but it behaves the way real safety costs do.',
      ],
      why: 'When one quantity depends on a second, which depends on a third, the rates of change multiply along the chain.',
      steps: [
        { say: ['Link one: price to crowd. For ' + s.name + ':'].concat(example(d)), maths: '$n = ' + m2(A) + ' - ' + m2(k) + 'p$' },
        { say: ['Link two: crowd to stewarding cost.'], maths: '$C = ' + sf(c) + 'n^2$' },
        { say: ['The question the finance director asks: if we put the price up by £1, how much does the stewarding bill change?', 'We can answer each link separately. Link one: a £1 rise in price changes the crowd by $\\frac{dn}{dp} = -' + m2(k) + '$ fans. Link two: one extra fan changes the cost by $\\frac{dC}{dn} = ' + sf(2 * c) + 'n$ pounds, which at ' + d.num(n) + ' fans is £' + m2(dCdn) + '.'] },
        { say: ['Put them together in your head: each £1 on the price removes ' + m2(k) + ' fans, and each fan removed saves £' + m2(dCdn) + '. So per £1 on the price:', 'Why does multiplying work? Because rates are ratios of changes, and the middle change cancels.'], maths: ['$' + fr('\\Delta C', '\\Delta p') + ' = ' + fr('\\Delta C', '\\Delta n') + ' \\times ' + fr('\\Delta n', '\\Delta p') + '$', '$' + fr('dC', 'dp') + ' = ' + fr('dC', 'dn') + ' \\times ' + fr('dn', 'dp') + '$'] },
        { say: ['That is the chain rule. It has to be $\\frac{dC}{dp}$ because we want cost against price, and $n$ is the link in the middle that cancels.'], maths: '$\\frac{dC}{dp} = ' + sf(2 * c) + 'n \\times (-' + m2(k) + ') = ' + m2(ans) + '$' },
        { say: ['The same thing the other way round. Substitute the crowd into the cost first, so $C$ is a function of the price straight away.'], maths: ['$C = ' + sf(c) + '(' + m2(A) + ' - ' + m2(k) + 'p)^2$'] },
        { say: ['Now you can see the rule in its working form: **differentiate the outside, leave the inside alone, then multiply by the derivative of the inside.**', 'Outside: the squaring, which gives $2(\\ldots)$. Inside: the bracket $(' + m2(A) + ' - ' + m2(k) + 'p)$, which has derivative $-' + m2(k) + '$.'], maths: ['$\\frac{dC}{dp} = ' + sf(c) + ' \\times 2(' + m2(A) + ' - ' + m2(k) + 'p) \\times (-' + m2(k) + ')$', '$\\frac{d}{dx} f(g(x)) = f\'(g(x)) \\times g\'(x)$'] },
        { say: ['At the price you charge now, the bracket is $' + m2(A) + ' - ' + m2(k) + ' \\times ' + p + ' = ' + d.num(n) + '$, which is today\'s crowd, so the answer is ' + m2(ans) + '.', 'Each £1 on the price trims the stewarding bill by about £' + m2(-ans) + '. A bigger saving than the crowd shrinking alone would suggest, because the cost curve is steep at this size of crowd.'] },
      ],
      ask: { q: 'For ' + s.name + ' the stewarding cost is $C = ' + sf(c) + '(' + m2(A) + ' - ' + m2(k) + 'p)^2$. Use the chain rule to find $\\frac{dC}{dp}$ at the current price of £' + p + '.', kind: 'number', answer: ans, unit: '£ per £1', tol: Math.max(0.5, Math.abs(ans) * 0.01), rubric: 'Correct ' + m2(ans) + ' (negative, with sensible units). Chain rule: 2 x ' + sf(c) + ' x (A - kp) x (-k) at p = ' + p + ', where A - kp = ' + d.num(n) + '. Accept within 1%.', worked: ['Outside: $2 \\times ' + sf(c) + ' \\times (\\text{bracket})$. Inside derivative: $-' + m2(k) + '$.', 'At $p = ' + p + '$ the bracket is ' + d.num(n) + ', so $\\frac{dC}{dp} = 2 \\times ' + sf(c) + ' \\times ' + d.num(n) + ' \\times (-' + m2(k) + ') = ' + m2(ans) + '$.'], apply: price(s, p + 1, 'Put ' + s.name + ' up by £1: the stewarding bill falls by about £' + m2(-ans)) },
      next: 'Revenue itself is price multiplied by crowd, and both of those change with the price. How do you differentiate two changing things multiplied together? That is the product rule.',
    };
  };

  L['p-product'] = (d) => {
    const s = d.big, dm = demand(s), p = s.price, k = dm.k, A = dm.A, n = s.sold, o = second(d), od = demand(o), oans = o.sold - od.k * o.price;
    return {
      analogy: [
        'Revenue is the price multiplied by the number of seats sold. Both of those change when you move the price: the price obviously, but also the crowd, which falls as the price rises. A product of two changing things is the commonest shape in club finance (price times crowd, crowd times spend per head, shots times conversion rate), so you need a rule for its gradient.',
        'Use ' + s.name + ': the price is $u = p$ and the seats sold are $v = ' + m2(A) + ' - ' + m2(k) + 'p$, so $R = uv$. Today it sold ' + d.num(n) + ' seats at £' + p + '.',
      ],
      why: 'Revenue is two changing things multiplied together, and the gradient of a product is not the product of the gradients.',
      steps: [
        { say: ['The tempting guess is "differentiate each and multiply": $u\' \\times v\'$.', 'Test it on something you already know. Here $u = p$ so $u\' = 1$, and $v = ' + m2(A) + ' - ' + m2(k) + 'p$ so $v\' = -' + m2(k) + '$. The guess gives $-' + m2(k) + '$.', 'But from first principles we already found $\\frac{dR}{dp} = ' + m2(A) + ' - ' + m2(2 * k) + 'p$, which at £' + p + ' is ' + m2(A - 2 * k * p) + '. The guess is wrong.'].concat(example(d)) },
        { say: ['See why with a picture. Revenue is a rectangle: the width is the price, the height is the crowd. Add a small $h$ to the price.', 'A strip of width $h$ is added along the whole height: that is extra money from the fans who still come. But the crowd falls, so a strip is lost from the top: the fans who stayed away, each of whom was paying the full price.', 'Two things change at once, and the gradient has to count both.'] },
        { say: ['Now the algebra. The chord of $R = uv$ is the new rectangle minus the old, over $h$. Add and subtract the same quantity, $u(x+h)v(x)$, to split it into two parts:'], maths: ['$' + fr('u(x+h)v(x+h) - u(x)v(x)', 'h') + '$', '$= u(x+h)' + fr('v(x+h) - v(x)', 'h') + ' + v(x)' + fr('u(x+h) - u(x)', 'h') + '$'] },
        { say: ['As $h \\to 0$, $u(x+h)$ becomes $u(x)$, and each fraction becomes a derivative. That gives the product rule:'], maths: '$\\frac{d}{dx}(uv) = u v\' + v u\'$' },
        { say: ['In words: **the first times the derivative of the second, plus the second times the derivative of the first.**', 'Apply it to ' + s.name + ':'], maths: ['$u = p, \\quad u\' = 1$', '$v = ' + m2(A) + ' - ' + m2(k) + 'p, \\quad v\' = -' + m2(k) + '$', '$\\frac{dR}{dp} = p(-' + m2(k) + ') + (' + m2(A) + ' - ' + m2(k) + 'p)(1) = ' + m2(A) + ' - ' + m2(2 * k) + 'p$'] },
        { say: ['The same answer as first principles, which is the check that the rule is right.', 'Now read the two parts as money. At £' + p + ':', '$v \\times u\'$ is ' + d.num(n) + ' $\\times$ 1 = £' + d.num(n) + ': the gain from every fan who stays paying £1 more.', '$u \\times v\'$ is $' + p + ' \\times (-' + m2(k) + ')$ = £' + m2(-p * k) + ': the loss from the ' + m2(k) + ' fans who leave, each of whom was paying £' + p + '.', 'Add them: £' + m2(n - p * k) + '. The two forces nearly cancel, which tells you that you are close to the best price.'] },
      ],
      ask: { q: 'Use the product rule on ' + o.name + '. Its seats sold are $v = ' + m2(od.A) + ' - ' + m2(od.k) + 'p$ and the revenue is $R = p \\times v$. Find $\\frac{dR}{dp}$ at its current price of £' + o.price + '.', kind: 'number', answer: oans, unit: '£ per £1', tol: 0.1, rubric: 'Correct ' + m2(oans) + ': u = p, v = ' + m2(od.A) + ' - ' + m2(od.k) + 'p, so dR/dp = v + p(-k) at p = ' + o.price + '. Accept within 0.1. Must use u v\' + v u\'.', worked: ['$u = p$, $u\' = 1$; $v = ' + m2(od.A) + ' - ' + m2(od.k) + 'p$, $v\' = -' + m2(od.k) + '$.', '$\\frac{dR}{dp} = v + p v\' = ' + d.num(o.sold) + ' - ' + o.price + ' \\times ' + m2(od.k) + ' = ' + m2(oans) + '$.'], apply: price(o, o.price + (oans > 0 ? 1 : -1), (oans > 0 ? 'Revenue is rising with price: raise ' : 'Revenue is falling with price: cut ') + o.name + ' by £1') },
      next: 'What if one thing is divided by another, like cost per fan? That is the quotient rule, and you can build it from the two rules you already have.',
    };
  };

  L['p-quotient'] = (d) => {
    const s = d.big, dm = demand(s), p = s.price, k = dm.k, A = dm.A, n = s.sold, F = 3 * s.seats, w = 1.2, per = (F + w * n) / n, ans = k * F / (n * n);
    return {
      analogy: [
        'A club runs on ratios: cost per fan, goals per shot, points per game, revenue per seat. A ratio is one thing divided by another, and when the price changes, both the top and the bottom can change.',
        'Here the ratio is the cost of putting on the match for each fan in ' + s.name + '. The top is the total matchday cost for the stand, which is a fixed £' + d.num(F) + ' (£3 per seat for lights, pitch crew and stewards) plus £' + w + ' for every fan (programmes, cleaning). The bottom is the crowd.',
        'Raise the price and the crowd shrinks, so the same fixed cost is shared among fewer people. The quotient rule says how fast that bites.',
      ],
      why: 'The cost per fan is a fraction whose top and bottom both depend on the price. The quotient rule differentiates it, and you can build the rule from the product and chain rules.',
      steps: [
        { say: ['The crowd is $v = ' + m2(A) + ' - ' + m2(k) + 'p$. The total cost for the stand is $u = ' + d.num(F) + ' + ' + w + 'v$. The cost per fan is:'].concat(example(d)), maths: '$c = ' + fr('u', 'v') + ' = ' + fr(d.num(F) + ' + ' + w + '(' + m2(A) + ' - ' + m2(k) + 'p)', m2(A) + ' - ' + m2(k) + 'p') + '$' },
        { say: ['At today\'s price the cost per fan is $' + fr(d.num(F + w * n), d.num(n)) + ' = £' + m2(per) + '$.', 'We want to know how this changes when the price changes, so we need $\\frac{dc}{dp}$.'] },
        { say: ['Build the rule. Write the fraction as a product: $\\frac{u}{v} = u \\times v^{-1}$.', 'The product rule gives $u\' v^{-1} + u \\times \\frac{d}{dp}(v^{-1})$. For the second part use the chain rule: the outside is "to the power $-1$", which gives $-v^{-2}$, then multiply by the inside derivative $v\'$.'], maths: ['$\\frac{d}{dp}(v^{-1}) = -v^{-2} \\times v\' = -' + fr('v\'', 'v^2') + '$', '$\\frac{d}{dp}' + fr('u', 'v') + ' = ' + fr('u\'', 'v') + ' - ' + fr('u v\'', 'v^2') + '$'] },
        { say: ['Put both parts over $v^2$ to get the standard form:'], maths: '$\\frac{d}{dp}\\left(' + fr('u', 'v') + '\\right) = ' + fr('u\'v - uv\'', 'v^2') + '$' },
        { say: ['Say it as: **bottom times the derivative of the top, minus top times the derivative of the bottom, all over the bottom squared.** The order of the subtraction matters.'] },
        { say: ['The four ingredients for ' + s.name + ' at £' + p + ':'], maths: ['$u = ' + d.num(F + w * n) + ', \\quad u\' = ' + w + ' \\times (-' + m2(k) + ') = -' + m2(w * k) + '$', '$v = ' + d.num(n) + ', \\quad v\' = -' + m2(k) + '$'] },
        { say: ['Substitute.'], maths: ['$\\frac{dc}{dp} = ' + fr('(-' + m2(w * k) + ')(' + d.num(n) + ') - (' + d.num(F + w * n) + ')(-' + m2(k) + ')', d.num(n) + '^2') + '$', '$= ' + fr(m2(k) + ' \\times ' + d.num(F), d.num(n) + '^2') + ' = ' + sf(ans) + '$'] },
        { say: ['Notice that the £' + w + ' per fan cancelled out of the answer completely: the variable cost does not care about the price, because it is per fan and falls in step with the crowd.', 'Only the fixed cost matters. Each £1 on the price raises the cost per fan by about ' + sf(ans * 100) + 'p, because £' + d.num(F) + ' now has to be shared among ' + m2(k) + ' fewer fans.'] },
      ],
      ask: { q: 'Using the quotient rule, find $\\frac{dc}{dp}$ at the current price of £' + p + ' for the cost per fan $c = ' + fr(d.num(F) + ' + ' + w + 'v', 'v') + '$, where $v = ' + m2(A) + ' - ' + m2(k) + 'p$. Give the answer in pounds per £1, to 3 decimal places.', kind: 'number', answer: ans, unit: '£ per £1', tol: Math.max(0.002, Math.abs(ans) * 0.02), rubric: 'Correct ' + sf(ans) + ' (equals kF/v^2 with k = ' + m2(k) + ', F = ' + d.num(F) + ', v = ' + d.num(n) + '). Accept within 2%. Working must apply (u\'v - uv\')/v^2 with u\' = -wk and v\' = -k.', worked: ['$u = ' + d.num(F) + ' + ' + w + 'v$, $u\' = -' + m2(w * k) + '$. $v\' = -' + m2(k) + '$.', '$\\frac{dc}{dp} = ' + fr('u\'v - uv\'', 'v^2') + ' = ' + fr(m2(k) + ' \\times ' + d.num(F), d.num(n) + '^2') + ' = ' + sf(ans) + '$.'], apply: { kind: 'control', action: 'setMarketing', params: { perRound: 15000 }, say: 'Fixed cost is spread over fewer fans as the price rises: set marketing to £15,000 a matchday to protect the crowd' } },
      next: 'You now have the chain, product and quotient rules. Next the standard derivatives of $e^x$, $\\ln x$ and the trigonometric functions each get their own lesson, since each one needs its own explanation.',
    };
  };
})();
