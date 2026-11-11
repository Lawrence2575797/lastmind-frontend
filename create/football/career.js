// The manager's career: each club he has managed (with his record and what he won there), the personality his interviews have built, and the offers that come to him, from clubs in
// trouble that think he is the man for it. Taking a job changes the club in the same game: the league he manages, the fixtures, the squad and the books are the new club's.
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const seasonName = (s) => (25 + s) + '/' + (26 + s);
  const ord = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10 < 4 ? n % 10 : 0]);
  const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };

  // ---------- the record ----------
  const newSpell = (lg, team, level, divName) => ({ clubId: team.id, club: team.name, level, division: divName, from: { season: lg.season, round: (lg.fixtures || []).filter((f) => f.played && (f.homeId === team.id || f.awayId === team.id)).length }, to: null, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, seasons: [], accolades: [], end: null });
  FM.career = function (lg) {
    if (lg.career && lg.career.v === 1) return lg.career;
    const me = FM.teamById(lg, lg.userId), d = FM.allDivisions(lg).find((x) => x.teams.indexOf(me) >= 0) || { level: lg.divisionLevel, name: lg.divisionName };
    const sp = newSpell(lg, me, d.level, d.name);
    // a game already under way: what has been played this season is his record so far
    sp.from.round = 0;
    lg.fixtures.filter((f) => f.played && (f.homeId === me.id || f.awayId === me.id)).forEach((f) => addResult(sp, f, me.id));
    ((lg.cup && lg.cup.fixtures) || []).filter((f) => f.played && (f.homeId === me.id || f.awayId === me.id)).forEach((f) => addResult(sp, f, me.id));
    lg.career = { v: 1, spells: [sp], offers: [], sackOffers: [], made: {}, seq: 1 };
    return lg.career;
  };
  const cur = (lg) => { const c = FM.career(lg); return c.spells[c.spells.length - 1]; };
  function addResult(sp, f, me) { const home = f.homeId === me, gf = home ? f.hg : f.ag, ga = home ? f.ag : f.hg; if (gf == null || ga == null) return; sp.p++; sp.gf += gf; sp.ga += ga; if (gf > ga) sp.w++; else if (gf === ga) sp.d++; else sp.l++; }
  FM.careerRecord = function (lg, fx) {
    if (!fx || fx.friendly || fx.preseason || lg.mp || (fx.homeId !== lg.userId && fx.awayId !== lg.userId)) return;
    addResult(cur(lg), fx, lg.userId);
  };
  FM.careerAccolade = function (lg, a) { const sp = cur(lg); if (!sp.accolades.some((x) => x.text === a.text)) sp.accolades.push(Object.assign({ season: lg.season }, a)); };
  FM.careerSeasonEnd = function (lg, info) {
    const sp = cur(lg), row = (info.rows || []).find((r) => r.id === lg.userId);
    sp.seasons.push({ season: lg.season, level: info.level, division: info.divName, pos: info.pos, pts: row ? row.pts : null, p: row ? row.p : null });
    if (info.pos === 1) FM.careerAccolade(lg, { kind: 'league', text: info.divName + ' champions ' + seasonName(lg.season) });
    if (info.promoted) FM.careerAccolade(lg, { kind: 'promotion', text: 'Promoted from the ' + info.divName + ' ' + seasonName(lg.season) });
  };

  // ---------- the manager's personality, from what he has said ----------
  const TRAITS = { honest: ['Honest', 'says what he sees, good or bad'], provocative: ['Direct', 'says it plainly and is not afraid of the row that follows'], confident: ['Confident', 'backs himself and his players out loud'], humble: ['Humble', 'puts the group before himself'], humorous: ['Light-hearted', 'keeps the mood up, even when it is hard'], measured: ['Measured', 'says little and gives nothing away'] };
  FM.managerProfile = function (lg) {
    const tally = {}; let n = 0;
    (lg.interviews || []).forEach((r) => (r.answers || []).forEach((a) => { const m = TRAITS[a.mood] ? a.mood : null; if (!m) return; tally[m] = (tally[m] || 0) + (a.free ? 1.3 : 1); n += (a.free ? 1.3 : 1); }));
    const traits = Object.keys(TRAITS).map((k) => ({ k, label: TRAITS[k][0], note: TRAITS[k][1], share: n ? (tally[k] || 0) / n : 0 })).filter((t) => t.share > 0).sort((a, b) => b.share - a.share);
    const top = traits.filter((t) => t.share >= 0.2).slice(0, 2);
    return { traits, top, labels: top.map((t) => t.label), n: Math.round(n), text: top.length ? top.map((t) => t.label.toLowerCase()).join(' and ') : 'not yet known' };
  };

  // ---------- clubs and what is wrong with them ----------
  const STYLE_FOR = { press: 'a high-pressing side', possession: 'a possession side', counter: 'a counter-attacking side', direct: 'a direct side', balanced: 'a balanced side' };
  const WANTS = { under: ['Direct', 'Confident'], finance: ['Measured', 'Honest', 'Humble'], unrest: ['Honest', 'Humble'] };
  function situations(lg) {
    const me = FM.teamById(lg, lg.userId), t = FM.transfer ? FM.transfer(lg) : null, out = [];
    FM.allDivisions(lg).forEach((d) => {
      const rows = FM.divisionTableRows(d), by = d.teams.slice().sort((a, b) => (b.strength || 0) - (a.strength || 0));
      d.teams.forEach((team) => {
        if (team.id === me.id) return;
        const pos = rows.findIndex((r) => r.id === team.id) + 1, played = (rows.find((r) => r.id === team.id) || {}).p || 0, rank = by.indexOf(team) + 1, n = d.teams.length;
        const bk = t && t.backing && t.backing[team.id] ? t.backing[team.id].kind : null, troubles = [];
        if (played >= 3 && pos - rank >= 2) troubles.push({ k: 'under', sev: Math.min(3, pos - rank) * 0.7, text: team.name + ' are ' + ord(pos) + ' in the ' + d.name + ' with a squad that ranks ' + ord(rank) + ' for strength: the board expected a lot more.' });
        if (bk === 'debt') troubles.push({ k: 'finance', sev: 1.6, text: team.name + ' are in deep debt, and the board needs someone who can win games without spending.' });
        else if (bk === 'ban') troubles.push({ k: 'finance', sev: 1.4, text: team.name + ' are under a transfer ban for breaking the league\'s financial rules, and have to make do with the squad they have.' });
        else if (bk === 'loans' || bk === 'tight') troubles.push({ k: 'finance', sev: 1, text: 'Money is tight at ' + team.name + ', and the board wants a manager who can build a team without a big budget.' });
        if (pos > n - 3 && played >= 3 && hash(team.id + ':' + lg.season) < 0.45) troubles.push({ k: 'unrest', sev: 1.3, text: 'There is unrest in the dressing room at ' + team.name + ': the players have lost faith in the manager and the board has lost patience.' });
        if (troubles.length) out.push({ team, d, pos, rank, troubles, sev: troubles.reduce((a, x) => a + x.sev, 0) });
      });
    });
    return out;
  }
  function offerFor(lg, sit, sty, prof, spell, tag) {
    const me = FM.teamById(lg, lg.userId), c = FM.career(lg), main = sit.troubles.slice().sort((a, b) => b.sev - a.sev)[0], team = sit.team;
    const why = [];
    const clubStyle = team.style || 'balanced', fit = sty.tags.indexOf(clubStyle) >= 0;
    if (fit) why.push('They play ' + (STYLE_FOR[clubStyle] || 'their own way') + ' and your ' + sty.label + ' football is the same idea: ' + sty.text + '.');
    else if (sit.troubles.some((x) => x.k === 'under')) why.push('They want a change of approach, and your ' + sty.label + ' football is the kind they have been missing.');
    const wanted = WANTS[main.k] || [], match = prof.labels.filter((l) => wanted.indexOf(l) >= 0);
    if (match.length) why.push('The board wants ' + (main.k === 'unrest' ? 'someone to settle the dressing room' : main.k === 'finance' ? 'a calm head with the books' : 'a strong voice to turn things round') + ', and your ' + match.map((x) => x.toLowerCase()).join(' and ') + ' manner in front of the press is just that.');
    const pr = spell ? spell.p : 0, wr = pr ? spell.w / pr : 0;
    if (pr >= 6 && wr >= 0.45) why.push('Your record speaks for itself: ' + Math.round(100 * wr) + '% of your matches won at ' + spell.club + '.');
    else if (pr >= 6 && tag === 'sacked') why.push('They think the results at ' + spell.club + ' undersold what you were trying to do.');
    if (!why.length) why.push('They have been told you are a manager who can organise a side, and they are short of time.');
    return { id: 'o' + (c.seq++), clubId: team.id, club: team.name, division: sit.d.name, level: sit.d.level, up: sit.d.level < ((FM.allDivisions(lg).find((x) => x.teams.indexOf(me) >= 0) || {}).level || 9), pos: sit.pos, rank: sit.rank, need: sit.troubles.map((x) => x.text), why, style: clubStyle, season: lg.season, round: (lg.fixtures || []).filter((f) => f.played).length ? Math.max.apply(null, lg.fixtures.filter((f) => f.played).map((f) => f.round)) : 0, status: 'open', fit };
  }
  function choose(lg, count, tag) {
    const sty = FM.managerStyle ? FM.managerStyle(lg) : { tags: ['balanced'], label: 'balanced', text: '' }, prof = FM.managerProfile(lg), c = FM.career(lg), sp = cur(lg), me = FM.teamById(lg, lg.userId);
    const myLevel = (FM.allDivisions(lg).find((x) => x.teams.indexOf(me) >= 0) || {}).level || lg.divisionLevel || 1, wr = sp.p ? sp.w / sp.p : 0.4;
    const rng = FM.mulberry32(lg.seed + (lg.runSeed || 0) + lg.season * 7919 + c.seq * 131), have = new Set(c.offers.filter((o) => o.status === 'open').map((o) => o.clubId));
    let pool = situations(lg).filter((s) => !have.has(s.team.id) && Math.abs(s.d.level - myLevel) <= 1);
    pool = pool.filter((s) => s.d.level >= myLevel - (wr >= 0.4 || tag === 'sacked' ? 1 : 0));   // a step up only for a manager whose results or whose style have earned it
    pool.forEach((s) => { s.score = s.sev + (sty.tags.indexOf(s.team.style || 'balanced') >= 0 ? 0.8 : 0) + (prof.labels.some((l) => (WANTS[s.troubles[0].k] || []).indexOf(l) >= 0) ? 0.6 : 0) + (s.d.level < myLevel ? 0.3 : 0) + rng() * 0.8; });
    pool.sort((a, b) => b.score - a.score);
    const out = [], levels = {};
    for (const s of pool) { if (out.length >= count) break; if (tag === 'sacked' && out.length === 1 && levels[s.d.level] && pool.some((q) => q.d.level !== s.d.level && !out.some((o) => o.clubId === q.team.id))) continue; out.push(offerFor(lg, s, sty, prof, sp, tag)); levels[s.d.level] = 1; }
    return out;
  }

  // ---------- offers ----------
  // One or two a season, from clubs that are doing badly against what was expected of them or have trouble inside the club.
  FM.careerTick = function (lg, fx) {
    const c = FM.career(lg), b = lg.biz; if (!fx || lg.mp || (b && b.conf && b.conf.dismissed)) return;
    c.offers.forEach((o) => { if (o.status === 'open' && fx.round > o.round + 4) o.status = 'expired'; });
    const key = 's' + lg.season; c.made[key] = c.made[key] || 0;
    if (c.made[key] >= 2 || [4, 8, 12].indexOf(fx.round) < 0) return;
    const rng = FM.mulberry32(lg.seed + (lg.runSeed || 0) + lg.season * 4099 + fx.round * 53);
    if (rng() > 0.6) return;
    const got = choose(lg, 1, 'offer'); if (!got.length) return;
    c.offers.push(got[0]); c.made[key]++;
    if (FM.pushNews) FM.pushNews(lg, { round: fx.round, day: lg.day, kind: 'Career', headline: got[0].club + ' want to talk to you about their job', body: 'An approach from ' + got[0].club + ' has been made. Open the Career tab to see the offer and why they want you.', club: lg.userId, mine: true });
  };
  FM.careerSacked = function (lg) {
    const c = FM.career(lg); if (c.sackOffers && c.sackOffers.length) return c.sackOffers;
    c.sackOffers = choose(lg, 2, 'sacked'); const sp = cur(lg); if (!sp.end) sp.end = { season: lg.season, how: 'sacked' };
    return c.sackOffers;
  };
  FM.careerDecline = function (lg, id) { const o = FM.career(lg).offers.find((x) => x.id === id); if (o) o.status = 'declined'; };

  // ---------- taking the job ----------
  FM.careerTakeJob = function (lg, offer) {
    const c = FM.career(lg), team = FM.teamById(lg, offer.clubId); if (!team) return { ok: false, text: 'That club cannot be found.' };
    const old = cur(lg), oldTeam = FM.teamById(lg, lg.userId);
    old.to = { season: lg.season, round: (lg.fixtures || []).filter((f) => f.played && (f.homeId === oldTeam.id || f.awayId === oldTeam.id)).length };
    if (!old.end) old.end = { season: lg.season, how: 'left' };
    // the new club: the league he manages becomes its league, with the fixtures it has already played
    FM.chooseClub(lg, team.name);
    const d = FM.allDivisions(lg).find((x) => x.teams.indexOf(team) >= 0) || { level: lg.divisionLevel, name: lg.divisionName };
    c.spells.push(newSpell(lg, team, d.level, d.name));
    const sp = cur(lg); lg.fixtures.filter((f) => f.played && (f.homeId === team.id || f.awayId === team.id)).forEach(() => {});   // (the record starts from the day he arrives)
    sp.from.round = lg.fixtures.filter((f) => f.played && (f.homeId === team.id || f.awayId === team.id)).length;
    // the books, the board and the market are the new club's
    const t = FM.transfer(lg); t.shortlist = []; t.deals = {}; t.offers = []; t.wageShift = 0; t.renewals = {};
    lg._newClub = true; lg._forceKind = t.backing && t.backing[team.id] ? t.backing[team.id].kind : null; lg.biz = null; FM.biz(lg); delete lg._newClub; delete lg._forceKind;
    lg.boardApproval = 50; lg.publicOpinion = 50; if (FM.setBoardExpectation) FM.setBoardExpectation(lg, true);
    if (lg.biz && lg.biz.conf) { lg.biz.conf.dismissed = false; }
    if (team.tacticalFamiliarity) team.tacticalFamiliarity = { score: 55, delta: 0 };
    if (FM.bizSyncBudget) FM.bizSyncBudget(lg);
    c.offers.forEach((o) => { if (o.status === 'open') o.status = o.id === offer.id ? 'taken' : 'closed'; }); c.sackOffers = [];
    if (FM.pushNews) FM.pushNews(lg, { round: Math.max(0, sp.from.round - 1), day: lg.day, kind: 'Career', headline: 'The manager takes charge of ' + team.name, body: 'He has left ' + old.club + ' for ' + team.name + ' of the ' + d.name + '. ' + (offer.need && offer.need[0] ? offer.need[0] : ''), club: team.id, mine: true });
    return { ok: true, club: team.name, division: d.name };
  };

  // ---------- the page ----------
  const ui = { tab: 'overview' };
  const css = `.cr-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 14px}.cr-tabs button{padding:8px 14px}.cr-tabs button.on{background:var(--accent,#f1ead6);color:#1a232d}
    .cr-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:8px 0 14px}.cr-stat{padding:12px 14px;border:1px solid rgba(255,255,255,.14);display:grid;gap:2px}.cr-stat b{font-size:1.6rem;font-variant-numeric:tabular-nums}.cr-stat span{font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;opacity:.7}
    .cr-traits{display:flex;gap:8px;flex-wrap:wrap}.cr-trait{padding:6px 12px;border:1px solid rgba(255,255,255,.22);font-weight:600}.cr-trait.top{background:#f1ead6;color:#1a232d;border-color:#f1ead6}
    .cr-acc{display:grid;gap:6px;margin:6px 0}.cr-acc div{padding:8px 12px;border-left:3px solid #e6c66a;background:rgba(255,255,255,.05)}
    .cr-offers{display:grid;gap:14px}.cr-offer{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);display:grid}.cr-offer-h{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:16px 18px 10px;border-bottom:1px solid rgba(255,255,255,.1)}
    .cr-offer-h h3{margin:0;font-size:1.35rem}.cr-offer-h small{opacity:.75}.cr-chip{display:inline-block;padding:3px 9px;border:1px solid rgba(255,255,255,.25);font-size:.74rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-left:6px}.cr-chip.up{background:#2f7d4f;border-color:#2f7d4f;color:#fff}
    .cr-offer-b{display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:14px 18px}.cr-offer-b h4{margin:0 0 6px;font-size:.76rem;letter-spacing:.1em;text-transform:uppercase;color:#e6c66a}.cr-offer-b ul{margin:0;padding-left:18px;display:grid;gap:6px;line-height:1.5}
    .cr-offer-f{display:flex;gap:10px;justify-content:flex-end;align-items:center;padding:12px 18px;border-top:1px solid rgba(255,255,255,.1)}.cr-offer-f .st{margin-right:auto;font-size:.88rem;opacity:.75}
    .cr-table{width:100%;border-collapse:collapse}.cr-table th,.cr-table td{padding:6px 10px;text-align:right;border-bottom:1px solid rgba(255,255,255,.08)}.cr-table th:first-child,.cr-table td:first-child{text-align:left}
    @media (max-width:720px){.cr-offer-b{grid-template-columns:1fr}}`;
  FM.careerCss = css;
  FM.careerOfferCard = function (o, opts) {
    opts = opts || {};
    const actions = o.status === 'open' || opts.force ? `<button type="button" class="primary" data-take="${esc(o.id)}">Take the job</button>${opts.noDecline ? '' : `<button type="button" data-decline="${esc(o.id)}">Decline</button>`}` : `<span class="st">${o.status === 'taken' ? 'You took this job' : o.status === 'declined' ? 'Declined' : 'The offer has gone'}</span>`;
    return `<article class="cr-offer"><div class="cr-offer-h"><div><h3>${esc(o.club)}</h3><small>${esc(o.division)} · ${o.pos ? ord(o.pos) + ' now' : ''}${o.rank ? ' · squad ranked ' + ord(o.rank) : ''}</small></div><div>${o.up ? '<span class="cr-chip up">A step up</span>' : ''}<span class="cr-chip">${esc(({ press: 'Pressing', possession: 'Possession', counter: 'Counter-attack', direct: 'Direct', balanced: 'Balanced' })[o.style] || 'Balanced')}</span></div></div>
      <div class="cr-offer-b"><div><h4>Why they need a manager</h4><ul>${o.need.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div><div><h4>Why they want you</h4><ul>${o.why.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>
      <div class="cr-offer-f">${actions}</div></article>`;
  };
  FM.careerBindOffers = function (host, lg, onTake, onDecline) {
    host.querySelectorAll('[data-take]').forEach((b) => b.addEventListener('click', () => { const c = FM.career(lg), o = c.offers.concat(c.sackOffers || []).find((x) => x.id === b.dataset.take); if (o && onTake) onTake(o); }));
    host.querySelectorAll('[data-decline]').forEach((b) => b.addEventListener('click', () => { FM.careerDecline(lg, b.dataset.decline); if (onDecline) onDecline(); }));
  };
  const rec = (sp) => `<div class="cr-grid"><div class="cr-stat"><b>${sp.p}</b><span>Matches</span></div><div class="cr-stat"><b>${sp.p ? Math.round(100 * sp.w / sp.p) : 0}%</b><span>Win ratio</span></div><div class="cr-stat"><b>${sp.w}-${sp.d}-${sp.l}</b><span>Won-drawn-lost</span></div><div class="cr-stat"><b>${sp.gf}-${sp.ga}</b><span>Goals for-against</span></div></div>`;
  FM.renderCareer = function (host, lg, hooks) {
    const c = FM.career(lg), prof = FM.managerProfile(lg), sty = FM.managerStyle ? FM.managerStyle(lg) : null, spells = c.spells;
    const open = c.offers.filter((o) => o.status === 'open');
    if (ui.tab !== 'overview' && ui.tab !== 'offers' && !spells[+String(ui.tab).replace('c', '')]) ui.tab = 'overview';
    const tabs = `<div class="cr-tabs" role="tablist"><button type="button" data-ctab="overview" class="${ui.tab === 'overview' ? 'on' : ''}">Overview</button><button type="button" data-ctab="offers" class="${ui.tab === 'offers' ? 'on' : ''}">Your offers${open.length ? ' (' + open.length + ')' : ''}</button>${spells.map((s, i) => `<button type="button" data-ctab="c${i}" class="${ui.tab === 'c' + i ? 'on' : ''}">${esc(s.club)}${s.to ? '' : ' · now'}</button>`).join('')}</div>`;
    const total = spells.reduce((a, s) => { ['p', 'w', 'd', 'l', 'gf', 'ga'].forEach((k) => { a[k] += s[k]; }); return a; }, { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 });
    let body = '';
    if (ui.tab === 'overview') {
      const acc = [].concat.apply([], spells.map((s) => s.accolades.map((a) => ({ a, club: s.club }))));
      body = `<div class="card"><h2>Manager career</h2><p class="desc">Everything you have done as a manager, club by club.</p>${rec(total)}
        <h3>Your personality in front of the press</h3>${prof.traits.length ? `<div class="cr-traits">${prof.traits.map((t) => `<span class="cr-trait${prof.top.some((x) => x.k === t.k) ? ' top' : ''}" title="${esc(t.note)}">${esc(t.label)} · ${Math.round(100 * t.share)}%</span>`).join('')}</div><p class="desc">${prof.top.length ? 'Clubs see you as ' + prof.top.map((t) => '<b>' + esc(t.label.toLowerCase()) + '</b> (' + esc(t.note) + ')').join(' and ') + '.' : 'Your answers have been varied, so there is no clear picture yet.'} It is built from the answers you pick in press conferences.</p>` : '<p class="desc">Not built yet: it comes from the answers you give in press conferences.</p>'}
        ${sty ? `<h3>Your football</h3><p class="desc">${esc(sty.label[0].toUpperCase() + sty.label.slice(1))}: ${esc(sty.text)}.</p>` : ''}
        <h3>Accolades</h3>${acc.length ? `<div class="cr-acc">${acc.map((x) => `<div><b>${esc(x.a.text)}</b> <small>${esc(x.club)}</small></div>`).join('')}</div>` : '<p class="desc">None yet.</p>'}</div>`;
    } else if (ui.tab === 'offers') {
      body = `<div class="card"><h2>Your offers</h2><p class="desc">Clubs that are doing worse than they should, or have trouble inside, and think you are the one to put it right. You get one or two a season.</p>
        ${c.offers.length ? `<div class="cr-offers">${c.offers.slice().reverse().map((o) => FM.careerOfferCard(o)).join('')}</div>` : '<p class="desc">No offers yet. They come after a few matches of the season, to managers who have given a club a reason to want them.</p>'}</div>`;
    } else {
      const s = spells[+String(ui.tab).slice(1)];
      body = `<div class="card"><h2>${esc(s.club)}</h2><p class="desc">${esc(s.division)} · ${seasonName(s.from.season)}${s.to ? ' to ' + seasonName(s.to.season) + (s.end && s.end.how === 'sacked' ? ' · dismissed' : '') : ' · in charge now'}</p>${rec(s)}
        <h3>Accolades</h3>${s.accolades.length ? `<div class="cr-acc">${s.accolades.map((a) => `<div><b>${esc(a.text)}</b></div>`).join('')}</div>` : '<p class="desc">None yet.</p>'}
        <h3>Seasons</h3>${s.seasons.length ? `<table class="cr-table"><thead><tr><th>Season</th><th>Division</th><th>Finished</th><th>Points</th></tr></thead><tbody>${s.seasons.map((x) => `<tr><td>${seasonName(x.season)}</td><td>${esc(x.division)}</td><td>${ord(x.pos)}</td><td>${x.pts == null ? '' : x.pts}</td></tr>`).join('')}</tbody></table>` : '<p class="desc">No full season here yet.</p>'}</div>`;
    }
    host.innerHTML = `<style>${css}</style>${tabs}${body}`;
    host.querySelectorAll('[data-ctab]').forEach((b) => b.addEventListener('click', () => { ui.tab = b.dataset.ctab; FM.renderCareer(host, lg, hooks); }));
    FM.careerBindOffers(host, lg, (o) => { if (hooks && hooks.take) hooks.take(o); }, () => { if (hooks && hooks.save) hooks.save(); FM.renderCareer(host, lg, hooks); });
  };
})();
