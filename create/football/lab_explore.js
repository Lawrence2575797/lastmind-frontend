// The detail behind a test result, as a searchable set of investigations like the Analysis page: every one of the tests in the run is kept as a small record
// (how it ended, where the ball was lost and how, the first pass, the shot), and each investigation here draws or tests something from those records.
// Nothing is written for the manager: each shows the figures, the pitch or the chart, and, where a pattern might be luck, the test that says so.
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const REV = { organised: true, transdef: true, press: true };
  const L = 105, W = 68, PS = 6, PW = L * PS, PH = W * PS;
  const pct = (a, b) => (b ? Math.round(100 * a / b) + '%' : '–'), f1 = (v) => (Math.round(v * 10) / 10).toFixed(1), f2 = (v) => (Math.round(v * 100) / 100).toFixed(2), sum = (a, f) => a.reduce((x, y) => x + (f ? f(y) : y), 0);
  const pfmt = (p) => (p < 0.001 ? '< 0.001' : p.toFixed(3));
  const KIND = { intercepted: 'Pass cut out', loose: 'Pass went astray', dribble: 'Lost in a dribble', tackle: 'Tackled', offside: 'Offside', other: 'Other' };
  const KIND_REV = { intercepted: 'You cut out their pass', loose: 'Their pass went astray', dribble: 'They lost it in a dribble', tackle: 'You won it in a tackle', offside: 'They were offside', other: 'Stopped another way' };
  const KCOL = { intercepted: '#ff8a7a', loose: '#f2c14e', dribble: '#c9a3ff', tackle: '#6fb7ff', offside: '#9fb0a8', other: '#7fe3a6' };
  const GREEN = '#7fe3a6', RED = '#ff8a7a', GOLD = '#f2c14e', BLUE = '#6fb7ff';
  const chi2p = (x, df) => (df > 0 && x >= 0 ? 1 - FM.STAT.gammaP(df / 2, x / 2) : 1);
  const wilson = (k, n) => { const w = FM.STAT.wilson(k, n, 0.95); return { lo: w.lo, hi: w.hi }; };
  const ciText = (k, n) => { if (!n) return '–'; const w = wilson(k, n); return Math.round(100 * w.lo) + '% to ' + Math.round(100 * w.hi) + '%'; };

  // ---------- the data ----------
  function ctxOf(c) {
    const run = c.runs[c.runs.length - 1], r = run.result, tests = r.tests || [], rev = !!REV[c.phase];
    const good = (t) => (rev ? t.o !== 'beat' : t.o === 'beat');   // a success for the manager
    // positions are kept with the attackers going left to right; in the tests of the opposition attacking you the picture is turned so that the manager's goal is on the left
    const X = (x) => (rev ? L - x : x), Y = (y) => (rev ? W - y : y);
    return { c, r, tests, rev, good, X, Y, n: r.n, phase: c.phase, K: rev ? KIND_REV : KIND, lostN: tests.filter((t) => t.lx != null).length };
  }
  const px = (x) => (x * PS).toFixed(1), py = (y) => (y * PS).toFixed(1);
  const pitch = (inner, label) => `<svg class="lx-pitch" viewBox="0 0 ${PW} ${PH}" role="img" aria-label="${esc(label)}">${FM.ANALYSIS_DRAW.pitchLines()}${inner}</svg>`;
  const E = () => FM.explorer;
  const prop = (k, n) => ({ n, f: { k, p: n ? k / n : 0 } });
  const compare = (a, b) => FM.lab.compare(prop(a.k, a.n), prop(b.k, b.n), 'f');
  const verdict = (p, n) => (n < 10 ? 'Too few tests to say' : p < 0.05 ? 'A real difference (p = ' + pfmt(p) + ')' : 'Could be luck (p = ' + p.toFixed(2) + ')');

  // ---------- the investigations ----------
  const INV = [];
  const add = (o) => INV.push(o);

  add({ id: 'ended', group: 'Overview', title: 'How the tests ended', tags: 'outcome result success rate interval confidence share lost won overview', blurb: 'Every outcome with its share and a 95% interval.',
    render(x) {
      const ROWS = [['beat', x.rev ? 'The attack got a shot away' : x.phase === 'final' || x.phase === 'transatt' ? 'Ended in a shot' : 'Got out clean'], ['lostNear', 'Ball lost near your goal'], ['lostOwn', 'Ball lost in your third'], ['lostMid', 'Ball lost in midfield'], ['still', 'Still going at the end']];
      const counts = {}; x.tests.forEach((t) => { counts[t.o] = (counts[t.o] || 0) + 1; });
      const rows = ROWS.map(([k, l]) => { const n = counts[k] || 0; return [l, n, pct(n, x.n), ciText(n, x.n)]; }).filter((r) => r[1] > 0);
      const bars = ROWS.filter(([k]) => counts[k]).map(([k, l]) => ({ l, v: counts[k], s: pct(counts[k], x.n), cls: k === 'beat' ? (x.rev ? 'bad' : 'good') : '' }));
      const ok = x.tests.filter(x.good).length, xg = sum(x.tests, (t) => t.xg || 0), shots = sum(x.tests, (t) => t.sh || 0);
      const tmean = x.tests.filter((t) => t.o === 'beat' && t.t != null).map((t) => t.t);
      return E().kpis([['Tests', x.n], ['Success', pct(ok, x.n), ciText(ok, x.n)], ['Shots', shots, f2(xg) + ' xG in all'], ['Passes a test', f1(sum(x.tests, (t) => t.np) / Math.max(1, x.tests.length)), pct(sum(x.tests, (t) => t.ok), sum(x.tests, (t) => t.np)) + ' completed'], ['Time to finish', tmean.length ? f1(FM.STAT.mean(tmean)) + ' s' : '–', tmean.length ? 'when it came off' : '']]) +
        `<div class="ex-cols"><div>${FM.charts.bars(bars, { w: 520, ml: 190, max: x.n })}</div><div>${E().table(['Outcome', 'Tests', 'Share', '95% interval'], rows)}</div></div>`;
    } });

  add({ id: 'where', group: 'Where', title: 'Where the ball was lost', tags: 'where lost won map location pitch thirds channels turnover danger zone dots', blurb: 'Every loss as a dot on the pitch, coloured by how it happened.', needs: 'lost',
    render(x) {
      const lost = x.tests.filter((t) => t.lx != null);
      let g = ''; lost.forEach((t) => { const k = t.ck || 'other'; g += `<circle cx="${px(x.X(t.lx))}" cy="${py(x.Y(t.ly))}" r="7" fill="${KCOL[k] || GOLD}" fill-opacity=".55" stroke="${KCOL[k] || GOLD}" stroke-width="1.6"><title>${esc((x.K[k] || k) + (t.cn ? ': ' + t.cn : '') + ', ' + (t.t != null ? t.t + ' s' : ''))}</title></circle>`; });
      g += `<text x="${PW - 10}" y="22" text-anchor="end" font-size="13" fill="#fff" stroke="#000" stroke-width="3" style="paint-order:stroke;font-family:Arial,sans-serif;font-weight:700">your goal on the left, you attack this way &#8594;</text>`;
      const kinds = Object.keys(KCOL).filter((k) => lost.some((t) => (t.ck || 'other') === k));
      const third = (xx) => (xx < 35 ? 0 : xx < 70 ? 1 : 2), chan = (yy) => (yy < 22.7 ? 0 : yy < 45.3 ? 1 : 2);
      const mat = [0, 1, 2].map(() => [0, 0, 0]); lost.forEach((t) => { mat[chan(x.Y(t.ly))][third(x.X(t.lx))]++; });
      const name = ['Left', 'Centre', 'Right'];
      return `<div class="ex-fig">${pitch(g, 'Where the ball was lost')}<div class="ex-legend">${kinds.map((k) => `<span><i style="background:${KCOL[k]}"></i>${esc(x.K[k] || k)}</span>`).join('')}</div></div>` +
        E().section('How many, by zone', E().table(['', 'Own third', 'Middle third', 'Final third'], mat.map((r, i) => [name[i] + ' channel'].concat(r.map((n) => n + (lost.length ? ' (' + pct(n, lost.length) + ')' : ''))))), lost.length + ' tests ended with the ball lost.');
    } });

  add({ id: 'weak', group: 'Where', title: 'Is there a weak spot?', tags: 'weak spot pattern luck chi square channel third zone concentration side left right significant', blurb: 'Whether the losses cluster in one area, or are just spread by chance.', needs: 'lost',
    render(x) {
      const lost = x.tests.filter((t) => t.lx != null);
      if (lost.length < 8) return '<p class="note">Only ' + lost.length + ' losses: too few to say whether they cluster. Run more tests.</p>';
      const test = (label, keyf, cats, expect) => {
        const obs = cats.map((_, i) => lost.filter((t) => keyf(t) === i).length), exp = expect.map((e) => e * lost.length), chi = sum(obs.map((o, i) => (exp[i] > 0 ? Math.pow(o - exp[i], 2) / exp[i] : 0))), p = chi2p(chi, cats.length - 1);
        return { label, cats, obs, exp, p };
      };
      const third = (t) => (x.X(t.lx) < 35 ? 0 : x.X(t.lx) < 70 ? 1 : 2), chan = (t) => (x.Y(t.ly) < 22.7 ? 0 : x.Y(t.ly) < 45.3 ? 1 : 2);
      const rows = [test('By third of the pitch', third, ['Own third', 'Middle third', 'Final third'], [1 / 3, 1 / 3, 1 / 3]), test('By side of the pitch', chan, ['Left', 'Centre', 'Right'], [0.33, 0.34, 0.33])];
      const byP = {}; lost.forEach((t) => { if (t.cn) byP[t.cn] = (byP[t.cn] || 0) + 1; });
      const players = Object.keys(byP).sort((a, b) => byP[b] - byP[a]);
      let who = '';
      if (players.length >= 2) {
        const top = players[0], k = byP[top], pEven = 1 / players.length, bt = 1 - FM.STAT.binomCdf(k - 1, lost.length, pEven);
        who = `<p class="ex-note">${esc(top)} was the man on the ball in ${k} of ${lost.length} losses. If it were spread evenly between the ${players.length} players involved, ${f1(lost.length * pEven)} would be expected: ${bt < 0.05 ? 'that is more than luck usually gives (p = ' + pfmt(bt) + ')' : 'that is within what luck gives (p = ' + bt.toFixed(2) + ')'}.</p>`;
      }
      return E().table(['Question', 'Observed', 'Expected if even', 'p-value', 'What it says'], rows.map((r) => [r.label, r.cats.map((c, i) => c + ' ' + r.obs[i]).join(', '), r.exp.map((e) => f1(e)).join(', '), pfmt(r.p), r.p < 0.05 ? '<b>A real weak spot</b>' : 'Spread about as chance would']), 'se-table') + who +
        '<p class="ex-note">A chi-square test compares where the losses happened with an even spread. A small p-value means the losses are bunched more than chance would produce.</p>';
    } });

  add({ id: 'how', group: 'How', title: 'How the ball was lost', tags: 'how lost cause kind intercepted tackle dribble astray offside pass distance lane pressure', blurb: 'Each way of losing it, with the length of the pass, the lane and the pressure.', needs: 'lost',
    render(x) {
      const lost = x.tests.filter((t) => t.ck);
      const by = {}; lost.forEach((t) => { (by[t.ck] = by[t.ck] || []).push(t); });
      const kinds = Object.keys(by).sort((a, b) => by[b].length - by[a].length);
      const avg = (a, f) => { const v = a.map(f).filter((v) => v != null); return v.length ? f1(FM.STAT.mean(v)) : '–'; };
      const rows = kinds.map((k) => [x.K[k] || k, by[k].length, pct(by[k].length, lost.length), avg(by[k], (t) => t.cd) + (by[k].some((t) => t.cd != null) ? ' m' : ''), avg(by[k], (t) => t.cl), avg(by[k], (t) => t.cp), pct(by[k].filter((t) => t.cw).length, by[k].length)]);
      return `<div class="ex-fig">${FM.charts.bars(kinds.map((k) => ({ l: x.K[k] || k, v: by[k].length, s: String(by[k].length), cls: x.rev ? 'good' : 'bad' })), { w: 560, ml: 190 })}</div>` +
        E().table(['How', 'Tests', 'Share', 'Pass length', 'Lane clearance (m)', 'Closest opponent (m)', 'Were being followed'], rows) +
        '<p class="ex-note">Lane clearance is the distance from the pass line to the nearest opponent; closest opponent is the distance to the receiver (or the man on the ball for a dribble).</p>';
    } });

  add({ id: 'players', group: 'How', title: 'Who it went through', tags: 'players who lost man on the ball responsible individual goalkeeper defender midfielder group', blurb: 'The player on the ball when it was lost, and the line he plays in.', needs: 'lost',
    render(x) {
      const lost = x.tests.filter((t) => t.cn), by = {}; lost.forEach((t) => { const b = by[t.cn] || (by[t.cn] = { n: 0, g: t.cg, kinds: {} }); b.n++; b.kinds[t.ck] = (b.kinds[t.ck] || 0) + 1; });
      const names = Object.keys(by).sort((a, b) => by[b].n - by[a].n), grp = {}; lost.forEach((t) => { grp[t.cg] = (grp[t.cg] || 0) + 1; });
      return `<div class="ex-cols"><div>${FM.charts.bars(names.slice(0, 10).map((n) => ({ l: n.split(' ').slice(-1)[0], v: by[n].n, s: String(by[n].n), cls: x.rev ? 'good' : 'bad' })), { w: 460, ml: 120 })}</div><div>${E().table(['Player', 'Line', 'Times', 'Mostly'], names.slice(0, 10).map((n) => { const k = Object.keys(by[n].kinds).sort((a, b) => by[n].kinds[b] - by[n].kinds[a])[0]; return [esc(n), by[n].g, by[n].n, esc(x.K[k] || k)]; }))}</div></div>` +
        E().section('By line', E().table(['Line', 'Times', 'Share'], Object.keys(grp).sort((a, b) => grp[b] - grp[a]).map((g) => [g, grp[g], pct(grp[g], lost.length)])));
    } });

  add({ id: 'first', group: 'Passing', title: 'The first pass', tags: 'first pass free man marked recipient short long distance completed receiver group success', blurb: 'Where the first pass went and what came of it.', needs: 'first',
    render(x) {
      const f = x.tests.filter((t) => t.fd != null); if (!f.length) return '<p class="note">No first passes recorded.</p>';
      const by = {}; f.forEach((t) => { const b = by[t.ft] || (by[t.ft] = { n: 0, ok: 0, win: 0 }); b.n++; if (t.fo) b.ok++; if (x.good(t)) b.win++; });
      const buckets = [['Under 10 m', 0, 10], ['10 to 20 m', 10, 20], ['20 to 30 m', 20, 30], ['30 m or more', 30, 999]].map(([l, a, b]) => { const s = f.filter((t) => t.fd >= a && t.fd < b); return [l, s.length, pct(s.filter((t) => t.fo).length, s.length), pct(s.filter(x.good).length, s.length), ciText(s.filter(x.good).length, s.length)]; });
      const planned = f.filter((t) => t.fr != null), free = planned.filter((t) => t.fr === 1), marked = planned.filter((t) => t.fr === 0);
      let free_ = '';
      if (planned.length >= 8) { const cmp = free.length >= 4 && marked.length >= 4 ? compare({ k: free.filter(x.good).length, n: free.length }, { k: marked.filter(x.good).length, n: marked.length }) : null; free_ = E().section('A free man or a marked one', E().table(['The first pass went to', 'Tests', 'Success'], [['A man with no opponent on him', free.length, pct(free.filter(x.good).length, free.length) + ' (' + ciText(free.filter(x.good).length, free.length) + ')'], ['A marked man', marked.length, pct(marked.filter(x.good).length, marked.length) + ' (' + ciText(marked.filter(x.good).length, marked.length) + ')']]) + (cmp ? `<p class="ex-note">${verdict(cmp.p, Math.min(free.length, marked.length) * 2)}.</p>` : '')); }
      return E().kpis([['First passes', f.length], ['Completed', pct(f.filter((t) => t.fo).length, f.length)], ['Average length', f1(sum(f, (t) => t.fd) / f.length) + ' m']]) +
        `<div class="ex-cols"><div>${E().section('By length', E().table(['Length', 'Tests', 'Completed', 'Success', '95% interval'], buckets))}</div><div>${E().section('By who received it', E().table(['Received by', 'Tests', 'Completed', 'Success'], Object.keys(by).sort((a, b) => by[b].n - by[a].n).map((g) => [g, by[g].n, pct(by[g].ok, by[g].n), pct(by[g].win, by[g].n)])))}</div></div>` + free_;
    } });

  add({ id: 'distance', group: 'Passing', title: 'Does a longer first pass hurt?', tags: 'distance length first pass long short welch t test compare successful unsuccessful correlation risk', blurb: 'The length of the first pass in the tests that worked, against the ones that did not.', needs: 'first',
    render(x) {
      const f = x.tests.filter((t) => t.fd != null), a = f.filter(x.good).map((t) => t.fd), b = f.filter((t) => !x.good(t)).map((t) => t.fd);
      if (a.length < 4 || b.length < 4) return '<p class="note">Needs at least four tests of each kind (' + a.length + ' worked, ' + b.length + ' did not).</p>';
      const w = FM.STAT.tWelch(a, b), ma = FM.STAT.mean(a), mb = FM.STAT.mean(b);
      const pts = f.map((t) => ({ k: x.good(t) ? 'mine' : 'peer', x: t.fd, y: x.good(t) ? 1 : 0, t: f1(t.fd) + ' m: ' + (x.good(t) ? 'worked' : 'did not') }));
      return E().table(['', 'Tests', 'Average first pass', 'Spread (sd)'], [['The tests that worked', a.length, f1(ma) + ' m', f1(FM.STAT.sd(a, true))], ['The tests that did not', b.length, f1(mb) + ' m', f1(FM.STAT.sd(b, true))]]) +
        `<p class="ex-note">The difference is ${f1(Math.abs(ma - mb))} m. ${w.p < 0.05 ? 'That is bigger than luck would usually give (Welch t-test, p = ' + pfmt(w.p) + '): the length of the first pass matters in this set-up.' : 'That is within what luck gives (Welch t-test, p = ' + w.p.toFixed(2) + '): the tests do not show that the length of the first pass matters.'}</p>` +
        `<div class="ex-fig">${FM.charts.scatter(pts, { h: 240, xl: 'First pass length (m)', yl: 'Worked (1) or not (0)', yTicks: [0, 1] })}</div>`;
    } });

  add({ id: 'timing', group: 'Timing', title: 'How long things took', tags: 'time seconds duration speed timing histogram how long quick slow', blurb: 'The time each test took, for the ones that worked and the ones that did not.', needs: 'time',
    render(x) {
      const t = x.tests.filter((q) => q.t != null), a = t.filter((q) => q.o === 'beat').map((q) => q.t), b = t.filter((q) => q.o !== 'beat' && q.o !== 'still').map((q) => q.t);
      const edges = [0, 3, 6, 9, 12, 15, 20, 30, 999], lab = ['0 to 3 s', '3 to 6 s', '6 to 9 s', '9 to 12 s', '12 to 15 s', '15 to 20 s', '20 to 30 s', '30 s or more'];
      const rows = lab.map((l, i) => [l, t.filter((q) => q.o === 'beat' && q.t >= edges[i] && q.t < edges[i + 1]).length, t.filter((q) => q.o !== 'beat' && q.o !== 'still' && q.t >= edges[i] && q.t < edges[i + 1]).length]).filter((r) => r[1] + r[2] > 0);
      const mean = (v) => (v.length ? f1(FM.STAT.mean(v)) + ' s' : '–');
      return E().kpis([['Quickest', t.length ? f1(Math.min.apply(null, t.map((q) => q.t))) + ' s' : '–'], ['Average when it came off', mean(a), a.length > 1 ? 'sd ' + f1(FM.STAT.sd(a, true)) : ''], ['Average to a loss', mean(b)]]) +
        `<div class="ex-fig">${FM.charts.bars(rows.map((r) => ({ l: r[0], v: r[1] + r[2], s: r[1] + ' + ' + r[2] })), { w: 560, ml: 120 })}<p class="ex-note">Each bar is the number of tests that finished in that time: the first figure came off, the second ended with the ball lost.</p></div>` + E().table(['Time', 'Came off', 'Ball lost'], rows);
    } });

  add({ id: 'shots', group: 'Shots', title: 'Shots in the tests', tags: 'shots xg expected goals chances map room defender header close distance quality', blurb: 'Every shot in the run: where from, how good, how much room.', needs: 'shots',
    render(x) {
      const sh = x.tests.filter((t) => t.sx != null); if (!sh.length) return '<p class="note">No shots in this run.</p>';
      let g = ''; sh.forEach((t) => { g += `<circle cx="${px(x.X(t.sx))}" cy="${py(x.Y(t.sy))}" r="${(5 + Math.sqrt(t.xg || 0.05) * 16).toFixed(1)}" fill="${t.g ? GREEN : GOLD}" fill-opacity=".6" stroke="#fff" stroke-width="1.2"><title>xG ${f2(t.xg || 0)}${t.sd != null ? ', defender ' + t.sd + ' m away' : ''}${t.g ? ', goal' : ''}</title></circle>`; });
      const rooms = [['Under 2 m (closed down)', 0, 2], ['2 to 4 m', 2, 4], ['4 m or more', 4, 999]].map(([l, a, b]) => { const s = sh.filter((t) => t.sd != null && t.sd >= a && t.sd < b); return [l, s.length, s.length ? f2(sum(s, (t) => t.xg || 0) / s.length) : '–', s.filter((t) => t.g).length]; });
      return E().kpis([['Shots', sh.length, pct(sh.length, x.n) + ' of tests'], ['Expected goals', f2(sum(sh, (t) => t.xg || 0)), f2(sum(sh, (t) => t.xg || 0) / sh.length) + ' a shot'], ['Goals', sum(sh, (t) => t.g || 0)], ['Headers', sum(sh, (t) => t.hd || 0)]]) +
        `<div class="ex-fig">${pitch(g, 'Shots')}<p class="ex-note">Circle size is the quality of the chance. Green is a goal. ${x.rev ? 'These are their shots at your goal, on the left.' : ''}</p></div>` + E().section('By how much room the shooter had', E().table(['Defender', 'Shots', 'Average xG', 'Goals'], rooms));
    } });

  add({ id: 'press', group: 'Opposition', title: 'How they pressed, and what it did', tags: 'press pressing high mid low block shape opposition compare success rate significance', blurb: 'The shape of their press in each test and how you fared against each.', needs: 'shape',
    render(x) {
      const f = x.tests.filter((t) => t.fs); if (f.length < 8) return '<p class="note">The press shape was recorded for ' + f.length + ' tests: too few to compare.</p>';
      const names = { high: 'Pressed high', mid: 'Mid-block', low: 'Dropped off' }, kinds = ['high', 'mid', 'low'].filter((k) => f.some((t) => t.fs === k));
      const rows = kinds.map((k) => { const s = f.filter((t) => t.fs === k), ok = s.filter(x.good).length; return [names[k], s.length, pct(s.length, f.length), pct(ok, s.length), ciText(ok, s.length)]; });
      const seen = kinds.map((k) => ({ k, s: f.filter((t) => t.fs === k) })).filter((o) => o.s.length >= 6).sort((a, b) => b.s.length - a.s.length);
      let cmp = ''; if (seen.length >= 2) { const a = seen[0], b = seen[1], c = compare({ k: a.s.filter(x.good).length, n: a.s.length }, { k: b.s.filter(x.good).length, n: b.s.length }); cmp = `<p class="ex-note">${names[a.k]} against ${names[b.k].toLowerCase()}: ${verdict(c.p, Math.min(a.s.length, b.s.length) * 2)}.</p>`; }
      return E().table(['Their shape', 'Tests', 'Share of tests', 'Your success', '95% interval'], rows) + cmp;
    } });

  add({ id: 'runs', group: 'Runs', title: 'Across your runs', tags: 'runs compare change improvement trend history luck significance pooled confidence interval each run', blurb: 'Every run so far, with its interval, and whether each change was real.', needs: 'runs',
    render(x) {
      const runs = x.c.runs, ph = x.phase, share = (res) => (REV[ph] ? { k: res.n - res.beat.k, n: res.n } : { k: res.beat.k, n: res.n });
      const rows = runs.map((run, i) => { const s = share(run.result), prev = i ? share(runs[i - 1].result) : null, cm = prev ? compare(s, prev) : null; return [i + 1, s.n, s.k + ' (' + pct(s.k, s.n) + ')', ciText(s.k, s.n), prev ? ((s.k / s.n - prev.k / prev.n) >= 0 ? '+' : '−') + Math.abs(Math.round(100 * (s.k / s.n - prev.k / prev.n))) + ' points' : '–', cm ? (cm.p < 0.05 ? '<b>Real</b> (p = ' + pfmt(cm.p) + ')' : 'Could be luck (p = ' + cm.p.toFixed(2) + ')') : '–']; });
      const pts = runs.map((run, i) => { const s = share(run.result), w = wilson(s.k, s.n); return { v: [i + 1, 100 * s.k / s.n], lo: [i + 1, 100 * w.lo], hi: [i + 1, 100 * w.hi] }; });
      const chart = runs.length >= 2 ? FM.charts.lines([{ label: 'Success', pts: pts.map((p) => p.v), cls: 'gold' }, { label: '95% interval', pts: pts.map((p) => p.hi), cls: 'blue', dash: true }, { label: 'Lower limit', pts: pts.map((p) => p.lo), cls: 'blue', dash: true }], { h: 260, xl: 'Run', yl: 'Success (%)', x0: 1, x1: Math.max(2, runs.length), y0: 0, y1: 100 }) : '';
      return (chart ? `<div class="ex-fig">${chart}</div>` : '') + E().table(['Run', 'Tests', 'Successful', '95% interval', 'Change', 'Was it real?'], rows, 'se-table') + '<p class="ex-note">Each change is tested against the run before it: a small p-value means the move is bigger than the run-to-run luck of 100 tests.</p>';
    } });

  add({ id: 'passing', group: 'Passing', title: 'Passing in the tests', tags: 'passes completion expected made per test accuracy lanes distribution histogram', blurb: 'How many passes a test took, and how they compared with what they should have been.', needs: 'passes',
    render(x) {
      const np = x.tests.map((t) => t.np), ok = x.tests.map((t) => t.ok), ps = x.r.passStats || {}, edges = [0, 1, 2, 3, 4, 6, 8, 12, 999], lab = ['None', '1', '2', '3', '4 to 5', '6 to 7', '8 to 11', '12 or more'];
      const rows = lab.map((l, i) => [l, x.tests.filter((t) => t.np >= edges[i] && t.np < edges[i + 1]).length]).filter((r) => r[1] > 0);
      return E().kpis([['Passes a test', f1(FM.STAT.mean(np)), 'sd ' + f1(FM.STAT.sd(np, true))], ['Completed', pct(sum(ok), sum(np))], ps.expected != null ? ['What the lanes allowed', Math.round(100 * ps.expected) + '%', ps.rate >= ps.expected ? 'you beat it' : 'you fell short'] : ['', '']].filter((r) => r[0])) +
        `<div class="ex-fig">${FM.charts.bars(rows.map((r) => ({ l: r[0] + ' passes', v: r[1], s: String(r[1]) })), { w: 520, ml: 130 })}</div>`;
    } });

  // ---------- the panel ----------
  const GROUPS = ['All', 'Overview', 'Where', 'How', 'Passing', 'Timing', 'Shots', 'Opposition', 'Runs'];
  const ST = { q: '', group: 'All', sel: 'ended' };
  const css = '.lx { display: grid; gap: 12px; } .lx-layout { display: grid; grid-template-columns: minmax(220px, 280px) minmax(0, 1fr); gap: 14px; align-items: start; } @media (max-width: 900px) { .lx-layout { grid-template-columns: minmax(0, 1fr); } } .lx-pitch { width: 100%; max-width: 640px; height: auto; display: block; } .lx input[type=search] { background: #2f3533; color: var(--cream); border: 1px solid var(--line); padding: 8px 10px; font: inherit; width: 100%; box-sizing: border-box; } .lx .ex-view { padding: 14px; } .lx .ex-view > h3 { font-size: 1.1rem; }';

  function mount(host, c) {
    if (!host) return;
    if (!E()) { host.innerHTML = ''; return; }
    E().ensureCss(); if (!document.getElementById('lxCss')) { const st = document.createElement('style'); st.id = 'lxCss'; st.textContent = css; document.head.appendChild(st); }
    const x = ctxOf(c), has = { lost: x.tests.some((t) => t.lx != null || t.cn), first: x.tests.some((t) => t.fd != null), shots: x.tests.some((t) => t.sx != null), shape: x.tests.some((t) => t.fs), time: x.tests.some((t) => t.t != null), passes: x.tests.length > 0, runs: c.runs.length >= 1 };
    if (!x.tests.length) { host.innerHTML = '<div class="ex-sec"><h4>Investigate the tests</h4><p class="note">This run was saved before every test was kept. Run it again to investigate it in detail.</p></div>'; return; }
    const avail = (i) => !i.needs || has[i.needs] !== false;
    const draw = () => {
      const q = ST.q.trim().toLowerCase(), words = q.split(/\s+/).filter(Boolean);
      const items = INV.filter(avail).filter((i) => (ST.group === 'All' || i.group === ST.group) && words.every((w) => (i.title + ' ' + i.tags + ' ' + i.blurb + ' ' + i.group).toLowerCase().indexOf(w) >= 0));
      if (!INV.filter(avail).some((i) => i.id === ST.sel)) ST.sel = INV.filter(avail)[0].id;
      const cur = INV.find((i) => i.id === ST.sel);
      let body; try { body = cur.render(x); } catch (e) { body = '<p class="note">This could not be drawn from the tests (' + esc(e && e.message) + ').</p>'; if (window.console) console.error(e); }
      host.innerHTML = `<div class="lx"><div class="ex-sec"><h4>Investigate the ${x.n} tests</h4><input type="search" id="lxQ" placeholder="Search: where it was lost, first pass, shots, press, runs ..." value="${esc(ST.q)}" aria-label="Search the tests"></div>
        <div class="ex-chips">${GROUPS.map((g) => `<button type="button" data-lxg="${g}" class="${g === ST.group ? 'on' : ''}">${g}</button>`).join('')}</div>
        <div class="lx-layout"><div class="ex-list">${items.length ? items.map((i) => `<button type="button" class="ex-item ${i.id === ST.sel ? 'on' : ''}" data-lxi="${i.id}"><i>${esc(i.group)}</i><b>${esc(i.title)}</b><small>${esc(i.blurb)}</small></button>`).join('') : '<div class="ex-empty">Nothing matches that. Try "lost", "pass", "shots" or "press".</div>'}</div>
        <div class="ex-view"><h3>${esc(cur.title)}</h3>${body}</div></div></div>`;
      host.querySelectorAll('[data-lxi]').forEach((b) => b.addEventListener('click', () => { ST.sel = b.dataset.lxi; draw(); }));
      host.querySelectorAll('[data-lxg]').forEach((b) => b.addEventListener('click', () => { ST.group = b.dataset.lxg; draw(); }));
      const qi = host.querySelector('#lxQ'); qi.addEventListener('input', () => { ST.q = qi.value; const pos = qi.selectionStart; draw(); const n = host.querySelector('#lxQ'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* fine */ } });
    };
    draw();
  }
  FM.labExplore = { mount, INV };
})();
