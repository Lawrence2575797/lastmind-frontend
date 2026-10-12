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
  // Only this season's league matches, as they were actually played. Pre-season friendlies and last season are not evidence.
  function fixturesWithLogs(league) {
    return league.fixtures.filter((f) => f.log && f.played && !f.friendly && !f.history).sort((a, b) => a.round - b.round);
  }
  FM.devFixtures = fixturesWithLogs;
  // What the numbers rest on, for the screen: the number of this season's matches played.
  FM.devSources = function (league) { return { season: fixturesWithLogs(league).length }; };
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
        (L.tackles || []).forEach((q) => { if (q[1] === side && mine(q[2])) out.tackle.push({ round, ok: q[4] === 1, x: q[5], y: q[6], who: q[2], tid }); });
        (L.other || []).forEach((q) => { if (q.type === 'shot' && q.team === tid && mine(q.player)) out.shot.push({ round, ok: q.outcome === 'goal', def: q.defDist, xg: q.xg, x: q.x, y: q.y, who: q.player, tid }); });
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
  const MIN_N = { pass: 3, dribble: 2, tackle: 2, shot: 2 };
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
  // "How often would luck alone do this?", in words. The raw number is never shown without being explained.
  FM.plainChance = function (p) {
    if (p == null || isNaN(p)) return 'there is too little data to say';
    const n = Math.max(2, Math.min(1000, Math.round(1 / Math.max(p, 0.001))));
    if (p < 0.05) return 'luck alone would give a gap this big only about 1 time in ' + n + ', so it is very likely real';
    if (p < 0.15) return 'luck alone would give a gap this big about 1 time in ' + n + ': it may be real, but it is not convincing yet';
    return 'luck alone would easily give a gap like this (about 1 time in ' + n + '), so there is no real evidence of a difference yet';
  };
  FM.plainChanceShort = (p) => (p < 0.05 ? 'Very unlikely' : p < 0.15 ? 'Possibly' : 'Easily');

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
        // how much he took in when it was explained to him sets how much the weekly work gives
        const uf = plan && plan.understanding != null ? 0.3 + 0.9 * (plan.understanding / 100) : 0.5;
        const focused = plan && plan.active ? 1.0 * af * ls * uf * (0.7 + rng() * 0.6) : 0;
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
          text = name + ' is heading the right way: ' + nums + '.';
          advice = 'Keep the lesson going and watch the next match.';
        } else if (diff <= -0.1 && t && t.p < 0.1) {
          kind = 'bad'; title = first + ' has gone backwards';
          text = pick(rng, [
            'Frustrating. ' + name + ' is doing worse since the lesson began: ' + nums + '.',
            'Not the news you wanted: ' + name + ' has dropped to ' + pct(m.post.rate) + ' from ' + pct(m.pre.rate) + '.',
          ]);
          advice = 'Look at who he has faced and how tired he was: a harder opponent or a heavy schedule can pull a number down. If it carries on, try a different lesson.';
        } else {
          kind = 'info'; title = 'No clear change yet for ' + first;
          text = name + ' is at ' + nums + '. That is roughly where he started.';
          advice = 'Do not judge it yet. Compare the same conditions, and give the training more matches.';
        }
        if (plan.understanding != null) {
          text += ' He took in ' + plan.understanding + '% of what you explained.';
          if (plan.understanding < 50 && kind !== 'good') advice = 'He only took in ' + plan.understanding + '% of the lesson. Before blaming the training, explain it again in the Development tab: name the factors, say which way each pushes and by how much, and end with a rule he can use.';
          else if (kind === 'good') advice += ' Your explanation made the difference: he understood it, and it showed in the match.';
        }
        feed(league, { round, pid: p.id, name, kind, title, text, advice });
      } else {
        feed(league, { round, pid: p.id, name, kind: 'info', title: first + ' is training',
          text: pick(rng, [name + ' put the week in on "' + L.title.toLowerCase() + '".', name + ' worked hard on his ' + L.area.toLowerCase() + ' this week.']) +
            '',
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
    if (FM.caseAfterRound) FM.caseAfterRound(league, round);
    d.last = round;
  };

  // ---------- a model of what drives success: logistic regression ----------
  // For a yes/no outcome (the pass arrived, the dribble was won, the challenge won the ball, the shot scored) a straight line cannot be used,
  // because a probability has to stay between 0 and 1. Logistic regression models the log-odds of success as a straight-line function of the
  // situation (how long the pass, how much space), which keeps the answer a proper probability and says how much each factor matters with the
  // others held fixed.
  const MODEL_VARS = {
    pass: [
      { k: 'dist', label: 'Pass length', unit: 'm', get: (e) => e.dist, min: 3, max: 45, step: 1, high: 'longer the pass' },
      { k: 'lane', label: 'Lane clearance (how far the nearest defender is from the line of the pass)', short: 'Lane clearance', unit: 'm', get: (e) => e.lane, min: 0, max: 15, step: 0.5, high: 'more open the passing lane' },
      { k: 'press', label: 'Space around the receiver (distance to his nearest marker)', short: 'Space around receiver', unit: 'm', get: (e) => e.press, min: 0, max: 15, step: 0.5, high: 'more space around the receiver' },
    ],
    dribble: [{ k: 'def', label: 'Distance to the nearest defender', short: 'Defender distance', unit: 'm', get: (e) => e.def, min: 0, max: 15, step: 0.5, high: 'further away the defender' }],
    tackle: [
      { k: 'centre', label: 'Distance from the halfway line', short: 'From halfway', unit: 'm', get: (e) => Math.abs((e.x == null ? 52.5 : e.x) - 52.5), min: 0, max: 52, step: 1, high: 'further from the halfway line' },
      { k: 'wide', label: 'Distance from the middle of the pitch (width)', short: 'Width', unit: 'm', get: (e) => Math.abs((e.y == null ? 34 : e.y) - 34), min: 0, max: 34, step: 1, high: 'wider the challenge' },
    ],
    shoot: [
      { k: 'gd', label: 'Distance from goal', short: 'Distance from goal', unit: 'm', get: (e) => Math.min(e.x == null ? 20 : e.x, 105 - (e.x == null ? 20 : e.x)), min: 3, max: 45, step: 1, high: 'further from goal the shot' },
      { k: 'wide', label: 'Width of the shot (distance from the middle)', short: 'Width', unit: 'm', get: (e) => Math.abs((e.y == null ? 34 : e.y) - 34), min: 0, max: 34, step: 1, high: 'wider the angle' },
      { k: 'def', label: 'Distance to the nearest defender', short: 'Defender distance', unit: 'm', get: (e) => e.def, min: 0, max: 15, step: 0.5, high: 'more space the shooter has' },
    ],
  };
  const EVKEY = { pass: 'pass', dribble: 'dribble', tackle: 'tackle', shoot: 'shot' };
  const sigm = (z) => 1 / (1 + Math.exp(-z));
  let modelMemo = {};
  FM.devModel = function (league, lessonId) {
    const vars = MODEL_VARS[lessonId], key = EVKEY[lessonId];
    if (!vars) return null;
    const stamp = fixturesWithLogs(league).length + ':' + lessonId;
    if (modelMemo[stamp] !== undefined) return modelMemo[stamp];
    const ev = FM.devEvents(league, null)[key].filter((e) => vars.every((v) => v.get(e) != null && isFinite(v.get(e))));
    const succ = ev.filter((e) => e.ok).length, fail = ev.length - succ;
    let out = { lesson: lessonId, vars, n: ev.length, ok: false, reason: '' };
    if (ev.length < 12 || succ < 2 || fail < 2) { out.reason = 'The model fills in once this season\'s matches have been played.'; }
    else {
      const X = ev.map((e) => [1].concat(vars.map((v) => Math.min(v.max, Math.max(v.min, v.get(e)))))), y = ev.map((e) => (e.ok ? 1 : 0));
      let fit = null; try { fit = S.logistic(X, y); } catch (err) { fit = null; }
      if (!fit || !fit.converged) out.reason = 'The model fills in as this season\'s matches are played.';
      else {
        out.ok = true; out.fit = fit;
        out.terms = vars.map((v, j) => ({ v, beta: fit.beta[j + 1], se: fit.se[j + 1], p: fit.p[j + 1], or: Math.exp(fit.beta[j + 1]) }));
        out.predict = (vals) => sigm(fit.beta[0] + vars.reduce((a, v, j) => a + fit.beta[j + 1] * vals[j], 0));
        out.mcfadden = fit.mcfadden;
        out.rows = ev;
      }
    }
    modelMemo[stamp] = out;
    return out;
  };
  // The player's own decisions against the league's model: what the model expects for the situations he chose, and what he got.
  FM.devExpected = function (league, p, lessonId) {
    const M = FM.devModel(league, lessonId); if (!M || !M.ok) return null;
    const mine = FM.devEvents(league, p)[EVKEY[lessonId]].filter((e) => M.vars.every((v) => v.get(e) != null && isFinite(v.get(e))));
    if (!mine.length) return null;
    const exp = S.mean(mine.map((e) => M.predict(M.vars.map((v) => Math.min(v.max, Math.max(v.min, v.get(e))))))), act = mine.filter((e) => e.ok).length / mine.length;
    const avg = M.vars.map((v) => S.mean(mine.map((e) => Math.min(v.max, Math.max(v.min, v.get(e))))));
    return { n: mine.length, expected: exp, actual: act, avg };
  };
  // What a good explanation of this lesson covers, worked out from the model itself.
  FM.devKeyPoints = function (league, p, lessonId) {
    const M = FM.devModel(league, lessonId), pts = [];
    if (M && M.ok) {
      M.terms.forEach((t) => {
        if (t.p < 0.1) pts.push({ var: t.v.k, dir: t.beta > 0 ? 'up' : 'down', text: 'The ' + t.v.high + ', the ' + (t.beta > 0 ? 'more' : 'less') + ' likely it is to succeed' + (t.p < 0.05 ? '' : ' (a weaker effect)') });
      });
      if (!pts.length) pts.push({ var: null, text: 'That none of the situation factors clearly changes his chance of success' });
    } else pts.push({ var: null, text: 'What the matches show about the situation that matters' });
    pts.push({ var: 'size', text: 'How big the effect is, in numbers (for example the odds or the percentage chance in two situations)' });
    pts.push({ var: 'rule', text: 'A rule he can use during a match' });
    return pts;
  };
  FM.devFacts = function (league, p, lessonId) {
    const M = FM.devModel(league, lessonId), out = [];
    if (M && M.ok) M.terms.forEach((t) => out.push(t.v.short || t.v.label + ': each extra metre multiplies the odds of success by ' + t.or.toFixed(2) + ' (p = ' + (t.p < 0.001 ? '<0.001' : t.p.toFixed(3)) + '), so ' + (t.beta > 0 ? 'more is better' : 'more is worse') + '.'));
    if (M && M.ok) out.forEach((x, i) => { const t = M.terms[i]; out[i] = (t.v.short || t.v.label) + ': each extra metre multiplies the odds of success by ' + t.or.toFixed(2) + ' (p ' + (t.p < 0.001 ? '< 0.001' : '= ' + t.p.toFixed(3)) + '); ' + (t.beta > 0 ? 'more is better.' : 'more is worse.'); });
    const m = FM.devMeasure(league, p, lessonId), ex = FM.devExpected(league, p, lessonId);
    if (m && m.n) out.push(p.name + ': ' + m.k + ' of ' + m.n + ' (' + pct(m.rate) + '), league ' + pct(m.base) + (ex ? '; the model expects ' + pct(ex.expected) + ' for the situations he chose' : '') + '.');
    return out;
  };
  // Without the server (not signed in, or it is unreachable) the explanation is read here, more bluntly: which of the factors it names, which way
  // it says each one pushes, whether it uses numbers, and whether it ends in a rule.
  const SYN = {
    dist: /length|distance|far|long|short|range|how far/, lane: /lane|blocked|block|intercept|cut off|line|path|route|channel/,
    press: /mark|pressure|press|tight|crowd|space|free|alone|defender|closed down|man/, def: /defender|close|tight|space|room|near|pressure|marker/,
    centre: /halfway|centre|middle|half|deep|position|where|zone/, wide: /wide|touchline|side|central|angle|flank|width/, gd: /distance|range|far|close to goal|near|yards|metres/,
  };
  function localAssess(text, kps, learn) {
    const t = String(text || '').toLowerCase(), words = t.split(/\s+/).filter(Boolean).length;
    const covered = [], missed = [], wrong = [];
    const UP = /(more|higher|better|easier|likely|increase|improv|succeed|safer|complete)/, DOWN = /(less|lower|worse|harder|drop|fall|fail|decrease|reduc|risk|lose|lost|intercept|unlikely)/;
    kps.forEach((k, i) => {
      let ok = false;
      if (k.var && SYN[k.var]) ok = SYN[k.var].test(t) && (k.dir === 'up' ? UP.test(t) : DOWN.test(t));
      else if (k.var === 'size') ok = /\d/.test(t) || /(percent|%|odds|per cent|times|twice|half)/.test(t);
      else if (k.var === 'rule') ok = /(should|when|if|wait|only|pick|choose|avoid|try|before|instead|always|never)/.test(t) && words >= 8;
      else ok = words >= 12;
      (ok ? covered : missed).push(i);
    });
    const cov = kps.length ? covered.length / kps.length : 0;
    let u = Math.round(cov * 80 + (words >= 25 ? 12 : words >= 12 ? 6 : 0) + (/\d/.test(t) ? 6 : 0));
    if (words < 6) u = Math.min(u, 15);
    u = Math.max(0, Math.min(100, Math.round(u * learn)));
    const reply = u >= 75 ? 'Right, got it. So I read the situation first and only play it when it is on, and when it is not I take the safer option. That makes sense with the numbers, boss.'
      : u >= 45 ? 'I think I follow most of it: look at what is around me before I pass. I am not completely sure when to hold back, though. Can you go through that part again?'
        : 'Sorry, boss, I am not sure I have it. What exactly should I be looking for, and what should I do differently in the game?';
    return { understanding: u, covered, missed, wrong, reply, tip: u >= 75 ? 'That was clear: the factors, how big they are, and a rule he can use.' : 'Say which factors matter and which way they push, give a number from the model, and end with one thing he should do differently in a match.', source: 'local' };
  }
  FM.devAssess = async function (league, p, lessonId, explanation) {
    const kps = FM.devKeyPoints(league, p, lessonId);
    const learn = 0.88 + (learnSpeed(p) - 0.75) * 0.24;   // 0.88 to 1.12
    let res = null;
    try {
      res = await FM.api('/football/teach-assess', { player: { name: p.name, age: FM.ageOf(p), position: FM.POS_NAME ? FM.POS_NAME[p.natural] : p.natural, learning: learn > 1.04 ? 'quickly' : learn < 0.96 ? 'slowly' : 'steadily' },
        lesson: lessonId, stats: FM.devFacts(league, p, lessonId), keyPoints: kps.map((k) => k.text), explanation });
      res.source = 'server';
    } catch (e) { res = null; }
    if (!res) res = localAssess(explanation, kps, learn);
    res.keyPoints = kps;
    return res;
  };
  // Teaching changes him at once (the next match is played with it) and then keeps working through the weeks.
  FM.devTeach = function (league, p, lessonId, result, explanation) {
    const d = FM.develop(league), L = FM.LESSONS[lessonId], round = league.fixtures.filter((f) => f.played && (f.homeId === league.userId || f.awayId === league.userId)).length;
    let plan = d.plans[p.id];
    if (!plan || !plan.active || plan.lesson !== lessonId) plan = d.plans[p.id] = { lesson: lessonId, active: true, startRound: round, startAbility: FM.abilityOf(p), rounds: 0, gain: 0, understanding: 0, attempts: 0 };
    if (!d.hist[p.id]) d.hist[p.id] = [[round - 1, FM.abilityOf(p)]];
    const prevU = plan.understanding || 0, u = Math.max(prevU, result.understanding);
    plan.understanding = u; plan.attempts = (plan.attempts || 0) + 1; plan.last = { text: explanation.slice(0, 600), reply: result.reply, tip: result.tip, understanding: result.understanding };
    const before = FM.abilityOf(p), af = ageFactor(FM.ageOf(p)), ls = learnSpeed(p);
    const boost = 2.4 * af * ls * Math.max(0, u - prevU) / 100;
    const after = boost > 0 ? applyGrowth(p, L.attrs, boost, 0) : before;
    const first = p.name.split(' ').slice(-1)[0];
    feed(league, { round: round - 1, pid: p.id, name: p.name, kind: u >= 70 ? 'good' : u >= 40 ? 'ok' : 'info', title: 'Teaching session: ' + first + ' took in ' + u + '%',
      text: '“' + result.reply + '”' + (after > before ? ' He is already a little sharper: ability ' + before + ' to ' + after + '.' : ''),
      advice: (result.tip || '') + ' The real test is his decisions in the next match, and the Feedback here will tell you how it went.' });
    return { plan, understanding: u, before, after };
  };

  // ---------- the screen ----------
  const EXPLAIN = {
    how: ['How often: counts, percentages and the league average', 'A percentage on its own means little. "63 of 99 passes" tells you how many decisions it rests on, and the league average tells you what is normal. The more decisions there are, the more you can trust the percentage.'],
    ci: ['What the "95% confidence" range means', 'A player\'s percentage from a few dozen decisions is only an estimate of how good he really is. The range says where his true figure plausibly lies. A narrow range means plenty of evidence; a wide one means you need more matches before drawing conclusions.'],
    cond: ['Conditional probability: does the situation matter?', 'Splitting his decisions by situation (a marked receiver or a free one) gives the chance of success given that situation. If the two chances are far apart, the situation is doing the work and the fault may be the choice, not the player. The p-value tells you how likely a gap that big would be if the situation made no difference at all.'],
    p: ['What a p-value is', 'Whenever the screen says "luck alone would give this about 1 time in 20", that is a p-value turned into words: the chance of seeing a difference at least this big if there were really no effect. Small means luck is an unlikely explanation. Large does not prove there is no effect: it can simply mean there is not enough evidence yet.'],
    logit: ['Logistic regression: modelling a yes-or-no outcome', 'A pass either arrives or it does not. Logistic regression estimates the probability of that outcome from several factors at once (how long the pass is, how open the lane is, how much space the receiver has), while holding the others fixed. That matters because the factors overlap: long passes tend to go into crowded areas, so you need to separate what each one does by itself.'],
    odds: ['Reading the table: odds ratios', 'The odds ratio is the number the odds of success are multiplied by for each extra unit of that factor. Above 1 means it helps; below 1 means it hurts; exactly 1 means no effect. 0.80 for "pass length" means every extra metre cuts the odds of the pass arriving by about a fifth, whatever the lane and space.'],
    explore: ['Using the model: change the situation', 'The sliders put numbers into the fitted model and read off the probability. Move one factor at a time to see how much each is worth, then ask which of them a player can actually change by his decision.'],
    expected: ['Decision or execution? Expected against actual', 'The model can say what a typical player would complete from the same situations. If he gets less than that, he is executing worse than others in those situations. If he gets about the same but the situations are poor, the fault is the choices he makes. They need different coaching.'],
  };
  const explain = (k) => `<details class="dv-explain"><summary>${esc(EXPLAIN[k][0])}</summary><p>${esc(EXPLAIN[k][1])}</p></details>`;
  const dv = { sel: null, sort: 'gap', lesson: {}, busy: false, last: {} };
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
    const row = (p) => {
      const plan = d.plans[p.id], a = FM.abilityOf(p), pot = FM.potentialOf(p), h0 = d.hist[p.id];
      const grown = h0 && h0.length ? a - h0[0][1] : 0;
      return `<tr class="player-row${p.id === dv.sel ? ' sel' : ''}" data-dev="${esc(p.id)}" tabindex="0"><td class="l"><b>${esc(p.name)}</b></td><td class="l">${p.natural}</td><td>${FM.ageOf(p)}</td>
        <td><b>${a}</b></td><td>${pot}</td><td><span class="dv-bar" title="${a} of a possible ${pot}"><i style="width:${Math.min(100, Math.round(100 * a / Math.max(1, pot)))}%"></i></span></td>
        <td>${grown > 0 ? '+' + grown : grown || '–'}</td><td class="l">${plan && plan.active ? '<span class="rc-chip st-wage_talks">Training</span>' : ''}</td></tr>`;
    };
    // ----- the selected player
    let detail = '<div class="card"><p class="note">Pick a player from the list.</p></div>';
    let wire = null;
    if (sel) {
      const plan = d.plans[sel.id], a = FM.abilityOf(sel), pot = FM.potentialOf(sel), age = FM.ageOf(sel);
      const diag = FM.devDiagnose(league, sel), lessons = lessonsFor(sel);
      const lessonId = dv.lesson[sel.id] && lessons.indexOf(dv.lesson[sel.id]) >= 0 ? dv.lesson[sel.id] : (plan && plan.active ? plan.lesson : diag.lesson);
      const L = FM.LESSONS[lessonId], last = sel.name.split(' ').slice(-1)[0];
      const hist = d.hist[sel.id] || [];
      // 1. the problem
      let view = '';
      if (diag.kind === 'evidence') {
        const m = diag.m, dl = FM.LESSONS[diag.lesson], sp = m.split, what = dl.unit.split(' ')[0];
        const hard = sp && sp[0].n >= 3 && sp[1].n >= 3 && sp[1].rate - sp[0].rate >= 0.15;
        if (m.rate >= m.base && hard) view = `“${esc(last)}'s ${esc(what)} look fine overall (${pct(m.rate)}, against ${pct(m.base)} for the league), but when the situation is tight (${esc(m.labels[0])}) he gets only ${pct(sp[0].rate)} of them right, against ${pct(sp[1].rate)} otherwise. That is where we lose the ball.”`;
        else if (m.rate < m.base) view = `“${esc(last)}'s ${esc(dl.area.toLowerCase())} are costing us. He gets ${pct(m.rate)} of his ${esc(what)} right (${m.k} of ${m.n}), where the league as a whole manages ${pct(m.base)}.”${hard ? ` It is much worse when ${esc(m.labels[0])}: ${pct(sp[0].rate)} against ${pct(sp[1].rate)}.` : ''}`;
        else view = `“${esc(last)} is doing fine on his ${esc(dl.area.toLowerCase())}: ${pct(m.rate)} (${m.k} of ${m.n}) against ${pct(m.base)} for the league. I would look at something else, or keep building on this.”`;
      } else if (diag.kind === 'attribute') view = `“I have no recorded decisions for him yet, but his ${esc(diag.attr === 'gk' ? 'goalkeeping' : diag.attr)} is below most players in his position. I would start there.”`;
      else view = '“Once he has played, I will have something to tell you.”';
      // 2. investigate: tabs for the lesson, then three layers of evidence
      const tabs = `<div class="dv-tabs" role="tablist">${lessons.map((id) => `<button type="button" role="tab" data-dvl="${id}" class="${id === lessonId ? 'on' : ''}" aria-selected="${id === lessonId}">${esc(FM.LESSONS[id].area)}</button>`).join('')}</div>`;
      const m = FM.devMeasure(league, sel, lessonId, plan && plan.active && plan.lesson === lessonId ? plan.startRound : null);
      let inv = '';
      if (!m) inv = '<p class="note">This lesson is about effort and match feel rather than one recorded decision, so there is no statistic to model. You can still teach it below.</p>';
      else {
        const src = FM.devSources(league);
        inv += `<div class="dv-layer"><h4>How often</h4>${src.season ? `<p class="note">From ${src.season} match${src.season === 1 ? '' : 'es'} played this season.</p>` : ''}`;
        if (!m.n) inv += '<p class="note">Nothing recorded for him yet in this season\'s matches.</p>';
        else {
          inv += `<p><b>${m.k} of ${m.n}</b> ${esc(L.unit)} (<b>${pct(m.rate)}</b>${m.lo != null ? `, true figure plausibly between ${pct(m.lo)} and ${pct(m.hi)}` : ''}). The league as a whole: <b>${pct(m.base)}</b>.</p>`;
        }
        inv += explain('how') + explain('ci') + '</div>';
        if (m.split && m.split[0].n >= 1 && m.split[1].n >= 1) {
          inv += `<div class="dv-layer"><h4>Does the situation matter?</h4><table class="data dv-split"><thead><tr><th class="l">When</th><th>Decisions</th><th>Success</th></tr></thead><tbody>${m.split.map((s2, i) => `<tr><td class="l">${esc(m.labels[i])}</td><td>${s2.n}</td><td>${s2.n ? pct(s2.rate) : '–'}</td></tr>`).join('')}</tbody></table>`;
          if (m.splitP != null && !isNaN(m.splitP)) inv += `<p>The gap between those two situations: ${esc(FM.plainChance(m.splitP))}.</p>`;
          inv += explain('cond') + explain('p') + '</div>';
        }
        // the model
        const M = FM.devModel(league, lessonId);
        if (M) {
          inv += '<div class="dv-layer"><h4>A model of what drives success</h4>';
          if (!M.ok) inv += `<p class="note">${esc(M.reason)}</p>`;
          else {
            inv += `<p>Fitted on <b>${M.n}</b> ${esc(L.unit.split(' ')[0])} from every team in the league: the chance each one succeeds, given the situation.</p>
              <table class="data dv-model"><thead><tr><th class="l">Factor</th><th>Odds ratio per metre</th><th>Could it be chance?</th><th class="l">Reading</th></tr></thead><tbody>${M.terms.map((t) => `<tr><td class="l">${esc(t.v.short || t.v.label)}</td><td><b>${t.or.toFixed(2)}</b></td><td>${esc(FM.plainChanceShort(t.p))}</td><td class="l">${t.p >= 0.1 ? 'No clear effect' : t.beta > 0 ? 'Helps success' + (t.p < 0.05 ? '' : ' (weak)') : 'Hurts success' + (t.p < 0.05 ? '' : ' (weak)')}</td></tr>`).join('')}</tbody></table>`;
            // the explorer
            const ex = FM.devExpected(league, sel, lessonId);
            const start = M.vars.map((v, j) => (ex ? Math.min(v.max, Math.max(v.min, Math.round(ex.avg[j] * 2) / 2)) : Math.round((v.min + v.max) / 4)));
            inv += `<div class="dv-explore" data-lesson="${lessonId}"><b>Try a situation</b>${M.vars.map((v, j) => `<label>${esc(v.short || v.label)}: <output>${start[j]}</output> ${v.unit}<input type="range" min="${v.min}" max="${v.max}" step="${v.step}" value="${start[j]}" data-j="${j}"></label>`).join('')}
              <div class="dv-prob"><span class="dv-bar big"><i style="width:${Math.round(M.predict(start) * 100)}%"></i></span><b class="dv-probnum">${pct(M.predict(start))}</b> chance of success</div></div>`;
            if (ex) inv += `<p>For the situations ${esc(last)} actually chose, the model expects <b>${pct(ex.expected)}</b>; he got <b>${pct(ex.actual)}</b> (${ex.n} decisions). ${ex.actual < ex.expected - 0.05 ? 'He is converting fewer than a typical player would from the same positions: the execution is the issue.' : ex.expected < M.predict(M.vars.map((v) => (v.min + v.max) / 2)) - 0.03 ? 'He is getting about what the model expects, so the choices of situation are what hold him back.' : 'He is getting about what the model expects for his situations.'}</p>`;
            inv += explain('logit') + explain('odds') + explain('explore') + explain('expected');
          }
          inv += '</div>';
        }
        if (m.post && m.pre && m.post.n && m.pre.n) {
          const t = twoProp(m.pre, m.post);
          inv += `<div class="dv-layer"><h4>Since the lesson began</h4><p><b>Before:</b> ${pct(m.pre.rate)} (${m.pre.k} of ${m.pre.n}). <b>Since:</b> ${pct(m.post.rate)} (${m.post.k} of ${m.post.n}).${t ? ' The change: ' + esc(FM.plainChance(t.p)) + '.' : ''}</p>${explain('p')}</div>`;
        }
      }
      // 3. teach
      const kps = FM.devKeyPoints(league, sel, lessonId);
      const lastRes = dv.last[sel.id] && dv.last[sel.id].lesson === lessonId ? dv.last[sel.id] : null;
      const teachPlan = plan && plan.active && plan.lesson === lessonId ? plan : null;
      let result = '';
      if (lastRes) {
        const r = lastRes.res;
        result = `<div class="dv-result"><div class="dv-meter"><span>${esc(last)} understood</span><span class="dv-bar big"><i style="width:${r.understanding}%"></i></span><b>${r.understanding}%</b></div>
          <blockquote>“${esc(r.reply)}”</blockquote>
          <ul class="dv-points">${r.keyPoints.map((k, i) => `<li class="${r.covered.indexOf(i) >= 0 ? 'got' : 'miss'}">${r.covered.indexOf(i) >= 0 ? '✓' : '○'} ${esc(k.text)}</li>`).join('')}</ul>
          ${r.wrong && r.wrong.length ? `<p class="dv-wrong"><b>Not quite right:</b> ${esc(r.wrong.join(' '))}</p>` : ''}
          ${r.tip ? `<p class="dv-advice"><b>For next time:</b> ${esc(r.tip)}</p>` : ''}
          <p class="note">${lastRes.after > lastRes.before ? `He is already a little sharper: ability ${lastRes.before} to ${lastRes.after}. ` : ''}What he took in is what he carries into the next match, and the Feedback below reports how his decisions changed.</p></div>`;
      }
      const teach = `<div class="dv-teach">
          <p>${esc(L.teach)} Look at the evidence above, then explain it to ${esc(last)} in your own words: <b>what drives success, how much, and what he should do differently</b>.</p>
          <textarea id="dvExplain" rows="5" placeholder="e.g. When the receiver has little space around him the pass is much less likely to arrive. Each extra metre of space makes it about 1.2 times more likely, so before you play it, check…">${esc(dv.draft && dv.draft[sel.id] || (teachPlan && teachPlan.last ? teachPlan.last.text : ''))}</textarea>
          <div class="row"><button type="button" id="dvTeach" class="primary"${dv.busy ? ' disabled' : ''}>${dv.busy ? 'He is thinking…' : teachPlan && teachPlan.attempts ? 'Explain it again' : 'Explain it to him'}</button>
${plan && plan.active ? '<button type="button" id="dvStop">Stop this training</button>' : ''}</div>
          <p class="note">${teachPlan ? `In training for ${teachPlan.rounds || 0} week${teachPlan.rounds === 1 ? '' : 's'}; he has taken in <b>${teachPlan.understanding || 0}%</b> so far (${teachPlan.attempts || 0} explanation${teachPlan.attempts === 1 ? '' : 's'}). A clearer explanation raises it and he sharpens straight away.` : 'Training begins when you have explained it. The clearer and more accurate your explanation, the more he takes in.'}</p>
          ${result}</div>`;
      let spark = '';
      if (hist.length >= 2) {
        const vals = hist.map((x) => x[1]), lo = Math.min.apply(null, vals) - 1, hi = Math.max(Math.max.apply(null, vals), pot) + 1, w = 280, hgt = 70;
        const pts = vals.map((v, i) => [Math.round(10 + (w - 20) * i / (vals.length - 1)), Math.round(hgt - 8 - (hgt - 16) * (v - lo) / Math.max(1, hi - lo))]);
        const py = Math.round(hgt - 8 - (hgt - 16) * (pot - lo) / Math.max(1, hi - lo));
        spark = `<svg viewBox="0 0 ${w} ${hgt}" class="dv-spark" role="img" aria-label="Ability over the season"><line x1="10" x2="${w - 10}" y1="${py}" y2="${py}" stroke="currentColor" stroke-dasharray="4 4" opacity=".5"/><text x="${w - 10}" y="${py - 3}" text-anchor="end" font-size="9" fill="currentColor" opacity=".8">potential ${pot}</text><polyline fill="none" stroke="currentColor" stroke-width="2.5" points="${pts.map((q) => q.join(',')).join(' ')}"/>${pts.map((q) => `<circle cx="${q[0]}" cy="${q[1]}" r="3" fill="currentColor"/>`).join('')}</svg>`;
      }
      detail = `<div class="card dv-player"><span class="eyebrow">${FM.POS_NAME ? FM.POS_NAME[sel.natural] : sel.natural} · age ${age}</span><h3>${esc(sel.name)}</h3>
          <div class="dv-nums"><span>Ability <b>${a}</b></span><span>Potential <b>${pot}</b></span><span>${esc(FM.potentialWord(sel))}</span><span>${esc(FM.learningWord(sel))}</span></div>
          <span class="dv-bar big"><i style="width:${Math.min(100, Math.round(100 * a / Math.max(1, pot)))}%"></i></span>${spark}
          ${pot - a <= 0 ? '<p class="note">He has reached his potential, so more training will not raise his ratings. Younger players have room to grow.</p>' : ''}
          <h4>Case study</h4><div id="dvCase"></div>
          <h4>1. The problem</h4><p><b>Assistant manager:</b> ${view}</p>
          <h4>2. Investigate the evidence</h4>${tabs}${inv}
          <h4>3. Teach him</h4>${teach}</div>`;
      wire = { sel, lessonId, plan, kps };
    }
    // ----- feedback
    const items = d.feed.slice().reverse().slice(0, 30);
    const feedback = `<div class="card dv-feed"><h3>Feedback</h3>${items.length ? items.map((f) => `<article class="dv-fb ${f.kind}"><div class="dv-fb-head"><b>${esc(f.title)}</b><small>${f.round >= 0 ? 'After round ' + (f.round + 1) : 'Pre-season'}</small></div><p>${esc(f.text)}</p>${f.advice ? `<p class="dv-advice"><b>What next:</b> ${esc(f.advice)}</p>` : ''}</article>`).join('') : '<p class="note">After each round you play, this is where you find out whether the work is paying off, and what to do about it.</p>'}</div>`;
    host.innerHTML = `<div class="dv-wrap"><div class="card dv-list"><div class="row" style="justify-content:space-between"><h2>Development</h2>
        <label>Sort by <select id="dvSort">${[['gap', 'Room to grow'], ['ability', 'Ability'], ['age', 'Youngest'], ['name', 'Name']].map(([k, n]) => `<option value="${k}"${dv.sort === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label></div>
        <p class="note">Ability and potential are out of 100. Develop a player by studying what his recorded decisions show, explaining it to him clearly, and checking in later matches that it worked.</p>
        <div class="tablewrap"><table class="data"><thead><tr><th class="l">Player</th><th class="l">Pos</th><th>Age</th><th>Ability</th><th>Potential</th><th class="l">Growth</th><th>This season</th><th class="l"></th></tr></thead><tbody>${players.map(row).join('')}</tbody></table></div></div>
        <div class="dv-side">${detail}</div></div>${feedback}`;
    const srt = host.querySelector('#dvSort'); if (srt) srt.addEventListener('change', () => { dv.sort = srt.value; draw(); });
    host.querySelectorAll('[data-dev]').forEach((r) => r.addEventListener('click', () => { dv.sel = r.dataset.dev; draw(); }));
    if (!wire) return;
    const { sel: pl, lessonId: lid, plan: pln } = wire;
    const caseBox = host.querySelector('#dvCase');
    if (caseBox && FM.renderCase) FM.renderCase(league, pl, caseBox, { save, redraw: draw });
    host.querySelectorAll('[data-dvl]').forEach((b) => b.addEventListener('click', () => { const ta = host.querySelector('#dvExplain'); dv.draft = dv.draft || {}; if (ta) dv.draft[pl.id] = ta.value; dv.lesson[pl.id] = b.dataset.dvl; draw(); }));
    // the "try a situation" sliders
    const box = host.querySelector('.dv-explore');
    if (box) {
      const M = FM.devModel(league, lid);
      const upd = () => {
        const vals = Array.from(box.querySelectorAll('input[type=range]')).map((i) => +i.value);
        box.querySelectorAll('output').forEach((o, j) => { o.textContent = vals[j]; });
        const pr = M.predict(vals);
        box.querySelector('.dv-prob i').style.width = Math.round(pr * 100) + '%'; box.querySelector('.dv-probnum').textContent = pct(pr);
      };
      box.querySelectorAll('input[type=range]').forEach((i) => i.addEventListener('input', upd));
    }
    const ta = host.querySelector('#dvExplain');
    if (ta) ta.addEventListener('input', () => { dv.draft = dv.draft || {}; dv.draft[pl.id] = ta.value; });
    const go = host.querySelector('#dvTeach');
    if (go) go.addEventListener('click', async () => {
      const text = (ta.value || '').trim();
      if (text.length < 8) { ta.focus(); ta.placeholder = 'Write a sentence or two first: what drives success, and what he should do.'; return; }
      dv.busy = true; draw();
      const res = await FM.devAssess(league, pl, lid, text);
      dv.busy = false;
      const before = FM.abilityOf(pl);
      const out = FM.devTeach(league, pl, lid, res, text);
      dv.last[pl.id] = { lesson: lid, res, before, after: out.after };
      dv.draft = dv.draft || {}; dv.draft[pl.id] = text;
      save(); draw();
    });
    const stop = host.querySelector('#dvStop');
    if (stop) stop.addEventListener('click', () => { if (d.plans[pl.id]) d.plans[pl.id].active = false; void pln; save(); draw(); });
  };
})();
