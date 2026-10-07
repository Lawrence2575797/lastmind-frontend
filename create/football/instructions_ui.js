// The Instructions tab: one large box in which you tell the team how to play, in your own words, about any players of either club, any line or the
// whole team, for any stage of play. LastMind turns the text into rules the match engine runs (see rules.js and the backend route
// /football/compile-instruction), shows you what it understood, and only then adds it. Beneath it are all your instructions in one list, and the
// assistant, on the right, draws what they do on the pitch and tells you where they clash and what to try next (see elena.js).
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const st = { text: '', busy: false, err: '', draft: null, added: '' };
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

  FM.renderInstructions = function (host, team, hooks) {
    team.rules = team.rules || [];
    const roster = setRoster(team, hooks);
    const rules = team.rules;
    const card = (r) => `<div class="in-rule${r.off ? ' off' : ''}">
        <label class="in-sw"><input type="checkbox" data-toggle="${r.id}"${r.off ? '' : ' checked'} aria-label="Instruction on or off"><i></i></label>
        <div class="in-rt"><small class="in-who">${esc(FM.rulesWho(r))}</small><b>${esc(FM.rulesText(r))}</b></div>
        <button type="button" class="in-del" data-del="${r.id}" aria-label="Delete this instruction">×</button></div>`;
    host.innerHTML = `<div class="in-wrap"><div class="in-main">
        <div class="in-add"><div class="in-body">
          <label class="in-lab" for="inText">Tell the team how to play</label>
          <textarea id="inText" maxlength="3000" rows="9" placeholder="Write as much as you like, about any players, ours or theirs, in any stage of play.&#10;&#10;e.g. Sarpong stays level with Thorne and very central, to draw their left attacking midfielder in. When we are pressed in our own third the defenders never go long: they play to the nearest midfielder. In the second half, if we are winning, Shin does not go past halfway.">${esc(st.text)}</textarea>
          <div class="in-act"><button type="button" class="in-go" id="inUnderstand"${st.busy ? ' disabled' : ''}>${st.busy ? 'Reading it…' : 'Turn this into instructions'}</button><span class="in-note">LastMind reads it once and shows you what it understood before anything is added. Names or shirt numbers both work. Anything you do not mention stays as the game would play it.</span></div>
          ${st.err ? `<p class="in-err">${esc(st.err)}</p>` : ''}
          ${st.draft ? `<div class="in-draft"><h4>Here is how I understood it</h4>${st.draft.rules.length ? st.draft.rules.map((r) => `<div class="in-rule"><div class="in-rt"><small class="in-who">${esc(FM.rulesWho(r))}</small><b>${esc(FM.rulesText(r))}</b></div></div>`).join('') : '<p class="in-note">I could not turn that into anything the game can run.</p>'}
            ${st.draft.notIncluded.length ? `<div class="in-ni"><b>Not included</b><ul>${st.draft.notIncluded.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''}
            <div class="in-act">${st.draft.rules.length ? '<button type="button" class="in-go" id="inAddDraft">Add ' + (st.draft.rules.length > 1 ? 'these ' + st.draft.rules.length : 'this') + '</button>' : ''}<button type="button" class="in-ghost" id="inDropDraft">Change the wording</button></div></div>` : ''}
        </div></div>
        ${st.added ? `<p class="in-ok" role="status">${esc(st.added)}</p>` : ''}
        <div class="in-head"><h2>Your instructions${rules.length ? ' (' + rules.filter((r) => !r.off).length + ')' : ''}</h2></div>
        <div class="in-list">${rules.length ? rules.map(card).join('') : '<p class="in-empty">None yet. Everyone plays to their role and the team settings until you add some.</p>'}</div>
        ${lineCard(team)}
      </div></div>`;
    const q = (s) => host.querySelector(s), qa = (s) => host.querySelectorAll(s);
    const redraw = () => FM.renderInstructions(host, team, hooks);
    qa('[data-toggle]').forEach((c) => c.addEventListener('change', () => { const r = rules.find((x) => x.id === c.dataset.toggle); if (r) { r.off = !c.checked; if (hooks.save) hooks.save(); if (hooks.changed) hooks.changed(); redraw(); } }));
    qa('[data-del]').forEach((b) => b.addEventListener('click', () => { team.rules = rules.filter((x) => x.id !== b.dataset.del); st.added = ''; if (hooks.save) hooks.save(); if (hooks.changed) hooks.changed(); redraw(); }));
    const line = q('#inLine');
    if (line) { paintLine(host, team); let timer = 0; line.addEventListener('input', () => { team.tactics.lineHeight = +line.value; paintLine(host, team); clearTimeout(timer); timer = setTimeout(() => { if (hooks.save) hooks.save(); if (hooks.changed) hooks.changed(); }, 400); }); }
    const ta = q('#inText'); if (ta) ta.addEventListener('input', () => { st.text = ta.value; });
    const u = q('#inUnderstand');
    if (u) u.addEventListener('click', async () => {
      const text = (ta.value || '').trim(); st.text = text; st.err = ''; st.draft = null; st.added = '';
      if (text.length < 3) { st.err = 'Write the instructions first.'; return redraw(); }
      st.busy = true; redraw();
      try {
        const out = await FM.api('/football/compile-instruction', { text, squad: FM.squadOf(team), opponent: roster.oppTeam ? FM.squadOf(roster.oppTeam) : [] });
        const nums = roster.own.map((p) => p.number);
        st.draft = { rules: (out.rules || []).map((r) => FM.rulesClean(Object.assign({}, r, { text: r.text || r.summary || text, source: 'ai' }), nums)).filter(Boolean), notIncluded: out.notIncluded || [] };
      } catch (err) { st.err = err.message || 'LastMind could not read that just now.'; }
      st.busy = false; redraw();
    });
    const ad = q('#inAddDraft');
    if (ad) ad.addEventListener('click', () => {
      const rs = st.draft.rules; st.draft = null; st.text = '';
      rs.forEach((r) => team.rules.push(r)); st.added = rs.length === 1 ? 'Added.' : rs.length + ' instructions added.';
      if (hooks.save) hooks.save(); if (hooks.afterAdd) hooks.afterAdd(); else if (hooks.changed) hooks.changed(); redraw();
    });
    const dd = q('#inDropDraft'); if (dd) dd.addEventListener('click', () => { st.draft = null; redraw(); });
    FM.instrBox = { fill(text) { st.text = text; redraw(); const t = host.querySelector('#inText'); if (t) { t.focus(); t.setSelectionRange(text.length, text.length); } } };
  };
})();
