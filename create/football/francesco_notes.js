// Francesco, the assistant manager, has something to say after every match. What he says comes from what has just happened and where it leaves the club (the result and its size, the run
// the club is on, the table, the next opponent, the cup), written by code from a good many ways of saying each thing, and never the same line twice in a row.
(function () {
  const FM = (window.FM = window.FM || {});
  const ord = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10 < 4 ? n % 10 : 0]);

  FM.francescoNote = function (lg, fx) {
    if (!lg || !fx || lg.mp || fx.hg == null) return null;
    const me = lg.userId, home = fx.homeId === me, gf = home ? fx.hg : fx.ag, ga = home ? fx.ag : fx.hg, margin = gf - ga, opp = FM.teamById(lg, home ? fx.awayId : fx.homeId), oppName = opp ? opp.name : 'them';
    const won = fx.shootout ? fx.shootout.winnerId === me : gf > ga, drew = !fx.shootout && gf === ga, lost = !won && !drew;
    // the run the club is on, counting back from this match
    const played = lg.fixtures.filter((f) => f.played && !f.friendly && (f.homeId === me || f.awayId === me)).sort((a, b) => a.round - b.round);
    const res = played.map((f) => { const h = f.homeId === me, a = h ? f.hg : f.ag, b = h ? f.ag : f.hg; return a > b ? 'W' : a === b ? 'D' : 'L'; });
    const run = (pred) => { let n = 0; for (let i = res.length - 1; i >= 0 && pred(res[i]); i--) n++; return n; };
    const wins = run((r) => r === 'W'), losses = run((r) => r === 'L'), unbeaten = run((r) => r !== 'L'), winless = run((r) => r !== 'W');
    let rows = []; try { rows = FM.tableRows(lg); } catch (e) { rows = []; }
    const n = Math.max(2, rows.length), pos = rows.findIndex((r) => r.id === me) + 1, myRow = rows.find((r) => r.id === me), top = rows[0], dropPts = rows[n - 3] ? rows[n - 3].pts : 0;
    const gapTop = top && myRow ? top.pts - myRow.pts : 0, gapDrop = myRow ? myRow.pts - dropPts : 0, level = lg.divisionLevel || 1;
    const next = lg.fixtures.filter((f) => !f.played && (f.homeId === me || f.awayId === me)).sort((a, b) => a.round - b.round)[0];
    const nextOpp = next ? FM.teamById(lg, next.homeId === me ? next.awayId : next.homeId) : null, nextRow = nextOpp ? rows.find((r) => r.id === nextOpp.id) : null, nextPos = nextRow ? rows.findIndex((r) => r.id === nextOpp.id) + 1 : 0;
    const left = lg.fixtures.filter((f) => !f.played && (f.homeId === me || f.awayId === me)).length;
    const club = (FM.teamById(lg, me) || {}).name || 'the club';
    // a man who scored a hat-trick or more, if the match summary kept the goals
    let star = null; try { const g = (fx.summary && fx.summary.goals) || [], cnt = {}; g.filter((x) => x.team === me).forEach((x) => { cnt[x.n] = (cnt[x.n] || 0) + 1; }); const k = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0]; if (k && cnt[k] >= 2) { const p = (FM.teamById(lg, me).squad || []).find((q) => String(q.number) === String(k)); if (p) star = { name: p.name.split(' ').slice(-1)[0], goals: cnt[k] }; } } catch (e) { star = null; }
    const fill = (t) => t.replace(/\{opp\}/g, oppName).replace(/\{next\}/g, nextOpp ? nextOpp.name : 'the next one').replace(/\{club\}/g, club).replace(/\{pos\}/g, ord(pos)).replace(/\{gap\}/g, String(gapTop)).replace(/\{wins\}/g, String(wins)).replace(/\{losses\}/g, String(losses)).replace(/\{unb\}/g, String(unbeaten)).replace(/\{score\}/g, gf + '-' + ga).replace(/\{star\}/g, star ? star.name : 'the lads').replace(/\{left\}/g, String(left)).replace(/\{nextpos\}/g, ord(nextPos));
    const POOL = [];
    const add = (id, weight, lines) => POOL.push({ id, weight, lines });
    if (fx.cup || fx.stage) {
      if (won) add('cup_won', 9, ['We’re through, boss. {opp} down, and the cup keeps us dreaming.', 'Through in the cup. Not pretty, maybe, but nobody remembers that in the next round.', 'That’s {opp} gone. Another round of prize money and another night in the draw.', 'Cup run is alive, mate. Let the league look after itself for a minute and enjoy that.']);
      else add('cup_lost', 9, ['Cup’s gone, boss. It hurts, but it gives us clean weeks to work on the league.', 'Out against {opp}. Shake it off: the league is where this season gets decided now.', 'Not our night in the cup. We go again, and we go again soon.']);
    } else {
      if (won && wins >= 3 && level > 1 && pos <= 2) add('streak_up', 14, ['That’s {wins} in a row and we’re {pos}. That’s huge, mate. Beat {next} and we’re properly in it.', '{wins} wins on the spin, boss, and the top two is ours right now. Keep the head down, one more.', 'We’re flying. {wins} straight, {pos} in the table. {next} next: beat them and we are up there where we belong.']);
      if (won && wins >= 3) add('streak', 12, ['That’s huge, mate. {wins} wins in a row, we’re flying right now. Win the next one and we’re really up and running.', '{wins} on the bounce! The lads believe it now, boss. Don’t change a thing.', '{wins} straight wins. People are starting to talk about us, and I like it. {next} next.', 'Three, four, five in a row, who’s counting? Me. {wins}. Keep it going against {next}.']);
      if (won && margin >= 3) add('big_win', 13, ['{score}! That’s a statement, boss. {opp} will be thinking about that on the coach home.', 'Four, five, six goals, whatever it was, that was brilliant. Enjoy it. We still have {next} to think about.', '{score}, boss. That is the kind of afternoon that turns a season.', 'Total control. I haven’t seen a performance like that from us all year.']);
      if (won && star) add('star', 12, ['{star} with {goals} today, boss! Tell him he can have the match ball.', 'What a game for {star}. Two or more goals and everyone’s talking about him.'].map((t) => t.replace('{goals}', String(star.goals))));
      if (won && gapTop <= 3 && pos <= 2 && top && top.id !== me) add('title_race', 10, ['We’re {gap} off the top now. It’s a race, boss, and we are right in it.', 'That puts us {pos}. The lads at the top will be looking over their shoulders.']);
      if (won && pos === 1 && rows[1] && rows[1].pts < myRow.pts) add('top', 12, ['Top of the table, boss. Don’t say it too loudly, but it’s ours to lose.', 'We’re top. I’ve waited a long time to say that. {next} next, and the lads stay hungry.']);
      if (won && winsFrom(res) === 1 && losses === 0 && winless === 0 && (res.length > 1) && res[res.length - 2] === 'L') add('bounce', 12, ['That’s the reaction I wanted, boss. After last week, that’s the group showing what they’re about.', 'Back to winning ways. Phew. The lads needed that, and so did I.']);
      if (won && gapDrop <= 4 && pos >= n - 3) add('survival', 11, ['Three points that really matter, boss. We’re up to {pos} and that gap to the drop is growing.', 'That’s a big win for staying up. Not pretty, don’t care.']);
      if (won) add('win', 7, ['Good win, boss. {opp} had their moments, but we’re the ones with the points.', 'Three points. I’ll take that any day. On to {next}.', 'Clean, tidy, got it done. The kind of win you build a season on.', 'That felt like ours from the start, boss. {next} next, and we keep it going.', 'We found a way. That’s what good teams do, mate.']);
      if (drew && unbeaten >= 5) add('unbeaten', 12, ['{unb} unbeaten, boss. It’s not a win, but nobody is beating us right now.', 'A point to keep the run going, {unb} games without defeat. I’ll take that all day.']);
      if (drew) add('draw', 7, ['A point, boss. Feels like two dropped or one gained, depending on who you ask. I say we move on to {next}.', '{score} against {opp}. We could have had more, but we could have had less.', 'Fair result, probably. We keep the shape and go again.', 'One point. It will matter in May, trust me.']);
      if (lost && losses >= 3) add('slump', 15, ['{losses} defeats in a row, boss, and I won’t pretend that doesn’t hurt. We need to find something fast.', 'Rough patch. {losses} straight losses. We talk, we fix it, and we go again, you and me.', 'I know it’s hard right now, boss. {losses} on the spin. The lads still believe, though. So do I.']);
      if (lost && margin <= -3) add('thrashing', 14, ['That one hurt, boss. {score}. We don’t talk about it, we fix it.', 'Heavy one. Take the night, then we look at what went wrong at the back.', '{score}. Let’s burn the tape and start again on Monday.']);
      if (lost && margin === -1) add('narrow', 10, ['Cruel, boss. {score}, one moment. We were better than that today.', 'So close. One goal. We pick it up and go again.', 'We did enough to get something, I think. Football, eh?']);
      if (lost) add('loss', 7, ['Not our day, boss. Heads up, we go again.', 'We were second best out there. I’ll go over it with the lads.', 'Lessons, boss. That’s what it is. We need to be sharper against {next}.', 'It happens. The table doesn’t lie, but it isn’t finished either.']);
      if (left > 0 && left <= 3 && !lost) add('endgame', 11, ['Only {left} to go, boss. Every point counts from here.', '{left} games left. This is where seasons are won and lost.']);
    }
    if (!POOL.length) return null;
    // the line: weighted by how much the moment matters, never the id used just before, and never the same words again
    lg.fnotes = lg.fnotes || [];
    const rng = FM.mulberry32((lg.seed || 1) + (lg.runSeed || 0) + (fx.seed || 1) % 100003 + played.length * 131);
    let cand = POOL.filter((p) => lg.fnotes.slice(-2).indexOf(p.id) < 0); if (!cand.length) cand = POOL;
    const tot = cand.reduce((a, p) => a + p.weight, 0); let r = rng() * tot, pick = cand[cand.length - 1]; for (const c of cand) { r -= c.weight; if (r <= 0) { pick = c; break; } }
    const lines = pick.lines.filter((l) => lg.fnotes.indexOf(l) < 0); const line = (lines.length ? lines : pick.lines)[Math.floor(rng() * (lines.length ? lines.length : pick.lines.length))];
    lg.fnotes.push(pick.id, line); lg.fnotes = lg.fnotes.slice(-24);
    let text = fill(line);
    // and sometimes where it leaves them in the table, or who is next
    if (!fx.cup && !fx.stage && rng() < 0.45 && pos) text += ' ' + fill(gapTop === 0 ? 'We are {pos} in the table.' : (level > 1 && pos <= 2) ? 'That keeps us {pos}.' : pos >= n - 2 ? 'We are {pos} and it is tight at the bottom.' : 'We sit {pos} now, {gap} off the top.');
    return text;
    function winsFrom(r2) { let c = 0; for (let i = r2.length - 1; i >= 0 && r2[i] === 'W'; i--) c++; return c; }
  };
})();
