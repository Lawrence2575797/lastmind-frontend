// The theory in the second half of the Board papers (see books_theory.js), and the wiring that attaches all of it to the papers and their decision forms.
(function () {
  const FM = (window.FM = window.FM || {});
  const T = (FM.booksTheory = FM.booksTheory || {});
  const gbp = (n) => FM.gbp(n), num = (n) => Math.round(n).toLocaleString('en-GB'), f1 = (n) => (Math.round(n * 10) / 10).toFixed(1), pc = (n) => f1(n) + '%';
  const club = (m) => T.club(m);
  const ord = (n) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : n + 'th');
  const fac = (id) => FM.FACILITIES.find((f) => f.id === id) || { cost: 0, upkeep: 0 };
  const pos = (m) => { try { return FM.bizInternals.userPos(m.lg); } catch (e) { return 4; } };

  // ---- 8. The owners and the stakeholders ----
  T.owners = {
    sections: (m) => {
      const c = club(m), pat = Math.max(0, c.profit - c.tax), policy = (m.b.dividend && m.b.dividend.policy) || 0.25, div = pat * policy, perShare = 100 * div / m.b.shares.issued, lights = fac('lights');
      return [
        { title: 'Who has a stake', lines: [
          'A stakeholder is anyone affected by what the business does, or able to affect it. Shareholders own it and want a return. Employees (the squad and staff) want pay and security. Customers (supporters) want a good match at a fair price. Suppliers want to be paid on time. The local community wants jobs and a good neighbour on match days. Pressure groups, from the supporters\' trust to environmental campaigners, press for particular things. The government wants its tax and law kept.',
          'Stakeholder mapping places each one by power and interest: those with high power and high interest, such as the shareholders and the Supporters\' Trust (24% of the club), are managed closely; those with low power and high interest, like the town\'s residents, are kept informed. Their aims conflict, and no decision pleases everyone, so a business needs a way to choose.'] },
        { title: 'The shareholder view and the stakeholder view', lines: [
          'On the shareholder view the business exists to make profit for its owners, and everything else is a means to that. On the stakeholder view the business has duties to everyone it affects, and long-term success depends on keeping them all on side. The dividend shows the conflict: this year the profit after tax is forecast at ' + gbp(pat) + ', and at the present policy of ' + pc(policy * 100) + ' we would pay out ' + gbp(div) + ', or ' + f1(perShare) + ' pence on each of the ' + num(m.b.shares.issued) + ' shares. Every pound paid out is a pound not spent on the squad, the stands or the community.',
          'A mission statement and the corporate objectives are how the club decides: ours is to be a sustainable top-flight club, and the board has set the financial objective of at least ' + gbp(m.K.PROFIT_TARGET) + ' profit alongside a non-financial one of the league position. Short-termism, favouring this year\'s dividend over the next five years\' health, is the danger of leaning too far to the shareholder view.'] },
        { title: 'Ethics, responsibility and sustainability', lines: [
          'Business ethics is about doing what is right where the law does not say. Corporate social responsibility is a business taking responsibility for its effect on society and the environment, beyond its legal duties: cheap tickets for local schools, a community fund, an energy policy. It costs money now, and pays back in goodwill, a stronger brand and sometimes lower costs, which is why it is increasingly seen as part of the strategy and not charity.',
          'Our Green Pitch plan would cost ' + gbp(lights.cost) + ' for floodlights and a renewable energy contract, and ' + gbp(lights.upkeep || 0) + ' a matchday to run. It reduces the club\'s environmental impact and answers the environmental pressure on us, and it is a policy that can be reported to the shareholders and the community alike. Sustainability means meeting today\'s needs without damaging what later generations will need.'] },
      ];
    },
    groups: {
      dividend: (m) => { const c = club(m), pat = Math.max(0, c.profit - c.tax); return { title: 'Shareholders and the dividend', text: ['The dividend is the shareholders\' share of the profit. A bigger one pleases them; a smaller one keeps cash in the club to invest.', 'Each 5 points of payout is about ' + gbp(pat * 0.05) + ' a season, or ' + f1(100 * pat * 0.05 / m.b.shares.issued) + ' pence a share. The shareholders expect about ' + pc(m.K.EXPECTED_DIVIDEND * 100) + '.'], suggest: 'Pay 20%, about what they expect. A cut risks losing their approval (now ' + Math.round(FM.bizApprovals(m.lg).financial) + '%), and a rise takes cash from the stand or the squad.' }; },
      green: (m) => { const l = fac('lights'); return { title: 'Business ethics and sustainability', text: ['Green Pitch is a corporate-social-responsibility investment: it costs ' + gbp(l.cost) + ' and the benefit is in cleaner energy, a better name locally and lower running costs, not in an immediate profit.', 'The community and the Supporters\' Trust support it; short-term shareholders may not.'], suggest: 'Yes, if cash allows after the stand: it answers the environmental pressure on the club and counts towards the sustainability objective.' }; },
      community: (m) => { const c = club(m), pat = Math.max(0, c.profit - c.tax); return { title: 'The local community', text: ['A community fund sets aside part of the year\'s profit for the town: coaching in schools, cheap tickets for local groups. It is a cost for the shareholders and a gain for another stakeholder.', 'Each 1% is about ' + gbp(pat * 0.01) + ' this season.'], suggest: '2 to 3%: enough to be seen as a good neighbour without noticeably cutting the dividend.' }; },
    },
  };

  // ---- 9. Strategy ----
  T.strategy = {
    sections: (m) => {
      const c = club(m), empty = Math.max(0, c.f.cap - c.f.att), bud = 15000, extra = Math.min(empty, c.f.att * 0.1 * Math.log(1 + bud / 5000)), gain = extra * c.f.revHead * c.home, cost = bud * m.K.ROUNDS, ev = 0.6 * gain + 0.4 * 0.3 * gain - cost;
      return [
        { title: 'SWOT: where we stand', lines: [
          'A SWOT analysis sorts what we know into four boxes: strengths and weaknesses are inside the club; opportunities and threats are outside it. It is only useful if each point is specific and comes with numbers.',
          'Strengths: a loyal town, with ' + num(c.f.att) + ' coming to each home match (' + pc(100 * c.f.att / c.f.cap) + ' of the ground), and a ' + ord(pos(m)) + '-place side. Weaknesses: a ground of ' + num(c.f.cap) + ' seats with ' + (m.turned > 0 ? num(m.turned) + ' fans turned away at a typical match' : 'no queue of fans waiting') + ' and cash of ' + gbp(c.bal.cash) + ', not a great deal against richer rivals. Opportunities: a local market growing at ' + pc(100 * m.market.g) + ' a year. Threats: richer clubs buying our best players, and rising interest rates on borrowed money.'] },
        { title: 'Ansoff and Porter: the strategic choices', lines: [
          'The Ansoff matrix lays out four ways to grow: market penetration (more of the same product to the same customers: more marketing, a lower price), market development (the same product to new customers: away fans, a new town), product development (new products for existing customers: a fan zone, a new stand) and diversification (new products for new markets: an academy, an overseas shirt business). Risk rises as you move away from what you know, which is why penetration is the safest and diversification the riskiest.',
          'Porter says there are three ways to gain a competitive advantage: cost leadership (being the cheapest), differentiation (being different in a way customers value) and focus (serving one narrow segment well). We cannot be the cheapest club in the league, because richer clubs spend more, and our identity as the town\'s side is a real differentiator. A strategy that tries to do all three usually does none of them well.'] },
        { title: 'Decision trees and the limits of numbers', lines: [
          'A decision tree sets out the choices, the possible outcomes, the probability of each and what each is worth. Multiplying and adding gives the expected value. Suppose we raise marketing to ' + gbp(bud) + ' a matchday: it costs ' + gbp(cost) + ' over the season. If it works (we say 60%) it brings about ' + num(extra) + ' extra fans a match worth about ' + gbp(gain) + ' over the season; if it does not (40%), only 30% of that. The expected value is 0.6 × ' + gbp(gain) + ' + 0.4 × ' + gbp(0.3 * gain) + ' − ' + gbp(cost) + ' = ' + gbp(ev) + ', which is ' + (ev > 0 ? 'positive, so on these odds it is worth doing.' : 'negative, so on these odds it is not worth doing.'),
          'The weakness of such a tree is that the probabilities are guesses, and an unlikely disaster may matter more than the average. That is why a good strategy also has scenario planning (what if the best player leaves, what if results turn) and contingency plans: cut marketing before touching wages, sell the extra tickets in the existing stands if the new stand is late.'] },
      ];
    },
    groups: {
      ansoff: (m) => { const c = club(m); return { title: 'Ansoff: the direction', text: ['Penetration sells more of the same to the same fans: it is the safest and fits a ground that is not yet full. Product development adds something new for the same fans, such as a fan zone or screens, and it costs more.', 'At the moment ' + pc(100 * c.f.att / c.f.cap) + ' of the seats are filled' + (m.turned > 0 ? ', with fans turned away.' : '.')], suggest: m.turned > 0 ? 'Product development: the ground is already full, so more marketing buys nothing. Give the fans something to spend on.' : 'Market penetration: there are seats to fill, and it is the least risky way to do it.' }; },
      budget: (m) => ({ title: 'Penetration: how hard to push', text: ['Marketing is the tool of penetration. Its returns diminish, and its cost is certain while its result is not, which is why the tree above has an expected value, not a certainty.'], suggest: 'Keep it to £5,000 to £10,000 a matchday unless the ground has many empty seats: the decision tree for £15,000 does not pay for itself unless the campaign is very likely to work.' }),
      facility: (m) => ({ title: 'Product development: a new facility', text: ['A fan zone adds spending per head; big screens add to the matchday experience and carry advertising; a bigger shop lifts merchandise. Each is product development in the Ansoff matrix and each differentiates us from the other clubs in the league.', 'The fan zone costs ' + gbp(fac('fanzone').cost) + ', screens ' + gbp(fac('screens').cost) + ' and the shop ' + gbp(fac('shop').cost) + '.'], suggest: 'The fan zone: it works on every fan who comes, whether or not there is a queue.' }),
    },
  };

  // ---- 10. Growing the club ----
  T.growth = {
    sections: (m) => {
      const c = club(m), bw = m.annual * 0.55;
      return [
        { title: 'Organic and external growth', lines: [
          'Organic growth is growth from inside: more fans, a bigger stand, new products. External (inorganic) growth is joining with another business: a merger (two businesses agree to join as one), a takeover (one buys another, perhaps against its wishes), a joint venture (two share a project but stay separate), or franchising and licensing (another business uses our name for a fee).',
          'The approach from Brightwater Athletic is a merger. Their matchday income is about ' + gbp(bw) + ' a year, against our ' + gbp(m.annual) + ', so the combined club would have ' + gbp(m.annual + bw) + '.'] },
        { title: 'Economies and diseconomies of scale', lines: [
          'Economies of scale are the fall in cost per unit as a business gets bigger, through spreading fixed costs over more output, buying in bulk and sharing management. Two clubs could share a stadium, a ticket office and administration: the first saving we identified is a quarter of a £400,000 administration bill, or £100,000 a year. They also have to be set against the costs of the merger.',
          'Diseconomies of scale are the rise in cost per unit when a business gets too big: communication slows, motivation weakens, and coordination costs rise. Greiner\'s growth model says a growing business goes through phases of growth, each ending in a crisis that has to be solved to go on: creativity gives way to a crisis of leadership, direction to a crisis of autonomy, delegation to a crisis of control, and so on. Merging two clubs with two cultures could start such a crisis early.'] },
        { title: 'Reasons for staying small, and the supporters', lines: [
          'Some businesses stay small on purpose: to keep control, to keep close to customers, to keep the culture, or because the market is small. For a club the case is stronger than for most firms, because what supporters buy is identity. A merger with a neighbour could dilute the very thing that fills our ground.',
          'The Supporters\' Trust holds 24% and has a loud voice. Telling them in the press rather than first, is a way of turning an opportunity into a protest. A joint venture on youth football, where each club keeps its own name and ground, takes the economies of scale where costs are most shareable and leaves the identity alone.'] },
      ];
    },
    groups: {
      response: (m) => ({ title: 'Merger, joint venture or independence', text: ['A merger gives the largest economies of scale but the largest risk of a clash of cultures and of losing the supporters. A joint venture on youth football shares the cost of the academy and keeps both clubs independent. Declining is the safest and gives up the saving.'], suggest: 'The joint venture: it takes the saving where costs can be shared (youth coaching) and avoids the diseconomies and the supporter protest of a full merger.' }),
      share: () => ({ title: 'Joint venture: the split of cost', text: ['Our share of the cost in a joint academy should follow what we get out of it: more say if we pay more, more risk if we do.', 'A budget of £400,000 means each 10 points is £40,000.'], suggest: '50%: equal risk, equal say. Above that we are paying for the other club\'s players.' }),
      consult: () => ({ title: 'Stakeholders: the supporters\' trust', text: ['The Trust holds 24% and speaks for the supporters. Consulting first takes time and may mean changing the plan, but protests, a drop in attendance and a fall in the board\'s approval are what a surprise brings.'], suggest: 'Consult first: it costs a little time and protects the ground\'s identity.' }),
    },
  };

  // ---- 11. Match-day operations ----
  T.operations = {
    sections: (m) => {
      const c = club(m), cost = 0.55, hold = 4, price = 60, sold = 120, m1 = price * (1 - cost);
      return [
        { title: 'The match day as a production process', lines: [
          'Operations is how a business turns inputs into the things it sells. On a match day we provide a service (the match itself) and goods (shirts, food and drink, programmes) to about ' + num(c.f.att) + ' people in two hours. The process runs from the arrival of supplies the night before to the last supporter leaving the ground.',
          'The test of efficiency is productivity: output per unit of input. For the ground, that might be fans through the turnstiles per steward, or pies sold per hour per server. Lean production means cutting out waste of time, stock and effort while keeping quality.'] },
        { title: 'Stock control: holding too much, or too little', lines: [
          'The shop sells about ' + sold + ' shirts a home match, and holds 600: five home matches\' worth. Holding a shirt costs about £' + hold + ' a season (storage, insurance, tied-up money, the risk of a design going out of date), so 600 shirts cost £' + num(600 * hold) + '. Running out is more costly: each shirt we cannot sell loses a margin of about £' + num(m1) + ' (a £' + price + ' shirt costing ' + pc(cost * 100) + '). Just-in-time means ordering only what is about to be sold and holding almost nothing, which cuts the cost of stock but needs reliable suppliers, because one late delivery empties the shelves on a derby day.',
          'The best level is where the cost of the stock saved equals the cost of a lost sale. A club with predictable demand and a good supplier relationship can hold less. Procurement, the buying of supplies, and the relationship with suppliers matter for that reason.'] },
        { title: 'Quality and customer service', lines: [
          'Quality control checks the product at the end: is the shirt stitched properly? Quality assurance builds quality into the process so that mistakes do not happen: training, clear procedures, supplier standards. Customer service is part of quality: a fan who queues for twenty minutes for a pie, or is treated rudely by a steward, will not blame the match.',
          'Technology is part of the answer. Big screens and digital boards carry replays and advertising and keep fans in their seats at half time. A bigger shop (' + gbp(fac('shop').cost) + ') cuts queues and sells more, but it is a fixed cost that has to be earned back.'] },
      ];
    },
    groups: {
      stock: () => ({ title: 'Stock control: how much to hold', text: ['At 120 shirts a match and £4 a shirt to hold, each match\'s worth of stock costs about £480 a season to hold, while a shirt that is not there to be sold costs £27 in lost margin.', 'Five matches of stock is a lot for a product we can reorder.'], suggest: '3 matches\' worth: enough to cover a delivery that is late, and £960 a season less to hold than five.' }),
      shop: () => ({ title: 'Efficiency: a bigger shop', text: ['A bigger shop sells more per match and cuts the queues, so it improves both sales and the experience. It costs ' + gbp(fac('shop').cost) + ' and it adds to the running cost, so it must be earned back through extra sales.'], suggest: 'Yes if merchandise is one of the club\'s best-selling lines; it has the cleanest payback of the three facilities.' }),
      screens: () => ({ title: 'Technology in the ground', text: ['Big screens add to the match-day experience and carry advertising. They are also an investment in the product: the supporters\' view of the ground, not of the football.'], suggest: 'Later: they cost ' + gbp(fac('screens').cost) + ', and the shop or the fan zone earn more.' }),
      service: () => ({ title: 'Quality assurance: customer service', text: ['Training stewards and shop staff is quality assurance: it prevents the mistakes that quality control would only catch afterwards. It costs little and it is the nearest thing to a free improvement.'], suggest: 'Yes.' }),
    },
  };

  // ---- 12. The world outside the club ----
  T.environment = {
    sections: (m) => {
      const c = club(m), loan = c.loanTotal, plus2 = 0.02 * Math.max(loan, 1000000), pat = Math.max(0, c.profit - c.tax);
      return [
        { title: 'PESTLE: the forces we cannot control', lines: [
          'A PESTLE analysis sorts the outside forces into six: Political (what the government does), Economic (the state of the economy), Social (how people live and what they want), Technological, Legal and Environmental. Each can be an opportunity or a threat, and the club can respond to them but not change them.',
          'Economic is the one with numbers. Interest rates change what a loan costs: the loans on our books are ' + gbp(loan) + ' and each 2 points on a £1,000,000 loan is ' + gbp(plus2) + ' a year in extra interest. Inflation raises costs: wages, energy, supplies. Unemployment and economic growth change what people have to spend: a day out at the match is a luxury, so when incomes fall our crowds do too.'] },
        { title: 'Law and tax', lines: [
          'Legal: consumer law governs how we sell tickets and shirts and what we can promise; employment law governs our contracts, working hours and discrimination; health and safety law governs the ground, and the certificate that limits the ground to ' + num(c.f.cap) + ' seats. They are a cost of doing business and a reason to be careful, because a breach is expensive.',
          'Taxation: we pay corporation tax at ' + pc(m.K.TAX * 100) + ' of profit, so on a forecast profit of ' + gbp(Math.max(0, c.profit)) + ' the tax is ' + gbp(c.tax) + ' and ' + gbp(pat) + ' is left. The government\'s spending, on roads, transport and policing, also matters to us, because our fans have to get to the ground.'] },
        { title: 'Social, technological and environmental change', lines: [
          'Social: attitudes shift: supporters expect more from their club on pricing, on safe standing, on the environment. Technological: streaming reaches fans who will never visit the ground and offers the club a new income, as well as a rival to a day at the stadium, and e-commerce lets us sell shirts far beyond the town. Environmental pressure comes from fans, the council and regulators, on energy and travel.',
          'The business environment is dynamic: it keeps changing, so a plan made once and left will go stale. That is the reason for scenario planning and for holding some cash in reserve.'] },
      ];
    },
    groups: {
      repay: (m) => { const c = club(m); return { title: 'Economic: interest rates and the loans', text: ['Interest rates are set outside the club. A loan at a variable rate gets dearer when the rate rises, so the less we owe, the less exposed we are.', c.loanTotal ? 'We owe ' + gbp(c.loanTotal) + '; each 2 points on it adds ' + gbp(0.02 * c.loanTotal) + ' a year.' : 'We owe nothing, so there is nothing to repay.'], suggest: c.loanTotal ? 'Repay the loan with the highest rate early if cash stays above ' + gbp(1500000) + ' afterwards.' : 'Nothing to do here.' }; },
      prices: () => ({ title: 'Economic: inflation and prices', text: ['Inflation raises our costs every year: wages, supplies, energy. If prices stay put, the margin shrinks. Raising them by the inflation rate keeps its real value, but a bigger rise loses fans in the elastic stands.', 'In a weak economy fans have less to spend, so the risk is greater.'], suggest: 'A rise of 3%: roughly what inflation adds to our costs, and in line with what fans expect.' }),
    },
  };

  // ---- 13. Going global ----
  T.global = {
    sections: (m) => {
      const c = club(m);
      return [
        { title: 'Why go abroad, and what is in the way', lines: [
          'Reasons to enter a global market: more customers (our town has a limited number of them), spreading risk (if one market falls another may not), economies of scale from a larger output, and strengthening a global brand. Kestrel Telecom\'s offer of a tour of East Asia is a way to reach customers who have never heard of us.',
          'Barriers: trade barriers (tariffs, quotas) raise the price of our shirts abroad; protectionism protects a country\'s own businesses; trading blocs, such as the EU, remove them within a group. Cultural differences mean that what appeals here may not elsewhere, and a business that does not understand a market can lose a lot trying.'] },
        { title: 'Exchange rates', lines: [
          'The exchange rate is the price of one currency in terms of another. A shirt sells for £60 at home and 480 yuan in China when £1 buys 8 yuan, so the price is the same £60 either way. If the pound strengthens so that £1 buys 10 yuan, the same 480 yuan is only £48: we earn fewer pounds for the same sale, or we have to raise the yuan price and sell fewer. A stronger pound helps importers and hurts exporters; a weaker one does the reverse.',
          'Exchange-rate movements are a risk we do not control, which is a reason to price in the buyer\'s currency only on small orders or to share the risk with a local partner.'] },
        { title: 'Standardise or adapt', lines: [
          'In a global marketing mix the product, price, promotion and place can be standardised (the same everywhere: cheap, consistent, a clear global brand) or adapted to each market (the right price for local incomes, local language, local tastes: costly, but more appealing). A shirt at £60 is a day\'s wages in some places and a week\'s in others.',
          'Selling abroad also raises ethical questions: who makes the shirts, in what conditions, and at what pay. An ethical global supply chain is one the club has checked: the reputation of the shirt reflects on the club. Outsourcing (buying in from another business) and offshoring (moving production abroad) cut costs, and they are the points at which problems start.'] },
      ];
    },
    groups: {
      tour: () => ({ title: 'Reasons to go global: the tour', text: ['A tour of East Asia reaches new fans and brings in sponsorship. It also costs money and players\' time in the season, and fixtures are limited.'], suggest: 'Accept, if it can be done in the close season, when it does not cost the fixture list anything.' }),
      online: () => ({ title: 'E-commerce and global reach', text: ['An online shop reaches fans anywhere. It has a small running cost and opens the exchange-rate risk and the trade barriers (tariffs on shirts shipped abroad) that a local shop does not have.'], suggest: 'Yes, in pounds and by the post: it carries little risk and a lot of potential.' }),
      adapt: () => ({ title: 'Standardisation or adaptation', text: ['The global marketing mix can be standard or adapted. A price 20% below the home price is an adaptation to lower local incomes: it widens the market, with a lower margin.', 'At 10 yuan to the pound the 480-yuan shirt is only £48, so the exchange rate may do some of the discounting for us.'], suggest: 'A price 10% below the home price in the first year, so we learn what the market will bear without damaging the brand.' }),
    },
  };

  // ---- 14. Enterprise ----
  T.enterprise = {
    sections: (m) => {
      const c = club(m), families = 3000 * 0.62;
      return [
        { title: 'Entrepreneurs, intrapreneurs, risk and reward', lines: [
          'An entrepreneur spots an opportunity, organises the resources and takes the risk of a loss in the hope of a reward. Their motives are not only profit: independence, a better idea, doing something they believe in. An intrapreneur is someone who does the same inside an existing firm, like the member of our staff who has come to Rafael with the academy: the firm carries the risk, and the employee shares the reward through their job rather than their pay.',
          'Enterprise adds value: it turns inputs into something worth more than their cost. The difference between the fee a family pays and what the academy costs to run is added value. Parents want something for their children on Saturday mornings, and want it near and safe. That is a consumer need that is not being met.'] },
        { title: 'Market research', lines: [
          'Before spending we do market research: primary research (collected for the purpose, such as a survey or a trial) and secondary research (data that exists already: council figures, the school roll). Asking 200 parents gives a sample of 200 from about 3,000 families: 124 said they would pay, which is 62%. That is quantitative data: numbers we can calculate with. A few conversations with parents about why would be qualitative data: opinions and reasons.',
          'The weakness of a survey is that people say yes to a question that costs them nothing. If 62% of 3,000 families truly paid £40 a month, the academy would take ' + gbp(families * 40) + ' a month, an upper limit. What people say and what they do differ, so a pilot is a better test than a bigger survey: it gives real figures for a small cost.'] },
        { title: 'Break-even and the decision to launch', lines: [
          'The academy has fixed costs of about £14,000 a month (a pitch, coaches, insurance) and about £12 of variable cost for each family. At a £40 fee each family contributes £28, so break-even is 14,000 ÷ 28 = 500 families. Fewer than that and the academy makes a loss; more and the margin of safety is the number above it. A fee set higher lowers the break-even number but, because families are price-sensitive, may lose more of them.',
          'The risk is limited if we go slowly. A one-term pilot caps what we can lose. A full launch earns more if it works, but if it does not, we have spent the fixed costs and set up expectations. This is the usual trade between risk and reward, and between speed and learning.'] },
      ];
    },
    groups: {
      go: () => ({ title: 'Risk and reward: how to launch', text: ['A pilot limits the loss and gives real data; a full launch earns more if the research is right and loses more if it is not.'], suggest: 'A one-term pilot first: the survey says 62% would pay, but we have only asked 200 families what they would do, not what they will do.' }),
      fee: () => ({ title: 'Price and break-even', text: ['The fee decides the number of families we need to break even: £28 a family contribution at £40 means 500 families; at £60 it is 292, but fewer will join.', 'Parents of young children compare the price with the other activities they could buy.'], suggest: '£40: the price the families said they would pay.' }),
      budget: () => ({ title: 'Promotion while it launches', text: ['A new product has to be known before it can sell. A launch budget buys the first awareness; after that word of mouth does most of the work.'], suggest: '£5,000 a matchday for the first term, then review.' }),
    },
  };

  // ---- attach it all ----
  const safe = (fn, fallback) => { try { return fn(); } catch (e) { console.error('Board paper theory:', e); return fallback; } };
  function wire() {
    const CASES = FM.booksCases && FM.booksCases.CASES; if (!CASES || !FM.booksForms) return;
    CASES.forEach((c) => {
      const t = T[c.id]; if (!t) return;
      const rd = c.stages.find((s) => s.k === 'read');
      if (t.sections && rd && !rd.sections) rd.sections = (m) => safe(() => t.sections(m), []);
      const f = FM.booksForms[c.id];
      if (t.groups && f && !f._grouped) {
        const orig = f.fields; f._grouped = true;
        f.fields = (m) => orig(m).map((x) => (t.groups[x.id] && !x.group ? Object.assign({}, x, { group: safe(() => t.groups[x.id](m), null) || undefined }) : x));
      }
    });
  }
  wire();
})();
