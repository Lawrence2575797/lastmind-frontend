// Case studies. Every player gets one puzzle built from what he actually did in this season's matches: a headline figure that is worse than the
// league's (a winger whose crosses find a team-mate less often, a keeper who saves fewer shots), and a reason the manager has to find with the right
// statistical tool. Everything is read from the match logs: nothing is made up or carried over from earlier seasons or friendlies. What the manager
// decides is applied as real player instructions the match engine uses, so the next matches show whether it worked.
// The cause is whichever of three levers the data says would help most: WHERE he does it (the choices of position or kind), HOW well he does it
// (technique, poor wherever it is), or WHAT SURROUNDS him (team-mates' positions and support).
(function () {
  const FM = (window.FM = window.FM || {});
  const S = FM.STAT;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pct = (v) => Math.round(v * 100) + '%';
  const sigm = (z) => 1 / (1 + Math.exp(-z));
  const hsh = (s) => FM.hashString(String(s));
  const KINDS = ['location', 'execution', 'context'];

  // Zones are listed best first, and the situation from worst to best. INSTR says what each fix does in the match engine.
  const T = {
    cross: { lesson: 'pass', unit: 'crosses', vp: 'find a team-mate', tech: 'His crossing technique', title: 'The crosses that do not arrive',
      zone: { label: 'Where he crosses from', levels: ['From the byline', 'From the edge of the box, wide', 'From deep and wide'] },
      ctx: { label: 'Team-mates in the box', levels: ['None or one', 'Two', 'Three or more'] },
      act: { location: 'Ask him to get further forward, so he crosses from the byline more', execution: 'Have him train his crossing from the deeper positions', context: 'Have the strikers run into the box more often' },
      exp: { location: 'He gets the ball away from the poorer positions too often, and does well from the byline.', execution: 'He is below the league from every position, so the delivery itself has to be trained.', context: 'His delivery is fine from each position: what changes the result is how many team-mates there are to meet it.' } },
    shoot: { lesson: 'shoot', unit: 'shots', vp: 'go in', tech: 'His finishing', title: 'The shots that do not go in',
      zone: { label: 'Where he shoots from', levels: ['Inside the six-yard box', 'Inside the area', 'From outside the area'] },
      ctx: { label: 'The space he has', levels: ['Closed down', 'Some room', 'Free'] },
      act: { location: 'Tell him to shoot less, so he waits for better chances', execution: 'Train his finishing', context: 'Let him roam from his position to find space' },
      exp: { location: 'Too many of his shots come from poor positions, and from the good ones he does as well as anyone.', execution: 'From every position he scores less than he should: the finishing has to be trained.', context: 'He finishes the chances he gets with room; the problem is how often he is closed down when the ball arrives.' } },
    progress: { lesson: 'pass', unit: 'passes', vp: 'arrive', tech: 'His passing technique', title: 'The passes that go astray',
      zone: { label: 'What kind of pass', levels: ['Short and safe', 'Forward through the lines', 'Long switch'] },
      ctx: { label: 'The receiver', levels: ['Marked', 'Some room', 'Free'] },
      act: { location: 'Tell him to play it safe: fewer ambitious passes', execution: 'Train his passing technique', context: 'Have the attackers run off the ball into space' },
      exp: { location: 'He keeps choosing the difficult pass when an easier one is there.', execution: 'He is below the league on every kind of pass, so the technique has to improve.', context: 'The passes themselves are fine; his team-mates are not giving him free receivers.' } },
    duel: { lesson: 'tackle', unit: 'challenges', vp: 'win the ball', tech: 'His tackling technique', title: 'The challenges he loses',
      zone: { label: 'Where he challenges', levels: ['In the other half', 'In his own half', 'Near his own goal'] },
      ctx: { label: 'The cover around him', levels: ['Alone', 'Some cover', 'Close support'] },
      act: { location: 'Tell him to stay on his feet and stop diving in', execution: 'Train his tackling technique', context: 'Have the midfield sit deeper to cover him' },
      exp: { location: 'He wins plenty where he is comfortable, but keeps committing in the places where it fails.', execution: 'He loses more than he should wherever it is: the technique is the problem.', context: 'He is fine with support, but is too often left alone when he has to challenge.' } },
    keeper: { lesson: 'keeper', unit: 'shots faced', vp: 'are saved', tech: 'His shot-stopping', title: 'The shots that beat him',
      zone: { label: 'How far out the shot is', levels: ['Long range', 'Mid range', 'Close range'] },
      ctx: { label: 'The angle', levels: ['Central', 'Slightly wide', 'Tight angle'] },
      act: { location: 'Ask the defence to close shooters down earlier', execution: 'Train his shot-stopping', context: 'Train his shot-stopping (angles and positioning)' },
      exp: { location: 'He faces too many close-range shots: the defence is letting them happen.', execution: 'He saves fewer than he should at every distance: the shot-stopping needs training.', context: 'The angle is what beats him: his positioning is the thing to work on.' } },
  };
  const POS_T = { WF: ['cross', 'shoot', 'progress'], FB: ['cross', 'progress', 'duel'], ST: ['shoot', 'progress'], AM: ['shoot', 'progress', 'cross'], CM: ['progress', 'shoot', 'duel'], DM: ['progress', 'duel'], CB: ['duel', 'progress'], GK: ['keeper'] };
  const MIN_ROWS = 6;
  const WIN = { cross: 'Found a team-mate', shoot: 'Goal', progress: 'Arrived', duel: 'Won the ball', keeper: 'Saved' };

  // ---------- reading the match logs ----------
  const W = 68, LEN = 105;
  function rowsFromLog(f, key, tid, who) {
    const L = f.log, side = L.teams.indexOf(tid), out = [];
    if (side < 0) return out;
    const R = f.round, opp = L.teams[1 - side];
    const keep = (r) => { if (who == null || r.who === who) { r.opp = opp; out.push(r); } };
    if (key === 'cross' || key === 'progress') {
      (L.passes || []).forEach((q) => {
        if (q[1] !== side || q[4] === 2) return;
        if (key === 'progress') {
          const d = q[7], press = q[9];
          keep({ z: d < 12 ? 0 : d < 26 ? 1 : 2, c: press < 3 ? 0 : press < 6 ? 1 : 2, ok: q[4] === 1 ? 1 : 0, round: R, who: q[2], t: q[0] });
        } else {
          if (q.length < 14 || q[11] < 0) return;
          const tx = q[11], ty = q[12], box = q[13], end = tx < LEN / 2 ? 0 : LEN, x = q[5], y = q[6];
          const dgl = Math.abs(x - end);
          if (Math.abs(y - W / 2) < 16 || dgl > 40 || Math.abs(tx - end) > 16.5 || Math.abs(ty - W / 2) > 20.2) return;
          keep({ z: dgl <= 9 ? 0 : dgl <= 24 ? 1 : 2, c: box <= 1 ? 0 : box === 2 ? 1 : 2, ok: q[4] === 1 ? 1 : 0, round: R, who: q[2], t: q[0] });
        }
      });
    } else if (key === 'duel') {
      (L.tackles || []).forEach((q) => {
        if (q[1] !== side || q.length < 9 || q[7] < 0) return;
        const depth = q[7], cover = q[8];
        keep({ z: depth > 0.6 ? 0 : depth > 0.3 ? 1 : 2, c: cover > 12 ? 0 : cover > 6 ? 1 : 2, ok: q[4] === 1 ? 1 : 0, round: R, who: q[2], t: q[0] });
      });
    } else if (key === 'shoot') {
      (L.other || []).forEach((q) => {
        if (q.type !== 'shot' || q.team !== tid || q.x == null || q.defDist == null) return;
        const dist = Math.min(q.x, LEN - q.x);
        keep({ z: dist <= 7 ? 0 : dist <= 16.5 && Math.abs(q.y - W / 2) <= 20.2 ? 1 : 2, c: q.defDist < 2 ? 0 : q.defDist < 4 ? 1 : 2, ok: q.outcome === 'goal' ? 1 : 0, round: R, who: q.player, t: q.t });
      });
    } else if (key === 'keeper') {
      (L.other || []).forEach((q) => {
        if (q.type !== 'shot' || q.team === tid || q.x == null || (q.outcome !== 'saved' && q.outcome !== 'goal')) return;
        const dist = Math.min(q.x, LEN - q.x), ang = Math.abs(q.y - W / 2);
        keep({ z: dist > 22 ? 0 : dist > 12 ? 1 : 2, c: ang < 6 ? 0 : ang < 12 ? 1 : 2, ok: q.outcome === 'saved' ? 1 : 0, round: R, who: 1, t: q.t });
      });
    }
    return out;
  }
  function collect(league, p, key) {
    const fx = FM.devFixtures ? FM.devFixtures(league) : [];
    const club = FM.clubOf(league, p);
    const mine = [], all = [];
    fx.forEach((f) => {
      f.log.teams.forEach((tid) => {
        const rows = rowsFromLog(f, key, tid, null);
        rows.forEach((r) => { all.push(r); });
        if (club && tid === club.id) rows.forEach((r) => { if (r.who === p.number) mine.push(r); });
      });
    });
    return { mine, all };
  }
  const rate = (rows) => (rows.length ? rows.filter((r) => r.ok).length / rows.length : NaN);
  function fit(rows) {
    if (rows.length < 12) return null;
    const X = rows.map((r) => [1, r.z === 1 ? 1 : 0, r.z === 2 ? 1 : 0, r.c]), y = rows.map((r) => r.ok);
    if (y.every((v) => v === y[0])) return null;
    try { const m = S.logistic(X, y); return m && m.converged ? m : null; } catch (e) { return null; }
  }
  const mixOf = (rows, k) => [0, 1, 2].map((v) => (rows.length ? rows.filter((r) => r[k] === v).length / rows.length : 0));

  // Which case a player gets: the kind of decision (by position) where he is furthest below the league, among those he has made.
  function pickKey(league, p, st) {
    if (st.key) {
      // a case whose data is no longer there (a new save, a new season) is dropped unless the manager has already acted on it
      if (st.choice != null || collect(league, p, st.key).mine.length >= MIN_ROWS) return st.key;
      st.key = null;
    }
    let best = null;
    (POS_T[p.natural] || ['progress']).forEach((key) => {
      const c = collect(league, p, key);
      if (c.mine.length < MIN_ROWS || c.all.length < 20) return;
      const gap = rate(c.all) - rate(c.mine);
      if (!best || gap > best.gap) best = { key, gap };
    });
    if (best) st.key = best.key;
    return best && best.key;
  }
  // What each fix is expected to do, from the model fitted to his own decisions.
  function project(rows, all) {
    const m = fit(rows);
    if (!m) return null;
    const b = m.beta, zb = [0, b[1], b[2]], cb = b[3];
    const lg = (z, c) => sigm(b[0] + zb[z] + cb * c);
    const mean = (f) => rows.reduce((a, r) => a + f(r), 0) / rows.length;
    const now = rate(rows);
    const lw = mixOf(all, 'z'), shifted = [lw[0] + 0.12, lw[1], Math.max(0.02, lw[2] - 0.12)], tw = shifted.reduce((a, c) => a + c, 0);
    const location = [0, 1, 2].reduce((a, z) => a + (shifted[z] / tw) * mean((r) => lg(z, r.c)), 0);
    const execution = mean((r) => sigm(b[0] + zb[r.z] + cb * r.c + 0.4));
    const context = mean((r) => lg(r.z, Math.min(2, r.c + 1)));
    const calib = (v) => v - (mean((r) => lg(r.z, r.c)) - now);   // anchored to what he actually does now
    return { m, now, location: calib(location), execution: calib(execution), context: calib(context) };
  }
  const plainP = (p) => {
    if (p == null || isNaN(p)) return 'there is too little data to say';
    const n = Math.max(2, Math.min(1000, Math.round(1 / Math.max(p, 0.001))));
    if (p < 0.05) return 'luck alone would give a gap this big only about 1 time in ' + n + ', so it is very likely real';
    if (p < 0.15) return 'luck alone would give a gap this big about 1 time in ' + n + ': it may be real, but it is not convincing yet';
    return 'luck alone would easily give a gap like this (about 1 time in ' + n + '), so there is no real evidence of a difference yet';
  };
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const OR = (b) => Math.exp(b);
  const info = (t, body) => `<details class="dv-explain"><summary>${esc(t)}</summary><p>${esc(body)}</p></details>`;

  // ---------- applying a decision as real player instructions ----------
  const INSTR = {
    cross: { location: (p) => [[p, 'depth', 1]], context: (p, xi) => xi.filter((q) => q.natural === 'ST').map((q) => [q, 'runs', 1]) },
    shoot: { location: (p) => [[p, 'shoot', -1]], context: (p) => [[p, 'position', 1]] },
    progress: { location: (p) => [[p, 'risk', -1]], context: (p, xi) => xi.filter((q) => q !== p && ['AM', 'WF', 'ST'].indexOf(q.natural) >= 0).map((q) => [q, 'runs', 1]) },
    duel: { location: (p) => [[p, 'tackle', -1]], context: (p, xi) => xi.filter((q) => q !== p && ['DM', 'CM'].indexOf(q.natural) >= 0).map((q) => [q, 'depth', -1]) },
    keeper: { location: (p, xi) => xi.filter((q) => ['CB', 'FB'].indexOf(q.natural) >= 0).map((q) => [q, 'closeDown', 1]) },
  };
  const INSTR_WORD = { depth: 'Get further forward', runs: 'Run in behind often', shoot: 'Shoot less', position: 'Roam from his position', risk: 'Play it safe', tackle: 'Stay on his feet', closeDown: 'Close down more' };

  // The tools the manager can run on his decisions (no questions: each one just does its job and explains what it found).
  const TOOLS = [
    { id: 'rate', name: 'Compare him with the league', how: 'A confidence interval around his rate' },
    { id: 'split', name: 'Break his decisions down by situation', how: 'Success rates by group, with a chi-square test' },
    { id: 'both', name: 'Separate the two factors', how: 'A logistic regression with both factors in it' },
  ];

  FM.caseState = function (league, p) {
    const d = FM.develop(league);
    d.cases = d.cases || {};
    return (d.cases[p.id] = d.cases[p.id] || { ran: {}, choice: null, appliedRound: null, created: Date.now(), key: null });
  };

  // ---------- the screen ----------
  FM.renderCase = function (league, p, host, hooks) {
    const st = FM.caseState(league, p), save = () => { if (hooks && hooks.save) hooks.save(); }, redraw = () => FM.renderCase(league, p, host, hooks);
    const key = pickKey(league, p, st);
    if (!key) { host.innerHTML = '<div class="dv-case"><p class="note">His case study is built from what he does in this season\'s matches. It appears once he has played.</p></div>'; return; }
    const tpl = T[key], last = p.name.split(' ').slice(-1)[0], c = { last, tpl, p };
    const { mine, all } = collect(league, p, key);
    const applied = st.choice != null, cut = applied ? st.appliedRound : Infinity;
    const base = applied ? mine.filter((r) => r.round < cut) : mine, after = applied ? mine.filter((r) => r.round >= cut) : [];
    const use = base.length >= MIN_ROWS ? base : mine;
    if (!use.length) { host.innerHTML = '<div class="dv-case"><p class="note">His case study is built from what he does in this season’s matches. It appears once he has played.</p></div>'; return; }
    const n = use.length, ok = use.filter((r) => r.ok).length, w = S.wilson(ok, n, 0.95), lr = rate(all);
    const zR = [0, 1, 2].map((z) => { const g = use.filter((r) => r.z === z); return { n: g.length, k: g.filter((r) => r.ok).length }; });
    const cR = [0, 1, 2].map((k) => { const g = use.filter((r) => r.c === k); return { n: g.length, k: g.filter((r) => r.ok).length }; });
    const table = (arr, head, names) => `<table class="data dv-split"><thead><tr><th class="l">${esc(head)}</th><th>${esc(tpl.unit)}</th><th>Success</th></tr></thead><tbody>${arr.map((g, i) => `<tr><td class="l">${esc(names[i])}</td><td>${g.n}</td><td>${g.n ? pct(g.k / g.n) : '–'}</td></tr>`).join('')}</tbody></table>`;
    const chi = (arr) => { const t = arr.filter((g) => g.n > 0).map((g) => [g.k, g.n - g.k]); return t.length >= 2 ? S.chi2Indep(t) : null; };
    const proj = project(use, all);
    const avail = KINDS.filter((k) => !(key === 'keeper' && k === 'context'));
    const bestKind = proj ? avail.slice().sort((a, b) => (proj[b] - proj.now) - (proj[a] - proj.now))[0] : 'execution';
    let html = `<div class="dv-case"><h5>${esc(tpl.title)}</h5>
      <p><b>The brief:</b> <b>${pct(ok / n)}</b> of ${esc(last)}'s ${esc(tpl.unit)} ${esc(tpl.vp)} (${ok} of ${n}), against <b>${pct(lr)}</b> for the league. Find out why, and decide what to do.</p>`;
    // the evidence itself: his decisions, match by match, most recent first
    const oppName = (tid) => { const tm = FM.teamById(league, tid); return tm ? tm.name : 'Opponent'; };
    const evid = use.slice().sort((a, b) => b.round - a.round || (b.t || 0) - (a.t || 0)).slice(0, 40);
    html += `<details class="dv-explain dv-evidence" open><summary>The evidence: ${use.length} of his ${esc(tpl.unit)} this season${use.length > evid.length ? ' (the latest ' + evid.length + ' shown)' : ''}</summary>
      <div class="dv-evscroll"><table class="data dv-split"><thead><tr><th class="l">Match</th><th>Min</th><th class="l">${esc(tpl.zone.label)}</th><th class="l">${esc(tpl.ctx.label)}</th><th>Result</th></tr></thead><tbody>${evid.map((r) => `<tr><td class="l">Round ${r.round} v ${esc(oppName(r.opp))}</td><td>${r.t != null ? Math.floor(r.t / 60) + 1 : '–'}'</td><td class="l">${esc(tpl.zone.levels[r.z])}</td><td class="l">${esc(tpl.ctx.levels[r.c])}</td><td>${r.ok ? '<b>' + esc(WIN[key]) + '</b>' : 'Failed'}</td></tr>`).join('')}</tbody></table></div></details>`;
    const resultOf = (id) => {
      if (id === 'rate') {
        const below = w.hi < lr, above = w.lo > lr;
        return `<p>His rate is <b>${pct(ok / n)}</b>, and the true figure plausibly lies between <b>${pct(w.lo)}</b> and <b>${pct(w.hi)}</b>. ${below ? `The league's ${pct(lr)} sits above that range, so he really is below the league.` : above ? 'He is above the league: this is a strength to protect.' : `The league's ${pct(lr)} sits inside that range, so he could be an average player on a poor run.`}</p>` +
          info('What a confidence interval is', 'It is the range of true success rates that would plausibly produce what you saw. If the league average falls outside it, the gap is bigger than luck usually gives; if it falls inside, you cannot tell the two apart yet.');
      }
      if (id === 'split') {
        const a = chi(zR), b = chi(cR);
        return table(zR, tpl.zone.label, tpl.zone.levels) + (a ? `<p>${esc(tpl.zone.label)}: ${esc(plainP(a.p))}.</p>` : '') + table(cR, tpl.ctx.label, tpl.ctx.levels) + (b ? `<p>${esc(tpl.ctx.label)}: ${esc(plainP(b.p))}.</p>` : '') +
          info('What a chi-square test asks', 'It compares what you saw in each group with what you would see if the groups made no difference to the success rate. A big mismatch means the groups really do differ. The sentence beside each table turns the result into "how often would luck alone do this".');
      }
      if (id === 'both') {
        if (!proj) return '<p class="note">The model fills in as more of his matches are played.</p>';
        const m = proj.m;
        return `<table class="data dv-model"><thead><tr><th class="l">Factor</th><th>Odds multiplier</th><th class="l">Could it be chance?</th></tr></thead><tbody>
          <tr><td class="l">${esc(tpl.zone.levels[1])} (compared with ${esc(tpl.zone.levels[0].toLowerCase())})</td><td><b>${OR(m.beta[1]).toFixed(2)}</b></td><td class="l">${esc(cap(plainP(m.p[1])))}</td></tr>
          <tr><td class="l">${esc(tpl.zone.levels[2])} (compared with ${esc(tpl.zone.levels[0].toLowerCase())})</td><td><b>${OR(m.beta[2]).toFixed(2)}</b></td><td class="l">${esc(cap(plainP(m.p[2])))}</td></tr>
          <tr><td class="l">Each step up in ${esc(tpl.ctx.label.toLowerCase())}</td><td><b>${OR(m.beta[3]).toFixed(2)}</b></td><td class="l">${esc(cap(plainP(m.p[3])))}</td></tr></tbody></table>` +
          info('What the multiplier means', 'The odds of success are multiplied by this number for that change, with the other factor held where it was. Above 1 helps, below 1 hurts, and 1 means no effect. This is the point of the model: each factor is judged with the other one fixed.');
      }
      if (id === 'cause') return `<p><b>You decided:</b> ${esc(st.causeText || '')}</p>`;
      return '';
    };
    // the analyses: run in any order, each one shows what it found
    st.ran = st.ran || {};
    html += `<div class="dv-tools">${TOOLS.map((t) => `<button type="button" class="dv-tool${st.ran[t.id] ? ' on' : ''}" data-tool="${t.id}"><b>${esc(t.name)}</b><small>${esc(t.how)}</small></button>`).join('')}</div>`;
    TOOLS.forEach((t) => { if (st.ran[t.id]) html += `<div class="dv-step done"><b>${esc(t.name)}</b>${resultOf(t.id)}</div>`; });
    if (!applied) {
      html += `<div class="dv-step now"><b>What will you do about it?</b><div class="dv-opts">${avail.map((k) => ({ id: k, label: tpl.act[k] })).sort((x, y) => hsh(st.created + x.id) - hsh(st.created + y.id)).map((o) => `<button type="button" class="dv-opt" data-copt="${esc(o.id)}">${esc(o.label)}</button>`).join('')}</div></div>`;
    } else {
      const ch = st.choice, g = (k) => (proj ? proj[k] - proj.now : 0);
      html += `<div class="dv-step done"><b>You decided:</b> <p>${esc(tpl.act[ch])}</p>
        ${st.setText ? `<p class="note">Applied in the match engine: ${esc(st.setText)}.</p>` : ''}
        <p>${ch === bestKind ? 'That is the right fix for what his matches show. ' : (g(ch) > 0.02 ? 'That helps, but it is not the biggest thing you could have done. ' : 'That is unlikely to make much difference to the cause. ')}${esc(tpl.exp[bestKind])}</p>
        ${proj ? `<table class="data dv-split"><thead><tr><th class="l">If you had chosen</th><th>Expected ${esc(tpl.unit)} success</th></tr></thead><tbody><tr><td class="l"><i>Now</i></td><td>${pct(proj.now)}</td></tr>${avail.map((k) => `<tr><td class="l">${esc(tpl.act[k])}${k === ch ? ' (your choice)' : ''}</td><td>${pct(proj[k])}</td></tr>`).join('')}</tbody></table>` : ''}</div>`;
      if (after.length) {
        const k2 = after.filter((r) => r.ok).length, n2 = after.length, t = FM.devTwoProp ? FM.devTwoProp({ n, k: ok, rate: ok / n }, { n: n2, k: k2, rate: k2 / n2 }) : null;
        html += `<div class="dv-step done"><b>Since you acted:</b><p>Before: ${pct(ok / n)} (${ok} of ${n}). Since: <b>${pct(k2 / n2)}</b> (${k2} of ${n2}).${t ? ' ' + esc(cap(plainP(t.p))) + '.' : ''}</p></div>`;
      } else html += '<p class="note">Play the next match: the feedback below will report how it went.</p>';
    }
    host.innerHTML = html + '</div>';
    host.querySelectorAll('[data-tool]').forEach((b) => b.addEventListener('click', () => { st.ran[b.dataset.tool] = true; save(); redraw(); }));
    host.querySelectorAll('[data-copt]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.copt;
      st.choice = id;
      st.appliedRound = league.fixtures.filter((f) => f.played && (f.homeId === league.userId || f.awayId === league.userId) && !f.friendly).length;
      const d = FM.develop(league), me = FM.teamById(league, league.userId);
      // what he takes in from a training plan follows how much of the analysis you did
      const score = Math.min(100, 40 + 20 * TOOLS.filter((t) => st.ran[t.id]).length);
      st.score = score; const set = [];
      if (id === 'execution' || (key === 'keeper' && id === 'context')) {
        d.plans[p.id] = { lesson: tpl.lesson, active: true, startRound: st.appliedRound, startAbility: FM.abilityOf(p), rounds: 0, gain: 0, understanding: score, attempts: 1, last: { text: '(case study)', reply: '', tip: '', understanding: score } };
        if (!d.hist[p.id]) d.hist[p.id] = [[st.appliedRound - 1, FM.abilityOf(p)]];
        set.push('training plan started');
      } else if (INSTR[key] && INSTR[key][id]) {
        INSTR[key][id](p, me.players).forEach(([q, k, v]) => { q.instr = q.instr || {}; q.instr[k] = v; set.push(q.name.split(' ').slice(-1)[0] + ': ' + INSTR_WORD[k]); });
      }
      st.setText = set.join('; ');
      d.feed.push({ id: 'D' + (d.seq++), round: st.appliedRound - 1, pid: p.id, name: p.name, kind: id === bestKind ? 'good' : 'ok', title: 'Decision made: ' + last,
        text: 'You have decided: ' + tpl.act[id].charAt(0).toLowerCase() + tpl.act[id].slice(1) + '. ' + (id === bestKind ? 'It is the right answer to what the data showed.' : 'It addresses part of the problem, but not the main cause.'),
        advice: 'The next matches will show whether his ' + tpl.unit + ' improve. Read the feedback after each round.' });
      save(); redraw(); if (hooks && hooks.redraw) hooks.redraw();
    }));
  };

  // After each round: his decisions in the match just played, set against before the change.
  FM.caseAfterRound = function (league, round) {
    const d = FM.develop(league); if (!d.cases) return;
    const me = FM.teamById(league, league.userId);
    Object.keys(d.cases).forEach((pid) => {
      const st = d.cases[pid];
      if (!st || st.choice == null || !st.key || round < st.appliedRound) return;
      const p = me.squad.find((q) => q.id === pid); if (!p) return;
      const tpl = T[st.key], { mine } = collect(league, p, st.key);
      const before = mine.filter((r) => r.round < st.appliedRound), after = mine.filter((r) => r.round >= st.appliedRound);
      if (!after.length || !before.length) return;
      const k1 = before.filter((r) => r.ok).length, k2 = after.filter((r) => r.ok).length, r1 = k1 / before.length, r2 = k2 / after.length, last = p.name.split(' ').slice(-1)[0];
      const t = FM.devTwoProp ? FM.devTwoProp({ n: before.length, k: k1, rate: r1 }, { n: after.length, k: k2, rate: r2 }) : null;
      const diff = r2 - r1;
      let kind, title, text, advice;
      if (diff >= 0.08 && t && t.p < 0.05) {
        kind = 'good'; title = last + ': your analysis paid off';
        text = 'It worked. ' + p.name + "'s " + tpl.unit + ' have gone from ' + pct(r1) + ' to ' + pct(r2) + ' (' + k2 + ' of ' + after.length + ' since). ' + cap(plainP(t.p)) + '. You found the real cause and fixed it.';
        advice = 'Keep it in place and check it holds against stronger sides. Then look at another player: every one of them has a case waiting.';
      } else if (diff >= 0.03) {
        kind = 'ok'; title = last + ' is moving the right way';
        text = p.name + "'s " + tpl.unit + ' are at ' + pct(r2) + ' since the change, up from ' + pct(r1) + '.';
        advice = 'Keep it in place and watch the next match.';
      } else if (diff <= -0.06) {
        kind = 'bad'; title = last + ' has got worse';
        text = 'Not what you wanted: ' + p.name + "'s " + tpl.unit + ' have dropped from ' + pct(r1) + ' to ' + pct(r2) + '.';
        advice = 'Go back over the analysis. Check which factor the model said mattered once the others were held fixed, and whether the fix you chose addressed that one.';
      } else {
        kind = 'info'; title = 'No clear change yet for ' + last;
        text = p.name + "'s " + tpl.unit + ' are at ' + pct(r2) + ' since the change, against ' + pct(r1) + ' before.';
        advice = 'Keep it in place and watch the next match. If the fix does not address the main cause, look again at what the model said.';
      }
      d.feed = d.feed.filter((f) => !(f.pid === pid && f.caseRound === round));
      d.feed.push({ id: 'D' + (d.seq++), round, pid, name: p.name, kind, title, text, advice, caseRound: round });
    });
  };
})();
