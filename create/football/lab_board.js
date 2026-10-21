// The picture at the end of a test: where each team stood on average during it, on a horizontal pitch (your goal on the left, attacking to the right).
// Your players can be dragged a little way from where they stood; Apply moves them the same way on that phase's boards, so the match plays from there.
(function () {
  const FM = (window.FM = window.FM || {});
  const L = 105, W = 68, PS = 6, VW = L * PS, VH = W * PS, MAXMOVE = 12;   // a player is moved a few metres, not across the pitch
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const REV = { organised: true, transdef: true, press: true };

  // Average position of every player over all the stored tests of the run, in metres, with your team attacking to the right.
  function averages(result, phase) {
    const clips = (result && result.clips) || [], acc = { u: {}, o: {} };
    clips.forEach((q) => {
      const c = q.clip; if (!c || !c.f) return;
      const nu = c.ru.length;
      c.f.forEach((row) => {
        for (let i = 0; i < nu + c.ro.length; i++) {
          const side = i < nu ? 'u' : 'o', n = side === 'u' ? c.ru[i] : c.ro[i - nu];
          let x = row[i * 2] / 10, y = row[i * 2 + 1] / 10;
          if (c.mirror) { x = L - x; y = W - y; }
          const a = acc[side][n] || (acc[side][n] = { x: 0, y: 0, k: 0 }); a.x += x; a.y += y; a.k++;
        }
      });
    });
    const out = { ours: {}, theirs: {} }, flip = !!REV[phase];   // in a test of theirs against you, the clip has them attacking right: turn the picture round
    const mine = flip ? 'o' : 'u', other = flip ? 'u' : 'o';
    const put = (dst, src) => Object.keys(src).forEach((n) => { const a = src[n]; if (!a.k) return; let x = a.x / a.k, y = a.y / a.k; if (flip) { x = L - x; y = W - y; } dst[n] = { x, y }; });
    put(out.ours, acc[mine]); put(out.theirs, acc[other]);
    return out;
  }

  function mount(host, c) {
    const avg = averages(c.result, c.phase), pitch = FM.ANALYSIS_DRAW && FM.ANALYSIS_DRAW.pitchLines ? FM.ANALYSIS_DRAW.pitchLines() : '';
    const names = {}; c.team.players.forEach((p) => { names[p.number] = p.name.split(' ').slice(-1)[0]; });
    const pos = {}; Object.keys(avg.ours).forEach((n) => { pos[n] = { x: avg.ours[n].x, y: avg.ours[n].y, x0: avg.ours[n].x, y0: avg.ours[n].y }; });
    if (!Object.keys(pos).length) { host.innerHTML = ''; return; }
    host.innerHTML = `<div class="lb"><svg class="lb-svg" viewBox="0 0 ${VW} ${VH}" role="img" aria-label="Average positions"></svg><div class="lb-bar"><button type="button" class="primary" data-lb="apply" disabled>Apply</button><button type="button" data-lb="reset" disabled>Reset</button><span class="lb-msg" role="status"></span></div></div>`;
    const svg = host.querySelector('.lb-svg'), bApply = host.querySelector('[data-lb="apply"]'), bReset = host.querySelector('[data-lb="reset"]'), msg = host.querySelector('.lb-msg');
    const X = (m) => (m * PS).toFixed(1), moved = () => Object.keys(pos).filter((n) => Math.hypot(pos[n].x - pos[n].x0, pos[n].y - pos[n].y0) > 0.4);
    const draw = () => {
      let s = pitch;
      Object.keys(avg.theirs).forEach((n) => { const p = avg.theirs[n]; s += `<g class="lb-opp"><circle cx="${X(p.x)}" cy="${X(p.y)}" r="12" fill="#E8C547" stroke="#1b1b1b" stroke-width="2"/><text x="${X(p.x)}" y="${(p.y * PS + 4.5).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="800" fill="#1b1b1b">${esc(n)}</text></g>`; });
      Object.keys(pos).forEach((n) => { const p = pos[n], mv = Math.hypot(p.x - p.x0, p.y - p.y0) > 0.4;
        s += `<g class="lb-me" data-n="${esc(n)}" tabindex="0"><circle cx="${X(p.x)}" cy="${X(p.y)}" r="13" fill="${mv ? '#52bd7b' : '#1F8A4C'}" stroke="#fff" stroke-width="2.6"/><text x="${X(p.x)}" y="${(p.y * PS + 5).toFixed(1)}" text-anchor="middle" font-size="13" font-weight="800" fill="#fff">${esc(n)}</text><text x="${X(p.x)}" y="${(p.y * PS + 28).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" stroke="#000" stroke-width="3" paint-order="stroke">${esc(names[n] || '')}</text></g>`; });
      svg.innerHTML = s;
      const k = moved().length; bApply.disabled = !k; bReset.disabled = !k;
    };
    let drag = null;
    const toM = (e) => { const r = svg.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * L, y: (e.clientY - r.top) / r.height * W }; };
    svg.addEventListener('pointerdown', (e) => { const g = e.target.closest && e.target.closest('.lb-me'); if (!g) return; drag = g.dataset.n; svg.setPointerCapture(e.pointerId); msg.textContent = ''; e.preventDefault(); });
    svg.addEventListener('pointermove', (e) => {
      if (drag == null) return; const m = toM(e), p = pos[drag];
      let dx = m.x - p.x0, dy = m.y - p.y0; const d = Math.hypot(dx, dy); if (d > MAXMOVE) { dx *= MAXMOVE / d; dy *= MAXMOVE / d; }
      p.x = Math.max(1, Math.min(L - 1, p.x0 + dx)); p.y = Math.max(1, Math.min(W - 1, p.y0 + dy)); draw();
    });
    const end = () => { drag = null; };
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
    bReset.addEventListener('click', () => { Object.keys(pos).forEach((n) => { pos[n].x = pos[n].x0; pos[n].y = pos[n].y0; }); msg.textContent = ''; draw(); });
    bApply.addEventListener('click', () => {
      const moves = moved().map((n) => ({ number: +n, dd: (pos[n].x - pos[n].x0) / L, dw: (pos[n].y - pos[n].y0) / W }));
      const out = c.onApply ? c.onApply(moves) : null;
      Object.keys(pos).forEach((n) => { pos[n].x0 = pos[n].x; pos[n].y0 = pos[n].y; });
      msg.textContent = out && out.count ? 'Applied: ' + out.count + ' player' + (out.count === 1 ? '' : 's') + ' moved. Test again to see the effect.' : 'Nothing to change.'; draw();
    });
    draw();
  }
  FM.labBoard = { mount, averages };
})();
