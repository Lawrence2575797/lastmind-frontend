/*
 * Guided lessons. A lesson is a list of steps. Each step can point at a part of the page (that part is lit and the rest of the page dimmed, and
 * Elena's card moves next to it), say a few lines, ask a question that has to be answered before moving on, show a small interactive chart built
 * from the manager's own matches, and offer a button that puts what was learnt into the tactics (see elena_guides.js for the lessons themselves).
 *
 * Step fields
 *   target   CSS selector, element, list of elements, or function(ctx) returning one of those
 *   title    short heading
 *   lines    array of lines (each is a line of its own) or function(ctx) returning one
 *   ask      { q: lines, kind: 'choice'|'number'|'open', options:[{t, fb}], correct, answer(ctx), tol, unit, reveal: lines }
 *   widget   function(box, ctx, api): draws into the card; api.ready(true) opens the Next button, api.redraw() redraws the card
 *   why      lines for the "why this matters" box
 *   apply    [{ label, run(ctx, api) }]   buttons that change the tactics
 *   enter    function(ctx, api) run when the step opens; it may return a function that runs when the step closes
 */
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  FM.guides = FM.guides || {};
  const FACE = '/assets/football/elena-point.jpg';
  const G = { lesson: null, i: 0, card: null, spot: null, raf: 0, ctx: null, st: {}, leave: null, els: [], reopen: false, shared: {}, stack: [] };

  function css() {
    if (document.getElementById('guideStyle')) return;
    const st = document.createElement('style'); st.id = 'guideStyle';
    st.textContent = [
      '.gd-spot { position: fixed; z-index: 400; pointer-events: none; border-radius: 12px; border: 3px solid #F2C14E; box-shadow: 0 0 0 100vmax rgba(4,9,13,.66), 0 0 24px 2px rgba(242,193,78,.55); transition: left .5s ease, top .5s ease, width .5s ease, height .5s ease, opacity .25s; }',
      '.gd-spot.none { opacity: 0; }',
      '.gd-kw { display: inline; margin: 0; padding: 0 4px; min-height: 0 !important; border: 0; border-bottom: 2px solid #F2C14E; background: rgba(242,193,78,.14); color: #FFE9A8; font: inherit; font-weight: 700; border-radius: 4px 4px 0 0; cursor: pointer; } .gd-kw:hover { background: rgba(242,193,78,.3); }',
      '.gd-note { display: grid; gap: 9px; }',
      '.gd-hl { outline: 3px solid #F2C14E !important; outline-offset: 1px; border-radius: 4px; position: relative; z-index: 2; animation: gdPulse 1.4s ease-in-out infinite; }',
      '@keyframes gdPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(242,193,78,.6); } 50% { box-shadow: 0 0 0 6px rgba(242,193,78,0); } } @media (prefers-reduced-motion: reduce) { .gd-hl { animation: none; } .gd-spot, .gd-card { transition: none; } }',
      '.gd-card { position: fixed; z-index: 410; width: min(440px, calc(100vw - 24px)); max-height: calc(100vh - 24px); overflow: auto; background: #1A232D; color: #F1EAD6; border: 1px solid #F2C14E; border-radius: 16px; box-shadow: 0 18px 50px rgba(0,0,0,.55); font: 14px/1.55 Arial, sans-serif; transition: left .5s ease, top .5s ease; }',
      '.gd-head { display: flex; align-items: center; gap: 10px; padding: 12px 14px 10px; border-bottom: 1px solid rgba(241,234,214,.16); position: sticky; top: 0; background: #1A232D; z-index: 3; }',
      '.gd-head img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; object-position: 50% 18%; border: 2px solid #F2C14E; flex: none; }',
      '.gd-head b { display: block; font-size: .92rem; } .gd-head small { opacity: .7; }',
      '.gd-x { margin-left: auto; flex: none; width: 30px; height: 30px; min-height: 0 !important; padding: 0 !important; display: grid; place-items: center; border-radius: 50%; border: 1px solid rgba(241,234,214,.35); background: transparent; color: inherit; cursor: pointer; } .gd-x svg { width: 12px; height: 12px; display: block; }',
      '.gd-body { padding: 12px 16px 6px; display: grid; gap: 9px; }',
      '.gd-body h3 { margin: 0; font-size: 1.04rem; } .gd-l { margin: 0; } .gd-q { margin: 0; padding: 10px 12px; border-radius: 10px; background: rgba(242,193,78,.1); border-left: 4px solid #F2C14E; display: grid; gap: 6px; }',
      '.gd-opt { display: block; width: 100%; text-align: left; padding: 9px 11px; margin: 0; border-radius: 10px; border: 1px solid rgba(241,234,214,.28); background: rgba(255,255,255,.05); color: inherit; font: inherit; cursor: pointer; min-height: 0 !important; } .gd-opt:hover { background: rgba(255,255,255,.1); } .gd-opt.bad { border-color: #e5645a; background: rgba(229,100,90,.14); } .gd-opt.good { border-color: #52bd7b; background: rgba(82,189,123,.16); }',
      '.gd-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; } .gd-in { flex: 1 1 120px; min-width: 0; padding: 9px 11px; border-radius: 10px; border: 1px solid rgba(241,234,214,.35); background: rgba(255,255,255,.07); color: inherit; font: inherit; }',
      '.gd-fb { margin: 0; padding: 8px 11px; border-radius: 10px; background: rgba(229,100,90,.14); border-left: 4px solid #e5645a; } .gd-ok { margin: 0; padding: 10px 12px; border-radius: 10px; background: rgba(82,189,123,.13); border-left: 4px solid #52bd7b; display: grid; gap: 6px; }',
      '.gd-why { padding: 10px 12px; border-radius: 10px; background: rgba(120,160,255,.1); border-left: 4px solid #7aa2ff; display: grid; gap: 4px; } .gd-why b { font-size: .74rem; letter-spacing: .08em; text-transform: uppercase; color: #a9c1ff; }',
      '.gd-f { margin: 0; padding: 9px 12px; border-radius: 10px; background: rgba(0,0,0,.28); font: 600 .95rem/1.7 Consolas, "Courier New", monospace; overflow-x: auto; }',
      '.gd-widget { display: grid; gap: 8px; } .gd-widget svg { width: 100%; height: auto; display: block; background: rgba(0,0,0,.2); border-radius: 10px; } .gd-widget table { width: 100%; border-collapse: collapse; font-size: .85rem; } .gd-widget td, .gd-widget th { padding: 4px 6px; border-bottom: 1px solid rgba(241,234,214,.14); text-align: right; } .gd-widget th:first-child, .gd-widget td:first-child { text-align: left; }',
      '.gd-widget input[type=range] { width: 100%; accent-color: #F2C14E; } .gd-cap { font-size: .8rem; opacity: .8; margin: 0; }',
      '.gd-nav { display: flex; gap: 8px; padding: 10px 16px 14px; align-items: center; position: sticky; bottom: 0; background: #1A232D; border-top: 1px solid rgba(241,234,214,.12); z-index: 3; } .gd-nav .sp { flex: 1; }',
      '.gd-btn { padding: 9px 14px; border-radius: 10px; border: 1px solid rgba(241,234,214,.35); background: transparent; color: inherit; font: 700 .86rem Arial, sans-serif; cursor: pointer; min-height: 0 !important; } .gd-btn.go { background: #E6D7B0; color: #1A232D; border-color: #E6D7B0; } .gd-btn:disabled { opacity: .45; cursor: not-allowed; } .gd-link { background: none; border: 0; color: #FFE9A8; text-decoration: underline; cursor: pointer; font: inherit; padding: 0; min-height: 0 !important; }',
      '.gd-dots { display: flex; gap: 4px; } .gd-dots i { width: 7px; height: 7px; border-radius: 50%; background: rgba(241,234,214,.25); } .gd-dots i.on { background: #F2C14E; } .gd-dots i.done { background: #52bd7b; }',
      '.gd-offer { display: grid; gap: 6px; padding: 12px 13px; margin: 0 0 12px; border-radius: 12px; background: rgba(242,193,78,.12); border: 1px solid rgba(242,193,78,.5); } .gd-offer b { font-size: .95rem; } .gd-offer span { font-size: .84rem; opacity: .9; } .gd-offer button { justify-self: start; padding: 9px 14px; border-radius: 10px; border: 0; background: #E6D7B0; color: #1A232D; font: 800 .86rem Arial, sans-serif; cursor: pointer; min-height: 0 !important; }',
      'body.gd-on .el-panel, body.gd-on .el-tab { display: none !important; }',
      '@media (max-width: 700px) { .gd-card { left: 8px !important; right: 8px; width: auto; top: auto !important; bottom: 8px; max-height: 62vh; } }',
    ].join('\n');
    document.head.appendChild(st);
  }

  // ---------- where things are on the page ----------
  const visible = (e) => e && e.isConnected && (e.offsetWidth || e.offsetHeight || e.getClientRects().length);
  function targetsOf(step) {
    let t = step.target;
    try { if (typeof t === 'function') t = t(G.ctx); } catch (e) { t = null; }
    if (!t) return [];
    if (typeof t === 'string') return Array.from(document.querySelectorAll(t)).filter(visible);
    if (t instanceof Element) return visible(t) ? [t] : [];
    return Array.from(t).filter(visible);
  }
  function union(els) {
    let l = 1e9, t = 1e9, r = -1e9, b = -1e9;
    els.forEach((e) => { const x = e.getBoundingClientRect(); l = Math.min(l, x.left); t = Math.min(t, x.top); r = Math.max(r, x.right); b = Math.max(b, x.bottom); });
    return { left: l, top: t, right: r, bottom: b, width: r - l, height: b - t };
  }
  function place() {
    G.raf = requestAnimationFrame(place);
    if (!G.card) return;
    const vw = window.innerWidth, vh = window.innerHeight, M = 12;
    const cw = G.card.offsetWidth, ch = G.card.offsetHeight;
    let x = vw - cw - M, y = vh - ch - M, r = null;
    const els = G.els.filter(visible);
    if (els.length) {
      r = union(els);
      // keep to the part of the viewport that can be seen
      const cl = { left: Math.max(M / 2, r.left - 6), top: Math.max(M / 2, r.top - 6), right: Math.min(vw - M / 2, r.right + 6), bottom: Math.min(vh - M / 2, r.bottom + 6) };
      if (cl.right - cl.left > 20 && cl.bottom - cl.top > 20) {
        G.spot.classList.remove('none');
        G.spot.style.left = cl.left + 'px'; G.spot.style.top = cl.top + 'px'; G.spot.style.width = (cl.right - cl.left) + 'px'; G.spot.style.height = (cl.bottom - cl.top) + 'px';
        const gap = 16, fitsR = cl.right + gap + cw <= vw - M, fitsL = cl.left - gap - cw >= M, fitsB = cl.bottom + gap + ch <= vh - M, fitsT = cl.top - gap - ch >= M;
        if (fitsR) { x = cl.right + gap; y = Math.min(Math.max(M, cl.top), vh - ch - M); }
        else if (fitsL) { x = cl.left - gap - cw; y = Math.min(Math.max(M, cl.top), vh - ch - M); }
        else if (fitsB) { y = cl.bottom + gap; x = Math.min(Math.max(M, cl.left), vw - cw - M); }
        else if (fitsT) { y = cl.top - gap - ch; x = Math.min(Math.max(M, cl.left), vw - cw - M); }
        else { x = vw - cw - M; y = vh - ch - M; }      // the target fills the screen: sit in the corner over it
      } else G.spot.classList.add('none');
    } else G.spot.classList.add('none');
    G.card.style.left = Math.round(x) + 'px'; G.card.style.top = Math.round(y) + 'px';
  }

  // ---------- the card ----------
  const lines = (a) => (a || []).map((s) => '<p class="gd-l">' + s + '</p>').join('');
  const val = (f, ...a) => (typeof f === 'function' ? f(G.ctx, ...a) : f);
  const stOf = (i) => G.st[G.lesson.id + ':' + i] || (G.st[G.lesson.id + ':' + i] = { tries: 0, done: false, picked: -1, text: '', showAnswer: false, ready: false });

  function render() {
    if (!G.lesson) return;
    const L = G.lesson, step = L.steps[G.i], s = stOf(G.i), last = G.i === L.steps.length - 1;
    const ask = step.ask, api = G.api;
    let h = '<div class="gd-head"><img alt="" src="' + FACE + '"><div><b>Elena Marsh</b><small>' + esc(L.title) + ' · step ' + (G.i + 1) + ' of ' + L.steps.length + '</small></div>' +
      '<button type="button" class="gd-x" data-gd="stop" aria-label="Leave the lesson"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2 L12 12 M12 2 L2 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg></button></div>';
    h += '<div class="gd-body">';
    if (G.stack.length) h += '<button type="button" class="gd-link" data-gd="return">&larr; Back to the tour</button>';
    if (step.title) h += '<h3>' + esc(step.title) + '</h3>';
    h += lines(val(step.lines));
    if (step.formula) h += '<div class="gd-f">' + val(step.formula) + '</div>';
    if (ask && (s.open || s.done || L.askOpen)) {
      h += '<div class="gd-q">' + lines(val(ask.q));
      if (ask.kind === 'choice') {
        h += (ask.options || []).map((o, k) => '<button type="button" class="gd-opt' + (s.done && k === ask.correct ? ' good' : s.picked === k && !s.done ? ' bad' : '') + '" data-gd="pick" data-k="' + k + '"' + (s.done ? ' disabled' : '') + '>' + o.t + '</button>').join('');
      } else if (ask.kind === 'number') {
        h += '<div class="gd-row"><input class="gd-in" id="gdNum" type="number" step="any" inputmode="decimal" value="' + esc(s.text) + '" placeholder="Your answer"' + (s.done ? ' disabled' : '') + '>' + (ask.unit ? '<span>' + esc(ask.unit) + '</span>' : '') + (s.done ? '' : '<button type="button" class="gd-btn go" data-gd="check">Check</button>') + '</div>';
      } else if (ask.kind === 'open') {
        h += '<textarea class="gd-in" id="gdOpen" rows="2" placeholder="' + esc(ask.placeholder || 'Write it here') + '"' + (s.done ? ' disabled' : '') + '>' + esc(s.text) + '</textarea>' + (s.done ? '' : '<div class="gd-row"><button type="button" class="gd-btn go" data-gd="open">Done</button></div>');
      }
      h += '</div>';
      if (s.msg && !s.done) h += '<p class="gd-fb">' + s.msg + '</p>';
      if (s.done) h += '<div class="gd-ok">' + lines(val(ask.reveal)) + '</div>';
      if (!s.done && s.tries >= 2 && ask.kind !== 'open') h += '<div><button type="button" class="gd-link" data-gd="show">Show me the answer</button></div>';
    } else if (ask) {
      // the explanation stands on its own; the question is there for anyone who wants to test themselves
      h += '<div class="gd-note">' + lines(val(ask.reveal)) + '</div><div class="gd-row"><button type="button" class="gd-btn" data-gd="openq">Test yourself on this</button></div>';
    }
    if (step.widget) h += '<div class="gd-widget" id="gdWidget"></div>';
    if (step.why) h += '<div class="gd-why"><b>Why this matters</b>' + lines(val(step.why)) + '</div>';
    if (step.apply) h += '<div class="gd-row">' + step.apply.map((a, k) => '<button type="button" class="gd-btn go" data-gd="apply" data-k="' + k + '">' + esc(a.label) + '</button>').join('') + '</div>' + (s.applied ? '<p class="gd-ok">' + s.applied + '</p>' : '');
    h += '</div>';
    const needAnswer = false, needWidget = false;
    h += '<div class="gd-nav"><button type="button" class="gd-btn" data-gd="back"' + (G.i === 0 ? ' disabled' : '') + '>Back</button><div class="gd-dots">' +
      L.steps.map((_, k) => '<i class="' + (k === G.i ? 'on' : stOf(k).done || k < G.i ? 'done' : '') + '"></i>').join('') + '</div><span class="sp"></span>' +
      (last ? '<button type="button" class="gd-btn go" data-gd="finish"' + (needAnswer || needWidget ? ' disabled' : '') + '>' + (G.stack.length ? 'Back to the tour' : 'Finish') + '</button>' : '<button type="button" class="gd-btn go" data-gd="next"' + (needAnswer || needWidget ? ' disabled' : '') + '>Next</button>') + '</div>';
    G.card.innerHTML = h;
    if (step.widget) {
      const box = G.card.querySelector('#gdWidget');
      try { step.widget(box, G.ctx, api, s); } catch (e) { box.textContent = 'This chart could not be drawn.'; }
    }
  }

  function enterStep() {
    if (G.leave) { try { G.leave(); } catch (e) { /* nothing to clean */ } G.leave = null; }
    document.querySelectorAll('.gd-hl').forEach((e) => e.classList.remove('gd-hl'));
    const step = G.lesson.steps[G.i];
    try { const out = step.enter && step.enter(G.ctx, G.api); if (typeof out === 'function') G.leave = out; } catch (e) { /* the step still shows */ }
    const mark = () => {
      G.els = targetsOf(step);
      (step.mark ? step.mark(G.ctx) || [] : []).forEach((e) => e.classList.add('gd-hl'));
      const first = G.els[0];
      if (first) { const r = first.getBoundingClientRect(), vh = window.innerHeight; if (r.height > vh * 0.6) { if (r.top < 40 || r.top > vh * 0.3) window.scrollBy({ top: r.top - 70, behavior: 'smooth' }); } else if (r.top < 60 || r.bottom > vh - 60) first.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    };
    mark();
    setTimeout(mark, 120);     // a step that redraws the page has finished by now
    render();
  }

  function pickChoice(k) {
    const ask = G.lesson.steps[G.i].ask, s = stOf(G.i), o = ask.options[k];
    s.picked = k; s.tries++;
    if (k === ask.correct) { s.done = true; s.msg = ''; } else s.msg = val(o.fb) || 'Not quite. Have another look.';
    render();
  }
  function checkNumber() {
    const step = G.lesson.steps[G.i], ask = step.ask, s = stOf(G.i), inp = G.card.querySelector('#gdNum');
    const v = parseFloat(inp && inp.value); s.text = inp ? inp.value : '';
    if (!isFinite(v)) { s.msg = 'Type a number first.'; return render(); }
    const ans = val(ask.answer), tol = ask.tol != null ? ask.tol : Math.max(0.01 * Math.abs(ans), 0.005);
    s.tries++;
    if (Math.abs(v - ans) <= tol) { s.done = true; s.msg = ''; }
    else { const hint = typeof ask.hint === 'function' ? ask.hint(G.ctx, v, ans) : ask.hint; s.msg = hint || 'That is not it. Check the numbers on the page and try again.'; }
    render();
  }

  function onClick(e) {
    const kwb = e.target.closest('[data-kw]');
    if (kwb && G.card && G.card.contains(kwb)) return FM.guide.detail(kwb.dataset.kw);
    const b = e.target.closest('[data-gd]'); if (!b || !G.card || !G.card.contains(b)) return;
    const a = b.dataset.gd, L = G.lesson, step = L.steps[G.i], s = stOf(G.i);
    if (a === 'stop') return FM.guide.stop();
    if (a === 'next') { if (G.i < L.steps.length - 1) { G.i++; enterStep(); } return; }
    if (a === 'back') { if (G.i > 0) { G.i--; enterStep(); } return; }
    if (a === 'return' || (a === 'finish' && G.stack.length)) { const pr = G.stack.pop(); G.lesson = pr.lesson; G.i = pr.i; return enterStep(); }
    if (a === 'openq') { s.open = true; return render(); }
    if (a === 'finish') return FM.guide.stop(true);
    if (a === 'pick') return pickChoice(+b.dataset.k);
    if (a === 'check') return checkNumber();
    if (a === 'open') { const t = G.card.querySelector('#gdOpen'); s.text = t ? t.value.trim() : ''; if (s.text.length < 2) { s.msg = 'Write a few words first.'; return render(); } s.done = true; s.msg = ''; return render(); }
    if (a === 'show') { s.done = true; s.msg = ''; return render(); }
    if (a === 'apply') { const ap = step.apply[+b.dataset.k]; try { const msg = ap.run(G.ctx, G.api, s); if (msg) s.applied = msg; } catch (err) { s.applied = 'That could not be done on this page.'; } render(); }
  }
  function onKey(e) {
    if (!G.card) return;
    if (e.key === 'Enter' && e.target && e.target.id === 'gdNum') { e.preventDefault(); checkNumber(); }
    if (e.key === 'Escape') FM.guide.stop();
  }

  FM.guide = {
    get active() { return !!G.lesson; },
    start(id, opts) {
      const L = FM.guides[id]; if (!L) return false;
      css(); FM.guide.stop(true, true);
      G.i = (opts && opts.step) || 0; G.shared = {}; G.st = {}; G.stack = [];
      G.ctx = (FM.guideContext ? FM.guideContext() : {});
      if (L.prepare) { try { L.prepare(G.ctx); } catch (e) { /* the steps cope with missing data */ } }
      let steps = L.steps;
      if (L.build) { try { steps = L.build(G.ctx); } catch (e) { steps = null; } }
      if (!steps || !steps.length) return false;
      G.lesson = Object.assign({}, L, { steps });
      document.body.classList.add('gd-on');
      G.spot = document.createElement('div'); G.spot.className = 'gd-spot none';
      G.card = document.createElement('aside'); G.card.className = 'gd-card'; G.card.setAttribute('role', 'dialog'); G.card.setAttribute('aria-label', 'Elena Marsh: ' + L.title);
      document.body.appendChild(G.spot); document.body.appendChild(G.card);
      G.api = { redraw: render, ready(v) { const s = stOf(G.i); if (s.ready !== !!v) { s.ready = !!v; const n = G.card && G.card.querySelector('[data-gd="next"],[data-gd="finish"]'); if (n && G.lesson.steps[G.i].gate) n.disabled = !v; } }, shared: G.shared, stepState: () => stOf(G.i) };
      G.card.addEventListener('click', onClick); document.addEventListener('keydown', onKey);
      place(); enterStep();
      return true;
    },
    detail(id) {
      const L = FM.guides[id]; if (!L || !G.lesson) return false;
      let steps; try { steps = L.build ? L.build(G.ctx) : L.steps; } catch (e) { steps = null; }
      if (!steps || !steps.length) return false;
      G.stack.push({ lesson: G.lesson, i: G.i });
      G.lesson = Object.assign({}, L, { steps }); G.i = 0;
      enterStep();
      return true;
    },
    stop(finished, silent) {
      if (!G.lesson) return;
      if (G.leave) { try { G.leave(); } catch (e) { /* nothing to clean */ } G.leave = null; }
      cancelAnimationFrame(G.raf);
      document.querySelectorAll('.gd-hl').forEach((e) => e.classList.remove('gd-hl'));
      document.removeEventListener('keydown', onKey);
      if (G.card) G.card.remove(); if (G.spot) G.spot.remove();
      G.lesson = null; G.card = G.spot = null; G.els = []; G.stack = [];
      document.body.classList.remove('gd-on');
    },
  };

  // the offer that sits at the top of a page's notes
  try { css(); } catch (e) { /* styles are added again when a lesson starts */ }
  FM.guideOffer = function (id, text) {
    const L = FM.guides[id]; if (!L) return '';
    return '<div class="gd-offer"><b>' + esc(L.title) + '</b><span>' + (text || esc(L.blurb || '')) + '</span><button type="button" data-guide="' + esc(id) + '">Start the lesson</button></div>';
  };
})();
