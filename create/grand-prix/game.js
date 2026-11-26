/* Hypotenuse Grand Prix: a GCSE graphs racing game. */
(function(){
'use strict';
/* ================= the circuit, and the graphs that describe it =================
   The lap is three parabolic corners joined by three straights. Every piece has its own graph: x runs the way you drive,
   y points to your left. The student writes the function for each piece and the car drives exactly what they wrote.      */
const V = (x, z) => [x, z], add = (a, b) => [a[0] + b[0], a[1] + b[1]], sub = (a, b) => [a[0] - b[0], a[1] - b[1]], mul = (a, k) => [a[0] * k, a[1] * k];
const vlen = (a) => Math.hypot(a[0], a[1]), norm = (a) => mul(a, 1 / (vlen(a) || 1)), mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const leftOf = (d) => [d[1], -d[0]];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k, ease = (k) => k * k * (3 - 2 * k);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const rint = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

/* corners of the triangle the circuit is built on, driven clockwise; CUT is how far from each one the curve begins */
const VERT = [[0, 0], [560, 70], [230, 450]], CUT = 135, ROAD = 15;
// how far the racing line sits from the middle of the road: out wide before and after a corner, in tight at its apex
const WIDE = 5, TIGHT = 6.2;
const WORLD = (() => {
  const dir = (i, j) => norm(sub(VERT[j], VERT[i]));
  const corner = (i) => { const prev = (i + 2) % 3, next = (i + 1) % 3, C = VERT[i], E = add(C, mul(dir(prev, i), -CUT)), X = add(C, mul(dir(i, next), CUT)); return { E, C, X, E2: add(E, mul(leftOf(dir(prev, i)), WIDE)), X2: add(X, mul(leftOf(dir(i, next)), WIDE)) }; };
  return [corner(1), corner(2), corner(0)];
})();
const bez = (c, t) => mix(mix(c.E, c.C, t), mix(c.C, c.X, t), t);

const ORDER = [
  { key: 'c1', type: 'vertex', corner: 0, name: 'Lakeside' },
  { key: 's1', type: 'line', from: 0, to: 1, name: 'Back Straight' },
  { key: 'c2', type: 'turning', corner: 1, name: 'Orchard' },
  { key: 's2', type: 'line', from: 1, to: 2, name: 'Valley Straight' },
  { key: 'c3', type: 'roots', corner: 2, name: 'Summit' },
  { key: 's3', type: 'line', from: 2, to: 0, name: 'Start Straight' }
];
const FIELDS = { vertex: ['a', 'b', 'c'], line: ['m', 'c'], turning: ['p', 'q'], roots: ['a', 'b', 'c'] };

/* numbers a person writes: -3, .5, −1/4 */
function parseNum(text) {
  const t = String(text).trim().replace(/−/g, '-').replace(',', '.'); const m = t.match(/^(-?(?:\d+\.?\d*|\.\d+))(?:\/(\d+\.?\d*))?$/);
  if (!m) return null; const v = parseFloat(m[1]) / (m[2] === undefined ? 1 : parseFloat(m[2])); return Number.isFinite(v) ? v : null;
}
const show = (v) => String(Math.round(v * 1000) / 1000).replace('-', '−');
const pt = (p) => '(' + show(p[0]) + ', ' + show(p[1]) + ')';
/* "x² − 6x + 2" from its coefficients */
function poly(terms) {
  let out = '';
  terms.forEach(([k, s]) => { if (!k) return; const mag = Math.abs(k), body = (mag === 1 && s ? '' : show(mag)) + s; out += out ? (k < 0 ? ' − ' : ' + ') + body : (k < 0 ? '−' : '') + body; });
  return out || '0';
}

/* one piece of the lap: its numbers, its graph, and how the graph sits on the ground */
function makePiece(k) {
  const def = ORDER[k], p = Object.assign({ i: k }, def);
  if (def.type === 'line') {
    const m = pick([2, -2, 3, 0.5, -0.5, 1.5, -1.5, 0.25, -1, 1]), c = pick([-5, -4, -3, -2, 2, 3, 4, 5, 6]), run = pick(Math.abs(m) === 0.25 ? [8] : Math.abs(m) >= 2 ? [4] : [4, 6, 8]), x0 = rint(-3, 2), x1 = x0 + run;
    p.truth = { m, c }; p.x0 = x0; p.x1 = x1; p.P = [x0, m * x0 + c]; p.Q = [x1, m * x1 + c]; p.f = (x) => m * x + c;
    const A = WORLD[def.from].X2, B = WORLD[def.to].E2, L = vlen(sub(B, A)), d = norm(sub(B, A)), th = Math.atan2(p.Q[1] - p.P[1], run), R = sub(mul(d, Math.cos(th)), mul(leftOf(d), Math.sin(th))), s = L / Math.hypot(run, p.Q[1] - p.P[1]);
    p.ex = mul(R, s); p.ey = mul(leftOf(R), s); p.O = sub(sub(A, mul(p.ex, p.P[0])), mul(p.ey, p.P[1]));
    return p;
  }
  let a, H, h, mid, base;
  if (def.type === 'vertex') { [H, a] = pick([[4, -0.25], [2, -1], [4, -0.5], [3, -1], [6, -0.25]]); h = -a * H * H; mid = H; base = pick([-3, -2, -1, 1, 2, 3]); }
  else if (def.type === 'turning') { [H, a] = pick([[2, -1], [3, -1], [2, -0.5], [4, -0.5]]); h = -a * H * H; mid = pick([-2, -1, 2, 3, 4, 5]); base = pick([-2, -1, 1, 2, 3]); }
  else { [H, a] = pick([[4, -0.25], [2, -1], [4, -0.5], [3, -1], [6, -0.25], [2, -0.5]]); h = -a * H * H; mid = pick((a === -1 ? [-2, 1, 2, 3, 4, 5] : [-2, 2, 4, 6]).filter((m) => Math.abs(m) !== H)); base = 0; }
  const top = base + h; p.x0 = mid - H; p.x1 = mid + H; p.apex = [mid, top]; p.P = [p.x0, base]; p.Q = [p.x1, base];
  p.f = (x) => a * (x - mid) * (x - mid) + top;
  p.truth = def.type === 'turning' ? { p: mid, q: top } : { a, b: -2 * a * mid, c: a * mid * mid + top };
  p.equation = 'y = ' + poly([[a, 'x²'], [-2 * a * mid, 'x'], [a * mid * mid + top, '']]);
  const c = WORLD[def.corner], d = norm(sub(c.X2, c.E2)), n = leftOf(d), L = vlen(sub(c.X2, c.E2)), clip = sub(bez(c, 0.5), mul(n, TIGHT)), away = sub(clip, mix(c.E2, c.X2, 0.5)), peak = away[0] * n[0] + away[1] * n[1];
  p.ex = mul(d, L / (2 * H)); p.ey = mul(n, peak / h); p.O = sub(sub(c.E2, mul(p.ex, p.x0)), mul(p.ey, base));
  return p;
}
const makeLap = () => ORDER.map((_, k) => makePiece(k));
const toWorld = (p, x, y) => add(p.O, add(mul(p.ex, x), mul(p.ey, y)));

/* the function a student's numbers describe (null if they describe nothing drivable) */
function studentF(p, v) {
  if (p.type === 'line') return (x) => v.m * x + v.c;
  if (p.type !== 'turning') return (x) => v.a * x * x + v.b * x + v.c;
  // an apex marker: the car takes the parabola through the entry, that point and the exit
  const [x0, y0] = p.P, [x2, y2] = p.Q, x1 = v.p, y1 = v.q; if (Math.abs(x1 - x0) < 0.25 || Math.abs(x1 - x2) < 0.25) return null;
  return (x) => y0 * (x - x1) * (x - x2) / ((x0 - x1) * (x0 - x2)) + y1 * (x - x0) * (x - x2) / ((x1 - x0) * (x1 - x2)) + y2 * (x - x0) * (x - x1) / ((x2 - x0) * (x2 - x1));
}
/* how far, in metres on the ground, their line sits from the road on average */
function errorOf(p, v) {
  const f = studentF(p, v); if (!f) return 60;
  let total = 0, n = 0;
  for (let k = 0; k <= 40; k++) { const x = lerp(p.x0, p.x1, k / 40); total += Math.min(60, Math.abs(f(x) - p.f(x)) * vlen(p.ey)); n++; }
  // an apex put in the wrong place counts even when the curve it makes passes close by
  if (p.type === 'turning') total += Math.min(60, vlen(sub(toWorld(p, v.p, v.q), toWorld(p, p.apex[0], p.apex[1])))) * n * 0.5, n *= 1.5;
  return total / n;
}
const GOOD = 1.2;
/* ---------- how the race unfolds ----------
   Accuracy decides the finish: all six right wins comfortably, one slip can still be won, two make it a narrow defeat.
   On the way there the lead swaps: the gap is set at the end of each of the twelve pieces raced, tows and dives
   carrying the cars past one another, and a car that runs off has to fight its way back. Positive means you lead.     */
const START_GAP = -0.12;
/* what each line is worth is never the same twice: a good one gains somewhere between a little and a lot, a bad one costs
   likewise. All six right always wins and one slip still does; with two it can go either way; three or more loses. */
function finishFor(wrong, rnd) {
  const count = wrong.filter(Boolean).length;
  const sum = wrong.reduce((t, bad) => t + (bad ? -(0.28 + rnd() * 0.42) : 0.05 + rnd() * 0.4), START_GAP);
  const v = count === 0 ? clamp(sum, 0.12, 2) : count === 1 ? clamp(sum, 0.06, 1.2) : count === 2 ? clamp(sum, -0.9, 0.5) : clamp(sum, -2.9, -0.15);
  return Math.abs(v) < 0.06 ? (v < 0 ? -0.06 : 0.06) : v;
}
// how far the gap may move over one piece: off the line it must shrink; on it, either car can come out ahead
const SWING = { wrong: [-0.75, -0.15], right: [-0.6, 0.8] };
function racePlan(wrong, random) {
  const rnd = random || Math.random, end = finishFor(wrong, rnd), may = (j) => (j === 11 ? (wrong[5] ? [-0.3, -0.1] : [-0.3, 0.35]) : SWING[wrong[j % 6] ? 'wrong' : 'right']);
  // the pieces on which someone has a go at passing
  const dive = [0, 1, 3, 5, 6, 8, 10];
  // working back from the flag: where the gap can be after each piece and still arrive at the right finish
  const lo = [], hi = []; lo[11] = hi[11] = end; for (let j = 10; j >= 0; j--) { lo[j] = lo[j + 1] - may(j + 1)[1]; hi[j] = hi[j + 1] - may(j + 1)[0]; }
  const g = []; let at_ = START_GAP;
  for (let j = 0; j < 12; j++) {
    let want;
    if (wrong[j % 6]) want = at_ - 0.4 - rnd() * 0.2;
    else {
      // go for the pass, whoever is behind
      want = (at_ < 0 ? -1 : 1) * (dive.includes(j) ? -1 : 1) * (0.14 + rnd() * 0.18);
      // and leave it to the last piece to settle
      if (j === 10) want = (end > 0 ? -1 : 1) * 0.18;
    }
    const low = Math.max(at_ + may(j)[0], lo[j]), high = Math.min(at_ + may(j)[1], hi[j]);
    at_ = j === 11 ? end : clamp(want, low, high); g.push(at_);
  }
  // when you pull a good chunk back on a piece you drove well, it is sometimes because the red car overshot
  const wide = [];
  [0, 6].forEach((from) => { let best = -1, most = 0.35; for (let j = from; j < from + 6; j++) { const step = g[j] - (j ? g[j - 1] : START_GAP); if (!wrong[j % 6] && step > most) { most = step; best = j; } } if (best >= 0) wide.push(best); });
  return { gaps: g, wide, end };
}
/* the racing line along one piece, as ground points */
const roadFor = (p) => Array.from({ length: 91 }, (_, k) => { const x = lerp(p.x0, p.x1, k / 90); return toWorld(p, x, p.f(x)); });
/* how far to the left of the racing line a student's function would take the car, part way (t) along a piece */
function strayAt(p, v, t, left) {
  const f = studentF(p, v); if (!f) return 14;
  const x = lerp(p.x0, p.x1, t), off = mul(p.ey, f(x) - p.f(x)); return off[0] * left[0] + off[1] * left[1];
}
/* a car that leaves the line eases out onto the wrong one, then has to steer back */
const strayShape = (t) => ease(clamp((t - 0.03) / 0.33, 0, 1)) * (1 - ease(clamp((t - 0.56) / 0.42, 0, 1)));
/* the student's function, written out */
function writeOut(p, v) {
  if (p.type === 'line') return 'y = ' + poly([[v.m, 'x'], [v.c, '']]);
  if (p.type === 'turning') return 'turning point ' + pt([v.p, v.q]);
  return 'y = ' + poly([[v.a, 'x²'], [v.b, 'x'], [v.c, '']]);
}
/* what the race engineer offers if asked: a nudge, then the method. Never the number. */
const QUAD_POINT = {
  steps: ['The apex is the turning point, so start with y = a(x − p)² + q, where (p, q) is the apex.',
    'Take the other point. Put its x and y into that equation. Now a is the only unknown, so solve for it.',
    'Expand to reach ax² + bx + c: write the bracket as (x − p)² = x² − 2px + p², multiply every term by a, then add q.'],
  example: ['Apex (1, 5), other point (0, 2)', 'y = a(x − 1)² + 5', '2 = a(0 − 1)² + 5, so a = −3', 'y = −3(x² − 2x + 1) + 5', 'y = −3x² + 6x + 2']
};
const METHOD = {
  vertex: QUAD_POINT,
  line: {
    steps: ['In y = mx + c, m is the gradient: m = (change in y) ÷ (change in x). Take the second point minus the first, for y and for x, in the same order.',
      'Put your m into y = mx + c, then replace x and y with one of the points.',
      'Solve for c. Check it by putting the other point in: both sides should match.'],
    example: ['Points (1, 2) and (3, 12)', 'm = (12 − 2) ÷ (3 − 1) = 5', '2 = 5 × 1 + c, so c = −3', 'y = 5x − 3']
  },
  turning: {
    steps: ['Complete the square. First take the number in front of x² out of the two x terms: a(x² + kx) + c.',
      'Inside the bracket halve k. Then x² + kx = (x + half)² − half².',
      'Multiply a back through and tidy the numbers into y = a(x + h)² + q.',
      'The turning point is where the bracket is zero: x = −h, and y = q.'],
    example: ['y = −3x² + 12x − 7', 'y = −3(x² − 4x) − 7', 'y = −3[(x − 2)² − 4] − 7', 'y = −3(x − 2)² + 5', 'Turning point (2, 5)']
  },
  roots: {
    steps: ['The points with y = 0 are the roots, r and s, so start with y = a(x − r)(x − s). A negative root turns the minus into a plus.',
      'Put the apex’s x and y into that equation. Now a is the only unknown, so solve for it.',
      'Expand the two brackets first, then multiply every term by a to reach ax² + bx + c.'],
    example: ['Roots (1, 0) and (5, 0), apex (3, 12)', 'y = a(x − 1)(x − 5)', '12 = a(2)(−2), so a = −3', 'y = −3(x² − 6x + 5)', 'y = −3x² + 18x − 15']
  }
};
const BRIEF = {
  vertex: () => 'Find the equation of this corner.',
  line: () => 'Find the equation of this straight.',
  turning: (p) => 'Find the turning point of <b>' + p.equation + '</b>',
  roots: () => 'Find the equation of this corner.'
};

/* ---------- a calculator that reads what you type ---------- */
function calculate(text) {
  const t = text.match(/(√|²|\d+\.?\d*|\.\d+|[+−×÷()])/g) || []; let i = 0;
  const peek = () => t[i], take = () => t[i++];
  function expr() { let v = term(); while (peek() === '+' || peek() === '−') { const o = take(), w = term(); v = o === '+' ? v + w : v - w; } return v; }
  function term() { let v = unary(); while (peek() !== undefined && peek() !== '+' && peek() !== '−' && peek() !== ')') { const o = peek(); if (o === '×' || o === '÷') { take(); const w = unary(); v = o === '×' ? v * w : v / w; } else v *= unary(); } return v; }
  function unary() { if (peek() === '−') { take(); return -unary(); } return power(); }
  function power() { let v = primary(); while (peek() === '²') { take(); v *= v; } return v; }
  function primary() { const k = take(); if (k === undefined) throw 0; if (k === '(') { const v = expr(); if (peek() === ')') take(); return v; } if (k === '√') return Math.sqrt(power()); const n = parseFloat(k); if (Number.isNaN(n)) throw 0; return n; }
  try { const v = expr(); return i === t.length && Number.isFinite(v) ? parseFloat(v.toFixed(8)) : null; } catch (e) { return null; }
}

/* ================= paths ================= */
function pathFrom(pts) { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + vlen(sub(pts[i], pts[i - 1]))); return { pts, cum, len: cum[cum.length - 1] }; }
function at(path, s) {
  const { pts, cum, len } = path, n = pts.length;
  if (s <= 0) return add(pts[0], mul(norm(sub(pts[1], pts[0])), s));
  if (s >= len) return add(pts[n - 1], mul(norm(sub(pts[n - 1], pts[n - 2])), s - len));
  let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
  return mix(pts[lo], pts[hi], (s - cum[lo]) / (cum[hi] - cum[lo] || 1));
}
const dirAt = (path, s) => norm(sub(at(path, s + 1.5), at(path, s - 1.5)));

/* ================= the circuit and its surroundings ================= */
function buildWorld(THREE, scene, renderer) {
  const seeded = (() => { let s = 11; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  const canvas = (w, h, draw, repeat) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  const speckle = (g, w, h, n, cols, size) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[Math.floor(seeded() * cols.length)]; const s = size * (0.4 + seeded()); g.fillRect(seeded() * w, seeded() * h, s, s); } };
  const M = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.9, metalness: 0 }, o));
  const mesh = (g, m, x, y, z, parent, cast) => { const o = new THREE.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = cast !== false; o.receiveShadow = true; (parent || scene).add(o); return o; };
  const MID = [(VERT[0][0] + VERT[1][0] + VERT[2][0]) / 3, (VERT[0][1] + VERT[1][1] + VERT[2][1]) / 3];

  /* the sky, with drifting cloud; the cars reflect it */
  const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { time: { value: 0 } },
    vertexShader: 'varying vec3 p; void main(){ p = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 p; uniform float time;
      float h(vec2 q){ return fract(sin(dot(q, vec2(127.1,311.7))) * 43758.5453); }
      float n(vec2 q){ vec2 i = floor(q), f = fract(q); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 q){ float v = 0.0, a = 0.5; for(int k=0;k<5;k++){ v += a*n(q); q *= 2.03; a *= 0.5; } return v; }
      void main(){ vec3 d = normalize(p); float y = max(d.y, 0.0);
        vec3 c = mix(vec3(0.66,0.78,0.90), vec3(0.14,0.36,0.74), pow(y, 0.5));
        float s = max(dot(d, normalize(vec3(-0.5,0.55,0.45))), 0.0); c += vec3(1.0,0.9,0.68) * (pow(s, 900.0)*2.0 + pow(s, 12.0)*0.16);
        vec2 q = d.xz / (y + 0.16) * 1.5 + vec2(time*0.006, 0.0); float cl = smoothstep(0.47, 0.82, fbm(q)) * smoothstep(0.02, 0.18, y);
        c = mix(c, mix(vec3(0.80,0.84,0.90), vec3(1.0,0.99,0.96), fbm(q*2.1+3.0)), cl);
        if(d.y < 0.0) c = mix(vec3(0.66,0.78,0.90), vec3(0.24,0.30,0.18), clamp(-d.y*6.0,0.0,1.0));
        gl_FragColor = vec4(c, 1.0); }` });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2200, 32, 20), skyMat); sky.position.set(MID[0], 0, MID[1]); scene.add(sky);
  let env = null;
  try { const pm = new THREE.PMREMGenerator(renderer), s2 = new THREE.Scene(); envSky = skyMat.clone(); envSky.fragmentShader = skyMat.fragmentShader.replace('gl_FragColor = vec4(c, 1.0);', 'gl_FragColor = vec4(pow(c, vec3(2.2)), 1.0);\n#include <encodings_fragment>\n'); s2.add(new THREE.Mesh(new THREE.SphereGeometry(60, 32, 20), envSky)); env = pm.fromScene(s2, 0.02).texture; pm.dispose(); } catch (e) { env = null; }
  scene.fog = new THREE.Fog(0xb9cfe4, 500, 1900);
  scene.add(new THREE.HemisphereLight(0xcfe4ff, 0x4c5a30, 0.75));
  const sun = new THREE.DirectionalLight(0xffefd2, 1.55); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.03;
  const sc = sun.shadow.camera; sc.left = sc.bottom = -60; sc.right = sc.top = 60; sc.near = 20; sc.far = 400; scene.add(sun); scene.add(sun.target);

  /* ground: mown grass */
  const grassTex = canvas(512, 512, (g, w, h) => { g.fillStyle = '#4f7a2e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,220,.07)' : 'rgba(0,20,0,.07)'; g.fillRect(0, i * h / 4, w, h / 4); } speckle(g, w, h, 26000, ['rgba(120,160,60,.55)', 'rgba(40,70,20,.5)', 'rgba(150,170,80,.35)', 'rgba(60,95,35,.55)', 'rgba(130,110,60,.2)'], 2.2); }, true);
  grassTex.repeat.set(90, 90);
  const ground = mesh(new THREE.PlaneGeometry(3600, 3600), M({ map: grassTex }), MID[0], -0.04, MID[1], null, false); ground.rotation.x = -Math.PI / 2;

  /* the road is built as ribbons that follow the true lap */
  const lapPts = [];
  makeLapShape().forEach((p) => lapPts.push(p));
  const lap = pathFrom(lapPts);
  function makeLapShape() { const out = []; for (let c = 0; c < 3; c++) { for (let k = 0; k <= 80; k++) out.push(bez(WORLD[c], k / 80)); const A = WORLD[c].X, B = WORLD[(c + 1) % 3].E, n = Math.ceil(vlen(sub(B, A)) / 3); for (let k = 1; k < n; k++) out.push(mix(A, B, k / n)); } out.push(out[0].slice()); return out; }
  function ribbon(from, to, a, b, y, mat, vScale, up) {
    const pos = [], uv = [], idx = [], n = Math.max(2, Math.ceil((to - from) / 2.5));
    for (let i = 0; i <= n; i++) { const s = from + (to - from) * i / n, c = at(lap, ((s % lap.len) + lap.len) % lap.len), d = dirAt(lap, ((s % lap.len) + lap.len) % lap.len), l = leftOf(d); const ha = up ? y : y, hb = up ? y + up : y; pos.push(c[0] + l[0] * a, ha, c[1] + l[1] * a, c[0] + l[0] * b, hb, c[1] + l[1] * b); uv.push(0, s / vScale, 1, s / vScale); if (i < n) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const o = new THREE.Mesh(g, mat); o.receiveShadow = true; scene.add(o); return o;
  }
  const asphalt = canvas(512, 512, (g, w, h) => { g.fillStyle = '#46484c'; g.fillRect(0, 0, w, h); speckle(g, w, h, 30000, ['#55585d', '#393b3f', '#62656a', '#2f3134', '#4d4a46'], 2); for (let i = 0; i < 14; i++) { g.fillStyle = 'rgba(15,15,17,' + (0.05 + seeded() * 0.08) + ')'; const x = seeded() < 0.5 ? w * (0.3 + seeded() * 0.12) : w * (0.58 + seeded() * 0.12); g.fillRect(x, 0, 5 + seeded() * 14, h); } }, true);
  const flat = (o) => M(Object.assign({ side: THREE.DoubleSide }, o));
  ribbon(0, lap.len, -ROAD / 2 - 5, ROAD / 2 + 5, 0.005, flat({ color: 0x77746c, map: asphalt }), 22);
  ribbon(0, lap.len, -ROAD / 2, ROAD / 2, 0.03, flat({ map: asphalt, roughness: 0.78 }), 16);
  const paint = flat({ color: 0xf2f2ee, roughness: 0.6 });
  ribbon(0, lap.len, ROAD / 2 - 0.55, ROAD / 2 - 0.15, 0.045, paint, 8); ribbon(0, lap.len, -ROAD / 2 + 0.15, -ROAD / 2 + 0.55, 0.045, paint, 8);
  const kerbTex = canvas(64, 128, (g, w, h) => { g.fillStyle = '#d3231f'; g.fillRect(0, 0, w, h / 2); g.fillStyle = '#eeece6'; g.fillRect(0, h / 2, w, h / 2); speckle(g, w, h, 500, ['rgba(0,0,0,.18)', 'rgba(255,255,255,.12)'], 2); }, true);
  const kerb = flat({ map: kerbTex, roughness: 0.65 });
  const gravelTex = canvas(256, 256, (g, w, h) => { g.fillStyle = '#b79f76'; g.fillRect(0, 0, w, h); speckle(g, w, h, 9000, ['#d8c49c', '#96805c', '#c9b48a', '#7d6a4b', '#e6d6b2'], 3); }, true);
  const starts = []; { let s = 0; for (let c = 0; c < 3; c++) { let arc = 0, prev = bez(WORLD[c], 0); for (let k = 1; k <= 80; k++) { const q = bez(WORLD[c], k / 80); arc += vlen(sub(q, prev)); prev = q; } starts.push([s, s + arc]); s += arc + vlen(sub(WORLD[(c + 1) % 3].E, WORLD[c].X)); } }
  starts.forEach(([a, b]) => {
    ribbon(a + 4, b - 4, -ROAD / 2 - 1.7, -ROAD / 2 + 0.05, 0.05, kerb, 5, 0); ribbon(a - 10, a + (b - a) * 0.22, ROAD / 2 - 0.05, ROAD / 2 + 1.7, 0.05, kerb, 5); ribbon(b - (b - a) * 0.3, b + 24, ROAD / 2 - 0.05, ROAD / 2 + 1.7, 0.05, kerb, 5);
    ribbon(a - 14, b + 14, ROAD / 2 + 5, ROAD / 2 + 24, 0.012, flat({ map: gravelTex }), 14);
  });
  /* steel barriers, with posts, all the way round the outside; tyre stacks at the corners */
  const steel = flat({ color: 0xaeb6bd, metalness: 0.75, roughness: 0.38 });
  [[ROAD / 2 + 27], [-ROAD / 2 - 13]].forEach(([off]) => { [0.55, 0.98].forEach((h) => { const s = Math.sign(off); ribbon(0, lap.len, off, off + s * 0.02, h, steel, 4, 0.3); }); });
  const dummy = new THREE.Object3D(), posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 1.35, 0.16), M({ color: 0x59626a, metalness: 0.6, roughness: 0.5 }), 1400); let np = 0;
  for (let s = 0; s < lap.len; s += 4) [ROAD / 2 + 27.1, -ROAD / 2 - 13.1].forEach((off) => { const c = at(lap, s), l = leftOf(dirAt(lap, s)); if (np < 1400) { dummy.position.set(c[0] + l[0] * off, 0.67, c[1] + l[1] * off); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); posts.setMatrixAt(np++, dummy.matrix); } });
  posts.count = np; posts.castShadow = true; scene.add(posts);
  const tyres = new THREE.InstancedMesh(new THREE.TorusGeometry(0.62, 0.3, 8, 16), M({ color: 0x151517, roughness: 0.85 }), 420); let nt = 0;
  starts.forEach(([a, b]) => { for (let s = a; s < b + 20; s += 1.7) { const c = at(lap, s % lap.len), l = leftOf(dirAt(lap, s % lap.len)); for (let h = 0; h < 2; h++) { if (nt >= 420) return; dummy.position.set(c[0] + l[0] * (ROAD / 2 + 25.6), 0.32 + h * 0.56, c[1] + l[1] * (ROAD / 2 + 25.6)); dummy.rotation.set(Math.PI / 2, 0, 0); dummy.updateMatrix(); tyres.setMatrixAt(nt++, dummy.matrix); } } });
  tyres.count = nt; tyres.castShadow = true; scene.add(tyres);

  /* start line, grid boxes and gantry in the middle of the start straight */
  const A3 = WORLD[2].X, B3 = WORLD[0].E, startPos = mix(A3, B3, 0.46), startDir = norm(sub(B3, A3)), startLeft = leftOf(startDir);
  let startS = 0; { let best = 1e9; lap.pts.forEach((p, i) => { const d = vlen(sub(p, startPos)); if (d < best) { best = d; startS = lap.cum[i]; } }); }
  const check = canvas(128, 32, (g) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#0d0d0e' : '#f4f4f0'; g.fillRect(i * 8, j * 8, 8, 8); } });
  const face = -Math.atan2(startDir[1], startDir[0]);
  const local = (fwd, side) => add(startPos, add(mul(startDir, fwd), mul(startLeft, side)));
  const decal = (fwd, side, w, d, mat, y) => { const p = local(fwd, side), o = mesh(new THREE.PlaneGeometry(w, d), mat, p[0], y || 0.055, p[1], null, false); o.rotation.set(-Math.PI / 2, 0, -face); return o; };
  decal(3.4, 0, 3, ROAD - 1.2, M({ map: (() => { const t = check.clone(); t.needsUpdate = true; t.center.set(0.5, 0.5); t.rotation = Math.PI / 2; return t; })() }));
  [[-4.5, 3.5], [-11, -3.5], [-17.5, 3.5], [-24, -3.5]].forEach(([f, s]) => { decal(f + 2.6, s, 0.25, 3.4, paint, 0.056); decal(f + 1.4, s + 1.7, 2.6, 0.22, paint, 0.056); decal(f + 1.4, s - 1.7, 2.6, 0.22, paint, 0.056); });
  const dark = M({ color: 0x1b2027, metalness: 0.5, roughness: 0.45 });
  const gantry = new THREE.Group(); const gp = local(9, 0); gantry.position.set(gp[0], 0, gp[1]); gantry.rotation.y = face; scene.add(gantry);
  [-ROAD / 2 - 3.5, ROAD / 2 + 3.5].forEach((z) => { mesh(new THREE.BoxGeometry(0.7, 8.4, 0.7), dark, 0, 4.2, z, gantry); }); mesh(new THREE.BoxGeometry(1.1, 1.7, ROAD + 8), dark, 0, 8.8, 0, gantry);
  const sign = (text, bg, fg, w, h) => M({ map: canvas(512, Math.round(512 * h / w), (g, cw, ch) => { g.fillStyle = bg; g.fillRect(0, 0, cw, ch); g.fillStyle = fg; g.font = '800 ' + Math.round(ch * 0.66) + "px 'Saira Condensed',Arial Narrow,sans-serif"; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, cw / 2, ch / 2 + ch * 0.04, cw * 0.92); }), roughness: 0.55 });
  [-1, 1].forEach((side) => { const b = mesh(new THREE.PlaneGeometry(ROAD + 6, 1.35), sign('HYPOTENUSE GRAND PRIX', '#0c1118', '#ffcb1f', ROAD + 6, 1.35), side * 0.57, 8.8, 0, gantry, false); b.rotation.y = side * Math.PI / 2; });
  const lamps = [-3.4, -1.7, 0, 1.7, 3.4].map((z) => mesh(new THREE.SphereGeometry(0.34, 14, 10), new THREE.MeshBasicMaterial({ color: 0x2a0808 }), -0.75, 7.6, z, gantry, false));

  /* grandstand with a crowd, pit garages, advertising boards */
  const crowd = canvas(1024, 256, (g, w, h) => { g.fillStyle = '#5d646c'; g.fillRect(0, 0, w, h); for (let row = 0; row < 9; row++) { const y = row * 28 + 12; g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, y + 14, w, 5); for (let x = 4; x < w; x += 9 + seeded() * 4) { if (seeded() < 0.08) continue; g.fillStyle = ['#d8332c', '#f4c21f', '#2f6fd6', '#f1f1ec', '#2f9d5a', '#e8782c', '#222831', '#9b59b6'][Math.floor(seeded() * 8)]; g.fillRect(x, y + 3, 7, 12); g.fillStyle = ['#f1c7a3', '#c68b5e', '#8a5a3a', '#e6b58e'][Math.floor(seeded() * 4)]; g.beginPath(); g.arc(x + 3.5, y, 3.6, 0, 7); g.fill(); } } });
  const stand = (fwd, side, long) => { const p = local(fwd, side), g = new THREE.Group(); g.position.set(p[0], 0, p[1]); g.rotation.y = face + (side > 0 ? Math.PI : 0); scene.add(g);
    const slope = mesh(new THREE.PlaneGeometry(long, 13), M({ map: crowd, side: THREE.DoubleSide }), 0, 5.2, -5, g); slope.rotation.x = -0.95; mesh(new THREE.BoxGeometry(long, 1.4, 0.4), M({ color: 0xd6dbe0 }), 0, 0.7, 0.4, g); mesh(new THREE.BoxGeometry(long + 2, 0.35, 9), M({ color: 0x20486f, metalness: 0.4, roughness: 0.5 }), 0, 12.4, -7.5, g);
    for (let x = -long / 2; x <= long / 2 + 0.1; x += long / 6) { mesh(new THREE.CylinderGeometry(0.18, 0.18, 12.4, 8), dark, x, 6.2, -11, g); } mesh(new THREE.BoxGeometry(long, 8.6, 0.4), M({ color: 0x8f979f }), 0, 4.3, -11.4, g); };
  stand(10, -ROAD / 2 - 24, 74); stand(-70, -ROAD / 2 - 24, 52);
  const garage = canvas(1024, 192, (g, w, h) => { g.fillStyle = '#e7e9ea'; g.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { const x = i * 128 + 10; g.fillStyle = '#1c232b'; g.fillRect(x, 70, 108, 122); g.fillStyle = 'rgba(160,200,230,.35)'; g.fillRect(x, 14, 108, 40); g.fillStyle = ['#d8332c', '#2f6fd6', '#f4c21f', '#2f9d5a'][i % 4]; g.fillRect(x, 56, 108, 12); g.fillStyle = '#fff'; g.font = "800 30px Arial"; g.fillText(String(i * 7 + 3), x + 40, 110); } });
  { const p = local(-15, ROAD / 2 + 40), g = new THREE.Group(); g.position.set(p[0], 0, p[1]); g.rotation.y = face; scene.add(g); mesh(new THREE.BoxGeometry(86, 7, 12), M({ color: 0xcfd3d6 }), 0, 3.5, 0, g); const f = mesh(new THREE.PlaneGeometry(86, 6.8), M({ map: garage }), 0, 3.5, 6.05, g, false); f.castShadow = false; mesh(new THREE.BoxGeometry(90, 0.5, 15), M({ color: 0x2a323b }), 0, 7.3, 0.8, g); mesh(new THREE.BoxGeometry(30, 3.4, 8), M({ color: 0x1d2b38, metalness: 0.6, roughness: 0.2 }), 18, 9.2, -1, g); }
  const brands = [['VECTOR TYRES', '#0e1116', '#ffffff'], ['APEX FUEL', '#d8332c', '#ffffff'], ['GRADIENT', '#f4c21f', '#14202e'], ['PARABOLA', '#1c5fb8', '#ffffff'], ['LASTMIND', '#f4f1e8', '#14202e']];
  for (let i = 0; i < 24; i++) { const s = (i + 0.35) * lap.len / 24, c = at(lap, s), d = dirAt(lap, s), l = leftOf(d); if (vlen(sub(c, startPos)) < 110) continue; const off = -ROAD / 2 - 14.5, b = brands[i % brands.length], o = mesh(new THREE.PlaneGeometry(14, 2.4), sign(b[0], b[1], b[2], 14, 2.4), c[0] + l[0] * off, 2.5, c[1] + l[1] * off, null, false); o.rotation.y = -Math.atan2(d[1], d[0]); const back = mesh(o.geometry, o.material, 0, 0, -0.03, o, false); back.rotation.y = Math.PI; }
  // braking boards before each corner
  starts.forEach(([a]) => [100, 50].forEach((m) => { const s = (a - m + lap.len) % lap.len, c = at(lap, s), d = dirAt(lap, s), l = leftOf(d), o = mesh(new THREE.PlaneGeometry(2.4, 1.7), sign(String(m), '#f4f1e8', '#14202e', 2.4, 1.7), c[0] + l[0] * (ROAD / 2 + 6), 1.5, c[1] + l[1] * (ROAD / 2 + 6), null, true); o.rotation.y = -Math.atan2(d[1], d[0]) - Math.PI / 2; const back = mesh(o.geometry, o.material, 0, 0, -0.03, o, false); back.rotation.y = Math.PI; }));

  /* trees: painted foliage on crossed cards, two kinds */
  const treeTex = (pine) => canvas(256, 384, (g, w, h) => { g.fillStyle = '#4a3524'; g.fillRect(w / 2 - 9, h * 0.7, 18, h * 0.3); for (let i = 0; i < 2600; i++) { const t = seeded(); let x, y; if (pine) { y = h * (0.04 + t * 0.82); const half = (y / h) * w * 0.4 * (0.55 + 0.45 * ((y * 9 / h) % 1)); x = w / 2 + (seeded() - 0.5) * 2 * half; } else { const a = seeded() * 6.283, r = Math.sqrt(seeded()); const blob = Math.floor(seeded() * 5), bx = [0, -55, 52, -28, 34][blob], by = [-10, 28, 24, 66, 70][blob]; x = w / 2 + bx + Math.cos(a) * r * 66; y = h * 0.32 + by + Math.sin(a) * r * 66; } const light = 1 - y / h; g.fillStyle = 'hsl(' + (pine ? 112 : 92) + seeded() * 16 + ',' + (38 + seeded() * 20) + '%,' + (13 + light * 22 + seeded() * 12) + '%)'; g.beginPath(); g.ellipse(x, y, 3 + seeded() * 7, 2 + seeded() * 4, seeded() * 3, 0, 7); g.fill(); } });
  const distLap = (x, z) => { let best = 1e9; for (let i = 0; i < lap.pts.length; i += 3) best = Math.min(best, Math.hypot(x - lap.pts[i][0], z - lap.pts[i][1])); return best; };
  const spots = []; for (let i = 0; i < 9000 && spots.length < 1100; i++) { const x = MID[0] + (seeded() - 0.5) * 1500, z = MID[1] + (seeded() - 0.5) * 1300; const clump = Math.sin(x * 0.021) + Math.cos(z * 0.027) + Math.sin((x + z) * 0.011); if (distLap(x, z) < 52 || vlen(sub([x, z], startPos)) < 105 || clump < 0.15) continue; spots.push([x, z, 0.75 + seeded() * 0.8, seeded()]); }
  [true, false].forEach((pine) => {
    const list = spots.filter((s) => (s[3] > 0.5) === pine), card = new THREE.PlaneGeometry(8, 12); card.translate(0, 6, 0);
    const mat = new THREE.MeshLambertMaterial({ map: treeTex(pine), alphaTest: 0.45, side: THREE.DoubleSide, emissive: 0x16210c });
    [0, Math.PI / 2].forEach((turn) => { const im = new THREE.InstancedMesh(card, mat, list.length); list.forEach((s, i) => { dummy.position.set(s[0], 0, s[1]); dummy.rotation.set(0, turn + s[3] * 6, 0); dummy.scale.setScalar(s[2]); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); }); im.frustumCulled = false; scene.add(im); });
  });
  const crown = canvas(128, 128, (g) => { for (let i = 0; i < 90; i++) { const a = seeded() * 6.28, r = Math.sqrt(seeded()) * 44; g.fillStyle = ['#2c5420', '#3b6a28', '#4d7f31', '#5f8f3a'][i % 4]; g.beginPath(); g.arc(64 + Math.cos(a) * r - 3, 64 + Math.sin(a) * r - 3, 9 + seeded() * 9, 0, 7); g.fill(); } });
  const disc_ = new THREE.PlaneGeometry(9, 9); disc_.rotateX(-Math.PI / 2); const canopy = new THREE.InstancedMesh(disc_, new THREE.MeshLambertMaterial({ map: crown, alphaTest: 0.5 }), spots.length), spot_ = new THREE.Object3D();
  spots.forEach((s, i) => { spot_.position.set(s[0], 5.5, s[1]); spot_.scale.setScalar(s[2]); spot_.rotation.y = s[3] * 6; spot_.updateMatrix(); canopy.setMatrixAt(i, spot_.matrix); }); canopy.frustumCulled = false; canopy.visible = false; scene.add(canopy);
  /* rolling hills all round, and a lake */
  { const g = new THREE.RingGeometry(620, 1750, 128, 12), pos = g.attributes.position, col = []; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), r = Math.hypot(x, y), a = Math.atan2(y, x), rise = Math.max(0, Math.min(1, (r - 640) / 420)), h = rise * (60 + 55 * Math.sin(a * 5 + 1) + 34 * Math.sin(a * 11 + r * 0.006) + 18 * Math.sin(a * 23)); pos.setZ(i, h); const k = Math.min(1, h / 150), c = new THREE.Color(0x3f6428).lerp(new THREE.Color(0x76805f), k); c.offsetHSL(0, 0, (seeded() - 0.5) * 0.05); col.push(c.r, c.g, c.b); } g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); const hills = mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }), MID[0], -2, MID[1], null, false); hills.rotation.x = -Math.PI / 2; hills.receiveShadow = false; }
  { const lakeAt = add(VERT[1], mul(norm(sub(VERT[1], MID)), 140)); const water = mesh(new THREE.CircleGeometry(80, 48), new THREE.MeshStandardMaterial({ color: 0x2a5f7a, roughness: 0.08, metalness: 0.85, envMap: env }), lakeAt[0], 0.0, lakeAt[1], null, false); water.rotation.x = -Math.PI / 2; water.scale.set(1.4, 0.8, 1); const shore = mesh(new THREE.RingGeometry(79, 87, 48), M({ map: gravelTex }), lakeAt[0], 0.002, lakeAt[1], null, false); shore.rotation.x = -Math.PI / 2; shore.scale.set(1.4, 0.8, 1); }

  /* soft shadow that sits under each car */
  const contact = canvas(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 8, 64, 64, 62); r.addColorStop(0, 'rgba(0,0,0,.62)'); r.addColorStop(0.6, 'rgba(0,0,0,.35)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
  return { canopy, env, sun, lamps, lap, startS, startPos, contact, canvas, MID, tick(t) { skyMat.uniforms.time.value = t; } };
}

/* ================= a GT racing car, shaped from cross-sections so the bodywork is smooth ================= */
function smoothThrough(keys, x) {
  const n = keys.length; if (x <= keys[0][0]) return keys[0][1]; if (x >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0; while (x > keys[i + 1][0]) i++;
  const p0 = keys[Math.max(0, i - 1)][1], p1 = keys[i][1], p2 = keys[i + 1][1], p3 = keys[Math.min(n - 1, i + 2)][1], t = (x - keys[i][0]) / (keys[i + 1][0] - keys[i][0]);
  return 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);
}
function makeCar(THREE, world, o) {
  const env = world.env;
  const paint = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.45, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06, envMap: env, envMapIntensity: 1.15, side: THREE.DoubleSide });
  const solid = new THREE.MeshPhysicalMaterial({ color: o.colour, metalness: 0.45, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06, envMap: env, envMapIntensity: 1.15 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0a1119, metalness: 0.9, roughness: 0.04, envMap: env, envMapIntensity: 1.5, side: THREE.DoubleSide });
  const carbon = new THREE.MeshStandardMaterial({ color: 0x101113, metalness: 0.35, roughness: 0.42, envMap: env });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x0e0e0f, roughness: 0.88, metalness: 0 });
  const alloy = new THREE.MeshStandardMaterial({ color: o.rim, metalness: 0.95, roughness: 0.24, envMap: env });
  const disc = new THREE.MeshStandardMaterial({ color: 0x8b8680, metalness: 0.8, roughness: 0.45, envMap: env });
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const add_ = (g, m, x, y, z, parent) => { const e = new THREE.Mesh(g, m); e.position.set(x || 0, y || 0, z || 0); e.castShadow = true; (parent || body).add(e); return e; };

  /* the livery is painted flat and wrapped round the shell: u runs along the car, v round each section (0.5 is the roofline) */
  paint.map = world.canvas(1024, 512, (g, w, h) => {
    g.fillStyle = o.css; g.fillRect(0, 0, w, h);
    g.fillStyle = o.stripe; [[0.462, 0.018], [0.52, 0.018]].forEach(([v, t]) => g.fillRect(0, (1 - v - t) * h, w, t * h));
    // a swept flash along each flank
    [0.2, 0.8].forEach((v) => { const y = (1 - v) * h, up = v < 0.5 ? -1 : 1; g.beginPath(); g.moveTo(w * 0.08, y + up * 4); g.quadraticCurveTo(w * 0.45, y - up * 6, w * 0.74, y - up * 34); g.lineTo(w * 0.68, y - up * 4); g.quadraticCurveTo(w * 0.4, y + up * 22, w * 0.08, y + up * 18); g.closePath(); g.fillStyle = o.stripe; g.fill(); });
    g.fillStyle = 'rgba(10,10,12,.92)'; g.fillRect(0, h * 0.955, w, h * 0.045); g.fillRect(0, 0, w, h * 0.045);
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; [0.27, 0.5, 0.74].forEach((u) => { g.beginPath(); g.moveTo(u * w, 0); g.lineTo(u * w, h * 0.34); g.moveTo(u * w, h * 0.66); g.lineTo(u * w, h); g.stroke(); });
  });

  const X0 = -2.34, X1 = 2.4, AXLES = [1.46, -1.42], ARCH = 0.52;
  const HALF = [[-2.34, 0.8], [-2.15, 0.95], [-1.45, 1.05], [-0.75, 0.92], [0.35, 0.92], [1.46, 1.04], [2.02, 0.94], [2.3, 0.74], [2.4, 0.42]];
  const TOP = [[-2.34, 0.84], [-2.18, 0.99], [-1.35, 1.03], [-0.2, 0.97], [0.75, 0.9], [1.46, 0.82], [1.98, 0.66], [2.3, 0.5], [2.4, 0.38]];
  const FLOOR = [[-2.34, 0.42], [-2.05, 0.26], [-0.5, 0.2], [1.9, 0.2], [2.4, 0.25]];
  // half a cross-section: [fraction of width, fraction of height]
  const SEC = [[0, 0], [0.5, 0], [0.84, 0.01], [0.955, 0.09], [0.99, 0.28], [0.975, 0.46], [1.0, 0.64], [0.985, 0.8], [0.92, 0.92], [0.78, 0.985], [0.55, 0.975], [0.3, 1.0], [0, 1.0]];
  function loft(stations, ring, material, group) {
    const pos = [], uv = [], idx = [[], []], R = ring(stations[0]).length;
    stations.forEach((x, i) => ring(x).forEach((p, j) => { pos.push(x, p[0], p[1]); uv.push((x - X0) / (X1 - X0), j / (R - 1)); }));
    for (let i = 0; i < stations.length - 1; i++) for (let j = 0; j < R - 1; j++) { const a = i * R + j, b = a + R, g = group ? group((stations[i] + stations[i + 1]) / 2, (j + 0.5) / (R - 1)) : 0; idx[g].push(a, a + 1, b, b, a + 1, b + 1); }
    // close both ends
    [0, stations.length - 1].forEach((i, end) => { const c = pos.length / 3, r = ring(stations[i]); let y = 0; r.forEach((p) => { y += p[0]; }); pos.push(stations[i], y / r.length, 0); uv.push(end, 0.02); for (let j = 0; j < R - 1; j++) { if (end) idx[0].push(c, i * R + j + 1, i * R + j); else idx[0].push(c, i * R + j, i * R + j + 1); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); const all = idx[0].concat(idx[1]); g.setIndex(all); if (group) { g.addGroup(0, idx[0].length, 0); g.addGroup(idx[0].length, idx[1].length, 1); } g.computeVertexNormals(); return add_(g, material, 0, 0, 0);
  }
  const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + (b - a) * i / n);
  // the main shell, with a true arch cut over each wheel
  loft(range(X0, X1, 110), (x) => {
    const w = smoothThrough(HALF, x), t = smoothThrough(TOP, x), f = smoothThrough(FLOOR, x), side = [];
    SEC.forEach(([a, b], j) => { const next = SEC[Math.min(SEC.length - 1, j + 1)]; [0, 0.5].forEach((k) => { if (k && j === SEC.length - 1) return; const wf = a + (next[0] - a) * k, hf = b + (next[1] - b) * k; let y = f + hf * (t - f), z = wf * w; AXLES.forEach((ax) => { const d = x - ax; if (Math.abs(d) < ARCH && z > 0.5) { const arch = 0.4 + Math.sqrt(ARCH * ARCH - d * d); if (y < arch) y = Math.min(arch, t - 0.03); } }); side.push([y, z]); }); });
    return side.concat(side.slice(0, -1).reverse().map((p) => [p[0], -p[1]]));
  }, paint);
  // the glasshouse: dark glass, painted roof and pillars
  const ROOF = [[-1.38, 0.98], [-1.0, 1.2], [-0.6, 1.38], [-0.1, 1.43], [0.3, 1.34], [0.95, 0.9]];
  loft(range(-1.38, 0.95, 46), (x) => {
    const top = smoothThrough(ROOF, x), base = 0.86, tall = Math.max(0.01, top - base), wb = 0.8 - Math.max(0, x - 0.4) * 0.18, wt = wb - tall * 0.36;
    const side = [[base, wb], [base + tall * 0.34, wb - tall * 0.07], [base + tall * 0.68, wb - tall * 0.2], [base + tall * 0.9, wt], [base + tall * 0.975, wt * 0.82], [base + tall, wt * 0.45], [base + tall * 1.012, 0]];
    return side.concat(side.slice(0, -1).reverse().map((p) => [p[0], -p[1]]));
  }, [glass, solid], (x, v) => { const roof = Math.abs(v - 0.5) < 0.2 && x > -0.78 && x < 0.18, pillar = Math.abs(x + 0.52) < 0.05, rail = (Math.abs(v - 0.27) < 0.04 || Math.abs(v - 0.73) < 0.04) && x > -1.1 && x < 0.55; return roof || pillar || rail ? 1 : 0; });

  /* aerodynamic parts */
  const slab = (pts, depth, mat, x, y, z, bevel) => { const s = new THREE.Shape(); pts.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]))); const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: !!bevel, bevelSize: bevel || 0, bevelThickness: bevel || 0, bevelSegments: 2 }); g.translate(0, 0, -depth / 2); return add_(g, mat, x, y, z); };
  const splitter = slab([[1.75, -0.98], [2.34, -0.9], [2.56, -0.55], [2.58, 0.55], [2.34, 0.9], [1.75, 0.98]], 0.05, carbon, 0, 0.19, 0); splitter.rotation.x = Math.PI / 2;
  [-1, 1].forEach((s) => {
    add_(new THREE.BoxGeometry(2.0, 0.13, 0.1), carbon, 0.02, 0.28, s * 0.94);
    const canard = add_(new THREE.BoxGeometry(0.34, 0.025, 0.22), carbon, 2.12, 0.46, s * 0.9); canard.rotation.set(s * 0.12, -s * 0.5, 0.22);
    // lights
    const head = add_(new THREE.SphereGeometry(0.16, 16, 10), new THREE.MeshPhysicalMaterial({ color: 0xe8f4ff, emissive: 0xbfd8ff, emissiveIntensity: 0.7, roughness: 0.05, metalness: 0.2, envMap: env }), 2.14, 0.6, s * 0.62); head.scale.set(1.25, 0.34, 0.8); head.rotation.z = -0.34;
    add_(new THREE.BoxGeometry(0.06, 0.09, 0.5), new THREE.MeshStandardMaterial({ color: 0x5c0505, emissive: 0xff1a12, emissiveIntensity: 0.9 }), -2.37, 0.8, s * 0.5);
    // mirrors
    add_(new THREE.BoxGeometry(0.05, 0.05, 0.26), carbon, 0.72, 1.02, s * 0.9); const m = add_(new THREE.SphereGeometry(0.13, 14, 10), solid, 0.7, 1.06, s * 1.06); m.scale.set(0.85, 0.7, 1.15); add_(new THREE.PlaneGeometry(0.2, 0.13), glass, 0.585, 1.06, s * 1.06).rotation.y = -Math.PI / 2;
    // side intake
    const duct = add_(new THREE.SphereGeometry(0.2, 12, 8), carbon, -0.72, 0.62, s * 0.9); duct.scale.set(1.7, 0.55, 0.3);
    // wing mounts and end plates
    slab([[-2.0, 1.0], [-1.86, 1.0], [-2.12, 1.5], [-2.26, 1.5]], 0.05, carbon, 0, 0, s * 0.52);
    slab([[-2.54, 1.28], [-1.98, 1.34], [-2.02, 1.6], [-2.5, 1.62]], 0.035, carbon, 0, 0, s * 1.03);
  });
  slab([[-2.52, 1.5], [-2.28, 1.545], [-2.05, 1.525], [-2.02, 1.5], [-2.3, 1.485], [-2.52, 1.49]], 2.04, solid, 0, 0, 0, 0.008);
  slab([[-2.54, 1.56], [-2.4, 1.575], [-2.4, 1.545], [-2.54, 1.535]], 2.04, carbon, 0, 0, 0);
  // rear diffuser, grille, exhausts
  for (let k = -3; k <= 3; k++) slab([[-2.45, 0.2], [-1.95, 0.2], [-1.95, 0.24], [-2.45, 0.42]], 0.025, carbon, 0, 0, k * 0.24);
  add_(new THREE.BoxGeometry(0.05, 0.28, 1.5), carbon, -2.34, 0.55, 0);
  const grille = add_(new THREE.SphereGeometry(0.3, 18, 10), carbon, 2.31, 0.34, 0); grille.scale.set(0.35, 0.36, 1.7);
  const flames = [];
  [-0.26, 0.26].forEach((z) => { const pipe = add_(new THREE.CylinderGeometry(0.095, 0.095, 0.2, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0xb9bec4, metalness: 1, roughness: 0.22, envMap: env, side: THREE.DoubleSide }), -2.42, 0.45, z); pipe.rotation.z = Math.PI / 2; const f = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.8, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); f.rotation.z = Math.PI / 2; f.position.set(-2.92, 0.45, z); f.visible = false; body.add(f); flames.push(f); });
  slab([[-0.45, 1.43], [0.05, 1.44], [-0.15, 1.52], [-0.45, 1.5]], 0.22, carbon, 0, 0, 0, 0.02);
  const roundel = new THREE.MeshStandardMaterial({ map: world.canvas(128, 128, (g) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.fillStyle = '#101418'; g.font = "800 80px 'Saira Condensed',Arial Narrow"; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(o.number, 64, 70); }), transparent: true, roughness: 0.4 });
  [1, -1].forEach((s) => { const d = add_(new THREE.CircleGeometry(0.25, 28), roundel, 0.12, 0.62, s * 0.945); if (s < 0) d.rotation.y = Math.PI; });

  /* wheels: treaded rubber, ten-spoke alloy, brake disc and caliper */
  const wheels = [], steer = [];
  const lathe = (w, R) => { const p = [[R * 0.66, -w / 2], [R * 0.86, -w / 2 - 0.012], [R * 0.97, -w / 2 + 0.03], [R, -w / 2 + 0.07], [R, w / 2 - 0.07], [R * 0.97, w / 2 - 0.03], [R * 0.86, w / 2 + 0.012], [R * 0.66, w / 2]].map((q) => new THREE.Vector2(q[0], q[1])); const g = new THREE.LatheGeometry(p, 40); g.rotateX(Math.PI / 2); return g; };
  [[AXLES[0], 1, 0.36], [AXLES[0], -1, 0.36], [AXLES[1], 1, 0.44], [AXLES[1], -1, 0.44]].forEach(([x, s, w]) => {
    const pivot = new THREE.Group(); pivot.position.set(x, 0.41, s * 0.86); root.add(pivot); const spin = new THREE.Group(); pivot.add(spin);
    add_(lathe(w, 0.415), rubber, 0, 0, 0, spin);
    const barrel = add_(new THREE.CylinderGeometry(0.28, 0.28, w * 0.96, 32, 1, true), alloy, 0, 0, 0, spin); barrel.rotation.x = Math.PI / 2; barrel.material = alloy; alloy.side = THREE.DoubleSide;
    const lip = add_(new THREE.TorusGeometry(0.278, 0.018, 8, 40), alloy, 0, 0, s * (w / 2 - 0.005), spin);
    const rotor = add_(new THREE.CylinderGeometry(0.21, 0.21, 0.04, 28), disc, 0, 0, s * (w / 2 - 0.13), spin); rotor.rotation.x = Math.PI / 2;
    for (let k = 0; k < 10; k++) { const g = new THREE.BoxGeometry(0.032, 0.25, 0.035); g.translate(0, 0.15, 0); const spoke = add_(g, alloy, 0, 0, s * (w / 2 - 0.045), spin); spoke.rotation.z = k * Math.PI / 5 + (k % 2 ? 0.07 : -0.07); }
    const hub = add_(new THREE.CylinderGeometry(0.075, 0.085, 0.09, 18), new THREE.MeshStandardMaterial({ color: o.colour, metalness: 0.7, roughness: 0.3, envMap: env }), 0, 0, s * (w / 2 - 0.01), spin); hub.rotation.x = Math.PI / 2;
    add_(new THREE.BoxGeometry(0.1, 0.17, 0.07), new THREE.MeshStandardMaterial({ color: 0xffb300, metalness: 0.4, roughness: 0.4 }), -0.17, 0.05, s * (w / 2 - 0.1), pivot);
    wheels.push(spin); if (x > 0) steer.push(pivot);
  });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 3.4), new THREE.MeshBasicMaterial({ map: world.contact, transparent: true, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.06; root.add(shadow);
  root.scale.setScalar(1.12);
  return { root, body, wheels, steer, flames, last: null, flare: 0 };
}

/* ================= engine and road sound, made in the browser: no recordings, no downloads =================
   An engine note is a stream of exhaust pulses. Each pulse rings the pipes (a few damped resonances) with a puff of noise,
   and the eight cylinders never fire quite evenly. Three loops, made at low, middle and high revs, are cross-faded and
   re-pitched, then driven into soft distortion so it barks under load, with pops and bangs on the gear changes.        */
const GEARS = [0, 24, 38, 51, 63, 76, 98];
function gearbox(v) { let g = 1; while (g < 6 && v > GEARS[g]) g++; const lo = GEARS[g - 1], hi = GEARS[g]; const f = clamp((v - lo) / (hi - lo), 0, 1); return { gear: g, rpm: g === 1 ? 2600 + f * 5900 : 5000 + f * 3500 }; }
const Snd = {
  ctx: null, on: true,
  loopBuffer(rpm) {
    const c = this.ctx, rate = c.sampleRate, cycles = 14, cycle = 120 / rpm, n = Math.round(rate * cycle * cycles), data = new Float32Array(n);
    let seed = rpm; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    // uneven strength and timing per cylinder is what gives a V8 its burble
    const strength = [1, 0.62, 0.88, 0.55, 0.95, 0.7, 0.8, 0.5], skew = [0, 0.09, -0.05, 0.12, -0.02, 0.07, -0.08, 0.04];
    const modes = [[62, 1.0, 0.016], [118, 0.85, 0.011], [236, 0.55, 0.0075], [410, 0.34, 0.0048], [790, 0.17, 0.0028], [1460, 0.09, 0.0016]];
    for (let k = 0; k < cycles * 8; k++) {
      const cyl = k % 8, start = Math.floor(((k + skew[cyl] * 0.6 + (rnd() - 0.5) * 0.05) / 8) * cycle * rate), amp = strength[cyl] * (0.85 + rnd() * 0.3), len = Math.floor(rate * 0.045), detune = 0.94 + rnd() * 0.12;
      for (let i = 0; i < len; i++) {
        const t = i / rate; let v = (rnd() * 2 - 1) * Math.exp(-t / 0.0022) * 0.55;
        for (const m of modes) v += m[1] * Math.sin(2 * Math.PI * m[0] * detune * t + cyl) * Math.exp(-t / m[2]);
        data[(((start + i) % n) + n) % n] += v * amp * Math.min(1, i / (rate * 0.0004));
      }
    }
    let peak = 0, mean = 0; for (let i = 0; i < n; i++) mean += data[i]; mean /= n; for (let i = 0; i < n; i++) { data[i] -= mean; peak = Math.max(peak, Math.abs(data[i])); }
    for (let i = 0; i < n; i++) data[i] /= peak || 1;
    const buf = c.createBuffer(1, n, rate); buf.getChannelData(0).set(data); return buf;
  },
  voice(volume) {
    const c = this.ctx, drive = c.createWaveShaper(), curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; curve[i] = Math.tanh(x * 2.6 + 0.15 * x * x) * 0.9; } drive.curve = curve; drive.oversample = '2x';
    const pre = c.createGain(), body = c.createBiquadFilter(), bite = c.createBiquadFilter(), tone = c.createBiquadFilter(), out = c.createGain(), pan = c.createStereoPanner ? c.createStereoPanner() : c.createGain();
    body.type = 'peaking'; body.frequency.value = 130; body.Q.value = 0.9; body.gain.value = 7; bite.type = 'peaking'; bite.frequency.value = 1100; bite.Q.value = 1.1; bite.gain.value = 5; tone.type = 'lowpass'; tone.frequency.value = 1200; tone.Q.value = 0.8; out.gain.value = 0;
    pre.connect(drive); drive.connect(body); body.connect(bite); bite.connect(tone); tone.connect(out); out.connect(pan); pan.connect(this.out);
    const loops = this.loops.map((l) => { const s = c.createBufferSource(), g = c.createGain(); s.buffer = l.buf; s.loop = true; g.gain.value = 0; s.connect(g); g.connect(pre); s.start(0, Math.random() * l.buf.duration); return { s, g, rpm: l.rpm }; });
    return { pre, tone, bite, out, pan, loops, volume };
  },
  noise(type, freq, q) { const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.hiss; s.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = 0; s.connect(f); f.connect(g); g.connect(this.out); s.start(); return { f, g }; },
  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try {
      const c = this.ctx = new AC(); const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.18; comp.connect(c.destination);
      this.out = c.createGain(); this.out.gain.value = this.on ? 0.82 : 0; this.out.connect(comp);
      this.hiss = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); const d = this.hiss.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.loops = [2600, 4600, 7200].map((rpm) => ({ rpm, buf: this.loopBuffer(rpm) }));
      this.cars = [this.voice(0.42), this.voice(0.3)];
      this.wind = this.noise('highpass', 900, 0.5); this.rumble = this.noise('lowpass', 150, 0.7); this.squeal = this.noise('bandpass', 1350, 9); this.grit = this.noise('bandpass', 700, 0.8); this.whine = c.createOscillator(); this.whine.type = 'triangle'; this.whineGain = c.createGain(); this.whineGain.gain.value = 0; this.whine.connect(this.whineGain); this.whineGain.connect(this.out); this.whine.start();
      const away = (v) => { this.gone = v; if (c.state !== 'closed') { const p = v ? c.suspend() : c.resume(); if (p && p.catch) p.catch(() => { }); } };
      document.addEventListener('visibilitychange', () => away(document.hidden)); addEventListener('pagehide', () => away(true)); addEventListener('pageshow', () => away(document.hidden)); addEventListener('blur', () => away(true)); addEventListener('focus', () => away(document.hidden));
      const wake = () => { if (this.gone) away(false); else if (c.state === 'suspended') c.resume(); }; addEventListener('pointerdown', wake, true); addEventListener('pointerup', wake, true);
    } catch (e) { this.ctx = null; }
  },
  // one engine: revs set the pitch, load sets how hard and bright it sounds
  engine(i, rpm, load, level, pan, shift) {
    const e = this.cars[i], t = this.ctx.currentTime, k = Math.max(1200, rpm) * shift;
    e.loops.forEach((l, n) => { const beyond = (n === 0 && k < l.rpm) || (n === 2 && k > l.rpm), w = beyond ? 1 : clamp(1 - Math.abs(Math.log(k / l.rpm)) / 0.56, 0, 1); l.g.gain.setTargetAtTime(Math.sqrt(w), t, 0.025); l.s.playbackRate.setTargetAtTime(clamp(k / l.rpm, 0.45, 1.75), t, 0.022); });
    e.pre.gain.setTargetAtTime(0.35 + load * 0.95, t, 0.04); e.tone.frequency.setTargetAtTime(650 + rpm * (0.18 + load * 0.55), t, 0.05); e.out.gain.setTargetAtTime(level * e.volume * (0.55 + load * 0.45), t, 0.05);
    if (e.pan.pan) e.pan.pan.setTargetAtTime(clamp(pan, -0.9, 0.9), t, 0.06);
  },
  // s: { live, mine: {rpm, load}, theirs: {rpm, load, level, pan, pitch}, speed, squeal, gravel }
  drive(s) {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    this.engine(0, s.mine.rpm, s.mine.load, s.live ? 1 : 0.14, 0, 1); this.engine(1, s.theirs.rpm, s.theirs.load, s.live ? s.theirs.level : 0.1, s.theirs.pan, s.theirs.pitch);
    const v = s.live ? s.speed / 95 : 0;
    this.wind.g.gain.setTargetAtTime(v * v * 0.2, t, 0.15); this.wind.f.frequency.setTargetAtTime(600 + v * 1500, t, 0.2); this.rumble.g.gain.setTargetAtTime(v * 0.5, t, 0.1);
    this.squeal.g.gain.setTargetAtTime(s.live ? s.squeal * 0.09 : 0, t, 0.07); this.squeal.f.frequency.setTargetAtTime(1150 + s.squeal * 500 + Math.sin(t * 23) * 60, t, 0.03); this.grit.g.gain.setTargetAtTime(s.live && s.gravel ? 0.4 : 0, t, 0.05);
    this.whine.frequency.setTargetAtTime(s.mine.rpm * 0.31, t, 0.03); this.whineGain.gain.setTargetAtTime(s.live ? 0.006 + v * 0.008 : 0, t, 0.08);
  },
  burst(freq, q, dur, vol, when) { if (!this.ctx) return; const c = this.ctx, t = c.currentTime + (when || 0), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.hiss; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); s.connect(f); f.connect(g); g.connect(this.out); s.start(t, Math.random()); s.stop(t + dur + 0.02); },
  pops(n) { for (let i = 0; i < n; i++) { const at_ = i * (0.045 + Math.random() * 0.06); this.burst(130 + Math.random() * 240, 1.2, 0.07, 0.75, at_); this.burst(1700, 0.8, 0.025, 0.2, at_); } },
  shift(up) { if (!this.ctx) return; const t = this.ctx.currentTime, g = this.cars[0].pre.gain; g.cancelScheduledValues(t); g.setValueAtTime(0.12, t); g.setTargetAtTime(1.2, t + 0.055, 0.02); if (up) this.burst(220, 1, 0.09, 0.55, 0.03); else this.pops(2 + Math.floor(Math.random() * 3)); },
  tone(f, dur, vol, type, when) { if (!this.ctx) return; const c = this.ctx, t = c.currentTime + (when || 0), o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + 0.05); },
  radio() { this.tone(1250, 0.06, 0.04, 'square'); this.tone(1650, 0.06, 0.04, 'square', 0.09); },
  good() { [523, 659, 784].forEach((f, i) => this.tone(f, 0.35, 0.08, 'triangle', i * 0.08)); },
  win() { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.tone(f, 0.4, 0.1, 'triangle', i * 0.13)); },
  lose() { [330, 262, 196].forEach((f, i) => this.tone(f, 0.45, 0.09, 'sawtooth', i * 0.18)); }
};

/* ================= the game: engineer six pieces of racing line, then race two laps on them ================= */
const $ = (s) => document.querySelector(s);
const N = 6, LAPS = 2, POLE = 9;
let renderer, scene, camera, world, me, rival, ox, over, W = 1, H = 1, puffs, UP, v3;
const S = { phase: 'intro', t: 0, i: 0, lap: null, work: [], base: null, mine: null, theirs: null, clock: 0, shown: null, asked: 0, single: false, G: 0, done: false, view: 'chase', viewT: 0, marks: [] };
const cam = { p: null, l: null, u: null, f: 40 }, want = { p: null, l: null, u: null, f: 40, k: 3 };

/* ---------- the speed a racing car can carry along the lap, and the clock that follows from it ---------- */
function circuit(lines) {
  // join the six pieces into one lap, remembering where each begins
  const pts = [], starts = [];
  lines.forEach((l) => { starts.push(pts.length); for (let k = 0; k < l.length - 1; k++) pts.push(l[k]); });
  pts.push(pts[0].slice()); const path = pathFrom(pts); path.joins = starts.map((k) => path.cum[k]).concat(path.len);
  return path;
}
function speeds(path) {
  const n = Math.floor(path.len / 3), step = path.len / n, v = new Array(n);
  for (let k = 0; k < n; k++) { const s = k * step, a = dirAt(path, (s - 7 + path.len) % path.len), b = dirAt(path, (s + 7) % path.len), turn = Math.abs(Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1])) / 14; v[k] = Math.min(94, Math.sqrt(30 / Math.max(0.0008, turn))); v[k] = Math.max(30, v[k]); }
  for (let r = 0; r < 2; r++) { for (let k = n - 1; k >= 0; k--) v[k] = Math.min(v[k], Math.sqrt(v[(k + 1) % n] ** 2 + 2 * 28 * step)); for (let k = 0; k < n; k++) v[k] = Math.min(v[k], Math.sqrt(v[(k - 1 + n) % n] ** 2 + 2 * 17 * step)); }
  return { v, step, n };
}
const pieceAt = (path, s) => { let i = N - 1; while (i > 0 && s < path.joins[i]) i--; return i; };
/* a value kept for every point of the lap, read part way between points */
function read(path, list, s) { const cum = path.cum, u = ((s % path.len) + path.len) % path.len; let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= u) lo = m; else hi = m; } return lerp(list[lo], list[hi], (u - cum[lo]) / (cum[hi] - cum[lo] || 1)); }
/* a car's clock for the whole race. Both cars are measured along the same racing line; added is the time lost on each
   short stretch of it, and the clock reads "from" as the car passes the start */
function timetable(base, L, s0, added, from) {
  const { v, step, n } = base, count = added.length, s = [0], t = [0];
  for (let k = 0; k < count; k++) { s.push((k + 1) * step); t.push(t[k] + step / v[k % n] + added[k]); }
  const tt = { s, t, step, n: count, L, s0, t0: 0 }, shift = from - timeAtDist(tt, s0); tt.t = t.map((x) => x + shift);
  return tt;
}
/* where a car is at a time */
function locate(tt, time) {
  let lo = 0, hi = tt.n; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tt.t[m] <= time) lo = m; else hi = m; }
  const span_ = tt.t[hi] - tt.t[lo] || 1, f = (time - tt.t[lo]) / span_, d = lerp(tt.s[lo], tt.s[hi], f), v = tt.step / span_, ahead = Math.min(tt.n - 1, lo + 4), next = tt.step / (tt.t[ahead + 1] - tt.t[ahead] || 1);
  return { s: d % tt.L, dist: d, v, load: clamp(0.62 + (next - v) * 0.12, 0.08, 1) };
}
function timeAtDist(tt, d) { const k = clamp(Math.floor(d / tt.step), 0, tt.n - 1); return lerp(tt.t[k], tt.t[k + 1], (d - tt.s[k]) / tt.step); }
/* which of the twelve pieces raced a distance falls in (−1 on the run from the grid) */
const stageAt = (d) => { for (let j = 0; j < S.stages.length; j++) if (d < S.stages[j][1]) return d < S.stages[j][0] ? -1 : j; return S.stages.length - 1; };

/* a car's pose: both axles sit on the line, so the nose leads and the tail follows */
function place(car, path, d, dt, off, lane) {
  const L = path.len, wrap = (s) => ((s % L) + L) % L, side = (s) => { const c = at(path, wrap(s)); if (!lane) return c; return add(c, mul(leftOf(dirAt(path, wrap(s))), lane)); };
  const f = side(d + 1.6), r = side(d - 1.6), x = (f[0] + r[0]) / 2, z = (f[1] + r[1]) / 2, head = Math.atan2(f[1] - r[1], f[0] - r[0]);
  const moved = car.last ? Math.hypot(x - car.last[0], z - car.last[1]) : 0, v = dt > 0 && moved < 20 ? moved / dt : 0;
  const a = dirAt(path, wrap(d - 4)), b = dirAt(path, wrap(d + 5)), k = Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]) / 9;
  car.root.position.set(x, off ? Math.abs(Math.sin(d * 2.6)) * 0.07 : 0, z); car.root.rotation.y = -head;
  const turn = clamp(Math.atan(3.2 * k), -0.45, 0.45); car.turn = dt > 0 ? lerp(car.turn || 0, turn, Math.min(1, dt * 12)) : turn; car.steer.forEach((p) => { p.rotation.y = -car.turn; });
  // above a certain speed the spokes are drawn turning slowly, which the eye reads as very fast
  if (moved < 20) car.wheels.forEach((w) => { w.rotation.z -= Math.min(moved / 0.46, 0.55); });
  if (dt > 0) { const acc = clamp((v - (car.v || 0)) / dt, -40, 40); car.body.rotation.x = lerp(car.body.rotation.x, clamp(k * v * v * 0.0007, -0.06, 0.06), Math.min(1, dt * 7)); car.body.rotation.z = lerp(car.body.rotation.z, acc * 0.0007, Math.min(1, dt * 6)); car.body.position.y = Math.sin(d * 1.7) * (off ? 0.035 : 0.006 * Math.min(1, v / 60)); car.v = v; }
  car.last = [x, z]; car.head = head; car.pos = [x, z]; car.curve = k;
}
function puff(p, y, col, size, life) { const m = puffs.pool[puffs.next++ % puffs.pool.length]; m.visible = true; m.position.set(p[0] + (Math.random() - 0.5) * 1.4, y, p[1] + (Math.random() - 0.5) * 1.4); m.material.color.set(col); m.userData = { t: 0, size, life }; }

/* ---------- screens and messages ---------- */
function banner(text, cls) { $('#banner').innerHTML = text ? '<span class="' + (cls || '') + '">' + text + '</span>' : ''; }
function chip(id, text, cls) { const e = $(id); if (e.textContent !== text) e.textContent = text; if (cls !== undefined) e.className = cls; }

/* ---------- the pit wall ---------- */
const FORMS = {
  vertex: [['t', 'y ='], ['f', 'a'], ['q', 'x'], ['t', '+'], ['f', 'b'], ['t', 'x +'], ['f', 'c']],
  line: [['t', 'y ='], ['f', 'm'], ['t', 'x +'], ['f', 'c']],
  turning: [['t', '('], ['f', 'p'], ['t', ','], ['f', 'q'], ['t', ')']]
};
FORMS.roots = FORMS.vertex;
const LABEL = { a: 'number in front of x squared', b: 'number in front of x', c: 'number on its own', m: 'gradient', p: 'turning point x', q: 'turning point y' };
const values = () => { const v = {}; for (const k of FIELDS[S.lap[S.i].type]) { v[k] = parseNum($('#in-' + k).value); if (v[k] === null) return null; } return v; };
const same = (a, b) => !!a && !!b && Object.keys(a).every((k) => a[k] === b[k]);
/* one button, one go: plotting a line locks it in */
function ready() { const v = values(), w = S.work[S.i], go = $('#go'), last = S.work.every((o, k) => o.locked || k === S.i), text = w.locked ? 'Locked in' : last ? 'Plot and race' : 'Plot'; go.disabled = !v || w.locked; if (go.textContent !== text) go.textContent = text; }
function engineer(open) {
  const m = METHOD[S.lap[S.i].type]; S.asked = !!open;
  $('#tip').innerHTML = open ? '<ol>' + m.steps.map((t) => '<li>' + t + '</li>').join('') + '</ol><div class="eg"><b>Example with other numbers</b>' + m.example.map((t) => '<span>' + t + '</span>').join('') + '</div>' : '';
  $('#tip').hidden = !open; $('#tip').scrollTop = 0; $('#dock').classList.toggle('open', !!open);
  $('#hint').textContent = open ? 'Hide method' : 'Show method'; $('#hint').setAttribute('aria-expanded', String(!!open));
}
function plan(i) {
  S.phase = 'plan'; S.t = 0; S.i = i; S.flash = 0; banner(''); $('#card').hidden = true; $('#speedo').hidden = true; $('#top').hidden = false;
  const p = S.lap[i], w = S.work[i];
  $('#msg').innerHTML = BRIEF[p.type](p);
  $('#form').innerHTML = FORMS[p.type].map(([kind, k]) => kind === 't' ? '<span>' + k + '</span>' : kind === 'q' ? '<span>' + k + '<sup>2</sup></span>' : '<input id="in-' + k + '" type="text" inputmode="text" autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="7" aria-label="' + LABEL[k] + '">').join('');
  FIELDS[p.type].forEach((k) => { const inp = $('#in-' + k); inp.addEventListener('input', () => { inp.value = inp.value.replace(/-/g, '−').replace(/[^\d.\/−]/g, ''); ready(); }); });
  $('#dock').hidden = false; engineer(false); $('#dock').scrollTop = 0; ready();
  chip('#where', (i + 1) + '/' + N + ' · ' + p.name); $('#gap').hidden = true;
  // the cars wait out of sight of the graph
  me.root.visible = rival.root.visible = false;
}
function submit(e) {
  e.preventDefault(); const v = values(), w = S.work[S.i]; if (S.phase !== 'plan' || !v || w.locked) return; if (document.activeElement) document.activeElement.blur();
  w.v = v; w.error = errorOf(S.lap[S.i], v); w.locked = true;
  // a moment to see the line go down, then on to the next
  S.flash = 1.6; document.querySelectorAll('#form input').forEach((n) => { n.readOnly = true; }); Calc.set(false); Snd.radio(); ready();
}
function advance() { const next = S.work.findIndex((o) => !o.locked); if (next >= 0) plan(next); else race(); }

/* ---------- the race ---------- */
function race() {
  S.phase = 'grid'; S.t = 0; S.done = false; S.beep = -1; S.shown = -1; S.view = 'grid'; S.viewT = 0; S.gearWas = 1; $('#dock').hidden = true; $('#card').hidden = true; $('#top').hidden = false; $('#speedo').hidden = false; $('#gap').hidden = false; banner('');
  me.root.visible = rival.root.visible = true;
  const ideal = circuit(S.lap.map(roadFor)), base = speeds(ideal); S.ideal = ideal;
  // where the racing line sits across the road, so that a car can be kept inside the barriers
  const centre = world.lap;
  S.lat = ideal.pts.map((p) => { let best = 1e9, at_ = 0; for (let k = 0; k < centre.pts.length; k++) { const e = (p[0] - centre.pts[k][0]) ** 2 + (p[1] - centre.pts[k][1]) ** 2; if (e < best) { best = e; at_ = k; } } const s = centre.cum[at_], l = leftOf(dirAt(centre, s)), c = at(centre, s); return (p[0] - c[0]) * l[0] + (p[1] - c[1]) * l[1]; });
  // the line the student's functions send the car along
  S.off = ideal.pts.map((p, k) => { const s = ideal.cum[k], i = Math.min(N - 1, pieceAt(ideal, s)), w = S.work[i]; if (w.error <= GOOD) return 0; const t = clamp((s - ideal.joins[i]) / (ideal.joins[i + 1] - ideal.joins[i]), 0, 1), left = leftOf(dirAt(ideal, s)); let o = strayAt(S.lap[i], w.v, t, left);
    // even a near miss is seen to leave the line
    let most = 0, sign = 0; for (let j = 4; j <= 16; j++) { const q = strayAt(S.lap[i], w.v, j / 20, left); if (Math.abs(q) > most) { most = Math.abs(q); sign = Math.sign(q); } }
    if (most < 7) o = most > 0.2 ? o * 7 / most : 7 * (sign || 1);
    return clamp(o, -16 - S.lat[k], 21 - S.lat[k]) * strayShape(t); });
  const strayed = pathFrom(ideal.pts.map((p, k) => add(p, mul(leftOf(dirAt(ideal, ideal.cum[k])), S.off[k])))); strayed.cum = ideal.cum; strayed.len = ideal.len; strayed.joins = ideal.joins;
  // the grid is on the start straight, with the red car on pole a few metres ahead
  let best = 1e9, s0 = 0; for (let d = ideal.joins[5]; d < ideal.len; d += 1) { const e = vlen(sub(at(ideal, d), world.startPos)); if (e < best) { best = e; s0 = d; } }
  const len = ideal.len, finish = s0 + LAPS * len, plan_ = racePlan(S.work.map((w) => w.error > GOOD));
  // the twelve stretches raced, from the first corner to the flag
  S.stages = plan_.gaps.map((_, j) => { const lap = 1 + Math.floor(j / N), i = j % N; return [lap * len + ideal.joins[i], j === 11 ? finish : lap * len + ideal.joins[i + 1]]; });
  S.wide = plan_.wide; S.plan = plan_;
  const count = Math.ceil((finish + 700) / base.step), mine = new Array(count).fill(0), theirs = new Array(count).fill(0);
  S.stages.forEach(([a, b], j) => {
    const change = plan_.gaps[j] - (j ? plan_.gaps[j - 1] : START_GAP), off = change < 0 && S.work[j % N].error > GOOD, ran = change > 0 && S.wide.includes(j);
    const ks = [], weight = []; for (let k = Math.floor(a / base.step); k < count && (k + 0.5) * base.step < b; k++) { if ((k + 0.5) * base.step < a) continue; const t = ((k + 0.5) * base.step - a) / (b - a); ks.push(k); weight.push(off || ran ? strayShape(t) + 0.06 : 1.15 - Math.cos(t * Math.PI * 2)); }
    const total = weight.reduce((x, y) => x + y, 0) || 1; ks.forEach((k, n) => { (change < 0 ? mine : theirs)[k] += Math.abs(change) * weight[n] / total; });
  });
  S.mine = timetable(base, len, s0, mine, 0); S.theirs = timetable(base, len, s0, theirs, START_GAP); S.mine.path = strayed; S.theirs.path = ideal;
  [S.mine, S.theirs].forEach((c) => { c.end = timeAtDist(c, finish); });
  S.leader = -1; S.changes = 0; S.stage = -1; S.rivalStage = -1;
  S.clock = 0; S.lane = 0; S.side = 0; S.lapSaid = 0; S.farWas = undefined; me.last = rival.last = null;
  poses(0); snapView();
}
// both cars leave from rest: the clock they run on starts slowly, the same for each
const launch = (c) => (c < 1.6 ? c * c / 3.2 : c - 0.8);
function poses(dt) {
  const u = launch(S.clock);
  const m = locate(S.mine, S.mine.t0 + u), r = locate(S.theirs, S.theirs.t0 + u);
  // off the grid the car pulls away straight, whatever its first line says
  const away = ease(clamp((m.dist - S.mine.s0) / 60, 0, 1)), stray = read(S.ideal, S.off, m.s), off = stray * away, lat = read(S.ideal, S.lat, m.s), rough = Math.abs(lat + off) > ROAD / 2 - 0.6;
  place(me, S.mine.path, m.s, dt, rough, off - stray);
  // the red car's own mistakes carry it out wide; otherwise, when they are close, it moves over to race alongside
  const j = stageAt(r.dist), over = S.wide.includes(j) ? strayShape((r.dist - S.stages[j][0]) / (S.stages[j][1] - S.stages[j][0])) : 0, wide = over * 8.5;
  const near = clamp(1 - (Math.abs(r.dist - m.dist) - 7) / 11, 0, 1) * clamp((7 - Math.abs(off)) / 3, 0, 1) * (1 - over);
  if (near <= 0) S.side = 0; else if (!S.side) S.side = Math.abs(off) > 0.8 ? -Math.sign(off) : -Math.sign(read(S.ideal, S.lat, r.s)) || -1;
  const lane = S.side * 3.6 * near + wide; S.lane = dt > 0 ? lerp(S.lane, lane, Math.min(1, dt * 3.5)) : lane;
  place(rival, S.theirs.path, r.s, dt, wide > 4, S.lane);
  if (dt > 0 && wide > 3.5 && Math.random() < 0.7) puff(rival.pos, 0.5, '#b29c74', 1.4, 0.9);
  return { m, r, i: pieceAt(S.ideal, m.s), offLine: rough };
}
/* the time between the two cars at the point both have reached */
function gapNow() {
  const u = launch(S.clock), m = locate(S.mine, S.mine.t0 + u), r = locate(S.theirs, S.theirs.t0 + u), p = Math.min(m.dist, r.dist);
  return timeAtDist(S.theirs, p) - S.theirs.t0 - (timeAtDist(S.mine, p) - S.mine.t0);
}
function result() {
  S.phase = 'done'; S.t = 0; $('#top').hidden = true; $('#speedo').hidden = true; banner('');
  const margin = S.theirs.end - S.mine.end, won = margin >= 0;
  const perfect = S.work.filter((w) => w.error <= GOOD).length;
  $('#sheet').innerHTML = '<h1>' + (won ? 'You win by ' : 'Rival wins by ') + Math.abs(margin).toFixed(2) + ' sec</h1><p>' + perfect + ' of ' + N + ' lines spot on. The lead changed hands ' + S.changes + (S.changes === 1 ? ' time.' : ' times.') + '</p><ol>' +
    S.lap.map((p, i) => { const w = S.work[i], good = w.error <= GOOD; return '<li><span><b>' + p.name + '</b><span class="eqn">' + writeOut(p, w.v) + '</span></span><em class="' + (good ? 'y' : 'n') + '">' + (good ? 'On the line' : 'Ran off') + '</em></li>'; }).join('') +
    '</ol><div class="btns"><button type="button" class="big" id="fresh">New race</button><button type="button" class="alt" id="again">Replay</button></div>';
  $('#card').hidden = false; $('#card').className = '';
  $('#again').addEventListener('click', race); $('#fresh').addEventListener('click', begin);
}
function begin() { Snd.init(); S.lap = makeLap(); S.work = S.lap.map(() => ({ v: null, error: 60, locked: false })); plan(0); }

/* ---------- cameras ---------- */
function look(px, py, pz, lx, ly, lz, f, k, up) { want.p.set(px, py, pz); want.l.set(lx, ly, lz); want.f = f; want.k = k; want.u.copy(up || UP); }
function snapView() { cam.p.copy(want.p); cam.l.copy(want.l); cam.u.copy(want.u); cam.f = want.f; }
function chase(speed, near) {
  const h = me.head || 0, fx = Math.cos(h), fz = Math.sin(h), tall = W < H, back = (tall ? 12.5 : 8.6) - (near ? 1 : 0), up = tall ? 4.6 : 2.7, p = me.pos, rush = clamp(speed / 90, 0, 1);
  look(p[0] - fx * (back - rush * 0.7), up - rush * 0.3, p[1] - fz * (back - rush * 0.7), p[0] + fx * 7, 1.05, p[1] + fz * 7, (tall ? 62 : 54) + rush * 17, 30);
}
/* the race is cut like television: behind the car, trackside as it screams past, alongside, and from the helicopter */
function broadcast(dt, speed) {
  S.viewT += dt; const order_ = ['chase', 'trackside', 'chase', 'duel', 'chase', 'wheel', 'chase', 'heli'], lengths = { chase: 4.6, trackside: 3, wheel: 2.4, heli: 2.8, duel: 2.8 };
  if (S.view === 'grid') { if (S.clock > 2.4) { S.view = 'chase'; S.viewT = 0; S.cut = 0; } }
  else if (S.viewT > lengths[S.view]) {
    S.cut++; S.view = order_[S.cut % order_.length]; S.viewT = 0;
    // the two-car shot is only worth cutting to when there are two cars in it
    if (S.view === 'duel' && Math.hypot(me.pos[0] - rival.pos[0], me.pos[1] - rival.pos[1]) > 28) S.view = 'chase';
    if (S.view === 'trackside') { const d = (locate(S.mine, S.mine.t0 + launch(S.clock) + 1.5).s) % S.mine.path.len, c = at(S.mine.path, d), l = leftOf(dirAt(S.mine.path, d)); S.spot = add(c, mul(l, 14)); }
    S.snap = true;
  }
  const h = me.head, fx = Math.cos(h), fz = Math.sin(h), lx = fz, lz = -fx, p = me.pos, tall = W < H;
  if (S.view === 'grid') { const k = clamp(S.clock / 2.4, 0, 1); look(p[0] - fx * (7 + k * 2) + lx * (5.5 - k * 5), 1.5 + k * 1.3, p[1] - fz * (7 + k * 2) + lz * (5.5 - k * 5), p[0] + fx * 4, 1, p[1] + fz * 4, tall ? 66 : 52, 30); }
  else if (S.view === 'trackside') { const d = Math.hypot(p[0] - S.spot[0], p[1] - S.spot[1]); look(S.spot[0], 1.7, S.spot[1], p[0], 0.9, p[1], clamp(900 / Math.max(14, d), 20, tall ? 66 : 48), 30); }
  else if (S.view === 'wheel') look(p[0] - fx * 1.2 + lx * (tall ? 8.5 : 6), 1.25, p[1] - fz * 1.2 + lz * (tall ? 8.5 : 6), p[0] + fx * 1.4, 0.75, p[1] + fz * 1.4, tall ? 58 : 44, 30);
  else if (S.view === 'heli') look(p[0] - fx * 34 + lx * 16, 30, p[1] - fz * 34 + lz * 16, p[0] + fx * 12, 0, p[1] + fz * 12, tall ? 56 : 40, 30);
  else if (S.view === 'duel') {
    // from just ahead and to one side, looking back at the pair of them
    const mx = (p[0] + rival.pos[0]) / 2, mz = (p[1] + rival.pos[1]) / 2, apart_ = Math.hypot(p[0] - rival.pos[0], p[1] - rival.pos[1]), back = (tall ? 17 : 11.5) + apart_ * 0.45;
    look(mx + fx * back + lx * 4.5, 2.6 + apart_ * 0.07, mz + fz * back + lz * 4.5, mx, 0.7, mz, tall ? 58 : 46, 30);
  }
  else chase(speed);
  if (S.snap) { snapView(); S.snap = false; }
}
/* high over one piece with its graph's x running to the right and y up the screen, as close as its points allow */
function graphView() {
  const p = S.lap[S.i], dock = $('#dock'), beside = H <= 520 && W >= 600, top = W <= 600 ? 52 : 60;
  const bottom = beside ? 8 : Math.max(dock.offsetHeight || 150, W <= 600 && Calc.open ? $('#calc').offsetHeight : 0) + 22;
  const roomW = beside ? W - (dock.offsetWidth || 300) - 20 : W - (Calc.open && W > 600 && W < 1000 ? 264 : 0), roomH = Math.max(130, H - top - bottom);
  const ex = norm(p.ex), ey = norm(p.ey), key = [p.P, p.Q].concat(p.apex ? [p.apex] : []).map((q) => toWorld(p, q[0], q[1]));
  const xs = key.map((c) => c[0] * ex[0] + c[1] * ex[1]), ys = key.map((c) => c[0] * ey[0] + c[1] * ey[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  // room round the points for their labels, in screen pixels
  const side = Math.min(70, roomW * 0.13), above = Math.min(52, roomH * 0.17);
  const ppm = Math.max(0.05, Math.min((roomW - side * 2) / Math.max(1, x1 - x0), (roomH - above * 2) / Math.max(1, y1 - y0))), f = 24, dist = (H / 2) / Math.tan(f * Math.PI / 360) / ppm;
  const mx = (x0 + x1) / 2 + (W / 2 - roomW / 2) / ppm, my = (y0 + y1) / 2 + (top + roomH / 2 - H / 2) / ppm, tx = ex[0] * mx + ey[0] * my, tz = ex[1] * mx + ey[1] * my;
  look(tx - ey[0] * dist * 0.02, dist, tz - ey[1] * dist * 0.02, tx, 0, tz, f, 4, new camera.position.constructor(ey[0], 0, ey[1]));
}

/* ---------- the loop ---------- */
function step(dt) {
  S.t += dt; world.tick(performance.now() / 1000); world.canopy.visible = S.phase === 'plan';
  let sound = { live: false, mine: { rpm: 1500 + Math.sin(S.t * 9) * 60, load: 0.15 }, theirs: { rpm: 1700, load: 0.15, level: 0.3, pan: -0.4, pitch: 1 }, speed: 0, squeal: 0, gravel: false };
  if (S.phase === 'intro') { const a = performance.now() / 12000 + 0.75, c = me.pos, R = W < H ? 17 : 12.5; look(c[0] + Math.cos(a) * R, R * 0.26, c[1] - 1.5 + Math.sin(a) * R, c[0], W < H ? -2.6 : -1.7, c[1] - 1.5, W < H ? 60 : 44, 3); }
  else if (S.phase === 'plan') { graphView(); if (S.flash > 0) { S.flash -= dt; if (S.flash <= 0) advance(); } }
  else if (S.phase === 'grid') {
    const n = Math.floor(S.t / 0.62);
    if (n !== S.beep && n >= 1 && n <= 5) { S.beep = n; world.lamps.forEach((l, i) => l.material.color.set(i < n ? 0xff1d12 : 0x2a0808)); Snd.tone(520, 0.14, 0.11, 'square'); banner(''); }
    poses(0); const h = me.head, p = me.pos; look(p[0] - Math.cos(h) * 7 + Math.sin(h) * 5.5, 1.5, p[1] - Math.sin(h) * 7 - Math.cos(h) * 5.5, p[0] + Math.cos(h) * 4, 1, p[1] + Math.sin(h) * 4, W < H ? 66 : 52, 30);
    // blipping the throttle while the lights come on
    const blip = Math.max(0, Math.sin(S.t * 7.3)); sound.mine = { rpm: 3200 + blip * 3600, load: 0.2 + blip * 0.7 }; sound.theirs = { rpm: 3000 + Math.max(0, Math.sin(S.t * 6.1 + 2)) * 3200, load: 0.5, level: 0.45, pan: -0.5, pitch: 1 }; sound.live = true;
    if (S.t > 0.62 * 6.4) { S.phase = 'race'; S.t = 0; world.lamps.forEach((l) => l.material.color.set(0x2a0808)); banner('GO', 'count'); Snd.pops(3); }
    chipRace(0, 1);
  } else if (S.phase === 'race') {
    S.clock += dt; if (S.clock > 0.9 && $('#banner').textContent === 'GO') banner('');
    const q = poses(dt), u = launch(S.clock), lapNo = Math.min(LAPS, Math.floor((q.m.dist - S.mine.s0) / S.mine.path.len) + 1), G = S.done ? S.theirs.end - S.mine.end : gapNow(); S.G = G; chipRace(G, lapNo);
    // call the race as it happens: passes first, then anyone running off
    const say = (text, cls, time) => { banner(text, cls); S.bannerT = time || 1.6; };
    const lead = G > 0.025 ? 1 : G < -0.025 ? -1 : S.leader;
    if (!S.done && lead !== S.leader && S.clock > 2.6) { S.leader = lead; S.changes++; say(lead > 0 ? 'You take the lead' : 'Red car goes through', lead > 0 ? 'ok' : 'bad'); if (S.view !== 'duel' && Math.abs(q.m.dist - q.r.dist) < 22) { S.view = 'duel'; S.viewT = 0; S.snap = true; } }
    const mineNow = stageAt(q.m.dist), theirsNow = stageAt(q.r.dist);
    // called as the wheels actually leave the road
    if (q.offLine && mineNow !== S.stage && mineNow >= 0 && S.work[mineNow % N].error > GOOD) { S.stage = mineNow; say('You run off at ' + S.lap[mineNow % N].name, 'bad'); }
    if (theirsNow !== S.rivalStage) { S.rivalStage = theirsNow; if (S.wide.includes(theirsNow)) say('Red car runs wide', 'ok'); }
    if (lapNo === 2 && S.lapSaid !== 2) { S.lapSaid = 2; banner('Final lap', ''); S.bannerT = 1.6; }
    if (S.bannerT > 0) { S.bannerT -= dt; if (S.bannerT <= 0) banner(''); }
    const slow = S.clock < 1.6, speed = q.m.v * (slow ? S.clock / 1.6 : 1), box = gearbox(speed), rb = gearbox(q.r.v * (slow ? S.clock / 1.6 : 1));
    if (box.gear !== S.gearWas) { const up = box.gear > S.gearWas; Snd.shift(up); me.flare = up ? 0.08 : 0.22; S.gearWas = box.gear; }
    $('#spd').textContent = String(Math.round(speed * 3.6)); $('#gear').textContent = String(box.gear); $('#revs i').style.width = clamp((box.rpm - 2500) / 6000, 0, 1) * 100 + '%';
    const squeal = clamp((Math.abs(me.curve) * speed * speed - 14) / 20, 0, 1);
    if (q.offLine && Math.random() < 0.85) { puff(me.pos, 0.5, '#b29c74', 1.4, 0.9); }
    else if (squeal > 0.45 && Math.random() < 0.5) puff([me.pos[0] - Math.cos(me.head) * 2.2, me.pos[1] - Math.sin(me.head) * 2.2], 0.35, '#dfe3e6', 0.6, 0.5);
    // the rival is heard from where it is, rising in pitch as it closes and falling as it leaves
    const dx = rival.pos[0] - me.pos[0], dz = rival.pos[1] - me.pos[1], dist = Math.hypot(dx, dz), cx = camera.position.x - rival.pos[0], cz = camera.position.z - rival.pos[1], far = Math.hypot(cx, cz), closing = S.farWas === undefined ? 0 : (S.farWas - far) / Math.max(dt, 0.001); S.farWas = far;
    sound = { live: true, mine: { rpm: box.rpm, load: q.m.load }, theirs: { rpm: rb.rpm, load: q.r.load, level: clamp(14 / (14 + dist), 0.08, 1), pan: (dx * Math.sin(me.head) - dz * Math.cos(me.head)) / -(dist + 6), pitch: clamp(1 + closing / 600, 0.9, 1.1) }, speed, squeal, gravel: q.offLine };
    S.mineSpeed = speed;
    if (!S.done && (u >= S.mine.end || u >= S.theirs.end)) { S.done = true; S.over = 0; const won = S.mine.end <= S.theirs.end; banner(won ? 'Chequered flag: you win' : 'The red car takes the flag', won ? 'ok' : 'bad'); S.bannerT = 9; if (won) Snd.win(); else Snd.lose(); }
    if (S.done) { S.over += dt; const c = add(world.startPos, [0, 0]), d = dirAt(S.mine.path, S.mine.s0), l = leftOf(d), spot = add(c, add(mul(d, 34), mul(l, 12))); look(spot[0], 3.4, spot[1], me.pos[0], 1, me.pos[1], W < H ? 62 : 40, 30); if (S.over < dt * 2) snapView(); if (S.over > 3.4) result(); }
    else broadcast(dt, speed);
  } else if (S.phase === 'done') { const a = performance.now() / 14000, c = me.pos; look(c[0] + Math.cos(a) * 60, 24, c[1] + Math.sin(a) * 60, c[0], 0, c[1], W < H ? 60 : 44, 1.2); }
  // exhaust flames on the gear changes
  [me, rival].forEach((car) => { car.flare = Math.max(0, car.flare - dt); car.flames.forEach((f) => { f.visible = car.flare > 0; if (f.visible) f.scale.set(0.5 + Math.random() * 0.4, 0.3 + Math.random() * 0.5, 0.5 + Math.random() * 0.4); }); });
  Snd.drive(sound);
  puffs.pool.forEach((m) => { if (!m.visible) return; const d = m.userData; d.t += dt; m.position.y += dt * 1.6; m.scale.setScalar(d.size * (0.9 + d.t * 4)); m.material.opacity = 0.5 * (1 - d.t / d.life); if (d.t > d.life) m.visible = false; });
  const k = 1 - Math.exp(-dt * want.k); if (want.k >= 20) snapSoft(dt); else { cam.p.lerp(want.p, k); cam.l.lerp(want.l, k); cam.u.lerp(want.u, k).normalize(); cam.f = lerp(cam.f, want.f, k); }
  camera.position.copy(cam.p);
  if (S.phase === 'race' && (S.view === 'chase' || S.view === 'wheel')) { const j = Math.pow(clamp((S.mineSpeed || 0) / 95, 0, 1), 2) * 0.05; camera.position.x += (Math.random() - 0.5) * j; camera.position.y += (Math.random() - 0.5) * j; }
  camera.up.copy(cam.u); camera.fov = cam.f; camera.lookAt(cam.l); camera.near = Math.max(0.4, (cam.p.y - 40) * 0.6); camera.updateProjectionMatrix();
  const planning = S.phase === 'plan', focus = planning ? toWorld(S.lap[S.i], (S.lap[S.i].x0 + S.lap[S.i].x1) / 2, S.lap[S.i].P[1]) : me.pos;
  world.sun.position.set(focus[0] - 100, 112, focus[1] + 90); world.sun.target.position.set(focus[0], 0, focus[1]); scene.fog.near = planning ? 1500 : 450; scene.fog.far = planning ? 4000 : 1900;
}
// a racing car is too fast for a lazy camera: it is held at its mark, easing only the height and zoom
function snapSoft(dt) { const k = 1 - Math.exp(-dt * 9); cam.p.set(want.p.x, lerp(cam.p.y, want.p.y, k), want.p.z); cam.l.copy(want.l); cam.u.copy(want.u); cam.f = lerp(cam.f, want.f, k); }
function chipRace(G, lapNo) { chip('#where', 'Lap ' + lapNo + ' of ' + LAPS); chip('#gap', Math.abs(G) < 0.005 ? 'Level' : (G > 0 ? 'You +' : 'Rival +') + Math.abs(G).toFixed(2) + ' sec', 'chip' + (G > 0.005 ? ' up' : G < -0.005 ? ' down' : '')); }

/* ---------- the points and the student's line, drawn over the circuit ---------- */
function scr(p, w) { const g = toWorld(p, w[0], w[1]); v3.set(g[0], 0.3, g[1]).project(camera); return [(v3.x + 1) / 2 * W, (1 - v3.y) / 2 * H]; }
function diagram() {
  ox.clearRect(0, 0, W, H); if (S.phase !== 'plan') return;
  const settle = clamp(1 - camera.position.distanceTo(want.p) / 80, 0, 1); if (settle <= 0.03) return;
  const p = S.lap[S.i], w = S.work[S.i], fs = W <= 600 || H <= 520 ? 14 : 18;
  ox.save(); ox.globalAlpha = settle; ox.lineCap = 'round'; ox.lineJoin = 'round';
  const taken = [];
  const tag = (text, at_, dy, bg, fg) => { ox.font = '800 ' + fs + "px 'Saira Condensed',Arial Narrow"; const wd = ox.measureText(text).width + fs, hh = fs * 1.6; let x = clamp(at_[0], wd / 2 + 4, W - wd / 2 - 4), y = at_[1] + dy * hh; for (let n = 0; n < 8 && taken.some((r) => Math.abs(r[0] - x) < (r[2] + wd) / 2 && Math.abs(r[1] - y) < (r[3] + hh) / 2); n++) y += (dy < 0 ? -1 : 1) * hh * 0.7; taken.push([x, y, wd, hh]); ox.fillStyle = bg; ox.beginPath(); const l = x - wd / 2, t = y - hh / 2, r = 6; ox.moveTo(l + r, t); ox.arcTo(l + wd, t, l + wd, t + hh, r); ox.arcTo(l + wd, t + hh, l, t + hh, r); ox.arcTo(l, t + hh, l, t, r); ox.arcTo(l, t, l + wd, t, r); ox.fill(); ox.fillStyle = fg; ox.textAlign = 'center'; ox.textBaseline = 'middle'; ox.fillText(text, x, y + 1); };
  if (w.v) {
    const f = studentF(p, w.v);
    if (f) {
      const reach = (p.x1 - p.x0) * 0.6, pts = []; let seen = false;
      for (let k = 0; k <= 240; k++) { const x = lerp(p.x0 - reach, p.x1 + reach, k / 240), c = scr(p, [x, f(x)]); pts.push(c); if (x >= p.x0 && x <= p.x1 && c[0] > 0 && c[0] < W && c[1] > 0 && c[1] < H - 40) seen = true; }
      [['rgba(5,10,16,.7)', 9], ['#2f9bff', 5]].forEach(([col, width]) => { ox.beginPath(); pts.forEach((c, n) => (n ? ox.lineTo(c[0], c[1]) : ox.moveTo(c[0], c[1]))); ox.strokeStyle = col; ox.lineWidth = width; ox.stroke(); });
      if (!seen) tag('Your line is off the screen', [W / 2, 90], 0, '#1668d8', '#fff');
    }
    if (p.type === 'turning') { const s = scr(p, [w.v.p, w.v.q]); ox.beginPath(); ox.arc(s[0], s[1], 8, 0, 7); ox.fillStyle = '#2f9bff'; ox.fill(); ox.strokeStyle = '#fff'; ox.lineWidth = 3; ox.stroke(); }
  }
  const dot = (q, label, dy) => { const s = scr(p, q); ox.beginPath(); ox.arc(s[0], s[1], 7, 0, 7); ox.fillStyle = '#ffcb1f'; ox.fill(); ox.strokeStyle = '#121a24'; ox.lineWidth = 3; ox.stroke(); tag(label, s, dy, '#ffcb1f', '#121a24'); };
  if (p.type === 'vertex') { dot(p.apex, 'Apex ' + pt(p.apex), -1.15); dot(p.P, pt(p.P), 1.2); }
  else if (p.type === 'roots') { dot(p.apex, 'Apex ' + pt(p.apex), -1.15); dot(p.P, pt(p.P), 1.2); dot(p.Q, pt(p.Q), 1.2); }
  else if (p.type === 'turning') { dot(p.P, pt(p.P), 1.2); dot(p.Q, pt(p.Q), 1.2); }
  else { dot(p.P, pt(p.P), p.truth.m > 0 ? 1.2 : -1.15); dot(p.Q, pt(p.Q), p.truth.m > 0 ? -1.15 : 1.2); }
  ox.restore();
}

/* ================= calculator ================= */
const Calc = {
  open: false, text: '', done: false, past: [],
  show() { const there = !$('#dock').hidden, b = $('#calcBtn'), box = $('#calc'); if (b.hidden === there) b.hidden = !there; const see = there && this.open; if (box.hidden === see) box.hidden = !see; $('#app').classList.toggle('calcing', see); },
  set(v) { this.open = v; $('#calcBtn').setAttribute('aria-expanded', String(v)); $('#calcBtn').textContent = v ? 'Close ✕' : 'Calculator'; this.show(); },
  paint(t) { $('#calcNow').innerHTML = '<bdi>' + (t || this.text || '0') + '</bdi>'; },
  press(k) {
    const ops = '+−×÷²';
    if (k === 'C') { this.text = ''; this.done = false; $('#calcWas').textContent = ''; }
    else if (k === '⌫') { this.text = this.done ? '' : this.text.slice(0, -1); this.done = false; }
    else if (k === '=') { if (!this.text) return; const v = calculate(this.text); if (v === null) { this.text = ''; this.done = false; this.paint('Check the sum'); return; } $('#calcWas').textContent = this.text + ' ='; this.text = String(v).replace('-', '−'); this.done = true; }
    else if (this.text.length < 36) { if (this.done && !ops.includes(k)) this.text = k; else this.text += k; this.done = false; }
    this.paint();
  },
  init() {
    const box = $('#calcKeys');
    [['C', 'op'], ['⌫', 'op'], ['(', 'fn'], [')', 'fn'], ['÷', 'op'], ['7'], ['8'], ['9'], ['²', 'fn'], ['×', 'op'], ['4'], ['5'], ['6'], ['√', 'fn'], ['−', 'op'], ['1'], ['2'], ['3'], ['.'], ['+', 'op'], ['0'], ['=', 'eq']].forEach(([k, cls]) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = k === '²' ? 'x²' : k; if (cls) b.className = cls; if (k === '=') b.style.gridColumn = 'span 4'; if (k === '⌫') b.setAttribute('aria-label', 'delete'); b.addEventListener('click', () => this.press(k)); box.appendChild(b); });
    $('#calcBtn').addEventListener('click', () => { if (document.activeElement && document.activeElement.tagName === 'INPUT') document.activeElement.blur(); this.set(!this.open); });
    $('#calc').addEventListener('keydown', (e) => { const k = { '-': '−', '*': '×', '/': '÷', Enter: '=', '=': '=', Backspace: '⌫', Escape: 'esc' }[e.key] || (/^[0-9.+()]$/.test(e.key) ? e.key : null); if (!k) return; e.preventDefault(); if (k === 'esc') this.set(false); else this.press(k); });
  }
};

/* ================= boot ================= */
function resize() {
  const vv = window.visualViewport, seen = vv && Math.abs(vv.scale - 1) < 0.02 && vv.height < innerHeight - 60, app = $('#app'); W = innerWidth || 1; H = Math.round(seen ? vv.height : innerHeight) || 1;
  app.style.height = seen ? H + 'px' : ''; app.style.bottom = seen ? 'auto' : ''; app.style.top = seen ? vv.offsetTop + 'px' : '';
  renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); const k = Math.min(2, window.devicePixelRatio || 1); over.width = W * k; over.height = H * k; ox.setTransform(k, 0, 0, k, 0, 0);
}
function frame(dt) { step(dt); Calc.show(); renderer.render(scene, camera); diagram(); }
function boot() {
  const THREE = window.THREE; over = $('#over'); ox = over.getContext('2d');
  try { renderer = new THREE.WebGLRenderer({ canvas: $('#gl'), antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { $('#app').innerHTML = '<p id="nogl">This game needs 3D graphics, which this browser could not start. Try an up-to-date Chrome, Edge, Safari or Firefox.<br><a href="/learn/">Back to LastMind</a></p>'; return; }
  renderer.setPixelRatio(Math.min(Math.min(innerWidth, innerHeight) < 600 ? 1.6 : 2, window.devicePixelRatio || 1)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(40, 1, 0.4, 6000); UP = new THREE.Vector3(0, 1, 0); v3 = new THREE.Vector3();
  ['p', 'l', 'u'].forEach((k) => { cam[k] = new THREE.Vector3(); want[k] = new THREE.Vector3(); }); cam.u.set(0, 1, 0);
  world = buildWorld(THREE, scene, renderer);
  me = makeCar(THREE, world, { colour: 0x0f4fb8, css: '#0f4fb8', stripe: '#ffcb1f', rim: 0xd9dde2, number: '7' });
  rival = makeCar(THREE, world, { colour: 0xb8120f, css: '#b8120f', stripe: '#f5f5f0', rim: 0x2b2e33, number: '23' });
  scene.add(me.root, rival.root);
  const soft = world.canvas(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 2, 32, 32, 31); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); }); puffs = { next: 0, pool: Array.from({ length: 110 }, () => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: 0xffffff, transparent: true, depthWrite: false })); m.visible = false; scene.add(m); return m; }) };
  resize(); S.lap = makeLap(); S.work = S.lap.map(() => ({ v: null, error: 60, locked: false }));
  // side by side on the grid behind the line, for the title card
  const d = dirAt(world.lap, world.startS), l = leftOf(d); [[me, -3.3, -3], [rival, 3.3, -8]].forEach(([car, side, back]) => { const p = add(world.startPos, add(mul(d, back), mul(l, side))); car.root.position.set(p[0], 0, p[1]); car.root.rotation.y = -Math.atan2(d[1], d[0]); car.pos = p; car.head = Math.atan2(d[1], d[0]); });
  cam.p.set(me.pos[0] + 8, 3, me.pos[1] + 4); cam.l.set(me.pos[0], 1, me.pos[1]);
  addEventListener('resize', resize); if (window.visualViewport) { visualViewport.addEventListener('resize', resize); visualViewport.addEventListener('scroll', resize); }
  $('#dock').addEventListener('submit', submit);
  $('#hint').addEventListener('click', () => { Snd.radio(); engineer(!S.asked); });
  $('#begin').addEventListener('click', begin);
  $('#mute').addEventListener('click', () => { Snd.on = !Snd.on; if (Snd.out) Snd.out.gain.value = Snd.on ? 0.82 : 0; $('#mute').textContent = Snd.on ? 'Sound on' : 'Sound off'; });
  Calc.init();
  let last = performance.now();
  (function loop() { requestAnimationFrame(loop); const t = performance.now(), dt = Math.min(0.05, (t - last) / 1000); last = t; frame(dt); })();
}
boot();

})();
