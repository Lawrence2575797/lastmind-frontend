// The opposition's manager. Before a match, and at a few moments in it, a computer-run club looks at what it has seen of your side and sets its own
// team's rules, in exactly the vocabulary you use (see rules.js), so it can do nothing you could not.
//   Layer 1 reads figures from your recent matches (how you build, how far you pass, how much of the ball you keep) and picks a plan by rule.
//   Layer 2 sends those same figures, the match state and both squads to LastMind, which answers with rules and the manager's reasons. It runs before
//   kick-off, at half-time, after a goal and at 60 and 75 minutes, never on every pass. If it cannot be reached, Layer 1's plan stands.
(function () {
  const FM = (window.FM = window.FM || {});
  const S = (FM.scout = {});
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const L = 105, W = 68;
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const r2 = (v) => (v == null ? null : Math.round(v * 100) / 100);

  // ---------- what they have seen ----------
  S.profile = function (league) {
    const uid = league.userId;
    const rows = FM.statRows(league, 'me', { friendlies: true });
    const fxs = league.fixtures.filter((f) => f.played && f.log && (f.homeId === uid || f.awayId === uid)).slice(-4);
    const p = { matches: rows.length, logged: fxs.length, possession: r2(mean(rows.map((r) => r.possession).filter(isFinite))), passPct: r2(mean(rows.map((r) => r.passPct).filter(isFinite))), shots: r2(mean(rows.map((r) => r.shots))), xg: r2(mean(rows.map((r) => r.xg))), goals: r2(mean(rows.map((r) => r.goals))) };
    let own = 0, short = 0, long = 0, dist = 0, ok = 0, fin = 0, left = 0;
    fxs.forEach((f) => {
      const idx = f.log.teams.indexOf(uid);
      f.log.passes.forEach((ps) => {
        if (ps[1] !== idx) return;
        const d = idx === 0 ? ps[5] / L : 1 - ps[5] / L, w = idx === 0 ? ps[6] / W : 1 - ps[6] / W;
        if (d < 0.35) { own++; dist += ps[7]; if (ps[7] < 22) short++; if (ps[7] > 30) long++; if (ps[4] === 1) ok++; }
        else if (d > 0.65) { fin++; if (w < 0.5) left++; }
      });
    });
    p.build = own ? { n: own, short: r2(short / own), long: r2(long / own), meanDist: Math.round(dist / own), ok: r2(ok / own) } : null;
    p.leftShare = fin >= 10 ? r2(left / fin) : null;
    return p;
  };

  // ---------- Layer 1: a plan by rule ----------
  // Pressing you is one answer to a team that builds from the back. Sitting off is the other: if they are good at it, pressing only gets the press
  // beaten and leaves space behind it, so the manager keeps his shape in the middle of the pitch, shuts the lanes to the full-backs and the middle,
  // and lets the keeper and the centre-backs have the ball. He weighs the two, and says which he chose and why not the other.
  S.plan1 = function (profile) {
    const mk = (scope, when, effects) => FM.rulesClean({ scope, when, effects, source: 'scout' });
    const rules = [], scouted = [], tactics = {}, said = [];
    const b = profile.build;
    if (!profile.matches) return { source: 'scout', rules, tactics, scouted: ['They have not seen you play yet.'], rationale: 'We have not seen them play, so we will play our normal game and learn as we go.', alternative: '' };
    let plan = 'normal', alternative = '';
    if (b && b.n >= 8) {
      scouted.push('In their own third they played ' + Math.round(b.short * 100) + '% of their passes short (under 22 m) and ' + Math.round(b.long * 100) + '% long (over 30 m), completing ' + Math.round(b.ok * 100) + '%.');
      if (b.short >= 0.65) {
        // They build out a lot. Press them if they struggle with it; sit off if they are good at it or keep most of the ball.
        const good = b.ok >= 0.8 || (profile.possession != null && profile.possession >= 55);
        plan = good ? 'sitOff' : 'press';
        if (plan === 'press') {
          rules.push(mk({ kind: 'line', line: 'attack' }, { stage: ['press'] }, [{ type: 'closeDown', delta: 0.6 }]), mk({ kind: 'line', line: 'midfield' }, { stage: ['press'] }, [{ type: 'closeDown', delta: 0.4 }]));
          tactics.pressBuildUp = 0.2;
          said.push('They like to play out short and they do lose it under pressure, so we will press them high and close the short passes down.');
          alternative = 'We thought about sitting off them, but they give it away too often when pressed to let them settle.';
        } else {
          rules.push(
            // While the ball is deep in the other half: the forwards wait at about the halfway line and the midfield behind them, and nobody chases.
            mk({ kind: 'line', line: 'attack' }, { possession: 'without', zone: ['final_third'] }, [{ type: 'closeDown', delta: -0.8 }, { type: 'place', dm: { op: 'min', args: [{ attr: 'dm', of: { e: 'me' } }, 56] }, weight: 0.9, phase: 'without' }]),
            mk({ kind: 'line', line: 'midfield' }, { possession: 'without', zone: ['final_third'] }, [{ type: 'closeDown', delta: -0.3 }, { type: 'place', dm: { op: 'min', args: [{ attr: 'dm', of: { e: 'me' } }, 46] }, weight: 0.85, phase: 'without' }, { type: 'place', wm: { op: 'clamp', args: [{ attr: 'wm', of: { e: 'me' } }, 18, 50] }, weight: 0.6, phase: 'without' }]));
          tactics.pressBuildUp = -0.3;
          said.push('They build out well, so pressing them would only get us beaten and leave space behind. We will sit off, keep the middle shut and the lanes to their full-backs closed, and let the keeper and centre-backs have it.');
          alternative = 'We thought about pressing them, but they pass their way out of pressure too well to risk it.';
        }
      } else if (b.long >= 0.35) {
        plan = 'deep';
        rules.push(mk({ kind: 'line', line: 'defence' }, {}, [{ type: 'stepUp', on: true }]), mk({ kind: 'line', line: 'attack' }, { stage: ['press'] }, [{ type: 'closeDown', delta: -0.3 }]));
        tactics.lineHeight = -0.12; said.push('They go long a lot, so we will not press the goalkeeper. We will keep a deeper line and win the second balls.');
        alternative = 'We could have pressed them, but there is nothing to press when the ball goes over the top.';
      }
      if (plan === 'press' && b.ok < 0.78 && b.short >= 0.5) { rules.push(mk({ kind: 'line', line: 'midfield' }, { stage: ['press'] }, [{ type: 'closeDown', delta: 0.3 }])); }
    } else scouted.push('We have only a few matches to go on for how they build, so we are not changing much.');
    if (profile.possession != null) {
      scouted.push('They average ' + Math.round(profile.possession) + '% of the ball and ' + profile.shots + ' shots a match.');
      if (profile.possession > 55) { rules.push(mk({ kind: 'line', line: 'midfield' }, { possession: 'without', zone: ['middle_third'] }, [{ type: 'tackle', delta: 0.3 }, { type: 'closeDown', delta: 0.3 }])); said.push('They keep the ball well, so our midfield will challenge them in the middle of the pitch.'); }
    }
    return { source: 'scout', plan, rules, tactics, scouted: scouted.slice(0, 4), rationale: said.length ? said.join(' ') : 'Nothing in what we have seen suggests changing how we play.', alternative };
  };

  // Rules for the AI club go on its team object for the match; its tactics are re-prepared before every fixture, so a nudge there does not last.
  S.apply = function (team, plan) {
    const nums = team.players.concat(team.bench || []).map((p) => p.number);
    team.rules = (plan.rules || []).map((r) => FM.rulesClean(Object.assign({}, r, { source: plan.source }), nums)).filter(Boolean);
    Object.keys(plan.tactics || {}).forEach((k) => { if (team.tactics[k] != null) team.tactics[k] = clamp(team.tactics[k] + plan.tactics[k], 0, 1); });
  };
  // The rules in words, from the AI club's side (its own players are "ours" there).
  S.describe = function (rules, aiTeam, userTeam) {
    const keep = FM.rulesRoster, names = (t) => { const m = {}; (t.squad || []).concat(t.players || [], t.bench || []).forEach((p) => { m[p.number] = p.name; }); return m; };
    FM.rulesRoster = { own: names(aiTeam), opp: names(userTeam) };
    try { return (rules || []).map((r) => FM.rulesWho(r) + ': ' + FM.rulesText(r)); } finally { FM.rulesRoster = keep; }
  };

  // ---------- Layer 2: the manager, through LastMind ----------
  const squadOf = (t) => t.players.concat(t.bench || []).map((p) => ({ number: p.number, name: p.name, group: p.group || p.natural, role: (p.roleId || '').replace(/_/g, ' ') }));
  S.request = async function (league, aiTeam, userTeam, ctx) {
    const profile = ctx.profile || S.profile(league);
    const body = { stage: ctx.stage || 'prematch', minute: ctx.minute || 0, score: ctx.score || { us: 0, them: 0 }, scout: profile, squad: squadOf(aiTeam), opponent: squadOf(userTeam).map((p) => ({ number: p.number, name: p.name })), recent: ctx.recent || [], current: S.describe(aiTeam.rules || [], aiTeam, userTeam) };
    const out = await FM.api('/football/opponent-plan', body);
    return { source: 'ai', rules: out.rules || [], tactics: {}, rationale: out.rationale || '', alternative: out.alternative || '', scouted: out.scouted || [] };
  };
  const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };

  // For the build-up lab: one plan for a whole run, from Layer 2 if it can be reached (and the same one if nothing has changed since), else Layer 1.
  S.labPlan = async function (league, userTeam, aiTeam) {
    const profile = S.profile(league), p1 = S.plan1(profile);
    const key = hash(JSON.stringify([profile, (userTeam.rules || []).map((r) => r.id + r.off), aiTeam.id]));
    league.oppPlans = league.oppPlans || {};
    if (league.oppPlans[key]) return league.oppPlans[key];
    let plan = p1;
    try { plan = await S.request(league, aiTeam, userTeam, { stage: 'prematch', profile }); }
    catch (err) { plan = Object.assign({}, p1, { note: err && err.code === 'LOCK_LIMIT_REACHED' ? 'You are out of Locks, so their manager used the plan from the figures alone.' : 'LastMind could not be reached, so their manager used the plan from the figures alone.' }); return plan; }
    league.oppPlans[key] = plan;
    return plan;
  };

  // ---------- in a match ----------
  S.startMatch = function (league, match) {
    if (match.friendly || !match.aiTeams.length || (match.home.id !== league.userId && match.away.id !== league.userId)) return;
    const profile = S.profile(league), user = match.home.id === league.userId ? match.home : match.away;
    match.scoutProfile = profile; match.oppLog = [];
    match.aiTeams.forEach((t) => {
      const plan = S.plan1(profile); S.apply(t, plan);
      match.oppLog.push({ minute: 0, stage: 'prematch', source: 'scout', rationale: plan.rationale, alternative: plan.alternative, scouted: plan.scouted, rules: S.describe(t.rules, t, user) });
    });
  };
  const recentLines = (match, aiTeam) => match.events.filter((e) => e.type === 'goal' || (e.type === 'shot' && e.xg >= 0.25)).slice(-6).map((e) => Math.floor(e.t / 60) + "' " + (e.type === 'goal' ? 'goal for ' : 'big chance for ') + (e.team === aiTeam.id ? 'us' : 'them'));
  // Called every frame while a match is shown; asks the manager at the moments that matter.
  S.watch = function (league, match) {
    const sc = match._sc || (match._sc = { sent: {}, busy: false, goals: 0, lastUs: 0, offline: false });
    if (match.friendly || !match.aiTeams || !match.aiTeams.length || !match.oppLog || sc.offline || sc.busy || !FM.api) return;
    const ai = match.aiTeams[0], user = match.home.id === league.userId ? match.home : match.away;
    const us = match.score[ai.id] || 0, them = match.score[user.id] || 0, minute = match.clock / 60;
    let stage = null;
    if (!sc.sent.prematch && match.clock > 1) stage = 'prematch';
    else if (match.phase === 'halftime' && !sc.sent.halftime) stage = 'halftime';
    else if (us + them !== sc.goals) stage = us + them > sc.goals ? (us > sc.lastUs ? 'goal_for' : 'goal_against') : null;
    else if (minute >= 60 && !sc.sent.m60) stage = 'checkin60';
    else if (minute >= 75 && !sc.sent.m75) stage = 'checkin75';
    sc.goals = us + them; sc.lastUs = us;
    if (!stage) return;
    const key = stage === 'checkin60' ? 'm60' : stage === 'checkin75' ? 'm75' : stage;
    if (key === 'prematch' || key === 'halftime' || key === 'm60' || key === 'm75') sc.sent[key] = true;
    if (key === 'goal_for' || key === 'goal_against') { const k = key + Math.floor(minute / 5); if (sc.sent[k]) return; sc.sent[k] = true; }
    sc.busy = true;
    S.request(league, ai, user, { stage: stage.indexOf('checkin') === 0 ? 'checkin' : stage, minute: Math.round(minute), score: { us, them }, profile: match.scoutProfile, recent: recentLines(match, ai) }).then((plan) => {
      sc.busy = false;
      if (plan.rules.length || stage === 'prematch') { S.apply(ai, Object.assign({}, plan, { tactics: {} })); }
      match.oppLog.push({ minute: Math.round(minute), stage, source: 'ai', rationale: plan.rationale, alternative: plan.alternative, scouted: plan.scouted, rules: S.describe(ai.rules, ai, user), unchanged: !plan.rules.length && stage !== 'prematch' });
      match.oppLogDirty = true;
    }).catch((err) => {
      sc.busy = false; sc.offline = true;
      match.oppLog.push({ minute: Math.round(minute), stage, source: 'scout', rationale: err && err.code === 'LOCK_LIMIT_REACHED' ? 'You are out of Locks, so their manager is sticking to the plan from the figures.' : 'Their manager could not be reached, so they are sticking to the plan from the figures.', scouted: [], rules: [], note: true });
      match.oppLogDirty = true;
    });
  };
})();
