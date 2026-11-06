// Feature stories. The news is not a reply to every event: only the things a paper would make something of get a full story (a fiery interview, a comeback, a late winner, a slump that
// puts the manager under pressure, a club in debt or just bought by new owners). Each is written out in several paragraphs from the club's actual situation (the score and who scored,
// the run of results, the table, the supporters' mood, the money), by code alone: nothing is sent anywhere.
(function () {
  const FM = (window.FM = window.FM || {});
  const ord = (n) => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : (n % 10 < 4 ? n % 10 : 0)]);
  const cap = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);
  const gb = (n) => '£' + Math.round(n).toLocaleString('en-GB');
  const gm = (n) => (n >= 1e6 ? '£' + (Math.round(n / 1e5) / 10) + 'm' : '£' + Math.round(n / 1e3) + 'k');
  const nums = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const num = (n) => (n >= 0 && n <= 10 ? nums[n] : String(n));
  const poss = (n) => (/s$/.test(n) ? n + "'" : n + "'s");
  const mkPick = (rng) => (arr) => arr[Math.floor(rng() * arr.length)];

  // ---------- what the paper knows about the club right now ----------
  FM.newsContext = function (league, teamId) {
    const me = teamId || league.userId, team = FM.teamById(league, me), rows = FM.tableRows(league), pos = rows.findIndex((r) => r.id === me) + 1, row = rows.find((r) => r.id === me) || { p: 0, pts: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
    const played = league.fixtures.filter((f) => f.played && (f.homeId === me || f.awayId === me)).sort((a, b) => a.round - b.round);
    const res = played.map((f) => { const home = f.homeId === me, gf = home ? f.hg : f.ag, ga = home ? f.ag : f.hg, opp = FM.teamById(league, home ? f.awayId : f.homeId); return { f, home, gf, ga, opp: opp ? opp.name : '', r: gf > ga ? 'W' : gf === ga ? 'D' : 'L', round: f.round }; });
    const run = (pred) => { let n = 0; for (let i = res.length - 1; i >= 0 && pred(res[i]); i--) n++; return n; };
    const next = league.fixtures.filter((f) => !f.played && (f.homeId === me || f.awayId === me)).sort((a, b) => a.round - b.round)[0];
    const nextOpp = next ? FM.teamById(league, next.homeId === me ? next.awayId : next.homeId) : null;
    const n = rows.length, board = league.board || {}, opinion = Number.isFinite(league.publicOpinion) ? league.publicOpinion : 50;
    const aheadOf = rows[pos] ? rows[pos - 1 + 1] : null, leader = rows[0];
    return { me, team, name: team ? team.name : 'the club', rows, pos, n, row, res, last5: res.slice(-5), w: run((x) => x.r === 'W'), u: run((x) => x.r !== 'L'), l: run((x) => x.r === 'L'), winless: run((x) => x.r !== 'W'),
      nextOpp, nextHome: next ? next.homeId === me : null, board, expected: board.expectedPosition || null, opinion, leader, gapTop: leader ? leader.pts - row.pts : 0, aheadOf,
      bottomGap: rows[n - 3] ? row.pts - rows[n - 3].pts : 0, zone: n - 2 };
  };
  const formWords = (c) => {
    const l5 = c.last5; if (!l5.length) return '';
    const w = l5.filter((x) => x.r === 'W').length, d = l5.filter((x) => x.r === 'D').length, l = l5.filter((x) => x.r === 'L').length;
    return `${num(w)} win${w === 1 ? '' : 's'}, ${num(d)} draw${d === 1 ? '' : 's'} and ${num(l)} defeat${l === 1 ? '' : 's'} in their last ${l5.length === 1 ? 'match' : num(l5.length) + ' matches'}`;
  };
  const tableLine = (c) => {
    if (!c.row.p) return `${c.name} have yet to play a league match`;
    const where = c.pos === 1 ? 'top of the table' : c.pos === c.n ? 'bottom of the table' : `${ord(c.pos)} in the table`;
    return `${c.name} are ${where} on ${c.row.pts} point${c.row.pts === 1 ? '' : 's'} from ${c.row.p}`;
  };
  const stakes = (c, pick) => {
    if (!c.row.p) return '';
    if (c.pos === 1) return pick(['There is a long way to go, but the rest of the league is now looking up at them.', 'Being top is the easy part to say; staying there is what the dressing room will be thinking about.']);
    if (c.pos >= c.zone) return pick([`With ${c.bottomGap <= 0 ? 'the drop zone close enough to feel' : c.bottomGap + ' points of cushion over the drop zone'}, nobody at the club can pretend this is a comfortable place to be.`, 'Down here every point is a small argument against relegation, and the table is not forgiving.']);
    if (c.gapTop <= 3) return `The leaders are only ${c.gapTop === 0 ? 'level' : num(c.gapTop) + ' point' + (c.gapTop === 1 ? '' : 's') + ' away'}, close enough to start talking about a title.`;
    if (c.expected && c.pos < c.expected) return `That is ahead of where the board expected them to finish (${ord(c.expected)}), and expectations rise with results.`;
    if (c.expected && c.pos > c.expected) return `That is below the ${ord(c.expected)} place the board expected, and patience is not unlimited.`;
    return pick(['The mid-table is a hard place to be noticed from, and the next few results will say which way the season goes.', 'Neither fighting for the top nor looking over their shoulder, they are in the part of the table where one run decides the season.']);
  };
  const mood = (c, pick) => {
    const o = c.opinion;
    if (o >= 70) return pick(['The supporters are firmly behind the manager.', 'The mood among the fans is the best it has been for years.']);
    if (o >= 50) return pick(['The supporters are patient for now.', 'The fans are watching closely, and for the moment they are on side.']);
    if (o >= 30) return pick(['Supporters are growing restless.', 'The mood on the terraces has turned more anxious than hopeful.']);
    return pick(['The supporters have lost patience and are making it known.', 'Anger on the terraces is now louder than the singing.']);
  };

  FM.pushFeature = function (league, f) {
    const item = { round: f.round != null ? f.round : (league.fixtures.filter((x) => x.played && (x.homeId === league.userId || x.awayId === league.userId)).length - 1), day: league.day, kind: f.kind, headline: f.headline, standfirst: f.standfirst || '', paras: f.paras, body: f.paras.join(' '), club: f.club || league.userId, mine: f.mine !== false, reporter: f.reporter, feature: true, pull: f.pull || null };
    if (f.publication) item.publication = f.publication;
    FM.pushNews(league, item);
    return item;
  };

  // ---------- the club's story: money, owners and the board ----------
  const BOARD_REP = 'Marcus Webb';
  FM.boardFeature = function (league, kind, extra) {
    const c = FM.newsContext(league), b = FM.biz ? FM.biz(league) : null, bd = b && b.board; if (!bd || league.mp) return;
    const rng = FM.mulberry32((league.seed || 1) + (league.runSeed || 0) * 17 + (league.season || 1) * 311 + kind.length * 7), pick = mkPick(rng);
    const bi = FM.bizBoardInfo ? FM.bizBoardInfo(league) : { cash: b.cash, loans: 0, pct: bd.pct, reserve: bd.reserve };
    const owner = bd.owner ? cap(bd.owner) : 'The new owners', last = FM.lastSeasonStory ? FM.lastSeasonStory(league) : null, team = c.name;
    const seasonLine = () => (last ? last.body : c.row.p ? tableLine(c) + '.' : (c.expected ? `The board expects ${team} to finish ${ord(c.expected)} this season.` : ''));
    const fin = `the board releases ${bd.pct}% of the cash above its ${gb(bi.reserve || bd.reserve || 0)} reserve`;
    let h, sf, ps = [];
    if (kind === 'debt') {
      h = pick([`${team} on the brink: ${gm(bi.loans)} owed and the bank watching`, `Debt hangs over ${team} as the new manager arrives`, `${team} borrowed to survive. Now the bill is due`]);
      sf = `The club owes ${gb(bi.loans)} and holds ${gb(bi.cash)}. Whoever picks the team will be told, quite bluntly, what that means.`;
      ps = [
        `Walk round ${poss(team)} ground this week and nobody will tell you the club is in trouble, because nobody has to. The accounts do it for them: ${gb(bi.loans)} owed to the bank, repayments swallowing a large share of every matchday's income, and ${gb(bi.cash)} left in the account.`,
        `For the manager the consequence is immediate. ${cap(fin)}, which comes to ${gb(Math.max(0, (bi.cash - (bi.reserve || 0)) * bd.pct / 100))} for transfers. In practice that means no cheque book: any new face has to be paid for by someone leaving, and the squad ${c.team ? 'of ' + c.team.squad.length + ' players' : ''} is what there is.`,
        seasonLine(),
        `Supporters have been told the club is “living within its means”. Inside the building the phrase is used with a grim smile. ${pick(['Rafael Morales, the Director of Finance, is said to have asked for a meeting before the first match.', 'A familiar voice in the finance department has asked that every pound be accounted for.'])} The people running the club say they will not sell the ground or the future to get through the winter. The question is how long a good run of results can paper over the numbers.`,
        `${pick(['If the team wins, the debt becomes background noise. If it does not, it becomes the whole story.', 'A promotion would solve most of this. A relegation would end the argument for good.'])}`,
      ];
    } else if (kind === 'takeover' || kind === 'mega') {
      const big = kind === 'mega';
      h = big ? pick([`${owner} buy ${team}: a bottomless pocket and a deadline`, `Money, ambition and a title demand: ${owner} take over ${team}`]) : pick([`${owner} take over ${team}: new money, new pressure`, `A new owner at ${team}, and a cheque to match`]);
      sf = `${owner} have put ${gb(bd.injection || 0)} into the club. Everything now rests on what they expect for it.`;
      ps = [
        `It was announced with a short statement and a long list of promises. ${owner} now own ${team}, and have paid ${gb(bd.injection || 0)} into the bank to prove they mean it. ${big ? 'It is the kind of sum that changes what a club thinks it can be.' : 'It is not an enormous sum by the standards of the game, but at this level it changes things.'}`,
        `For the manager it means a transfer budget that suddenly looks like an invitation: ${fin}, and with this much in the account the number is not small. It also means a boss who will want to see what the money bought. ${big ? 'People close to the owners say they expect a title challenge, not a decent season.' : 'People close to the owners say they expect progress, and quickly.'}`,
        seasonLine(),
        `${pick(['Fans who spent years watching the club sell its best players are not complaining. They have also been here before, and the history of new owners is not always kind to managers who do not deliver.', 'The supporters have greeted the news with a mix of delight and suspicion. Money has a way of coming with strings.'])}`,
      ];
    } else if (kind === 'tight') {
      h = pick([`${team} short of cash as the season begins`, `Tight times at ${team}: every pound will be counted`, `No money, no excuses: ${team} start the year on a shoestring`]);
      sf = `${gb(bi.cash)} in the bank, ${gb(bi.loans)} owed, and owners who are not putting more in.`;
      ps = [
        `${team} begin the season with ${gb(bi.cash)} in the bank and ${gb(bi.loans)} still owed from before the new manager arrived. The owners have made it clear that they are not putting new money in, and the board keeps a reserve back, releasing only ${bd.pct}% of what is above it for transfers.`,
        `That leaves a manager with a smaller budget than most of the league and, in practice, one clear way to strengthen: sell a player or find a bargain no one else has spotted. ${pick(['Free agents will be a favourite subject this summer.', 'The scouts have been told to look at the clubs below, not the clubs above.'])}`,
        seasonLine(),
        `${pick(['It is not a crisis, and the club is keen to say so. But it is the kind of situation where one expensive mistake in the transfer market can hang over a whole season.', 'Nobody inside the club is calling it a crisis. Nobody is calling it comfortable either.'])}`,
      ];
    } else if (kind === 'loans') {
      h = `${poss(team)} bank balance frozen: security for the bank, not money for players`;
      sf = `The owners have locked ${gb(bd.reserve || 0)} away. Only new money can be spent.`;
      ps = [`The owners have frozen the club's bank balance: the ${gb(bd.reserve || 0)} held is security for the bank and cannot be spent on players. The new manager will have to find money some other way: a loan, a sale, or whatever the club earns above today's balance.`, seasonLine(), `${pick(['In football terms it is a handbrake, not a disaster. Everyone will be watching to see whether the manager works around it or runs into it.', 'It is the kind of restriction that does not show in the table until the team needs a signing it cannot make.'])}`];
    } else if (kind === 'ban') {
      h = `${team} banned from signing players`;
      sf = `The league has stopped the club buying anyone until league match ${bd.ban ? bd.ban.untilRound : '?'}.`;
      ps = [`${team} have been handed a transfer ban for ${bd.ban ? bd.ban.reason : 'breaches of the league\'s financial rules'}. Until after league match ${bd.ban ? bd.ban.untilRound : '?'} the club cannot sign anyone in either window, though they can still sell.`, `For the manager the squad is the squad. The injuries and the suspensions and the form of the players already at the club are the whole of the season until the ban ends.`, seasonLine(), `${pick(['It is an embarrassing story for the people who run the club, and a heavy one for the person who has to pick the team.', 'The club have said they accept the decision. They have not said what they will do differently.'])}`];
    } else if (kind === 'notice' && extra) {
      h = extra.title; sf = extra.lines[0] || '';
      ps = extra.lines.slice(); ps.push(`${tableLine(c)}. ${mood(c, pick)}`);
    } else return;
    FM.pushFeature(league, { kind: 'Club', headline: h, standfirst: sf, paras: ps.filter(Boolean), round: -1, reporter: BOARD_REP, publication: 'The Touchline' });
  };
  // At the start of a game: the club's money story, once.
  FM.ensureBoardNews = function (league) {
    const b = FM.biz ? FM.biz(league) : null, bd = b && b.board; if (!bd || bd.legacy || bd.newsDone || league.mp) return;
    bd.newsDone = true;
    if (['debt', 'takeover', 'mega', 'tight', 'loans', 'ban'].indexOf(bd.kind) >= 0) FM.boardFeature(league, bd.kind);
  };

  // ---------- the managed club's match ----------
  // Is this match worth a story? A comeback, a late winner, a heavy win or defeat, a turning point (red card, penalty), a long unbeaten run broken or begun.
  FM.matchFeature = function (league, fx) {
    if (!fx || !fx.summary) return null;
    const me = league.userId, c = FM.newsContext(league), home = fx.homeId === me, gf = home ? fx.hg : fx.ag, ga = home ? fx.ag : fx.hg;
    const rng = FM.mulberry32((league.seed || 1) + (league.runSeed || 0) + fx.round * 211 + 91), pick = mkPick(rng);
    const sum = fx.summary, opp = FM.teamById(league, home ? fx.awayId : fx.homeId), oppName = opp ? opp.name : 'the visitors', team = c.name, venue = home ? 'at home' : 'away';
    const goals = (sum.goals || []).slice().sort((a, b) => a.t - b.t);
    let mine = 0, theirs = 0, maxDef = 0, maxLead = 0, lastMinMine = null; goals.forEach((g) => { if (g.team === me) { mine++; lastMinMine = g.t; } else theirs++; maxDef = Math.max(maxDef, theirs - mine); maxLead = Math.max(maxLead, mine - theirs); });
    const lateWinner = gf > ga && goals.length && goals[goals.length - 1].team === me && goals[goals.length - 1].t >= 85 && gf - ga === 1;
    const lateEqualiser = gf === ga && gf > 0 && goals.length && goals[goals.length - 1].team === me && goals[goals.length - 1].t >= 85 && maxDef >= 1;
    const comeback = gf > ga && maxDef >= 2, throwaway = gf < ga && maxLead >= 2;
    const thrashing = gf - ga >= 4, hammering = ga - gf >= 4, redMine = (sum.reds || []).some((r) => r.team === me), redTheirs = (sum.reds || []).some((r) => r.team !== me);
    const streakBroken = c.l === 1 && c.res.length >= 6 && c.res[c.res.length - 2] && c.res.slice(-6, -1).every((x) => x.r !== 'L');
    let kind = null;
    if (comeback) kind = 'comeback'; else if (throwaway) kind = 'throwaway'; else if (lateWinner) kind = 'late'; else if (lateEqualiser) kind = 'equaliser'; else if (thrashing) kind = 'thrashing'; else if (hammering) kind = 'hammering'; else if (redMine && gf <= ga) kind = 'sentoff';
    else if (c.l >= 3) kind = 'slump'; else if (c.w >= 4) kind = 'streak'; else if (streakBroken) kind = 'streakend';
    if (!kind) return null;
    const scorers = goals.filter((g) => g.team === me).map((g) => `${g.name} (${g.t}')`), theirScorers = goals.filter((g) => g.team !== me).map((g) => `${g.name} (${g.t}')`);
    const joinList = (a) => (a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
    const score = `${gf}-${ga}`, potm = sum.potm && sum.potm.team === me ? sum.potm.name : null;
    const form = formWords(c), tl = tableLine(c), st = stakes(c, pick), md = mood(c, pick);
    const nextLine = c.nextOpp ? `Next up is ${c.nextOpp.name}${c.nextHome ? ' at home' : ' away'}, ${pick(['and the manager will not need reminding what is at stake.', 'a fixture that now carries more weight than it did a week ago.', 'with the dressing room still replaying this one.'])}` : '';
    const goalsText = (mine ? `${team} scored through ${joinList(scorers)}` : `${team} failed to score`) + (theirs ? `; ${oppName} replied through ${joinList(theirScorers)}` : '') + '.';
    let h, sf, ps;
    if (kind === 'comeback') {
      h = pick([`Never in doubt? ${team} come from ${num(maxDef)} down to beat ${oppName}`, `The great escape: ${team} turn ${maxDef}-0 into ${score}`, `${team} found a way back from the dead against ${oppName}`]);
      sf = `Trailing by ${num(maxDef)}, ${team} won ${score} ${venue}. Somebody in that dressing room found something.`;
      ps = [`There were people already heading for the exits. ${team} were ${maxDef} goal${maxDef === 1 ? '' : 's'} down against ${oppName} and playing like a team that had stopped believing, and then it turned. ${goalsText} By the end the noise ${home ? 'inside the ground' : 'from the away end'} was the kind that football remembers.`,
        potm ? `${potm} was the man at the centre of it, the player who kept asking for the ball when others were hiding. His manager will say it was a team effort. He will not be able to stop himself mentioning ${potm} by name.` : `It was a team effort in the plainest sense, with nobody to point at and everybody to thank.`,
        `${cap(tl)}, with ${form}. ${st}`, `${md} ${nextLine}`];
    } else if (kind === 'throwaway') {
      h = pick([`${team} throw it away: ${maxLead}-0 up and beaten by ${oppName}`, `Collapse: ${team} lose ${score} after leading by ${num(maxLead)}`]);
      sf = `They led by ${num(maxLead)} and lost. It will be a long week.`;
      ps = [`Ask anyone in the ground when it started to go wrong and they will give you a different minute. ${goalsText} What nobody disputes is that ${team} had the match won, and then they did not.`, `It was the kind of defeat that gets into players' heads and managers' sleep. ${potm ? `${potm} did what he could.` : 'There were no heroes to find.'} The questions will be about concentration, about substitutions, about why ${oppName} were allowed back in.`, `${cap(tl)}, with ${form}. ${st}`, `${md} ${nextLine}`];
    } else if (kind === 'late') {
      h = pick([`${scorers.length ? goals[goals.length - 1].name : 'A hero'} wins it in the ${goals[goals.length - 1].t}th minute for ${team}`, `Last-gasp ${team} snatch it against ${oppName}`, `Stoppage-time drama: ${team} win ${score}`]);
      sf = `A ${goals[goals.length - 1].t}th-minute goal ${venue} decided it. Nobody was expecting that.`;
      ps = [`With five minutes to play it was heading for a draw that nobody would have remembered. Then ${goals[goals.length - 1].name} got a touch where he was not supposed to be, and ${team} had beaten ${oppName} ${score}. ${goalsText}`, `${potm ? potm + ' was named man of the match, but' : 'The man of the match award did not matter, because'} the moment everyone will take home is that late one. The bench was off the touchline before the ball had stopped moving.`, `${cap(tl)}, with ${form}. ${st}`, `${md} ${nextLine}`];
    } else if (kind === 'equaliser') {
      h = pick([`${team} rescue a point at the death against ${oppName}`, `Late show: ${team} level it in the dying minutes`]);
      sf = `${score}. They were trailing until the closing minutes.`;
      ps = [`${oppName} thought they had done it. ${goalsText} The equaliser came late enough that ${poss(oppName)} bench had already started celebrating and the ${home ? 'home' : 'away'} end had to be told it was not over.`, `A point that felt like more than a point. ${cap(tl)}, with ${form}. ${st}`, `${md} ${nextLine}`];
    } else if (kind === 'thrashing') {
      h = pick([`${team} demolish ${oppName}: ${score}`, `A statement: ${team} put ${gf} past ${oppName}`, `${oppName} were never in it as ${team} run riot`]);
      sf = `${gf} goals ${venue}, and it could have been more.`;
      ps = [`It was over so early that the rest was a formality. ${goalsText} ${oppName} did not have an answer for anything ${team} threw at them.`, potm ? `${potm} was the pick of the lot, but the performance had a whole squad's fingerprints on it.` : 'There were many ways to pick a man of the match, and none of them were wrong.', `${cap(tl)}, with ${form}. ${st}`, `${md} ${nextLine}`];
    } else if (kind === 'hammering') {
      h = pick([`${team} humiliated: ${oppName} win ${ga}-${gf}`, `Hammered: ${team} beaten out of sight by ${oppName}`, `${team} fall apart in ${ga}-${gf} defeat`]);
      sf = `${ga - gf} goals the difference ${venue}. The questions start now.`;
      ps = [`There are defeats and there are afternoons. ${goalsText} ${team} were second best in every area, and the scoreline was kinder than the match.`, `${redMine ? 'A red card did not help, but it did not excuse it either. ' : ''}The manager will be asked about the shape, about the selection, about the effort. ${potm ? potm + ' was the one player to leave with his head up.' : 'Nobody left with their head up.'}`, `${cap(tl)}, with ${form}. ${st}`, `${md} ${nextLine}`];
    } else if (kind === 'sentoff') {
      const r = (sum.reds || []).find((x) => x.team === me);
      h = pick([`${r ? r.name : 'A player'} sent off as ${team} fall to ${oppName}`, `Ten men, no answers: ${team} go down ${ga}-${gf}`]);
      sf = `${r ? r.name : 'A red card'} changed the match, and the result followed.`;
      ps = [`It was going well enough until the red card. ${r ? r.name : 'A player'} went on ${r ? r.t : '?'} minutes, ${r && r.second ? 'for a second yellow' : r && r.violent ? 'for violent conduct' : 'for a challenge nobody could really defend'}, and ${team} spent the rest of the match trying to hold on. ${goalsText}`, `The disciplinary consequences are the part that will carry over: a suspension, and a gap in the team that has to be filled.`, `${cap(tl)}, with ${form}. ${st}`, `${md} ${nextLine}`];
    } else if (kind === 'slump') {
      h = pick([`Pressure mounts on ${poss(team)} manager after ${num(c.l)} straight defeats`, `${team} in freefall: ${num(c.l)} losses and counting`, `Crisis at ${team}? ${num(c.l)} defeats in a row`]);
      sf = `${score} ${gf > ga ? 'win' : 'defeat'} to ${oppName} ${venue}, and the questions are getting louder.`;
      ps = [`${team} have lost ${num(c.l)} in a row, and the latest defeat, ${score} against ${oppName}, was the kind that makes a bad run feel like a trend. ${goalsText}`, `${cap(tl)}, with ${form}. ${st}`, `${md} Public opinion of the manager now stands at ${Math.round(c.opinion)}%, and the board's patience is not something anyone is willing to test.`, `${pick(['What happens next will define the season. A reaction, or a reckoning.', 'The next result will not just be three points. It will be a statement.'])} ${nextLine}`];
    } else if (kind === 'streak') {
      h = pick([`${team} win ${num(c.w)} in a row: is this the real thing?`, `${num(c.w)} wins on the spin: ${team} are flying`]);
      sf = `${score} ${venue} against ${oppName} makes it ${num(c.w)} straight league wins.`;
      ps = [`It is getting hard to find anything wrong with ${team}. ${goalsText} That makes ${num(c.w)} wins in a row, a run that has people at the club saying out loud what they were previously whispering.`, `${cap(tl)}, with ${form}. ${st}`, `${md} ${nextLine}`];
    } else {   // streakend
      h = pick([`${poss(team)} unbeaten run ends against ${oppName}`, `The run is over: ${oppName} stop ${team}`]);
      sf = `${score} ${venue} against ${oppName} ends a long run without defeat.`;
      ps = [`It had to end sometime. ${goalsText} The unbeaten run that had become a talking point finished in the least dramatic way, with a result that ${team} could not quite get a grip on.`, `${cap(tl)}, with ${form}. ${st}`, `${md} ${nextLine}`];
    }
    return { kind: { comeback: 'Comeback', throwaway: 'Collapse', late: 'Last-minute', equaliser: 'Last-minute', thrashing: 'Big win', hammering: 'Defeat', sentoff: 'Red card', slump: 'Crisis', streak: 'Run', streakend: 'Run' }[kind], headline: h, standfirst: sf, paras: ps.filter(Boolean), round: fx.round, club: me, topic: kind };
  };

  // ---------- an interview worth printing ----------
  // Only the tones that make a story do: a provocative answer, a confident one that the result then makes look silly (or vindicates), and an honest one after a bad run.
  FM.interviewFeature = function (league, record, fx) {
    const answers = record.answers || []; if (!answers.length) return null;
    const c = FM.newsContext(league), team = c.name, oppT = FM.teamById(league, fx.homeId === league.userId ? fx.awayId : fx.homeId), opp = oppT ? oppT.name : 'the opposition', pre = record.kind === 'pre';
    const rng = FM.mulberry32((league.seed || 1) + (league.runSeed || 0) + (record.round | 0) * 313 + (pre ? 1 : 2)), pick = mkPick(rng);
    const has = (m) => answers.some((a) => a.mood === m), res = record.result;
    const provocative = has('provocative'), confident = has('confident'), honest = has('honest'), humorous = has('humorous');
    const preRec = !pre ? (league.interviews || []).find((x) => x.kind === 'pre' && x.round === record.round) : null;
    const preConfident = !!(preRec && preRec.answers.some((a) => a.mood === 'confident' || a.mood === 'provocative'));
    let angle = null;
    if (provocative) angle = 'fiery';
    else if (!pre && preConfident && res === 'L') angle = 'eatwords';
    else if (!pre && preConfident && res === 'W') angle = 'vindicated';
    else if (confident && !pre && res === 'L') angle = 'eatwords';
    else if (honest && !pre && c.l >= 2) angle = 'candid';
    else if (humorous && c.l >= 2 && !pre) angle = 'laugh';
    if (!angle) return null;
    // Only what the manager actually said is reported, and only the answers he chose from the list can be printed word for word (what he typed himself never is). Nothing is
    // said about his words beyond what the record shows: the tone of what he picked, and what he picked.
    const said = (a) => (a && a.answer && !a.free ? a.answer : null);
    const lead = answers.find((a) => a.mood === 'provocative') || answers.find((a) => a.mood === 'confident') || answers.find((a) => a.mood === 'honest') || answers[0];
    const quote = said(lead);
    const preLead = preRec ? (preRec.answers.find((a) => a.mood === 'provocative') || preRec.answers.find((a) => a.mood === 'confident')) : null, preQuote = said(preLead);
    const home = fx.homeId === league.userId, gf = home ? fx.hg : fx.ag, ga = home ? fx.ag : fx.hg, played = fx.hg != null && fx.ag != null;
    const score = played ? `${team} ${res === 'W' ? 'beat' : res === 'L' ? 'lost to' : 'drew with'} ${opp} ${Math.max(gf, ga)}–${Math.min(gf, ga)}` + (home ? ' at home' : ' away') : '';
    const delta = (Number(record.opinionAfter) || 50) - (Number(record.opinionBefore) || 50), tl = tableLine(c), form = formWords(c), md = mood(c, pick), st = stakes(c, pick);
    const reaction = delta >= 3 ? 'Supporters took to it.' : delta > 0 ? 'Most supporters seemed to like the edge.' : delta <= -3 ? 'It went down badly with supporters.' : delta < 0 ? 'The reaction among supporters was mixed.' : 'Reaction among supporters was muted.';
    const table = `${cap(tl)}${form ? ', with ' + form : ''}.`;
    const q = (t) => `“${t}”`;
    let h, sf, ps, pull = null;
    if (angle === 'fiery') {
      h = pick([pre ? `${team} manager takes aim at ${opp} before the match` : `${team} manager lets rip after ${opp}`, pre ? `War of words: ${team} boss goes after ${opp}` : `${team} manager speaks his mind after ${opp}`]);
      sf = pre ? `The ${team} manager used his pre-match press conference to take a swipe at ${opp}.` : `The ${team} manager used his post-match press conference to speak bluntly after ${res === 'W' ? 'a win' : res === 'L' ? 'a defeat' : 'a draw'} against ${opp}.`;
      pull = quote;
      ps = [pre ? `${team} meet ${opp} this weekend, and their manager chose his press conference to speak bluntly about the game.` : `${score}, and the manager did not hold back afterwards.`,
        quote ? `Asked about it, he said: ${q(quote)}` : `His answers in the press room were pointed throughout.`,
        table, `${reaction} ${md}`];
    } else if (angle === 'eatwords') {
      h = pick([`${team} manager's confidence before ${opp} is not matched on the pitch`, `Big talk, then defeat: ${team} lose to ${opp}`]);
      sf = `The ${team} manager had spoken confidently before the game. The result went the other way.`;
      pull = preQuote;
      ps = [score ? `${score}, a day after talk that gave no hint of it.`.replace('a day after talk', 'after talk') : `${team} were beaten by ${opp}.`,
        preQuote ? `Before the game the manager had said: ${q(preQuote)}` : `Before the game the manager's tone had been confident.`,
        quote ? `Afterwards he said: ${q(quote)}` : '',
        table, `${st} ${reaction}`];
    } else if (angle === 'vindicated') {
      h = pick([`Confident ${team} manager backed up by the result against ${opp}`, `He said it, and then ${team} did it: win over ${opp}`]);
      sf = `The ${team} manager had spoken confidently before the game, and the team won.`;
      pull = preQuote;
      ps = [score ? `${score}, after a manager who had spoken confidently about the game beforehand.` : `${team} won, after a confident build-up.`,
        preQuote ? `Before the game he had said: ${q(preQuote)}` : `Before the game his tone had been confident.`,
        quote ? `After the final whistle: ${q(quote)}` : '',
        table, `${reaction} ${md}`];
    } else if (angle === 'candid') {
      h = pick([`${team} manager takes the blame after ${opp}`, `Honest and hurting: ${team} manager on a bad run`]);
      sf = `${cap(num(c.l))} defeats in a row, and the manager spoke plainly about it.`;
      pull = quote;
      ps = [score ? `${score}, the club's ${ord(c.l)} defeat in a row.` : `${team} have now lost ${num(c.l)} in a row.`,
        quote ? `Asked about the run, he said: ${q(quote)}` : `Asked about the run, he gave honest answers.`,
        table, `${st} ${reaction}`];
    } else {
      h = `${team} manager keeps his humour through a bad run`;
      sf = `${cap(num(c.l))} defeats in a row, and the manager kept the mood light in the press room.`;
      pull = quote;
      ps = [score ? `${score}, the club's ${ord(c.l)} defeat in a row.` : `${team} have now lost ${num(c.l)} in a row.`,
        quote ? `He said: ${q(quote)}` : `He answered with a joke or two.`,
        table, `${reaction} ${md}`];
    }
    return { kind: 'Interview', headline: h, standfirst: sf, paras: ps.filter(Boolean), pull: pull, round: record.round, club: league.userId, reporter: 'Sofia Bennett' };
  };
})();
