// The teaching side of the Workbook chat: what a lesson message is made of.
//   needs     the ideas the lesson relies on, shown as chips the student clicks to have that taught first (a tick marks ones already learnt)
//   steps     the working, one idea at a time, revealed a step at a time, each with its line of maths and (where it helps) a small graph
//   diagram   one picture for the whole lesson
//   exercise  something for the student to do in the game, with a button to say it is done
// Graphs are drawn here from expressions in x written by the agent. The expressions are read by a small parser of this file's own (numbers, x, + - * / ^,
// brackets and sqrt, abs, ln, exp), so nothing the agent sends can run as code.
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  // ---------- what this student has already learnt (this browser, per account) ----------
  const keyOf = () => 'lm_fb_known:' + ((FM.accountId && FM.accountId()) || 'guest');
  function known() { try { return new Set(JSON.parse(localStorage.getItem(keyOf()) || '[]')); } catch (e) { return new Set(); } }
  function markKnown(name) { const k = known(); const n = norm(name); if (n) k.add(n); try { localStorage.setItem(keyOf(), JSON.stringify(Array.from(k).slice(-400))); } catch (e) { /* a convenience only */ } }
  const isKnown = (name) => known().has(norm(name));

  // ---------- a clickable idea ----------
  function chip(name) {
    const k = isKnown(name);
    return '<button type="button" class="lw-need' + (k ? ' known' : '') + '" data-explain="' + esc(name) + '" title="' + (k ? 'You have learnt this. Click to go over it again.' : 'Click to have this explained first') + '">' + esc(name) + (k ? ' <span class="lw-tick" aria-label="learnt">✓</span>' : '') + '</button>';
  }

  // ---------- expressions in x ----------
  function compile(src) {
    const toks = [], re = /\s*(?:(\d*\.?\d+(?:e[+-]?\d+)?)|([a-z]+)|(.))/gi; let m;
    while ((m = re.exec(src)) && m[0] !== '') {
      if (m[1] !== undefined) toks.push({ t: 'n', v: parseFloat(m[1]) });
      else if (m[2] !== undefined) toks.push({ t: 'id', v: m[2].toLowerCase() });
      else toks.push({ t: 'op', v: m[3] });
    }
    let i = 0;
    const FN = { sqrt: Math.sqrt, abs: Math.abs, ln: Math.log, exp: Math.exp };
    const peek = (v) => toks[i] && toks[i].t === 'op' && toks[i].v === v;
    function expr() { let a = term(); while (peek('+') || peek('-')) { const op = toks[i++].v, l = a, r = term(); a = op === '+' ? (x) => l(x) + r(x) : (x) => l(x) - r(x); } return a; }
    function term() {
      let a = unary();
      for (;;) {
        if (peek('*') || peek('/')) { const op = toks[i++].v, l = a, r = unary(); a = op === '*' ? (x) => l(x) * r(x) : (x) => l(x) / r(x); }
        else if (toks[i] && (toks[i].t === 'id' || peek('('))) { const l = a, r = unary(); a = (x) => l(x) * r(x); }   // 2x, 3(x+1)
        else return a;
      }
    }
    function unary() { if (peek('-')) { i++; const a = unary(); return (x) => -a(x); } if (peek('+')) { i++; return unary(); } return power(); }
    function power() { const b = atom(); if (peek('^')) { i++; const e = unary(); return (x) => Math.pow(b(x), e(x)); } return b; }
    function atom() {
      const t = toks[i++]; if (!t) throw new Error('end');
      if (t.t === 'n') return () => t.v;
      if (t.t === 'id') {
        if (t.v === 'x') return (x) => x;
        if (FN[t.v] && peek('(')) { i++; const a = expr(); if (!peek(')')) throw new Error(')'); i++; const f = FN[t.v]; return (x) => f(a(x)); }
        throw new Error('name');
      }
      if (t.v === '(') { const a = expr(); if (!peek(')')) throw new Error(')'); i++; return a; }
      throw new Error('token');
    }
    const f = expr(); if (i < toks.length) throw new Error('extra');
    return f;
  }

  // ---------- a small graph ----------
  const COLS = ['#E6D7B0', '#7FD6FF', '#FFD54A', '#8FE3A3', '#F2A0A0'];
  const tick = (v) => (Math.abs(v) >= 100 ? String(Math.round(v)) : String(Math.round(v * 100) / 100));
  // ---------- a distribution: the exact bars, worked out here from the name and the parameters the agent chose ----------
  function pmf(q, k) {
    if (q.kind === 'poisson') { let p = Math.exp(-q.lambda); for (let i = 1; i <= k; i++) p *= q.lambda / i; return p; }
    let p = Math.pow(1 - q.p, q.n); for (let i = 1; i <= k; i++) p *= (q.n - i + 1) / i * (q.p / (1 - q.p)); return k > q.n ? 0 : p;
  }
  const meanOf = (q) => (q.kind === 'poisson' ? q.lambda : q.n * q.p);
  function distPlot(d) {
    const ds = d.dist || [], W = 440, H = 290, L = 46, R = 16, T = 26, B = 40, pw = W - L - R, ph = H - T - B;
    let K = 6; ds.forEach((q) => { let c = 0, k = 0; while (k < 40 && c < 0.999) { c += pmf(q, k); k++; } K = Math.max(K, k); });
    K = Math.min(K, 30);
    let ymax = 0; ds.forEach((q) => { for (let k = 0; k <= K; k++) ymax = Math.max(ymax, pmf(q, k)); });
    ymax = Math.ceil(ymax * 1.12 * 20) / 20 || 0.1;
    const slot = pw / (K + 1), bw = Math.max(2, (slot * 0.8) / ds.length), py = (v) => T + ph - v / ymax * ph;
    let s = '';
    for (let g = 0; g <= 4; g++) { const v = ymax * g / 4; s += '<line x1="' + L + '" y1="' + py(v) + '" x2="' + (L + pw) + '" y2="' + py(v) + '" class="lw-grid"/><text x="' + (L - 6) + '" y="' + (py(v) + 4) + '" text-anchor="end" class="lw-tk">' + tick(v) + '</text>'; }
    const every = K > 16 ? 2 : 1;
    for (let k = 0; k <= K; k += every) s += '<text x="' + (L + slot * (k + 0.5)) + '" y="' + (H - B + 16) + '" text-anchor="middle" class="lw-tk">' + k + '</text>';
    ds.forEach((q, n) => {
      const col = COLS[(n + 1) % COLS.length];
      for (let k = 0; k <= K; k++) {
        const v = pmf(q, k), x = L + slot * k + (slot - bw * ds.length) / 2 + bw * n, hit = d.mark === k;
        s += '<rect x="' + x.toFixed(1) + '" y="' + py(v).toFixed(1) + '" width="' + (bw - 1).toFixed(1) + '" height="' + Math.max(0, T + ph - py(v)).toFixed(1) + '" fill="' + col + '" fill-opacity="' + (hit ? 1 : 0.72) + '"' + (hit ? ' stroke="#fff" stroke-width="1.5"' : '') + '/>';
      }
      const mx = L + slot * (meanOf(q) + 0.5);
      s += '<line x1="' + mx.toFixed(1) + '" y1="' + T + '" x2="' + mx.toFixed(1) + '" y2="' + (T + ph) + '" stroke="' + col + '" stroke-dasharray="4 3" stroke-width="1.4"/>';
      if (q.label) s += '<rect x="' + (L + 6 + n * 150) + '" y="6" width="10" height="10" fill="' + col + '"/><text x="' + (L + 20 + n * 150) + '" y="15" class="lw-cl" fill="' + col + '">' + esc(q.label) + '</text>';
    });
    s += '<line x1="' + L + '" y1="' + T + '" x2="' + L + '" y2="' + (T + ph) + '" class="lw-axis"/><line x1="' + L + '" y1="' + (T + ph) + '" x2="' + (L + pw) + '" y2="' + (T + ph) + '" class="lw-axis"/>';
    if (d.xLabel) s += '<text x="' + (L + pw / 2) + '" y="' + (H - 6) + '" text-anchor="middle" class="lw-ax">' + esc(d.xLabel) + '</text>';
    s += '<text x="12" y="' + (T + ph / 2) + '" text-anchor="middle" class="lw-ax" transform="rotate(-90 12 ' + (T + ph / 2) + ')">' + esc(d.yLabel || 'Probability') + '</text>';
    return '<svg class="lw-plot" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Probability distribution">' + s + '</svg>';
  }
  function plot(d) {
    if (!d) return '';
    if (d.dist && d.dist.length) return distPlot(d);
    const W = 440, H = 290, L = 46, R = 16, T = 14, B = 40, pw = W - L - R, ph = H - T - B;
    const x0 = d.x[0], x1 = d.x[1], y0 = d.y[0], y1 = d.y[1];
    const px = (x) => L + (x - x0) / (x1 - x0) * pw, py = (y) => T + ph - (y - y0) / (y1 - y0) * ph;
    let s = '';
    for (let k = 0; k <= 4; k++) {
      const gx = x0 + (x1 - x0) * k / 4, gy = y0 + (y1 - y0) * k / 4;
      s += '<line x1="' + px(gx) + '" y1="' + T + '" x2="' + px(gx) + '" y2="' + (T + ph) + '" class="lw-grid"/><text x="' + px(gx) + '" y="' + (H - B + 16) + '" text-anchor="middle" class="lw-tk">' + tick(gx) + '</text>';
      s += '<line x1="' + L + '" y1="' + py(gy) + '" x2="' + (L + pw) + '" y2="' + py(gy) + '" class="lw-grid"/><text x="' + (L - 6) + '" y="' + (py(gy) + 4) + '" text-anchor="end" class="lw-tk">' + tick(gy) + '</text>';
    }
    s += '<line x1="' + L + '" y1="' + T + '" x2="' + L + '" y2="' + (T + ph) + '" class="lw-axis"/><line x1="' + L + '" y1="' + (T + ph) + '" x2="' + (L + pw) + '" y2="' + (T + ph) + '" class="lw-axis"/>';
    if (d.xLabel) s += '<text x="' + (L + pw / 2) + '" y="' + (H - 6) + '" text-anchor="middle" class="lw-ax">' + esc(d.xLabel) + '</text>';
    if (d.yLabel) s += '<text x="12" y="' + (T + ph / 2) + '" text-anchor="middle" class="lw-ax" transform="rotate(-90 12 ' + (T + ph / 2) + ')">' + esc(d.yLabel) + '</text>';
    (d.curves || []).forEach((c, n) => {
      let f; try { f = compile(c.expr); } catch (e) { return; }
      let path = '', pen = false, last = null;
      for (let k = 0; k <= 120; k++) {
        const x = x0 + (x1 - x0) * k / 120, y = f(x);
        if (!Number.isFinite(y) || y < y0 - (y1 - y0) * 0.05 || y > y1 + (y1 - y0) * 0.05) { pen = false; continue; }
        path += (pen ? 'L' : 'M') + px(x).toFixed(1) + ' ' + py(y).toFixed(1) + ' '; pen = true; last = [px(x), py(y)];
      }
      if (!path) return;
      const col = COLS[n % COLS.length];
      s += '<path d="' + path + '" fill="none" stroke="' + col + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>';
      if (c.label && last) s += '<text x="' + Math.min(W - 6, last[0] + 6) + '" y="' + Math.max(12, last[1] - 6) + '" class="lw-cl" fill="' + col + '">' + esc(c.label) + '</text>';
    });
    (d.points || []).forEach((p) => { s += '<circle cx="' + px(p.x) + '" cy="' + py(p.y) + '" r="4.5" class="lw-pt"/>' + (p.label ? '<text x="' + (px(p.x) + 8) + '" y="' + (py(p.y) - 8) + '" class="lw-pl">' + esc(p.label) + '</text>' : ''); });
    return '<svg class="lw-plot" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Graph">' + s + '</svg>';
  }

  // ---------- the lesson part of a message ----------
  // m.lesson = { topic, needs, steps, diagram, exercise }; m.shown = how many steps are showing; render(text) draws maths text.
  function lessonHtml(m, render) {
    const l = m.lesson; if (!l) return '';
    let h = '';
    if ((l.needs || []).length) h += '<div class="lw-needs"><span>Before this, you need:</span> ' + l.needs.map(chip).join(' ') + '</div>';
    const steps = l.steps || [];
    if (steps.length) {
      const shown = Math.max(1, Math.min(steps.length, m.shown || 1));
      h += '<ol class="lw-steps">' + steps.slice(0, shown).map((st, n) => '<li><div class="lw-say">' + render(st.say) + '</div>' + (st.maths ? '<div class="lw-maths">' + render(st.maths) + '</div>' : '') + (st.diagram ? plot(st.diagram) : '') + (st.why ? '<div class="lw-why"><button type="button" data-ask="' + esc(st.why) + '">Explain why</button></div>' : '') + '</li>').join('') + '</ol>';
      if (shown < steps.length) h += '<div class="lw-more"><button type="button" class="primary" data-lwnext="1">Next step (' + (shown + 1) + ' of ' + steps.length + ')</button><button type="button" data-lwall="1">Show all</button></div>';
    }
    if (l.diagram) h += plot(l.diagram);
    // what comes after the working only appears once all of it has been read
    const done = !steps.length || (m.shown || 1) >= steps.length;
    if (done && l.exercise) h += '<div class="lw-ex"><b>Your turn</b><div>' + render(l.exercise) + '</div><button type="button" class="primary" data-exdone="1">I have made the change and run the test</button></div>';
    if (done && l.practice && !l.exercise) h += '<div class="lw-ex"><b>Your turn</b><div>' + render(l.practice) + '</div><p class="lw-hint">Type your answer in the box below and I will check it with you.</p></div>';
    if (done && l.next && l.next.say && l.next.ask) h += '<div class="lw-next"><div>' + render(l.next.say) + '</div><button type="button" data-ask="' + esc(l.next.ask) + '">Yes, look into it</button></div>';
    return h;
  }

  FM.learn = { norm, known, markKnown, isKnown, chip, plot, compile, lessonHtml };
})();
