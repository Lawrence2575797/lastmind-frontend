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
      { say: ['You test a set-up 100 times. It reaches halfway in 58 of them.', 'It is tempting to call 58% the true success rate.'],
        q: 'Using the last lesson, what is wrong with that?',
        options: [{ t: 'Nothing, 58% is what was measured', hint: 'Measured in these 100 tests. Would the next 100 agree exactly?' }, { t: 'Another 100 tests would probably give a different number, so 58% is a best guess and not the truth', ok: true }, { t: 'Round it to 60% instead', hint: 'Rounding does not deal with luck.' }],
        why: ['58% describes these 100 tests. It estimates the true share, and the estimate will wobble a little each time you repeat the experiment.', 'So what we want to report is a best guess plus how far it could plausibly be out.'] },
      { say: ['Here is how far out the estimate could plausibly be, for different numbers of tests:', '100 tests: about 10 points either way.', '400 tests: about 5 points either way.', '1600 tests: about 2.5 points either way.'],
        q: 'Following the pattern, how many tests would bring it down to about 1.25 points either way?',
        num: { answer: 6400, tol: 0, unit: ' tests' },
        why: ['Each time the range halves, the tests needed multiply by four: 100, 400, 1600, 6400.', 'So accuracy gets expensive. Twice as precise costs four times the tests, and ten times as precise costs a hundred times the tests.'],
        matters: ['This is why a national opinion poll of about a thousand people is accurate to about three points, and why polls rarely bother with ten times that to get one.'] },
      { say: ['The range around a share, built to be wrong only about 1 time in 20, has a name.'],
        q: 'You predicted 70% would reach halfway. The test gives 58%, with a range of 48% to 67%. What does that tell you?',
        options: [{ t: 'The prediction was outside the range, so luck alone is unlikely to explain the gap', ok: true }, { t: 'The prediction was wrong by 12 points, which is a lot but could easily be luck', hint: 'The range already includes how far luck could move the share.' }, { t: 'Nothing, because 58% is below 70%', hint: 'Compare 70% with the range, not just with 58%.' }],
        why: ['The range shows where the true share plausibly lies. Since 70% sits outside it, this build-up is probably weaker than you pictured.', 'That is worth knowing. A prediction can be wrong and still lead you to a better decision.'],
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
      { final: true, say: ['You see p = 0.07 and think: "If I use 0.10 as my line, it counts."'],
        q: 'What is wrong with choosing the line after seeing the result?',
        options: [{ t: 'Nothing, 0.10 is a perfectly good level', hint: 'The level itself is not the problem. When it was chosen is.' }, { t: 'You could move the line until any result passes, so the line has to be set before looking', ok: true }, { t: 'A p-value can never be above 0.05', hint: 'It can be anything from 0 to 1.' }, { t: 'Always use 0.01 instead', hint: 'There is no one level that is right for everything.' }],
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
      '.rp-pitch { display: block; width: 100%; height: auto; border-radius: 10px; background: #2A7539; } .rp-bar { display: flex; gap: 8px; align-items: center; margin-top: 8px; } .rp-bar .el-go { width: auto; margin: 0; flex: none; padding: 7px 14px; } .rp-seek { flex: 1; min-width: 0; } .rp-speed { flex: none; padding: 6px; border-radius: 8px; border: 1px solid rgba(241,234,214,.35); background: rgba(255,255,255,.07); color: inherit; }',
      '.rp-key { display: flex; flex-wrap: wrap; gap: 4px 12px; margin: 8px 0; font-size: .76rem; opacity: .85; } .rp-k { display: inline-block; width: 14px; height: 0; margin-right: 4px; vertical-align: middle; border-top: 3px solid #FFE27A; } .rp-k.no { border-top: 3px dashed #FF5A36; } .rp-k.job { border-top: 2.5px dashed #FF9F43; } .rp-k.free { width: 12px; height: 12px; border: 2px dashed #7fd49a; border-radius: 50%; }',
      '.rp-say p { margin: 0 0 8px; padding: 8px 10px; border-radius: 8px; background: rgba(255,255,255,.07); font-size: .86rem; } .rp-pick { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; } .rp-pick .el-go { width: auto; margin: 0; }',
      '.el-row { display: grid; grid-template-columns: 1fr auto; gap: 2px 10px; padding: 8px 0; border-bottom: 1px solid rgba(241,234,214,.12); } .el-rl small, .el-rv small { display: block; opacity: .7; font-size: .76rem; } .el-rv { text-align: right; } .el-rv b { font-size: 1.05rem; } .el-row .el-bar { grid-column: 1 / -1; }',
      '.el-bar { position: relative; height: 10px; border-radius: 5px; background: rgba(241,234,214,.12); } .el-bar i { position: absolute; top: 0; bottom: 0; border-radius: 5px; background: #F2C14E; opacity: .85; } .el-bar b { position: absolute; top: -2px; bottom: -2px; width: 2px; background: #F1EAD6; }',
      '.el-small { font-size: .8rem; opacity: .8; } .el-cmp { display: grid; gap: 8px; margin: 6px 0 10px; } .el-cmp label { display: grid; gap: 4px; font-size: .8rem; opacity: .9; } .el-cmp select { padding: 8px; border-radius: 8px; border: 1px solid rgba(241,234,214,.35); background: rgba(255,255,255,.07); color: inherit; font: inherit; }',
      '.el-tbl { width: 100%; border-collapse: collapse; font-size: .8rem; margin: 6px 0 10px; } .el-tbl th, .el-tbl td { padding: 6px 4px; text-align: left; border-bottom: 1px solid rgba(241,234,214,.12); } .el-tbl th { font-size: .7rem; letter-spacing: .05em; text-transform: uppercase; opacity: .7; } .el-tbl td small { display: block; opacity: .65; }',
      '.iv-pitch { display: block; width: 100%; max-width: 360px; margin: 6px auto; height: auto; border-radius: 10px; } .iv-chips { display: flex; flex-wrap: wrap; gap: 6px; } .iv-chips .el-go { width: auto; margin: 0; padding: 7px 12px; }',
      '.iv-key { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: .74rem; opacity: .85; margin: 4px 0 8px; } .iv-key .k { display: inline-block; width: 16px; height: 0; margin-right: 4px; vertical-align: middle; border-top: 3px solid #F2C14E; } .iv-key .k.g { border-color: #7fd49a; } .iv-key .k.r { border-top: 3px dashed #ff7a5c; } .iv-key .k.o { border-top: 3px dashed #FF9F43; } .iv-key .k.p { border-top: 3px dotted #c8a2ff; }',
      '.iv-lines { margin: 0 0 10px; padding-left: 18px; font-size: .86rem; } .iv-lines li { margin-bottom: 4px; }',
      '.el-term { border: 0; border-bottom: 1px dotted #F2C14E; background: transparent; color: #F2C14E; font: inherit; padding: 0; cursor: pointer; } .el-term i { margin-left: 3px; padding: 0 4px; font-size: .68em; font-style: normal; border: 1px solid currentColor; border-radius: 50%; opacity: .85; vertical-align: 2px; }',
      '.el-defbox { margin: 4px 0 12px; padding: 9px 12px; border-left: 3px solid #F2C14E; border-radius: 0 8px 8px 0; background: rgba(242,193,78,.1); font-size: .85rem; line-height: 1.5; } .el-link { border: 0; background: transparent; color: #F2C14E; font: inherit; text-decoration: underline; cursor: pointer; padding: 0 4px; }',
      '.el-big { font-size: 1.02rem; line-height: 1.5; } .el-rows { margin: 4px 0; } .el-more { margin: 6px 0; font-size: .86rem; } .el-more summary { cursor: pointer; opacity: .85; }',
      'body.el-open { padding-right: min(456px, 100vw); } @media (max-width: 1000px) { body.el-open { padding-right: 16px; } }',
    ].join('\n');
    document.head.appendChild(e);
  }

  // ---------- the little ? buttons: concepts are explained next to the word, on request, not taught in the middle of what she says ----------
  const TERMS = {
    sample: ['sampling variation', 'Two sets of tests never come out the same, even with nothing changed, because luck moves a few passes each time. That wobble is sampling variation.', 'chance'],
    interval: ['95% interval', 'The range the true share most likely sits in. Run it again and you would land somewhere else inside it, which is why one number on its own would overpromise. Wider means less sure; four times the tests halves it.', 'range'],
    pvalue: ['p-value', 'How often luck alone would give a gap this big if nothing had really changed. Small means "probably not luck". It is not the chance that you are right.', 'real'],
    free: ['free man', 'A team-mate with nobody close to him. A pass to him is the one the press cannot cut out.', null],
    press: ['press', 'Players closing the ball down quickly, to win it back high up the pitch before the other side settles.', null],
    sitoff: ['sit off', 'The opposite of pressing: keep a compact shape, shut the middle of the pitch and the lanes to the full-backs, and let the other side have the ball in their own half.', null],
    lane: ['lane', 'The line between the passer and the receiver. If a defender is stood on it, the pass is much harder to complete.', null],
    chain: ['pass chain', 'A build-up is several passes in a row and every one has to work. Nine in ten, eight times over, is only 43%.', null],
    midblock: ['mid-block', 'A defence that waits around the halfway line in a tight shape, not chasing the ball but closing the middle.', null],
    overload: ['overload', 'More of your players than theirs in one area, so someone is always free.', null],
    shadow: ['cover shadow', 'The space behind a defender that he hides from the ball by standing in the passing line.', null],
  };
  const TERM_RE = [['pvalue', /p-value/i], ['interval', /95% interval|\binterval\b/i], ['sample', /sampling variation/i], ['free', /free man|unmarked player/i], ['sitoff', /sit(?:s|ting)? off/i], ['midblock', /mid-block/i], ['shadow', /cover shadow/i], ['overload', /overload/i], ['chain', /pass chain|string of passes/i], ['lane', /\blanes?\b/i], ['press', /\bpress(?:ing|es)?\b/i]];
  const T = (id, label) => '<button type="button" class="el-term" data-term="' + id + '">' + esc(label || TERMS[id][0]) + '<i>?</i></button>';
  // Puts a ? button on the first use of each concept in a piece of already-escaped text (never inside a tag or an existing button).
  function termify(html, used) {
    used = used || {};
    let inBtn = false;
    return html.split(/(<[^>]+>)/).map((seg) => {
      if (seg.charAt(0) === '<') { if (/^<button/i.test(seg)) inBtn = true; else if (/^<\/button/i.test(seg)) inBtn = false; return seg; }
      if (inBtn) return seg;
      TERM_RE.forEach(([id, re]) => { if (used[id]) return; seg = seg.replace(re, (m) => { used[id] = 1; return T(id, m); }); });
      return seg;
    }).join('');
  }
  const P = (text, used) => termify(esc(text), used);

  // ---------- what she says about the run on screen ----------
  const go = (id, label) => '<button type="button" class="el-go" data-lesson="' + id + '">Lesson: ' + esc(label) + '</button>';
  const WORD = () => FM.lab.words, PLU = () => FM.lab.plural;
  const nm = (p) => { try { return FM.shortName(p); } catch (e) { return p.name; } };
  const level = (x) => (x < 0.35 ? 'lightly' : x < 0.6 ? 'fairly hard' : 'very hard');
  const list = (a) => (a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
  const sur = (p) => nm(p);
  // Before any test: what their press would do to the way you have set up, and where your spare man is.
  function setupText(c) {
    if (!c.team) return '';
    let s; try { s = FM.lab.setup(c.team, c.opp, c.tac); } catch (e) { return ''; }
    const tac = c.tac || c.opp.tactics, pb = tac.pressBuildUp == null ? 0.4 : tac.pressBuildUp;
    const used = {};
    let h = '<h4>How they might come at you</h4>';
    h += '<p>' + P(c.opp.name + ' press your build-up ' + level(pb) + '. If they stick to their jobs, ' + sur(s.chaser) + ' goes to the ball' + (s.pairs.length ? ', ' + list(s.pairs.slice(0, 3).map((x) => sur(x.def) + ' picks up ' + sur(x.att))) : '') + '.', used) + '</p>';
    const B = s.back.length, K = s.backPressers.length;
    if (s.freeAtt.length) h += '<p>' + P('That leaves ' + list(s.freeAtt.slice(0, 4).map(sur)) + ' as a free man. In your own third it is ' + B + ' of yours against ' + K + ' of theirs' + (B > K ? ', so you should have ' + (B - K === 1 ? 'a spare one' : (B - K) + ' spare') + '.' : '.'), used) + '</p>';
    const live = (c.team.rules || []).filter((r) => !r.off && (!r.when || !r.when.stage || r.when.stage.indexOf('build') >= 0));
    if (live.length) h += '<p class="el-small">Your build-up instructions: ' + live.map((r) => esc(FM.rulesText(r))).join(' ') + '</p>';
    h += '<p class="el-small">Players do not always do what they are told, so each test draws it again.</p>';
    return h;
  }
  // After a run: what the tests did with that plan, in a couple of lines.
  function pressText(r, c) {
    const p = r.press; if (!p || !p.n) return '';
    const used = {}, nF = p.toFree, nM = p.toMarked;
    let h = '<h4>The free man</h4>';
    h += '<p>' + P('You went short with the first pass ' + pc(p.shortFirst / p.n) + ' of the time' + (p.freeSeen + p.noFree ? ', and a free man was there in ' + pc(p.freeSeen / (p.freeSeen + p.noFree)) + ' of the tests.' : '.'), used) + '</p>';
    if (nF + nM >= 10) {
      const rf = nF ? p.beatFree / nF : 0, rm = nM ? p.beatMarked / nM : 0;
      let s = 'When you found him, ' + pc(rf) + ' got out (' + p.beatFree + ' of ' + nF + '). When you passed to a marked player, ' + pc(rm) + ' did (' + p.beatMarked + ' of ' + nM + ').';
      let sig = '';
      if (nF >= 8 && nM >= 8) {
        const mk = (k, n) => ({ n, f: { k, p: k / n } }), cm = FM.lab.compare(mk(p.beatFree, nF), mk(p.beatMarked, nM), 'f');
        sig = cm.p < 0.05 ? ' That gap is real: the p-value is ' + cm.p.toFixed(3) + '. The free man helps.' : ' But with this few tests that could just be luck (p-value ' + cm.p.toFixed(2) + ').';
      }
      h += '<p>' + P(s + sig, used) + '</p>';
    }
    return h;
  }
  // The replays: tests from this run, kept as they happened, drawn with arrows.
  function replayText(r) {
    if (!r.clips || !r.clips.length) return '';
    if (!E.clipKey || !r.clips.find((x) => x.key === E.clipKey)) E.clipKey = r.clips[0].key;
    return '<h4>Watch it happen</h4><div class="rp-pick">' + r.clips.map((x) => '<button type="button" class="el-go' + (x.key === E.clipKey ? ' primary' : '') + '" data-clip="' + x.key + '">' + esc(x.label) + '</button>').join('') + '</div><div id="elReplay" class="rp"></div>';
  }
  const OUT_ROWS = [['beat', 'Got out clean', 'Reached halfway with the ball'], ['lostNear', 'Lost it near your goal', 'Within 25 m'], ['lostOwn', 'Lost it in your third', 'Out to the edge of it'], ['lostMid', 'Lost it in midfield', 'Before halfway'], ['still', 'Still going at 40 s', 'Neither won nor lost'], ['shot', 'They had a shot', 'Within 15 s of winning it']];
  const bar = (v) => '<div class="el-bar"><i style="left:' + (v.lo * 100).toFixed(1) + '%;width:' + Math.max(1, (v.hi - v.lo) * 100).toFixed(1) + '%"></i><b style="left:' + (v.p * 100).toFixed(1) + '%"></b></div>';
  function resultsText(r, last, n) {
    const p = r.beat.p, used = {};
    const say = p >= 0.75 ? 'Lovely. ' : p >= 0.55 ? 'Not bad. ' : p >= 0.4 ? 'Hmm, that is close to a coin flip. ' : 'Ouch. ';
    let h = '<p class="el-big">' + esc(say) + r.beat.k + ' out of ' + r.n + ' got out clean' + (r.time ? ', in ' + r.time.mean.toFixed(1) + ' seconds on average' : '') + '.</p>';
    if (last.pred !== '' && last.pred != null) {
      const v = r.beat, q = last.pred / 100, ok = q >= v.lo && q <= v.hi;
      h += '<p>' + P(ok ? 'You said ' + last.pred + '%. That is inside the 95% interval (' + pc(v.lo) + ' to ' + pc(v.hi) + '), so I cannot say you were wrong.' : 'You said ' + last.pred + '%. We found ' + pc(v.p) + ', and that is outside the 95% interval (' + pc(v.lo) + ' to ' + pc(v.hi) + '). Your picture of this build-up was off, and the reasons are just below.', used) + '</p>';
    }
    h += '<div class="el-rows">' + OUT_ROWS.map(([k, l, note]) => { const v = r[k]; return '<div class="el-row"><div class="el-rl"><b>' + esc(l) + '</b><small>' + esc(note) + '</small></div><div class="el-rv"><b>' + pc(v.p) + '</b><small>' + v.k + ' of ' + r.n + '</small></div>' + bar(v) + '</div>'; }).join('') + '</div>';
    h += '<p class="el-small">' + P('The bar is the 95% interval, and the white line is the share we found.', used) + '</p>';
    if (last.hyp) h += '<p><b>You said:</b> ' + esc(last.hyp) + '</p>';
    return h;
  }
  function compareTable(A, B, a, b) {
    const rows = [['beat', 'Got out clean'], ['lost', 'Lost it'], ['lostNear', 'Lost it near your goal'], ['shot', 'They had a shot']];
    return '<table class="el-tbl"><tr><th></th><th>Run ' + (a + 1) + '</th><th>Run ' + (b + 1) + '</th><th>Change</th><th>p</th></tr>' + rows.map(([k, l]) => { const c2 = FM.lab.compare(A, B, k); return '<tr><td>' + l + '</td><td>' + pc(A[k].p) + '</td><td>' + pc(B[k].p) + '</td><td><b>' + (c2.diff >= 0 ? '+' : '') + Math.round(c2.diff * 100) + '</b><small>' + Math.round(c2.lo * 100) + ' to ' + Math.round(c2.hi * 100) + '</small></td><td>' + (c2.p < 0.001 ? '&lt; 0.001' : c2.p.toFixed(3)) + '</td></tr>'; }).join('') + '</table>';
  }
  // How they set up the press against you, as it showed in the tests. Only what can be seen on the pitch: where they stood, who went to whom, and
  // how you did against each way of pressing. Their manager's reasons, and his instructions, are never shown: you would not know them in real life.
  const KIND_TEXT = { high: ['pressed high', 'their forwards up on your back line'], mid: ['sat in a mid-block', 'a compact shape around the halfway line'], low: ['dropped right off', 'deep in their own half'] };
  function pressShapeText(r) {
    const p = r.press; if (!p || !p.shapeN) return '';
    const used = {}, N = p.shapeN, sh = p.shape, W = WORD();
    const order = ['high', 'mid', 'low'].filter((k) => sh[k].n > 0).sort((a, b) => sh[b].n - sh[a].n);
    let h = '<h4>How they pressed you</h4>';
    h += '<p>' + P('They ' + order.map((k, i) => KIND_TEXT[k][0] + ' in ' + pc(sh[k].n / N) + ' of the tests' + (i === 0 ? ' (' + KIND_TEXT[k][1] + ')' : '')).join(', ' ).replace(/, ([^,]*)$/, ' and $1') + '.', used) + '</p>';
    h += '<p>' + P('When you first played it, ' + (p.nearSum / N).toFixed(1) + ' of their players were within 25 m of the ball and the nearest was ' + (p.nearestSum / N).toFixed(1) + ' m away. Their last defender stood ' + Math.round(p.lastSum / N) + ' m from your goal.', used) + '</p>';
    const jobs = Object.keys(p.jobs).map((k) => ({ k, n: p.jobs[k] })).filter((x) => x.n >= p.n * 0.3).sort((a, b) => b.n - a.n).slice(0, 2);
    if (jobs.length) h += '<p>' + P('Who went to whom: ' + jobs.map((x) => { const a = x.k.split('>'); return 'a ' + W[a[0]] + ' went to your ' + W[a[1]] + ' in ' + pc(x.n / p.n) + ' of the tests'; }).join(', and ') + '.', used) + '</p>';
    const seen = order.filter((k) => sh[k].n >= 8);
    if (seen.length >= 2) {
      const rates = seen.map((k) => KIND_TEXT[k][0].replace('pressed', 'the high press').replace('sat in a', 'the').replace('dropped right off', 'them dropping off') + ': ' + pc(sh[k].beat / sh[k].n)).join('; ');
      const mk = (k) => ({ n: sh[k].n, f: { k: sh[k].beat, p: sh[k].beat / sh[k].n } }), cm = FM.lab.compare(mk(seen[0]), mk(seen[1]), 'f');
      h += '<p>' + P('How often you got out against each: ' + rates + '. ' + (cm.p < 0.05 ? 'That difference is real (p-value ' + cm.p.toFixed(3) + ').' : 'But the p-value is ' + cm.p.toFixed(2) + ', so that could be luck.'), used) + '</p>';
    }
    return h;
  }
  function intro(c) {
    const used = {};
    return '<p class="el-big">Hi, I am Elena. Let us find out how your build-up really does.</p>' +
      '<p>' + P('One try tells us nothing: a pass comes off or it does not, a defender steps up or he does not. So we play the same set-up 100 times and count. That is how we get past sampling variation.', used) + '</p>' +
      setupText(c) +
      '<p><b>Before you press Run, have a guess:</b> out of 100 tries against ' + esc(c.opp.name) + ', how many get out of your half with the ball?</p>';
  }
  function reading(c) {
    const runs = c.runs, last = runs[runs.length - 1], r = last.result, n = runs.length, used = {};
    let h = resultsText(r, last, n);
    // what went wrong: three things at most, each a sentence and something to try
    const ex = FM.lab.explain(r, {}), w = r.why, lostN = r.lost.k;
    if (!w) h += '<p>This run was saved before I could break the losses down. Run it again and I will tell you what happened.</p>';
    else if (!lostN) h += '<p>You kept it every time. A failure that happens one in fifty will not show in a run of 20, so a harder opponent or more tests might find some.</p>';
    else if (!ex.findings.length) h += '<p>You only lost it ' + lostN + ' times, which is too few for me to see a pattern. A couple of unlucky tests can look like a reason. Run more and it will show or fade.</p>';
    else h += '<h4>What I saw</h4>' + ex.findings.slice(0, 3).map((f) => '<div class="el-box"><p><b>' + esc(f.title) + '.</b> ' + P(f.body, used) + '</p><p class="el-try">Try: ' + P(f.fix, used) + '</p></div>').join('');
    h += pressShapeText(r) + pressText(r, c) + replayText(r);
    // the comparison
    if (n >= 2) h += '<h4>Has anything really changed?</h4><div class="el-cmp"><label>Run<select id="elA">' + runs.map((x, i) => '<option value="' + i + '"' + (i === c.a ? ' selected' : '') + '>Run ' + (i + 1) + ': ' + pc(x.result.beat.p) + ' got out</option>').join('') + '</select></label><label>against<select id="elB">' + runs.map((x, i) => '<option value="' + i + '"' + (i === c.b ? ' selected' : '') + '>Run ' + (i + 1) + ': ' + pc(x.result.beat.p) + ' got out</option>').join('') + '</select></label></div>';
    if (n >= 2 && c.a !== c.b && runs[c.a] && runs[c.b]) {
      const A = runs[c.a].result, B = runs[c.b].result, cb = FM.lab.compare(A, B, 'beat'), sig = cb.p < 0.05, d = Math.round(cb.diff * 100), u2 = {};
      h += compareTable(A, B, c.a, c.b) + '<p>' + P((d === 0 ? 'No movement at all between them. ' : 'Run ' + (c.b + 1) + ' is ' + Math.abs(d) + ' points ' + (d > 0 ? 'better' : 'worse') + '. ') + (sig ? 'And that is real: the p-value is ' + cb.p.toFixed(3) + ', so luck alone would rarely do that.' : 'But I would not read much into it: the p-value is ' + cb.p.toFixed(2) + ', and luck alone does that about ' + Math.round(cb.p * 100) + '% of the time.' + (cb.need ? ' You would want about ' + cb.need + ' tests of each to be sure.' : '')), u2) + '</p>' + go('real', 'Is the difference real?');
    } else if (n >= 2) h += '<p>Pick two different runs and I will tell you what changed.</p>';
    else h += '<p>Next: change one thing, say what you expect in the box above Run, and run it again. Then we can see if it made a difference.</p>';
    h += '<p class="el-small">' + runs.map((x, i) => 'Run ' + (i + 1) + ': ' + pc(x.result.beat.p)).join(' · ') + '</p><button type="button" class="el-go" data-clear="1">Clear the runs</button>';
    return h;
  }
  // ---------- the lessons, one step at a time ----------
  function lessonList() {
    const done = loadDone();
    return '<p>Each one starts with a question about a coach called Dani. Have a proper go before I say anything: you will remember it better.</p>' + LESSONS.map((L, i) => '<button type="button" class="el-go" data-lesson="' + L.id + '">' + (i + 1) + '. ' + esc(L.title) + (done[L.id] ? '<span class="el-tick">✓ done</span>' : '') + '</button>').join('');
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
  // ---------- the instructions: what they do, drawn, and what Elena honestly thinks ----------
  const hashOf = (t) => { let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
  const liveRules = (team) => (team.rules || []).filter((r) => !r.off);
  // Only what applies in this stage (an instruction with no stage applies in all of them).
  const forStage = (team, stage) => liveRules(team).filter((r) => !r.when || !r.when.stage || r.when.stage.indexOf(stage) >= 0);
  const ruleLines = (team, stage) => forStage(team, stage).map((r) => FM.rulesWho(r) + ': ' + FM.rulesText(r));
  const STAGE_WORD = { build: 'the build-up', final: 'the final third', transAtt: 'winning the ball', transDef: 'losing the ball', press: 'pressing them', without: 'defending' };
  function instrReading(c) {
    const team = c.team, stage = c.stage || 'build', live = forStage(team, stage), name = STAGE_WORD[stage] || stage;
    if (!live.length) return '<p class="el-big">Nothing written for ' + esc(name) + ' yet.</p><p>Tell the team what you want in the box. I will draw it on the pitch, and then I will tell you honestly what I think of it.</p><p class="el-small">Whatever you write here also plays out in the lab.</p>';
    const viz = FM.instrViz.draw(team, c.opp, stage);
    let h = '<h4>What it does in ' + esc(name) + '</h4>' + viz.svg +
      '<div class="iv-key"><span><i class="k a"></i> moves here instead</span><span><i class="k g"></i> pass he looks for</span><span><i class="k r"></i> pass he avoids</span><span><i class="k o"></i> follows</span><span><i class="k p"></i> draws in</span></div>';
    h += viz.lines.length ? '<ul class="iv-lines">' + viz.lines.slice(0, 5).map((l) => '<li>' + esc(l) + '</li>').join('') + '</ul>' : '<p class="el-small">In this stage nobody ends up anywhere different from where he would have stood, so there is nothing to draw. My notes below still count.</p>';
    const key = hashOf(stage + '|' + ruleLines(team, stage).join('|') + '|' + (c.opp ? c.opp.name : '')), rv = E.review && E.review.key === key ? E.review : null;
    h += '<h4>What I think</h4>';
    if (rv && rv.busy) h += '<p>Hang on, I am reading through it…</p>';
    else if (rv && rv.err) h += '<p class="el-hint">' + esc(rv.err) + '</p><button type="button" class="el-go" data-review="1">Try again</button>';
    else if (rv && rv.data) {
      const d = rv.data, used = {}, uses = [];
      h += '<p class="el-big">' + P(d.summary, used) + '</p>';
      h += d.concerns.map((x) => '<div class="el-box"><p><b>' + P(x.title, used) + '.</b> ' + P(x.why, used) + '</p>' + (x.fix ? '<p class="el-try">Try: ' + P(x.fix, used) + '</p>' : '') + '</div>').join('');
      if (!d.concerns.length) h += '<p class="el-small">I could not find anything in it that worries me. Test it in the lab and let the numbers decide.</p>';
      if (d.ifOpposite && d.ifOpposite.what) { if (d.ifOpposite.instruction) uses.push(d.ifOpposite.instruction); h += '<div class="el-box"><p><b>And if they do the opposite?</b> ' + P(d.ifOpposite.what, used) + '</p>' + (d.ifOpposite.instruction ? '<p class="el-try">' + esc(d.ifOpposite.instruction) + '</p><button type="button" class="el-go" data-use="' + (uses.length - 1) + '">Put this in the box</button>' : '') + '</div>'; }
      d.improvements.forEach((x) => { if (x.instruction) uses.push(x.instruction); h += '<div class="el-box"><p><b>' + P(x.title, used) + '.</b> ' + P(x.suggestion, used) + '</p>' + (x.instruction ? '<p class="el-try">' + esc(x.instruction) + '</p><button type="button" class="el-go" data-use="' + (uses.length - 1) + '">Put this in the box</button>' : '') + '</div>'; });
      rv.uses = uses;
    } else h += '<button type="button" class="el-go primary" data-review="1">Ask Elena what she thinks</button><p class="el-small">I will read it against ' + esc(c.opp ? c.opp.name : 'the next opponent') + ', for ' + esc(name) + ' only. It costs a few Locks.</p>';
    return h;
  }
  async function requestReview() {
    const c = E.ctx; if (!c || !FM.api || (c.mode !== 'instr' && !c.instrStage)) return;
    const stage = c.mode === 'instr' ? c.stage : c.instrStage, lines = ruleLines(c.team, stage); if (!lines.length) return;
    const key = hashOf(stage + '|' + lines.join('|') + '|' + (c.opp ? c.opp.name : ''));
    if (E.review && E.review.key === key && (E.review.busy || E.review.data)) return;
    E.review = { key, busy: true };
    if (E.open) paint();
    let plan = null;
    try {
      const lr = (window.FM_WORLD && FM_WORLD.league && FM_WORLD.league.labRuns) || [], last = lr.length ? lr[lr.length - 1].result : null, p = last && last.press;
      if (p && p.shapeN) { const sh = p.shape; plan = { rationale: 'In your last build-up test run they pressed high in ' + pc(sh.high.n / p.shapeN) + ' of the tests, sat in a mid-block in ' + pc(sh.mid.n / p.shapeN) + ' and dropped off in ' + pc(sh.low.n / p.shapeN) + '. Their last defender stood about ' + Math.round(p.lastSum / p.shapeN) + ' m from your goal.', alternative: '' }; }
    } catch (e) { plan = null; }
    try {
      const data = await FM.api('/football/review-instructions', { stage, stageName: STAGE_WORD[stage] || stage, formation: c.team.formationKey, squad: FM.squadOf(c.team), opponent: c.opp ? { name: c.opp.name, squad: FM.squadOf(c.opp), plan } : null, instructions: lines });
      E.review = { key, data };
    } catch (err) { E.review = { key, err: err.message || 'I could not read through that just now.' }; }
    if (E.open && E.el) paint();
  }
  function body() {
    if (E.tab === 'lessons') return E.lesson ? lessonStep() : lessonList();
    const c = E.ctx; if (c.mode === 'instr') return instrReading(c);
    if (E.tab === 'instr') return instrReading(Object.assign({}, c, { stage: c.instrStage || 'build' }));
    return c.runs.length ? reading(c) : intro(c);
  }
  function paint() {
    if (!E.el) return;
    const b = E.el.querySelector('.el-body'), keep = null, top = b.scrollTop;
    b.innerHTML = body();
    E.el.querySelectorAll('.el-tabs button').forEach((t) => { if (t.dataset.t === 'read') t.textContent = E.ctx.mode === 'instr' ? 'My review' : 'My reading'; if (t.dataset.t === 'instr') t.hidden = !E.ctx.instrStage; });
    E.el.querySelectorAll('.el-tabs button').forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.t === E.tab)));
    b.scrollTop = top;
    if (FM.labReplay) { FM.labReplay.stop(); const rh = b.querySelector('#elReplay'); if (rh && E.ctx.runs.length) { const last = E.ctx.runs[E.ctx.runs.length - 1].result, cl = last.clips && last.clips.find((x) => x.key === E.clipKey); if (cl) FM.labReplay.mount(rh, cl.clip, { team: E.ctx.team, opp: E.ctx.opp }); } }
    const face = E.el.querySelector('.el-head img'); if (face) face.src = E.tab === 'lessons' ? IMG.think : ((E.ctx.runs.length || E.ctx.mode === 'instr') ? IMG.point : IMG.hello);
  }
  function openLesson(id) { E.tab = 'lessons'; E.lesson = id; E.step = 0; E.state = { right: false, wrong: [], hint: '' }; if (!E.open) setOpen(true); else paint(); const b = E.el && E.el.querySelector('.el-body'); if (b) b.scrollTop = 0; }
  function setOpen(on) {
    E.open = on; document.body.classList.toggle('el-open', on);
    if (E.btn) { E.btn.classList.toggle('open', on); E.btn.setAttribute('aria-expanded', String(on)); }
    if (E.el) { E.el.remove(); E.el = null; }
    if (!on) return;
    const el = document.createElement('aside'); el.className = 'el-panel'; el.setAttribute('aria-label', 'Elena Marsh, performance analyst');
    el.innerHTML = '<div class="el-head"><img alt="" src="' + IMG.hello + '"><div><b>Elena Marsh</b><small>Performance analyst</small></div><button type="button" class="x" aria-label="Close Elena">×</button></div><div class="el-tabs"><button type="button" data-t="read">My reading</button><button type="button" data-t="instr" hidden>Instructions</button><button type="button" data-t="lessons">Lessons</button></div><div class="el-body"></div>';
    document.body.appendChild(el); E.el = el;
    el.addEventListener('change', (e) => { if ((e.target.id === 'elA' || e.target.id === 'elB') && E.ctx.setCompare) E.ctx.setCompare(+el.querySelector('#elA').value, +el.querySelector('#elB').value); });
    el.addEventListener('click', (e) => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.classList.contains('x')) return setOpen(false);
      if (t.dataset.t) { E.tab = t.dataset.t; if (E.tab === 'lessons') E.lesson = null; return paint(); }
      if (t.dataset.lesson) return openLesson(t.dataset.lesson);
      if (t.dataset.clip) { E.clipKey = t.dataset.clip; return paint(); }
      if (t.dataset.istage) { E.istage = t.dataset.istage; return paint(); }
      if (t.dataset.review) return requestReview();
      if (t.dataset.use != null) { const x = E.review && E.review.uses && E.review.uses[+t.dataset.use]; if (x && FM.instrBox) FM.instrBox.fill(x); return; }
      if (t.dataset.term) {
        const id = t.dataset.term, block = t.closest('p, li, .el-box, h4') || t, nxt = block.nextElementSibling;
        if (nxt && nxt.classList.contains('el-defbox') && nxt.dataset.t === id) { nxt.remove(); return; }
        el.querySelectorAll('.el-defbox').forEach((d) => d.remove());
        const d = document.createElement('div'); d.className = 'el-defbox'; d.dataset.t = id; const T0 = TERMS[id];
        d.innerHTML = '<b>' + esc(T0[0]) + '</b> ' + esc(T0[1]) + (T0[2] ? ' <button type="button" class="el-link" data-lesson="' + T0[2] + '">Teach me this</button>' : '');
        block.parentNode.insertBefore(d, block.nextSibling); return;
      }
      if (t.dataset.clear) { if (E.ctx.clearRuns) E.ctx.clearRuns(); return; }
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
      css(); ctx.runs = ctx.runs || []; const fresh = !E.ctx || E.ctx.runs.length !== ctx.runs.length || E.ctx.mode !== ctx.mode; E.ctx = ctx; if (fresh) E.tab = 'read';
      if (!E.btn || !E.btn.isConnected) {
        E.btn = document.createElement('button'); E.btn.type = 'button'; E.btn.className = 'el-tab'; E.btn.setAttribute('aria-expanded', 'false'); E.btn.setAttribute('aria-label', 'Open Elena Marsh, performance analyst');
        E.btn.innerHTML = '<img alt="" src="' + IMG.hello + '"><span>ELENA</span><i class="dot"></i>';
        E.btn.addEventListener('click', () => setOpen(!E.open)); document.body.appendChild(E.btn);
        clearInterval(E.watch); E.watch = setInterval(() => { if (!document.querySelector(E.ctx && E.ctx.mode === 'instr' ? '.in-wrap' : '.lab')) FM.elena.hide(); }, 700);
      }
      if (E.open == null || (E.open && !E.el)) setOpen(true);                         // the first time, she is there to introduce herself
      else if (E.open) { if (fresh && E.tab === 'lessons' && !E.lesson) E.tab = 'read'; paint(); if (fresh && E.tab !== 'lessons') { const b = E.el && E.el.querySelector('.el-body'); if (b) b.scrollTop = 0; } }
      else if (fresh) E.btn.querySelector('.dot').style.display = '';
    },
    review: requestReview,
    refresh() { if (E.open && E.el) paint(); },
    show(tab) { E.tab = tab; if (E.open && E.el) paint(); },
    hide() { if (FM.labReplay) FM.labReplay.stop(); clearInterval(E.watch); if (E.el) E.el.remove(); if (E.btn) E.btn.remove(); E.el = E.btn = null; document.body.classList.remove('el-open'); },
  };
})();
