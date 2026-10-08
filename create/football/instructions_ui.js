// The Instructions tab: one large box in which you tell the team how to play, in your own words, about any players of either club, any line or the
// whole team, for any stage of play. Each stage has two boxes: general instructions (kept) and instructions for this game only (removed after the match). LastMind turns the text into rules the match engine runs (see rules.js and the backend route
// /football/compile-instruction), shows you what it understood, and only then adds it. Beneath it are all your instructions in one list, and the
// assistant, on the right, draws what they do on the pitch and tells you where they clash and what to try next (see elena.js).
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const states = {};
  const STAGE_NAME = { build: 'the build-up', final: 'the final third', transAtt: 'the moment after we win the ball', transDef: 'the moment after we lose the ball', press: 'pressing them while they build', without: 'defending' };
  const STAGE_EG = {
    build: 'Sarpong stays level with Thorne and very central, to draw their left attacking midfielder in. When we are pressed the defenders never go long: they play to the nearest midfielder.',
    final: 'The right winger stays wide and the striker plays on the last defender. Nobody shoots from outside the box unless it is Thorne.',
    transAtt: 'As soon as we win it, Shin runs in behind and the first pass goes forward to the striker.',
    transDef: 'When we lose it, the nearest two players close the ball down at once and the rest drop back into shape.',
    press: 'Both strikers press the centre-backs, the attacking midfielders mark their full-backs, and nobody follows the keeper.',
    without: 'The defensive midfielder shadows their number 10 and the full-backs tuck in when the ball is on the other side.',
  };
  const everyone = (t) => { const seen = {}, out = []; (t.squad || []).concat(t.players || [], t.bench || []).forEach((p) => { if (p && !seen[p.number]) { seen[p.number] = 1; out.push(p); } }); return out; };
  FM.squadOf = (t) => everyone(t).map((p) => ({ number: p.number, name: p.name, group: p.group || p.natural, role: (p.roleId || '').replace(/_/g, ' '), slot: p.slotKey || '' }));

  // The shirt numbers and names of both clubs, so a rule can be shown by name.
  function setRoster(team, hooks) {
    const own = {}, opp = {};
    everyone(team).forEach((p) => { own[p.number] = p.name; });
    const o = hooks && hooks.opp ? hooks.opp() : null;
    if (o) everyone(o).forEach((p) => { opp[p.number] = p.name; });
    FM.rulesRoster = { own, opp };
    return { own: everyone(team), opp: o ? everyone(o) : [], oppTeam: o };
  }

  // The defensive line, drawn: a small pitch from above with your goal at the bottom. Move the slider and the defenders move with it.
  function lineCard(team) {
    const manual = team.players.some((p) => (p.group === 'CB' || p.group === 'FB') && FM.isManual(team, p, 'without'));
    return `<div class="in-line"><div class="in-lc"><b>Height of the defensive line</b>
        <p class="in-note">How far up the pitch the defence stands when you do not have the ball. A high line squeezes the space in front of it but leaves room behind it; a deep one is harder to run in behind.${manual ? ' A defender you placed by hand on the Defending board stays where you put him.' : ''}</p>
        <div class="in-slide"><span>Deep</span><input type="range" id="inLine" min="0" max="1" step="0.05" value="${team.tactics.lineHeight}" aria-label="Height of the defensive line"><span>High</span></div>
        <p class="in-note" id="inLineTxt"></p></div>
        <svg id="inLineSvg" viewBox="0 0 204 315" role="img" aria-label="The defence at this line height"></svg></div>`;
  }
  function paintLine(host, team) {
    const svg = host.querySelector('#inLineSvg'); if (!svg) return;
    const W = 204, H = 315, x = (w) => (w * W).toFixed(1), y = (d) => ((1 - d) * H).toFixed(1);
    let s = `<rect width="${W}" height="${H}" rx="6" fill="#2A7539"/><rect x="1" y="1" width="${W - 2}" height="${H - 2}" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="1.5"/><line x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}" stroke="rgba(255,255,255,.7)" stroke-width="1.5"/><rect x="${W / 2 - 60}" y="${H - 50}" width="120" height="49" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="1.5"/>`;
    const pos = team.players.map((p) => ({ p, q: FM.phasePos(team, p, 'without') }));
    const backs = pos.filter(({ p }) => p.group === 'CB' || p.group === 'FB');
    const lineD = backs.length ? backs.reduce((a, { q }) => a + q.d, 0) / backs.length : 0.3;
    s += `<line x1="0" y1="${y(lineD)}" x2="${W}" y2="${y(lineD)}" stroke="#F2C14E" stroke-width="2" stroke-dasharray="6 4"/><text x="${W - 6}" y="${(+y(lineD) - 5).toFixed(1)}" text-anchor="end" font-size="10" font-weight="700" fill="#F2C14E" font-family="sans-serif">${Math.round(lineD * 105)} m from your goal</text>`;
    pos.forEach(({ p, q }) => { const back = p.group === 'CB' || p.group === 'FB'; s += `<circle cx="${x(q.w)}" cy="${y(q.d)}" r="${back ? 10 : 6.5}" fill="${back ? '#F2C14E' : 'rgba(241,234,214,.35)'}" stroke="${back ? '#1A232D' : 'rgba(0,0,0,.25)'}" stroke-width="1.5"/>${back ? `<text x="${x(q.w)}" y="${(+y(q.d) + 3.5).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="800" fill="#1A232D" font-family="sans-serif">${p.number}</text>` : ''}`; });
    svg.innerHTML = s;
    const t = host.querySelector('#inLineTxt'); if (t) t.textContent = team.tactics.lineHeight < 0.35 ? 'A deep line: they sit close to their own goal.' : team.tactics.lineHeight > 0.65 ? 'A high line: they push up towards halfway and leave space behind.' : 'A medium line.';
  }

  // Instructions come in two kinds. General ones are how you always want the team to play and are kept from match to match. Game ones are for the next
  // match only (usually because of who you are playing): they carry a `game` mark and are removed once that match has been played.
  const SCOPES = {
    general: { title: 'General instructions', sub: 'How you always want the team to play in this stage. They stay for every match.', empty: 'None yet. Everyone plays to their role and the team settings until you add some.' },
    game: { title: 'This game', sub: 'Only for the next match, and removed once it has been played.', empty: 'None for this game yet. Use this for things that suit this opponent.' },
  };
  FM.isGameRule = (r) => !!(r && r.game);

  // opts.stage: the stage of play this box is for. Everything written in it applies to that stage only.
  FM.renderInstructions = function (host, team, hooks, opts) {
    opts = opts || {};
    const stage = opts.stage || null, key = stage || 'all';
    const stateOf = (scope) => states[key + ':' + scope] || (states[key + ':' + scope] = { text: '', busy: false, err: '', draft: null, added: '', collapsed: false, listOpen: true });
    const head = stateOf('general');
    if (stage && head.collapsed) {
      host.innerHTML = `<button type="button" class="in-reopen" id="inReopen">Show instructions for ${esc(STAGE_NAME[stage])}</button>`;
      host.querySelector('#inReopen').addEventListener('click', () => { head.collapsed = false; FM.renderInstructions(host, team, hooks, opts); });
      return;
    }
    team.rules = team.rules || [];
    const roster = setRoster(team, hooks);
    const oppName = roster.oppTeam ? (roster.oppTeam.name || roster.oppTeam.shortName || '') : '';
    const inStage = (r) => !stage || (r.when && r.when.stage && r.when.stage.indexOf(stage) >= 0);
    const everyStage = stage ? team.rules.filter((r) => !(r.when && r.when.stage) && !FM.isGameRule(r)) : [];
    const card = (r) => `<div class="in-rule${r.off ? ' off' : ''}">
        <label class="in-sw"><input type="checkbox" data-toggle="${r.id}"${r.off ? '' : ' checked'} aria-label="Instruction on or off"><i></i></label>
        <div class="in-rt"><small class="in-who">${esc(FM.rulesWho(r))}</small><b>${esc(FM.rulesText(r))}</b></div>
        <button type="button" class="in-move" data-move="${r.id}" title="${FM.isGameRule(r) ? 'Keep this for every match' : 'Use this for the next game only'}">${FM.isGameRule(r) ? 'Make general' : 'Move to this game'}</button>
        <button type="button" class="in-del" data-del="${r.id}" aria-label="Delete this instruction">×</button></div>`;
    const box = (scope) => {
      const st = stateOf(scope), S = SCOPES[scope];
      const rules = team.rules.filter((r) => inStage(r) && (scope === 'game' ? FM.isGameRule(r) : !FM.isGameRule(r)));
      const label = scope === 'game'
        ? `Tell the team how to play${stage ? ' in ' + STAGE_NAME[stage] : ''}, just for this game${oppName ? ' against ' + esc(oppName) : ''}`
        : (stage ? 'Tell the team how to play in ' + STAGE_NAME[stage] : 'Tell the team how to play');
      return `<section class="in-scope in-scope-${scope}" aria-label="${esc(S.title)}">
        <div class="in-head"><h2>${esc(S.title)}${rules.length ? ' (' + rules.filter((r) => !r.off).length + ')' : ''}</h2><p class="in-note">${esc(S.sub)}</p></div>
        <div class="in-add"><div class="in-body">
          <label class="in-lab" for="inText_${scope}">${label} <small>(applies to this stage only)</small></label>
          <textarea id="inText_${scope}" data-scope="${scope}" maxlength="3000" rows="${scope === 'game' ? 6 : 8}" placeholder="Write as much as you like, about any players, ours or theirs.&#10;&#10;e.g. ${esc(STAGE_EG[stage] || STAGE_EG.build)}">${esc(st.text)}</textarea>
          <div class="in-act"><button type="button" class="in-go" data-understand="${scope}"${st.busy ? ' disabled' : ''}>${st.busy ? 'Reading it…' : 'Turn this into instructions'}</button><span class="in-note">LastMind reads it once and shows you what it understood before anything is added. Names or shirt numbers both work. Anything you do not mention stays as the game would play it.</span></div>
          ${st.err ? `<p class="in-err">${esc(st.err)}</p>` : ''}
          ${st.draft ? `<div class="in-draft"><h4>Here is how I understood it</h4>${st.draft.rules.length ? st.draft.rules.map((r) => `<div class="in-rule"><div class="in-rt"><small class="in-who">${esc(FM.rulesWho(r))}</small><b>${esc(FM.rulesText(r))}</b></div></div>`).join('') : '<p class="in-note">I could not turn that into anything the game can run.</p>'}
            ${st.draft.notIncluded.length ? `<div class="in-ni"><b>Not included</b><ul>${st.draft.notIncluded.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''}
            <div class="in-act">${st.draft.rules.length ? '<button type="button" class="in-go" data-add="' + scope + '">Add ' + (st.draft.rules.length > 1 ? 'these ' + st.draft.rules.length : 'this') + '</button>' : ''}<button type="button" class="in-ghost" data-drop="${scope}">Change the wording</button></div></div>` : ''}
        </div></div>
        ${st.added ? `<p class="in-ok" role="status">${esc(st.added)}</p>` : ''}
        <button type="button" class="in-listbar" data-list="${scope}" aria-expanded="${st.listOpen ? 'true' : 'false'}"><span>${st.listOpen ? 'Hide' : 'Show'} the list${rules.length ? ' (' + rules.length + ')' : ''}</span><i aria-hidden="true">${st.listOpen ? '▴' : '▾'}</i></button>
        <div class="in-list"${st.listOpen ? '' : ' hidden'}>${rules.length ? rules.map(card).join('') : `<p class="in-empty">${esc(S.empty)}</p>`}</div>
      </section>`;
    };
    host.innerHTML = `<div class="in-wrap"><div class="in-main">
        ${stage ? '<div class="in-panel-bar"><button type="button" class="in-panel-close" id="inPanelClose" aria-label="Close instructions" title="Close instructions">×</button></div>' : ''}
        ${box('general')}
        ${everyStage.length ? `<div class="in-inh"><b>Instructions that apply in every stage</b>${everyStage.map((r) => `<div>${esc(FM.rulesWho(r))}: ${esc(FM.rulesText(r))} <button type="button" class="in-link" data-del="${r.id}">remove</button></div>`).join('')}</div>` : ''}
        ${box('game')}
        ${stage === 'without' ? lineCard(team) : ''}
      </div></div>`;
    const q = (s) => host.querySelector(s), qa = (s) => host.querySelectorAll(s);
    const redraw = () => FM.renderInstructions(host, team, hooks, opts);
    const touched = () => { if (hooks.save) hooks.save(); if (hooks.changed) hooks.changed(); };
    const close = q('#inPanelClose'); if (close) close.addEventListener('click', () => { head.collapsed = true; redraw(); });
    qa('[data-toggle]').forEach((c) => c.addEventListener('change', () => { const r = team.rules.find((x) => x.id === c.dataset.toggle); if (r) { r.off = !c.checked; touched(); redraw(); } }));
    qa('[data-list]').forEach((b) => b.addEventListener('click', () => { const st = stateOf(b.dataset.list); st.listOpen = !st.listOpen; redraw(); }));
    qa('[data-move]').forEach((b) => b.addEventListener('click', () => {
      const r = team.rules.find((x) => x.id === b.dataset.move); if (!r) return;
      if (FM.isGameRule(r)) delete r.game; else r.game = { vs: roster.oppTeam ? String(roster.oppTeam.id || '') : '', name: oppName };
      stateOf('general').added = ''; stateOf('game').added = ''; touched(); redraw();
    }));
    qa('[data-del]').forEach((b) => b.addEventListener('click', () => { team.rules = team.rules.filter((x) => x.id !== b.dataset.del); stateOf('general').added = ''; stateOf('game').added = ''; touched(); redraw(); }));
    const line = q('#inLine');
    if (line) { paintLine(host, team); let timer = 0; line.addEventListener('input', () => { FM.shiftLine(team, team.tactics.lineHeight, +line.value); team.tactics.lineHeight = +line.value; paintLine(host, team); clearTimeout(timer); timer = setTimeout(touched, 400); }); }
    qa('textarea[data-scope]').forEach((ta) => ta.addEventListener('input', () => { stateOf(ta.dataset.scope).text = ta.value; }));
    qa('[data-understand]').forEach((u) => u.addEventListener('click', async () => {
      const scope = u.dataset.understand, st = stateOf(scope), ta = q('#inText_' + scope);
      const text = (ta.value || '').trim(); st.text = text; st.err = ''; st.draft = null; st.added = '';
      if (text.length < 3) { st.err = 'Write the instructions first.'; return redraw(); }
      st.busy = true; redraw();
      try {
        const out = await FM.api('/football/compile-instruction', { text, stage, squad: FM.squadOf(team), opponent: roster.oppTeam ? FM.squadOf(roster.oppTeam) : [] });
        const nums = roster.own.map((p) => p.number);
        const game = scope === 'game' ? { vs: roster.oppTeam ? String(roster.oppTeam.id || '') : '', name: oppName } : null;
        st.draft = { rules: (out.rules || []).map((r) => FM.rulesClean(Object.assign({}, r, { text: r.text || r.summary || text, source: 'ai' }, game ? { game } : {}, stage ? { when: Object.assign({}, r.when, { stage: [stage] }) } : {}), nums)).filter(Boolean), notIncluded: out.notIncluded || [] };
      } catch (err) { st.err = err.message || 'LastMind could not read that just now.'; }
      st.busy = false; redraw();
    }));
    qa('[data-add]').forEach((ad) => ad.addEventListener('click', () => {
      const st = stateOf(ad.dataset.add), rs = st.draft.rules; st.draft = null; st.text = '';
      rs.forEach((r) => team.rules.push(r)); st.added = rs.length === 1 ? 'Added.' : rs.length + ' instructions added.';
      if (hooks.save) hooks.save(); if (hooks.afterAdd) hooks.afterAdd(); else if (hooks.changed) hooks.changed(); redraw();
    }));
    qa('[data-drop]').forEach((dd) => dd.addEventListener('click', () => { stateOf(dd.dataset.drop).draft = null; redraw(); }));
    FM.instrBox = { fill(text) { const st = stateOf('general'); st.text = text; redraw(); const t = host.querySelector('#inText_general'); if (t) { t.focus(); t.setSelectionRange(text.length, text.length); } } };
  };
})();
