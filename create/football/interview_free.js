// Press conferences: more ways to answer, a free-text answer, and the code that makes sense of it.
//  - Six tones of preset answer (measured, confident, provocative, humble, honest, humorous). Four are offered for each question and which four changes from game to game.
//  - A free-text answer. Personal details are removed first (FM.piiFilter). The words are never printed: they are read for their tone and for what they are about,
//    and the paper writes its own report from preset phrases chosen by that (FM.freeStory).
// Everything here is plain code: no model reads or writes anything.
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- the tones, and what the people watching make of them ----------
  FM.INTERVIEW_MOODS = ['measured', 'confident', 'provocative', 'humble', 'honest', 'humorous'];
  FM.INTERVIEW_MOOD_LABEL = { measured: 'Measured', confident: 'Confident', provocative: 'Provocative', humble: 'Humble', honest: 'Honest', humorous: 'Light-hearted' };
  // the change in public opinion for a tone, before and after a match (result: 'W', 'D' or 'L')
  FM.interviewReaction = function (kind, mood, result) {
    if (mood === 'measured') return 1;
    if (kind === 'pre') return { confident: 1, provocative: -2, humble: 1, honest: 0, humorous: 1 }[mood] || 0;
    const t = { confident: { W: 2, D: 0, L: -2 }, provocative: { W: 3, D: -2, L: -4 }, humble: { W: 1, D: 1, L: 1 }, honest: { W: 0, D: 1, L: 2 }, humorous: { W: 2, D: 0, L: -1 } }[mood];
    return t ? t[result === 'W' ? 'W' : result === 'L' ? 'L' : 'D'] : 0;
  };

  // ---------- the extra preset answers: {opp} is the other club ----------
  // [kind][question][tone] -> wordings. Kind is 'pre' or the result of the match.
  const A = {
    pre: [
      { humble: ['{opp} will be well organised and hard to break down, and we will have to be at our best.', 'They will make it difficult in midfield, and we respect that.', 'They have quality all over the pitch, so I expect them to set up to use it.'],
        honest: ['Honestly, I am not sure how they will set up. They are hard to read, and so are we at the moment.', 'They will test us, and I am not certain we are consistent enough yet to deal with it.', 'I do not know exactly how they will play, but I know what we have to improve.'],
        humorous: ['If I knew what they were planning I would be on the pools by now.', 'They have a plan, we have a plan, and one of them is wrong.', 'I asked my analyst how they would set up and he fell asleep, so we shall find out together.'] },
      { humble: ['Doing the simple things well and staying patient.', 'Getting the basics right: that usually decides games like this.', 'Work rate first. Everything else follows from that.'],
        honest: ['We have to stop giving the ball away cheaply. It has cost us.', 'Being more clinical. We have not been good enough in the box.', 'Defending the first ten minutes better than we have been.'],
        humorous: ['Fewer heart attacks on the touchline, if somebody could arrange that.', 'A goal early, so I can sit down and relax for once.', 'Keeping my voice for the second half. It has been a struggle lately.'] },
      { humble: ['Play your normal game and enjoy it.', 'Stay focused and look after each other out there.', 'Keep it simple and trust the preparation.'],
        honest: ['That they have to earn the right to play first.', 'That the standards in training have to show on the pitch.', 'That nobody\'s place is safe unless they perform.'],
        humorous: ['Do not look at me when you miss. I cannot run any more.', 'Have fun, score goals, and let me worry about the grey hair.', 'Win, and I will buy the coffees. Lose, and I will pretend I never said it.'] },
    ],
    W: [
      { humble: ['We were fortunate in moments, and credit to {opp} for making it hard.', 'The result is good, but there is plenty we can do better.', 'I am pleased, though I will not pretend it was perfect.'],
        honest: ['We rode our luck in the first half, and I will not pretend otherwise.', 'It was not our best, but it is the sort of win you have to learn to grind out.', 'The scoreline looks better than the game felt from the bench.'],
        humorous: ['My heart rate would like a word with the players.', 'I aged ten years in the second half and I am told that is a good result.', 'I have been told I am allowed to smile now. I am testing it.'] },
      { humble: ['A bit of luck and the players\' effort. They deserve the credit.', 'Small things: a block here, a save there. That is football.', 'The lads kept going when it was hard. That is what decided it.'],
        honest: ['We scored when we had to, and we survived a couple of moments we should not have.', 'Honestly, a goal at the right time. It could have gone either way.', 'We were sloppy for a spell and got away with it.'],
        humorous: ['Somebody up there likes us. I am not asking who.', 'A bounce, a post, a prayer. I recommend all three.', 'The ball hit the right people at the right time. I will take it.'] },
      { humble: ['Stay grounded. We have won one game, that is all.', 'Keep working. Nobody here thinks the job is done.', 'Enjoy it, then forget it. The next one is always the hardest.'],
        honest: ['Fix the things that nearly cost us today. That is the focus.', 'We have to be better than that, because better sides will punish it.', 'Be honest about where we were poor. There was plenty.'],
        humorous: ['Recovery, sleep and a stern word about the stress levels on the bench.', 'A day off, then back to work. Some of us will need two days.', 'Lots of ice baths, and someone has to buy me a new voice.'] },
    ],
    L: [
      { humble: ['{opp} deserved it. I will not make excuses.', 'Credit to {opp}; they were better than us today.', 'We were not good enough, and that is on all of us.'],
        honest: ['That was not good enough, and that starts with me.', 'We were poor, and I will say so. The players know it too.', 'I take responsibility. The plan did not work, and I have to find why.'],
        humorous: ['Well, we found a new way to lose. Creative, at least.', 'I would like a refund, but I cannot work out whom to ask.', 'On the plus side, the sandwiches were excellent.'] },
      { humble: ['They took their chances and we did not. That is football.', 'They were sharper in the moments that mattered.', 'We have to learn from it and look at ourselves.'],
        honest: ['We gave it away cheaply and we paid for it.', 'We defended badly at the key moment. No other way to put it.', 'We lacked the courage on the ball when it counted.'],
        humorous: ['It was decided by the usual thing: they scored more.', 'If I knew, I would have changed it. I was busy panicking.', 'Somewhere around the second goal, to be fair to them.'] },
      { humble: ['Keep our heads up and get back to work.', 'Nobody is panicking. We go again.', 'Stay humble and work harder. There is no other answer.'],
        honest: ['Face up to it. We have to look hard at the standards.', 'Start by being honest about today, then fix it on the training pitch.', 'There is no hiding from it. We have to be much better.'],
        humorous: ['Quiet training week and a lot of tea.', 'We will watch it back. Behind a cushion, mostly.', 'A long chat, a longer run, and no mention of today until Thursday.'] },
    ],
    D: [
      { humble: ['A fair result against a decent side.', 'A point is fair, and credit to {opp}.', 'I thought it was about right, and both sides worked hard.'],
        honest: ['We should have won it and we did not take our chances.', 'I am disappointed. We had enough to win and did not do it.', 'Neither side deserved more, and that is not good enough for us.'],
        humorous: ['A draw: the sort of result that makes everyone equally unhappy.', 'We shared the points, which is the polite thing to do.', 'I have mixed feelings, and so do my nerves.'] },
      { humble: ['Small margins at both ends, nothing more.', 'Neither side gave much away and that is how it finished.', 'A couple of moments each. It was that sort of match.'],
        honest: ['Our final ball was poor. That is where we lost the win.', 'We were not brave enough when we had them stretched.', 'We let them back in, and that is on us.'],
        humorous: ['The ball refused to go in. We asked nicely.', 'The post was our best player. Sadly it does not count.', 'We found every way except the right one.'] },
      { humble: ['Keep working. The points will come.', 'Stay together and keep the standard up.', 'Learn from it and go again.'],
        honest: ['Be more ruthless. A draw like that is two points dropped.', 'Sort out our finishing, and quickly.', 'Demand more of ourselves. Today was not enough.'],
        humorous: ['A lot of shooting practice. Possibly with a smaller ball.', 'Forget the post. Hit the net.', 'Some extra finishing work, and a quiet word with the goalposts.'] },
    ],
  };
  FM.extraAnswer = function (kind, result, qi, mood, opp, pickIndex) {
    const set = A[kind === 'pre' ? 'pre' : (result === 'W' ? 'W' : result === 'L' ? 'L' : 'D')], q = set && set[qi], list = q && q[mood];
    if (!list) return null;
    return list[pickIndex % list.length].replace(/\{opp\}/g, opp);
  };

  // ---------- keeping personal details out ----------
  // Removes what can identify a real person or lead somewhere: email addresses, links, phone numbers, handles, postcodes, street addresses, long digit strings
  // and anything that looks like a card or account number. Returns the cleaned text and what was taken out, so the manager can be told.
  FM.piiFilter = function (raw) {
    let t = String(raw == null ? '' : raw).replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 280);
    const found = [];
    const take = (re, label, keep) => { t = t.replace(re, () => { if (found.indexOf(label) < 0) found.push(label); return keep || ''; }); };
    take(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, 'an email address');
    take(/\b(?:https?:\/\/|www\.)\S+/gi, 'a link');
    take(/\b[a-z0-9-]+\.(?:com|co\.uk|net|org|io|uk|tv|me|gg)\b\S*/gi, 'a web address');
    take(/(?:^|\s)@[a-z0-9_.]{2,}/gi, 'a social media handle', ' ');
    take(/(?:\+?\d[\d\s().-]{7,}\d)/g, 'a phone or account number');
    take(/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/gi, 'a postcode');
    take(/\b\d{1,4}\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Close|Drive|Dr|Way|Crescent|Court|Gardens|Place)\b/g, 'an address');
    take(/\b\d{6,}\b/g, 'a long number');
    t = t.replace(/\s+/g, ' ').trim();
    return { text: t, removed: found, empty: !t };
  };

  // ---------- reading the tone and the content ----------
  const WORDS = {
    confident: ['confident', 'confidence', 'will win', 'we win', 'better than', 'best', 'dominate', 'believe', 'belief', 'quality', 'strong', 'ready', 'no doubt', 'sure we', 'expect to win', 'deserve', 'superior', 'take control', 'we can beat', 'on top'],
    provocative: ['rubbish', 'terrible', 'disgrace', 'shock', 'nobody', 'scared', 'arrogant', 'pathetic', 'worst', 'joke', 'embarrass', 'afraid', 'cheat', 'diving', 'time-waster', 'time waste', 'overrated', 'useless', 'clowns', 'weak', 'cowards', 'predictable', 'wind us up', 'in for it', 'they will regret', 'not impressed', 'hopeless', 'a farce'],
    humble: ['respect', 'credit', 'humble', 'modest', 'tough', 'difficult', 'hard game', 'good side', 'good team', 'fair', 'deserved', 'well done', 'proud', 'grateful', 'thank', 'lucky', 'fortunate', 'take nothing for granted', 'one game at a time', 'learn'],
    honest: ['honest', 'honestly', 'my fault', 'my responsibility', 'i take', 'not good enough', 'we were poor', 'poor', 'mistake', 'disappoint', 'let ourselves down', 'let down', 'we failed', 'to blame', 'i got it wrong', 'accountable', 'need to improve', 'fix', 'frustrat', 'concern', 'worried'],
    humorous: ['lol', 'haha', 'ha ha', 'funny', 'laugh', 'joking', 'kidding', 'pizza', 'coffee', 'tea', 'sleep', 'grey hair', 'heart attack', ':)', ':d', ';)', 'banter', 'cushion', 'not to worry'],
    positive: ['great', 'brilliant', 'pleased', 'happy', 'delighted', 'excellent', 'fantastic', 'good', 'love', 'superb', 'impressed', 'proud', 'excited'],
    negative: ['bad', 'awful', 'angry', 'furious', 'sad', 'sick', 'annoyed', 'unhappy', 'hurt', 'gutted', 'poor', 'sorry', 'not happy', 'devastated', 'unacceptable'],
  };
  const TOPICS = [
    ['referee', ['referee', 'ref ', 'officials', 'linesman', 'var ', 'decision', 'penalty', 'red card', 'booked'], 'the officials'],
    ['defence', ['defen', 'back four', 'back line', 'clean sheet', 'concede', 'conceded', 'goalkeeper', 'keeper'], 'the defence'],
    ['attack', ['attack', 'forward', 'striker', 'goals', 'finishing', 'chances', 'final third', 'score'], 'the attack'],
    ['midfield', ['midfield', 'engine room', 'control the game', 'possession'], 'midfield'],
    ['tactics', ['tactic', 'system', 'plan', 'formation', 'press', 'shape', 'game plan', 'set piece', 'set-piece'], 'the plan'],
    ['fans', ['fans', 'supporters', 'crowd', 'atmosphere', 'stadium', 'home support'], 'the supporters'],
    ['fitness', ['injur', 'fitness', 'fit ', 'tired', 'rest', 'rotation', 'recover', 'squad depth'], 'fitness and injuries'],
    ['luck', ['luck', 'unlucky', 'fortunate', 'bounce', 'fortune', 'deserve', 'deserved'], 'luck and the run of play'],
    ['mentality', ['character', 'spirit', 'mentality', 'belief', 'attitude', 'desire', 'heart', 'fight', 'resilience', 'effort', 'work rate'], 'the mentality of the group'],
    ['transfers', ['transfer', 'signing', 'sign ', 'board', 'budget', 'window', 'contract'], 'the club behind the scenes'],
    ['youth', ['young', 'youngster', 'academy', 'debut', 'prospect'], 'the younger players'],
    ['result', ['result', 'points', 'table', 'league', 'position', 'three points', 'win it', 'the win', 'the defeat'], 'the result and the table'],
  ];
  // text: the cleaned answer; ctx: { opp (club name), squad (player names) }
  FM.classifyAnswer = function (text, ctx) {
    ctx = ctx || {}; const raw = String(text || ''), s = ' ' + raw.toLowerCase() + ' ';
    const score = {}; Object.keys(WORDS).forEach((k) => { score[k] = WORDS[k].reduce((a, w) => a + (s.indexOf(w) >= 0 ? 1 : 0), 0); });
    const excl = (raw.match(/!/g) || []).length, caps = (raw.match(/[A-Z]/g) || []).length / Math.max(1, (raw.match(/[A-Za-z]/g) || []).length), words = raw.split(/\s+/).filter(Boolean).length;
    const intensity = Math.min(1, excl * 0.18 + (caps > 0.5 && words >= 3 ? 0.4 : 0) + score.provocative * 0.2);
    // praise for the other side or for the team is not provocative; a dig at somebody is
    const moods = { confident: score.confident, provocative: score.provocative + (excl >= 2 && score.negative ? 1 : 0), humble: score.humble, honest: score.honest, humorous: score.humorous };
    let mood = 'measured', best = 0; Object.keys(moods).forEach((k) => { if (moods[k] > best) { best = moods[k]; mood = k; } });
    if (best === 0) mood = score.positive > score.negative ? 'confident' : score.negative > score.positive ? 'honest' : 'measured';
    if (mood === 'confident' && score.negative > score.positive + 1) mood = 'honest';
    const topics = []; TOPICS.forEach(([k, ws]) => { if (ws.some((w) => s.indexOf(w) >= 0) && topics.length < 3) topics.push(k); });
    const players = (ctx.squad || []).filter((n) => n && s.indexOf(' ' + n.toLowerCase() + ' ') >= 0 || s.indexOf(' ' + n.toLowerCase() + ',') >= 0 || s.indexOf(' ' + n.toLowerCase() + '.') >= 0);
    const about = { opp: !!(ctx.opp && (s.indexOf(ctx.opp.toLowerCase()) >= 0 || /\b(they|them|their)\b/.test(s))), us: /\b(we|us|our|the lads|the boys|the team|the players)\b/.test(s) };
    const tone = score.positive > score.negative ? 'up' : score.negative > score.positive ? 'down' : 'flat';
    return { mood, topics, players: players.slice(0, 2), about, tone, intensity: Math.round(intensity * 100) / 100, words };
  };
  // the effect on public opinion of what was said, on top of the tone: blaming the officials after a loss costs, praising the fans helps
  FM.freeAdjust = function (cls, kind, result) {
    let a = 0;
    if (cls.topics.indexOf('referee') >= 0 && cls.mood !== 'humble') a -= kind === 'pre' ? 1 : (result === 'L' ? 2 : 1);
    if (cls.topics.indexOf('fans') >= 0 && cls.tone !== 'down') a += 1;
    if (cls.topics.indexOf('mentality') >= 0 && cls.tone !== 'down') a += kind === 'pre' ? 0 : 1;
    if (cls.players.length && cls.mood === 'provocative') a -= 1;
    if (cls.intensity >= 0.6 && cls.mood === 'provocative') a -= 1;
    if (cls.words < 3) a -= 1;   // a one-word answer says nothing
    return Math.max(-3, Math.min(2, a));
  };

  // ---------- the paper's report of a free-text answer, from preset phrases ----------
  const VERB = {
    measured: ['kept a calm tone', 'was measured throughout', 'chose his words with care', 'gave little away'],
    confident: ['spoke with real confidence', 'sounded sure of himself', 'was upbeat and direct', 'backed his players openly'],
    provocative: ['did not hold back', 'was pointed in his remarks', 'ruffled a few feathers', 'spoke bluntly'],
    humble: ['struck a modest tone', 'was generous in his words', 'kept his feet on the ground', 'talked up the opposition'],
    honest: ['was candid about the problems', 'did not dodge the difficult questions', 'accepted his share of responsibility', 'spoke frankly'],
    humorous: ['kept things light', 'got a few laughs from the room', 'joked his way through', 'smiled through the questions'],
  };
  const TOPIC_LINE = { referee: 'the officials', defence: 'the defence', attack: 'the attack', midfield: 'the middle of the pitch', tactics: 'the plan', fans: 'the supporters', fitness: 'fitness and injuries', luck: 'luck and the run of play', mentality: 'the mentality of the group', transfers: 'the club behind the scenes', youth: 'the younger players', result: 'the result and the table' };
  const pickBy = (arr, key) => { let h = 7; String(key).split('').forEach((c) => { h = (h * 31 + c.charCodeAt(0)) >>> 0; }); return arr[h % arr.length]; };
  FM.freeStory = function (cls, ctx) {
    const topics = cls.topics.map((k) => TOPIC_LINE[k]).filter(Boolean), key = (ctx.key || '') + cls.mood;
    const about = topics.length ? topics.length > 1 ? topics[0] + ' and ' + topics[1] : topics[0] : (cls.about.opp ? ctx.opp : 'the game');
    const verb = pickBy(VERB[cls.mood] || VERB.measured, key);
    let s = (ctx.pre ? 'Asked what to expect, ' : 'Asked about the game, ') + 'the manager ' + verb + ' when the conversation turned to ' + about + '.';
    if (cls.players.length) s += ' ' + cls.players.join(' and ') + (cls.players.length > 1 ? ' were' : ' was') + ' mentioned by name.';
    if (cls.about.opp && ctx.opp && topics.length) s += ' There was a word or two about ' + ctx.opp + ' as well.';
    if (cls.tone === 'up' && cls.mood !== 'provocative') s += ' The mood was positive.'; else if (cls.tone === 'down') s += ' There was an edge of frustration.';
    if (cls.intensity >= 0.6) s += ' It was delivered with some feeling.';
    return s;
  };
  // headlines for the tones that the older code did not have, and for the free-text answers (which use the tone only)
  FM.interviewHeadline = function (mood, pre, team, opp, result) {
    const T = {
      humble: pre ? team + ' manager shows respect for ' + opp : (result === 'W' ? team + ' manager stays humble after beating ' + opp : team + ' manager credits ' + opp + ' after the match'),
      honest: pre ? team + ' manager admits there is work to do before ' + opp : (result === 'L' ? team + ' manager takes the blame after ' + opp : team + ' manager is candid after ' + opp),
      humorous: pre ? team + ' manager jokes ahead of ' + opp : team + ' manager lightens the mood after ' + opp,
    };
    return T[mood] || null;
  };
  FM.interviewKit = { esc };
})();
