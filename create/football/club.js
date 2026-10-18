// The club as a business. Ashford Rovers is a public limited company: the shareholders (the board) set aims and objectives for the season, have a
// view on how the club is run on the pitch and in the accounts, and can lose confidence in the manager. The manager sets ticket prices for a
// market that answers like a real one, spends on the stadium, borrows or sells shares, negotiates with sponsors, pays dividends, and the whole
// thing is kept in the books the way a company keeps it. Nothing here explains the ideas: it behaves the way the real thing does, and the
// numbers are in the books to be read. The crowd is only ever seen after the match.
(function () {
  const FM = (window.FM = window.FM || {});
  const ROUNDS = 14;              // a season is fourteen matchdays, a week each
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const r2 = (v) => Math.round(v * 100) / 100;
  const ord = (n) => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) || n % 10 > 3 ? 0 : n % 10]);

  // ---------- the four stands: who sits where, how many seats, and how that kind of fan answers a price ----------
  // base is the crowd that would come at the usual price on an ordinary Saturday; e is how sharply it shrinks as the price rises.
  FM.SEGMENTS = [
    { id: 'family', name: 'Family stand', who: 'Parents and children', seats: 2600, ref: 18, base: 2500, e: 1.15 },
    { id: 'general', name: 'General admission', who: 'The regular supporters', seats: 6000, ref: 28, base: 6300, e: 0.85 },
    { id: 'safe', name: 'Safe standing', who: 'Students and under-25s', seats: 2400, ref: 12, base: 2100, e: 1.8 },
    { id: 'premium', name: 'Premium and hospitality', who: 'Companies and their guests', seats: 500, ref: 95, base: 430, e: 0.45 },
  ];
  // What can be built. A stand grows by a block of seats; the other purchases are one-off.
  FM.EXPANSIONS = { family: { seats: 400, perSeat: 1250, max: 2000 }, general: { seats: 800, perSeat: 1050, max: 4000 }, safe: { seats: 600, perSeat: 650, max: 3000 }, premium: { seats: 100, perSeat: 6500, max: 500 } };
  FM.FACILITIES = [
    { id: 'lights', name: 'Floodlights and pitch', cost: 650000, upkeep: 4000, text: 'New floodlights and a re-laid pitch.' },
    { id: 'shop', name: 'Bigger club shop', cost: 400000, upkeep: 3000, text: 'A larger shop beside the main entrance.' },
    { id: 'fanzone', name: 'Fan zone and bars', cost: 550000, upkeep: 4000, text: 'A covered fan zone with bars and food stalls.' },
    { id: 'screens', name: 'Big screens and digital boards', cost: 300000, upkeep: 2000, text: 'Two big screens and digital advertising boards.' },
    { id: 'training', name: 'Training ground', cost: 900000, upkeep: 6000, text: 'New pitches and a sports science suite at the training ground.' },
  ];
  const BUILD_TIME = 4;           // matchdays to build a stand
  const COMPANIES = [
    ['Halden Mutual', 'insurance'], ['Pennine Pasties', 'food'], ['Brightwater Energy', 'energy'], ['Kestrel Telecom', 'telecoms'], ['Vantage Motors', 'cars'],
    ['Thornbury Building Society', 'banking'], ['Marlow & Finch Solicitors', 'law'], ['Ironbridge Steel Supplies', 'steel'], ['Loxley Logistics', 'haulage'], ['Fernhill Dairy', 'dairy'],
    ['Quill Print & Design', 'printing'], ['Sable Coffee Roasters', 'coffee'], ['Northgate Tyres', 'tyres'], ['Orchard Estate Agents', 'property'], ['Pulse Fitness Clubs', 'gyms'],
    ['Cobalt Cloud Services', 'software'], ['Greywell Brewery', 'brewing'], ['Ashmoor Plumbing', 'plumbing'],
  ];
  const BOARDS = 8;
  const AWAY_SHARE = 0.2;   // the visiting club's share of the gate at the other ground
  const LOAN_OPTIONS = [{ term: 14, rate: 0.06 }, { term: 28, rate: 0.075 }, { term: 42, rate: 0.09 }];   // terms in matchdays; rates are per season
  const OVERDRAFT = { limit: 500000, rate: 0.14, penalty: 0.3 };
  const TAX = 0.25;
  const PROFIT_TARGET = 400000;
  const STADIUM_DEP = 0.025;       // of the stadium's cost, a season
  const OPENING_STADIUM = 12000000;
  const MERCH_COST = 0.55, SPEND_PER_HEAD = 5.5, RUN_PER_HEAD = 2.4, RUN_FIXED = 14000, ADMIN = 100000, BROADCAST = { 1: 64000, 2: 38000 };
  const EXPECTED_DIVIDEND = 0.2;   // the share of profit the shareholders hope to see paid out
  // Prize money, paid at the end of the season by where the club finished: first place down to eighth, in the top division and the second.
  // Scaled to what good players cost: a star is £20m or more, so a title is worth about one top player, and finishing last still pays a squad player's fee.
  const PRIZE = { 1: [8000000, 6000000, 4600000, 3600000, 2800000, 2100000, 1600000, 1200000], 2: [3200000, 2400000, 1900000, 1500000, 1150000, 850000, 650000, 500000] };

  // ---------- formatting ----------
  const gbp = (n) => { const v = Math.round(n); return v < 0 ? '(£' + Math.abs(v).toLocaleString('en-GB') + ')' : '£' + v.toLocaleString('en-GB'); };
  const num = (n) => Math.round(n).toLocaleString('en-GB');
  FM.gbp = gbp;

  // ---------- the company's state ----------
  function init(lg) {
    const me = lg.userId, t = FM.transfer ? FM.transfer(lg) : null;
    const opening = t && Number.isFinite(t.budget[me]) && lg.fixtures.some((f) => f.played) ? Math.max(2000000, Math.round(t.budget[me] * 1e6)) : 8000000;
    const segs = {}, seats = {}; FM.SEGMENTS.forEach((s) => { segs[s.id] = { price: s.ref }; seats[s.id] = s.seats; });
    return {
      v: 1, cash: opening, lastClose: opening, season: lg.season, prices: segs, seats, marketing: 0,
      sponsors: [{ id: 'sp1', kind: 'Shirt sponsor', company: 'Halden Mutual', perRound: 34000, left: 28 }],
      boards: [{ id: 'ad1', company: 'Fernhill Dairy', perRound: 3200, left: 14 }, { id: 'ad2', company: 'Northgate Tyres', perRound: 2800, left: 14 }, { id: 'ad3', company: 'Quill Print & Design', perRound: 2400, left: 14 }],
      offers: [], loans: [], shares: { issued: 1000000, price: 10 }, ledger: [], signings: [], seasons: [], pending: { fees: 0, sales: 0, loans: 0, shares: 0, saleProfit: 0, capex: 0 },
      approvalFin: 55, lastShare: 10, seq: 1,
      facilities: [], projects: [], assets: { cost: OPENING_STADIUM, dep: 0 },
      equity: { capital: 1000000, premium: 0, reserves: OPENING_STADIUM + opening - 1000000 }, dividendsPaid: 0, dividend: { policy: 0.25 },
      conf: { low: 0, vote: null, dismissed: false }, flags: {},
    };
  }
  // A game saved before a part of the business existed gets that part now, set so that the books still balance.
  function ensure(b) {
    if (!b.seats) { b.seats = {}; FM.SEGMENTS.forEach((s) => { b.seats[s.id] = s.seats; }); }
    if (!b.facilities) b.facilities = [];
    if (!b.projects) b.projects = [];
    if (!b.assets) b.assets = { cost: OPENING_STADIUM, dep: 0 };
    if (!b.dividend) b.dividend = { policy: 0.25 };
    if (b.dividendsPaid == null) b.dividendsPaid = 0;
    if (!b.conf) b.conf = { low: 0, vote: null, dismissed: false };
    if (!b.flags) b.flags = {};
    if (!b.pending.capex) b.pending.capex = 0;
    if (!b.equity) {
      const debt = b.loans.reduce((a, l) => a + l.balance, 0), players = b.signings.reduce((a, s) => a + (s.sold ? 0 : s.book), 0);
      const net = b.ledger.reduce((a, e) => a + e.pl.net, 0);
      const assets = (b.assets.cost - b.assets.dep) + players + Math.max(0, b.cash), liab = debt + Math.max(0, -b.cash);
      b.equity = { capital: b.shares.issued, premium: 0, reserves: assets - liab - b.shares.issued - net - (b.pending.saleProfit || 0) };
    }
    return b;
  }
  FM.biz = function (lg) {
    if (!lg.biz || lg.biz.v !== 1) { lg.biz = init(lg); ensure(lg.biz); try { offersAfterRound(lg, lg.biz, { round: -1 }); } catch (e) { /* the offers come with the first matchday instead */ } }
    return ensure(lg.biz);
  };
  FM.bizCapacity = (lg) => { const b = FM.biz(lg); return FM.SEGMENTS.reduce((a, s) => a + (b.seats[s.id] || s.seats), 0); };
  const hasFacility = (b, id) => b.facilities.indexOf(id) >= 0;
  const effects = (b) => ({
    appeal: hasFacility(b, 'lights') ? 1.025 : 1, merch: hasFacility(b, 'shop') ? 1.35 : 1, spend: hasFacility(b, 'fanzone') ? 1.6 : 0, ads: hasFacility(b, 'screens') ? 1.25 : 1,
    upkeep: FM.FACILITIES.filter((f) => hasFacility(b, f.id)).reduce((a, f) => a + f.upkeep, 0) + FM.SEGMENTS.reduce((a, s) => a + Math.max(0, (b.seats[s.id] || s.seats) - s.seats) * 8, 0),
  });
  FM.bizDevBoost = (lg) => (lg.biz && hasFacility(FM.biz(lg), 'training') ? 1.12 : 1);

  // ---------- the market for tickets ----------
  const userPos = (lg) => { try { return FM.tableRows(lg).findIndex((r) => r.id === lg.userId) + 1; } catch (e) { return 4; } };
  const formPoints = (lg) => {
    const me = lg.userId, played = lg.fixtures.filter((f) => f.played && (f.homeId === me || f.awayId === me)).sort((a, b) => b.round - a.round).slice(0, 5);
    if (!played.length) return 7.5 * 0.6;
    const pts = played.reduce((a, f) => { const mine = f.homeId === me ? f.hg : f.ag, theirs = f.homeId === me ? f.ag : f.hg; return a + (mine > theirs ? 3 : mine === theirs ? 1 : 0); }, 0);
    return pts * 5 / played.length;
  };
  // What makes this match more or less attractive, apart from the price.
  function appeal(lg, fx) {
    const b = FM.biz(lg), me = lg.userId, eff = effects(b);
    const opp = fx ? FM.teamById(lg, fx.homeId === me ? fx.awayId : fx.homeId) : null;
    const form = 0.9 + 0.017 * formPoints(lg);
    const oppF = opp ? 0.9 + 0.09 * clamp((opp.strength || 0) + 0.5, 0, 1.5) : 1;
    const derby = fx && FM.derbyForFixture && FM.derbyForFixture(lg, fx) ? 1.28 : 1;
    const pos = 1.06 - 0.018 * (userPos(lg) - 1);
    const promo = 1 + 0.1 * Math.log(1 + (b.marketing || 0) / 5000);
    return form * oppF * derby * pos * promo * eff.appeal;
  }
  // The crowd for one match at the prices set: per stand, how many wanted to come, how many got in, how many were turned away. This is worked out
  // when the match is played and never shown before it.
  FM.bizDemand = function (lg, fx) {
    const b = FM.biz(lg), capacity = FM.bizCapacity(lg);
    const noise = 0.96 + 0.08 * FM.mulberry32(lg.seed + (lg.runSeed || 0) + (fx ? fx.round : 0) * 977 + lg.season * 31)();
    const mult = appeal(lg, fx) * noise;
    const rows = {}, wanted = {}, seatsOf = (s) => b.seats[s.id] || s.seats, priceOf = (s) => clamp((b.prices[s.id] || { price: s.ref }).price, 3, 400);
    FM.SEGMENTS.forEach((s) => {
      const price = priceOf(s);
      // demand falls with price, and falls away altogether when a price is far beyond what that kind of fan would ever pay
      wanted[s.id] = s.base * Math.pow(price / s.ref, -s.e) * mult / (1 + Math.pow(price / (s.ref * 2.4), 4));
    });
    // fans who cannot get into a full stand look at the general stand instead, if there is room
    let spill = 0;
    FM.SEGMENTS.forEach((s) => { if (s.id !== 'general' && wanted[s.id] > seatsOf(s)) spill += 0.25 * (wanted[s.id] - seatsOf(s)); });
    FM.SEGMENTS.forEach((s) => {
      const want = wanted[s.id] + (s.id === 'general' ? spill : 0), sold = Math.min(seatsOf(s), Math.round(want)), price = priceOf(s);
      rows[s.id] = { price, seats: seatsOf(s), wanted: Math.round(want), sold, away: Math.max(0, Math.round(want) - seatsOf(s)), revenue: sold * price };
    });
    const total = FM.SEGMENTS.reduce((a, s) => a + rows[s.id].sold, 0), tickets = FM.SEGMENTS.reduce((a, s) => a + rows[s.id].revenue, 0);
    return { rows, total, tickets, capacity, turnedAway: FM.SEGMENTS.reduce((a, s) => a + rows[s.id].away, 0) };
  };

  // ---------- one matchday's money ----------
  const wageBill = (lg) => FM.teamById(lg, lg.userId).squad.reduce((a, p) => a + FM.wageOf(p), 0) * 1000;   // £ a week
  const loanBalance = (b) => b.loans.reduce((a, l) => a + l.balance, 0);
  const signingDep = (b) => b.signings.reduce((a, s) => a + (!s.sold && s.book > 0 ? Math.min(s.book, s.fee / (s.years * ROUNDS)) : 0), 0);
  const stadiumDep = (b) => Math.max(0, Math.min(b.assets.cost - b.assets.dep, b.assets.cost * STADIUM_DEP / ROUNDS));
  const depPerRound = (b) => signingDep(b) + stadiumDep(b);
  const sum = (o) => Object.keys(o).reduce((a, k) => a + (o[k] || 0), 0);
  const prizeFor = (lg) => { const table = PRIZE[lg.divisionLevel || 1] || PRIZE[1]; return table[clamp(userPos(lg) - 1, 0, table.length - 1)]; };
  FM.bizPrize = (lg) => ({ position: userPos(lg), amount: prizeFor(lg), table: PRIZE[lg.divisionLevel || 1] || PRIZE[1] });

  // The lines for one round: home or away. The real draw when the match has been played; a forecast reads the crowds that have actually come
  // (the club cannot see a crowd before the match), and before any home match has been played there is nothing to read.
  function lines(lg, fx, home, est) {
    const b = FM.biz(lg), eff = effects(b);
    let d = null, att = 0, tickets = 0, spend = 0;
    if (home && !est) { d = FM.bizDemand(lg, fx); att = d.total; tickets = d.tickets; spend = att * (SPEND_PER_HEAD + eff.spend); }
    else if (home) {
      const past = b.ledger.filter((e) => e.home).slice(-4);
      if (past.length) { att = past.reduce((a, e) => a + e.attTotal, 0) / past.length; tickets = past.reduce((a, e) => a + e.inflow.tickets, 0) / past.length; spend = past.reduce((a, e) => a + e.inflow.matchday, 0) / past.length; }
    }
    // Away from home the club takes a share of the gate at the other ground: their crowd (a bigger one for a bigger club) at roughly the prices this
    // club charges itself, and the visitors keep AWAY_SHARE of it.
    if (!home && fx) {
      const opp = FM.teamById(lg, fx.homeId === lg.userId ? fx.awayId : fx.homeId), str = clamp(((opp && opp.strength) || 0) + 0.5, 0, 1.5);
      const noise = est ? 1 : 0.94 + 0.12 * FM.mulberry32(lg.seed + (lg.runSeed || 0) + fx.round * 4999 + lg.season * 37 + 5)();
      const crowd = (5200 + 3600 * str) * noise, seats = FM.SEGMENTS.reduce((a, s) => a + (b.seats[s.id] || s.seats), 0);
      const avgPrice = FM.SEGMENTS.reduce((a, s) => a + (b.seats[s.id] || s.seats) * clamp((b.prices[s.id] || { price: s.ref }).price, 3, 400), 0) / Math.max(1, seats);
      tickets = Math.round(crowd * avgPrice * AWAY_SHARE / 100) * 100;
    }
    const pos = userPos(lg), lastAtt = (b.ledger.filter((e) => e.home).slice(-1)[0] || {}).attTotal || 7000;
    const merch = (7000 + 0.9 * (att || lastAtt) + 1400 * Math.max(0, 8 - pos)) * eff.merch;
    const inflow = {
      tickets, matchday: spend,
      broadcast: BROADCAST[lg.divisionLevel || 1] * (1 + 0.025 * Math.max(0, 8 - pos)),
      sponsor: b.sponsors.filter((s) => s.left > 0).reduce((a, s) => a + s.perRound, 0),
      advert: b.boards.filter((s) => s.left > 0).reduce((a, s) => a + s.perRound, 0) * eff.ads,
      merch,
    };
    const od = b.cash < 0 ? -b.cash : 0, odRate = od > OVERDRAFT.limit ? OVERDRAFT.penalty : OVERDRAFT.rate;
    const interestLoans = b.loans.reduce((a, l) => a + l.balance * l.rate / ROUNDS, 0), interestOd = od * odRate / ROUNDS;
    const outflow = {
      wages: wageBill(lg), matchday: home ? RUN_FIXED + RUN_PER_HEAD * att : 0, marketing: b.marketing || 0, admin: ADMIN + eff.upkeep, merchCost: merch * MERCH_COST,
      loanPay: b.loans.reduce((a, l) => a + Math.min(l.balance, l.perRound), 0), interest: interestLoans + interestOd,
    };
    return { att, d, inflow, outflow };
  }

  // Called once the user's match of a round has been played (and the rest of the round is done).
  FM.bizAfterRound = function (lg, fx) {
    if (!fx || (lg.mp && lg.mp.kind === 'match')) return;
    const b = FM.biz(lg), me = lg.userId, home = fx.homeId === me, opp = FM.teamById(lg, home ? fx.awayId : fx.homeId);
    if (b.conf.dismissed) return;
    const l = lines(lg, fx, home, false), p = b.pending;
    l.inflow.prize = fx.round === ROUNDS - 1 ? prizeFor(lg) : 0;   // the club's league position at the end of the season pays it
    const opening = b.lastClose;
    const dep = signingDep(b) + stadiumDep(b), depStad = stadiumDep(b);
    // the books for the round
    const inflow = Object.assign({}, l.inflow, { sales: p.sales, loans: p.loans, shares: p.shares });
    const outflow = Object.assign({}, l.outflow, { fees: p.fees, capex: p.capex, tax: 0, dividends: 0 });
    const seasonRows = b.ledger.filter((e) => e.season === lg.season);
    const revenue = l.inflow.tickets + l.inflow.matchday + l.inflow.broadcast + l.inflow.sponsor + l.inflow.advert + l.inflow.merch + l.inflow.prize;
    const cos = l.outflow.matchday + l.outflow.merchCost;
    const gross = revenue - cos;
    const expenses = l.outflow.wages + l.outflow.marketing + l.outflow.admin + dep;
    const op = gross - expenses + p.saleProfit;
    const pbt = op - l.outflow.interest;
    let tax = 0, dividend = 0;
    const last = fx.round === ROUNDS - 1;
    if (last) {
      const toDate = seasonRows.reduce((a, e) => a + e.pl.pbt, 0) + pbt;
      tax = Math.max(0, toDate) * TAX; outflow.tax = tax;
    }
    const net = pbt - tax;
    if (last) {
      // the dividend is a share of the year's profit after tax, paid if the club has the cash
      const yearNet = seasonRows.reduce((a, e) => a + e.pl.net, 0) + net;
      dividend = Math.max(0, Math.round(yearNet * (b.dividend.policy || 0)));
      dividend = Math.max(0, Math.min(dividend, Math.round(b.cash + sum(l.inflow) - sum(l.outflow) - tax)));
      outflow.dividends = dividend;
    }
    // the cash moves: it already holds what moved between matchdays (signings, loans, shares, building); add this matchday's trading
    b.cash = Math.round(b.cash + sum(l.inflow) - sum(l.outflow) - tax - dividend);
    b.dividendsPaid += dividend;
    b.assets.dep += depStad;
    b.loans.forEach((ln) => { const pay = Math.min(ln.balance, ln.perRound); ln.balance = Math.round(ln.balance - pay); });
    b.loans = b.loans.filter((ln) => ln.balance > 0);
    b.sponsors.forEach((s) => { s.left -= 1; }); b.boards.forEach((s) => { s.left -= 1; });
    b.sponsors = b.sponsors.filter((s) => s.left > 0); b.boards = b.boards.filter((s) => s.left > 0);
    const entry = {
      season: lg.season, round: fx.round + 1, home, opp: opp ? opp.name : '', attTotal: l.att, att: l.d ? Object.keys(l.d.rows).reduce((o, k) => { o[k] = l.d.rows[k].sold; return o; }, {}) : null, away: l.d ? l.d.turnedAway : 0,
      prices: l.d ? Object.keys(l.d.rows).reduce((o, k) => { o[k] = l.d.rows[k].price; return o; }, {}) : null, capacity: l.d ? l.d.capacity : 0,
      inflow, outflow, opening, closing: b.cash, dep,
      pl: { revenue, cos, gross, expenses, saleProfit: p.saleProfit, op, interest: l.outflow.interest, pbt, tax, net },
    };
    b.ledger.push(entry);
    b.lastClose = b.cash;
    b.pending = { fees: 0, sales: 0, loans: 0, shares: 0, saleProfit: 0, capex: 0 };
    // the signings lose their book value as the years go by
    b.signings.forEach((s) => { if (!s.sold && s.book > 0) s.book = Math.max(0, Math.round(s.book - s.fee / (s.years * ROUNDS))); });
    // building work moves on
    b.projects.forEach((pr) => { pr.left -= 1; });
    b.projects.filter((pr) => pr.left <= 0).forEach((pr) => {
      if (pr.kind !== 'stand') return;
      const seg = FM.SEGMENTS.find((s) => s.id === pr.stand);
      b.seats[pr.stand] = (b.seats[pr.stand] || 0) + pr.seats;
      stadiumNews(lg, `New ${seg.name.toLowerCase()} seats open`, `The new block of ${num(pr.seats)} seats in the ${seg.name.toLowerCase()} is finished and ready for the next home match.`, fx.round);
    });
    b.projects = b.projects.filter((pr) => pr.left > 0);
    if (last) b.seasons.push({ season: lg.season, pos: userPos(lg), revenue: seasonSum(b, lg.season, 'revenue'), net: seasonSum(b, lg.season, 'net'), close: b.cash, dividend });
    updateApproval(lg, b, dividend, last);
    offersAfterRound(lg, b, fx);
    FM.bizSyncBudget(lg);
    financeNews(lg, b, entry, dividend);
    confidenceCheck(lg, b, fx);
    if (FM.bizOnChange) FM.bizOnChange(lg);
  };
  function seasonSum(b, season, key) { return b.ledger.filter((e) => e.season === season).reduce((a, e) => a + e.pl[key], 0); }
  FM.bizSeasonSum = (lg, key) => seasonSum(FM.biz(lg), lg.season, key);
  function stadiumNews(lg, headline, body, round) { FM.pushNews(lg, { round, day: lg.day, kind: 'Stadium', headline, body, club: lg.userId, mine: true }); }

  // ---------- aims and objectives: what the shareholders set for the season ----------
  // Each objective belongs to a longer aim. Nothing explains them; each shows its target, where the club stands and whether it is on course.
  FM.bizObjectives = function (lg) {
    const b = FM.biz(lg), rows = b.ledger.filter((e) => e.season === lg.season), played = rows.length, final = played >= ROUNDS;
    const t = (k) => rows.reduce((a, e) => a + e.pl[k], 0), revenue = t('revenue'), net = t('net');
    const wages = rows.reduce((a, e) => a + e.outflow.wages, 0), home = rows.filter((e) => e.home);
    const cap = FM.bizCapacity(lg), avgCrowd = home.length ? home.reduce((a, e) => a + e.attTotal, 0) / home.length : 0, crowdPct = cap ? avgCrowd / cap : 0;
    const minClose = rows.length ? Math.min.apply(null, rows.map((e) => e.closing)) : b.cash;
    const annual = played ? revenue * ROUNDS / played : 1, debtRatio = loanBalance(b) / Math.max(1, annual);
    const fam = home.length ? home.reduce((a, e) => a + (e.att.family / Math.max(1, b.seats.family) + e.att.safe / Math.max(1, b.seats.safe)) / 2, 0) / home.length : 0;
    const board = lg.board || {}, pos = userPos(lg), exp = board.expectedPosition || 4;
    const want = PROFIT_TARGET * played / ROUNDS;
    const state = (ok, started) => (!started ? 'not started' : final ? (ok ? 'met' : 'missed') : (ok ? 'on track' : 'behind'));
    return [
      { id: 'survive', aim: 'Survival', title: 'Never run out of cash', target: 'Bank balance above £0 at every matchday', value: played ? 'Lowest so far ' + gbp(minClose) : '–', state: played ? (minClose >= 0 ? (final ? 'met' : 'on track') : 'failed') : 'not started', weight: 'finance' },
      { id: 'profit', aim: 'Profit', title: 'Make a profit for the year of at least ' + gbp(PROFIT_TARGET), target: gbp(PROFIT_TARGET), value: played ? gbp(net) + ' so far' : '–', state: state(net >= (final ? PROFIT_TARGET : want * 0.9), played > 0), weight: 'finance' },
      { id: 'sales', aim: 'Growth', title: 'Fill the ground: an average home crowd of at least 85% of capacity', target: '85% of ' + num(cap), value: home.length ? Math.round(crowdPct * 100) + '% (' + num(avgCrowd) + ')' : '–', state: state(crowdPct >= 0.85, home.length > 0), weight: 'finance' },
      { id: 'costs', aim: 'Cost control', title: 'Keep wages below 45% of revenue', target: '45% of revenue', value: revenue ? Math.round(1000 * wages / revenue) / 10 + '%' : '–', state: state(revenue > 0 && wages / revenue <= 0.45, played > 0), weight: 'finance' },
      { id: 'debt', aim: 'Stability', title: "Keep borrowing below 40% of a season's revenue", target: '40% of revenue', value: played ? Math.round(1000 * debtRatio) / 10 + '%' : '–', state: state(debtRatio <= 0.4, played > 0), weight: 'finance' },
      { id: 'access', aim: 'Supporters', title: 'Keep the Family stand and Safe standing at least 75% full, so families and students can get in', target: '75% full', value: home.length ? Math.round(fam * 100) + '%' : '–', state: state(fam >= 0.75, home.length > 0), weight: 'finance' },
      { id: 'league', aim: 'Success on the pitch', title: 'Finish ' + ord(exp) + ' or better in the ' + lg.divisionName, target: ord(exp) + ' or better', value: played ? ord(pos) + ' now' : '–', state: state(pos <= exp, played > 0), weight: 'football' },
    ];
  };

  // ---------- what the shareholders think ----------
  function updateApproval(lg, b, dividend, last) {
    const rows = b.ledger.filter((e) => e.season === lg.season), played = rows.length;
    const profit = rows.reduce((a, e) => a + e.pl.net + e.pl.tax, 0);   // before tax: what they look at during the season
    const expected = PROFIT_TARGET * played / ROUNDS, score = Math.tanh((profit - expected) / (PROFIT_TARGET + 250000)) * 18;
    const cash = b.cash < 0 ? (b.cash < -OVERDRAFT.limit ? -26 : -14) : b.cash < 500000 ? -5 : b.cash > 2500000 ? 4 : 0;
    const annual = Math.max(1, rows.reduce((a, e) => a + e.pl.revenue, 0) * ROUNDS / Math.max(1, played));
    const debt = loanBalance(b) / annual, debtPen = debt > 0.8 ? -10 : debt > 0.4 ? -4 : 0;
    // the objectives: each one on course lifts their view a little, each one behind lowers it (more as the season goes on)
    const objs = FM.bizObjectives(lg).filter((o) => o.weight === 'finance' && o.id !== 'profit' && o.id !== 'survive');
    const weight = clamp(played / 5, 0.3, 1);
    const objScore = objs.reduce((a, o) => a + (o.state === 'met' || o.state === 'on track' ? 2 : o.state === 'behind' || o.state === 'missed' ? -3 : 0), 0) * weight;
    let div = 0;
    if (last) div = dividend > 0 && (b.dividend.policy >= EXPECTED_DIVIDEND) ? 5 : profit > 150000 && b.dividend.policy < 0.05 ? -7 : 0;
    const target = clamp(55 + score + cash + debtPen + objScore + div, 5, 95);
    b.approvalFin = clamp(Math.round((b.approvalFin + (target - b.approvalFin) * 0.3) * 10) / 10, 0, 100);
    const foot = Number.isFinite(lg.boardApproval) ? lg.boardApproval : 50;
    b.lastShare = b.shares.price;
    b.shares.price = r2(clamp(6 + 8 * (0.55 * b.approvalFin + 0.45 * foot) / 100, 3, 16));
  }
  FM.bizApprovals = (lg) => { const b = FM.biz(lg); return { financial: b.approvalFin, football: Number.isFinite(lg.boardApproval) ? lg.boardApproval : 50, share: b.shares.price, prevShare: b.lastShare }; };

  // ---------- a vote of no confidence ----------
  // When the shareholders have little faith in the club for three matchdays running, they call a vote. The result depends on how much support
  // the manager still has.
  function confidenceCheck(lg, b, fx) {
    const ap = FM.bizApprovals(lg), overall = (ap.financial + ap.football) / 2, c = b.conf;
    if (c.dismissed) return;
    const low = overall < 30 || ap.financial < 18;
    c.low = low ? c.low + 1 : 0;
    const push = (headline, body) => FM.pushNews(lg, { round: fx.round, day: lg.day, kind: 'Board', headline, body, club: lg.userId, mine: true });
    if (c.low === 1) push('Shareholders voice concern', 'The shareholders have written to the manager about the state of the club. Another bad run and they will call a vote.');
    if (c.low === 2) push('Shareholders threaten a vote of no confidence', 'The board has told the press it is considering a vote of no confidence in the manager if things do not improve at once.');
    if (c.low >= 3) {
      const rng = FM.mulberry32(lg.seed + (lg.runSeed || 0) + lg.season * 4421 + fx.round * 61);
      const support = clamp(Math.round(overall + (rng() - 0.5) * 14 + 6), 0, 100);
      const survived = support >= 40;
      c.vote = { round: fx.round + 1, season: lg.season, support, against: 100 - support, survived, seen: false };
      c.low = 0;
      if (survived) {
        b.approvalFin = Math.max(b.approvalFin, 38); lg.boardApproval = Math.max(Number.isFinite(lg.boardApproval) ? lg.boardApproval : 50, 38);
        push('The manager survives a vote of no confidence', `The shareholders voted ${support}% in support and ${100 - support}% against. The manager stays, on notice.`);
      } else {
        c.dismissed = true;
        push('The manager is sacked after a vote of no confidence', `The shareholders voted ${support}% in support and ${100 - support}% against. The board has dismissed the manager.`);
      }
    }
  }

  // ---------- the money behind the squad ----------
  // The transfer budget the recruitment pages use is the cash the club has: a signing is paid for out of it.
  FM.bizSyncBudget = function (lg) {
    if (lg.mp && lg.mp.kind === 'match') return;
    const t = FM.transfer ? FM.transfer(lg) : null; if (!t) return;
    const b = FM.biz(lg);
    t.budget[lg.userId] = Math.round(Math.max(0, b.cash) / 1e5) / 10;   // £m, to one decimal
  };
  // Called by the transfer code when a player moves between clubs.
  FM.bizTransfer = function (lg, p, from, to, fee, wage, years) {
    if (lg.mp && lg.mp.kind === 'match') return;
    const b = FM.biz(lg), me = lg.userId, pay = Math.round(fee * 1e6);
    if (to && to.id === me) {
      b.cash -= pay; b.pending.fees += pay;
      b.signings.push({ pid: p.id, name: p.name, season: lg.season, round: lg.fixtures.filter((f) => f.played && (f.homeId === me || f.awayId === me)).length, fee: pay, wage: wage != null ? wage : FM.wageOf(p), years: years || 3, book: pay, from: from ? from.name : '' });
    } else if (from && from.id === me) {
      const s = b.signings.find((x) => x.pid === p.id && !x.sold), book = s ? s.book : 0;
      b.cash += pay; b.pending.sales += pay; b.pending.saleProfit += pay - book;
      if (s) s.sold = { fee: pay, season: lg.season };
    }
    FM.bizSyncBudget(lg);
  };
  // A new season: the figures reset, the cash, loans, sponsors and the squad's book values carry on.
  FM.bizNewSeason = function (lg) {
    if (!lg.biz) return;
    const b = FM.biz(lg); b.season = lg.season; b.lastShare = b.shares.price;
    b.sponsors = b.sponsors.filter((s) => s.left > 0); b.boards = b.boards.filter((s) => s.left > 0);
    offersAfterRound(lg, b, { round: -1 });   // the advertisers come for every empty board as the season opens
    FM.bizSyncBudget(lg);
  };

  // ---------- buying things for the stadium ----------
  FM.bizBuild = {
    standCost(stand) { const e = FM.EXPANSIONS[stand]; return e.seats * e.perSeat; },
    standRoom(lg, stand) { const b = FM.biz(lg), base = FM.SEGMENTS.find((s) => s.id === stand).seats, queued = b.projects.filter((p) => p.stand === stand).reduce((a, p) => a + p.seats, 0); return FM.EXPANSIONS[stand].max - ((b.seats[stand] - base) + queued); },
    expand(lg, stand) {
      const b = FM.biz(lg), e = FM.EXPANSIONS[stand]; if (!e) return { ok: false, text: 'That stand cannot be extended.' };
      const cost = e.seats * e.perSeat;
      if (this.standRoom(lg, stand) < e.seats) return { ok: false, text: 'The ground has no more room on that side.' };
      if (b.projects.some((p) => p.kind === 'stand' && p.stand === stand)) return { ok: false, text: 'Building work is already under way on that stand.' };
      if (b.cash < cost) return { ok: false, text: 'The club has ' + gbp(Math.max(0, b.cash)) + ' in the bank, and this costs ' + gbp(cost) + '.' };
      b.cash -= cost; b.pending.capex += cost; b.assets.cost += cost;
      b.projects.push({ id: 'P' + (b.seq++), kind: 'stand', stand, seats: e.seats, cost, left: BUILD_TIME });
      FM.bizSyncBudget(lg); return { ok: true };
    },
    buy(lg, id) {
      const b = FM.biz(lg), f = FM.FACILITIES.find((x) => x.id === id); if (!f) return { ok: false, text: 'No such purchase.' };
      if (hasFacility(b, id)) return { ok: false, text: 'The club already has that.' };
      if (b.cash < f.cost) return { ok: false, text: 'The club has ' + gbp(Math.max(0, b.cash)) + ' in the bank, and this costs ' + gbp(f.cost) + '.' };
      b.cash -= f.cost; b.pending.capex += f.cost; b.assets.cost += f.cost; b.facilities.push(id);
      FM.bizSyncBudget(lg); return { ok: true };
    },
  };

  // ---------- money from outside, and money back to the owners ----------
  FM.bizSources = {
    loanOptions: LOAN_OPTIONS, overdraft: OVERDRAFT,
    takeLoan(lg, amount, term) {
      const b = FM.biz(lg), opt = LOAN_OPTIONS.find((o) => o.term === term); if (!opt || !(amount > 0)) return { ok: false };
      b.loans.push({ id: 'L' + (b.seq++), principal: amount, balance: amount, term, rate: opt.rate, perRound: Math.round(amount / term), season: lg.season });
      b.cash += amount; b.pending.loans += amount; FM.bizSyncBudget(lg); return { ok: true };
    },
    issueShares(lg, amount) {
      const b = FM.biz(lg); if (!(amount > 0)) return { ok: false };
      const price = b.shares.price, add = Math.round(amount / price), dilution = add / (b.shares.issued + add);
      b.shares.issued += add; b.equity.capital += add; b.equity.premium += amount - add; b.cash += amount; b.pending.shares += amount;
      b.approvalFin = clamp(b.approvalFin - dilution * 90, 0, 100);
      FM.bizSyncBudget(lg); return { ok: true, add, dilution, price };
    },
    repayLoan(lg, id) {
      const b = FM.biz(lg), l = b.loans.find((x) => x.id === id); if (!l || b.cash < l.balance) return { ok: false };
      b.cash -= l.balance; b.pending.loans -= l.balance; l.balance = 0; b.loans = b.loans.filter((x) => x.balance > 0); FM.bizSyncBudget(lg); return { ok: true };
    },
    setDividend(lg, policy) { const b = FM.biz(lg); b.dividend.policy = clamp(Math.round(policy * 100) / 100, 0, 0.8); return { ok: true }; },
  };

  // ---------- the statement of financial position ----------
  // Assets = liabilities + equity: what the club owns, what it owes and what that leaves for its owners. The equity is what was put in plus the
  // profits kept (less the dividends paid), so it balances only if every pound that moved is in the books.
  FM.bizBalance = function (lg) {
    const b = FM.biz(lg), stadium = Math.round(b.assets.cost - b.assets.dep), players = Math.round(b.signings.reduce((a, s) => a + (s.sold ? 0 : s.book), 0));
    const cash = Math.max(0, Math.round(b.cash)), overdraft = Math.max(0, Math.round(-b.cash)), loans = Math.round(loanBalance(b));
    const retained = Math.round(b.equity.reserves + b.ledger.reduce((a, e) => a + e.pl.net, 0) + (b.pending.saleProfit || 0) - b.dividendsPaid);
    const capital = Math.round(b.equity.capital), premium = Math.round(b.equity.premium);
    const assets = stadium + players + cash, liabilities = overdraft + loans, equity = capital + premium + retained;
    return { stadium, players, cash, overdraft, loans, capital, premium, retained, assets, liabilities, equity, balanced: Math.abs(assets - liabilities - equity) <= 60 };
  };

  // ---------- sponsors and advertisers: they come to you, in the news, and they will talk about the price ----------
  const SPEAKERS = ['their commercial director', 'their marketing manager', 'the owner', 'their finance director'];
  // How generous advertisers are this year: better after a good finish and a good start, worse after a poor one, and different every season.
  function boardYear(lg, b, pos) {
    const last = b.seasons.length ? b.seasons[b.seasons.length - 1] : null, lastPos = last && last.pos ? last.pos : pos;
    const score = (p) => Math.max(0, Math.min(1, (9 - p) / 8));
    const luck = FM.mulberry32(lg.seed + (lg.runSeed || 0) + lg.season * 6151 + 17)();
    return Math.max(0.55, Math.min(1.6, 0.65 + 0.55 * score(lastPos) + 0.25 * score(pos) + (luck - 0.5) * 0.3));
  }
  function offersAfterRound(lg, b, fx) {
    const rng = FM.mulberry32(lg.seed + (lg.runSeed || 0) + lg.season * 7919 + fx.round * 104729 + 3);
    b.offers.forEach((o) => { if (o.status === 'open' && o.expires < fx.round + 1) o.status = 'expired'; });
    const used = new Set(b.sponsors.concat(b.boards).map((s) => s.company).concat(b.offers.filter((o) => o.status === 'open').map((o) => o.company)));
    const pickCo = () => { const free = COMPANIES.filter((c) => !used.has(c[0])); const c = free[Math.floor(rng() * free.length)] || COMPANIES[0]; used.add(c[0]); return c; };
    const me = FM.teamById(lg, lg.userId), pos = userPos(lg), homeRows = b.ledger.filter((e) => e.home).slice(-3), avgAtt = homeRows.reduce((a, e) => a + e.attTotal, 0) / Math.max(1, homeRows.length) || 8000;
    const push = (o, headline, body) => {
      o.id = 'O' + (b.seq++); o.status = 'open'; o.expires = fx.round + 4; o.patience = 3; o.speaker = SPEAKERS[Math.floor(rng() * SPEAKERS.length)];
      o.ceiling = Math.round(o.perRound * (1.1 + rng() * 0.32) / 100) * 100; o.log = []; b.offers.push(o);
      FM.pushNews(lg, { round: fx.round, day: lg.day, kind: 'Commercial', headline, body, club: lg.userId, mine: true, offer: o.id });
    };
    // an advertising board
    // The boards are meant to be full: every empty board gets an advertiser asking for it (a few a matchday, all of them at the start of a season).
    // What changes from year to year is what they pay, which follows how the club did last season and how it is doing now, with a little luck.
    const yf = boardYear(lg, b, pos), openBoards = b.offers.filter((o) => o.status === 'open' && o.kind === 'board').length;
    const wanted = Math.max(0, BOARDS - b.boards.length - openBoards), nNew = fx.round < 0 ? wanted : Math.min(wanted, 3);
    for (let k = 0; k < nNew; k++) {
      if (fx.round >= 0 && rng() > 0.85) continue;
      const c = pickCo(), perRound = Math.round((1800 + avgAtt * 0.35 + rng() * 1400 + Math.max(0, 8 - pos) * 120) * yf / 100) * 100, rounds = [7, 14, 14, 28][Math.floor(rng() * 4)];
      push({ kind: 'board', company: c[0], perRound, rounds }, `${c[0]} want a place on the advertising boards`, `${c[0]}, a local ${c[1]} firm, have asked for an advertising board at ${me.name}'s ground for the next ${rounds} matchdays. They are offering ${gbp(perRound)} a matchday, ${gbp(perRound * rounds)} in all. The offer stands for a few weeks. You can accept it, turn it down, or try to negotiate.`);
    }
    // a shirt sponsor, when the present deal is nearly over
    const shirt = b.sponsors.find((s) => s.kind === 'Shirt sponsor');
    if ((!shirt || shirt.left <= 3) && !b.offers.some((o) => o.status === 'open' && o.kind === 'shirt') && rng() < 0.8) {
      const c = pickCo(), perRound = Math.round((26000 + rng() * 22000 + Math.max(0, 8 - pos) * 1600) / 500) * 500, rounds = [14, 28][Math.floor(rng() * 2)];
      push({ kind: 'shirt', company: c[0], perRound, rounds }, `${c[0]} offer to put their name on the shirts`, `${c[0]} (${c[1]}) would like to be the shirt sponsor for the next ${rounds} matchdays at ${gbp(perRound)} a matchday, ${gbp(perRound * rounds)} over the deal. They are open to talking.`);
    }
    // a sleeve sponsor, now and then
    if (!b.sponsors.some((s) => s.kind === 'Sleeve sponsor') && !b.offers.some((o) => o.status === 'open' && o.kind === 'sleeve') && rng() < 0.18) {
      const c = pickCo(), perRound = Math.round((7000 + rng() * 6000) / 500) * 500, rounds = 14;
      push({ kind: 'sleeve', company: c[0], perRound, rounds }, `${c[0]} want the sleeve`, `${c[0]} (${c[1]}) are offering ${gbp(perRound)} a matchday for the sleeve sponsorship for the next ${rounds} matchdays.`);
    }
    b.offers = b.offers.filter((o) => o.status === 'open' || fx.round - o.expires < 4).slice(-24);
  }
  function takeOffer(lg, b, o) {
    o.status = 'accepted';
    if (o.kind === 'board') b.boards.push({ id: 'ad' + (b.seq++), company: o.company, perRound: o.perRound, left: o.rounds });
    else if (o.kind === 'shirt') { b.sponsors = b.sponsors.filter((s) => s.kind !== 'Shirt sponsor'); b.sponsors.push({ id: 'sp' + (b.seq++), kind: 'Shirt sponsor', company: o.company, perRound: o.perRound, left: o.rounds }); }
    else b.sponsors.push({ id: 'sp' + (b.seq++), kind: 'Sleeve sponsor', company: o.company, perRound: o.perRound, left: o.rounds });
  }
  FM.bizOffer = function (lg, id, accept) {
    const b = FM.biz(lg), o = b.offers.find((x) => x.id === id && x.status === 'open'); if (!o) return false;
    if (accept) takeOffer(lg, b, o); else o.status = 'declined';
    return true;
  };
  // Negotiating: the club names a price. The company may agree, come back with a figure in between, say it is some way off, take offence, or walk
  // away if its patience runs out. What it will really pay is not shown.
  FM.bizNegotiate = function (lg, id, ask) {
    const b = FM.biz(lg), o = b.offers.find((x) => x.id === id && x.status === 'open');
    if (!o) return { ok: false, text: 'That offer is no longer open.' };
    ask = Math.round(Number(ask) / 100) * 100;
    if (!(ask > 0)) return { ok: false, text: 'Name a figure first.' };
    const who = o.speaker, co = o.company;
    let mood, text;
    if (ask <= o.perRound) { takeOffer(lg, b, o); return { ok: true, status: 'accepted', text: `${co} say that is fine: the deal stays at ${gbp(o.perRound)} a matchday and it is agreed.`, offer: o }; }
    if (ask <= o.ceiling * 0.985) { o.perRound = ask; takeOffer(lg, b, o); return { ok: true, status: 'accepted', text: `${co} think it over and agree to ${gbp(ask)} a matchday. The deal is done.`, offer: o }; }
    if (ask <= o.ceiling * 1.08) {
      const counter = Math.round((o.perRound + Math.min(ask, o.ceiling)) / 2 / 100) * 100;
      o.perRound = Math.max(o.perRound, counter); mood = 'counter';
      text = `${who.charAt(0).toUpperCase() + who.slice(1)} at ${co} says that is a little more than they planned, and comes back with ${gbp(o.perRound)} a matchday.`;
    } else if (ask <= o.ceiling * 1.25) {
      o.patience -= 1; mood = 'short';
      text = `${co} say that is some way beyond their budget and ask you to come back with something nearer ${gbp(Math.round((o.perRound + o.ceiling) / 2 / 100) * 100)}.`;
    } else {
      o.patience -= 2; mood = 'insulted';
      text = `${co} were not expecting a figure like that and sound offended.`;
    }
    o.log.push({ ask, mood }); o.talk = (o.talk || []).concat([text]);
    if (o.patience <= 0) {
      o.status = 'walked'; o.talk = (o.talk || []).concat(['They have walked away from the talks.']);
      FM.pushNews(lg, { round: lg.fixtures.filter((f) => f.played && (f.homeId === lg.userId || f.awayId === lg.userId)).length - 1, day: lg.day, kind: 'Commercial', headline: `${co} walk away from the talks`, body: `${co} have ended negotiations with the club and withdrawn their offer.`, club: lg.userId, mine: true });
      return { ok: true, status: 'walked', text: `${co} have had enough and walk away from the talks. The offer is withdrawn.`, offer: o };
    }
    return { ok: true, status: mood, text, patience: o.patience, offer: o };
  };
  FM.bizOfferText = (o) => ({ board: 'Advertising board', shirt: 'Shirt sponsor', sleeve: 'Sleeve sponsor' }[o.kind] + ': ' + gbp(o.perRound) + ' a matchday for ' + o.rounds + ' matchdays');

  // ---------- the shareholders write to the manager ----------
  function financeNews(lg, b, e, dividend) {
    const round = e.round - 1, push = (headline, body) => FM.pushNews(lg, { round, day: lg.day, kind: 'Board', headline, body, club: lg.userId, mine: true });
    if (b.cash < 0 && b.flags.od !== lg.season + ':' + e.round) {
      b.flags.od = lg.season + ':' + e.round;
      push(b.cash < -OVERDRAFT.limit ? 'The bank has stopped the club spending' : 'The club is in its overdraft', b.cash < -OVERDRAFT.limit ? `The club is ${gbp(-b.cash)} overdrawn, past the ${gbp(OVERDRAFT.limit)} the bank agreed. The shareholders want it sorted before anything else.` : `The bank balance has gone below zero: the club is ${gbp(-b.cash)} overdrawn and paying interest on it.`);
    }
    if (e.round === ROUNDS) {
      const net = seasonSum(b, lg.season, 'net');
      const pr = e.inflow.prize || 0;
      push(net >= PROFIT_TARGET ? 'A profitable season, say the accounts' : net >= 0 ? 'A small profit for the year' : 'The club has made a loss this year', `Finishing ${ord(userPos(lg))} in the ${lg.divisionName} earned ${gbp(pr)} in prize money. The annual accounts show a profit for the year of ${gbp(net)} on revenue of ${gbp(seasonSum(b, lg.season, 'revenue'))}. ${dividend > 0 ? `A dividend of ${gbp(dividend)} has been paid to the shareholders. ` : 'No dividend was paid. '}Cash in the bank stands at ${gbp(b.cash)}.`);
    }
  }

  // ---------- the forecast for the rest of the season ----------
  // For each matchday of this season: what actually happened, or what the books would show at today's wages, deals and loans, with matchday
  // income taken from the crowds that have actually come.
  FM.bizCashFlow = function (lg) {
    const b = FM.biz(lg), me = lg.userId, season = lg.season;
    const done = {}; b.ledger.filter((e) => e.season === season).forEach((e) => { done[e.round] = e; });
    const mine = lg.fixtures.filter((f) => f.homeId === me || f.awayId === me).sort((a, b2) => a.round - b2.round);
    const rowsSoFar = b.ledger.filter((e) => e.season === season);
    let cash = b.lastClose, firstForecast = true, seasonPbtSoFar = rowsSoFar.reduce((a, e) => a + e.pl.pbt, 0), netSoFar = rowsSoFar.reduce((a, e) => a + e.pl.net, 0);
    const cols = [], doneCount = Object.keys(done).length;
    const live = JSON.parse(JSON.stringify({ sp: b.sponsors, bo: b.boards, ln: b.loans }));
    for (let r = 1; r <= ROUNDS; r++) {
      if (done[r]) { cols.push({ round: r, actual: true, inflow: done[r].inflow, outflow: done[r].outflow, opening: done[r].opening, closing: done[r].closing }); continue; }
      const fx = mine.find((f) => f.round === r - 1); if (!fx) continue;
      const home = fx.homeId === me, ahead = r - 1 - doneCount;
      const saveSp = b.sponsors, saveBo = b.boards, saveLn = b.loans, saveCash = b.cash;
      b.sponsors = live.sp.map((s) => Object.assign({}, s, { left: s.left - ahead })); b.boards = live.bo.map((s) => Object.assign({}, s, { left: s.left - ahead }));
      b.loans = live.ln.map((l) => Object.assign({}, l)); b.cash = Math.min(cash, saveCash);
      const l = lines(lg, fx, home, true);
      l.inflow.prize = r === ROUNDS ? prizeFor(lg) : 0;   // at today's league position
      b.sponsors = saveSp; b.boards = saveBo; b.loans = saveLn; b.cash = saveCash;
      // what has been signed, sold, borrowed or built since the last matchday goes into the first matchday still to come
      const pend = firstForecast ? b.pending : { sales: 0, loans: 0, shares: 0, fees: 0, capex: 0 }; firstForecast = false;
      const inflow = Object.assign({}, l.inflow, { sales: pend.sales, loans: pend.loans, shares: pend.shares }), outflow = Object.assign({}, l.outflow, { fees: pend.fees, capex: pend.capex || 0, tax: 0, dividends: 0 });
      const revenue = l.inflow.tickets + l.inflow.matchday + l.inflow.broadcast + l.inflow.sponsor + l.inflow.advert + l.inflow.merch + l.inflow.prize;
      const pbt = revenue - (l.outflow.matchday + l.outflow.merchCost) - (l.outflow.wages + l.outflow.marketing + l.outflow.admin) - depPerRound(b) - l.outflow.interest;
      seasonPbtSoFar += pbt;
      if (r === ROUNDS) {
        outflow.tax = Math.max(0, seasonPbtSoFar) * TAX;
        outflow.dividends = Math.max(0, Math.round((netSoFar + pbt - outflow.tax) * (b.dividend.policy || 0)));
      }
      netSoFar += pbt - (r === ROUNDS ? outflow.tax : 0);
      const net = sum(inflow) - sum(outflow);
      const col = { round: r, actual: false, inflow, outflow, opening: cash, closing: cash + net };
      cash = col.closing; cols.push(col);
      live.ln.forEach((ln) => { ln.balance = Math.max(0, ln.balance - ln.perRound); });
    }
    return cols;
  };

  // ---------- a short account of the business, for the agent ----------
  FM.bizDigest = function (lg) {
    if (!lg.biz) return '';
    const b = FM.biz(lg), rows = b.ledger.filter((e) => e.season === lg.season);
    const ap = FM.bizApprovals(lg), bal = FM.bizBalance(lg);
    const out = [];
    out.push(`The club's business: a public limited company. Cash ${gbp(b.cash)}, loans outstanding ${gbp(loanBalance(b))}, shareholder approval of the finances ${Math.round(ap.financial)}% and of the football ${Math.round(ap.football)}%, share price £${ap.share.toFixed(2)}. Ground capacity ${num(FM.bizCapacity(lg))}. Balance sheet: assets ${gbp(bal.assets)}, liabilities ${gbp(bal.liabilities)}, equity ${gbp(bal.equity)}. Dividend policy ${Math.round((b.dividend.policy || 0) * 100)}% of profit.`);
    out.push('Ticket prices now: ' + FM.SEGMENTS.map((s) => `${s.name} £${b.prices[s.id].price} (${num(b.seats[s.id])} seats)`).join(', ') + `. Marketing budget ${gbp(b.marketing || 0)} a matchday. Facilities built: ${b.facilities.length ? b.facilities.map((id) => FM.FACILITIES.find((f) => f.id === id).name).join(', ') : 'none'}.`);
    out.push("The shareholders' objectives this season: " + FM.bizObjectives(lg).map((o) => `${o.aim}: ${o.title} (${o.value}; ${o.state})`).join('; ') + '.');
    if (rows.length) {
      const t = (k) => rows.reduce((a, e) => a + e.pl[k], 0), home = rows.filter((e) => e.home);
      out.push(`This season (${rows.length} matchdays): revenue ${gbp(t('revenue'))}, gross profit ${gbp(t('gross'))}, operating profit ${gbp(t('op'))}, profit for the year so far ${gbp(t('net'))}.`);
      home.slice(-4).forEach((e) => out.push(`Home v ${e.opp} (round ${e.round}): attendance ${num(e.attTotal)} of ${num(e.capacity || FM.bizCapacity(lg))}, ticket revenue ${gbp(e.inflow.tickets)}, turned away ${num(e.away)}; by stand ` + FM.SEGMENTS.map((s) => `${s.name} ${num(e.att[s.id])} at £${e.prices[s.id]}`).join(', ') + '.'));
    } else out.push('No matchday has been played yet this season, so there are no accounts yet.');
    if (b.signings.length) out.push('Signings: ' + b.signings.slice(-6).map((s) => `${s.name} cost ${gbp(s.fee)} (wage ${s.wage}k a week, ${s.years}-year contract)`).join('; ') + '.');
    out.push('Sponsors: ' + (b.sponsors.map((s) => `${s.company} ${gbp(s.perRound)} a matchday`).concat(b.boards.map((s) => `${s.company} (board) ${gbp(s.perRound)}`)).join('; ') || 'none') + '.');
    { const pz = FM.bizPrize(lg); out.push(`League prize money is paid at the end of the season by finishing position (first ${gbp(pz.table[0])} down to eighth ${gbp(pz.table[7])}); the club is ${ord(pz.position)} now, which would pay ${gbp(pz.amount)}.`); }
    if (b.conf.low) out.push(`The shareholders have lost faith for ${b.conf.low} matchday(s) running; a vote of no confidence is possible.`);
    return out.join('\n');
  };
  FM.bizConst = { ROUNDS, PROFIT_TARGET, OVERDRAFT, TAX, MERCH_COST, SPEND_PER_HEAD, RUN_PER_HEAD, RUN_FIXED, ADMIN, BUILD_TIME, EXPECTED_DIVIDEND };
  FM.bizInternals = { lines, loanBalance, depPerRound, userPos, wageBill, appeal, num, gbp, sum, effects, signingDep, stadiumDep };
})();
