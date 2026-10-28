// A small renderer for the maths in lessons: the part between $...$ written in the usual TeX way (\frac{a}{b}, \sqrt{x}, x^{2}, \begin{pmatrix}...\end{pmatrix}, Greek
// letters and the common symbols), turned into HTML. FM.texHtml(source) returns the HTML for one piece of maths. Anything it does not know is shown as typed, never dropped.
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const SYM = { times: '×', div: '÷', pm: '±', mp: '∓', cdot: '·', le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠', approx: '≈', equiv: '≡', to: '→', rightarrow: '→', leftarrow: '←', Rightarrow: '⇒', Leftarrow: '⇐', leftrightarrow: '↔', infty: '∞', circ: '°', degree: '°', therefore: '∴', because: '∵', in: '∈', notin: '∉', cup: '∪', cap: '∩', subset: '⊂', emptyset: '∅', ldots: '…', dots: '…', cdots: '⋯', propto: '∝', angle: '∠', perp: '⊥', parallel: '∥', triangle: '△', partial: '∂', nabla: '∇', forall: '∀', exists: '∃', neg: '¬', land: '∧', lor: '∨', sum: 'Σ', prod: 'Π', int: '∫', oint: '∮', lbrace: '{', rbrace: '}', vert: '|', lvert: '|', rvert: '|', mid: '|', langle: '⟨', rangle: '⟩', prime: '′', '|': '‖' };
  const GREEK = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω', Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω' };
  const FUNCS = ['sin', 'cos', 'tan', 'sec', 'csc', 'cosec', 'cot', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'ln', 'log', 'exp', 'lim', 'max', 'min', 'det', 'gcd', 'mod', 'Var', 'dim'];
  const SPACE = { ',': ' ', ';': ' ', ':': ' ', '!': '', ' ': ' ', quad: ' ', qquad: '  ' };

  function parse(src) {
    let i = 0;
    const peek = () => src[i], more = () => i < src.length;
    // one "atom": a braced group, a command, or a single character
    function group() {   // after "{"
      const out = seq('}'); if (peek() === '}') i++; return out;
    }
    function arg() {
      while (peek() === ' ') i++;
      if (peek() === '{') { i++; return group(); }
      if (peek() === '\\') { return command(); }
      if (more()) { const c = src[i++]; return esc(c); }
      return '';
    }
    function name() { let j = i; while (j < src.length && /[A-Za-z]/.test(src[j])) j++; const n = src.slice(i, j); i = j; return n; }
    function command() {   // at "\"
      i++;
      if (!more()) return '\\';
      if (!/[A-Za-z]/.test(src[i])) { const c = src[i++]; if (c === '\\') return '<br>'; if (SPACE[c] !== undefined) return SPACE[c]; if ('{}%&$#_'.indexOf(c) >= 0) return esc(c); if (c === '|') return '‖'; return esc(c); }
      const n = name();
      if (n === 'frac' || n === 'dfrac' || n === 'tfrac') { const a = arg(), b = arg(); return '<span class="tx-frac"><span class="tx-n">' + a + '</span><span class="tx-d">' + b + '</span></span>'; }
      if (n === 'binom') { const a = arg(), b = arg(); return '<span class="tx-par">(</span><span class="tx-frac tx-bin"><span class="tx-n">' + a + '</span><span class="tx-d">' + b + '</span></span><span class="tx-par">)</span>'; }
      if (n === 'sqrt') { let k = ''; if (peek() === '[') { const e = src.indexOf(']', i); if (e > 0) { k = src.slice(i + 1, e); i = e + 1; } } const a = arg(); return (k ? '<sup class="tx-k">' + esc(k) + '</sup>' : '') + '<span class="tx-root"><span class="tx-sq">√</span><span class="tx-rad">' + a + '</span></span>'; }
      if (n === 'text' || n === 'mathrm' || n === 'textbf' || n === 'mathbf' || n === 'operatorname' || n === 'mbox') { while (peek() === ' ') i++; if (peek() === '{') { i++; let d = 1, j = i; while (j < src.length && d) { if (src[j] === '{') d++; else if (src[j] === '}') d--; j++; } const t = src.slice(i, j - 1); i = j; return '<span class="tx-txt' + (n === 'textbf' || n === 'mathbf' ? ' tx-b' : '') + '">' + esc(t) + '</span>'; } return ''; }
      if (n === 'overline' || n === 'bar') { const a = arg(); return '<span class="tx-over">' + a + '</span>'; }
      if (n === 'hat') { const a = arg(); return '<span class="tx-hat">' + a + '</span>'; }
      if (n === 'overrightarrow' || n === 'vec') { const a = arg(); return '<span class="tx-vec">' + a + '</span>'; }
      if (n === 'left' || n === 'right' || n === 'big' || n === 'Big' || n === 'bigg') { if (more() && src[i] === '.') { i++; return ''; } if (more() && src[i] === '\\') { return command(); } if (more()) { const c = src[i++]; return esc(c); } return ''; }
      if (n === 'begin') { const env = arg().replace(/<[^>]*>/g, ''); const e = src.indexOf('\\end{' + env + '}', i); const body = src.slice(i, e < 0 ? src.length : e); i = e < 0 ? src.length : e + ('\\end{' + env + '}').length; return matrix(env, body); }
      if (n === 'end') { arg(); return ''; }
      if (GREEK[n]) return GREEK[n];
      if (SYM[n]) return SYM[n];
      if (FUNCS.indexOf(n) >= 0) return '<span class="tx-fn">' + n + '</span> ';
      if (SPACE[n] !== undefined) return SPACE[n];
      return esc('\\' + n);
    }
    function matrix(env, body) {
      const rows = body.split('\\\\').map((r) => r.trim()).filter((r) => r.length), cells = rows.map((r) => r.split('&').map((c) => parse(c.trim())));
      const l = { pmatrix: '(', bmatrix: '[', vmatrix: '|', matrix: '', Bmatrix: '{', cases: '{' }[env], r = { pmatrix: ')', bmatrix: ']', vmatrix: '|', matrix: '', Bmatrix: '}', cases: '' }[env];
      const t = '<span class="tx-mat">' + cells.map((row) => '<span class="tx-row">' + row.map((c) => '<span class="tx-cell">' + c + '</span>').join('') + '</span>').join('') + '</span>';
      return (l ? '<span class="tx-brk">' + l + '</span>' : '') + t + (r ? '<span class="tx-brk">' + r + '</span>' : '');
    }
    function atom() {
      const c = peek();
      if (c === '{') { i++; return group(); }
      if (c === '\\') return command();
      i++; return esc(c);
    }
    function seq(stop) {
      let out = '';
      while (more() && peek() !== stop) {
        let a = atom();
        // powers and subscripts attach to the atom just read
        for (;;) {
          while (peek() === ' ' && (src[i + 1] === '^' || src[i + 1] === '_')) i++;
          if (peek() === '^') { i++; out += a; a = '<sup>' + arg() + '</sup>'; if (a === '<sup></sup>') a = ''; out += a; a = ''; continue; }
          if (peek() === '_') { i++; out += a; a = '<sub>' + arg() + '</sub>'; out += a; a = ''; continue; }
          break;
        }
        out += a;
      }
      return out;
    }
    return seq(null);
  }
  FM.texHtml = function (src) { try { return '<span class="tx">' + parse(String(src)) + '</span>'; } catch (e) { return esc(src); } };
})();
