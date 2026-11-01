// The Books, Rafael's chat and the board room are written about Ashford Rovers plc. When the manager has chosen another club, the club's name takes
// Ashford's place in them (the people stay the same: Rafael, the assistants and the board keep their names, only the club changes).
(function () {
  const FM = (window.FM = window.FM || {});
  const ROOTS = ['view-board', 'lmRafael', 'rafaelWelcome', 'view-home'];
  const SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1 };
  const clubName = () => { try { const lg = window.FM_WORLD && window.FM_WORLD.league; const t = lg && FM.teamById(lg, lg.userId); return t ? t.name : null; } catch (e) { return null; } };
  const shortName = (n) => n.replace(/\s+(FC|AFC|United|Town|City|Athletic|Rovers|Albion|Wanderers|Rangers|County|Borough|Rail|Vale|Junction|Steel|Wexley)$/i, '').trim() || n;
  FM.myClubName = () => clubName() || 'Ashford Rovers';
  function fix(root, name, short) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = []; for (let n = w.nextNode(); n; n = w.nextNode()) if (n.nodeValue.indexOf('Ashford') >= 0 && !(n.parentNode && SKIP[n.parentNode.nodeName])) nodes.push(n);
    nodes.forEach((n) => { n.nodeValue = n.nodeValue.replace(/Ashford Rovers/g, name).replace(/Ashford/g, short); });
  }
  let queued = false;
  function run() {
    queued = false;
    const name = clubName(); if (!name || name === 'Ashford Rovers') return;
    const short = shortName(name);
    ROOTS.forEach((id) => { const r = document.getElementById(id); if (r) fix(r, name, short); });
  }
  const queue = () => { if (!queued) { queued = true; setTimeout(run, 60); } };
  document.addEventListener('DOMContentLoaded', () => {
    new MutationObserver(queue).observe(document.body, { childList: true, subtree: true, characterData: true });
    queue();
  });
})();
