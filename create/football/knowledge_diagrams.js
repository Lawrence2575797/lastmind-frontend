// Coordinate graphs for the lessons. A lesson step gives a spec and FM.knowledgeDiagram(spec) returns an SVG string.
// spec: { x:[min,max], y:[min,max], xlabel, ylabel, caption, curves:[{f,from,to,color,width,dash,label}], lines:[{p1:[x,y],p2:[x,y],ext,color,dash,width,label}],
//         points:[{x,y,label,color,dx,dy}], rects:[{x,y,w,h,fill,stroke,label}], bars:[{x,w,h,fill,label}], areas:[{f,from,to,fill}], texts:[{x,y,t,color,anchor}], vlines:[{x,color,dash,label}] }
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const num = (v) => { const a = Math.abs(v); const r = a >= 100 ? Math.round(v) : a >= 10 ? Math.round(v * 10) / 10 : Math.round(v * 100) / 100; return Math.abs(r) >= 10000 ? (r / 1000) + 'k' : String(r); };
  const niceStep = (span, n) => { const raw = span / n, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p; return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p; };
  const COL = { axis: '#8ea093', grid: 'rgba(232,220,184,.12)', text: '#cfd8cf', main: '#7FD6FF', gold: '#deb862', green: '#62d092', red: '#ee7a70' };

  let uid = 0;
  FM.knowledgeDiagram = function (s) {
    if (s.pitch && FM.knowledgePitch) return FM.knowledgePitch(s);
    const cid = 'kdc' + (++uid);
    const W = s.w || 560, H = s.h || 300, ml = 58, mr = 18, mt = 16, mb = 42, pw = W - ml - mr, ph = H - mt - mb;
    const [x0, x1] = s.x, [y0, y1] = s.y;
    const X = (v) => ml + (v - x0) / (x1 - x0) * pw, Y = (v) => mt + ph - (v - y0) / (y1 - y0) * ph;
    const inY = (v) => v >= y0 - (y1 - y0) * 0.02 && v <= y1 + (y1 - y0) * 0.02;
    let g = '';
    // grid and ticks
    const sx = niceStep(x1 - x0, 6), sy = niceStep(y1 - y0, 5);
    for (let v = Math.ceil(x0 / sx) * sx; v <= x1 + 1e-9; v += sx) g += '<line x1="' + X(v) + '" y1="' + mt + '" x2="' + X(v) + '" y2="' + (mt + ph) + '" stroke="' + COL.grid + '"/><text x="' + X(v) + '" y="' + (mt + ph + 16) + '" text-anchor="middle" fill="' + COL.axis + '" font-size="11">' + num(v) + '</text>';
    for (let v = Math.ceil(y0 / sy) * sy; v <= y1 + 1e-9; v += sy) g += '<line x1="' + ml + '" y1="' + Y(v) + '" x2="' + (ml + pw) + '" y2="' + Y(v) + '" stroke="' + COL.grid + '"/>' + (s.noy ? '' : '<text x="' + (ml - 7) + '" y="' + (Y(v) + 4) + '" text-anchor="end" fill="' + COL.axis + '" font-size="11">' + num(v) + '</text>') + '';
    // axes through zero where visible, otherwise on the frame
    const ax = Math.min(Math.max(0, x0), x1), ay = Math.min(Math.max(0, y0), y1);
    g += '<line x1="' + ml + '" y1="' + Y(ay) + '" x2="' + (ml + pw) + '" y2="' + Y(ay) + '" stroke="' + COL.axis + '" stroke-width="1.4"/><line x1="' + X(ax) + '" y1="' + mt + '" x2="' + X(ax) + '" y2="' + (mt + ph) + '" stroke="' + COL.axis + '" stroke-width="1.4"/>';
    if (s.xlabel) g += '<text x="' + (ml + pw / 2) + '" y="' + (H - 6) + '" text-anchor="middle" fill="' + COL.text + '" font-size="12">' + esc(s.xlabel) + '</text>';
    if (s.ylabel) g += '<text transform="translate(14 ' + (mt + ph / 2) + ') rotate(-90)" text-anchor="middle" fill="' + COL.text + '" font-size="12">' + esc(s.ylabel) + '</text>';
    g += '<clipPath id="' + cid + '"><rect x="' + ml + '" y="' + mt + '" width="' + pw + '" height="' + ph + '"/></clipPath><g clip-path="url(#' + cid + ')">';
    (s.areas || []).forEach((a) => { const n = 80; let d = 'M' + X(a.from) + ' ' + Y(0); for (let i = 0; i <= n; i++) { const x = a.from + (a.to - a.from) * i / n; d += 'L' + X(x) + ' ' + Y(a.f(x)); } d += 'L' + X(a.to) + ' ' + Y(0) + 'Z'; g += '<path d="' + d + '" fill="' + (a.fill || 'rgba(222,184,98,.25)') + '"/>'; });
    (s.rects || []).forEach((r) => { g += '<rect x="' + X(r.x) + '" y="' + Y(r.y + r.h) + '" width="' + Math.abs(X(r.x + r.w) - X(r.x)) + '" height="' + Math.abs(Y(r.y) - Y(r.y + r.h)) + '" fill="' + (r.fill || 'rgba(127,214,255,.18)') + '" stroke="' + (r.stroke || 'none') + '"/>'; });
    (s.bars || []).forEach((b) => { g += '<rect x="' + X(b.x - b.w / 2) + '" y="' + Y(b.h) + '" width="' + (X(b.x + b.w / 2) - X(b.x - b.w / 2) - 2) + '" height="' + (Y(0) - Y(b.h)) + '" fill="' + (b.fill || COL.main) + '"/>'; });
    (s.vlines || []).forEach((v) => { g += '<line x1="' + X(v.x) + '" y1="' + mt + '" x2="' + X(v.x) + '" y2="' + (mt + ph) + '" stroke="' + (v.color || COL.gold) + '" stroke-dasharray="' + (v.dash || '5 4') + '"/>'; });
    (s.curves || []).forEach((c) => {
      const from = c.from != null ? c.from : x0, to = c.to != null ? c.to : x1, n = 160; let d = '', pen = false;
      for (let i = 0; i <= n; i++) { const x = from + (to - from) * i / n, y = c.f(x); if (!isFinite(y) || !inY(y)) { pen = false; continue; } d += (pen ? 'L' : 'M') + X(x).toFixed(1) + ' ' + Y(y).toFixed(1); pen = true; }
      g += '<path d="' + d + '" fill="none" stroke="' + (c.color || COL.main) + '" stroke-width="' + (c.width || 2.6) + '"' + (c.dash ? ' stroke-dasharray="' + c.dash + '"' : '') + ' stroke-linejoin="round"/>';
    });
    (s.lines || []).forEach((l) => {
      let [ax1, ay1] = l.p1, [ax2, ay2] = l.p2;
      if (l.ext && ax2 !== ax1) { const m = (ay2 - ay1) / (ax2 - ax1); ax1 = x0; ay1 = l.p1[1] + m * (x0 - l.p1[0]); ax2 = x1; ay2 = l.p1[1] + m * (x1 - l.p1[0]); }
      g += '<line x1="' + X(ax1) + '" y1="' + Y(ay1) + '" x2="' + X(ax2) + '" y2="' + Y(ay2) + '" stroke="' + (l.color || COL.gold) + '" stroke-width="' + (l.width || 2) + '"' + (l.dash ? ' stroke-dasharray="' + l.dash + '"' : '') + '/>';
    });
    g += '</g>';
    (s.points || []).forEach((p) => { g += '<circle cx="' + X(p.x) + '" cy="' + Y(p.y) + '" r="' + (p.r || 5) + '" fill="' + (p.color || COL.gold) + '" stroke="#0e1612" stroke-width="1.5"/>'; if (p.label) g += '<text x="' + (X(p.x) + (p.dx != null ? p.dx : 9)) + '" y="' + (Y(p.y) + (p.dy != null ? p.dy : -9)) + '" fill="' + (p.color || COL.gold) + '" font-size="12" font-weight="700" text-anchor="' + (p.anchor || 'start') + '">' + esc(p.label) + '</text>'; });
    const lab = (arr) => (arr || []).forEach((o) => { if (o.label) { const px = o.lx != null ? o.lx : (o.p2 ? o.p2[0] : (o.to != null ? o.to : o.x)), py = o.ly != null ? o.ly : (o.f ? o.f(px) : (o.p2 ? o.p2[1] : 0)); g += '<text x="' + (X(px) + 6) + '" y="' + (Y(py) - 6) + '" fill="' + (o.color || COL.main) + '" font-size="12" font-weight="700">' + esc(o.label) + '</text>'; } });
    lab(s.curves); lab(s.lines);
    (s.rects || []).forEach((r) => { if (r.label) g += '<text x="' + (X(r.x + r.w / 2)) + '" y="' + (Y(r.y + r.h / 2) + 4) + '" text-anchor="middle" fill="' + COL.text + '" font-size="12" font-weight="700">' + esc(r.label) + '</text>'; });
    (s.bars || []).forEach((b) => { if (b.label) g += '<text x="' + X(b.x) + '" y="' + (Y(0) + 15) + '" text-anchor="middle" fill="' + COL.axis + '" font-size="11">' + esc(b.label) + '</text>'; });
    (s.texts || []).forEach((t) => { g += '<text x="' + X(t.x) + '" y="' + Y(t.y) + '" fill="' + (t.color || COL.text) + '" font-size="12" font-weight="700" text-anchor="' + (t.anchor || 'start') + '">' + esc(t.t) + '</text>'; });
    return '<figure class="kn-fig"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(s.caption || 'Graph') + '" xmlns="http://www.w3.org/2000/svg">' + g + '</svg>' + (s.caption ? '<figcaption>' + esc(s.caption) + '</figcaption>' : '') + '</figure>';
  };
  FM.knowledgeDiagramColors = COL;
})();
