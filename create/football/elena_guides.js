/*
 * The guided lessons (see elena_guide.js for how they run). Every lesson works on the manager's own matches: the passes and shots in the logs of
 * this season, the friendlies and last season. Nothing is told before it has been asked: each idea comes out of a question about those numbers,
 * then it is named, then a deeper explanation follows. Each lesson ends in a tactic: a draft instruction written into the box on the page.
 */
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pc = (x) => Math.round(x * 100);
  const f1 = (x) => (Math.round(x * 10) / 10).toString();
  const f2 = (x) => (Math.round(x * 100) / 100).toString();
  const f3 = (x) => (Math.round(x * 1000) / 1000).toString();
  const sig = (z) => 1 / (1 + Math.exp(-z));
  const LEVEL = { gcse: 0, alevel: 1, above: 2 };
  const SUB = { 0: '₀', 1: '₁', 2: '₂' };

  // ---------- the numbers: every pass and shot of the user's club that has been logged ----------
  function gather(lg) {
    const out = { build: [], midfield: [], final: [], all: [], shots: [], setShots: [], matches: 0 };
    if (!lg) return out;
    const me = lg.userId;
    const past = (lg.seed === FM.WORLD_SEED && FM.LAST_SEASON && FM.LAST_SEASON.matches) || [];
    const fxs = (lg.fixtures || []).concat(lg.friendlies || []).concat(past).filter((f) => f.played && f.log && (f.homeId === me || f.awayId === me));
    fxs.forEach((f) => {
      const log = f.log, idx = f.homeId === me ? 0 : 1, flip = idx === 1;
      out.matches++;
      (log.passes || []).forEach((p) => {
        if (p[4] === 2 || p[1] !== idx) return;
        const d = flip ? 1 - p[5] / 105 : p[5] / 105;
        const r = { ok: p[4] === 1 ? 1 : 0, press: Math.min(30, p[9]), len: p[7], lane: p[8] };
        out.all.push(r); (d < 0.33 ? out.build : d < 0.66 ? out.midfield : out.final).push(r);
      });
      (log.other || []).forEach((e) => {
        if (e.type !== 'shot' || e.team !== me) return;
        const goal = e.outcome === 'goal' ? 1 : 0;
        if (e.setPiece) out.setShots.push({ goal, kind: e.setPiece });
        if (typeof e.x === 'number' && typeof e.y === 'number' && !e.setPiece) {
          const xu = flip ? 105 - e.x : e.x, dx = 105 - xu, dy = e.y - 34;
          const dist = Math.hypot(dx, dy), ang = Math.atan2(7.32 * dx, dx * dx + dy * dy - 3.66 * 3.66);
          out.shots.push({ goal, xg: e.xg || 0, dist, ang: ang < 0 ? ang + Math.PI : ang, def: Math.min(30, e.defDist || 10) });
        }
      });
    });
    return out;
  }
  FM.guideContext = function () {
    const lg = window.FM_WORLD && FM_WORLD.league;
    const team = lg && FM.teamById ? FM.teamById(lg, lg.userId) : null;
    return { league: lg, team, level: lg ? (LEVEL[lg.tier] || 0) : 0, data: gather(lg) };
  };

  // ---------- statistics ----------
  const mean = (a) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
  function quart(v) {
    const s = v.slice().sort((a, b) => a - b), n = s.length, med = (a) => { const m = a.length; return m % 2 ? a[(m - 1) / 2] : (a[m / 2 - 1] + a[m / 2]) / 2; };
    const lo = s.slice(0, Math.floor(n / 2)), hi = s.slice(Math.ceil(n / 2));
    const q1 = lo.length ? med(lo) : s[0], q3 = hi.length ? med(hi) : s[n - 1], iqr = q3 - q1;
    return { s, n, median: med(s), q1, q3, iqr, lo: q1 - 1.5 * iqr, hi: q3 + 1.5 * iqr };
  }
  // logistic regression by Newton's method (iteratively reweighted least squares)
  function solve(A, b) {
    const n = b.length, M = A.map((r, i) => r.concat([b[i]]));
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      [M[c], M[p]] = [M[p], M[c]];
      const d = M[c][c] || 1e-12;
      for (let r = 0; r < n; r++) if (r !== c) { const k = M[r][c] / d; for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j]; }
    }
    return M.map((r, i) => r[n] / (r[i] || 1e-12));
  }
  function invDiag(A) {
    const n = A.length, out = [];
    for (let i = 0; i < n; i++) { const e = new Array(n).fill(0); e[i] = 1; out.push(solve(A, e)[i]); }
    return out;
  }
  function logLik(b, X, y) {
    let s = 0;
    for (let i = 0; i < y.length; i++) {
      let z = b[0]; for (let j = 0; j < X[i].length; j++) z += b[j + 1] * X[i][j];
      const p = Math.min(1 - 1e-9, Math.max(1e-9, sig(z)));
      s += y[i] ? Math.log(p) : Math.log(1 - p);
    }
    return s;
  }
  function fitLogit(X, y) {
    const k = X[0].length + 1; let b = new Array(k).fill(0), H = null;
    for (let it = 0; it < 40; it++) {
      const g = new Array(k).fill(0); H = Array.from({ length: k }, () => new Array(k).fill(0));
      for (let i = 0; i < y.length; i++) {
        const row = [1].concat(X[i]); let z = 0; for (let j = 0; j < k; j++) z += b[j] * row[j];
        const p = sig(z), w = p * (1 - p) + 1e-9;
        for (let j = 0; j < k; j++) { g[j] += (y[i] - p) * row[j]; for (let l = 0; l < k; l++) H[j][l] += w * row[j] * row[l]; }
      }
      for (let j = 0; j < k; j++) H[j][j] += 1e-6;
      const d = solve(H, g); let mx = 0;
      for (let j = 0; j < k; j++) { b[j] += d[j]; mx = Math.max(mx, Math.abs(d[j])); }
      if (mx < 1e-7) break;
    }
    const v = invDiag(H);
    return { b, se: v.map((x) => Math.sqrt(Math.max(0, x))), ll: logLik(b, X, y) };
  }
  function wilson(k, n) {
    if (!n) return [0, 1];
    const z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
    return [(c - m) / d, (c + m) / d];
  }

  // ---------- small drawing helpers (the card is dark) ----------
  const COL = { ink: '#F1EAD6', dim: 'rgba(241,234,214,.55)', gold: '#F2C14E', green: '#52bd7b', red: '#e5645a', blue: '#7aa2ff', grid: 'rgba(241,234,214,.14)' };
  function chart(w, h, pad) { return { w, h, pad, X0: pad.l, X1: w - pad.r, Y0: h - pad.b, Y1: pad.t }; }
  const lerp = (a, b, t) => a + (b - a) * t;
  function axes(c, xmax, xlabel, ylabel) {
    let s = '';
    [0, 25, 50, 75, 100].forEach((p) => { const y = lerp(c.Y0, c.Y1, p / 100); s += '<line x1="' + c.X0 + '" y1="' + y + '" x2="' + c.X1 + '" y2="' + y + '" stroke="' + COL.grid + '"/><text x="' + (c.X0 - 5) + '" y="' + (y + 4) + '" text-anchor="end" font-size="10" fill="' + COL.dim + '">' + p + '%</text>'; });
    const ticks = 5;
    for (let i = 0; i <= ticks; i++) { const x = lerp(c.X0, c.X1, i / ticks); s += '<text x="' + x + '" y="' + (c.Y0 + 16) + '" text-anchor="middle" font-size="10" fill="' + COL.dim + '">' + Math.round(xmax * i / ticks) + '</text>'; }
    s += '<text x="' + ((c.X0 + c.X1) / 2) + '" y="' + (c.h - 4) + '" text-anchor="middle" font-size="11" fill="' + COL.ink + '">' + esc(xlabel) + '</text>';
    return s;
  }
  const px = (c, x, xmax) => lerp(c.X0, c.X1, x / xmax), py = (c, p) => lerp(c.Y0, c.Y1, p);

  // ---------- writing a draft into the instruction box of the page ----------
  function fillInstruction(text) {
    const fold = document.querySelector('#tabBody .bp-instr .in-fold:not(.open), #tabBody .in-fold:not(.open)');
    if (fold) fold.click();
    const ta = document.querySelector('#tabBody textarea[data-scope]');
    if (!ta) return null;
    ta.value = text; ta.dispatchEvent(new Event('input', { bubbles: true }));
    return ta;
  }
  const instrTargets = () => Array.from(document.querySelectorAll('#tabBody .bp-instr, #tabBody .in-wrap')).filter((e) => e.offsetWidth).slice(0, 1);
  const goButton = () => Array.from(document.querySelectorAll('#tabBody .in-go[data-understand]')).slice(0, 1);
  const board = () => Array.from(document.querySelectorAll('#tabBody .board-host')).filter((e) => e.offsetWidth).slice(0, 2);

  // =====================================================================================================
  // Predicting whether a pass is completed: logistic regression (build-up)
  // =====================================================================================================
  FM.guides.logistic = {
    id: 'logistic', title: 'Will this pass be completed?', min: 1, pages: ['build'],
    blurb: 'Build a model of your own passes from your own matches, then turn it into an instruction.',
    prepare(ctx) {
      const D = ctx.data.build, y = D.map((r) => r.ok), n = D.length, ok = y.reduce((a, b) => a + b, 0);
      const edges = [0, 2, 4, 6, 8, 10, 15, 20, 30.01], bins = [];
      for (let i = 0; i < edges.length - 1; i++) {
        const rows = D.filter((r) => r.press >= edges[i] && r.press < edges[i + 1]);
        if (rows.length) bins.push({ lo: edges[i], hi: edges[i + 1], n: rows.length, ok: rows.reduce((a, r) => a + r.ok, 0), x: mean(rows.map((r) => r.press)) });
      }
      bins.forEach((b) => { b.p = b.ok / b.n; });
      const X1 = D.map((r) => [r.press]), X2 = D.map((r) => [r.press, r.len]);
      const fit1 = n >= 30 ? fitLogit(X1, y) : { b: [0, 0.1], se: [1, 1], ll: 0 }, fit2 = n >= 30 ? fitLogit(X2, y) : { b: [0, 0.1, 0], se: [1, 1, 1], ll: 0 };
      // the straight line through the points (least squares on the passes themselves)
      const mx = mean(D.map((r) => r.press)), my = ok / Math.max(1, n);
      let sxy = 0, sxx = 0; D.forEach((r) => { sxy += (r.press - mx) * (r.ok - my); sxx += (r.press - mx) * (r.press - mx); });
      const lb = sxx ? sxy / sxx : 0, la = my - lb * mx;
      Object.assign(ctx, { L: { D, y, n, ok, p: n ? ok / n : 0, bins, fit1, fit2, la, lb, mx } });
    },
    build(ctx) {
      const Z = ctx.L, b = Z.fit1.b;
      const near = Z.bins.find((x) => x.lo >= 2) || Z.bins[1] || Z.bins[0] || { ok: 1, n: 2 };
      const hiBins = Z.D.filter((r) => r.press >= 10), hiP = hiBins.length ? hiBins.reduce((a, r) => a + r.ok, 0) / hiBins.length : 0.8;
      const loBins = Z.D.filter((r) => r.press < 2), loP = loBins.length ? loBins.reduce((a, r) => a + r.ok, 0) / loBins.length : 0.5;
      let xl = Z.lb > 0 ? Math.ceil((1 - Z.la) / Z.lb) + 10 : 45; if (!(xl > 20 && xl < 200)) xl = 45;
      const lineAt = (x) => (Z.la + Z.lb * x) * 100;
      const or = Math.exp(b[1]);
      const nearFail = near.n - near.ok;
      const best = { b0: b[0], b1: b[1], ll: Z.fit1.ll };
      const spaceFor = (p) => (Math.log(p / (1 - p)) - b[0]) / (b[1] || 1e-9);
      return [
        {
          target: board, title: 'Space on the ball',
          lines: [`Your goalkeeper has the ball and has to choose a team-mate.`, `You have played <b>${Z.n}</b> passes in your own third (this season, the friendlies and last season).`, `<b>${Z.ok}</b> of them reached the team-mate: <b>${pc(Z.p)}%</b>.`, `That one number hides a lot. Some receivers were safe and some were not.`, `For every pass the log keeps three measurements: how far it travelled, how clear the lane was, and how far the nearest opponent stood from the receiver.`, `We will start with the last one and call it <b>space</b>.`],
          why: [`Clubs do this for every pass they log. The result is a number for each pass: how likely it was to come off.`, `That is how an analyst separates a brave pass that failed from a careless one.`],
        },
        {
          title: 'What your passes say',
          lines: [`Every pass is sorted by how many metres separated the receiver from the nearest opponent.`],
          ask: { kind: 'number', unit: '%', q: [`Before you see the chart: of the passes to a receiver with <b>10 m or more</b> of space, what percentage do you think were completed?`], answer: () => hiP * 100, tol: 8,
            hint: (c, v, a) => (v > a ? 'Lower than that. Passes fail for other reasons too.' : 'Higher than that. Space helps a lot.'),
            reveal: [`<b>${pc(hiP)}%</b> of passes to a receiver with 10 m or more of space were completed (${hiBins.length} passes).`, `With the nearest opponent inside 2 m it was <b>${pc(loP)}%</b> (${loBins.length} passes).`, `Space matters. Look at how the rate climbs: it is not a straight rise.`] },
          widget(box, c, api, s) {
            if (!s.done) { box.innerHTML = '<p class="gd-cap">The chart appears when you have answered.</p>'; return; }
            const ch = chart(400, 190, { l: 36, r: 10, t: 12, b: 34 }); let h = '<svg viewBox="0 0 400 190">' + axes(ch, 30, 'Space: metres to the nearest opponent', '');
            Z.bins.forEach((bn) => {
              const x0 = px(ch, bn.lo, 30), x1 = px(ch, Math.min(bn.hi, 30), 30), y = py(ch, bn.p), lo = wilson(bn.ok, bn.n);
              h += '<rect x="' + (x0 + 2) + '" y="' + y + '" width="' + Math.max(2, x1 - x0 - 4) + '" height="' + (ch.Y0 - y) + '" fill="' + COL.blue + '" opacity=".75"/><line x1="' + ((x0 + x1) / 2) + '" y1="' + py(ch, lo[0]) + '" x2="' + ((x0 + x1) / 2) + '" y2="' + py(ch, lo[1]) + '" stroke="' + COL.ink + '"/><text x="' + ((x0 + x1) / 2) + '" y="' + (ch.Y0 - 4) + '" text-anchor="middle" font-size="9" fill="#10202a">' + bn.n + '</text>';
            });
            box.innerHTML = h + '</svg><p class="gd-cap">Share completed for each band of space. The whisker is the 95% interval; the number inside each bar is how many passes it rests on.</p>';
          },
        },
        {
          title: 'Why not draw a straight line?',
          lines: [`The simplest model is a straight line through the points: every extra metre adds the same amount to the completion rate.`, `The line through your passes is <b>completion = ${f1(Z.la * 100)}% + ${f2(Z.lb * 100)}% × space</b>.`],
          ask: { kind: 'number', unit: '%', q: [`What completion rate does that line predict for a receiver with <b>${xl} m</b> of space?`], answer: () => lineAt(xl), tol: 0.8, hint: 'Work it out: the starting percentage plus the percentage per metre times the metres.',
            reveal: [`The line says <b>${f1(lineAt(xl))}%</b>.`, `A pass cannot be completed more than 100% of the time, and nothing can be below 0%.`, `A straight line has no way of knowing that. At the far end it keeps climbing through 100%.`, `We need a curve that flattens as it nears 0% and 100%.`] },
          widget(box, c, api, s) {
            const ch = chart(400, 190, { l: 36, r: 10, t: 12, b: 34 }), xm = Math.max(30, xl + 5), ymax = 1.3;
            const yv = (p) => lerp(ch.Y0, ch.Y1, Math.min(ymax, Math.max(-0.1, p)) / ymax);
            let h = '<svg viewBox="0 0 400 190"><line x1="' + ch.X0 + '" y1="' + yv(1) + '" x2="' + ch.X1 + '" y2="' + yv(1) + '" stroke="' + COL.red + '" stroke-dasharray="4 3"/><text x="' + (ch.X1) + '" y="' + (yv(1) - 4) + '" text-anchor="end" font-size="10" fill="' + COL.red + '">100%</text>';
            Z.bins.forEach((bn) => { h += '<circle cx="' + px(ch, bn.x, xm) + '" cy="' + yv(bn.p) + '" r="' + (3 + Math.min(5, bn.n / 60)) + '" fill="' + COL.blue + '"/>'; });
            h += '<line x1="' + px(ch, 0, xm) + '" y1="' + yv(Z.la) + '" x2="' + px(ch, xm, xm) + '" y2="' + yv(Z.la + Z.lb * xm) + '" stroke="' + COL.gold + '" stroke-width="2"/>';
            for (let i = 0; i <= 5; i++) { const x = lerp(ch.X0, ch.X1, i / 5); h += '<text x="' + x + '" y="' + (ch.Y0 + 16) + '" text-anchor="middle" font-size="10" fill="' + COL.dim + '">' + Math.round(xm * i / 5) + ' m</text>'; }
            box.innerHTML = h + '</svg><p class="gd-cap">Blue: the bands from the last chart. Gold: the straight line, carried on to ' + Math.round(xm) + ' m.</p>';
          },
        },
        {
          title: 'Odds',
          lines: [`Look at one band instead: passes to a receiver with <b>${near.lo} to ${near.hi} m</b> of space.`, `<b>${near.ok}</b> were completed and <b>${nearFail}</b> failed.`],
          ask: { kind: 'number', q: [`For every pass that failed, how many were completed?`], answer: () => near.ok / Math.max(1, nearFail), tol: 0.06, hint: 'Completed divided by failed.',
            reveal: [`<b>${f2(near.ok / Math.max(1, nearFail))}</b> completed for every one that failed.`, `Gamblers call this the <b>odds</b>: completed ÷ failed.`, `A probability of 50% is odds of 1 (even). 75% is odds of 3. 90% is odds of 9.`, `Odds have a useful property: they can be multiplied. That is the next step.`] },
          why: [`Betting markets and risk models both work in odds, because a change in the situation tends to scale the odds rather than add to the probability.`],
        },
        {
          title: 'From multiplying to adding',
          lines: [`Suppose each extra metre of space multiplies the odds of completion by <b>1.2</b>.`, `At 0 m the odds are <b>3</b>.`],
          ask: { kind: 'number', q: [`What are the odds at 10 m?`], answer: () => 3 * Math.pow(1.2, 10), tol: 0.15, hint: 'Multiply by 1.2 ten times: 3 × 1.2 × 1.2 …',
            reveal: [`3 × 1.2 ten times is <b>${f1(3 * Math.pow(1.2, 10))}</b>.`, `Multiplying ten times is awkward when a model has several factors.`, `The logarithm turns multiplying into adding: ln(18.6) = ln(3) + 10 × ln(1.2).`, `So the <b>log of the odds</b> rises by the same amount for every metre. On that scale the relationship is a straight line, which is exactly what a straight line is good at.`] },
          formula: `ln( p ÷ (1 − p) ) = b₀ + b₁ × space`,
          lines2: null,
        },
        {
          title: 'Fit the curve yourself',
          gate: true,
          lines: [`Turn that straight line back into a probability and you get an S-shaped curve.`, `p = 1 ÷ (1 + e<sup>−(b₀ + b₁ × space)</sup>)`, `Move the two sliders until the curve sits as close to the blue points as you can.`, `The score is how likely the curve says your <b>${Z.n}</b> real passes were. Higher is better.`],
          widget(box, c, api, s) {
            const sh = api.shared;
            if (!sh.fit) { sh.fit = { b0: -1, b1: 0.05 }; }
            const ch = chart(400, 180, { l: 36, r: 10, t: 10, b: 30 });
            const worst = logLik([0, 0], Z.D.map((r) => [r.press]), Z.y), bestLL = Z.fit1.ll;
            const draw = () => {
              const f = sh.fit, ll = logLik([f.b0, f.b1], Z.D.map((r) => [r.press]), Z.y);
              const closeness = Math.max(0, Math.min(1, (ll - worst) / (bestLL - worst || 1)));
              let h = '<svg viewBox="0 0 400 180">' + axes(ch, 30, 'Space: metres to the nearest opponent', '');
              Z.bins.forEach((bn) => { h += '<circle cx="' + px(ch, bn.x, 30) + '" cy="' + py(ch, bn.p) + '" r="' + (3 + Math.min(5, bn.n / 60)) + '" fill="' + COL.blue + '"/>'; });
              let d = ''; for (let i = 0; i <= 60; i++) { const x = i * 0.5; d += (i ? 'L' : 'M') + px(ch, x, 30).toFixed(1) + ' ' + py(ch, sig(f.b0 + f.b1 * x)).toFixed(1); }
              h += '<path d="' + d + '" fill="none" stroke="' + COL.gold + '" stroke-width="2.5"/></svg>';
              box.querySelector('#fitSvg').innerHTML = h;
              box.querySelector('#fitScore').textContent = Math.round(closeness * 100) + '%';
              box.querySelector('#fitBar').style.width = Math.round(closeness * 100) + '%';
              box.querySelector('#fitV').textContent = 'b₀ = ' + f2(f.b0) + ', b₁ = ' + f3(f.b1);
              if (closeness >= 0.985 || sh.shown) api.ready(true);
            };
            box.innerHTML = '<div id="fitSvg"></div><label class="gd-cap">b₀ (where the curve starts)<input id="fitB0" type="range" min="-4" max="3" step="0.05" value="' + sh.fit.b0 + '"></label><label class="gd-cap">b₁ (how steeply it rises with space)<input id="fitB1" type="range" min="-0.1" max="0.8" step="0.005" value="' + sh.fit.b1 + '"></label>' +
              '<div class="gd-cap">Closeness to the best possible score: <b id="fitScore"></b> <span id="fitV"></span></div><div style="height:8px;background:rgba(255,255,255,.12);border-radius:5px"><div id="fitBar" style="height:8px;border-radius:5px;background:#F2C14E;width:0"></div></div>' +
              '<div><button type="button" class="gd-link" id="fitShow">Show me the best curve</button></div>';
            box.querySelector('#fitB0').addEventListener('input', (e) => { sh.fit.b0 = +e.target.value; draw(); });
            box.querySelector('#fitB1').addEventListener('input', (e) => { sh.fit.b1 = +e.target.value; draw(); });
            box.querySelector('#fitShow').addEventListener('click', () => { sh.fit = { b0: best.b0, b1: best.b1 }; sh.shown = true; box.querySelector('#fitB0').value = best.b0; box.querySelector('#fitB1').value = best.b1; draw(); });
            draw();
          },
        },
        {
          title: 'What is the score?',
          lines: [`Each real pass gets a score from the curve: the probability the curve gave to <b>what actually happened</b>.`],
          ask: { kind: 'number', q: [`The curve gave 0.8 to a pass that was completed, and gave 0.3 to a pass that failed (so it gave 0.7 to failing).`, `What probability did the curve give to exactly what happened in these two passes together?`], answer: () => 0.56, tol: 0.005, hint: 'Both things had to happen, so multiply the two probabilities.',
            reveal: [`0.8 × 0.7 = <b>0.56</b>.`, `Over ${Z.n} passes you multiply ${Z.n} numbers, which becomes impossibly small. So the logarithms are added instead. That total is the <b>log-likelihood</b>, the score you were moving.`, `Choosing the curve that makes your real data the least surprising is called <b>maximum likelihood</b>.`, `The computer finds it by trying a direction, adjusting b₀ and b₁, and repeating until the score stops rising. That is <b>logistic regression</b>.`] },
          why: [`The same method sits behind expected goals, injury risk models and the tools clubs use to rank transfer targets.`],
        },
        {
          title: 'What the numbers mean',
          lines: [`The best curve for your passes has <b>b₀ = ${f2(b[0])}</b> and <b>b₁ = ${f3(b[1])}</b>.`, `With a margin of error of about ± ${f3(1.96 * Z.fit1.se[1])} on b₁ (95%).`, `b₁ is the change in the log-odds for each extra metre of space.`, `Each extra metre multiplies the odds by <b>${f3(or)}</b>.`],
          ask: { kind: 'number', q: [`By what factor do the odds of completion change when the receiver has <b>5 extra metres</b> of space?`], answer: () => Math.pow(or, 5), tol: Math.max(0.03, 0.01 * Math.pow(or, 5)), hint: `Multiply ${f3(or)} by itself five times.`,
            reveal: [`${f3(or)}<sup>5</sup> = <b>${f2(Math.pow(or, 5))}</b>.`, `Five more metres of space makes the odds ${f2(Math.pow(or, 5))} times as high.`, `If the interval for b₁ did not contain 0 we would say space really does matter. ${Z.fit1.b[1] - 1.96 * Z.fit1.se[1] > 0 ? 'It does not contain 0, so it does.' : 'It contains 0 here, so more passes are needed before trusting it.'}`] },
        },
        {
          title: 'Where to trust it',
          lines: [`Passes are sorted by what the model predicted, and compared with what happened.`],
          ask: { kind: 'choice', q: [`Where would you trust the model least?`], correct: 1,
            options: [{ t: 'In the groups with the most passes', fb: 'More passes means more evidence, so the opposite.' }, { t: 'In the groups with the fewest passes', fb: '' }, { t: 'Equally everywhere', fb: 'Not equally: each part of the curve rests on only the passes near it.' }],
            reveal: [`Each part of the curve rests only on the passes near it.`, `Where there are few passes (very large or very small amounts of space) the curve is mostly the shape you asked for, not what the data showed.`, `A model is only as good as the data behind each stretch of it. Never use it far outside the range you have seen.`] },
          widget(box, c, api, s) {
            const rows = Z.D.map((r) => ({ p: sig(b[0] + b[1] * r.press), ok: r.ok })).sort((a, d) => a.p - d.p), g = 5, size = Math.ceil(rows.length / g);
            let h = '<table><tr><th>Model said</th><th>Passes</th><th>Predicted</th><th>Happened</th></tr>';
            for (let i = 0; i < g; i++) { const part = rows.slice(i * size, (i + 1) * size); if (!part.length) continue; h += '<tr><td>group ' + (i + 1) + '</td><td>' + part.length + '</td><td>' + pc(mean(part.map((r) => r.p))) + '%</td><td>' + pc(mean(part.map((r) => r.ok))) + '%</td></tr>'; }
            box.innerHTML = h + '</table><p class="gd-cap">Close to the same number in the last two columns means the model is calibrated.</p>';
          },
        },
        {
          title: 'More than one factor',
          lines: [`Pass length goes in alongside space. Each coefficient is now the effect of one factor <b>with the other held fixed</b>.`, `<b>b₁ (space) = ${f3(Z.fit2.b[1])}</b>, <b>b₂ (length) = ${f3(Z.fit2.b[2])}</b>, b₀ = ${f2(Z.fit2.b[0])}.`],
          ask: { kind: 'number', q: [`With the same space, a pass that is <b>20 m longer</b> multiplies the odds by what factor?`], answer: () => Math.exp(20 * Z.fit2.b[2]), tol: Math.max(0.02, 0.01 * Math.exp(20 * Z.fit2.b[2])), hint: `Each extra metre multiplies the odds by e^b₂. Twenty metres is that, twenty times.`,
            reveal: [`The odds change by <b>${f2(Math.exp(20 * Z.fit2.b[2]))}</b>.`, `${Z.fit2.b[2] < 0 ? 'A longer pass is riskier whatever space the receiver has.' : 'A longer pass is not riskier here once space is accounted for.'}`, `Adding a factor can change the effect of the first one, because the two are often related. That is why you read a coefficient with the others held fixed.`] },
        },
        {
          title: 'Turn it into a tactic', target: instrTargets,
          lines: [`You can now say how much space a receiver needs for a pass to be worth making.`, `Choose the completion chance you are happy to accept.`],
          widget(box, c, api, s) {
            const sh = api.shared; sh.minP = sh.minP || 0.75;
            const draw = () => {
              const sp = Math.max(0, spaceFor(sh.minP)), below = Z.D.filter((r) => r.press < sp), above = Z.D.filter((r) => r.press >= sp);
              sh.space = Math.round(sp * 2) / 2;
              box.querySelector('#thrOut').innerHTML = '<table><tr><th></th><th>Passes</th><th>Completed</th></tr><tr><td>Space under ' + f1(sp) + ' m</td><td>' + below.length + '</td><td>' + (below.length ? pc(mean(below.map((r) => r.ok))) + '%' : '–') + '</td></tr><tr><td>Space ' + f1(sp) + ' m or more</td><td>' + above.length + '</td><td>' + (above.length ? pc(mean(above.map((r) => r.ok))) + '%' : '–') + '</td></tr></table>' +
                '<p class="gd-cap">To be at least ' + pc(sh.minP) + '% likely, the model says the receiver needs about <b>' + f1(sp) + ' m</b> of space.</p>';
              box.querySelector('#thrV').textContent = pc(sh.minP) + '%';
            };
            box.innerHTML = '<label class="gd-cap">The completion chance I want: <b id="thrV"></b><input id="thrP" type="range" min="0.55" max="0.95" step="0.01" value="' + sh.minP + '"></label><div id="thrOut"></div>';
            box.querySelector('#thrP').addEventListener('input', (e) => { sh.minP = +e.target.value; draw(); });
            draw();
          },
          apply: [{ label: 'Write this into my build-up instructions', run(ctx, api) {
            const m = Math.max(1, Math.round(api.shared.space || 5));
            const ta = fillInstruction(`When we build out from the back, a player only passes to a team-mate who has at least ${m} metres of space from the nearest opponent. If nobody has that much space, the pass goes back to the goalkeeper, or the player carries the ball forward instead of forcing it.`);
            return ta ? 'It is in the instruction box on this page. Read it, change anything you like, then press the highlighted button.' : 'Open the instructions box on this page first, then press this again.';
          } }],
        },
        {
          title: 'Make it a rule', target: instrTargets, mark: goButton,
          lines: [`The draft is in the box for this page. Edit it so it says what you want.`, `Then press <b>Turn this into instructions</b>. The match reads it as rules for the players.`, `To find out whether it works, run the build-up in the testing phase and compare with a run before you changed it.`],
        },
        {
          title: 'One more, on your own',
          lines: [`Here is the model for passes with space and length together.`, `<b>b₀ = ${f2(Z.fit2.b[0])}</b>, <b>b₁ = ${f3(Z.fit2.b[1])}</b> (per metre of space), <b>b₂ = ${f3(Z.fit2.b[2])}</b> (per metre of length).`],
          ask: { kind: 'number', unit: '%', q: [`A receiver has <b>8 m</b> of space and the pass is <b>25 m</b> long. What is the chance it is completed?`], answer: () => 100 * sig(Z.fit2.b[0] + Z.fit2.b[1] * 8 + Z.fit2.b[2] * 25), tol: 3,
            hint: 'Put the numbers into b₀ + b₁ × space + b₂ × length first. That is the log-odds. Then turn it into a probability.',
            reveal: [`Log-odds = ${f2(Z.fit2.b[0])} + ${f3(Z.fit2.b[1])} × 8 + ${f3(Z.fit2.b[2])} × 25 = ${f2(Z.fit2.b[0] + Z.fit2.b[1] * 8 + Z.fit2.b[2] * 25)}.`, `As a probability that is <b>${pc(sig(Z.fit2.b[0] + Z.fit2.b[1] * 8 + Z.fit2.b[2] * 25))}%</b>.`, `That is the whole method: measure, fit, check, then decide.`] },
        },
      ];
    },
  };

  // =====================================================================================================
  // Describing the squad (squad page)
  // =====================================================================================================
  // The tour is description only. The words in it that have a method behind them are buttons: each opens the full explanation, with questions
  // on the very numbers that are on the page, and brings you back to the tour afterwards.
  const KW = (id, label) => '<button type="button" class="gd-kw" data-kw="kw-' + id + '">' + esc(label) + '</button>';
  const kwData = (ctx, d) => { ctx.kwData = d; };
  function kwLesson(id, title, build) {
    FM.guides['kw-' + id] = { id: 'kw-' + id, title, askOpen: true, min: 0, pages: [],
      build(ctx) {
        const d = ctx.kwData || { vals: [72, 75, 75, 75], label: 'pace', who: 'centre-backs' };
        const q = quart(d.vals), m = mean(d.vals), n = d.vals.length;
        const lowered = d.vals.slice(); lowered[lowered.indexOf(q.s[0])] = q.s[0] - 12;
        const sub = { d, q, m, n, list: q.s.slice().reverse().join(', '), lowered, lq: quart(lowered), lm: mean(lowered), target: d.target, mark: d.mark };
        return build(sub);
      } };
  }
  kwLesson('mean', 'The mean', (c) => [
    { target: c.target, mark: c.mark, title: 'The mean',
      lines: ['The ' + c.d.who + ' have ' + c.d.label + ' ratings of <b>' + c.list + '</b>.'],
      ask: { kind: 'number', q: ['Add the ' + c.n + ' ratings and divide by ' + c.n + '. What do you get?'], answer: () => c.m, tol: 0.06,
        reveal: ['<b>' + f2(c.m) + '</b>.', 'That is the <b>mean</b>. Every value takes part in it, so it uses all the information.', 'It is the balance point: if the ratings were weights on a ruler, the ruler would balance at ' + f2(c.m) + '.'] },
      formula: 'mean = (x₁ + x₂ + … + xₙ) ÷ n' },
    { target: c.target, mark: c.mark, title: 'What one odd value does',
      lines: ['Suppose the lowest rating, ' + c.q.s[0] + ', were ' + (c.q.s[0] - 12) + ' instead.'],
      ask: { kind: 'number', q: ['What would the mean be?'], answer: () => c.lm, tol: 0.06,
        reveal: ['<b>' + f2(c.lm) + '</b>, down from ' + f2(c.m) + '.', 'One value moved the mean by ' + f2(c.m - c.lm) + '. The mean is pulled by extreme values.', 'That is why the median is often a better typical value when a group has an odd one in it.'] } },
  ]);
  kwLesson('median', 'The median', (c) => [
    { target: c.target, mark: c.mark, title: 'The median',
      lines: ['In order, the ' + c.d.label + ' ratings are <b>' + c.q.s.join(', ') + '</b>.'],
      ask: { kind: 'number', q: ['Which value is in the middle? (With an even number of values, the point halfway between the two in the middle.)'], answer: () => c.q.median, tol: 0.06,
        reveal: ['<b>' + f2(c.q.median) + '</b>.', 'That is the <b>median</b>: half the values are below it and half above.'] } },
    { target: c.target, mark: c.mark, title: 'What one odd value does to it',
      lines: ['Again suppose the lowest rating, ' + c.q.s[0] + ', were ' + (c.q.s[0] - 12) + '.'],
      ask: { kind: 'number', q: ['What would the median be?'], answer: () => c.lq.median, tol: 0.06,
        reveal: ['<b>' + f2(c.lq.median) + '</b>' + (c.lq.median === c.q.median ? ', exactly where it was.' : ', compared with ' + f2(c.q.median) + '.'), 'The median only cares about the order, so one extreme value hardly moves it.', 'Use it when a group has an odd one in it. The mean is the better choice when the values are even and every one should count.'] } },
  ]);
  kwLesson('mode', 'The mode', (c) => {
    const counts = {}; c.d.vals.forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
    const top = Math.max.apply(null, Object.keys(counts).map((k) => counts[k])), mode = top > 1 ? +Object.keys(counts).filter((k) => counts[k] === top)[0] : null;
    return [mode != null ? { target: c.target, mark: c.mark, title: 'The mode',
      lines: ['Look at the ' + c.d.label + ' ratings again: <b>' + c.q.s.join(', ') + '</b>.'],
      ask: { kind: 'number', q: ['Which value appears most often?'], answer: () => mode, tol: 0.01, reveal: ['<b>' + mode + '</b>, ' + top + ' times.', 'That is the <b>mode</b>: the most common value.'] } }
      : { target: c.target, mark: c.mark, title: 'The mode', lines: ['Look at the ' + c.d.label + ' ratings: <b>' + c.q.s.join(', ') + '</b>.', 'No value repeats, so there is no mode. That is common with ratings that can take many values.'] },
    { title: 'Where the mode is the only one that works',
      lines: ['Some things cannot be added or put in order.'],
      ask: { kind: 'choice', q: ['Which of these can you only summarise with the mode?'], correct: 2,
        options: [{ t: 'The squad\'s ages', fb: 'Ages are numbers: the mean and median work.' }, { t: 'The number of goals per match', fb: 'Those are numbers too.' }, { t: 'The formation used in each match (4-3-3, 4-4-2, ...)', fb: '' }],
        reveal: ['A formation is a category. You cannot add 4-3-3 and 4-4-2, or say which is in the middle.', 'The mode tells you the most used one. It is the only summary that works for categories.'] } }];
  });
  kwLesson('range', 'The range', (c) => [
    { target: c.target, mark: c.mark, title: 'The range',
      lines: ['Two groups can have the same mean and be very different. One has everyone at 74. The other has some at 60 and some at 88.'],
      ask: { kind: 'number', q: ['For the ' + c.d.who + ', subtract the lowest rating (' + c.q.s[0] + ') from the highest (' + c.q.s[c.n - 1] + ').'], answer: () => c.q.s[c.n - 1] - c.q.s[0], tol: 0.01,
        reveal: ['<b>' + (c.q.s[c.n - 1] - c.q.s[0]) + '</b>.', 'That is the <b>range</b>: the distance from the smallest to the largest.'] } },
    { target: c.target, mark: c.mark, title: 'Its weakness',
      lines: ['Suppose the lowest rating, ' + c.q.s[0] + ', were ' + (c.q.s[0] - 12) + '.'],
      ask: { kind: 'number', q: ['What would the range be?'], answer: () => c.q.s[c.n - 1] - (c.q.s[0] - 12), tol: 0.01,
        reveal: ['<b>' + (c.q.s[c.n - 1] - (c.q.s[0] - 12)) + '</b>.', 'The range rests entirely on the two most extreme values, so one odd value changes it a lot.', 'The standard deviation and the IQR use more of the data.'] } },
  ]);
  kwLesson('sd', 'The standard deviation', (c) => {
    const varr = c.d.vals.reduce((a, v) => a + (v - c.m) * (v - c.m), 0) / c.n, sd = Math.sqrt(varr);
    const inside = c.d.vals.filter((v) => Math.abs(v - c.m) <= sd).length;
    return [
      { target: c.target, mark: c.mark, title: 'Distance from the mean',
        lines: ['The mean is <b>' + f2(c.m) + '</b>. Each player is some distance from it, above or below.'],
        ask: { kind: 'choice', q: ['Why would adding up those plain distances and averaging them tell you nothing?'], correct: 1,
          options: [{ t: 'There are too many players', fb: 'The count is not the problem.' }, { t: 'The values above the mean cancel the ones below it, so the total is always zero', fb: '' }, { t: 'The mean is not a real number', fb: 'It is a perfectly good number.' }],
          reveal: ['The positive and negative distances cancel exactly: the total is always zero.', 'So we stop the signs cancelling. Squaring each distance does that, and it makes big distances count for more.'] } },
      { target: c.target, mark: c.mark, title: 'Variance',
        lines: ['Square each distance from the mean (' + f2(c.m) + '), add the squares, then divide by ' + c.n + '.'],
        ask: { kind: 'number', q: ['What is the average squared distance?'], answer: () => varr, tol: Math.max(0.05, varr * 0.02),
          reveal: ['<b>' + f2(varr) + '</b>. This is the <b>variance</b>.', 'It is in squared units, which is hard to picture.'] } },
      { target: c.target, mark: c.mark, title: 'Back to rating points',
        lines: ['The variance is ' + f2(varr) + ', in squared rating points.'],
        ask: { kind: 'number', q: ['Take the square root.'], answer: () => sd, tol: Math.max(0.03, sd * 0.02),
          reveal: ['<b>' + f2(sd) + '</b>. This is the <b>standard deviation</b>.', 'It is the typical distance of a value from the mean, in the same units as the data.', 'As a rough guide, about two-thirds of values sit within one standard deviation of the mean, and almost all within two.'] },
        formula: 'standard deviation = √( Σ (x − mean)² ÷ n )' },
      { target: c.target, mark: c.mark, title: 'Using it',
        lines: ['The mean is <b>' + f2(c.m) + '</b> and the standard deviation <b>' + f2(sd) + '</b>, so one standard deviation either side runs from ' + f2(c.m - sd) + ' to ' + f2(c.m + sd) + '.'],
        ask: { kind: 'number', q: ['How many of the ' + c.n + ' ratings sit inside that band?'], answer: () => inside, tol: 0.01,
          reveal: ['<b>' + inside + '</b> of ' + c.n + '.', 'A small standard deviation means the group is bunched together, so one summary describes everyone. A large one means the average hides big differences.'] } },
    ];
  });
  kwLesson('iqr', 'The interquartile range', (c) => [
    { target: c.target, mark: c.mark, title: 'Quartiles',
      lines: ['Put the ratings in order: <b>' + c.q.s.join(', ') + '</b>.', 'Split the list in half. The median of the lower half is the first quartile, Q1. The median of the upper half is the third quartile, Q3.'],
      ask: { kind: 'number', q: ['What is Q3 − Q1?'], answer: () => c.q.iqr, tol: 0.06,
        reveal: ['Q1 = ' + f2(c.q.q1) + ' and Q3 = ' + f2(c.q.q3) + ', so the <b>interquartile range</b> is <b>' + f2(c.q.iqr) + '</b>.', 'It is the spread of the middle half of the values.'] },
      formula: 'IQR = Q3 − Q1' },
    { target: c.target, mark: c.mark, title: 'Why use it',
      lines: ['Suppose the lowest rating, ' + c.q.s[0] + ', were ' + (c.q.s[0] - 12) + '.'],
      ask: { kind: 'number', q: ['What would the IQR be?'], answer: () => c.lq.iqr, tol: 0.06,
        reveal: ['<b>' + f2(c.lq.iqr) + '</b>' + (c.lq.iqr === c.q.iqr ? ', unchanged.' : ', compared with ' + f2(c.q.iqr) + '.'), 'The IQR ignores the extremes, so an odd value cannot stretch it. That makes it the right yardstick for deciding what counts as unusual.'] } },
  ]);
  kwLesson('outlier', 'Outliers', (c) => {
    const o = c.q.s.filter((v) => v < c.q.lo || v > c.q.hi);
    return [
      { target: c.target, mark: c.mark, title: 'The fences',
        lines: ['A common convention: a value is an <b>outlier</b> if it is more than 1.5 × IQR below Q1 or above Q3.', 'For these ratings Q1 = ' + f2(c.q.q1) + ', Q3 = ' + f2(c.q.q3) + ' and the IQR is ' + f2(c.q.iqr) + '.'],
        ask: { kind: 'number', q: ['What is the lower fence, Q1 − 1.5 × IQR?'], answer: () => c.q.lo, tol: 0.06, reveal: ['<b>' + f2(c.q.lo) + '</b>.', 'The upper fence is Q3 + 1.5 × IQR = <b>' + f2(c.q.hi) + '</b>.'] },
        formula: 'lower fence = Q1 − 1.5 × IQR<br>upper fence = Q3 + 1.5 × IQR' },
      { target: c.target, mark: c.mark, title: 'Is anything outside?',
        lines: ['The fences are ' + f2(c.q.lo) + ' and ' + f2(c.q.hi) + '. The ratings are <b>' + c.q.s.join(', ') + '</b>.'],
        ask: { kind: 'choice', q: ['Is any of them an outlier?'], correct: o.length ? 0 : 1,
          options: [{ t: 'Yes, at least one', fb: 'Compare each value with the two fences.' }, { t: 'No, none of them', fb: 'Compare each value with the two fences.' }],
          reveal: o.length ? ['Yes: ' + o.join(', ') + ' falls outside.'] : ['No. The lowest, ' + c.q.s[0] + ', is the smallest in the group but sits inside the fences.', 'Being the lowest is not the same as being an outlier.'] } },
      { target: c.target, mark: c.mark, title: 'What to do with one',
        lines: ['Say a value is flagged.'],
        ask: { kind: 'choice', q: ['What does it tell you?'], correct: 1,
          options: [{ t: 'The value is wrong and should be removed', fb: 'Unusual is not the same as wrong.' }, { t: 'The value is unusual and worth a closer look', fb: '' }, { t: 'The group has no pattern', fb: 'One value does not erase a pattern.' }],
          reveal: ['An outlier is unusual, not mistaken. It might be a mistake in the data, or it might be the most important player in the squad.', 'In your squad it is a strength to build around or a weakness to protect, which is exactly what the red and green marks show.'] } },
    ];
  });

  FM.guides.descriptive = {
    id: 'descriptive', title: 'A tour of your squad', min: 0, pages: ['hub'],
    blurb: 'Elena takes you through the squad one group at a time and summarises each.',
    prepare(ctx) {
      const team = ctx.team; if (!team) return;
      const all = (team.players || []).concat(team.bench || []);
      ctx.D = { all };
    },
    build(ctx) {
      const all = (ctx.D && ctx.D.all) || [];
      const nm = FM.userNameNow ? FM.userNameNow() : '';
      const groupEls = (key) => () => Array.from(document.querySelectorAll('#view-squad .sq-group[data-group="' + key + '"]'));
      const openGroup = (key) => () => { document.querySelectorAll('#view-squad .sq-group[data-group="' + key + '"]').forEach((d) => { d.open = true; }); };
      const statCells = (key, kinds, statHead) => () => {
        const tbl = document.querySelector('#view-squad .sq-group[data-group="' + key + '"] table');
        if (!tbl) return [];
        const head = Array.from(tbl.querySelectorAll('thead th')), ix = head.findIndex((h) => h.textContent.trim() === statHead);
        return ix < 0 ? [] : Array.from(tbl.querySelectorAll('tbody tr')).filter((r) => kinds.indexOf((r.children[4] && r.children[4].textContent.trim()) || '') >= 0).map((r) => r.children[ix]).filter(Boolean);
      };
      const names = (ps) => ps.map((p) => esc(p.name.split(' ').slice(-1)[0])).join(', ');
      // a group of the squad, summarised in words on the rating that matters most for it
      function groupStep(key, kinds, stat, head, word, who, intro) {
        const ps = all.filter((p) => kinds.indexOf(p.natural) >= 0), vals = ps.map((p) => FM.shown(p.ratings[stat]));
        const marked = statCells(key, kinds, head);
        return {
          target: groupEls(key), enter: (c) => { openGroup(key)(); if (vals.length >= 3) kwData(c, { vals, label: word, who, target: groupEls(key), mark: marked }); }, mark: marked, title: key + ': ' + word,
          lines: () => {
            if (!ps.length) return ['There are no ' + key.toLowerCase() + ' in the squad.'];
            const out = [intro.replace('{n}', ps.length)];
            if (vals.length >= 3) {
              const q = quart(vals), m = mean(vals), sd = Math.sqrt(vals.reduce((a, x) => a + (x - m) * (x - m), 0) / vals.length);
              const hi = ps[vals.indexOf(Math.max.apply(null, vals))], lo = ps[vals.indexOf(Math.min.apply(null, vals))];
              out.push('Their ' + word + ' ratings are <b>' + q.s.slice().reverse().join(', ') + '</b>.');
              const cnt = {}; vals.forEach((v) => { cnt[v] = (cnt[v] || 0) + 1; });
              const top = Math.max.apply(null, Object.keys(cnt).map((k) => cnt[k])), mode = top > 1 ? Object.keys(cnt).filter((k) => cnt[k] === top)[0] : null;
              out.push((mode != null ? 'The ' + KW('mode', 'mode') + ' is <b>' + mode + '</b>, the ' : 'The ') + KW('median', 'median') + ' is <b>' + f2(q.median) + '</b> and the ' + KW('mean', 'mean') + ' is <b>' + f2(m) + '</b>.');
              out.push('The ' + KW('range', 'range') + ' runs from <b>' + q.s[0] + '</b> (' + esc(lo.name) + ') to <b>' + q.s[q.n - 1] + '</b> (' + esc(hi.name) + '), and the ' + KW('sd', 'standard deviation') + ' is <b>' + f2(sd) + '</b>.');
              const odd = q.s.filter((v) => v < q.lo || v > q.hi);
              out.push('The ' + KW('iqr', 'IQR') + ' is <b>' + f2(q.iqr) + '</b>, so the fences are ' + f2(q.lo) + ' and ' + f2(q.hi) + ', and hence ' + (odd.length ? 'there ' + (odd.length === 1 ? 'is one' : 'are ' + odd.length) + ' ' + KW('outlier', 'outlier' + (odd.length === 1 ? '' : 's')) + ' within the group.' : 'there are no ' + KW('outlier', 'outliers') + '. The lowest, ' + q.s[0] + ', is not unusual.'));
            } else out.push(ps.map((p) => esc(p.name) + ': <b>' + FM.shown(p.ratings[stat]) + '</b>').join(', ') + '. With so few there is nothing to average; what matters is the gap between them' + (vals.length === 2 ? ', <b>' + Math.abs(vals[0] - vals[1]) + '</b> points.' : '.'));
            let picks = [];
            try { picks = FM.squadHighlights(ctx.team).picks.filter((c) => kinds.indexOf(c.p.natural) >= 0); } catch (e) { picks = []; }
            if (picks.length) {
              out.push('Against everyone in the league who plays the same position, ' + (picks.length === 1 ? 'one number here stands out and is marked' : picks.length + ' numbers here stand out and are marked') + ' in the list.');
              picks.slice(0, 2).forEach((c) => out.push(FM.squadMeaning ? FM.squadMeaning(c) : esc(c.p.name) + ': ' + esc(c.label) + ' ' + c.val));
            } else out.push('Nothing here is unusual against the rest of the league, so no number in this group is marked.');
            return out;
          },
        };
      }
      const steps = [
        { target: () => Array.from(document.querySelectorAll('#view-squad .sq-group')), title: (nm ? 'Here is your squad, ' + nm : 'Here is your squad'),
          lines: ['These are the ' + (all.length || 20) + ' players you will take into the season.', 'Every one has about ten ratings, so there are more than 200 numbers on this page.', 'Nobody can hold that in their head, and you do not have to. We will go through the squad one group at a time and summarise each.', 'Any highlighted word has a full explanation behind it. Click one whenever you want to see how it works, with questions on the numbers in front of you.', 'Let us start at the back.'] },
        groupStep('Defenders', ['CB'], 'pace', 'Pac', 'speed', 'centre-backs', 'Start with the <b>{n}</b> centre-backs and how quick they are.'),
        groupStep('Defenders', ['FB'], 'tackling', 'Tck', 'tackling', 'full-backs', 'The <b>{n}</b> full-backs, and how well they tackle.'),
        groupStep('Midfielders', ['DM', 'CM', 'AM'], 'passing', 'Pas', 'passing', 'midfielders', 'Now the midfield: <b>{n}</b> players, and the rating that matters most is passing.'),
        groupStep('Forwards', ['WF', 'ST'], 'finishing', 'Fin', 'finishing', 'forwards', 'Up front: <b>{n}</b> players, and the rating that matters is finishing.'),
        groupStep('Goalkeepers', ['GK'], 'gk', 'GK', 'goalkeeping', 'goalkeepers', 'Last, the goalkeepers: <b>{n}</b> of them, rated on goalkeeping.'),
        { target: () => { const e = Array.from(document.querySelectorAll('#view-squad td.hl-bad, #view-squad td.hl-good')).slice(0, 3); return e.length ? e : Array.from(document.querySelectorAll('#view-squad .sq-group')); }, title: 'The colours in the list',
          lines: ['A squad of four is a small group to judge a player against, so each number is compared with <b>every player in the league</b> who plays the same position.', 'Only the numbers beyond the ' + KW('outlier', 'outlier') + ' fences are marked: red for unusually low, green for unusually high.', 'Those are the ones worth building a plan around, or protecting.', (nm ? 'That is the squad, ' + esc(nm) + '.' : 'That is the squad.') + ' Press <b>Continue to formation</b> when you are ready to pick the shape.'] },
      ];
      // a group with no one in it (for example a squad with no full-backs) is left out
      return steps.filter((st) => !(typeof st.lines === 'function' && st.title && /^Defenders: tackling/.test(st.title) && !all.some((p) => p.natural === 'FB')));
    },
  };

  // =====================================================================================================
  // Conditional probability (build-up with pressure, midfield with lanes)
  // =====================================================================================================
  function condLesson(zone) {
    const isMid = zone === 'midfield';
    const A = isMid ? { name: 'lane clear', test: (r) => r.lane >= 1.5, other: (r) => r.lane < 1.5, aLab: 'a clear lane', bLab: 'a lane with an opponent in it', gap: 'whether an opponent stood in the passing lane' }
      : { name: 'free receiver', test: (r) => r.press >= 10, other: (r) => r.press < 5, aLab: 'a receiver with 10 m or more of space', bLab: 'a receiver with an opponent inside 5 m', gap: 'how close the nearest opponent stood to the receiver' };
    return {
      id: 'cond-' + zone, title: isMid ? 'Does a blocked lane really matter?' : 'Does a tight marker really matter?', min: 0, pages: [zone],
      blurb: isMid ? 'Compare passes through clear and blocked lanes and decide whether the gap is real.' : 'Compare passes to free and marked receivers and decide whether the gap is real.',
      prepare(ctx) {
        const D = ctx.data[zone], a = D.filter(A.test), b = D.filter(A.other);
        const ok = (rs) => rs.reduce((s, r) => s + r.ok, 0);
        ctx.C = { n: D.length, ok: ok(D), na: a.length, ka: ok(a), nb: b.length, kb: ok(b) };
      },
      build(ctx) {
        const C = ctx.C, pa = C.ka / Math.max(1, C.na), pb = C.kb / Math.max(1, C.nb), p = C.ok / Math.max(1, C.n);
        const la = wilson(C.ka, C.na), lb = wilson(C.kb, C.nb), overlap = !(la[0] > lb[1] || lb[0] > la[1]);
        return [
          { target: board, title: 'Two kinds of pass',
            lines: [`In the ${isMid ? 'middle third' : 'own third'} you have played <b>${C.n}</b> passes. <b>${C.ok}</b> were completed, which is <b>${pc(p)}%</b>.`, `The log records ${A.gap}.`, `Would you expect ${A.aLab} to be completed more often than ${A.bLab}? Hold that guess in mind: the passes are about to be split in two.`] },
          { title: 'Probability given something',
            lines: [`<b>${C.na}</b> passes went to ${A.aLab}, and <b>${C.ka}</b> of those were completed.`],
            ask: { kind: 'number', unit: '%', q: [`What percentage of passes to ${A.aLab} were completed?`], answer: () => pa * 100, tol: 0.6,
              reveal: [`<b>${f1(pa * 100)}%</b>.`, `This is a <b>conditional probability</b>: the chance of a completed pass <i>given</i> that the receiver had space. It is written P(completed | ${isMid ? 'clear lane' : 'free'}).`, `It is not the same as the overall ${pc(p)}%, which mixes every kind of pass together.`] } },
          { title: 'The other condition',
            lines: [`<b>${C.nb}</b> passes went to ${A.bLab}, and <b>${C.kb}</b> of those were completed.`],
            ask: { kind: 'number', unit: '%', q: [`What percentage were completed?`], answer: () => pb * 100, tol: 0.6, reveal: [`<b>${f1(pb * 100)}%</b>.`, `The gap between the two is <b>${f1((pa - pb) * 100)} percentage points</b>.`] } },
          { title: 'If it made no difference',
            lines: [`Suppose ${A.gap} had no effect on whether a pass is completed.`],
            ask: { kind: 'choice', q: [`What would you expect P(completed | ${isMid ? 'blocked lane' : 'marked'}) to be, compared with the overall rate?`], correct: 0,
              options: [{ t: 'The same as the overall rate', fb: '' }, { t: 'Always lower than the overall rate', fb: 'If there were no effect, nothing would push it lower.' }, { t: 'Always zero', fb: 'No: passes still get through sometimes.' }],
              reveal: [`If a condition makes no difference, the conditional probability equals the overall probability.`, `When that holds, the two events are called <b>independent</b>.`, `Your two groups sit at ${f1(pa * 100)}% and ${f1(pb * 100)}% around an overall ${pc(p)}%. That is not what independence looks like. But with finite data a gap can still be luck, which is the next question.`] } },
          { title: 'Is the gap real?',
            lines: [`Each percentage comes from a limited number of passes, so it has a margin of error.`, `${A.aLab[0].toUpperCase() + A.aLab.slice(1)}: <b>${pc(la[0])}% to ${pc(la[1])}%</b> (95% interval).`, `${A.bLab[0].toUpperCase() + A.bLab.slice(1)}: <b>${pc(lb[0])}% to ${pc(lb[1])}%</b>.`],
            ask: { kind: 'choice', q: [`Do the two intervals overlap?`], correct: overlap ? 0 : 1, options: [{ t: 'Yes, they overlap', fb: 'Compare the top of the lower one with the bottom of the higher one.' }, { t: 'No, there is a clear gap between them', fb: 'Compare the top of the lower one with the bottom of the higher one.' }],
              reveal: overlap ? [`They overlap, so the gap could be luck. More matches are needed.`] : [`There is a gap between them, so the difference is very unlikely to be luck.`, `With ${C.na} and ${C.nb} passes the data is thick enough to say so.`] } },
          { target: instrTargets, title: 'Use it', lines: [`If the difference is real, a pass into ${A.bLab} is a decision to make carefully.`, `Write what the players should do instead.`],
            apply: [{ label: 'Write this into my instructions', run() {
              const t = isMid ? `In midfield, players do not pass through a lane with an opponent standing in it. They look for a team-mate whose lane is clear, or take the ball wide and try again.` : `When building out, players avoid passing to a team-mate with an opponent within 5 metres of him. They look for the team-mate with the most space, or play it back.`;
              return fillInstruction(t) ? 'It is in the instruction box on this page. Read it, then press the highlighted button.' : 'Open the instructions box on this page first, then press this again.';
            } }] },
          { target: instrTargets, mark: goButton, title: 'Make it a rule', lines: [`Press <b>Turn this into instructions</b> to make it a rule the match follows.`, `Then run the test for this phase and compare it with a run before the change.`] },
          { title: 'One on your own',
            lines: [`Through blocked lanes, <b>45 of 90</b> passes were completed. Through clear lanes, <b>150 of 200</b>.`],
            ask: { kind: 'number', q: [`How many times more likely is a completed pass through a clear lane than through a blocked one?`], answer: () => (150 / 200) / (45 / 90), tol: 0.02, hint: 'Work out each conditional probability, then divide one by the other.',
              reveal: [`150 ÷ 200 = 0.75 and 45 ÷ 90 = 0.5.`, `0.75 ÷ 0.5 = <b>1.5</b> times as likely.`, `That ratio is called the <b>relative risk</b>.`] } },
        ];
      },
    };
  }
  FM.guides['cond-build'] = condLesson('build');
  FM.guides['cond-midfield'] = condLesson('midfield');

  // =====================================================================================================
  // Shots and expected goals (final third)
  // =====================================================================================================
  FM.guides.xg = {
    id: 'xg', title: 'How good was that chance?', min: 0, pages: ['final'],
    blurb: 'Rate shots by where they are taken from, and decide where your team should and should not shoot.',
    prepare(ctx) {
      const S = ctx.data.shots, n = S.length, goals = S.reduce((a, s) => a + s.goal, 0);
      const bands = [[0, 8], [8, 12], [12, 18], [18, 25], [25, 99]].map(([lo, hi]) => {
        const r = S.filter((s) => s.dist >= lo && s.dist < hi), k = r.reduce((a, s) => a + s.goal, 0);
        return { lo, hi, n: r.length, k, p: r.length ? k / r.length : 0 };
      });
      ctx.X = { S, n, goals, bands, xg: S.reduce((a, s) => a + s.xg, 0) };
    },
    build(ctx) {
      const X = ctx.X, bands = X.bands.filter((b) => b.n > 0);
      const inside = X.S.filter((s) => s.dist < 12), outside = X.S.filter((s) => s.dist >= 18);
      const pIn = inside.length ? inside.reduce((a, s) => a + s.goal, 0) / inside.length : 0, pOut = outside.length ? outside.reduce((a, s) => a + s.goal, 0) / outside.length : 0;
      const worth = 0.08;
      let cut = 25; bands.forEach((b) => { if (b.p >= worth && b.n >= 3) cut = Math.max(cut, 0); });
      const goodBands = bands.filter((b) => b.p >= worth && b.n >= 3), lastGood = goodBands.length ? goodBands[goodBands.length - 1].hi : 12;
      const lim = Math.min(25, Math.max(8, lastGood));
      const steps = [
        { target: board, title: 'A shot is not a goal',
          lines: X.n ? [`Your team has had <b>${X.n}</b> shots with a recorded position (open play, this season and the friendlies). <b>${X.goals}</b> were goals.`, `Goals are rare, so they are slow to learn from.`, `Take two shots that both missed. One was from the edge of the box with three defenders closing. One was a tap-in at the far post.`, `They were not equally bad: one was a terrible chance, the other a good chance that did not go in.`, `Analysts count the quality of the chance rather than only the outcome. The quality is the probability that a shot like that scores.`] : [`No shots with a recorded position yet, so there is nothing to measure. Play a match or two and come back.`, `The lesson still works through the idea on the example below.`] },
        { title: 'Where the goals come from',
          lines: [`The shots are split by how far they were from goal.`],
          ask: { kind: 'number', unit: '%', q: [`Before you see the bands: what percentage of your shots from <b>inside 12 m</b> were goals?`], answer: () => pIn * 100, tol: 10,
            reveal: [`<b>${pc(pIn)}%</b> of shots from inside 12 m were goals (${inside.length} shots).`, `From 18 m or further: <b>${pc(pOut)}%</b> (${outside.length} shots).`, `A shot from a place has a probability of scoring. Together those probabilities describe the quality of a chance.`] },
          widget(box, c, api, s) {
            if (!s.done) { box.innerHTML = '<p class="gd-cap">The chart appears when you have answered.</p>'; return; }
            let h = '<table><tr><th>Distance</th><th>Shots</th><th>Goals</th><th>Rate</th></tr>';
            X.bands.forEach((b) => { h += '<tr><td>' + b.lo + (b.hi > 90 ? ' m +' : ' to ' + b.hi + ' m') + '</td><td>' + b.n + '</td><td>' + b.k + '</td><td>' + (b.n ? pc(b.p) + '%' : '–') + '</td></tr>'; });
            box.innerHTML = h + '</table><p class="gd-cap">Bands with only a few shots are noisy: a single goal moves the rate by a lot.</p>';
          } },
        { title: 'Adding chances up',
          lines: [`Give each shot the probability that a shot like it scores. Three shots have probabilities <b>0.10, 0.30 and 0.05</b>.`],
          ask: { kind: 'number', q: [`How many goals would you expect from those three shots together?`], answer: () => 0.45, tol: 0.005,
            reveal: [`0.10 + 0.30 + 0.05 = <b>0.45</b>.`, `This total is the <b>expected goals</b>, or <b>xG</b>. It is what an average team would score from those chances.`, `Your ${X.n} shots have an expected total of <b>${f1(X.xg)}</b> and produced <b>${X.goals}</b> goals.`] },
          why: [`Clubs compare xG with goals to separate a team that is creating good chances from one that is merely lucky. xG is a better predictor of next month's goals than last month's goals.`] },
        { title: 'Luck or skill?',
          lines: [`You scored <b>${X.goals}</b> goals from <b>${f1(X.xg)}</b> expected.`],
          ask: { kind: 'choice', q: [`With only ${X.n} shots, can you say your finishing is good or bad from that gap?`], correct: 1,
            options: [{ t: 'Yes, a gap is a gap', fb: 'A few shots can easily go a few goals either way.' }, { t: 'No, with so few shots it is mostly luck', fb: '' }],
            reveal: [`Goals from a handful of shots swing wildly. A team that deserves 0.1 per shot will sometimes score twice in ten and sometimes not at all.`, `You need hundreds of shots before a gap this size means anything. That is the reason the Monte Carlo test exists in the testing phase: it gives you hundreds of shots in seconds.`] } },
        { target: instrTargets, title: 'Where to shoot from',
          lines: [`In your shots the rate stays above ${pc(worth)}% out to about <b>${lim} m</b>.`, `Beyond that, a pass to a better-placed team-mate usually gives a better chance.`],
          apply: [{ label: 'Write this into my final-third instructions', run() {
            const t = `In the final third, players only shoot from inside about ${Math.round(lim)} metres. From further out they pass to a team-mate in a better position, unless the shot is on and the ball can go no other way.`;
            return fillInstruction(t) ? 'It is in the instruction box on this page. Read it, then press the highlighted button.' : 'Open the instructions box on this page first, then press this again.';
          } }] },
        { target: instrTargets, mark: goButton, title: 'Make it a rule', lines: [`Press <b>Turn this into instructions</b>. Then run the final-third test and look at the share of attacks that end in a shot, and the quality of those shots.`] },
        { title: 'One on your own',
          lines: [`A team has ten shots from 20 m, each scoring with probability 0.04, and four shots from 6 m, each scoring with probability 0.30.`],
          ask: { kind: 'number', q: [`What is the expected number of goals?`], answer: () => 10 * 0.04 + 4 * 0.3, tol: 0.01,
            reveal: [`10 × 0.04 = 0.4 and 4 × 0.30 = 1.2.`, `0.4 + 1.2 = <b>1.6</b> expected goals.`, `Fewer shots from the right place are worth more than many from the wrong one.`] } },
      ];
      // for A-level and beyond: the same S-shaped curve as in the build-up, now through the shots
      if (ctx.level >= 1 && X.n >= 20 && X.goals >= 3 && X.goals < X.n) {
        const f = fitLogit(X.S.map((s) => [s.dist]), X.S.map((s) => s.goal)), or5 = Math.exp(5 * f.b[1]);
        steps.splice(4, 0, { title: 'A curve through the shots',
          lines: [`The bands are steps. A curve through every shot uses the same method as for passes: the log-odds of a goal is a straight line in distance.`, `The best curve for your <b>${X.n}</b> shots has <b>b₀ = ${f2(f.b[0])}</b> and <b>b₁ = ${f3(f.b[1])}</b> per metre (± ${f3(1.96 * f.se[1])}).`],
          ask: { kind: 'number', q: [`By what factor do the odds of scoring change for a shot <b>5 m further out</b>?`], answer: () => or5, tol: Math.max(0.02, or5 * 0.02), hint: `One metre multiplies the odds by e<sup>b₁</sup>. Do that five times.`,
            reveal: [`The odds change by <b>${f2(or5)}</b>.`, `${or5 < 1 ? 'Each five metres further out makes the shot less than ' + f2(or5 * 100 / 100) + ' times as likely, in odds.' : 'Here the curve rises with distance, which would be odd: with so few shots it is mostly noise.'}`, `With ${X.goals} goals behind the curve the margin of error on b₁ is wide. An analyst would want many more shots before trusting the exact number, which is what the testing phase can give you.`] } });
      }
      return steps;
    },
  };

  // =====================================================================================================
  // Monte Carlo and sample size (testing phase)
  // =====================================================================================================
  FM.guides.montecarlo = {
    id: 'montecarlo', title: 'Why run the test 1,000 times?', min: 0, pages: ['test'],
    blurb: 'Find out how many runs it takes for the result to mean something, then set it.',
    build() {
      const rng = (() => { let s = 12345; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; })();
      return [
        { target: '#labPred', mark: () => Array.from(document.querySelectorAll('#labPred')), title: 'Before the test',
          lines: [`In a moment the build-up is played out many times against the next opponent.`, `Write your prediction in the highlighted box first: what share do you expect to succeed?`, `Then come back here.`] },
        { target: '#labN', title: 'One run is one sample',
          lines: [`Suppose the true chance of a pass being completed is <b>70%</b>.`],
          ask: { kind: 'choice', q: [`You watch 10 passes. Will exactly 7 be completed?`], correct: 1,
            options: [{ t: 'Yes, that is what 70% means', fb: 'Try the button below a few times.' }, { t: 'Not usually: it will vary', fb: '' }],
            reveal: [`It varies. Sometimes 5, sometimes 9.`, `The 70% is the long-run behaviour. Any short stretch is a random sample from it.`, `Running a model many times with chance built in, and looking at what comes out, is called a <b>Monte Carlo</b> experiment.`] },
          widget(box, c, api, s) {
            const shown = api.shared.coin = api.shared.coin || [];
            const draw = () => { box.innerHTML = '<div class="gd-row"><button type="button" class="gd-btn" id="coinGo">Watch 10 passes</button><span class="gd-cap">' + (shown.length ? 'Completed in each batch: <b>' + shown.slice(-12).join(', ') + '</b>' : 'Press it a few times.') + '</span></div>'; box.querySelector('#coinGo').addEventListener('click', () => { let k = 0; for (let i = 0; i < 10; i++) if (rng() < 0.7) k++; shown.push(k); draw(); }); };
            draw();
          } },
        { target: '#labN', title: 'How many runs?',
          lines: [`Each time, a batch of passes gives an estimate of the true 70%.`, `Use the slider to change how many passes are in each batch. Each batch size is repeated 300 times.`],
          ask: { kind: 'choice', q: [`Each time the number of passes in a batch is multiplied by 4, the spread of the estimates is multiplied by about what?`], correct: 2,
            options: [{ t: '4', fb: 'The spread shrinks as the batch grows, it does not grow.' }, { t: '2', fb: 'It gets smaller, not bigger.' }, { t: '½', fb: '' }, { t: '¼', fb: 'It shrinks, but not that fast. Try 100, then 400 on the slider.' }],
            reveal: [`Four times the passes halves the spread.`, `That is the <b>standard error</b>: √( p × (1 − p) ÷ n ).`, `To make an estimate twice as precise you need four times as many runs. Precision is expensive.`] },
          formula: `standard error = √( p × (1 − p) ÷ n )`,
          widget(box, c, api) {
            const sh = api.shared; sh.n = sh.n || 100;
            const draw = () => {
              const n = sh.n, res = []; for (let r = 0; r < 300; r++) { let k = 0; for (let i = 0; i < n; i++) if (rng() < 0.7) k++; res.push(k / n); }
              const lo = Math.min.apply(null, res), hi = Math.max.apply(null, res), bins = new Array(24).fill(0);
              res.forEach((v) => { bins[Math.min(23, Math.floor((v - 0.4) / 0.6 * 24 + 1e-9))]++; }); const mx = Math.max.apply(null, bins);
              let h = '<svg viewBox="0 0 400 130">';
              bins.forEach((b, i) => { const x = 20 + i * 15.5, hh = 90 * b / mx; h += '<rect x="' + x + '" y="' + (110 - hh) + '" width="13" height="' + hh + '" fill="' + COL.blue + '"/>'; });
              [0.4, 0.55, 0.7, 0.85, 1].forEach((v) => { h += '<text x="' + (20 + (v - 0.4) / 0.6 * 372) + '" y="125" text-anchor="middle" font-size="10" fill="' + COL.dim + '">' + Math.round(v * 100) + '%</text>'; });
              box.querySelector('#mcOut').innerHTML = h + '</svg><p class="gd-cap">With ' + n + ' passes per batch, the 300 estimates ran from <b>' + pc(lo) + '%</b> to <b>' + pc(hi) + '%</b>.</p>';
              box.querySelector('#mcN').textContent = n;
            };
            box.innerHTML = '<label class="gd-cap">Passes in each batch: <b id="mcN"></b><input id="mcR" type="range" min="1" max="4" step="1" value="' + [10, 50, 200, 1000].indexOf(sh.n) + '"></label><div id="mcOut"></div>';
            box.querySelector('#mcR').value = Math.max(0, [10, 50, 200, 1000].indexOf(sh.n)) + 1;
            box.querySelector('#mcR').addEventListener('input', (e) => { sh.n = [10, 50, 200, 1000][+e.target.value - 1]; draw(); });
            sh.n = [10, 50, 200, 1000][+box.querySelector('#mcR').value - 1] || 100;
            draw();
          } },
        { target: '#labN', mark: () => Array.from(document.querySelectorAll('#labN')), title: 'Choosing the number of tests',
          lines: [`You want the result of a run to be accurate to within <b>±4 percentage points</b> (95% of the time).`, `The share you are measuring is around <b>60%</b>.`],
          ask: { kind: 'number', unit: 'tests', q: [`Use the margin of error: 1.96 × √( p × (1 − p) ÷ n ) = 0.04. How many tests do you need?`], answer: () => 1.96 * 1.96 * 0.6 * 0.4 / (0.04 * 0.04), tol: 25, hint: 'Rearrange: n = 1.96² × p × (1 − p) ÷ 0.04².',
            reveal: [`n = 3.84 × 0.24 ÷ 0.0016 = <b>${Math.round(1.96 * 1.96 * 0.24 / 0.0016)}</b>.`, `So 400 tests gives about ±4.8 points, and 1,000 gives about ±3.`, `The menu offers 100, 400 and 1,000: 1,000 is the one that meets the requirement.`] },
          apply: [{ label: 'Set the number of tests to 1,000', run() {
            const sel = document.querySelector('#labN'); if (!sel) return 'The test controls are not on this page.';
            sel.value = '1000'; sel.dispatchEvent(new Event('change', { bubbles: true }));
            return 'Done: the test will run 1,000 times.';
          } }] },
        { target: '#labRun', title: 'Real or luck?',
          lines: [`You change one tactical choice and test again.`, `Before: <b>62%</b> of 400 tests succeeded. After: <b>66%</b> of 400.`],
          ask: { kind: 'choice', q: [`Is a 4-point improvement a real effect of your change?`], correct: 1,
            options: [{ t: 'Yes: it went up', fb: 'Each of the two numbers has its own margin of error.' }, { t: 'It could easily be luck', fb: '' }],
            reveal: [`The standard error of the difference is √( 0.62 × 0.38 ÷ 400 + 0.66 × 0.34 ÷ 400 ) = <b>3.4 points</b>.`, `A difference needs to be about <b>1.96 × 3.4 = 6.7 points</b> before it stands out from luck.`, `4 points does not. Test again with more runs, or look for a change big enough to show.`] },
          why: [`Clubs make the same mistake in the other direction: keeping a change because last week went well, when last week was mostly noise.`] },
      ];
    },
  };

  // ---------- put the offers at the top of each page's notes ----------
  const OFFER = {
    hub: () => ['descriptive'],
    build: (ctx) => (ctx.level >= 1 ? ['logistic', 'cond-build'] : ['cond-build']),
    midfield: () => ['cond-midfield'],
    final: () => ['xg'],
    test: () => ['montecarlo'],
  };
  FM.guidesForPage = (page, level) => (OFFER[page] ? OFFER[page]({ level: level || 0 }) : []).filter((id) => FM.guides[id]);
  function wrap() {
    const N = (FM.elenaNotes = FM.elenaNotes || {});
    Object.keys(OFFER).forEach((key) => {
      const orig = N[key];
      N[key] = (c) => {
        const lg = window.FM_WORLD && FM_WORLD.league, level = lg ? (LEVEL[lg.tier] || 0) : 0;
        let body = '';
        try { body = typeof orig === 'function' ? orig(c) : (orig || ''); } catch (e) { body = ''; }
        const offers = FM.guidesForPage(key, level).map((id) => FM.guideOffer(id)).join('');
        return offers + body;
      };
    });
    // a keyword that has a full lesson on this page opens the lesson
    const ALIAS = { logistic: { build: 'logistic', final: 'xg' }, montecarlo: { test: 'montecarlo' }, xg: { final: 'xg' }, conditional: { build: 'cond-build', midfield: 'cond-midfield' }, descriptive: { hub: 'descriptive' } };
    FM.guideFor = (explainId, pageKey) => {
      const a = ALIAS[explainId]; if (!a) return null;
      const id = a[pageKey], L = id && FM.guides[id];
      if (!L || L.pages.indexOf(pageKey) < 0) return null;
      const lg = window.FM_WORLD && FM_WORLD.league;
      if (L.min > (lg ? (LEVEL[lg.tier] || 0) : 0)) return null;
      return id;
    };
  }
  wrap();
  FM.guideLib = { esc, pc, f1, f2, f3, mean, quart, wilson, sig, LEVEL, fillInstruction, instrTargets, goButton, board, KW, kwLesson, kwData };
})();
