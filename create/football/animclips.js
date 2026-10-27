// Motion-captured footballer movement. The clips are a Mixamo game pack (jogging in every direction, kicking, receiving, heading, tackling, tripping, goalkeeper saves
// and so on), baked once into vendor/anim/clips.json as rotations for the 15 bones of the footballer in view3d.js (see the notes in the project memory on how the
// pack was retargeted). This file samples and blends them: the walk/jog cycle follows the player's actual velocity (direction and speed, so a planted foot does not
// slide), idle blends in at rest, and one-shot actions (a kick, a first touch, a header, a tackle, a fall, a dive) play over the top and fade back.
// If the clips cannot be loaded, FM.anim.ready stays false and view3d.js keeps using its own procedural movement.
(function () {
  const FM = (window.FM = window.FM || {});
  const A = (FM.anim = { ready: false, failed: false, clips: null, loading: null });
  const NB = 15, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const SC = 1.3;   // the figure is drawn this much larger than life (set in view3d.js); clip speeds are for the unscaled figure

  A.load = function () {
    if (A.loading) return A.loading;
    A.loading = fetch('/create/football/vendor/anim/clips.json?v=1').then((r) => { if (!r.ok) throw new Error('clips ' + r.status); return r.json(); }).then((j) => {
      A.fps = j.fps; A.clips = {};
      Object.keys(j.clips).forEach((k) => { const c = j.clips[k]; A.clips[k] = { n: c.n, dur: c.dur, q: Float32Array.from(c.q), hy: Float32Array.from(c.hy), hx: Float32Array.from(c.hx), hz: Float32Array.from(c.hz), vf: c.vf, vs: c.vs, travel: c.travel, peak: c.peak || 0 }; });
      A.ready = true; return true;
    }).catch((e) => { A.failed = true; try { console.warn('The motion clips did not load; using the built-in movement.', e); } catch (x) { /* nothing to log to */ } return false; });
    return A.loading;
  };

  // ---- sampling: the pose of a clip at a time, written into a small scratch pose
  const mk = () => ({ q: new Float32Array(NB * 4), hy: 0, hx: 0, hz: 0 });
  const scratch = mk();
  function sampleInto(out, c, t, loop) {
    const n = c.n; let ft = loop ? ((t / c.dur) % 1 + 1) % 1 * n : clamp(t * A.fps, 0, n - 1), i0 = Math.floor(ft), a = ft - i0;
    if (loop) i0 %= n; const i1 = loop ? (i0 + 1) % n : Math.min(i0 + 1, n - 1), q = c.q, o = out.q;
    for (let k = 0; k < NB; k++) {
      const b0 = (i0 * NB + k) * 4, b1 = (i1 * NB + k) * 4; let x0 = q[b0], y0 = q[b0 + 1], z0 = q[b0 + 2], w0 = q[b0 + 3], x1 = q[b1], y1 = q[b1 + 1], z1 = q[b1 + 2], w1 = q[b1 + 3];
      if (x0 * x1 + y0 * y1 + z0 * z1 + w0 * w1 < 0) { x1 = -x1; y1 = -y1; z1 = -z1; w1 = -w1; }
      const x = x0 + (x1 - x0) * a, y = y0 + (y1 - y0) * a, z = z0 + (z1 - z0) * a, w = w0 + (w1 - w0) * a, l = 1 / (Math.hypot(x, y, z, w) || 1);
      o[k * 4] = x * l; o[k * 4 + 1] = y * l; o[k * 4 + 2] = z * l; o[k * 4 + 3] = w * l;
    }
    out.hy = c.hy[i0] + (c.hy[i1] - c.hy[i0]) * a; out.hx = c.hx[i0] + (c.hx[i1] - c.hx[i0]) * a; out.hz = c.hz[i0] + (c.hz[i1] - c.hz[i0]) * a;
  }
  // accumulate w * pose into an accumulator (signs aligned), then normalise
  function accum(acc, p, w) {
    if (w <= 0) return; const a = acc.q, b = p.q;
    for (let k = 0; k < NB; k++) {
      const i = k * 4, dot = a[i] * b[i] + a[i + 1] * b[i + 1] + a[i + 2] * b[i + 2] + a[i + 3] * b[i + 3], s = acc.w > 0 && dot < 0 ? -1 : 1;
      a[i] += s * w * b[i]; a[i + 1] += s * w * b[i + 1]; a[i + 2] += s * w * b[i + 2]; a[i + 3] += s * w * b[i + 3];
    }
    acc.hy += w * p.hy; acc.hx += w * p.hx; acc.hz += w * p.hz; acc.w += w;
  }
  function finish(acc) {
    const a = acc.q; for (let k = 0; k < NB; k++) { const i = k * 4, l = 1 / (Math.hypot(a[i], a[i + 1], a[i + 2], a[i + 3]) || 1); a[i] *= l; a[i + 1] *= l; a[i + 2] *= l; a[i + 3] *= l; }
    if (acc.w > 0) { acc.hy /= acc.w; acc.hx /= acc.w; acc.hz /= acc.w; }
  }
  const reset = (p) => { p.q.fill(0); p.hy = p.hx = p.hz = 0; p.w = 0; };
  const L1 = mk(), L2 = mk(), OS = mk();

  // ---- the eight directions of a jog: where the velocity points relative to where he faces (positive = toward his left)
  const DIR = ['jogF', 'jogFd2', 'strafeL', 'jogBd2', 'jogB', 'jogBd1', 'strafeR', 'jogFd1'];   // 0, 45, 90, 135, 180, -135, -90, -45 degrees
  const nat = {};
  function natSpeed(name) { if (!nat[name]) { const c = A.clips[name]; nat[name] = Math.hypot(c.vf, c.vs) * SC; } return nat[name]; }

  // ---- one-shot actions
  const ACT = {
    kick: (e, dir) => ['kick1', 'kick2'], control: () => ['receive'], tackle: () => ['tackle3'], slide: () => ['tackle1'], challenge: () => ['tackle3'], stumble: () => ['transition'], header: () => ['header1', 'header2'], fall: () => ['trip'],
  };
  const LEN = { receive: 0.95, tackle3: 1.0, tackle2: 1.0, tackle1: 1.7, header1: 1.1, header2: 1.1, gkDive1: 1.9, gkDive2: 1.9, transition: 0.7, trip: 1.5, kick1: 0.62, kick2: 0.55, strike: 0.7, penalty: 1.1, gkDropKick: 2.2, gkPass: 1.2, gkThrow: 2.0 };
  const ROOT = { tackle1: 1, tackle2: 1, trip: 1, gkDive1: 1, gkDive2: 1, standUp: 0 };   // clips whose own travel is used (a slide goes somewhere)
  // start an action on a player entity. opts: { rate, name, mirror, fi, fo }
  A.play = function (e, name, o) {
    if (!A.ready || !A.clips[name]) return false; o = o || {};
    const c = A.clips[name], len = Math.min(c.dur, o.len || LEN[name] || c.dur);
    e.os = { name, t: 0, rate: o.rate || 1, len, fi: o.fi != null ? o.fi : 0.08, fo: o.fo != null ? o.fo : 0.2, root: !!ROOT[name.replace('_m', '')] };
    if (o.next) e.os.next = o.next;
    return true;
  };
  // the figure-level entry: a pose type from view3d.js -> a clip. Returns true if a clip took it.
  A.trigger = function (e, type, dir, o) {
    if (!A.ready) return false; o = o || {};
    const f = ACT[type]; if (!f) return false;
    const list = f(e, dir), pick = list[Math.floor((e.fig.sway * 997) % list.length)], mir = (e.foot < 0 && type !== 'fall' && type !== 'stumble') ? '_m' : '';
    const nm = (A.clips[pick + mir] ? pick + mir : pick);
    if (type === 'fall') return A.play(e, nm, { len: 1.6, next: { name: 'fallen', len: 1.0, fi: 0.1, fo: 0.5 } });
    return A.play(e, nm, o);
  };
  A.dive = function (e, dir) { const nm = (dir > 0 ? 'gkDive2' : 'gkDive1'); return A.play(e, A.clips[nm] ? nm : 'gkDive1', { len: 1.9 }); };
  // a kick timed so that the ball leaves the foot at `remaining` seconds from now
  A.kick = function (e, remaining, o) {
    if (!A.ready) return false; o = o || {}; const mov = (e.speed || 0) > 3.0 && !o.gk, base = o.gk ? 'gkPass' : o.shot ? 'kick2' : (mov ? 'strike' : 'kick1'), mir = e.foot < 0 ? '_m' : '', nm = A.clips[base + mir] ? base + mir : base, c = A.clips[nm];
    const rate = clamp(c.peak / Math.max(0.12, remaining), 0.6, 2.2);
    return A.play(e, nm, { rate, len: Math.min(c.dur, c.peak / rate + 0.3), fi: 0.07, fo: 0.18 });
  };

  // ---- the per-frame step for one figure; st carries velocity in the body frame (vf forward, vs toward his left), turn rate, acceleration, look angle and the entity
  A.step = function (f, st, dt, t) {
    const e = st.e, sp = Math.hypot(st.vf, st.vs), gk = !!st.gk;
    // locomotion: the two nearest of eight directional jogs, run at the speed that matches the ground he is covering
    const th = Math.atan2(st.vs, st.vf), pos = (th + Math.PI) / (Math.PI / 4), i0 = Math.floor(pos) % 8, a = pos - Math.floor(pos);
    // DIR is ordered from forward around through left; convert the angle to that order: 0 -> F, +45 -> Fd2 (left) ...
    const ang = th < 0 ? th + Math.PI * 2 : th, k = ang / (Math.PI / 4), j0 = Math.floor(k) % 8, j1 = (j0 + 1) % 8, u = k - Math.floor(k);
    const c0 = A.clips[DIR[j0]], c1 = A.clips[DIR[j1]], v0 = natSpeed(DIR[j0]), v1 = natSpeed(DIR[j1]), vn = v0 * (1 - u) + v1 * u, durB = c0.dur * (1 - u) + c1.dur * u;
    const rate = clamp(sp / Math.max(0.5, vn), 0.2, 2.3);
    if (sp > 0.12) f.lp = ((f.lp || 0) + dt * rate / durB) % 1;
    const wLoco = smooth(0.2, 1.3, sp), idleName = gk ? 'gkIdle1' : 'idle', ci = A.clips[idleName];
    f.it = (f.it || Math.random() * 10) + dt;
    reset(L1); const acc = L1;
    if (wLoco > 0.001) { sampleInto(L2, c0, f.lp * c0.dur, true); accum(acc, L2, wLoco * (1 - u)); sampleInto(L2, c1, f.lp * c1.dur, true); accum(acc, L2, wLoco * u); }
    if (wLoco < 0.999) { sampleInto(L2, ci, f.it, true); accum(acc, L2, 1 - wLoco); }
    finish(acc);
    // one-shot actions blend over the top
    let wOS = 0, root = 0;
    if (e && e.os) {
      const o = e.os; o.t += dt * o.rate;
      const tin = o.fi > 0 ? smooth(0, 1, o.t / o.fi) : 1, tout = o.fo > 0 ? 1 - smooth(0, 1, (o.t - (o.len - o.fo)) / o.fo) : 1; wOS = Math.min(tin, tout);
      sampleInto(OS, A.clips[o.name], o.t, false);
      if (o.t >= o.len) { if (o.next) { e.os = { name: o.next.name, t: 0, rate: 1, len: o.next.len, fi: o.next.fi || 0.1, fo: o.next.fo || 0.3, root: false, next: o.next.next }; } else e.os = null; }
      if (e.os) root = o.root ? 1 : 0;
    }
    const P = acc;
    if (wOS > 0) {
      for (let kb = 0; kb < NB; kb++) {
        const i = kb * 4; let x1 = OS.q[i], y1 = OS.q[i + 1], z1 = OS.q[i + 2], w1 = OS.q[i + 3]; if (P.q[i] * x1 + P.q[i + 1] * y1 + P.q[i + 2] * z1 + P.q[i + 3] * w1 < 0) { x1 = -x1; y1 = -y1; z1 = -z1; w1 = -w1; }
        const x = P.q[i] + (x1 - P.q[i]) * wOS, y = P.q[i + 1] + (y1 - P.q[i + 1]) * wOS, z = P.q[i + 2] + (z1 - P.q[i + 2]) * wOS, w = P.q[i + 3] + (w1 - P.q[i + 3]) * wOS, l = 1 / (Math.hypot(x, y, z, w) || 1);
        P.q[i] = x * l; P.q[i + 1] = y * l; P.q[i + 2] = z * l; P.q[i + 3] = w * l;
      }
      P.hy += (OS.hy - P.hy) * wOS; if (root) { P.hx = OS.hx * wOS; P.hz = OS.hz * wOS; }
    }
    // write the pose to the bones
    const bones = [f.body, f.torso, f.headG, f.L.arm, f.L.elbow, f.L.hand, f.R.arm, f.R.elbow, f.R.hand, f.L.hip, f.L.knee, f.L.ankle, f.R.hip, f.R.knee, f.R.ankle], q = P.q;
    for (let kb = 0; kb < NB; kb++) bones[kb].quaternion.set(q[kb * 4], q[kb * 4 + 1], q[kb * 4 + 2], q[kb * 4 + 3]);
    // on top: lean into speed and into a turn, and the head on the ball
    const lean = clamp((sp - 3.2) * 0.035, 0, 0.2) + clamp(st.accel, -3, 3) * 0.012, bank = clamp(-st.turn * 0.05, -0.22, 0.22) * Math.min(sp / 4, 1), look = clamp(st.look, -1.1, 1.1);
    f.look = (f.look || 0) + (look - (f.look || 0)) * Math.min(1, dt * 8);
    const T = A.tmp || (A.tmp = { q: new THREE.Quaternion(), e: new THREE.Euler() });
    if (wOS < 0.6) { T.e.set(lean * (1 - wOS), 0, bank * (1 - wOS)); T.q.setFromEuler(T.e); f.body.quaternion.premultiply(T.q); }
    T.e.set(0, -f.look * (1 - wOS * 0.6) * 0.7, 0); T.q.setFromEuler(T.e); f.headG.quaternion.premultiply(T.q);
    // the hips turn about the hips, not about the feet: the body bone sits at the ground, so move it by what that swing would take the hip joint
    { const v = T.v || (T.v = new THREE.Vector3()); v.set(0, 0.89, 0).applyQuaternion(f.body.quaternion); f.body.position.set((root ? P.hx : P.hx * 0.4) - v.x, P.hy + 0.89 - v.y, (root ? P.hz : 0) - v.z); }
  };
})();
