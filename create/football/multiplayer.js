// Playing the football manager with other people, by game code. Two kinds of game share all of this:
//   a league  - the eight clubs, one manager at each club somebody has taken and the computer running the rest, played over the fourteen rounds;
//   a match   - a one-off game: two managers each pick a club from the league, prepare, and play each other once.
// It is asynchronous. Each manager prepares in their own time and hands in a plan for the round (formation, line-up, tactics, instructions). When
// everyone who is seated has handed one in, whichever browser sees that first plays the round. The match engine is deterministic, so a round
// played from the same league and the same plans gives every browser exactly the same results; the server only keeps the plans and which rounds
// have been played (see lastmind-compile-backend/src/routes/footballMultiplayer.ts).
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const PLAN_KEYS = ['tactics', 'phasePos', 'phaseBall', 'pages', 'pageDefaults', 'shape', 'rules', 'scenarios', 'defScenarios'];
  const ROUNDS = 14;

  // ---------- a manager's plan for a round ----------
  FM.mpPlanOf = function (team) {
    const plan = { formationKey: team.formationKey, lineup: FM.snapshotLineup(team), instr: {} };
    PLAN_KEYS.forEach((k) => { plan[k] = team[k] === undefined ? null : JSON.parse(JSON.stringify(team[k])); });
    team.squad.forEach((p) => { if (p.instr && Object.keys(p.instr).length) plan.instr[p.id] = JSON.parse(JSON.stringify(p.instr)); });
    return plan;
  };
  FM.mpApplyPlan = function (team, plan) {
    if (!plan) return;
    if (plan.lineup) FM.restoreLineup(team, plan.lineup);
    PLAN_KEYS.forEach((k) => { if (plan[k] !== null && plan[k] !== undefined) team[k] = JSON.parse(JSON.stringify(plan[k])); });
    team.squad.forEach((p) => { p.instr = plan.instr && plan.instr[p.id] ? JSON.parse(JSON.stringify(plan.instr[p.id])) : {}; });
    if (FM.inferShapeTactics) FM.inferShapeTactics(team);
  };

  // ---------- building the same league everywhere ----------
  const teamIds = () => FM.TEAM_DEFS.map((d, i) => 't' + (i + 1));
  const indexOfTeam = (id) => Math.max(0, parseInt(String(id).slice(1), 10) - 1);
  function seedOf(code, runSeed) { let h = runSeed | 0; for (let i = 0; i < code.length; i++) h = (Math.imul(h, 31) + code.charCodeAt(i)) | 0; return Math.abs(h) % 900000000 + 100; }
  function buildLeague(game, myTeam) {
    const league = FM.createLeague({ userIndex: indexOfTeam(myTeam), tier: 'gcse', seed: game.seed, runSeed: game.runSeed });
    league.mp = { code: game.code, kind: game.kind, teamId: myTeam, hostTeam: game.state.hostTeam, localRound: 0, state: game.state, submitted: -1, polledAt: 0 };
    league.humanIds = Object.keys(game.state.seats);
    if (game.kind === 'match') { league.fixtures = []; league.news = []; }   // a one-off match is a single fixture, made when both managers are seated
    league.captainIntroSeen = false;
    return league;
  }
  // A one-off match has no fixture until both managers are seated: the host's club plays at home.
  function ensureMatchFixture(league, state) {
    if (league.mp.kind !== 'match' || league.fixtures.length) return;
    const ids = Object.keys(state.seats);
    if (ids.length < 2) return;
    const home = state.hostTeam, away = ids.find((t) => t !== home);
    league.fixtures = [{ id: 'mp0', round: 0, homeId: home, awayId: away, played: false, hg: null, ag: null, seed: seedOf(league.mp.code, league.runSeed || 0), stats: null }];
  }

  // ---------- talking to the server ----------
  const call = (path, body) => FM.api('/football-mp/' + path, body);
  FM.mpCreate = async function (kind, teamId, name, deadlineMinutes) {
    return call('create', { kind, seed: FM.WORLD_SEED, teams: teamIds(), teamId, name, deadlineMinutes: deadlineMinutes || 1440 });
  };
  FM.mpLookup = (code) => call('state', { code });
  FM.mpJoin = (code, teamId, name) => call('join', { code, teamId, name });

  // Start (or come back to) a game on this browser from what the server holds.
  FM.mpOpen = function (game, teamId) {
    const league = buildLeague(game, teamId);
    ensureMatchFixture(league, game.state);
    return league;
  };

  // ---------- playing a round ----------
  function advanceToRound(league, round) {
    let guard = 0;
    while (!(FM.isMatchday(league.day) && FM.roundOfDay(league.day) === round) && guard++ < 400) { league.day++; FM.recoverDay(league); }
  }
  // The same result in every browser: the plans handed in are applied to the clubs, then the round is played with one fixed club standing in as
  // "the manager" (the computer's scouting reads that club's matches, and it must be the same club for everyone).
  // (played in small steps with a breath between them, so the page stays alive while a round of matches is worked out)
  const breathe = () => new Promise((r) => setTimeout(r, 0));
  async function simulateFixtureAsync(league, fx, rec) {
    const match = FM.startFixture(league, fx);
    let guard = 0, n = 0;
    if (rec) recordFrame(rec, match);
    while (match.phase !== 'fulltime' && guard++ < 200000) {
      if (match.phase === 'halftime') FM.startSecondHalf(match);
      FM.stepMatch(match, 0.1);
      if (rec && n % 10 === 0) recordFrame(rec, match);
      if (++n % 300 === 0) await breathe();
    }
    if (rec) {
      recordFrame(rec, match);
      const keep = { goal: 1, foul: 1, drama: 1, shot: 1, sub: 1 };
      rec.events = match.events.filter((e) => keep[e.type] && (e.type !== 'foul' || e.card)).map((e) => ({ type: e.type, t: e.t, team: e.team, player: e.player, card: e.card || null, kind: e.kind || null, outcome: e.outcome || null, both: !!e.both }));
      rec.names = {};
      [match.home, match.away].forEach((t) => { rec.names[t.id] = {}; t.squad.forEach((p) => { rec.names[t.id][p.number] = p.name; }); });
    }
    FM.finishFixture(league, fx, match);
  }
  FM.mpResolve = async function (league, round, plans, seatedIds) {
    const mp = league.mp, me = league.userId, ids = Object.keys(plans || {});
    ids.forEach((id) => { const t = FM.teamById(league, id); if (t) FM.mpApplyPlan(t, plans[id].plan || plans[id]); });
    const keepHuman = league.humanIds, keepWatch = league.watchIds;
    // every seated manager's club is left to its manager's plan: one who did not hand one in plays on with their last plan (or the club as it stands)
    league.humanIds = Array.from(new Set(ids.concat(seatedIds || []))); league.watchIds = [me]; league.userId = mp.hostTeam;
    const out = [];
    try {
      if (mp.kind === 'league') advanceToRound(league, round);
      const todo = league.fixtures.filter((f) => f.round === round && !f.played);
      for (const f of todo) {
        const mine = mp.teamId && (f.homeId === mp.teamId || f.awayId === mp.teamId);
        const rec = mine ? { round, homeId: f.homeId, awayId: f.awayId, frames: [], events: [], names: {}, seen: false } : null;
        await simulateFixtureAsync(league, f, rec);
        if (rec) FM.mpReplay = rec;
        out.push({ id: f.homeId, hg: f.hg, ag: f.ag }); if (mp.onProgress) mp.onProgress(out.length, todo.length); }
      FM.aiAfterRound(league, round);
      if (FM.makeNews) { try { FM.makeNews(league, round); } catch (e) { /* the news is a nicety */ } }
      if (mp.kind === 'league') { league.day++; FM.recoverDay(league); }
    } finally {
      league.userId = me; league.humanIds = keepHuman; league.watchIds = keepWatch;
    }
    return out;
  };

  // The plans for a round, with a last plan standing in for any manager who did not hand one in: the latest they ever did hand in.
  function withLast(state, round) {
    const out = Object.assign({}, state.plans[String(round)] || {});
    Object.keys(state.seats || {}).forEach((t) => {
      if (out[t]) return;
      for (let r = round - 1; r >= 0; r--) { const p = state.plans[String(r)] && state.plans[String(r)][t]; if (p) { out[t] = p; break; } }
    });
    return out;
  }
  // One go round the loop: fetch, catch up on rounds played elsewhere, play the current one if everybody is in. Returns what changed.
  FM.mpSync = async function (league, opts) {
    const mp = league.mp;
    if (mp.busyAt && Date.now() - mp.busyAt < 600000) return { changed: false, busy: true };   // already playing a round (a flag left by a closed page times out)
    mp.busyAt = Date.now();
    try { return await syncOnce(league, opts); } finally { mp.busyAt = 0; }
  };
  async function syncOnce(league, opts) {
    const mp = league.mp;
    const g = await call('state', { code: mp.code });
    if (!g || !g.state || g.preview) return { changed: false };
    mp.state = g.state; mp.polledAt = Date.now();
    league.humanIds = Object.keys(g.state.seats);
    ensureMatchFixture(league, g.state);
    let changed = false;
    // rounds the others have already played: play them here too, with the plans that were handed in
    while (mp.localRound < g.state.round) {
      await FM.mpResolve(league, mp.localRound, withLast(g.state, mp.localRound), Object.keys(g.state.seats));
      mp.localRound++; changed = true;
    }
    // the round being waited for: everybody seated has handed their plan in, or the host chooses to go on
    const key = String(g.state.round), handed = g.state.plans[key] || {}, seated = Object.keys(g.state.seats);
    const everyone = seated.length > 0 && seated.every((t) => handed[t]);
    const idle = Date.now() - Date.parse(g.state.roundAt || 0) > (g.state.deadlineMs || 24 * 60 * 60 * 1000) && !!g.state.roundAt;
    const ready = (g.state.kind === 'match' ? seated.length === 2 : true) && (everyone || idle);
    if (!g.state.finished && ready && mp.localRound === g.state.round) {
      const scores = await FM.mpResolve(league, g.state.round, withLast(g.state, g.state.round), seated);
      mp.localRound++; changed = true;
      try { const after = await call('played', { code: mp.code, round: g.state.round, scores, force: !everyone }); if (after && after.state) mp.state = after.state; } catch (e) { /* another browser got there first: the next poll shows it */ }
    }
    if (changed) FM.saveLeague(league);
    return { changed };
  }
  FM.mpSubmit = async function (league) {
    const mp = league.mp, team = FM.teamById(league, mp.teamId), round = mp.state.round;
    const g = await call('submit', { code: mp.code, teamId: mp.teamId, round, plan: FM.mpPlanOf(team) });
    if (g && g.state) mp.state = g.state;
    mp.submitted = round;
    FM.saveLeague(league);
    return g;
  };


  // ---------- watching the match before the result ----------
  // When a round is played, the match of the club you manage is recorded as it is simulated (where everyone was once a second, and what happened),
  // and kept in memory. Once every plan is in, you can watch it back (you cannot change anything), and the score is only shown when it ends.
  FM.mpReplay = null;
  FM.mpWatch = (league, rep, done) => replayModal(league, rep, done);
  const DEADLINES = [[30, '30 minutes'], [60, '1 hour'], [180, '3 hours'], [360, '6 hours'], [720, '12 hours'], [1440, '1 day'], [2880, '2 days'], [4320, '3 days'], [10080, '1 week']];
  const fmtLeft = (ms) => {
    if (ms <= 0) return 'now';
    const m = Math.ceil(ms / 60000);
    if (m < 90) return m + ' minute' + (m === 1 ? '' : 's');
    const h = Math.round(m / 60);
    return h < 48 ? h + ' hour' + (h === 1 ? '' : 's') : Math.round(h / 24) + ' days';
  };
  function recordFrame(rec, match) {
    const r1 = (v) => Math.round(v * 10);
    rec.frames.push({ t: Math.round(match.clock), b: [r1(match.ball.x), r1(match.ball.y)], h: match.home.players.map((p) => [p.number, r1(p.x), r1(p.y)]), a: match.away.players.map((p) => [p.number, r1(p.x), r1(p.y)]) });
  }
  function replayModal(league, rep, done) {
    const old = document.getElementById('mpReplay'); if (old) old.remove();
    const wrap = document.createElement('div');
    wrap.id = 'mpReplay'; wrap.className = 'mp-modal';
    const hn = clubName(league, rep.homeId), an = clubName(league, rep.awayId);
    wrap.innerHTML = `<div class="mp-box mp-replay" role="dialog" aria-modal="true" aria-label="The match">
      <div class="mpr-score"><span>${esc(hn)}</span><b id="mprH">0</b><b>:</b><b id="mprA">0</b><span>${esc(an)}</span><em id="mprClock">0'</em></div>
      <canvas id="mprPitch" width="680" height="440"></canvas>
      <div class="mpr-feed" id="mprFeed"></div>
      <div class="row"><button type="button" id="mprPause">Pause</button><button type="button" data-sp="30">30x</button><button type="button" data-sp="60" class="on">60x</button><button type="button" data-sp="120">120x</button><button type="button" data-sp="240">240x</button><button type="button" id="mprSkip" class="primary">Skip to the result</button></div>
      <p class="note">Everyone has locked in. This is the match as it was played: nothing can be changed now.</p></div>`;
    document.body.appendChild(wrap);
    const q = (s) => wrap.querySelector(s), cv = q('#mprPitch'), cx = cv.getContext('2d');
    const home = FM.teamById(league, rep.homeId), away = FM.teamById(league, rep.awayId);
    const kit = (t, other) => { const k = t && t.kit ? t.kit : {}; return { shirt: k.shirt || '#c0392b', number: k.number || '#fff' }; };
    const hk = kit(home), ak = kit(away);
    const fr = rep.frames, endT = fr.length ? fr[fr.length - 1].t : 0;
    const L = 105, W = 68, X = cv.width / L, Y = cv.height / W;
    let t = 0, speed = 60, paused = false, shown = 0, last = performance.now(), raf = 0, finished = false;
    const scoreAt = (tt) => { let h = 0, a = 0; rep.events.forEach((e) => { if (e.type === 'goal' && e.t <= tt) { if (e.team === rep.homeId) h++; else a++; } }); return [h, a]; };
    const line = (txt) => { const d = document.createElement('div'); d.innerHTML = txt; q('#mprFeed').prepend(d); };
    const nameOf = (id, n) => (rep.names[id] && rep.names[id][n]) || ('number ' + n);
    const text = (e) => {
      const club = clubName(league, e.team), min = Math.floor(e.t / 60) + "'";
      if (e.type === 'goal') return '<b>' + min + ' GOAL</b> ' + esc(nameOf(e.team, e.player)) + ' (' + esc(club) + ')';
      if (e.type === 'foul' && (e.card === 'red' || e.card === 'second yellow')) return '<b>' + min + ' RED CARD</b> ' + esc(nameOf(e.team, e.player)) + ' (' + esc(club) + ')';
      if (e.type === 'foul' && e.card === 'yellow') return min + ' Yellow card: ' + esc(nameOf(e.team, e.player)) + ' (' + esc(club) + ')';
      if (e.type === 'drama') return '<b>' + min + ({ scuffle: ' FLASHPOINT', managers: ' TOUCHLINE ROW', penalty: ' CONTROVERSY', invader: ' PITCH INVADER' }[e.kind] || ' INCIDENT') + '</b> ' + ({ scuffle: 'Players square up', managers: e.both ? 'Both managers sent to the stands' : club + ' manager sent to the stands', penalty: 'A contentious penalty for ' + esc(club), invader: 'Play is held up' }[e.kind] || '');
      if (e.type === 'shot' && e.outcome === 'saved') return min + ' Saved: ' + esc(nameOf(e.team, e.player)) + ' (' + esc(club) + ')';
      if (e.type === 'sub') return min + ' Substitution, ' + esc(club);
      return null;
    };
    const draw = () => {
      cx.fillStyle = '#2d7a3c'; cx.fillRect(0, 0, cv.width, cv.height);
      cx.strokeStyle = 'rgba(255,255,255,.85)'; cx.lineWidth = 2;
      cx.strokeRect(1, 1, cv.width - 2, cv.height - 2);
      cx.beginPath(); cx.moveTo(cv.width / 2, 0); cx.lineTo(cv.width / 2, cv.height); cx.stroke();
      cx.beginPath(); cx.arc(cv.width / 2, cv.height / 2, 9.15 * X, 0, Math.PI * 2); cx.stroke();
      [0, 1].forEach((side) => { const x0 = side ? cv.width - 16.5 * X : 0; cx.strokeRect(x0, cv.height / 2 - 20.16 * Y, 16.5 * X, 40.32 * Y); const g = side ? cv.width : -2 * X; cx.strokeRect(side ? cv.width : -2 * X, cv.height / 2 - 3.66 * Y, 2 * X, 7.32 * Y); void g; });
      let k = 0; while (k < fr.length - 1 && fr[k + 1].t <= t) k++;
      const f = fr[k]; if (!f) return;
      const dot = (p, col) => { cx.beginPath(); cx.arc(p[1] / 10 * X, p[2] / 10 * Y, 7, 0, Math.PI * 2); cx.fillStyle = col.shirt; cx.fill(); cx.strokeStyle = '#fff'; cx.lineWidth = 1.5; cx.stroke(); cx.fillStyle = col.number; cx.font = '700 9px sans-serif'; cx.textAlign = 'center'; cx.fillText(String(p[0]), p[1] / 10 * X, p[2] / 10 * Y + 3); };
      f.h.forEach((p) => dot(p, hk)); f.a.forEach((p) => dot(p, ak));
      cx.beginPath(); cx.arc(f.b[0] / 10 * X, f.b[1] / 10 * Y, 4.5, 0, Math.PI * 2); cx.fillStyle = '#fff'; cx.fill(); cx.strokeStyle = '#000'; cx.stroke();
    };
    const finish = () => { if (finished) return; finished = true; cancelAnimationFrame(raf); wrap.remove(); rep.seen = true; if (done) done(); };
    const tick = (now) => {
      const dt = Math.min(0.2, (now - last) / 1000); last = now;
      if (!paused) t = Math.min(endT, t + dt * speed);
      for (; shown < rep.events.length && rep.events[shown].t <= t; shown++) { const s = text(rep.events[shown]); if (s) line(s); }
      const sc = scoreAt(t); q('#mprH').textContent = sc[0]; q('#mprA').textContent = sc[1];
      q('#mprClock').textContent = Math.floor(t / 60) + "'";
      draw();
      if (t >= endT) { setTimeout(finish, 1200); return; }
      raf = requestAnimationFrame(tick);
    };
    q('#mprPause').addEventListener('click', () => { paused = !paused; q('#mprPause').textContent = paused ? 'Play' : 'Pause'; });
    wrap.querySelectorAll('[data-sp]').forEach((b) => b.addEventListener('click', () => { speed = +b.dataset.sp; wrap.querySelectorAll('[data-sp]').forEach((x) => x.classList.toggle('on', x === b)); }));
    q('#mprSkip').addEventListener('click', finish);
    raf = requestAnimationFrame(tick);
  }

  // ---------- the screen ----------
  const clubName = (league, id) => { const t = FM.teamById(league, id); return t ? t.name : id; };
  FM.renderMp = function (host, league, hooks) {
    if (!host) return;
    const mp = league.mp;
    if (!mp) { host.innerHTML = '<div class="card"><p class="desc">This is not a game with other managers.</p></div>'; return; }
    const st = mp.state || { seats: {}, plans: {}, round: 0, played: [], teams: [] }, you = mp.teamId;
    const round = st.round, handed = (st.plans && st.plans[String(round)]) || {}, seated = Object.keys(st.seats || {});
    const waiting = seated.filter((t) => !handed[t]);
    const finished = !!st.finished;
    const isMatch = mp.kind === 'match';
    const yourIn = !!handed[you];
    const allClubs = isMatch ? seated : (st.teams || []);
    const seatRow = (t) => {
      const s = st.seats[t];
      const status = !s ? '<span class="mp-ai">Run by the computer</span>' : handed[t] ? '<span class="mp-in">Plan handed in</span>' : '<span class="mp-wait">Preparing</span>';
      return `<tr class="${t === you ? 'me' : ''}"><td class="l">${esc(clubName(league, t))}</td><td class="l">${s ? esc(s.name) + (t === you ? ' (you)' : '') : '-'}</td><td class="l">${finished ? '' : status}</td></tr>`;
    };
    const last = (st.played || [])[st.played.length - 1];
    const due = st.roundAt ? Date.parse(st.roundAt) + (st.deadlineMs || 24 * 60 * 60 * 1000) : null;
    const dueHtml = !finished && due ? `<p class="note mp-due">Plans are due ${due - Date.now() > 0 ? 'within <b>' + fmtLeft(due - Date.now()) + '</b>' : '<b>now</b>'}. A manager who has not locked in by then is left to play on with their last plan, and the round is played. Rounds are played every ${fmtLeft(st.deadlineMs || 24 * 60 * 60 * 1000)} at most.</p>` : '';
    const rep = FM.mpReplay && !FM.mpReplay.seen && last && FM.mpReplay.round === last.round ? FM.mpReplay : null;
    const lastHtml = rep
      ? `<div class="card"><h2>${isMatch ? 'The match has been played' : 'Round ' + (last.round + 1) + ' has been played'}</h2><p class="desc">Everyone has locked in. Watch your match back before you see the score: nothing can be changed.</p><div class="row"><button class="primary" id="mpWatch">Watch the match</button><button id="mpSkipWatch">Show me the result</button></div></div>`
      : last && last.scores && last.scores.length
      ? `<div class="card"><h2>${isMatch ? 'Result' : 'Round ' + (last.round + 1) + ' results'}</h2><div class="rounds">${last.scores.map((s) => {
        const fx = league.fixtures.find((f) => f.round === last.round && f.homeId === s.id);
        const away = fx ? fx.awayId : '';
        return `<div class="res${(s.id === you || away === you) ? ' me' : ''}"><span>${esc(clubName(league, s.id))}</span><b>${s.hg}-${s.ag}</b><span>${esc(clubName(league, away))}</span></div>`;
      }).join('')}</div>${last.forced ? '<p class="note">The round was played without every manager: the clubs of those who had not handed in a plan were run by the computer.</p>' : ''}</div>`
      : '';
    const cta = finished
      ? `<p class="desc">${isMatch ? 'The match has been played.' : 'The season is over.'}</p>`
      : isMatch && seated.length < 2
        ? '<p class="desc">Waiting for the other manager to join with this code. You can prepare in the meantime: set up your team, then lock in your plan.</p>'
        : yourIn
          ? `<p class="desc">Your plan is in${waiting.length ? ', waiting for ' + waiting.map((t) => esc(st.seats[t].name)).join(' and ') : ': playing the round now'}. You can change it and hand it in again until the round is played.</p>`
          : `<p class="desc">Prepare your team, then lock in your plan for ${isMatch ? 'the match' : 'round ' + (round + 1)}. Nothing happens until you do.</p>`;
    host.innerHTML = `<div class="mp-view">
      <div class="card"><div class="mp-code"><span>Game code</span><b id="mpCode">${esc(mp.code)}</b><button type="button" id="mpCopy">Copy</button></div>
        <p class="desc">${isMatch ? 'A one-off match between two managers.' : 'A league game: eight clubs, with the computer running any club without a manager.'} Share the code, and anyone signed in to LastMind can join from the start screen.</p></div>
      <div class="card"><h2>${isMatch ? 'The two managers' : 'The clubs'}</h2>
        <div class="tablewrap"><table class="data"><thead><tr><th class="l">Club</th><th class="l">Manager</th><th class="l">${finished ? '' : 'Round ' + (round + 1)}</th></tr></thead><tbody>${allClubs.map(seatRow).join('')}</tbody></table></div>
        ${cta}${dueHtml}
        <div class="row">
          ${finished ? '' : `<button class="primary" id="mpSubmit">${yourIn ? 'Hand in my plan again' : 'Lock in my plan'}</button><button id="mpPrepare">Prepare my team</button>`}
          
          <button id="mpRefresh">Check for news</button>
        </div>
        <p class="err" id="mpErr"></p>
      </div>
      ${lastHtml}
      ${isMatch ? '' : `<p class="note">Round ${Math.min(ROUNDS, round + 1)} of ${ROUNDS}. The table and results are on the Home and League screens, and every client plays the same rounds from the same plans.</p>`}
    </div>`;
    const err = (m) => { const e = host.querySelector('#mpErr'); if (e) e.textContent = m || ''; };
    const q = (s) => host.querySelector(s);
    q('#mpCopy').addEventListener('click', () => { try { navigator.clipboard.writeText(mp.code); q('#mpCopy').textContent = 'Copied'; } catch (e) { q('#mpCopy').textContent = mp.code; } });
    const refresh = async (opts) => {
      try { const r = await FM.mpSync(league, opts); if (hooks && hooks.afterSync) hooks.afterSync(r.changed); } catch (e) { err(e.message || 'Could not reach LastMind.'); }
      if (host.isConnected) FM.renderMp(host, league, hooks);
    };
    q('#mpRefresh').addEventListener('click', () => refresh());
    const sub = q('#mpSubmit');
    if (sub) sub.addEventListener('click', async () => {
      sub.disabled = true; err(''); sub.textContent = 'Handing in your plan...';
      mp.onProgress = (i, n) => { sub.textContent = 'Playing the round (' + i + ' of ' + n + ' matches)...'; };
      try { await FM.mpSubmit(league); await FM.mpSync(league); if (hooks && hooks.afterSync) hooks.afterSync(true); } catch (e) { err(e.message || 'Could not hand in your plan.'); }
      if (host.isConnected) FM.renderMp(host, league, hooks);
    });
    const watch = q('#mpWatch'); if (watch) watch.addEventListener('click', () => { replayModal(league, FM.mpReplay, () => { if (host.isConnected) FM.renderMp(host, league, hooks); }); });
    const skipW = q('#mpSkipWatch'); if (skipW) skipW.addEventListener('click', () => { FM.mpReplay.seen = true; FM.renderMp(host, league, hooks); });
    const prep = q('#mpPrepare'); if (prep) prep.addEventListener('click', () => hooks && hooks.prepare && hooks.prepare());
    // look for news while this screen is open
    if (host._mpTimer) clearInterval(host._mpTimer);
    if (!finished) host._mpTimer = setInterval(() => { if (!host.isConnected || host.hidden) { clearInterval(host._mpTimer); return; } refresh(); }, 6000);
  };

  // ---------- starting or joining a game, from the start screen ----------
  FM.mpMenu = function (hooks, first) {
    const old = document.getElementById('mpModal'); if (old) old.remove();
    const wrap = document.createElement('div');
    wrap.id = 'mpModal'; wrap.className = 'mp-modal';
    wrap.innerHTML = '<div class="mp-box" role="dialog" aria-modal="true" aria-label="Play with other managers"></div>';
    document.body.appendChild(wrap);
    const box = wrap.querySelector('.mp-box');
    const close = () => wrap.remove();
    const clubs = FM.TEAM_DEFS.map((d, i) => ({ id: 't' + (i + 1), name: d.name, tag: d.tag || '' }));
    const clubOptions = (taken) => clubs.map((c) => `<option value="${c.id}"${taken && taken[c.id] ? ' disabled' : ''}>${esc(c.name)}${taken && taken[c.id] ? ' (taken by ' + esc(taken[c.id].name) + ')' : ''}</option>`).join('');
    const saved = (() => { try { return localStorage.getItem('lm_football_mp_name') || ''; } catch (e) { return ''; } })();
    const rememberName = (n) => { try { localStorage.setItem('lm_football_mp_name', n); } catch (e) { /* fine */ } };
    const finish = async (game, teamId) => { close(); const league = FM.mpOpen(game, teamId); if (hooks && hooks.start) hooks.start(league); };
    const needSignIn = (e) => (e && e.code === 'NO_SESSION' ? 'Sign in to LastMind to play with other people: <a href="/account/?mode=login">log in or sign up</a>.' : esc((e && e.message) || 'Something went wrong. Try again.'));
    const home = () => {
      box.innerHTML = `<h2>Play with other managers</h2>
        <p class="desc">Each manager takes a club and prepares in their own time. When everyone has handed in a plan the round is played.</p>
        <div class="mp-choices">
          <button type="button" data-go="league"><b>Start a league game</b><span>Eight clubs, fourteen rounds. Any club without a manager is run by the computer.</span></button>
          <button type="button" data-go="match"><b>Play a one-off match</b><span>Two managers each pick a club and play each other once.</span></button>
          <button type="button" data-go="join"><b>Join with a code</b><span>Somebody has sent you a game code.</span></button>
        </div>
        <div class="row"><button type="button" id="mpClose">Back</button></div>`;
      box.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => ({ league: () => create('league'), match: () => create('match'), join }[b.dataset.go])()));
      box.querySelector('#mpClose').addEventListener('click', close);
    };
    const create = (kind) => {
      box.innerHTML = `<h2>${kind === 'league' ? 'Start a league game' : 'Play a one-off match'}</h2>
        <label>Your name<input type="text" id="mpName" maxlength="24" value="${esc(saved)}" placeholder="What the other managers see"></label>
        <label>Your club<select id="mpClub">${clubOptions()}</select></label>
        <label>${kind === 'league' ? 'A round is played at the latest every' : 'Both managers must lock in within'}<select id="mpDeadline">${DEADLINES.map(([m, l]) => `<option value="${m}"${m === 1440 ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
        <p class="note">Everyone must lock in a plan by then. A manager who has not is left to play on with their last plan, and the round is played.</p>
        <p class="err" id="mpMsg"></p>
        <div class="row"><button class="primary" type="button" id="mpGo">Create the game</button><button type="button" id="mpBack">Back</button></div>`;
      box.querySelector('#mpBack').addEventListener('click', home);
      box.querySelector('#mpGo').addEventListener('click', async () => {
        const btn = box.querySelector('#mpGo'), msg = box.querySelector('#mpMsg'), name = box.querySelector('#mpName').value.trim() || 'Manager';
        btn.disabled = true; msg.textContent = 'Setting the game up...'; rememberName(name);
        try { const g = await FM.mpCreate(kind, box.querySelector('#mpClub').value, name, +box.querySelector('#mpDeadline').value); await finish(g, g.you); }
        catch (e) { btn.disabled = false; msg.innerHTML = needSignIn(e); }
      });
    };
    const join = () => {
      box.innerHTML = `<h2>Join with a code</h2>
        <label>Game code<input type="text" id="mpCodeIn" maxlength="6" placeholder="e.g. K7M2QX" autocapitalize="characters" style="text-transform:uppercase"></label>
        <div id="mpSeats"></div>
        <p class="err" id="mpMsg"></p>
        <div class="row"><button class="primary" type="button" id="mpLook">Find the game</button><button type="button" id="mpBack">Back</button></div>`;
      box.querySelector('#mpBack').addEventListener('click', home);
      let game = null;
      const look = box.querySelector('#mpLook'), msg = box.querySelector('#mpMsg'), seats = box.querySelector('#mpSeats');
      look.addEventListener('click', async () => {
        if (game) {
          const name = box.querySelector('#mpName').value.trim() || 'Manager', club = box.querySelector('#mpClub').value;
          look.disabled = true; msg.textContent = 'Joining...'; rememberName(name);
          try { const g = await FM.mpJoin(game.code, club, name); await finish(g, g.you || club); }
          catch (e) { look.disabled = false; msg.innerHTML = needSignIn(e); }
          return;
        }
        const code = box.querySelector('#mpCodeIn').value.trim().toUpperCase();
        if (code.length !== 6) { msg.textContent = 'A game code is six letters and numbers.'; return; }
        look.disabled = true; msg.textContent = 'Looking...';
        try {
          const g = await FM.mpLookup(code);
          look.disabled = false; msg.textContent = '';
          if (g.you) { await finish(g, g.you); return; }   // already sitting in it: come back in
          game = g;
          const seatsTaken = g.state.seats || {}, free = (g.kind === 'match' ? (g.state.teams && g.state.teams.length ? clubs.map((c) => c.id) : clubs.map((c) => c.id)) : g.state.teams);
          if (g.state.finished) { msg.textContent = 'That game has finished.'; game = null; return; }
          const taken = {}; Object.keys(seatsTaken).forEach((t) => { taken[t] = seatsTaken[t]; });
          seats.innerHTML = `<p class="desc">${g.kind === 'match' ? 'A one-off match' : 'A league game'} started by ${esc((seatsTaken[g.state.hostTeam] || {}).name || 'a manager')}.</p>
            <label>Your name<input type="text" id="mpName" maxlength="24" value="${esc(saved)}"></label>
            <label>Your club<select id="mpClub">${clubOptions(taken)}</select></label>`;
          const sel = seats.querySelector('#mpClub'); const firstFree = Array.from(sel.options).find((o) => !o.disabled && free.indexOf(o.value) >= 0); if (firstFree) sel.value = firstFree.value;
          look.textContent = 'Join the game';
        } catch (e) { look.disabled = false; msg.innerHTML = needSignIn(e); }
      });
    };
    ({ league: () => create('league'), match: () => create('match'), join }[first] || home)();
  };
})();
