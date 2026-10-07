// The build-up lab: a Monte Carlo experiment on one short phase of play. Your team starts with the ball beside its goalkeeper, set up as it is on the
// Build-up board; the opposition stand where they would press. The same 40 seconds is then played many times. Nothing is scripted: each time the
// players decide differently (the usual chance in every pass and tackle), and each time the opposition react a little differently to how you have
// placed your players (a winger may or may not follow a full-back who has gone high). The share of tests ending each way is the result.
(function () {
  const FM = (window.FM = window.FM || {}), S = FM.STAT;
  const L = 105;
  const LAB = (FM.lab = {});
  const TRIAL_SECONDS = 40, AFTER_LOSS = 15, NEAR_GOAL = 25, STEP = 0.25, RESPOND_EVERY = 3, FOLLOW_FOR = 6;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  LAB.CONSTANTS = { TRIAL_SECONDS, AFTER_LOSS, NEAR_GOAL };

  // Match and visualisation code can attach short-lived object references
  // (team -> opponent -> team). They are runtime context, not team data,
  // and must never enter a lab copy or saved project.
  const TRANSIENT = new Set(['oppRef', 'ruleCtx', 'phaseCtx', 'extraOv']);
  const clone = (t) => JSON.parse(JSON.stringify(t, (key, value) => TRANSIENT.has(key) ? undefined : value));
  const outfield = (t) => t.players.filter((p) => p.group !== 'GK');
  const oppPressOf = (tac) => clamp(0.5 * (tac.pressBuildUp == null ? 0.4 : tac.pressBuildUp) + 0.5 * (tac.pressing == null ? 0.5 : tac.pressing), 0, 1);

  // How the opposition may react to the way you have placed your players. A player you have pushed up beyond his usual build-up position may
  // be followed by the nearest opponent who plays wide or in front of the back line; a player you have dropped deeper may draw an opponent up to
  // press him. Each is a chance, not a rule, and it rises with how hard they press and with how far the player has moved.
  LAB.responses = function (user, opp, oppTactics) {
    const tac = oppTactics || opp.tactics, press = oppPressOf(tac), dir = user.attackDir;
    const probe = { x: 0, y: 0 };
    // Where their players stand at the start (the phase that answers your build-up), in pitch metres.
    const ball = FM.toMetres(dir, 0.07, 0.6);
    opp.phaseCtx = {}; user.phaseCtx = {};
    const oppDefault = Object.assign({}, opp, { tactics: tac, phasePos: null });
    const where = new Map(); opp.players.forEach((p) => where.set(p, FM.targetFor(oppDefault, p, ball, false)));
    const list = [];
    outfield(user).forEach((q) => {
      const pos = FM.phasePos(user, q, 'build'), def = FM.defaultPhasePos(user, q, 'build');
      const dev = (pos.d - def.d) * L;
      if (Math.abs(dev) < 4) return;
      list.push({ q, dev, kind: dev > 0 ? 'high' : 'deep' });
    });
    list.sort((a, b) => Math.abs(b.dev) - Math.abs(a.dev));
    const used = new Set(), out = [];
    list.forEach(({ q, dev, kind }) => {
      const here = FM.toMetres(dir, FM.phasePos(user, q, 'build').d, FM.phasePos(user, q, 'build').w);
      const groups = kind === 'high' ? ['WF', 'FB', 'CM', 'DM'] : ['CB', 'DM', 'CM'];
      let best = null, bd = 28;
      outfield(opp).forEach((p) => { if (used.has(p) || groups.indexOf(p.group) < 0) return; const w = where.get(p), d = Math.hypot(w.x - here.x, w.y - here.y); if (d < bd) { bd = d; best = p; } });
      if (!best) return;
      used.add(best);
      const prob = kind === 'high' ? clamp(0.18 + 0.45 * press + 0.35 * clamp(dev / 12, 0, 1), 0.05, 0.92) : clamp(0.12 + 0.4 * press + 0.3 * clamp(-dev / 12, 0, 1), 0.05, 0.85);
      out.push({ attacker: q, defender: best, kind, dev, prob });
    });
    return out;
  };

  function holder(match) { return FM.holderOf(match); }

  // How the ball was lost: the last thing that went wrong for the user's side in the ten seconds before the opposition had it.
  function causeOf(match, u, o, entries, t) {
    const evs = match.events, who = (n) => u.players.find((p) => p.number === n);
    const following = (n) => entries.some((en) => en.q && en.q.number === n && t < en.until + 4);
    for (let i = evs.length - 1; i >= 0; i--) {
      const e = evs[i]; if (t - e.t > 10) break;
      if (e.type === 'pass' && e.team === u.id && (!e.ok || e.outcome === 'offside')) {
        const a = who(e.from), b = who(e.to);
        return { kind: e.ok ? 'offside' : (e.outcome === 'intercepted' ? 'intercepted' : 'loose'), from: e.from, name: a ? a.name : '', group: a ? a.group : '', toName: b ? b.name : '', dist: e.dist, lane: e.lane, press: e.press, followed: following(e.from) || following(e.to) };
      }
      if (e.type === 'dribble' && e.team === u.id && !e.ok) { const a = who(e.player); return { kind: 'dribble', from: e.player, name: a ? a.name : '', group: a ? a.group : '', press: e.defDist, followed: following(e.player) }; }
      if (e.type === 'tackle' && e.team === o.id && e.ok) { const a = who(e.vs); return { kind: 'tackle', from: e.vs, name: a ? a.name : '', group: a ? a.group : '', followed: following(e.vs) }; }
    }
    return { kind: 'other' };
  }

  // Where their players stood when your first pass was played: how high they were pressing, and how many of them were near the ball.
  // Distances are metres from YOUR goal line, so a small number means they are close to your goal.
  function pressShape(match, u, o) {
    const dir = u.attackDir, ball = match.ball;
    const opps = o.players.filter((p) => p.group !== 'GK').map((p) => FM.toTeamSpace(dir, p.x, p.y).d * L).sort((a, b) => a - b);
    const front = (opps[0] + opps[1]) / 2, last = opps[opps.length - 1];
    const dists = o.players.map((p) => Math.hypot(p.x - ball.x, p.y - ball.y));
    return { front: Math.round(front), last: Math.round(last), near: dists.filter((d) => d < 25).length, nearest: Math.round(Math.min.apply(null, dists) * 10) / 10, kind: front < 38 ? 'high' : front < 58 ? 'mid' : 'low' };
  }

  // One trial. Returns { outcome, time, passes, bigChance, goal }.
  LAB.trial = function (league, userTeam, oppTeam, oppTactics, seed, opts) {
    const u = clone(userTeam), o = clone(oppTeam);
    o.rules = (opts.oppRules || []).map((r) => JSON.parse(JSON.stringify(r)));   // their manager's plan for this run
    o.phasePos = null;   // the test is always against the opposition as they normally set up, wherever their shirts were dragged on the board
    if (oppTactics) o.tactics = Object.assign({}, o.tactics, oppTactics);
    Object.keys(opts.oppNudge || {}).forEach((k) => { if (o.tactics[k] != null) o.tactics[k] = clamp(o.tactics[k] + opts.oppNudge[k], 0, 1); });   // their manager's plan for the run (how hard they press)
    const match = FM.createMatch(u, o, seed);
    match.userId = u.id;
    FM.startBuildUpTrial(match, u, opts.start);
    const dir = u.attackDir, rng = FM.mulberry32((seed * 7 + 11) >>> 0);
    const resp = LAB.responses(u, o, o.tactics);
    const state = resp.map((r) => ({ r, until: 0 }));
    // Map the cloned players back to the response entries by shirt number.
    const byNum = (team, n) => team.players.find((p) => p.number === n);
    const entries = state.map((s) => ({ prob: s.r.prob, kind: s.r.kind, q: byNum(u, s.r.attacker.number), p: byNum(o, s.r.defender.number), until: 0 }));
    const roll = (t, first) => {
      match.extraOv = new Map();
      entries.forEach((e) => {
        if (!e.q || !e.p) return;
        if (t >= e.until && rng() < e.prob * (first ? 1 : 0.6)) e.until = t + FOLLOW_FOR;
        if (t < e.until) {
          match.extraOv.set(e.p, { x: clamp(e.q.x + dir * (e.kind === 'high' ? 1.5 : 1.2), 1, L - 1), y: e.q.y });
          if (first) { e.p.x = clamp(e.q.x + dir * 3, 1, L - 1); e.p.y = e.q.y; }
        }
      });
    };
    roll(0, true);
    let nextRoll = RESPOND_EVERY, lostAt = null, lostZone = null, lostCause = null, result = null, passes = 0, evSeen = 0;
    let guard = 0, planNow = null, firstPass = null, firstSeen = 0, planLogged = null;
    // For the replays: where everyone was (players every half second, the ball every quarter), and who the opposition were going to.
    const rec = opts.record ? { b: [], f: [], plan: [] } : null, d1 = (v) => Math.round(v * 10), tick = { n: 0 };
    const snap = () => { if (!rec) return; rec.b.push([d1(match.ball.x), d1(match.ball.y)]); if (tick.n % 2 === 0) { const row = []; u.players.concat(o.players).forEach((p) => { row.push(d1(p.x), d1(p.y)); }); rec.f.push(row); } tick.n++; };
    snap();
    while (!result && guard++ < 4000) {
      FM.stepMatch(match, STEP);
      if (match.plan) planNow = match.plan;
      if (rec) { if (match.plan && match.plan.t !== planLogged) { planLogged = match.plan.t; rec.plan.push({ t: Math.round(match.plan.t * 100) / 100, pairs: match.plan.pairs.slice() }); } snap(); }
      if (!firstPass) for (; firstSeen < match.events.length; firstSeen++) { const e = match.events[firstSeen]; if (e.type === 'pass' && e.team === u.id) { firstPass = { e, plan: planNow ? planNow.pairs.slice() : null, chase: null, shape: pressShape(match, u, o) }; firstSeen++; break; } }
      if (match.clock >= nextRoll) { roll(match.clock, false); nextRoll += RESPOND_EVERY; }
      const h = holder(match), t = match.clock;
      const d = FM.toTeamSpace(dir, match.ball.x, match.ball.y).d;
      if (lostAt == null) {
        if (h === u && d >= 0.5) { result = { outcome: 'beat', time: t }; break; }
        if (h === o) { const dg = Math.hypot(match.ball.x - (dir === 1 ? 0 : L), match.ball.y - 34); lostAt = t; lostZone = dg < NEAR_GOAL ? 'lostNear' : d < 0.33 ? 'lostOwn' : 'lostMid'; lostCause = causeOf(match, u, o, entries, t); }
        else if (t >= TRIAL_SECONDS) { result = { outcome: 'still', time: t }; break; }
      }
      if (lostAt != null) {
        const evs = match.events;
        for (; evSeen < evs.length; evSeen++) {
          const e = evs[evSeen];
          if (e.type === 'shot' && e.team === o.id) { result = { outcome: lostZone, time: lostAt, shot: true, goal: e.outcome === 'goal' }; break; }
          if (e.type === 'goal' && e.team === o.id) { result = { outcome: lostZone, time: lostAt, shot: true, goal: true }; break; }
        }
        if (!result && t - lostAt >= AFTER_LOSS) result = { outcome: lostZone, time: lostAt };
        // The ball has been regained by us again: that counts as a loss that did no harm (it is still a loss).
      }
    }
    if (!result) result = { outcome: lostAt != null ? lostZone : 'still', time: match.clock };
    let pTot = 0, pSum = 0; match.events.forEach((e) => { if (e.type === 'pass' && e.team === u.id) { pTot++; pSum += e.p; if (e.ok) passes++; } });
    result.passes = passes; result.passTotal = pTot; result.passP = pSum;
    if (lostCause && result.outcome !== 'beat' && result.outcome !== 'still') result.cause = lostCause;
    if (firstPass) {
      const e = firstPass.e, to = byNum(u, e.to), from = byNum(u, e.from), pairs = firstPass.plan;
      const g = (team, n) => { const p = byNum(team, n); return p ? p.group : '?'; };
      result.first = { dist: e.dist, ok: !!e.ok, toGroup: to ? to.group : '?', fromGroup: from ? from.group : '?', toNum: e.to, planned: !!pairs, shape: firstPass.shape };
      if (pairs) {
        result.first.toFree = !pairs.some((pr) => pr[1] === e.to);
        result.first.jobs = pairs.map((pr) => g(o, pr[0]) + '>' + g(u, pr[1]));
        result.first.free = u.players.filter((p) => p.number !== e.from && !pairs.some((pr) => pr[1] === p.number)).map((p) => p.group);
      }
    }
    if (rec) result.clip = LAB.makeClip(match, u, o, rec, result, lostAt, lostCause);
    return result;
  };

  // The test as a clip: frames cut off a few seconds after the ball is lost (or just after it reaches halfway), with the passes and the jobs.
  LAB.makeClip = function (match, u, o, rec, result, lostAt, lostCause) {
    const end = Math.min(result.outcome === 'beat' ? result.time + 1.5 : (lostAt == null ? result.time : lostAt + 4.5), match.clock), d1 = (v) => Math.round(v * 10);
    const nb = Math.min(rec.b.length, Math.floor(end / 0.25) + 1), nf = Math.min(rec.f.length, Math.floor(end / 0.5) + 2);
    const ev = [];
    match.events.forEach((e) => {
      if (e.t > end) return;
      if (e.type === 'pass' && e.team === u.id && e.tx != null) ev.push({ type: 'pass', t: Math.round(e.t * 10) / 10, from: e.from, to: e.to, ok: !!e.ok && e.outcome !== 'offside', outcome: e.outcome, by: e.by, p: Math.round(e.p * 100) / 100, dist: Math.round(e.dist), lane: Math.round(Math.min(e.lane, 30) * 10) / 10, press: Math.round(Math.min(e.press, 30) * 10) / 10, x: d1(e.x), y: d1(e.y), tx: d1(e.tx), ty: d1(e.ty) });
      else if (e.type === 'dribble' && e.team === u.id) ev.push({ type: 'dribble', t: Math.round(e.t * 10) / 10, player: e.player, ok: !!e.ok, x: d1(e.x), y: d1(e.y) });
      else if (e.type === 'tackle' && e.team === o.id) ev.push({ type: 'tackle', t: Math.round(e.t * 10) / 10, player: e.player, vs: e.vs, ok: !!e.ok, x: d1(e.x), y: d1(e.y) });
    });
    const names = { u: {}, o: {} }; u.players.forEach((p) => { names.u[p.number] = p.name; }); o.players.forEach((p) => { names.o[p.number] = p.name; });
    return { dt: 0.5, dtb: 0.25, end: Math.round(end * 100) / 100, mirror: u.attackDir === -1, ru: u.players.map((p) => p.number), ro: o.players.map((p) => p.number), f: rec.f.slice(0, nf), b: rec.b.slice(0, nb), plan: rec.plan.filter((p) => p.t <= end), ev, names, outcome: result.outcome === 'beat' ? 'beat' : 'lost', lost: lostAt != null ? Math.round(lostAt * 100) / 100 : null, kind: lostCause ? lostCause.kind : null };
  };

  // Many trials. onProgress(done, n) lets the page show how far it has got; the work is done in small batches so the page stays alive.
  LAB.run = function (league, opts, onProgress) {
    const n = opts.n || 100, userTeam = opts.user, oppTeam = opts.opp, base = opts.seed || (Date.now() & 0xffffff);
    let oppTactics = null; try { if (oppTeam.id !== league.userId) oppTactics = FM.aiTacticsFor(league, oppTeam, userTeam); } catch (e) { oppTactics = null; }
    const res = { n, counts: { beat: 0, lostNear: 0, lostOwn: 0, lostMid: 0, still: 0 }, shot: 0, goal: 0, times: [], passes: [], causes: [], passTotal: 0, passOk: 0, passP: 0, firsts: [], clips: {} };
    let i = 0;
    return new Promise((resolve) => {
      const batch = () => {
        const end = Math.min(n, i + 5);
        for (; i < end; i++) {
          const r = LAB.trial(league, userTeam, oppTeam, oppTactics, base + i * 7919, opts);
          res.counts[r.outcome]++;
          if (r.shot) res.shot++;
          if (r.goal) res.goal++;
          if (r.outcome === 'beat') res.times.push(r.time);
          res.passes.push(r.passes); res.passTotal += r.passTotal || 0; res.passOk += r.passes || 0; res.passP += r.passP || 0;
          if (r.cause) res.causes.push(Object.assign({ zone: r.outcome, shot: !!r.shot }, r.cause));
          if (r.first) res.firsts.push(Object.assign({ outcome: r.outcome }, r.first));
          if (r.clip) { const key = r.outcome === 'beat' ? 'beat' : (r.cause && r.cause.kind) || 'other'; const pool = res.clips[key] || (res.clips[key] = []); if (pool.length < 7 && r.clip.f.length > 3) pool.push(r.clip); }
        }
        if (onProgress) onProgress(i, n);
        if (i < n) setTimeout(batch, 0); else resolve(LAB.summarise(res));
      };
      batch();
    });
  };

  // Counts into shares with a 95% interval for each (Wilson's method), and the spread of the times.
  LAB.summarise = function (res) {
    const n = res.n, share = (k) => { const ci = S.wilson(k, n, 0.95); return { k, p: k / n, lo: ci.lo, hi: ci.hi }; };
    const out = { n, beat: share(res.counts.beat), lostNear: share(res.counts.lostNear), lostOwn: share(res.counts.lostOwn), lostMid: share(res.counts.lostMid), still: share(res.counts.still), shot: share(res.shot), goal: share(res.goal) };
    out.lost = share(res.counts.lostNear + res.counts.lostOwn + res.counts.lostMid);
    out.time = res.times.length > 1 ? { mean: S.mean(res.times), sd: S.sd(res.times, true), n: res.times.length } : null;
    out.passes = { mean: S.mean(res.passes), sd: S.sd(res.passes, true) };
    out.passStats = { perTest: res.passTotal / n, okPerTest: res.passOk / n, rate: res.passTotal ? res.passOk / res.passTotal : 0, expected: res.passTotal ? res.passP / res.passTotal : 0 };
    out.why = LAB.reduceCauses(res.causes || []);
    out.press = LAB.reduceFirsts(res.firsts || [], n);
    const LABEL = { beat: 'A build-up that worked', intercepted: 'A pass cut out', dribble: 'A dribble that lost the ball', tackle: 'Tackled on the ball', loose: 'A pass that went astray', offside: 'A pass to a player offside', other: 'Another way of losing it' };
    // Of the tests of each kind, show a typical one: the one whose number of passes is the middle one, not the luckiest or the strangest.
    const typical = (pool) => { const n = (c) => c.ev.filter((e) => e.type === 'pass').length, sorted = pool.slice().sort((x, y) => n(x) - n(y)); return sorted[Math.floor(sorted.length / 2)]; };
    out.clips = ['beat', 'intercepted', 'dribble', 'tackle', 'loose', 'offside', 'other'].filter((k) => res.clips && res.clips[k] && res.clips[k].length).map((k) => ({ key: k, label: LABEL[k], clip: typical(res.clips[k]) }));
    return out;
  };

  // The lost tests boiled down to a handful of counts, small enough to keep with each run.
  LAB.reduceCauses = function (list) {
    const w = { n: list.length, kinds: {}, zones: {}, players: {}, followed: 0, shots: 0, failedPasses: 0, distSum: 0, long: 0, laneSum: 0, pressSum: 0, tight: 0, gk: 0 };
    list.forEach((c) => {
      w.kinds[c.kind] = (w.kinds[c.kind] || 0) + 1; w.zones[c.zone] = (w.zones[c.zone] || 0) + 1;
      if (c.followed) w.followed++; if (c.shot) w.shots++;
      if (c.name) { const k = c.from; const q = w.players[k] || (w.players[k] = { name: c.name, group: c.group, n: 0 }); q.n++; }
      if (c.group === 'GK') w.gk++;
      if (c.kind === 'intercepted' || c.kind === 'loose') { w.failedPasses++; w.distSum += c.dist || 0; w.laneSum += c.lane || 0; w.pressSum += c.press || 0; if (c.dist > 30) w.long++; if (c.press != null && c.press < 4) w.tight++; }
    });
    return w;
  };

  // What happened at the first pass in every test: who the opposition had gone to, whether a free man was there, and whether he was used.
  LAB.reduceFirsts = function (list, n) {
    const w = { n: list.length, jobs: {}, freeSeen: 0, toFree: 0, toMarked: 0, beatFree: 0, beatMarked: 0, shortFirst: 0, longFirst: 0, shortOk: 0, longOk: 0, freeGroups: {}, noFree: 0, shape: { high: { n: 0, beat: 0 }, mid: { n: 0, beat: 0 }, low: { n: 0, beat: 0 } }, shapeN: 0, frontSum: 0, lastSum: 0, nearSum: 0, nearestSum: 0 };
    list.forEach((f) => {
      if (f.shape) { const sh = w.shape[f.shape.kind]; sh.n++; if (f.outcome === 'beat') sh.beat++; w.shapeN++; w.frontSum += f.shape.front; w.lastSum += f.shape.last; w.nearSum += f.shape.near; w.nearestSum += f.shape.nearest; }
      if (f.dist > 30) { w.longFirst++; if (f.ok) w.longOk++; } else { w.shortFirst++; if (f.ok) w.shortOk++; }
      if (!f.planned) return;
      const uniq = {}; (f.jobs || []).forEach((j) => { uniq[j] = (uniq[j] || 0) + 1; });
      Object.keys(uniq).forEach((j) => { w.jobs[j] = (w.jobs[j] || 0) + 1; });
      if (f.free && f.free.length) { w.freeSeen++; f.free.forEach((g) => { w.freeGroups[g] = (w.freeGroups[g] || 0) + 1; }); } else w.noFree++;
      if (f.toFree) { w.toFree++; if (f.outcome === 'beat') w.beatFree++; } else { w.toMarked++; if (f.outcome === 'beat') w.beatMarked++; }
    });
    return w;
  };

  const WORD = { GK: 'goalkeeper', CB: 'centre-back', FB: 'full-back', DM: 'defensive midfielder', CM: 'central midfielder', AM: 'attacking midfielder', WF: 'winger', ST: 'striker' };
  const PLURAL = { GK: 'goalkeepers', CB: 'centre-backs', FB: 'full-backs', DM: 'defensive midfielders', CM: 'central midfielders', AM: 'attacking midfielders', WF: 'wingers', ST: 'strikers' };
  LAB.words = WORD; LAB.plural = PLURAL;

  // The set-up before anything is run: who their press would go to, with every one of them doing his job, and who is left over on each side.
  // This is the same plan the engine draws in a test, without the chance of a player not following it.
  LAB.setup = function (user, opp, oppTactics) {
    const tac = oppTactics || opp.tactics, press = oppPressOf(tac), dir = user.attackDir;
    const ball = FM.toMetres(dir, 0.07, 0.6);
    const u = clone(user), o = clone(opp); o.tactics = Object.assign({}, o.tactics, tac); o.phasePos = null;
    u.phaseCtx = {}; o.phaseCtx = {}; o.attackDir = -u.attackDir;
    [[u, true], [o, false]].forEach(([t, has]) => t.players.forEach((p) => { const q = FM.targetFor(t, p, ball, has); p.x = q.x; p.y = q.y; }));
    const gk = u.players.find((p) => p.group === 'GK'); gk.x = ball.x - dir * 0.7; gk.y = ball.y;
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const chaser = o.players.filter((p) => p.group !== 'GK').sort((a, b) => dist(a, gk) - dist(b, gk))[0];
    const nPress = clamp(Math.round(1 + 5 * press), 2, 6), roles = ['ST', 'WF', 'AM', 'CM', 'DM'];
    const pressers = o.players.filter((p) => roles.indexOf(p.group) >= 0 && p !== chaser).sort((a, b) => (b.x * o.attackDir) - (a.x * o.attackDir)).slice(0, nPress);
    const taken = new Set(), pairs = [];
    pressers.forEach((p) => {
      const c = u.players.filter((q) => q !== gk && !taken.has(q)).map((q) => ({ q, d: dist(p, q) })).filter((x) => x.d < 45).sort((a, b) => a.d - b.d)[0];
      if (c) { taken.add(c.q); pairs.push({ def: p, att: c.q }); }
    });
    const busy = new Set(pairs.map((x) => x.def)); busy.add(chaser);
    const freeAtt = u.players.filter((q) => q !== gk && !taken.has(q) && dist(q, gk) < 45), freeDef = o.players.filter((p) => p.group !== 'GK' && !busy.has(p));
    const depth = (q) => FM.toTeamSpace(dir, q.x, q.y).d;
    const back = u.players.filter((q) => depth(q) < 0.3), backPressers = [chaser].concat(pairs.filter((x) => depth(x.att) < 0.3).map((x) => x.def));
    return { press, nPress, chaser, pairs, freeAtt, freeDef, back, backPressers, user: u, opp: o };
  };

  // Elena's reading of a run: what went wrong, why, and what could be tried. Every number is from the run itself.
  // ctx: { opp (name), changes (what was changed since the run before) }
  // What went wrong in a run, in Elena's own voice and as little as possible: a line on what she saw, and a line on what she would try. The
  // concepts behind the words (a lane, a free man, the press) are explained by the little ? buttons in the panel, not here.
  LAB.explain = function (r, ctx) {
    const w = r.why, out = [], pc = (x) => Math.round(x * 100) + '%', lost = w ? w.n : 0;
    if (!w || lost < 4) return { findings: [], lost };
    const kinds = Object.keys(w.kinds).sort((a, b) => w.kinds[b] - w.kinds[a]), top = kinds[0], k = w.kinds[top];
    // 1. How it was lost.
    const say1 = {
      intercepted: k + ' of the ' + lost + ' were passes that got cut out. Someone was always standing in the lane.',
      loose: k + ' of the ' + lost + ' were passes that just went astray, with nobody even touching them.',
      dribble: k + ' of the ' + lost + ' were players trying to take someone on and losing it. That is a brave thing to do in your own third.',
      tackle: k + ' of the ' + lost + ' were players getting tackled with the ball. Nobody got rid of it in time.',
      offside: k + ' of the ' + lost + ' were passes to someone who was offside.',
      other: 'The ball went in ways I could not put one name to, ' + lost + ' times.',
    }[top];
    const fix1 = { intercepted: 'Give the player on the ball a nearer outlet, or move someone so the defender is not stood on the line between them.', loose: 'Ask for a shorter pass, or someone who is better with the ball at his feet.', dribble: 'Give him a quick pass to play before the defender gets there.', tackle: 'He needs one more option, or a team-mate closer to him.', offside: 'Hold the runners a few metres deeper until the ball is played.', other: 'Watch one of the replays below to see what is happening.' }[top];
    out.push({ title: 'You lost it ' + lost + ' times out of ' + r.n, body: say1, fix: fix1 });
    // 2. One player.
    const pl = Object.keys(w.players).map((q) => w.players[q]).sort((a, b) => b.n - a.n)[0];
    if (pl && pl.n >= 3 && pl.n / lost >= 0.28) {
      const gk = pl.group === 'GK', sn = pl.name.split(' ').pop();
      out.push({ title: sn + ' keeps giving it away', body: 'He lost it ' + pl.n + ' times out of ' + lost + '.' + (gk ? ' He has the ball first every time, and when someone is close he kicks it long.' : ' I would look at where he stands, and how many safe passes he has.'), fix: gk ? 'Put a centre-back close beside him, so there is a short pass to play.' : 'Give him an easier pass, or take the marker away from him.' });
    }
    // 3. How far the failed passes travelled, or how marked the receivers were.
    if (w.failedPasses >= 4) {
      const md = w.distSum / w.failedPasses;
      if (md > 26 || w.long / w.failedPasses > 0.4) out.push({ title: 'Long balls are costing you', body: w.long + ' of the ' + w.failedPasses + ' passes that failed went over 30 m, ' + Math.round(md) + ' m on average. The further it goes, the likelier it fails.', fix: 'Shorter passes, or a midfielder dropping closer to the back line.' });
      else if (w.tight / w.failedPasses > 0.45) out.push({ title: 'Your receivers were marked', body: w.tight + ' of the ' + w.failedPasses + ' failed passes went to someone with a defender within 4 m.', fix: 'Spread out, or find the player who is not marked.' });
    }
    // 4. The opposition following a moved player.
    if (w.followed / lost >= 0.25 && w.followed >= 3) out.push({ title: 'They followed your moved players', body: 'In ' + w.followed + ' of the ' + lost + ' losses a defender had followed one of the players you moved, and he was right there when it went wrong.', fix: 'Move him less far, or use the space the defender leaves behind.' });
    // 5. Where it hurts.
    const near = (w.zones.lostNear || 0) + (w.zones.lostOwn || 0);
    if (near / lost >= 0.6) out.push({ title: 'It hurts where it happens', body: pc(near / lost) + ' of the losses were in your own third, and they got a shot after ' + w.shots + ' of them.', fix: 'Play a safe short pass near the keeper, so the first pass is not a gamble.' });
    // 6. A string of passes.
    const ps = r.passStats;
    if (ps && ps.perTest >= 4 && ps.rate > 0.5) {
      const n = Math.round(ps.perTest), chain = Math.pow(ps.rate, n);
      out.push({ title: 'Even good passing leaks', body: 'You complete ' + pc(ps.rate) + ' of your passes, but you play about ' + n + ' a test. All ' + n + ' working is only ' + pc(chain) + '.', fix: 'Fewer passes to get out means fewer chances to lose it.' });
    }
    return { findings: out, lost };
  };

  // Two runs compared on one measure: the difference in shares, its 95% interval and a two-sided test of "no real difference".
  LAB.compare = function (a, b, key) {
    const x = a[key], y = b[key], n1 = a.n, n2 = b.n, d = y.p - x.p;
    const pool = (x.k + y.k) / (n1 + n2), se0 = Math.sqrt(pool * (1 - pool) * (1 / n1 + 1 / n2)), z = se0 > 0 ? d / se0 : 0;
    const p = 2 * (1 - S.normCdf(Math.abs(z)));
    const se = Math.sqrt(x.p * (1 - x.p) / n1 + y.p * (1 - y.p) / n2), c = S.normInv(0.975);
    return { diff: d, lo: d - c * se, hi: d + c * se, z, p, need: LAB.nNeeded(x.p, y.p) };
  };
  // Tests per set-up needed to see a difference this big reliably (80% power, 5% level) if it is real.
  LAB.nNeeded = function (p1, p2) {
    const d = Math.abs(p2 - p1); if (d < 0.005) return null;
    const za = S.normInv(0.975), zb = S.normInv(0.8);
    return Math.ceil(Math.pow(za + zb, 2) * (p1 * (1 - p1) + p2 * (1 - p2)) / (d * d));
  };
  // A set-up in a few numbers, kept with each run so a run can say what changed since the last one.
  LAB.snapshot = function (team) {
    const keys = ['buildDirect', 'directness', 'tempo', 'risk', 'beatPress', 'attackWidth', 'lineHeight'];
    const tac = {}; keys.forEach((k) => { tac[k] = Math.round(team.tactics[k] * 100) / 100; });
    const pos = {}; team.players.forEach((p) => { const q = FM.phasePos(team, p, 'build'); pos[p.number] = [Math.round(q.d * 1000) / 1000, Math.round(q.w * 1000) / 1000, p.name]; });
    return { tac, pos, rules: (team.rules || []).filter((r) => !r.off).map((r) => FM.rulesWho(r) + ': ' + FM.rulesText(r)) };
  };
  LAB.changes = function (before, after) {
    if (!before) return [];
    const out = [], names = { buildDirect: 'Playing out from the back', directness: 'Progressing through midfield', tempo: 'Tempo', risk: 'Risk', beatPress: 'Beating the press', attackWidth: 'Width', lineHeight: 'Defensive line' };
    Object.keys(after.tac).forEach((k) => { if (before.tac[k] !== after.tac[k]) out.push(names[k] + ': ' + before.tac[k] + ' to ' + after.tac[k]); });
    const rb = before.rules || [], ra = after.rules || [];
    ra.forEach((t) => { if (rb.indexOf(t) < 0) out.push('Instruction added: ' + t.replace(/\.$/, '')); });
    rb.forEach((t) => { if (ra.indexOf(t) < 0) out.push('Instruction removed: ' + t.replace(/\.$/, '')); });
    Object.keys(after.pos).forEach((n) => {
      const a = after.pos[n], b = before.pos[n]; if (!b) return;
      const dx = (a[0] - b[0]) * L, dy = (a[1] - b[1]) * 68;
      if (Math.abs(dx) >= 2 || Math.abs(dy) >= 2) out.push(a[2] + ' moved ' + (Math.abs(dx) >= 2 ? Math.abs(Math.round(dx)) + ' m ' + (dx > 0 ? 'up' : 'back') : '') + (Math.abs(dx) >= 2 && Math.abs(dy) >= 2 ? ' and ' : '') + (Math.abs(dy) >= 2 ? Math.abs(Math.round(dy)) + ' m across' : ''));
    });
    return out;
  };
})();
