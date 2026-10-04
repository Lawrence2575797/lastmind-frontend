// The statistics workshop in the Analysis Centre. The level is chosen once for the season and is cumulative: A-level
// includes the GCSE tools, and the top level includes both. Every tool works on the season's real match data, shows how many
// matches it rests on, and says what it can and cannot tell you.
(function () {
  const FM = (window.FM = window.FM || {});
  const S = FM.STAT;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fin = (v) => typeof v === 'number' && isFinite(v);
  const f2 = (v, d) => (fin(v) ? v.toFixed(d == null ? 2 : d) : 'n/a');
  const pfmt = (p) => (!fin(p) ? 'n/a' : p < 0.0001 ? '< 0.0001' : p.toFixed(4));

  // ---------- the data ----------
  // [key, label, whole numbers?]
  FM.STAT_VARS = [
    ['goals', 'Goals scored', true], ['goalsAgainst', 'Goals conceded', true], ['shots', 'Shots', true], ['shotsAgainst', 'Shots against', true],
    ['onTarget', 'Shots on target', true], ['xg', 'Expected goals (xG)', false], ['xga', 'xG against', false], ['possession', 'Possession (%)', false],
    ['passes', 'Passes', true], ['passPct', 'Pass completion (%)', false], ['dribbleWinPct', 'Dribbles won (%)', false], ['tackleWinPct', 'Challenges won (%)', false],
    ['fouls', 'Fouls', true], ['yellows', 'Yellow cards', true], ['corners', 'Corners', true], ['offsides', 'Offsides', true], ['points', 'Points', true],
  ];
  const VAR = {}; FM.STAT_VARS.forEach((v) => { VAR[v[0]] = { label: v[1], whole: v[2] }; });
  FM.STAT_VAR_INFO = VAR;

  // One row per team per match. scope 'me': your team; 'opp': the opponents in your matches; 'all': every match in the league.
  FM.statRows = function (league, scope) {
    const rows = [];
    league.fixtures.filter((f) => f.played && f.stats).forEach((f) => {
      const ids = [f.homeId, f.awayId];
      const involvesUser = ids.indexOf(league.userId) >= 0;
      if (scope !== 'all' && !involvesUser) return;
      ids.forEach((id, k) => {
        const isUser = id === league.userId;
        if (scope === 'me' && !isUser) return;
        if (scope === 'opp' && (isUser || !involvesUser)) return;
        const oid = ids[1 - k], s = f.stats[id], o = f.stats[oid];
        const tot = s.possession + o.possession || 1;
        const gf = k === 0 ? f.hg : f.ag, ga = k === 0 ? f.ag : f.hg;
        rows.push({
          fxId: f.id, round: f.round, teamId: id, oppId: oid, home: k === 0,
          goals: gf, goalsAgainst: ga, shots: s.shots, shotsAgainst: o.shots, onTarget: s.onTarget, xg: s.xg, xga: o.xg,
          possession: 100 * s.possession / tot, passes: s.passes, passPct: s.passes ? 100 * s.passesOk / s.passes : NaN,
          dribbleWinPct: s.dribbles ? 100 * s.dribblesWon / s.dribbles : NaN, tackleWinPct: s.tackles ? 100 * s.tacklesWon / s.tackles : NaN,
          fouls: s.fouls, yellows: s.yellows, reds: s.reds, corners: s.corners, offsides: s.offsides,
          points: gf > ga ? 3 : gf === ga ? 1 : 0, win: gf > ga, draw: gf === ga, loss: gf < ga,
          passesOk: s.passesOk, dribbles: s.dribbles, dribblesWon: s.dribblesWon, tackles: s.tackles, tacklesWon: s.tacklesWon,
          tactics: s.tactics, formation: s.formation,
        });
      });
    });
    return rows.sort((a, b) => a.round - b.round);
  };
  const SCOPES = [['me', 'Your matches'], ['opp', 'Your opponents in those matches'], ['all', 'Every match in the league']];

  // ---------- drawing ----------
  function niceTicks(lo, hi, count) {
    if (!(hi > lo)) { hi = lo + 1; }
    const raw = (hi - lo) / count, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || raw;
    const out = [];
    for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }
  const tickFmt = (v) => (Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(2).replace(/0+$/, ''));
  function chart(o) {
    const w = 620, h = o.h || 300, l = 54, r = 16, t = 14, b = 46;
    const xs = (v) => l + (v - o.x0) / (o.x1 - o.x0) * (w - l - r);
    const ys = (v) => h - b - (v - o.y0) / (o.y1 - o.y0) * (h - t - b);
    let s = `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(o.label || 'chart')}">`;
    niceTicks(o.y0, o.y1, 5).forEach((v) => { s += `<line class="grid" x1="${l}" x2="${w - r}" y1="${ys(v)}" y2="${ys(v)}"/><text class="tick" x="${l - 7}" y="${ys(v) + 4}" text-anchor="end">${tickFmt(v)}</text>`; });
    (o.xticks || niceTicks(o.x0, o.x1, 7)).forEach((v) => { s += `<line class="grid" x1="${xs(v)}" x2="${xs(v)}" y1="${t}" y2="${h - b}"/><text class="tick" x="${xs(v)}" y="${h - b + 16}" text-anchor="middle">${tickFmt(v)}</text>`; });
    s += `<line class="axis" x1="${l}" x2="${w - r}" y1="${h - b}" y2="${h - b}"/><line class="axis" x1="${l}" x2="${l}" y1="${t}" y2="${h - b}"/>`;
    s += `<text class="axl" x="${(l + w - r) / 2}" y="${h - 6}" text-anchor="middle">${esc(o.xlabel || '')}</text>`;
    s += `<text class="axl" transform="translate(13 ${(t + h - b) / 2}) rotate(-90)" text-anchor="middle">${esc(o.ylabel || '')}</text>`;
    return { s, xs, ys, w, h, l, r, t, b, close: '</svg>' };
  }
  // Bars: [{a, b, c}] where the bar spans a to b and is c high.
  function barChart(bars, o) {
    const x0 = bars[0].a, x1 = bars[bars.length - 1].b, ymax = Math.max.apply(null, bars.map((b) => b.c).concat(o.curveMax || 0, [1e-9])) * 1.15;
    const c = chart({ x0, x1, y0: 0, y1: ymax, xlabel: o.xlabel, ylabel: o.ylabel, xticks: o.xticks, label: o.label });
    let s = c.s;
    bars.forEach((b) => { s += `<rect x="${c.xs(b.a) + 1}" y="${c.ys(b.c)}" width="${Math.max(1, c.xs(b.b) - c.xs(b.a) - 2)}" height="${c.ys(0) - c.ys(b.c)}" fill="${b.fill || '#F2C14E'}" fill-opacity="0.85"/>`; });
    if (o.curve) { let d = ''; for (let i = 0; i <= 80; i++) { const x = x0 + (x1 - x0) * i / 80; d += (i ? 'L' : 'M') + c.xs(x).toFixed(1) + ' ' + c.ys(o.curve(x)).toFixed(1); } s += `<path d="${d}" fill="none" stroke="#7FD1FF" stroke-width="2.5"/>`; }
    return s + c.close;
  }
  function histogramBars(values, whole) {
    const lo = Math.min.apply(null, values), hi = Math.max.apply(null, values);
    const distinct = new Set(values).size;
    if (whole && distinct <= 14) {
      const bars = [];
      for (let v = lo; v <= hi; v++) bars.push({ a: v - 0.5, b: v + 0.5, c: values.filter((x) => x === v).length, label: String(v) });
      return { bars, discrete: true };
    }
    const k = Math.max(4, Math.min(9, Math.ceil(Math.sqrt(values.length) * 1.4)));
    const width = niceTicks(lo, hi, k).length > 1 ? niceTicks(lo, hi, k)[1] - niceTicks(lo, hi, k)[0] : (hi - lo || 1) / k;
    const start = Math.floor(lo / width) * width, bars = [];
    for (let a = start; a < hi + 1e-9; a += width) bars.push({ a, b: a + width, c: values.filter((x) => x >= a && (x < a + width || (a + width > hi && x <= hi + 1e-9))).length });
    return { bars, discrete: false, width };
  }

  // ---------- shared state and helpers for the tools ----------
  const st = { scope: 'me', x: 'goals', y: 'shots', compare: 'meopp', flip: {} };
  const values = (rows, key) => rows.map((r) => r[key]).filter(fin);
  const varSelect = (id, sel) => `<select id="${id}">${FM.STAT_VARS.map((v) => `<option value="${v[0]}"${v[0] === sel ? ' selected' : ''}>${v[1]}</option>`).join('')}</select>`;
  const needN = (n, min) => (n < min ? `<p class="note">This needs at least ${min} matches' data to say anything, and you have ${n}. Play more matches, or look at "Every match in the league" above.</p>` : '');
  const smallN = (n) => (n < 10 ? `<p class="note warnnote">With only ${n} matches this is a very small sample: a different handful of matches could give quite different answers.</p>` : '');
  const strength = (r) => { const a = Math.abs(r); const w = a >= 0.7 ? 'strong' : a >= 0.4 ? 'moderate' : a >= 0.2 ? 'weak' : 'little or no'; return w + (a >= 0.2 ? (r > 0 ? ' positive' : ' negative') : '') + ' correlation'; };

  FM.STAT_TOOLS = FM.STAT_TOOLS || [];
  const tool = (t) => FM.STAT_TOOLS.push(t);

  // ======================= GCSE =======================
  tool({
    id: 'averages', level: 'gcse', title: 'Averages and spread',
    blurb: 'The mean (add everything up and divide by how many), the median (the middle value), the mode (the most common) and the range (biggest minus smallest) describe a set of numbers.',
    draw(box, c) {
      const v = values(c.rows, st.x), n = v.length;
      box.innerHTML = `<label>Measure<select id="avVar">${FM.STAT_VARS.map((x) => `<option value="${x[0]}"${x[0] === st.x ? ' selected' : ''}>${x[1]}</option>`).join('')}</select></label>` + (n < 2 ? needN(n, 2) : (() => {
        const q = S.quartiles(v), mo = S.mode(v), w = VAR[st.x].whole;
        const d = w ? 1 : 2;
        return `<div class="tablewrap"><table class="data"><tbody>
          <tr><td class="l">Number of matches (n)</td><td>${n}</td></tr>
          <tr><td class="l">Mean</td><td>${f2(S.mean(v), 2)}</td></tr>
          <tr><td class="l">Median</td><td>${f2(S.median(v), d)}</td></tr>
          <tr><td class="l">Mode</td><td>${mo.length ? mo.join(', ') : 'none (no value repeats)'}</td></tr>
          <tr><td class="l">Smallest, largest</td><td>${f2(Math.min.apply(null, v), d)}, ${f2(Math.max.apply(null, v), d)}</td></tr>
          <tr><td class="l">Range</td><td>${f2(S.range(v), d)}</td></tr>
          <tr><td class="l">Lower quartile, upper quartile</td><td>${f2(q.q1, d)}, ${f2(q.q3, d)}</td></tr>
          <tr><td class="l">Interquartile range</td><td>${f2(q.q3 - q.q1, d)}</td></tr></tbody></table></div>
          <p class="note">The mean is pulled by unusually high or low matches and the median is not, so when they differ a lot, a few matches are standing out.</p>` + smallN(n);
      })());
      box.querySelector('#avVar').addEventListener('change', (e) => { st.x = e.target.value; c.redraw(); });
    },
  });

  tool({
    id: 'frequency', level: 'gcse', title: 'Frequency table and chart',
    blurb: 'Counting how often each value occurs, and as a proportion of all the matches (the relative frequency), shows the shape of the data.',
    draw(box, c) {
      const v = values(c.rows, st.x), n = v.length;
      box.innerHTML = `<label>Measure${varSelect('frVar', st.x)}</label>` + (n < 3 ? needN(n, 3) : (() => {
        const h = histogramBars(v, VAR[st.x].whole);
        const lab = (b) => (h.discrete ? b.label : tickFmt(b.a) + ' to under ' + tickFmt(b.b));
        const rel = h.bars.map((b) => Object.assign({}, b, { c: b.c / n }));
        return `<div class="tablewrap"><table class="data"><thead><tr><th class="l">${esc(VAR[st.x].label)}</th><th>Frequency</th><th>Relative frequency</th></tr></thead><tbody>${h.bars.map((b) => `<tr><td class="l">${lab(b)}</td><td>${b.c}</td><td>${f2(b.c / n, 3)}</td></tr>`).join('')}<tr><td class="l"><b>Total</b></td><td><b>${n}</b></td><td><b>1.000</b></td></tr></tbody></table></div>` +
          barChart(rel, { xlabel: VAR[st.x].label, ylabel: 'Relative frequency', label: 'Relative frequency chart', xticks: h.discrete ? h.bars.map((b) => (b.a + b.b) / 2) : null }) +
          `<p class="note">Each bar's height is the share of matches that fall in it, so the heights add up to 1.</p>` + smallN(n);
      })());
      box.querySelector('#frVar').addEventListener('change', (e) => { st.x = e.target.value; c.redraw(); });
    },
  });

  function boxSvg(groups, xlabel) {
    const all = [].concat.apply([], groups.map((g) => g.data));
    const lo = Math.min.apply(null, all), hi = Math.max.apply(null, all), pad = (hi - lo || 1) * 0.08;
    const w = 620, h = 70 + groups.length * 64, l = 130, r = 20, t = 12, b = 44;
    const xs = (v) => l + (v - (lo - pad)) / ((hi + pad) - (lo - pad)) * (w - l - r);
    let s = `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Box plots">`;
    niceTicks(lo - pad, hi + pad, 7).forEach((v) => { s += `<line class="grid" x1="${xs(v)}" x2="${xs(v)}" y1="${t}" y2="${h - b}"/><text class="tick" x="${xs(v)}" y="${h - b + 16}" text-anchor="middle">${tickFmt(v)}</text>`; });
    s += `<line class="axis" x1="${l}" x2="${w - r}" y1="${h - b}" y2="${h - b}"/><text class="axl" x="${(l + w - r) / 2}" y="${h - 6}" text-anchor="middle">${esc(xlabel)}</text>`;
    groups.forEach((g, i) => {
      const y = t + 30 + i * 64, q = S.quartiles(g.data), mn = Math.min.apply(null, g.data), mx = Math.max.apply(null, g.data);
      s += `<text class="tick" x="${l - 10}" y="${y + 4}" text-anchor="end" font-size="12">${esc(g.label)} (n = ${g.data.length})</text>`;
      s += `<line x1="${xs(mn)}" x2="${xs(q.q1)}" y1="${y}" y2="${y}" stroke="${g.color}" stroke-width="2.5"/><line x1="${xs(q.q3)}" x2="${xs(mx)}" y1="${y}" y2="${y}" stroke="${g.color}" stroke-width="2.5"/>`;
      s += `<line x1="${xs(mn)}" x2="${xs(mn)}" y1="${y - 9}" y2="${y + 9}" stroke="${g.color}" stroke-width="2.5"/><line x1="${xs(mx)}" x2="${xs(mx)}" y1="${y - 9}" y2="${y + 9}" stroke="${g.color}" stroke-width="2.5"/>`;
      s += `<rect x="${xs(q.q1)}" y="${y - 17}" width="${Math.max(2, xs(q.q3) - xs(q.q1))}" height="34" fill="${g.color}" fill-opacity="0.3" stroke="${g.color}" stroke-width="2.5"/><line x1="${xs(q.q2)}" x2="${xs(q.q2)}" y1="${y - 17}" y2="${y + 17}" stroke="#fff" stroke-width="3.5"/>`;
    });
    return s + '</svg>';
  }
  tool({
    id: 'boxplot', level: 'gcse', title: 'Box plots',
    blurb: 'A box plot shows the smallest value, lower quartile, median, upper quartile and largest value, so two groups can be compared at a glance.',
    draw(box, c) {
      const meRows = FM.statRows(c.league, 'me'), oppRows = FM.statRows(c.league, 'opp'), all = FM.statRows(c.league, 'all');
      const groups = st.compare === 'meopp'
        ? [{ label: 'You', data: values(meRows, st.x), color: '#F2C14E' }, { label: 'Opponents', data: values(oppRows, st.x), color: '#7FD1FF' }]
        : [{ label: 'Home', data: values(all.filter((r) => r.home), st.x), color: '#F2C14E' }, { label: 'Away', data: values(all.filter((r) => !r.home), st.x), color: '#7FD1FF' }];
      const ok = groups.every((g) => g.data.length >= 3);
      box.innerHTML = `<div class="row"><label>Measure${varSelect('bpVar', st.x)}</label><label>Compare<select id="bpCmp"><option value="meopp"${st.compare === 'meopp' ? ' selected' : ''}>You and your opponents</option><option value="homeaway"${st.compare === 'homeaway' ? ' selected' : ''}>Home and away, all league matches</option></select></label></div>` +
        (!ok ? needN(Math.min.apply(null, groups.map((g) => g.data.length)), 3) : boxSvg(groups, VAR[st.x].label) +
          `<div class="tablewrap"><table class="data"><thead><tr><th class="l"></th>${groups.map((g) => `<th>${g.label}</th>`).join('')}</tr></thead><tbody>${[['Smallest', (d) => Math.min.apply(null, d)], ['Lower quartile', (d) => S.quartiles(d).q1], ['Median', (d) => S.median(d)], ['Upper quartile', (d) => S.quartiles(d).q3], ['Largest', (d) => Math.max.apply(null, d)]].map(([n, f]) => `<tr><td class="l">${n}</td>${groups.map((g) => `<td>${f2(f(g.data), VAR[st.x].whole ? 1 : 2)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
          <p class="note">The box holds the middle half of the matches; the white line is the median. If the boxes barely overlap the groups differ clearly, but with few matches even a big gap can be chance.</p>`);
      box.querySelector('#bpVar').addEventListener('change', (e) => { st.x = e.target.value; c.redraw(); });
      box.querySelector('#bpCmp').addEventListener('change', (e) => { st.compare = e.target.value; c.redraw(); });
    },
  });

  tool({
    id: 'cumfreq', level: 'gcse', title: 'Cumulative frequency',
    blurb: 'A cumulative frequency graph shows how many matches were at or below each value, so the median and quartiles can be read straight off it.',
    draw(box, c) {
      const v = values(c.rows, st.x).sort((a, b) => a - b), n = v.length;
      box.innerHTML = `<label>Measure${varSelect('cfVar', st.x)}</label>` + (n < 3 ? needN(n, 3) : (() => {
        const lo = v[0], hi = v[n - 1], pad = (hi - lo || 1) * 0.05;
        const ch = chart({ x0: lo - pad, x1: hi + pad, y0: 0, y1: n, xlabel: VAR[st.x].label, ylabel: 'Cumulative frequency', label: 'Cumulative frequency graph' });
        let s = ch.s, d = `M${ch.xs(lo - pad)} ${ch.ys(0)}`;
        v.forEach((x, i) => { d += ` L${ch.xs(x)} ${ch.ys(i)} L${ch.xs(x)} ${ch.ys(i + 1)}`; });
        d += ` L${ch.xs(hi + pad)} ${ch.ys(n)}`;
        s += `<path d="${d}" fill="none" stroke="#F2C14E" stroke-width="2.5"/>`;
        const q = S.quartiles(v);
        [[q.q1, n / 4, 'Q1'], [q.q2, n / 2, 'median'], [q.q3, 3 * n / 4, 'Q3']].forEach(([x, y, t]) => { s += `<line x1="${ch.l}" x2="${ch.xs(x)}" y1="${ch.ys(y)}" y2="${ch.ys(y)}" stroke="#7FD1FF" stroke-dasharray="5 4"/><line x1="${ch.xs(x)}" x2="${ch.xs(x)}" y1="${ch.ys(y)}" y2="${ch.ys(0)}" stroke="#7FD1FF" stroke-dasharray="5 4"/><text class="tick" x="${ch.xs(x) + 4}" y="${ch.ys(y) - 5}" fill="#7FD1FF">${t} = ${tickFmt(+x.toFixed(2))}</text>`; });
        return s + ch.close + `<p class="note">The curve climbs by one for every match. Read across from n/4, n/2 and 3n/4 (dashed lines) to find the quartiles and the median.</p>` + smallN(n);
      })());
      box.querySelector('#cfVar').addEventListener('change', (e) => { st.x = e.target.value; c.redraw(); });
    },
  });

  function scatterSvg(xs, ys, o) {
    const x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    const px = (x1 - x0 || 1) * 0.08, py = (y1 - y0 || 1) * 0.08;
    const c = chart({ x0: x0 - px, x1: x1 + px, y0: y0 - py, y1: y1 + py, xlabel: o.xlabel, ylabel: o.ylabel, label: 'Scatter graph' });
    let s = c.s;
    if (o.line) s += `<line x1="${c.xs(x0 - px)}" y1="${c.ys(o.line.a + o.line.b * (x0 - px))}" x2="${c.xs(x1 + px)}" y2="${c.ys(o.line.a + o.line.b * (x1 + px))}" stroke="#7FD1FF" stroke-width="2.5"/>`;
    xs.forEach((x, i) => { s += `<circle cx="${c.xs(x)}" cy="${c.ys(ys[i])}" r="${o.r || 4.5}" fill="#F2C14E" fill-opacity="0.8" stroke="#1A232D" stroke-width="1"/>`; });
    return s + c.close;
  }
  const pairs = (rows, kx, ky) => { const a = [], b = []; rows.forEach((r) => { if (fin(r[kx]) && fin(r[ky])) { a.push(r[kx]); b.push(r[ky]); } }); return [a, b]; };
  tool({
    id: 'scatter', level: 'gcse', title: 'Scatter graph and line of best fit',
    blurb: 'A scatter graph plots two measurements for each match. If the points slope up or down, the two are correlated; a line of best fit runs through the middle of them.',
    draw(box, c) {
      const [xv, yv] = pairs(c.rows, st.x, st.y), n = xv.length;
      box.innerHTML = `<div class="row"><label>Across the page (x)${varSelect('scX', st.x)}</label><label>Up the page (y)${varSelect('scY', st.y)}</label></div>` + (n < 4 ? needN(n, 4) : (() => {
        const lr = S.linreg(xv, yv);
        return scatterSvg(xv, yv, { xlabel: VAR[st.x].label, ylabel: VAR[st.y].label, line: fin(lr.b) ? lr : null }) +
          `<p class="desc">${n} matches. The points show ${esc(strength(lr.r))} between ${esc(VAR[st.x].label.toLowerCase())} and ${esc(VAR[st.y].label.toLowerCase())}.</p>
          <p class="note">Correlation is not cause: two measures can rise together because a third thing drives both. Possession and passes, for example, both follow how long a team has the ball.</p>` + smallN(n);
      })());
      box.querySelector('#scX').addEventListener('change', (e) => { st.x = e.target.value; c.redraw(); });
      box.querySelector('#scY').addEventListener('change', (e) => { st.y = e.target.value; c.redraw(); });
    },
  });

  // ======================= A-level =======================
  tool({
    id: 'normal', level: 'alevel', title: 'Standard deviation and the normal distribution',
    blurb: 'The standard deviation measures how far values typically sit from the mean. Many measurements follow a bell-shaped normal curve, and then about 68% lie within one standard deviation of the mean and 95% within two.',
    draw(box, c) {
      const v = values(c.rows, st.x), n = v.length;
      box.innerHTML = `<label>Measure${varSelect('nmVar', st.x)}</label>` + (n < 5 ? needN(n, 5) : (() => {
        const m = S.mean(v), sd = S.sd(v, true), whole = VAR[st.x].whole;
        const within = (k) => v.filter((x) => Math.abs(x - m) <= k * sd).length;
        const h = histogramBars(v, whole), bw = h.discrete ? 1 : h.width;
        const last = c.rows.filter((r) => fin(r[st.x])).slice(-1)[0], z = last ? (last[st.x] - m) / sd : NaN;
        const kk = Math.round(m + sd);
        return `<div class="tablewrap"><table class="data"><tbody>
          <tr><td class="l">Mean</td><td>${f2(m)}</td></tr><tr><td class="l">Variance (sample)</td><td>${f2(S.variance(v, true))}</td></tr><tr><td class="l">Standard deviation (sample, divide by n - 1)</td><td>${f2(sd)}</td></tr>
          <tr><td class="l">Within 1 standard deviation of the mean</td><td>${within(1)} of ${n} (${Math.round(100 * within(1) / n)}%), a normal curve predicts 68%</td></tr>
          <tr><td class="l">Within 2 standard deviations</td><td>${within(2)} of ${n} (${Math.round(100 * within(2) / n)}%), a normal curve predicts 95%</td></tr>
          ${last ? `<tr><td class="l">Most recent match, as a z-score</td><td>${f2(last[st.x], whole ? 0 : 2)} is z = ${f2(z)}</td></tr>` : ''}</tbody></table></div>` +
          barChart(h.bars, { xlabel: VAR[st.x].label, ylabel: 'Frequency', label: 'Histogram with normal curve', curve: (x) => n * bw * S.normPdf(x, m, sd), curveMax: n * bw * S.normPdf(m, m, sd), xticks: h.discrete ? h.bars.map((b) => (b.a + b.b) / 2) : null }) +
          `<p class="note">The blue curve is the normal distribution with this mean and standard deviation. If the bars follow it, the model is a fair description; if not (counts are often lopsided at the low end), be careful with it.</p>
          <div class="row"><label>Chance of at least<input type="number" id="nmK" value="${kk}" step="${whole ? 1 : 0.5}"></label><div id="nmOut" class="desc" style="align-self:end"></div></div>` + smallN(n);
      })());
      box.querySelector('#nmVar').addEventListener('change', (e) => { st.x = e.target.value; c.redraw(); });
      const k = box.querySelector('#nmK');
      if (k) {
        const upd = () => {
          const m = S.mean(v), sd = S.sd(v, true), whole = VAR[st.x].whole, kv = parseFloat(k.value);
          if (!fin(kv)) return;
          const edge = whole ? kv - 0.5 : kv, p = 1 - S.normCdf(edge, m, sd), obs = v.filter((x) => x >= kv).length;
          box.querySelector('#nmOut').innerHTML = `P(X &ge; ${tickFmt(kv)}) = ${f2(p, 3)} under the normal model${whole ? ' (with a continuity correction: we use ' + tickFmt(kv - 0.5) + ')' : ''}. In fact ${obs} of ${n} matches (${Math.round(100 * obs / n)}%).`;
        };
        k.addEventListener('input', upd); upd();
      }
    },
  });

  // exact binomial p-value for H1: p > p0, p < p0 or p != p0
  FM.binomTest = (k, n, p0, alt) => {
    if (alt === 'greater') return 1 - S.binomCdf(k - 1, n, p0);
    if (alt === 'less') return S.binomCdf(k, n, p0);
    const obs = S.binomPmf(k, n, p0); let p = 0;
    for (let i = 0; i <= n; i++) { const q = S.binomPmf(i, n, p0); if (q <= obs * (1 + 1e-9)) p += q; }
    return Math.min(1, p);
  };
  const RATES = {
    shotsGoals: ['Shots that became goals', 'shots', 'goals', 'shots', 'goals'],
    shotsOn: ['Shots that were on target', 'shots', 'onTarget', 'shots', 'on target'],
    passes: ['Passes that were completed', 'passes', 'passesOk', 'passes', 'completed'],
    dribbles: ['Dribbles that succeeded', 'dribbles', 'dribblesWon', 'dribbles', 'successful'],
    tackles: ['Challenges that were won', 'tackles', 'tacklesWon', 'challenges', 'won'],
  };
  FM.RATES = RATES;
  const totals = (rows, key) => rows.reduce((a, r) => a + (r[key] || 0), 0);
  const record = (c, entry) => { c.league.testLog = c.league.testLog || []; entry.day = c.league.day; entry.id = 'T' + (c.league.testLog.length + 1); c.league.testLog.push(entry); FM.saveLeague(c.league); if (FM.redrawStatTool) FM.redrawStatTool('multiple'); };
  FM.recordTest = record;
  const logNote = (c) => { const m = (c.league.testLog || []).length; return `<p class="note" id="logNote">Tests you have recorded this season: <b>${m}</b>.${m >= 5 ? ' The more tests you run, the more likely one passes by chance alone.' : ''}</p>`; };

  tool({
    id: 'binomial', level: 'alevel', title: 'Binomial distribution and hypothesis test',
    blurb: 'If each of n attempts succeeds with probability p, independently, the number of successes follows a binomial distribution. A hypothesis test asks whether what happened is surprising if the true probability were p0.',
    draw(box, c) {
      if (!st.rate) st.rate = 'shotsGoals';
      const R = RATES[st.rate], n = totals(c.rows, R[1]), k = totals(c.rows, R[2]);
      const all = FM.statRows(c.league, 'all'), N0 = totals(all, R[1]), K0 = totals(all, R[2]);
      if (st.p0 == null || st.p0Rate !== st.rate) { st.p0 = N0 ? +(K0 / N0).toFixed(3) : 0.1; st.p0Rate = st.rate; }
      if (!st.alt) st.alt = 'greater';
      if (st.alpha == null) st.alpha = 0.05;
      box.innerHTML = `<div class="row"><label>What is being counted<select id="bnRate">${Object.keys(RATES).map((k2) => `<option value="${k2}"${k2 === st.rate ? ' selected' : ''}>${RATES[k2][0]}</option>`).join('')}</select></label>
        <label>Data from<select id="bnScope">${SCOPES.map((s) => `<option value="${s[0]}"${s[0] === st.scope ? ' selected' : ''}>${s[1]}</option>`).join('')}</select></label></div>` +
        (n < 5 ? needN(c.rows.length, 1) + '<p class="note">Too few attempts so far.</p>' : (() => {
          const p0 = st.p0, alt = st.alt, alpha = st.alpha, p = FM.binomTest(k, n, p0, alt);
          const mu = n * p0, sdv = Math.sqrt(n * p0 * (1 - p0));
          const lo = Math.max(0, Math.floor(mu - 4 * sdv)), hi = Math.min(n, Math.ceil(mu + 4 * sdv));
          const bars = [];
          for (let i = lo; i <= hi; i++) bars.push({ a: i - 0.5, b: i + 0.5, c: S.binomPmf(i, n, p0), fill: (alt === 'greater' ? i >= k : alt === 'less' ? i <= k : S.binomPmf(i, n, p0) <= S.binomPmf(k, n, p0) * (1 + 1e-9)) ? '#E58C8C' : '#F2C14E' });
          const altText = { greater: 'p > ' + p0 + ' (higher than the league rate)', less: 'p < ' + p0 + ' (lower than the league rate)', two: 'p is not ' + p0 + ' (different either way)' }[alt];
          const sig = p < alpha;
          return `<div class="row"><label>H0: true probability p0 =<input type="number" id="bnP0" value="${st.p0}" min="0.001" max="0.999" step="0.01"></label>
            <label>H1<select id="bnAlt"><option value="greater"${alt === 'greater' ? ' selected' : ''}>p is higher than p0</option><option value="less"${alt === 'less' ? ' selected' : ''}>p is lower than p0</option><option value="two"${alt === 'two' ? ' selected' : ''}>p is different from p0</option></select></label>
            <label>Significance level<select id="bnAlpha">${[0.1, 0.05, 0.01].map((a) => `<option value="${a}"${a === alpha ? ' selected' : ''}>${a * 100}%</option>`).join('')}</select></label></div>
            <p class="desc">Data: ${k} ${R[4]} out of ${n} ${R[3]} (${f2(100 * k / n, 1)}%), over ${c.rows.length} matches. The default p0 is the rate across every match in the league, ${f2(100 * K0 / (N0 || 1), 1)}%.</p>
            <p class="desc">Under H0, X ~ B(${n}, ${p0}), mean ${f2(mu, 1)} and standard deviation ${f2(sdv, 2)}. The red bars are the outcomes as extreme as yours (or more) in the direction of H1.</p>` +
            barChart(bars, { xlabel: 'Number ' + R[4], ylabel: 'Probability under H0', label: 'Binomial distribution' }) +
            `<p class="desc"><b>p-value = ${pfmt(p)}</b> for H1: ${altText}. ${sig ? `This is below ${alpha * 100}%, so we <b>reject H0</b>: a result this extreme would be unusual if p really were ${p0}.` : `This is not below ${alpha * 100}%, so we <b>do not reject H0</b>: your result is the kind of thing chance produces often enough.`}</p>
            <p class="note">"Do not reject" is not "proved the same". Passing the test also does not mean the result is caused by your tactics, and a test run on data you went looking through can pass by luck.</p>
            <div class="row"><button id="bnRec">Record this test</button></div>` + logNote(c);
        })());
      const redo = () => c.redraw();
      box.querySelector('#bnRate').addEventListener('change', (e) => { st.rate = e.target.value; redo(); });
      box.querySelector('#bnScope').addEventListener('change', (e) => { st.scope = e.target.value; c.redrawAll(); });
      const p0 = box.querySelector('#bnP0'); if (p0) p0.addEventListener('change', (e) => { const v = parseFloat(e.target.value); if (v > 0 && v < 1) { st.p0 = v; redo(); } });
      const alt = box.querySelector('#bnAlt'); if (alt) alt.addEventListener('change', (e) => { st.alt = e.target.value; redo(); });
      const al = box.querySelector('#bnAlpha'); if (al) al.addEventListener('change', (e) => { st.alpha = parseFloat(e.target.value); redo(); });
      const rec = box.querySelector('#bnRec');
      if (rec) rec.addEventListener('click', () => {
        const p = FM.binomTest(k, n, st.p0, st.alt);
        record(c, { tool: 'binomial', label: R[0] + ': ' + k + ' of ' + n + ' vs p0 = ' + st.p0 + ' (' + st.alt + ')', p, alpha: st.alpha, n, scope: st.scope });
        c.redraw();
      });
    },
  });

  tool({
    id: 'pmcc', level: 'alevel', title: 'Correlation: the product moment correlation coefficient',
    blurb: 'The correlation coefficient r runs from -1 (a perfect downhill line) to +1 (a perfect uphill line). A test asks whether r could just be chance when there is really no correlation.',
    draw(box, c) {
      const [xv, yv] = pairs(c.rows, st.x, st.y), n = xv.length;
      box.innerHTML = `<div class="row"><label>Measure 1${varSelect('prX', st.x)}</label><label>Measure 2${varSelect('prY', st.y)}</label></div>` + (n < 4 ? needN(n, 4) : (() => {
        const r = S.pmcc(xv, yv), t = S.corrTest(r, n), tc = S.tInv(0.975, n - 2), rcrit = tc / Math.sqrt(n - 2 + tc * tc);
        const sig = t.p < 0.05;
        return scatterSvg(xv, yv, { xlabel: VAR[st.x].label, ylabel: VAR[st.y].label, line: S.linreg(xv, yv) }) +
          `<div class="tablewrap"><table class="data"><tbody>
          <tr><td class="l">n</td><td>${n}</td></tr><tr><td class="l">Correlation coefficient r</td><td>${f2(r, 3)} (${esc(strength(r))})</td></tr>
          <tr><td class="l">Test of H0: &rho; = 0 against H1: &rho; &ne; 0 (two-tailed, 5%)</td><td>critical value |r| &gt; ${f2(rcrit, 3)}</td></tr>
          <tr><td class="l">Test statistic t = r&radic;((n - 2)/(1 - r&sup2;))</td><td>t = ${f2(t.t, 2)} on ${t.df} degrees of freedom</td></tr><tr><td class="l">p-value</td><td><b>${pfmt(t.p)}</b></td></tr></tbody></table></div>
          <p class="desc">${Math.abs(r) > rcrit ? `|r| = ${f2(Math.abs(r), 3)} is bigger than the critical value ${f2(rcrit, 3)}, so there is evidence of correlation at the 5% level.` : `|r| = ${f2(Math.abs(r), 3)} is not bigger than the critical value ${f2(rcrit, 3)}, so there is not enough evidence of correlation at the 5% level.`}</p>
          <p class="note">With few matches the critical value is high: a sizeable r can still be chance. Correlation measures a straight-line link only, and it does not show that one thing causes the other.</p>
          <div class="row"><button id="prRec">Record this test</button></div>` + logNote(c) + smallN(n);
      })());
      box.querySelector('#prX').addEventListener('change', (e) => { st.x = e.target.value; c.redraw(); });
      box.querySelector('#prY').addEventListener('change', (e) => { st.y = e.target.value; c.redraw(); });
      const rec = box.querySelector('#prRec');
      if (rec) rec.addEventListener('click', () => { const r = S.pmcc(xv, yv); record(c, { tool: 'pmcc', label: 'Correlation of ' + VAR[st.x].label + ' with ' + VAR[st.y].label + ': r = ' + f2(r, 3), p: S.corrTest(r, n).p, alpha: 0.05, n, scope: st.scope }); c.redraw(); });
    },
  });

  tool({
    id: 'regression', level: 'alevel', title: 'Regression line and prediction',
    blurb: 'The least-squares regression line y = a + bx is the straight line that makes the squared vertical gaps to the points as small as possible. It lets you predict y for a given x.',
    draw(box, c) {
      const [xv, yv] = pairs(c.rows, st.x, st.y), n = xv.length;
      box.innerHTML = `<div class="row"><label>Explanatory (x)${varSelect('rgX', st.x)}</label><label>Response (y)${varSelect('rgY', st.y)}</label></div>` + (n < 4 ? needN(n, 4) : (() => {
        const lr = S.linreg(xv, yv), res = yv.map((y, i) => y - (lr.a + lr.b * xv[i])), se = Math.sqrt(S.sum(res.map((e) => e * e)) / (n - 2));
        const x0 = Math.min.apply(null, xv), x1 = Math.max.apply(null, xv);
        if (st.pred == null) st.pred = +S.mean(xv).toFixed(1);
        const yp = lr.a + lr.b * st.pred, inside = st.pred >= x0 && st.pred <= x1;
        return scatterSvg(xv, yv, { xlabel: VAR[st.x].label, ylabel: VAR[st.y].label, line: lr }) +
          `<p class="desc"><b>${esc(VAR[st.y].label)} = ${f2(lr.a, 2)} ${lr.b < 0 ? '-' : '+'} ${f2(Math.abs(lr.b), 3)} &times; ${esc(VAR[st.x].label)}</b></p>
          <p class="desc">The gradient ${f2(lr.b, 3)} means each extra unit of ${esc(VAR[st.x].label.toLowerCase())} goes with ${f2(Math.abs(lr.b), 3)} ${lr.b < 0 ? 'fewer' : 'more'} ${esc(VAR[st.y].label.toLowerCase())}, on average. r&sup2; = ${f2(lr.r2, 3)}: the line accounts for ${Math.round(100 * lr.r2)}% of the variation in ${esc(VAR[st.y].label.toLowerCase())}. Typical gap from the line: ${f2(se, 2)}.</p>
          <div class="row"><label>Predict ${esc(VAR[st.y].label.toLowerCase())} when ${esc(VAR[st.x].label.toLowerCase())} is<input type="number" id="rgP" value="${st.pred}" step="any"></label><div class="desc" style="align-self:end">y = ${f2(yp, 2)}. ${inside ? 'This is interpolation, inside the range of your data (' + f2(x0, 1) + ' to ' + f2(x1, 1) + '), so it is reasonably safe.' : 'This is <b>extrapolation</b>, outside the range of your data (' + f2(x0, 1) + ' to ' + f2(x1, 1) + '), so do not trust it.'}</div></div>` + smallN(n);
      })());
      box.querySelector('#rgX').addEventListener('change', (e) => { st.x = e.target.value; st.pred = null; c.redraw(); });
      box.querySelector('#rgY').addEventListener('change', (e) => { st.y = e.target.value; c.redraw(); });
      const p = box.querySelector('#rgP'); if (p) p.addEventListener('change', (e) => { const v = parseFloat(e.target.value); if (fin(v)) { st.pred = v; c.redraw(); } });
    },
  });

  // events a team-match either had or did not
  const EVENTS = {
    win: ['won the match', (r) => r.win], scored2: ['scored two or more goals', (r) => r.goals >= 2], clean: ['kept a clean sheet', (r) => r.goalsAgainst === 0],
    moreShots: ['had more shots than the opposition', (r) => r.shots > r.shotsAgainst], morePoss: ['had more than half the possession', (r) => r.possession > 50],
    moreXg: ['created more xG than the opposition', (r) => r.xg > r.xga], card: ['received a yellow or red card', (r) => r.yellows + r.reds > 0], conceded2: ['conceded two or more goals', (r) => r.goalsAgainst >= 2],
    home: ['played at home', (r) => r.home], over25: ['was in a match with 3 or more goals', (r) => r.goals + r.goalsAgainst >= 3],
  };
  FM.STAT_EVENTS = EVENTS;
  tool({
    id: 'conditional', level: 'alevel', title: 'Conditional probability',
    blurb: 'P(A | B) is the probability of A given that B has happened. If knowing B does not change the chance of A, the two events are independent.',
    draw(box, c) {
      if (!st.evA) { st.evA = 'win'; st.evB = 'moreShots'; }
      const rows = c.rows, n = rows.length, A = EVENTS[st.evA][1], B = EVENTS[st.evB][1];
      const opt = (sel) => Object.keys(EVENTS).map((k) => `<option value="${k}"${k === sel ? ' selected' : ''}>${esc(EVENTS[k][0])}</option>`).join('');
      box.innerHTML = `<div class="row"><label>Event A: the team<select id="cpA">${opt(st.evA)}</select></label><label>Given B: the team<select id="cpB">${opt(st.evB)}</select></label></div>` + (n < 6 ? needN(n, 6) : (() => {
        const ab = rows.filter((r) => A(r) && B(r)).length, anb = rows.filter((r) => A(r) && !B(r)).length, nab = rows.filter((r) => !A(r) && B(r)).length, nanb = rows.filter((r) => !A(r) && !B(r)).length;
        const nB = ab + nab, nNB = anb + nanb, nA = ab + anb;
        const pA = nA / n, pB = nB / n, pAB = ab / n, pAgB = nB ? ab / nB : NaN, pAgNB = nNB ? anb / nNB : NaN, pBgA = nA ? ab / nA : NaN;
        return `<div class="tablewrap"><table class="data"><thead><tr><th class="l"></th><th>B</th><th>not B</th><th>Total</th></tr></thead><tbody>
          <tr><td class="l">A</td><td>${ab}</td><td>${anb}</td><td>${nA}</td></tr><tr><td class="l">not A</td><td>${nab}</td><td>${nanb}</td><td>${nab + nanb}</td></tr><tr><td class="l">Total</td><td>${nB}</td><td>${nNB}</td><td>${n}</td></tr></tbody></table></div>
          <div class="tablewrap"><table class="data"><tbody>
          <tr><td class="l">P(A)</td><td>${nA}/${n} = ${f2(pA, 3)}</td></tr><tr><td class="l">P(B)</td><td>${nB}/${n} = ${f2(pB, 3)}</td></tr>
          <tr><td class="l">P(A and B)</td><td>${ab}/${n} = ${f2(pAB, 3)}</td></tr>
          <tr><td class="l">P(A | B) = P(A and B) / P(B)</td><td><b>${ab}/${nB} = ${f2(pAgB, 3)}</b></td></tr>
          <tr><td class="l">P(A | not B)</td><td>${anb}/${nNB} = ${f2(pAgNB, 3)}</td></tr>
          <tr><td class="l">P(B | A) by Bayes: P(A | B) P(B) / P(A)</td><td>${f2(pAgB * pB / pA, 3)} (counted directly: ${f2(pBgA, 3)})</td></tr>
          <tr><td class="l">Independent if P(A and B) = P(A) &times; P(B)</td><td>${f2(pAB, 3)} compared with ${f2(pA * pB, 3)}</td></tr></tbody></table></div>
          <p class="desc">${fin(pAgB) && Math.abs(pAgB - pA) > 0.1 ? `Knowing B changes the picture: ${f2(pA, 2)} becomes ${f2(pAgB, 2)}.` : 'Knowing B hardly changes the chance of A in this data.'}</p>
          <p class="note">A conditional probability describes what tends to go together in these matches. It does not say that B causes A, and with ${n} matches the small cells of the table are very uncertain.</p>` + smallN(n);
      })());
      box.querySelector('#cpA').addEventListener('change', (e) => { st.evA = e.target.value; c.redraw(); });
      box.querySelector('#cpB').addEventListener('change', (e) => { st.evB = e.target.value; c.redraw(); });
    },
  });

  FM.STAT_UI = { esc, f2, pfmt, fin, chart, barChart, niceTicks, tickFmt, scatterSvg, histogramBars, st, tool, values, pairs, varSelect, needN, smallN, record, logNote, SCOPES, VAR, strength, totals };

  // ---------- the workshop page ----------
  const LEVEL_NAMES = { gcse: 'GCSE', alevel: 'A-level', above: 'Beyond A-level' };
  const RANK = { gcse: 1, alevel: 2, above: 3 };
  FM.renderStatsTiers = function (host, league) {
    const rank = RANK[league.tier] || 1;
    const tools = FM.STAT_TOOLS.filter((t) => RANK[t.level] <= rank);
    host.innerHTML = `<div class="card" style="gap:16px">
      <h2>Statistics workshop</h2>
      <p class="desc">Your level is <b>${LEVEL_NAMES[league.tier]}</b>${rank > 1 ? ', which includes the levels below it' : ''}. The tools below work on this season's real matches. Look for patterns, form a guess, then test it.</p>
      <label>Use data from<select id="stScope">${SCOPES.map((s) => `<option value="${s[0]}"${s[0] === st.scope ? ' selected' : ''}>${s[1]}</option>`).join('')}</select></label>
      <p class="note" id="stN"></p>
      <div id="stTools" style="display:grid;gap:12px"></div></div>`;
    const toolsHost = host.querySelector('#stTools');
    const boxes = {};
    const ctxFor = () => ({ league, rows: FM.statRows(league, st.scope), redrawAll: drawAll });
    function drawOne(t) {
      const c = ctxFor(); c.redraw = () => drawOne(t);
      host.querySelector('#stN').textContent = 'This is ' + c.rows.length + ' team-match rows of data from ' + new Set(c.rows.map((r) => r.fxId)).size + ' matches.';
      t.draw(boxes[t.id], c);
    }
    function drawAll() { tools.forEach(drawOne); host.querySelector('#stScope').value = st.scope; }
    tools.forEach((t) => {
      const d = document.createElement('details');
      d.className = 'tool'; if (t.level === 'gcse' && t.id === 'averages') d.open = true;
      d.innerHTML = `<summary><span class="lvl ${t.level}">${LEVEL_NAMES[t.level]}</span> ${esc(t.title)}</summary><div class="tool-body"><p class="note">${esc(t.blurb)}</p><div class="tool-box"></div></div>`;
      toolsHost.appendChild(d);
      boxes[t.id] = d.querySelector('.tool-box');
    });
    FM.redrawStatTool = (id) => { const t = tools.find((x) => x.id === id); if (t) drawOne(t); };
    host.querySelector('#stScope').addEventListener('change', (e) => { st.scope = e.target.value; drawAll(); });
    drawAll();
  };
})();
