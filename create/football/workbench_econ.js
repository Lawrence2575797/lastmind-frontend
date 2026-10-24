// Economics diagrams for the Workbook chat, drawn the way the Notes "Economics diagram" tool draws them.
// The agent never draws anything itself: it names one of the diagrams below and this file places the tool's own curves (the same shapes, the same board of 640 by 440
// with the price axis at x 70 and the quantity axis at y 380), so the picture in the chat is the one the student gets in their notes. "Add to notes" sends the same
// curves to the notebook as a real diagram the student can move, rename and extend.
// The curve shapes are copied from learn/index.html (DIAGRAM_CURVE_SHAPES): if a shape changes there it must change here.
(function () {
  const FM = (window.FM = window.FM || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SHAPES = {
    demand: [{ x: 0, y: 0 }, { x: 130, y: 80 }, { x: 260, y: 160 }],
    supply: [{ x: 0, y: 160 }, { x: 130, y: 80 }, { x: 260, y: 0 }],
    generic_price_line: [{ x: 0, y: 0 }, { x: 260, y: 0 }],
    marginal_revenue: [{ x: 0, y: 0 }, { x: 65, y: 80 }, { x: 130, y: 160 }],
    marginal_cost: [{ x: 0, y: 40 }, { x: 25, y: 57 }, { x: 50, y: 69 }, { x: 75, y: 76 }, { x: 100, y: 78 }, { x: 130, y: 75 }, { x: 170, y: 64 }, { x: 200, y: 49 }, { x: 230, y: 30 }, { x: 260, y: 5 }],
    average_cost: [{ x: 0, y: 15 }, { x: 30, y: 31 }, { x: 60, y: 43 }, { x: 90, y: 53 }, { x: 120, y: 60 }, { x: 150, y: 63 }, { x: 170, y: 64 }, { x: 200, y: 62 }, { x: 230, y: 58 }, { x: 260, y: 50 }],
    average_fixed_cost: [{ x: 18, y: 14 }, { x: 24, y: 64 }, { x: 30, y: 94 }, { x: 38, y: 119 }, { x: 48, y: 139 }, { x: 60, y: 154 }, { x: 75, y: 166 }, { x: 95, y: 176 }, { x: 120, y: 184 }, { x: 155, y: 191 }, { x: 200, y: 196 }, { x: 260, y: 200 }],
    average_variable_cost: [{ x: 0, y: 10 }, { x: 25, y: 42 }, { x: 55, y: 62 }, { x: 90, y: 74 }, { x: 125, y: 78 }, { x: 160, y: 74 }, { x: 195, y: 62 }, { x: 230, y: 40 }, { x: 260, y: 10 }],
  };
  const NAMES = { demand: 'D', supply: 'S', generic_price_line: 'Price', marginal_revenue: 'MR', marginal_cost: 'MC', average_cost: 'AC', average_fixed_cost: 'AFC', average_variable_cost: 'AVC' };
  const AXIS_P = [{ x: 70, y: 20 }, { x: 70, y: 390 }], AXIS_Q = [{ x: 60, y: 380 }, { x: 620, y: 380 }], W = 640, H = 440, OX = 70, OY = 380;
  let seq = 0;
  const id = () => 'e' + (seq++).toString(36) + Math.random().toString(36).slice(2, 6);

  const localOf = (inst) => (inst.points && inst.points.length > 1 ? inst.points : SHAPES[inst.curveTypeId]);
  function polyOf(inst) {
    const local = localOf(inst), o = local[0], sx = inst.scaleX || 1, sy = inst.scaleY || 1;
    return local.map((p) => ({ x: o.x + (p.x - o.x) * sx + inst.x, y: o.y + (p.y - o.y) * sy + inst.y }));
  }
  // the y (on the board) of a polyline at a given x: the first crossing, going left to right
  function yAt(poly, x) {
    for (let i = 1; i < poly.length; i++) { const a = poly[i - 1], b = poly[i]; if ((a.x <= x && x <= b.x) || (b.x <= x && x <= a.x)) { if (a.x === b.x) return a.y; return a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x); } }
    return null;
  }
  const put = (type, x, y, o) => Object.assign({ instanceId: id(), curveTypeId: type, x, y, scaleX: 1, scaleY: 1 }, o || {});
  const vline = (x, y1, y2) => [{ x, y: y1 }, { x, y: y2 }];

  // ---------- the diagrams ----------
  const BUILD = {
    // a downward-sloping demand and an upward-sloping supply
    supply_demand() {
      return { placed: [put('demand', 110, 70), put('supply', 110, 150)], labels: [], shades: [], guides: [] };
    },
    // a monopoly (or a cartel acting as one): output where MR = MC, price read from AR, profit as a rectangle
    monopoly() {
      const ar = put('demand', 90, 36, { label: 'AR', scaleX: 1.35, scaleY: 1.45 }), mr = put('marginal_revenue', 90, 36, { scaleX: 1.35, scaleY: 1.45 });
      const qx = 205, mrY = yAt(polyOf(mr), qx), arY = yAt(polyOf(ar), qx);
      // the costs share one placement, so MC cuts AC at AC's lowest point; the pair is lifted until MC meets MR at qx
      const mc = put('marginal_cost', 100, 0, { scaleX: 0.95, scaleY: 1.3 }), ac = put('average_cost', 100, 0, { scaleX: 0.95, scaleY: 1.3 });
      mc.y = ac.y = mrY - yAt(polyOf(mc), qx);
      const acY = yAt(polyOf(ac), qx);
      return {
        placed: [ar, mr, mc, ac],
        labels: [{ text: 'Q*', x: qx - 8, y: OY + 18 }, { text: 'P*', x: OX - 26, y: arY + 4 }, { text: 'Output where MR = MC', x: 330, y: 70 }],
        shades: [{ points: [{ x: OX, y: arY }, { x: qx, y: arY }, { x: qx, y: acY }, { x: OX, y: acY }], label: 'Supernormal profit', vertexLabels: [], color: 'rgba(104,211,145,0.34)' }],
        guides: [vline(qx, arY, OY), [{ x: OX, y: arY }, { x: qx, y: arY }]],
      };
    },
    // one firm in perfect competition: price taken from the market, output where MC meets the price line
    perfect_competition() {
      const ac = put('average_cost', 110, 120, { scaleX: 1.05, scaleY: 1.5 }), mc = put('marginal_cost', 110, 120, { scaleX: 1.05, scaleY: 1.5 });
      const acPoly = polyOf(ac), mcPoly = polyOf(mc);
      const minY = Math.max.apply(null, acPoly.map((p) => p.y)), pY = minY - 38;   // the price sits above the lowest point of AC: supernormal profit in the short run
      const price = put('generic_price_line', OX + 8, pY, { label: 'AR = MR = P', scaleX: 2 });
      let qx = null; for (let x = 200; x < 420; x += 0.5) { const m = yAt(mcPoly, x); if (m != null && m <= pY) { qx = x; break; } }
      qx = qx || 330; const acY = yAt(acPoly, qx);
      return {
        placed: [ac, mc, price],
        labels: [{ text: 'Q*', x: qx - 8, y: OY + 18 }, { text: 'P', x: OX - 22, y: pY + 4 }, { text: 'Output where MC = MR', x: 330, y: 58 }],
        shades: acY ? [{ points: [{ x: OX, y: pY }, { x: qx, y: pY }, { x: qx, y: acY }, { x: OX, y: acY }], label: 'Supernormal profit', vertexLabels: [], color: 'rgba(104,211,145,0.34)' }] : [],
        guides: [vline(qx, pY, OY)],
      };
    },
    // non-collusive oligopoly: the kinked demand curve. Above the kink demand is elastic (rivals will not follow a price rise), below it inelastic (rivals will match a cut),
    // so MR has a gap, and a cost change inside that gap leaves price and output where they were.
    kinked_demand() {
      const kx = 250, ky = 150;
      const ar = put('custom', 0, 0, { label: 'D = AR', points: [{ x: 70, y: 84 }, { x: kx, y: ky }, { x: 390, y: 290 }] });
      const mr = put('custom', 0, 0, { label: 'MR', points: [{ x: 70, y: 84 }, { x: kx, y: 216 }, { x: kx, y: 330 }, { x: 276, y: 376 }] });
      const mc1 = put('marginal_cost', 105, 0, { scaleX: 0.85, scaleY: 1.2, label: 'MC_1' }), mc2 = put('marginal_cost', 105, 0, { scaleX: 0.85, scaleY: 1.2, label: 'MC_2' });
      mc1.y = 288 - yAt(polyOf(mc1), kx); mc2.y = 252 - yAt(polyOf(mc2), kx);
      return {
        placed: [ar, mr, mc1, mc2],
        labels: [{ text: 'Q*', x: kx - 8, y: OY + 18 }, { text: 'P*', x: OX - 26, y: ky + 4 }, { text: 'Kink', x: kx + 10, y: ky - 10 }, { text: 'Elastic above the kink: rivals will not follow a rise', x: 100, y: 52 }, { text: 'Inelastic below it: rivals will match a cut', x: 300, y: 352 }, { text: 'Gap in MR', x: kx - 74, y: 330 }],
        shades: [],
        guides: [vline(kx, ky, OY), [{ x: OX, y: ky }, { x: kx, y: ky }]],
      };
    },
    // the four cost curves of a firm
    costs() {
      return { placed: [put('average_cost', 110, 116, { scaleX: 0.85 }), put('marginal_cost', 110, 116, { scaleX: 0.85 }), put('average_variable_cost', 110, 196, { scaleX: 0.85 }), put('average_fixed_cost', 100, 120, { scaleX: 0.85, scaleY: 0.8 })], labels: [], shades: [], guides: [] };
    },
  };
  const LIST = Object.keys(BUILD);

  // ---------- the notebook's own diagram state, so "Add to notes" gives the student a real diagram ----------
  function state(name) {
    if (!BUILD[name]) return null;
    const d = BUILD[name]();
    return { curves: d.placed.map((p) => Object.assign({}, p)), shades: d.shades, labels: d.labels.map((l) => ({ text: l.text, x: l.x, y: l.y })), arrows: [], axisText: {} };
  }

  // ---------- the same board, drawn here for the chat ----------
  const tagPos = (poly, text) => {
    const first = poly[0], last = poly[poly.length - 1], atLast = last.x >= first.x, end = atLast ? last : first;
    let back = end, walked = 0;
    for (let i = atLast ? poly.length - 2 : 1; atLast ? i >= 0 : i < poly.length; i += atLast ? -1 : 1) { const q = poly[i]; walked += Math.hypot(back.x - q.x, back.y - q.y); back = q; if (walked >= 18) break; }
    if (end.y - back.y > 3) { const w = String(text).length * 12 * 0.62; return end.x + 10 + w <= W - 4 ? { x: end.x + 10, y: end.y + 4, a: 'start' } : { x: end.x - 4, y: end.y + 22, a: 'end' }; }
    return { x: end.x - 4, y: end.y - 8, a: 'end' };
  };
  // _ gives a subscript in a name (MC_1)
  const rich = (t) => esc(t).replace(/_([A-Za-z0-9]+)/g, '<tspan dy="4" font-size="9">$1</tspan>');
  function svg(name, o) {
    if (!BUILD[name]) return '';
    const d = BUILD[name](), COL = ['#E6D7B0', '#7FD6FF', '#FFD54A', '#8FE3A3', '#F2A0A0', '#C9A7F2'];
    let s = '';
    d.shades.forEach((sh) => { s += '<polygon points="' + sh.points.map((p) => p.x + ',' + p.y).join(' ') + '" fill="' + sh.color + '"/>'; });
    s += '<line x1="' + AXIS_P[0].x + '" y1="' + AXIS_P[0].y + '" x2="' + AXIS_P[1].x + '" y2="' + AXIS_P[1].y + '" class="ec-axis"/><line x1="' + AXIS_Q[0].x + '" y1="' + AXIS_Q[0].y + '" x2="' + AXIS_Q[1].x + '" y2="' + AXIS_Q[1].y + '" class="ec-axis"/>';
    s += '<text x="' + (OX - 16) + '" y="' + (AXIS_P[0].y - 4) + '" text-anchor="end" class="ec-ax">' + esc((o && o.yLabel) || 'P') + '</text><text x="' + (AXIS_Q[1].x + 6) + '" y="' + (OY + 16) + '" class="ec-ax">' + esc((o && o.xLabel) || 'Q') + '</text>';
    d.guides.forEach((g) => { s += '<polyline points="' + g.map((p) => p.x + ',' + p.y).join(' ') + '" class="ec-guide"/>'; });
    d.placed.forEach((inst, n) => {
      const poly = polyOf(inst), label = inst.label || NAMES[inst.curveTypeId] || '', col = COL[n % COL.length];
      s += '<polyline points="' + poly.map((p) => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ') + '" class="ec-curve" stroke="' + col + '"/>';
      const t = tagPos(poly, label); s += '<text x="' + t.x.toFixed(1) + '" y="' + t.y.toFixed(1) + '" text-anchor="' + t.a + '" class="ec-tag" fill="' + col + '">' + rich(label) + '</text>';
    });
    d.labels.forEach((l) => { s += '<text x="' + l.x + '" y="' + l.y + '" class="ec-lab">' + esc(l.text) + '</text>'; });
    // the board is cropped to what is on it, as the tool does, so the curves are not left small in a corner
    let maxX = OX + 120, minY = AXIS_P[0].y;
    d.placed.forEach((inst) => polyOf(inst).forEach((p) => { maxX = Math.max(maxX, p.x); }));
    d.labels.forEach((l) => { maxX = Math.max(maxX, l.x + l.text.length * 7.2); });
    const vw = Math.min(W, Math.round(maxX + 50)), vh = OY + 34;
    return '<svg class="lw-plot lw-econ" viewBox="0 0 ' + vw + ' ' + vh + '" role="img" aria-label="Economics diagram">' + s + '</svg>';
  }

  FM.econ = { LIST, state, svg, polyOf, SHAPES };
})();
