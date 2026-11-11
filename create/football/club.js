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
  const MERCH_COST = 0.55, SPEND_PER_HEAD = 5.5, RUN_PER_HEAD = 2.4, RUN_FIXED = 14000, ADMIN = 100000, BROADCAST = { 1: 64000, 2: 38000, 3: 16000, 4: 8000 };
  const EXPECTED_DIVIDEND = 0.2;   // the share of profit the shareholders hope to see paid out
  // Prize money, paid at the end of the season by where the club finished: first place down to eighth, in the top division and the second.
  // Scaled to what good players cost: a star is £20m or more, so a title is worth about one top player, and finishing last still pays a squad player's fee.
  const PRIZE = { 1: [8000000, 6000000, 4600000, 3600000, 2800000, 2100000, 1600000, 1200000], 2: [3200000, 2400000, 1900000, 1500000, 1150000, 850000, 650000, 500000],
    3: [1300000, 1000000, 800000, 620000, 480000, 360000, 280000, 200000], 4: [700000, 550000, 420000, 330000, 250000, 190000, 140000, 100000] };   // by division, for finishing first to eighth (every division has eight clubs)

  // ---------- formatting ----------
  const gbp = (n) => { const v = Math.round(n); return v < 0 ? '(£' + Math.abs(v).toLocaleString('en-GB') + ')' : '£' + v.toLocaleString('en-GB'); };
  const num = (n) => Math.round(n).toLocaleString('en-GB');
  FM.gbp = gbp;

  // ---------- the board and the money behind the club ----------
  // Every new game draws one of three situations for the club. A takeover has just put new money in; the backing is steady; or the club is short of money and in debt.
  // The board then releases only part of the bank balance for transfers (what is left after a reserve it keeps back), and the Director of Finance explains all of it
  // at the start (see the Board paper on the board and the budget).
  const LVL_BASE = { 1: 8000000, 2: 5000000, 3: 3000000, 4: 1800000 };
  const OWNERS = ['Meridian Sports Group', 'Northgate Capital Partners', 'the Aurelian Consortium', 'Calder Bay Holdings'];
  FM.BOARD_KINDS = {
    mega: { label: 'A huge takeover: a bottomless pocket', pct: 100, reserve: 2000000 },
    takeover: { label: 'A takeover and new money', pct: 90, reserve: 1500000 },
    steady: { label: 'Steady backing', pct: 70, reserve: 1500000 },
    tight: { label: 'A club short of money', pct: 40, reserve: 1000000 },
    debt: { label: 'A club in deep debt', pct: 25, reserve: 500000 },
    loans: { label: 'The bank balance is frozen: only new money can be spent', pct: 100, reserve: 0 },
    ban: { label: 'A transfer ban', pct: 70, reserve: 1500000 },
  };
  const MEGA_OWNERS = ['the Zenith Sovereign Investment Authority', 'Halvorsen Global Holdings', 'the Kestrel Gulf Consortium'];
  FM.boardPlan = function (lg) {
    const rng = FM.mulberry32((lg.seed || 1) + (lg.runSeed || 0) * 911 + 31), r = rng(), owner = OWNERS[Math.floor(rng() * OWNERS.length)];
    // the extremes are rare: a huge takeover 4%, an ordinary one 14%, steady 34%, short of money 18%, deep in debt 10%, bank balance frozen 8%, a transfer ban 12%
    const kind = r < 0.04 ? 'mega' : r < 0.18 ? 'takeover' : r < 0.52 ? 'steady' : r < 0.70 ? 'tight' : r < 0.80 ? 'debt' : r < 0.88 ? 'loans' : 'ban', base = LVL_BASE[lg.divisionLevel || 1] || LVL_BASE[1], K = FM.BOARD_KINDS[kind];
    const round = (v) => Math.round(v / 1e5) * 1e5;
    const injection = kind === 'mega' ? round(base * 5) : kind === 'takeover' ? round(base * 0.9) : 0;
    const debt = kind === 'tight' ? round(base * 0.2) : kind === 'debt' ? round(base * 1.8) : kind === 'loans' ? round(base * 0.5) : 0;
    const cash = kind === 'tight' ? round(base * 0.4) : kind === 'debt' ? round(base * 0.25) : kind === 'loans' ? round(base * 0.6) : base + injection;
    const ownerName = kind === 'mega' ? MEGA_OWNERS[Math.floor(rng() * MEGA_OWNERS.length)] : owner;
    const reserve = kind === 'loans' ? cash : Math.round(K.reserve * base / LVL_BASE[1] / 1e5) * 1e5;
    const plan = { kind, owner: ownerName, base, injection, debt, debtTerm: kind === 'debt' ? 42 : 28, debtRate: kind === 'debt' ? 0.09 : 0.075, cash, pct: K.pct, reserve, briefSeen: false, history: [] };
    if (kind === 'ban') plan.ban = { untilRound: 9, reason: 'breaches of the league\'s financial rules in the past two seasons', lifted: false };
    return plan;
  };

  // ---------- the company's state ----------
  function init(lg) {
    const me = lg.userId, t = FM.transfer ? FM.transfer(lg) : null;
    const started = !!(t && Number.isFinite(t.budget[me]) && lg.fixtures.some((f) => f.played));
    // a game already under way (saved before the board plan existed) keeps its money and the old rule; a new one draws a situation
    const plan = started || lg.mp ? null : FM.boardPlan(lg);
    const opening = plan ? plan.cash : started ? Math.max(2000000, Math.round(t.budget[me] * 1e6)) : 8000000;
    const segs = {}, seats = {}; FM.SEGMENTS.forEach((s) => { segs[s.id] = { price: s.ref }; seats[s.id] = s.seats; });
    return {
      v: 1, cash: opening, lastClose: opening, season: lg.season, prices: segs, seats, marketing: 0,
      sponsors: [{ id: 'sp1', kind: 'Shirt sponsor', company: 'Halden Mutual', perRound: 34000, left: 28 }],
      boards: [{ id: 'ad1', company: 'Fernhill Dairy', perRound: 3200, left: 14 }, { id: 'ad2', company: 'Northgate Tyres', perRound: 2800, left: 14 }, { id: 'ad3', company: 'Quill Print & Design', perRound: 2400, left: 14 }],
      offers: [], loans: plan && plan.debt ? [{ id: 'L0', principal: plan.debt, balance: plan.debt, term: plan.debtTerm || 28, rate: plan.debtRate || 0.075, perRound: Math.round(plan.debt / (plan.debtTerm || 28)), season: lg.season }] : [], shares: { issued: 1000000, price: 10 }, ledger: [], signings: [], seasons: [], pending: { fees: 0, sales: 0, loans: 0, shares: 0, saleProfit: 0, capex: 0 },
      approvalFin: 55, lastShare: 10, seq: 1,
      facilities: [], projects: [], assets: { cost: OPENING_STADIUM, dep: 0 },
      equity: { capital: 1000000, premium: 0, reserves: OPENING_STADIUM + opening - (plan ? plan.debt : 0) - 1000000 }, dividendsPaid: 0, dividend: { policy: 0.25 },
      board: plan || { kind: 'steady', legacy: true, pct: 100, reserve: 0, briefSeen: true, owner: null, history: [] },
      conf: { low: 0, vote: null, dismissed: false }, flags: {},
    };
  }
  // A game saved before a part of the business existed gets that part now, set so that the books still balance.
  function ensure(b) {
    if (!b.seats) { b.seats = {}; FM.SEGMENTS.forEach((s) => { b.seats[s.id] = s.seats; }); }
    if (!b.facilities) b.facilities = [];
    if (!b.levers) b.levers = [];   // custom spending set up in the Workbook (see controls.js)
    if (!b.rules) b.rules = [];
    if (!b.queued) b.queued = [];   // one-off costs (medical treatment) that go into the next matchday's books
    if (!b.projects) b.projects = [];
    if (!b.assets) b.assets = { cost: OPENING_STADIUM, dep: 0 };
    if (!b.dividend) b.dividend = { policy: 0.25 };
    if (b.dividendsPaid == null) b.dividendsPaid = 0;
    if (!b.conf) b.conf = { low: 0, vote: null, dismissed: false };
    if (!b.board) b.board = { kind: 'steady', legacy: true, pct: 100, reserve: 0, briefSeen: true, owner: null, history: [] };
    if (!b.flags) b.flags = {};
    if (!b.pending.capex) b.pending.capex = 0;
    if (!b.pending.invest) b.pending.invest = 0;
    if (!b.pending.divest) b.pending.divest = 0;
    if (!b.payables) b.payables = [];     // what the club still owes for players bought in instalments
    if (!b.receivables) b.receivables = [];   // what is still to come from players sold in instalments
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
  // What custom spending is doing now: one multiplier for each thing the game reads (see controls.js for what can be bought and how it is capped).
  const leverMod = (b, target) => { let m = 1; (b.levers || []).forEach((l) => { if (l.left > 0) (l.effects || []).forEach((e) => { if (e.target === target) m *= 1 + e.pct / 100; }); }); return clamp(m, 0.7, 1.4); };
  FM.leverMod = leverMod;
  FM.userMod = (target) => { const lg = FM.curLeague; return lg && lg.biz && lg.biz.v === 1 ? leverMod(lg.biz, target) : 1; };
  const leverCost = (b) => (b.levers || []).reduce((a, l) => a + (l.left > 0 ? l.perRound : 0), 0) + (b.queued || []).reduce((a, q) => a + q.amount, 0);
  const effects = (b) => ({
    appeal: (hasFacility(b, 'lights') ? 1.025 : 1) * leverMod(b, 'attendance'), merch: (hasFacility(b, 'shop') ? 1.35 : 1) * leverMod(b, 'merch'), spend: hasFacility(b, 'fanzone') ? 1.6 : 0, mspend: leverMod(b, 'matchdaySpend'), sponsor: leverMod(b, 'sponsorship'), run: leverMod(b, 'runningCosts'), ads: (hasFacility(b, 'screens') ? 1.25 : 1) * leverMod(b, 'sponsorship'),
    upkeep: FM.FACILITIES.filter((f) => hasFacility(b, f.id)).reduce((a, f) => a + f.upkeep, 0) + FM.SEGMENTS.reduce((a, s) => a + Math.max(0, (b.seats[s.id] || s.seats) - s.seats) * 8, 0),
  });
  FM.bizDevBoost = (lg) => (lg.biz ? (hasFacility(FM.biz(lg), 'training') ? 1.12 : 1) * leverMod(FM.biz(lg), 'development') : 1);

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
  // The crowd at another club's ground: the bigger the division and the bigger the club, the bigger the ground and the fuller it is. A top-flight leader fills about 70,000; near the bottom of
  // that division it is about 30,000; the lower divisions hold a fraction of that. (Used for the visitors' share of the gate, in the league and the cup.)
  FM.groundCrowd = function (lg, team, str) {
    const div = FM.allDivisions(lg).find((d) => d.teams.indexOf(team) >= 0), level = div ? div.level : (lg.divisionLevel || 1);
    const s = clamp(((str == null ? ((team && team.strength) || 0) + 0.5 : str)) / 1.5, 0, 1);
    const span = { 1: [30000, 72000], 2: [16000, 34000], 3: [8000, 19000], 4: [3500, 9500] }[level] || [3500, 9500];
    return (span[0] + (span[1] - span[0]) * s) * 0.93;
  };
  const prizeFor = (lg) => { const table = PRIZE[lg.divisionLevel || 1] || PRIZE[1]; return table[clamp(userPos(lg) - 1, 0, table.length - 1)]; };
  FM.bizPrize = (lg) => ({ position: userPos(lg), amount: prizeFor(lg), table: PRIZE[lg.divisionLevel || 1] || PRIZE[1] });

  // The lines for one round: home or away. The real draw when the match has been played; a forecast reads the crowds that have actually come
  // (the club cannot see a crowd before the match), and before any home match has been played there is nothing to read.
  function lines(lg, fx, home, est) {
    const b = FM.biz(lg), eff = effects(b);
    let d = null, att = 0, tickets = 0, spend = 0;
    if (home && !est) { d = FM.bizDemand(lg, fx); att = d.total; tickets = d.tickets; spend = att * (SPEND_PER_HEAD + eff.spend) * eff.mspend; }
    else if (home) {
      const past = b.ledger.filter((e) => e.home).slice(-4);
      if (past.length) { att = past.reduce((a, e) => a + e.attTotal, 0) / past.length; tickets = past.reduce((a, e) => a + e.inflow.tickets, 0) / past.length; spend = past.reduce((a, e) => a + e.inflow.matchday, 0) / past.length; }
    }
    // Away from home the club takes a share of the gate at the other ground: their crowd (a bigger one for a bigger club) at roughly the prices this
    // club charges itself, and the visitors keep AWAY_SHARE of it.
    if (!home && fx) {
      const opp = FM.teamById(lg, fx.homeId === lg.userId ? fx.awayId : fx.homeId), str = clamp(((opp && opp.strength) || 0) + 0.5, 0, 1.5);
      const noise = est ? 1 : 0.94 + 0.12 * FM.mulberry32(lg.seed + (lg.runSeed || 0) + fx.round * 4999 + lg.season * 37 + 5)();
      const crowd = FM.groundCrowd(lg, opp, str) * noise, seats = FM.SEGMENTS.reduce((a, s) => a + (b.seats[s.id] || s.seats), 0);
      const avgPrice = FM.SEGMENTS.reduce((a, s) => a + (b.seats[s.id] || s.seats) * clamp((b.prices[s.id] || { price: s.ref }).price, 3, 400), 0) / Math.max(1, seats);
      tickets = Math.round(crowd * avgPrice * AWAY_SHARE / 100) * 100;
    }
    const pos = userPos(lg), lastAtt = (b.ledger.filter((e) => e.home).slice(-1)[0] || {}).attTotal || 7000;
    const merch = (7000 + 0.9 * (att || lastAtt) + 1400 * Math.max(0, 8 - pos)) * eff.merch;
    const inflow = {
      tickets, matchday: spend,
      broadcast: BROADCAST[lg.divisionLevel || 1] * (1 + 0.025 * Math.max(0, 8 - pos)),
      sponsor: b.sponsors.filter((s) => s.left > 0).reduce((a, s) => a + s.perRound, 0) * eff.sponsor,
      advert: b.boards.filter((s) => s.left > 0).reduce((a, s) => a + s.perRound, 0) * eff.ads,
      merch,
    };
    const od = b.cash < 0 ? -b.cash : 0, odRate = od > OVERDRAFT.limit ? OVERDRAFT.penalty : OVERDRAFT.rate;
    const interestLoans = b.loans.reduce((a, l) => a + l.balance * l.rate / ROUNDS, 0), interestOd = od * odRate / ROUNDS;
    const outflow = {
      wages: wageBill(lg), matchday: home ? (RUN_FIXED + RUN_PER_HEAD * att) * eff.run : 0, marketing: b.marketing || 0, admin: ADMIN + eff.upkeep + leverCost(b), merchCost: merch * MERCH_COST,
      loanPay: b.loans.reduce((a, l) => a + Math.min(l.balance, l.perRound), 0), interest: interestLoans + interestOd - (FM.bonds ? FM.bonds.couponPerRound(b) : 0),   // interest received on bonds comes off the interest paid
    };
    return { att, d, inflow, outflow };
  }

  // The League Cup: what each round pays, in £m, to the club that plays it. It rises every round, and a win pays much more than a defeat (the final pays most of all). The smaller divisions
  // are paid less. Money goes into the club's cash and is released to the transfer budget in full (see FM.bizSyncBudget).
  const CUP_WIN = [0.30, 0.55, 0.95, 1.60, 3.00], CUP_LOSE = [0.12, 0.22, 0.40, 0.70, 1.30], CUP_LEVEL = { 1: 1, 2: 0.65, 3: 0.4, 4: 0.25 };
  FM.cupPrizeMoney = (lg, stageIndex, won) => { const k = clamp(stageIndex, 0, CUP_WIN.length - 1), f = CUP_LEVEL[lg.divisionLevel || 1] || 0.25; return Math.round((won ? CUP_WIN[k] : CUP_LOSE[k]) * f * 100) / 100; };
  // A cup tie of the managed club: the gate (his own ground, or the visitors' share of theirs), what the matchday brings in and costs, and the prize for the round.
  FM.bizCupTie = function (lg, fx, stageIndex, won) {
    if (!fx || (lg.mp && lg.mp.kind === 'match')) return null;
    const b = FM.biz(lg), me = lg.userId, home = fx.homeId === me;
    if (b.conf && b.conf.dismissed) return null;
    const l = lines(lg, fx, home, false), prizeM = FM.cupPrizeMoney(lg, stageIndex, won), prize = Math.round(prizeM * 1e6);
    const run = home ? Math.round(l.outflow.matchday) : 0, tickets = Math.round(l.inflow.tickets), spend = home ? Math.round(l.inflow.matchday) : 0;
    b.cash = Math.round(b.cash + tickets + spend - run + prize);
    const p = b.pending; p.cupTickets = (p.cupTickets || 0) + tickets; p.cupMatchday = (p.cupMatchday || 0) + spend; p.cupRun = (p.cupRun || 0) + run; p.cupPrize = (p.cupPrize || 0) + prize;
    b.prizeFund = (b.prizeFund || 0) + prize;
    FM.bizSyncBudget(lg);
    return { home, tickets, prize: prizeM, att: l.att || null };
  };

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
    const cupIn = (p.cupTickets || 0) + (p.cupMatchday || 0) + (p.cupPrize || 0);
    const inflow = Object.assign({}, l.inflow, { sales: p.sales, loans: p.loans, shares: p.shares, divest: p.divest || 0, cup: cupIn });
    const outflow = Object.assign({}, l.outflow, { fees: p.fees, capex: p.capex, invest: p.invest || 0, tax: 0, dividends: 0 });
    const seasonRows = b.ledger.filter((e) => e.season === lg.season);
    const revenue = l.inflow.tickets + l.inflow.matchday + l.inflow.broadcast + l.inflow.sponsor + l.inflow.advert + l.inflow.merch + l.inflow.prize + cupIn;
    const cos = l.outflow.matchday + l.outflow.merchCost + (p.cupRun || 0);
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
    b.levers.forEach((lv) => { lv.left -= 1; }); b.levers = b.levers.filter((lv) => lv.left > 0); b.queued = [];
    const entry = {
      season: lg.season, round: fx.round + 1, home, opp: opp ? opp.name : '', attTotal: l.att, att: l.d ? Object.keys(l.d.rows).reduce((o, k) => { o[k] = l.d.rows[k].sold; return o; }, {}) : null, away: l.d ? l.d.turnedAway : 0,
      prices: l.d ? Object.keys(l.d.rows).reduce((o, k) => { o[k] = l.d.rows[k].price; return o; }, {}) : null, capacity: l.d ? l.d.capacity : 0,
      inflow, outflow, opening, closing: b.cash, dep, depSign: signingDep(b),
      pl: { revenue, cos, gross, expenses, saleProfit: p.saleProfit, op, interest: l.outflow.interest, pbt, tax, net },
    };
    b.ledger.push(entry);
    b.lastClose = b.cash;
    b.pending = { fees: 0, sales: 0, loans: 0, shares: 0, saleProfit: 0, capex: 0, invest: 0, divest: 0 };
    if ((fx.round | 0) === ROUNDS - 1) b.prizeFund = 0;   // the season's prize money is spent or absorbed by the end of it
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
    settlePlans(lg, b);
    if (FM.bonds) { try { FM.bonds.afterRound(lg, b); } catch (e) { console.error('The bond market:', e); } }
    FM.bizSyncBudget(lg);
    financeNews(lg, b, entry, dividend);
    confidenceCheck(lg, b, fx);
    if (FM.controls && FM.controls.afterRound) FM.controls.afterRound(lg, fx);   // new injuries are logged and the manager's rules run
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

  // ---------- the board's patience, and the final warning ----------
  // The football and the finances are judged on their own: good finances do not make up for bad football, nor the other way round. Each is held against what THIS board expects of
  // the club this season (an ambitious board expecting a title challenge wants a high approval and loses patience at 40%; a board expecting a fight against relegation puts up
  // with 15%), and each builds up unease while it is below that and fades while it is not. How much unease a board will stand differs from one season to the next. When one of
  // them is nearly spent the board does not simply sack the manager: it sends him a final warning, an ultimatum for the next match (or, for the money, the next few). Meet it
  // and the pressure comes off; fail it and he is dismissed.
  function boardLine(lg, c) {
    if (c.pSeason === lg.season && c.footFloor != null) return;
    const r = FM.mulberry32(lg.seed + (lg.runSeed || 0) + lg.season * 977);
    let n = 8; try { n = Math.max(2, FM.tableRows(lg).length); } catch (e) { /* the usual eight */ }
    const exp = (lg.board && lg.board.expectedPosition) || Math.ceil(n / 2), ambition = 1 - (exp - 1) / (n - 1);
    c.pSeason = lg.season;
    c.footFloor = Math.round(clamp(12 + 34 * ambition + (r() - 0.5) * 10, 12, 46));   // the approval this board expects the football to keep at
    c.finFloor = Math.round(clamp(14 + 26 * r(), 14, 40));
    c.footLimit = 1.0 + 1.1 * r(); c.finLimit = 1.0 + 1.1 * r(); c.footU = 0; c.finU = 0; c.ult = null; c.expPos = exp;
  }
  function confidenceCheck(lg, b, fx) {
    const ap = FM.bizApprovals(lg), c = b.conf;
    if (c.dismissed) return;
    boardLine(lg, c);
    let rows = []; try { rows = FM.tableRows(lg); } catch (e) { rows = []; }
    const me = rows.find((r) => r.id === lg.userId), n = Math.max(1, rows.length), pos = rows.findIndex((r) => r.id === lg.userId) + 1, played = me ? me.p : 0;
    const home = fx && fx.homeId === lg.userId, gf = fx ? (home ? fx.hg : fx.ag) : 0, ga = fx ? (home ? fx.ag : fx.hg) : 0, userFx = !!(fx && (fx.homeId === lg.userId || fx.awayId === lg.userId) && fx.hg != null);
    const push = (headline, body) => FM.pushNews(lg, { round: fx.round, day: lg.day, kind: 'Board', headline, body, club: lg.userId, mine: true });
    // an ultimatum already given is settled first
    const u = c.ult;
    if (u && fx.round > u.issued) {
      if (u.kind === 'football' && userFx) {
        const met = u.demand === 'win' ? gf > ga : gf >= ga;
        if (met) { c.ult = null; c.footU = c.footLimit * 0.45; c.cleared = { kind: 'football', round: fx.round, seen: false }; push('The board backs off', 'The result answered the final warning. The board has told the manager the matter is closed for now, but they will be watching.'); }
        else { c.dismissed = true; c.sack = { kind: 'football', round: fx.round, approval: ap.football, floor: c.footFloor, demand: u.demand, seen: false }; push('The manager is sacked', 'The board had given the manager a final warning and the result did not answer it. He has been dismissed.'); return; }
      } else if (u.kind === 'finance' && fx.round >= u.deadline) {
        if (ap.financial >= c.finFloor + 5) { c.ult = null; c.finU = c.finLimit * 0.45; c.cleared = { kind: 'finance', round: fx.round, seen: false }; push('The board backs off', 'The finances have been put back in order and the board has told the manager the matter is closed for now.'); }
        else { c.dismissed = true; c.sack = { kind: 'finance', round: fx.round, approval: ap.financial, floor: c.finFloor, seen: false }; push('The manager is sacked', 'The board had given the manager a final warning about the finances and they were not put right. He has been dismissed.'); return; }
      }
    }
    // pressure from each: how far under what the board expects (and, for the football, how far under the promised place and how the last few results went)
    const below = played >= 3 ? Math.max(0, pos - c.expPos) / n : 0;
    const lost = (() => { try { const last = lg.fixtures.filter((f) => f.played && (f.homeId === lg.userId || f.awayId === lg.userId)).sort((x, y) => x.round - y.round).slice(-4); return last.length ? last.filter((f) => (f.homeId === lg.userId ? f.hg < f.ag : f.ag < f.hg)).length / last.length : 0; } catch (e) { return 0; } })();
    const pFoot = clamp((c.footFloor + 12 - ap.football) / 30, 0, 1.4) + 0.8 * below + 0.2 * lost, pFin = clamp((c.finFloor + 12 - ap.financial) / 30, 0, 1.4);
    const step = (u0, p) => Math.max(0, u0 * (p < 0.05 ? 0.8 : 1) + (p - 0.12) * 0.6);
    c.footU = step(c.footU, pFoot); c.finU = step(c.finU, pFin);
    const sf = c.footU / c.footLimit, sn = c.finU / c.finLimit, share = Math.max(sf, sn);
    c.low = share > 0.75 ? 3 : share > 0.45 ? 2 : share > 0.15 ? 1 : 0;   // (what the pages say: how far the board has lost faith)
    if (!c.ult && (sf >= 0.8 || sn >= 0.8) && userFx) {
      const kind = sf >= sn ? 'football' : 'finance', rows2 = n;
      if (kind === 'football') {
        const demand = c.expPos <= Math.ceil(rows2 / 3) ? 'win' : 'avoid defeat';
        c.ult = { kind, demand, issued: fx.round, approval: ap.football, floor: c.footFloor, expPos: c.expPos, pos, seen: false };
        push('Final warning from the board', 'The board has told the manager that the football is not good enough: ' + (demand === 'win' ? 'win the next match or he is gone.' : 'he cannot lose the next match.'));
      } else {
        c.ult = { kind, issued: fx.round, deadline: fx.round + 3, approval: ap.financial, floor: c.finFloor, seen: false };
        push('Final warning from the board', 'The board has told the manager that the finances must be put right within three matchdays or he is gone.');
      }
    }
  }

  // A game saved before the board kept this tally has it worked out as if it had been kept from the first matchday of the season: the matches already played are gone through in order,
  // against the board's approval as it stands now, so the unease (and a final warning, if it has been earned) is what it would have been.
  FM.bizBoardCatchUp = function (lg) {
    const b = FM.biz(lg), c = b && b.conf; if (!c || c.dismissed || lg.mp) return;
    boardLine(lg, c);
    if (c.cuSeason === lg.season) return;
    c.cuSeason = lg.season;
    const ap = FM.bizApprovals(lg), mine = lg.fixtures.filter((f) => f.played && (f.homeId === lg.userId || f.awayId === lg.userId)).sort((x, y) => x.round - y.round);
    if (!mine.length) return;
    const ids = lg.teams.map((t) => t.id), n = Math.max(2, ids.length), step = (u0, p) => Math.max(0, u0 * (p < 0.05 ? 0.8 : 1) + (p - 0.12) * 0.6);
    const results = [];
    mine.forEach((f, k) => {
      const home = f.homeId === lg.userId, gf = home ? f.hg : f.ag, ga = home ? f.ag : f.hg; results.push(gf < ga ? 1 : 0);
      const pts = {}, gd = {}; ids.forEach((id) => { pts[id] = 0; gd[id] = 0; });
      lg.fixtures.filter((x) => x.played && x.round <= f.round && pts[x.homeId] != null && pts[x.awayId] != null).forEach((x) => { const d = x.hg - x.ag; gd[x.homeId] += d; gd[x.awayId] -= d; if (d > 0) pts[x.homeId] += 3; else if (d < 0) pts[x.awayId] += 3; else { pts[x.homeId]++; pts[x.awayId]++; } });
      const pos = ids.slice().sort((x, y) => pts[y] - pts[x] || gd[y] - gd[x]).indexOf(lg.userId) + 1, below = k + 1 >= 3 ? Math.max(0, pos - c.expPos) / n : 0, last = results.slice(-4), lost = last.reduce((a2, v) => a2 + v, 0) / last.length;
      c.footU = step(c.footU, clamp((c.footFloor + 12 - ap.football) / 30, 0, 1.4) + 0.8 * below + 0.2 * lost);
      c.finU = step(c.finU, clamp((c.finFloor + 12 - ap.financial) / 30, 0, 1.4));
    });
    const sf = c.footU / c.footLimit, sn = c.finU / c.finLimit, share = Math.max(sf, sn), lastF = mine[mine.length - 1];
    c.low = share > 0.75 ? 3 : share > 0.45 ? 2 : share > 0.15 ? 1 : 0;
    if (!c.ult && (sf >= 0.8 || sn >= 0.8)) {
      const rows = FM.tableRows(lg), pos2 = rows.findIndex((r) => r.id === lg.userId) + 1;
      if (sf >= sn) { const demand = c.expPos <= Math.ceil(n / 3) ? 'win' : 'avoid defeat'; c.ult = { kind: 'football', demand, issued: lastF.round, approval: ap.football, floor: c.footFloor, expPos: c.expPos, pos: pos2, seen: false }; }
      else c.ult = { kind: 'finance', issued: lastF.round, deadline: lastF.round + 3, approval: ap.financial, floor: c.finFloor, seen: false };
      FM.pushNews(lg, { round: lastF.round, day: lg.day, kind: 'Board', headline: 'Final warning from the board', body: c.ult.kind === 'football' ? 'The board has told the manager that the football is not good enough: ' + (c.ult.demand === 'win' ? 'win the next match or he is gone.' : 'he cannot lose the next match.') : 'The board has told the manager that the finances must be put right within three matchdays or he is gone.', club: lg.userId, mine: true });
    }
  };

  // ---------- the manager's style, as the football he has had his sides play shows it ----------
  // Read from the way his club has set up and what it has done in its matches: how hard it presses, how high the line is, how directly it builds, how much of the ball it keeps.
  FM.managerStyle = function (lg) {
    const me = FM.teamById(lg, lg.userId), t = me.tactics || {}, played = lg.fixtures.filter((f) => f.played && f.stats && f.stats[lg.userId] && (f.homeId === lg.userId || f.awayId === lg.userId));
    let mine = 0, theirs = 0, passes = 0;
    played.forEach((f) => { const o = f.homeId === lg.userId ? f.awayId : f.homeId, a = f.stats[lg.userId], d = f.stats[o] || {}; mine += a.possession || 0; theirs += d.possession || 0; passes += a.passes || 0; });
    const poss = mine + theirs > 0 ? mine / (mine + theirs) : 0.5, ppm = played.length ? passes / played.length : 450;
    const press = t.pressing == null ? 0.5 : t.pressing, line = t.lineHeight == null ? 0.5 : t.lineHeight, direct = t.directness == null ? 0.5 : t.directness, counter = t.counterAttack == null ? 0.5 : t.counterAttack, tempo = t.tempo == null ? 0.5 : t.tempo;
    let label, text, tags;
    if (press >= 0.55 && line >= 0.5 && direct <= 0.5 && poss >= 0.5) { label = 'modern, progressive'; tags = ['press', 'possession']; text = 'a modern, progressive style: a high line, a side that presses to win the ball back early, and builds from the back with patience'; }
    else if (poss >= 0.55 && direct <= 0.45) { label = 'possession-based'; tags = ['possession']; text = 'a possession game: short passing, patience and a lot of the ball'; }
    else if (press >= 0.65) { label = 'high-pressing'; tags = ['press']; text = 'a high-intensity pressing game that wins the ball high and turns it quickly into chances'; }
    else if (counter >= 0.55 || (poss <= 0.45 && direct >= 0.5)) { label = 'counter-attacking'; tags = ['counter']; text = 'a compact, counter-attacking approach: a solid shape out of the ball and quick, direct moves when it is won'; }
    else if (direct >= 0.62) { label = 'direct'; tags = ['direct']; text = 'a direct style: the ball forward early, long passes and second balls'; }
    else { label = 'pragmatic'; tags = ['balanced']; text = 'a pragmatic, balanced approach that adapts to the opponent'; }
    return { label, text, tags, poss, ppm: Math.round(ppm), press, line, direct, tempo };
  };
  // Two offers after a dismissal: one from a club the style appeals to (often a better side, whatever the results were), one from a club around the level he has been working at.
  FM.jobOffers = function (lg) {
    const st = FM.managerStyle(lg), me = FM.teamById(lg, lg.userId), mine = (FM.allDivisions(lg).find((d) => d.teams.indexOf(me) >= 0) || {}).level || lg.divisionLevel || 1;
    const rng = FM.mulberry32(lg.seed + (lg.runSeed || 0) + lg.season * 31337 + 7), pick = (arr) => arr[Math.floor(rng() * arr.length)];
    const all = []; FM.allDivisions(lg).forEach((d) => d.teams.forEach((t) => { if (t.id !== me.id) all.push({ t, level: d.level, name: d.name }); }));
    const fits = (x) => st.tags.indexOf(x.t.style || 'balanced') >= 0;
    const out = [];
    const better = all.filter((x) => (x.level < mine || (x.level === mine && (x.t.strength || 0) > (me.strength || 0))) && fits(x));
    const o1 = better.length ? pick(better.sort((a, b) => (b.t.strength || 0) - (a.t.strength || 0)).slice(0, 4)) : null;
    if (o1) out.push({ club: o1.t.name, division: o1.name, up: o1.level < mine, reason: o1.t.name + ' liked what they saw: ' + st.text + '. They play that way themselves and want a manager who already does, and they are willing to look past the results at ' + me.name + '.' });
    const level = all.filter((x) => x.level === mine && Math.abs((x.t.strength || 0) - (me.strength || 0)) <= 1.2 && (!o1 || x.t.id !== o1.t.id));
    const o2 = level.length ? pick(level) : null;
    if (o2) out.push({ club: o2.t.name, division: o2.name, up: false, reason: fits(o2) ? o2.t.name + ' are at about the level you were working at, and ' + st.text + ' is what they want to play.' : o2.t.name + ' are at about the level you were working at. They need a manager and think a spell at ' + me.name + ' has taught you what this division asks of a side.' });
    if (!out.length) { const pool = all.filter((x) => x.level === mine), any = pool.length ? pick(pool) : pick(all); if (any) out.push({ club: any.t.name, division: any.name, up: false, reason: any.t.name + ' are looking for a manager and have been told you can be one.' }); }
    return out;
  };

  // ---------- the money behind the squad ----------
  // The transfer budget the recruitment pages use is the cash the club has: a signing is paid for out of it.
  FM.bizSyncBudget = function (lg) {
    if (lg.mp && lg.mp.kind === 'match') return;
    const t = FM.transfer ? FM.transfer(lg) : null; if (!t) return;
    const b = FM.biz(lg), bd = b.board || {};
    // The board does not hand over the whole bank balance: it keeps a reserve back and releases a share of what is above it (a saved game from before this has no policy, so
    // everything is released, as it always was).
    const pool = Math.max(0, b.cash - (bd.reserve || 0)), pct = bd.pct != null ? bd.pct : 100;
    const pf = Math.min(Math.max(0, b.prizeFund || 0), pool);   // cup prize money is released in full, not at the board's usual share
    t.budget[lg.userId] = Math.max(0, Math.round(((pool - pf) * pct / 100 + pf) / 1e5) / 10 - (t.wageShift || 0) * (FM.SHIFT_RATE || 0.1));   // £m, to one decimal, less what has been moved into the wage budget
  };
  // Called by the transfer code when a player moves between clubs.
  // A payment plan: the fee is paid in parts (the first now), and the whole plan costs a little more than paying at once. parts is [[share, matchdays from now], ...].
  FM.PAY_PLANS = {
    now: { label: 'All at once', premium: 0, parts: [[1, 0]] },
    two: { label: 'Two payments: half now, half in 14 matchdays', premium: 0.03, parts: [[0.5, 0], [0.5, 14]] },
    three: { label: 'Three payments: a third now, then every 14 matchdays', premium: 0.07, parts: [[1 / 3, 0], [1 / 3, 14], [1 / 3, 28]] },
    four: { label: 'Four payments: a quarter now, then every 14 matchdays', premium: 0.11, parts: [[0.25, 0], [0.25, 14], [0.25, 28], [0.25, 42]] },
  };
  FM.bizTransfer = function (lg, p, from, to, fee, wage, years, planId) {
    if (lg.mp && lg.mp.kind === 'match') return;
    const b = FM.biz(lg), me = lg.userId, plan = FM.PAY_PLANS[planId] || FM.PAY_PLANS.now, total = Math.round(fee * (1 + plan.premium) * 1e6), played = b.ledger.length;
    const first = Math.round(total * plan.parts[0][0]);
    if (to && to.id === me) {
      b.cash -= first; b.pending.fees += first; b.prizeFund = Math.max(0, (b.prizeFund || 0) - first);
      b.signings.push({ pid: p.id, name: p.name, season: lg.season, round: lg.fixtures.filter((f) => f.played && (f.homeId === me || f.awayId === me)).length, fee: total, wage: wage != null ? wage : FM.wageOf(p), years: years || 3, book: total, from: from ? from.name : '', plan: planId || 'now' });
      plan.parts.slice(1).forEach(([share, after], i) => { b.payables.push({ id: 'P' + (b.seq++), pid: p.id, name: p.name, amount: Math.round(total * share), due: played + after, to: from ? from.name : '' }); });
    } else if (from && from.id === me) {
      const s = b.signings.find((x) => x.pid === p.id && !x.sold), book = s ? s.book : 0;
      b.cash += first; b.pending.sales += first; b.pending.saleProfit += total - book;
      plan.parts.slice(1).forEach(([share, after]) => { b.receivables.push({ id: 'R' + (b.seq++), pid: p.id, name: p.name, amount: Math.round(total * share), due: played + after, from: to ? to.name : '', buyerId: to ? to.id : null }); });
      if (s) s.sold = { fee: total, season: lg.season };
    }
    FM.bizSyncBudget(lg);
  };
  // What is owed for players, and what is owed to the club, falls due as matchdays are played.
  function settlePlans(lg, b) {
    const played = b.ledger.length, t = FM.transfer ? FM.transfer(lg) : null;
    b.payables = b.payables.filter((x) => { if (x.due > played) return true; b.cash -= x.amount; b.pending.fees += x.amount; return false; });
    b.receivables = b.receivables.filter((x) => {
      if (x.due > played) return true;
      const bk = t && t.backing && x.buyerId ? t.backing[x.buyerId] : null, risk = bk ? (bk.kind === 'debt' ? 0.1 : bk.kind === 'tight' ? 0.04 : 0.005) : 0.01;
      const roll = FM.mulberry32((lg.seed || 1) + (lg.runSeed || 0) + hashStr(x.id) + played * 977)();
      if (roll < risk) { b.pending.saleProfit -= x.amount; if (FM.pushNews) FM.pushNews(lg, { round: played - 1, day: lg.day, kind: 'Transfer', headline: x.from + ' fail to pay the instalment for ' + x.name, body: 'The payment of ' + gbp(x.amount) + ' due from ' + x.from + ' for ' + x.name + ' has not arrived, and the club has had to write it off.', mine: true }); return false; }
      b.cash += x.amount; b.pending.sales += x.amount; return false;
    });
  }
  const hashStr = (s) => { let h = 0; for (let i = 0; i < String(s).length; i++) h = (h * 31 + String(s).charCodeAt(i)) | 0; return Math.abs(h); };
  // A new season: the figures reset, the cash, loans, sponsors and the squad's book values carry on.
  const baseNewSeason = function (lg) {
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
    const bd = FM.bonds ? FM.bonds.balance(lg) : { value: 0, cost: 0, realised: 0 }, bonds = Math.round(bd.value);
    const payables = Math.round((b.payables || []).reduce((a, x) => a + x.amount, 0)), receivables = Math.round((b.receivables || []).reduce((a, x) => a + x.amount, 0));
    const retained2 = retained + Math.round(bd.value - bd.cost + bd.realised);   // gains and losses on bonds, held and sold
    const assets = stadium + players + cash + bonds + receivables, liabilities = overdraft + loans + payables, equity = capital + premium + retained2;
    return { stadium, players, cash, overdraft, loans, capital, premium, retained: retained2, bonds, payables, receivables, assets, liabilities, equity, balanced: Math.abs(assets - liabilities - equity) <= 60 };
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
      const pend = firstForecast ? b.pending : { sales: 0, loans: 0, shares: 0, fees: 0, capex: 0, invest: 0, divest: 0 }; firstForecast = false;
      const inflow = Object.assign({}, l.inflow, { sales: pend.sales, loans: pend.loans, shares: pend.shares, divest: pend.divest || 0 }), outflow = Object.assign({}, l.outflow, { fees: pend.fees, capex: pend.capex || 0, invest: pend.invest || 0, tax: 0, dividends: 0 });
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

  // ---------- the board's money: what it says, what it releases, what it can be asked for ----------
  FM.bizBoardInfo = function (lg) {
    const b = FM.biz(lg), bd = b.board, loans = b.loans.reduce((a, l) => a + l.balance, 0), pool = Math.max(0, b.cash - (bd.reserve || 0));
    const t = FM.transfer ? FM.transfer(lg) : null;
    return { b, bd, ban: bd.ban && !bd.ban.lifted ? bd.ban : null, kind: bd.kind, label: (FM.BOARD_KINDS[bd.kind] || {}).label || 'Steady backing', owner: bd.owner, cash: b.cash, loans, reserve: bd.reserve || 0, pct: bd.pct, pool, released: t ? (t.budget[lg.userId] || 0) * 1e6 : pool * bd.pct / 100, legacy: !!bd.legacy, approval: b.approvalFin };
  };
  // Asking the board for more money for transfers. What it gives depends on who is behind the club and on how much the shareholders trust the manager with money
  // (the financial approval); a refusal costs a little of that trust. Money from the owners goes into the books as new equity.
  FM.bizBoardRate = function (lg) {
    const b = FM.biz(lg), bd = b.board, a = b.approvalFin;
    return bd.kind === 'mega' ? (a >= 40 ? 0.9 : 0.6) : bd.kind === 'takeover' ? (a >= 50 ? 0.7 : 0.4) : bd.kind === 'steady' ? (a >= 55 ? 0.35 : 0.1) : bd.kind === 'ban' ? (a >= 60 ? 0.2 : 0) : bd.kind === 'tight' ? (a >= 70 ? 0.15 : 0) : bd.kind === 'loans' ? (a >= 75 ? 0.1 : 0) : 0;
  };
  // Appealing a transfer ban: it can be lifted for the winter window if the league is persuaded, which depends on the shareholders' trust; a failed appeal costs some of it.
  FM.bizBoardAppeal = function (lg) {
    const b = FM.biz(lg), bd = b.board; if (!bd.ban || bd.ban.lifted) return { ok: false, text: 'There is no transfer ban to appeal.' };
    if (bd.ban.appealed) return { ok: false, text: 'The ban has already been appealed once this season.' };
    bd.ban.appealed = true;
    const rng = FM.mulberry32((lg.seed || 1) + (lg.runSeed || 0) * 911 + 977), chance = b.approvalFin >= 60 ? 0.5 : b.approvalFin >= 45 ? 0.3 : 0.15;
    if (rng() < chance) { bd.ban.untilRound = Math.min(bd.ban.untilRound, 6); return { ok: true, won: true, text: 'The appeal succeeds in part: the ban now ends with the summer window, so you can buy in the winter window.' }; }
    b.approvalFin = Math.max(0, b.approvalFin - 3);
    return { ok: true, won: false, text: 'The appeal is turned down and the shareholders are unhappy about the legal bill. The ban stands.' };
  };
  FM.bizBoardRequest = function (lg, amount) {
    const b = FM.biz(lg), bd = b.board; amount = Math.max(0, Math.round(Number(amount) / 1e5) * 1e5);
    if (!amount) return { ok: true, granted: 0, text: 'You ask for nothing, and the board is glad of it.' };
    const rate = FM.bizBoardRate(lg);
    const granted = Math.round(amount * rate / 1e5) * 1e5;
    if (granted <= 0) { b.approvalFin = Math.max(0, b.approvalFin - 2); return { ok: true, granted: 0, text: 'The board refuses: the money is not there, or it does not yet trust the club with more. Your standing with the shareholders drops a little.' }; }
    b.cash += granted; b.equity.premium += granted; b.pending.shares += granted; bd.history.push({ season: lg.season, kind: 'grant', amount: granted });
    if (granted < amount) b.approvalFin = Math.max(0, b.approvalFin - 1);
    FM.bizSyncBudget(lg);
    return { ok: true, granted, text: granted >= amount ? 'The board agrees to the whole ' + gbp(granted) + ', paid in by the owners.' : 'The board will find ' + gbp(granted) + ' of the ' + gbp(amount) + ' you asked for, paid in by the owners.' };
  };
  // The transfer policy told to the board: it sets how much of the cash above the reserve is released, and the shareholders react to it.
  FM.BOARD_POLICIES = { ambitious: { label: 'Ambitious: spend what we can', dpct: 10, dapp: -2 }, balanced: { label: 'Balanced: spend what we sell and a bit more', dpct: 0, dapp: 0 }, prudent: { label: 'Prudent: build up cash first', dpct: -15, dapp: 2 } };
  FM.bizBoardPolicy = function (lg, policy) {
    const b = FM.biz(lg), bd = b.board, P = FM.BOARD_POLICIES[policy]; if (!P || bd.legacy) return { ok: false, text: 'The board has not set a policy in this saved game.' };
    const K = FM.BOARD_KINDS[bd.kind], newPct = Math.max(15, Math.min(95, K.pct + P.dpct));
    bd.policy = policy; bd.pct = newPct; b.approvalFin = Math.max(0, Math.min(100, b.approvalFin + P.dapp));
    FM.bizSyncBudget(lg);
    return { ok: true, pct: newPct, text: 'The board now releases ' + newPct + '% of the cash above its reserve for transfers.' };
  };
  // The start of a new season: the owners' funding for the year follows who is behind the club and how the finances were looked after, and now and then a takeover happens.
  FM.bizNewSeason = function (lg) {
    baseNewSeason(lg);
    const b = FM.biz(lg), bd = b.board; if (bd.legacy || lg.mp) return null;
    const rng = FM.mulberry32((lg.seed || 1) + (lg.runSeed || 0) * 911 + lg.season * 7727 + 5), base = LVL_BASE[lg.divisionLevel || 1] || LVL_BASE[1], round = (v) => Math.round(v / 1e5) * 1e5;
    const put = (amount) => { b.cash += amount; b.equity.premium += amount; b.pending.shares += amount; };
    let notice = null;
    if (bd.kind === 'loans' && lg.season > 1) { bd.kind = 'steady'; bd.pct = 60; bd.reserve = Math.round(1500000 * base / LVL_BASE[1] / 1e5) * 1e5; notice = { title: 'The freeze on the bank balance is lifted', lines: ['The owners are satisfied that the club has stayed within its means. The bank balance is no longer frozen: the board now keeps ' + gbp(bd.reserve) + ' back and releases ' + bd.pct + '% of the rest for transfers.'] }; }
    else if (bd.ban && lg.season > 1) { delete bd.ban; notice = { title: 'The transfer ban is over', lines: ['The league has lifted the transfer ban: the club can buy players again in both windows.'] }; }
    else if (bd.kind === 'debt' && lg.season > 1 && b.approvalFin >= 60 && b.loans.reduce((a, l) => a + l.balance, 0) < base) { bd.kind = 'tight'; bd.pct = 40; bd.reserve = Math.round(1000000 * base / LVL_BASE[1] / 1e5) * 1e5; notice = { title: 'The worst of the debt is behind us', lines: ['The loans are down to a level the bank is comfortable with. The club is still short of money, but no longer in danger: the board now releases ' + bd.pct + '% of the cash above its reserve for transfers.'] }; }
    else if (bd.kind === 'mega' && lg.season > 1 && b.approvalFin >= 40) { const g = Math.round(base * 1.5 / 1e5) * 1e5; put(g); bd.history.push({ season: lg.season, kind: 'grant', amount: g }); notice = { title: 'The owners top up the club', lines: [bd.owner.charAt(0).toUpperCase() + bd.owner.slice(1) + ' have paid a further ' + gbp(g) + ' into the club for the new season. They expect a title challenge.'] }; }
    else if (bd.kind !== 'takeover' && bd.kind !== 'mega' && bd.kind !== 'debt' && lg.season > 1 && rng() < (b.approvalFin >= 60 ? 0.14 : 0.08)) {
      const owner = OWNERS[Math.floor(rng() * OWNERS.length)], amount = round(base * 0.8);
      bd.kind = 'takeover'; bd.owner = owner; bd.pct = FM.BOARD_POLICIES[bd.policy] ? Math.max(15, Math.min(95, 90 + FM.BOARD_POLICIES[bd.policy].dpct)) : 90; bd.reserve = Math.round(1500000 * base / LVL_BASE[1] / 1e5) * 1e5;
      put(amount); bd.history.push({ season: lg.season, kind: 'takeover', amount, owner });
      notice = { title: 'The club has been taken over', lines: ['A takeover has been agreed: ' + owner + ' now own the club, and have put ' + gbp(amount) + ' into the bank.', 'The board now releases ' + bd.pct + '% of the cash above its ' + gbp(bd.reserve) + ' reserve for transfers. The new owners will expect results for their money.'] };
      if (FM.pushNews) FM.pushNews(lg, { round: -1, day: 0, kind: 'Club', headline: owner.charAt(0).toUpperCase() + owner.slice(1) + ' take over the club', body: 'A takeover has been completed and ' + gbp(amount) + ' of new money has been invested. The board has raised the transfer budget.', mine: true });
    } else {
      const grant = bd.kind === 'takeover' ? (b.approvalFin >= 45 ? round(base * 0.3) : 0) : bd.kind === 'steady' ? (b.approvalFin >= 55 ? round(base * 0.1) : 0) : 0;
      if (grant) { put(grant); bd.history.push({ season: lg.season, kind: 'grant', amount: grant }); notice = { title: 'The owners\' funding for the season', lines: ['The owners have paid ' + gbp(grant) + ' into the club for the new season, because the finances have been looked after.'] }; }
      else if (bd.kind === 'tight' || bd.kind === 'debt') notice = { title: bd.kind === 'debt' ? 'The debt is still weighing on the club' : 'Money is still tight', lines: ['The owners have put nothing new in. The transfer budget is only what the club has earned and kept, and the board still releases ' + bd.pct + '% of it.'] };
    }
    if (notice) { bd.notice = notice; bd.briefSeen = false; if (FM.boardFeature && !(bd.kind === 'takeover' && notice.title === 'The club has been taken over')) { try { FM.boardFeature(lg, 'notice', notice); } catch (e) { /* the news is a nicety */ } } }
    FM.bizSyncBudget(lg);
    return notice;
  };

})();
