/*
 * Be the Chancellor: the Treasury analysis unit.
 * At University level the Chancellor is also the analyst: pick a policy, look at what happened in peer countries that tried it, choose a method,
 * run it, test it, weigh the costs and benefits, then commit to an estimate and see how close it was to the truth.
 * At A-level the Treasury's analyst does this and brings the results as a briefing to read. Both use the same data (econLab.js) and the same
 * estimators (econStats.js). Every step has a "Learn this" button that opens a from-scratch lesson in the right-hand panel.
 */
(function (root) {
  'use strict';
  var Lab = function () { return root.LMLab; }, St = function () { return root.LMStats; }, E = function () { return root.LMEcon; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var f2 = function (x) { return isFinite(x) ? (Math.round(x * 100) / 100).toFixed(2) : 'n/a'; };
  var sg = function (x) { return (x >= 0 ? '+' : '−') + Math.abs(Math.round(x * 100) / 100).toFixed(2); };
  var pfmt = function (p) { return p == null || !isFinite(p) ? 'n/a' : (p < 0.001 ? 'p < 0.001' : 'p = ' + p.toFixed(3)); };
  var OUT = { g: ['GDP growth', 'percentage points'], pi: ['Inflation', 'percentage points'], u: ['Unemployment', 'percentage points'], deficit: ['Budget deficit', '% of GDP'], debtGDP: ['Public debt', '% of GDP'], T: ['Tax revenue', '% of GDP'] };
  var METHODS = [
    ['before', 'Before and after', 'beforeafter'], ['did22', 'Adopters vs the rest (2×2)', 'did'], ['twfe', 'Fixed-effects regression', 'twfe'],
    ['event', 'Event study and pre-trends', 'event'], ['synth', 'Synthetic control', 'synth'], ['ri', 'Randomisation test', 'inference'],
  ];
  var cache = {};                                                   // panels and results are rebuilt from the seed, never saved
  var ctx = null;                                                   // what the page gives us: the game, the helpers and callbacks

  /* ---------- small drawing helpers (SVG as strings) ---------- */
  function scale(lo, hi, a, b) { var span = hi - lo || 1; return function (v) { return a + (v - lo) / span * (b - a); }; }
  function ticks(lo, hi, n) { var step = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log10(step || 1))), r = step / mag, s = (r < 1.5 ? 1 : r < 3.5 ? 2 : r < 7.5 ? 5 : 10) * mag, out = []; for (var v = Math.ceil(lo / s) * s; v <= hi + 1e-9; v += s) out.push(Math.round(v / s) * s); return out; }
  function frame(w, h, m, xlo, xhi, ylo, yhi, xlab, ylab) {
    var X = scale(xlo, xhi, m.l, w - m.r), Y = scale(ylo, yhi, h - m.b, m.t), g = '';
    ticks(ylo, yhi, 4).forEach(function (t) { g += '<line x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + Y(t) + '" y2="' + Y(t) + '" stroke="rgba(0,0,0,.12)"/><text x="' + (m.l - 6) + '" y="' + (Y(t) + 4) + '" text-anchor="end" font-size="11" fill="currentColor">' + (Math.round(t * 100) / 100) + '</text>'; });
    ticks(xlo, xhi, 6).forEach(function (t) { g += '<text x="' + X(t) + '" y="' + (h - m.b + 16) + '" text-anchor="middle" font-size="11" fill="currentColor">' + t + '</text>'; });
    g += '<text x="' + (w / 2) + '" y="' + (h - 4) + '" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">' + esc(xlab || '') + '</text>';
    g += '<text transform="translate(12 ' + (h / 2) + ') rotate(-90)" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">' + esc(ylab || '') + '</text>';
    return { X: X, Y: Y, g: g };
  }
  function line(pts, X, Y, color, opts) { opts = opts || {}; return '<polyline fill="none" stroke="' + color + '" stroke-width="' + (opts.w || 2) + '"' + (opts.dash ? ' stroke-dasharray="' + opts.dash + '"' : '') + ' opacity="' + (opts.o || 1) + '" points="' + pts.map(function (p) { return X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); }).join(' ') + '"/>'; }
  function legend(items, x, y) { return items.map(function (it, i) { return '<g transform="translate(' + (x + i * 150) + ' ' + y + ')"><line x1="0" x2="18" y1="0" y2="0" stroke="' + it[1] + '" stroke-width="3"' + (it[2] ? ' stroke-dasharray="4 3"' : '') + '/><text x="23" y="4" font-size="11" fill="currentColor">' + esc(it[0]) + '</text></g>'; }).join(''); }
  function svgWrap(w, h, inner, label) { return '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(label || 'chart') + '" style="width:100%;height:auto;color:#111">' + inner + '</svg>'; }

  function panelChart(p, key) {
    var w = 640, h = 260, m = { l: 46, r: 12, t: 28, b: 38 }, qs = []; for (var q = 1; q <= p.Q; q++) qs.push(q);
    var by = function (flag) { return qs.map(function (q) { var rs = p.rows.filter(function (r) { return r.q === q && (flag ? r.cohort : !r.cohort); }); return [q, rs.reduce(function (s, r) { return s + r[key]; }, 0) / (rs.length || 1)]; }); };
    var tr = by(true), ct = by(false), all = tr.concat(ct).map(function (a) { return a[1]; }), lo = Math.min.apply(null, all), hi = Math.max.apply(null, all), pad = (hi - lo) * 0.12 || 0.5;
    var fr = frame(w, h, m, 1, p.Q, lo - pad, hi + pad, 'Quarter', OUT[key][0]);
    var marks = p.units.filter(function (u) { return u.treated; }).map(function (u) { return '<line x1="' + fr.X(u.tq) + '" x2="' + fr.X(u.tq) + '" y1="' + m.t + '" y2="' + (h - m.b) + '" stroke="#b45309" stroke-dasharray="2 4" opacity=".55"/>'; }).join('');
    return svgWrap(w, h, fr.g + marks + line(ct, fr.X, fr.Y, '#64748b') + line(tr, fr.X, fr.Y, '#0a5f8f', { w: 2.6 }) + legend([['Countries that adopted', '#0a5f8f'], ['Countries that did not', '#64748b']], m.l, 14), 'Average ' + OUT[key][0] + ' for adopting and non-adopting countries; dotted lines mark adoption dates');
  }
  function dotWhisker(points, opts) {
    opts = opts || {}; var w = 640, h = 270, m = { l: 50, r: 14, t: 18, b: 40 }, xs = points.map(function (p) { return p.k; }), lo = Math.min.apply(null, points.map(function (p) { return p.ci[0]; }).concat([0])), hi = Math.max.apply(null, points.map(function (p) { return p.ci[1]; }).concat([0])), pad = (hi - lo) * 0.1 || 0.3;
    var fr = frame(w, h, m, Math.min.apply(null, xs) - 0.5, Math.max.apply(null, xs) + 0.5, lo - pad, hi + pad, 'Quarters since adoption', opts.ylab || 'Effect'), g = fr.g;
    g += '<line x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + fr.Y(0) + '" y2="' + fr.Y(0) + '" stroke="#111" opacity=".5"/>';
    g += '<line x1="' + fr.X(-0.5) + '" x2="' + fr.X(-0.5) + '" y1="' + m.t + '" y2="' + (h - m.b) + '" stroke="#b45309" stroke-dasharray="3 4"/>';
    points.forEach(function (p) { var x = fr.X(p.k); if (!p.ref) g += '<line x1="' + x + '" x2="' + x + '" y1="' + fr.Y(p.ci[0]) + '" y2="' + fr.Y(p.ci[1]) + '" stroke="' + (p.k < -1 ? '#7c3aed' : '#0a5f8f') + '" stroke-width="1.6"/>'; g += '<circle cx="' + x + '" cy="' + fr.Y(p.est) + '" r="' + (p.ref ? 3 : 4) + '" fill="' + (p.ref ? '#fff' : (p.k < -1 ? '#7c3aed' : '#0a5f8f')) + '" stroke="#111" stroke-width=".8"/>'; });
    return svgWrap(w, h, g, 'Estimated effect by quarters since adoption with 95% confidence intervals');
  }
  function synthChart(sc, key) {
    var w = 640, h = 260, m = { l: 46, r: 12, t: 28, b: 38 }, qs = sc.path.map(function (p) { return p.q; }), vals = sc.path.map(function (p) { return p.actual; }).concat(sc.path.map(function (p) { return p.synth; })), lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), pad = (hi - lo) * 0.12 || 0.5;
    var fr = frame(w, h, m, qs[0], qs[qs.length - 1], lo - pad, hi + pad, 'Quarter', OUT[key][0]);
    return svgWrap(w, h, fr.g + '<line x1="' + fr.X(sc.tq) + '" x2="' + fr.X(sc.tq) + '" y1="' + m.t + '" y2="' + (h - m.b) + '" stroke="#b45309" stroke-dasharray="3 4"/>' + line(sc.path.map(function (p) { return [p.q, p.synth]; }), fr.X, fr.Y, '#64748b', { dash: '5 4', w: 2.4 }) + line(sc.path.map(function (p) { return [p.q, p.actual]; }), fr.X, fr.Y, '#0a5f8f', { w: 2.6 }) + legend([['The country that adopted', '#0a5f8f'], ['Its synthetic control', '#64748b', 1]], m.l, 14), 'The adopting country against its synthetic control');
  }
  function placeboChart(sc) {
    var w = 640, h = 240, m = { l: 46, r: 12, t: 28, b: 38 }, all = sc.placebos.map(function (p) { return p.path; }).concat([sc.path]), vals = []; all.forEach(function (pa) { pa.forEach(function (p) { vals.push(p.gap); }); });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), pad = (hi - lo) * 0.1 || 0.3, qs = sc.path.map(function (p) { return p.q; }), fr = frame(w, h, m, qs[0], qs[qs.length - 1], lo - pad, hi + pad, 'Quarter', 'Gap from synthetic control');
    var g = fr.g + '<line x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + fr.Y(0) + '" y2="' + fr.Y(0) + '" stroke="#111" opacity=".4"/><line x1="' + fr.X(sc.tq) + '" x2="' + fr.X(sc.tq) + '" y1="' + m.t + '" y2="' + (h - m.b) + '" stroke="#b45309" stroke-dasharray="3 4"/>';
    sc.placebos.forEach(function (p) { g += line(p.path.map(function (x) { return [x.q, x.gap]; }), fr.X, fr.Y, '#94a3b8', { w: 1.2, o: 0.8 }); });
    g += line(sc.path.map(function (x) { return [x.q, x.gap]; }), fr.X, fr.Y, '#0a5f8f', { w: 3 }) + legend([['The adopting country', '#0a5f8f'], ['Untreated countries, treated as if they had adopted', '#94a3b8']], m.l, 14);
    return svgWrap(w, h, g, 'Placebo test: gaps for the adopting country and for countries that did not adopt');
  }
  function histogram(draws, mark, opts) {
    opts = opts || {}; var w = 640, h = 220, m = { l: 40, r: 12, t: 14, b: 38 }, lo = Math.min.apply(null, draws), hi = Math.max.apply(null, draws), bins = 28, bw = (hi - lo) / bins || 1, cnt = new Array(bins).fill(0);
    draws.forEach(function (d) { cnt[Math.min(bins - 1, Math.floor((d - lo) / bw))]++; });
    var mx = Math.max.apply(null, cnt), X = scale(lo, hi, m.l, w - m.r), Y = scale(0, mx, h - m.b, m.t), g = '';
    ticks(lo, hi, 6).forEach(function (t) { g += '<text x="' + X(t) + '" y="' + (h - m.b + 16) + '" text-anchor="middle" font-size="11" fill="currentColor">' + t + '</text>'; });
    cnt.forEach(function (c, i) { var x0 = X(lo + i * bw), x1 = X(lo + (i + 1) * bw), mid = lo + (i + 0.5) * bw; g += '<rect x="' + x0 + '" y="' + Y(c) + '" width="' + Math.max(1, x1 - x0 - 1) + '" height="' + (h - m.b - Y(c)) + '" fill="' + (mid < 0 ? '#b42318' : '#1f7a4d') + '" opacity=".75"/>'; });
    if (lo < 0 && hi > 0) g += '<line x1="' + X(0) + '" x2="' + X(0) + '" y1="' + m.t + '" y2="' + (h - m.b) + '" stroke="#111" stroke-width="1.6"/>';
    if (mark != null) g += '<line x1="' + X(mark) + '" x2="' + X(mark) + '" y1="' + m.t + '" y2="' + (h - m.b) + '" stroke="#0a5f8f" stroke-width="2" stroke-dasharray="5 3"/>';
    g += '<text x="' + (w / 2) + '" y="' + (h - 4) + '" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">' + esc(opts.xlab || 'Net benefit') + '</text>';
    return svgWrap(w, h, g, 'Distribution of the net benefit across simulations');
  }

  /* ---------- running things ---------- */
  function inv(id) { return (ctx.g.analyses || []).filter(function (a) { return a.id === id; })[0]; }
  function leverMeta(id) { return ctx.catalogue().filter(function (e) { return e.id === id; })[0]; }
  function panelFor(a) {
    var key = 'p:' + a.id; if (cache[key]) return cache[key];
    cache[key] = Lab().peerPanel({ pf: ctx.g.pf, lever: { id: a.leverId, v: a.v, opt: a.opt || null }, units: 20, treated: 8, Q: 36, noise: a.noise, selection: a.selection, seed: a.seed });
    return cache[key];
  }
  function rngFor(a, tag) { var h = 0; String(a.seed + tag).split('').forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) >>> 0; }); return E().mulberry(h); }
  function run(a, method, key, extra) {
    var ck = 'r:' + a.id + ':' + method + ':' + key + ':' + JSON.stringify(extra || {}); if (cache[ck]) return cache[ck];
    var p = panelFor(a), s = St(), res;
    if (method === 'before') res = s.beforeAfter(p.rows, key, 6);
    else if (method === 'did22') res = s.did2x2(p.rows, key, 6);
    else if (method === 'twfe') res = s.twfe(p.rows, key);
    else if (method === 'event') { var bk = (extra && extra.baseK) || -1; res = { twfe: s.eventStudy(p.rows, key, 6, 10), clean: s.groupTime(p.rows, key, { reps: 200, rng: rngFor(a, 'gt' + key + bk), lag: p.lag, baseK: bk, minK: bk === -1 ? -6 : -10 }), baseK: bk }; }
    else if (method === 'synth') res = s.syntheticControl(p.rows, key, (extra && extra.unit) || p.units.filter(function (u) { return u.treated; })[0].id, { lag: p.lag });
    else if (method === 'ri') res = s.randomisationInference(p.rows, key, 400, rngFor(a, 'ri' + key));
    cache[ck] = res; return res;
  }
  function cbaRun(a, params) {
    var ck = 'cba:' + a.id + ':' + JSON.stringify(params); if (cache[ck]) return cache[ck];
    var ens = ctx.S.ensemble(ctx.g, 16, [{ id: a.leverId, v: a.v, opt: a.opt || null }], 200, a.seed % 100000, 1);
    var r = St().cba(ens, Object.assign({ rng: rngFor(a, 'cba') }, params)); cache[ck] = r; return r;
  }
  var CBA_DEFAULT = { rate: 3.5, mcpf: 0.25, inequalityAversion: 0, tail: 0.5, effectSpread: 0.3 };
  function cbaParams(a) { return Object.assign({}, CBA_DEFAULT, a.cbaParams || {}); }

  /* ---------- plain-English readings of results ---------- */
  function unitText(key) { return OUT[key][1]; }
  function readEffect(res, key, what) {
    var lo = res.ci[0], hi = res.ci[1], zero = lo <= 0 && hi >= 0, dir = res.est > 0 ? 'higher' : 'lower';
    return '<b>' + OUT[key][0] + ' was about ' + f2(Math.abs(res.est)) + ' ' + unitText(key) + ' ' + dir + '</b> in countries that adopted it (' + what + '). The 95% confidence interval runs from ' + sg(lo) + ' to ' + sg(hi) + ', and ' + pfmt(res.p) + '. ' +
      (zero ? 'The interval includes zero, so this evidence cannot rule out that the policy did nothing.' : 'The interval does not include zero, so chance alone is an unlikely explanation, as long as the method\'s assumptions hold.');
  }

  /* ---------- screens ---------- */
  function layout(inner) { return '<div class="an-wrap">' + inner + '</div>'; }
  function learnBtn(ch, label) { return '<button type="button" class="chn-btn small an-learn" data-learn="' + ch + '">' + esc(label || 'Learn this') + '</button>'; }
  function cur() { return ctx.g.analysisOpen ? inv(ctx.g.analysisOpen) : null; }
  function render(host, c) {
    ctx = c; var g = ctx.g; g.analyses = g.analyses || []; var a = cur();
    var list = '<aside class="an-list"><button type="button" class="chn-btn primary" data-an="new" style="width:100%">+ New investigation</button>' +
      (g.analyses.length ? '<div class="gh">Your investigations</div>' + g.analyses.map(function (x) { var e = leverMeta(x.leverId); return '<button type="button" class="an-item' + (a && a.id === x.id ? ' on' : '') + '" data-an-open="' + x.id + '"><b>' + esc(e ? e.name : x.leverId) + '</b><small>' + (x.decision ? 'Decided' : 'In progress') + '</small></button>'; }).join('') : '<p class="neutral" style="font-size:.84rem;margin:10px 4px">Pick a policy you are thinking about and find out what the evidence says before you commit to it.</p>') + '</aside>';
    var body;
    if (!a) body = newForm();
    else if (ctx.level === 'alevel') body = briefing(a);
    else body = workspace(a);
    host.innerHTML = layout(list + '<section class="an-main">' + body + '</section>');
    bind(host);
  }

  function newForm() {
    var cat = ctx.visibleLevers(), groups = ctx.groups(), d = ctx.draftLevers();
    var opts = groups.map(function (gp) { return '<optgroup label="' + esc(gp.name) + '">' + gp.areas.map(function (ar) { return ar.list.filter(function (e) { return e.ctl.t === 'slider'; }).map(function (e) { return '<option value="' + e.id + '">' + esc(e.name) + '</option>'; }).join(''); }).join('') + '</optgroup>'; }).join('');
    var fromDraft = d.length ? '<p class="neutral" style="font-size:.86rem">In your draft: ' + d.map(function (x) { return '<button type="button" class="chn-btn small" data-an-from="' + x.id + '|' + x.v + '">' + esc(x.name) + ' (' + esc(x.badge) + ')</button>'; }).join(' ') + '</p>' : '';
    return '<h2 style="margin:0 0 6px">Investigate a policy</h2><p class="neutral" style="margin:0 0 12px">' + (ctx.level === 'alevel' ? 'Choose a policy and the Treasury analyst will study what happened in other countries that tried it, and bring you a briefing.' : 'You are the analyst. Choose a policy and a size, and you will work out what it would do, using evidence from countries that have already tried something like it.') + '</p>' + fromDraft +
      '<div class="an-form"><label>Policy<select id="anLever">' + opts + '</select></label><label>Size you are considering<input type="number" id="anV" step="0.5"></label><label>The outcome you care most about<select id="anOut">' + Object.keys(OUT).map(function (k) { return '<option value="' + k + '">' + OUT[k][0] + '</option>'; }).join('') + '</select></label></div>' +
      '<p id="anUnit" class="neutral" style="font-size:.84rem;margin:6px 0 12px"></p><button type="button" class="chn-btn primary" data-an="create">Open the investigation</button>';
  }

  function steps(a) { return [['question', '1 Question'], ['data', '2 Data'], ['evidence', '3 Evidence'], ['cba', '4 Cost and benefit'], ['decide', '5 Decide']]; }
  function header(a) {
    var e = leverMeta(a.leverId), cur2 = a.step || 'question';
    return '<div class="an-head"><div><div class="neutral" style="font-size:.74rem;letter-spacing:.08em;text-transform:uppercase">Investigating</div><h2 style="margin:0">' + esc(e ? e.name : a.leverId) + ' <span class="neutral" style="font-weight:400">(' + (a.v > 0 ? '+' : '') + a.v + ' ' + esc(e && e.ctl ? e.ctl.unit : '') + ')</span></h2></div><button type="button" class="chn-btn small" data-an-del="' + a.id + '">Close this investigation</button></div>' +
      '<div class="an-steps">' + steps(a).map(function (s) { return '<button type="button" class="an-step' + (cur2 === s[0] ? ' on' : '') + '" data-an-step="' + s[0] + '">' + s[1] + '</button>'; }).join('') + '</div>';
  }

  function coachNote(text) { return text ? '<div class="an-coach"><img alt="" src="/assets/chancellor/adviser-point.jpg"><span>' + esc(text) + '</span></div>' : ''; }
  function workspace(a) {
    var s = a.step || 'question', body = '';
    if (s === 'question') body = stepQuestion(a); else if (s === 'data') body = stepData(a); else if (s === 'evidence') body = stepEvidence(a); else if (s === 'cba') body = stepCba(a); else body = stepDecide(a);
    return header(a) + coachNote(root.LMGuide && s !== 'evidence' ? LMGuide.stepNote(s) : '') + '<div class="an-body">' + body + '</div>';
  }

  function stepQuestion(a) {
    var e = leverMeta(a.leverId), p = panelFor(a), nT = p.units.filter(function (u) { return u.treated; }).length;
    return '<h3>The question</h3><p>If the government makes this change, <b>what will happen to ' + OUT[a.outcome][0].toLowerCase() + '</b>, and is it worth the cost?</p>' +
      '<p>You cannot test it on your own country first. What you can do is learn from other countries that did something similar. The Treasury has assembled a record of <b>' + p.units.length + ' countries over ' + p.Q + ' quarters</b>; <b>' + nT + '</b> of them adopted this kind of policy at different times, and the rest did not. Their economies resemble yours, but they are not identical, and they were hit by their own shocks as well as shocks the whole world shared.</p>' +
      '<div class="an-note"><b>The problem of cause.</b> Countries that adopt a policy often differ from those that do not, and they often adopt it because of what was happening to them. A simple comparison can therefore mislead. Choosing a method that handles this is the whole craft.</div>' +
      '<h3>What do you expect?</h3><div class="an-form"><label>I expect it to<select id="anExpect"><option value="">Choose…</option><option value="up"' + (a.expect === 'up' ? ' selected' : '') + '>raise it</option><option value="down"' + (a.expect === 'down' ? ' selected' : '') + '>lower it</option><option value="none"' + (a.expect === 'none' ? ' selected' : '') + '>make little difference</option></select></label></div>' +
      '<p class="neutral" style="font-size:.86rem">Writing down a prediction first is how you find out what you learned. You will see it again at the end.</p>' +
      '<div class="an-actions">' + learnBtn('causal', 'Learn: what is a causal effect?') + '<button type="button" class="chn-btn primary" data-an-step="data">On to the data →</button></div>';
  }

  function stepData(a) {
    var p = panelFor(a), rows = p.units.map(function (u) { return '<tr><td>' + esc(u.name) + '</td><td>' + (u.treated ? 'Adopted in quarter ' + u.tq : 'Did not adopt') + '</td><td class="n">' + (u.treated ? (u.dose > 0 ? '+' : '') + u.dose : '·') + '</td></tr>'; }).join('');
    return '<h3>The data</h3><p>One row per country per quarter: ' + Object.keys(OUT).map(function (k) { return OUT[k][0].toLowerCase(); }).join(', ') + '. These are the official statistics, so they contain measurement error. The dotted lines mark when each country adopted.</p>' +
      '<div class="an-pick"><label>Outcome <select id="anOutShow">' + Object.keys(OUT).map(function (k) { return '<option value="' + k + '"' + (k === (a.show || a.outcome) ? ' selected' : '') + '>' + OUT[k][0] + '</option>'; }).join('') + '</select></label></div>' +
      panelChart(p, a.show || a.outcome) + '<p class="neutral" style="font-size:.86rem">Average across countries that adopted and across those that did not. Notice that they were not following identical paths even before anyone adopted. That gap is what a careful method has to take into account.</p>' +
      '<details class="an-det"><summary>The countries and when they acted</summary><div class="chn-scroll"><table class="chn-table"><tr><th>Country</th><th>Policy</th><th class="n">Size</th></tr>' + rows + '</table></div></details>' +
      '<div class="an-actions">' + learnBtn('stats', 'Learn: averages and uncertainty') + '<button type="button" class="chn-btn primary" data-an-step="evidence">On to the evidence →</button></div>';
  }

  function stepEvidence(a) {
    var m = a.method || 'before', key = a.show || a.outcome, p = panelFor(a), meta = METHODS.filter(function (x) { return x[0] === m; })[0], res, h = '';
    h += '<div class="an-tabs">' + METHODS.map(function (x) { return '<button type="button" class="an-tab' + (x[0] === m ? ' on' : '') + '" data-an-method="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
    h += coachNote(root.LMGuide ? LMGuide.methodNote(m) : '');
    h += '<div class="an-pick"><label>Outcome <select id="anOutShow">' + Object.keys(OUT).map(function (k) { return '<option value="' + k + '"' + (k === key ? ' selected' : '') + '>' + OUT[k][0] + '</option>'; }).join('') + '</select></label> ' + learnBtn(meta[2], 'Learn: ' + meta[1].toLowerCase()) + '</div>';
    if (m === 'before') {
      res = run(a, 'before', key);
      h += '<p>Compare each adopting country with <b>itself</b>: the six quarters before adoption against the six quarters after the policy took effect.</p>' + readCard(res, key, 'before versus after') +
        '<div class="an-warn"><b>Be careful.</b> This is the most tempting comparison and often the most wrong. Everything else that changed over the same period is credited to the policy, including shocks the whole world felt and the bounce-back that follows a bad spell.</div>';
    } else if (m === 'did22') {
      res = run(a, 'did22', key);
      h += '<p>Take the change in the countries that adopted, and subtract the change in countries that did not over the same quarters. What is left is the <b>difference-in-differences</b>.</p>' +
        '<div class="chn-scroll"><table class="chn-table"><tr><th></th><th class="n">Before</th><th class="n">After</th><th class="n">Change</th></tr><tr><td>Adopters</td><td class="n">' + f2(res.treatedBefore) + '</td><td class="n">' + f2(res.treatedAfter) + '</td><td class="n">' + sg(res.change) + '</td></tr><tr><td>Never adopted</td><td class="n">' + f2(res.controlBefore) + '</td><td class="n">' + f2(res.controlAfter) + '</td><td class="n">' + sg(res.controlChange) + '</td></tr><tr><th>Difference in differences</th><td></td><td></td><th class="n">' + sg(res.est) + '</th></tr></table></div>' +
        '<p>Of the change in the adopting countries, <b>' + sg(res.controlChange) + '</b> would have happened anyway (it happened to countries that did not adopt). The rest, <b>' + sg(res.est) + '</b>, is the estimate of the policy\'s effect, <i>if</i> the two groups would have moved in parallel without it.</p>' +
        '<div class="an-note">The two-by-two shows the arithmetic but gives no measure of uncertainty. For that, move on to the regression.</div>';
    } else if (m === 'twfe') {
      res = run(a, 'twfe', key);
      h += '<p>The same idea as a regression: the outcome on an indicator for "this country has adopted", with a separate level for every country and a separate level for every quarter (the <b>fixed effects</b>). Standard errors are clustered by country.</p>' + readCard(res, key, 'two-way fixed effects') +
        '<p class="neutral" style="font-size:.86rem">With ' + res.units + ' countries, the standard error is based on only ' + (res.df + 1) + ' clusters, so the intervals use a t distribution with ' + res.df + ' degrees of freedom. Naive standard errors would have been ' + f2(res.seNaive) + ', against the clustered ' + f2(res.se) + '.</p>' +
        '<div class="an-warn"><b>When countries adopt at different times</b>, this estimator can mislead: countries that have already adopted end up serving as comparisons for those that adopt later. The event study tab shows a cleaner way.</div>';
    } else if (m === 'event') {
      var bk = a.baseK || -1; res = run(a, 'event', key, { baseK: bk });
      var cl = res.clean, tw = res.twfe, pre = cl.preTest;
      h += '<p>Instead of one number, estimate the effect <b>quarter by quarter</b> around adoption, always against the quarter just before. Quarters <i>before</i> adoption (purple) should show nothing: if they do not, the countries were already on different paths and the comparison is suspect.</p>' +
        '<h4>Clean comparison (adopters against never-adopters, cohort by cohort)</h4><div class="an-pick"><label>Measure everything against <select id="anBase"><option value="-1"' + (bk === -1 ? ' selected' : '') + '>the quarter just before adoption</option><option value="-8"' + (bk === -8 ? ' selected' : '') + '>eight quarters before adoption</option></select></label></div>' + dotWhisker(cl.points, { ylab: OUT[key][0], base: bk }) +
        '<p><b>Average effect after adoption: ' + sg(cl.att) + '</b> (95% CI ' + sg(cl.attCi[0]) + ' to ' + sg(cl.attCi[1]) + '). <b>Pre-trend test:</b> ' + (pre.p == null ? 'not available' : pfmt(pre.p)) + '. ' + (pre.p != null && pre.p < 0.1 ? '<span class="bad">The countries that adopted were already moving differently beforehand. Treat the estimate with suspicion, and think about why they adopted when they did.</span>' : 'No clear sign of different trends before adoption. That is reassuring, not proof, because the test has limited power with this few countries.') + '</p>' +
        '<details class="an-det"><summary>The same chart from the fixed-effects regression</summary>' + dotWhisker(tw.points, { ylab: OUT[key][0] }) + '<p class="neutral" style="font-size:.86rem">Pre-trend test: ' + (tw.preTest.p == null ? 'n/a' : pfmt(tw.preTest.p)) + '. When adoption is staggered, the regression can show differences before adoption that are an artefact of the method: compare with the chart above.</p></details>';
    } else if (m === 'synth') {
      var tr = p.units.filter(function (u) { return u.treated; }), unit = a.synthUnit && tr.some(function (u) { return u.id === a.synthUnit; }) ? a.synthUnit : tr[0].id;
      res = run(a, 'synth', key, { unit: unit });
      h += '<p>Build a stand-in for one country that adopted: a weighted blend of countries that did not, with weights chosen so the blend tracked the country closely <b>before</b> it adopted. Any gap that opens afterwards is the effect.</p>' +
        '<div class="an-pick"><label>Country <select id="anSynthUnit">' + tr.map(function (u) { return '<option value="' + u.id + '"' + (u.id === unit ? ' selected' : '') + '>' + esc(u.name) + ' (adopted in quarter ' + u.tq + ')</option>'; }).join('') + '</select></label></div>' +
        synthChart(res, key) + '<p>Average gap after adoption: <b>' + sg(res.avgEffect) + ' ' + unitText(key) + '</b>. How well did the stand-in fit before adoption? Average error <b>' + f2(res.preRmspe) + '</b>.</p>' +
        '<p><b>Placebo test.</b> Pretend each country that did not adopt had done so, and build a synthetic control for it. If the real gap is larger than most of these fake ones, it is unlikely to be chance.</p>' + placeboChart(res) +
        '<p>The real country has the ' + ordinal(Math.round(res.pValue * (res.placebos.length + 1))) + ' largest post-to-pre error ratio of ' + (res.placebos.length + 1) + ', so the placebo p-value is <b>' + f2(res.pValue) + '</b>. Weights: ' + res.weights.filter(function (w) { return w.w > 0.02; }).map(function (w) { return esc(countryName(w.unit)) + ' ' + Math.round(w.w * 100) + '%'; }).join(', ') + '.</p>';
    } else if (m === 'ri') {
      res = run(a, 'ri', key);
      h += '<p>With few countries, the usual standard errors can be unreliable. <b>Randomisation inference</b> asks: if the policy had been handed to a random set of countries instead, how often would we see an estimate as large as ours? The p-value is the share of random assignments that match or beat what we found.</p>' +
        histogram(res.draws, res.actual, { xlab: 'Estimate under random assignment (the dashed line is yours)' }) + '<p>Your estimate: <b>' + sg(res.actual) + '</b>. Out of ' + res.reps + ' random assignments, <b>' + Math.round(res.p * res.reps) + '</b> were as extreme, so <b>' + pfmt(res.p) + '</b>.</p>' +
        '<div class="an-note">This test tells you whether the pattern could be luck. It does not tell you whether the comparison was fair: a biased comparison can be \'significant\' every time.</div>';
    }
    return h + '<div class="an-actions"><button type="button" class="chn-btn" data-an-step="data">← Data</button><button type="button" class="chn-btn primary" data-an-step="cba">On to cost and benefit →</button></div>';
  }
  function sayOutput(x) { return x >= 0 ? 'the extra output is worth <b>' + f2(x) + '</b>' : 'lost output costs <b>' + f2(-x) + '</b>'; }
  function sayFiscal(x) { return x >= 0 ? 'the public finances improve by <b>' + f2(x) + '</b>' : 'the extra borrowing costs <b>' + f2(-x) + '</b>'; }
  function readCard(res, key, what) { return '<div class="an-result"><div class="big">' + sg(res.est) + '<small> ' + unitText(key) + '</small></div><div class="ci">95% CI ' + sg(res.ci[0]) + ' to ' + sg(res.ci[1]) + ' · ' + pfmt(res.p) + ' · ' + (res.n != null ? res.n + ' ' + (what === 'before versus after' ? 'countries' : 'observations') : '') + '</div><p>' + readEffect(res, key, what) + '</p></div>'; }
  function ordinal(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function countryName(id) { var a = cur(), p = a && cache['p:' + a.id], u = p && p.units.filter(function (x) { return x.id === id; })[0]; return u ? u.name : id; }

  function stepCba(a) {
    var P = cbaParams(a), r = cbaRun(a, P), alt = function (k, v) { var q = Object.assign({}, P); q[k] = v; return cbaRun(a, q).mean; };
    var sens = [['Discount rate', 'rate', 1.5, 6, '1.5%', '6%'], ['Cost of public funds', 'mcpf', 0, 0.5, '0', '0.5'], ['How the benefit is spread', 'inequalityAversion', 0, 1.5, 'no weight on equity', 'strong weight'], ['Effects after year 4', 'tail', 0, 1, 'none', 'full'], ['Uncertainty about the effect', 'effectSpread', 0, 0.6, 'none', 'large']];
    var rows = sens.map(function (s) { var lo = alt(s[1], s[2]), hi = alt(s[1], s[3]); return { name: s[0], lo: Math.min(lo, hi), hi: Math.max(lo, hi), a: s[4], b: s[5], lowIs: lo < hi ? s[4] : s[5], highIs: lo < hi ? s[5] : s[4] }; });
    var all = rows.map(function (x) { return x.lo; }).concat(rows.map(function (x) { return x.hi; }), [r.mean]), lo2 = Math.min.apply(null, all), hi2 = Math.max.apply(null, all), X = scale(lo2 - 0.2, hi2 + 0.2, 160, 600);
    var tornado = svgWrap(640, 40 + rows.length * 34, rows.sort(function (x, y) { return (y.hi - y.lo) - (x.hi - x.lo); }).map(function (x, i) { var y = 28 + i * 34; return '<text x="6" y="' + (y + 4) + '" font-size="12" fill="currentColor">' + esc(x.name) + '</text><rect x="' + X(x.lo) + '" y="' + (y - 9) + '" width="' + Math.max(2, X(x.hi) - X(x.lo)) + '" height="18" fill="#0a5f8f" opacity=".7"/><text x="' + (X(x.lo) - 4) + '" y="' + (y + 4) + '" text-anchor="end" font-size="10" fill="currentColor">' + f2(x.lo) + '</text><text x="' + (X(x.hi) + 4) + '" y="' + (y + 4) + '" font-size="10" fill="currentColor">' + f2(x.hi) + '</text>'; }).join('') + '<line x1="' + X(r.mean) + '" x2="' + X(r.mean) + '" y1="14" y2="' + (30 + rows.length * 34) + '" stroke="#111" stroke-dasharray="4 3"/><line x1="' + X(0) + '" x2="' + X(0) + '" y1="14" y2="' + (30 + rows.length * 34) + '" stroke="#b42318"/>', 'How the net benefit changes when each assumption changes');
    var verdict = r.mean > 0 && r.probPositive > 0.8 ? '<span class="good">Worth doing on these assumptions</span>' : r.mean > 0 ? '<span class="neutral">Probably worth it, but not clearly</span>' : '<span class="bad">Does not pay for itself on these assumptions</span>';
    return '<h3>Is it worth it?</h3><p>The Treasury\'s model of <b>your</b> economy is run 200 times with and without the policy, with the same random shocks in each pair, so the difference is the policy and nothing else. The extra output is set against the extra borrowing, in present value, as a share of one year\'s GDP.</p>' +
      '<div class="an-form an-cba">' + cbaInput('Discount rate (%)', 'rate', P.rate, 0.5) + cbaInput('Cost of public funds (each unit borrowed costs 1 + this)', 'mcpf', P.mcpf, 0.05) + cbaInput('Weight on equity (0 = none)', 'inequalityAversion', P.inequalityAversion, 0.25) + cbaInput('Share of the final-year gain that persists', 'tail', P.tail, 0.25) + cbaInput('Uncertainty about the size of the effect', 'effectSpread', P.effectSpread, 0.1) + '</div>' +
      '<div class="an-result"><div class="big">' + sg(r.mean) + '<small> % of a year\'s GDP, net benefit</small></div><div class="ci">90% of simulations between ' + sg(r.p05) + ' and ' + sg(r.p95) + ' · positive in ' + Math.round(r.probPositive * 100) + '% of runs</div><p>' + verdict + '. In present value, ' + sayOutput(r.output) + ', and ' + sayFiscal(r.fiscal) + '.</p></div>' +
      histogram(r.draws, r.mean, { xlab: 'Net benefit across 200 simulations (dashed line: the average)' }) + '<h4>What would change the answer?</h4><p class="neutral" style="font-size:.86rem">The bar for each assumption shows the net benefit when it is set low or high; the red line is zero. Assumptions with long bars are the ones to argue about.</p>' + tornado +
      '<div class="an-actions">' + learnBtn('cba', 'Learn: cost-benefit analysis') + '<button type="button" class="chn-btn" data-an-step="evidence">← Evidence</button><button type="button" class="chn-btn primary" data-an-step="decide">Decide →</button></div>';
  }
  function cbaInput(label, k, v, step) { return '<label>' + esc(label) + '<input type="number" data-cba="' + k + '" value="' + v + '" step="' + step + '" min="0"></label>'; }

  function stepDecide(a) {
    var p = panelFor(a), key = a.outcome, d = a.decision, h = '<h3>Your conclusion</h3>';
    if (!d) {
      var last = a.lastMethod ? ' Your last estimate was ' + sg(a.lastMethod.est) + '.' : '';
      h += '<p>Commit to an estimate of the <b>average effect of this policy on ' + OUT[key][0].toLowerCase() + '</b> in a country that adopts it, over the first ten quarters after it takes effect, in ' + unitText(key) + ', with a 95% interval. Then say what you would do. Once you commit, the truth is revealed.</p>' +
        '<div class="an-form"><label>Your estimate<input type="number" id="anEst" step="0.05" value="' + (a.draftEst != null ? a.draftEst : '') + '"></label><label>Interval, low<input type="number" id="anLo" step="0.05" value="' + (a.draftLo != null ? a.draftLo : '') + '"></label><label>Interval, high<input type="number" id="anHi" step="0.05" value="' + (a.draftHi != null ? a.draftHi : '') + '"></label><label>Your recommendation<select id="anRec"><option value="1">Adopt it as proposed</option><option value="0.5">Adopt half the size</option><option value="1.5">Adopt a larger version</option><option value="0">Do not adopt it</option></select></label></div>' +
        '<p class="neutral" style="font-size:.86rem">' + esc(last) + ' Choose the method you trust most, and say how sure you are: an interval that is too narrow is a mistake, and so is one so wide that it says nothing.</p>' +
        '<div class="an-actions">' + learnBtn('decide', 'Learn: from evidence to a decision') + '<button type="button" class="chn-btn" data-an-step="cba">← Cost and benefit</button><button type="button" class="chn-btn primary" data-an="commit">Commit and see the truth</button></div>';
      return h;
    }
    var truth = p.truth.att[key], inside = truth >= d.lo && truth <= d.hi, err = d.est - truth, width = d.hi - d.lo;
    var verdict = inside ? (width < Math.abs(truth) * 3 + 0.4 ? '<span class="good">Your interval contained the truth, and it was informative.</span>' : '<span class="neutral">Your interval contained the truth, but it was very wide.</span>') : '<span class="bad">Your interval missed the truth.</span>';
    var exp = a.expect ? (a.expect === 'up' && truth > 0.03 || a.expect === 'down' && truth < -0.03 || a.expect === 'none' && Math.abs(truth) <= 0.03 ? 'Your first prediction was right about the direction.' : 'Your first prediction was wrong about the direction, which is exactly why the evidence is worth collecting.') : '';
    var sel = p.units.filter(function (u) { return u.treated; }).length ? 'Behind the scenes, the countries that adopted had been in a slide before they acted' + (a.selection > 0.3 ? ', which is why before-and-after comparisons overstated the effect.' : ' only mildly in this data set.') : '';
    h += '<div class="an-result"><div class="big">Truth: ' + sg(truth) + '<small> ' + unitText(key) + '</small></div><div class="ci">You said ' + sg(d.est) + ' (' + sg(d.lo) + ' to ' + sg(d.hi) + ') · error ' + sg(err) + '</div><p>' + verdict + ' ' + esc(exp) + '</p></div>' +
      '<p>The "truth" is the average effect on the countries that adopted, found by running each of them again with no policy and the same shocks. Real economists never get to see this, which is why the checks you used matter.</p><p class="neutral" style="font-size:.86rem">' + esc(sel) + '</p>' +
      '<p>Your recommendation: <b>' + (d.rec === 0 ? 'do not adopt' : d.rec === 1 ? 'adopt as proposed' : d.rec === 0.5 ? 'adopt half the size' : 'adopt a larger version') + '</b>.</p><div class="an-actions">' + (d.rec > 0 ? '<button type="button" class="chn-btn primary" data-an="todraft">Add it to my draft budget</button>' : '') + '<button type="button" class="chn-btn" data-an="new">Investigate something else</button></div>';
    return h;
  }

  /* ---------- A-level: the analyst's briefing ---------- */
  function briefing(a) {
    var key = a.outcome, p = panelFor(a), e = leverMeta(a.leverId), tw = run(a, 'twfe', key), ev = run(a, 'event', key), ba = run(a, 'before', key), cl = ev.clean, P = cbaParams(a), r = cbaRun(a, P);
    var name = e ? e.name.toLowerCase() : a.leverId, adopt = p.units.filter(function (u) { return u.treated; }).length;
    var flagged = cl.preTest.p != null && cl.preTest.p < 0.1, zero = cl.attCi[0] <= 0 && cl.attCi[1] >= 0;
    var rec = r.mean > 0 && r.probPositive > 0.8 ? 1 : r.mean > 0 && r.probPositive > 0.55 ? 0.5 : 0;
    var recText = rec === 1 ? 'Go ahead as proposed.' : rec === 0.5 ? 'Go ahead, but at half the size, and review it after the first budget.' : 'Do not go ahead with this on the evidence we have.';
    return '<div class="an-head"><div><div class="neutral" style="font-size:.74rem;letter-spacing:.08em;text-transform:uppercase">Treasury analyst\'s briefing</div><h2 style="margin:0">' + esc(e ? e.name : a.leverId) + ' <span class="neutral" style="font-weight:400">(' + (a.v > 0 ? '+' : '') + a.v + ' ' + esc(e && e.ctl ? e.ctl.unit : '') + ')</span></h2></div><button type="button" class="chn-btn small" data-an-del="' + a.id + '">Close</button></div>' +
      '<div class="an-result"><div class="big">' + esc(recText) + '</div><div class="ci">Net benefit ' + sg(r.mean) + '% of a year\'s GDP · positive in ' + Math.round(r.probPositive * 100) + '% of simulations</div></div>' +
      '<h3>What we found</h3><p>We looked at ' + p.units.length + ' countries over ' + p.Q + ' quarters, of which ' + adopt + ' adopted a similar policy. Compared with countries that did not, <b>' + OUT[key][0].toLowerCase() + ' was ' + f2(Math.abs(cl.att)) + ' ' + unitText(key) + ' ' + (cl.att > 0 ? 'higher' : 'lower') + '</b> after adoption' + (zero ? ', but that is within the range of chance, so we cannot be confident there was any effect' : '') + '. We are 95% sure the true figure lies between ' + sg(cl.attCi[0]) + ' and ' + sg(cl.attCi[1]) + '.</p>' +
      (flagged ? '<div class="an-warn"><b>A warning.</b> The countries that adopted were already doing differently before they acted, so these figures may flatter or unfairly damn the policy. We used the more careful comparison, not the simple before-and-after figure of ' + sg(ba.est) + ', which would have misled.</div>' : '<div class="an-note">The adopting countries were following similar paths before they acted, which makes the comparison fairer. A simple before-and-after would have given ' + sg(ba.est) + ', against our careful figure of ' + sg(cl.att) + '.</div>') +
      '<h3>What it costs against what it brings</h3><p>Running the Treasury\'s model of your economy 200 times with and without the change: ' + sayOutput(r.output) + ', and ' + sayFiscal(r.fiscal) + ' (both as a % of one year\'s GDP). ' + (r.mean > 0 ? 'The benefits outweigh the costs' : 'The costs outweigh the benefits') + ', and the answer is the same sign in ' + Math.round((r.mean > 0 ? r.probPositive : 1 - r.probPositive) * 100) + '% of the simulations.</p>' + histogram(r.draws, r.mean, { xlab: 'Net benefit across 200 simulations' }) +
      '<details class="an-det"><summary>How the analyst reached this</summary><ol class="an-how"><li><b>Peer countries.</b> We compared your policy with countries that already tried it, because we cannot test it on your own. ' + learnBtn('causal', 'Why this works') + '</li><li><b>Not just before and after.</b> Things change for many reasons at once. ' + learnBtn('beforeafter', 'Why it misleads') + '</li><li><b>Difference-in-differences.</b> We subtracted the change in countries that did not adopt from the change in those that did. ' + learnBtn('did', 'How it works') + '</li><li><b>A check on the assumption.</b> We tested whether the countries were on the same path before adoption. ' + learnBtn('event', 'How it works') + '</li><li><b>Cost and benefit.</b> We set extra output against extra borrowing, in today\'s money. ' + learnBtn('cba', 'How it works') + '</li></ol></details>' +
      '<div class="an-actions"><button type="button" class="chn-btn primary" data-an="briefdraft" data-rec="' + rec + '">' + (rec ? 'Add ' + (rec === 0.5 ? 'half the size' : 'it') + ' to my draft budget' : 'Keep it out of my budget') + '</button><button type="button" class="chn-btn" data-an="new">Investigate something else</button></div>';
  }

  /* ---------- events ---------- */
  function bind(host) {
    var g = ctx.g;
    host.onclick = function (ev) {
      var t = ev.target.closest('[data-an],[data-an-open],[data-an-step],[data-an-method],[data-an-del],[data-an-from],[data-learn]'); if (!t) return;
      var a = cur();
      if (t.dataset.learn) { ctx.openLesson(t.dataset.learn); return; }
      if (t.dataset.anOpen) { g.analysisOpen = t.dataset.anOpen; ctx.save(); render(host, ctx); return; }
      if (t.dataset.anStep && a) { a.step = t.dataset.anStep; ctx.save(); render(host, ctx); return; }
      if (t.dataset.anMethod && a) { a.method = t.dataset.anMethod; ctx.save(); render(host, ctx); return; }
      if (t.dataset.anDel) { g.analyses = g.analyses.filter(function (x) { return x.id !== t.dataset.anDel; }); g.analysisOpen = null; ctx.save(); render(host, ctx); return; }
      if (t.dataset.anFrom) { var pr = t.dataset.anFrom.split('|'); var sel = host.querySelector('#anLever'), vi = host.querySelector('#anV'); if (sel) { sel.value = pr[0]; fillUnit(host); } if (vi) vi.value = pr[1]; return; }
      var act = t.dataset.an;
      if (act === 'new') { g.analysisOpen = null; render(host, ctx); return; }
      if (act === 'create') { create(host); return; }
      if (act === 'commit' && a) { commit(host, a); return; }
      if (act === 'todraft' && a && a.decision) { ctx.addDraft(a.leverId, +(a.v * a.decision.rec).toFixed(2), a.opt); ctx.toast('Added to your draft budget.'); return; }
      if (act === 'briefdraft' && a) { var rec = +t.dataset.rec; if (rec > 0) { ctx.addDraft(a.leverId, +(a.v * rec).toFixed(2), a.opt); ctx.toast('Added to your draft budget.'); } else ctx.toast('Left out of your budget.'); return; }
    };
    host.onchange = function (ev) {
      var t = ev.target, a = cur();
      if (t.id === 'anLever') { fillUnit(host); return; }
      if (!a) return;
      if (t.id === 'anOutShow') { a.show = t.value; ctx.save(); render(host, ctx); return; }
      if (t.id === 'anBase') { a.baseK = +t.value; ctx.save(); render(host, ctx); return; }
      if (t.id === 'anSynthUnit') { a.synthUnit = t.value; ctx.save(); render(host, ctx); return; }
      if (t.id === 'anExpect') { a.expect = t.value; ctx.save(); return; }
      if (t.dataset && t.dataset.cba) { a.cbaParams = a.cbaParams || {}; a.cbaParams[t.dataset.cba] = +t.value; ctx.save(); render(host, ctx); return; }
    };
    host.oninput = function (ev) { var t = ev.target, a = cur(); if (!a) return; if (t.id === 'anEst') a.draftEst = t.value === '' ? null : +t.value; if (t.id === 'anLo') a.draftLo = t.value === '' ? null : +t.value; if (t.id === 'anHi') a.draftHi = t.value === '' ? null : +t.value; };
    if (host.querySelector('#anLever')) fillUnit(host);
  }
  function fillUnit(host) {
    var sel = host.querySelector('#anLever'), vi = host.querySelector('#anV'), u = host.querySelector('#anUnit'); if (!sel) return;
    var e = leverMeta(sel.value); if (!e) return;
    var c = e.ctl, dflt = vi.value !== '' && vi.dataset.for === sel.value ? +vi.value : (ctx.suggestSize ? ctx.suggestSize(e) : (c.max > 0 ? c.step * 4 : 1));
    vi.dataset.for = sel.value; vi.min = c.min; vi.max = c.max; vi.step = c.step; vi.value = dflt;
    u.textContent = 'Unit: ' + c.unit + ' (from ' + c.min + ' to ' + c.max + '). ' + (e.now ? 'Today: ' + e.now + '.' : '');
  }
  function create(host) {
    var g = ctx.g, id = 'an' + Date.now().toString(36), lever = host.querySelector('#anLever').value, v = +host.querySelector('#anV').value, out = host.querySelector('#anOut').value;
    var seed = ((g.seed0 || 1) + g.analyses.length * 9973 + lever.length * 131 + Math.round(Math.abs(v) * 10)) >>> 0;
    g.analyses.push({ id: id, leverId: lever, v: v, outcome: out, seed: seed, noise: ctx.level === 'alevel' ? 0.8 : 1.1, selection: ctx.level === 'alevel' ? 0.3 : 0.5, step: 'question', method: 'before', created: g.date });
    g.analysisOpen = id; ctx.save(); render(host, ctx);
  }
  function commit(host, a) {
    var est = host.querySelector('#anEst').value, lo = host.querySelector('#anLo').value, hi = host.querySelector('#anHi').value;
    if (est === '' || lo === '' || hi === '') { ctx.toast('Fill in your estimate and both ends of your interval.'); return; }
    est = +est; lo = +lo; hi = +hi; if (lo > hi) { var t = lo; lo = hi; hi = t; }
    a.decision = { est: est, lo: lo, hi: hi, rec: +host.querySelector('#anRec').value, date: ctx.g.date };
    var truth = panelFor(a).truth.att[a.outcome]; ctx.g.log.push({ key: 'analysis', date: ctx.g.date, title: 'Analysis: ' + a.leverId, choice: (truth >= lo && truth <= hi ? 'Interval contained the truth' : 'Interval missed the truth'), note: '' });
    ctx.save(); render(host, ctx);
  }

  root.LMAnalysis = { render: render, OUT: OUT };
})(typeof window !== 'undefined' ? window : globalThis);
