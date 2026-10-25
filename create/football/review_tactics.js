// The tactical side of the review of the last match. Everything here is worked out in code from what was recorded in the match:
//   where the team was exposed (the area their chances came through), where giving the ball away led to chances, and where our own attacks kept stalling.
// Each finding gets a small pitch with the area marked and, where the match has a replay of the moment, that replay with the area and the shot drawn on it.
// The only thing a model is asked for is the wording around it (see /football/review-write): the facts are given to it, and it may not add any.
(function () {
  const FM = (window.FM = window.FM || {});
  const L = 105, W = 68;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f2 = (v) => (Math.round(v * 100) / 100).toFixed(2);
  const A = () => FM.ANALYSIS_DRAW;
  const CH = (w) => (w < 1 / 3 ? 'left' : w > 2 / 3 ? 'right' : 'centre');   // seen by the team attacking to the right: a small width is on its left
  const BAND = { left: [0, W / 3], centre: [W / 3, 2 * W / 3], right: [2 * W / 3, W] };
  const SIDE_NAME = { left: 'left side', right: 'right side', centre: 'middle' };

  // a position from the match record, as depth (from our own goal) and width, for the team attacking to the right
  const mineOf = (c, x, y) => (c.home ? { x: x, y: y } : { x: L - x, y: W - y });

  // ---------- what went wrong, found in code ----------
  FM.reviewFacts = function (c) {
    const out = [], log = c.fx.log, theirs = log.other.filter((e) => e.type === 'shot' && e.team !== c.me), xr = log.xr;
    const totalXg = theirs.reduce((a, e) => a + (e.xg || 0), 0);
    // 1. the area their chances came through
    if (theirs.length >= 3 && totalXg > 0) {
      const g = { left: { n: 0, xg: 0 }, centre: { n: 0, xg: 0 }, right: { n: 0, xg: 0 } };
      const dots = theirs.map((e) => { const p = mineOf(c, e.x, e.y), k = CH(p.y / W); g[k].n++; g[k].xg += e.xg || 0; return [p.x, p.y, e.outcome === 'goal' ? '#FFE27A' : '#FF5A36', e.xg || 0]; });
      const top = Object.keys(g).sort((a, b) => g[b].xg - g[a].xg)[0], share = g[top].xg / totalXg;
      if (g[top].n >= 2 && share >= (top === 'centre' ? 0.7 : 0.45)) {
        out.push({ id: 'exposed', kind: 'exposed', severity: share * totalXg * 4 + g[top].n * 0.1, title: 'Where we were exposed', clipKinds: ['conceded', 'chanceAgainst'],
          note: 'This is the part of the pitch to protect: someone has to cover it, or the ball has to be stopped before it gets there.',
          text: g[top].n === theirs.length ? `All ${theirs.length} of their shots, worth ${f2(totalXg)} xG, came down our ${SIDE_NAME[top]}.` : `${Math.round(share * 100)}% of the danger came down our ${SIDE_NAME[top]}: ${g[top].n} of their ${theirs.length} shots, worth ${f2(g[top].xg)} of their ${f2(totalXg)} xG.`,
          zone: { x0: 0, x1: L * 0.4, y0: BAND[top][0], y1: BAND[top][1], label: 'Exposed: our ' + SIDE_NAME[top] }, dots, dotNote: 'Each circle is one of their shots (yellow scored); the shaded area is where we were opened up.' });
      }
    }
    // 2. chances that came from us giving the ball away
    if (xr && theirs.length >= 2) {
      const losses = xr.seq.filter((q) => q[0] === c.side && q[6] === 0 && q[8] >= 0);
      const lead = losses.filter((q) => { const T = q[1] + q[7]; return theirs.some((e) => e.t >= T && e.t <= T + 15); });
      const shotsAfter = theirs.filter((e) => losses.some((q) => { const T = q[1] + q[7]; return e.t >= T && e.t <= T + 15; }));
      if (lead.length >= 2 && shotsAfter.length >= 2) {
        const xs = lead.map((q) => q[8] * L), ys = lead.map((q) => q[9] * W), pad = 8;
        const zone = { x0: Math.max(0, Math.min.apply(null, xs) - pad), x1: Math.min(L, Math.max.apply(null, xs) + pad), y0: Math.max(0, Math.min.apply(null, ys) - pad), y1: Math.min(W, Math.max.apply(null, ys) + pad), label: 'Where we gave it away' };
        const xgAfter = shotsAfter.reduce((a, e) => a + (e.xg || 0), 0);
        out.push({ id: 'turnover', kind: 'turnover', note: 'Giving the ball away here hands them a short route to goal, so the first pass needs to be safer, or there needs to be more support near the ball.', severity: (shotsAfter.length / theirs.length) * xgAfter * 4 + lead.length * 0.1, title: 'Giving the ball away', clipKinds: ['turnover', 'counterAgainst', 'chanceAgainst'],
          text: `${shotsAfter.length} of their ${theirs.length} shots came within 15 seconds of us losing the ball, and ${lead.length} of our ${losses.length} turnovers led straight to a chance.`,
          zone, dots: lead.map((q) => [q[8] * L, q[9] * W, '#FF5A36', 0.2]), dotNote: 'Each circle is a turnover that led to a shot against us; the shaded area is where most of them happened.' });
      }
    }
    // 3. where our own attacks kept stalling
    const fails = log.passes.filter((r) => r[1] === c.side && r[4] !== 1).map((r) => mineOf(c, r[5], r[6])).filter((p) => p.x / L >= 2 / 3);
    if (fails.length >= 4) {
      const g = { left: 0, centre: 0, right: 0 }; fails.forEach((p) => { g[CH(p.y / W)]++; });
      const top = Object.keys(g).sort((a, b) => g[b] - g[a])[0];
      if (g[top] / fails.length >= (top === 'centre' ? 0.7 : 0.45) && g[top] >= 3) {
        out.push({ id: 'attack', kind: 'attack', note: 'Our attacks keep ending here, so either the supply into this area has to change, or someone has to arrive to make a pass available.', severity: Math.min(1.5, g[top] * 0.06), title: 'Where our attacks stalled', clipKinds: ['chance'],
          text: `${g[top]} of our ${fails.length} failed passes in the final third came on our ${SIDE_NAME[top]}, so that is where our attacks kept breaking down.`,
          zone: { x0: L * 2 / 3, x1: L, y0: BAND[top][0], y1: BAND[top][1], label: 'Our attacks stalled here' }, dots: fails.map((p) => [p.x, p.y, '#FFB347', 0.15]), dotNote: 'Each circle is a pass we lost in the final third; the shaded area is where most of them were.' });
      }
    }
    return out.sort((a, b) => b.severity - a.severity).slice(0, 2);
  };

  // ---------- the small pitch with the area marked ----------
  function pitchWithZone(f) {
    const D = A(), px = (x) => (x / L * D.PW).toFixed(1), py = (y) => (y / W * D.PH).toFixed(1), z = f.zone;
    let inner = `<rect x="${px(z.x0)}" y="${py(z.y0)}" width="${(px(z.x1) - px(z.x0)).toFixed(1)}" height="${(py(z.y1) - py(z.y0)).toFixed(1)}" fill="#FF5A36" fill-opacity=".2" stroke="#FFB38F" stroke-width="3" stroke-dasharray="10 7"/>`;
    inner += `<text x="${(+px(z.x0) + 10).toFixed(1)}" y="${(z.y1 < W - 6 ? +py(z.y1) + 24 : +py(z.y0) - 8).toFixed(1)}" font-size="20" font-weight="800" fill="#fff" stroke="#000" stroke-width="4" style="paint-order:stroke">${esc(z.label)}</text>`;
    inner += f.dots.map((p) => `<circle cx="${px(p[0])}" cy="${py(p[1])}" r="${(8 + 16 * Math.sqrt(Math.min(p[3] || 0.1, 0.8))).toFixed(1)}" fill="${p[2]}" fill-opacity=".72" stroke="#fff" stroke-width="2"/>`).join('');
    inner += `<text x="${D.PW - 12}" y="${D.PH - 12}" text-anchor="end" font-size="18" fill="#fff" stroke="#000" stroke-width="4" style="paint-order:stroke">we attack &#8594;</text>`;
    return `<figure class="rv-fig rv-small"><svg class="amap rv-map" viewBox="0 0 ${D.PW} ${D.PH}" role="img" aria-label="${esc(f.title)}">${D.pitchLines()}${inner}</svg><figcaption>${esc(f.dotNote)}</figcaption></figure>`;
  }

  // ---------- the replay of the moment, with the area and the shot drawn on it ----------
  function pickClip(real, f) {
    const clips = (real && real.clips) || [];
    for (let i = 0; i < f.clipKinds.length; i++) { const c = clips.find((x) => x.kind === f.clipKinds[i]); if (c) return c; }
    return null;
  }
  function annotated(league, fx, clip, f) {
    const homeIsUser = fx.homeId === league.userId, userDir = clip.hd != null ? (homeIsUser ? clip.hd : -clip.hd) : (homeIsUser ? 1 : -1), mirror = userDir === -1, ours = homeIsUser ? 0 : 1;
    const sh = (clip.ev || []).find((e) => e[0] === 'shot' && e[2] !== ours), marks = [];
    if (sh) { let x = sh[4] / 10, y = sh[5] / 10; if (mirror) { x = L - x; y = W - y; } marks.push({ x, y, label: 'Their shot' }); }
    return Object.assign({}, clip, { annot: { zone: f.zone, marks } });
  }

  // ---------- the page ----------
  // facts -> html (and, once it is on the page, the replays are started with FM.reviewMount)
  FM.reviewTacticsHtml = function (c, real, facts, notes) {
    if (!facts.length) return '<article class="card rv-tac"><h3>The shape of the game</h3><p>Nothing stood out as a tactical weakness in this match: no one area of the pitch was opened up more than another, and the chances against us did not come from our own turnovers. Keep an eye on the next match.</p></article>';
    return facts.map((f) => {
      const clip = pickClip(real, f);
      return `<article class="card rv-tac" data-fact="${esc(f.id)}"><h3>${esc(f.title)}</h3><p class="rv-tac-line">${esc(f.text)}</p><p class="rv-tac-note" data-note="${esc(f.id)}">${esc((notes && notes[f.id]) || f.note || '')}</p>
        <div class="rv-tac-vis">${pitchWithZone(f)}${clip ? `<figure class="rv-fig rv-small"><div class="rv-clip" data-fact-clip="${esc(f.id)}"></div><figcaption>The replay of the moment: the shaded area is where we were vulnerable${clip.kind === 'conceded' || clip.kind === 'chanceAgainst' ? ', and the star is their shot' : ''}.</figcaption></figure>` : ''}</div></article>`;
    }).join('');
  };
  FM.reviewMount = function (host, league, real, facts) {
    if (!real || !FM.mountClipPlayer) return;
    facts.forEach((f) => {
      const slot = host.querySelector('[data-fact-clip="' + f.id + '"]'), clip = pickClip(real, f);
      if (slot && clip) FM.mountClipPlayer(slot, league, real, annotated(league, real, clip, f));
    });
  };

  // ---------- the wording ----------
  // The code's own lines, used when the wording cannot be asked for (a guest, no Locks, no connection) and until it arrives.
  FM.reviewIntroLines = function (c, facts, greet) {
    const gd = c.gf - c.ga, verdict = gd >= 3 ? 'a brilliant win' : gd >= 1 ? 'a good win' : gd === 0 ? 'a draw' : gd <= -3 ? 'a heavy defeat' : 'a defeat';
    const lines = [`${greet}. I have been through the game against ${c.opp.name}: ${c.team.name} ${c.gf}-${c.ga}, ${verdict}.`];
    if (facts.length) { lines.push('Here is where I think it went wrong tactically.'); facts.forEach((f) => lines.push(f.text)); } else lines.push('Nothing stood out as a tactical problem this time, which is a good sign.');
    lines.push('The pitch and the replay below show you where.');
    return lines;
  };
  // Asks for the wording once per match (a few Locks, Haiku), keeps it with the match, and hands it to done. Any failure is silent: the code's lines stay.
  FM.reviewWrite = async function (c, real, facts, greet, done) {
    return;   // the match review is written in code: wording from LastMind AI spent Locks, and only the agent chats use them
    if (!real || !FM.api) return;
    if (real.reviewNarr) { done(real.reviewNarr); return; }
    if (!facts.length || (FM.locksOut && FM.locksOut())) return;
    try {
      const out = await FM.api('/football/review-write', { greeting: greet, team: c.team.name, opp: c.opp.name, gf: c.gf, ga: c.ga, facts: facts.map((f) => ({ id: f.id, text: f.text })) });
      if (out && Array.isArray(out.intro) && out.intro.length) { real.reviewNarr = { intro: out.intro.slice(0, 6), notes: out.notes || {} }; if (FM.requestSave) FM.requestSave(); done(real.reviewNarr); }
    } catch (e) { /* the code's own lines are already on the page */ }
  };
})();
