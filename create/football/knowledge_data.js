// What a lesson can say about the student's own club. Everything a lesson quotes comes from here: the ticket prices and crowds, the results, the shots, the squad, the money.
// Where the season has not got far enough to have the figure, an example is used and the lesson says so (`d.example`), so the working always has numbers to work with.
(function () {
  const FM = (window.FM = window.FM || {});
  const safe = (fn, dflt) => { try { const v = fn(); return v == null ? dflt : v; } catch (e) { return dflt; } };
  const r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100;
  const gbp = (v) => (v < 0 ? '-£' : '£') + Math.abs(Math.round(v)).toLocaleString('en-GB');
  const num = (v) => Math.round(v).toLocaleString('en-GB');

  FM.knowledgeData = function (lg) {
    const d = { gbp, num, r1, r2, example: {}, ok: !!lg };
    const me = lg ? safe(() => FM.teamById(lg, lg.userId), null) : null, b = lg ? safe(() => FM.biz(lg), null) : null;
    d.club = me ? me.name : 'Ashford Rovers'; d.tier = lg ? lg.tier : 'gcse'; d.season = lg ? lg.season : 1;
    // ---- the stands: price, seats and the crowd at the last home match
    const homes = b ? (b.ledger || []).filter((e) => e.home && e.att && e.prices) : [];
    const last = homes[homes.length - 1];
    d.stands = (FM.SEGMENTS || []).map((s) => ({ id: s.id, name: s.name, seats: b && b.seats ? (b.seats[s.id] || s.seats) : s.seats, price: b && b.prices && b.prices[s.id] ? b.prices[s.id].price : (s.ref || 20), sold: last && last.att[s.id] != null ? last.att[s.id] : null, lastPrice: last && last.prices[s.id] != null ? last.prices[s.id] : null }));
    d.stands.forEach((s) => { if (s.sold == null) { s.sold = Math.round(s.seats * 0.72); d.example.crowds = true; } if (s.lastPrice == null) s.lastPrice = s.price; });
    d.stand = (id) => d.stands.find((s) => s.id === id) || d.stands[0];
    d.big = d.stands.slice().sort((a, c) => c.seats - a.seats)[0] || { name: 'the main stand', seats: 6000, price: 28, sold: 4300, lastPrice: 28, id: 'general' };
    d.capacity = d.stands.reduce((a, s) => a + s.seats, 0); d.crowd = d.stands.reduce((a, s) => a + s.sold, 0);
    d.crowds = homes.map((e) => ({ round: e.round, total: e.attTotal, att: e.att, prices: e.prices }));
    if (d.crowds.length < 3) { d.crowdSeries = [d.crowd * 0.93, d.crowd * 1.04, d.crowd, d.crowd * 0.97, d.crowd * 1.02].map(Math.round); d.example.series = true; } else d.crowdSeries = d.crowds.slice(-8).map((c) => c.total);
    d.gate = last && last.inflow ? last.inflow.tickets : d.stands.reduce((a, s) => a + s.sold * s.price, 0); if (!last) d.example.gate = true;
    d.cash = b ? b.cash : 8000000;
    // ---- the results and the numbers behind them
    const fx = lg ? lg.fixtures.filter((f) => f.played && (f.homeId === lg.userId || f.awayId === lg.userId)).sort((a, c) => a.round - c.round) : [];
    d.results = fx.map((f) => { const home = f.homeId === lg.userId; return { round: f.round + 1, home, gf: home ? f.hg : f.ag, ga: home ? f.ag : f.hg, opp: FM.teamById(lg, home ? f.awayId : f.homeId).name }; });
    if (d.results.length < 4) { d.results = [{ round: 1, home: true, gf: 2, ga: 1, opp: 'Northfield United' }, { round: 2, home: false, gf: 0, ga: 0, opp: 'Harbour City' }, { round: 3, home: true, gf: 3, ga: 1, opp: 'Redcliffe Town' }, { round: 4, home: false, gf: 1, ga: 2, opp: 'Eastgate Rangers' }, { round: 5, home: true, gf: 2, ga: 0, opp: 'Westmoor Albion' }]; d.example.results = true; }
    d.goals = d.results.map((r) => r.gf); d.conceded = d.results.map((r) => r.ga);
    d.gf = d.goals.reduce((a, x) => a + x, 0); d.ga = d.conceded.reduce((a, x) => a + x, 0); d.played = d.results.length;
    d.wins = d.results.filter((r) => r.gf > r.ga).length; d.draws = d.results.filter((r) => r.gf === r.ga).length; d.losses = d.played - d.wins - d.draws; d.points = d.wins * 3 + d.draws;
    const ds = lg ? safe(() => FM.dataset(lg), { matches: [] }) : { matches: [] };
    d.matchStats = ds.matches || [];
    d.shots = d.matchStats.length >= 3 ? d.matchStats.map((m) => m.shots) : [11, 9, 14, 8, 12]; d.xg = d.matchStats.length >= 3 ? d.matchStats.map((m) => m.xg) : [1.4, 0.8, 2.1, 0.9, 1.6];
    d.poss = d.matchStats.length >= 3 ? d.matchStats.map((m) => m.poss) : [54, 47, 58, 45, 52]; d.passPct = d.matchStats.length >= 3 ? d.matchStats.map((m) => m.passPct) : [79, 74, 83, 72, 78];
    d.oppShots = d.matchStats.length >= 3 ? d.matchStats.map((m) => m.shotsA) : [8, 10, 6, 13, 7];
    if (d.matchStats.length < 3) d.example.stats = true;
    d.pos = lg ? safe(() => FM.tableRows(lg).findIndex((x) => x.id === lg.userId) + 1, 1) : 1; d.teams = lg ? lg.teams.length : 8;
    // ---- the squad
    d.squad = me ? (me.squad || []).map((p) => ({ name: p.name, number: p.number, pos: p.natural, overall: safe(() => FM.playerRating(p, p.group || p.natural), 8), goals: p.stats ? p.stats.goals : 0, ratings: p.ratings || {} })) : [];
    d.top = d.squad.slice().sort((a, c) => c.overall - a.overall)[0] || { name: 'your striker', overall: 8.7, ratings: { pace: 78 } };
    d.fast = d.squad.slice().sort((a, c) => (c.ratings.pace || 0) - (a.ratings.pace || 0))[0] || { name: 'your winger', ratings: { pace: 91 } };
    d.tactics = me && me.tactics ? me.tactics : {};
    // ---- money
    d.loan = b && b.loans && b.loans.length ? b.loans[0] : null;
    d.stand0 = d.stand('general');
    return d;
  };
})();
