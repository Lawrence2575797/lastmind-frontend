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
    return {
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
  // an examined witness knows and would admit). A fair case: doing nothing loses, a perfect run wins, for the learner's own side.
  L.analyse = function (c) {
    const g = L.toGraph(c), side = c.role === 'prosecution' ? 'prosecution' : 'defence';
    const heard = new Set(), W = {}; g.facts.forEach((f) => { W[f.id] = f; });
    const addEv = (evIds) => (evIds || []).forEach((id) => { const e = g.evidence.find((x) => x.id === id); if (e) e.factIds.forEach((f) => heard.add(f)); });
    g.characters.forEach((ch) => {
      if (ch.calledBy === 'none') return;
      addEv(ch.introducesEvidence);
      const scripted = ch.calledBy === side ? ch.underCross : ch.inChief;
      scripted.forEach((l) => l.factIds.forEach((f) => heard.add(f)));
    });
    const sum = (set, fav) => [...set].filter((id) => W[id] && W[id].favours === fav).reduce((s, id) => s + W[id].weight, 0);
    const none = new Set(heard);
    const best = new Set(heard);
    g.evidence.forEach((e) => e.factIds.forEach((f) => best.add(f))); // anything can be put to a witness
    g.characters.forEach((ch) => { if (ch.calledBy !== 'none') ch.mind.knows.filter((f) => !ch.mind.concealing.includes(f)).forEach((f) => best.add(f)); });
    const margin = (set) => sum(set, 'prosecution') - sum(set, 'defence') - g.verdict.convictionThreshold;
    const win = (m) => (side === 'defence' ? m <= 0 : m > 0);
    const total = (fav) => g.facts.filter((f) => f.favours === fav).reduce((s, f) => s + f.weight, 0);
    const missing = g.facts.filter((f) => f.favours !== 'neutral' && !g.characters.some((ch) => ch.calledBy !== 'none' && ch.mind.knows.includes(f.id)) && !g.evidence.some((e) => e.factIds.includes(f.id))).map((f) => f.id);
    return { doingNothingWins: win(margin(none)), perfectWins: win(margin(best)), marginNothing: margin(none), marginBest: margin(best), totalP: total('prosecution'), totalD: total('defence'), unreachable: missing, graph: g };
  };
})();
