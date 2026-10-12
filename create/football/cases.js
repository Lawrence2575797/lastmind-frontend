// Case studies. Every player gets one puzzle built from his own decisions: a headline number that is worse than the league's (a winger who crosses
// less successfully, a keeper who saves fewer shots than he should), and a hidden reason the manager has to find with the right statistical tool.
// The reason is one of three kinds: WHERE he does it (a habit: he keeps choosing the poorer places), HOW he does it (execution: poor from
// everywhere), or WHAT SURROUNDS him (team-mates are not in the right positions). The data is generated for the player once, from his ratings and
// a seed, with the hidden reason built in; the manager's job is to find it, then choose what to do, and the feedback after the next matches
// shows whether the decision worked.
(function () {
  const FM = (window.FM = window.FM || {});
  const S = FM.STAT;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pct = (v) => Math.round(v * 100) + '%';
  const sigm = (z) => 1 / (1 + Math.exp(-z));
  const hsh = (s) => FM.hashString(String(s));

  // ---------- the five kinds of case, by position ----------
  const T = {
    cross: { lesson: 'pass', unit: 'crosses', verb: 'finds a team-mate', vp: 'find a team-mate', tech: 'His crossing technique', league: 0.31, title: 'The crosses that do not arrive',
      zone: { label: 'Where he crosses from', levels: ['From the byline', 'From the edge of the box, wide', 'From deep and wide'], eff: [0.9, 0.1, -0.8], typ: [0.28, 0.4, 0.32] },
      ctx: { label: 'Forwards in the box', levels: ['One forward', 'Two forwards', 'Three or more'], eff: [-0.7, 0, 0.7], typ: [0.35, 0.4, 0.25] },
      act: { location: 'Ask him to cross from the byline more often', execution: 'Have him train crossing from the deeper positions', context: 'Change the forwards\' runs so more of them are in the box' },
      exp: { location: 'He has the habit of crossing from the poorer positions, so the answer is to get him to the byline.', execution: 'He is below the league from every position, so the problem is the delivery itself and it has to be trained.', context: 'His delivery is fine from each position: what changes the result is how many forwards are there to meet it.' } },
    shoot: { lesson: 'shoot', unit: 'shots', verb: 'scores', vp: 'go in', tech: 'His finishing', league: 0.11, title: 'The shots that do not go in',
      zone: { label: 'Where he shoots from', levels: ['Inside the six-yard box', 'Central, inside the area', 'From outside the area'], eff: [1.4, 0.1, -1.3], typ: [0.1, 0.5, 0.4] },
      ctx: { label: 'The space he has', levels: ['Closed down', 'Some room', 'Free'], eff: [-0.6, 0, 0.6], typ: [0.35, 0.4, 0.25] },
      act: { location: 'Work on getting him into better places to shoot, and stop the long shots', execution: 'Train his finishing', context: 'Improve the service so his chances come with space' },
      exp: { location: 'Too many of his shots come from poor positions, and from the good ones he does as well as anyone.', execution: 'From every position he scores less than he should: the finishing has to be trained.', context: 'He finishes the chances he gets with room; the problem is how often he is closed down when the ball arrives.' } },
    progress: { lesson: 'pass', unit: 'passes', verb: 'arrives', vp: 'arrive', tech: 'His passing technique', league: 0.78, title: 'The passes that go astray',
      zone: { label: 'What kind of pass', levels: ['Short and safe', 'Forward through the lines', 'Long switch'], eff: [0.9, -0.1, -0.9], typ: [0.5, 0.35, 0.15] },
      ctx: { label: 'The receiver', levels: ['Marked', 'Some room', 'Free'], eff: [-0.7, 0, 0.7], typ: [0.35, 0.4, 0.25] },
      act: { location: 'Ask him to play the safer pass more often', execution: 'Train his passing technique under pressure', context: 'Get his team-mates to move into space before he plays' },
      exp: { location: 'He keeps choosing the difficult pass when an easier one is there.', execution: 'He is below the league on every kind of pass, so the technique has to improve.', context: 'The passes themselves are fine; his team-mates are not giving him free receivers.' } },
    duel: { lesson: 'tackle', unit: 'challenges', verb: 'wins the ball', vp: 'win the ball', tech: 'His tackling technique', league: 0.4, title: 'The challenges he loses',
      zone: { label: 'Where he challenges', levels: ['In the other half', 'In his own half', 'In his own box'], eff: [0.5, 0.1, -0.6], typ: [0.3, 0.5, 0.2] },
      ctx: { label: 'The cover around him', levels: ['Alone', 'Some cover', 'Close support'], eff: [-0.6, 0, 0.6], typ: [0.35, 0.4, 0.25] },
      act: { location: 'Ask him to hold position and only challenge in the places he wins them', execution: 'Train his tackling technique', context: 'Have the midfield give him closer cover' },
      exp: { location: 'He wins plenty where he is comfortable, but keeps committing in the places where it fails.', execution: 'He loses more than he should wherever it is: the technique is the problem.', context: 'He is fine with support, but is too often left alone when he has to challenge.' } },
    keeper: { lesson: 'keeper', unit: 'shots faced', verb: 'saves it', vp: 'are saved', tech: 'His shot-stopping', league: 0.68, title: 'The shots that beat him',
      zone: { label: 'How far out the shot is', levels: ['Long range', 'Mid range', 'Close range'], eff: [0.8, 0, -1.0], typ: [0.3, 0.45, 0.25] },
      ctx: { label: 'The angle', levels: ['Central', 'Slightly wide', 'Tight angle'], eff: [-0.4, 0, 0.5], typ: [0.4, 0.4, 0.2] },
      act: { location: 'Ask the defence to close shooters down earlier so fewer shots are close range', execution: 'Train his shot-stopping', context: 'Work on his starting position and angles' },
      exp: { location: 'He faces too many close-range shots: the defence is letting them happen, and he saves the long ones as well as anyone.', execution: 'He saves fewer than he should at every distance: the shot-stopping needs training.', context: 'The angle is what beats him: his positioning is the thing to work on.' } },
  };
  const POS_T = { WF: 'cross', FB: 'cross', ST: 'shoot', AM: 'shoot', CM: 'progress', DM: 'progress', CB: 'duel', GK: 'keeper' };
  const KINDS = ['location', 'execution', 'context'];

  // ---------- the generating model: what the hidden reason does ----------
  const norm = (w) => { const t = w.reduce((a, b) => a + b, 0); return w.map((x) => x / t); };
  function zoneWeights(tpl, tilt) { return norm(tpl.zone.typ.map((w, i) => w * Math.exp(tilt * (1 - i)))); }
  function ctxWeights(tpl, z, skew) { return norm(tpl.ctx.typ.map((w, c) => w * Math.exp((0.35 * (1 - z) + skew) * (c - 1)))); }
  function rateUnder(tpl, par, L0) {
    const zw = zoneWeights(tpl, par.zoneTilt);
    let r = 0;
    zw.forEach((wz, z) => { const cw = ctxWeights(tpl, z, par.ctxSkew); cw.forEach((wc, c) => { r += wz * wc * sigm(L0 + par.sZ * tpl.zone.eff[z] + par.sC * tpl.ctx.eff[c] + par.shift); }); });
    return r;
  }
  function solveL0(tpl) {
    const ref = { zoneTilt: 0, ctxSkew: 0, sZ: 0.8, sC: 0.8, shift: 0 };
    let lo = -6, hi = 6;
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (rateUnder(tpl, ref, m) < tpl.league) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  const TRUTH = {
    location: { zoneTilt: -1.1, ctxSkew: 0, sZ: 1.0, sC: 0.5, shift: 0 },
    execution: { zoneTilt: 0, ctxSkew: 0, sZ: 0.5, sC: 0.5, shift: -0.9 },
    context: { zoneTilt: 0, ctxSkew: -0.9, sZ: 0.4, sC: 1.3, shift: 0 },
  };
  // A fix removes the deficit it is aimed at and does a little more: it takes that one thing to just better than a typical player's. So it helps
  // a great deal when that was the cause, and only a little when it was not.
  const FIX = { location: { zoneTilt: 0.35 }, execution: { shift: 0.15 }, context: { ctxSkew: 0.15 } };
  const withFix = (par, kind) => { const p = Object.assign({}, par); Object.keys(FIX[kind]).forEach((k) => { p[k] = Math.max(p[k], FIX[kind][k]); }); return p; };
  function draw(rng, tpl, par, L0, n, extra) {
    const zw = zoneWeights(tpl, par.zoneTilt), rows = [];
    for (let i = 0; i < n; i++) {
      let u = rng(), z = 0; while (z < 2 && u > zw[z]) { u -= zw[z]; z++; }
      const cw = ctxWeights(tpl, z, par.ctxSkew); let v = rng(), c = 0; while (c < 2 && v > cw[c]) { v -= cw[c]; c++; }
      const ok = rng() < sigm(L0 + par.sZ * tpl.zone.eff[z] + par.sC * tpl.ctx.eff[c] + par.shift) ? 1 : 0;
      rows.push(Object.assign({ z, c, ok }, extra || {}));
    }
    return rows;
  }
  // The logistic regression the manager will run: success on zone (best zone as reference) and context (0, 1, 2).
  function fit(rows) {
    if (rows.length < 30) return null;
    const X = rows.map((r) => [1, r.z === 1 ? 1 : 0, r.z === 2 ? 1 : 0, r.c]), y = rows.map((r) => r.ok);
    try { const m = S.logistic(X, y); return m && m.converged ? m : null; } catch (e) { return null; }
  }
  const sig = (m, j) => (m && m.p[j] != null ? m.p[j] : 1);

  // ---------- making a player's case ----------
  FM.caseState = function (league, p) {
    const d = FM.develop(league);
    d.cases = d.cases || {};
    if (d.cases[p.id]) return d.cases[p.id];
    const key = POS_T[p.natural] || 'progress', tpl = T[key], L0 = solveL0(tpl);
    const h = hsh(p.id + ':case:' + (league.seed || 0));
    const order = KINDS.slice();
    let kind = order[h % 3];
    if (key === 'keeper' && kind === 'context') kind = 'execution';
    let rows = null, mdl = null;
    for (let attempt = 0; attempt < 14; attempt++) {
      const rng = FM.mulberry32(h + attempt * 7919);
      const n = 90 + Math.floor(rng() * 50);
      const par = TRUTH[kind];
      rows = draw(rng, tpl, par, L0, n);
      mdl = fit(rows);
      if (!mdl) continue;
      const ok = rows.filter((r) => r.ok).length / rows.length, w = S.wilson(rows.filter((r) => r.ok).length, rows.length, 0.95);
      const zoneSig = Math.min(sig(mdl, 1), sig(mdl, 2)) < 0.05, ctxSig = sig(mdl, 3) < 0.05;
      const below = w.hi < tpl.league;
      if (!below) continue;
      if (kind === 'location' && zoneSig && !(ctxSig && Math.abs(mdl.beta[3]) > 0.9)) break;
      if (kind === 'context' && ctxSig && !zoneSig) break;
      if (kind === 'execution' && !zoneSig && !ctxSig) break;
      void ok;
    }
    const st = { key, kind, L0, rows: rows.map((r) => [r.z, r.c, r.ok, -1]), step: 0, tries: {}, wrong: 0, choice: null, pre: rows.length, appliedRound: null, created: Date.now() };
    d.cases[p.id] = st;
    return st;
  };
  const rowsOf = (st) => st.rows.map((r) => ({ z: r[0], c: r[1], ok: r[2], round: r[3] }));
  // what each fix would be expected to do, from the generating model
  FM.caseProjection = function (st) {
    const tpl = T[st.key], par = TRUTH[st.kind], out = {};
    out.now = rateUnder(tpl, par, st.L0);
    KINDS.forEach((k) => { out[k] = rateUnder(tpl, withFix(par, k), st.L0); });
    return out;
  };

  // ---------- plain words for a p-value, and what each step is ----------
  const plainP = (p) => {
    if (p == null || isNaN(p)) return 'there is too little data to say';
    const n = Math.max(2, Math.min(1000, Math.round(1 / Math.max(p, 0.001))));
    if (p < 0.05) return 'a gap this big would show up by luck alone roughly 1 time in ' + n + ': it is very likely real';
    if (p < 0.15) return 'luck alone would give a gap this big roughly 1 time in ' + n + ': it may be real, but it is not convincing yet';
    return 'luck alone would easily give a gap like this (about 1 time in ' + n + '): there is no real evidence of a difference yet';
  };
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const OR = (b) => Math.exp(b);
  const info = (t, body) => `<details class="dv-explain"><summary>${esc(t)}</summary><p>${esc(body)}</p></details>`;

  const STEPS = [
    { id: 'rate', ask: (c) => `How would you check whether ${c.last}'s ${c.tpl.unit} figure is really below the league's, or whether it is just a bad run?`,
      options: [
        { id: 'ci', label: 'Put a confidence interval around his rate', ok: true },
        { id: 'mean', label: 'Work out his mean and standard deviation per match', why: 'That would tell you how many he attempts and how much that varies, not whether his success rate differs from the league\'s.' },
        { id: 'corr', label: 'Correlate success with the match date', why: 'That looks for a trend over time. It does not compare his rate with the league average.' },
        { id: 'sum', label: 'Just compare the two percentages', why: 'A bare comparison cannot tell you whether the gap is bigger than a bad run produces: with this few attempts it often is not.' },
      ] },
    { id: 'split', ask: (c) => `The rate depends on the situation. Which tool compares success rates between groups, such as ${c.tpl.zone.levels[0].toLowerCase()} against ${c.tpl.zone.levels[2].toLowerCase()}?`,
      options: [
        { id: 'chi', label: 'A chi-square test on the groups', ok: true },
        { id: 'tt', label: 'A t-test on the average of each group', why: 'A t-test compares averages of measured numbers. Here each attempt is a yes or no, so you compare proportions.' },
        { id: 'pm', label: 'A correlation coefficient', why: 'That measures how two numbers move together. It does not compare success rates between named groups.' },
        { id: 'rg', label: 'A straight-line regression', why: 'A straight line does not fit a yes-or-no outcome (it can predict more than 100% or less than 0%).' },
      ] },
    { id: 'both', ask: (c) => `${c.tpl.zone.label} and ${c.tpl.ctx.label.toLowerCase()} overlap: the better positions tend to come with more support. Which tool separates what each one does by itself?`,
      options: [
        { id: 'logit', label: 'Logistic regression with both factors in it', ok: true },
        { id: 'two', label: 'Two separate chi-square tests', why: 'Each test ignores the other factor, so any effect that is really caused by one shows up in both. That is the confusion you are trying to remove.' },
        { id: 'avg', label: 'Compare the overall average with the league', why: 'That is where you started. It cannot say what is behind the gap.' },
        { id: 'pick', label: 'Just pick whichever split looks biggest', why: 'The biggest-looking split can be the one that is only carried by the other factor.' },
      ] },
    { id: 'cause', ask: (c) => 'With both factors taken together, what is actually holding him back?', options: 'dynamic' },
    { id: 'act', ask: (c) => 'What will you do about it?', options: 'dynamic' },
  ];

  // ---------- the screen ----------
  FM.renderCase = function (league, p, host, hooks) {
    const st = FM.caseState(league, p), tpl = T[st.key];
    const rows = rowsOf(st), last = p.name.split(' ').slice(-1)[0];
    const c = { last, tpl, p };
    const save = () => { if (hooks && hooks.save) hooks.save(); };
    const redraw = () => FM.renderCase(league, p, host, hooks);
    const after = rows.filter((r) => r.round >= 0), before = rows.filter((r) => r.round < 0);
    const base = before.length ? before : rows;
    const ok = base.filter((r) => r.ok).length, n = base.length, w = S.wilson(ok, n, 0.95);
    const zRates = tpl.zone.levels.map((_, z) => { const g = base.filter((r) => r.z === z); return { n: g.length, k: g.filter((r) => r.ok).length }; });
    const cRates = tpl.ctx.levels.map((_, k) => { const g = base.filter((r) => r.c === k); return { n: g.length, k: g.filter((r) => r.ok).length }; });
    const split = (arr, levels) => `<table class="data dv-split"><thead><tr><th class="l">${esc(levels.head)}</th><th>${esc(tpl.unit)}</th><th>${esc(tpl.verb.indexOf('wins') === 0 ? 'won' : 'success')}</th></tr></thead><tbody>${arr.map((g, i) => `<tr><td class="l">${esc(levels.names[i])}</td><td>${g.n}</td><td>${g.n ? pct(g.k / g.n) : '–'}</td></tr>`).join('')}</tbody></table>`;
    const chi = (arr) => { const t = arr.filter((g) => g.n > 0).map((g) => [g.k, g.n - g.k]); return t.length >= 2 ? S.chi2Indep(t) : null; };
    const mdl = fit(base.map((r) => ({ z: r.z, c: r.c, ok: r.ok })));
    const best = (() => { const arr = zRates.map((g, i) => ({ i, r: g.n ? g.k / g.n : 0 })); return arr.sort((a, b) => b.r - a.r)[0].i; })();

    let html = `<div class="dv-case"><h5>${esc(tpl.title)}</h5>
      <p><b>The brief:</b> <b>${pct(ok / n)}</b> of ${esc(last)}'s ${esc(tpl.unit)} ${esc(tpl.vp)} (${ok} of ${n}). The league as a whole: <b>${pct(tpl.league)}</b>. Find out why, and decide what to do.</p>`;
    const done = st.step >= STEPS.length;
    // the finished steps, in order, with what each showed
    const showResult = (id) => {
      if (id === 'rate') {
        const below = w.hi < tpl.league, above = w.lo > tpl.league;
        return `<p>His rate is <b>${pct(ok / n)}</b>, and from ${n} attempts the true figure plausibly lies between <b>${pct(w.lo)}</b> and <b>${pct(w.hi)}</b>. ${below ? `The league's ${pct(tpl.league)} sits above that range, so he really is below the league: this is not just a bad run.` : above ? 'He is actually above the league: not a problem.' : `The league's ${pct(tpl.league)} sits inside that range, so with this much data he could be an average player on a poor run.`}</p>` +
          info('What a confidence interval is', 'It is the range of true success rates that would plausibly produce what you saw. If the league average falls outside it, the gap is bigger than luck usually gives; if it falls inside, you cannot tell the two apart yet.');
      }
      if (id === 'split') {
        const a = chi(zRates), b = chi(cRates);
        return split(zRates, { head: tpl.zone.label, names: tpl.zone.levels }) + (a ? `<p>${esc(tpl.zone.label)}: ${esc(plainP(a.p))}.</p>` : '') +
          split(cRates, { head: tpl.ctx.label, names: tpl.ctx.levels }) + (b ? `<p>${esc(tpl.ctx.label)}: ${esc(plainP(b.p))}.</p>` : '') +
          info('What a chi-square test asks', 'It compares what you saw in each group with what you would see if the groups made no difference to the success rate. A big mismatch means the groups really do differ. The sentence beside each table turns the result into "how often would luck alone do this".');
      }
      if (id === 'both') {
        if (!mdl) return '<p class="note">There is not enough data for the model yet.</p>';
        const z1 = mdl.beta[1], z2 = mdl.beta[2], cc = mdl.beta[3];
        return `<table class="data dv-model"><thead><tr><th class="l">Factor</th><th>Odds multiplier</th><th class="l">Could it be chance?</th></tr></thead><tbody>
          <tr><td class="l">${esc(tpl.zone.levels[1])} (compared with ${esc(tpl.zone.levels[0].toLowerCase())})</td><td><b>${OR(z1).toFixed(2)}</b></td><td class="l">${esc(plainP(mdl.p[1]))}</td></tr>
          <tr><td class="l">${esc(tpl.zone.levels[2])} (compared with ${esc(tpl.zone.levels[0].toLowerCase())})</td><td><b>${OR(z2).toFixed(2)}</b></td><td class="l">${esc(plainP(mdl.p[2]))}</td></tr>
          <tr><td class="l">Each step up in ${esc(tpl.ctx.label.toLowerCase())}</td><td><b>${OR(cc).toFixed(2)}</b></td><td class="l">${esc(plainP(mdl.p[3]))}</td></tr></tbody></table>` +
          info('What the multiplier means', 'The odds of success are multiplied by this number for that change, with the other factor held where it was. Above 1 helps, below 1 hurts, and 1 means no effect. This is the point of the model: each factor is judged with the other one fixed.');
      }
      if (id === 'cause') return `<p><b>You decided:</b> ${esc(st.causeText || '')}</p>`;
      return '';
    };
    for (let i = 0; i < Math.min(st.step, STEPS.length); i++) {
      const s = STEPS[i];
      html += `<div class="dv-step done"><b>✓ ${esc(s.ask(c))}</b>${showResult(s.id)}</div>`;
    }
    // the current step
    if (!done) {
      const s = STEPS[st.step];
      let opts = s.options;
      if (opts === 'dynamic') {
        if (s.id === 'cause') opts = [{ id: 'location', label: `${tpl.zone.label}: his habit of choosing the poorer ones` }, { id: 'execution', label: `${tpl.tech}: it is poor from everywhere` }, { id: 'context', label: `${tpl.ctx.label}: what is around him` }, { id: 'chance', label: 'Nothing: it is just chance' }];
        else opts = KINDS.map((k) => ({ id: k, label: tpl.act[k] }));
        // a stable shuffle so the right answer is not always first
        opts = opts.slice().sort((a, b) => hsh(st.created + a.id) - hsh(st.created + b.id));
      }
      html += `<div class="dv-step now"><b>${esc(s.ask(c))}</b><div class="dv-opts">${opts.map((o) => `<button type="button" class="dv-opt" data-copt="${esc(o.id)}">${esc(o.label)}</button>`).join('')}</div>${st.msg ? `<p class="dv-wrong">${esc(st.msg)}</p>` : ''}</div>`;
    } else {
      // the decision and what has happened since
      const proj = FM.caseProjection(st), ch = st.choice;
      const gain = (k) => proj[k] - proj.now;
      const bestKind = KINDS.slice().sort((a, b) => gain(b) - gain(a))[0];
      html += `<div class="dv-step done"><b>✓ You chose:</b> <p>${esc(tpl.act[ch])}</p>
        <p>${ch === bestKind ? 'That is the right fix for this problem. ' : (gain(ch) > 0.02 ? 'That helps, but it is not the biggest thing you could have done. ' : 'That is unlikely to make much difference to the cause of this problem. ')}${esc(tpl.exp[st.kind])}</p>
        <table class="data dv-split"><thead><tr><th class="l">If you had chosen</th><th>Expected ${esc(tpl.unit)} success</th></tr></thead><tbody><tr><td class="l"><i>Now</i></td><td>${pct(proj.now)}</td></tr>${KINDS.map((k) => `<tr><td class="l">${esc(tpl.act[k])}${k === ch ? ' (your choice)' : ''}</td><td>${pct(proj[k])}</td></tr>`).join('')}</tbody></table></div>`;
      if (after.length) {
        const k2 = after.filter((r) => r.ok).length, n2 = after.length, t = FM.devTwoProp ? FM.devTwoProp({ n: n, k: ok, rate: ok / n }, { n: n2, k: k2, rate: k2 / n2 }) : null;
        html += `<div class="dv-step done"><b>Since you acted:</b><p>Before: ${pct(ok / n)} (${ok} of ${n}). Since: <b>${pct(k2 / n2)}</b> (${k2} of ${n2}).${t ? ' ' + esc(cap(plainP(t.p))) + '.' : ''}</p></div>`;
      } else html += '<p class="note">Play the next round: the feedback below will report how it went.</p>';
    }
    host.innerHTML = html + '</div>';
    host.querySelectorAll('[data-copt]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.copt, s = STEPS[st.step];
      if (!s) return;
      if (s.id === 'cause') {
        const truth = st.kind;
        if (id === truth) {
          st.causeText = { location: 'it is where he does it: the poorer positions are the problem, not the delivery.', execution: 'it is the delivery itself: he is below the league from every position.', context: 'it is what is around him, not his own delivery or his choices.' }[truth];
          st.msg = ''; st.step++; save(); redraw();
        } else {
          st.wrong++; st.msg = id === 'chance' ? 'Not that: the first test showed the gap is bigger than luck, and the model found a clear effect. Look at the odds multipliers again.' : 'Check the model again: with both factors in, which one still moves his success rate, and which did only because it overlapped with the other?';
          save(); redraw();
        }
        return;
      }
      if (s.id === 'act') {
        st.choice = id; st.step++; st.msg = '';
        const proj = FM.caseProjection(st), bestKind = KINDS.slice().sort((a, b) => (proj[b] - proj.now) - (proj[a] - proj.now))[0];
        const score = Math.max(30, 100 - 15 * st.wrong);
        st.score = score; st.appliedRound = league.fixtures.filter((f) => f.played && (f.homeId === league.userId || f.awayId === league.userId)).length;
        const d = FM.develop(league);
        if (id === 'execution') {
          // training the delivery: the lesson runs, and what he took in follows how well the problem was analysed
          d.plans[p.id] = { lesson: tpl.lesson, active: true, startRound: st.appliedRound, startAbility: FM.abilityOf(p), rounds: 0, gain: 0, understanding: score, attempts: 1, last: { text: '(case study)', reply: '', tip: '', understanding: score } };
          if (!d.hist[p.id]) d.hist[p.id] = [[st.appliedRound - 1, FM.abilityOf(p)]];
        }
        d.feed.push({ id: 'D' + (d.seq++), round: st.appliedRound - 1, pid: p.id, name: p.name, kind: id === bestKind ? 'good' : 'ok', title: 'Decision made: ' + last,
          text: 'You have decided: ' + tpl.act[id].charAt(0).toLowerCase() + tpl.act[id].slice(1) + '. ' + (id === bestKind ? 'It is the right answer to what the data showed.' : 'It addresses part of the problem, but not the main cause.'),
          advice: 'The next matches will show whether his ' + tpl.unit + ' improve. Read the feedback after each round.' });
        save(); redraw(); if (hooks && hooks.redraw) hooks.redraw();
        return;
      }
      const opt = s.options.find((o) => o.id === id);
      if (opt && opt.ok) { st.msg = ''; st.step++; save(); redraw(); }
      else { st.wrong++; st.msg = opt ? opt.why : 'Try another tool.'; save(); redraw(); }
    }));
  };

  // After each round: his decision shows up in new attempts, drawn under the fix he was given, and the feedback compares them with before.
  FM.caseAfterRound = function (league, round) {
    const d = FM.develop(league); if (!d.cases) return;
    const me = FM.teamById(league, league.userId);
    Object.keys(d.cases).forEach((pid) => {
      const st = d.cases[pid];
      if (!st || st.choice == null) return;
      const p = me.squad.find((q) => q.id === pid); if (!p) return;
      const tpl = T[st.key], rng = FM.mulberry32(hsh(pid + ':r' + round) + (league.seed || 0));
      let par = TRUTH[st.kind];
      par = withFix(par, st.choice);
      const n = 6 + Math.floor(rng() * 6);
      draw(rng, tpl, par, st.L0, n).forEach((r) => st.rows.push([r.z, r.c, r.ok, round]));
      const rows = rowsOf(st), before = rows.filter((r) => r.round < 0), after = rows.filter((r) => r.round >= 0);
      if (!after.length) return;
      const k1 = before.filter((r) => r.ok).length, k2 = after.filter((r) => r.ok).length;
      const r1 = k1 / before.length, r2 = k2 / after.length, last = p.name.split(' ').slice(-1)[0];
      const t = FM.devTwoProp ? FM.devTwoProp({ n: before.length, k: k1, rate: r1 }, { n: after.length, k: k2, rate: r2 }) : null;
      const diff = r2 - r1;
      let kind, title, text, advice;
      if (diff >= 0.08 && t && t.p < 0.05) {
        kind = 'good'; title = last + ': your analysis paid off';
        text = 'It worked. ' + p.name + "'s " + tpl.unit + ' have gone from ' + pct(r1) + ' to ' + pct(r2) + ' (' + k2 + ' of ' + after.length + ' since). ' + cap(plainP(t.p)) + '. You found the real cause and fixed it.';
        advice = 'Keep it in place and check it holds against stronger sides. Then look at another player: every one of them has a case waiting.';
      } else if (diff >= 0.03) {
        kind = 'ok'; title = last + ' is moving the right way';
        text = p.name + "'s " + tpl.unit + ' are at ' + pct(r2) + ' since the change, up from ' + pct(r1) + '. That is encouraging, but ' + plainP(t ? t.p : 0.5) + '.';
        advice = 'Give it more matches before you call it a success: a small gain from a few matches can be luck.';
      } else if (diff <= -0.06 && t && t.p < 0.1) {
        kind = 'bad'; title = last + ' has got worse';
        text = 'Not what you wanted: ' + p.name + "'s " + tpl.unit + ' have dropped from ' + pct(r1) + ' to ' + pct(r2) + '.';
        advice = 'Go back over the analysis. Check which factor the model said mattered once the others were held fixed, and whether the fix you chose addressed that one.';
      } else {
        kind = 'info'; title = 'No clear change yet for ' + last;
        text = p.name + "'s " + tpl.unit + ' are at ' + pct(r2) + ' since the change, against ' + pct(r1) + ' before: ' + plainP(t ? t.p : 0.6) + '.';
        advice = st.choice === st.kind ? 'The fix is the right one, so give it time.' : 'The fix you chose addresses something that was not the main cause here. The case data pointed somewhere else.';
      }
      d.feed.push({ id: 'D' + (d.seq++), round, pid, name: p.name, kind, title, text, advice });
    });
  };
})();
