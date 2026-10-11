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

  // ---------- drawing it ----------
  // c: { opp, runs, a, b, st, team, tac, setCompare, clearRuns }
  FM.labResults = {
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
