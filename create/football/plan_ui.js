// The tactics pages for the plan (plan.js): one page for each phase of play. Players can be dragged on them to where they should stand. Each page has
//   the pitch        the players as cards where this phase puts them; pick a card to give that player instructions for the phase
//   team approach    a few plain choices for the whole team in this phase
//   player           that player's role and his choices for this phase
//   pitch plans      zones (an area tagged "press here", "play safe here"...) and triggers ("when the ball goes to their full-back, the wingers press"),
//                    both made from menus, and each shown back as a sentence
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const PW = 700, PH = 682;   // the same wide shape the squad board has, so a circle is the same size against the pitch there and here
  const TAB_PHASES = { build: ['build'], midfield: ['midfield'], final: ['final'], transdef: ['transDef'], organised: ['defence', 'press'], transatt: ['transAtt'] };
  const SIDE_OF = { build: 'with', midfield: 'with', final: 'with', transAtt: 'with', transDef: 'without', defence: 'without', press: 'without' };
  const TAG_COL = { press: '#FF6B4A', sit: '#9FB0BF', protect: '#5EA8FF', safe: '#6FD08C', risk: '#FFA94D', overload: '#B58CFF', target: '#FFD54A', switch: '#4FD1C5', keep: '#B8E986' };
  const UI = { sel: null, mode: 'view', cells: [], sub: null, draft: {}, openTog: {}, showOpp: false };
  const sname = (p) => { const n = p.name.split(' ').slice(1).join(' ') || p.name; return n.length > 11 ? n.slice(0, 10) + '.' : n; };

  // ---------- the pitch ----------
  function pitchSvg(team, ph, hooks) {
    const eng = FM.planPhase(ph).eng[0], pl = FM.planGet(team), kit = team.kit || { shirt: '#244', number: '#fff' };
    const X = (w) => (w * PW).toFixed(1), Y = (d) => ((1 - d) * PH).toFixed(1);
    let s = `<rect width="${PW}" height="${PH}" rx="6" fill="#2F7D3F"/>`;
    for (let i = 0; i < 10; i++) if (i % 2) s += `<rect y="${i * PH / 10}" width="${PW}" height="${PH / 10}" fill="#000" fill-opacity=".05"/>`;
    const mx = PW / 68, my = PH / 105;   // metres to drawing units across and along
    s += `<g fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2"><rect x="2" y="2" width="${PW - 4}" height="${PH - 4}"/><line x1="2" y1="${PH / 2}" x2="${PW - 2}" y2="${PH / 2}"/><ellipse cx="${PW / 2}" cy="${PH / 2}" rx="${(9.15 * mx).toFixed(1)}" ry="${(9.15 * my).toFixed(1)}"/>
      <rect x="${(PW / 2 - 20.15 * mx).toFixed(1)}" y="${(PH - 16.5 * my).toFixed(1)}" width="${(40.3 * mx).toFixed(1)}" height="${(16.5 * my - 2).toFixed(1)}"/><rect x="${(PW / 2 - 20.15 * mx).toFixed(1)}" y="2" width="${(40.3 * mx).toFixed(1)}" height="${(16.5 * my).toFixed(1)}"/>
      <rect x="${(PW / 2 - 9.15 * mx).toFixed(1)}" y="${(PH - 5.5 * my).toFixed(1)}" width="${(18.3 * mx).toFixed(1)}" height="${(5.5 * my - 2).toFixed(1)}"/><rect x="${(PW / 2 - 9.15 * mx).toFixed(1)}" y="2" width="${(18.3 * mx).toFixed(1)}" height="${(5.5 * my).toFixed(1)}"/></g>`;
    // zones of this page
    pl.zones.filter((z) => z.on !== false && (z.phase === ph || (!z.phase || z.phase === 'any') && FM.PLAN_ZONE_TAG[z.tag] && FM.PLAN_ZONE_TAG[z.tag].side === SIDE_OF[ph])).forEach((z) => {
      (z.cells || []).forEach((c) => { const dp = FM.PLAN_DEPTHS[c[0]], ch = FM.PLAN_CHANNELS[c[1]], col = TAG_COL[z.tag] || '#fff'; s += `<rect x="${X(ch.lo)}" y="${Y(dp.hi)}" width="${(ch.hi - ch.lo) * PW}" height="${(dp.hi - dp.lo) * PH}" fill="${col}" fill-opacity=".24" stroke="${col}" stroke-width="2" stroke-dasharray="6 4"/>`; });
      const c0 = (z.cells || [])[0]; if (c0) { const dp = FM.PLAN_DEPTHS[c0[0]], ch = FM.PLAN_CHANNELS[c0[1]]; s += `<text x="${(+X(ch.lo) + 6).toFixed(0)}" y="${(+Y(dp.hi) + 16).toFixed(0)}" font-size="16" font-weight="800" fill="#fff" stroke="#000" stroke-width="4" style="paint-order:stroke">${esc((FM.PLAN_ZONE_TAG[z.tag] || {}).name || '')}</text>`; }
    });
    pl.triggers.filter((t) => t.on !== false && t.cells && t.cells.length && (FM.PLAN_WHEN_BY[t.when] || {}).side === SIDE_OF[ph]).forEach((t) => (t.cells || []).forEach((c) => { const dp = FM.PLAN_DEPTHS[c[0]], ch = FM.PLAN_CHANNELS[c[1]]; s += `<rect x="${X(ch.lo)}" y="${Y(dp.hi)}" width="${(ch.hi - ch.lo) * PW}" height="${(dp.hi - dp.lo) * PH}" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="2 5"/>`; }));
    // the opposition as scouted for the next match: where they stand in the phase that answers this one
    const od = UI.showOpp && hooks.opp ? hooks.opp(eng) : null;
    // Nobody is drawn offside. Where they have the ball (we are defending), their attackers stand no nearer our goal than our second-last defender (on the line, never beyond it);
    // where we have it, our attackers stand no nearer their goal than their second-last defender. Positions placed by hand are left as they were put.
    const theyAttack = ['without', 'withoutEnd', 'press', 'transDef', 'transDefEnd'].indexOf(eng) >= 0, weAttack = ['build', 'buildEnd', 'midfield', 'final', 'transAtt', 'transAttEnd'].indexOf(eng) >= 0;
    let ourLine = null, theirLine = null;
    if (od) {
      const ours = team.players.map((p) => FM.phasePos(team, p, eng).d).sort((a, b) => a - b); ourLine = ours.length > 1 ? ours[1] : null;           // second-last of ours (our goalkeeper is the last)
      const theirs = Object.keys(od.cells).map((k) => 1 - od.cells[k].d).sort((a, b) => b - a); theirLine = theirs.length > 1 ? theirs[1] : null;  // second-last of theirs, in our space
    }
    if (od) {
      Object.keys(od.cells).forEach((slot) => {
        let c = od.cells[slot];
        const op = od.opp.players.find((q) => q.slotKey === slot);
        if (theyAttack && ourLine != null && op && op.group !== 'GK' && 1 - c.d < ourLine) c = { d: 1 - Math.min(0.97, ourLine + 0.012), w: c.w };
        const pl2 = op, nm = pl2 ? sname(pl2) : slot, x = (1 - c.w) * PW, y = c.d * PH;
        s += `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})" pointer-events="none"><circle r="14" fill="${od.kit.shirt}" fill-opacity=".9" stroke="${od.kit.number}" stroke-width="1.8" stroke-dasharray="3 2"/><text y="3.5" text-anchor="middle" font-size="10" font-weight="700" fill="${od.kit.number}">${pl2 ? pl2.number : ''}</text></g>`;
      });
    }
    // the grid, when a zone is being chosen
    if (UI.mode === 'zone' || UI.mode === 'trigger') FM.PLAN_DEPTHS.forEach((dp) => FM.PLAN_CHANNELS.forEach((ch) => {
      const on = UI.cells.some((c) => c[0] === dp.k && c[1] === ch.k);
      s += `<rect class="pl-cell" data-cell="${dp.k},${ch.k}" x="${X(ch.lo)}" y="${Y(dp.hi)}" width="${(ch.hi - ch.lo) * PW}" height="${(dp.hi - dp.lo) * PH}" fill="${on ? '#FFD54A' : '#fff'}" fill-opacity="${on ? 0.38 : 0.04}" stroke="#fff" stroke-opacity=".35"/>`;
    }));
    // the players, as cards
    team.players.forEach((p) => {
      let q = FM.phasePos(team, p, eng);
      if (od && weAttack && theirLine != null && p.group !== 'GK' && !(FM.isManual && FM.isManual(team, p, eng)) && q.d > theirLine) q = { d: Math.max(0.02, theirLine - 0.012), w: q.w };
      const sel = UI.sel === p.slotKey, inj = FM.isInjured && FM.isInjured(p), nChoices = Object.keys(((pl.player[p.slotKey] || {})[ph]) || {}).length;
      const k = 0.72, r = 27 * k, rating = FM.playerRating ? FM.playerRating(p, p.group).toFixed(1) : '';
      s += `<g class="pl-card" data-slot="${esc(p.slotKey)}" transform="translate(${X(q.w)},${Y(q.d)})" style="cursor:pointer"><title>${esc(p.name + ' · ' + ((FM.ROLES[p.roleId] || {}).name || '') + ': ' + ((FM.ROLES[p.roleId] || {}).desc || ''))}</title><circle r="${(46 * k).toFixed(1)}" fill="transparent"/>
        <circle r="${r.toFixed(1)}" fill="${kit.shirt}" stroke="${sel ? '#F2C14E' : '#fff'}" stroke-width="${sel ? 4 : 2.3}"/>
        <text y="${(10 * k).toFixed(1)}" text-anchor="middle" font-size="${(25 * k).toFixed(1)}" font-weight="700" fill="${kit.number}">${p.number}</text>
        <text y="${(46 * k).toFixed(1)}" text-anchor="middle" font-size="${(20 * 0.9).toFixed(1)}" font-weight="700" fill="#fff" stroke="#000" stroke-width="3.4" style="paint-order:stroke">${esc(sname(p))}</text>
        <text y="${(66 * k).toFixed(1)}" text-anchor="middle" font-size="${(16 * 0.9).toFixed(1)}" fill="${inj ? '#FF9A9A' : '#cfe8cf'}" stroke="#000" stroke-width="2.6" style="paint-order:stroke">${inj ? 'injured' : rating}</text>
        ${FM.isManual && FM.isManual(team, p, eng) ? `<circle cx="${(-23 * k).toFixed(1)}" cy="${(-23 * k).toFixed(1)}" r="6.5" fill="#fff" stroke="#1A232D" stroke-width="1.5"/>` : ''}${nChoices ? `<circle cx="${(23 * k).toFixed(1)}" cy="${(-23 * k).toFixed(1)}" r="8" fill="#F2C14E" stroke="#1A232D" stroke-width="1.5"/><text x="${(23 * k).toFixed(1)}" y="${(-23 * k + 4).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="800" fill="#1A232D">${nChoices}</text>` : ''}</g>`;
    });
    return `<svg class="pl-pitch" viewBox="-26 -22 ${PW + 52} ${PH + 80}" role="img" aria-label="Where the team stands in this phase">${s}</svg>`;
  }

  // ---------- team approach ----------
  function teamPanel(team, ph) {
    const pl = FM.planGet(team);
    return (FM.PLAN_TEAM[ph] || []).map((t) => {
      const cur = (pl.team[ph] || {})[t.key], def = t.opts.some((x) => x.v === 'std') ? 'std' : t.opts[Math.floor(t.opts.length / 2)].v;
      return `<div class="pl-tog"><div class="pl-tog-h"><b>${esc(t.label)}</b>${t.help ? `<span class="pl-help">${esc(t.help)}</span>` : ''}</div>
        <div class="pl-seg" role="group">${t.opts.map((op) => `<button type="button" class="${(cur == null ? def : cur) === op.v ? 'on' : ''}" data-team-tog="${esc(t.key)}" data-v="${esc(op.v)}">${esc(op.label)}</button>`).join('')}</div></div>`;
    }).join('');
  }

  // ---------- zones and triggers ----------
  function planItems(team, ph) {
    const pl = FM.planGet(team), side = SIDE_OF[ph];
    const zs = pl.zones.filter((z) => z.phase === ph || ((!z.phase || z.phase === 'any') && (FM.PLAN_ZONE_TAG[z.tag] || {}).side === side));
    const ts = pl.triggers.filter((t) => (FM.PLAN_WHEN_BY[t.when] || {}).side === side && ((FM.PLAN_WHEN_BY[t.when] || {}).stage ? (FM.PLAN_WHEN_BY[t.when].stage === ph) : ph !== 'transAtt' && ph !== 'transDef'));
    const stat = (x) => { const st = pl.stats && pl.stats[x.id]; return st ? `<span class="pl-stat">${st.fires ? 'Came into play ' + st.fires + (st.fires === 1 ? ' time' : ' times') + ' in the last test (' + st.n + ' runs)' : 'Never came into play in the last test (' + st.n + ' runs)'}</span>` : ''; };
    const row = (kind, x, text) => `<li class="${x.on === false ? 'off' : ''}"><span class="pl-sent">${esc(text)}${stat(x)}</span><span class="pl-item-b"><button type="button" data-item-toggle="${kind}:${x.id}">${x.on === false ? 'Off' : 'On'}</button><button type="button" data-item-del="${kind}:${x.id}" aria-label="Remove">×</button></span></li>`;
    const list = zs.map((z) => row('zone', z, FM.planZoneText(z))).concat(ts.map((t) => row('trigger', t, FM.planTriggerText(t))));
    return list.length ? `<ul class="pl-items">${list.join('')}</ul>` : '<p class="pl-empty">Nothing marked on the pitch for this phase yet.</p>';
  }
  const sel = (id, opts, cur) => `<select id="${id}">${opts.map((o2) => `<option value="${esc(o2[0])}"${o2[0] === cur ? ' selected' : ''}>${esc(o2[1])}</option>`).join('')}</select>`;
  function builder(team, ph) {
    const side = SIDE_OF[ph], d = UI.draft;
    if (UI.mode === 'view') return `<div class="pl-add"><button type="button" data-mode="zone">+ Tag an area</button><button type="button" data-mode="trigger">+ Add a trigger</button></div>`;
    const cellsText = UI.cells.length ? FM.planCellsName(UI.cells) : 'none chosen: click squares on the pitch';
    if (UI.mode === 'zone') {
      const tags = FM.PLAN_ZONE_TAGS.filter((t) => t.side === side), tag = FM.PLAN_ZONE_TAG[d.tag] && FM.PLAN_ZONE_TAG[d.tag].side === side ? d.tag : tags[0].k, t = FM.PLAN_ZONE_TAG[tag];
      const preview = UI.cells.length ? FM.planZoneText({ tag, who: d.who || 'everyone', cells: UI.cells, phase: ph }) : '';
      return `<div class="pl-build"><h4>Tag an area</h4><p class="pl-help">Click the squares on the pitch that make up the area (${esc(cellsText)}).</p>
        <label>What it means ${sel('plTag', tags.map((x) => [x.k, x.name]), tag)}</label><p class="pl-help">${esc(t.help)}</p>
        ${t.who ? `<label>Who ${sel('plWho', ['everyone', 'forwards', 'mids', 'defenders', 'nearest', 'wingers', 'fullbacks'].map((k) => [k, FM.PLAN_WHO_NAMES[k]]), d.who || 'everyone')}</label>` : ''}
        ${preview ? `<p class="pl-sent pl-preview">${esc(preview)}</p>` : ''}
        <div class="pl-add"><button type="button" class="primary" data-build="zone"${UI.cells.length ? '' : ' disabled'}>Add this</button><button type="button" data-mode="view">Cancel</button></div></div>`;
    }
    const whens = FM.PLAN_WHEN.filter((w) => w.side === side && (w.stage ? w.stage === ph : ph !== 'transAtt' && ph !== 'transDef')), w = FM.PLAN_WHEN_BY[d.when] && whens.some((x) => x.k === d.when) ? FM.PLAN_WHEN_BY[d.when] : whens[0];
    const dos = FM.PLAN_DO.filter((x) => x.side === w.side), doK = dos.some((x) => x.k === d.do) ? d.do : dos[0].k;
    const draft = { when: w.k, group: d.group || 'FB', who: d.who || 'nearest', do: doK, cells: UI.cells };
    const preview = (w.needs === 'zone' && !UI.cells.length) ? '' : FM.planTriggerText(draft);
    return `<div class="pl-build"><h4>Add a trigger</h4>
      <label>When ${sel('plWhen', whens.map((x) => [x.k, x.name]), w.k)}</label>
      ${w.needs === 'carrier' ? `<label>the ball goes to their ${sel('plGroup', w.options.map((x) => [x[0], x[1]]), draft.group)}</label>` : ''}
      <p class="pl-help">${w.needs === 'zone' ? 'Click the squares that make up the area (' + esc(cellsText) + ').' : 'Optionally click squares on the pitch to say where (' + esc(cellsText) + ').'}</p>
      <label>Who reacts ${sel('plWho', ['nearest', 'forwards', 'mids', 'defenders', 'wingers', 'striker', 'fullbacks', 'everyone'].map((k) => [k, FM.PLAN_WHO_NAMES[k]]), draft.who)}</label>
      <label>What they do ${sel('plDo', dos.map((x) => [x.k, x.name]), draft.do)}</label>
      ${preview ? `<p class="pl-sent pl-preview">${esc(preview)}</p>` : ''}
      <div class="pl-add"><button type="button" class="primary" data-build="trigger"${(w.needs === 'zone' && !UI.cells.length) ? ' disabled' : ''}>Add this</button><button type="button" data-mode="view">Cancel</button></div></div>`;
  }

  const manualCount = (team, ph) => team.players.filter((p) => FM.planPhase(ph).eng.some((k) => FM.isManual(team, p, k))).length;

  // ---------- the page ----------
  // dials: real-unit sliders under the pitch; the engine reads them straight away
  function dialsHtml(team, ph) {
    const g = SIDE_OF[ph] === 'with' ? 'With the ball' : 'Without the ball';
    return '<div class="pl-dialgrid">' + FM.DIALS.filter((d) => d.group === g).map((d) => { const v = FM.dialGet(team, d.id); return `<label class="pl-dial" for="dial-${d.id}"><span class="pl-dial-h"><b>${esc(d.label)}</b><output id="dial-out-${d.id}">${esc(FM.dialShow(d.id, v))}</output></span><input id="dial-${d.id}" type="range" data-dial="${d.id}" min="${d.lo}" max="${d.hi}" step="${d.step}" value="${v}"><small>${esc(d.words)}</small></label>`; }).join('') + '</div>';
  }
  FM.renderPlanTab = function (host, team, tab, hooks) {
    const phases = TAB_PHASES[tab]; if (!phases) return false;
    if (!UI.sub || phases.indexOf(UI.sub) < 0) UI.sub = phases[0];
    const ph = UI.sub, info = FM.planPhase(ph), pl = FM.planGet(team);
    if (!pl.migrated) { migrate(team); pl.migrated = true; hooks.save(); }
    if (!UI.sel || !team.players.some((p) => p.slotKey === UI.sel)) UI.sel = null;
    const draw = () => {
      const legacy = (team.rules || []).filter((r) => r.source !== 'plan');
      host.innerHTML = `<div class="pl">
        ${phases.length > 1 ? `<div class="pl-sub">${phases.map((k) => `<button type="button" class="${k === ph ? 'on' : ''}" data-sub="${k}">${esc(FM.planPhase(k).name)}</button>`).join('')}</div>` : ''}
        <div class="pl-head"><h3>${esc(info.name)}</h3><p>${esc(info.blurb)}</p></div>
        ${team.legacyTactics && !pl.noticeSeen ? '<div class="pl-notice">Tactics are now set with choices and roles as well as by placing players. Where you drag a player is where he stands in that phase, and his role and instructions decide how he plays from there. Your hand-placed positions from before are kept. <button type="button" data-notice="1">Got it</button></div>' : ''}
        ${legacy.length ? `<div class="pl-notice">${legacy.length} written instruction${legacy.length === 1 ? '' : 's'} from before ${legacy.length === 1 ? 'is' : 'are'} still active. <button type="button" data-clear-legacy="1">Remove ${legacy.length === 1 ? 'it' : 'them'}</button></div>` : ''}
        <div class="pl-grid">
          <section class="card pl-left"><div class="pl-pitchbar">${manualCount(team, ph) ? '<button type="button" data-resetpos="1">Put this phase\'s players back where their roles put them</button>' : ''}<button type="button" class="${UI.showOpp ? 'on' : ''}" data-opp="1"${hooks.opp ? '' : ' disabled'}>${UI.showOpp ? 'Hide' : 'Show'} the opposition</button></div><div class="pl-pitchwrap${UI.mode !== 'view' ? ' picking' : ''}">${pitchSvg(team, ph, hooks)}</div>${(() => { const rp = hooks.report ? hooks.report(FM.planPhase(ph).eng[0]) : ''; return rp ? `<div class="pl-oppreport">${UI.showOpp ? '' : '<p class="pl-help">Show the opposition to see how they stand in this phase.</p>'}${rp}</div>` : ''; })()}
            <p class="pl-help pl-legend">Each circle is a player and where he stands in this phase. Drag one to where you want him: that is where he stands, and his role and instructions decide how he plays from there. A white dot marks a player you have placed. Click one without dragging to open his role and instructions on the squad page.</p></section>
          <section class="card pl-right"><h4>Team approach: ${esc(info.name.toLowerCase())}</h4>${teamPanel(team, ph)}</section>
        </div>
        <section class="card pl-dials"><h4>Dials: ${SIDE_OF[ph] === 'with' ? 'with the ball' : 'without the ball'}</h4>${dialsHtml(team, ph)}</section>
        <section class="card pl-plans"><h4>On the pitch: areas and triggers</h4>${planItems(team, ph)}${builder(team, ph)}</section>
        <section class="card pl-sum"><h4>The plan so far</h4>${FM.planSummary(team).map((x) => `<p><b>${esc(x.phase)}:</b> ${esc(x.text)}</p>`).join('') || '<p class="pl-empty">Everything is as the roles set it. Make a choice above and it appears here.</p>'}</section></div>`;
      bind();
    };
    const again = () => { hooks.save(); draw(); };
    const bind = () => {
      host.querySelectorAll('[data-dial]').forEach((r) => {
        r.addEventListener('input', () => { FM.dialSet(team, r.dataset.dial, +r.value); const o = host.querySelector('#dial-out-' + r.dataset.dial); if (o) o.textContent = FM.dialShow(r.dataset.dial, FM.dialGet(team, r.dataset.dial)); });
        r.addEventListener('change', () => hooks.save());
      });
      host.querySelectorAll('[data-sub]').forEach((b) => b.addEventListener('click', () => { UI.sub = b.dataset.sub; UI.mode = 'view'; UI.cells = []; UI.sel = null; FM.renderPlanTab(host, team, tab, hooks); }));   // the page is opened again for that phase (its name, choices and pitch all belong to it)
      host.querySelectorAll('[data-team-tog]').forEach((b) => b.addEventListener('click', () => { FM.planSetTeam(team, ph, b.dataset.teamTog, b.dataset.v); again(); }));
      host.querySelectorAll('[data-player-tog]').forEach((b) => b.addEventListener('click', () => { FM.planSetPlayer(team, UI.sel, ph, b.dataset.playerTog, b.dataset.v); again(); }));
      // Drag a player to where he should stand in this phase. A placed position is the one he stands in (his role and instructions still decide how he plays from it);
      // a click that does not move opens him on the squad page.
      const svg = host.querySelector('.pl-pitch');
      const toPos = (e) => { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const q = pt.matrixTransform(svg.getScreenCTM().inverse()); return { w: Math.max(0.03, Math.min(0.97, q.x / PW)), d: Math.max(0.02, Math.min(0.98, 1 - q.y / PH)) }; };
      host.querySelectorAll('.pl-card').forEach((g) => g.addEventListener('pointerdown', (e) => {
        if (UI.mode !== 'view' || (e.pointerType === 'mouse' && e.button !== 0)) return;
        e.preventDefault();
        const p = team.players.find((q) => q.slotKey === g.dataset.slot), start = { x: e.clientX, y: e.clientY }; let moved = false, at = null;
        try { g.setPointerCapture(e.pointerId); } catch (_) { /* a plain drag still works */ }
        const mv = (ev) => { if (!moved && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 5) return; moved = true; at = toPos(ev); g.setAttribute('transform', 'translate(' + (at.w * PW).toFixed(1) + ',' + ((1 - at.d) * PH).toFixed(1) + ')'); };
        const up = () => {
          g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up); g.removeEventListener('pointercancel', up);
          if (!moved || !at || !p) { if (!moved && hooks.openPlayer) hooks.openPlayer(g.dataset.slot); return; }
          team.phasePos = team.phasePos || {};
          info.eng.forEach((k) => FM.setPhasePos(team, p, k, { d: at.d, w: at.w }));
          if (FM.inferShapeTactics) FM.inferShapeTactics(team);
          again();
        };
        g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up);
      }));
      const rp = host.querySelector('[data-resetpos]'); if (rp) rp.addEventListener('click', () => { info.eng.forEach((k) => { if (team.phasePos && team.phasePos[k]) delete team.phasePos[k]; }); if (FM.inferShapeTactics) FM.inferShapeTactics(team); again(); });
      host.querySelectorAll('.pl-cell').forEach((c) => c.addEventListener('click', () => { const k = c.dataset.cell.split(',').map(Number), i = UI.cells.findIndex((q) => q[0] === k[0] && q[1] === k[1]); if (i >= 0) UI.cells.splice(i, 1); else UI.cells.push(k); draw(); }));

      host.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { UI.mode = b.dataset.mode; UI.cells = []; UI.draft = {}; draw(); }));
      const rd = () => { UI.draft = { tag: (host.querySelector('#plTag') || {}).value, who: (host.querySelector('#plWho') || {}).value, when: (host.querySelector('#plWhen') || {}).value, group: (host.querySelector('#plGroup') || {}).value, do: (host.querySelector('#plDo') || {}).value }; draw(); };
      ['plTag', 'plWho', 'plWhen', 'plGroup', 'plDo'].forEach((id) => { const e = host.querySelector('#' + id); if (e) e.addEventListener('change', rd); });
      host.querySelectorAll('[data-build]').forEach((b) => b.addEventListener('click', () => {
        const d = UI.draft;
        if (b.dataset.build === 'zone') FM.planAddZone(team, { tag: d.tag || FM.PLAN_ZONE_TAGS.find((t) => t.side === SIDE_OF[ph]).k, who: d.who || 'everyone', cells: UI.cells.slice(), phase: ph });
        else FM.planAddTrigger(team, { when: d.when || 'carrier', group: d.group || 'FB', who: d.who || 'nearest', do: d.do, cells: UI.cells.slice() });
        UI.mode = 'view'; UI.cells = []; UI.draft = {}; again();
      }));
      host.querySelectorAll('[data-item-toggle]').forEach((b) => b.addEventListener('click', () => { const [k, id] = b.dataset.itemToggle.split(':'); FM.planToggleItem(team, k, id); again(); }));
      host.querySelectorAll('[data-item-del]').forEach((b) => b.addEventListener('click', () => { const [k, id] = b.dataset.itemDel.split(':'); FM.planRemove(team, k, id); again(); }));
      const ob = host.querySelector('[data-opp]'); if (ob) ob.addEventListener('click', () => { UI.showOpp = !UI.showOpp; draw(); });
      const nt = host.querySelector('[data-notice]'); if (nt) nt.addEventListener('click', () => { pl.noticeSeen = true; again(); });
      const cl = host.querySelector('[data-clear-legacy]'); if (cl) cl.addEventListener('click', () => { team.legacyTactics = team.legacyTactics || {}; team.legacyTactics.rules = (team.rules || []).filter((r) => r.source !== 'plan'); team.rules = (team.rules || []).filter((r) => r.source === 'plan'); FM.planApply(team); again(); });
    };
    draw();
    return true;
  };

  // ---------- one player's role and instructions, for the squad and formation page ----------
  // A panel that sits at the top of the page, above its other controls, and closes. His role is chosen from large buttons (rest the mouse on one to read what it is),
  // his general instructions are the ones that hold whenever they make sense (the ones about playing on the ball only count with the ball, the ones about winning it
  // only without it), and below them are his choices for each phase of play.
  FM.planPlayerPanel = function (host, team, p, hooks) {
    if (!host) return;
    if (!p) { host.innerHTML = ''; return; }
    const pl = FM.planGet(team), role = FM.ROLES[p.roleId] || {};
    const roleBtns = FM.rolesForGroup(p.group).map((id) => { const r = FM.ROLES[id]; return `<button type="button" class="pl-rolebtn${id === p.roleId ? ' on' : ''}" data-roleid="${id}" title="${esc(r.name + ': ' + r.desc)}"><b>${esc(r.name)}</b><span>${esc(r.tag || '')}</span></button>`; }).join('');
    const SIDE = { with: 'with the ball', without: 'without the ball', both: 'all the time' };
    const general = FM.instructionsFor(p.group).map((ins) => {
      const cur = (p.instr || {})[ins.key] || 0;
      return `<div class="pl-tog"><div class="pl-tog-h"><b>${esc(ins.label)}</b><span class="pl-help">${esc(SIDE[(FM.INSTR_SIDE || {})[ins.key]] || '')}</span></div><div class="pl-seg" role="group">${ins.options.map((o) => `<button type="button" class="${+o[0] === +cur ? 'on' : ''}" data-instr="${esc(ins.key)}" data-v="${o[0]}">${esc(o[1])}</button>`).join('')}</div></div>`;
    }).join('');
    const phases = FM.PLAN_PHASES.map((ph) => {
      const tg = FM.planPlayerToggles(ph.key, p.group); if (!tg.length) return '';
      const mine = ((pl.player[p.slotKey] || {})[ph.key]) || {}, n = Object.keys(mine).length;
      return `<details class="pl-phase"${n ? ' open' : ''}><summary>${esc(ph.name)}${n ? ` <i>${n}</i>` : ''}</summary>${tg.map((t) => {
        const cur = mine[t.key], def = t.opts.some((x) => x.v === 'std') ? 'std' : t.opts[0].v;
        return `<div class="pl-tog"><div class="pl-tog-h"><b>${esc(t.label)}</b></div><div class="pl-seg" role="group">${t.opts.map((op) => `<button type="button" class="${(cur == null ? def : cur) === op.v ? 'on' : ''}" data-player-tog="${esc(t.key)}" data-phase="${ph.key}" data-v="${esc(op.v)}">${esc(op.label)}</button>`).join('')}</div></div>`;
      }).join('')}</details>`;
    }).join('');
    host.innerHTML = `<div class="pl-pop pl-pop-top" role="dialog" aria-label="Role and instructions for ${esc(p.name)}"><button type="button" class="pl-pop-x" data-close="1" aria-label="Close">×</button>
      <div class="pl-who"><b>${esc(p.name)}</b><span>#${p.number} · ${esc(p.group)}${FM.playerRating ? ' · ' + FM.playerRating(p, p.group).toFixed(1) : ''}</span></div>
      <h5>Role</h5><div class="pl-roles">${roleBtns}</div>
      <p class="pl-roledesc" id="plRoleDesc"><b>${esc(role.name || '')}.</b> ${esc(role.desc || '')}</p>
      <h5>General instructions</h5>${general}
      <h5>By phase of play</h5>${phases || '<p class="pl-empty">Nothing to choose by phase for this player.</p>'}</div>`;
    const redraw = () => { if (hooks && hooks.save) hooks.save(); FM.planPlayerPanel(host, team, p, hooks); if (hooks && hooks.changed) hooks.changed(); };
    host.querySelectorAll('[data-roleid]').forEach((b) => {
      b.addEventListener('click', () => { FM.setRole(team, p, b.dataset.roleid); FM.planApply(team); redraw(); });
      const say = (id) => { const r = FM.ROLES[id], d = host.querySelector('#plRoleDesc'); if (r && d) d.innerHTML = '<b>' + esc(r.name) + '.</b> ' + esc(r.desc); };
      b.addEventListener('mouseenter', () => say(b.dataset.roleid)); b.addEventListener('focus', () => say(b.dataset.roleid)); b.addEventListener('mouseleave', () => say(p.roleId));
    });
    host.querySelectorAll('[data-instr]').forEach((b) => b.addEventListener('click', () => { p.instr = p.instr || {}; const v = +b.dataset.v; if (v === 0) delete p.instr[b.dataset.instr]; else p.instr[b.dataset.instr] = v; if (FM.inferShapeTactics) FM.inferShapeTactics(team); redraw(); }));
    host.querySelectorAll('[data-player-tog]').forEach((b) => b.addEventListener('click', () => { FM.planSetPlayer(team, p.slotKey, b.dataset.phase, b.dataset.playerTog, b.dataset.v); redraw(); }));
    const cx = host.querySelector('[data-close]'); if (cx) cx.addEventListener('click', () => { if (hooks && hooks.close) hooks.close(); else host.innerHTML = ''; });
  };

  // First time the plan is used: hand-placed positions are kept (where a player was dragged is where he stands; roles and choices decide how he plays), with a backup copy.
  function migrate(team) {
    const man = team.phasePos && Object.keys(team.phasePos).some((k) => Object.keys(team.phasePos[k] || {}).length);
    if (man) team.legacyTactics = { phasePos: JSON.parse(JSON.stringify(team.phasePos || {})), rules: [] };
    FM.planApply(team);
  }
})();
