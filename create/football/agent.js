// The Francesco: a tab on the right-hand edge of the game that opens a panel with a guide who takes the manager through analysing their
// own matches by asking questions. It is sent a compact summary of the latest matches and the page the manager is on, nothing else.
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const state = { open: false, busy: false, messages: [], ctx: () => '', loaded: false };

  // The chat is kept (in the browser's database, per account) so it is still there next time the game is opened.
  const histKey = () => 'agent:' + ((FM.accountId && FM.accountId()) || 'guest');
  const openDb = () => new Promise((resolve) => {
    try {
      const req = indexedDB.open('lastmind-football', 1);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('saves')) req.result.createObjectStore('saves'); };
      req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(null); req.onblocked = () => resolve(null);
    } catch (e) { resolve(null); }
  });
  async function loadHistory() {
    if (state.loaded) return;
    state.loaded = true;
    const d = await openDb(); let saved = null;
    if (d) saved = await new Promise((res) => { try { const r = d.transaction('saves').objectStore('saves').get(histKey()); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); } catch (e) { res(null); } });
    if (!saved) { try { saved = JSON.parse(localStorage.getItem(histKey()) || 'null'); } catch (e) { saved = null; } }
    if (Array.isArray(saved) && saved.length) state.messages = saved.concat(state.messages.filter((m) => !saved.some((s) => s.at === m.at)));
  }
  let saveTimer = 0;
  function saveHistory() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const keep = state.messages.slice(-80).map((m) => ({ role: m.role, text: m.text, show: m.show, at: m.at }));
      const d = await openDb();
      let ok = false;
      if (d) ok = await new Promise((res) => { try { const tx = d.transaction('saves', 'readwrite'); tx.objectStore('saves').put(keep, histKey()); tx.oncomplete = () => res(true); tx.onerror = () => res(false); tx.onabort = () => res(false); } catch (e) { res(false); } });
      if (!ok) { try { localStorage.setItem(histKey(), JSON.stringify(keep)); } catch (e) { /* the chat just is not kept */ } }
    }, 400);
  }
  const push = (m) => { m.at = m.at || Date.now() + Math.random(); state.messages.push(m); saveHistory(); return m; };

  const STAT_NAMES = { shots: 'shots', onTarget: 'shots on target', xg: 'expected goals', possession: 'possession (seconds with the ball)', passes: 'passes', passesCompleted: 'passes completed', tackles: 'tackles', corners: 'corners', fouls: 'fouls', dribbles: 'dribbles', saves: 'saves' };

  // A short plain-text summary of where the manager is in the game.
  FM.agentContext = function (league, view) {
    if (!league) return '';
    const me = FM.teamById(league, league.userId), out = [];
    out.push('Club: ' + me.name + '. Level: ' + league.tier + '. Season ' + league.season + '. Page open: ' + (view || 'home') + '.');
    { const lab = FM.tables && FM.tables.labSummary ? FM.tables.labSummary(league) : ''; if (lab) out.push(lab); }   // the manager's own test results come first, so they are never cut off
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
    try { if (FM.bizDigest) { const bd = FM.bizDigest(league); if (bd) out.push('', bd); } } catch (e) { /* fine */ }
    try { if (FM.datasetDigest) out.push('', 'Recorded match data (use the id when asking for a picture of one match):', FM.datasetDigest(league)); } catch (e) { /* fine */ }
    return out.join('\n').slice(0, 9000);
  };

  function draw() {
    const root = document.getElementById('lmAgent');
    if (!root) return;
    root.classList.toggle('open', state.open);
    const log = root.querySelector('.ag-log');
    state.messages.forEach((m) => {   // pictures are drawn from the saved data each time, so only what was asked for is kept
      if (m.html === undefined) { m.html = ''; (Array.isArray(m.show) ? m.show : []).slice(0, 3).forEach((spec) => { try { m.html += FM.dataVisual && window.FM_WORLD && window.FM_WORLD.league ? FM.dataVisual(window.FM_WORLD.league, spec) : ''; } catch (e) { /* skip a picture that cannot be drawn */ } }); }
    });
    log.innerHTML = state.messages.map((m) => `<div class="ag-msg ${m.role}">${esc(m.text)}${m.html ? '<div class="ag-vis">' + m.html + '</div>' : ''}</div>`).join('') + (state.busy ? '<div class="ag-msg agent ag-think">Thinking…</div>' : '');
    if (FM.mountClips && window.FM_WORLD && window.FM_WORLD.league) FM.mountClips(log, window.FM_WORLD.league);
    log.scrollTop = log.scrollHeight;
    root.querySelector('.ag-send').disabled = state.busy;
  }

  async function send(text) {
    text = String(text || '').trim();
    if (!text || state.busy) return;
    push({ role: 'manager', text });
    state.busy = true; draw();
    try {
      const out = await FM.api('/football/agent', { messages: state.messages.slice(-10).map((m) => ({ role: m.role, text: m.text })), context: state.ctx() });
      push({ role: 'agent', text: out.reply || 'Tell me what you notice first.', show: Array.isArray(out.show) ? out.show.slice(0, 3) : [] });
    } catch (e) {
      const msg = e && e.code === 'PII_DETECTED' ? e.message : e && e.code === 'NO_SESSION' ? 'Sign in to LastMind and I can guide you through your matches.' : e && (e.code === 'LOCK_LIMIT_REACHED' || e.code === '402') ? 'You have used your whole Locks allowance, so I cannot answer any more questions for now. Every answer the agent writes for you uses some of that allowance, and it is all spent. Your football game and everything saved in it carry on as normal.' : 'I could not be reached just now. Try again in a moment.';
      push({ role: 'agent', text: msg });
    }
    state.busy = false; draw();
  }

  FM.keepSideAgent = true;
  FM.agentOpen = async function (starter, opts) {
    state.open = true; draw();
    await loadHistory();   // the earlier conversation comes back
    if (!state.messages.length) push({ role: 'agent', text: 'Salve, I am Francesco, your assistant manager. Ask me anything: what a term means, how to read a heat map, or ask me to show you your build-up play, a pass network or how your shots have changed over the season. I can also take you through your matches step by step.' });
    draw();
    if (starter) send(starter);
    // a question that is prepared but not sent: it is in the box, and the manager can change it or send it
    if (opts && opts.prefill) { const root = document.getElementById('lmAgent'), ta = root && root.querySelector('textarea'); if (ta) { ta.value = opts.prefill; ta.focus(); } }
  };

  FM.mountAgent = function (getContext) {
    state.ctx = getContext || state.ctx;
    if (document.getElementById('lmAgent')) return;
    const root = document.createElement('aside');
    root.id = 'lmAgent';
    root.setAttribute('aria-label', 'Francesco');
    root.innerHTML = `<button type="button" class="ag-tab" aria-expanded="false">Francesco</button>
      <div class="ag-panel"><div class="ag-head"><b>Francesco</b><span><button type="button" class="ag-clear" title="Clear the chat history">Clear history</button><button type="button" class="ag-close" aria-label="Close">×</button></span></div>
        <div class="ag-log" role="log" aria-live="polite"></div>
        <form class="ag-form"><textarea rows="2" placeholder="Say what you notice, or ask what to look at…" aria-label="Message to the agent"></textarea><button class="ag-send primary" type="submit">Send</button></form></div>`;
    document.body.appendChild(root);
    const ta = root.querySelector('textarea');
    root.querySelector('.ag-tab').addEventListener('click', () => { state.open ? (state.open = false, draw()) : FM.agentOpen(); root.querySelector('.ag-tab').setAttribute('aria-expanded', String(state.open)); });
    root.querySelector('.ag-close').addEventListener('click', () => { state.open = false; draw(); });
    root.querySelector('.ag-clear').addEventListener('click', () => { if (!confirm('Clear the whole chat history with the agent?')) return; state.messages = []; saveHistory(); push({ role: 'agent', text: 'Fresh start. What would you like to look at?' }); draw(); });
    root.querySelector('.ag-form').addEventListener('submit', (e) => { e.preventDefault(); const t = ta.value; ta.value = ''; send(t); });
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); root.querySelector('.ag-form').requestSubmit(); } });
    draw();
  };
  FM.agentHide = function (hidden) { const r = document.getElementById('lmAgent'); if (r) r.hidden = !!hidden; };
})();
