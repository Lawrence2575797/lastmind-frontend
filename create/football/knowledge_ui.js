// The Learn panels in the Workbook: the knowledge map for what the student is studying, the schedule (one lesson due between matches), and the lessons. Lessons are written in advance
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

  // ---------- the schedule ----------
  // One lesson falls due between one match and the next, in an order in which a point is never reached before everything it needs. The order is fixed
  // (it does not depend on how the student is getting on): lesson n is due once n matches have been played (the first after the first match), and is overdue once another has been played
  // without it. Nothing is forced; the student can read any lesson, but is told what is due.
  let SCH = null;
  function buildSchedule(lg) {
    const maps = FM.knowledgeMaps(lg.tier), key = lg.tier + '|' + Object.keys(FM.knowledgeLessons || {}).length;
    if (SCH && SCH.key === key) return SCH;
    const items = []; maps.forEach((mp, mi) => mp.strands.forEach((st) => st.nodes.forEach((nd) => { if (hasLesson(nd.id)) items.push({ nd, mi }); })));
    const has = {}; items.forEach((x) => { has[x.nd.id] = x; });
    // the points with a lesson that must come first, looking through any point whose lesson is not written yet
    const need = {}; const climb = (id, out, seen) => { (FM.knowledgeNode(id) ? FM.knowledgeNode(id).pre : []).forEach((q) => { if (seen[q]) return; seen[q] = 1; if (has[q]) out.add(q); else climb(q, out, seen); }); };
    items.forEach((x) => { const out = new Set(); climb(x.nd.id, out, {}); need[x.nd.id] = out; });
    const placed = {}, order = []; let lastMi = -1;
    while (order.length < items.length) {
      let rdy = items.filter((x) => !placed[x.nd.id] && Array.from(need[x.nd.id]).every((q) => placed[q]));
      if (!rdy.length) rdy = items.filter((x) => !placed[x.nd.id]);   // a loop in the data: carry on rather than stop
      rdy.sort((p1, p2) => (FM.knowledgeDepth(p1.nd.id) - FM.knowledgeDepth(p2.nd.id)) || (((p1.mi - lastMi - 1 + maps.length) % maps.length) - ((p2.mi - lastMi - 1 + maps.length) % maps.length)) || (items.indexOf(p1) - items.indexOf(p2)));   // then in the order the specification lists them
      const pick = rdy[0]; placed[pick.nd.id] = 1; order.push(pick.nd.id); lastMi = pick.mi;
    }
    const idx = {}; order.forEach((id, i) => { idx[id] = i; });
    return (SCH = { key, order, idx });
  }
  // matches the club has played in competition, across seasons
  function matchesPlayed(lg) {
    const k = know(lg); const cnt = lg.fixtures.filter((f) => f.played && !f.friendly && (f.homeId === lg.userId || f.awayId === lg.userId)).length;
    if (k.seasonSeen == null) { k.seasonSeen = lg.season; k.carry = 0; k.lastCount = cnt; }
    if (lg.season !== k.seasonSeen) { k.carry = (k.carry || 0) + (k.lastCount || 0); k.seasonSeen = lg.season; }
    k.lastCount = cnt; return (k.carry || 0) + cnt;
  }
  // 'done', 'due' (due before the next match), 'overdue' (a match has been played since it fell due), 'upcoming'
  function schedState(lg, id) {
    if (doneOf(lg, id)) return { st: 'done' };
    const sc = buildSchedule(lg), i = sc.idx[id]; if (i == null) return { st: 'none' };
    const played = matchesPlayed(lg), dueAt = i + 1;   // the first lesson falls due once the first match has been played
    if (played > dueAt) return { st: 'overdue', late: played - dueAt, i }; if (played === dueAt) return { st: 'due', i }; return { st: 'upcoming', i, in: dueAt - played };
  }
  const stText = (x) => (x.st === 'done' ? 'Learnt' : x.st === 'due' ? 'Due before your next match' : x.st === 'overdue' ? 'Overdue by ' + x.late + (x.late === 1 ? ' match' : ' matches') : x.st === 'upcoming' ? 'Due after ' + (x.in === 1 ? 'one more match' : x.in + ' more matches') : '');
  const stShort = (x) => (x.st === 'done' ? 'Learnt' : x.st === 'due' ? 'Due' : x.st === 'overdue' ? 'Overdue' : 'Later');
  FM.knowledgeStatus = function (lg) {
    if (!lg || !FM.knowledgeMaps) return { due: [], overdue: [], next: null };
    const sc = buildSchedule(lg), due = [], overdue = []; let next = null;
    sc.order.forEach((id) => { const x = schedState(lg, id); if (x.st === 'due') due.push(FM.knowledgeNode(id)); else if (x.st === 'overdue') overdue.push(Object.assign({ late: x.late }, FM.knowledgeNode(id))); else if (x.st === 'upcoming' && !next) next = FM.knowledgeNode(id); });
    return { due, overdue, next, played: matchesPlayed(lg) };
  };
  function schedHtml(lg) {
    const sc = buildSchedule(lg), rows = sc.order.map((id) => Object.assign({ id, nd: FM.knowledgeNode(id) }, schedState(lg, id)));
    const grp = (list, title) => (list.length ? '<div class="kn-sg"><div class="kn-kicker">' + title + '</div>' + list.map((r) => '<button type="button" class="kn-row ' + r.st + (S.sel === r.id ? ' sel' : '') + '" data-node="' + r.id + '"><span class="kn-st ' + r.st + '">' + stShort(r) + '</span><b>' + esc(r.nd.t) + '</b><i>' + esc(r.nd.spec) + ' · ' + esc(stText(r)) + '</i></button>').join('') + '</div>' : '');
    const od = rows.filter((r) => r.st === 'overdue'), du = rows.filter((r) => r.st === 'due'), up = rows.filter((r) => r.st === 'upcoming'), dn = rows.filter((r) => r.st === 'done');
    return '<div class="kn-sched">' +
      '<div class="kn-stat2"><b>' + matchesPlayed(lg) + '</b> matches played · <b>' + dn.length + '</b> of ' + rows.length + ' scheduled lessons learnt</div>' +
      grp(od, 'Overdue') + grp(du, 'Due now') + grp(up.slice(0, 8), 'Coming up') + (up.length > 8 ? '<p class="kn-note">and ' + (up.length - 8) + ' more after these.</p>' : '') + grp(dn.slice(-6), 'Learnt') +
      (!rows.length ? '<p class="kn-soon">No lessons are written for this course yet.</p>' : '') + '</div>';
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
      const ss = schedState(lg, nd.id).st; nodes += '<button type="button" class="kn-node ' + st + (ss === 'due' || ss === 'overdue' ? ' ' + ss : '') + (S.sel === nd.id ? ' sel' : '') + '" data-node="' + nd.id + '" style="left:' + p.x + 'px;top:' + p.y + 'px;width:' + NODEW + 'px;height:' + NODEH + 'px" title="' + esc(nd.t + ' (' + nd.spec + ')' + (st === 'soon' ? ': lesson being written' : '')) + '"><span>' + esc(nd.t) + '</span><i>' + esc(nd.spec) + '</i></button>';
    }));
    S.lay = lay; const z = S.zoom || 1;
    return '<div class="kn-zoomer" style="width:' + Math.round(lay.w * z) + 'px;height:' + Math.round(lay.h * z) + 'px"><div class="kn-canvas" style="width:' + lay.w + 'px;height:' + lay.h + 'px;transform:scale(' + z + ');transform-origin:0 0">' + bandsH + '<svg width="' + lay.w + '" height="' + lay.h + '" aria-hidden="true">' + edges + '</svg>' + nodes + '</div></div>';
  }

  // What a ticket-price change is worth on the model the lessons use (about 9% fewer fans for every 10% on the price): revenue from the stand per home match
  function impactOf(ap) {
    if (ap && ap.kind === 'multi') return [ap.note || ''].concat(ap.acts.map(impactOf)).filter(Boolean).join(' ');
    if (ap && ap.kind === 'dial') return ap.note || '';
    if (ap && ap.kind === 'control' && ap.note) return ap.note;
    if (!ap || ap.kind !== 'control' || ap.action !== 'setTicketPrice' || !S || !S.d) return '';
    const st = S.d.stands.find((x) => x.id === ap.params.stand); if (!st) return '';
    const pm = FM.knowledgePriceModel ? FM.knowledgePriceModel(st) : null, k = 0.9 * st.sold / st.price, A = st.sold + k * st.price, R = pm ? pm.revenue : (p) => Math.max(0, p * (A - k * p)), now = R(st.price), then = R(ap.params.price), dd = then - now;
    if (Math.abs(dd) < 50) return 'On the lessons\' model this changes ' + st.name + ' revenue by almost nothing: it is already near its best price.';
    return 'On the lessons\' model ' + st.name + ' brings in about £' + Math.round(now).toLocaleString('en-GB') + ' a home match now and about £' + Math.round(then).toLocaleString('en-GB') + ' at £' + ap.params.price + ' (' + (dd > 0 ? '+' : '-') + '£' + Math.abs(Math.round(dd)).toLocaleString('en-GB') + ' a match).';
  }
  // What came of the change a lesson made, in the words the next lesson opens with. The answer was right, so the change was the right one: where the model says it
  // brought money in, it says how much; where the point was already the best, it says nothing was lost.
  function outcomeOf(ap) {
    if (!ap) return '';
    if (ap.kind === 'multi') return ap.acts.map(outcomeOf).filter(Boolean).join(' ');
    if (ap.kind === 'control' && ap.action === 'setTicketPrice' && S && S.d) {
      const st = S.d.stands.find((x) => x.id === ap.params.stand); if (!st) return '';
      const pm = FM.knowledgePriceModel ? FM.knowledgePriceModel(st) : null, k = 0.9 * st.sold / st.price, A = st.sold + k * st.price, R = pm ? pm.revenue : (p) => Math.max(0, p * (A - k * p)), now = R(st.price), then = R(ap.params.price), dd = then - now;
      if (dd >= 50) return st.name + ' tickets at £' + ap.params.price + ' are doing what the working said they would: the stand now brings in about £' + Math.round(then).toLocaleString('en-GB') + ' a home match, up from about £' + Math.round(now).toLocaleString('en-GB') + ' (+£' + Math.round(dd).toLocaleString('en-GB') + ' a match), and the extra comes straight to the club.';
      return st.name + ' was already priced close to its best, so the change cost nothing and the income held steady at about £' + Math.round(then).toLocaleString('en-GB') + ' a home match.';
    }
    if (ap.note) return ap.note;
    return 'It has been made and is now part of how the club runs.';
  }
  function outcomeHtml(nd) {
    const k = know(S.lg), id = k.lastApplied, rec = id && k.applied && k.applied[id]; if (!rec || id === nd.id) return '';
    if (rec.shownIn && rec.shownIn !== nd.id) return '';
    if (!rec.shownIn) { rec.shownIn = nd.id; if (S.opts.save) S.opts.save(); }
    return '<section class="kn-outcome"><div class="kn-kicker">What your last change did</div><div class="kn-p">In ' + esc(rec.lesson) + ' you worked out the answer and put it in: <b>' + esc(rec.say) + '</b>.</div><div class="kn-p">' + rich(rec.outcome) + '</div></section>';
  }
  // ---------- applying an answer to the game ----------
  function applyAction(ap) {
    const lg = S.lg;
    if (ap && ap.kind === 'multi') { const rs = ap.acts.map(applyAction); return { ok: rs.every((r) => r.ok), text: rs.map((r) => r.text).join(' ') }; }
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
    const f = FM.knowledgeLessons[nd.id]; S.les = null;
    const pre = nd.pre.map((pid) => FM.knowledgeNode(pid)).filter(Boolean);
    const sx = schedState(S.lg, nd.id), chip = sx.st === 'none' ? '' : '<div class="kn-when ' + sx.st + '">' + esc(stText(sx)) + '</div>';
    const head = '<div class="kn-lh"><div class="kn-kicker">' + esc(nd.strand) + ' · ' + esc(nd.spec) + '</div><h3>' + esc(nd.t) + '</h3>' + chip + (pre.length ? '<div class="kn-pre"><span>Comes after:</span> ' + pre.map((p) => '<button type="button" class="kn-chip ' + (doneOf(S.lg, p.id) ? 'done' : '') + '" data-node="' + p.id + '">' + (doneOf(S.lg, p.id) ? '&#10003; ' : '') + esc(p.t) + '</button>').join(' ') + '</div>' : '') + '</div>';
    if (!f) return head + '<p class="kn-soon">The lesson for this point is still being written. It will use your club in the same way as the others. Meanwhile you can see where it sits on the map and what it builds on.</p>';
    let les; try { les = f(S.d); } catch (e) { return head + '<p class="kn-soon">This lesson could not be built from your club just now (' + esc(e.message) + ').</p>'; }
    S.les = les; const shown = Math.max(1, Math.min(les.steps.length, S.shown || 1)), steps = les.steps;
    let h = head + outcomeHtml(nd);
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
    const right = (r && r.verdict === 'correct') || !!(know(S.lg).done[nd.id] && know(S.lg).done[nd.id].mark);   // marked right (the learnt button alone does not unlock it)
    if (r && !r.busy && (r.verdict === 'incorrect' || r.verdict === 'partly')) h += '<p class="kn-note">Look at what the marking says, change your answer and mark it again. Nothing goes into your club until the answer is right.</p>';
    h += '<div class="kn-ans-btns"><button type="button" data-act="worked">' + (S.worked ? 'Hide the worked answer' : 'Show the worked answer') + '</button>' + (a.apply && right ? '<button type="button" class="gold" data-act="apply">Apply the change: ' + esc(a.apply.say) + '</button>' : '') + '</div>' + (a.apply && right && impactOf(a.apply) ? '<p class="kn-imp">' + esc(impactOf(a.apply)) + '</p>' : '');
    if (S.worked) h += '<div class="kn-worked">' + a.worked.map((l) => '<div class="kn-p">' + rich(l) + '</div>').join('') + '</div>';
    if (S.applied) h += '<div class="kn-result ' + (S.applied.ok ? 'correct' : 'err') + '"><p>' + esc(S.applied.text) + '</p></div>';
    h += '</section>';
    if (les.next) h += '<div class="kn-next">' + rich(les.next) + '</div>';
    h += '<div class="kn-done"><button type="button" data-act="done">' + (doneOf(S.lg, nd.id) ? 'Marked as learnt' : 'I have learnt this') + '</button></div>';
    return h;
  }

  // ---------- drawing the panels ----------
  // Three separate panels share one state: the map (with its tabs and legend), the suggestions, and the lesson. Each is only drawn into if its host exists.
  function draw() {
    const lg = S.lg, maps = FM.knowledgeMaps(lg.tier), mp = maps.find((x) => x.id === S.mapId) || maps[0]; S.mapId = mp.id;
    S.d = FM.knowledgeData(lg);
    const H = S.hosts, nd = S.sel ? FM.knowledgeNode(S.sel) : null;
    const total = mp.strands.reduce((a, s) => a + s.nodes.length, 0), done = mp.strands.reduce((a, s) => a + s.nodes.filter((n) => doneOf(lg, n.id)).length, 0), written = mp.strands.reduce((a, s) => a + s.nodes.filter((n) => hasLesson(n.id)).length, 0);
    if (H.map) H.map.innerHTML = '<div class="kn-mapwrap">' +
      '<div class="kn-top"><div><div class="kn-kicker">' + esc(mp.board) + '</div><h3>' + esc(mp.title) + '</h3></div><div class="kn-stat"><b>' + done + '</b> of ' + total + ' learnt<br><span>' + written + ' lessons written</span></div></div>' +
      (maps.length > 1 ? '<div class="kn-tabs">' + maps.map((x) => '<button type="button" class="' + (x.id === mp.id ? 'on' : '') + '" data-map="' + x.id + '">' + esc(x.title) + '</button>').join('') + '</div>' : '') +
      '<div class="kn-legend"><span class="ready">ready</span><span class="done">learnt</span><span class="due">due</span><span class="overdue">overdue</span><span class="locked">needs earlier points</span><span class="soon">lesson coming</span></div>' +
      '<div class="kn-zoom"><button type="button" data-zoom="out" aria-label="Zoom out">&minus;</button><span id="knZoomPct">' + Math.round((S.zoom || 1) * 100) + '%</span><button type="button" data-zoom="in" aria-label="Zoom in">+</button><button type="button" data-zoom="fit">Fit to panel</button><em>Drag the map to move it. Ctrl and scroll to zoom.</em></div>' +
      '<div class="kn-map">' + mapHtml(mp) + '</div></div>';
    if (H.sug) H.sug.innerHTML = schedHtml(lg);
    if (H.lesson) {
      const keep = H.lesson.scrollTop;
      H.lesson.innerHTML = '<div class="kn-main">' + (nd ? lessonHtml(nd) : '<div class="kn-empty"><h3>Pick a point on the map</h3><p>Every point of the specification is on the map, joined to the points it needs first. Lessons use ' + esc(S.d.club) + ' for every example, so the numbers are yours, and each ends with a question whose answer you can put straight into the game.</p><p>Open the map or the schedule from the bar above to choose one. You can keep the notes and the AI agent open beside the lesson and ask the agent about any step.</p></div>') + '</div>';
      H.lesson.scrollTop = S.resetScroll ? 0 : keep; S.resetScroll = false;
    }
    wire();
  }
  function wire() {
    const H = S.hosts, hs = [H.map, H.sug, H.lesson].filter(Boolean);
    hs.forEach((h) => {
      h.querySelectorAll('[data-node]').forEach((b) => b.addEventListener('click', () => { S.sel = b.dataset.node; S.shown = 1; S.ans = ''; S.result = null; S.worked = false; S.applied = null; S.resetScroll = true; if (S.opts.onOpen) S.opts.onOpen(S.sel); draw(); }));
      h.querySelectorAll('[data-map]').forEach((b) => b.addEventListener('click', () => { S.mapId = b.dataset.map; draw(); }));
      h.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => act(b.dataset.act)));
      const ta = h.querySelector('#knAns'); if (ta) ta.addEventListener('input', () => { S.ans = ta.value; });
    });
    wireMap();
    const sc = H.map && H.map.querySelector('.kn-map'); if (sc && S.scroll) { sc.scrollLeft = S.scroll.x; sc.scrollTop = S.scroll.y; } if (sc) sc.addEventListener('scroll', () => { S.scroll = { x: sc.scrollLeft, y: sc.scrollTop }; });
  }
  // The map zooms and pans without drawing the panels again (a redraw would lose the place in the lesson beside it).
  function setZoom(nz, ax, ay) {
    const sc = S.hosts.map && S.hosts.map.querySelector('.kn-map'), zm = sc && sc.querySelector('.kn-zoomer'), cv = sc && sc.querySelector('.kn-canvas'); if (!sc || !zm || !cv || !S.lay) return;
    const old = S.zoom || 1; nz = Math.max(0.3, Math.min(1.8, nz)); if (Math.abs(nz - old) < 0.001) return;
    const px = ax == null ? sc.clientWidth / 2 : ax, py = ay == null ? sc.clientHeight / 2 : ay, mx = (sc.scrollLeft + px) / old, my = (sc.scrollTop + py) / old;
    S.zoom = nz; zm.style.width = Math.round(S.lay.w * nz) + 'px'; zm.style.height = Math.round(S.lay.h * nz) + 'px'; cv.style.transform = 'scale(' + nz + ')';
    sc.scrollLeft = mx * nz - px; sc.scrollTop = my * nz - py; S.scroll = { x: sc.scrollLeft, y: sc.scrollTop };
    const pct = S.hosts.map.querySelector('#knZoomPct'); if (pct) pct.textContent = Math.round(nz * 100) + '%';
  }
  function wireMap() {
    const host = S.hosts.map, sc = host && host.querySelector('.kn-map'); if (!sc) return;
    host.querySelectorAll('[data-zoom]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.zoom, z = S.zoom || 1;
      if (k === 'in') setZoom(z * 1.25); else if (k === 'out') setZoom(z / 1.25);
      else if (S.lay) { setZoom(Math.min(1, (sc.clientWidth - 4) / S.lay.w, (sc.clientHeight - 4) / S.lay.h)); sc.scrollLeft = 0; sc.scrollTop = 0; S.scroll = { x: 0, y: 0 }; }
    }));
    sc.addEventListener('wheel', (e) => { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); const r = sc.getBoundingClientRect(); setZoom((S.zoom || 1) * (e.deltaY < 0 ? 1.12 : 1 / 1.12), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    // dragging empty map moves it (a press on a point is a click on that point, as before)
    let pan = null;
    sc.addEventListener('pointerdown', (e) => { if (e.button !== 0 || (e.target.closest && e.target.closest('.kn-node'))) return; pan = { x: e.clientX, y: e.clientY, sl: sc.scrollLeft, st: sc.scrollTop }; sc.classList.add('panning'); try { sc.setPointerCapture(e.pointerId); } catch (x) { /* a touch pointer may not be capturable */ } });
    sc.addEventListener('pointermove', (e) => { if (!pan) return; sc.scrollLeft = pan.sl - (e.clientX - pan.x); sc.scrollTop = pan.st - (e.clientY - pan.y); });
    const end = () => { pan = null; sc.classList.remove('panning'); }; sc.addEventListener('pointerup', end); sc.addEventListener('pointercancel', end);
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
    else if (a === 'apply') {
      const ap = S.les.ask.apply, out = outcomeOf(ap); S.applied = applyAction(ap);
      if (S.applied.ok && nd) { const k = know(S.lg); k.applied = k.applied || {}; k.applied[nd.id] = { at: Date.now(), lesson: nd.t, say: ap.say, outcome: out }; k.lastApplied = nd.id; if (S.opts.save) S.opts.save(); }
      draw();
    }
    else if (a === 'done' && nd) { const k = know(S.lg).done; if (k[nd.id]) delete k[nd.id]; else k[nd.id] = { at: Date.now() }; if (S.opts.save) S.opts.save(); draw(); }
  }

  // What the AI agent is told about the lesson the student has open, so it can answer questions about it the way it answers questions about tactics.
  const plain = (t) => String(t == null ? '' : t).replace(/\s+/g, ' ').trim();
  function contextText() {
    if (!S || !S.sel) return '';
    const nd = FM.knowledgeNode(S.sel); if (!nd) return '';
    const out = ['LESSON OPEN ON THE KNOWLEDGE MAP: ' + nd.t + ' (' + nd.strand + ', ' + nd.spec + ', ' + (S.lg.tier === 'gcse' ? 'Edexcel GCSE' : 'Edexcel A-level') + '). ' + (doneOf(S.lg, nd.id) ? 'The student has marked it learnt.' : 'Not learnt yet.')];
    const les = S.les;
    if (les) {
      const ana = les.analogy || (FM.knowledgeIntros && FM.knowledgeIntros[nd.id] ? FM.knowledgeIntros[nd.id](S.d) : '');
      if (ana) out.push('Analogy: ' + plain([].concat(ana).join(' ')));
      const shown = Math.max(1, Math.min(les.steps.length, S.shown || 1));
      les.steps.slice(0, shown).forEach((st, i) => out.push('Step ' + (i + 1) + ' (shown): ' + plain(st.say.join(' ')) + (st.maths ? ' Maths: ' + plain([].concat(st.maths).join(' ; ')) : '')));
      if (shown < les.steps.length) out.push((les.steps.length - shown) + ' more steps not yet shown to the student.');
      else {
        out.push('Question at the end: ' + plain(les.ask.q));
        out.push('Student\'s answer so far: ' + (plain(S.ans) || '(nothing typed)') + (S.result && S.result.verdict ? ' | marked: ' + S.result.verdict : ''));
      }
    } else out.push('(The lesson for this point is still being written, so there is no lesson text yet.)');
    { const st = FM.knowledgeStatus(S.lg); out.push('Schedule: ' + schedState(S.lg, nd.id).st + ' for this lesson; due now: ' + (st.due.map((x) => x.t).join('; ') || 'none') + '; overdue: ' + (st.overdue.map((x) => x.t).join('; ') || 'none') + '.'); }
    const learnt = Object.keys(know(S.lg).done).map((id) => FM.knowledgeNode(id)).filter(Boolean).map((n) => n.t).slice(-12);
    out.push('Learnt so far: ' + (learnt.length ? learnt.join('; ') : 'nothing yet') + '.');
    return out.join('\n').slice(0, 3600);
  }

  FM.knowledgeUI = {
    // hosts: { map, sug, lesson }, each an element or null (a closed panel is simply not drawn into)
    mount(hosts, lg, opts) { S = Object.assign(S && S.lg === lg ? S : { sel: null, shown: 1 }, { hosts: hosts || {}, lg, opts: opts || {} }); draw(); },
    open(id) { if (!S) return; S.sel = id; S.shown = 1; S.result = null; S.resetScroll = true; if (S.opts.onOpen) S.opts.onOpen(id); draw(); },
    contextText,
  };
})();
