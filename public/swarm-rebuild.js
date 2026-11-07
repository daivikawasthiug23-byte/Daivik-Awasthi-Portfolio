/* Swarm Rebuild: a crew of cursor agents rebuilds the page as the visitor scrolls.
   Options (data-attributes on the script tag): agents, speed, line, bg, accent,
   path (comma-separated pages it runs on, e.g. "/,/blog"; it follows client-side navigation).
   Page hooks: data-sr-skip, data-sr-logo, data-sr-replay, data-sr-stat. */
(function () {
  'use strict';
  var W = window, D = document, HTML = D.documentElement;
  if (W.SwarmRebuild) return;
  var NOOP = { replay: function () {}, skip: function () {}, setSpeed: function () {}, tour: function () {}, layers: function () { return []; } };

  var cs0 = D.currentScript || D.querySelector('script[src*="swarm-rebuild"]');
  var ds = (cs0 && cs0.dataset) || {};
  if (W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    W.SwarmRebuild = NOOP;
    return;
  }
  var PATHS = (ds.path || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
  function norm(pn) { return pn.replace(/\/+$/, '') || '/'; }
  function pathOk() { return !PATHS.length || PATHS.indexOf(norm(location.pathname)) >= 0; }

  /* ---------- sound ----------
     The extension's original sound: a glass piano in E, all synthesized (no audio files). Every
     finished box or image plays one note of the E major pentatonic, snapped to a soft 8th-note grid so
     a busy crew comes out as a generative melody: big pieces low, small ones high, pitch rising left to
     right, panned to where the cursor is. Typing and clicks are quiet paper ticks underneath.
     One shared instance for the page session. Browsers only start audio after a click or keypress, so
     the context is created on the first gesture (data-sound="off" to default off). */
  var PENTA = [0, 2, 4, 7, 9], E2 = 40;
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function cl(v, a, b) { return v < a ? a : v > b ? b : v; }

  function Sound() {
    var pref = ds.sound !== 'off';
    try { var sv = W.localStorage.getItem('sr-sound'); if (sv === '0') pref = false; else if (sv === '1') pref = true; } catch (e) {}
    this.on = pref;
    this.ctx = null; this.bpm = 104; this.musicOn = false; this.musicMode = false; this.mNext = null; this.mStep = 0; this.mTimer = 0; this.slots = {}; this.slotKeys = [];
    this.lastKey = {}; this.keyTimes = []; this.pressTimes = []; this.ends = [];
  }
  var SP = Sound.prototype;
  SP.init = function () {
    if (this.ctx) return true;
    var Ctx = W.AudioContext || W.webkitAudioContext;
    if (!Ctx) { this.noAudio = true; return false; }
    try { this.ctx = new Ctx({ latencyHint: 'interactive' }); } catch (e) { this.noAudio = true; return false; }
    var ctx = this.ctx;
    var out = ctx.createGain(); out.gain.value = this.on ? 1 : 0;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 14; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.3;
    var master = ctx.createGain(); master.gain.value = 0.9;
    master.connect(comp); comp.connect(out); out.connect(ctx.destination);
    var verb = ctx.createConvolver(); verb.buffer = this.impulse(3.2, 2.4);
    var wet = ctx.createGain(); wet.gain.value = 0.5;
    verb.connect(wet); wet.connect(master);
    var mus = ctx.createGain(); mus.gain.value = 0; mus.connect(master);
    var mverb = ctx.createConvolver(); mverb.buffer = this.impulse(1.8, 2.6);
    var mwet = ctx.createGain(); mwet.gain.value = 0.3; mverb.connect(mwet); mwet.connect(mus);
    this.mus = mus; this.mverb = mverb;
    this.out = out; this.master = master; this.verb = verb;
    this.noiseBuf = this.noise(1.5);
    this.t0 = ctx.currentTime;
    return true;
  };
  // generated room: decaying stereo noise that darkens as it rings out
  SP.impulse = function (secs, decay) {
    var sr = this.ctx.sampleRate, n = Math.floor(sr * secs), b = this.ctx.createBuffer(2, n, sr);
    for (var ch = 0; ch < 2; ch++) {
      var d = b.getChannelData(ch), lp = 0;
      for (var i = 0; i < n; i++) {
        var k = i / n;
        lp += (0.55 - 0.4 * k) * (Math.random() * 2 - 1 - lp);
        d[i] = lp * Math.pow(1 - k, decay) * (i < sr * 0.012 ? i / (sr * 0.012) : 1);
      }
    }
    return b;
  };
  SP.noise = function (secs) {
    var sr = this.ctx.sampleRate, b = this.ctx.createBuffer(1, Math.floor(sr * secs), sr), d = b.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  };
  SP.now = function () { return this.ctx.currentTime; };
  SP.resume = function () { if (this.ctx && this.ctx.state !== 'running' && this.ctx.resume) this.ctx.resume().catch(function () {}); };
  // call from a user gesture: creates the context and starts it
  SP.unlock = function () { if (!this.on) return; if (this.init()) this.resume(); };
  SP.ready = function () { return !!(this.ctx && this.on && this.ctx.state === 'running'); };
  SP.blocked = function () { return this.on && !this.noAudio && (!this.ctx || this.ctx.state !== 'running'); };
  SP.setOn = function (on) {
    this.on = on;
    try { W.localStorage.setItem('sr-sound', on ? '1' : '0'); } catch (e) {}
    if (on && !this.ctx) this.init();
    if (!this.ctx) return;
    var t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setTargetAtTime(on ? 1 : 0, t, 0.05);
    if (on) this.resume();
  };
  // next 8th/16th-note on the grid
  SP.grid = function (div) {
    var step = 60 / this.bpm / div, k = Math.ceil((this.now() + 0.015 - this.t0) / step);
    return { when: this.t0 + k * step, slot: div + ':' + k };
  };
  SP.pan = function (x, w) { return cl((x / Math.max(1, w)) * 1.6 - 0.8, -0.8, 0.8); };
  SP.bus = function (pan, send) {
    var ctx = this.ctx, g = ctx.createGain(), p = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
    if (p.pan) p.pan.value = pan;
    var mm = this.musicMode; // background music routes through its own fader and room
    g.connect(p); p.connect(mm ? this.mus : this.master);
    if (send) { var s = ctx.createGain(); s.gain.value = send; p.connect(s); s.connect(mm ? this.mverb : this.verb); }
    return g;
  };
  // glass piano: a few sine partials (one inharmonic, for the glass) plus a felt-hammer tick
  SP.piano = function (midi, when, vel, pan, ring) {
    ring = ring || 2.4;
    var now = this.now(), ctx = this.ctx, f = mtof(midi);
    this.ends = this.ends.filter(function (e) { return e > now; });
    if (this.ends.length >= 28) return;
    var v = this.bus(pan, 0.85); v.gain.value = 0.3 * vel;
    var hi = f > 900, parts = [[1, 1, 1], [2, 0.38, 0.55], [3, 0.12, 0.32], [2.756, 0.16, 0.42], [5.4, 0.05, 0.16]], last = null;
    for (var i = 0; i < parts.length; i++) {
      var r = parts[i][0], a = parts[i][1], d = parts[i][2];
      if (f * r > 15000) continue;
      var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * r * (1 + (Math.random() - 0.5) * 0.002);
      var g = ctx.createGain(), dec = ring * d * (hi ? 0.65 : 1);
      g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(a, when + 0.005); g.gain.exponentialRampToValueAtTime(0.0006, when + dec);
      o.connect(g); g.connect(v); o.start(when); o.stop(when + dec + 0.05); last = o;
    }
    this.tick(when, pan, Math.min(9000, f * 4 + 1200), 1.2, 0.125, 0.03, v);
    this.ends.push(when + ring * (hi ? 0.65 : 1));
    if (last) last.onended = function () { v.disconnect(); };
  };
  // short filtered-noise tick: typing, clicks, hammers
  SP.tick = function (when, pan, freq, q, vel, len, dest) {
    var ctx = this.ctx, src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain(), own = !dest;
    src.buffer = this.noiseBuf; bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q;
    g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(vel, when + 0.0008); g.gain.exponentialRampToValueAtTime(0.0004, when + len);
    var bus = dest || this.bus(pan, 0.06);
    src.connect(bp); bp.connect(g); g.connect(bus);
    src.start(when, Math.random() * 1.2); src.stop(when + len + 0.02);
    if (own) src.onended = function () { bus.disconnect(); };
  };
  SP.pad = function (midi, when, vel, len) {
    var ctx = this.ctx, g = this.bus(0, 0.9);
    g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(vel, when + len * 0.4); g.gain.exponentialRampToValueAtTime(0.0005, when + len);
    [-4, 4].forEach(function (det) {
      var o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(midi); o.detune.value = det;
      o.connect(g); o.start(when); o.stop(when + len + 0.05);
    });
  };
  SP.sweep = function (t, f0, f1, f2, dur, peak, swell) {
    var ctx = this.ctx, src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = this.bus(0, 0.6);
    src.buffer = this.noiseBuf; src.loop = true; bp.type = 'bandpass'; bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.4);
    if (f2) bp.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.8);
    g.gain.setValueAtTime(swell ? 0 : peak, t);
    if (swell) g.gain.linearRampToValueAtTime(peak, t + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    src.connect(bp); bp.connect(g); src.start(t); src.stop(t + dur + 0.1);
    src.onended = function () { g.disconnect(); };
  };

  /* events: screen coordinates in */
  // one mechanical key: a sharp click on top of a short "thock" (deeper for space)
  SP.key = function (x, w, id, n, space) {
    if (!this.ready()) return;
    var t = this.now();
    if (t - (this.lastKey[id] || -1) < 0.024) return;
    this.keyTimes = this.keyTimes.filter(function (k) { return t - k < 1; });
    if (this.keyTimes.length > 80) return;
    this.lastKey[id] = t;
    var pan = this.pan(x, w), at = t + 0.004;
    for (var k = 0; k < Math.min(n || 1, 3); k++) {
      this.keyTimes.push(t);
      var sp = space && k === 0, vel = rnd(0.75, 1);
      this.tick(at, pan, rnd(3600, 5600), 2.2, rnd(0.2, 0.3) * vel, rnd(0.006, 0.011));
      this.tick(at + rnd(0.001, 0.005), pan, sp ? rnd(380, 560) : rnd(850, 1500), 1.6, (sp ? 0.26 : rnd(0.13, 0.2)) * vel, sp ? 0.065 : rnd(0.025, 0.042));
      at += rnd(0.018, 0.032);
    }
  };
  // a mouse button: press click, then a lighter release
  SP.press = function (x, w) {
    if (!this.ready()) return;
    var t = this.now();
    this.pressTimes = this.pressTimes.filter(function (k) { return t - k < 1; });
    if (this.pressTimes.length > 40) return;
    this.pressTimes.push(t);
    var pan = this.pan(x, w);
    this.tick(t + 0.004, pan, rnd(2100, 2700), 4, 0.32, 0.012);
    this.tick(t + 0.005, pan, rnd(650, 850), 2, 0.16, 0.022);
    this.tick(t + rnd(0.055, 0.075), pan, rnd(2900, 3400), 4, 0.15, 0.008);
  };
  // a finished box or image sings one note
  SP.place = function (kind, x, y, w, h, vw, vh) {
    if (!this.ready()) return;
    var area = (w * h) / Math.max(1, vw * vh);
    var oct = area > 0.08 ? 1 : area > 0.015 ? 2 : area > 0.002 ? 3 : 4;
    var deg = Math.floor(cl(x / Math.max(1, vw), 0, 0.999) * 5), midi = E2 + oct * 12 + PENTA[deg];
    var g = this.grid(2);
    if (this.slots[g.slot]) return; // one note per slot keeps it a melody, not a cluster
    this.slots[g.slot] = 1; this.slotKeys.push(g.slot);
    if (this.slotKeys.length > 64) delete this.slots[this.slotKeys.shift()];
    var off = y < -40 || y > vh + 40 ? 0.45 : 1, pan = this.pan(x, vw);
    var vel = (kind === 'image' ? 0.5 : 0.55) * 0.42, ring = oct <= 1 ? 3.6 : oct >= 4 ? 1.6 : 2.4;
    this.piano(midi, g.when, vel * off, pan, ring);
    if (kind === 'image') this.piano(midi + (PENTA[(deg + 2) % 5] - PENTA[deg] + 12) % 12, g.when + 0.04, vel * 0.6 * off, pan, ring);
  };
  // the page dissolving: an airy swell over a low open fifth
  SP.intro = function () {
    if (!this.ready()) return;
    var t = this.now() + 0.02, self = this;
    this.sweep(t, 260, 2400, 900, 2.2, 0.16, true);
    [[E2, 0], [E2 + 7, 0.08], [E2 + 12, 0.16]].forEach(function (p) { self.pad(p[0], t + 0.3 + p[1], 0.07, 2.6); });
  };
  // the crew fans out: an E G# B E arpeggio on the grid
  SP.start = function () {
    if (!this.ready()) return;
    var g = this.grid(4), step = 60 / this.bpm / 4, self = this;
    [E2 + 24, E2 + 28, E2 + 31, E2 + 36, E2 + 40].forEach(function (m, i) { self.piano(m, g.when + i * step, 0.2, -0.5 + i * 0.25, 2); });
  };
  // the last chord rings: E major add9, strummed
  SP.finale = function () {
    if (!this.ready()) return;
    var g = this.grid(2), self = this, chord = [E2, E2 + 7, E2 + 12, E2 + 16, E2 + 19, E2 + 26, E2 + 28, E2 + 31, E2 + 36, E2 + 43];
    chord.forEach(function (m, i) { self.piano(m, g.when + i * 0.035, 0.34 - i * 0.015, -0.6 + (i / chord.length) * 1.2, 5.5); });
    this.pad(E2 + 12, g.when, 0.05, 5);
  };
  // back to the real page: a falling sweep
  SP.release = function () {
    if (!this.ready()) return;
    var t = this.now() + 0.01;
    this.sweep(t, 3000, 220, 0, 1.1, 0.12, false);
    this.piano(E2 + 12, t + 0.05, 0.3, 0, 2.5);
  };
  /* ---- background music: an original slow C-major loop (16 bars, about 48 s) ----
     Kalimba lead over a soft bass, a warm pad and a light shaker, on the same 8th-note grid as the
     agents' piano notes. It fades in when the build starts and fades out as the build finishes. */
  var CHORD = { C: [36, [60, 64, 67]], Am: [33, [57, 60, 64]], F: [41, [53, 57, 60]], G: [43, [55, 59, 62]], Em: [40, [55, 59, 64]] };
  var PROG = ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G', 'F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C'];
  var _ = null;
  var TUNE = [ // eighth notes per bar, semitones above C5
    [4, _, 7, _, 9, 7, 4, _], [9, _, 7, _, 4, _, 2, 4], [0, _, 4, _, 7, 9, 7, _], [7, _, 2, _, 4, 2, 0, _],
    [7, _, 9, _, 12, 9, 7, _], [9, 7, 4, _, 7, _, 4, _], [4, _, 0, _, 4, 7, 9, _], [7, _, 9, 7, 4, _, 2, _],
    [9, _, 12, _, 9, 7, 9, _], [7, _, 9, _, 7, 4, 2, _], [4, _, 7, _, 11, _, 9, 7], [9, _, _, 7, 4, _, 2, 0],
    [0, _, 4, _, 9, _, 7, 4], [2, _, 7, _, 9, 7, 2, _], [4, _, 7, 9, 12, _, 9, 7], [4, _, _, _, 0, _, _, _]
  ];
  var MUSIC_LEVEL = 0.55;
  // kalimba: a soft sine fundamental with a faint metallic overtone, gentle attack, warm lowpass
  SP.kalimba = function (midi, when, vel, pan, ring) {
    var ctx = this.ctx, f = mtof(midi), v = this.bus(pan, 0.5), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2400; lp.Q.value = 0.4; lp.connect(v); v.gain.value = 0.4 * vel;
    var parts = [[1, 1, 1], [2, 0.1, 0.45], [5.4, 0.07, 0.1]], last = null;
    for (var i = 0; i < parts.length; i++) {
      var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * parts[i][0] * (1 + (Math.random() - 0.5) * 0.002);
      var g = ctx.createGain(), dec = ring * parts[i][2];
      g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(parts[i][1], when + 0.008); g.gain.exponentialRampToValueAtTime(0.0006, when + dec);
      o.connect(g); g.connect(lp); o.start(when); o.stop(when + dec + 0.05); last = o;
    }
    if (last) last.onended = function () { v.disconnect(); lp.disconnect(); };
  };
  SP.bass = function (midi, when, vel) {
    var ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter(), bus = this.bus(-0.1, 0.1);
    o.type = 'triangle'; o.frequency.value = mtof(midi); lp.type = 'lowpass'; lp.frequency.value = 520;
    g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(vel, when + 0.012); g.gain.exponentialRampToValueAtTime(0.0006, when + 0.55);
    o.connect(lp); lp.connect(g); g.connect(bus); o.start(when); o.stop(when + 0.6);
    o.onended = function () { bus.disconnect(); };
  };
  SP.musicStep = function (k, when, st) {
    var slot = k % 8, bar = Math.floor(k / 8) % 16, ch = CHORD[PROG[bar]], t = when + (slot % 2) * st * 0.12;
    this.musicMode = true;
    try {
      if (slot === 0) for (var i = 0; i < ch[1].length; i++) this.pad(ch[1][i], when + i * 0.04, 0.03, st * 8 * 1.2);
      if (slot === 0 || slot === 4) this.bass(ch[0], t, 0.34);
      if (slot === 3 || slot === 6) this.bass(ch[0] + 7, t, 0.2);
      var n = TUNE[bar][slot];
      if (n != null) this.kalimba(72 + n, t, 0.3 + (slot === 0 ? 0.05 : 0), -0.15 + (n % 5) * 0.08, 1.8);
      if (slot % 2) this.tick(t, slot === 3 || slot === 7 ? 0.3 : -0.3, 6500, 1.2, 0.022, 0.035);
    } finally { this.musicMode = false; }
  };
  SP.musicTick = function () {
    if (!this.musicOn) return;
    if (!this.ready() || D.hidden) { this.mNext = null; return; }
    var now = this.now(), st = 60 / this.bpm / 2;
    if (this.mNext == null || this.mNext < now - 0.2) {
      var fresh = this.mNext == null;
      this.mNext = this.grid(2).when;
      if (fresh) { // fade in (also when audio was unlocked late, by the first click)
        this.mus.gain.cancelScheduledValues(now); this.mus.gain.setValueAtTime(this.mus.gain.value, now);
        this.mus.gain.linearRampToValueAtTime(MUSIC_LEVEL, now + 3);
      }
    }
    while (this.mNext < now + 0.5) { this.musicStep(this.mStep, this.mNext, st); this.mNext += st; this.mStep++; }
  };
  SP.musicStart = function () {
    if (this.musicOn) return;
    this.musicOn = true; this.mNext = null; this.mStep = 0;
    var self = this;
    clearInterval(this.mTimer);
    this.mTimer = setInterval(function () { self.musicTick(); }, 90);
    this.musicTick();
  };
  SP.musicStop = function (fade) {
    if (!this.musicOn) return;
    this.musicOn = false; this.mNext = null;
    clearInterval(this.mTimer);
    if (this.ctx && this.mus) {
      var t = this.now();
      this.mus.gain.cancelScheduledValues(t); this.mus.gain.setValueAtTime(this.mus.gain.value, t);
      this.mus.gain.linearRampToValueAtTime(0, t + (fade || 1));
    }
  };
  var SFX = new Sound();
  // first gesture on the page unlocks audio (capture phase, so nothing can swallow it)
  ['pointerdown', 'pointerup', 'mousedown', 'click', 'keydown', 'touchend'].forEach(function (ev) {
    W.addEventListener(ev, function () { if (SFX.blocked()) SFX.unlock(); }, { capture: true, passive: true });
  });
  // try right away: browsers that already trust the site (high engagement, autoplay allowed) start at once
  try { SFX.unlock(); } catch (e) {}

  function create(myPath, fast) {

  var dead = false, offs = [];
  function on(t, e, f, o) { t.addEventListener(e, f, o); offs.push(function () { t.removeEventListener(e, f, o); }); }

  /* ---------- config ---------- */
  var N = Math.max(1, parseInt(ds.agents, 10) || 14);
  if (W.innerWidth < 640) N = Math.min(N, 8);
  N = Math.min(N, 16);
  var speed = [1, 2, 4].indexOf(+ds.speed) >= 0 ? +ds.speed : 1;
  var PACE = 0.85; // build tempo: lower is slower (the 1×/2×/4× button multiplies it)
  var LINE = parseFloat(ds.line) || 0.88;
  var ACCENT = ds.accent || '#3D8BFF';
  var COLORS = ['#FF5C8A', '#FFC233', '#A970FF', '#2DD4BF', '#4ADE80', '#FF8A3D', '#38BDF8', '#F43F5E', '#C084FC', '#FACC15', '#34D399', '#60A5FA', '#FB7185', '#F97316', '#22D3EE', '#A3E635'];
  var NAMES = ['Ada', 'Bo', 'Cyd', 'Dex', 'Eli', 'Fen', 'Gus', 'Hal', 'Ivy', 'Jun', 'Kai', 'Lux', 'Mo', 'Nia', 'Oz', 'Pip'];
  var Z = 2147483000;

  /* ---------- helpers ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function hyp(x, y) { return Math.sqrt(x * x + y * y); }
  function fmt(n) { return Number(n).toLocaleString(); }
  function el(tag, cls, parent) { var e = D.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }
  function angDiff(a, b) { var d = (b - a) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return d; }

  /* ---------- state ---------- */
  var phase = 'boot'; // boot | scan | build | done | leaving | gone
  var layers = [], unfinished = [], doneCount = 0, layersReady = false;
  var agents = [], frames = [];
  var scanT = 0, buildT0 = 0, elapsed = 0, tourOn = false, tourY = 0, needCheck = true, lastCheck = 0, lastScroll = 0;
  var tourRun = 0, lastBusy = 0, doneAt = 0, guideAlpha = 0, lastWork = 0, leaveT = 0;
  var mouse = { on: false, x: 0, y: 0, t: 0, dx: 1, dy: 0 };
  var vw = W.innerWidth, vh = W.innerHeight;
  var gateOn = false, entered = false, gateEl = null;
  var tempo = 1, scrollV = 0, lastSY = W.scrollY; // tempo: the crew speeds up when you scroll fast or there is a backlog
  var fl = { lx: 0, ly: 0, has: false, tx: 0, ty: 0 }; // smoothed mouse velocity for the finale flock

  try { history.scrollRestoration = 'manual'; } catch (e) {}

  /* ---------- CSS ---------- */
  var INK = 'var(--ink,#111)', PAPER = 'var(--bg,#f6f2ea)', CARD = 'var(--card,#fff)', SH = 'var(--shadow,#111)', MONO = 'var(--font-jetbrains),ui-monospace,Menlo,monospace', SANS = 'var(--font-jakarta),system-ui,sans-serif';
  var css = [
    'html.sr-lock{overflow:hidden!important}',
    '#sr-root,#sr-agents{position:fixed;inset:0;pointer-events:none}',
    '#sr-root{z-index:' + (Z - 3) + '}#sr-agents{z-index:' + (Z - 1) + '}',
    '#sr-root canvas{position:absolute;inset:0;width:100%;height:100%}',
    '.sr-frame{position:absolute;left:0;top:0;border:2px solid ' + INK + ';box-sizing:border-box;transition:opacity .25s}',
    '.sr-frame.sr-out{opacity:0}',
    '.sr-h{position:absolute;width:9px;height:9px;background:var(--sr-accent);border:2px solid ' + INK + ';box-sizing:border-box}',
    '.sr-lbl{position:absolute;left:0;top:0;padding:1px 6px;border:2px solid ' + INK + ';border-radius:4px;background:var(--sr-accent);color:var(--on-accent,#111);box-shadow:2px 2px 0 ' + SH + ';font:700 10px/1.4 ' + MONO + ';white-space:nowrap}',
    '.sr-caret{position:absolute;left:0;top:0;width:3px;display:none;outline:1px solid ' + INK + '}',
    '#sr-scan{position:fixed;inset:0;z-index:' + (Z - 2) + ';display:flex;align-items:center;justify-content:center;color:' + INK + ';transition:opacity .55s ease;background-image:linear-gradient(var(--grid,#1111110f) 1px,transparent 1px),linear-gradient(90deg,var(--grid,#1111110f) 1px,transparent 1px);background-size:28px 28px}',
    '#sr-scan.sr-out{opacity:0;pointer-events:none}',
    '.sr-tile{width:68px;height:68px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:var(--sr-accent);border:2.5px solid ' + INK + ';box-shadow:5px 5px 0 ' + SH + ';animation:sr-bob 1.2s steps(2,end) infinite}',
    '.sr-tile>*{width:32px;height:32px;max-width:32px;max-height:32px;color:var(--on-accent,#111)}',
    '@keyframes sr-bob{0%{transform:translate(0,0)}50%{transform:translate(-2px,-2px)}100%{transform:translate(0,0)}}',
    '.sr-agent{position:absolute;left:0;top:0;will-change:transform;transition:opacity .3s}',
    '.sr-arrow{position:absolute;left:0;top:0;overflow:visible;transform-origin:0 0;filter:drop-shadow(2px 2px 0 ' + SH + ')}',
    '.sr-beam{position:absolute;left:-4px;top:0;width:8px;height:18px;display:none;box-sizing:border-box;border-top:2px solid;border-bottom:2px solid}',
    '.sr-beam:before{content:"";position:absolute;left:3px;top:0;bottom:0;width:2px;background:currentColor}',
    '.sr-tag{position:absolute;left:12px;top:20px;padding:0 6px;border:2px solid ' + INK + ';border-radius:4px;box-shadow:2px 2px 0 ' + SH + ';color:#111;font:700 10px/1.5 ' + MONO + ';white-space:nowrap;display:none}',
    '.sr-cross{position:absolute;left:-12px;top:-12px;overflow:visible;display:none;filter:drop-shadow(2px 2px 0 ' + SH + ')}',
    '.sr-working .sr-tag{display:block}.sr-typing .sr-beam{display:block}.sr-typing .sr-arrow{display:none}',
    '.sr-draw .sr-cross{display:block}.sr-draw .sr-arrow{display:none}',
    '.sr-hide-paint{background:transparent!important;background-image:none!important;border-color:transparent!important;box-shadow:none!important;outline-color:transparent!important}',
    '.sr-hide-media{opacity:0!important}',
    '.sr-reveal{transition:background-color .35s,border-color .35s,box-shadow .45s,opacity .35s!important}',
    '.sr-rest{color:transparent!important;-webkit-text-fill-color:transparent!important}',
    '#sr-hud{position:fixed;z-index:' + Z + ';left:50%;bottom:calc(18px + env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;align-items:center;gap:10px;padding:6px 6px 6px 12px;border:2.5px solid ' + INK + ';border-radius:8px;background:' + CARD + ';box-shadow:4px 4px 0 ' + SH + ';color:' + INK + ';font:700 12px/1 ' + MONO + ';pointer-events:auto;white-space:nowrap;max-width:calc(100vw - 16px)}',
    '.sr-cap{position:absolute;left:0;right:0;top:calc(50% + 62px);text-align:center;font:700 12px/1.4 ' + MONO + ';color:' + INK + ';padding:0 16px}',
    '.sr-cap2{top:calc(50% + 86px);font-size:11px;font-weight:600;opacity:.65;transition:opacity .4s}',
    '.sr-gate{position:absolute;left:0;right:0;top:calc(50% + 112px);display:flex;flex-direction:column;align-items:center;gap:10px;padding:0 16px;opacity:0;transform:translateY(8px);transition:opacity .45s,transform .45s}',
    '.sr-gate.sr-on{opacity:1;transform:none}',
    '.sr-enter{all:unset;cursor:pointer;padding:13px 24px;border:2.5px solid ' + INK + ';border-radius:8px;background:var(--sr-accent);color:var(--on-accent,#111);box-shadow:5px 5px 0 ' + SH + ';font:700 14px/1 ' + MONO + ';transition:transform .12s,box-shadow .12s}',
    '.sr-enter:hover{transform:translate(-2px,-2px);box-shadow:7px 7px 0 ' + SH + '}.sr-enter:active{transform:translate(3px,3px);box-shadow:2px 2px 0 ' + SH + '}',
    '.sr-enter:focus-visible{outline:3px solid ' + INK + ';outline-offset:3px}',
    '.sr-gate small{font:600 11px/1.4 ' + MONO + ';color:' + INK + ';opacity:.65}',
    '.sr-hint{position:fixed;z-index:' + Z + ';left:50%;bottom:calc(76px + env(safe-area-inset-bottom));transform:translate(-50%,8px);max-width:calc(100vw - 32px);padding:8px 12px;border:2px solid ' + INK + ';border-radius:8px;background:var(--sr-accent);color:var(--on-accent,#111);box-shadow:3px 3px 0 ' + SH + ';font:700 12px/1.4 ' + MONO + ';text-align:center;opacity:0;pointer-events:none;transition:opacity .35s,transform .35s}',
    '.sr-hint{bottom:calc(92px + env(safe-area-inset-bottom)) !important}',
    '.sr-hint.sr-on{opacity:1;transform:translate(-50%,0)}',
    '#sr-hud{transition:opacity .4s}#sr-hud.sr-idle{opacity:.35}#sr-hud.sr-idle:hover,#sr-hud.sr-idle:focus-within{opacity:1}',
    '#sr-hud button{all:unset;cursor:pointer;padding:6px 10px;border:2px solid ' + INK + ';border-radius:6px;background:' + PAPER + ';color:' + INK + ';font:700 12px/1 ' + MONO + ';transition:transform .12s,background-color .12s}',
    '#sr-hud button:hover{background:var(--sr-accent);color:var(--on-accent,#111)}#sr-hud button:active{transform:translate(2px,2px)}',
    '#sr-hud button:focus-visible{outline:3px solid var(--sr-accent);outline-offset:2px}',
    '#sr-hud button.sr-snd{display:inline-flex;align-items:center;gap:6px;padding:6px 8px}#sr-hud button.sr-snd.sr-off{opacity:.6}',
    '#sr-hud button.sr-snd.sr-wait{animation:sr-pulse 1.8s ease-in-out infinite}',
    '@keyframes sr-pulse{0%,100%{box-shadow:0 0 0 0 transparent}50%{box-shadow:0 0 0 4px color-mix(in srgb,var(--sr-accent) 45%,transparent)}}',
    '@media(max-width:419px){#sr-hud .sr-spd{display:none}}',
    '.sr-av{display:flex}.sr-av i{width:20px;height:20px;border-radius:50%;margin-left:-6px;border:2px solid ' + INK + ';box-sizing:border-box;font:700 9px/16px ' + MONO + ';text-align:center;color:#111;font-style:normal}.sr-av i:first-child{margin-left:0}',
    '.sr-bar{width:64px;height:10px;border:2px solid ' + INK + ';border-radius:3px;background:' + PAPER + ';overflow:hidden}.sr-bar b{display:block;height:100%;width:0;background:var(--sr-accent)}',
    '#sr-hud.sr-done .sr-bar,#sr-hud.sr-done .sr-av,#sr-hud.sr-scanning .sr-av,#sr-hud.sr-scanning .sr-bar{display:none}',
    '@media(max-width:559px){#sr-hud .sr-av,#sr-hud .sr-bar,#sr-hud .sr-ag{display:none!important}}'
  ].join('');

  /* ---------- boot DOM ---------- */
  var style = el('style'); style.id = 'sr-style'; style.textContent = css;
  HTML.appendChild(style);
  HTML.style.setProperty('--sr-accent', ACCENT);
  var rootEl = el('div'); rootEl.id = 'sr-root';
  var canvas = el('canvas', '', rootEl); var ctx = canvas.getContext('2d');
  var agentsEl = el('div'); agentsEl.id = 'sr-agents';
  var scanEl = el('div'); scanEl.id = 'sr-scan'; scanEl.style.backgroundColor = ds.bg || 'var(--bg,#000)';
  var tile = el('div', 'sr-tile', scanEl);
  tile.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z"/></svg>';
  var cap = el('div', 'sr-cap', scanEl);
  cap.textContent = N + ' tiny agents are building this site. No pressure.';
  var cap2 = el('div', 'sr-cap sr-cap2', scanEl);
  cap2.textContent = 'Click or press any key for sound';
  var hint = el('div', 'sr-hint'), hintT = 0;
  function showHint(text, ms) {
    hint.textContent = text; hint.classList.add('sr-on');
    clearTimeout(hintT); hintT = setTimeout(hideHint, ms);
  }
  function hideHint() { clearTimeout(hintT); hint.classList.remove('sr-on'); }
  function isTouch() { return W.innerWidth < 640 || (W.matchMedia('(pointer: coarse)').matches && !W.matchMedia('(pointer: fine)').matches); }
  var hud = el('div'); hud.id = 'sr-hud';
  var hAv = el('div', 'sr-av', hud), hLbl = el('span', '', hud);
  var hAg = el('span', 'sr-ag', hud);
  var hBarW = el('div', 'sr-bar', hud), hBar = el('b', '', hBarW);
  var bSnd = el('button', 'sr-snd', hud), bTour = el('button', '', hud), bSpeed = el('button', 'sr-spd', hud), bX = el('button', '', hud);
  hLbl.appendChild(hAg);
  var SPK = '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 6v4h2.5l3.5 3V3L5 6z" fill="currentColor"/>', sndKey = '';
  function renderSnd() {
    var key = SFX.on ? (SFX.blocked() ? 'wait' : 'on') : 'off';
    if (key === sndKey) return;
    sndKey = key;
    bSnd.innerHTML = SPK + (key === 'off' ? '<path d="M11 6l4 4M15 6l-4 4"/>' : '<path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.6a6 6 0 0 1 0 8.8"/>') + '</svg>';
    bSnd.classList.toggle('sr-off', key === 'off'); bSnd.classList.toggle('sr-wait', key === 'wait');
    cap2.style.display = key === 'wait' && !gateOn ? '' : 'none';
    var lbl = key === 'off' ? 'Sound off (M)' : key === 'wait' ? 'Sound on (starts at your first click or key press)' : 'Sound on (M)';
    bSnd.title = lbl; bSnd.setAttribute('aria-label', lbl); bSnd.setAttribute('aria-pressed', SFX.on ? 'true' : 'false');
  }
  function toggleSound() {
    SFX.setOn(!SFX.on);
    setTimeout(renderSnd, 80);
  }
  bTour.textContent = 'Tour'; bSpeed.textContent = speed + '×'; bX.textContent = '×'; bX.title = 'Skip'; bX.setAttribute('aria-label', 'Skip animation');
  [rootEl, scanEl, agentsEl, hint, hud].forEach(function (n) { HTML.appendChild(n); });
  HTML.classList.add('sr-lock');
  phase = 'scan';

  var labelOnly = D.createTextNode('');
  hLbl.appendChild(labelOnly);

  /* ---------- agents ---------- */
  var ARROW = 'M0 0V16.5L4.6 12.4L7.6 19L10.4 17.8L7.5 11.3H13.4Z';
  for (var ai = 0; ai < N; ai++) (function (i) {
    var color = COLORS[i % 16];
    var e = el('div', 'sr-agent', agentsEl);
    e.style.color = color;
    e.innerHTML = '<svg class="sr-arrow" width="14" height="20" viewBox="0 0 14 20"><path d="' + ARROW + '" fill="' + color + '" style="stroke:var(--ink,#111)" stroke-width="1.6" stroke-linejoin="round"/></svg>' +
      '<svg class="sr-cross" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke-linecap="round"><path d="M12 3.5V20.5M3.5 12H20.5" style="stroke:var(--ink,#111)" stroke-width="4"/><path d="M12 3.5V20.5M3.5 12H20.5" stroke="' + color + '" stroke-width="1.6"/></g></svg>' +
      '<div class="sr-beam"></div><div class="sr-tag" style="background:' + color + '">' + NAMES[i % 16] + '</div>';
    var side = i % 4, x = side < 2 ? (side ? vw + 30 : -30) : Math.random() * vw, y = side < 2 ? Math.random() * vh : (side === 2 ? -30 : vh + 30);
    var fast = Math.random() < 0.25; // a few agents are twitchier than the rest
    agents.push({ i: i, e: e, arrow: e.querySelector('.sr-arrow'), cross: e.querySelector('.sr-cross'), beam: e.querySelector('.sr-beam'), color: color, x: x, y: y, vx: 0, vy: 0, rot: 0, press: 0, task: null, wx: Math.random() * vw, wy: Math.random() * vh * LINE, wt: 0,
      fast: fast, speed: fast ? 1000 + Math.random() * 500 : 300 + Math.random() * 450, force: fast ? 3500 + Math.random() * 2500 : 700 + Math.random() * 1100,
      spin: fast ? 2.2 + Math.random() * 1.2 : 0.8 + Math.random(), curl: Math.random() * 2 - 1, orbit: 70 + Math.random() * 100 });
    var d = el('i', '', hAv); d.textContent = NAMES[i % 16][0]; d.style.background = color;
    if (i >= 5) d.style.display = 'none';
  })(ai);
  hud.classList.add('sr-scanning');
  SFX.intro();

  /* ---------- layer collection ---------- */
  var SKIP = { SCRIPT: 1, STYLE: 1, TEMPLATE: 1, META: 1, BR: 1, NOSCRIPT: 1, LINK: 1 };
  var MEDIA = { IMG: 1, SVG: 1, CANVAS: 1, VIDEO: 1, AUDIO: 1, PICTURE: 1, INPUT: 1, TEXTAREA: 1, SELECT: 1, IFRAME: 1, HR: 1, PROGRESS: 1, METER: 1, OBJECT: 1, EMBED: 1 };

  function alpha(c) {
    if (!c || c === 'transparent') return 0;
    var m = c.match(/^rgba?\(([^)]+)\)/);
    if (m) { var p = m[1].split(/[ ,\/]+/).filter(Boolean); if (p.length > 3) { var a = parseFloat(p[3]); return /%/.test(p[3]) ? a / 100 : a; } return 1; }
    m = c.match(/\/\s*([\d.]+%?)/);
    if (m) { var v = parseFloat(m[1]); return /%/.test(m[1]) ? v / 100 : v; }
    return 1;
  }
  function hasPaint(cs) {
    if (alpha(cs.backgroundColor) > 0) return true;
    if (cs.backgroundImage && cs.backgroundImage !== 'none') return true;
    var sh = cs.boxShadow;
    if (sh && sh !== 'none' && /rgb|color\(|#|oklch|lab/.test(sh.replace(/rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0\)/g, ''))) return true;
    var sides = ['Top', 'Right', 'Bottom', 'Left'];
    for (var i = 0; i < 4; i++) {
      var s = sides[i];
      if (parseFloat(cs['border' + s + 'Width']) > 0 && cs['border' + s + 'Style'] !== 'none' && alpha(cs['border' + s + 'Color']) > 0) return true;
    }
    return false;
  }

  function collect() {
    layers = [];
    walk(D.body, null);
    function walk(node, parent) {
      for (var c = node.firstElementChild; c; c = c.nextElementSibling) visit(c, parent);
    }
    function visit(e, parent) {
      var tag = e.tagName.toUpperCase();
      if (SKIP[tag]) return;
      if (e.id && e.id.indexOf('sr-') === 0) return;
      if (e.hasAttribute('data-sr-skip') || e.hasAttribute('data-count')) return;
      var cs = getComputedStyle(e);
      if (cs.display === 'none') return;
      if (MEDIA[tag]) { layers.push(mk(e, parent, false, true, false)); return; }
      var box = hasPaint(cs);
      if (e.children.length) {
        // text nodes next to child elements become their own spans
        for (var n = e.firstChild, nx; n; n = nx) {
          nx = n.nextSibling;
          if (n.nodeType === 3 && n.nodeValue.trim()) {
            var sp = D.createElement('span'); sp.className = 'sr-tn';
            e.replaceChild(sp, n); sp.appendChild(n);
          }
        }
        var me = box ? mk(e, parent, true, false, false) : null;
        if (me) layers.push(me);
        walk(e, me || parent);
      } else {
        var txt = e.textContent;
        var t = txt ? txt.trim() : '';
        var isText = t !== '';
        if (box || isText) layers.push(mk(e, parent, box, false, isText));
      }
    }
    function mk(e, parent, box, media, text) {
      return { el: e, parent: parent, isBox: box, isMedia: media, isText: text, state: 0, trig: false, r: null, orig: null, txt: '', w: null, typed: null, rest: null };
    }
  }

  function hideText(l) {
    if (!l.w) {
      l.orig = Array.prototype.slice.call(l.el.childNodes);
      l.txt = l.el.textContent;
      l.w = el('span', 'sr-w'); l.typed = el('span', 'sr-typed', l.w); l.rest = el('span', 'sr-rest', l.w);
    }
    l.typed.textContent = ''; l.rest.textContent = l.txt;
    l.el.textContent = '';
    l.el.appendChild(l.w);
  }
  function restoreText(l) {
    if (!l.w || l.el.firstChild !== l.w) return;
    l.el.textContent = '';
    for (var i = 0; i < l.orig.length; i++) l.el.appendChild(l.orig[i]);
  }
  function hide(l) {
    if (l.isBox) l.el.classList.add('sr-hide-paint');
    if (l.isMedia) l.el.classList.add('sr-hide-media');
    if (l.isText) hideText(l);
  }
  function unhide(l) {
    l.el.classList.remove('sr-hide-paint', 'sr-hide-media', 'sr-reveal');
    if (l.isText) restoreText(l);
  }

  function fillStats() {
    var t = 0, f = 0;
    layers.forEach(function (l) { if (l.isText) t++; if (l.isBox || l.isMedia) f++; });
    var vals = { layers: layers.length, texts: t, frames: f, agents: N };
    D.querySelectorAll('[data-sr-stat]').forEach(function (s) {
      var v = vals[s.getAttribute('data-sr-stat')];
      if (v != null) s.textContent = fmt(v);
    });
  }

  function prepare() {
    if (!ds.accent) {
      var a = getComputedStyle(HTML).getPropertyValue('--accent').trim();
      if (a) { ACCENT = a; HTML.style.setProperty('--sr-accent', a); }
    }
    var logo = D.querySelector('[data-sr-logo]');
    if (logo) { var c = logo.cloneNode(true); c.removeAttribute('data-sr-logo'); tile.textContent = ''; tile.appendChild(c); }
    collect();
    fillStats();
    layers.forEach(hide);
    unfinished = layers.slice();
    layersReady = true;
    needCheck = true;
  }

  function whenReady(cb) {
    function go() {
      var fired = false;
      function fin() { if (fired) return; fired = true; requestAnimationFrame(function () { requestAnimationFrame(function () { setTimeout(cb, 350); }); }); }
      setTimeout(fin, 1200);
      if (D.fonts && D.fonts.ready) D.fonts.ready.then(fin, fin); else fin();
    }
    if (D.readyState === 'complete') go(); else W.addEventListener('load', go);
  }
  // Frameworks that hydrate must finish before the DOM is touched: data-wait names an
  // attribute on <html> that the app sets once it is hydrated (gives up after 8s).
  function whenHydrated(cb) {
    if (!ds.wait) return cb();
    var t0 = performance.now();
    (function poll() {
      if (HTML.hasAttribute(ds.wait) || performance.now() - t0 > 8000) cb(); else setTimeout(poll, 50);
    })();
  }
  // after a client-side navigation the page is already loaded: start on the next frames so the real page never shows first
  (fast ? function (cb) { requestAnimationFrame(function () { requestAnimationFrame(cb); }); } : whenReady)(function () { whenHydrated(function () { if (!dead) prepare(); }); });

  /* ---------- finishing ---------- */
  function freeAgent(a) {
    if (!a.task) return;
    var k = a.task;
    if (k.frame) removeFrame(k.frame);
    a.task = null;
    a.e.classList.remove('sr-working', 'sr-typing', 'sr-draw');
    if (k.caret) k.caret.style.display = 'none';
  }
  function finishLayer(l) {
    if (l.state === 2) return;
    unhide(l);
    l.state = 2; doneCount++;
  }
  function finishNow(l) {
    agents.forEach(function (a) { if (a.task && a.task.l === l) freeAgent(a); });
    finishLayer(l);
  }
  function removeFrame(f) {
    f.el.classList.add('sr-out');
    var i = frames.indexOf(f); if (i >= 0) frames.splice(i, 1);
    f.dead = true;
    setTimeout(function () { if (f.el.parentNode) f.el.parentNode.removeChild(f.el); if (f.lbl.parentNode) f.lbl.parentNode.removeChild(f.lbl); }, 300);
  }
  function newFrame(handles) {
    var f = { el: el('div', 'sr-frame', rootEl), lbl: null, x: 0, y: 0, w: 0, h: 0, dead: false };
    if (handles) for (var i = 0; i < 4; i++) { var h = el('div', 'sr-h', f.el); h.style.left = i % 2 ? 'auto' : '-4px'; h.style.right = i % 2 ? '-4px' : 'auto'; h.style.top = i < 2 ? '-4px' : 'auto'; h.style.bottom = i < 2 ? 'auto' : '-4px'; }
    f.lbl = el('div', 'sr-lbl', rootEl);
    frames.push(f);
    return f;
  }
  function setFrame(f, x, y, w, h, label) {
    f.x = x; f.y = y; f.w = w; f.h = h;
    f.el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    f.el.style.width = w + 'px'; f.el.style.height = h + 'px';
    f.lbl.textContent = label;
    f.lbl.style.display = label ? '' : 'none';
    f.lbl.style.transform = 'translate(' + (x + w / 2) + 'px,' + (y + h + 8) + 'px) translateX(-50%)';
    f.lbl.style.left = '0';
  }

  /* ---------- checking which layers are triggered ---------- */
  function check() {
    var lineY = vh * LINE, atBottom = W.scrollY + vh >= HTML.scrollHeight - 2;
    var keep = [];
    for (var i = 0; i < unfinished.length; i++) {
      var l = unfinished[i];
      if (l.state === 2) continue;
      var r = l.el.getBoundingClientRect();
      l.r = { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
      if (r.bottom < -60) { finishNow(l); continue; }
      if (!l.trig && (r.top < lineY || atBottom)) l.trig = true;
      if (l.trig && l.state === 0 && (r.width < 1 || r.height < 1 || r.right < 0 || r.left > vw)) { finishNow(l); continue; }
      keep.push(l);
    }
    unfinished = keep;
  }

  /* ---------- agent movement ---------- */
  function moveTo(a, tx, ty, k, dt) {
    var f = 1 - Math.exp(-k * dt), nx = a.x + (tx - a.x) * f, ny = a.y + (ty - a.y) * f;
    a.vx += ((nx - a.x) / dt - a.vx) * Math.min(1, dt * 12);
    a.vy += ((ny - a.y) / dt - a.vy) * Math.min(1, dt * 12);
    a.x = nx; a.y = ny;
  }
  function pointRot(a, dt, deg) {
    a.rot += angDiff(a.rot, deg) * (1 - Math.exp(-12 * dt));
  }
  function velRot(a, dt) {
    if (hyp(a.vx, a.vy) > 25) pointRot(a, dt, Math.atan2(a.vy, a.vx) * 180 / Math.PI + 115);
  }
  function render(a) {
    a.e.style.transform = 'translate3d(' + a.x.toFixed(1) + 'px,' + a.y.toFixed(1) + 'px,0)';
    var sq = 1 - a.press * 0.12;
    a.arrow.style.transform = 'rotate(' + a.rot.toFixed(1) + 'deg) scale(' + sq.toFixed(3) + ')';
    a.cross.style.transform = 'scale(' + sq.toFixed(3) + ')';
  }

  /* ---------- tasks ---------- */
  function eligible(l) { return l.state === 0 && l.trig && (!l.parent || l.parent.state >= 1); }
  function startTask(a, l) {
    l.state = 1;
    a.task = { l: l, phase: 'travel', t: 0, frame: null, caret: null, typedN: -1, dur: 0, bend: 0, x0: 0, y0: 0 };
    a.e.classList.add('sr-working');
  }
  function target(l, r) {
    if (l.isText && !l.isBox && !l.isMedia && l.w) {
      var fr = l.w.getClientRects()[0];
      if (fr) return { x: fr.left, y: fr.top };
    }
    return { x: r.left, y: r.top };
  }
  function nextAfterFill(a, k) {
    a.e.classList.remove('sr-draw');
    if (k.l.isText) { enterType(a, k); } else { k.phase = 'hold'; k.t = 0; }
  }
  function enterType(a, k) {
    k.phase = 'type'; k.t = 0;
    a.e.classList.add('sr-typing');
    if (!k.caret) { k.caret = el('div', 'sr-caret', rootEl); }
    k.caret.style.background = a.color; k.caret.style.display = 'block';
    k.dur = clamp(k.l.txt.length * 0.006, 0.15, 0.4);
  }

  function stepTask(a, k, r, dt) {
    var l = k.l; k.t += dt;
    var sp = speed * PACE * tempo;
    if (k.phase === 'travel') {
      // a timed, slightly curved sweep (not a straight glide), so the crew moves like people with mice
      var tp = target(l, r);
      if (!k.dur) {
        k.x0 = a.x; k.y0 = a.y;
        var d0 = hyp(tp.x - a.x, tp.y - a.y);
        k.dur = clamp(0.1 + Math.sqrt(d0) * 0.017, 0.12, 0.7);
        k.bend = (Math.random() < 0.5 ? -1 : 1) * (0.015 + Math.random() * 0.035) * Math.min(d0, 600);
      }
      var tk = Math.min(1, k.t * sp / k.dur), te = 0.5 * (tk * tk * (3 - 2 * tk)) + 0.5 * easeOut(tk);
      var tdx = tp.x - k.x0, tdy = tp.y - k.y0, tl = hyp(tdx, tdy) || 1, off = Math.sin(Math.PI * te) * k.bend;
      var nx = k.x0 + tdx * te - (tdy / tl) * off, ny = k.y0 + tdy * te + (tdx / tl) * off;
      a.vx += ((nx - a.x) / dt - a.vx) * Math.min(1, dt * 12); a.vy += ((ny - a.y) / dt - a.vy) * Math.min(1, dt * 12);
      a.x = nx; a.y = ny;
      if (tk >= 1) {
        a.x = tp.x; a.y = tp.y;
        k.frame = newFrame(!(l.isText && !l.isBox && !l.isMedia));
        k.t = 0; a.press = 1; SFX.press(a.x, vw);
        if (l.isBox || l.isMedia) { k.phase = 'draw'; a.e.classList.add('sr-draw'); setFrame(k.frame, r.left, r.top, 0, 0, '0 × 0'); }
        else { k.phase = 'type'; setFrame(k.frame, r.left, r.top, r.width, r.height, ''); enterType(a, k); }
      }
    } else if (k.phase === 'draw') {
      var dur = (0.16 + Math.min(0.26, Math.sqrt(r.width * r.height) / 2000)) / sp;
      var p = easeOut(Math.min(1, k.t / dur)), fw = r.width * p, fh = r.height * p;
      setFrame(k.frame, r.left, r.top, fw, fh, Math.round(fw) + ' × ' + Math.round(fh));
      moveTo(a, r.left + fw, r.top + fh, 30, dt);
      if (k.t >= dur) {
        k.phase = 'fill'; k.t = 0;
        SFX.place(l.isMedia ? 'image' : 'rect', r.left + r.width / 2, r.top + r.height / 2, r.width, r.height, vw, vh);
        var e = l.el;
        e.classList.add('sr-reveal');
        e.classList.remove('sr-hide-paint', 'sr-hide-media');
        setTimeout(function () { e.classList.remove('sr-reveal'); }, 800);
      }
    } else if (k.phase === 'fill') {
      setFrame(k.frame, r.left, r.top, r.width, r.height, Math.round(r.width) + ' × ' + Math.round(r.height));
      var wob = 0.1 / sp;
      if (k.t >= wob) nextAfterFill(a, k);
    } else if (k.phase === 'type') {
      var len = l.txt.length, p2 = Math.min(1, k.t / (k.dur / sp)), n = Math.floor(len * p2);
      setFrame(k.frame, r.left, r.top, r.width, r.height, (l.isBox || l.isMedia) ? Math.round(r.width) + ' × ' + Math.round(r.height) : '');
      if (n !== k.typedN) {
        var prevN = Math.max(0, k.typedN);
        k.typedN = n; l.typed.textContent = l.txt.slice(0, n); l.rest.textContent = l.txt.slice(n);
        if (n > prevN) SFX.key(a.x, vw, a.i, n - prevN, /\s/.test(l.txt.slice(prevN, n)) ? 1 : 0);
      }
      var rects = l.typed.getClientRects(), cr;
      if (rects.length) cr = rects[rects.length - 1]; else cr = l.rest.getClientRects()[0];
      var cx, cy, ch;
      if (cr) { cx = rects.length ? cr.right : cr.left; cy = cr.top; ch = cr.height; } else { cx = r.left; cy = r.top; ch = 16; }
      k.caret.style.height = ch + 'px';
      k.caret.style.transform = 'translate(' + cx + 'px,' + cy + 'px)';
      a.beam.style.height = ch + 'px';
      moveTo(a, cx, cy, 25, dt);
      if (p2 >= 1) { k.phase = 'hold'; k.t = 0; k.caret.style.display = 'none'; a.e.classList.remove('sr-typing'); }
    } else if (k.phase === 'hold') {
      if (k.t >= 0.08 / sp) {
        var fr = k.frame;
        if (k.caret) { k.caret.parentNode && k.caret.parentNode.removeChild(k.caret); }
        a.task = null; k.frame = null;
        a.e.classList.remove('sr-working', 'sr-typing', 'sr-draw');
        finishLayer(l);
        if (fr) removeFrame(fr);
      }
    }
  }

  /* ---------- guides canvas ---------- */
  var TH = { ink: '#111', paper: '#f6f2ea', mono: 'monospace' };
  function readTheme() {
    var c = getComputedStyle(HTML);
    TH.ink = c.getPropertyValue('--ink').trim() || TH.ink;
    TH.paper = c.getPropertyValue('--bg').trim() || TH.paper;
    var m = c.getPropertyValue('--font-jetbrains').trim();
    TH.mono = (m ? m + ',' : '') + 'ui-monospace,Menlo,monospace';
  }
  var dpr = Math.min(2, W.devicePixelRatio || 1);
  function sizeCanvas() {
    vw = W.innerWidth; vh = W.innerHeight;
    canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
  }
  sizeCanvas();

  function drawGuides() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
    if (guideAlpha < 0.01) return;
    ctx.globalAlpha = guideAlpha;
    var rulers = vw >= 700, R = 20, act = frames.filter(function (f) { return !f.dead; });
    var ly = vh * LINE;
    ctx.strokeStyle = ACCENT; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, ly + 0.5); ctx.lineTo(vw, ly + 0.5); ctx.stroke();
    ctx.font = '700 10px ' + TH.mono; ctx.fillStyle = ACCENT; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText('BUILD LINE', vw - 8, ly - 4);
    if (rulers) {
      ctx.globalAlpha = guideAlpha * 0.8; ctx.fillStyle = TH.paper; ctx.fillRect(0, 0, vw, R); ctx.fillRect(0, 0, R, vh); ctx.globalAlpha = guideAlpha;
      ctx.fillStyle = TH.ink; ctx.fillRect(0, R, vw, 1); ctx.fillRect(R, 0, 1, vh);
      ctx.fillStyle = ACCENT;
      ctx.globalAlpha = guideAlpha * 0.3;
      act.forEach(function (f) { ctx.fillRect(f.x, 0, f.w, R); ctx.fillRect(0, f.y, R, f.h); });
      ctx.globalAlpha = guideAlpha;
      ctx.strokeStyle = TH.ink; ctx.fillStyle = TH.ink; ctx.font = '600 9px ' + TH.mono; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      var sx = W.scrollX, sy = W.scrollY, i, v;
      ctx.beginPath();
      for (v = Math.ceil(sx / 10) * 10; v < sx + vw; v += 10) {
        var x = Math.round(v - sx) + 0.5, len = v % 100 === 0 ? R : v % 50 === 0 ? 7 : 4;
        ctx.moveTo(x, R - len); ctx.lineTo(x, R);
        if (v % 100 === 0) ctx.fillText(String(v), x + 3, 2);
      }
      for (v = Math.ceil(sy / 10) * 10; v < sy + vh; v += 10) {
        var y = Math.round(v - sy) + 0.5, len2 = v % 100 === 0 ? R : v % 50 === 0 ? 7 : 4;
        ctx.moveTo(R - len2, y); ctx.lineTo(R, y);
        if (v % 100 === 0) { ctx.save(); ctx.translate(2, y - 3); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'right'; ctx.fillText(String(v), 0, 0); ctx.restore(); }
      }
      ctx.stroke();
      ctx.strokeStyle = ACCENT; ctx.globalAlpha = guideAlpha * 0.55; ctx.setLineDash([2, 3]);
      ctx.beginPath();
      act.forEach(function (f) { ctx.moveTo(f.x + 0.5, f.y); ctx.lineTo(f.x + 0.5, R); ctx.moveTo(f.x, f.y + 0.5); ctx.lineTo(R, f.y + 0.5); });
      ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- HUD ---------- */
  var lastHud = '';
  function updateHud() {
    renderSnd();
    var total = layers.length, txt, ag = '';
    hud.classList.toggle('sr-idle', phase === 'done' && performance.now() - doneAt > 3000);
    hud.classList.toggle('sr-scanning', phase === 'scan');
    hud.classList.toggle('sr-done', phase === 'done' || phase === 'leaving');
    if (phase === 'scan' && gateOn) txt = 'Ready · ' + fmt(total) + ' layers';
    else if (phase === 'scan') txt = 'Scanning page… ' + fmt(layersReady ? Math.round(total * Math.min(1, scanT / (1.9 / speed))) : 0) + ' layers';
    else if (phase === 'build') { ag = N + ' agents   '; txt = fmt(doneCount) + ' / ' + fmt(total) + ' layers'; }
    else txt = 'Rebuilt ' + fmt(total) + ' layers in ' + elapsed.toFixed(1) + 's';
    var key = ag + txt + phase + tourOn + isTouch();
    if (key === lastHud) { if (phase === 'build') hBar.style.width = (total ? doneCount / total * 100 : 0) + '%'; return; }
    lastHud = key;
    hAg.textContent = ag; labelOnly.nodeValue = txt;
    hBar.style.width = (total ? doneCount / total * 100 : 0) + '%';
    bTour.textContent = (phase === 'done' || phase === 'leaving') ? 'Replay' : tourOn ? 'Pause' : 'Tour';
    bX.title = phase === 'done' ? 'Dismiss' : 'Skip';
    bX.textContent = phase === 'build' ? (isTouch() ? 'Skip' : 'Skip (Esc)') : '×';
  }

  /* ---------- finale flock: boids-style orbit around the mouse (or a slow wandering point) ---------- */
  function flock(list, dt, time) {
    if (!list.length) return;
    var m = mouse.on ? mouse : null, sc = vw < 640 ? 0.6 : 1, i, j, a;
    var o = m || { x: vw * (0.5 + 0.28 * Math.sin(time * 0.37)), y: vh * (0.5 + 0.25 * Math.sin(time * 0.53 + 1)) };
    if (m && fl.has && dt > 0) {
      var kv = Math.min(1, dt * 18);
      fl.tx += ((m.x - fl.lx) / dt - fl.tx) * kv; fl.ty += ((m.y - fl.ly) / dt - fl.ty) * kv;
    } else { fl.tx = 0; fl.ty = 0; }
    fl.has = !!m; if (m) { fl.lx = m.x; fl.ly = m.y; }
    var R = 135 * sc * (1 + 0.18 * Math.sin(time * 0.55)), swirl = Math.tanh(Math.cos(time * 0.11) * 3), want = [];
    for (i = 0; i < list.length; i++) {
      a = list[i];
      var rx = a.x - o.x, ry = a.y - o.y, d = hyp(rx, ry) || 0.01, nx = rx / d, ny = ry / d, ang = Math.atan2(ry, rx);
      var rr = R * (1 + 0.3 * Math.sin(3 * ang + time * 0.7)) + (a.orbit - 120) * 0.55 * sc;
      var tang = 300 * 0.85 * (0.7 + a.spin * 0.2) * swirl, rad = clamp((rr - d) * 4, -2600, 1400), far = Math.min(1, Math.max(0, (d - rr) / 600));
      want.push([-ny * tang + nx * rad - ny * a.curl * 400 * far, nx * tang + ny * rad + nx * a.curl * 400 * far]);
    }
    for (i = 0; i < list.length; i++) {
      a = list[i];
      var ax = 0, ay = 0, ws = 0;
      for (j = 0; j < list.length; j++) {
        if (j === i) continue;
        var q = list[j], dd = hyp(q.x - a.x, q.y - a.y);
        if (dd > 90) continue;
        var w = 1 - dd / 90; ax += q.vx * w; ay += q.vy * w; ws += w;
      }
      var fx = want[i][0], fy = want[i][1];
      if (ws > 0) { fx = fx * 0.7 + (ax / ws) * 0.3; fy = fy * 0.7 + (ay / ws) * 0.3; }
      var dist = Math.max(0, hyp(a.x - o.x, a.y - o.y) - 180 * sc), maxV = a.speed * 0.7 * (1.3 + Math.min(3.2, dist / 90)), L = hyp(fx, fy);
      if (L > maxV) { fx *= maxV / L; fy *= maxV / L; }
      var gx = (fx - a.vx) * 6, gy = (fy - a.vy) * 6, maxF = a.force * 0.7 * (1.4 + Math.min(5, dist / 50)), G = hyp(gx, gy);
      if (G > maxF) { gx *= maxF / G; gy *= maxF / G; }
      a.vx += gx * dt; a.vy += gy * dt; a.x += a.vx * dt; a.y += a.vy * dt;
    }
    if (m) for (i = 0; i < list.length; i++) { // keep a bubble around the real pointer
      a = list[i];
      var px = a.x - m.x, py = a.y - m.y, pd = hyp(px, py) || 0.01;
      if (pd >= 48) continue;
      var pnx = px / pd, pny = py / pd;
      a.x = m.x + pnx * 48; a.y = m.y + pny * 48;
      var rel = (a.vx - fl.tx) * pnx + (a.vy - fl.ty) * pny;
      if (rel < 0) { a.vx -= pnx * rel * 1.6; a.vy -= pny * rel * 1.6; }
      a.vx += pnx * 260; a.vy += pny * 260;
    }
  }

  /* ---------- main loop ---------- */
  var last = performance.now();
  function frame(now) {
    if (dead) return;
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000)); last = now;
    if (phase === 'gone') return;
    // Client-side navigation keeps this script alive: stand down when leaving the page it was made for.
    if (location.pathname !== myPath) { shutdown(); return; }
    var time = now / 1000, i, a;

    if (phase === 'scan') {
      scanT += dt;
      var cx = vw / 2, cy = vh / 2, rx = Math.min(vw * 0.32, 230), ry = Math.min(vh * 0.28, 170);
      for (i = 0; i < agents.length; i++) {
        a = agents[i];
        var f = i % 3, dir = f === 1 ? -1 : 1, ang = dir * time * 1.7 + f * Math.PI * 2 / 3 + i * 0.25;
        moveTo(a, cx + Math.cos(ang) * rx + Math.sin(time * 3 + i * 1.7) * 10, cy + Math.sin(ang) * ry + Math.cos(time * 2.6 + i * 2.1) * 10, 5, dt);
        velRot(a, dt); render(a);
      }
      if (layersReady && scanT >= 1.9 / speed) {
        if (entered || fast || (!gateOn && !SFX.blocked())) endScan();
        else if (!gateOn) showGate();
      }
      updateHud();
      return;
    }

    if (phase === 'leaving') {
      leaveT += dt;
      agents.forEach(function (a) { moveTo(a, a.leaveX, a.y, 2.5, dt); velRot(a, dt); render(a); });
      if (leaveT > 1.8) { agentsEl.style.display = 'none'; hud.style.display = 'none'; phase = 'gone'; }
      return;
    }

    // build / done
    var sy = W.scrollY;
    scrollV = Math.max(scrollV * Math.exp(-dt * 1.2), scrollV * 0.7 + Math.abs(sy - lastSY) / dt * 0.3); lastSY = sy;
    if (needCheck || now - lastCheck > 350) {
      needCheck = false; lastCheck = now; readTheme();
      if (phase === 'build') check();
    }
    if (tourOn && phase === 'build') {
      var pend = 0;
      for (i = 0; i < unfinished.length; i++) if (eligible(unfinished[i])) pend++;
      var atEnd = W.scrollY + vh >= HTML.scrollHeight - 2;
      if (atEnd) tourOn = false;
      // Glide in short runs: once the swarm has been idle for a moment (time to read), scroll a
      // stretch, let it build, then pause again.
      else if (tourRun > 0 || (pend === 0 && now - lastBusy > 500 / speed)) {
        if (tourRun <= 0) tourRun = 450;
        var step = 120 * speed * dt;
        tourRun -= step; tourY = Math.max(tourY, W.scrollY) + step; W.scrollTo({ top: tourY, behavior: 'instant' });
      }
      else tourY = W.scrollY;
    }

    // pending (triggered) layers
    var pending = [];
    for (i = 0; i < unfinished.length; i++) { var u = unfinished[i]; if (u.state === 0 && u.trig) pending.push(u); }

    tempo += (clamp(1.2 + scrollV / 2500 + pending.length / N * 0.3, 1.2, 1.7) - tempo) * Math.min(1, dt * 4);

    // assign free agents. Only a few build at once, top to bottom, so the motion stays in one place
    // and is easy to read around; as soon as work queues up (scrolling) the whole crew joins in.
    var busyN = 0, maxWork = pending.length > 5 ? N : Math.min(N, 7);
    for (i = 0; i < agents.length; i++) if (agents[i].task) busyN++;
    for (i = 0; i < agents.length; i++) {
      a = agents[i];
      if (a.task || phase !== 'build' || busyN >= maxWork) continue;
      var best = null, bs = 1e12;
      for (var j = 0; j < pending.length; j++) {
        var l = pending[j];
        if (l.state !== 0 || !eligible(l) || !l.r) continue;
        var sc = l.r.top + 0.3 * hyp(a.x - l.r.left, a.y - l.r.top);
        if (sc < bs) { bs = sc; best = l; }
      }
      if (best) { startTask(a, best); busyN++; }
    }

    // read pass
    var rects = [];
    for (i = 0; i < agents.length; i++) {
      a = agents[i];
      if (a.task) { var rr = a.task.l.el.getBoundingClientRect(); rects[i] = rr; }
    }

    var working = 0;
    var idle = [];
    for (i = 0; i < agents.length; i++) {
      a = agents[i];
      if (a.task) {
        working++;
        stepTask(a, a.task, rects[i], dt);
        pointRot(a, dt, 0);
      } else idle.push(a);
    }
    if (working > 0 || pending.length > 0) lastBusy = now;
    if (phase === 'build' && working === 0 && pending.length === 0 && unfinished.length === 0) completeBuild();

    if (phase === 'done') {
      // The finale: the crew keeps orbiting and weaving around the pointer even while it rests, and
      // only drifts off the sides after a long time with nobody around (25 s with the pointer parked;
      // 12 s with no pointer at all, e.g. on touch screens, where they circle a slow wandering point).
      var stay = mouse.on ? now - mouse.t < 25000 : now - Math.max(doneAt, mouse.t) < 12000;
      if (stay) flock(idle, dt, time);
      else for (i = 0; i < idle.length; i++) moveTo(idle[i], idle[i].x < vw / 2 ? -60 : vw + 60, idle[i].y, 1.5, dt);
      for (i = 0; i < idle.length; i++) velRot(idle[i], dt);
    } else {
      // Waiting agents rest faintly in the margins instead of drifting over the text.
      for (i = 0; i < idle.length; i++) {
        a = idle[i];
        a.wt -= dt;
        if (a.wt <= 0) { a.wt = 2.5 + Math.random() * 3; a.wx = (a.i % 2 ? vw - 18 : 18) + (Math.random() - 0.5) * 14; a.wy = vh * 0.06 + Math.random() * vh * 0.82; }
        moveTo(a, a.wx, a.wy, 0.9, dt);
        velRot(a, dt);
      }
    }
    for (i = 0; i < agents.length; i++) {
      a = agents[i];
      // Builders are fully opaque; waiting agents sit in the margins at a softer, still clearly visible opacity.
      if (a.press > 0) a.press = Math.max(0, a.press - dt * 6);
      var op = a.task ? '1' : '0.6';
      if (a.op !== op) { a.op = op; a.e.style.opacity = op; }
      render(a);
    }

    // guides fade
    if (working > 0 && phase === 'build') { lastWork = now; guideAlpha = Math.min(0.4, guideAlpha + dt * 1.2); }
    else if (now - lastWork > 1800) guideAlpha = Math.max(0, guideAlpha - dt * 0.8);
    drawGuides();
    updateHud();
  }

  // Browsers only start audio after a click or key press, so a fresh visit waits here for one:
  // the click that enters the portfolio is also what turns the sound on.
  function showGate() {
    gateOn = true; cap2.style.display = 'none';
    agentsEl.style.transition = 'opacity .5s'; agentsEl.style.opacity = '.55'; // keep the crew from crowding the button
    cap.textContent = 'The crew is ready to build this site.';
    gateEl = el('div', 'sr-gate', scanEl);
    var b = el('button', 'sr-enter', gateEl); b.type = 'button'; b.textContent = 'Enter portfolio';
    el('small', '', gateEl).textContent = 'Sound on · press M to mute';
    b.addEventListener('click', function (e) { e.stopPropagation(); enter(); });
    requestAnimationFrame(function () { if (gateEl) gateEl.classList.add('sr-on'); try { b.focus({ preventScroll: true }); } catch (x) {} });
  }
  function enter() {
    if (entered) return;
    entered = true; SFX.unlock();
    var went = false;
    function go() { if (went || dead || phase !== 'scan') return; went = true; SFX.intro(); endScan(); }
    // the context needs a moment to leave "suspended"; start the moment it is running
    if (SFX.ctx && SFX.ctx.state !== 'running') { SFX.ctx.resume().then(go, go); setTimeout(go, 400); } else go();
  }

  function endScan() {
    phase = 'build'; buildT0 = performance.now(); SFX.start(); SFX.musicStart();
    scanEl.classList.add('sr-out'); entered = true; agentsEl.style.opacity = '';
    HTML.classList.remove('sr-lock');
    setTimeout(function () { if (phase !== 'scan') scanEl.style.display = scanEl.classList.contains('sr-out') ? 'none' : ''; }, 600);
    W.scrollTo({ top: 0, behavior: 'instant' });
    needCheck = true;
    showHint('Keep scrolling. The crew builds just ahead of you.' + (isTouch() ? '' : ' (Esc = skip)'), 6500);
  }
  var told = false;
  function completeBuild(skipped) {
    if (skipped) { SFX.release(); SFX.musicStop(1.2); } else { SFX.finale(); SFX.musicStop(4); } // music fades as the build finishes
    elapsed = (performance.now() - buildT0) / 1000; doneAt = performance.now();
    phase = 'done'; tourOn = false;
    if (!told && W.matchMedia('(pointer: fine)').matches) { told = true; showHint('Ta-da! Wiggle your mouse, the crew tags along.', 5000); }
  }

  function shutdown() {
    SFX.musicStop(1);
    abortAll();
    layers.forEach(function (l) { try { finishLayer(l); } catch (e) {} });
    unfinished = []; tourOn = false; hideHint();
    [rootEl, scanEl, agentsEl, hint, hud].forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
    HTML.classList.remove('sr-lock');
    phase = 'gone'; dead = true;
    offs.forEach(function (f) { f(); }); offs = [];
    if (style.parentNode) style.parentNode.removeChild(style);
    HTML.style.removeProperty('--sr-accent');
  }

  /* ---------- public controls ---------- */
  function abortAll() { agents.forEach(freeAgent); frames.slice().forEach(removeFrame); }
  function skip() {
    if (phase === 'scan') { if (!layersReady) return; endScan(); }
    if (phase !== 'build') return;
    abortAll();
    layers.forEach(finishLayer);
    unfinished = [];
    hideHint();
    completeBuild(true);
  }
  function replay() {
    if (!layersReady) return;
    abortAll();
    layers.forEach(function (l) { l.state = 0; l.trig = false; l.r = null; l.el.classList.remove('sr-reveal'); hide(l); });
    unfinished = layers.slice(); doneCount = 0; tourOn = false; scanT = 0;
    agentsEl.style.display = ''; hud.style.display = '';
    scanEl.style.display = ''; void scanEl.offsetWidth; scanEl.classList.remove('sr-out');
    HTML.classList.add('sr-lock');
    W.scrollTo({ top: 0, behavior: 'instant' });
    phase = 'scan'; lastHud = ''; hideHint(); SFX.musicStop(0.8); SFX.intro();
  }
  function dismiss() {
    phase = 'leaving'; leaveT = 0; SFX.release();
    agents.forEach(function (a) { a.leaveX = a.x < vw / 2 ? -60 : vw + 60; });
  }
  function setSpeed(s) { speed = s; bSpeed.textContent = s + '×'; }
  function tour() {
    if (phase !== 'build') return;
    tourOn = !tourOn; tourY = W.scrollY; tourRun = 0; lastHud = '';
  }

  bSnd.addEventListener('click', toggleSound);
  bTour.addEventListener('click', function () { if (phase === 'done') replay(); else tour(); });
  bSpeed.addEventListener('click', function () { setSpeed(speed === 1 ? 2 : speed === 2 ? 4 : 1); });
  bX.addEventListener('click', function () { if (phase === 'done') dismiss(); else skip(); });
  on(D, 'click', function (e) {
    var t = e.target && e.target.closest && e.target.closest('[data-sr-replay]');
    if (t) { e.preventDefault(); replay(); }
  });
  on(W, 'keydown', function (e) {
    if (e.key === 'Escape') skip();
    else if ((e.key === 'm' || e.key === 'M') && !e.metaKey && !e.ctrlKey && !e.altKey && !(e.target && (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable))) toggleSound();
    else if (tourOn && /^(Arrow|Page|Home|End| )/.test(e.key)) { tourOn = false; lastHud = ''; }
  });
  function stopTour() { if (tourOn) { tourOn = false; lastHud = ''; } }
  on(W, 'wheel', stopTour, { passive: true });
  on(W, 'touchstart', stopTour, { passive: true });
  on(W, 'scroll', function () { lastScroll = performance.now(); needCheck = true; }, { passive: true });
  on(W, 'resize', function () { sizeCanvas(); needCheck = true; });

  on(W, 'pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    var dx = e.clientX - mouse.x, dy = e.clientY - mouse.y, d = hyp(dx, dy);
    if (mouse.on && d > 2) {
      var k = Math.min(1, d / 40), nx = mouse.dx + (dx / d - mouse.dx) * k, ny = mouse.dy + (dy / d - mouse.dy) * k, nl = hyp(nx, ny) || 1;
      mouse.dx = nx / nl; mouse.dy = ny / nl; mouse.t = performance.now();
    } else if (!mouse.on) mouse.t = performance.now();
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true;
  }, { passive: true });
  on(HTML, 'mouseleave', function () { mouse.on = false; });
  on(W, 'blur', function () { mouse.on = false; });

  W.SwarmRebuild = {
    replay: replay, skip: skip, setSpeed: setSpeed, tour: tour,
    layers: function () { return layers.map(function (l) { return { el: l.el, box: l.isBox, media: l.isMedia, text: l.isText, done: l.state === 2 }; }); }
  };

  requestAnimationFrame(frame);
  updateHud();
  return { path: myPath, shutdown: shutdown, dead: function () { return dead; } };
  }

  /* ---------- page manager: runs one swarm per allowed page, follows client-side navigation ---------- */
  var cur = null, startedFor = null, first = true;
  function sync() {
    var path = location.pathname;
    if (cur && (cur.dead() || cur.path !== path)) { cur.shutdown(); cur = null; }
    if (!pathOk()) { startedFor = null; return; }
    if (!cur && startedFor !== path) {
      startedFor = path;
      cur = create(path, !first); // after a client-side navigation, start at once (no visible un-built page)
      first = false;
    }
  }
  W.SwarmRebuild = NOOP;
  sync();
  setInterval(sync, 50);
})();
