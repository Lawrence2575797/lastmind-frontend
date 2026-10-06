/*
 * Be the Chancellor: your Treasury adviser.
 * A friendly pop-up guide that tells you what matters and what to do next, so nobody has to work it out from a wall of controls.
 *   - an opening welcome, and "Show me round": a short tour that moves to each part of the game and lights it up
 *   - "What should I do now?": a tip chosen from the state of the game (Budget open or closed, what is drafted, what is going wrong)
 * Nothing here calls the AI. The adviser's pictures were made once with fal.ai.
 */
(function (root) {
  'use strict';
  var env = null, spot = null, card = null, avatar = null, tourOn = false, tourAt = 0, resizeBound = false;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var IMG = { hello: '/assets/chancellor/adviser-hello.jpg', point: '/assets/chancellor/adviser-point.jpg', think: '/assets/chancellor/adviser-think.jpg' };
  var f1 = function (x) { return (Math.round(x * 10) / 10).toFixed(1); };

  function state() { var g = env.ui.g; g.coach = g.coach || { seen: false, open: false, muted: false }; return g.coach; }
  function nextBudget() {
    var g = env.ui.g, best = null;
    g.events.forEach(function (e) { if (e.kind === 'budget' && !e.done && (!best || e.date < best.date)) best = e; });
    return best;
  }
  // What is going worst, in plain words, from the figures.
  function worries() {
    var g = env.ui.g, m = env.metrics(), t = g.pf.target, w = [];
    if (m.inflation > t + 1.5) w.push({ sev: (m.inflation - t) / 4, text: 'prices are rising ' + f1(m.inflation) + '% a year against a target of ' + t + '%', tab: 'economy' });
    if (m.unemployment > g.startSnap.u + 0.8) w.push({ sev: (m.unemployment - g.startSnap.u) / 3, text: 'unemployment has risen to ' + f1(m.unemployment) + '%', tab: 'economy' });
    if (m.deficit > 5) w.push({ sev: (m.deficit - 3) / 8, text: 'the government is borrowing ' + f1(m.deficit) + '% of GDP a year', tab: 'economy' });
    if (m.exchangeVsStart < -8) w.push({ sev: -m.exchangeVsStart / 25, text: 'the currency is down ' + Math.round(-m.exchangeVsStart) + '% since you started', tab: 'economy' });
    if (m.growth < 1) w.push({ sev: (1 - m.growth) / 3, text: 'the economy is barely growing (' + f1(m.growth) + '%)', tab: 'economy' });
    w.sort(function (a, b) { return b.sev - a.sev; });
    return w;
  }
  function draftCount() { return env.draftCount(); }

  /* ---------- the tour ---------- */
  function tourSteps() {
    var g = env.ui.g, G = root.LMGuide && root.LMGuide.situation(g.sit), wr = worries(), alevel = env.level() === 'alevel', b = nextBudget();
    var issue = wr.length ? 'The biggest worry right now: ' + wr[0].text + '.' : 'Nothing is on fire, so the job is to keep it that way.';
    return [
      { img: 'hello', html: '<b>Welcome, Chancellor.</b> ' + esc(g.cfg.country) + "'s situation: <b>" + esc(G ? G.title : 'a hard stretch') + '</b>. In four years there is an election. Your job is to make things better enough that voters give you another term. I will show you round, and I will tell you what matters. Ignore everything else for now.' },
      { img: 'point', tab: 'overview', target: '.chn-kpis', html: '<b>These eight numbers are how you are doing.</b> You do not need to improve all of them. ' + esc(issue) + ' Start there.' },
      { img: 'point', target: '.chn-gtab', html: '<b>This tab explains the economics.</b> It says what is going on in plain words and why. Reading it first is the best five minutes you will spend. Open it any time.' },
      { img: 'point', tab: 'policy', target: '.chn-nav', html: '<b>Policies are grouped by area.</b> There are lots, but you only need a few. The areas with a ★ hold the most useful ones for this situation, and I have switched on "suggested only" so you are not buried. Each policy has a Details section that explains what it does.' },
      { img: 'point', target: '[data-tab="analysis"]', html: '<b>Before you commit, find out.</b> The Analysis tab studies what happened in other countries that tried the same policy, and ' + (alevel ? 'brings you a short briefing with a recommendation.' : 'lets you test it yourself. It is optional, but it is how you avoid expensive mistakes.') },
      { img: 'point', target: '[data-act="advance"]', html: '<b>Time only moves when you press Advance.</b> ' + (b ? 'Policy can only be changed at a Budget. The next one is <b>' + esc(env.nice(b.date)) + '</b>. Draft your changes first, then Advance until it opens.' : 'Policy can only be changed at a Budget.') },
      { img: 'hello', html: '<b>That is the lot.</b> Whenever you are unsure, press my picture in the corner and I will tell you what to do next. Good luck.' },
    ];
  }
  function clearSpot() { if (spot) { spot.remove(); spot = null; } }
  function placeSpot(sel) {
    clearSpot(); if (!sel) return;
    var t = document.querySelector(sel); if (!t) return;
    t.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setTimeout(function () {
      var r = t.getBoundingClientRect(); if (!r.width) return;
      spot = document.createElement('div'); spot.className = 'coach-spot';
      spot.style.cssText = 'left:' + (r.left - 6) + 'px;top:' + (r.top - 6) + 'px;width:' + (r.width + 12) + 'px;height:' + (r.height + 12) + 'px';
      document.body.appendChild(spot);
    }, 350);
  }
  function showStep(i) {
    var steps = tourSteps(), s = steps[i]; tourAt = i; tourOn = true;
    if (!s) { endTour(); return; }
    if (i === 3) env.ui.g.focusOnly = true;
    if (s.tab && env.ui.tab !== s.tab) env.setTab(s.tab);
    draw({ img: s.img, html: s.html, tour: { i: i, n: steps.length } });
    placeSpot(s.target);
  }
  function endTour() { tourOn = false; clearSpot(); var c = state(); c.seen = true; env.save(); draw(null); }

  /* ---------- "what should I do now?" ---------- */
  function suggestion() {
    var g = env.ui.g, c = state(), G = root.LMGuide && root.LMGuide.situation(g.sit), w = g.window && g.window.kind !== 'none', n = draftCount(), b = nextBudget(), wr = worries(), an = (g.analyses || []).filter(function (a) { return !a.decision; })[0];
    var A = function (label, fn, primary) { return { label: label, go: fn, primary: !!primary }; };
    if (w && n === 0) return { img: 'point', html: '<b>The Budget is open, and you have drafted nothing.</b> ' + (wr.length ? 'The main problem is that ' + esc(wr[0].text) + '. ' : '') + 'Open Policy and look at the ★ suggestions: they are the levers that matter most for ' + esc(G ? G.title.toLowerCase() : 'this') + '. Change one or two, not twenty.', actions: [A('Take me to the suggestions', function () { env.ui.g.focusOnly = true; env.setTab('policy'); }, true), A('Ask for analysis first', function () { env.setTab('analysis'); })] };
    if (w && n > 0) return { img: 'hello', html: '<b>You have ' + n + ' change' + (n === 1 ? '' : 's') + ' drafted.</b> Check them under "Your draft" on the Policy page. When you are happy, enact them. After that they cannot be changed until the next Budget.', actions: [A('Show me my draft', function () { env.setTab('policy'); }, true)] };
    if (an) return { img: 'point', html: '<b>You are partway through an investigation.</b> Pick it up where you left off, or start a new one.', actions: [A('Carry on', function () { env.ui.g.analysisOpen = an.id; env.setTab('analysis'); }, true)] };
    if (n > 0) return { img: 'hello', html: '<b>Your draft is saved.</b> It will be submitted at the next Budget' + (b ? ' on <b>' + esc(env.nice(b.date)) + '</b>' : '') + '. Press Advance to move time on.', actions: [A('Review the draft', function () { env.setTab('policy'); })] };
    if (g.date === g.startDate || !b) return { img: 'hello', html: '<b>Policy is closed for now.</b> Use the time well: read what is going on, then try the Analysis tab on one of the ★ policies, and press Advance when you are ready.', actions: [A('What is going on?', function () { env.openGuide('economy'); }, true), A('Investigate a policy', function () { env.setTab('analysis'); })] };
    if (wr.length && g.pop.groups.public < 45) return { img: 'think', html: '<b>Voters are unhappy (approval ' + Math.round(g.pop.groups.public) + '%).</b> The thing hurting you most is that ' + esc(wr[0].text) + '. Next Budget' + (b ? ' (' + esc(env.nice(b.date)) + ')' : '') + ', deal with that first.', actions: [A('Read why it is happening', function () { env.openGuide('economy'); }, true), A('Look at the ★ policies', function () { env.ui.g.focusOnly = true; env.setTab('policy'); })] };
    return { img: 'hello', html: '<b>Nothing needs you right now.</b> ' + (b ? 'The next Budget is on <b>' + esc(env.nice(b.date)) + '</b>. ' : '') + 'You can prepare a draft, try an analysis, or just press Advance.', actions: [A('Prepare a draft', function () { env.setTab('policy'); }), A('Investigate a policy', function () { env.setTab('analysis'); })] };
  }

  /* ---------- drawing ---------- */
  function draw(msg) {
    var c = state();
    if (!avatar) {
      avatar = document.createElement('button'); avatar.type = 'button'; avatar.className = 'coach-avatar'; avatar.setAttribute('aria-label', 'Your Treasury adviser: ask what to do next');
      avatar.innerHTML = '<img alt="" src="' + IMG.hello + '"><span class="lab">Need a hand?</span><i class="dot"></i>';
      avatar.addEventListener('click', function () { var c = state(); if (c.open && !tourOn) { c.open = false; draw(null); return; } c.open = true; if (!tourOn) draw(null); else draw({ img: tourSteps()[tourAt].img, html: tourSteps()[tourAt].html, tour: { i: tourAt, n: tourSteps().length } }); });
      document.body.appendChild(avatar);
    }
    avatar.style.display = c.muted && !c.open ? 'none' : '';
    avatar.querySelector('.dot').style.display = c.seen ? 'none' : '';
    avatar.classList.toggle('on', !!c.open);
    if (card) { card.remove(); card = null; }
    if (!c.open && !tourOn) return;
    var m = msg || (c.seen ? suggestion() : { img: 'hello', html: tourSteps()[0].html, intro: true });
    card = document.createElement('div'); card.className = 'coach-card'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Your Treasury adviser');
    var acts = '';
    if (m.tour) acts = '<div class="acts">' + (m.tour.i > 0 ? '<button type="button" class="chn-btn small" data-coach="back">← Back</button>' : '') + '<button type="button" class="chn-btn small primary" data-coach="next">' + (m.tour.i + 1 === m.tour.n ? 'Finish' : 'Next →') + '</button><button type="button" class="chn-btn small" data-coach="skip">Skip tour</button><span class="step">' + (m.tour.i + 1) + ' of ' + m.tour.n + '</span></div>';
    else if (m.intro) acts = '<div class="acts"><button type="button" class="chn-btn small primary" data-coach="tour">Show me round</button><button type="button" class="chn-btn small" data-coach="own">I will find my own way</button></div>';
    else acts = '<div class="acts">' + (m.actions || []).map(function (a, i) { return '<button type="button" class="chn-btn small' + (a.primary ? ' primary' : '') + '" data-coach-act="' + i + '">' + esc(a.label) + '</button>'; }).join('') + '<button type="button" class="chn-btn small" data-coach="tour">Show me round again</button></div>';
    card.innerHTML = '<button type="button" class="x" data-coach="close" aria-label="Close the adviser">✕</button><div class="who"><img alt="" src="' + IMG[m.img || 'hello'] + '"><div><b>Your Treasury adviser</b><small>' + (m.tour ? 'The tour' : (m.intro ? 'Welcome' : 'What to do next')) + '</small></div></div><div class="say">' + m.html + '</div>' + acts + (m.tour || m.intro ? '' : '<label class="mute"><input type="checkbox" data-coach="mute"' + (c.muted ? ' checked' : '') + '> Hide the adviser unless I open it</label>');
    document.body.appendChild(card);
    card.addEventListener('click', function (ev) {
      var t = ev.target.closest('[data-coach],[data-coach-act]'); if (!t) return;
      var k = t.dataset.coach;
      if (t.dataset.coachAct != null) { var a = (m.actions || [])[+t.dataset.coachAct]; if (a) { c.open = false; clearSpot(); env.save(); a.go(); draw(null); } return; }
      if (k === 'close') { if (tourOn) { endTour(); } c.open = false; c.seen = true; env.save(); clearSpot(); draw(null); return; }
      if (k === 'tour') { c.open = true; showStep(0); return; }
      if (k === 'own') { c.seen = true; c.open = false; env.save(); draw(null); return; }
      if (k === 'next') { showStep(tourAt + 1); return; }
      if (k === 'back') { showStep(Math.max(0, tourAt - 1)); return; }
      if (k === 'skip') { endTour(); c.open = false; draw(null); return; }
    });
    var mute = card.querySelector('[data-coach="mute"]'); if (mute) mute.addEventListener('change', function () { c.muted = mute.checked; env.save(); });
  }

  function css() {
    if (document.getElementById('coachStyle')) return;
    var st = document.createElement('style'); st.id = 'coachStyle';
    st.textContent = [
      '.coach-avatar { position: fixed; left: 16px; bottom: 16px; z-index: 70; display: flex; align-items: center; gap: 8px; padding: 4px 14px 4px 4px; border: 2px solid #fbbf24; border-radius: 999px; background: #0f1b2d; color: #f6efdc; font: 700 0.82rem Arial, sans-serif; cursor: pointer; box-shadow: 0 8px 26px rgba(0,0,0,0.45); }',
      '.coach-avatar img { width: 52px; height: 52px; border-radius: 50%; object-fit: cover; object-position: 50% 20%; } .coach-avatar .dot { position: absolute; top: 2px; left: 44px; width: 12px; height: 12px; border-radius: 50%; background: #ef4444; border: 2px solid #0f1b2d; animation: coachPulse 1.4s infinite; }',
      '@keyframes coachPulse { 50% { transform: scale(1.35); } } @media (prefers-reduced-motion: reduce) { .coach-avatar .dot { animation: none; } }',
      '.coach-card { position: fixed; left: 16px; bottom: 84px; z-index: 75; width: min(400px, calc(100vw - 32px)); padding: 14px 16px 12px; border-radius: 16px; background: #eef6fd; color: #0b0b0b; border: 2px solid #0f1b2d; box-shadow: 0 18px 54px rgba(0,0,0,0.5); font: 0.92rem/1.55 Arial, sans-serif; }',
      '.coach-card .x { position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; border: 1px solid rgba(0,0,0,0.25); border-radius: 50%; background: transparent; cursor: pointer; }',
      '.coach-card .who { display: flex; gap: 10px; align-items: center; margin-bottom: 8px; padding-right: 30px; } .coach-card .who img { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; object-position: 50% 18%; border: 2px solid #0f1b2d; } .coach-card .who small { display: block; opacity: 0.65; }',
      '.coach-card .say { margin-bottom: 10px; } .coach-card .acts { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; } .coach-card .step { margin-left: auto; font-size: 0.76rem; opacity: 0.65; } .coach-card .mute { display: block; margin-top: 10px; font-size: 0.76rem; opacity: 0.75; }',
      '.coach-spot { position: fixed; z-index: 65; border: 3px solid #fbbf24; border-radius: 12px; box-shadow: 0 0 0 9999px rgba(5,8,16,0.58); pointer-events: none; transition: all 0.25s; }',
      '@media (max-width: 560px) { .coach-avatar .lab { display: none; } .coach-card { bottom: 80px; } }',
    ].join('\n');
    document.head.appendChild(st);
  }

  root.LMCoach = {
    init: function (e) { env = e; css(); if (!resizeBound) { resizeBound = true; window.addEventListener('resize', function () { if (spot) clearSpot(); }); } },
    refresh: function () { if (!env || !env.ui.g) return; var c = state(); if (!c.seen && !c.autoShown) { c.autoShown = true; c.open = true; } if (tourOn) return; draw(null); },
    destroy: function () { clearSpot(); if (card) card.remove(); if (avatar) avatar.remove(); card = avatar = null; tourOn = false; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
