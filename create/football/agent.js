// The LastMind AI Agent: a tab on the right-hand edge of the game that opens a panel with a guide who takes the manager through analysing their
// own matches by asking questions. It is sent a compact summary of the latest matches and the page the manager is on, nothing else.
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const state = { open: false, busy: false, messages: [], ctx: () => '' };

  const STAT_NAMES = { shots: 'shots', onTarget: 'shots on target', xg: 'expected goals', possession: 'possession (seconds with the ball)', passes: 'passes', passesCompleted: 'passes completed', tackles: 'tackles', corners: 'corners', fouls: 'fouls', dribbles: 'dribbles', saves: 'saves' };

  // A short plain-text summary of where the manager is in the game.
  FM.agentContext = function (league, view) {
    if (!league) return '';
    const me = FM.teamById(league, league.userId), out = [];
    out.push('Club: ' + me.name + '. Level: ' + league.tier + '. Season ' + league.season + '. Page open: ' + (view || 'home') + '.');
    const played = league.fixtures.filter((f) => f.played && (f.homeId === league.userId || f.awayId === league.userId)).sort((a, b) => b.round - a.round).slice(0, 3);
    played.forEach((f, i) => {
      const h = FM.teamById(league, f.homeId), a = FM.teamById(league, f.awayId), hs = f.stats && f.stats[h.id], as = f.stats && f.stats[a.id];
      let line = (i === 0 ? 'Latest match' : 'Match ' + (i + 1) + ' back') + ' (round ' + (f.round + 1) + '): ' + h.name + ' ' + f.hg + '-' + f.ag + ' ' + a.name + '.';
      if (hs && as) {
        const tot = (hs.possession || 0) + (as.possession || 0) || 1;
        const bits = Object.keys(STAT_NAMES).filter((k) => hs[k] != null && as[k] != null && k !== 'possession').map((k) => STAT_NAMES[k] + ' ' + (typeof hs[k] === 'number' && hs[k] % 1 ? hs[k].toFixed(2) : hs[k]) + ' to ' + (typeof as[k] === 'number' && as[k] % 1 ? as[k].toFixed(2) : as[k]));
        bits.push('possession ' + Math.round(100 * (hs.possession || 0) / tot) + '% to ' + Math.round(100 * (as.possession || 0) / tot) + '%');
        line += ' ' + h.name + ' to ' + a.name + ': ' + bits.join('; ') + '.';
      }
      out.push(line);
    });
    if (!played.length) out.push('No league match has been played yet.');
    try {
      const nx = FM.nextUserFixture(league);
      if (nx) { const opp = FM.teamById(league, nx.homeId === league.userId ? nx.awayId : nx.homeId); out.push('Next opponent: ' + opp.name + ' (round ' + (nx.round + 1) + ').'); }
    } catch (e) { /* fine */ }
    try {
      const rows = FM.tableRows(league), pos = rows.findIndex((r) => r.id === league.userId) + 1;
      if (pos) out.push('League position: ' + pos + ' of ' + rows.length + '.');
    } catch (e) { /* fine */ }
    try { if (FM.datasetDigest) out.push('', 'Recorded match data (use the id when asking for a picture of one match):', FM.datasetDigest(league)); } catch (e) { /* fine */ }
    return out.join('\n').slice(0, 7000);
  };

  function draw() {
    const root = document.getElementById('lmAgent');
    if (!root) return;
    root.classList.toggle('open', state.open);
    const log = root.querySelector('.ag-log');
    log.innerHTML = state.messages.map((m) => `<div class="ag-msg ${m.role}">${esc(m.text)}${m.html ? '<div class="ag-vis">' + m.html + '</div>' : ''}</div>`).join('') + (state.busy ? '<div class="ag-msg agent ag-think">Thinking…</div>' : '');
    log.scrollTop = log.scrollHeight;
    root.querySelector('.ag-send').disabled = state.busy;
  }

  async function send(text) {
    text = String(text || '').trim();
    if (!text || state.busy) return;
    state.messages.push({ role: 'manager', text });
    state.busy = true; draw();
    try {
      const out = await FM.api('/football/agent', { messages: state.messages.slice(-10).map((m) => ({ role: m.role, text: m.text })), context: state.ctx() });
      let html = '';
      (Array.isArray(out.show) ? out.show : []).slice(0, 3).forEach((spec) => { try { html += FM.dataVisual ? FM.dataVisual(window.FM_WORLD && window.FM_WORLD.league, spec) : ''; } catch (e) { /* skip a picture that cannot be drawn */ } });
      state.messages.push({ role: 'agent', text: out.reply || 'Tell me what you notice first.', html });
    } catch (e) {
      const msg = e && e.code === 'NO_SESSION' ? 'Sign in to LastMind and I can guide you through your matches.' : e && (e.code === 'LOCK_LIMIT_REACHED' || e.code === '402') ? 'You are out of Locks for now, so I cannot answer just yet.' : 'I could not be reached just now. Try again in a moment.';
      state.messages.push({ role: 'agent', text: msg });
    }
    state.busy = false; draw();
  }

  FM.agentOpen = function (starter) {
    state.open = true;
    if (!state.messages.length) state.messages.push({ role: 'agent', text: 'Hello, I am the LastMind AI Agent. Ask me anything: what a term means, how to read a heat map, or ask me to show you your build-up play, a pass network or how your shots have changed over the season. I can also take you through your matches step by step.' });
    draw();
    if (starter) send(starter);
  };

  FM.mountAgent = function (getContext) {
    state.ctx = getContext || state.ctx;
    if (document.getElementById('lmAgent')) return;
    const root = document.createElement('aside');
    root.id = 'lmAgent';
    root.setAttribute('aria-label', 'LastMind AI Agent');
    root.innerHTML = `<button type="button" class="ag-tab" aria-expanded="false">LastMind AI Agent</button>
      <div class="ag-panel"><div class="ag-head"><b>LastMind AI Agent</b><button type="button" class="ag-close" aria-label="Close">×</button></div>
        <div class="ag-log" role="log" aria-live="polite"></div>
        <form class="ag-form"><textarea rows="2" placeholder="Say what you notice, or ask what to look at…" aria-label="Message to the agent"></textarea><button class="ag-send primary" type="submit">Send</button></form></div>`;
    document.body.appendChild(root);
    const ta = root.querySelector('textarea');
    root.querySelector('.ag-tab').addEventListener('click', () => { state.open ? (state.open = false, draw()) : FM.agentOpen(); root.querySelector('.ag-tab').setAttribute('aria-expanded', String(state.open)); });
    root.querySelector('.ag-close').addEventListener('click', () => { state.open = false; draw(); });
    root.querySelector('.ag-form').addEventListener('submit', (e) => { e.preventDefault(); const t = ta.value; ta.value = ''; send(t); });
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); root.querySelector('.ag-form').requestSubmit(); } });
    draw();
  };
  FM.agentHide = function (hidden) { const r = document.getElementById('lmAgent'); if (r) r.hidden = !!hidden; };
})();
