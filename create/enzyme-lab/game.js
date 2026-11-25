/* Reactor 3: a GCSE enzymes game. */
(function () {
'use strict';
const LINES = {"g-win": "Yes! All four tests came out right! You matched each substrate to its own active site, and you kept the temperature and pH right. Brilliant work!", "g-cold": "Not good enough! It was too cold. Cold molecules have less kinetic energy, so they move slowly and collide less often. Warm it up and go again!", "g-hot": "Not good enough! You overheated it and the enzymes denatured. Their active sites changed shape, so the substrates no longer fit, and cooling won't fix that. Go again, a bit cooler!", "g-ph": "Not good enough! The pH drifted too far. Away from the best pH, the active site changes shape and the substrate can't fit. Correct it faster next time!", "g-close": "So close! Your tests show not enough was broken down. Remember, every active site is a different shape, so each enzyme only works on its own substrate. Keep your enzymes busy and go again, a bit quicker!"};
const CLIPS = {"g-win": "/create/enzyme-lab/voice/g-win.mp3?v=4", "g-cold": "/create/enzyme-lab/voice/g-cold.mp3?v=4", "g-hot": "/create/enzyme-lab/voice/g-hot.mp3?v=4", "g-ph": "/create/enzyme-lab/voice/g-ph.mp3?v=4", "g-close": "/create/enzyme-lab/voice/g-close.mp3?v=4"};
/* ============================================================
   CORE: helpers, the process model, the manager's voice, sound
   ============================================================ */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const rnd = (a, b) => a + Math.random() * (b - a);
const now = () => performance.now() / 1000;
const fmt = (x, d) => Number(x).toFixed(d == null ? 0 : d);
const money = (x) => (x < 0 ? '−£' : '£') + Math.abs(Math.round(x)).toLocaleString('en-GB');
const money2 = (x) => '£' + x.toFixed(2);
const hhmm = (min) => { const m = Math.floor(min); return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0'); };
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private window */ } }
};

/* ---------- the process: one industrial amylase turning starch into syrup ----------
   Rate doubles for every 10 °C (more energetic collisions, more of them succeed).
   Above about 50 °C the enzyme's shape starts to fail, and it never recovers.        */
const P = {
  S0: 500, price: 2.2, starch: 0.30, enzyme: 90, kwh: 0.30, ovh: 55,
  r20: 0.42, Km: 70, C: 0.583, loss: 0.9, pmax: 60, pcool: 40, amb: 20,
  optimum: 50
};
const kd = (T) => 0.0016 * Math.exp((T - 50) / 2);       // fraction of working enzyme lost per minute
const kT = (T) => Math.pow(2, (T - 20) / 10);            // collision / energy factor relative to 20 °C
const SPEEDS = { 0: 0, 3: 12 };             // simulated minutes per real second
const TARGET_CPK = 1.30;                                  // Hollis's limit: pounds per kilo of syrup

let Tset = 25;
const B = {};
const LOG = [];       // finished batches
const OBS = [];       // (temperature, activity) readings for the dashboard graph
let batchCount = 0;
function newBatch() {
  Object.assign(B, {
    n: ++batchCount, charged: false, running: false, finished: false, t: 0, T: 20, N: 1, S: P.S0, P: 0, E: 0, pw: 0, rate: 0, act: 0,
    hist: [], nextHist: 0, nextObs: 0, maxT: 20, minN: 1, tmax: 0, lowT: 99, revealed: false, delivered: false, sumT: 0, logged: false, level: 0, filling: false, draining: false, dose: 0, judged: false
  });
}
newBatch();
function costParts() { return { fixed: B.charged ? P.S0 * P.starch + P.enzyme : 0, energy: B.E * P.kwh, ovh: P.ovh * B.t / 60 }; }
function totalCost() { const c = costParts(); return c.fixed + c.energy + c.ovh; }
function profitNow() { return B.P * P.price - totalCost(); }
function cpkNow() { return B.P > 1 ? totalCost() / B.P : 0; }

function advance(dt) {   // dt in simulated minutes
  if (!B.running || B.finished || dt <= 0) return;
  let left = dt;
  const h = 0.25;
  while (left > 1e-9) {
    const d = Math.min(h, left); left -= d;
    const want = P.C * (Tset - B.T) / 0.2 + P.loss * (B.T - P.amb);
    const pw = clamp(want, -P.pcool, P.pmax);
    B.T += (pw - P.loss * (B.T - P.amb)) / P.C * (d / 60);
    B.N *= Math.exp(-kd(B.T) * d);
    const act = kT(B.T) * B.N;
    const rate = P.r20 * act * B.S / (B.S + P.Km);
    const dp = Math.min(B.S, rate * d);
    B.S -= dp; B.P += dp;
    B.E += (Math.max(pw, 0) + Math.max(-pw, 0) * 0.25) * d / 60;
    B.pw = pw; B.rate = rate * 60; B.act = act; B.t += d;
    B.maxT = Math.max(B.maxT, B.T); B.minN = Math.min(B.minN, B.N);
    if (B.T > 24) B.lowT = Math.min(B.lowT, B.T);
    if (B.t >= B.nextHist) {
      B.hist.push({ t: B.t, T: B.T, Tset, P: B.P, rate: B.rate, N: B.N, profit: profitNow() });
      B.nextHist = B.t + 2;
    }
    if (B.t >= B.nextObs) {
      B.nextObs = B.t + 3;
      if (B.rate > 0.01 || B.act > 0.01) { OBS.push({ T: B.T, act: B.act, N: B.N, n: B.n }); if (OBS.length > 900) OBS.shift(); }
    }
    if (B.S < 25) { B.finished = true; B.running = false; break; }
  }
}

/* ---------- sound: room tone, a pump that follows the heater, intercom chime ---------- */
const Snd = {
  ctx: null, on: true, master: null, pump: null, hum: null, gone: false,
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try {
      const c = this.ctx = new AC();
      this.master = c.createGain(); this.master.gain.value = this.on ? 1 : 0; this.master.connect(c.destination);
      const len = c.sampleRate * 3, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
      const n = c.createBufferSource(); n.buffer = buf; n.loop = true;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380;
      const g = c.createGain(); g.gain.value = 0.22; n.connect(lp); lp.connect(g); g.connect(this.master); n.start();
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 50;
      const olp = c.createBiquadFilter(); olp.type = 'lowpass'; olp.frequency.value = 170;
      this.hum = c.createGain(); this.hum.gain.value = 0.02; o.connect(olp); olp.connect(this.hum); this.hum.connect(this.master); o.start();
      const p = c.createOscillator(); p.type = 'sine'; p.frequency.value = 97;
      this.pump = c.createGain(); this.pump.gain.value = 0; p.connect(this.pump); this.pump.connect(this.master); p.start();
      this.watch();
    } catch (e) { this.ctx = null; }
  },
  // all sound stops when you leave the game (another tab, app or window, or away from the page) and comes back when you return
  away(v) { this.gone = v; if (!this.ctx || this.ctx.state === 'closed') return; const p = v ? this.ctx.suspend() : this.ctx.resume(); if (p && p.catch) p.catch(() => { }); },
  watch() {
    document.addEventListener('visibilitychange', () => this.away(document.hidden));
    addEventListener('pagehide', () => this.away(true)); addEventListener('pageshow', () => this.away(document.hidden));
    addEventListener('blur', () => this.away(true)); addEventListener('focus', () => this.away(document.hidden));
    addEventListener('pointerdown', () => { if (this.gone) this.away(false); }, true);
    // phones only let sound start when a finger lifts, not when it touches down
    const wake = () => { if (!this.gone && this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); };
    addEventListener('pointerup', wake, true); addEventListener('touchend', wake, true);
  },
  blip(f, dur, type, vol, when) {
    if (!this.ctx || !this.on) return;
    const c = this.ctx, t = c.currentTime + (when || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.05, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  },
  click() { this.blip(1400, 0.05, 'square', 0.025); },
  chime() { this.blip(880, 0.18, 'sine', 0.06); this.blip(660, 0.26, 'sine', 0.06, 0.16); },
  alarm() { this.blip(740, 0.12, 'square', 0.03); this.blip(740, 0.12, 'square', 0.03, 0.22); },
  done() { this.blip(523, 0.14, 'sine', 0.06); this.blip(659, 0.14, 'sine', 0.06, 0.13); this.blip(784, 0.3, 'sine', 0.06, 0.26); },
  setOn(v) { this.on = v; if (this.master) this.master.gain.value = v ? 1 : 0; },
  update(running, pw) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.pump.gain.setTargetAtTime(running ? 0.012 + Math.abs(pw) / 60 * 0.012 : 0, t, 0.3);
    this.hum.gain.setTargetAtTime(running ? 0.026 : 0.014, t, 0.4);
  }
};

/* ---------- Hollis: a voice in the room. Every line is chosen by the code from what is happening. ---------- */
const Voice = {
  // Only the recordings are ever played, exactly as recorded. There is no browser text-to-speech fallback, so he can never sound robotic:
  // if a recording cannot be played, the words are simply shown on screen.
  on: true, ok: false, buffers: {}, loading: {}, src: null,
  init() { },
  has(key) { return typeof CLIPS !== 'undefined' && !!CLIPS[key]; },
  wants(key) { return this.on && !!Snd.ctx && this.has(key); },
  load(key) {
    if (this.buffers[key]) return Promise.resolve(this.buffers[key]);
    if (this.loading[key]) return this.loading[key];
    const src = CLIPS[key]; if (!src || !Snd.ctx) return Promise.resolve(null);
    const p = (async () => {
      try {
        let ab;
        if (src.startsWith('data:')) { const bin = atob(src.split(',')[1]), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); ab = u8.buffer; }
        else { const r = await fetch(src); ab = await r.arrayBuffer(); }
        const buf = await new Promise((res, rej) => Snd.ctx.decodeAudioData(ab, res, rej));
        this.buffers[key] = buf; return buf;
      } catch (e) { CLIPS[key] = null; return null; }
    })();
    this.loading[key] = p; return p;
  },
  preload() { (async () => { for (const k of Object.keys(CLIPS)) { await this.load(k); await new Promise((r) => setTimeout(r, 0)); } })(); },
  speak(key, text, done) {
    const buf = this.buffers[key];
    if (!this.on || !buf || !Snd.ctx) { done && done(); return; }
    this.stop();
    if (Snd.ctx.state === 'suspended' && !Snd.gone) Snd.ctx.resume();
    const s = Snd.ctx.createBufferSource(); s.buffer = buf; s.connect(Snd.master); s.onended = () => done && done(); s.start(); this.src = s;
  },
  stop() { try { if (this.src) this.src.stop(); } catch (e) { /* nothing playing */ } this.src = null; }
};

const Mgr = {
  q: [], cur: null, till: 0, said: new Set(), lastText: '', speaking: false,
  say(key, text, o) {
    o = Object.assign({ pri: 1, once: true, delay: 0, gap: 1.6 }, o || {});
    if (o.once && this.said.has(key)) return false;
    if (this.q.some((x) => x.key === key) || (this.cur && this.cur.key === key)) return false;
    if (o.once) this.said.add(key);
    this.q.push({ key, text, pri: o.pri, at: now() + o.delay, born: now(), gap: o.gap });
    return true;
  },
  clearLow(p) { this.q = this.q.filter((x) => x.pri >= p); },
  stop() { this.q = []; this.cur = null; this.speaking = false; this.till = 0; Voice.stop(); $('#sub').classList.remove('on'); Lab.setIntercom(false); },
  tick() {
    const t = now(), sub = $('#sub');
    if (this.cur) {
      const c = this.cur;
      if (t >= c.end && (c.voiceDone || t > c.end + 5)) {
        this.cur = null; this.till = t + c.gap; sub.classList.remove('on'); this.speaking = false;
        Lab.setIntercom(false);
      }
    }
    if (!this.cur && t >= this.till) {
      this.q = this.q.filter((x) => !(t - x.born > 14 && x.pri < 3) && !(t - x.born > 60 && x.pri < 5));
      const ready = this.q.filter((x) => x.at <= t).sort((a, b) => b.pri - a.pri || a.born - b.born);
      if (!ready.length) return;
      const it = ready[0];
      if (Voice.wants(it.key) && !Voice.buffers[it.key]) { Voice.load(it.key); return; }   // wait for the recording to be ready
      this.q.splice(this.q.indexOf(it), 1);
      const text = (typeof LINES !== 'undefined' && LINES[it.key]) || (typeof it.text === 'function' ? it.text() : it.text);
      if (!text) return;
      const clip = Voice.buffers[it.key], spoken = Voice.on && (clip || Voice.ok);
      const dur = clip && Voice.on ? clip.duration + 0.7 : Math.max(2.6, text.length * 0.058 + 1.3);
      this.cur = { key: it.key, end: t + dur, voiceDone: !spoken, gap: it.gap };
      this.speaking = true; this.lastText = text;
      $('#subTx').textContent = text; sub.classList.add('on');
      Snd.chime(); Lab.setIntercom(true);
      const c = this.cur;
      setTimeout(() => { if (this.cur === c) Voice.speak(it.key, text, () => { c.voiceDone = true; }); }, 420);
    }
  }
};
const say = (k, t, o) => Mgr.say(k, t, o);

/* ============================================================
   LAB: the 3D laboratory (Three.js r128)
   Room is 9.2 m wide (x), 7.4 m deep (z), 3.5 m high. You stand near z = +1.6 looking at the reactor.
   ============================================================ */
const Lab = (function () {
  const V3 = THREE.Vector3;
  let renderer, scene, camera, envTex, covered = false;   // covered: the flat phone screen is over the lab, so don't draw it
  const R = { pick: [], screens: {}, anchors: {} };
  const M = {};
  const cache = {};

  /* ---------- canvas textures ---------- */
  function cTex(w, h, draw, o) {
    o = o || {};
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); draw(x, w, h);
    const t = new THREE.CanvasTexture(c);
    if (o.srgb !== false) t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 8;
    if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(o.repeat[0], o.repeat[1]); }
    t.userData = { canvas: c, ctx: x };
    return t;
  }
  function tileTexture() {
    return cTex(1024, 1024, (x, w, h) => {
      x.fillStyle = '#e4ebea'; x.fillRect(0, 0, w, h);
      const n = 4, s = w / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const g = x.createLinearGradient(i * s, j * s, (i + 1) * s, (j + 1) * s);
        const v = 232 + Math.floor(Math.random() * 8);
        g.addColorStop(0, `rgb(${v + 3},${v + 8},${v + 7})`); g.addColorStop(1, `rgb(${v - 12},${v - 6},${v - 6})`);
        x.fillStyle = g; x.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
        x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(i * s + 8, j * s + 8, s - 16, 5);
      }
      x.strokeStyle = '#a3b1b3'; x.lineWidth = 6;
      for (let i = 0; i <= n; i++) { x.beginPath(); x.moveTo(i * s, 0); x.lineTo(i * s, h); x.stroke(); x.beginPath(); x.moveTo(0, i * s); x.lineTo(w, i * s); x.stroke(); }
    }, { repeat: [1, 1] });
  }
  function tileBump() {
    return cTex(512, 512, (x, w, h) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.strokeStyle = '#000'; x.lineWidth = 4; const s = w / 4; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * s, 0); x.lineTo(i * s, h); x.stroke(); x.beginPath(); x.moveTo(0, i * s); x.lineTo(w, i * s); x.stroke(); } }, { srgb: false });
  }
  function floorTexture() {
    return cTex(1024, 1024, (x, w, h) => {
      x.fillStyle = '#2d3f43'; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) { const g = x.createRadialGradient(Math.random() * w, Math.random() * h, 0, Math.random() * w, Math.random() * h, 160); g.addColorStop(0, 'rgba(70,95,98,.18)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); }
      for (let i = 0; i < 7000; i++) { const l = Math.random() < .5; x.fillStyle = l ? 'rgba(110,135,138,.35)' : 'rgba(10,20,22,.35)'; x.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6); }
      x.strokeStyle = 'rgba(8,16,18,.7)'; x.lineWidth = 3; x.strokeRect(0, 0, w, h);
    }, { repeat: [1, 1] });
  }
  function brushTexture() {
    return cTex(512, 512, (x, w, h) => {
      x.fillStyle = '#8a8a8a'; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 2400; i++) { const v = 90 + Math.random() * 90; x.strokeStyle = `rgba(${v},${v},${v},.5)`; x.lineWidth = 1; const y = Math.random() * h; x.beginPath(); x.moveTo(0, y); x.lineTo(w, y + (Math.random() - .5) * 2); x.stroke(); }
    }, { srgb: false, repeat: [2, 2] });
  }
  function swirlTexture() {
    return cTex(256, 128, (x, w, h) => {
      x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 26; i++) { const gv = Math.floor(150 + Math.random() * 70); x.fillStyle = `rgba(${gv},${gv},${gv},.5)`; x.fillRect(Math.random() * w, 0, 4 + Math.random() * 16, h); }
    }, { repeat: [3, 2] });
  }
  function gaugeFace(label, lo, hi, red) {
    return cTex(256, 256, (x) => {
      x.fillStyle = '#f4f6f4'; x.beginPath(); x.arc(128, 128, 124, 0, 7); x.fill();
      x.strokeStyle = '#111'; x.lineWidth = 3; x.fillStyle = '#111'; x.font = '600 18px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      for (let i = 0; i <= 10; i++) {
        const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5, c = Math.cos(a), s = Math.sin(a), big = i % 5 === 0;
        x.beginPath(); x.moveTo(128 + c * 108, 128 + s * 108); x.lineTo(128 + c * (big ? 90 : 98), 128 + s * (big ? 90 : 98)); x.stroke();
        if (big) x.fillText(String(Math.round(lo + (hi - lo) * i / 10)), 128 + c * 72, 128 + s * 72);
      }
      if (red) { x.strokeStyle = '#d33'; x.lineWidth = 8; x.beginPath(); x.arc(128, 128, 112, Math.PI * (0.75 + 1.5 * red), Math.PI * 2.25); x.stroke(); }
      x.fillStyle = '#333'; x.font = '700 20px sans-serif'; x.fillText(label, 128, 178);
    });
  }
  function signTex(w, h, bg, fg, lines, size) {
    return cTex(w, h, (x) => {
      x.fillStyle = bg; x.fillRect(0, 0, w, h);
      x.strokeStyle = fg; x.lineWidth = 6; x.strokeRect(10, 10, w - 20, h - 20);
      x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
      const n = lines.length;
      lines.forEach((t, i) => { x.font = `700 ${(size || 44) * (i === 0 ? 1 : .7)}px 'Barlow Condensed',Arial Narrow,sans-serif`; x.fillText(t, w / 2, h * (i + 1) / (n + 1)); });
    });
  }

  /* ---------- mesh helpers ---------- */
  function add(parent, geo, mat, x, y, z, o) {
    const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0);
    o = o || {};
    m.castShadow = o.cast !== false; m.receiveShadow = o.recv !== false;
    if (o.rx) m.rotation.x = o.rx; if (o.ry) m.rotation.y = o.ry; if (o.rz) m.rotation.z = o.rz;
    parent.add(m); return m;
  }
  const box = (p, w, h, d, mat, x, y, z, o) => add(p, new THREE.BoxGeometry(w, h, d), mat, x, y, z, o);
  const cyl = (p, rt, rb, h, mat, x, y, z, o, seg) => add(p, new THREE.CylinderGeometry(rt, rb, h, seg || 40), mat, x, y, z, o);
  function tag(obj, id) { obj.traverse((m) => { if (m.isMesh) { m.userData.id = id; R.pick.push(m); } }); }

  function roundedPath(pts, r) {
    const path = new THREE.CurvePath();
    let cur = pts[0].clone();
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i], a = pts[i - 1], b = pts[i + 1];
      const d1 = p.clone().sub(a), d2 = b.clone().sub(p);
      const rr = Math.min(r, d1.length() / 2, d2.length() / 2);
      const s = p.clone().sub(d1.normalize().multiplyScalar(rr)), e = p.clone().add(d2.normalize().multiplyScalar(rr));
      path.add(new THREE.LineCurve3(cur, s)); path.add(new THREE.QuadraticBezierCurve3(s, p.clone(), e)); cur = e;
    }
    path.add(new THREE.LineCurve3(cur, pts[pts.length - 1].clone()));
    return path;
  }
  function pipe(parent, pts, rad, mat, o) {
    const v = pts.map((p) => new V3(p[0], p[1], p[2]));
    const path = roundedPath(v, (o && o.bend) || 0.14);
    const len = path.getLength();
    const m = new THREE.Mesh(new THREE.TubeGeometry(path, Math.max(12, Math.floor(len * 26)), rad, 14, false), mat);
    m.castShadow = true; m.receiveShadow = true; m.userData.path = path; parent.add(m);
    // flanges at every straight run end and clamps along it
    for (let i = 0; i < v.length; i++) {
      if (o && o.noFlange) break;
      if (i === 0 || i === v.length - 1) {
        const dir = (i === 0 ? v[1].clone().sub(v[0]) : v[i].clone().sub(v[i - 1])).normalize();
        const f = new THREE.Mesh(new THREE.CylinderGeometry(rad * 1.7, rad * 1.7, 0.03, 20), M.steel);
        f.position.copy(v[i]); f.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir); f.castShadow = true; parent.add(f);
      }
    }
    return m;
  }
  function valve(parent, x, y, z, axis, col) {
    const g = new THREE.Group(); g.position.set(x, y, z);
    add(g, new THREE.SphereGeometry(0.075, 20, 14), M.steel, 0, 0, 0);
    const st = cyl(g, 0.014, 0.014, 0.16, M.steel, 0, 0.1, 0, null, 10);
    const wh = add(g, new THREE.TorusGeometry(0.07, 0.011, 8, 26), col || M.red, 0, 0.19, 0, { rx: Math.PI / 2 });
    for (let i = 0; i < 4; i++) { const sp = box(g, 0.14, 0.008, 0.008, col || M.red, 0, 0.19, 0); sp.rotation.y = i * Math.PI / 4; }
    if (axis === 'x') g.rotation.z = Math.PI / 2; else if (axis === 'z') g.rotation.x = Math.PI / 2;
    parent.add(g); return g;
  }
  function gauge(parent, x, y, z, ry, tex, dyn) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry || 0; parent.add(g);
    cyl(g, 0.095, 0.095, 0.05, M.steel, 0, 0, 0, null, 28).rotation.x = Math.PI / 2;
    const f = new THREE.Mesh(new THREE.CircleGeometry(0.082, 32), new THREE.MeshBasicMaterial({ map: tex })); f.position.z = 0.027; g.add(f);
    const gl = new THREE.Mesh(new THREE.CircleGeometry(0.084, 32), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, roughness: 0.03, metalness: 0, clearcoat: 1 })); gl.position.z = 0.034; g.add(gl);
    const needle = new THREE.Group(); needle.position.z = 0.03; g.add(needle);
    const nb = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.07, 0.003), new THREE.MeshBasicMaterial({ color: 0xcc2222 })); nb.position.y = 0.03; needle.add(nb);
    needle.rotation.z = Math.PI * 0.75; g.userData.needle = needle;
    return g;
  }
  const needleAngle = (f) => Math.PI * 0.75 - clamp(f, 0, 1) * Math.PI * 1.5;

  /* ---------- environment light for reflections ---------- */
  function buildEnv() {
    const s = new THREE.Scene();
    s.add(new THREE.Mesh(new THREE.BoxGeometry(24, 9, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.26, 0.31, 0.33), side: THREE.BackSide })));
    const pm = new THREE.MeshBasicMaterial({ color: new THREE.Color(7, 7.4, 7.8) });
    for (let i = -2; i <= 2; i++) for (let j = -1; j <= 1; j++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.7), pm); p.position.set(i * 4.4, 4.45, j * 5); p.rotation.x = Math.PI / 2; s.add(p); }
    const warm = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.8, 1.2) });
    const w1 = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.2), warm); w1.position.set(-11.8, 2, 0); w1.rotation.y = Math.PI / 2; s.add(w1);
    const cool = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.7, 1.3, 2.0) });
    const w2 = new THREE.Mesh(new THREE.PlaneGeometry(6, 2), cool); w2.position.set(11.8, 1.6, 2); w2.rotation.y = -Math.PI / 2; s.add(w2);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const rt = pmrem.fromScene(s, 0.035);
    pmrem.dispose();
    return rt.texture;
  }

  function buildMaterials() {
    const brush = brushTexture();
    M.steel = new THREE.MeshStandardMaterial({ color: 0xdde3e6, metalness: 1, roughness: 0.5, roughnessMap: brush, envMapIntensity: 1.0 });
    M.steelDark = new THREE.MeshStandardMaterial({ color: 0x8e979c, metalness: 1, roughness: 0.55, roughnessMap: brush, envMapIntensity: 0.9 });
    M.paint = new THREE.MeshStandardMaterial({ color: 0x35515a, metalness: 0.25, roughness: 0.42, envMapIntensity: 0.8 });
    M.paintLight = new THREE.MeshStandardMaterial({ color: 0xcdd6d6, metalness: 0.1, roughness: 0.4, envMapIntensity: 0.8 });
    M.rubber = new THREE.MeshStandardMaterial({ color: 0x1a1f21, roughness: 0.8, metalness: 0 });
    M.black = new THREE.MeshStandardMaterial({ color: 0x0c0f10, roughness: 0.35, metalness: 0.4 });
    M.red = new THREE.MeshStandardMaterial({ color: 0xc8322a, roughness: 0.4, metalness: 0.3 });
    M.yellow = new THREE.MeshStandardMaterial({ color: 0xe8b21c, roughness: 0.5, metalness: 0.2 });
    M.hotPipe = new THREE.MeshStandardMaterial({ color: 0xb23a2c, roughness: 0.38, metalness: 0.45, envMapIntensity: 0.9 });
    M.coldPipe = new THREE.MeshStandardMaterial({ color: 0x2e6fa6, roughness: 0.38, metalness: 0.45, envMapIntensity: 0.9 });
    M.glass = new THREE.MeshPhysicalMaterial({ color: 0xcfe8ee, metalness: 0, roughness: 0.03, transparent: true, opacity: 0.16, side: THREE.DoubleSide, clearcoat: 1, envMapIntensity: 1.6, depthWrite: false });
    M.glassBottle = new THREE.MeshPhysicalMaterial({ color: 0xcfe8ee, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.28, clearcoat: 1, envMapIntensity: 1.4, depthWrite: false });
    const tile = tileTexture(), bump = tileBump();
    M.tile = (len, h) => { const t = tile.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(len / 1.2, h / 1.2); const b = bump.clone(); b.needsUpdate = true; b.wrapS = b.wrapT = THREE.RepeatWrapping; b.repeat.set(len / 1.2, h / 1.2); return new THREE.MeshStandardMaterial({ map: t, bumpMap: b, bumpScale: 1.2, roughness: 0.22, metalness: 0, envMapIntensity: 0.7 }); };
    M.wallPaint = new THREE.MeshStandardMaterial({ color: 0xcfd9d6, roughness: 0.85, metalness: 0 });
    const ft = floorTexture(); ft.repeat.set(4.6, 3.7);
    M.floor = new THREE.MeshStandardMaterial({ map: ft, roughness: 0.2, metalness: 0.15, envMapIntensity: 1.25 });
    M.ceil = new THREE.MeshStandardMaterial({ color: 0xaeb9ba, roughness: 0.9 });
    M.led = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.7, 2.8) });
  }

  /* ---------- the room ---------- */
  function buildRoom() {
    const W = 9.2, D = 7.4, H = 3.5, x0 = -4.6, z0 = -4.2;
    // floor
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(W, D), M.floor); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, z0 + D / 2); fl.receiveShadow = true; scene.add(fl);
    // ceiling
    const ce = new THREE.Mesh(new THREE.PlaneGeometry(W, D), M.ceil); ce.rotation.x = Math.PI / 2; ce.position.set(0, H, z0 + D / 2); scene.add(ce);
    // walls: tiled to 2.2 m, painted above, teal trim between
    const wall = (len, cx, cz, ry) => {
      const g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = ry; scene.add(g);
      const lo = new THREE.Mesh(new THREE.PlaneGeometry(len, 2.2), M.tile(len, 2.2)); lo.position.y = 1.1; lo.receiveShadow = true; g.add(lo);
      const hi = new THREE.Mesh(new THREE.PlaneGeometry(len, H - 2.28), M.wallPaint); hi.position.y = 2.28 + (H - 2.28) / 2; hi.receiveShadow = true; g.add(hi);
      const tr = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.08), new THREE.MeshStandardMaterial({ color: 0x1f8a86, roughness: 0.4, metalness: 0.2 })); tr.position.set(0, 2.24, 0.002); g.add(tr);
      const sk = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, 0.03), new THREE.MeshStandardMaterial({ color: 0x1a2427, roughness: 0.6 })); sk.position.set(0, 0.06, 0.012); g.add(sk);
      return g;
    };
    R.wallFront = wall(W, 0, z0, 0);
    R.wallBack = wall(W, 0, z0 + D, Math.PI);
    R.wallLeft = wall(D, x0, z0 + D / 2, Math.PI / 2);
    R.wallRight = wall(D, x0 + W, z0 + D / 2, -Math.PI / 2);
    // ceiling beams, LED panels, ducts, cable tray
    for (let i = -3; i <= 3; i++) box(scene, 0.12, 0.2, D, M.paintLight, i * 1.5, H - 0.1, z0 + D / 2, { cast: false });
    for (let i = -1; i <= 1; i++) for (let j = 0; j < 3; j++) {
      const p = box(scene, 1.2, 0.04, 0.34, M.led, i * 2.3 + (j % 2 ? 0.0 : 0), H - 0.2, -2.6 + j * 2.5, { cast: false, recv: false });
    }
    cyl(scene, 0.26, 0.26, D, M.steelDark, -3.5, 3.14, z0 + D / 2, { rx: Math.PI / 2 }, 28);
    cyl(scene, 0.26, 0.26, D, M.steelDark, 3.7, 3.14, z0 + D / 2, { rx: Math.PI / 2 }, 28);
    for (let k = 0; k < 6; k++) { box(scene, 0.04, 0.2, 0.62, M.steelDark, -3.5, 3.14, -3.6 + k * 1.3, { cast: false }); box(scene, 0.04, 0.2, 0.62, M.steelDark, 3.7, 3.14, -3.6 + k * 1.3, { cast: false }); }
    const tray = box(scene, 0.5, 0.06, D, M.steelDark, 0.0, 3.28, z0 + D / 2, { cast: false });
    for (let i = 0; i < 40; i++) box(scene, 0.4, 0.012, 0.02, M.steelDark, 0, 3.31, z0 + 0.2 + i * (D / 40), { cast: false });
    for (let i = 0; i < 6; i++) cyl(scene, 0.012, 0.012, D, M.rubber, -0.18 + i * 0.07, 3.335, z0 + D / 2, { rx: Math.PI / 2, cast: false }, 8);
    // sprinkler heads
    for (let i = -1; i <= 1; i += 2) for (let j = 0; j < 2; j++) { cyl(scene, 0.015, 0.015, 0.12, M.red, i * 1.2, 3.38, -3 + j * 4, { cast: false }, 8); add(scene, new THREE.SphereGeometry(0.04, 12, 8), M.red, i * 1.2, 3.31, -3 + j * 4, { cast: false }); }
    // floor: hazard border round the reactor, drain, yellow walkway line
    const stripe = cTex(512, 64, (x, w, h) => { x.fillStyle = '#e6b61a'; x.fillRect(0, 0, w, h); x.fillStyle = '#15191a'; for (let i = -2; i < 18; i++) { x.beginPath(); x.moveTo(i * 32, h); x.lineTo(i * 32 + 16, h); x.lineTo(i * 32 + 48, 0); x.lineTo(i * 32 + 32, 0); x.fill(); } }, { repeat: [1, 1] });
    const sm = new THREE.MeshStandardMaterial({ map: stripe, roughness: 0.35, metalness: 0.05 });
    const strip = (w, d, x, z, rep) => { const t = stripe.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, 1); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: t, roughness: 0.35 })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.004, z); m.receiveShadow = true; scene.add(m); };
    strip(2.6, 0.1, 0, -0.62, 6); strip(2.6, 0.1, 0, -3.38, 6);
    const sideStrip = (x) => { const t = stripe.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 1); const m = new THREE.Mesh(new THREE.PlaneGeometry(2.78, 0.1), new THREE.MeshStandardMaterial({ map: t, roughness: 0.35 })); m.rotation.x = -Math.PI / 2; m.rotation.z = Math.PI / 2; m.position.set(x, 0.004, -2.0); m.receiveShadow = true; scene.add(m); };
    sideStrip(-1.3); sideStrip(1.3);
    const drain = add(scene, new THREE.CircleGeometry(0.16, 28), M.black, 0.9, 0.006, -0.1, { rx: -Math.PI / 2, cast: false });
    for (let i = -3; i <= 3; i++) box(scene, 0.26, 0.006, 0.012, M.steelDark, 0.9, 0.012, -0.1 + i * 0.04, { cast: false });
    // signs
    const signMat = (t) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.5, metalness: 0.1 });
    const sign = (w, h, tex, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), signMat(tex)); m.position.set(x, y, z); m.rotation.y = ry || 0; m.receiveShadow = true; scene.add(m); return m; };
    sign(1.5, 0.38, signTex(768, 190, '#0f2a2c', '#7fe0d0', ['REACTOR SUITE 3', 'Amylase line · glucose syrup'], 76), 0, 2.62, -4.19, 0);
    sign(0.6, 0.8, signTex(300, 400, '#e6b61a', '#15191a', ['EYE PROTECTION', 'REQUIRED'], 50), -3.2, 1.45, -4.19, 0);
    sign(0.6, 0.8, signTex(300, 400, '#15191a', '#e6b61a', ['HOT SURFACES', 'Do not touch pipework'], 50), 3.3, 1.45, -4.19, 0);
    sign(0.9, 0.3, signTex(450, 150, '#0e5a38', '#f0fff6', ['EXIT'], 70), -1.3, 2.75, 3.19, Math.PI);
    // wall extinguisher
    const ex = new THREE.Group(); ex.position.set(-4.5, 0.55, 2.35); scene.add(ex);
    cyl(ex, 0.07, 0.07, 0.5, M.red, 0, 0, 0, null, 20); cyl(ex, 0.03, 0.03, 0.08, M.black, 0, 0.29, 0, null, 12); add(ex, new THREE.SphereGeometry(0.07, 18, 8, 0, 6.3, 0, 1.57), M.red, 0, 0.25, 0);
    // pipes along the front wall (headers), brackets and valves
    const hdr = [[3.12, M.steel, 0.07], [2.86, M.coldPipe, 0.05], [2.64, M.hotPipe, 0.05]];
    hdr.forEach(([y, m, r], i) => { cyl(scene, r, r, W - 0.1, m, 0, y, -4.05, { rz: Math.PI / 2 }, 20); for (let k = -4; k <= 4; k++) box(scene, 0.03, 0.12 + i * 0.01, 0.1, M.steelDark, k * 1.0 + 0.3 * i, y, -4.1, { cast: false }); });
    for (let k = 0; k < 4; k++) valve(scene, -3.4 + k * 2.2, 3.12, -4.0, 'x', k % 2 ? M.red : M.yellow);
  }

  /* ---------- the reactor ---------- */
  function buildReactor() {
    const g = new THREE.Group(); g.position.set(0, 0, -2.0); scene.add(g); R.reactor = g;
    const rad = 0.72, hw = 0.42;
    for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2; box(g, 0.08, 0.52, 0.08, M.steel, Math.sin(a) * 0.58, 0.26, Math.cos(a) * 0.58); cyl(g, 0.07, 0.07, 0.02, M.steelDark, Math.sin(a) * 0.58, 0.01, Math.cos(a) * 0.58, null, 16); }
    cyl(g, rad, 0.12, 0.36, M.steel, 0, 0.68, 0, null, 56);                         // dish bottom
    cyl(g, rad, rad, 0.39, M.steel, 0, 1.055, 0, null, 64).material = M.steel;      // lower wall
    const mid = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 0.95, 64, 1, true, hw, Math.PI * 2 - 2 * hw), M.steel.clone()); mid.material.side = THREE.DoubleSide; mid.position.y = 1.725; mid.castShadow = true; g.add(mid);
    cyl(g, rad, rad, 0.3, M.steel, 0, 2.35, 0, null, 64);                           // upper wall
    const dome = add(g, new THREE.SphereGeometry(rad, 56, 14, 0, Math.PI * 2, 0, Math.PI / 2), M.steel, 0, 2.5, 0); dome.scale.y = 0.36;
    // window: glass + frame
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(rad + 0.012, rad + 0.012, 0.95, 28, 1, true, -hw, 2 * hw), M.glass); glass.position.y = 1.725; glass.renderOrder = 3; g.add(glass);
    const lip = (y) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rad + 0.03, rad + 0.03, 0.05, 28, 1, false, -hw - 0.05, 2 * hw + 0.1), M.steelDark); m.position.y = y; m.castShadow = true; g.add(m); };
    lip(1.25); lip(2.2);
    for (const s of [-1, 1]) { const a = s * (hw + 0.025); box(g, 0.05, 0.95, 0.06, M.steelDark, Math.sin(a) * (rad + 0.02), 1.725, Math.cos(a) * (rad + 0.02), { ry: a }); for (let k = 0; k < 7; k++) add(g, new THREE.SphereGeometry(0.014, 10, 8), M.steel, Math.sin(a) * (rad + 0.05), 1.3 + k * 0.14, Math.cos(a) * (rad + 0.05)); }
    // contents
    R.swirl = swirlTexture();
    R.liqPlane = new THREE.Plane(new V3(0, -1, 0), 2.05);   // the contents are cut off at the liquid level, so filling is just the plane rising
    R.liquidMat = new THREE.MeshPhysicalMaterial({ color: 0xe8e4d4, map: R.swirl, transparent: true, opacity: 0.95, roughness: 0.18, metalness: 0, clearcoat: 0.7, envMapIntensity: 0.6, depthWrite: true, side: THREE.DoubleSide, clippingPlanes: [R.liqPlane] });
    R.surfMat = R.liquidMat.clone(); R.surfMat.clippingPlanes = null; R.surfMat.map = null; R.surfMat.side = THREE.FrontSide;
    const liq = new THREE.Group(); g.add(liq); R.liquid = liq;
    add(liq, new THREE.CylinderGeometry(0.69, 0.1, 0.36, 48), R.liquidMat, 0, 0.68, 0, { cast: false });
    add(liq, new THREE.CylinderGeometry(0.69, 0.69, 1.19, 48), R.liquidMat, 0, 1.455, 0, { cast: false });
    liq.renderOrder = 1;
    R.surface = add(g, new THREE.CircleGeometry(0.69, 48), R.surfMat, 0, 2.05, 0, { rx: -Math.PI / 2, cast: false }); R.surface.renderOrder = 1;
    // agitator
    R.shaft = new THREE.Group(); R.shaft.position.set(0, 1.95, 0); g.add(R.shaft);
    cyl(R.shaft, 0.022, 0.022, 1.7, M.steel, 0, 0, 0, null, 12);
    for (const y of [-0.5, 0.0, 0.5]) for (let i = 0; i < 4; i++) { const b = box(R.shaft, 0.3, 0.07, 0.014, M.steel, 0, y, 0, { cast: false }); b.position.set(Math.cos(i * Math.PI / 2) * 0.17, y, Math.sin(i * Math.PI / 2) * 0.17); b.rotation.y = -i * Math.PI / 2; b.rotation.z = 0.5; }
    // motor, gearbox, manway, sensors
    cyl(g, 0.15, 0.15, 0.34, M.paint, 0, 3.05, 0, null, 32); cyl(g, 0.1, 0.12, 0.16, M.steelDark, 0, 2.85, 0, null, 24); cyl(g, 0.16, 0.16, 0.03, M.steel, 0, 3.23, 0, null, 24);
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; box(g, 0.01, 0.3, 0.02, M.steelDark, Math.cos(a) * 0.151, 3.05, Math.sin(a) * 0.151, { cast: false }).rotation.y = -a; }
    cyl(g, 0.2, 0.2, 0.06, M.steel, 0.38, 2.72, 0.12, { rz: -0.35 }, 28); cyl(g, 0.15, 0.15, 0.03, M.steelDark, 0.4, 2.77, 0.12, { rz: -0.35 }, 24);
    cyl(g, 0.02, 0.02, 0.5, M.steelDark, -0.3, 2.9, -0.2, null, 10); cyl(g, 0.04, 0.04, 0.14, M.black, -0.3, 3.17, -0.2, null, 12);
    // jacket bands that glow with the heater
    R.heatMat = new THREE.MeshStandardMaterial({ color: 0x3a1a10, emissive: 0xff5a1a, emissiveIntensity: 0, roughness: 0.45, metalness: 0.5 });
    R.coolMat = new THREE.MeshStandardMaterial({ color: 0x10283a, emissive: 0x2a9cff, emissiveIntensity: 0, roughness: 0.45, metalness: 0.5 });
    add(g, new THREE.TorusGeometry(rad + 0.025, 0.028, 12, 72), R.heatMat, 0, 1.0, 0, { rx: Math.PI / 2 });
    add(g, new THREE.TorusGeometry(rad + 0.025, 0.028, 12, 72), R.heatMat, 0, 2.32, 0, { rx: Math.PI / 2 });
    add(g, new THREE.TorusGeometry(rad + 0.01, 0.014, 10, 72), R.coolMat, 0, 0.92, 0, { rx: Math.PI / 2 });
    // nameplate and the little LCD under the window
    const np = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.12), new THREE.MeshStandardMaterial({ map: signTex(500, 120, '#c9d1d4', '#1b2a2e', ['REACTOR 3 · AMYLASE · 500 kg'], 40), metalness: 0.6, roughness: 0.35 })); np.position.set(0, 0.98, rad + 0.015); g.add(np);
    R.screens.tank = makeScreen(512, 256, 0.44, 0.22, g, 0, 1.12, rad + 0.02, 0);
    // bubbles
    const N = 90, pos = new Float32Array(N * 3), seeds = [];
    for (let i = 0; i < N; i++) { seeds.push({ x: rnd(-0.34, 0.34), z: rnd(0.08, 0.6), y: rnd(0.9, 2.05), v: rnd(0.12, 0.34), ph: rnd(0, 6) }); }
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dot = cTex(64, 64, (x) => { const gr = x.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(.5, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); });
    R.bubbles = new THREE.Points(bg, new THREE.PointsMaterial({ map: dot, size: 0.05, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
    R.bubbles.userData.seeds = seeds; R.bubbles.frustumCulled = false; R.bubbles.renderOrder = 2; g.add(R.bubbles);
    // the enzyme dose: amber specks that drift down through the slurry
    const DN = 70, dg = new THREE.BufferGeometry(), dseeds = []; dg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DN * 3), 3));
    for (let i = 0; i < DN; i++) dseeds.push({ x: rnd(-0.3, 0.3), z: rnd(0.05, 0.6), ph: rnd(0, 6), off: rnd(0, 0.55) });
    R.dose = new THREE.Points(dg, new THREE.PointsMaterial({ map: dot, size: 0.075, color: 0xffb02e, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
    R.dose.userData.seeds = dseeds; R.dose.frustumCulled = false; R.dose.renderOrder = 3; g.add(R.dose);
    // steam from the vent
    const SN = 40, sp = new Float32Array(SN * 3), sseeds = [];
    for (let i = 0; i < SN; i++) sseeds.push({ t: Math.random(), x: 0, z: 0 });
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const puff = cTex(64, 64, (x) => { const gr = x.createRadialGradient(32, 32, 0, 32, 32, 31); gr.addColorStop(0, 'rgba(235,245,250,.7)'); gr.addColorStop(1, 'rgba(235,245,250,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); });
    R.steam = new THREE.Points(sg, new THREE.PointsMaterial({ map: puff, size: 0.34, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true }));
    R.steam.userData.seeds = sseeds; R.steam.frustumCulled = false; R.steam.position.set(-0.3, 3.1, 0.05); g.add(R.steam);
    tag(g, 'reactor');
    // contact shadow
    const cs = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: cTex(128, 128, (x) => { const gr = x.createRadialGradient(64, 64, 20, 64, 64, 62); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); }), transparent: true, depthWrite: false })); cs.rotation.x = -Math.PI / 2; cs.position.set(0, 0.006, -2.0); scene.add(cs);
    // heater glow light
    R.heatLight = new THREE.PointLight(0xff7a30, 0, 4.5, 2); R.heatLight.position.set(0, 1.0, -1.1); scene.add(R.heatLight);

    /* feed tank (left) and hot-water tank (right), pumps, process pipes */
    const tank = (x, z, r, h, col, label, id) => {
      const t = new THREE.Group(); t.position.set(x, 0, z); scene.add(t);
      for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2; box(t, 0.06, 0.5, 0.06, M.steel, Math.sin(a) * r * 0.82, 0.25, Math.cos(a) * r * 0.82); }
      cyl(t, r, r * 0.2, 0.3, M.steel, 0, 0.65, 0, null, 40); cyl(t, r, r, h, M.steel, 0, 0.8 + h / 2, 0, null, 48);
      add(t, new THREE.SphereGeometry(r, 40, 10, 0, 6.29, 0, 1.5708), M.steel, 0, 0.8 + h, 0).scale.y = 0.35;
      add(t, new THREE.TorusGeometry(r + 0.012, 0.03, 10, 56), col, 0, 0.8 + h * 0.3, 0, { rx: Math.PI / 2 });
      add(t, new THREE.TorusGeometry(r + 0.012, 0.03, 10, 56), col, 0, 0.8 + h * 0.8, 0, { rx: Math.PI / 2 });
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.12), new THREE.MeshStandardMaterial({ map: signTex(460, 120, '#c9d1d4', '#1b2a2e', [label], 44), metalness: 0.5, roughness: 0.4 })); pl.position.set(0, 1.25, r + 0.02); t.add(pl);
      tag(t, id); return t;
    };
    R.feed = tank(-2.6, -3.0, 0.5, 1.3, M.yellow, 'STARCH FEED', 'feed');
    R.hot = tank(2.7, -3.0, 0.5, 1.3, M.hotPipe, 'HOT WATER', 'hot');
    R.hotGauge = gauge(scene, 2.7, 1.85, -2.48, 0, gaugeFace('°C', 0, 100, 0.8));
    R.feedGauge = gauge(scene, -2.6, 1.85, -2.48, 0, gaugeFace('bar', 0, 4));
    const pump = (x, z) => { const p = new THREE.Group(); p.position.set(x, 0, z); scene.add(p); box(p, 0.5, 0.05, 0.3, M.steelDark, 0, 0.025, 0); cyl(p, 0.11, 0.11, 0.32, M.paint, -0.12, 0.2, 0, { rz: Math.PI / 2 }, 28); cyl(p, 0.14, 0.14, 0.14, M.steel, 0.16, 0.2, 0, { rz: Math.PI / 2 }, 28); cyl(p, 0.05, 0.05, 0.16, M.steel, 0.16, 0.34, 0, null, 14); return p; };
    pump(1.35, -2.15); pump(-1.7, -2.6);
    const pp = [
      [[-2.1, 1.6, -3.0], [-1.0, 1.6, -3.0], [-1.0, 2.65, -3.0], [-1.0, 2.65, -2.0], [-0.5, 2.65, -2.0]],
      [[0, 0.5, -2.0], [0, 0.3, -2.0], [2.0, 0.3, -2.0], [4.1, 0.3, -2.0], [4.1, 2.9, -2.0]],
      [[0, 2.9, -2.0], [0, 3.22, -2.0], [-3.2, 3.22, -2.0]]
    ];
    R.feedPath = pipe(scene, pp[0], 0.05, M.steel).userData.path; R.outPath = pipe(scene, pp[1], 0.05, M.steel).userData.path; pipe(scene, pp[2], 0.045, M.steel);
    // slurry moving through the pipe while the tank is filled or drained
    const FN = 44, fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(FN * 3), 3));
    R.flow = new THREE.Points(fg, new THREE.PointsMaterial({ map: dot, size: 0.12, color: 0xf3efe0, transparent: true, opacity: 0.95, depthWrite: false, sizeAttenuation: true })); R.flow.frustumCulled = false; R.flow.visible = false; scene.add(R.flow);
    pipe(scene, [[2.2, 1.3, -3.0], [1.1, 1.3, -3.0], [1.1, 1.3, -2.0], [0.78, 1.3, -2.0]], 0.04, M.hotPipe);
    pipe(scene, [[2.2, 0.95, -3.0], [1.3, 0.95, -3.0], [1.3, 0.95, -2.35], [0.74, 0.95, -2.35]], 0.04, M.coldPipe);
    valve(scene, 1.6, 1.3, -3.0, 'x', M.red); valve(scene, 1.7, 0.95, -3.0, 'x', M.red); valve(scene, 2.4, 0.3, -2.0, 'x', M.yellow); valve(scene, -1.0, 2.1, -3.0, 'y', M.yellow);
    // sample port with a glass spigot
    cyl(g, 0.025, 0.025, 0.2, M.steel, -0.7, 1.35, 0.15, { rz: Math.PI / 2 }, 12); valve(scene, -0.95, 1.35, -1.85, 'z', M.yellow);
    tag(R.feed, 'feed'); tag(R.hot, 'hot');
  }

  function makeScreen(w, h, pw, ph, parent, x, y, z, ry, basic) {
    const t = cTex(w, h, (c) => { c.fillStyle = '#04100f'; c.fillRect(0, 0, w, h); });
    const mat = new THREE.MeshBasicMaterial({ map: t, toneMapped: false });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), mat); m.position.set(x, y, z); m.rotation.y = ry || 0; parent.add(m);
    return { tex: t, canvas: t.userData.canvas, ctx: t.userData.ctx, mesh: m, w, h };
  }

  /* ---------- control console ---------- */
  function buildConsole() {
    const g = new THREE.Group(); g.position.set(3.45, 0, -0.6); g.rotation.y = -Math.PI / 2; scene.add(g); R.console = g;
    box(g, 1.7, 0.98, 0.7, M.paint, 0, 0.5, 0); box(g, 1.72, 0.04, 0.72, M.steel, 0, 0.02, 0);
    for (let i = 0; i < 6; i++) box(g, 0.2, 0.62, 0.012, M.black, -0.65 + i * 0.26, 0.45, 0.352, { cast: false });   // door panels
    const topTex = cTex(1024, 366, (x, w, h) => {
      x.fillStyle = '#20343a'; x.fillRect(0, 0, w, h);
      x.strokeStyle = 'rgba(190,230,225,.5)'; x.lineWidth = 3; x.fillStyle = '#d7e6e3'; x.font = "600 22px 'Barlow Condensed',Arial Narrow"; x.textAlign = 'center';
      x.strokeRect(24, 24, 330, 318); x.fillText('TEMPERATURE SETPOINT', 189, 56);
      x.strokeRect(380, 24, 330, 130); x.fillText('REACTOR STATUS', 545, 56);
      x.strokeRect(736, 24, 264, 318); x.fillText('BATCH CONTROL', 868, 56);
      x.fillStyle = '#9fb8b5'; x.font = "500 18px 'Barlow Condensed',Arial Narrow";
      for (let i = 0; i <= 12; i++) { const a = -Math.PI * 0.75 + i / 12 * Math.PI * 1.5; x.save(); x.translate(189, 205); x.rotate(a); x.fillRect(-1.5, -118, 3, i % 3 === 0 ? 16 : 8); x.restore(); }
      x.fillStyle = '#ffd488'; x.textAlign = 'center'; x.font = "600 20px 'Barlow Condensed',Arial Narrow";
      x.fillText('15', 100, 300); x.fillText('75', 278, 300); x.fillText('45', 189, 112);
      x.fillStyle = '#d7e6e3'; x.fillText('CHARGE', 810, 140); x.fillText('START', 868, 140); x.fillText('FLUSH', 926, 140);
    });
    const topMats = [M.paint, M.paint, new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.35, metalness: 0.2 }), M.paint, M.paint, M.paint];
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.05, 0.62), topMats); panel.position.set(0, 1.07, 0.03); panel.rotation.x = 0.5; panel.castShadow = true; g.add(panel);
    // dial knob (turns with the setpoint)
    R.knob = new THREE.Group(); R.knob.position.set(-0.52 + 0.0, 0.05, 0.02); panel.add(R.knob);
    cyl(R.knob, 0.085, 0.09, 0.05, M.black, 0, 0.0, 0, null, 36); cyl(R.knob, 0.07, 0.07, 0.02, M.rubber, 0, 0.035, 0, null, 36);
    box(R.knob, 0.012, 0.012, 0.062, M.yellow, 0, 0.048, -0.025, { cast: false });
    cyl(panel, 0.11, 0.11, 0.008, M.steelDark, -0.52, 0.027, 0.02, null, 36);
    // screens on the panel
    const scr = (w, h, pw, ph, x, z) => { const s = makeScreen(w, h, pw, ph, panel, x, 0.028, z, 0); s.mesh.rotation.x = -Math.PI / 2; return s; };
    R.screens.cons = scr(512, 200, 0.6, 0.23, -0.02, -0.06);
    // lamps and buttons
    R.lamps = {};
    const lamp = (name, x, z, col) => { const m = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.1, roughness: 0.3 }); const c = cyl(panel, 0.022, 0.022, 0.018, m, x, 0.03, z, null, 16); R.lamps[name] = m; };
    lamp('charged', 0.26, -0.215, 0xffb02e); lamp('run', 0.34, -0.215, 0x4fe0a0); lamp('heat', 0.42, -0.215, 0xff6a3d);
    const btn = (x, col, id) => { const m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, metalness: 0.2, emissive: col, emissiveIntensity: 0.12 }); cyl(panel, 0.034, 0.034, 0.03, m, x, 0.035, 0.12, null, 24); return m; };
    R.btnMats = [btn(0.43, 0xe8a418), btn(0.55, 0x2fbf71), btn(0.67, 0xc8322a)];
    cyl(panel, 0.05, 0.05, 0.02, M.yellow, 0.7, 0.03, -0.15, null, 24); cyl(panel, 0.036, 0.04, 0.035, M.red, 0.7, 0.05, -0.15, null, 24);
    // monitor on top
    box(g, 0.08, 0.34, 0.06, M.steelDark, 0.35, 1.5, -0.22); box(g, 0.64, 0.4, 0.045, M.black, 0.35, 1.78, -0.2);
    R.screens.mimic = makeScreen(512, 320, 0.58, 0.34, g, 0.35, 1.78, -0.176, 0);
    // pocket of clutter: clipboard, mug, goggles
    tag(g, 'console');
    // hint light
  }

  /* ---------- wall dashboard ---------- */
  function buildDashboard() {
    const g = new THREE.Group(); g.position.set(-4.56, 1.95, -1.3); g.rotation.y = Math.PI / 2; scene.add(g);
    box(g, 3.5, 1.98, 0.08, M.black, 0, 0, 0); box(g, 3.56, 2.04, 0.03, M.steelDark, 0, 0, -0.03);
    R.screens.dash = makeScreen(1600, 900, 3.34, 1.88, g, 0, 0, 0.042, 0);
    const l = new THREE.PointLight(0x58c8ff, 0.7, 5.5, 2); l.position.set(-3.6, 1.95, -1.3); scene.add(l); R.dashLight = l;
    box(g, 0.1, 0.1, 0.3, M.steelDark, 0, 1.06, -0.1);
    tag(g, 'dash');
  }

  /* ---------- molecular terminal workstation ---------- */
  function buildTerminal() {
    const g = new THREE.Group(); g.position.set(-4.2, 0, 1.55); g.rotation.y = Math.PI / 2; scene.add(g);
    box(g, 1.7, 0.05, 0.72, M.paintLight, 0, 0.8, 0); box(g, 1.64, 0.76, 0.66, M.paint, 0, 0.38, 0);
    for (let i = 0; i < 3; i++) { box(g, 0.5, 0.64, 0.012, M.black, -0.52 + i * 0.52, 0.4, 0.336, { cast: false }); box(g, 0.1, 0.014, 0.014, M.steel, -0.52 + i * 0.52, 0.62, 0.35, { cast: false }); }
    box(g, 0.1, 0.34, 0.07, M.steelDark, 0.0, 1.0, -0.12); box(g, 0.7, 0.44, 0.04, M.black, 0.0, 1.32, -0.12);
    R.screens.term = makeScreen(640, 400, 0.66, 0.4, g, 0.0, 1.32, -0.098, 0);
    box(g, 0.44, 0.014, 0.16, M.black, 0.02, 0.83, 0.18); box(g, 0.06, 0.02, 0.1, M.black, 0.42, 0.835, 0.18);
    // sample port: a cartridge unit with three glowing vials
    box(g, 0.5, 0.36, 0.3, M.paintLight, -0.55, 1.0, -0.06);
    const vm = [0x55c8ff, 0xffb02e, 0xe8e4d4];
    vm.forEach((c, i) => { const v = new THREE.Group(); v.position.set(-0.7 + i * 0.14, 1.06, 0.1); g.add(v); add(v, new THREE.CylinderGeometry(0.03, 0.03, 0.18, 14), M.glassBottle, 0, 0, 0, { cast: false }); add(v, new THREE.CylinderGeometry(0.026, 0.026, 0.1, 14), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.35, roughness: 0.2, transparent: true, opacity: 0.9 }), 0, -0.03, 0, { cast: false }); });
    box(g, 0.34, 0.08, 0.2, M.black, -0.55, 0.86, 0.04);
    // stool
    const st = new THREE.Group(); st.position.set(-3.45, 0, 1.55); scene.add(st);
    cyl(st, 0.2, 0.2, 0.06, M.rubber, 0, 0.62, 0, null, 28); cyl(st, 0.03, 0.03, 0.55, M.steel, 0, 0.32, 0, null, 12); cyl(st, 0.22, 0.22, 0.02, M.steel, 0, 0.02, 0, null, 24);
    tag(g, 'terminal');
    // benches and glassware along the left wall
    const bench = new THREE.Group(); bench.position.set(-4.2, 0, -2.5); scene.add(bench);
    box(bench, 0.72, 0.05, 2.6, M.steel, 0, 0.9, 0); box(bench, 0.66, 0.88, 2.5, M.paint, 0, 0.44, 0);
    for (let i = 0; i < 4; i++) box(bench, 0.01, 0.7, 0.58, M.black, 0.335, 0.42, -0.95 + i * 0.63, { cast: false });
    const flask = (x, z, col, s) => { const pts = [new THREE.Vector2(0.001, 0), new THREE.Vector2(0.09 * s, 0), new THREE.Vector2(0.1 * s, 0.01), new THREE.Vector2(0.03 * s, 0.17 * s), new THREE.Vector2(0.03 * s, 0.24 * s), new THREE.Vector2(0.036 * s, 0.25 * s)]; const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), M.glassBottle); m.position.set(x, 0.925, z); m.castShadow = true; bench.add(m); const lp = [new THREE.Vector2(0.001, 0.01), new THREE.Vector2(0.088 * s, 0.01), new THREE.Vector2(0.05 * s, 0.1 * s), new THREE.Vector2(0.001, 0.1 * s)]; const l = new THREE.Mesh(new THREE.LatheGeometry(lp, 24), new THREE.MeshStandardMaterial({ color: col, roughness: 0.2, transparent: true, opacity: 0.85 })); l.position.set(x, 0.925, z); bench.add(l); };
    flask(0, -0.9, 0xe8c04a, 1); flask(0, -0.6, 0x55b8e0, 0.85); flask(0.05, -0.25, 0xd8d4c0, 1.1);
    for (let i = 0; i < 4; i++) { const b = cyl(bench, 0.045, 0.045, 0.2 + i * 0.02, M.glassBottle, 0.1, 1.03, 0.2 + i * 0.12, { cast: true }, 18); cyl(bench, 0.036, 0.036, 0.1, new THREE.MeshStandardMaterial({ color: [0x4fe0a0, 0xffb02e, 0x55c8ff, 0xe58fbf][i], roughness: 0.2, transparent: true, opacity: 0.85 }), 0.1, 0.98, 0.2 + i * 0.12, { cast: false }, 18); }
    box(bench, 0.4, 0.18, 0.3, M.paintLight, 0.0, 1.0, 0.95); box(bench, 0.34, 0.012, 0.24, M.black, 0, 1.095, 0.95);
    // sink with tap
    box(bench, 0.5, 0.05, 0.5, M.steelDark, 0, 0.93, 1.1, { cast: false }); cyl(bench, 0.015, 0.015, 0.36, M.steel, -0.25, 1.1, 1.1, null, 10); cyl(bench, 0.012, 0.012, 0.22, M.steel, -0.14, 1.28, 1.1, { rz: Math.PI / 2 }, 10);
  }

  /* ---------- back of the room: door, enzyme store, shelves, coats, intercom ---------- */
  function buildBack() {
    // door
    const d = new THREE.Group(); d.position.set(-1.3, 0, 3.17); d.rotation.y = Math.PI; scene.add(d);
    box(d, 1.2, 2.2, 0.06, M.steel, 0, 1.1, 0); box(d, 1.3, 0.06, 0.1, M.black, 0, 2.23, 0); box(d, 0.06, 2.25, 0.1, M.black, -0.63, 1.12, 0); box(d, 0.06, 2.25, 0.1, M.black, 0.63, 1.12, 0);
    box(d, 0.34, 0.6, 0.02, new THREE.MeshStandardMaterial({ color: 0x2a4a50, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.7 }), 0, 1.6, 0.04, { cast: false });
    box(d, 0.9, 0.04, 0.05, M.steelDark, 0, 1.0, 0.06);
    // enzyme store: tall cooler with a glass door
    const f = new THREE.Group(); f.position.set(3.55, 0, 2.7); f.rotation.y = Math.PI; scene.add(f);
    box(f, 0.8, 1.9, 0.7, M.paintLight, 0, 0.95, 0);
    const gl = box(f, 0.7, 1.7, 0.02, new THREE.MeshPhysicalMaterial({ color: 0x9fd0e0, roughness: 0.04, transparent: true, opacity: 0.25, clearcoat: 1, depthWrite: false }), 0, 0.95, 0.36, { cast: false });
    box(f, 0.62, 1.5, 0.3, new THREE.MeshStandardMaterial({ color: 0x0a2230, emissive: 0x2a78a8, emissiveIntensity: 0.35, roughness: 0.5 }), 0, 0.95, 0.12, { cast: false });
    for (let i = 0; i < 4; i++) { box(f, 0.62, 0.012, 0.36, M.steel, 0, 0.35 + i * 0.36, 0.14, { cast: false }); for (let k = 0; k < 4; k++) box(f, 0.1, 0.2, 0.1, new THREE.MeshStandardMaterial({ color: [0xffb02e, 0xe8e4d4, 0x8a93ff][(i + k) % 3], roughness: 0.5 }), -0.22 + k * 0.145, 0.46 + i * 0.36, 0.14, { cast: false }); }
    box(f, 0.03, 0.4, 0.04, M.steel, 0.33, 0.95, 0.4);
    const lb = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.12), new THREE.MeshBasicMaterial({ map: signTex(500, 120, '#0a2230', '#8fe0ff', ['ENZYME STORE · 4 °C'], 48) })); lb.position.set(0, 1.97, 0.352); f.add(lb);
    tag(f, 'fridge');
    // shelving on the right wall
    const sh = new THREE.Group(); sh.position.set(4.35, 0, 1.0); sh.rotation.y = -Math.PI / 2; scene.add(sh);
    for (const x of [-0.6, 0.6]) box(sh, 0.04, 2.0, 0.4, M.steelDark, x, 1.0, 0);
    for (let k = 0; k < 4; k++) { box(sh, 1.24, 0.03, 0.4, M.steel, 0, 0.4 + k * 0.48, 0); for (let i = 0; i < 6; i++) { const h = 0.16 + Math.random() * 0.1; const c = [0xdfe6e8, 0xffb02e, 0x55c8ff, 0x4fe0a0, 0xe8e4d4][(i + k) % 5]; cyl(sh, 0.05, 0.05, h, new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, metalness: 0.1 }), -0.5 + i * 0.2, 0.4 + k * 0.48 + h / 2 + 0.015, 0, { cast: true }, 18); cyl(sh, 0.04, 0.04, 0.03, M.black, -0.5 + i * 0.2, 0.4 + k * 0.48 + h + 0.03, 0, { cast: false }, 14); } }
    // coats on hooks
    for (let i = 0; i < 3; i++) { const c = new THREE.Group(); c.position.set(0.3 + i * 0.4, 1.35, 3.12); scene.add(c); box(c, 0.36, 0.78, 0.07, new THREE.MeshStandardMaterial({ color: 0xeef2f0, roughness: 0.9 }), 0, 0, 0); box(c, 0.1, 0.62, 0.07, new THREE.MeshStandardMaterial({ color: 0xe6ebe9, roughness: 0.9 }), -0.2, -0.05, 0); box(c, 0.1, 0.62, 0.07, new THREE.MeshStandardMaterial({ color: 0xe6ebe9, roughness: 0.9 }), 0.2, -0.05, 0); box(c, 0.2, 0.06, 0.07, M.paint, 0, 0.36, 0.01); }
    box(scene, 1.3, 0.05, 0.05, M.steelDark, 0.7, 1.78, 3.15);
    // eyewash and shower
    const sw = new THREE.Group(); sw.position.set(-3.9, 0, 2.85); scene.add(sw);
    cyl(sw, 0.03, 0.03, 2.3, M.yellow, 0, 1.15, 0, null, 12); cyl(sw, 0.16, 0.16, 0.05, M.yellow, 0.14, 2.3, 0, null, 24); cyl(sw, 0.05, 0.05, 0.4, M.yellow, 0.14, 2.45, 0, null, 12);
    box(sw, 0.4, 0.2, 0.4, M.paintLight, 0.2, 0.95, 0.15); const bowl = add(sw, new THREE.CylinderGeometry(0.17, 0.12, 0.1, 24), new THREE.MeshStandardMaterial({ color: 0x3fa070, roughness: 0.3 }), 0.2, 1.1, 0.15);
    // intercom speaker: front wall, right of the reactor
    const ic = new THREE.Group(); ic.position.set(1.95, 2.45, -4.16); scene.add(ic); R.ic = ic;
    box(ic, 0.3, 0.38, 0.07, new THREE.MeshStandardMaterial({ color: 0xcdd3cf, roughness: 0.5, metalness: 0.2 }), 0, 0, 0);
    const grille = new THREE.Mesh(new THREE.CircleGeometry(0.11, 28), new THREE.MeshStandardMaterial({ map: cTex(128, 128, (x) => { x.fillStyle = '#2a3235'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#0a0d0e'; for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) { x.beginPath(); x.arc(10 + i * 9.4, 10 + j * 9.4, 2.6, 0, 7); x.fill(); } }), roughness: 0.6 })); grille.position.set(0, 0.04, 0.037); ic.add(grille);
    R.icMat = new THREE.MeshStandardMaterial({ color: 0x401010, emissive: 0xff3a1a, emissiveIntensity: 0.1, roughness: 0.3 });
    add(ic, new THREE.TorusGeometry(0.125, 0.012, 10, 36), R.icMat, 0, 0.04, 0.04, { cast: false });
    const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.05), new THREE.MeshBasicMaterial({ map: signTex(240, 50, '#cdd3cf', '#222', ['OFFICE · PRODUCTION'], 26) })); lbl.position.set(0, -0.15, 0.037); ic.add(lbl);
    R.icLight = new THREE.PointLight(0xff5a30, 0, 2.5, 2); R.icLight.position.set(1.95, 2.3, -3.8); scene.add(R.icLight);
    tag(ic, 'intercom');
    // wall clock above the door shows shift time
    R.screens.clock = makeScreen(256, 128, 0.5, 0.25, scene, -1.3, 2.62, 3.16, Math.PI);
  }

  /* ---------- the touchscreen you play on ---------- */
  const KIOSK = { x: 1.72, y: 1.55, z: 0.28, w: 1.92, h: 1.2, ry: Math.atan2(0.9 - 1.72, 2.35 - 0.28) };
  function buildKiosk() {
    const g = new THREE.Group(); g.position.set(KIOSK.x, KIOSK.y, KIOSK.z); g.rotation.y = KIOSK.ry; scene.add(g);
    box(g, KIOSK.w + 0.09, KIOSK.h + 0.09, 0.07, M.black, 0, 0, -0.045);
    box(g, KIOSK.w + 0.14, 0.03, 0.09, M.steel, 0, -KIOSK.h / 2 - 0.06, -0.045);
    cyl(g, 0.05, 0.05, KIOSK.y - KIOSK.h / 2 - 0.02, M.steelDark, 0, -KIOSK.h / 2 - (KIOSK.y - KIOSK.h / 2) / 2, -0.07, null, 20);
    cyl(g, 0.3, 0.32, 0.035, M.steel, 0, -KIOSK.y + 0.018, -0.07, null, 40);
    const led = new THREE.MeshBasicMaterial({ color: 0xffb02e }); box(g, KIOSK.w * 0.5, 0.012, 0.01, led, 0, KIOSK.h / 2 + 0.03, -0.005, { cast: false });
    const s = makeScreen(1600, 1000, KIOSK.w, KIOSK.h, g, 0, 0, 0.001, 0); s.tex.generateMipmaps = false; s.tex.minFilter = THREE.LinearFilter; s.mesh.material.fog = false;
    R.screens.kiosk = s;
  }
  function screenAt(cx, cy) {
    const c = renderer.domElement, r = c.getBoundingClientRect();
    v2.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(v2, camera);
    const hit = ray.intersectObject(R.screens.kiosk.mesh, false);
    return hit.length && hit[0].uv ? { x: hit[0].uv.x * 1600, y: (1 - hit[0].uv.y) * 1000 } : null;
  }

  /* ---------- lights ---------- */
  function buildLights() {
    scene.add(new THREE.HemisphereLight(0xdcecee, 0x1c2c30, 0.35));
    const pts = [[0, 3.2, -1.6], [-1.6, 3.2, 0.6], [1.6, 3.2, 0.6]];
    pts.forEach((p, i) => { const l = new THREE.PointLight(0xe6f2ff, i === 0 ? 0.9 : 0.7, 11, 1.5); l.position.set(p[0], p[1], p[2]); scene.add(l); });
    const s1 = new THREE.SpotLight(0xf4f9ff, 1.1, 14, 0.62, 0.55, 1.2); s1.position.set(0.4, 3.3, 1.0); s1.target.position.set(0, 1.3, -2.0); s1.castShadow = true; s1.shadow.mapSize.set(2048, 2048); s1.shadow.bias = -0.0004; s1.shadow.camera.near = 0.5; s1.shadow.camera.far = 14; scene.add(s1, s1.target);
    const s2 = new THREE.SpotLight(0xf4f9ff, 0.9, 12, 0.7, 0.6, 1.2); s2.position.set(2.2, 3.3, 0.4); s2.target.position.set(3.4, 0.9, -0.6); s2.castShadow = false; scene.add(s2, s2.target);
    const s3 = new THREE.SpotLight(0xf4f9ff, 0.8, 12, 0.7, 0.6, 1.2); s3.position.set(-2.2, 3.3, 1.5); s3.target.position.set(-4.0, 0.9, 1.5); s3.castShadow = false; scene.add(s3, s3.target);
  }

  /* ---------- public API ---------- */
  function init(canvas) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.localClippingEnabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x0a1113); scene.fog = new THREE.Fog(0x0b1416, 10, 24);
    camera = new THREE.PerspectiveCamera(62, 1, 0.05, 60); camera.rotation.order = 'YXZ';
    envTex = buildEnv(); scene.environment = envTex;
    buildMaterials(); buildRoom(); buildReactor(); buildConsole(); buildDashboard(); buildTerminal(); buildBack(); buildKiosk(); buildLights(); renderer.shadowMap.needsUpdate = true; R.shadowFrames = 6;
    R.anchors = { reactor: new V3(0, 1.75, -2.0), console: new V3(3.2, 1.35, -0.6), dash: new V3(-4.4, 2.0, -1.3), terminal: new V3(-4.1, 1.3, 1.55), fridge: new V3(3.55, 1.5, 2.3), hot: new V3(2.7, 1.5, -3.0), intercom: new V3(1.95, 2.45, -4.1) };
    resize();
  }
  function resize() {
    const c = renderer.domElement, w = c.clientWidth || innerWidth, h = c.clientHeight || innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
  function pickAt(cx, cy) {
    const c = renderer.domElement, r = c.getBoundingClientRect();
    v2.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(v2, camera);
    const hit = ray.intersectObjects(R.pick, false);
    return hit.length ? hit[0].object.userData.id : null;
  }
  function project(v, out) {
    const p = v.clone().project(camera);
    out.x = (p.x * 0.5 + 0.5) * renderer.domElement.clientWidth; out.y = (-p.y * 0.5 + 0.5) * renderer.domElement.clientHeight; out.z = p.z; return out;
  }
  function setIntercom(on) { R.icOn = on; }

  function update(dt, S) {
    const t = performance.now() / 1000;
    // impeller + swirl follow the run
    const spin = S.running ? 3.2 : 0;
    R.shaft.rotation.y += dt * spin;
    R.swirl.offset.x -= dt * spin * 0.05;
    // contents: milky starch slurry goes clear amber as it turns into syrup
    const c = clamp(S.conv, 0, 1);
    R.liquidMat.color.setRGB(lerp(0.91, 0.86, c), lerp(0.89, 0.58, c), lerp(0.82, 0.2, c));
    R.liquidMat.opacity = lerp(0.97, 0.55, c);
    const level = clamp(S.level == null ? 1 : S.level, 0, 1), ly = lerp(0.52, 2.05, level);
    R.liqPlane.constant = ly; R.liquid.visible = level > 0.004; R.surface.visible = level > 0.004; R.surface.position.y = ly;
    R.surfMat.color.copy(R.liquidMat.color); R.surfMat.opacity = Math.min(1, R.liquidMat.opacity + 0.04);
    // bubbles
    const bp = R.bubbles.geometry.attributes.position, seeds = R.bubbles.userData.seeds;
    const bubbleRate = S.running ? 0.35 + clamp((S.T - 20) / 40, 0, 1.2) : 0;
    for (let i = 0; i < seeds.length; i++) {
      const s = seeds[i]; s.y += dt * s.v * (0.2 + bubbleRate * 2.2); if (s.y > ly - 0.02) { s.y = rnd(0.6, Math.max(0.62, Math.min(1.1, ly - 0.05))); s.x = rnd(-0.34, 0.34); s.z = rnd(0.08, 0.6); }
      bp.setXYZ(i, s.x + Math.sin(t * 2 + s.ph) * 0.012, s.y, s.z);
    }
    bp.needsUpdate = true; R.bubbles.material.opacity = level < 0.3 ? 0 : (S.running ? 0.35 + Math.min(0.6, bubbleRate * 0.6) : 0.06);
    // steam
    const sp = R.steam.geometry.attributes.position, ss = R.steam.userData.seeds, hotf = clamp((S.T - 42) / 25, 0, 1);
    for (let i = 0; i < ss.length; i++) { const q = ss[i]; q.t += dt * (0.25 + 0.1 * i % 3 * 0.1); if (q.t > 1) { q.t = 0; q.x = rnd(-0.05, 0.05); q.z = rnd(-0.05, 0.05); } sp.setXYZ(i, q.x + q.t * 0.1 + Math.sin(q.t * 6 + i) * 0.03, q.t * 0.5, q.z); }
    sp.needsUpdate = true; R.steam.material.opacity = hotf * 0.45;
    // heater bands
    const heat = clamp(S.pw / 60, 0, 1), cool = clamp(-S.pw / 40, 0, 1);
    R.heatMat.emissiveIntensity = heat * 2.2 + (S.T > 45 ? 0.15 : 0); R.coolMat.emissiveIntensity = cool * 1.6;
    R.heatLight.intensity = heat * 0.9;
    // console bits
    const f = (clamp(S.Tset, 15, 75) - 15) / 60;
    R.knob.rotation.y = -(-Math.PI * 0.75 + f * Math.PI * 1.5);
    R.lamps.charged.emissiveIntensity = S.charged ? 1.6 : 0.08; R.lamps.run.emissiveIntensity = S.running ? 1.6 : 0.08; R.lamps.heat.emissiveIntensity = heat > 0.02 ? 1.6 : 0.08;
    R.hotGauge.userData.needle.rotation.z = needleAngle((S.T - 0) / 100 * 0.9 + 0.05 + (S.pw > 1 ? 0.04 : 0));
    // intercom glow
    const sp2 = R.icOn ? 0.5 + 0.5 * Math.sin(t * 14) : 0;
    R.icMat.emissiveIntensity = R.icOn ? 1.2 + sp2 * 1.4 : 0.1; R.icLight.intensity = R.icOn ? 0.5 + sp2 * 0.5 : 0;
    // pumping: slurry particles run along the pipe, and the feed tank gauge falls as the reactor fills
    const busy = !!(S.filling || S.draining);
    R.flow.visible = busy;
    if (busy) {
      const path = S.draining ? R.outPath : R.feedPath, fp = R.flow.geometry.attributes.position, FN = fp.count;
      R.flow.material.color.set(S.draining ? 0xe6b24a : 0xf3efe0);
      for (let i = 0; i < FN; i++) { const u = (i / FN + t * 0.42) % 1, p = path.getPointAt(u); fp.setXYZ(i, p.x, p.y, p.z); }
      fp.needsUpdate = true;
    }
    R.feedGauge.userData.needle.rotation.z = needleAngle(0.82 - 0.6 * level);
    // the enzyme dose falling through the slurry
    const dv = clamp(S.dose || 0, 0, 1), dp = R.dose.geometry.attributes.position, dsd = R.dose.userData.seeds;
    R.dose.material.opacity = Math.sin(dv * Math.PI) * 0.95; R.dose.visible = dv > 0.01 && dv < 0.995;
    if (R.dose.visible) for (let i = 0; i < dsd.length; i++) { const q = dsd[i], k = clamp(dv * 1.4 - q.off, 0, 1); dp.setXYZ(i, q.x + Math.sin(t * 3 + q.ph) * 0.03, lerp(2.25, ly + 0.05, easeOut(k)), q.z); }
    dp.needsUpdate = true;
    if (R.shadowFrames > 0) { R.shadowFrames--; renderer.shadowMap.needsUpdate = true; }
    if (!covered) renderer.render(scene, camera);
  }

  return { cover: (v) => { covered = v; }, init, resize, update, pickAt, project, setIntercom, screenAt, KIOSK, get camera() { return camera; }, get renderer() { return renderer; }, R };
})();

/* ============================================================
   CAMERA: you stand in the lab; when a batch starts you step up to the screen
   ============================================================ */
const G = { started: false, molOpened: 0, stepSeen: new Set(), sandboxTemps: new Set(), speedKey: 3, ov: null };
function setOv() { }
const Nav = (function () {
  const cam = { x: 0.9, y: 1.62, z: 2.35, yaw: -0.17, pitch: -0.02, fov: 52 }, home = Object.assign({}, cam), off = { yaw: 0, pitch: 0 };
  let mode = 'room', drag = null;
  function frame(m) {
    if (m) mode = m;
    const aspect = Math.max(0.3, innerWidth / Math.max(1, innerHeight)), S = Lab.KIOSK;
    if (mode === 'room' && aspect >= 1.4 && innerHeight >= 560) Object.assign(home, { x: 0.9, y: 1.62, z: 2.35, yaw: -0.17, pitch: -0.02, fov: aspect < 1.6 ? 55 : 51 });
    else {   // face the screen square on and fill the view with it, leaving a strip at the top for subtitles
      const fov = 46, half = Math.tan(fov * Math.PI / 360), dist = Math.max((S.h / 2) / (half * 0.94), (S.w / 2) / (half * aspect * 0.97));
      const nx = Math.sin(S.ry), nz = Math.cos(S.ry);
      Object.assign(home, { x: S.x + nx * dist, y: S.y + S.h * 0.012, z: S.z + nz * dist, yaw: S.ry, pitch: 0, fov });
    }
    off.yaw = off.pitch = 0;
  }
  const init = () => bind($('#gl'));
  function bind(c) {
    c.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      try { c.setPointerCapture(e.pointerId); } catch (x) { /* ok */ }
      if (Ctl.down(e)) return;
      if (mode === 'room') drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
    });
    c.addEventListener('pointermove', (e) => {
      if (Ctl.dragging) { Ctl.move(e); return; }
      if (!drag || e.pointerId !== drag.id) { c.style.cursor = Ctl.over(e) || (mode === 'room' ? 'grab' : 'default'); return; }
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
      off.yaw = clamp(off.yaw - dx * 0.0036, -2.9, 2.9); off.pitch = clamp(off.pitch - dy * 0.0036, -0.6, 0.6);
    });
    const up = (e) => { drag = null; Ctl.up(e); };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
  }
  function update(dt) {
    const camera = Lab.camera, k = 1 - Math.exp(-dt * 5);
    cam.x += (home.x - cam.x) * k; cam.y += (home.y - cam.y) * k; cam.z += (home.z - cam.z) * k;
    cam.yaw += (home.yaw + off.yaw - cam.yaw) * k; cam.pitch += (home.pitch + off.pitch - cam.pitch) * k;
    cam.fov += (home.fov - cam.fov) * k; camera.fov = cam.fov; camera.updateProjectionMatrix();
    camera.position.set(cam.x, cam.y, cam.z); camera.rotation.set(cam.pitch, cam.yaw, 0);
  }
  return { init, bind, frame, update };
})();

/* ============================================================
   THE GAME: one batch, three enzymes. Each active site has its own shape, so each enzyme only works on
   its own substrate. Break down as much food as you can before time runs out, then food-test the batch.
   ============================================================ */
const RULES = { time: 110, enough: 7, spares: 2, phOpt: 7 };

/* ---------- the three substrate shapes. +y is the end that goes into the active site. ---------- */
const arcPts = (cx, cy, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
const wavy = (hw, hh) => { const top = [], bot = []; for (let i = 0; i <= 26; i++) { const x = -hw + 2 * hw * i / 26, w = 6.5 * Math.sin(x * 0.27); top.push([x, -hh + w]); bot.push([x, hh + w]); } return top.concat(bot.reverse()); };
const regular = (n, r, rot) => Array.from({ length: n }, (_, i) => { const a = rot + i * Math.PI * 2 / n; return [r * Math.cos(a), r * Math.sin(a)]; });
const TYPES = [
  { key: 'starch', enzyme: 'AMYLASE', kind: 'a carbohydrase', substrate: 'STARCH', product: 'SUGARS', col: ['#b4bcff', '#5560e8', '#272c92'], fill: ['#ffe29a', '#f2ad2e', '#a96a0c'], poly: wavy(36, 14) },
  { key: 'protein', enzyme: 'PROTEASE', kind: 'breaks down protein', substrate: 'PROTEIN', product: 'AMINO ACIDS', col: ['#f6bfde', '#c0569a', '#68224f'], fill: ['#f29a7c', '#c14c33', '#742414'], poly: [[-5, -14], [-4, -24], [-11, -30], [-12, -37], [-6, -40], [0, -36], [6, -40], [12, -37], [11, -30], [4, -24], [5, -14]].concat(arcPts(0, 8, 25, -68, 248, 26)) },
  { key: 'fat', enzyme: 'LIPASE', kind: 'breaks down fat', substrate: 'FAT', product: 'FATTY ACIDS + GLYCEROL', col: ['#b2f3da', '#2fae86', '#11604a'], fill: ['#fffcd0', '#e7dc5a', '#9a8f14'], poly: arcPts(0, -9, 23, 150, 390, 22).concat([[0, 36]]) }
];

/* ---------- the food tests run on the finished batch. Enough broken down means: no starch, protein or fat left to detect, and plenty of sugar. ---------- */
const CLEAR = [214, 232, 230, 0.4], BLUE = [66, 160, 232, 0.92];
const TESTS = [
  { of: 0, name: 'IODINE TEST', looks: 'looks for starch', add: 'ADD IODINE', reagent: [181, 101, 29, 1], dur: 2.2,
    result: (n, ok) => ok ? { col: [186, 108, 30, 0.95], seen: 'Stays orange-brown', means: 'no starch left. The amylase broke it down.' } : { col: [16, 14, 52, 1], seen: 'Turns blue-black', means: 'starch is still there. Not enough was broken down.' } },
  { of: 0, name: "BENEDICT'S TEST", looks: 'looks for sugar', add: "ADD BENEDICT'S", reagent: BLUE, dur: 4.2, heat: true,
    result: (n, ok) => ok ? { col: [178, 58, 30, 1], seen: 'Turns brick-red', means: 'lots of sugar. Your amylase made plenty.' } : !n ? { col: BLUE, seen: 'Stays blue', means: 'no sugar was made.' } : n < RULES.enough * 0.4 ? { col: [74, 168, 90, 0.95], seen: 'Turns green', means: 'only a trace of sugar. Not enough.' } : n < RULES.enough * 0.7 ? { col: [226, 200, 48, 0.95], seen: 'Turns yellow', means: 'a little sugar. Not enough.' } : { col: [232, 134, 32, 0.97], seen: 'Turns orange', means: 'some sugar, but not quite enough.' } },
  { of: 1, name: 'BIURET TEST', looks: 'looks for protein', add: 'ADD BIURET', reagent: BLUE, dur: 2.4,
    result: (n, ok) => ok ? { col: BLUE, seen: 'Stays blue', means: 'no protein left. The protease broke it down.' } : { col: [150, 84, 196, 0.97], seen: 'Turns lilac-purple', means: 'protein is still there. Not enough was broken down.' } },
  { of: 2, name: 'EMULSION TEST', looks: 'looks for fat (lipid)', add: 'ADD ETHANOL', reagent: [225, 240, 245, 0.45], dur: 3, shake: true, note: 'then water, and shake',
    result: (n, ok) => ok ? { col: CLEAR, seen: 'Stays clear', means: 'no fat left. The lipase broke it down.' } : { col: [244, 244, 236, 0.97], seen: 'Turns cloudy white', means: 'fat is still there. Not enough was broken down.', cloudy: true } }
];

const Game = (function () {
  const SK = 1.38, ER = 96, VM = 1.09, PER = 5;
  let PW = 1170, PH = 740, tall = false, S = null;
  // where each enzyme sits and which way its active site faces
  const slots = () => tall ? [[210, PH * 0.2, 0.45], [PW - 215, PH * 0.5, 2.9], [225, PH * 0.8, -0.55]] : [[290, 225, 0.45], [880, 225, 2.69], [585, 540, -1.5708]];
  function setField(w, h, isTall) {
    if (w === PW && h === PH && isTall === tall) return;
    const kx = w / PW, ky = h / PH; PW = w; PH = h; tall = isTall; if (!S) return;
    S.enz.forEach((e) => { const s = slots()[e.slot]; e.x = e.hx = s[0]; e.y = e.hy = s[1]; e.base = e.ang = s[2]; });
    S.subs.forEach((s) => { s.x *= kx; s.y *= ky; }); S.prods.forEach((p) => { p.x *= kx; p.y *= ky; }); S.pops.forEach((p) => { p.x *= kx; p.y *= ky; });
  }
  const reactTime = (T, u) => clamp(26 * Math.pow(0.42, (T - 25) / 10), 2, 45) * (1 + u * 1.5);   // about 26 s at 25 °C, 11 s at 35 °C, 4.6 s at 45 °C
  const autoWait = (T) => clamp(70 * Math.pow(2, -(T - 25) / 20), 22, 120);
  const speedOf = (T) => 36 + Math.max(0, T - 15) * 4;
  const wrapPi = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  function inPoly(poly, x, y) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }

  /* the enzyme's outline: a lumpy protein with a hole cut to the exact shape of its substrate. Heating or the wrong pH warps both. */
  function cavity(u) { const k = u * u * (3 - 2 * u); return { cx: ER * (0.96 + 0.14 * k), cy: k * 22, rot: k * 0.95, sc: SK * VM * (1 - 0.42 * k) }; }
  function inCavity(type, cv, x, y) {
    const dx = x - cv.cx, dy = y - cv.cy, c = Math.cos(-cv.rot), s = Math.sin(-cv.rot), rx = dx * c - dy * s, ry = dx * s + dy * c;
    return inPoly(TYPES[type].poly, ry / cv.sc, -rx / cv.sc);
  }
  function outline(e, u) {
    const n = 150, cv = cavity(u), p = e.p, pts = [], site = [];
    for (let i = 0; i <= n; i++) {
      const f = i / n * Math.PI * 2 - Math.PI, c = Math.cos(f), s = Math.sin(f);
      const rb = ER * (1 + 0.04 * Math.sin(2 * f + p[0]) + 0.03 * Math.sin(3 * f + p[1]) + u * (0.11 * Math.sin(4 * f + p[3]) + 0.1 * Math.sin(7 * f + p[4]) + 0.06 * Math.sin(9 * f + p[2])));
      let r = rb, hit = false;
      if (Math.abs(f - Math.atan2(cv.cy, cv.cx)) < 1.0) { let prev = 6; for (let q = 8; q <= rb; q += 2.5) { if (inCavity(e.type, cv, c * q, s * q)) { let lo = prev, hi = q; for (let k = 0; k < 5; k++) { const m = (lo + hi) / 2; if (inCavity(e.type, cv, c * m, s * m)) hi = m; else lo = m; } r = lo; hit = true; break; } prev = q; } }
      pts.push([c * r, s * r]); site.push(hit);
    }
    return { pts, site, cv, u };
  }
  function sitePos(e) { const cv = e.shape.cv, c = Math.cos(e.ang), s = Math.sin(e.ang); return { x: e.x + cv.cx * c - cv.cy * s, y: e.y + cv.cx * s + cv.cy * c }; }

  function enzyme(type, slot) {
    const [x, y, base] = slots()[slot];
    const e = { type, slot, x, y, hx: x, hy: y, base, ang: 0, u: 0, heat: 0, perm: 0, sus: rnd(0.75, 1.35), wait: rnd(20, 70), state: 'IDLE', timer: 0, dur: 1, sub: null, glow: 0, ring: 0, ph: rnd(0, 6), p: [rnd(0, 6), rnd(0, 6), rnd(0, 6), rnd(0, 6), rnd(0, 6)], gen: 0 };
    e.ang = e.base; e.shape = outline(e, 0); return e;
  }
  function substrate(type, edge) {
    const s = { type, x: rnd(60, PW - 60), y: rnd(60, PH - 60), ang: rnd(0, 6.28), angV: rnd(-1, 1), dir: rnd(0, 6.28), e: rnd(0.75, 1.25), state: 'FREE', alpha: edge ? 0 : 1 };
    if (edge) { if (Math.random() < 0.5) s.x = Math.random() < 0.5 ? 40 : PW - 40; else s.y = Math.random() < 0.5 ? 40 : PH - 40; }
    return s;
  }
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function reset() {
    const order = Math.random() < 0.5 ? ['acid', 'alkali', 'heat'] : ['alkali', 'acid', 'heat'];
    S = { phase: 'ready', t: 0, T: 25, Tset: 25, ph: 7, phShift: 0, made: [0, 0, 0], tests: TESTS.map(() => ({ t: -1, done: false })), last: -1, endT: 0, mine: 0, auto: 0, wrong: 0, sumT: 0, phBad: 0, lost: new Set(), spares: RULES.spares,
      enz: shuffle([0, 1, 2]).map(enzyme), subs: [], prods: [], pops: [], held: null, banner: null, bannerT: 0, shocks: [{ at: 24, kind: order[0] }, { at: 53, kind: order[1] }, { at: 80, kind: order[2] }], verdict: null, flash: 0 };
    for (let k = 0; k < PER * 3; k++) S.subs.push(substrate(k % 3, false));
  }
  reset();
  const damage = (e) => { const d = Math.abs(S.ph - RULES.phOpt), temp = clamp((d - 0.9) / 2.1, 0, 1) * 0.85; return clamp(Math.max(e.heat + e.perm, temp), 0, 1); };
  const fits = (e) => e.u < 0.35;
  const here = () => S.enz;
  function pop(x, y, text, col, big) { S.pops.push({ x: clamp(x, 160, PW - 160), y, text, col, t: 0, big }); }
  function banner(text, col) { S.banner = { text, col }; S.bannerT = 6; }
  function start() { reset(); delete $('#app').dataset.v; S.phase = 'play'; banner('Each active site is a different shape. Find the substrate that matches.', '#ffb02e'); }

  function bind(e, s, mine) { let t = e.ang + Math.PI / 2; while (t - s.ang > Math.PI) t -= 2 * Math.PI; while (t - s.ang < -Math.PI) t += 2 * Math.PI; e.state = 'BIND'; e.timer = 0; e.sub = s; e.mine = mine; s.state = 'BOUND'; s.from = { x: s.x, y: s.y, ang: s.ang }; s.to = t; }
  function step(e, dt) {
    if (e.state === 'IDLE') return;
    const sp = sitePos(e), s = e.sub; e.timer += dt;
    if (e.state === 'BIND') { const p = easeOut(clamp(e.timer / (e.mine ? 0.18 : 0.5), 0, 1)); s.x = lerp(s.from.x, sp.x, p); s.y = lerp(s.from.y, sp.y, p); s.ang = lerp(s.from.ang, s.to, p); if (p >= 1) { e.state = 'COMPLEX'; e.timer = 0; e.dur = reactTime(S.T, e.u); } }
    else if (e.state === 'COMPLEX') {
      s.x = sp.x; s.y = sp.y; s.ang = e.ang + Math.PI / 2; e.dur = reactTime(S.T, e.u); e.glow = 0.6 + 0.3 * Math.sin(e.timer * 11);
      if (!fits(e)) { e.state = 'IDLE'; e.sub = null; s.state = 'FREE'; s.dir = e.ang; pop(sp.x, sp.y - 40, 'Shape changed: it fell out', '#ff7a55'); return; }
      if (e.timer >= e.dur) {
        const ox = Math.cos(e.ang), oy = Math.sin(e.ang);
        S.prods.push({ type: e.type, x: sp.x, y: sp.y, vx: ox * 150, vy: oy * 150, age: 0, alpha: 1, spread: 0, ang: s.ang });
        s.state = 'GONE'; e.sub = null; e.state = 'RELEASE'; e.timer = 0; e.ring = 1; e.glow = 1; S.made[e.type]++; if (e.mine) S.mine++; else S.auto++;
        const T_ = TYPES[e.type]; pop(sp.x, sp.y - 40, '+1 ' + T_.product, '#5dffae', true); Snd.blip(e.mine ? 880 : 620, 0.1, 'sine', e.mine ? 0.05 : 0.02);
      }
    } else if (e.state === 'RELEASE') { e.glow *= Math.pow(0.02, dt); if (e.timer > 0.4) { e.state = 'IDLE'; e.timer = 0; e.wait = Math.max(e.wait, 6); } }
  }
  function shock(kind) {
    if (kind === 'acid') { S.phShift -= 2.7; banner('ACID LEAK! The pH is falling. Add alkali.', '#ff7a55'); }
    else if (kind === 'alkali') { S.phShift += 2.8; banner('ALKALI IN THE FEED! The pH is rising. Add acid.', '#c39bff'); }
    else { S.T = Math.min(68, S.T + 11); banner('HEATER SURGE! Turn the temperature down, fast.', '#ff7a55'); }
    S.flash = 1; Snd.alarm(); setTimeout(() => Snd.alarm(), 450);
  }
  function update(dt) {
    const t = performance.now() / 1000, live = S.phase === 'play';
    if (live) {
      S.t += dt; S.T += clamp(S.Tset - S.T, -4 * dt, 3.5 * dt);
      const move = clamp(S.phShift, -1.6 * dt, 1.6 * dt); S.ph = clamp(S.ph + move, 2, 12); S.phShift -= move;
      S.sumT += S.T * dt; if (Math.abs(S.ph - RULES.phOpt) > 1.4) S.phBad += dt;
      S.shocks.forEach((k) => { if (!k.done && S.t >= k.at) { k.done = true; shock(k.kind); } });
    }
    S.bannerT -= dt; S.flash = Math.max(0, S.flash - dt * 1.4);
    S.enz.forEach((e) => {
      if (live) {
        if (S.T > 52) e.heat = Math.min(1, e.heat + (S.T - 52) * 0.009 * e.sus * dt);
        const d = Math.abs(S.ph - RULES.phOpt); if (d > 3.2) e.perm = Math.min(1, e.perm + (d - 3.2) * 0.07 * e.sus * dt);
        const key = e.type + ':' + e.gen; if (e.heat >= 0.35 && !S.lost.has(key)) { S.lost.add(key); pop(e.x, e.y - 100, TYPES[e.type].enzyme + ' denatured!', '#ff7a55', true); }
      }
      e.u += clamp(damage(e) - e.u, -0.8 * dt, 0.8 * dt);
      const vib = (0.3 + Math.max(0, S.T - 25) / 24 + e.u * 2) * 1.1; e.x = e.hx + Math.sin(t * 29 + e.ph) * vib; e.y = e.hy + Math.cos(t * 25 + e.ph * 2) * vib;
      if (e.state === 'IDLE') e.ang = e.base + Math.sin(t * 0.45 + e.ph) * 0.18;
      const ku = Math.round(e.u * 30) / 30; if (e.shape.u !== ku) e.shape = outline(e, ku);
      e.ring = Math.max(0, e.ring - dt * 1.6); if (e.state === 'IDLE') e.glow *= Math.pow(0.01, dt);
      if (live) {
        step(e, dt);
        // now and then the matching substrate collides the right way round by chance
        if (e.state === 'IDLE' && fits(e)) {
          e.wait -= dt;
          if (e.wait <= 0) { const sp = sitePos(e); let best = null, bd = 360; S.subs.forEach((s) => { if (s.type === e.type && s.state === 'FREE' && s !== S.held) { const d = Math.hypot(s.x - sp.x, s.y - sp.y); if (d < bd) { bd = d; best = s; } } }); if (best) { bind(e, best, false); e.wait = autoWait(S.T) * rnd(0.6, 1.4); } else e.wait = 0.5; }
        }
      }
    });
    const v = speedOf(S.T);
    S.subs.forEach((s) => {
      if (s.state !== 'FREE' || s === S.held) return;
      s.alpha = Math.min(1, s.alpha + dt * 2); s.dir += rnd(-1, 1) * 2.2 * Math.sqrt(dt); s.ang += s.angV * dt * (v / 130);
      s.x += Math.cos(s.dir) * v * s.e * dt; s.y += Math.sin(s.dir) * v * s.e * dt;
      if (s.x < 46 || s.x > PW - 46) { s.dir = Math.PI - s.dir; s.x = clamp(s.x, 46, PW - 46); }
      if (s.y < 46 || s.y > PH - 46) { s.dir = -s.dir; s.y = clamp(s.y, 46, PH - 46); }
      here().forEach((e) => { const dx = s.x - e.x, dy = s.y - e.y, d = Math.hypot(dx, dy), m = ER + 30; if (d < m && d > 1) { s.x = e.x + dx / d * m; s.y = e.y + dy / d * m; s.dir = Math.atan2(dy, dx) + rnd(-0.7, 0.7); } });
    });
    S.prods.forEach((p) => { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.pow(0.3, dt); p.vy *= Math.pow(0.3, dt); p.spread = Math.min(1, p.spread + dt * 2); if (p.age > 1.5) p.alpha -= dt * 1.3; });
    S.prods = S.prods.filter((p) => p.alpha > 0); S.subs = S.subs.filter((s) => s.state !== 'GONE');
    for (let k = 0; k < 3; k++) while (S.subs.filter((s) => s.type === k && s.state === 'FREE').length < PER) S.subs.push(substrate(k, true));
    S.pops.forEach((p) => { p.t += dt; p.y -= 30 * dt; }); S.pops = S.pops.filter((p) => p.t < 1.4);
    if (live && S.t >= RULES.time) finish();
    if (S.phase === 'test') {
      S.tests.forEach((k, i) => { if (k.t < 0 || k.done) return; k.t += dt; if (k.t >= TESTS[i].dur) { k.done = true; S.last = i; if (passed(i)) Snd.done(); else Snd.blip(170, 0.25, 'square', 0.04); } });
      if (S.tests.every((k) => k.done)) { S.endT += dt; if (!S.verdict && S.endT > 4) judge(); }
    }
  }
  function finish() { S.phase = 'test'; S.held = null; $('#app').dataset.v = '1'; Snd.done(); Mgr.stop(); }
  const passed = (i) => S.made[TESTS[i].of] >= RULES.enough;
  function runTest(i) { const k = S.tests[i]; if (S.phase !== 'test' || k.t >= 0) return; k.t = 0; Snd.blip(520, 0.12, 'triangle', 0.05); }
  function judge() {
    const avg = S.sumT / Math.max(1, S.t), heatLost = S.lost.size, score = TESTS.filter((_, i) => passed(i)).length, win = score === TESTS.length;
    const key = win ? 'g-win' : heatLost >= 2 ? 'g-hot' : avg < 36 ? 'g-cold' : S.phBad > 25 ? 'g-ph' : 'g-close';
    S.verdict = { win, key, score }; say(key, null, { pri: 6, once: false });
  }
  /* ---------- your hands ---------- */
  function grab(x, y) { if (S.phase !== 'play') return false; let best = null, bd = 70; S.subs.forEach((s) => { if (s.state === 'FREE') { const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = s; } } }); if (!best) return false; S.held = best; best.x = x; best.y = y; Snd.blip(420, 0.05, 'triangle', 0.04); return true; }
  function nearest(x, y) { let best = null, bd = 1e9; here().forEach((e) => { const sp = sitePos(e), d = Math.min(Math.hypot(x - sp.x, y - sp.y), Math.hypot(x - e.x, y - e.y)); if (d < bd) { bd = d; best = e; } }); return { e: best, d: bd }; }
  function drag(x, y) { const s = S.held; if (!s) return; s.x = clamp(x, 20, PW - 20); s.y = clamp(y, 20, PH - 20); const n = nearest(s.x, s.y); if (n.e && n.d < 170) s.ang += wrapPi(n.e.ang + Math.PI / 2 - s.ang) * 0.4; }   // it turns to face any site you bring it to, so you can compare the shapes
  function drop() {
    const s = S.held; if (!s) return; S.held = null; if (S.phase !== 'play') return;
    const n = nearest(s.x, s.y); if (!n.e || n.d >= 118) return;
    const e = n.e, sp = sitePos(e), bounce = () => { s.dir = Math.atan2(s.y - e.y, s.x - e.x); s.x = clamp(e.x + Math.cos(s.dir) * (ER + 90), 50, PW - 50); s.y = clamp(e.y + Math.sin(s.dir) * (ER + 90), 50, PH - 50); };
    if (s.type !== e.type) { S.wrong++; pop(sp.x, sp.y - 40, 'Wrong shape for ' + TYPES[e.type].enzyme, '#ff9a6a', true); banner('Active sites are specific: only a substrate with the matching shape fits.', '#ff9a6a'); Snd.blip(150, 0.2, 'square', 0.05); bounce(); }
    else if (!fits(e)) { pop(sp.x, sp.y - 40, 'It doesn’t fit any more!', '#ff7a55', true); Snd.blip(150, 0.2, 'square', 0.05); bounce(); }
    else if (e.state !== 'IDLE') { pop(sp.x, sp.y - 40, 'Busy', '#ffd070'); bounce(); }
    else bind(e, s, true);
  }
  function setT(v) { S.Tset = clamp(Math.round(v), 15, 70); }
  function dose(dir) { if (S.phase !== 'play') return; S.phShift += dir * 0.9; pop(PW / 2, 60, dir < 0 ? 'Acid added' : 'Alkali added', dir < 0 ? '#ff9a6a' : '#c8a8ff'); Snd.blip(dir < 0 ? 330 : 520, 0.15, 'triangle', 0.05); }
  function buy() {
    if (S.phase !== 'play') return;
    if (!here().length) return;
    const worst = here().sort((a, b) => (b.heat + b.perm) - (a.heat + a.perm))[0];
    if (worst.heat + worst.perm < 0.15) { pop(PW / 2, 60, 'All your enzymes are fine', '#ffd070'); return; }
    if (!S.spares) { pop(PW / 2, 60, 'No spare enzymes left', '#ff9a6a'); return; }
    S.spares--; if (worst.sub) { worst.sub.state = 'GONE'; worst.sub = null; }
    worst.heat = 0; worst.perm = 0; worst.u = 0; worst.state = 'IDLE'; worst.gen++; worst.ring = 1; worst.shape = outline(worst, 0);
    pop(worst.x, worst.y - 100, 'Fresh ' + TYPES[worst.type].enzyme, '#5dffae', true); Snd.done();
  }
  /* ---------- drawing ---------- */
  function trace(c, pts, k) { c.beginPath(); pts.forEach((p, i) => { if (i) c.lineTo(p[0] * k, p[1] * k); else c.moveTo(p[0] * k, p[1] * k); }); c.closePath(); }
  function drawSub(c, type, x, y, ang, k, alpha, label) {
    const T_ = TYPES[type]; c.save(); c.globalAlpha = alpha; c.translate(x, y); c.rotate(ang);
    const g = c.createLinearGradient(-30 * k, -30 * k, 24 * k, 30 * k); g.addColorStop(0, T_.fill[0]); g.addColorStop(0.5, T_.fill[1]); g.addColorStop(1, T_.fill[2]);
    trace(c, T_.poly, k); c.fillStyle = g; c.fill(); c.save(); c.clip();
    if (type === 0) { c.strokeStyle = 'rgba(120,66,0,.55)'; c.lineWidth = 3 * k; for (let i = -4; i <= 4; i++) { c.beginPath(); c.moveTo((i * 12 - 8) * k, -24 * k); c.quadraticCurveTo((i * 12 + 6) * k, 0, (i * 12 + 10) * k, 24 * k); c.stroke(); } }
    else if (type === 1) { c.fillStyle = '#f4ead2'; c.fillRect(-14 * k, -42 * k, 28 * k, 27 * k); c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.ellipse(-9 * k, 1 * k, 8 * k, 12 * k, 0.5, 0, 7); c.fill(); }
    else if (type === 2) { c.fillStyle = 'rgba(255,255,255,.65)'; c.beginPath(); c.ellipse(-9 * k, -16 * k, 6 * k, 10 * k, 0.6, 0, 7); c.fill(); }
    else { c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2.5 * k; trace(c, regular(6, 18, 0), k); c.stroke(); }
    c.restore(); trace(c, T_.poly, k); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 2.4; c.stroke(); c.restore();
    if (label) { c.save(); c.globalAlpha = alpha; c.font = '700 ' + (tall ? 25 : 19) + "px 'Barlow Condensed',Arial Narrow"; c.textAlign = 'center'; c.lineWidth = 5; c.strokeStyle = 'rgba(0,0,0,.75)'; c.strokeText(T_.substrate, x, y + 6); c.fillStyle = '#fff'; c.fillText(T_.substrate, x, y + 6); c.restore(); }
  }
  function drawProduct(c, type, x, y, sp, k, alpha) {
    const T_ = TYPES[type]; c.save(); c.globalAlpha = alpha; c.translate(x, y); c.fillStyle = T_.fill[1]; c.strokeStyle = '#fff'; c.lineWidth = 2;
    const shape = (pts) => { trace(c, pts, k); c.fill(); c.stroke(); };
    if (type === 0) [-1, 1].forEach((d) => { c.save(); c.translate(d * (18 + sp * 18) * k, d * sp * 8 * k); shape(wavy(15, 12)); c.restore(); });
    else if (type === 1) { c.fillStyle = '#ee7f9c'; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach((d) => { c.beginPath(); c.arc(d[0] * (9 + sp * 16) * k, d[1] * (9 + sp * 14) * k, 9 * k, 0, 7); c.fill(); c.stroke(); }); }
    else if (type === 2) { c.fillRect(-(26 + sp * 8) * k, -24 * k, 10 * k, 48 * k); c.strokeRect(-(26 + sp * 8) * k, -24 * k, 10 * k, 48 * k); c.lineCap = 'round'; for (let i = -1; i <= 1; i++) { c.beginPath(); const x0 = (-4 + sp * 12) * k, y0 = i * (17 + sp * 6) * k; c.moveTo(x0, y0); for (let q = 1; q <= 4; q++) c.lineTo(x0 + q * 9 * k, y0 + (q % 2 ? -5 : 5) * k); c.strokeStyle = '#fff'; c.lineWidth = 9 * k; c.stroke(); c.strokeStyle = T_.fill[1]; c.lineWidth = 6 * k; c.stroke(); } }
    else { c.fillStyle = '#e57ad0'; shape(regular(5, 28, -Math.PI / 2)); }
    c.restore();
  }
  function drawEnzyme(c, e, t) {
    const T_ = TYPES[e.type], u = e.u, sh = e.shape, mix = (a, b) => { const p = (h, i) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16); return 'rgb(' + [0, 1, 2].map((i) => Math.round(lerp(p(a, i), p(b, i), u))).join(',') + ')'; };
    c.save(); c.translate(e.x, e.y); c.rotate(e.ang);
    if (e.glow > 0.02) { const g = c.createRadialGradient(sh.cv.cx, sh.cv.cy, 4, sh.cv.cx, sh.cv.cy, 120); g.addColorStop(0, 'rgba(255,215,120,' + 0.45 * e.glow + ')'); g.addColorStop(1, 'rgba(255,215,120,0)'); c.fillStyle = g; c.fillRect(sh.cv.cx - 130, sh.cv.cy - 130, 260, 260); }
    trace(c, sh.pts, 1);
    const g = c.createRadialGradient(-ER * 0.35, -ER * 0.4, ER * 0.1, 0, 0, ER * 1.15); g.addColorStop(0, mix(T_.col[0], '#c9bfcc')); g.addColorStop(0.55, mix(T_.col[1], '#857989')); g.addColorStop(1, mix(T_.col[2], '#453d51'));
    c.fillStyle = g; c.fill(); c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 3; c.stroke();
    c.strokeStyle = u < 0.35 ? '#ffc247' : '#ff6a3d'; c.lineWidth = 6; c.lineCap = 'round'; c.shadowColor = c.strokeStyle; c.shadowBlur = 14; c.beginPath(); let run = false;
    for (let i = 0; i < sh.pts.length; i++) { if (sh.site[i]) { if (!run) { c.moveTo(sh.pts[i][0], sh.pts[i][1]); run = true; } else c.lineTo(sh.pts[i][0], sh.pts[i][1]); } else run = false; }
    c.stroke(); c.shadowBlur = 0;
    if (e.ring > 0) { c.strokeStyle = 'rgba(255,255,255,' + e.ring * 0.7 + ')'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, ER * (1.15 + (1 - e.ring) * 0.35), 0, 7); c.stroke(); }
    c.restore();
    c.textAlign = 'center'; c.lineWidth = 6; c.strokeStyle = 'rgba(0,0,0,.65)';
    const lx = e.x - Math.cos(e.base) * 22;
    c.font = "700 30px 'Barlow Condensed',Arial Narrow"; c.strokeText(T_.enzyme, lx, e.y - 2); c.fillStyle = '#fff'; c.fillText(T_.enzyme, lx, e.y - 2);
    c.font = '500 ' + (tall ? 21 : 15) + "px 'IBM Plex Sans',sans-serif"; c.strokeText(T_.kind, lx, e.y + 20); c.fillStyle = 'rgba(255,255,255,.85)'; c.fillText(T_.kind, lx, e.y + 20);
    if (e.state === 'COMPLEX') { const p = clamp(e.timer / e.dur, 0, 1), left = Math.max(0, e.dur - e.timer); c.strokeStyle = '#ffe08a'; c.lineWidth = 8; c.beginPath(); c.arc(e.x, e.y, ER + 18, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); c.stroke(); c.font = "600 28px 'IBM Plex Mono',monospace"; c.lineWidth = 6; c.strokeStyle = 'rgba(0,0,0,.75)'; const s_ = left.toFixed(left < 10 ? 1 : 0) + ' s'; c.strokeText(s_, lx, e.y + 54); c.fillStyle = '#ffe08a'; c.fillText(s_, lx, e.y + 54); }
    if (!fits(e)) { c.fillStyle = 'rgba(60,10,6,.9)'; c.fillRect(lx - 82, e.y + 36, 164, 28); c.fillStyle = '#ffab90'; c.font = "700 19px 'Barlow Condensed',Arial Narrow"; c.fillText(e.heat + e.perm >= 0.35 ? 'DENATURED' : 'WRONG pH SHAPE', lx, e.y + 57); }
  }
  function draw(c) {
    const t = performance.now() / 1000, hot = clamp((S.T - 45) / 20, 0, 1), phd = clamp((S.ph - 7) / 3, -1, 1);
    const g = c.createLinearGradient(0, 0, 0, PH);
    g.addColorStop(0, `rgb(${Math.round(7 + hot * 46 + Math.max(0, -phd) * 30)},${Math.round(28 - hot * 8)},${Math.round(38 - hot * 14 + Math.max(0, phd) * 40)})`);
    g.addColorStop(1, `rgb(${Math.round(11 + hot * 60 + Math.max(0, -phd) * 34)},${Math.round(44 - hot * 14)},${Math.round(54 - hot * 20 + Math.max(0, phd) * 44)})`);
    c.fillStyle = g; c.fillRect(0, 0, PW, PH);
    for (let i = 0; i < 50; i++) { const x = (i * 197 + t * (8 + S.T)) % PW, y = (i * 131 + Math.sin(t * 0.7 + i) * 18 + 20) % PH; c.fillStyle = 'rgba(160,225,235,.09)'; c.beginPath(); c.arc(x, y, 1.5 + i % 3, 0, 7); c.fill(); }
    S.enz.forEach((e) => drawEnzyme(c, e, t));
    S.prods.forEach((p) => drawProduct(c, p.type, p.x, p.y, p.spread, SK, clamp(p.alpha, 0, 1)));
    S.subs.forEach((s) => { if (s.state === 'GONE' || s === S.held) return; drawSub(c, s.type, s.x, s.y, s.ang, SK, s.alpha, s.state === 'FREE'); });
    if (S.held) { c.shadowColor = '#fff'; c.shadowBlur = 24; drawSub(c, S.held.type, S.held.x, S.held.y, S.held.ang, SK, 1, false); c.shadowBlur = 0; drawSub(c, S.held.type, S.held.x, S.held.y, S.held.ang, SK, 1, true); }
    S.pops.forEach((p) => { c.globalAlpha = clamp(1.4 - p.t, 0, 1); c.font = '700 ' + (p.big ? 36 : 28) + "px 'Barlow Condensed',Arial Narrow"; c.textAlign = 'center'; c.lineWidth = 6; c.strokeStyle = 'rgba(0,0,0,.8)'; c.strokeText(p.text, p.x, p.y); c.fillStyle = p.col; c.fillText(p.text, p.x, p.y); c.globalAlpha = 1; });
    if (S.flash > 0) { c.fillStyle = `rgba(255,80,50,${S.flash * 0.3})`; c.fillRect(0, 0, PW, PH); }
  }
  return { start, update, draw, drawSub, drawProduct, grab, drag, drop, setT, dose, buy, reset, fits, sitePos, here, runTest, passed, setField, get PW() { return PW; }, get PH() { return PH; }, get s() { return S; } };
})();

/* ---------- the screen you play on ---------- */
const Ctl = (function () {
  const W = 1600, H = 1000, PX = 20, PY = 128;
  const C = { bg: '#06161a', panel: '#0c2329', line: 'rgba(150,215,205,.28)', ink: '#eef7f5', dim: '#93b0ac', amber: '#ffb02e', ok: '#4fe0a0', bad: '#ff6a3d', cyan: '#55c8ff', vio: '#b08cff' };
  const disp = "'Barlow Condensed','Arial Narrow',sans-serif", body = "'IBM Plex Sans','Segoe UI',sans-serif", mono = "'IBM Plex Mono',monospace";
  const SL = { x: 1230, y: 262, w: 340 }, FD = { x: PX, y: PY, k: 1 };   // temperature slider, and where the field is drawn
  let c = null, hits = [], hoverId = null, dragging = null, acc = 1, pc = null, view = { k: 1, x: 0, y: 0 };
  function box(x, y, w, h, fill, stroke, r) { r = r == null ? 12 : r; c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = 2; c.stroke(); } }
  function text(t, x, y, size, col, o) { o = o || {}; c.font = (o.w || 600) + ' ' + size + 'px ' + (o.f || body); c.fillStyle = col || C.ink; c.textAlign = o.a || 'left'; c.textBaseline = 'alphabetic'; c.fillText(t, x, y); }
  function wrap(t, x, y, maxW, lh, size, col) { c.font = '500 ' + size + 'px ' + body; c.fillStyle = col; c.textAlign = 'left'; let line = ''; t.split(' ').forEach((wd) => { const q = line ? line + ' ' + wd : wd; if (c.measureText(q).width > maxW && line) { c.fillText(line, x, y); y += lh; line = wd; } else line = q; }); if (line) c.fillText(line, x, y); return y; }
  function button(id, x, y, w, h, label, o) {
    o = o || {}; const hov = hoverId === id; let fill = o.fill || (hov ? '#1d454e' : '#133038'), col = o.col || C.ink, stroke = o.stroke || C.line;
    if (o.style === 'go') { const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, hov ? '#ffd477' : '#ffc34d'); g.addColorStop(1, hov ? '#ffab22' : '#ef950c'); fill = g; col = '#1c1100'; stroke = '#ffe0a0'; }
    box(x, y, w, h, fill, stroke); c.font = '700 ' + (o.size || 34) + 'px ' + disp; c.fillStyle = col; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, x + w / 2, y + h / 2 + 2); c.textBaseline = 'alphabetic';
    hit(id, x, y, w, h);
  }
  const hit = (id, x, y, w, h) => hits.push({ id, x: view.x + x * view.k, y: view.y + y * view.k, w: w * view.k, h: h * view.k });
  const short = (p) => (p.length > 14 ? 'FATTY ACIDS' : p);
  function hud(s) {
    c.fillStyle = '#0a1f25'; c.fillRect(0, 0, W, 112); c.fillStyle = C.amber; c.fillRect(0, 112, W, 4);
    TYPES.forEach((T_, i) => {
      const x = 20 + i * 404; box(x, 12, 392, 90, C.panel, C.line);
      Game.drawProduct(c, i, x + 44, 57, 0.25, 0.72, 1);
      text(short(T_.product), x + 92, 68, 30, C.dim, { f: disp });
      text(String(s.made[i]), x + 372, 80, 62, C.ink, { f: mono, a: 'right' });
    });
    const left = Math.max(0, RULES.time - s.t), m = Math.floor(left / 60), sec = Math.floor(left % 60);
    text('TIME LEFT', 1236, 42, 26, C.dim, { f: disp }); text(m + ':' + String(sec).padStart(2, '0'), 1236, 94, 52, left < 25 ? C.bad : C.ink, { f: mono });
    button('sound', 1404, 28, 176, 60, Snd.on && Voice.on ? 'SOUND ON' : 'SOUND OFF', { size: 26 });
  }
  const message = (s) => s.bannerT > 0 && s.banner ? s.banner : s.T > 52 ? { text: 'Too hot: enzymes are denaturing. Their active sites are changing shape.', col: C.bad } : Math.abs(s.ph - 7) > 1.2 ? { text: 'The pH is off: active sites change shape and substrates stop fitting.', col: C.vio } : s.T < 36 ? { text: 'Cold: slow molecules, slow reactions. Warmer means faster.', col: C.cyan } : { text: 'Drag each substrate into the active site with the matching shape.', col: C.amber };
  function controls(s) {
    const x = 1210;
    box(x, 128, 370, 288, C.panel, C.line);
    text('TEMPERATURE', x + 18, 164, 28, C.dim, { f: disp }); text(fmt(s.T) + '°C', x + 18, 224, 60, s.T > 52 ? C.bad : C.amber, { f: mono }); text('set ' + s.Tset + '°', x + 352, 222, 28, C.dim, { f: mono, a: 'right' });
    const g = c.createLinearGradient(SL.x, 0, SL.x + SL.w, 0); g.addColorStop(0, '#3d8fd1'); g.addColorStop(0.45, '#55c8ff'); g.addColorStop(0.65, '#ffd060'); g.addColorStop(0.72, '#ff6a3d'); g.addColorStop(1, '#c4251a');
    box(SL.x, SL.y - 11, SL.w, 22, g, null, 11); const tx = SL.x + (s.Tset - 15) / 55 * SL.w; c.beginPath(); c.arc(tx, SL.y, 26, 0, 7); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 9; c.strokeStyle = C.amber; c.stroke();
    hit('slider', SL.x - 30, SL.y - 42, SL.w + 60, 84);
    button('minus', x + 18, 312, 160, 84, '− COOLER', { size: 34 }); button('plus', x + 192, 312, 160, 84, '+ WARMER', { size: 34 });
    const bad = Math.abs(s.ph - 7) > 1.2;
    box(x, 430, 370, 290, C.panel, bad ? C.bad : C.line);
    text('pH', x + 18, 468, 30, C.dim, { f: disp }); text(s.ph.toFixed(1), x + 18, 530, 60, bad ? C.bad : C.ok, { f: mono }); text('best: 7', x + 352, 528, 28, C.dim, { f: mono, a: 'right' });
    ['#d8352a', '#ec8021', '#f5cf2e', '#7cc242', '#22a6a0', '#3b5db8', '#6a2f8a'].forEach((k, i) => { c.fillStyle = k; c.fillRect(x + 18 + i * (334 / 7), 550, 334 / 7 + 1, 24); });
    const px = x + 18 + clamp((s.ph - 3) / 8, 0, 1) * 334; c.fillStyle = '#fff'; c.fillRect(px - 5, 540, 10, 44);
    button('acid', x + 18, 604, 160, 98, 'ADD ACID', { size: 32, fill: hoverId === 'acid' ? '#7a3322' : '#542418', stroke: '#ff9a6a' });
    button('alkali', x + 192, 604, 160, 98, 'ADD ALKALI', { size: 32, fill: hoverId === 'alkali' ? '#4a3482' : '#33245c', stroke: '#c8a8ff' });
    const there = Game.here(), n = there.filter((e) => Game.fits(e)).length;
    box(x, 734, 370, 134, C.panel, C.line);
    text('ENZYMES WORKING', x + 18, 770, 28, C.dim, { f: disp }); text(n + '/' + there.length, x + 352, 776, 44, n === there.length ? C.ok : n ? C.amber : C.bad, { f: mono, a: 'right' });
    button('buy', x + 18, 788, 334, 66, 'FRESH ENZYME (' + s.spares + ' LEFT)', { size: 28 });
    const msg = message(s);
    box(20, 884, 1560, 96, s.flash > 0.01 ? '#3a130c' : C.panel, msg.col); c.fillStyle = msg.col; c.fillRect(20, 884, 12, 96);
    text(msg.text, 60, 944, 36, C.ink);
  }
  function ready() {
    text('PILOT PRODUCTION SUITE', W / 2, 96, 34, C.dim, { a: 'center', f: disp });
    text('REACTOR 3', W / 2, 220, 130, C.ink, { a: 'center', w: 700, f: disp });
    text('Break down as much as you can in ' + RULES.time + ' seconds. Then food-test your batch.', W / 2, 300, 44, C.amber, { a: 'center' });
    TYPES.forEach((T_, i) => { const x = 232 + i * 384; box(x, 340, 368, 200, C.panel, C.line); Game.drawSub(c, i, x + 70, 440, 0, 1.15, 1, false); text('→', x + 158, 454, 44, C.dim, { a: 'center' }); Game.drawProduct(c, i, x + 270, 440, 0.8, 1.05, 1); text(T_.substrate, x + 70, 516, 28, C.ink, { a: 'center', f: disp }); text(short(T_.product), x + 270, 516, 28, C.ink, { a: 'center', f: disp }); });
    const rows = [['1', 'Drag each substrate into the active site that matches its shape.'], ['2', 'Change the temperature. Warmer is faster, but too hot ruins enzymes.'], ['3', 'Watch the pH. Add acid or alkali when something goes wrong.']];
    rows.forEach((r, i) => { const y = 610 + i * 68; c.beginPath(); c.arc(300, y - 12, 24, 0, 7); c.fillStyle = C.amber; c.fill(); text(r[0], 300, y, 34, '#1c1100', { a: 'center', w: 700, f: disp }); text(r[1], 346, y, 34, C.ink, { w: 500 }); });
    const p = 1 + Math.sin(performance.now() / 260) * 0.02;
    button('start', W / 2 - 330 * p, 832 - 66 * (p - 1), 660 * p, 132 * p, 'START THE BATCH', { style: 'go', size: 60 });
  }
  const rgba = (a) => 'rgba(' + Math.round(a[0]) + ',' + Math.round(a[1]) + ',' + Math.round(a[2]) + ',' + a[3].toFixed(3) + ')';
  const mixA = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
  function tube(i, cx, k, res) {
    const T_ = TESTS[i], p = k.t < 0 ? 0 : clamp(k.t / T_.dur, 0, 1), now = performance.now() / 1000;
    const added = clamp(p / 0.3, 0, 1), change = k.done ? 1 : clamp((p - (T_.heat ? 0.32 : T_.shake ? 0.5 : 0.28)) / (T_.heat ? 0.62 : 0.45), 0, 1);
    const top = 318, bot = 590, hw = 54;
    // water bath for the test that needs heating
    if (T_.heat) {
      box(cx - 120, 452, 240, 154, 'rgba(120,200,235,.13)', 'rgba(200,235,245,.55)', 14); c.fillStyle = '#4a5a60'; c.fillRect(cx - 132, 606, 264, 12);
      text('hot water bath', cx, 292, 24, C.dim, { a: 'center', f: disp });
    }
    c.save();
    if (T_.shake && p > 0.32 && p < 0.72) { c.translate(cx, 450); c.rotate(Math.sin(now * 38) * 0.13); c.translate(-cx, -450); }
    const path = () => { c.beginPath(); c.moveTo(cx - hw, top); c.lineTo(cx - hw, bot - hw); c.arc(cx, bot - hw, hw, Math.PI, 0, true); c.lineTo(cx + hw, top); };
    // liquid: the sample, then the reagent mixing in, then whatever it turns
    const level = lerp(470, 420, added);
    let col = mixA(CLEAR, T_.reagent, added);
    if (change > 0 && res) {
      if (T_.heat) { const stops = [BLUE, [74, 168, 90, 0.95], [226, 200, 48, 0.95], [232, 134, 32, 0.97], [178, 58, 30, 1]], end = res.col; let last = stops.findIndex((q) => q[0] === end[0] && q[1] === end[1]); if (last < 0) last = 0; const f = change * last, a = Math.floor(f); col = last ? mixA(stops[a], stops[Math.min(last, a + 1)], f - a) : BLUE; }
      else col = mixA(T_.reagent, res.col, change);
    }
    c.save(); path(); c.closePath(); c.clip(); c.fillStyle = rgba(col); c.fillRect(cx - hw, level, hw * 2, bot - level);
    c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(cx - hw, level, hw * 2, 4);
    if (res && res.cloudy && change > 0) for (let q = 0; q < 70; q++) { const x = cx - hw + 8 + (q * 47 % (hw * 2 - 16)), y = level + 10 + ((q * 61) % (bot - level - 24)) + Math.sin(now * 1.4 + q) * 3; c.fillStyle = 'rgba(255,255,255,' + 0.8 * change + ')'; c.beginPath(); c.arc(x, y, 2 + q % 4, 0, 7); c.fill(); }
    c.restore();
    path(); c.strokeStyle = 'rgba(225,245,250,.85)'; c.lineWidth = 5; c.stroke();
    c.beginPath(); c.moveTo(cx - hw - 9, top); c.lineTo(cx + hw + 9, top); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(cx - hw + 12, top + 18, 9, bot - top - 80);
    c.restore();
    if (T_.heat && p > 0.25 && !k.done) for (let q = 0; q < 14; q++) { const x = cx - 110 + (q * 53 % 220), y = 604 - ((now * 90 + q * 37) % 140); if (Math.abs(x - cx) < hw + 8 && y < 596) continue; c.strokeStyle = 'rgba(220,245,255,.75)'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 3 + q % 4, 0, 7); c.stroke(); }
    // the dropper
    if (k.t >= 0 && p < 0.32) {
      box(cx - 13, 236, 26, 50, rgba(T_.reagent), '#dff', 5); c.fillStyle = '#222c30'; c.fillRect(cx - 18, 220, 36, 18); c.fillStyle = '#dff'; c.fillRect(cx - 4, 286, 8, 18);
      for (let q = 0; q < 3; q++) { const f = (now * 2.4 + q / 3) % 1; c.fillStyle = rgba(T_.reagent); c.beginPath(); c.arc(cx, 308 + f * (level - 314), 7, 0, 7); c.fill(); }
    }
  }
  function testing(s) {
    text('TIME UP! TEST YOUR BATCH', W / 2, 88, 72, C.ink, { a: 'center', w: 700, f: disp });
    TESTS.forEach((T_, i) => {
      const x = 22 + i * 392, w = 380, cx = x + w / 2, k = s.tests[i], ok = Game.passed(i), res = T_.result(s.made[T_.of], ok);
      box(x, 118, w, 636, C.panel, k.done ? (ok ? C.ok : C.bad) : C.line);
      text(T_.name, cx, 168, 40, C.ink, { a: 'center', w: 700, f: disp });
      text(T_.looks, cx, 204, 28, C.dim, { a: 'center' });
      tube(i, cx, k, res);
      if (k.t < 0) button('test' + i, x + 20, 664, w - 40, 76, T_.add, { style: 'go', size: 38 });
      else if (!k.done) text(T_.heat && k.t > T_.dur * 0.3 ? 'Heating…' : T_.shake && k.t > T_.dur * 0.3 ? 'Shaking…' : 'Adding…', cx, 714, 34, C.amber, { a: 'center' });
      else { text(res.seen, cx, 650, 31, C.ink, { a: 'center' }); box(x + 20, 664, w - 40, 76, ok ? 'rgba(79,224,160,.18)' : 'rgba(255,106,61,.18)', null); text(ok ? '✓ SUCCESS' : '✗ NOT ENOUGH', cx, 716, 40, ok ? C.ok : C.bad, { a: 'center', w: 700, f: disp }); }
    });
    const v = s.verdict;
    box(22, 772, 1556, 208, v ? 'rgba(255,176,46,.09)' : C.panel, v ? C.amber : C.line);
    if (v) {
      text(v.score + ' OF ' + TESTS.length + ' TESTS SUCCESSFUL', 52, 822, 40, v.win ? C.ok : C.bad, { w: 700, f: disp });
      wrap('Hollis: ' + LINES[v.key], 52, 870, 1150, 40, 29, '#fff2d4');
      button('start', 1240, 826, 308, 100, 'PLAY AGAIN', { style: 'go', size: 46 });
    } else if (s.last < 0) {
      text('Each test looks for one substance. Press a button to run it.', W / 2, 888, 40, C.ink, { a: 'center' });
    } else {
      const T_ = TESTS[s.last], n = s.made[T_.of], ok = Game.passed(s.last), res = T_.result(n, ok);
      text(res.seen + ': ' + res.means, W / 2, 866, 40, C.ink, { a: 'center' });
      text('You broke down ' + n + ' ' + TYPES[T_.of].substrate.toLowerCase() + (T_.of === 2 ? ' droplets' : ' molecules') + '. A successful batch needs at least ' + RULES.enough + '.', W / 2, 932, 32, ok ? C.ok : C.bad, { a: 'center' });
    }
  }
  /* ----- the phone layout: 1000 units across, as tall as the phone is ----- */
  const PWIDE = 1000;
  function lines(t, maxW, size) { c.font = '500 ' + size + 'px ' + body; const out = []; let line = ''; t.split(' ').forEach((wd) => { const q = line ? line + ' ' + wd : wd; if (c.measureText(q).width > maxW && line) { out.push(line); line = wd; } else line = q; }); if (line) out.push(line); return out; }
  function para(t, x, y, maxW, size, col, align) { const l = lines(t, maxW, size); l.forEach((q, i) => text(q, x, y + i * size * 1.28, size, col, { a: align || 'center', w: 500 })); return y + l.length * size * 1.28; }
  // a screen drawn at its own size, then shrunk evenly if the phone is shorter than that
  function fitted(h, V, paint) { const k = Math.min(1, V / h); view = { k, x: (PWIDE - PWIDE * k) / 2, y: (V - h * k) / 2 }; c.save(); c.translate(view.x, view.y); c.scale(k, k); paint(); c.restore(); view = { k: 1, x: 0, y: 0 }; }
  function phoneReady() {
    text('PILOT PRODUCTION SUITE', 500, 60, 36, C.dim, { a: 'center', f: disp });
    text('REACTOR 3', 500, 200, 160, C.ink, { a: 'center', w: 700, f: disp });
    para('Break down as much as you can in ' + RULES.time + ' seconds. Then food-test your batch.', 500, 285, 860, 46, C.amber);
    TYPES.forEach((T_, i) => { const y = 420 + i * 176; box(60, y, 880, 160, C.panel, C.line); Game.drawSub(c, i, 180, y + 70, 0, 1.2, 1, false); text('→', 500, y + 90, 60, C.dim, { a: 'center' }); Game.drawProduct(c, i, 800, y + 66, 0.8, 1.05, 1); text(T_.substrate, 180, y + 144, 34, C.ink, { a: 'center', f: disp }); text(short(T_.product), 800, y + 144, 34, C.ink, { a: 'center', f: disp }); });
    const rows = ['Drag each substrate into the active site that matches its shape.', 'Change the temperature. Warmer is faster, but too hot ruins enzymes.', 'Watch the pH. Add acid or alkali when something goes wrong.'];
    rows.forEach((r, i) => { const y = 1015 + i * 128; c.beginPath(); c.arc(90, y - 14, 32, 0, 7); c.fillStyle = C.amber; c.fill(); text(String(i + 1), 90, y, 40, '#1c1100', { a: 'center', w: 700, f: disp }); para(r, 150, y, 800, 42, C.ink, 'left'); });
    button('start', 110, 1400, 780, 160, 'START THE BATCH', { style: 'go', size: 72 });
  }
  function phonePlay(s, V) {
    TYPES.forEach((T_, i) => { const x = 14 + i * 328; box(x, 10, 316, 128, C.panel, C.line); Game.drawProduct(c, i, x + 62, 60, 0.25, 0.7, 1); text(String(s.made[i]), x + 292, 84, 70, C.ink, { f: mono, a: 'right' }); text(short(T_.product), x + 158, 124, 30, C.dim, { f: disp, a: 'center' }); });
    const left = Math.max(0, RULES.time - s.t), m = Math.floor(left / 60), sec = Math.floor(left % 60);
    text('TIME LEFT', 24, 196, 36, C.dim, { f: disp }); text(m + ':' + String(sec).padStart(2, '0'), 190, 204, 58, left < 25 ? C.bad : C.ink, { f: mono });
    button('sound', 700, 150, 286, 68, Snd.on && Voice.on ? 'SOUND ON' : 'SOUND OFF', { size: 34 });
    const msg = message(s); box(14, 230, 972, 116, s.flash > 0.01 ? '#3a130c' : C.panel, msg.col); c.fillStyle = msg.col; c.fillRect(14, 230, 12, 116);
    const l = lines(msg.text, 910, 38); l.forEach((q, i) => text(q, 52, 302 - (l.length - 1) * 24 + i * 48, 38, C.ink, { w: 500 }));
    // the controls sit under your thumbs
    const top = V - 556, fy = 362, fh = top - 14 - fy;
    FD.x = 14; FD.y = fy; FD.k = 972 / Game.PW;
    c.save(); c.translate(FD.x, FD.y); c.beginPath(); c.rect(0, 0, 972, fh); c.clip(); c.scale(FD.k, FD.k); Game.draw(c); c.restore();
    c.strokeStyle = s.flash > 0.05 ? C.bad : C.line; c.lineWidth = 3; c.strokeRect(14, fy, 972, fh);
    box(14, top, 972, 228, C.panel, C.line);
    text('TEMPERATURE', 36, top + 54, 36, C.dim, { f: disp }); text(fmt(s.T) + '°C', 250, top + 66, 66, s.T > 52 ? C.bad : C.amber, { f: mono }); text('set ' + s.Tset + '°', 964, top + 60, 36, C.dim, { f: mono, a: 'right' });
    SL.x = 220; SL.y = top + 148; SL.w = 560;
    const g = c.createLinearGradient(SL.x, 0, SL.x + SL.w, 0); g.addColorStop(0, '#3d8fd1'); g.addColorStop(0.45, '#55c8ff'); g.addColorStop(0.65, '#ffd060'); g.addColorStop(0.72, '#ff6a3d'); g.addColorStop(1, '#c4251a');
    box(SL.x, SL.y - 13, SL.w, 26, g, null, 13); const tx = SL.x + (s.Tset - 15) / 55 * SL.w; c.beginPath(); c.arc(tx, SL.y, 34, 0, 7); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 11; c.strokeStyle = C.amber; c.stroke();
    hit('slider', SL.x - 36, SL.y - 56, SL.w + 72, 112);
    button('minus', 32, top + 96, 130, 112, '−', { size: 80 }); button('plus', 838, top + 96, 130, 112, '+', { size: 80 });
    const y = top + 242, bad = Math.abs(s.ph - 7) > 1.2;
    box(14, y, 972, 180, C.panel, bad ? C.bad : C.line);
    text('pH', 36, y + 48, 38, C.dim, { f: disp }); text(s.ph.toFixed(1), 36, y + 124, 72, bad ? C.bad : C.ok, { f: mono }); text('best: 7', 36, y + 162, 30, C.dim, { f: mono });
    button('acid', 250, y + 22, 354, 94, 'ADD ACID', { size: 44, fill: '#542418', stroke: '#ff9a6a' }); button('alkali', 618, y + 22, 354, 94, 'ADD ALKALI', { size: 44, fill: '#33245c', stroke: '#c8a8ff' });
    ['#d8352a', '#ec8021', '#f5cf2e', '#7cc242', '#22a6a0', '#3b5db8', '#6a2f8a'].forEach((k, i) => { c.fillStyle = k; c.fillRect(250 + i * (722 / 7), y + 134, 722 / 7 + 1, 24); });
    c.fillStyle = '#fff'; c.fillRect(250 + clamp((s.ph - 3) / 8, 0, 1) * 722 - 6, y + 124, 12, 44);
    const there = Game.here(), n = there.filter((e) => Game.fits(e)).length, by = y + 194;
    box(14, by, 972, 108, C.panel, C.line);
    text('ENZYMES WORKING', 36, by + 68, 36, C.dim, { f: disp }); text(n + '/' + there.length, 430, by + 72, 52, n === there.length ? C.ok : n ? C.amber : C.bad, { f: mono, a: 'right' });
    button('buy', 460, by + 14, 508, 80, 'FRESH ENZYME (' + s.spares + ' LEFT)', { size: 38 });
  }
  // the four food tests, two by two
  function phoneTesting(s) {
    text('TIME UP! TEST YOUR BATCH', 500, 80, 74, C.ink, { a: 'center', w: 700, f: disp });
    TESTS.forEach((T_, i) => {
      const x = 14 + (i % 2) * 492, y = 110 + Math.floor(i / 2) * 650, cx = x + 240, k = s.tests[i], ok = Game.passed(i), res = T_.result(s.made[T_.of], ok);
      box(x, y, 480, 636, C.panel, k.done ? (ok ? C.ok : C.bad) : C.line);
      text(T_.name, cx, y + 50, 44, C.ink, { a: 'center', w: 700, f: disp }); text(T_.looks, cx, y + 90, 32, C.dim, { a: 'center' });
      c.save(); c.translate(0, y - 118); tube(i, cx, k, res); c.restore();
      if (k.t < 0) button('test' + i, x + 20, y + 536, 440, 86, T_.add, { style: 'go', size: 46 });
      else if (!k.done) text(T_.heat && k.t > T_.dur * 0.3 ? 'Heating…' : T_.shake && k.t > T_.dur * 0.3 ? 'Shaking…' : 'Adding…', cx, y + 592, 40, C.amber, { a: 'center' });
      else { text(res.seen, cx, y + 524, 36, C.ink, { a: 'center' }); box(x + 20, y + 540, 440, 82, ok ? 'rgba(79,224,160,.18)' : 'rgba(255,106,61,.18)', null); text(ok ? '✓ SUCCESS' : '✗ NOT ENOUGH', cx, y + 596, 46, ok ? C.ok : C.bad, { a: 'center', w: 700, f: disp }); }
    });
    const v = s.verdict, y = 1424;
    box(14, y, 972, 462, v ? 'rgba(255,176,46,.09)' : C.panel, v ? C.amber : C.line);
    if (v) {
      text(v.score + ' OF ' + TESTS.length + ' TESTS SUCCESSFUL', 500, y + 62, 52, v.win ? C.ok : C.bad, { a: 'center', w: 700, f: disp });
      para('Hollis: ' + LINES[v.key], 500, y + 122, 900, 38, '#fff2d4');
      button('start', 260, y + 332, 480, 108, 'PLAY AGAIN', { style: 'go', size: 56 });
    } else if (s.last < 0) para('Each test looks for one substance. Press a button to run it.', 500, y + 190, 840, 48, C.ink);
    else {
      const T_ = TESTS[s.last], n = s.made[T_.of], ok = Game.passed(s.last), res = T_.result(n, ok);
      const q = para(res.seen + ': ' + res.means, 500, y + 110, 880, 46, C.ink);
      para('You broke down ' + n + ' ' + TYPES[T_.of].substrate.toLowerCase() + (T_.of === 2 ? ' droplets' : ' molecules') + '. A successful batch needs at least ' + RULES.enough + '.', 500, q + 50, 880, 38, ok ? C.ok : C.bad);
    }
  }
  const onPhone = () => innerWidth / Math.max(1, innerHeight) < 1.15;
  function drawPhone(s) {
    const r = pc.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (pc.width !== w || pc.height !== h) { pc.width = w; pc.height = h; }
    c = pc.getContext('2d'); const k = w / PWIDE, V = h / k;
    c.setTransform(k, 0, 0, k, 0, 0); c.fillStyle = C.bg; c.fillRect(0, 0, PWIDE, V);
    // the field is as tall as the space left between the message and the controls
    const fh = Math.max(500, V - 556 - 14 - 362), fw = Math.max(760, Math.round(580 * 972 / fh)); Game.setField(fw, Math.round(fh * fw / 972), true);   // short phones see more field, drawn a little smaller
    if (s.phase === 'ready') fitted(1600, V, phoneReady);
    else if (s.phase === 'test') fitted(1900, V, () => phoneTesting(s));
    else { const need = 556 + 14 + 362 + 500; if (V >= need) phonePlay(s, V); else fitted(need, need * Math.min(1, V / need), () => phonePlay(s, need)); }
  }
  function draw() {
    const sc = Lab.R.screens.kiosk, s = Game.s, tall = onPhone(); hits = []; view = { k: 1, x: 0, y: 0 };
    pc.hidden = !tall; Lab.cover(tall); $('#app').dataset.phase = s.phase;
    if (tall) { drawPhone(s); return; }
    c = sc.ctx; Game.setField(1170, 740, false); SL.x = 1230; SL.y = 262; SL.w = 340; FD.x = PX; FD.y = PY; FD.k = 1;
    c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = C.bg; c.fillRect(0, 0, W, H);
    if (s.phase === 'ready') ready();
    else if (s.phase === 'test') testing(s);
    else { hud(s); c.save(); c.translate(PX, PY); c.beginPath(); c.rect(0, 0, Game.PW, Game.PH); c.clip(); Game.draw(c); c.restore(); c.strokeStyle = s.flash > 0.05 ? C.bad : C.line; c.lineWidth = 3; c.strokeRect(PX, PY, Game.PW, Game.PH); controls(s); }
    sc.tex.needsUpdate = true;
  }
  // where a touch or click lands, in the units of whichever screen is showing
  const at = (e) => { if (!onPhone()) return Lab.screenAt(e.clientX, e.clientY); const r = pc.getBoundingClientRect(), k = PWIDE / Math.max(1, r.width); return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k }; };
  const hitAt = (p) => hits.find((q) => p.x >= q.x && p.x <= q.x + q.w && p.y >= q.y && p.y <= q.y + q.h);
  const inPlay = (p) => Game.s.phase === 'play' && p.x >= FD.x && p.x <= FD.x + Game.PW * FD.k && p.y >= FD.y && p.y <= FD.y + Game.PH * FD.k;
  const fx = (p) => (p.x - FD.x) / FD.k, fy = (p) => (p.y - FD.y) / FD.k;
  const fromX = (x) => Game.setT(15 + (x - SL.x) / SL.w * 55);
  function act(id) {
    Snd.click();
    if (id === 'start') { if (!G.started) { G.started = true; Snd.init(); Voice.init(); Voice.preload(); } Mgr.stop(); Game.start(); Nav.frame('play'); }
    else if (id === 'minus') Game.setT(Game.s.Tset - 2); else if (id === 'plus') Game.setT(Game.s.Tset + 2);
    else if (id === 'acid') Game.dose(-1); else if (id === 'alkali') Game.dose(1); else if (id === 'buy') Game.buy();
    else if (id.startsWith('test')) Game.runTest(+id.slice(4));
    else if (id === 'sound') { const on = !(Snd.on && Voice.on); Snd.setOn(on); Voice.on = on; if (!on) Voice.stop(); }
    acc = 1;
  }
  return {
    down(e) { const p = at(e); if (!p) return false; if (inPlay(p)) { if (Game.grab(fx(p), fy(p))) dragging = 'sub'; return true; } const h = hitAt(p); if (!h) return Game.s.phase === 'play'; if (h.id === 'slider') { dragging = 'temp'; fromX(p.x); } else act(h.id); return true; },
    move(e) { const p = at(e); if (!p) return; if (dragging === 'sub') Game.drag(fx(p), fy(p)); else if (dragging === 'temp') fromX(p.x); },
    up() { if (dragging === 'sub') Game.drop(); dragging = null; },
    over(e) { const p = at(e); if (!p) { hoverId = null; return null; } if (inPlay(p)) { hoverId = null; return 'grab'; } const h = hitAt(p); hoverId = h ? h.id : null; return h ? 'pointer' : null; },
    get dragging() { return !!dragging; },
    frame(dt) { acc += dt; if (acc > 0.03) { acc = 0; draw(); } },
    init() { pc = document.createElement('canvas'); pc.id = 'phone'; pc.hidden = true; pc.setAttribute('aria-label', 'Reactor 3, the game screen'); $('#app').appendChild(pc); Nav.bind(pc); draw(); }, refresh() { draw(); }, tick() { }
  };
})();

/* ---------- the other screens in the room follow along ---------- */
const Scr = (function () {
  let acc = 1;
  function simple(s, lines, col) { const c = s.ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#061416'; c.fillRect(0, 0, s.w, s.h); c.textAlign = 'center'; lines.forEach((t, i) => { c.fillStyle = i ? '#9fd8cc' : col || '#7dffa8'; c.font = '600 ' + Math.round(s.h / (lines.length * (i ? 2.1 : 1.6))) + "px 'IBM Plex Mono',monospace"; c.fillText(t, s.w / 2, s.h * (i + 0.72) / lines.length); }); s.tex.needsUpdate = true; }
  return {
    update(dt) {
      acc += dt; if (acc < 0.4) return; acc = 0; const R = Lab.R.screens, g = Game.s, tot = g.made.reduce((a, b) => a + b, 0);
      simple(R.tank, [fmt(g.T, 1) + '°C', 'pH ' + g.ph.toFixed(1)]); simple(R.cons, ['SET ' + g.Tset + '°C', 'pH ' + g.ph.toFixed(1)]);
      simple(R.mimic, [String(tot), 'PRODUCTS']); simple(R.dash, ['REACTOR 3', tot + ' made'], '#ffb02e');
      simple(R.clock, [hhmm(Math.max(0, RULES.time - g.t)), 'BATCH'], '#ff5a3a'); simple(R.term, ['SAMPLE', fmt(g.T) + '°C']);
    }
  };
})();

/* ---------- main loop and boot ---------- */
const Flow = (function () {
  let last = performance.now(), snd = 0;
  function tickFrame(dt) {
    Game.update(dt);
    const s = Game.s, play = s.phase === 'play';
    Nav.update(dt);
    const pw = play ? clamp((s.Tset - s.T) * 12 + Math.max(0, s.T - 20) * 0.9, -40, 60) : 0;
    Lab.update(dt, { running: play, T: s.T, Tset: s.Tset, N: 1, conv: clamp(s.made.reduce((a, b) => a + Math.min(b, RULES.enough), 0) / (RULES.enough * 3), 0, 1), pw, charged: s.phase !== 'ready', level: 1, filling: false, draining: false, dose: 0 });
    Scr.update(dt); Ctl.frame(dt); Mgr.tick();
    snd += dt; if (snd > 0.25) { snd = 0; Snd.update(play, pw); }
  }
  function frame() { requestAnimationFrame(frame); const t = performance.now(), dt = Math.min(0.05, (t - last) / 1000); last = t; tickFrame(dt); }
  return { frame, tickFrame };
})();

(function boot() {
  Lab.init($('#gl')); Nav.init(); Nav.frame('room'); Ctl.init();
  addEventListener('resize', () => { Lab.resize(); Nav.frame(); Ctl.refresh(); });
  Lab.update(0.016, { running: false, T: 25, Tset: 25, N: 1, conv: 0, pw: 0, charged: false, level: 1 });
  Flow.frame();
})();

})();
