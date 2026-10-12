// Player development. Every player has an ability (out of 100, what he is worth to a team now) and a potential (out of 100, the most he can reach).
// A manager develops a player by finding a weakness in what the matches recorded about his decisions (passes into crowded areas, dribbles against
// a close defender, tackles, shots), teaching him a better decision, and then checking in later matches whether it worked. Teaching changes his
// real ratings, which is what the match engine plays with, so improvement shows up in how he plays. The statistics are met when they are needed to
// answer the football question in front of the manager: how often, compared with what, under which conditions, and was the change more than luck.
(function () {
  const FM = (window.FM = window.FM || {});
  const S = FM.STAT;
  const r1 = (v) => Math.round(v * 10) / 10;
  const pct = (v) => Math.round(v * 100) + '%';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hsh = (s) => FM.hashString(String(s));
  const ATTRS = ['pace', 'dribbling', 'passing', 'finishing', 'tackling', 'heading', 'composure', 'stamina'];

  // ---------- ability and potential ----------
  FM.abilityOf = (p) => Math.round(FM.playerRating(p, p.natural) * 10);
  FM.potentialOf = function (p) {
    if (p.pot == null) {
      const a = FM.abilityOf(p), age = FM.ageOf ? FM.ageOf(p) : 25, h = hsh(p.id + ':pot');
      const room = age <= 20 ? 8 + (h % 12) : age <= 23 ? 4 + (h % 9) : age <= 26 ? 1 + (h % 6) : age <= 29 ? (h % 3) : 0;
      p.pot = Math.min(99, a + Math.min(room, Math.round((99 - a) * 0.85) + 1));
    }
    return Math.max(p.pot, FM.abilityOf(p));
  };
  const ageFactor = (age) => (age <= 20 ? 1.5 : age <= 23 ? 1.2 : age <= 26 ? 0.8 : age <= 29 ? 0.4 : 0.15);
  const learnSpeed = (p) => 0.75 + (hsh(p.id + ':learn') % 51) / 100;   // 0.75 to 1.25
  FM.learningWord = (p) => { const l = learnSpeed(p); return l >= 1.12 ? 'Learns quickly' : l <= 0.88 ? 'Learns slowly' : 'Learns steadily'; };
  FM.potentialWord = (p) => { const room = FM.potentialOf(p) - FM.abilityOf(p); return room >= 12 ? 'Very high potential' : room >= 7 ? 'High potential' : room >= 3 ? 'Some room to grow' : 'Close to his peak'; };

  // ---------- state ----------
  FM.develop = function (league) {
    if (!league.develop) league.develop = { v: 1, plans: {}, feed: [], hist: {}, seq: 1, last: -1 };
    return league.develop;
  };

  // ---------- the lessons: a better decision to teach, and the ratings it works on ----------
  FM.LESSONS = {
    pass: { id: 'pass', area: 'Passing decisions', title: 'Choose the safer pass when the lane is blocked or the receiver is marked', attrs: ['passing', 'composure'],
      metric: 'pass', unit: 'passes completed', teach: 'He practises reading the receiver and the lane before he plays the ball, and picks the pass that is likely to arrive.' },
    dribble: { id: 'dribble', area: 'Dribbling decisions', title: 'Only take a player on when the defender is far enough away', attrs: ['dribbling', 'composure'],
      metric: 'dribble', unit: 'dribbles won', teach: 'He practises spotting how close the defender is and waits for space before he takes him on.' },
    tackle: { id: 'tackle', area: 'Defending and pressing', title: 'Hold the position and pick the moment to challenge', attrs: ['tackling', 'composure'],
      metric: 'tackle', unit: 'tackles won', teach: 'He practises staying goal-side and committing only when the challenge is likely to win the ball.' },
    shoot: { id: 'shoot', area: 'Shooting decisions', title: 'Shoot when there is space, and pass when there is not', attrs: ['finishing', 'composure'],
      metric: 'shot', unit: 'shots scored', teach: 'He practises choosing the moment to shoot, and the pass when a team-mate is better placed.' },
    fitness: { id: 'fitness', area: 'Work rate', title: 'Pace the effort: manage energy across the whole match', attrs: ['stamina', 'pace'],
      metric: null, unit: '', teach: 'He practises running at the right intensity so he still has energy in the closing minutes.' },
    keeper: { id: 'keeper', area: 'Goalkeeping decisions', title: 'Set the feet early and command the box', attrs: ['gk', 'composure'],
      metric: null, unit: '', teach: 'He practises positioning before the shot and calling for crosses.' },
  };
  const LESSON_BY_ATTR = { passing: 'pass', dribbling: 'dribble', tackling: 'tackle', finishing: 'shoot', stamina: 'fitness', pace: 'fitness', composure: 'pass', heading: 'tackle', gk: 'keeper' };
  const lessonsFor = (p) => (p.natural === 'GK' ? ['keeper', 'pass'] : ['pass', 'dribble', 'tackle', 'shoot', 'fitness']);

  // ---------- what the matches recorded about a player's decisions ----------
  const COND = {
    pass: { label: ['marked receiver', 'free receiver'], test: (e) => e.press < 4 },
    dribble: { label: ['defender close', 'defender far'], test: (e) => e.def < 3 },
    shot: { label: ['defender close', 'space'], test: (e) => e.def < 3 },
    tackle: { label: ['', ''], test: null },
  };
  function fixturesWithLogs(league) {
    return league.fixtures.concat(league.friendlies || []).filter((f) => f.log && f.played).sort((a, b) => a.round - b.round);
  }
  // Every logged decision by one player (or by everyone, if p is null), tagged with the round it happened in.
  FM.devEvents = function (league, p) {
    const out = { pass: [], dribble: [], tackle: [], shot: [] };
    fixturesWithLogs(league).forEach((f) => {
      const L = f.log, round = f.round;
      L.teams.forEach((tid, side) => {
        const team = FM.teamById(league, tid);
        if (p && (tid !== (FM.clubOf ? (FM.clubOf(league, p) || {}).id : null))) return;
        const mine = (num) => !p || num === p.number;
        void team;
        (L.passes || []).forEach((q) => { if (q[1] === side && q[4] !== 2 && mine(q[2])) out.pass.push({ round, ok: q[4] === 1, lane: q[8], press: q[9], dist: q[7], who: q[2], tid }); });
        (L.dribbles || []).forEach((q) => { if (q[1] === side && mine(q[2])) out.dribble.push({ round, ok: q[3] === 1, def: q[6], who: q[2], tid }); });
        (L.tackles || []).forEach((q) => { if (q[1] === side && mine(q[2])) out.tackle.push({ round, ok: q[4] === 1, who: q[2], tid }); });
        (L.other || []).forEach((q) => { if (q.type === 'shot' && q.team === tid && mine(q.player)) out.shot.push({ round, ok: q.outcome === 'goal', def: q.defDist, xg: q.xg, who: q.player, tid }); });
      });
    });
    return out;
  };
  let baseMemo = null;
  FM.devBaseline = function (league) {
    const key = fixturesWithLogs(league).length;
    if (baseMemo && baseMemo.key === key) return baseMemo.val;
    const ev = FM.devEvents(league, null), val = {};
    Object.keys(ev).forEach((k) => { const a = ev[k]; val[k] = { n: a.length, rate: a.length ? a.filter((e) => e.ok).length / a.length : NaN }; });
    baseMemo = { key, val };
    return val;
  };
  const rateOf = (list) => ({ n: list.length, k: list.filter((e) => e.ok).length, rate: list.length ? list.filter((e) => e.ok).length / list.length : NaN });
  const MIN_N = { pass: 12, dribble: 5, tackle: 5, shot: 4 };
  // The measures for one lesson: overall, against the league, by condition, and before and after a plan began.
  FM.devMeasure = function (league, p, lessonId, sinceRound) {
    const L = FM.LESSONS[lessonId]; if (!L || !L.metric) return null;
    const ev = FM.devEvents(league, p)[L.metric], base = FM.devBaseline(league)[L.metric];
    const all = rateOf(ev), c = COND[L.metric], split = c && c.test ? [rateOf(ev.filter(c.test)), rateOf(ev.filter((e) => !c.test(e)))] : null;
    const out = { lesson: L, metric: L.metric, n: all.n, k: all.k, rate: all.rate, base: base ? base.rate : NaN, split, labels: c ? c.label : null, min: MIN_N[L.metric] };
    if (all.n) { const w = S.wilson(all.k, all.n, 0.95); out.lo = w.lo; out.hi = w.hi; }
    if (sinceRound != null) { out.pre = rateOf(ev.filter((e) => e.round < sinceRound)); out.post = rateOf(ev.filter((e) => e.round >= sinceRound)); }
    // is the split by condition more than chance?
    if (split && split[0].n >= 3 && split[1].n >= 3) { const t = S.chi2Indep([[split[0].k, split[0].n - split[0].k], [split[1].k, split[1].n - split[1].k]]); out.splitP = t.p; }
    return out;
  };
  // two proportions compared (before and after), with a simple z test
  function twoProp(a, b) {
    if (!a.n || !b.n) return null;
    const p = (a.k + b.k) / (a.n + b.n), se = Math.sqrt(p * (1 - p) * (1 / a.n + 1 / b.n));
    if (!se) return { z: 0, p: 1 };
    const z = (b.rate - a.rate) / se;
    return { z, p: 2 * (1 - S.normCdf(Math.abs(z))) };
  }
  FM.devTwoProp = twoProp;

  // ---------- the assistant manager's view of one player ----------
  FM.devDiagnose = function (league, p) {
    const lessons = lessonsFor(p);
    const found = [];
    lessons.forEach((id) => {
      const m = FM.devMeasure(league, p, id);
      if (!m || m.n < m.min || isNaN(m.base)) return;
      const gap = m.base - m.rate, condGap = m.split && m.split[0].n >= 3 && m.split[1].n >= 3 ? m.split[1].rate - m.split[0].rate : 0;
      found.push({ id, m, score: (Math.max(0, gap) * 2 + Math.max(0, condGap)) * Math.sqrt(m.n) });
    });
    found.sort((a, b) => b.score - a.score);
    if (found.length && found[0].score > 0.35) return { kind: 'evidence', lesson: found[0].id, m: found[0].m };
    // not enough recorded decisions: fall back to the weakest rating against the league's players in his position
    let weak = null;
    const pool = [].concat.apply([], league.teams.map((t) => t.squad)).filter((q) => q.natural === p.natural && q !== p);
    ATTRS.concat(p.natural === 'GK' ? ['gk'] : []).forEach((a) => {
      if (p.ratings[a] == null) return;
      const v = pool.map((q) => q.ratings[a]).filter((x) => x != null);
      if (v.length < 5) return;
      const mean = S.mean(v), sd = S.sd(v) || 1, z = (p.ratings[a] - mean) / sd;
      if (!weak || z < weak.z) weak = { attr: a, z, mean };
    });
    if (weak) return { kind: 'attribute', lesson: LESSON_BY_ATTR[weak.attr] || 'pass', attr: weak.attr, z: weak.z };
    return { kind: 'none', lesson: lessons[0] };
  };

  // ---------- growth, after every round ----------
  function applyGrowth(p, attrs, amountEach, passiveEach) {
    const before = {};
    ATTRS.concat(['gk']).forEach((k) => { if (p.ratings[k] != null) before[k] = p.ratings[k]; });
    const pot = FM.potentialOf(p);
    const targets = attrs.filter((a) => before[a] != null);
    ATTRS.forEach((a) => { if (before[a] == null) return; const inc = targets.indexOf(a) >= 0 ? amountEach : passiveEach; p.ratings[a] = Math.min(95, p.ratings[a] + inc); });
    if (p.natural === 'GK' && before.gk != null) p.ratings.gk = Math.min(92, p.ratings.gk + (targets.indexOf('gk') >= 0 ? amountEach : passiveEach));
    // never past his potential: back off until he is within it
    let guard = 0;
    while (FM.abilityOf(p) > pot && guard++ < 6) {
      Object.keys(before).forEach((k) => { p.ratings[k] = before[k] + (p.ratings[k] - before[k]) * 0.5; });
    }
    if (p.baseRatings) Object.keys(before).forEach((k) => { p.baseRatings[k] = (p.baseRatings[k] != null ? p.baseRatings[k] : before[k]) + (p.ratings[k] - before[k]); });
    if (p.ratings.pace != null) p.maxSpeed = FM.speedFromPace(p.ratings.pace);
    return FM.abilityOf(p);
  }
  const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
  function feed(league, item) {
    const d = FM.develop(league);
    item.id = 'D' + (d.seq++);
    d.feed.push(item);
    if (d.feed.length > 80) d.feed.splice(0, d.feed.length - 80);
  }

  FM.developAfterRound = function (league, round) {
    const d = FM.develop(league), me = FM.teamById(league, league.userId);
    const rng = FM.mulberry32(league.seed + (league.runSeed || 0) + round * 1013 + 71);
    league.teams.forEach((team) => {
      team.squad.forEach((p) => {
        const age = FM.ageOf(p), af = ageFactor(age), ls = learnSpeed(p);
        const before = FM.abilityOf(p);
        const plan = team === me ? d.plans[p.id] : null;
        const focus = plan && plan.active ? FM.LESSONS[plan.lesson].attrs : [];
        const passive = 0.22 * af * ls * (0.6 + rng() * 0.8);
        const focused = plan && plan.active ? 1.0 * af * ls * (0.7 + rng() * 0.6) : 0;
        const after = applyGrowth(p, focus, focused, passive);
        if (team === me) {
          const h = (d.hist[p.id] = d.hist[p.id] || [[Math.max(-1, round - 1), before]]);
          h.push([round, after]);
          if (plan && plan.active) { plan.rounds = (plan.rounds || 0) + 1; plan.gain = (plan.gain || 0) + (after - before); }
        }
      });
    });
    // feedback for the managed club's players
    me.squad.forEach((p) => {
      const plan = d.plans[p.id];
      if (!plan || !plan.active) return;
      const L = FM.LESSONS[plan.lesson], name = p.name, first = name.split(' ').slice(-1)[0] || name;
      const m = L.metric ? FM.devMeasure(league, p, plan.lesson, plan.startRound) : null;
      const a = FM.abilityOf(p), pot = FM.potentialOf(p), since = (d.hist[p.id] || [])[0];
      const startAbility = plan.startAbility != null ? plan.startAbility : (since ? since[1] : a);
      if (m && m.post && m.post.n >= Math.ceil(m.min / 2) && m.pre && m.pre.n >= Math.ceil(m.min / 2)) {
        const t = twoProp(m.pre, m.post), diff = m.post.rate - m.pre.rate;
        const nums = pct(m.pre.rate) + ' before, ' + pct(m.post.rate) + ' since (' + m.post.k + ' of ' + m.post.n + ' ' + L.unit + ')';
        let kind, title, text, advice;
        if (diff >= 0.1 && t && t.p < 0.05) {
          kind = 'good'; title = first + ' is getting it';
          text = pick(rng, [
            'This is what the work was for. ' + name + ' has gone from ' + nums + '. That is more than luck would usually give you.',
            'Brilliant. ' + name + ' is making clearly better decisions: ' + nums + '. The lesson is landing.',
            'You can see it in the numbers and on the pitch: ' + name + ' went from ' + nums + '. A real piece of coaching.',
          ]);
          advice = 'Keep the lesson going until his potential is reached, then move on to the next weakness. Check that the improvement holds against stronger teams.';
        } else if (diff >= 0.05) {
          kind = 'ok'; title = 'Early signs for ' + first;
          text = name + ' is heading the right way: ' + nums + '. It is promising, but with this few matches it could still be chance.';
          advice = 'Give it two or three more matches before you decide. A change this small needs more evidence.';
        } else if (diff <= -0.1 && t && t.p < 0.1) {
          kind = 'bad'; title = first + ' has gone backwards';
          text = pick(rng, [
            'Frustrating. ' + name + ' is doing worse since the lesson began: ' + nums + '.',
            'Not the news you wanted: ' + name + ' has dropped to ' + pct(m.post.rate) + ' from ' + pct(m.pre.rate) + '.',
          ]);
          advice = 'Look at who he has faced and how tired he was: a harder opponent or a heavy schedule can pull a number down. If it carries on, try a different lesson.';
        } else {
          kind = 'info'; title = 'No clear change yet for ' + first;
          text = name + ' is at ' + nums + '. That is roughly where he started, and the gap is well within what luck produces from match to match.';
          advice = 'Do not judge it yet. Compare the same conditions, and give the training more matches.';
        }
        feed(league, { round, pid: p.id, name, kind, title, text, advice });
      } else {
        feed(league, { round, pid: p.id, name, kind: 'info', title: first + ' is training',
          text: pick(rng, [name + ' put the week in on "' + L.title.toLowerCase() + '".', name + ' worked hard on his ' + L.area.toLowerCase() + ' this week.']) +
            (m ? ' There are only ' + (m.post ? m.post.n : 0) + ' decisions recorded since the lesson began, so it is too early to say whether it is working.' : ''),
          advice: m ? 'Keep playing him: the evidence arrives with matches.' : 'This work shows up in his ratings rather than in one statistic.' });
      }
      if (a >= startAbility + 2) {
        feed(league, { round, pid: p.id, name, kind: 'good', title: first + ' has grown',
          text: name + ' has grown from ' + startAbility + ' to ' + a + ' since you started working with him. ' + (pot - a <= 1 ? 'He has reached his potential: he is as good as he is going to get.' : 'His potential is ' + pot + ', so there is ' + (pot - a) + ' more to come.'),
          advice: pot - a <= 1 ? 'He is at his peak. Make sure he is in the team that can use him best.' : 'Keep him in the team: development comes from playing as well as training.' });
        plan.startAbility = a;
      }
      if (pot - a <= 0 && plan.active) {
        plan.active = false; plan.done = round;
        feed(league, { round, pid: p.id, name, kind: 'ok', title: first + ' has reached his ceiling',
          text: name + ' is as good as he is going to get: his ability is ' + a + ' and so is his potential. More training will not raise his ratings.',
          advice: 'Use him where he is strongest, and look to the younger players for growth.' });
      }
      if (plan.rounds >= 8 && plan.active) { plan.active = false; plan.done = round; feed(league, { round, pid: p.id, name, kind: 'info', title: first + ': training block finished', text: name + ' has completed eight weeks on "' + L.title.toLowerCase() + '".', advice: 'Choose his next lesson from the assistant\'s view.' }); }
    });
    d.last = round;
  };

  // ---------- the screen ----------
  const dv = { sel: null, sort: 'gap' };
  let hooks = {};
  FM.renderDevelop = function (host, league, h) {
    hooks = h || hooks;
    const d = FM.develop(league), me = FM.teamById(league, league.userId);
    const save = () => { if (hooks.save) hooks.save(); };
    const draw = () => FM.renderDevelop(host, league, hooks);
    const players = me.squad.slice();
    const gap = (p) => FM.potentialOf(p) - FM.abilityOf(p);
    const sorters = { gap: (a, b) => gap(b) - gap(a), ability: (a, b) => FM.abilityOf(b) - FM.abilityOf(a), age: (a, b) => FM.ageOf(a) - FM.ageOf(b), name: (a, b) => a.name.localeCompare(b.name) };
    players.sort(sorters[dv.sort] || sorters.gap);
    if (!dv.sel || !players.find((p) => p.id === dv.sel)) dv.sel = players[0] && players[0].id;
    const sel = players.find((p) => p.id === dv.sel);
    const marks = FM.squadMarks ? FM.squadMarks(players) : {};
    const row = (p) => {
      const plan = d.plans[p.id], a = FM.abilityOf(p), pot = FM.potentialOf(p), h0 = d.hist[p.id];
      const grown = h0 && h0.length ? a - h0[0][1] : 0;
      return `<tr class="player-row${p.id === dv.sel ? ' sel' : ''}" data-dev="${esc(p.id)}" tabindex="0"><td class="l"><b>${esc(p.name)}</b></td><td class="l">${p.natural}</td><td>${FM.ageOf(p)}</td>
        <td><b>${a}</b></td><td>${pot}</td><td><span class="dv-bar" title="${a} of a possible ${pot}"><i style="width:${Math.min(100, Math.round(100 * a / Math.max(1, pot)))}%"></i></span></td>
        <td>${grown > 0 ? '+' + grown : grown || '–'}</td><td class="l">${plan && plan.active ? '<span class="rc-chip st-wage_talks">Training</span>' : ''}</td></tr>`;
    };
    // ----- the selected player
    let detail = '<div class="card"><p class="note">Pick a player from the list.</p></div>';
    if (sel) {
      const plan = d.plans[sel.id], a = FM.abilityOf(sel), pot = FM.potentialOf(sel), age = FM.ageOf(sel);
      const diag = FM.devDiagnose(league, sel);
      const L = FM.LESSONS[diag.lesson];
      const hist = d.hist[sel.id] || [];
      let view = '';
      if (diag.kind === 'evidence') {
        const m = diag.m;
        const sp = m.split, last = sel.name.split(' ').slice(-1)[0], what = L.unit.split(' ')[0];
        const hard = sp && sp[0].n >= 3 && sp[1].n >= 3 && sp[1].rate - sp[0].rate >= 0.15;
        if (m.rate >= m.base && hard) view += `<p><b>Assistant manager:</b> “${esc(last)}'s ${esc(what)} look fine overall (${pct(m.rate)}, against ${pct(m.base)} for the league), but when the situation is tight (${esc(m.labels[0])}) he gets only ${pct(sp[0].rate)} of them right, against ${pct(sp[1].rate)} otherwise. That is where we lose the ball.”</p>`;
        else if (m.rate < m.base) view += `<p><b>Assistant manager:</b> “${esc(last)}'s ${esc(L.area.toLowerCase())} are costing us. He gets ${pct(m.rate)} of his ${esc(what)} right (${m.k} of ${m.n}), where the league as a whole manages ${pct(m.base)}.”${hard ? ` It is much worse when ${esc(m.labels[0])}: ${pct(sp[0].rate)} against ${pct(sp[1].rate)}.` : ''}</p>`;
        else view += `<p><b>Assistant manager:</b> “${esc(last)} is doing fine on his ${esc(L.area.toLowerCase())}: ${pct(m.rate)} (${m.k} of ${m.n}) against ${pct(m.base)} for the league. I would look at something else, or keep building on this.”</p>`;
      } else if (diag.kind === 'attribute') {
        view += `<p><b>Assistant manager:</b> “There are not enough matches on record yet to see his decisions, but his ${esc(diag.attr === 'gk' ? 'goalkeeping' : diag.attr)} is below most players in his position. I would start there.”</p>`;
      } else view += '<p><b>Assistant manager:</b> “Play him a few matches and I will have something to tell you.”</p>';
      // investigate
      let invest = '';
      lessonsFor(sel).forEach((id) => {
        const m = FM.devMeasure(league, sel, id, plan && plan.active && plan.lesson === id ? plan.startRound : null);
        if (!m) return;
        const enough = m.n >= 1;
        invest += `<div class="dv-measure"><h4>${esc(m.lesson.area)}</h4>`;
        if (!enough) invest += '<p class="note">Nothing recorded yet. Matches you play are logged for this.</p>';
        else {
          invest += `<p><b>${m.k} of ${m.n}</b> ${esc(m.lesson.unit)} (<b>${pct(m.rate)}</b>${m.lo != null ? `, somewhere between ${pct(m.lo)} and ${pct(m.hi)} with 95% confidence` : ''}). The league as a whole: ${pct(m.base)}.</p>`;
          if (m.n < m.min) invest += `<p class="note">That is only ${m.n} decisions. With so few, a good or bad run can swing the percentage a long way, so do not read too much into it.</p>`;
          if (m.split && m.split[0].n >= 1 && m.split[1].n >= 1) {
            invest += `<table class="data dv-split"><thead><tr><th class="l">When</th><th>Decisions</th><th>Success</th></tr></thead><tbody>${m.split.map((s, i) => `<tr><td class="l">${esc(m.labels[i])}</td><td>${s.n}</td><td>${s.n ? pct(s.rate) : '–'}</td></tr>`).join('')}</tbody></table>`;
            if (m.splitP != null && !isNaN(m.splitP)) invest += `<p class="note">${m.splitP < 0.05 ? 'The difference between those two situations is too big to be chance (p = ' + (m.splitP < 0.001 ? '< 0.001' : m.splitP.toFixed(3)) + '): the situation is driving it, not just the player.' : 'The two situations are not clearly different yet (p = ' + m.splitP.toFixed(2) + '). More matches will tell you.'}</p>`;
          }
          if (m.post && m.pre && m.post.n && m.pre.n) {
            const t = twoProp(m.pre, m.post);
            invest += `<p><b>Before the lesson:</b> ${pct(m.pre.rate)} (${m.pre.k} of ${m.pre.n}). <b>Since:</b> ${pct(m.post.rate)} (${m.post.k} of ${m.post.n}).${t ? (t.p < 0.05 ? ' The change is bigger than luck usually gives (p = ' + t.p.toFixed(3) + ').' : ' That change could still be luck (p = ' + t.p.toFixed(2) + ').') : ''}</p>`;
          }
        }
        invest += '</div>';
      });
      // train
      const lessons = lessonsFor(sel);
      const cur = plan && plan.active ? plan.lesson : diag.lesson;
      const train = `<div class="dv-train">${lessons.map((id) => { const x = FM.LESSONS[id]; return `<label class="dv-lesson${cur === id ? ' on' : ''}"><input type="radio" name="dvLesson" value="${id}"${cur === id ? ' checked' : ''}><span><b>${esc(x.area)}</b><br>${esc(x.title)}<small>Works on ${x.attrs.map((q) => (q === 'gk' ? 'goalkeeping' : q)).join(' and ')}.</small></span></label>`; }).join('')}
        <div class="row">${plan && plan.active ? '<button type="button" id="dvStop">Stop this training</button>' : ''}<button type="button" id="dvStart" class="primary">${plan && plan.active ? 'Switch to this lesson' : 'Start training'}</button></div></div>`;
      // progress
      let spark = '';
      if (hist.length >= 2) {
        const vals = hist.map((x) => x[1]), lo = Math.min.apply(null, vals) - 1, hi = Math.max(Math.max.apply(null, vals), pot) + 1, w = 280, hgt = 70;
        const pts = vals.map((v, i) => [Math.round(10 + (w - 20) * i / (vals.length - 1)), Math.round(hgt - 8 - (hgt - 16) * (v - lo) / Math.max(1, hi - lo))]);
        const py = Math.round(hgt - 8 - (hgt - 16) * (pot - lo) / Math.max(1, hi - lo));
        spark = `<svg viewBox="0 0 ${w} ${hgt}" class="dv-spark" role="img" aria-label="Ability over the season"><line x1="10" x2="${w - 10}" y1="${py}" y2="${py}" stroke="currentColor" stroke-dasharray="4 4" opacity=".5"/><text x="${w - 10}" y="${py - 3}" text-anchor="end" font-size="9" fill="currentColor" opacity=".8">potential ${pot}</text><polyline fill="none" stroke="currentColor" stroke-width="2.5" points="${pts.map((q) => q.join(',')).join(' ')}"/>${pts.map((q) => `<circle cx="${q[0]}" cy="${q[1]}" r="3" fill="currentColor"/>`).join('')}</svg>`;
      }
      detail = `<div class="card dv-player"><span class="eyebrow">${FM.POS_NAME ? FM.POS_NAME[sel.natural] : sel.natural} · age ${age}</span><h3>${esc(sel.name)}</h3>
          <div class="dv-nums"><span>Ability <b>${a}</b></span><span>Potential <b>${pot}</b></span><span>${esc(FM.potentialWord(sel))}</span><span>${esc(FM.learningWord(sel))}</span></div>
          <span class="dv-bar big"><i style="width:${Math.min(100, Math.round(100 * a / Math.max(1, pot)))}%"></i></span>
          ${spark}
          <h4>1. The problem</h4>${view}
          <h4>2. Investigate</h4>${invest || '<p class="note">No decisions to look at for this position yet.</p>'}
          <h4>3. Teach</h4>${pot - a <= 0 ? '<p class="note">He has reached his potential, so more training will not raise his ratings. Younger players have room to grow.</p>' : ''}${plan && plan.active ? `<p class="note">In training for ${plan.rounds || 0} week${plan.rounds === 1 ? '' : 's'}: “${esc(FM.LESSONS[plan.lesson].title)}”. ${esc(FM.LESSONS[plan.lesson].teach)}</p>` : '<p class="note">Choose the decision you want him to get better at. His ratings grow week by week, and he gets there faster the younger he is and the more he plays.</p>'}${train}</div>`;
    }
    // ----- feedback
    const items = d.feed.slice().reverse().slice(0, 30);
    const feedback = `<div class="card dv-feed"><h3>Feedback</h3>${items.length ? items.map((f) => `<article class="dv-fb ${f.kind}"><div class="dv-fb-head"><b>${esc(f.title)}</b><small>${f.round >= 0 ? 'After round ' + (f.round + 1) : 'Pre-season'}</small></div><p>${esc(f.text)}</p>${f.advice ? `<p class="dv-advice"><b>What next:</b> ${esc(f.advice)}</p>` : ''}</article>`).join('') : '<p class="note">After each round you play, this is where you find out whether the work is paying off, and what to do about it.</p>'}</div>`;
    host.innerHTML = `<div class="dv-wrap"><div class="card dv-list"><div class="row" style="justify-content:space-between"><h2>Development</h2>
        <label>Sort by <select id="dvSort">${[['gap', 'Room to grow'], ['ability', 'Ability'], ['age', 'Youngest'], ['name', 'Name']].map(([k, n]) => `<option value="${k}"${dv.sort === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label></div>
        <p class="note">Ability and potential are out of 100. Develop a player by finding a weakness in his recorded decisions, teaching him a better one, and checking in later matches that it worked.</p>
        <div class="tablewrap"><table class="data"><thead><tr><th class="l">Player</th><th class="l">Pos</th><th>Age</th><th>Ability</th><th>Potential</th><th class="l">Growth</th><th>This season</th><th class="l"></th></tr></thead><tbody>${players.map(row).join('')}</tbody></table></div></div>
        <div class="dv-side">${detail}</div></div>${feedback}`;
    void marks;
    const srt = host.querySelector('#dvSort'); if (srt) srt.addEventListener('change', () => { dv.sort = srt.value; draw(); });
    host.querySelectorAll('[data-dev]').forEach((r) => r.addEventListener('click', () => { dv.sel = r.dataset.dev; draw(); }));
    const start = host.querySelector('#dvStart');
    if (start && sel) start.addEventListener('click', () => {
      const chosen = (host.querySelector('input[name="dvLesson"]:checked') || {}).value; if (!chosen) return;
      const round = league.fixtures.filter((f) => f.played && (f.homeId === league.userId || f.awayId === league.userId)).length;
      d.plans[sel.id] = { lesson: chosen, active: true, startRound: round, startAbility: FM.abilityOf(sel), rounds: 0, gain: 0 };
      if (!d.hist[sel.id]) d.hist[sel.id] = [[round - 1, FM.abilityOf(sel)]];
      feed(league, { round: round - 1, pid: sel.id, name: sel.name, kind: 'info', title: 'Training started: ' + sel.name.split(' ').slice(-1)[0],
        text: 'You have started working with ' + sel.name + ' on "' + FM.LESSONS[chosen].title.toLowerCase() + '". ' + FM.LESSONS[chosen].teach,
        advice: 'Play him in the next matches. The first real evidence comes from the decisions he makes in them.' });
      save(); draw();
    });
    const stop = host.querySelector('#dvStop');
    if (stop && sel) stop.addEventListener('click', () => { if (d.plans[sel.id]) d.plans[sel.id].active = false; save(); draw(); });
  };
})();
