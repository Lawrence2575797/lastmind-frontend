// GCSE Maths lessons, Number and Ratio and proportion (Edexcel 1MA1 N and R strands). Each is a function of the student's own club; each ends with a question whose answer changes the club.
(function () {
  const K = window.FM && window.FM.K; if (!K) return;
  const { m, m1, m3, fr, sum, mean, gcd, eg, A, ask, step, gbp, num } = K;

  K.add('g-ints', (d) => {
    const cs = d.crowdSeries.slice(0, 5), big = Math.max.apply(null, cs), small = Math.min.apply(null, cs), sorted = cs.slice().sort((a, b) => a - b), c = d.crowd, ds = String(c).split('');
    const place = ds.map((x, i) => x + '\\times' + Math.pow(10, ds.length - 1 - i)).join(' + ');
    return {
      analogy: ['Every screen in the club game is built from whole numbers: the crowd, the goals, the points, the shirt numbers. Whole numbers (and their negatives) are called integers.', 'Place value is the idea that a digit is worth more or less depending on where it sits. This lesson uses your home crowds, because ordering and comparing them is the first thing a club analyst does.'],
      why: 'A crowd of 8,280 is not 8 and 280: the position of each digit decides what it is worth.',
      steps: [
        step(['Your last home crowd was ' + num(c) + '.'].concat(eg(d, 'crowds'), ['Each digit is worth its own value times the place it sits in.']), '$' + num(c).replace(/,/g, '') + ' = ' + place + '$'),
        step(['So the 1st digit from the left is the biggest part of the number. That is why we compare numbers from the left: the digit with the largest place decides first.']),
        step(['Here are your last ' + cs.length + ' home crowds in the order they were played: ' + cs.map(num).join(', ') + '.', 'To put them in order from smallest to largest, compare the thousands first, then hundreds if the thousands match.'], '$' + sorted.map(num).join(' < ').replace(/,/g, '') + '$'),
        step(['The biggest crowd was ' + num(big) + ' and the smallest was ' + num(small) + '.', 'The difference between them is how far your crowds swing: the biggest take the smallest.'], '$' + big + ' - ' + small + ' = ' + (big - small) + '$'),
        step(['A swing of ' + num(big - small) + ' seats is the gap a marketing plan has to try to close: fans who sometimes come and sometimes do not.']),
      ],
      ask: ask('Your last ' + cs.length + ' home crowds were ' + cs.map(num).join(', ') + '. How many more fans came to the biggest crowd than the smallest?', big - small, 'fans', { tol: 0, worked: ['Largest ' + big + ', smallest ' + small + '.', '$' + big + ' - ' + small + ' = ' + (big - small) + '$.'], apply: A.marketing(d) }),
      next: 'A swing that big can go below zero in other quantities, like goal difference. Shall we look at negative numbers?',
    };
  });

  K.add('g-neg', (d) => {
    const gd = d.results.map((r) => r.gf - r.ga), tot = sum(gd), show = d.results.slice(0, 5);
    return {
      analogy: ['A league table runs on a number that goes below zero: goal difference. If you score 1 and let in 3, your match is -2.', 'Negative numbers describe being below a starting point. In the game you meet them in goal difference, cash overdrafts and the temperature of a bad run of form.'],
      why: 'Goal difference is a negative number whenever you concede more than you score, and you need to add and subtract with it.',
      steps: [
        step(['Look at your results.'].concat(eg(d, 'results')), '$' + show.map((r) => r.gf + '-' + r.ga).join(',\\ ') + '$'),
        step(['The goal difference of a match is goals scored minus goals conceded.', 'If you concede more than you score, the answer is below zero, so it is negative.'], show.map((r) => '$' + r.gf + ' - ' + r.ga + ' = ' + (r.gf - r.ga) + '$')),
        step(['Picture a number line with zero in the middle. Winning margins sit to the right, defeats to the left.', 'Adding a negative number moves you left. Subtracting a negative moves you right.']),
        step(['Add up the goal differences of those matches to get your running total.', 'Take them one at a time, left to right, and keep the sign with each number.'], '$' + show.map((r) => '(' + (r.gf - r.ga) + ')').join(' + ') + ' = ' + sum(show.map((r) => r.gf - r.ga)) + '$'),
        step(['A total below zero means the team has conceded more than it has scored over the run, and the table will show it.']),
      ],
      ask: ask('Add up the goal differences of your first ' + show.length + ' results (' + show.map((r) => r.gf + '-' + r.ga).join(', ') + '). What is the total, with its sign?', sum(show.map((r) => r.gf - r.ga)), 'goals', { tol: 0, worked: show.map((r) => r.gf + ' - ' + r.ga + ' = ' + (r.gf - r.ga)), apply: tot < 0 ? A.plan('transDef', 'react', 'regroup', 'You are conceding more than you score (goal difference ' + tot + '): set the team to regroup when the ball is lost') : A.plan('transDef', 'react', 'std', 'Your goal difference is ' + (tot >= 0 ? '+' : '') + tot + ': keep the team reacting to a lost ball as it is') }),
      next: 'Decimals sit between whole numbers, like expected goals. Would you like to see how to add and compare them?',
    };
  });

  K.add('g-dec', (d) => {
    const x = d.xg.slice(0, 5), tot = sum(x), sh = d.shots.slice(0, 5), per = sum(x) / Math.max(1, sum(sh));
    return {
      analogy: ['Expected goals (xG) is how the game says how good a chance was: a shot from the penalty spot is about 0.76, one from far out is 0.03.', 'Because xG is a decimal, you cannot see how good your team is without adding and comparing decimals correctly.'],
      why: 'xG is a decimal, and to add up decimals you must line up the decimal points.',
      steps: [
        step(['Your xG in the first ' + x.length + ' matches: ' + x.map(m).join(', ') + '.'].concat(eg(d, 'stats'))),
        step(['In a decimal, the digits after the point are tenths, hundredths and so on. 0.8 means eight tenths.', 'To compare 0.8 with 0.75, give them the same number of places: 0.80 and 0.75. Now 80 hundredths beats 75 hundredths.']),
        step(['To add, line up the decimal points and add column by column, carrying as normal.'], '$' + x.map(m).join(' + ') + ' = ' + m(tot) + '$'),
        step(['You took ' + sum(sh) + ' shots in those matches. To find the quality of a typical shot, divide the total xG by the number of shots.'], '$' + fr(m(tot), sum(sh)) + ' = ' + m(per) + '$'),
        step(['An average shot worth ' + m(per) + ' xG tells you whether you shoot from good places (above 0.12) or take speculative ones.']),
      ],
      ask: ask('Add your expected goals from the first ' + x.length + ' matches: ' + x.map(m).join(' + ') + '. Give the total to 2 decimal places.', tot, 'xG', { tol: 0.011, worked: ['Line the points up: ' + x.map(m).join(' + ') + ' = ' + m(tot) + '.'], apply: per < 0.12 ? A.plan('final', 'shooting', 'patient', 'Your shots average only ' + m(per) + ' xG: set the team to be patient and wait for better chances') : A.plan('final', 'shooting', 'std', 'Your shots average ' + m(per) + ' xG, good chances: keep the finishing as it is') }),
      next: 'You can now add decimals. Next, how to add fractions with different bottoms, like two stands of different sizes.',
    };
  });

  K.add('g-fracops', (d) => {
    const a = d.stands[0], b = d.stands[2] || d.stands[1], ea = a.seats - a.sold, eb = b.seats - b.sold, fa = ea / a.seats, fb = eb / b.seats, tot = fa + fb;
    return {
      analogy: ['Every stand in the ground is a different size, so "how empty is it?" is a fraction with a different bottom number for each stand.', 'Adding fractions with different bottoms is the skill that lets you combine them into one picture of the ground.'],
      why: 'You cannot add fractions with different bottoms until you give them the same bottom.',
      steps: [
        step([a.name + ' has ' + num(a.seats) + ' seats and ' + num(ea) + ' were empty. ' + b.name + ' has ' + num(b.seats) + ' seats and ' + num(eb) + ' were empty.'].concat(eg(d, 'crowds')), ['$' + fr(num(ea).replace(/,/g, ''), num(a.seats).replace(/,/g, '')) + '$ and $' + fr(num(eb).replace(/,/g, ''), num(b.seats).replace(/,/g, '')) + '$']),
        step(['Adding the tops (' + ea + ' + ' + eb + ') and the bottoms would be wrong: it would claim the same fraction as a stand that does not exist.', 'A fraction is a share, so we can only add shares of the same size.']),
        step(['Make the bottoms equal. Find a common multiple of ' + a.seats + ' and ' + b.seats + ' (the lowest is the smallest number both go into) and rewrite both fractions on it.', 'Whatever you multiply the bottom by, multiply the top by too.']),
        step(['Once the bottoms match, add the tops and keep the bottom.'], '$' + fr(m(fa), 1) + ' + ' + fr(m(fb), 1) + ' = ' + m(tot) + '$'),
        step(['Multiplying fractions is easier: top times top, bottom times bottom. "Half of the family stand\'s empty fraction" is $' + fr(1, 2) + ' \\times ' + fr(num(ea).replace(/,/g, ''), num(a.seats).replace(/,/g, '')) + ' = ' + fr(num(ea).replace(/,/g, ''), 2 * a.seats) + '$.']),
      ],
      ask: ask('The fraction of ' + a.name + ' that was empty plus the fraction of ' + b.name + ' that was empty: $' + fr(ea, a.seats) + ' + ' + fr(eb, b.seats) + '$. Give the answer as a decimal to 3 places.', tot, '', { tol: 0.002, worked: ['$' + fr(ea, a.seats) + ' = ' + m3(fa) + '$ and $' + fr(eb, b.seats) + ' = ' + m3(fb) + '$.', 'Sum ' + m3(tot) + '.'], apply: A.price(d, 'emptiest', 99) }),
      next: 'Fractions, decimals and percentages are three ways of saying the same thing. Let us connect them.',
    };
  });

  K.add('g-fdp', (d) => {
    const w = d.wins, p = d.played, dec = w / Math.max(1, p), pc = dec * 100;
    return {
      analogy: ['The table gives you a number of wins, the commentator says "a win rate of 0.6", the board says "60%". They are the same fact in three outfits.', 'This lesson turns a fraction of matches into a decimal and a percentage, and back, on your own record.'],
      why: 'A fraction, a decimal and a percentage can all describe the same share, and converting between them is how you compare different figures.',
      steps: [
        step(['You have won ' + w + ' of your ' + p + ' matches.'].concat(eg(d, 'results')), '$' + fr(w, p) + '$'),
        step(['A fraction is a division. To turn it into a decimal, divide the top by the bottom.'], '$' + w + ' \\div ' + p + ' = ' + m3(dec) + '$'),
        step(['A percentage is "out of 100". To turn a decimal into a percentage, multiply by 100.'], '$' + m3(dec) + ' \\times 100 = ' + m1(pc) + '\\%$'),
        step(['To go back, divide the percentage by 100 for the decimal, and put the decimal over 1 and simplify for the fraction.', 'A win rate of ' + m1(pc) + '% is the same as ' + m3(dec) + ' and the same as $' + fr(w, p) + '$.']),
        step(['Always compare like with like. Do not compare 7 wins out of 10 with 12 wins out of 20 by looking at the tops. Convert both to percentages: 70% and 60%.']),
      ],
      ask: ask('You have won ' + w + ' of ' + p + ' matches. What percentage is that, to 1 decimal place?', pc, '%', { tol: 0.06, worked: ['$' + w + ' \\div ' + p + ' = ' + m3(dec) + '$.', 'Times 100 = ' + m1(pc) + '%.'], apply: pc < 50 ? A.plan('press', 'intensity', 'high', 'Fewer than half your matches are wins (' + m1(pc) + '%): raise the pressing to Heavy to win the ball higher up') : A.plan('press', 'intensity', 'std', 'You win ' + m1(pc) + '% of your matches: keep the pressing as it is') }),
      next: 'Rounding is how you turn long decimals like ' + m3(dec) + ' into something readable. Next lesson.',
    };
  });

  K.add('g-round', (d) => {
    const v = sum(d.xg.slice(0, 5)) / Math.max(1, d.xg.slice(0, 5).length), x = v + 0.0371, big = d.gate, est = Math.round(big / 1000) * 1000;
    return {
      analogy: ['Nobody on a broadcast says "your xG per match is 1.4371289". They round it. In football analysis rounding is how you keep a number honest and readable.', 'Estimating is the same skill used before you calculate: round everything first to see what a sensible answer looks like.'],
      why: 'Rounding keeps numbers readable, and rounding first lets you check that a calculation is sensible.',
      steps: [
        step(['Your gate money at the last home match was ' + gbp(big) + '.'].concat(eg(d, 'gate'))),
        step(['To round to the nearest thousand, look at the hundreds digit. 5 or more rounds up; 4 or less rounds down.', 'The hundreds digit here is ' + String(Math.round(big)).slice(-3, -2) + ', so it rounds to ' + gbp(est) + '.']),
        step(['Decimal places work the same way. To round ' + m3(x) + ' to 1 decimal place, look at the second decimal place ( ' + String(m3(x)).split('.')[1].charAt(1) + ' ) and decide.'], '$' + m3(x) + ' \\approx ' + m1(x) + '$'),
        step(['Significant figures count from the first non-zero digit. 0.04371 to 2 significant figures is 0.044, because the first significant digit is the 4.']),
        step(['To estimate, round each number to 1 significant figure first. $' + Math.round(big / 100) / 10 + '$ thousand fans times £$' + 3 + '$ is about $' + 3 * Math.round(big / 1000) + '$ thousand pounds: a sanity check before the exact sum.']),
      ],
      ask: ask('Round your last gate money, ' + gbp(big) + ', to the nearest £1,000.', est, '£', { tol: 0, worked: ['Look at the hundreds digit; round to ' + est + '.'], apply: A.price(d, 'third', 99) }),
      next: 'Rounding always loses a little. Next: how much, and how to write down the range the true value could be in.',
    };
  });

  K.add('g-bounds', (d) => {
    const c = Math.round(d.crowd / 100) * 100, lo = c - 50, hi = c + 50, price = d.big.price;
    return {
      analogy: ['The attendance announced at the ground is rounded to the nearest 100. So when it says ' + num(c) + ', the true crowd is not exactly that: it is somewhere in a range.', 'Bounds are the smallest and largest values a rounded number could really be, and the board needs them to know the least revenue it can rely on.'],
      why: 'A rounded figure hides a range, and the lower bound is the safe number to plan the budget on.',
      steps: [
        step(['The announced crowd is ' + num(c) + ', to the nearest 100.']),
        step(['Half of 100 is 50. So the true crowd is at least ' + num(lo) + ' and just under ' + num(hi) + '.'], '$' + lo + ' \\le \\text{crowd} < ' + hi + '$'),
        step(['The smaller figure is the lower bound and the larger the upper bound. This pair of inequalities is an error interval.']),
        step(['If every fan paid £' + price + ', the lowest the revenue could really be is the lower bound times the price.'], '$' + lo + ' \\times ' + price + ' = ' + (lo * price) + '$'),
        step(['A budget built on the lower bound cannot be wrong in the cruel direction. That is why prudent finance directors plan with it.']),
      ],
      ask: ask('The crowd is ' + num(c) + ' to the nearest 100 and each fan pays £' + price + '. What is the lowest total ticket income the crowd could really have brought in, in pounds?', lo * price, '£', { tol: 0, worked: ['Lower bound ' + lo + '.', lo + ' x ' + price + ' = ' + lo * price + '.'], apply: A.price(d, 'second', 99) }),
      next: 'Primes and factors are the DNA of numbers. Let us see how they help share things out.',
    };
  });

  K.add('g-factors', (d) => {
    const s = d.big.seats, f = []; for (let i = 1; i <= s; i++) if (s % i === 0) f.push(i);
    const rows = [6, 8, 10, 12].find((r) => s % r === 0) || 10;
    return {
      analogy: ['Seats are laid out in rows and blocks, and a ground planner needs to know how many equal rows a stand can be split into. That is a question about factors.', 'A factor of a number divides it exactly. A prime has only two factors, one and itself.'],
      why: 'Factors tell you every way a stand can be split into equal blocks.',
      steps: [
        step([d.big.name + ' holds ' + num(s) + ' seats.']),
        step(['A factor of ' + s + ' divides it exactly with nothing left over. A multiple of ' + s + ' is in its times table.', 'To find factors, test whole numbers upward and write them in pairs.'], '$' + f.slice(0, Math.min(f.length, 8)).join(',\\ ') + (f.length > 8 ? ',\\ ...' : '') + '$'),
        step(['A prime number has exactly two factors. 7 is prime, but 9 is not: it has 1, 3 and 9.', 'Every number is a product of primes, and writing it that way is called prime factorisation.']),
        step(['Can ' + d.big.name + ' be split into ' + rows + ' equal blocks? Divide.'], '$' + s + ' \\div ' + rows + ' = ' + (s / rows) + '$'),
        step(['It splits with nothing left over, so ' + rows + ' is a factor of ' + s + ' and ' + s / rows + ' is its partner.']),
      ],
      ask: ask('How many different whole-number ways can ' + d.big.name + ' (' + num(s) + ' seats) be divided into equal blocks? (That is, how many factors does ' + s + ' have, counting 1 and itself?)', f.length, 'factors', { tol: 0, worked: ['The factors are ' + f.join(', ') + '.', 'There are ' + f.length + ' of them.'], apply: A.marketing(d) }),
      next: 'Next, the biggest number that goes into two numbers at once, and the smallest they share. Useful for timing and for schedules.',
    };
  });

  K.add('g-hcflcm', (d) => {
    const a = 12, b = 18, h = gcd(a, b), l = a * b / h, s1 = d.stands[0].seats, s2 = d.stands[2] ? d.stands[2].seats : d.stands[1].seats, g = gcd(s1, s2);
    return {
      analogy: ['The club shows the same two things on a rota: the stewards swap every ' + a + ' minutes and the sponsors\' boards change every ' + b + '. When do they swap together?', 'The highest common factor and the lowest common multiple answer "what is the biggest equal block I can cut both stands into" and "when do two cycles line up".'],
      why: 'The HCF is the biggest equal block two numbers share; the LCM is when two repeating cycles line up again.',
      steps: [
        step(['Write each number as a product of primes (a prime factor tree).'], ['$' + a + ' = 2 \\times 2 \\times 3$', '$' + b + ' = 2 \\times 3 \\times 3$']),
        step(['The HCF uses the primes they share: take each shared prime the fewest times it appears.'], '$2 \\times 3 = ' + h + '$'),
        step(['The LCM uses every prime the most times it appears in either number.'], '$2 \\times 2 \\times 3 \\times 3 = ' + l + '$'),
        step(['So the two rotas line up every ' + l + ' minutes, and the biggest equal block both can share is ' + h + ' minutes.']),
        step(['A check: HCF times LCM equals the two numbers multiplied.'], '$' + h + ' \\times ' + l + ' = ' + a + ' \\times ' + b + ' = ' + a * b + '$'),
      ],
      ask: ask('Two of your stands hold ' + num(s1) + ' and ' + num(s2) + ' seats. What is the biggest size of equal block (a whole number of seats) that both stands can be split into with none left over? (The HCF.)', g, 'seats', { tol: 0, worked: ['Find the highest common factor of ' + s1 + ' and ' + s2 + '.', 'It is ' + g + '.'], apply: A.price(d, 'emptiest', 99) }),
      next: 'Powers and roots turn up when you scale things: area, growth, and sizes of crowds.',
    };
  });

  K.add('g-powers', (d) => {
    const w = 105, hgt = 68, area = w * hgt, side = 7;
    return {
      analogy: ['A pitch is 105 metres by 68 metres. A squared number turns up the moment you ask about area, and a root turns up the moment you ask for the side of a square of a given area.', 'Powers are repeated multiplication; roots undo them.'],
      why: 'Squares, cubes and their roots are how lengths turn into areas and volumes.',
      steps: [
        step(['A power says "multiply by itself this many times". Seven squared means seven times seven.'], '$7^2 = 7 \\times 7 = 49$'),
        step(['Cubed is three of them. A square metre has two lengths, a cubic metre three.'], '$3^3 = 3 \\times 3 \\times 3 = 27$'),
        step(['A square root undoes a square. Which number times itself gives 49?'], '$\\sqrt{49} = 7$'),
        step(['A square training grid with sides ' + side + ' m has an area of ' + side * side + ' m². If a coach wants a grid of 144 m², its side is:'], '$\\sqrt{144} = 12$'),
        step(['Your pitch has an area of ' + w + ' \\times ' + hgt + ' = ' + area + ' m². A square of that area would have a side of $\\sqrt{' + area + '} \\approx ' + m1(Math.sqrt(area)) + '$ metres.']),
      ],
      ask: ask('A square grid for a small-sided game must have an area of 225 m². What is the length of one side, in metres?', 15, 'm', { tol: 0, worked: ['$\\sqrt{225} = 15$.'], apply: A.plan('midfield', 'width', 'std', 'Keep the team\'s width at standard: small-sided grids are about compact shape') }),
      next: 'Powers follow laws that save you work. Let us meet the laws of indices.',
    };
  });

  K.add('g-indices', (d) => {
    const g = 1.03, n = 5, v = Math.pow(g, n);
    return {
      analogy: ['If your crowd grows by 3% a match it is multiplied by 1.03 each time. Doing that five times is $1.03^5$. The laws of indices let you handle powers without multiplying out.', 'They are also how a club reasons about growth: powers are growth made short.'],
      why: 'Indices have three laws: add the powers when you multiply, subtract when you divide, multiply when you take a power of a power.',
      steps: [
        step(['Multiplying the same base: add the powers.'], '$a^m \\times a^n = a^{m+n}$ so $2^3 \\times 2^4 = 2^7$'),
        step(['Dividing: subtract the powers.'], '$a^m \\div a^n = a^{m-n}$ so $5^6 \\div 5^2 = 5^4$'),
        step(['A power of a power: multiply.'], '$(a^m)^n = a^{mn}$ so $(3^2)^3 = 3^6$'),
        step(['Anything to the power 0 is 1, and a negative power is a reciprocal.'], ['$a^0 = 1$', '$a^{-n} = ' + fr(1, 'a^n') + '$']),
        step(['A fractional power is a root: $a^{1/2} = \\sqrt{a}$. Growth of 3% a match for ' + n + ' matches is the factor $1.03^{' + n + '} = ' + m3(v) + '$.']),
      ],
      ask: ask('Your crowd grows by 3% a home match. By what factor is it multiplied over ' + n + ' home matches? Give $1.03^{' + n + '}$ to 3 decimal places.', v, '', { tol: 0.0015, worked: ['$1.03^5 = 1.03 \\times 1.03 \\times 1.03 \\times 1.03 \\times 1.03 = ' + m3(v) + '$.'], apply: A.marketing(d) }),
      next: 'Very large and very small numbers get written in standard form. Let us do that.',
    };
  });

  K.add('g-standard', (d) => {
    const c = d.cash, s = c >= 1e6 ? c / 1e6 : c / 1e3, exp = c >= 1e6 ? 6 : 3;
    return {
      analogy: ['The board sees numbers like £8,200,000 and £0.003 per match. Standard form writes them as a number between 1 and 10 times a power of ten, which makes them easy to compare and hard to misread.', 'Your club cash is a number large enough to need it.'],
      why: 'Standard form shows how big a number is at a glance: the power of ten is its size.',
      steps: [
        step(['Your club\'s cash is ' + gbp(c) + '.'] ),
        step(['Standard form is $a \\times 10^n$ with $1 \\le a < 10$.']),
        step(['Move the decimal point until you have one non-zero digit in front. Count how many places you moved: that is $n$.'], '$' + gbp(c).replace('£', '').replace(/,/g, '') + ' = ' + m(s) + ' \\times 10^{' + exp + '}$'),
        step(['For a small number, the power is negative. £0.003 is $3 \\times 10^{-3}$: the point moved three places the other way.']),
        step(['To multiply in standard form, multiply the front numbers and add the powers.'], '$(2 \\times 10^3) \\times (4 \\times 10^2) = 8 \\times 10^5$'),
      ],
      ask: ask('Write 52,000 in standard form, then give the value of $a$ (the number in front of $\\times 10^4$).', 5.2, '', { tol: 0.001, worked: ['$52000 = 5.2 \\times 10^4$.'], apply: A.price(d, 'big', 3) }),
      next: 'Surds keep exact roots: useful when you must not round. Next.',
    };
  });

  K.add('g-surds', (d) => {
    const diag = Math.sqrt(105 * 105 + 68 * 68);
    return {
      analogy: ['The diagonal of your pitch is the longest straight pass available: from one corner flag to the opposite. Its length is $\\sqrt{105^2 + 68^2}$, which does not come out exactly.', 'A surd is a root that does not simplify to a whole number. Leaving it as a surd keeps the answer exact until the very last step.'],
      why: 'A surd is an exact answer; rounding it early throws accuracy away.',
      steps: [
        step(['$\\sqrt{2}$ and $\\sqrt{7}$ are surds: their decimals never end. $\\sqrt{16} = 4$ is not a surd.']),
        step(['Multiplying surds: $\\sqrt{a} \\times \\sqrt{b} = \\sqrt{ab}$.'], '$\\sqrt{2} \\times \\sqrt{8} = \\sqrt{16} = 4$'),
        step(['Simplifying: take out square factors.'], '$\\sqrt{72} = \\sqrt{36 \\times 2} = 6\\sqrt{2}$'),
        step(['Rationalising removes a surd from the bottom of a fraction by multiplying top and bottom by it.'], '$' + fr(1, '\\sqrt{2}') + ' = ' + fr('\\sqrt{2}', 2) + '$'),
        step(['The pitch diagonal is $\\sqrt{105^2 + 68^2} = \\sqrt{' + (105 * 105 + 68 * 68) + '} \\approx ' + m1(diag) + '$ m. We keep the root until we need a number.']),
      ],
      ask: ask('Simplify $\\sqrt{50}$ into the form $a\\sqrt{2}$. What is $a$?', 5, '', { tol: 0, worked: ['$\\sqrt{50} = \\sqrt{25 \\times 2} = 5\\sqrt{2}$.'], apply: A.price(d, 'fourth', 99) }),
      next: 'The units of money, time and length have their own sums. Let us do them.',
    };
  });

  K.add('g-units', (d) => {
    const w = d.big.price * d.big.sold, per = 90, secs = per * 60;
    return {
      analogy: ['A match lasts 90 minutes, a pitch is 105 metres, a ticket is in pounds and a transfer is in millions. Real football moves between units constantly, and the maths is knowing the conversion.', 'Convert before you calculate: mixing units is the commonest way to get a wrong answer.'],
      why: 'Every calculation needs all its numbers in the same units; converting is multiplying or dividing by the right factor.',
      steps: [
        step(['Time: 1 hour = 60 minutes, 1 minute = 60 seconds. A match is 90 minutes, which is ' + secs + ' seconds.'], '$90 \\times 60 = ' + secs + '$'),
        step(['Length: 1 km = 1000 m, 1 m = 100 cm. A 105 m pitch is 0.105 km.']),
        step(['Money: £1 = 100p. A programme costing £3.50 is 350p.']),
        step(['Speed needs two units. A winger runs 7 m/s. In kilometres per hour, multiply by 3.6.'], '$7 \\times 3.6 = ' + m1(7 * 3.6) + '$ km/h'),
        step(['To convert, ask: am I going to a smaller unit (more of them: multiply) or a bigger unit (fewer: divide)?']),
      ],
      ask: ask('A winger runs at 9 m/s. What is that in kilometres per hour?', 32.4, 'km/h', { tol: 0.05, worked: ['$9 \\times 3.6 = 32.4$.'], apply: A.plan('build', 'tempo', 'fast', 'Fast legs are only useful at speed: raise the build-up tempo') }),
      next: 'Ratios share things in proportion. The sponsor and the squad both depend on them.',
    };
  });

  K.add('g-fracof', (d) => {
    const s = d.stands.slice().sort((a, b) => b.seats - a.seats)[1] || d.big, p = s.sold, n3 = Math.round(s.seats * 3 / 8);
    return {
      analogy: ['"Three-eighths of the ground" is how a board talks about capacity. Finding a fraction of an amount and writing one amount as a fraction of another are the two moves behind it.', 'We use ' + s.name + ': ' + num(s.seats) + ' seats.'],
      why: 'To find a fraction of an amount, divide by the bottom and multiply by the top.',
      steps: [
        step([s.name + ' holds ' + num(s.seats) + ' seats. Three-eighths of them are reserved for season-ticket holders.']),
        step(['Divide by the bottom (8) to find one-eighth.'], '$' + s.seats + ' \\div 8 = ' + m(s.seats / 8) + '$'),
        step(['Multiply by the top (3) for three-eighths.'], '$' + m(s.seats / 8) + ' \\times 3 = ' + m(s.seats * 3 / 8) + '$'),
        step(['The other way round: write one amount as a fraction of another. ' + num(p) + ' of ' + num(s.seats) + ' seats were sold.'], '$' + fr(num(p).replace(/,/g, ''), num(s.seats).replace(/,/g, '')) + ' = ' + fr(p / gcd(p, s.seats), s.seats / gcd(p, s.seats)) + '$'),
        step(['Put the part on top and the whole on the bottom, then simplify.']),
      ],
      ask: ask('Three-eighths of ' + s.name + ' (' + num(s.seats) + ' seats) are for season-ticket holders. How many seats is that?', s.seats * 3 / 8, 'seats', { tol: 0.6, worked: [s.seats + ' \\div 8 = ' + m(s.seats / 8) + '.', 'Times 3 = ' + m(s.seats * 3 / 8) + '.'], apply: A.price(d, 'second', 99) }),
      next: 'Interest is a percentage that arrives again and again. Simple interest first.',
    };
  });

  K.add('g-simpleint', (d) => {
    const loan = d.loan ? d.loan.balance : 2000000, rate = 4, yrs = 3, i = loan * rate / 100 * yrs;
    return {
      analogy: ['A club that borrows pays interest. If it is simple interest, the same amount is paid every year on the original sum.', 'Your own loans in the game (if any) cost money each matchday. Here we work out what a loan costs over time.'],
      why: 'Simple interest is the same percentage of the original amount, every year.',
      steps: [
        step(['Suppose the club borrows ' + gbp(loan) + ' at ' + rate + '% simple interest a year, for ' + yrs + ' years.']),
        step(['Interest for one year: ' + rate + '% of the loan.'], '$' + loan + ' \\times ' + fr(rate, 100) + ' = ' + (loan * rate / 100) + '$'),
        step(['For ' + yrs + ' years: multiply by ' + yrs + '.'], '$' + (loan * rate / 100) + ' \\times ' + yrs + ' = ' + i + '$'),
        step(['The formula: $I = P \\times ' + fr('r', 100) + ' \\times t$.']),
        step(['Total to pay back: the original plus the interest, ' + gbp(loan + i) + '.']),
      ],
      ask: ask('The club borrows £500,000 at 6% simple interest a year for 4 years. How much interest does it pay in total?', 120000, '£', { tol: 0, worked: ['$500000 \\times 0.06 \\times 4 = 120000$.'], apply: d.loan && d.cash > d.loan.balance * 3 ? { kind: 'control', action: 'repayLoan', params: { id: d.loan.id }, say: 'Interest is a cost you can remove: you hold more than three times the balance, so repay the loan in full' } : A.marketing(d) }),
      next: 'Compound interest and growth are where percentages repeat. The big one for crowds and revenue.',
    };
  });

  K.add('g-compound', (d) => {
    const n0 = d.crowd, g = 1.03, y = 5, v = n0 * Math.pow(g, y);
    return {
      analogy: ['Good results lift a crowd by a percentage each match, and the next lift is a percentage of the new, bigger crowd. That is compound growth.', 'The multiplier method works for growth and for decay (a crowd falling after bad form).'],
      why: 'A percentage change repeated is a power of the multiplier.',
      steps: [
        step(['Your crowd is ' + num(n0) + '. Suppose it rises 3% a home match.'].concat(eg(d, 'crowds'))),
        step(['A 3% increase is a multiplier of 1.03. After one match:'], '$' + n0 + ' \\times 1.03 = ' + m(n0 * 1.03) + '$'),
        step(['After ' + y + ' matches, multiply ' + y + ' times: a power.'], '$' + n0 + ' \\times 1.03^{' + y + '} = ' + m(v) + '$'),
        step(['For a fall of 3%, the multiplier is 0.97. A fall that repeats is called decay.'], '$N = N_0 \\times 0.97^t$'),
        step(['Compare with simple growth (the same number of fans added each match): compound growth overtakes it because each lift is bigger.']),
      ],
      ask: ask('A crowd of ' + num(n0) + ' grows by 3% a home match. What is the crowd after ' + y + ' matches, to the nearest whole fan?', Math.round(v), 'fans', { tol: 2, worked: ['$' + n0 + ' \\times 1.03^5 = ' + m(v) + '$.'], apply: A.marketing(d) }),
      next: 'Next: inverse proportion, when more of one thing means less of another.',
    };
  });

  K.add('g-inverseprop', (d) => {
    const s = d.big, k = s.price * s.sold, np = s.price + 4, ns = k / np;
    return {
      analogy: ['At the box office, if the price goes up, fewer people buy. If the revenue stayed fixed, quantity would be inversely proportional to price.', 'Inverse proportion is "when one doubles the other halves", and the product of the two stays the same.'],
      why: 'In inverse proportion the product stays constant: price times fans is a fixed amount.',
      steps: [
        step([s.name + ': ' + num(s.sold) + ' fans at £' + s.price + '.'].concat(eg(d, 'crowds')), '$' + s.price + ' \\times ' + s.sold + ' = ' + k + '$'),
        step(['If the total spent stayed at ' + gbp(k) + ', and the price rose to £' + np + ', the fans would fall to:'], '$' + fr(k, np) + ' = ' + m(ns) + '$'),
        step(['The rule is $xy = k$, or $y = ' + fr('k', 'x') + '$. Double $x$ and $y$ halves.']),
        step(['Real fans are not exactly like this: the game\'s demand falls at a rate set by each type of fan. Inverse proportion is the simplest possible model of it.']),
        step(['Checking your model against the real thing is exactly what a good analyst does.']),
      ],
      ask: ask('If total revenue from ' + s.name + ' stayed at ' + gbp(k) + ' whatever the price, how many fans would come at £' + np + '? Give the nearest whole number.', Math.round(ns), 'fans', { tol: 2, worked: ['$' + k + ' \\div ' + np + ' = ' + m(ns) + '$.'], apply: A.price(d, 'big', 3) }),
      next: 'Scale factors link drawings to the real thing: handy for the pitch and the tactics board.',
    };
  });

  K.add('g-scale', (d) => {
    const f = 1000, a = 10.5, real = a * f / 100;
    return {
      analogy: ['The tactics board is the pitch drawn small. A scale of 1 : 1000 means 1 unit on the board is 1000 of the same unit on the pitch.', 'Scale factors let you measure a pass on the board and know how far it really is.'],
      why: 'A scale is a ratio: multiply the drawing by the scale factor to get the real length.',
      steps: [
        step(['The board is drawn at a scale of 1 : ' + f + '. A pass measures ' + a + ' cm on the board.']),
        step(['Multiply by the scale factor to get the real length, in cm.'], '$' + a + ' \\times ' + f + ' = ' + a * f + '$ cm'),
        step(['Convert to metres by dividing by 100.'], '$' + (a * f) + ' \\div 100 = ' + real + '$ m'),
        step(['To go the other way, divide: a 40 m run is 4000 cm, which on the board is $4000 \\div 1000 = 4$ cm.']),
        step(['Areas scale by the square of the factor, lengths by the factor.']),
      ],
      ask: ask('The tactics board has a scale of 1 : ' + f + '. A pass measures ' + a + ' cm on it. How long is the real pass, in metres?', real, 'm', { tol: 0.1, worked: [a + ' x ' + f + ' = ' + a * f + ' cm = ' + real + ' m.'], apply: A.plan('midfield', 'width', 'wide', 'Passes of about ' + real + ' m exist when you spread the play: set the midfield to play wide') }),
      next: 'Gradient is a rate of change. The slope of a line is a rate, like points per match.',
    };
  });

  K.add('g-gradrate', (d) => {
    const pts = d.points, mt = Math.max(1, d.played), rate = pts / mt;
    return {
      analogy: ['A line on a graph of points against matches has a gradient: how many points you earn per match. That gradient is a rate of change, and it tells you where the season is heading.', 'The gradient is the same wherever on the straight line you measure it.'],
      why: 'The gradient of a graph is the rate of change: how much the up-axis changes for each step along.',
      steps: [
        step(['You have ' + pts + ' points from ' + mt + ' matches.'].concat(eg(d, 'results'))),
        step(['Gradient is the change up divided by the change across.'], '$\\text{gradient} = ' + fr('\\text{change up}', '\\text{change across}') + '$'),
        step(['Here: up ' + pts + ' points, across ' + mt + ' matches.'], '$' + fr(pts, mt) + ' = ' + m(rate) + '$ points per match'),
        step(['At that rate the season of 14 matches would end on ' + m1(rate * 14) + ' points.'], '$' + m(rate) + ' \\times 14 = ' + m1(rate * 14) + '$'),
        step(['A steeper line means a faster rate. A negative gradient would mean points were being lost, which cannot happen here: but money can fall at a negative rate.']),
      ],
      ask: ask('You have ' + pts + ' points from ' + mt + ' matches. At that rate, how many points will you have after 14 matches? Give the nearest whole number.', Math.round(rate * 14), 'points', { tol: 1, worked: [pts + ' / ' + mt + ' = ' + m(rate) + ' per match.', m(rate) + ' x 14 = ' + m1(rate * 14) + '.'], apply: rate * 14 < 20 ? A.plan('press', 'intensity', 'high', 'On this rate you would finish on ' + m1(rate * 14) + ' points, short of safety: raise the pressing to win the ball higher up') : A.plan('press', 'intensity', 'std', 'On this rate you finish on ' + m1(rate * 14) + ' points: keep the pressing as it is') }),
      next: 'That finishes the number and ratio ideas. Algebra comes next: letters that stand for numbers.',
    };
  });
})();
