/*
 * LastMind Doctor Career (Biology). One track for GCSE (AQA 8461) and one for A-level (AQA 7402).
 * You are a doctor working up the ranks. Each case is a patient: read the file, read the lessons that go with it, ask questions, order a few
 * tests, then decide what is wrong, what points to it, and what to do. Every case is written by hand against the specification (nothing is
 * generated while you play), and many have a twist: it sounds like one illness and is another, so the lessons cover both.
 * Cases and lessons are added with DOCTOR.add / DOCTOR.lesson from the files beside this one.
 */
(function (root) {
  'use strict';
  var D = root.DOCTOR = root.DOCTOR || {};
  D.cases = D.cases || []; D.lessons = D.lessons || {};
  D.add = function (c) { D.cases.push(c); }; D.lesson = function (l) { D.lessons[l.id] = l; };
  D.tracks = {
    gcse: { title: 'GCSE Biology', short: 'GCSE', board: 'AQA GCSE Biology (8461)', bg: '/assets/doctor/bg-surgery.jpg',
      ranks: [
        { title: 'Medical student', place: 'On placement at the surgery', need: 2 },
        { title: 'Foundation doctor', place: 'Your first year on the wards', need: 2 },
        { title: 'GP trainee', place: 'Training in general practice', need: 2 },
        { title: 'Specialty registrar', place: 'Working towards consultant', need: 2 },
        { title: 'Consultant', place: 'Leading the team', need: 0 },
      ] },
    alevel: { title: 'A-level Biology', short: 'A-level', board: 'AQA A-level Biology (7402)', bg: '/assets/doctor/bg-ward.jpg',
      ranks: [
        { title: 'Medical student', place: 'On placement at the hospital', need: 2 },
        { title: 'Foundation doctor', place: 'Your first year on the wards', need: 2 },
        { title: 'Core trainee', place: 'Rotating through the specialties', need: 2 },
        { title: 'Specialty registrar', place: 'Working towards consultant', need: 2 },
        { title: 'Consultant', place: 'Leading the team', need: 0 },
      ] },
    psych: { title: 'A-level', short: 'A-level', career: 'Psychology Career', board: 'AQA A-level Psychology (7182)', bg: '/assets/psych/bg-clinic.jpg',
      ranks: [
        { title: 'Assistant psychologist', place: 'On placement with a community mental health team', need: 2 },
        { title: 'Trainee clinical psychologist', place: 'Training on a clinical doctorate', need: 2 },
        { title: 'Clinical psychologist', place: 'Seeing patients in your own clinic', need: 2 },
        { title: 'Senior clinical psychologist', place: 'Supervising the team and the hardest referrals', need: 2 },
        { title: 'Consultant clinical psychologist', place: 'Leading the service', need: 0 },
      ],
      mentor: { name: 'Dr Imani Clarke', img: { hello: '/assets/psych/mentor-hello.jpg', point: '/assets/psych/mentor-point.jpg', think: '/assets/psych/mentor-think.jpg' } },
      text: { back: '← Psychology', careerTitle: 'Psychology Career', testsTab: 'Assessments', testsH: 'Assessments', testsMeter: 'Every assessment takes time and some are intrusive, so choose only what will change your mind.', onToTests: 'On to the assessments →', result: 'Finding: ', review: 'Go back over the psychology', reviewBody: 'The notes from Dr Imani Clarke on the right still have the lessons for every explanation in this case. Read them again with this result in mind.', welcome: '<b>Pick a patient from the files.</b> Each takes about ten minutes. For every patient: read the file and the lessons, ask your questions, choose a few assessments, then decide. I will give you a short note at each step.', afterCase: '<b>Now look at the twist.</b> Go back over the lessons for every disorder in the case and ask yourself which finding you should have trusted, and which one you let mislead you.', role: 'the consultant clinical psychologist supervising you', stepTests: 'Step 3 of 4: assessments', teachIntro: 'I will take you through the psychology for this patient. The boxes marked <b>Easily confused</b> cover the mix-ups that catch people out.', coachAria: 'Your senior psychologist', background: 'is going through the psychology for this patient' },
    },
  };
  var TEXT_DEFAULT = { back: '← Biology', careerTitle: 'Doctor Career', testsTab: 'Tests', testsH: 'Tests', testsMeter: 'Every test takes time and some are uncomfortable or risky, so order only what will change your mind.', onToTests: 'On to the tests →', result: 'Result: ', review: 'Go back over the biology', reviewBody: 'The notes from Dr Hartley on the right still have the lessons for both illnesses. Read them again with this result in mind.', welcome: '<b>Pick a patient from the files.</b> Each takes about ten minutes. For every patient: read the file and the lessons, ask your questions, order a few tests, then decide. I will give you a short note at each step.', afterCase: '<b>Now look at the twist.</b> Go back over the lessons for both illnesses and ask yourself which finding you should have trusted, and which one you let mislead you.', role: 'the consultant supervising you', stepTests: 'Step 3 of 4: tests', teachIntro: 'I will take you through the science for this patient. The boxes marked <b>Easily confused</b> cover the mix-ups that catch people out.', coachAria: 'Your senior doctor', background: 'is going through the science for this patient' };
  function TXT(k) { var T = D.tracks[track]; return (T && T.text && T.text[k]) || TEXT_DEFAULT[k]; }
  var PASS = 60, ASKS = 6, TESTS = 3;
  D.ASKS = ASKS; D.TESTS = TESTS;

  /* ---------- the rules ---------- */
  D.casesFor = function (track) { return D.cases.filter(function (c) { return c.track === track; }).sort(function (a, b) { return a.rank - b.rank || a.id.localeCompare(b.id); }); };
  function best(results, id) { return results[id] ? results[id].best : null; }
  D.rankIndex = function (track, results) {
    var T = D.tracks[track], cases = D.casesFor(track), r = 0;
    for (var i = 0; i < T.ranks.length - 1; i++) {
      var here = cases.filter(function (c) { return c.rank === i; });
      if (!here.length) break;
      var done = here.filter(function (c) { return best(results, c.id) != null; });
      var avg = done.length ? done.reduce(function (s, c) { return s + best(results, c.id); }, 0) / done.length : 0;
      if (done.length >= Math.min(T.ranks[i].need, here.length) && avg >= PASS) r = i + 1; else break;
    }
    return Math.min(r, T.ranks.length - 1);
  };
  D.average = function (results) { var v = Object.keys(results).map(function (k) { return results[k].best; }); return v.length ? Math.round(v.reduce(function (a, b) { return a + b; }, 0) / v.length) : null; };

  // Marks: the diagnosis (50), the two facts that point to it (20), what you do next (20), and not wasting the patient's time (10).
  D.score = function (c, a) {
    var dx = a.dx === c.truth ? 50 : 0;
    var found = (c.decisive || []).filter(function (f) { return (a.evidence || []).indexOf(f) > -1; }).length, ev = Math.min(20, found * 10);          // each fact you pick that really separates the two illnesses is worth 10
    var tr = (c.treatments || []).filter(function (t) { return t.id === a.tx; })[0], txPts = !tr ? 0 : tr.verdict === 'best' ? 20 : tr.verdict === 'ok' ? 10 : 0, harm = tr && tr.verdict === 'harm';
    var waste = 0, risky = 0; (a.tests || []).forEach(function (id) { var t = (c.tests || []).filter(function (x) { return x.id === id; })[0]; if (t && t.value === 'waste') waste++; if (t && t.value === 'risky') risky++; });
    var unasked = (a.asked || []).filter(function (id) { var q = (c.questions || []).filter(function (x) { return x.id === id; })[0]; return q && q.value === 'waste'; }).length;
    var eff = Math.max(0, 10 - 3 * waste - 4 * risky - 2 * unasked);
    var total = dx + ev + txPts + eff - (harm ? 10 : 0); total = Math.max(0, Math.min(100, Math.round(total)));
    return { total: total, dx: dx, evidence: ev, treatment: txPts, efficiency: eff, harm: !!harm, found: found };
  };

  /* ---------- saving (this browser, one save per account and track) ---------- */
  var uid = 'guest';
  function key(track) { return 'lastmind-doctor-career-v1:' + track + ':' + uid; }
  D.load = function (track) { try { var d = JSON.parse(localStorage.getItem(key(track)) || 'null'); if (d && d.results) return d; } catch (e) { /* none yet */ } return { results: {}, started: new Date().toISOString() }; };
  D.save = function (track, d) { try { localStorage.setItem(key(track), JSON.stringify(d)); } catch (e) { /* the save is a convenience */ } };
  D.summary = function (track, userId) {
    var old = uid; if (userId) uid = userId;
    try { var d = D.load(track), n = Object.keys(d.results).length; if (!n) return null; var r = D.rankIndex(track, d.results); return D.tracks[track].ranks[r].title + ' · ' + n + ' patient' + (n === 1 ? '' : 's') + ' seen · average ' + D.average(d.results) + '%'; } finally { uid = old; }
  };


  /* ---------- keeping the save on the account (when the page provides env.remote), as well as in this browser ---------- */
  // Results from two devices are merged: for each patient the best score wins and the latest date is kept.
  function mergeResults(a, b) {
    var out = {}, k; a = a || {}; b = b || {};
    Object.keys(a).concat(Object.keys(b)).forEach(function (id) { if (out[id]) return; var x = a[id], y = b[id]; out[id] = !x ? y : !y ? x : { best: Math.max(x.best, y.best), last: (x.date || '') >= (y.date || '') ? x.last : y.last, date: (x.date || '') >= (y.date || '') ? x.date : y.date }; });
    return out;
  }
  var pushTimer = null;
  function pushRemote() {
    if (!env || !env.remote) return; clearTimeout(pushTimer);
    var tr = track;
    pushTimer = setTimeout(function () {
      var d = D.load(tr);
      env.remote.post({ id: d.projectId || undefined, title: (D.tracks[tr].career || 'Doctor Career') + ': ' + D.tracks[tr].short, kind: 'doctor-career-' + tr, data: { doctor: { results: d.results, started: d.started } } }).then(function (id) {
        if (id && d.projectId !== id) { var d2 = D.load(tr); d2.projectId = id; D.save(tr, d2); }
      }).catch(function () { /* it stays in this browser and is sent on the next save */ });
    }, 400);
  }
  function pullRemote() {
    if (!env || !env.remote) return; var tr = track;
    env.remote.list().then(function (rows) {
      var row = (rows || []).filter(function (r) { return r.kind === 'doctor-career-' + tr; })[0];
      if (!row) { if (Object.keys(D.load(tr).results).length) pushRemote(); return null; }
      return env.remote.get(row.id).then(function (got) {
        var rd = got && got.data && got.data.doctor, d = D.load(tr), before = JSON.stringify(d.results);
        d.projectId = row.id; if (rd && rd.results) d.results = mergeResults(d.results, rd.results); if (rd && rd.started && rd.started < d.started) d.started = rd.started; D.save(tr, d);
        if (JSON.stringify(d.results) !== before) { if (track === tr && !cur && host && host.isConnected) render(); pushRemote(); }
      });
    }).catch(function () { /* offline or not signed in: the browser copy is used */ });
  }

  /* ---------- the screens ---------- */
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var bold = function (s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); };
  var host = null, track = 'gcse', save = null, env = null, cur = null, drawer = null;

  function css() {
    if (document.getElementById('dcStyle')) return;
    var st = document.createElement('style'); st.id = 'dcStyle';
    st.textContent = [
      '.dc { position: relative; min-height: 78vh; border-radius: 16px; overflow: hidden; color: #f5f0e6; font-family: Arial, Helvetica, sans-serif; background: #0f1b2d center / cover no-repeat; }',
      '.dc::before { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(8,16,30,.78), rgba(8,16,30,.9)); }',
      '.dc > * { position: relative; }',
      '.dc-top { display: flex; flex-wrap: wrap; gap: 12px 22px; align-items: center; justify-content: space-between; padding: 22px 26px 8px; }',
      '.dc-top h1 { margin: 0; font: 700 1.5rem Georgia, serif; } .dc-top .sub { opacity: .75; font-size: .86rem; margin-top: 2px; }',
      '.dc-role { text-align: right; } .dc-role b { display: block; font: 700 1.15rem Georgia, serif; color: #fbbf24; } .dc-role span { font-size: .84rem; opacity: .8; }',
      '.dc-back { padding: 7px 14px; border: 1px solid rgba(245,240,230,.4); border-radius: 999px; background: transparent; color: inherit; font: 700 .8rem Arial, sans-serif; cursor: pointer; }',
      '.dc-stats { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 26px 6px; } .dc-stat { padding: 5px 12px; border-radius: 999px; background: rgba(245,240,230,.12); font-size: .8rem; }',
      '.dc-files { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; padding: 18px 26px 28px; }',
      '.dc-file { display: grid; text-align: left; border: 0; border-radius: 10px; overflow: hidden; background: #f4ecd8; color: #1f1a10; cursor: pointer; box-shadow: 0 10px 28px rgba(0,0,0,.45); transform: rotate(var(--r, 0deg)); transition: transform .15s; font: inherit; }',
      '.dc-file:hover:not(.lock) { transform: rotate(0) translateY(-3px); } .dc-file img { width: 100%; height: 150px; object-fit: cover; object-position: 50% 20%; display: block; } .dc-file .b { padding: 10px 13px 13px; } .dc-file b { display: block; font: 700 1rem Georgia, serif; } .dc-file small { display: block; opacity: .7; margin-top: 2px; line-height: 1.4; }',
      '.dc-file .tag { display: inline-block; margin-top: 8px; padding: 2px 9px; border-radius: 999px; background: #0f1b2d; color: #f4ecd8; font: 700 .68rem Arial, sans-serif; letter-spacing: .06em; text-transform: uppercase; } .dc-file.lock { opacity: .55; cursor: not-allowed; filter: grayscale(.7); } .dc-file.done .tag { background: #1f7a4d; }',
      '.dc-case { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 18px; padding: 14px 26px 30px; align-items: start; } @media (max-width: 900px) { .dc-case { grid-template-columns: 1fr; } }',
      '.dc-pt { position: sticky; top: 8px; } .dc-pt img { width: 100%; aspect-ratio: 4/5; object-fit: cover; object-position: 50% 15%; border-radius: 14px; border: 3px solid #f4ecd8; box-shadow: 0 10px 30px rgba(0,0,0,.5); } .dc-pt .name { margin: 10px 0 2px; font: 700 1.2rem Georgia, serif; } .dc-pt .meta { opacity: .8; font-size: .86rem; line-height: 1.5; }',
      '.dc-bubble { position: relative; margin-top: 12px; padding: 10px 13px; border-radius: 12px; background: #f4ecd8; color: #1f1a10; font-size: .92rem; line-height: 1.5; } .dc-bubble::before { content: ""; position: absolute; top: -8px; left: 28px; border: 8px solid transparent; border-top: 0; border-bottom-color: #f4ecd8; }',
      '.dc-main { background: #f4ecd8; color: #1f1a10; border-radius: 14px; padding: 16px 20px 20px; box-shadow: 0 10px 34px rgba(0,0,0,.4); line-height: 1.6; min-width: 0; } .dc-main h2 { margin: 0 0 4px; font: 700 1.3rem Georgia, serif; } .dc-main h3 { margin: 16px 0 6px; font: 700 .95rem Georgia, serif; } .dc-main p { margin: 0 0 10px; }',
      '.dc-tabs { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 12px; } .dc-tab { padding: 7px 14px; border: 1px solid rgba(31,26,16,.35); border-radius: 999px; background: transparent; color: inherit; font: 700 .8rem Arial, sans-serif; cursor: pointer; } .dc-tab.on { background: #0f1b2d; color: #f4ecd8; border-color: #0f1b2d; }',
      '.dc-obs { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin: 8px 0 12px; } .dc-obs div { padding: 8px 10px; border-radius: 8px; background: #fff; border: 1px solid rgba(31,26,16,.2); } .dc-obs small { display: block; font-size: .7rem; letter-spacing: .06em; text-transform: uppercase; opacity: .65; } .dc-obs b { font-size: 1.02rem; }',
      '.dc-note { margin: 8px 0; padding: 10px 13px; border-radius: 10px; background: rgba(15,27,45,.07); } .dc-warn { margin: 8px 0; padding: 10px 13px; border-radius: 10px; background: rgba(180,83,9,.14); }',
      '.dc-learn { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0 4px; } .dc-btn { padding: 8px 14px; border: 1px solid rgba(31,26,16,.4); border-radius: 10px; background: #fff; color: inherit; font: 700 .84rem Arial, sans-serif; cursor: pointer; text-align: left; } .dc-btn:hover { background: #fffbe9; } .dc-btn.primary { background: #0f1b2d; color: #f4ecd8; border-color: #0f1b2d; } .dc-btn:disabled { opacity: .45; cursor: not-allowed; } .dc-btn.lesson { border-color: #0a5f8f; color: #0a4a70; }',
      '.dc-qs { display: grid; gap: 7px; margin: 8px 0; } .dc-q { display: block; width: 100%; padding: 9px 12px; border: 1px solid rgba(31,26,16,.3); border-radius: 10px; background: #fff; color: inherit; font: .9rem/1.4 Arial, sans-serif; text-align: left; cursor: pointer; } .dc-q:hover:not(:disabled) { background: #fffbe9; } .dc-q.used { background: rgba(31,122,77,.1); border-color: #1f7a4d; cursor: default; } .dc-q:disabled:not(.used) { opacity: .45; cursor: not-allowed; }',
      '.dc-log { margin-top: 12px; display: grid; gap: 8px; } .dc-log .me { font-size: .86rem; opacity: .75; } .dc-log .them { padding: 8px 12px; border-left: 4px solid #0a5f8f; background: #fff; border-radius: 0 8px 8px 0; }',
      '.dc-meter { font: 700 .8rem Arial, sans-serif; opacity: .8; margin: 4px 0; } .dc-table { border-collapse: collapse; margin: 8px 0 12px; font-size: .88rem; width: 100%; max-width: 560px; } .dc-table th, .dc-table td { padding: 5px 9px; border: 1px solid rgba(31,26,16,.25); text-align: left; } .dc-table th { background: rgba(15,27,45,.08); }',
      '.dc-opts { display: grid; gap: 8px; margin: 8px 0; } .dc-opt { display: block; width: 100%; padding: 10px 13px; border: 2px solid rgba(31,26,16,.25); border-radius: 10px; background: #fff; text-align: left; font: .92rem/1.45 Arial, sans-serif; cursor: pointer; color: inherit; } .dc-opt.on { border-color: #0a5f8f; background: rgba(10,95,143,.1); } .dc-opt small { display: block; opacity: .7; }',
      '.dc-chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0; } .dc-chip { padding: 7px 12px; border: 2px solid rgba(31,26,16,.25); border-radius: 999px; background: #fff; font: .84rem/1.35 Arial, sans-serif; cursor: pointer; color: inherit; text-align: left; } .dc-chip.on { border-color: #b45309; background: rgba(251,191,36,.25); }',
      '.dc-big { font: 700 2.4rem Georgia, serif; } .dc-parts { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; margin: 10px 0; } .dc-parts div { padding: 8px 10px; border-radius: 8px; background: #fff; border: 1px solid rgba(31,26,16,.2); } .dc-parts small { display: block; opacity: .65; font-size: .72rem; text-transform: uppercase; letter-spacing: .05em; } .good { color: #1f7a4d; font-weight: 700; } .bad { color: #b42318; font-weight: 700; }',
      '.dc-coach-btn { position: fixed; right: 16px; bottom: 16px; z-index: 80; display: flex; align-items: center; gap: 8px; padding: 4px 14px 4px 4px; border: 2px solid #fbbf24; border-radius: 999px; background: #0f1b2d; color: #f4ecd8; font: 700 .82rem Arial, sans-serif; cursor: pointer; box-shadow: 0 8px 26px rgba(0,0,0,.45); }',
      '.dc-coach-btn img { width: 52px; height: 52px; border-radius: 50%; object-fit: cover; object-position: 50% 15%; } .dc-coach-btn .dot { position: absolute; top: 2px; left: 44px; width: 12px; height: 12px; border-radius: 50%; background: #ef4444; border: 2px solid #0f1b2d; }',
      '.dc-coach { position: fixed; right: 16px; bottom: 84px; z-index: 80; width: min(390px, calc(100vw - 32px)); max-height: calc(100vh - 110px); overflow-y: auto; padding: 14px 16px 12px; border-radius: 16px; background: #f4ecd8; color: #1f1a10; border: 2px solid #0f1b2d; box-shadow: 0 18px 54px rgba(0,0,0,.5); font: .9rem/1.55 Arial, sans-serif; }',
      '.dc-coach.inline { position: static; width: auto; max-height: none; margin-top: 14px; box-shadow: none; border-width: 1px; }',
      '.dc-coach .x { position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; border: 1px solid rgba(0,0,0,.25); border-radius: 50%; background: transparent; cursor: pointer; } .dc-coach .who { display: flex; gap: 10px; align-items: center; margin-bottom: 8px; padding-right: 30px; } .dc-coach .who img { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; object-position: 50% 15%; border: 2px solid #0f1b2d; } .dc-coach .who small { display: block; opacity: .65; }',
      '.dc-coach .say { margin-bottom: 10px; } .dc-coach .intro { margin: 0 0 8px; padding: 8px 10px; border-radius: 10px; background: rgba(251,191,36,.25); } .dc-coach .ideas-h { margin: 6px 0; font: 700 .68rem Arial, sans-serif; letter-spacing: .08em; text-transform: uppercase; opacity: .65; }',
      '.dc-coach .idea { margin: 6px 0; padding: 8px 10px; border-radius: 10px; background: #fff; border: 1px solid rgba(31,26,16,.18); } .dc-coach .idea b { display: block; } .dc-coach .idea p { margin: 2px 0 4px; font-size: .86rem; } .dc-coach .idea button { padding: 0; border: 0; background: none; color: #0a4a70; font: 700 .8rem Arial, sans-serif; cursor: pointer; text-decoration: underline; } .dc-coach .mute { display: block; margin-top: 8px; font-size: .76rem; opacity: .75; }',
      '.dc-coach.side { top: 0; right: 0; bottom: 0; width: min(470px, 94vw); max-height: none; border-radius: 0; border-width: 0 0 0 2px; padding: 18px 22px 40px; z-index: 90; font-size: .95rem; line-height: 1.7; } .dc-coach.side .say { font-size: 1rem; }',
      '.dc-coach .teach-h { margin: 22px 0 6px; padding-top: 14px; border-top: 2px solid #0f1b2d; font: 700 .72rem Arial, sans-serif; letter-spacing: .1em; text-transform: uppercase; } .dc-coach .teach-in { margin: 0 0 6px; opacity: .85; }',
      '.dc-coach .teach { margin: 18px 0 8px; padding-bottom: 8px; } .dc-coach .teach + .teach { border-top: 1px solid rgba(31,26,16,.2); padding-top: 14px; } .dc-coach .teach h3 { margin: 0 0 4px; font: 700 1.2rem/1.3 Georgia, serif; } .dc-coach .teach h3 .lead { display: block; font: 700 .7rem Arial, sans-serif; letter-spacing: .08em; text-transform: uppercase; opacity: .6; }',
      '.dc-coach .teach .spec { display: inline-block; margin: 4px 0 8px; padding: 2px 9px; border-radius: 999px; background: #0f1b2d; color: #f4ecd8; font: 700 .68rem Arial, sans-serif; } .dc-coach .teach h4 { margin: 22px 0 6px; font-size: 1.02rem; } .dc-coach .teach p { margin: 0 0 14px; } .dc-coach .teach ul { margin: 0 0 14px 20px; padding: 0; } .dc-coach .teach li { margin-bottom: 6px; }',
      '.dc-coach .teach .ex, .dc-coach .teach .tw { margin: 4px 0 16px; padding: 10px 14px; border-radius: 10px; } .dc-coach .teach .ex { background: rgba(11,114,133,.12); } .dc-coach .teach .tw { background: rgba(180,83,9,.14); } .dc-coach .teach .eq { padding: 8px 12px; background: #fff; border-left: 4px solid #0a5f8f; font-family: Consolas, monospace; overflow-x: auto; }',
      '.dc-drawer { position: fixed; top: 0; right: 0; bottom: 0; z-index: 90; width: min(460px, 94vw); overflow-y: auto; padding: 18px 20px 40px; background: #eef6fd; color: #0b0b0b; border-left: 1px solid rgba(0,0,0,.3); box-shadow: -18px 0 50px rgba(0,0,0,.45); font: .94rem/1.65 Arial, sans-serif; } .dc-drawer h2 { margin: 0 0 4px; font: 700 1.25rem Georgia, serif; } .dc-drawer h4 { margin: 18px 0 4px; font-size: 1rem; } .dc-drawer p { margin: 0 0 10px; } .dc-drawer .x { float: right; padding: 3px 10px; border: 1px solid rgba(0,0,0,.3); border-radius: 8px; background: transparent; cursor: pointer; }',
      '.dc-drawer .spec { display: inline-block; margin: 4px 0 10px; padding: 2px 9px; border-radius: 999px; background: #0f1b2d; color: #f4ecd8; font: 700 .7rem Arial, sans-serif; } .dc-drawer .ex { margin: 8px 0 12px; padding: 8px 12px; background: rgba(11,114,133,.1); border-radius: 8px; } .dc-drawer .tw { margin: 8px 0 12px; padding: 8px 12px; background: rgba(180,83,9,.12); border-radius: 8px; } .dc-drawer ul { margin: 0 0 10px 18px; padding: 0; } .dc-drawer .chk { margin: 8px 0; }',
    ].join('\n');
    document.head.appendChild(st);
  }

  function ranksInfo(d) { var T = D.tracks[track], ri = D.rankIndex(track, d.results); return { T: T, ri: ri, rank: T.ranks[ri] }; }
  function render() { renderInner(); coachDraw(); }
  function renderInner() {
    css(); var d = D.load(track);
    if (cur) { renderCase(d); return; }
    var R = ranksInfo(d), cases = D.casesFor(track), avg = D.average(d.results), n = Object.keys(d.results).length;
    host.innerHTML = '<div class="dc" style="background-image:url(' + R.T.bg + ')"><div class="dc-top"><div><button type="button" class="dc-back" data-dc="back">' + esc(TXT('back')) + '</button><h1 style="margin-top:12px">' + esc(R.T.career || 'Doctor Career') + ': ' + esc(R.T.title) + '</h1><div class="sub">' + esc(R.T.board) + ' · every case follows the specification</div></div><div class="dc-role"><b>' + esc(R.rank.title) + '</b><span>' + esc(R.rank.place) + '</span></div></div>' +
      '<div class="dc-stats"><span class="dc-stat">Patients seen: ' + n + '</span><span class="dc-stat">Average score: ' + (avg == null ? '·' : avg + '%') + '</span></div><div class="dc-files">' +
      cases.map(function (c, i) {
        var locked = c.rank > R.ri, res = d.results[c.id];
        return '<button type="button" class="dc-file' + (locked ? ' lock' : '') + (res ? ' done' : '') + '" style="--r:' + ((i % 3) - 1) * 1.4 + 'deg" data-open="' + c.id + '"' + (locked ? ' disabled' : '') + '><img src="' + esc(c.patient.image) + '" alt="' + esc(c.patient.name) + '" loading="lazy"><span class="b"><b>' + esc(c.patient.name) + ', ' + esc(c.patient.age) + '</b><small>' + esc(c.complaint) + '</small><span class="tag">' + (locked ? 'Waiting for promotion' : res ? 'Seen · best ' + res.best + '%' : 'New patient') + '</span></span></button>';
      }).join('') + (cases.length ? '' : '<p>No patients yet.</p>') + '</div></div>';
  }

  function blankRun(c) { return { tab: 'file', asked: [], tests: [], dx: null, evidence: [], tx: null, done: null }; }
  function factsFound(c, run) {
    var ids = [];
    (c.startFacts || []).forEach(function (f) { ids.push(f); });
    run.asked.forEach(function (id) { var q = c.questions.filter(function (x) { return x.id === id; })[0]; if (q && q.fact) ids.push(q.fact); });
    run.tests.forEach(function (id) { var t = c.tests.filter(function (x) { return x.id === id; })[0]; if (t && t.fact) ids.push(t.fact); });
    return ids.filter(function (f, i, a) { return a.indexOf(f) === i && c.facts[f]; });
  }
  function renderCase(d) {
    var c = cur.c, run = cur.run, T = D.tracks[track], P = c.patient;
    var tabs = [['file', 'The file'], ['ask', 'Ask'], ['tests', TXT('testsTab')], ['decide', 'Your decision']];
    var left = '<aside class="dc-pt"><img src="' + esc(P.image) + '" alt="' + esc(P.name) + '"><div class="name">' + esc(P.name) + '</div><div class="meta">' + esc(P.age) + ' · ' + esc(P.job) + '<br>' + esc(P.setting) + '</div><div class="dc-bubble">' + esc(cur.say || c.opening) + '</div></aside>';
    var body = '';
    if (run.done) body = outcomeHtml(c, run);
    else {
      body = '<div class="dc-tabs">' + tabs.map(function (t) { return '<button type="button" class="dc-tab' + (run.tab === t[0] ? ' on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>';
      if (run.tab === 'file') body += fileHtml(c); else if (run.tab === 'ask') body += askHtml(c, run); else if (run.tab === 'tests') body += testsHtml(c, run); else body += decideHtml(c, run);
    }
    host.innerHTML = '<div class="dc" style="background-image:url(' + T.bg + ')"><div class="dc-top"><div><button type="button" class="dc-back" data-dc="files">← Back to the files</button></div><div class="dc-role"><b>' + esc(D.tracks[track].ranks[D.rankIndex(track, d.results)].title) + '</b><span>About ' + (c.minutes || 10) + ' minutes</span></div></div><div class="dc-case">' + left + '<section class="dc-main">' + body + '</section></div></div>';
  }
  function fileHtml(c) {
    return '<h2>' + esc(c.title) + '</h2><p style="opacity:.75;margin:0 0 8px">' + esc(c.tagline) + '</p><div class="dc-note"><b>Referral.</b> ' + bold(c.referral) + '</div>' +
      '<h3>Observations</h3><div class="dc-obs">' + c.obs.map(function (o) { return '<div><small>' + esc(o[0]) + '</small><b>' + esc(o[1]) + '</b></div>'; }).join('') + '</div>' +
      '<h3>What the notes say</h3><ul style="margin:0 0 10px 18px;padding:0">' + c.notes.map(function (n) { return '<li>' + bold(n) + '</li>'; }).join('') + '</ul>' +
      (c.infoCard ? '<h3>' + esc(c.infoCard.title) + '</h3><div class="dc-note">' + c.infoCard.body.map(function (p) { return '<p>' + bold(p) + '</p>'; }).join('') + '</div>' : '') +
      '<div class="dc-note"><b>Background.</b> ' + esc(mentor().name) + ' ' + TXT('background') + ' in the panel on the right. Read it before you call the patient in.</div>' +
      '<div class="dc-learn" style="margin-top:14px"><button type="button" class="dc-btn primary" data-tab="ask">Call the patient in →</button></div>';
  }
  function askHtml(c, run) {
    var left = ASKS - run.asked.length;
    return '<h2>Talk to ' + esc(c.patient.name.split(' ')[0]) + '</h2><div class="dc-meter">You have time for ' + left + ' more question' + (left === 1 ? '' : 's') + '. Choose the ones that will tell you most.</div><div class="dc-qs">' +
      c.questions.map(function (q) { var used = run.asked.indexOf(q.id) > -1; return '<button type="button" class="dc-q' + (used ? ' used' : '') + '" data-ask="' + q.id + '"' + (!used && left <= 0 ? ' disabled' : '') + '>' + esc(q.q) + '</button>'; }).join('') + '</div>' +
      '<div class="dc-log">' + run.asked.map(function (id) { var q = c.questions.filter(function (x) { return x.id === id; })[0]; return '<div><div class="me">You: ' + esc(q.q) + '</div><div class="them">' + bold(q.a) + '</div></div>'; }).join('') + '</div>' +
      '<div class="dc-learn" style="margin-top:14px"><button type="button" class="dc-btn primary" data-tab="tests">' + TXT('onToTests') + '</button></div>';
  }
  function resultTable(t) { return t.table ? '<table class="dc-table">' + t.table.map(function (r, i) { return '<tr>' + r.map(function (x) { return i === 0 ? '<th>' + esc(x) + '</th>' : '<td>' + esc(x) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>' : ''; }
  function testsHtml(c, run) {
    var left = TESTS - run.tests.length;
    return '<h2>' + esc(TXT('testsH')) + '</h2><div class="dc-meter">You can order ' + left + ' more ' + (track === 'psych' ? 'assessment' : 'test') + (left === 1 ? '' : 's') + '. ' + TXT('testsMeter') + '</div><div class="dc-qs">' +
      c.tests.map(function (t) { var used = run.tests.indexOf(t.id) > -1; return '<button type="button" class="dc-q' + (used ? ' used' : '') + '" data-test="' + t.id + '"' + (!used && left <= 0 ? ' disabled' : '') + '><b>' + esc(t.name) + '</b>' + (t.note ? '<br><small>' + esc(t.note) + '</small>' : '') + '</button>'; }).join('') + '</div>' +
      '<div class="dc-log">' + run.tests.map(function (id) { var t = c.tests.filter(function (x) { return x.id === id; })[0]; return '<div><div class="me">' + esc(TXT('result')) + esc(t.name) + '</div><div class="them">' + bold(t.result) + resultTable(t) + '</div></div>'; }).join('') + '</div>' +
      '<div class="dc-learn" style="margin-top:14px"><button type="button" class="dc-btn primary" data-tab="decide">Make your decision →</button></div>';
  }
  function decideHtml(c, run) {
    var found = factsFound(c, run), ready = run.dx && run.evidence.length === 2 && run.tx;
    return '<h2>Your decision</h2><h3>1. What is wrong?</h3><div class="dc-opts">' + c.options.map(function (o) { return '<button type="button" class="dc-opt' + (run.dx === o.id ? ' on' : '') + '" data-dx="' + o.id + '"><b>' + esc(o.name) + '</b>' + (o.sub ? '<small>' + esc(o.sub) + '</small>' : '') + '</button>'; }).join('') + '</div>' +
      '<h3>2. Which two things you found point to that most strongly?</h3><div class="dc-meter">Choose two. You can only pick things you have learned so far.</div><div class="dc-chips">' + found.map(function (f) { return '<button type="button" class="dc-chip' + (run.evidence.indexOf(f) > -1 ? ' on' : '') + '" data-ev="' + f + '">' + esc(c.facts[f]) + '</button>'; }).join('') + '</div>' +
      '<h3>3. What do you do now?</h3><div class="dc-opts">' + c.treatments.map(function (t) { return '<button type="button" class="dc-opt' + (run.tx === t.id ? ' on' : '') + '" data-tx="' + t.id + '">' + esc(t.label) + '</button>'; }).join('') + '</div>' +
      '<div class="dc-learn" style="margin-top:14px"><button type="button" class="dc-btn primary" data-act="submit"' + (ready ? '' : ' disabled') + '>Send the patient home with my decision</button>' + (ready ? '' : '<span class="dc-meter" style="align-self:center">Choose a diagnosis, two pieces of evidence and what to do.</span>') + '</div>';
  }
  function outcomeHtml(c, run) {
    var s = run.done, right = run.dx === c.truth, tx = c.treatments.filter(function (t) { return t.id === run.tx; })[0], T = c.options.filter(function (o) { return o.id === c.truth; })[0], chosen = c.options.filter(function (o) { return o.id === run.dx; })[0];
    return '<h2>' + (right ? 'Diagnosis confirmed' : 'Not quite') + '</h2><div class="dc-big">' + s.total + '%</div>' +
      '<p>' + (right ? '<span class="good">You diagnosed ' + esc(T.name) + '.</span>' : '<span class="bad">You said ' + esc(chosen.name) + '. It was ' + esc(T.name) + '.</span>') + '</p>' +
      '<div class="dc-parts"><div><small>Diagnosis</small><b>' + s.dx + ' / 50</b></div><div><small>Evidence</small><b>' + s.evidence + ' / 20</b></div><div><small>What you did</small><b>' + s.treatment + ' / 20' + (s.harm ? ' (−10 harm)' : '') + '</b></div><div><small>No time wasted</small><b>' + s.efficiency + ' / 10</b></div></div>' +
      '<h3>What happened</h3><p>' + bold(right ? c.outcome.right : c.outcome.wrong) + '</p>' +
      (c.twist ? '<div class="dc-warn"><b>The twist.</b> ' + bold(c.twist) + '</div>' : '') +
      '<h3>Your treatment choice</h3><p><b>' + esc(tx ? tx.label : '') + '</b><br>' + bold(tx ? tx.why : '') + '</p>' +
      '<h3>The facts that gave it away</h3><ul style="margin:0 0 10px 18px;padding:0">' + (c.decisive || []).map(function (f) { return '<li' + (run.evidence.indexOf(f) > -1 ? ' class="good"' : '') + '>' + esc(c.facts[f]) + (run.evidence.indexOf(f) > -1 ? ' ✓' : '') + '</li>'; }).join('') + '</ul>' +
      '<h3>' + esc(TXT('review')) + '</h3><p>' + esc(TXT('reviewBody')) + '</p>' + '<p style="opacity:.7;font-size:.82rem">Specification: ' + esc(c.spec.board) + ' ' + esc(c.spec.code) + ', ' + esc(c.spec.refs.join(', ')) + '</p>' +
      '<div class="dc-learn" style="margin-top:14px"><button type="button" class="dc-btn primary" data-dc="files">Next patient →</button></div>';
  }


  /* ---------- the senior doctor: short notes at each step, never the answer ---------- */
  var MENTOR_DEFAULT = { name: 'Dr Hartley', img: { hello: '/assets/doctor/mentor-hello.jpg', point: '/assets/doctor/mentor-point.jpg', think: '/assets/doctor/mentor-think.jpg' } };
  function mentor() { var T = D.tracks[track]; return (T && T.mentor) || MENTOR_DEFAULT; }
  var coachEl = null, coachBtn = null, coachOpen = true, coachTimer = null, lastStep = null;
  var STEP_IMG = { file: 'hello', ask: 'point', tests: 'point', decide: 'think' };
  var STEP_NAME = { file: 'Step 1 of 4: the file', ask: 'Step 2 of 4: ask', get tests() { return TXT('stepTests'); }, decide: 'Step 4 of 4: decide' };
  function coachState() { var d = D.load(track); d.coach = d.coach || { seen: false, muted: false }; return d; }
  function coachMessage() {
    if (!cur) return { img: 'hello', label: 'Welcome to the clinic', html: TXT('welcome') };
    var c = cur.c, run = cur.run, g = (D.guide || {})[c.id];
    if (run.done) return { img: 'hello', label: 'After the case', html: TXT('afterCase'), ideas: g ? g.ideas : null };
    var tab = run.tab || 'file';
    if (!g) return { img: STEP_IMG[tab], label: STEP_NAME[tab], html: 'Take your time with this one.' };
    var extra = '';
    if (tab === 'ask') extra = ' <i>You have ' + (ASKS - run.asked.length) + ' question' + (ASKS - run.asked.length === 1 ? '' : 's') + ' left.</i>';
    if (tab === 'tests') extra = ' <i>You can order ' + (TESTS - run.tests.length) + ' more test' + (TESTS - run.tests.length === 1 ? '' : 's') + '.</i>';
    return { img: STEP_IMG[tab], label: STEP_NAME[tab], html: esc(g[tab]) + extra, ideas: g.ideas };
  }
  function coachDestroy() { if (host) host.style.paddingRight = ''; if (coachEl) coachEl.remove(); if (coachBtn) coachBtn.remove(); coachEl = coachBtn = null; clearInterval(coachTimer); coachTimer = null; lastStep = null; }
  function coachDraw() {
    if (!host || !host.isConnected) { coachDestroy(); return; }
    var st = coachState(), m = coachMessage(), stepKey = cur ? (cur.c.id + ':' + (cur.run.done ? 'done' : cur.run.tab)) : 'files';
    if (!coachTimer) coachTimer = setInterval(function () { if (!host || !host.isConnected) coachDestroy(); }, 1000);
    if (!coachBtn) {
      coachBtn = document.createElement('button'); coachBtn.type = 'button'; coachBtn.className = 'dc-coach-btn'; coachBtn.setAttribute('aria-label', TXT('coachAria') + ': open or close the notes');
      coachBtn.innerHTML = '<img alt="" src="' + mentor().img.hello + '"><span class="lab">' + esc(mentor().name) + '</span><i class="dot"></i>';
      coachBtn.addEventListener('click', function () { coachOpen = !coachOpen; lastStep = null; coachDraw(); });
      document.body.appendChild(coachBtn);
    }
    var fresh = stepKey !== lastStep; lastStep = stepKey;
    var firstEver = !st.coach.seen;
    if (fresh && firstEver) coachOpen = true;
    coachBtn.style.display = st.coach.muted && !coachOpen ? 'none' : '';
    coachBtn.querySelector('.dot').style.display = !coachOpen && fresh ? '' : 'none';
    if (coachEl) { coachEl.remove(); coachEl = null; }
    host.style.paddingRight = cur && coachOpen && window.innerWidth > 1000 ? 'min(470px, 38vw)' : '';
    if (!coachOpen) return;
    coachEl = document.createElement('div'); coachEl.className = 'dc-coach'; coachEl.setAttribute('role', 'dialog'); coachEl.setAttribute('aria-label', 'Notes from ' + mentor().name);
    var intro = firstEver && !cur ? '<p class="intro"><b>I am ' + esc(mentor().name) + ', ' + esc(TXT('role')) + '.</b></p>' : '';
    var ideas = (m.ideas || []).map(function (i) { return '<div class="idea"><b>' + esc(i.t) + '</b><p>' + esc(i.b) + '</p></div>'; }).join('');
    coachEl.innerHTML = '<button type="button" class="x" data-coach-close="1" aria-label="Hide the notes">✕</button><div class="who"><img alt="" src="' + mentor().img[m.img || 'hello'] + '"><div><b>' + esc(mentor().name) + '</b><small>' + esc(m.label) + '</small></div></div>' + intro + '<div class="say">' + m.html + '</div>' + (ideas ? '<div class="ideas-h">Worth knowing for this decision</div>' + ideas : '') + '<label class="mute"><input type="checkbox" data-coach-mute="1"' + (st.coach.muted ? ' checked' : '') + '> Keep my notes closed unless I open them</label>';
    // On a case, the notes sit under the patient so they never cover what you are reading; on the files screen they float.
    if (cur) { coachEl.classList.add('side'); coachEl.insertAdjacentHTML('beforeend', teachHtml(cur.c)); }
    document.body.appendChild(coachEl);
    coachEl.addEventListener('click', function (ev) {
      var t = ev.target.closest('[data-coach-close]'); if (!t) return;
      var d = D.load(track); d.coach = d.coach || {}; d.coach.seen = true; D.save(track, d); coachOpen = false; coachDraw();
    });
    var mute = coachEl.querySelector('[data-coach-mute]'); if (mute) mute.addEventListener('change', function () { var d = D.load(track); d.coach = d.coach || {}; d.coach.muted = mute.checked; d.coach.seen = true; D.save(track, d); if (mute.checked) { coachOpen = false; coachDraw(); } });
    if (firstEver && fresh) { var d0 = D.load(track); d0.coach = d0.coach || {}; d0.coach.seen = true; D.save(track, d0); }
  }

  /* ---------- the lessons, taught by the senior clinician in the right-hand panel ---------- */
  function lessonBlock(b) {
    if (typeof b === 'string') return '<p>' + bold(b) + '</p>';
    if (b.ex) return '<div class="ex"><b>Example.</b> ' + bold(b.ex) + '</div>';
    if (b.eq) return '<p class="eq">' + esc(b.eq) + '</p>';
    if (b.twist) return '<div class="tw"><b>Easily confused.</b> ' + bold(b.twist) + '</div>';
    if (b.list) return '<ul>' + b.list.map(function (x) { return '<li>' + bold(x) + '</li>'; }).join('') + '</ul>';
    return ''; /* no "check yourself" questions here: the case itself is the test */
  }
  var LEAD = ['Let us begin with', 'Next, a look at', 'Then', 'Finally, make sure you understand'];
  function teachHtml(c) {
    var ids = (c.lessons || []).filter(function (id) { return D.lessons[id]; });
    if (!ids.length) return '';
    var out = '<div class="teach-h">What you need to know</div><p class="teach-in">' + TXT('teachIntro') + '</p>';
    ids.forEach(function (id, n) {
      var L = D.lessons[id];
      out += '<section class="teach"><h3><span class="lead">' + esc(LEAD[Math.min(n, LEAD.length - 1)]) + '</span> ' + esc(L.title) + '</h3><span class="spec">' + esc(L.spec) + '</span>' +
        L.sections.map(function (sec) { return (sec.h ? '<h4>' + esc(sec.h) + '</h4>' : '') + sec.b.map(lessonBlock).join(''); }).join('') + '</section>';
    });
    return out;
  }
  function openLesson() { coachOpen = true; lastStep = null; coachDraw(); }
  function closeDrawer() {}


  /* ---------- events ---------- */
  function bind() {
    host.addEventListener('click', function (e) {
      var t = e.target.closest('[data-dc],[data-open],[data-tab],[data-ask],[data-test],[data-dx],[data-ev],[data-tx],[data-act],[data-lesson]'); if (!t) return;
      var d = D.load(track), run = cur && cur.run;
      if (t.dataset.lesson) { openLesson(t.dataset.lesson); return; }
      if (t.dataset.dc === 'back') { closeDrawer(); coachDestroy(); if (env && env.back) env.back(); return; }
      if (t.dataset.dc === 'files') { cur = null; closeDrawer(); render(); return; }
      if (t.dataset.open) { var c = D.cases.filter(function (x) { return x.id === t.dataset.open; })[0]; cur = { c: c, run: blankRun(c), say: null }; render(); window.scrollTo(0, 0); return; }
      if (!cur || !run) return;
      if (t.dataset.tab) { run.tab = t.dataset.tab; render(); return; }
      if (t.dataset.ask) { if (run.asked.indexOf(t.dataset.ask) < 0 && run.asked.length < ASKS) { run.asked.push(t.dataset.ask); var q = cur.c.questions.filter(function (x) { return x.id === t.dataset.ask; })[0]; cur.say = q.a.replace(/\*\*/g, ''); } render(); return; }
      if (t.dataset.test) { if (run.tests.indexOf(t.dataset.test) < 0 && run.tests.length < TESTS) run.tests.push(t.dataset.test); render(); return; }
      if (t.dataset.dx) { run.dx = t.dataset.dx; render(); return; }
      if (t.dataset.ev) { var i = run.evidence.indexOf(t.dataset.ev); if (i > -1) run.evidence.splice(i, 1); else if (run.evidence.length < 2) run.evidence.push(t.dataset.ev); render(); return; }
      if (t.dataset.tx) { run.tx = t.dataset.tx; render(); return; }
      if (t.dataset.act === 'submit') {
        var s = D.score(cur.c, { dx: run.dx, evidence: run.evidence, tx: run.tx, tests: run.tests, asked: run.asked }); run.done = s;
        var prev = d.results[cur.c.id], bestScore = prev ? Math.max(prev.best, s.total) : s.total; d.results[cur.c.id] = { best: bestScore, last: s.total, date: new Date().toISOString().slice(0, 10) }; D.save(track, d); pushRemote();
        if (env && env.saved) env.saved();
        render(); window.scrollTo(0, 0);
      }
    });
  }
  D.mount = function (el, tr, e) {
    coachDestroy(); coachOpen = true; host = el; track = tr; env = e || {}; cur = null; uid = (e && e.userId) || 'guest'; closeDrawer();
    if (!host.__dcBound) { host.__dcBound = true; bind(); }
    render(); pullRemote();
  };
})(typeof window !== 'undefined' ? window : globalThis);
