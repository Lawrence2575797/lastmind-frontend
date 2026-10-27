// Pitch diagrams for the tactical lessons. A step gives { pitch:true, view, ... } and FM.knowledgeDiagram hands it here.
// Coordinates are metres on the real pitch: x along it (0 = own goal line, 105 = the goal being attacked), y across it (0..68).
// spec: { view:'full'|'attack'|'box'|'left'|'right', players:[{x,y,team:'us'|'them',label,ball,ghost}], arrows:[{from:[x,y],to:[x,y],label,color,dash}],
//         lines:[{p1,p2,label,color,dash}], zones:[{x,y,w,h,fill,label}], rings:[{x,y,r,label,color}], texts:[{x,y,t,color,anchor}], caption }
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const C = { grass: '#2b6b3a', grass2: '#2f7340', line: 'rgba(255,255,255,.72)', us: '#7FD6FF', them: '#ee7a70', gold: '#deb862', green: '#62d092', text: '#f2f5f0' };
  const VIEWS = { full: [-3, 108, 0, 68], attack: [48, 108, 0, 68], box: [74, 108, 12, 56], left: [-3, 60, 0, 68], right: [45, 108, 0, 68] };
  let uid = 0;
  FM.knowledgePitch = function (s) {
    const win = s.window || VIEWS[s.view || 'attack'] || VIEWS.attack, id = 'kpm' + (++uid);
    const x0 = win[0], x1 = win[1], y0 = win[2], y1 = win[3];
    const sc = Math.min(560 / (x1 - x0), 340 / (y1 - y0)), pad = 10, W = (x1 - x0) * sc + pad * 2, H = (y1 - y0) * sc + pad * 2;
    const X = (v) => pad + (v - x0) * sc, Y = (v) => pad + (y1 - v) * sc, R = (m) => m * sc;
    let g = '<defs><clipPath id="' + id + '"><rect x="' + pad + '" y="' + pad + '" width="' + (W - 2 * pad) + '" height="' + (H - 2 * pad) + '"/></clipPath></defs>';
    g += '<rect x="0" y="0" width="' + W + '" height="' + H + '" rx="6" fill="' + C.grass + '"/>';
    g += '<g clip-path="url(#' + id + ')">';
    for (let i = 0; i < 21; i++) { if (i % 2) g += '<rect x="' + X(i * 5.25) + '" y="' + Y(y1) + '" width="' + R(5.25) + '" height="' + R(y1 - y0) + '" fill="' + C.grass2 + '"/>'; }
    const ln = 'fill="none" stroke="' + C.line + '" stroke-width="1.5"';
    g += '<rect x="' + X(0) + '" y="' + Y(68) + '" width="' + R(105) + '" height="' + R(68) + '" ' + ln + '/><line x1="' + X(52.5) + '" y1="' + Y(0) + '" x2="' + X(52.5) + '" y2="' + Y(68) + '" stroke="' + C.line + '" stroke-width="1.5"/>';
    g += '<circle cx="' + X(52.5) + '" cy="' + Y(34) + '" r="' + R(9.15) + '" ' + ln + '/>';
    [0, 1].forEach((e) => {
      const bx = e ? 105 : 0, sg = e ? -1 : 1, ex = (d) => X(bx + sg * d);
      g += '<rect x="' + Math.min(ex(0), ex(16.5)) + '" y="' + Y(54.16) + '" width="' + R(16.5) + '" height="' + R(40.32) + '" ' + ln + '/>';
      g += '<rect x="' + Math.min(ex(0), ex(5.5)) + '" y="' + Y(43.16) + '" width="' + R(5.5) + '" height="' + R(18.32) + '" ' + ln + '/>';
      g += '<rect x="' + Math.min(ex(0), ex(-2)) + '" y="' + Y(37.66) + '" width="' + R(2) + '" height="' + R(7.32) + '" fill="rgba(255,255,255,.35)" stroke="' + C.line + '"/>';
      g += '<circle cx="' + ex(11) + '" cy="' + Y(34) + '" r="2" fill="' + C.line + '"/>';
    });
    (s.zones || []).forEach((z) => {
      g += '<rect x="' + X(z.x) + '" y="' + Y(z.y + z.h) + '" width="' + R(z.w) + '" height="' + R(z.h) + '" fill="' + (z.fill || 'rgba(222,184,98,.22)') + '" stroke="' + (z.stroke || 'rgba(222,184,98,.8)') + '" stroke-dasharray="4 3"/>';
      if (z.label) g += '<text x="' + X(z.x + z.w / 2) + '" y="' + (Y(z.y + z.h / 2) + 4) + '" text-anchor="middle" fill="' + C.text + '" font-size="11" font-weight="700">' + esc(z.label) + '</text>';
    });
    (s.rings || []).forEach((r) => {
      g += '<circle cx="' + X(r.x) + '" cy="' + Y(r.y) + '" r="' + R(r.r) + '" fill="' + (r.fill || 'none') + '" stroke="' + (r.color || C.gold) + '" stroke-width="1.8" stroke-dasharray="5 4"/>';
      if (r.label) g += '<text x="' + X(r.x) + '" y="' + (Y(r.y) - R(r.r) - 4) + '" text-anchor="middle" fill="' + (r.color || C.gold) + '" font-size="11" font-weight="700">' + esc(r.label) + '</text>';
    });
    const halo = ' stroke="' + C.grass + '" stroke-width="3" paint-order="stroke"';
    (s.lines || []).forEach((l) => {
      g += '<line x1="' + X(l.p1[0]) + '" y1="' + Y(l.p1[1]) + '" x2="' + X(l.p2[0]) + '" y2="' + Y(l.p2[1]) + '" stroke="' + (l.color || C.gold) + '" stroke-width="' + (l.width || 2) + '"' + (l.dash ? ' stroke-dasharray="' + l.dash + '"' : '') + '/>';
      if (l.label) g += '<text x="' + ((X(l.p1[0]) + X(l.p2[0])) / 2 + (l.dx || 0)) + '" y="' + ((Y(l.p1[1]) + Y(l.p2[1])) / 2 + (l.dy == null ? -6 : l.dy)) + '" text-anchor="middle" fill="' + (l.color || C.gold) + '" font-size="12" font-weight="700"' + halo + '>' + esc(l.label) + '</text>';
    });
    g += '</g>';
    (s.arrows || []).forEach((a) => {
      const col = a.color || C.gold, ax = X(a.from[0]), ay = Y(a.from[1]), bx = X(a.to[0]), by = Y(a.to[1]), ang = Math.atan2(by - ay, bx - ax), hd = 9;
      g += '<line x1="' + ax + '" y1="' + ay + '" x2="' + (bx - Math.cos(ang) * 6) + '" y2="' + (by - Math.sin(ang) * 6) + '" stroke="' + col + '" stroke-width="2.4"' + (a.dash ? ' stroke-dasharray="' + a.dash + '"' : '') + '/>';
      g += '<polygon points="' + bx + ',' + by + ' ' + (bx - hd * Math.cos(ang - .4)) + ',' + (by - hd * Math.sin(ang - .4)) + ' ' + (bx - hd * Math.cos(ang + .4)) + ',' + (by - hd * Math.sin(ang + .4)) + '" fill="' + col + '"/>';
      if (a.label) g += '<text x="' + ((ax + bx) / 2 + (a.dx || 0)) + '" y="' + ((ay + by) / 2 + (a.dy == null ? -7 : a.dy)) + '" text-anchor="middle" fill="' + col + '" font-size="12" font-weight="700"' + halo + '>' + esc(a.label) + '</text>';
    });
    (s.players || []).forEach((p) => {
      const col = p.team === 'them' ? C.them : C.us;
      g += '<circle cx="' + X(p.x) + '" cy="' + Y(p.y) + '" r="9" fill="' + (p.ghost ? 'none' : col) + '" stroke="' + (p.ghost ? col : '#0e1612') + '" stroke-width="1.8"' + (p.ghost ? ' stroke-dasharray="3 3"' : '') + '/>';
      if (p.label != null) g += '<text x="' + X(p.x) + '" y="' + (Y(p.y) + 4) + '" text-anchor="middle" fill="' + (p.ghost ? col : '#0e1612') + '" font-size="10.5" font-weight="800">' + esc(p.label) + '</text>';
      if (p.ball) g += '<circle cx="' + (X(p.x) + 10) + '" cy="' + (Y(p.y) + 9) + '" r="4.5" fill="#fff" stroke="#0e1612" stroke-width="1.4"/>';
    });
    (s.texts || []).forEach((t) => { g += '<text x="' + X(t.x) + '" y="' + Y(t.y) + '" fill="' + (t.color || C.text) + '" font-size="12" font-weight="700" text-anchor="' + (t.anchor || 'start') + '"' + halo + '>' + esc(t.t) + '</text>'; });
    return '<figure class="kn-fig"><svg viewBox="0 0 ' + W.toFixed(0) + ' ' + H.toFixed(0) + '" role="img" aria-label="' + esc(s.caption || 'Pitch diagram') + '" xmlns="http://www.w3.org/2000/svg">' + g + '</svg>' + (s.caption ? '<figcaption>' + esc(s.caption) + '</figcaption>' : '') + '</figure>';
  };
})();
