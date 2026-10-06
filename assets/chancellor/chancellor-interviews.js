/*
 * Be the Chancellor: interviews with preset answers.
 * Nothing here calls the AI. An interview is two or three questions chosen from what the journalists would really ask about the
 * economy as it stands (prices, jobs, borrowing, the currency, the polls, your record, your promises). Each question has five
 * written answers, one in each of five styles, and how the audiences take an answer depends on the style AND on how bad the
 * numbers actually are: reassuring people about a problem that is plain to see is punished, honesty about it is rewarded.
 * Pure logic with no page code, so it can be tested in Node.
 */
(function (root) {
  var STYLES = ['frank', 'reassure', 'blame', 'promise', 'deflect'];
  var clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
  var round1 = function (x) { return Math.round(x * 10) / 10; };
  var hash = function (s) { var h = 0; s = String(s); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };

  // The audiences each topic matters most to.
  var AUD = { prices: ['workers', 'pensioners'], jobs: ['workers', 'young'], borrowing: ['business', 'markets'], currency: ['markets', 'business'], polls: ['party', 'cabinet'], record: ['public', 'workers'], promises: ['public', 'young'], calm: ['public', 'business'] };
  var NOUN = { prices: 'prices', jobs: 'jobs', borrowing: 'borrowing', currency: 'the currency', polls: 'the polls', record: 'the record', promises: 'promises', calm: 'priorities' };
  var TOPIC_OF = { 'Prices': 'prices', 'Jobs': 'jobs', 'Borrowing': 'borrowing', 'The currency': 'currency', 'The polls': 'polls', 'Your record': 'record', 'Your promises': 'promises', 'A calm brief': 'calm' };

  // How bad the numbers are for each topic, from 0 (fine) to 1 (a real problem).
  function severity(topic, c) {
    var m = c.m;
    if (topic === 'prices') return clamp((m.inflation - c.target) / 6, 0, 1);
    if (topic === 'jobs') return clamp((m.unemployment - c.firstUnemployment) / 3, 0, 1);
    if (topic === 'borrowing') return clamp(0.6 * clamp((m.deficit - 3) / 8, 0, 1) + 0.4 * clamp((m.debtGDP - 60) / 60, 0, 1), 0, 1);
    if (topic === 'currency') return clamp(-m.exchangeVsStart / 25, 0, 1);
    if (topic === 'polls') return clamp((c.pollOpp - c.pollGov) / 10, 0, 1);
    if (topic === 'record') return 0.5;
    if (topic === 'promises') return clamp(0.4 + 0.12 * (c.pledges || 0), 0, 1);   // every pledge you have made raises what you are held to
    return 0.2;
  }

  // The questions, three ways of putting each, and the five answers. {tokens} are filled from the game.
  var Q = {
    prices: {
      q: ['Inflation is {infl}%, well above the {target}% target. Families are struggling at the supermarket. What are you actually doing about the cost of living?',
          'Prices are rising by {infl}% a year and for many people wages are not keeping up. Why should anyone trust you to bring that down?',
          '{infl}% inflation against a {target}% target. Is that a failure of policy, Chancellor?'],
      a: { frank: 'Inflation is {infl}%, above the {target}% target, and I will not pretend otherwise. There is no quick fix. We bring it down by keeping the public finances credible and letting the central bank do its job, and that takes time.',
           reassure: 'I understand the concern, but inflation is under control and heading the right way. What we already have in place will bring prices back to normal without any need for drastic action.',
           blame: 'These price rises were set in motion by world markets and by the choices of the last government. We are clearing up a mess we did not make, and we will fix it.',
           promise: 'I promise families that prices will come down. Whatever it takes, I will act in the next Budget to cut your bills and protect your wages.',
           deflect: 'I am not going to give a running commentary on every price figure. We have a plan, and we are getting on with it.' } },
    jobs: {
      q: ['Unemployment has risen from {unemp0}% to {unemp}% since you took over. People are losing their jobs. What do you say to them?',
          'There are more people out of work now than when you started: {unemp}% against {unemp0}%. Is that the price of your policies?',
          'Jobs are the first thing voters care about, and unemployment is {unemp}%. Why has it not come down?'],
      a: { frank: 'Unemployment is {unemp}%, up from {unemp0}%, and behind every point of that is a family. I will not claim it is fine. The way back is steady growth and helping firms to hire, and I will tell you honestly how long that takes.',
           reassure: 'Jobs are being created every week and the labour market is fundamentally strong. The figures will turn, and there is nothing to be alarmed about.',
           blame: 'We inherited weak investment and a labour market that was already slipping. It is the opposition who left businesses with no confidence to hire.',
           promise: 'I promise that every person who has lost a job will have help to find another, and I will bring unemployment down to where it was when I started.',
           deflect: 'I will not be drawn on one month\'s unemployment figure. What matters is the long term, and our approach is the right one.' } },
    borrowing: {
      q: ['The deficit is {deficit}% of GDP and debt is {debt}%. Who is going to pay for all this borrowing?',
          'You are borrowing {deficit}% of GDP a year. Are you leaving your children with the bill?',
          'Debt has reached {debt}% of GDP. At what point do lenders lose patience with {country}?'],
      a: { frank: 'Borrowing is {deficit}% of GDP and debt is {debt}%. That is high, and eventually it has to be paid for, either by growth, by tax or by spending less. I will set out a credible path to bringing it down.',
           reassure: 'There is no reason for concern. Our debt is perfectly manageable and lenders have complete confidence in {country}.',
           blame: 'This borrowing was built up by those who were in charge before me. I am the one being honest about it and doing the hard work to put it right.',
           promise: 'I promise no new taxes and no cuts to the services people rely on, and borrowing will still come down.',
           deflect: 'I do not intend to speculate about what lenders may or may not think. We will publish our plans at the Budget.' } },
    currency: {
      q: ['The {currency} is down {cur}% since you took office. Investors will read every word you say. Is the currency in trouble?',
          'Your currency has lost {cur}% of its value. What are you doing to stop the slide?',
          'Is {country} heading for a currency crisis, Chancellor? Be careful how you answer.'],
      a: { frank: 'The currency has fallen {cur}% and I will not pretend that is unimportant. It reflects concerns about our finances and our prices, and the way to restore confidence is to deal with those, which is what I am doing.',
           reassure: 'The currency is perfectly stable and there is nothing to worry about. Markets move around, and I have complete confidence in it.',
           blame: 'Speculators and foreign investors are talking the currency down, and the opposition is helping them. We will not be bullied by the markets.',
           promise: 'I promise the currency will recover. I give you my personal guarantee that it will not fall any further.',
           deflect: 'I never comment on the currency. Markets will do what they do.' } },
    polls: {
      q: ['You are {gap} points behind {opp} in the polls. Are you the right person to run the economy, and will there be an early election?',
          'The polls say voters have lost faith in you. Why should they give you another chance?',
          '{opp} is ahead and gaining. Do you worry about your own future, Chancellor?'],
      a: { frank: 'The polls are poor, and I understand why, because people are feeling the squeeze. I will not call an early election. I will earn the trust back by fixing the things that matter to them.',
           reassure: 'Polls go up and down. I am confident that once people see the results of our plan, they will come back to us.',
           blame: 'The opposition has offered nothing but criticism and no plan of its own. I am happy to take my chances against that.',
           promise: 'I promise that by the next election every household will feel better off. That is my pledge.',
           deflect: 'I do not comment on polls. I am here to do a job.' } },
    record: {
      q: ['You recently decided: {recent}. Critics say it was the wrong call. Why did you do it?',
          'Your latest decision was {recent}. Who does that help, and who pays for it?',
          'Explain to our viewers why {recent} was the right thing to do.'],
      a: { frank: 'It was a judgement call and there are costs as well as benefits. I made it because I think it does most good for most people, and I will say plainly if the evidence shows it is not working.',
           reassure: 'It was the right decision and it is already working. I have no doubt about it.',
           blame: 'I was left with very few choices by those who came before me. Anyone in my position would have had to do something similar.',
           promise: 'I promise it is only the start. There is a lot more to come, and people will feel the benefit soon.',
           deflect: 'The details are all in the Budget documents, and I would rather not go over them again here.' } },
    promises: {
      q: ['You told the country: "{goals}". Are you on track to deliver that?',
          'You set yourself a goal when you took office. Hand on heart, are you meeting it?',
          'Voters will hold you to what you promised. How are you doing?'],
      a: { frank: 'Not entirely, and I would rather say so than dress it up. Some things are going the right way and some are not, and I am focused on the ones that are not.',
           reassure: 'Absolutely, we are on track. Everything is going to plan and I am confident we will deliver.',
           blame: 'The world changed after I set that goal, and the opposition has blocked us at every turn. We are still doing everything we can.',
           promise: 'I will go further than I promised. I will deliver it and more, and you can hold me to that.',
           deflect: 'I do not think it helps to measure it month by month. Judge us at the end of the term.' } },
    calm: {
      q: ['Looking ahead, what are your priorities for the economy this year, and what should voters hold you to?',
          'If you could change one thing about the economy by this time next year, what would it be?',
          'What is the biggest risk to {country}\'s economy right now, and what are you doing about it?'],
      a: { frank: 'My priority is to keep the economy steady and fair, and to be honest about trade-offs as I go. There are risks, and I would rather name them than hope they pass.',
           reassure: 'The outlook is good and I am confident about the year ahead. There is nothing to worry about.',
           blame: 'My priority is to undo the damage done by the opposition and their allies, because voters know who left things in this state.',
           promise: 'I will deliver rising living standards for every household by the end of the year. You have my word.',
           deflect: 'It would be wrong to get ahead of the Budget. You will hear my priorities when I set them out there.' } },
  };

  // Five stances for the opening interview. What you say becomes what the country holds you to.
  var GOALS = [
    { text: 'Get inflation back to the {target}% target first. Everything else depends on stable prices.', s: { markets: 1, business: 1, pensioners: 1, workers: 0, young: 0, public: 0 }, headline: 'Chancellor puts prices first' },
    { text: 'Jobs and growth come first. I want more people in work and wages rising faster than prices.', s: { workers: 2, young: 1, public: 1, markets: -0.5 }, headline: 'Chancellor promises jobs and growth' },
    { text: 'Fix the public finances. Bring borrowing and debt down to a level we can live with.', s: { markets: 2, business: 1, public: -1, workers: -0.5 }, headline: 'Chancellor vows to fix the public finances' },
    { text: 'Fairness. Protect the most vulnerable and make sure the burden of any adjustment is shared.', s: { pensioners: 1, workers: 1, young: 1, business: -1, markets: -0.5 }, headline: 'Chancellor makes fairness the test' },
    { text: 'Keep the economy steady and avoid big promises. I will not set targets I cannot be sure of meeting.', s: { cabinet: 1, markets: 0.5, public: -1, young: -0.5 }, headline: 'Chancellor refuses to set targets' },
  ];

  function fill(t, c) {
    var m = c.m;
    var map = { infl: round1(m.inflation).toFixed(1), target: c.target, unemp: round1(m.unemployment).toFixed(1), unemp0: round1(c.firstUnemployment).toFixed(1), deficit: round1(m.deficit).toFixed(1), debt: Math.round(m.debtGDP),
      cur: Math.round(-m.exchangeVsStart), gap: Math.round(c.pollOpp - c.pollGov), opp: c.oppName, recent: c.recent || 'your latest measure', goals: (c.goals || '').slice(0, 120), country: c.country, currency: c.currency };
    return String(t).replace(/\{(\w+)\}/g, function (all, k) { return map[k] != null ? map[k] : all; });
  }

  // Which topics to ask about, most pressing first, never the one asked about last time if another will do.
  function topicsFor(c, topicsHint, last) {
    var list = (topicsHint || []).map(function (t) { return TOPIC_OF[t] || t; }).filter(function (t, i, a) { return Q[t] && a.indexOf(t) === i; });
    if (!list.length) list = ['calm'];
    if (list.length > 1 && last && list[0] === last) list.push(list.shift());
    ['calm', 'record', 'prices', 'jobs'].forEach(function (t) { if (list.length < 3 && list.indexOf(t) < 0 && (t !== 'record' || c.recent)) list.push(t); });
    return list.slice(0, 3);
  }

  // The plan for one interview: the questions and their five answers (a different order in each), all decided from the game itself.
  function plan(c, ev) {
    if (ev && ev.goals) {
      return [{ topic: 'goals', question: 'Congratulations on taking office, Chancellor. Before we get into the detail: what are your goals for the economy over this term, and what would count as success?',
        answers: GOALS.map(function (g, i) { return { id: 'goal' + i, style: 'goal' + i, text: fill(g.text, c) }; }) }];
    }
    var seed = hash((ev && ev.id) || 'iv');
    return topicsFor(c, c.topics, c.lastTopic).map(function (topic, n) {
      var def = Q[topic], variant = (seed + n * 7) % def.q.length;
      var order = STYLES.slice(), k = (seed + n * 3) % order.length;
      order = order.slice(k).concat(order.slice(0, k));
      return { topic: topic, question: fill(def.q[variant], c), sev: severity(topic, c),
        answers: order.map(function (st) { return { id: topic + ':' + st, style: st, text: fill(def.a[st], c) }; }) };
    });
  }

  function effect(topic, style, sev) {
    var s = { public: 0, workers: 0, business: 0, pensioners: 0, young: 0, markets: 0, cabinet: 0, party: 0 }, a = AUD[topic] || [], gaffe = false, pressure = 0;
    var add = function (k, v) { s[k] += v; }, aud = function (v) { a.forEach(function (k) { add(k, v); }); };
    var out = { accuracy: 'Fair', directness: 'Direct', empathy: 'Medium', coaching: '' };
    if (style === 'frank') {
      add('public', 1 + (sev > 0.5 ? 1 : 0)); add('business', 1); add('markets', sev > 0.4 ? 1 : 0); aud(1); add('party', sev > 0.5 ? -1 : 0); pressure = sev > 0.6 ? 1 : -0.5;
      out.accuracy = 'Accurate'; out.empathy = 'High'; out.coaching = 'Being straight about the figures costs you a little in your own party, but voters and investors trust a Chancellor who does not hide a problem.';
    } else if (style === 'reassure') {
      if (sev < 0.35) { add('public', 1); add('markets', 1); out.accuracy = 'Fair'; out.coaching = 'Calm reassurance works when the numbers back you up.'; }
      else { var p = 1 + 2 * sev; add('public', -p); add('markets', -p); add('business', -1); aud(-1); pressure = 2 * sev; gaffe = sev > 0.75;
        out.accuracy = 'Misleading'; out.empathy = 'Low'; out.coaching = 'Telling people it is fine when they can see it is not damages trust. The worse the numbers, the more it costs you, and the opposition will quote it back.'; }
    } else if (style === 'blame') {
      add('party', 2); add('cabinet', 1); add('public', -1); aud(sev > 0.5 ? -1 : 0); pressure = sev > 0.6 ? 1 : 0;
      out.accuracy = 'Partly fair'; out.directness = 'Evasive'; out.empathy = 'Low'; out.coaching = 'Blaming others pleases your own side, but the public wants to hear what you will do, and markets hear an excuse.';
    } else if (style === 'promise') {
      add('public', 1.5); aud(1.5); add('markets', -1.5); add('business', topic === 'borrowing' || topic === 'currency' ? -2.5 : -0.5); add('party', 1); pressure = 0.5;
      out.accuracy = 'Not costed'; out.empathy = 'High'; out.coaching = 'A big pledge is popular for a week, but a promise nobody has costed worries investors, and you will be held to it.';
    } else {
      add('public', -1.5); add('markets', topic === 'currency' ? -3 : -1); add('cabinet', -0.5); pressure = 1;
      out.accuracy = 'Unclear'; out.directness = 'Evasive'; out.empathy = 'Low'; out.coaching = 'Refusing to answer looks like having something to hide, and on the currency especially, silence unsettles investors.';
    }
    out.scores = s; out.gaffe = gaffe; out.pressure = pressure; return out;
  }

  var HEAD = {
    frank: function (n) { return 'Chancellor is straight about ' + n; },
    reassureGood: function (n) { return 'Chancellor calm on ' + n; },
    reassureBad: function (n) { return 'Chancellor\'s "no problem" on ' + n + ' ridiculed'; },
    blame: function (n) { return 'Chancellor points the finger over ' + n; },
    promise: function (n) { return 'Chancellor makes big promise on ' + n; },
    deflect: function (n) { return 'Chancellor dodges questions on ' + n; },
  };
  var REACT = {
    frank: 'Commentators said it was a rare thing: a Chancellor who gave the figures and did not flinch. The opposition had little to quote back.',
    reassureGood: 'The tone was steady and the numbers did not contradict it, so there was little for critics to seize on.',
    reassureBad: 'Within minutes the clip was being played alongside the actual figures. Even your own side winced.',
    blame: 'Your own benches enjoyed it. Neutral voters heard a Chancellor making excuses, and asked what happens next.',
    promise: 'It made the evening bulletins. By morning, economists were asking where the money was coming from.',
    deflect: 'The interviewer let the silence hang. The clip of the non-answer was shared widely.',
  };

  // What the audiences made of the whole interview. picks: [{topic, style, sev}] (or {topic:'goals', goal: index}).
  function assess(c, picks) {
    var tot = { public: 0, workers: 0, business: 0, pensioners: 0, young: 0, markets: 0, cabinet: 0, party: 0 }, pressure = 0, gaffe = false, worst = null, tips = [], labels = { accuracy: [], directness: [], empathy: [] };
    if (picks.length === 1 && picks[0].topic === 'goals') {
      var G = GOALS[picks[0].goal];
      Object.keys(G.s).forEach(function (k) { tot[k] += G.s[k]; });
      return { scores: roundScores(tot), pressure: 0, gaffe: false, headline: G.headline, reaction: 'You have told the country what to hold you to. Journalists will come back to it, and so will the opposition.',
        accuracy: 'Clear', directness: 'Direct', empathy: 'Medium', coaching: 'What you say now becomes your test. A narrow goal is easy to defend and easy to be judged on; a broad one is harder to fail but sounds vague. Your notes will keep reminding you of it.' };
    }
    picks.forEach(function (p) {
      var e = effect(p.topic, p.style, p.sev);
      Object.keys(e.scores).forEach(function (k) { tot[k] += e.scores[k]; });
      pressure += e.pressure; if (e.gaffe) gaffe = true;
      labels.accuracy.push(e.accuracy); labels.directness.push(e.directness); labels.empathy.push(e.empathy);
      tips.push(e.coaching);
      var weight = Math.abs(e.scores.public) + Math.abs(e.scores.markets) + (e.gaffe ? 5 : 0);
      if (!worst || weight > worst.weight) worst = { weight: weight, topic: p.topic, style: p.style, sev: p.sev };
    });
    var key = worst.style === 'reassure' ? (worst.sev < 0.35 ? 'reassureGood' : 'reassureBad') : worst.style;
    var mode = function (arr) { var c2 = {}, best = arr[0]; arr.forEach(function (x) { c2[x] = (c2[x] || 0) + 1; if (c2[x] > c2[best]) best = x; }); return best; };
    var seen = {}; tips = tips.filter(function (t) { if (seen[t]) return false; seen[t] = 1; return true; });
    return { scores: roundScores(tot), pressure: Math.round(pressure), gaffe: gaffe, headline: HEAD[key](NOUN[worst.topic] || 'the economy'), reaction: REACT[key],
      accuracy: mode(labels.accuracy), directness: mode(labels.directness), empathy: mode(labels.empathy), coaching: tips.join(' ') };
  }
  function roundScores(t) { var o = {}; Object.keys(t).forEach(function (k) { o[k] = clamp(Math.round(t[k]), -6, 6); }); return o; }

  root.LMInterviews = { plan: plan, assess: assess, effect: effect, severity: severity, STYLES: STYLES, GOALS: GOALS };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.LMInterviews;
})(typeof window !== 'undefined' ? window : globalThis);
