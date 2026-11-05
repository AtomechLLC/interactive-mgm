/* Two ways audio breaks (DGMS Module 7, Sound Design: "The 2 most common sound design mistakes", slides 56-71).
   Mistakes come from two shortcomings: no resources and technical errors (58-59).
   Slide 1 (car): no resources. Need for Spirit: Drink & Drive Simulator shipped with no audio at all: "There's no audio to
   indicate the friction of the various terrains, no stingers... there's not even a sound effect to indicate whether the
   car itself is even turned on!" (62). A grey-box car laps a track over asphalt, gravel and grass and clips a stack of
   cones; four layers (engine, terrain friction, collision, lap stinger) can each be switched on, as Noah re-sounded it (63).
   Slide 2 (dash): technical errors. Sonic Colors: Ultimate's laser dash plays a collision sound for every crystal with no
   limiter, so it "becomes far too loud and way too crunchy" (68). Twenty crystal hits land in about a second; a voice
   limit caps how many play at once (the oldest is cut). Unlimited, the hits stack past 0 dBFS and clip; at 3 it stays clean.
   Tunable rules: CAR (lap time, terrain spans, the cone hit, levels) and DASH (hit spacing, decay, gain per voice) at the
   top. Both sounds and drawings come from the same functions of time, so the silent GIFs show what the page plays, and
   __seek(t, 'car'|'dash') is deterministic and never plays audio. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585;

  /* ---------- synth (Web Audio, no files). The AudioContext is made on the first click anywhere on the page. ---------- */
  const AU = { ctx: null, out: null, noise: null, on: true };
  function audioUp() {
    const c0 = AU.ctx; if (c0) { if (c0.state === 'suspended') c0.resume(); return c0; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    const c = AU.ctx = new AC();
    AU.out = c.createGain(); AU.out.gain.value = AU.on ? .8 : 0; AU.out.connect(c.destination);
    const n = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    AU.noise = n; return c;
  }
  document.addEventListener('pointerdown', audioUp, true);
  function setSound(on) {
    AU.on = on; if (AU.out) AU.out.gain.setTargetAtTime(on ? .8 : 0, AU.ctx.currentTime, .02);
    $$(document, '.snd').forEach(b => { b.classList.toggle('on', on); b.textContent = on ? '♪ Sound on' : '♪ Sound off'; });
  }
  // a voice: { w: wave or 'noise', f: [Hz start, Hz end], t, d, a, g, lp|bp|hp, q }
  function voice(v, s0, dest) {
    const c = AU.ctx, s = s0 + (v.t || 0), d = v.d, a = v.a ?? .005, g = c.createGain();
    let src;
    if (v.w === 'noise') { src = c.createBufferSource(); src.buffer = AU.noise; src.loop = true; }
    else { src = c.createOscillator(); src.type = v.w; src.frequency.setValueAtTime(v.f[0], s); if (v.f[1] !== v.f[0]) src.frequency.exponentialRampToValueAtTime(v.f[1], s + d); }
    let node = src;
    if (v.lp || v.bp || v.hp) { const fl = c.createBiquadFilter(); fl.type = v.lp ? 'lowpass' : v.bp ? 'bandpass' : 'highpass'; fl.frequency.value = v.lp || v.bp || v.hp; fl.Q.value = v.q ?? .8; node.connect(fl); node = fl; }
    g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(v.g, s + a); g.gain.exponentialRampToValueAtTime(.0005, s + d);
    node.connect(g); g.connect(dest); src.start(s); src.stop(s + d + .05);
    return { src, g };
  }
  const play = (V, dest) => { const c = AU.ctx; if (!c || !AU.on) return []; return V.map(v => voice(v, c.currentTime + .02, dest || AU.out)); };
  const hash = i => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
  const card = g => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const txt = (g, s, x, y, font, col, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'alphabetic'; g.fillText(s, x, y); };
  function wrap(g, text, x, y, maxW, lh) {
    const words = text.split(' '); let line = '', n = 0;
    words.forEach(wd => { const tt = line ? line + ' ' + wd : wd; if (g.measureText(tt).width > maxW && line) { g.fillText(line, x, y + n * lh); n++; line = wd; } else line = tt; });
    if (line) { g.fillText(line, x, y + n * lh); n++; }
    return n;
  }
  // a small speaker: waves when it sounds, a cross when it is silent
  function speaker(g, x, y, s, on, col) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = on ? col : '#9a9cb2'; g.beginPath(); g.moveTo(-10, -4); g.lineTo(-5, -4); g.lineTo(2, -10); g.lineTo(2, 10); g.lineTo(-5, 4); g.lineTo(-10, 4); g.closePath(); g.fill();
    g.strokeStyle = on ? col : C.red; g.lineWidth = 2.2; g.lineCap = 'round';
    if (on) { [6, 11].forEach(r => { g.beginPath(); g.arc(1, 0, r, -.8, .8); g.stroke(); }); }
    else { g.beginPath(); g.moveTo(6, -5); g.lineTo(14, 5); g.moveTo(14, -5); g.lineTo(6, 5); g.stroke(); }
    g.restore();
  }
  function meterV(g, x, y, w, h, db) {
    // vertical meter from -36 to +9 dBFS, red above 0
    const k = d => clamp((d + 36) / 45), y0 = y + h - k(0) * h;
    g.fillStyle = '#e6dcc5'; g.beginPath(); g.roundRect(x, y, w, h, 5); g.fill();
    g.fillStyle = 'rgba(229,50,45,.18)'; g.fillRect(x, y, w, y0 - y);
    const top = y + h - k(db) * h;
    const grd = g.createLinearGradient(0, y + h, 0, y); grd.addColorStop(0, '#2fae63'); grd.addColorStop(k(-6), '#e0a92d'); grd.addColorStop(k(0), '#e0a92d'); grd.addColorStop(Math.min(1, k(0) + .001), '#e5322d');
    g.fillStyle = grd; g.fillRect(x + 3, top, w - 6, y + h - top);
    g.strokeStyle = C.red; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 4, y0); g.lineTo(x + w + 4, y0); g.stroke();
    [-30, -20, -10, 0, 6].forEach(d => txt(g, (d > 0 ? '+' : '') + d, x - 6, y + h - k(d) * h + 4, '600 10px Jost, sans-serif', d === 0 ? C.red : C.muted, 'right'));
  }

  /* ================= Slide 1: the silent car ================= */
  const CAR = {
    lap: 8, u0: .1,                            // seconds per lap; where the car starts on the loop (0 = start line)
    terrain: [['gravel', .22, .33, '#cdb88f'], ['grass', .56, .66, '#8cc56b']],   // [name, from u, to u, colour]; the rest is asphalt
    hitU: .80,                                 // the stack of cones the car clips
    friction: { asphalt: .12, gravel: .75, grass: .4 },   // loudness of the tyre layer by surface
    filt: { asphalt: 320, gravel: 2600, grass: 1200 },    // its band-pass centre (Hz)
  };
  const LAY = ['engine', 'terrain', 'hit', 'sting'];
  const LNM = { engine: 'Engine', terrain: 'Terrain friction', hit: 'Collision', sting: 'Lap stinger' };
  const LCL = { engine: '#e5322d', terrain: '#9a5a06', hit: '#8a4fd6', sting: '#2ea3dc' };
  const HIT_V = [{ w: 'noise', lp: 1800, d: .35, g: .7 }, { w: 'sine', f: [140, 50], d: .3, g: .7 }, { w: 'noise', bp: 3500, q: 2, t: .05, d: .4, g: .3 }];
  const STING_V = [72, 76, 79, 84].map((n, i) => ({ w: 'triangle', f: [440 * Math.pow(2, (n - 69) / 12), 440 * Math.pow(2, (n - 69) / 12)], t: i * .08, d: .35 + i * .08, g: .14 }));
  const TR = { cx: 326, cy: 296, R: 118, half: 130, w: 64 };
  const SLEN = 4 * TR.half + 2 * Math.PI * TR.R;
  // a point on the stadium loop: u = 0 is the left end of the top straight, going clockwise
  function track(u, off = 0) {
    let s = (((u % 1) + 1) % 1) * SLEN; const L = 2 * TR.half, A = Math.PI * TR.R;
    if (s < L) return { x: TR.cx - TR.half + s, y: TR.cy - TR.R - off, a: 0 };
    s -= L; if (s < A) { const th = -Math.PI / 2 + s / TR.R; return { x: TR.cx + TR.half + Math.cos(th) * (TR.R + off), y: TR.cy + Math.sin(th) * (TR.R + off), a: th + Math.PI / 2 }; }
    s -= A; if (s < L) return { x: TR.cx + TR.half - s, y: TR.cy + TR.R + off, a: Math.PI };
    s -= L; const th = Math.PI / 2 + s / TR.R; return { x: TR.cx - TR.half + Math.cos(th) * (TR.R + off), y: TR.cy + Math.sin(th) * (TR.R + off), a: th + Math.PI / 2 };
  }
  const uAt = t => CAR.u0 + t / CAR.lap;
  const surfAt = u => { const f = ((u % 1) + 1) % 1, s = CAR.terrain.find(([, a, b]) => f >= a && f < b); return s ? s[0] : 'asphalt'; };
  const straight = u => { const s = (((u % 1) + 1) % 1) * SLEN, L = 2 * TR.half, A = Math.PI * TR.R; return (s < L || (s > L + A && s < 2 * L + A)) ? 1 : 0; };
  // event times: the n-th cone hit and the n-th lap crossing
  const hitT = n => ((CAR.hitU - CAR.u0) + n) * CAR.lap;
  const lapT = n => ((1 - CAR.u0) + n) * CAR.lap;
  const lastEv = (fT, t) => { let n = Math.floor(t / CAR.lap) + 1; while (n >= 0 && fT(n) > t) n--; return n >= 0 ? t - fT(n) : 99; };
  // engine pitch: higher on the straights, a dip after the hit
  function rpm(t) {
    let s = 0; for (let k = -6; k <= 6; k++) s += straight(uAt(t + k * .06)); s /= 13;
    const dh = lastEv(hitT, t), dip = dh < 1 ? (1 - dh) * .5 : 0;
    return 62 + 46 * s - 30 * dip;
  }
  // the engine's phase (integral of rpm), tabled over one lap since rpm repeats every lap; drawn waves scroll smoothly
  const PH = (() => { const n = CAR.lap * 1000, a = new Float32Array(n + 1); for (let i = 1; i <= n; i++) a[i] = a[i - 1] + TAU * rpm(i / 1000) / 1000; return a; })();
  const phase = tt => { const n = CAR.lap * 1000, k = Math.floor(tt / CAR.lap), r = (tt - k * CAR.lap) * 1000; return k * PH[n] + PH[Math.min(n, Math.round(r))]; };
  function lv(k, t) {
    if (k === 'engine') return .45;
    if (k === 'terrain') return CAR.friction[surfAt(uAt(t))];
    if (k === 'hit') { const d = lastEv(hitT, t); return d < .7 ? Math.exp(-d * 7) : 0; }
    if (k === 'sting') { const d = lastEv(lapT, t); return d < .8 ? .6 * Math.exp(-d * 4) * (.75 + .25 * Math.sin(d * 60)) : 0; }
  }

  function drawCar(g, on, t, cap) {
    T.use(g); card(g);
    const u = uAt(t), p = track(u), any = LAY.some(k => on[k]), all = LAY.every(k => on[k]);
    // grass infield and outfield
    g.fillStyle = '#d9e4c8'; g.beginPath(); g.roundRect(14, 14, 612, 557, 12); g.fill();
    // track: asphalt band, then the terrain spans painted over it
    const band = (a, b, col, wd) => { g.strokeStyle = col; g.lineWidth = wd; g.lineCap = 'butt'; g.beginPath(); for (let i = 0; i <= 60; i++) { const q = track(lerp(a, b, i / 60)); i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y); } g.stroke(); };
    band(0, 1, '#3d4270', TR.w + 8); band(0, 1, '#7d7f8f', TR.w);
    CAR.terrain.forEach(([name, a, b, col]) => { band(a, b, col, TR.w); const m = track((a + b) / 2, (name === 'grass' ? -1 : 1) * (TR.w / 2 + 22)); T.label(name, m.x, m.y, 'center', C.ink, 13); });
    { const m = track(.06, -TR.w / 2 - 20); T.label('asphalt', m.x, m.y, 'center', C.ink, 13); }
    g.setLineDash([14, 12]); band(0, 1, 'rgba(255,255,255,.5)', 2); g.setLineDash([]);
    // start line
    { const a = track(0, -TR.w / 2), b = track(0, TR.w / 2); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#fff' : C.navy; g.fillRect(a.x - 4, a.y + i * TR.w / 8, 8, TR.w / 8); } }
    // the cones: knocked over when the car passes them
    { const dh = lastEv(hitT, t), lapStart = lastEv(lapT, t) < dh, out = !lapStart && dh < 99;
      for (let i = 0; i < 3; i++) { const base = track(CAR.hitU + i * .006, TR.w / 2 - 10), k = out ? ease(clamp(dh / .6)) : 0, x = base.x - (60 + i * 18) * k, y = base.y + (i - 1) * 26 * k;
        g.save(); g.translate(x, y); g.rotate(k * (2 + i)); g.fillStyle = '#ff8a1e'; g.beginPath(); g.moveTo(0, -11); g.lineTo(8, 9); g.lineTo(-8, 9); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.fillRect(-5, -1, 10, 3); g.restore(); }
      if (out && dh < .8) { const hp = track(CAR.hitU, TR.w / 2 - 10);
        if (on.hit) { g.strokeStyle = LCL.hit; g.globalAlpha = 1 - dh / .8; g.lineWidth = 4; g.beginPath(); g.arc(hp.x, hp.y, 16 + dh * 90, 0, TAU); g.stroke(); g.globalAlpha = 1; T.label('crash', hp.x + 70, hp.y - 40, 'center', LCL.hit, 13); }
        else { speaker(g, hp.x + 48, hp.y - 36, 1.3, false); T.label('a hit, and no sound', hp.x + 80, hp.y - 64, 'center', C.red, 12); } } }
    // tyre dust on loud surfaces
    const surf = surfAt(u);
    if (on.terrain && surf !== 'asphalt') for (let i = 0; i < 8; i++) { const q = track(u - .004 - i * .004, (hash(i + Math.floor(t * 20)) - .5) * 30); g.fillStyle = surf === 'gravel' ? 'rgba(150,120,70,.5)' : 'rgba(60,140,60,.45)'; g.beginPath(); g.arc(q.x, q.y, 3 + i * .6, 0, TAU); g.fill(); }
    // engine rings pulse with rpm
    if (on.engine) { const r = rpm(t); for (let i = 0; i < 3; i++) { const ph = (t * r / 30 + i / 3) % 1; g.strokeStyle = LCL.engine; g.globalAlpha = .55 * (1 - ph); g.lineWidth = 2.5; g.beginPath(); g.arc(p.x, p.y, 22 + ph * 34, 0, TAU); g.stroke(); } g.globalAlpha = 1; }
    // the car
    g.save(); g.translate(p.x, p.y); g.rotate(p.a); T.shadow(3, 4, 22, 13, .3);
    g.fillStyle = '#e5322d'; g.strokeStyle = C.navy; g.lineWidth = 2.5; g.beginPath(); g.roundRect(-20, -11, 40, 22, 6); g.fill(); g.stroke();
    g.fillStyle = '#bfe3f5'; g.fillRect(4, -8, 8, 16); g.fillStyle = C.navy; g.fillRect(-17, -13, 9, 4); g.fillRect(-17, 9, 9, 4); g.fillRect(9, -13, 9, 4); g.fillRect(9, 9, 9, 4);
    g.restore();
    if (!on.engine) speaker(g, p.x, p.y - 34, 1, false);
    // title over the infield
    txt(g, 'Need for Spirit: Drink & Drive Simulator', 34, 46, '800 17px Montserrat, Jost, sans-serif', C.ink);
    T.stamp(all ? 'RE-SOUNDED (63)' : any ? `${LAY.filter(k => on[k]).length} OF 4 LAYERS` : 'AS SHIPPED: NO AUDIO (62)', 34 + 150, 92, all ? C.good : any ? C.goldInk : C.red, 1, 20);
    speaker(g, TR.cx, TR.cy - 8, 2.4, any, all ? C.good : C.goldInk);
    txt(g, `lap ${Math.floor((t + CAR.u0 * CAR.lap) / CAR.lap) + 1}`, TR.cx, TR.cy + 36, '600 13px Jost, sans-serif', C.muted, 'center');
    // quote
    g.fillStyle = 'rgba(255,252,244,.92)'; g.beginPath(); g.roundRect(30, 470, 580, 88, 10); g.fill();
    g.font = 'italic 500 14px Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'left';
    wrap(g, '“There’s no audio to indicate the friction of the various terrains, no stingers… there’s not even a sound effect to indicate whether the car itself is even turned on!”', 46, 496, 548, 19);
    txt(g, 'slide 62', 594, 550, '600 11px Jost, sans-serif', C.muted, 'right');

    // right: what you hear, the last four seconds per layer
    txt(g, 'What you hear', 650, 40, '800 17px Montserrat, Jost, sans-serif', C.ink);
    txt(g, 'last 4 s per layer, newest at the right', 650, 60, '500 12px Jost, sans-serif', C.muted);
    if (cap) { g.font = '600 13px Jost, sans-serif'; g.fillStyle = '#efe6d2'; g.beginPath(); g.roundRect(646, 70, 380, 46, 8); g.fill(); g.fillStyle = C.ink; g.textAlign = 'left'; wrap(g, cap, 656, 89, 362, 17); }
    LAY.forEach((k, i) => {
      const y = 124 + i * 110, x = 646, w = 380, h = 100, wx = x + 12, ww = 300, cy = y + 62;
      g.fillStyle = on[k] ? '#fffaf0' : '#eee7d6'; g.beginPath(); g.roundRect(x, y, w, h, 10); g.fill();
      g.strokeStyle = on[k] ? LCL[k] : '#d6cbb2'; g.lineWidth = 2; g.stroke();
      txt(g, LNM[k], x + 12, y + 24, '700 15px Jost, sans-serif', on[k] ? C.ink : C.muted);
      const note = k === 'engine' ? `${Math.round(rpm(t))} Hz hum` : k === 'terrain' ? `on ${surf}` : k === 'hit' ? 'cones' : 'start line';
      txt(g, on[k] ? note : 'silent', x + w - 12, y + 24, '600 12px Jost, sans-serif', on[k] ? LCL[k] : C.red, 'right');
      speaker(g, x + w - 30, cy, 1.2, on[k], LCL[k]);
      if (!on[k]) { g.strokeStyle = '#c9bfa7'; g.lineWidth = 2; g.beginPath(); g.moveTo(wx, cy); g.lineTo(wx + ww, cy); g.stroke(); return; }
      g.strokeStyle = LCL[k]; g.fillStyle = LCL[k]; g.lineWidth = 1.5;
      if (k === 'engine') { g.beginPath(); for (let px = 0; px <= ww; px += 1.5) { const tau = t - 4 + px / ww * 4, y2 = cy - 22 * Math.sin(phase(tau) / 9); px ? g.lineTo(wx + px, y2) : g.moveTo(wx + px, y2); } g.stroke(); }
      else for (let px = 0; px < ww; px += 2) { const tau = t - 4 + px / ww * 4, a = lv(k, tau) * (.55 + .45 * hash(Math.floor(tau * 160) + i * 999)) * 30; if (a > .4) g.fillRect(wx + px, cy - a, 1.6, a * 2); }
    });
  }

  const CSTEPS = [[0, [], 'As shipped: no engine, no tyres, no impact, no stingers (62)'], [8, ['engine'], '+ engine: now you can tell the car is on'],
    [8.6, ['engine', 'terrain'], '+ terrain friction: gravel and grass each sound different'], [12.5, ['engine', 'terrain', 'hit'], '+ collision: the hit lands'],
    [14.5, LAY, '+ lap stinger: the lap gets a reward'], [16, LAY, 'Re-sounded, as Noah did for the deck (63): every action has a sound']];
  const CDUR = 24;
  const carTour = t => { const s = CSTEPS.filter(x => t >= x[0]).at(-1), on = {}; LAY.forEach(k => on[k] = s[1].includes(k)); return { on, cap: s[2] }; };

  const scenes = {};
  const LOOP = { n: null };   // the engine and tyre loops, shared so leaving the slide can silence them
  canvasDemo('ab-car', (s, cv, g) => {
    const st = { tour: true, held: false, t: 0, on: { engine: false, terrain: false, hit: false, sting: false }, key: '' };
    const tourBtn = $(s, '.ab-tour'), boxes = $$(s, '.ab-l');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); const o = carTour(st.t % CDUR).on; LAY.forEach(k => st.on[k] = o[k]); } };
    boxes.forEach(b => b.onchange = () => { manual(); st.on[b.dataset.l] = b.checked; });
    $(s, '.ab-off').onclick = () => { manual(); LAY.forEach(k => st.on[k] = false); };
    $(s, '.ab-on').onclick = () => { manual(); LAY.forEach(k => st.on[k] = true); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    $$(s, '.snd').forEach(b => b.onclick = () => { audioUp(); setSound(!AU.on); });
    function loops(on, t) {
      const c = AU.ctx; if (!c) return;
      if (!LOOP.n) {
        const eg = c.createGain(); eg.gain.value = 0; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.connect(eg); eg.connect(AU.out);
        const o1 = c.createOscillator(); o1.type = 'sawtooth'; const o2 = c.createOscillator(); o2.type = 'square'; o1.connect(lp); o2.connect(lp); o1.start(); o2.start();
        const ns = c.createBufferSource(); ns.buffer = AU.noise; ns.loop = true; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = .9; const tg = c.createGain(); tg.gain.value = 0; ns.connect(bp); bp.connect(tg); tg.connect(AU.out); ns.start();
        LOOP.n = { eg, o1, o2, bp, tg };
      }
      const n = LOOP.n, now = c.currentTime, r = rpm(t), sf = surfAt(uAt(t));
      n.o1.frequency.setTargetAtTime(r, now, .05); n.o2.frequency.setTargetAtTime(r * 1.503, now, .05);
      n.eg.gain.setTargetAtTime(on.engine ? .16 : 0, now, .05);
      n.bp.frequency.setTargetAtTime(CAR.filt[sf], now, .05); n.tg.gain.setTargetAtTime(on.terrain ? CAR.friction[sf] * .5 : 0, now, .05);
    }
    function fire(on, a, b) {
      if (!AU.ctx || b <= a || b - a > .5) return;
      for (let n = Math.max(0, Math.floor(a / CAR.lap) - 1); n <= Math.floor(b / CAR.lap) + 1; n++) {
        if (on.hit && hitT(n) >= a && hitT(n) < b) play(HIT_V);
        if (on.sting && lapT(n) >= a && lapT(n) < b) play(STING_V);
      }
    }
    function info(on) {
      const n = LAY.filter(k => on[k]).length, key = LAY.map(k => +on[k]).join();
      if (key === st.key) return; st.key = key; boxes.forEach(b => { b.checked = !!on[b.dataset.l]; });
      say($(s, '.ab-stats'), `<div class="${n === 4 ? 'g' : n ? 'y' : 'r'}"><b>${n}/4</b><span>layers the game plays</span></div>`);
      say($(s, '.ab-out'), n === 0 ? 'This is the game as shipped. You can see the car drive, hit gravel and clip the cones, but nothing tells your ears any of it. The indie team probably lacked the funds (65), but the cost is the whole feel.'
        : n === 4 ? 'Every action now has a sound: the engine says the car is on and how hard it works, the tyres say what you drive on, the crash lands, and the lap rewards you.'
          : `Playing: ${LAY.filter(k => on[k]).map(k => LNM[k].toLowerCase()).join(', ')}. Missing: ${LAY.filter(k => !on[k]).map(k => LNM[k].toLowerCase()).join(', ')}.`);
    }
    scenes.car = { seek(t) { st.held = true; const o = carTour(t); drawCar(g, o.on, t, o.cap); info(o.on); }, dur: () => CDUR };
    return dt => {
      if (st.held) return;
      const a = st.t; st.t += Math.max(0, dt);
      let on = st.on, cap = '';
      if (st.tour) { if (st.t >= CDUR) st.t = 0; const o = carTour(st.t); on = o.on; cap = o.cap; }
      if (st.t >= a) fire(on, a, st.t);
      loops(on, st.t);
      drawCar(g, on, st.t, cap); info(on);
    };
  }, { leave() { if (LOOP.n) { const now = AU.ctx.currentTime; LOOP.n.eg.gain.setTargetAtTime(0, now, .03); LOOP.n.tg.gain.setTargetAtTime(0, now, .03); } } });

  /* ================= Slide 2: twenty crystals, one voice limit ================= */
  const DASH = {
    period: 4, start: .5,          // a dash every 4 s, starting .5 s in
    n: 20, gap: .055,              // twenty hits, 55 ms apart
    gain: .32, decay: 4,           // each hit's peak and exponential decay rate (1/s)
    life: .9,                      // a voice's natural length (s)
  };
  const UNL = 21;
  const hitAt = i => DASH.start + .05 + i * DASH.gap;   // time of hit i inside a dash
  // each voice's level at time k inside the dash; voice i is cut when voice i+limit starts
  function vEnv(i, k, lim) {
    const h = hitAt(i); if (k < h) return 0;
    const end = Math.min(h + DASH.life, lim < UNL && i + lim < DASH.n ? hitAt(i + lim) : 99);
    if (k >= end) return 0;
    return DASH.gain * Math.exp(-(k - h) * DASH.decay);
  }
  const sumAt = (k, lim) => { let s = 0; for (let i = 0; i < DASH.n; i++) s += vEnv(i, k, lim); return s; };
  const countAt = (k, lim) => { let c = 0; for (let i = 0; i < DASH.n; i++) if (vEnv(i, k, lim) > .0005) c++; return c; };
  const peakOf = lim => { let p = 0; for (let k = DASH.start; k < DASH.start + 2.2; k += .005) p = Math.max(p, sumAt(k, lim)); return p; };
  const dB = x => x > 0 ? 20 * Math.log10(x) : -99;
  const fmtLim = l => l >= UNL ? '∞' : String(l);
  const CX = i => 150 + i * 40;

  function drawDash(g, lim, t, cap) {
    T.use(g); card(g);
    const k = ((t % DASH.period) + DASH.period) % DASH.period, nowLv = sumAt(k, lim), peak = peakOf(lim), clip = peak > 1, clipNow = nowLv > 1;
    // scene: a grey-box laser dash through a line of crystals
    g.fillStyle = '#e8e4f2'; g.beginPath(); g.roundRect(12, 12, W - 24, 222, 12); g.fill();
    txt(g, 'Sonic Colors: Ultimate · the laser dash (68)', 28, 40, '800 16px Montserrat, Jost, sans-serif', C.ink);
    txt(g, '“becomes far too loud and way too crunchy”', 28, 60, 'italic 500 13px Jost, sans-serif', C.muted);
    T.label(`voice limit: ${fmtLim(lim)}`, 1012, 36, 'right', lim >= UNL ? C.red : C.ink, 15);
    if (cap) T.label(cap, 1012, 66, 'right', C.ink, 13);
    g.strokeStyle = 'rgba(38,44,106,.2)'; g.lineWidth = 2; g.beginPath(); g.moveTo(40, 150); g.lineTo(1000, 150); g.stroke();
    const dx = k < DASH.start ? -1 : (k - DASH.start - .05) / DASH.gap, px = CX(0) + dx * 40;   // the runner's x
    for (let i = 0; i < DASH.n; i++) {
      const x = CX(i), dh = k - hitAt(i);
      const back = k > 3.1 ? clamp((k - 3.1) / .5) : 0;   // the line of crystals respawns before the next dash
      if (dh < 0 || k < DASH.start || back > 0) { g.globalAlpha = dh < 0 || k < DASH.start ? 1 : back; g.fillStyle = '#7fd4f0'; g.strokeStyle = '#2a7fae'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 132); g.lineTo(x + 10, 150); g.lineTo(x, 168); g.lineTo(x - 10, 150); g.closePath(); g.fill(); g.stroke(); g.globalAlpha = 1; if (dh < 0 || k < DASH.start) continue; }
      const e = vEnv(i, k, lim) / DASH.gain;
      if (dh < .35) { for (let j = 0; j < 5; j++) { const a = j / 5 * TAU + i; g.fillStyle = `rgba(127,212,240,${1 - dh / .35})`; g.beginPath(); g.arc(x + Math.cos(a) * dh * 90, 150 + Math.sin(a) * dh * 90, 3, 0, TAU); g.fill(); } }
      if (e > .002) { g.strokeStyle = clipNow ? C.red : '#2a7fae'; g.globalAlpha = clamp(e); g.lineWidth = 2; g.beginPath(); g.arc(x, 150, 14 + (1 - e) * 26, 0, TAU); g.stroke(); g.globalAlpha = 1; }
    }
    if (k >= DASH.start && px < 1060) {
      g.strokeStyle = 'rgba(46,163,220,.5)'; g.lineWidth = 10; g.lineCap = 'round'; g.beginPath(); g.moveTo(Math.max(40, px - 220), 150); g.lineTo(px, 150); g.stroke(); g.lineCap = 'butt';
      T.player(px, 150, 0, .9);
    } else if (k < DASH.start) T.player(70, 150, 0, .9);
    if (clipNow) T.stamp('CLIPPING', 520, 206, C.red, 1, 26);

    // voice stack: one row per crystal hit, bar = how long its voice plays; a cut voice ends early
    const sums = Array.from({ length: 230 }, (_, j) => sumAt(DASH.start + j * .01 + .005, lim));
    const VX = 20, VY = 250, VW = 600, VH = 322, rowH = 13.4, tx = q => VX + 120 + (q - DASH.start) / 2 * (VW - 140);
    g.fillStyle = '#fffaf0'; g.beginPath(); g.roundRect(VX, VY, VW, VH, 10); g.fill();
    txt(g, 'Voices playing', VX + 14, VY + 24, '800 15px Montserrat, Jost, sans-serif', C.ink);
    txt(g, 'one row per crystal hit', VX + 14, VY + 42, '500 12px Jost, sans-serif', C.muted);
    for (let i = 0; i < DASH.n; i++) {
      const y = VY + 50 + i * rowH, h = hitAt(i), natEnd = h + DASH.life, cut = lim < UNL && i + lim < DASH.n ? hitAt(i + lim) : 99, end = Math.min(natEnd, cut);
      if (k >= h) {
        const e1 = Math.min(k, end);
        g.fillStyle = '#d7d0bd'; if (cut < natEnd) g.fillRect(tx(cut), y + 2, tx(natEnd) - tx(cut), rowH - 4);
        // blue while it plays, red for the moments the whole mix is over the ceiling
        for (let q = h; q < e1; q += .01) { g.fillStyle = sums[Math.floor((q - DASH.start) / .01)] > 1 ? 'rgba(229,50,45,.85)' : 'rgba(46,163,220,.85)'; g.fillRect(tx(q), y + 2, Math.max(1, tx(Math.min(e1, q + .01)) - tx(q) + .5), rowH - 4); }
        if (cut < natEnd && k >= cut) { g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(tx(cut), y + 1); g.lineTo(tx(cut), y + rowH - 1); g.stroke(); }
      }
    }
    txt(g, 'blue: playing', VX + 14, VY + VH - 44, '600 11px Jost, sans-serif', '#2a7fae'); txt(g, 'grey: cut by the limit', VX + 14, VY + VH - 28, '600 11px Jost, sans-serif', C.muted); txt(g, 'red: part of a clipped mix', VX + 14, VY + VH - 12, '600 11px Jost, sans-serif', C.red);
    txt(g, `crystal 1`, VX + 110, VY + 60, '600 10px Jost, sans-serif', C.muted, 'right');
    const cx = tx(k); if (k >= DASH.start && cx < VX + VW - 8) { g.strokeStyle = C.red; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, VY + 48); g.lineTo(cx, VY + VH - 8); g.stroke(); }
    const nowC = countAt(k, lim);
    T.label(`${nowC} at once`, Math.min(VX + VW - 50, Math.max(VX + 170, cx)), VY + 30, 'center', nowC > 3 ? C.red : C.ink, 13);

    // output: the summed level over the dash, with the 0 dBFS rail
    const OX = 636, OY = 250, OW = 320, OH = 170, ky = v => OY + OH - 22 - clamp(v / 2) * (OH - 50);
    g.fillStyle = '#fffaf0'; g.beginPath(); g.roundRect(OX, OY, OW, OH, 10); g.fill();
    txt(g, 'Output level', OX + 14, OY + 24, '800 15px Montserrat, Jost, sans-serif', C.ink);
    g.strokeStyle = C.red; g.setLineDash([6, 5]); g.lineWidth = 1.5; g.beginPath(); g.moveTo(OX + 10, ky(1)); g.lineTo(OX + OW - 10, ky(1)); g.stroke(); g.setLineDash([]);
    txt(g, '0 dBFS: the ceiling', OX + OW - 12, ky(1) - 5, '600 10px Jost, sans-serif', C.red, 'right');
    const ox = q => OX + 14 + (q - DASH.start) / 2 * (OW - 28);
    for (let q = DASH.start; q <= Math.min(k, DASH.start + 2); q += .006) {
      const v = sumAt(q, lim), y1 = ky(Math.min(v, 1)), y0 = ky(0);
      g.fillStyle = 'rgba(46,163,220,.75)'; g.fillRect(ox(q), y1, 1.6, y0 - y1);
      if (v > 1) { g.fillStyle = C.red; g.fillRect(ox(q), ky(v), 1.6, y1 - ky(v)); }
    }
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 1; g.beginPath(); g.moveTo(OX + 10, ky(0)); g.lineTo(OX + OW - 10, ky(0)); g.stroke();
    txt(g, 'red: over the ceiling, flattened into distortion', OX + 14, OY + OH - 6, '600 10px Jost, sans-serif', C.muted);

    // readout
    const RX = 636, RY = 432, RW = 320, RH = 140;
    g.fillStyle = clip ? '#f9d9d6' : '#d8f0df'; g.beginPath(); g.roundRect(RX, RY, RW, RH, 10); g.fill();
    txt(g, clip ? 'Clipped: loud and crunchy' : 'Clean: under the ceiling', RX + 14, RY + 28, '800 16px Montserrat, Jost, sans-serif', clip ? C.redDk : C.good);
    txt(g, `Peak of this dash: ${dB(peak) >= 0 ? '+' : ''}${dB(peak).toFixed(1)} dBFS`, RX + 14, RY + 54, '600 14px Jost, sans-serif', C.ink);
    txt(g, `Most voices at once: ${Math.max(...Array.from({ length: 60 }, (_, j) => countAt(DASH.start + .05 + j * .02, lim)))}`, RX + 14, RY + 76, '600 14px Jost, sans-serif', C.ink);
    g.font = '500 12px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'left';
    wrap(g, clip ? 'Every crystal adds a full-volume voice before the last one fades, so the sum passes the ceiling.' : 'The limit cuts the oldest hit as a new one starts: the dash still sparkles, at a steady level.', RX + 14, RY + 98, RW - 28, 16);
    meterV(g, 984, 254, 34, 300, dB(nowLv));
    txt(g, 'dBFS', 1001, 572, '700 11px Jost, sans-serif', C.ink, 'center');
  }

  const DSTEPS = [[0, UNL, 'Unlimited: every crystal plays its own voice'], [8.2, 8, 'Limit 8: still stacks past the ceiling'], [12.2, 5, 'Limit 5: just over'], [16.2, 3, 'Limit 3: clean, and every hit still heard']];
  const DDUR = 24;
  const dashTour = t => { const s = DSTEPS.filter(x => t >= x[0]).at(-1); return { lim: s[1], cap: s[2] }; };

  canvasDemo('ab-dash', (s, cv, g) => {
    const st = { tour: true, held: false, t: 0, lim: UNL, key: '', voices: [], bus: null };
    const tourBtn = $(s, '.ab-dtour'), rng = $(s, '.ab-lim'), presets = $$(s, '.ab-presets .btn');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.lim = dashTour(st.t % DDUR).lim; } };
    const setLim = v => { st.lim = v; };
    rng.oninput = () => { manual(); setLim(+rng.value); };
    presets.forEach(b => b.onclick = () => { manual(); setLim(+b.dataset.v); });
    $(s, '.ab-dash').onclick = () => { manual(); st.t = Math.ceil(st.t / DASH.period) * DASH.period + .2; };   // the next dash, .3 s from now
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    $$(s, '.snd').forEach(b => b.onclick = () => { audioUp(); setSound(!AU.on); });
    // hits go to a bus that hard-clips above 1.0, as a mix bus does when it runs out of headroom
    function bus() {
      const c = AU.ctx; if (st.bus) return st.bus;
      const pre = c.createGain(); pre.gain.value = 1 / 3; const sh = c.createWaveShaper(), N = 2048, cv2 = new Float32Array(N);
      for (let i = 0; i < N; i++) { const x = (i / (N - 1)) * 2 - 1; cv2[i] = clamp(x * 3, -1, 1); }
      sh.curve = cv2; const post = c.createGain(); post.gain.value = .7; pre.connect(sh); sh.connect(post); post.connect(AU.out);
      return (st.bus = pre);
    }
    function hit(i, lim) {
      const c = AU.ctx; if (!c || !AU.on) return; const now = c.currentTime + .01;
      st.voices = st.voices.filter(v => v.end > now);
      while (lim < UNL && st.voices.length >= lim) { const o = st.voices.shift(); o.g.gain.cancelScheduledValues(now); o.g.gain.setTargetAtTime(0, now, .004); o.end = now; }
      const g = c.createGain(), o1 = c.createOscillator(), o2 = c.createOscillator(), f = 2093 * Math.pow(2, ((i % 5) - 2) / 24);
      o1.type = 'sine'; o1.frequency.value = f; o2.type = 'triangle'; o2.frequency.value = f * 1.5;
      g.gain.setValueAtTime(DASH.gain, now); g.gain.setTargetAtTime(0, now, 1 / DASH.decay);
      o1.connect(g); o2.connect(g); g.connect(bus()); o1.start(now); o2.start(now); o1.stop(now + DASH.life); o2.stop(now + DASH.life);
      st.voices.push({ g, end: now + DASH.life });
    }
    function fire(lim, a, b) {
      if (!AU.ctx || b <= a || b - a > .5) return;
      for (let n = Math.floor(a / DASH.period); n <= Math.floor(b / DASH.period); n++) for (let i = 0; i < DASH.n; i++) { const tt = n * DASH.period + hitAt(i); if (tt >= a && tt < b) hit(i, lim); }
    }
    function info(lim) {
      const key = lim; if (key === st.key) return; st.key = key;
      rng.value = lim; $(s, '.ab-lim-v').textContent = fmtLim(lim); presets.forEach(b => b.classList.toggle('on', +b.dataset.v === lim));
      const p = dB(peakOf(lim)), clip = p > 0;
      say($(s, '.ab-dstats'), `<div class="${clip ? 'r' : 'g'}"><b>${p >= 0 ? '+' : ''}${p.toFixed(1)}</b><span>dBFS peak per dash (${clip ? 'clipped' : 'clean'})</span></div>`);
      say($(s, '.ab-dout'), lim >= UNL ? 'No limiter: each crystal starts a new voice while the earlier ones are still ringing, so twenty quiet sounds add up to one loud, distorted burst. That is the Sonic Colors: Ultimate dash.'
        : clip ? `With ${lim} voices the stack still passes 0 dBFS. Lower the limit until the meter stays out of the red.`
          : `With ${lim} voice${lim > 1 ? 's' : ''} at once, a new hit cuts the oldest. The dash keeps its sparkle and the level stays under the ceiling.`);
    }
    scenes.dash = { seek(t) { st.held = true; const o = dashTour(t); drawDash(g, o.lim, t, o.cap); info(o.lim); }, dur: () => DDUR };
    return dt => {
      if (st.held) return;
      const a = st.t; st.t += Math.max(0, dt);
      let lim = st.lim, cap = '';
      if (st.tour) { if (st.t >= DDUR) st.t = 0; const o = dashTour(st.t); lim = o.lim; cap = o.cap; }
      if (st.t >= a) fire(lim, a, st.t);
      drawDash(g, lim, st.t, cap); info(lim);
    };
  });

  window.__seek = (t, which = 'car') => scenes[which].seek(t);
  window.__dur = (which = 'car') => scenes[which].dur();
})();
