// League settings ("skins"): the same league, with the clubs, their stories and their rivalries taken from a period of history, so the game's drama carries
// real content for a subject (GCSE History, say). A club is never given a name for a joke: every club in a skin stands for a real place, group or person of the
// period (its "basis"), every rivalry is tied to dated events, and what is real is kept apart from what is football folklore invented for the game.
//   skin = { id, title, topic, level, paper, region, source ('written' or 'ai'), clubs: [8, in the order of the league's own clubs],
//            derbies: [...] (the first is the opening fixture's rivalry), study: [revision questions] }
//   club = { name, nickname, ground, colours, founded, tagline, short, basis, club (invented football story), real: [{ year, title, text }], board }
// A skin only changes names and words: the matches, the ratings and the saved history all stay as they were (club ids do not change).
(function () {
  const FM = (window.FM = window.FM || {});
  const ORIGINAL_ORDER = ['Ashford Rovers', 'Kingsbridge Athletic', 'Northfield United', 'Redcliffe Town', 'Harbour City', 'Stoneham Wanderers', 'Westmoor Albion', 'Eastgate Rangers'];
  FM.SKIN_SLOTS = ORIGINAL_ORDER;
  const orig = { history: FM.CLUB_HISTORY, derbies: FM.DERBIES, region: FM.REGION };   // the league as written, kept so a skin can be taken off again

  FM.SKINS = {};
  FM.SKINS.norman = {
    id: 'norman', source: 'written', title: 'Norman England, 1066 to 1087', topic: 'GCSE History: Norman England', level: 'GCSE',
    blurb: 'Saxons and Normans, the Hastings Derby, the Harrying of the North and the Domesday Book.',
    paper: 'The Conquest Chronicle', region: 'the English shires',
    clubs: [
      { name: 'Wessex Saxons', nickname: 'The Thegns', ground: 'Senlac Park', colours: 'Gold and blue', founded: 1888,
        tagline: 'The proud old English club that refuses to die',
        short: 'The club of the old English heartland: a name that goes back to the kingdom of Harold Godwinson, and a town that sees every season as a defence of what was lost.',
        basis: 'The kingdom of Wessex, the heartland of Anglo-Saxon England and the earldom of Harold Godwinson.',
        club: 'The club was formed in 1888 by farm workers and craftsmen from the old Wessex villages. Their supporters carry a golden dragon banner, and for most of the club\'s history they have been better at bravery than at winning.',
        real: [
          { year: 1066, title: 'A king chosen, not inherited', text: 'When Edward the Confessor died in January 1066 without a son, the Witan (the king\'s council of leading nobles and churchmen) chose Harold Godwinson, Earl of Wessex and the most powerful man in the kingdom. He was crowned in Westminster Abbey the next day.' },
          { year: 1066, title: 'The English army', text: 'Harold\'s army had two parts: the housecarls, professional full-time soldiers who fought with huge axes, and the fyrd, part-time soldiers called up from the shires. The fyrd could only be kept in the field for a limited time, and had to return to bring in the harvest.' },
          { year: 1066, title: 'Stamford Bridge then Hastings', text: 'Harold beat the Norwegian king Harald Hardrada at Stamford Bridge on 25 September, then marched his tired army about 250 miles south. William of Normandy had landed at Pevensey on 28 September. On 14 October 1066 the English held the ridge at Senlac Hill and were beaten at Hastings; Harold was killed.' },
        ],
        board: 'The board want pride restored: a club that fights for every point, and a season that ends above Caen.' },
      { name: 'Winchester Domesday', nickname: 'The Surveyors', ground: 'Treasury Meadow', colours: 'Maroon and white', founded: 1887,
        tagline: 'The club that counts everything',
        short: 'Winchester was the old capital of Wessex and kept the royal treasury. The club that carries its name believes every question can be answered if you measure enough.',
        basis: 'Winchester, capital of the kings of Wessex and home of the royal treasury, where the Domesday Book was compiled and kept.',
        club: 'The club was founded in 1887 by clerks from the cathedral close. They were the first in the league to count everything, and a supporter in the stand will tell you how many passes were completed in the last five years.',
        real: [
          { year: 1085, title: 'The decision to survey', text: 'At Christmas 1085 William held his court at Gloucester and decided to find out exactly what England was worth. Commissioners were sent in circuits round the shires to ask who held each manor, how big it was, how many ploughs, villagers and animals it had, and what it was worth in 1066, when it was granted, and in 1086.' },
          { year: 1086, title: 'The Domesday Book', text: 'The results were written up in two volumes (Great Domesday and Little Domesday) and kept at Winchester. The Anglo-Saxon Chronicle complained that "not one ox or cow or pig was left out". It was called Domesday, like the Day of Judgement, because there was no appeal against what it recorded.' },
          { year: 1086, title: 'Why William wanted it', text: 'It showed him what each landholder owed, so that taxation (the geld) could be raised fairly, and who held land from whom. In August 1086 at Salisbury, every important landholder was made to swear loyalty directly to the king: the Salisbury Oath.' },
        ],
        board: 'The board want evidence: results that follow from a clear idea, and a manager who can explain why.' },
      { name: 'Caen Normans', nickname: 'The Conquerors', ground: 'Abbaye Ground', colours: 'Red and gold', founded: 1894,
        tagline: 'The ruthless rivals of the Wessex Saxons',
        short: 'Caen was the city of William the Conqueror, who founded its great abbey and is buried there. The club that carries the name has never lost its taste for taking what it wants.',
        basis: 'Caen, the city of William, Duke of Normandy, where he built an abbey and was later buried.',
        club: 'The club began in 1894 when three players walked out of the Wessex Saxons after a quarrel over pay and travelled east to start a rival side. They have been the most successful club in the league ever since, and the Wessex supporters have never forgiven them.',
        real: [
          { year: 1066, title: 'William\'s claim', text: 'William, Duke of Normandy, claimed that Edward the Confessor had promised him the throne, that Harold Godwinson had sworn an oath to support him in 1064, and that the Pope backed his cause and had sent a banner. English sources say Edward named Harold on his deathbed.' },
          { year: 1066, title: 'Crowned on Christmas Day', text: 'After winning at Hastings, William marched round the south-east to cut off London, and was crowned King of England in Westminster Abbey on Christmas Day 1066.' },
          { year: 1070, title: 'A kingdom held by castles', text: 'William kept control by building castles, first of wood in the motte-and-bailey design, then in stone, and by rewarding his Norman followers with land held on condition of providing knights for his army. This is the feudal system. By 1086 only a small number of English landholders still held land of any importance.' },
        ],
        board: 'The board demand the title every year, and have never found a manager they trusted to take a defeat well.' },
      { name: 'Ely Fenmen', nickname: 'The Eelmen', ground: 'The Causeway', colours: 'Green and brown', founded: 1902,
        tagline: 'The little club that conquered the giants',
        short: 'The fens round Ely were the last refuge of English resistance, led by Hereward the Wake. The club has the same awkward habit of beating bigger opponents on difficult ground.',
        basis: 'The Isle of Ely and Hereward the Wake, who led resistance against William in the fens in 1070 and 1071.',
        club: 'A town of a few thousand that won the league in 2015 with part-timers and a former postman as manager. The pitch drains badly, and visiting managers have learned to dread it.',
        real: [
          { year: 1070, title: 'Hereward the Wake', text: 'According to the stories told about him, Hereward was an English thegn from Lincolnshire whose lands were given away to Normans (most of what we know was written long afterwards). In 1070 he led an attack on Peterborough Abbey alongside Danish raiders sent by King Sweyn, then made his base on the Isle of Ely, surrounded by marsh.' },
          { year: 1071, title: 'The fall of Ely', text: 'William himself came to Ely in 1071, with ships and a causeway across the fens. The rebels, including Earl Morcar, were beaten. Hereward\'s fate is unknown: some stories say he escaped. Most sources are Norman or written long afterwards, so historians treat the details with care.' },
        ],
        board: 'The board are delighted just to be here, and will forgive almost anything if the team keeps surprising people.' },
      { name: 'Canterbury Archbishops', nickname: 'The Primates', ground: 'Lanfranc Park', colours: 'Purple and white', founded: 1924,
        tagline: 'The richest club with the emptiest trophy cabinet',
        short: 'Canterbury was the seat of the head of the English Church, which held about a quarter of all the land in the country. The club has everything money can buy and has rarely won anything.',
        basis: 'The Archbishopric of Canterbury under Lanfranc, and the wealth and power of the Church after the Conquest.',
        club: 'A modest club until a rich benefactor bought it in 2016. A squad of stars, a magnificent stadium and a trophy cabinet that stays stubbornly empty.',
        real: [
          { year: 1070, title: 'Lanfranc replaces Stigand', text: 'The Pope\'s representatives had disapproved of Stigand, Archbishop of Canterbury, for holding his position irregularly. He was removed in 1070 and replaced by Lanfranc, an Italian scholar and friend of William. Lanfranc rebuilt Canterbury Cathedral and reorganised the English Church on Norman lines.' },
          { year: 1076, title: 'Church courts', text: 'William separated Church courts from the ordinary courts, so that bishops no longer sat in the shire courts and matters of Church law were judged by Church officials. It increased the independence of the Church and also tied it closely to the king.' },
          { year: 1086, title: 'The Church\'s land', text: 'The Domesday Book shows that the Church held about a quarter of the land in England, which made its leaders important landholders as well as spiritual leaders, and gave the king a strong reason to keep close control of who was appointed.' },
        ],
        board: 'The owner has all the money and less and less patience: anything but the title is a failure.' },
      { name: 'York Northumbrians', nickname: 'The Wasted', ground: 'Jorvik Park', colours: 'Crimson and black', founded: 1869,
        tagline: 'The fallen aristocrats of English football',
        short: 'York was once the capital of a Viking kingdom and the greatest city of the north. The club that carries the name is the oldest in the league and has not forgotten that it was once its greatest.',
        basis: 'York and the earldom of Northumbria, the great northern power, devastated in the Harrying of the North.',
        club: 'The oldest club in the league, once its greatest, with eleven titles between 1900 and 1930. A crumbling ground, a loyal and unforgiving crowd, and a long wait for better days.',
        real: [
          { year: 1068, title: 'Castles in the north', text: 'The north of England resisted Norman rule. William built a castle at York in 1068, and another in 1069 after the first garrison was attacked and a Danish fleet sailed up the Humber to support the rebels.' },
          { year: 1070, title: 'The Harrying of the North', text: 'In the winter of 1069 to 1070, William\'s army marched through Yorkshire and the north, burning villages, destroying crops and stores, and killing livestock. Famine followed. Orderic Vitalis, a monk with an English mother and a Norman father, wrote that William was guilty of terrible cruelty. Domesday Book recorded large areas of Yorkshire as "waste" years later.' },
        ],
        board: 'The board want a return to former glory and have said so every year since 1931.' },
      { name: 'Chester Marchers', nickname: 'The Wolves', ground: 'Dee Bank', colours: 'Blue and yellow', founded: 1931,
        tagline: 'The ambitious newcomers',
        short: 'Chester was the base of a new Norman earldom on the Welsh border. The club is a young side that was built to win quickly and has the ambition to match.',
        basis: 'The earldom of Chester and the Marcher lords of the Welsh border, given extra powers by William.',
        club: 'Two village clubs merged in the Depression, and the new club was built on analytics and coaching by an ambitious owner. They want to be a big club and are not fussy about who they upset on the way.',
        real: [
          { year: 1071, title: 'Earls on the border', text: 'In the years after the Conquest William gave powerful Norman nobles earldoms along the Welsh border, at Hereford, Chester and Shrewsbury. Because the border was dangerous, these Marcher earls were allowed more freedom than other lords: they could build castles and take land from the Welsh without asking the king each time.' },
          { year: 1071, title: 'Hugh d\'Avranches', text: 'Hugh d\'Avranches, nicknamed "the Wolf", became Earl of Chester and ruled it almost like a small kingdom, with his own courts and barons. William used men like him to defend the border cheaply and to keep rebellion from spreading from the west.' },
        ],
        board: 'The board want the club on the front pages. They are less interested in how.' },
      { name: 'Stamford Bridge Norsemen', nickname: 'The Longships', ground: 'Riccall Park', colours: 'White and red', founded: 1906,
        tagline: 'The club that always finishes second',
        short: 'Harald Hardrada\'s Norwegian army landed at Riccall in September 1066, beat the northern earls and was destroyed days later at Stamford Bridge. The club has been similarly unlucky in finals.',
        basis: 'The Norwegian invasion of 1066 led by Harald Hardrada, defeated at Stamford Bridge.',
        club: 'Runners-up seven times, and the side that threw away a 2-0 lead on the last day of 2019 with the title won. The supporters believe the club is cursed, and every new manager promises to break it.',
        real: [
          { year: 1066, title: 'Fulford', text: 'In September 1066 Harald Hardrada, King of Norway, landed in the Humber with about 300 ships and supported Tostig, Harold Godwinson\'s exiled brother. On 20 September at Fulford they beat the northern earls Edwin and Morcar and took York.' },
          { year: 1066, title: 'Stamford Bridge', text: 'On 25 September Harold Godwinson surprised the Norwegians at Stamford Bridge and destroyed them. Hardrada and Tostig were both killed. The Anglo-Saxon Chronicle says only 24 ships were needed to carry the survivors home. It was a great victory, but it left Harold\'s army tired and far from the south coast when William landed.' },
        ],
        board: 'The board are patient and fearful in equal parts: they want the curse broken, and are not sure they could bear another near miss.' },
    ],
    derbies: [
      { key: 'hastings', flagship: true, name: 'The Hastings Derby', a: 0, b: 2, heat: 1, record: { a: 46, d: 31, b: 52, total: 129 },
        line: 'The fixture named for the battle that changed England: Saxons against Normans.',
        timeline: [
          { year: 1051, title: 'The promise', text: 'Norman writers say that Edward the Confessor, who had no children, promised the throne to his cousin William of Normandy. English sources do not mention it.' },
          { year: 1064, title: 'The oath', text: 'Harold Godwinson was shipwrecked in Normandy and, according to the Normans (and the Bayeux Tapestry), swore an oath to support William\'s claim. Harold\'s supporters said it was made under pressure and meant nothing.' },
          { year: 1066, title: 'Three claimants', text: 'When Edward died in January, Harold was crowned at once. He faced invasion from two sides: William of Normandy, who said the throne had been promised to him, and Harald Hardrada of Norway, whose claim came from an agreement between earlier kings.' },
          { year: 1066, title: 'Senlac Hill', text: 'On 14 October the English army stood in a shield wall on Senlac Hill, and held for most of the day. According to the chroniclers the Normans then pretended to flee, drawing some of the English off the ridge, and attacked again. Harold was killed and the English line broke.' },
          { year: 1070, title: 'The Harrying', text: 'The English did not accept defeat quietly. William put down rebellion after rebellion, and in the winter of 1069 to 1070 his army devastated the north of England. By 1086 very few English lords still held land of importance.' },
        ],
        aView: 'Wessex believe that the Normans took the crown by force and have spent a thousand years pretending it was lawful.',
        bView: 'Caen consider the Saxons sentimental and slow, a club obsessed with a defeat it never quite learned from.',
        today: 'The fixture draws the biggest crowd in the league, and both clubs treat finishing above the other as almost as important as winning the title.' },
      { key: 'domesday', name: 'The Domesday Derby', a: 1, b: 4, heat: 0.45, line: 'The king\'s surveyors against the Church, which held a quarter of the land.',
        timeline: [
          { year: 1070, title: 'A new archbishop', text: 'Lanfranc became Archbishop of Canterbury and set about recovering Church lands that had been taken during and after the Conquest.' },
          { year: 1086, title: 'The survey', text: 'Domesday Book listed every holding in the kingdom, including the Church\'s, so that the king knew exactly who held what and what each estate was worth.' },
        ] },
      { key: 'harrying', name: 'The Harrying Derby', a: 5, b: 6, heat: 0.55, line: 'The devastated north against the new earls of the border.',
        timeline: [
          { year: 1069, title: 'Revolt in the north', text: 'Northern rebels, helped by a Danish fleet, attacked York and killed its Norman garrison.' },
          { year: 1070, title: 'The Harrying', text: 'William\'s army laid waste to Yorkshire and the north, then turned west and crushed resistance around Chester, after which the new earldom was created there.' },
        ] },
      { key: 'fulford', name: 'The Fulford Derby', a: 5, b: 7, heat: 0.5, line: 'Five days in September 1066 that left the north in ruins.',
        timeline: [
          { year: 1066, title: 'Fulford, 20 September', text: 'Hardrada and Tostig beat the northern earls Edwin and Morcar outside York.' },
          { year: 1066, title: 'Stamford Bridge, 25 September', text: 'Five days later Harold Godwinson destroyed the Norwegian army at Stamford Bridge, just outside the same city.' },
        ] },
      { key: 'rebels', name: 'The Rebels\' Derby', a: 3, b: 5, heat: 0.4, line: 'Two clubs of the English resistance, and the Danish fleets that never quite saved them.',
        timeline: [
          { year: 1069, title: 'Danes in the Humber', text: 'A Danish fleet sailed up the Humber to support the northern rebels around York.' },
          { year: 1070, title: 'Danes at Ely', text: 'Danish raiders joined Hereward the Wake at Peterborough and Ely, but made terms with William and left, and Ely fell in 1071.' },
        ] },
    ],
    study: [
      'Explain why William won the Battle of Hastings.',
      'Explain two consequences of the Harrying of the North.',
      'How far was the Domesday Book the most important thing William did to control England?',
      'Why did Harold Godwinson lose the throne? Give both short-term and long-term reasons.',
      'Write a short account of how the feudal system worked.',
      'Why were castles so important to Norman control?',
    ],
  };

  // ---------- putting a skin on, and taking it off ----------
  // The league's own history entries (written for the original clubs) are kept for the club names that are left.
  function historyFor(skin, originalHistory) {
    const hist = {}, d = {};
    skin.clubs.forEach((c, i) => {
      const o = originalHistory[ORIGINAL_ORDER[i]] || {};
      const real = (c.real || []).map((r) => r.year + ': ' + r.title + '. ' + r.text);
      hist[c.name] = { founded: c.founded, nickname: c.nickname, ground: c.ground, colours: c.colours, tagline: c.tagline, short: c.short, manager: o.manager, basis: c.basis, real: c.real || [],
        paras: [c.club].concat((c.real || []).length ? ['The real history behind the name. ' + real.join(' ')] : []), board: c.board };
    });
    return hist;
  }
  function derbiesFor(skin) {
    return (skin.derbies || []).map((d) => Object.assign({}, d, { a: typeof d.a === 'number' ? skin.clubs[d.a].name : d.a, b: typeof d.b === 'number' ? skin.clubs[d.b].name : d.b }));
  }
  // Makes the game read from a skin (the league's own clubs must already carry the skin's names).
  FM.installSkin = function (skin) {
    if (!skin) { FM.CLUB_HISTORY = orig.history; FM.DERBIES = orig.derbies; FM.REGION = orig.region; FM.skinActive = null; return; }
    FM.CLUB_HISTORY = historyFor(skin, orig.history); FM.DERBIES = derbiesFor(skin); FM.REGION = skin.region || orig.region; FM.skinActive = skin;
  };
  FM.paperName = () => (FM.skinActive && FM.skinActive.paper) || 'The Westhaven Post';

  function renameEverywhere(league, map) {
    const keys = Object.keys(map).sort((a, b) => b.length - a.length);
    const swap = (s) => { if (typeof s !== 'string') return s; let out = s; keys.forEach((k) => { if (out.indexOf(k) >= 0) out = out.split(k).join(map[k]); }); return out; };
    (league.news || []).forEach((n) => { ['headline', 'body', 'publication'].forEach((f) => { if (n[f]) n[f] = swap(n[f]); }); });
    (league.seasonHistory || []).forEach((h) => { ['champion'].forEach((f) => { if (h[f]) h[f] = swap(h[f]); }); ['promoted', 'relegated'].forEach((f) => { if (Array.isArray(h[f])) h[f] = h[f].map(swap); }); });
    return swap;
  }
  FM.applySkin = function (league, skin) {
    if (!league) return;
    // the league goes back to its own names first, so that one skin can replace another
    const cur = league.skin ? league.skin : null;
    const slots = league.teams.slice(0, 8);
    const back = {}; if (cur) slots.forEach((t, i) => { back[cur.clubs[i].name] = ORIGINAL_ORDER[i]; });
    const map = {};
    slots.forEach((t, i) => {
      const from = cur ? cur.clubs[i].name : t.name, to = skin ? skin.clubs[i].name : ORIGINAL_ORDER[i];
      if (from !== to) { map[from] = to; const fs = from.split(' ')[0], ts = to.split(' ')[0]; if (fs !== 'Harbour' && fs !== ts && fs.length > 3) map[fs] = ts; }   // the short form of a club ("Ashford") as well
    });
    const swap = renameEverywhere(league, map);
    slots.forEach((t, i) => { t.origName = ORIGINAL_ORDER[i]; t.name = skin ? skin.clubs[i].name : ORIGINAL_ORDER[i]; });
    // the old pack of history stories is replaced by the new one
    league.news = (league.news || []).filter((n) => !n.historyPack);
    if (skin) league.skin = JSON.parse(JSON.stringify(skin)); else delete league.skin;
    FM.installSkin(skin || null);
    if (skin && league.news && FM.skinHistoryPack) FM.skinHistoryPack(league);
    void swap; void back;
  };
  FM.originalClubName = (team) => team.origName || team.name;

  // The news pieces that introduce the league's history. Newest is read first, so the flagship derby is pushed last.
  FM.skinHistoryPack = function (league) {
    const skin = league.skin; if (!skin || !FM.pushNews) return;
    const paper = skin.paper || 'The Chronicle', me = FM.teamById(league, league.userId);
    skin.clubs.forEach((c, i) => {
      if (i === 0 || i === 2) return;
      const t = league.teams[i];
      FM.pushNews(league, { round: -1, day: 0, preseason: true, historyPack: true, kind: 'Club history', publication: paper, club: t.id, headline: `${c.name}: ${c.tagline.charAt(0).toLowerCase() + c.tagline.slice(1)}`, body: `${c.club} The history behind the name: ${(c.real || []).map((r) => r.year + ', ' + r.title.charAt(0).toLowerCase() + r.title.slice(1) + '. ' + r.text).join(' ')} ${c.board}` });
    });
    const c2 = skin.clubs[2];
    FM.pushNews(league, { round: -1, day: 0, preseason: true, historyPack: true, kind: 'Club history', publication: paper, club: league.teams[2].id, headline: `${c2.name}: ${c2.tagline.charAt(0).toLowerCase() + c2.tagline.slice(1)}`, body: `${c2.club} The history behind the name: ${(c2.real || []).map((r) => r.year + ', ' + r.title.charAt(0).toLowerCase() + r.title.slice(1) + '. ' + r.text).join(' ')} ${c2.board}` });
    const d = FM.DERBIES[0];
    if (d && d.timeline) FM.pushNews(league, { round: -1, day: 0, preseason: true, historyPack: true, kind: 'Derby', publication: paper, club: me.id, mine: true, headline: `${d.name}: how it began`, body: d.timeline.map((e) => e.year + ', ' + e.title.charAt(0).toLowerCase() + e.title.slice(1) + '. ' + e.text).join(' ') + ' ' + d.line });
    if (d) FM.pushNews(league, { round: -1, day: 0, preseason: true, historyPack: true, kind: 'Derby', publication: paper, club: me.id, mine: true, headline: `${me.name} open the season with ${d.name}: ${d.record ? d.record.total + ' meetings and nothing settled' : 'the fixture everyone is talking about'}`, body: `${d.line} ${d.aView || ''} ${d.bView || ''} ${d.today || ''}` });
  };

  // The opening derby's card on the Analysis page: its real history, kept apart from the football story, and a way to study it with the agent.
  FM.skinFlagshipCard = function (league, d, me, opp, firstEver, esc) {
    const rec = FM.derbyRecord(league, d), played = rec.thisGame.a + rec.thisGame.b + rec.thisGame.d, skin = league.skin || {};
    const row = (y) => `<li><b>${y.year}: ${esc(y.title)}.</b> ${esc(y.text)}</li>`;
    const topic = skin.topic ? ' (' + skin.topic + ')' : '';
    return `<div class="card hist-card hist-iron">
      <span class="eyebrow">Before you do anything else</span>
      <h2>${esc(d.name)}: ${esc(d.a)} v ${esc(d.b)}</h2>
      <p class="hist-lede">${firstEver ? `Your first game is the one the whole league is talking about, and it is worth understanding before you pick a team. It is named for real events${esc(topic)}, and the supporters of both clubs know every one of them.` : `Season ${league.season} opens the way every season does: <b>${esc(d.a)} against ${esc(d.b)}</b>, ${esc(d.name)}.`}</p>
      <div class="hist-record" aria-label="All-time record"><div><b>${rec.a}</b><span>${esc(d.a)} wins</span></div><div><b>${rec.d}</b><span>draws</span></div><div><b>${rec.b}</b><span>${esc(d.b)} wins</span></div><div class="hist-total"><b>${rec.total}</b><span>meetings</span></div></div>
      ${played ? `<p class="note">This game so far: ${esc(d.a)} ${rec.thisGame.a}, ${esc(d.b)} ${rec.thisGame.b}, ${rec.thisGame.d} drawn.</p>` : ''}
      <h3>The history behind it</h3>
      <ul class="hist-list">${d.timeline.map(row).join('')}</ul>
      <p class="note">The events above are from history (check them against your textbook). The football records and the clubs' stories are invented for the game.</p>
      <h3>How the two sides see it</h3>
      <p>${esc(d.aView || '')} ${esc(d.bView || '')}</p>
      <p>${esc(d.today || '')}</p>
      ${skin.study && skin.study.length ? `<p><button type="button" class="sk-study" data-study="Ask me one exam-style question about ${esc(d.name)} and the history behind it, wait for my answer, then mark it and show me how to improve it.">Revise this period with the agent</button></p>` : ''}
      <p class="note">${esc((FM.CLUB_HISTORY[me.name] || {}).board || '')}</p>
    </div>`;
  };
  FM.skinCardExtras = function (league, h, d, esc) {
    if (!league || !league.skin) return '';
    const real = (h && h.real) || [], tl = (d && d.timeline && !d.flagship) ? d.timeline : [];
    const li = (y) => `<li><b>${y.year}: ${esc(y.title)}.</b> ${esc(y.text)}</li>`;
    return (real.length ? `<h3>The history behind the name</h3><ul class="hist-list">${real.map(li).join('')}</ul>` : '') + (tl.length ? `<h3>The history behind the rivalry</h3><ul class="hist-list">${tl.map(li).join('')}</ul>` : '') + `<p class="note">The history above is real (check it against your textbook); the football story is invented for the game.</p>${league.skin.study ? `<p><button type="button" class="sk-study" data-study="Teach me about ${esc(h && h.basis || '')} at GCSE level, then ask me one exam-style question and mark my answer.">Revise this with the agent</button></p>` : ''}`;
  };

  // Text that was written for the original clubs (some of the news and interview lines name them) reads with the skin's clubs instead.
  FM.skinText = function (league, s) {
    if (!league || !league.skin || typeof s !== 'string') return s;
    let out = s;
    const names = league.teams.slice(0, 8).map((t) => t.name);
    ORIGINAL_ORDER.forEach((o, i) => { if (out.indexOf(o) >= 0) out = out.split(o).join(names[i]); });
    ORIGINAL_ORDER.forEach((o, i) => { const short = o.split(' ')[0]; if (short !== 'Harbour' && out.indexOf(short) >= 0) out = out.split(short).join(names[i].split(' ')[0]); });
    return out;
  };

  // ---------- choosing a setting ----------
  // One control for the new-game screen and for the club's home page: the written settings, or a topic the student names (built by the agent, checked, and labelled).
  FM.skinPicker = function (host, opts) {
    const id = opts.id || 'sk';
    const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const built = { skin: null };
    const cur = opts.current || '';
    host.innerHTML = `<label class="sk-l" for="${id}Sel">League setting</label>
      <select id="${id}Sel"><option value="">The Westhaven Counties</option>${Object.keys(FM.SKINS).map((k) => `<option value="${k}"${cur === k ? ' selected' : ''}>${esc(FM.SKINS[k].title)} (${esc(FM.SKINS[k].topic)})</option>`).join('')}<option value="__custom"${cur === '__custom' ? ' selected' : ''}>Build one for a topic I am studying…</option></select>
      <p class="note" id="${id}Note"></p>
      <div id="${id}Cust" hidden><div class="sk-row"><input type="text" id="${id}Topic" maxlength="120" placeholder="For example: Elizabethan England, the Cold War, the Roman Republic" autocomplete="off"><button type="button" id="${id}Build">Build this league</button></div><p class="note" id="${id}Msg"></p></div>`;
    const sel = host.querySelector('#' + id + 'Sel'), note = host.querySelector('#' + id + 'Note'), cust = host.querySelector('#' + id + 'Cust'), msg = host.querySelector('#' + id + 'Msg');
    const refresh = () => {
      const v = sel.value; cust.hidden = v !== '__custom';
      if (v === '__custom') note.textContent = built.skin ? built.skin.title + ' is ready. ' + (built.skin.level ? '' : '') : 'The clubs and rivalries are built from real events of the topic you name, then checked. Building uses Locks, and you should check the dates against your own notes.';
      else if (v) note.textContent = '';
      else note.textContent = '';
      if (opts.onChange) opts.onChange(host.querySelector('#' + id + 'Sel').value);
    };
    sel.addEventListener('change', refresh); refresh();
    host.querySelector('#' + id + 'Build').addEventListener('click', async () => {
      const topic = host.querySelector('#' + id + 'Topic').value.trim(), b = host.querySelector('#' + id + 'Build');
      if (topic.length < 4) { msg.textContent = 'Say what you are studying first.'; return; }
      if (FM.locksOut && FM.locksOut()) { msg.textContent = 'Your Locks are used up for now, so I cannot build one. Choose a written setting, or come back when they reset.'; return; }
      b.disabled = true; msg.textContent = 'Building the league and checking the history… this takes a minute or so.';
      try {
        const out = await FM.api('/football/league-skin', { topic, level: opts.level ? opts.level() : 'gcse' });
        built.skin = out.skin; sel.value = '__custom';
        msg.innerHTML = `Built: <b>${esc(out.skin.title)}</b> with clubs ${out.skin.clubs.map((c) => esc(c.name)).join(', ')}. This was written by AI and then fact-checked, but check every date against your own materials.${out.notes && out.notes.length ? ' The checker changed: ' + out.notes.map(esc).join(' ') : ''}`;
        if (opts.onChange) opts.onChange('__custom');
      } catch (e) { msg.textContent = e && e.code === 'NO_SESSION' ? 'Sign in to LastMind to build a league for your own topic.' : (e && e.message) || 'Could not build that just now.'; }
      b.disabled = false;
    });
    return { value() { const v = sel.value; if (v === '__custom') return built.skin; return v ? FM.SKINS[v] : null; }, chosen: () => sel.value, ready: () => sel.value !== '__custom' || !!built.skin };
  };
  FM.skinCard = function (host, league, opts) {
    const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const sk = league.skin;
    host.innerHTML = `<div class="card sk-card"><div class="eyebrow">The league</div><h2>${sk ? esc(sk.title) : 'The Westhaven Counties'}</h2><p class="desc">${sk ? esc(sk.blurb || '') + (sk.source === 'ai' ? ' This setting was written by AI and fact-checked; check the dates against your own materials.' : '') : 'Eight fictional clubs in a fictional region.'} You can change the setting at any time: the clubs are renamed everywhere and the history behind them changes, but results, players and tables stay exactly as they are.</p><div id="skPick"></div><div class="row"><button type="button" class="primary" id="skApply" disabled>Change the league setting</button></div></div>`;
    const apply = host.querySelector('#skApply');
    const curKey = sk ? (sk.source === 'ai' ? '__custom' : sk.id) : '';
    let pick = null;
    pick = FM.skinPicker(host.querySelector('#skPick'), { id: 'skH', current: curKey, level: () => league.tier, onChange: () => { if (pick) apply.disabled = !pick.ready() || (pick.chosen() === curKey && curKey !== '__custom'); } });
    apply.disabled = true;
    apply.addEventListener('click', () => {
      if (!pick.ready()) return;
      if (!confirm('Change the league setting? The clubs will be renamed throughout the game.')) return;
      FM.applySkin(league, pick.value()); if (opts && opts.save) opts.save(); if (opts && opts.refresh) opts.refresh();
    });
  };
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('.sk-study'); if (b && FM.goWorkbench) FM.goWorkbench(b.dataset.study); });
})();
