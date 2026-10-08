/*
 * Criminal Lawyer Career: Ruth Adebayo, a junior barrister in your chambers, who sits behind you in court. She gives a short note at each
 * stage of a case (what the stage is, and what to aim for) and can open the lessons the case turns on. Written in advance: nothing here is generated.
 */
(function (root) {
  var L = root.LAW_CAREER = root.LAW_CAREER || { cases: [] };
  var A = '/assets/career/';
  var RUTH = { name: 'Ruth Adebayo', role: 'Junior barrister in your chambers', img: { hello: A + 'ruth-hello.jpg', point: A + 'ruth-point.jpg', think: A + 'ruth-think.jpg' } };
  L.mentor = RUTH;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  // What she says. ctx: { stage, side (yours), by (whose witness or speech), phase, name (the witness), title }
  function note(ctx) {
    var mine = ctx.side, other = mine === 'defence' ? 'prosecution' : 'defence', pros = mine === 'prosecution';
    var s = ctx.stage;
    if (s === 'chambers' || s === 'interview') return { img: 'hello', label: 'Before court: the interview', concept: 'interview',
      html: pros ? 'This is a conference with a key witness before the trial. Nothing said here is evidence, so ask freely. Take them through what they saw in order, then look for the parts of their account the defence is likely to challenge.'
        : 'This is your private meeting with your client. Nothing said here is evidence, so ask freely: what happened, in what order, who else was there, and what could prove it. Notice anything that is hard to believe. A jury will notice it too.' };
    if (s === 'arrival' || s === 'arraignment') return { img: 'hello', label: 'Opening the trial',
      html: 'The charge is read to the defendant and a plea is taken. The jury is then sworn in and the prosecution opens the case. Nothing is asked of you yet.' };
    if (s === 'opening') {
      if (ctx.by === mine) return { img: 'point', label: 'Your opening speech', concept: 'opening',
        html: 'Tell the jury, in plain words, what this case is about and what you say the evidence will show. Only promise what you can prove: if you promise too much and the evidence falls short, the other side will remind the jury. Jot down your points first, then compile them into a speech and edit it.' };
      return { img: 'hello', label: 'The other side opens',
        html: 'Listen to what ' + (ctx.by === 'prosecution' ? 'the Crown' : 'the defence') + ' promises. Every promise is something you can test when their witnesses are questioned.' };
    }
    if (s === 'witness') {
      var who = ctx.name ? ctx.name : 'the witness';
      if (ctx.phase === 'intro') return { img: 'hello', label: 'A witness is called', html: 'The witness takes the oath. When the questions start, I will tell you what to aim for.' };
      if (ctx.phase === 'chief' && ctx.by === mine) return { img: 'point', label: 'Examination-in-chief', concept: 'witness',
        html: 'You are questioning your own witness, ' + esc(who) + '. Ask open questions that start with who, what, when, where or how, so they tell the story in their own words. Do not lead them: a leading question suggests the answer, and the judge can stop you. Show an exhibit when it helps them explain.' };
      if (ctx.phase !== 'chief' && ctx.by !== mine) return { img: 'think', label: 'Cross-examination', concept: 'witness',
        html: 'You are questioning the other side\'s witness, ' + esc(who) + '. Use short questions that lead them to one point at a time, such as "You were forty metres away, weren\'t you?" Avoid asking "why": it hands them a speech. Do not ask a question if you do not know what the answer will be. Look for what they could not see, what they said differently before, and what they gain from the result.' };
      return { img: 'hello', label: 'The other side questions', html: 'Listen to each answer and note whether it helps you or hurts you. You will need both for your closing speech.' };
    }
    if (s === 'closing') {
      if (ctx.by === mine) return { img: 'point', label: 'Your closing speech', concept: 'closing',
        html: (pros ? 'You must make the jury sure of guilt. Go through the evidence that proves each part of the charge, and deal with the doubts the defence has raised.' : 'You do not have to prove anything. Show the jury where the Crown\'s case has gaps, and why those gaps leave a reasonable doubt.') + ' Use what came out in court, with names and exhibits, not what you hoped to hear. Jot down your points, compile them, and edit.' };
      return { img: 'hello', label: 'The other side closes', html: 'Listen to how ' + (ctx.by === 'prosecution' ? 'the Crown' : 'the defence') + ' uses the evidence, and compare it with what you heard in court.' };
    }
    if (s === 'summing_up') return { img: 'hello', label: 'The judge sums up', html: 'The judge tells the jury what the law is and reminds them of the evidence. The legal tests in the lessons matter most here, because the jury must apply them.' };
    if (s === 'deliberation') return { img: 'think', label: 'The jury decides', html: 'Nothing more can be said now. The verdict depends on the facts you got established in court and how clearly you argued them.' };
    if (s === 'verdict') return { img: 'think', label: 'The verdict', html: 'Whatever the result, the review afterwards shows which facts you established, which you missed, and where they were available.' };
    if (s === 'sentencing') return { img: 'hello', label: 'Sentencing', html: 'If the defendant is convicted, the judge sets the sentence, looking at how serious the offence was and at the circumstances of the offender.' };
    return null;
  }
  L.guideNote = note;

  var st = { open: true, last: null, seen: false, el: null, btn: null };
  function css() {
    if (document.getElementById('lcCoachStyle')) return;
    var e = document.createElement('style'); e.id = 'lcCoachStyle';
    e.textContent = [
      '.lc-btn { position: absolute; left: 16px; bottom: 16px; z-index: 12; display: flex; align-items: center; gap: 8px; padding: 4px 14px 4px 4px; border: 2px solid #E6D7B0; border-radius: 999px; background: #1A232D; color: #F4ECD8; font: 700 .82rem Arial, sans-serif; cursor: pointer; box-shadow: 0 8px 26px rgba(0,0,0,.5); }',
      '.lc-btn img { width: 50px; height: 50px; border-radius: 50%; object-fit: cover; object-position: 50% 18%; } .lc-btn .dot { position: absolute; top: 2px; left: 42px; width: 12px; height: 12px; border-radius: 50%; background: #ef4444; border: 2px solid #1A232D; }',
      '.lc-card { position: absolute; left: 16px; bottom: 80px; z-index: 12; width: min(370px, calc(100vw - 32px)); max-height: calc(100% - 110px); overflow-y: auto; padding: 14px 16px 14px; border-radius: 16px; background: #f4ecd8; color: #1f1a10; border: 2px solid #1A232D; box-shadow: 0 18px 54px rgba(0,0,0,.55); font: .92rem/1.6 Arial, sans-serif; }',
      '.lc-card .x { position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; border: 1px solid rgba(0,0,0,.25); border-radius: 50%; background: transparent; cursor: pointer; } .lc-card .who { display: flex; gap: 10px; align-items: center; margin-bottom: 8px; padding-right: 30px; }',
      '.lc-card .who img { width: 58px; height: 58px; border-radius: 50%; object-fit: cover; object-position: 50% 18%; border: 2px solid #1A232D; } .lc-card .who small { display: block; opacity: .65; } .lc-card .say { margin-bottom: 8px; } .lc-card .intro { margin: 0 0 8px; padding: 8px 10px; border-radius: 10px; background: rgba(230,215,176,.55); }',
      '.lc-card .read { display: block; width: 100%; margin: 5px 0 0; padding: 8px 11px; border: 1px solid rgba(31,26,16,.25); border-radius: 10px; background: #fff; color: #0a4a70; font: 700 .8rem Arial, sans-serif; text-align: left; cursor: pointer; }',
    ].join('\n');
    document.head.appendChild(e);
  }
  L.coachDestroy = function () { if (st.el) st.el.remove(); if (st.btn) st.btn.remove(); st.el = st.btn = null; st.last = null; };
  // host: the courtroom root. ctx as above, plus concepts (the lessons that fit this stage) and openLesson(label).
  L.coachDraw = function (host, ctx) {
    if (!host) return; css();
    var n = note(ctx); if (!n) { L.coachDestroy(); return; }
    var key = ctx.stage + ':' + (ctx.phase || '') + ':' + (ctx.by || '') + ':' + (ctx.name || '');
    var fresh = key !== st.last; st.last = key;
    if (!st.btn || !st.btn.isConnected) {
      st.btn = document.createElement('button'); st.btn.type = 'button'; st.btn.className = 'lc-btn'; st.btn.setAttribute('aria-label', RUTH.name + ': open or close her notes');
      st.btn.innerHTML = '<img alt="" src="' + RUTH.img.hello + '"><span>' + esc(RUTH.name) + '</span><i class="dot"></i>';
      st.btn.addEventListener('click', function () { st.open = !st.open; st.last = null; if (st.ctx) L.coachDraw(host, st.ctx); });
      host.appendChild(st.btn);
    }
    st.ctx = ctx;
    st.btn.querySelector('.dot').style.display = !st.open && fresh ? '' : 'none';
    if (st.el) { st.el.remove(); st.el = null; }
    if (!st.open) return;
    var c = document.createElement('div'); c.className = 'lc-card'; c.setAttribute('role', 'dialog'); c.setAttribute('aria-label', 'Notes from ' + RUTH.name);
    var intro = !st.seen ? '<p class="intro"><b>I’m ' + esc(RUTH.name) + '.</b> I’ll stay beside you through the case.</p>' : '';
    var reads = (ctx.concepts || []).slice(0, 3).map(function (k, i) { return '<button type="button" class="read" data-read="' + i + '">Read: ' + esc(k.label) + '</button>'; }).join('');
    c.innerHTML = '<button type="button" class="x" aria-label="Hide her notes">✕</button><div class="who"><img alt="" src="' + RUTH.img[n.img || 'hello'] + '"><div><b>' + esc(RUTH.name) + '</b><small>' + esc(n.label) + '</small></div></div>' + intro + '<div class="say">' + n.html + '</div>' + reads;
    st.seen = true;
    c.addEventListener('click', function (ev) {
      if (ev.target.closest('.x')) { st.open = false; L.coachDraw(host, ctx); return; }
      var r = ev.target.closest('[data-read]'); if (r && ctx.openLesson) ctx.openLesson((ctx.concepts || [])[+r.dataset.read].label);
    });
    host.appendChild(c); st.el = c;
  };
})(typeof window !== 'undefined' ? window : globalThis);
