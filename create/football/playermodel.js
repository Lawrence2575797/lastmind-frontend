// The footballer's look: a real-person model (a Mixamo character reduced to about eleven thousand triangles, vendor/player/) in place of the built figure. The motion
// is unchanged: view3d.js still drives its own 15-bone figure (the clips, the procedural poses, the dribbling touches) and each frame this file copies those bone rotations
// onto the model's skeleton. Kits, skin and hair are tints on the model's materials, so every team and every player can look different.
(function () {
  const FM = (window.FM = window.FM || {});
  const PM = (FM.playerModel = { ready: false, failed: false, loading: null });
  const BASE = '/create/football/vendor/player/';
  // which model bone follows which of the figure's 15 bones, and the turn the figure's arms are given so they hang down at rest (see the clip bake)
  const NAMES = ['Hips', 'Spine1', 'Head', 'RightArm', 'RightForeArm', 'RightHand', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightUpLeg', 'RightLeg', 'RightFoot', 'LeftUpLeg', 'LeftLeg', 'LeftFoot'];
  const PARENT = [-1, 0, 1, 1, 3, 4, 1, 6, 7, 0, 9, 10, 0, 12, 13];
  const MODEL_K = 0.89 / 0.928;   // the model's hips are a little higher than the figure's: scaled so the legs match the clips
  let DEF = null, BIN = null, geos = null, skinTex = null, hairTex = null, baseSkin = null;
  let FIXINV = null;   // made once THREE is there
  const matCache = {}; let hipV = null;

  PM.load = function () {
    if (PM.loading) return PM.loading;
    hipV = new THREE.Vector3();
    FIXINV = [null, null, null, 90, 90, 90, -90, -90, -90, null, null, null, null, null, null].map((d) => (d == null ? null : new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), d * Math.PI / 180)));
    PM.loading = Promise.all([fetch(BASE + 'player.json').then((r) => { if (!r.ok) throw new Error('model ' + r.status); return r.json(); }), fetch(BASE + 'player.bin').then((r) => { if (!r.ok) throw new Error('model data ' + r.status); return r.arrayBuffer(); }),
      new Promise((res, rej) => new THREE.TextureLoader().load(BASE + 'player_skin.jpg', res, undefined, rej)), new Promise((res, rej) => new THREE.TextureLoader().load(BASE + 'player_hair.png', res, undefined, rej))]).then(([def, bin, st, ht]) => {
      DEF = def; BIN = bin; skinTex = st; hairTex = ht; [st, ht].forEach((t) => { t.anisotropy = 4; t.encoding = THREE.sRGBEncoding; });
      geos = {}; def.meshes.forEach((m) => {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(bin, m.pos, m.v * 3), 3)); g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(bin, m.nor, m.v * 3), 3)); g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(bin, m.uv, m.v * 2), 2));
        g.setAttribute('skinIndex', new THREE.BufferAttribute(new Uint8Array(bin, m.si, m.v * 4), 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(new Uint8Array(bin, m.sw, m.v * 4), 4, true)); g.setIndex(new THREE.BufferAttribute(new Uint16Array(bin, m.idx, m.i), 1));
        geos[m.name.replace(/^Ch\d+_/, '')] = g;
      });
      // the colour of the plain skin and of the white kit in the texture, so a tint can be worked out from the colour wanted
      try {
        const img = st.image, c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0);
        const avg = (sx, sy, w, h) => { const d = x.getImageData(sx, sy, w, h).data; let r = 0, g = 0, b = 0, n = d.length / 4; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } return [r / n / 255, g / n / 255, b / n / 255]; };
        baseSkin = avg(720, 160, 80, 40);
      } catch (e) { baseSkin = [0.78, 0.58, 0.5]; }
      PM.ready = true; return true;
    }).catch((e) => { PM.failed = true; PM.error = String(e && e.message ? e.message : e); try { console.warn('The player model did not load; using the built figure.', e); } catch (x) { /* nothing to log to */ } return false; });
    return PM.loading;
  };

  const tinted = (key, make) => matCache[key] || (matCache[key] = make());
  const std = (map, hex, rough, extra) => { const m = new THREE.MeshStandardMaterial(Object.assign({ map, roughness: rough, metalness: 0, skinning: true }, extra || {})); m.color.setHex(hex); return m; };
  // a colour that, multiplied by the texture's own colour, comes out as the colour wanted
  const ratio = (hex, base) => { const c = new THREE.Color(hex); c.r = c.r / base[0]; c.g = c.g / base[1]; c.b = c.b / base[2]; return c; };

  // o: { shirt, shorts, sock, boot, skin, hair } colours (hex). Returns { group, sync(figure) }.
  PM.make = function (o) {
    const group = new THREE.Group(); group.scale.setScalar(MODEL_K);
    const bones = DEF.bones.map((b) => { const bn = new THREE.Bone(); bn.name = b.n; bn.position.fromArray(b.t); bn.quaternion.fromArray(b.q); return bn; });
    DEF.bones.forEach((b, i) => { if (b.p >= 0) bones[b.p].add(bones[i]); else group.add(bones[i]); });
    group.updateMatrixWorld(true);
    const skeleton = new THREE.Skeleton(bones, bones.map((b) => b.matrixWorld.clone().invert()));
    const white = [0.77, 0.76, 0.76];
    const mats = {};
    // each part has its own tint on the one shared texture
    mats.Body = tinted('b' + o.skin, () => { const m = std(skinTex, 0xffffff, 0.62); const c = new THREE.Color(o.skin); m.color.setRGB(c.r / baseSkin[0] * 0.8, c.g / baseSkin[1] * 0.8, c.b / baseSkin[2] * 0.8); return m; });
    mats.Shirt = tinted('sh' + o.shirt, () => { const m = std(skinTex, 0xffffff, 0.72); m.color.copy(ratio(o.shirt, white)); return m; });
    mats.Shorts = tinted('sr' + o.shorts, () => { const m = std(skinTex, 0xffffff, 0.74); m.color.copy(ratio(o.shorts, white)); return m; });
    mats.Socks = tinted('so' + o.sock, () => { const m = std(skinTex, 0xffffff, 0.8); m.color.copy(ratio(o.sock, white)); return m; });
    mats.Shoes = tinted('bo' + o.boot, () => { const m = std(skinTex, 0xffffff, 0.45); m.color.copy(ratio(o.boot, [0.6, 0.6, 0.6])); return m; });
    mats.Hair = tinted('h' + o.hair, () => { const m = std(hairTex, 0xffffff, 0.85, { transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, depthWrite: true }); m.color.copy(ratio(o.hair, [0.28, 0.25, 0.23])); return m; });
    const meshes = [];
    Object.keys(geos).forEach((nm) => { if (!mats[nm] || (nm === 'Hair' && o.bald)) return; const sm = new THREE.SkinnedMesh(geos[nm], mats[nm]); sm.frustumCulled = false; sm.castShadow = nm !== 'Hair'; group.add(sm); sm.bind(skeleton, new THREE.Matrix4()); meshes.push(sm); });
    const index = {}; DEF.bones.forEach((b, i) => { index[b.n] = i; });
    const mapIdx = NAMES.map((n) => index[n]), bindQ = DEF.bones.map((b) => new THREE.Quaternion().fromArray(b.wq)), localQ = DEF.bones.map((b) => new THREE.Quaternion().fromArray(b.q));
    const worldQ = DEF.bones.map(() => new THREE.Quaternion()), want = new Array(DEF.bones.length).fill(null), Wk = NAMES.map(() => new THREE.Quaternion()), tmp = new THREE.Quaternion(), inv = new THREE.Quaternion();
    const wantQ = NAMES.map(() => new THREE.Quaternion());
    return {
      group, bones, meshes,
      // copy the figure's pose onto the model's skeleton
      sync(f) {
        const px = [f.body, f.torso, f.headG, f.L.arm, f.L.elbow, f.L.hand, f.R.arm, f.R.elbow, f.R.hand, f.L.hip, f.L.knee, f.L.ankle, f.R.hip, f.R.knee, f.R.ankle];
        for (let k = 0; k < 15; k++) {
          if (PARENT[k] < 0) Wk[k].copy(px[k].quaternion); else Wk[k].copy(Wk[PARENT[k]]).multiply(px[k].quaternion);
          wantQ[k].copy(Wk[k]); if (FIXINV[k]) wantQ[k].multiply(FIXINV[k]); wantQ[k].multiply(bindQ[mapIdx[k]]); want[mapIdx[k]] = wantQ[k];
        }
        for (let i = 0; i < bones.length; i++) {
          const pi = DEF.bones[i].p, b = bones[i];
          if (want[i]) { worldQ[i].copy(want[i]); if (pi >= 0) { inv.copy(worldQ[pi]).invert(); b.quaternion.copy(inv).multiply(want[i]); } else b.quaternion.copy(want[i]); }
          else { b.quaternion.copy(localQ[i]); if (pi >= 0) worldQ[i].copy(worldQ[pi]).multiply(localQ[i]); else worldQ[i].copy(localQ[i]); }
        }
        for (let k = 0; k < 15; k++) want[mapIdx[k]] = null;
        // the hips follow the figure's body (its height changes in a slide or a dive)
        const hb = bones[mapIdx[0]], bp = f.body.position; hipV.set(0, f.L.hip.position.y, 0).applyQuaternion(f.body.quaternion); hb.position.set((bp.x + hipV.x) / MODEL_K, (bp.y + hipV.y) / MODEL_K, (bp.z + hipV.z) / MODEL_K);
      },
    };
  };
})();
