// A player's recent form, told as a story: a rating out of 10 for each match he played, what has been going well, where it keeps going wrong,
// and the moments that mattered. Everything is read from the logs of this season's league matches as they were played.
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const LEN = 105;
  const ord = (m) => m + (m % 10 === 1 && m !== 11 ? 'st' : m % 10 === 2 && m !== 12 ? 'nd' : m % 10 === 3 && m !== 13 ? 'rd' : 'th');
  const minute = (t) => Math.floor((t || 0) / 60) + 1;

  // One player's decisions in one match.
  function readMatch(f, tid, num) {
    const L = f.log, side = L.teams.indexOf(tid), out = { passes: [], tackles: [], dribbles: [], shots: [], faced: [] };
    if (side < 0) return out;
    (L.passes || []).forEach((q) => { if (q[1] === side && q[2] === num && q[4] !== 2) out.passes.push({ t: q[0], ok: q[4] === 1, dist: q[7], press: q[9], p: q[10] }); });
    (L.tackles || []).forEach((q) => { if (q[1] === side && q[2] === num) out.tackles.push({ t: q[0], ok: q[4] === 1, depth: q[7] }); });
    (L.dribbles || []).forEach((q) => { if (q[1] === side && q[2] === num) out.dribbles.push({ t: q[0], ok: q[3] === 1, p: q[7] }); });
    (L.other || []).forEach((q) => {
      if (q.type !== 'shot') return;
      if (q.team === tid && q.player === num) out.shots.push({ t: q.t, goal: q.outcome === 'goal', onTarget: q.outcome === 'saved' || q.outcome === 'goal' });
      else if (q.team !== tid && (q.outcome === 'saved' || q.outcome === 'goal')) out.faced.push({ t: q.t, saved: q.outcome === 'saved' });
    });
    return out;
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // A mark out of 10 from how much better or worse than expected his decisions went.
  function mark(ev, isGK) {
    let s = 0;
    ev.passes.forEach((q) => { s += ((q.ok ? 1 : 0) - (q.p == null ? 0.75 : q.p)) * 0.35; });
    ev.tackles.forEach((q) => { s += q.ok ? 0.22 : -0.2; });
    ev.dribbles.forEach((q) => { s += ((q.ok ? 1 : 0) - (q.p == null ? 0.5 : q.p)) * 0.45; });
    ev.shots.forEach((q) => { s += q.goal ? 1.5 : q.onTarget ? 0.2 : -0.08; });
    if (isGK) ev.faced.forEach((q) => { s += q.saved ? 0.4 : -0.7; });
    return Math.round(clamp(6.3 + s, 3, 10) * 10) / 10;
  }
  const involvement = (ev, isGK) => ev.passes.length + ev.tackles.length + ev.dribbles.length + ev.shots.length + (isGK ? ev.faced.length : 0);

  // How everyone in the league does at each kind of thing, so "going wrong" means worse than most.
  function leagueRates(league) {
    const fx = FM.devFixtures ? FM.devFixtures(league) : [], c = {};
    const add = (k, ok) => { const r = c[k] || (c[k] = { n: 0, k: 0 }); r.n++; if (ok) r.k++; };
    fx.forEach((f) => {
      (f.log.passes || []).forEach((q) => { if (q[4] === 2) return; const ok = q[4] === 1; if (q[7] >= 26) add('long', ok); else if (q[7] < 18) add('short', ok); if (q[9] < 3) add('marked', ok); });
      (f.log.tackles || []).forEach((q) => add('tackle', q[4] === 1));
      (f.log.dribbles || []).forEach((q) => add('dribble', q[3] === 1));
    });
    const out = {}; Object.keys(c).forEach((k) => { out[k] = c[k].n ? c[k].k / c[k].n : null; });
    return out;
  }

  FM.playerForm = function (league, p, team) {
    const fx = (FM.devFixtures ? FM.devFixtures(league) : []).filter((f) => f.log && f.log.teams.indexOf(team.id) >= 0);
    const isGK = p.natural === 'GK', num = p.number;
    const games = [];
    fx.forEach((f) => {
      const ev = readMatch(f, team.id, num);
      if (involvement(ev, isGK) < 4) return;
      const opp = f.log.teams.find((t) => t !== team.id), tm = FM.teamById(league, opp);
      games.push({ round: f.round, opp: tm ? tm.name : 'Opponent', rating: mark(ev, isGK), ev });
    });
    games.sort((a, b) => a.round - b.round);
    return { games: games.slice(-6), all: games };
  };

  const cls = (r) => (r >= 7.5 ? 'hi' : r >= 6.5 ? 'ok' : r >= 5.5 ? 'mid' : 'lo');
  const STAT_WORDS = { pace: 'pace', dribbling: 'dribbling', passing: 'passing', finishing: 'finishing', tackling: 'tackling', heading: 'heading', composure: 'composure', stamina: 'stamina', gk: 'goalkeeping' };

  FM.renderForm = function (host, league, p, team) {
    if (!host) return;
    const F = FM.playerForm(league, p, team), last = p.name.split(' ').slice(-1)[0], isGK = p.natural === 'GK';
    if (!F.games.length) {
      const m = (FM.squadMarks ? FM.squadMarks([p])[p.id] : null) || {};
      const good = Object.keys(m).filter((k) => m[k] === 'good').map((k) => STAT_WORDS[k] || k), bad = Object.keys(m).filter((k) => m[k] === 'bad').map((k) => STAT_WORDS[k] || k);
      host.innerHTML = `<section class="pf"><h3>Recent form</h3><p class="pf-none">${esc(last)} has not played a league match yet, so there is no form to read. His mark out of 10, and the moments that decide it, will appear here after he has.</p>${good.length || bad.length ? `<div class="pf-cols">${good.length ? `<div><h4>On paper</h4><ul><li>Clearly above most players in his position for ${esc(good.join(', '))}.</li></ul></div>` : ''}${bad.length ? `<div><h4>To watch</h4><ul><li>Below most players in his position for ${esc(bad.join(', '))}.</li></ul></div>` : ''}</div>` : ''}</section>`;
      return;
    }
    const g = F.games, avg = g.reduce((a, x) => a + x.rating, 0) / g.length;
    const half = Math.ceil(g.length / 2), early = g.slice(0, half).reduce((a, x) => a + x.rating, 0) / half, late = g.slice(-half).reduce((a, x) => a + x.rating, 0) / half;
    const trend = g.length >= 3 ? (late - early > 0.5 ? 'and climbing' : late - early < -0.5 ? 'and dropping off' : 'and steady') : '';
    const verdict = avg >= 7.6 ? 'In outstanding form' : avg >= 7.0 ? 'In good form' : avg >= 6.4 ? 'Solid, without standing out' : avg >= 5.7 ? 'Inconsistent' : 'Struggling';
    const base = leagueRates(league);
    // his decisions across the recent matches, by kind
    const T = {}; const add = (k, ok) => { const r = T[k] || (T[k] = { n: 0, k: 0 }); r.n++; if (ok) r.k++; };
    g.forEach((x) => {
      x.ev.passes.forEach((q) => { if (q.dist >= 26) add('long', q.ok); else if (q.dist < 18) add('short', q.ok); if (q.press < 3) add('marked', q.ok); });
      x.ev.tackles.forEach((q) => add('tackle', q.ok)); x.ev.dribbles.forEach((q) => add('dribble', q.ok));
      x.ev.shots.forEach((q) => add('shot', q.goal)); if (isGK) x.ev.faced.forEach((q) => add('save', q.saved));
    });
    const issue = {
      long: (r) => `His long passes keep missing: only ${r.k} of ${r.n} found a team-mate, and most players in the league do better.`,
      marked: (r) => `He gives it away under pressure: ${r.n - r.k} of ${r.n} passes with a defender close ended up lost.`,
      short: (r) => `Even the simple passes are going astray: ${r.n - r.k} of his ${r.n} short ones.`,
      tackle: (r) => `He is losing his duels: he won only ${r.k} of ${r.n} challenges.`,
      dribble: (r) => `He keeps being dispossessed: ${r.n - r.k} of ${r.n} take-ons ended with him losing the ball.`,
      shot: (r) => (r.k === 0 ? `Wasteful in front of goal: ${r.n} shots and none of them went in.` : `Not enough end product: ${r.k} goal${r.k === 1 ? '' : 's'} from ${r.n} shots.`),
      save: (r) => `Beaten too often: ${r.n - r.k} of the ${r.n} shots he faced got past him.`,
    };
    const good = {
      long: (r) => `His long passing is a weapon: ${r.k} of ${r.n} found their man.`,
      marked: (r) => `Calm when closed down: ${r.k} of ${r.n} passes under pressure still found a team-mate.`,
      short: (r) => `Reliable on the ball: ${r.k} of ${r.n} short passes found their target.`,
      tackle: (r) => `Winning his duels: ${r.k} of ${r.n} challenges.`,
      dribble: (r) => `Hard to dispossess: ${r.k} of ${r.n} take-ons came off.`,
      shot: (r) => `Clinical: ${r.k} goal${r.k === 1 ? '' : 's'} from ${r.n} shots.`,
      save: (r) => `Keeping them out: ${r.k} of the ${r.n} shots he faced were saved.`,
    };
    const shotBase = 0.12, saveBase = 0.68;
    const weigh = Object.keys(T).map((k) => {
      const r = T[k], rate = r.k / r.n, ref = k === 'shot' ? shotBase : k === 'save' ? saveBase : base[k];
      return { k, r, gap: ref == null ? 0 : rate - ref, n: r.n };
    }).filter((x) => x.n >= (x.k === 'shot' ? 3 : 4));
    const bad = weigh.filter((x) => x.gap <= -0.1).sort((a, b) => a.gap * Math.sqrt(b.n) - b.gap * Math.sqrt(a.n)).slice(0, 3);
    const fine = weigh.filter((x) => x.gap >= 0.1).sort((a, b) => b.gap * Math.sqrt(b.n) - a.gap * Math.sqrt(a.n)).slice(0, 3);
    // the moments
    const mo = [];
    g.slice().reverse().forEach((x) => {
      x.ev.shots.filter((q) => q.goal).forEach((q) => mo.push({ r: x.round, k: 'good', text: `Scored in the ${ord(minute(q.t))} minute against ${x.opp}.` }));
      x.ev.passes.filter((q) => !q.ok && q.p != null && q.p >= 0.85).slice(0, 1).forEach((q) => mo.push({ r: x.round, k: 'bad', text: `Gave the ball away from an easy pass in the ${ord(minute(q.t))} minute against ${x.opp}.` }));
      x.ev.tackles.filter((q) => !q.ok && q.depth != null && q.depth >= 0 && q.depth <= 0.3).slice(0, 1).forEach((q) => mo.push({ r: x.round, k: 'bad', text: `Beaten near his own goal in the ${ord(minute(q.t))} minute against ${x.opp}.` }));
      if (isGK) x.ev.faced.filter((q) => !q.saved).slice(0, 1).forEach((q) => mo.push({ r: x.round, k: 'bad', text: `Beaten in the ${ord(minute(q.t))} minute against ${x.opp}.` }));
      if (isGK && x.ev.faced.filter((q) => q.saved).length >= 3) mo.push({ r: x.round, k: 'good', text: `Made ${x.ev.faced.filter((q) => q.saved).length} saves against ${x.opp}.` });
    });
    const best = g.slice().sort((a, b) => b.rating - a.rating)[0];
    const worst = g.slice().sort((a, b) => a.rating - b.rating)[0];
    const strip = g.map((x) => `<div class="pf-m ${cls(x.rating)}" title="Round ${x.round} v ${esc(x.opp)}"><i style="height:${Math.round(((x.rating - 3) / 7) * 100)}%"></i><b>${x.rating.toFixed(1)}</b><small>${esc(x.opp.length > 11 ? x.opp.slice(0, 10) + '…' : x.opp)}</small></div>`).join('');
    host.innerHTML = `<section class="pf"><h3>Recent form</h3>
      <div class="pf-top"><div class="pf-score ${cls(avg)}"><b>${avg.toFixed(1)}</b><small>out of 10</small></div>
      <div><p class="pf-verdict">${esc(verdict)}${trend ? ' ' + esc(trend) : ''}.</p><p class="pf-sub">Over his last ${g.length} match${g.length === 1 ? '' : 'es'}${g.length > 1 ? `: best ${best.rating.toFixed(1)} against ${esc(best.opp)}, worst ${worst.rating.toFixed(1)} against ${esc(worst.opp)}` : ` against ${esc(best.opp)}`}.</p></div></div>
      <div class="pf-strip">${strip}</div>
      <div class="pf-cols">
        <div><h4>Going well</h4><ul>${fine.length ? fine.map((x) => `<li>${esc(good[x.k](x.r))}</li>`).join('') : '<li class="pf-quiet">Nothing stands out yet.</li>'}</ul></div>
        <div><h4>Where it keeps going wrong</h4><ul>${bad.length ? bad.map((x) => `<li>${esc(issue[x.k](x.r))}</li>`).join('') : '<li class="pf-quiet">No pattern of mistakes yet.</li>'}</ul></div>
      </div>
      ${mo.length ? `<h4>Moments that mattered</h4><ul class="pf-moments">${mo.slice(0, 5).map((m) => `<li class="${m.k}"><span>R${m.r}</span>${esc(m.text)}</li>`).join('')}</ul>` : ''}
    </section>`;
  };
})();
