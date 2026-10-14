// Code-driven football instructions. The manager chooses who the instruction
// applies to and the behaviour they want; no AI call is needed.
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const states = {};
  const GROUP_NAME = { GK: 'Goalkeepers', CB: 'Centre-backs', FB: 'Full-backs', DM: 'Defensive midfielders', CM: 'Central midfielders', AM: 'Attacking midfielders', WF: 'Wingers', ST: 'Strikers' };
  const EFFECTS = [
    ['short', 'Prefer short passes', { type: 'passLength', pref: 'short', strength: .75 }],
    ['long', 'Prefer long passes', { type: 'passLength', pref: 'long', strength: .75 }],
    ['forward', 'Look forward more often', { type: 'passDirection', dir: 'forward', weight: .7 }],
    ['sideways', 'Recycle the ball more often', { type: 'passDirection', dir: 'sideways', weight: .65 }],
    ['safe', 'Play safer passes', { type: 'risk', delta: -.65 }],
    ['risk', 'Try more ambitious passes', { type: 'risk', delta: .65 }],
    ['free', 'Find the unmarked player', { type: 'freeMan', weight: .8 }],
    ['faster', 'Move the ball faster', { type: 'tempo', delta: .65 }],
    ['slower', 'Be more patient on the ball', { type: 'tempo', delta: -.65 }],
    ['dribble', 'Dribble more often', { type: 'dribble', delta: .65 }],
    ['nodribble', 'Dribble less often', { type: 'dribble', delta: -.65 }],
    ['shoot', 'Shoot more readily', { type: 'shoot', delta: .65 }],
    ['noshoot', 'Wait for a better shooting chance', { type: 'shoot', delta: -.65 }],
    ['runs', 'Make more runs in behind', { type: 'runs', delta: .7 }],
    ['holdline', 'Hold position rather than running in behind', { type: 'runs', delta: -.7 }],
    ['press', 'Close the ball down more', { type: 'closeDown', delta: .7 }],
    ['hold', 'Hold shape instead of pressing', { type: 'closeDown', delta: -.7 }],
    ['tackle', 'Tackle harder', { type: 'tackle', delta: .65 }],
    ['feet', 'Stay on your feet', { type: 'tackle', delta: -.65 }],
    ['holdup', 'Hold the ball up', { type: 'holdUp', on: true }],
    ['stepup', 'Step up with a forward who drops', { type: 'stepUp', on: true }],
  ];
  const everyone = (t) => { const seen = {}, out = []; (t.squad || []).concat(t.players || [], t.bench || []).forEach((p) => { if (p && !seen[p.number]) { seen[p.number] = 1; out.push(p); } }); return out; };
  FM.squadOf = (t) => everyone(t).map((p) => ({ number: p.number, name: p.name, group: p.group || p.natural, role: (p.roleId || '').replace(/_/g, ' '), slot: p.slotKey || '' }));
  FM.isGameRule = (r) => !!(r && r.game);
  const parseScope = (value) => {
    if (value === 'team') return { kind: 'team' };
    const p = value.split(':');
    if (p[0] === 'player') return { kind: 'player', number: +p[1] };
    if (p[0] === 'line') return { kind: 'line', line: p[1] };
    return { kind: 'group', group: p[1] };
  };
  FM.renderInstructions = function (host, team, hooks, opts) {
    opts = opts || {};
    const stage = opts.stage || null, key = stage || 'all';
    const st = states[key] || (states[key] = { scope: 'team', effect: 'short', collapsed: false, listOpen: true, added: '' });
    team.rules = team.rules || [];
    const applies = (r) => !stage || !!(r.when && r.when.stage && r.when.stage.indexOf(stage) >= 0);
    const rules = team.rules.filter(applies), active = rules.filter((r) => !r.off).length;
    const title = opts.title || 'Instructions';
    if (stage && st.collapsed) {
      host.innerHTML = `<button type="button" class="in-fold" id="inFold" aria-expanded="false"><span>${esc(title)}${active ? ' (' + active + ')' : ''} <small>Open</small></span><i aria-hidden="true">&#9662;</i></button>`;
      host.querySelector('#inFold').addEventListener('click', () => { st.collapsed = false; FM.renderInstructions(host, team, hooks, opts); });
      return;
    }
    const players = everyone(team).slice().sort((a, b) => a.number - b.number);
    const own = {}, opp = {};
    players.forEach((p) => { own[p.number] = p.name; });
    const opponent = hooks && hooks.opp ? hooks.opp() : null;
    if (opponent) everyone(opponent).forEach((p) => { opp[p.number] = p.name; });
    FM.rulesRoster = { own, opp };
    const scopeOptions = [['team', 'Whole team'], ['line:defence', 'Defence'], ['line:midfield', 'Midfield'], ['line:attack', 'Attack']]
      .concat(Object.keys(GROUP_NAME).map((g) => ['group:' + g, GROUP_NAME[g]]), players.map((p) => ['player:' + p.number, p.name + ' (#' + p.number + ')']));
    const card = (r) => `<div class="in-rule${r.off ? ' off' : ''}"><label class="in-sw"><input type="checkbox" data-toggle="${r.id}"${r.off ? '' : ' checked'} aria-label="Instruction on or off"><i></i></label><div class="in-rt"><small class="in-who">${esc(FM.rulesWho(r))}</small><b>${esc(FM.rulesText(r))}</b></div><button type="button" class="in-del" data-del="${r.id}" aria-label="Delete this instruction">×</button></div>`;
    host.innerHTML = `<div class="in-wrap"><div class="in-main">
      ${stage ? `<button type="button" class="in-fold open" id="inFold" aria-expanded="true"><span>${esc(title)} <small>Close</small></span><i aria-hidden="true">&#9652;</i></button>` : ''}
      <section class="in-scope in-scope-general"><div class="in-head"><h2>${esc(title)}${active ? ' (' + active + ')' : ''}</h2><p class="in-note">Positions on the pitch already tell players where to stand. Add only the behaviour you want here.</p></div>
      <div class="in-add"><div class="in-body"><div class="in-builder"><label>Who<select id="inScope">${scopeOptions.map(([v,n]) => `<option value="${v}"${st.scope === v ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label><label>Instruction<select id="inEffect">${EFFECTS.map(([v,n]) => `<option value="${v}"${st.effect === v ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label><button type="button" class="in-go" id="inAdd">Add instruction</button></div></div></div>
      ${st.added ? `<p class="in-ok" role="status">${esc(st.added)}</p>` : ''}
      <button type="button" class="in-listbar" id="inList" aria-expanded="${st.listOpen}"><span>${st.listOpen ? 'Hide' : 'Show'} the list${rules.length ? ' (' + rules.length + ')' : ''}</span><i aria-hidden="true">${st.listOpen ? '▴' : '▾'}</i></button>
      <div class="in-list"${st.listOpen ? '' : ' hidden'}>${rules.length ? rules.map(card).join('') : '<p class="in-empty">No added instructions. The positions on the board still apply.</p>'}</div></section></div></div>`;
    const redraw = () => FM.renderInstructions(host, team, hooks, opts);
    const touched = () => { if (hooks && hooks.save) hooks.save(); if (hooks && hooks.changed) hooks.changed(); };
    const scope = host.querySelector('#inScope'), effect = host.querySelector('#inEffect');
    scope.addEventListener('change', () => { st.scope = scope.value; }); effect.addEventListener('change', () => { st.effect = effect.value; });
    host.querySelector('#inAdd').addEventListener('click', () => {
      const found = EFFECTS.find((x) => x[0] === effect.value); if (!found) return;
      const rule = FM.rulesClean({ scope: parseScope(scope.value), when: stage ? { stage: [stage] } : {}, effects: [Object.assign({}, found[2])], source: 'builder' }, players.map((p) => p.number));
      if (rule) { team.rules.push(rule); st.added = 'Added.'; touched(); redraw(); }
    });
    const fold = host.querySelector('#inFold'); if (fold) fold.addEventListener('click', () => { st.collapsed = true; redraw(); });
    host.querySelector('#inList').addEventListener('click', () => { st.listOpen = !st.listOpen; redraw(); });
    host.querySelectorAll('[data-toggle]').forEach((c) => c.addEventListener('change', () => { const r = team.rules.find((x) => x.id === c.dataset.toggle); if (r) { r.off = !c.checked; touched(); redraw(); } }));
    host.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => { team.rules = team.rules.filter((x) => x.id !== b.dataset.del); st.added = ''; touched(); redraw(); }));
  };
})();
