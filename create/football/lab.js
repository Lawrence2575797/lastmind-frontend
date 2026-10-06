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

  const clone = (t) => JSON.parse(JSON.stringify(t));       // teams are plain data
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

  // One trial. Returns { outcome, time, passes, bigChance, goal }.
  LAB.trial = function (league, userTeam, oppTeam, oppTactics, seed, opts) {
    const u = clone(userTeam), o = clone(oppTeam);
    o.phasePos = null;   // the test is always against the opposition as they normally set up, wherever their shirts were dragged on the board
    if (oppTactics) o.tactics = Object.assign({}, o.tactics, oppTactics);
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
    let nextRoll = RESPOND_EVERY, lostAt = null, lostZone = null, result = null, passes = 0, evSeen = 0;
    let guard = 0;
    while (!result && guard++ < 4000) {
      FM.stepMatch(match, STEP);
      if (match.clock >= nextRoll) { roll(match.clock, false); nextRoll += RESPOND_EVERY; }
      const h = holder(match), t = match.clock;
      const d = FM.toTeamSpace(dir, match.ball.x, match.ball.y).d;
      if (lostAt == null) {
        if (h === u && d >= 0.5) { result = { outcome: 'beat', time: t }; break; }
        if (h === o) { const dg = Math.hypot(match.ball.x - (dir === 1 ? 0 : L), match.ball.y - 34); lostAt = t; lostZone = dg < NEAR_GOAL ? 'lostNear' : d < 0.33 ? 'lostOwn' : 'lostMid'; }
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
    match.events.forEach((e) => { if (e.type === 'pass' && e.team === u.id && e.ok) passes++; });
    result.passes = passes;
    return result;
  };

  // Many trials. onProgress(done, n) lets the page show how far it has got; the work is done in small batches so the page stays alive.
  LAB.run = function (league, opts, onProgress) {
    const n = opts.n || 100, userTeam = opts.user, oppTeam = opts.opp, base = opts.seed || (Date.now() & 0xffffff);
    let oppTactics = null; try { if (oppTeam.id !== league.userId) oppTactics = FM.aiTacticsFor(league, oppTeam, userTeam); } catch (e) { oppTactics = null; }
    const res = { n, counts: { beat: 0, lostNear: 0, lostOwn: 0, lostMid: 0, still: 0 }, shot: 0, goal: 0, times: [], passes: [] };
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
          res.passes.push(r.passes);
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
    return out;
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
    return { tac, pos };
  };
  LAB.changes = function (before, after) {
    if (!before) return [];
    const out = [], names = { buildDirect: 'Playing out from the back', directness: 'Progressing through midfield', tempo: 'Tempo', risk: 'Risk', beatPress: 'Beating the press', attackWidth: 'Width', lineHeight: 'Defensive line' };
    Object.keys(after.tac).forEach((k) => { if (before.tac[k] !== after.tac[k]) out.push(names[k] + ': ' + before.tac[k] + ' to ' + after.tac[k]); });
    Object.keys(after.pos).forEach((n) => {
      const a = after.pos[n], b = before.pos[n]; if (!b) return;
      const dx = (a[0] - b[0]) * L, dy = (a[1] - b[1]) * 68;
      if (Math.abs(dx) >= 2 || Math.abs(dy) >= 2) out.push(a[2] + ' moved ' + (Math.abs(dx) >= 2 ? Math.abs(Math.round(dx)) + ' m ' + (dx > 0 ? 'up' : 'back') : '') + (Math.abs(dx) >= 2 && Math.abs(dy) >= 2 ? ' and ' : '') + (Math.abs(dy) >= 2 ? Math.abs(Math.round(dy)) + ' m across' : ''));
    });
    return out;
  };
})();
