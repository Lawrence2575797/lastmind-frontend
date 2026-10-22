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
      text: { learnTab: 'The psychology', back: '← Psychology', careerTitle: 'Psychology Career', testsTab: 'Assessments', testsH: 'Assessments', testsMeter: 'Choose only the assessments that could change your mind.', onToTests: 'On to the assessments →', result: 'Finding: ', review: 'Look again', reviewBody: 'The psychology for this patient is written out below. Read it again with the result in mind.', welcome: '<b>Pick a patient.</b> Read, ask, assess and decide. I will stay beside you.', afterCase: '<b>Now look at the twist.</b> Which clue deserved more weight?', role: 'the consultant clinical psychologist supervising you', stepTests: 'Step 3 of 4: assessments', teachIntro: 'Here is the psychology that matters for this patient.', coachAria: 'Your senior psychologist', background: 'is going through the psychology for this patient' },
    },
  };
  var TEXT_DEFAULT = { learnTab: 'The science', back: '← Biology', careerTitle: 'Doctor Career', testsTab: 'Tests', testsH: 'Tests', testsMeter: 'Every test takes time and some are uncomfortable or risky, so order only what will change your mind.', onToTests: 'On to the tests →', result: 'Result: ', review: 'Go back over the biology', reviewBody: 'The lessons for both illnesses are written out below. Read them again with this result in mind.', welcome: '<b>Pick a patient from the files.</b> Each takes about ten minutes. For every patient: read the file and the lessons, ask your questions, order a few tests, then decide. I will give you a short note at each step.', afterCase: '<b>Now look at the twist.</b> Go back over the lessons for both illnesses and ask yourself which finding you should have trusted, and which one you let mislead you.', role: 'the consultant supervising you', stepTests: 'Step 3 of 4: tests', teachIntro: 'I will take you through the science for this patient. The boxes marked <b>Easily confused</b> cover the mix-ups that catch people out.', coachAria: 'Your senior doctor', background: 'is going through the science for this patient' };
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
      '/* Clean and clinical: LastMind navy and cream, flat panels with thin rules, numbered steps. Only the look: nothing here changes how a case plays. */',
      '.dc { --navy: #1A232D; --navy-2: #232F3B; --cream: #F1EAD6; --cream-lift: #FAF6E9; --gold: #E6D7B0; --muted: #5B6672; --muted-on-navy: #A9B2BB; --rule: rgba(26,35,45,.18); --rule-on-navy: rgba(241,234,214,.16); position: relative; min-height: 78vh; border-radius: 12px; overflow: hidden; color: var(--cream); font: 15px/1.55 "IBM Plex Sans", system-ui, Arial, sans-serif; background: var(--navy); border: 1px solid var(--rule-on-navy); }',
      '.dc::before { content: none; } .dc > * { position: relative; }',
      '.dc-top { display: flex; flex-wrap: wrap; gap: 12px 24px; align-items: center; justify-content: space-between; padding: 20px 28px 18px; border-bottom: 1px solid var(--rule-on-navy); }',
      '.dc-top h1 { margin: 0; font: 600 1.5rem/1.2 Lora, Georgia, serif; letter-spacing: -.01em; } .dc-top .sub { color: var(--muted-on-navy); font-size: .86rem; margin-top: 3px; }',
      '.dc-role { text-align: right; } .dc-role b { display: block; font: 600 1.02rem Lora, Georgia, serif; color: var(--gold); } .dc-role span { font-size: .84rem; color: var(--muted-on-navy); } .dc-role b::before { content: "Rank"; display: block; margin-bottom: 1px; font: 600 .66rem "IBM Plex Sans", Arial, sans-serif; letter-spacing: .12em; text-transform: uppercase; color: var(--muted-on-navy); }',
      '.dc-back { padding: 7px 13px; border: 1px solid rgba(241,234,214,.32); border-radius: 8px; background: transparent; color: inherit; font: 600 .8rem "IBM Plex Sans", Arial, sans-serif; cursor: pointer; } .dc-back:hover { background: rgba(241,234,214,.08); }',
      '.dc-stats { display: flex; flex-wrap: wrap; gap: 0 28px; padding: 0 28px; border-bottom: 1px solid var(--rule-on-navy); } .dc-stat { padding: 12px 0; color: var(--muted-on-navy); font-size: .84rem; }',
      '.dc-files { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 18px; padding: 24px 28px 32px; }',
      '.dc-file { display: grid; grid-template-rows: auto 1fr; text-align: left; border: 1px solid var(--rule); border-radius: 10px; overflow: hidden; background: var(--cream); color: var(--navy); cursor: pointer; transition: transform .15s, box-shadow .15s; font: inherit; }',
      '.dc-file:hover:not(.lock) { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,0,0,.35); } .dc-file img { width: 100%; height: 140px; object-fit: cover; object-position: 50% 20%; display: block; border-bottom: 1px solid var(--rule); } .dc-file .b { display: flex; flex-direction: column; align-items: flex-start; padding: 13px 15px 15px; } .dc-file b { display: block; font: 600 1rem/1.3 Lora, Georgia, serif; } .dc-file small { display: block; color: var(--muted); margin-top: 3px; line-height: 1.45; }',
      '.dc-file .tag { display: inline-block; margin-top: 12px; padding: 3px 9px; border: 1px solid var(--navy); border-radius: 4px; background: transparent; color: var(--navy); font: 600 .66rem "IBM Plex Sans", Arial, sans-serif; letter-spacing: .08em; text-transform: uppercase; } .dc-file.lock { opacity: .5; cursor: not-allowed; filter: grayscale(.8); } .dc-file.done .tag { background: #1F7A4D; border-color: #1F7A4D; color: #fff; }',
      '.dc-case { display: grid; grid-template-columns: 290px minmax(0, 1fr); gap: 24px; padding: 22px 28px 34px; align-items: start; } @media (max-width: 900px) { .dc-case { grid-template-columns: 1fr; } }',
      '.dc-pt { position: sticky; top: 10px; } .dc-pt img { width: 100%; aspect-ratio: 4/5; object-fit: cover; object-position: 50% 15%; border-radius: 10px; border: 1px solid rgba(241,234,214,.28); display: block; } .dc-pt .name { margin: 14px 0 2px; font: 600 1.15rem Lora, Georgia, serif; } .dc-pt .meta { color: var(--muted-on-navy); font-size: .86rem; line-height: 1.5; }',
      '@media (max-width: 900px) { .dc-pt { position: static; display: grid; grid-template-columns: 116px minmax(0, 1fr); gap: 2px 16px; align-items: start; } .dc-pt img { grid-row: 1 / span 2; aspect-ratio: 1; } .dc-pt .name { margin: 0; align-self: end; } .dc-pt .meta { align-self: start; } .dc-bubble { grid-column: 1 / -1; } }',
      '.dc-bubble { position: relative; margin-top: 14px; padding: 12px 14px; border-radius: 6px; background: rgba(241,234,214,.07); border: 1px solid var(--rule-on-navy); border-left: 3px solid var(--gold); color: var(--cream); font-size: .92rem; line-height: 1.55; } .dc-bubble::before { content: "The patient says"; position: static; display: block; margin-bottom: 4px; border: 0; font: 600 .66rem "IBM Plex Sans", Arial, sans-serif; letter-spacing: .1em; text-transform: uppercase; color: var(--muted-on-navy); }',
      '.dc-main { background: var(--cream); color: var(--navy); border-radius: 10px; padding: 22px 26px 26px; border: 1px solid var(--rule); line-height: 1.6; min-width: 0; } .dc-main h2 { margin: 0 0 6px; font: 600 1.4rem/1.25 Lora, Georgia, serif; letter-spacing: -.01em; } .dc-main h3 { margin: 24px 0 8px; padding-top: 14px; border-top: 1px solid var(--rule); font: 600 1rem/1.35 Lora, Georgia, serif; } .dc-main p { margin: 0 0 10px; }',
      '.dc-tabs { display: flex; flex-wrap: wrap; gap: 0; margin: 14px 0 20px; border-bottom: 1px solid var(--rule); } .dc-tab { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; margin-bottom: -1px; border: 0; border-bottom: 3px solid transparent; background: transparent; color: var(--muted); font: 600 .84rem "IBM Plex Sans", Arial, sans-serif; cursor: pointer; } .dc-tab:hover { color: var(--navy); } .dc-tab.on { color: var(--navy); border-bottom-color: var(--navy); } .dc-tab .n { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid currentColor; font-size: .7rem; } .dc-tab.on .n { background: var(--navy); border-color: var(--navy); color: var(--cream); }',
      '.dc-obs { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 1px; margin: 10px 0 16px; background: var(--rule); border: 1px solid var(--rule); border-radius: 8px; overflow: hidden; } .dc-obs div { padding: 10px 13px; background: var(--cream-lift); border: 0; border-radius: 0; } .dc-obs small { display: block; font: 600 .66rem "IBM Plex Sans", Arial, sans-serif; letter-spacing: .09em; text-transform: uppercase; color: var(--muted); } .dc-obs b { font-size: 1.02rem; font-weight: 600; }',
      '.dc-note { margin: 10px 0; padding: 12px 15px; border-radius: 6px; background: var(--cream-lift); border: 1px solid var(--rule); border-left: 3px solid var(--navy); } .dc-warn { margin: 10px 0; padding: 12px 15px; border-radius: 6px; background: #FBF1E0; border: 1px solid rgba(180,83,9,.25); border-left: 3px solid #B45309; }',
      '.dc-learn { display: flex; flex-wrap: wrap; gap: 10px; margin: 10px 0 4px; } .dc-btn { padding: 9px 17px; border: 1px solid var(--navy); border-radius: 8px; background: transparent; color: var(--navy); font: 600 .85rem "IBM Plex Sans", Arial, sans-serif; cursor: pointer; text-align: left; } .dc-btn:hover { background: rgba(26,35,45,.07); } .dc-btn.primary { background: var(--navy); color: var(--cream); } .dc-btn.primary:hover { background: #2B3947; } .dc-btn:disabled { opacity: .4; cursor: not-allowed; } .dc-btn.lesson { border-color: #0A5F8F; color: #0A4A70; }',
      '.dc-qs { display: grid; gap: 8px; margin: 10px 0; } .dc-q { display: block; width: 100%; padding: 11px 15px; border: 1px solid var(--rule); border-radius: 8px; background: var(--cream-lift); color: inherit; font: .92rem/1.45 "IBM Plex Sans", Arial, sans-serif; text-align: left; cursor: pointer; transition: border-color .12s; } .dc-q:hover:not(:disabled) { border-color: var(--navy); } .dc-q.used { background: rgba(31,122,77,.08); border-color: #1F7A4D; cursor: default; } .dc-q.used::after { content: "✓"; float: right; color: #1F7A4D; font-weight: 700; } .dc-q:disabled:not(.used) { opacity: .45; cursor: not-allowed; } .dc-q small { color: var(--muted); }',
      '.dc-log { margin-top: 18px; display: grid; gap: 12px; } .dc-log .me { font-size: .82rem; color: var(--muted); margin-bottom: 4px; } .dc-log .them { padding: 11px 15px; border-left: 3px solid #0A5F8F; background: var(--cream-lift); border-radius: 0 6px 6px 0; }',
      '.dc-meter { font: 500 .85rem "IBM Plex Sans", Arial, sans-serif; color: var(--muted); margin: 6px 0 12px; } .dc-table { border-collapse: collapse; margin: 10px 0 12px; font-size: .88rem; width: 100%; max-width: 560px; } .dc-table th, .dc-table td { padding: 6px 10px; border: 1px solid var(--rule); text-align: left; } .dc-table th { background: rgba(26,35,45,.07); font-weight: 600; }',
      '.dc-opts { display: grid; gap: 8px; margin: 10px 0; } .dc-opt { position: relative; display: block; width: 100%; padding: 12px 15px 12px 42px; border: 1px solid var(--rule); border-radius: 8px; background: var(--cream-lift); text-align: left; font: .92rem/1.45 "IBM Plex Sans", Arial, sans-serif; cursor: pointer; color: inherit; } .dc-opt::before { content: ""; position: absolute; left: 15px; top: 50%; width: 14px; height: 14px; margin-top: -7px; border: 2px solid rgba(26,35,45,.4); border-radius: 50%; } .dc-opt:hover { border-color: var(--navy); } .dc-opt.on { border-color: var(--navy); background: #fff; } .dc-opt.on::before { background: var(--navy); border-color: var(--navy); box-shadow: inset 0 0 0 2px #fff; } .dc-opt small { display: block; color: var(--muted); }',
      '.dc-chip:disabled { opacity: .5; cursor: not-allowed; }',
      '.dc-chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; } .dc-chip { padding: 8px 13px; border: 1px solid var(--rule); border-radius: 6px; background: var(--cream-lift); font: .86rem/1.4 "IBM Plex Sans", Arial, sans-serif; cursor: pointer; color: inherit; text-align: left; } .dc-chip:hover:not(:disabled) { border-color: var(--navy); } .dc-chip.on { border-color: var(--navy); background: var(--navy); color: var(--cream); }',
      '.dc-big { font: 600 2.6rem/1.1 Lora, Georgia, serif; letter-spacing: -.02em; margin: 6px 0; } .dc-parts { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 1px; margin: 12px 0; background: var(--rule); border: 1px solid var(--rule); border-radius: 8px; overflow: hidden; } .dc-parts div { padding: 10px 13px; background: var(--cream-lift); border: 0; border-radius: 0; } .dc-parts small { display: block; color: var(--muted); font: 600 .66rem "IBM Plex Sans", Arial, sans-serif; text-transform: uppercase; letter-spacing: .09em; } .good { color: #1F7A4D; font-weight: 600; } .bad { color: #B42318; font-weight: 600; }',
      '.dc-coach-btn { position: fixed; right: 16px; bottom: 16px; z-index: 80; display: flex; align-items: center; gap: 9px; padding: 4px 15px 4px 4px; border: 1px solid var(--gold); border-radius: 999px; background: #1A232D; color: #F1EAD6; font: 600 .82rem "IBM Plex Sans", Arial, sans-serif; cursor: pointer; box-shadow: 0 8px 26px rgba(0,0,0,.45); }',
      '.dc-coach-btn img { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; object-position: 50% 15%; } .dc-coach-btn .dot { position: absolute; top: 2px; left: 40px; width: 11px; height: 11px; border-radius: 50%; background: #ef4444; border: 2px solid #1A232D; }',
      '.dc-coach { position: fixed; right: 16px; bottom: 84px; z-index: 80; width: min(390px, calc(100vw - 32px)); max-height: calc(100vh - 110px); overflow-y: auto; padding: 16px 18px 14px; border-radius: 12px; background: #F1EAD6; color: #1A232D; border: 1px solid rgba(26,35,45,.3); box-shadow: 0 18px 54px rgba(0,0,0,.5); font: .9rem/1.55 "IBM Plex Sans", Arial, sans-serif; }',
      '.dc-coach.inline { position: static; width: auto; max-height: none; margin-top: 14px; box-shadow: none; }',
      '.dc-coach .x { position: absolute; top: 10px; right: 10px; width: 28px; height: 28px; border: 1px solid rgba(26,35,45,.25); border-radius: 6px; background: transparent; cursor: pointer; } .dc-coach .who { display: flex; gap: 12px; align-items: center; margin-bottom: 10px; padding-right: 34px; padding-bottom: 10px; border-bottom: 1px solid rgba(26,35,45,.15); } .dc-coach .who img { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; object-position: 50% 15%; border: 1px solid rgba(26,35,45,.3); } .dc-coach .who b { font: 600 1rem Lora, Georgia, serif; } .dc-coach .who small { display: block; color: #5B6672; }',
      '.dc-coach .say { margin-bottom: 10px; } .dc-coach .intro { margin: 0 0 8px; padding: 9px 12px; border-radius: 6px; background: #FAF6E9; border-left: 3px solid #1A232D; } .dc-coach .ideas-h { margin: 8px 0 6px; font: 600 .68rem "IBM Plex Sans", Arial, sans-serif; letter-spacing: .1em; text-transform: uppercase; color: #5B6672; }',
      '.dc-coach .idea { margin: 6px 0; padding: 9px 12px; border-radius: 6px; background: #FAF6E9; border: 1px solid rgba(26,35,45,.15); } .dc-coach .idea b { display: block; } .dc-coach .idea p { margin: 2px 0 4px; font-size: .86rem; } .dc-coach .idea button { padding: 0; border: 0; background: none; color: #0A4A70; font: 600 .8rem "IBM Plex Sans", Arial, sans-serif; cursor: pointer; text-decoration: underline; } .dc-coach .mute { display: block; margin-top: 10px; font-size: .76rem; color: #5B6672; }',
      '.dc-coach.side { top: 0; right: 0; bottom: 0; width: min(470px, 94vw); max-height: none; border-radius: 0; border-width: 0 0 0 1px; padding: 20px 24px 40px; z-index: 90; font-size: .95rem; line-height: 1.7; } .dc-coach.side .say { font-size: 1rem; }',
      '.dc-coach .teach-h { margin: 24px 0 6px; padding-top: 14px; border-top: 1px solid rgba(26,35,45,.25); font: 600 .72rem "IBM Plex Sans", Arial, sans-serif; letter-spacing: .1em; text-transform: uppercase; } .dc-coach .teach-in { margin: 0 0 6px; color: #5B6672; }',
      '.dc-coach .teach-tabs { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; gap: 0; margin: 4px -24px 12px; padding: 0 24px; background: #F1EAD6; border-bottom: 1px solid rgba(26,35,45,.2); } .dc-coach .teach-tab { padding: 10px 13px; margin-bottom: -1px; border: 0; border-bottom: 3px solid transparent; background: transparent; color: #5B6672; font: 600 .8rem "IBM Plex Sans", Arial, sans-serif; cursor: pointer; } .dc-coach .teach-tab.on { color: #1A232D; border-bottom-color: #1A232D; } .dc-coach .teach-pane[hidden] { display: none; }',
      '.dc-coach .teach { margin: 18px 0 8px; padding-bottom: 8px; } .dc-coach .teach + .teach { border-top: 1px solid rgba(26,35,45,.18); padding-top: 16px; } .dc-coach .teach h3 { margin: 0 0 4px; font: 600 1.2rem/1.3 Lora, Georgia, serif; } .dc-coach .teach h3 .lead { display: block; font: 600 .7rem "IBM Plex Sans", Arial, sans-serif; letter-spacing: .1em; text-transform: uppercase; color: #5B6672; }',
      '.dc-coach .teach .spec { display: inline-block; margin: 4px 0 8px; padding: 2px 9px; border-radius: 4px; background: #1A232D; color: #F1EAD6; font: 600 .68rem "IBM Plex Sans", Arial, sans-serif; letter-spacing: .04em; } .dc-coach .teach h4 { margin: 22px 0 6px; font: 600 1rem "IBM Plex Sans", Arial, sans-serif; } .dc-coach .teach p { margin: 0 0 14px; } .dc-coach .teach ul { margin: 0 0 14px 20px; padding: 0; } .dc-coach .teach li { margin-bottom: 6px; }',
      '.dc-coach .teach .ex, .dc-coach .teach .tw { margin: 4px 0 16px; padding: 11px 15px; border-radius: 6px; } .dc-coach .teach .ex { background: rgba(11,114,133,.1); border-left: 3px solid #0B7285; } .dc-coach .teach .tw { background: #FBF1E0; border-left: 3px solid #B45309; } .dc-coach .teach .eq { padding: 8px 12px; background: #FAF6E9; border-left: 3px solid #0A5F8F; font-family: Consolas, monospace; overflow-x: auto; }',
      '.dc-tab.ref { margin-left: auto; color: #0A4A70; } .dc-tab.ref.on { color: var(--navy); }',
      '.dc-science.dc-coach { position: static; width: auto; max-height: none; overflow: visible; margin: 6px 0 0; padding: 0; border: 0; border-radius: 0; background: transparent; box-shadow: none; color: inherit; font-size: .98rem; line-height: 1.7; } .dc-science .teach-h { margin-top: 0; padding-top: 0; border-top: 0; } .dc-science .teach-tabs { position: static; margin: 6px 0 14px; padding: 0; background: transparent; }',
      '.dc-drawer { position: fixed; top: 0; right: 0; bottom: 0; z-index: 90; width: min(460px, 94vw); overflow-y: auto; padding: 20px 22px 40px; background: #F1EAD6; color: #1A232D; border-left: 1px solid rgba(26,35,45,.3); box-shadow: -18px 0 50px rgba(0,0,0,.45); font: .94rem/1.65 "IBM Plex Sans", Arial, sans-serif; } .dc-drawer h2 { margin: 0 0 4px; font: 600 1.25rem Lora, Georgia, serif; } .dc-drawer h4 { margin: 18px 0 4px; font-size: 1rem; } .dc-drawer p { margin: 0 0 10px; } .dc-drawer .x { float: right; padding: 3px 10px; border: 1px solid rgba(26,35,45,.3); border-radius: 6px; background: transparent; cursor: pointer; }',
      '.dc-drawer .spec { display: inline-block; margin: 4px 0 10px; padding: 2px 9px; border-radius: 4px; background: #1A232D; color: #F1EAD6; font: 600 .7rem "IBM Plex Sans", Arial, sans-serif; } .dc-drawer .ex { margin: 8px 0 12px; padding: 9px 13px; background: rgba(11,114,133,.1); border-left: 3px solid #0B7285; border-radius: 6px; } .dc-drawer .tw { margin: 8px 0 12px; padding: 9px 13px; background: #FBF1E0; border-left: 3px solid #B45309; border-radius: 6px; } .dc-drawer ul { margin: 0 0 10px 18px; padding: 0; } .dc-drawer .chk { margin: 8px 0; }',
    ].join('\n');
    document.head.appendChild(st);
  }

  function ranksInfo(d) { var T = D.tracks[track], ri = D.rankIndex(track, d.results); return { T: T, ri: ri, rank: T.ranks[ri] }; }
  function render() { renderInner(); coachDraw(); }
  function renderInner() {
    css(); var d = D.load(track);
    if (cur) { renderCase(d); return; }
    var R = ranksInfo(d), cases = D.casesFor(track), avg = D.average(d.results), n = Object.keys(d.results).length;
    host.innerHTML = '<div class="dc"><div class="dc-top"><div><button type="button" class="dc-back" data-dc="back">' + esc(TXT('back')) + '</button><h1 style="margin-top:12px">' + esc(R.T.career || 'Doctor Career') + ': ' + esc(R.T.title) + '</h1><div class="sub">' + cases.length + ' patients, from ' + esc(R.T.ranks[0].title.toLowerCase()) + ' to ' + esc(R.T.ranks[R.T.ranks.length - 1].title.toLowerCase()) + '</div></div><div class="dc-role"><b>' + esc(R.rank.title) + '</b><span>' + esc(R.rank.place) + '</span></div></div>' +
      '<div class="dc-stats"><span class="dc-stat">Patients seen: ' + n + '</span><span class="dc-stat">Average score: ' + (avg == null ? '·' : avg + '%') + '</span></div><div class="dc-files">' +
      cases.map(function (c, i) {
        var locked = c.rank > R.ri, res = d.results[c.id];
        return '<button type="button" class="dc-file' + (locked ? ' lock' : '') + (res ? ' done' : '') + '" data-open="' + c.id + '"' + (locked ? ' disabled' : '') + '><img src="' + esc(c.patient.image) + '" alt="' + esc(c.patient.name) + '" loading="lazy"><span class="b"><b>' + esc(c.patient.name) + ', ' + esc(c.patient.age) + '</b><small>' + esc(c.complaint) + '</small><span class="tag">' + (locked ? 'Waiting for promotion' : res ? 'Seen · best ' + res.best + '%' : 'New patient') + '</span></span></button>';
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
      body = '<div class="dc-tabs">' + tabs.map(function (t, i) { return '<button type="button" class="dc-tab' + (run.tab === t[0] ? ' on' : '') + '" data-tab="' + t[0] + '"><span class="n">' + (i + 1) + '</span>' + t[1] + '</button>'; }).join('') + '<button type="button" class="dc-tab ref' + (run.tab === 'learn' ? ' on' : '') + '" data-tab="learn">' + esc(TXT('learnTab')) + '</button></div>';
      if (run.tab === 'file') body += fileHtml(c); else if (run.tab === 'learn') body += '<h2>' + esc(TXT('learnTab')) + '</h2>' + learnHtml(c); else if (run.tab === 'ask') body += askHtml(c, run); else if (run.tab === 'tests') body += testsHtml(c, run); else body += decideHtml(c, run);
    }
    host.innerHTML = '<div class="dc"><div class="dc-top"><div><button type="button" class="dc-back" data-dc="files">← Back to the files</button></div><div class="dc-role"><b>' + esc(D.tracks[track].ranks[D.rankIndex(track, d.results)].title) + '</b><span>About ' + (c.minutes || 10) + ' minutes</span></div></div><div class="dc-case">' + left + '<section class="dc-main">' + body + '</section></div></div>';
  }
  function fileHtml(c) {
    return '<h2>' + esc(c.title) + '</h2><p style="opacity:.75;margin:0 0 8px">' + esc(c.tagline) + '</p><div class="dc-note"><b>Referral.</b> ' + bold(c.referral) + '</div>' +
      '<h3>Observations</h3><div class="dc-obs">' + c.obs.map(function (o) { return '<div><small>' + esc(o[0]) + '</small><b>' + esc(o[1]) + '</b></div>'; }).join('') + '</div>' +
      '<h3>What the notes say</h3><ul style="margin:0 0 10px 18px;padding:0">' + c.notes.map(function (n) { return '<li>' + bold(n) + '</li>'; }).join('') + '</ul>' +
      (c.infoCard ? '<h3>' + esc(c.infoCard.title) + '</h3><div class="dc-note">' + c.infoCard.body.map(function (p) { return '<p>' + bold(p) + '</p>'; }).join('') + '</div>' : '') +
      '<div class="dc-note"><b>Background.</b> ' + esc(mentor().name) + ' ' + TXT('background') + '. It is written out under the <b>' + esc(TXT('learnTab')) + '</b> tab of this file. Read it before you call the patient in.</div>' +
      '<div class="dc-learn" style="margin-top:14px"><button type="button" class="dc-btn lesson" data-tab="learn">Read ' + esc(TXT('learnTab').toLowerCase()) + ' first</button><button type="button" class="dc-btn primary" data-tab="ask">Call the patient in →</button></div>';
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
    var found = factsFound(c, run), enough = found.length >= 4, ready = enough && run.dx && run.evidence.length === 2 && run.tx;
    return '<h2>Your decision</h2><h3>1. What is wrong?</h3><div class="dc-opts">' + c.options.map(function (o) { return '<button type="button" class="dc-opt' + (run.dx === o.id ? ' on' : '') + '" data-dx="' + o.id + '"><b>' + esc(o.name) + '</b>' + (o.sub ? '<small>' + esc(o.sub) + '</small>' : '') + '</button>'; }).join('') + '</div>' +
      '<h3>2. Which two things you found point to that most strongly?</h3>' + (enough ? '<div class="dc-meter">Choose two. You can only pick things you have learned so far.</div>' : '<div class="dc-warn">You have found only ' + found.length + ' thing' + (found.length === 1 ? '' : 's') + ' so far, which is too few to choose between. Ask the patient more questions or choose some ' + (track === 'psych' ? 'assessments' : 'tests') + ', and the things you find will appear here.</div>') + '<div class="dc-chips">' + found.map(function (f) { return '<button type="button" class="dc-chip' + (run.evidence.indexOf(f) > -1 ? ' on' : '') + '" data-ev="' + f + '"' + (enough ? '' : ' disabled') + '>' + esc(c.facts[f]) + '</button>'; }).join('') + '</div>' +
      '<h3>3. What do you do now?</h3><div class="dc-opts">' + c.treatments.map(function (t) { return '<button type="button" class="dc-opt' + (run.tx === t.id ? ' on' : '') + '" data-tx="' + t.id + '">' + esc(t.label) + '</button>'; }).join('') + '</div>' +
      '<div class="dc-learn" style="margin-top:14px"><button type="button" class="dc-btn primary" data-act="submit"' + (ready ? '' : ' disabled') + '>Send the patient home with my decision</button>' + (ready ? '' : '<span class="dc-meter" style="align-self:center">' + (enough ? 'Choose a diagnosis, two pieces of evidence and what to do.' : 'Find out more first: you need at least four findings before you can decide.') + '</span>') + '</div>';
  }
  // After the case: what the two chosen facts did, what would have settled it, and where each missing fact could have been found.
  function evidenceFeedback(c, run) {
    var dec = c.decisive || [], chosen = run.evidence || [], found = factsFound(c, run), li = function (t, cls) { return '<li' + (cls ? ' class="' + cls + '"' : '') + '>' + t + '</li>'; };
    var good = chosen.filter(function (f) { return dec.indexOf(f) > -1; }), weak = chosen.filter(function (f) { return dec.indexOf(f) < 0; });
    var unpicked = dec.filter(function (f) { return chosen.indexOf(f) < 0 && found.indexOf(f) > -1; }), missed = dec.filter(function (f) { return found.indexOf(f) < 0; });
    var source = function (f) {
      var q = (c.questions || []).filter(function (x) { return x.fact === f; })[0], t = (c.tests || []).filter(function (x) { return x.fact === f; })[0];
      return q ? 'You could have found it by asking: "' + esc(q.q) + '"' : t ? 'You could have found it with: ' + esc(t.name) : '';
    };
    var out = '<h3>Your evidence: ' + good.length + ' of 2 picks settled it</h3><p>Good evidence fits one answer far better than the others.</p><ul style="margin:0 0 10px 18px;padding:0">';
    good.forEach(function (f) { out += li('<b>Good pick:</b> ' + esc(c.facts[f]) + ' ✓', 'good'); });
    weak.forEach(function (f) { out += li('<b>Weaker pick:</b> ' + esc(c.facts[f]) + '. This is true, but it does not separate the options, so it earns nothing here.'); });
    out += '</ul>';
    if (unpicked.length) out += '<p><b>You had these and passed them over:</b></p><ul style="margin:0 0 10px 18px;padding:0">' + unpicked.map(function (f) { return li(esc(c.facts[f])); }).join('') + '</ul>';
    if (missed.length) out += '<p><b>You never found these, and they would have helped:</b></p><ul style="margin:0 0 10px 18px;padding:0">' + missed.map(function (f) { return li(esc(c.facts[f]) + '<br><small>' + source(f) + '</small>'); }).join('') + '</ul>';
    if (good.length === 2 && !weak.length) out += '<p>Both of your picks were decisive. Well chosen.</p>';
    return out;
  }
  function outcomeHtml(c, run) {
    var s = run.done, right = run.dx === c.truth, tx = c.treatments.filter(function (t) { return t.id === run.tx; })[0], T = c.options.filter(function (o) { return o.id === c.truth; })[0], chosen = c.options.filter(function (o) { return o.id === run.dx; })[0];
    return '<h2>' + (right ? 'Diagnosis confirmed' : 'Not quite') + '</h2><div class="dc-big">' + s.total + '%</div>' +
      '<p>' + (right ? '<span class="good">You diagnosed ' + esc(T.name) + '.</span>' : '<span class="bad">You said ' + esc(chosen.name) + '. It was ' + esc(T.name) + '.</span>') + '</p>' +
      '<div class="dc-parts"><div><small>Diagnosis</small><b>' + s.dx + ' / 50</b></div><div><small>Evidence</small><b>' + s.evidence + ' / 20</b></div><div><small>What you did</small><b>' + s.treatment + ' / 20' + (s.harm ? ' (−10 harm)' : '') + '</b></div><div><small>No time wasted</small><b>' + s.efficiency + ' / 10</b></div></div>' +
      '<h3>What happened</h3><p>' + bold(right ? c.outcome.right : c.outcome.wrong) + '</p>' +
      (c.twist ? '<div class="dc-warn"><b>The twist.</b> ' + bold(c.twist) + '</div>' : '') +
      '<h3>Your treatment choice</h3><p><b>' + esc(tx ? tx.label : '') + '</b><br>' + bold(tx ? tx.why : '') + '</p>' +
      evidenceFeedback(c, run) +
      '<h3>' + esc(TXT('review')) + '</h3><p>' + esc(TXT('reviewBody')) + '</p>' + learnHtml(c) +
      '<div class="dc-learn" style="margin-top:18px"><button type="button" class="dc-btn primary" data-dc="files">Next patient →</button></div>';
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
    var tab = run.tab === 'learn' ? 'file' : (run.tab || 'file');
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
    host.style.paddingRight = '';
    if (!coachOpen) return;
    coachEl = document.createElement('div'); coachEl.className = 'dc-coach'; coachEl.setAttribute('role', 'dialog'); coachEl.setAttribute('aria-label', 'Notes from ' + mentor().name);
    var intro = firstEver && !cur ? '<p class="intro"><b>I am ' + esc(mentor().name) + ', ' + esc(TXT('role')) + '.</b></p>' : '';
    var ideas = (m.ideas || []).map(function (i) { return '<div class="idea"><b>' + esc(i.t) + '</b><p>' + esc(i.b) + '</p></div>'; }).join('');
    coachEl.innerHTML = '<button type="button" class="x" data-coach-close="1" aria-label="Hide the notes">✕</button><div class="who"><img alt="" src="' + mentor().img[m.img || 'hello'] + '"><div><b>' + esc(mentor().name) + '</b><small>' + esc(m.label) + '</small></div></div>' + intro + '<div class="say">' + m.html + '</div>' + (ideas ? '<div class="ideas-h">Worth knowing for this decision</div>' + ideas : '') + '<label class="mute"><input type="checkbox" data-coach-mute="1"' + (st.coach.muted ? ' checked' : '') + '> Keep my notes closed unless I open them</label>';
    document.body.appendChild(coachEl);
    coachEl.addEventListener('click', function (ev) {
      var tt = ev.target.closest('[data-ttab]');
      if (tt) { var k = +tt.dataset.ttab; if (cur) cur.teachTab = k; coachEl.querySelectorAll('.teach-tab').forEach(function (b) { var is = +b.dataset.ttab === k; b.classList.toggle('on', is); b.setAttribute('aria-selected', String(is)); }); coachEl.querySelectorAll('.teach-pane').forEach(function (p) { p.hidden = +p.dataset.tpane !== k; }); var bar = coachEl.querySelector('.teach-tabs'); if (bar && coachEl.scrollTop > bar.offsetTop) coachEl.scrollTop = bar.offsetTop; return; }
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
  // The teaching is one tab per possible explanation, so no one explanation is read before another just by position. The order is fixed
  // per case but not the order of the answers, so the first tab is no clue.
  function stableShuffle(list, seed) { var h = 0; for (var k = 0; k < seed.length; k++) h = (h * 31 + seed.charCodeAt(k)) >>> 0; return list.map(function (x, n) { return { x: x, r: ((h + n * 2654435761) >>> 0) % 997 }; }).sort(function (a, b) { return a.r - b.r; }).map(function (o) { return o.x; }); }
  function teachTabs(c) {
    var tabs = (c.teach || null) ? c.teach.map(function (t) { return { tab: t.tab, lessons: t.lessons.filter(function (id) { return D.lessons[id]; }) }; }) : (c.lessons || []).filter(function (id) { return D.lessons[id]; }).map(function (id) { return { tab: D.lessons[id].title.split(':')[0], lessons: [id] }; });
    tabs = tabs.filter(function (t) { return t.lessons.length; });
    var main = tabs.filter(function (t) { return !/^Background/.test(t.tab); }), extra = tabs.filter(function (t) { return /^Background/.test(t.tab); });
    return stableShuffle(main, c.id).concat(extra);
  }
  function teachHtml(c) {
    var tabs = teachTabs(c); if (!tabs.length) return '';
    var on = Math.min(cur.teachTab || 0, tabs.length - 1), words = ['no', 'one', 'two', 'three', 'four', 'five', 'six'], n = tabs.filter(function (t) { return !/^Background/.test(t.tab); }).length;
    var out = '<div class="teach-h">What you need to know</div><p class="teach-in">' + (track === 'psych' ? 'Compare the ' + (words[n] || n) + ' possible explanations.' : TXT('teachIntro')) + '</p>' +
      '<div class="teach-tabs" role="tablist">' + tabs.map(function (t, k) { return '<button type="button" role="tab" class="teach-tab' + (k === on ? ' on' : '') + '" data-ttab="' + k + '" aria-selected="' + (k === on) + '">' + esc(t.tab) + '</button>'; }).join('') + '</div>';
    tabs.forEach(function (t, k) {
      out += '<div class="teach-pane" data-tpane="' + k + '"' + (k === on ? '' : ' hidden') + '>' + t.lessons.map(function (id) {
        var L = D.lessons[id];
        return '<section class="teach"><h3>' + esc(L.title) + '</h3>' + L.sections.map(function (sec) { return (sec.h ? '<h4>' + esc(sec.h) + '</h4>' : '') + sec.b.map(lessonBlock).join(''); }).join('') + '</section>';
      }).join('') + '</div>';
    });
    return out;
  }
  function learnHtml(c) { var h = teachHtml(c); return h ? '<div class="dc-science dc-coach">' + h + '</div>' : '<p>There is no separate reading for this patient.</p>'; }
  function openLesson() { coachOpen = true; lastStep = null; coachDraw(); }
  function closeDrawer() {}


  /* ---------- events ---------- */
  function bind() {
    host.addEventListener('click', function (e) {
      var tt = e.target.closest('[data-ttab]');
      if (tt && cur) {   // a tab of the science written out in the file: one explanation at a time
        var root = tt.closest('.dc-science'), k = +tt.dataset.ttab; cur.teachTab = k;
        root.querySelectorAll('.teach-tab').forEach(function (b) { var is = +b.dataset.ttab === k; b.classList.toggle('on', is); b.setAttribute('aria-selected', String(is)); });
        root.querySelectorAll('.teach-pane').forEach(function (pn) { pn.hidden = +pn.dataset.tpane !== k; });
        return;
      }
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
