// The ground: two-tier stands that close the bowl, a roof with its lights and columns, a crowd with the home colours in it, LED hoardings, floodlights that glow, dugouts, the
// tunnel and a big screen that shows the score. Everything is built once from boxes and canvas textures (no models), so it costs a few hundred meshes and no downloads.
// FM.stadium.build(scene, ctx) is called by view3d.js; FM.stadium.update(match) keeps the screen's score right.
(function () {
  const FM = (window.FM = window.FM || {});
  const S = (FM.stadium = { screen: null, last: '' });

  function crowdTexture(ctx, homeHex, awayHex, seed) {
    const c = ctx.mkCanvas(1024, 256), g = c.getContext('2d'); let r = seed || 12345; const rnd = () => { r = (r * 1664525 + 1013904223) >>> 0; return r / 4294967296; };
    g.fillStyle = '#101820'; g.fillRect(0, 0, 1024, 256);
    const SKIN = ['#f1c8a8', '#e0a982', '#c68863', '#a56a46', '#7a4b32', '#573623'], BODY = ['#8a2a2a', '#2a4f8a', '#e8e8e0', '#1c1c20', '#d6b13a', '#3f7a4a', '#7a3f8a', '#c9602a'], rowH = 16;
    for (let y = 0; y < 256; y += rowH) {
      g.fillStyle = '#17222d'; g.fillRect(0, y + rowH - 4, 1024, 4);   // the step
      for (let x = 2; x < 1024; x += 11) {
        if (rnd() < 0.1) { g.fillStyle = '#1d3550'; g.fillRect(x, y + 5, 9, 8); continue; }   // an empty seat
        const t = rnd(), body = t < 0.34 ? homeHex : t < 0.42 ? awayHex : BODY[(rnd() * BODY.length) | 0], dx = (rnd() - 0.5) * 2;
        g.fillStyle = body; g.fillRect(x + dx, y + 6, 8, 8);
        g.fillStyle = SKIN[(rnd() * SKIN.length) | 0]; g.beginPath(); g.arc(x + 4 + dx, y + 4, 2.6, 0, 6.3); g.fill();
      }
    }
    const t = ctx.tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  function glowTexture(ctx) {
    const c = ctx.mkCanvas(128, 128), g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 2, 64, 64, 64); gr.addColorStop(0, 'rgba(255,248,225,1)'); gr.addColorStop(0.18, 'rgba(255,240,205,.7)'); gr.addColorStop(0.5, 'rgba(255,226,170,.18)'); gr.addColorStop(1, 'rgba(255,220,160,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return ctx.tex(c);
  }
  const stdMat = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 1, metalness: 0 }, o));

  // one side of the bowl, running along x, rising away from the pitch (+z): lower tier, a walkway, an upper tier, the back wall, the roof with its columns and lights
  function side(ctx, len, off, crowd, tag) {
    const g = new THREE.Group(), conc = stdMat({ color: 0x2a3138 }), dark = stdMat({ color: 0x141a1f }), steel = stdMat({ color: 0x3a434b, roughness: 0.6, metalness: 0.5 });
    const rowD = 0.9, stepBox = (y0, h, z0, d, tex, rep) => {
      const t = tex.clone(); t.needsUpdate = true; t.repeat.set(len / 20, Math.max(0.4, h / 3.2));
      const m = new THREE.Mesh(new THREE.BoxGeometry(len, h, d), [conc, conc, stdMat({ map: t }), dark, conc, stdMat({ map: t })]); m.position.set(0, y0 + h / 2, z0 + d / 2); g.add(m); return m;
    };
    let z = off, y = 0.4;
    for (let k = 0; k < 11; k++) { y += 0.46; stepBox(0, y, z, rowD, crowd); z += rowD; }                    // lower tier
    const walkY = y; const w = new THREE.Mesh(new THREE.BoxGeometry(len, walkY, 2.4), conc); w.position.set(0, walkY / 2, z + 1.2); g.add(w); z += 2.4;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.9, 0.08), steel); rail.position.set(0, walkY + 0.45, off + 11 * rowD + 0.05); g.add(rail);
    for (let k = 0; k < 14; k++) { y += 0.62; stepBox(0, y, z, rowD, crowd); z += rowD; }                    // upper tier
    const back = new THREE.Mesh(new THREE.BoxGeometry(len, y + 6, 0.8), dark); back.position.set(0, (y + 6) / 2, z + 0.4); g.add(back);
    // the roof: a cantilever that slopes down towards the pitch, with a lit fascia and an underside of light panels
    const roofLen = len + 6, roofD = z - off + 5, ry = y + 4.5, slope = 0.08;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(roofLen, 0.5, roofD), stdMat({ color: 0x22292f, roughness: 0.7, metalness: 0.3 })); roof.position.set(0, ry + 1.2, off + roofD / 2 - 1); roof.rotation.x = slope; g.add(roof);
    const under = new THREE.Mesh(new THREE.PlaneGeometry(roofLen - 2, roofD - 2), new THREE.MeshBasicMaterial({ color: 0x3b4a58, fog: true })); under.rotation.x = Math.PI / 2 + slope; under.position.set(0, ry + 0.9, off + roofD / 2 - 1); g.add(under);
    for (let k = 0; k < 6; k++) { const strip = new THREE.Mesh(new THREE.BoxGeometry(roofLen - 8, 0.12, 0.5), new THREE.MeshBasicMaterial({ color: 0xfff4d8, fog: false })); strip.position.set(0, ry + 0.82 + k * 0.01, off + 2 + k * (roofD - 5) / 6); strip.rotation.x = slope; g.add(strip); }
    const fascia = new THREE.Mesh(new THREE.BoxGeometry(roofLen, 1.5, 0.3), new THREE.MeshStandardMaterial({ color: 0x1a2229, emissive: 0x2a3a48, emissiveIntensity: 0.5, roughness: 0.6 })); fascia.position.set(0, ry + 0.6, off - 1.5 + roofD * 0.0); g.add(fascia);
    for (let x = -len / 2; x <= len / 2 + 0.1; x += 14) { const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, ry + 1, 10), steel); col.position.set(x, (ry + 1) / 2, z + 0.9); g.add(col); const bm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, roofD - 1), steel); bm.position.set(x, ry + 0.7, off + roofD / 2 - 1); bm.rotation.x = slope; g.add(bm); }
    g.userData.tag = tag; return g;
  }

  S.build = function (scene, ctx) {
    const HL = ctx.HL, HW = ctx.HW, home = ctx.homeHex || '#c0392b', away = ctx.awayHex || '#2c5aa0';
    const crowdA = crowdTexture(ctx, home, away, 7), crowdB = crowdTexture(ctx, home, away, 91), glow = glowTexture(ctx);
    const near = side(ctx, 2 * (HL + 16), HW + 8, crowdA, 'near'), far = side(ctx, 2 * (HL + 16), HW + 8, crowdB, 'far'), e1 = side(ctx, 2 * (HW + 8), HL + 13, crowdA, 'e1'), e2 = side(ctx, 2 * (HW + 8), HL + 13, crowdB, 'e2');
    far.rotation.y = Math.PI; e1.rotation.y = Math.PI / 2; e2.rotation.y = -Math.PI / 2; scene.add(near, far, e1, e2);
    // the running surface round the pitch and an apron of mown grass
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(2 * HL + 14, 2 * HW + 12), stdMat({ color: 0x1d4a2b })); apron.rotation.x = -Math.PI / 2; apron.position.y = -0.02; apron.receiveShadow = true; scene.add(apron);
    // dugouts on the near side: a bench each, a glass roof and a back
    [-1, 1].forEach((sd) => {
      const d = new THREE.Group(), x = sd * 12;
      const bench = new THREE.Mesh(new THREE.BoxGeometry(8, 0.5, 0.7), stdMat({ color: 0x151a1e })); bench.position.set(0, 0.45, 0); d.add(bench);
      const seatBack = new THREE.Mesh(new THREE.BoxGeometry(8, 0.9, 0.12), stdMat({ color: 0x1e2a36 })); seatBack.position.set(0, 0.9, 0.35); d.add(seatBack);
      const back = new THREE.Mesh(new THREE.BoxGeometry(9, 2.4, 0.15), stdMat({ color: 0x20272d })); back.position.set(0, 1.2, 0.6); d.add(back);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.12, 2.0), new THREE.MeshStandardMaterial({ color: 0x9fb6c8, transparent: true, opacity: 0.35, roughness: 0.2 })); roof.position.set(0, 2.4, -0.2); d.add(roof);
      d.position.set(x, 0, HW + 3.4 - 1.3 + 1.6); scene.add(d);
    });
    // the tunnel, in the far stand
    const tun = new THREE.Mesh(new THREE.BoxGeometry(6, 3.4, 0.5), new THREE.MeshBasicMaterial({ color: 0x05070a })); tun.position.set(0, 1.7, -(HW + 8) + 0.1); scene.add(tun);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.25, 0.55), new THREE.MeshBasicMaterial({ color: 0xdfe8f0, fog: false })); rim.position.set(0, 3.45, -(HW + 8) + 0.12); scene.add(rim);
    // the big screen on the east end
    // (no big screen: it filled the picture whenever the camera looked towards that end)
    // floodlights: a bright bank and a glow, so the lights read as lights
    [[-74, -52], [74, -52], [-74, 52], [74, 52]].forEach((p) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xfff1d0, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); sp.scale.set(34, 34, 1); sp.position.set(p[0] * 0.98, 31, p[1] * 0.98); scene.add(sp);
      const bank = new THREE.Mesh(new THREE.BoxGeometry(8, 3.6, 0.5), new THREE.MeshBasicMaterial({ color: 0xfffbe8, fog: false })); bank.position.set(p[0], 31, p[1]); bank.lookAt(0, 8, 0); scene.add(bank);
    });
    return { near, far, e1, e2 };
  };

  S.draw = function (title, sub, a, b, nameA, nameB) {
    const sc = S.screen; if (!sc) return; const g = sc.g, W = 1024, H = 340;
    g.fillStyle = '#06141c'; g.fillRect(0, 0, W, H); const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(60,140,190,.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = '#deb862'; g.font = '700 30px Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.fillText(title, W / 2, 52);
    if (a !== undefined && a !== '') { g.fillStyle = '#ffffff'; g.font = '800 150px Helvetica, Arial, sans-serif'; g.fillText(a + '  -  ' + b, W / 2, 205); g.font = '700 34px Helvetica, Arial, sans-serif'; g.fillStyle = '#cfe0ea'; g.fillText((nameA || '') + '   v   ' + (nameB || ''), W / 2, 275); }
    if (sub) { g.font = '600 26px Helvetica, Arial, sans-serif'; g.fillStyle = '#8fb0c0'; g.fillText(sub, W / 2, 316); }
    sc.t.needsUpdate = true;
  };
  // the screen shows the teams and the score; redrawn only when it changes
  S.update = function (m) {
    if (!S.screen || !m) return; const key = m.home.name + m.away.name + m.score[m.home.id] + '-' + m.score[m.away.id] + Math.floor(m.clock / 60);
    if (key === S.last) return; S.last = key; const mins = Math.floor(m.clock / 60);
    S.draw('LASTMIND FOOTBALL', mins + "'", String(m.score[m.home.id]), String(m.score[m.away.id]), m.home.name, m.away.name);
  };
})();
