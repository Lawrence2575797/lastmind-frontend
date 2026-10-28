// The match in 3D. The same match the 2D pitch shows, drawn from the touchline (where the manager stands) or from the stands. Nothing here changes the match:
// it reads positions, facing, the ball and the events the engine records, and draws them. three.js is loaded the first time a 3D view is chosen.
(function () {
  const FM = (window.FM = window.FM || {});
  const { L, W } = FM.PITCH, HL = L / 2, HW = W / 2, G = 9.81;
  let THREE = null, ready = false, loading = null, failed = false;
  let host = null, renderer, scene, camera, sun, players = new Map(), ballMesh, ballRing, nets = { '-1': [], '1': [] }, netT = 0, clock = 0;
  let mode = 'touchline', lastEv = 0, lastEvLen = 0, flightRec = null, goalFx = null, look = { x: 0, z: 0 }, cam = { x: 0, y: 4, z: HW + 5 };
  const lastPos = new Map();

  function load() {
    if (window.THREE) { THREE = window.THREE; return Promise.resolve(); }
    if (loading) return loading;
    const get = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.async = true; s.onload = () => (window.THREE ? res() : rej(new Error('three.js loaded empty'))); s.onerror = () => rej(new Error('three.js did not load')); document.head.appendChild(s); });
    // our own copy first (a school or work network that blocks CDNs still allows it), the CDN second
    loading = get('/create/football/vendor/three.min.js?v=r128').catch(() => get('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js')).then(() => { THREE = window.THREE; }, (e) => { failed = true; loading = null; throw e; });
    return loading;
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
  const lastBall = { x: 0, z: 0 }; let lastT = null, carriedVis = null, relOff = null, spcOn = false, snapNext = false;
  const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const tex = (c, srgb) => { const t = new THREE.CanvasTexture(c); if (srgb !== false) t.encoding = THREE.sRGBEncoding; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; };

  // ---------------------------------------------------------------- the ground, goals with nets, stands
  function pitchTexture() {
    const PPM = 16, mx = 8, mz = 6, cw = (L + 2 * mx) * PPM, ch = (W + 2 * mz) * PPM, c = mkCanvas(cw, ch), g = c.getContext('2d');
    const X = (m) => cw / 2 + m * PPM, Z = (m) => ch / 2 + m * PPM;
    g.fillStyle = '#2a6234'; g.fillRect(0, 0, cw, ch);
    const n = 15, sw = L / n; for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? '#34763c' : '#2d6a36'; g.fillRect(X(-HL + i * sw), Z(-HW), sw * PPM + 1, W * PPM); }
    for (let i = 0; i < 14000; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,' + Math.random() * 0.035 + ')' : 'rgba(0,0,0,' + Math.random() * 0.05 + ')'; g.fillRect(Math.random() * cw, Math.random() * ch, 2 + Math.random() * 5, 1 + Math.random() * 2); }
    g.strokeStyle = 'rgba(248,248,240,.95)'; g.fillStyle = 'rgba(248,248,240,.95)'; g.lineWidth = 3.2;
    const rect = (x0, z0, x1, z1) => g.strokeRect(X(x0), Z(z0), (x1 - x0) * PPM, (z1 - z0) * PPM);
    const arc = (cx, cz, r, a0, a1) => { g.beginPath(); g.arc(X(cx), Z(cz), r * PPM, a0, a1); g.stroke(); };
    const spot = (x, z) => { g.beginPath(); g.arc(X(x), Z(z), 0.22 * PPM, 0, 6.3); g.fill(); };
    rect(-HL, -HW, HL, HW); g.beginPath(); g.moveTo(X(0), Z(-HW)); g.lineTo(X(0), Z(HW)); g.stroke(); arc(0, 0, 9.15, 0, 6.3); spot(0, 0);
    [-1, 1].forEach((s) => { const gl = s * HL; rect(Math.min(gl, gl - s * 16.5), -20.16, Math.max(gl, gl - s * 16.5), 20.16); rect(Math.min(gl, gl - s * 5.5), -9.16, Math.max(gl, gl - s * 5.5), 9.16); spot(gl - s * 11, 0); const a = Math.acos(5.5 / 9.15); if (s === -1) arc(gl + 11, 0, 9.15, -a, a); else arc(gl - 11, 0, 9.15, Math.PI - a, Math.PI + a); });
    [[-HL, -HW, 0], [HL, -HW, 0.5], [HL, HW, 1], [-HL, HW, 1.5]].forEach((k) => arc(k[0], k[1], 1, k[2] * Math.PI, (k[2] + 0.5) * Math.PI));
    return { t: tex(c), w: L + 2 * mx, h: W + 2 * mz };
  }
  let NETTEX = null, CROWD = null, BOARD = null;
  const cyl = (r, len, mat, axis) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 14), mat); m.castShadow = true; if (axis === 'z') m.rotation.x = Math.PI / 2; if (axis === 'x') m.rotation.z = Math.PI / 2; return m; };
  function netPlane(w, h) {
    const t = NETTEX.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / 0.2, h / 0.2);
    const geo = new THREE.PlaneGeometry(w, h, Math.round(w * 5), Math.round(h * 5)), m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.12, side: THREE.DoubleSide, depthWrite: false }));
    m.userData.base = geo.attributes.position.array.slice(); return m;
  }
  function goal(dir) {
    const g = new THREE.Group(), x0 = dir * HL, back = dir * 2.1, H = 2.44, hw = 3.66, cx = x0 + back / 2;
    const white = new THREE.MeshStandardMaterial({ color: 0xf6f6f0, roughness: 0.4, metalness: 0.1 }), grey = new THREE.MeshStandardMaterial({ color: 0x9aa39e, roughness: 0.6, metalness: 0.3 });
    [-hw, hw].forEach((z) => { const p = cyl(0.06, H, white); p.position.set(x0, H / 2, z); g.add(p); });
    const bar = cyl(0.06, hw * 2 + 0.12, white, 'z'); bar.position.set(x0, H, 0); g.add(bar);
    const bt = cyl(0.04, hw * 2, grey, 'z'); bt.position.set(x0 + back, 2.1, 0); g.add(bt);
    [-hw, hw].forEach((z) => { const st = cyl(0.04, 2.1, grey); st.position.set(x0 + back, 1.05, z); g.add(st); });
    const list = [];
    const nb = netPlane(hw * 2, 2.1); nb.rotation.y = Math.PI / 2; nb.position.set(x0 + back, 1.05, 0); g.add(nb); list.push({ mesh: nb, sign: dir, imp: [], loc: (x, y, z) => [-z, y - 1.05] });
    [-hw, hw].forEach((z) => { const ns = netPlane(2.1, 2.3); ns.position.set(cx, 1.1, z); g.add(ns); list.push({ mesh: ns, sign: z < 0 ? -1 : 1, imp: [], loc: (x, y) => [x - cx, y - 1.1] }); });
    const nt = netPlane(2.1, hw * 2); nt.rotation.x = -Math.PI / 2; nt.position.set(cx, 2.27, 0); g.add(nt); list.push({ mesh: nt, sign: 1, imp: [], loc: (x, y, z) => [x - cx, -z] });
    nets[String(dir)] = list; return g;
  }
  function hitNet(side, i, speed, x, y, z) { const n = nets[String(side)][i], l = n.loc(x, y, z); n.imp.push({ t: netT, u: l[0], v: l[1], a: clamp(speed * 0.05, 0.12, 1.05) }); n.dirty = true; }
  function updateNets() {
    [-1, 1].forEach((side) => nets[String(side)].forEach((n) => {
      if (!n.imp.length && !n.dirty) return; const pos = n.mesh.geometry.attributes.position, base = n.mesh.userData.base;
      for (let i = 0; i < pos.count; i++) { const u = base[i * 3], v = base[i * 3 + 1]; let d = 0; for (const im of n.imp) { const age = netT - im.t; if (age < 0 || age > 2.6) continue; const r2 = (u - im.u) ** 2 + (v - im.v) ** 2; d += im.a * Math.exp(-r2 / 1.2) * Math.exp(-2.4 * age) * Math.cos(15 * age); } pos.array[i * 3 + 2] = d * n.sign; }
      pos.needsUpdate = true; n.dirty = n.imp.length > 0 && netT - n.imp[n.imp.length - 1].t < 2.7;
    }));
  }
  function stand(len, off) {
    const g = new THREE.Group(), dark = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1 });
    for (let k = 0; k < 4; k++) {
      const h = 2.2 + k * 2.6, d = 3.4, t = CROWD.clone(); t.needsUpdate = true; t.repeat.set(len / 26, h / 6);
      const m = new THREE.Mesh(new THREE.BoxGeometry(len, h, d), [dark(0x151d19), dark(0x151d19), dark(0x1b2420), dark(0x0e1411), dark(0x0e1411), new THREE.MeshStandardMaterial({ map: t, roughness: 1 })]);
      m.position.set(0, h / 2, off + k * d); g.add(m);
    }
    return g;
  }

  // ---------------------------------------------------------------- a player: a figure with a kit, hair, a number on the back and a run
  const matCache = {};
  const M = (color, rough) => { const k = color + '|' + (rough || 0.78); return matCache[k] || (matCache[k] = new THREE.MeshStandardMaterial({ color, roughness: rough || 0.78 })); };
  let GEO = null; const numTex = {};
  const numberTexture = (n, color) => { const k = n + color; if (numTex[k]) return numTex[k]; const c = mkCanvas(128, 128), g = c.getContext('2d'); g.fillStyle = color; g.font = '800 92px Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), 64, 70); return (numTex[k] = tex(c)); };
  const mesh = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; return m; };
  const SKIN = [0xf7d8c4, 0xedc3a5, 0xdba982, 0xc68863, 0xa86f48, 0x85553a, 0x5e3a27, 0xf1cdb0, 0x3f2619], HAIR = [0x1b1511, 0x3a2a1c, 0x6a4a2a, 0x141414, 0x8a6a3a, 0x2a1d14], STYLE = ['short', 'short', 'buzz', 'long', 'afro', 'bald', 'short', 'buzz'];
  // ---------------------------------------------------------------- a body built from smooth lofted shapes (no boxes or plain cylinders)
  // loft: a shape made by stacking elliptical rings along y. secs = [{ y, a (half-width, x), b (half-depth, z), ox, oz }]; the rings are joined and capped, and the normals smoothed.
  function loft(secs, seg) {
    seg = seg || 18; const pos = [], idx = [], n = secs.length;
    secs.forEach((s) => { for (let j = 0; j < seg; j++) { const a = j / seg * Math.PI * 2; pos.push((s.ox || 0) + s.a * Math.cos(a), s.y, (s.oz || 0) + s.b * Math.sin(a)); } });
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) { const a = i * seg + j, b = i * seg + (j + 1) % seg, c = (i + 1) * seg + j, d = (i + 1) * seg + (j + 1) % seg; idx.push(a, b, c, b, d, c); }
    const cap = (i, up) => { pos.push(secs[i].ox || 0, secs[i].y, secs[i].oz || 0); const ci = pos.length / 3 - 1; for (let j = 0; j < seg; j++) { const a = i * seg + j, b = i * seg + (j + 1) % seg; if (up) idx.push(ci, a, b); else idx.push(ci, b, a); } };
    cap(0, false); cap(n - 1, true);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    // make sure the faces point outward whichever way the rings wind
    const nr = g.attributes.normal; if (nr.getX(0) * Math.cos(0) < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } g.setIndex(idx); g.computeVertexNormals(); }
    return g;
  }
  const lerpSecs = (list) => list.map((r) => ({ y: r[0], a: r[1], b: r[2], ox: r[3] || 0, oz: r[4] || 0 }));
  // ---------------------------------------------------------------- a skinned footballer
  // One continuous mesh per material (shirt, shorts, skin, socks, boots, trim, face, hair), all bound to one 15-bone skeleton and skinned with smooth weights,
  // so the knees, elbows, shoulders, waist and neck bend as a body does instead of as separate parts. The mesh is made here, in code, from lofted
  // cross-sections of a real figure's proportions (1.8 m, head about 1/7.5 of the height), so there is no model file to license or to load.
  const SHADE = (c, k) => { const col = new THREE.Color(c); col.multiplyScalar(k); return col.getHex(); };
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const down = (y, j, r) => 1 - smooth(j - r, j + r, y);   // 0 above a joint, 1 below it, easing across the joint
  // bone order: 0 body, 1 torso, 2 head, 3-5 left arm/elbow/hand, 6-8 right arm/elbow/hand, 9-11 left hip/knee/ankle, 12-14 right hip/knee/ankle
  const BN = { body: 0, torso: 1, head: 2, arm: [3, 6], elbow: [4, 7], hand: [5, 8], hip: [9, 12], knee: [10, 13], ankle: [11, 14] };
  const JY = { torso: 1.0, shoulder: 1.5, elbow: 1.215, wrist: 0.945, hip: 0.89, knee: 0.46, ankle: 0.07, head: 1.69 };
  let SKP = null;
  function skinParts() {
    if (SKP) return SKP;
    const GEO = {}, push = (region, geo, fn, col) => {
      const p = geo.attributes.position, n = p.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) { const w = fn(p.getX(i), p.getY(i), p.getZ(i)); for (let k = 0; k < w.length && k < 4; k++) { si[i * 4 + k] = w[k][0]; sw[i * 4 + k] = w[k][1]; } }
      geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
      if (col != null) { const c = new THREE.Color(col), arr = new Float32Array(n * 3); for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; } geo.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3)); }
      (GEO[region] = GEO[region] || []).push(geo);
    };
    const S = [-1, 1], side = (s) => (s < 0 ? 0 : 1);
    // weight functions
    const fCore = (x, y) => { const t = smooth(JY.torso, JY.torso + 0.09, y); return [[BN.body, 1 - t], [BN.torso, t]]; };
    const fBody = () => [[BN.body, 1]], fHead = () => [[BN.head, 1]], fTorso = () => [[BN.torso, 1]];
    const fNeck = (x, y) => { const t = smooth(1.6, 1.68, y); return [[BN.torso, 1 - t], [BN.head, t]]; };
    const fLeg = (s) => (x, y) => { const t1 = down(y, JY.knee, 0.07), t2 = down(y, JY.ankle, 0.035); return [[BN.hip[side(s)], 1 - t1], [BN.knee[side(s)], t1 * (1 - t2)], [BN.ankle[side(s)], t1 * t2]]; };
    const fArm = (s) => (x, y) => { const ts = 0.5 * smooth(JY.shoulder, JY.shoulder + 0.08, y), t1 = down(y, JY.elbow, 0.06), t2 = down(y, JY.wrist, 0.03), k = 1 - ts; return [[BN.torso, ts], [BN.arm[side(s)], k * (1 - t1)], [BN.elbow[side(s)], k * t1 * (1 - t2)], [BN.hand[side(s)], k * t1 * t2]]; };
    const T = (geo, x, y, z) => { geo.translate(x || 0, y || 0, z || 0); return geo; };
    const sc = (geo, x, y, z) => { geo.scale(x, y, z); return geo; };
    // ---- trunk: waist, ribs, chest, shoulder line, trapezius slope
    push('shirt', T(loft(lerpSecs([[0, 0.138, 0.092], [0.07, 0.15, 0.098], [0.16, 0.168, 0.108], [0.27, 0.185, 0.118, 0, 0.004], [0.39, 0.198, 0.118, 0, 0.004], [0.48, 0.205, 0.105], [0.54, 0.165, 0.088], [0.585, 0.095, 0.07], [0.61, 0.058, 0.056]]), 26), 0, JY.torso, 0), fCore);
    push('shorts', T(loft(lerpSecs([[-0.02, 0.165, 0.105], [0.04, 0.178, 0.112], [0.12, 0.158, 0.1]]), 22), 0, JY.hip, 0), fBody);
    push('skin', T(loft(lerpSecs([[-0.02, 0.052, 0.05], [0.04, 0.047, 0.046], [0.09, 0.044, 0.046]]), 14), 0, 1.6, 0.008), fNeck);
    const col = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.014, 6, 20)); col.geometry.rotateX(Math.PI / 2); col.geometry.scale(1, 1.15, 1);
    push('trim', T(col.geometry, 0, 1.606, 0.006), fTorso);
    push('trim', T(sc(loft(lerpSecs([[0, 0.062, 0.066], [-0.045, 0.062, 0.066]]), 20), 2.3, 0.5, 1.55), 0, 1.012, 0), fCore);
    // ---- the head: chin, jaw, cheek, brow, crown; ears and nose; the face's eyes, brows and mouth
    const hx = 0, hy = JY.head, hz = 0.006;
    push('skin', T(loft(lerpSecs([[-0.125, 0.012, 0.03, 0, 0.012], [-0.115, 0.04, 0.05, 0, 0.014], [-0.09, 0.062, 0.075, 0, 0.008], [-0.05, 0.074, 0.093, 0, 0.004], [0, 0.078, 0.1], [0.05, 0.076, 0.097], [0.09, 0.066, 0.086, 0, -0.004], [0.12, 0.044, 0.062, 0, -0.01], [0.135, 0.016, 0.026, 0, -0.012]]), 26), hx, hy + 0.09, hz), fHead);
    const sph = (r, ws, hs) => new THREE.SphereGeometry(r, ws || 12, hs || 8);
    S.forEach((s) => push('skin', T(sc(sph(1, 10, 8), 0.011, 0.028, 0.019), s * 0.08, hy + 0.09, hz - 0.004), fHead));
    push('skin', T(sc(sph(1, 10, 8), 0.014, 0.024, 0.02), 0, hy + 0.074, hz + 0.1), fHead);
    S.forEach((s) => {
      push('face', T(sc(sph(1, 10, 8), 0.0165, 0.011, 0.01), s * 0.034, hy + 0.108, hz + 0.088), fHead, 0xf4f1ea);
      push('face', T(sc(sph(1, 8, 6), 0.0064, 0.0064, 0.0064), s * 0.034, hy + 0.108, hz + 0.0955), fHead, 0x3a2a1c);
      const br = sc(sph(1, 8, 6), 0.024, 0.0045, 0.01); br.rotateZ(s * -0.18); push('face', T(br, s * 0.036, hy + 0.132, hz + 0.088), fHead, 0x2a1d14);
    });
    push('face', T(sc(sph(1, 10, 6), 0.022, 0.0045, 0.01), 0, hy + 0.034, hz + 0.093), fHead, 0x8a4a42);
    // ---- limbs, one pair at a time
    S.forEach((s) => {
      const lx = s * 0.092, ax = s * 0.215, inn = -s, FL = fLeg(s), FA = fArm(s);
      // legs: shorts over the thigh, bare lower thigh, knee, calf in a sock with a band, rounded boot
      push('shorts', sc(T(loft(lerpSecs([[0, 0.092, 0.095], [-0.08, 0.098, 0.1], [-0.2, 0.085, 0.088]]), 18), lx, JY.hip, 0), 1, 1, 1), FL);
      push('skin', T(loft(lerpSecs([[0, 0.085, 0.088], [-0.1, 0.07, 0.074], [-0.2, 0.058, 0.06]]), 16), lx, 0.69, 0), FL);
      push('skin', T(sph(0.058, 14, 10), lx, JY.knee, 0.004), FL);
      push('socks', T(loft(lerpSecs([[0, 0.058, 0.06], [-0.05, 0.062, 0.07, 0, -0.01], [-0.14, 0.055, 0.064, 0, -0.012], [-0.28, 0.04, 0.045], [-0.38, 0.034, 0.036]]), 16), lx, 0.45, 0), FL);
      push('trim', T(sc(loft(lerpSecs([[0, 0.062, 0.066], [-0.045, 0.062, 0.066]]), 16), 1.02, 1, 1.02), lx, 0.44, 0), FL);
      const shoe = loft(lerpSecs([[-0.05, 0.036, 0.04], [0.02, 0.046, 0.05], [0.12, 0.048, 0.052], [0.2, 0.044, 0.045], [0.255, 0.03, 0.03]]), 16); shoe.rotateX(Math.PI / 2);
      push('boots', T(shoe, lx, 0.058, -0.002), () => [[BN.ankle[side(s)], 1]]);
      // arms: shoulder cap and short sleeve over the biceps, bare upper arm and forearm, elbow, hand with palm, four fingers and a thumb
      push('shirt', T(sph(0.062, 14, 10), ax, JY.shoulder, 0), FA);
      push('shirt', T(loft(lerpSecs([[0.01, 0.054, 0.054], [-0.06, 0.06, 0.058], [-0.15, 0.054, 0.054]]), 16), ax, JY.shoulder, 0), FA);
      push('trim', T(sc(loft(lerpSecs([[0, 0.057, 0.057], [-0.03, 0.057, 0.057]]), 16), 1, 1, 1), ax, JY.shoulder - 0.125, 0), FA);
      push('skin', T(loft(lerpSecs([[0, 0.05, 0.05], [-0.06, 0.056, 0.054], [-0.18, 0.047, 0.047], [-0.29, 0.04, 0.04]]), 16), ax, JY.shoulder, 0), FA);
      push('skin', T(sph(0.042, 12, 10), ax, JY.elbow, 0), FA);
      push('skin', T(loft(lerpSecs([[0, 0.04, 0.04], [-0.07, 0.044, 0.042], [-0.18, 0.033, 0.03], [-0.27, 0.027, 0.024]]), 14), ax, JY.elbow, 0), FA);
      push('skin', T(loft(lerpSecs([[0.005, 0.026, 0.012], [-0.05, 0.034, 0.015], [-0.095, 0.03, 0.012]]), 12), ax, JY.wrist, 0), FA);
      [[-0.0225, 0.052], [-0.0075, 0.062], [0.0075, 0.058], [0.0225, 0.046]].forEach(([fx, len]) => {
        const f = loft(lerpSecs([[0, 0.0078, 0.0078], [-len * 0.5, 0.0072, 0.0072, 0, 0.003], [-len, 0.0058, 0.0058, 0, 0.009]]), 8);
        push('skin', T(f, ax + fx, JY.wrist - 0.093, 0.0), FA);
      });
      const th = loft(lerpSecs([[0, 0.0095, 0.0095], [-0.025, 0.0088, 0.0088, 0, 0.004], [-0.048, 0.0065, 0.0065, 0, 0.012]]), 8); th.rotateZ(inn * 0.5);
      push('skin', T(th, ax + inn * 0.03, JY.wrist - 0.03, 0.008), FA);
    });
    // ---- hair, one shape per style
    const hair = {};
    ['short', 'buzz', 'long', 'afro'].forEach((st) => {
      const big = st === 'afro', g = new THREE.SphereGeometry(1, 20, 14, 0, Math.PI * 2, 0, Math.PI * (st === 'buzz' ? 0.38 : big ? 0.62 : 0.44));
      g.scale(big ? 0.115 : 0.087, big ? 0.125 : 0.105, big ? 0.12 : 0.108); g.rotateX(-0.08); g.translate(0, hy + (big ? 0.12 : 0.13), hz - 0.004);
      const parts = [g];
      if (st === 'long') { const b = new THREE.SphereGeometry(1, 12, 10); b.scale(0.082, 0.12, 0.06); b.translate(0, hy + 0.03, hz - 0.065); parts.push(b); }
      parts.forEach((p) => { const n = p.attributes.position.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4); for (let i = 0; i < n; i++) { si[i * 4] = BN.head; sw[i * 4] = 1; } p.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); p.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4)); });
      hair[st] = mergeSkinned(parts);
    });
    SKP = { hair };
    Object.keys(GEO).forEach((r) => { SKP[r] = mergeSkinned(GEO[r]); });
    return SKP;
  }
  // join several skinned geometries (all sharing the same attributes) into one
  function mergeSkinned(list) {
    let n = 0, ni = 0; list.forEach((g) => { n += g.attributes.position.count; ni += g.index.count; });
    const hasCol = !!list[0].attributes.color, pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), colr = hasCol ? new Float32Array(n * 3) : null, idx = new Uint32Array(ni);
    let o = 0, oi = 0;
    list.forEach((g) => {
      const c = g.attributes.position.count; pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); si.set(g.attributes.skinIndex.array, o * 4); sw.set(g.attributes.skinWeight.array, o * 4); if (hasCol) colr.set(g.attributes.color.array, o * 3);
      const gi = g.index.array; for (let i = 0; i < gi.length; i++) idx[oi + i] = gi[i] + o; o += c; oi += gi.length;
    });
    const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); m.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); m.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    if (hasCol) m.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3)); m.setIndex(new THREE.BufferAttribute(idx, 1)); m.computeBoundingSphere(); return m;
  }
  const skinMat = {};
  const MS = (color, rough, opts) => { const k = color + '|' + (rough || 0.7) + '|' + (opts ? JSON.stringify(opts) : ''); return skinMat[k] || (skinMat[k] = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: rough || 0.7, skinning: true }, opts || {}))); };
  function makeFigure(o) {
    const SKR = skinParts(), root = new THREE.Group();
    const bone = (parent, x, y, z) => { const b = new THREE.Bone(); b.position.set(x, y, z); parent.add(b); return b; };
    const body = new THREE.Bone(); root.add(body);
    const torso = bone(body, 0, JY.torso, 0), headG = bone(torso, 0, 0.69, 0.006), Lh = {}, Rh = {};
    [[-1, Lh], [1, Rh]].forEach(([s, r]) => {
      r.arm = bone(torso, s * 0.215, JY.shoulder - JY.torso, 0); r.elbow = bone(r.arm, 0, -0.285, 0); r.hand = bone(r.elbow, 0, -0.27, 0);
      r.hip = bone(body, s * 0.092, JY.hip, 0); r.knee = bone(r.hip, 0, -0.43, 0); r.ankle = bone(r.knee, 0, -0.39, 0);
    });
    const bones = [body, torso, headG, Lh.arm, Lh.elbow, Lh.hand, Rh.arm, Rh.elbow, Rh.hand, Lh.hip, Lh.knee, Lh.ankle, Rh.hip, Rh.knee, Rh.ankle];
    root.updateMatrixWorld(true);
    const skeleton = new THREE.Skeleton(bones);
    const mx = FM.playerModel && FM.playerModel.ready ? FM.playerModel.make({ shirt: o.shirt, shorts: o.shorts, sock: o.sock, boot: o.boot, skin: o.skin, hair: o.hair, bald: o.style === 'bald' }) : null;
    if (mx) root.add(mx.group);
    const add = (geo, mat, cast) => { if (mx) return null; const m = new THREE.SkinnedMesh(geo, mat); m.castShadow = !!cast; m.frustumCulled = false; root.add(m); root.updateMatrixWorld(true); m.bind(skeleton); return m; };
    add(SKR.skin, MS(o.skin, 0.58), true); add(SKR.shirt, MS(o.shirt, 0.68), true); add(SKR.shorts, MS(o.shorts, 0.72), true); add(SKR.socks, MS(o.sock, 0.8), true); add(SKR.trim, MS(o.trim, 0.65), false); add(SKR.boots, MS(o.boot, 0.42), true);
    add(SKR.face, MS(0xffffff, 0.45, { vertexColors: true }), false);
    if (o.style !== 'bald' && SKR.hair[o.style]) add(SKR.hair[o.style], MS(o.hair, 0.88), true);
    // the number on the back, carried by the trunk
    const num = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ map: numberTexture(o.num, o.numColor), transparent: true })); num.position.set(0, mx ? 0.22 : 0.3, mx ? -0.2 : -0.126); num.rotation.y = Math.PI; torso.add(num);
    // a soft contact shadow so the feet sit on the grass
    if (!matCache.blob) { const c = mkCanvas(64, 64), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 31); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); matCache.blob = new THREE.MeshBasicMaterial({ map: tex(c, false), transparent: true, depthWrite: false }); }
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.85), matCache.blob); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.012; root.add(blob);
    root.scale.set((o.height || 1) * (o.build || 1), o.height || 1, (o.height || 1) * (o.build || 1));
    return { root, body, torso, headG, L: Lh, R: Rh, mx, phase: Math.random() * 6, look: 0, bank: 0, sway: Math.random() * 6 };
  }
  const mix = (a, b, k) => a + (b - a) * k;
  // Standing, walking, jogging, sprinting: one blend. Idle is an athletic stance (knees soft, arms loose, weight shifting), the run leans into its
  // speed and its turns, the arms drive against the legs, the shoulders turn against the hips, and the head stays on the ball.
  // The step-by-step of a leg: the foot is planted on the grass where it lands and stays there (in the world, not on the body) until the body has gone
  // over it; then it swings through to its next landing place, which is half a stride ahead of the body in whatever direction he is moving. Two-bone IK
  // bends the hip and knee to reach it, and the ankle keeps the sole flat. A planted foot cannot skate.
  const TL1 = 0.43, TL2 = 0.39;   // thigh and shin, in figure units
  function legStep(f, key, stanceNow, st, geo, dt) {
    const leg = f.leg[key], hipX = key === 'L' ? -0.092 : 0.092, sc = st.sc, ch = Math.cos(st.hd), sh = Math.sin(st.hd);
    const toLocal = (wx, wz) => { const dx = wx - st.px, dz = wz - st.pz; return { x: (dx * sh - dz * ch) / sc, z: (dx * ch + dz * sh) / sc }; };
    // where a foot would land now: half a stride ahead along the direction of travel, on his own side
    const land = () => { const sp = Math.hypot(st.vx, st.vz), k = sp > 0.15 ? geo.stepLen * 0.5 / sp : 0; return { x: st.px + st.vx * k + sh * hipX * sc * 1.15, z: st.pz + st.vz * k - ch * hipX * sc * 1.15 }; };
    if (!leg.init) { leg.init = true; leg.plant = land(); leg.from = leg.plant; leg.stance = stanceNow; }
    if (stanceNow && !leg.stance) { leg.stance = true; leg.plant = land(); }                       // heel strike
    else if (!stanceNow && leg.stance) { leg.stance = false; leg.from = leg.plant; }                // toe off
    let wx, wz, lift = 0, u = 0, toe = 0;
    const twoPi = Math.PI * 2, ph = ((f.phase % twoPi) + twoPi) % twoPi;
    if (leg.stance) {
      wx = leg.plant.x; wz = leg.plant.z;
      const prog = key === 'L' ? ((ph - Math.PI / 2 + twoPi) % twoPi) / Math.PI : ((ph + Math.PI / 2) % twoPi) / Math.PI;
      toe = 0.65 * smooth(0.6, 1, clamp(prog, 0, 1));
    } else {
      u = key === 'L' ? ((ph + Math.PI / 2) % twoPi) / Math.PI : ((ph - Math.PI / 2 + twoPi) % twoPi) / Math.PI; u = clamp(u, 0, 1);
      const e = smooth(0, 1, u), tgt = land(); wx = leg.from.x + (tgt.x - leg.from.x) * e; wz = leg.from.z + (tgt.z - leg.from.z) * e;
      lift = Math.sin(Math.PI * u) * (0.07 + 0.03 * geo.sp);
      toe = 0.5 * (1 - u) - 0.28 * smooth(0.55, 1, u);
    }
    const lf = toLocal(wx, wz), fy = 0.07 + lift / sc, th = geo.lean;
    // into the body's frame (leaning forward by th, bobbing by body.y)
    const yp = fy - geo.by, zp = lf.z - geo.bz, yc = yp * Math.cos(th) + zp * Math.sin(th), zc = zp * Math.cos(th) - yp * Math.sin(th);
    const dy = yc - 0.89, dz = zc, lx = lf.x - hipX;
    const D = clamp(Math.hypot(dz, dy), 0.3, TL1 + TL2 - 0.002), al = Math.atan2(dz, -dy);
    const th1 = Math.acos(clamp((TL1 * TL1 + D * D - TL2 * TL2) / (2 * TL1 * D), -1, 1)), gam = Math.acos(clamp((TL1 * TL1 + TL2 * TL2 - D * D) / (2 * TL1 * TL2), -1, 1));
    const hipX_ = -(al + th1), kneeX = Math.PI - gam;
    return { hip: hipX_, knee: kneeX, ankle: -(th + hipX_ + kneeX) + toe, abd: clamp(Math.atan2(lx, -dy), -0.5, 0.5) };
  }
  // A small note in the corner of the 3D view saying which movement is in use, so a failure to load the motion-captured clips is never silent.
  let badge = null, badgeT = 0, badgeD = 0;
  function motionBadge() {
    const now = performance.now(); if (now - badgeT < 500 || !host) return; badgeT = now;
    if (!badge || badge.parentElement !== host) { badge = document.createElement('div'); badge.id = 'motionBadge'; badge.style.cssText = 'position:absolute;left:8px;bottom:8px;z-index:5;padding:4px 9px;font:600 11.5px system-ui,sans-serif;border-radius:4px;pointer-events:none;max-width:70%'; host.appendChild(badge); }
    const A = FM.anim; let txt, bad = false, good = false;
    if (!A) { txt = 'Motion capture: animation script did not load. Using basic movement. Try a hard refresh (Ctrl+Shift+R).'; bad = true; }
    else if (A.failed) { txt = 'Motion capture failed to load (' + (A.error || 'unknown error') + '). Using basic movement. Try a hard refresh (Ctrl+Shift+R).'; bad = true; }
    else if (!A.ready) txt = 'Loading motion capture...';
    else { const n = (A.drove || 0) - badgeD; badgeD = A.drove || 0; if (n > 0 || now - (A.droveAt || 0) < 1500) { txt = 'Motion capture on (' + Object.keys(A.clips || {}).length + ' Mixamo clips)'; good = true; } else { txt = 'Motion capture loaded but not driving the players. Using basic movement.'; bad = true; } }
    badge.textContent = txt; badge.style.background = bad ? 'rgba(160,40,30,.92)' : 'rgba(10,20,16,.72)'; badge.style.color = bad ? '#fff' : good ? '#8fe0a8' : '#e8dcb8';
  }
  function animate(f, st, dt, t) {
    if (FM.anim && FM.anim.ready && st.e) { FM.anim.step(f, st, dt, t); return; }   // the motion-captured clips, if they loaded
    // Stepping is tied to ground covered: each step is as long as the speed needs (a walk is short steps, a sprint long ones), so the feet are not left
    // sliding. Each player has his own stride, so a team does not run in step.
    const vf = st.vf, vs = st.vs, sp = Math.hypot(vf, vs), spg = Math.max(sp, clamp(Math.abs(st.turn) * 0.28, 0, 1.2));   // turning on the spot shuffles the feet
    const run = smooth(0.12, 1.1, spg), sK = f.strideK || 1;
    const stepLen = clamp(0.42 + 0.14 * spg, 0.45, 1.55) * sK;
    if (spg > 0.12) f.phase += dt * Math.PI * spg / stepLen;
    const s = Math.sin(f.phase), c = Math.cos(f.phase), sw = Math.sin(t * 0.7 + f.sway);
    const fwdF = sp > 0.05 ? Math.abs(vf) / sp : 1, sideF = 1 - fwdF, dirS = vf >= 0 ? 1 : -1, latS = vs >= 0 ? 1 : -1;
    const brake = clamp(-st.accel - 1, 0, 6), launch = clamp(st.accel - 1, 0, 6), ikW = 1 - smooth(3.6, 5.2, spg);
    // trunk: lean into speed and into a push-off, back when braking, bank into a turn, shoulders twist against the hips
    const lean = (0.02 + clamp(0.03 * sp, 0, 0.27)) * fwdF * dirS + (dirS < 0 ? -0.03 : 0) + launch * 0.022 - brake * 0.024;
    f.bank += (clamp(-st.turn * 0.06, -0.3, 0.3) * Math.min(sp / 4, 1) - f.bank) * Math.min(1, dt * 8);
    const bob = Math.abs(c) * clamp(0.011 * spg, 0, 0.05) * run;
    // the hips drop as far as a long stride needs, so the planted foot can reach
    const dzMax = clamp(stepLen * 0.5 / st.sc, 0, 0.6);
    const reachDrop = Math.max(0, (TL1 + TL2) - Math.sqrt(Math.max(0.05, (TL1 + TL2) * (TL1 + TL2) - dzMax * dzMax))), by = bob - (0.03 + reachDrop * 1.1 * ikW) * run + Math.sin(t * 1.7 + f.phase) * 0.004 * (1 - run) - brake * 0.012 - 0.02 * (1 - run);
    f.body.rotation.x = lean; f.body.rotation.z = f.bank + s * clamp(0.006 * spg, 0, 0.035) * run; f.body.rotation.y = s * clamp(0.025 * spg, 0, 0.13) * run;
    f.body.position.set(0.015 * sw * (1 - run) + s * 0.012 * run, by, 0);
    // legs: planted feet and IK for walking and jogging, swung legs for a sprint, blended in between
    const Asw = Math.asin(clamp(stepLen / 1.7, 0, 0.92)) * (vf >= 0 ? 1 : 0.62) * (0.4 + 0.6 * fwdF), Bsw = 0.46 * sideF * Math.min(sp / 2.2, 1);
    const kBase = clamp(0.35 + 0.2 * spg, 0.35, 1.45) * (0.45 + 0.55 * fwdF), kL = Math.max(0, Math.sin(f.phase + 1.6)) * kBase + 0.06 + brake * 0.05, kR = Math.max(0, Math.sin(f.phase + 1.6 + Math.PI)) * kBase + 0.06 + brake * 0.05;
    const sin_ = { Lh: -s * Asw * dirS, Rh: s * Asw * dirS, Lk: kL, Rk: kR, Lz: 0.03 + latS * Bsw * Math.max(0, -s), Rz: -0.03 + latS * Bsw * Math.max(0, s), La: 0.35 * Math.sin(f.phase + 0.8) - 0.08, Ra: -0.35 * Math.sin(f.phase + 0.8) - 0.08 };
    let LH = sin_.Lh, RH = sin_.Rh, LK = sin_.Lk, RK = sin_.Rk, LZ = sin_.Lz, RZ = sin_.Rz, LA = sin_.La, RA = sin_.Ra;
    if (!f.leg) f.leg = { L: {}, R: {} };
    const geo = { stepLen: stepLen, sp: spg, lean, by, bz: 0 };
    if (run > 0.04 && st.sc && ikW > 0.01) {
      const L_ = legStep(f, 'L', c < 0, st, geo, dt), R_ = legStep(f, 'R', c >= 0, st, geo, dt), kb = brake * 0.05;
      LH = mix(LH, L_.hip, ikW); RH = mix(RH, R_.hip, ikW); LK = mix(LK, L_.knee + kb, ikW); RK = mix(RK, R_.knee + kb, ikW); LZ = mix(LZ, L_.abd, ikW); RZ = mix(RZ, R_.abd, ikW); LA = mix(LA, L_.ankle, ikW); RA = mix(RA, R_.ankle, ikW);
    } else if (f.leg.L.init) { f.leg.L.init = false; f.leg.R.init = false; }
    f.L.hip.rotation.x = mix(0.07 + 0.02 * sw, LH, run); f.R.hip.rotation.x = mix(-0.03 - 0.02 * sw, RH, run);
    f.L.knee.rotation.x = mix(0.14, LK, run); f.R.knee.rotation.x = mix(0.1, RK, run);
    f.L.hip.rotation.z = mix(0.05, LZ, run); f.R.hip.rotation.z = mix(-0.05, RZ, run);
    f.L.ankle.rotation.x = LA * run; f.R.ankle.rotation.x = RA * run;
    // arms
    const swing = clamp(0.12 + 0.1 * spg, 0.12, 0.88) * (0.4 + 0.6 * fwdF);
    f.L.arm.rotation.x = mix(0.12 + 0.03 * sw, s * swing * dirS, run); f.R.arm.rotation.x = mix(0.12 - 0.03 * sw, -s * swing * dirS, run);
    f.L.arm.rotation.z = mix(0.1, 0.05 + 0.1 * sideF, run); f.R.arm.rotation.z = mix(-0.1, -0.05 - 0.1 * sideF, run);
    const bend = mix(0.35, clamp(0.3 + 0.07 * spg * 5, 0.5, 1.25), run);
    f.L.elbow.rotation.x = -(bend + 0.1 * Math.max(0, -s) * run); f.R.elbow.rotation.x = -(bend + 0.1 * Math.max(0, s) * run);
    f.L.hand.rotation.x = -0.25 * run; f.R.hand.rotation.x = -0.25 * run;
    f.torso.rotation.y = -s * clamp(0.045 * spg, 0, 0.22) * run; f.torso.rotation.z = -f.bank * 0.4; f.torso.rotation.x = 0;
    f.body.scale.y = 1;
    // head: on the ball within what a neck allows, with now and then a glance away when standing
    f.look += (clamp(st.look, -1.25, 1.25) - f.look) * Math.min(1, dt * 9);
    const scan = Math.sin(t * 0.45 + f.sway * 2) * Math.max(0, Math.sin(t * 0.13 + f.sway)) * 0.32 * (1 - run);
    f.headG.rotation.y = -f.look + scan + s * 0.025 * run; f.headG.rotation.x = -lean * 0.8 + 0.04; f.headG.rotation.z = 0;
  }
  const ease = (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 2);
  function applyPose(f, type, t, dur, dir) {
    const k = Math.min(1, t / dur), s = Math.sin(Math.PI * k), e = Math.min(1, k * 3);
    if (type === 'kick') {
      // plant, wind up, strike through the ball, follow through; with the left foot for a left-footed player
      const Kf = dir < 0 ? f.L : f.R, Pf = dir < 0 ? f.R : f.L, sg = dir < 0 ? -1 : 1;
      const kk = Math.min(1, t / 0.42), back = kk < 0.3 ? kk / 0.3 : 1 - Math.min(1, (kk - 0.3) / 0.12), strike = kk < 0.3 ? 0 : Math.min(1, (kk - 0.3) / 0.16), fol = kk < 0.46 ? 0 : Math.min(1, (kk - 0.46) / 0.54);
      Kf.hip.rotation.x = 0.85 * back - 1.35 * strike * (1 - 0.35 * fol); Kf.knee.rotation.x = 1.5 * back * (1 - strike) + 0.12 + 0.5 * fol;
      Pf.knee.rotation.x = 0.32; Pf.hip.rotation.x = 0.1; f.torso.rotation.y = -0.4 * sg * Math.sin(Math.PI * Math.min(1, kk * 1.2));
      f.body.rotation.x = -0.05 + 0.1 * strike; f.L.arm.rotation.z = 0.7 * s; f.R.arm.rotation.z = -0.55 * s; f.L.arm.rotation.x = -0.4 * s; f.R.arm.rotation.x = 0.3 * s;
    } else if (type === 'touch') {
      // a dribbling touch: the nearer foot swings out and through the ball and comes back
      const Kf = dir < 0 ? f.L : f.R, h = Math.sin(Math.PI * Math.min(1, k));
      Kf.hip.rotation.x = -0.5 * h; Kf.knee.rotation.x = 0.1 + 0.4 * (1 - h) * h * 2; f.body.rotation.x += 0.04 * h;
    } else if (type === 'control') {
      // a cushioned first touch: the foot goes out to meet the ball and gives with it, the head drops to watch it, the arms balance
      const Kf = dir < 0 ? f.L : f.R, Pf = dir < 0 ? f.R : f.L, h = Math.sin(Math.PI * Math.min(1, k * 1.15));
      Kf.hip.rotation.x = -0.6 * h; Kf.knee.rotation.x = 0.5 * h + 0.1; Pf.knee.rotation.x += 0.25 * h; f.body.rotation.x -= 0.06 * h; f.headG.rotation.x += 0.28 * h;
      f.L.arm.rotation.z = 0.35 * h; f.R.arm.rotation.z = -0.35 * h; f.body.position.y -= 0.03 * h;
    } else if (type === 'tackle') {
      f.R.hip.rotation.x = -1.0 * s; f.R.knee.rotation.x = 0.15; f.L.knee.rotation.x = 0.55 * s + 0.1; f.body.rotation.x = 0.28 * s; f.body.position.y -= 0.06 * s; f.L.arm.rotation.z = 0.6 * s; f.R.arm.rotation.z = -0.6 * s;
    } else if (type === 'slide') {
      const down = e, up = k > 0.78 ? (k - 0.78) / 0.22 : 0, g = down * (1 - up);
      f.body.position.y = -0.46 * g + 0.02; f.body.position.z = 1.5 * ease(k); f.body.rotation.x = -1.25 * g; f.R.hip.rotation.x = -1.45 * g; f.R.knee.rotation.x = 0.05; f.L.hip.rotation.x = -0.35 * g; f.L.knee.rotation.x = 1.7 * g;
      f.L.arm.rotation.z = 1.0 * g; f.R.arm.rotation.z = -1.0 * g; f.L.arm.rotation.x = -0.6 * g; f.R.arm.rotation.x = -0.6 * g;
    } else if (type === 'challenge') {
      // a shoulder-to-shoulder contest: low, wide, leaning into the other man, arms tucked
      f.body.rotation.z += dir * 0.22 * s; f.torso.rotation.y += dir * 0.45 * s; f.body.rotation.x += 0.12 * s; f.body.position.y -= 0.05 * s;
      f.L.hip.rotation.z = 0.2 * s; f.R.hip.rotation.z = -0.2 * s; f.L.knee.rotation.x += 0.35 * s; f.R.knee.rotation.x += 0.35 * s;
      f.L.arm.rotation.z = 0.5 * s; f.R.arm.rotation.z = -0.5 * s; f.L.elbow.rotation.x = -1.2 * s; f.R.elbow.rotation.x = -1.2 * s;
    } else if (type === 'dive') { const ex = k < 0.75 ? e : Math.max(0, 1 - (k - 0.75) / 0.25); f.body.rotation.z = dir * -1.35 * ex; f.body.position.y = 0.5 * s + 0.1 * ex; f.L.arm.rotation.x = -2.7 * ex; f.R.arm.rotation.x = -2.7 * ex; f.L.hip.rotation.x = 0.35 * ex; f.R.hip.rotation.x = -0.45 * ex; }
    else if (type === 'fall') { const ex = k < 0.55 ? Math.min(1, k * 5) : Math.max(0, 1 - (k - 0.55) / 0.45); f.body.rotation.x = -1.28 * ex; f.body.position.y = 0.04; f.L.arm.rotation.x = -1.4 * ex; f.R.arm.rotation.x = -1.4 * ex; }
    else if (type === 'stumble') { f.body.rotation.x += 0.4 * s; f.torso.rotation.y += 0.3 * s * dir; f.L.arm.rotation.z = 0.95 * s; f.R.arm.rotation.z = -0.95 * s; f.L.knee.rotation.x += 0.5 * s; }
    else if (type === 'celebrate') { f.L.arm.rotation.x = -2.9; f.R.arm.rotation.x = -2.9; f.L.arm.rotation.z = 0.25; f.R.arm.rotation.z = -0.25; f.body.position.y = Math.abs(Math.sin(t * 9)) * 0.12; f.headG.rotation.x = -0.25; }
    else if (type === 'header') {
      // a standing jump: crouch, drive up, arch back and snap the head through the ball, land with the knees bending to take it
      const crouch = k < 0.22 ? Math.sin(Math.PI * k / 0.22 * 0.5) : 0, air = k >= 0.18 && k < 0.78 ? Math.sin(Math.PI * (k - 0.18) / 0.6) : 0, land = k >= 0.78 ? Math.sin(Math.PI * (k - 0.78) / 0.22) : 0, snap = k > 0.4 && k < 0.62 ? Math.sin(Math.PI * (k - 0.4) / 0.22) : 0;
      f.body.position.y = -0.1 * crouch + 0.42 * air - 0.1 * land; f.body.rotation.x = 0.1 * crouch - 0.35 * air + 0.55 * snap + 0.1 * land;
      f.L.knee.rotation.x = 0.9 * crouch + 0.5 * air + 0.8 * land; f.R.knee.rotation.x = 0.9 * crouch + 0.6 * air + 0.8 * land; f.L.hip.rotation.x = -0.5 * crouch - 0.3 * air - 0.5 * land; f.R.hip.rotation.x = -0.5 * crouch - 0.1 * air - 0.5 * land;
      f.L.arm.rotation.x = -0.4 - 0.8 * air; f.R.arm.rotation.x = -0.4 - 0.8 * air; f.L.arm.rotation.z = 0.5 * air; f.R.arm.rotation.z = -0.5 * air; f.headG.rotation.x = -0.25 * air + 0.5 * snap;
    }
  }

  // ---------------------------------------------------------------- building the scene
  function build() {
    GEO = {
      thighU: new THREE.CylinderGeometry(0.083, 0.07, 0.22, 12), thighL: new THREE.CylinderGeometry(0.07, 0.056, 0.2, 12), shin: new THREE.CylinderGeometry(0.052, 0.04, 0.4, 12), boot: new THREE.BoxGeometry(0.1, 0.07, 0.27),
      upper: new THREE.CylinderGeometry(0.054, 0.047, 0.29, 10), fore: new THREE.CylinderGeometry(0.044, 0.036, 0.26, 10), sph: new THREE.SphereGeometry(1, 16, 12), torso: new THREE.CylinderGeometry(0.205, 0.165, 0.56, 16), shorts: new THREE.CylinderGeometry(0.175, 0.19, 0.2, 16), neck: new THREE.CylinderGeometry(0.045, 0.052, 0.1, 10), cuff: new THREE.CylinderGeometry(0.057, 0.057, 0.05, 12),
    };
    try { renderer = new THREE.WebGLRenderer({ antialias: true }); } catch (e1) { renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' }); }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.97;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; host.appendChild(renderer.domElement); renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x0a100d); scene.fog = new THREE.Fog(0x16222a, 150, 330);
    // an evening sky behind the stands: deep blue overhead, a glow of floodlight at the rim, so the ground is not floating in a black void
    { const c = mkCanvas(8, 256), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#060d1c'); gr.addColorStop(0.45, '#0d2236'); gr.addColorStop(0.8, '#2a4a58'); gr.addColorStop(1, '#4d6f78'); g.fillStyle = gr; g.fillRect(0, 0, 8, 256);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(420, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex(c, true), side: THREE.BackSide, fog: false, depthWrite: false })); dome.scale.y = 0.55; dome.position.y = -8; dome.rotation.y = 0; scene.add(dome); }
    camera = new THREE.PerspectiveCamera(46, 1.7, 0.5, 600);
    scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x1d3b24, 0.5));
    sun = new THREE.DirectionalLight(0xfff1d6, 1.0); sun.position.set(-30, 70, 46); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera; sc.left = -62; sc.right = 62; sc.top = 40; sc.bottom = -40; sc.near = 10; sc.far = 220; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; scene.add(sun); scene.add(sun.target);
    const pt = pitchTexture(); const pitch = new THREE.Mesh(new THREE.PlaneGeometry(pt.w, pt.h), new THREE.MeshStandardMaterial({ map: pt.t, roughness: 0.95 })); pitch.rotation.x = -Math.PI / 2; pitch.receiveShadow = true; scene.add(pitch);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: 0x0d1511, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.03; scene.add(ground);
    const nc = mkCanvas(128, 128), ng = nc.getContext('2d'); ng.strokeStyle = 'rgba(250,250,244,.95)'; ng.lineWidth = 8; ng.beginPath(); ng.moveTo(0, 0); ng.lineTo(128, 0); ng.moveTo(0, 0); ng.lineTo(0, 128); ng.stroke(); NETTEX = tex(nc); NETTEX.wrapS = NETTEX.wrapT = THREE.RepeatWrapping;
    scene.add(goal(-1)); scene.add(goal(1));
    [[-HL, -HW], [-HL, HW], [HL, -HW], [HL, HW]].forEach((c) => { const g = new THREE.Group(), p = cyl(0.015, 1.5, new THREE.MeshStandardMaterial({ color: 0xf0d34a })); p.position.y = 0.75; g.add(p); const f = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.3), new THREE.MeshStandardMaterial({ color: 0xe2584a, side: THREE.DoubleSide })); f.position.set(0.21, 1.34, 0); g.add(f); g.position.set(c[0], 0, c[1]); scene.add(g); });
    const cc = mkCanvas(512, 128), cg = cc.getContext('2d'); cg.fillStyle = '#1a231f'; cg.fillRect(0, 0, 512, 128);
    const cols = ['#3b4b43', '#5a4a3d', '#2f4157', '#6e5e3f', '#4b3135', '#25342d', '#7c8c84', '#40594a'];
    for (let i = 0; i < 3000; i++) { cg.fillStyle = cols[(Math.random() * cols.length) | 0]; cg.globalAlpha = 0.5 + Math.random() * 0.45; const x = Math.random() * 512, y = Math.random() * 128; cg.beginPath(); cg.arc(x, y - 2, 2.1, 0, 6.3); cg.fill(); cg.fillRect(x - 2.6, y, 5.2, 3.4); }
    CROWD = tex(cc); CROWD.wrapS = CROWD.wrapT = THREE.RepeatWrapping;
    const near = stand(L + 26, HW + 7), far = stand(L + 26, HW + 7), r = stand(W + 30, HL + 12), l = stand(W + 30, HL + 12);
    far.rotation.y = Math.PI; r.rotation.y = Math.PI / 2; l.rotation.y = -Math.PI / 2; r.scale.y = 0.7; l.scale.y = 0.7; scene.add(near, far, r, l);
    const bc = mkCanvas(1024, 64), bg = bc.getContext('2d'); bg.fillStyle = '#0f1b15'; bg.fillRect(0, 0, 1024, 64); bg.fillStyle = '#e8dcb4'; bg.font = '800 30px Helvetica, Arial, sans-serif'; bg.textBaseline = 'middle';
    for (let i = 0; i < 3; i++) { bg.fillText('LASTMIND FOOTBALL', 30 + i * 340, 34); bg.fillStyle = '#deb862'; bg.fillRect(i * 340 + 6, 28, 12, 12); bg.fillStyle = '#e8dcb4'; }
    BOARD = tex(bc); BOARD.wrapS = THREE.RepeatWrapping;
    const board = (len, x, z, ry) => { const t = BOARD.clone(); t.needsUpdate = true; t.wrapS = THREE.RepeatWrapping; t.repeat.set(len / 34, 1); const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.9, 0.12), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, emissive: 0x16241c, emissiveIntensity: 0.5 })); m.position.set(x, 0.45, z); m.rotation.y = ry; scene.add(m); };
    board(L + 8, 0, HW + 3.4, 0); board(L + 8, 0, -HW - 3.4, Math.PI); board(W + 6, HL + 4.2, 0, -Math.PI / 2); board(W + 6, -HL - 4.2, 0, Math.PI / 2);
    [[-74, -52], [74, -52], [-74, 52], [74, 52]].forEach((p) => { const pole = cyl(0.5, 30, new THREE.MeshStandardMaterial({ color: 0x28332d })); pole.position.set(p[0], 15, p[1]); scene.add(pole); const head = new THREE.Mesh(new THREE.BoxGeometry(7, 3.2, 1), new THREE.MeshStandardMaterial({ color: 0xfff6dc, emissive: 0xfff0c8, emissiveIntensity: 1.2 })); head.position.set(p[0], 30.4, p[1]); head.lookAt(0, 20, 0); scene.add(head); });
    ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.115, 24, 16), new THREE.MeshStandardMaterial({ map: ballTexture(), roughness: 0.45 })); ballMesh.castShadow = true; scene.add(ballMesh);
    ballRing = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.42, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide })); ballRing.rotation.x = -Math.PI / 2; scene.add(ballRing);
    ready = true;
  }
  function ballTexture() {
    const c = mkCanvas(512, 256), g = c.getContext('2d'); g.fillStyle = '#f4f4ee'; g.fillRect(0, 0, 512, 256); g.fillStyle = '#17191b';
    const pent = (lon, lat) => { const cx = (lon / 360 + 0.5) * 512, cy = (0.5 - lat / 180) * 256, sx = 1 / Math.max(0.35, Math.cos(lat * Math.PI / 180)); g.beginPath(); for (let i = 0; i < 5; i++) { const a = i * 1.2566 - 1.5708; g.lineTo(cx + Math.cos(a) * 24 * sx, cy + Math.sin(a) * 24); } g.closePath(); g.fill(); };
    pent(0, 90); pent(0, -90); for (let k = 0; k < 5; k++) { pent(-180 + k * 72 + 36, 30); pent(-180 + k * 72, -30); } return tex(c);
  }

  // ---------------------------------------------------------------- the match, drawn
  function kitOf(team, gk) {
    const k = team.kit || { shirt: '#244', number: '#fff' };
    if (gk) return { shirt: new THREE.Color(0xf08a24).getHex(), sleeve: 0xf08a24, trim: 0x2a2018, shorts: 0x2a2018, sock: 0x2a2018, boot: 0x131313, numColor: '#fff6e8' };
    const sh = new THREE.Color(k.shirt).getHex(), nm = new THREE.Color(k.number).getHex();
    const light = new THREE.Color(k.shirt).getHSL({}).l > 0.55;
    return { shirt: sh, sleeve: sh, trim: nm, shorts: light ? 0x2b2f33 : 0xf1efe6, sock: sh, boot: light ? 0x131313 : 0x1a1a1a, numColor: k.number };
  }
  function ensurePlayers(m) {
    const seen = new Set();
    m.teams.forEach((team, ti) => team.players.forEach((p, i) => {
      seen.add(p.id); let e = players.get(p.id);
      if (!e || e.kitKey !== (team.kit && team.kit.shirt) + (p.group === 'GK')) {
        if (e) scene.remove(e.fig.root);
        const kit = kitOf(team, p.group === 'GK'), h = (p.number * 37) % 9;
        const fig = makeFigure({ ...kit, num: p.number, skin: SKIN[(p.number * 5 + ti * 2) % SKIN.length], hair: HAIR[(p.number * 3 + ti) % HAIR.length], style: STYLE[(p.number * 7 + ti * 3) % 8], height: 0.96 + h / 100, build: 0.95 + ((p.number * 13) % 7) / 55 });
        fig.strideK = 0.93 + ((p.number * 29) % 13) / 100; e = { fig, team, p, pose: null, speed: 0, vx: 0, vz: 0, hd: null, wasC: false, foot: (p.number * 7) % 4 === 0 ? -1 : 1, turn: 0, accel: 0, lastF: null, lastSp: 0, kitKey: (team.kit && team.kit.shirt) + (p.group === 'GK') }; players.set(p.id, e); scene.add(fig.root);
      }
      e.team = team; e.p = p; e.fig.root.visible = true;
    }));
    players.forEach((e, id) => { if (!seen.has(id)) e.fig.root.visible = false; });
  }
  const findBy = (m, teamId, number) => { const t = m.teams.find((x) => x.id === teamId); const p = t && t.players.find((q) => q.number === number); return p ? players.get(p.id) : null; };
  // ---------- replays ----------
  // Every frame that is drawn is also kept (where each man and the ball were, which way he faced) for the last twenty seconds, together with the kicks, tackles and
  // the net bulging; after a goal and its celebration the seconds before it are drawn again, slower, from a lower camera, with a REPLAY label on the pitch.
  const REC_KEEP = 24, REPLAY_SPEED = 0.7, PRE = 7, POST = 1.6;
  let recT = 0, recLast = -1, recIds = null, goalMark = null, rp = null, replayBox = null, snapCam = false;
  const recBuf = [], recLog = [];
  function logAct(o) { o.t = o.t == null ? recT : o.t; recLog.push(o); while (recLog.length && recLog[0].t < recT - REC_KEEP - 2) recLog.shift(); }
  function idOf(e) { let id = null; players.forEach((v, k) => { if (v === e) id = k; }); return id; }
  function recordFrame(m, ctx, bx, by, bz) {
    if (recT - recLast < 1 / 30) return; recLast = recT;
    const ids = []; m.teams.forEach((t) => t.players.forEach((p) => ids.push(p)));
    const f = { t: recT, b: [bx, by, bz], ids: recIds, d: new Float32Array(ids.length * 3) };
    ids.forEach((p, i) => { const rpos = (ctx && ctx.renderPos && ctx.renderPos.get(p.id)) || { x: p.x, y: p.y, facing: p.facing || 0 }; f.d[i * 3] = rpos.x; f.d[i * 3 + 1] = rpos.y; f.d[i * 3 + 2] = Number.isFinite(rpos.facing) ? rpos.facing : 0; });
    f.ids = ids.map((p) => p.id); recBuf.push(f);
    while (recBuf.length && recBuf[0].t < recT - REC_KEEP) recBuf.shift();
  }
  function replayBoxEl() {
    if (replayBox && replayBox.parentElement === host) return replayBox;
    replayBox = document.createElement('div'); replayBox.id = 'replayBox';
    replayBox.style.cssText = 'position:absolute;left:12px;top:12px;z-index:6;display:flex;gap:8px;align-items:center;pointer-events:none';
    replayBox.innerHTML = '<span style="background:#d62828;color:#fff;font:800 15px system-ui,sans-serif;letter-spacing:.14em;padding:6px 14px;border-radius:3px;box-shadow:0 2px 8px rgba(0,0,0,.4)"><i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#fff;margin-right:9px;animation:rpl 1s infinite"></i>REPLAY</span><span style="background:rgba(10,20,16,.72);color:#e8dcb8;font:600 12px system-ui,sans-serif;padding:5px 9px;border-radius:3px">0.7x</span><button type="button" id="replaySkip" style="pointer-events:auto;cursor:pointer;background:rgba(10,20,16,.78);color:#fff;border:1px solid rgba(255,255,255,.35);font:600 12px system-ui,sans-serif;padding:5px 11px;border-radius:3px">Skip replay</button><style>@keyframes rpl{50%{opacity:.25}}</style>';
    host.appendChild(replayBox); return replayBox;
  }
  function startReplay(m) {
    const t1 = (goalMark == null ? recT : goalMark) + POST, t0 = (goalMark == null ? recT : goalMark) - PRE, frames = recBuf.filter((f) => f.t >= t0 && f.t <= t1 + 0.05);
    if (frames.length < 6) { m.replayDone = true; return; }
    rp = { m, frames, t: frames[0].t, end: frames[frames.length - 1].t, log: recLog.filter((o) => o.t >= frames[0].t && o.t <= t1).slice(), li: 0, lastT: null };
    goalFx = null; snapCam = true; replayBoxEl().style.display = 'flex'; const sk = replayBox.querySelector('#replaySkip'); if (sk) sk.onclick = () => { m.replayDone = true; };
  }
  function stopReplay(m) { rp = null; snapCam = true; if (replayBox) replayBox.style.display = 'none'; m.replayDone = true; goalMark = null; recBuf.length = 0; recLog.length = 0; }
  // the frame to draw at replay time t, as the renderPos map and ball the live code expects
  function replayAt(r) {
    const fr = r.frames; let k = 0; while (k < fr.length - 2 && fr[k + 1].t <= r.t) k++;
    const a = fr[k], b = fr[Math.min(k + 1, fr.length - 1)], u = b.t > a.t ? clamp((r.t - a.t) / (b.t - a.t), 0, 1) : 0, pos = new Map();
    a.ids.forEach((id, i) => { const j = b.ids === a.ids ? i : b.ids.indexOf(id); let fa = a.d[i * 3 + 2], fb = j >= 0 ? b.d[j * 3 + 2] : fa; const dA = Math.atan2(Math.sin(fb - fa), Math.cos(fb - fa)); pos.set(id, { x: a.d[i * 3] + ((j >= 0 ? b.d[j * 3] : a.d[i * 3]) - a.d[i * 3]) * u, y: a.d[i * 3 + 1] + ((j >= 0 ? b.d[j * 3 + 1] : a.d[i * 3 + 1]) - a.d[i * 3 + 1]) * u, facing: fa + dA * u }); });
    return { pos, ball: [a.b[0] + (b.b[0] - a.b[0]) * u, a.b[1] + (b.b[1] - a.b[1]) * u, a.b[2] + (b.b[2] - a.b[2]) * u] };
  }

  function setPose(e, type, dur, dir) {
    if (!e) return;
    if (!rp) { const id = idOf(e); if (id) logAct({ id, pose: type, dur, dir }); }
    if (FM.anim && FM.anim.ready) {
      if (type === 'kick') { if (e.kickAt && performance.now() - e.kickAt < 1200) return; if (FM.anim.kick(e, 0.12, {})) { const id = idOf(e); if (id && !rp) logAct({ id, kick: 1, t: recT - 0.0, rem: 0.12 }); return; } }
      else if (type === 'dive') { if (FM.anim.dive(e, dir)) return; }
      else if (type !== 'celebrate' && FM.anim.trigger(e, type, dir)) return;
    }
    e.pose = { type, t: 0, dur, dir: dir || 1 };
  }
  function readEvents(m) {
    const ev = m.events; if (!ev || !ev.length) { lastEv = 0; lastEvLen = 0; return; }
    if (ev.length < lastEvLen || ev[ev.length - 1].t < lastEv - 5) { lastEv = ev[ev.length - 1].t; lastEvLen = ev.length; return; }
    for (let i = Math.max(0, ev.length - 12); i < ev.length; i++) {
      const e = ev[i]; if (e.t <= lastEv || e.t < m.clock - 8) continue;
      const k = e.type; if (k === 'pass' || k === 'shot' || k === 'cross') { const ke = findBy(m, e.team, e.from || e.player); setPose(ke, 'kick', 0.42, ke ? ke.foot : 1); }
      if (k === 'shot') { const shooterT = m.teams.find((t) => t.id === e.team), def = m.teams.find((t) => t.id !== e.team), gk = def && def.players.find((p) => p.group === 'GK'), ge = gk && players.get(gk.id); if (ge && (e.outcome === 'saved' || e.outcome === 'goal')) { const lat = (e.ey != null ? e.ey : m.ball.y) - gk.y; setPose(ge, 'dive', 0.9, lat >= 0 ? -1 : 1); } void shooterT; }
      if (k === 'tackle') {
        // a scrap is shoulder to shoulder; a man at speed may go to ground for it; otherwise a standing challenge. The loser of it stumbles.
        const te = findBy(m, e.team, e.player), vt = m.teams.find((t) => t.id !== e.team), ve = vt && findBy(m, vt.id, e.vs), side = e.player % 2 ? 1 : -1;
        const slide = !!te && !!e.slide;
        setPose(te, e.duel ? 'challenge' : slide ? 'slide' : 'tackle', slide ? 0.95 : e.duel ? 0.7 : 0.55, side);
        if (ve) setPose(ve, e.ok ? 'stumble' : 'challenge', 0.7, -side);
      }
      if (k === 'shot' && e.setPiece === 'header') setPose(findBy(m, e.team, e.player), 'header', 0.85);
      if (k === 'clearance' && e.x == null) setPose(findBy(m, e.team, e.player), 'header', 0.85);   // a defender heading a cross away
      if (k === 'foul') { const vt = m.teams.find((t) => t.id !== e.team); if (vt) setPose(findBy(m, vt.id, e.vs), 'fall', 1.1); }
      if (k === 'goal') { const dir = (m.teams.find((t) => t.id === e.team) || {}).attackDir || 1; setPose(findBy(m, e.team, e.player), 'celebrate', 1.8); goalFx = { side: dir, t: 0, y: 0.5 + Math.random() * 0.8, z: clamp(m.ball.y - HH(), -3.2, 3.2), hit: false }; }
    }
    lastEv = ev[ev.length - 1].t; lastEvLen = ev.length;
  }
  const HH = () => HW;

  // the ball: on the grass, or in the air for a lofted pass, a cross or a shot; and into the net after a goal
  function ballHeight(m, bx, bz) {
    const f = m.flight;
    if (!f || m.ball.state === 'carried') { flightRec = null; return 0.115; }
    if (!flightRec || flightRec.f !== f) flightRec = { f, sx: bx, sz: bz };
    const ex = f.ex - HL, ez = f.ey - HW, tot = Math.hypot(ex - flightRec.sx, ez - flightRec.sz) || 1, done = Math.hypot(bx - flightRec.sx, bz - flightRec.sz), p = clamp(done / tot, 0, 1);
    if (f.kind === 'cross') return 0.2 + 5.2 * 4 * p * (1 - p) * clamp(tot / 28, 0.5, 1);
    if (f.kind === 'pass' && tot > 26) return 0.2 + Math.min(4, tot * 0.09) * 4 * p * (1 - p);
    if (f.kind === 'shot') return 0.3 + 1.1 * Math.sin(Math.PI * p) + 0.4 * p;
    return 0.115;
  }

  function size() {
    if (!host || !renderer) return; const w = host.clientWidth || 800, h = host.clientHeight || 450; renderer.setSize(w, h, false);
    camera.aspect = w / h; const hfov = (mode === "stands" ? 44 : 74) * Math.PI / 180; camera.fov = 2 * Math.atan(Math.tan(hfov / 2) / camera.aspect) * 180 / Math.PI; camera.updateProjectionMatrix();
  }
  function setCamera(dt, bx, bz, snap, spc) {
    const k = snap ? 1 : 1 - Math.exp(-dt * (spc ? 3.6 : mode === 'stands' ? 3.4 : 2.6));
    let tx, tz, cx, cy, cz, ty = 0.8;
    if (spc && !rp) {
      // a set piece (corner, penalty, free kick): the camera goes behind the taker, looking along the ball towards the goal, so the taker, the ball and the box are all in the picture
      const dx = spc.gx - bx, dz = -bz, len = Math.hypot(dx, dz) || 1, ux = dx / len, uz = dz / len, back = spc.kind === 'corner' ? 11 : spc.kind === 'penalty' ? 10 : 13;
      cx = clamp(bx - ux * back, -HL - 5, HL + 5); cz = clamp(bz - uz * back, -HW - 8, HW + 8); cy = spc.kind === 'penalty' ? 2.5 : 4; tx = bx + ux * Math.min(len * 0.55, 12); tz = bz + uz * Math.min(len * 0.55, 12); ty = 1.0;
    } else if (rp) {
      // a replay: low and close on the touchline, with the ball well in the picture
      tx = clamp(bx, -HL + 4, HL - 4); tz = bz * 0.5; cx = tx * 0.95 - 4; cy = 3.4; cz = HW + 3.2 + 4 * clamp(bz / 28, 0, 1); ty = 0.9;
    } else if (mode === 'stands') {
      // from the middle of the main stand, higher up: the whole width of the pitch and a long stretch of it, so the shape of both teams can be read
      tx = clamp(bx, -HL + 12, HL - 12); tz = clamp(bz * 0.55, -16, 16); cx = tx * 0.92; cy = 21; cz = HW + 13; ty = 0.4;
    } else {
      // from the touchline, where the manager stands: a steady wide view that slides along the line with the ball
      // It follows the ball all the way to the corner flags. With the ball on the near touchline the camera rises and backs off a little and looks at it,
      // otherwise the ball would be below the bottom of the picture.
      const near = clamp((bz - 6) / 22, 0, 1);
      tx = clamp(bx, -HL + 2, HL - 2); tz = (bz * 0.25 - 6) * (1 - near) + bz * 0.85 * near; cx = tx * 0.9; cy = 4.2 + 4.8 * near; cz = HW + 5.5 + 3.5 * near; ty = 0.7;
      // with the ball on the far side of the pitch the camera comes in across the touchline, higher, so it is not a speck 70 metres away
      { const far = clamp((-bz - 12) / 22, 0, 1); cz -= 15 * far; cy += 2.2 * far; tz = tz * (1 - far) + (bz * 0.7) * far; }
    }
    look.x += (tx - look.x) * k; look.z += (tz - look.z) * k; cam.x += (cx - cam.x) * k; cam.y += (cy - cam.y) * k; cam.z += (cz - cam.z) * k;
    camera.position.set(cam.x, cam.y, cam.z); camera.lookAt(look.x, ty, look.z);
    if (FM.view3d && FM.view3d.debugCam) { const d = FM.view3d.debugCam; camera.position.set(d.x, d.y, d.z); camera.lookAt(d.lx, d.ly, d.lz); }   // a fixed camera for looking at one thing
    sun.position.set(look.x - 30, 70, look.z + 46); sun.target.position.set(look.x, 0, look.z);
  }

  FM.view3d = {
    poseFor(m, teamId, number, type, dur, dir) { const e = findBy(m, teamId, number); setPose(e, type, dur || 1, dir || 1); return !!e; },   // for trying out the animations
    get playersMap() { return players; }, get ball() { return ballMesh; }, get cameraObj() { return camera; },
    get ready() { return ready; }, get failed() { return failed; }, get mode() { return mode; },
    ensure(container) { host = container; if (FM.anim) FM.anim.load(); const pm = () => (FM.playerModel ? FM.playerModel.load() : Promise.resolve()); if (ready) { if (renderer.domElement.parentElement !== host) host.appendChild(renderer.domElement); size(); return pm().then(() => {}); } return load().then(pm).then(() => { if (!ready) build(); size(); }); },
    setMode(m) { mode = m === 'stands' ? 'stands' : 'touchline'; size(); },
    resize: size,
    render(m, ctx) {
      if (!ready || !m) return;
      motionBadge();
      const dt = Math.min(0.1, (ctx && ctx.dt) || 0.016); clock += dt; netT += dt;
      const nowT = performance.now(), rdt = clamp(lastT == null ? dt : (nowT - lastT) / 1000, 0.004, 0.25); lastT = nowT;
      ensurePlayers(m);
      // a replay: the recorded frames stand in for the live positions, and the live match waits
      if (m.phase === 'replay' && !rp && !m.replayDone) startReplay(m);
      if (rp && rp.m !== m) { rp = null; }
      if (rp) {
        rp.t += rdt * REPLAY_SPEED; const at = replayAt(rp);
        while (rp.li < rp.log.length && rp.log[rp.li].t <= rp.t) { const o = rp.log[rp.li++], e = players.get(o.id); if (o.net) hitNet(o.net[0], o.net[1], o.net[2], o.net[3], o.net[4], o.net[5]); else if (e && o.pose && o.pose !== 'kick') setPose(e, o.pose, o.dur, o.dir); else if (e && o.kick) FM.anim && FM.anim.ready && FM.anim.kick(e, 0.12 / REPLAY_SPEED, {}); }
        ctx = { dt, simDt: rdt * REPLAY_SPEED, renderPos: at.pos, renderBall: { x: at.ball[0] + HL, y: at.ball[2] + HW }, replayBy: at.ball[1], snap: snapCam };
        if (rp.t >= rp.end) { stopReplay(m); }
      } else {
        if (m.phase === 'celebration' && goalMark == null) goalMark = recT;
        if (m.phase !== 'celebration' && m.phase !== 'replay' && goalMark != null && recT - goalMark > 30) goalMark = null;
        readEvents(m);
      }
      const replay = !!rp; if (!replay) recT += dt;
      // speed is distance over the match time it took (what the engine advanced by this frame), not over wall-clock time, so the gait follows the real movement exactly
      const sdt = ctx && ctx.simDt > 0.002 ? ctx.simDt : rdt;
      if (snapCam) { ctx = Object.assign({}, ctx, { snap: true }); snapCam = false; }
      // the scorer's slide: the clip starts as the scripted slide does
      if (m.celeb && m.celeb.stage === 'slide' && !m.celeb.fx) { m.celeb.fx = true; const ce = players.get(m.celeb.shooter.id); if (ce && !(FM.anim && FM.anim.ready && FM.anim.celebrate(ce, 2.07))) setPose(ce, 'celebrate', 2.1, 1); }
      m.teams.forEach((team) => team.players.forEach((p) => {
        const e = players.get(p.id); if (!e) return; const rp = (ctx && ctx.renderPos && ctx.renderPos.get(p.id)) || { x: p.x, y: p.y, facing: p.facing || 0 };
        const x = rp.x - HL, z = rp.y - HW, lp = lastPos.get(p.id), k8 = Math.min(1, dt * 8);
        const rvx = lp ? (x - lp.x) / sdt : 0, rvz = lp ? (z - lp.z) / sdt : 0; lastPos.set(p.id, { x, z });
        e.vx += (clamp(rvx, -12, 12) - e.vx) * k8; e.vz += (clamp(rvz, -12, 12) - e.vz) * k8; e.speed += (Math.hypot(e.vx, e.vz) - e.speed) * k8;
        e.fig.root.position.set(x, 0, z); e.fig.root.scale.setScalar(1.3);   // the players are drawn larger than life so they read at this distance
        // Which way he faces. Running, he faces where he is going; jogging or walking without the ball he keeps the ball in front of him and moves
        // sideways or back as he needs to, as a defender does. With the ball he faces his run.
        const isC = !!(m.carrier && m.carrier.player === p), fc = Number.isFinite(rp.facing) ? rp.facing : 0, ab = Math.atan2(lastBall.z - z, lastBall.x - x);
        const wBall = isC ? 0 : 0.72 * (1 - smooth(1.6, 4.6, e.speed)), target = fc + angDiff(fc, ab) * wBall;
        e.hd = e.hd == null ? target : e.hd + angDiff(e.hd, target) * Math.min(1, dt * 9);
        e.fig.root.rotation.y = Math.PI / 2 - e.hd;
        { const dF = e.lastF == null ? 0 : angDiff(e.lastF, e.hd); e.lastF = e.hd;
          e.turn += (clamp(dF / Math.max(dt, 0.001), -9, 9) - e.turn) * Math.min(1, dt * 6);
          e.accel += (clamp((e.speed - e.lastSp) / Math.max(dt, 0.001), -12, 12) - e.accel) * Math.min(1, dt * 5); e.lastSp = e.speed;
          const ch = Math.cos(e.hd), sh = Math.sin(e.hd);
          animate(e.fig, { vf: e.vx * ch + e.vz * sh, vs: e.vx * sh - e.vz * ch, turn: e.turn, accel: e.accel, look: angDiff(e.hd, ab), px: x, pz: z, hd: e.hd, sc: 1.3, vx: e.vx, vz: e.vz, e, gk: p.group === 'GK' }, dt, clock);
          // the kick: the engine holds the ball for the turn and the backswing, and the clip is timed so the foot meets it as it leaves
          { const pa = m.pendingAct; if (FM.anim && FM.anim.ready && pa && pa.player === p && e.kickTag !== pa && (pa.opt.kind === 'pass' || pa.opt.kind === 'shoot' || pa.opt.kind === 'clear')) { const rem = pa.release - m.clock; if (rem <= 0.6) { e.kickTag = pa; e.kickAt = performance.now(); FM.anim.kick(e, rem, { shot: pa.opt.kind === 'shoot', gk: p.group === 'GK' }); logAct({ id: p.id, kick: 1, t: recT + rem - 0.12, rem: 0.12 }); } } } }
        { const kc = m.kickCue; if (!rp && FM.anim && FM.anim.ready && kc && kc.player === p && e.kickTag !== kc) { const rem = kc.release - m.clock; if (rem <= 0.55) { e.kickTag = kc; e.kickAt = performance.now(); FM.anim.kick(e, Math.max(0.12, rem), {}); logAct({ id: p.id, kick: 1, t: recT + Math.max(0.12, rem) - 0.12, rem: 0.12 }); } } }
        // the first touch: a man who has just received the ball cushions it
        if (isC && !e.wasC && e.speed < 8) setPose(e, 'control', 0.5, e.foot); e.wasC = isC;
        if (e.pose) { e.pose.t += dt; if (e.pose.t >= e.pose.dur) e.pose = null; else applyPose(e.fig, e.pose.type, e.pose.t, e.pose.dur, e.pose.dir); }
        if (e.fig.mx) e.fig.mx.sync(e.fig);
      }));
      let bx = ((ctx && ctx.renderBall) || m.ball).x - HL, bz = ((ctx && ctx.renderBall) || m.ball).y - HW, by = replay ? ctx.replayBy : ballHeight(m, bx, bz);
      // Dribbling. The ball is a real rolling ball (it slows on the grass) that the carrier touches as he runs. At a jog he plays it on every stride and it stays at his feet; at
      // a sprint he knocks it several metres ahead and runs on to it, so the touches come every few strides. Each touch swings the nearer foot to the ball. He stops
      // and shields it when he stands still, and when he is about to pass or shoot it is brought to his foot for the kick.
      let vis = false;
      if (!replay && m.carrier && m.ball.state === 'carried' && !goalFx) {
        const ce = players.get(m.carrier.player.id), rp = ce && ((ctx && ctx.renderPos && ctx.renderPos.get(m.carrier.player.id)) || null);
        if (ce && rp && Number.isFinite(rp.facing)) {
          const cx = rp.x - HL, cz = rp.y - HW, ux = Math.cos(rp.facing), uz = Math.sin(rp.facing), nx = -uz, nz = ux, sp = Math.hypot(ce.vx, ce.vz), run = sp > 4.3;
          let dr = ce.dr; if (!dr || dr.who !== m.carrier.player) dr = ce.dr = { who: m.carrier.player, x: lastBall.x, z: lastBall.z, vx: ce.vx, vz: ce.vz, t: 0, last: -1, side: 1 };
          const pa = m.pendingAct && m.pendingAct.player === m.carrier.player ? m.pendingAct : (m.kickCue && m.kickCue.player === m.carrier.player ? m.kickCue : null), dtp = ctx && ctx.simDt > 0.002 ? ctx.simDt : 0;
          let left = dtp;
          do {
            const h = left > 0 ? Math.min(0.025, left) : 0; left -= h; dr.t += h;
            const along = (dr.x - cx) * ux + (dr.z - cz) * uz, lat = (dr.x - cx) * nx + (dr.z - cz) * nz;
            if (pa || sp < 0.9) {
              // standing, or lining up a pass or shot: the ball is at his foot (where the engine has it for the kick)
              const d = pa ? 0.72 : 0.5, kk = Math.min(1, (h || dt) * (pa ? 12 : 8)); dr.x += (cx + ux * d - dr.x) * kk; dr.z += (cz + uz * d - dr.z) * kk; dr.vx = ce.vx; dr.vz = ce.vz;
            } else {
              if (h > 0) { dr.x += dr.vx * h; dr.z += dr.vz * h; const fr = Math.exp(-1.25 * h); dr.vx *= fr; dr.vz *= fr; }
              const reach = run ? 0.5 : 0.44, lost = along > (run ? 3.4 : 1.8) || along < -0.7 || Math.abs(lat) > 1.5;
              if ((along < reach && dr.t - dr.last > 0.17) || lost) {
                // a touch: the ball leaves the foot at the speed he is running plus a push, a little to one side, alternating feet
                dr.side = -dr.side;
                if (lost) { const tx = cx + ux * 0.7 + ce.vx * 0.2, tz = cz + uz * 0.7 + ce.vz * 0.2, ex = (tx - dr.x) / 0.18, ez = (tz - dr.z) / 0.18, em = Math.hypot(ex, ez), cap = Math.min(em, 15) / (em || 1); dr.vx = ex * cap; dr.vz = ez * cap; }
                else { const push = run ? 4.6 + 0.3 * sp : 0.62 + 0.08 * sp, sd = (run ? 0.5 : 0.25) * dr.side; dr.vx = ux * (sp + push) + nx * sd; dr.vz = uz * (sp + push) + nz * sd; if (along < 0.2) { dr.x += ux * (0.34 - along); dr.z += uz * (0.34 - along); } }
                dr.last = dr.t; if (h > 0) setPose(ce, 'touch', run ? 0.2 : 0.17, dr.side);
              }
            }
          } while (left > 1e-6);
          bx = dr.x; bz = dr.z; vis = true;
          // a little hop after a hard push, flat when he is jogging
          by = 0.115 + (run ? 0.07 : 0.025) * Math.max(0, 1 - (dr.t - dr.last) / 0.22) + (run ? 0.02 : 0);
        }
      }
      // the ball leaves the carrier's control (a pass, a shot, a tackle): it is drawn where it was and eased to where the match has it
      if (vis) { carriedVis = { x: bx, z: bz }; relOff = null; }
      else if (carriedVis && !replay) { relOff = { x: carriedVis.x - bx, z: carriedVis.z - bz }; carriedVis = null; }
      if (relOff && !replay) { const kr = Math.exp(-dt * 11); relOff.x *= kr; relOff.z *= kr; bx += relOff.x; bz += relOff.z; if (Math.hypot(relOff.x, relOff.z) < 0.02) relOff = null; }
      if (goalFx) {
        // after a goal the ball runs on into the net, hits it, and drops
        goalFx.t += dt; const g = goalFx, t = Math.min(g.t, 0.5), run = 1.9 * (1 - Math.pow(1 - t / 0.5, 2));
        bx = g.side * (HL + 0.1 + run); bz = g.z; by = Math.max(0.115, g.y * (1 - t / 0.5) + 0.115);
        if (!g.hit && g.t > 0.1) { g.hit = true; hitNet(g.side, 0, 22, bx, by, bz); logAct({ net: [g.side, 0, 22, bx, by, bz] }); }
        if (g.t > 4) goalFx = null;
      }
      lastBall.x = bx; lastBall.z = bz;
      if (!replay) recordFrame(m, ctx, bx, by, bz);
      // after a goal the camera goes with the scorer to the corner flag
      let camX = bx, camZ = bz; if (m.celeb && !replay) { const se = players.get(m.celeb.shooter.id); if (se) { camX = se.fig.root.position.x; camZ = se.fig.root.position.z; } }
      // a set piece taken now: corner, penalty or free kick
      const spc = !replay && !m.celeb && m.restart && (m.restart.kind === 'corner' || m.restart.kind === 'penalty' || m.restart.kind === 'freekick') ? { kind: m.restart.kind, gx: m.restart.team.attackDir === 1 ? HL : -HL } : null;
      if (!!spc !== spcOn) { spcOn = !!spc; if (spc && Math.hypot(camX - look.x, camZ - look.z) > 30) snapNext = true; }
      setCamera(dt, camX, camZ, !ctx || ctx.snap || (snapNext && !(snapNext = false)), spc);
      // The ball is drawn bigger than a real one so it can be followed, and bigger again the further it is from the camera.
      const bs = 1.05 * clamp(camera.position.distanceTo(ballMesh.position) / 32, 1, 2.4);
      ballMesh.scale.setScalar(bs); ballMesh.position.set(bx, by + 0.115 * (bs - 1), bz); ballRing.position.set(bx, 0.03, bz); ballRing.scale.setScalar(bs * 0.9); ballRing.material.opacity = clamp(0.62 - by * 0.25, 0.25, 0.62); ballMesh.rotation.z -= dt * 6; updateNets();
      renderer.render(scene, camera);
    },
    dispose() { /* the scene is kept for the next time a 3D view is chosen */ },
  };
})();
