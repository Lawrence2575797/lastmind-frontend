// The Export button on the LastMind AI Agent chat. It writes the manager's season to one plain-text file (Markdown: headings, tables and a short key to every column, then the
// same figures again as JSON) so it can be handed to any AI assistant, which can then talk through worked examples using the club's own numbers. Nothing here calls LastMind AI or
// spends Locks: the file is built in the browser from what the game has recorded, and saved to the manager's device.
(function () {
  const FM = (window.FM = window.FM || {});
  const r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100;
  const gbp = (v) => (v == null || isNaN(v) ? '' : (v < 0 ? '-£' : '£') + Math.abs(Math.round(v)).toLocaleString('en-GB'));
  const cell = (v) => String(v == null ? '' : v).replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
  const table = (head, rows) => rows.length ? '| ' + head.join(' | ') + ' |\n|' + head.map(() => '---').join('|') + '|\n' + rows.map((r) => '| ' + r.map(cell).join(' | ') + ' |').join('\n') : '(nothing recorded yet)';
  const safe = (fn, dflt) => { try { const v = fn(); return v == null ? dflt : v; } catch (e) { return dflt; } };

  const COLS = [
    ['round', 'Round', 'League round (1 is the first)'], ['opp', 'Opponent', ''], ['home', 'Venue', 'H = home, A = away'], ['gf', 'GF', 'Goals scored'], ['ga', 'GA', 'Goals conceded'],
    ['shots', 'Shots', 'Shots taken'], ['shotsA', 'ShotsA', 'Shots the opposition took'], ['onTarget', 'SoT', 'Shots on target'], ['xg', 'xG', 'Expected goals for: the total chance quality of the shots (1.0 = about one goal expected)'],
    ['xgA', 'xGA', 'Expected goals against'], ['poss', 'Poss%', 'Share of possession'], ['passes', 'Passes', 'Passes attempted'], ['passPct', 'Pass%', 'Passes completed, as a percentage'],
    ['passPctOwn', 'Pass% own third', 'Pass completion in your own third'], ['passPctMid', 'Pass% mid', 'Pass completion in the middle third'], ['passPctFinal', 'Pass% final', 'Pass completion in the final third'],
    ['tackles', 'Tackles', 'Tackles attempted'], ['tacklesWon', 'TacklesWon', 'Tackles won'], ['dribbles', 'Dribbles', 'Dribbles attempted'], ['dribblesWon', 'DribblesWon', 'Dribbles completed'],
    ['fouls', 'Fouls', 'Fouls committed'], ['corners', 'Corners', 'Corners won'], ['buildUps', 'BuildUps', 'Build-up moves of 3 or more passes started deep'], ['buildUpsToFinal', 'BuildUpsToFinal', 'Of those, how many reached the final third'],
  ];
  const COLS2 = [
    ['seqs', 'Possessions', 'Separate spells of possession'], ['seqAvgPasses', 'PassesPerPossession', 'Average passes in a possession'], ['seqFinalPct', 'ReachFinal%', 'Share of possessions that reached the final third'],
    ['lostOwn', 'LostOwnThird', 'Times the ball was lost in your own third'], ['lostMid', 'LostMid', 'Lost in the middle third'], ['lostFinal', 'LostFinal', 'Lost in the final third'],
    ['recoveries', 'Recoveries', 'Times the ball was won back'], ['highRecoveries', 'HighRecoveries', 'Won back in the opposition half'], ['regainSeconds', 'RegainSecs', 'Average seconds to win the ball back after losing it (-1 = none)'],
    ['lineHeight', 'DefLine%', 'Average height of the back line as a percentage of the pitch length'], ['width', 'Width', 'Average width of the team in metres'], ['compactness', 'Compactness', 'Average spread of the team, lower = tighter'],
    ['distanceKm', 'KmRun', 'Distance covered by the team (km)'], ['sprints', 'Sprints', 'Sprints by the team'], ['shotDist', 'ShotDistM', 'Average distance of your shots from goal (m)'], ['shotDefDist', 'NearestDefM', 'Average distance of the nearest defender at the shot (m)'],
    ['shotAssistedPct', 'ShotsFromPass%', 'Share of shots that came straight from a teammate\'s pass'], ['shotBig', 'BigChances', 'Shots worth 0.2 xG or more'],
  ];
  const TACTIC_NAMES = {
    lineHeight: 'Defensive line height', defWidth: 'Width when defending', attackWidth: 'Width when attacking', pressing: 'Pressing intensity', buildDirect: 'Directness of build-up', directness: 'Directness of play',
    risk: 'Risk taken in passing', tempo: 'Tempo', finalRisk: 'Risk in the final third', shootFreedom: 'Freedom to shoot', dribbleFreedom: 'Freedom to dribble', pressBuildUp: 'Pressing the opposition build-up',
    beatPress: 'Playing through the press', counterAttack: 'Counter-attacking', counterPress: 'Counter-pressing', tackleAggression: 'Tackling aggression', offsideTrap: 'Offside trap',
  };
  const RATING_NAMES = ['pace', 'dribbling', 'passing', 'finishing', 'tackling', 'composure', 'heading', 'stamina', 'gk'];

  FM.exportData = function (league) {
    const me = FM.teamById(league, league.userId), when = new Date();
    const played = league.fixtures.filter((f) => f.played).sort((a, b) => a.round - b.round);
    const mine = played.filter((f) => f.homeId === league.userId || f.awayId === league.userId);
    const rows = safe(() => FM.tableRows(league), []), pos = rows.findIndex((x) => x.id === league.userId) + 1;
    const next = safe(() => FM.nextUserFixture(league), null), nextOpp = next ? FM.teamById(league, next.homeId === league.userId ? next.awayId : next.homeId).name : '';
    const ds = safe(() => FM.dataset(league), { matches: [] }), b = safe(() => FM.biz(league), null);
    const out = [], json = { exported: when.toISOString(), club: me.name, level: league.tier, season: league.season };

    out.push(`# LastMind Football: data export for ${me.name}`);
    out.push([
      '> **For the AI assistant reading this.** This file comes from LastMind Football, a football-management simulation used to learn maths, statistics, economics and tactics. The user managed the club named below and',
      '> wants to talk through worked examples using these real figures. All numbers are from the simulation, not from real football. Use only the figures in this file when you quote data, show the working step by step,',
      '> and say so plainly if something you would need is not in here. Section 9 repeats the key tables as JSON for exact calculation. Each table has a key to its columns directly beneath it.',
    ].join('\n'));

    out.push('## 1. Overview');
    out.push(table(['Item', 'Value'], [
      ['Club', me.name], ['Level', league.tier + (league.divisionName ? ' · ' + league.divisionName : '')], ['Season', league.season], ['Matches played this season', mine.length],
      ['League position', pos ? pos + ' of ' + rows.length : 'not yet'], ['Next opponent', nextOpp ? nextOpp + ' (round ' + (next.round + 1) + ', ' + (next.homeId === league.userId ? 'home' : 'away') + ')' : 'none'],
      ['Formation', me.formationLabel || me.formationKey || ''], ['Exported', when.toLocaleString('en-GB')],
    ]));

    out.push('## 2. League table');
    json.leagueTable = rows.map((x, i) => { const o = { pos: i + 1, team: (FM.teamById(league, x.id) || {}).name }; Object.keys(x).forEach((k) => { if (typeof x[k] === 'number') o[k] = x[k]; }); return o; });
    const tcols = json.leagueTable.length ? Object.keys(json.leagueTable[0]) : [];
    out.push(table(tcols, json.leagueTable.map((o) => tcols.map((k) => o[k]))));
    out.push('Key: P played, W won, D drawn, L lost, GF goals for, GA goals against, GD goal difference, Pts points (where those columns appear).');

    out.push('## 3. Results this season (every match played in the division)');
    json.results = played.map((f) => ({ round: f.round + 1, home: FM.teamById(league, f.homeId).name, hg: f.hg, ag: f.ag, away: FM.teamById(league, f.awayId).name }));
    out.push(table(['Round', 'Home', 'Score', 'Away'], json.results.map((x) => [x.round, x.home, x.hg + '-' + x.ag, x.away])));

    out.push('## 4. Match statistics for your team, one row per match');
    json.matchStats = (ds.matches || []).map((m) => { const o = {}; COLS.concat(COLS2).forEach(([k]) => { o[k] = k === 'home' ? (m.home ? 'H' : 'A') : m[k]; }); return o; });
    out.push(table(COLS.map((c) => c[1]), json.matchStats.map((m) => COLS.map(([k]) => m[k]))));
    out.push('Key: ' + COLS.filter((c) => c[2]).map((c) => `**${c[1]}** ${c[2]}`).join('; ') + '.');
    out.push('### More detailed match measures');
    out.push(table(['Round'].concat(COLS2.map((c) => c[1])), json.matchStats.map((m) => [m.round].concat(COLS2.map(([k]) => m[k])))));
    out.push('Key: ' + COLS2.map((c) => `**${c[1]}** ${c[2]}`).join('; ') + '. A value of -1 means that measure was not recorded for the match.');

    out.push('## 5. Finances');
    if (b) {
      const ap = safe(() => FM.bizApprovals(league), {});
      out.push(table(['Item', 'Value'], [['Cash', gbp(b.cash)], ['Shareholder approval of the finances', Math.round(ap.financial) + '%'], ['Approval of the football', Math.round(ap.football) + '%'], ['Share price', ap.share != null ? '£' + r2(ap.share) : '']].filter((x) => x[1] !== '' && !/NaN/.test(x[1]))));
      out.push('### Ticket prices now');
      json.tickets = (FM.SEGMENTS || []).map((s) => ({ stand: s.name, seats: (b.seats && b.seats[s.id]) || s.seats, price: b.prices && b.prices[s.id] && b.prices[s.id].price }));
      out.push(table(['Stand', 'Seats', 'Price (£)'], json.tickets.map((x) => [x.stand, x.seats, x.price])));
      const led = (b.ledger || []).slice();
      out.push('### Matchday accounts, one row per match (£)');
      json.ledger = led.map((e) => ({ season: e.season, round: e.round, venue: e.home ? 'H' : 'A', opponent: e.opp, attendance: e.attTotal, capacity: e.capacity, turnedAway: e.away, ticketRevenue: e.inflow && e.inflow.tickets, totalRevenue: e.pl && e.pl.revenue, grossProfit: e.pl && e.pl.gross, operatingProfit: e.pl && e.pl.op, netProfit: e.pl && e.pl.net, closingCash: e.closing }));
      out.push(table(['Season', 'Round', 'Venue', 'Opponent', 'Attendance', 'Capacity', 'TurnedAway', 'TicketRevenue', 'TotalRevenue', 'GrossProfit', 'OperatingProfit', 'NetProfit', 'ClosingCash'],
        json.ledger.map((x) => [x.season, x.round, x.venue, x.opponent, x.attendance, x.capacity, x.turnedAway, x.ticketRevenue, x.totalRevenue, x.grossProfit, x.operatingProfit, x.netProfit, x.closingCash])));
      out.push('Key: Attendance is the crowd; TurnedAway are fans who could not get in because the stand was full; Revenue is ticket sales plus matchday spending, broadcast, sponsors, adverts, merchandise and prize money; Gross profit is revenue less the cost of matchday and merchandise; Operating profit is after wages, marketing, admin and depreciation.');
      out.push('### Price and crowd in each stand at every home match (the data for demand and price questions)');
      const stands = FM.SEGMENTS || [], pcRows = [];
      led.filter((e) => e.home && e.att && e.prices).forEach((e) => stands.forEach((s) => { if (e.prices[s.id] != null) pcRows.push({ round: e.round, opponent: e.opp, stand: s.name, price: e.prices[s.id], sold: e.att[s.id], seats: (b.seats && b.seats[s.id]) || s.seats }); }));
      json.priceAndCrowd = pcRows;
      out.push(table(['Round', 'Opponent', 'Stand', 'Price (£)', 'Sold', 'Seats'], pcRows.map((x) => [x.round, x.opponent, x.stand, x.price, x.sold, x.seats])));
      out.push('### Demand curve fitted to those records, one per stand');
      const fits = [];
      stands.forEach((s) => { const f = safe(() => FM.lessonFitFor(league, s.id, 6), null); if (f && f.ok) fits.push({ stand: s.name, seats: f.seats, currentPrice: f.current, matchesUsed: f.points.length, A: f.fit.A, k: f.fit.k, priceForMostRevenue: r2(f.turn), priceWhereStandStopsBeingFull: r2(f.pCap), bestWholePound: f.best && f.best.p, crowdAtBest: f.best && f.best.q, revenueAtBest: f.best && Math.round(f.best.revenue), revenueNow: Math.round(f.curRevenue), elasticityNow: r2(f.elasticity), fromTheData: !!f.fromData }); });
      json.demandFits = fits;
      out.push(table(['Stand', 'Seats', 'Price now', 'Matches used', 'A', 'k', 'p for max revenue (1/k)', 'p where stand stops being full', 'Best whole £', 'Crowd at best', 'Revenue at best', 'Revenue now', 'Elasticity now', 'Fitted from data'],
        fits.map((x) => [x.stand, x.seats, x.currentPrice, x.matchesUsed, x.A, x.k, x.priceForMostRevenue, x.priceWhereStandStopsBeingFull, x.bestWholePound, x.crowdAtBest, x.revenueAtBest, x.revenueNow, x.elasticityNow, x.fromTheData ? 'yes' : 'no (typical stand elasticity used)'])));
      out.push('Key: the model is q = A·e^(−k·p), where q is the crowd and p the price, so revenue R = p·q = A·p·e^(−k·p), dR/dp = A·e^(−k·p)(1 − k·p), and revenue is greatest at p = 1/k unless the stand is capped by its seats (then the best price is where the crowd just equals the seats). Elasticity at a price is −k·p.');
      out.push('### Business notes (from the game)');
      const dg = safe(() => FM.bizDigest(league), '');
      out.push(dg ? dg.split('\n').map((l) => '- ' + l).join('\n') : '(no notes yet)');
    } else out.push('(The club finances have not started yet.)');

    out.push('## 6. Squad');
    const squad = (me.squad || []).map((p) => {
      const o = { number: p.number, name: p.name, position: p.natural, role: p.roleId, overall: safe(() => FM.playerRating(p, p.group || p.natural), ''), potential: p.pot, height_cm: p.height, foot: p.foot, apps: p.stats && p.stats.apps, goals: p.stats && p.stats.goals, shots: p.stats && p.stats.shots, yellows: p.stats && p.stats.yellows, reds: p.stats && p.stats.reds, injured: safe(() => (FM.isInjured && FM.isInjured(p)) ? 'yes' : 'no', 'no') };
      RATING_NAMES.forEach((k) => { if (p.ratings && p.ratings[k] != null) o[k] = p.ratings[k]; }); return o;
    });
    json.squad = squad; const scols = squad.length ? Object.keys(squad[0]) : [];
    out.push(table(scols, squad.map((o) => scols.map((k) => o[k]))));
    out.push('Key: ratings are out of 100; Overall is the player\'s rating in his own position; the nine attributes are pace, dribbling, passing, finishing, tackling, composure, heading, stamina and gk (goalkeeping).');

    out.push('## 7. Tactics');
    const tac = me.tactics || {};
    json.tactics = { formation: me.formationLabel || me.formationKey };
    const trows = Object.keys(TACTIC_NAMES).filter((k) => typeof tac[k] === 'number').map((k) => { json.tactics[k] = r2(tac[k]); return [TACTIC_NAMES[k], r2(tac[k])]; });
    out.push(table(['Setting', 'Value (0 to 1)'], [['Formation', me.formationLabel || me.formationKey || '']].concat(trows)));
    out.push('Key: each setting runs from 0 (the least) to 1 (the most): for example pressing 0 never presses and 1 presses all the time.');

    out.push('## 8. Questions you could explore with this data');
    out.push([
      '- Which ticket price would have made the most money in a stand, and how did the fitted curve work that out? (Section 5)',
      '- Is there a link between shots, expected goals and the score? Work out the correlation or a line of best fit. (Section 4)',
      '- Which tactical settings seem to go with better results, and how confident can we be from so few matches? (Sections 4 and 7)',
      '- How much did the club earn per fan at each home match, and what changed? (Section 5)',
    ].join('\n'));

    out.push('## 9. The same figures as JSON');
    out.push('```json\n' + JSON.stringify(json) + '\n```');

    const name = 'lastmind-football-' + me.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-season' + league.season + '-' + mine.length + 'matches.md';
    return { filename: name, text: out.join('\n\n') + '\n' };
  };

  FM.downloadExport = function (league) {
    const d = FM.exportData(league), blob = new Blob([d.text], { type: 'text/markdown;charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = d.filename; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
    return d;
  };
})();
