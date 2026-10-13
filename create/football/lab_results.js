/*
 * The results of a build-up test, drawn on the main screen under the test controls: what happened across the runs, why it was lost, how the
 * opposition pressed, replays of tests, and a comparison of any two runs. (It used to sit in the side panel.)
 */
(function () {
  const FM = window.FM = window.FM || {};
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pc = (x) => Math.round(x * 100) + '%';
  const E = { clipKey: null };
  const P = (text) => esc(text);

  // ---------- the run on screen ----------
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
  function resultsText(r, last, n, level) {
    const p = r.beat.p, used = {};
    let h = '<p class="el-big">' + r.beat.k + ' out of ' + r.n + ' got out clean' + (r.time ? ', in ' + r.time.mean.toFixed(1) + ' seconds on average' : '') + '.</p>';
    if (last.pred !== '' && last.pred != null && level === 'gcse') {
      const v = r.beat, q = last.pred / 100, ok = q >= v.lo && q <= v.hi;
      h += '<p>' + P(ok ? 'You said ' + last.pred + '%. That is inside the 95% interval (' + pc(v.lo) + ' to ' + pc(v.hi) + '), so the result does not show your estimate was wrong.' : 'You said ' + last.pred + '%. We found ' + pc(v.p) + ', and that is outside the 95% interval (' + pc(v.lo) + ' to ' + pc(v.hi) + '). Your picture of this build-up was off, and the reasons are just below.', used) + '</p>';
    }
    h += '<div class="el-rows">' + OUT_ROWS.map(([k, l, note]) => { const v = r[k]; return '<div class="el-row"><div class="el-rl"><b>' + esc(l) + '</b><small>' + esc(note) + '</small></div><div class="el-rv"><b>' + pc(v.p) + '</b><small>' + v.k + ' of ' + r.n + '</small></div>' + (level === 'gcse' ? bar(v) : '') + '</div>'; }).join('') + '</div>';
    if (level === 'gcse') h += '<p class="el-small">' + P('The bar is the 95% interval, and the white line is the share found.', used) + '</p>';
    else if (last.pred !== '' && last.pred != null) h += '<p>You predicted ' + esc(last.pred) + '%. The observed share was ' + pc(r.beat.p) + '. Decide how you will judge that gap before drawing a tactical conclusion.</p>';
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
    return '<h4>The test</h4>' +
      '<p>' + P('One try tells us nothing: a pass comes off or it does not, a defender steps up or he does not. So we play the same set-up 100 times and count. Running it many times and counting is how the effect of luck is separated from the effect of the set-up.', used) + '</p>' +
      setupText(c) +
      '<p><b>Before you press Run, make a prediction:</b> out of 100 tries against ' + esc(c.opp.name) + ', how many get out of your half with the ball?</p>';
  }
  function reading(c) {
    const runs = c.runs, last = runs[runs.length - 1], r = last.result, n = runs.length, used = {};
    const level = window.FM_WORLD && FM_WORLD.league ? FM_WORLD.league.tier : 'gcse';
    let h = resultsText(r, last, n, level);
    // what went wrong: three things at most, each a sentence and something to try
    const ex = FM.lab.explain(r, {}), w = r.why, lostN = r.lost.k;
    if (!w) h += '<p>This run was saved before the losses were broken down. Run it again to see what happened.</p>';
    else if (!lostN) h += '<p>You kept it every time. A failure that happens one in fifty will not show in a run of 20, so a harder opponent or more tests might find some.</p>';
    else if (!ex.findings.length) h += '<p>You only lost it ' + lostN + ' times, which is too few to show a pattern. A couple of unlucky tests can look like a reason. Run more and it will show or fade.</p>';
    else h += '<h4>What went wrong</h4>' + ex.findings.slice(0, 3).map((f) => '<div class="el-box"><p><b>' + esc(f.title) + '.</b> ' + P(f.body, used) + '</p><p class="el-try">Try: ' + P(f.fix, used) + '</p></div>').join('');
    h += pressShapeText(r) + pressText(r, c) + replayText(r);
    // the comparison
    if (n >= 2) h += '<h4>Has anything really changed?</h4><div class="el-cmp"><label>Run<select id="elA">' + runs.map((x, i) => '<option value="' + i + '"' + (i === c.a ? ' selected' : '') + '>Run ' + (i + 1) + ': ' + pc(x.result.beat.p) + ' got out</option>').join('') + '</select></label><label>against<select id="elB">' + runs.map((x, i) => '<option value="' + i + '"' + (i === c.b ? ' selected' : '') + '>Run ' + (i + 1) + ': ' + pc(x.result.beat.p) + ' got out</option>').join('') + '</select></label></div>';
    if (n >= 2 && c.a !== c.b && runs[c.a] && runs[c.b] && level === 'gcse') {
      const A = runs[c.a].result, B = runs[c.b].result, cb = FM.lab.compare(A, B, 'beat'), sig = cb.p < 0.05, d = Math.round(cb.diff * 100), u2 = {};
      h += compareTable(A, B, c.a, c.b) + '<p>' + P((d === 0 ? 'No movement at all between them. ' : 'Run ' + (c.b + 1) + ' is ' + Math.abs(d) + ' points ' + (d > 0 ? 'better' : 'worse') + '. ') + (sig ? 'And that is real: the p-value is ' + cb.p.toFixed(3) + ', so luck alone would rarely do that.' : 'But it is not safe to read much into it: the p-value is ' + cb.p.toFixed(2) + ', and luck alone does that about ' + Math.round(cb.p * 100) + '% of the time.' + (cb.need ? ' You would want about ' + cb.need + ' tests of each to be sure.' : '')), u2) + '</p>';
    } else if (n >= 2 && c.a !== c.b && runs[c.a] && runs[c.b]) {
      const A = runs[c.a].result, B = runs[c.b].result, d = Math.round((B.beat.p - A.beat.p) * 100);
      h += '<div class="el-box"><p><b>The raw change is ' + (d >= 0 ? '+' : '') + d + ' percentage points.</b></p><p>Decide what comparison fits, whether the samples are large enough, and what would count as a meaningful football effect. The full set of statistical tools is in the Analysis Centre.</p></div>';
    } else if (n >= 2) h += '<p>Pick two different runs to compare them.</p>';
    else h += '<p>Next: change one thing, say what you expect in the box above Run, and run it again. Then we can see if it made a difference.</p>';
    h += '<p class="el-small">' + runs.map((x, i) => 'Run ' + (i + 1) + ': ' + pc(x.result.beat.p)).join(' · ') + '</p><button type="button" class="el-go" data-clear="1">Clear the runs</button>';
    return h;
  }


  // ---------- the results page ----------
  // The tests in the defensive phases are the opposition attacking you: a test is a success for you when their attack is stopped before a shot.
  const REV = { organised: true, transdef: true };
  // How good a result has to be before we call it satisfactory.
  const SAT = { build: 0.7, midfield: 0.65, final: 0.08, transatt: 0.06, organised: 0.92, transdef: 0.92 };
  const PREP_TAB = { build: 'build', midfield: 'midfield', final: 'final', organised: 'organised', transdef: 'transdef', transatt: 'transatt' };
  const DONE_TEXT = {
    build: (k, n) => k + ' of ' + n + ' goal kicks were played out and reached the halfway line with the ball',
    midfield: (k, n) => k + ' of ' + n + ' moves were played through midfield',
    final: (k, n) => k + ' of ' + n + ' attacks ended in a shot',
    transatt: (k, n) => k + ' of ' + n + ' ball wins turned into a shot',
    organised: (k, n) => k + ' of ' + n + ' attacks against you were stopped before they could shoot',
    transdef: (k, n) => k + ' of ' + n + ' counter-attacks were stopped after you lost the ball',
  };
  const GOOD_TITLE = { build: 'What it looks like when it works', midfield: 'What it looks like when it works', final: 'What it looks like when it works', transatt: 'What it looks like when it works', organised: 'What it looks like when you stop them', transdef: 'What it looks like when you stop them' };
  const mood = (rate, sat) => {
    const x = rate / sat;
    return x >= 1.2 ? 'That is seriously impressive, well done!'
      : x >= 1 ? 'A strong result. This set-up is doing its job.'
      : x >= 0.75 ? 'Decent, and there is clearly more in it. A few changes could take this a long way.'
      : x >= 0.45 ? 'It is struggling, but the good news is we can see exactly why. Read on.'
      : 'That is not working yet. Do not worry: the next sections show what is going wrong and how to fix it.';
  };
  const KIND_WORDS = { intercepted: 'cut out by a defender', loose: 'went astray', dribble: 'lost in a dribble', tackle: 'lost in a tackle', offside: 'played to a team-mate offside', other: 'lost in other ways' };
  const STOP_WORDS = { intercepted: 'you cut out their pass', loose: 'their pass went astray', dribble: 'they lost it in a dribble', tackle: 'you won it in a tackle', offside: 'they were caught offside', other: 'stopped in other ways' };
  // Concrete changes, each with what it costs. The ball-playing phases and the defending phases need different ones.
  const FIX = {
    intercepted: { title: 'Give the man on the ball an easier pass', change: 'Move a midfielder or full-back closer to whoever starts the move, so there is a short, safe pass that no defender can step across.', cost: 'It is a quieter way to get out: every short pass is slower, and a player who drops deeper is one fewer in the middle of the pitch.' },
    loose: { title: 'Shorten the passes', change: 'Bring the receivers closer to the ball and ask for shorter passes, so the ball is easier to control.', cost: 'You will play more passes to get out, and each extra pass is another chance to make a mistake or give them time to press.' },
    dribble: { title: 'Get the ball moving sooner', change: 'Add an instruction for the player who keeps dribbling to pass first time, and give him a close team-mate to pass to.', cost: 'You lose the chance of him beating a man and breaking the press on his own.' },
    tackle: { title: 'Take the pressure off the player on the ball', change: 'Put a second player within a few metres of him so the pass is there before the tackle comes in.', cost: 'Two players near the ball is less width and fewer players spread across the pitch.' },
    offside: { title: 'Do not run beyond the ball', change: 'Pull the forwards back a few metres in this phase so they start onside.', cost: 'They have further to run to get in behind, so you give up some of the direct threat.' },
    long: { title: 'Cut out the long ball', change: 'Move a midfielder to drop closer to the back line, and ask for passes along the ground rather than over the top.', cost: 'You give up the quick, direct way out, and a patient build-up gives their press more time to set.' },
    near: { title: 'Make the first pass the safe one', change: 'Place a defender beside the goalkeeper so the first pass is a short, simple one, not a gamble near your own goal.', cost: 'It is slower to get going, and a keeper who passes short asks more of his feet.' },
    marked: { title: 'Find the player who is free', change: 'Spread the team wider across the pitch so someone is always away from a defender.', cost: 'A wider team leaves bigger gaps in the middle, and the passes between players are longer.' },
    player: { title: 'Take the load off one player', change: 'Move a team-mate next to him, or give him a simpler job in this phase.', cost: 'The team loses some of the quality he gives it, and the other player is pulled away from his own job.' },
  };
  // In the final third the pass is the last one before a shot, so the fixes are about getting it to a team-mate in the box.
  const FIX_ATT = {
    intercepted: { title: 'Make the pass into the box easier to find', change: 'Bring a midfielder close to the player on the ball, so there is a short pass no defender can step across before the cross or through-ball.', cost: 'He is no longer one of the runners arriving in the box, so there is one fewer to finish the move.' },
    loose: { title: 'Make the last pass simpler', change: 'Ask for the pass to go along the ground to a nearer team-mate, not hit over the top.', cost: 'It is slower, and the defence has time to get back and set before you shoot.' },
    dribble: { title: 'Pass before the defender arrives', change: 'Give the player who keeps dribbling a nearer team-mate to play to, and ask him to pass first time near the box.', cost: 'You lose the chance of him beating a man on his own.' },
    tackle: { title: 'Give him support near the box', change: 'Put a second player close to the ball carrier so he has a pass before the tackle comes in.', cost: 'The extra player is not arriving late in the box, so fewer attackers get a sight of goal.' },
    offside: { title: 'Time the run, not just the pass', change: 'Ask the forward to start a few metres deeper so he stays onside until the ball is played.', cost: 'He has further to run to get behind, and the chance is slightly slower.' },
    player: { title: 'Take the load off one player', change: 'Move a team-mate next to him, or give him a simpler job in this phase.', cost: 'The team loses some of the quality he gives it, and the other player is pulled away from his own job.' },
  };
  // When they are the ones attacking: where the shots came from decides what to change.
  const FIX_DEF = {
    close: { title: 'Protect the area in front of goal', change: 'Bring a central midfielder deeper to screen in front of the centre-backs, so there is less room to shoot from close in.', cost: 'He is further from the ball when you win it, so you are slower to counter-attack.' },
    free: { title: 'Close the shooter down sooner', change: 'Ask the nearest midfielder to go to the ball as soon as it reaches the edge of the box, and keep the full-backs tucked in behind him.', cost: 'If he is beaten, there is a gap in front of the back line, and his job in attack is smaller.' },
    far: { title: 'Make them shoot from distance', change: 'Drop the back line a little and hold the shape, so the only space left is a long way out.', cost: 'They get more time on the ball and you give up the pitch behind you, so you are further from their goal when you win it.' },
    compact: { title: 'Keep the shape compact', change: 'Bring the back line and the midfield closer together so there is less room between the lines.', cost: 'A compact team leaves more space behind the defence for a ball over the top.' },
    counter: { title: 'Slow the counter down', change: 'Keep one midfielder deeper while you attack, so he is already in position when you lose it.', cost: 'He is not helping in attack, so you have one fewer attacker.' },
    wide: { title: 'Show them away from the middle', change: 'Narrow the midfield so the ball is pushed wide, where the angle for a shot is poor.', cost: 'Crosses become their way in, so the centre-backs have more to deal with in the air.' },
  };

  // The share that counts as success for this phase.
  function share(r, phase) {
    if (!REV[phase]) return r.beat;
    const k = r.n - r.beat.k, ci = FM.STAT.wilson(k, r.n, 0.95);
    return { k, p: k / r.n, lo: ci.lo, hi: ci.hi };
  }
  const asRes = (run, phase) => ({ n: run.result.n, ok: share(run.result, phase) });
  function instructionsFor(r, phase) {
    const out = [], push = (src, k, extra) => { const f = src[k]; if (f && !out.some((o) => o.id === k)) out.push(Object.assign({ id: k }, f, extra || {})); };
    const w = r.why, sw = r.shotsWhy;
    if (REV[phase]) {
      if (sw && sw.n >= 4) {
        if (sw.close / sw.n >= 0.4) push(FIX_DEF, 'close');
        if (sw.free / sw.n >= 0.4) push(FIX_DEF, 'free');
        if (sw.far / sw.n >= 0.3) push(FIX_DEF, 'far');
      }
      if (phase === 'organised') { push(FIX_DEF, 'wide'); push(FIX_DEF, 'compact'); } else { push(FIX_DEF, 'counter'); push(FIX_DEF, 'compact'); }
      return out.slice(0, 3);
    }
    if (w && w.n >= 4) {
      const src = phase === 'final' || phase === 'transatt' ? FIX_ATT : FIX;
      const kinds = Object.keys(w.kinds).sort((a, b) => w.kinds[b] - w.kinds[a]);
      push(src, kinds[0]);
      if (src === FIX) {
        if (w.failedPasses >= 4 && (w.distSum / w.failedPasses > 26 || w.long / w.failedPasses > 0.4)) push(FIX, 'long');
        else if (w.failedPasses >= 4 && w.tight / w.failedPasses > 0.45) push(FIX, 'marked');
        if (((w.zones.lostNear || 0) + (w.zones.lostOwn || 0)) / w.n >= 0.6) push(FIX, 'near');
      } else if (w.failedPasses >= 4 && w.tight / w.failedPasses > 0.45) push(FIX, 'marked');
      const pl = Object.keys(w.players).map((q) => w.players[q]).sort((a, b) => b.n - a.n)[0];
      if (pl && pl.n >= 3 && pl.n / w.n >= 0.28) push(src, 'player', { title: pl.name.split(' ').pop() + ' is the one losing it', change: 'Move a team-mate next to ' + pl.name.split(' ').pop() + ', or give him a simpler job in this phase.' });
    }
    if (!out.length) {
      const generic = {
        final: { id: 'g', title: 'Get more players around the box', change: 'Move a midfielder higher and ask a winger to stay wide, so the box has runners arriving.', cost: 'The team is stretched, so a lost ball becomes harder to win back.' },
        transatt: { id: 'g', title: 'Make the first pass forward a quick one', change: 'Ask a forward to stay high when you win the ball so there is a target for the first pass.', cost: 'A forward who waits high does less to help defend.' },
        midfield: { id: 'g', title: 'Give the midfield an easier pass', change: 'Bring a midfielder deeper to receive, and ask the full-backs to offer a wide option.', cost: 'It is a slower way through the middle.' },
        build: { id: 'g', title: 'Give the man on the ball an easier pass', change: 'Move a midfielder closer to whoever starts the move.', cost: 'It is a quieter way to get out.' },
      }[phase];
      if (generic) out.push(generic);
    }
    return out.slice(0, 3);
  }

  // "Did the change help?", settled by the computer. The question depends on which way the result moved: a rise is tested as a rise and a fall as a
  // fall, each against the chance that run-to-run variation alone would move it that far.
  function improvement(prev, cur, phase) {
    const A = asRes(prev, phase), B = asRes(cur, phase), c = FM.lab.compare(A, B, 'ok'), d = c.diff;
    return { diff: d, pDir: c.p / 2, a: A.ok.p, b: B.ok.p, n: B.n, need: c.need };
  }
  const SIG = 0.05;
  const bars = (rows, total) => rows.filter((x) => x[1] > 0).map(([l, k, note]) => '<div class="lo-bar"><span><b>' + esc(l) + '</b>' + (note ? '<small>' + esc(note) + '</small>' : '') + '</span><i style="--w:' + Math.round((k / Math.max(1, total)) * 100) + '%"></i><em>' + k + ' of ' + total + '</em></div>').join('');

  // Which of the stored replays to show as the good one and the bad one.
  function pickClips(r, phase) {
    const clips = r.clips || [], w = r.why, kinds = w ? Object.keys(w.kinds).sort((a, b) => w.kinds[b] - w.kinds[a]) : [];
    if (REV[phase]) return { win: clips.find((x) => x.key === kinds[0] && x.key !== 'beat') || clips.find((x) => x.key !== 'beat'), loss: clips.find((x) => x.key === 'beat') };
    return { win: clips.find((x) => x.key === 'beat'), loss: clips.find((x) => x.key === kinds[0] && x.key !== 'beat') || clips.find((x) => x.key !== 'beat') };
  }
  const lcFirst = (t) => t.charAt(0).toLowerCase() + t.slice(1);
  const clipTitle = (c, phase, good) => (REV[phase] ? (good ? 'An attack you stopped' : 'An attack that got a shot away') : (good ? (phase === 'final' || phase === 'transatt' ? 'An attack that ended in a shot' : 'A build-up that worked') : c.label));

  function outcomeHtml(c) {
    const runs = c.runs, run = runs[runs.length - 1], r = run.result, phase = c.phase;
    const succ = share(r, phase), rate = succ.p, n = r.n, sat = SAT[phase] || 0.6, fresh = c.fresh ? ' rv-anim' : '';
    let i = 0; const rv = (inner, cls) => '<section class="rv ' + (cls || '') + '" style="--i:' + (i++) + '">' + inner + '</section>';
    let h = '<div class="lab-outcome' + fresh + '">';
    // 1. the headline, with how it compares with last time straight under it
    const pctWhole = Math.round(rate * 100);
    let verdict = null, im = null, prev = null;
    if (runs.length >= 2) {
      prev = runs[runs.length - 2]; im = improvement(prev, run, phase);
      const big = im.pDir < SIG;
      verdict = Math.abs(im.diff) < 0.02 ? 'same' : im.diff > 0 ? (big ? 'better' : 'slightly-better') : (big ? 'worse' : 'slightly-worse');
    }
    const moodText = verdict === 'worse' ? 'That is a step back from last time.'
      : verdict === 'slightly-worse' ? 'A little lower than last time, though not by enough to be sure your change is the reason.'
      : verdict === 'better' ? 'Better than last time: your change worked.'
      : mood(rate, sat);
    let top = '<p class="lo-headline"><b>' + pctWhole + '%</b> of tests were successful.</p><p class="lo-mood">' + esc(moodText) + '</p><p class="lo-detail">' + esc((DONE_TEXT[phase] || DONE_TEXT.build)(succ.k, n)) + (phase === 'build' && r.time ? ', in ' + r.time.mean.toFixed(1) + ' seconds on average' : '') + '.</p>';
    if (im) {
      const pa = Math.round(im.a * 100), pb = Math.round(im.b * 100);
      const text = {
        better: 'Yes. Last time ' + pa + '% of tests were successful and this time ' + pb + '%. That gap is too big to be down to chance, so the change helped.',
        'slightly-better': 'A little better (' + pa + '% became ' + pb + '%), but not by enough to be sure it was your change and not just the ordinary ups and downs between runs. Testing again will tell.',
        same: 'No real difference: ' + pa + '% last time and ' + pb + '% now.',
        'slightly-worse': 'A little lower (' + pa + '% became ' + pb + '%), but that is within the ordinary ups and downs between runs, so the change may not be to blame.',
        worse: 'No. It went from ' + pa + '% down to ' + pb + '%. That drop is too big to be down to chance: the change made it worse.',
      }[verdict];
      const changed = (run.changes || []).slice(0, 5);
      top += '<div class="lo-test"><h4>Did the change help?</h4>' +
        '<p class="lo-verdict ' + (verdict === 'better' ? 'yes' : verdict === 'worse' ? 'no' : 'maybe') + '">' + esc(text) + '</p>' +
        (changed.length ? '<p class="lo-small">What you changed since last time: ' + changed.map(esc).join('; ') + '.</p>' : '') + '</div>';
    }
    h += rv('<h2 class="lo-title">Test Results</h2>' + top, 'lo-top');
    const clips = pickClips(r, phase);
    // 2. what it looks like when it works
    if (clips.win) h += rv('<h3>' + esc(GOOD_TITLE[phase] || GOOD_TITLE.build) + '</h3><div id="loGood" class="rp"></div><p class="lo-small">Press play to watch one: ' + esc(lcFirst(clipTitle(clips.win, phase, true))) + ', with the passes drawn as arrows.</p>');
    // 3. the rest
    const lostK = n - succ.k, w = r.why, sw = r.shotsWhy;
    if (lostK > 0) {
      let sec = '<h3>What about the other ' + Math.round((1 - rate) * 100) + '%?</h3>';
      const passLine = (wy) => {
        const md = Math.round(wy.distSum / wy.failedPasses), longN = wy.long, shortN = wy.failedPasses - wy.long;
        return '<p>' + esc('Of the ' + wy.failedPasses + ' passes that failed, ' + longN + ' were long (over 30 m) and ' + shortN + ' were short. The typical failed pass travelled ' + md + ' m' + (wy.tight ? ', and ' + wy.tight + ' of them went to a player with a defender right on him' : '') + '.') + '</p>';
      };
      const kindBars = (wy) => bars(Object.keys(wy.kinds).sort((a, b) => wy.kinds[b] - wy.kinds[a]).slice(0, 4).map((k) => [KIND_WORDS[k] || k, wy.kinds[k], '']), wy.n);
      if (REV[phase]) {
        sec += '<p>' + esc('In ' + r.beat.k + ' of the ' + n + ' tests they got a shot away' + (r.goal && r.goal.k ? ', and ' + r.goal.k + ' of those went in' : '') + '.') + '</p>';
        if (sw && sw.n >= 3) {
          sec += '<div class="lo-cols"><div><h4>Where they shot from</h4>' + bars([['Close in', sw.close, 'inside the six-yard area, or just outside it'], ['In the box', sw.mid, ''], ['From distance', sw.far, '']], sw.n) + '</div>' +
            '<div><h4>How much room the shooter had</h4>' + bars([['Plenty of room', sw.free, 'a defender more than 4 m away'], ['Closed down', sw.pressed, 'a defender within 2 m'], ['Some pressure', sw.n - sw.free - sw.pressed, '']], sw.n) + '</div></div>';
        }
        if (w && w.n >= 3) sec += '<h4>How you stopped the others</h4>' + bars(Object.keys(w.kinds).sort((a, b) => w.kinds[b] - w.kinds[a]).slice(0, 4).map((k) => [STOP_WORDS[k] || k, w.kinds[k], '']), w.n);
      } else if (phase === 'build' || phase === 'midfield') {
        const zones = [['Near your own goal', r.lostNear.k, 'within 25 m: the dangerous ones'], ['Still going at 40 seconds', r.still.k, 'neither won nor lost']];
        sec += '<div class="lo-cols"><div><h4>Where it was lost</h4>' + bars(zones, lostK) + (r.shot && r.shot.k ? '<p class="lo-small">They went on to have a shot in ' + r.shot.k + ' of the ' + n + ' tests.</p>' : '') + '</div>';
        if (w && w.failedPasses >= 3) sec += '<div><h4>How it was lost, and how far the pass went</h4>' + kindBars(w) + passLine(w) + '</div>';
        sec += '</div>';
      } else {
        const lostBall = r.lost ? r.lost.k : 0, hit = r.shot ? Math.max(0, r.shot.k - r.beat.k) : 0;
        sec += '<div class="lo-cols"><div><h4>What happened instead</h4>' + bars([['You lost the ball', lostBall, ''], ['It ran out of time without a shot', r.still.k, 'neither a shot nor a loss']], lostK) + (hit ? '<p class="lo-small">They hit back with a shot of their own in ' + hit + ' of the ' + n + ' tests.</p>' : '') + '</div>';
        if (w && w.n >= 3) sec += '<div><h4>How you lost it</h4>' + kindBars(w) + (w.failedPasses >= 3 ? passLine(w) : '') + '</div>';
        sec += '</div>';
      }
      if (clips.loss) sec += '<h4>Here is one that went wrong: ' + esc(lcFirst(clipTitle(clips.loss, phase, false))) + '</h4><div id="loBad" class="rp"></div>';
      h += rv(sec);
    }
    // 4. instructions
    const ins = instructionsFor(r, phase), unsat = rate < sat, tab = PREP_TAB[phase] || 'build';
    h += rv('<h3>Instructions</h3><p class="lo-small">' + (unsat ? 'These are the changes most likely to move the result, and what each one costs you.' : 'You are already getting good results. If you want to push further, these are the changes worth trying, and what each one costs you.') + '</p>' +
      '<div class="lo-ins">' + ins.map((x, k) => '<div class="lo-card"><b>' + (k + 1) + '. ' + esc(x.title) + '</b><p>' + esc(x.change) + '</p><p class="lo-cost"><em>The trade-off:</em> ' + esc(x.cost) + '</p><div class="row"><button type="button" class="primary" data-implement="' + esc(x.id) + '">Implement this for me</button><button type="button" class="el-go" data-tactics="' + tab + '">See tactics</button></div><p class="lo-done" data-done="' + esc(x.id) + '" hidden></p></div>').join('') + '</div>');
    // 5. what next
    const canRevert = verdict === 'worse' && prev && prev.snap && prev.snap.full;
    let rec;
    if (canRevert) rec = '<h3>Go back to what you had</h3><p>Your last change made things clearly worse, so we recommend putting your tactics back exactly as they were for the previous test (' + Math.round(im.a * 100) + '% successful). You can then try a different change from the instructions above.</p>';
    else if (unsat) rec = '<h3>Test it again</h3><p>We recommend making a change and testing again. It will be the same ' + n + ' tests as before, and we will be looking to <b>beat ' + pctWhole + '%</b>. Afterwards we will tell you whether the change really helped.</p>';
    else rec = '<h3>Ready for the match?</h3><p>This is a good result to take into the game. You can still test again if you want to push it further.</p>';
    h += rv(rec + '<div class="row">' + (canRevert ? '<button type="button" class="primary" data-act="revert">Put my previous tactics back</button>' : '') + '<button type="button" class="' + (canRevert ? 'el-go' : 'primary') + '" data-act="again">' + (unsat ? 'Test again (' + n + ' tests)' : 'Test again anyway') + '</button><button type="button" class="el-go" data-tactics="' + tab + '">See tactics</button><button type="button" class="el-go" data-act="preview">Go to the match preview</button></div><p class="lo-done" data-reverted hidden></p>');
    return h + '</div>';
  }

  // ---------- drawing it ----------
  // c: { opp, runs, a, b, st, team, tac, setCompare, clearRuns }
  FM.labResults = {
    successRate(phase, result) { return result ? share(result, phase).p : null; },
    // The results page: c = { phase, opp, team, runs, fresh, onAgain, onTactics(tab), onPreview }
    outcome(host, c) {
      if (!host) return;
      if (FM.labReplay) FM.labReplay.stop();
      host.innerHTML = outcomeHtml(c);
      host.querySelectorAll('[data-tactics]').forEach((b) => b.addEventListener('click', () => c.onTactics && c.onTactics(b.dataset.tactics)));
      const ag = host.querySelector('[data-act="again"]'); if (ag) ag.addEventListener('click', () => c.onAgain && c.onAgain());
      const pv = host.querySelector('[data-act="preview"]'); if (pv) pv.addEventListener('click', () => c.onPreview && c.onPreview());
      host.querySelectorAll('[data-implement]').forEach((b) => b.addEventListener('click', () => {
        const out = c.onImplement ? c.onImplement(b.dataset.implement) : null, note = host.querySelector('[data-done="' + b.dataset.implement + '"]');
        b.disabled = true; b.textContent = out && out.count ? 'Done' : 'Nothing to change';
        if (note) { note.hidden = false; note.textContent = out && out.count ? [].concat(out.said, out.moves).join(' ') + ' Open the tactics board to see it, then test again.' : 'Your tactics already match this, so nothing was changed.'; }
      }));
      const rv2 = host.querySelector('[data-act="revert"]');
      if (rv2) rv2.addEventListener('click', () => { const ok = c.onRevert ? c.onRevert() : false; rv2.disabled = true; const note = host.querySelector('[data-reverted]'); if (note) { note.hidden = false; note.textContent = ok ? 'Your previous tactics are back. Test again to confirm.' : 'The previous tactics could not be restored.'; } });
      const r = c.runs[c.runs.length - 1].result;
      if (FM.labReplay && r.clips) {
        const g = host.querySelector('#loGood'), bd = host.querySelector('#loBad'), picked = pickClips(r, c.phase);
        const ctx = REV[c.phase] ? { team: c.opp, opp: c.team, attackLabel: c.opp.name + ' attack' } : { team: c.team, opp: c.opp };
        if (g && picked.win) FM.labReplay.mount(g, picked.win.clip, ctx);
        if (bd && picked.loss) FM.labReplay.mount(bd, picked.loss.clip, ctx);
      }
    },
    render(host, c) {
      if (!host) return;
      if (FM.labReplay) FM.labReplay.stop();
      host.innerHTML = '<div class="lab-results">' + (c.runs.length ? reading(c) : intro(c)) + '</div>';
      host.querySelectorAll('[data-clip]').forEach((b) => b.addEventListener('click', () => { E.clipKey = b.dataset.clip; FM.labResults.render(host, c); }));
      const a = host.querySelector('#elA'), b = host.querySelector('#elB');
      const onCompare = () => { if (c.setCompare) c.setCompare(+a.value, +b.value); };
      if (a) a.addEventListener('change', onCompare);
      if (b) b.addEventListener('change', onCompare);
      const clr = host.querySelector('[data-clear]');
      if (clr) clr.addEventListener('click', () => { if (c.clearRuns) c.clearRuns(); });
      const rh = host.querySelector('#elReplay');
      if (FM.labReplay && rh && c.runs.length) {
        const last = c.runs[c.runs.length - 1].result, cl = last.clips && last.clips.find((x) => x.key === E.clipKey);
        if (cl) FM.labReplay.mount(rh, cl.clip, { team: c.team, opp: c.opp });
      }
    },
  };
})();
