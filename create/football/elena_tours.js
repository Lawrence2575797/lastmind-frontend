/*
 * A tour for every page of the preparation, in the same form as the squad tour: Elena describes what is on the page and what your own matches say
 * about it, pointing at the parts as she goes. Nothing is asked. The words that have a method behind them are buttons, and each opens the full
 * explanation with questions on the numbers in front of you, then comes back to the tour. The first time a page is opened its tour starts by
 * itself. See elena_guide.js (how a lesson runs) and elena_guides.js (the lessons the keywords open).
 */
(function () {
  const FM = (window.FM = window.FM || {});
  const L = FM.guideLib;
  if (!L) return;
  const { esc, f1, f2, wilson, KW, instrTargets } = L;
  const KWL = (id, label) => '<button type="button" class="gd-kw" data-kw="' + id + '">' + esc(label) + '</button>';
  const S = () => { try { return FM.phaseStats(window.FM_WORLD.league); } catch (e) { return null; } };
  const lvl = () => { const lg = window.FM_WORLD && FM_WORLD.league; return lg ? (L.LEVEL[lg.tier] || 0) : 0; };
  const pct = (k, n) => (n ? Math.round(100 * k / n) + '%' : 'none yet');
  const vis = (list) => Array.from(list).filter((e) => e && e.offsetWidth);
  const q = (sel) => () => vis(document.querySelectorAll(sel));
  const BOARDS = q('#tabBody .board-host');
  const COND = q('#tabBody [data-def-cond], #tabBody [data-scn-cond], #tabBody #scnAdd');
  const NEXT = q('#tabNextBtn');
  const setProp = (c, o) => { c.kwProp = o; };

  // ---------- the explanations behind the words ----------
  function add(id, title, build) { FM.guides[id] = { id, title, askOpen: true, min: 0, pages: [], build }; }

  add('kw-proportion', 'A share, and how sure it is', (ctx) => {
    const P = ctx.kwProp || { k: 68, n: 100, what: 'passes completed' }, n = Math.max(1, P.n), p = P.k / n, me = 1.96 * Math.sqrt(p * (1 - p) / n) * 100;
    return [
      { target: P.target, title: 'A share', lines: ['<b>' + P.k + '</b> of <b>' + P.n + '</b> ' + esc(P.what) + '.'],
        ask: { kind: 'number', unit: '%', q: ['What percentage is that?'], answer: () => p * 100, tol: 0.6, reveal: ['<b>' + f1(p * 100) + '%</b>.', 'A share like this is a <b>proportion</b>: the part divided by the whole.'] }, formula: 'p = part ÷ whole' },
      { target: P.target, title: 'How sure can you be?',
        lines: ['The ' + P.n + ' are a sample of what the team does, not everything it will ever do. Another ' + P.n + ' would give a slightly different share.'],
        ask: { kind: 'number', unit: 'points', q: ['Work out the margin of error in percentage points: 1.96 × √( p × (1 − p) ÷ n ).'], answer: () => me, tol: Math.max(0.2, me * 0.06), hint: 'p is ' + f2(p) + ' and n is ' + P.n + '. Work out p × (1 − p) ÷ n, take the square root, then multiply by 1.96.',
          reveal: ['<b>±' + f1(me) + ' points</b>.', 'So the true rate is probably between ' + f1(p * 100 - me) + '% and ' + f1(p * 100 + me) + '%. That range is a <b>95% confidence interval</b>.'] },
        formula: 'margin = 1.96 × √( p × (1 − p) ÷ n )' },
      { title: 'More data or less',
        lines: ['The same share comes from ten times fewer ' + esc(P.what.split(' ')[0]) + '.'],
        ask: { kind: 'choice', q: ['The margin of error would be about how many times bigger?'], correct: 1,
          options: [{ t: '10 times', fb: 'It grows more slowly than the sample shrinks.' }, { t: 'About 3 times (the square root of 10)', fb: '' }, { t: 'The same', fb: 'Less data always means more doubt.' }],
          reveal: ['The margin goes with 1 ÷ √n. Ten times fewer means √10, about 3.2 times the doubt.', 'To halve the doubt you need four times the data. That is why a few matches say little and a season says a lot.'] } },
    ];
  });

  add('kw-small', 'When there are only a few', (ctx) => {
    const P = ctx.kwProp || { k: 3, n: 5, what: 'set pieces that led to a goal' }, w = wilson(P.k, Math.max(1, P.n));
    return [
      { target: P.target, title: 'A handful of cases',
        lines: ['<b>' + P.k + '</b> of <b>' + P.n + '</b> ' + esc(P.what) + '.'],
        ask: { kind: 'number', unit: '%', q: ['What is the upper end of a 95% interval for the true rate? (The lower end is ' + Math.round(w[0] * 100) + '%.)'], answer: () => w[1] * 100, tol: 4, hint: 'With so few cases the interval is very wide. It is higher than you would guess.',
          reveal: ['The true rate could be anywhere from <b>' + Math.round(w[0] * 100) + '%</b> to <b>' + Math.round(w[1] * 100) + '%</b>.', 'With ' + P.n + ' cases you know very little. The interval is the honest way to say so.'] } },
      { title: 'Comparing two routines',
        lines: ['One routine scored from <b>2 of 4</b>. Another from <b>1 of 4</b>.'],
        ask: { kind: 'choice', q: ['Is the first one better?'], correct: 1,
          options: [{ t: 'Yes, it scored twice as often', fb: 'Twice as often from four tries is one goal.' }, { t: 'There is no way to tell yet', fb: '' }],
          reveal: ['One goal separates them. A routine that really scores 30% of the time will often score 2 of 4 or 1 of 4 within a few matches.', 'Keep a routine for several matches before judging it. The testing phase can play it hundreds of times in seconds.'] } },
    ];
  });

  // two groups, one outcome: how much does the group matter?
  function condCounts(id, title, get) {
    add(id, title, (ctx) => {
      let C = get(ctx), example = false;
      if (!C || C.na < 5 || C.nb < 5) { C = Object.assign({}, C || {}, { ka: 12, na: 40, kb: 20, nb: 80 }); example = true; }
      const pa = C.ka / C.na, pb = C.kb / C.nb, p = (C.ka + C.kb) / (C.na + C.nb), la = wilson(C.ka, C.na), lb = wilson(C.kb, C.nb), overlap = !(la[0] > lb[1] || lb[0] > la[1]);
      return [
        { target: C.target, title: 'The two groups',
          lines: [(example ? 'There are not enough matches yet, so these are example numbers. ' : '') + 'There were <b>' + C.na + '</b> cases where ' + C.a + ', and <b>' + C.ka + '</b> of them ' + C.event + '.'],
          ask: { kind: 'number', unit: '%', q: ['What percentage is that?'], answer: () => pa * 100, tol: 0.6, reveal: ['<b>' + f1(pa * 100) + '%</b>.', 'That is a <b>conditional probability</b>: the chance of the outcome <i>given</i> that ' + C.a + '.'] } },
        { target: C.target, title: 'The other group',
          lines: ['There were <b>' + C.nb + '</b> cases where ' + C.b + ', and <b>' + C.kb + '</b> of them ' + C.event + '.'],
          ask: { kind: 'number', unit: '%', q: ['What percentage is that?'], answer: () => pb * 100, tol: 0.6, reveal: ['<b>' + f1(pb * 100) + '%</b>.', 'The gap between the two is <b>' + f1(Math.abs(pa - pb) * 100) + ' percentage points</b>.'] } },
        { title: 'If it made no difference',
          lines: ['Across both groups the overall rate is <b>' + f1(p * 100) + '%</b>.'],
          ask: { kind: 'choice', q: ['If the group made no difference, what would you expect each group\'s rate to be?'], correct: 0,
            options: [{ t: 'About the same as the overall rate', fb: '' }, { t: 'One of them would be zero', fb: 'No: with no effect, both would sit near the overall rate.' }],
            reveal: ['Both would sit near the overall rate. When the group makes no difference the outcome is called <b>independent</b> of it.', 'Here they are ' + f1(pa * 100) + '% and ' + f1(pb * 100) + '%.'] } },
        { title: 'Is the gap real?',
          lines: ['Each group has its own margin of error. The first: <b>' + Math.round(la[0] * 100) + '% to ' + Math.round(la[1] * 100) + '%</b>. The second: <b>' + Math.round(lb[0] * 100) + '% to ' + Math.round(lb[1] * 100) + '%</b>.'],
          ask: { kind: 'choice', q: ['Do the two ranges overlap?'], correct: overlap ? 0 : 1,
            options: [{ t: 'Yes, they overlap', fb: 'Compare the top of the lower one with the bottom of the higher one.' }, { t: 'No, there is a gap between them', fb: 'Compare the top of the lower one with the bottom of the higher one.' }],
            reveal: overlap ? ['They overlap, so the gap could be luck. More matches are needed before building a plan on it.'] : ['There is a gap between them, so the difference is very unlikely to be luck.'] } },
      ];
    });
  }
  condCounts('cond-transdef', 'Does where you lose the ball matter?', () => { const s = S(); if (!s) return null; return { a: 'you lost the ball in your own third', b: 'you lost it further up the pitch', event: 'led to a shot against within 15 seconds', ka: s.losses.own.shot, na: s.losses.own.n, kb: s.losses.else.shot, nb: s.losses.else.n, target: BOARDS }; });
  condCounts('cond-transatt', 'Does where you win the ball matter?', () => { const s = S(); if (!s) return null; return { a: 'you won the ball high up the pitch', b: 'you won it deep', event: 'led to a shot within 15 seconds', ka: s.wins.high.shot, na: s.wins.high.n, kb: s.wins.low.shot, nb: s.wins.low.n, target: BOARDS }; });
  condCounts('cond-defend', 'Does cutting the lane matter?', () => { const s = S(); if (!s) return null; const d = s.defend.lane; return { a: 'you had cut the passing lane', b: 'the lane was clear', event: 'were completed by the opposition', ka: d.cut.ok, na: d.cut.n, kb: d.clear.ok, nb: d.clear.n, target: BOARDS }; });

  add('kw-hypothesis', 'Is the change real?', (ctx) => {
    const lg = window.FM_WORLD && FM_WORLD.league;
    let a = { p: 0.62, n: 400 }, b = { p: 0.66, n: 400 }, example = true;
    try {
      const lists = [lg.labRuns || []].concat(Object.keys(lg.phaseLabRuns || {}).map((k) => lg.phaseLabRuns[k]));
      const runs = lists.filter((l) => l.length >= 2).sort((x, y) => y.length - x.length)[0];
      if (runs) { const r1 = runs[runs.length - 2], r2 = runs[runs.length - 1]; a = { p: r1.result.beat.p, n: r1.n }; b = { p: r2.result.beat.p, n: r2.n }; example = false; }
    } catch (e) { /* the example numbers are used */ }
    const d = (b.p - a.p) * 100, se = Math.sqrt(a.p * (1 - a.p) / a.n + b.p * (1 - b.p) / b.n) * 100, real = Math.abs(d) > 1.96 * se;
    return [
      { target: q('#view-reports'), title: 'Two runs',
        lines: [(example ? 'You have not run two tests of the same phase yet, so here are example numbers. ' : 'These are your two latest runs of the same test. ') + 'Before: <b>' + f1(a.p * 100) + '%</b> of ' + a.n + '. After the change: <b>' + f1(b.p * 100) + '%</b> of ' + b.n + '.'],
        ask: { kind: 'number', unit: 'points', q: ['By how many percentage points did it change?'], answer: () => d, tol: 0.2, reveal: ['<b>' + f1(d) + ' points</b>.', 'The question is whether that is a real effect of your change or just the luck of the draw.'] } },
      { title: 'The size of the luck',
        lines: ['Each run has its own margin of error, and the difference between two runs has both of them.'],
        ask: { kind: 'number', unit: 'points', q: ['Work out √( p₁ × (1 − p₁) ÷ n₁ + p₂ × (1 − p₂) ÷ n₂ ) in percentage points.'], answer: () => se, tol: Math.max(0.15, se * 0.06),
          reveal: ['<b>' + f1(se) + ' points</b>. This is the <b>standard error of the difference</b>.', 'A change has to be about <b>' + f1(1.96 * se) + ' points</b> (1.96 × that) before it stands out from luck.'] } },
      { title: 'Real or luck?',
        lines: ['The change is ' + f1(Math.abs(d)) + ' points. The bar is ' + f1(1.96 * se) + '.'],
        ask: { kind: 'choice', q: ['Does the change clear the bar?'], correct: real ? 0 : 1,
          options: [{ t: 'Yes: it is bigger than the bar', fb: 'Compare the two numbers.' }, { t: 'No: it could easily be luck', fb: 'Compare the two numbers.' }],
          reveal: real ? ['Yes. A gap this large would happen by luck less than 1 time in 20. In a hypothesis test that is a <b>p-value</b> below 0.05.'] : ['No. A gap this size is easily produced by luck: the <b>p-value</b> is above 0.05, so there is not enough evidence to say the change worked.', 'That is not proof that it did nothing. It means this test could not tell. More runs would narrow the doubt.'] } },
      { title: 'Big enough to matter?',
        lines: ['A very large test can make a tiny difference "significant".'],
        ask: { kind: 'choice', q: ['A change moves the success rate from 62.0% to 62.4% and is significant. Is it worth changing the plan for?'], correct: 1,
          options: [{ t: 'Yes: it is significant', fb: 'Significant means unlikely to be luck. It says nothing about size.' }, { t: 'Probably not: it is real but tiny', fb: '' }],
          reveal: ['Significance says it is unlikely to be luck. The <b>effect size</b> says how big it is.', 'Ask both: is it real, and is it big enough to be worth the change?'] } },
    ];
  });

  // ---------- the tours ----------
  function tour(id, page, title, blurb, steps) {
    FM.guides[id] = { id, title, blurb, min: 0, pages: [page], build: (ctx) => steps(ctx).filter(Boolean) };
  }
  const next = { target: NEXT, title: 'When you are ready' };

  tour('tour-squad', 'squad', 'Formation: a tour of the page', 'What each part of the formation page does.', () => [
    { target: q('#formSel'), title: 'The formation',
      lines: ['A formation is a set of numbers: the defenders, then the midfielders, then the attackers, counting from the back.', 'Choosing one decides how many players stand on each line and where. It is the starting point for everything else.', 'Change it here and the shirts rearrange themselves.'] },
    { target: BOARDS, title: 'The shape on the pitch',
      lines: ['Each shirt is a player, with his name and rating under it.', 'To swap two players, drag one shirt onto another. A shirt dropped anywhere else springs back.', 'Click a shirt to see that player in the panel beside it.'] },
    { target: q('#bench, .bench'), title: 'The bench',
      lines: ['These are your substitutes with their ratings.', 'To make a change, click a bench player and the shirt he should replace, in either order.'] },
    Object.assign({ lines: ['When the shape is right, continue to the build-up.'] }, next),
  ]);

  tour('tour-build', 'build', 'Build-up: a tour of the page', 'Your goal-kick build-up, what your passes say, and where to write it down.', () => {
    const s = S(), b = s && s.build;
    return [
      { target: BOARDS, title: 'The diagram',
        lines: ['This is a goal kick. Your goalkeeper has the ball and the team has to play out.', 'The red shirts are yours, and show where each player ends up when the ball reaches midfield. The dashed green shirts are the opposition, set up the way they play against you.', 'Drag any of your shirts to change where a player ends up. A shirt will not go beyond the opposition\'s deepest defender: that is the offside line.'] },
      { target: COND, title: 'Different pages for different situations',
        lines: ['A page is a version of this diagram that applies in one situation.', 'The drop-down says when it applies: when the opposition press high, hold a mid block or sit in a low block, or when the score is a certain way.', 'The opposition shirts change with it: a high press stands further up the pitch, a low block sits deep and compact.', 'Add a page for each situation you want to be ready for.'] },
      { target: BOARDS, title: 'What your passes say',
        enter: (c) => { if (b) setProp(c, { k: b.ok, n: b.n, what: 'passes in your own third were completed', target: BOARDS }); },
        lines: () => !b || !b.n ? ['No passes have been logged yet. Play a match or a friendly and the numbers will appear here.'] : [
          'In your own third you have played <b>' + b.n + '</b> passes and <b>' + b.ok + '</b> reached a team-mate: ' + KWL('kw-proportion', pct(b.ok, b.n) + ' completed') + '.',
          'When the nearest opponent was within 5 m of the receiver, <b>' + pct(b.tight.ok, b.tight.n) + '</b> were completed. With 10 m or more of space, <b>' + pct(b.free.ok, b.free.n) + '</b>.',
          'Splitting passes by a condition like this is ' + KWL('cond-build', 'conditional probability') + '.',
          lvl() >= 1 ? 'Fitting a curve through every pass, so that each one gets its own chance of coming off, is ' + KWL('logistic', 'logistic regression') + '.' : 'Click a highlighted word to see how it works.'] },
      { target: instrTargets, title: 'Say it in your own words',
        lines: ['Write what you want the team to do in plain words, then press Turn this into instructions.', 'The match reads it as rules for the players. Your instructions stay for the next game, and you can change them any time.'] },
      Object.assign({ lines: ['When the build-up is how you want it, continue to playing through midfield.'] }, next),
    ];
  });

  tour('tour-midfield', 'midfield', 'Through midfield: a tour of the page', 'Where the build-up ended, where the team goes next, and what your lanes say.', () => {
    const s = S(), m = s && s.midfield;
    return [
      { target: BOARDS, title: 'Two diagrams',
        lines: ['The first diagram is where the build-up ended. The second is where the team goes next.', 'If you made more than one version of the build-up, each has its own starting diagram here, and an arrow joins it to the version that follows.', 'Drag shirts on the second diagram to say where you want people when the ball is played through midfield.'] },
      { target: BOARDS, title: 'What your lanes say',
        enter: (c) => { if (m) setProp(c, { k: m.ok, n: m.n, what: 'passes through the middle third were completed', target: BOARDS }); },
        lines: () => !m || !m.n ? ['No midfield passes have been logged yet.'] : [
          'Through the middle third you have played <b>' + m.n + '</b> passes and <b>' + m.ok + '</b> were completed: ' + KWL('kw-proportion', pct(m.ok, m.n)) + '.',
          'Through a clear lane <b>' + pct(m.lane.clear.ok, m.lane.clear.n) + '</b> were completed. With an opponent standing in the lane, <b>' + pct(m.lane.cut.ok, m.lane.cut.n) + '</b>.',
          'Whether that gap is real is a question of ' + KWL('cond-midfield', 'conditional probability') + '.'] },
      { target: instrTargets, title: 'Say it in your own words', lines: ['Write what you want in plain words and press Turn this into instructions. It applies only to this stage and this page.'] },
      Object.assign({ lines: ['Continue to the final third when you are ready.'] }, next),
    ];
  });

  tour('tour-final', 'final', 'Final third: a tour of the page', 'Where attacks end, and how good your chances are.', () => {
    const s = S();
    return [
      { target: BOARDS, title: 'The final third',
        lines: ['The second diagram is where the attack ends: the shirts that go forward to shoot and the ones that stay to cover.', 'The line across the pitch is the offside line, set by the opposition\'s deepest defender.'] },
      { target: BOARDS, title: 'What your shots say',
        enter: (c) => { if (s && s.final.n) setProp(c, { k: s.final.ok, n: s.final.n, what: 'passes in the final third were completed', target: BOARDS }); },
        lines: () => !s || !s.shots.n ? ['No shots have been logged yet. Play a match or a friendly and the numbers will appear here.'] : [
          'You have had <b>' + s.shots.n + '</b> shots and scored <b>' + s.shots.goals + '</b>.',
          'The quality of those chances adds up to <b>' + f1(s.shots.xg) + '</b> ' + KWL('xg', 'expected goals') + '.',
          'In the final third <b>' + pct(s.final.ok, s.final.n) + '</b> of your passes were completed (' + KWL('kw-proportion', 'what that share tells you') + ').',
          'Against you: <b>' + s.against.n + '</b> shots and <b>' + f1(s.against.xg) + '</b> expected goals.'] },
      { target: instrTargets, title: 'Say it in your own words', lines: ['Write what you want in plain words, for example where players should shoot from, and press Turn this into instructions.'] },
      Object.assign({ lines: ['Continue to the defensive transition when you are ready.'] }, next),
    ];
  });

  tour('tour-transdef', 'transdef', 'Losing the ball: a tour of the page', 'The seconds after you give the ball away.', () => {
    const s = S(), l = s && s.losses;
    return [
      { target: BOARDS, title: 'The moment the ball is lost',
        lines: ['The first diagram is where everyone stands the instant you lose the ball. The second is the shape you want a few seconds later.', 'This is where you decide whether to press the ball straight away or drop back into shape.'] },
      { target: BOARDS, title: 'What happens next',
        lines: () => !l || !l.n ? ['No turnovers have been logged yet.'] : [
          'You gave the ball away <b>' + l.n + '</b> times, and <b>' + l.shot + '</b> of those led to a shot against within 15 seconds.',
          'Lost in your own third: <b>' + pct(l.own.shot, l.own.n) + '</b>. Lost further up the pitch: <b>' + pct(l.else.shot, l.else.n) + '</b>.',
          'Comparing the two is ' + KWL('cond-transdef', 'conditional probability') + '.'] },
      { target: instrTargets, title: 'Say it in your own words', lines: ['Write what you want in plain words and press Turn this into instructions.'] },
      Object.assign({ lines: ['Continue to organised defending when you are ready.'] }, next),
    ];
  });

  tour('tour-organised', 'organised', 'Defending in shape: a tour of the page', 'How you want to defend once the opposition are in your half.', () => {
    const s = S(), d = s && s.defend, t = s && s.tackles;
    return [
      { target: BOARDS, title: 'The two diagrams',
        lines: ['The first diagram is the opposition with the ball near your goal. The second is the shape your team takes to defend the area.', 'Shirts are the same colours as on the other pages; the dashed ones are the opposition and move with the block you choose.'] },
      { target: BOARDS, title: 'What they do against you',
        enter: (c) => { if (d && d.n) setProp(c, { k: d.ok, n: d.n, what: 'opposition passes in your defensive third were completed', target: BOARDS }); },
        lines: () => !d || !d.n ? ['No defending has been logged yet.'] : [
          'In your defensive third the opposition have played <b>' + d.n + '</b> passes and <b>' + d.ok + '</b> were completed: ' + KWL('kw-proportion', pct(d.ok, d.n)) + '.',
          'Through a lane you had cut, <b>' + pct(d.lane.cut.ok, d.lane.cut.n) + '</b>. Through a clear lane, <b>' + pct(d.lane.clear.ok, d.lane.clear.n) + '</b> (' + KWL('cond-defend', 'is the gap real?') + ').',
          t && t.n ? 'You won <b>' + pct(t.won, t.n) + '</b> of your tackles.' : 'No tackles logged yet.'] },
      { target: instrTargets, title: 'Say it in your own words', lines: ['Write what you want in plain words and press Turn this into instructions.'] },
      Object.assign({ lines: ['Continue to the attacking transition when you are ready.'] }, next),
    ];
  });

  tour('tour-transatt', 'transatt', 'Winning the ball: a tour of the page', 'The seconds after you win the ball.', () => {
    const s = S(), w = s && s.wins;
    return [
      { target: BOARDS, title: 'The moment the ball is won',
        lines: ['The first diagram is where everyone stands the instant you win the ball. The second is where you want to be a few seconds into the break.', 'Here you decide how direct the first pass is and who runs.'] },
      { target: BOARDS, title: 'What happens next',
        lines: () => !w || !w.n ? ['No ball wins have been logged yet.'] : [
          'You won the ball <b>' + w.n + '</b> times, and <b>' + w.shot + '</b> led to a shot within 15 seconds.',
          'Won high up the pitch: <b>' + pct(w.high.shot, w.high.n) + '</b>. Won deep: <b>' + pct(w.low.shot, w.low.n) + '</b>.',
          'Comparing the two is ' + KWL('cond-transatt', 'conditional probability') + '.'] },
      { target: instrTargets, title: 'Say it in your own words', lines: ['Write what you want in plain words and press Turn this into instructions.'] },
      Object.assign({ lines: ['Continue to set pieces when you are ready.'] }, next),
    ];
  });

  tour('tour-setpieces', 'setpieces', 'Set pieces: a tour of the page', 'Corners and free kicks, and why a few cases say so little.', (ctx) => {
    const lgd = ctx.data || {}, ss = lgd.setShots || [], n = ss.length, g = ss.reduce((a, x) => a + x.goal, 0);
    return [
      { target: q('#tabBody'), title: 'Your routines',
        lines: ['This is where you set how the team takes corners and free kicks and how it defends them.', 'Choose a routine and who takes it. Each choice is a plan you can test.'] },
      { target: q('#tabBody'), title: 'How much can you learn?',
        enter: (c) => { setProp(c, { k: g, n: Math.max(n, 1), what: 'set-piece shots were goals', target: q('#tabBody') }); },
        lines: () => n ? ['You have taken <b>' + n + '</b> shots from set pieces and scored <b>' + g + '</b>.', 'That is a handful, and a handful says very little. ' + KWL('kw-small', 'See how wide the doubt is') + '.'] : ['Set pieces are rare, so each routine has only a few cases. ' + KWL('kw-small', 'See how wide the doubt is') + '.'] },
      Object.assign({ lines: ['When the set pieces are set, continue to the testing phase.'] }, next),
    ];
  });

  tour('tour-test', 'test', 'Testing: a tour of the page', 'How the tests work and how many to run.', () => [
    { target: q('#labPred'), title: 'Your prediction',
      lines: ['Before every run, write down what share you expect to succeed.', 'Writing it first is what lets the result teach you something.'] },
    { target: q('#labN'), title: 'How many tests',
      lines: ['The same situation is played out this many times, and the share that succeed is counted.', 'More tests give a steadier number but take longer. ' + 'How many you need is ' + KWL('montecarlo', 'a Monte Carlo question') + '.'] },
    { target: q('#labRun'), title: 'Run it',
      lines: ['Run it, then change one thing in your tactics and run it again.', 'Whether a difference between two runs is real or luck is a ' + KWL('kw-hypothesis', 'hypothesis test') + '.', 'Any test can be skipped. At least one has to be done before you read the evidence.'] },
  ]);

  tour('tour-evidence', 'evidence', 'The evidence: a tour of the page', 'What the opposition report and your tests are telling you.', () => [
    { target: q('#view-reports'), title: 'The opposition report',
      lines: ['This page collects what is known about the next opponent: how they set up and play, their numbers, who to watch and how they have done against you.', 'Their shape in each phase of play is drawn on six small pitches, always attacking up the page.'] },
    { target: q('#view-reports'), title: 'Judging your tests',
      lines: ['Your tests are only worth acting on if a difference is more than luck. That is a ' + KWL('kw-hypothesis', 'hypothesis test') + '.', 'A large sample narrows the doubt. ' + KWL('kw-proportion', 'This is how a share and its margin work') + '.'] },
  ]);

  tour('tour-preview', 'preview', 'Match preview: a tour of the page', 'Your plan against theirs, in one place.', () => [
    { target: q('#view-preview'), title: 'Your match plan',
      lines: ['Your plan for the match is laid out here: the formation, the tactics you set and the instructions you wrote.', 'Next to it is the opponent, with the evidence you have gathered so far.'] },
    { target: q('#view-preview'), title: 'Before you play',
      lines: ['Read it through once as if you were the opposition manager. If a page is missing for a situation that is likely, go back and add it.', 'Then start the match.'] },
  ]);

  tour('tour-analysis', 'analysis', 'The Analysis Centre: a tour of the page', 'What happened last time, in numbers.', () => [
    { target: q('#view-analysis'), title: 'The last match',
      lines: ['This is the review of the match you have just played: the key facts, where it was played, and the five strengths and five weaknesses the numbers show.', 'It also shows which of your pages were used, and for how much of the match.'] },
    { target: q('#view-analysis'), title: 'For the next game',
      lines: ['At the bottom Elena says what to carry into the next game.', 'Before changing anything, ask how big the sample is: one match is ' + KWL('kw-proportion', 'a small sample') + '.'] },
  ]);

  // ---------- the side panel now only points to the tour ----------
  const N = (FM.elenaNotes = FM.elenaNotes || {});
  const DEEPER = { build: ['logistic', 'cond-build'], midfield: ['cond-midfield'], final: ['xg'], test: ['montecarlo'], transdef: ['cond-transdef'], transatt: ['cond-transatt'], organised: ['cond-defend'], setpieces: ['kw-small'], evidence: ['kw-hypothesis'] };
  Object.keys(FM.TOUR_FOR).forEach((key) => {
    const tid = FM.TOUR_FOR[key];
    if (!FM.guides[tid]) return;
    N[key] = () => {
      let h = FM.guideOffer(tid, esc(FM.guides[tid].blurb || ''));
      const list = (DEEPER[key] || []).filter((id) => FM.guides[id] && (FM.guides[id].min || 0) <= lvl());
      if (list.length) h += '<p class="el-small">Go deeper</p>' + list.map((id) => '<div class="gd-offer"><b>' + esc(FM.guides[id].title) + '</b><button type="button" data-guide="' + esc(id) + '">Open the lesson</button></div>').join('');
      return h;
    };
  });
  // lessons opened from the list start on their own, with a kwData-free context, so they must not rely on a tour having run
})();
