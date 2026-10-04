// Opposition reports. A report is built only from what a club has already done: its previous matches' results, numbers and
// tactical settings. It says how many matches each figure rests on, it can be read as often as you like, and it can be out of
// date, because a club adapts and will not necessarily play next time as it played before.
(function () {
  const FM = (window.FM = window.FM || {});
  const S = FM.STAT;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const f2 = (v, d) => (typeof v === 'number' && isFinite(v) ? v.toFixed(d == null ? 2 : d) : 'n/a');
  const fin = (v) => typeof v === 'number' && isFinite(v);
  const state = { teamId: null };

  const TACTIC_ROWS = [
    ['pressing', 'Pressing', 'sit back', 'press hard'], ['pressBuildUp', 'Pressing their build-up', 'let them play out', 'press them high'], ['lineHeight', 'Defensive line', 'deep', 'high'], ['tempo', 'Tempo', 'slow', 'fast'],
    ['directness', 'Directness through midfield', 'patient', 'direct'], ['buildDirect', 'Playing out from the back', 'short', 'long'], ['risk', 'Risk in possession', 'safe', 'ambitious'],
    ['counterAttack', 'Counter-attack after winning the ball', 'hold shape', 'counter at once'], ['counterPress', 'Counter-press after losing it', 'drop back', 'win it back'],
    ['tackleAggression', 'Tackling', 'on feet', 'hard'], ['attackWidth', 'Width in attack', 'narrow', 'wide'], ['shootFreedom', 'Shooting', 'work it in', 'shoot on sight'],
  ];
  const STAT_ROWS = [
    ['goals', 'Goals scored', 1], ['goalsAgainst', 'Goals conceded', 1], ['shots', 'Shots', 1], ['shotsAgainst', 'Shots conceded', 1], ['xg', 'Expected goals (xG)', 2], ['xga', 'xG conceded', 2],
    ['possession', 'Possession (%)', 0], ['passPct', 'Pass completion (%)', 0], ['tackleWinPct', 'Challenges won (%)', 0], ['fouls', 'Fouls', 1], ['corners', 'Corners', 1], ['offsides', 'Offsides', 1],
  ];
  const matchDay = (round) => 5 + 7 * round;

  // everything a report knows about one club
  FM.opponentReport = function (league, teamId) {
    const team = FM.teamById(league, teamId);
    const rows = FM.statRows(league, 'all', { friendlies: true }).filter((r) => r.teamId === teamId);
    const everyone = FM.statRows(league, 'all', { friendlies: true });
    const rep = { team, n: rows.length, rows };
    rep.record = { w: rows.filter((r) => r.win).length, d: rows.filter((r) => r.draw).length, l: rows.filter((r) => r.loss).length };
    const leagueRows = rows.filter((r) => !r.friendly);
    rep.friendlyCount = rows.length - leagueRows.length; rep.leagueCount = leagueRows.length;
    rep.rounds = leagueRows.length ? [leagueRows[0].round + 1, leagueRows[leagueRows.length - 1].round + 1] : null;
    rep.lastRound = leagueRows.length ? leagueRows[leagueRows.length - 1].round : null;
    rep.daysSinceLast = rep.lastRound == null ? null : league.day - matchDay(rep.lastRound);
    const lg = {};
    const mean = (a) => (a.length ? S.mean(a) : NaN);
    rep.tactics = TACTIC_ROWS.map(([k, label, lo, hi]) => {
      const mine = rows.map((r) => (r.tactics ? r.tactics[k] : NaN)).filter(fin), theirs = everyone.filter((r) => r.teamId !== teamId).map((r) => (r.tactics ? r.tactics[k] : NaN)).filter(fin);
      return { key: k, label, lo, hi, n: mine.length, mean: mean(mine), sd: mine.length > 1 ? S.sd(mine, true) : NaN, league: mean(theirs), last: mine.length ? mine[mine.length - 1] : NaN };
    });
    rep.stats = STAT_ROWS.map(([k, label, d]) => {
      const mine = rows.map((r) => r[k]).filter(fin), others = everyone.filter((r) => r.teamId !== teamId).map((r) => r[k]).filter(fin);
      const ci = mine.length >= 3 ? S.meanCI(mine, 0.95) : null;
      return { key: k, label, d, n: mine.length, mean: mean(mine), ci, league: mean(others), last: mine.length ? mine[mine.length - 1] : NaN };
    });
    const forms = {}; rows.forEach((r) => { forms[r.formation] = (forms[r.formation] || 0) + 1; });
    rep.formations = Object.keys(forms).map((k) => [k, forms[k]]).sort((a, b) => b[1] - a[1]);
    // goals include the pre-season friendlies (they are in the match summaries); shots are counted in league matches only
    const fg = {};
    (league.friendlies || []).filter((f) => f.played && f.summary).forEach((f) => f.summary.goals.forEach((g) => { if (g.team === teamId) fg[g.n] = (fg[g.n] || 0) + 1; }));
    rep.scorers = team.squad.map((p) => ({ p, goals: (p.stats ? p.stats.goals : 0) + (fg[p.number] || 0), shots: p.stats ? p.stats.shots : 0 })).filter((x) => x.goals || x.shots).sort((a, b) => (b.goals - a.goals) || (b.shots - a.shots)).slice(0, 4);
    // the strength of the team as it would line up now
    const avg = (group, key) => { const ps = team.players.filter((p) => group.indexOf(p.group) >= 0); return ps.length ? S.mean(ps.map((p) => (key === 'gk' ? p.ratings.gk : p.ratings[key]))) : NaN; };
    rep.lines = [
      ['Goalkeeper', avg(['GK'], 'gk')], ['Defence (tackling)', avg(['CB', 'FB'], 'tackling')], ['Midfield (passing)', avg(['DM', 'CM'], 'passing')],
      ['Attack (finishing)', avg(['AM', 'WF', 'ST'], 'finishing')], ['Pace of the whole team', S.mean(team.players.map((p) => p.ratings.pace))],
    ];
    const lgLine = (group, key) => S.mean([].concat.apply([], league.teams.filter((t) => t.id !== teamId).map((t) => t.players.filter((p) => group.indexOf(p.group) >= 0).map((p) => (key === 'gk' ? p.ratings.gk : p.ratings[key])))));
    rep.linesLeague = [lgLine(['GK'], 'gk'), lgLine(['CB', 'FB'], 'tackling'), lgLine(['DM', 'CM'], 'passing'), lgLine(['AM', 'WF', 'ST'], 'finishing'), S.mean([].concat.apply([], league.teams.filter((t) => t.id !== teamId).map((t) => t.players.map((p) => p.ratings.pace))))];
    // meetings with the user's club
    rep.meetings = league.fixtures.filter((f) => f.played && ((f.homeId === teamId && f.awayId === league.userId) || (f.awayId === teamId && f.homeId === league.userId)));
    return rep;
  };

  // How a club has lined up in each phase of play, from the matches it has played. Newer matches count for more (each match back
  // counts 0.8 of the one after it) and pre-season friendlies for half, so the picture moves through the season as the club does.
  // Uses the formation the club has used most (by weight), so slots are comparable.
  FM.scoutedShape = function (league, teamId) {
    const list = [];
    (league.friendlies || []).filter((f) => f.played && f.scout && f.scout[teamId]).forEach((f) => list.push({ fx: f, friendly: true }));
    league.fixtures.filter((f) => f.played && f.scout && f.scout[teamId]).sort((a, b) => a.round - b.round).forEach((f) => list.push({ fx: f, friendly: false }));
    if (!list.length) return null;
    list.forEach((m, i) => { m.w = Math.pow(0.8, list.length - 1 - i) * (m.friendly ? 0.5 : 1); });
    const byForm = {};
    list.forEach((m) => { const sc = m.fx.scout[teamId]; const seen = {}; Object.keys(sc).forEach((ph) => Object.keys(sc[ph]).forEach((k) => { const f = k.split('|')[0]; if (!seen[f]) { seen[f] = 1; byForm[f] = (byForm[f] || 0) + m.w; } })); });
    const formation = Object.keys(byForm).sort((a, b) => byForm[b] - byForm[a])[0];
    const phases = {};
    list.forEach((m) => {
      const sc = m.fx.scout[teamId];
      Object.keys(sc).forEach((ph) => Object.keys(sc[ph]).forEach((k) => {
        const [f, slot] = k.split('|');
        if (f !== formation) return;
        const [n, d, w] = sc[ph][k], ww = m.w * n;
        const cell = ((phases[ph] = phases[ph] || {})[slot] = phases[ph][slot] || { ws: 0, d: 0, w: 0, n: 0 });
        cell.ws += ww; cell.d += d * ww; cell.w += w * ww; cell.n += n;
      }));
    });
    Object.keys(phases).forEach((ph) => Object.keys(phases[ph]).forEach((slot) => { const c = phases[ph][slot]; c.d /= c.ws; c.w /= c.ws; }));
    return { formation, matches: list.length, friendlies: list.filter((m) => m.friendly).length, phases };
  };

  const label3 = (v, lo, hi) => (v < 0.4 ? 'low (' + lo + ')' : v > 0.6 ? 'high (' + hi + ')' : 'middling');
  function bar(v, league, lo, hi) {
    const l = Math.max(0, Math.min(1, ((league != null ? league : 0.5) - (lo)) / (hi - lo))), p = Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
    return `<span class="tbar"><i style="width:${(100 * p).toFixed(0)}%"></i><b style="left:${(100 * l).toFixed(0)}%"></b></span>`;
  }

  FM.renderReports = function (host, league) {
    const me = league.userId, others = league.teams.filter((t) => t.id !== me);
    const next = FM.nextUserFixture(league);
    const nextOpp = next ? (next.homeId === me ? next.awayId : next.homeId) : null;
    if (!state.teamId || state.teamId === me) state.teamId = nextOpp || others[0].id;
    const rep = FM.opponentReport(league, state.teamId);
    const t = rep.team, isNext = state.teamId === nextOpp;
    const parts = [];
    if (rep.friendlyCount) parts.push(`${rep.friendlyCount} pre-season friendl${rep.friendlyCount > 1 ? 'ies' : 'y'}`);
    if (rep.leagueCount) parts.push(`${rep.leagueCount} league match${rep.leagueCount > 1 ? 'es' : ''}`);
    const sample = rep.n === 0 ? 'No previous matches: nothing is known about how this club plays yet.' : `Based on <b>${rep.n} match${rep.n > 1 ? 'es' : ''}</b> (${parts.join(' and ')})` + (rep.leagueCount ? `, the latest league match ${rep.daysSinceLast <= 0 ? 'today' : rep.daysSinceLast + ' day' + (rep.daysSinceLast > 1 ? 's' : '') + ' ago'}.` : ', all played before the season began.');
    const friendlyNote = rep.friendlyCount ? '<p class="note warnnote">Pre-season friendlies are a poor guide. Clubs try out ideas and line-ups in them and nobody is playing for points, so what they show can differ from how the club plays when it matters.</p>' : '';
    const small = rep.n > 0 && rep.n < 4 ? `<p class="note warnnote">That is a small sample. A club's last ${rep.n} match${rep.n > 1 ? 'es' : ''} may not be typical, and a single odd result can move every average here.</p>` : '';
    const pm = (s, d) => (!fin(s.mean) ? 'n/a' : f2(s.mean, d) + (s.ci ? ` <span class="pm">(${f2(s.ci.lo, d)} to ${f2(s.ci.hi, d)})</span>` : ''));

    host.innerHTML = `<div style="display:grid;gap:16px">
      <div class="card">
        <h2>Opposition report</h2>
        <label>Club<select id="rpTeam">${others.map((o) => `<option value="${o.id}"${o.id === state.teamId ? ' selected' : ''}>${esc(o.name)}${o.id === nextOpp ? ' (your next opponent)' : ''}</option>`).join('')}</select></label>
        <div class="fixture-big">${esc(t.name)}</div>
        <p class="desc">${sample} ${rep.n ? `Record: won ${rep.record.w}, drawn ${rep.record.d}, lost ${rep.record.l}.` : ''}</p>
        ${small}${friendlyNote}
        <p class="note">This report describes what they did, not what they will do. Managers adapt, especially to a club that has just beaten them, so the more your approach has changed since they last scouted you, the less this tells you. You can read it as often as you like, and it does not get updated until a match has been played.</p>
      </div>
      <div class="two">
        <div class="card"><h2>How they set up and play</h2>${rep.n ? `
          <p class="note">Their average setting across those matches, with the average of every other club shown as a tick. The wider the "varies" note, the less reliable the average is.</p>
          <div class="tablewrap"><table class="data"><thead><tr><th class="l">Setting</th><th class="l">Their average</th><th class="l">Reading</th></tr></thead><tbody>${rep.tactics.map((r) => {
            const lo = r.key === 'attackWidth' ? 0.7 : 0, hi = r.key === 'attackWidth' ? 1.25 : 1;
            const v = r.key === 'attackWidth' ? (r.mean - 0.7) / 0.55 : r.mean;
            const lg = r.key === 'attackWidth' ? (r.league - 0.7) / 0.55 : r.league;
            return `<tr><td class="l">${r.label}</td><td class="l">${bar(v, lg, 0, 1)}</td><td class="l">${label3(v, r.lo, r.hi)}${r.n > 1 && r.sd > 0.07 ? ' <span class="pm">varies (sd ' + f2(r.sd, 2) + ')</span>' : ''}</td></tr>`;
          }).join('')}</tbody></table></div>
          <p class="desc">Formation: ${rep.formations.map(([k, n]) => `${k} (${n} match${n > 1 ? 'es' : ''})`).join(', ')}.</p>` : '<p class="note">No matches to read it from yet.</p>'}</div>
        <div class="card"><h2>Their numbers</h2>${rep.n ? `
          <div class="tablewrap"><table class="data"><thead><tr><th class="l">Per match</th><th>Their average</th><th>Other clubs</th><th>Last match</th></tr></thead><tbody>${rep.stats.map((s) => `<tr><td class="l">${s.label}</td><td>${pm(s, s.d)}</td><td>${f2(s.league, s.d)}</td><td>${f2(s.last, s.d)}</td></tr>`).join('')}</tbody></table></div>
          <p class="note">Brackets are a 95% confidence interval for their true average, shown once there are three matches or more. A wide bracket means the average could easily be off.</p>` : '<p class="note">No matches to read it from yet.</p>'}</div>
      </div>
      <div class="two">
        <div class="card"><h2>Who to watch</h2>${rep.scorers.length ? `<div class="tablewrap"><table class="data"><thead><tr><th class="l">Player</th><th class="l">Position</th><th>Goals</th><th>Shots (league)</th></tr></thead><tbody>${rep.scorers.map((x) => `<tr><td class="l">${esc(x.p.name)} (${x.p.number})</td><td class="l">${x.p.natural}</td><td>${x.goals}</td><td>${x.shots}</td></tr>`).join('')}</tbody></table></div><p class="note">Goals include pre-season friendlies; shots are league matches only. Goals are rare events, so a leading scorer after a few matches is often partly luck.</p>` : '<p class="note">Nobody has scored or shot yet.</p>'}
          <h2 style="margin-top:6px">The team as it would line up</h2>
          <div class="tablewrap"><table class="data"><thead><tr><th class="l">Area</th><th>Rating</th><th>Other clubs</th></tr></thead><tbody>${rep.lines.map((l, i) => `<tr><td class="l">${l[0]}</td><td>${f2(l[1], 0)}</td><td>${f2(rep.linesLeague[i], 0)}</td></tr>`).join('')}</tbody></table></div>
          <p class="note">Average ratings of the players in their current starting line-up. This can change before the match if they make selection changes.</p></div>
        <div class="card"><h2>Against you before</h2>${rep.meetings.length ? rep.meetings.map((f) => {
          const home = FM.teamById(league, f.homeId), away = FM.teamById(league, f.awayId), theirs = f.stats[state.teamId];
          const dev = TACTIC_ROWS.map(([k, label]) => { const avg = (rep.tactics.find((x) => x.key === k) || {}).mean; const v = theirs.tactics ? theirs.tactics[k] : NaN; return { label, diff: v - avg }; }).filter((d) => fin(d.diff) && Math.abs(d.diff) >= 0.08).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 4);
          return `<p class="desc"><b>Round ${f.round + 1}: ${esc(home.name)} ${f.hg}-${f.ag} ${esc(away.name)}</b></p><p class="desc">They played ${theirs.formation}. Compared with their own average, against you they used ${dev.length ? dev.map((d) => (d.diff > 0 ? 'more ' : 'less ') + d.label.toLowerCase()).join(', ') : 'much the same settings'}.</p>`;
        }).join('') + '<p class="note">A club that lost to you usually changes something. A club that beat you may stay as it was. Either way, expect some change.</p>' : '<p class="note">You have not met them yet.</p>'}
        ${isNext ? '<p class="desc"><b>This is your next opponent.</b> Open the Tactics page to prepare, and the Hypotheses page to write down what you expect before you see it.</p>' : ''}</div>
      </div></div>`;
    host.querySelector('#rpTeam').addEventListener('change', (e) => { state.teamId = e.target.value; FM.renderReports(host, league); });
  };
})();
