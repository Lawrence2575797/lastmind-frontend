/*
 * What Elena says on each page of the tactics workspace: the match-up (how the next opponent have behaved in the phase that answers this one) and your
 * own numbers for this phase of play, taken from the matches and friendlies you have already played. Every statistical word in it is a button that
 * opens a lesson in her side tab (see elena_lessons.js). The Monte Carlo tests and hypothesis tests come later, in the testing phase, and she says so.
 */
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pc = (x) => Math.round(x * 100) + '%';
  const share = (k, n) => (n ? pc(k / n) : '—');

  // ---------- numbers from the matches you have played ----------
  // A pass in a match log is [seconds, 0 home / 1 away, from, to, result (1 completed, 0 failed, 2 offside), x, y, distance, lane clearance, pressure on the
  // receiver, probability]. Home always attacks towards x = 105, so depth (0 own goal, 1 theirs) in the user's own direction follows from x.
  const bucketOf = (press) => (press < 5 ? 'tight' : press < 10 ? 'mid' : 'free');
  const blank = () => ({ n: 0, ok: 0, tight: { n: 0, ok: 0 }, mid: { n: 0, ok: 0 }, free: { n: 0, ok: 0 }, len: [], lane: { cut: { n: 0, ok: 0 }, clear: { n: 0, ok: 0 } } });
  function add(b, p) {
    const ok = p[4] === 1 ? 1 : 0, bu = bucketOf(p[9]), ln = p[8] < 1.5 ? 'cut' : 'clear';
    b.n++; b.ok += ok; b[bu].n++; b[bu].ok += ok; b.lane[ln].n++; b.lane[ln].ok += ok; if (b.len.length < 400) b.len.push(p[7]);
  }
  FM.phaseStats = function (league) {
    const me = league.userId;
    const S = { matches: 0, friendlies: 0, all: blank(), build: blank(), midfield: blank(), final: blank(), press: blank(), defend: blank(), shots: { n: 0, goals: 0, xg: 0 }, against: { n: 0, goals: 0, xg: 0 },
      tackles: { n: 0, won: 0, ownThird: { n: 0, won: 0 } }, wins: { n: 0, shot: 0, high: { n: 0, shot: 0 }, low: { n: 0, shot: 0 } }, losses: { n: 0, shot: 0, own: { n: 0, shot: 0 }, else: { n: 0, shot: 0 } } };
    const fxs = (league.fixtures || []).concat(league.friendlies || []).filter((f) => f.played && f.log && (f.homeId === me || f.awayId === me));
    fxs.forEach((f) => {
      const log = f.log, idx = f.homeId === me ? 0 : 1, flip = idx === 1;
      S.matches++; if (f.friendly) S.friendlies++;
      const dU = (x) => (flip ? 1 - x / 105 : x / 105);
      const myShots = [], theirShots = [];
      (log.other || []).forEach((e) => {
        if (e.type !== 'shot') return;
        if (e.team === me) { myShots.push(e.t); S.shots.n++; S.shots.xg += e.xg || 0; if (e.outcome === 'goal') S.shots.goals++; }
        else { theirShots.push(e.t); S.against.n++; S.against.xg += e.xg || 0; if (e.outcome === 'goal') S.against.goals++; }
      });
      const within = (list, t) => list.some((s) => s >= t && s <= t + 15);
      (log.passes || []).forEach((p) => {
        if (p[4] === 2) return;
        const mine = p[1] === idx, d = dU(p[5]);
        if (mine) {
          add(S.all, p);
          if (d < 0.33) add(S.build, p); else if (d < 0.66) add(S.midfield, p); else add(S.final, p);
          if (p[4] === 0) {   // the ball was given away
            S.losses.n++; const k = d < 0.33 ? 'own' : 'else', shot = within(theirShots, p[0]) ? 1 : 0;
            S.losses[k].n++; S.losses.shot += shot; S.losses[k].shot += shot;
          }
        } else {
          const theirDepth = 1 - d;
          if (theirDepth < 0.45) add(S.press, p);       // they are building from their own end
          if (theirDepth >= 0.66) add(S.defend, p);     // they are attacking us
          if (p[4] === 0) {   // they gave it away, which is a win for us
            S.wins.n++; const k = d >= 0.5 ? 'high' : 'low', shot = within(myShots, p[0]) ? 1 : 0;
            S.wins[k].n++; S.wins.shot += shot; S.wins[k].shot += shot;
          }
        }
      });
      (log.tackles || []).forEach((t) => {
        if (t[1] !== idx) return;
        S.tackles.n++; S.tackles.won += t[4] ? 1 : 0;
        if (dU(t[5]) < 0.4) { S.tackles.ownThird.n++; S.tackles.ownThird.won += t[4] ? 1 : 0; }
      });
    });
    return S;
  };

  const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
  const sd = (a) => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1)); };
  FM.phaseStatsHelpers = { mean, sd, share };

  // ---------- one phase, in words ----------
  const kw = (id, label) => '<button type="button" class="el-kw" data-lesson="' + id + '">' + esc(label) + '</button>';
  const tile = (v, l) => '<div class="el-tile"><b>' + v + '</b><span>' + l + '</span></div>';
  const condRow = (label, b) => '<tr><td>' + label + '</td><td>' + b.ok + ' of ' + b.n + '</td><td><b>' + share(b.ok, b.n) + '</b></td></tr>';
  const condTable = (head, rows) => '<table class="el-tbl"><tr><th>' + esc(head) + '</th><th>Count</th><th>Share</th></tr>' + rows.join('') + '</table>';
  const MIN = 8;

  // The words each page is about, and what the numbers on it are for.
  const PHASES = {
    shape: { name: 'Squad and formation', what: 'the shape you start from',
      body: (S) => '<p>Before any one phase, there is the plain question of what your team does. Across ' + S.all.n + ' passes, ' + share(S.all.ok, S.all.n) + ' found a team-mate. That figure is a ' + kw('proportion', 'proportion') + ', and the average pass was ' + mean(S.all.len).toFixed(0) + ' m long, with a ' + kw('spread', 'spread') + ' (standard deviation) of ' + sd(S.all.len).toFixed(0) + ' m.</p>' },
    build: { name: 'Build-up', what: 'getting out from the back',
      body: (S) => {
        const b = S.build;
        return '<p>Passes you played in your own third: <b>' + b.n + '</b>. ' + share(b.ok, b.n) + ' of them found a team-mate (a ' + kw('proportion', 'proportion') + '), and the average length was ' + mean(b.len).toFixed(0) + ' m, give or take ' + sd(b.len).toFixed(0) + ' m (the ' + kw('spread', 'spread') + ').</p>' +
          '<p>The more useful question is how that changes when a defender is close. This is a ' + kw('conditional', 'conditional probability') + ': the chance a pass works <i>given</i> that the receiver is tightly marked.</p>' +
          condTable('Pass in your own third, receiver…', [condRow('marked tightly (under 5 m)', b.tight), condRow('with a defender 5 to 10 m away', b.mid), condRow('with space (10 m or more)', b.free)]);
      } },
    midfield: { name: 'Play through midfield', what: 'moving the ball up the middle of the pitch',
      body: (S) => {
        const b = S.midfield;
        return '<p>Passes in the middle third: <b>' + b.n + '</b>, of which ' + share(b.ok, b.n) + ' arrived (the ' + kw('proportion', 'proportion') + ').</p>' +
          '<p>What matters here is the lane. The ' + kw('conditional', 'conditional probability') + ' of a pass arriving, given that a defender stands almost on the line between the two players:</p>' +
          condTable('Pass in midfield, with…', [condRow('a defender within 1.5 m of the lane', b.lane.cut), condRow('a clear lane (1.5 m or more)', b.lane.clear)]);
      } },
    final: { name: 'Final third', what: 'creating and taking chances',
      body: (S) => {
        const b = S.final, s = S.shots;
        return '<p>Passes you played in the attacking third: <b>' + b.n + '</b>, ' + share(b.ok, b.n) + ' completed. You had <b>' + s.n + '</b> shot' + (s.n === 1 ? '' : 's') + ', worth ' + s.xg.toFixed(1) + ' expected goals in total, and ' + s.goals + ' went in.</p>' +
          '<p>Goals are rare, so one match tells you little. That is why we describe the <i>chances</i> (the ' + kw('mean', 'mean') + ' value of a shot was ' + (s.n ? (s.xg / s.n).toFixed(2) : '—') + ' goals) and not only whether they went in.</p>' +
          condTable('Pass in the attacking third, receiver…', [condRow('marked tightly (under 5 m)', b.tight), condRow('with space (10 m or more)', b.free)]);
      } },
    transAtt: { name: 'Attacking transition', what: 'the seconds after you win the ball',
      body: (S) => {
        const w = S.wins;
        return '<p>Times the other side gave it away in your matches: <b>' + w.n + '</b>. You had a shot within 15 seconds of ' + w.shot + ' of them (' + share(w.shot, w.n) + ').</p>' +
          '<p>The ' + kw('conditional', 'conditional probability') + ' of a shot, given where the ball was won:</p>' +
          condTable('Ball won…', [condRow('in their half', { n: w.high.n, ok: w.high.shot }), condRow('in your half', { n: w.low.n, ok: w.low.shot })]);
      } },
    transDef: { name: 'Defensive transition', what: 'the seconds after you lose the ball',
      body: (S) => {
        const l = S.losses;
        return '<p>Times you gave the ball away: <b>' + l.n + '</b>. The other side had a shot within 15 seconds of ' + l.shot + ' of them (' + share(l.shot, l.n) + ').</p>' +
          '<p>The ' + kw('conditional', 'conditional probability') + ' of conceding a shot, given where it was lost, is the number that tells you how dangerous each part of the pitch is:</p>' +
          condTable('Ball lost…', [condRow('in your own third', { n: l.own.n, ok: l.own.shot }), condRow('anywhere else', { n: l.else.n, ok: l.else.shot })]);
      } },
    without: { name: 'Organised defending', what: 'defending when they have settled',
      body: (S) => {
        const d = S.defend, t = S.tackles, a = S.against;
        return '<p>Their passes in your defensive third: <b>' + d.n + '</b>, ' + share(d.ok, d.n) + ' completed. You faced <b>' + a.n + '</b> shot' + (a.n === 1 ? '' : 's') + ' (' + a.xg.toFixed(1) + ' expected goals) and ' + a.goals + ' went in.</p>' +
          '<p>Challenges you made in your own third: ' + t.ownThird.n + ', of which ' + t.ownThird.won + ' won the ball (' + share(t.ownThird.won, t.ownThird.n) + '). A ' + kw('proportion', 'proportion') + ' like that is only an estimate of how well your defence tackles.</p>' +
          condTable('Their pass in your third, receiver…', [condRow('marked tightly (under 5 m)', d.tight), condRow('with space (10 m or more)', d.free)]) +
          '<p>And when you press them: the ' + kw('conditional', 'conditional probability') + ' of a <i>turnover</i> (their pass not completed), given how close your player was to the receiver. That is what a pressing trigger is built on.</p>' +
          condTable('Their pass from their own end, your player…', [condRow('within 5 m of the receiver', { n: S.press.tight.n, ok: S.press.tight.n - S.press.tight.ok }), condRow('5 to 10 m away', { n: S.press.mid.n, ok: S.press.mid.n - S.press.mid.ok }), condRow('10 m or more away', { n: S.press.free.n, ok: S.press.free.n - S.press.free.ok })]);
      } },
    press: { name: 'Pressing', what: 'pressing them when they build',
      body: (S) => {
        const p = S.press;
        return '<p>Their passes from their own end: <b>' + p.n + '</b>. The ' + kw('conditional', 'conditional probability') + ' that a pass is <i>lost</i> (a turnover), given how close you were to the receiver, is the number a pressing trigger is built on:</p>' +
          condTable('Their pass, with your player…', [condRow('within 5 m of the receiver (turnover = share not completed)', { n: p.tight.n, ok: p.tight.n - p.tight.ok }), condRow('5 to 10 m away', { n: p.mid.n, ok: p.mid.n - p.mid.ok }), condRow('10 m or more away', { n: p.free.n, ok: p.free.n - p.free.ok })]);
      } },
    setpieces: { name: 'Set pieces', what: 'dead-ball routines',
      body: (S) => '<p>Set pieces are rare, so each routine has only a handful of cases. That is exactly when it is easiest to see a pattern that is only luck, which is why the testing phase asks for many repeats.</p>' },
  };
  const PHASE_KEY = { shape: 'shape', build: 'build', buildEnd: 'build', midfield: 'midfield', final: 'final', transAtt: 'transAtt', transDef: 'transDef', without: 'without', press: 'press', setpieces: 'setpieces' };

  FM.elenaPhase = {
    PHASES,
    reading(c, h) {
      const key = PHASE_KEY[c.key] || 'build', ph = PHASES[key], lg = window.FM_WORLD && FM_WORLD.league;
      const S = lg ? FM.phaseStats(lg) : null;
      let out = '<p class="el-big">' + esc(ph.name) + ': ' + esc(ph.what) + '.</p>';
      // 1. the match-up
      out += '<h4>The match-up</h4>';
      let report = '';
      try { if (c.opp && lg && FM.tacticsPhaseReportHtml && key !== 'shape' && key !== 'setpieces') report = FM.tacticsPhaseReportHtml(lg, c.opp.id, key === 'without' ? 'without' : key); } catch (e) { report = ''; }
      if (report) out += report;
      else out += '<p>' + (c.opp ? 'Nothing here is about ' + esc(c.opp.name) + ' on its own: this page is about how <i>you</i> set up.' : 'The next opponent is not known yet.') + '</p>';
      // 2. your numbers
      out += '<h4>Your numbers</h4>';
      const enough = S && S.all.n >= 40;
      if (!enough) {
        out += '<p>There are not enough passes from your own matches to say anything yet' + (S && S.matches ? ' (' + S.matches + ' match' + (S.matches === 1 ? '' : 'es') + ', ' + S.all.n + ' passes)' : '') + '. Play the pre-season friendlies and the numbers for this phase will appear here: the ' + kw('proportion', 'proportions') + ', the ' + kw('mean', 'averages') + ' and, most interesting of all, the ' + kw('conditional', 'conditional probabilities') + '.</p>' +
          '<p class="el-small">You can already learn the ideas on example numbers. Tap any gold word.</p>';
      } else {
        out += '<p class="el-small">From ' + S.matches + ' match' + (S.matches === 1 ? '' : 'es') + ' (' + S.friendlies + ' friendl' + (S.friendlies === 1 ? 'y' : 'ies') + '), ' + S.all.n + ' passes in all.</p>' + ph.body(S);
      }
      // 3. what testing will add
      out += '<h4>What comes after: testing</h4>' +
        '<p>These numbers describe what has happened. Once you have set the phase up, the testing page plays it hundreds of times against ' + esc(c.opp ? c.opp.name : 'the next opponent') + ' (a ' + kw('montecarlo', 'Monte Carlo') + ' experiment) and asks whether a change really helped (a ' + kw('hypothesis', 'hypothesis test') + ').</p>' +
        '<p class="el-small">Each gold word opens a short lesson here. They are written to build up from the step before, one small step to a line.</p>';
      return out;
    },
  };
})();
