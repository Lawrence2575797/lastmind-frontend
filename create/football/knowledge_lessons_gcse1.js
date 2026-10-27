// GCSE Maths lessons, first set. Each one is a function of the student's own club (knowledge_data.js), so the numbers are theirs, and each ends with a question whose answer
// can be put into the game. A lesson is { why, steps: [{ say: [lines], maths }], ask: { q, kind, answer, unit, tol, worked, apply }, next }.
// The tone is a coach working a problem through with the student: one fact to a line, the analogy kept all the way through, nothing told that can be worked out.
(function () {
  const FM = (window.FM = window.FM || {});
  const L = (FM.knowledgeLessons = FM.knowledgeLessons || {});
  const m = (v) => String(Math.round(v * 100) / 100);
  const A = {
    price: (stand, price, say) => ({ kind: 'control', action: 'setTicketPrice', params: { stand: stand.id, price: Math.max(3, Math.round(price)) }, say: say || 'Set ' + stand.name + ' tickets to £' + Math.max(3, Math.round(price)) }),
    marketing: (x) => ({ kind: 'control', action: 'setMarketing', params: { perRound: Math.max(0, Math.min(60000, Math.round(x))) }, say: 'Set the marketing budget to £' + Math.round(x).toLocaleString('en-GB') + ' a matchday' }),
  };
  const eg = (d, k) => (d.example[k] ? ['(You have not played enough home matches for this yet, so these are example figures. The lesson uses your real ones as the season goes on.)'] : []);

  L['g-ops'] = (d) => {
    const g = d.gate, spend = 5000, bud = 2 * spend + 4000 / 2;
    return {
      why: 'The marketing budget is a sum with a few parts, and the order you do them in changes the answer.',
      steps: [
        { say: ['Right. The club\'s finances are full of sums with several parts, so the first thing to learn is the order to do them in.', 'Take this: the board says marketing is "two lots of £5,000 plus £4,000 shared between two".', 'Written as one line, that is:'], maths: '$2 \\times 5000 + 4000 \\div 2$' },
        { say: ['If you just read it left to right you would get $(2 \\times 5000 + 4000) \\div 2 = 7000$.', 'That is wrong, because the order is fixed.', 'The order is BIDMAS: Brackets, Indices, Division and Multiplication, then Addition and Subtraction.'] },
        { say: ['Division and multiplication come before addition.', 'So first the two jobs: $2 \\times 5000 = 10000$ and $4000 \\div 2 = 2000$.'] , maths: '$10000 + 2000$' },
        { say: ['Only now do we add.'], maths: '$10000 + 2000 = 12000$' },
        { say: ['Brackets are how you change the order on purpose.', 'If the board meant "(two lots of £5,000 plus £4,000) shared between two", they would have to write the brackets:'], maths: '$(2 \\times 5000 + 4000) \\div 2 = 7000$' },
        { say: ['Same numbers, two different budgets. That is why accountants love brackets.'] },
      ],
      ask: { q: 'Work out $2 \\times 5000 + 4000 \\div 2$ and give the marketing budget for a matchday, in pounds.', kind: 'number', answer: bud, unit: '£', tol: 0, rubric: 'Correct answer 12000. Check the order of operations; if they got 7000 they added before dividing.', worked: ['Multiplication and division first: $2 \\times 5000 = 10000$ and $4000 \\div 2 = 2000$.', 'Then add: $10000 + 2000 = 12000$.'], apply: A.marketing(bud) },
      next: 'Now that you can read a long sum in the right order, do you want to see how fractions describe how full your stands are?',
    };
  };

  L['g-frac'] = (d) => {
    const s = d.stands.slice().sort((a, c) => a.sold / a.seats - c.sold / c.seats)[0], f = s.sold / s.seats;
    const gcd = (a, b) => (b ? gcd(b, a % b) : a), g = gcd(s.sold, s.seats), n = s.sold / g, dd = s.seats / g;
    return {
      why: 'Your emptiest stand is a fraction, and fractions are how you read how full a ground is.',
      steps: [
        { say: ['Let\'s look at the emptiest stand you have: ' + s.name + '.', 'It holds ' + d.num(s.seats) + ' seats and at the last home match ' + d.num(s.sold) + ' of them were sold.'].concat(eg(d, 'crowds')), maths: '$\\frac{' + s.sold + '}{' + s.seats + '}$' },
        { say: ['A fraction is "this many out of that many".', 'The top number (the numerator) is the seats sold.', 'The bottom number (the denominator) is the seats there are.'] },
        { say: ['That fraction is correct, but it is clumsy to say.', 'We make it simpler by dividing the top and the bottom by the same number. That keeps the fraction worth the same.', 'The biggest number that goes into both ' + s.sold + ' and ' + s.seats + ' is ' + g + '.'], maths: '$\\frac{' + s.sold + ' \\div ' + g + '}{' + s.seats + ' \\div ' + g + '} = \\frac{' + n + '}{' + dd + '}$' },
        { say: ['Now it reads cleanly: ' + n + ' out of every ' + dd + ' seats in ' + s.name + ' were taken.', 'The fraction that is empty is whatever is left, so we take it from one whole.'], maths: '$1 - \\frac{' + n + '}{' + dd + '} = \\frac{' + (dd - n) + '}{' + dd + '}$' },
        { say: ['Fractions are also how you compare. Is that stand fuller or emptier than half?', 'Half is $\\frac{1}{2}$. Turn it into the same denominator to compare: $\\frac{1}{2} = \\frac{' + dd + '}{' + 2 * dd + '}$ and your fraction is $\\frac{' + 2 * n + '}{' + 2 * dd + '}$.', (2 * n > dd ? 'The top is bigger, so it is more than half full.' : 'The top is smaller, so it is less than half full.')] },
      ],
      ask: { q: 'What fraction of ' + s.name + ' was EMPTY at the last home match? Give it in its simplest form, like 3/8.', kind: 'text', answer: (dd - n) + '/' + dd, tol: 0, rubric: 'Correct answer ' + (dd - n) + '/' + dd + ' (accept any equivalent fraction that is fully simplified; if not simplified give partial). Seats sold ' + s.sold + ', seats ' + s.seats + '.', worked: ['Empty seats = ' + s.seats + ' - ' + s.sold + ' = ' + (s.seats - s.sold) + '.', 'So the fraction is $\\frac{' + (s.seats - s.sold) + '}{' + s.seats + '}$, which simplifies to $\\frac{' + (dd - n) + '}{' + dd + '}$.'], apply: A.price(s, s.price - 2, 'Cut ' + s.name + ' tickets by £2 to try to fill the empty seats') },
      next: 'You now know how much of a stand is empty. Shall we look at how to describe it as a percentage, and what a discount does to it?',
    };
  };

  L['g-pct'] = (d) => {
    const s = d.big, p = s.price, new_ = p * 0.8;
    return {
      why: 'You can put a discount on tickets, and a discount is just a percentage of the price.',
      steps: [
        { say: ['Right, let\'s start with something you do every week: set a price.', s.name + ' tickets are £' + p + ' at the moment.', 'A percentage is a fraction out of 100. "Per cent" means "for every hundred".'], maths: '$20\\% = \\frac{20}{100} = 0.2$' },
        { say: ['So 20% of the price means 20 parts out of every 100 parts of it.', 'The trick is to turn the percentage into a decimal by dividing by 100.', 'Then you multiply by the amount.'], maths: '$20\\% \\text{ of } £' + p + ' = 0.2 \\times ' + p + ' = ' + m(0.2 * p) + '$' },
        { say: ['That is how big the discount is: £' + m(0.2 * p) + ' off each ticket.', 'The new price is what is left after taking it away.'], maths: '$' + p + ' - ' + m(0.2 * p) + ' = ' + m(new_) + '$' },
        { say: ['There is a quicker way, and it is the one you will use all the time.', 'Taking 20% away leaves 80%, which is 0.8.', 'So you can multiply once by 0.8 instead of doing two steps.'], maths: '$' + p + ' \\times 0.8 = ' + m(new_) + '$' },
        { say: ['Same answer, one step. That 0.8 is called a multiplier.', 'For a 15% discount the multiplier would be 0.85; for a 5% discount, 0.95.'] },
      ],
      ask: { q: 'You run a 20% discount on ' + s.name + ' tickets for the next home match. They are £' + p + ' now. What is the new price, in pounds?', kind: 'number', answer: new_, unit: '£', tol: 0.05, rubric: 'Correct answer £' + m(new_) + ' (accept £' + Math.round(new_) + ' if they rounded to whole pounds). A common slip is giving the discount (£' + m(0.2 * p) + ') instead of the new price.', worked: ['20% of ' + p + ' is $0.2 \\times ' + p + ' = ' + m(0.2 * p) + '$.', 'Take it away: $' + p + ' - ' + m(0.2 * p) + ' = ' + m(new_) + '$.', 'Or in one go: $' + p + ' \\times 0.8 = ' + m(new_) + '$.'], apply: A.price(s, new_, 'Put the 20% discount on: set ' + s.name + ' to £' + Math.round(new_)) },
      next: 'Do you want to find out whether a discount like that actually earns you more money, or just gives money away? That needs percentage change.',
    };
  };

  L['g-pctchange'] = (d) => {
    const s = d.stand('premium') || d.big, p = s.price, up = 8, np = p * 1.08;
    const a = d.crowdSeries[d.crowdSeries.length - 2], b = d.crowdSeries[d.crowdSeries.length - 1], ch = ((b - a) / a) * 100;
    return {
      why: 'Your crowd moved between matches, and a percentage change is how you say how big that move was.',
      steps: [
        { say: ['Last home match the crowd was ' + d.num(b) + ', and the one before it was ' + d.num(a) + '.'].concat(eg(d, 'series')).concat(['Was that a big change? It depends how big the crowd was to start with.', 'That is why we use a percentage change: it measures the change against where you started.']) },
        { say: ['First find the change itself: new minus old.'], maths: '$' + b + ' - ' + a + ' = ' + (b - a) + '$' },
        { say: ['Now compare it with the old crowd, because that is where you started.', 'Divide the change by the original, then multiply by 100 to turn it into a percentage.'], maths: '$\\frac{' + (b - a) + '}{' + a + '} \\times 100 = ' + m(ch) + '\\%$' },
        { say: [(ch >= 0 ? 'A positive answer is an increase.' : 'A negative answer means a decrease.'), 'The formula to remember:'], maths: '$\\text{percentage change} = \\frac{\\text{change}}{\\text{original}} \\times 100$' },
        { say: ['Now the other direction: making a change happen.', 'To increase a price by 8%, you add 8% to 100% and get 108%, which is 1.08 as a multiplier.', s.name + ' tickets are £' + p + ', so:'], maths: '$' + p + ' \\times 1.08 = ' + m(np) + '$' },
      ],
      ask: { q: 'You raise ' + s.name + ' tickets by 8%. They cost £' + p + ' now. What is the new price, in pounds?', kind: 'number', answer: np, unit: '£', tol: 0.05, rubric: 'Correct answer £' + m(np) + ' (accept rounding to £' + Math.round(np) + '). Look for the multiplier 1.08 or finding 8% and adding it.', worked: ['The multiplier for an 8% increase is 1.08.', '$' + p + ' \\times 1.08 = ' + m(np) + '$.'], apply: A.price(s, np, 'Raise ' + s.name + ' tickets to £' + Math.round(np)) },
      next: 'Would you like to see what a percentage change does if you apply it backwards, to work out a price from after a discount?',
    };
  };

  L['g-reversepct'] = (d) => {
    const s = d.big, p = s.price, orig = p / 0.8;
    return {
      why: 'If you only know the price after a discount, you can work back to the price before it.',
      steps: [
        { say: ['A fan holds up a ticket for ' + s.name + ' and tells you it was in a 20% off promotion.', 'The price on it is £' + p + '. What was the price before the discount?', 'Your first instinct might be to add 20% on. Don\'t. Here is why.'] },
        { say: ['The 20% was taken off the ORIGINAL price, not off £' + p + '.', 'So £' + p + ' is what was left, which is 80% of the original.'], maths: '$80\\% \\text{ of original} = ' + p + '$' },
        { say: ['If 80% is £' + p + ', then 1% is that divided by 80.'], maths: '$1\\% = \\frac{' + p + '}{80} = ' + m(p / 80) + '$' },
        { say: ['And the original is 100%, so multiply back up by 100.'], maths: '$100\\% = ' + m(p / 80) + ' \\times 100 = ' + m(orig) + '$' },
        { say: ['The quick way is to divide by the multiplier you used going forward.', 'Going forward was $\\times 0.8$, so going back is $\\div 0.8$.'], maths: '$' + p + ' \\div 0.8 = ' + m(orig) + '$' },
        { say: ['If you had added 20% to £' + p + ' you would have got £' + m(p * 1.2) + ', which is wrong.'] },
      ],
      ask: { q: 'A ' + s.name + ' ticket is £' + p + ' after a 20% discount. What was the full price? Give it in pounds.', kind: 'number', answer: orig, unit: '£', tol: 0.05, rubric: 'Correct answer £' + m(orig) + '. If they gave £' + m(p * 1.2) + ' they added 20% to the sale price, which is the classic mistake.', worked: ['The sale price is 80% of the full price.', 'So the full price is $' + p + ' \\div 0.8 = ' + m(orig) + '$.'], apply: A.price(s, orig, 'End the promotion: set ' + s.name + ' back to the full price, £' + Math.round(orig)) },
      next: 'Next, shall we look at what happens when a percentage is applied again and again, like interest on a loan?',
    };
  };

  L['g-ratio'] = (d) => {
    const total = 60000, a = 3, b = 2, part = total / (a + b);
    return {
      why: 'A sponsor\'s money has to be shared, and a ratio is how you say how.',
      steps: [
        { say: ['A sponsor gives ' + d.club + ' £' + d.num(total) + ' to spend on the club.', 'The board says: share it between the youth team and marketing in the ratio 3 : 2.', 'A ratio compares parts. For every 3 pounds to the youth team, 2 pounds go to marketing.'] },
        { say: ['Step one is to count the total number of parts.'], maths: '$3 + 2 = 5 \\text{ parts}$' },
        { say: ['Step two is to find what one part is worth.', 'Divide the whole amount by the number of parts.'], maths: '$\\frac{' + total + '}{5} = ' + part + '$' },
        { say: ['Step three is to multiply by each side\'s share.'], maths: '$\\text{youth: } 3 \\times ' + part + ' = ' + 3 * part + '$' },
        { say: ['And marketing gets 2 parts.'], maths: '$\\text{marketing: } 2 \\times ' + part + ' = ' + 2 * part + '$' },
        { say: ['Check it: the shares must add to the whole. $' + 3 * part + ' + ' + 2 * part + ' = ' + total + '$. They do.'] },
      ],
      ask: { q: 'Share £' + d.num(total) + ' between the youth team and marketing in the ratio 3 : 2. How much does marketing get, in pounds?', kind: 'number', answer: 2 * part, unit: '£', tol: 0, rubric: 'Correct answer ' + 2 * part + ' (marketing is the 2 part). If they gave ' + 3 * part + ' they gave the youth team share.', worked: ['Total parts: 3 + 2 = 5.', 'One part: £' + total + ' ÷ 5 = £' + part + '.', 'Marketing: 2 × £' + part + ' = £' + 2 * part + '.'], apply: A.marketing(2 * part / 8) },
      next: 'Would you like to see how ratio and proportion help you work out what each fan is worth to the club?',
    };
  };

  L['g-rates'] = (d) => {
    const g = d.gate, c = d.crowd, per = g / c;
    return {
      why: 'The money you make per fan is a rate, and a rate tells you whether your prices are working.',
      steps: [
        { say: ['At the last home match ' + d.num(c) + ' fans came and tickets brought in ' + d.gbp(g) + '.'].concat(eg(d, 'gate')).concat(['A rate compares two different kinds of thing: pounds and fans.', 'We write it with the word "per": pounds per fan.']) },
        { say: ['To find a rate, divide the one by the other.', 'Money in, divided by the number of fans.'], maths: '$\\frac{' + Math.round(g) + '}{' + c + '} = ' + m(per) + ' \\text{ pounds per fan}$' },
        { say: ['That is your average ticket price per fan, across all the stands.', 'It is not the same as any one stand\'s price, because the cheap stands and the dear stands are all mixed in.'] },
        { say: ['A rate lets you compare. Suppose next month the crowd is ' + d.num(c + 500) + ' and the gate is ' + d.gbp(g + 9000) + '.', 'Was that a better match for money?'], maths: '$\\frac{' + Math.round(g + 9000) + '}{' + (c + 500) + '} = ' + m((g + 9000) / (c + 500)) + '$' },
        { say: ['Compare ' + m(per) + ' with ' + m((g + 9000) / (c + 500)) + '. The second is ' + ((g + 9000) / (c + 500) > per ? 'higher' : 'lower') + ', so each fan was worth ' + ((g + 9000) / (c + 500) > per ? 'more' : 'less') + '.'] },
      ],
      ask: { q: 'At the last home match the gate was ' + d.gbp(g) + ' from ' + d.num(c) + ' fans. What was the average ticket income per fan, in pounds, to the nearest penny?', kind: 'number', answer: per, unit: '£', tol: 0.01, rubric: 'Correct answer £' + m(per) + ' (gate ÷ crowd). Accept tiny rounding differences.', worked: ['Rate = money ÷ fans.', '$\\frac{' + Math.round(g) + '}{' + c + '} = ' + m(per) + '$.'], apply: A.price(d.big, Math.max(d.big.price, per), 'Set ' + d.big.name + ' tickets to the average income per fan, £' + Math.round(Math.max(d.big.price, per))) },
      next: 'Now: if you charge more per fan, do fewer fans come? Shall we explore proportion, to see how the crowd moves with the price?',
    };
  };

  L['g-directprop'] = (d) => {
    const s = d.big, price = s.price, sold = s.sold, rev = price * sold;
    return {
      why: 'At a fixed price, the money from a stand is directly proportional to how many fans sit in it.',
      steps: [
        { say: [s.name + ' tickets are £' + price + ' and ' + d.num(sold) + ' fans sat there.'].concat(eg(d, 'crowds')).concat(['The money from that stand was $' + price + ' \\times ' + sold + ' = ' + d.num(rev) + '$.', 'Notice something: if the price stays the same, twice the fans brings in exactly twice the money.']) },
        { say: ['That is direct proportion: as one quantity goes up, the other goes up by the same factor.', 'We write it with a constant multiplier. Here the constant is the price.'], maths: '$\\text{money} = ' + price + ' \\times \\text{fans}$' },
        { say: ['This is a straight-line relationship through zero. No fans means no money.', 'If 1 fan brings £' + price + ', then 100 fans bring $100 \\times ' + price + ' = ' + 100 * price + '$.'] },
        { say: ['So you can predict. Suppose a marketing push brings 20% more fans into ' + s.name + '.', 'More fans, same price: the money is also 20% more.'], maths: '$' + d.num(rev) + ' \\times 1.2 = ' + d.num(rev * 1.2) + '$' },
        { say: ['Or work from the fans: ' + d.num(sold) + ' × 1.2 = ' + d.num(sold * 1.2) + ' fans.', 'The stand holds ' + d.num(s.seats) + ', so ' + (sold * 1.2 <= s.seats ? 'they all fit' : 'only ' + d.num(s.seats) + ' fit, and the rest are turned away') + '.'] },
      ],
      ask: { q: 'If marketing brings 20% more fans into ' + s.name + ' at £' + price + ', how much ticket money does that stand bring in, in pounds? (Use ' + d.num(sold) + ' fans now, and remember the stand holds ' + d.num(s.seats) + '.)', kind: 'number', answer: Math.min(sold * 1.2, s.seats) * price, unit: '£', tol: 1, rubric: 'Correct answer ' + Math.round(Math.min(sold * 1.2, s.seats) * price) + ': fans = min(' + Math.round(sold * 1.2) + ', ' + s.seats + '), times £' + price + '.', worked: ['New fans: $' + sold + ' \\times 1.2 = ' + Math.round(sold * 1.2) + '$ (capped at ' + s.seats + ' seats).', 'Money: ' + Math.round(Math.min(sold * 1.2, s.seats)) + ' × £' + price + ' = ' + d.num(Math.min(sold * 1.2, s.seats) * price) + '.'], apply: A.marketing(15000) },
      next: 'Direct proportion is one half of the story. Do you want to see how it differs from inverse proportion, where one thing goes up and the other falls?',
    };
  };

  L['g-lineareq'] = (d) => {
    const s = d.big, fixed = 15000, sold = s.sold, p = Math.ceil(fixed / sold);
    return {
      why: 'Finding the price that just covers your costs is an equation, and equations are solved by undoing steps.',
      steps: [
        { say: ['Say the ' + s.name + ' costs £' + d.num(fixed) + ' to open for a match, and ' + d.num(sold) + ' fans are expected.', 'What price would make the stand just cover its costs?', 'We don\'t know the price, so we give it a letter: $p$.'], maths: '$\\text{money in} = p \\times ' + sold + '$' },
        { say: ['Break-even means money in equals the cost.'], maths: '$' + sold + 'p = ' + fixed + '$' },
        { say: ['An equation is a balance. Whatever you do to one side you do to the other, to keep it balanced.', 'We want $p$ on its own, and at the moment it is multiplied by ' + sold + '.', 'To undo a multiplication, divide.'], maths: '$p = \\frac{' + fixed + '}{' + sold + '}$' },
        { say: ['Work it out.'], maths: '$p = ' + m(fixed / sold) + '$' },
        { say: ['Check by putting it back in: $' + sold + ' \\times ' + m(fixed / sold) + ' = ' + Math.round(sold * (fixed / sold)) + '$. It gives back ' + d.num(fixed) + '. Balanced.', 'Tickets are sold in whole pounds, so round up to £' + p + ' to be sure of covering the cost.'] },
      ],
      ask: { q: 'Solve $' + sold + 'p = ' + fixed + '$ to find the break-even ticket price for ' + s.name + ', and give the price you would actually charge in whole pounds (round up).', kind: 'number', answer: p, unit: '£', tol: 0, rubric: 'Equation answer ' + m(fixed / sold) + '; the whole-pound price is £' + p + '. Accept ' + p + ' as correct; accept ' + m(fixed / sold) + ' as the solution of the equation but note the question asks for whole pounds rounded up.', worked: ['Divide both sides by ' + sold + ': $p = \\frac{' + fixed + '}{' + sold + '} = ' + m(fixed / sold) + '$.', 'Round up to £' + p + '.'], apply: A.price(s, Math.max(p, s.price), 'Set ' + s.name + ' tickets to £' + Math.max(p, s.price)) },
      next: 'You have solved for the price. Shall we look at rearranging the formula itself, so you can solve for whichever letter you need?',
    };
  };

  L['g-formulae'] = (d) => {
    const s = d.big, target = 150000, c = s.sold, p = Math.ceil(target / c);
    return {
      why: 'The revenue formula links price, fans and money, and rearranging it answers three different questions.',
      steps: [
        { say: ['The ' + s.name + ' revenue follows a formula:'], maths: '$T = n \\times p$' },
        { say: ['$T$ is the revenue, $n$ is the number of fans and $p$ is the ticket price.', 'As it stands, it is a formula for $T$: the subject of the formula is $T$.', 'But the board asks a different question: "What price do we need?"'] },
        { say: ['Rearranging means getting the letter you want on its own, doing the same to both sides.', '$p$ is multiplied by $n$, so divide both sides by $n$.'], maths: '$p = \\frac{T}{n}$' },
        { say: ['Now the same formula answers a new question without starting again.', 'And if the question is "how many fans do we need at this price?":'], maths: '$n = \\frac{T}{p}$' },
        { say: ['You are using the same relationship three ways. That is the power of a formula.', 'With a target of £' + d.num(target) + ' and ' + d.num(c) + ' fans, the price is $p = \\frac{' + target + '}{' + c + '} = ' + m(target / c) + '$.'] },
      ],
      ask: { q: 'Use $p = \\frac{T}{n}$ to find the price (in whole pounds, rounded up) that would bring in £' + d.num(target) + ' from ' + d.num(c) + ' fans in ' + s.name + '.', kind: 'number', answer: p, unit: '£', tol: 0, rubric: 'Correct ' + m(target / c) + ' rounded up to £' + p + '. Accept ' + m(target / c) + ' with correct method.', worked: ['$p = \\frac{T}{n} = \\frac{' + target + '}{' + c + '} = ' + m(target / c) + '$.', 'Round up to £' + p + ' so you reach the target.'], apply: A.price(s, p, 'Set ' + s.name + ' tickets to £' + p) },
      next: 'Do you want to try the same thing with something that has more than one fan group, using simultaneous equations?',
    };
  };

  L['g-inequal'] = (d) => {
    const b = 12000, cost = 5000, fixed = 2000, maxM = Math.floor((b - fixed) / 1);
    return {
      why: 'The marketing budget has a ceiling, and a ceiling is an inequality.',
      steps: [
        { say: ['The board lets you spend at most £' + d.num(b) + ' a matchday on marketing and the youth team together.', 'The youth team already costs £' + d.num(cost) + '.', 'How much can marketing be?'] },
        { say: ['"At most" means less than or equal to. We write it with the sign $\\le$.', 'Let $x$ be the marketing budget.'], maths: '$x + ' + cost + ' \\le ' + b + '$' },
        { say: ['An inequality is solved just like an equation: do the same to both sides.', 'Take ' + cost + ' from each side.'], maths: '$x \\le ' + (b - cost) + '$' },
        { say: ['The answer is not one number: it is every number up to ' + d.num(b - cost) + '.', 'We can show it on a number line with a filled dot at ' + d.num(b - cost) + ' and an arrow going left.', 'The dot is filled because the sign has "or equal to".'] },
        { say: ['One more rule: if you multiply or divide by a NEGATIVE number, the sign flips.', 'For example $-2x \\le 6$ becomes $x \\ge -3$. Positive numbers never flip it.'] },
      ],
      ask: { q: 'Solve $x + ' + cost + ' \\le ' + b + '$. What is the largest marketing budget, in pounds, you can set?', kind: 'number', answer: b - cost, unit: '£', tol: 0, rubric: 'Correct ' + (b - cost) + ' (x ≤ ' + (b - cost) + '). The maximum allowed value is the answer.', worked: ['Subtract ' + cost + ' from both sides: $x \\le ' + (b - cost) + '$.', 'The biggest allowed budget is £' + d.num(b - cost) + '.'], apply: A.marketing(b - cost) },
      next: 'Would you like to move on to graphs and see how this budget line looks drawn on axes?',
    };
  };

  L['g-averages'] = (d) => {
    const g = d.goals, n = g.length, sum = g.reduce((a, x) => a + x, 0), mean = sum / n, sorted = g.slice().sort((a, b) => a - b), med = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2, range = sorted[n - 1] - sorted[0];
    const freq = {}; g.forEach((x) => { freq[x] = (freq[x] || 0) + 1; }); let mode = 0, mc = 0; Object.keys(freq).forEach((k) => { if (freq[k] > mc) { mc = freq[k]; mode = +k; } });
    return {
      why: 'Your results are a list of numbers, and an average is how you say what a typical match looks like.',
      steps: [
        { say: ['Here are the goals ' + d.club + ' scored in each of your matches so far: ' + g.join(', ') + '.'].concat(eg(d, 'results')).concat(['One number to describe all of that is an average. There are three kinds and each answers a different question.']) },
        { say: ['The MEAN is the fair-share average. Add everything up, then divide by how many matches there were.'], maths: '$\\text{mean} = \\frac{' + g.join(' + ') + '}{' + n + '} = \\frac{' + sum + '}{' + n + '} = ' + m(mean) + '$' },
        { say: ['The MEDIAN is the middle value when you put them in order.', 'In order they are ' + sorted.join(', ') + '.', (n % 2 ? 'There are ' + n + ' values, so the middle one is the median: ' + med + '.' : 'There are ' + n + ' values, so take the two in the middle and find halfway: ' + med + '.')] },
        { say: ['The MODE is the value that happens most often: ' + mode + ', which came up ' + mc + ' time' + (mc > 1 ? 's' : '') + '.', 'It is the only average that works for things that are not numbers, like "which formation do we use most".'] },
        { say: ['The RANGE is not an average but it tells you how spread out the results are.', 'Biggest minus smallest.'], maths: '$' + sorted[n - 1] + ' - ' + sorted[0] + ' = ' + range + '$' },
        { say: ['The mean uses every value, so one huge result drags it. The median does not care. That is why they can disagree, and why you look at both.'] },
      ],
      ask: { q: 'Your goals in each match so far were ' + g.join(', ') + '. Work out the mean goals per match, to 2 decimal places.', kind: 'number', answer: mean, unit: '', tol: 0.011, rubric: 'Correct answer ' + m(mean) + ' (' + sum + ' ÷ ' + n + ').', worked: ['Add them: ' + g.join(' + ') + ' = ' + sum + '.', 'Divide by ' + n + ' matches: ' + sum + ' ÷ ' + n + ' = ' + m(mean) + '.'], apply: { kind: 'plan', phase: 'final', key: 'shooting', value: mean < 1.5 ? 'sight' : 'std', say: mean < 1.5 ? 'Your mean is under 1.5, so set the team to shoot on sight' : 'Keep the finishing as it is' } },
      next: 'A mean of ' + m(mean) + ' tells you what is typical. Shall we look at how the shots you take connect to the goals you score, using a scatter graph?',
    };
  };

  L['g-scatter'] = (d) => {
    const x = d.shots, y = d.goals, n = Math.min(x.length, y.length), pts = []; for (let i = 0; i < n; i++) pts.push([x[i], y[i]]);
    const mx = x.slice(0, n).reduce((a, v) => a + v, 0) / n, my = y.slice(0, n).reduce((a, v) => a + v, 0) / n;
    let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) * (x[i] - mx); }
    const slope = sxx ? sxy / sxx : 0, predict = (v) => my + slope * (v - mx);
    return {
      why: 'Shots and goals should be linked, and a scatter graph is how you check whether they are.',
      steps: [
        { say: ['You have shots and goals for ' + n + ' matches.'].concat(eg(d, 'stats')).concat(['Each match is one point: shots along the bottom, goals up the side.', 'Here they are as pairs (shots, goals): ' + pts.map((p) => '(' + p[0] + ', ' + p[1] + ')').join(', ') + '.']) },
        { say: ['A scatter graph does one job: show whether two things move together.', 'If the points drift up from left to right, taking more shots goes with scoring more. That is positive correlation.', 'If they drift down, it is negative correlation. If they are just a cloud, there is no correlation.'] },
        { say: ['To make a prediction we draw a line of best fit.', 'It is a straight line through the middle of the points, with about as many above as below.', 'It does not have to go through any single point.'] },
        { say: ['Your points have a mean of ' + m(mx) + ' shots and ' + m(my) + ' goals, and the line of best fit passes through that middle point.', 'A rough slope from your data is about ' + m(slope) + ' goals for each extra shot.'] },
        { say: ['Use the line to predict. For 15 shots, the line gives about'], maths: '$' + m(my) + ' + ' + m(slope) + ' \\times (15 - ' + m(mx) + ') = ' + m(predict(15)) + '$' },
        { say: ['Two warnings. Predicting inside the range of your data (interpolation) is safe. Going far outside it (extrapolation) is risky.', 'And correlation does not mean cause: shots do not make goals by themselves, good chances do.'] },
      ],
      ask: { q: 'Using the slope of about ' + m(slope) + ' goals per extra shot and the middle point (' + m(mx) + ', ' + m(my) + '), predict the goals from 15 shots, to 1 decimal place.', kind: 'number', answer: predict(15), unit: '', tol: 0.15, rubric: 'Correct about ' + m(predict(15)) + ' (accept within 0.15). The method is mean goals + slope × (15 − mean shots).', worked: ['Start at the middle point: ' + m(my) + ' goals at ' + m(mx) + ' shots.', 'Go from ' + m(mx) + ' to 15 shots: ' + m(15 - mx) + ' more.', 'Add ' + m(slope) + ' × ' + m(15 - mx) + ' = ' + m(slope * (15 - mx)) + ': about ' + m(predict(15)) + ' goals.'], apply: { kind: 'plan', phase: 'final', key: 'shooting', value: slope > 0.15 ? 'sight' : 'std', say: slope > 0.15 ? 'Shots are paying off, so set the team to shoot on sight' : 'Shots are not turning into goals; keep to working a better chance' } },
      next: 'Would you like to test whether a tactical change really improved your results or was just luck? That is where probability comes in.',
    };
  };

  L['g-probbasic'] = (d) => {
    const w = d.wins, n = d.played, p = w / n;
    return {
      why: 'Your record so far gives you a way to say how likely a win is next time.',
      steps: [
        { say: ['Out of your first ' + n + ' matches, ' + d.club + ' won ' + w + '.'].concat(eg(d, 'results')).concat(['Probability is a number between 0 and 1 that says how likely something is.', '0 means it cannot happen, 1 means it must, and 0.5 is a coin toss.']) },
        { say: ['The rule for equally likely outcomes:'], maths: '$P(\\text{event}) = \\frac{\\text{ways it can happen}}{\\text{all the possible outcomes}}$' },
        { say: ['Your matches are not a fair coin, but you can still use what happened.', 'A fair way to estimate the chance of a win is the share of your matches that were wins.'], maths: '$P(\\text{win}) \\approx \\frac{' + w + '}{' + n + '} = ' + m(p) + '$' },
        { say: ['This is called relative frequency. The more matches you play, the better the estimate gets.', 'With ' + n + ' matches it is rough. With ' + n * 10 + ', it would be much steadier.'] },
        { say: ['Every match ends in one of three ways: win, draw or loss.', 'Those three cover everything and cannot overlap, so their probabilities add up to 1.', 'That means $P(\\text{not win}) = 1 - P(\\text{win}) = ' + m(1 - p) + '$.'] },
      ],
      ask: { q: 'You won ' + w + ' of your ' + n + ' matches. Estimate the probability of winning the next match as a decimal to 2 places.', kind: 'number', answer: p, unit: '', tol: 0.011, rubric: 'Correct ' + m(p) + ' (' + w + '/' + n + ').', worked: ['Wins ÷ matches played = ' + w + ' ÷ ' + n + ' = ' + m(p) + '.'], apply: { kind: 'plan', phase: 'press', key: 'intensity', value: p < 0.5 ? 'high' : 'std', say: p < 0.5 ? 'Under half your matches are wins, so raise the pressing to Heavy to win the ball higher up' : 'You are winning most matches; keep the pressing at Medium' } },
      next: 'Would you like to see how the chance of a win this week changes the chance of a good run, using tree diagrams?',
    };
  };

  L['g-probtree'] = (d) => {
    const w = d.wins / d.played, p = Math.max(0.1, Math.min(0.9, w)), pp = Math.round(p * 100) / 100;
    return {
      why: 'Two matches in a row are two chances, and a tree diagram is how you handle them.',
      steps: [
        { say: ['Suppose the chance of winning any one match is ' + pp + '. Call it $P(W)$.', 'What is the chance of winning two matches in a row?'] },
        { say: ['Draw a tree. The first match splits into Win (' + pp + ') and Not-win (' + m(1 - pp) + ').', 'Each of those splits again for the second match, with the same chances.', 'That gives four routes through the tree.'] },
        { say: ['To follow a route, MULTIPLY along the branches.', 'Both matches won:'], maths: '$P(WW) = ' + pp + ' \\times ' + pp + ' = ' + m(pp * pp) + '$' },
        { say: ['To find the chance of "either of two routes", you ADD the routes.', 'Exactly one win from two matches means Win-then-Not or Not-then-Win.'], maths: '$P(\\text{exactly one win}) = ' + pp + ' \\times ' + m(1 - pp) + ' + ' + m(1 - pp) + ' \\times ' + pp + ' = ' + m(2 * pp * (1 - pp)) + '$' },
        { say: ['Check: all four routes must add to 1.', '$' + m(pp * pp) + ' + ' + m(2 * pp * (1 - pp)) + ' + ' + m((1 - pp) * (1 - pp)) + ' = 1$.'] },
        { say: ['This rule only works when the matches are independent: one result does not change the next.', 'If a win lifted the team, or an injury hurt it, you would need the conditional version.'] },
      ],
      ask: { q: 'If the chance of winning a match is ' + pp + ', what is the probability of winning both of the next two matches? Give it to 2 decimal places.', kind: 'number', answer: pp * pp, unit: '', tol: 0.011, rubric: 'Correct ' + m(pp * pp) + ' (' + pp + ' × ' + pp + '). Multiplying along the branches is the key idea.', worked: ['Two wins is a route through the tree, so multiply: $' + pp + ' \\times ' + pp + ' = ' + m(pp * pp) + '$.'], apply: { kind: 'plan', phase: 'transDef', key: 'react', value: pp * pp < 0.3 ? 'regroup' : 'std', say: 'Two wins in a row is ' + Math.round(pp * pp * 100) + '% likely, so protect each match by tightening your response when you lose the ball' } },
      next: 'Do you want to see how quartiles and a box plot show the spread of your crowds?',
    };
  };

  L['g-box'] = (d) => {
    const v = d.crowdSeries.slice().sort((a, b) => a - b), n = v.length, med = (n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2), lower = v.slice(0, Math.floor(n / 2)), upper = v.slice(Math.ceil(n / 2));
    const mid = (a) => (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2), q1 = mid(lower), q3 = mid(upper), iqr = q3 - q1;
    return {
      why: 'Crowds vary from match to match, and quartiles show how much of that variation is typical.',
      steps: [
        { say: ['Your recent home crowds, in order from smallest to largest, are ' + v.map(d.num).join(', ') + '.'].concat(eg(d, 'series')).concat(['The median splits them in half. Quartiles split each half in half again.']) },
        { say: ['The median (the middle) is ' + d.num(med) + '.'] },
        { say: ['The lower quartile $Q_1$ is the median of the lower half: ' + lower.map(d.num).join(', ') + '. That is ' + d.num(q1) + '.', 'A quarter of your crowds were smaller than that.'] },
        { say: ['The upper quartile $Q_3$ is the median of the upper half: ' + upper.map(d.num).join(', ') + '. That is ' + d.num(q3) + '.'] },
        { say: ['The interquartile range measures the spread of the middle half of the crowds.'], maths: '$IQR = Q_3 - Q_1 = ' + q3 + ' - ' + q1 + ' = ' + iqr + '$' },
        { say: ['Why the IQR and not the range? The range uses the biggest and smallest, which could be freak matches.', 'The IQR ignores the extremes, so a once-a-season derby crowd cannot distort it.', 'A box plot draws exactly these five numbers: the smallest, $Q_1$, the median, $Q_3$ and the biggest.'] },
      ],
      ask: { q: 'For the crowds ' + v.map(d.num).join(', ') + ', find the interquartile range.', kind: 'number', answer: iqr, unit: '', tol: 0, rubric: 'Correct IQR ' + iqr + ' (Q3 ' + q3 + ' − Q1 ' + q1 + '). Check they found each quartile as the median of a half.', worked: ['Lower half median $Q_1 = ' + q1 + '$.', 'Upper half median $Q_3 = ' + q3 + '$.', '$IQR = ' + q3 + ' - ' + q1 + ' = ' + iqr + '$.'], apply: A.marketing(Math.round(iqr * 2)) },
      next: 'Would you like to look at the whole shape of your results using grouped data and histograms?',
    };
  };
})();
