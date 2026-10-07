// The Instructions tab, and the instructions panel on the tactics board. You write an instruction in your own words, for the whole team, a line
// (goalkeeper, defence, midfield, attack), a position, or one player on a stage of play; LastMind turns it into rules the match engine understands
// (see rules.js and the backend route /football/compile-instruction), shows you what it understood, and only then adds it. Anything you did not
// say stays as the game would play it anyway.
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const R = () => FM.RULES;
  const states = {};
  const same = (a, b) => a.kind === b.kind && (a.line || a.group || a.number || '') === (b.line || b.group || b.number || '');
  const surname = (p) => p.name.split(' ').slice(1).join(' ') || p.name;
  const groupLabel = { GK: 'Goalkeeper', CB: 'Centre-back', FB: 'Full-back', DM: 'Defensive midfielder', CM: 'Central midfielder', AM: 'Attacking midfielder', WF: 'Winger', ST: 'Striker' };
  const everyone = (t) => { const seen = {}, out = []; (t.squad || []).concat(t.players || [], t.bench || []).forEach((p) => { if (p && !seen[p.number]) { seen[p.number] = 1; out.push(p); } }); return out; };

  // The shirt numbers and names of both clubs, so a rule can be shown by name and a name written by the manager finds its number.
  function setRoster(team, hooks) {
    const own = {}, opp = {};
    everyone(team).forEach((p) => { own[p.number] = p.name; });
    const o = hooks && hooks.opp ? hooks.opp() : null;
    if (o) everyone(o).forEach((p) => { opp[p.number] = p.name; });
    FM.rulesRoster = { own, opp };
    return { own: everyone(team), opp: o ? everyone(o) : [] };
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

  // opts: { key, compact, scope, stage }. On the tab you choose who it is for; on the board it is one player, for the stage that board shows.
  FM.renderInstructions = function (host, team, hooks, opts) {
    opts = opts || {};
    const compact = !!opts.compact, stage = opts.stage || null, key = opts.key || 'tab';
    const st = states[key] || (states[key] = { scope: { kind: 'team' }, text: '', busy: false, err: '', draft: null, added: '' });
    if (compact) st.scope = opts.scope;
    team.rules = team.rules || [];
    const roster = setRoster(team, hooks);
    const players = team.players.slice().sort((a, b) => a.number - b.number);
    const countFor = (scope) => team.rules.filter((r) => !r.off && same(r.scope, scope)).length;
    const scopes = [{ kind: 'team' }, ...Object.keys(R().LINES).map((l) => ({ kind: 'line', line: l }))];
    const positions = R().GROUPS.filter((g) => g !== 'GK').map((g) => ({ kind: 'group', group: g }));
    const scopeLabel = (s) => (s.kind === 'team' ? 'Whole team' : s.kind === 'line' ? R().LINE_WORD[s.line].replace(/^the /, '').replace(/^./, (c) => c.toUpperCase()) : s.kind === 'group' ? groupLabel[s.group] : (() => { const p = players.find((q) => q.number === s.number); return p ? p.name + ' (#' + p.number + ')' : '#' + s.number; })());
    const who = (s) => {
      if (s.kind === 'team') return 'Applies to all ' + players.length + ' players on the pitch.';
      if (s.kind === 'line' || s.kind === 'group') return 'Applies to ' + players.filter((p) => R().scopeMatches(s, p)).map((p) => esc(surname(p))).join(', ') + '.';
      const p = players.find((q) => q.number === s.number); return p ? esc(groupLabel[p.group] + ', ' + (p.roleId || '').replace(/_/g, ' ')) + '.' : '';
    };
    const inherited = () => {
      if (st.scope.kind === 'team') return [];
      const target = st.scope.kind === 'player' ? players.find((q) => q.number === st.scope.number) : st.scope.kind === 'line' || st.scope.kind === 'group' ? players.find((q) => R().scopeMatches(st.scope, q)) : null;
      return team.rules.filter((r) => !r.off && !same(r.scope, st.scope) && (r.scope.kind === 'team' || (target && R().scopeMatches(r.scope, target) && (st.scope.kind === 'player' || r.scope.kind === 'line'))));
    };
    const ruleCard = (r) => `<div class="in-rule${r.off ? ' off' : ''}">
        <label class="in-sw"><input type="checkbox" data-toggle="${r.id}"${r.off ? '' : ' checked'} aria-label="Instruction on or off"><i></i></label>
        <div class="in-rt"><b>${esc(FM.rulesText(r))}</b>${r.source === 'ai' && r.text && r.text !== FM.rulesText(r) ? `<small>You wrote: ${esc(r.text)}</small>` : ''}</div>
        <button type="button" class="in-del" data-del="${r.id}" aria-label="Delete this instruction">×</button></div>`;
    const forStage = (r) => !stage || (r.when && r.when.stage && r.when.stage.indexOf(stage) >= 0);
    const mine = team.rules.filter((r) => same(r.scope, st.scope) && (!compact || forStage(r)));
    const everyStage = compact && stage ? team.rules.filter((r) => same(r.scope, st.scope) && !(r.when && r.when.stage)) : [];
    const playerRules = compact ? [] : team.rules.filter((r) => r.scope.kind === 'player');
    const inh = inherited();
    const side = `<aside class="in-side" aria-label="Who the instruction is for"><h3>Who</h3>
        ${scopes.map((s) => `<button type="button" class="in-sc${same(s, st.scope) ? ' on' : ''}" data-scope='${JSON.stringify(s)}'><span>${esc(scopeLabel(s))}</span>${countFor(s) ? `<em>${countFor(s)}</em>` : ''}</button>`).join('')}
        <h3>Positions</h3>
        ${positions.map((sc) => `<button type="button" class="in-sc${same(sc, st.scope) ? ' on' : ''}" data-scope='${JSON.stringify(sc)}'><span>${esc(scopeLabel(sc))}</span>${countFor(sc) ? `<em>${countFor(sc)}</em>` : ''}</button>`).join('')}
      </aside>`;
    const examples = st.scope.kind === 'team' ? 'Play out from the back, but when they press high go long to the striker' : st.scope.kind === 'player' ? 'Stay wide with the ball, and when it is on the other side tuck in' : 'When pressed in our own third, play it to the nearest midfielder, not long';
    const composer = `<div class="in-add"><div class="in-body">
        <label class="in-lab" for="inText">Write the instruction${compact ? ' for ' + esc(scopeLabel(st.scope)) : ''}</label>
        <textarea id="inText" maxlength="600" rows="4" placeholder="e.g. ${esc(examples)}. Use names or shirt numbers, ours or theirs.">${esc(st.text)}</textarea>
        <div class="in-act"><button type="button" class="in-go" id="inUnderstand"${st.busy ? ' disabled' : ''}>${st.busy ? 'Reading it…' : 'Turn this into an instruction'}</button><span class="in-note">LastMind reads it once and shows you what it understood before anything is added. Anything you do not mention stays as the game would play it.</span></div>
        ${st.err ? `<p class="in-err">${esc(st.err)}</p>` : ''}
        ${st.draft ? `<div class="in-draft"><h4>Here is how I understood it</h4>${st.draft.rules.length ? st.draft.rules.map((r) => `<div class="in-rule"><div class="in-rt"><b>${esc(FM.rulesWho(r))}: ${esc(FM.rulesText(r))}</b></div></div>`).join('') : '<p class="in-note">I could not turn that into anything the game can do.</p>'}
          ${st.draft.notIncluded.length ? `<div class="in-ni"><b>Not included</b><ul>${st.draft.notIncluded.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''}
          <div class="in-act">${st.draft.rules.length ? '<button type="button" class="in-go" id="inAddDraft">Add ' + (st.draft.rules.length > 1 ? 'these' : 'this') + '</button>' : ''}<button type="button" class="in-ghost" id="inDropDraft">Change the wording</button></div></div>` : ''}
      </div></div>`;
    host.innerHTML = `<div class="in-wrap${compact ? ' compact' : ''}">${compact ? '' : side}<div class="in-main">
        ${compact ? '' : `<div class="in-head"><h2>${esc(scopeLabel(st.scope))}</h2><p>${who(st.scope)}</p></div>`}
        ${!compact && st.scope.kind === 'line' && st.scope.line === 'defence' ? lineCard(team) : ''}
        ${inh.length ? `<div class="in-inh"><b>Also reaching ${esc(scopeLabel(st.scope))}</b>${inh.map((r) => `<div><b>${esc(FM.rulesWho(r))}:</b> ${esc(FM.rulesText(r))}</div>`).join('')}</div>` : ''}
        <div class="in-list">${mine.length ? mine.map(ruleCard).join('') : `<p class="in-empty">${compact ? 'No instructions for this player' + (stage ? ' at this stage' : '') + ' yet. He plays to his role and the team settings.' : 'No instructions here yet. Everyone plays to their role and the team settings until you add some.'}</p>`}</div>
        ${everyStage.length ? `<div class="in-inh"><b>Also in every stage</b>${everyStage.map((r) => `<div>${esc(FM.rulesText(r))} <button type="button" class="in-link" data-del="${r.id}">remove</button></div>`).join('')}</div>` : ''}
        ${st.added ? `<p class="in-ok" role="status">${esc(st.added)}</p>` : ''}
        ${composer}
        ${playerRules.length ? `<div class="in-pl"><h3>Instructions given to individual players</h3><p class="in-note">These are set by clicking a player's shirt on the tactics board, for one stage at a time.</p>${playerRules.map((r) => { const p = players.find((q) => q.number === r.scope.number); return `<div class="in-rule${r.off ? ' off' : ''}"><label class="in-sw"><input type="checkbox" data-toggle="${r.id}"${r.off ? '' : ' checked'} aria-label="On or off"><i></i></label><div class="in-rt"><b>${esc(p ? p.name + ' (#' + p.number + ')' : 'Player #' + r.scope.number)}</b><small>${esc(FM.rulesText(r))}</small></div><button type="button" class="in-del" data-del="${r.id}" aria-label="Delete">×</button></div>`; }).join('')}</div>` : ''}
      </div></div>`;
    wire(host, team, hooks, st, opts, roster, () => FM.renderInstructions(host, team, hooks, opts));
  };

  function addRules(team, hooks, rules, st, opts) {
    const numbers = team.players.concat(team.bench || []).map((p) => p.number);
    let n = 0;
    rules.forEach((r) => {
      if (opts && opts.stage) r.when = Object.assign({}, r.when, { stage: [opts.stage] });
      if (opts && opts.compact) r.scope = opts.scope;
      const c = FM.rulesClean(r, numbers); if (c) { team.rules.push(c); n++; }
    });
    st.added = n ? (n === 1 ? 'Added.' : n + ' instructions added.') : 'Nothing could be added.';
    if (hooks.save) hooks.save();
  }

  function wire(host, team, hooks, st, opts, roster, redraw) {
    const q = (s) => host.querySelector(s), qa = (s) => host.querySelectorAll(s);
    qa('[data-scope]').forEach((b) => b.addEventListener('click', () => { st.scope = JSON.parse(b.dataset.scope); st.added = ''; st.draft = null; st.err = ''; redraw(); }));
    qa('[data-toggle]').forEach((c) => c.addEventListener('change', () => { const r = team.rules.find((x) => x.id === c.dataset.toggle); if (r) { r.off = !c.checked; if (hooks.save) hooks.save(); redraw(); } }));
    qa('[data-del]').forEach((b) => b.addEventListener('click', () => { team.rules = team.rules.filter((x) => x.id !== b.dataset.del); st.added = ''; if (hooks.save) hooks.save(); redraw(); }));
    const line = q('#inLine');
    if (line) { paintLine(host, team); let timer = 0; line.addEventListener('input', () => { team.tactics.lineHeight = +line.value; paintLine(host, team); clearTimeout(timer); timer = setTimeout(() => { if (hooks.save) hooks.save(); }, 300); }); }
    const ta = q('#inText'); if (ta) ta.addEventListener('input', () => { st.text = ta.value; });
    const u = q('#inUnderstand');
    if (u) u.addEventListener('click', async () => {
      const text = (ta.value || '').trim(); st.text = text; st.err = ''; st.draft = null; st.added = '';
      if (text.length < 3) { st.err = 'Write the instruction first.'; return redraw(); }
      st.busy = true; redraw();
      try {
        const out = await FM.api('/football/compile-instruction', {
          text, scope: st.scope,
          squad: roster.own.map((p) => ({ number: p.number, name: p.name, group: p.group || p.natural, role: (p.roleId || '').replace(/_/g, ' ') })),
          opponent: roster.opp.map((p) => ({ number: p.number, name: p.name })),
        });
        const numbers = roster.own.map((p) => p.number);
        const rules = (out.rules || []).map((r) => FM.rulesClean(Object.assign({}, r, { text, source: 'ai' }, opts && opts.compact ? { scope: opts.scope } : {}), numbers)).filter(Boolean);
        st.draft = { rules, notIncluded: out.notIncluded || [] };
      } catch (err) { st.err = err.message || 'LastMind could not read that just now.'; }
      st.busy = false; redraw();
    });
    const ad = q('#inAddDraft'); if (ad) ad.addEventListener('click', () => { const rs = st.draft.rules; st.draft = null; st.text = ''; addRules(team, hooks, rs, st, opts); redraw(); });
    const dd = q('#inDropDraft'); if (dd) dd.addEventListener('click', () => { st.draft = null; redraw(); });
  }
})();
