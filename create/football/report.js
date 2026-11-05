// The Analysis page's written reports: what happened in a match, and across the season, as a write-up of what went well and what went wrong. Every
// sentence is built by code from the match logs, with the figures and the players named: a finding is only written when the numbers are far enough from
// ordinary to be worth saying, and the ones with the biggest gap come first. Nothing is sent anywhere or written by a model.
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1), f2 = (v) => (Math.round(v * 100) / 100).toFixed(2), pc = (a, b) => (b ? Math.round(100 * a / b) : 0);
  const sum = (a, f) => a.reduce((x, y) => x + (f ? f(y) : y), 0);
  const min = (t) => Math.floor(t / 60) + 1;
  const plural = (n, w, ws) => n + ' ' + (n === 1 ? w : ws || w + 's');
  const list = (a) => (a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);


  // ---------- what to try, and the maths that helps ----------
  // For each finding: a change that can be made in the game (named by the page and the control), and a piece of maths that decides whether the change is worth making,
  // set up with this match's own figures. The Workbook button puts the example in the Notes, ready for the working.
  const dist20 = (s) => Math.hypot(105 - s.x, 34 - s.y);
  function fixFor(f, V) {
    const { c, us, opp } = V, D = (l, v) => [l, String(v)];
    const shotsAgainst = c.against.length;
    switch (f.id) {
      case 'wasteful': return { change: 'Final third page: set "Shooting" to "Work a better chance" and "Bodies in the box" to "Many", so the man on the ball has a better shot to choose from. The Shot map shows where the missed chances were taken from.',
        maths: { topic: 'Probability: bad finishing, or bad luck?', why: `${V.gf} goals from ${f2(V.xf)} expected goals could be poor finishing or ordinary variance. The Poisson distribution gives the chance of scoring that few or fewer when ${f2(V.xf)} are expected. If it is above about 5%, the shooting does not need changing yet.`, task: `Take λ = ${f2(V.xf)}. Work out P(X ≤ ${V.gf}) for a Poisson distribution, and say what it means for whether to change anything.`, data: [D('Goals scored', V.gf), D('Expected goals', f2(V.xf)), D('Shots', c.shots.length)] } };
      case 'speculative': { const pts = V.farAll.slice().sort((a, b) => dist20(a) - dist20(b)).slice(0, 6); return { change: 'Final third page: lower the shooting range dial, or choose "Work a better chance". Shots from outside 20 m are worth very little; the same possession is worth more as a pass into the box.',
        maths: { topic: 'Functions: how fast does a chance lose its value with distance?', why: `Chance quality falls steeply with distance. Fitting a curve of the form xG = a·e^(−b·d) to this match's shots tells you how many long shots equal one close one, which is the price of shooting early.`, task: 'Use the shots below, plus a close one from the Shot map, to estimate a and b. Then work out how many shots from 25 m are worth one from 8 m.', data: pts.map((q) => D(f1(dist20(q)) + ' m', f2(q.xg) + ' xG')) } }; }
      case 'breaks': { const q = V.quick.slice().sort((a, b) => b.xg - a.xg)[0]; return { change: 'Defensive transition page: choose "Drop and regroup" and "Track back quickly", so the team is goal-side when it loses the ball. On the Final third page, "Bodies in the box" at "Few" keeps more players behind the ball.',
        maths: { topic: 'Speed, distance and time', why: `A break works when the attackers cover the distance faster than the defenders recover it. s = vt tells you how much of a head start the defence needs, and so how many players have to stay back.`, task: `The most dangerous quick attack here reached a shot ${q && q.raw ? f1(q.raw.moveSecs) + ' s after the ball was won, over ' + q.raw.movePasses + ' passes' : 'within eight seconds'}. If the attackers cover 30 m at 8 m/s, how far behind can a recovering defender running at 6.5 m/s be and still get goal-side in time?`, data: [D('Shots from quick attacks', V.quick.length + ' of ' + shotsAgainst), D('Expected goals from them', f2(sum(V.quick, (x) => x.xg))), D('Fastest: seconds to shot', q && q.raw ? f1(q.raw.moveSecs) : '–')] } }; }
      case 'aerial': { const hd = V.air, other = c.against.filter((x) => hd.indexOf(x) < 0); return { change: 'Organised defending page: lower the line, or put a taller, stronger centre-back where the ball is arriving. Check who is marking at the back post on the Set pieces page.',
        maths: { topic: 'Statistics: comparing two means', why: 'Whether headers and other shots are really different chances, or the difference is noise, is a two-sample t-test: it needs the means, the spreads and the sample sizes.', task: 'Compute the mean xG of the headers and of the other shots, and decide whether a Welch t-test would call the difference real with samples this small.', data: [D('Headers / aerial', hd.length + ', mean ' + f2(hd.length ? sum(hd, (x) => x.xg) / hd.length : 0) + ' xG'), D('Other shots', other.length + ', mean ' + f2(other.length ? sum(other, (x) => x.xg) / other.length : 0) + ' xG')] } }; }
      case 'setpiece_against': { const corners = V.o.others.filter((e) => e.type === 'restart' && e.kind === 'corner').length; return { change: 'Set pieces page: change the number of corner markers, or switch between marking and a zone. Look at where the shots came from on the Set pieces investigation.',
        maths: { topic: 'Combinatorics and rates', why: `Five markers against five attackers can be paired in 5! = 120 ways, which is why man-marking breaks down; a zone removes the choice. The rate of danger per corner tells you whether the set pieces really are worse than usual.`, task: `Work out the expected goals per corner conceded, and compare it with the 0.03 to 0.04 that a typical corner is worth.`, data: [D('Set-piece shots against', V.sp.length), D('Expected goals from them', f2(sum(V.sp, (x) => x.xg))), D('Corners won by ' + opp, corners)] } }; }
      case 'giveaways': { const base = shotsAgainst / (5400 / 12); return { change: 'Build-up page: a shorter first pass and "Secure it first" on the attacking transition. Switch on the Passing lanes overlay to find a safe outlet for the man who gives it away.',
        maths: { topic: 'Conditional probability and relative risk', why: 'How dangerous is a give-away in your own half? Compare the chance of a shot in the next twelve seconds after one with the chance in any twelve seconds: their ratio is the relative risk.', task: `P(shot within 12 s | give-away) is ${V.costly.length} out of ${V.lostPasses.length}. The baseline chance of a shot against in any 12 s window is ${shotsAgainst} shots in 450 windows. Work out both and their ratio.`, data: [D('Give-aways in own half', V.lostPasses.length), D('Followed by a shot within 12 s', V.costly.length), D('Baseline shots in 450 windows', shotsAgainst), D('Baseline per window', f2(base))] } }; }
      case 'passer_poor': { const l = V.lines[0]; return { change: `Build-up page: select ${pName2(V, l.k)} and give the ball-player a nearer option (drag a team-mate within 10 m), or change his role so he plays shorter. The Passing lanes overlay shows what he is up against.`,
        maths: { topic: 'Confidence intervals for a proportion', why: `${pc(l.ok, l.n)}% completed out of ${l.n} sounds low, but with a sample this size the interval is wide. A 95% interval p̂ ± 1.96√(p̂(1−p̂)/n) says whether the ${pc(l.e, l.n)}% expected is really outside what he achieved.`, task: 'Work out the 95% interval for his completion rate and say whether the expected rate lies inside it.', data: [D('Passes', l.n), D('Completed', l.ok), D('Expected completions', f1(l.e))] } }; }
      case 'pressure': { const fp = V.press.filter((q) => q.res !== 1 && Number.isFinite(q.x) && q.tx != null)[0]; return { change: 'Build-up and Play through midfield pages: bring a midfielder within 10 m of the ball-player so the pass is short and the receiver is not alone. The Space control overlay shows where there is room.',
        maths: { topic: 'Vectors and coordinate geometry', why: 'A pass is a vector. Its length and direction, and how close the nearest defender is to the line it travels along, decide whether it gets through.', task: fp ? 'Work out the length of the failed pass below from its start and end coordinates, and its angle from the goal line. Then compare the length with the recorded figure.' : 'Take any failed pass from the Pass map: work out its length and angle from its start and end coordinates.', data: fp ? [D('From', '(' + f1(fp.x) + ', ' + f1(fp.y) + ')'), D('To', '(' + f1(fp.tx) + ', ' + f1(fp.ty) + ')'), D('Recorded length', f1(fp.dist) + ' m'), D('Lane clearance', f1(fp.lane) + ' m'), D('Closest opponent to receiver', f1(fp.press) + ' m')] : [] } }; }
      case 'entries': { const wide = V.entries.filter((q) => q.ty != null && Math.abs(q.ty - 34) > 14), cen = V.entries.filter((q) => q.ty != null && Math.abs(q.ty - 34) <= 14), ok = (a) => a.filter((q) => q.res === 1).length; return { change: 'Final third page: change "How we create" between "Get it wide and cross" and "Through the middle" to match whichever of the two below works better.',
        maths: { topic: 'Probability trees and comparing proportions', why: 'Which entry works better, and is the gap real? Compare the two completion rates, then multiply by how often each entry leads to a shot to find what each route is worth.', task: 'Work out the completion rate for each route, and the difference in percentage points. Then say how many entries you would need of each to be sure the gap is not luck.', data: [D('Entries through the middle', cen.length + ', ' + ok(cen) + ' completed'), D('Entries out wide', wide.length + ', ' + ok(wide) + ' completed')] } }; }
      case 'sterile': return { change: 'Final third page: raise the tempo and choose "Through the middle" or "Shoot on sight" so possession turns into chances sooner. Check the Pass map filtered to "Into the box" for how often the ball gets there.',
        maths: { topic: 'Ratios and correlation', why: 'Possession only matters if it creates chances. Expected goals per 100 passes measures that directly, and across a season the correlation between possession and chance quality says whether having the ball is what is driving your results.', task: `Work out expected goals per 100 passes for both sides this match. With three or more matches, plot possession against expected goals and work out the correlation coefficient.`, data: [D(us + ' passes', V.total), D(us + ' xG', f2(V.xf)), D(opp + ' passes', V.oTotal), D(opp + ' xG', f2(V.xa))] } };
      case 'duels_own': return { change: 'Organised defending page: drop the line a little or put a second player near the ball so no defender is left one-against-one. The Lines and press overlay shows the gaps.',
        maths: { topic: 'Hypothesis test for a proportion', why: `${V.ownWon} won out of ${V.own.length} is below half, but is it far enough below to be a real weakness? A z-test for a proportion against 0.5 answers that.`, task: `z = (p̂ − 0.5) ÷ √(0.5 × 0.5 ÷ n). Work it out for ${V.ownWon} of ${V.own.length}, and say what it means at the 5% level.`, data: [D('Duels in own third', V.own.length), D('Won', V.ownWon)] } };
      case 'takeons_bad': { const bands = [['Under 2 m', 0, 2], ['2 to 4 m', 2, 4], ['4 m or more', 4, 99]].map(([l, a, b]) => { const g = V.drib.filter((x) => x.def >= a && x.def < b); return D(l + ' from the defender', g.filter((x) => x.ok).length + ' of ' + g.length); }); return { change: 'Final third page: set "Taking players on" to "Move it quickly" for the team, or only for the players below.',
        maths: { topic: 'Rates and the break-even point', why: 'A take-on is worth it only when it succeeds more often than the cost of losing the ball allows. That break-even rate depends on how much a lost ball costs you.', task: 'If a successful take-on is worth +0.04 xG and a lost ball costs −0.02 xG, what success rate is needed to break even? Compare it with the rates below.', data: bands } }; }
      case 'discipline': return { change: 'Tactics: lower tackling aggression, and on the Defensive transition page choose "Never foul". The players on a yellow are the ones to rest or protect.',
        maths: { topic: 'The Poisson distribution', why: `${V.cards.length} cards in a match is a count of rare events: the Poisson distribution says how unusual it is compared with your normal rate.`, task: `If a typical match brings 2 cards, find P(X ≥ ${Math.max(3, V.cards.length)}) for a Poisson distribution with λ = 2.`, data: [D('Fouls', V.fouls), D('Cards', V.cards.length)] } };
      case 'spell_against': return { change: 'Check what changed in that spell: a substitution, a tired player (Squad page shows condition), or a change in how the opposition played. Plan the change a few minutes earlier next time.',
        maths: { topic: 'Averages and spread over time', why: 'A spell only stands out if it is far above the others. The mean and standard deviation of the six fifteen-minute periods say how far.', task: 'Work out the mean and standard deviation of the six values below, and how many standard deviations the worst spell is above the mean.', data: V.xaP.map((v, i) => D(['1-15', '16-30', '31-45', '46-60', '61-75', '76-90'][i] + "'", f2(v) + ' xG against')) } };
      case 'outchanced': return { change: 'Look at the other findings for where the chances came from, then change that phase on the Tactics page.',
        maths: { topic: 'Paired t-test across matches', why: 'One match is a sample of one. Across a run of matches, whether you are really out-chanced is a paired t-test on the chance difference, and its interval says how sure you can be.', task: `Record the xG difference (${f2(V.xf)} − ${f2(V.xa)} = ${f2(V.xf - V.xa)}) for each match, and once you have at least eight work out the mean, the standard error and a 95% interval.`, data: [D('xG for', f2(V.xf)), D('xG against', f2(V.xa))] } };
      case 'wide_chances': { const big = V.big, wide = big.filter((q) => Math.abs(q.y - 34) > 12); return { change: 'Organised defending page: narrow the full-backs slightly or cover the flank with a wide midfielder; the Lines and press overlay shows how much space is left wide.',
        maths: { topic: 'The binomial distribution', why: 'If chances came from wide and central areas equally, how likely is it that this many were wide? The binomial distribution gives the chance, and so whether this is a pattern.', task: `Work out P(X ≥ ${wide.length}) for a binomial distribution with n = ${big.length} and p = 0.5.`, data: [D('Best chances against', big.length), D('From wide areas', wide.length)] } }; }
      case 'high_regains': { const after = c.shots.filter((x) => V.high.some((d) => x.t > d.t && x.t <= d.t + 10)); return { change: 'Organised defending page, Press: widen the area where you press, so more of the ball is won in their half. These regains are your best source of chances.',
        maths: { topic: 'Rates and expected value', why: 'What is a high regain worth? The expected goals that follow one, per regain, is its value, and multiplying by how many you can add shows what pressing higher would be worth.', task: `Work out the expected goals per high regain, then how much a further 5 regains a match would add over a season of 14 matches.`, data: [D('High regains', V.high.length), D('Shots within 10 s of one', after.length), D('Expected goals from them', f2(sum(after, (x) => x.xg)))] } }; }
      case 'finishing': return { change: 'Do not rely on it. Finishing above the chances tends to fall back, so judge the side by the chances created.',
        maths: { topic: 'Regression to the mean', why: `${V.gf} goals from ${f2(V.xf)} expected is the sort of gap that fades. Under a Poisson model, scoring this many or more has a probability you can compute: the smaller it is, the more of it was luck.`, task: `Take λ = ${f2(V.xf)} and work out P(X ≥ ${V.gf}).`, data: [D('Goals', V.gf), D('Expected goals', f2(V.xf))] } };
      default: return null;
    }
  }
  const pName2 = (V, n) => V.pName(n);
  const wbText = (f) => {
    const fx = f.fix; if (!fx) return '';
    const NL = String.fromCharCode(10), m = fx.maths;
    return [f.title, '', f.text, '', 'What to try', fx.change, '', 'The maths: ' + m.topic, m.why, '', 'The example'].concat((m.data || []).map((r) => r[0] + ': ' + r[1])).concat(['', 'What to work out', '1. ' + m.task, '', 'My working', '']).join(NL);
  };
  const fixHtml = (f) => !f.fix ? '' : `<div class="rp-fix"><p class="rp-try"><b>What to try.</b> ${esc(f.fix.change)}</p><div class="rp-maths"><b>Where your maths helps: ${esc(f.fix.maths.topic)}</b><p>${esc(f.fix.maths.why)}</p>${(f.fix.maths.data || []).length ? `<table class="rp-data"><tbody>${f.fix.maths.data.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}</tbody></table>` : ''}<p class="rp-task"><b>To work out:</b> ${esc(f.fix.maths.task)}</p><button type="button" class="el-go" data-rpwb="${esc(wbText(f))}">Work it out in the Workbook</button></div></div>`;

  // ---------- one match, from one side ----------
  // Returns { good: [...], bad: [...], facts } where each finding is { id, score, title, text, look, who }. score is how far from ordinary it is (0 to 1 and a bit).
  function matchFindings(lg, fx, side) {
    const E = FM.explorer, c = E.makeCtx(lg, fx, side), o = E.makeCtx(lg, fx, side === 'us' ? 'them' : 'us');
    const good = [], bad = [], add = (list, f) => list.push(f);
    const xf = sum(c.shots, (s) => s.xg), xa = sum(c.against, (s) => s.xg), gf = c.shots.filter((s) => s.outcome === 'goal').length, ga = c.against.filter((s) => s.outcome === 'goal').length;
    const pName = (n) => c.name(n);
    const dist = (s) => Math.hypot(105 - s.x, 34 - s.y);
    const opp = c.opp.name, us = c.team.name;

    // finishing against the chances made
    const fin = gf - xf;
    const missed = c.shots.filter((s) => s.outcome !== 'goal' && s.xg >= 0.25).sort((a, b) => b.xg - a.xg);
    if (fin >= 1.3 && gf >= 2) add(good, { id: 'finishing', score: Math.min(1.2, fin / 3), title: 'Clinical finishing', text: `${us} scored ${gf} from ${f2(xf)} expected goals, ${f1(fin)} more than the chances deserved. ${list(c.shots.filter((s) => s.outcome === 'goal').map((s) => pName(s.player) + ' (' + min(s.t) + "', xG " + f2(s.xg) + ')'))} scored.`, look: 'Finishing at this level rarely lasts: look at whether the chances were as good next time.', who: null });
    if (fin <= -1.3 && missed.length) add(bad, { id: 'wasteful', score: Math.min(1.2, -fin / 3), title: 'Wasteful in front of goal', text: `${us} scored ${gf} from ${f2(xf)} expected goals. The best chances that were not taken: ${list(missed.slice(0, 3).map((s) => pName(s.player) + ' at ' + min(s.t) + "' (xG " + f2(s.xg) + ', ' + (s.outcome === 'saved' ? 'saved' : s.outcome === 'blocked' ? 'blocked' : 'off target') + ')'))}.`, look: 'Check whether these shots were taken under pressure or from tight angles, and who is taking them.', who: missed[0] ? pName(missed[0].player) : null });

    // the balance of chances
    const dx = xf - xa;
    if (dx >= 0.9) add(good, { id: 'chances', score: Math.min(1.2, dx / 2.5), title: 'Created the better chances', text: `The chances were ${f2(xf)} expected goals to ${f2(xa)}, from ${c.shots.length} shots to ${c.against.length}${gf <= ga ? ', though the score did not show it' : ''}.`, look: '', who: null });
    if (dx <= -0.9) add(bad, { id: 'outchanced', score: Math.min(1.2, -dx / 2.5), title: 'Gave up the better chances', text: `${opp} had ${f2(xa)} expected goals to ${f2(xf)}, from ${c.against.length} shots to ${c.shots.length}${gf >= ga ? ', and were unlucky not to have got more' : ''}.`, look: 'The sections below show where those chances came from.', who: null });

    // speculative shooting
    const far = c.shots.filter((s) => dist(s) > 20 && s.outcome !== 'goal'), farAll = c.shots.filter((s) => dist(s) > 20);
    if (c.shots.length >= 6 && farAll.length / c.shots.length >= 0.45) add(bad, { id: 'speculative', score: Math.min(1, farAll.length / c.shots.length), title: 'Too many shots from distance', text: `${farAll.length} of ${c.shots.length} shots came from outside 20 m. They averaged ${f2(sum(farAll, (s) => s.xg) / farAll.length)} expected goals each and made up ${pc(sum(farAll, (s) => s.xg), xf)}% of the total chance quality.`, look: 'More patience, or more bodies in the box, would turn some of these into better chances.', who: null });
    const inBox = c.shots.filter((s) => dist(s) <= 14);
    if (c.shots.length >= 8 && inBox.length / c.shots.length >= 0.6) add(good, { id: 'boxshots', score: 0.6, title: 'Shots taken from good places', text: `${inBox.length} of ${c.shots.length} shots came from inside 14 m of goal, averaging ${f2(sum(inBox, (s) => s.xg) / inBox.length)} expected goals each.`, look: '', who: null });

    // how the chances against arrived
    const big = c.against.filter((s) => s.xg >= 0.2);
    const quick = c.against.filter((s) => s.raw && s.raw.movePasses != null && s.raw.movePasses <= 3 && s.raw.moveSecs <= 8 && !s.setPiece), air = c.against.filter((s) => (s.raw && s.raw.leadAir) || s.setPiece === 'header'), sp = c.against.filter((s) => s.setPiece === 'freekick' || s.setPiece === 'corner' || s.setPiece === 'penalty');
    if (c.against.length >= 4 && quick.length >= 3 && quick.length / c.against.length >= 0.4) add(bad, { id: 'breaks', score: Math.min(1.2, quick.length / c.against.length + sum(quick, (s) => s.xg) / 2), title: 'Opened up by quick attacks', text: `${quick.length} of ${opp}'s ${c.against.length} shots came within eight seconds and three passes of them winning the ball, worth ${f2(sum(quick, (s) => s.xg))} expected goals. ${list(Array.from(new Set(quick.filter((s) => s.xg >= 0.15).map((s) => min(s.t) + "'"))).slice(0, 3)) ? 'The most dangerous came at ' + list(Array.from(new Set(quick.filter((s) => s.xg >= 0.15).map((s) => min(s.t) + "'"))).slice(0, 3)) + '.' : ''}`, look: 'The shape when the ball is lost: the defensive transition and how many players are caught ahead of the ball.', who: null });
    if (air.length >= 3 && air.length / Math.max(1, c.against.length) >= 0.3) add(bad, { id: 'aerial', score: Math.min(1, air.length / c.against.length + 0.2), title: 'Chances from the air', text: `${air.length} of ${opp}'s ${c.against.length} shots were headers or came from balls over the top, worth ${f2(sum(air, (s) => s.xg))} expected goals.`, look: 'The back line\'s height and the cover for crosses and set pieces.', who: null });
    if (sp.length >= 2) add(bad, { id: 'setpiece_against', score: Math.min(1, sum(sp, (s) => s.xg) / 1.2 + 0.2), title: 'Dangerous from set pieces', text: `${plural(sp.length, 'shot')} from free kicks, corners or penalties against, ${f2(sum(sp, (s) => s.xg))} expected goals in all.`, look: 'Marking at corners and the wall at free kicks.', who: null });
    if (c.against.length <= 8 && xa < 0.9 && c.against.length) add(good, { id: 'controlled', score: Math.min(1, (1.3 - xa) / 1.3 + 0.2), title: 'Gave very little away', text: `${opp} managed ${plural(c.against.length, 'shot')} worth ${f2(xa)} expected goals all match${ga === 0 ? ', and did not score' : ''}.`, look: '', who: null });
    if (big.length >= 3) { const wide = big.filter((s) => Math.abs(s.y - 34) > 12); if (wide.length / big.length >= 0.7) add(bad, { id: 'wide_chances', score: 0.7, title: 'Chances conceded from the flanks', text: `${wide.length} of the ${big.length} best chances against (expected goals 0.2 or more) came from wide areas.`, look: 'The full-backs and wide midfielders, and who covers the cross.', who: null }); }

    // giving the ball away in our own half, and what it cost
    const lostPasses = c.passes.filter((p) => p.res !== 1 && p.x < 52.5);
    const costly = lostPasses.map((p) => ({ p, shot: c.against.find((s) => s.t > p.t && s.t <= p.t + 12) })).filter((x) => x.shot);
    if (costly.length >= 2) {
      const by = {}; costly.forEach((x) => { by[x.p.from] = (by[x.p.from] || 0) + 1; });
      const top = Object.keys(by).sort((a, b) => by[b] - by[a])[0];
      add(bad, { id: 'giveaways', score: Math.min(1.2, costly.length / 4 + sum(costly, (x) => x.shot.xg) / 2), title: 'Careless in our own half', text: `${plural(costly.length, 'give-away')} in our half led to an opposition shot within twelve seconds (${f2(sum(costly, (x) => x.shot.xg))} expected goals). ${by[top] >= 2 ? pName(+top) + ' was behind ' + by[top] + ' of them.' : ''}`, look: 'The pass chosen under pressure: a safer outlet or a clearance would have cost less.', who: by[top] >= 2 ? pName(+top) : null });
    }

    // passing against what the situation allowed
    const per = {}; c.passes.forEach((p) => { const b = per[p.from] || (per[p.from] = { n: 0, ok: 0, e: 0 }); b.n++; if (p.res === 1) b.ok++; b.e += p.p; });
    const lines = Object.keys(per).filter((k) => per[k].n >= 12).map((k) => ({ k: +k, n: per[k].n, ok: per[k].ok, e: per[k].e, diff: per[k].ok - per[k].e })).sort((a, b) => a.diff - b.diff);
    if (lines.length && lines[0].diff <= -3) { const l = lines[0]; add(bad, { id: 'passer_poor', score: Math.min(1.1, -l.diff / 7), title: pName(l.k) + ' struggled to keep the ball', text: `${pName(l.k)} completed ${pc(l.ok, l.n)}% of ${l.n} passes, where the lanes and pressure should have allowed ${pc(l.e, l.n)}%: ${f1(-l.diff)} passes fewer than expected.`, look: 'Whether he is being asked to play passes beyond his range, or is being closed down too easily.', who: pName(l.k) }); }
    const bestP = lines[lines.length - 1];
    if (bestP && bestP.diff >= 3) add(good, { id: 'passer_good', score: Math.min(1.1, bestP.diff / 7), title: pName(bestP.k) + ' kept the ball well', text: `${pName(bestP.k)} completed ${pc(bestP.ok, bestP.n)}% of ${bestP.n} passes, against ${pc(bestP.e, bestP.n)}% expected from where and how he was passing: ${f1(bestP.diff)} more than expected.`, look: '', who: pName(bestP.k) });
    const press = c.passes.filter((p) => p.press != null && p.press >= 0 && p.press < 4);
    if (press.length >= 10) { const ok = press.filter((p) => p.res === 1).length, e = sum(press, (p) => p.p), d = (ok - e) / press.length * 100;
      if (d <= -9) add(bad, { id: 'pressure', score: Math.min(1.1, -d / 20), title: 'Poor under pressure', text: `With an opponent within 4 m of the receiver, ${pc(ok, press.length)}% of ${press.length} passes were completed, against ${pc(e, press.length)}% expected.`, look: 'The receiving angles and how close the nearest team-mate is to the man on the ball.', who: null });
      if (d >= 7) add(good, { id: 'pressure_good', score: Math.min(1.1, d / 18), title: 'Composed under pressure', text: `${pc(ok, press.length)}% of ${press.length} passes were completed with an opponent within 4 m of the receiver, against ${pc(e, press.length)}% expected.`, look: '', who: null }); }

    // getting into the final third
    const entries = c.passes.filter((p) => p.tx != null && p.tx >= 70 && p.x < 70), entOk = entries.filter((p) => p.res === 1).length;
    if (entries.length >= 8 && entOk / entries.length < 0.5) add(bad, { id: 'entries', score: Math.min(1, (0.6 - entOk / entries.length) * 2 + 0.3), title: 'Final-third entries mostly failed', text: `Only ${entOk} of ${entries.length} passes into the final third were completed (${pc(entOk, entries.length)}%).`, look: 'The pass that breaks the last line: its length and the pressure on the receiver.', who: null });
    if (entries.length >= 14 && entOk / entries.length >= 0.65) add(good, { id: 'entries_good', score: Math.min(1, entOk / entries.length), title: 'Moved the ball into the final third often and safely', text: `${entOk} of ${entries.length} passes into the final third were completed (${pc(entOk, entries.length)}%).`, look: '', who: null });
    const total = c.passes.length, oTotal = o.passes.length, share = total / Math.max(1, total + oTotal);
    if (share >= 0.58 && dx < 0.2) add(bad, { id: 'sterile', score: Math.min(1, (share - 0.5) * 3 + 0.2), title: 'Possession without penetration', text: `${us} made ${pc(total, total + oTotal)}% of the passes but the chances were ${f2(xf)} expected goals to ${f2(xa)}.`, look: 'How the ball is moved once it reaches the final third.', who: null });
    if (share <= 0.42 && dx >= 0.3) add(good, { id: 'efficient', score: Math.min(1, (0.5 - share) * 3 + 0.2), title: 'Efficient without the ball', text: `${opp} made ${pc(oTotal, total + oTotal)}% of the passes, yet the chances were ${f2(xf)} expected goals to ${f2(xa)} in ${us}'s favour.`, look: '', who: null });

    // duels
    const won = c.tackles.filter((t) => t.ok), own = c.tackles.filter((t) => t.x < 35), ownWon = own.filter((t) => t.ok).length, high = won.filter((t) => t.x > 52.5);
    if (own.length >= 6 && ownWon / own.length <= 0.4) add(bad, { id: 'duels_own', score: Math.min(1, (0.55 - ownWon / own.length) * 2.2), title: 'Beaten in duels in our own third', text: `Only ${ownWon} of ${own.length} duels in our own third were won (${pc(ownWon, own.length)}%).`, look: 'Who is being left one-against-one, and how close the cover is.', who: null });
    if (high.length >= 7) add(good, { id: 'high_regains', score: Math.min(1, high.length / 14), title: 'Winning the ball high up the pitch', text: `${high.length} duels were won in the opposition half, ${won.length ? pc(high.length, won.length) + '% of all that were won' : ''}.`, look: '', who: null });
    const drib = c.dribbles, dOk = drib.filter((d) => d.ok).length;
    if (drib.length >= 5 && dOk / drib.length >= 0.6) add(good, { id: 'takeons', score: dOk / drib.length * 0.7, title: 'Take-ons worked', text: `${dOk} of ${drib.length} take-ons beat the defender (${pc(dOk, drib.length)}%).`, look: '', who: null });
    if (drib.length >= 5 && dOk / drib.length <= 0.3) add(bad, { id: 'takeons_bad', score: (0.45 - dOk / drib.length) * 1.6, title: 'Take-ons lost the ball', text: `Only ${dOk} of ${drib.length} take-ons beat the defender; the rest gave the ball away.`, look: 'Whether the ball-carriers are going at defenders who are not close enough to be beaten.', who: null });

    // when it happened
    const periods = [0, 900, 1800, 2700, 3600, 4500], names = ["1' to 15'", "16' to 30'", "31' to 45'", "46' to 60'", "61' to 75'", "76' to 90'"];
    const inP = (s, i) => s.t >= periods[i] && s.t < (periods[i + 1] || 1e9);
    const xaP = names.map((_, i) => sum(c.against.filter((s) => inP(s, i)), (s) => s.xg)), xfP = names.map((_, i) => sum(c.shots.filter((s) => inP(s, i)), (s) => s.xg));
    const iA = xaP.indexOf(Math.max.apply(null, xaP)), iF = xfP.indexOf(Math.max.apply(null, xfP));
    if (xa >= 1.2 && xaP[iA] / xa >= 0.45) add(bad, { id: 'spell_against', score: Math.min(1, xaP[iA] / xa), title: 'Vulnerable from ' + names[iA], text: `${pc(xaP[iA], xa)}% of the chances against (${f2(xaP[iA])} of ${f2(xa)} expected goals) came in that spell.`, look: 'What changed then: a substitution, a tired player, or a change in how the opposition played.', who: null });
    if (xf >= 1.5 && xfP[iF] / xf >= 0.45) add(good, { id: 'spell_for', score: Math.min(1, xfP[iF] / xf), title: 'Strongest from ' + names[iF], text: `${pc(xfP[iF], xf)}% of the chance quality (${f2(xfP[iF])} of ${f2(xf)} expected goals) came in that spell.`, look: '', who: null });

    // discipline and set pieces for
    const cards = c.others.filter((e) => e.type === 'foul' && e.card), fouls = c.others.filter((e) => e.type === 'foul').length;
    if (cards.length >= 3 || fouls >= 14) add(bad, { id: 'discipline', score: Math.min(1, cards.length / 4 + fouls / 30), title: 'Discipline', text: `${plural(fouls, 'foul')} and ${plural(cards.length, 'card')}${cards.length ? ' (' + list(cards.map((e) => pName(e.player))) + ')' : ''}.`, look: 'Players already on a yellow, and where the fouls are being given away.', who: null });
    const sf = c.shots.filter((s) => s.setPiece === 'freekick' || s.setPiece === 'corner' || s.setPiece === 'penalty');
    if (sf.length >= 2) add(good, { id: 'setpiece_for', score: Math.min(1, sum(sf, (s) => s.xg) / 1.2), title: 'Threat from set pieces', text: `${plural(sf.length, 'shot')} from set pieces, ${f2(sum(sf, (s) => s.xg))} expected goals${sf.some((s) => s.outcome === 'goal') ? ', including a goal' : ''}.`, look: '', who: null });

    const V = { c, o, us, opp, xf, xa, gf, ga, missed, farAll, quick, air, sp, costly, lostPasses, lines, press, entries, entOk, total, oTotal, own, ownWon, drib, dOk, cards, fouls, xaP, iA, big, high, won, pName };
    good.concat(bad).forEach((f) => { try { f.fix = fixFor(f, V); } catch (e) { f.fix = null; } });
    const rank = (a) => a.sort((x, y) => y.score - x.score);
    const facts = { gf, ga, xf, xa, shots: c.shots.length, against: c.against.length, share, passes: total, opp, us, c };
    return { good: rank(good), bad: rank(bad), facts };
  }

  // ---------- the write-up ----------
  const card = (f, kind) => `<article class="rp-card ${kind}"><h5>${esc(f.title)}</h5><p>${esc(f.text)}</p>${f.fix ? fixHtml(f) : (f.look ? `<p class="rp-look">Worth looking at: ${esc(f.look)}</p>` : '')}</article>`;
  function lead(F, n) {
    const r = F.gf > F.ga ? 'won' : F.gf < F.ga ? 'lost' : 'drew', rs = F.gf + '-' + F.ga;
    let s = `${F.us} ${r} ${rs} against ${F.opp}. The chances were ${f2(F.xf)} expected goals to ${f2(F.xa)}, from ${plural(F.shots, 'shot')} to ${F.against}, and ${F.us} had ${Math.round(F.share * 100)}% of the passes.`;
    const luck = (F.gf - F.ga) - (F.xf - F.xa);
    if (luck >= 1.5) s += ' The score flattered them: the chances alone would not have given that margin.'; else if (luck <= -1.5) s += ' The score did not reflect the play: the chances pointed to a better result.';
    else s += ' The result was about what the chances deserved.';
    return s;
  }
  FM.report = {
    matchHtml(lg, fx, side) {
      const F = matchFindings(lg, fx, side), top = (a) => a.slice(0, 5);
      const goods = top(F.good), bads = top(F.bad);
      return `<div class="rp"><p class="rp-lead">${esc(lead(F.facts))}</p><div class="rp-cols"><section><h4 class="rp-h good">What went well</h4>${goods.length ? goods.map((f) => card(f, 'good')).join('') : '<p class="note">Nothing stood out as clearly good in the numbers. That is itself a finding: the match did not give the side a platform to build on.</p>'}</section>
        <section><h4 class="rp-h bad">What went wrong</h4>${bads.length ? bads.map((f) => card(f, 'bad')).join('') : '<p class="note">Nothing stood out as clearly wrong. A match with no big weakness is worth noting too.</p>'}</section></div>
        <p class="ex-note">Each point is only written when the figure is well away from ordinary, and the biggest gaps come first. The other pages of Analysis show the maps and tables behind them.</p></div>`;
    },
    // across the matches played with a record: what keeps coming up
    seasonHtml(lg) {
      const E = FM.explorer, fxs = E.playedWithLogs(lg).filter((f) => !f.preseason && !f.friendly), used = fxs.length ? fxs : E.playedWithLogs(lg);
      if (!used.length) return '<p class="note">Once matches with a record have been played, this page collects what keeps coming up.</p>';
      const all = used.map((fx) => ({ fx, F: matchFindings(lg, fx, 'us') })), n = all.length;
      const group = (kind) => { const g = {}; all.forEach(({ F, fx }) => F[kind].forEach((f) => { const e = g[f.id] || (g[f.id] = { id: f.id, n: 0, score: 0, items: [], title: f.title }); e.n++; e.score += f.score; e.items.push({ f, fx }); })); return Object.keys(g).map((k) => g[k]).sort((a, b) => (b.n - a.n) || (b.score - a.score)); };
      const gs = group('good'), bs = group('bad');
      const GENERIC = { passer_poor: 'Players losing the ball in passes they should complete', passer_good: 'Players keeping the ball better than expected' };
      const row = (e, kind) => { const last = e.items[e.items.length - 1], names = {}; e.items.forEach(({ f }) => { if (f.who) names[f.who] = (names[f.who] || 0) + 1; }); const ranked = Object.keys(names).sort((a, b) => names[b] - names[a]), who = ranked[0];
        const generic = !!GENERIC[e.id], named = ranked.length ? ' Named: ' + ranked.slice(0, 4).map((k) => k + (names[k] > 1 ? ' (' + names[k] + ' matches)' : '')).join(', ') + '.' : '';
        return `<article class="rp-card ${kind}"><h5>${esc(GENERIC[e.id] || e.title)}</h5><p>Came up in <b>${e.n} of ${n}</b> match${n === 1 ? '' : 'es'}${!generic && e.n >= 2 && who && names[who] >= 2 ? ', with ' + esc(who) + ' involved in ' + names[who] : ''}. ${generic ? esc(named.trim()) + ' The latest: ' + esc(last.f.text) : 'The latest: ' + esc(last.f.text)}</p>${e.n >= 3 && n >= 5 ? `<p class="rp-look">That is not a one-off: it has shown up in ${Math.round(100 * e.n / n)}% of the matches.</p>` : ''}${last.f.fix ? fixHtml(last.f) : (last.f.look ? `<p class="rp-look">Worth looking at: ${esc(last.f.look)}</p>` : '')}</article>`; };
      const recurring = (a) => a.filter((e) => e.n >= (n >= 4 ? 2 : 1)).slice(0, 6);
      const start = bs.filter((e) => e.items[e.items.length - 1].f.fix).sort((a, b) => (b.n * (b.score / b.n + 0.3)) - (a.n * (a.score / a.n + 0.3))).slice(0, 3);
      const startHtml = start.length ? `<div class="rp-start"><h4 class="rp-h">Where to start</h4><ol>${start.map((e) => { const f = e.items[e.items.length - 1].f; return `<li><b>${esc(GENERIC[e.id] || e.title)}</b> (${e.n} of ${n} match${n === 1 ? '' : 'es'}): ${esc(f.fix.change)}</li>`; }).join('')}</ol></div>` : '';
      const fa = FM.seasonAnalysis ? FM.seasonAnalysis(lg, { compact: true }) : '';
      const w = n >= 3 ? '' : '<p class="ex-note">Only ' + n + ' match' + (n === 1 ? '' : 'es') + ' with a record so far: a pattern needs several matches before it means much.</p>';
      return `<div class="rp"><p class="rp-lead">${n} match${n === 1 ? '' : 'es'} with a record. What keeps coming up:</p>${w}${startHtml}<div class="rp-cols"><section><h4 class="rp-h good">Strengths that keep showing</h4>${recurring(gs).length ? recurring(gs).map((e) => row(e, 'good')).join('') : '<p class="note">No strength has repeated yet.</p>'}</section>
        <section><h4 class="rp-h bad">Weaknesses that keep showing</h4>${recurring(bs).length ? recurring(bs).map((e) => row(e, 'bad')).join('') : '<p class="note">No weakness has repeated yet.</p>'}</section></div>${fa}</div>`;
    },
  };
  const css = '.rp { display: grid; gap: 14px; } .rp-lead { margin: 0; font-size: 1.02rem; line-height: 1.6; max-width: 90ch; } .rp-cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; align-items: start; } @media (max-width: 900px) { .rp-cols { grid-template-columns: minmax(0, 1fr); } }'
    + ' .rp-h { margin: 0 0 8px; font: 700 .8rem var(--sans); letter-spacing: .1em; text-transform: uppercase; } .rp-h.good { color: #7fe3a6; } .rp-h.bad { color: #ff8a7a; } .rp-card { border: 1px solid var(--line); border-left-width: 3px; padding: 12px 14px; margin-bottom: 10px; background: rgba(255,255,255,.03); } .rp-card.good { border-left-color: #7fe3a6; } .rp-card.bad { border-left-color: #ff8a7a; }'
    + ' .rp-card h5 { margin: 0 0 4px; font: 700 .98rem var(--sans); } .rp-card p { margin: 0; line-height: 1.55; font-size: .92rem; } .rp-card p + p { margin-top: 6px; } .rp-look { opacity: .75; font-size: .84rem !important; } .rp-fix { margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--line); display: grid; gap: 8px; } .rp-try { font-size: .9rem !important; } .rp-maths { border: 1px solid var(--line); background: rgba(242,193,78,.06); padding: 10px 12px; display: grid; gap: 6px; } .rp-maths b { font: 700 .82rem var(--sans); color: var(--gold); } .rp-maths p { font-size: .86rem !important; margin: 0 !important; } .rp-data { border-collapse: collapse; font-size: .84rem; } .rp-data td { padding: 2px 14px 2px 0; } .rp-data td:last-child { font-weight: 700; } .rp-task { opacity: .95; } .rp-maths .el-go { justify-self: start; } .rp-start { border: 1px solid var(--gold); padding: 12px 16px; background: rgba(242,193,78,.06); } .rp-start ol { margin: 6px 0 0; padding-left: 20px; display: grid; gap: 6px; font-size: .92rem; line-height: 1.5; }';
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-rpwb]'); if (b && FM.explorer && FM.explorer.openWorkbook) FM.explorer.openWorkbook(FM.curLeague, b.getAttribute('data-rpwb')); });
  if (!document.getElementById('rpCss')) { const st = document.createElement('style'); st.id = 'rpCss'; st.textContent = css; document.head.appendChild(st); }
  if (FM.explorer) {
    // these come first in the list
    FM.explorer.INV.unshift(
      { id: 'report_match', group: 'Report', title: 'Match report', tags: 'report write up summary what went well wrong weaknesses strengths insight analysis review match verdict', blurb: 'A write-up of the match: what went well, and what went wrong, with the figures behind each point.', needs: 'match', render(c) { return FM.report.matchHtml(c.lg, c.fx, c.teamId === c.lg.userId ? 'us' : 'them'); } },
      { id: 'report_season', group: 'Report', title: 'Season report', tags: 'report season write up what keeps coming up recurring weaknesses strengths pattern trend insight', blurb: 'Across every match with a record: the strengths and weaknesses that keep appearing.', needs: 'season', render() { return FM.report.seasonHtml(FM.curLeague); } });
  }
})();
