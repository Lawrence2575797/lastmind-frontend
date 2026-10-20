// Controls: everything the manager can change about the club, as one list of named actions that the Workbench (and nothing else) offers. The Board only
// shows the club's figures now. To change a price, take a loan, treat an injury or spend money on something the game has no button for, you do it here, by
// hand from a form, or by asking the LastMind AI Agent, which proposes the action for you to apply.
//
// The game's own code is never rewritten. What the agent can do beyond the list is made of two safe pieces of data:
//   levers - "spend £X a matchday for N matchdays and get this effect". The effect must be one of a fixed set of things the game already reads (the crowd,
//            merchandise, running costs, how fast injuries heal ...) and it is capped by what the money can realistically buy, with diminishing returns.
//   rules  - "when this figure passes that value, do this action" (for example cut the marketing budget when the bank balance goes below £200,000).
// Anything the game cannot read, such as "score more goals", is refused with an explanation, never faked.
(function () {
  const FM = (window.FM = window.FM || {});
  const C = (FM.controls = {});
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const gbp = (v) => (FM.gbp ? FM.gbp(v) : '£' + Math.round(v).toLocaleString('en-GB'));
  const num = (v) => Math.round(v).toLocaleString('en-GB');
  const ok = (text, extra) => Object.assign({ ok: true, text }, extra || {});
  const no = (text) => ({ ok: false, text });
  const me = (lg) => FM.teamById(lg, lg.userId);
  const played = (lg) => lg.fixtures.filter((f) => f.played && (f.homeId === lg.userId || f.awayId === lg.userId)).length;

  // ---------- levers: money in, an effect out ----------
  // cap: the most the effect can ever reach, in per cent. scale: the spend a matchday at which about two-thirds of that is reached.
  const TARGETS = {
    attendance: { label: 'crowds at home matches', cap: 12, scale: 15000, sign: 1, note: 'more people want to come, at the same prices' },
    matchdaySpend: { label: 'what each fan spends on food, drink and programmes', cap: 20, scale: 8000, sign: 1, note: 'more spent per head on matchdays' },
    merch: { label: 'merchandise sales', cap: 25, scale: 8000, sign: 1, note: 'more shirts and scarves sold' },
    sponsorship: { label: 'sponsorship and advertising income', cap: 10, scale: 20000, sign: 1, note: 'sponsors and advertisers pay a little more' },
    runningCosts: { label: 'matchday running costs', cap: 15, scale: 10000, sign: -1, note: 'cheaper to stage each home match' },
    development: { label: 'how fast young players improve', cap: 25, scale: 15000, sign: 1, note: 'faster development at the club' },
    injuryRecovery: { label: 'how long injuries last', cap: 35, scale: 10000, sign: -1, note: 'shorter lay-offs for new injuries' },
    injuryRisk: { label: 'how often players get injured', cap: 25, scale: 12000, sign: -1, note: 'fewer injuries in matches' },
    recovery: { label: 'how fast tired players recover between matches', cap: 30, scale: 8000, sign: 1, note: 'players start the next match fresher' },
  };
  C.TARGETS = TARGETS;
  const MAX_LEVERS = 6, MAX_SPEND = 250000;
  const biz = (lg) => FM.biz(lg);

  // Turns what the agent or the manager asked for into a lever the game will accept, and says what had to be changed.
  C.checkLever = function (spec) {
    const out = { ok: false, adjustments: [] };
    const name = String(spec && spec.name || '').replace(/<[^>]*>/g, '').trim().slice(0, 40);
    if (!name) { out.error = 'Give the spending a name.'; return out; }
    let perRound = Math.round(Number(spec.perRound)), rounds = Math.round(Number(spec.rounds) || 14);
    if (!(perRound >= 500)) { out.error = 'Spending under £500 a matchday is too small to have any effect.'; return out; }
    if (perRound > 150000) { out.adjustments.push('The most the club can put into one thing is ' + gbp(150000) + ' a matchday, so the spend was reduced from ' + gbp(perRound) + '.'); perRound = 150000; }
    if (rounds < 1) rounds = 1; if (rounds > 28) { out.adjustments.push('Spending can be committed for at most 28 matchdays (two seasons) at a time.'); rounds = 28; }
    const eff = (Array.isArray(spec.effects) ? spec.effects : []).slice(0, 3), seen = {}, effects = [];
    eff.forEach((e) => {
      const t = TARGETS[e && e.target]; if (!t) { out.adjustments.push('"' + (e && e.target) + '" is not something the game can change, so it was dropped. The game can change: ' + Object.keys(TARGETS).join(', ') + '.'); return; }
      if (seen[e.target]) return; seen[e.target] = 1;
      const share = perRound / Math.max(1, eff.length), allowed = t.cap * (1 - Math.exp(-share / t.scale));
      let pct = Number(e.pct); if (!Number.isFinite(pct) || pct === 0) pct = allowed;
      pct = t.sign * Math.abs(pct);
      if (Math.abs(pct) > allowed) { out.adjustments.push('For ' + gbp(share) + ' a matchday the most that can realistically be bought for ' + t.label + ' is about ' + (Math.round(allowed * 10) / 10) + '%, so the effect was scaled down from ' + (Math.round(Math.abs(pct) * 10) / 10) + '%.'); pct = t.sign * allowed; }
      effects.push({ target: e.target, pct: Math.round(pct * 10) / 10 });
    });
    if (!effects.length) { out.error = 'None of the effects asked for is something the game can change. It can change: ' + Object.keys(TARGETS).map((k) => TARGETS[k].label).join('; ') + '.'; return out; }
    out.ok = true; out.lever = { name, desc: String(spec.desc || '').replace(/<[^>]*>/g, '').trim().slice(0, 200), perRound, rounds, effects };
    return out;
  };
  const leverText = (l) => l.name + ': ' + gbp(l.perRound) + ' a matchday for ' + l.rounds + ' matchdays (' + gbp(l.perRound * l.rounds) + ' in all); ' + l.effects.map((e) => (e.pct > 0 ? '+' : '') + e.pct + '% ' + TARGETS[e.target].label).join(', ');

  // ---------- injuries ----------
  C.PLANS = {
    physio: { label: 'Extra physiotherapy', cut: 0.15, base: 3000, perDay: 350, risk: 0, text: 'about 15% quicker, no added risk' },
    specialist: { label: 'Specialist treatment', cut: 0.3, base: 8000, perDay: 900, risk: 0, text: 'about 30% quicker, no added risk, more expensive' },
    accelerated: { label: 'Accelerated return', cut: 0.5, base: 5000, perDay: 400, risk: 2.2, text: 'about half the time out, but he is much more likely to be injured again for three weeks after' },
  };
  const injuredList = (lg) => me(lg).squad.filter((p) => FM.isInjured(p) && p.injury && !p.injury.suspended);
  C.injuries = function (lg) {
    return injuredList(lg).map((p) => {
      const days = Math.max(1, p.injury.until - FM.today), row = { id: p.id, name: p.name, injury: p.injury.name, days, matches: Math.ceil(days / 7), treatment: p.injury.treatment || null, plans: {} };
      Object.keys(C.PLANS).forEach((k) => { const pl = C.PLANS[k]; row.plans[k] = { cost: Math.round(pl.base + pl.perDay * days), daysAfter: Math.max(1, Math.round(days * (1 - pl.cut))) }; });
      return row;
    });
  };
  const findInjured = (lg, v) => { const list = injuredList(lg), s = String(v || '').toLowerCase(); return list.find((p) => p.id === v) || list.find((p) => p.name.toLowerCase() === s) || list.find((p) => p.name.toLowerCase().indexOf(s) >= 0 && s.length > 2) || null; };

  // ---------- the actions ----------
  const standOpts = () => FM.SEGMENTS.map((s) => ({ value: s.id, label: s.name }));
  const A = {};
  const def = (id, o) => { A[id] = Object.assign({ id }, o); };
  def('setTicketPrice', { group: 'Tickets', title: 'Set a ticket price', desc: 'The price of a ticket in one stand (in pounds). Takes effect from the next home match.',
    params: [{ k: 'stand', label: 'Stand', kind: 'select', options: () => standOpts() }, { k: 'price', label: 'New price (£)', kind: 'num', min: 3, max: 400, step: 1 }],
    current: (lg) => FM.SEGMENTS.map((s) => s.name + ' £' + biz(lg).prices[s.id].price).join(', '),
    run(lg, p) { const s = FM.SEGMENTS.find((x) => x.id === p.stand || x.name.toLowerCase() === String(p.stand).toLowerCase()); if (!s) return no('There is no stand called "' + p.stand + '". The stands are ' + FM.SEGMENTS.map((x) => x.id).join(', ') + '.'); const was = biz(lg).prices[s.id].price, price = clamp(Math.round(Number(p.price)), 3, 400); if (!Number.isFinite(price)) return no('Give a price.'); biz(lg).prices[s.id].price = price; return ok(s.name + ' tickets are now ' + gbp(price) + ' (they were ' + gbp(was) + '). The crowd is counted at the final whistle of the next home match.'); } });
  def('setMarketing', { group: 'Tickets', title: 'Set the marketing budget', desc: 'What the club spends on marketing every matchday (in pounds), from £0 to £60,000. It lifts the crowds, with diminishing returns.',
    params: [{ k: 'perRound', label: 'Marketing a matchday (£)', kind: 'num', min: 0, max: 60000, step: 500 }], current: (lg) => gbp(biz(lg).marketing || 0) + ' a matchday',
    run(lg, p) { const v = clamp(Math.round(Number(p.perRound)), 0, 60000); if (!Number.isFinite(v)) return no('Give an amount.'); const was = biz(lg).marketing || 0; biz(lg).marketing = v; return ok('Marketing is now ' + gbp(v) + ' a matchday (it was ' + gbp(was) + ').'); } });
  def('buildStand', { group: 'Ground', title: 'Add seats to a stand', desc: 'Starts a building project on one stand. Paid for from the bank now; the seats open after a few matchdays.',
    params: [{ k: 'stand', label: 'Stand', kind: 'select', options: () => standOpts() }], risk: 'high',
    run(lg, p) { const r = FM.bizBuild.expand(lg, p.stand); return r.ok ? ok('Building has started on the ' + p.stand + ' stand. The cost has left the bank and the seats open in ' + FM.bizConst.BUILD_TIME + ' matchdays.') : no(r.text); } });
  def('buyFacility', { group: 'Ground', title: 'Buy a facility', desc: 'Buys something for the club from the list of facilities (floodlights, a club shop, a fan zone, a training ground ...).',
    params: [{ k: 'id', label: 'Facility', kind: 'select', options: () => FM.FACILITIES.map((f) => ({ value: f.id, label: f.name + ' (' + gbp(f.cost) + ')' })) }], risk: 'high',
    run(lg, p) { const r = FM.bizBuild.buy(lg, p.id); const f = FM.FACILITIES.find((x) => x.id === p.id); return r.ok ? ok(f.name + ' bought for ' + gbp(f.cost) + '. It costs ' + gbp(f.upkeep) + ' a matchday to run.') : no(r.text); } });
  def('takeLoan', { group: 'Money', title: 'Take a bank loan', desc: 'Borrow from the bank (£100,000 to £5,000,000), repaid in equal parts every matchday with interest.',
    params: [{ k: 'amount', label: 'Amount (£)', kind: 'num', min: 100000, max: 5000000, step: 50000 }, { k: 'term', label: 'Repaid over', kind: 'select', options: () => FM.bizSources.loanOptions.map((o) => ({ value: o.term, label: o.term / 14 + ' season' + (o.term > 14 ? 's' : '') + ' (' + Math.round(o.rate * 1000) / 10 + '% a year)' })) }], risk: 'high',
    run(lg, p) { const amt = clamp(Math.round(Number(p.amount) / 10000) * 10000, 100000, 5000000), term = Number(p.term) || 28, o = FM.bizSources.loanOptions.find((x) => x.term === term); if (!o) return no('Choose how long to repay over: ' + FM.bizSources.loanOptions.map((x) => x.term + ' matchdays').join(', ') + '.'); FM.bizSources.takeLoan(lg, amt, term); return ok(gbp(amt) + ' has been paid into the bank. The club repays ' + gbp(Math.round(amt / term)) + ' every matchday for ' + term + ' matchdays, plus interest at ' + Math.round(o.rate * 1000) / 10 + '% a year.'); } });
  def('repayLoan', { group: 'Money', title: 'Repay a loan early', desc: 'Pays off one loan in full from the bank.', params: [{ k: 'id', label: 'Loan', kind: 'select', dyn: true, options: (lg) => biz(lg).loans.map((l) => ({ value: l.id, label: l.id + ': ' + gbp(l.balance) + ' owed' })) }],
    run(lg, p) { const l = biz(lg).loans.find((x) => x.id === p.id); if (!l) return no('There is no loan ' + p.id + '.'); const owed = l.balance, r = FM.bizSources.repayLoan(lg, p.id); return r.ok ? ok('Loan ' + p.id + ' repaid: ' + gbp(owed) + ' has gone from the bank. The interest and the matchday repayments stop.') : no('The club has ' + gbp(Math.max(0, biz(lg).cash)) + ' in the bank, and the loan is ' + gbp(owed) + '.'); } });
  def('issueShares', { group: 'Money', title: 'Issue new shares', desc: 'Raises money from new shareholders (£100,000 to £5,000,000). It never has to be repaid, but existing shareholders own less of the club and approval falls.',
    params: [{ k: 'amount', label: 'Amount to raise (£)', kind: 'num', min: 100000, max: 5000000, step: 50000 }], risk: 'high',
    run(lg, p) { const amt = clamp(Math.round(Number(p.amount) / 10000) * 10000, 100000, 5000000), r = FM.bizSources.issueShares(lg, amt); return r.ok ? ok(gbp(amt) + ' raised from ' + num(r.add) + ' new shares at £' + r.price.toFixed(2) + '. Existing shareholders now own ' + (100 * r.dilution).toFixed(1) + '% less of the club between them.') : no('Give an amount.'); } });
  def('setDividend', { group: 'Money', title: 'Set the dividend', desc: 'The share of the year\'s profit after tax paid to shareholders at the end of the season (0 to 80%).',
    params: [{ k: 'percent', label: 'Share of profit (%)', kind: 'num', min: 0, max: 80, step: 5 }], current: (lg) => Math.round((biz(lg).dividend.policy || 0) * 100) + '%',
    run(lg, p) { const v = clamp(Number(p.percent), 0, 80); if (!Number.isFinite(v)) return no('Give a percentage.'); FM.bizSources.setDividend(lg, v / 100); return ok('The dividend policy is now ' + Math.round(v) + '% of the year\'s profit after tax.'); } });
  def('answerOffer', { group: 'Deals', title: 'Answer a sponsor or advertiser', desc: 'Accept, decline or negotiate an offer that is waiting. When negotiating, name the price you want a matchday.',
    params: [{ k: 'id', label: 'Offer', kind: 'select', dyn: true, options: (lg) => biz(lg).offers.filter((o) => o.status === 'open').map((o) => ({ value: o.id, label: o.company + ': ' + FM.bizOfferText(o) })) }, { k: 'decision', label: 'Decision', kind: 'select', options: () => [{ value: 'accept', label: 'Accept' }, { value: 'decline', label: 'Decline' }, { value: 'negotiate', label: 'Negotiate' }] }, { k: 'ask', label: 'Price to ask for (£ a matchday, when negotiating)', kind: 'num', min: 500, max: 100000, step: 100 }],
    run(lg, p) {
      const o = biz(lg).offers.find((x) => x.id === p.id && x.status === 'open'); if (!o) return no('That offer is no longer open.');
      if (p.decision === 'accept') { FM.bizOffer(lg, p.id, true); return ok(o.company + ' will pay ' + gbp(o.perRound) + ' every matchday for ' + o.rounds + ' matchdays.'); }
      if (p.decision === 'decline') { FM.bizOffer(lg, p.id, false); return ok('The offer from ' + o.company + ' was turned down.'); }
      const r = FM.bizNegotiate(lg, p.id, p.ask); return r.ok ? ok(r.text, { status: r.status }) : no(r.text);
    } });
  def('treatInjury', { group: 'Medical', title: 'Treat an injury', desc: 'Pays for treatment for an injured player. Without it every injury heals in its own time at no cost. Extra physiotherapy and specialist treatment shorten the lay-off; an accelerated return is quickest but risks another injury.',
    params: [{ k: 'player', label: 'Player', kind: 'select', dyn: true, options: (lg) => injuredList(lg).map((p) => ({ value: p.id, label: p.name + ': ' + p.injury.name })) }, { k: 'plan', label: 'Treatment', kind: 'select', options: () => Object.keys(C.PLANS).map((k) => ({ value: k, label: C.PLANS[k].label + ' (' + C.PLANS[k].text + ')' })) }], risk: 'medium',
    run(lg, p) {
      const pl = findInjured(lg, p.player), plan = C.PLANS[p.plan]; if (!pl) return no('No injured player of yours matches "' + p.player + '".'); if (!plan) return no('Choose a treatment: ' + Object.keys(C.PLANS).join(', ') + '.');
      if (pl.injury.treatment) return no(pl.name + ' is already having treatment (' + pl.injury.treatment + ').');
      const days = Math.max(1, pl.injury.until - FM.today), cost = Math.round(plan.base + plan.perDay * days), b = biz(lg);
      if (b.cash < cost) return no('The treatment costs ' + gbp(cost) + ' and the club has ' + gbp(Math.max(0, b.cash)) + ' in the bank.');
      const after = Math.max(1, Math.round(days * (1 - plan.cut)));
      pl.injury.until = FM.today + after; pl.injury.treatment = plan.label; pl.injury.matches = Math.max(1, Math.ceil(after / 7));
      if (plan.risk) pl.relapse = { until: pl.injury.until + 21, mult: plan.risk };
      b.queued = (b.queued || []).concat([{ label: plan.label + ': ' + pl.name, amount: cost }]);
      return ok(plan.label + ' for ' + pl.name + ' (' + pl.injury.name + '): ' + gbp(cost) + ', paid from the next matchday\'s books. He was out for ' + days + ' more days and is now expected back in ' + after + '.' + (plan.risk ? ' He is more than twice as likely to be injured again for three weeks after he returns.' : ''));
    } });
  def('addLever', { group: 'Anything else', title: 'Spend on something of your own', desc: 'Spend an amount every matchday for a number of matchdays, for an effect from the list the game can change. The effect is capped by what that money could realistically buy.',
    params: [{ k: 'name', label: 'What is it?', kind: 'text' }, { k: 'perRound', label: 'Spend a matchday (£)', kind: 'num', min: 500, max: 150000, step: 500 }, { k: 'rounds', label: 'For how many matchdays', kind: 'num', min: 1, max: 28, step: 1 }, { k: 'target1', label: 'Effect on', kind: 'select', options: () => Object.keys(TARGETS).map((k) => ({ value: k, label: TARGETS[k].label })) }, { k: 'pct1', label: 'Hoped-for change (%)', kind: 'num', min: 1, max: 40, step: 1 }, { k: 'target2', label: 'Second effect (optional)', kind: 'select', options: () => [{ value: '', label: 'none' }].concat(Object.keys(TARGETS).map((k) => ({ value: k, label: TARGETS[k].label }))) }, { k: 'pct2', label: 'Hoped-for change (%)', kind: 'num', min: 1, max: 40, step: 1 }], risk: 'medium',
    normalise(p) { if (p.effects) return p; const effects = []; if (p.target1) effects.push({ target: p.target1, pct: Number(p.pct1) }); if (p.target2) effects.push({ target: p.target2, pct: Number(p.pct2) }); return Object.assign({}, p, { effects }); },
    preview(lg, p) { const r = C.checkLever(A.addLever.normalise(p)); return r.ok ? { text: leverText(r.lever), warnings: r.adjustments } : { text: r.error, warnings: [], bad: true }; },
    run(lg, p) {
      const b = biz(lg), r = C.checkLever(A.addLever.normalise(p)); if (!r.ok) return no(r.error);
      const live = (b.levers || []).filter((l) => l.left > 0); if (live.length >= MAX_LEVERS) return no('The club already has ' + MAX_LEVERS + ' pieces of custom spending running. Stop one first.');
      if (live.reduce((a, l) => a + l.perRound, 0) + r.lever.perRound > MAX_SPEND) return no('Custom spending cannot add up to more than ' + gbp(MAX_SPEND) + ' a matchday in total.');
      const lever = Object.assign({ id: 'V' + (b.seq++), left: r.lever.rounds, round: played(lg), by: p.by || 'manual' }, r.lever); b.levers = (b.levers || []).concat([lever]);
      return ok('Started: ' + leverText(lever) + '. The cost goes into the books from the next matchday.' + (r.adjustments.length ? ' ' + r.adjustments.join(' ') : ''), { lever: lever.id });
    } });
  def('removeLever', { group: 'Anything else', title: 'Stop some custom spending', desc: 'Ends a piece of custom spending early. The money already spent is not returned.', params: [{ k: 'id', label: 'Spending', kind: 'select', dyn: true, options: (lg) => (biz(lg).levers || []).filter((l) => l.left > 0).map((l) => ({ value: l.id, label: l.name })) }],
    run(lg, p) { const b = biz(lg), l = (b.levers || []).find((x) => x.id === p.id); if (!l) return no('There is no custom spending with that id.'); b.levers = b.levers.filter((x) => x !== l); return ok('Stopped: ' + l.name + '.'); } });

  // ---------- rules ----------
  C.METRICS = {
    cash: { label: 'cash in the bank (£)', get: (lg) => biz(lg).cash },
    overdraft: { label: 'overdraft in use (£)', get: (lg) => Math.max(0, -biz(lg).cash) },
    position: { label: 'league position', get: (lg) => (FM.tableRows(lg).findIndex((r) => r.id === lg.userId) + 1) },
    last_attendance: { label: 'attendance at the last home match', get: (lg) => { const e = biz(lg).ledger.filter((x) => x.home).slice(-1)[0]; return e ? e.attTotal : 0; } },
    season_profit: { label: 'profit for the year so far (£)', get: (lg) => FM.bizSeasonSum(lg, 'net') },
    approval_finance: { label: 'shareholders\' approval of the finances (%)', get: (lg) => FM.bizApprovals(lg).financial },
    approval_football: { label: 'shareholders\' approval of the football (%)', get: (lg) => FM.bizApprovals(lg).football },
    injured_players: { label: 'number of injured players', get: (lg) => injuredList(lg).length },
    matchday: { label: 'matches played so far this season', get: (lg) => lg.fixtures.filter((f) => f.played && !f.friendly && (f.homeId === lg.userId || f.awayId === lg.userId)).length },
  };
  const RULE_ACTIONS = ['setTicketPrice', 'setMarketing', 'setDividend', 'treatInjury', 'removeLever', 'repayLoan'];
  const OPS = { '<': (a, b) => a < b, '<=': (a, b) => a <= b, '>': (a, b) => a > b, '>=': (a, b) => a >= b, '=': (a, b) => a === b };
  const ruleText = (r) => 'When ' + C.METRICS[r.when.metric].label + ' ' + r.when.op + ' ' + r.when.value + ', ' + A[r.do.action].title.toLowerCase() + ' (' + Object.keys(r.do.params || {}).map((k) => k + ' ' + r.do.params[k]).join(', ') + ')';
  def('addRule', { group: 'Anything else', title: 'Make a rule that runs by itself', desc: 'After every matchday, if a figure passes a value, the club does something automatically (for example, cut the marketing budget if the bank balance falls below a limit).',
    params: [{ k: 'name', label: 'Name of the rule', kind: 'text' }, { k: 'metric', label: 'When this figure', kind: 'select', options: () => Object.keys(C.METRICS).map((k) => ({ value: k, label: C.METRICS[k].label })) }, { k: 'op', label: 'is', kind: 'select', options: () => Object.keys(OPS).map((o) => ({ value: o, label: o })) }, { k: 'value', label: 'this value', kind: 'num', step: 1 }, { k: 'action', label: 'then do', kind: 'select', options: () => RULE_ACTIONS.map((k) => ({ value: k, label: A[k].title })) }, { k: 'stand', label: 'Stand (for a ticket price)', kind: 'select', options: () => [{ value: '', label: '–' }].concat(standOpts()) }, { k: 'amount', label: 'Amount (price £, marketing £, or dividend %)', kind: 'num', step: 1 }, { k: 'once', label: 'Run', kind: 'select', options: () => [{ value: '', label: 'every time it is true' }, { value: '1', label: 'only the first time' }] }], risk: 'medium',
    normalise(p) { if (p.when && p.do) return p; const ac = p.action, pp = {}; if (ac === 'setTicketPrice') { pp.stand = p.stand; pp.price = Number(p.amount); } else if (ac === 'setMarketing') pp.perRound = Number(p.amount); else if (ac === 'setDividend') pp.percent = Number(p.amount); return { name: p.name, when: { metric: p.metric, op: p.op, value: Number(p.value) }, do: { action: ac, params: pp }, once: !!p.once }; },
    run(lg, p) {
      const r = A.addRule.normalise(p), b = biz(lg); b.rules = b.rules || [];
      if (!C.METRICS[r.when.metric]) return no('Unknown figure "' + r.when.metric + '". Figures: ' + Object.keys(C.METRICS).join(', ') + '.');
      if (!OPS[r.when.op] || !Number.isFinite(Number(r.when.value))) return no('The condition needs a comparison (<, <=, >, >=, =) and a number.');
      if (!r.do || RULE_ACTIONS.indexOf(r.do.action) < 0) return no('A rule can do one of: ' + RULE_ACTIONS.join(', ') + '.');
      if (b.rules.length >= 8) return no('There are already 8 rules. Remove one first.');
      const rule = { id: 'R' + (b.seq++), name: String(r.name || '').slice(0, 40) || 'Rule', when: { metric: r.when.metric, op: r.when.op, value: Number(r.when.value) }, do: { action: r.do.action, params: r.do.params || {} }, once: !!r.once, fired: 0, by: p.by || 'manual' };
      b.rules.push(rule); return ok('Rule set: ' + ruleText(rule) + (rule.once ? ', once.' : ', every time it is true after a matchday.'), { rule: rule.id });
    } });
  def('removeRule', { group: 'Anything else', title: 'Remove a rule', desc: 'Deletes a rule so it stops running.', params: [{ k: 'id', label: 'Rule', kind: 'select', dyn: true, options: (lg) => (biz(lg).rules || []).map((r) => ({ value: r.id, label: r.name })) }],
    run(lg, p) { const b = biz(lg), r = (b.rules || []).find((x) => x.id === p.id); if (!r) return no('There is no rule with that id.'); b.rules = b.rules.filter((x) => x !== r); return ok('Rule removed: ' + r.name + '.'); } });
  C.ACTIONS = A;

  // ---------- running them ----------
  const coerce = (action, params) => { const p = Object.assign({}, params || {}); const n = A[action].normalise; return n ? n(p) : p; };
  C.run = function (lg, id, params, by) {
    const a = A[id]; if (!a) return no('There is no action "' + id + '". The actions are: ' + Object.keys(A).join(', ') + '.');
    let r; try { r = a.run(lg, Object.assign({}, params || {}, { by: by || 'manual' })); } catch (e) { r = no('That could not be done: ' + (e && e.message ? e.message : e)); }
    try { const w = lg.workbench; if (w) { w.actionLog = (w.actionLog || []).concat([{ at: Date.now(), action: id, params: params || {}, ok: r.ok, text: r.text, by: by || 'manual', day: lg.day }]).slice(-40); } } catch (e) { /* the log is only a convenience */ }
    if (r.ok && FM.bizSyncBudget) { try { FM.bizSyncBudget(lg); } catch (e) { /* fine */ } }
    return r;
  };
  C.preview = function (lg, id, params) { const a = A[id]; return a && a.preview ? a.preview(lg, params || {}) : null; };
  C.optionsFor = function (lg, param) { try { return param.options ? param.options(lg) : []; } catch (e) { return []; } };

  // What the agent is told: the list of actions, what each needs, and how things stand now.
  C.help = function (lg) {
    const lines = Object.keys(A).map((id) => {
      const a = A[id], ps = a.params.filter((p) => !/^(target2|pct2|stand|amount|once)$/.test(p.k) || id !== 'addRule').map((p) => p.k + (p.kind === 'select' ? ' (one of ' + C.optionsFor(lg, p).slice(0, 12).map((o) => o.value).join('|') + ')' : p.kind === 'num' ? ' (number' + (p.min != null ? ' ' + p.min + '-' + p.max : '') + ')' : ''));
      if (id === 'addLever') return '{"type":"control","action":"addLever","params":{"name":"...","desc":"...","perRound":POUNDS,"rounds":N,"effects":[{"target":T,"pct":PERCENT}]}}  ' + a.desc + ' Targets: ' + Object.keys(TARGETS).map((k) => k + ' (' + TARGETS[k].label + ')').join('; ') + '.';
      if (id === 'addRule') return '{"type":"control","action":"addRule","params":{"name":"...","when":{"metric":M,"op":"<|<=|>|>=|=","value":N},"do":{"action":ONE OF ' + RULE_ACTIONS.join('|') + ',"params":{...that action\'s params}},"once":false}}  ' + a.desc + ' Metrics: ' + Object.keys(C.METRICS).map((k) => k + ' (' + C.METRICS[k].label + ')').join('; ') + '.';
      return '{"type":"control","action":"' + id + '","params":{' + ps.map((s) => '"' + s.split(' ')[0] + '":...').join(',') + '}}  ' + a.title + '. ' + a.desc + (a.current ? ' Now: ' + a.current(lg) + '.' : '') + ' Params: ' + ps.join(', ') + '.';
    });
    return lines.join('\n');
  };
  // The fixed list the agent is given (no current values, so the same text serves everyone and can be cached; the live ids come from C.state).
  C.helpStatic = function () {
    return Object.keys(A).map((id) => {
      const a = A[id];
      if (id === 'addLever') return '{"type":"control","action":"addLever","params":{"name":"...","desc":"...","perRound":POUNDS 500-150000,"rounds":1-28,"effects":[{"target":T,"pct":PERCENT}]}}  Spend every matchday for an effect. Targets: ' + Object.keys(TARGETS).map((k) => k + ' (' + TARGETS[k].label + ')').join('; ') + '.';
      if (id === 'addRule') return '{"type":"control","action":"addRule","params":{"name":"...","when":{"metric":M,"op":"<|<=|>|>=|=","value":N},"do":{"action":' + RULE_ACTIONS.join('|') + ',"params":{...}},"once":false}}  Runs by itself after each matchday. Metrics: ' + Object.keys(C.METRICS).map((k) => k + ' (' + C.METRICS[k].label + ')').join('; ') + '.';
      const ps = a.params.map((p) => p.k + (p.kind === 'select' ? (p.dyn ? ' (id from the state)' : ' (' + (p.options ? p.options(null) : []).map((o) => o.value).join('|') + ')') : p.kind === 'num' ? ' (number' + (p.min != null ? ' ' + p.min + '-' + p.max : '') + ')' : ''));
      return '{"type":"control","action":"' + id + '","params":{' + a.params.map((p) => '"' + p.k + '":...').join(',') + '}}  ' + a.title + '. ' + a.desc + ' Params: ' + ps.join(', ') + '.';
    }).join('\n');
  };
  C.state = function (lg) {
    const b = biz(lg), out = [];
    out.push('Ticket prices: ' + FM.SEGMENTS.map((s) => s.name + ' £' + b.prices[s.id].price + ' (' + num(b.seats[s.id]) + ' seats)').join(', ') + '. Marketing ' + gbp(b.marketing || 0) + ' a matchday. Dividend ' + Math.round((b.dividend.policy || 0) * 100) + '%. Cash ' + gbp(b.cash) + '.');
    if (b.loans.length) out.push('Loans: ' + b.loans.map((l) => l.id + ' ' + gbp(l.balance) + ' owed').join(', ') + '.');
    const offers = b.offers.filter((o) => o.status === 'open'); if (offers.length) out.push('Offers waiting: ' + offers.map((o) => o.id + ' ' + o.company + ' (' + FM.bizOfferText(o) + ')').join('; ') + '.');
    const inj = C.injuries(lg); if (inj.length) out.push('Injured: ' + inj.map((i) => i.id + ' ' + i.name + ' (' + i.injury + ', ' + i.days + ' days left' + (i.treatment ? ', treated: ' + i.treatment : '; physio ' + gbp(i.plans.physio.cost) + ', specialist ' + gbp(i.plans.specialist.cost) + ', accelerated ' + gbp(i.plans.accelerated.cost)) + ')').join('; ') + '.');
    const lv = (b.levers || []).filter((l) => l.left > 0); if (lv.length) out.push('Custom spending running: ' + lv.map((l) => l.id + ' ' + leverText(l) + ' (' + l.left + ' left)').join('; ') + '.');
    if ((b.rules || []).length) out.push('Rules: ' + b.rules.map((r) => r.id + ' ' + ruleText(r)).join('; ') + '.');
    return out.join('\n');
  };

  // ---------- after every matchday: log new injuries, run the rules ----------
  C.afterRound = function (lg, fx) {
    const b = biz(lg);
    try {
      lg.injuryLog = lg.injuryLog || [];
      me(lg).squad.forEach((p) => { if (p.injury && !p.injury.suspended && !p.injury.logged && p.injury.until > FM.today) { p.injury.logged = 1; lg.injuryLog.push({ season: lg.season, round: fx ? fx.round + 1 : 0, player: p.name, injury: p.injury.name, days: Math.max(1, p.injury.until - FM.today), matches: p.injury.matches || Math.ceil((p.injury.until - FM.today) / 7), treated: p.injury.treatment || '' }); } });
      if (lg.injuryLog.length > 200) lg.injuryLog = lg.injuryLog.slice(-200);
    } catch (e) { /* the log is optional */ }
    (b.rules || []).slice().forEach((r) => {
      try {
        if (r.once && r.fired) return;
        const v = C.METRICS[r.when.metric].get(lg); if (!OPS[r.when.op](v, r.when.value)) return;
        const res = r.do.action === 'treatInjury' && !r.do.params.player ? (() => { const worst = C.injuries(lg).sort((x, y) => y.days - x.days)[0]; return worst ? C.run(lg, 'treatInjury', Object.assign({}, r.do.params, { player: worst.id }), 'rule') : no('nobody injured'); })() : C.run(lg, r.do.action, r.do.params, 'rule');
        r.fired = (r.fired || 0) + 1;
        if (res.ok && FM.pushNews) FM.pushNews(lg, { round: fx ? fx.round : 0, day: lg.day, kind: 'Workbench', headline: 'Your rule "' + r.name + '" ran', body: ruleText(r) + '. ' + res.text, club: lg.userId, mine: true });
      } catch (e) { /* a rule that fails is skipped */ }
    });
  };

  // links anywhere in the game ("Change this in the Workbench") open the Workbench with the right form
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-wb]'); if (!b) return;
    e.preventDefault();
    const [action, ...rest] = String(b.dataset.wb).split(':'); const params = {};
    if (action === 'open') { if (FM.goWorkbench) FM.goWorkbench(); return; }
    if (action === 'answerOffer' && rest[0]) params.id = rest[0];
    if (action === 'repayLoan' && rest[0]) params.id = rest[0];
    if (action === 'setTicketPrice' && rest[0]) params.stand = rest[0];
    if (action === 'buildStand' && rest[0]) params.stand = rest[0];
    if (action === 'buyFacility' && rest[0]) params.id = rest[0];
    if (FM.goWorkbench) FM.goWorkbench({ control: action, params });
  });
})();
