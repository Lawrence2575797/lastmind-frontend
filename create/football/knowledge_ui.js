// The Learn page in the Workbook: the knowledge map for what the student is studying, what to take next, and the lessons. Lessons are written in advance
// (knowledge_lessons_*.js) and filled in with the student's own club; the question at the end is marked by LastMind AI, and the answer can be put into the game.
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rich = (t) => (FM.richHtml ? FM.richHtml(String(t)) : esc(String(t).replace(/\$/g, '')));
  const COLW = 196, ROWH = 58, NODEW = 176, NODEH = 48, BANDPAD = 26;
  let S = null;   // { host, lg, opts, mapId, sel, shown, ans, result, d }

  const know = (lg) => (lg.knowledge = lg.knowledge || { done: {} });
  const doneOf = (lg, id) => !!know(lg).done[id];
  const hasLesson = (id) => !!(FM.knowledgeLessons && FM.knowledgeLessons[id]);
  // a point is ready when everything it needs that has a lesson is done (points whose lesson is still being written do not hold anyone up)
  const ready = (lg, nd) => nd.pre.every((p) => doneOf(lg, p) || !hasLesson(p) || !FM.knowledgeNode(p));
  const stateOf = (lg, nd) => (doneOf(lg, nd.id) ? 'done' : !hasLesson(nd.id) ? 'soon' : ready(lg, nd) ? 'ready' : 'locked');

  // ---------- what to take next ----------
  function suggestions(lg, maps) {
    const all = []; maps.forEach((mp) => mp.strands.forEach((s) => s.nodes.forEach((nd) => all.push(nd))));
    const cand = all.filter((nd) => stateOf(lg, nd) === 'ready');
    const d = S.d, pr = d.played, sc = (nd) => {
      let s = -FM.knowledgeDepth(nd.id) * 0.4;
      const bias = { 'g-pct': d.stands.length ? 1.2 : 0, 'g-pctchange': 1.1, 'g-averages': pr ? 1 : 0.2, 'g-probbasic': pr ? 0.9 : 0.1, 'g-lineareq': 0.8, 'p-optimise': 1, 'p-diffpowers': 0.9 };
      return s + (bias[nd.id] || 0);
    };
    cand.sort((a, b) => sc(b) - sc(a));
    const out = [], seen = {}; cand.forEach((nd) => { if (out.length < 4 && !seen[nd.strand]) { seen[nd.strand] = 1; out.push(nd); } });
    cand.forEach((nd) => { if (out.length < 4 && out.indexOf(nd) < 0) out.push(nd); });
    return out;
  }
  function reason(nd) {
    const f = FM.knowledgeLessons[nd.id]; if (!f) return '';
    try { return f(S.d).why || ''; } catch (e) { return ''; }
  }

  // ---------- the map ----------
  function layout(mp) {
    const pos = {}; let y = 0; const bands = [];
    mp.strands.forEach((s) => {
      const cols = {}; s.nodes.forEach((nd) => { const dp = FM.knowledgeDepth(nd.id); (cols[dp] = cols[dp] || []).push(nd); });
      const rows = Math.max.apply(null, Object.keys(cols).map((k) => cols[k].length));
      Object.keys(cols).forEach((k) => cols[k].forEach((nd, i) => { pos[nd.id] = { x: 16 + (+k) * COLW, y: y + 34 + i * ROWH }; }));
      bands.push({ strand: s.strand, y, h: rows * ROWH + 40 }); y += rows * ROWH + 40 + BANDPAD;
    });
    const maxDepth = Math.max.apply(null, Object.keys(pos).map((k) => pos[k].x)); return { pos, bands, w: maxDepth + NODEW + 30, h: y };
  }
  function mapHtml(mp) {
    const lay = layout(mp), lg = S.lg; let edges = '', nodes = '', bandsH = '';
    lay.bands.forEach((b) => { bandsH += '<div class="kn-band" style="top:' + b.y + 'px;height:' + b.h + 'px"><span>' + esc(b.strand) + '</span></div>'; });
    mp.strands.forEach((s) => s.nodes.forEach((nd) => {
      const p = lay.pos[nd.id]; const st = stateOf(lg, nd);
      nd.pre.forEach((pid) => { const q = lay.pos[pid]; if (!q) return; const x1 = q.x + NODEW, y1 = q.y + NODEH / 2, x2 = p.x, y2 = p.y + NODEH / 2, mx = (x1 + x2) / 2; edges += '<path d="M' + x1 + ' ' + y1 + ' C' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + x2 + ' ' + y2 + '" class="' + (doneOf(lg, pid) ? 'on' : '') + '"/>'; });
      nodes += '<button type="button" class="kn-node ' + st + (S.sel === nd.id ? ' sel' : '') + '" data-node="' + nd.id + '" style="left:' + p.x + 'px;top:' + p.y + 'px;width:' + NODEW + 'px;height:' + NODEH + 'px" title="' + esc(nd.t + ' (' + nd.spec + ')' + (st === 'soon' ? ': lesson being written' : '')) + '"><span>' + esc(nd.t) + '</span><i>' + esc(nd.spec) + '</i></button>';
    }));
    return '<div class="kn-canvas" style="width:' + lay.w + 'px;height:' + lay.h + 'px">' + bandsH + '<svg width="' + lay.w + '" height="' + lay.h + '" aria-hidden="true">' + edges + '</svg>' + nodes + '</div>';
  }

  // ---------- applying an answer to the game ----------
  function applyAction(ap) {
    const lg = S.lg;
    try {
      if (ap.kind === 'control') { const r = FM.controls.run(lg, ap.action, ap.params, 'lesson'); if (S.opts.save) S.opts.save(); return { ok: r.ok, text: r.text || (r.ok ? 'Done.' : 'That could not be done.') }; }
      if (ap.kind === 'plan') {
        const team = FM.teamById(lg, lg.userId), set = (FM.PLAN_TEAM || {})[ap.phase], t = set && set.find((x) => x.key === ap.key), op = t && t.opts.find((x) => x.v === ap.value);
        if (!op) return { ok: false, text: 'That tactic option is not available.' };
        FM.planSetTeam(team, ap.phase, ap.key, ap.value); FM.planApply(team); if (S.opts.save) S.opts.save(); return { ok: true, text: 'Tactics changed: ' + FM.planPhase(ap.phase).name + ', ' + t.label.toLowerCase() + ' is now ' + op.label.toLowerCase() + '.' };
      }
    } catch (e) { return { ok: false, text: 'That could not be done: ' + (e && e.message ? e.message : e) }; }
    return { ok: false, text: 'Nothing to do.' };
  }

  // ---------- the lesson ----------
  function lessonHtml(nd) {
    const f = FM.knowledgeLessons[nd.id];
    const pre = nd.pre.map((pid) => FM.knowledgeNode(pid)).filter(Boolean);
    const head = '<div class="kn-lh"><div class="kn-kicker">' + esc(nd.strand) + ' · ' + esc(nd.spec) + '</div><h3>' + esc(nd.t) + '</h3>' + (pre.length ? '<div class="kn-pre"><span>Comes after:</span> ' + pre.map((p) => '<button type="button" class="kn-chip ' + (doneOf(S.lg, p.id) ? 'done' : '') + '" data-node="' + p.id + '">' + (doneOf(S.lg, p.id) ? '&#10003; ' : '') + esc(p.t) + '</button>').join(' ') + '</div>' : '') + '</div>';
    if (!f) return head + '<p class="kn-soon">The lesson for this point is still being written. It will use your club in the same way as the others. Meanwhile you can see where it sits on the map and what it builds on.</p>';
    let les; try { les = f(S.d); } catch (e) { return head + '<p class="kn-soon">This lesson could not be built from your club just now (' + esc(e.message) + ').</p>'; }
    S.les = les; const shown = Math.max(1, Math.min(les.steps.length, S.shown || 1)), steps = les.steps;
    let h = head;
    const ana = les.analogy || (FM.knowledgeIntros && FM.knowledgeIntros[nd.id] ? FM.knowledgeIntros[nd.id](S.d) : '');
    if (ana) h += '<section class="kn-ana"><div class="kn-kicker">The football analogy</div>' + [].concat(ana).map((l) => '<div class="kn-p">' + rich(l) + '</div>').join('') + '</section>';
    if (les.why) h += '<div class="kn-why">' + rich(les.why) + '</div>';
    h += '<ol class="kn-steps">' + steps.slice(0, shown).map((st) => '<li>' + st.say.map((l) => '<div class="kn-p">' + rich(l) + '</div>').join('') + [].concat(st.maths || []).map((mm) => '<div class="kn-maths">' + rich(mm) + '</div>').join('') + (st.diagram && FM.knowledgeDiagram ? FM.knowledgeDiagram(st.diagram) : '') + '</li>').join('') + '</ol>';
    if (shown < steps.length) return h + '<div class="kn-more"><button type="button" class="primary" data-act="next">Next step (' + (shown + 1) + ' of ' + steps.length + ')</button><button type="button" data-act="all">Show all</button></div>';
    const a = les.ask, r = S.result;
    h += '<section class="kn-ask"><div class="kn-kicker">Your turn</div><div class="kn-q">' + rich(a.q) + '</div>' +
      '<div class="kn-answer"><textarea id="knAns" rows="2" placeholder="' + (a.kind === 'number' ? 'Your answer' + (a.unit ? ' (' + a.unit + ')' : '') + ', and a line of working if you like' : 'Your answer') + '"' + (r && r.busy ? ' disabled' : '') + '>' + esc(S.ans || '') + '</textarea><button type="button" class="primary" data-act="mark"' + (r && r.busy ? ' disabled' : '') + '>' + (r && r.busy ? 'Marking...' : 'Mark my answer') + '</button></div>' +
      '<p class="kn-note">Marking is done by LastMind AI and uses a few Locks.</p>';
    if (r && !r.busy) {
      h += '<div class="kn-result ' + (r.verdict || 'err') + '"><b>' + (r.verdict === 'correct' ? 'Correct' : r.verdict === 'partly' ? 'Nearly' : r.verdict === 'incorrect' ? 'Not quite' : 'Could not mark') + '</b><div class="kn-p">' + rich(r.feedback || '') + '</div></div>';
    }
    h += '<div class="kn-ans-btns"><button type="button" data-act="worked">' + (S.worked ? 'Hide the worked answer' : 'Show the worked answer') + '</button>' + (a.apply ? '<button type="button" class="gold" data-act="apply">' + esc(a.apply.say) + '</button>' : '') + '</div>';
    if (S.worked) h += '<div class="kn-worked">' + a.worked.map((l) => '<div class="kn-p">' + rich(l) + '</div>').join('') + '</div>';
    if (S.applied) h += '<div class="kn-result ' + (S.applied.ok ? 'correct' : 'err') + '"><p>' + esc(S.applied.text) + '</p></div>';
    h += '</section>';
    if (les.next) h += '<div class="kn-next">' + rich(les.next) + '</div>';
    h += '<div class="kn-done"><button type="button" data-act="done">' + (doneOf(S.lg, nd.id) ? 'Marked as learnt' : 'I have learnt this') + '</button></div>';
    return h;
  }

  // ---------- drawing the page ----------
  function draw() {
    const lg = S.lg, maps = FM.knowledgeMaps(lg.tier), mp = maps.find((x) => x.id === S.mapId) || maps[0]; S.mapId = mp.id;
    S.d = FM.knowledgeData(lg);
    const sug = suggestions(lg, maps), nd = S.sel ? FM.knowledgeNode(S.sel) : null;
    const total = mp.strands.reduce((a, s) => a + s.nodes.length, 0), done = mp.strands.reduce((a, s) => a + s.nodes.filter((n) => doneOf(lg, n.id)).length, 0), written = mp.strands.reduce((a, s) => a + s.nodes.filter((n) => hasLesson(n.id)).length, 0);
    S.host.innerHTML = '<div class="kn"><aside class="kn-side">' +
      '<div class="kn-top"><div><div class="kn-kicker">' + esc(mp.board) + '</div><h3>' + esc(mp.title) + '</h3></div><div class="kn-stat"><b>' + done + '</b> of ' + total + ' learnt<br><span>' + written + ' lessons written</span></div></div>' +
      (maps.length > 1 ? '<div class="kn-tabs">' + maps.map((x) => '<button type="button" class="' + (x.id === mp.id ? 'on' : '') + '" data-map="' + x.id + '">' + esc(x.title) + '</button>').join('') + '</div>' : '') +
      '<div class="kn-sug"><div class="kn-kicker">Suggested next</div>' + (sug.length ? sug.map((x) => '<button type="button" class="kn-card" data-node="' + x.id + '"><b>' + esc(x.t) + '</b><span>' + esc(reason(x)) + '</span></button>').join('') : '<p class="kn-soon">Nothing ready yet: more lessons are on the way.</p>') + '</div>' +
      '<div class="kn-legend"><span class="ready">ready</span><span class="done">learnt</span><span class="locked">needs earlier points</span><span class="soon">lesson coming</span></div>' +
      '<div class="kn-map">' + mapHtml(mp) + '</div></aside>' +
      '<section class="kn-main">' + (nd ? lessonHtml(nd) : '<div class="kn-empty"><h3>Pick a point on the map</h3><p>Every point of the specification is on the map, joined to the points it needs first. Lessons use ' + esc(S.d.club) + ' for every example, so the numbers are yours, and each ends with a question whose answer you can put straight into the game.</p></div>') + '</section></div>';
    wire();
  }
  function wire() {
    const h = S.host;
    h.querySelectorAll('[data-node]').forEach((b) => b.addEventListener('click', () => { S.sel = b.dataset.node; S.shown = 1; S.ans = ''; S.result = null; S.worked = false; S.applied = null; draw(); const m = h.querySelector('.kn-main'); if (m) m.scrollTop = 0; }));
    h.querySelectorAll('[data-map]').forEach((b) => b.addEventListener('click', () => { S.mapId = b.dataset.map; draw(); }));
    h.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => act(b.dataset.act)));
    const ta = h.querySelector('#knAns'); if (ta) ta.addEventListener('input', () => { S.ans = ta.value; });
    const sc = h.querySelector('.kn-map'); if (sc && S.scroll) { sc.scrollLeft = S.scroll.x; sc.scrollTop = S.scroll.y; } if (sc) sc.addEventListener('scroll', () => { S.scroll = { x: sc.scrollLeft, y: sc.scrollTop }; });
  }
  async function mark() {
    const nd = FM.knowledgeNode(S.sel), a = S.les.ask, ans = (S.ans || '').trim(); if (!ans) { S.result = { verdict: 'err', feedback: 'Type your answer first.' }; draw(); return; }
    S.result = { busy: true }; draw();
    try {
      const out = await FM.api('/football/lesson-mark', { id: nd.id, title: nd.t, spec: nd.spec, level: S.lg.tier, question: String(a.q).replace(/\$/g, ''), expected: String(a.kind === 'number' ? (Math.round(a.answer * 1000) / 1000) + (a.unit ? ' ' + a.unit : '') : a.answer), rubric: a.rubric || '', answer: ans });
      S.result = { verdict: out.verdict, feedback: out.feedback };
      if (out.verdict === 'correct') { know(S.lg).done[nd.id] = { at: Date.now(), mark: 1 }; if (S.opts.save) S.opts.save(); }
    } catch (e) { S.result = { verdict: 'err', feedback: e && e.code === 'LOCK_LIMIT_REACHED' ? 'You have used your Locks for now, so I cannot mark this. You can still see the worked answer.' : (e && e.message) || 'I could not mark that just now.' }; }
    draw();
  }
  function act(a) {
    const nd = FM.knowledgeNode(S.sel);
    if (a === 'next') { S.shown = (S.shown || 1) + 1; draw(); }
    else if (a === 'all') { S.shown = 99; draw(); }
    else if (a === 'mark') mark();
    else if (a === 'worked') { S.worked = !S.worked; draw(); }
    else if (a === 'apply') { S.applied = applyAction(S.les.ask.apply); draw(); }
    else if (a === 'done' && nd) { const k = know(S.lg).done; if (k[nd.id]) delete k[nd.id]; else k[nd.id] = { at: Date.now() }; if (S.opts.save) S.opts.save(); draw(); }
  }

  FM.knowledgeUI = {
    mount(host, lg, opts) { S = Object.assign(S && S.lg === lg ? S : { sel: null, shown: 1 }, { host, lg, opts: opts || {} }); draw(); },
    open(id) { if (!S) return; S.sel = id; S.shown = 1; S.result = null; draw(); },
  };
})();
