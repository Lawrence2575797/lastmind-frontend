// Tying each lesson's question to its analogy: the question is posed inside the picture the lesson has drawn, and the button under it changes the game by what the answer shows.
// Loaded after every lesson file. K.retie(id, fn) rebuilds the question and/or the button of a lesson that already exists.
(function () {
  const K = window.FM && window.FM.K; if (!K) return;
  const { A } = K;
  const f3 = (v) => String(Math.round(v * 1000) / 1000);

  // ---- growth: the crowd or the demand grows by a steady percentage a home match. The decision it feeds is the ticket price for the demand that is coming.
  K.retie('g-indices', (d) => {
    const s = d.big, f = Math.pow(1.03, 12);
    return { q: 'Demand for ' + s.name + ' grows by 3% each home match, so each match multiplies it by 1.03. By what factor is demand multiplied after 12 matches? Give $1.03^{12}$ to 3 decimal places.', answer: f, unit: '', tol: 0.002,
      worked: ['After 12 matches the multiplier is $1.03 \\times 1.03 \\times \\dots$ twelve times, which is $1.03^{12}$.', '$1.03^{12} = ' + f3(f) + '$: demand is about ' + Math.round((f - 1) * 100) + '% higher than today.'], apply: A.growth(d, 'big', f, 12) };
  });
  K.retie('g-compound', (d) => {
    const s = d.big, N = s.sold, f = Math.pow(1.03, 5);
    return { q: 'The crowd in ' + s.name + ' is ' + d.num(N) + ' and grows by 3% each home match. How many fans is that after 5 home matches, to the nearest fan?', answer: Math.round(N * f), unit: 'fans', tol: Math.max(1, N * 0.0006),
      worked: ['Growth of 3% a match is the multiplier 1.03, so after 5 matches the crowd is $' + N + ' \\times 1.03^{5}$.', '$1.03^{5} = ' + f3(f) + '$, so $' + N + ' \\times ' + f3(f) + ' \\approx ' + d.num(Math.round(N * f)) + '$ fans.'], apply: A.growth(d, 'big', f, 5) };
  });
  K.retie('p-indices', (d) => {
    const s = d.big;
    return { q: 'Demand for ' + s.name + ' is expected to multiply by 8 over the next three seasons, growing at a steady rate. By what factor does it multiply over the first two seasons? (Two thirds of the way means the factor is $8^{2/3}$.) Evaluate $8^{2/3}$.', answer: 4, unit: '', tol: 0.01,
      worked: ['A power of $\\frac{2}{3}$ means take the cube root and then square: $8^{2/3} = (\\sqrt[3]{8})^2$.', '$\\sqrt[3]{8} = 2$ and $2^2 = 4$, so demand multiplies by 4 over two seasons.'], apply: A.growth(d, 'big', 4, 'two seasons\' worth of') };
  });
  K.retie('p-exp', (d) => {
    const s = d.big, N = s.sold, f = Math.pow(1.03, 10);
    return { q: 'Demand for ' + s.name + ' follows $N = ' + N + ' \\times 1.03^{t}$, where $t$ is the number of home matches from now. What is the demand after 10 matches, to the nearest fan?', answer: Math.round(N * f), unit: 'fans', tol: Math.max(1, N * 0.0006),
      worked: ['Put $t = 10$ in the formula: $N = ' + N + ' \\times 1.03^{10}$.', '$1.03^{10} = ' + f3(f) + '$, so $N \\approx ' + d.num(Math.round(N * f)) + '$ fans.'], apply: A.growth(d, 'big', f, 10) };
  });
  K.retie('p-logs', (d) => {
    const s = d.big, N = s.sold, cap = s.seats, t = N < cap ? Math.ceil(Math.log(cap / N) / Math.log(1.03)) : 0, f = Math.pow(1.03, t);
    if (!t) return null;
    return { q: 'Demand for ' + s.name + ' is $' + N + ' \\times 1.03^{t}$ and the stand holds ' + d.num(cap) + '. Solve $' + N + ' \\times 1.03^{t} = ' + cap + '$ for $t$ using logarithms. After how many whole home matches does demand reach the capacity?', answer: t, unit: 'matches', tol: 0,
      worked: ['Divide by ' + N + ': $1.03^{t} = ' + f3(cap / N) + '$.', 'Take logs of both sides: $t \\ln 1.03 = \\ln ' + f3(cap / N) + '$, so $t = \\dfrac{\\ln ' + f3(cap / N) + '}{\\ln 1.03} = ' + f3(Math.log(cap / N) / Math.log(1.03)) + '$.', 'Round up to the next whole match: ' + t + '.'], apply: A.growth(d, 'big', f, t) };
  });
  K.retie('p-logeq', (d) => {
    const s = d.big, t = Math.log(2) / Math.log(1.03);
    return { q: 'Demand for ' + s.name + ' grows 3% a home match. Solve $1.03^{t} = 2$ for $t$: how many home matches until demand has doubled? Give $t$ to 1 decimal place.', answer: t, unit: 'matches', tol: 0.15,
      worked: ['Take logs: $t \\ln 1.03 = \\ln 2$.', '$t = \\dfrac{\\ln 2}{\\ln 1.03} = \\dfrac{0.6931}{0.02956} = ' + f3(t) + '$.'], apply: A.growth(d, 'big', 2, Math.round(t)) };
  });
  K.retie('p-natural', (d) => {
    const s = d.big, f = Math.exp(0.03 * 20);
    return { q: 'Demand for ' + s.name + ' grows continuously as $N = N_0 e^{0.03t}$, with $t$ in home matches. By what factor is demand multiplied after 20 matches? Give $e^{0.6}$ to 3 decimal places.', answer: f, unit: '', tol: 0.003,
      worked: ['Put $t = 20$: the factor is $e^{0.03 \\times 20} = e^{0.6}$.', '$e^{0.6} = ' + f3(f) + '$, an increase of about ' + Math.round((f - 1) * 100) + '%.'], apply: A.growth(d, 'big', f, 20) };
  });
})();
