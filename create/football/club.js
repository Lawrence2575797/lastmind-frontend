// The club as a business. Ashford Rovers is a public limited company: the shareholders (the board) have a view on how the club is run on the
// pitch and in the accounts, and the manager runs both. Ticket prices go to a market that answers like a real one, the money in and out is kept
// in the books in the way a company keeps it, and every signing, loan and sponsor shows up there. Nothing here explains the ideas: it just
// behaves the way the real thing does, and the numbers are in the books to be read.
(function () {
  const FM = (window.FM = window.FM || {});
  const ROUNDS = 14;              // a season is fourteen matchdays, a week each
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const r2 = (v) => Math.round(v * 100) / 100;

  // ---------- the four stands: who sits where, how many seats, and how that kind of fan answers a price ----------
  // base is the crowd that would come at the usual price on an ordinary Saturday; e is how sharply it shrinks as the price rises.
  FM.SEGMENTS = [
    { id: 'family', name: 'Family stand', who: 'Parents and children', seats: 2600, ref: 18, base: 2500, e: 1.15 },
    { id: 'general', name: 'General admission', who: 'The regular supporters', seats: 6000, ref: 28, base: 6300, e: 0.85 },
    { id: 'safe', name: 'Safe standing', who: 'Students and under-25s', seats: 2400, ref: 12, base: 2100, e: 1.8 },
    { id: 'premium', name: 'Premium and hospitality', who: 'Companies and their guests', seats: 500, ref: 95, base: 430, e: 0.45 },
  ];
  const CAPACITY = FM.SEGMENTS.reduce((a, s) => a + s.seats, 0);
  const COMPANIES = [
    ['Halden Mutual', 'insurance'], ['Pennine Pasties', 'food'], ['Brightwater Energy', 'energy'], ['Kestrel Telecom', 'telecoms'], ['Vantage Motors', 'cars'],
    ['Thornbury Building Society', 'banking'], ['Marlow & Finch Solicitors', 'law'], ['Ironbridge Steel Supplies', 'steel'], ['Loxley Logistics', 'haulage'], ['Fernhill Dairy', 'dairy'],
    ['Quill Print & Design', 'printing'], ['Sable Coffee Roasters', 'coffee'], ['Northgate Tyres', 'tyres'], ['Orchard Estate Agents', 'property'], ['Pulse Fitness Clubs', 'gyms'],
    ['Cobalt Cloud Services', 'software'], ['Greywell Brewery', 'brewing'], ['Ashmoor Plumbing', 'plumbing'],
  ];
  const BOARDS = 8;
  const LOAN_OPTIONS = [{ term: 14, rate: 0.06 }, { term: 28, rate: 0.075 }, { term: 42, rate: 0.09 }];   // terms in matchdays; rates are per season
  const OVERDRAFT = { limit: 500000, rate: 0.14, penalty: 0.3 };
  const TAX = 0.25;
  const PROFIT_TARGET = 400000;

  // ---------- formatting ----------
  const gbp = (n) => { const v = Math.round(n); return v < 0 ? '(£' + Math.abs(v).toLocaleString('en-GB') + ')' : '£' + v.toLocaleString('en-GB'); };
  const num = (n) => Math.round(n).toLocaleString('en-GB');
  FM.gbp = gbp;

  // ---------- the company's state ----------
  function init(lg) {
    const me = lg.userId, t = FM.transfer ? FM.transfer(lg) : null;
    const opening = t && Number.isFinite(t.budget[me]) && lg.fixtures.some((f) => f.played) ? Math.max(2000000, Math.round(t.budget[me] * 1e6)) : 8000000;
    const segs = {}; FM.SEGMENTS.forEach((s) => { segs[s.id] = { price: s.ref }; });
    return {
      v: 1, cash: opening, lastClose: opening, season: lg.season, prices: segs, marketing: 0,
      sponsors: [{ id: 'sp1', kind: 'Shirt sponsor', company: 'Halden Mutual', perRound: 34000, left: 28 }],
      boards: [{ id: 'ad1', company: 'Fernhill Dairy', perRound: 3200, left: 14 }, { id: 'ad2', company: 'Northgate Tyres', perRound: 2800, left: 14 }, { id: 'ad3', company: 'Quill Print & Design', perRound: 2400, left: 14 }],
      offers: [], loans: [], shares: { issued: 1000000, price: 10 }, ledger: [], signings: [], seasons: [], pending: { fees: 0, sales: 0, loans: 0, shares: 0, saleProfit: 0, dep: 0 },
      approvalFin: 55, lastShare: 10, seq: 1,
    };
  }
  FM.biz = function (lg) {
    if (!lg.biz || lg.biz.v !== 1) lg.biz = init(lg);
    return lg.biz;
  };

  // ---------- the market for tickets ----------
  const userPos = (lg) => { try { return FM.tableRows(lg).findIndex((r) => r.id === lg.userId) + 1; } catch (e) { return 4; } };
  const formPoints = (lg) => {
    const me = lg.userId, played = lg.fixtures.filter((f) => f.played && (f.homeId === me || f.awayId === me)).sort((a, b) => b.round - a.round).slice(0, 5);
    if (!played.length) return 7.5 * 0.6;
    const pts = played.reduce((a, f) => { const mine = f.homeId === me ? f.hg : f.ag, theirs = f.homeId === me ? f.ag : f.hg; return a + (mine > theirs ? 3 : mine === theirs ? 1 : 0); }, 0);
    return pts * 5 / played.length;
  };
  // What makes this match more or less attractive, apart from the price (kept separate so the forecast can use a neutral version of it).
  function appeal(lg, fx, neutral) {
    const b = FM.biz(lg), me = lg.userId;
    const opp = fx ? FM.teamById(lg, fx.homeId === me ? fx.awayId : fx.homeId) : null;
    const form = neutral ? 1 : 0.9 + 0.017 * formPoints(lg);
    const oppF = opp ? 0.9 + 0.09 * clamp((opp.strength || 0) + 0.5, 0, 1.5) : 1;
    const derby = fx && FM.derbyForFixture && FM.derbyForFixture(lg, fx) ? 1.28 : 1;
    const pos = 1.06 - 0.018 * (userPos(lg) - 1);
    const promo = 1 + 0.1 * Math.log(1 + (b.marketing || 0) / 5000);
    return form * oppF * derby * pos * promo;
  }
  // The crowd for one match at the prices set: per stand, how many wanted to come, how many got in, how many were turned away.
  FM.bizDemand = function (lg, fx, opts) {
    const b = FM.biz(lg), o = opts || {};
    const noise = o.neutral ? 1 : 0.96 + 0.08 * FM.mulberry32(lg.seed + (lg.runSeed || 0) + (fx ? fx.round : 0) * 977 + lg.season * 31)();
    const mult = appeal(lg, fx, !!o.neutral) * noise;
    const rows = {}, wanted = {};
    FM.SEGMENTS.forEach((s) => {
      const price = clamp((b.prices[s.id] || { price: s.ref }).price, 3, 400);
      // demand falls with price, and falls away altogether when a price is far beyond what that kind of fan would ever pay
      wanted[s.id] = s.base * Math.pow(price / s.ref, -s.e) * mult / (1 + Math.pow(price / (s.ref * 2.4), 4));
    });
    // fans who cannot get into a full stand look at the general stand instead, if there is room
    let spill = 0;
    FM.SEGMENTS.forEach((s) => { if (s.id !== 'general' && wanted[s.id] > s.seats) spill += 0.25 * (wanted[s.id] - s.seats); });
    FM.SEGMENTS.forEach((s) => {
      const want = wanted[s.id] + (s.id === 'general' ? spill : 0), sold = Math.min(s.seats, Math.round(want));
      rows[s.id] = { price: clamp((b.prices[s.id] || { price: s.ref }).price, 3, 400), seats: s.seats, wanted: Math.round(want), sold, away: Math.max(0, Math.round(want) - s.seats), revenue: sold * clamp((b.prices[s.id] || { price: s.ref }).price, 3, 400) };
    });
    const total = FM.SEGMENTS.reduce((a, s) => a + rows[s.id].sold, 0), tickets = FM.SEGMENTS.reduce((a, s) => a + rows[s.id].revenue, 0);
    return { rows, total, tickets, capacity: CAPACITY, turnedAway: FM.SEGMENTS.reduce((a, s) => a + rows[s.id].away, 0) };
  };

  // ---------- one matchday's money ----------
  const MERCH_COST = 0.55, SPEND_PER_HEAD = 5.5, RUN_PER_HEAD = 2.4, RUN_FIXED = 14000, ADMIN = 135000, BROADCAST = { 1: 64000, 2: 38000 };
  const wageBill = (lg) => FM.teamById(lg, lg.userId).squad.reduce((a, p) => a + FM.wageOf(p), 0) * 1000;   // £ a week
  const loanBalance = (b) => b.loans.reduce((a, l) => a + l.balance, 0);
  const depPerRound = (b) => b.signings.reduce((a, s) => a + (s.book > 0 ? Math.min(s.book, s.fee / (s.years * ROUNDS)) : 0), 0);

  // The lines for one round: home or away. `est` uses the neutral forecast; otherwise the real draw.
  function lines(lg, fx, home, est) {
    const b = FM.biz(lg), d = home ? FM.bizDemand(lg, fx, { neutral: !!est }) : null;
    const att = d ? d.total : 0;
    const pos = userPos(lg), lastAtt = (b.ledger.filter((e) => e.home).slice(-1)[0] || {}).attTotal || 7000;
    const merch = 7000 + 0.9 * (att || lastAtt) + 1400 * Math.max(0, 8 - pos);
    const inflow = {
      tickets: d ? d.tickets : 0,
      matchday: att * SPEND_PER_HEAD,
      broadcast: BROADCAST[lg.divisionLevel || 1] * (1 + 0.025 * Math.max(0, 8 - pos)),
      sponsor: b.sponsors.filter((s) => s.left > 0).reduce((a, s) => a + s.perRound, 0),
      advert: b.boards.filter((s) => s.left > 0).reduce((a, s) => a + s.perRound, 0),
      merch,
    };
    const od = b.cash < 0 ? -b.cash : 0, odRate = od > OVERDRAFT.limit ? OVERDRAFT.penalty : OVERDRAFT.rate;
    const interestLoans = b.loans.reduce((a, l) => a + l.balance * l.rate / ROUNDS, 0), interestOd = od * odRate / ROUNDS;
    const outflow = {
      wages: wageBill(lg), matchday: home ? RUN_FIXED + RUN_PER_HEAD * att : 0, marketing: b.marketing || 0, admin: ADMIN, merchCost: merch * MERCH_COST,
      loanPay: b.loans.reduce((a, l) => a + Math.min(l.balance, l.perRound), 0), interest: interestLoans + interestOd,
    };
    return { att, d, inflow, outflow };
  }
  const sum = (o) => Object.keys(o).reduce((a, k) => a + (o[k] || 0), 0);

  // Called once the user's match of a round has been played (and the rest of the round is done).
  FM.bizAfterRound = function (lg, fx) {
    if (!fx || lg.mp) return;
    const b = FM.biz(lg), me = lg.userId, home = fx.homeId === me, opp = FM.teamById(lg, home ? fx.awayId : fx.homeId);
    const l = lines(lg, fx, home, false), p = b.pending;
    const opening = b.lastClose;
    const dep = depPerRound(b) + p.dep;
    // the books for the round
    const inflow = Object.assign({}, l.inflow, { sales: p.sales, loans: p.loans, shares: p.shares });
    const outflow = Object.assign({}, l.outflow, { fees: p.fees, tax: 0 });
    // tax is paid on the season's profit at the end of the season
    const seasonRows = b.ledger.filter((e) => e.season === lg.season);
    const revenue = l.inflow.tickets + l.inflow.matchday + l.inflow.broadcast + l.inflow.sponsor + l.inflow.advert + l.inflow.merch;
    const cos = l.outflow.matchday + l.outflow.merchCost;
    const gross = revenue - cos;
    const expenses = l.outflow.wages + l.outflow.marketing + l.outflow.admin + dep;
    const op = gross - expenses + p.saleProfit;
    const pbt = op - l.outflow.interest;
    let tax = 0;
    if (fx.round === ROUNDS - 1) {
      const toDate = seasonRows.reduce((a, e) => a + e.pl.pbt, 0) + pbt;
      tax = Math.max(0, toDate) * TAX; outflow.tax = tax;
    }
    const net = pbt - tax;
    // the cash moves
    const cashIn = sum(inflow), cashOut = sum(outflow);
    // cash already holds the money moved between matchdays (signings, loans, shares); add this matchday's trading
    const trading = (cashIn - p.sales - p.loans - p.shares) - (cashOut - p.fees);
    b.cash = Math.round(b.cash + trading);
    // loans: the repayments come off the balances
    b.loans.forEach((ln) => { const pay = Math.min(ln.balance, ln.perRound); ln.balance = Math.round(ln.balance - pay); });
    b.loans = b.loans.filter((ln) => ln.balance > 0);
    b.sponsors.forEach((s) => { s.left -= 1; }); b.boards.forEach((s) => { s.left -= 1; });
    b.sponsors = b.sponsors.filter((s) => s.left > 0); b.boards = b.boards.filter((s) => s.left > 0);
    const entry = {
      season: lg.season, round: fx.round + 1, home, opp: opp ? opp.name : '', attTotal: l.att, att: l.d ? Object.keys(l.d.rows).reduce((o, k) => { o[k] = l.d.rows[k].sold; return o; }, {}) : null, away: l.d ? l.d.turnedAway : 0,
      prices: l.d ? Object.keys(l.d.rows).reduce((o, k) => { o[k] = l.d.rows[k].price; return o; }, {}) : null,
      inflow, outflow, opening, closing: b.cash, dep,
      pl: { revenue, cos, gross, expenses, saleProfit: p.saleProfit, op, interest: l.outflow.interest, pbt, tax, net },
    };
    b.ledger.push(entry);
    b.lastClose = b.cash;
    b.pending = { fees: 0, sales: 0, loans: 0, shares: 0, saleProfit: 0, dep: 0 };
    // the signings lose their book value as the years go by
    b.signings.forEach((s) => { if (s.book > 0) s.book = Math.max(0, Math.round(s.book - s.fee / (s.years * ROUNDS))); });
    updateApproval(lg, b);
    offersAfterRound(lg, b, fx);
    FM.bizSyncBudget(lg);
    if (fx.round === ROUNDS - 1) b.seasons.push({ season: lg.season, revenue: seasonSum(b, lg.season, 'revenue'), net: seasonSum(b, lg.season, 'net'), close: b.cash });
    financeNews(lg, b, entry);
  };
  function seasonSum(b, season, key) { return b.ledger.filter((e) => e.season === season).reduce((a, e) => a + e.pl[key], 0); }
  FM.bizSeasonSum = (lg, key) => seasonSum(FM.biz(lg), lg.season, key);

  // ---------- what the shareholders think ----------
  function updateApproval(lg, b) {
    const rows = b.ledger.filter((e) => e.season === lg.season), played = rows.length;
    const profit = rows.reduce((a, e) => a + e.pl.net + e.pl.tax, 0);   // before tax: what they look at during the season
    const expected = PROFIT_TARGET * played / ROUNDS, score = Math.tanh((profit - expected) / (PROFIT_TARGET + 250000)) * 24;
    const cash = b.cash < 0 ? (b.cash < -OVERDRAFT.limit ? -26 : -14) : b.cash < 500000 ? -5 : b.cash > 2500000 ? 4 : 0;
    const annual = Math.max(1, rows.reduce((a, e) => a + e.pl.revenue, 0) * ROUNDS / Math.max(1, played));
    const debt = loanBalance(b) / annual, debtPen = debt > 0.8 ? -10 : debt > 0.4 ? -4 : 0;
    const target = clamp(55 + score + cash + debtPen, 5, 95);
    b.approvalFin = clamp(Math.round((b.approvalFin + (target - b.approvalFin) * 0.3) * 10) / 10, 0, 100);
    const foot = Number.isFinite(lg.boardApproval) ? lg.boardApproval : 50;
    b.shares.price = r2(clamp(6 + 8 * (0.55 * b.approvalFin + 0.45 * foot) / 100, 3, 16));
  }
  FM.bizApprovals = (lg) => { const b = FM.biz(lg); return { financial: b.approvalFin, football: Number.isFinite(lg.boardApproval) ? lg.boardApproval : 50, share: b.shares.price, prevShare: b.lastShare }; };

  // ---------- the money behind the squad ----------
  // The transfer budget the recruitment pages use is the cash the club has: a signing is paid for out of it.
  FM.bizSyncBudget = function (lg) {
    if (lg.mp) return;
    const t = FM.transfer ? FM.transfer(lg) : null; if (!t) return;
    const b = FM.biz(lg);
    t.budget[lg.userId] = Math.round(Math.max(0, b.cash) / 1e5) / 10;   // £m, to one decimal
  };
  // Called by the transfer code when a player moves between clubs.
  FM.bizTransfer = function (lg, p, from, to, fee, wage, years) {
    if (lg.mp) return;
    const b = FM.biz(lg), me = lg.userId, pay = Math.round(fee * 1e6);
    if (to && to.id === me) {
      b.cash -= pay; b.pending.fees += pay;
      b.signings.push({ pid: p.id, name: p.name, season: lg.season, round: lg.fixtures.filter((f) => f.played && (f.homeId === me || f.awayId === me)).length, fee: pay, wage: wage != null ? wage : FM.wageOf(p), years: years || 3, book: pay, from: from ? from.name : '' });
    } else if (from && from.id === me) {
      const s = b.signings.find((x) => x.pid === p.id && !x.sold), book = s ? s.book : 0;
      b.cash += pay; b.pending.sales += pay; b.pending.saleProfit += pay - book;
      if (s) { s.sold = { fee: pay, season: lg.season }; b.pending.dep += 0; }
    }
    FM.bizSyncBudget(lg);
  };
  // A new season: the figures reset, the cash, loans, sponsors and the squad's book values carry on.
  FM.bizNewSeason = function (lg) {
    if (lg.mp || !lg.biz) return;
    const b = FM.biz(lg); b.season = lg.season; b.lastShare = b.shares.price;
    b.sponsors = b.sponsors.filter((s) => s.left > 0); b.boards = b.boards.filter((s) => s.left > 0);
    FM.bizSyncBudget(lg);
  };

  // ---------- money from outside ----------
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
      b.shares.issued += add; b.cash += amount; b.pending.shares += amount;
      b.approvalFin = clamp(b.approvalFin - dilution * 90, 0, 100);
      FM.bizSyncBudget(lg); return { ok: true, add, dilution, price };
    },
    repayLoan(lg, id) {
      const b = FM.biz(lg), l = b.loans.find((x) => x.id === id); if (!l || b.cash < l.balance) return { ok: false };
      b.cash -= l.balance; b.pending.loans -= l.balance; l.balance = 0; b.loans = b.loans.filter((x) => x.balance > 0); FM.bizSyncBudget(lg); return { ok: true };
    },
  };

  // ---------- sponsors and advertisers: they come to you, in the news ----------
  function offersAfterRound(lg, b, fx) {
    const rng = FM.mulberry32(lg.seed + (lg.runSeed || 0) + lg.season * 7919 + fx.round * 104729 + 3);
    b.offers.forEach((o) => { if (o.status === 'open' && o.expires < fx.round + 1) o.status = 'expired'; });
    const used = new Set(b.sponsors.concat(b.boards).map((s) => s.company).concat(b.offers.filter((o) => o.status === 'open').map((o) => o.company)));
    const pickCo = () => { const free = COMPANIES.filter((c) => !used.has(c[0])); const c = free[Math.floor(rng() * free.length)] || COMPANIES[0]; used.add(c[0]); return c; };
    const me = FM.teamById(lg, lg.userId), pos = userPos(lg), avgAtt = b.ledger.filter((e) => e.home).slice(-3).reduce((a, e) => a + e.attTotal, 0) / Math.max(1, b.ledger.filter((e) => e.home).slice(-3).length) || 8000;
    const push = (o, headline, body) => {
      o.id = 'O' + (b.seq++); o.status = 'open'; o.expires = fx.round + 4; b.offers.push(o);
      FM.pushNews(lg, { round: fx.round, day: lg.day, kind: 'Commercial', headline, body, club: lg.userId, mine: true, offer: o.id });
    };
    // an advertising board
    if (b.boards.length + b.offers.filter((o) => o.status === 'open' && o.kind === 'board').length < BOARDS && rng() < 0.55) {
      const c = pickCo(), perRound = Math.round((1800 + avgAtt * 0.35 + rng() * 1400 + Math.max(0, 8 - pos) * 120) / 100) * 100, rounds = [7, 14, 14, 28][Math.floor(rng() * 4)];
      push({ kind: 'board', company: c[0], perRound, rounds }, `${c[0]} want a place on the advertising boards`, `${c[0]}, a local ${c[1]} firm, have asked for an advertising board at ${me.name}'s ground for the next ${rounds} matchdays. They are offering ${gbp(perRound)} a matchday, ${gbp(perRound * rounds)} in all. The offer stands for a few weeks; see the Board page or accept it here.`);
    }
    // a shirt sponsor, when the present deal is nearly over
    const shirt = b.sponsors.find((s) => s.kind === 'Shirt sponsor');
    if ((!shirt || shirt.left <= 3) && !b.offers.some((o) => o.status === 'open' && o.kind === 'shirt') && rng() < 0.8) {
      const c = pickCo(), perRound = Math.round((26000 + rng() * 22000 + Math.max(0, 8 - pos) * 1600) / 500) * 500, rounds = [14, 28][Math.floor(rng() * 2)];
      push({ kind: 'shirt', company: c[0], perRound, rounds }, `${c[0]} offer to put their name on the shirts`, `${c[0]} (${c[1]}) would like to be the shirt sponsor for the next ${rounds} matchdays at ${gbp(perRound)} a matchday, ${gbp(perRound * rounds)} over the deal.`);
    }
    // a sleeve sponsor, now and then
    if (!b.sponsors.some((s) => s.kind === 'Sleeve sponsor') && !b.offers.some((o) => o.status === 'open' && o.kind === 'sleeve') && rng() < 0.18) {
      const c = pickCo(), perRound = Math.round((7000 + rng() * 6000) / 500) * 500, rounds = 14;
      push({ kind: 'sleeve', company: c[0], perRound, rounds }, `${c[0]} want the sleeve`, `${c[0]} (${c[1]}) are offering ${gbp(perRound)} a matchday for the sleeve sponsorship for the next ${rounds} matchdays.`);
    }
    b.offers = b.offers.filter((o) => o.status === 'open' || fx.round - o.expires < 4).slice(-24);
  }
  FM.bizOffer = function (lg, id, accept) {
    const b = FM.biz(lg), o = b.offers.find((x) => x.id === id && x.status === 'open'); if (!o) return false;
    o.status = accept ? 'accepted' : 'declined';
    if (accept) {
      if (o.kind === 'board') b.boards.push({ id: 'ad' + (b.seq++), company: o.company, perRound: o.perRound, left: o.rounds });
      else if (o.kind === 'shirt') { b.sponsors = b.sponsors.filter((s) => s.kind !== 'Shirt sponsor'); b.sponsors.push({ id: 'sp' + (b.seq++), kind: 'Shirt sponsor', company: o.company, perRound: o.perRound, left: o.rounds }); }
      else b.sponsors.push({ id: 'sp' + (b.seq++), kind: 'Sleeve sponsor', company: o.company, perRound: o.perRound, left: o.rounds });
    }
    return true;
  };
  FM.bizOfferText = (o) => ({ board: 'Advertising board', shirt: 'Shirt sponsor', sleeve: 'Sleeve sponsor' }[o.kind] + ': ' + gbp(o.perRound) + ' a matchday for ' + o.rounds + ' matchdays');

  // ---------- the shareholders write to the manager ----------
  function financeNews(lg, b, e) {
    const round = e.round - 1, push = (headline, body) => FM.pushNews(lg, { round: round, day: lg.day, kind: 'Board', headline, body, club: lg.userId, mine: true });
    if (b.cash < 0 && !(b.flags && b.flags.od === lg.season + ':' + e.round)) {
      b.flags = Object.assign({}, b.flags, { od: lg.season + ':' + e.round });
      push(b.cash < -OVERDRAFT.limit ? 'The bank has stopped the club spending' : 'The club is in its overdraft', b.cash < -OVERDRAFT.limit ? `The club is ${gbp(-b.cash)} overdrawn, past the ${gbp(OVERDRAFT.limit)} the bank agreed. The shareholders want it sorted before anything else.` : `The bank balance has gone below zero: the club is ${gbp(-b.cash)} overdrawn and paying interest on it.`);
    }
    if (e.round === ROUNDS) {
      const net = seasonSum(b, lg.season, 'net') + seasonSum(b, lg.season, 'tax') - seasonSum(b, lg.season, 'tax');
      push(net >= PROFIT_TARGET ? 'A profitable season, say the accounts' : net >= 0 ? 'A small profit for the year' : 'The club has made a loss this year', `The annual accounts show a profit for the year of ${gbp(seasonSum(b, lg.season, 'net'))} on revenue of ${gbp(seasonSum(b, lg.season, 'revenue'))}. Cash in the bank stands at ${gbp(b.cash)}.`);
    }
  }

  // ---------- the forecast for the rest of the season ----------
  // For each matchday of this season: what actually happened, or what the books would show at today's prices, wages and deals.
  FM.bizCashFlow = function (lg) {
    const b = FM.biz(lg), me = lg.userId, season = lg.season;
    const done = {}; b.ledger.filter((e) => e.season === season).forEach((e) => { done[e.round] = e; });
    const mine = lg.fixtures.filter((f) => f.homeId === me || f.awayId === me).sort((a, b2) => a.round - b2.round);
    const cols = []; let cash = b.lastClose, firstForecast = true;
    const live = JSON.parse(JSON.stringify({ sp: b.sponsors, bo: b.boards, ln: b.loans }));
    for (let r = 1; r <= ROUNDS; r++) {
      if (done[r]) { cols.push({ round: r, actual: true, inflow: done[r].inflow, outflow: done[r].outflow, opening: done[r].opening, closing: done[r].closing }); continue; }
      const fx = mine.find((f) => f.round === r - 1); if (!fx) continue;
      const home = fx.homeId === me;
      // a forecast uses what is signed now and runs it forward
      const saveSp = b.sponsors, saveBo = b.boards, saveLn = b.loans, saveCash = b.cash;
      b.sponsors = live.sp.map((s) => Object.assign({}, s, { left: s.left - (r - 1 - Object.keys(done).length) })); b.boards = live.bo.map((s) => Object.assign({}, s, { left: s.left - (r - 1 - Object.keys(done).length) }));
      b.loans = live.ln.map((l) => Object.assign({}, l)); b.cash = Math.min(cash, saveCash);
      const l = lines(lg, fx, home, true);
      b.sponsors = saveSp; b.boards = saveBo; b.loans = saveLn; b.cash = saveCash;
      // what has been signed, sold or borrowed since the last matchday goes into the first matchday still to come
      const pend = firstForecast ? b.pending : { sales: 0, loans: 0, shares: 0, fees: 0 }; firstForecast = false;
      const inflow = Object.assign({}, l.inflow, { sales: pend.sales, loans: pend.loans, shares: pend.shares }), outflow = Object.assign({}, l.outflow, { fees: pend.fees, tax: 0 });
      if (r === ROUNDS) {
        const revenue = sum({ a: l.inflow.tickets, b: l.inflow.matchday, c: l.inflow.broadcast, d: l.inflow.sponsor, e: l.inflow.advert, f: l.inflow.merch });
        const toDate = b.ledger.filter((e) => e.season === season).reduce((a, e) => a + e.pl.pbt, 0) + revenue - (l.outflow.matchday + l.outflow.merchCost) - (l.outflow.wages + l.outflow.marketing + l.outflow.admin) - l.outflow.interest;
        outflow.tax = Math.max(0, toDate) * TAX;
      }
      const net = sum(inflow) - sum(outflow);
      const col = { round: r, actual: false, inflow, outflow, opening: cash, closing: cash + net };
      cash = col.closing; cols.push(col);
      // the loans run down in the forecast too
      live.ln.forEach((ln) => { ln.balance = Math.max(0, ln.balance - ln.perRound); });
    }
    return cols;
  };

  // ---------- a short account of the business, for the agent ----------
  FM.bizDigest = function (lg) {
    if (lg.mp || !lg.biz) return '';
    const b = FM.biz(lg), rows = b.ledger.filter((e) => e.season === lg.season);
    const ap = FM.bizApprovals(lg);
    const out = [];
    out.push(`The club's business: a public limited company. Cash ${gbp(b.cash)}, loans outstanding ${gbp(loanBalance(b))}, shareholder approval of the finances ${Math.round(ap.financial)}% and of the football ${Math.round(ap.football)}%, share price £${ap.share.toFixed(2)}.`);
    out.push('Ticket prices now: ' + FM.SEGMENTS.map((s) => `${s.name} £${b.prices[s.id].price}`).join(', ') + `. Marketing budget ${gbp(b.marketing || 0)} a matchday.`);
    if (rows.length) {
      const t = (k) => rows.reduce((a, e) => a + e.pl[k], 0), home = rows.filter((e) => e.home);
      out.push(`This season (${rows.length} matchdays): revenue ${gbp(t('revenue'))}, gross profit ${gbp(t('gross'))}, operating profit ${gbp(t('op'))}, profit for the year so far ${gbp(t('net'))}.`);
      home.slice(-4).forEach((e) => out.push(`Home v ${e.opp} (round ${e.round}): attendance ${num(e.attTotal)} of ${num(CAPACITY)}, ticket revenue ${gbp(e.inflow.tickets)}, turned away ${num(e.away)}; by stand ` + FM.SEGMENTS.map((s) => `${s.name} ${num(e.att[s.id])} at £${e.prices[s.id]}`).join(', ') + '.'));
    } else out.push('No matchday has been played yet this season, so there are no accounts yet.');
    if (b.signings.length) out.push('Signings: ' + b.signings.slice(-6).map((s) => `${s.name} cost ${gbp(s.fee)} (wage ${s.wage}k a week, ${s.years}-year contract)`).join('; ') + '.');
    out.push('Sponsors: ' + (b.sponsors.map((s) => `${s.company} ${gbp(s.perRound)} a matchday`).concat(b.boards.map((s) => `${s.company} (board) ${gbp(s.perRound)}`)).join('; ') || 'none') + '.');
    return out.join('\n');
  };
  FM.bizConst = { ROUNDS, CAPACITY, PROFIT_TARGET, OVERDRAFT, TAX, MERCH_COST, SPEND_PER_HEAD, RUN_PER_HEAD, RUN_FIXED, ADMIN };
  FM.bizInternals = { lines, loanBalance, depPerRound, userPos, wageBill, appeal, num, gbp, sum };
})();
