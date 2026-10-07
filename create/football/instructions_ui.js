// The Instructions tab: tell the whole team, a line (goalkeeper, defence, midfield, attack), a position group or one player how to play.
// Three ways in: describe it in your own words (turned into rules once, by LastMind), build it from the options, or pick a ready-made idea.
// Everything ends up as the same kind of rule (see rules.js), which the match engine and the build-up lab both play.
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const R = () => FM.RULES;
  const st = { scope: { kind: 'team' }, mode: 'write', text: '', busy: false, err: '', draft: null, build: { when: {}, effects: [] }, added: '' };

  const same = (a, b) => a.kind === b.kind && (a.line || a.group || a.number || '') === (b.line || b.group || b.number || '');
  const surname = (p) => p.name.split(' ').slice(1).join(' ') || p.name;
  const groupLabel = { GK: 'Goalkeeper', CB: 'Centre-back', FB: 'Full-back', DM: 'Defensive midfielder', CM: 'Central midfielder', AM: 'Attacking midfielder', WF: 'Winger', ST: 'Striker' };

  // ---------- ready-made ideas ----------
  const idea = (label, desc, effects, when, scope) => ({ label, desc, effects, when: when || {}, scope });
  const PRESETS = {
    team: [
      idea('Play out from the back', 'Short passes in your own third.', [{ type: 'passLength', pref: 'short', strength: 0.7 }], { zone: ['own_third'] }),
      idea('Go long when pressed', 'When they press you in your own third, send it forward.', [{ type: 'passLength', pref: 'long', strength: 0.7 }, { type: 'passDirection', dir: 'forward', weight: 0.4 }], { zone: ['own_third'], pressed: 'pressed' }),
      idea('Look for the free man', 'Prefer a team-mate with nobody close.', [{ type: 'freeMan', weight: 0.8 }]),
      idea('Keep the ball', 'Safer passes and a slower pace.', [{ type: 'risk', delta: -0.5 }, { type: 'tempo', delta: -0.3 }]),
      idea('Quick and direct', 'Forward passes, more risk, faster.', [{ type: 'passDirection', dir: 'forward', weight: 0.5 }, { type: 'risk', delta: 0.4 }, { type: 'tempo', delta: 0.4 }]),
      idea('Protect the lead', 'Safer and slower once you are ahead.', [{ type: 'risk', delta: -0.6 }, { type: 'tempo', delta: -0.4 }, { type: 'passDirection', dir: 'backward', weight: 0.2 }], { score: 'winning', minFrom: 60 }),
      idea('Chase the game', 'More ambition and pace when behind late on.', [{ type: 'risk', delta: 0.6 }, { type: 'tempo', delta: 0.5 }, { type: 'shoot', delta: 0.3 }], { score: 'losing', minFrom: 65 }),
    ],
    goalkeeper: [
      idea('Roll it out short', 'To a centre-back or full-back.', [{ type: 'passLength', pref: 'short', strength: 0.9 }, { type: 'passTarget', to: { line: 'defence' }, weight: 0.5 }]),
      idea('Kick it long', 'Straight to the attack.', [{ type: 'passLength', pref: 'long', strength: 0.9 }, { type: 'passTarget', to: { line: 'attack' }, weight: 0.5 }]),
      idea('Find the free man', 'Whoever has space, short or long.', [{ type: 'freeMan', weight: 0.9 }]),
    ],
    defence: [
      idea('Pass out through the midfield', 'Short, to the defensive midfielders.', [{ type: 'passLength', pref: 'short', strength: 0.7 }, { type: 'passTarget', to: { group: 'DM' }, weight: 0.5 }], { zone: ['own_third'] }),
      idea('Keep it safe', 'No ambitious passes.', [{ type: 'risk', delta: -0.6 }]),
      idea('Play it forward early', 'Look past the midfield.', [{ type: 'passDirection', dir: 'forward', weight: 0.6 }, { type: 'risk', delta: 0.3 }]),
      idea('Switch the play', 'Find the player on the other side.', [{ type: 'passTarget', to: { side: 'opposite' }, weight: 0.6 }, { type: 'passLength', pref: 'long', strength: 0.3 }]),
      idea('Hold the line', 'Stay level and do not run beyond it.', [{ type: 'runs', delta: -0.8 }]),
    ],
    midfield: [
      idea('Look for the forward pass', 'Play to the attack.', [{ type: 'passDirection', dir: 'forward', weight: 0.6 }, { type: 'risk', delta: 0.3 }]),
      idea('Switch the play', 'Out to the opposite side.', [{ type: 'passTarget', to: { side: 'opposite' }, weight: 0.6 }]),
      idea('Control the tempo', 'Slower, keep it.', [{ type: 'tempo', delta: -0.4 }, { type: 'risk', delta: -0.3 }, { type: 'holdUp', on: true }]),
      idea('Press hard', 'Close the ball down and tackle.', [{ type: 'closeDown', delta: 0.6 }, { type: 'tackle', delta: 0.3 }]),
      idea('Pass to the wingers', 'Use the width.', [{ type: 'passTarget', to: { group: 'WF' }, weight: 0.6 }]),
    ],
    attack: [
      idea('Run in behind', 'Stand level with the last defender and run beyond.', [{ type: 'runs', delta: 0.8 }]),
      idea('Shoot on sight', 'Shoot whenever there is a chance.', [{ type: 'shoot', delta: 0.7 }]),
      idea('Take defenders on', 'Dribble more.', [{ type: 'dribble', delta: 0.6 }]),
      idea('Hold the ball up', 'Wait for the team to arrive.', [{ type: 'holdUp', on: true }, { type: 'tempo', delta: -0.2 }]),
      idea('Press from the front', 'Close defenders down.', [{ type: 'closeDown', delta: 0.7 }]),
    ],
    FB: [
      idea('Overlap', 'Stand higher and wider with the ball.', [{ type: 'position', forward: 10, wide: 6, phase: 'with' }, { type: 'runs', delta: 0.6 }]),
      idea('Tuck in', 'Come inside without the ball.', [{ type: 'position', forward: 0, wide: -6, phase: 'without' }]),
      idea('Stay back', 'Never go beyond the halfway line.', [{ type: 'position', forward: -8, wide: 0, phase: 'both' }, { type: 'runs', delta: -0.8 }]),
    ],
    WF: [
      idea('Hug the touchline', 'Stay wide.', [{ type: 'position', forward: 0, wide: 6, phase: 'with' }]),
      idea('Cut inside', 'Drift into the middle and take people on.', [{ type: 'position', forward: 0, wide: -7, phase: 'with' }, { type: 'dribble', delta: 0.5 }]),
      idea('Track back', 'Stand deeper without the ball.', [{ type: 'position', forward: -10, wide: 0, phase: 'without' }]),
    ],
    ST: [
      idea('Play on the last defender', 'Stand as high as allowed and run in behind.', [{ type: 'position', forward: 6, wide: 0, phase: 'with' }, { type: 'runs', delta: 0.8 }]),
      idea('Drop deep to link up', 'Come to feet and hold it up.', [{ type: 'position', forward: -10, wide: 0, phase: 'with' }, { type: 'holdUp', on: true }]),
      idea('Lead the press', 'Close the centre-backs down.', [{ type: 'closeDown', delta: 0.8 }]),
    ],
    DM: [
      idea('Sit in front of the defence', 'Stand deeper.', [{ type: 'position', forward: -6, wide: 0, phase: 'both' }, { type: 'risk', delta: -0.3 }]),
      idea('Mark their number 10', 'Follow the attacking midfielder without the ball.', [{ type: 'mark', target: { group: 'AM' }, tight: true }], { possession: 'without' }),
      idea('Be the free man', 'Drop between the centre-backs to receive.', [{ type: 'position', forward: -8, wide: 0, phase: 'with' }], { zone: ['own_third'] }),
    ],
    CM: [
      idea('Get forward', 'Join the attack.', [{ type: 'position', forward: 8, wide: 0, phase: 'with' }, { type: 'runs', delta: 0.5 }]),
      idea('Sit and shield', 'Hold position and stay safe.', [{ type: 'position', forward: -5, wide: 0, phase: 'both' }, { type: 'risk', delta: -0.3 }]),
    ],
    AM: [
      idea('Find pockets of space', 'Drift wide of their midfield.', [{ type: 'position', forward: 0, wide: 6, phase: 'with' }, { type: 'freeMan', weight: 0.4 }]),
      idea('Shadow their defensive midfielder', 'Follow him without the ball.', [{ type: 'mark', target: { group: 'DM' }, tight: true }], { possession: 'without' }),
    ],
    CB: [
      idea('Step up', 'Follow a forward who drops deep.', [{ type: 'stepUp', on: true }]),
      idea('Mark the striker', 'Follow the nearest striker closely.', [{ type: 'mark', target: { group: 'ST' }, tight: true }], { possession: 'without' }),
      idea('Carry it forward', 'Dribble out from the back.', [{ type: 'dribble', delta: 0.5 }, { type: 'position', forward: 4, wide: 0, phase: 'with' }]),
    ],
  };
  PRESETS.GK = PRESETS.goalkeeper;
  const presetsFor = (scope, team) => {
    if (scope.kind === 'team') return PRESETS.team;
    if (scope.kind === 'line') return PRESETS[scope.line] || [];
    if (scope.kind === 'group') return PRESETS[scope.group] || [];
    const p = team.players.find((q) => q.number === scope.number);
    return (p && PRESETS[p.group]) || [];
  };

  // ---------- the builder's effect catalogue ----------
  const EFFECTS = [
    ['passLength', 'Passing distance', { type: 'passLength', pref: 'short', strength: 0.6 }],
    ['passTarget', 'Who to pass to', { type: 'passTarget', to: { group: 'DM' }, weight: 0.5 }],
    ['passDirection', 'Which way to pass', { type: 'passDirection', dir: 'forward', weight: 0.5 }],
    ['freeMan', 'Look for the free man', { type: 'freeMan', weight: 0.6 }],
    ['risk', 'Risk in passing', { type: 'risk', delta: 0.4 }],
    ['tempo', 'Tempo', { type: 'tempo', delta: 0.4 }],
    ['dribble', 'Dribbling', { type: 'dribble', delta: 0.4 }],
    ['shoot', 'Shooting', { type: 'shoot', delta: 0.4 }],
    ['holdUp', 'Hold the ball up', { type: 'holdUp', on: true }],
    ['position', 'Where he stands', { type: 'position', forward: 6, wide: 0, phase: 'with' }],
    ['runs', 'Runs in behind', { type: 'runs', delta: 0.5 }],
    ['closeDown', 'Closing down', { type: 'closeDown', delta: 0.5 }],
    ['tackle', 'Tackling', { type: 'tackle', delta: 0.4 }],
    ['mark', 'Mark an opponent', { type: 'mark', target: { group: 'AM' }, tight: true }],
    ['stepUp', 'Step up to a forward who drops', { type: 'stepUp', on: true }],
  ];
  const DELTA_ENDS = { risk: ['Safer', 'More ambitious'], tempo: ['Slower', 'Faster'], dribble: ['Dribble less', 'Dribble more'], shoot: ['Shoot less', 'Shoot more'], runs: ['Hold the line', 'Run in behind'], closeDown: ['Close down less', 'Close down more'], tackle: ['Stay on feet', 'Tackle harder'] };
  const slider = (id, v, lo, hi, step, ends) => `<div class="in-slide"><span>${ends ? ends[0] : lo}</span><input type="range" id="${id}" min="${lo}" max="${hi}" step="${step}" value="${v}"><span>${ends ? ends[1] : hi}</span></div>`;
  const opt = (list, cur) => list.map(([v, l]) => `<option value="${v}"${v === cur ? ' selected' : ''}>${l}</option>`).join('');

  function effectControls(e, i) {
    const k = e.type, id = (s) => `ef${i}_${s}`;
    if (k === 'passLength') return `<select id="${id('pref')}">${opt([['short', 'Prefer short passes'], ['long', 'Prefer long passes']], e.pref)}</select>${slider(id('strength'), e.strength, 0.1, 1, 0.05, ['A little', 'Always'])}`;
    if (k === 'passTarget') {
      const to = e.to, kind = to.number != null ? 'number' : to.group ? 'group' : to.line ? 'line' : 'side';
      const val = to.number != null ? to.number : to.group || to.line || to.side;
      const choices = kind === 'group' ? opt(R().GROUPS.map((g) => [g, R().GROUP_WORD[g]]), val) : kind === 'line' ? opt(Object.keys(R().LINES).map((l) => [l, R().LINE_WORD[l]]), val) : kind === 'side' ? opt([['same', 'on the same side as him'], ['opposite', 'on the opposite side'], ['left', 'on the left'], ['centre', 'in the middle'], ['right', 'on the right'], ['wide', 'out wide']], val) : '';
      const valCtl = kind === 'number' ? `<input type="number" id="${id('num')}" min="1" max="99" value="${val}">` : `<select id="${id('val')}">${choices}</select>`;
      return `<select id="${id('kind')}">${opt([['group', 'a position'], ['line', 'a line'], ['side', 'a side of the pitch'], ['number', 'one player (shirt number)']], kind)}</select>${valCtl}${slider(id('weight'), e.weight, -1, 1, 0.05, ['Avoid', 'Look for'])}`;
    }
    if (k === 'passDirection') return `<select id="${id('dir')}">${opt([['forward', 'Forward passes'], ['sideways', 'Sideways passes'], ['backward', 'Backward passes']], e.dir)}</select>${slider(id('weight'), e.weight, -1, 1, 0.05, ['Avoid', 'Favour'])}`;
    if (k === 'freeMan') return slider(id('weight'), e.weight, 0.1, 1, 0.05, ['A little', 'Strongly']);
    if (DELTA_ENDS[k]) return slider(id('delta'), e.delta, -1, 1, 0.05, DELTA_ENDS[k]);
    if (k === 'position') return `<div class="in-two"><label>Further forward (m)<input type="number" id="${id('forward')}" min="-15" max="15" value="${e.forward}"></label><label>Wider (m, negative = narrower)<input type="number" id="${id('wide')}" min="-12" max="12" value="${e.wide}"></label></div><select id="${id('phase')}">${opt([['with', 'When we have the ball'], ['without', 'When we do not'], ['both', 'Both']], e.phase)}</select>`;
    if (k === 'mark') return `<select id="${id('group')}">${opt(R().GROUPS.filter((g) => g !== 'GK').map((g) => [g, 'the nearest ' + R().GROUP_WORD[g].replace(/s$/, '')]), e.target.group)}</select>`;
    return '<span class="in-note">Switched on.</span>';
  }
  function readEffect(host, e, i) {
    const g = (s) => host.querySelector('#ef' + i + '_' + s), n = (s) => (g(s) ? +g(s).value : 0);
    if (e.type === 'passLength') { e.pref = g('pref').value; e.strength = n('strength'); }
    else if (e.type === 'passTarget') { const kind = g('kind').value; const to = {}; if (kind === 'number') to.number = Math.round(g('num') ? n('num') : 1) || 1; else to[kind] = g('val').value; e.to = to; e.weight = n('weight'); }
    else if (e.type === 'passDirection') { e.dir = g('dir').value; e.weight = n('weight'); }
    else if (e.type === 'freeMan') e.weight = n('weight');
    else if (DELTA_ENDS[e.type]) e.delta = n('delta');
    else if (e.type === 'position') { e.forward = n('forward'); e.wide = n('wide'); e.phase = g('phase').value; }
    else if (e.type === 'mark') e.target = { group: g('group').value };
  }

  // ---------- the tab ----------
  FM.renderInstructions = function (host, team, hooks) {
    team.rules = team.rules || [];
    const players = team.players.slice().sort((a, b) => a.number - b.number);
    const countFor = (scope) => team.rules.filter((r) => !r.off && same(r.scope, scope)).length;
    const scopes = [{ kind: 'team' }, ...Object.keys(R().LINES).map((l) => ({ kind: 'line', line: l }))];
    const scopeLabel = (s) => (s.kind === 'team' ? 'Whole team' : s.kind === 'line' ? R().LINE_WORD[s.line].replace(/^the /, '').replace(/^./, (c) => c.toUpperCase()) : s.kind === 'group' ? groupLabel[s.group] : (() => { const p = players.find((q) => q.number === s.number); return p ? '#' + p.number + ' ' + p.name : '#' + s.number; })());
    const who = (s) => {
      if (s.kind === 'team') return 'Applies to all ' + players.length + ' players on the pitch.';
      if (s.kind === 'line') return 'Applies to ' + players.filter((p) => R().scopeMatches(s, p)).map((p) => esc(surname(p))).join(', ') + '.';
      const p = players.find((q) => q.number === s.number); return p ? esc(groupLabel[p.group] + ', ' + (p.roleId || '').replace(/_/g, ' ')) + '.' : '';
    };
    // Rules from wider scopes that also reach the chosen one.
    const inherited = () => {
      const target = st.scope.kind === 'player' ? players.find((q) => q.number === st.scope.number) : st.scope.kind === 'line' ? players.find((q) => R().scopeMatches(st.scope, q)) : null;
      if (st.scope.kind === 'team') return [];
      return team.rules.filter((r) => !r.off && !same(r.scope, st.scope) && (r.scope.kind === 'team' || (target && R().scopeMatches(r.scope, target) && (st.scope.kind === 'player' || r.scope.kind === 'line'))));
    };
    const ruleCard = (r) => `<div class="in-rule${r.off ? ' off' : ''}" data-rule="${r.id}">
        <label class="in-sw"><input type="checkbox" data-toggle="${r.id}"${r.off ? '' : ' checked'} aria-label="Instruction on or off"><i></i></label>
        <div class="in-rt"><b>${esc(FM.rulesText(r))}</b>${r.source === 'ai' && r.text && r.text !== FM.rulesText(r) ? `<small>You wrote: ${esc(r.text)}</small>` : ''}</div>
        <button type="button" class="in-del" data-del="${r.id}" aria-label="Delete this instruction">×</button></div>`;

    const mine = team.rules.filter((r) => same(r.scope, st.scope));
    const inh = inherited();
    const side = `<aside class="in-side" aria-label="Who the instruction is for">
        <h3>Who</h3>
        ${scopes.map((s) => `<button type="button" class="in-sc${same(s, st.scope) ? ' on' : ''}" data-scope='${JSON.stringify(s)}'><span>${esc(scopeLabel(s))}</span>${countFor(s) ? `<em>${countFor(s)}</em>` : ''}</button>`).join('')}
        <h3>Players</h3>
        ${players.map((p) => { const s = { kind: 'player', number: p.number }; return `<button type="button" class="in-sc${same(s, st.scope) ? ' on' : ''}" data-scope='${JSON.stringify(s)}'><span><b class="in-num">${p.number}</b> ${esc(surname(p))}<small>${p.group}</small></span>${countFor(s) ? `<em>${countFor(s)}</em>` : ''}</button>`; }).join('')}
      </aside>`;

    const modeTabs = [['write', 'Write it'], ['build', 'Build it'], ['ideas', 'Ready-made ideas']].map(([k, l]) => `<button type="button" class="in-mode${st.mode === k ? ' on' : ''}" data-mode="${k}">${l}</button>`).join('');
    let body = '';
    if (st.mode === 'write') {
      const examples = st.scope.kind === 'team' ? ['Play out from the back, but when they press high go long to the striker', 'When we are winning after 70 minutes, slow the game down and keep the ball'] : st.scope.kind === 'player' ? ['Stay wide with the ball, and when it is on the other side tuck in', 'Look for the player in space and never dribble in our own third'] : ['When pressed in our own third, play it to the nearest midfielder, not long', 'Only go forward when the pass is clearly on'];
      body = `<label class="in-lab" for="inText">Describe it in your own words</label>
        <textarea id="inText" maxlength="600" rows="4" placeholder="e.g. ${esc(examples[0])}">${esc(st.text)}</textarea>
        <div class="in-eg">${examples.map((x, i) => `<button type="button" class="in-chip" data-eg="${i}">${esc(x)}</button>`).join('')}</div>
        <div class="in-act"><button type="button" class="in-go" id="inUnderstand"${st.busy ? ' disabled' : ''}>${st.busy ? 'Reading it…' : 'Turn this into an instruction'}</button><span class="in-note">LastMind reads it once and shows you what it understood before anything is added.</span></div>
        ${st.err ? `<p class="in-err">${esc(st.err)}</p>` : ''}
        ${st.draft ? `<div class="in-draft"><h4>Here is how I understood it</h4>${st.draft.rules.length ? st.draft.rules.map((r) => `<div class="in-rule"><div class="in-rt"><b>${esc(FM.rulesText(r))}</b></div></div>`).join('') : '<p class="in-note">I could not turn that into anything the game can do.</p>'}
          ${st.draft.notIncluded.length ? `<div class="in-ni"><b>Not included</b><ul>${st.draft.notIncluded.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''}
          <div class="in-act">${st.draft.rules.length ? '<button type="button" class="in-go" id="inAddDraft">Add ' + (st.draft.rules.length > 1 ? 'these' : 'this') + '</button>' : ''}<button type="button" class="in-ghost" id="inDropDraft">Change the wording</button></div></div>` : ''}`;
    } else if (st.mode === 'build') {
      const b = st.build, w = b.when;
      const chip = (grp, v, l, on) => `<button type="button" class="in-chip${on ? ' on' : ''}" data-when="${grp}:${v}">${l}</button>`;
      body = `<h4>When does it apply?</h4><p class="in-note">Leave everything off and it applies all the time.</p>
        <div class="in-wh"><b>Ball</b>${chip('possession', 'with', 'We have it', w.possession === 'with')}${chip('possession', 'without', 'We do not', w.possession === 'without')}</div>
        <div class="in-wh"><b>Where</b>${[['own_third', 'Our third'], ['middle_third', 'Middle third'], ['final_third', 'Their third']].map(([v, l]) => chip('zone', v, l, (w.zone || []).indexOf(v) >= 0)).join('')}</div>
        <div class="in-wh"><b>Pressure</b>${chip('pressed', 'pressed', 'Pressed', w.pressed === 'pressed')}${chip('pressed', 'free', 'Not pressed', w.pressed === 'free')}</div>
        <div class="in-wh"><b>Side</b>${[['left', 'Left'], ['centre', 'Middle'], ['right', 'Right'], ['wide', 'Out wide']].map(([v, l]) => chip('side', v, l, w.side === v)).join('')}</div>
        <div class="in-wh"><b>Score</b>${[['winning', 'Winning'], ['drawing', 'Level'], ['losing', 'Losing']].map(([v, l]) => chip('score', v, l, w.score === v)).join('')}</div>
        <div class="in-wh"><b>Minutes</b><input type="number" id="inMin1" min="0" max="120" placeholder="from" value="${w.minFrom != null ? w.minFrom : ''}"><span>to</span><input type="number" id="inMin2" min="0" max="120" placeholder="to" value="${w.minTo != null ? w.minTo : ''}"></div>
        <h4>What changes?</h4>
        ${b.effects.map((e, i) => `<div class="in-eff"><div class="in-eh"><b>${esc((EFFECTS.find((x) => x[0] === e.type) || [0, e.type])[1])}</b><button type="button" class="in-del" data-rm="${i}" aria-label="Remove">×</button></div>${effectControls(e, i)}</div>`).join('')}
        <div class="in-act"><select id="inAddEff"><option value="">Add a change…</option>${EFFECTS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div>
        ${b.effects.length ? `<div class="in-draft"><h4>This will read</h4><div class="in-rule"><div class="in-rt"><b>${esc(FM.rulesText({ scope: st.scope, when: cleanWhen(w), effects: b.effects }))}</b></div></div><div class="in-act"><button type="button" class="in-go" id="inAddBuilt">Add this instruction</button></div></div>` : ''}`;
    } else {
      const ps = presetsFor(st.scope, team);
      body = ps.length ? `<p class="in-note">One click adds it for ${esc(scopeLabel(st.scope).toLowerCase())}. You can switch it off or delete it afterwards.</p><div class="in-ideas">${ps.map((p, i) => `<button type="button" class="in-idea" data-idea="${i}"><b>${esc(p.label)}</b><span>${esc(p.desc)}</span><small>${esc(FM.rulesText({ scope: st.scope, when: p.when, effects: p.effects }))}</small></button>`).join('')}</div>` : '<p class="in-note">No ready-made ideas for this one. Write it or build it.</p>';
    }

    host.innerHTML = `<div class="in-wrap">${side}<div class="in-main">
        <div class="in-head"><h2>${esc(scopeLabel(st.scope))}</h2><p>${who(st.scope)}</p></div>
        ${inh.length ? `<div class="in-inh"><b>Also reaching ${esc(scopeLabel(st.scope).toLowerCase())}</b>${inh.map((r) => `<div><b>${esc(FM.rulesWho(r))}:</b> ${esc(FM.rulesText(r))}</div>`).join('')}</div>` : ''}
        <div class="in-list">${mine.length ? mine.map(ruleCard).join('') : '<p class="in-empty">No instructions here yet. Everyone plays to their role and the team settings until you add some.</p>'}</div>
        ${st.added ? `<p class="in-ok" role="status">${esc(st.added)}</p>` : ''}
        <div class="in-add"><div class="in-modes">${modeTabs}</div><div class="in-body">${body}</div></div>
      </div></div>`;
    wire(host, team, hooks);
  };

  function cleanWhen(w) {
    const o = {}; ['possession', 'pressed', 'side', 'score'].forEach((k) => { if (w[k]) o[k] = w[k]; });
    if (w.zone && w.zone.length && w.zone.length < 3) o.zone = w.zone.slice();
    if (w.minFrom != null) o.minFrom = w.minFrom; if (w.minTo != null) o.minTo = w.minTo;
    return o;
  }
  function addRules(team, hooks, rules, note) {
    const numbers = team.players.map((p) => p.number);
    let n = 0;
    rules.forEach((r) => { const c = FM.rulesClean(r, numbers); if (c) { team.rules.push(c); n++; } });
    st.added = n ? (n === 1 ? 'Added.' : n + ' instructions added.') + (note || '') : 'Nothing could be added.';
    if (hooks.save) hooks.save();
  }

  function wire(host, team, hooks) {
    const redraw = () => FM.renderInstructions(host, team, hooks);
    const q = (s) => host.querySelector(s), qa = (s) => host.querySelectorAll(s);
    qa('[data-scope]').forEach((b) => b.addEventListener('click', () => { st.scope = JSON.parse(b.dataset.scope); st.added = ''; st.draft = null; st.err = ''; st.build = { when: {}, effects: [] }; redraw(); }));
    qa('[data-mode]').forEach((b) => b.addEventListener('click', () => { st.mode = b.dataset.mode; st.added = ''; redraw(); }));
    qa('[data-toggle]').forEach((c) => c.addEventListener('change', () => { const r = team.rules.find((x) => x.id === c.dataset.toggle); if (r) { r.off = !c.checked; if (hooks.save) hooks.save(); redraw(); } }));
    qa('[data-del]').forEach((b) => b.addEventListener('click', () => { team.rules = team.rules.filter((x) => x.id !== b.dataset.del); st.added = ''; if (hooks.save) hooks.save(); redraw(); }));
    // ready-made
    qa('[data-idea]').forEach((b) => b.addEventListener('click', () => { const p = presetsFor(st.scope, team)[+b.dataset.idea]; addRules(team, hooks, [{ scope: st.scope, when: p.when, effects: JSON.parse(JSON.stringify(p.effects)), text: p.label, source: 'idea' }]); redraw(); }));
    // written
    const ta = q('#inText'); if (ta) ta.addEventListener('input', () => { st.text = ta.value; });
    qa('[data-eg]').forEach((b) => b.addEventListener('click', () => { st.text = b.textContent; redraw(); }));
    const u = q('#inUnderstand');
    if (u) u.addEventListener('click', async () => {
      const text = (ta.value || '').trim(); st.text = text; st.err = ''; st.draft = null; st.added = '';
      if (text.length < 3) { st.err = 'Write the instruction first.'; return redraw(); }
      st.busy = true; redraw();
      try {
        const out = await FM.api('/football/compile-instruction', { text, scope: st.scope, squad: team.players.map((p) => ({ number: p.number, name: p.name, group: p.group, role: (p.roleId || '').replace(/_/g, ' ') })) });
        const rules = (out.rules || []).map((r) => FM.rulesClean(Object.assign({}, r, { text, source: 'ai' }), team.players.map((p) => p.number))).filter(Boolean);
        st.draft = { rules, notIncluded: out.notIncluded || [] };
      } catch (err) { st.err = err.message || 'LastMind could not read that just now.'; }
      st.busy = false; redraw();
    });
    const ad = q('#inAddDraft'); if (ad) ad.addEventListener('click', () => { const rs = st.draft.rules; st.draft = null; st.text = ''; addRules(team, hooks, rs); redraw(); });
    const dd = q('#inDropDraft'); if (dd) dd.addEventListener('click', () => { st.draft = null; redraw(); });
    // built
    qa('[data-when]').forEach((b) => b.addEventListener('click', () => {
      const [g, v] = b.dataset.when.split(':'), w = st.build.when;
      if (g === 'zone') { w.zone = w.zone || []; const i = w.zone.indexOf(v); if (i >= 0) w.zone.splice(i, 1); else w.zone.push(v); if (!w.zone.length) delete w.zone; }
      else if (w[g] === v) delete w[g]; else w[g] = v;
      redraw();
    }));
    const m1 = q('#inMin1'), m2 = q('#inMin2');
    [[m1, 'minFrom'], [m2, 'minTo']].forEach(([inp, key]) => { if (inp) inp.addEventListener('change', () => { const v = inp.value === '' ? null : Math.max(0, Math.min(120, +inp.value)); if (v == null) delete st.build.when[key]; else st.build.when[key] = v; redraw(); }); });
    const add = q('#inAddEff'); if (add) add.addEventListener('change', () => { if (!add.value) return; st.build.effects.push(JSON.parse(JSON.stringify(EFFECTS.find((x) => x[0] === add.value)[2]))); redraw(); });
    qa('[data-rm]').forEach((b) => b.addEventListener('click', () => { st.build.effects.splice(+b.dataset.rm, 1); redraw(); }));
    st.build.effects.forEach((e, i) => {
      qa('[id^="ef' + i + '_"]').forEach((c) => c.addEventListener('change', () => {
        readEffect(host, e, i);
        if (e.type === 'passTarget' && c.id === 'ef' + i + '_kind') { const k = c.value; e.to = k === 'group' ? { group: 'DM' } : k === 'line' ? { line: 'midfield' } : k === 'side' ? { side: 'opposite' } : { number: 1 }; }
        redraw();
      }));
    });
    const ab = q('#inAddBuilt'); if (ab) ab.addEventListener('click', () => { addRules(team, hooks, [{ scope: st.scope, when: cleanWhen(st.build.when), effects: st.build.effects, text: '', source: 'builder' }]); st.build = { when: {}, effects: [] }; redraw(); });
  }
})();
