// Transfers. Prices follow a player's quality, age and position and what his club needs; every club has a transfer budget; the manager can declare
// interest, approach a club and negotiate wages, and the other clubs make their own moves between rounds. Everything is worked out here in code:
// nothing is invented by an AI model, and every number can be traced to a rule below. Pictures (a player's portrait, the scenes of a deal) are made
// by the backend once and kept in the browser, so they are never asked for twice.
(function () {
  const FM = (window.FM = window.FM || {});
  const POS = ['GK', 'CB', 'FB', 'DM', 'CM', 'AM', 'WF', 'ST'];
  const POS_NAME = { GK: 'goalkeeper', CB: 'centre-back', FB: 'full-back', DM: 'defensive midfielder', CM: 'midfielder', AM: 'attacking midfielder', WF: 'winger', ST: 'striker' };
  const MIN_SQUAD = 15;
  const r1 = (v) => Math.round(v * 10) / 10;
  const hsh = (s) => FM.hashString(String(s));
  FM.POS_NAME = POS_NAME;

  // ---------- the player as a person: age, looks, value, wage ----------
  FM.ageOf = (p) => p.age || (18 + (hsh(p.id + ':age') % 17));
  const HAIR = ['short black hair', 'short dark brown hair', 'a shaved head', 'short curly black hair', 'short light brown hair', 'short blond hair', 'tied-back dark hair', 'a neat afro', 'short ginger hair', 'a buzz cut'];
  const SKIN = ['light skin', 'olive skin', 'tan skin', 'medium brown skin', 'dark brown skin', 'deep dark skin', 'fair freckled skin'];
  const EXTRA = ['clean-shaven', 'a short beard', 'light stubble', 'clean-shaven', 'a trimmed moustache', 'clean-shaven'];
  // Looks come from the player's id alone, so the same player always looks the same (and is drawn the same way in every picture of him).
  FM.lookOf = (p) => { const h = hsh(p.id + ':look'); return HAIR[h % HAIR.length] + ', ' + SKIN[(h >> 4) % SKIN.length] + ', ' + EXTRA[(h >> 8) % EXTRA.length]; };
  FM.valueOf = function (p) {
    const r = FM.playerRating(p, p.natural), a = FM.ageOf(p);
    let v = 4 * Math.exp((r - 8.4) * 2.2);
    v *= a <= 21 ? 1.35 : a <= 25 ? 1.15 : a <= 28 ? 1 : a <= 31 ? 0.7 : 0.4;
    if (p.natural === 'GK') v *= 0.75;
    // a young player with a lot of room to grow is worth more than his ability alone
    if (FM.potentialOf && a <= 24) { const room = Math.max(0, FM.potentialOf(p) - FM.abilityOf(p)); v *= 1 + room / 45; }
    return Math.max(0.2, v);
  };
  FM.wageOf = (p) => p.wage != null ? p.wage : Math.max(2, r1(FM.valueOf(p) * 1.1 + 2));   // £ thousand a week
  FM.clubOf = (league, p) => league.teams.find((t) => t.squad.indexOf(p) >= 0) || null;
  FM.findPlayer = (league, id) => { for (const t of league.teams) { const p = t.squad.find((x) => x.id === id); if (p) return p; } return null; };
  const money = (m) => '£' + (m >= 10 ? Math.round(m) : r1(m).toFixed(1)) + 'm';
  FM.money = money;
  const userRounds = (league) => league.fixtures.filter((f) => f.played && (f.homeId === league.userId || f.awayId === league.userId)).length;

  // ---------- state ----------
  FM.transfer = function (league) {
    if (!league.transfer) {
      const budget = {}, wageBudget = {};
      league.teams.forEach((t) => {
        budget[t.id] = r1(14 + 5 * (t.strength || 0));
        wageBudget[t.id] = r1(t.squad.reduce((a, p) => a + FM.wageOf(p), 0) + 25 + 8 * (t.strength || 0));
      });
      league.transfer = { v: 1, budget, wageBudget, shortlist: [], deals: {}, offers: [], ai: {}, hikes: {}, seq: 1, moves: [] };
      if (FM.bizSyncBudget && !league.mp) FM.bizSyncBudget(league);   // the money to spend is the cash in the club's books
    }
    if (!league.transfer.reserves) { league.transfer.reserves = true; addReserves(league); }
    // A new game opens with a few offers already waiting: clubs have been looking at the squad all summer. Which clubs, and for whom, differs
    // from one game to the next.
    if (!league.transfer.opening) {
      league.transfer.opening = true;
      if (userRounds(league) === 0) openingOffers(league);
    }
    return league.transfer;
  };
  function offerStory(league, team, p, fee, opening) {
    const me = FM.teamById(league, league.userId);
    story(league, { kind: 'Offer', headline: opening ? `${team.name} want ${p.name}: ${money(fee)} on the table` : `${team.name} bid ${money(fee)} for ${p.name}`,
      dek: opening ? `A bid is waiting for ${me.name} before a ball has been kicked.` : `A formal offer has arrived at ${me.name}.`,
      body: `${team.name} have made a formal offer of ${money(fee)} for ${p.name}, the ${FM.ageOf(p)}-year-old ${POS_NAME[p.natural]}. The decision is with ${me.name}: the offer can be accepted, rejected, or answered with a price of the club's own.`,
      playerId: p.id, mine: true, teams: [team.id, me.id], scene: 'approach' });
  }
  // Who a club would bid for in the manager's squad. Every player who would improve them is a candidate and the draw is weighted, not a top-four
  // list, and each club has its own taste this time (a young player with room to grow, an experienced one, or simply the position it is short of),
  // so the names that come in differ from one game to the next and from one round to the next.
  function pickTarget(league, team, me, taken, rng, budgetCap) {
    const taste = ['youth', 'seasoned', 'need', 'any'][Math.floor(rng() * 4)], needs = FM.clubNeeds(team);
    const cands = me.squad.filter((p) => !taken.has(p.id) && FM.canSell(me, p)).map((p) => {
      const mates = team.squad.filter((q) => q.natural === p.natural), top = mates.length ? Math.max(...mates.map((q) => FM.playerRating(q))) : 0;
      const gain = FM.playerRating(p) - top + (needs.indexOf(p.natural) >= 0 ? 0.5 : 0), age = FM.ageOf(p), price = FM.askingPrice(league, p);
      let w = Math.max(0.05, gain + 1.2) * (0.35 + rng() * 1.3);
      if (taste === 'youth' && age <= 23) w *= 2.2; else if (taste === 'seasoned' && age >= 28) w *= 2.2; else if (taste === 'need' && needs.indexOf(p.natural) >= 0) w *= 2.5;
      return { p, gain, price, w };
    }).filter((o) => o.gain > -0.6 && o.price <= budgetCap);
    if (!cands.length) return null;
    let r = rng() * cands.reduce((a, o) => a + o.w, 0);
    for (const o of cands) { r -= o.w; if (r <= 0) return o; }
    return cands[cands.length - 1];
  }
  function openingOffers(league) {
    const t = league.transfer, me = FM.teamById(league, league.userId);
    const rng = FM.mulberry32(league.seed + (league.runSeed || 0) * 977 + 4242);
    const clubs = league.teams.filter((x) => x.id !== league.userId).sort(() => rng() - 0.5);
    const count = 2 + Math.floor(rng() * 3);   // two to four
    const taken = new Set();
    for (const team of clubs) {
      if (t.offers.length >= count) break;
      const budget = t.budget[team.id] || 0;
      const o = pickTarget(league, team, me, taken, rng, budget * 1.05);
      if (!o) continue;
      const fee = r1(Math.max(0.2, o.price * (0.9 + rng() * 0.25)));
      taken.add(o.p.id);
      t.offers.push({ id: 'o' + (t.seq++), pid: o.p.id, from: team.id, fee, age: -1, status: 'open' });
      offerStory(league, team, o.p, fee, true);
    }
  }
  // Each computer-run club's squad is rounded out with reserves, so every club has real cover in every position (two on top of the players it
  // starts there, one in goal) and a market worth browsing. They are young and rate a little below the club's average.
  function addReserves(league) {
    const t = league.transfer;
    league.teams.forEach((team) => {
      if (team.id === league.userId) return;
      const avg = team.squad.reduce((a, p) => a + FM.playerRating(p), 0) / Math.max(1, team.squad.length);
      POS.forEach((pos) => {
        const want = pos === 'GK' ? 3 : Math.max(1, starters(team, pos)) + 2;
        let guard = 0;
        while (depth(team, pos) < want && guard++ < 4) {
          const y = youth(league, team, pos, avg - 0.35); y.age = 18 + (t.seq % 4);
          team.squad.push(y); team.bench.push(y);
          t.wageBudget[team.id] = r1((t.wageBudget[team.id] || 0) + FM.wageOf(y));
        }
      });
    });
  }
  const wageBill = (team) => team.squad.reduce((a, p) => a + FM.wageOf(p), 0);
  FM.wageRoom = (league, teamId) => { const t = FM.transfer(league), team = FM.teamById(league, teamId); return r1((t.wageBudget[teamId] || 0) - wageBill(team)); };

  // ---------- what a club will take: need, supply and demand ----------
  function depth(team, pos) { return team.squad.filter((p) => p.natural === pos).length; }
  // How many of a position a club wants: the players it starts there, and one more as cover (two goalkeepers). A club is only "short" when it
  // has fewer than that, which happens after it sells someone or loses a player for long.
  function starters(team, pos) { return team.players.filter((p) => p.natural === pos).length; }
  function needDepth(team, pos) { return pos === 'GK' ? 2 : Math.max(1, starters(team, pos)) + 1; }
  FM.clubNeeds = function (team) {
    return POS.filter((pos) => depth(team, pos) < needDepth(team, pos));
  };
  function isKeyPlayer(team, p) { const same = team.squad.filter((q) => q.natural === p.natural).sort((a, b) => FM.playerRating(b) - FM.playerRating(a)); return same[0] === p; }
  FM.canSell = function (team, p) {
    if (team.squad.length <= MIN_SQUAD) return false;
    if (p.natural === 'GK' && depth(team, 'GK') <= 1) return false;
    return true;
  };
  FM.askingPrice = function (league, p) {
    const club = FM.clubOf(league, p), t = FM.transfer(league);
    let price = FM.valueOf(p);
    if (club) {
      const d = depth(club, p.natural), need = needDepth(club, p.natural);
      if (d < need) price *= 1.1 + 0.08 * (need - d);                  // thin in that position: he is harder to buy
      else if (d >= need + 2) price *= 0.88;                           // plenty of cover: they will listen
      if (isKeyPlayer(club, p)) price *= 1.1;
      const budget = t.budget[club.id] || 0;
      if (budget < 2) price *= 0.93;                                   // a club short of money sells a little cheaper
    }
    price *= t.hikes[p.id] || 1;
    price *= 0.96 + (hsh(p.id + ':ask') % 9) / 100;                    // every club values the same player a little differently
    return Math.max(0.2, r1(price));
  };
  FM.priceReasons = function (league, p) {
    const club = FM.clubOf(league, p), out = [], t = FM.transfer(league);
    if (!club) return out;
    const d = depth(club, p.natural), need = needDepth(club, p.natural);
    if (d < need) out.push(club.name + ' are short of ' + POS_NAME[p.natural] + 's, so they are reluctant to sell');
    else if (d >= need + 2) out.push(club.name + ' have plenty of cover in his position');
    if (isKeyPlayer(club, p)) out.push('he is a key player for them');
    if ((t.hikes[p.id] || 1) > 1.01) out.push('rival interest has pushed the price up');
    if ((t.ai[p.id])) out.push('another club is already in talks for him');
    return out;
  };

  // ---------- moving a player between clubs ----------
  function nextNumber(team) { return Math.max(20, ...team.squad.map((p) => p.number || 0)) + 1; }
  function youth(league, team, pos, avg) {
    const t = FM.transfer(league);
    const rng = FM.mulberry32(league.seed + (league.runSeed || 0) + t.seq * 977);
    const body = FM.generatePhysique(pos, rng), ratings = FM.generateRatings(pos, rng, team.strength || 0, body.height);
    const used = new Set(league.teams.reduce((a, tm) => a.concat(tm.squad.map((p) => p.name)), []));
    const id = FM.generateIdentity(rng, used);
    const keys = ['pace', 'dribbling', 'passing', 'finishing', 'tackling', 'heading', 'composure', 'stamina'];
    const mean = keys.reduce((a, k) => a + ratings[k], 0) / keys.length, target = (avg || 8.0) * 10 - 22;   // just below the club's average
    const shift = Math.round(target - mean) * 0.5;
    keys.forEach((k) => { ratings[k] = Math.max(25, Math.min(95, ratings[k] + shift)); });
    if (pos === 'GK') ratings.gk = Math.max(45, Math.min(92, ratings.gk + shift));
    const p = { id: 'y' + (t.seq++) + '-' + team.id, number: nextNumber(team), natural: pos, name: id.name, nation: id.nation, height: body.height, foot: body.foot, group: pos, index: -1, slotKey: null, roleId: null, options: {}, ratings, x: 0, y: 0, vx: 0, vy: 0, maxSpeed: FM.speedFromPace(ratings.pace), stats: { apps: 0, goals: 0, shots: 0, yellows: 0, reds: 0 }, age: 18 + Math.floor(rng() * 3) };
    return p;
  }
  function bestReplacement(team, p) {
    const prefs = (FM.GROUP_NEAR && FM.GROUP_NEAR[p.natural]) || [p.natural];
    let best = null, bestScore = -1e9;
    team.bench.forEach((q) => {
      const rank = prefs.indexOf(q.natural); if (rank < 0) return;
      const s = FM.playerRating(q) - rank * 0.6 - (FM.isInjured(q) ? 5 : 0);
      if (s > bestScore) { bestScore = s; best = q; }
    });
    return best;
  }
  function detach(league, team, p) {
    if (team.players.indexOf(p) >= 0) {
      let rep = bestReplacement(team, p);
      if (!rep) { rep = youth(league, team, p.natural, 8); team.squad.push(rep); team.bench.push(rep); }
      FM.substitute(team, p, rep, null);
    }
    team.bench = team.bench.filter((q) => q !== p);
    team.squad = team.squad.filter((q) => q !== p);
    if (team.bench.length === 0) { const y = youth(league, team, 'CM', 8); team.squad.push(y); team.bench.push(y); }
  }
  function attach(team, p) {
    p.number = nextNumber(team); p.index = -1; p.slotKey = null; p.group = p.natural; p.roleId = null; p.options = {}; p.instr = {};
    team.squad.push(p); team.bench.push(p);
  }
  function topUp(league, team) {
    let guard = 0;
    while (team.squad.length < MIN_SQUAD + 1 && guard++ < 6) {
      const need = FM.clubNeeds(team)[0] || 'CM';
      const avg = team.squad.reduce((a, p) => a + FM.playerRating(p), 0) / Math.max(1, team.squad.length);
      const y = youth(league, team, need, avg); team.squad.push(y); team.bench.push(y);
    }
  }
  function autoPick(team) {   // computer-run clubs play their best available players
    for (let i = 0; i < team.players.length; i++) {
      const s = team.players[i];
      let best = null;
      team.bench.forEach((q) => {
        if (q.natural !== s.natural || FM.isInjured(q)) return;
        if (FM.playerRating(q) > FM.playerRating(s) + 0.05 && (!best || FM.playerRating(q) > FM.playerRating(best))) best = q;
      });
      if (best) FM.substitute(team, s, best, null);
    }
  }
  function move(league, p, to, fee, wage, years) {
    const t = FM.transfer(league), from = FM.clubOf(league, p);
    if (!from || from === to) return false;
    detach(league, from, p);
    attach(to, p);
    p.wage = wage != null ? wage : FM.wageOf(p); p.contract = years || 3; p.joined = league.day;
    t.budget[to.id] = r1((t.budget[to.id] || 0) - fee); t.budget[from.id] = r1((t.budget[from.id] || 0) + fee);
    t.wageBudget[from.id] = r1((t.wageBudget[from.id] || 0) + 0); // wage room frees itself, as the bill drops
    delete t.hikes[p.id]; delete t.ai[p.id];
    t.offers = t.offers.filter((o) => o.pid !== p.id);
    t.moves.push({ pid: p.id, name: p.name, from: from.id, to: to.id, fee, day: league.day });
    if (FM.bizTransfer && (to.id === league.userId || from.id === league.userId)) FM.bizTransfer(league, p, from, to, fee, p.wage, years || 3);   // the club's books
    if (from.id !== league.userId) { topUp(league, from); autoPick(from); }
    if (to.id !== league.userId) autoPick(to);
    return true;
  }

  // ---------- news ----------
  const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
  const tierOf = (p) => { const r = FM.playerRating(p); return r >= 8.8 ? 'star' : r >= 8.4 ? 'quality' : 'solid'; };
  const SUBJ = { star: 'one of the most talked-about players in the league', quality: 'a player with a growing reputation', solid: 'a dependable option' };
  function story(league, item) {
    item.round = userRounds(league) - 1; item.day = league.day;
    item.reporter = item.reporter || 'Leo Marsh';
    FM.pushNews(league, item);
  }
  function news(league, kind, p, headline, dek, body, extra) {
    story(league, Object.assign({ kind, headline, dek, body, playerId: p ? p.id : null }, extra || {}));
  }
  const rngFor = (league, salt) => FM.mulberry32(league.seed + (league.runSeed || 0) + league.day * 131 + hsh(salt));

  // ---------- the manager's actions ----------
  FM.dealOf = (league, pid) => FM.transfer(league).deals[pid] || null;
  function ensureDeal(league, p) {
    const t = FM.transfer(league), club = FM.clubOf(league, p);
    if (!t.deals[p.id]) t.deals[p.id] = { id: 'd' + (t.seq++), pid: p.id, from: club.id, stage: 'interest', history: [], images: {} };
    if (t.shortlist.indexOf(p.id) < 0) t.shortlist.push(p.id);
    return t.deals[p.id];
  }
  FM.removeFromShortlist = (league, pid) => { const t = FM.transfer(league); t.shortlist = t.shortlist.filter((x) => x !== pid); };

  FM.declareInterest = function (league, pid) {
    const t = FM.transfer(league), p = FM.findPlayer(league, pid), me = FM.teamById(league, league.userId);
    if (!p) return { ok: false, text: 'That player is no longer there.' };
    const club = FM.clubOf(league, p);
    if (club === me) return { ok: false, text: 'He already plays for you.' };
    const deal = ensureDeal(league, p);
    if (deal.declared) return { ok: true, again: true, ask: FM.askingPrice(league, p), deal };
    deal.declared = true;
    const before = FM.askingPrice(league, p), rng = rngFor(league, 'interest' + pid);
    // Supply and demand: if another club is already in talks for him, a second interested club lifts his price more often than not. Otherwise,
    // a little interest only occasionally moves it.
    const rival = !!t.ai[pid];
    let hiked = false;
    if (rng() < (rival ? 0.65 : 0.12)) { t.hikes[pid] = (t.hikes[pid] || 1) * (rival ? 1.08 + rng() * 0.17 : 1.03 + rng() * 0.05); hiked = true; }
    const ask = FM.askingPrice(league, p);
    deal.askAtInterest = ask;
    const first = p.name.split(' ')[0], age = FM.ageOf(p), pos = POS_NAME[p.natural];
    const heads = [
      `${me.name} make their move: ${p.name} is a target`,
      `${me.name} eye ${p.name} as ${club.name} brace for interest`,
      `Interest declared: ${me.name} want ${p.name}`,
    ];
    const lines = [
      `${me.name} have registered their interest in ${p.name}, the ${age}-year-old ${p.nation} ${pos} who has become ${SUBJ[tierOf(p)]}.`,
      `${club.name} are said to value him at around ${money(ask)}.`,
      hiked ? (rival ? `The timing is awkward: another club is already in talks, and the extra attention has pushed the price up from ${money(before)}.` : `Word of the interest has nudged the asking price up from ${money(before)}.`) : (rival ? 'Another club is already in talks, but no one has yet moved the price.' : 'There is no sign yet of other clubs getting involved.'),
      `Nothing is agreed: ${first} remains a ${club.name} player for now.`,
    ];
    news(league, 'Transfer interest', p, pick(rng, heads), `${me.name} have asked about a ${pos} from ${club.name}.`, lines.join(' '), { mine: true, scene: 'declare', teams: [me.id, club.id] });
    return { ok: true, ask, hiked, rival, before, deal };
  };

  FM.approachClub = function (league, pid, bid) {
    const t = FM.transfer(league), p = FM.findPlayer(league, pid), me = FM.teamById(league, league.userId);
    if (!p) return { ok: false, text: 'That player is no longer there.' };
    const club = FM.clubOf(league, p);
    if (club === me) return { ok: false, text: 'He already plays for you.' };
    const deal = ensureDeal(league, p);
    if (deal.stage === 'fee_agreed') return { ok: true, status: 'agreed', deal };
    if (deal.coolRound != null && userRounds(league) <= deal.coolRound) return { ok: false, text: club.name + ' will not talk again until after your next match.' };
    bid = r1(Number(bid));
    if (!(bid > 0)) return { ok: false, text: 'Enter a fee first.' };
    if (bid > (t.budget[me.id] || 0) + 1e-9) return { ok: false, text: 'You only have ' + money(t.budget[me.id] || 0) + ' to spend.' };
    const rng = rngFor(league, 'approach' + pid + bid);
    const ask = FM.askingPrice(league, p);
    const keyMan = isKeyPlayer(club, p), thr = keyMan ? 1 : 0.93, ratio = bid / ask;
    deal.history.push({ who: 'you', text: 'Offer of ' + money(bid) });
    if (!FM.canSell(club, p)) {
      deal.stage = 'bid_rejected'; deal.coolRound = userRounds(league);
      deal.history.push({ who: 'club', text: club.name + ' have too few players to let him go.' });
      news(league, 'Transfer approach', p, `${club.name} turn down ${me.name}'s approach for ${p.name}`, `The answer was a flat no.`, `${club.name} have rejected a formal approach from ${me.name} for ${p.name}, saying they cannot afford to lose players in his position at this stage of the season.`, { mine: true, scene: 'rejected', teams: [me.id, club.id] });
      return { ok: true, status: 'rejected', text: club.name + ' will not sell: they cannot afford to be short of players.', deal };
    }
    let status;
    if (ratio >= thr) {
      deal.stage = 'fee_agreed'; deal.fee = Math.min(bid, ask); deal.agreedRound = userRounds(league); status = 'agreed';
      deal.history.push({ who: 'club', text: club.name + ' accept ' + money(deal.fee) + ' and give you permission to speak to the player.' });
      news(league, 'Transfer approach', p, `${club.name} agree a fee with ${me.name} for ${p.name}`, `${me.name} now have permission to talk to the player.`, `${me.name} have agreed a fee of ${money(deal.fee)} with ${club.name} for ${p.name}. The ${FM.ageOf(p)}-year-old ${POS_NAME[p.natural]} is now free to discuss personal terms. Nothing is final until a contract is signed, and a rival could still make a move if the talks drag on.`, { mine: true, scene: 'approach', teams: [me.id, club.id] });
    } else if (ratio >= thr - 0.2) {
      const counter = r1(Math.max(bid + 0.1, (ask * thr + bid) / 2));
      deal.stage = 'counter'; deal.counter = counter; status = 'counter';
      deal.history.push({ who: 'club', text: club.name + ' come back at ' + money(counter) + '.' });
      news(league, 'Transfer approach', p, `${me.name} bid for ${p.name}; ${club.name} want more`, `A counter-offer is on the table.`, `${me.name} have made an offer of ${money(bid)} for ${p.name}. ${club.name} have not rejected it outright, but are holding out for ${money(counter)}.`, { mine: true, scene: 'approach', teams: [me.id, club.id] });
    } else {
      deal.stage = 'bid_rejected'; deal.coolRound = userRounds(league); status = 'rejected';
      t.hikes[pid] = (t.hikes[pid] || 1) * 1.02;
      deal.history.push({ who: 'club', text: club.name + ' reject the offer.' });
      news(league, 'Transfer approach', p, `${club.name} reject ${me.name}'s bid for ${p.name}`, `${money(bid)} was not close enough.`, `${club.name} have turned down an offer of ${money(bid)} from ${me.name} for ${p.name}, which they consider well short of his value. The door is not closed, but the next offer will need to be a serious one.`, { mine: true, scene: 'rejected', teams: [me.id, club.id] });
    }
    void rng;
    return { ok: true, status, counter: deal.counter, ask, deal };
  };
  // Turning down the club's counter-offer: the approach ends, and he stays on the shortlist.
  FM.rejectCounter = function (league, pid) {
    const t = FM.transfer(league), p = FM.findPlayer(league, pid), deal = t.deals[pid];
    if (!deal || deal.stage !== 'counter' || !p) return { ok: false, text: 'There is no counter-offer to turn down.' };
    const club = FM.clubOf(league, p);
    deal.history.push({ who: 'you', text: 'You turned down ' + money(deal.counter) + '.' });
    deal.stage = 'interest'; deal.counter = null; deal.fee = null;
    return { ok: true, deal, text: 'You turned down ' + (club ? club.name + "'s" : 'their') + ' price. He stays on your shortlist.' };
  };
  // What the agent is asking for a contract of this length (the same adjustment the talks themselves use).
  FM.agentAsk = function (deal, years) {
    const adj = years >= 4 ? 0.97 : years <= 1 ? 1.05 : 1;
    return r1((deal.wageCur != null ? deal.wageCur : deal.wageAsk) * adj);
  };
  FM.acceptCounter = function (league, pid) {
    const t = FM.transfer(league), p = FM.findPlayer(league, pid), deal = t.deals[pid], me = FM.teamById(league, league.userId);
    if (!deal || deal.stage !== 'counter' || !p) return { ok: false, text: 'There is no counter-offer to accept.' };
    if (deal.counter > (t.budget[me.id] || 0)) return { ok: false, text: 'You only have ' + money(t.budget[me.id] || 0) + ' to spend.' };
    const club = FM.clubOf(league, p);
    deal.stage = 'fee_agreed'; deal.fee = deal.counter; deal.agreedRound = userRounds(league);
    deal.history.push({ who: 'you', text: 'Accepted ' + money(deal.fee) });
    news(league, 'Transfer approach', p, `${me.name} and ${club.name} agree a fee for ${p.name}`, `${money(deal.fee)}, and the player can now be spoken to.`, `After a short exchange, ${me.name} have agreed to pay ${money(deal.fee)} for ${p.name}. ${club.name} have given permission for the player to discuss personal terms.`, { mine: true, scene: 'approach', teams: [me.id, club.id] });
    return { ok: true, deal };
  };

  // Wage talks with the player and his agent
  function wageTerms(league, p, deal) {
    if (deal.wageAsk != null) return;
    const base = FM.wageOf(p), h = hsh(p.id + ':greed');
    const greed = 1.12 + (h % 30) / 100;                              // 1.12 to 1.41 times what the club pays him now
    const age = FM.ageOf(p);
    deal.wageAsk = r1(base * greed * (age <= 21 ? 0.88 : 1));
    deal.wageFloor = r1(base * (1.02 + ((h >> 5) % 12) / 100) * (age <= 21 ? 0.9 : 1));
    deal.wageCur = deal.wageAsk; deal.patience = 4; deal.years = deal.years || 3;
  }
  FM.startWageTalks = function (league, pid) {
    const t = FM.transfer(league), p = FM.findPlayer(league, pid), deal = t.deals[pid];
    if (!deal || (deal.stage !== 'fee_agreed' && deal.stage !== 'wage_talks') || !p) return { ok: false, text: 'Approach the club and agree a fee first.' };
    wageTerms(league, p, deal);
    if (deal.stage !== 'wage_talks') { deal.stage = 'wage_talks'; deal.history.push({ who: 'agent', text: 'His agent opens: ' + r1(deal.wageAsk) + 'k a week.' }); }
    return { ok: true, deal };
  };
  FM.offerWage = function (league, pid, wage, years) {
    const t = FM.transfer(league), p = FM.findPlayer(league, pid), deal = t.deals[pid], me = FM.teamById(league, league.userId);
    if (!deal || deal.stage !== 'wage_talks' || !p) return { ok: false, text: 'There are no wage talks open with this player.' };
    wage = r1(Number(wage)); years = Math.max(1, Math.min(5, Math.round(Number(years)) || 3));
    if (!(wage > 0)) return { ok: false, text: 'Enter a weekly wage first.' };
    const adj = years >= 4 ? 0.97 : years <= 1 ? 1.05 : 1;           // security is worth a little to him; a one-year deal costs more
    const ask = r1(deal.wageCur * adj), floor = r1(deal.wageFloor * adj);
    deal.history.push({ who: 'you', text: 'You offer ' + wage + 'k a week for ' + years + ' year' + (years === 1 ? '' : 's') + '.' });
    if (wage - (FM.wageOf(p)) > FM.wageRoom(league, me.id) + 1e-9) {
      return { ok: false, text: 'That is more than the wage budget allows. You have ' + FM.wageRoom(league, me.id) + 'k a week of room.' };
    }
    if (wage >= ask) return finishSigning(league, p, deal, wage, years);
    deal.patience -= 1;
    let reply, mood;
    if (wage >= floor) {
      const next = r1(Math.max(floor, Math.min(deal.wageCur * adj, (ask + wage) / 2 + 0.2)));
      deal.wageCur = r1(next / adj); mood = 'counter';
      reply = 'His agent thinks about it and comes back at ' + next + 'k a week.';
    } else if (wage >= floor * 0.8) {
      deal.wageCur = r1(deal.wageCur * 0.98); mood = 'short';
      reply = 'His agent says that is some way short, and asks you to come back with something nearer ' + r1(deal.wageCur * adj) + 'k.';
    } else {
      deal.wageCur = r1(deal.wageCur * 1.03); deal.patience -= 1; mood = 'insulted';
      reply = 'His agent is not impressed: that is below what they expected, and the player\'s side are losing patience.';
    }
    deal.history.push({ who: 'agent', text: reply });
    if (deal.patience <= 0) {
      deal.stage = 'collapsed';
      deal.history.push({ who: 'agent', text: 'His agent ends the talks. The player will not be joining.' });
      news(league, 'Transfer collapse', p, `${p.name} talks collapse: ${me.name} and the agent cannot agree terms`, `The fee was agreed, but the wages were not.`, `${me.name} had agreed a fee of ${money(deal.fee || 0)} with ${FM.clubOf(league, p).name} for ${p.name}, but talks over personal terms have broken down. The player's representatives have walked away.`, { mine: true, scene: 'rejected', teams: [me.id] });
      return { ok: true, status: 'collapsed', text: reply, deal };
    }
    return { ok: true, status: mood, text: reply, ask: r1(deal.wageCur * adj), patience: deal.patience, deal };
  };
  function finishSigning(league, p, deal, wage, years) {
    const t = FM.transfer(league), me = FM.teamById(league, league.userId), from = FM.clubOf(league, p);
    const fee = deal.fee != null ? deal.fee : FM.askingPrice(league, p);
    if (fee > (t.budget[me.id] || 0) + 1e-9) return { ok: false, text: 'The transfer budget no longer covers ' + money(fee) + '.' };
    if (!move(league, p, me, fee, wage, years)) return { ok: false, text: 'The move could not be completed.' };
    deal.stage = 'signed'; deal.wage = wage; deal.years = years; deal.history.push({ who: 'agent', text: 'Agreed: ' + wage + 'k a week for ' + years + ' years. He signs.' });
    const first = p.name.split(' ')[0];
    news(league, 'Signing', p, `${p.name} signs for ${me.name}!`, `${money(fee)} from ${from.name}, on ${wage}k a week for ${years} years.`,
      `${me.name} have completed the signing of ${p.name} from ${from.name} for ${money(fee)}. The ${FM.ageOf(p)}-year-old ${p.nation} ${POS_NAME[p.natural]} has signed a ${years}-year contract worth ${wage}k a week. "${first} is exactly the kind of player we wanted," a club source said. He joins the squad immediately and is available for selection.`,
      { mine: true, scene: 'signing', teams: [me.id, from.id] });
    return { ok: true, status: 'signed', deal, player: p };
  }

  // ---------- offers for the manager's own players, and how they are answered ----------
  function wantsHim(league, club, p) {
    const d = depth(club, p.natural), need = needDepth(club, p.natural);
    return d < need ? 1.25 : d >= need + 2 ? 0.9 : 1.05;
  }
  FM.respondOffer = function (league, offerId, action, counterFee) {
    const t = FM.transfer(league), o = t.offers.find((x) => x.id === offerId), me = FM.teamById(league, league.userId);
    if (!o || o.status === 'done') return { ok: false, text: 'That offer is no longer open.' };
    const p = FM.findPlayer(league, o.pid), buyer = FM.teamById(league, o.from);
    if (!p || FM.clubOf(league, p) !== me) { o.status = 'done'; return { ok: false, text: 'He is no longer at the club.' }; }
    if (action === 'reject') {
      t.offers = t.offers.filter((x) => x !== o);
      news(league, 'Transfer', p, `${me.name} turn down ${buyer.name} for ${p.name}`, `${money(o.fee)} was not enough.`, `${me.name} have rejected an offer of ${money(o.fee)} from ${buyer.name} for ${p.name}.`, { mine: true, teams: [me.id, buyer.id], scene: 'rejected' });
      return { ok: true, status: 'rejected' };
    }
    const sellOk = () => {
      if (me.squad.length <= MIN_SQUAD) return 'You need at least ' + MIN_SQUAD + ' players: sign someone before letting another go.';
      if (p.natural === 'GK' && depth(me, 'GK') <= 1) return 'He is your only goalkeeper.';
      return null;
    };
    const complete = (fee) => {
      const bad = sellOk(); if (bad) return { ok: false, text: bad };
      if (fee > (t.budget[buyer.id] || 0) + 1e-9) { t.offers = t.offers.filter((x) => x !== o); return { ok: false, text: buyer.name + ' can no longer afford that.' }; }
      move(league, p, buyer, fee, null, 3);
      news(league, 'Departure', p, `${p.name} leaves ${me.name} for ${buyer.name}`, `${money(fee)}: the deal is done.`, `${buyer.name} have signed ${p.name} from ${me.name} for ${money(fee)}. The ${FM.ageOf(p)}-year-old ${POS_NAME[p.natural]} has left the club.`, { mine: true, scene: 'departure', teams: [me.id, buyer.id] });
      return { ok: true, status: 'sold', fee };
    };
    if (action === 'accept') return complete(o.fee);
    // counter
    const asked = r1(Number(counterFee));
    if (!(asked > 0)) return { ok: false, text: 'Enter the fee you want.' };
    const maxPay = Math.min(t.budget[buyer.id] || 0, FM.valueOf(p) * wantsHim(league, buyer, p) * 1.2);
    o.rounds = (o.rounds || 0) + 1;
    if (asked <= maxPay) { o.fee = asked; return complete(asked); }
    if (asked <= maxPay * 1.15 && o.rounds <= 2) { o.fee = r1(Math.max(o.fee, (asked + maxPay) / 2)); o.status = 'countered'; return { ok: true, status: 'countered', fee: o.fee }; }
    t.offers = t.offers.filter((x) => x !== o);
    news(league, 'Transfer', p, `${buyer.name} walk away from ${p.name}`, `${me.name}'s price was too high.`, `${buyer.name} have withdrawn their interest in ${p.name} after ${me.name} asked for ${money(asked)}.`, { mine: true, teams: [me.id, buyer.id] });
    return { ok: true, status: 'withdrawn' };
  };

  // ---------- the other clubs ----------
  FM.transfersAfterRound = function (league, round) {
    const t = FM.transfer(league), me = FM.teamById(league, league.userId);
    const rng = FM.mulberry32(league.seed + (league.runSeed || 0) + round * 7919 + 13);
    // 1. talks that were open between other clubs end, one way or the other
    Object.keys(t.ai).forEach((pid) => {
      const d = t.ai[pid], p = FM.findPlayer(league, pid), buyer = FM.teamById(league, d.team), seller = p && FM.clubOf(league, p);
      if (!p || !seller || seller.id !== d.from || buyer.id === seller.id) { delete t.ai[pid]; return; }
      const price = r1(Math.max(d.fee, FM.askingPrice(league, p) * 0.97));
      const ok = (t.budget[buyer.id] || 0) >= price && FM.canSell(seller, p) && rng() > 0.2;
      if (ok) {
        move(league, p, buyer, price, null, 3);
        story(league, { kind: 'Signing', headline: `${buyer.name} sign ${p.name} from ${seller.name}`, dek: `${money(price)}: the deal is done.`, body: `${buyer.name} have completed the signing of ${p.name}, the ${FM.ageOf(p)}-year-old ${p.nation} ${POS_NAME[p.natural]}, from ${seller.name} for ${money(price)}.`, playerId: p.id, mine: false, teams: [buyer.id, seller.id], scene: 'signing' });
        // the manager had been interested too
        const dl = t.deals[pid];
        if (dl && dl.stage !== 'signed') { dl.stage = 'collapsed'; dl.history.push({ who: 'club', text: buyer.name + ' completed the signing first.' }); }
      } else {
        delete t.ai[pid];
        story(league, { kind: 'Transfer talks', headline: `${buyer.name}'s move for ${p.name} falls through`, dek: `${seller.name} keep their man.`, body: `Talks between ${buyer.name} and ${seller.name} over ${p.name} have ended without a deal.`, playerId: p.id, mine: false, teams: [buyer.id, seller.id] });
      }
    });
    // 2. the manager's own deals do not wait for ever
    Object.keys(t.deals).forEach((pid) => {
      const d = t.deals[pid], p = FM.findPlayer(league, pid);
      if (!p || d.stage === 'signed' || d.stage === 'collapsed') return;
      if ((d.stage === 'fee_agreed' || d.stage === 'wage_talks') && d.agreedRound != null && userRounds(league) - d.agreedRound >= 3) {
        d.stage = 'collapsed'; d.history.push({ who: 'club', text: 'The deal was left too long and has fallen through.' });
        const seller = FM.clubOf(league, p);
        story(league, { kind: 'Transfer collapse', headline: `${p.name} deal with ${me.name} runs out of time`, dek: `The talks went cold.`, body: `${me.name}'s agreed move for ${p.name} has fallen through after ${seller.name} withdrew permission to talk.`, playerId: p.id, mine: true, teams: [me.id] });
      }
    });
    // 3. offers for the manager's players only stay open for a couple of rounds
    t.offers.forEach((o) => { o.age = (o.age || 0) + 1; });
    t.offers = t.offers.filter((o) => (o.age || 0) <= 2);
    // 3b. clubs keep coming for the manager's players all season, not only before the first game: most rounds bring a chance of a bid, from a
    // club and for a player drawn afresh each time
    if (round >= 1 && t.offers.length < 3 && rng() < (t.offers.length ? 0.4 : 0.65)) {
      const clubs = league.teams.filter((x) => x.id !== league.userId).sort(() => rng() - 0.5), taken = new Set(t.offers.map((o) => o.pid));
      for (const team of clubs) {
        const budget = t.budget[team.id] || 0; if (budget < 1) continue;
        const o = pickTarget(league, team, me, taken, rng, budget * 0.95); if (!o) continue;
        const fee = r1(Math.max(0.2, o.price * (0.85 + rng() * 0.3)));
        t.offers.push({ id: 'o' + (t.seq++), pid: o.p.id, from: team.id, fee, age: 0, status: 'open' });
        offerStory(league, team, o.p, fee, false);
        break;
      }
    }
    // 4. new moves
    league.teams.forEach((team) => {
      if (team.id === league.userId) return;
      if (rng() > (round <= 1 ? 0.9 : 0.5)) return;
      const needs = FM.clubNeeds(team);
      const budget = t.budget[team.id] || 0;
      if (budget < 1) return;
      let best = null, bestScore = 0;
      league.teams.forEach((other) => {
        if (other === team) return;
        other.squad.forEach((p) => {
          if (t.ai[p.id]) return;
          if (other.id === league.userId && t.offers.some((o) => o.pid === p.id)) return;
          if (!FM.canSell(other, p)) return;
          const price = FM.askingPrice(league, p);
          if (price > budget * 0.8) return;
          const mates = team.squad.filter((q) => q.natural === p.natural);
          const top = mates.length ? Math.max(...mates.map((q) => FM.playerRating(q))) : 0;
          const needBonus = needs.indexOf(p.natural) >= 0 ? 0.6 : 0;
          const gain = FM.playerRating(p) - top + needBonus;
          if (gain <= 0.05) return;
          // computer clubs look hardest at the manager's players, and most of all early in the season
          const lean = other.id === league.userId ? (round <= 1 ? 2.4 : 1.7) : 1;
          const score = gain * lean * (0.8 + rng() * 0.6) / Math.sqrt(price + 1);
          if (score > bestScore) { bestScore = score; best = { p, other, price }; }
        });
      });
      if (!best) return;
      if (best.other.id === league.userId) {
        if (t.offers.length >= 3) return;
        const fee = r1(Math.max(0.2, best.price * (0.85 + rng() * 0.3)));
        const o = { id: 'o' + (t.seq++), pid: best.p.id, from: team.id, fee, age: 0, status: 'open' };
        t.offers.push(o);
        offerStory(league, team, best.p, fee, false);
      } else {
        t.ai[best.p.id] = { team: team.id, from: best.other.id, fee: best.price, round };
        story(league, { kind: 'Transfer talks', headline: `${team.name} open talks for ${best.p.name}`, dek: `${best.other.name} are said to want around ${money(best.price)}.`, body: `${team.name} have opened talks with ${best.other.name} over the signing of ${best.p.name}, the ${FM.ageOf(best.p)}-year-old ${POS_NAME[best.p.natural]}. A fee in the region of ${money(best.price)} is being discussed.`, playerId: best.p.id, mine: false, teams: [team.id, best.other.id], scene: 'approach' });
      }
    });
  };

  // ---------- pictures: made once, kept in the browser ----------
  const mem = new Map(), inflight = new Map();
  let dbPromise = null;
  function db() {
    if (!window.indexedDB) return Promise.resolve(null);
    if (!dbPromise) dbPromise = new Promise((resolve) => {
      const req = indexedDB.open('lastmind-football-scenes', 1);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('images')) req.result.createObjectStore('images'); };
      req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(null);
    });
    return dbPromise;
  }
  const idbGet = (d, key) => new Promise((resolve) => { try { const r = d.transaction('images').objectStore('images').get(key); r.onsuccess = () => resolve(r.result || null); r.onerror = () => resolve(null); } catch (e) { resolve(null); } });
  const idbPut = (d, key, val) => new Promise((resolve) => { try { const tx = d.transaction('images', 'readwrite'); tx.objectStore('images').put(val, key); tx.oncomplete = () => resolve(true); tx.onerror = () => resolve(false); } catch (e) { resolve(false); } });
  // The picture already made for this key, if there is one (no request is made).
  FM.cachedPicture = async function (key) {
    if (mem.has(key)) return mem.get(key);
    const d = await db(); const v = d ? await idbGet(d, key) : null;
    if (v) mem.set(key, v);
    return v;
  };
  // Pictures are no longer made for recruitment: this only returns one that was kept earlier (no request is ever sent).
  FM.picture = async function (key) {
    return FM.cachedPicture(key);
  };
  FM.playerPictureKey = (p) => 'p:' + p.id;
  FM.playerPictureRequest = (p) => ({ kind: 'player', look: FM.lookOf(p), age: FM.ageOf(p), position: p.natural });
  FM.scenePictureKey = (p, deal, scene) => 's:' + (deal ? deal.id : p.id) + ':' + scene;
  FM.scenePictureRequest = (p, scene) => ({ kind: 'scene', scene, look: FM.lookOf(p), age: FM.ageOf(p), position: p.natural });
})();
