/* Eight Rings: a GCSE circle theorems game. */
(function () {
'use strict';
const $ = (s) => document.querySelector(s);
const D2R = Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;

/* ================= geometry (circle radius 1, centre O) ================= */
const P = (deg) => [Math.cos(deg * D2R), Math.sin(deg * D2R)];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const len = (a) => Math.hypot(a[0], a[1]);
const unit = (a) => mul(a, 1 / (len(a) || 1));
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const rot = (a, d) => { const c = Math.cos(d * D2R), s = Math.sin(d * D2R); return [a[0] * c - a[1] * s, a[0] * s + a[1] * c]; };
const angleAt = (v, a, b) => { const p = sub(a, v), q = sub(b, v); return Math.acos(clamp((p[0] * q[0] + p[1] * q[1]) / (len(p) * len(q) || 1), -1, 1)) / D2R; };
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const even = (a, b) => 2 * ri(Math.ceil(a / 2), Math.floor(b / 2));

/* Where does a corner end up if the angle there is cut as x degrees? It slides along its own spoke from the centre
   until the angle (p, corner, q) really is x. Only the true angle leaves it exactly on the ring. */
function onSpoke(v, p, q, x) {
  const u = unit(v), truth = angleAt(v, p, q), d = sub(q, p), den = cross(u, d);
  let lo = 0.03; if (Math.abs(den) > 1e-6) { const r = cross(p, d) / den, s = cross(p, u) / den; if (r > 0 && r < 1 && s >= -0.01 && s <= 1.01) lo = r + 0.004; }
  const f = (r) => angleAt(mul(u, r), p, q) - x;
  let best = null, prev = f(lo);
  for (let r = lo + 0.004; r <= 2.4; r += 0.004) { const now = f(r); if (prev === 0 || prev * now <= 0) { let a = r - 0.004, b = r; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (f(a) * f(m) <= 0) b = m; else a = m; } const root = (a + b) / 2; if (best === null || Math.abs(root - 1) < Math.abs(best - 1)) best = root; } prev = now; }
  if (best === null) best = x < truth ? 1.5 : 0.45;
  return mul(u, best);
}
/* The corner is where the side cut at x degrees (at vertex a, measured from a→b) meets the line through l0 and the corner. */
function onSide(v, a, b, x, l0) {
  const base = unit(sub(b, a)), turn = cross(base, sub(v, a)) >= 0 ? 1 : -1, d = rot(base, turn * x), e = unit(sub(v, l0)), den = cross(d, e);
  const truth = angleAt(a, b, v), fallback = () => mul(v, x > truth ? 1.45 : 0.55);
  if (Math.abs(den) < 1e-5) return fallback();
  const t = cross(sub(l0, a), e) / den, s = cross(sub(l0, a), d) / den;
  return t > 0 && s > 0 ? add(l0, mul(e, s)) : fallback();
}

/* ================= the eight rings ================= */
const O = [0, 0];
const tangentEnds = (T, k) => { const n = [-T[1], T[0]]; return { U: add(T, mul(n, k)), W: add(T, mul(n, -k)) }; };
const STAGES = [
  { name: 'Angle at the centre', col: 0x27c8ff, rule: 'The angle at the centre is twice the angle at the circumference, when both stand on the same arc.',
    make() { const c = ri(38, 66), pts = { A: P(270 - c), B: P(270 + c), C: P(90 + ri(-22, 22)), O };
      return { pts, poly: ['A', 'O', 'B', 'C'], lines: [], given: [{ v: 'O', a: 'A', b: 'B', deg: 2 * c }], ask: [{ k: 'x', v: 'C', a: 'A', b: 'B', ans: c, move: 'C', cut: (x, p) => onSpoke(p.C, p.A, p.B, x) }] }; } },
  { name: 'Angle in a semicircle', col: 0xff5fa8, rule: 'A triangle drawn on a diameter has a right angle (90°) at the circumference.',
    make() { const g = ri(24, 63), t = ri(-14, 14), pts = { A: P(180 + t), B: P(t), C: P(t + 2 * g), O };
      return { pts, poly: ['A', 'B', 'C'], lines: [], note: 'AB passes through the centre O.', given: [{ v: 'A', a: 'B', b: 'C', deg: g }], ask: [{ k: 'x', v: 'B', a: 'A', b: 'C', ans: 90 - g, move: 'C', cut: (x, p) => onSide(p.C, p.B, p.A, x, p.A) }] }; } },
  { name: 'Angles in the same segment', col: 0xa6ff4d, rule: 'Angles at the circumference standing on the same chord, in the same segment, are equal.',
    make() { const c = ri(34, 58), pts = { A: P(270 - c), B: P(270 + c), C: P(146), D: P(ri(82, 98)), E: P(34) };
      return { pts, poly: ['A', 'B', 'E', 'D', 'C'], lines: [['A', 'D'], ['B', 'D'], ['A', 'C'], ['B', 'C'], ['A', 'E'], ['B', 'E'], ['A', 'B']], given: [{ v: 'D', a: 'A', b: 'B', deg: c }], ask: [{ k: 'x', v: 'C', a: 'A', b: 'B', ans: c, move: 'C', cut: (x, p) => onSpoke(p.C, p.A, p.B, x) }, { k: 'y', v: 'E', a: 'A', b: 'B', ans: c, move: 'E', cut: (x, p) => onSpoke(p.E, p.A, p.B, x) }] }; } },
  { name: 'Cyclic quadrilateral', col: 0xffa531, rule: 'Opposite angles of a cyclic quadrilateral (all four corners on the circle) add up to 180°.',
    make() { const j = () => even(-18, 18), pts = { A: P(212 + j()), B: P(328 + j()), C: P(42 + j()), D: P(134 + j()) };
      const a = Math.round(angleAt(pts.A, pts.D, pts.B)), b = Math.round(angleAt(pts.B, pts.A, pts.C));
      return { pts, poly: ['A', 'B', 'C', 'D'], lines: [], given: [{ v: 'A', a: 'D', b: 'B', deg: a }, { v: 'B', a: 'A', b: 'C', deg: b }], ask: [{ k: 'x', v: 'C', a: 'B', b: 'D', ans: 180 - a, move: 'C', cut: (x, p) => onSpoke(p.C, p.B, p.D, x) }, { k: 'y', v: 'D', a: 'C', b: 'A', ans: 180 - b, move: 'D', cut: (x, p) => onSpoke(p.D, p.C, p.A, x) }] }; } },
  { name: 'Tangent and radius', col: 0xb07bff, rule: 'A tangent meets the radius at the point of contact at 90°.',
    make() { const g = ri(25, 64), T = P(270), pts = { T, A: P(270 + 2 * g), O, ...tangentEnds(T, 1.15) };
      return { pts, poly: ['O', 'T', 'A'], lines: [], guides: [['W', 'U']], note: 'The straight line through T is a tangent.', given: [{ v: 'T', a: 'U', b: 'A', deg: g }], ask: [{ k: 'x', v: 'T', a: 'O', b: 'A', ans: 90 - g, move: 'A', cut: (x, p) => onSide(p.A, p.T, p.O, x, p.O) }] }; } },
  { name: 'Two tangents from a point', col: 0xff6247, rule: 'Two tangents drawn from the same point are equal in length. (Each also meets its radius at 90°.)',
    make() { const g = even(80, 100), h = (180 - g) / 2, f = 40, pts = { A: P(f + h), B: P(f - h), O, P: mul(P(f), 1 / Math.cos(h * D2R)) };
      return { pts, poly: ['O', 'B', 'A'], lines: [], guides: [['P', 'A'], ['P', 'B']], note: 'PA and PB are tangents.', given: [{ v: 'P', a: 'A', b: 'B', deg: g }], ask: [{ k: 'x', v: 'A', a: 'O', b: 'B', ans: g / 2, move: 'B', cut: (x, p) => onSide(p.B, p.A, p.O, x, p.O) }] }; } },
  { name: 'Alternate segment', col: 0x35ffd0, rule: 'The angle between a tangent and a chord equals the angle in the opposite (alternate) segment.',
    make() { const g = ri(42, 68), h = ri(42, 68), T = P(270), pts = { T, A: P(270 + 2 * g), B: P(270 - 2 * h), ...tangentEnds(T, 1.2) };
      return { pts, poly: ['T', 'A', 'B'], lines: [], guides: [['W', 'U']], note: 'The straight line through T is a tangent.', given: [{ v: 'T', a: 'U', b: 'A', deg: g }, { v: 'T', a: 'B', b: 'W', deg: h }], ask: [{ k: 'x', v: 'B', a: 'T', b: 'A', ans: g, move: 'B', cut: (x, p) => onSpoke(p.B, p.T, p.A, x) }, { k: 'y', v: 'A', a: 'T', b: 'B', ans: h, move: 'A', cut: (x, p) => onSpoke(p.A, p.T, p.B, x) }] }; } },
  { name: 'Centre to chord', col: 0xffe14a, rule: 'A line from the centre that meets a chord at 90° cuts the chord exactly in half.',
    make() { const g = ri(34, 64), pts = { A: P(270 - g), B: P(270 + g), M: [0, -Math.cos(g * D2R)], O };
      return { pts, poly: ['O', 'A', 'M', 'B'], lines: [['O', 'M']], right: { v: 'M', a: 'O', b: 'B' }, note: 'OM meets the chord AB at 90°.', given: [{ v: 'O', a: 'A', b: 'M', deg: g }], ask: [{ k: 'x', v: 'B', a: 'O', b: 'M', ans: 90 - g, move: 'B', cut: (x, p) => { const h = -p.M[1], to = [clamp(h / Math.tan(clamp(x, 8, 89) * D2R), 0.12, 1.5), p.M[1]]; return to; } }] }; } }
];

/* ---------- why: written for the numbers on screen, with the parts to mark on the shape. tone g = green, p = pink ---------- */
const val = (q, i) => q.given[i].deg;
const WHY = [
  (q) => { const g = val(q, 0), x = q.ask[0].ans; return { hint: 'Angle AOB at the centre and angle x at the edge both stand on the same arc, AB (lit up).', hi: [['arc', 'A', 'B', 'C']], tones: { g0: 'g', x: 'g' },
    steps: ['Angle AOB and angle x both stand on arc AB.', 'The angle at the centre is twice the angle at the circumference.', 'x = ' + g + '° ÷ 2 = ' + x + '°'] }; },
  (q) => { const g = val(q, 0), x = q.ask[0].ans; return { hint: 'AB goes through the centre O. Think about what that makes the angle at C.', hi: [['seg', 'A', 'B', 'g']], tones: {},
    after: [['right', 'C', 'A', 'B']], steps: ['AB is a diameter, so angle ACB, in the semicircle, is 90°.', 'The three angles in triangle ABC add to 180°.', 'x = 180° − 90° − ' + g + '° = ' + x + '°'] }; },
  (q) => { const c = val(q, 0); return { hint: 'The angles at C, D and E all stand on the same chord AB (lit up), from the same side of it.', hi: [['seg', 'A', 'B', 'g']], tones: { g0: 'g', x: 'g', y: 'g' },
    steps: ['The ' + c + '° angle at D, x at C and y at E all stand on chord AB.', 'Angles in the same segment are equal.', 'x = ' + c + '° and y = ' + c + '°'] }; },
  (q) => { const a = val(q, 0), b = val(q, 1); return { hint: 'All four corners are on the circle. Look at which angles sit opposite each other (matching colours).', hi: [], tones: { g0: 'g', x: 'g', g1: 'p', y: 'p' },
    steps: ['All four corners are on the circle, so ABCD is a cyclic quadrilateral. Opposite angles add to 180°.', 'x is opposite the ' + a + '° angle: x = 180° − ' + a + '° = ' + (180 - a) + '°', 'y is opposite the ' + b + '° angle: y = 180° − ' + b + '° = ' + (180 - b) + '°'] }; },
  (q) => { const g = val(q, 0), x = q.ask[0].ans; return { hint: 'OT is a radius (lit up) and it meets the tangent at T. What is the whole angle between them?', hi: [['seg', 'O', 'T', 'g']], tones: { g0: 'p' },
    after: [['right', 'T', 'O', 'W']], steps: ['Radius OT meets the tangent at T, so the angle between them is 90°.', 'On the right of OT, that 90° is split into x and the ' + g + '° angle.', 'x = 90° − ' + g + '° = ' + x + '°'] }; },
  (q) => { const g = val(q, 0), h = (180 - g) / 2, x = q.ask[0].ans; return { hint: 'PA and PB are tangents from the same point, so compare their lengths. Then think about radius OA.', hi: [['tick', 'P', 'A', 1], ['tick', 'P', 'B', 1], ['seg', 'O', 'A', 'g']], tones: {},
    after: [['ang', 'A', 'P', 'B', h + '°', 'p'], ['right', 'A', 'O', 'P']], steps: ['Tangents from P are equal, so PAB is isosceles: angle PAB = (180° − ' + g + '°) ÷ 2 = ' + h + '°', 'Radius OA meets tangent PA at 90°.', 'x = 90° − ' + h + '° = ' + x + '°'] }; },
  (q) => { const g = val(q, 0), h = val(q, 1); return { hint: 'Each angle between the tangent and a chord has a partner on the far side of that chord (matching colours).', hi: [['seg', 'T', 'A', 'g'], ['seg', 'T', 'B', 'p']], tones: { g0: 'g', x: 'g', g1: 'p', y: 'p' },
    steps: ['The ' + g + '° angle is between the tangent and chord TA. Its partner in the alternate segment is at B.', 'So x = ' + g + '°', 'The ' + h + '° angle is between the tangent and chord TB. Its partner is at A, so y = ' + h + '°'] }; },
  (q) => { const g = val(q, 0), x = q.ask[0].ans; return { hint: 'OM meets the chord at 90°. What does that do to the chord, and so to the two small triangles?', hi: [['tick', 'A', 'M', 1], ['tick', 'M', 'B', 1], ['tick', 'O', 'A', 2], ['tick', 'O', 'B', 2]], tones: { g0: 'p' },
    after: [['ang', 'O', 'M', 'B', g + '°', 'p']], steps: ['OM is at 90° to AB, so it cuts the chord in half: AM = MB.', 'OA = OB (radii), so the two triangles are identical and angle MOB = ' + g + '°', 'In triangle OMB: x = 180° − 90° − ' + g + '° = ' + x + '°'] }; }
];

const HELP = [
  (q) => ['Angle AOB (' + val(q, 0) + '°) and angle x stand on the same arc, AB, which is lit up.', 'One is at the centre and one is at the circumference. Which is bigger, and how many times bigger?'],
  (q) => ['AB goes through the centre, so it is a diameter. What does that make angle ACB, the angle in the semicircle?', 'You know angle CAB is ' + val(q, 0) + '°. What do the three angles of triangle ABC add up to?'],
  (q) => ['The ' + val(q, 0) + '° angle at D, x at C and y at E all stand on chord AB, from the same side of it.', 'What is true about angles in the same segment?'],
  (q) => ['All four corners are on the circle, so ABCD is a cyclic quadrilateral.', 'x is opposite the ' + val(q, 0) + '° angle, and y is opposite the ' + val(q, 1) + '° angle (matching colours). What does each opposite pair add up to?'],
  (q) => ['OT is a radius and the straight line through T is a tangent. What angle do they make where they meet?', 'On the right of OT, that whole angle is split into x and the ' + val(q, 0) + '° angle.'],
  (q) => ['PA and PB are tangents from the same point, so they are equal. The angle at P is ' + val(q, 0) + '°, so what is angle PAB in that isosceles triangle?', 'Radius OA meets tangent PA at 90°, and x is the rest of that right angle.'],
  (q) => ['The ' + val(q, 0) + '° angle is between the tangent and chord TA (green). Which angle faces that chord from the other segment?', 'Now do the same for the ' + val(q, 1) + '° angle and chord TB (pink).'],
  (q) => ['OM meets chord AB at 90°. What does that do to AB, and how do triangles OAM and OBM compare?', 'Use that to find angle MOB from the ' + val(q, 0) + '° angle, then add up the angles in triangle OMB.']
];

/* the shape you actually cut: every unknown corner goes where your angle puts it */
function cutShape(q, values) {
  const pts = Object.assign({}, q.pts), wrong = [];
  q.ask.forEach((a, i) => {
    if (values[i] === a.ans) return;
    let to = a.cut(values[i], q.pts); const from = q.pts[a.move];
    let r = clamp(len(to), 0.4, 1.5); to = mul(unit(to), r);
    if (a.move === 'B' && q.pts.M) to = [clamp(to[0], 0.12, 1.4), q.pts.M[1]];
    // even a one-degree mistake has to be visible
    const off = len(to) - 1; if (Math.abs(off) < 0.075) { const dir = off !== 0 ? Math.sign(off) : (values[i] < a.ans ? 1 : -1); to = q.pts.M && a.move === 'B' ? [from[0] + dir * 0.12, from[1]] : mul(unit(to), 1 + dir * 0.075); }
    pts[a.move] = to; wrong.push({ name: a.move, k: a.k, out: len(to) > 1 });
  });
  return { pts, wrong };
}

/* ================= three.js room ================= */
const glc = $('#gl'), over = $('#over'), ox = over.getContext('2d');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: true }); }
catch (e) { $('#app').innerHTML = '<p id="nogl">This game needs 3D graphics, which this browser could not start. Try an up-to-date Chrome, Edge, Safari or Firefox.<br><a href="/learn/" style="color:#ffd45a">Back to LastMind</a></p>'; return; }
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x04050b); scene.fog = new THREE.FogExp2(0x04050b, 0.024);
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 300);
const GAP = 17, N = STAGES.length, ringZ = (i) => -i * GAP;

scene.add(new THREE.HemisphereLight(0x7788cc, 0x0a0c16, 0.8));
const key = new THREE.DirectionalLight(0xffffff, 0.75); key.position.set(3, 5, 4); scene.add(key);
const follow = new THREE.PointLight(0xffffff, 1.1, 11, 2); scene.add(follow);
const ringLight = new THREE.PointLight(0xffffff, 0.6, 14, 2); scene.add(ringLight);

(function room() {
  const L = GAP * (N + 2), mid = -GAP * (N - 1) / 2;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(26, L + 30), new THREE.MeshStandardMaterial({ color: 0x121628, roughness: 0.42, metalness: 0.45 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, -2.15, mid); scene.add(floor);
  const grid = []; for (let x = -12; x <= 12; x += 2) grid.push(x, -2.14, 20, x, -2.14, mid - L / 2 - 10); for (let z = 20; z >= mid - L / 2 - 10; z -= 2) grid.push(-12, -2.14, z, 12, -2.14, z);
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(grid, 3));
  scene.add(new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: 0x2a3466, transparent: true, opacity: 0.35 })));
  const wm = new THREE.MeshStandardMaterial({ color: 0x0d1122, roughness: 0.9, metalness: 0.2 });
  [-9, 9].forEach((x) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(L + 30, 12), wm); w.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; w.position.set(x, 3.8, mid); scene.add(w);
    for (let z = 10; z > mid - L / 2; z -= GAP / 2) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.05, 6.5, 0.07), new THREE.MeshBasicMaterial({ color: 0x26337a })); s.position.set(x * 0.99, 0.9, z + 4); scene.add(s); } });
  [-2.6, 2.6].forEach((x) => { const s = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.02, L + 20), new THREE.MeshBasicMaterial({ color: 0x3546a8 })); s.position.set(x, -2.12, mid); scene.add(s); });
})();
const dust = (function () { const n = 900, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = (Math.random() - 0.5) * 16; a[i * 3 + 1] = Math.random() * 8 - 2; a[i * 3 + 2] = 12 - Math.random() * (GAP * N + 16); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x8fa4ff, size: 0.025, transparent: true, opacity: 0.5 })); scene.add(p); return p; })();
const glowTex = (function () { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();

const rings = STAGES.map((st, i) => {
  const g = new THREE.Group(); g.position.z = ringZ(i);
  const metal = new THREE.Mesh(new THREE.TorusGeometry(1.165, 0.095, 24, 160), new THREE.MeshStandardMaterial({ color: 0xb4bedc, metalness: 0.55, roughness: 0.3, emissive: st.col, emissiveIntensity: 0.16 }));
  const lip = new THREE.Mesh(new THREE.TorusGeometry(1.074, 0.01, 8, 160), new THREE.MeshBasicMaterial({ color: st.col, transparent: true, opacity: 0.55 }));
  const halo = new THREE.Mesh(new THREE.RingGeometry(1.262, 1.296, 120), new THREE.MeshBasicMaterial({ color: st.col, transparent: true, opacity: 0.22, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(metal, lip, halo);
  const plate = new THREE.Group(); g.add(plate);
  [-1, 1].forEach((s) => { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.25, 0.18), new THREE.MeshStandardMaterial({ color: 0x23283c, metalness: 0.8, roughness: 0.4 })); leg.position.set(s * 0.72, -1.55, 0); leg.rotation.z = s * -0.2; g.add(leg); });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.3, 0.12, 48), new THREE.MeshStandardMaterial({ color: 0x151929, metalness: 0.75, roughness: 0.45 })); base.position.y = -2.1; g.add(base);
  scene.add(g); return { g, metal, lip, halo, plate, flash: 0, bad: 0, done: false, failed: false };
});

/* the gap is the true shape, a whisker bigger so it just fits */
function widen(poly, by) {
  let area = 0; poly.forEach((p, i) => { area += cross(p, poly[(i + 1) % poly.length]); }); const turn = area > 0 ? 1 : -1;
  return poly.map((p, i) => {
    const a = poly[(i + poly.length - 1) % poly.length], b = poly[(i + 1) % poly.length], e1 = unit(sub(p, a)), e2 = unit(sub(b, p));
    const n1 = [e1[1] * turn, -e1[0] * turn], n2 = [e2[1] * turn, -e2[0] * turn]; let m = mul(add(n1, n2), by / Math.max(0.2, 1 + n1[0] * n2[0] + n1[1] * n2[1]));
    if (len(m) > by * 1.7) m = mul(unit(m), by * 1.7);
    let q = add(p, m); if (len(q) > 1.066) q = mul(unit(q), 1.066); return q;
  });
}
function buildPlate(i, q) {
  const r = rings[i], st = STAGES[i];
  while (r.plate.children.length) { const c = r.plate.children[0]; r.plate.remove(c); if (c.userData.own) c.geometry.dispose(); }
  const gap = widen(q.poly.map((n) => q.pts[n]), 0.038), s = new THREE.Shape(); s.absarc(0, 0, 1.095, 0, Math.PI * 2, false);
  const hole = new THREE.Path(); gap.forEach((p, k) => { if (k) hole.lineTo(p[0], p[1]); else hole.moveTo(p[0], p[1]); }); hole.closePath(); s.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false, curveSegments: 96 }); geo.translate(0, 0, -0.05);
  r.fill = new THREE.MeshStandardMaterial({ color: 0x262d4d, metalness: 0.55, roughness: 0.5, emissive: st.col, emissiveIntensity: 0.05 });
  const m = new THREE.Mesh(geo, r.fill); m.userData.own = true; r.plate.add(m);
  r.rim = new THREE.MeshBasicMaterial({ color: st.col });
  gap.forEach((a, k) => { const b = gap[(k + 1) % gap.length], d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], 0), l = d.length(), e = new THREE.Mesh(cyl, r.rim); e.scale.set(0.008, l, 0.008); e.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0.052); e.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); r.plate.add(e); });
}

/* the travelling shape */
const shape = new THREE.Group(); scene.add(shape);
let shapeCol = new THREE.Color(STAGES[0].col);
const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.5, transparent: true, opacity: 0.86, emissive: 0x000000 });
const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
const sph = new THREE.SphereGeometry(0.034, 16, 12), cyl = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
const DEPTH = 0.14;
let parts = [];
function bar(a, b, r, z, mat) { const m = new THREE.Mesh(cyl, mat), d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], 0), l = d.length(); if (l < 1e-4) return; m.scale.set(r, l, r); m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); shape.add(m); parts.push(m); }
function setShape(outline, lines, corners) {
  parts.forEach((m) => { shape.remove(m); if (m.userData.own) m.geometry.dispose(); }); parts = [];
  const s = new THREE.Shape(); outline.forEach((p, i) => { if (i) s.lineTo(p[0], p[1]); else s.moveTo(p[0], p[1]); }); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: DEPTH, bevelEnabled: false }); g.translate(0, 0, -DEPTH / 2);
  const body = new THREE.Mesh(g, bodyMat); body.userData.own = true; shape.add(body); parts.push(body);
  [DEPTH / 2, -DEPTH / 2].forEach((z) => outline.forEach((p, i) => bar(p, outline[(i + 1) % outline.length], 0.012, z, edgeMat)));
  (lines || []).forEach((l) => bar(l[0], l[1], 0.007, DEPTH / 2 + 0.004, lineMat));
  (corners || []).forEach((p) => { [DEPTH / 2, -DEPTH / 2].forEach((z) => { const m = new THREE.Mesh(sph, edgeMat); m.position.set(p[0], p[1], z); shape.add(m); parts.push(m); }); bar([p[0], p[1]], [p[0] + 1e-4, p[1]], 0.001, 0, edgeMat); });
}
function paint(col) { shapeCol.set(col); bodyMat.color.copy(shapeCol); bodyMat.emissive.copy(shapeCol).multiplyScalar(0.34); follow.color.copy(shapeCol); }
const exact = (q, pts) => setShape(q.poly.map((n) => pts[n]), q.lines.map((l) => [pts[l[0]], pts[l[1]]]), q.poly.map((n) => pts[n]));
/* morphing: both outlines are resampled to the same number of points, starting at the same bearing */
function resample(poly, n) {
  let area = 0; poly.forEach((p, i) => { area += cross(p, poly[(i + 1) % poly.length]); }); const pp = area < 0 ? poly.slice().reverse() : poly;
  const segs = pp.map((p, i) => len(sub(pp[(i + 1) % pp.length], p))), total = segs.reduce((a, b) => a + b, 0), out = [];
  let i = 0, acc = 0; for (let k = 0; k < n; k++) { const d = total * k / n; while (acc + segs[i] < d) { acc += segs[i]; i++; } const f = segs[i] ? (d - acc) / segs[i] : 0, a = pp[i], b = pp[(i + 1) % pp.length]; out.push([lerp(a[0], b[0], f), lerp(a[1], b[1], f)]); }
  let s = 0, best = 1e9; out.forEach((p, j) => { const v = Math.abs(Math.atan2(p[1], p[0]) - Math.PI / 2) + (1.6 - len(p)) * 0.2; if (v < best) { best = v; s = j; } });
  return out.slice(s).concat(out.slice(0, s));
}
function morph(from, to, k) { setShape(from.map((p, i) => [lerp(p[0], to[i][0], k), lerp(p[1], to[i][1], k)]), [], []); }
const outlineOf = (q, pts) => resample(q.poly.map((n) => pts[n]), 90);

/* sparks and shock waves */
const fx = [];
function burst(pos, col, n, speed, size) {
  const a = new Float32Array(n * 3), v = []; for (let i = 0; i < n; i++) { a.set([pos.x, pos.y, pos.z], i * 3); const d = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.35 + Math.random())); v.push(d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3));
  const m = new THREE.PointsMaterial({ color: col, size, map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }); const p = new THREE.Points(g, m); scene.add(p);
  fx.push({ t: 0, life: 1.2, tick(dt) { for (let i = 0; i < n; i++) { v[i].y -= 1.6 * dt; v[i].multiplyScalar(Math.pow(0.35, dt)); a[i * 3] += v[i].x * dt; a[i * 3 + 1] += v[i].y * dt; a[i * 3 + 2] += v[i].z * dt; } g.attributes.position.needsUpdate = true; m.opacity = 1 - this.t / this.life; }, end() { scene.remove(p); g.dispose(); m.dispose(); } });
}
function wave(z, col, delay) {
  const m = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }), g = new THREE.RingGeometry(1.14, 1.2, 120), r = new THREE.Mesh(g, m); r.position.z = z; scene.add(r);
  fx.push({ t: -(delay || 0), life: 0.9, tick() { if (this.t < 0) return; const k = this.t / this.life; r.scale.setScalar(1 + k * 1.7); m.opacity = 0.85 * (1 - k); }, end() { scene.remove(r); g.dispose(); m.dispose(); } });
}

/* ================= sound (made in the browser, nothing to download) ================= */
const Snd = {
  ctx: null, on: true, gone: false,
  init() {
    if (this.ctx) return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try {
      const c = this.ctx = new AC(); this.out = c.createGain(); this.out.gain.value = this.on ? 1 : 0; this.out.connect(c.destination);
      const L = c.sampleRate * 2; this.noise = c.createBuffer(1, L, c.sampleRate); const d = this.noise.getChannelData(0); for (let i = 0; i < L; i++) d[i] = Math.random() * 2 - 1;
      [55, 82.4].forEach((f) => { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; g.gain.value = 0.022; o.connect(g); g.connect(this.out); o.start(); });
      const away = (v) => { this.gone = v; if (this.ctx.state === 'closed') return; const p = v ? this.ctx.suspend() : this.ctx.resume(); if (p && p.catch) p.catch(() => { }); };
      document.addEventListener('visibilitychange', () => away(document.hidden)); addEventListener('pagehide', () => away(true)); addEventListener('pageshow', () => away(document.hidden));
      addEventListener('blur', () => away(true)); addEventListener('focus', () => away(document.hidden)); addEventListener('pointerdown', () => { if (this.gone) away(false); }, true);
    } catch (e) { this.ctx = null; }
  },
  tone(f, dur, vol, type, when) { if (!this.ctx || !this.on) return; const c = this.ctx, t = c.currentTime + (when || 0), o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + 0.05); },
  rush(f0, f1, dur, vol, q) { if (!this.ctx || !this.on) return; const c = this.ctx, t = c.currentTime, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.noise; f.type = 'bandpass'; f.Q.value = q || 1.4; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(this.out); s.start(t); s.stop(t + dur); },
  pass(i) { const base = [261.6, 293.7, 329.6, 392, 440, 523.3, 587.3, 659.3][i]; [1, 1.25, 1.5, 2].forEach((m, k) => this.tone(base * m, 1.8 - k * 0.2, 0.09, 'sine', k * 0.07)); this.tone(base / 4, 0.9, 0.22); },
  clank() { [196, 311, 523, 787].forEach((f, i) => this.tone(f * (1 + Math.random() * 0.02), 0.5 - i * 0.07, 0.07, 'square')); this.rush(2600, 300, 0.25, 0.3, 0.7); },
  buzz() { this.tone(160, 0.35, 0.1, 'sawtooth'); this.tone(120, 0.5, 0.1, 'sawtooth', 0.18); },
  tick() { this.tone(900, 0.05, 0.03, 'triangle'); }
};

/* ================= game flow ================= */
const S = { phase: 'intro', t: 0, i: 0, q: null, cut: null, fitted: STAGES.map(() => false), tries: STAGES.map(() => 0), mine: [], qs: [], hint: false, shake: 0, runZ: 0, passed: -1 };
let W = 1, H = 1;
const cam = { p: new THREE.Vector3(5, 2.4, 11), l: new THREE.Vector3(0, -0.2, -6), f: 46 };
const want = { p: new THREE.Vector3(), l: new THREE.Vector3(), f: 30, k: 3.5 };
function designView(i) {
  const dock = $('#dock'), top = 58, beside = H <= 520 && W >= 600, bottom = beside ? 10 : Math.max(dock.hidden ? 190 : dock.offsetHeight, W <= 600 && Calc.open ? $('#calc').offsetHeight : 0) + 18, room = beside ? W - (dock.offsetWidth || Math.min(340, W * 0.46)) - 24 : W, free = Math.max(120, H - top - bottom), z = ringZ(i) + 0.35, wide = i === 5 ? 1.5 : 1.34;
  const ppu = Math.min(room * 0.5 / wide, free * 0.5 / 1.32), fov = 28, dist = (H / 2) / Math.tan(fov * D2R / 2) / ppu, dy = (top + free / 2 - H / 2) / ppu, dx = (W - room) / 2 / ppu;
  want.p.set(dx, dy, z + dist); want.l.set(dx, dy, z); want.f = fov;
}
function sideView(i) { const a = W / H, back = a < 1 ? 1 / Math.max(0.45, a) : 1; want.p.set(4.1 * back, 1.5 * back, ringZ(i) + 4.4 * back); want.l.set(0, -0.15, ringZ(i) + 0.5); want.f = 46; }

function dots() { $('#dots').innerHTML = STAGES.map((_, k) => '<i class="' + (rings[k].done ? 'done' : rings[k].failed ? 'miss' : k === S.i ? 'on' : '') + '"></i>').join(''); $('#where').textContent = 'Gate ' + (S.i + 1) + ' of ' + N; }
function say(text, cls) { const m = $('#msg'); m.textContent = text; m.className = cls || ''; }
function showHint() { S.hint = true; $('#rule').textContent = S.q.why.hint; $('#rule').hidden = false; $('#hint').hidden = true; }
function question(i) {
  const st = STAGES[i], q = st.make(); q.st = st; q.why = WHY[i](q); q.help = HELP[i](q); return q;
}
function ask() {
  const q = S.q, row = $('#row'); row.innerHTML = '';
  q.ask.forEach((a) => {
    const d = document.createElement('label'); d.className = 'ans';
    d.innerHTML = '<b>' + a.k + '</b><button type="button" data-d="-1" aria-label="one degree less">−</button><input id="in-' + a.k + '" type="text" inputmode="numeric" maxlength="3" placeholder="?" aria-label="angle ' + a.k + ' in degrees"><button type="button" data-d="1" aria-label="one degree more">+</button><span>°</span>';
    const inp = d.querySelector('input');
    inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, ''); ready(); });
    d.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { inp.value = String(clamp((parseInt(inp.value, 10) || 60) + +b.dataset.d, 1, 179)); Snd.tick(); ready(); }));
    row.appendChild(d);
  });
  const go = document.createElement('button'); go.type = 'submit'; go.className = 'big'; go.id = 'go'; go.textContent = 'Send it through'; go.disabled = true; row.appendChild(go);
}
const values = () => Array.from(document.querySelectorAll('.ans input')).map((e) => parseInt(e.value, 10));
const ready = () => { $('#go').disabled = !values().every((v) => v >= 1 && v <= 179); };
const prompt = () => (S.q.note ? S.q.note + ' ' : '') + 'Find ' + S.q.ask.map((a) => a.k).join(' and ') + ' so your shape fits through the gap.';
function lockDock(v) { document.querySelectorAll('#row input, #row button').forEach((e) => { e.disabled = v; }); }

function enterDesign(i) {
  S.phase = 'design'; S.t = 0; S.i = i; S.q = S.qs[i];
  paint(S.q.st.col); exact(S.q, S.q.pts); shape.position.set(0, 0, ringZ(i) + 0.35); shape.rotation.set(0, 0, 0);
  S.hint = false; $('#banner').textContent = ''; ask(); $('#row').hidden = false; $('#steps').hidden = true; $('#rule').hidden = true; $('#hint').hidden = false; say(prompt()); shape.scale.setScalar(1); $('#dock').hidden = false; dots(); designView(i); want.k = 3.5;
}
function submit(e) {
  e.preventDefault(); if (S.phase === 'review') { next(); return; } if (S.phase !== 'design') return; const v = values(); if (!v.every((x) => x >= 1 && x <= 179)) return;
  if (document.activeElement) document.activeElement.blur();
  if (W <= 600 || H <= 520) Calc.set(false); S.mine = v; S.cut = cutShape(S.q, v); S.tries[S.i]++; S.fitted[S.i] = !S.cut.wrong.length; $('#steps').hidden = true; S.phase = 'windup'; S.t = 0; S.hint = false; lockDock(true); $('#rule').hidden = true; $('#hint').hidden = true; say('Cutting your shape…'); S.from = outlineOf(S.q, S.q.pts); S.to = outlineOf(S.q, S.cut.pts); sideView(S.i); want.k = 3; Snd.rush(200, 900, 0.7, 0.12);
}
function review() {
  const q = S.q; S.phase = 'review'; S.t = 0; shape.scale.setScalar(1); shape.rotation.set(0, 0, 0); shape.position.set(0, 0, ringZ(S.i) + 0.35); exact(q, q.pts);
  const yours = q.ask.map((a, k) => a.k + ' = ' + S.mine[k] + '°').join(', ');
  say('✗ ' + yours + ' didn’t fit either. Here is how it works.', 'bad');
  $('#steps').innerHTML = q.why.steps.map((t) => '<li>' + t + '</li>').join(''); $('#steps').hidden = false; $('#rule').hidden = true; $('#hint').hidden = true;
  $('#row').innerHTML = '<button type="submit" class="big" id="go">' + (S.i === N - 1 ? 'See the full run' : 'Next gate') + '</button>'; $('#row').hidden = false; $('#dock').hidden = false; $('#dock').scrollTop = 0; dots();
}
// first miss: the same gate again, with help about this very question
function retry() {
  const q = S.q, wrong = S.cut.wrong; S.phase = 'design'; S.t = 0; S.hint = true; shape.scale.setScalar(1); shape.rotation.set(0, 0, 0); shape.position.set(0, 0, ringZ(S.i) + 0.35); exact(q, q.pts);
  ask(); q.ask.forEach((a, k) => { if (!wrong.some((w) => w.k === a.k)) $('#in-' + a.k).value = String(S.mine[k]); }); $('#go').textContent = 'Try again'; ready();
  say('✗ ' + wrong.map((w) => w.k + ' = ' + S.mine[q.ask.findIndex((a) => a.k === w.k)] + '° didn’t fit.').join(' ') + ' One more go.', 'bad');
  $('#steps').innerHTML = q.help.map((t) => '<li>' + t + '</li>').join(''); $('#steps').hidden = false; $('#row').hidden = false; $('#rule').hidden = true; $('#hint').hidden = true; $('#dock').scrollTop = 0; dots();
}
function next() {
  if (document.activeElement) document.activeElement.blur(); $('#dock').hidden = true;
  if (S.i === N - 1) { startRun(); return; }
  const z = ringZ(S.i), nz = ringZ(S.i + 1);
  // a shape that never fitted is lifted over the top of the gate
  travel([[0, z + 0.35], [2.75, z + 3], [2.75, z - 2], [0, nz + 0.35]], 7);
}
function travel(path, speed) {
  S.path = path; S.speed = speed; S.length = path.slice(1).reduce((n, p, k) => n + Math.hypot(p[0] - path[k][0], p[1] - path[k][1]), 0);
  S.phase = 'travel'; S.t = 0; $('#dock').hidden = true; S.from = outlineOf(S.q, S.q.pts); S.to = outlineOf(S.qs[S.i + 1], S.qs[S.i + 1].pts); S.c0 = new THREE.Color(S.q.st.col); Snd.rush(120, 600, 1.8, 0.14);
}
function along(path, d) { for (let k = 1; k < path.length; k++) { const a = path[k - 1], b = path[k], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d <= l || k === path.length - 1) { const f = clamp(d / l, 0, 1); return [lerp(a[0], b[0], f), lerp(a[1], b[1], f)]; } d -= l; } return path[0]; }
function startAll() {
  Snd.init(); S.qs = STAGES.map((_, i) => question(i)); S.fitted = STAGES.map(() => false); S.tries = STAGES.map(() => 0); rings.forEach((r, i) => { r.done = false; r.failed = false; r.flash = 0; r.bad = 0; buildPlate(i, S.qs[i]); });
  $('#card').hidden = true; $('#top').hidden = false; $('#banner').textContent = ''; enterDesign(0);
}
function startRun() {
  S.phase = 'run'; S.t = 0; S.passed = -1; $('#card').hidden = true; $('#dock').hidden = true; $('#top').hidden = true; $('#banner').textContent = 'All eight shapes, cut correctly';
  S.outs = S.qs.map((q) => outlineOf(q, q.pts)); paint(STAGES[0].col); exact(S.qs[0], S.qs[0].pts); S.shown = 0; shape.scale.setScalar(1); shape.rotation.set(0, 0, 0); shape.position.set(0, 0, ringZ(0) + 7);
  cam.p.set(2.4, 1.2, ringZ(0) + 12.5); cam.l.set(0, 0, ringZ(0)); Snd.rush(150, 700, 1.2, 0.15);
}
function finale() {
  S.phase = 'done'; $('#banner').textContent = ''; $('#top').hidden = true; $('#dock').hidden = true;
  const n = S.fitted.filter(Boolean).length;
  $('#sheet').innerHTML = '<h1>' + (n === N ? 'All eight fitted' : n + ' of ' + N + ' fitted') + '</h1><p>The theorem that opened each gate.</p><ol>' + STAGES.map((st, i) => '<li><i style="background:#' + st.col.toString(16).padStart(6, '0') + '"></i><span><b>' + st.name + '.</b> ' + st.rule + '</span><em class="' + (S.fitted[i] ? 'y' : 'n') + '">' + (S.fitted[i] ? (S.tries[i] === 1 ? '✓ first go' : '✓ second go') : '✗ missed') + '</em></li>').join('') + '</ol><div class="btns"><button type="button" class="big" id="again">New angles</button><button type="button" class="alt" id="rerun">Watch the run again</button></div>';
  $('#card').hidden = false; $('#again').addEventListener('click', startAll); $('#rerun').addEventListener('click', startRun);
}
function passEffect(i, quiet) {
  const r = rings[i], hole = S.qs[i].poly.map((n) => S.qs[i].pts[n]); r.flash = 1; wave(ringZ(i), STAGES[i].col, 0); wave(ringZ(i), 0xffffff, 0.14);
  resample(hole, 14).forEach((p) => burst(new THREE.Vector3(p[0] * 1.04, p[1] * 1.04, ringZ(i)), STAGES[i].col, quiet ? 5 : 11, 1.8, 0.12));
  Snd.pass(i);
}

function step(dt) {
  S.t += dt; const z = ringZ(S.i);
  if (S.phase === 'intro') { const a = performance.now() / 9000; want.p.set(4.6 + Math.sin(a) * 1.1, 2 + Math.sin(a * 1.7) * 0.4, 9.5); want.l.set(0, -0.3, -7); want.f = 46; shape.position.set(0, Math.sin(a * 7) * 0.08, 2.4); shape.rotation.y = a * 2.4; }
  else if (S.phase === 'design') { designView(S.i); shape.position.y = 0; }
  else if (S.phase === 'windup') {
    const k = clamp(S.t / 1.35, 0, 1);
    if (S.t < 0.75) morph(S.from, S.to, ease(clamp(S.t / 0.7, 0, 1))); else if (!S.shaped) { exact(S.q, S.cut.pts); S.shaped = true; Snd.tone(1200, 0.2, 0.05, 'triangle'); }
    shape.position.z = z + lerp(0.35, 4.4, ease(k));
    if (S.t >= 1.7) { S.phase = 'fly'; S.t = 0; S.shaped = false; S.hit = false; Snd.rush(180, 1500, S.cut.wrong.length ? 1.1 : 1.5, 0.28); say('Here it goes…'); want.k = 2.4; }
  } else if (S.phase === 'fly') {
    const SPEED = 5.5, bad = S.cut.wrong.length;
    if (!bad) {
      // one steady speed through the gap and straight on to the next gate: nothing to go back to
      const d = 4.4 - SPEED * S.t; shape.position.z = z + d;
      if (!S.hit && d <= 0) { S.hit = true; rings[S.i].done = true; passEffect(S.i); dots(); say('✓ Straight through.', 'ok'); $('#dock').hidden = true; $('#banner').textContent = '✓ Straight through'; }
      if (d <= -1.6) {
        if (S.i < N - 1) travel([[0, shape.position.z], [0, ringZ(S.i + 1) + 0.35]], SPEED);
        else if (d <= -5) startRun();
      }
    } else {
      const stop = DEPTH / 2 + 0.075, out = S.cut.wrong.some((w) => w.out), reach = (4.4 - stop) / SPEED;
      if (!S.hit) {
        shape.position.z = z + Math.max(stop, 4.4 - SPEED * S.t);
        if (S.t >= reach) {
          S.hit = true; S.t = reach; rings[S.i].bad = 1; rings[S.i].failed = S.tries[S.i] >= 2; dots(); S.shake = out ? 0.14 : 0.05; if (out) Snd.clank(); else Snd.buzz();
          S.cut.wrong.forEach((w) => { const at = w.out ? S.cut.pts[w.name] : S.q.pts[w.name]; burst(new THREE.Vector3(at[0], at[1], z + 0.12), w.out ? 0xffb347 : 0xff3b3b, 60, w.out ? 3.2 : 1.4, 0.11); });
          say(S.cut.wrong.map((w) => 'Corner ' + w.name + (w.out ? ' is too big for the gap and hits the gate.' : ' falls short and leaves a hole in the gap.')).join(' '), 'bad');
        }
      } else {
        const b = clamp((S.t - reach) / 0.9, 0, 1); shape.position.z = z + stop + Math.sin(b * Math.PI) * (out ? 0.55 : 0.2); shape.rotation.z = Math.sin(b * 22) * 0.06 * (1 - b);
        if (S.t >= reach + 2.4) { S.phase = 'back'; S.t = 0; S.z0 = shape.position.z; designView(S.i); want.k = 3.5; S.from = outlineOf(S.q, S.cut.pts); S.to = outlineOf(S.q, S.q.pts); }
      }
    }
  } else if (S.phase === 'back') {
    // a miss: the true shape comes back in front of its gate, for another go or for the answer
    const k = clamp(S.t / 1.2, 0, 1), home = z + 0.35; shape.rotation.z = 0;
    shape.position.z = lerp(S.z0, home, ease(k));
    if (k < 1) morph(S.from, S.to, ease(k)); else if (S.tries[S.i] < 2) retry(); else review();
  } else if (S.phase === 'review') { designView(S.i); shape.position.y = 0; }
  else if (S.phase === 'travel') {
    // steady speed again, and the shape re-cuts itself on the way
    const d = S.speed * S.t, k = clamp(d / S.length, 0, 1), at = along(S.path, d); if (k > 0.45) $('#banner').textContent = '';
    shape.position.set(0, at[0], at[1]); const mk = clamp((k - 0.3) / 0.5, 0, 1);
    morph(S.from, S.to, ease(mk)); paint(S.c0.clone().lerp(new THREE.Color(STAGES[S.i + 1].col), mk));
    want.p.set(Math.sin(k * Math.PI) * 2.4, Math.sin(k * Math.PI) * 0.9 + at[0] * 0.7 + 0.4, at[1] + lerp(7, 9, k)); want.l.set(0, at[0] * 0.7, at[1] - 2); want.f = lerp(46, 30, k); want.k = 4;
    if (k >= 1) enterDesign(S.i + 1);
  } else if (S.phase === 'wait') { if (S.t > 1) startRun(); }
  else if (S.phase === 'run') {
    const lead = 7, speed = 8.2, total = lead + GAP * (N - 1) + 9, d = S.t < 1.2 ? speed * S.t * S.t / 2.4 : speed * (S.t - 0.6), zz = ringZ(0) + lead - d;
    shape.position.z = zz;
    // between one ring and the next it reshapes itself into the next perfect fit
    const nextI = clamp(Math.ceil((-zz - 0.4) / GAP), 0, N - 1);
    if (nextI > 0 && S.shown < nextI) { const since = clamp((-zz - ringZ(0) - GAP * (nextI - 1) - 2) / (GAP * 0.5), 0, 1); if (since > 0 && since < 1) { morph(S.outs[nextI - 1], S.outs[nextI], ease(since)); paint(new THREE.Color(STAGES[nextI - 1].col).lerp(new THREE.Color(STAGES[nextI].col), since)); } else if (since >= 1) { exact(S.qs[nextI], S.qs[nextI].pts); paint(STAGES[nextI].col); S.shown = nextI; } }
    if (S.passed < N - 1 && zz <= ringZ(S.passed + 1)) { S.passed++; passEffect(S.passed, true); $('#banner').textContent = (S.passed + 1) + '. ' + STAGES[S.passed].name; }
    const swing = Math.sin(d / GAP * Math.PI * 0.5) * 2.6, back = W < H ? 1.5 : 1;
    want.p.set(swing * back, (1 + Math.cos(d / GAP * 1.3) * 0.3) * back, zz + 4.8 * back); want.l.set(0, -0.05, zz - 2.6); want.f = 48; want.k = 6;
    if (d >= total) finale();
  } else if (S.phase === 'done') { const a = performance.now() / 7000, e = ringZ(N - 1); want.p.set(Math.sin(a) * 5, 2.1, e - 16); want.l.set(0, -0.2, e - 4); want.f = 48; want.k = 1.5; shape.rotation.y += dt * 0.6; }

  const k = 1 - Math.exp(-dt * want.k);
  cam.p.lerp(want.p, k); cam.l.lerp(want.l, k); cam.f = lerp(cam.f, want.f, k);
  camera.position.copy(cam.p); if (S.shake > 0.001) { camera.position.x += (Math.random() - 0.5) * S.shake; camera.position.y += (Math.random() - 0.5) * S.shake; S.shake *= Math.pow(0.004, dt); }
  camera.fov = cam.f; camera.lookAt(cam.l); camera.updateProjectionMatrix();
  follow.position.set(shape.position.x + 0.4, shape.position.y + 0.8, shape.position.z + 1.1); follow.intensity = S.phase === 'design' ? 0.15 : 0.9;
  const li = S.phase === 'run' ? Math.max(0, S.passed) : S.i; ringLight.position.set(0, 0.4, ringZ(li) + 0.8); ringLight.color.set(STAGES[li].col);
  rings.forEach((r, i) => {
    r.flash = Math.max(0, r.flash - dt * 0.7); r.bad = Math.max(0, r.bad - dt * 0.55);
    r.metal.material.emissive.set(r.bad > 0 || r.failed ? 0xff1f1f : STAGES[i].col); if (r.fill) { r.fill.emissive.set(r.bad > 0 ? 0xff1f1f : STAGES[i].col); r.fill.emissiveIntensity = 0.05 + r.flash * 0.7 + r.bad * 0.55; r.rim.color.set(r.bad > 0.05 ? 0xff3b3b : STAGES[i].col); } r.metal.material.emissiveIntensity = 0.16 + (r.done ? 0.22 : 0) + r.flash * 1.4 + r.bad * 0.9;
    r.lip.material.opacity = r.done ? 1 : i === S.i ? 0.8 : 0.45; r.halo.material.opacity = 0.18 + r.flash * 0.7 + (i === S.i ? 0.08 * Math.sin(performance.now() / 400) + 0.08 : 0); r.halo.rotation.z += dt * 0.1;
  });
  for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t += dt; if (f.t >= f.life) { f.end(); fx.splice(i, 1); } else f.tick(dt); }
  dust.rotation.z = Math.sin(performance.now() / 20000) * 0.02;
}

/* ================= the calculator: add, take away, times, divide ================= */
const Calc = {
  open: false, text: '', done: false,
  // times and divide first, then add and take away, left to right
  work(t) {
    const bits = t.match(/(\d+\.?\d*|\.\d+|[+−×÷])/g) || []; if (!bits.length) return null;
    const nums = [], ops = []; let sign = 1, want = true;
    for (const b of bits) {
      if ('+−×÷'.includes(b)) { if (want) { if (b === '−') sign = -sign; continue; } ops.push(b); want = true; continue; }
      let v = sign * parseFloat(b); sign = 1; want = false;
      const op = ops[ops.length - 1];
      if (nums.length === ops.length && (op === '×' || op === '÷')) { ops.pop(); const a = nums.pop(); if (op === '÷' && v === 0) return NaN; v = op === '×' ? a * v : a / v; }
      nums.push(v);
    }
    let out = nums[0]; if (out === undefined) return null;
    for (let i = 1; i < nums.length; i++) out = ops[i - 1] === '+' ? out + nums[i] : out - nums[i];
    return parseFloat(out.toFixed(6));
  },
  press(k) {
    const ops = '+−×÷';
    if (k === 'C') { this.text = ''; this.done = false; $('#calcWas').textContent = ''; }
    else if (k === '⌫') { this.text = this.done ? '' : this.text.slice(0, -1); this.done = false; }
    else if (k === '=') {
      const t = this.text.replace(/[+−×÷.]+$/, ''), v = this.work(t); if (v === null) return;
      $('#calcWas').textContent = t + ' ='; if (Number.isNaN(v)) { this.text = ''; this.done = false; $('#calcNow').textContent = 'Can’t divide by 0'; return; }
      this.text = String(v).replace('-', '−'); this.done = true;
    } else if (this.text.length < 22) {
      if (ops.includes(k)) { if (!this.text && k !== '−') return; this.text = this.text.replace(/[+−×÷]$/, '') + k; }
      else {
        if (this.done) { this.text = ''; $('#calcWas').textContent = ''; }
        const last = this.text.split(/[+−×÷]/).pop(); if (k === '.' && last.includes('.')) return; this.text += k === '.' && !last ? '0.' : k;
      }
      this.done = false;
    }
    $('#calcNow').textContent = this.text || '0';
  },
  // shown only while there is an angle to work out
  show() { const there = !$('#dock').hidden, btn = $('#calcBtn'), box = $('#calc'); if (btn.hidden === there) btn.hidden = !there; const see = there && this.open; if (box.hidden === see) box.hidden = !see; },
  set(v) { this.open = v; $('#calcBtn').setAttribute('aria-expanded', String(v)); $('#calcBtn').textContent = v ? 'Close ✕' : 'Calculator'; this.show(); },
  init() {
    [['C', 'op'], ['⌫', 'op'], ['÷', 'op'], ['×', 'op'], ['7'], ['8'], ['9'], ['−', 'op'], ['4'], ['5'], ['6'], ['+', 'op'], ['1'], ['2'], ['3'], ['.'], ['0', 'wide'], ['=', 'eq wide']].forEach(([k, cls]) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = k; if (cls) b.className = cls; if (k === '⌫') b.setAttribute('aria-label', 'delete'); b.addEventListener('click', () => { Snd.tick(); this.press(k); }); $('#calcKeys').appendChild(b);
    });
    $('#calcBtn').addEventListener('click', () => { if (document.activeElement && document.activeElement.tagName === 'INPUT') document.activeElement.blur(); this.set(!this.open); });
    $('#calc').addEventListener('keydown', (e) => { const k = { '-': '−', '*': '×', x: '×', '/': '÷', Enter: '=', '=': '=', Backspace: '⌫', Escape: 'esc', c: 'C' }[e.key] || (/^[0-9.+]$/.test(e.key) ? e.key : null); if (!k) return; e.preventDefault(); if (k === 'esc') this.set(false); else this.press(k); });
  }
};

/* ================= the diagram drawn over the waiting shape ================= */
const v3 = new THREE.Vector3();
function scr(p) { v3.set(p[0], p[1] + shape.position.y, shape.position.z + DEPTH / 2).project(camera); return [(v3.x + 1) / 2 * W, (1 - v3.y) / 2 * H]; }
function diagram() {
  ox.clearRect(0, 0, W, H);
  if (S.phase !== 'design' && S.phase !== 'review') return;
  const settle = clamp(1 - camera.position.distanceTo(want.p) / 3, 0, 1); if (settle <= 0.05) return;
  const q = S.q, why = q.why, told = S.phase === 'review', marked = told || S.hint, TONE = { g: '#5dffb0', p: '#ff8ad8' }, p = {}; Object.keys(q.pts).forEach((n) => { p[n] = scr(q.pts[n]); });
  const o = scr(O), R = len(sub(scr([1, 0]), o)), fs = clamp(R * 0.1, 13, 21);
  ox.save(); ox.globalAlpha = settle; ox.lineCap = 'round';
  ox.setLineDash([5, 7]); ox.strokeStyle = 'rgba(255,255,255,.7)'; ox.lineWidth = 1.5; ox.beginPath(); ox.arc(o[0], o[1], R, 0, 7); ox.stroke(); ox.setLineDash([]);
  (q.guides || []).forEach((g) => { ox.strokeStyle = '#fff'; ox.lineWidth = 2.5; ox.beginPath(); ox.moveTo(p[g[0]][0], p[g[0]][1]); ox.lineTo(p[g[1]][0], p[g[1]][1]); ox.stroke(); });
  const text = (t, x, y, col, size) => { ox.font = '700 ' + size + "px 'Chakra Petch',sans-serif"; ox.textAlign = 'center'; ox.textBaseline = 'middle'; ox.lineWidth = 5; ox.lineJoin = 'round'; ox.strokeStyle = 'rgba(0,0,0,.85)'; ox.strokeText(t, x, y); ox.fillStyle = col; ox.fillText(t, x, y); };
  if (marked) why.hi.forEach((h) => {
    const a = p[h[1]], b = p[h[2]]; ox.save(); ox.shadowBlur = 14;
    if (h[0] === 'seg') { ox.strokeStyle = ox.shadowColor = TONE[h[3]]; ox.lineWidth = 6; ox.beginPath(); ox.moveTo(a[0], a[1]); ox.lineTo(b[0], b[1]); ox.stroke(); }
    else if (h[0] === 'arc') { const ang = (v) => Math.atan2(v[1] - o[1], v[0] - o[0]), a0 = ang(a), turn = (t) => ((t - a0) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI), anti = turn(ang(p[h[3]])) < turn(ang(b)); ox.strokeStyle = ox.shadowColor = TONE.g; ox.lineWidth = 8; ox.beginPath(); ox.arc(o[0], o[1], R, a0, ang(b), anti); ox.stroke(); }
    else { const u = unit(sub(b, a)), n = [-u[1], u[0]], m = mul(add(a, b), 0.5), z = R * 0.045; ox.strokeStyle = '#fff'; ox.shadowColor = '#000'; ox.lineWidth = 3; for (let k = 0; k < h[3]; k++) { const c = add(m, mul(u, (k - (h[3] - 1) / 2) * 7)); ox.beginPath(); ox.moveTo(c[0] + n[0] * z, c[1] + n[1] * z); ox.lineTo(c[0] - n[0] * z, c[1] - n[1] * z); ox.stroke(); } }
    ox.restore();
  });
  const used = {}, boxes = [];
  const mark = (a, label, unknown, tone) => {
    const v = p[a.v], u = unit(sub(p[a.a], v)), w = unit(sub(p[a.b], v)), t0 = Math.atan2(u[1], u[0]); let d = Math.atan2(w[1], w[0]) - t0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    const nth = used[a.v] = (used[a.v] || 0) + 1, r = Math.min(R * (a.v === 'P' ? 0.17 : 0.19), 0.45 * len(sub(p[a.a], v)), 0.45 * len(sub(p[a.b], v))) * (1 + (nth - 1) * 0.12), col = tone && marked ? TONE[tone] : unknown ? '#ffd45a' : '#ffffff';
    ox.beginPath(); ox.moveTo(v[0], v[1]); ox.arc(v[0], v[1], r, t0, t0 + d, d < 0); ox.closePath(); ox.fillStyle = tone && marked ? (tone === 'g' ? 'rgba(20,110,76,.75)' : 'rgba(128,36,100,.75)') : unknown ? 'rgba(255,212,90,.38)' : 'rgba(8,10,24,.55)'; ox.fill(); ox.beginPath(); ox.arc(v[0], v[1], r, t0, t0 + d, d < 0); ox.strokeStyle = col; ox.lineWidth = 2.5; ox.stroke();
    // narrow angles need their number further out so it clears both arms
    const half = Math.abs(d) / 2, lr = Math.max(r + fs * 0.9, fs * (unknown ? 0.75 : 1.25) / Math.max(0.2, Math.sin(half))), m = t0 + d / 2;
    const size = unknown ? (told ? fs * 1.2 : fs * 1.45) : fs * 1.1; ox.font = '700 ' + size + "px 'Chakra Petch',sans-serif";
    const bw = ox.measureText(label).width + 6, bh = size + 2; let far = lr, x = 0, y = 0;
    // numbers never sit on top of one another: a later one slides further out along its angle
    for (let n = 0; n < 14; n++, far += fs * 0.5) { x = v[0] + Math.cos(m) * far; y = v[1] + Math.sin(m) * far; if (!boxes.some((q2) => Math.abs(q2[0] - x) < (q2[2] + bw) / 2 && Math.abs(q2[1] - y) < (q2[3] + bh) / 2)) break; }
    boxes.push([x, y, bw, bh]); text(label, x, y, col, size);
  };
  q.given.forEach((a, k) => mark(a, a.deg + '°', false, why.tones['g' + k]));
  q.ask.forEach((a) => mark(a, told ? a.k + ' = ' + a.ans + '°' : a.k, true, told ? why.tones[a.k] || 'g' : why.tones[a.k]));
  const square = (r, col) => { const v = p[r.v], u = mul(unit(sub(p[r.a], v)), R * 0.09), w = mul(unit(sub(p[r.b], v)), R * 0.09); ox.strokeStyle = col; ox.lineWidth = 3; ox.beginPath(); ox.moveTo(v[0] + u[0], v[1] + u[1]); ox.lineTo(v[0] + u[0] + w[0], v[1] + u[1] + w[1]); ox.lineTo(v[0] + w[0], v[1] + w[1]); ox.stroke(); };
  if (q.right) square(q.right, '#fff');
  if (told) (why.after || []).forEach((h) => { if (h[0] === 'right') square({ v: h[1], a: h[2], b: h[3] }, TONE.g); else mark({ v: h[1], a: h[2], b: h[3] }, h[4], false, h[5]); });
  const names = new Set(q.poly.concat((q.guides || []).some((g) => g[0] === 'P') ? ['P'] : [])); names.add('O');
  names.forEach((n) => {
    const v = n === 'O' ? o : p[n]; ox.fillStyle = '#fff'; ox.beginPath(); ox.arc(v[0], v[1], 4, 0, 7); ox.fill(); ox.lineWidth = 2; ox.strokeStyle = '#0a0c1c'; ox.stroke();
    let dir = unit(sub(v, o)); if (n === 'O') dir = q.pts.M ? [0, -1] : [-0.75, q.st.name === 'Angle at the centre' ? -0.7 : 0.66]; if (n === 'M') dir = [-0.5, 0.87];
    text(n, v[0] + dir[0] * fs * 1.15, v[1] + dir[1] * fs * 1.15, '#cfe0ff', fs * 1.1);
  });
  ox.restore();
}

function resize() { const vv = window.visualViewport, seen = vv && Math.abs(vv.scale - 1) < 0.02 && vv.height < innerHeight - 60, app = $('#app'); W = innerWidth; H = Math.round(seen ? vv.height : innerHeight);
  app.style.height = seen ? H + 'px' : ''; app.style.bottom = seen ? 'auto' : ''; app.style.top = seen ? vv.offsetTop + 'px' : ''; renderer.setSize(W, H, false); camera.aspect = W / H; const k = Math.min(2, window.devicePixelRatio || 1); over.width = W * k; over.height = H * k; ox.setTransform(k, 0, 0, k, 0, 0); }
addEventListener('resize', resize);
if (window.visualViewport) { visualViewport.addEventListener('resize', resize); visualViewport.addEventListener('scroll', resize); }
let last = performance.now();
function frame(dt) { step(dt); Calc.show(); renderer.render(scene, camera); diagram(); }
function loop() { requestAnimationFrame(loop); const t = performance.now(), dt = Math.min(0.05, (t - last) / 1000); last = t; frame(dt); }

$('#dock').addEventListener('submit', submit);
$('#hint').addEventListener('click', showHint);
Calc.init();
$('#begin').addEventListener('click', startAll);
$('#mute').addEventListener('click', () => { Snd.on = !Snd.on; if (Snd.out) Snd.out.gain.value = Snd.on ? 1 : 0; $('#mute').textContent = Snd.on ? 'SOUND ON' : 'SOUND OFF'; });
resize(); STAGES.forEach((_, i) => buildPlate(i, question(i))); paint(STAGES[0].col); setShape([P(90), P(215), P(325)], [], [P(90), P(215), P(325)]);
loop();
})();
