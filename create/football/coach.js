/*
 * Elena's first words, and the squad's extremes. Two things live here:
 *   FM.squadHighlights(team)  which of the squad's numbers are extreme enough to mark (green strong, red weak), chosen by comparing each player with
 *                             the rest of the squad on the numbers that matter for his position, and what each one means in play.
 *   FM.coach                  the small card that appears in the top corner the first time a page is visited, which is read and closed.
 */
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const FACE = '/assets/football/elena-hello.jpg';

  // ---------- which numbers are extreme ----------
  // The numbers that matter for each position. A winger is not marked down for tackling, nor a centre-back for finishing.
  const RELEVANT = {
    GK: ['gk'],
    CB: ['pace', 'tackling', 'heading', 'passing', 'composure'],
    FB: ['pace', 'stamina', 'passing', 'dribbling', 'tackling'],
    DM: ['tackling', 'passing', 'stamina', 'composure'],
    CM: ['passing', 'stamina', 'dribbling', 'tackling'],
    AM: ['passing', 'dribbling', 'finishing', 'composure'],
    WF: ['pace', 'dribbling', 'finishing', 'passing'],
    ST: ['finishing', 'pace', 'heading', 'composure'],
  };
  const ROLE = { GK: 'goalkeeper', CB: 'centre-back', FB: 'full-back', DM: 'holding midfielder', CM: 'central midfielder', AM: 'attacking midfielder', WF: 'winger', ST: 'striker' };
  const OUTFIELD_STATS = ['pace', 'dribbling', 'passing', 'finishing', 'tackling', 'heading', 'composure', 'stamina'];
  const mean = (a) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
  const sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) * (x - m)))); };

  FM.squadHighlights = function (team) {
    const all = (team.players || []).concat(team.bench || []).filter((p) => p && p.ratings);
    const outfield = all.filter((p) => p.natural !== 'GK');
    const stat = {};
    OUTFIELD_STATS.forEach((s) => { const v = outfield.map((p) => p.ratings[s] || 0); stat[s] = { m: mean(v), sd: sd(v) }; });
    const cands = [];
    outfield.forEach((p) => (RELEVANT[p.natural] || []).forEach((s) => {
      const st = stat[s];
      if (!st || st.sd < 1) return;
      const z = (p.ratings[s] - st.m) / st.sd;
      if (z >= 1.3) cands.push({ p, s, z, kind: 'good' }); else if (z <= -1.3) cands.push({ p, s, z, kind: 'bad' });
    }));
    // a goalkeeper stands out only if he is plainly very good or very poor
    all.filter((p) => p.natural === 'GK').forEach((p) => {
      const g = p.ratings.gk || 0;
      if (g >= 78) cands.push({ p, s: 'gk', z: 2, kind: 'good' }); else if (g <= 48) cands.push({ p, s: 'gk', z: -2, kind: 'bad' });
    });
    // Only the extremes: the strongest few strengths and weaknesses of the whole squad, and never more than two marks on one player.
    cands.sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
    const perPlayer = {}, picks = [], count = { good: 0, bad: 0 };
    cands.forEach((c) => {
      const cap = c.kind === 'good' ? 7 : 6;
      if (count[c.kind] >= cap) return;
      if ((perPlayer[c.p.id] || 0) >= 2) return;
      perPlayer[c.p.id] = (perPlayer[c.p.id] || 0) + 1; count[c.kind]++; picks.push(c);
    });
    const marks = {};
    picks.forEach((c) => { (marks[c.p.id] = marks[c.p.id] || {})[c.s] = c.kind; });
    return { marks, picks };
  };

  // What an extreme number means in play, one line each, written for the position he plays.
  function meaning(c) {
    const p = c.p, n = '<b>' + esc(p.name) + '</b>', r = ROLE[p.natural] || 'player', g = p.natural, good = c.kind === 'good';
    const back = g === 'CB' || g === 'FB', mid = g === 'DM' || g === 'CM' || g === 'AM', fwd = g === 'WF' || g === 'ST';
    switch (c.s) {
      case 'pace':
        if (!good) return back ? n + ' is slow for a ' + r + '. Left alone against a quick forward, or with a high defensive line behind him, he could be exploited in behind. Consider a deeper line or cover for him.'
          : mid ? n + ' is slow for a ' + r + '. He will struggle to get back when you lose the ball, so protect the space behind him.'
          : n + ' lacks the pace for a ' + r + ': balls in behind will not suit him, so play to his feet.';
        return back ? n + ' is quick for a ' + r + '. He can handle a high defensive line and recover when beaten, which lets you push the team up.'
          : fwd ? n + ' has real pace. Passes in behind the defence are a genuine weapon with him on the pitch.' : n + ' covers the ground quickly, which helps in transitions both ways.';
      case 'finishing':
        return good ? n + ' is a clinical finisher: chances that fall to him are worth more than most, so get him into the box.'
          : n + ' is poor in front of goal for a ' + r + '. His shots are worth less, so look for a better-placed team-mate when the chance arrives.';
      case 'dribbling':
        return good ? n + ' can beat a man. Give him the ball one-on-one in wide or advanced areas.'
          : n + ' rarely beats a defender, so do not rely on him to dribble out of pressure.';
      case 'passing':
        return good ? n + ' is an accurate passer. He is the one to set the tempo and break the first line.'
          : n + ' is a weak passer for a ' + r + '. Under pressure he is likely to give the ball away, so do not make him your main outlet.';
      case 'tackling':
        return good ? n + ' wins the ball well, which makes him a good anchor when you press.'
          : n + ' is poor in the tackle for a ' + r + '. He is better dropping off and covering than stepping in to win it.';
      case 'heading':
        return good ? n + ' is strong in the air: a threat from corners and safe against long balls.'
          : n + ' is weak in the air. Be careful leaving him against a tall striker, and think about who marks at set pieces.';
      case 'composure':
        return good ? n + ' stays calm under pressure, so he can be trusted on the ball when the opposition press.'
          : n + ' is easily rattled. Closing him down quickly is likely to force mistakes, so keep him in quieter areas.';
      case 'stamina':
        return good ? n + ' can keep running all match, so his work rate will not drop late on.'
          : n + ' tires quickly. Expect his work rate to fall in the last half hour, and have a replacement in mind.';
      case 'gk':
        return good ? n + ' is a very good goalkeeper. He will save shots a lesser keeper would not.'
          : n + ' is a weak goalkeeper, so shots on target are more dangerous against you than they should be.';
      default: return '';
    }
  }
  FM.squadImpacts = function (team) {
    const h = FM.squadHighlights(team), seen = {}, out = [];
    // weaknesses first (they are what can hurt you), then strengths, one line per player
    h.picks.slice().sort((a, b) => (a.kind === b.kind ? Math.abs(b.z) - Math.abs(a.z) : a.kind === 'bad' ? -1 : 1)).forEach((c) => {
      if (seen[c.p.id]) return;
      seen[c.p.id] = 1;
      const text = meaning(c);
      if (text) out.push({ kind: c.kind, html: text });
    });
    return out.slice(0, 7);
  };

  // ---------- the card in the top corner ----------
  const KEY = 'lm_football_coach_v1';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } };
  const save = (d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* it only means the card shows again */ } };
  let styled = false, current = null;
  function css() {
    if (styled) return; styled = true;
    const st = document.createElement('style');
    st.textContent = [
      '.coach-card { position: fixed; top: 14px; right: 14px; z-index: 200; width: min(400px, calc(100vw - 28px)); max-height: calc(100vh - 28px); overflow: auto; background: #1A232D; color: #F1EAD6; border: 1px solid #F2C14E; border-radius: 16px; box-shadow: 0 18px 50px rgba(0,0,0,.5); padding: 14px 16px 16px; font: 14px/1.55 Arial, sans-serif; }',
      '.coach-head { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; } .coach-head img { width: 52px; height: 52px; border-radius: 50%; object-fit: cover; object-position: 50% 18%; border: 2px solid #F2C14E; flex: none; }',
      '.coach-head b { display: block; } .coach-head small { opacity: .7; } .coach-card .coach-x { margin-left: auto; flex: none; width: 32px; height: 32px; min-height: 0; padding: 0 !important; line-height: 1; display: grid; place-items: center; border-radius: 50%; border: 1px solid rgba(241,234,214,.35); background: transparent; color: inherit; cursor: pointer; } .coach-card .coach-x svg { display: block; width: 14px; height: 14px; }',
      '.coach-card h3 { margin: 4px 0 8px; font-size: 1.02rem; } .coach-card p { margin: 0 0 10px; } .coach-card ul { margin: 0 0 10px; padding: 0; list-style: none; display: grid; gap: 8px; }',
      '.coach-card li { padding: 8px 10px; border-radius: 10px; background: rgba(255,255,255,.06); border-left: 4px solid #F2C14E; } .coach-card li.good { border-left-color: #52bd7b; } .coach-card li.bad { border-left-color: #e5645a; }',
      '.coach-go { display: block; width: 100%; padding: 10px 14px; border: 0; border-radius: 10px; background: #E6D7B0; color: #1A232D; font: 800 .9rem Arial, sans-serif; cursor: pointer; }',
      '@media (max-width: 600px) { .coach-card { top: 8px; right: 8px; left: 8px; width: auto; } }',
    ].join('\n');
    document.head.appendChild(st);
  }
  FM.coach = {
    seen: (id) => !!load()[id],
    reset() { save({}); },
    close() { if (current) { current.remove(); current = null; } },
    // cfg: { title, html, button, onClose }. Shown once, unless cfg.force is set.
    show(id, cfg) {
      if (!cfg.force && load()[id]) return false;
      css(); FM.coach.close();
      const el = document.createElement('aside');
      el.className = 'coach-card'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Elena Marsh');
      el.innerHTML = '<div class="coach-head"><img alt="" src="' + FACE + '"><div><b>Elena Marsh</b><small>Performance analyst</small></div><button type="button" class="coach-x" aria-label="Close"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2 L12 12 M12 2 L2 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg></button></div>' +
        '<h3>' + esc(cfg.title) + '</h3>' + cfg.html + '<button type="button" class="coach-go">' + esc(cfg.button || 'Got it') + '</button>';
      document.body.appendChild(el); current = el;
      const done = () => { const d = load(); d[id] = true; save(d); FM.coach.close(); if (cfg.onClose) cfg.onClose(); };
      el.querySelector('.coach-x').addEventListener('click', done);
      el.querySelector('.coach-go').addEventListener('click', done);
      return true;
    },
  };

  // ---------- what she says on the pages ----------
  // The analysis that sits beside the squad list for good: each marked number, what it is, and what it means in a match.
  const STAT_NAME = { pace: 'Pace', dribbling: 'Dribbling', passing: 'Passing', finishing: 'Finishing', tackling: 'Tackling', heading: 'Heading', composure: 'Composure', stamina: 'Stamina', gk: 'Goalkeeping' };
  FM.squadAnalysisHtml = function (team) {
    const picks = FM.squadHighlights(team).picks.slice().sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
    if (!picks.length) return '<p>Nothing in this squad stands out as especially strong or weak, so there is no glaring weakness to protect and no single player to build around.</p>';
    // one entry for each player and kind: what each of his marked numbers means, with the numbers themselves
    const group = (kind) => {
      const by = {}, order = [];
      picks.filter((c) => c.kind === kind).forEach((c) => { if (!by[c.p.id]) { by[c.p.id] = []; order.push(c.p.id); } by[c.p.id].push(c); });
      return order.map((id) => {
        const cs = by[id];
        const chips = cs.map((c) => '<span class="sq-chip ' + kind + '">' + STAT_NAME[c.s] + ' ' + (FM.shown ? FM.shown(c.p.ratings[c.s]) : c.p.ratings[c.s]) + '</span>').join(' ');
        return '<li class="' + kind + '">' + cs.map((c, k) => (k ? meaning(c).replace(/^<b>[^<]*<\/b> /, 'He ') : meaning(c))).join(' ') + ' ' + chips + '</li>';
      });
    };
    const bad = group('bad'), good = group('good');
    return (bad.length ? '<h4>Weaknesses to protect</h4><ul>' + bad.join('') + '</ul>' : '') + (good.length ? '<h4>Strengths to use</h4><ul>' + good.join('') + '</ul>' : '');
  };
  FM.coachSquad = function (team, force) {
    if (!force && FM.coach.seen('squad-intro')) return;
    FM.coach.show('squad-intro' + (force ? '-again' : ''), {
      force: !!force, title: 'Welcome to the club',
      html: '<p>Hello, I am Elena Marsh, the performance analyst at the club. I will be going through the numbers with you this season.</p>' +
        '<p>We will start with your squad. Every player is listed with his ratings, grouped by position. Open a group to see the players in it.</p>' +
        '<p>A <b style="color:#7fe0a0">green</b> number is a real strength and a <b style="color:#ff8a80">red</b> one a real weakness, compared with the rest of the squad. Most players will not have any: most ratings sit close to the average. My notes on the ones that do are on the right of the list.</p>',
      button: 'Got it', onClose: () => { const d = load(); d['squad-intro'] = true; d['squad-extremes'] = true; save(d); const b = document.getElementById('toFormation'); if (b) b.focus(); },
    });
  };
  FM.coachFormation = function (force) {
    FM.coach.show('formation-intro' + (force ? '-again' : ''), {
      force: !!force, title: 'Choosing your formation',
      html: '<p>This is where you decide how the team lines up. The drop-down at the top chooses the formation, for example 4-3-3 or 4-2-2-2: the numbers are the defenders, the midfielders and the forwards, from the back.</p>' +
        '<p>To change who plays where, <b>drag one player onto another</b> and they swap places. A shirt dropped anywhere else springs back.</p>' +
        '<p>The bench is on the right. Click a substitute, then click the shirt he should replace.</p>' +
        '<p>Remember what the squad list showed: quick players are most useful where pace matters, and slower ones need protecting. Everything on the pages that follow is built from this shape.</p>',
      button: 'Got it',
    });
  };
})();
