// The theory in each Board paper, read against the club's own numbers, and the grouping of each paper's decision by theory.
// For every paper: sections(m) is the theory laid out (what it says, what it means at this club, where it falls short), and groups says, for the
// decision's fields, which theory they follow and what Rafael would suggest. books_theory_b.js carries the second half of the papers and wires it all in.
(function () {
  const FM = (window.FM = window.FM || {});
  const T = (FM.booksTheory = FM.booksTheory || {});
  const gbp = (n) => FM.gbp(n), num = (n) => Math.round(n).toLocaleString('en-GB'), f1 = (n) => (Math.round(n * 10) / 10).toFixed(1), pc = (n) => f1(n) + '%';
  const ord = (n) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : n + 'th');

  // The club's season in the numbers the theories need.
  const club = (m) => {
    const lg = m.lg, b = m.b, K = m.K, f = m.f, rows = FM.bizCashFlow(lg) || [];
    const sum = (o, keys) => rows.reduce((a, r) => a + keys.reduce((x, k) => x + ((r[o] && r[o][k]) || 0), 0), 0);
    const rev = sum('inflow', ['advert', 'broadcast', 'matchday', 'merch', 'prize', 'sales', 'sponsor', 'tickets']);
    const cost = sum('outflow', ['admin', 'marketing', 'matchday', 'merchCost', 'wages', 'interest', 'fees']);
    let dep = 0; try { dep = FM.bizInternals.depPerRound(b) * K.ROUNDS; } catch (e) { dep = 0; }
    const wages = sum('outflow', ['wages']), bal = FM.bizBalance(lg), capEmp = bal.equity + bal.loans, profit = rev - cost - dep, tax = Math.max(0, profit) * K.TAX;
    const loanTotal = b.loans.reduce((a, l) => a + l.balance, 0), margin = f.revHead - f.varHead;
    const mktSeason = (b.marketing || 0) * K.ROUNDS;
    return { lg, b, K, f, rev, cost, wages, profit, tax, bal, capEmp, loanTotal, mktSeason, be: margin > 0 ? f.netFixed / margin : null, gear: capEmp > 0 ? 100 * bal.loans / capEmp : 0, roce: capEmp > 0 ? 100 * profit / capEmp : 0, nopat: profit - tax, home: K.ROUNDS / 2 };
  };
  T.club = club;
  const interest = (amount, term) => { const o = FM.bizSources.loanOptions.find((x) => x.term === term) || FM.bizSources.loanOptions[0]; return amount * o.rate * (o.term / 14) * 0.5; };
  const newShares = (amount, b) => amount / b.shares.price;
  const dilution = (amount, b) => 100 * newShares(amount, b) / (b.shares.issued + newShares(amount, b));

  // ---- 1. The stadium expansion ----
  T.expansion = {
    sections: (m) => {
      const c = club(m), r = m.best, g = (m.market.g * 100);
      const stand = r ? r.name.toLowerCase() : 'stand', loan = r ? interest(r.cost, 14) : 0;
      return [
        { title: 'Market size, growth and capacity', lines: [
          'The market is the total spending by everyone who might buy what we sell, and market share is our part of it: our sales divided by the market\'s sales. Local spending on live sport has grown from ' + gbp(m.market.last) + ' to ' + gbp(m.market.now) + ', which is growth of ' + pc(g) + ', and our matchday income of about ' + gbp(m.annual) + ' a season is ' + pc(100 * m.share) + ' of it.',
          'A growing market only helps a business that can serve it. Capacity utilisation is output as a share of the most the business can produce: we filled ' + pc(100 * m.util) + ' of our ' + num(c.f.cap) + ' seats, and ' + (m.turned > 0 ? 'on a typical match day about ' + num(m.turned) + ' people who want to come cannot. Those sales go to someone else, and the growth in the market goes with them.' : 'at present nobody is turned away, so more seats would stand empty. Growth in the market does not by itself justify a bigger ground.') ,
          'This is organic growth: expanding with our own resources rather than by buying or joining another club. It is slower and lower-risk than a merger, and the business keeps control, but it ties money into one asset.'] },
        { title: 'Investment appraisal: does it pay for itself?', lines: [
          'Spending on a stand is capital expenditure: money spent on assets that last, as opposed to revenue expenditure on the day-to-day. Before committing, the board asks three questions. The payback period is how long the extra income takes to repay the cost. The average rate of return is the average yearly profit from it as a percentage of what it cost. Net present value discounts each future year\'s income, because £1 in ten years is worth less than £1 now, and subtracts the cost.',
          r ? 'For the ' + stand + ': ' + num(r.seats) + ' seats cost ' + gbp(r.cost) + '. The seats we would actually fill are ' + num(r.extra) + ' (the fans turned away, if fewer than the new seats), bringing ' + gbp(r.yr) + ' a year after the cost of staging the match. Payback is ' + (r.pay ? f1(r.pay) + ' years' : 'never') + ', the average rate of return is ' + pc(r.arr) + ' a year, and the net present value over ten years at 8% is ' + gbp(r.npv) + '. A positive net present value means the stand beats the return the money would earn elsewhere.' : 'No stand has room for an extension, so the appraisal does not apply.',
          'These methods are only as good as their forecasts. The income assumes the fans keep coming and the market keeps growing, and a few bad seasons would turn a positive net present value negative. That is why a sales forecast should be tested against a pessimistic case before the cheque is signed.'] },
        { title: 'Choosing finance: risk and reward', lines: [
          'A loan has to be repaid with interest whatever happens. At ' + c.gear.toFixed(0) + '% the club\'s gearing (loans as a share of capital employed) is low, so we have room to borrow. ' + (r ? 'A loan of ' + gbp(r.cost) + ' over 14 matchdays would cost about ' + gbp(loan) + ' in interest, and would put gearing at about ' + pc(100 * (c.bal.loans + r.cost) / (c.capEmp + r.cost)) + '.' : ''),
          'A share issue costs nothing to repay and carries no interest, but it dilutes the owners: ' + (r ? 'raising ' + gbp(r.cost) + ' at the share price of £' + m.b.shares.price + ' means ' + num(newShares(r.cost, m.b)) + ' new shares, so the existing shareholders\' stake falls by ' + pc(dilution(r.cost, m.b)) + ', and the new ones are entitled to a share of the dividend.' : '') + ' Paying out of cash is the cheapest of all but leaves the club with less to meet a bad month.',
          'The choice is between risk and reward: a loan multiplies the owners\' return if the stand fills and multiplies their loss if it does not. Gearing is high when borrowing is large compared with the capital that the owners put in.'] },
      ];
    },
    groups: {
      stand: (m) => { const r = m.best; return { title: 'Investment appraisal: which stand', text: ['Each stand has its own cost for a seat, its own ticket price and its own number of fans waiting, so each has a different payback.', r ? 'On the figures above the ' + r.name.toLowerCase() + ' has the best net present value, at ' + gbp(r.npv) + '.' : 'No stand can be extended at the moment.'], suggest: r ? 'The ' + r.name.toLowerCase() + ', because it pays back in ' + (r.pay ? f1(r.pay) + ' years' : 'no time') + '. A stand whose net present value is negative is a poor use of the money, however full the ground is.' : 'Wait: there is nothing to build.' }; },
      finance: (m) => { const c = club(m), r = m.best; return { title: 'Choosing finance: risk and reward', text: ['Cash costs nothing but leaves less in the bank. A loan costs interest and raises gearing, which makes the owners\' return larger but riskier. Shares cost no interest but dilute the owners.', 'Gearing is ' + c.gear.toFixed(0) + '% now' + (r ? '; a loan for the whole cost would take it to ' + pc(100 * (c.bal.loans + r.cost) / (c.capEmp + r.cost)) + '.' : '.')], suggest: c.bal.cash > (r ? r.cost * 3 : 1) ? 'We hold ' + gbp(c.bal.cash) + ' and the stand costs a small part of it, so paying half from cash and borrowing half keeps both a cushion and a low gearing.' : 'Cash is limited, so a loan over the shorter term costs the least interest while keeping gearing manageable.' }; },
      price: (m) => ({ title: 'Pricing the new seats', text: ['A higher price earns more from every fan but fills fewer seats, and how many fewer depends on the elasticity of demand in that stand. A price above today\'s may leave the new seats empty.', 'The family and safe-standing stands are elastic (a price rise loses more in fans than it gains in price); general admission and hospitality are inelastic.'], suggest: 'Keep the new seats at today\'s price for the first season, so they fill, then review. A rise of 5% in an inelastic stand is safe.' }),
    },
  };

  // ---- 2. Pricing the gate ----
  const SEGTXT = {
    family: ['Parents and children', 'They compare us with other days out for the family, so there are many substitutes and they are sensitive to price.'],
    general: ['The regular supporters', 'They come every week and have few alternatives on a Saturday, so they respond only a little to price.'],
    safe: ['Students and under-25s', 'They have little spare money and will go to the pub instead, so a small change in price moves them a lot.'],
    premium: ['Companies and their guests', 'The company pays and the guest is the attraction, so the price matters little to them.'],
  };
  const demandRows = (m) => { try { const fx = FM.nextUserFixture(m.lg), d = FM.bizDemand(m.lg, fx); return d.rows; } catch (e) { return null; } };
  T.pricing = {
    sections: (m) => {
      const rows = demandRows(m), c = club(m);
      const seg = (s) => s.name + ': a price of £' + m.b.prices[s.id].price + ', elasticity ' + s.e.toFixed(2) + (s.e > 1 ? ' (elastic)' : ' (inelastic)') + (rows ? ', about ' + num(rows[s.id].sold) + ' of ' + num(rows[s.id].seats) + ' seats sold' : '');
      const g = FM.SEGMENTS.find((s) => s.id === 'general'), gp = m.b.prices.general.price, up = 10, fall = g.e * up, newRev = 100 * ((1 + up / 100) * (1 - fall / 100) - 1);
      return [
        { title: 'Demand and what moves it', lines: [
          'Demand is how many tickets people will buy at each price. It slopes down: a higher price, fewer buyers. Other things can move the whole curve: the incomes of local people, the quality and standing of the team, the weather, what else is on, and the price of substitutes and complements. Substitutes are goods that replace each other (a night at the cinema); complements are bought together (a programme and a pie are bought because we have a match).',
          'Our fans do not behave alike, which is why we have four prices. ' + FM.SEGMENTS.map(seg).join('. ') + '.'] },
        { title: 'Price elasticity of demand', lines: [
          'Price elasticity is the percentage change in the quantity demanded divided by the percentage change in price. If it is above 1 in size demand is elastic: a 10% price cut brings more than 10% more buyers and total revenue rises. If it is below 1 demand is inelastic: a 10% rise loses fewer than 10% of buyers and revenue rises.',
          'Take ' + g.name.toLowerCase() + ' at £' + gp + ' with elasticity ' + g.e.toFixed(2) + '. A rise of ' + up + '% to £' + (Math.round(gp * 1.1 * 100) / 100) + ' loses about ' + f1(fall) + '% of the buyers, and revenue changes by about ' + (newRev >= 0 ? '+' : '') + f1(newRev) + '%. In the safe-standing stand, with elasticity ' + FM.SEGMENTS.find((s) => s.id === 'safe').e.toFixed(1) + ', the same rise would lose about ' + f1(FM.SEGMENTS.find((s) => s.id === 'safe').e * up) + '% of the buyers and revenue would fall.',
          'What decides elasticity: how many substitutes there are, how big a part of income the price is, whether it is a necessity or a luxury, and how long people have to adjust. A loyal fan buying a season ticket has no real substitute; a student choosing between us and the cinema does. Income elasticity is different: it measures how demand changes when incomes change, and for a day out it is positive: when incomes fall, so does attendance.'] },
        { title: 'Pricing strategies', lines: [
          'Price discrimination is charging different customers different prices for the same thing; here it works because the segments are separate (nobody can buy a family seat and sell it on to a company). Competitive pricing follows what rivals charge. Cost-plus adds a margin to cost: each fan costs us about ' + gbp(c.f.varHead) + ' to host and the ground costs ' + gbp(c.f.fixedMatch) + ' a match to open, so spread over ' + num(c.f.att) + ' fans the cost of a seat is about £' + f1(c.f.fixedMatch / Math.max(1, c.f.att) + c.f.varHead) + ' and our average ticket is £' + f1(c.f.avgTicket) + '.',
          'Penetration pricing starts low to win customers and can be raised later; price skimming starts high with the most eager buyers and falls; psychological pricing uses £9.99-type endings. A club that is full does not need penetration; a club with empty seats does.'] },
      ];
    },
    groups: Object.assign({}, ...Object.keys(SEGTXT).map((id) => ({ ['p_' + id]: (m) => { const s = FM.SEGMENTS.find((x) => x.id === id), rows = demandRows(m), r = rows && rows[id], full = r ? r.sold >= r.seats : false, p = m.b.prices[id].price; return { title: s.name + ': ' + SEGTXT[id][0].toLowerCase(), text: [SEGTXT[id][1], 'Elasticity is ' + s.e.toFixed(2) + ', so demand is ' + (s.e > 1 ? 'elastic: cutting the price brings in more money, raising it loses more than it gains' : 'inelastic: raising the price brings in more money, cutting it loses revenue') + '.' + (r ? ' ' + num(r.sold) + ' of ' + num(r.seats) + ' seats are sold at £' + p + (r.away > 0 ? ', and ' + num(r.away) + ' fans are turned away.' : '.') : '')], suggest: s.e > 1 ? (full ? 'This stand is full, so a rise of 5% is safe; in any case I would not push it past 10%.' : 'Cut by 5 to 10% to fill the empty seats: the extra fans also spend about £' + f1(m.K.SPEND_PER_HEAD) + ' each in the ground.') : (full ? 'A rise of 5 to 10% is the right direction: demand is inelastic and the stand is full.' : 'Hold the price: cutting it loses revenue and there are no fans waiting.') }; } }))),
  };

  // ---- 3. The marketing campaign ----
  T.marketing = {
    sections: (m) => {
      const c = club(m), b = m.b, K = m.K, lift = 100 * 0.1 * Math.log(1 + (b.marketing || 0) / 5000);
      const at = (x) => 100 * 0.1 * Math.log(1 + x / 5000);
      return [
        { title: 'The marketing mix', lines: [
          'The marketing mix is the four decisions that put a product in front of customers: product, price, promotion and place. For the club: the product is a match in a famous ground, with the identity of the town\'s only top-flight side behind it, and that is our unique selling point. Price is the four ticket prices. Promotion is everything in the budget below. Place is where and how supporters can buy: at the gate, online, and the club shop.',
          'The mix has to be integrated. A family promotion at £14 while the posters promise a premium night out sends two messages. Marketing also depends on the product\'s position in its life cycle (introduction, growth, maturity, decline) and, for a business with several products, on the Boston matrix. For us, matchday tickets are a mature cash cow: high market share, in a market growing at about ' + pc(100 * m.market.g) + '. The shirt range is a star, growing, and the hospitality boxes are a question mark: ' + num(m.b.seats.premium) + ' seats that are not yet reliably full.'] },
        { title: 'The promotional mix and what it does', lines: [
          'Promotion is a mix too: advertising (boards, posters, radio), sales promotion (a discount, a family day), public relations (the manager on the local news), digital marketing and social media, and personal selling to companies who buy boxes. Each reaches a different part of the market.',
          'Our budget is ' + gbp(b.marketing || 0) + ' a matchday, so ' + gbp(c.mktSeason) + ' over the season. It lifts demand by ' + pc(lift) + ' now, but with diminishing returns: ' + gbp(10000) + ' a matchday lifts demand by ' + pc(at(10000)) + ', ' + gbp(20000) + ' by ' + pc(at(20000)) + ' and ' + gbp(40000) + ' by only ' + pc(at(40000)) + '. The second ' + gbp(10000) + ' buys less than the first, and the third less again. Past a point the money is better spent elsewhere.'] },
        { title: 'Whether the spending is worth it', lines: [
          'The test of any marketing spend is the return on it: the extra income it brings against what it costs. Each extra fan is worth about £' + f1(c.f.revHead) + ' to the club (ticket and matchday spending, net of the cost of having them there). We average ' + num(c.f.att) + ' a match against ' + num(c.f.cap) + ' seats, so there are ' + num(Math.max(0, c.f.cap - c.f.att)) + ' empty seats a match to fill. Once the ground is full, the only gain from more marketing is that the stand queue gets longer, which is when it is the turn of price.',
          'This is a marketing strategy: a choice about where to compete and how. Selling more of the same product to the same fans is market penetration (the Ansoff matrix, which the strategy paper takes further). A sales promotion, such as a family-stand discount, brings people who have not tried the product and gains from them spending in the ground.'] },
      ];
    },
    groups: {
      budget: (m) => { const c = club(m), at = (x) => 100 * 0.1 * Math.log(1 + x / 5000), empty = Math.max(0, c.f.cap - c.f.att); return { title: 'The promotional mix: how much to spend', text: ['The budget works with diminishing returns: ' + gbp(10000) + ' a matchday lifts demand by ' + pc(at(10000)) + ' and ' + gbp(30000) + ' by only ' + pc(at(30000)) + '.', 'There are ' + num(empty) + ' empty seats a match on average. ' + (empty < 500 ? 'The ground is nearly full, so more marketing has little room to work.' : 'That is the room marketing has to work in.')], suggest: empty < 500 ? 'Hold the budget low, around £5,000: the ground is nearly full and money is better spent on price.' : 'Around £10,000 a matchday: beyond it each extra £1,000 buys very little.' }; },
      family: (m) => ({ title: 'Sales promotion and the Boston matrix', text: ['A discount on the family stand is a sales promotion: it tempts people who have not tried the product. Families are price-sensitive (elasticity ' + FM.SEGMENTS.find((s) => s.id === 'family').e.toFixed(2) + '), and a family in the ground spends in the ground too.', 'The risk is lost income on the families who would have come anyway, and a price that is hard to put back.'], suggest: 'A cut of 10 to 15% for the first half of the season, if the stand is not full; leave it alone if it is.' }),
    },
  };

  // ---- 4. Raising the money ----
  T.finance = {
    sections: (m) => {
      const c = club(m), b = m.b;
      const amt = 500000, int14 = interest(amt, 14), int42 = interest(amt, 42);
      return [
        { title: 'Where finance comes from', lines: [
          'Internal sources of finance come from inside the business: retained profit, selling an asset, or cutting stock. External sources come from outside: a bank loan, an overdraft, trade credit from suppliers, a share issue, venture capital or crowd-funding. Which to use depends on three things: how much is needed and for how long, what it costs, and who ends up with control.',
          'We hold ' + gbp(c.bal.cash) + ' in cash and owe ' + gbp(c.loanTotal) + '. Our retained profit, built up over the years, is ' + gbp(c.bal.retained) + ', but retained profit is a claim on the club\'s assets, not cash in the bank. An overdraft (limit ' + gbp(m.K.OVERDRAFT.limit) + ' at ' + pc(100 * m.K.OVERDRAFT.rate) + ') is flexible but expensive, and meant for short-term gaps, not for building anything.'] },
        { title: 'A loan against a share issue', lines: [
          'A loan of ' + gbp(amt) + ' over 14 matchdays costs about ' + gbp(int14) + ' in interest, and over 42 matchdays about ' + gbp(int42) + ': a longer term has smaller repayments but costs more in total, and it carries a higher rate. The bank has first claim on the club\'s assets, whatever happens to the football.',
          'A share issue for the same ' + gbp(amt) + ' at £' + b.shares.price + ' a share creates ' + num(newShares(amt, b)) + ' shares and dilutes every existing holder by ' + pc(dilution(amt, b)) + '. Nothing has to be repaid, and there is no interest, but the new owners are entitled to a share of the profits as dividends and a say in decisions. The supporters\' trust, with 24% of the club, would need to buy part of it to keep its voice.',
          'The gearing ratio (loans over capital employed) sums up the balance: ' + pc(c.gear) + ' now. Lenders and investors read a high figure as a risk.'] },
        { title: 'The kind of company we are', lines: [
          'We are a public limited company, so we can sell shares to anyone, and the owners have limited liability: they can lose only what they paid in, not their houses. A sole trader has unlimited liability: the business and the person are one, and the debts can be paid from personal assets. A private limited company has limited liability but cannot sell shares to the public, so it is limited in how much it can raise. That is why a plc is the right form for a business that needs big sums.',
          'The price of this is that the owners lose control: decisions are subject to shareholders\' votes, and the accounts are published.'] },
      ];
    },
    groups: {
      amount: (m) => { const c = club(m); return { title: 'Choosing finance: how much', text: ['Borrow only what the project needs. Every pound raised costs something: interest on a loan, or a slice of the club on shares.', 'We hold ' + gbp(c.bal.cash) + ' in cash and the overdraft limit is ' + gbp(m.K.OVERDRAFT.limit) + '.'], suggest: 'Raise no more than ' + gbp(Math.max(100000, Math.round(c.bal.cash * 0.1 / 100000) * 100000)) + ': about a tenth of our cash, enough to cushion a bad month without paying interest on money that sits idle.' }; },
      source: (m) => { const c = club(m); return { title: 'Loan or shares: risk and control', text: ['A loan keeps ownership but must be repaid with interest. A share issue costs nothing to repay but dilutes the owners.', 'Gearing is ' + pc(c.gear) + ' now, so borrowing has room.'], suggest: c.gear < 25 ? 'Borrow: gearing is low, so a loan adds little risk, and it does not dilute the owners.' : 'Issue shares: gearing is high enough that more debt would worry lenders.' }; },
    },
  };

  // ---- 5. Budgets and cash flow ----
  T.cashflow = {
    sections: (m) => {
      const c = club(m), rows = FM.bizCashFlow(m.lg) || [], low = rows.reduce((a, r) => (r.closing < a.closing ? r : a), rows[0] || { closing: c.bal.cash, round: 1 });
      return [
        { title: 'Cash is not profit', lines: [
          'Profit is revenue minus costs over a period. Cash is what is actually in the bank on a given day. They differ because money moves at different times from the work it pays for: season tickets are paid in advance, wages are paid every week, a stand is paid for in one go but earns over years, and a dividend is cash out that is not a cost at all.',
          'That is why a profitable business can fail. A business fails when it cannot pay what it owes when it falls due, and that is liquidity: whether we can pay bills in the near term. Our forecast puts cash at ' + gbp(c.bal.cash) + ' now and its lowest point, ' + gbp(low.closing) + ', at matchday ' + low.round + ' of the season. We are not near the ' + gbp(m.K.OVERDRAFT.limit) + ' overdraft limit.'] },
        { title: 'Forecasts, budgets and variances', lines: [
          'A cash-flow forecast lays out what we expect to come in and go out each matchday: inflows (tickets, broadcast income, sponsors, merchandise) and outflows (wages of ' + gbp(c.wages / Math.max(1, rows.length)) + ' a matchday, matchday costs, marketing, admin, interest, dividends). A budget is a plan with a target for each: a revenue target, a cost limit for each department. A variance is the difference between budget and actual, which is favourable if income is above or costs are below the plan, adverse if not. A variance is a prompt to ask why, not a verdict.',
          'The forecast has weaknesses: it depends on guesses of crowds, results and prices, and it is worth running on the pessimistic side.'] },
        { title: 'Break-even', lines: [
          'The standing costs at a home match (wages, administration, interest, depreciation and running the ground) come to ' + gbp(c.f.fixedMatch) + ' whoever turns up, and broadcasting and sponsors cover ' + gbp(2 * c.f.other) + ' of it, leaving ' + gbp(c.f.netFixed) + ' to be met at the gate. Each fan adds ' + gbp(c.f.varHead) + ' in variable costs and brings ' + gbp(c.f.revHead) + ' in income, so each fan contributes ' + gbp(c.f.revHead - c.f.varHead) + '. Break-even output is fixed costs divided by contribution per unit: ' + (c.be ? num(c.be) + ' fans a home match' : 'not reached') + '. We average ' + num(c.f.att) + ', so the margin of safety (how far sales can fall before a loss) is ' + (c.be ? (c.f.att >= c.be ? num(c.f.att - c.be) + ' fans, ' + pc(100 * (c.f.att - c.be) / c.f.att) + ' of the crowd' : 'negative: we are ' + num(c.be - c.f.att) + ' fans short of break-even at a home match, so on the gate alone home matches lose money, and it is the prize money at the end of the season that makes the year profitable') : 'n/a') + '.',
          'Improving cash flow means changing the timing or the size: bring money in sooner (season tickets), delay payments, raise prices if demand is inelastic, cut costs, or borrow. Each costs something: a late payment loses supplier goodwill; a loan costs interest.'] },
      ];
    },
    groups: {
      budget: (m) => ({ title: 'Budgets: marketing', text: ['Marketing is a budgeted cost. Each £1,000 a matchday is ' + gbp(1000 * m.K.ROUNDS) + ' a season, taken from cash every matchday whether or not the fans come.', 'A cash-flow forecast should be run both with and without it.'], suggest: 'Keep marketing within about ' + pc(3) + ' of revenue. At today\'s forecast that is about ' + gbp(Math.round(club(m).rev * 0.03 / m.K.ROUNDS / 1000) * 1000) + ' a matchday.' }),
      dividend: (m) => { const c = club(m); return { title: 'Dividends: cash out that is not a cost', text: ['A dividend is paid out of profit after tax, but it leaves in cash. Paying 25% of a profit of ' + gbp(c.profit - c.tax) + ' means ' + gbp(0.25 * (c.profit - c.tax)) + ' leaves the bank, which is not available for wages or for a bad month.', 'The shareholders want it; liquidity wants it kept.'], suggest: c.bal.cash < 1500000 ? 'Cut it to 10%: cash is low enough that the club could be in difficulty if results go badly.' : 'Hold at 20 to 25%: cash is comfortable, so the shareholders can be rewarded.' }; },
      prices: (m) => ({ title: 'Improving cash flow: bring more in', text: ['A change in ticket price moves cash in every home match, immediately. Whether it helps depends on elasticity: a rise helps in the inelastic stands, and hurts in the elastic ones.'], suggest: 'A rise of 5% across the ground is a safe step if the ground is nearly full; if it is not, leave prices alone and raise income another way.' }),
    },
  };

  // ---- 6. Reading the accounts ----
  T.accounts = {
    sections: (m) => {
      const c = club(m), nm = c.rev ? 100 * (c.profit - c.tax) / c.rev : 0, gp = c.rev ? 100 * (c.rev - c.wages) / c.rev : 0, cur = c.bal.loans || 1;
      return [
        { title: 'The income statement and the statement of financial position', lines: [
          'The income statement covers a period. It starts with revenue (' + gbp(c.rev) + ' forecast for the season, including the prize money for the final league position), subtracts the cost of providing the goods and services to give gross profit, subtracts overheads and depreciation (the cost of the stadium wearing out, which is spread over its life although no cash leaves) to give operating profit, then interest and tax to give profit for the year. Dividends are then paid out of what is left, and the rest is retained.',
          'The statement of financial position (the balance sheet) is a snapshot on one day: what we own (the stadium ' + gbp(c.bal.stadium) + ', cash ' + gbp(c.bal.cash) + ', the players), what we owe (loans ' + gbp(c.bal.loans) + ', the overdraft), and what is left for the owners, which is equity of ' + gbp(c.bal.equity) + '. Assets minus liabilities equals equity: the two sides always balance.'] },
        { title: 'Ratios: profitability and return', lines: [
          'A figure on its own says little; ratios turn it into something to compare year on year and against other clubs. The gross profit margin is gross profit over revenue; the net profit margin is profit for the year over revenue; here, forecasting a profit after tax of ' + gbp(c.profit - c.tax) + ' on ' + gbp(c.rev) + ' gives a net margin of ' + pc(nm) + '. Return on capital employed is operating profit over capital employed (equity plus long-term loans): ' + gbp(c.profit) + ' over ' + gbp(c.capEmp) + ' is ' + pc(c.roce) + ', to be compared with what the money would earn in a bank.',
          'Our biggest cost is wages: ' + gbp(c.wages) + ' of the season\'s costs, or ' + pc(c.rev ? 100 * c.wages / c.rev : 0) + ' of revenue. That is typical, and it means the profit margin depends mostly on that one line.'] },
        { title: 'Ratios: liquidity, gearing and the limits', lines: [
          'The current ratio (current assets over current liabilities) and the acid test (the same without stock) measure whether we can meet short-term debts: ours is comfortable, because we have no short-term debt. The gearing ratio is ' + pc(c.gear) + '. Shareholder ratios, such as dividend per share, show what the owners get: ' + f1(0.25 * Math.max(0, c.profit - c.tax) / m.b.shares.issued * 100) + ' pence a share at a 25% payout.',
          'Ratios have limits: they look backwards, they depend on accounting choices (how fast the stadium is depreciated), a single season can mislead, and they ignore what the figures cannot show: the quality of the squad, the supporters\' mood. A good analyst compares across years, with rivals, and with what the club planned.'] },
      ];
    },
    groups: {
      budget: (m) => { const c = club(m); return { title: 'Improving profit: spend or save', text: ['Profit rises if revenue grows or costs fall. Spending on marketing is a cost today for revenue later, and its worth depends on the return.', 'Our net margin is about ' + pc(c.rev ? 100 * (c.profit - c.tax) / c.rev : 0) + ' and marketing is ' + pc(c.rev ? 100 * c.mktSeason / c.rev : 0) + ' of revenue.'], suggest: 'Hold marketing where it is unless the ground has empty seats: extra spending cuts the margin the quickest if it does not fill them.' }; },
      prices: (m) => ({ title: 'Improving profit: price', text: ['A rise in price lifts the margin directly, because it costs us nothing more to charge more, if the fans stay. In an inelastic stand they mostly do.'], suggest: 'A 5% rise lifts revenue in the inelastic stands, and the profit margin by more than that, because costs do not rise with it.' }),
    },
  };

  // ---- 7. Organising the club ----
  T.structure = {
    sections: (m) => {
      const c = club(m);
      return [
        { title: 'Hierarchy, chain of command and span of control', lines: [
          'An organisational structure shows who is in charge of whom. In a hierarchy there are several layers, a chain of command down which orders pass, and each manager has a span of control: the number of people reporting directly to them. A tall, narrow structure has many layers and narrow spans; a flat structure has few layers and wide spans.',
          'Ours runs from the board and the manager, to the assistant manager, to the coaches, to the players and the staff in the shop and the ground. A narrow span (two or three people to each manager) gives close control and slows decisions, and a wide span (six or more) is quick but each person gets less attention. A long chain of command also slows communication and distorts the message: by the time an instruction reaches the youth coach it can have changed.'] },
        { title: 'Centralised or decentralised', lines: [
          'A centralised structure keeps decisions at the top; a decentralised one passes them down. Delegating gives people authority to act for the business, and it motivates them (Herzberg\'s responsibility, Mayo\'s attention), and it frees the manager. It costs control: a coach left to decide may do something the manager would not have.',
          'In football, match-day tactics are the most centralised thing there is, because the whole outcome is at stake and the manager is accountable, but the training and development of players are quite naturally delegated. A good structure matches the type of decision: speed and expertise at the bottom, direction from the top.'] },
        { title: 'Culture and change', lines: [
          'Corporate culture is the way things are done: the habits and the values, whatever the chart says. A change in structure changes the culture, and people resist change when they are afraid of losing their position, do not understand the reason, or were not asked. Force-field analysis lists the forces for a change and the forces against it, and a change goes ahead when the first outweigh the second. The way to weaken the opposition is to explain it early and involve the people it affects.',
          'The people at the club are ' + num(FM.teamById(m.lg, m.lg.userId).squad.length) + ' players and a handful of coaches: small enough that a change is felt by everyone at once.'] },
      ];
    },
    groups: {
      decisions: () => ({ title: 'Centralised or decentralised decisions', text: ['If everything comes to the manager, tactics are consistent but he is a bottleneck, and the coaches have no responsibility. If the coaches decide for their own areas, they are motivated and quick, but they may pull in different directions.'], suggest: 'The manager decides tactics and team selection; the coaches decide training and development in their own areas. It keeps control where the blame lies and delegates where the expertise is.' }),
      span: () => ({ title: 'Span of control', text: ['A narrow span (2 or 3) gives each coach plenty of the assistant manager\'s time but needs more layers. A wide span (5 or 6) is flatter and faster, and the assistant manager is stretched.'], suggest: 'A span of 3 or 4 suits the number of coaches we have.' }),
      second: () => ({ title: 'Layers in the chain of command', text: ['A second assistant shortens the chain of command for the youth and reserve sides, so messages are less distorted. It adds a salary and another person to manage.'], suggest: 'Worth it only if the assistant manager has more than 4 coaches reporting to him.' }),
    },
  };
})();
