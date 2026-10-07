/*
 * Elena Marsh, the club's performance analyst, in a panel on the right of the build-up lab. She reads each run for you (what went wrong, whether your
 * prediction held, whether a change made a real difference) and teaches the statistics behind it in short lessons, each one built from questions.
 * Written in advance: nothing here is generated while you play.
 */
(function () {
  const FM = window.FM = window.FM || {};
  const IMG = { hello: '/assets/football/elena-hello.jpg', point: '/assets/football/elena-point.jpg', think: '/assets/football/elena-think.jpg' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const pc = (x) => Math.round(x * 100) + '%';
  const DONE_KEY = 'lm_football_stats_lessons_v1';
  const loadDone = () => { try { return JSON.parse(localStorage.getItem(DONE_KEY) || '{}'); } catch (e) { return {}; } };
  const saveDone = (d) => { try { localStorage.setItem(DONE_KEY, JSON.stringify(d)); } catch (e) { /* only a tick on a list */ } };

  // ---------- the lessons ----------
  // Each step: say (lines, one sentence each), q, then options [{t, ok, hint}] or num {answer, tol, unit}; why = the explanation after a right answer,
  // name = the word for it, matters = where it shows up outside football.
  const LESSONS = [
    { id: 'chance', title: 'Why one try tells you almost nothing', steps: [
      { say: ['Dani is a coach. She sets up a build-up and plays it 20 times.', '11 of the 20 reach the halfway line with the ball.', 'She changes nothing at all: same players, same positions, same opponent.', 'She plays another 20. This time 15 of the 20 reach halfway.'],
        q: 'Nothing was changed between the two sets of 20. What is the most likely reason the results differ?',
        options: [{ t: 'The players learned something between the two sets', hint: 'Nothing was changed, and a test starts afresh each time.' }, { t: 'Chance: every test depends on many small random events, so two sets of 20 will rarely match', ok: true }, { t: 'The first set was a mistake and should be thrown away', hint: 'Both sets were played the same way. Neither is a mistake.' }],
        why: ['In every test a pass might work or not, and a defender might step up or not.', 'Those small chances add up differently each time, so a set of 20 tests lands in a slightly different place every time.', 'Dani did nothing wrong. The gap between 55% and 75% came entirely from luck.'],
        name: ['This movement from one set of tests to the next is called **sampling variation**.'] },
      { say: ['Dani now plays two sets of 2000 tests, again changing nothing.'],
        q: 'Which pair of results is more likely: 1000 and 1010 reaching halfway, or 1000 and 1300?',
        options: [{ t: '1000 and 1010', ok: true }, { t: '1000 and 1300', hint: 'A gap of 300 would need a great deal of luck all in one direction.' }, { t: 'Both are equally likely', hint: 'Think about what luck does over a very large number of tests.' }],
        why: ['In a small set, one lucky run of passes can move the share a long way.', 'In a very large set, lucky and unlucky tests cancel each other out, so the share settles near the true value.', 'More tests means less sampling variation, though never none.'],
        matters: ['A medicine is tested on thousands of patients for the same reason. A handful of recoveries could be luck, and thousands are much harder to explain away.'] },
      { say: ['Back to the first two sets: 55% and 75%.', 'Dani says: "The true share must be somewhere between 55% and 75%."'],
        q: 'Is that a safe thing to say?',
        options: [{ t: 'Yes, the truth must lie between the two results', hint: 'What if she ran a third set of 20?' }, { t: 'No: a third set of 20 could easily give 50% or 80%, so two results do not fence the truth in', ok: true }, { t: 'No, because 20 tests is never enough to say anything at all', hint: 'Twenty tests do tell you something. They just do not tell you precisely.' }],
        why: ['Two sets show how far luck can move the share. They do not show where the truth is.', 'The honest statement is an estimate with a range, which is what the next lesson builds.'] },
      { final: true, say: ['A manager plays a set-up 30 times. 21 reach halfway.', 'A friend says: "So it works 70% of the time."'],
        q: 'What is the best reply?',
        options: [{ t: '"Correct, 21 out of 30 is 70%, so that is the true figure."', hint: 'Would another 30 tests give exactly 21 again?' }, { t: '"70% is what these 30 tests gave. Another 30 would probably give a different number, so 70% is only an estimate."', ok: true }, { t: '"30 tests tell us nothing, so ignore it."', hint: 'They tell you something. They just do not tell you exactly.' }, { t: '"70% is too high to be real."', hint: 'There is no reason to think so from the number alone.' }],
        why: ['The share you found is one draw from a spread of results that luck produces.', 'It is the best single guess, and it needs a range around it.'] },
    ] },
    { id: 'range', title: 'Giving a share a range', steps: [
      { say: ['A set-up is tested 100 times. 58 reach halfway.', 'A student says: "So the real share is 58%."'],
        q: 'Using the last lesson, what is wrong with that?',
        options: [{ t: 'Nothing, 58% is what was measured', hint: 'Measured in these 100 tests. Would the next 100 agree exactly?' }, { t: 'Another 100 tests would probably give a different number, so 58% is a best guess and not the truth', ok: true }, { t: 'The student should have rounded to 60%', hint: 'Rounding does not deal with luck.' }],
        why: ['58% describes these 100 tests. It estimates the true share, and the estimate will wobble a little each time you repeat the experiment.', 'So what we want to report is a best guess plus how far it could plausibly be out.'] },
      { say: ['Here is how far out the estimate could plausibly be, for different numbers of tests:', '100 tests: about 10 points either way.', '400 tests: about 5 points either way.', '1600 tests: about 2.5 points either way.'],
        q: 'Following the pattern, how many tests would bring it down to about 1.25 points either way?',
        num: { answer: 6400, tol: 0, unit: ' tests' },
        why: ['Each time the range halves, the tests needed multiply by four: 100, 400, 1600, 6400.', 'So accuracy gets expensive. Twice as precise costs four times the tests, and ten times as precise costs a hundred times the tests.'],
        matters: ['This is why a national opinion poll of about a thousand people is accurate to about three points, and why polls rarely bother with ten times that to get one.'] },
      { say: ['The range around a share, built to be wrong only about 1 time in 20, has a name.'],
        q: 'A student predicted 70% would reach halfway. The test of 100 gave 58%, with a range of 48% to 67%. What does that tell the student?',
        options: [{ t: 'The prediction was outside the range, so luck alone is unlikely to explain the gap', ok: true }, { t: 'The prediction was wrong by 12 points, which is a lot but could easily be luck', hint: 'The range already includes how far luck could move the share.' }, { t: 'Nothing, because 58% is below 70%', hint: 'Compare 70% with the range, not just with 58%.' }],
        why: ['The range says where the true share plausibly lies. 70% is outside it, so the student pictured this build-up as better than it is.', 'That is useful: the test has taught the student something, even though it was only a prediction.'],
        name: ['This range is called a **95% interval**. If you repeated the whole experiment many times, about 95 of every 100 intervals made this way would contain the true share.'] },
      { final: true, say: ['A different set-up: 400 tests, 160 reach halfway. The 95% interval is 35% to 45%.'],
        q: 'Which sentence is the best reading?',
        options: [{ t: 'The true share is certainly between 35% and 45%', hint: 'About 1 interval in 20 misses the truth.' }, { t: 'Only 40% will reach halfway in every future match', hint: 'It estimates a share across many attempts, not what any single attempt will do.' }, { t: 'The best estimate is 40%, and the true share plausibly lies between 35% and 45%', ok: true }, { t: 'With 400 tests the answer is exactly 40%', hint: 'More tests narrow the range. They never remove it.' }],
        why: ['An interval is a plausible range built by a method that works about 95% of the time.', 'It is neither a promise about the truth nor a prediction for one match.'] },
    ] },
    { id: 'real', title: 'Is the difference real?', steps: [
      { say: ['Dani moves two players. Before: 64 of 100 reach halfway. After: 58 of 100.'],
        q: 'Before she blames the move, what should she ask?',
        options: [{ t: 'Which player was moved?', hint: 'That matters later. First, is the drop even real?' }, { t: 'Could a gap of this size turn up by chance if nothing had changed?', ok: true }, { t: 'Can she run it one more time to see which number is right?', hint: 'A rerun gives a third number, not the answer.' }],
        why: ['Two sets of 100 tests never agree exactly, even with nothing changed.', 'So a gap by itself proves nothing. What matters is whether it is bigger than luck usually makes it.'] },
      { say: ['To find out how big luck makes the gap, Dani leaves the set-up completely unchanged. She runs two sets of 100 and records the gap, and she does this 20 times.', 'The gaps, in percentage points, are:', '2, -4, 7, -1, 0, -8, 3, 5, -6, 1, 9, -2, -3, 4, -7, 0, 6, -5, 2, -1'],
        q: 'How many of those 20 gaps are 6 points or more, in either direction?',
        num: { answer: 6, tol: 0, unit: ' of 20' },
        why: ['The gaps of 6 or more are 7, -8, -6, 9, -7 and 6, which is six of the twenty.', 'So with nothing changed, a gap as big as the one Dani saw happened in 6 of 20 pairs, which is 30%.'] },
      { say: ['A gap of 6 points turned up in about 30% of unchanged pairs.'],
        q: 'Does Dani\'s result show that moving the players changed anything?',
        options: [{ t: 'Yes, the share fell and that is what the data show', hint: 'It fell by about as much as luck alone often moves it.' }, { t: 'No: a gap like that happens by chance about 30% of the time, so it is too common to count as evidence', ok: true }, { t: 'No, because it fell by less than 10 points', hint: 'The question is how often luck produces that gap, not a fixed size.' }],
        why: ['When luck alone produces the same gap 3 times in 10, the gap cannot persuade anyone.', 'A result becomes evidence when luck alone would rarely produce it.'],
        name: ['The proportion of the time that luck alone would produce a gap this big is called the **p-value**. The lab works it out for you with mathematics, so you do not have to run the 20 unchanged pairs yourself.'] },
      { final: true, say: ['The lab says the p-value for a difference is 0.04.'],
        q: 'Which sentence is correct?',
        options: [{ t: 'There is a 4% chance the change made no difference', hint: 'The p-value is about the data, not about the change itself.' }, { t: 'If the change did nothing, a gap this big would turn up in about 4% of pairs of runs', ok: true }, { t: 'The change makes 96% of build-ups better', hint: 'It says nothing about how big the effect is.' }, { t: 'The change is definitely real', hint: 'A small p-value is strong evidence, never proof.' }],
        why: ['The p-value starts from "suppose nothing changed" and asks how surprising the data would be.', 'A small one says the data would be surprising if nothing had changed, which is a reason to doubt that nothing changed.'],
        matters: ['Courts, hospitals and journals use the same question. It is easy to say "4% chance it is a fluke", and that is the sentence most often got wrong.'] },
    ] },
    { id: 'level', title: 'How small must the p-value be?', steps: [
      { say: ['Dani tests 20 changes that do nothing at all, such as the colour of the training bibs. Each is compared with the original set-up and given a p-value.', 'She decides to call a change "real" whenever its p-value is below 0.05, which means luck alone would produce it less than 1 time in 20.'],
        q: 'About how many of the 20 useless changes would she expect to call real, purely by luck?',
        num: { answer: 1, tol: 0, unit: '' },
        why: ['One time in 20 is 5%, and 5% of 20 is 1.', 'So even when nothing is happening, a rule like this will find something about one time in 20.'],
        name: ['The line, 0.05 here, is the **significance level**. A change that looks real but is only luck is a **false positive**.'] },
      { say: ['Dani changes one thing that does nothing. She then looks at four measures: beat the press, lost possession, lost near her goal, and opposition shot.', 'Each measure has a 1 in 20 chance of crossing the line by luck.'],
        q: 'About how likely is it that at least one of the four crosses it? (Hint: first find the chance that none cross.)',
        num: { answer: 19, tol: 2, unit: '%' },
        why: ['The chance that one given measure does not cross is 0.95.', 'The chance that none of four cross is 0.95 four times over, which is about 0.81.', 'So the chance at least one crosses is about 19%, nearly 1 in 5 and not 1 in 20.'],
        matters: ['A study that measures dozens of outcomes will nearly always find one that looks significant. This is one reason many published results do not appear again when someone repeats the study.'] },
      { say: ['One change gives p = 0.049. Another gives p = 0.051.', 'The line is 0.05.'],
        q: 'How different is the evidence in the two cases?',
        options: [{ t: 'The first is real and the second is not', hint: 'The two p-values differ by 0.002.' }, { t: 'Almost the same strength of evidence: the line is a convention, not a switch', ok: true }, { t: 'The second is much weaker', hint: 'Compare the two numbers again.' }],
        why: ['The p-value is a smooth measure of how surprising the data are. It does not jump at 0.05.', 'Treat 0.049 and 0.051 as nearly the same, and treat 0.0001 as much stronger than either.'] },
      { final: true, say: ['A student looks at a result, sees p = 0.07, and says: "If I use 0.10 as my line, it counts."'],
        q: 'What is wrong with choosing the line after seeing the result?',
        options: [{ t: 'Nothing, 0.10 is a perfectly good level', hint: 'The level itself is not the problem. When it was chosen is.' }, { t: 'You could move the line until any result passes, so the line has to be set before looking', ok: true }, { t: 'A p-value can never be above 0.05', hint: 'It can be anything from 0 to 1.' }, { t: 'The student should use 0.01 whatever the result', hint: 'There is no one level that is right for everything.' }],
        why: ['If the line can be moved after the result, it no longer guards against luck.', 'Deciding the level first, and how many things you will look at, keeps the false-positive rate where you said it was.'] },
    ] },
    { id: 'matters', title: 'Significant is not the same as important', steps: [
      { say: ['A tiny change in positions moves "beat the press" from 60.0% to 60.4%.', 'Each set-up is tested a million times, and the p-value is 0.001.'],
        q: 'Would you change the way you play because of this?',
        options: [{ t: 'Yes, p is tiny so the result is certain to matter', hint: 'p says the gap is not luck. It says nothing about whether the gap is big.' }, { t: 'Probably not: the gap is almost certainly real, but 0.4 points is far too small to matter', ok: true }, { t: 'No, because the p-value is too small to be believed', hint: 'With a million tests a tiny p-value is exactly what a real small gap produces.' }],
        why: ['With enough tests even a tiny real difference stands out from luck.', 'So p tells you whether a gap is real. How big it is, and whether it matters in a match, is a separate question.'],
        name: ['Real, but too small to matter, is **statistically significant** without being **practically significant**.'] },
      { say: ['Now the other way. Run 1 gave 64 of 100 and run 2 gave 58 of 100. The lab says p = 0.38, which is above 0.05.', 'Dani writes: "Moving the players has no effect."'],
        q: 'Is that conclusion justified?',
        options: [{ t: 'Yes, p is above 0.05 so there is no effect', hint: 'Think about whether 100 tests could reliably show a 6 point change.' }, { t: 'No: the test was too small to detect a gap of that size, so it simply did not show one', ok: true }, { t: 'Yes, because the share only changed by 6 points', hint: '6 points could matter a great deal in a season.' }],
        why: ['A large p-value means the data do not show a difference. It does not show that there is none.', 'With 100 tests each, luck alone moves the share by about 10 points, which can hide a real 6 point change.'] },
      { say: ['The lab tells Dani she would need about 1034 tests of each set-up to see a gap of 6 points reliably.', 'Her runs used 100 each.'],
        q: 'What should she do next?',
        options: [{ t: 'Give up on the idea, since it was not significant', hint: 'The test was too small to tell her either way.' }, { t: 'Run about 1000 tests of each set-up, then compare them again', ok: true }, { t: 'Keep running 100 tests until one pair gives p below 0.05', hint: 'That would hand her a false positive sooner or later.' }],
        why: ['If the gap is real and about that size, a much bigger run would show it reliably.', 'If it still shows nothing with a thousand tests, she can say the effect is small, which is a useful answer too.'],
        name: ['How likely a test is to find a real difference of a given size is called its **power**. More tests means more power.'] },
      { final: true, say: ['Test A: 400 tests of each set-up gives 52% against 61%, and p = 0.010.', 'Test B: 30 tests of each set-up gives 50% against 70%, and p = 0.12.'],
        q: 'Which statement is best supported?',
        options: [{ t: 'A shows a real difference of about 9 points. B is too small to say whether there is one', ok: true }, { t: 'A is real and B proves there is no difference', hint: 'B has only 30 tests each. It cannot prove no difference.' }, { t: 'B has the bigger gap, so B is the stronger evidence', hint: 'The gap is bigger in B, but 30 tests is a very small sample.' }, { t: 'Neither means anything, because p is not below 0.001', hint: '0.001 is not the standard line.' }],
        why: ['A has many tests and a small p-value, so luck is an unlikely explanation for its gap.', 'B has a bigger gap but far too few tests to separate it from luck, so it is inconclusive and not negative.'] },
    ] },
  ];

  // ---------- the panel ----------
  const E = { open: null, tab: 'read', lesson: null, step: 0, state: null, ctx: null, el: null, btn: null, watch: null };
  function css() {
    if (document.getElementById('elenaStyle')) return;
    const e = document.createElement('style'); e.id = 'elenaStyle';
    e.textContent = [
      '.el-tab { position: fixed; right: 0; top: 36%; z-index: 161; display: grid; justify-items: center; gap: 4px; padding: 8px 8px 10px; border: 1px solid rgba(241,234,214,.55); border-right: 0; border-radius: 14px 0 0 14px; background: #E6D7B0; color: #1A232D; font: 800 .74rem Arial, sans-serif; letter-spacing: .06em; cursor: pointer; box-shadow: -6px 6px 20px rgba(0,0,0,.35); transition: right .15s; }',
      '.el-tab img { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; object-position: 50% 18%; border: 2px solid #1A232D; } .el-tab .dot { position: absolute; top: 4px; left: 4px; width: 12px; height: 12px; border-radius: 50%; background: #ef4444; border: 2px solid #E6D7B0; }',
      '.el-tab.open { right: min(440px, 94vw); background: #1A232D; color: #F1EAD6; border-color: rgba(241,234,214,.4); } .el-tab.open .dot { display: none; }',
      '.el-panel { position: fixed; top: 0; right: 0; bottom: 0; z-index: 160; width: min(440px, 94vw); display: flex; flex-direction: column; background: #1A232D; color: #F1EAD6; border-left: 1px solid rgba(241,234,214,.3); box-shadow: -16px 0 44px rgba(0,0,0,.4); font: 14px/1.6 Arial, sans-serif; }',
      '.el-head { display: flex; gap: 12px; align-items: center; padding: 12px 16px; border-bottom: 1px solid rgba(241,234,214,.14); } .el-head img { width: 54px; height: 54px; border-radius: 50%; object-fit: cover; object-position: 50% 18%; border: 2px solid #F2C14E; } .el-head small { display: block; opacity: .7; }',
      '.el-head .x { margin-left: auto; width: 30px; height: 30px; border: 1px solid rgba(241,234,214,.35); border-radius: 50%; background: transparent; color: inherit; font-size: 1.1rem; cursor: pointer; }',
      '.el-tabs { display: flex; gap: 6px; padding: 8px 16px 0; } .el-tabs button { flex: 1; padding: 8px 10px; border: 1px solid rgba(241,234,214,.25); border-bottom: 0; border-radius: 10px 10px 0 0; background: transparent; color: inherit; font: 700 .84rem Arial, sans-serif; cursor: pointer; } .el-tabs button[aria-pressed="true"] { background: #E6D7B0; color: #1A232D; }',
      '.el-body { flex: 1; overflow-y: auto; padding: 14px 16px 24px; } .el-body p { margin: 0 0 10px; } .el-body h4 { margin: 16px 0 6px; font-size: .78rem; letter-spacing: .07em; text-transform: uppercase; color: #F2C14E; }',
      '.el-box { margin: 10px 0; padding: 10px 12px; border-radius: 10px; background: rgba(242,193,78,.12); } .el-box p:last-child { margin-bottom: 0; } .el-try { opacity: .85; }',
      '.el-go { display: block; width: 100%; margin: 6px 0 0; padding: 9px 12px; border: 1px solid rgba(241,234,214,.35); border-radius: 10px; background: rgba(255,255,255,.06); color: inherit; font: 700 .84rem Arial, sans-serif; text-align: left; cursor: pointer; } .el-go:hover { background: rgba(255,255,255,.12); }',
      '.el-go.primary { background: #E6D7B0; color: #1A232D; border-color: #E6D7B0; text-align: center; } .el-go[disabled] { opacity: .5; cursor: not-allowed; }',
      '.el-opt { margin-top: 8px; } .el-opt.right { border-color: #7fd49a; background: rgba(127,212,154,.16); } .el-opt.wrong { border-color: #ff9a8a; background: rgba(255,154,138,.14); }',
      '.el-hint { margin: 8px 0 0; color: #ffb4a8; } .el-num { display: flex; gap: 8px; margin-top: 8px; } .el-num input { flex: 1; min-width: 0; padding: 9px 10px; border-radius: 10px; border: 1px solid rgba(241,234,214,.35); background: rgba(255,255,255,.07); color: inherit; font: inherit; } .el-num button { flex: none; width: auto; margin: 0; }',
      '.el-q { margin: 14px 0 0; font-weight: 700; } .el-progress { opacity: .7; font-size: .8rem; margin-bottom: 8px; } .el-tick { float: right; color: #7fd49a; }',
      '.el-lab-hyp { display: grid; gap: 6px; margin-top: 12px; font-weight: 700; } .el-lab-hyp textarea { min-height: 70px; padding: 9px 10px; border-radius: 10px; border: 1px solid rgba(241,234,214,.35); background: rgba(255,255,255,.07); color: inherit; font: inherit; resize: vertical; }',
      'body.el-open { padding-right: min(456px, 100vw); } @media (max-width: 1000px) { body.el-open { padding-right: 16px; } }',
    ].join('\n');
    document.head.appendChild(e);
  }

  // ---------- what she says about the run on screen ----------
  const go = (id, label) => '<button type="button" class="el-go" data-lesson="' + id + '">Lesson: ' + esc(label) + '</button>';
  function intro(opp) {
    return '<p>I am Elena, the club analyst. Nobody can say how a build-up will go from one attempt: on any one try a pass might work or not, and a defender might step up or not. So we play the same set-up many times and count how often each thing happens.</p>' +
      '<p>Before you run anything, make a prediction. Out of 100 tests against ' + esc(opp.name) + ', how many do you think will reach the halfway line with the ball?</p>' +
      '<h4>How each decision is made</h4>' +
      '<p>Every pass has its own chance of working. It comes from the passer\'s passing rating, the distance, how clear the lane is, and how close a defender is to the receiver. As a rough guide, a 10 m pass to a free team-mate works about nine times in ten, and a 35 m pass through traffic nearer six in ten.</p>' +
      '<p>Which pass a player chooses is a weighted choice too. Your settings make some options more likely, but nothing is certain, and a calmer player (higher composure) picks the favoured option more reliably.</p>' +
      '<p>One test is one chain of those chances. A build-up of eight passes that each work nine times in ten works all the way only about 43% of the time. So one test tells you almost nothing, and we count over many tests and give a range, not one number.</p>' +
      go('chance', 'Why one try tells you almost nothing');
  }
  function reading(c) {
    const runs = c.runs, last = runs[runs.length - 1], r = last.result, n = runs.length;
    let h = '<p><b>My reading of run ' + n + '.</b></p>';
    // the prediction
    if (last.pred !== '' && last.pred != null) {
      const v = r.beat, p = last.pred / 100, ok = p >= v.lo && p <= v.hi;
      h += '<h4>Your prediction</h4><div class="el-box"><p>You predicted <b>' + last.pred + '%</b>. The tests found <b>' + pc(v.p) + '</b>, with a 95% interval of ' + pc(v.lo) + ' to ' + pc(v.hi) + '.</p>' +
        '<p>' + (ok ? 'Your prediction is inside that range, so these tests give no reason to doubt it. It does not prove it was right: other numbers inside the range would pass the same way.' : 'Your prediction is outside that range, so luck alone is unlikely to explain the gap. Your picture of how this build-up behaves was off, and the findings below may show where.') + '</p></div>' + go('range', 'Giving a share a range');
    }
    // why it went wrong
    const ex = FM.lab.explain(r, {}), w = r.why, lostN = r.lost.k;
    h += '<h4>What went wrong</h4>';
    if (!w) h += '<p>This run was saved before I could break the losses down. Run it again and I will explain what went wrong.</p>';
    else if (!lostN) h += '<p>You kept the ball in every test, so there are no losses to explain. A failure that happens one time in fifty will not show up in a run of 20, so a harder opponent or more tests may show some.</p>';
    else if (!ex.findings.length) h += '<p>You lost it in ' + lostN + ' of ' + r.n + ' tests. That is too few to find a pattern: with so few losses, one or two unlucky tests can look like a reason. Run it with more tests and the pattern will appear or fade.</p>';
    else h += '<p>Here is why the ' + lostN + ' build-ups went wrong. Each reason comes from those ' + lostN + ' tests, so the numbers can differ from one run to the next.</p>' + ex.findings.map((f) => '<div class="el-box"><p><b>' + esc(f.title) + '</b></p><p>' + esc(f.body) + '</p>' + (f.example ? '<p><b>What that looks like in a match:</b> ' + esc(f.example) + '</p>' : '') + '<p class="el-try"><b>What you could try:</b> ' + esc(f.fix) + '</p></div>').join('');
    // how sure
    const half = Math.round(98 / Math.sqrt(r.n));
    h += '<h4>How sure the number is</h4><p>With ' + r.n + ' tests the range on a share near 50% is about ' + half + ' points either way. To halve it you would need four times as many tests.</p>' + (r.time ? '<p>When the ball did reach halfway it took ' + r.time.mean.toFixed(1) + ' s on average (standard deviation ' + r.time.sd.toFixed(1) + ' s over ' + r.time.n + ' tests). The standard deviation is how far a typical test sits from that average.</p>' : '');
    // the comparison
    if (n >= 2 && c.a !== c.b && runs[c.a] && runs[c.b]) {
      const A = runs[c.a].result, B = runs[c.b].result, cb = FM.lab.compare(A, B, 'beat'), sig = cb.p < 0.05;
      h += '<h4>Is the difference real?</h4><div class="el-box"><p>Between run ' + (c.a + 1) + ' and run ' + (c.b + 1) + ', beating the press moved by <b>' + (cb.diff >= 0 ? '+' : '') + Math.round(cb.diff * 100) + ' points</b>. The 95% interval for that difference is ' + Math.round(cb.lo * 100) + ' to ' + Math.round(cb.hi * 100) + ', and the p-value is <b>' + cb.p.toFixed(3) + '</b>.</p>' +
        '<p>' + (cb.lo < 0 && cb.hi > 0 ? 'The interval runs from below zero to above it, so "no difference at all" is one of the plausible answers. ' : 'The interval does not include zero. ') +
        'If the two set-ups were really the same, luck alone would give a gap this big in about ' + Math.round(cb.p * 100) + '% of pairs of runs. ' + (sig ? 'That is below the 5% line, so this is evidence of a real difference. Check that you changed one thing only, and that the change makes football sense.' : 'That is not below the 5% line, so these runs do not show a real difference. That is not the same as showing there is none.' + (cb.need ? ' If the gap is real and this size, about ' + cb.need + ' tests of each set-up would show it reliably.' : '')) + '</p></div>' +
        go('real', 'Is the difference real?') + go('level', 'How small must the p-value be?') + go('matters', 'Significant is not the same as important') +
        '<p style="margin-top:10px">You can compare four measures in that table. The more of them you look at, the likelier it is that one crosses the line by luck, so decide which one you are testing before you look.</p>';
    } else if (n >= 2) h += '<h4>Is the difference real?</h4><p>Choose two different runs under "Is the difference real?" on the page and I will tell you what the comparison shows.</p>';
    else h += '<p>Pick one of those ideas, change only that on the board or the sliders, and write what you expect to happen. Then run it again and we can ask whether the difference is real.</p>';
    h += '<p>Write your hypothesis in the box above the Run button: what you will change, and what you think will happen because of it.</p>';
    return h;
  }
  // ---------- the lessons, one step at a time ----------
  function lessonList() {
    const done = loadDone();
    return '<p>Each lesson starts with a question about a coach called Dani. Work out the answer first and I will explain it after.</p>' + LESSONS.map((L, i) => '<button type="button" class="el-go" data-lesson="' + L.id + '">' + (i + 1) + '. ' + esc(L.title) + (done[L.id] ? '<span class="el-tick">✓ done</span>' : '') + '</button>').join('');
  }
  function lessonStep() {
    const L = LESSONS.find((x) => x.id === E.lesson), s = L.steps[E.step], S = E.state;
    let h = '<button type="button" class="el-go" data-back="1" style="width:auto;display:inline-block;margin:0 0 10px">← All lessons</button><div class="el-progress">' + esc(L.title) + ' · question ' + (E.step + 1) + ' of ' + L.steps.length + (s.final ? ' · on your own' : '') + '</div>';
    h += s.say.map((l) => '<p>' + rich(l) + '</p>').join('') + '<p class="el-q">' + rich(s.q) + '</p>';
    if (s.options) h += s.options.map((o, i) => '<button type="button" class="el-go el-opt' + (S.right && o.ok ? ' right' : '') + (S.wrong.includes(i) ? ' wrong' : '') + '" data-opt="' + i + '"' + (S.right ? ' disabled' : '') + '>' + rich(o.t) + '</button>').join('');
    else h += '<div class="el-num"><input type="number" id="elNum" aria-label="Your answer"' + (S.right ? ' disabled value="' + s.num.answer + '"' : '') + '><button type="button" class="el-go primary" data-check="1"' + (S.right ? ' disabled' : '') + '>Check</button></div>' + (s.num.unit ? '<div class="el-progress">Answer in' + esc(s.num.unit) + '</div>' : '');
    if (S.hint) h += '<p class="el-hint">' + esc(S.hint) + '</p>';
    if (S.right) {
      h += '<div class="el-box">' + s.why.map((l) => '<p>' + rich(l) + '</p>').join('') + (s.name ? s.name.map((l) => '<p>' + rich(l) + '</p>').join('') : '') + '</div>';
      if (s.matters) h += '<div class="el-box"><p><b>Why this matters</b></p>' + s.matters.map((l) => '<p>' + rich(l) + '</p>').join('') + '</div>';
      h += '<button type="button" class="el-go primary" data-next="1">' + (E.step === L.steps.length - 1 ? 'Finish lesson' : 'Next question') + '</button>';
    }
    return h;
  }
  function body() {
    if (E.tab === 'lessons') return E.lesson ? lessonStep() : lessonList();
    const c = E.ctx; return c.runs.length ? reading(c) : intro(c.opp);
  }
  function paint() {
    if (!E.el) return;
    const b = E.el.querySelector('.el-body'), keep = null, top = b.scrollTop;
    b.innerHTML = body();
    E.el.querySelectorAll('.el-tabs button').forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.t === E.tab)));
    b.scrollTop = top;
    const who = E.el.querySelector('.el-head img'); if (who) who.src = E.tab === 'lessons' ? IMG.think : (E.ctx.runs.length ? IMG.point : IMG.hello);
  }
  function openLesson(id) { E.tab = 'lessons'; E.lesson = id; E.step = 0; E.state = { right: false, wrong: [], hint: '' }; if (!E.open) setOpen(true); else paint(); const b = E.el && E.el.querySelector('.el-body'); if (b) b.scrollTop = 0; }
  function setOpen(on) {
    E.open = on; document.body.classList.toggle('el-open', on);
    if (E.btn) { E.btn.classList.toggle('open', on); E.btn.setAttribute('aria-expanded', String(on)); }
    if (E.el) { E.el.remove(); E.el = null; }
    if (!on) return;
    const el = document.createElement('aside'); el.className = 'el-panel'; el.setAttribute('aria-label', 'Elena Marsh, performance analyst');
    el.innerHTML = '<div class="el-head"><img alt="" src="' + IMG.hello + '"><div><b>Elena Marsh</b><small>Performance analyst</small></div><button type="button" class="x" aria-label="Close Elena">×</button></div><div class="el-tabs"><button type="button" data-t="read">My reading</button><button type="button" data-t="lessons">Lessons</button></div><div class="el-body"></div>';
    document.body.appendChild(el); E.el = el;
    el.addEventListener('click', (e) => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.classList.contains('x')) return setOpen(false);
      if (t.dataset.t) { E.tab = t.dataset.t; if (E.tab === 'lessons') E.lesson = null; return paint(); }
      if (t.dataset.lesson) return openLesson(t.dataset.lesson);
      if (t.dataset.back) { E.lesson = null; return paint(); }
      const L = E.lesson && LESSONS.find((x) => x.id === E.lesson), s = L && L.steps[E.step];
      if (t.dataset.opt != null && s) { const i = +t.dataset.opt, o = s.options[i]; if (o.ok) E.state.right = true; else { if (!E.state.wrong.includes(i)) E.state.wrong.push(i); E.state.hint = o.hint || 'Not quite. Read the question again.'; } if (E.state.right) E.state.hint = ''; return paint(); }
      if (t.dataset.check && s) { const v = parseFloat((el.querySelector('#elNum') || {}).value); if (isNaN(v)) { E.state.hint = 'Type a number first.'; return paint(); } if (Math.abs(v - s.num.answer) <= (s.num.tol || 0)) { E.state.right = true; E.state.hint = ''; } else E.state.hint = 'Not quite. Look at the numbers in the question again.'; return paint(); }
      if (t.dataset.next && L) { if (E.step === L.steps.length - 1) { const d = loadDone(); d[L.id] = true; saveDone(d); E.lesson = null; } else { E.step++; E.state = { right: false, wrong: [], hint: '' }; } paint(); const b = el.querySelector('.el-body'); if (b) b.scrollTop = 0; }
    });
    paint();
  }
  // ctx: { opp, runs, a, b, st }. Called every time the lab is drawn.
  FM.elena = {
    lessons: LESSONS,
    sync(ctx) {
      css(); const fresh = !E.ctx || E.ctx.runs.length !== ctx.runs.length; E.ctx = ctx;
      if (!E.btn || !E.btn.isConnected) {
        E.btn = document.createElement('button'); E.btn.type = 'button'; E.btn.className = 'el-tab'; E.btn.setAttribute('aria-expanded', 'false'); E.btn.setAttribute('aria-label', 'Open Elena Marsh, performance analyst');
        E.btn.innerHTML = '<img alt="" src="' + IMG.hello + '"><span>ELENA</span><i class="dot"></i>';
        E.btn.addEventListener('click', () => setOpen(!E.open)); document.body.appendChild(E.btn);
        clearInterval(E.watch); E.watch = setInterval(() => { if (!document.querySelector('.lab')) FM.elena.hide(); }, 700);
      }
      if (E.open == null) setOpen(true);                         // the first time, she is there to introduce herself
      else if (E.open) { if (fresh && E.tab === 'lessons' && !E.lesson) E.tab = 'read'; paint(); if (fresh && E.tab !== 'lessons') { const b = E.el && E.el.querySelector('.el-body'); if (b) b.scrollTop = 0; } }
      else if (fresh) E.btn.querySelector('.dot').style.display = '';
    },
    hide() { clearInterval(E.watch); if (E.el) E.el.remove(); if (E.btn) E.btn.remove(); E.el = E.btn = null; document.body.classList.remove('el-open'); },
  };
})();
