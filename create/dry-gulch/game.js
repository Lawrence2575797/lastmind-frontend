/* Dry Gulch Showdown: a GCSE surds shootout game. */
(function(){
'use strict';
/* ================= surds: the questions on the ammunition crates, and the checking of what is typed ================= */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k, ease = (k) => k * k * (3 - 2 * k);
const squarefree = (n) => { if (!Number.isInteger(n) || n < 2) return false; for (let k = 2; k * k <= n; k++) if (n % (k * k) === 0) return false; return true; };
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));

/* ---------- reading an answer such as 3 + 2√5, 5√2/2 or (√7 − 1)/3 ---------- */
function parseSurd(text) {
  const clean = String(text).replace(/\s+/g, '').replace(/−|–/g, '-').replace(/×|·/g, '*').replace(/÷/g, '/').replace(/sqrt|root/gi, '√');
  const tokens = clean.match(/\d+(?:\.\d+)?|√|[-+*/()]/g) || [];
  if (!tokens.length || tokens.join('') !== clean) return null;
  let i = 0; const peek = () => tokens[i], take = () => tokens[i++];
  const starts = (t) => t !== undefined && (t === '(' || t === '√' || /^\d/.test(t));
  function sum() { let a = product(); while (peek() === '+' || peek() === '-') { const op = take(); a = { op, a, b: product() }; } return a; }
  function product() { let a = signed(); for (;;) { if (peek() === '*' || peek() === '/') { const op = take(); a = { op, a, b: signed() }; } else if (starts(peek())) a = { op: '*', a, b: factor() }; else return a; } }
  function signed() { if (peek() === '-') { take(); return { op: 'neg', a: signed() }; } if (peek() === '+') { take(); return signed(); } return factor(); }
  function factor() { const t = take(); if (t === '√') return { op: 'root', a: factor() }; if (t === '(') { const a = sum(); if (take() !== ')') throw 0; return a; } if (t === undefined || !/^\d/.test(t)) throw 0; return { op: 'num', v: parseFloat(t) }; }
  try { const tree = sum(); return i === tokens.length ? tree : null; } catch (e) { return null; }
}
function valueOf(n) {
  if (n.op === 'num') return n.v; if (n.op === 'neg') return -valueOf(n.a); if (n.op === 'root') return Math.sqrt(valueOf(n.a));
  const a = valueOf(n.a), b = valueOf(n.b); return n.op === '+' ? a + b : n.op === '-' ? a - b : n.op === '*' ? a * b : a / b;
}
const hasRoot = (n) => n.op === 'root' || (n.a && hasRoot(n.a)) || (n.b ? hasRoot(n.b) : false);
/* what still needs doing before an answer counts as simplified; empty when nothing does */
function untidy(tree) {
  let why = '';
  const walk = (n) => {
    if (why || n.op === 'num') return;
    if (n.op === 'root') { if (n.a.op !== 'num') why = 'Work out what is under each root.'; else if (!squarefree(n.a.v)) why = 'A root can still be simplified: look for a square factor under it.'; return; }
    if (n.op === '/' && hasRoot(n.b)) why = 'There is still a surd in the denominator.';
    if (n.op === '*' && hasRoot(n.a) && hasRoot(n.b)) why = 'Multiply out the surds that are still multiplied together.';
    walk(n.a); if (n.b) walk(n.b);
  };
  walk(tree); if (why) return why;
  // like terms: each kind of surd, and the plain number, appears once
  const kinds = (n) => (n.op === '+' || n.op === '-' ? kinds(n.a).concat(kinds(n.b)) : n.op === 'neg' ? kinds(n.a) : n.op === 'root' ? [n.a.v] : n.op === '*' ? (hasRoot(n.a) ? kinds(n.a) : kinds(n.b)) : n.op === '/' ? kinds(n.a) : [1]);
  const list = kinds(tree);
  return new Set(list).size === list.length ? '' : 'Collect the like terms together.';
}
/* 'right', 'wrong', 'untidy' (right value, not finished) or 'unreadable' */
function mark(question, text) {
  const tree = parseSurd(text); if (!tree) return { result: 'unreadable' };
  const v = valueOf(tree); if (!Number.isFinite(v)) return { result: 'unreadable' };
  if (Math.abs(v - question.value) > 1e-9 * Math.max(1, Math.abs(question.value))) return { result: 'wrong' };
  const why = untidy(tree); return why ? { result: 'untidy', why } : { result: 'right' };
}

/* ---------- writing surds out ---------- */
const root = (n) => '√<span class="rad">' + n + '</span>';
const minus = (v) => String(v).replace('-', '−');
/* a + b√n, tidied */
function form(a, b, n, den) {
  let t = '';
  if (a) t = minus(a);
  if (b) { const mag = Math.abs(b), body = (mag === 1 ? '' : mag) + '√' + n; t += t ? (b < 0 ? ' − ' : ' + ') + body : (b < 0 ? '−' : '') + body; }
  t = t || '0'; return den && den !== 1 ? (a && b ? '(' + t + ')/' + den : t + '/' + den) : t;
}
const frac = (top, bottom) => '<span class="frac"><span>' + top + '</span><span>' + bottom + '</span></span>';

/* ---------- the crates get harder ---------- */
const LEVELS = [
  { name: 'Simplifying surds', method: ['Find the biggest square number that divides the number under the root.', 'Split it: √(square × other) = √square × √other.', 'Root the square number and write it in front.'], example: ['√48 = √(16 × 3)', '= √16 × √3', '= 4√3'] },
  { name: 'Multiplying surds', method: ['Multiply the numbers in front together, and the numbers under the roots together: p√a × q√b = pq√(ab).', 'Then simplify the root: take out the biggest square factor.'], example: ['2√6 × 3√10 = 6√60', '= 6√(4 × 15)', '= 12√15'] },
  { name: 'Adding and subtracting surds', method: ['Surds can only be added when the number under the root matches.', 'Simplify each surd first by taking out square factors.', 'Then add or subtract the numbers in front, like collecting x terms.'], example: ['√75 − √12', '= 5√3 − 2√3', '= 3√3'] },
  { name: 'Expanding brackets', method: ['Multiply every term in the first bracket by every term in the second.', 'A surd times itself is just the number inside: √n × √n = n.', 'Collect the plain numbers together and the surds together.'], example: ['(4 + √7)(2 − √7)', '= 8 − 4√7 + 2√7 − 7', '= 1 − 2√7'] },
  { name: 'Rationalising the denominator', method: ['Multiply the top and the bottom by the surd on the bottom. This does not change the value.', 'The bottom becomes a whole number, because √n × √n = n.', 'Cancel the fraction if the numbers share a factor.'], example: ['14/√7 = (14 × √7)/(√7 × √7)', '= 14√7/7', '= 2√7'] },
  { name: 'Rationalising with a conjugate', method: ['Multiply top and bottom by the bottom with its middle sign swapped: for a + √n use a − √n.', 'The bottom becomes a² − n, with no surd left.', 'Expand the top, then divide every term by the bottom.'], example: ['22/(4 + √5)', '= 22(4 − √5)/((4 + √5)(4 − √5))', '= 22(4 − √5)/(16 − 5)', '= 2(4 − √5) = 8 − 2√5'] }
];
function makeQuestion(level, random) {
  const rnd = random || Math.random, pick = (l) => l[Math.floor(rnd() * l.length)], int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const L = clamp(level, 1, 6), done = (html, value, answer, ask) => Object.assign({ level: L, html, value, answer, ask: ask || 'Simplify' }, LEVELS[L - 1]);
  if (L === 1) { const k = int(2, 5), n = pick(k > 3 ? [2, 3, 5] : [2, 3, 5, 6, 7]); return done(root(k * k * n), k * Math.sqrt(n), k + '√' + n); }
  if (L === 2) {
    for (;;) {
      const a = pick([2, 3, 5, 6, 7, 8, 10, 12, 14, 15]), b = pick([2, 3, 5, 6, 8, 10, 12, 15]); if (a === b) continue;
      let n = a * b, s = 1; for (let k = 9; k >= 2; k--) while (n % (k * k) === 0) { n /= k * k; s *= k; }
      if (s < 2 || n < 2) continue;
      const p = pick([1, 1, 2, 3]), q = pick([1, 2, 2, 3]);
      return done((p > 1 ? p : '') + root(a) + ' × ' + (q > 1 ? q : '') + root(b), p * q * s * Math.sqrt(n), (p * q * s) + '√' + n);
    }
  }
  if (L === 3) {
    const n = pick([2, 3, 5, 7]), take = rnd() < 0.55; let j = int(2, 6), k = int(2, 5); if (take && j <= k) { j = k + int(1, 2); }
    const front = rnd() < 0.35 ? pick([2, 3]) : 1, total = take ? front * j - k : front * j + k;
    if (!total) return makeQuestion(L, rnd);
    return done((front > 1 ? front : '') + root(j * j * n) + (take ? ' − ' : ' + ') + root(k * k * n), total * Math.sqrt(n), form(0, total, n));
  }
  if (L === 4) {
    const n = pick([2, 3, 5, 6, 7]);
    if (rnd() < 0.35) { const a = int(1, 4), s = rnd() < 0.5 ? 1 : -1; return done('(' + a + (s > 0 ? ' + ' : ' − ') + root(n) + ')²', Math.pow(a + s * Math.sqrt(n), 2), form(a * a + n, 2 * a * s, n), 'Expand and simplify'); }
    const a = int(2, 5); let b = int(1, 5); if (b === a) b = a + 1; const A = a * b - n, B = b - a;
    return done('(' + a + ' + ' + root(n) + ')(' + b + ' − ' + root(n) + ')', (a + Math.sqrt(n)) * (b - Math.sqrt(n)), form(A, B, n), 'Expand and simplify');
  }
  if (L === 5) {
    const n = pick([2, 3, 5, 6, 7]), k = rnd() < 0.6 ? n * int(2, 5) : int(2, 9), g = gcd(k, n);
    return done(frac(k, root(n)), k / Math.sqrt(n), form(0, k / g, n, n / g), 'Rationalise the denominator');
  }
  for (;;) {
    const n = pick([2, 3, 5, 6, 7]), a = int(2, 4), s = rnd() < 0.5 ? 1 : -1, d = a * a - n; if (d <= 0 || d > 11) continue;
    const bottom = a + (s > 0 ? ' + ' : ' − ') + root(n);
    if (rnd() < 0.65) { const m = d === 1 ? int(2, 4) : pick([1, 2, 3]), k = d * m; return done(frac(k, bottom), k / (a + s * Math.sqrt(n)), form(m * a, -s * m, n), 'Rationalise the denominator'); }
    const k = int(1, 4), g = gcd(gcd(k * a, k), d);
    return done(frac(k, bottom), k / (a + s * Math.sqrt(n)), form(k * a / g, -s * k / g, n, d / g), 'Rationalise the denominator');
  }
}

/* ================= Dry Gulch: a one-street frontier town in the desert, all drawn in code ================= */
const BOUNDS = { x0: -34, x1: 34, z0: -58, z1: 34 };
function buildWorld(THREE, scene, renderer) {
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const solids = [], fixed = new THREE.Group(); scene.add(fixed);
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const canvas = (w, h, draw, repeat, linear) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (!linear) t.encoding = THREE.sRGBEncoding; t.anisotropy = aniso; if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  const speck = (g, w, h, n, cols, size) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[Math.floor(rnd() * cols.length)]; const s = size * (0.35 + rnd()); g.fillRect(rnd() * w, rnd() * h, s, s); } };
  const blot = (g, x, y, r, colour) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, colour); gr.addColorStop(1, colour.replace(/[\d.]+\)$/, '0)')); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); };

  /* ---------- weathered timber: a colour picture and a matching height picture, so boards catch the light ---------- */
  function boards(paint, bare, o) {
    o = o || {}; const N = 512, count = o.count || 9, bh = N / count, layout = [];
    for (let i = 0; i < count; i++) layout.push({ shade: rnd(), joints: [rnd() * N, rnd() * N] });
    const map = canvas(N, N, (g) => {
      g.fillStyle = bare; g.fillRect(0, 0, N, N);
      layout.forEach((b, i) => {
        const y = i * bh; g.save(); g.beginPath(); g.rect(0, y, N, bh); g.clip();
        if (paint) { g.fillStyle = paint; g.globalAlpha = 0.93; g.fillRect(0, y, N, bh); g.globalAlpha = 1; }
        g.fillStyle = b.shade < 0.5 ? 'rgba(0,0,0,' + (0.5 - b.shade) * 0.3 + ')' : 'rgba(255,235,200,' + (b.shade - 0.5) * 0.2 + ')'; g.fillRect(0, y, N, bh);
        for (let k = 0; k < 70; k++) { g.strokeStyle = rnd() < 0.65 ? 'rgba(35,18,6,' + (0.08 + rnd() * 0.22) + ')' : 'rgba(255,225,185,' + (0.05 + rnd() * 0.12) + ')'; g.lineWidth = 0.6 + rnd() * 1.6; const x = rnd() * N, yy = y + rnd() * bh, len = 30 + rnd() * 190; g.beginPath(); g.moveTo(x, yy); g.bezierCurveTo(x + len * 0.3, yy + rnd() * 4 - 2, x + len * 0.7, yy + rnd() * 4 - 2, x + len, yy + rnd() * 3 - 1.5); g.stroke(); }
        if (rnd() < 0.7) { const kx = rnd() * N, ky = y + bh * (0.3 + rnd() * 0.4); for (let r = 7; r > 1; r -= 1.6) { g.strokeStyle = 'rgba(40,20,8,.5)'; g.beginPath(); g.ellipse(kx, ky, r * 1.9, r * 0.8, 0, 0, 7); g.stroke(); } }
        // paint flaking off to bare wood
        if (paint) for (let k = 0; k < (o.peel === undefined ? 5 : o.peel); k++) { g.fillStyle = bare; const x = rnd() * N, yy = y + (rnd() < 0.7 ? bh - 5 : rnd() * bh); g.beginPath(); for (let a = 0; a < 7; a += 0.7) g.lineTo(x + Math.cos(a) * (5 + rnd() * 22), yy + Math.sin(a) * (1.5 + rnd() * 6)); g.fill(); }
        // each board laps over the one below and shadows it
        const lap = g.createLinearGradient(0, y, 0, y + bh * 0.3); lap.addColorStop(0, 'rgba(12,5,0,.62)'); lap.addColorStop(1, 'rgba(12,5,0,0)'); g.fillStyle = lap; if (!o.plain) g.fillRect(0, y, N, bh * 0.3);
        g.fillStyle = 'rgba(255,232,196,.2)'; if (!o.plain) g.fillRect(0, y + bh - 2.5, N, 2.5);
        if (!o.plain) b.joints.forEach((j) => { g.fillStyle = 'rgba(15,7,2,.7)'; g.fillRect(j, y, 2.5, bh); [-9, 9].forEach((dx) => { g.beginPath(); g.arc(j + dx, y + bh * 0.28, 2.4, 0, 7); g.arc(j + dx, y + bh * 0.76, 2.4, 0, 7); g.fill(); blot(g, j + dx, y + bh * 0.76 + 8, 9, 'rgba(70,30,8,.45)'); }); });
        g.restore();
      });
      for (let k = 0; k < 40; k++) blot(g, rnd() * N, rnd() * N, 14 + rnd() * 60, rnd() < 0.7 ? 'rgba(90,55,28,.16)' : 'rgba(255,225,180,.12)');
      speck(g, N, N, 2600, ['rgba(20,10,4,.25)', 'rgba(230,200,160,.2)'], 2);
    }, true);
    const bump = canvas(N, N, (g) => { if (o.plain) { g.fillStyle = '#808080'; g.fillRect(0, 0, N, N); speck(g, N, N, 5000, ['rgba(0,0,0,.35)', 'rgba(255,255,255,.35)'], 2.4); return; } layout.forEach((b, i) => { const y = i * bh, gr = g.createLinearGradient(0, y, 0, y + bh); gr.addColorStop(0, '#101010'); gr.addColorStop(0.14, '#707070'); gr.addColorStop(1, '#e8e8e8'); g.fillStyle = gr; g.fillRect(0, y, N, bh); g.fillStyle = '#000'; b.joints.forEach((j) => g.fillRect(j, y, 3, bh)); }); speck(g, N, N, 3000, ['rgba(0,0,0,.2)', 'rgba(255,255,255,.2)'], 2); }, true, true);
    return { map, bump };
  }
  const WOOD = {
    red: boards('#8c3a28', '#77593c'), ochre: boards('#b9863a', '#7d5c3a'), grey: boards(null, '#8a8174'), blue: boards('#4f6f7d', '#7c6a52'), brown: boards(null, '#6e4a2b'), white: boards('#d5ccb4', '#8a7456', { peel: 9 }), green: boards('#56633f', '#755a3c'), deck: boards(null, '#86623c', { count: 7 }), crate: boards(null, '#a87a42', { count: 6 }), dark: boards(null, '#4a311c')
  };
  const PAINT = { white: ['#ddd3ba', '#8a7456'], brown: [null, '#6e4a2b'], grey: [null, '#8a8174'], ochre: ['#b9863a', '#7d5c3a'], red: ['#8c3a28', '#77593c'], blue: ['#4f6f7d', '#7c6a52'], dark: [null, '#4a311c'], green: ['#56633f', '#755a3c'] };
  const mats = new Map();
  const keep = (key, make) => { if (!mats.has(key)) mats.set(key, make()); return mats.get(key); };
  const painted = (name) => keep('p' + name, () => { const t = boards(PAINT[name][0], PAINT[name][1], { plain: true, count: 4, peel: 2 }); const m = new THREE.MeshStandardMaterial({ map: t.map, bumpMap: t.bump, bumpScale: 0.012, roughness: 0.85 }); m.userData.tile = 1.1; return m; });
  /* tile: how many metres one copy of the picture covers; the town is painted by position so boards stay one size */
  const timber = (name, tile) => keep('w' + name + (tile || ''), () => { const m = new THREE.MeshStandardMaterial({ map: WOOD[name].map, bumpMap: WOOD[name].bump, bumpScale: 0.035, roughness: 0.92 }); m.userData.tile = tile || 1.9; return m; });
  const flat = (hex, o) => keep('c' + hex + JSON.stringify(o || {}), () => { const m = new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: 0.9 }, o)); m.color.convertSRGBToLinear(); return m; });
  const iron = flat(0x37312a, { metalness: 0.75, roughness: 0.45 });
  const shingleTex = (base) => { const rows = 8, N = 512; return { map: canvas(N, N, (g) => { for (let r = 0; r < rows; r++) { const y = r * N / rows; let x = r % 2 ? -20 : 0; while (x < N) { const w = 34 + rnd() * 34, s = rnd(); g.fillStyle = base; g.fillRect(x, y, w, N / rows); g.fillStyle = s < 0.5 ? 'rgba(0,0,0,' + (0.5 - s) * 0.55 + ')' : 'rgba(255,225,190,' + (s - 0.5) * 0.35 + ')'; g.fillRect(x, y, w, N / rows); g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(x, y, 2.5, N / rows); for (let k = 0; k < 8; k++) g.fillRect(x + rnd() * w, y + rnd() * 20, 1, 20 + rnd() * 30); x += w; } const gr = g.createLinearGradient(0, y, 0, y + N / rows); gr.addColorStop(0, 'rgba(0,0,0,.6)'); gr.addColorStop(0.28, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, y, N, N / rows); } speck(g, N, N, 2000, ['rgba(20,10,4,.3)', 'rgba(210,180,140,.22)'], 2.4); }, true), bump: canvas(N, N, (g) => { for (let r = 0; r < rows; r++) { const y = r * N / rows, gr = g.createLinearGradient(0, y, 0, y + N / rows); gr.addColorStop(0, '#000'); gr.addColorStop(1, '#fff'); g.fillStyle = gr; g.fillRect(0, y, N, N / rows); } }, true, true) }; };
  const SHINGLE = [shingleTex('#5d4634'), shingleTex('#74493a'), shingleTex('#55544d')];
  const roofMat = (k) => keep('roof' + k, () => { const m = new THREE.MeshStandardMaterial({ map: SHINGLE[k].map, bumpMap: SHINGLE[k].bump, bumpScale: 0.05, roughness: 0.95, side: THREE.DoubleSide }); m.userData.tile = 2.1; return m; });
  const brick = keep('brick', () => { const m = new THREE.MeshStandardMaterial({ map: canvas(256, 256, (g, w) => { g.fillStyle = '#b9a98e'; g.fillRect(0, 0, w, w); for (let r = 0; r < 10; r++) for (let x = r % 2 ? -26 : 0; x < w; x += 52) { g.fillStyle = ['#97452f', '#a8533a', '#7f3a28', '#9d4e33'][Math.floor(rnd() * 4)]; g.fillRect(x + 2, r * 25.6 + 2, 48, 22); } speck(g, w, w, 1500, ['rgba(0,0,0,.3)', 'rgba(255,220,190,.2)'], 2.5); }, true), roughness: 0.95 }); m.userData.tile = 0.9; return m; });
  const mesh = (g, m, x, y, z, parent) => { const o = new THREE.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; o.receiveShadow = true; (parent || fixed).add(o); return o; };
  const box = (w, h, d, m, x, y, z, parent) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z, parent);
  const cyl = (rt, rb, h, m, x, y, z, parent, seg) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 14), m, x, y, z, parent);
  const group = (x, y, z, parent) => { const g = new THREE.Group(); g.position.set(x, y, z); (parent || fixed).add(g); return g; };
  /* a squared beam from one point to another, for braces and ladders */
  const beam = (a, b, thick, m, parent) => { const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), o = box(thick, thick, d.length(), m, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, parent); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.normalize()); return o; };
  const solid = (x, z, w, d, y1, y0, kind) => { const s = { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, y0: y0 || 0, y1, kind: kind || 'wood' }; solids.push(s); return s; };

  /* ---------- sky, light and ground ---------- */
  const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 18), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 p; void main(){ p = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 p;
      float h(vec2 q){ return fract(sin(dot(q, vec2(127.1,311.7))) * 43758.5453); }
      float n(vec2 q){ vec2 i = floor(q), f = fract(q); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 q){ float v = 0.0, a = 0.5; for(int k=0;k<5;k++){ v += a*n(q); q *= 2.07; a *= 0.52; } return v; }
      void main(){ vec3 d = normalize(p); float y = max(d.y, 0.0);
        vec3 c = mix(vec3(0.93,0.74,0.56), vec3(0.27,0.48,0.78), pow(y, 0.5));
        float s = max(dot(d, normalize(vec3(-0.55,0.42,-0.35))), 0.0); c += vec3(1.0,0.82,0.52) * (pow(s, 900.0)*2.2 + pow(s, 9.0)*0.26);
        vec2 q = d.xz / (y + 0.14) * 1.4; float f = fbm(q), g = fbm(q*2.4 + 4.0);
        float cl = smoothstep(0.5,0.78,f) * smoothstep(0.03,0.2,y);
        c = mix(c, mix(vec3(0.82,0.66,0.6), vec3(1.0,0.94,0.84), g*1.3), cl * 0.85);
        gl_FragColor = vec4(c, 1.0); }` })); scene.add(sky);
  scene.fog = new THREE.Fog(0xdcb490, 60, 380);
  scene.add(new THREE.HemisphereLight(0xc4d8ff, 0x9a6844, 0.84));
  const sun = new THREE.DirectionalLight(0xffdcaa, 1.75); sun.position.set(-48, 44, -8); sun.target.position.set(0, 0, -10); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.035; sun.shadow.radius = 2;
  const sc = sun.shadow.camera; sc.left = sc.bottom = -56; sc.right = sc.top = 56; sc.near = 5; sc.far = 190; scene.add(sun, sun.target);
  const pebbles = [];
  for (let i = 0; i < 1500; i++) pebbles.push([rnd(), rnd(), 1 + rnd() * rnd() * 6]);
  const ground = (colour) => canvas(1024, 1024, (g, w) => { g.fillStyle = colour ? '#b98456' : '#808080'; g.fillRect(0, 0, w, w); let s = 99; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; for (let i = 0; i < 220; i++) { const rad = 20 + r() * 130, x = r() * w, y = r() * w, light = r() < 0.5; blot(g, x, y, rad, colour ? (light ? 'rgba(222,178,122,.34)' : 'rgba(140,90,50,.34)') : (light ? 'rgba(190,190,190,.35)' : 'rgba(80,80,80,.35)')); } for (let i = 0; i < 42000; i++) { const v = r(); g.fillStyle = colour ? ['rgba(105,66,36,.5)', 'rgba(236,204,158,.45)', 'rgba(150,102,62,.45)', 'rgba(82,56,38,.35)'][Math.floor(v * 4)] : v < 0.5 ? 'rgba(40,40,40,.4)' : 'rgba(215,215,215,.4)'; const z = 0.8 + r() * 2.6; g.fillRect(r() * w, r() * w, z, z); } pebbles.forEach(([x, y, z]) => { g.fillStyle = colour ? 'rgba(60,38,24,.5)' : '#303030'; g.beginPath(); g.ellipse(x * w + 1.5, y * w + 2, z * 1.1, z * 0.8, 0, 0, 7); g.fill(); g.fillStyle = colour ? 'rgba(205,176,142,.85)' : '#e0e0e0'; g.beginPath(); g.ellipse(x * w, y * w, z, z * 0.7, 0, 0, 7); g.fill(); }); }, true, !colour);
  const sandMap = ground(true), sandBump = ground(false); sandMap.repeat.set(56, 56); sandBump.repeat.set(56, 56);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshStandardMaterial({ map: sandMap, bumpMap: sandBump, bumpScale: 0.06, roughness: 1 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const road = canvas(512, 1024, (g, w, h) => { g.fillStyle = 'rgba(134,88,52,.55)'; g.fillRect(0, 0, w, h); for (const x of [112, 172, 330, 392]) { for (let y = 0; y < h; y += 3) { g.fillStyle = 'rgba(62,36,18,' + (0.18 + rnd() * 0.17) + ')'; g.fillRect(x + Math.sin(y * 0.006 * Math.PI) * 8 + rnd() * 3, y, 13 + rnd() * 5, 3.5); g.fillStyle = 'rgba(232,194,146,.28)'; g.fillRect(x + Math.sin(y * 0.006 * Math.PI) * 8 + 19, y, 4, 3); } } for (let i = 0; i < 80; i++) { const x = 196 + rnd() * 118, y = rnd() * h; g.strokeStyle = 'rgba(62,36,18,.26)'; g.lineWidth = 2.2; g.beginPath(); g.arc(x, y, 4.5, rnd() * 0.4 + 0.6, Math.PI * 2 - 0.9); g.stroke(); } speck(g, w, h, 8000, ['rgba(80,50,28,.5)', 'rgba(220,182,135,.45)'], 3.4); const edge = g.createLinearGradient(0, 0, w, 0); g.globalCompositeOperation = 'destination-in'; edge.addColorStop(0, 'rgba(0,0,0,0)'); edge.addColorStop(0.14, '#000'); edge.addColorStop(0.86, '#000'); edge.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = edge; g.fillRect(0, 0, w, h); }, true);
  road.repeat.set(1, 6); const street = new THREE.Mesh(new THREE.PlaneGeometry(16, 108), new THREE.MeshStandardMaterial({ map: road, transparent: true, roughness: 1, depthWrite: false })); street.position.set(0, 0.012, -12); street.rotation.x = -Math.PI / 2; street.receiveShadow = true; scene.add(street);

  /* ---------- buildings: shaped false fronts, shingled roofs, framed windows, plank walks and braced porches ---------- */
  const signTex = (text, ink, back) => canvas(1024, 192, (g, w, h) => { g.fillStyle = back; g.fillRect(0, 0, w, h); for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(70,40,16,.16)'; g.fillRect(0, i * 40 + 18, w, 3); } for (let i = 0; i < 26; i++) blot(g, rnd() * w, rnd() * h, 20 + rnd() * 70, 'rgba(90,55,25,.2)'); g.strokeStyle = ink; g.lineWidth = 8; g.strokeRect(16, 16, w - 32, h - 32); g.lineWidth = 2; g.strokeRect(30, 30, w - 60, h - 60); let size = 112; do { g.font = size + 'px Rye, Georgia, serif'; size -= 4; } while (g.measureText(text).width > w - 120); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(0,0,0,.35)'; g.fillText(text, w / 2 + 5, h / 2 + 11); g.fillStyle = ink; g.fillText(text, w / 2, h / 2 + 6); speck(g, w, h, 1800, [back, 'rgba(60,35,15,.3)'], 3.4); });
  const glassTex = (curtain) => canvas(128, 160, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#8fa6b8'); gr.addColorStop(0.4, '#2f3b4a'); gr.addColorStop(1, '#141a24'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(220,235,255,.2)'; g.beginPath(); g.moveTo(10, 0); g.lineTo(52, 0); g.lineTo(8, h); g.lineTo(0, h); g.lineTo(0, 40); g.fill(); if (curtain) { g.fillStyle = curtain; [0, 1].forEach((s) => { g.beginPath(); const x = s ? w : 0, d = s ? -1 : 1; g.moveTo(x, 0); g.lineTo(x + d * 46, 0); g.quadraticCurveTo(x + d * 14, 70, x + d * 26, h); g.lineTo(x, h); g.fill(); }); } });
  const GLASS = [null, 'rgba(150,52,40,.9)', 'rgba(212,198,160,.88)'].map((c) => new THREE.MeshStandardMaterial({ map: glassTex(c), roughness: 0.14, metalness: 0.25 }));
  const lampGlass = flat(0xffd98a, { emissive: 0xffb13a, emissiveIntensity: 0.75, roughness: 0.3 });
  const lantern = (x, y, z, parent) => { const g = group(x, y, z, parent); box(0.05, 0.05, 0.22, iron, 0, 0.2, -0.08, g); box(0.17, 0.03, 0.17, iron, 0, 0.13, 0.02, g); mesh(new THREE.ConeGeometry(0.13, 0.1, 4), iron, 0, 0.19, 0.02, g).rotation.y = Math.PI / 4; box(0.12, 0.2, 0.12, lampGlass, 0, 0.02, 0.02, g); box(0.15, 0.03, 0.15, iron, 0, -0.095, 0.02, g); [-1, 1].forEach((a) => [-1, 1].forEach((b) => box(0.012, 0.22, 0.012, iron, a * 0.062, 0.02, 0.02 + b * 0.062, g))); };
  const window_ = (g, x, y, w, h, trim, glass, shutters) => {
    box(w, h, 0.05, GLASS[glass || 0], x, y, 0.07, g);
    [-1, 1].forEach((s) => box(0.11, h + 0.2, 0.14, trim, x + s * (w / 2 + 0.045), y, 0.09, g)); box(w + 0.36, 0.11, 0.2, trim, x, y + h / 2 + 0.1, 0.12, g); box(w + 0.5, 0.05, 0.26, trim, x, y + h / 2 + 0.18, 0.12, g); box(w + 0.34, 0.08, 0.24, trim, x, y - h / 2 - 0.08, 0.13, g);
    box(0.045, h, 0.05, trim, x, y, 0.115, g); box(w, 0.05, 0.05, trim, x, y + 0.04, 0.115, g); [-1, 1].forEach((s) => box(0.025, h / 2 - 0.05, 0.035, trim, x + s * w * 0.25, y + h / 4 + 0.03, 0.11, g));
    if (shutters) [-1, 1].forEach((s) => { const sx = x + s * (w * 0.75 + 0.14); box(w * 0.44, h, 0.04, shutters, sx, y, 0.1, g); [-0.42, -0.28, -0.14, 0, 0.14, 0.28, 0.42].forEach((k) => { box(w * 0.36, 0.05, 0.03, shutters, sx, y + k * h, 0.135, g).rotation.x = 0.5; }); });
  };
  const door = (g, x, y, trim, wood, batwing) => {
    [-1, 1].forEach((s) => box(0.15, 2.5, 0.16, trim, x + s * 0.72, y + 1.25, 0.08, g)); box(1.75, 0.16, 0.22, trim, x, y + 2.55, 0.11, g); box(1.95, 0.06, 0.3, trim, x, y + 2.66, 0.12, g);
    if (batwing) { box(1.3, 2.45, 0.05, flat(0x150b06), x, y + 1.22, 0.03, g); [-1, 1].forEach((s) => { const w = group(x + s * 0.34, y + 1.12, 0.15, g); w.rotation.y = -s * 0.2; box(0.62, 0.07, 0.05, wood, 0, 0.45, 0, w); box(0.62, 0.07, 0.05, wood, 0, -0.42, 0, w); [-0.28, 0.28].forEach((e) => box(0.07, 0.92, 0.055, wood, e, 0.01, 0, w)); for (let k = -3; k <= 3; k++) box(0.5, 0.075, 0.025, wood, 0, k * 0.115, 0, w).rotation.x = 0.55; }); return; }
    box(1.28, 2.45, 0.07, wood, x, y + 1.22, 0.06, g); [[-0.3, 1.78, 0.44, 0.92], [0.3, 1.78, 0.44, 0.92], [-0.3, 0.62, 0.44, 0.84], [0.3, 0.62, 0.44, 0.84]].forEach(([dx, dy, w, h], i) => { box(w + 0.07, h + 0.07, 0.03, trim, x + dx, y + dy, 0.095, g); box(w - 0.05, h - 0.05, 0.05, i < 2 ? GLASS[2] : wood, x + dx, y + dy, 0.105, g); }); mesh(new THREE.SphereGeometry(0.05, 10, 8), flat(0xc9a14a, { metalness: 0.8, roughness: 0.3 }), x + 0.5, y + 1.18, 0.17, g);
  };
  // side −1 is the west side of the street, +1 the east; each building faces the road
  function building(side, z, wide, tall, name, colour, trimName, opt) {
    opt = opt || {}; const depth = 6, front = side * 10.4, cx = front + side * depth / 2, g = group(front, 0, z); g.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    const wall = timber(colour), trim = painted(trimName), woodDoor = painted('dark');
    // inside the group: +z looks at the street, x runs along the frontage
    box(wide, tall, depth, wall, 0, tall / 2, -depth / 2, g);
    box(wide + 0.16, 0.34, depth + 0.1, timber('dark'), 0, 0.17, -depth / 2 - 0.06, g);
    [-1, 1].forEach((s) => [-0.04, -depth + 0.04].forEach((zz) => box(0.18, tall, 0.18, trim, s * (wide / 2), tall / 2, zz, g)));
    // pitched roof behind the front
    const rise = 1.05, half = wide / 2 + 0.25, slope = Math.atan2(rise, half), len = Math.hypot(rise, half);
    [-1, 1].forEach((s) => { const r = box(len + 0.1, 0.09, depth - 0.1, roofMat(opt.roof || 0), s * half / 2, tall + rise / 2 + 0.02, -depth / 2 - 0.12, g); r.rotation.z = -s * slope; });
    box(0.22, 0.12, depth, timber('dark'), 0, tall + rise + 0.08, -depth / 2 - 0.1, g);
    { const s = new THREE.Shape(); s.moveTo(-wide / 2, 0); s.lineTo(wide / 2, 0); s.lineTo(0, rise - 0.05); mesh(new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false }), wall, 0, tall, -depth, g); }
    // the false front, cut to shape
    const w2 = wide / 2 + 0.15, f = tall + 1.55, style = opt.style || 'flat', s = new THREE.Shape(), top = [];
    if (style === 'step') top.push([-w2, f - 0.35], [-w2 * 0.52, f - 0.35], [-w2 * 0.52, f + 0.75], [w2 * 0.52, f + 0.75], [w2 * 0.52, f - 0.35], [w2, f - 0.35]);
    else if (style === 'arch') { top.push([-w2, f - 0.2], [-w2 * 0.72, f - 0.2]); for (let k = 0; k <= 14; k++) { const u = -1 + k / 7; top.push([u * w2 * 0.7, f - 0.2 + (1 - u * u) * 1.05]); } top.push([w2 * 0.72, f - 0.2], [w2, f - 0.2]); }
    else if (style === 'peak') top.push([-w2, f - 0.15], [-w2 * 0.6, f - 0.15], [0, f + 0.9], [w2 * 0.6, f - 0.15], [w2, f - 0.15]);
    else top.push([-w2, f], [w2, f]);
    s.moveTo(-w2, tall - 0.15); top.forEach((p) => s.lineTo(p[0], p[1])); s.lineTo(w2, tall - 0.15);
    mesh(new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: false }), wall, 0, 0, -0.08, g);
    for (let k = 0; k < top.length - 1; k++) { const a = top[k], b = top[k + 1]; beam([a[0], a[1] + 0.05, 0.08], [b[0], b[1] + 0.05, 0.08], 0.13, trim, g); beam([a[0], a[1] + 0.16, 0.12], [b[0], b[1] + 0.16, 0.12], 0.07, timber('dark', 1), g); }
    box(wide + 0.5, 0.13, 0.34, trim, 0, tall - 0.05, 0.13, g); box(wide + 0.7, 0.07, 0.42, trim, 0, tall + 0.06, 0.13, g); for (let x = -wide / 2 + 0.2; x <= wide / 2 - 0.15; x += 0.46) box(0.1, 0.16, 0.2, trim, x, tall - 0.19, 0.14, g);
    const sw = wide * 0.72, sh = sw * 192 / 1024, sy = tall + 0.16 + sh / 2 + (f - tall - 0.5 - sh) / 2;
    box(sw + 0.18, sh + 0.18, 0.07, timber('dark', 1), 0, sy, 0.15, g);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshStandardMaterial({ map: signTex(name, opt.ink || '#2b160a', opt.board || '#e2cd9e'), roughness: 0.82 })); sign.position.set(0, sy, 0.2); sign.receiveShadow = true; g.add(sign);
    // doors, windows and lamps
    door(g, 0, 0.18, trim, woodDoor, opt.batwing); lantern(-1.15, 2.35, 0.2, g);
    if (wide > 6) [-1, 1].forEach((k) => window_(g, k * wide * 0.31, 1.7, 1.15, 1.35, trim, opt.glass, wide > 8.2 ? null : timber('dark', 1)));
    if (tall > 5) [-1, 0, 1].forEach((k) => window_(g, k * wide * 0.31, 4.78, 0.95, 1.2, trim, (k + 2) % 3, opt.upShutters ? timber('green', 1) : null));
    [-1, 1].forEach((k) => { const sg = group(k * wide / 2, 0, -depth / 2, g); sg.rotation.y = k * Math.PI / 2; [-1.4, 1.4].forEach((x) => window_(sg, x, 1.9, 0.9, 1.15, trim, 0, null)); });
    // plank walk: separate boards on beams, with a step down to the road
    for (let x = -wide / 2 - 0.15; x < wide / 2 + 0.1; x += 0.3) box(0.27, 0.07 + rnd() * 0.012, 2.35, timber('deck', 1.4), x + 0.15, 0.15, 1.16, g);
    box(wide + 0.45, 0.13, 0.12, timber('dark'), 0, 0.065, 2.3, g); box(wide * 0.42, 0.08, 0.36, timber('deck', 1.4), 0, 0.05, 2.52, g);
    // porch: squared posts with feet, caps and braces under a shingled lean-to
    const posts = []; for (let k = 0; k <= 2; k++) posts.push(-wide / 2 + 0.2 + k * (wide - 0.4) / 2);
    posts.forEach((x) => { box(0.15, 3.1, 0.15, trim, x, 1.72, 2.16, g); box(0.24, 0.2, 0.24, trim, x, 0.29, 2.16, g); box(0.23, 0.09, 0.23, trim, x, 2.86, 2.16, g); [-1, 1].forEach((d) => { if (Math.abs(x + d * 0.55) < wide / 2) beam([x, 2.65, 2.16], [x + d * 0.55, 3.16, 2.16], 0.08, trim, g); }); const wz = z + (side < 0 ? -x : x), wx = front - side * 2.16; solid(wx, wz, 0.22, 0.22, 3.2); });
    box(wide + 0.3, 0.17, 0.17, trim, 0, 3.2, 2.16, g); for (let x = -wide / 2; x <= wide / 2 + 0.01; x += wide / 8) beam([x, 3.43, 0.05], [x, 3.24, 2.55], 0.08, timber('dark', 1), g);
    const roof = box(wide + 0.6, 0.07, 2.65, roofMat(opt.roof || 0), 0, 3.38, 1.28, g); roof.rotation.x = 0.075; box(wide + 0.62, 0.15, 0.06, trim, 0, 3.25, 2.62, g);
    if (opt.balcony) { for (let x = -wide / 2 + 0.2; x <= wide / 2 - 0.1; x += 0.3) cyl(0.028, 0.028, 0.8, trim, x, 3.86, 2.34, g, 8); [-1, 0, 1].forEach((k) => { box(0.13, 1.05, 0.13, trim, k * (wide / 2 - 0.15), 3.92, 2.34, g); mesh(new THREE.SphereGeometry(0.09, 10, 8), trim, k * (wide / 2 - 0.15), 4.5, 2.34, g); }); box(wide + 0.2, 0.09, 0.16, trim, 0, 4.31, 2.34, g); }
    // clutter along the walk
    if (opt.bench) { const bx = -wide * 0.3; box(1.5, 0.07, 0.42, woodDoor, bx, 0.66, 0.42, g); box(1.5, 0.36, 0.06, woodDoor, bx, 0.98, 0.22, g); [-0.65, 0.65].forEach((d) => { box(0.07, 0.48, 0.4, woodDoor, bx + d, 0.43, 0.42, g); box(0.07, 0.6, 0.07, woodDoor, bx + d, 0.9, 0.22, g); }); }
    if (opt.chimney) { box(0.62, 2.4, 0.62, brick, wide * 0.28, tall + 1.35, -depth * 0.68, g); box(0.76, 0.16, 0.76, brick, wide * 0.28, tall + 2.6, -depth * 0.68, g); }
    if (opt.pipe) { cyl(0.13, 0.13, 1.9, iron, -wide * 0.3, tall + 1.2, -depth * 0.55, g); mesh(new THREE.ConeGeometry(0.26, 0.18, 12), iron, -wide * 0.3, tall + 2.28, -depth * 0.55, g); }
    solid(cx, z, depth, wide, f);
  }
  building(-1, 16, 8, 4.2, 'GENERAL STORE', 'ochre', 'brown', { style: 'step', bench: true, pipe: true, glass: 2 });
  building(-1, 6, 9.5, 6.4, 'SALOON', 'red', 'white', { balcony: true, style: 'arch', batwing: true, chimney: true, glass: 1, roof: 1, upShutters: true });
  building(-1, -5, 7.5, 4.4, 'BANK', 'grey', 'white', { board: '#2f3a2c', ink: '#e9d89c', style: 'peak', roof: 2 });
  building(-1, -16, 8.5, 5.6, 'HOTEL', 'blue', 'white', { style: 'step', glass: 2, chimney: true, bench: true });
  building(-1, -28, 8, 4, 'UNDERTAKER', 'grey', 'brown', { style: 'peak', pipe: true, roof: 2 });
  building(1, 13, 8.5, 4.4, 'SHERIFF', 'brown', 'ochre', { board: '#e9ddc0', style: 'flat', bench: true, chimney: true });
  building(1, 2, 7.5, 4.2, 'BARBER', 'white', 'blue', { style: 'arch', glass: 2, roof: 1 });
  building(1, -9, 9, 5.8, 'ASSAY OFFICE', 'ochre', 'red', { style: 'step', upShutters: true, pipe: true });
  building(1, -21, 8, 4.2, 'BLACKSMITH', 'dark', 'grey', { style: 'peak', chimney: true, roof: 2 });
  building(1, -32, 7.5, 4.6, 'STABLES', 'red', 'white', { style: 'flat', roof: 1 });
  // the church closes the far end
  { const g = group(0, 0, -52), white = timber('white'), trim = painted('grey');
    box(9, 5.2, 8, white, 0, 2.6, 0, g); box(9.2, 0.4, 8.2, timber('dark'), 0, 0.2, 0, g);
    [-1, 1].forEach((s) => { const r = box(5.7, 0.14, 8.7, roofMat(0), s * 2.38, 6.55, 0, g); r.rotation.z = -s * 0.53; [-4, 4].forEach((z) => box(0.2, 5.2, 0.2, trim, s * 4.5, 2.6, z, g)); });
    [4, -4.12].forEach((z) => { const sh = new THREE.Shape(); sh.moveTo(-4.5, 0); sh.lineTo(4.5, 0); sh.lineTo(0, 2.65); mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: false }), white, 0, 5.2, z - 0.06, g); });
    const t = group(0, 0, 4, g); box(2.8, 7.2, 2.8, white, 0, 3.6, 0, t); box(3.2, 0.18, 3.2, trim, 0, 7.3, 0, t); [-1, 1].forEach((a) => [-1, 1].forEach((b) => box(0.28, 1.5, 0.28, white, a * 1.15, 8.1, b * 1.15, t))); mesh(new THREE.SphereGeometry(0.5, 16, 10, 0, 6.29, 0, 1.9), flat(0xa9822f, { metalness: 0.8, roughness: 0.35 }), 0, 7.95, 0, t); box(3.1, 0.18, 3.1, trim, 0, 8.92, 0, t);
    mesh(new THREE.ConeGeometry(2.15, 3.8, 4), roofMat(0), 0, 10.9, 0, t).rotation.y = Math.PI / 4; box(0.14, 1.5, 0.14, timber('dark', 1), 0, 13.4, 0, t); box(0.85, 0.14, 0.14, timber('dark', 1), 0, 13.6, 0, t);
    const arched = (x, y, z, parent, turn) => { const a = group(x, y, z, parent); a.rotation.y = turn || 0; const sh = new THREE.Shape(); sh.moveTo(-0.45, -0.85); sh.lineTo(0.45, -0.85); sh.lineTo(0.45, 0.45); sh.absarc(0, 0.45, 0.45, 0, Math.PI, false); mesh(new THREE.ShapeGeometry(sh), GLASS[0], 0, 0, 0.06, a); mesh(new THREE.TorusGeometry(0.5, 0.07, 8, 20, Math.PI), trim, 0, 0.45, 0.06, a); [-0.5, 0.5].forEach((d) => box(0.1, 1.35, 0.1, trim, d, -0.2, 0.06, a)); box(1.2, 0.1, 0.2, trim, 0, -0.9, 0.08, a); box(0.04, 1.7, 0.03, trim, 0, 0, 0.09, a); box(0.9, 0.04, 0.03, trim, 0, 0.1, 0.09, a); };
    arched(-3, 2.6, 4.02, g); arched(3, 2.6, 4.02, g); arched(0, 4.9, 1.41, t); [-2.2, 0.8].forEach((z) => { arched(-4.5, 2.6, z, g, -Math.PI / 2); arched(4.5, 2.6, z, g, Math.PI / 2); });
    solid(0, -52, 9, 8, 7); solid(0, -48, 2.8, 2.8, 9); }
  { const g = group(0, 0, -46.6); door(g, 0, 0, timber('grey', 1.2), timber('dark', 1.2), false); }

  /* ---------- things to hide behind ---------- */
  const crateBox = (x, y, z, s, turn, parent) => { const g = group(x, y + s / 2, z, parent); g.rotation.y = turn || 0; const m = timber('crate', 0.9), edge = timber('brown', 0.8), t = s * 0.11, e = s / 2 - t / 2 + 0.008; box(s * 0.96, s * 0.96, s * 0.96, m, 0, 0, 0, g); [-1, 1].forEach((a) => [-1, 1].forEach((b) => { box(t, s, t, edge, a * e, 0, b * e, g); box(s, t, t, edge, 0, a * e, b * e, g); box(t, t, s, edge, a * e, b * e, 0, g); })); [-1, 1].forEach((a) => { beam([-e, -e, a * (s / 2)], [e, e, a * (s / 2)], t * 0.75, edge, g); beam([a * (s / 2), -e, e], [a * (s / 2), e, -e], t * 0.75, edge, g); }); return g; };
  const barrelGeo = new THREE.LatheGeometry([[0.001, 0], [0.34, 0], [0.4, 0.14], [0.45, 0.34], [0.47, 0.55], [0.45, 0.76], [0.4, 0.96], [0.34, 1.1], [0.31, 1.1], [0.31, 1.07], [0.001, 1.07]].map((p) => new THREE.Vector2(p[0], p[1])), 22);
  const staves = keep('staves', () => new THREE.MeshStandardMaterial({ map: canvas(512, 128, (g, w, h) => { for (let x = 0; x < w; x += 32) { g.fillStyle = ['#7a512e', '#6a4424', '#855a33', '#5f3c20'][Math.floor(rnd() * 4)]; g.fillRect(x, 0, 32, h); g.fillStyle = 'rgba(15,6,0,.75)'; g.fillRect(x, 0, 2.5, h); for (let k = 0; k < 10; k++) { g.fillStyle = 'rgba(30,14,4,.3)'; g.fillRect(x + rnd() * 30, rnd() * h, 1, 20 + rnd() * 60); } } speck(g, w, h, 900, ['rgba(0,0,0,.3)', 'rgba(230,190,140,.2)'], 2.5); }), roughness: 0.8 }));
  const barrel = (x, z, y) => { const g = group(x, y || 0, z); g.rotation.y = rnd() * 6; mesh(barrelGeo, staves, 0, 0, 0, g); [[0.09, 0.378], [0.28, 0.443], [0.82, 0.443], [1.02, 0.375]].forEach(([h, r]) => { const hoop = mesh(new THREE.CylinderGeometry(r + 0.012, r + 0.012, 0.055, 26, 1, true), iron, 0, h, 0, g); hoop.material.side = THREE.DoubleSide; }); };
  // a pile of cover: wide enough to crouch behind, low enough to shoot over
  const pile = (x, z, y) => { y = y || 0; const w = 1.9, h = 1.2; if (rnd() < 0.5) { crateBox(x - 0.48, y, z, 0.94, rnd() * 0.16 - 0.08); crateBox(x + 0.47, y, z + 0.02, 0.92, rnd() * 0.16 - 0.08); crateBox(x - 0.42, y + 0.94, z, 0.34, 0.5); barrel(x + 0.47, z, y + 0.11); } else { barrel(x - 0.52, z, y + 0.07); barrel(x + 0.44, z + 0.03, y + 0.07); crateBox(x - 0.04, y, z + 0.04, 0.64, 0.28); crateBox(x - 0.03, y + 0.64, z, 0.56, -0.2); } solid(x, z, w, 0.95, y + h, y); };
  const wheel = (g, x, y, z, r) => { const w = group(x, y, z, g), wood = timber('brown', 0.8); mesh(new THREE.TorusGeometry(r, 0.045, 8, 34), wood, 0, 0, 0, w); mesh(new THREE.TorusGeometry(r + 0.042, 0.018, 6, 34), iron, 0, 0, 0, w).scale.z = 2; for (let k = 0; k < 12; k++) { const sp = cyl(0.022, 0.03, r - 0.04, wood, 0, 0, 0, w, 8); const a = k * Math.PI / 6; sp.position.set(Math.cos(a) * r / 2, Math.sin(a) * r / 2, 0); sp.rotation.z = a - Math.PI / 2; } cyl(0.1, 0.1, 0.2, wood, 0, 0, 0, w, 12).rotation.x = Math.PI / 2; cyl(0.045, 0.045, 0.28, iron, 0, 0, 0, w, 10).rotation.x = Math.PI / 2; };
  const wagon = (x, z, turn, cover) => { const g = group(x, 0, z); g.rotation.y = turn; const deck = timber('deck', 1.3), side = timber('brown', 1.2); box(3.4, 0.12, 1.55, deck, 0, 0.84, 0, g); [-1, 1].forEach((s) => { [1.04, 1.27, 1.5].forEach((h) => box(3.45, 0.19, 0.07, side, 0, h, s * 0.78, g)); [-1.55, -0.5, 0.55, 1.55].forEach((px) => box(0.09, 0.8, 0.06, timber('dark', 1), px, 1.2, s * 0.83, g)); beam([-1.6, 0.68, s * 0.55], [1.6, 0.68, s * 0.55], 0.14, side, g); }); [-1, 1].forEach((s) => [1.04, 1.27, 1.5].forEach((h) => box(0.07, 0.19, 1.55, side, s * 1.69, h, 0, g))); [-1.15, 1.15].forEach((a) => { beam([a, 0.62, -0.95], [a, 0.62, 0.95], 0.11, timber('dark', 1), g); [-1, 1].forEach((s) => wheel(g, a, a < 0 ? 0.66 : 0.58, s * 0.96, a < 0 ? 0.62 : 0.54)); }); beam([1.7, 0.66, 0.2], [3.3, 0.3, 0], 0.09, side, g); beam([1.7, 0.66, -0.2], [3.3, 0.3, 0], 0.09, side, g);
    if (cover) { const cloth = flat(0xd9ceb2, { side: THREE.DoubleSide, roughness: 1 }); const c = mesh(new THREE.CylinderGeometry(0.86, 0.86, 3.1, 18, 6, true, -Math.PI / 2, Math.PI), cloth, 0, 1.5, 0, g); c.rotation.set(-Math.PI / 2, 0, Math.PI / 2); [-1.5, -0.75, 0, 0.75, 1.5].forEach((px) => mesh(new THREE.TorusGeometry(0.875, 0.025, 6, 20, Math.PI), timber('dark', 1), px, 1.5, 0, g).rotation.y = Math.PI / 2); }
    else { const load = timber('crate', 0.9); crateBox(-0.6, 0.9, 0, 0.62, 0.3, g); const sack = flat(0xb59a6a); [[0.5, -0.3], [0.9, 0.25], [0.35, 0.3]].forEach(([sx, sz]) => mesh(new THREE.SphereGeometry(0.34, 12, 10), sack, sx, 1.12, sz, g).scale.set(1, 0.75, 0.85)); }
    if (!cover) { const along = Math.abs(Math.cos(turn)) > 0.5; solid(x, z, along ? 3.5 : 1.9, along ? 1.9 : 3.5, 1.56); } };
  const hayMat = keep('hay', () => { const m = new THREE.MeshStandardMaterial({ map: canvas(256, 256, (g, w) => { g.fillStyle = '#b8892f'; g.fillRect(0, 0, w, w); for (let i = 0; i < 2600; i++) { g.strokeStyle = ['#e6c263', '#8f681c', '#f0d684', '#6f4f12', '#caa13e'][Math.floor(rnd() * 5)]; g.lineWidth = 0.8 + rnd() * 1.4; const x = rnd() * w, y = rnd() * w, a = (rnd() - 0.5) * 0.9, l = 8 + rnd() * 26; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } }, true), roughness: 1 }); m.bumpMap = m.map; m.bumpScale = 0.06; m.userData.tile = 0.85; return m; });
  const straw = flat(0xcfa845);
  const hay = (x, z, turn) => { const end = Math.abs(Math.sin(turn)) > 0.7, g = group(x, 0, z); g.rotation.y = end ? Math.PI / 2 : 0; [[0, 0.31, 1.7], [0.02, 0.93, 1.66]].forEach(([dx, y, w]) => { const geo = new THREE.BoxGeometry(w, 0.6, 0.93, 10, 4, 6), p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const px = p.getX(i), py = p.getY(i), pz = p.getZ(i), round = Math.pow(Math.abs(py) / 0.3, 4) * 0.045; p.setXYZ(i, px * (1 - round * 0.4) + (rnd() - 0.5) * 0.02, py + (rnd() - 0.5) * 0.015, pz * (1 - round) + (rnd() - 0.5) * 0.02); } geo.computeVertexNormals(); mesh(geo, hayMat, dx, y, 0, g); [-0.46, 0.46].forEach((tx) => { box(0.028, 0.615, 0.95, iron, dx + tx, y, 0, g); }); }); for (let i = 0; i < 90; i++) { const s = box(0.012, 0.006, 0.18 + rnd() * 0.2, straw, (rnd() - 0.5) * 2.4, 0.015, (rnd() - 0.5) * 1.7, g); s.rotation.y = rnd() * 6; s.castShadow = false; } solid(x, z, end ? 0.95 : 1.7, end ? 1.7 : 0.95, 1.23); };
  const water = flat(0x3f6470, { roughness: 0.08, metalness: 0.55 });
  const trough = (x, z) => { const m = timber('brown', 1); [-1, 1].forEach((s) => { box(0.08, 0.52, 2.3, m, x + s * 0.38, 0.48, z); box(0.82, 0.52, 0.08, m, x, 0.48, z + s * 1.15); box(0.9, 0.24, 0.16, timber('dark', 1), x, 0.12, z + s * 0.85); [-1, 1].forEach((t) => box(0.1, 0.56, 0.1, timber('dark', 1), x + s * 0.4, 0.49, z + t * 1.14)); }); box(0.72, 0.06, 2.24, m, x, 0.26, z); box(0.7, 0.02, 2.22, water, x, 0.66, z); solid(x, z, 0.85, 2.35, 0.78); };
  const rail = (x, z, len) => { const m = timber('brown', 1); [-1, 0, 1].forEach((s) => { cyl(0.075, 0.095, 1.05, m, x, 0.52, z + s * len / 2, null, 9); mesh(new THREE.SphereGeometry(0.077, 9, 6), m, x, 1.05, z + s * len / 2); }); const r = cyl(0.06, 0.07, len + 0.4, m, x, 0.96, z, null, 9); r.rotation.x = Math.PI / 2; };

  /* each post is a piece of cover and the spot behind it where an outlaw crouches */
  const posts = [];
  const post = (x, z, y) => { y = y || 0; pile(x, z, y); posts.push({ x, z: z - 1.05, y }); };
  post(-5.6, -2); post(5.4, -7); post(-3.2, -17); post(6.2, -19.5); post(1.8, -27); post(-6.4, -30); post(4.2, -36); post(-1.5, -39); post(-13, -9.6); post(13, -2.6); post(13, -41); post(-14, -39);
  // the saloon balcony
  { barrel(-9.2, 7.15, 3.42); barrel(-9.2, 8.05, 3.42); solid(-9.2, 7.6, 0.9, 1.9, 4.52, 3.38); posts.push({ x: -9.98, z: 7.6, y: 3.42, high: true }); }
  wagon(6.4, 7.5, Math.PI / 2); wagon(-4, -10.5, 0.0); wagon(2.5, -44, 0); wagon(-24, 14, 0.5, true); wagon(24, -36, -0.8, true);
  hay(-6.8, 14, 0.3); hay(3.8, 17.5, Math.PI / 2 - 0.2); hay(-1.2, -23, 0.1); hay(15.5, -15, 0.4); hay(-16, -22.5, Math.PI / 2);
  trough(-7.4, 1.5); trough(7.4, -2.5); trough(-7.4, -23); trough(7.5, -29);
  rail(-7.7, 11, 2.6); rail(7.7, 17, 2.6); rail(-7.7, -9, 2.4); rail(7.7, -13, 2.4);
  [[-9.4, 20.6], [9.5, 18.1], [-9.3, -22], [9.4, -26.4], [9.3, 7.4], [-9.4, -11]].forEach(([x, z]) => { barrel(x, z); solid(x, z, 0.85, 0.85, 1.1); });

  /* ---------- the land around ---------- */
  { const g = group(21, 0, 8), leg = timber('brown', 1.4); const at = (a, b, y) => [a * (1.75 - y * 0.045), y, b * (1.75 - y * 0.045)]; [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([a, b]) => { beam(at(a, b, 0), at(a, b, 7.6), 0.26, leg, g); solid(21 + a * 1.6, 8 + b * 1.6, 0.4, 0.4, 7); }); [[-1, -1, -1, 1], [1, -1, 1, 1], [-1, -1, 1, -1], [-1, 1, 1, 1]].forEach(([a, b, c, d]) => { [[0.4, 3.6], [3.8, 7]].forEach(([lo, hi]) => { beam(at(a, b, lo), at(c, d, hi), 0.09, leg, g); beam(at(c, d, lo), at(a, b, hi), 0.09, leg, g); beam(at(a, b, hi), at(c, d, hi), 0.12, leg, g); }); }); box(5, 0.18, 5, timber('deck', 1.4), 0, 7.5, 0, g); cyl(2.45, 2.55, 3.3, timber('red', 2.4), 0, 9.25, 0, g, 26); mesh(new THREE.ConeGeometry(2.85, 1.5, 26), roofMat(0), 0, 11.65, 0, g); [7.9, 8.8, 9.8, 10.6].forEach((h) => mesh(new THREE.TorusGeometry(2.53, 0.035, 6, 48), iron, 0, h, 0, g).rotation.x = Math.PI / 2); [-0.28, 0.28].forEach((d) => beam([-2.75, 0, d], [-2.75, 10.8, d], 0.07, leg, g)); for (let y = 0.4; y < 10.8; y += 0.36) beam([-2.75, y, -0.28], [-2.75, y, 0.28], 0.045, leg, g); }
  const mill = group(-22, 0, -3); [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([a, b]) => beam([a * 1.25, 0, b * 1.25], [a * 0.32, 9.3, b * 0.32], 0.13, timber('grey', 1), mill)); for (let y = 1.6; y < 9; y += 2.1) { const r = 1.25 - y * 0.1; [[-1, -1, -1, 1], [1, -1, 1, 1], [-1, -1, 1, -1], [-1, 1, 1, 1]].forEach(([a, b, c, d]) => { beam([a * r, y, b * r], [c * r, y, d * r], 0.07, timber('grey', 1), mill); beam([a * r, y, b * r], [c * (r - 0.2), y + 2, d * (r - 0.2)], 0.045, timber('grey', 1), mill); }); }
  const fan = new THREE.Group(); fan.position.set(-21.4, 9.4, -3); fan.rotation.y = Math.PI / 2; scene.add(fan); const vane = new THREE.MeshStandardMaterial({ color: 0xb4ad9c, metalness: 0.55, roughness: 0.5 }); for (let k = 0; k < 18; k++) { const blade = new THREE.Group(); blade.rotation.z = k * Math.PI / 9; fan.add(blade); const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.35, 0.025), vane); b.position.y = 1.3; b.rotation.y = 0.45; b.castShadow = true; blade.add(b); } [0.7, 1.9].forEach((r) => fan.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.025, 6, 36), vane))); solid(-22, -3, 2.4, 2.4, 8);
  // telegraph line behind the buildings
  { const wood = timber('dark', 1.2), wire = new THREE.LineBasicMaterial({ color: 0x241a12 }); [-19.5, 19.5].forEach((x) => { const zs = x < 0 ? [26, 9, -12, -27, -48] : [27, -3, -18, -36, -50]; zs.forEach((z, i) => { cyl(0.11, 0.16, 6.6, wood, x, 3.3, z, null, 9); box(1.3, 0.12, 0.12, wood, x, 6.2, z); [-0.5, 0.5].forEach((d) => cyl(0.045, 0.06, 0.12, flat(0x5f8f84, { roughness: 0.2 }), x + d, 6.33, z, null, 8)); solid(x, z, 0.34, 0.34, 6.6); if (i) [-0.5, 0.5].forEach((d) => { const pts = []; for (let k = 0; k <= 12; k++) { const u = k / 12; pts.push(new THREE.Vector3(x + d, 6.38 - Math.sin(u * Math.PI) * 0.5, lerp(zs[i - 1], z, u))); } scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wire)); }); }); }); }
  const skin = keep('cactus', () => new THREE.MeshStandardMaterial({ map: canvas(256, 64, (g, w, h) => { g.fillStyle = '#4f6e36'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 16) { g.fillStyle = 'rgba(20,38,10,.55)'; g.fillRect(x, 0, 4, h); g.fillStyle = 'rgba(175,200,120,.35)'; g.fillRect(x + 9, 0, 3, h); for (let y = 3; y < h; y += 7) { g.fillStyle = '#e8dfb0'; g.fillRect(x + 10, y, 1.6, 1.6); } } }, true), roughness: 0.9 }));
  const limb = (r, h, x, y, z, parent) => { const geo = new THREE.CylinderGeometry(r * 0.94, r, h, 28, 1, true), p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)), k = 1 + Math.cos(a * 12) * 0.075; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } geo.computeVertexNormals(); const m = mesh(geo, skin, x, y, z, parent); mesh(new THREE.SphereGeometry(r * 0.96, 20, 8, 0, 6.29, 0, Math.PI / 2), skin, 0, h / 2, 0, m); return m; };
  const cactus = (x, z, s) => { const g = group(x, 0, z); g.scale.setScalar(s); g.rotation.y = rnd() * 6; limb(0.3, 3.1, 0, 1.55, 0, g); [[1, 1.35 + rnd() * 0.3, 0.9], [-1, 1.9 + rnd() * 0.4, 0.7]].forEach(([d, y, h]) => { const bend = mesh(new THREE.TorusGeometry(0.38, 0.165, 14, 14, Math.PI / 2), skin, d * 0.45, y + 0.38, 0, g); bend.rotation.z = d > 0 ? -Math.PI / 2 : Math.PI; limb(0.165, h, d * 0.83, y + 0.38 + h / 2, 0, g); }); if (Math.abs(x) < BOUNDS.x1 && z < BOUNDS.z1 && z > BOUNDS.z0) solid(x, z, 0.65 * s, 0.65 * s, 3 * s); };
  const strata = canvas(256, 256, (g, w, h) => { g.fillStyle = '#a45f3a'; g.fillRect(0, 0, w, h); let y = 0; while (y < h) { const t = 3 + rnd() * 18; g.fillStyle = ['#8a4a2e', '#b97246', '#9c5634', '#c98a58', '#7c4029'][Math.floor(rnd() * 5)]; g.fillRect(0, y, w, t); y += t; } speck(g, w, h, 5000, ['rgba(40,18,8,.35)', 'rgba(240,195,150,.25)'], 2.6); for (let i = 0; i < 120; i++) { g.fillStyle = 'rgba(40,16,6,.28)'; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 10 + rnd() * 60); } }, true);
  const rockMat = keep('rock', () => new THREE.MeshStandardMaterial({ map: strata, bumpMap: strata, bumpScale: 0.1, roughness: 1, flatShading: true }));
  const lumpy = (geo, amount) => { const p = geo.attributes.position, seen = {}; for (let i = 0; i < p.count; i++) { const key = [p.getX(i), p.getY(i), p.getZ(i)].map((v) => v.toFixed(3)).join(); if (!seen[key]) seen[key] = 1 + (rnd() - 0.5) * amount; p.setXYZ(i, p.getX(i) * seen[key], p.getY(i) * seen[key], p.getZ(i) * seen[key]); } geo.computeVertexNormals(); return geo; };
  const rock = (x, z, s, solid_) => { const r = mesh(lumpy(new THREE.IcosahedronGeometry(s, 2), 0.42), rockMat, x, s * 0.4, z); r.rotation.y = rnd() * 6; r.scale.y = 0.72; if (solid_) { solid(x, z, s * 1.6, s * 1.6, s * 1.1, 0, 'rock'); for (let k = 0; k < 4; k++) { const a = rnd() * 6, q = s * (0.18 + rnd() * 0.2); mesh(lumpy(new THREE.IcosahedronGeometry(q, 1), 0.5), rockMat, x + Math.cos(a) * s * 1.1, q * 0.4, z + Math.sin(a) * s * 1.1); } } };
  [[-25, 18, 1], [25, 22, 1.2], [-28, -18, 1.1], [27, -24, 0.9], [-21, -47, 1.3], [24, -46, 1], [18, 27, 0.8], [-19, 28, 1.1], [30, -8, 1]].forEach(([x, z, s]) => cactus(x, z, s));
  [[-19, 3, 1.4], [20, -33, 1.7], [-27, -33, 2], [16, -49, 1.5], [-13, 25, 1.1], [24, -14, 1.2], [12, 29, 0.9]].forEach(([x, z, s]) => rock(x, z, s, true));
  for (let i = 0; i < 150; i++) { const a = rnd() * 6.283, r = 44 + rnd() * 150, x = Math.cos(a) * r, z = -12 + Math.sin(a) * r; if (rnd() < 0.5) cactus(x, z, 0.6 + rnd()); else rock(x, z, 0.4 + rnd() * 2.2); }
  // dry grass in tufts, thicker where nobody walks, and loose stones
  const blades = [flat(0xa89552, { side: THREE.DoubleSide }), flat(0x8c8348, { side: THREE.DoubleSide }), flat(0xc2a866, { side: THREE.DoubleSide })];
  for (let i = 0; i < 620; i++) { const x = (rnd() - 0.5) * 96, z = -12 + (rnd() - 0.5) * 116; if (Math.abs(x) < 10.8 && z > -46 && z < 25) continue; const g = group(x, 0, z), m = blades[Math.floor(rnd() * 3)]; for (let k = 0; k < 7; k++) { const h = 0.18 + rnd() * 0.34, b = mesh(new THREE.ConeGeometry(0.014, h, 3), m, (rnd() - 0.5) * 0.22, h * 0.46, (rnd() - 0.5) * 0.22, g); b.rotation.set((rnd() - 0.5) * 0.8, 0, (rnd() - 0.5) * 0.8); b.castShadow = false; } }
  const stone = lumpy(new THREE.IcosahedronGeometry(1, 0), 0.5);
  for (let i = 0; i < 520; i++) { const s = 0.02 + rnd() * rnd() * 0.09, o = mesh(stone, rockMat, (rnd() - 0.5) * 40, s * 0.35, -12 + (rnd() - 0.5) * 84); o.scale.set(s, s * 0.65, s); o.rotation.y = rnd() * 6; o.castShadow = false; }
  for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283 + rnd() * 0.3, r = 210 + rnd() * 90, w = 20 + rnd() * 34, h = 24 + rnd() * 46, x = Math.cos(a) * r, z = Math.sin(a) * r; [[0.6, 1.25, 0.24, 0.12], [0.58, 0.64, 0.52, 0.5], [0.5, 0.55, 0.2, 0.86]].forEach(([top, bottom, tall, y]) => { const m = mesh(lumpy(new THREE.CylinderGeometry(w * top, w * bottom, h * tall, 22, 4), 0.14), rockMat, x, h * y, z); m.castShadow = false; m.receiveShadow = false; }); }
  // a post and rail fence marks how far you can wander
  { const m = timber('brown', 1.2); const run = (x0, z0, x1, z1) => { const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 3.4); for (let i = 0; i <= n; i++) { const x = lerp(x0, x1, i / n), z = lerp(z0, z1, i / n); cyl(0.08, 0.11, 1.25, m, x, 0.62, z, null, 7).rotation.set((rnd() - 0.5) * 0.08, 0, (rnd() - 0.5) * 0.08); if (i < n) { const xx = lerp(x0, x1, (i + 1) / n), zz = lerp(z0, z1, (i + 1) / n); [0.55, 0.98].forEach((h) => beam([x, h + (rnd() - 0.5) * 0.09, z], [xx, h + (rnd() - 0.5) * 0.09, zz], 0.07, m)); } } };
    run(BOUNDS.x0 - 0.6, BOUNDS.z0 - 0.6, BOUNDS.x1 + 0.6, BOUNDS.z0 - 0.6); run(BOUNDS.x0 - 0.6, BOUNDS.z1 + 0.6, BOUNDS.x1 + 0.6, BOUNDS.z1 + 0.6); run(BOUNDS.x0 - 0.6, BOUNDS.z0 - 0.6, BOUNDS.x0 - 0.6, BOUNDS.z1 + 0.6); run(BOUNDS.x1 + 0.6, BOUNDS.z0 - 0.6, BOUNDS.x1 + 0.6, BOUNDS.z1 + 0.6); }

  /* everything that never moves is fused into one mesh per material, so all this detail stays quick to draw */
  (function bake() {
    fixed.updateMatrixWorld(true); const buckets = new Map();
    fixed.traverse((o) => { if (!o.isMesh) return; const key = o.material.uuid + (o.castShadow ? 'c' : '') + (o.receiveShadow ? 'r' : ''); if (!buckets.has(key)) buckets.set(key, { m: o.material, cast: o.castShadow, recv: o.receiveShadow, list: [] }); buckets.get(key).list.push(o); });
    const v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
    buckets.forEach((b) => {
      const parts = b.list.map((o) => ({ o, g: o.geometry.index ? o.geometry.toNonIndexed() : o.geometry })), total = parts.reduce((t, p) => t + p.g.attributes.position.count, 0), pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), uv = new Float32Array(total * 2), tile = b.m.userData.tile; let at_ = 0;
      parts.forEach(({ o, g }) => { const P_ = g.attributes.position, N_ = g.attributes.normal, U = g.attributes.uv; nm.getNormalMatrix(o.matrixWorld); const flip = o.matrixWorld.determinant() < 0;
        for (let i = 0; i < P_.count; i++) { const src = flip ? i - (i % 3) + [0, 2, 1][i % 3] : i; v.fromBufferAttribute(P_, src).applyMatrix4(o.matrixWorld); n.fromBufferAttribute(N_, src).applyMatrix3(nm).normalize(); pos.set([v.x, v.y, v.z], at_ * 3); nor.set([n.x, n.y, n.z], at_ * 3);
          if (tile) { const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z); if (ay > 0.7) { uv[at_ * 2] = v.z / tile; uv[at_ * 2 + 1] = v.x / tile; } else if (ax > az) { uv[at_ * 2] = v.z / tile; uv[at_ * 2 + 1] = v.y / tile; } else { uv[at_ * 2] = v.x / tile; uv[at_ * 2 + 1] = v.y / tile; } } else if (U) { uv[at_ * 2] = U.getX(src); uv[at_ * 2 + 1] = U.getY(src); } at_++; } });
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); const m = new THREE.Mesh(g, b.m); m.castShadow = b.cast; m.receiveShadow = b.recv; scene.add(m);
    });
    scene.remove(fixed);
  })();

  /* ---------- ammunition crates ---------- */
  const SPOTS = [[1.6, 19.5], [-5.5, 8.5], [5.8, 0.5], [-2.2, -6.5], [2.6, -14.5], [-6, -20.5], [6.4, -25], [0.5, -34], [-19, -2], [19, -9], [-13, 22.5], [14, 23], [-18, -33], [13, -26.5],
    [-3.5, 14.5], [3.8, 9.5], [-1.5, 3.5], [5.6, -3.8], [2.8, -21.5], [-4.8, -26], [-3.5, -33], [6.2, -39.5], [-3.8, -43.5], [-19, 13], [19, 17], [-19, -17], [19, -23], [-7, 23], [7, 24], [-13.5, -43]]
  ;
  solids.filter((s) => s.y0 < 0.3 && s.y1 > 0.7 && s.y1 < 1.9 && Math.max(s.x1 - s.x0, s.z1 - s.z0) > 0.8).forEach((s) => { const x = (s.x0 + s.x1) / 2, z = (s.z0 + s.z1) / 2; SPOTS.push([x, s.z1 + 0.72], [s.x0 - 0.82, z], [s.x1 + 0.82, z]); });
  for (let z = 21, k = 0; z >= -44; z -= 4.5, k++) SPOTS.push([k % 2 ? 2.6 : -2.6, z], [k % 2 ? -6.2 : 6.2, z - 2]);
  for (let i = SPOTS.length - 1; i >= 0; i--) { const [x, z] = SPOTS[i]; if (x < BOUNDS.x0 + 1 || x > BOUNDS.x1 - 1 || z < BOUNDS.z0 + 1 || z > BOUNDS.z1 - 1 || solids.some((s) => s.y0 < 0.6 && x + 0.75 > s.x0 && x - 0.75 < s.x1 && z + 0.6 > s.z0 && z - 0.6 < s.z1) || SPOTS.slice(0, i).some((q) => Math.hypot(q[0] - x, q[1] - z) < 2.1)) SPOTS.splice(i, 1); }
  const lidTex = canvas(256, 128, (g, w, h) => { g.fillStyle = '#4d5a34'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) { g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(0, y, w, 3); } speck(g, w, h, 900, ['rgba(20,30,10,.4)', 'rgba(190,200,150,.2)'], 3); g.strokeStyle = '#1f2612'; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12); g.fillStyle = '#f2d377'; g.font = '62px Rye, Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('AMMO', w / 2, h / 2 + 4); });
  const markTex = canvas(128, 128, (g) => { g.fillStyle = 'rgba(20,12,6,.72)'; g.beginPath(); g.arc(64, 64, 52, 0, 7); g.fill(); g.strokeStyle = '#ffd05a'; g.lineWidth = 6; g.stroke(); [-17, 17].forEach((dx) => { const x = 64 + dx; g.fillStyle = '#d9d2c4'; g.beginPath(); g.moveTo(x - 9, 52); g.quadraticCurveTo(x - 8, 28, x, 24); g.quadraticCurveTo(x + 8, 28, x + 9, 52); g.fill(); g.fillStyle = '#ffd05a'; g.fillRect(x - 10, 52, 20, 42); g.fillStyle = '#b07a18'; g.fillRect(x - 12, 90, 24, 8); }); });
  const side = new THREE.MeshStandardMaterial({ map: lidTex, roughness: 0.8 }), dull = new THREE.MeshStandardMaterial({ color: 0x45512f, roughness: 0.85 }), strap = new THREE.MeshStandardMaterial({ color: 0x2a251c, metalness: 0.6, roughness: 0.4 });
  function ammoCrate(spot) {
    const [x, z] = SPOTS[spot], g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.random() * 0.5 - 0.25; scene.add(g);
    const part = (w, h, d, m, px, py, pz, p) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(px, py, pz); o.castShadow = o.receiveShadow = true; (p || g).add(o); return o; };
    part(1.05, 0.5, 0.66, [dull, dull, dull, dull, side, side], 0, 0.25, 0); const lid = new THREE.Group(); lid.position.set(0, 0.5, -0.33); g.add(lid); part(1.09, 0.13, 0.7, [dull, dull, side, dull, dull, dull], 0, 0.065, 0.33, lid);
    [-0.34, 0.34].forEach((dx) => part(0.07, 0.66, 0.72, strap, dx, 0.31, 0)); [-1, 1].forEach((s) => part(0.06, 0.07, 0.34, strap, s * 0.55, 0.36, 0));
    const mark = new THREE.Sprite(new THREE.SpriteMaterial({ map: markTex, transparent: true, depthWrite: false })); mark.position.set(0, 1.35, 0); mark.scale.setScalar(0.34); g.add(mark);
    const s = solid(x, z, 1.1, 0.8, 0.63, 0, 'crate');
    return { spot, x, z, g, lid, mark, solid: s, open: 0, used: 0, question: null };
  }
  const dropCrate = (c) => { scene.remove(c.g); const i = solids.indexOf(c.solid); if (i >= 0) solids.splice(i, 1); };

  /* ---------- tumbleweeds ---------- */
  const weeds = [0, 1, 2].map((k) => { const g = new THREE.Group(), pts = []; for (let i = 0; i < 150; i++) { const p = () => { const a = Math.random() * 6.283, b = Math.acos(Math.random() * 2 - 1), r = 0.24 + Math.random() * 0.18; return new THREE.Vector3(Math.sin(b) * Math.cos(a) * r, Math.cos(b) * r, Math.sin(b) * Math.sin(a) * r); }; const a = p(), m = p(), c = a.clone().lerp(m, 0.55); pts.push(a, c); } g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x7a5a30 }))); g.position.set(-30 + k * 22, 0.4, 14 - k * 24); scene.add(g); return g; });
  function tick(t, dt) {
    fan.rotation.z += dt * 1.6;
    weeds.forEach((g, i) => { g.position.x += dt * (2.2 + i * 0.7); g.position.y = 0.4 + Math.abs(Math.sin(t * 2.6 + i)) * 0.35; g.rotation.z -= dt * 5; if (g.position.x > 40) { g.position.x = -40; g.position.z = BOUNDS.z0 + 8 + Math.random() * 74; } });
  }
  return { solids, posts, SPOTS, ammoCrate, dropCrate, tick, canvas, sun };
}

/* ================= the outlaws: smooth bodies over bending joints, with faces, hands and proper clothes ================= */
const GANG = [
  { name: 'Black Bart', shirt: '#7a342c', coat: '#1f1b19', trousers: '#3a332e', hat: '#17130f', band: '#8e2f22', skin: '#b98262', hair: '#17100b', beard: 'full', build: 1.07 },
  { name: 'Dusty Rhodes', shirt: '#a89a74', coat: '#6e4b2b', trousers: '#3b4a66', hat: '#82603a', band: '#2e2016', skin: '#c9946f', hair: '#6b4a28', beard: 'moustache', build: 1 },
  { name: 'One-Eye Kate', shirt: '#3d5f73', coat: '#4a342c', trousers: '#4d3d2f', hat: '#37261a', band: '#bf9a46', skin: '#c08a6a', hair: '#4a2412', beard: null, patch: true, woman: true, build: 0.9 },
  { name: 'Sidewinder Sam', shirt: '#6a7844', coat: '#313826', trousers: '#2d2925', hat: '#4d3c26', band: '#7e2a20', skin: '#c48c68', hair: '#2a1b10', beard: 'stubble', build: 0.95 },
  { name: 'Mad Dog Mercer', shirt: '#a87f32', coat: '#561f1b', trousers: '#262a32', hat: '#221b16', band: '#cdbf9c', skin: '#8d5a40', hair: '#8f8980', beard: 'full', build: 1.12 }
];
const matCache = new Map();
function makeCowboy(THREE, look) {
  const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; };
  const noise = (g, w, h, n, a) => { for (let i = 0; i < n; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,' + a + ')' : 'rgba(255,240,220,' + a + ')'; g.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6); } };
  const cloth = (colour, rough) => { const key = colour + 'cloth'; if (!matCache.has(key)) { const t = tex(256, 256, (g, w, h) => { g.fillStyle = colour; g.fillRect(0, 0, w, h); noise(g, w, h, 5200, 0.13); for (let i = 0; i < 26; i++) { g.strokeStyle = 'rgba(0,0,0,' + (0.04 + Math.random() * 0.1) + ')'; g.lineWidth = 1 + Math.random() * 5; g.beginPath(); const x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); g.quadraticCurveTo(x + 30, y + Math.random() * 24 - 12, x + 40 + Math.random() * 40, y + Math.random() * 30 - 15); g.stroke(); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; matCache.set(key, new THREE.MeshStandardMaterial({ map: t, roughness: rough || 0.93, side: THREE.DoubleSide })); } return matCache.get(key); };
  const flat = (colour, rough, metal) => { const key = colour + (rough || '') + (metal || ''); if (!matCache.has(key)) { const m = new THREE.MeshStandardMaterial({ color: colour, roughness: rough === undefined ? 0.8 : rough, metalness: metal || 0 }); m.color.convertSRGBToLinear(); matCache.set(key, m); } return matCache.get(key); };
  const shirt = cloth(look.shirt), coat = cloth(look.coat, 0.82), legsM = cloth(look.trousers), skin = flat(look.skin, 0.68), hatM = cloth(look.hat, 0.9), band = cloth(look.band), boot = flat('#2c1b0f', 0.45), sole = flat('#140c07', 0.8), hair = flat(look.hair, 0.95), leather = flat('#4a2c17', 0.55), steel = flat('#3a3d43', 0.28, 0.85), grip = flat('#6a3d1e', 0.55), brass = flat('#c9a14a', 0.3, 0.8);

  /* a smooth skin stretched over a stack of oval rings; gap leaves it open down the front */
  const loft = (rings, gap, seg) => {
    const n = seg || 20, pos = [], uv = [], idx = [], from = gap || 0, to = Math.PI * 2 - (gap || 0);
    rings.forEach((r, i) => { for (let j = 0; j <= n; j++) { const a = from + (to - from) * j / n; pos.push(Math.sin(a) * r[1] + (r[3] || 0), r[0], Math.cos(a) * r[2] + (r[4] || 0)); uv.push(j / n * 2, r[0] * 2.4); } });
    const R = n + 1; for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < n; j++) { const a = i * R + j, b = a + R; if (rings[i + 1][0] > rings[i][0]) idx.push(a, a + 1, b, b, a + 1, b + 1); else idx.push(a, b, a + 1, b, b + 1, a + 1); }
    if (!gap) [0, rings.length - 1].forEach((i) => { const c = pos.length / 3, r = rings[i], up = (i === 0) === (rings[1][0] < rings[0][0]); pos.push(r[3] || 0, r[0], r[4] || 0); uv.push(0, 0); for (let j = 0; j < n; j++) { if (up) idx.push(c, i * R + j, i * R + j + 1); else idx.push(c, i * R + j + 1, i * R + j); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
  };
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const add = (g, m, x, y, z, p) => { const o = new THREE.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; (p || body).add(o); return o; };
  const ball = (r, m, x, y, z, p, s) => { const o = add(new THREE.SphereGeometry(r, 18, 14), m, x, y, z, p); if (s) o.scale.set(s[0], s[1], s[2]); return o; };
  const rod = (a, b, h, m, x, y, z, p) => add(new THREE.CylinderGeometry(a, b, h, 10), m, x, y, z, p), box = (w, h, d, m, x, y, z, p) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z, p);
  const pivot = (x, y, z, p) => { const g = new THREE.Group(); g.position.set(x, y, z); (p || body).add(g); return g; };
  const W = look.build, F = !!look.woman;
  // faces +z
  const hips = pivot(0, 0.95, 0);
  add(loft([[-0.1, 0.12 * W, 0.095], [-0.03, 0.168 * W, 0.118], [0.07, F ? 0.15 : 0.158 * W, 0.108]]), legsM, 0, 0, 0, hips);
  const legs = [-1, 1].map((s) => {
    const thigh = pivot(s * 0.092, -0.02, 0, hips); add(loft([[0.04, 0.082 * W, 0.092], [-0.08, 0.086 * W, 0.09], [-0.24, 0.07, 0.074], [-0.38, 0.056, 0.06], [-0.47, 0.056, 0.062]]), legsM, 0, 0, 0, thigh);
    const knee = pivot(0, -0.45, 0, thigh); add(loft([[0.04, 0.056, 0.062], [-0.08, 0.063, 0.068, 0, -0.008], [-0.2, 0.052, 0.056, 0, -0.006]]), legsM, 0, 0, 0, knee);
    // a riding boot with a toe and a stacked heel
    add(loft([[-0.14, 0.066, 0.072], [-0.19, 0.056, 0.062], [-0.34, 0.048, 0.056], [-0.42, 0.05, 0.065, 0, 0.008], [-0.455, 0.055, 0.075, 0, 0.012]]), boot, 0, 0, 0, knee);
    const foot = add(loft([[-0.06, 0.03, 0.02], [-0.02, 0.055, 0.045], [0.09, 0.056, 0.038, 0, -0.006], [0.165, 0.042, 0.026, 0, -0.014], [0.2, 0.012, 0.012, 0, -0.022]]), boot, 0, -0.455, 0.0, knee); foot.rotation.x = Math.PI / 2;
    box(0.115, 0.016, 0.27, sole, 0, -0.505, 0.065, knee); box(0.08, 0.035, 0.07, sole, 0, -0.49, -0.035, knee);
    return { thigh, knee };
  });
  const spine = pivot(0, 0, 0, hips);
  const torso = F ? [[0.02, 0.138, 0.098], [0.14, 0.122, 0.088], [0.28, 0.14, 0.103], [0.38, 0.158, 0.122, 0, 0.012], [0.47, 0.17, 0.105], [0.55, 0.185, 0.092], [0.6, 0.15, 0.078], [0.645, 0.06, 0.055]]
    : [[0.02, 0.156 * W, 0.11], [0.14, 0.145 * W, 0.105 * W], [0.28, 0.17 * W, 0.118], [0.4, 0.2 * W, 0.132 * W], [0.5, 0.218 * W, 0.12], [0.565, 0.21 * W, 0.1], [0.61, 0.165 * W, 0.085], [0.655, 0.07, 0.062]];
  add(loft(torso), shirt, 0, 0, 0, spine);
  // an open waistcoat or long coat over the shirt, with lapels and a turned collar
  add(loft(torso.slice(0, 7).map((r) => [r[0], r[1] * 1.075 + 0.008, r[2] * 1.1 + 0.008, r[3] || 0, r[4] || 0]), 0.42), coat, 0, 0, 0, spine);
  [-1, 1].forEach((s) => { const l = box(0.052, 0.25, 0.012, coat, s * 0.082, 0.43, (F ? 0.122 : 0.14 * W), spine); l.rotation.set(-0.08, s * 0.2, -s * 0.24); const c = box(0.1, 0.03, 0.05, coat, s * 0.085, 0.615, 0.055, spine); c.rotation.set(0.3, s * 0.5, -s * 0.35); });
  [0.18, 0.26, 0.34].forEach((y) => ball(0.008, brass, 0, y, F ? (y > 0.3 ? 0.128 : 0.102) : 0.118 * W, spine));
  add(loft([[-0.012, 0.163 * W + 0.006, 0.12], [0.045, 0.158 * W + 0.006, 0.117]]), leather, 0, 0.0, 0, spine); box(0.065, 0.048, 0.02, brass, 0, 0.016, 0.124, spine);
  for (let i = 0; i < 9; i++) { const a = 0.55 + i * 0.22; rod(0.007, 0.007, 0.04, brass, -Math.sin(a) * (0.17 * W), 0.016, Math.cos(a) * 0.128, spine); }
  // coat skirts hang from the hips; a holster on the right
  add(loft([[0.06, 0.178 * W, 0.132], [-0.14, 0.2 * W, 0.148], [-0.34, 0.222 * W, 0.168], [-0.44, 0.23 * W, 0.176]], 0.85), coat, 0, 0, -0.004, hips);
  const holster = add(loft([[0.02, 0.04, 0.028], [-0.08, 0.036, 0.026], [-0.2, 0.022, 0.018]]), leather, -0.215 * W, -0.04, 0.03, hips); holster.rotation.z = -0.08;

  /* head */
  const neck = pivot(0, 0.64, 0, spine); add(loft([[-0.02, 0.058, 0.056], [0.05, 0.047 * (F ? 0.88 : 1), 0.047], [0.1, 0.05, 0.05]]), skin, 0, 0, 0, neck);
  const head = pivot(0, 0.15, 0, neck);
  const face = tex(512, 256, (g, w, h) => {
    g.fillStyle = look.skin; g.fillRect(0, 0, w, h); noise(g, w, h, 5000, 0.07);
    const cx = w * 0.25, eye = (dx) => {
      const x = cx + dx; let r = g.createRadialGradient(x, 114, 2, x, 114, 20); r.addColorStop(0, 'rgba(80,35,25,.45)'); r.addColorStop(1, 'rgba(80,35,25,0)'); g.fillStyle = r; g.fillRect(x - 22, 94, 44, 40);
      g.fillStyle = '#e9e0d4'; g.beginPath(); g.ellipse(x, 115, 9, 4.6, 0, 0, 7); g.fill(); g.fillStyle = '#3a2a1c'; g.beginPath(); g.arc(x, 115, 4.2, 0, 7); g.fill(); g.fillStyle = '#0a0604'; g.beginPath(); g.arc(x, 115, 2, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillRect(x + 1, 113, 1.6, 1.6);
      g.strokeStyle = 'rgba(40,20,14,.85)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, 115, 10, 5.4, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
      g.strokeStyle = look.hair; g.lineWidth = F ? 3 : 5.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 12, 103 + (dx > 0 ? -1 : 2)); g.quadraticCurveTo(x, 98, x + 12, 103 + (dx > 0 ? 2 : -1)); g.stroke();
    };
    eye(-23); eye(23);
    g.strokeStyle = 'rgba(90,45,30,.4)'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 5, 112); g.quadraticCurveTo(cx - 9, 136, cx - 11, 141); g.stroke();
    g.fillStyle = 'rgba(70,30,22,.55)'; g.beginPath(); g.ellipse(cx - 6, 143, 3, 2, 0, 0, 7); g.ellipse(cx + 6, 143, 3, 2, 0, 0, 7); g.fill();
    g.fillStyle = F ? '#8c4038' : '#7b483a'; g.beginPath(); g.moveTo(cx - 16, 161); g.quadraticCurveTo(cx - 6, 156, cx, 159); g.quadraticCurveTo(cx + 6, 156, cx + 16, 161); g.quadraticCurveTo(cx, F ? 174 : 170, cx - 16, 161); g.fill(); g.strokeStyle = 'rgba(40,14,10,.7)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(cx - 16, 161); g.quadraticCurveTo(cx, 164, cx + 16, 161); g.stroke();
    [-38, 38].forEach((dx) => { const r = g.createRadialGradient(cx + dx, 140, 3, cx + dx, 140, 24); r.addColorStop(0, 'rgba(170,60,40,.25)'); r.addColorStop(1, 'rgba(170,60,40,0)'); g.fillStyle = r; g.fillRect(cx + dx - 26, 114, 52, 52); });
    const bristle = (x0, x1, y0, y1, n, len, alpha) => { g.strokeStyle = look.hair; g.globalAlpha = alpha; g.lineWidth = 1.5; for (let i = 0; i < n; i++) { const x = x0 + Math.random() * (x1 - x0), y = y0 + Math.random() * (y1 - y0); if (Math.abs(x - cx) < 17 && y > 153 && y < 174) continue; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 3, y + len); g.stroke(); } g.globalAlpha = 1; };
    if (look.beard === 'full') { bristle(cx - 62, cx + 62, 150, 205, 2600, 6, 0.95); bristle(cx - 26, cx + 26, 148, 157, 400, 5, 1); }
    if (look.beard === 'moustache') { bristle(cx - 28, cx + 28, 147, 157, 800, 6, 1); bristle(cx - 50, cx + 50, 160, 195, 500, 2, 0.4); }
    if (look.beard === 'stubble') bristle(cx - 55, cx + 55, 148, 198, 1500, 2, 0.55);
    if (look.patch) { g.strokeStyle = '#0d0a08'; g.lineWidth = 4; g.beginPath(); g.moveTo(cx - 70, 86); g.lineTo(cx + 66, 126); g.stroke(); g.fillStyle = '#0d0a08'; g.beginPath(); g.ellipse(cx + 23, 115, 15, 11, 0.15, 0, 7); g.fill(); }
    if (!F) { g.strokeStyle = 'rgba(80,40,26,.35)'; g.lineWidth = 2; [80, 89].forEach((y) => { g.beginPath(); g.moveTo(cx - 30, y); g.quadraticCurveTo(cx, y - 4, cx + 30, y); g.stroke(); }); }
  });
  // a skull narrowed towards the jaw, with a chin
  const skull = new THREE.SphereGeometry(0.108, 30, 24), sp = skull.attributes.position;
  for (let i = 0; i < sp.count; i++) { let x = sp.getX(i), y = sp.getY(i), z = sp.getZ(i); if (y < 0) { const k = -y / 0.108; x *= 1 - k * k * (F ? 0.42 : 0.28); if (z > 0) z *= 1 - k * 0.08; if (z > 0.03 && k > 0.6) z += (k - 0.6) * 0.022; } sp.setXYZ(i, x * 0.93, y * 1.2, z); }
  skull.computeVertexNormals(); add(skull, new THREE.MeshStandardMaterial({ map: face, roughness: 0.66 }), 0, 0, 0, head);
  const nose = add(loft([[0.03, 0.006, 0.006, 0, -0.004], [0.0, 0.01, 0.012, 0, 0.001], [-0.026, 0.017, 0.017, 0, 0.006], [-0.036, 0.01, 0.008, 0, 0]], 0, 12), skin, 0, 0.0, 0.104, head); nose.castShadow = false;
  [-1, 1].forEach((s) => { ball(0.026, skin, s * 0.102, -0.008, -0.006, head, [0.42, 1.15, 0.75]); });
  // hair round the back and sides
  const crop = add(new THREE.SphereGeometry(0.114, 26, 18, Math.PI * 0.86, Math.PI * 1.28, 0, Math.PI * 0.66), hair, 0, 0.008, -0.006, head); crop.scale.set(0.97, 1.18, 1.02); crop.material.side = THREE.DoubleSide;
  if (F) { add(loft([[0.04, 0.095, 0.075, 0, -0.045], [-0.1, 0.108, 0.07, 0, -0.065], [-0.24, 0.095, 0.05, 0, -0.085], [-0.32, 0.04, 0.025, 0, -0.095]]), hair, 0, 0, 0, head); }
  if (look.beard === 'full') add(loft([[-0.055, 0.075, 0.05, 0, 0.045], [-0.1, 0.062, 0.05, 0, 0.055], [-0.16, 0.025, 0.022, 0, 0.06]]), hair, 0, 0, 0, head);
  if (look.beard === 'full' || look.beard === 'moustache') [-1, 1].forEach((s) => { const m = ball(0.018, hair, s * 0.022, -0.047, 0.104, head, [1.7, 0.55, 0.65]); m.rotation.z = -s * 0.35; });
  // neckerchief
  const scarf = add(loft([[0.035, 0.058, 0.058], [-0.005, 0.082, 0.078], [-0.03, 0.07, 0.07]]), band, 0, 0.02, 0.0, neck); const tail = add(new THREE.ConeGeometry(0.062, 0.12, 3), band, 0, -0.045, 0.072, neck); tail.rotation.set(Math.PI + 0.35, 0, 0); tail.scale.z = 0.35;
  // a felt hat: creased crown, brim curled up at the sides
  const hat = pivot(0, 0.082, 0, head);
  const shape = [[0.001, 0.115], [0.05, 0.126], [0.09, 0.122], [0.106, 0.1], [0.114, 0.05], [0.117, 0.012], [0.16, 0.002], [0.21, 0.0], [0.248, 0.006], [0.252, 0.014], [0.2, 0.012], [0.13, 0.016], [0.113, 0.02]].map((p) => new THREE.Vector2(p[0], p[1]));
  const felt = new THREE.LatheGeometry(shape, 34), fp = felt.attributes.position;
  for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), z = fp.getZ(i); let y = fp.getY(i); const r = Math.hypot(x, z); if (r > 0.13) y += Math.pow(Math.abs(x) / 0.25, 2.2) * 0.07 - Math.max(0, Math.abs(z) / 0.25 - 0.6) * 0.03; if (y > 0.08) y -= Math.max(0, 1 - Math.abs(x) / 0.055) * 0.034; fp.setXYZ(i, x * 0.97, y, z * (r > 0.13 ? 1.06 : 1.1)); }
  felt.computeVertexNormals(); add(felt, hatM, 0, 0, 0, hat); add(loft([[0.012, 0.116, 0.131], [0.044, 0.1135, 0.128]]), band, 0, 0, 0, hat);

  /* arms and hands */
  const arms = [-1, 1].map((s) => {
    const upper = pivot(s * (F ? 0.19 : 0.222 * W), 0.53, 0, spine);
    add(loft([[0.055, 0.025, 0.025], [0.035, 0.066 * W, 0.066], [-0.04, 0.062 * W, 0.064], [-0.16, 0.052, 0.054], [-0.31, 0.042, 0.043]]), coat, 0, 0, 0, upper);
    const elbow = pivot(0, -0.3, 0, upper);
    add(loft([[0.025, 0.043, 0.044], [-0.07, 0.047, 0.048], [-0.18, 0.036, 0.036], [-0.215, 0.033, 0.033]]), shirt, 0, 0, 0, elbow); add(loft([[-0.2, 0.037, 0.037], [-0.235, 0.035, 0.035]]), coat, 0, 0, 0, elbow);
    add(loft([[-0.22, 0.022, 0.018], [-0.26, 0.03, 0.019], [-0.3, 0.036, 0.021], [-0.335, 0.028, 0.017]]), skin, 0, 0, 0, elbow);
    for (let i = 0; i < 4; i++) { const x = -0.026 + i * 0.0175; const f1 = rod(0.0085, 0.008, 0.042, skin, x, -0.35, 0.006, elbow); f1.rotation.x = -0.35; const f2 = rod(0.008, 0.0065, 0.032, skin, x, -0.373, 0.026, elbow); f2.rotation.x = -1.2; }
    const thumb = rod(0.011, 0.008, 0.05, skin, -s * 0.036, -0.295, 0.016, elbow); thumb.rotation.set(-0.5, 0, -s * 0.55);
    return { upper, elbow, s };
  });
  // revolver in the right hand (the figure's right is −x)
  const gun = pivot(0, -0.33, 0, arms[0].elbow); box(0.028, 0.085, 0.045, grip, 0, 0.005, -0.012, gun).rotation.x = -0.25; rod(0.012, 0.012, 0.2, steel, 0, -0.14, 0.04, gun); rod(0.028, 0.028, 0.055, steel, 0, -0.045, 0.036, gun); box(0.018, 0.1, 0.022, steel, 0, -0.045, 0.062, gun); const muzzle = pivot(0, -0.25, 0.04, gun);
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); flash.visible = false; muzzle.add(flash);
  return { root, body, hips, spine, neck, head, hat, legs, arms, muzzle, flash, look };
}
/* sets every joint from three dials: how crouched (0–1), how far the gun is raised (0–1), and where in a walking stride */
function pose(c, crouch, aim, stride, walking, flinch) {
  c.hips.position.y = 0.975 - crouch * 0.58;
  c.legs.forEach((l, i) => { const swing = walking ? Math.sin(stride + i * Math.PI) * 0.6 : 0; l.thigh.rotation.x = -crouch * (i ? 0.15 : 1.5) + swing; l.knee.rotation.x = crouch * (i ? 1.75 : 2.3) + (walking ? Math.max(0, -Math.cos(stride + i * Math.PI)) * 0.8 : 0); l.thigh.rotation.z = (i ? 1 : -1) * 0.025; });
  c.spine.rotation.x = 0.03 + crouch * 0.52 - flinch * 0.5; c.neck.rotation.x = -crouch * 0.34 - flinch * 0.3;
  const [right, left] = c.arms;
  right.upper.rotation.x = lerp(walking ? -Math.sin(stride) * 0.35 : -0.08, -1.52, aim); right.upper.rotation.z = lerp(-0.1, 0.2, aim); right.elbow.rotation.x = lerp(-0.28, -0.04, aim);
  left.upper.rotation.x = lerp(walking ? Math.sin(stride) * 0.35 : -0.08, -1.15, aim * 0.7); left.upper.rotation.z = lerp(0.1, -0.4, aim); left.elbow.rotation.x = lerp(-0.25, -0.8, aim);
  c.spine.rotation.y = aim * 0.14; c.neck.rotation.y = -aim * 0.12;
}

/* ================= sound, made in the browser. There is no background bed: silence between events ================= */
const Snd = {
  ctx: null, on: true,
  /* one revolver report, worked out sample by sample: the sharp crack, the body of the blast, a low thump,
     and the slap of it coming back off the buildings */
  report(rate, seed) {
    const len = Math.floor(rate * 1.25), out = new Float32Array(len); let s = seed; const rnd = () => { s = (s * 16807) % 2147483647; return s / 1073741823.5 - 1; };
    const lp = (hz) => { let y = 0; const k = 1 - Math.exp(-2 * Math.PI * hz / rate); return (x) => (y += k * (x - y)); };
    const crackHi = lp(900), blast = lp(2600), blast2 = lp(2600), low = lp(240), low2 = lp(240); let phase = 0;
    for (let i = 0; i < len; i++) {
      const t = i / rate, n = rnd(), attack = Math.min(1, t / 0.0006);
      const crack = (n - crackHi(n)) * Math.exp(-t / 0.0045) * 1.5;
      const spike = t < 0.0018 ? Math.sin(Math.PI * t / 0.0009) * 1.6 : 0;
      const body = blast2(blast(rnd())) * (Math.exp(-t / 0.035) * 2.4 + Math.exp(-t / 0.16) * 0.35);
      phase += 2 * Math.PI * (48 + 120 * Math.exp(-t / 0.04)) / rate; const thump = Math.sin(phase) * Math.exp(-t / 0.085) * 1.05;
      const rumble = low2(low(rnd())) * Math.exp(-t / 0.3) * 1.7;
      out[i] = (crack + spike + body + thump + rumble) * attack;
    }
    // echoes: later, duller and fainter each time
    const dry = out.slice(); [[0.093, 0.2, 1700], [0.171, 0.15, 1200], [0.31, 0.095, 800], [0.52, 0.05, 600]].forEach(([delay, gain, hz]) => { const f = lp(hz * (0.85 + Math.random() * 0.3)), from = Math.floor(delay * rate * (0.92 + (seed % 7) * 0.025)); for (let i = from; i < len; i++) out[i] += f(dry[i - from]) * gain * 2.2; });
    // driven hard, the way a close gunshot overloads the ear, then faded out cleanly
    let peak = 0; for (let i = 0; i < len; i++) { out[i] = Math.tanh(out[i] * 1.35); const fade = i > len * 0.7 ? 1 - (i - len * 0.7) / (len * 0.3) : 1; out[i] *= fade * fade; peak = Math.max(peak, Math.abs(out[i])); }
    for (let i = 0; i < len; i++) out[i] *= 0.97 / peak;
    return out;
  },
  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try {
      const c = this.ctx = new AC(), comp = c.createDynamicsCompressor(); comp.threshold.value = -8; comp.ratio.value = 5; comp.attack.value = 0.002; comp.release.value = 0.2; comp.connect(c.destination);
      this.out = c.createGain(); this.out.gain.value = this.on ? 0.9 : 0; this.out.connect(comp);
      this.hiss = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = this.hiss.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.shots = [3181, 9007, 14461, 27449].map((seed) => { const b = c.createBuffer(1, Math.floor(c.sampleRate * 1.25), c.sampleRate); b.getChannelData(0).set(this.report(c.sampleRate, seed)); return b; });
      const away = (v) => { this.gone = v; if (c.state !== 'closed') { const p = v ? c.suspend() : c.resume(); if (p && p.catch) p.catch(() => { }); } };
      document.addEventListener('visibilitychange', () => away(document.hidden)); addEventListener('pagehide', () => away(true)); addEventListener('pageshow', () => away(document.hidden)); addEventListener('blur', () => away(true)); addEventListener('focus', () => away(document.hidden));
      const wake = () => { if (this.gone) away(false); else if (c.state === 'suspended') c.resume(); }; addEventListener('pointerdown', wake, true); addEventListener('keydown', wake, true);
    } catch (e) { this.ctx = null; }
  },
  node(vol, pan) { const c = this.ctx, g = c.createGain(); g.gain.value = vol; let end = g; if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p); end = p; } end.connect(this.out); return g; },
  noise(type, freq, q, dur, vol, when, pan) { if (!this.ctx) return; const c = this.ctx, t = c.currentTime + (when || 0), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.hiss; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); s.connect(f); f.connect(g); g.connect(this.node(1, pan)); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02); },
  tone(from, to, dur, vol, type, when, pan) { if (!this.ctx) return; const c = this.ctx, t = c.currentTime + (when || 0), o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(this.node(1, pan)); o.start(t); o.stop(t + dur + 0.05); },
  // further away is quieter, duller and arrives a moment later
  shot(dist, pan) { if (!this.ctx) return; const c = this.ctx, d = dist || 0, s = c.createBufferSource(), f = c.createBiquadFilter(); s.buffer = this.shots[Math.floor(Math.random() * this.shots.length)]; s.playbackRate.value = (d ? 0.9 : 1) + Math.random() * 0.08; f.type = 'lowpass'; f.frequency.value = d ? Math.max(900, 9000 - d * 260) : 16000; s.connect(f); f.connect(this.node(d ? 0.85 / (1 + d / 18) : 1, pan)); s.start(c.currentTime + Math.min(0.12, d / 340)); },
  whizz(pan) { this.tone(2400, 700, 0.16, 0.05, 'sine', 0.02, pan); },
  ricochet(pan, dist) { const near = 1 / (1 + (dist || 0) / 16), f = 2100 + Math.random() * 900; this.tone(f, f * 0.28, 0.42, 0.09 * near, 'sine', 0.01, pan); this.tone(f * 1.51, f * 0.45, 0.3, 0.04 * near, 'sine', 0.01, pan); this.noise('bandpass', 3200, 1.2, 0.03, 0.35 * near, 0, pan); },
  thud(pan) { this.noise('lowpass', 260, 1, 0.12, 0.7, 0, pan); this.tone(130, 55, 0.14, 0.45, 'sine', 0, pan); },
  hurt() { this.noise('lowpass', 320, 1, 0.2, 0.9); this.tone(150, 52, 0.3, 0.6, 'sine'); },
  click() { this.tone(2100, 1400, 0.025, 0.12, 'square'); this.tone(900, 600, 0.03, 0.1, 'square', 0.07); },
  load(n) { for (let i = 0; i < n; i++) { this.tone(2600, 1700, 0.022, 0.07, 'square', i * 0.17); this.tone(760, 420, 0.05, 0.12, 'triangle', i * 0.17 + 0.035); } },
  creak() { this.tone(170, 300, 0.3, 0.05, 'triangle'); this.noise('lowpass', 360, 1, 0.1, 0.4, 0.3); },
  hoof(dist, pan) { const near = 1 / (1 + (dist || 0) / 9); this.noise('lowpass', 520, 1.2, 0.06, 0.6 * near, 0, pan); this.tone(150, 70, 0.05, 0.3 * near, 'sine', 0, pan); this.noise('lowpass', 430, 1.2, 0.05, 0.4 * near, 0.085, pan); },
  step() { this.noise('lowpass', 210 + Math.random() * 80, 0.7, 0.07, 0.14); },
  good() { [392, 523, 659, 784].forEach((f, i) => this.tone(f, f, 0.22, 0.09, 'triangle', i * 0.07)); },
  bad() { [233, 175].forEach((f, i) => this.tone(f, f * 0.9, 0.3, 0.09, 'triangle', i * 0.16)); },
  warn() { this.tone(880, 880, 0.09, 0.05, 'triangle'); this.tone(880, 880, 0.09, 0.05, 'triangle', 0.14); },
  // two whistled phrases to start and finish
  whistle(win) { const tune = win ? [[784, 0], [1047, 0.18], [1175, 0.36], [1319, 0.54], [1047, 0.82], [1568, 1.05]] : [[880, 0], [1319, 0.22], [880, 0.5], [1319, 0.72], [698, 1.05], [784, 1.4]]; tune.forEach(([f, t]) => { this.tone(f * 0.97, f, 0.3, 0.07, 'sine', t); }); }
};

/* ================= finding a way round the town ================= */
function makeNav(solids, radius) {
  const C = 0.6, W = Math.ceil((BOUNDS.x1 - BOUNDS.x0) / C), H = Math.ceil((BOUNDS.z1 - BOUNDS.z0) / C), shut = new Uint8Array(W * H);
  const col = (x) => clamp(Math.floor((x - BOUNDS.x0) / C), 0, W - 1), row = (z) => clamp(Math.floor((z - BOUNDS.z0) / C), 0, H - 1), cx = (i) => BOUNDS.x0 + (i + 0.5) * C, cz = (j) => BOUNDS.z0 + (j + 0.5) * C;
  for (const s of solids) { if (s.y0 > 1.5 || s.y1 < 0.25) continue; for (let j = row(s.z0 - radius); j <= row(s.z1 + radius); j++) for (let i = col(s.x0 - radius); i <= col(s.x1 + radius); i++) { const x = cx(i), z = cz(j); if (x > s.x0 - radius && x < s.x1 + radius && z > s.z0 - radius && z < s.z1 + radius) shut[j * W + i] = 1; } }
  const open = (x, z) => x > BOUNDS.x0 && x < BOUNDS.x1 && z > BOUNDS.z0 && z < BOUNDS.z1 && !shut[row(z) * W + col(x)];
  const clear = (a, b) => { const d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(d / (C * 0.5)); for (let k = 1; k <= n; k++) if (!open(lerp(a.x, b.x, k / n), lerp(a.z, b.z, k / n))) return false; return true; };
  const nearest = (x, z) => { const i0 = col(x), j0 = row(z); for (let r = 0; r < 9; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue; const i = i0 + di, j = j0 + dj; if (i >= 0 && j >= 0 && i < W && j < H && !shut[j * W + i]) return j * W + i; } return -1; };
  const cost = new Float32Array(W * H), from = new Int32Array(W * H), mark = new Int32Array(W * H); let run = 0;
  /* shortest way between two places, as a few straight legs; null when there is none */
  function path(a, b) {
    const start = nearest(a.x, a.z), goal = nearest(b.x, b.z); if (start < 0 || goal < 0) return null;
    run++; const heap = [], gi = goal % W, gj = (goal / W) | 0, left = (n) => { const dx = Math.abs(n % W - gi), dz = Math.abs(((n / W) | 0) - gj); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
    const push = (n, f) => { let k = heap.push([f, n]) - 1; while (k > 0) { const up = (k - 1) >> 1; if (heap[up][0] <= f) break; heap[k] = heap[up]; k = up; } heap[k] = [f, n]; };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { let k = 0; for (;;) { let c = 2 * k + 1; if (c >= heap.length) break; if (c + 1 < heap.length && heap[c + 1][0] < heap[c][0]) c++; if (heap[c][0] >= last[0]) break; heap[k] = heap[c]; k = c; } heap[k] = last; } return top[1]; };
    mark[start] = run; cost[start] = 0; from[start] = -1; push(start, left(start)); let found = false;
    while (heap.length) {
      const n = pop(); if (n === goal) { found = true; break; } const i = n % W, j = (n / W) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue; const x = i + di, y = j + dj; if (x < 0 || y < 0 || x >= W || y >= H) continue; const m = y * W + x; if (shut[m] || (di && dj && (shut[j * W + x] || shut[y * W + i]))) continue;
        const c = cost[n] + (di && dj ? 1.414 : 1); if (mark[m] === run && cost[m] <= c) continue; mark[m] = run; cost[m] = c; from[m] = n; push(m, c + left(m));
      }
    }
    if (!found) return null;
    const cells = []; for (let n = goal; n >= 0; n = from[n]) cells.push({ x: cx(n % W), z: cz((n / W) | 0) }); cells.reverse();
    const out = []; let at_ = cells[0], k = 1; while (k < cells.length) { let far = k; while (far + 1 < cells.length && clear(at_, cells[far + 1])) far++; at_ = cells[far]; out.push(at_); k = far + 1; }
    return out.length ? out : [cells[cells.length - 1]];
  }
  return { open, clear, path };
}

/* ================= a horse: smooth body, jointed legs, mane, tail and saddle ================= */
function makeHorse(THREE) {
  const mat = (hex, rough) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: rough === undefined ? 0.75 : rough, side: THREE.DoubleSide }); m.color.convertSRGBToLinear(); return m; };
  const c = document.createElement('canvas'); c.width = c.height = 256; { const g = c.getContext('2d'); g.fillStyle = '#7a4424'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 5000; i++) { g.strokeStyle = Math.random() < 0.5 ? 'rgba(35,14,4,.22)' : 'rgba(210,140,80,.18)'; const x = Math.random() * 256, y = Math.random() * 256; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 7, y + 1); g.stroke(); } }
  const coatTex = new THREE.CanvasTexture(c); coatTex.encoding = THREE.sRGBEncoding; coatTex.wrapS = coatTex.wrapT = THREE.RepeatWrapping;
  const coat = new THREE.MeshStandardMaterial({ map: coatTex, roughness: 0.62, side: THREE.DoubleSide }), dark = mat('#1d110a', 0.9), hoofM = mat('#2a211a', 0.5), muzzleM = mat('#33201a', 0.6), leather = mat('#4a2814', 0.5), blanket = mat('#8d3126', 0.95), metal = mat('#a9a39a', 0.35), eye = mat('#0a0503', 0.2), white = mat('#d8cdbd', 0.8);
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const add = (g, m, x, y, z, p) => { const o = new THREE.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; (p || body).add(o); return o; };
  /* a smooth tube through a line of points, each with its own width and depth */
  const tube = (pts, n) => {
    n = n || 18; const pos = [], uv = [], idx = [], V = (p) => new THREE.Vector3(p[0], p[1], p[2]), side = new THREE.Vector3(1, 0, 0);
    pts.forEach((p, i) => { const t = V(pts[Math.min(pts.length - 1, i + 1)]).sub(V(pts[Math.max(0, i - 1)])).normalize(), up = new THREE.Vector3().crossVectors(t, side).normalize(); for (let j = 0; j <= n; j++) { const a = j / n * Math.PI * 2, v = V(p).addScaledVector(side, Math.cos(a) * p[3]).addScaledVector(up, Math.sin(a) * p[4]); pos.push(v.x, v.y, v.z); uv.push(j / n * 3, i * 0.45); } });
    const R = n + 1; for (let i = 0; i < pts.length - 1; i++) for (let j = 0; j < n; j++) { const a = i * R + j, b = a + R; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    [0, pts.length - 1].forEach((i) => { const k = pos.length / 3; pos.push(pts[i][0], pts[i][1], pts[i][2]); uv.push(0, 0); for (let j = 0; j < n; j++) idx.push(k, i * R + j, i * R + j + 1); });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
  };
  // barrel, from rump to chest
  add(tube([[0, 1.32, -0.95, 0.08, 0.1], [0, 1.33, -0.86, 0.23, 0.27], [0, 1.31, -0.66, 0.32, 0.35], [0, 1.25, -0.38, 0.31, 0.33], [0, 1.21, -0.05, 0.3, 0.34], [0, 1.24, 0.28, 0.29, 0.35], [0, 1.3, 0.55, 0.3, 0.37], [0, 1.3, 0.76, 0.23, 0.31], [0, 1.28, 0.86, 0.09, 0.14]], 22), coat);
  const neck = new THREE.Group(); neck.position.set(0, 1.43, 0.6); body.add(neck);
  add(tube([[0, -0.08, -0.04, 0.2, 0.3], [0, 0.16, 0.18, 0.16, 0.24], [0, 0.38, 0.34, 0.11, 0.18], [0, 0.55, 0.45, 0.095, 0.13]]), coat, 0, 0, 0, neck);
  // head, down and forward from the poll
  add(tube([[0, 0.62, 0.43, 0.07, 0.08], [0, 0.58, 0.52, 0.12, 0.13], [0, 0.46, 0.66, 0.1, 0.115], [0, 0.31, 0.79, 0.062, 0.08], [0, 0.21, 0.87, 0.067, 0.072], [0, 0.16, 0.9, 0.035, 0.04]]), coat, 0, 0, 0, neck);
  add(tube([[0, 0.275, 0.825, 0.066, 0.078], [0, 0.21, 0.875, 0.072, 0.076], [0, 0.155, 0.905, 0.034, 0.04]]), muzzleM, 0, 0, 0, neck);
  add(tube([[0, 0.66, 0.56, 0.028, 0.008], [0, 0.52, 0.71, 0.022, 0.008], [0, 0.37, 0.84, 0.012, 0.006]], 8), white, 0, 0, 0, neck);
  [-1, 1].forEach((s) => { const e = add(new THREE.ConeGeometry(0.042, 0.17, 8), coat, s * 0.075, 0.74, 0.45, neck); e.rotation.set(0.2, 0, -s * 0.2); add(new THREE.SphereGeometry(0.022, 10, 8), eye, s * 0.108, 0.54, 0.58, neck); add(new THREE.SphereGeometry(0.016, 8, 6), eye, s * 0.045, 0.21, 0.915, neck); });
  for (let k = 0; k < 22; k++) { const u = k / 21, m = add(new THREE.ConeGeometry(0.035, 0.26 - u * 0.08, 4), dark, (k % 2 ? 0.035 : -0.035), 0.1 + u * 0.6, -0.17 + u * 0.55, neck); m.rotation.set(-2.25, 0, (k % 2 ? -0.35 : 0.35)); m.scale.x = 0.5; }
  const forelock = add(new THREE.ConeGeometry(0.045, 0.2, 5), dark, 0, 0.66, 0.55, neck); forelock.rotation.x = 2.5;
  const tail = new THREE.Group(); tail.position.set(0, 1.48, -0.9); body.add(tail); add(tube([[0, 0, 0, 0.05, 0.06], [0, -0.1, -0.2, 0.1, 0.11], [0, -0.38, -0.32, 0.12, 0.12], [0, -0.7, -0.34, 0.08, 0.08], [0, -0.98, -0.3, 0.015, 0.015]], 12), dark, 0, 0, 0, tail);
  // legs hang from shoulder and hip; each bends again at knee or hock
  const legs = [[-1, 0.5, 0.5], [1, 0.5, 0.65], [-1, -0.62, 0], [1, -0.62, 0.15]].map(([s, z, beat]) => {
    const hind = z < 0, top = new THREE.Group(); top.position.set(s * 0.19, 1.12, z); root.add(top);
    add(tube([[0, 0.2, 0, 0.1, 0.16], [0, 0.02, hind ? -0.02 : 0, 0.11, hind ? 0.17 : 0.13], [0, -0.26, hind ? -0.05 : 0.01, 0.065, 0.085], [0, -0.52, 0, 0.052, 0.062]], 12), coat, 0, 0, 0, top);
    const knee = new THREE.Group(); knee.position.set(0, -0.52, 0); top.add(knee);
    add(tube([[0, 0.03, 0, 0.056, 0.066], [0, -0.07, 0, 0.042, 0.048], [0, -0.36, 0, 0.037, 0.043], [0, -0.45, 0.02, 0.048, 0.055], [0, -0.52, 0.035, 0.043, 0.048]], 10), s > 0 && hind ? white : coat, 0, 0, 0, knee);
    add(new THREE.CylinderGeometry(0.055, 0.075, 0.09, 12), hoofM, 0, -0.555, 0.045, knee);
    return { top, knee, hind, beat };
  });
  // blanket, saddle, girth, stirrups and reins
  add(tube([[0, 1.37, -0.34, 0.325, 0.29], [0, 1.34, -0.05, 0.322, 0.3], [0, 1.37, 0.22, 0.312, 0.3]], 22), blanket);
  add(tube([[0, 1.66, -0.35, 0.1, 0.05], [0, 1.69, -0.27, 0.2, 0.08], [0, 1.64, -0.08, 0.19, 0.055], [0, 1.67, 0.12, 0.13, 0.065], [0, 1.74, 0.2, 0.05, 0.05]], 14), leather);
  add(new THREE.CylinderGeometry(0.028, 0.032, 0.13, 8), leather, 0, 1.78, 0.2); add(new THREE.TorusGeometry(0.335, 0.025, 6, 30), leather, 0, 1.25, 0.06).scale.set(0.95, 1.06, 1);
  [-1, 1].forEach((s) => { add(new THREE.BoxGeometry(0.035, 0.52, 0.06), leather, s * 0.345, 1.28, 0.05).rotation.z = s * 0.08; add(new THREE.TorusGeometry(0.075, 0.014, 6, 16), metal, s * 0.375, 0.98, 0.05).rotation.y = Math.PI / 2; });
  const reins = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.07, 1.68, 1.45), new THREE.Vector3(-0.16, 1.72, 0.62), new THREE.Vector3(0, 1.85, 0.28), new THREE.Vector3(0.16, 1.72, 0.62), new THREE.Vector3(0.07, 1.68, 1.45)]), new THREE.LineBasicMaterial({ color: 0x1a0e06 })); body.add(reins);
  return { root, body, neck, tail, legs };
}
/* a gallop when moving fast, easing to a stand: each foot lands in turn and the back rocks with it */
function gait(h, phase, speed, t) {
  const amp = clamp(speed / 6, 0, 1);
  h.legs.forEach((l) => { const a = phase + l.beat * Math.PI * 2, swing = Math.sin(a), lift = Math.max(0, Math.cos(a)); l.top.rotation.x = -swing * (l.hind ? 0.55 : 0.62) * amp; l.knee.rotation.x = lift * (l.hind ? 1.0 : 1.35) * amp; });
  h.body.position.y = Math.abs(Math.sin(phase)) * 0.11 * amp + Math.sin(t * 1.6) * 0.006; h.body.rotation.x = Math.sin(phase + 0.6) * 0.06 * amp;
  h.legs.forEach((l) => { l.top.position.y = 1.12 + h.body.position.y * 0.6; });
  h.neck.rotation.x = Math.sin(phase + 1.3) * 0.13 * amp + 0.12 * amp + (1 - amp) * Math.sin(t * 0.7) * 0.09;
  h.tail.rotation.x = amp * 0.75 + Math.sin(t * 2.3) * 0.07; h.tail.rotation.z = Math.sin(t * 1.4) * 0.12;
}
/* sits a cowboy astride, twisting in the saddle to bring the gun round */
function poseRider(c, aim, twist, phase, speed) {
  pose(c, 0, aim, 0, false, 0);
  c.legs.forEach((l, i) => { const s = i ? 1 : -1; l.thigh.rotation.set(-1.12, 0, s * 0.66); l.knee.rotation.set(1.32, 0, -s * 0.42); });
  const bounce = Math.sin(phase * 2) * 0.03 * clamp(speed / 6, 0, 1);
  c.spine.rotation.x = 0.1 + bounce * 2 + (1 - aim) * clamp(speed / 6, 0, 1) * 0.16; c.spine.rotation.y = twist * 0.78 * Math.max(aim, 0.25); c.neck.rotation.y = twist * 0.2; c.hips.position.y = 0.975 + bounce;
  const left = c.arms[1]; left.upper.rotation.set(-0.62, 0, 0.12); left.elbow.rotation.x = -0.95;
}

/* ================= the shootout ================= */
const $ = (s) => document.querySelector(s);
// standing eyes are above the bales and barrels; crouched eyes (and hat) are well below their tops
const EYE = 1.65, LOW = 0.82, CRATES_OUT = 28, OUTLAWS = 5;
let THREE, renderer, scene, camera, gunScene, gunCam, gun, world, canvasEl, W = 1, H = 1, puffs, tracers;
const TOUCH = typeof window !== 'undefined' && (matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window);
const S = { phase: 'start', t: 0, time: 0, enemies: [], crates: [], correct: 0, asked: 0, shots: 0, hits: 0, grace: 0, nextShot: 0, ambush: null, aimed: null, hold: 0, crate: null, answered: false, free: false, locked: false, everLocked: false, over: 0, shake: 0, hurt: 0, from: 0, fromAngle: 0, mark: 0, toastT: 0 };
const P = { running: false, crouch: false, eye: EYE, x: 0, z: 25, yaw: 0, pitch: 0, hp: 100, ammo: 0, cool: 0, bob: 0, moving: false, recoil: 0, load: 0 };
const keys = new Set(), stick = { x: 0, y: 0 };
const rand = (a, b) => a + Math.random() * (b - a);

/* ---------- rays against the town ---------- */
function rayBox(o, d, s, grow) {
  let near = 0, far = 1e9; const g = grow || 0, lo = [s.x0 - g, s.y0 - g, s.z0 - g], hi = [s.x1 + g, s.y1 + g, s.z1 + g];
  for (let k = 0; k < 3; k++) { if (Math.abs(d[k]) < 1e-8) { if (o[k] < lo[k] || o[k] > hi[k]) return null; continue; } let a = (lo[k] - o[k]) / d[k], b = (hi[k] - o[k]) / d[k]; if (a > b) { const c = a; a = b; b = c; } near = Math.max(near, a); far = Math.min(far, b); if (near > far) return null; }
  return near;
}
function rayTown(o, d, max, skip) {
  let best = max, what = null;
  for (const s of world.solids) { if (s === skip) continue; const t = rayBox(o, d, s); if (t !== null && t < best) { best = t; what = s.kind; } }
  if (d[1] < -1e-6) { const t = -o[1] / d[1]; if (t > 0 && t < best) { best = t; what = 'ground'; } }
  return { t: best, what };
}
function raySphere(o, d, c, r) { const x = o[0] - c.x, y = o[1] - c.y, z = o[2] - c.z, b = x * d[0] + y * d[1] + z * d[2], q = x * x + y * y + z * z - r * r, disc = b * b - q; if (disc < 0) return null; const t = -b - Math.sqrt(disc); return t > 0 ? t : null; }
function sees(from, to) { const d = [to[0] - from[0], to[1] - from[1], to[2] - from[2]], len = Math.hypot(...d); if (len < 0.01) return true; return rayTown(from, d.map((v) => v / len), len - 0.15).what === null; }
/* keeps a walker of a given width out of the walls */
function shove(p, r, feet) {
  for (let pass = 0; pass < 2; pass++) for (const s of world.solids) {
    if (s.y0 > feet + 1.6 || s.y1 < feet + 0.25) continue;
    const nx = clamp(p.x, s.x0, s.x1), nz = clamp(p.z, s.z0, s.z1), dx = p.x - nx, dz = p.z - nz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 > 1e-6) { const d = Math.sqrt(d2); p.x = nx + dx / d * r; p.z = nz + dz / d * r; }
    else { const out = [[p.x - s.x0 + r, -1, 0], [s.x1 - p.x + r, 1, 0], [p.z - s.z0 + r, 0, -1], [s.z1 - p.z + r, 0, 1]].sort((a, b) => a[0] - b[0])[0]; p.x += out[0] * out[1]; p.z += out[0] * out[2]; }
  }
  p.x = clamp(p.x, BOUNDS.x0, BOUNDS.x1); p.z = clamp(p.z, BOUNDS.z0, BOUNDS.z1);
}

/* ---------- messages ---------- */
function toast(text, time) { $('#toast').innerHTML = text ? '<span class="tag">' + text + '</span>' : ''; S.toastT = time || 2.4; }
function hud() {
  $('#hpBar i').style.width = clamp(P.hp, 0, 100) + '%';
  const r = $('#rounds'); if (r.childElementCount !== Math.min(P.ammo, 12)) r.innerHTML = '<i></i>'.repeat(Math.min(P.ammo, 12));
  const text = P.ammo ? P.ammo + (P.ammo === 1 ? ' bullet' : ' bullets') : 'Empty'; if ($('#ammoText').textContent !== text) $('#ammoText').textContent = text;
  const left = S.enemies.filter((e) => e.hp > 0).length, f = 'Outlaws ' + left + '/' + OUTLAWS; if ($('#foes').textContent !== f) $('#foes').textContent = f;
}
function puff(x, y, z, colour, size, life, rise) { const m = puffs.pool[puffs.next++ % puffs.pool.length]; m.visible = true; m.position.set(x, y, z); m.material.color.set(colour); m.userData = { t: 0, size, life, rise: rise === undefined ? 0.6 : rise }; }
function tracer(a, b) { const l = tracers.pool[tracers.next++ % tracers.pool.length]; const p = l.geometry.attributes.position; p.setXYZ(0, a.x, a.y, a.z); p.setXYZ(1, b.x, b.y, b.z); p.needsUpdate = true; l.geometry.computeBoundingSphere(); l.visible = true; l.userData.t = 0.09; }
/* how far off to one side something is, for the speakers and the warning arc */
const bearing = (x, z) => { const dx = x - P.x, dz = z - P.z, right = dx * Math.cos(P.yaw) - dz * Math.sin(P.yaw), ahead = -dx * Math.sin(P.yaw) - dz * Math.cos(P.yaw); return { dist: Math.hypot(dx, dz), angle: Math.atan2(right, ahead), pan: right / (Math.hypot(dx, dz) + 0.01) }; };

/* ---------- the gang ---------- */
const myEyes = () => [P.x, P.eye, P.z];
const seesMe = (from) => sees(from, [P.x, P.eye - 0.08, P.z]) || sees(from, [P.x, P.eye * 0.66, P.z]);
const eyeOf = (e) => [e.x, e.mounted ? 2.45 : 1.5, e.z];
const alive = () => S.enemies.filter((e) => e.hp > 0);
const hidden = () => P.crouch && !alive().some((e) => seesMe(eyeOf(e)));
function crouch() { if (S.phase !== 'play') return; P.crouch = !P.crouch; $('#duckBtn').textContent = P.crouch ? 'Stand' : 'Crouch'; Snd.step(); }
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const holdFire = () => S.grace > 0 || (S.asked === 0 && S.time < 30);

/* the town as the gang knows it: ways round it, and the spots beside cover */
function survey() {
  S.nav = makeNav(world.solids, 0.38); S.horseNav = makeNav(world.solids, 0.85); S.cover = [];
  for (const s of world.solids) {
    if (s.y0 > 0.3 || s.y1 < 0.9 || s.y1 > 1.9 || Math.max(s.x1 - s.x0, s.z1 - s.z0) < 0.6) continue;
    const x = (s.x0 + s.x1) / 2, z = (s.z0 + s.z1) / 2;
    [[x, s.z0 - 0.62], [x, s.z1 + 0.62], [s.x0 - 0.62, z], [s.x1 + 0.62, z]].forEach(([cx, cz]) => { if (S.nav.open(cx, cz)) S.cover.push({ x: cx, z: cz }); });
  }
}
function clearGang() { S.enemies.forEach((e) => { [e.c.root, e.c.hat, e.horse && e.horse.root].forEach((o) => { if (o && o.parent) o.parent.remove(o); }); }); S.enemies = []; }
function spawnGang() {
  clearGang(); survey();
  const starts = [1, 2, 5, 7].map((i) => world.posts[i]);
  S.enemies = GANG.map((look, i) => {
    const c = makeCowboy(THREE, look), mounted = i === 1, p = mounted ? { x: 0, z: -37 } : starts[i > 1 ? i - 1 : i];
    const e = { c, name: look.name, i, mounted, x: p.x, y: 0, z: p.z, hp: 1, state: mounted ? 'ride' : 'cover', t: rand(1, 3.5), crouch: mounted ? 0 : 1, aim: 0, flinch: 0, stride: 0, path: null, then: null, heard: -9, dead: 0, shots: 0, rounds: 6, exposed: 0, misses: 0, face: 0, known: { x: 0, z: 20 }, seen: -99, think: rand(0, 0.3), cool: rand(3, 5), aimT: 0, speed: 0 };
    if (mounted) { const horse = makeHorse(THREE); horse.root.position.set(p.x, 0, p.z); horse.body.add(c.root); c.root.position.set(0, 0.76, -0.1); scene.add(horse.root); e.horse = horse; e.heading = 0; poseRider(c, 0, 0, 0, 0); }
    else { c.root.position.set(p.x, 0, p.z); scene.add(c.root); pose(c, e.crouch, 0, 0, false, 0); }
    return e;
  });
}

/* shooting and being heard */
function enemyFire(e, sure) {
  (e.horse && e.mounted ? e.horse.root : e.c.root).updateMatrixWorld(true); const m = e.c.muzzle.getWorldPosition(new THREE.Vector3()), b = bearing(e.x, e.z);
  e.c.flash.visible = true; e.flashT = 0.07; e.heard = S.time; e.shots++; S.nextShot = S.time + rand(1.0, 2.2); Snd.shot(b.dist, b.pan); puff(m.x, m.y, m.z, '#d9d2c4', 0.35, 0.7);
  const clear = seesMe([m.x, m.y, m.z]) || seesMe(eyeOf(e));
  // a running target is much harder to hit, so a dash for a crate is worth the risk
  const chance = clamp(0.5 - b.dist * 0.01, 0.09, 0.38) * (P.running ? 0.28 : P.moving ? 0.45 : 1) * (P.crouch ? 0.7 : 1) * (e.mounted ? 0.65 : 1);
  if (sure || (clear && Math.random() < chance)) { tracer(m, new THREE.Vector3(P.x + rand(-0.2, 0.2), P.eye - 0.3, P.z + rand(-0.2, 0.2))); hurt(sure ? rand(15, 22) : rand(18, 27), b.angle); }
  else {
    const aim = [P.x + rand(-1.4, 1.4) - m.x, rand(0.3, P.eye + 0.7) - m.y, P.z + rand(-1.4, 1.4) - m.z], len = Math.hypot(...aim), d = aim.map((v) => v / len), hit = rayTown([m.x, m.y, m.z], d, 60);
    const end = new THREE.Vector3(m.x + d[0] * hit.t, m.y + d[1] * hit.t, m.z + d[2] * hit.t); tracer(m, end);
    if (hit.what) { puff(end.x, end.y, end.z, hit.what === 'ground' ? '#c69a68' : '#b9946a', 0.4, 0.8); const be = bearing(end.x, end.z); if (Math.random() < 0.5) Snd.ricochet(be.pan, be.dist); } else Snd.whizz(b.pan);
  }
}
/* your shot tells everyone where you are; a near miss makes its target duck */
function alarm(o, d) {
  alive().forEach((e) => { e.known = { x: P.x, z: P.z }; e.seen = Math.max(e.seen, S.time - 1.5); const eye = eyeOf(e), vx = eye[0] - o[0], vy = eye[1] - 0.2 - o[1], vz = eye[2] - o[2], along = vx * d[0] + vy * d[1] + vz * d[2]; if (along > 0 && Math.hypot(vx - d[0] * along, vy - d[1] * along, vz - d[2] * along) < 1.3) e.scared = true; });
}

/* choosing where to go */
function bestCover(e) {
  const threat = [e.known.x, 1.6, e.known.z];
  const near = S.cover.map((p) => ({ p, far: dist(p, e), from: dist(p, e.known) })).filter((q) => q.far < 24 && q.far > 0.8 && q.from > 5 && q.from < 28 && !alive().some((o) => o !== e && dist(q.p, o.goal || o) < 2.4)).map((q) => Object.assign(q, { sort: q.far + Math.random() * 12 })).sort((a, b) => a.sort - b.sort).slice(0, 36);
  let best = null;
  for (const q of near) { if (!sees([q.p.x, 1.52, q.p.z], threat)) continue; const safe = !sees([q.p.x, 0.95, q.p.z], threat), score = (safe ? 22 : 0) - Math.abs(q.from - 14) * 0.8 - q.far * 0.55 + Math.random() * 9; if (!best || score > best.score) best = { p: q.p, score }; }
  return best && best.p;
}
function firingSpot(e) {
  let best = null;
  for (let k = 0; k < 26; k++) { const a = rand(0, 6.283), r = rand(6, 17), p = { x: e.known.x + Math.sin(a) * r, z: e.known.z + Math.cos(a) * r }; if (!S.nav.open(p.x, p.z) || !sees([p.x, 1.52, p.z], [e.known.x, 1.6, e.known.z])) continue; const far = dist(p, e); if (!best || far < best.far) best = { p, far }; }
  return best && best.p;
}
function goTo(e, p, then) { const path = S.nav.path(e, p); if (!path) { e.state = 'look'; e.t = rand(1, 2); return; } e.path = path; e.goal = p; e.then = then; e.state = 'move'; e.t = rand(0.6, 1.6); e.moved = 0; }
function decide(e) {
  e.exposed = 0; e.misses = 0;
  if (e.rounds <= 0) { e.state = 'reload'; e.t = 2.3; return; }
  const cover = Math.random() < 0.82 && bestCover(e); if (cover) return goTo(e, cover, 'cover');
  const spot = firingSpot(e); if (spot) return goTo(e, spot, 'stand');
  goTo(e, { x: e.known.x + rand(-5, 5), z: e.known.z + rand(-5, 5) }, 'look');
}
/* nobody stands nose to the wall: if the way they want to face is walled off, they turn along it */
function openFacing(e, want) {
  for (const off of [0, 0.5, -0.5, 1, -1, 1.5, -1.5, 2.2, -2.2, Math.PI]) { const a = want + off, hit = rayTown([e.x, 1.5, e.z], [Math.sin(a), 0, Math.cos(a)], 1.7); if (hit.what !== 'wood') return a; }
  return want;
}

function dying(e, dt) {
  const c = e.c;
  if (!e.dead && e.mounted) { c.root.parent.updateMatrixWorld(true); scene.attach(c.root); c.root.rotation.set(0, e.heading, 0); e.fall = c.root.position.y; e.mounted = false; e.x = c.root.position.x; e.z = c.root.position.z; e.horse.flee = true; }
  // tips over backwards in a cloud of dust, hat and all
  e.dead += dt; const k = ease(clamp(e.dead / 0.75, 0, 1));
  pose(c, 0.15 * (1 - k), 0.3 * (1 - k), 0, false, 0); c.body.rotation.x = -k * 1.5; c.body.position.y = k * 0.18; if (e.fall) c.root.position.y = e.fall * (1 - k * k);
  if (e.hatV) { const h = c.hat; if (h.position.y > 0.08) { e.hatV.y -= 9 * dt; h.position.addScaledVector(e.hatV, dt); h.rotation.x += dt * 6; h.rotation.z += dt * 4; } else { h.position.y = 0.08; h.rotation.set(0, h.rotation.y, 0); e.hatV = null; } }
  if (e.dead > 0.6 && !e.dusted) { e.dusted = true; for (let i = 0; i < 9; i++) puff(e.x + rand(-0.8, 0.8), 0.2, e.z + rand(-0.8, 0.8), '#cfa477', 0.8, 1.2); Snd.thud(bearing(e.x, e.z).pan); }
}

/* ---------- the rider ---------- */
function ridePlan(e) {
  const fleeing = !e.mounted; let best = null;
  for (let k = 0; k < 18; k++) { const p = { x: Math.random() < 0.7 ? rand(-8, 8) : rand(-30, 30), z: rand(-50, 28) }; if (!S.horseNav.open(p.x, p.z)) continue; const from = dist(p, { x: P.x, z: P.z }), far = Math.hypot(p.x - e.horse.root.position.x, p.z - e.horse.root.position.z); if (far < 12) continue; const score = fleeing ? from : -Math.abs(from - 15) + (sees([p.x, 2.4, p.z], myEyes()) ? 9 : 0) - far * 0.12 + Math.random() * 14; if (!best || score > best.score) best = { p, score }; }
  if (!best) return null; return S.horseNav.path(e.horse.root.position, best.p);
}
function horseTick(e, dt) {
  const h = e.horse, pos = h.root.position;
  let want = 0;
  if (e.rest > 0) e.rest -= dt;
  else {
    if (!e.path || !e.path.length) { if (h.flee && e.fled) { e.path = null; } else { e.path = ridePlan(e); if (h.flee) e.fled = true; if (!e.path) e.rest = 0.5; } }
    if (e.path && e.path.length) { const to = e.path[0]; want = h.flee ? 7.5 : 6.6; const turn = Math.abs(wrap(Math.atan2(to.x - pos.x, to.z - pos.z) - e.heading)); if (turn > 0.7) want = 3.2; }
  }
  e.speed = lerp(e.speed, want, Math.min(1, dt * (want ? 1.8 : 4)));
  if (e.path && e.path.length && e.speed > 0.1) {
    let step = e.speed * dt;
    while (step > 0 && e.path.length) { const to = e.path[0], dx = to.x - pos.x, dz = to.z - pos.z, d = Math.hypot(dx, dz); if (d <= step) { pos.x = to.x; pos.z = to.z; step -= d; e.path.shift(); if (!e.path.length && !h.flee && Math.random() < 0.3) e.rest = rand(1.2, 2.4); } else { pos.x += dx / d * step; pos.z += dz / d * step; e.heading += wrap(Math.atan2(dx, dz) - e.heading) * Math.min(1, dt * 5.5); step = 0; } }
    // swerves away rather than ride you down
    if (e.mounted && Math.hypot(pos.x - P.x, pos.z - P.z) < 3.2 && !e.swerved) { e.path = null; e.swerved = true; } else if (Math.hypot(pos.x - P.x, pos.z - P.z) > 6) e.swerved = false;
  }
  h.root.rotation.y = e.heading;
  const before = e.stride; e.stride += dt * (e.speed > 0.4 ? 3.5 + e.speed * 1.15 : 0);
  gait(h, e.stride, e.speed, S.time);
  if (Math.floor(e.stride / 1.55) !== Math.floor(before / 1.55)) { const b = bearing(pos.x, pos.z); if (b.dist < 38) Snd.hoof(b.dist, b.pan); if (e.speed > 4 && Math.random() < 0.5) puff(pos.x - Math.sin(e.heading) * 0.8, 0.2, pos.z - Math.cos(e.heading) * 0.8, '#cfa477', 0.5, 0.8); }
}
function riderTick(e, dt) {
  horseTick(e, dt); e.x = e.horse.root.position.x; e.z = e.horse.root.position.z;
  const twist = wrap(Math.atan2(P.x - e.x, P.z - e.z) - e.heading), d = bearing(e.x, e.z).dist;
  e.cool -= dt;
  if (e.aimT > 0) { e.aimT -= dt; if (e.aimT <= 0) { if (seesMe(eyeOf(e))) enemyFire(e); e.cool = rand(2.2, 4); e.recover = 0.4; } }
  else if (e.cool <= 0 && !holdFire() && S.time > S.nextShot && d < 32 && Math.abs(twist) < 2.3) { if (seesMe(eyeOf(e))) { e.aimT = 0.7; if (Math.abs(bearing(e.x, e.z).angle) > 1.1) Snd.warn(); } else e.cool = 0.4; }
  e.recover = Math.max(0, (e.recover || 0) - dt);
  e.aim = lerp(e.aim, e.aimT > 0 || e.recover > 0 ? 1 : 0, Math.min(1, dt * 7));
  poseRider(e.c, e.aim, clamp(twist, -2, 2), e.stride, e.speed);
  glint(e, e.aimT > 0 && e.aimT < 0.5);
}
function glint(e, on) { const f = e.c.flash; if (e.flashT > 0) { f.visible = true; f.material.opacity = 1; f.scale.setScalar(1.4); } else if (on) { f.visible = true; f.material.opacity = 0.6; f.scale.setScalar(0.28 + Math.sin(S.time * 40) * 0.12); } else f.visible = false; }

/* ---------- on foot ---------- */
function enemyTick(e, dt) {
  const c = e.c;
  if (e.flashT > 0) e.flashT -= dt;
  if (e.hp <= 0) { c.flash.visible = false; dying(e, dt); if (e.horse) horseTick(e, dt); return; }
  if (e.mounted) return riderTick(e, dt);
  e.t -= dt; e.flinch = Math.max(0, e.flinch - dt * 3);
  // eyes and ears
  e.think -= dt;
  if (e.think <= 0) {
    e.think = 0.22; const d = Math.hypot(P.x - e.x, P.z - e.z), ahead = Math.abs(wrap(Math.atan2(P.x - e.x, P.z - e.z) - e.face - c.neck.rotation.y));
    e.sight = d < 48 && (ahead < 1.9 || d < 9) && seesMe([e.x, e.state === 'cover' ? 1.1 : 1.5, e.z]);
    if (e.sight) { e.known = { x: P.x, z: P.z }; e.seen = S.time; alive().forEach((o) => { if (o !== e && dist(o, e) < 22 && S.time - o.seen > 3) o.known = { x: P.x, z: P.z }; }); }
  }
  if (e.scared) { e.scared = false; e.flinch = 1; if (e.state === 'aim' || e.state === 'rise' || e.state === 'cover') { if (Math.random() < 0.45) decide(e); else { e.state = 'cover'; e.t = rand(0.8, 1.6); } } }
  const toThreat = Math.atan2(e.known.x - e.x, e.known.z - e.z), busy = alive().some((o) => o !== e && !o.mounted && (o.state === 'rise' || o.state === 'aim')), mayShoot = !holdFire() && !busy && S.time > S.nextShot;
  let walking = false, running = false, face = toThreat;
  if (e.state === 'move') {
    const to = e.path[0], dx = to.x - e.x, dz = to.z - e.z, d = Math.hypot(dx, dz), rest = d + (e.path.length > 1 ? 4 : 0); running = rest > 5; walking = true;
    const speed = running ? 3.7 : 2.2, step = Math.min(d, speed * dt); if (d > 0.001) { e.x += dx / d * step; e.z += dz / d * step; face = Math.atan2(dx, dz); }
    e.stride += step * (running ? 2.5 : 3.1); e.crouch = lerp(e.crouch, running ? 0.12 : 0.3, Math.min(1, dt * 6)); e.aim = lerp(e.aim, running ? 0 : 0.45, Math.min(1, dt * 6)); e.moved += dt;
    if (d <= step + 0.05) { e.path.shift(); if (!e.path.length) { e.state = e.then; e.t = e.then === 'cover' ? rand(0.5, 1.8) : e.then === 'look' ? rand(2, 3.5) : rand(0.3, 0.8); e.goal = null; } }
    else if (e.moved > 14) decide(e);
    // a snap shot on the way past
    else if (e.sight && e.t <= 0 && mayShoot && Math.hypot(P.x - e.x, P.z - e.z) < 14 && e.rounds > 0) { if (Math.random() < 0.4) { e.state = 'aim'; e.t = 0.8; e.back = true; } else e.t = 1.2; }
  } else if (e.state === 'cover') {
    e.crouch = lerp(e.crouch, 1, Math.min(1, dt * 7)); e.aim = lerp(e.aim, 0.1, Math.min(1, dt * 7));
    // flushed out if you can see them while they are down
    if (e.sight && seesMe([e.x, 0.95, e.z])) e.exposed += dt; else e.exposed = 0;
    if (e.exposed > 1.1) decide(e);
    else if (e.t <= 0) {
      if (e.rounds <= 0) { e.state = 'reload'; e.t = 2.3; }
      else if (seesMe([e.x, 1.52, e.z])) { if (mayShoot) { e.state = 'rise'; e.t = 0.42; } else e.t = rand(0.3, 0.8); }
      else { e.misses++; e.t = rand(0.6, 1.3); if (e.misses >= 2) decide(e); }
    }
  } else if (e.state === 'rise') { e.crouch = clamp(e.t / 0.42, 0, 1); e.aim = 1 - e.crouch; if (e.t <= 0) { e.state = 'aim'; e.t = rand(0.85, 1.35); if (Math.abs(bearing(e.x, e.z).angle) > 1.1) Snd.warn(); } }
  else if (e.state === 'aim') {
    e.crouch = lerp(e.crouch, 0, Math.min(1, dt * 12)); e.aim = 1; if (holdFire()) e.t = Math.max(e.t, 0.7);
    if (e.sight) face = Math.atan2(P.x - e.x, P.z - e.z);
    if (e.t <= 0) { if (seesMe([e.x, 1.52, e.z])) { enemyFire(e); e.rounds--; } if (e.rounds > 0 && e.sight && Math.random() < 0.3) e.t = 0.75; else { e.state = 'after'; e.t = 0.4; } }
  } else if (e.state === 'after') {
    e.aim = lerp(e.aim, 0.6, Math.min(1, dt * 6));
    if (e.t <= 0) { if (e.back && e.path && e.path.length) { e.back = false; e.state = 'move'; e.t = rand(1.5, 3); } else if (S.nav && S.cover.some((p) => dist(p, e) < 0.9) && Math.random() < 0.5) { e.state = 'cover'; e.t = rand(1.4, 3.2); e.misses = 0; } else decide(e); }
  } else if (e.state === 'stand') {
    e.crouch = lerp(e.crouch, 0.12, Math.min(1, dt * 6)); e.aim = lerp(e.aim, 0.4, Math.min(1, dt * 5));
    if (e.t <= 0) { if (e.sight && mayShoot && e.rounds > 0) { e.state = 'aim'; e.t = rand(0.9, 1.3); } else if (!e.sight || Math.random() < 0.3) decide(e); else e.t = rand(0.4, 0.9); }
  } else if (e.state === 'reload') { e.crouch = lerp(e.crouch, 0.85, Math.min(1, dt * 5)); e.aim = lerp(e.aim, 0, Math.min(1, dt * 6)); if (e.t <= 0) { e.rounds = 6; decide(e); } }
  else if (e.state === 'look') {
    e.crouch = lerp(e.crouch, 0.1, Math.min(1, dt * 5)); e.aim = lerp(e.aim, 0.25, Math.min(1, dt * 4)); face = toThreat + Math.sin(S.time * 0.9 + e.i) * 0.9;
    if (e.sight) { e.t = Math.min(e.t, 0.35); }
    // having lost you, they pick up the trail again
    if (e.t <= 0) { if (S.time - e.seen > 6) e.known = { x: P.x + rand(-7, 7), z: P.z + rand(-7, 7) }; decide(e); }
  }
  if (!walking) face = openFacing(e, face);
  e.face += wrap(face - e.face) * Math.min(1, dt * (walking ? 10 : 7));
  c.root.position.set(e.x, 0, e.z); c.root.rotation.y = e.face; c.neck.rotation.y = 0;
  pose(c, e.crouch, e.aim, e.stride, walking, e.flinch);
  // the small things that make someone look alive
  c.spine.rotation.x += Math.sin(S.time * 1.9 + e.i * 2) * 0.012;
  if (running) { c.spine.rotation.x += 0.24; c.arms.forEach((a, k) => { a.upper.rotation.x = Math.sin(e.stride + k * Math.PI) * -0.85; a.elbow.rotation.x = -1.35; }); c.neck.rotation.x -= 0.18; }
  if (e.state === 'cover' || e.state === 'look') c.neck.rotation.y = Math.sin(S.time * (e.state === 'look' ? 2.1 : 1.1) + e.i * 1.7) * (e.state === 'look' ? 0.85 : 0.45);
  if (e.state === 'reload') { const [r, l] = c.arms, k = Math.sin(S.time * 9) * 0.1; r.upper.rotation.set(-0.62, 0, 0.3); r.elbow.rotation.x = -1.35; l.upper.rotation.set(-0.72 + k, 0, -0.42); l.elbow.rotation.x = -1.45 + k; c.neck.rotation.x = 0.35; }
  glint(e, e.state === 'aim' && e.t < 0.5);
}
/* where a bullet along a ray meets an outlaw: the head, the body or the legs */
function rayOutlaw(e, o, d) {
  const c = e.c, v = new THREE.Vector3(); (e.horse && e.mounted ? e.horse.root : c.root).updateMatrixWorld(true); const slack = (TOUCH ? 1.3 : 1.06) * (e.mounted ? 1.25 : 1); let best = null;
  const test = (node, y, r, part) => { v.set(0, y, 0).applyMatrix4(node.matrixWorld); const t = raySphere(o, d, v, r * slack); if (t !== null && (!best || t < best.t)) best = { t, part }; };
  test(c.head, 0.02, 0.17, 'head'); [0.08, 0.3, 0.49].forEach((y) => test(c.spine, y, 0.245, 'body')); c.legs.forEach((l) => { test(l.thigh, -0.22, 0.15, 'legs'); test(l.knee, -0.24, 0.135, 'legs'); });
  return best;
}

/* ---------- your revolver ---------- */
function shoot() {
  if (S.phase !== 'play' || P.cool > 0) return;
  if (!P.ammo) { P.cool = 0.25; Snd.click(); toast('No bullets: find an ammo crate', 2); return; }
  P.ammo--; P.cool = 0.42; P.recoil = 1; S.shots++; S.shake = Math.max(S.shake, 0.35); Snd.shot(0, 0);
  const spread = P.moving ? 0.007 : 0.0015, dir = new THREE.Vector3(rand(-spread, spread), rand(-spread, spread), -1).applyQuaternion(camera.quaternion).normalize(), o = [camera.position.x, camera.position.y, camera.position.z], d = [dir.x, dir.y, dir.z];
  const town = rayTown(o, d, 150); let hit = null;
  S.enemies.forEach((e) => { if (e.hp <= 0) return; const h = rayOutlaw(e, o, d); if (h && h.t < town.t && (!hit || h.t < hit.t)) hit = { e, t: h.t, part: h.part }; });
  const t = hit ? hit.t : town.t, end = new THREE.Vector3(o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t), from = new THREE.Vector3(0.16, -0.13, -0.7).applyQuaternion(camera.quaternion).add(camera.position);
  alarm(o, d); tracer(from, end); puff(from.x + d[0] * 0.5, from.y + d[1] * 0.5, from.z + d[2] * 0.5, '#e4ddd0', 0.2, 0.5);
  if (hit) {
    const e = hit.e; S.hits++; S.mark = 0.25; e.hp = 0; e.flinch = 1; puff(end.x, end.y, end.z, '#d8c9a8', 0.45, 0.6); Snd.thud(bearing(e.x, e.z).pan);
    if (e.hp <= 0) {
      e.state = 'down'; e.path = null; e.c.flash.visible = false; const h = e.c.hat; (e.horse ? e.horse.root : e.c.root).updateMatrixWorld(true); const p = h.getWorldPosition(new THREE.Vector3()); scene.add(h); h.position.copy(p); e.hatV = new THREE.Vector3(rand(-1.5, 1.5), 3.4, rand(-1.5, 1.5));
      const left = S.enemies.filter((q) => q.hp > 0).length; toast(left ? e.name + ' is down. ' + left + ' to go' : e.name + ' is down. The town is yours', 2.6);
      if (!left) { S.phase = 'won'; S.over = 0; Snd.whistle(true); }
    }
  } else if (town.what) { puff(end.x, end.y, end.z, town.what === 'ground' ? '#c69a68' : '#b08a60', 0.35, 0.7); const b = bearing(end.x, end.z); if (town.what === 'rock' || Math.random() < 0.3) Snd.ricochet(b.pan, b.dist); }
  hud();
}
function hurt(amount, angle) {
  if (S.phase !== 'play') return;
  P.hp -= Math.round(amount); S.hurt = 1; S.from = 1.3; S.fromAngle = angle; S.shake = 1; Snd.hurt(); hud();
  if (P.hp <= 0) { P.hp = 0; S.phase = 'lost'; S.over = 0; hud(); toast('You have been shot', 3); Snd.whistle(false); }
  else if (P.hp < 40) toast('You are badly hurt: get behind cover', 2.2);
}

/* ---------- ammunition crates ---------- */
function freeSpot() {
  const used = S.crates.map((c) => world.SPOTS[c.spot]), list = world.SPOTS.map((p, i) => i).filter((i) => { const [x, z] = world.SPOTS[i], d = Math.hypot(x - P.x, z - P.z); return d > 5 && used.every((q) => Math.hypot(q[0] - x, q[1] - z) > 2.5); });
  // new ones tend to turn up near where the fighting is
  const near = list.filter((i) => Math.hypot(world.SPOTS[i][0] - P.x, world.SPOTS[i][1] - P.z) < 18), pool = near.length ? near : list; return pool[Math.floor(Math.random() * pool.length)];
}
function setCrates() {
  S.crates.forEach((c) => world.dropCrate(c)); S.crates = [];
  // one just ahead of you, then most along the street and the rest out the back
  const spots = [0], all = world.SPOTS.map((p, i) => i).slice(1).sort(() => Math.random() - 0.5), street = all.filter((i) => Math.abs(world.SPOTS[i][0]) < 9.5), back = all.filter((i) => Math.abs(world.SPOTS[i][0]) >= 9.5), gap = (a, b) => Math.hypot(world.SPOTS[a][0] - world.SPOTS[b][0], world.SPOTS[a][1] - world.SPOTS[b][1]);
  const take = (list, upTo) => { for (const room of [7, 5.5, 4, 2.6]) for (const i of list) if (spots.length < upTo && !spots.includes(i) && spots.every((j) => gap(i, j) >= room)) spots.push(i); };
  take(street, Math.round(CRATES_OUT * 0.75)); take(back.concat(street), CRATES_OUT);
  spots.forEach((i) => S.crates.push(world.ammoCrate(i)));
}
function lookedAt() {
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion), o = [camera.position.x, camera.position.y, camera.position.z], d = [dir.x, dir.y, dir.z];
  let best = null, near = 3.7;
  S.crates.forEach((c) => { if (c.used) return; const t = rayBox(o, d, { x0: c.x - 0.6, x1: c.x + 0.6, y0: 0, y1: 0.75, z0: c.z - 0.5, z1: c.z + 0.5 }, TOUCH ? 0.35 : 0.1); if (t !== null && t < near && rayTown(o, d, t - 0.05, c.solid).what !== 'wood') { near = t; best = c; } });
  return best;
}
const levelNow = () => Math.min(6, S.correct + 1);
function openCrate(c) {
  S.phase = 'ask'; S.crate = c; S.hold = 0; S.answered = false; keys.clear(); stick.x = stick.y = 0;
  if (!c.question || c.question.level !== levelNow()) c.question = makeQuestion(levelNow());
  const q = c.question; Snd.creak();
  $('#askName').textContent = 'Ammunition crate'; $('#askLevel').textContent = q.name; $('#askWhat').textContent = q.ask; $('#sum').innerHTML = '<span>' + q.html + '</span>';
  const a = $('#ans'); a.value = ''; a.readOnly = false; say(''); showHow(false); $('#submit').textContent = 'Open crate'; $('#submit').disabled = true; $('#leave').hidden = false; $('#howBtn').hidden = false; $('#pad').hidden = false; $('#ansRow').hidden = false; $('#tipKey').hidden = TOUCH;
  $('#prompt').hidden = true; toast(''); $('#askForm').classList.remove('done'); $('#ask').hidden = false;
  if (document.pointerLockElement) document.exitPointerLock();
  if (!TOUCH) setTimeout(() => a.focus(), 30);
}
function say(text, cls) { const e = $('#say'); e.innerHTML = text; e.className = cls || ''; e.hidden = !text; }
function showHow(on) { const q = S.crate && S.crate.question; $('#how').hidden = !on; $('#howBtn').textContent = on ? 'Hide method' : 'Show method'; if (on && q) $('#how').innerHTML = '<ol>' + q.method.map((t) => '<li>' + t + '</li>').join('') + '</ol><div class="eg"><b>Example with other numbers</b>' + q.example.map((t) => '<span>' + t + '</span>').join('') + '</div>'; }
function typed() { const a = $('#ans'), at = a.selectionStart, before = a.value; const clean = before.replace(/r/gi, '√').replace(/[x*]/gi, '×').replace(/-/g, '−').replace(/[^\d√()+−×÷\/. ]/g, ''); if (clean !== before) { a.value = clean; const p = Math.max(0, at - (before.length - clean.length)); try { a.setSelectionRange(p, p); } catch (e) { /* not focused */ } } $('#submit').disabled = !a.value.trim(); }
function key(ch) {
  const a = $('#ans'); if (a.readOnly) return; const s = a.selectionStart === null ? a.value.length : a.selectionStart, e = a.selectionEnd === null ? s : a.selectionEnd;
  if (ch === '⌫') { const from = s === e ? Math.max(0, s - 1) : s; a.value = a.value.slice(0, from) + a.value.slice(e); a.setSelectionRange(from, from); }
  else if (a.value.length < 24) { a.value = a.value.slice(0, s) + ch + a.value.slice(e); a.setSelectionRange(s + 1, s + 1); }
  if (!TOUCH) a.focus(); typed();
}
function answer(e) {
  if (e) e.preventDefault(); if (S.phase !== 'ask') return;
  if (S.answered) { resume(); return; }
  const c = S.crate, q = c.question, r = mark(q, $('#ans').value);
  if (r.result === 'unreadable') { say('That cannot be read as a number. Check the brackets and roots.', 'warn'); return; }
  if (r.result === 'untidy') { say('That has the right value, but it is not finished. ' + r.why, 'warn'); return; }
  S.answered = true; S.asked++; c.used = 0.001; $('#askForm').classList.add('done'); $('#ans').readOnly = true; $('#leave').hidden = true; $('#pad').hidden = true; $('#tipKey').hidden = true; $('#submit').textContent = 'Back to the fight'; $('#submit').disabled = false;
  if (r.result === 'right') {
    S.correct++; const n = q.level >= 4 ? 3 : 2; P.ammo += n; P.load = 1; say('Correct: ' + n + ' bullets loaded.', 'good'); showHow(false); $('#howBtn').hidden = true; Snd.good(); Snd.load(n);
    // now and then someone has crept up while you were busy
    if (S.asked > 1 && Math.random() < 0.24) S.ambush = { t: 0.9 };
  } else { say('Not this time, so the ammunition is lost. The answer was <b>' + q.answer + '</b>.', 'bad'); showHow(true); Snd.bad(); }
  document.activeElement.blur(); if (!TOUCH) $('#submit').focus(); hud();
}
function resume() { const fresh = S.crate; $('#ask').hidden = true; $('#pause').hidden = true; S.phase = 'play'; S.crate = null; S.grace = Math.max(S.grace, fresh && S.asked === 1 ? 4 : 1.2); keys.clear(); lock(); }
function leave() { resume(); }

/* ---------- looking about ---------- */
function setFree() { if (S.free) return; S.free = true; toast(S.time < 3 ? 'Open the crate ahead. Move the mouse to look, click to shoot' : 'Move the mouse to look. Click to shoot', 5); }
function lock() {
  if (TOUCH || S.free || !canvasEl.requestPointerLock) { if (!TOUCH) setFree(); return; }
  try { const r = canvasEl.requestPointerLock(); if (r && r.catch) r.catch(() => { if (!S.everLocked) setFree(); }); } catch (e) { setFree(); }
  setTimeout(() => { if (S.phase === 'play' && !document.pointerLockElement && !S.free) { if (!S.everLocked) setFree(); else pause(); } }, 900);
}
function pause() { if (S.phase !== 'play') return; S.phase = 'pause'; keys.clear(); stick.x = stick.y = 0; $('#pauseText').textContent = TOUCH ? 'The outlaws are waiting.' : 'W A S D to move, mouse to look, click to shoot, hold Q on a crate, Z to crouch or stand. The arrow keys also turn.'; $('#pause').hidden = false; if (document.pointerLockElement) document.exitPointerLock(); }
function look_(dx, dy, k) { P.yaw -= dx * k; P.pitch = clamp(P.pitch - dy * k, -1.2, 1.2); }

/* ---------- start and finish ---------- */
function begin() {
  Snd.init(); $('#duckBtn').textContent = 'Crouch'; Object.assign(P, { crouch: false, eye: EYE, x: 0, z: 25, yaw: 0, pitch: -0.1, hp: 100, ammo: 0, cool: 0, recoil: 0, moving: false });
  Object.assign(S, { phase: 'play', time: 0, correct: 0, asked: 0, shots: 0, hits: 0, grace: 0, nextShot: 0, touchHold: false, edge: 0, promptWas: '', ambush: null, aimed: null, hold: 0, over: 0, shake: 0, hurt: 0, from: 0, mark: 0 });
  clearGang(); setCrates(); spawnGang(); keys.clear();
  ['#start', '#end', '#pause', '#ask'].forEach((s) => { $(s).hidden = true; }); $('#huds').hidden = false; $('#touch').hidden = !TOUCH; $('#pauseBtn').hidden = false; hud(); toast('Open the crate in front of you', 5); lock();
}
function finish() {
  const won = S.phase === 'won'; S.phase = 'end'; if (document.pointerLockElement) document.exitPointerLock(); $('#huds').hidden = true;
  $('#endTitle').textContent = won ? 'You won the shootout' : 'You were shot';
  const down = S.enemies.filter((e) => e.hp <= 0).length; $('#endText').textContent = won ? 'Dry Gulch is yours.' : down ? 'You took ' + down + ' of them with you. Use the barrels for cover and keep moving.' : 'Use the barrels for cover and keep moving.';
  $('#endStats').innerHTML = '<b>Outlaws down</b><span>' + down + ' of ' + OUTLAWS + '</span><b>Crates solved</b><span>' + S.correct + ' of ' + S.asked + '</span><b>Shots that hit</b><span>' + S.hits + ' of ' + S.shots + '</span><b>Time</b><span>' + Math.floor(S.time / 60) + ':' + String(Math.floor(S.time % 60)).padStart(2, '0') + '</span>';
  $('#end').hidden = false;
}

/* ---------- the map ---------- */
function drawMap() {
  const c = $('#map'), g = c.getContext('2d'), w = c.width, h = c.height, k = w / (BOUNDS.x1 - BOUNDS.x0), X = (x) => (x - BOUNDS.x0) * k, Z = (z) => (z - BOUNDS.z0) * (h / (BOUNDS.z1 - BOUNDS.z0));
  g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(214,176,122,.28)'; g.fillRect(X(-9), 0, 18 * k, h);
  g.fillStyle = 'rgba(240,224,188,.55)'; world.solids.forEach((s) => { if (s.x1 - s.x0 > 3 && s.z1 - s.z0 > 3) g.fillRect(X(s.x0), Z(s.z0), (s.x1 - s.x0) * k, Z(s.z1) - Z(s.z0)); });
  S.crates.forEach((q) => { if (q.used) return; g.fillStyle = '#ffd05a'; g.fillRect(X(q.x) - 6, Z(q.z) - 5, 12, 10); g.strokeStyle = '#2a180b'; g.lineWidth = 2; g.strokeRect(X(q.x) - 6, Z(q.z) - 5, 12, 10); });
  const left = S.enemies.filter((e) => e.hp > 0).length;
  S.enemies.forEach((e) => { if (e.hp <= 0 || !(S.time - e.heard < 4 || left <= 2)) return; g.fillStyle = '#ff5a36'; g.beginPath(); g.arc(X(e.x), Z(e.z), 7, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); });
  g.save(); g.translate(X(P.x), Z(P.z)); g.rotate(-P.yaw); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -13); g.lineTo(9, 9); g.lineTo(0, 4); g.lineTo(-9, 9); g.closePath(); g.fill(); g.strokeStyle = '#2a180b'; g.lineWidth = 2; g.stroke(); g.restore();
}

/* ---------- the loop ---------- */
function step(dt) {
  S.t += dt; const live = S.phase === 'play' || S.phase === 'won' || S.phase === 'lost';
  if (S.phase === 'start') { const a = Math.sin(S.t * 0.12); camera.position.set(a * 2.4, 2.7, 30); camera.rotation.set(-0.04, a * 0.07, 0); world.tick(S.t, dt); return; }
  if (!live) return;
  S.time += dt; world.tick(S.t, dt); S.grace = Math.max(0, S.grace - dt); P.cool = Math.max(0, P.cool - dt);
  if (S.phase === 'play') {
    // walking
    let fx = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0) - stick.y, sx = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0) + stick.x; const len = Math.hypot(fx, sx); if (len > 1) { fx /= len; sx /= len; }
    const dash = !P.crouch && (keys.has('ShiftLeft') || keys.has('ShiftRight') || Math.hypot(stick.x, stick.y) > 0.96), speed = P.crouch ? 2.2 : dash ? 6.8 : 4.4, was = [P.x, P.z];
    if (len > 0.05) { const pos = { x: P.x + (-Math.sin(P.yaw) * fx + Math.cos(P.yaw) * sx) * speed * dt, z: P.z + (-Math.cos(P.yaw) * fx - Math.sin(P.yaw) * sx) * speed * dt }; shove(pos, 0.36, 0); P.x = pos.x; P.z = pos.z; }
    const moved = Math.hypot(P.x - was[0], P.z - was[1]); P.moving = moved > speed * dt * 0.4; P.running = P.moving && dash;
    // you cannot walk through a horse
    S.enemies.forEach((e) => { if (!e.horse) return; const q = e.horse.root.position, dx = P.x - q.x, dz = P.z - q.z, d = Math.hypot(dx, dz); if (d < 1.15 && d > 0.01) { const p = { x: q.x + dx / d * 1.15, z: q.z + dz / d * 1.15 }; shove(p, 0.36, 0); P.x = p.x; P.z = p.z; } });
    const last = Math.floor(P.bob / Math.PI); P.bob += moved * 2.1; if (Math.floor(P.bob / Math.PI) !== last) Snd.step();
    // turning with the keys, or by resting the pointer at the edge when the mouse cannot be captured
    const turn = (keys.has('ArrowLeft') ? 1 : 0) - (keys.has('ArrowRight') ? 1 : 0), tilt = (keys.has('ArrowUp') ? 1 : 0) - (keys.has('ArrowDown') ? 1 : 0);
    P.yaw += turn * 2.1 * dt; P.pitch = clamp(P.pitch + tilt * 1.4 * dt, -1.2, 1.2);
    if (S.free && S.edge) P.yaw -= S.edge * 1.8 * dt;
    if (S.ambush) { S.ambush.t -= dt; if (S.ambush.t <= 0) { const live = alive(), seen = live.filter((e) => seesMe(eyeOf(e))), covered = P.crouch && !seen.length, pool = seen.length ? seen : live, e = pool[Math.floor(Math.random() * pool.length)]; S.ambush = null; if (e) { toast(covered ? e.name + ' fired, but your cover took it' : 'Ambush! ' + e.name + ' caught you loading', 2.6); if (!e.mounted) { e.state = 'after'; e.t = 0.6; e.crouch = 0; e.aim = 1; e.face = Math.atan2(P.x - e.x, P.z - e.z); } else { e.aim = 1; e.recover = 0.7; } enemyFire(e, !covered); } } }
  }
  P.eye = lerp(P.eye, P.crouch ? LOW : EYE, Math.min(1, dt * 11));
  S.enemies.forEach((e) => enemyTick(e, S.phase === 'lost' ? dt * 0.4 : dt));
  // the camera
  const fall = S.phase === 'lost' ? ease(clamp(S.over / 1.3, 0, 1)) : 0, shake = S.shake * 0.03;
  camera.position.set(P.x + rand(-shake, shake), P.eye + (P.moving ? Math.sin(P.bob * 2) * (P.crouch ? 0.018 : 0.035) : 0) - fall * (P.eye - 0.4) + rand(-shake, shake), P.z);
  camera.rotation.set(P.pitch + P.recoil * 0.045 + fall * 0.35, P.yaw, fall * 0.55);
  S.shake = Math.max(0, S.shake - dt * 3.5); P.recoil = Math.max(0, P.recoil - dt * 5.5);
  // the revolver in your hand
  const sway = P.moving ? 1 : 0.15; P.load = Math.max(0, P.load - dt * 1.4);
  gun.position.set(gun.home.x + Math.cos(P.bob) * 0.008 * sway, gun.home.y + Math.abs(Math.sin(P.bob)) * 0.01 * sway - (P.load > 0 ? Math.sin(P.load * Math.PI) * 0.07 : 0) - fall, gun.home.z + P.recoil * 0.07);
  gun.rotation.set(P.recoil * 0.55 - (P.load > 0 ? Math.sin(P.load * Math.PI) * 0.4 : 0), 0.05, P.load > 0 ? Math.sin(P.load * Math.PI) * 0.7 : 0); gun.drum.rotation.z += P.load > 0 ? dt * 18 : 0; gun.flash.visible = P.recoil > 0.72;
  // crates: a lid swings up once opened, and a fresh one turns up elsewhere
  for (let i = S.crates.length - 1; i >= 0; i--) { const c = S.crates[i]; if (!c.used) { c.mark.position.y = 1.3 + Math.sin(S.t * 3 + i) * 0.08; continue; } c.used += dt; c.open = Math.min(1, c.open + dt * 3); c.lid.rotation.x = -ease(c.open) * 1.9; c.mark.visible = false; if (c.used > 3.5 && Math.hypot(c.x - P.x, c.z - P.z) > 2.5) { const spot = freeSpot(); if (spot === undefined) continue; world.dropCrate(c); S.crates.splice(i, 1); S.crates.push(world.ammoCrate(spot)); S.stale = true; } }
  if (S.stale) { S.stale = false; survey(); }
  S.aimed = S.phase === 'play' ? lookedAt() : null;
  const holding = keys.has('KeyQ') || S.touchHold;
  if (S.aimed && holding) { S.hold += dt / 0.75; if (S.hold >= 1) { openCrate(S.aimed); return; } } else S.hold = 0;
  // screen furniture
  $('#prompt').hidden = !S.aimed; if (S.aimed) { const text = TOUCH ? 'Ammo crate' : 'Hold <kbd>Q</kbd> to open'; if (S.promptWas !== text) { $('#promptText').innerHTML = text; S.promptWas = text; } $('#hold i').style.width = S.hold * 100 + '%'; }
  $('#openBtn').hidden = !(TOUCH && S.aimed);
  S.hurt = Math.max(0, S.hurt - dt * 1.4); $('#hurt').style.opacity = Math.max(S.hurt, P.hp < 40 && S.phase === 'play' ? 0.35 : 0, fall);
  S.from = Math.max(0, S.from - dt); $('#from').style.opacity = clamp(S.from, 0, 1); $('#from').style.transform = 'rotate(' + S.fromAngle + 'rad)';
  S.mark = Math.max(0, S.mark - dt); $('#mark').style.opacity = S.mark > 0 ? 1 : 0;
  if (S.toastT > 0) { S.toastT -= dt; if (S.toastT <= 0) toast(''); }
  drawMap();
  const low = $('#stance'), stance = !P.crouch || S.phase !== 'play' ? '' : hidden() ? 'Crouched: hidden' : 'Crouched: in view'; low.hidden = !stance; if (stance && low.textContent !== stance) { low.textContent = stance; low.classList.toggle('safe', stance.endsWith('hidden')); }
  puffs.pool.forEach((m) => { if (!m.visible) return; const d = m.userData; d.t += dt; m.position.y += dt * d.rise; m.scale.setScalar(d.size * (0.6 + d.t * 2.4)); m.material.opacity = 0.75 * (1 - d.t / d.life); if (d.t > d.life) m.visible = false; });
  tracers.pool.forEach((l) => { if (!l.visible) return; l.userData.t -= dt; if (l.userData.t <= 0) l.visible = false; });
  if (S.phase === 'won' || S.phase === 'lost') { S.over += dt; if (S.over > 2.4) finish(); }
}
function frame(dt) {
  step(dt); renderer.autoClear = true; renderer.render(scene, camera);
  if (S.phase !== 'start' && S.phase !== 'end') { renderer.autoClear = false; renderer.clearDepth(); renderer.render(gunScene, gunCam); }
}

/* ---------- your hand and revolver ---------- */
function makeGun() {
  const g = new THREE.Group(); gunScene.add(g);
  const steel = new THREE.MeshStandardMaterial({ color: 0x50545c, metalness: 0.85, roughness: 0.28 }), dark = new THREE.MeshStandardMaterial({ color: 0x24262b, metalness: 0.8, roughness: 0.35 }), wood = new THREE.MeshStandardMaterial({ color: 0x6e3b1a, roughness: 0.5 }), skin = new THREE.MeshStandardMaterial({ color: 0x9c6444, roughness: 0.8 }), cloth = new THREE.MeshStandardMaterial({ color: 0x4a5d73, roughness: 0.9 }), brass = new THREE.MeshStandardMaterial({ color: 0xc99b3a, metalness: 0.8, roughness: 0.3 });
  [skin, cloth, wood, brass].forEach((m) => m.color.convertSRGBToLinear());
  const add = (geo, m, x, y, z, p) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); (p || g).add(o); return o; };
  const tube = (r, len, m, x, y, z, p) => { const o = add(new THREE.CylinderGeometry(r, r, len, 18), m, x, y, z, p); o.rotation.x = Math.PI / 2; return o; };
  tube(0.017, 0.3, steel, 0, 0.028, -0.2); tube(0.008, 0.24, dark, 0, 0.004, -0.17); add(new THREE.BoxGeometry(0.008, 0.016, 0.014), dark, 0, 0.052, -0.34);
  const drum = new THREE.Group(); drum.position.set(0, 0.012, -0.015); g.add(drum); tube(0.037, 0.08, steel, 0, 0, 0, drum); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; tube(0.008, 0.082, dark, Math.cos(a) * 0.026, Math.sin(a) * 0.026, 0, drum); }
  add(new THREE.BoxGeometry(0.028, 0.022, 0.14), dark, 0, 0.052, -0.005); add(new THREE.BoxGeometry(0.03, 0.05, 0.07), steel, 0, 0.0, 0.055); add(new THREE.BoxGeometry(0.012, 0.03, 0.018), dark, 0, 0.052, 0.085).rotation.x = -0.6;
  const guard = add(new THREE.TorusGeometry(0.024, 0.004, 8, 20), brass, 0, -0.035, 0.018); guard.rotation.y = Math.PI / 2;
  const grip = add(new THREE.BoxGeometry(0.036, 0.12, 0.052), wood, 0, -0.065, 0.1); grip.rotation.x = -0.42;
  // hand and sleeve
  const palm = add(new THREE.SphereGeometry(0.045, 14, 10), skin, 0.006, -0.058, 0.108); palm.scale.set(0.95, 1.25, 1.05);
  for (let i = 0; i < 3; i++) { const f = add(new THREE.CylinderGeometry(0.0125, 0.0125, 0.062, 8), skin, -0.006, -0.048 - i * 0.026, 0.067 + i * 0.012); f.rotation.z = Math.PI / 2; }
  const thumb = add(new THREE.CylinderGeometry(0.012, 0.014, 0.075, 8), skin, -0.028, -0.012, 0.095); thumb.rotation.x = 1.25;
  const wrist = add(new THREE.CylinderGeometry(0.034, 0.043, 0.13, 14), skin, 0.03, -0.12, 0.17); wrist.rotation.set(-0.95, 0, -0.3);
  const sleeve = add(new THREE.CylinderGeometry(0.052, 0.085, 0.34, 14), cloth, 0.085, -0.22, 0.31); sleeve.rotation.set(-0.98, 0, -0.34);
  const flash = new THREE.Group(); flash.position.set(0, 0.028, -0.38); g.add(flash); const fm = new THREE.MeshBasicMaterial({ color: 0xffc860, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }); const core = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), fm); flash.add(core); for (let i = 0; i < 6; i++) { const spike = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.11, 6), fm); const a = i * Math.PI / 3; spike.position.set(Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0); spike.rotation.z = a - Math.PI / 2; flash.add(spike); }
  g.scale.setScalar(0.76); flash.visible = false; g.drum = drum; g.flash = flash; g.home = new THREE.Vector3(0.19, -0.15, -0.5); g.position.copy(g.home);
  gunScene.add(new THREE.HemisphereLight(0xffe8c8, 0x4a2e1c, 0.72)); const l = new THREE.DirectionalLight(0xffdcae, 0.9); l.position.set(-1, 1.5, 0.6); gunScene.add(l);
  return g;
}

/* ---------- boot ---------- */
function resize() {
  const vv = window.visualViewport, seen = vv && Math.abs(vv.scale - 1) < 0.02 && vv.height < innerHeight - 60, app = $('#app'); W = innerWidth || 1; H = Math.round(seen ? vv.height : innerHeight) || 1;
  app.style.height = seen ? H + 'px' : ''; app.style.bottom = seen ? 'auto' : ''; app.style.top = seen ? vv.offsetTop + 'px' : '';
  renderer.setSize(W, H, false); camera.aspect = gunCam.aspect = W / H; camera.fov = W < H ? 84 : 70; gunCam.fov = 50; camera.updateProjectionMatrix(); gunCam.updateProjectionMatrix();
  if (gun) gun.home.set(Math.min(0.19, 0.19 * (W / H) / 1.5), W < H ? -0.18 : -0.15, -0.5);
}
function controls() {
  addEventListener('keydown', (e) => {
    if (S.phase === 'ask') { if (e.code === 'Escape' && !S.answered) leave(); return; }
    if (S.phase === 'pause' && (e.code === 'KeyP' || e.code === 'Enter')) { e.preventDefault(); resume(); return; }
    if (S.phase !== 'play') return;
    if (e.code === 'KeyP' || e.code === 'Escape') { pause(); return; }
    if (e.code === 'KeyZ') { e.preventDefault(); if (!e.repeat) crouch(); return; }
    if (e.code === 'Space') { e.preventDefault(); shoot(); return; }
    if (/^(Key[WASDQ]|Arrow|Shift)/.test(e.code)) { e.preventDefault(); keys.add(e.code); }
  });
  addEventListener('keyup', (e) => keys.delete(e.code)); addEventListener('blur', () => { keys.clear(); S.edge = 0; if (S.phase === 'play' && !window.__still) pause(); });
  document.addEventListener('pointerlockchange', () => { S.locked = document.pointerLockElement === canvasEl; if (S.locked) { S.everLocked = true; S.free = false; } else if (S.phase === 'play' && !S.free) pause(); });
  document.addEventListener('pointerlockerror', () => { if (!S.everLocked) setFree(); });
  addEventListener('mousemove', (e) => { if (S.phase !== 'play' || TOUCH) return; if (S.locked) look_(e.movementX, e.movementY, 0.0022); else if (S.free) { look_(e.movementX, e.movementY, 0.0042); const u = e.clientX / W; S.edge = u < 0.07 ? -1 : u > 0.93 ? 1 : 0; } });
  document.addEventListener('mouseleave', () => { S.edge = 0; });
  addEventListener('contextmenu', (e) => e.preventDefault());
  canvasEl.addEventListener('mousedown', (e) => { if (TOUCH || S.phase !== 'play') return; e.preventDefault(); if (!S.locked && !S.free) { lock(); return; } if (e.button === 0 || e.button === 2) shoot(); });
  // touch: left thumb walks, any other drag looks
  const fingers = new Map(), pad = $('#stick'), nub = $('#stick i');
  const walk = (t) => { const r = pad.getBoundingClientRect(), dx = t.clientX - (r.left + r.width / 2), dy = t.clientY - (r.top + r.height / 2), d = Math.hypot(dx, dy), max = r.width * 0.38, k = d > max ? max / d : 1; stick.x = dx * k / max; stick.y = dy * k / max; nub.style.transform = 'translate(' + dx * k + 'px,' + dy * k + 'px)'; };
  pad.addEventListener('pointerdown', (e) => { e.preventDefault(); fingers.set(e.pointerId, { walk: true }); pad.setPointerCapture(e.pointerId); walk(e); });
  canvasEl.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') return; e.preventDefault(); fingers.set(e.pointerId, { x: e.clientX, y: e.clientY }); canvasEl.setPointerCapture(e.pointerId); });
  addEventListener('pointermove', (e) => { const f = fingers.get(e.pointerId); if (!f || S.phase !== 'play') return; if (f.walk) walk(e); else { look_(e.clientX - f.x, e.clientY - f.y, 0.0058); f.x = e.clientX; f.y = e.clientY; } });
  const lift = (e) => { const f = fingers.get(e.pointerId); if (f && f.walk) { stick.x = stick.y = 0; nub.style.transform = ''; } fingers.delete(e.pointerId); };
  addEventListener('pointerup', lift); addEventListener('pointercancel', lift);
  $('#fire').addEventListener('pointerdown', (e) => { e.preventDefault(); shoot(); }); $('#duckBtn').addEventListener('pointerdown', (e) => { e.preventDefault(); crouch(); });
  const ob = $('#openBtn'); ob.addEventListener('pointerdown', (e) => { e.preventDefault(); S.touchHold = true; ob.setPointerCapture(e.pointerId); }); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((n) => ob.addEventListener(n, () => { S.touchHold = false; }));
  // the question card
  ['7', '8', '9', '√', '(', ')', '4', '5', '6', '×', '/', '⌫', '1', '2', '3', '0', '+', '−'].forEach((ch) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = ch; if (ch === '√') b.className = 'root'; if (ch === '⌫') b.setAttribute('aria-label', 'delete'); b.addEventListener('pointerdown', (e) => e.preventDefault()); b.addEventListener('click', () => key(ch)); $('#pad').appendChild(b); });
  $('#ans').addEventListener('input', typed); $('#askForm').addEventListener('submit', answer); $('#leave').addEventListener('click', leave); $('#howBtn').addEventListener('click', () => showHow($('#how').hidden));
  $('#ride').addEventListener('click', begin); $('#again').addEventListener('click', begin); $('#resume').addEventListener('click', resume); $('#pauseBtn').addEventListener('click', pause);
  $('#sound').addEventListener('click', () => { Snd.on = !Snd.on; if (Snd.out) Snd.out.gain.value = Snd.on ? 0.85 : 0; $('#sound').textContent = Snd.on ? 'Sound on' : 'Sound off'; });
  $('#keys').innerHTML = (TOUCH ? [['Move', 'left thumb stick'], ['Look', 'drag the screen'], ['Shoot', 'Fire button'], ['Crouch', 'Crouch button'], ['Ammo', 'look at a crate and hold the button']] : [['Move', 'W A S D (Shift to run)'], ['Look', 'mouse or touchpad'], ['Shoot', 'click or right click'], ['Ammo', 'look at a crate and hold Q'], ['Crouch', 'Z to duck behind cover, Z again to stand'], ['Pause', 'P or Esc']]).map(([a, b]) => '<b>' + a + '</b><span>' + b + '</span>').join('');
}
function boot() {
  THREE = window.THREE; canvasEl = $('#gl');
  try { renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { $('#app').innerHTML = '<p id="nogl">This game needs 3D graphics, which this browser could not start. Try an up-to-date Chrome, Edge, Safari or Firefox.<br><a href="/learn/">Back to LastMind</a></p>'; return; }
  renderer.setPixelRatio(Math.min(TOUCH ? 1.5 : 1.75, window.devicePixelRatio || 1)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.02;
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(70, 1, 0.08, 1200); camera.rotation.order = 'YXZ'; gunScene = new THREE.Scene(); gunCam = new THREE.PerspectiveCamera(50, 1, 0.02, 10);
  const build = () => {
    world = buildWorld(THREE, scene, renderer); gun = makeGun();
    const soft = world.canvas(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 2, 32, 32, 31); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
    puffs = { next: 0, pool: Array.from({ length: 70 }, () => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, transparent: true, depthWrite: false })); m.visible = false; scene.add(m); return m; }) };
    tracers = { next: 0, pool: Array.from({ length: 10 }, () => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3)); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffe6a8, transparent: true, opacity: 0.8 })); l.visible = false; l.frustumCulled = false; scene.add(l); return l; }) };
    resize(); setCrates(); spawnGang(); controls();
    // the gang stand about on the title screen
    S.enemies.forEach((e) => { if (e.mounted) return; e.c.root.rotation.y = 0; pose(e.c, 0.1, 0.2, 0, false, 0); });
    addEventListener('resize', resize); if (window.visualViewport) visualViewport.addEventListener('resize', resize);
    $('#ride').disabled = false; $('#ride').textContent = 'Ride in';
    let last = performance.now();
    (function loop() { requestAnimationFrame(loop); const t = performance.now(), dt = Math.min(0.05, (t - last) / 1000); last = t; frame(dt); })();
  };
  // the painted signs want their lettering before they are drawn
  let built = false; const go = () => { if (!built) { built = true; build(); } };
  if (document.fonts && document.fonts.load) document.fonts.load('60px Rye').then(go, go); setTimeout(go, 1800);
}
boot();

})();
