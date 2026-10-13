// The history of the league: eight clubs in a fictional English region, the Westhaven Counties, with more than a century behind them.
// Everything here is written, not generated: the clubs' stories, the Iron Derby between Ashford and Northfield, and the lesser rivalries.
// Other files use it for the analysis page, the news, the drama inside matches and the way a result is talked about afterwards.
(function () {
  const FM = (window.FM = window.FM || {});

  FM.REGION = 'the Westhaven Counties';

  FM.CLUB_HISTORY = {
    'Ashford Rovers': {
      founded: 1891, nickname: 'The Ironmen', ground: 'The Foundry', colours: 'Green and white',
      tagline: 'The proud working-class giants who refuse to die',
      short: 'Formed by the workers of Ashford Ironworks. Three titles in six seasons under Arthur Bell in the 1970s, a near-death in 2004, and a town that sees every match as the defence of its identity.',
      paras: [
        'Ashford Rovers were formed in 1891 by workers at Ashford Ironworks, and for a century they were the heartbeat of an industrial town. The glory years came in the 1970s, when the legendary manager Arthur Bell took a team of local factory workers to three league titles in six seasons.',
        'The ironworks closed in 1987 and the town was plunged into unemployment. Rovers nearly disappeared in 2004, after an owner mortgaged the stadium to fund a failed property development; the supporters raised enough money to save the club.',
        'Today Ashford have one of the most passionate fanbases in the league. Their supporters see every match as a defence of their town.',
      ],
      board: 'The board want a club the town can be proud of: a season that ends above Northfield matters more to the terraces than almost anything else.',
    },
    'Eastgate Rangers': {
      founded: 1906, nickname: 'The Gatekeepers', ground: 'Eastgate Park', colours: 'Red and black',
      tagline: 'The club that always finishes second',
      short: 'Railway workers\' club, runners-up seven times, and the side that threw away a 2-0 lead on the last day of 2019 with the title 83 years away. Supporters believe the club is cursed.',
      paras: [
        'Eastgate were established by railway workers and have spent most of their history near the top of the league without winning it. They have finished runners-up seven times, including three seasons in a row in the 1990s.',
        'The worst collapse came in 2019. They needed a draw on the final day to win their first title in 83 years, led 2-0 after 80 minutes, and conceded three times.',
        'Their supporters believe the club is cursed, and every new manager promises to break it. Eastgate have also built a reputation for producing technically gifted midfielders through one of the region\'s best academies.',
      ],
      board: 'The board are patient and fearful in equal parts: they want the curse broken, and they are not sure they could bear another near miss.',
    },
    'Harbour City': {
      founded: 1924, nickname: 'The Mariners', ground: 'Dockside Stadium', colours: 'Navy and sky blue',
      tagline: 'The richest club with the emptiest trophy cabinet',
      short: 'A dockworkers\' club until shipping billionaire Adrian Vale bought it in 2016. Enormous resources, a squad of stars, and no league title since 1962.',
      paras: [
        'For decades Harbour City were a modest club representing fishermen and dockworkers in a declining port. Everything changed in 2016, when the shipping billionaire Adrian Vale bought the club and invested heavily in its facilities, academy and recruitment.',
        'City signed several of the league\'s biggest stars, but their expensive squads have consistently underperformed. They have not won the league since 1962.',
        'Their former supporters\' association accuses the ownership of stripping away the club\'s identity, and older fans still sing about the days when dockworkers stood on the terraces.',
      ],
      board: 'The owner has all the money and less and less patience: anything but the title is a failure, and the manager knows how short a tenure at the Dockside can be.',
    },
    'Kingsbridge Athletic': {
      founded: 1888, nickname: 'The Scholars', ground: 'King\'s Meadow', colours: 'Royal blue and gold',
      tagline: 'The intellectuals of English football',
      short: 'Born at the university, and the club that learned to buy players by statistics. League champions in 2005 on a quarter of Harbour City\'s wage bill.',
      paras: [
        'Kingsbridge began as a club for students and academics at the city\'s university, although it quickly opened its doors to the wider community.',
        'In 1998 an eccentric economics professor, Daniel Mercer, became chairman and appointed a little-known mathematics graduate as director of football. While other clubs relied on traditional scouting, Kingsbridge began building statistical models to find undervalued players.',
        'They won the league in 2005 with a squad assembled for less than a quarter of what Harbour City now spend on wages each year. Their supporters pride themselves on intelligent, possession-based football; rival fans accuse them of thinking football can be solved with a spreadsheet.',
      ],
      board: 'The board want the evidence: results that follow from a clear idea. A manager who can explain why will be forgiven a bad month, and one who cannot will not.',
    },
    'Northfield United': {
      founded: 1894, nickname: 'The Millers', ground: 'Millbank Ground', colours: 'Black and white',
      tagline: 'The ruthless rivals of Ashford Rovers',
      short: 'Founded by three players who walked out of Ashford in 1894. Champions in 1997 after a penalty Ashford still call the Theft of \'97, and proud of being the tougher, more successful neighbours.',
      paras: [
        'Northfield began as a small mill town competing with Ashford for industrial investment. When the Ashford ironworks closed, Northfield\'s factories survived, and the economic divide made the football rivalry harder.',
        'On the pitch United became a powerhouse in the 1990s under the uncompromising manager Victor Hales, who built the most feared defensive side the league has seen.',
        'Their greatest triumph is the controversial 1997 title, won at Ashford\'s expense after a disputed penalty in the closing minutes of the season. Northfield supporters celebrate the anniversary as Judgement Day.',
        'While Ashford fans see their club as loyalty and community, Northfield supporters take pride in being the tougher, more successful neighbours who care about winning above everything else.',
      ],
      board: 'The board care about winning and very little else, and a result against Ashford is the one they will remember.',
    },
    'Redcliffe Town': {
      founded: 1912, nickname: 'The Reds', ground: 'Quarry Lane', colours: 'Claret and cream',
      tagline: 'The little club that conquered the giants',
      short: 'A quarrying town of 30,000. Champions in 2015 with released academy players, part-timers and a captain who had been a postman three years earlier; never repeated it, and sells almost everyone good.',
      paras: [
        'Redcliffe is a former quarrying town with barely 30,000 people, and its club spent most of its existence in the lower divisions, supported by a few thousand fiercely loyal locals.',
        'In 2011 a former PE teacher, Martin Keane, became manager and built a squad of released academy players, part-time footballers and overlooked veterans. They won the league in 2015 conceding only 19 goals all season; their title-winning captain, Thomas Webb, had been a postman three years earlier.',
        'Redcliffe have never repeated it, but their supporters still believe another miracle is possible. Limited finances mean almost every promising player is eventually sold.',
      ],
      board: 'The board prioritise survival and the books. Every good young player is an offer waiting to happen, and the manager is expected to cope.',
    },
    'Stoneham Wanderers': {
      founded: 1876, nickname: 'The Wanderers', ground: 'The Old Yard', colours: 'Maroon and white',
      tagline: 'The fallen aristocrats of the league',
      short: 'The oldest club in the league and once its most successful: eleven titles between 1900 and 1930. First relegation in 1981, near-liquidation in 2008, and a crumbling Victorian stadium that is slowly bankrupting the club.',
      paras: [
        'Stoneham are the oldest club in the competition and were once its most successful. Between 1900 and 1930 they won eleven league championships and supplied several players to the England national team.',
        'The decline began after the Second World War: while other clubs modernised, Stoneham stayed fiercely attached to outdated methods and traditions. They were relegated for the first time in 1981, and in 2008 financial mismanagement nearly ended in liquidation.',
        'Their proudest supporters still call Stoneham the biggest club in the league, despite winning nothing significant for decades. The crumbling Victorian stadium is a cathedral of football history, and maintaining it is slowly bankrupting the club.',
      ],
      board: 'The board expect, by right of history, to be at the top, and they hold the stadium together with tape and optimism.',
    },
    'Westmoor Albion': {
      founded: 1933, nickname: 'The Albion', ground: 'Moorland Arena', colours: 'Amber and navy',
      tagline: 'The ambitious newcomers nobody takes seriously',
      short: 'Two village clubs merged in the Depression. Bought by technology entrepreneur Eleanor Price in 2009, built on coaching, sports science and analytics, and third in 2025 to upset the old order.',
      paras: [
        'Westmoor were formed when two village clubs merged during the Great Depression, and for decades they played amateur football on a windswept pitch beside the moors.',
        'Their fortunes changed in 2009 when a local technology entrepreneur, Eleanor Price, bought the club. Unlike Harbour City\'s owner she refused to spend recklessly, and invested in coaching, sports science, youth recruitment and an analytics department.',
        'Westmoor rose through the divisions and reached the top league in 2022, then finished third in 2025 and upset several historic clubs. Traditional supporters across the league dismiss Albion as a manufactured club without history, which only fuels their determination.',
      ],
      board: 'The board measure everything, and they want the pace of the climb kept up: a place at the top table, earned by method rather than money.',
    },
  };

  // The managers of the other clubs (the user is Ashford's).
  { const M = { 'Eastgate Rangers': 'Paddy Lorne', 'Harbour City': 'Tomas Reiner', 'Kingsbridge Athletic': 'Helen Mercer', 'Northfield United': 'Ray Calloway', 'Redcliffe Town': 'Martin Keane', 'Stoneham Wanderers': 'Albert Finch', 'Westmoor Albion': 'Ines Calder' };
    Object.keys(M).forEach((k) => { FM.CLUB_HISTORY[k].manager = M[k]; }); }

  // The Iron Derby, and the lesser rivalries.
  FM.DERBIES = [
    {
      key: 'iron', name: 'The Iron Derby', a: 'Ashford Rovers', b: 'Northfield United', heat: 1,
      record: { a: 52, d: 39, b: 56, total: 147 },
      line: 'The most bitter fixture in the league, and the one both towns remember.',
      timeline: [
        { year: 1894, title: 'The Great Split', text: 'Three Ashford players walked out to form Northfield United after a dispute over wages and working conditions. Ashford supporters called it a betrayal of their fellow workers for money.' },
        { year: 1958, title: 'The Broken Leg', text: 'Northfield captain Harold Price suffered a career-ending injury after a tackle by Ashford defender Frank Doyle. Doyle was never sent off. Northfield supporters still sing about it.' },
        { year: 1987, title: 'The Factory Closure', text: 'Northfield\'s largest manufacturer won a government-backed expansion contract in the same year the Ashford ironworks closed. Many in Ashford believe Northfield prospered at their town\'s expense.' },
        { year: 1997, title: 'The Theft of \'97', text: 'Ashford led 1-0 on the final day and needed only a draw for the title. In the 89th minute Northfield were given a highly controversial penalty, equalised, and won the championship on goal difference. The referee retired weeks later following widespread criticism, although no wrongdoing was ever established.' },
        { year: 2018, title: 'The Captain\'s Betrayal', text: 'Ashford captain James Whitlock, a lifelong supporter and academy graduate, promised publicly to finish his career at Rovers, then joined Northfield on a free transfer. Six months later he scored the winner against Ashford and celebrated in front of the home supporters.' },
      ],
      aView: 'Ashford believe Northfield represent everything wrong with modern football: excessive spending, opportunism and victory at any cost.',
      bView: 'Northfield consider Ashford sentimental, arrogant and obsessed with a past they cannot recover.',
      today: 'The fixture draws the biggest television audience in the league, and both clubs consider finishing above the other almost as important as winning the championship.',
    },
    { key: 'moneyball', name: 'The Moneyball Derby', a: 'Harbour City', b: 'Kingsbridge Athletic', heat: 0.45, line: 'Wealth and expensive signings against data-driven recruitment.' },
    { key: 'generations', name: 'The Generations Derby', a: 'Stoneham Wanderers', b: 'Westmoor Albion', heat: 0.4, line: 'The old footballing aristocracy against modern methods.' },
    { key: 'grudge', name: 'The 2015 Grudge', a: 'Eastgate Rangers', b: 'Redcliffe Town', heat: 0.55, line: 'Eastgate lost the 2015 title to Redcliffe by a single point, having spent five times as much.' },
    { key: 'nearly', name: 'The Nearly Men Derby', a: 'Harbour City', b: 'Eastgate Rangers', heat: 0.4, line: 'Two clubs competing to escape decades of disappointment.' },
  ];

  FM.derbyBetween = function (nameA, nameB) {
    return FM.DERBIES.find((d) => (d.a === nameA && d.b === nameB) || (d.a === nameB && d.b === nameA)) || null;
  };
  FM.derbyForFixture = function (league, fx) {
    if (!league || !fx) return null;
    const h = FM.teamById(league, fx.homeId), a = FM.teamById(league, fx.awayId);
    return h && a ? FM.derbyBetween(h.name, a.name) : null;
  };
  // The all-time record, brought up to date with what has happened in this game (draws and wins are credited to the club that is a/b).
  FM.derbyRecord = function (league, derby) {
    if (!derby || !derby.record) return null;
    const r = { a: derby.record.a, d: derby.record.d, b: derby.record.b, total: derby.record.total, thisGame: { a: 0, d: 0, b: 0 } };
    league.fixtures.filter((f) => f.played && !f.friendly).forEach((f) => {
      const h = FM.teamById(league, f.homeId), a = FM.teamById(league, f.awayId);
      if (!h || !a || !FM.derbyBetween(h.name, a.name) || FM.derbyBetween(h.name, a.name) !== derby) return;
      const hName = h.name, hWon = f.hg > f.ag, aWon = f.ag > f.hg;
      const key = f.hg === f.ag ? 'd' : ((hWon && hName === derby.a) || (aWon && a.name === derby.a)) ? 'a' : 'b';
      r[key]++; r.thisGame[key]++; r.total++;
    });
    return r;
  };
  FM.clubHistory = (name) => FM.CLUB_HISTORY[name] || null;

  // The history card on the Analysis page: who the next opponent are to this club, and (for a derby) how much the two sides hate each other.
  FM.historyCardHtml = function (league, opp) {
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const me = FM.teamById(league, league.userId);
    if (!opp || !me) return '';
    const d = FM.derbyBetween(me.name, opp.name), h = FM.CLUB_HISTORY[opp.name];
    if (d && d.key === 'iron') {
      const rec = FM.derbyRecord(league, d), meIsA = me.name === d.a, played = rec.thisGame.a + rec.thisGame.b + rec.thisGame.d;
      const row = (y) => `<li><b>${y.year}: ${esc(y.title)}.</b> ${esc(y.text)}</li>`;
      return `<div class="card hist-card hist-iron">
        <span class="eyebrow">Before you do anything else</span>
        <h2>${esc(d.name)}: Ashford Rovers v Northfield United</h2>
        <p class="hist-lede">Welcome to Ashford, boss. Your first game is the one this whole town has been waiting for, and it is worth understanding before you pick a team: <b>they hate Northfield. All of them, and for good reason.</b></p>
        <div class="hist-record" aria-label="All-time record"><div><b>${rec.a}</b><span>Ashford wins</span></div><div><b>${rec.d}</b><span>draws</span></div><div><b>${rec.b}</b><span>Northfield wins</span></div><div class="hist-total"><b>${rec.total}</b><span>meetings</span></div></div>
        ${played ? `<p class="note">This game so far: Ashford ${rec.thisGame.a}, Northfield ${rec.thisGame.b}, ${rec.thisGame.d} drawn.</p>` : ''}
        <h3>How the hatred began</h3>
        <ul class="hist-list">${d.timeline.map(row).join('')}</ul>
        <h3>Where it stands today</h3>
        <p>${esc(d.aView)} ${esc(d.bView)}</p>
        <p>${esc(d.today)}</p>
        <h3>What it means for you</h3>
        <p>${meIsA ? 'The terraces' : 'The terraces'} will not remember a draw. A win is the kind of result that gets a manager his name sung; a defeat is the kind that gets a banner, and the Millers know it. Expect the match to be hotter than any other in the league: more cards, tighter challenges, and the sort of incident a normal fixture never throws up. Ashford open at the Foundry, and the return is at Millbank.</p>
        <p class="note">${esc(FM.CLUB_HISTORY['Ashford Rovers'].board)}</p>
      </div>`;
    }
    if (!h) return '';
    return `<div class="card hist-card">
      <span class="eyebrow">${esc(opp.name)}${h.nickname ? ' · ' + esc(h.nickname) : ''}${h.ground ? ' · ' + esc(h.ground) : ''}</span>
      <h2>${esc(h.tagline)}</h2>
      ${d ? `<p class="hist-derby"><b>${esc(d.name)}.</b> ${esc(d.line)}</p>` : ''}
      ${h.paras.map((p) => `<p>${esc(p)}</p>`).join('')}
      <p class="note">${esc(h.board)}</p>
    </div>`;
  };


  // How a club's people feel about one result: used by the news and after the whistle.
  FM.derbyMood = function (derby, side, res) {   // side: 'a' | 'b'; res: 'win' | 'draw' | 'loss'
    if (!derby) return null;
    const rivalName = side === 'a' ? derby.b : derby.a;
    if (derby.key === 'iron') {
      if (side === 'a') return res === 'win' ? 'Ashford, who have waited a long time to hear these words, have beaten Northfield.' : res === 'draw' ? 'A point is not what Ashford came for against Northfield.' : 'Defeat to Northfield is the one defeat Ashford will not forgive.';
      return res === 'win' ? 'Northfield, as ever, have won the one that matters to them.' : res === 'draw' ? 'Northfield will say they were the better side and had it taken from them: they usually do.' : 'Northfield have lost to Ashford, and nobody in Millbank will talk about anything else this week.';
    }
    return res === 'win' ? `A win over ${rivalName} that the supporters will enjoy.` : res === 'draw' ? `Nothing settled against ${rivalName}.` : `Defeat to ${rivalName}, and the old argument goes on.`;
  };
})();
