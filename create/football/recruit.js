// The recruitment screen (every club's players, a shortlist, offers for your own players and the talks with agents) and the news pages (a list of
// headlines, and the full article when one is opened). The rules are in transfers.js; this file only draws them and passes the manager's choices on.
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const POSITIONS = [['GK', 'Goalkeepers'], ['CB', 'Centre-backs'], ['FB', 'Full-backs'], ['DM', 'Defensive midfielders'], ['CM', 'Central midfielders'], ['AM', 'Attacking midfielders'], ['WF', 'Wingers'], ['ST', 'Strikers']];
  const STAGE_TEXT = { interest: 'Interest declared', counter: 'Counter-offer', bid_rejected: 'Bid rejected', fee_agreed: 'Fee agreed', wage_talks: 'In wage talks', signed: 'Signed', collapsed: 'Collapsed' };
  const rs = { tab: 'players', club: 'all', pos: 'all', nation: 'all', ageMin: '', ageMax: '', ratingMin: '', priceMax: '', fit: false, sort: 'rating', open: null, bid: null, msg: {} };
  let hooks = {};

  const initials = (p) => esc(p.name.split(/\s+/).map((x) => x[0]).slice(0, 2).join(''));
  const stat = (p, k) => (p.ratings && p.ratings[k] != null ? FM.shown(p.ratings[k]) : '-');
  const chip = (text, cls) => `<span class="rc-chip ${cls || ''}">${esc(text)}</span>`;

  // A picture slot: shows the kept picture straight away, or fills in when it has been made. `ask` false means "only show it if it exists".
  // Recruitment shows no pictures any more: just the player's initials where a portrait slot is.
  function pictureInto(host, key, request, ask, fallbackHtml) {
    host.innerHTML = fallbackHtml || '';
  }

  FM.renderRecruit = function (host, league, h) {
    hooks = h || hooks;
    const t = FM.transfer(league), me = FM.teamById(league, league.userId);
    const others = league.teams.filter((x) => x.id !== league.userId);
    const draw = () => FM.renderRecruit(host, league, hooks);
    const save = () => { if (hooks.save) hooks.save(); };
    const room = FM.wageRoom(league, me.id);
    // ----- the list of players, with the filters applied
    const all = [].concat.apply([], others.map((tm) => tm.squad.map((p) => ({ p, tm }))));
    const nations = Array.from(new Set(all.map((x) => x.p.nation))).sort();
    let rows = all.filter(({ p, tm }) => {
      if (rs.club !== 'all' && tm.id !== rs.club) return false;
      if (rs.pos !== 'all' && p.natural !== rs.pos) return false;
      if (rs.nation !== 'all' && p.nation !== rs.nation) return false;
      const age = FM.ageOf(p);
      if (rs.ageMin !== '' && age < +rs.ageMin) return false;
      if (rs.ageMax !== '' && age > +rs.ageMax) return false;
      if (rs.ratingMin !== '' && FM.playerRating(p) < +rs.ratingMin) return false;
      if (rs.priceMax !== '' && FM.askingPrice(league, p) > +rs.priceMax) return false;
      if (rs.fit && FM.isInjured(p)) return false;
      return true;
    });
    const sorters = {
      rating: (a, b) => FM.playerRating(b.p) - FM.playerRating(a.p),
      price: (a, b) => FM.askingPrice(league, b.p) - FM.askingPrice(league, a.p),
      priceLow: (a, b) => FM.askingPrice(league, a.p) - FM.askingPrice(league, b.p),
      age: (a, b) => FM.ageOf(a.p) - FM.ageOf(b.p),
      name: (a, b) => a.p.name.localeCompare(b.p.name),
    };
    rows.sort(sorters[rs.sort] || sorters.rating);
    const marks = FM.squadMarks ? FM.squadMarks(rows.map((x) => x.p)) : {};
    const cell = (p, s) => { const k = marks[p.id] && marks[p.id][s]; return `<td${k ? ' class="hl-' + k + '"' : ''}>${s === 'gk' && p.natural !== 'GK' ? '-' : stat(p, s)}</td>`; };
    const status = (p) => { const d = t.deals[p.id]; return d && d.stage !== 'signed' ? chip(STAGE_TEXT[d.stage] || d.stage, 'st-' + d.stage) : (t.shortlist.indexOf(p.id) >= 0 ? chip('Shortlisted') : ''); };
    const rowHtml = ({ p, tm }) => `<tr class="player-row${rs.open === p.id ? ' sel' : ''}" data-open="${esc(p.id)}" tabindex="0">
      <td class="l"><b>${esc(p.name)}</b> ${FM.isInjured(p) ? '<span class="out">injured</span>' : ''}</td><td class="l">${esc(tm.name)}</td><td class="l">${p.natural}</td><td>${FM.ageOf(p)}</td><td class="l">${esc(p.nation)}</td>
      <td><b>${FM.abilityOf(p)}</b></td><td>${FM.potentialOf(p)}</td>${['pace', 'dribbling', 'passing', 'finishing', 'tackling', 'heading', 'composure', 'stamina', 'gk'].map((s) => cell(p, s)).join('')}
      <td><b>${FM.money(FM.askingPrice(league, p))}</b></td><td class="l">${status(p)}</td></tr>`;
    const head = `<thead><tr><th class="l">Player</th><th class="l">Club</th><th class="l">Pos</th><th>Age</th><th class="l">Nation</th><th title="What he is worth to a team now, out of 100">Ability</th><th title="The most he can reach, out of 100">Potential</th><th>Pace</th><th>Dri</th><th>Pas</th><th>Fin</th><th>Tac</th><th>Hea</th><th>Com</th><th>Sta</th><th>GK</th><th>Price</th><th class="l">Status</th></tr></thead>`;
    const clubIdx = rs.club === 'all' ? -1 : others.findIndex((x) => x.id === rs.club);
    const filters = `<div class="rc-filters">
        <div class="rc-club"><button type="button" id="rcPrev" aria-label="Previous club">‹</button>
          <select id="rcClub"><option value="all">All clubs</option>${others.map((tm) => `<option value="${tm.id}"${rs.club === tm.id ? ' selected' : ''}>${esc(tm.name)}</option>`).join('')}</select>
          <button type="button" id="rcNext" aria-label="Next club">›</button></div>
        <label>Position<select id="rcPos"><option value="all">Any</option>${POSITIONS.map(([k, n]) => `<option value="${k}"${rs.pos === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <label>Nation<select id="rcNation"><option value="all">Any</option>${nations.map((n) => `<option${rs.nation === n ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
        <label>Age from<input id="rcAgeMin" type="number" min="16" max="40" value="${esc(rs.ageMin)}"></label>
        <label>to<input id="rcAgeMax" type="number" min="16" max="40" value="${esc(rs.ageMax)}"></label>
        <label>Rating at least<input id="rcRating" type="number" step="0.1" min="5" max="10" value="${esc(rs.ratingMin)}"></label>
        <label>Price up to (£m)<input id="rcPrice" type="number" step="0.5" min="0" value="${esc(rs.priceMax)}"></label>
        <label class="rc-check"><input id="rcFit" type="checkbox"${rs.fit ? ' checked' : ''}> Fit only</label>
        <label>Sort by<select id="rcSort">${[['rating', 'Rating'], ['price', 'Price, high to low'], ['priceLow', 'Price, low to high'], ['age', 'Youngest first'], ['name', 'Name']].map(([k, n]) => `<option value="${k}"${rs.sort === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <button type="button" id="rcClear">Clear filters</button></div>`;
    void clubIdx;

    const shortlist = t.shortlist.map((id) => FM.findPlayer(league, id)).filter(Boolean).filter((p) => FM.clubOf(league, p) !== me);
    const openOffers = t.offers.filter((o) => FM.findPlayer(league, o.pid) && FM.clubOf(league, FM.findPlayer(league, o.pid)) === me);
    const tabs = `<div class="rc-tabs">${[['players', 'Players'], ['shortlist', 'Shortlist (' + shortlist.length + ')'], ['offers', 'Offers and deals' + (openOffers.length ? ' (' + openOffers.length + ')' : '')]].map(([k, n]) => `<button type="button" data-rctab="${k}" class="${rs.tab === k ? 'on' : ''}">${n}</button>`).join('')}</div>`;

    let body = '';
    if (rs.tab === 'players') {
      body = `${filters}<p class="note">${rows.length} player${rows.length === 1 ? '' : 's'}. Click one to see them, declare interest, or make an approach. Green and red mark ratings well above or below the other players in the league in that position.</p>
        <div class="tablewrap rc-table"><table class="data">${head}<tbody>${rows.slice(0, 400).map(rowHtml).join('') || '<tr><td colspan="18" class="l">No players match those filters.</td></tr>'}</tbody></table></div>`;
    } else if (rs.tab === 'shortlist') {
      body = shortlist.length ? `<div class="tablewrap rc-table"><table class="data">${head}<tbody>${shortlist.map((p) => rowHtml({ p, tm: FM.clubOf(league, p) })).join('')}</tbody></table></div>` : '<p class="note">Nobody on your shortlist yet. Declaring interest in a player, or approaching his club, adds him here.</p>';
    } else {
      // after a promotion or relegation some of the clubs named in old offers and moves are in the other division now: they are named all the same
      const tname = (id) => { const x = FM.teamById(league, id) || (((league.otherLeague || {}).teams) || []).find((y) => y.id === id); return x ? x.name : 'another club'; };
      const offerHtml = openOffers.filter((o) => FM.teamById(league, o.from)).map((o) => {
        const p = FM.findPlayer(league, o.pid), buyer = FM.teamById(league, o.from);
        return `<div class="rc-offer"><div><b>${esc(buyer.name)}</b> offer <b>${FM.money(o.fee)}</b> for <b>${esc(p.name)}</b> <small>(${p.natural}, ${FM.ageOf(p)}, ability ${FM.abilityOf(p)}, potential ${FM.potentialOf(p)}; worth about ${FM.money(FM.valueOf(p))})</small>${o.status === 'countered' ? ' ' + chip('They raised their offer', 'st-counter') : ''}</div>
          <div class="rc-offer-actions"><button type="button" class="primary" data-offer="accept" data-id="${o.id}">Accept ${FM.money(o.fee)}</button><button type="button" data-offer="reject" data-id="${o.id}">Reject</button>
          <label>Ask for £m<input type="number" step="0.1" min="0" value="${(o.status === 'countered' ? o.fee : o.fee * 1.2).toFixed(1)}" data-counter="${o.id}"></label><button type="button" data-offer="counter" data-id="${o.id}">Counter</button></div>
          ${rs.msg['o' + o.id] ? `<p class="rc-msg">${esc(rs.msg['o' + o.id])}</p>` : ''}</div>`;
      }).join('');
      const active = Object.keys(t.deals).map((id) => t.deals[id]).filter((d) => ['counter', 'fee_agreed', 'wage_talks'].indexOf(d.stage) >= 0);
      const moves = t.moves.slice(-12).reverse();
      body = `${rs.offerNote ? `<div class="rc-notice ${rs.offerNote.kind}" role="status">${esc(rs.offerNote.text)}</div>` : ''}<h3>Offers for your players</h3>${offerHtml || '<p class="note">No offers at the moment. Other clubs make their moves after each round.</p>'}
        <h3>Deals in progress</h3>${active.length ? active.map((d) => { const p = FM.findPlayer(league, d.pid); return p ? `<div class="rc-offer"><div><b>${esc(p.name)}</b> ${chip(STAGE_TEXT[d.stage], 'st-' + d.stage)}${d.fee ? ' fee ' + FM.money(d.fee) : ''}</div><div class="rc-offer-actions"><button type="button" data-open="${esc(p.id)}">Open</button></div></div>` : ''; }).join('') : '<p class="note">No deals in progress.</p>'}
        <h3>Recent moves in the league</h3>${moves.length ? `<ul class="rc-moves">${moves.map((m) => `<li><b>${esc(m.name)}</b>: ${esc(tname(m.from))} to ${esc(tname(m.to))}, ${FM.money(m.fee)}</li>`).join('')}</ul>` : '<p class="note">No transfers yet.</p>'}`;
    }

    host.innerHTML = `<div class="rc-wrap"><div class="card rc-main"><div class="row" style="justify-content:space-between;align-items:baseline"><h2>Recruitment</h2>
        <div class="rc-money"><span>Transfer budget <b>${FM.money(t.budget[me.id] || 0)}</b></span><span>Wage room <b>${room}k</b> a week</span><span>Squad <b>${me.squad.length}</b></span></div></div>
        ${tabs}${body}</div>
      <div class="rc-side" id="rcSide"></div></div>`;

    // ----- events
    host.querySelectorAll('[data-rctab]').forEach((b) => b.addEventListener('click', () => { rs.tab = b.dataset.rctab; rs.offerNote = null; draw(); }));
    const bind = (id, key, num) => { const e = host.querySelector(id); if (e) e.addEventListener('change', () => { rs[key] = e.type === 'checkbox' ? e.checked : e.value; draw(); }); void num; };
    bind('#rcClub', 'club'); bind('#rcPos', 'pos'); bind('#rcNation', 'nation'); bind('#rcAgeMin', 'ageMin'); bind('#rcAgeMax', 'ageMax'); bind('#rcRating', 'ratingMin'); bind('#rcPrice', 'priceMax'); bind('#rcFit', 'fit'); bind('#rcSort', 'sort');
    const step = (d) => { const ids = ['all'].concat(others.map((x) => x.id)); rs.club = ids[(ids.indexOf(rs.club) + d + ids.length) % ids.length]; draw(); };
    const pv = host.querySelector('#rcPrev'), nx = host.querySelector('#rcNext'); if (pv) pv.addEventListener('click', () => step(-1)); if (nx) nx.addEventListener('click', () => step(1));
    const cl = host.querySelector('#rcClear'); if (cl) cl.addEventListener('click', () => { Object.assign(rs, { club: 'all', pos: 'all', nation: 'all', ageMin: '', ageMax: '', ratingMin: '', priceMax: '', fit: false, sort: 'rating' }); draw(); });
    host.querySelectorAll('[data-open]').forEach((r) => r.addEventListener('click', () => { rs.open = r.dataset.open; rs.bid = null; draw(); const side = host.querySelector('#rcSide'); if (side && side.scrollIntoView) side.scrollIntoView({ block: 'nearest' }); }));
    host.querySelectorAll('[data-offer]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.id, counter = host.querySelector('[data-counter="' + id + '"]');
      const offer = t.offers.find((x) => x.id === id), pl = offer && FM.findPlayer(league, offer.pid), buyer = offer && FM.teamById(league, offer.from);
      const action = b.dataset.offer, asked = counter ? FM.round1 ? FM.round1(counter.value) : Math.round(Number(counter.value) * 10) / 10 : 0;
      const before = offer ? offer.fee : 0;
      const r = FM.respondOffer(league, id, action, counter ? counter.value : 0);
      const who = buyer ? buyer.name : 'The club', name = pl ? pl.name : 'the player';
      // the answer is shown straight away, at the top, in plain words: accepted, rejected, or a different offer
      let note;
      if (!r.ok) note = { kind: 'no', text: r.text };
      else if (r.status === 'sold') note = { kind: 'ok', text: (action === 'counter' ? 'Accepted: ' + who + ' agreed to pay ' + FM.money(r.fee) + ' for ' + name + ', so the deal is done.' : 'Deal done: ' + name + ' has joined ' + who + ' for ' + FM.money(r.fee) + '.') };
      else if (r.status === 'countered') note = { kind: 'counter', text: 'Countered: ' + who + ' will not pay ' + FM.money(asked) + ' for ' + name + ' but will go to ' + FM.money(r.fee) + (r.fee > before ? ' (up from ' + FM.money(before) + ')' : '') + '. Accept it, reject it, or ask for a different price below.' };
      else if (r.status === 'withdrawn') note = { kind: 'no', text: 'Rejected: ' + who + ' will not pay ' + FM.money(asked) + ' for ' + name + ' and have withdrawn their offer.' };
      else if (r.status === 'rejected') note = { kind: 'no', text: "You turned down " + who + "'s offer of " + FM.money(before) + ' for ' + name + '.' };
      else note = { kind: 'no', text: 'Nothing changed.' };
      rs.offerNote = note;
      save(); draw();
      const el = host.querySelector('.rc-notice'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    }));
    drawSide(host.querySelector('#rcSide'), league, draw, save);
  };

  // ----- the panel for the player that is open
  function drawSide(side, league, draw, save) {
    const p = rs.open && FM.findPlayer(league, rs.open);
    if (!p) { side.innerHTML = '<div class="card"><h3>Pick a player</h3><p class="note">Choose a player from the list to see him in full, and to take it further.</p></div>'; return; }
    const t = FM.transfer(league), me = FM.teamById(league, league.userId), club = FM.clubOf(league, p), mine = club === me;
    const deal = t.deals[p.id] || null, ask = FM.askingPrice(league, p), reasons = FM.priceReasons(league, p);
    const stage = deal ? deal.stage : null;
    const cond = Math.round(100 * FM.conditionOf(p));
    const r = (k, n) => `<tr><td class="l">${n}</td><td><b>${FM.shown(p.ratings[k])}</b></td></tr>`;
    const ratingRows = [['pace', 'Pace'], ['dribbling', 'Dribbling'], ['passing', 'Passing'], ['finishing', 'Finishing'], ['tackling', 'Tackling'], ['heading', 'Heading'], ['composure', 'Composure'], ['stamina', 'Stamina']].map(([k, n]) => r(k, n)).join('') + (p.natural === 'GK' ? r('gk', 'Goalkeeping') : '');
    const fee = deal && deal.fee != null ? deal.fee : ask;
    const msg = rs.msg[p.id];
    let action = '';
    if (stage === 'signed' && mine) action = `<div class="rc-done"><div class="rc-scene" id="rcScene"></div><p><b>${esc(p.name)} has signed for ${esc(me.name)}.</b> He is in your squad and can be picked from the bench or swapped into the team.</p><button type="button" id="rcToSquad" class="primary">Go to the squad</button></div>`;
    else if (mine) action = '<p class="note">He plays for you.</p>';
    else {
      const declared = deal && deal.declared;
      const approached = stage === 'fee_agreed' || stage === 'wage_talks';
      action = `<div class="rc-actions">
          <button type="button" id="rcDeclare"${declared ? ' disabled' : ''}>${declared ? 'Interest declared' : 'Declare interest'}</button>
          <button type="button" id="rcApproach"${approached ? ' disabled' : ''}>Approach club to sign</button>
          <button type="button" id="rcNegotiate" class="primary"${approached ? '' : ' disabled'} title="${approached ? '' : 'Approach the club and agree a fee first'}">Negotiate</button>
          ${t.shortlist.indexOf(p.id) >= 0 ? '<button type="button" id="rcUnlist">Remove from shortlist</button>' : ''}</div>
        ${msg ? `<p class="rc-msg">${esc(msg)}</p>` : ''}`;
      if (rs.bid === p.id && !approached) {
        const lo = r1(ask * 0.8);
        action += `<div class="rc-form"><b>Approach ${esc(club.name)}</b><p class="note">They are asking ${FM.money(ask)}. Your budget is ${FM.money(t.budget[me.id] || 0)}.</p>
          <label>Offer (£m)<input id="rcBidFee" type="number" step="0.1" min="0" value="${r1(deal && deal.counter ? deal.counter : ask)}" data-lo="${lo}"></label><button type="button" id="rcBidGo" class="primary">Make the offer</button> <button type="button" id="rcBidCancel">Cancel</button></div>`;
      }
      if (stage === 'counter') action += `<div class="rc-form"><b>${esc(club.name)} want ${FM.money(deal.counter)}</b><div><button type="button" id="rcAcceptCounter" class="primary">Accept ${FM.money(deal.counter)}</button> <button type="button" id="rcRejectCounter">Reject</button> <button type="button" id="rcBidOther">Offer something else</button></div></div>`;
      if (stage === 'fee_agreed') action += `<div class="rc-form"><div class="rc-scene" id="rcScene"></div><p><b>Fee agreed: ${FM.money(deal.fee)}.</b> ${esc(club.name)} have given you permission to speak to ${esc(p.name.split(' ')[0])}. Press Negotiate to talk wages.</p></div>`;
      if (stage === 'wage_talks') {
        const hist = (deal.history || []).filter((x) => x.who !== 'club').slice(-6).map((x) => `<div class="rc-bubble ${x.who}"><small>${x.who === 'you' ? 'You' : 'Agent'}</small>${esc(x.text)}</div>`).join('');
        action += `<div class="rc-form rc-neg"><div class="rc-scene" id="rcScene"></div><b>Wage talks with ${esc(p.name.split(' ')[0])} and his agent</b>
          <p class="note">His wage now is about ${FM.wageOf(p)}k a week. Your wage room is ${FM.wageRoom(league, me.id)}k. The agent has ${deal.patience} round${deal.patience === 1 ? '' : 's'} of patience left.</p>
          <div class="rc-chat">${hist}</div>
          <label>Weekly wage (£k)<input id="rcWage" type="number" step="0.5" min="0" value="${r1(deal.wageCur)}"></label>
          <label>Contract<select id="rcYears">${[1, 2, 3, 4, 5].map((y) => `<option value="${y}"${y === (deal.years || 3) ? ' selected' : ''}>${y} year${y === 1 ? '' : 's'}</option>`).join('')}</select></label>
          <div><button type="button" id="rcWageAccept" class="primary">Accept ${r1(deal.wageCur)}k a week</button> <button type="button" id="rcWageGo">Offer the figure above</button> <button type="button" id="rcWalk">Reject and walk away</button></div></div>`;
      }
      if (stage === 'collapsed') action += '<p class="note">That deal has fallen through. You can declare interest or approach again.</p>';
    }
    side.innerHTML = `<div class="card rc-player"><div class="rc-head"><div class="rc-portrait" id="rcPortrait"><span class="fallback">${initials(p)}</span></div>
        <div><span class="eyebrow">${esc(club ? club.name : '')}</span><h3>${esc(p.name)}</h3><p class="note">${FM.POS_NAME[p.natural]} · ${FM.ageOf(p)} · ${esc(p.nation)} · ${p.height || '-'} cm · ${({ right: 'Right', left: 'Left', both: 'Two' }[p.foot] || '')}-footed</p>
        <p><b>${FM.abilityOf(p)}</b> ability · <b>${FM.potentialOf(p)}</b> potential (${esc(FM.potentialWord ? FM.potentialWord(p) : '')}) · condition ${cond}% · ${FM.isInjured(p) ? 'injured' : 'fit'}</p></div></div>
      <div class="rc-price"><span>Asking price <b>${FM.money(ask)}</b></span><span>Wage now <b>${FM.wageOf(p)}k</b>/wk</span><span>Contract <b>${p.contract || (1 + (FM.hashString(p.id + ':c') % 4))} yr</b></span></div>
      ${reasons.length ? `<ul class="rc-reasons">${reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      <table class="data rc-ratings"><tbody>${ratingRows}</tbody></table>${action}
      ${deal && deal.history && deal.history.length ? `<details class="rc-log"><summary>Everything said so far</summary>${deal.history.map((x) => `<p><b>${x.who === 'you' ? 'You' : x.who === 'agent' ? 'Agent' : 'Club'}:</b> ${esc(x.text)}</p>`).join('')}</details>` : ''}</div>`;

    // pictures: the portrait is shown if it has been made; it is made when the manager takes an interest, and then kept
    const portrait = side.querySelector('#rcPortrait');
    pictureInto(portrait, FM.playerPictureKey(p), FM.playerPictureRequest(p), !!(deal && (deal.declared || stage)), `<span class="fallback">${initials(p)}</span>`);
    const scene = side.querySelector('#rcScene');
    if (scene && deal) {
      const sc = stage === 'signed' ? 'unveil' : stage === 'wage_talks' ? 'agent' : 'approach';
      pictureInto(scene, FM.scenePictureKey(p, deal, sc), FM.scenePictureRequest(p, sc), true, '');
    }

    const on = (id, fn) => { const e = side.querySelector(id); if (e) e.addEventListener('click', fn); };
    const say = (text) => { rs.msg[p.id] = text; save(); draw(); };
    on('#rcDeclare', () => {
      const out = FM.declareInterest(league, p.id);
      if (!out.ok) return say(out.text);
      FM.picture(FM.playerPictureKey(p), FM.playerPictureRequest(p));
      say(out.hiked ? 'Interest declared. Word got out: the price is now ' + FM.money(out.ask) + ', up from ' + FM.money(out.before) + '.' : 'Interest declared. He is on your shortlist, and the story is in the news.');
    });
    on('#rcApproach', () => { rs.bid = p.id; draw(); });
    on('#rcBidCancel', () => { rs.bid = null; draw(); });
    on('#rcBidOther', () => { rs.bid = p.id; draw(); });
    on('#rcBidGo', () => {
      const v = side.querySelector('#rcBidFee').value;
      const out = FM.approachClub(league, p.id, v);
      rs.bid = null;
      FM.picture(FM.playerPictureKey(p), FM.playerPictureRequest(p));
      say(!out.ok ? out.text : out.status === 'agreed' ? 'Fee agreed. You can now negotiate his wages.' : out.status === 'counter' ? club.name + ' want ' + FM.money(out.counter) + '.' : (out.text || club.name + ' rejected the offer.'));
    });
    on('#rcRejectCounter', () => { const out = FM.rejectCounter(league, p.id); say(out.text); });
    on('#rcAcceptCounter', () => { const out = FM.acceptCounter(league, p.id); say(out.ok ? 'Fee agreed. You can now negotiate his wages.' : out.text); });
    on('#rcUnlist', () => { FM.removeFromShortlist(league, p.id); save(); draw(); });
    on('#rcNegotiate', () => { const out = FM.startWageTalks(league, p.id); say(out.ok ? 'The agent is ready to talk.' : out.text); });
    on('#rcWageGo', () => {
      const out = FM.offerWage(league, p.id, side.querySelector('#rcWage').value, side.querySelector('#rcYears').value);
      if (out.status === 'signed') FM.picture(FM.scenePictureKey(p, FM.dealOf(league, p.id), 'unveil'), FM.scenePictureRequest(p, 'unveil'));
      say(out.ok ? (out.status === 'signed' ? '' : out.text || '') : out.text);
    });
    on('#rcWageAccept', () => {
      const years = side.querySelector('#rcYears').value, d0 = FM.dealOf(league, p.id);
      const out = FM.offerWage(league, p.id, FM.agentAsk(d0, Number(years)), years);
      if (out.status === 'signed') FM.picture(FM.scenePictureKey(p, FM.dealOf(league, p.id), 'unveil'), FM.scenePictureRequest(p, 'unveil'));
      say(out.ok ? (out.status === 'signed' ? '' : out.text || '') : out.text);
    });
    on('#rcWalk', () => { const d = FM.dealOf(league, p.id); if (d) { d.stage = 'interest'; d.fee = null; d.agreedRound = null; d.wageAsk = null; d.history.push({ who: 'you', text: 'You walked away from the talks.' }); } say('You have walked away. He stays on your shortlist.'); });
    on('#rcToSquad', () => { if (hooks.openSquad) hooks.openSquad(); });
  }
  const r1 = (v) => Math.round(v * 10) / 10;

  // ---------- the news ----------
  const ns = { mine: false, open: null };
  const dateLine = (n) => (n.day != null ? FM.dayLabel(n.day) : '') + (n.round >= 0 ? ' · after round ' + (n.round + 1) : '');
  function playerFor(league, n) {
    if (n.playerId) return FM.findPlayer(league, n.playerId);
    const text = n.headline + ' ' + n.body;
    for (const tm of league.teams) for (const p of tm.squad) if (text.indexOf(p.name) >= 0) return p;
    return null;
  }
  function paragraphs(body) {
    const sentences = String(body || '').match(/[^.!?]+[.!?]+["”]?\s*/g) || [String(body || '')];
    const out = []; let cur = '';
    sentences.forEach((s) => { cur += s; if (cur.length > 170) { out.push(cur.trim()); cur = ''; } });
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  FM.renderNews = function (host, league) {
    FM.ensurePreseasonNews(league);
    const all = (league.news || []).slice().reverse();
    const open = ns.open != null ? all.find((n) => n.id === ns.open) : null;
    if (open) {
      const p = playerFor(league, open);
      // a spoken line is set apart as a pull quote, and taken out of the paragraphs so it is not said twice
      const qm = open.body.match(/"([^"]{12,160})"[^.]*?(said|says|added)[^.]*\.\s*/);
      const quote = qm ? qm[1].replace(/,$/, '') : null, bodyText = qm ? open.body.replace(qm[0], '') : open.body;
      const paras = paragraphs(bodyText);
      const more = all.filter((n) => n.id !== open.id).slice(0, 5);
      host.innerHTML = `<div class="nw-article"><button type="button" id="nwBack">‹ All stories</button>
        <article class="card"><div class="nw-meta"><span class="nw-kind ${open.mine ? 'mine' : ''}">${esc(open.kind)}</span><span>${esc(dateLine(open))}</span></div>
          <h1>${esc(open.headline)}</h1>${open.dek ? `<p class="nw-dek">${esc(open.dek)}</p>` : ''}
          <p class="note news-byline">${esc(open.reporter || 'The LastMind Football desk')} · ${esc(open.publication || 'The Touchline')}</p>
          ${p ? `<figure class="nw-photo"><div id="nwPhoto" class="rc-scene"></div><figcaption>${esc(p.name)}, ${esc((FM.clubOf(league, p) || {}).name || '')}</figcaption></figure>` : ''}
          ${paras.map((x, i) => `<p class="nw-body">${esc(x)}</p>${i === 0 && quote ? `<blockquote>“${esc(quote)}”</blockquote>` : ''}`).join('')}
          ${open.offer && FM.bizOfferBlock ? FM.bizOfferBlock(league, open.offer) : ''}
        </article>
        <aside class="card"><h3>More stories</h3>${more.map((n) => `<button type="button" class="nw-more" data-story="${esc(n.id)}"><span class="nw-kind ${n.mine ? 'mine' : ''}">${esc(n.kind)}</span> ${esc(n.headline)}</button>`).join('')}</aside></div>`;
      if (FM.bizBindOffers) FM.bizBindOffers(host, league, () => { if (FM.requestSave) FM.requestSave(); FM.renderNews(host, league); });
      host.querySelector('#nwBack').addEventListener('click', () => { ns.open = null; FM.renderNews(host, league); });
      host.querySelectorAll('[data-story]').forEach((b) => b.addEventListener('click', () => { ns.open = b.dataset.story; FM.renderNews(host, league); if (host.scrollIntoView) host.scrollIntoView(); }));
      if (p) {
        const el = host.querySelector('#nwPhoto');
        // the picture of the player: the one already made, or it is made now and kept for every later story about him
        pictureInto(el, FM.playerPictureKey(p), FM.playerPictureRequest(p), true, `<span class="fallback">${esc(p.name.split(/\s+/).map((x) => x[0]).slice(0, 2).join(''))}</span>`);
      }
      return;
    }
    const list = ns.mine ? all.filter((n) => n.mine) : all;
    const rounds = {}; list.forEach((n) => { (rounds[n.round] = rounds[n.round] || []).push(n); });
    const keys = Object.keys(rounds).map(Number).sort((a, b) => b - a);
    const lead = list[0];
    host.innerHTML = `<div style="display:grid;gap:16px"><div class="card"><h2>News</h2>
      <p class="desc">Stories from the league, the transfer market, the training ground and the press room. Click a headline to read it.</p>
      <div class="row"><button id="nwAll" class="${ns.mine ? '' : 'on'}">Whole league</button><button id="nwMine" class="${ns.mine ? 'on' : ''}">My club</button></div></div>
      ${lead ? `<button type="button" class="nw-lead" data-story="${esc(lead.id)}"><span class="nw-kind ${lead.mine ? 'mine' : ''}">${esc(lead.kind)}</span><strong>${esc(lead.headline)}</strong>${lead.dek ? `<em>${esc(lead.dek)}</em>` : ''}</button>` : ''}
      ${keys.length ? keys.map((r) => `<div class="card"><h2>${r < 0 ? 'Pre-season' : 'After round ' + (r + 1)}</h2><div class="nw-list">${rounds[r].map((n) => `<button type="button" class="nw-item" data-story="${esc(n.id)}"><span class="nw-kind ${n.mine ? 'mine' : ''}">${esc(n.kind)}</span><span class="nw-h">${esc(n.headline)}</span><span class="nw-d">${esc(n.dek || '')}</span></button>`).join('')}</div></div>`).join('') : '<div class="card"><p class="note">No stories yet.</p></div>'}</div>`;
    host.querySelector('#nwAll').addEventListener('click', () => { ns.mine = false; FM.renderNews(host, league); });
    host.querySelector('#nwMine').addEventListener('click', () => { ns.mine = true; FM.renderNews(host, league); });
    host.querySelectorAll('[data-story]').forEach((b) => b.addEventListener('click', () => { ns.open = b.dataset.story; FM.renderNews(host, league); }));
  };
  // opening a particular story from elsewhere
  FM.openStory = (id) => { ns.open = id; };
})();
