// The match in 3D. The same match the 2D pitch shows, drawn from the touchline (where the manager stands) or from the stands. Nothing here changes the match:
// it reads positions, facing, the ball and the events the engine records, and draws them. three.js is loaded the first time a 3D view is chosen.
(function () {
  const FM = (window.FM = window.FM || {});
  const { L, W } = FM.PITCH, HL = L / 2, HW = W / 2, G = 9.81;
  let THREE = null, ready = false, loading = null, failed = false;
  let host = null, renderer, scene, camera, sun, players = new Map(), ballMesh, nets = { '-1': [], '1': [] }, netT = 0, clock = 0;
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
  const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const tex = (c, srgb) => { const t = new THREE.CanvasTexture(c); if (srgb !== false) t.encoding = THREE.sRGBEncoding; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; };

  // ---------------------------------------------------------------- the ground, goals with nets, stands
  function pitchTexture() {
    const PPM = 16, mx = 8, mz = 6, cw = (L + 2 * mx) * PPM, ch = (W + 2 * mz) * PPM, c = mkCanvas(cw, ch), g = c.getContext('2d');
    const X = (m) => cw / 2 + m * PPM, Z = (m) => ch / 2 + m * PPM;
    g.fillStyle = '#2b6b38'; g.fillRect(0, 0, cw, ch);
    const n = 15, sw = L / n; for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? '#38883f' : '#307b39'; g.fillRect(X(-HL + i * sw), Z(-HW), sw * PPM + 1, W * PPM); }
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
  const SKIN = [0xf0c9a4, 0xe2ad84, 0xc98b62, 0x9b6440, 0x6e4529, 0xf3d2b3], HAIR = [0x1b1511, 0x3a2a1c, 0x6a4a2a, 0x141414, 0x8a6a3a, 0x2a1d14], STYLE = ['short', 'short', 'buzz', 'long', 'afro', 'bald', 'short', 'buzz'];
  function makeFigure(o) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const hip = 0.88, skin = M(o.skin, 0.6), Lh = {}, Rh = {};
    const sh = mesh(GEO.shorts, M(o.shorts), 0, hip + 0.03, 0); sh.scale.z = 0.74; body.add(sh);
    const to = mesh(GEO.torso, M(o.shirt, 0.65), 0, hip + 0.35, 0); to.scale.z = 0.62; body.add(to);
    const st = mesh(GEO.shorts, M(o.trim, 0.65), 0, hip + 0.58, 0); st.scale.set(1.18, 0.12, 0.8); body.add(st);
    const num = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshBasicMaterial({ map: numberTexture(o.num, o.numColor), transparent: true })); num.position.set(0, hip + 0.4, -0.132); num.rotation.y = Math.PI; body.add(num);
    [[-1, Lh], [1, Rh]].forEach(([side, r]) => {
      r.hip = new THREE.Group(); r.hip.position.set(side * 0.095, hip, 0); body.add(r.hip);
      r.hip.add(mesh(GEO.thighU, M(o.shorts), 0, -0.11, 0)); r.hip.add(mesh(GEO.thighL, skin, 0, -0.32, 0));
      r.knee = new THREE.Group(); r.knee.position.y = -0.42; r.hip.add(r.knee); r.knee.add(mesh(GEO.shin, M(o.sock), 0, -0.2, 0)); r.knee.add(mesh(GEO.boot, M(o.boot, 0.45), 0, -0.405, 0.055));
      r.arm = new THREE.Group(); r.arm.position.set(side * 0.245, hip + 0.56, 0); body.add(r.arm);
      const sd = mesh(GEO.sph, M(o.shirt, 0.65), 0, 0, 0); sd.scale.setScalar(0.07); r.arm.add(sd); r.arm.add(mesh(GEO.upper, M(o.sleeve, 0.65), 0, -0.15, 0));
      r.elbow = new THREE.Group(); r.elbow.position.y = -0.3; r.arm.add(r.elbow); r.elbow.add(mesh(GEO.fore, skin, 0, -0.13, 0));
      const hd = mesh(GEO.sph, skin, 0, -0.28, 0); hd.scale.setScalar(0.045); r.elbow.add(hd); r.arm.rotation.z = -side * 0.07;
    });
    body.add(mesh(GEO.neck, skin, 0, hip + 0.69, 0.005));
    const head = mesh(GEO.sph, skin, 0, hip + 0.81, 0.012); head.scale.set(0.103, 0.118, 0.11); body.add(head);
    [-1, 1].forEach((s) => { const e = mesh(GEO.sph, M(0x1a1410, 0.4), s * 0.037, hip + 0.825, 0.1); e.scale.setScalar(0.011); e.castShadow = false; body.add(e); const ear = mesh(GEO.sph, skin, s * 0.105, hip + 0.8, 0); ear.scale.set(0.014, 0.03, 0.022); body.add(ear); });
    const nose = mesh(GEO.sph, skin, 0, hip + 0.795, 0.112); nose.scale.set(0.017, 0.02, 0.02); body.add(nose);
    const hairM = M(o.hair, 0.9);
    if (o.style !== 'bald') {
      const rr = o.style === 'afro' ? 0.135 : 0.113, cap = new THREE.Mesh(new THREE.SphereGeometry(rr, 16, 12, 0, Math.PI * 2, 0, Math.PI * (o.style === 'buzz' ? 0.5 : o.style === 'afro' ? 0.66 : 0.58)), hairM);
      cap.position.set(0, hip + 0.83, -0.004); cap.scale.set(1, 1.04, 1.02); cap.rotation.x = -0.12; cap.castShadow = true; body.add(cap);
      if (o.style === 'long') { const bk = mesh(GEO.sph, hairM, 0, hip + 0.76, -0.07); bk.scale.set(0.1, 0.12, 0.07); body.add(bk); }
    }
    root.scale.setScalar(o.height || 1);
    return { root, body, L: Lh, R: Rh, phase: Math.random() * 6 };
  }
  function runCycle(f, speed, dt, t) {
    const amp = Math.min(speed / 5.2, 1.25); f.phase += dt * (2.6 + speed * 1.15);
    const s = Math.sin(f.phase), A = 0.72 * amp;
    f.L.hip.rotation.x = -s * A; f.R.hip.rotation.x = s * A;
    f.L.knee.rotation.x = Math.max(0, Math.sin(f.phase + 1.5)) * amp + 0.04; f.R.knee.rotation.x = Math.max(0, Math.sin(f.phase + 1.5 + Math.PI)) * amp + 0.04;
    f.L.arm.rotation.x = s * 0.62 * amp; f.R.arm.rotation.x = -s * 0.62 * amp; f.L.elbow.rotation.x = -(0.25 + 0.5 * amp); f.R.elbow.rotation.x = -(0.25 + 0.5 * amp);
    f.body.position.y = Math.abs(s) * 0.045 * amp; f.body.rotation.x = 0.13 * amp; f.body.rotation.z = 0; f.body.scale.y = 1 + Math.sin(t * 1.6 + f.phase) * 0.004;
  }
  function applyPose(f, type, t, dur, dir) {
    const k = Math.min(1, t / dur), s = Math.sin(Math.PI * k), e = Math.min(1, k * 3);
    if (type === 'kick') { const kk = Math.min(1, t / 0.34); f.R.hip.rotation.x = -1.35 * Math.sin(Math.PI * kk); f.R.knee.rotation.x = 0.15; f.body.rotation.x = -0.1 * s; f.L.arm.rotation.z = 0.45 * s; f.R.arm.rotation.z = -0.45 * s; }
    else if (type === 'tackle') { f.R.hip.rotation.x = -1.25 * s; f.R.knee.rotation.x = 0.1; f.L.knee.rotation.x = 0.7 * s; f.body.rotation.x = 0.3 * s; f.body.position.y = -0.1 * s; }
    else if (type === 'dive') { const ex = k < 0.75 ? e : Math.max(0, 1 - (k - 0.75) / 0.25); f.body.rotation.z = dir * -1.35 * ex; f.body.position.y = 0.5 * s + 0.1 * ex; f.L.arm.rotation.x = -2.7 * ex; f.R.arm.rotation.x = -2.7 * ex; f.L.hip.rotation.x = 0.35 * ex; f.R.hip.rotation.x = -0.45 * ex; }
    else if (type === 'fall') { const ex = k < 0.55 ? Math.min(1, k * 5) : Math.max(0, 1 - (k - 0.55) / 0.45); f.body.rotation.x = -1.28 * ex; f.body.position.y = 0.04; f.L.arm.rotation.x = -1.4 * ex; f.R.arm.rotation.x = -1.4 * ex; }
    else if (type === 'stumble') { f.body.rotation.x = 0.45 * s; f.L.arm.rotation.z = 0.9 * s; f.R.arm.rotation.z = -0.9 * s; }
    else if (type === 'celebrate') { f.L.arm.rotation.x = -2.9; f.R.arm.rotation.x = -2.9; f.L.arm.rotation.z = 0.25; f.R.arm.rotation.z = -0.25; f.body.position.y = Math.abs(Math.sin(t * 9)) * 0.12; }
    else if (type === 'header') { f.body.position.y = 0.5 * s; f.body.rotation.x = 0.5 * Math.sin(Math.PI * Math.min(1, k * 1.6)); f.L.arm.rotation.x = -1.0 * s; f.R.arm.rotation.x = -1.0 * s; f.L.knee.rotation.x = 1.0 * s; }
  }

  // ---------------------------------------------------------------- building the scene
  function build() {
    GEO = {
      thighU: new THREE.CylinderGeometry(0.083, 0.07, 0.22, 12), thighL: new THREE.CylinderGeometry(0.07, 0.056, 0.2, 12), shin: new THREE.CylinderGeometry(0.052, 0.04, 0.4, 12), boot: new THREE.BoxGeometry(0.1, 0.07, 0.27),
      upper: new THREE.CylinderGeometry(0.054, 0.047, 0.29, 10), fore: new THREE.CylinderGeometry(0.044, 0.036, 0.26, 10), sph: new THREE.SphereGeometry(1, 16, 12), torso: new THREE.CylinderGeometry(0.205, 0.165, 0.56, 16), shorts: new THREE.CylinderGeometry(0.175, 0.19, 0.2, 16), neck: new THREE.CylinderGeometry(0.045, 0.052, 0.1, 10),
    };
    try { renderer = new THREE.WebGLRenderer({ antialias: true }); } catch (e1) { renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' }); }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; host.appendChild(renderer.domElement); renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x0a100d); scene.fog = new THREE.Fog(0x0a100d, 150, 330);
    camera = new THREE.PerspectiveCamera(46, 1.7, 0.5, 600);
    scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x1d3b24, 0.62));
    sun = new THREE.DirectionalLight(0xfff1d6, 1.15); sun.position.set(-30, 70, 46); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
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
        const fig = makeFigure({ ...kit, num: p.number, skin: SKIN[(p.number * 5 + ti * 2) % SKIN.length], hair: HAIR[(p.number * 3 + ti) % HAIR.length], style: STYLE[(p.number * 7 + ti * 3) % 8], height: 0.96 + h / 100 });
        e = { fig, team, p, pose: null, speed: 0, kitKey: (team.kit && team.kit.shirt) + (p.group === 'GK') }; players.set(p.id, e); scene.add(fig.root);
      }
      e.team = team; e.p = p; e.fig.root.visible = true;
    }));
    players.forEach((e, id) => { if (!seen.has(id)) e.fig.root.visible = false; });
  }
  const findBy = (m, teamId, number) => { const t = m.teams.find((x) => x.id === teamId); const p = t && t.players.find((q) => q.number === number); return p ? players.get(p.id) : null; };
  function setPose(e, type, dur, dir) { if (e) e.pose = { type, t: 0, dur, dir: dir || 1 }; }
  function readEvents(m) {
    const ev = m.events; if (!ev || !ev.length) { lastEv = 0; lastEvLen = 0; return; }
    if (ev.length < lastEvLen || ev[ev.length - 1].t < lastEv - 5) { lastEv = ev[ev.length - 1].t; lastEvLen = ev.length; return; }
    for (let i = Math.max(0, ev.length - 12); i < ev.length; i++) {
      const e = ev[i]; if (e.t <= lastEv || e.t < m.clock - 8) continue;
      const k = e.type; if (k === 'pass' || k === 'shot' || k === 'cross') setPose(findBy(m, e.team, e.from || e.player), 'kick', 0.42);
      if (k === 'shot') { const shooterT = m.teams.find((t) => t.id === e.team), def = m.teams.find((t) => t.id !== e.team), gk = def && def.players.find((p) => p.group === 'GK'), ge = gk && players.get(gk.id); if (ge && (e.outcome === 'saved' || e.outcome === 'goal')) { const lat = (e.ey != null ? e.ey : m.ball.y) - gk.y; setPose(ge, 'dive', 0.9, lat >= 0 ? -1 : 1); } void shooterT; }
      if (k === 'tackle') { setPose(findBy(m, e.team, e.player), 'tackle', 0.5); const vt = m.teams.find((t) => t.id !== e.team); if (vt) setPose(findBy(m, vt.id, e.vs), e.ok ? 'stumble' : 'tackle', 0.6); }
      if (k === 'foul') { const vt = m.teams.find((t) => t.id !== e.team); if (vt) setPose(findBy(m, vt.id, e.vs), 'fall', 1.1); }
      if (k === 'goal') { const dir = (m.teams.find((t) => t.id === e.team) || {}).attackDir || 1; setPose(findBy(m, e.team, e.player), 'celebrate', 3.2); goalFx = { side: dir, t: 0, y: 0.5 + Math.random() * 0.8, z: clamp(m.ball.y - HH(), -3.2, 3.2), hit: false }; }
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
    camera.aspect = w / h; const hfov = (mode === 'stands' ? 70 : 82) * Math.PI / 180; camera.fov = 2 * Math.atan(Math.tan(hfov / 2) / camera.aspect) * 180 / Math.PI; camera.updateProjectionMatrix();
  }
  function setCamera(dt, bx, bz, snap) {
    const k = snap ? 1 : 1 - Math.exp(-dt * 2.6);
    let tx, tz, cx, cy, cz, ty = 0.8;
    if (mode === 'stands') {
      // from the middle of the main stand, higher up: the whole width of the pitch and a long stretch of it, so the shape of both teams can be read
      tx = clamp(bx * 0.45, -26, 26); tz = 0; cx = tx * 0.5; cy = 23; cz = HW + 14; ty = 0;
    } else {
      // from the touchline, where the manager stands: a steady wide view that slides along the line with the ball
      // It follows the ball all the way to the corner flags. With the ball on the near touchline the camera rises and backs off a little and looks at it,
      // otherwise the ball would be below the bottom of the picture.
      const near = clamp((bz - 6) / 22, 0, 1);
      tx = clamp(bx, -HL + 2, HL - 2); tz = (bz * 0.25 - 6) * (1 - near) + bz * 0.85 * near; cx = tx * 0.9; cy = 4.2 + 4.8 * near; cz = HW + 5.5 + 3.5 * near; ty = 0.7;
    }
    look.x += (tx - look.x) * k; look.z += (tz - look.z) * k; cam.x += (cx - cam.x) * k; cam.y += (cy - cam.y) * k; cam.z += (cz - cam.z) * k;
    camera.position.set(cam.x, cam.y, cam.z); camera.lookAt(look.x, ty, look.z);
    sun.position.set(look.x - 30, 70, look.z + 46); sun.target.position.set(look.x, 0, look.z);
  }

  FM.view3d = {
    get ball() { return ballMesh; }, get cameraObj() { return camera; },
    get ready() { return ready; }, get failed() { return failed; }, get mode() { return mode; },
    ensure(container) { host = container; if (ready) { if (renderer.domElement.parentElement !== host) host.appendChild(renderer.domElement); size(); return Promise.resolve(); } return load().then(() => { if (!ready) build(); size(); }); },
    setMode(m) { mode = m === 'stands' ? 'stands' : 'touchline'; size(); },
    resize: size,
    render(m, ctx) {
      if (!ready || !m) return;
      const dt = Math.min(0.1, (ctx && ctx.dt) || 0.016); clock += dt; netT += dt;
      ensurePlayers(m); readEvents(m);
      m.teams.forEach((team) => team.players.forEach((p) => {
        const e = players.get(p.id); if (!e) return; const rp = (ctx && ctx.renderPos && ctx.renderPos.get(p.id)) || { x: p.x, y: p.y, facing: p.facing || 0 };
        const x = rp.x - HL, z = rp.y - HW, lp = lastPos.get(p.id), sp = lp ? Math.hypot(x - lp.x, z - lp.z) / Math.max(dt, 0.001) : 0; lastPos.set(p.id, { x, z });
        e.speed += (sp - e.speed) * Math.min(1, dt * 8); e.fig.root.position.set(x, 0, z); e.fig.root.rotation.y = Math.PI / 2 - (Number.isFinite(rp.facing) ? rp.facing : 0);
        runCycle(e.fig, Math.min(e.speed, 9), dt, clock);
        if (e.pose) { e.pose.t += dt; if (e.pose.t >= e.pose.dur) e.pose = null; else applyPose(e.fig, e.pose.type, e.pose.t, e.pose.dur, e.pose.dir); }
      }));
      let bx = ((ctx && ctx.renderBall) || m.ball).x - HL, bz = ((ctx && ctx.renderBall) || m.ball).y - HW, by = ballHeight(m, bx, bz);
      // A man running with the ball does not carry it glued to his boots: he pushes it ahead a stride at a time, and the further and faster he goes the
      // further ahead it runs between touches.
      if (m.carrier && m.ball.state === 'carried' && !goalFx) {
        const ce = players.get(m.carrier.player.id), rp = ce && ((ctx && ctx.renderPos && ctx.renderPos.get(m.carrier.player.id)) || null);
        if (ce && rp && Number.isFinite(rp.facing)) {
          const k = clamp(ce.speed / 7, 0, 1), ahead = 0.42 + k * 0.5 * (0.5 + 0.5 * Math.sin(ce.fig.phase * 2 - 1.2)), side = 0.1 * Math.sin(ce.fig.phase);
          bx = rp.x - HL + Math.cos(rp.facing) * ahead - Math.sin(rp.facing) * side; bz = rp.y - HW + Math.sin(rp.facing) * ahead + Math.cos(rp.facing) * side;
          by = 0.115 + k * 0.05 * Math.max(0, Math.sin(ce.fig.phase * 2 - 1.2));
        }
      }
      if (goalFx) {
        // after a goal the ball runs on into the net, hits it, and drops
        goalFx.t += dt; const g = goalFx, t = Math.min(g.t, 0.5), run = 1.9 * (1 - Math.pow(1 - t / 0.5, 2));
        bx = g.side * (HL + 0.1 + run); bz = g.z; by = Math.max(0.115, g.y * (1 - t / 0.5) + 0.115);
        if (!g.hit && g.t > 0.1) { g.hit = true; hitNet(g.side, 0, 22, bx, by, bz); }
        if (g.t > 4) goalFx = null;
      }
      setCamera(dt, bx, bz, !ctx || ctx.snap);
      // The ball is drawn bigger than a real one so it can be followed, and bigger again the further it is from the camera.
      const bs = 1.5 * clamp(camera.position.distanceTo(ballMesh.position) / 20, 1, 4);
      ballMesh.scale.setScalar(bs); ballMesh.position.set(bx, by + 0.115 * (bs - 1), bz); ballMesh.rotation.z -= dt * 6; updateNets();
      renderer.render(scene, camera);
    },
    dispose() { /* the scene is kept for the next time a 3D view is chosen */ },
  };
})();
