/* LastMind Create: Be the Chancellor, the playable simulation.
 * Runs on the shared macro engine (assets/econ). Loaded on demand from learn/index.html and uses that page's helpers
 * (escapeHtml, createAuthedFetch, createNoteSpend, createSpend, createBudgetLeft, ptShrink).
 * Interviews and the AI newspapers are the only parts that call the server; the economy, polls and election are deterministic. */
(function () {
  'use strict';
  var S = window.LMSim, L = window.LMPolicy, E = window.LMEcon;
  var STORE = 'lastmind-chancellor-game', PSTORE = 'lastmind-chancellor-portraits';
  var esc = function (s) { return escapeHtml(String(s == null ? '' : s)); };
  var f1 = function (x) { return (isFinite(x) ? Math.round(x * 10) / 10 : 0).toFixed(1); };
  var f0 = function (x) { return String(Math.round(isFinite(x) ? x : 0)); };
  var sign = function (x) { return (x > 0 ? '+' : '') + f1(x); };
  var money = function (x) { var a = Math.abs(x), s = x < 0 ? '-' : ''; if (a >= 1e12) return s + (a / 1e12).toFixed(2) + ' tn'; if (a >= 1e9) return s + (a / 1e9).toFixed(1) + ' bn'; if (a >= 1e6) return s + (a / 1e6).toFixed(1) + ' m'; return s + Math.round(a).toLocaleString(); };
  var ui = { g: null, host: null, tab: 'overview', group: 'Taxes', openAreas: {}, lessonCtx: null, exitLabel: 'Save and exit', launchOpts: null, chart: 'monthly', portraits: {}, busy: false, onExit: null, notices: [], cat: null, previewTimer: null, econVar: 'inflation', modal: null };

  /* ---------- styles ---------- */
  function injectStyle() {
    if (document.getElementById('chnStyle')) return;
    var st = document.createElement('style'); st.id = 'chnStyle';
    st.textContent = [
      '.chn { --chn-line: rgba(26,26,28,0.22); --chn-soft: rgba(11,114,133,0.10); --chn-good: #1f7a4d; --chn-bad: #b42318; --chn-warn: #b45309; font-family: Arial, sans-serif; color: var(--text); }',
      '.chn * { box-sizing: border-box; }',
      '.chn h1, .chn h2, .chn h3, .chn h4 { margin: 0; }',
      '.chn-head { display: flex; flex-wrap: wrap; gap: 12px 18px; align-items: center; justify-content: space-between; padding: 12px 0 14px; border-bottom: 1px solid var(--chn-line); margin-bottom: 14px; }',
      '.chn-title { font: 700 1.5rem Arial, sans-serif; } .chn-date { font-size: 0.95rem; opacity: 0.75; margin-top: 2px; }',
      '.chn-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }',
      '.chn-btn { border: 1px solid rgba(26,26,28,0.4); background: var(--panel); color: var(--text); border-radius: 10px; padding: 9px 14px; font: 600 0.88rem Arial, sans-serif; cursor: pointer; }',
      '.chn-btn:hover:not(:disabled) { border-color: var(--accent); } .chn-btn:disabled { opacity: 0.45; cursor: default; }',
      '.chn-btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; } .chn-btn.small { padding: 5px 10px; font-size: 0.8rem; }',
      '.chn-pill { display: inline-flex; gap: 6px; align-items: center; padding: 5px 11px; border-radius: 999px; border: 1px solid var(--chn-line); font: 600 0.78rem Arial, sans-serif; background: var(--panel); }',
      '.chn-pill.open { border-color: var(--chn-good); color: var(--chn-good); } .chn-pill.shock { border-color: var(--chn-bad); color: var(--chn-bad); } .chn-pill.warn { border-color: var(--chn-warn); color: var(--chn-warn); }',
      '.chn-tabs { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 14px; }',
      '.chn-tab { border: 1px solid var(--chn-line); background: var(--panel); color: var(--text); border-radius: 999px; padding: 7px 14px; font: 600 0.85rem Arial, sans-serif; cursor: pointer; white-space: nowrap; }',
      '.chn-tab[aria-selected="true"] { background: var(--text); color: var(--panel); border-color: var(--text); }',
      '.chn-grid { display: grid; gap: 12px; } .chn-kpis { grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); }',
      '.chn-card { background: var(--panel); border: 1px solid var(--chn-line); border-radius: 12px; padding: 13px 15px; }',
      '.chn-kpi .lab { font: 700 0.7rem Arial, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.65; }',
      '.chn-kpi .val { font: 700 1.7rem Arial, sans-serif; margin-top: 4px; font-variant-numeric: tabular-nums; } .chn-kpi .val small { font-size: 0.85rem; opacity: 0.6; font-weight: 600; }',
      '.chn-kpi .delta { font-size: 0.78rem; margin-top: 2px; } .good { color: var(--chn-good); } .bad { color: var(--chn-bad); } .neutral { opacity: 0.65; }',
      '.chn-kpi svg { display: block; width: 100%; height: 28px; margin-top: 6px; }',
      '.chn-two { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); margin-top: 12px; }',
      '.chn-sec { font: 700 0.75rem Arial, sans-serif; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.7; margin: 18px 0 8px; }',
      '.chn-bar { height: 8px; border-radius: 4px; background: rgba(26,26,28,0.12); overflow: hidden; } .chn-bar > i { display: block; height: 100%; background: var(--accent); }',
      '.chn-stack { display: flex; height: 22px; border-radius: 6px; overflow: hidden; font: 700 0.72rem Arial, sans-serif; color: #fff; } .chn-stack span { display: flex; align-items: center; justify-content: center; min-width: 0; overflow: hidden; }',
      '.chn-row { display: grid; grid-template-columns: 150px 1fr 60px; gap: 10px; align-items: center; padding: 6px 0; font-size: 0.86rem; }',
      '.chn-list { display: grid; gap: 8px; } .chn-item { display: flex; gap: 10px; justify-content: space-between; align-items: baseline; padding: 8px 0; border-bottom: 1px solid var(--chn-line); font-size: 0.88rem; } .chn-item:last-child { border-bottom: 0; }',
      '.chn-tag { font: 700 0.68rem Arial, sans-serif; letter-spacing: 0.06em; text-transform: uppercase; padding: 2px 7px; border-radius: 5px; background: var(--chn-soft); white-space: nowrap; }',
      '.chn-chart svg { width: 100%; height: auto; display: block; } .chn-chart .legend { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 0.78rem; margin-top: 4px; } .chn-chart .legend i { display: inline-block; width: 14px; height: 3px; border-radius: 2px; margin-right: 6px; vertical-align: middle; }',
      '.chn-chart h4 { font: 700 0.9rem Arial, sans-serif; margin-bottom: 6px; }',
      '.chn-avatar { display: inline-flex; align-items: center; justify-content: center; width: 52px; height: 52px; border-radius: 50%; background: var(--chn-soft) center/cover no-repeat; font: 700 0.95rem Arial, sans-serif; flex: none; overflow: hidden; border: 1px solid var(--chn-line); }',
      '.chn-avatar.big { width: 84px; height: 84px; font-size: 1.3rem; }',
      '.chn-person { display: flex; gap: 12px; align-items: center; } .chn-person .who { min-width: 0; } .chn-person .who b { display: block; } .chn-person .who small { opacity: 0.7; }',
      '.chn-people { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }',
      '.chn-table { width: 100%; border-collapse: collapse; font-size: 0.86rem; } .chn-table th { text-align: left; font: 700 0.7rem Arial, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.65; padding: 7px 8px; border-bottom: 1px solid var(--chn-line); } .chn-table td { padding: 7px 8px; border-bottom: 1px solid var(--chn-line); } .chn-table td.n, .chn-table th.n { text-align: right; font-variant-numeric: tabular-nums; }',
      '.chn-table .grp td { background: var(--chn-soft); font: 700 0.72rem Arial, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; }',
      '.chn-scroll { overflow-x: auto; }',
      '.chn-banner { padding: 11px 14px; border-radius: 10px; border: 1px solid var(--chn-line); margin-bottom: 12px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; font-size: 0.9rem; }',
      '.chn-banner.open { border-color: var(--chn-good); background: rgba(31,122,77,0.08); } .chn-banner.shock { border-color: var(--chn-bad); background: rgba(180,35,24,0.08); } .chn-banner.info { background: var(--chn-soft); }',
      '.chn-pol { border: 1px solid var(--chn-line); border-radius: 12px; padding: 11px 13px; background: var(--panel); display: grid; gap: 7px; } .chn-pol.changed { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent) inset; } .chn-pol.lock { opacity: 0.6; }',
      '.chn-pol .nm { font: 700 0.92rem Arial, sans-serif; } .chn-pol .ch { font-size: 0.72rem; opacity: 0.65; } .chn-pol .ctl { display: grid; grid-template-columns: minmax(80px, 1fr) 96px; gap: 10px; align-items: center; } .chn-pol .ctl.pick { grid-template-columns: 120px minmax(80px, 1fr) 96px; }',
      '.chn-pol input[type=range] { width: 100%; accent-color: var(--accent); } .chn-pol input[type=number], .chn-pol select { width: 100%; padding: 6px 8px; border: 1px solid rgba(26,26,28,0.32); border-radius: 8px; background: var(--panel); color: var(--text); font: 0.85rem Arial, sans-serif; }',
      '.chn-pol .unit { font-size: 0.74rem; opacity: 0.7; } .chn-pol .reason { font-size: 0.78rem; color: var(--chn-warn); }',
      '.chn-polwrap { display: grid; gap: 14px; grid-template-columns: minmax(0, 1fr) 340px; align-items: start; } @media (max-width: 980px) { .chn-polwrap { grid-template-columns: 1fr; } }',
      '.chn-side { position: sticky; top: 8px; display: grid; gap: 10px; } @media (max-width: 980px) { .chn-side { position: static; order: -1; } }',
      '.chn-news { display: grid; gap: 10px; } .chn-article h4 { font: 700 1.02rem Arial, sans-serif; margin: 4px 0; } .chn-article p { margin: 4px 0 0; font-size: 0.88rem; line-height: 1.5; } .chn-article .meta { font-size: 0.74rem; opacity: 0.7; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }',
      '.chn-overlay { position: fixed; inset: 0; z-index: 3000; background: rgba(10,14,20,0.66); display: flex; align-items: center; justify-content: center; padding: 16px; overflow-y: auto; }',
      '.chn-modal { width: min(720px, 100%); max-height: calc(100vh - 32px); overflow-y: auto; background: var(--panel); color: var(--text); border-radius: 16px; border: 1px solid var(--chn-line); box-shadow: 0 20px 60px rgba(0,0,0,0.35); }',
      '.chn-modal .hero { height: 150px; background: #111 center/cover no-repeat; border-radius: 16px 16px 0 0; position: relative; } .chn-modal .hero::after { content: ""; position: absolute; inset: 0; background: linear-gradient(to top, var(--panel), transparent 65%); border-radius: inherit; }',
      '.chn-modal .body { padding: 6px 22px 22px; } .chn-modal h2 { font: 700 1.35rem Arial, sans-serif; margin-bottom: 6px; } .chn-modal p { line-height: 1.55; font-size: 0.94rem; } .chn-modal .btns { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }',
      '.chn-opt { display: block; width: 100%; text-align: left; padding: 11px 14px; margin-top: 8px; border: 1px solid rgba(26,26,28,0.35); border-radius: 10px; background: var(--panel); color: var(--text); font: 0.9rem Arial, sans-serif; cursor: pointer; } .chn-opt:hover { border-color: var(--accent); }',
      '.chn-ans { width: 100%; min-height: 150px; padding: 12px 14px; border: 1px solid rgba(26,26,28,0.35); border-radius: 10px; background: var(--panel); color: var(--text); font: 0.94rem/1.55 Arial, sans-serif; resize: vertical; }',
      '.chn-quote { border-left: 3px solid var(--accent); padding: 4px 0 4px 12px; margin: 10px 0; font-size: 1rem; }',
      '.chn-load { min-height: 70vh; display: flex; align-items: flex-end; border-radius: 16px; background: #0b1016 center/cover no-repeat; position: relative; overflow: hidden; } .chn-load::before { content: ""; position: absolute; inset: 0; background: linear-gradient(to top, rgba(6,10,15,0.94) 8%, rgba(6,10,15,0.35) 70%); }',
      '.chn-load .in { position: relative; padding: 28px; color: #fff; width: 100%; } .chn-load h2 { font: 700 2rem Arial, sans-serif; } .chn-load ul { list-style: none; margin: 14px 0 0; padding: 0; display: grid; gap: 6px; font-size: 0.95rem; } .chn-load li { opacity: 0.35; transition: opacity 0.3s; } .chn-load li.on { opacity: 1; } .chn-load li::before { content: "○  "; } .chn-load li.on::before { content: "✓  "; color: #5fd6a0; }',
      '.chn-toast { position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%); z-index: 3100; background: #111; color: #fff; padding: 10px 16px; border-radius: 10px; font: 0.88rem Arial, sans-serif; max-width: 90vw; }',
      '.chn-area { border: 1px solid var(--chn-line); border-radius: 12px; padding: 10px 14px; margin-bottom: 10px; background: var(--panel); } .chn-area > summary { cursor: pointer; list-style: none; font-size: 0.98rem; display: flex; gap: 10px; align-items: baseline; } .chn-area > summary::-webkit-details-marker { display: none; } .chn-area > summary::before { content: "▸"; } .chn-area[open] > summary::before { content: "▾"; }',
      '.chn-guid { position: fixed; top: 56px; right: 12px; bottom: 12px; width: min(420px, 92vw); z-index: 2500; background: var(--panel); color: var(--text); border: 1px solid var(--chn-line); border-radius: 14px; box-shadow: 0 16px 50px rgba(0,0,0,0.3); display: flex; flex-direction: column; } .chn-guid .hd { padding: 14px 16px 10px; display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; border-bottom: 1px solid var(--chn-line); } .chn-guid .tabs { display: flex; gap: 6px; padding: 10px 12px 0; overflow-x: auto; } .chn-guid .bd { padding: 12px 16px 18px; overflow-y: auto; font-size: 0.9rem; line-height: 1.6; } .chn-guid .bd p { margin: 0 0 10px; }',
      '.chn-budget.warn { border-color: var(--chn-warn); color: var(--chn-warn); }',
      '.chn-lesson { border-top: 1px solid var(--chn-line); padding-top: 6px; } .chn-lesson .lbody { font-size: 0.86rem; line-height: 1.6; padding: 4px 0 6px; } .chn-lesson .lbody p { margin: 0 0 8px; }',
      '.chn-mtx { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; margin-top: 10px; } .chn-mtx div { border: 1px solid var(--chn-line); border-radius: 10px; padding: 8px 10px; font-size: 0.82rem; } .chn-mtx b { display: block; font-size: 1.1rem; }',
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ---------- storage ---------- */
  function save() { try { localStorage.setItem(STORE, JSON.stringify({ g: ui.g })); } catch (err) { /* the game just is not kept */ } }
  function loadSaved() { try { var s = JSON.parse(localStorage.getItem(STORE) || 'null'); return s && s.g ? s.g : null; } catch (err) { return null; } }
  function loadPortraits() { try { ui.portraits = JSON.parse(localStorage.getItem(PSTORE) || '{}') || {}; } catch (err) { ui.portraits = {}; } }
  function savePortraits() { try { localStorage.setItem(PSTORE, JSON.stringify(ui.portraits)); } catch (err) { /* portraits are regenerated next time */ } }

  /* ---------- launch ---------- */
  function launch(host, cfg, opts) {
    injectStyle(); loadPortraits();
    ui.host = host; ui.onExit = opts.onExit; ui.tab = 'overview'; ui.notices = []; ui.cat = null; ui.exitLabel = opts.exitLabel || 'Save and exit'; ui.launchOpts = opts; ui.lessonCtx = null; ui.openAreas = {};
    var saved = opts.resume ? loadSaved() : null;
    if (saved) { ui.g = saved; ui.g.draft = ui.g.draft || {}; renderAll(); ensurePortraits(); return; }
    try { localStorage.removeItem(STORE); } catch (e) { /* fine */ }
    ui.portraits = {}; savePortraits();
    var steps = ['Building the economy of ' + cfg.country, 'Simulating the last three years', 'Appointing the cabinet and the opposition', 'Printing the newspapers', 'Preparing your first briefing'];
    host.innerHTML = '<div class="chn"><div class="chn-load" style="background-image:url(/assets/chancellor/loading.jpg)"><div class="in"><h2>Taking office in ' + esc(cfg.country) + '…</h2><ul>' + steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul></div></div></div>';
    var lis = host.querySelectorAll('.chn-load li'), i = 0;
    var tick = setInterval(function () { if (lis[i]) lis[i].classList.add('on'); i++; if (i >= lis.length) clearInterval(tick); }, 450);
    setTimeout(function () {
      try { ui.g = S.newGame(cfg); } catch (err) { console.error(err); host.innerHTML = '<div class="chn"><p>The simulation could not start. ' + esc(err.message) + '</p><button class="chn-btn" id="chnBack">Back</button></div>'; var b = host.querySelector('#chnBack'); if (b) b.onclick = function () { ui.onExit && ui.onExit(); }; return; }
      save(); renderAll(); ensurePortraits();
      showBriefing().then(function () { var ev = ui.g.events.filter(function (e) { return !e.done && e.goals; })[0]; if (ev) return runInterview(ev).then(function () { save(); renderAll(); }); });
    }, 2600);
  }

  /* ---------- tiny charts ---------- */
  function scale(vals, pad) { var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals); if (!isFinite(lo)) { lo = 0; hi = 1; } if (lo === hi) { lo -= 1; hi += 1; } var p = (hi - lo) * (pad == null ? 0.1 : pad); return [lo - p, hi + p]; }
  function niceTicks(lo, hi, n) { var step = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log10(step))), r = step / mag, s = r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10; step = s * mag; var t = [], v = Math.ceil(lo / step) * step; while (v <= hi + 1e-9) { t.push(v); v += step; } return t; }
  function svgChart(o) {
    var W = 560, H = o.h || 200, m = { l: 40, r: 10, t: 8, b: 22 }, ser = o.series.filter(function (s) { return s.pts.length; });
    if (!ser.length) return '<div class="neutral" style="padding:20px 0">No data yet.</div>';
    var xs = [], ys = []; ser.forEach(function (s) { s.pts.forEach(function (p) { xs.push(p[0]); ys.push(p[1]); }); });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), yr = scale(ys, 0.12), y0 = yr[0], y1 = yr[1];
    var X = function (t) { return m.l + (t - x0) / Math.max(1, x1 - x0) * (W - m.l - m.r); }, Y = function (v) { return H - m.b - (v - y0) / (y1 - y0) * (H - m.t - m.b); };
    var g = '', ticks = niceTicks(y0, y1, 4);
    ticks.forEach(function (v) { g += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="currentColor" stroke-opacity="' + (Math.abs(v) < 1e-9 ? 0.4 : 0.12) + '"/><text x="' + (m.l - 6) + '" y="' + (Y(v) + 3) + '" text-anchor="end" font-size="10" fill="currentColor" fill-opacity="0.7">' + (Math.abs(v) >= 100 ? f0(v) : f1(v)) + '</text>'; });
    for (var k = 0; k <= 4; k++) { var tt = x0 + (x1 - x0) * k / 4, d = new Date(tt); g += '<text x="' + X(tt) + '" y="' + (H - 6) + '" text-anchor="' + (k === 0 ? 'start' : k === 4 ? 'end' : 'middle') + '" font-size="10" fill="currentColor" fill-opacity="0.7">' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()] + " '" + String(d.getUTCFullYear()).slice(2) + '</text>'; }
    if (o.today != null && o.today > x0 && o.today < x1) g += '<line x1="' + X(o.today) + '" x2="' + X(o.today) + '" y1="' + m.t + '" y2="' + (H - m.b) + '" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="3 3"/><text x="' + (X(o.today) + 4) + '" y="' + (m.t + 9) + '" font-size="9" fill="currentColor" fill-opacity="0.6">today</text>';
    ser.forEach(function (s) { var d = s.pts.map(function (p, i) { return (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); }).join(' '); g += '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="' + (s.w || 2.2) + '"' + (s.dashed ? ' stroke-dasharray="5 4"' : '') + ' stroke-linejoin="round"/>'; var last = s.pts[s.pts.length - 1]; if (!s.dashed) g += '<circle cx="' + X(last[0]) + '" cy="' + Y(last[1]) + '" r="3" fill="' + s.color + '"/>'; });
    var legend = ser.filter(function (s) { return s.name; }).map(function (s) { return '<span><i style="background:' + s.color + '"></i>' + esc(s.name) + '</span>'; }).join('');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.label || 'chart') + '">' + g + '</svg><div class="legend">' + legend + '</div>';
  }
  function spark(vals, color) {
    if (vals.length < 2) return '';
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals); if (lo === hi) { lo -= 1; hi += 1; }
    var pts = vals.map(function (v, i) { return (i / (vals.length - 1) * 100).toFixed(1) + ',' + (26 - (v - lo) / (hi - lo) * 24).toFixed(1); }).join(' ');
    return '<svg viewBox="0 0 100 28" preserveAspectRatio="none"><polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>';
  }

  /* ---------- data helpers ---------- */
  var QMAP = { growth: 'g', inflation: 'pi', core: 'piCore', unemployment: 'u', policyRate: 'i', realRate: 'r', exchange: 'E', debtGDP: 'debtGDP', deficit: 'deficit', realWages: 'rw', riskPremium: 'riskPremium', currentAccount: 'CA', gap: 'gap', gini: 'gini', poverty: 'poverty', emissions: 'emis', confH: 'confH', confB: 'confB', savingRate: 'savingRate', interest: 'interest', reserves: 'reserves', potGrowth: 'potGrowth', housePrices: 'W', exchangeVsStart: 'E' };
  var TS = function (d) { var p = d.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); };
  function monthlySeries(key, n) { var g = ui.g, a = g.mhist.slice(-(n || 48)); return a.map(function (m) { return [TS(m.date), m[key]]; }); }
  function quarterlySeries(key, n) {
    var g = ui.g, k = QMAP[key] || key, a = g.qhist.slice(-(n || 20));
    return a.map(function (q) { var v = q.snap[k]; if (key === 'exchangeVsStart') v = (v / g.startE - 1) * 100; return [TS(q.date), v]; });
  }
  function series(key, n) { return ui.chart === 'monthly' ? monthlySeries(key, n || 36) : quarterlySeries(key, n || 16); }
  function forecastSeries(key, n) {
    var g = ui.g, k = QMAP[key] || key, fs = S.forecast(g, n || 6, []), last = g.qhist[g.qhist.length - 1], out = [[TS(last.date), key === 'exchangeVsStart' ? (last.snap.E / g.startE - 1) * 100 : last.snap[k]]];
    fs.forEach(function (sn, i) { var d = S.iso(TS(last.date) + (i + 1) * 91.3125 * 864e5); out.push([TS(d), key === 'exchangeVsStart' ? (sn.E / g.startE - 1) * 100 : sn[k]]); });
    return out;
  }
  function metricsNow() { return S.currentMetrics(ui.g); }
  function nextStop() {
    var g = ui.g, ev = g.events.filter(function (e) { return !e.done; })[0], me = (function () { var p = S.addDays(g.date, 1).split('-'); return S.iso(Date.UTC(+p[0], +p[1], 0)); })();
    if (ev && ev.date < me) return { date: ev.date, label: ev.title }; return { date: me, label: 'Month-end figures' };
  }

  /* ---------- portraits ---------- */
  var LOOKS = ['a woman in her fifties with short grey hair and glasses', 'a man in his forties with a trimmed beard', 'a Black woman in her forties with short natural hair', 'a South Asian man in his fifties with grey stubble', 'an East Asian woman in her thirties with a neat bob', 'a white man in his sixties with white hair', 'a Latina woman in her fifties with shoulder-length dark hair', 'a young man in his thirties with dark curly hair', 'a woman in her sixties with silver hair pulled back', 'a Middle Eastern man in his forties with short dark hair', 'a Black man in his fifties with greying hair and glasses', 'a woman in her thirties with long straight brown hair', 'a South Asian woman in her forties with shoulder-length hair', 'a man in his fifties with thinning red hair', 'an East Asian man in his forties with side-parted hair', 'a white woman in her forties with a blonde ponytail'];
  function hashKey(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  function look(key) { return LOOKS[(hashKey(key) + (ui.g ? ui.g.rs % 97 : 0)) % LOOKS.length]; }
  function avatar(key, name, big) {
    var img = ui.portraits[key], initials = String(name || '?').split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
    return '<span class="chn-avatar' + (big ? ' big' : '') + '" data-key="' + esc(key) + '"' + (img ? ' style="background-image:url(' + img + ')"' : '') + '>' + (img ? '' : esc(initials)) + '</span>';
  }
  var portraitQueue = [], portraitRunning = 0;
  function requestPortrait(key, role) {
    if (ui.portraits[key] || portraitQueue.some(function (q) { return q.key === key; })) return;
    portraitQueue.push({ key: key, role: role }); pumpPortraits();
  }
  function pumpPortraits() {
    while (portraitRunning < 2 && portraitQueue.length) {
      var job = portraitQueue.shift(); portraitRunning++;
      (function (job) {
        if (createBudgetLeft() < 0.03) { portraitRunning--; return; }
        createAuthedFetch('/playtest/portrait', { method: 'POST', body: JSON.stringify({ description: look(job.key) + ' in formal business attire, ' + job.role + ', calm confident expression, facing the camera', clientUsedUsd: createSpend.usedUsd }) })
          .then(function (r) {
            if (r.body && r.body.spend) createNoteSpend(r.body.spend);
            if (r.resp.status === 501) { portraitQueue.length = 0; return; }
            if (!(r.resp.ok && r.body.image)) return;
            return ptShrink(r.body.image, 200).then(function (img) {
              ui.portraits[job.key] = img; savePortraits();
              document.querySelectorAll('.chn-avatar[data-key="' + job.key.replace(/"/g, '') + '"]').forEach(function (el) { el.style.backgroundImage = 'url(' + img + ')'; el.textContent = ''; });
            });
          }).catch(function () { /* initials stay */ }).then(function () { portraitRunning--; pumpPortraits(); });
      })(job);
    }
  }
  function ensurePortraits() { ui.g.people.forEach(function (p) { if (!p.resigned) requestPortrait(p.key, p.role); }); }

  /* ---------- the shell ---------- */
  var TABS = [['overview', 'Overview'], ['economy', 'Economic performance'], ['policy', 'Policy'], ['budget', 'Budget'], ['people', 'People and polls'], ['news', 'News'], ['log', 'Record']];
  function windowPill() {
    var w = ui.g.window || { kind: 'none' };
    if (w.kind === 'shock') return '<span class="chn-pill shock">Emergency session open</span>';
    if (w.kind === 'budget') return '<span class="chn-pill open">Budget statement open</span>';
    if (w.kind === 'bigBudget') return '<span class="chn-pill open">The Budget is open</span>';
    return '<span class="chn-pill">Policy changes closed</span>';
  }
  function budgetLabel() { return 'Testing budget $' + createSpend.usedUsd.toFixed(2) + ' of $' + createSpend.capUsd.toFixed(2); }
  function headerActions() {
    var g = ui.g, st = nextStop(), P = g.pop;
    return windowPill() + '<span class="chn-pill" title="Your approval with the public">Approval ' + f0(P.groups.public) + '%</span>' +
      '<button class="chn-btn primary" data-act="advance" ' + (g.over ? 'disabled' : '') + ' title="Move on to the next event or the next month-end">Advance to ' + esc(S.nice(st.date).replace(/ \d{4}$/, '')) + ' ▸</button>' +
      '<button class="chn-btn" data-act="ff" ' + (g.over ? 'disabled' : '') + ' title="Skip quiet stretches. Stops when something needs a decision.">Fast forward ▸▸</button>' +
      (ui.lessonCtx && !document.getElementById('chnGuid') ? '<button class="chn-btn" data-act="lessons" title="Reopen the lesson panel">Lessons</button>' : '') +
      '<button class="chn-btn" data-act="restart" title="Start this scenario again from the beginning">Restart</button>' +
      '<button class="chn-btn" data-act="exit">' + esc(ui.exitLabel) + '</button>' +
      '<span class="chn-pill chn-budget" title="Everything Cortex does in LastMind Create counts towards a hard testing budget">' + esc(budgetLabel()) + '</span>';
  }
  function renderHeaderOnly() { var el = ui.host.querySelector('#chnHeadActions'); if (el) el.innerHTML = headerActions(); }
  window.chnPaintBudget = function () { document.querySelectorAll('.chn-budget').forEach(function (el) { el.textContent = budgetLabel(); el.classList.toggle('warn', createBudgetLeft() < 0.35); }); };
  function renderAll() {
    var g = ui.g; if (!g) return;
    var gov = g.parties.gov.name;
    var daysToElection = Math.round((TS(g.electionDate) - TS(g.date)) / 864e5);
    ui.host.innerHTML = '<div class="chn">' +
      '<div class="chn-head"><div><div class="chn-title">' + esc(g.cfg.country) + ' · Chancellor</div><div class="chn-date">' + esc(S.nice(g.date)) + ' · ' + esc(gov) + ' government · election in ' + (daysToElection > 90 ? Math.round(daysToElection / 30.4) + ' months' : daysToElection + ' days') + '</div></div>' +
      '<div class="chn-actions" id="chnHeadActions">' + headerActions() + '</div></div>' +
      '<div class="chn-tabs" role="tablist">' + TABS.map(function (t) { return '<button class="chn-tab" role="tab" data-tab="' + t[0] + '" aria-selected="' + (ui.tab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<div id="chnBody"></div></div>';
    renderTab();
    bindShell();
  }
  function renderTab() {
    var b = ui.host.querySelector('#chnBody'); if (!b) return;
    var fn = { overview: overview, economy: economyTab, policy: policyTab, budget: budgetTab, people: peopleTab, news: newsTab, log: logTab }[ui.tab] || overview;
    b.innerHTML = ui.g.over ? overHtml() : fn();
    if (ui.tab === 'policy' && !ui.g.over) bindPolicy();
    if (ui.tab === 'budget') bindBudget();
  }
  var shellBound = null;
  function bindShell() {
    if (shellBound === ui.host) return; shellBound = ui.host;
    ui.host.addEventListener('click', function (e) {
      var t = e.target.closest('[data-act],[data-tab],[data-chart],[data-dismiss],[data-lesson]'); if (!t) return;
      if (t.dataset.lesson) { openLesson(t.dataset.lesson); return; }
      if (t.dataset.tab) { ui.tab = t.dataset.tab; renderAll(); return; }
      if (t.dataset.chart) { ui.chart = t.dataset.chart; renderTab(); return; }
      if (t.dataset.dismiss != null) { ui.notices.splice(+t.dataset.dismiss, 1); renderTab(); return; }
      var a = t.dataset.act;
      if (a === 'advance') doAdvance(false); else if (a === 'ff') doAdvance(true);
      else if (a === 'exit') { save(); ui.onExit && ui.onExit(); }
      else if (a === 'newgame') { try { localStorage.removeItem(STORE); } catch (x) { /* fine */ } ui.onExit && ui.onExit(); }
      else if (a === 'endsession') endSession();
      else if (a === 'submitbudget') submitBudget();
      else if (a === 'enactnow') enactChanges();
      else if (a === 'lessons' && ui.lessonCtx) openLesson(ui.lessonCtx.id);
      else if (a === 'restart') restartGame();
    });
  }

  /* ---------- overview ---------- */
  var KPIS = [
    ['growth', 'GDP growth', '%', 1, function (m) { return 1; }], ['inflation', 'Inflation', '%', 0, null], ['unemployment', 'Unemployment', '%', -1, null], ['policyRate', 'Policy rate', '%', 0, null],
    ['debtGDP', 'Public debt', '% of GDP', -1, null], ['deficit', 'Budget deficit', '% of GDP', -1, null], ['exchangeVsStart', 'Currency', '% vs start', 1, null], ['realWages', 'Real wages', '% a year', 1, null],
  ];
  function kpiHtml() {
    var g = ui.g, m = metricsNow(), hist = g.mhist, prev = hist[Math.max(0, hist.length - 4)] || m, target = g.pf.target;
    return KPIS.map(function (k) {
      var key = k[0], v = m[key], d = v - prev[key], cls = 'neutral';
      if (key === 'inflation') { var dd = Math.abs(v - target) - Math.abs(prev[key] - target); cls = Math.abs(dd) < 0.05 ? 'neutral' : (dd < 0 ? 'good' : 'bad'); }
      else if (k[3] !== 0 && Math.abs(d) > 0.02) cls = (d * k[3] > 0) ? 'good' : 'bad';
      var vals = hist.slice(-12).map(function (x) { return x[key]; });
      var unit = k[2] === '%' ? '<small>%</small>' : '<small> ' + esc(k[2]) + '</small>';
      return '<div class="chn-card chn-kpi"><div class="lab">' + esc(k[1]) + (key === 'inflation' ? ' (target ' + target + '%)' : '') + '</div><div class="val">' + (key === 'exchangeVsStart' ? sign(v) : f1(v)) + unit + '</div><div class="delta ' + cls + '">' + sign(d) + ' vs 3 months ago</div>' + spark(vals, 'var(--accent)') + '</div>';
    }).join('');
  }
  function chartCard(title, defs, o) {
    o = o || {};
    var ser = defs.map(function (d) { var s = { name: d.name, color: d.color, pts: d.pts || series(d.key, o.n) }; return s; });
    if (ui.chart === 'quarterly' && o.forecast) defs.forEach(function (d) { if (d.key) ser.push({ name: '', color: d.color, pts: forecastSeries(d.key, 6), dashed: true, w: 1.6 }); });
    return '<div class="chn-card chn-chart"><h4>' + esc(title) + '</h4>' + svgChart({ series: ser, today: TS(ui.g.date), label: title }) + '</div>';
  }
  function upcoming() {
    var g = ui.g, ev = g.events.filter(function (e) { return !e.done; }).slice(0, 7);
    var kind = { shock: 'Shock', political: 'Politics', 'budget-prep': 'Budget prep', budget: 'Budget', interview: 'Interview', election: 'Election', campaign: 'Campaign', info: 'Notice' };
    return ev.length ? ev.map(function (e) { return '<div class="chn-item"><span><b>' + esc(S.nice(e.date)) + '</b> · ' + esc(e.kind === 'shock' ? 'Something is coming' : e.title) + '</span><span class="chn-tag">' + esc(kind[e.kind] || e.kind) + '</span></div>'; }).join('') : '<div class="neutral">Nothing scheduled.</div>';
  }
  function overview() {
    var g = ui.g, P = g.pop, gov = g.parties.gov, opp = g.parties.opp, ris = g.parties.rising, pl = P.polls;
    var notices = ui.notices.map(function (n, i) { return '<div class="chn-banner info"><span><b>' + esc(n.title) + '</b> ' + esc(n.text) + '</span><button class="chn-btn small" data-dismiss="' + i + '">Dismiss</button></div>'; }).join('');
    var toggle = '<div class="chn-actions" style="margin:6px 0 10px"><span class="neutral" style="font-size:.8rem">Figures</span><button class="chn-btn small" data-chart="monthly" aria-pressed="' + (ui.chart === 'monthly') + '" ' + (ui.chart === 'monthly' ? 'style="border-color:var(--accent)"' : '') + '>Monthly</button><button class="chn-btn small" data-chart="quarterly" ' + (ui.chart === 'quarterly' ? 'style="border-color:var(--accent)"' : '') + '>Quarterly and forecast</button></div>';
    var latest = g.news.slice(0, 3).map(function (a) { return '<div class="chn-item"><span><b>' + esc(a.headline) + '</b><br><small class="neutral">' + esc(a.outlet) + '</small></span></div>'; }).join('') || '<div class="neutral">No headlines yet.</div>';
    var daysToElection = Math.round((TS(g.electionDate) - TS(g.date)) / 864e5);
    return notices + '<div class="chn-grid chn-kpis">' + kpiHtml() + '</div>' +
      '<div class="chn-two">' +
        '<div class="chn-card"><div class="chn-sec" style="margin-top:0">Where you stand</div>' +
          '<div class="chn-row"><span>Approval (public)</span><div class="chn-bar"><i style="width:' + f0(P.groups.public) + '%"></i></div><b>' + f0(P.groups.public) + '%</b></div>' +
          '<div class="chn-row"><span>Cabinet confidence</span><div class="chn-bar"><i style="width:' + f0(S.cabinetAverage(g)) + '%"></i></div><b>' + f0(S.cabinetAverage(g)) + '%</b></div>' +
          '<div class="chn-row"><span>Pressure for an early election</span><div class="chn-bar"><i style="width:' + f0(P.pressure.level) + '%;background:' + (P.pressure.level > 60 ? 'var(--chn-bad)' : 'var(--accent)') + '"></i></div><b>' + f0(P.pressure.level) + '</b></div>' +
          '<div class="chn-sec">Latest poll</div><div class="chn-stack"><span style="width:' + pl.gov + '%;background:' + gov.color + '">' + f0(pl.gov) + '</span><span style="width:' + pl.opp + '%;background:' + opp.color + '">' + f0(pl.opp) + '</span><span style="width:' + pl.rising + '%;background:' + ris.color + '">' + f0(pl.rising) + '</span><span style="width:' + pl.other + '%;background:#777"></span></div>' +
          '<div class="legend" style="display:flex;gap:12px;flex-wrap:wrap;font-size:.76rem;margin-top:6px"><span><b style="color:' + gov.color + '">■</b> ' + esc(gov.name) + '</span><span><b style="color:' + opp.color + '">■</b> ' + esc(opp.name) + '</span><span><b style="color:' + ris.color + '">■</b> ' + esc(ris.name) + '</span></div>' +
          '<div class="neutral" style="margin-top:8px;font-size:.82rem">General election in ' + (daysToElection > 90 ? Math.round(daysToElection / 30.4) + ' months' : daysToElection + ' days') + (g.earlyElection ? ' (called early)' : '') + '.</div></div>' +
        '<div class="chn-card"><div class="chn-sec" style="margin-top:0">Coming up</div>' + upcoming() + '<div class="chn-sec">Latest headlines</div>' + latest + '</div>' +
      '</div>' + toggle +
      '<div class="chn-two">' +
        chartCard('GDP growth and inflation (% a year)', [{ name: 'GDP growth', color: 'var(--accent)', key: 'growth' }, { name: 'Inflation', color: '#c2410c', key: 'inflation' }], { forecast: true }) +
        chartCard('Unemployment (%)', [{ name: 'Unemployment', color: '#7c3aed', key: 'unemployment' }], { forecast: true }) +
        chartCard('Interest rates (%)', [{ name: 'Policy rate', color: '#0b7285', key: 'policyRate' }, { name: 'Real rate', color: '#b45309', key: 'realRate' }], { forecast: false }) +
        chartCard('Debt and deficit (% of GDP)', [{ name: 'Deficit', color: '#b42318', key: 'deficit' }, { name: 'Debt / 10', color: '#1f7a4d', pts: series('debtGDP').map(function (p) { return [p[0], p[1] / 10]; }) }], { forecast: false }) +
        chartCard('Currency (% vs start)', [{ name: 'Currency', color: '#0b7285', key: 'exchangeVsStart' }], { forecast: false }) +
        '<div class="chn-card chn-chart"><h4>Approval and polls (%)</h4>' + svgChart({ series: [{ name: 'Your approval', color: 'var(--accent)', pts: P.history.map(function (h) { return [TS(h.date), h.public]; }) }, { name: gov.name, color: gov.color, pts: P.history.map(function (h) { return [TS(h.date), h.gov]; }) }, { name: opp.name, color: opp.color, pts: P.history.map(function (h) { return [TS(h.date), h.opp]; }) }, { name: ris.name, color: ris.color, pts: P.history.map(function (h) { return [TS(h.date), h.rising]; }) }], today: TS(g.date), label: 'polls' }) + '</div>' +
      '</div>';
  }

  /* ---------- economy tab ---------- */
  var ECON_GROUPS = [
    ['Output and jobs', [['growth', 'GDP growth', '% yoy'], ['gdpIndex', 'Real GDP', 'index'], ['potentialGdp', 'Potential GDP', 'index'], ['gap', 'Output gap', '%'], ['potGrowth', 'Potential growth', '% yoy'], ['unemployment', 'Unemployment', '%'], ['ustar', 'Structural unemployment', '%'], ['employment', 'Employment', 'index'], ['participation', 'Participation', '%'], ['productivity', 'Productivity', 'index']]],
    ['Prices and wages', [['inflation', 'CPI inflation', '%'], ['expectedInflation', 'Expected inflation', '%'], ['moneyFinancing', 'Inflation from printing money', 'pp'], ['core', 'Domestic inflation', '%'], ['importInflation', 'Imported inflation', '%'], ['importPrices', 'Import prices vs trend', '%'], ['commodityPrices', 'World commodity prices vs trend', '%'], ['nominalWages', 'Wage growth (money)', '% yoy'], ['realWages', 'Real wage growth', '% yoy'], ['anchor', 'Inflation expectations anchored', '0 to 1']]],
    ['Demand and trade', [['consumption', 'Household spending vs trend', '%'], ['investment', 'Business investment vs trend', '%'], ['exports', 'Exports vs trend', '%'], ['imports', 'Imports vs trend', '%'], ['currentAccount', 'Current account', '% GDP'], ['exchangeVsStart', 'Currency vs start', '%'], ['reserves', 'Reserves', 'months of imports'], ['savingRate', 'Saving rate', '%']]],
    ['Households and living standards', [['povertyRate', 'Poverty rate', '% of people'], ['giniLevel', 'Inequality (Gini)', '0 to 100'], ['confH', 'Household confidence', 's.d.'], ['confB', 'Business confidence', 's.d.'], ['housePrices', 'House and asset prices', '% vs trend']]],
    ['Government', [['deficit', 'Budget deficit', '% GDP'], ['debtGDP', 'Public debt', '% GDP'], ['interest', 'Debt interest', '% GDP'], ['taxRevenue', 'Tax revenue', '% GDP']]],
    ['Money and finance', [['policyRate', 'Policy rate', '%'], ['realRate', 'Real interest rate', '%'], ['riskPremium', 'Risk premium', 'pp'], ['sovereignStress', 'Sovereign stress score', 'index']]],
    ['Environment', [['emissions', 'Emissions index', 'start = 100']]],
  ];
  function inflationDiagnosis() {
    var g = ui.g, m = metricsNow(), t = g.pf.target, rows = [];
    if (m.anchor < 0.5 || m.expectedInflation - t > 3) rows.push(['Expectations', 'People expect ' + f1(m.expectedInflation) + '% inflation, so wages and prices are set to match. Credibility is ' + f1(m.anchor * 100) + '% of what it should be.', 'Raise interest rates above inflation, keep a fiscal rule, and make the central bank independent. Credibility comes back slowly.']);
    if ((m.moneyFinancing || 0) > 0.5) rows.push(['Printing money for the deficit', 'The central bank is financing the deficit, adding about ' + f1(m.moneyFinancing) + ' points to inflation.', 'Cut the deficit, and end the practice with Monetary: Central bank independence.']);
    if (m.importInflation - t > 2) rows.push(['Imported inflation', 'Import prices are rising ' + f1(m.importInflation) + '% a year, from a weak currency or dear world prices.', 'Stabilise the currency (higher rates, reserves, a peg or capital controls) and cushion energy and food prices.']);
    if (m.gap > 1) rows.push(['Demand above capacity', 'The economy is running ' + f1(m.gap) + '% above what it can supply.', 'Tighten fiscal policy (taxes up, spending down) and, if you can set them, interest rates.']);
    if (m.realWages < -3 && m.inflation > t + 3) rows.push(['Wages chasing prices', 'Real wages are falling ' + f1(-m.realWages) + '% a year, so unions push for catch-up pay.', 'Restore confidence that inflation is falling; be careful with pay and minimum-wage rises.']);
    if (!rows.length) return '<div class="chn-card"><div class="chn-sec" style="margin-top:0">What is driving inflation</div><p class="neutral" style="margin:0;font-size:.88rem">Inflation is ' + f1(m.inflation) + '%, near the ' + t + '% target. No single cause stands out.</p></div>';
    return '<div class="chn-card"><div class="chn-sec" style="margin-top:0">What is driving inflation (' + f1(m.inflation) + '%, target ' + t + '%)</div>' + rows.map(function (x) { return '<div class="chn-item" style="display:block"><b>' + esc(x[0]) + '.</b> ' + esc(x[1]) + '<br><span class="good">To address it:</span> ' + esc(x[2]) + '</div>'; }).join('') + '</div>';
  }
  function economyTab() {
    var g = ui.g, m = metricsNow(), hist = g.mhist, m3 = hist[Math.max(0, hist.length - 4)], m12 = hist[Math.max(0, hist.length - 13)] || m3;
    var rows = ECON_GROUPS.map(function (grp) { return '<tr class="grp"><td colspan="5">' + esc(grp[0]) + '</td></tr>' + grp[1].map(function (r) { var k = r[0]; return '<tr data-var="' + k + '" style="cursor:pointer"><td>' + esc(r[1]) + '</td><td class="n"><b>' + f1(m[k]) + '</b></td><td class="n">' + f1(m3[k]) + '</td><td class="n">' + f1(m12[k]) + '</td><td class="neutral">' + esc(r[2]) + '</td></tr>'; }).join(''); }).join('');
    var opts = ECON_GROUPS.reduce(function (a, grp) { return a.concat(grp[1]); }, []).map(function (r) { return '<option value="' + r[0] + '"' + (ui.econVar === r[0] ? ' selected' : '') + '>' + esc(r[1]) + '</option>'; }).join('');
    setTimeout(function () { var sel = ui.host.querySelector('#chnVar'); if (sel && !sel._b) { sel._b = 1; sel.addEventListener('change', function () { ui.econVar = sel.value; renderTab(); }); } ui.host.querySelectorAll('tr[data-var]').forEach(function (tr) { tr.addEventListener('click', function () { ui.econVar = tr.dataset.var; renderTab(); }); }); }, 0);
    return '<div style="margin-bottom:12px">' + inflationDiagnosis() + '</div><div class="chn-two"><div class="chn-card"><div class="chn-scroll"><table class="chn-table"><tr><th>Variable</th><th class="n">Now</th><th class="n">3 months ago</th><th class="n">A year ago</th><th>Unit</th></tr>' + rows + '</table></div><p class="neutral" style="font-size:.78rem;margin:10px 0 0">Monthly figures between quarters are estimates that firm up when the quarter is published. Click a row to chart it.</p></div>' +
      '<div class="chn-card chn-chart"><label class="neutral" style="font-size:.78rem">Chart <select id="chnVar" style="margin-left:6px;padding:5px 8px;border-radius:8px">' + opts + '</select></label><h4 style="margin-top:10px">' + esc((ECON_GROUPS.reduce(function (a, grp) { return a.concat(grp[1]); }, []).filter(function (r) { return r[0] === ui.econVar; })[0] || ['', ''])[1]) + '</h4>' + svgChart({ series: [{ name: 'Monthly', color: 'var(--accent)', pts: monthlySeries(ui.econVar, 48) }, { name: 'Quarterly', color: '#c2410c', pts: quarterlySeries(ui.econVar, 16), w: 1.4 }], today: TS(g.date), label: ui.econVar }) + '</div></div>';
  }

  /* ---------- policy tab: groups, drafts and lessons ---------- */
  var POLICY_GROUPS = [
    { name: 'Taxes', text: 'Income, business, consumption and wealth taxes.', areas: ['Income tax', 'Business tax', 'Consumption tax', 'Wealth and property'] },
    { name: 'Public services and welfare', text: 'What the state spends on people.', areas: ['Government spending', 'Welfare', 'Human capital'] },
    { name: 'Infrastructure, energy and environment', text: 'Building, powering and protecting.', areas: ['Infrastructure', 'Energy', 'Environment', 'Housing'] },
    { name: 'Jobs and people', text: 'Work, migration and regions.', areas: ['Labour market', 'Migration and labour supply', 'Regional'] },
    { name: 'Business, trade and industry', text: 'Firms, innovation, trade and foreign investment.', areas: ['Business and supply side', 'Innovation', 'Trade', 'Foreign investment', 'Industrial policy'] },
    { name: 'Money, banking and debt', text: 'Interest rates, the currency, banks and government borrowing.', areas: ['Monetary', 'Exchange rate', 'Banking and finance', 'Fiscal framework', 'Debt management'] },
    { name: 'Development, food and crisis', text: 'Poorer-country programmes, food, and emergency measures.', areas: ['Development', 'Agriculture and food', 'Crisis controls'] },
  ];
  function catalogue() { if (!ui.cat) ui.cat = L.catalogue(ui.g.pf); return ui.cat; }
  function D() { ui.g.draft = ui.g.draft || {}; return ui.g.draft; }
  function enacted(id) { var last = ui.g.decisions.filter(function (d) { return d.id === id; }).pop(); return last || null; }
  function pendingValue(e) { var p = D()[e.id]; if (p) return p; var en = enacted(e.id); return en ? { v: en.v, opt: en.opt, dur: en.dur } : { v: e.ctl.t === 'select' ? e.ctl.def : (e.ctl.optional ? e.ctl.min : e.ctl.def), opt: e.ctl.pickOpts ? e.ctl.pickOpts[0].v : null, dur: e.ctl.duration ? e.ctl.duration[2] : null }; }
  function differs(e) { var p = D()[e.id]; if (!p) return false; var en = enacted(e.id), cur = en ? en.v : (e.ctl.t === 'select' ? e.ctl.def : 0); if (String(p.v) !== String(cur)) return true; return !!(en && e.ctl.pickOpts && (p.opt || null) !== (en.opt || null)); }
  function gateFlags() { var g = ui.g, m = metricsNow(); return { crisis: m.sovereignStress >= 1.2 || m.debtGDP > 120, emergency: g.window && g.window.kind === 'shock' }; }
  function gateOk(e) { return L.available(e, ui.g.pf, gateFlags()); }
  function pendingChanges() { return catalogue().filter(function (e) { return !e.preset && D()[e.id] && differs(e); }); }
  function clampV(e, x) { x = +x; if (isNaN(x)) x = 0; return Math.max(e.ctl.min, Math.min(e.ctl.max, x)); }
  var saveTimer = null;
  function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 300); }

  function policyBanner() {
    var g = ui.g, w = g.window || { kind: 'none' }, n = pendingChanges().length;
    if (w.kind === 'shock') return '<div class="chn-banner shock"><span><b>Emergency session.</b> Taxes, spending, crisis measures, banking, money and debt can be enacted now. Structural reforms wait for the Budget.</span><span class="chn-actions"><button class="chn-btn" data-act="enactnow" ' + (n ? '' : 'disabled') + '>Enact ' + n + ' drafted change' + (n === 1 ? '' : 's') + ' now</button><button class="chn-btn" data-act="endsession">End the session</button></span></div>';
    if (w.kind === 'budget' || w.kind === 'bigBudget') { var big = w.kind === 'bigBudget'; return '<div class="chn-banner open"><span><b>' + (big ? 'Budget day.' : 'Budget statement day.') + '</b> Your saved draft is ready. Adjust it, then submit: ' + n + ' change' + (n === 1 ? '' : 's') + ' will be enacted.' + (big ? '' : ' Structural reforms stay in your draft for the main Budget.') + '</span><button class="chn-btn primary" data-act="submitbudget">Submit the ' + (big ? 'Budget' : 'statement') + '</button></div>'; }
    var nb = g.events.filter(function (e) { return !e.done && e.kind === 'budget'; })[0];
    return '<div class="chn-banner info"><span><b>Preparing.</b> Choose policies, see their forecast and save them as a draft. Nothing takes effect until you submit them on budget day' + (nb ? ': <b>' + esc(nb.title) + ', ' + esc(S.nice(nb.date)) + '</b>' : '') + '.</span></div>';
  }
  function ctlHtml(e) {
    var p = pendingValue(e), c = e.ctl, id = e.id, h = '';
    if (c.t === 'select') return '<div class="ctl" style="grid-template-columns:1fr"><select data-pid="' + id + '" data-k="v">' + c.options.map(function (o) { return '<option value="' + o.v + '"' + (String(p.v) === String(o.v) ? ' selected' : '') + '>' + esc(o.l) + '</option>'; }).join('') + '</select></div>';
    var pick = c.pickOpts ? '<select data-pid="' + id + '" data-k="opt">' + c.pickOpts.map(function (o) { return '<option value="' + o.v + '"' + (p.opt === o.v ? ' selected' : '') + '>' + esc(o.l) + '</option>'; }).join('') + '</select>' : '';
    var v = clampV(e, p.v);
    h = '<div class="ctl' + (pick ? ' pick' : '') + '">' + pick + '<input type="range" data-pid="' + id + '" data-k="v" min="' + c.min + '" max="' + c.max + '" step="' + c.step + '" value="' + v + '" aria-label="' + esc(e.name) + '"><input type="number" data-pid="' + id + '" data-k="v" min="' + c.min + '" max="' + c.max + '" step="' + c.step + '" value="' + v + '" aria-label="' + esc(e.name) + ' exact value"></div>';
    h += '<div class="unit">' + esc(c.unit) + ' · range ' + c.min + ' to ' + c.max + (e.now ? ' · today ' + esc(e.now) : '') + (c.base ? ' · today\'s budget ' + f1(c.base) + '% of GDP' : '') + '</div>';
    if (c.duration) h += '<div class="ctl" style="grid-template-columns:auto 90px;justify-content:start"><span class="unit">Lasts (quarters)</span><input type="number" data-pid="' + id + '" data-k="dur" min="' + c.duration[0] + '" max="' + c.duration[1] + '" value="' + (p.dur || c.duration[2]) + '"></div>';
    return h;
  }
  function policyCard(e) {
    var en = enacted(e.id), avail = gateOk(e), lock = !avail.ok, drafted = differs(e);
    var chips = (drafted ? '<span class="chn-tag" style="background:rgba(11,114,133,.18)">Drafted</span> ' : '') + (en ? '<span class="chn-tag">In force: ' + esc(S.describe(e, en.v, en.opt, en.dur)) + '</span>' : '');
    var wait = drafted && !S.canDecide(ui.g, e.id).ok && S.canDecide(ui.g, e.id).reason ? '<div class="unit">' + esc(areaWaitText(e)) + '</div>' : '';
    return '<article class="chn-pol' + (drafted ? ' changed' : '') + (lock ? ' lock' : '') + '" data-card="' + e.id + '"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:flex-start"><span class="nm">' + esc(e.name) + '</span></div><div class="ch">You choose: ' + esc(e.choice) + '</div>' +
      (lock ? '<div class="reason">' + esc(avail.reason) + '</div>' : '') + ctlHtml(e) +
      '<div class="unit">' + (e.lag ? 'Takes effect ' + e.lag + ' quarter' + (e.lag > 1 ? 's' : '') + ' after it is enacted · ' + esc(e.lagWhy) : 'Takes effect straight away') + '</div>' + (chips ? '<div>' + chips + '</div>' : '') + wait +
      '<details class="chn-lesson" data-lesson-id="' + e.id + '"><summary class="unit" style="cursor:pointer">LastMind lesson (untracked: no questions, nothing recorded)</summary><div class="lbody"></div></details></article>';
  }
  function areaWaitText(e) { return BIG_ONLY_UI.indexOf(e.area) > -1 ? 'Held in your draft until the main Budget.' : 'Held in your draft until a budget.'; }
  var BIG_ONLY_UI = ['Labour market', 'Business and supply side', 'Trade', 'Foreign investment', 'Industrial policy', 'Environment', 'Regional', 'Migration and labour supply', 'Banking and finance', 'Fiscal framework', 'Innovation'];
  function previewHtml() {
    var ch = pendingChanges().filter(function (e) { return gateOk(e).ok; });
    if (!ch.length) return '<p class="neutral" style="margin:0;font-size:.85rem">Move any slider to see what it would do to the economy over the next two years.</p>';
    var extra = ch.map(function (e) { var p = D()[e.id]; return { id: e.id, v: e.ctl.t === 'select' ? p.v : +p.v, opt: p.opt, dur: p.dur }; });
    var base = S.forecast(ui.g, 8, []), withP = S.forecast(ui.g, 8, extra);
    var row = function (lab, k) { var a = base[3][k], b = withP[3][k], c2 = base[7][k], d = withP[7][k]; return '<tr><td>' + lab + '</td><td class="n">' + f1(a) + '</td><td class="n"><b>' + f1(b) + '</b></td><td class="n">' + f1(c2) + '</td><td class="n"><b>' + f1(d) + '</b></td></tr>'; };
    return '<div class="chn-scroll"><table class="chn-table"><tr><th></th><th class="n">1 yr as is</th><th class="n">1 yr with</th><th class="n">2 yrs as is</th><th class="n">2 yrs with</th></tr>' + row('GDP growth %', 'g') + row('Inflation %', 'pi') + row('Unemployment %', 'u') + row('Deficit % GDP', 'deficit') + row('Debt % GDP', 'debtGDP') + '</table></div><p class="neutral" style="font-size:.74rem;margin:6px 0 0">Forecast with no further shocks; real events will differ. Includes the delay before each policy takes effect.</p>';
  }
  function pkgHtml() {
    var ch = pendingChanges();
    if (!ch.length) return '<span class="neutral">No changes drafted.</span>';
    return ch.map(function (e) { var p = D()[e.id], c = S.canDecide(ui.g, e.id); return '<div style="display:flex;justify-content:space-between;gap:8px;padding:3px 0"><span>' + esc(e.name) + '</span><b>' + esc(e.ctl.t === 'select' ? p.v : (+p.v > 0 ? '+' : '') + p.v) + '</b></div>'; }).join('');
  }
  function policyTab() {
    var g = ui.g, cat = catalogue(), pg = POLICY_GROUPS.filter(function (x) { return x.name === ui.group; })[0] || POLICY_GROUPS[0];
    var count = function (areas) { return cat.filter(function (e) { return areas.indexOf(e.area) > -1 && (D()[e.id] && differs(e) || g.decisions.some(function (d) { return d.id === e.id; })); }).length; };
    var tabs = '<div class="chn-tabs">' + POLICY_GROUPS.map(function (x) { var c = count(x.areas); return '<button class="chn-tab" data-group="' + esc(x.name) + '" aria-selected="' + (pg.name === x.name) + '">' + esc(x.name) + (c ? ' · ' + c : '') + '</button>'; }).join('') + '</div>';
    var sections = pg.areas.map(function (area, i) {
      var list = cat.filter(function (e) { return e.area === area && !e.preset; });
      var any = list.some(function (e) { return differs(e) || enacted(e.id); });
      var open = ui.openAreas[area] === undefined ? (i === 0 || any) : ui.openAreas[area];
      return '<details class="chn-area" data-areaname="' + esc(area) + '" ' + (open ? 'open' : '') + '><summary><b>' + esc(area) + '</b> <span class="neutral">' + list.length + ' polic' + (list.length === 1 ? 'y' : 'ies') + '</span></summary><div class="chn-grid" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr));margin-top:10px">' + list.map(policyCard).join('') + '</div></details>';
    }).join('');
    var n = pendingChanges().length, w = g.window && g.window.kind !== 'none';
    var packs = Object.keys(L.PRESETS).map(function (k) { return '<button class="chn-btn small" data-pack="' + k + '">' + esc(L.PRESETS[k].name) + '</button>'; }).join(' ');
    return policyBanner() + '<div class="chn-polwrap"><div><p class="neutral" style="margin:0 0 8px;font-size:.86rem">' + esc(pg.text) + '</p>' + tabs + '<div id="chnPolList">' + sections + '</div></div>' +
      '<aside class="chn-side"><div class="chn-card"><h3 style="font:700 .95rem Arial">Your draft</h3><div id="chnPkg" style="font-size:.85rem;margin:6px 0">' + pkgHtml() + '</div><div class="chn-actions"><button class="chn-btn primary" data-pol="save">Save draft</button><button class="chn-btn" data-pol="clear" ' + (n ? '' : 'disabled') + '>Clear draft</button></div><p class="neutral" style="font-size:.76rem;margin:8px 0 0">Saved drafts are not enacted. ' + (w ? 'The session is open: submit them with the button above.' : 'You submit them on budget day.') + '</p></div>' +
      '<div class="chn-card"><h3 style="font:700 .95rem Arial;margin-bottom:6px">Forecast effect</h3><div id="chnPrev">' + previewHtml() + '</div></div>' +
      '<div class="chn-card"><h3 style="font:700 .95rem Arial;margin-bottom:6px">Emergency budget packages</h3><div class="chn-actions">' + packs + '</div><p class="neutral" style="font-size:.74rem;margin:6px 0 0">Adds a ready-made set of changes to your draft. Edit them afterwards.</p></div></aside></div>';
  }
  function bindPolicy() {
    var host = ui.host;
    host.querySelectorAll('[data-group]').forEach(function (b) { b.onclick = function () { ui.group = b.dataset.group; renderTab(); }; });
    host.querySelectorAll('[data-pack]').forEach(function (b) { b.onclick = function () { var p = L.PRESETS[b.dataset.pack]; if (!p) return; Object.keys(p.set).forEach(function (id) { var e = catalogue().filter(function (x) { return x.id === id; })[0]; if (!e) return; var base = enacted(id) ? enacted(id).v : 0; D()[id] = { v: clampV(e, e.ctl.pickOpts ? p.set[id] : p.set[id]), opt: e.ctl.pickOpts ? e.ctl.pickOpts[0].v : null, dur: null }; }); save(); toast(p.name + ' added to your draft.'); renderTab(); }; });
    var list = host.querySelector('#chnPolList');
    if (list) {
      var onInput = function (ev) {
        var t = ev.target; if (!t.dataset || !t.dataset.pid) return;
        var e = catalogue().filter(function (x) { return x.id === t.dataset.pid; })[0]; if (!e) return;
        var p = D()[e.id] || (D()[e.id] = Object.assign({}, pendingValue(e)));
        var k = t.dataset.k;
        if (k === 'opt') p.opt = t.value; else if (k === 'dur') p.dur = +t.value;
        else if (e.ctl.t === 'select') p.v = t.value;
        else { p.v = clampV(e, t.value); var card = t.closest('.chn-pol'); card.querySelectorAll('input[data-k="v"]').forEach(function (x) { if (x !== t) x.value = p.v; }); }
        if (!differs(e)) delete D()[e.id];
        var card2 = t.closest('.chn-pol'); if (card2) card2.classList.toggle('changed', differs(e));
        saveSoon(); refreshSide();
      };
      list.addEventListener('input', onInput); list.addEventListener('change', onInput);
      list.addEventListener('toggle', function (ev) { var d = ev.target; if (d && d.dataset && d.dataset.areaname) ui.openAreas[d.dataset.areaname] = d.open; if (d && d.dataset && d.dataset.lessonId && d.open) fillLesson(d); }, true);
    }
    host.querySelectorAll('[data-pol]').forEach(function (b) { b.onclick = function () { if (b.dataset.pol === 'clear') { ui.g.draft = {}; save(); renderTab(); } else { save(); toast('Draft saved. Nothing is enacted until you submit it on budget day.'); } }; });
  }
  function refreshSide() {
    clearTimeout(ui.previewTimer);
    ui.previewTimer = setTimeout(function () {
      var pk = ui.host.querySelector('#chnPkg'), pv = ui.host.querySelector('#chnPrev'); if (!pk || !pv) return;
      pk.innerHTML = pkgHtml(); pv.innerHTML = previewHtml();
      var n = pendingChanges().length, cl = ui.host.querySelector('[data-pol="clear"]'), en = ui.host.querySelector('[data-act="enactnow"]');
      if (cl) cl.disabled = !n; if (en) { en.disabled = !n; en.textContent = 'Enact ' + n + ' drafted change' + (n === 1 ? '' : 's') + ' now'; }
    }, 160);
  }
  function enactChanges() {
    var g = ui.g, r = S.submitDraft(g);
    save(); ui.cat = null;
    var msg = r.done.length ? r.done.length + ' change' + (r.done.length === 1 ? '' : 's') + ' enacted.' : 'Nothing was enacted.';
    if (r.blocked.length) msg += ' ' + r.blocked.length + ' held in your draft (' + r.blocked[0].reason + ')';
    toast(msg); renderAll(); return r;
  }
  function endSession() {
    var g = ui.g, ev = g.events.filter(function (e) { return !e.done && e.needsAction && e.date <= g.date && (e.kind === 'budget' || e.kind === 'shock'); })[0];
    if (!ev) { g.window = { kind: 'none' }; renderAll(); return; }
    S.resolveEvent(g, ev.id, 0); save(); renderAll();
  }
  function submitBudget() {
    var g = ui.g, ev = g.events.filter(function (e) { return !e.done && e.needsAction && e.date <= g.date && e.kind === 'budget'; })[0];
    if (!ev) { toast('There is no budget to submit right now.'); return; }
    S.submitDraft(g); ui.cat = null;
    S.resolveEvent(g, ev.id, 0); save(); renderAll(); showBudgetReaction(ev);
  }

  /* ---------- LastMind lessons behind each policy (untracked, closable) ---------- */
  var AREA_TOPICS = {
    'Income tax': ['direct tax', 'progressive', 'fiscal policy', 'tax'], 'Business tax': ['corporation', 'supply-side', 'tax', 'investment'], 'Consumption tax': ['indirect tax', 'value added|VAT', 'regressive', 'tax'], 'Wealth and property': ['wealth', 'inequality', 'redistribution', 'tax'],
    'Government spending': ['government spending', 'fiscal policy', 'multiplier', 'public goods'], 'Welfare': ['benefit', 'redistribution', 'poverty', 'inequality'], 'Infrastructure': ['infrastructure', 'supply-side', 'public goods', 'LRAS'], 'Energy': ['energy', 'externalit', 'supply-side', 'environment'],
    'Human capital': ['human capital', 'education', 'skills', 'LRAS'], 'Labour market': ['minimum wage', 'trade union', 'labour market', 'unemployment'], 'Business and supply side': ['supply-side', 'privatis', 'competition', 'deregulation'], 'Innovation': ['innovation', 'R&D', 'productivity', 'supply-side'],
    'Housing': ['housing', 'supply-side', 'market failure', 'maximum price'], 'Trade': ['tariff', 'quota', 'protectionism', 'trade'], 'Foreign investment': ['foreign direct|FDI', 'globalisation', 'multinational', 'investment'], 'Industrial policy': ['industrial', 'infant industry', 'protectionism', 'supply-side'],
    'Environment': ['externalit', 'environment', 'carbon|pollution', 'regulation'], 'Regional': ['regional', 'geographical', 'unemployment', 'inequality'], 'Migration and labour supply': ['migration', 'labour force', 'LRAS', 'unemployment'], 'Monetary': ['monetary policy', 'interest rate', 'quantitative', 'central bank'],
    'Exchange rate': ['exchange rate', 'devaluation', 'floating', 'fixed'], 'Banking and finance': ['bank', 'financial', 'regulation', 'credit'], 'Fiscal framework': ['fiscal policy', 'deficit', 'national debt', 'austerity'], 'Debt management': ['national debt', 'deficit', 'fiscal', 'interest'],
    'Development': ['development', 'aid', 'poverty', 'human development'], 'Agriculture and food': ['agricultur', 'subsid', 'price', 'food'], 'Crisis controls': ['maximum price', 'subsid', 'fiscal policy', 'stimulus|austerity'],
  };
  var ID_TOPICS = { min_wage: ['minimum wage'], tariff: ['tariff'], tariff_cut: ['tariff', 'trade liberali'], quota: ['quota'], qe: ['quantitative'], qt: ['quantitative', 'monetary'], rate: ['interest rates', 'monetary policy'], carbon: ['carbon', 'externalit', 'indirect tax'], ets: ['externalit', 'tradable|permit', 'carbon'], privatise: ['privatis'], nationalise: ['nationalis|public ownership', 'privatis'],
    rent_reg: ['maximum price', 'rent'], price_cap: ['maximum price'], food_sub: ['subsid'], agri_sub: ['subsid'], vat: ['indirect tax', 'value added|VAT'], fiscal_rule: ['fiscal policy', 'deficit'], retire: ['labour force', 'demographic'], devalue: ['devaluation'], fixed_fx: ['fixed'], dev_aid: ['aid'], fta: ['trade agreement', 'trade bloc|customs'], customs: ['customs union'] };
  var lessonMap = null, lessonMapPromise = null;
  function loadLessonMap() {
    if (lessonMap) return Promise.resolve(lessonMap);
    if (!lessonMapPromise) lessonMapPromise = createAuthedFetch('/knowledge-map-v2?subject=Economics&qualification=A-Level&examBoard=Edexcel').then(function (r) { lessonMap = (r.body && r.body.nodes) || []; return lessonMap; }).catch(function () { lessonMapPromise = null; return []; });
    return lessonMapPromise;
  }
  function topicNodes(e, nodes) {
    var pats = (ID_TOPICS[e.id] || []).concat(AREA_TOPICS[e.area] || []).map(function (p) { return new RegExp(p, 'i'); }), scored = [];
    nodes.forEach(function (n) { var sc = 0; pats.forEach(function (re, i) { if (re.test(n.label)) sc += (pats.length - i) * (i < (ID_TOPICS[e.id] || []).length ? 3 : 1); }); if (sc > 0) scored.push({ n: n, sc: sc + (/^definition|:\s*definition/i.test(n.label) ? 0 : 0.5) }); });
    scored.sort(function (a, b) { return b.sc - a.sc; });
    return scored.slice(0, 4).map(function (x) { return x.n; });
  }
  function paragraphs(text) { return String(text || '').split(/\n{2,}|\r\n{2,}/).map(function (p) { return p.trim(); }).filter(Boolean).map(function (p) { return '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>'; }).join(''); }
  var lessonCache = {};
  async function openLesson(id) {
    var e = catalogue().filter(function (x) { return x.id === id; })[0]; if (!e) return;
    ui.lessonCtx = { id: id, name: e.name };
    var old = document.getElementById('chnGuid'); if (old) old.remove();
    var panel = document.createElement('aside'); panel.id = 'chnGuid'; panel.className = 'chn-guid'; panel.setAttribute('aria-label', 'LastMind lesson');
    panel.innerHTML = '<div class="hd"><div><div class="chn-tag">LastMind lesson</div><div style="font:700 .95rem Arial;margin-top:4px">' + esc(e.name) + '</div><div class="neutral" style="font-size:.74rem">Untracked: no questions, nothing recorded.</div></div><button class="chn-btn small" id="chnGuidClose">Close ✕</button></div><div class="tabs" id="chnGuidTabs"></div><div class="bd" id="chnGuidBody"><p class="neutral">Finding the right lesson…</p></div>';
    document.body.appendChild(panel);
    panel.querySelector('#chnGuidClose').onclick = function () { panel.remove(); renderHeaderOnly(); };
    renderHeaderOnly();
    var nodes = await loadLessonMap();
    if (!panel.isConnected) return;
    var found = topicNodes(e, nodes), tabs = panel.querySelector('#chnGuidTabs'), body = panel.querySelector('#chnGuidBody');
    if (!found.length) { body.innerHTML = '<p>No matching lesson was found in your Economics knowledge map.</p>'; return; }
    var cur = found[0].id;
    var draw = async function () {
      tabs.innerHTML = found.map(function (n) { return '<button class="chn-tab' + '" data-node="' + esc(n.id) + '" aria-selected="' + (n.id === cur) + '">' + esc(n.label.length > 48 ? n.label.slice(0, 46) + '…' : n.label) + '</button>'; }).join('');
      tabs.querySelectorAll('[data-node]').forEach(function (b) { b.onclick = function () { cur = b.dataset.node; draw(); }; });
      var shown = cur, node = found.filter(function (n) { return n.id === cur; })[0];
      if (lessonCache[cur]) { body.innerHTML = '<h3 style="font:700 1rem Arial">' + esc(node.label) + '</h3>' + lessonCache[cur]; return; }
      body.innerHTML = '<p class="neutral">Opening your lesson…</p>';
      var r = await createAuthedFetch('/knowledge-map-v2/node/' + encodeURIComponent(cur) + '/lesson').catch(function () { return { resp: { ok: false }, body: {} }; });
      if (!panel.isConnected || shown !== cur) return;
      if (r.resp.ok && r.body && r.body.explanation) { lessonCache[cur] = paragraphs(r.body.explanation); body.innerHTML = '<h3 style="font:700 1rem Arial">' + esc(node.label) + '</h3>' + lessonCache[cur]; }
      else body.innerHTML = '<p>' + esc(r.body && r.body.code === 'LOCK_LIMIT_REACHED' ? "You're out of Locks for now, so this lesson cannot be opened." : "The lesson couldn't be loaded just now.") + '</p><button class="chn-btn small" id="chnGuidRetry">Try again</button>';
      var rt = body.querySelector('#chnGuidRetry'); if (rt) rt.onclick = draw;
    };
    draw();
  }
  // The lesson sits on the policy card itself: open it to read, close it to tuck it away.
  async function fillLesson(d) {
    var e = catalogue().filter(function (x) { return x.id === d.dataset.lessonId; })[0], box = d.querySelector('.lbody'); if (!e || !box || box.dataset.ready) return;
    box.innerHTML = '<p class="neutral" style="font-size:.85rem">Finding the right lesson…</p>';
    var nodes = await loadLessonMap();
    var found = topicNodes(e, nodes);
    if (!found.length) { box.innerHTML = '<p class="neutral" style="font-size:.85rem">No matching lesson was found in your Economics knowledge map.</p>'; return; }
    box.dataset.ready = '1';
    var cur = found[0].id;
    var draw = async function () {
      var node = found.filter(function (n) { return n.id === cur; })[0];
      var tabs = '<div class="chn-tabs" style="margin:6px 0">' + found.map(function (n) { return '<button class="chn-tab" data-node="' + esc(n.id) + '" aria-selected="' + (n.id === cur) + '" style="padding:4px 10px;font-size:.76rem">' + esc(n.label.length > 44 ? n.label.slice(0, 42) + '…' : n.label) + '</button>'; }).join('') + '</div>';
      var wire = function () { box.querySelectorAll('[data-node]').forEach(function (b) { b.onclick = function () { cur = b.dataset.node; draw(); }; }); };
      if (lessonCache[cur]) { box.innerHTML = tabs + '<div class="lesson-text"><h4 style="font:700 .95rem Arial;margin:4px 0">' + esc(node.label) + '</h4>' + lessonCache[cur] + '</div>'; wire(); return; }
      box.innerHTML = tabs + '<p class="neutral" style="font-size:.85rem">Opening your lesson…</p>'; wire();
      var r = await createAuthedFetch('/knowledge-map-v2/node/' + encodeURIComponent(cur) + '/lesson').catch(function () { return { resp: { ok: false }, body: {} }; });
      if (cur !== node.id) return;
      if (r.resp.ok && r.body && r.body.explanation) { lessonCache[cur] = paragraphs(r.body.explanation); }
      else { box.innerHTML = tabs + '<p style="font-size:.85rem">' + esc(r.body && r.body.code === 'LOCK_LIMIT_REACHED' ? "You're out of Locks for now, so this lesson cannot be opened." : "The lesson couldn't be loaded just now.") + '</p><button class="chn-btn small" id="chnLessonRetry">Try again</button>'; wire(); var rt = box.querySelector('#chnLessonRetry'); if (rt) rt.onclick = draw; return; }
      draw();
    };
    draw();
  }
  function closeLesson() { var p = document.getElementById('chnGuid'); if (p) p.remove(); }

  /* ---------- budget tab ---------- */
  function budgetTab() {
    var g = ui.g, sp = S.spendingNow(g), rows = '', tot = 0, cur = g.cfg.currency || '';
    Object.keys(sp.spending).forEach(function (k) { var v = sp.spending[k]; tot += v; rows += '<tr><td>' + esc(k) + '</td><td class="n">' + money(v) + '</td><td class="n">' + f1(v / (sp.gdp / 4) * 100) + '%</td></tr>'; });
    tot += sp.interest; rows += '<tr><td>Debt interest</td><td class="n">' + money(sp.interest) + '</td><td class="n">' + f1(sp.interest / (sp.gdp / 4) * 100) + '%</td></tr>';
    var revRows = '', revTot = 0, labels = { incBasic: 'Basic-rate income tax', incTop: 'Higher-rate income tax', corp: 'Corporation tax', vat: 'VAT / sales tax', duty: 'Duties', property: 'Property taxes', cgt: 'Capital gains tax', inherit: 'Inheritance tax', fuel: 'Fuel duty' };
    Object.keys(sp.revenue).forEach(function (k) { var v = sp.revenue[k]; revTot += v; revRows += '<tr><td>' + esc(labels[k] || k) + '</td><td class="n">' + money(v) + '</td></tr>'; });
    revRows += '<tr><td>Change from your policies</td><td class="n">' + money(sp.revenuePolicy) + '</td></tr>';
    var pol = sp.policies.map(function (p) { return '<tr><td>' + esc(p.name) + '</td><td class="n">' + money(p.spendPct * sp.gdp / 400) + '</td><td class="n">' + money(p.revPct * sp.gdp / 400) + '</td></tr>'; }).join('') || '<tr><td colspan="3" class="neutral">No policy changes yet.</td></tr>';
    var hist = g.spendLog.slice(-8).map(function (r) { return '<tr><td>' + esc(S.niceMonth(r.date)) + '</td><td class="n">' + money(r.gdp / 4) + '</td><td class="n">' + money(Object.keys(r.spending).reduce(function (a, k) { return a + r.spending[k]; }, 0) + r.interest) + '</td><td class="n">' + money(r.deficit) + '</td><td class="n">' + money(r.debt) + '</td></tr>'; }).join('') || '<tr><td colspan="5" class="neutral">The first quarterly accounts arrive at the end of this quarter.</td></tr>';
    var bb = g.bigBudget, changeable = !bb.done && S.addDays(g.date, 15) <= bb.date;
    return '<div class="chn-card" style="margin-bottom:12px"><div class="chn-actions" style="justify-content:space-between"><div><b>The Budget</b> is set for <b>' + esc(S.nice(bb.date)) + '</b>. You choose when it is delivered, up to two months before the election.</div><div class="chn-actions"><input type="date" id="chnBudgetDate" value="' + bb.date + '" min="' + S.addDays(g.date, 15) + '" max="' + S.addDays(g.electionDate, -60) + '" style="padding:6px 8px;border-radius:8px;border:1px solid rgba(26,26,28,.35);background:var(--panel);color:var(--text)"><button class="chn-btn" id="chnBudgetMove" ' + (changeable ? '' : 'disabled') + '>Move the Budget</button></div></div></div>' +
      '<div class="chn-two"><div class="chn-card"><div class="chn-sec" style="margin-top:0">Spending this quarter (' + esc(cur) + ')</div><div class="chn-scroll"><table class="chn-table"><tr><th>Item</th><th class="n">Amount</th><th class="n">% of GDP</th></tr>' + rows + '<tr class="grp"><td>Total</td><td class="n">' + money(tot) + '</td><td class="n">' + f1(tot / (sp.gdp / 4) * 100) + '%</td></tr></table></div></div>' +
      '<div class="chn-card"><div class="chn-sec" style="margin-top:0">Revenue this quarter</div><div class="chn-scroll"><table class="chn-table"><tr><th>Tax</th><th class="n">Amount</th></tr>' + revRows + '</table></div><div class="chn-mtx"><div>Deficit<b>' + money(sp.deficit) + '</b></div><div>Debt<b>' + f1(metricsNow().debtGDP) + '% of GDP</b></div><div>Debt interest<b>' + money(sp.interest) + '</b></div></div></div></div>' +
      '<div class="chn-two"><div class="chn-card"><div class="chn-sec" style="margin-top:0">What your policies cost or raise, per quarter</div><div class="chn-scroll"><table class="chn-table"><tr><th>Policy</th><th class="n">Spending</th><th class="n">Revenue</th></tr>' + pol + '</table></div></div>' +
      '<div class="chn-card"><div class="chn-sec" style="margin-top:0">Recent quarters</div><div class="chn-scroll"><table class="chn-table"><tr><th>Quarter</th><th class="n">GDP</th><th class="n">Spending</th><th class="n">Deficit</th><th class="n">Debt</th></tr>' + hist + '</table></div></div></div>';
  }
  function bindBudget() {
    var b = ui.host.querySelector('#chnBudgetMove'); if (!b) return;
    b.onclick = function () { var d = ui.host.querySelector('#chnBudgetDate').value, r = S.rescheduleBudget(ui.g, d); if (!r.ok) toast(r.reason); else { save(); toast('The Budget will be delivered on ' + S.nice(d) + '.'); renderAll(); } };
  }

  /* ---------- people ---------- */
  function trendOf(key) { var h = ui.g.pop.history; return h.length > 4 ? h[h.length - 1].public - h[h.length - 4].public : 0; }
  function personCard(p, extra) {
    return '<div class="chn-card"><div class="chn-person">' + avatar(p.key, p.name) + '<div class="who"><b>' + esc(p.name) + '</b><small>' + esc(p.role) + '</small></div></div>' + (extra || '') + '</div>';
  }
  function moodText(p) {
    var want = { polls: 'Cares most about the polls', trade: 'Wants trade and export support', police: 'Wants more for policing', health: 'Wants more for healthcare', education: 'Wants more for schools', defence: 'Wants more for defence', business: 'Wants lower taxes on business', welfare: 'Wants a stronger safety net' }[p.want] || '';
    var a = p.approval; return (a > 65 ? 'Firmly behind you.' : a > 45 ? 'Supportive for now.' : a > 30 ? 'Losing patience.' : 'Ready to move against you.') + (want ? ' ' + want + '.' : '');
  }
  function peopleTab() {
    var g = ui.g, P = g.pop, gov = g.parties;
    var groups = S.GROUPS.map(function (gr) { var v = P.groups[gr.key], d = v - (P.history.length > 4 ? P.history[P.history.length - 4][gr.key] || v : v); return '<div class="chn-row"><span>' + esc(gr.label) + '</span><div class="chn-bar"><i style="width:' + f0(v) + '%"></i></div><b>' + f0(v) + '%</b></div>'; }).join('');
    var cabinet = g.people.filter(function (p) { return p.party === 'gov'; }).map(function (p) {
      var bar = p.key === 'chancellor' ? '<div class="chn-row" style="grid-template-columns:110px 1fr 46px"><span>Party members</span><div class="chn-bar"><i style="width:' + f0(P.groups.party) + '%"></i></div><b>' + f0(P.groups.party) + '%</b></div>' : '<div class="chn-row" style="grid-template-columns:110px 1fr 46px"><span>Confidence in you</span><div class="chn-bar"><i style="width:' + f0(p.approval) + '%;background:' + (p.approval < 30 ? 'var(--chn-bad)' : 'var(--accent)') + '"></i></div><b>' + f0(p.approval) + '%</b></div><div class="neutral" style="font-size:.78rem">' + esc(moodText(p)) + '</div>';
      return personCard(p, bar);
    }).join('');
    var opp = g.people.filter(function (p) { return p.party === 'opp'; }).map(function (p) { return personCard(p, '<div class="neutral" style="font-size:.78rem;margin-top:6px">' + esc(gov.opp.name) + ' · polling ' + P.polls.opp + '%</div>'); }).join('');
    var ris = g.people.filter(function (p) { return p.party === 'rising'; }).map(function (p) { return personCard(p, '<div class="neutral" style="font-size:.78rem;margin-top:6px">' + esc(gov.rising.name) + ' · polling ' + P.polls.rising + '%</div>'); }).join('');
    return '<div class="chn-two"><div class="chn-card"><div class="chn-sec" style="margin-top:0">How each audience sees you</div>' + groups + '<p class="neutral" style="font-size:.78rem;margin:8px 0 0">Prices, jobs, growth and the deficit move these slowly. Policies and interviews move them quickly, then fade.</p></div>' +
      '<div class="chn-card chn-chart"><h4>Polls</h4>' + svgChart({ series: [{ name: gov.gov.name, color: gov.gov.color, pts: P.history.map(function (h) { return [TS(h.date), h.gov]; }) }, { name: gov.opp.name, color: gov.opp.color, pts: P.history.map(function (h) { return [TS(h.date), h.opp]; }) }, { name: gov.rising.name, color: gov.rising.color, pts: P.history.map(function (h) { return [TS(h.date), h.rising]; }) }], today: TS(g.date), label: 'polls' }) + '<div class="chn-row" style="grid-template-columns:170px 1fr 40px;margin-top:8px"><span>Pressure for an early election</span><div class="chn-bar"><i style="width:' + f0(P.pressure.level) + '%;background:' + (P.pressure.level > 60 ? 'var(--chn-bad)' : 'var(--accent)') + '"></i></div><b>' + f0(P.pressure.level) + '</b></div></div></div>' +
      '<div class="chn-sec">Your government (' + esc(gov.gov.name) + ')</div><div class="chn-people">' + cabinet + '</div>' +
      '<div class="chn-sec">The opposition (' + esc(gov.opp.name) + ')</div><div class="chn-people">' + opp + '</div>' +
      '<div class="chn-sec">The rising party (' + esc(gov.rising.name) + ')</div><div class="chn-people">' + ris + '</div>';
  }

  /* ---------- news and log ---------- */
  var SLANT = { left: 'Left-leaning', right: 'Right-leaning', business: 'Business paper' };
  var KIND_TAG = { background: 'Background: how we got here' };
  function causesCard() {
    var cs = S.causes(ui.g);
    if (!cs.length) return '<div class="chn-card" style="margin-bottom:12px"><div class="chn-sec" style="margin-top:0">Why we are here</div><p class="neutral" style="margin:0;font-size:.9rem">' + esc(S.SITUATIONS[ui.g.sit].diagnosis || '') + '</p></div>';
    return '<div class="chn-card" style="margin-bottom:12px"><div class="chn-sec" style="margin-top:0">Why we are here: the lasting causes</div><p class="neutral" style="margin:0 0 6px;font-size:.84rem">' + esc(S.SITUATIONS[ui.g.sit].diagnosis || '') + '</p>' +
      cs.map(function (c) { var pct = Math.round(Math.max(0, Math.min(1, c.level)) * 100); return '<div class="chn-item" style="display:block"><div style="display:flex;justify-content:space-between;gap:10px"><b>' + esc(c.label) + '</b><span class="neutral">' + pct + '% as bad as at the start</span></div><div class="chn-bar" style="margin:4px 0"><i style="width:' + pct + '%;background:' + (pct > 55 ? 'var(--chn-bad)' : 'var(--accent)') + '"></i></div><div style="font-size:.85rem">' + esc(c.text) + '</div><div style="font-size:.85rem"><span class="good">To address it:</span> ' + esc(c.fix) + '</div></div>'; }).join('') + '</div>';
  }
  function newsTab() {
    var g = ui.g, a = g.news.slice(0, 40);
    return causesCard() + '<div class="chn-actions" style="margin-bottom:10px"><button class="chn-btn" id="chnNewsBtn">Write this quarter\'s front pages (AI)</button><span class="neutral" style="font-size:.8rem">Three papers, three angles, written from what has really happened. Passive news also appears every month.</span></div>' +
      '<div class="chn-news">' + (a.map(function (x) { return '<article class="chn-card chn-article"><div class="meta"><b>' + esc(x.outlet) + '</b><span class="chn-tag">' + esc(SLANT[x.slant] || 'Interview') + '</span>' + (KIND_TAG[x.kind] ? '<span class="chn-tag" style="background:rgba(180,83,9,.18)">' + esc(KIND_TAG[x.kind]) + '</span>' : '') + '<span>' + esc(S.nice(x.date)) + '</span></div><h4>' + esc(x.headline) + '</h4>' + (x.standfirst ? '<p><i>' + esc(x.standfirst) + '</i></p>' : '') + '<p>' + esc(x.body) + '</p></article>'; }).join('') || '<div class="neutral">No stories yet. Advance the calendar.</div>') + '</div>' + (setTimeout(function () { var b = ui.host.querySelector('#chnNewsBtn'); if (b) b.onclick = function () { fetchNews(true); }; }, 0) && '');
  }
  function logTab() {
    var g = ui.g, items = [];
    g.decisions.forEach(function (d) { var e = L.CAT.filter(function (c) { return c.id === d.id; })[0]; if (e) items.push({ date: d.date, text: 'Policy: ' + S.describe(e, d.v, d.opt, d.dur) }); });
    g.log.forEach(function (l) { items.push({ date: l.date, text: l.title + (l.choice ? ' - ' + l.choice : '') + (l.note ? '. ' + l.note : '') }); });
    items.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    return '<div class="chn-card"><div class="chn-list">' + (items.map(function (i) { return '<div class="chn-item"><span>' + esc(i.text) + '</span><span class="neutral">' + esc(S.nice(i.date)) + '</span></div>'; }).join('') || '<div class="neutral">Nothing yet.</div>') + '</div></div>';
  }

  /* ---------- modals and events ---------- */
  function toast(msg) { var t = document.createElement('div'); t.className = 'chn-toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3800); }
  function modal(html, o) {
    return new Promise(function (resolve) {
      var ov = document.createElement('div'); ov.className = 'chn-overlay'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
      ov.innerHTML = '<div class="chn-modal">' + (o && o.img ? '<div class="hero" style="background-image:url(' + o.img + ')"></div>' : '') + '<div class="body">' + html + '</div></div>';
      document.body.appendChild(ov);
      var close = function (v) { ov.remove(); resolve(v); };
      ov.addEventListener('click', function (e) { var t = e.target.closest('[data-m]'); if (t) close(t.dataset.m); });
      if (o && o.onOpen) o.onOpen(ov, close);
    });
  }
  function showBriefing() {
    var g = ui.g, m = metricsNow(), sit = S.SITUATIONS[g.sit].name, stage = S.STAGES[g.stage].label;
    return modal('<h2>Welcome, Chancellor</h2><p>' + esc(g.cfg.country) + ' is an ' + esc(stage.toLowerCase()) + '. Starting situation: <b>' + esc(sit) + '</b>.</p>' +
      '<div class="chn-mtx"><div>GDP growth<b>' + f1(m.growth) + '%</b></div><div>Inflation<b>' + f1(m.inflation) + '%</b></div><div>Unemployment<b>' + f1(m.unemployment) + '%</b></div><div>Public debt<b>' + f0(m.debtGDP) + '% of GDP</b></div><div>Deficit<b>' + f1(m.deficit) + '%</b></div><div>Your approval<b>' + f0(ui.g.pop.groups.public) + '%</b></div></div>' +
      '<div class="chn-quote"><b>What is behind it.</b> ' + esc(S.SITUATIONS[g.sit].diagnosis || '') + '</div><p style="margin-top:12px">Time moves when you press Advance and stops whenever something needs you: budgets, shocks, political rows and interviews. Your first Budget is on ' + esc(S.nice(g.bigBudget.date)) + '. Until then, prepare policies in the Policy tab, see their forecasts and save them as a draft: nothing takes effect until you submit it on budget day. Policy can only be changed at budgets and in emergency sessions, and everything takes time to work. A general election is due on ' + esc(S.nice(g.electionDate)) + '.</p>' + (g.cfg.history ? '<p class="neutral"><i>' + esc(g.cfg.history.slice(0, 300)) + '</i></p>' : '') + '<div class="btns"><button class="chn-btn primary" data-m="ok">Take office</button></div>', { img: '/assets/chancellor/cabinet-room.jpg' });
  }
  function showBudgetReaction(ev) {
    var g = ui.g, P = g.pop;
    return modal('<h2>The Budget lands</h2><p>Markets and voters react over the coming weeks. Watch the approval figures, the polls and the bond market.</p><div class="chn-mtx"><div>Approval<b>' + f0(P.groups.public) + '%</b></div><div>Markets<b>' + f0(P.groups.markets) + '%</b></div><div>Business<b>' + f0(P.groups.business) + '%</b></div></div><div class="btns"><button class="chn-btn primary" data-m="ok">Continue</button></div>', { img: '/assets/chancellor/budget-day.jpg' });
  }
  function lobbyAsks(g) {
    var asks = [{ key: 'health', id: 'health', v: 8, text: 'more for the NHS-style health service' }, { key: 'education', id: 'education', v: 8, text: 'more for schools' }, { key: 'defence', id: 'defence', v: 10, text: 'a bigger defence budget' }, { key: 'work', id: 'pensions', v: 5, text: 'a higher pension' }, { key: 'business', id: 'corp', v: -2, text: 'a cut in corporation tax' }, { key: 'home', id: 'policing', v: 8, text: 'more for policing' }];
    return asks.filter(function (a) { var p = S.person(g, a.key); return p && !p.resigned; }).slice(0, 4);
  }
  async function handleEvent(ev) {
    var g = ui.g, kind = ev.kind;
    if (kind === 'info' || kind === 'campaign') { ui.notices.push({ title: ev.title + '.', text: ev.text }); if (kind === 'campaign') await modal('<h2>' + esc(ev.title) + '</h2><p>' + esc(ev.text) + '</p><div class="btns"><button class="chn-btn primary" data-m="ok">Continue</button></div>', { img: '/assets/chancellor/parliament.jpg' }); return; }
    if (kind === 'shock') {
      var pick = await modal('<h2>' + esc(ev.title) + '</h2><p>' + esc(ev.text) + '</p><p class="neutral">An emergency session is open. You can change taxes, spending, crisis measures, banking, money and debt now, or leave the economy to absorb it.</p><div class="btns"><button class="chn-btn primary" data-m="respond">Open the emergency session</button><button class="chn-btn" data-m="wait">Do nothing for now</button></div>', { img: '/assets/chancellor/newsroom.jpg' });
      if (pick === 'respond') { ui.tab = 'policy'; renderAll(); } else { S.resolveEvent(g, ev.id, 0); }
      return;
    }
    if (kind === 'political') {
      var idx = await modal('<h2>' + esc(ev.title) + '</h2><p>' + esc(ev.text) + '</p>' + ev.options.map(function (o, i) { return '<button class="chn-opt" data-m="' + i + '">' + esc(o.label) + '</button>'; }).join(''), { img: '/assets/chancellor/parliament.jpg' });
      var choice = +idx; S.resolveEvent(g, ev.id, choice);
      var o = ev.options[choice]; if (o && o.note) toast(o.note);
      return;
    }
    if (kind === 'budget-prep') {
      var asks = lobbyAsks(g), fc = S.forecast(g, 4, []), m = metricsNow();
      var html = '<h2>' + esc(ev.title) + '</h2><p>' + esc(ev.text) + '</p><div class="chn-mtx"><div>Growth in a year<b>' + f1(fc[3].g) + '%</b></div><div>Inflation in a year<b>' + f1(fc[3].pi) + '%</b></div><div>Unemployment in a year<b>' + f1(fc[3].u) + '%</b></div><div>Deficit in a year<b>' + f1(fc[3].deficit) + '% of GDP</b></div></div><div class="chn-sec">Colleagues are lobbying</div>' +
        asks.map(function (a, i) { var p = S.person(g, a.key); return '<label class="chn-item" style="align-items:center;cursor:pointer"><span><b>' + esc(p.name) + '</b> (' + esc(p.role) + ') wants ' + esc(a.text) + '.</span><input type="checkbox" data-ask="' + i + '"></label>'; }).join('') +
        '<p class="neutral" style="font-size:.8rem">Ticking a request adds it to your draft and pleases that colleague. Ignoring it disappoints them a little. You can shape your whole draft in the Policy tab before budget day.</p><div class="btns"><button class="chn-btn primary" data-m="ok">Continue to the ' + (ev.big ? 'Budget' : 'statement') + '</button></div>';
      var checked = {};
      await modal(html, { img: '/assets/chancellor/budget-day.jpg', onOpen: function (ov) { ov.querySelectorAll('[data-ask]').forEach(function (cb) { cb.addEventListener('change', function () { checked[cb.dataset.ask] = cb.checked; }); }); } });
      var lobby = {}; asks.forEach(function (a, i) { lobby[a.key] = !!checked[i]; if (checked[i]) { var e = catalogue().filter(function (x) { return x.id === a.id; })[0]; if (e) D()[a.id] = { v: clampV(e, (enacted(a.id) ? enacted(a.id).v : 0) + a.v), opt: null, dur: null }; } });
      S.resolveEvent(g, ev.id, 0, { lobby: lobby });
      return;
    }
    if (kind === 'budget') {
      var go = await modal('<h2>' + esc(ev.title) + '</h2><p>' + esc(ev.text) + '</p><div class="btns"><button class="chn-btn primary" data-m="go">Open the Policy tab and submit your draft</button></div>', { img: '/assets/chancellor/budget-day.jpg' });
      ui.tab = 'policy'; renderAll(); return;
    }
    if (kind === 'interview') { await runInterview(ev); return; }
    if (kind === 'election') { await runElectionEvent(ev); return; }
  }
  async function runElectionEvent(ev) {
    var g = ui.g; S.resolveEvent(g, ev.id, 0); save();
    var r = g.lastElection, gov = g.parties;
    var bars = ['gov', 'opp', 'rising'].map(function (k) { return '<div class="chn-row"><span>' + esc(gov[k].name) + '</span><div class="chn-bar"><i style="width:' + Math.min(100, r.shares[k] * 2) + '%;background:' + gov[k].color + '"></i></div><b>' + r.shares[k] + '%</b></div>'; }).join('');
    await modal('<h2>Election result</h2>' + bars + '<p style="margin-top:12px">' + (r.winner === 'gov' ? '<b>' + esc(gov.gov.name) + ' wins.</b> You stay as Chancellor for another four years.' : '<b>' + esc(gov[r.winner].name) + ' wins.</b> Your time as Chancellor is over.') + '</p><div class="btns"><button class="chn-btn primary" data-m="ok">Continue</button></div>', { img: '/assets/chancellor/election-night.jpg' });
  }

  /* ---------- interviews ---------- */
  function aiContext(extra) {
    var g = ui.g, m = metricsNow();
    return Object.assign({ country: g.cfg.country, currency: g.cfg.currency, stage: g.stage, date: g.date, situation: S.SITUATIONS[g.sit].name,
      metrics: { growth: m.growth, inflation: m.inflation, unemployment: m.unemployment, policyRate: m.policyRate, debtGDP: m.debtGDP, deficit: m.deficit, currency: m.exchangeVsStart, realWages: m.realWages },
      goals: g.goals || '', recentPolicies: g.recent.slice(0, 8), news: g.news.slice(0, 4).map(function (a) { return a.headline; }), popularityPublic: g.pop.groups.public, popularityCabinet: S.cabinetAverage(g), pollGovernment: g.pop.polls.gov, pollOpposition: g.pop.polls.opp }, extra || {});
  }
  var AUD = { public: 'The public', workers: 'Working households', business: 'Business', pensioners: 'Pensioners', young: 'Young people', markets: 'Markets', cabinet: 'Your cabinet', party: 'Your party' };
  async function runInterview(ev) {
    var g = ui.g, key = 'j:' + ev.journalist; requestPortrait(key, 'a television news interviewer');
    var q = null, err = '';
    var cancelled = false;
    // 1. the question
    var shell = function (inner) { return '<div style="display:flex;gap:14px;align-items:center;margin:4px 0 10px">' + avatar(key, ev.journalist, true) + '<div><h2 style="margin:0">' + (ev.goals ? 'First interview: your goals' : 'Interview: ' + esc(ev.outlet)) + '</h2><div class="neutral">with ' + esc(ev.journalist) + '</div></div></div>' + inner; };
    var res = await modal(shell('<p id="chnQ" class="chn-quote neutral">The interviewer is finding a question…</p><div id="chnQArea"></div><div class="btns"><button class="chn-btn" data-m="skip">Skip the interview</button></div>'), {
      img: '/assets/chancellor/interview-studio.jpg',
      onOpen: function (ov, close) {
        (ev.goals ? Promise.resolve({ resp: { ok: true }, body: { question: 'Congratulations on taking office, Chancellor. Before we get into the detail: what are your goals for the economy over this term, and what would count as success?', angle: 'Your goals' } }) : createAuthedFetch('/chancellor/interview/question', { method: 'POST', body: JSON.stringify({ context: aiContext({ journalist: ev.journalist, outlet: ev.outlet }), previousAngles: g.interviewAngles.slice(-6), clientUsedUsd: createSpend.usedUsd }) })).then(function (r) {
          if (r.body && r.body.spend) createNoteSpend(r.body.spend);
          var qEl = ov.querySelector('#chnQ'); if (!qEl) return;
          if (!r.resp.ok) { qEl.textContent = r.body.error || 'The interviewer could not be reached.'; return; }
          q = r.body; g.interviewAngles.push(q.angle || '');
          qEl.className = 'chn-quote'; qEl.textContent = '“' + q.question + '”';
          ov.querySelector('#chnQArea').innerHTML = '<textarea class="chn-ans" id="chnAnswer" maxlength="2500" placeholder="' + (ev.goals ? 'Set out your goals in your own words: what you want for jobs, prices, growth, public finances and fairness, and how you will judge success. You will be held to this.' : 'Answer in your own words. Be honest about the figures, and say what you will do.') + '"></textarea><div class="neutral" style="font-size:.78rem;margin-top:4px">Judged on accuracy against the real figures, directness, empathy and consistency with what you have done. Keep it civil: offensive language is blocked.</div><div class="btns"><button class="chn-btn primary" data-m="answer">Answer</button><button class="chn-btn" data-m="skip">Skip</button></div>';
        }).catch(function () { var qEl = ov.querySelector('#chnQ'); if (qEl) qEl.textContent = 'The interviewer could not be reached.'; });
        ov.addEventListener('click', function (e) {
          var t = e.target.closest('[data-m="answer"]'); if (!t) return;
          e.stopPropagation();
          var ta = ov.querySelector('#chnAnswer'), text = ta.value.trim();
          if (!text) { toast('Write an answer first.'); return; }
          if (typeof lmScreenText === 'function' && lmScreenText(text).vulgar) { toast('Please keep it civil: offensive language cannot be sent.'); return; }
          t.disabled = true; t.textContent = 'Judging…';
          createAuthedFetch('/chancellor/interview/assess', { method: 'POST', body: JSON.stringify({ context: aiContext({ journalist: ev.journalist, outlet: ev.outlet }), question: q.question, answer: text, mode: ev.goals ? 'goals' : undefined, clientUsedUsd: createSpend.usedUsd }) }).then(function (r) {
            if (r.body && r.body.spend) createNoteSpend(r.body.spend);
            if (!r.resp.ok) { t.disabled = false; t.textContent = 'Answer'; toast(r.body.error || 'The interview could not be judged.'); return; }
            close({ assessment: r.body, answerText: text });
          }).catch(function () { t.disabled = false; t.textContent = 'Answer'; toast('Something went wrong. Try again.'); });
        }, true);
      },
    });
    if (res && res.assessment) {
      var a = res.assessment;
      if (ev.goals && res.answerText) g.goals = res.answerText.slice(0, 600);
      var rows = Object.keys(AUD).map(function (k) { var v = (a.scores || {})[k] || 0; return '<div class="chn-row" style="grid-template-columns:140px 1fr 46px"><span>' + AUD[k] + '</span><div class="chn-bar"><i style="width:' + Math.round((v + 6) / 12 * 100) + '%;background:' + (v < 0 ? 'var(--chn-bad)' : 'var(--chn-good)') + '"></i></div><b class="' + (v < 0 ? 'bad' : v > 0 ? 'good' : 'neutral') + '">' + (v > 0 ? '+' : '') + v + '</b></div>'; }).join('');
      S.resolveEvent(g, ev.id, 0, { assessment: a }); save(); renderAll();
      await modal('<h2>' + (a.gaffe ? 'A serious blunder' : 'How it landed') + '</h2><div class="chn-quote"><b>' + esc(a.headline) + '</b><br>' + esc(a.reaction) + '</div><div class="chn-actions"><span class="chn-tag">Accuracy: ' + esc(a.accuracy) + '</span><span class="chn-tag">Directness: ' + esc(a.directness) + '</span><span class="chn-tag">Empathy: ' + esc(a.empathy) + '</span></div><div class="chn-sec">Audience reaction</div>' + rows + '<div class="chn-sec">Coaching</div><p>' + esc(a.coaching) + '</p><div class="btns"><button class="chn-btn primary" data-m="ok">Continue</button></div>', { img: '/assets/chancellor/interview-studio.jpg' });
    } else {
      S.resolveEvent(g, ev.id, 0, { assessment: { scores: { public: -1, cabinet: -1 }, pressure: 1, headline: 'Chancellor ducks interview', reaction: 'The interview was cancelled.', coaching: '' } }); save();
    }
  }

  /* ---------- news from the papers (AI) ---------- */
  function restartGame() {
    if (!window.confirm('Restart this scenario from the very beginning? Your progress, decisions and drafts will be lost.')) return;
    var g = ui.g, opts = ui.launchOpts || {};
    var cfg = Object.assign({}, g.cfg, { seed: g.seed0, startDate: g.startDate });
    try { localStorage.removeItem(STORE); } catch (e) { /* fine */ }
    closeLesson();
    launch(ui.host, cfg, Object.assign({}, opts, { resume: false }));
  }
  var newsBusy = false;
  async function fetchNews(manual) {
    if (newsBusy) return; var g = ui.g;
    if (!manual && createBudgetLeft() < 0.35) return;
    newsBusy = true; if (manual) toast('The papers are being written…');
    try {
      var events = g.log.slice(-5).map(function (l) { return l.title + (l.choice ? ': ' + l.choice : ''); }).concat(g.recent.slice(0, 4));
      var r = await createAuthedFetch('/chancellor/news', { method: 'POST', body: JSON.stringify({ context: aiContext(), outlets: g.outlets, events: events, clientUsedUsd: createSpend.usedUsd }) });
      if (r.body && r.body.spend) createNoteSpend(r.body.spend);
      if (r.resp.ok && r.body.articles) { r.body.articles.forEach(function (a) { g.news.unshift({ date: g.date, outlet: a.outlet, slant: a.slant, headline: a.headline, standfirst: a.standfirst, body: a.body, kind: 'ai' }); }); g.news = g.news.slice(0, 80); save(); if (ui.tab === 'news' || ui.tab === 'overview') renderTab(); if (manual) toast('Front pages ready.'); }
      else if (manual) toast(r.body.error || 'The papers could not be written.');
    } catch (err) { if (manual) toast('The papers could not be written.'); }
    newsBusy = false;
  }

  /* ---------- advancing time ---------- */
  async function doAdvance(ff) {
    if (ui.busy) return; var g = ui.g; if (g.over) return;
    ui.busy = true;
    try {
      for (var guard = 0; guard < 500; guard++) {
        var r = S.advance(g);
        if (r.blocked && r.events.some(function (e) { return e.kind !== 'budget' && e.kind !== 'shock'; })) { for (var bi = 0; bi < r.events.length; bi++) { if (r.events[bi].kind !== 'budget' && r.events[bi].kind !== 'shock') await handleEvent(r.events[bi]); } save(); renderAll(); continue; }
        if (r.blocked) { ui.tab = 'policy'; renderAll(); toast('Finish the open session first: use the button at the top of the Policy tab.'); break; }
        save();
        if (g.over) { renderAll(); showOver(); break; }
        renderAll();
        if (g.needsQuarterNews) { g.needsQuarterNews = false; fetchNews(false); }
        var evs = r.events || [], action = false;
        for (var i = 0; i < evs.length; i++) { if (evs[i].needsAction) action = true; await handleEvent(evs[i]); if (ui.g.over) break; }
        save(); renderAll();
        if (g.over) { showOver(); break; }
        if (!ff || action) break;
        if (g.events.some(function (e) { return !e.done && e.needsAction && e.date <= g.date; })) break;
      }
    } finally { ui.busy = false; }
  }
  function overHtml() {
    var o = ui.g.over, s = o.summary;
    return '<div class="chn-card" style="max-width:720px;margin:20px auto"><h2 style="font:700 1.6rem Arial">' + (o.reason === 'voted-out' ? 'Voted out' : 'Your time as Chancellor is over') + '</h2><p>' + esc(o.text) + '</p><div class="chn-mtx"><div>Growth<b>' + s.growthStart + '% to ' + s.growthEnd + '%</b></div><div>Unemployment<b>' + s.unemploymentStart + '% to ' + s.unemploymentEnd + '%</b></div><div>Inflation at the end<b>' + s.inflationEnd + '%</b></div><div>Debt<b>' + s.debtStart + '% to ' + s.debtEnd + '% of GDP</b></div><div>Approval<b>' + s.approval + '%</b></div><div>Months in office<b>' + s.months + '</b></div></div><div class="btns" style="display:flex;gap:8px;margin-top:14px"><button class="chn-btn primary" data-act="newgame">Start again</button></div></div>';
  }
  function showOver() { renderTab(); }

  window.LMChancellorUI = { launch: launch };
})();
