// The Workbench: a page in the game for studying your own club's data with whatever method, at whatever depth, you want.
//   centre  - a document of cells (text, a calculator with the maths keyboard, queries and analyses you build by hand, and whatever the agent adds)
//   left    - the data drawer: every table and column the simulation recorded, with a preview (open and close it with the Data button)
//   right   - the LastMind AI Agent. It plans: it picks queries and methods and explains the results, but every number comes from the Workbench's own code
// The document, its chat and any tables made by experiments are kept inside the saved game (league.workbench).
(function () {
  const FM = (window.FM = window.FM || {});
  const T = FM.tables, WB = FM.WB;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const el = (id) => document.getElementById(id);
  const uid = () => 'c' + Math.random().toString(36).slice(2, 9);
  const sig = (v, n) => (Number.isFinite(v) ? String(Number(v.toPrecision(n || 4))) : String(v));
  const TIERS = { gcse: 'GCSE', alevel: 'A-level', above: 'Beyond A-level' };
  const DETAIL = { brief: 'brief: keep it short and plain', standard: 'standard detail', detailed: 'detailed: show the workings and the reasoning step by step' };


  // ---------- typing shortcuts (the Notes page's, for the Workbench's plain text boxes) ----------
  // ^ starts a power and _ a subscript (typed after a letter, number or bracket; digits and signs then come out as small characters until Space or →),
  // * gives ×, ~ gives √ and ~~ gives ≈, <= >= != give ≤ ≥ ≠, Shift + a letter gives the Greek letter (Caps Lock for the capital), Shift+E gives ∈ and Shift+I
  // gives ∫, Ctrl+- puts a bar over the letter before the cursor. In the calculator these always apply; in a text box Shift + a letter only becomes Greek when
  // it follows maths (a number, a sign, a letter such as sin, a bracket), so ordinary capitals are left alone.
  const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', n: 'ⁿ', i: 'ⁱ', x: 'ˣ', a: 'ᵃ', b: 'ᵇ', c: 'ᶜ', d: 'ᵈ', e: 'ᵉ', f: 'ᶠ', g: 'ᵍ', h: 'ʰ', j: 'ʲ', k: 'ᵏ', l: 'ˡ', m: 'ᵐ', o: 'ᵒ', p: 'ᵖ', r: 'ʳ', s: 'ˢ', t: 'ᵗ', u: 'ᵘ', v: 'ᵛ', w: 'ʷ', y: 'ʸ', z: 'ᶻ' };
  const SUB = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉', '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎', a: 'ₐ', e: 'ₑ', h: 'ₕ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ', l: 'ₗ', m: 'ₘ', n: 'ₙ', o: 'ₒ', p: 'ₚ', r: 'ᵣ', s: 'ₛ', t: 'ₜ', u: 'ᵤ', v: 'ᵥ', x: 'ₓ' };
  const GREEK = { a: ['α', 'Α'], b: ['β', 'Β'], d: ['Δ', 'Δ'], y: ['γ', 'Γ'], u: ['μ', 'Μ'], p: ['π', 'Π'], t: ['θ', 'Θ'], s: ['σ', 'Σ'], l: ['λ', 'Λ'], w: ['ω', 'Ω'], x: ['χ', 'Χ'] };
  const MATH_OPS = '=+−-×÷<>≤≥≠≈≡^_/*|,';
  const isGreekOrSymbol = (c) => !!c && (c.charCodeAt(0) > 0x2000 || /[\u0370-\u03ff]/.test(c));
  const isOperand = (c) => !!c && (/[A-Za-z0-9)\]′″]/.test(c) || isGreekOrSymbol(c));
  function wbShortcut(e) {
    const ta = e.target; if (!ta || ta.tagName !== 'TEXTAREA' || !ta.classList.contains('wb-in') || e.isComposing) return;
    if (e.ctrlKey && !e.altKey && !e.metaKey && (e.key === '-' || e.code === 'Minus')) {
      const pos = ta.selectionStart, prev = ta.value.slice(0, pos);
      if (ta.selectionStart !== ta.selectionEnd || !prev) return;
      e.preventDefault();
      if (prev.slice(-1) === '\u0304') ta.setRangeText('', pos - 1, pos, 'end'); else ta.setRangeText('\u0304', pos, pos, 'end');
      ta.dispatchEvent(new Event('input', { bubbles: true })); return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey || !e.key) return;
    const calc = !!ta.closest('.wb-cell.calc'), pos = ta.selectionStart, before = ta.value.slice(0, pos), last = before.slice(-1);
    const put = (str, back) => { ta.setRangeText(str, pos - (back || 0), ta.selectionEnd, 'end'); ta._zone = null; ta.dispatchEvent(new Event('input', { bubbles: true })); };
    // inside a power or a subscript
    const z = ta._zone;
    if (z && z.pos === pos && ta.selectionStart === ta.selectionEnd) {
      const map = z.kind === 'sup' ? SUP : SUB;
      if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'Tab') { ta._zone = null; if (e.key === ' ') e.preventDefault(); return; }
      const ch = map[e.key] || map[String(e.key).toLowerCase()];
      if (e.key.length === 1 && ch && !e.shiftKey || (e.key === '(' || e.key === ')' || e.key === '+') && ch) { e.preventDefault(); ta.setRangeText(ch, pos, pos, 'end'); ta._zone = { kind: z.kind, pos: pos + ch.length }; ta.dispatchEvent(new Event('input', { bubbles: true })); return; }
      ta._zone = null;
    } else if (z) ta._zone = null;
    if ((e.key === '^' || e.key === '_') && (calc || isOperand(last))) { e.preventDefault(); ta._zone = { kind: e.key === '^' ? 'sup' : 'sub', pos }; return; }
    if (e.key === '*' && (calc || isOperand(last))) { e.preventDefault(); put('×'); return; }
    if (e.key === '=' && (last === '<' || last === '>' || last === '!')) { e.preventDefault(); put(last === '<' ? '≤' : last === '>' ? '≥' : '≠', 1); return; }
    if (e.key === '=' && last === '=' && !calc) { e.preventDefault(); put('≡', 1); return; }
    if (e.key === '~') {
      if (last === '√' && ta._sq === pos) { e.preventDefault(); put('≈', 1); return; }
      if (last === '~') { e.preventDefault(); put('≈', 1); return; }
      const t2 = before.replace(/[\s\u00a0]+$/, ''), beforeSign = !t2 || MATH_OPS.indexOf(t2.slice(-1)) >= 0 || /[(\[]$/.test(t2);
      if (calc || beforeSign) { e.preventDefault(); put('√'); ta._sq = pos + 1; return; }
      return;
    }
    // Shift + a letter
    const letter = e.code && /^Key[A-Z]$/.test(e.code) ? e.code.slice(3).toLowerCase() : '';
    if (e.shiftKey && letter) {
      let maths = calc;
      if (!maths) {
        if (!before) maths = false;
        else if (/\s$/.test(last)) { const b = before.replace(/[\s\u00a0]+$/, '').slice(-1); maths = !!b && (MATH_OPS.indexOf(b) >= 0 || isGreekOrSymbol(b)); }
        else maths = /[0-9a-z]/.test(last) || MATH_OPS.indexOf(last) >= 0 || isGreekOrSymbol(last) || ((last === '(' || last === '[') && /[A-Za-z0-9)]/.test(before.slice(-2, -1) || ''));
      }
      if (!maths) return;
      const caps = e.getModifierState && e.getModifierState('CapsLock');
      if (letter === 'e') { e.preventDefault(); put('∈'); return; }
      if (letter === 'i') { e.preventDefault(); put('∫'); return; }
      if (GREEK[letter]) { e.preventDefault(); put(caps ? GREEK[letter][1] : GREEK[letter][0]); return; }
    }
  }

  // ---------- the calculator ----------
  // A small evaluator (no eval): numbers, + - × ÷ ^, brackets, constants, functions, variables (x = 3 × 4) and columns of the tables (mean(team_matches.xg)).
  const SUPBACK = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁺': '+', '⁻': '-', '⁼': '=', '⁽': '(', '⁾': ')', 'ⁿ': 'n', 'ⁱ': 'i', 'ˣ': 'x' };
  function makeCalc(league, vars) {
    const S = FM.STAT;
    const fact = (n) => { n = Math.round(n); if (n < 0 || n > 170) return NaN; let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
    const choose = (n, k) => (k < 0 || k > n ? 0 : Math.round(Math.exp(S.lgamma(n + 1) - S.lgamma(k + 1) - S.lgamma(n - k + 1))));
    const arr = (a) => (Array.isArray(a) ? a.filter((v) => typeof v === 'number' && Number.isFinite(v)) : [a]);
    const F = {
      sqrt: Math.sqrt, abs: Math.abs, ln: Math.log, log: Math.log10, exp: Math.exp, sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, round: (x, d) => { const m = Math.pow(10, d || 0); return Math.round(x * m) / m; }, floor: Math.floor, ceil: Math.ceil,
      fact, choose, nCr: choose, mean: (a) => S.mean(arr(a)), sum: (a) => S.sum(arr(a)), median: (a) => S.median(arr(a)), sd: (a) => S.sd(arr(a), true), var: (a) => S.variance(arr(a), true), min: (a, b) => (Array.isArray(a) ? Math.min.apply(null, arr(a)) : Math.min(a, b)), max: (a, b) => (Array.isArray(a) ? Math.max.apply(null, arr(a)) : Math.max(a, b)),
      count: (a) => arr(a).length, n: (a) => arr(a).length, normcdf: (x, m, s) => S.normCdf((x - (m || 0)) / (s || 1)), normpdf: (x, m, s) => S.normPdf((x - (m || 0)) / (s || 1)) / (s || 1), norminv: (p, m, s) => (m || 0) + (s || 1) * S.normInv(p),
      binompmf: (n, k, p) => S.binomPmf(k, n, p), binomcdf: (n, k, p) => S.binomCdf(k, n, p), poispmf: (k, l) => S.poisPmf(k, l), poiscdf: (k, l) => S.poisCdf(k, l), tcdf: (x, df) => S.tCdf(x, df), chi2sf: (x, df) => S.chi2Sf(x, df),
    };
    const C = { pi: Math.PI, e: Math.E };
    function tokenize(src) {
      const s = src.replace(/[\u0304]/g, '').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱˣ]+/g, (m) => '^(' + Array.from(m).map((ch) => SUPBACK[ch] || ch).join('') + ')').replace(/[₀₁₂₃₄₅₆₇₈₉]+/g, (m) => '_' + Array.from(m).map((ch) => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(ch))).join('')).replace(/×|·/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-').replace(/π/g, ' pi ').replace(/√/g, ' sqrt ');
      const out = []; let i = 0;
      while (i < s.length) {
        const ch = s[i];
        if (/\s/.test(ch)) { i++; continue; }
        if (/[0-9.]/.test(ch)) { let j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++; if (/[eE]/.test(s[j] || '') && /[0-9+-]/.test(s[j + 1] || '') && /[0-9]/.test(s[j + 1] === '+' || s[j + 1] === '-' ? s[j + 2] || '' : s[j + 1])) { j += 2; while (j < s.length && /[0-9]/.test(s[j])) j++; } out.push({ t: 'num', v: parseFloat(s.slice(i, j)) }); i = j; continue; }
        if (/[A-Za-z_\u0370-\u03ff]/.test(ch)) { let j = i; while (j < s.length && /[A-Za-z0-9_.\u0370-\u03ff]/.test(s[j])) j++; out.push({ t: 'id', v: s.slice(i, j) }); i = j; continue; }
        if ('+-*/^(),='.indexOf(ch) >= 0) { out.push({ t: 'op', v: ch }); i++; continue; }
        throw new Error('I do not understand the symbol "' + ch + '"');
      }
      return out;
    }
    function evaluate(line) {
      const tk = tokenize(line); let p = 0;
      const peek = () => tk[p], next = () => tk[p++], isOp = (v) => tk[p] && tk[p].t === 'op' && tk[p].v === v;
      function expr() { let v = term(); while (isOp('+') || isOp('-')) { const o = next().v, r = term(); v = o === '+' ? v + r : v - r; } return v; }
      function term() { let v = unary(); while (isOp('*') || isOp('/')) { const o = next().v, r = unary(); v = o === '*' ? v * r : v / r; } return v; }
      function unary() { if (isOp('-')) { next(); return -unary(); } if (isOp('+')) { next(); return unary(); } return power(); }
      function power() { const b = atom(); if (isOp('^')) { next(); return Math.pow(b, unary()); } return b; }
      function atom() {
        const t = next(); if (!t) throw new Error('The line ends too soon');
        if (t.t === 'num') return t.v;
        if (t.t === 'op' && t.v === '(') { const v = expr(); if (!isOp(')')) throw new Error('A bracket is not closed'); next(); return v; }
        if (t.t === 'id') {
          const name = t.v;
          if (isOp('(')) {
            next(); const args = []; if (!isOp(')')) { args.push(expr()); while (isOp(',')) { next(); args.push(expr()); } } if (!isOp(')')) throw new Error('A bracket is not closed'); next();
            const f = F[name]; if (!f) throw new Error('I do not know the function "' + name + '"'); const r = f.apply(null, args); return r;
          }
          if (name in vars) return vars[name];
          if (name in C) return C[name];
          const dot = name.indexOf('.');
          if (dot > 0) { const tb = name.slice(0, dot), cl = name.slice(dot + 1); if (T.SCHEMA[tb]) { if (!T.SCHEMA[tb].cols.some((c) => c.name === cl)) throw new Error('The table ' + tb + ' has no column ' + cl); return T.column(league, tb, cl); } }
          throw new Error('"' + name + '" is not defined');
        }
        throw new Error('Unexpected "' + t.v + '"');
      }
      let target = null;
      if (tk.length > 2 && tk[0].t === 'id' && tk[1].t === 'op' && tk[1].v === '=') { target = tk[0].v; p = 2; }
      const v = expr(); if (p < tk.length) throw new Error('I could not read the end of that line');
      if (Array.isArray(v)) return { value: v, text: '[' + v.length + ' values]', target };
      if (!Number.isFinite(v)) throw new Error('That does not give a number');
      return { value: v, text: sig(v, 8), target };
    }
    return { evaluate };
  }

  // ---------- charts ----------
  function nice(lo, hi, n) {
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) { lo = 0; hi = 1; }
    if (lo === hi) { lo -= 1; hi += 1; }
    const raw = (hi - lo) / (n || 5), mag = Math.pow(10, Math.floor(Math.log10(raw))), nm = raw / mag, step = (nm < 1.5 ? 1 : nm < 3 ? 2 : nm < 7 ? 5 : 10) * mag;
    const a = Math.floor(lo / step + 1e-9) * step, b = Math.ceil(hi / step - 1e-9) * step, ticks = [];
    for (let v = a; v <= b + step / 2; v += step) ticks.push(Number(v.toFixed(10)));
    return { lo: a, hi: b, ticks };
  }
  const tl = (v) => { const a = Math.abs(v); return a >= 1000 ? String(Math.round(v)) : String(Number(v.toPrecision(3))); };
  function chartSvg(c) {
    if (!c) return '';
    const W = 600, H = 300, m = { l: 54, r: 16, t: 14, b: 46 }, iw = W - m.l - m.r, ih = H - m.t - m.b;
    const frame = (xs, ys, xlab, ylab) => {
      const X = (v) => m.l + (v - xs.lo) / (xs.hi - xs.lo) * iw, Y = (v) => m.t + ih - (v - ys.lo) / (ys.hi - ys.lo) * ih;
      let g = ys.ticks.map((v) => `<line class="wbc-grid" x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}"/><text class="wbc-tick" x="${m.l - 6}" y="${Y(v) + 4}" text-anchor="end">${tl(v)}</text>`).join('');
      if (xs.ticks) g += xs.ticks.map((v) => `<line class="wbc-tickmark" x1="${X(v)}" x2="${X(v)}" y1="${m.t + ih}" y2="${m.t + ih + 4}"/><text class="wbc-tick" x="${X(v)}" y="${m.t + ih + 17}" text-anchor="middle">${tl(v)}</text>`).join('');
      g += `<line class="wbc-axis" x1="${m.l}" x2="${W - m.r}" y1="${m.t + ih}" y2="${m.t + ih}"/><line class="wbc-axis" x1="${m.l}" x2="${m.l}" y1="${m.t}" y2="${m.t + ih}"/>`;
      g += `<text class="wbc-lab" x="${m.l + iw / 2}" y="${H - 6}" text-anchor="middle">${esc(xlab)}</text><text class="wbc-lab" transform="translate(13 ${m.t + ih / 2}) rotate(-90)" text-anchor="middle">${esc(ylab)}</text>`;
      return { g, X, Y };
    };
    let body = '';
    if (c.type === 'scatter') {
      const px = c.points.map((p) => p[0]), py = c.points.map((p) => p[1]), xs = nice(Math.min.apply(null, px), Math.max.apply(null, px)), ys = nice(Math.min.apply(null, py), Math.max.apply(null, py)), f = frame(xs, ys, c.x, c.y);
      body = f.g + c.points.map((p) => `<rect class="wbc-pt" x="${f.X(p[0]) - 2.5}" y="${f.Y(p[1]) - 2.5}" width="5" height="5"/>`).join('');
      if (c.fit) { const y0 = c.fit.a + c.fit.b * xs.lo, y1 = c.fit.a + c.fit.b * xs.hi; body += `<line class="wbc-fit" x1="${f.X(xs.lo)}" y1="${f.Y(Math.max(ys.lo, Math.min(ys.hi, y0)))}" x2="${f.X(xs.hi)}" y2="${f.Y(Math.max(ys.lo, Math.min(ys.hi, y1)))}"/>`; }
    } else if (c.type === 'hist') {
      const lo = c.bins[0].from, hi = c.bins[c.bins.length - 1].to, xs = nice(lo, hi), ys = nice(0, Math.max.apply(null, c.bins.map((b) => b.n))), f = frame(xs, ys, c.x || 'value', 'count');
      body = f.g + c.bins.map((b) => `<rect class="wbc-bar" x="${f.X(b.from) + 0.5}" y="${f.Y(b.n)}" width="${Math.max(1, f.X(b.to) - f.X(b.from) - 1)}" height="${m.t + ih - f.Y(b.n)}"/>`).join('');
    } else if (c.type === 'bars' || c.type === 'bars2') {
      const labels = c.type === 'bars' ? c.bars.map((b) => b.label) : c.labels, series = c.type === 'bars' ? [{ name: c.y, values: c.bars.map((b) => b.value) }] : [c.a, c.b];
      const vals = [].concat.apply([], series.map((s) => s.values)).concat(c.type === 'bars' ? c.bars.reduce((a, b) => a.concat(b.lo != null ? [b.lo, b.hi] : []), []) : []);
      const ys = nice(Math.min(0, Math.min.apply(null, vals)), Math.max(0, Math.max.apply(null, vals))), f = frame({ lo: 0, hi: 1 }, ys, c.x, c.y), band = iw / labels.length, bw = Math.min(70, band * 0.7 / series.length);
      body = f.g + labels.map((lb, i) => {
        const cx = m.l + band * (i + 0.5);
        let s = `<text class="wbc-tick" x="${cx}" y="${m.t + ih + 17}" text-anchor="middle">${esc(String(lb).length > 18 ? String(lb).slice(0, 17) + '…' : lb)}</text>`;
        series.forEach((se, k) => {
          const v = se.values[i], x0 = cx - bw * series.length / 2 + k * bw, y0 = f.Y(Math.max(0, ys.lo)), y1 = f.Y(v);
          s += `<rect class="wbc-bar ${k ? 'b' : 'a'}" x="${x0 + 1}" y="${Math.min(y0, y1)}" width="${bw - 2}" height="${Math.abs(y0 - y1)}"/><text class="wbc-val" x="${x0 + bw / 2}" y="${(c.type === 'bars' && c.bars[i].hi != null ? Math.min(f.Y(c.bars[i].hi), y1) : Math.min(y0, y1)) - 5}" text-anchor="middle">${tl(v)}</text>`;
          if (c.type === 'bars' && c.bars[i].lo != null) s += `<line class="wbc-err" x1="${x0 + bw / 2}" x2="${x0 + bw / 2}" y1="${f.Y(c.bars[i].lo)}" y2="${f.Y(c.bars[i].hi)}"/><line class="wbc-err" x1="${x0 + bw / 2 - 5}" x2="${x0 + bw / 2 + 5}" y1="${f.Y(c.bars[i].lo)}" y2="${f.Y(c.bars[i].lo)}"/><line class="wbc-err" x1="${x0 + bw / 2 - 5}" x2="${x0 + bw / 2 + 5}" y1="${f.Y(c.bars[i].hi)}" y2="${f.Y(c.bars[i].hi)}"/>`;
        });
        return s;
      }).join('');
      if (c.type === 'bars2') body += `<g class="wbc-key"><rect class="wbc-bar a" x="${W - m.r - 190}" y="${m.t}" width="10" height="10"/><text x="${W - m.r - 175}" y="${m.t + 9}">${esc(c.a.name)}</text><rect class="wbc-bar b" x="${W - m.r - 190}" y="${m.t + 16}" width="10" height="10"/><text x="${W - m.r - 175}" y="${m.t + 25}">${esc(c.b.name)}</text></g>`;
    } else return '';
    return `<figure class="wb-chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(c.y || '')} against ${esc(c.x || '')}">${body}</svg>${c.note ? `<figcaption>${esc(c.note)}</figcaption>` : ''}</figure>`;
  }

  // ---------- results ----------
  function resultHtml(res) {
    if (!res) return '';
    if (!res.ok) return `<div class="wb-err">${esc(res.error)}</div>`;
    const tables = (res.tables || []).map((t) => `<div class="wb-tbl"><div class="wb-tbl-t">${esc(t.title || '')}</div><div class="wb-scroll"><table><thead><tr>${t.cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${t.rows.map((r) => `<tr>${r.map((v, i) => `<td class="${typeof v === 'number' ? 'n' : i ? 'n' : 'l'}">${esc(v == null ? '–' : v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${t.more ? `<div class="wb-more">${esc(t.more)}</div>` : ''}</div>`).join('');
    return `${(res.summary || []).map((s) => `<p class="wb-sum">${esc(s)}</p>`).join('')}${chartSvg(res.chart)}${tables}${res.caveats && res.caveats.length ? `<div class="wb-care"><b>Take care</b><ul>${res.caveats.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div>` : ''}${res.n != null ? `<div class="wb-foot">${esc(res.n)} rows used</div>` : ''}`;
  }
  // the same result as plain text (for the agent, and for copying)
  function resultText(res, cap) {
    if (!res) return '';
    if (!res.ok) return 'Could not run: ' + res.error;
    let s = res.title + (res.n != null ? ' [' + res.n + ' rows]' : '') + '\n' + (res.summary || []).join('\n');
    (res.tables || []).forEach((t) => { s += '\n' + (t.title || '') + ': ' + t.cols.join(' | ') + '\n' + t.rows.slice(0, 14).map((r) => r.map((v) => (v == null ? '–' : v)).join(' | ')).join('\n'); });
    if (res.caveats && res.caveats.length) s += '\nCaveats: ' + res.caveats.join(' ');
    return cap ? s.slice(0, cap) : s;
  }
  function queryResult(league, spec) {
    const r = T.query(league, spec);
    if (r.error) return { ok: false, error: r.error };
    const desc = spec.group && spec.group.length ? 'by ' + spec.group.join(', ') : (spec.agg || []).length ? 'summary' : 'rows';
    return { ok: true, method: 'query', title: spec.table + ': ' + desc, n: r.total, summary: [], caveats: [], tables: [{ title: spec.table + (spec.where && spec.where.length ? ' (filtered)' : ''), cols: r.columns, rows: r.rows, more: r.total > r.rows.length ? 'Showing the first ' + r.rows.length + ' of ' + r.total + ' rows.' : '' }], spec: Object.assign({ method: 'query' }, spec) };
  }

  // ---------- the analysis builder ----------
  const OPS = ['=', '!=', '>', '>=', '<', '<=', 'contains'];
  const FIELDS = {
    describe: [['y', 'Measure', 'num'], ['group', 'Split by (optional)', 'cat?']],
    compare: [['y', 'Measure', 'num'], ['by', 'Compare groups of', 'any'], ['a', 'Group A (value)', 'text'], ['b', 'Group B (value)', 'text']],
    correlation: [['x', 'x (explains)', 'num'], ['y', 'y (outcome)', 'num']],
    ols: [['y', 'Outcome', 'num'], ['x', 'Predictors', 'multi']],
    logistic: [['y', 'Outcome (0 or 1)', 'num'], ['x', 'Predictors', 'multi']],
    mle: [['model', 'Model', ['poisson', 'negbin', 'logit', 'probit', 'normal']], ['y', 'Outcome', 'num'], ['x', 'Predictors (none = fit the distribution)', 'multi']],
    did: [['y', 'Outcome', 'num'], ['treatcol', 'Treated group: column', 'any'], ['treatval', '… equals', 'text'], ['aftercol', 'After the change: column', 'num'], ['afterval', '… is at least', 'text']],
    bootstrap: [['y', 'Measure', 'num'], ['statistic', 'Statistic', ['mean', 'median', 'sd']]],
    query: [['group', 'Group by (optional)', 'cat?'], ['fn', 'Summary', ['', 'count', 'mean', 'sum', 'median', 'min', 'max', 'sd']], ['col', 'of column', 'num?'], ['order', 'Order by (optional)', 'any?'], ['dir', 'Direction', ['desc', 'asc']], ['limit', 'Rows', 'text']],
    forecast: [['kind', 'Forecast', ['season', 'price', 'trend']], ['stand', 'Stand (for a price forecast)', 'stand'], ['from', 'Lowest price £ (price)', 'text'], ['to', 'Highest price £ (price)', 'text'], ['y', 'Measure to carry forward (trend)', 'num?'], ['ahead', 'Matchdays ahead (trend)', 'text']],
    experiment: [['tactic', 'Tactic to change', 'tactic'], ['a', 'Setting A (0–1)', 'text'], ['b', 'Setting B (0–1)', 'text'], ['matches', 'Matched replays (4–24)', 'text'], ['minutes', 'Minutes of each (10–90)', 'text'], ['opponent', 'Opponent (optional)', 'opp']],
    simulate: [['tactic', 'Tactic to randomise', 'tactic'], ['lo', 'From (0–1)', 'text'], ['hi', 'To (0–1)', 'text'], ['matches', 'Matches (6–40)', 'text'], ['minutes', 'Minutes of each (10–90)', 'text'], ['opponent', 'Opponent (optional)', 'opp']],
  };
  const METHOD_LABEL = { query: 'Table of figures', describe: 'Describe', compare: 'Compare two groups', correlation: 'Correlation', ols: 'Linear regression', logistic: 'Logistic regression', mle: 'Maximum likelihood model', did: 'Difference in differences', bootstrap: 'Bootstrap interval', experiment: 'Controlled experiment', simulate: 'Randomised trial', forecast: 'Forecast' };
  const LEVEL_METHODS = { gcse: ['query', 'describe', 'compare', 'correlation', 'forecast', 'experiment'], alevel: ['query', 'describe', 'compare', 'correlation', 'ols', 'logistic', 'bootstrap', 'forecast', 'experiment'], above: Object.keys(METHOD_LABEL) };
  const num = (v) => { const n = Number(v); return v !== '' && v != null && Number.isFinite(n) ? n : v; };
  function specFromForm(f) {
    const m = f.method, g = (k) => f[k], out = { method: m, table: f.table };
    const where = (f.where || []).filter((w) => w.col && w.value !== '' && w.value != null).map((w) => ({ col: w.col, op: w.op || '=', value: w.op === 'contains' ? w.value : num(w.value) }));
    if (m === 'experiment' || m === 'simulate') { delete out.table; out.tactic = g('tactic'); ['a', 'b', 'lo', 'hi', 'matches', 'minutes'].forEach((k) => { if (g(k) !== '' && g(k) != null) out[k] = Number(g(k)); }); if (g('opponent')) out.opponent = g('opponent'); return out; }
    if (m === 'forecast') { const o = { method: 'forecast', kind: g('kind') || 'season' }; if (o.kind === 'price') { o.stand = g('stand') || 'family'; if (g('from')) o.from = Number(g('from')); if (g('to')) o.to = Number(g('to')); } if (o.kind === 'trend') { o.table = f.table; if (g('y')) o.y = g('y'); if (g('ahead')) o.ahead = Number(g('ahead')); if (where.length) o.where = where; } return o; }
    if (where.length) out.where = where;
    if (m === 'query') { if (g('group')) out.group = [g('group')]; if (g('fn')) out.agg = [{ fn: g('fn'), col: g('fn') === 'count' ? undefined : g('col'), as: g('fn') + (g('col') ? '_' + g('col') : '') }]; else if (g('group')) out.agg = [{ fn: 'count', as: 'n' }]; if (g('order')) out.order = { col: g('order'), dir: g('dir') || 'desc' }; out.limit = Math.max(1, Math.min(500, Number(g('limit')) || 30)); return out; }
    if (m === 'did') { out.y = g('y'); out.treat = { col: g('treatcol'), op: '=', value: num(g('treatval')) }; out.after = { col: g('aftercol'), op: '>=', value: num(g('afterval')) }; return out; }
    if (m === 'compare') { out.y = g('y'); out.by = g('by'); if (g('a') !== '' && g('a') != null) out.a = num(g('a')); if (g('b') !== '' && g('b') != null) out.b = num(g('b')); return out; }
    ['y', 'x', 'group', 'model', 'statistic'].forEach((k) => { const v = g(k); if (v != null && v !== '' && !(Array.isArray(v) && !v.length && k !== 'x')) out[k] = v; });
    if (m === 'ols' || m === 'logistic' || m === 'mle') out.x = Array.isArray(g('x')) ? g('x') : [];
    return out;
  }
  function formFromSpec(s) {
    const f = { method: s.method, table: s.table || 'team_matches', where: (s.where || []).map((w) => ({ col: w.col, op: w.op, value: Array.isArray(w.value) ? w.value.join(',') : w.value })) };
    ['y', 'x', 'group', 'model', 'statistic', 'by', 'a', 'b', 'tactic', 'lo', 'hi', 'matches', 'minutes', 'opponent', 'kind', 'stand', 'ahead', 'from', 'to'].forEach((k) => { if (s[k] != null) f[k] = s[k]; });
    if (s.method === 'query') { f.group = (s.group || [])[0] || ''; const a = (s.agg || [])[0]; if (a) { f.fn = a.fn; f.col = a.col || ''; } if (s.order) { f.order = s.order.col; f.dir = s.order.dir; } f.limit = s.limit || 30; }
    if (s.method === 'did' && s.treat) { f.treatcol = s.treat.col; f.treatval = s.treat.value; f.aftercol = s.after.col; f.afterval = s.after.value; }
    return f;
  }

  // ---------- the maths keyboard ----------
  const KEYS = {
    Maths: [['7', '8', '9', '÷', '(', ')', '^'], ['4', '5', '6', '×', '√(', 'π', 'e'], ['1', '2', '3', '−', '+', '=', 'ans'], ['0', '.', ',', '/', '²', '³', '⌫'], ['ln(', 'log(', 'exp(', 'abs(', 'round(', 'fact(', 'choose(']],
    Statistics: [['x̄', 'ȳ', 'p̂', 'μ', 'σ', 's²', 'Σ'], ['H₀', 'H₁', 'α', 'β', 'λ', 'ρ', 'χ²'], ['mean(', 'sd(', 'median(', 'sum(', 'n(', 'min(', 'max(']
      , ['normcdf(', 'norminv(', 'binompmf(', 'binomcdf(', 'poispmf(', 'poiscdf(', 'tcdf(']],
    Symbols: [['≤', '≥', '≠', '≈', '±', '∞', '∝'], ['⇒', '⇔', '∈', '∉', '∪', '∩', '∴'], ['Δ', 'Σ', 'Π', '∫', '∂', '∀', '∃'], ['α', 'β', 'γ', 'δ', 'θ', 'φ', 'ω']],
  };

  // ---------- the page ----------
  const state = { league: null, opts: null, wb: null, focus: null, host: null };
  const getWb = (league) => {
    if (!league.workbench) league.workbench = { v: 1, title: 'Untitled analysis', cells: [], chat: [], settings: { detail: 'standard' }, ui: { data: window.innerWidth >= 1280, dataSet: 1, agent: window.innerWidth >= 1280, kb: false, kbTab: 'Maths' }, extra: [], vars: {} };
    const w = league.workbench; if (w.ui && w.ui.dataSet == null) { w.ui.dataSet = 1; if (window.innerWidth < 1280) { w.ui.data = false; w.ui.agent = false; } }
    w.cells = w.cells || []; w.chat = w.chat || []; w.settings = w.settings || { detail: 'standard' }; w.ui = w.ui || { data: true, agent: true, kb: false, kbTab: 'Maths' }; w.extra = w.extra || []; w.vars = w.vars || {};
    return w;
  };
  let saveT = 0;
  function save() {
    const wb = state.wb; if (!wb) return;
    wb.extra = T.extraTables().map((x) => ({ name: x.name, desc: x.desc, cols: x.cols, rows: x.rows }));
    clearTimeout(saveT); saveT = setTimeout(() => { if (state.opts && state.opts.save) state.opts.save(); }, 400);
  }
  const dataStamp = () => state.league.fixtures.filter((f) => f.played).length;

  function tableOptions(sel) { return Object.keys(T.SCHEMA).map((k) => `<option value="${k}"${k === sel ? ' selected' : ''}>${k}</option>`).join(''); }
  function colOptions(table, kind, sel) {
    const sch = T.SCHEMA[table]; if (!sch) return '';
    const opt = kind.endsWith('?'), k = kind.replace('?', '');
    return (opt ? `<option value="">none</option>` : '') + sch.cols.filter((c) => k === 'any' || (k === 'num' && c.type === 'num') || (k === 'cat' && c.type === 'cat')).map((c) => `<option value="${c.name}"${c.name === sel ? ' selected' : ''}>${c.name}</option>`).join('');
  }
  function builderHtml(cell) {
    const f = cell.form, fields = FIELDS[f.method] || [], sch = T.SCHEMA[f.table], tier = state.league.tier;
    const methods = LEVEL_METHODS[tier] || LEVEL_METHODS.above;
    const field = ([k, label, kind]) => {
      let ctl;
      if (Array.isArray(kind)) ctl = `<select data-f="${k}">${kind.map((o) => `<option value="${o}"${f[k] === o ? ' selected' : ''}>${o || 'none'}</option>`).join('')}</select>`;
      else if (kind === 'multi') ctl = `<div class="wb-chips">${sch ? sch.cols.map((c) => `<button type="button" class="wb-chip${(f[k] || []).indexOf(c.name) >= 0 ? ' on' : ''}" data-multi="${k}" data-col="${c.name}">${c.name}</button>`).join('') : ''}</div>`;
      else if (kind === 'tactic') ctl = `<select data-f="${k}">${Object.keys(WB.TACTICS).map((o) => `<option value="${o}"${f[k] === o ? ' selected' : ''}>${o} (${esc(WB.TACTICS[o])})</option>`).join('')}</select>`;
      else if (kind === 'stand') ctl = `<select data-f="${k}">${(FM.SEGMENTS || []).map((o) => `<option value="${o.id}"${f[k] === o.id ? ' selected' : ''}>${esc(o.name)}</option>`).join('')}</select>`;
      else if (kind === 'opp') ctl = `<select data-f="${k}"><option value="">the next opponent</option>${state.league.teams.filter((t) => t.id !== state.league.userId).map((t) => `<option value="${esc(t.name)}"${f[k] === t.name ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}</select>`;
      else if (kind === 'text') ctl = `<input type="text" data-f="${k}" value="${esc(f[k] == null ? '' : f[k])}" autocomplete="off">`;
      else ctl = `<select data-f="${k}">${colOptions(f.table, kind, f[k])}</select>`;
      return `<label class="wb-fld${kind === 'multi' ? ' wide' : ''}"><span>${label}</span>${ctl}</label>`;
    };
    const noTable = f.method === 'experiment' || f.method === 'simulate';
    const where = noTable ? '' : `<div class="wb-where"><span class="wb-fld-l">Only rows where</span>${[0, 1, 2].map((i) => { const w = (f.where || [])[i] || {}; return `<span class="wb-w"><select data-w="${i}" data-wk="col"><option value="">–</option>${sch ? sch.cols.map((c) => `<option value="${c.name}"${w.col === c.name ? ' selected' : ''}>${c.name}</option>`).join('') : ''}</select><select data-w="${i}" data-wk="op">${OPS.map((o) => `<option${(w.op || '=') === o ? ' selected' : ''}>${o}</option>`).join('')}</select><input type="text" data-w="${i}" data-wk="value" value="${esc(w.value == null ? '' : w.value)}" placeholder="value"></span>`; }).join('')}</div>`;
    return `<div class="wb-build"><div class="wb-grid"><label class="wb-fld"><span>Method</span><select data-f="method">${Object.keys(METHOD_LABEL).filter((k) => methods.indexOf(k) >= 0 || f.method === k).map((k) => `<option value="${k}"${f.method === k ? ' selected' : ''}>${METHOD_LABEL[k]}</option>`).join('')}</select></label>${noTable ? '' : `<label class="wb-fld"><span>Table</span><select data-f="table">${tableOptions(f.table)}</select></label>`}${fields.map(field).join('')}</div>${where}<div class="wb-row"><button class="wb-run" type="button" data-act="run">Run</button><span class="wb-hint">${esc(helpFor(f.method))}</span></div></div>`;
  }
  const HELP = { forecast: 'Look ahead: where the club will finish, what a ticket price would bring in, or a measure carried forward. Fill in only what the kind of forecast needs.', query: 'Filters, groups and summarises a table.', describe: 'Mean, spread and shape of one measure.', compare: 'Are two groups different? Welch t-test, permutation test, bootstrap interval.', correlation: 'How strongly two measures move together, with a line of best fit.', ols: 'One outcome explained by several things at once.', logistic: 'Chance of a yes/no outcome from several things.', mle: 'Fit a probability model by maximum likelihood.', did: 'Compare the change in one group with the change in another.', bootstrap: 'How uncertain is a mean, median or spread? Resample the data.', experiment: 'Replay the same matches with one tactic changed: a true cause-and-effect test. Takes a minute or two.', simulate: 'Play many matches with a tactic set at random; the results become a new table you can analyse. Takes a minute or two.' };
  const helpFor = (m) => HELP[m] || '';
  const newForm = (method) => ({ method: method || 'describe', table: 'team_matches', where: [], x: [], model: 'poisson', statistic: 'mean', kind: 'season', stand: 'family', ahead: 5, tactic: 'pressing', a: 0.2, b: 0.9, lo: 0.2, hi: 0.9, matches: 10, minutes: 30, limit: 30, dir: 'desc' });


  // ---------- changes: anything the club can do, by hand or proposed by the agent ----------
  const CTL = () => FM.controls;
  // The form for a lever or rule is flat; the agent sends them nested, so they are flattened to the same form.
  function flatten(action, p) {
    const q = Object.assign({}, p);
    if (action === 'addLever' && Array.isArray(q.effects)) { (q.effects || []).slice(0, 2).forEach((e, i) => { q['target' + (i + 1)] = e.target; q['pct' + (i + 1)] = e.pct; }); delete q.effects; }
    if (action === 'addRule' && q.when && q.do) { q.metric = q.when.metric; q.op = q.when.op; q.value = q.when.value; q.action = q.do.action; const pp = q.do.params || {}; q.stand = pp.stand || ''; q.amount = pp.price != null ? pp.price : pp.perRound != null ? pp.perRound : pp.percent != null ? pp.percent : ''; q.once = q.once ? '1' : ''; delete q.when; delete q.do; }
    return q;
  }
  function newControlCell(action, params, by) {
    const a = CTL().ACTIONS[action], lg = state.league, p = flatten(action, params || {});
    a.params.forEach((pr) => {
      if (p[pr.k] != null && p[pr.k] !== '') return;
      if (pr.kind === 'select') { const o = CTL().optionsFor(lg, pr); if (o.length) p[pr.k] = o[0].value; }
      else if (pr.kind === 'num') { const b = lg.biz || {}; p[pr.k] = action === 'setMarketing' ? (b.marketing || 0) : action === 'setDividend' ? Math.round(((b.dividend || {}).policy || 0) * 100) : action === 'takeLoan' ? 1000000 : action === 'issueShares' ? 1000000 : pr.k === 'price' ? ((b.prices && b.prices[p.stand]) ? b.prices[p.stand].price : 20) : pr.k === 'perRound' ? 10000 : pr.k === 'rounds' ? 14 : pr.k === 'pct1' ? 5 : pr.k === 'ask' ? 5000 : pr.k === 'value' ? 0 : pr.k === 'amount' ? 0 : ''; }
      else p[pr.k] = p[pr.k] == null ? '' : p[pr.k];
    });
    return { type: 'control', action, params: p, status: 'open', by: by || 'manual' };
  }
  function controlFieldHtml(pr, cell) {
    const v = cell.params[pr.k], lg = state.league; let ctl;
    if (pr.kind === 'select') ctl = `<select data-cp="${pr.k}">${CTL().optionsFor(lg, pr).map((o) => `<option value="${esc(o.value)}"${String(o.value) === String(v) ? ' selected' : ''}>${esc(o.label)}</option>`).join('') || '<option value="">(none available)</option>'}</select>`;
    else if (pr.kind === 'num') ctl = `<input type="number" data-cp="${pr.k}" value="${esc(v == null ? '' : v)}"${pr.min != null ? ' min="' + pr.min + '"' : ''}${pr.max != null ? ' max="' + pr.max + '"' : ''} step="${pr.step || 1}">`;
    else ctl = `<input type="text" data-cp="${pr.k}" value="${esc(v == null ? '' : v)}" autocomplete="off">`;
    return `<label class="wb-fld"><span>${esc(pr.label)}</span>${ctl}</label>`;
  }
  function previewHtml(cell) {
    const a = CTL().ACTIONS[cell.action]; if (!a.preview) return '';
    const pv = CTL().preview(state.league, cell.action, cell.params); if (!pv) return '';
    return `<div class="wb-prev${pv.bad ? ' bad' : ''}"><b>${pv.bad ? 'Not possible yet' : 'What the game will do'}</b> ${esc(pv.text)}${(pv.warnings || []).map((w) => `<br><i>${esc(w)}</i>`).join('')}</div>`;
  }
  function controlCellHtml(cell, i, n) {
    const a = CTL().ACTIONS[cell.action], by = cell.by === 'agent' ? ' <i>proposed by the agent</i>' : '';
    const bar = `<div class="wb-cbar"><span class="wb-ctype">Change: ${esc(a.title)}${by}</span><span class="wb-cact"><button type="button" data-act="up" ${i ? '' : 'disabled'} aria-label="Move up">↑</button><button type="button" data-act="down" ${i < n - 1 ? '' : 'disabled'} aria-label="Move down">↓</button><button type="button" data-act="del" aria-label="Delete">✕</button></span></div>`;
    let body;
    if (cell.status === 'applied') body = `<div class="wb-applied"><b>Done.</b> ${esc(cell.result && cell.result.text)}</div>`;
    else if (cell.status === 'dismissed') body = '<p class="wb-hint">Dismissed. Nothing was changed.</p>';
    else {
      const stateNow = a.current ? `<p class="wb-hint">Now: ${esc(a.current(state.league))}</p>` : '';
      body = `<p class="wb-hint">${esc(a.desc)}</p>${stateNow}${cell.result && !cell.result.ok ? `<div class="wb-err">${esc(cell.result.text)}</div>` : ''}<div class="wb-build"><div class="wb-grid">${a.params.map((pr) => controlFieldHtml(pr, cell)).join('')}</div><div id="prev-${cell.id}">${previewHtml(cell)}</div><div class="wb-row"><button class="wb-run" type="button" data-cact="apply">Apply</button><button type="button" class="wb-alt" data-cact="forecast">What would this do to the money?</button><button type="button" class="wb-alt" data-cact="dismiss">Dismiss</button></div></div>${cell.fc ? (cell.fc.working ? '<p class="wb-hint">Working it out on a copy of the club…</p>' : `<div class="wb-res">${resultHtml(cell.fc)}</div>`) : ''}`;
    }
    return `<article class="wb-cell control ${cell.status}" data-cell="${cell.id}">${bar}${body}</article>`;
  }
  function applyControl(cell) {
    const r = CTL().run(state.league, cell.action, cell.params, cell.by === 'agent' ? 'agent' : 'manual');
    cell.result = r; cell.status = r.ok ? 'applied' : 'open'; cell.fc = null; save(); refreshCell(cell); refreshData();
    return r;
  }
  function forecastControl(cell) {
    cell.fc = { working: true }; refreshCell(cell);
    setTimeout(() => { cell.fc = WB.run(state.league, { method: 'forecast', kind: 'scenario', label: CTL().ACTIONS[cell.action].title.toLowerCase(), actions: [{ action: cell.action, params: cell.params }] }); refreshCell(cell); }, 30);
  }
  function cellHtml(cell, i, n) {
    if (cell.type === 'control') return controlCellHtml(cell, i, n);
    const bar = `<div class="wb-cbar"><span class="wb-ctype">${cell.type === 'text' ? 'Text' : cell.type === 'calc' ? 'Calculator' : cell.type === 'lesson' ? 'Note' : cell.res && cell.res.ok ? esc(cell.res.title) : cell.type === 'analysis' ? 'Analysis' : 'Cell'}${cell.by === 'agent' ? ' <i>added by the agent</i>' : ''}</span><span class="wb-cact">${cell.type === 'analysis' ? `<button type="button" data-act="edit" title="Change the settings">${cell.edit ? 'Hide settings' : 'Settings'}</button>` : ''}${cell.type === 'analysis' && cell.res && cell.res.ok ? '<button type="button" data-act="explain" title="Ask the agent to talk you through this result">Explain</button>' : ''}${cell.type === 'analysis' && cell.res ? '<button type="button" data-act="copy" title="Copy as text">Copy</button>' : ''}<button type="button" data-act="up" ${i ? '' : 'disabled'} aria-label="Move up">↑</button><button type="button" data-act="down" ${i < n - 1 ? '' : 'disabled'} aria-label="Move down">↓</button><button type="button" data-act="del" aria-label="Delete">✕</button></span></div>`;
    let body = '';
    if (cell.type === 'text' || cell.type === 'lesson') body = `<textarea class="wb-in wb-text" data-k="text" rows="${Math.max(3, Math.min(14, String(cell.text || '').split('\n').length + 1))}" placeholder="Write here. Use the maths keyboard for symbols.">${esc(cell.text || '')}</textarea>`;
    else if (cell.type === 'calc') body = `<div class="wb-calc"><textarea class="wb-in wb-code" data-k="text" rows="${Math.max(3, String(cell.text || '').split('\n').length + 1)}" spellcheck="false" placeholder="One calculation per line, for example:&#10;12 × 3.5&#10;x = mean(team_matches.xg)&#10;binompmf(10, 3, 0.25)&#10;# a line starting with # is a comment">${esc(cell.text || '')}</textarea><div class="wb-calc-out" data-out>${calcOut(cell)}</div></div>`;
    else if (cell.type === 'analysis') {
      const stale = cell.res && cell.res.ok && cell.stamp != null && cell.stamp !== dataStamp() && cell.form && cell.form.method !== 'experiment' && cell.form.method !== 'simulate';
      body = `${cell.edit || !cell.res ? builderHtml(cell) : ''}${cell.running ? `<div class="wb-run-s"><span>${esc(cell.progress || 'Working…')}</span><span class="wb-pbar"><i style="width:${Math.round((cell.pct || 0) * 100)}%"></i></span><button type="button" data-act="stop">Stop</button></div>` : ''}${stale ? '<div class="wb-stale">The data has changed since this was run. <button type="button" data-act="run">Run again</button></div>' : ''}<div class="wb-res">${resultHtml(cell.res)}</div>`;
    }
    return `<article class="wb-cell ${cell.type}" data-cell="${cell.id}">${bar}${body}</article>`;
  }
  function calcOut(cell) {
    const vars = state.wb.vars; const calc = makeCalc(state.league, vars); let last = null;
    return String(cell.text || '').split('\n').map((ln) => {
      const t = ln.trim(); if (!t) return '<div>&nbsp;</div>'; if (t[0] === '#') return `<div class="wb-cm">${esc(t.replace(/^#\s*/, ''))}</div>`;
      try { vars.ans = last == null ? 0 : last; const r = calc.evaluate(t); if (typeof r.value === 'number') { last = r.value; vars.ans = r.value; } if (r.target) vars[r.target] = r.value; return `<div>${r.target ? esc(r.target) + ' = ' : '= '}<b>${esc(r.text)}</b></div>`; } catch (e) { return `<div class="wb-bad">${esc(e.message)}</div>`; }
    }).join('');
  }

  // ---------- the document ----------
  function renderDoc() {
    const wb = state.wb, host = el('wbDoc'); if (!host) return;
    const keep = host.scrollTop;
    host.innerHTML = wb.cells.length ? wb.cells.map((c, i) => cellHtml(c, i, wb.cells.length)).join('') : emptyHtml();
    host.scrollTop = keep;
  }
  function emptyHtml() {
    return `<div class="wb-empty"><h3>What do you want to find out, or do?</h3><p>Ask the agent on the right in your own words, or add a cell from the toolbar. You can investigate anything the game recorded, forecast what would happen, and change things: prices, spending, loans, injuries, or something the game has no button for. The Board only shows the figures; this is where you act on them.</p><div class="wb-ex">${EXAMPLES.map((q) => `<button type="button" data-ask="${esc(q)}">${esc(q)}</button>`).join('')}</div></div>`;
  }
  const EXAMPLES = ['Change the family stand ticket price to £22, and tell me what it should do to the money', 'Spend £20,000 a matchday on a youth scouting network for the rest of the season', 'Look at our injuries and tell me whether paying for treatment is worth it', 'Forecast the bank balance to the end of the season if I stop all marketing', 'Where are we likely to finish this season?', 'Does a higher press lead to more turnovers?'];

  function addCell(cell, opts) {
    const wb = state.wb; cell.id = cell.id || uid();
    if (wb.cells.length >= 80) wb.cells.shift();
    wb.cells.push(cell); save(); renderDoc();
    if (!opts || opts.scroll !== false) setTimeout(() => { const n = document.querySelector('[data-cell="' + cell.id + '"]'); if (n) n.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 30);
    return cell;
  }
  const findCell = (id) => state.wb.cells.find((c) => c.id === id);
  const refreshCell = (cell) => { const n = document.querySelector('[data-cell="' + cell.id + '"]'); if (n) { const i = state.wb.cells.indexOf(cell); n.outerHTML = cellHtml(cell, i, state.wb.cells.length); } };

  async function runCell(cell) {
    if (cell.running) return;
    cell.spec = specFromForm(cell.form); cell.running = true; cell.stop = false; cell.progress = 'Working…'; cell.pct = null; refreshCell(cell);
    const res = await runSpec(cell.spec, (done, total, label) => { cell.progress = label; cell.pct = total ? done / total : null; const n = document.querySelector('[data-cell="' + cell.id + '"] .wb-run-s'); if (n) { n.querySelector('span').textContent = label; const b = n.querySelector('.wb-pbar i'); if (b && total) b.style.width = Math.round(100 * done / total) + '%'; } return !cell.stop; });
    cell.running = false; cell.res = res; cell.stamp = dataStamp(); cell.edit = !res.ok; save(); refreshCell(cell); refreshData();
  }
  async function runSpec(spec, progress) {
    if (spec.method === 'query') return queryResult(state.league, spec);
    const r = await WB.runAsync(state.league, spec, progress);
    if (r && r.ok) r.n = r.n; return r;
  }

  // ---------- the data drawer ----------
  // A table opens to its data: the columns as headings (hover for what each one means, click to put its name in the cell you are writing),
  // the first rows, tidily rounded, and a button for more.
  const cellText = (v) => {
    if (v == null || v === '') return '–';
    if (typeof v !== 'number') return String(v);
    if (Number.isInteger(v)) return String(v);
    const a = Math.abs(v); return String(Number(a >= 100 ? v.toFixed(0) : a >= 10 ? v.toFixed(1) : v.toFixed(2)));
  };

  // ---------- a table over the whole page ----------
  let expandedEl = null, expandedKey = null;
  function expandedBody(table, n) {
    const desc = T.describe(state.league).find((d) => d.table === table), rows = T.all(state.league)[table] || [], cols = desc.columns;
    return `<table class="wb-dtable xp"><thead><tr>${cols.map((c, i) => `<th class="${i === 0 ? 'stick ' : ''}${c.type === 'cat' ? 'l' : ''}"><span class="wb-colh" title="${esc(c.name + ': ' + c.desc)}">${esc(c.name)}</span></th>`).join('')}</tr></thead><tbody>${rows.slice(0, n).map((r) => `<tr>${cols.map((c, i) => `<td class="${c.type === 'cat' ? 'l' : 'n'}${i === 0 ? ' stick' : ''}">${esc(cellText(r[c.name]))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  function closeExpanded() { if (expandedEl) { expandedEl.remove(); expandedEl = null; document.removeEventListener('keydown', expandedKey, true); document.body.classList.remove('wb-noscroll'); } }
  function openExpanded(table) {
    closeExpanded();
    const rows = T.all(state.league)[table] || []; let n = 100;
    const el2 = document.createElement('div'); el2.className = 'wb wb-xp'; el2.setAttribute('role', 'dialog'); el2.setAttribute('aria-label', 'Table ' + table);
    const draw = () => {
      el2.innerHTML = `<div class="wb-bar"><b class="wb-xp-t">${esc(table)}</b><span class="wb-xp-n">${Math.min(n, rows.length)} of ${rows.length} rows · ${T.describe(state.league).find((d) => d.table === table).columns.length} columns</span><span class="wb-sp"></span>${rows.length > n ? '<button type="button" data-xmore>Show 200 more</button>' : ''}<button type="button" data-xclose>Close ✕</button></div><div class="wb-xp-scroll">${rows.length ? expandedBody(table, n) : '<p class="wb-hint" style="padding:16px">No rows yet: play a match first.</p>'}</div>`;
    };
    draw();
    el2.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('button'); if (!b) return; if (b.hasAttribute('data-xclose')) closeExpanded(); else if (b.hasAttribute('data-xmore')) { const sc = el2.querySelector('.wb-xp-scroll'), top = sc.scrollTop; n += 200; draw(); el2.querySelector('.wb-xp-scroll').scrollTop = top; } });
    expandedKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); closeExpanded(); } };
    document.addEventListener('keydown', expandedKey, true);
    document.body.appendChild(el2); document.body.classList.add('wb-noscroll'); expandedEl = el2;
    const first = el2.querySelector('[data-xclose]'); if (first) first.focus();
  }
  const PREVIEW_COLS = 5;
  function dataHtml() {
    const all = T.all(state.league), desc = T.describe(state.league);
    state.shown = state.shown || {};
    return desc.map((t) => {
      const open = state.openTable === t.table, rows = all[t.table], n = state.shown[t.table] || 15, extra = T.SCHEMA[t.table].extra;
      let body = '';
      if (open) {
        body = rows.length
          ? `<div class="wb-td"><div class="wb-scroll prev"><table class="wb-dtable"><thead><tr>${t.columns.slice(0, PREVIEW_COLS).map((c) => `<th class="${c.type === 'cat' ? 'l' : ''}"><button type="button" class="wb-colh" data-insert="${t.table}.${c.name}" title="${esc(c.name + ': ' + c.desc + ' (click to use it in your cell)')}">${esc(c.name)}</button></th>`).join('')}</tr></thead><tbody>${rows.slice(0, n).map((r) => `<tr>${t.columns.slice(0, PREVIEW_COLS).map((c) => `<td class="${c.type === 'cat' ? 'l' : 'n'}">${esc(cellText(r[c.name]))}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="wb-dfoot"><span>${Math.min(n, rows.length)} of ${rows.length} rows · ${Math.min(PREVIEW_COLS, t.columns.length)} of ${t.columns.length} columns${t.columns.length > PREVIEW_COLS ? ' (Expand shows all)' : ''}</span><span class="wb-dbtns">${rows.length > n ? `<button type="button" data-more="${t.table}">Show ${Math.min(25, rows.length - n)} more</button>` : ''}<button type="button" data-expand="${t.table}" title="Open this table over the whole page">Expand ⤢</button></span></div></div>`
          : '<div class="wb-td"><p class="wb-hint">No rows yet: play a match first.</p></div>';
      }
      return `<div class="wb-t${open ? ' open' : ''}"><button type="button" class="wb-th" data-table="${t.table}" title="${esc(t.desc)}"><span>${t.table}${extra ? ' <i>new</i>' : ''}</span><span class="wb-rows">${t.rows}</span></button>${body}</div>`;
    }).join('');
  }
  function controlsHtml() {
    const C = CTL(), lg = state.league; if (!C) return '';
    const st = C.state(lg).split('\n').map((l) => `<p>${esc(l)}</p>`).join('');
    const groups = {}; Object.keys(C.ACTIONS).forEach((id) => { const a = C.ACTIONS[id]; (groups[a.group] = groups[a.group] || []).push(a); });
    return `<div class="wb-state"><div class="wb-tbl-t">How things stand</div>${st}</div>` + Object.keys(groups).map((g) => `<div class="wb-t open"><div class="wb-th static"><span>${esc(g)}</span></div><div class="wb-td">${groups[g].map((a) => `<button type="button" class="wb-col" data-newctl="${a.id}"><b>${esc(a.title)}</b><span>${esc(a.desc)}</span></button>`).join('')}</div></div>`).join('');
  }
  function refreshData() {
    const h = el('wbData'); if (!h) return; const sc = h.scrollTop, tab = state.wb.ui.dtab || 'data';
    h.querySelector('.wb-dlist').innerHTML = tab === 'controls' ? controlsHtml() : dataHtml();
    h.querySelectorAll('[data-dtab]').forEach((b) => b.classList.toggle('on', b.dataset.dtab === tab)); h.scrollTop = sc;
  }

  // ---------- the agent ----------
  function lessonList() { try { return Object.keys(FM.teach.lessons).map((k) => k + ' = ' + FM.teach.lessons[k].title.replace(/[:?]/g, '')).join('; '); } catch (e) { return ''; } }
  function docSummary() { return state.wb.cells.slice(-12).map((c, i) => (i + 1) + '. ' + (c.type === 'control' ? 'change: ' + c.action + ' (' + c.status + ')' : c.type === 'analysis' ? (c.res && c.res.ok ? c.res.title : 'analysis (not run)') : c.type + ': ' + String(c.text || '').slice(0, 60).replace(/\n/g, ' '))).join('\n'); }
  function chatPush(m) { m.at = Date.now() + Math.random(); const wb = state.wb; wb.chat.push(m); if (wb.chat.length > 70) wb.chat = wb.chat.slice(-60); save(); return m; }
  function chatDraw() {
    const log = el('wbLog'); if (!log) return; const wb = state.wb;
    const items = wb.chat.filter((m) => m.role !== 'results');
    log.innerHTML = (items.length ? items : [{ role: 'agent', text: 'Ask me anything about your club’s data, or anything you want to learn. I choose the method and explain it; the Workbench does the calculating, so the numbers always come from your recorded matches.', intro: true }]).map((m) => `<div class="wb-msg ${m.role}">${m.role === 'agent' ? FM.teach.fmt(esc(m.text).replace(/\n/g, '<br>')) : esc(m.text).replace(/\n/g, '<br>')}${(m.added || []).length ? `<div class="wb-added">${m.added.map((a) => `<button type="button" data-goto="${a.id}">› ${esc(a.title)}</button>`).join('')}</div>` : ''}</div>`).join('') + (state.busy ? `<div class="wb-msg agent think">${esc(state.busy)}</div>` : '');
    log.scrollTop = log.scrollHeight;
    const send = el('wbSend'); if (send) send.disabled = !!state.busy;
  }
  function chatMessages() { return state.wb.chat.slice(-14).map((m) => ({ role: m.role === 'manager' ? 'manager' : m.role === 'results' ? 'results' : 'agent', text: m.text })); }
  // Some questions are answered by the Workbench itself, in the browser, with no AI and so no Locks: where the club will finish, where the bank balance is heading, who is injured.
  const INTENTS = [
    { re: /\b(where|what position|which place)\b.*\b(finish|end up|come|place)\b|\bchance\b.*\b(title|top (three|3)|relegat)|\bfinish(ing)?\b.*\b(league|season|position|table)\b/i, no: /\b(if|what if|would|should|stop|cut|change)\b/i, spec: { method: 'forecast', kind: 'season' }, say: 'Here is the forecast for where the club will finish. It was worked out in your browser, so it used no Locks. Press Explain on it if you want it talked through.' },
    { re: /\b(bank|cash|money|balance)\b.*\b(end of the season|forecast|project|heading|going to be|will be|by the end)\b|\bforecast\b.*\b(bank|cash|money)\b/i, no: /\b(if|what if|would|should|stop|cut|raise|increase|change|set)\b/i, spec: { method: 'forecast', kind: 'cash' }, say: 'Here is where the bank balance is heading as things are, worked out in your browser (no Locks used). To see what a change would do to it, tell me the change.' },
    { re: /^\s*(show|list|who|which)\b.*\binjur/i, no: /\b(treat|worth|should|pay)\b/i, spec: { method: 'query', table: 'injuries', limit: 30 }, say: 'These are your injured players, from the recorded data (no Locks used). Ask me whether treatment is worth paying for and I will look at the costs with you.' },
  ];
  function localIntent(text) { return INTENTS.find((x) => x.re.test(text) && !(x.no && x.no.test(text))) || null; }
  async function runLocal(li) {
    const form = formFromSpec(li.spec); if (!form.table && li.spec.method !== 'query') form.table = 'team_matches';
    const cell = addCell({ type: 'analysis', form, by: 'agent', edit: false, spec: li.spec }, { scroll: false });
    cell.res = await runSpec(li.spec); cell.stamp = dataStamp(); cell.edit = !cell.res.ok; refreshCell(cell); save(); refreshData();
    chatPush({ role: 'agent', text: li.say, added: [{ id: cell.id, title: cell.res.ok ? cell.res.title : 'Could not run' }] }); state.busy = ''; chatDraw();
  }
  const summaryText = (n) => (FM.agentContext ? FM.agentContext(state.league, 'workbench') : '').slice(0, n);
  const detailText = () => DETAIL[state.wb.settings.detail] || DETAIL.standard;
  // The second, short step: the results go back and the agent explains them. It carries no tables, methods or changes list, so it is cheap.
  async function explainStep() {
    const out = await FM.api('/football/workbench', { phase: 'explain', messages: chatMessages().slice(-5), level: state.league.tier, detail: detailText(), lessons: lessonList(), summary: summaryText(1000) });
    chatPush({ role: 'agent', text: out.reply || 'That is the result. Ask me about any part of it.' });
  }
  async function explainCell(cell) {
    if (state.busy || !cell.res || !cell.res.ok) return;
    if (FM.locksOut && FM.locksOut()) { chatPush({ role: 'agent', text: 'You have used all your Locks for now, so I cannot explain it. Everything else in the Workbench still works.' }); chatDraw(); return; }
    chatPush({ role: 'manager', text: 'Explain this result: ' + cell.res.title }); chatPush({ role: 'results', text: resultText(cell.res, 2200) });
    state.busy = 'Writing it up…'; chatDraw();
    try { await explainStep(); } catch (e) { chatPush({ role: 'agent', text: aiError(e) }); }
    state.busy = ''; chatDraw();
  }
  const aiError = (e) => (e && e.code === 'NO_SESSION' ? 'Sign in to LastMind and I can plan analyses for you. The Workbench works without me: use the toolbar to build one yourself.' : e && (e.code === 'LOCK_LIMIT_REACHED' || e.code === '402') ? 'You have used all your Locks for now, so I cannot answer any more questions. Everything else in the Workbench still works.' : (e && e.message) || 'I could not answer just now. Try again in a moment.');
  async function ask(text) {
    text = String(text || '').trim(); if (!text || state.busy) return;
    const wb = state.wb; chatPush({ role: 'manager', text });
    if (!wb.ui.agent) { wb.ui.agent = true; layout(); }
    const li = localIntent(text); if (li) { await runLocal(li); return; }
    if (FM.locksOut && FM.locksOut()) { chatPush({ role: 'agent', text: 'You have used all your Locks for now, so I cannot answer. The Workbench still works by hand: build any analysis from the toolbar, or use the calculator, and your Locks come back when they reset.' }); chatDraw(); return; }
    state.busy = 'Thinking…'; chatDraw();
    try {
      const C = CTL();
      const out = await FM.api('/football/workbench', { phase: 'plan', messages: chatMessages().slice(-10), schema: T.digestCompact(), schemaExtra: T.digestExtra(), methods: WB.METHOD_HELP.join('\n'), controls: C ? C.helpStatic() : '', state: C ? C.state(state.league) : '', summary: summaryText(1800), doc: docSummary(), level: state.league.tier, detail: detailText(), lessons: lessonList() });
      const msg = chatPush({ role: 'agent', text: out.reply || 'Tell me more about what you want to find out.', added: [] });
      const actions = Array.isArray(out.actions) ? out.actions : [];
      if (!actions.length) { state.busy = ''; chatDraw(); return; }
      const texts = [];
      for (const a of actions) {
        if (a.type === 'note') { const c = addCell({ type: 'lesson', text: a.text, by: 'agent' }); msg.added.push({ id: c.id, title: 'Note' }); texts.push('Note added.'); continue; }
        if (a.type === 'control') {
          const act = a.action || (a.spec && a.spec.action);
          if (!C || !C.ACTIONS[act]) { texts.push('There is no action called "' + act + '".'); continue; }
          const cc = addCell(newControlCell(act, a.params || (a.spec && a.spec.params) || {}, 'agent'), { scroll: false }), title = C.ACTIONS[act].title;
          if (wb.settings.auto) { const r = applyControl(cc); texts.push((r.ok ? 'APPLIED: ' : 'COULD NOT APPLY: ') + title + '. ' + r.text); msg.added.push({ id: cc.id, title: (r.ok ? 'Done: ' : 'Not done: ') + title }); }
          else { texts.push('PROPOSED, waiting for the manager to press Apply: ' + title + ' ' + JSON.stringify(a.params || {})); msg.added.push({ id: cc.id, title: 'Proposed: ' + title }); }
          continue;
        }
        const spec = a.spec || {}; const form = formFromSpec(spec); if (!form.table && spec.method !== 'experiment' && spec.method !== 'simulate' && spec.method !== 'forecast') form.table = 'team_matches';
        const cell = addCell({ type: 'analysis', form, by: 'agent', edit: false, running: true, progress: 'Working…' }, { scroll: false });
        state.busy = (spec.method === 'experiment' || spec.method === 'simulate') ? 'Running the simulation… (this takes a minute or two)' : 'Running the analysis…'; chatDraw();
        cell.spec = a.type === 'query' ? Object.assign({ method: 'query' }, spec) : spec;
        cell.res = await runSpec(cell.spec, (d, t, label) => { cell.progress = label; cell.pct = t ? d / t : null; const n = document.querySelector('[data-cell="' + cell.id + '"] .wb-run-s span'); if (n) n.textContent = label; state.busy = label; chatDraw(); return !cell.stop; });
        cell.running = false; cell.stamp = dataStamp(); cell.edit = !cell.res.ok; refreshCell(cell);
        msg.added.push({ id: cell.id, title: cell.res.ok ? cell.res.title : 'Could not run' }); texts.push(resultText(cell.res, 1400));
      }
      save(); refreshData();
      chatPush({ role: 'results', text: texts.join('\n\n').slice(0, 4800) });
      state.busy = 'Writing it up…'; chatDraw();
      await explainStep();
    } catch (e) { chatPush({ role: 'agent', text: aiError(e) }); }
    state.busy = ''; chatDraw();
  }

  // ---------- layout ----------
  function layout() {
    const wb = state.wb, ui = wb.ui, host = state.host;
    const box = host.querySelector('.wb'); box.classList.toggle('no-data', !ui.data); box.classList.toggle('no-agent', !ui.agent);
    host.querySelector('[data-tool="data"]').classList.toggle('on', !!ui.data); host.querySelector('[data-tool="agent"]').classList.toggle('on', !!ui.agent); host.querySelector('[data-tool="kb"]').classList.toggle('on', !!ui.kb);
    el('wbKb').hidden = !ui.kb;
  }
  function kbHtml() {
    const tab = state.wb.ui.kbTab || 'Maths';
    return `<div class="wb-kb-tabs">${Object.keys(KEYS).map((k) => `<button type="button" class="${k === tab ? 'on' : ''}" data-kbtab="${k}">${k}</button>`).join('')}<span class="wb-kb-note">Click into a text or calculator cell, then press keys or type the shortcuts.</span></div><div class="wb-keys">${KEYS[tab].map((row) => `<div class="wb-krow">${row.map((k) => `<button type="button" class="wb-key" data-key="${esc(k)}">${esc(k)}</button>`).join('')}</div>`).join('')}</div><p class="wb-kb-help"><b>Typing shortcuts</b> &nbsp; <kbd>^</kbd> power · <kbd>_</kbd> subscript (then <kbd>Space</kbd> or <kbd>→</kbd> to carry on) · <kbd>Shift</kbd>+letter Greek (<kbd>Shift</kbd>+<kbd>A</kbd> α, <kbd>P</kbd> π; Caps Lock for capitals) · <kbd>*</kbd> × · <kbd>~</kbd> √ · <kbd>~~</kbd> ≈ · <kbd>&lt;=</kbd> ≤ · <kbd>&gt;=</kbd> ≥ · <kbd>!=</kbd> ≠ · <kbd>Shift</kbd>+<kbd>E</kbd> ∈ · <kbd>Shift</kbd>+<kbd>I</kbd> ∫ · <kbd>Ctrl</kbd>+<kbd>-</kbd> bar</p>`;
  }
  function insertText(txt) {
    let t = state.focus; if (!t || !document.body.contains(t)) { t = document.querySelector('#wbDoc .wb-in'); if (!t) return; }
    t.focus();
    if (txt === '⌫') { const s = t.selectionStart, e = t.selectionEnd; if (s === e && s > 0) t.setRangeText('', s - 1, e, 'end'); else t.setRangeText('', s, e, 'end'); }
    else t.setRangeText(txt, t.selectionStart, t.selectionEnd, 'end');
    t.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function copyDoc() {
    const wb = state.wb; const txt = wb.title + '\n\n' + wb.cells.map((c) => (c.type === 'analysis' ? resultText(c.res) : (c.type === 'calc' ? c.text + '\n' + [].map.call(document.querySelectorAll('[data-cell="' + c.id + '"] .wb-calc-out > div'), (d) => d.textContent).join('\n') : c.text))).join('\n\n');
    try { navigator.clipboard.writeText(txt); flash('Document copied as text'); } catch (e) { flash('Could not copy'); }
  }
  function flash(msg) { const n = el('wbFlash'); if (!n) return; n.textContent = msg; n.classList.add('on'); clearTimeout(flash.t); flash.t = setTimeout(() => n.classList.remove('on'), 1800); }

  FM.renderWorkbench = function (host, league, opts) {
    state.league = league; state.opts = opts || {}; state.host = host; state.wb = getWb(league); state.busy = '';
    // tables made by earlier experiments come back with the document
    state.wb.extra.forEach((x) => { try { T.register(x.name, x.desc, x.cols, x.rows); } catch (e) { /* fine */ } });
    const wb = state.wb, tier = league.tier || 'gcse';
    host.innerHTML = `<div class="wb">
      <div class="wb-bar" role="toolbar" aria-label="Workbench tools">
        <input id="wbTitle" class="wb-title" value="${esc(wb.title)}" aria-label="Document title" maxlength="80">
        <span class="wb-sp"></span>
        <span class="wb-menu"><button type="button" data-tool="add">+ Add</button><div class="wb-pop" id="wbAdd" hidden>
          <button type="button" data-add="control">Change something</button><button type="button" data-add="forecast">Forecast</button><button type="button" data-add="analysis">Analysis or table</button><button type="button" data-add="calc">Calculator</button><button type="button" data-add="text">Text</button></div></span>
        <button type="button" data-tool="kb">Maths keyboard</button>
        <button type="button" data-tool="data">Data</button>
        <button type="button" data-tool="agent">AI Agent</button>
        <select id="wbAuto" aria-label="Whether the agent applies changes"><option value="">Agent proposes, I apply</option><option value="1">Agent applies changes itself</option></select>
        <select id="wbDetail" aria-label="Level of detail in explanations"><option value="brief">Brief</option><option value="standard">Standard</option><option value="detailed">Detailed</option></select>
        <select id="wbLevel" aria-label="Level you are studying at" title="The level the agent and the lessons explain things at"><option value="gcse">GCSE</option><option value="alevel">A-level</option><option value="above">Beyond A-level</option></select>
        <button type="button" data-tool="copy">Copy</button>
      </div>
      <div class="wb-body">
        <aside class="wb-data" id="wbData" aria-label="Data and controls"><div class="wb-pane-h"><span class="wb-dtabs"><button type="button" data-dtab="data">Data</button><button type="button" data-dtab="controls">Controls</button></span><span>${esc(FM.teamById(league, league.userId).name)} · season ${league.season}</span><button type="button" class="wb-x" data-tool="data" aria-label="Close the data panel">✕</button></div><div class="wb-dlist"></div></aside>
        <section class="wb-main"><div class="wb-doc" id="wbDoc"></div><div class="wb-kb" id="wbKb" hidden></div></section>
        <aside class="wb-agent" id="wbAgent" aria-label="LastMind AI Agent"><div class="wb-pane-h"><b>LastMind AI Agent</b><span class="wb-agent-btns"><button type="button" class="wb-clear" data-tool="clearchat">Clear chat</button><button type="button" class="wb-x" data-tool="agent" aria-label="Close the agent">✕</button></span></div><div class="wb-log" id="wbLog" role="log" aria-live="polite"></div>
          <form class="wb-form" id="wbForm"><textarea id="wbAsk" rows="2" placeholder="Ask a question, or say what you want to learn…" aria-label="Message to the agent"></textarea><button class="wb-send" id="wbSend" type="submit">Send</button></form></aside>
      </div><div class="wb-flash" id="wbFlash" role="status"></div></div>`;
    el('wbDetail').value = wb.settings.detail || 'standard'; el('wbLevel').value = tier; el('wbAuto').value = wb.settings.auto ? '1' : '';
    refreshData(); renderDoc(); chatDraw(); el('wbKb').innerHTML = kbHtml(); layout();

    if (host._wbAbort) host._wbAbort.abort();
    const ac = new AbortController(), SIG = { signal: ac.signal }; host._wbAbort = ac;
    host.addEventListener('keydown', wbShortcut, SIG);
    host.addEventListener('focusin', (e) => { if (e.target.classList && e.target.classList.contains('wb-in')) state.focus = e.target; }, SIG);
    host.addEventListener('input', (e) => {
      const t = e.target, cell = t.closest && t.closest('[data-cell]') && findCell(t.closest('[data-cell]').dataset.cell);
      if (t.id === 'wbTitle') { wb.title = t.value; save(); return; }
      if (!cell) return;
      if (t.dataset.cp && cell.type === 'control') { cell.params[t.dataset.cp] = t.value; const pv = document.getElementById('prev-' + cell.id); if (pv) pv.innerHTML = previewHtml(cell); save(); return; }
      if (t.dataset.k === 'text') { cell.text = t.value; if (cell.type === 'calc') { const o = t.closest('.wb-calc').querySelector('[data-out]'); o.innerHTML = calcOut(cell); } save(); }
      else if (t.dataset.w != null) { const i = Number(t.dataset.w); cell.form.where = cell.form.where || []; cell.form.where[i] = cell.form.where[i] || {}; cell.form.where[i][t.dataset.wk] = t.value; }
      else if (t.dataset.f && t.tagName === 'INPUT') cell.form[t.dataset.f] = t.value;
    }, SIG);
    host.addEventListener('change', (e) => {
      const t = e.target;
      if (t.id === 'wbDetail') { wb.settings.detail = t.value; save(); return; }
      if (t.id === 'wbLevel') { if (FM.setLevel) FM.setLevel(state.league, t.value); else { state.league.tier = t.value; save(); } refreshData(); renderDoc(); return; }
      if (t.id === 'wbAuto') { wb.settings.auto = t.value === '1'; save(); return; }
      const cell = t.closest && t.closest('[data-cell]') && findCell(t.closest('[data-cell]').dataset.cell);
      if (cell && cell.type === 'control' && t.dataset.cp) { cell.params[t.dataset.cp] = t.value; const pv = document.getElementById('prev-' + cell.id); if (pv) pv.innerHTML = previewHtml(cell); save(); return; }
      if (!cell || !cell.form) return;
      if (t.dataset.w != null) { const i = Number(t.dataset.w); cell.form.where = cell.form.where || []; cell.form.where[i] = cell.form.where[i] || {}; cell.form.where[i][t.dataset.wk] = t.value; return; }
      if (!t.dataset.f) return;
      cell.form[t.dataset.f] = t.value;
      if (t.dataset.f === 'method') { const keep = { table: cell.form.table, where: cell.form.where }; cell.form = Object.assign(newForm(t.value), keep); if (t.value === 'experiment' || t.value === 'simulate') cell.form.where = []; refreshCell(cell); }
      else if (t.dataset.f === 'table') { cell.form.y = cell.form.x = cell.form.group = cell.form.by = cell.form.col = cell.form.order = undefined; cell.form.x = []; cell.form.where = []; refreshCell(cell); }
      save();
    }, SIG);
    host.addEventListener('submit', (e) => { if (e.target.id === 'wbForm') { e.preventDefault(); const ta = el('wbAsk'), v = ta.value; ta.value = ''; ask(v); } }, SIG);
    el('wbAsk').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el('wbForm').requestSubmit(); } });
    host.addEventListener('mousedown', (e) => { if (e.target.closest && e.target.closest('.wb-key')) e.preventDefault(); }, SIG);
    host.addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('button'); if (!b) return;
      const tool = b.dataset.tool;
      if (tool === 'add') { el('wbAdd').hidden = !el('wbAdd').hidden; return; }
      if (b.dataset.add) { el('wbAdd').hidden = true; if (b.dataset.add === 'analysis') addCell({ type: 'analysis', form: newForm('describe'), edit: true }); else if (b.dataset.add === 'forecast') addCell({ type: 'analysis', form: newForm('forecast'), edit: true }); else if (b.dataset.add === 'control') { wb.ui.data = true; wb.ui.dtab = 'controls'; layout(); refreshData(); flash('Choose what to change from the Controls list'); } else addCell({ type: b.dataset.add, text: '' }); return; }
      if (tool === 'kb' || tool === 'data' || tool === 'agent') { wb.ui[tool] = !wb.ui[tool]; layout(); save(); return; }
      if (tool === 'copy') { copyDoc(); return; }
      if (tool === 'clearchat') { if (confirm('Clear the whole conversation with the agent? Your document stays.')) { wb.chat = []; save(); chatDraw(); } return; }
      if (b.dataset.kbtab) { wb.ui.kbTab = b.dataset.kbtab; el('wbKb').innerHTML = kbHtml(); save(); return; }
      if (b.dataset.key != null) { insertText(b.dataset.key); return; }
      if (b.dataset.ask) { ask(b.dataset.ask); return; }
      if (b.dataset.goto) { const n = document.querySelector('[data-cell="' + b.dataset.goto + '"]'); if (n) n.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
      if (b.dataset.dtab) { wb.ui.dtab = b.dataset.dtab; refreshData(); save(); return; }
      if (b.dataset.newctl) { addCell(newControlCell(b.dataset.newctl, {}, 'manual')); return; }
      if (b.dataset.table) { state.openTable = state.openTable === b.dataset.table ? '' : b.dataset.table; refreshData(); return; }
      if (b.dataset.insert) { insertText(b.dataset.insert); return; }
      if (b.dataset.expand) { openExpanded(b.dataset.expand); return; }
      if (b.dataset.more) { state.shown = state.shown || {}; state.shown[b.dataset.more] = (state.shown[b.dataset.more] || 15) + 25; refreshData(); return; }
      const cellEl = b.closest('[data-cell]'), cell = cellEl && findCell(cellEl.dataset.cell);
      if (b.dataset.multi && cell) { const k = b.dataset.multi, arr = cell.form[k] = cell.form[k] || [], i = arr.indexOf(b.dataset.col); if (i >= 0) arr.splice(i, 1); else arr.push(b.dataset.col); b.classList.toggle('on'); save(); return; }
      if (!cell) return;
      if (b.dataset.cact) { if (b.dataset.cact === 'apply') applyControl(cell); else if (b.dataset.cact === 'forecast') forecastControl(cell); else if (b.dataset.cact === 'dismiss') { cell.status = 'dismissed'; save(); refreshCell(cell); } return; }
      const act = b.dataset.act, wbc = state.wb.cells, idx = wbc.indexOf(cell);
      if (act === 'run') runCell(cell);
      else if (act === 'stop') { cell.stop = true; }
      else if (act === 'explain') { explainCell(cell); }
      else if (act === 'edit') { cell.edit = !cell.edit; refreshCell(cell); }
      else if (act === 'copy') { try { navigator.clipboard.writeText(resultText(cell.res)); flash('Copied as text'); } catch (er) { flash('Could not copy'); } }
      else if (act === 'del') { if (!cell.running) { wbc.splice(idx, 1); save(); renderDoc(); } }
      else if (act === 'up' && idx > 0) { wbc.splice(idx - 1, 0, wbc.splice(idx, 1)[0]); save(); renderDoc(); }
      else if (act === 'down' && idx < wbc.length - 1) { wbc.splice(idx + 1, 0, wbc.splice(idx, 1)[0]); save(); renderDoc(); }
    }, SIG);
    // cells that were running when the page was left cannot be running now
    wb.cells.forEach((c) => { if (c.running) { c.running = false; } });
    if (opts && opts.control && CTL() && CTL().ACTIONS[opts.control]) setTimeout(() => { addCell(newControlCell(opts.control, opts.params || {}, 'manual')); }, 40);
    if (opts && opts.starter) setTimeout(() => ask(opts.starter), 60);
  };

  // anywhere in the game that used to open the side agent now opens the Workbench
  FM.agentOpen = function (starter) { if (FM.goWorkbench) FM.goWorkbench(starter); };
  FM.workbenchRunCalc = (league, line) => makeCalc(league, {}).evaluate(line);
})();
