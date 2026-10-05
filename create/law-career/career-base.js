// Criminal Lawyer Career: the rules (ranks, promotion, scoring) and the helper that turns a hand-written case into the same Case Graph the
// Criminal trial simulation plays. Nothing here calls the AI: every case is written in advance, so building a career costs nothing.
// Pure logic with no page code, so it can be tested in Node.
(function () {
  const root = typeof window !== 'undefined' ? window : globalThis;
  const L = (root.LAW_CAREER = root.LAW_CAREER || { cases: [] });

  // ---------- ranks and promotion ----------
  // Four promotions. The bullpen is where a barrister starts and stays for the first two ranks; the third rank earns an office.
  // To move up you need BOTH enough cases behind you AND the right standard (the average score of your most recent cases);
  // from Senior Junior upward the big special cases count too, so a promotion is never just a matter of time served.
  L.ranks = [
    { id: 'pupil', title: 'Pupil Barrister', place: 'The Bullpen', scene: 'bullpen', workplace: 'bullpen',
      blurb: 'A shared desk in the bullpen and the briefs nobody else wants. Every case is a small one: learn the routine.',
      next: { cases: 4, recent: 4, avg: 55, specials: 0 } },
    { id: 'junior', title: 'Junior Barrister', place: 'The Bullpen', scene: 'bullpen', workplace: 'bullpen',
      blurb: 'Still in the bullpen, but you are trusted with real briefs now, and the first big case lands on your desk.',
      next: { cases: 10, recent: 6, avg: 62, specials: 1 } },
    { id: 'senior', title: 'Senior Junior', place: 'Your own office', scene: 'chambers', workplace: 'office',
      blurb: 'A door that closes, a window and a desk of your own. Instructing solicitors ask for you by name.',
      next: { cases: 18, recent: 8, avg: 68, specials: 3 } },
    { id: 'kc', title: "King's Counsel", place: 'The corner office', scene: 'office_kc', workplace: 'office',
      blurb: 'Silk. You take the cases that make the news, and the juniors in the bullpen watch how you work.',
      next: { cases: 26, recent: 10, avg: 74, specials: 5 } },
    { id: 'head', title: 'Head of Chambers', place: 'The corner office', scene: 'office_kc', workplace: 'office',
      blurb: 'You run chambers. There is nowhere higher to go; the work is the reward.', next: null },
  ];

  const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

  // What a rank asks for, measured against a list of finished cases ({ score, special }).
  L.requirement = function (rank, results) {
    const n = rank.next; if (!n) return null;
    const last = results.slice(-n.recent).map((r) => r.score);
    const specials = results.filter((r) => r.special).length;
    const have = { cases: results.length, avg: last.length >= Math.min(n.recent, 2) ? Math.round(mean(last)) : 0, specials };
    return { need: n, have, met: results.length >= n.cases && have.avg >= n.avg && specials >= n.specials };
  };
  // The rank the results so far have earned (an index into L.ranks).
  L.rankIndex = function (results) {
    let i = 0;
    while (i < L.ranks.length - 1 && L.requirement(L.ranks[i], results).met) i++;
    return i;
  };

  // ---------- scoring ----------
  // 0-100. Half is what the jury did (a win is full marks; a loss still earns credit for the weight of your own side's facts you got
  // in front of them), half is how well you used the law (the end-of-trial assessment, when it could be produced).
  const RATING = { strong: 100, developing: 65, needs_work: 30, not_shown: 50 };
  L.score = function (o) {
    const g = o.graph, own = o.side;
    let total = 0, got = 0;
    g.facts.forEach((f) => { if (f.favours === own) { total += f.weight; if (o.established.includes(f.id)) got += f.weight; } });
    const share = total ? got / total : 0.5;
    const outcome = o.learnerWon ? 100 : Math.round(55 * share);
    const nodes = o.assessment && Array.isArray(o.assessment.nodes) ? o.assessment.nodes : [];
    const law = nodes.length ? mean(nodes.map((n) => RATING[n.rating] != null ? RATING[n.rating] : 50)) : Math.round(100 * share);
    const persuasion = o.assessment && Number.isFinite(o.assessment.persuasion) ? o.assessment.persuasion : 0;
    return Math.max(0, Math.min(100, Math.round(0.5 * outcome + 0.5 * law + 6 * persuasion)));
  };

  // ---------- turning a written case into a Case Graph ----------
  const SIDE = { p: 'prosecution', d: 'defence', n: 'neutral' };
  const words = (s) => String(s || '').split(/\s+/).filter(Boolean);
  const ids = (s) => (Array.isArray(s) ? s : words(s));

  L.add = function (c) { L.cases.push(c); };
  L.byId = (id) => L.cases.find((c) => c.id === id) || null;

  L.toGraph = function (c) {
    const line = (l) => ({ q: l[0], a: l[1], factIds: ids(l[2]) });
    const g = {
      meta: Object.assign({
        timeUntilTrial: 'Trial begins tomorrow at 10:00', court: 'Ashford Crown Court', judge: 'His Honour Judge Marlowe', clerk: 'Mrs Okonkwo',
        prosecutionCounsel: 'Ms Imogen Hart', defenceCounsel: 'Mr Julian Reeve', defendantId: 'def', interviewCharacterId: '', free: true, portraitVersion: 99,
      }, c.meta || {}),
      facts: c.facts.map((f) => ({ id: f[0], text: f[1], favours: SIDE[f[2]] || 'neutral', weight: f[3] || 1 })),
      characters: c.characters.map((x, i) => ({
        id: x.id, name: x.name, role: x.role, side: SIDE[x.side] || 'neutral', portraitPrompt: x.look || '', demeanour: x.demeanour || '', speech: x.speech || '',
        mind: { knows: ids(x.knows), believes: x.believes || [], remembers: x.remembers || [], gaps: x.gaps || [], reliability: x.rel || 'medium',
          honesty: x.honesty || 'truthful', concealing: ids(x.hide), lieDetails: x.lie || '', candourWithOwnCounsel: x.candour || 'partial' },
        calledBy: SIDE[x.by] && x.by !== 'n' ? SIDE[x.by] : 'none', order: x.order || i + 1, introducesEvidence: ids(x.intro),
        inChief: (x.chief || []).map(line), underCross: (x.cross || []).map(line),
      })),
      evidence: c.evidence.map((e) => ({ id: e.id, name: e.title, kind: e.kind, title: e.title, caption: e.caption || '', content: e.content || {},
        factIds: ids(e.facts), favours: SIDE[e.favours] || 'neutral', introducedBy: e.by || null })),
      caseFile: { summary: c.caseFile.summary, agreedFacts: c.caseFile.agreed || [], chargeSheet: c.caseFile.chargeSheet || c.charge },
      scripts: { arraignment: c.scripts.arraignment || [], prosecutionOpening: c.scripts.pOpen || [], defenceOpening: c.scripts.dOpen || [],
        prosecutionClosing: c.scripts.pClose || [], defenceClosing: c.scripts.dClose || [], summingUp: c.scripts.summing || [] },
      verdict: { convictionThreshold: c.verdict.threshold, elements: (c.verdict.elements || []).map((e) => ({ label: e[0], factIds: ids(e[1]) })),
        sentences: (c.verdict.sentences || []).map((s) => ({ minScore: s[0], text: s[1] })), notGuiltyText: c.verdict.notGuilty },
      curriculum: (c.concepts || []).map((k) => ({ label: k.label, arisesWhen: k.arises || '', calledUponAt: { stage: k.stage || 'closing', characterId: k.char || '' } })),
    };
    // Every person who appears on screen has a hand-picked, front-facing cutout made once and shipped with the site (nothing is generated while playing).
    const slug = (n) => String(n).toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
    g.characters.forEach((ch) => {
      if (ch.calledBy !== 'none' || ch.id === g.meta.interviewCharacterId || ch.id === g.meta.defendantId) { ch.portrait = '/assets/career/portraits/' + c.id + '-' + ch.id + '.webp'; ch.portraitTransparent = true; }
    });
    g.meta.judgePortrait = '/assets/career/portraits/judge-' + slug(g.meta.judge) + '.webp'; g.meta.judgePortraitTransparent = true;
    if (g.verdict.convictionThreshold === 'auto') g.verdict.convictionThreshold = L.autoThreshold(g, c.role === 'prosecution' ? 'prosecution' : 'defence');
    return g;
  };
  // The shape the courtroom reads as `trial` (title, charge and briefing are shown in chambers; the concepts feed the guidance panel).
  L.toTrial = function (c) {
    return {
      role: c.role === 'prosecution' ? 'prosecution' : 'defence', minutes: c.minutes,
      picked: (c.concepts || []).map((k, i) => ({ id: 'n-career-' + c.id + '-' + i, label: k.label, subtopic: k.subtopic || 'Criminal law' })),
      case: { title: c.title, overview: { charge: c.charge, studentBriefing: c.briefing, summary: c.caseFile.summary } },
    };
  };
  // The interview person for the learner's side: the defendant for defence, the officer in the case for prosecution.
  L.interviewFor = (c) => (c.role === 'prosecution' ? (c.officerId || c.characters[0].id) : 'def');

  // ---------- the boss ----------
  // Sir Nigel Crane, Head of Chambers, hands out the files and reacts to how a case went. His lines are written in advance (no AI): a bank per
  // situation, one chosen by a stable hash of the case and how many cases you have done, so they change each time but never flicker on re-render.
  L.boss = { name: 'Sir Nigel Crane', role: 'Head of Chambers' };
  const hashStr = (str) => { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const pick = (arr, key) => arr[hashStr(key) % arr.length];
  const fill = (t, c) => t.replace(/\{title\}/g, c.title).replace(/\{side\}/g, c.role === 'defence' ? 'the defence' : 'the Crown');
  const BEFORE_FIRST = [
    "It's your first case, kid. Don't mess it up.",
    "Right. Your first brief. Don't make me regret taking you on.",
    "First day, first file. Try not to embarrass chambers.",
    "Everyone remembers their first brief. Make sure it's for the right reasons.",
  ];
  const BEFORE_RANK = [
    [ // Pupil
      "Another one for the bullpen. Try to read it before the hearing this time.",
      "Here. Nobody else wanted it, which makes it yours.",
      "Don't look at me like that. Everyone starts at a shared desk.",
      "Files, pink ribbon, you know the drill. Off you go.",
      "The solicitors think you're cheap. Prove them wrong.",
      "Read the evidence twice. Then read it again.",
    ],
    [ // Junior
      "You're getting better briefs now. Don't get comfortable.",
      "I've put my name next to yours on this one. Remember that.",
      "A proper brief. Read it twice, then check the exhibits again.",
      "The clerks tell me you're improving. I'll believe it when the jury does.",
      "Sharp questions, short speeches. That's all I ask.",
    ],
    [ // Senior Junior
      "Close the door behind you. This one matters.",
      "Instructing solicitors asked for you by name. Don't make me look foolish.",
      "You've got an office now. Earn the chair.",
      "Clean hands, clear head. Don't take anything for granted.",
      "This is the sort of brief that gets you noticed, for good or ill.",
    ],
    [ // King's Counsel
      "You're silk now. Act like it.",
      "Juniors are watching how you work. Give them something worth copying.",
      "The Bar Council reads the papers, and so do I. No mistakes.",
      "I don't hand these to just anyone. Don't waste it.",
      "A silk is only as good as their last verdict. What was yours?",
    ],
    [ "Chambers is yours now. I'm only here for the tea.", "You run this place. Show them how it's done." ],
  ];
  const BEFORE_SPECIAL = [
    "This one is a big one. The kind that makes or breaks a name. Don't fluff it.",
    "Half an hour of your life, and a client's whole future. Take it seriously.",
    "The papers will be watching this one. Wear the good suit.",
    "A proper trial. Take your time, and don't take any shortcuts.",
  ];
  L.bossBefore = function (c, rankIdx, played) {
    const key = c.id + ':' + played;
    const opener = played === 0 ? pick(BEFORE_FIRST, key) : c.special ? pick(BEFORE_SPECIAL, key) : pick(BEFORE_RANK[Math.min(rankIdx, BEFORE_RANK.length - 1)], key);
    const scene = rankIdx >= 2 ? 'boss_brief_office' : hashStr(c.id) % 2 ? 'boss_brief_desk' : 'boss_brief_bullpen';
    return { scene, lines: [opener, fill("{title}. You are for {side}. " + c.tagline.replace(/[.\s]+$/, '') + '.', c)] };
  };
  const AFTER_POOR = [
    "Did you read the evidence at all?",
    "I have seen pupils do better with their eyes closed.",
    "That was not good enough. Not nearly.",
    "The jury weren't the problem. You were.",
    "Come here. That was an embarrassment.",
    "I expect better from this chambers, and so should you.",
  ];
  const AFTER_VERY_POOR = [
    "Do you have any idea what that cost this chambers?!",
    "I have a window to replace and a solicitor to apologise to. Get out of my sight.",
    "That was the worst advocacy I have seen in thirty years at the Bar!",
    "I put my name on you. And you did THAT with it?",
    "Out. Go and read the textbook. All of it.",
  ];
  const AFTER_GOOD = [
    "Not bad. Not bad at all.",
    "The solicitors rang. They were... complimentary. Don't let it go to your head.",
    "That is how it's done. Do it again.",
    "Hm. Better. Much better.",
    "I'll say this once: well done.",
  ];
  L.bossAfter = function (c, score, won, rankIdx) {
    const key = c.id + ':' + score;
    let kind = null;
    if (score < 30) kind = 'very_poor'; else if (score < 50) kind = 'poor'; else if (score >= 75) kind = 'good';
    if (!kind) return null;
    const office = rankIdx >= 2;
    const scene = kind === 'good' ? 'boss_nod' : kind === 'poor' ? (office ? 'boss_poor_office' : 'boss_poor') : (office ? 'boss_very_poor_office' : 'boss_very_poor');
    const bank = kind === 'good' ? AFTER_GOOD : kind === 'poor' ? AFTER_POOR : AFTER_VERY_POOR;
    let detail;
    if (kind === 'good') detail = won ? fill("{title}. Take the win, and the next brief.", c) : fill("You lost {title}, but you lost it properly. That I can work with.", c);
    else if (!won) detail = c.role === 'defence' ? fill("In {title} you let the Crown run the whole case.", c) : fill("In {title} you handed the defence every doubt they needed.", c);
    else detail = fill("You won {title}, and I still couldn't tell you how. Your law was a mess.", c);
    return { kind, scene, lines: [pick(bank, key), detail] };
  };

  // ---------- how long a case really takes ----------
  // Calibrated against a real run: the old 15-minute setting allowed 15 client questions and 10 per witness, which is about 40
  // minutes of honest work. Time is the sum of reading, speaking and typing, each at a realistic pace.
  const T = { wpm: 190, q: 0.6, openWrite: 2, closeWrite: 3, trial: 1.2, analysis: 1 };
  L.minutesFor = function (graph, side, caps) {
    const wit = graph.characters.filter((x) => x.calledBy === 'prosecution' || x.calledBy === 'defence');
    const other = side === 'prosecution' ? 'defence' : 'prosecution';
    const w = (t) => words(t).length;
    const para = (a) => (a || []).reduce((s, t) => s + w(t), 0);
    const scriptedWords = para(graph.scripts.arraignment) + para(graph.scripts.summingUp) + para(graph.scripts[other + 'Opening']) + para(graph.scripts[other + 'Closing'])
      + wit.reduce((s, x) => s + (x.calledBy === side ? (x.underCross || []) : (x.inChief || [])).reduce((t, l) => t + w(l.q) + w(l.a), 0), 0);
    const readWords = w(graph.caseFile.summary) + (graph.caseFile.agreedFacts || []).reduce((s, t) => s + w(t), 0) + graph.evidence.reduce((s, e) => s + w(JSON.stringify(e.content)) * 0.7, 0);
    const fixed = (readWords + scriptedWords) / T.wpm + T.openWrite + T.closeWrite + T.trial + T.analysis;
    const led = wit.length;
    return { fixed, led, estimate: fixed + T.q * (caps.interview + led * caps.exam), q: T.q };
  };
  // Questions allowed so the whole thing comes out near the time that was picked: what is left after the fixed parts, shared between
  // the private interview and each witness the learner questions. Never fewer than 2 (a conversation needs some room) or more than
  // the old ceilings (15 and 10).
  L.capsFor = function (graph, side, minutes) {
    const probe = L.minutesFor(graph, side, { interview: 0, exam: 0 });
    const slots = 1 + probe.led;
    const each = Math.round(Math.max(0, minutes - probe.fixed) / T.q / slots);
    const caps = { interview: Math.max(2, Math.min(15, each)), exam: Math.max(2, Math.min(10, each)) };
    const m = L.minutesFor(graph, side, caps);
    return { caps, estimate: Math.round(m.estimate), fixed: Math.round(m.fixed * 10) / 10 };
  };

  // ---------- checking a written case plays fairly ----------
  // What the jury hears with NO effort from the learner (the scripted lines and exhibits only) and with a perfect effort (every fact
  // an examined witness knows and would admit, and every exhibit put to a witness).
  L.reach = function (g, side) {
    const none = new Set();
    const addEv = (evIds) => (evIds || []).forEach((id) => { const e = g.evidence.find((x) => x.id === id); if (e) e.factIds.forEach((f) => none.add(f)); });
    g.characters.forEach((ch) => {
      if (ch.calledBy === 'none') return;
      addEv(ch.introducesEvidence);
      (ch.calledBy === side ? ch.underCross : ch.inChief).forEach((l) => l.factIds.forEach((f) => none.add(f)));
    });
    // A perfect learner brings out everything that helps their own side (or hurts nobody) and never puts the other side's exhibits forward.
    const W = {}; g.facts.forEach((f) => { W[f.id] = f; });
    const useful = (id) => W[id] && (W[id].favours === side || W[id].favours === 'neutral');
    const best = new Set(none);
    g.evidence.forEach((e) => e.factIds.filter(useful).forEach((f) => best.add(f)));
    g.characters.forEach((ch) => { if (ch.calledBy !== 'none') ch.mind.knows.filter((f) => !ch.mind.concealing.includes(f) && useful(f)).forEach((f) => best.add(f)); });
    return { none, best };
  };
  L.margin = function (g, set, thr) {
    const W = {}; g.facts.forEach((f) => { W[f.id] = f; });
    let p = 0, d = 0; set.forEach((id) => { const f = W[id]; if (!f) return; if (f.favours === 'prosecution') p += f.weight; else if (f.favours === 'defence') d += f.weight; });
    return p - d - (thr || 0);
  };
  // The conviction threshold that asks the learner for a bit over half of the swing between doing nothing and doing everything.
  L.autoThreshold = function (g, side) {
    const r = L.reach(g, side), m0 = L.margin(g, r.none, 0), mb = L.margin(g, r.best, 0);
    return side === 'defence' ? Math.round(m0 - 0.55 * (m0 - mb)) : Math.round(m0 + 0.55 * (mb - m0));
  };
  L.analyse = function (c) {
    const g = L.toGraph(c), side = c.role === 'prosecution' ? 'prosecution' : 'defence';
    const r = L.reach(g, side), thr = g.verdict.convictionThreshold;
    const win = (m) => (side === 'defence' ? m <= 0 : m > 0);
    const total = (fav) => g.facts.filter((f) => f.favours === fav).reduce((s, f) => s + f.weight, 0);
    const mn = L.margin(g, r.none, thr), mb = L.margin(g, r.best, thr);
    const missing = g.facts.filter((f) => f.favours !== 'neutral' && !g.characters.some((ch) => ch.calledBy !== 'none' && ch.mind.knows.includes(f.id)) && !g.evidence.some((e) => e.factIds.includes(f.id))).map((f) => f.id);
    return { doingNothingWins: win(mn), perfectWins: win(mb), marginNothing: mn, marginBest: mb, threshold: thr, totalP: total('prosecution'), totalD: total('defence'), unreachable: missing, graph: g };
  };
})();
