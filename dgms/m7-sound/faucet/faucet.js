/* The faucet (Module 7, Sound Design; deck slides 94-99, 177-189, 223-236).
   Four canvases, one faucet:
   1. "What does a faucet sound like?" (95-99): write your list, then reveal the deck's four sounds (startup, continuous
      running water, rising pitch as the cup fills, the handle's screech). Each card plays and animates its sound.
   2. Static vs continuous (177-185): a top-down room with a sink. The handle plays a static start, the water is a seamless
      loop (start, play, reset, play... stop), the cup fill is a static event with rising pitch, all drawn on a live timeline.
      "Broken loop" puts a click at every reset, like Sonic Colors Ultimate's early loop (70).
   3. Panning and attenuation (186-188, 234-236): drag the listener; the sink pans left/right and falls off with distance
      along an editable curve (linear or logarithmic, min and max distance).
   4. Start at -20 dB (189, 232-233): a faucet loop over a quiet room bed, with a fader that starts at -20 dB.
   Every sound is synthesised with the Web Audio API (no files). The AudioContext is created on the first click of a
   "Sound" button. Everything audible is also drawn (rings from the source, meters, timeline, scope), and every canvas is
   a pure function of time plus the learner's inputs, so window.__seek(t, which) is deterministic and never plays audio.
   Tunable rules live in R (timings, distances, levels) and the tour tables (TL_TOUR, FO_TOUR, LV_TOUR) below. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585;
  const R = {
    LOOP: 1.5,        // s, length of the water loop (one "play" between resets)
    LOOP_IN: 0.25,    // s after the handle turns before the loop takes over from the startup gush
    SQUEAK: 0.5,      // s, static handle sound (start and stop)
    FILL: 3.0,        // s, static cup fill (pitch rises over exactly this long)
    TAIL: 0.35,       // s, water fade after the stop
    PXM: 50,          // canvas px per metre
    PAN_M: 4,         // m of sideways offset for the widest pan
    PAN_MAX: 0.85,    // widest pan (StereoPanner value)
    MIN_D: 1, MAX_D: 8, CURVE: 'log',
    FADER: -20,       // dB, where every fader starts (slides 189, 232-233)
    BED_DB: -40,      // dB, the quiet room bed on slide 4
    SQUEAK_DB: -3, FILL_DB: -2, CLICK_DB: 6,   // levels relative to the water loop (0 dB)
  };
  const hash = i => { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
  const db2g = d => Math.pow(10, d / 20), g2db = g => g > 1e-6 ? 20 * Math.log10(g) : -120;
  const sum = a => a.reduce((s, v) => s + v, 0);
  const CARD = 'rgba(255,252,244,.85)', PANEL = '#efe6d2', LINE = '#cdbf9f';
  const WATER = '#2ea3dc', STATIC = '#e0a92d', FILLC = '#8a4fd6', CLICKC = '#e5322d';
  const font = (w, s, f = 'Jost') => `${w} ${s}px ${f === 'M' ? 'Montserrat, Jost' : 'Jost'}, sans-serif`;
  function text(g, s, x, y, col = C.ink, f = font(600, 13), al = 'left', base = 'alphabetic') { g.font = f; g.fillStyle = col; g.textAlign = al; g.textBaseline = base; g.fillText(s, x, y); }
  function panel(g, x, y, w, h, title) { g.fillStyle = PANEL; g.beginPath(); g.roundRect(x, y, w, h, 12); g.fill(); if (title) text(g, title, x + 14, y + 24, C.ink, font(800, 14, 'M')); }
  function chip(g, s, x, y, col, al = 'left') {
    g.font = font(700, 12); const w = g.measureText(s).width + 14, bx = al === 'right' ? x - w : al === 'center' ? x - w / 2 : x;
    g.fillStyle = col; g.beginPath(); g.roundRect(bx, y - 10, w, 20, 10); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(s, bx + 7, y + 1); g.textBaseline = 'alphabetic';
    return w;
  }

  /* ---------------- audio: one context for the page, made on the first "Sound" click ---------------- */
  const AU = { ctx: null, master: null, on: false, buf: {} };
  function mkLoop(c, len, gen, fade = .12) {
    // generate len + fade seconds, then crossfade the tail into the head so the loop point is seamless
    const sr = c.sampleRate, L = Math.round(len * sr), F = Math.round(fade * sr), x = gen(L + F, sr, L);
    const out = new Float32Array(L);
    for (let i = 0; i < L; i++) out[i] = i < F ? x[i] * Math.sqrt(i / F) + x[L + i] * Math.sqrt(1 - i / F) : x[i];
    let pk = 0; out.forEach(v => { pk = Math.max(pk, Math.abs(v)); }); for (let i = 0; i < L; i++) out[i] *= .95 / pk;
    return out;
  }
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function buildBuffers(c) {
    const toBuf = arr => { const b = c.createBuffer(1, arr.length, c.sampleRate); b.copyToChannel(arr, 0); return b; };
    // running water: band-limited noise with a slow gurgle whose cycles fit the loop exactly
    const water = mkLoop(c, R.LOOP, (N, sr, L) => {
      const r = rng(7), x = new Float32Array(N); let a = 0, b = 0;
      for (let i = 0; i < N; i++) {
        const w = r() * 2 - 1; a += (w - a) * .42; b += (a - b) * .04;
        const ph = (i % L) / L, am = .72 + .16 * Math.sin(TAU * 3 * ph) + .12 * Math.sin(TAU * 7 * ph + 1);
        x[i] = (a - b) * am;
      }
      return x;
    });
    // broken: the loop is cut early (a gap) and restarts with a hard step, which clicks at every reset
    const broken = water.slice(), sr = c.sampleRate, gap = Math.round(.09 * sr);
    for (let i = broken.length - gap; i < broken.length; i++) broken[i] = 0;
    for (let i = 0; i < 60; i++) broken[i] = .95 * (1 - i / 60) * (i % 2 ? -1 : 1) + broken[i] * (i / 60);
    // room bed: soft brown noise
    const bed = mkLoop(c, 2.4, N => { const r = rng(3), x = new Float32Array(N); let a = 0; for (let i = 0; i < N; i++) { a = (a + (r() * 2 - 1) * .02) * .995; x[i] = a; } return x; }, .3);
    AU.buf = { water: toBuf(water), broken: toBuf(broken), bed: toBuf(bed) };
  }
  function ensure() {
    if (!AU.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      const c = AU.ctx = new AC(); AU.master = c.createGain(); AU.master.gain.value = 0; AU.master.connect(c.destination);
      buildBuffers(c);
    }
    if (AU.ctx.state === 'suspended') AU.ctx.resume();
    return AU.ctx;
  }
  const live = () => AU.on && AU.ctx;
  function setSound(on) {
    if (on && !ensure()) return;
    AU.on = on;
    if (AU.ctx) AU.master.gain.setTargetAtTime(on ? 1 : 0, AU.ctx.currentTime, .03);
    $$(document, '.fc-snd').forEach(b => { b.classList.toggle('on', on); b.textContent = on ? '♪ Sound: on' : '♪ Sound: off'; });
  }
  document.addEventListener('click', e => { if (e.target.closest('.fc-snd')) setSound(!AU.on); });
  // a channel strip: input -> fader -> distance -> pan -> master
  function strip() {
    const c = AU.ctx, s = { in: c.createGain(), fader: c.createGain(), dist: c.createGain(), pan: c.createStereoPanner ? c.createStereoPanner() : null };
    s.in.connect(s.fader); s.fader.connect(s.dist); if (s.pan) { s.dist.connect(s.pan); s.pan.connect(AU.master); } else s.dist.connect(AU.master);
    s.set = (faderDb, distG, pan) => { const n = c.currentTime; s.fader.gain.setTargetAtTime(db2g(faderDb) * 1.6, n, .03); s.dist.gain.setTargetAtTime(distG, n, .04); if (s.pan) s.pan.pan.setTargetAtTime(pan, n, .04); };
    return s;
  }
  function noiseSrc(buf, loop = true, off = 0, when = AU.ctx.currentTime) { const s = AU.ctx.createBufferSource(); s.buffer = buf; s.loop = loop; s.start(when, off % buf.duration); return s; }
  function env(param, when, pts) { param.setValueAtTime(pts[0][1], when); pts.slice(1).forEach(([dt, v]) => param.linearRampToValueAtTime(v, when + dt)); }
  // the handle: a metal squeak (rising when it opens, falling when it closes) plus a clunk, and the gush on start
  function sndHandle(dst, up, gush = up) {
    const c = AU.ctx, now = c.currentTime, f0 = up ? 620 : 1250, f1 = up ? 1300 : 560;
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, now); o.frequency.exponentialRampToValueAtTime(f1, now + .42);
    const vib = c.createOscillator(), vg = c.createGain(); vib.frequency.value = 26; vg.gain.value = 40; vib.connect(vg); vg.connect(o.frequency);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 7; bp.frequency.setValueAtTime(f0 * 2, now); bp.frequency.exponentialRampToValueAtTime(f1 * 2, now + .42);
    const g = c.createGain(); env(g.gain, now, [[0, 0], [.05, .55], [.36, .45], [R.SQUEAK, 0]]);
    o.connect(bp); bp.connect(g); g.connect(dst); o.start(now); vib.start(now); o.stop(now + R.SQUEAK + .05); vib.stop(now + R.SQUEAK + .05);
    const k = noiseSrc(AU.buf.water, false), lp = c.createBiquadFilter(), kg = c.createGain(); lp.type = 'lowpass'; lp.frequency.value = 260;
    env(kg.gain, now, [[0, 1.4], [.07, 0]]); k.connect(lp); lp.connect(kg); kg.connect(dst); k.stop(now + .1);
    if (gush) {   // the startup gush: a spurt that opens up before the loop takes over
      const s = noiseSrc(AU.buf.water, false, .3), f = c.createBiquadFilter(), sg = c.createGain(); f.type = 'bandpass'; f.Q.value = 1.2;
      f.frequency.setValueAtTime(380, now); f.frequency.exponentialRampToValueAtTime(1900, now + .3);
      env(sg.gain, now, [[0, 0], [.12, 1.1], [.3, .5], [.45, 0]]); s.connect(f); f.connect(sg); sg.connect(dst); s.stop(now + .5);
    }
  }
  // the cup: water through a narrow resonance whose pitch rises over exactly R.FILL seconds
  function sndFill(dst) {
    const c = AU.ctx, now = c.currentTime;
    const s = noiseSrc(AU.buf.water, true), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'bandpass'; f.Q.value = 14;
    f.frequency.setValueAtTime(320, now); f.frequency.exponentialRampToValueAtTime(1700, now + R.FILL);
    env(g.gain, now, [[0, 0], [.15, 2.6], [R.FILL - .1, 2.6], [R.FILL, 0]]); s.connect(f); f.connect(g); g.connect(dst); s.stop(now + R.FILL + .05);
    const o = c.createOscillator(), og = c.createGain(); o.frequency.setValueAtTime(320, now); o.frequency.exponentialRampToValueAtTime(1700, now + R.FILL);
    env(og.gain, now, [[0, 0], [.2, .05], [R.FILL - .1, .05], [R.FILL, 0]]); o.connect(og); og.connect(dst); o.start(now); o.stop(now + R.FILL + .05);
  }
  // the water loop for one strip: start / stop to match the model; restarts with the other buffer when "broken" flips
  function loopVoice() {
    const v = { src: null, g: null, broken: null };
    v.sync = (dst, want, broken, phase) => {
      const c = AU.ctx;
      if (want && (!v.src || v.broken !== broken)) {
        v.stop(.01);
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
        v.g = c.createGain(); v.g.gain.value = 0; v.g.gain.setTargetAtTime(1, c.currentTime, .06);
        v.src = noiseSrc(broken ? AU.buf.broken : AU.buf.water, true, Math.max(0, phase)); v.src.connect(lp); lp.connect(v.g); v.g.connect(dst); v.broken = broken;
      } else if (!want && v.src) v.stop(R.TAIL / 3);
    };
    v.stop = (tc = .05) => { if (!v.src) return; const c = AU.ctx; v.g.gain.setTargetAtTime(0, c.currentTime, tc); v.src.stop(c.currentTime + tc * 6 + .05); v.src = null; };
    return v;
  }

  /* ---------------- the faucet model: a pure function of the event list and t ---------------- */
  // events: {k:'start'|'stop'|'fill', t} and {k:'broken', t, v}
  function model(ev, t) {
    const iv = [], statics = [], fills = [], brk = []; let on = null;
    for (const e of ev) {
      if (e.t > t) break;
      if (e.k === 'start' && on === null) { on = e.t; statics.push(e); }
      else if (e.k === 'stop' && on !== null) { iv.push([on, e.t]); on = null; statics.push(e); }
      else if (e.k === 'fill') fills.push(e.t);
      else if (e.k === 'broken') brk.push(e);
    }
    if (on !== null) iv.push([on, Infinity]);
    const m = { iv, statics, fills, brk, running: on !== null, onT: on, t };
    m.brokenAt = tt => { let v = false; brk.forEach(e => { if (e.t <= tt) v = e.v; }); return v; };
    m.water = tt => { let v = 0; iv.forEach(([a, b]) => { if (tt < a) return; const up = clamp((tt - a - .08) / .3), dn = tt < b ? 1 : 1 - clamp((tt - b) / R.TAIL); v = Math.max(v, up * dn); }); return v; };
    m.seams = (a, b, to) => { const out = []; for (let s = a + R.LOOP_IN + R.LOOP; s < Math.min(b, to); s += R.LOOP) out.push(s); return out; };
    m.filling = tt => fills.find(f => tt >= f && tt < f + R.FILL);
    m.cup = tt => { let lv = 0; fills.forEach(f => { if (tt >= f) lv = clamp((tt - f) / R.FILL); }); return lv; };
    m.squeak = tt => statics.find(s => tt >= s.t && tt < s.t + R.SQUEAK);
    m.click = tt => { for (const [a, b] of iv) for (const s of m.seams(a, b, tt + .1)) if (Math.abs(tt - s) < .07 && m.brokenAt(s)) return s; return null; };
    // source level in dB (water loop = 0 dB), summed as power, with a small deterministic flicker
    m.srcDb = tt => {
      const p = [];
      const w = m.water(tt); if (w > 0) p.push(w * w);
      const sq = m.squeak(tt); if (sq) { const k = (tt - sq.t) / R.SQUEAK; p.push(Math.pow(db2g(R.SQUEAK_DB) * Math.sin(Math.PI * Math.min(1, k * 1.3)), 2)); }
      const f = m.filling(tt); if (f != null) p.push(Math.pow(db2g(R.FILL_DB), 2));
      if (m.click(tt) != null) p.push(Math.pow(db2g(R.CLICK_DB), 2));
      const tot = sum(p); if (tot <= 1e-6) return -120;
      return 10 * Math.log10(tot) + .9 * Math.sin(tt * 23.1) + .6 * Math.sin(tt * 37.7 + 1);
    };
    return m;
  }
  const curveGain = (d, curve, mn, mx) => d >= mx ? 0 : d <= mn ? 1 : curve === 'lin' ? 1 - (d - mn) / (mx - mn) : mn / d;
  function hear(view, S) {
    const L = view.listener, dx = S.x - L.x, d = Math.hypot(dx, S.y - L.y) / R.PXM;
    const g = curveGain(d, view.curve, view.minD, view.maxD), pan = R.PAN_MAX * clamp(dx / (R.PAN_M * R.PXM), -1, 1);
    return { d, g, pan, gl: Math.cos((pan + 1) * Math.PI / 4) * Math.SQRT2, gr: Math.sin((pan + 1) * Math.PI / 4) * Math.SQRT2 };
  }

  /* ---------------- drawing pieces ---------------- */
  function rings(g, cx, cy, t, o) {
    // o: period, speed, maxR, amp(ts) 0..1, col, w
    const { period, speed, maxR, amp, col, w = 2.5 } = o;
    for (let ts = Math.floor((t - maxR / speed) / period) * period; ts <= t; ts += period) {
      const a = amp(ts); if (a <= .02) continue;
      const r = (t - ts) * speed; if (r <= 1 || r > maxR) continue;
      g.globalAlpha = a * (1 - r / maxR) * .9; g.strokeStyle = col; g.lineWidth = w;
      g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke();
    }
    g.globalAlpha = 1;
  }
  const sinkAt = rm => ({ x: rm.x + rm.w / 2, y: rm.y + 58, hx: rm.x + rm.w / 2 + 44, hy: rm.y + 30, cupX: rm.x + rm.w / 2 - 92, cupY: rm.y + 56 });
  function drawRoom(g, rm, view, m, t) {
    const S = sinkAt(rm);
    g.save(); g.beginPath(); g.roundRect(rm.x, rm.y, rm.w, rm.h, 12); g.clip();
    T.floor(rm.x, rm.y, rm.w, rm.h);
    T.wall(rm.x, rm.y, rm.w, 16); T.wall(rm.x, rm.y, 14, rm.h); T.wall(rm.x + rm.w - 14, rm.y, 14, rm.h); T.wall(rm.x, rm.y + rm.h - 12, rm.w, 12);
    // min / max distance circles
    const mn = view.minD * R.PXM, mx = view.maxD * R.PXM;
    g.fillStyle = 'rgba(46,163,220,.10)'; g.beginPath(); g.arc(S.x, S.y, mn, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(46,163,220,.6)'; g.lineWidth = 2; g.beginPath(); g.arc(S.x, S.y, mn, 0, TAU); g.stroke();
    g.setLineDash([8, 7]); g.strokeStyle = 'rgba(38,44,106,.55)'; g.beginPath(); g.arc(S.x, S.y, mx, 0, TAU); g.stroke(); g.setLineDash([]);
    // counter, basin, spout, handle
    g.fillStyle = '#c9c3b4'; g.strokeStyle = C.navy; g.lineWidth = 2;
    g.beginPath(); g.roundRect(S.x - 120, rm.y + 14, 240, 84, 8); g.fill(); g.stroke();
    g.fillStyle = '#eef2f5'; g.beginPath(); g.ellipse(S.x, S.y, 64, 28, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#d5dde3'; g.beginPath(); g.ellipse(S.x, S.y + 3, 50, 19, 0, 0, TAU); g.fill();
    g.fillStyle = '#8b8fa8'; g.beginPath(); g.roundRect(S.x - 7, rm.y + 14, 14, 36, 5); g.fill(); g.stroke();
    // water stream and splash
    const w = m.water(t);
    if (w > .02) {
      g.globalAlpha = .4 + .6 * w; g.fillStyle = WATER; g.beginPath(); g.ellipse(S.x, S.y, 10 + 10 * w, 6 + 4 * w, 0, 0, TAU); g.fill();
      g.strokeStyle = '#bfe6f7'; g.lineWidth = 2; for (let k = 0; k < 4; k++) { const a = t * 3 + k * 1.6; g.beginPath(); g.arc(S.x + Math.cos(a) * 18, S.y + Math.sin(a) * 8, 4, 0, TAU); g.stroke(); }
      g.globalAlpha = 1;
    }
    // cup: on the counter, or under the spout while it fills
    const fl = m.filling(t), cupLv = m.cup(t), cx = fl != null ? S.x : S.cupX, cy = fl != null ? S.y : S.cupY;
    g.fillStyle = '#fff'; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 14, 0, TAU); g.fill(); g.stroke();
    if (cupLv > 0) { g.fillStyle = WATER; g.globalAlpha = .35 + .6 * cupLv; g.beginPath(); g.arc(cx, cy, 3 + 9 * cupLv, 0, TAU); g.fill(); g.globalAlpha = 1; }
    const on = m.running, sq = m.squeak(t), turn = sq ? (sq.k === 'start' ? ease(clamp((t - sq.t) / .35)) : 1 - ease(clamp((t - sq.t) / .35))) : on ? 1 : 0;
    g.fillStyle = C.gold; g.strokeStyle = C.navy; g.beginPath(); g.arc(S.hx, S.hy, 11, 0, TAU); g.fill(); g.stroke();
    const ang = -Math.PI / 2 + turn * Math.PI / 2; g.lineWidth = 5; g.strokeStyle = C.navy; g.beginPath(); g.moveTo(S.hx, S.hy); g.lineTo(S.hx + Math.cos(ang) * 24, S.hy + Math.sin(ang) * 24); g.stroke();
    if (view.hoverHandle) { g.strokeStyle = C.player; g.lineWidth = 2; g.beginPath(); g.arc(S.hx, S.hy, 20, 0, TAU); g.stroke(); }
    // sound rings: blue for the loop, gold for the handle, purple for the cup, red for a click at the reset
    rings(g, S.x, S.y, t, { period: .42, speed: 150, maxR: 330, amp: m.water, col: WATER });
    rings(g, S.hx, S.hy, t, { period: .1, speed: 170, maxR: 150, amp: ts => m.squeak(ts) ? 1 : 0, col: STATIC, w: 3 });
    rings(g, S.x, S.y, t, { period: .16, speed: 120, maxR: 180, amp: ts => { const f = m.filling(ts); return f != null ? .5 + .5 * (ts - f) / R.FILL : 0; }, col: FILLC, w: 2 });
    rings(g, S.x, S.y, t, { period: .02, speed: 420, maxR: 220, amp: ts => m.click(ts) != null ? 1 : 0, col: CLICKC, w: 4 });
    const ck = m.click(t); if (ck != null) T.label('click!', S.x - 100, S.y + 64, 'center', CLICKC, 14);
    // listener
    const h = hear(view, S), L = view.listener, lvl = m.srcDb(t) + view.fader + g2db(h.g);
    g.strokeStyle = 'rgba(38,44,106,.45)'; g.lineWidth = 2; g.setLineDash([3, 6]); g.beginPath(); g.moveTo(S.x, S.y); g.lineTo(L.x, L.y); g.stroke(); g.setLineDash([]);
    const ear = (x, gg) => { const k = clamp((lvl + g2db(gg) + 60) / 60); g.fillStyle = '#fffaf0'; g.strokeStyle = C.navy; g.lineWidth = 1.5; g.beginPath(); g.roundRect(x - 5, L.y - 22, 10, 44, 4); g.fill(); g.stroke(); g.fillStyle = WATER; g.fillRect(x - 3, L.y + 20 - 40 * k, 6, 40 * k); };
    ear(L.x - 34, h.gl); ear(L.x + 34, h.gr);
    T.player(L.x, L.y, -Math.PI / 2);
    text(g, 'L', L.x - 34, L.y + 38, C.muted, font(700, 11), 'center'); text(g, 'R', L.x + 34, L.y + 38, C.muted, font(700, 11), 'center');
    if (view.dragging) { g.strokeStyle = C.player; g.lineWidth = 2; g.beginPath(); g.arc(L.x, L.y, 28, 0, TAU); g.stroke(); }
    if (h.g <= 0) T.label('culled: past max distance', L.x, L.y + 56, 'center', C.red, 12);
    const mxl = (S.x + L.x) / 2, myl = (S.y + L.y) / 2;
    T.label(`${h.d.toFixed(1)} m`, mxl, myl, 'center', C.ink, 12);
    // labels for the distance circles
    T.label(`min ${view.minD.toFixed(1)} m`, S.x - mn * .72, S.y + mn * .72, 'center', '#1d6f96', 11);
    for (const a of [2.1, 1.0, 2.5, .6]) { const lx = S.x + Math.cos(a) * mx, ly = S.y + Math.sin(a) * mx; if (lx > rm.x + 60 && lx < rm.x + rm.w - 60 && ly < rm.y + rm.h - 24) { T.label(`max ${view.maxD.toFixed(1)} m`, lx, ly, 'center', C.ink, 11); break; } }
    g.restore();
    return { h, lvl };
  }
  function meterBar(g, x, y, w, h, db, col = WATER) {
    g.fillStyle = '#fffaf0'; g.strokeStyle = LINE; g.lineWidth = 2; g.beginPath(); g.roundRect(x, y, w, h, 5); g.fill(); g.stroke();
    const k = clamp((db + 60) / 60), hh = (h - 4) * k;
    const grd = g.createLinearGradient(0, y + h, 0, y); grd.addColorStop(0, col); grd.addColorStop(.78, col); grd.addColorStop(.88, '#e0a92d'); grd.addColorStop(1, '#e5322d');
    g.fillStyle = grd; g.fillRect(x + 2, y + h - 2 - hh, w - 4, hh);
  }
  const dbY = (db, y, h) => y + h - (h * clamp((db + 60) / 60));
  function dbScale(g, x, y, h, marks = [0, -6, -12, -20, -30, -40, -50, -60]) {
    marks.forEach(d => { const yy = dbY(d, y, h); g.strokeStyle = LINE; g.lineWidth = 1; g.beginPath(); g.moveTo(x, yy); g.lineTo(x + 6, yy); g.stroke(); text(g, `${d}`, x - 4, yy + 4, C.muted, font(600, 11), 'right'); });
  }
  function fader(g, x, y, h, db, lab = true) {
    const yy = y + h - h * (db + 60) / 66;   // fader range -60 .. +6
    g.fillStyle = '#d8ccb0'; g.beginPath(); g.roundRect(x - 3, y, 6, h, 3); g.fill();
    const y20 = y + h - h * 40 / 66; g.strokeStyle = C.gold; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 12, y20); g.lineTo(x + 12, y20); g.stroke();
    g.fillStyle = C.navy; g.beginPath(); g.roundRect(x - 16, yy - 8, 32, 16, 4); g.fill(); g.fillStyle = '#fff'; g.fillRect(x - 12, yy - 1, 24, 2);
    if (lab) text(g, `${db > 0 ? '+' : ''}${db} dB`, x, y + h + 18, C.ink, font(700, 13), 'center');
    return yy;
  }
  function drawMeter(g, b, view, m, t, h, faderDb) {
    panel(g, b.x, b.y, b.w, b.h, 'At the listener');
    const mx = b.x + 46, my = b.y + 60, mh = b.h - 100, lvl = m.srcDb(t) + faderDb + g2db(h.g);
    dbScale(g, mx - 6, my, mh, mh < 200 ? [0, -20, -40, -60] : undefined);
    meterBar(g, mx + 4, my, 20, mh, lvl + g2db(h.gl)); meterBar(g, mx + 30, my, 20, mh, lvl + g2db(h.gr));
    text(g, 'L', mx + 14, my + mh + 16, C.muted, font(700, 12), 'center'); text(g, 'R', mx + 40, my + mh + 16, C.muted, font(700, 12), 'center');
    const y20 = dbY(-20, my, mh); g.strokeStyle = C.gold; g.setLineDash([4, 3]); g.lineWidth = 2; g.beginPath(); g.moveTo(mx + 2, y20); g.lineTo(mx + 52, y20); g.stroke(); g.setLineDash([]);
    const fx = mx + 112; fader(g, fx, my - mh * .1, mh * 1.1, faderDb, false); text(g, `fader ${faderDb > 0 ? '+' : ''}${faderDb} dB`, fx, my + mh + 16, C.ink, font(700, 12), 'center');
    // readouts and voices
    const rx = b.x + 196; let ry = b.y + 58;
    const row = (k, v) => { text(g, k, rx, ry, C.muted, font(600, 13)); text(g, v, b.x + b.w - 14, ry, C.ink, font(700, 14), 'right'); ry += 22; };
    row('level', lvl > -60 ? `${lvl.toFixed(0)} dB` : 'silent');
    row('distance', `${h.d.toFixed(1)} m`);
    row('attenuation', h.g > 0 ? `${g2db(h.g).toFixed(1)} dB` : 'culled');
    row('pan', Math.abs(h.pan) < .05 ? 'centre' : `${h.pan < 0 ? 'L' : 'R'} ${Math.round(Math.abs(h.pan) / R.PAN_MAX * 100)}%`);
    ry += 6; text(g, 'Playing now', rx, ry, C.ink, font(800, 13, 'M')); ry += 20;
    const voices = [];
    const sq = m.squeak(t); if (sq) voices.push([sq.k === 'start' ? 'handle: start' : 'handle: stop', 'static', STATIC]);
    if (m.water(t) > .02) { const a = m.iv.at(-1)[0], n = Math.max(0, Math.floor((t - a - R.LOOP_IN) / R.LOOP)); voices.push([t < a + R.LOOP_IN ? 'water: startup' : `water: loop, play ${n + 1}`, 'continuous', WATER]); }
    const f = m.filling(t); if (f != null) voices.push([`cup: ${Math.round((t - f) / R.FILL * 100)}% full`, 'static', FILLC]);
    if (!voices.length) text(g, 'nothing', rx, ry, C.muted, font(500, 13));
    voices.forEach(([n, k, col]) => { text(g, n, rx, ry, C.ink, font(600, 13)); chip(g, k, b.x + b.w - 14, ry - 4, col, 'right'); ry += 24; });
  }
  function drawTimeline(g, b, m, t) {
    panel(g, b.x, b.y, b.w, b.h, 'Live timeline');
    text(g, 'static: a set duration, synced to an event · continuous: no set duration, the player decides', b.x + b.w - 14, b.y + 24, C.muted, font(600, 13), 'right');
    const X0 = b.x + 170, X1 = b.x + b.w - 14, SPAN = 11, NOW = 8.5, xt = tt => X0 + (tt - (t - NOW)) / SPAN * (X1 - X0);
    const lanes = [['Handle', 'static', STATIC], ['Water', 'continuous', WATER], ['Cup fill', 'static', FILLC]], LY = i => b.y + 50 + i * 50, LH = 28;
    lanes.forEach(([n, k, col], i) => {
      text(g, n, b.x + 14, LY(i) + 15, C.ink, font(700, 14)); text(g, k, b.x + 14, LY(i) + 30, col === STATIC ? '#9a6a06' : col, font(600, 12));
      g.fillStyle = 'rgba(255,250,240,.7)'; g.fillRect(X0, LY(i), X1 - X0, LH);
    });
    g.save(); g.beginPath(); g.rect(X0, b.y + 34, X1 - X0, b.h - 34); g.clip();
    // seconds grid
    for (let s = Math.ceil(t - NOW); s <= t + SPAN - NOW; s++) { const x = xt(s); g.strokeStyle = 'rgba(205,191,159,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, LY(0) - 4); g.lineTo(x, LY(2) + LH + 4); g.stroke(); }
    const tag = (s, x, y, col) => { g.font = font(700, 11); const w = g.measureText(s).width + 8; g.fillStyle = col; g.beginPath(); g.roundRect(x - 1, y - 9, w, 15, 4); g.fill(); text(g, s, x + 3, y + 2, '#fff', font(700, 11)); };
    // handle: static blocks
    m.statics.forEach(s => { const x0 = xt(s.t), x1 = xt(Math.min(t, s.t + R.SQUEAK)); g.fillStyle = 'rgba(224,169,45,.85)'; g.fillRect(x0, LY(0) + 4, Math.max(2, x1 - x0), LH - 8); tag(s.k, x0, LY(0) - 3, '#9a6a06'); });
    // water: startup, then loop iterations with resets, then the stop tail
    m.iv.forEach(([a, bb]) => {
      const end = Math.min(t, bb), x0 = xt(a), xi = xt(Math.min(end, a + R.LOOP_IN));
      g.fillStyle = 'rgba(46,163,220,.35)'; g.fillRect(x0, LY(1) + 4, xi - x0, LH - 8);
      tag('start', x0, LY(1) - 3, '#1d6f96');
      for (let s0 = a + R.LOOP_IN, n = 0; s0 < end; s0 += R.LOOP, n++) {
        const s1 = Math.min(end, s0 + R.LOOP), x = xt(s0), xe = xt(s1), br = n > 0 && m.brokenAt(s0);
        g.fillStyle = 'rgba(46,163,220,.8)'; g.fillRect(x, LY(1) + 4, xe - x, LH - 8);
        // the same waveform every play: that is what a loop is
        g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1; g.beginPath();
        for (let px = 0; px < xe - x; px += 2) { const k = px / ((xt(s0 + R.LOOP) - x) || 1), v = (hash(Math.floor(k * 90)) - .5) * (LH - 14) * (.7 + .3 * Math.sin(k * TAU * 3)); g.moveTo(x + px, LY(1) + LH / 2 - v / 2); g.lineTo(x + px, LY(1) + LH / 2 + v / 2); }
        g.stroke();
        if (n === 0) tag('play', x + 3, LY(1) + LH + 9, '#1d6f96');
        else { g.strokeStyle = br ? CLICKC : C.navy; g.lineWidth = br ? 4 : 2; g.beginPath(); g.moveTo(x, LY(1) - 2); g.lineTo(x, LY(1) + LH + 2); g.stroke(); tag(br ? 'click' : 'reset', x + 3, LY(1) + LH + 9, br ? CLICKC : C.ink); }
      }
      if (bb <= t) { const xs = xt(bb); g.fillStyle = 'rgba(46,163,220,.3)'; g.fillRect(xs, LY(1) + 4, xt(Math.min(t, bb + R.TAIL)) - xs, LH - 8); tag('stop', xs, LY(1) - 3, '#1d6f96'); }
      else { const xn = xt(t); g.fillStyle = C.ink; g.beginPath(); g.moveTo(xn + 4, LY(1) + 6); g.lineTo(xn + 16, LY(1) + LH / 2); g.lineTo(xn + 4, LY(1) + LH - 6); g.fill(); text(g, '? the player decides', xn + 20, LY(1) + LH / 2 + 5, C.ink, font(700, 12)); }
    });
    // cup: a static block with its pitch line rising
    m.fills.forEach(f => {
      const x0 = xt(f), x1 = xt(Math.min(t, f + R.FILL)), xf = xt(f + R.FILL);
      g.strokeStyle = 'rgba(138,79,214,.5)'; g.setLineDash([4, 4]); g.lineWidth = 1.5; g.strokeRect(x0, LY(2) + 4, xf - x0, LH - 8); g.setLineDash([]);
      g.fillStyle = 'rgba(138,79,214,.25)'; g.fillRect(x0, LY(2) + 4, x1 - x0, LH - 8);
      g.strokeStyle = FILLC; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, LY(2) + LH - 6); g.lineTo(x1, LY(2) + LH - 6 - (LH - 12) * clamp((Math.min(t, f + R.FILL) - f) / R.FILL)); g.stroke();
      const cl = `set duration: ${R.FILL} s, pitch rises`; g.font = font(700, 12); const cw = g.measureText(cl).width;
      text(g, cl, xf + 8 + cw < X1 ? xf + 8 : x0 - 8 - cw > X0 ? x0 - 8 - cw : X1 - cw - 4, LY(2) + 18, '#5a2a9a', font(700, 12));
    });
    g.restore();
    // now line and axis
    const xn = xt(t); g.strokeStyle = C.red; g.lineWidth = 2; g.beginPath(); g.moveTo(xn, b.y + 40); g.lineTo(xn, LY(2) + LH + 6); g.stroke();
    text(g, 'now', xn, b.y + b.h - 8, C.red, font(700, 12), 'center');
    text(g, `-${NOW} s`, X0 + 2, b.y + b.h - 8, C.muted, font(600, 11));
  }
  function drawCurve(g, b, view, h, drag) {
    panel(g, b.x, b.y, b.w, b.h, `Falloff: ${view.curve === 'lin' ? 'linear' : 'logarithmic'} · volume by distance`);
    const X0 = b.x + 56, X1 = b.x + b.w - 18, Y0 = b.y + 46, Y1 = b.y + b.h - 52, DM = 12;
    const xd = d => X0 + d / DM * (X1 - X0), yg = gg => Y1 - gg * (Y1 - Y0);
    g.fillStyle = '#fffaf0'; g.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
    [0, .25, .5, .75, 1].forEach(v => { g.strokeStyle = 'rgba(205,191,159,.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(X0, yg(v)); g.lineTo(X1, yg(v)); g.stroke(); text(g, `${Math.round(v * 100)}%`, X0 - 6, yg(v) + 4, C.muted, font(600, 11), 'right'); });
    for (let d = 0; d <= DM; d += 2) text(g, `${d}`, xd(d), Y1 + 16, C.muted, font(600, 11), 'center');
    text(g, 'distance from the sink (m)', (X0 + X1) / 2, Y1 + 32, C.muted, font(600, 12), 'center');
    // the curve
    g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath();
    for (let px = 0; px <= X1 - X0; px += 2) { const d = px / (X1 - X0) * DM, gg = curveGain(d, view.curve, view.minD, view.maxD); px ? g.lineTo(X0 + px, yg(gg)) : g.moveTo(X0, yg(gg)); }
    g.stroke();
    // min / max handles
    [['min', view.minD, '#1d6f96'], ['max', view.maxD, C.ink]].forEach(([n, d, col]) => {
      const x = xd(d); g.strokeStyle = col; g.lineWidth = drag === n ? 3 : 2; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(x, Y0); g.lineTo(x, Y1); g.stroke(); g.setLineDash([]);
      g.fillStyle = col; g.beginPath(); g.roundRect(x - 18, Y0 - 2, 36, 18, 5); g.fill(); text(g, n, x, Y0 + 11, '#fff', font(700, 11), 'center');
    });
    if (view.maxD < DM) text(g, 'culled', (xd(view.maxD) + X1) / 2, (Y0 + Y1) / 2, C.muted, font(600, 13), 'center');
    // the listener on the curve
    const x = xd(Math.min(DM, h.d)), y = yg(h.g);
    g.strokeStyle = C.player; g.lineWidth = 1.5; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(x, Y1); g.lineTo(x, y); g.lineTo(X0, y); g.stroke(); g.setLineDash([]);
    g.fillStyle = C.player; g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill(); g.stroke();
    T.label(`${h.d.toFixed(1)} m → ${Math.round(h.g * 100)}%${h.g > 0 ? ` (${g2db(h.g).toFixed(1)} dB)` : ''}`, clamp(x, X0 + 90, X1 - 90), Math.max(Y0 + 30, y - 22), 'center', C.ink, 12);
  }

  /* ---------------- slides 2 and 3: the room ---------------- */
  // tours: event lists, listener keyframes, parameter keyframes and captions
  const key = (ks, t) => { if (t <= ks[0][0]) return ks[0][1]; for (let i = 1; i < ks.length; i++) if (t <= ks[i][0]) { const [t0, a] = ks[i - 1], [t1, b] = ks[i], k = ease((t - t0) / (t1 - t0)); return Array.isArray(a) ? a.map((v, j) => lerp(v, b[j], k)) : lerp(a, b, k); } return ks.at(-1)[1]; };
  const caption = (cs, t) => (cs.find(([a, b]) => t >= a && t < b) || [0, 0, ''])[2];
  const TL_TOUR = {
    dur: 21,
    ev: [{ k: 'start', t: .8 }, { k: 'fill', t: 3.6 }, { k: 'broken', t: 8.6, v: true }, { k: 'broken', t: 12.8, v: false }, { k: 'stop', t: 14.6 }, { k: 'start', t: 16.4 }, { k: 'stop', t: 19.6 }],
    listener: [[0, [215, 200]]],
    cap: [[0, 3.6, 'Turn the handle: a static start, then the loop takes over'], [3.6, 6.8, 'Fill the cup: a static event, its pitch rises for a set 3 s'], [6.8, 8.6, 'The loop plays, resets, plays: it has no set duration'],
      [8.6, 12.8, 'Broken loop: a click at every reset (Sonic Colors, slide 70)'], [12.8, 14.6, 'Seamless again: you cannot hear the reset'], [14.6, 16.4, 'Second click: a static stop, when the player decided'], [16.4, 21, '"The player decides this!" (slide 185)']],
  };
  const FO_TOUR = {
    dur: 25,
    ev: [{ k: 'start', t: .4 }],
    listener: [[0, [300, 175]], [1.6, [300, 175]], [4, [80, 200]], [5.4, [80, 200]], [8.2, [520, 200]], [9.4, [520, 200]], [10.6, [300, 200]], [14, [300, 530]], [15.2, [300, 530]], [18.6, [300, 300]], [20, [300, 300]], [22.6, [300, 470]]],
    curve: t => t < 15 ? 'log' : 'lin',
    minD: [[0, 1]], maxD: [[0, 8], [20, 8], [21.6, 5]],
    cap: [[0, 1.6, 'The sink is the source; you are the listener'], [1.6, 5.4, 'Sink on your right: the right ear is louder (panning)'], [5.4, 9.4, 'Sink on your left: the left ear is louder'],
      [9.4, 15, 'Walk away: logarithmic falloff, -6 dB per doubling'], [15, 20, 'Linear: an even slope down to zero at max distance'], [20, 25, 'Shrink max distance: past it the sound is culled']],
  };
  function roomDemo(name, which, LAY, TOUR, sideInfo) {
    canvasDemo(name, (s, cv, g) => {
      const st = { tour: true, held: false, t: 0, tt: 0, prevT: 0, events: [], listener: { x: 300, y: 260 }, curve: R.CURVE, minD: R.MIN_D, maxD: R.MAX_D, fader: R.FADER, broken: false, drag: null, hoverHandle: false, key: '' };
      const tourBtn = $(s, '.fc-tour');
      const tourView = t => {
        const lp = key(TOUR.listener, t);
        return { events: TOUR.ev, listener: { x: lp[0], y: lp[1] }, curve: TOUR.curve ? TOUR.curve(t) : R.CURVE, minD: TOUR.minD ? key(TOUR.minD, t) : R.MIN_D, maxD: TOUR.maxD ? key(TOUR.maxD, t) : R.MAX_D, fader: R.FADER, cap: caption(TOUR.cap, t) };
      };
      const view = () => st.tour ? tourView(st.tt) : { events: st.events, listener: st.listener, curve: st.curve, minD: st.minD, maxD: st.maxD, fader: st.fader, cap: '' };
      const manual = () => {
        if (!st.tour) return;
        const v = tourView(st.tt); st.tour = false; tourBtn.classList.remove('on');
        st.listener = { ...v.listener }; st.events = []; st.t = 0; st.broken = false; st.curve = v.curve; st.minD = v.minD; st.maxD = v.maxD;
        syncInputs();
      };
      // audio for this room
      let A = null; const voice = loopVoice();
      const audio = (v, m, t) => {
        if (!live() || st.held) { if (A) voice.stop(); return; }
        if (!A) A = strip();
        const S = sinkAt(LAY.room), h = hear(v, S);
        A.set(v.fader, h.g, h.pan);
        const a = m.running ? m.onT : null;
        voice.sync(A.in, m.running && t >= a + R.LOOP_IN * .6, m.brokenAt(t), a != null ? t - a - R.LOOP_IN : 0);
      };
      const fire = e => { if (!live() || st.held) return; if (!A) A = strip(); if (e.k === 'start') sndHandle(A.in, true); if (e.k === 'stop') sndHandle(A.in, false); if (e.k === 'fill') sndFill(A.in); };
      scenes[which] = { seek(t) { st.held = true; voice.stop && A && voice.stop(); st.tour = true; st.tt = t; render(); }, dur: () => TOUR.dur, stop() { if (A) voice.stop(); } };
      // controls
      const handleBtn = $(s, '.fc-handle'), fillBtn = $(s, '.fc-fill'), brk = $(s, '.fc-broken'), fad = $(s, '.fc-fader'), fv = $(s, '.fc-fv');
      const mn = $(s, '.fc-min'), mx = $(s, '.fc-max'), segs = $$(s, '.fc-curve .btn');
      function syncInputs() {
        if (fad) { fad.value = st.fader; fv.textContent = `${st.fader} dB`; }
        if (mn) { mn.value = st.minD; $(s, '.fc-minv').textContent = `${(+st.minD).toFixed(1)} m`; }
        if (mx) { mx.value = st.maxD; $(s, '.fc-maxv').textContent = `${(+st.maxD).toFixed(1)} m`; }
        segs.forEach(b => b.classList.toggle('on', b.dataset.c === st.curve));
        if (brk) brk.checked = st.broken;
      }
      const push = e => { e.t = st.t; st.events.push(e); fire(e); };
      const toggleHandle = () => { manual(); const m = model(st.events, st.t); if (m.squeak(st.t)) return; push({ k: m.running ? 'stop' : 'start' }); };
      if (handleBtn) handleBtn.onclick = toggleHandle;
      if (fillBtn) fillBtn.onclick = () => { manual(); const m = model(st.events, st.t); if (!m.running || m.filling(st.t) != null) return; push({ k: 'fill' }); };
      if (brk) brk.onchange = () => { const v = brk.checked; manual(); st.broken = v; brk.checked = v; push({ k: 'broken', v: st.broken }); };
      if (fad) fad.oninput = () => { const v = +fad.value; manual(); st.fader = v; fv.textContent = `${st.fader} dB`; };
      if (mn) mn.oninput = () => { const v = +mn.value; manual(); st.minD = Math.min(v, st.maxD - .5); syncInputs(); };
      if (mx) mx.oninput = () => { const v = +mx.value; manual(); st.maxD = Math.max(v, st.minD + .5); syncInputs(); };
      segs.forEach(b => b.onclick = () => { manual(); st.curve = b.dataset.c; syncInputs(); });
      tourBtn.onclick = () => { st.tour = true; st.tt = 0; st.prevT = 0; tourBtn.classList.add('on'); st.fader = R.FADER; syncInputs(); };
      // canvas: drag the listener, click the handle or the cup, drag min/max on the curve
      const pt = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
      const rm = LAY.room, S = sinkAt(rm);
      const curveX = () => { const b = LAY.curve; return { X0: b.x + 56, X1: b.x + b.w - 18, Y0: b.y + 46, Y1: b.y + b.h - 52 }; };
      const hit = p => {
        const v = view();
        if (Math.hypot(p.x - S.hx, p.y - S.hy) < 22) return 'handle';
        if (Math.hypot(p.x - S.cupX, p.y - S.cupY) < 18 && fillBtn) return 'cup';
        if (Math.hypot(p.x - v.listener.x, p.y - v.listener.y) < 30) return 'listener';
        if (LAY.curve) { const c = curveX(), b = LAY.curve; if (p.y > c.Y0 - 8 && p.y < c.Y1 && p.x > b.x && p.x < b.x + b.w) { const dmin = Math.abs(p.x - (c.X0 + v.minD / 12 * (c.X1 - c.X0))), dmax = Math.abs(p.x - (c.X0 + v.maxD / 12 * (c.X1 - c.X0))); if (Math.min(dmin, dmax) < 16) return dmin < dmax ? 'min' : 'max'; } }
        if (p.x > rm.x && p.x < rm.x + rm.w && p.y > rm.y + 100 && p.y < rm.y + rm.h) return 'floor';
        return null;
      };
      const moveListener = p => { st.listener = { x: clamp(p.x, rm.x + 40, rm.x + rm.w - 40), y: clamp(p.y, rm.y + 118, rm.y + rm.h - 34) }; };
      cv.addEventListener('pointerdown', e => {
        const p = pt(e), h = hit(p); if (!h) return;
        if (h === 'handle') { toggleHandle(); return; }
        if (h === 'cup') { fillBtn.onclick(); return; }
        manual(); st.drag = h === 'floor' ? 'listener' : h; if (st.drag === 'listener') moveListener(p);
        cv.setPointerCapture(e.pointerId);
      });
      cv.addEventListener('pointermove', e => {
        const p = pt(e);
        if (!st.drag) { const h = hit(p); st.hoverHandle = h === 'handle'; cv.style.cursor = h === 'handle' || h === 'cup' ? 'pointer' : h === 'listener' || h === 'floor' ? 'grab' : h ? 'ew-resize' : ''; return; }
        if (st.drag === 'listener') moveListener(p);
        else { const c = curveX(), d = clamp((p.x - c.X0) / (c.X1 - c.X0) * 12, .5, 11.5); if (st.drag === 'min') st.minD = Math.round(Math.min(d, st.maxD - .5, 4) * 10) / 10; else st.maxD = Math.round(Math.max(d, st.minD + .5, 3) * 10) / 10; syncInputs(); }
      });
      const up = () => { st.drag = null; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

      function render() {
        const t = st.tour ? st.tt : st.t, v = view(); v.dragging = st.drag === 'listener'; v.hoverHandle = st.hoverHandle;
        const m = model(v.events, t);
        T.use(g); g.clearRect(0, 0, W, H);
        g.fillStyle = CARD; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
        const { h, lvl } = drawRoom(g, LAY.room, v, m, t);
        if (LAY.timeline) drawTimeline(g, LAY.timeline, m, t);
        if (LAY.curve) drawCurve(g, LAY.curve, v, h, st.drag);
        drawMeter(g, LAY.meter, v, m, t, h, v.fader);
        if (v.cap) T.label(v.cap, LAY.room.x + LAY.room.w / 2, LAY.room.y + LAY.room.h - 32, 'center', C.ink, 14);
        else if (!st.tour && !m.running && !m.statics.length) T.label('Click the handle to turn the water on', LAY.room.x + LAY.room.w / 2, LAY.room.y + LAY.room.h - 32, 'center', C.muted, 14);
        return { v, m, t, h, lvl };
      }
      function info(r) {
        const { m, t, h } = r, k = [m.running, m.filling(t) != null, h.d.toFixed(1), Math.round(h.pan * 20), Math.round(h.g * 50), st.tour, r.v.fader, m.brokenAt(t)].join();
        if (k === st.key) return; st.key = k;
        if (handleBtn) handleBtn.textContent = m.running ? 'Turn it off' : 'Turn the handle';
        if (fillBtn) fillBtn.disabled = !m.running || m.filling(t) != null;
        sideInfo(s, r);
      }
      return dt => {
        if (st.held) return;
        if (st.tour) {
          const pt0 = st.tt; st.tt += Math.max(0, dt);
          if (st.tt >= TOUR.dur) { st.tt = 0; if (A) voice.stop(); }
          else TOUR.ev.forEach(e => { if (e.t > pt0 && e.t <= st.tt) fire(e); });
        } else st.t += Math.max(0, dt);
        const r = render(); audio(r.v, r.m, r.t); info(r);
      };
    }, { leave() { scenes[which]?.stop(); } });
  }
  const scenes = {};
  roomDemo('fc-timeline', 'timeline', { room: { x: 0, y: 0, w: 600, h: 372 }, meter: { x: 614, y: 0, w: 426, h: 372 }, timeline: { x: 0, y: 384, w: 1040, h: 201 } }, TL_TOUR, (s, r) => {
    const { m, t } = r, n = m.running ? Math.max(0, Math.floor((t - m.onT - R.LOOP_IN) / R.LOOP)) : 0;
    say($(s, '.fc-stats'), `<div class="${m.running ? '' : 'y'}"><b>${m.running ? 'on' : 'off'}</b><span>${m.running ? `loop, play ${n + 1}: no set duration` : 'water off'}</span></div>`
      + `<div class="${m.brokenAt(t) ? 'r' : 'g'}"><b>${m.brokenAt(t) ? 'click' : 'clean'}</b><span>at each reset of the loop</span></div>`);
    say($(s, '.fc-out'), m.filling(t) != null ? 'The cup fill is static: it has a set duration (3 s), so its rising pitch can be synced to the cup filling.'
      : m.brokenAt(t) ? 'Every reset now clicks. Sonic Colors Ultimate’s level-clear music loops early in the same way (slide 70): a seam the ear catches every time.'
      : m.running ? 'The water is continuous: it loops seamlessly until the player turns it off. "Game designers can’t predict when players will turn off the faucet, or even if they ever will."'
      : 'Static sounds have a set duration and sync to an event: the handle turning, the cup filling. Turn the handle to start the loop.');
  });
  roomDemo('fc-falloff', 'falloff', { room: { x: 0, y: 0, w: 600, h: 585 }, curve: { x: 614, y: 0, w: 426, h: 330 }, meter: { x: 614, y: 342, w: 426, h: 243 } }, FO_TOUR, (s, r) => {
    const { h } = r;
    say($(s, '.fc-stats'), `<div><b>${h.d.toFixed(1)} m</b><span>from the sink</span></div>`
      + `<div class="${h.g > 0 ? 'g' : 'r'}"><b>${h.g > 0 ? `${g2db(h.g).toFixed(0)} dB` : 'culled'}</b><span>attenuation</span></div>`
      + `<div class="y"><b>${Math.abs(h.pan) < .05 ? 'C' : (h.pan < 0 ? 'L ' : 'R ') + Math.round(Math.abs(h.pan) / R.PAN_MAX * 100) + '%'}</b><span>pan</span></div>`);
  });

  /* ---------------- slide 1: what does a faucet sound like? ---------------- */
  const PARTS = [
    { n: 'Startup', sh: 'startup', k: 'static', col: STATIC, q: 'the handle turns, the water bursts on', re: /start|turn(ed|s|ing)? on|open|burst|gush|spurt|sputter|pipe|initial|begin/i },
    { n: 'Continuous running water', sh: 'running water', k: 'continuous', col: WATER, q: 'loops until the player turns it off', re: /run|flow|stream|loop|continu|pour|splash|trickl|drip|water/i },
    { n: 'Rising pitch as the cup fills', sh: 'cup fill pitch', k: 'static', col: FILLC, q: 'a set duration, synced to the cup', re: /cup|glass|fill|pitch|rising|mug|bottle/i },
    { n: 'The handle’s screech', sh: 'handle screech', k: 'static', col: CLICKC, q: 'metal on metal as it twists', re: /screech|squeak|creak|handle|knob|valve|twist|squeal|metal/i },
  ];
  const TOUR_LINES = [['water running', .6], ['tap squeaks', 2.4], ['splash in the basin', 4.0]];
  const LS_DUR = 22, DEMO_AT = [[6.6, 0], [8.6, 1], [11.4, 2], [15.2, 3]];
  const DEMO_LEN = [1.4, 2.6, R.FILL + .5, 1.0];
  function sinkSide(g, x0, y0, d, t) {
    // side view: wall, counter, basin, faucet, handle, cup; d = {i, age} is the sound being demonstrated
    const age = d ? t - d.at : 99, i = d ? d.i : -1;
    const on = i === 1 || (i === 0 && age > .25) || (i === 2), handle = i === 0 ? ease(clamp(age / .4)) : i === 3 ? .5 + .5 * Math.sin(age * 22) * Math.max(0, 1 - age) : on ? 1 : 0;
    g.save(); g.fillStyle = '#e8dfca'; g.beginPath(); g.roundRect(x0, y0, 410, 553, 12); g.fill(); g.clip();
    g.fillStyle = '#d9cdb0'; for (let r = 0; r < 9; r++) for (let c = 0; c < 6; c++) { g.fillRect(x0 + 10 + c * 68 + (r % 2) * 34, y0 + 12 + r * 34, 64, 30); }
    const cy = y0 + 330;
    g.fillStyle = '#8a6a4a'; g.fillRect(x0, cy, 420, 223); g.fillStyle = '#6f5238'; g.fillRect(x0, cy, 420, 14);
    g.fillStyle = '#c9c3b4'; g.strokeStyle = C.navy; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(x0 + 70, cy); g.lineTo(x0 + 100, cy + 120); g.lineTo(x0 + 320, cy + 120); g.lineTo(x0 + 350, cy); g.closePath(); g.fillStyle = '#eef2f5'; g.fill(); g.stroke();
    // faucet: a pipe up from the counter and a spout over the basin
    g.fillStyle = '#8b8fa8'; g.beginPath(); g.roundRect(x0 + 300, cy - 150, 22, 150, 6); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(x0 + 300, cy - 150); g.lineTo(x0 + 200, cy - 150); g.lineTo(x0 + 200, cy - 118); g.lineTo(x0 + 222, cy - 118); g.lineTo(x0 + 222, cy - 128); g.lineTo(x0 + 300, cy - 128); g.closePath(); g.fill(); g.stroke();
    // handle lever
    const hx = x0 + 311, hy = cy - 160, ang = -Math.PI / 2 - handle * .9;
    g.lineWidth = 9; g.strokeStyle = C.navy; g.lineCap = 'round'; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + Math.cos(ang) * 60, hy + Math.sin(ang) * 60); g.stroke(); g.lineCap = 'butt';
    g.fillStyle = C.gold; g.beginPath(); g.arc(hx, hy, 12, 0, TAU); g.fill(); g.lineWidth = 2.5; g.stroke();
    // cup under the spout while it fills
    const sx = x0 + 211, bottom = cy + 110;
    if (i === 2) {
      const lv = clamp(age / R.FILL), cx0 = sx - 30, ctop = cy + 20;
      g.fillStyle = 'rgba(255,255,255,.85)'; g.strokeStyle = C.navy; g.lineWidth = 2.5; g.beginPath(); g.moveTo(cx0, ctop); g.lineTo(cx0 + 6, bottom); g.lineTo(cx0 + 54, bottom); g.lineTo(cx0 + 60, ctop); g.stroke();
      g.fillStyle = 'rgba(46,163,220,.75)'; const wy = bottom - (bottom - ctop - 6) * lv; g.beginPath(); g.moveTo(cx0 + 6 - 6 * (1 - (bottom - wy) / (bottom - ctop)) + 1, wy); g.lineTo(cx0 + 6, bottom - 1); g.lineTo(cx0 + 54, bottom - 1); g.lineTo(cx0 + 54 + 6 * ((bottom - wy) / (bottom - ctop)) - 1, wy); g.closePath(); g.fill();
    }
    if (on) {
      const thick = i === 0 ? 6 + 10 * Math.max(0, 1 - Math.abs(age - .5) * 2) : 8, endY = i === 2 ? bottom - (bottom - cy - 26) * clamp(age / R.FILL) : bottom;
      g.fillStyle = 'rgba(46,163,220,.85)'; g.fillRect(sx - thick / 2, cy - 118, thick, endY - (cy - 118));
      g.strokeStyle = '#bfe6f7'; g.lineWidth = 2; g.setLineDash([6, 10]); g.lineDashOffset = -t * 120; g.beginPath(); g.moveTo(sx, cy - 116); g.lineTo(sx, endY); g.stroke(); g.setLineDash([]);
    }
    // sound rings from the source of each sound
    const P = PARTS[i] || PARTS[1];
    if (i === 0) rings(g, sx, cy - 110, t, { period: .12, speed: 200, maxR: 190, amp: ts => (ts > d.at && ts < d.at + .8) ? 1 : 0, col: STATIC, w: 3 });
    if (i === 1) rings(g, sx, bottom - 20, t, { period: .4, speed: 150, maxR: 220, amp: ts => ts > d.at ? 1 : 0, col: WATER });
    if (i === 2) rings(g, sx, cy + 40, t, { period: .1, speed: 140, maxR: 170, amp: ts => (ts > d.at && ts < d.at + R.FILL) ? .5 + .5 * (ts - d.at) / R.FILL : 0, col: FILLC });
    if (i === 3) rings(g, hx, hy, t, { period: .06, speed: 230, maxR: 160, amp: ts => (ts > d.at && ts < d.at + .6) ? 1 : 0, col: CLICKC, w: 3 });
    if (i >= 0 && age < DEMO_LEN[i] + 1.5) T.label(`playing: ${P.n.toLowerCase()}`, x0 + 210, y0 + 30, 'center', P.col === STATIC ? '#9a6a06' : P.col, 15);
    else T.label('a faucet', x0 + 210, y0 + 30, 'center', C.muted, 15);
    g.restore();
  }
  function glyph(g, i, x, y, w, h, t, live) {
    g.strokeStyle = PARTS[i].col; g.lineWidth = 2; g.beginPath();
    for (let px = 0; px <= w; px += 2) {
      const k = px / w; let v;
      if (i === 0) v = (hash(px) - .5) * h * Math.min(1, k * 6) * Math.max(.25, 1 - k * 1.2) * 2;
      else if (i === 1) v = (hash(Math.floor(((k * 3) % 1) * 60)) - .5) * h * .8;
      else if (i === 2) v = Math.sin(k * k * 60) * h * .35;
      else v = Math.sin(k * 140) * h * .45 * Math.sin(Math.PI * k);
      g.moveTo(x + px, y + h / 2 - v / 2); g.lineTo(x + px, y + h / 2 + v / 2);
    }
    g.stroke();
    if (i === 1) { g.strokeStyle = C.navy; g.lineWidth = 1.5; [1, 2].forEach(j => { g.beginPath(); g.moveTo(x + w * j / 3, y - 2); g.lineTo(x + w * j / 3, y + h + 2); g.stroke(); }); }
    if (i === 2) { g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y + h); g.quadraticCurveTo(x + w * .6, y + h * .8, x + w, y); g.stroke(); }
    if (live != null) { g.fillStyle = C.red; g.fillRect(x + w * clamp(live), y - 3, 2, h + 6); }
  }
  canvasDemo('fc-list', (s, cv, g) => {
    const st = { tour: true, held: false, t: 0, tt: 0, revealed: false, demo: null, key: '', hover: -1 };
    const ta = $(s, '.fc-text'), tourBtn = $(s, '.fc-tour');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.revealed = false; st.demo = null; } };
    const CX = 440, CY = 222, CW = 288, CH = 172, cardAt = i => ({ x: CX + (i % 2) * (CW + 12), y: CY + Math.floor(i / 2) * (CH + 12) });
    let A = null;
    const play = i => { if (!live()) return; if (!A) { A = strip(); A.set(-14, 1, 0); }
      if (i === 0) sndHandle(A.in, true);
      if (i === 3) sndHandle(A.in, true, false);
      if (i === 1 || i === 0 || i === 2) { const v = loopVoice(); v.sync(A.in, true, false, 0); setTimeout(() => v.stop(.15), (i === 1 ? 2.6 : i === 2 ? R.FILL : 1.2) * 1000); }
      if (i === 2) sndFill(A.in);
    };
    const tourView = t => {
      const lines = TOUR_LINES.map(([s0, t0]) => s0.slice(0, Math.max(0, Math.floor((t - t0) / .06)))).filter(Boolean);
      const dm = DEMO_AT.filter(([a]) => t >= a).at(-1);
      return { lines, revealed: t > 6.2, demo: dm ? { i: dm[1], at: dm[0] } : null, shown: DEMO_AT.filter(([a]) => t >= a - .4).length, ticks: t > 17, t };
    };
    const view = () => st.tour ? tourView(st.tt) : { lines: ta.value.split('\n').map(x => x.trim()).filter(Boolean), revealed: st.revealed, demo: st.demo, shown: 4, ticks: st.revealed, t: st.t };
    scenes.list = { seek(t) { st.held = true; st.tour = true; st.tt = t; render(); }, dur: () => LS_DUR };
    ta.addEventListener('input', () => { manual(); });
    ta.addEventListener('focus', () => { manual(); });
    $(s, '.fc-reveal').onclick = () => { manual(); st.revealed = true; };
    $(s, '.fc-clear').onclick = () => { manual(); ta.value = ''; st.revealed = false; st.demo = null; };
    tourBtn.onclick = () => { st.tour = true; st.tt = 0; tourBtn.classList.add('on'); };
    const pt = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
    const cardHit = p => PARTS.findIndex((_, i) => { const c = cardAt(i); return p.x > c.x && p.x < c.x + CW && p.y > c.y && p.y < c.y + CH; });
    cv.addEventListener('pointermove', e => { st.hover = cardHit(pt(e)); cv.style.cursor = st.hover >= 0 && view().revealed ? 'pointer' : ''; });
    cv.addEventListener('pointerdown', e => {
      const i = cardHit(pt(e)); if (i < 0) return;
      manual(); st.revealed = true; st.demo = { i, at: st.t }; play(i);
    });
    function render() {
      const v = view(), t = v.t;
      T.use(g); g.clearRect(0, 0, W, H);
      g.fillStyle = CARD; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
      sinkSide(g, 16, 16, v.demo, t);
      // your list
      const lx = CX, ly = 16, lw = CW * 2 + 12;
      panel(g, lx, ly, lw, 194, 'Your list');
      text(g, '"Pause and write down what you would need" (slide 95)', lx + lw - 14, ly + 24, C.muted, font(600, 12), 'right');
      const covered = new Set();
      v.lines.slice(0, 5).forEach((ln, k) => {
        const y = ly + 54 + k * 28, hits = PARTS.map((p, i) => p.re.test(ln) ? i : -1).filter(i => i >= 0);
        hits.forEach(i => covered.add(i));
        g.fillStyle = '#fffaf0'; g.beginPath(); g.roundRect(lx + 14, y - 17, lw - 28, 24, 6); g.fill();
        text(g, `${k + 1}. ${ln.length > 46 ? ln.slice(0, 45) + '…' : ln}`, lx + 24, y, C.ink, font(600, 15));
        if (v.ticks) { let x = lx + lw - 22; if (!hits.length) text(g, 'not one of the four', x, y, C.muted, font(600, 12), 'right'); hits.slice().reverse().forEach(i => { x -= chip(g, `✓ ${i + 1}`, x, y - 5, PARTS[i].col, 'right') + 4; }); }
      });
      if (v.ticks) {
        const miss = PARTS.filter((_, i) => !covered.has(i)).map(p => p.sh);
        text(g, `Your list covers ${covered.size} of the 4.`, lx + 24, ly + 178, C.ink, font(800, 14, 'M'));
        if (miss.length) text(g, `Missing: ${miss.join(', ')}`, lx + 250, ly + 178, C.red, font(600, 13));
      }
      if (!v.lines.length) text(g, st.tour ? '' : 'Type in the box on the right, one sound per line…', lx + 24, ly + 56, C.muted, font(500, 15));
      if (st.tour && t < 6.2 && Math.floor(t * 2) % 2) { const last = v.lines.length; g.fillStyle = C.ink; g.fillRect(lx + 24 + (last ? g.measureText(`${last}. ${v.lines[last - 1]}`).width : 0) + 3, ly + 54 + Math.max(0, last - 1) * 28 - 14, 2, 18); }
      // the four
      PARTS.forEach((p, i) => {
        const c = cardAt(i), show = v.revealed && i < v.shown;
        g.fillStyle = show ? '#fffaf0' : PANEL; g.strokeStyle = show && v.demo && v.demo.i === i && t - v.demo.at < DEMO_LEN[i] + .5 ? p.col : LINE; g.lineWidth = 3;
        g.beginPath(); g.roundRect(c.x, c.y, CW, CH, 12); g.fill(); g.stroke();
        if (!show) { text(g, '?', c.x + CW / 2, c.y + CH / 2 + 12, C.muted, font(800, 34, 'M'), 'center'); text(g, `sound ${i + 1}`, c.x + CW / 2, c.y + CH / 2 + 38, C.muted, font(600, 13), 'center'); return; }
        text(g, `${i + 1}`, c.x + 16, c.y + 32, p.col === STATIC ? '#9a6a06' : p.col, font(800, 24, 'M'));
        text(g, p.n, c.x + 40, c.y + 30, C.ink, font(700, 15));
        chip(g, p.k, c.x + 40, c.y + 50, p.col);
        text(g, p.q, c.x + 16, c.y + 84, C.muted, font(600, 13));
        const age = v.demo && v.demo.i === i ? (t - v.demo.at) / DEMO_LEN[i] : null;
        glyph(g, i, c.x + 16, c.y + 98, CW - 32, 44, t, age != null && age <= 1 ? age : null);
        if (v.ticks) { if (covered.has(i)) chip(g, '✓ on your list', c.x + CW - 12, c.y + CH - 14, C.good, 'right'); else chip(g, 'missing', c.x + CW - 12, c.y + CH - 14, C.muted, 'right'); }
        else if (!st.tour) text(g, 'click to hear it', c.x + CW - 14, c.y + CH - 10, C.muted, font(600, 12), 'right');
      });
      return { v, covered };
    }
    function info(r) {
      const { v, covered } = r, k = [v.revealed, v.ticks, [...covered].join(''), v.lines.length].join();
      if (k === st.key) return; st.key = k;
      say($(s, '.fc-stats'), v.ticks ? `<div class="${covered.size === 4 ? 'g' : 'y'}"><b>${covered.size}/4</b><span>of the deck’s sounds on your list</span></div>` : `<div><b>${v.lines.length}</b><span>${v.lines.length === 1 ? 'sound' : 'sounds'} on your list</span></div>`);
      const miss = PARTS.filter((_, i) => !covered.has(i)).map(p => p.n.toLowerCase());
      say($(s, '.fc-out'), !v.revealed ? 'List every sound in the experience before you look for any of them in a library.'
        : v.ticks && miss.length ? `Missing: ${miss.join(', ')}. Lists usually catch the running water and skip the static events around it.`
        : 'Three of the four are static (a set duration, synced to an event); only the running water is continuous. Click a card to hear it.');
    }
    return dt => {
      if (st.held) return;
      if (st.tour) { const p0 = st.tt; st.tt += Math.max(0, dt); if (st.tt >= LS_DUR) st.tt = 0; else DEMO_AT.forEach(([a, i]) => { if (a > p0 && a <= st.tt) play(i); }); }
      else st.t += Math.max(0, dt);
      info(render());
    };
  });

  /* ---------------- slide 4: start at -20 dB ---------------- */
  const LV_TOUR = { dur: 21, fader: [[0, -20], [3.5, -20], [6, 3], [8.5, 3], [11.5, -48], [14, -48], [16, -20], [17.5, -20], [19, -15], [21, -15]],
    cap: [[0, 3.5, 'Start the faucet at -20 dB over the room bed'], [3.5, 8.5, 'Push it to the top: the peaks clip and distort'], [8.5, 14, 'Pull it down: the faucet is buried under the room bed'], [14, 17.5, 'Back to -20 dB: clear, with headroom'], [17.5, 21, '"…and then adjust it from there" (slide 233)']] };
  const zone = db => db > -1 ? ['clipped: the peaks hit 0 dB and distort', CLICKC, 'r'] : db > -9 ? ['hot: little headroom left for louder sounds', '#c98a12', 'y']
    : db >= -26 ? ['balanced around -20 dB: room to adjust', C.good, 'g'] : db > R.BED_DB ? ['quiet: close to the room bed', '#1d6f96', ''] : ['buried under the room bed', C.muted, 'r'];
  canvasDemo('fc-level', (s, cv, g) => {
    const st = { tour: true, held: false, t: 0, tt: 0, fader: R.FADER, drag: false, key: '' };
    const tourBtn = $(s, '.fc-tour'), fad = $(s, '.fc-fader'), fv = $(s, '.fc-fv');
    const manual = () => { if (st.tour) { st.fader = Math.round(key(LV_TOUR.fader, st.tt)); st.tour = false; tourBtn.classList.remove('on'); sync(); } };
    const sync = () => { fad.value = st.fader; fv.textContent = `${st.fader > 0 ? '+' : ''}${st.fader} dB`; };
    fad.oninput = () => { const v = +fad.value; manual(); st.fader = v; sync(); };
    $(s, '.fc-reset').onclick = () => { manual(); st.fader = R.FADER; sync(); };
    tourBtn.onclick = () => { st.tour = true; st.tt = 0; tourBtn.classList.add('on'); };
    const FX = 300, FY = 70, FH = 430;
    const pt = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
    const setFromY = y => { st.fader = Math.round(clamp(-60 + (FY + FH - y) / FH * 60, -60, 6)); sync(); };
    cv.addEventListener('pointerdown', e => { const p = pt(e); if (Math.abs(p.x - FX) < 30 && p.y > FY - FH * .1 - 10 && p.y < FY + FH + 10) { manual(); st.drag = true; setFromY(p.y); cv.setPointerCapture(e.pointerId); } });
    cv.addEventListener('pointermove', e => { const p = pt(e); cv.style.cursor = Math.abs(p.x - FX) < 30 && p.y > FY - FH * .1 - 10 && p.y < FY + FH + 10 ? 'ns-resize' : ''; if (st.drag) setFromY(p.y); });
    cv.addEventListener('pointerup', () => { st.drag = false; });
    // audio: loop -> fader -> hard clipper -> master, and the bed straight to master
    let A = null;
    const audio = f => {
      if (!live() || st.held) { if (A) { A.loop.stop(); A.bed.stop(); } return; }
      const c = AU.ctx;
      if (!A) {
        A = { fader: c.createGain(), clip: c.createWaveShaper(), out: c.createGain(), bedG: c.createGain(), loop: loopVoice(), bed: loopVoice() };
        // the shaper's input range is -1..1, so scale by 1/4 in and 4x out to clip hard at 0 dBFS (= gain 1)
        A.pre = c.createGain(); A.pre.gain.value = .25; A.out.gain.value = 4 * .55; A.fader.connect(A.pre); A.pre.connect(A.clip); A.clip.connect(A.out); A.out.connect(AU.master);
        A.bedG.gain.value = db2g(R.BED_DB + 12) * .55; A.bedG.connect(AU.master);
        const cl = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = (i / 511.5 - 1) * 4; cl[i] = clamp(x, -1, 1) / 4; } A.clip.curve = cl;
      }
      A.fader.gain.setTargetAtTime(db2g(f), c.currentTime, .03);
      A.loop.sync(A.fader, true, false, 0);
      if (!A.bed.src) { const src = noiseSrc(AU.buf.bed, true), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; A.bed.g = c.createGain(); A.bed.g.gain.value = 1; src.connect(lp); lp.connect(A.bed.g); A.bed.g.connect(A.bedG); A.bed.src = src; }
    };
    scenes.level = { seek(t) { st.held = true; audio(0); st.tour = true; st.tt = t; render(); }, dur: () => LV_TOUR.dur, stop() { if (A) { A.loop.stop(); A.bed.stop(); } } };
    const flick = t => .9 * Math.sin(t * 23.1) + .6 * Math.sin(t * 37.7 + 1);
    const mixDb = (f, t) => { const a = Math.min(f + flick(t), 2), p = db2g(Math.min(a, 0)) ** 2 + db2g(R.BED_DB) ** 2; return Math.min(0, 10 * Math.log10(p)); };
    function render() {
      const t = st.tour ? st.tt : st.t, f = st.tour ? Math.round(key(LV_TOUR.fader, t)) : st.fader;
      T.use(g); g.clearRect(0, 0, W, H);
      g.fillStyle = CARD; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
      panel(g, 16, 16, 470, 553, 'Meters and fader');
      const MY = FY, MH = FH, faucetDb = f + flick(t);
      // zone bands behind the scale
      const band = (a, b, col, lab) => { const y0 = dbY(a, MY, MH), y1 = dbY(b, MY, MH); g.fillStyle = col; g.fillRect(70, y0, 150, y1 - y0); if (lab) text(g, lab, 380, (y0 + y1) / 2 + 4, C.muted, font(600, 12)); };
      band(0, -9, 'rgba(229,50,45,.12)'); band(-9, -16, 'rgba(224,169,45,.14)'); band(-16, -24, 'rgba(47,174,99,.16)'); band(R.BED_DB, -60, 'rgba(93,97,140,.12)');
      dbScale(g, 64, MY, MH);
      const bars = [['room bed', R.BED_DB + .5 * Math.sin(t * 5)], ['faucet', faucetDb], ['mix', mixDb(f, t)]];
      bars.forEach(([n, d], i) => { const x = 82 + i * 56; meterBar(g, x, MY, 30, MH, Math.min(0, d), i === 0 ? '#8b8fa8' : WATER); text(g, n, x + 15, MY + MH + 18, C.ink, font(600, 12), 'center'); if (d >= -.5 && i) { g.fillStyle = CLICKC; g.beginPath(); g.roundRect(x, MY - 18, 30, 12, 3); g.fill(); text(g, 'CLIP', x + 15, MY - 8, '#fff', font(800, 9), 'center'); } });
      const y20 = dbY(-20, MY, MH); g.strokeStyle = C.gold; g.lineWidth = 2.5; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(70, y20); g.lineTo(FX + 30, y20); g.stroke(); g.setLineDash([]);
      T.label('-20 dB: start here', 390, y20, 'center', '#7a4a00', 13, '#fde9b8');
      text(g, 'room bed', 380, dbY(R.BED_DB, MY, MH) + 16, C.muted, font(600, 12));
      fader(g, FX, FY - FH * .1, FH * 1.1, f, false); text(g, 'faucet fader', FX, FY + FH + 52, C.muted, font(600, 12), 'center');
      T.label(`${f > 0 ? '+' : ''}${f} dB`, FX, FY + FH + 28, 'center', C.ink, 15);
      // scope: the mix, full height = 0 dBFS
      const sx = 502, sy = 16, sw = 522, sh = 330;
      panel(g, sx, sy, sw, sh, 'The mix, as a waveform');
      const top = sy + 48, bot = sy + sh - 26, mid = (top + bot) / 2, half = (bot - top) / 2;
      g.fillStyle = '#fffaf0'; g.fillRect(sx + 14, top, sw - 28, bot - top);
      [-1, 1].forEach(sg => { g.strokeStyle = 'rgba(229,50,45,.6)'; g.lineWidth = 1.5; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(sx + 14, mid - sg * half); g.lineTo(sx + sw - 14, mid - sg * half); g.stroke(); g.setLineDash([]); });
      g.lineWidth = 1.5; let clipped = 0;
      for (let px = 0; px < sw - 28; px += 2) {
        const tt = t - (sw - 28 - px) / 260, n = Math.floor(tt * 260);
        const a = db2g(f + flick(tt)) * (.6 + .4 * hash(n)) * (.8 + .2 * Math.sin(tt * 11)), b = db2g(R.BED_DB) * (hash(n + 999) - .5) * 2;
        let v = (hash(n * 7 + 3) - .5) * 2 * a + b; if (Math.abs(v) > 1) { clipped++; v = Math.sign(v); }
        g.strokeStyle = Math.abs(v) >= 1 ? CLICKC : WATER; g.beginPath(); g.moveTo(sx + 14 + px, mid); g.lineTo(sx + 14 + px, mid - v * half); g.stroke();
      }
      T.label('0 dB: clipping', sx + sw - 70, top + 2, 'center', CLICKC, 11);
      const hr = Math.max(0, -f).toFixed(0);
      text(g, f < 0 ? `headroom above the faucet: about ${hr} dB` : 'no headroom: the peaks are cut flat', sx + 18, bot + 18, C.muted, font(600, 12));
      // status
      const [zs, zc] = zone(f);
      panel(g, sx, 362, sw, 207, 'What you hear');
      g.fillStyle = zc; g.beginPath(); g.arc(sx + 30, 414, 9, 0, TAU); g.fill();
      text(g, zs, sx + 48, 419, C.ink, font(700, 16));
      const tips = ['The room bed sits at -40 dB, the faucet on its own fader.', '-20 dB leaves room above for louder sounds (an explosion,', 'a voice line) and stays well clear of the room bed.'];
      tips.forEach((l, i) => text(g, l, sx + 18, 456 + i * 22, C.muted, font(600, 13)));
      const cap = st.tour ? caption(LV_TOUR.cap, t) : '';
      if (cap) T.label(cap, sx + sw / 2, 540, 'center', C.ink, 14);
      return { f };
    }
    function info(f) {
      const k = f; if (k === st.key) return; st.key = k;
      if (st.tour) { fad.value = f; fv.textContent = `${f > 0 ? '+' : ''}${f} dB`; }
      const [zs, , cls] = zone(f);
      say($(s, '.fc-stats'), `<div class="${cls}"><b>${f > 0 ? '+' : ''}${f}</b><span>dB on the faucet fader</span></div><div><b>${R.BED_DB}</b><span>dB room bed</span></div>`);
      say($(s, '.fc-out'), `${zs[0].toUpperCase() + zs.slice(1)}. "Balance your sound effect around -20 dB and then adjust it from there" (slide 233).`);
    }
    return dt => {
      if (st.held) return;
      if (st.tour) { st.tt += Math.max(0, dt); if (st.tt >= LV_TOUR.dur) st.tt = 0; } else st.t += Math.max(0, dt);
      const { f } = render(); audio(f); info(f);
    };
  }, { leave() { scenes.level?.stop(); } });

  window.__seek = (t, which = 'list') => scenes[which].seek(t);
  window.__dur = (which = 'list') => scenes[which].dur();
})();
