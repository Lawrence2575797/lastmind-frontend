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
  // What a test is judged on in each phase, and how good a result has to be before we call it satisfactory.
  const KEYOF = { build: 'beat', midfield: 'beat', final: 'shot', transatt: 'shot', organised: 'lost', transdef: 'lost' };
  const SAT = { build: 0.7, midfield: 0.65, final: 0.4, transatt: 0.35, organised: 0.6, transdef: 0.6 };
  const PREP_TAB = { build: 'build', midfield: 'midfield', final: 'final', organised: 'organised', transdef: 'transdef', transatt: 'transatt' };
  const DONE_TEXT = {
    build: (k, n) => k + ' of ' + n + ' goal kicks were played out and reached the halfway line with the ball',
    midfield: (k, n) => k + ' of ' + n + ' moves were played through midfield',
    final: (k, n) => k + ' of ' + n + ' attacks ended in a shot',
    transatt: (k, n) => k + ' of ' + n + ' ball wins turned into a shot',
    organised: (k, n) => k + ' of ' + n + ' attacks against you were stopped without a shot',
    transdef: (k, n) => k + ' of ' + n + ' counter-attacks were stopped after you lost the ball',
  };
  const mood = (rate, sat) => {
    const x = rate / sat;
    return x >= 1.2 ? 'That is seriously impressive, well done!'
      : x >= 1 ? 'A strong result. This set-up is doing its job.'
      : x >= 0.75 ? 'Decent, and there is clearly more in it. A few changes could take this a long way.'
      : x >= 0.45 ? 'It is struggling, but the good news is we can see exactly why. Read on.'
      : 'That is not working yet. Do not worry: the next sections show what is going wrong and how to fix it.';
  };
  const KIND_WORDS = { intercepted: 'cut out by a defender', loose: 'went astray', dribble: 'lost in a dribble', tackle: 'lost in a tackle', offside: 'played to a team-mate offside', other: 'lost in other ways' };
  // Concrete changes for the most common ways of losing it, each with what it costs.
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

  function successOf(r, phase) { const v = r[KEYOF[phase] || 'beat']; return v || r.beat; }
  function instructionsFor(r, phase) {
    const w = r.why, out = [], push = (k, extra) => { const f = FIX[k]; if (f && !out.some((o) => o.id === k)) out.push(Object.assign({ id: k }, f, extra || {})); };
    if (w && w.n >= 4) {
      const kinds = Object.keys(w.kinds).sort((a, b) => w.kinds[b] - w.kinds[a]);
      push(kinds[0]);
      if (w.failedPasses >= 4 && (w.distSum / w.failedPasses > 26 || w.long / w.failedPasses > 0.4)) push('long');
      else if (w.failedPasses >= 4 && w.tight / w.failedPasses > 0.45) push('marked');
      if (((w.zones.lostNear || 0) + (w.zones.lostOwn || 0)) / w.n >= 0.6) push('near');
      const pl = Object.keys(w.players).map((q) => w.players[q]).sort((a, b) => b.n - a.n)[0];
      if (pl && pl.n >= 3 && pl.n / w.n >= 0.28) push('player', { title: pl.name.split(' ').pop() + ' is the one losing it', change: 'Move a team-mate next to ' + pl.name.split(' ').pop() + ', or give him a simpler job in this phase.' });
    }
    if (!out.length) {
      const generic = {
        final: { id: 'g', title: 'Get more players around the box', change: 'Move a midfielder higher and ask a winger to stay wide, so the box has runners arriving.', cost: 'The team is stretched, so a lost ball becomes harder to win back.' },
        transatt: { id: 'g', title: 'Make the first pass forward a quick one', change: 'Ask a forward to stay high when you win the ball so there is a target for the first pass.', cost: 'A forward who waits high does less to help defend.' },
        organised: { id: 'g', title: 'Keep the shape compact', change: 'Bring the back line and the midfield closer together so there is less room between the lines.', cost: 'A compact team leaves more space behind the defence.' },
        transdef: { id: 'g', title: 'Slow the counter down', change: 'Keep one midfielder deeper while you attack, so he is already in position when you lose it.', cost: 'He is not helping in attack, so you have one fewer attacker.' },
        midfield: { id: 'g', title: 'Give the midfield an easier pass', change: 'Bring a midfielder deeper to receive, and ask the full-backs to offer a wide option.', cost: 'It is a slower way through the middle.' },
        build: { id: 'g', title: 'Give the man on the ball an easier pass', change: 'Move a midfielder closer to whoever starts the move.', cost: 'It is a quieter way to get out.' },
      }[phase];
      if (generic) out.push(generic);
    }
    return out.slice(0, 3);
  }

  // "Did the change help?", settled by the computer: a one-sided test of the new run against the one before it.
  function improvement(prev, cur, key) {
    const c = FM.lab.compare(prev.result, cur.result, key), d = c.diff;
    const pOne = d >= 0 ? c.p / 2 : 1 - c.p / 2;
    return { diff: d, pOne, c, a: prev.result[key].p, b: cur.result[key].p, n: cur.result.n, need: c.need };
  }
  const SIG = 0.05;

  function outcomeHtml(c) {
    const runs = c.runs, run = runs[runs.length - 1], r = run.result, phase = c.phase, key = KEYOF[phase] || 'beat';
    const succ = successOf(r, phase), rate = succ.p, n = r.n, sat = SAT[phase] || 0.6, fresh = c.fresh ? ' rv-anim' : '';
    let i = 0; const rv = (inner, cls) => '<section class="rv ' + (cls || '') + '" style="--i:' + (i++) + '">' + inner + '</section>';
    let h = '<div class="lab-outcome' + fresh + '">';
    // 1. the headline, with how it compares with last time straight under it
    const pctWhole = Math.round(rate * 100);
    let top = '<p class="lo-headline"><b>' + pctWhole + '%</b> of tests were successful.</p><p class="lo-mood">' + esc(mood(rate, sat)) + '</p><p class="lo-detail">' + esc((DONE_TEXT[phase] || DONE_TEXT.build)(succ.k, n)) + (phase === 'build' && r.time ? ', in ' + r.time.mean.toFixed(1) + ' seconds on average' : '') + '.</p>';
    if (runs.length >= 2) {
      const prev = runs[runs.length - 2], im = improvement(prev, run, key), pa = Math.round(im.a * 100), pb = Math.round(im.b * 100);
      const pTxt = im.pOne < 0.001 ? 'less than 0.1%' : (im.pOne * 100).toFixed(1) + '%';
      const verdict = im.diff <= 0 && im.pOne > 0.5
        ? 'It did not improve: ' + pb + '% this time, against ' + pa + '% last time.'
        : im.pOne < SIG ? 'It really did improve. ' + pa + '% became ' + pb + '%, and luck alone would give a rise that big ' + (im.pOne * 100 < 1 ? 'fewer than 1 time in 100.' : 'only about ' + Math.round(im.pOne * 100) + ' times in 100.')
        : 'It looks better (' + pa + '% became ' + pb + '%), but the evidence is not strong enough yet: luck alone would give a rise like that about ' + Math.round(im.pOne * 100) + ' times in 100.' + (im.need ? ' About ' + im.need + ' tests of each would settle it.' : '');
      const changed = (run.changes || []).slice(0, 4);
      top += '<div class="lo-test"><h4>Did the change help?</h4>' +
        '<p>The computer set it up as a test. <b>The starting assumption</b> is that nothing you changed made any difference to the ' + Math.round(im.a * 100) + '% from last time. <b>The alternative</b> is that you raised it. It only accepts the alternative if luck alone would give a rise this big less than ' + Math.round(SIG * 100) + ' times in 100: that is the <b>5% significance level</b>.</p>' +
        '<p class="lo-verdict ' + (im.pOne < SIG ? 'yes' : im.diff <= 0 ? 'no' : 'maybe') + '">' + esc(verdict) + '</p>' +
        (im.diff > 0 ? '<p class="lo-small">The chance of seeing a rise at least this big if nothing had really changed: ' + esc(pTxt) + '.</p>' : '') +
        (changed.length ? '<p class="lo-small">What you changed: ' + changed.map(esc).join('; ') + '.</p>' : '') + '</div>';
    }
    h += rv('<h2 class="lo-title">Test Results</h2>' + top, 'lo-top');
    // 2. what a good one looks like
    const good = r.clips && r.clips.find((x) => x.key === 'beat');
    if (good || phase !== 'build') {
      const goodClip = r.clips && (phase === 'build' ? r.clips.find((x) => x.key === 'beat') : r.clips[0]);
      if (goodClip) h += rv('<h3>What it looks like when it works</h3><div id="loGood" class="rp"></div><p class="lo-small">Press play to watch one of the successful tests, with the passes drawn as arrows.</p>');
    }
    // 3. the rest
    const lostShare = 1 - rate, lostK = n - succ.k;
    if (lostK > 0) {
      const w = r.why;
      let sec = '<h3>What about the other ' + Math.round(lostShare * 100) + '%?</h3>';
      if (phase === 'build') {
        const zones = [['lostNear', 'Near your own goal', 'within 25 m: the dangerous ones'], ['lostOwn', 'In your own third', 'out to the edge of it'], ['lostMid', 'In midfield', 'before the halfway line'], ['still', 'Still going at 40 seconds', 'neither won nor lost']].filter(([k]) => r[k] && r[k].k > 0);
        sec += '<div class="lo-cols"><div><h4>Where it was lost</h4>' + zones.map(([k, l, note]) => '<div class="lo-bar"><span><b>' + esc(l) + '</b><small>' + esc(note) + '</small></span><i style="--w:' + Math.round((r[k].k / lostK) * 100) + '%"></i><em>' + r[k].k + ' of ' + lostK + '</em></div>').join('') +
          (r.shot && r.shot.k ? '<p class="lo-small">They went on to have a shot in ' + r.shot.k + ' of the ' + n + ' tests.</p>' : '') + '</div>';
        if (w && w.failedPasses >= 3) {
          const kinds = Object.keys(w.kinds).sort((a, b) => w.kinds[b] - w.kinds[a]);
          const md = Math.round(w.distSum / w.failedPasses), longN = w.long, shortN = w.failedPasses - w.long;
          sec += '<div><h4>How it was lost, and how far the pass went</h4>' +
            kinds.slice(0, 4).map((k) => '<div class="lo-bar"><span><b>' + esc(KIND_WORDS[k] || k) + '</b></span><i style="--w:' + Math.round((w.kinds[k] / w.n) * 100) + '%"></i><em>' + w.kinds[k] + ' of ' + w.n + '</em></div>').join('') +
            '<p>' + esc('Of the ' + w.failedPasses + ' passes that failed, ' + longN + ' were long (over 30 m) and ' + shortN + ' were short. The typical failed pass travelled ' + md + ' m' + (w.tight ? ', and ' + w.tight + ' of them went to a player with a defender right on him' : '') + '.') + '</p></div>';
        }
        sec += '</div>';
      } else {
        sec += '<p>' + esc(lostK + ' of the ' + n + ' tests did not get there.' + (w && w.n ? ' The most common reason: ' + KIND_WORDS[Object.keys(w.kinds).sort((a, b) => w.kinds[b] - w.kinds[a])[0]] + '.' : '')) + '</p>';
      }
      const kinds2 = w ? Object.keys(w.kinds).sort((a, b) => w.kinds[b] - w.kinds[a]) : [];
      const bad = r.clips && (r.clips.find((x) => x.key === kinds2[0]) || r.clips.find((x) => x.key !== 'beat'));
      if (bad) sec += '<h4>Here is one that went wrong: ' + esc(bad.label.charAt(0).toLowerCase() + bad.label.slice(1)) + '</h4><div id="loBad" class="rp"></div>';
      h += rv(sec);
    }
    // 4. instructions
    const ins = instructionsFor(r, phase), unsat = rate < sat;
    const tab = PREP_TAB[phase] || 'build';
    h += rv('<h3>Instructions</h3><p class="lo-small">' + (unsat ? 'These are the changes most likely to move the result, and what each one costs you.' : 'You are already getting good results. If you want to push further, these are the changes worth trying, and what each one costs you.') + '</p>' +
      '<div class="lo-ins">' + ins.map((x, k) => '<div class="lo-card"><b>' + (k + 1) + '. ' + esc(x.title) + '</b><p>' + esc(x.change) + '</p><p class="lo-cost"><em>The trade-off:</em> ' + esc(x.cost) + '</p><button type="button" class="el-go" data-tactics="' + tab + '">See tactics</button></div>').join('') + '</div>');
    // 5. what next
    const rec = unsat
      ? '<h3>Test it again</h3><p>We recommend making a change and testing again. It will be the same ' + n + ' tests as before, and we will be looking to <b>beat ' + pctWhole + '%</b>. The computer then checks whether any improvement is real or just luck, and tells you what it found at the top of the results.</p>'
      : '<h3>Ready for the match?</h3><p>This is a good result to take into the game. You can still test again if you want to push it further.</p>';
    h += rv(rec + '<div class="row"><button type="button" class="primary" data-act="again">' + (unsat ? 'Test again (' + n + ' tests)' : 'Test again anyway') + '</button><button type="button" class="el-go" data-tactics="' + tab + '">See tactics</button><button type="button" class="el-go" data-act="preview">Go to the match preview</button></div>');
    return h + '</div>';
  }

  // ---------- drawing it ----------
  // c: { opp, runs, a, b, st, team, tac, setCompare, clearRuns }
  FM.labResults = {
    // The results page: c = { phase, opp, team, runs, fresh, onAgain, onTactics(tab), onPreview }
    outcome(host, c) {
      if (!host) return;
      if (FM.labReplay) FM.labReplay.stop();
      host.innerHTML = outcomeHtml(c);
      host.querySelectorAll('[data-tactics]').forEach((b) => b.addEventListener('click', () => c.onTactics && c.onTactics(b.dataset.tactics)));
      const ag = host.querySelector('[data-act="again"]'); if (ag) ag.addEventListener('click', () => c.onAgain && c.onAgain());
      const pv = host.querySelector('[data-act="preview"]'); if (pv) pv.addEventListener('click', () => c.onPreview && c.onPreview());
      const r = c.runs[c.runs.length - 1].result;
      if (FM.labReplay && r.clips) {
        const g = host.querySelector('#loGood'), bd = host.querySelector('#loBad');
        const good = r.clips.find((x) => x.key === 'beat') || r.clips[0];
        if (g && good) FM.labReplay.mount(g, good.clip, { team: c.team, opp: c.opp });
        if (bd) {
          const w = r.why, kinds = w ? Object.keys(w.kinds).sort((a, b) => w.kinds[b] - w.kinds[a]) : [];
          const bad = r.clips.find((x) => x.key === kinds[0]) || r.clips.find((x) => x.key !== 'beat');
          if (bad) FM.labReplay.mount(bd, bad.clip, { team: c.team, opp: c.opp });
        }
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
