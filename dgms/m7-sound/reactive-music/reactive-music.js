/* Music that reacts (Module 7, Sound Design, slides 30-32 and 166-170).
   Slide 1, style layers (Devil May Cry V): a synthesised loop in four stems (drums, bass, lead, vocal-like pad) tied
   to a style meter from D to S. Each stylish hit adds STYLE.hit points; after STYLE.grace seconds without a hit the
   meter drains at STYLE.decay points a second. The rank at the start of each beat decides which stems play on that
   beat (RANKS: D drums, C + bass, B + lead, A full kit, S + vocal pad), so stems enter and drop on the beat and stay
   in sync. Room clear cuts the music; the next hit brings it back on the next bar.
   Slide 2, state changes: a stealth state machine (Metal Gear Solid: sneaking, suspicious, alert) where each state
   has its own track and every transition fires a stinger (FSM, STING, TRACKS), then Breath of the Wild, where a
   Guardian's dissonant stinger interrupts the ambience.
   All music runs on a beat clock: every note is a step on a 16th-note grid, worked out from the model (hits and
   clears, or state segments) by one function used both for the drawing and, through a lookahead scheduler
   (LOOKAHEAD seconds ahead of the clock), for the Web Audio synth, so what you see is what is scheduled.
   Every sound is synthesised (no audio files), the AudioContext is made on the first click of the Sound button, and
   window.__seek(t, which) only draws: it never plays audio. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585, LOOKAHEAD = .12;
  const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);

  /* ---------- tunable rules: slide 1 ---------- */
  const BPM = 132, S16 = 60 / BPM / 4, BAR = S16 * 16;
  const STYLE = { hit: 10, grace: 1.2, decay: 12, max: 100 };
  const RANKS = [
    { r: 'D', at: 0, name: 'Dismal', col: '#8b8fa8', adds: 'drums' },
    { r: 'C', at: 20, name: 'Crazy', col: '#2ea3dc', adds: 'bass' },
    { r: 'B', at: 40, name: 'Badass', col: '#2fae63', adds: 'lead' },
    { r: 'A', at: 60, name: 'Apocalyptic', col: '#e0a92d', adds: 'full kit' },
    { r: 'S', at: 80, name: 'Savage', col: '#e5322d', adds: 'vocal pad' },
  ];
  const STEMS = [
    { k: 'drums', name: 'Drums', col: '#3d4270', from: 0 }, { k: 'bass', name: 'Bass', col: '#2ea3dc', from: 1 },
    { k: 'lead', name: 'Lead', col: '#2fae63', from: 2 }, { k: 'vocal', name: 'Vocal pad', col: '#e5322d', from: 4 },
  ];
  const PROG = [{ root: 40, ch: [64, 67, 71] }, { root: 36, ch: [64, 67, 72] }, { root: 38, ch: [62, 66, 69] }, { root: 35, ch: [63, 66, 71] }];
  const BASSPAT = [0, 0, 12, 0, 7, 0, 10, 12];
  const LEAD = [[[0, 64, 2], [2, 67, 2], [4, 71, 4], [8, 69, 2], [10, 67, 2], [12, 64, 4]], [[0, 64, 2], [2, 67, 2], [4, 72, 4], [8, 71, 2], [10, 67, 2], [12, 64, 4]],
    [[0, 66, 2], [2, 69, 2], [4, 74, 4], [8, 72, 2], [10, 69, 2], [12, 66, 4]], [[0, 63, 2], [2, 66, 2], [4, 71, 6], [10, 69, 2], [12, 66, 4]]];
  const MOVES = ['Slash', 'Stab', 'High Time', 'Helm Breaker', 'Rising', 'Million Stab', 'Round Trip', 'Overdrive'];
  // the walk-through's fight: a burst of hits to S, a long idle while the stems drop, a second burst, then the room is clear
  const TOUR1 = (() => {
    const ev = [];
    for (let i = 0; i < 11; i++) ev.push({ t: 1 + i * .62, a: 'hit' });
    for (let i = 0; i < 11; i++) ev.push({ t: 17.6 + i * .5, a: 'hit' });
    ev.push({ t: 24, a: 'clear' });
    return ev;
  })();
  const DUR1 = 29;

  /* ---------- tunable rules: slide 2 ---------- */
  // each state: its track, what moves it on (input -> next state) and an optional timer that calms it down
  const FSM = {
    sneak: { mode: 'mgs', name: 'Sneaking', col: '#2ea3dc', on: { noise: 'suspicious', spotted: 'alert' } },
    suspicious: { mode: 'mgs', name: 'Suspicious', col: '#e0a92d', on: { spotted: 'alert', hide: 'sneak' }, timer: [4.5, 'sneak'] },
    alert: { mode: 'mgs', name: 'Alert', col: '#e5322d', on: { hide: 'suspicious' }, timer: [9, 'suspicious'] },
    ambient: { mode: 'botw', name: 'Ambience', col: '#2fae63', on: { spot: 'guardian' } },
    guardian: { mode: 'botw', name: 'Guardian', col: '#8a4fd6', on: { escape: 'ambient' } },
  };
  const STING = {
    'sneak>suspicious': { k: 'qmark', name: '“?” rising tone' }, 'sneak>alert': { k: 'bang', name: '“!” alert hit' }, 'suspicious>alert': { k: 'bang', name: '“!” alert hit' },
    'alert>suspicious': { k: 'evade', name: 'evasion swell' }, 'suspicious>sneak': { k: 'calm', name: 'all-clear chime' },
    'ambient>guardian': { k: 'dissonant', name: 'dissonant stinger' }, 'guardian>ambient': { k: 'escape', name: 'release' },
  };
  // a track: bpm, how long after the transition it starts (so the stinger speaks first), and its notes per 16th step
  const TRACKS = {
    sneak: { bpm: 84, delay: .45, what: 'slow and suspenseful', notes(k) {
      const s = k % 32, out = [];
      if (s % 8 === 0) out.push({ v: 'sub', f: NOTE(28), d: .5 });
      if (s % 8 === 4) out.push({ v: 'tick' });
      if (s === 0) out.push({ v: 'pad', f: [NOTE(52), NOTE(55), NOTE(59), NOTE(66)], d: 32 * 60 / 84 / 4 });
      if (s === 6 || s === 22) out.push({ v: 'bell', f: NOTE(s === 6 ? 78 : 76) });
      return out; } },
    suspicious: { bpm: 100, delay: .45, what: 'a quicker pulse, tremolo strings', notes(k) {
      const s = k % 16, out = [];
      if (s % 2 === 0) out.push({ v: 'pulse', f: NOTE(40) });
      if (s % 4 === 0) out.push({ v: 'tick' });
      if (s === 0) out.push({ v: 'trem', f: [NOTE(64), NOTE(67), NOTE(70)], d: 16 * 60 / 100 / 4 });
      return out; } },
    alert: { bpm: 168, delay: .5, what: 'intensely fast paced', notes(k) {
      const s = k % 16, out = [];
      if (s === 0 || s === 8 || s === 10) out.push({ v: 'kick' });
      if (s === 4 || s === 12) out.push({ v: 'snare' });
      if (s % 2 === 0) out.push({ v: 'hat' });
      if (s % 2 === 0) out.push({ v: 'bass', f: NOTE(40 + [0, 0, 3, 0, 5, 0, 6, 7][s / 2]) });
      if (s === 3 || s === 6 || s === 11 || s === 14) out.push({ v: 'brass', f: [NOTE(64), NOTE(67), NOTE(71)] });
      return out; } },
    ambient: { bpm: 70, delay: 1.2, what: 'sparse piano over wind and birds', notes(k) {
      const s = k % 32, out = [], P = [76, 79, 81, 84, 86, 88];
      if (s === 0 || s === 10 || s === 19 || s === 27) out.push({ v: 'piano', f: NOTE(P[(k * 7 + s) % 6]) });
      if (s === 0) out.push({ v: 'piano', f: NOTE(52) });
      return out; } },
    guardian: { bpm: 150, delay: 1.0, what: 'staccato, clashing piano', notes(k) {
      const s = k % 16, out = [];
      if (s % 2 === 0) out.push({ v: 'stab', f: [NOTE(s % 4 ? 73 : 72), NOTE(78)] });
      if (s % 4 === 0) out.push({ v: 'sub', f: NOTE(36), d: .25 });
      if (s === 7 || s === 15) out.push({ v: 'stab', f: [NOTE(85), NOTE(84)] });
      return out; } },
  };
  // the walk-through: noise, spotted, hide, calm by timer; then a Guardian interrupts the ambience
  const TOUR2_IN = [{ t: 0, a: 'mode:mgs' }, { t: 5, a: 'noise' }, { t: 8.5, a: 'spotted' }, { t: 14, a: 'hide' }, { t: 20, a: 'mode:botw' }, { t: 24.5, a: 'spot' }, { t: 30, a: 'escape' }];
  const DUR2 = 34;

  /* ---------- audio (self-contained: other sound pages carry their own) ---------- */
  const BUSES = ['drums', 'bass', 'lead', 'vocal', 'sfx', 'track', 'sting', 'amb'];
  const A = { ac: null, on: false, live: false, master: null, bus: {}, noise: null, shaper: null, ambGain: null };
  function audioInit() {
    if (A.ac) return;
    const ac = new (window.AudioContext || window.webkitAudioContext)(); A.ac = ac;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.connect(ac.destination);
    A.master = ac.createGain(); A.master.gain.value = 0; A.master.connect(comp);
    const lv = { drums: .5, bass: .45, lead: .3, vocal: .35, sfx: .45, track: .5, sting: .7, amb: 0 };
    BUSES.forEach(k => { const g = ac.createGain(); g.gain.value = lv[k]; g.connect(A.master); A.bus[k] = g; });
    const len = ac.sampleRate * 2, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.noise = buf;
    const curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; curve[i] = Math.tanh(x * 5); }
    A.shaper = curve;
    // ambience bed (wind), heard only in Breath of the Wild's exploration state
    const wind = ac.createBufferSource(); wind.buffer = buf; wind.loop = true; wind.playbackRate.value = .6;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 1.2;
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = .12; lg.gain.value = 200; lfo.connect(lg); lg.connect(bp.frequency); lfo.start();
    const wg = ac.createGain(); wg.gain.value = .9; wind.connect(bp); bp.connect(wg); wg.connect(A.bus.amb); wind.start();
  }
  function vca(t, a, d, peak, h = 0) {
    const g = A.ac.createGain(); g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a); if (h) g.gain.setValueAtTime(peak, t + a + h);
    g.gain.exponentialRampToValueAtTime(.0001, t + a + h + d); return g;
  }
  function osc(bus, t, type, f, a, d, peak, o = {}) {
    const ac = A.ac, h = o.h || 0, end = t + a + h + d + .05, s = ac.createOscillator(); s.type = type;
    s.frequency.setValueAtTime(f, t); if (o.f2) s.frequency.exponentialRampToValueAtTime(o.f2, t + a + h + d);
    if (o.det) s.detune.value = o.det;
    if (o.vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = o.vib; lg.gain.value = f * (o.vibD || .01); l.connect(lg); lg.connect(s.frequency); l.start(t); l.stop(end); }
    let node = s;
    if (o.shape) { const ws = ac.createWaveShaper(); ws.curve = A.shaper; node.connect(ws); node = ws; }
    if (o.lp) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(o.lp, t); if (o.lp2) fl.frequency.exponentialRampToValueAtTime(o.lp2, t + a + h + d); node.connect(fl); node = fl; }
    if (o.bp) { const fl = ac.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = o.bp; fl.Q.value = o.q || 2; node.connect(fl); node = fl; }
    const g = vca(t, a, d, peak, h);
    if (o.trem) { const tg = ac.createGain(), l = ac.createOscillator(), lg = ac.createGain(); tg.gain.value = .6; l.frequency.value = o.trem; lg.gain.value = .4; l.connect(lg); lg.connect(tg.gain); l.start(t); l.stop(end); node.connect(tg); node = tg; }
    node.connect(g); g.connect(A.bus[bus]); s.start(t); s.stop(end);
  }
  function noise(bus, t, ftype, f, q, a, d, peak) {
    const ac = A.ac, s = ac.createBufferSource(); s.buffer = A.noise;
    const fl = ac.createBiquadFilter(); fl.type = ftype; fl.frequency.value = f; fl.Q.value = q;
    const g = vca(t, a, d, peak); s.connect(fl); fl.connect(g); g.connect(A.bus[bus]); s.start(t, Math.random() * 1.5); s.stop(t + a + d + .05);
  }
  const chord = (bus, t, fs, fn) => fs.forEach((f, i) => fn(bus, t, f, i));
  const SYNTH = {
    // slide 1 stems
    kick(t) { const bus = 'drums'; osc(bus, t, 'sine', 140, .002, .2, .9, { f2: 42 }); },
    snare(t) { const bus = 'drums'; noise(bus, t, 'bandpass', 1900, .7, .002, .13, .7); osc(bus, t, 'triangle', 200, .002, .07, .25); },
    hat(t) { const bus = 'drums'; noise(bus, t, 'highpass', 7500, .7, .001, .04, .35); },
    crash(t) { const bus = 'drums'; noise(bus, t, 'highpass', 4500, .5, .002, 1.1, .4); },
    bass(t, e) { const bus = 'bass'; osc(bus, t, 'sawtooth', e.f, .004, e.d || .16, .45, { lp: 700 }); osc(bus, t, 'sine', e.f / 2, .004, e.d || .16, .3); },
    lead(t, e) { osc('lead', t, 'sawtooth', e.f, .006, .05, .22, { h: Math.max(.02, e.d - .06), shape: 1, lp: 2600, vib: 6, vibD: .006 }); osc('lead', t, 'square', e.f * 2, .006, .05, .04, { h: Math.max(.02, e.d - .06), lp: 3000 }); },
    vocal(t, e) { e.f.forEach((f, i) => { [-9, 9].forEach(det => osc('vocal', t, 'sawtooth', f, .25, .4, .05, { h: Math.max(.05, e.d - .65), bp: 900 + i * 260, q: 3, vib: 5, vibD: .008, det })); }); },
    // slide 1 effects
    slash(t) { noise('sfx', t, 'bandpass', 2600, 1.4, .01, .12, .8); osc('sfx', t + .05, 'square', 320, .001, .08, .2, { f2: 120, lp: 1800 }); },
    roomclear(t) { SYNTH.stemscut(t + .02); osc('sfx', t, 'sine', 90, .002, .9, .9, { f2: 35 }); noise('sfx', t, 'highpass', 4000, .5, .002, 1.6, .45); chord('sfx', t, [NOTE(52), NOTE(59), NOTE(64)], (b, tt, f) => osc(b, tt, 'sawtooth', f, .01, 1.4, .07, { lp: 1800, lp2: 400 })); },
    // slide 2 track voices
    sub(t, e) { osc('track', t, 'sine', e.f, .02, e.d || .5, .7); },
    tick(t) { noise('track', t, 'highpass', 6000, .8, .001, .03, .25); },
    pad(t, e) { e.f.forEach(f => osc('track', t, 'triangle', f, .8, 1.2, .08, { h: Math.max(.1, e.d - 2), vib: 4, vibD: .004 })); },
    bell(t, e) { osc('track', t, 'sine', e.f, .002, 1.2, .14); osc('track', t, 'sine', e.f * 2.76, .002, .4, .04); },
    pulse(t, e) { osc('track', t, 'sawtooth', e.f, .004, .14, .25, { lp: 500 }); },
    trem(t, e) { e.f.forEach(f => osc('track', t, 'sawtooth', f, .1, .3, .05, { h: Math.max(.1, e.d - .4), lp: 1800, trem: 11 })); },
    brass(t, e) { e.f.forEach(f => osc('track', t, 'sawtooth', f, .01, .12, .08, { lp: 2200, lp2: 700 })); },
    piano(t, e) { osc('track', t, 'triangle', e.f, .002, 1.4, .22); osc('track', t, 'sine', e.f * 2, .002, .5, .05); },
    stab(t, e) { e.f.forEach(f => { osc('track', t, 'triangle', f, .002, .12, .2); osc('track', t, 'square', f, .002, .06, .04, { lp: 3000 }); }); },
    // slide 2 stingers
    qmark(t) { osc('sting', t, 'sine', 420, .01, .5, .4, { f2: 880 }); noise('sting', t, 'highpass', 5000, .5, .4, .3, .2); },
    bang(t) { chord('sting', t, [NOTE(52), NOTE(64), NOTE(67), NOTE(71)], (b, tt, f) => osc(b, tt, 'sawtooth', f, .003, .5, .1, { lp: 3500, lp2: 600 })); noise('sting', t, 'lowpass', 1200, .6, .002, .3, .9); osc('sting', t, 'sine', 1760, .002, .6, .18); osc('sting', t, 'sine', 70, .002, .5, .8, { f2: 40 }); },
    evade(t) { osc('sting', t, 'sawtooth', 110, .4, .5, .15, { lp: 600, lp2: 2000 }); },
    calm(t) { [76, 72, 67].forEach((n, i) => osc('sting', t + i * .16, 'sine', NOTE(n), .003, .7, .2)); },
    dissonant(t) { [[0, [72, 73, 78]], [.18, [72, 73, 78]], [.36, [60, 61, 66, 67]]].forEach(([dt, ns]) => ns.forEach(n => { osc('sting', t + dt, 'triangle', NOTE(n), .002, .5, .18); osc('sting', t + dt, 'square', NOTE(n), .002, .1, .05, { lp: 4000 }); })); osc('sting', t + .36, 'sine', 55, .002, .8, .7, { f2: 38 }); },
    escape(t) { [69, 76].forEach((n, i) => osc('sting', t + i * .2, 'triangle', NOTE(n), .003, .9, .18)); },
    trackcut(t) { A.bus.track.gain.setTargetAtTime(0, t, .03); },
    trackon(t) { A.bus.track.gain.setTargetAtTime(.5, t, .01); },
    stemscut(t) { ['drums', 'bass', 'lead', 'vocal'].forEach(k => A.bus[k].gain.setTargetAtTime(0, t, .03)); },
    stemson(t) { const lv = { drums: .5, bass: .45, lead: .3, vocal: .35 }; Object.entries(lv).forEach(([k, v]) => A.bus[k].gain.setTargetAtTime(v, t, .005)); },
    bird(t, e) { [0, .09, .2].forEach((dt, i) => osc('amb', t + dt, 'sine', e.f * (1 + i * .12), .005, .06, .12, { f2: e.f * 1.4 })); },
  };
  const sndBtns = [];
  function setSound(on) {
    if (on) { audioInit(); A.ac.resume?.(); }
    A.on = on;
    sndBtns.forEach(b => { b.classList.toggle('on', on); b.textContent = on ? '♪ Sound on' : '♪ Sound off'; });
  }
  // the lookahead scheduler: everything in (st.sched, clock + LOOKAHEAD] goes to the audio clock, in step with the drawing
  function schedule(st, eventsIn) {
    if (!A.ac) return;
    const now = A.ac.currentTime;
    A.master.gain.setTargetAtTime(A.on && A.live ? .85 : 0, now, .05);
    if (!A.on || !A.live) { st.sched = st.t; return; }
    const from = st.sched, to = st.t + LOOKAHEAD;
    if (to <= from) return;
    for (const e of eventsIn(from, to)) { try { SYNTH[e.v](Math.max(now, now + e.t - st.t + .03), e); } catch (err) { if (!A.warned) { A.warned = 1; console.warn('synth', e.v, err); } } }
    st.sched = to;
  }

  /* ---------- small drawing helpers ---------- */
  function txt(g, s, x, y, size = 13, col = C.ink, weight = 600, align = 'left', disp) {
    g.font = `${weight} ${size}px ${disp ? 'Montserrat, Jost' : 'Jost'}, sans-serif`; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(s, x, y);
  }
  function box(g, x, y, w, h, fill = '#efe6d2', r = 12) { g.fillStyle = fill; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); }
  function rings(g, x, y, a, t, col, r0, r1, n = 3) {
    if (a <= .02) return;
    g.save(); g.strokeStyle = col; g.lineWidth = 2.5;
    for (let i = 0; i < n; i++) { const f = (t * 1.7 + i / n) % 1; g.globalAlpha = a * (1 - f) * .9; g.beginPath(); g.arc(x, y, lerp(r0, r1, f), 0, TAU); g.stroke(); }
    g.restore();
  }
  const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const card = g => { T.use(g); g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };

  /* ============ slide 1: style layers ============ */
  function styleAt(ev, t) {
    let v = 0, last = 0;
    for (const e of ev) {
      if (e.t > t) break;
      v = Math.max(0, v - STYLE.decay * Math.max(0, e.t - last - STYLE.grace));
      v = e.a === 'hit' ? Math.min(STYLE.max, v + STYLE.hit) : 0; last = e.t;
    }
    return Math.max(0, v - STYLE.decay * Math.max(0, t - last - STYLE.grace));
  }
  const rankOf = v => { let r = 0; RANKS.forEach((R, i) => { if (v >= R.at) r = i; }); return r; };
  // the music is off from a room clear until the bar after the next hit
  function musicOn(ev, t) {
    let on = true, clearAt = null;
    for (const e of ev) {
      if (e.t > t) break;
      if (e.a === 'clear') { on = false; clearAt = e.t; }
      else if (!on && e.a === 'hit') { const back = Math.ceil(e.t / BAR) * BAR; if (back <= t + 1e-9) on = true; else return false; }
    }
    return on;
  }
  function stepNotes(ev, k) {
    const t = k * S16; if (!musicOn(ev, t)) return [];
    const beat = Math.floor(k / 4) * 4 * S16, rank = rankOf(styleAt(ev, beat + 1e-6)), bar = Math.floor(k / 16), s = k % 16, P = PROG[bar % 4], out = [];
    const on = st => rank >= STEMS.find(x => x.k === st).from;
    if (s === 0 || s === 8 || (bar % 2 && s === 10)) out.push({ t, stem: 'drums', v: 'kick' });
    if (s === 4 || s === 12) out.push({ t, stem: 'drums', v: 'snare' });
    if (rank >= 3 || s % 2 === 0) out.push({ t, stem: 'drums', v: 'hat' });
    if (rank >= 3 && s === 0 && bar % 4 === 0) out.push({ t, stem: 'drums', v: 'crash' });
    if (on('bass') && s % 2 === 0) out.push({ t, stem: 'bass', v: 'bass', f: NOTE(P.root + BASSPAT[s / 2]), d: S16 * 1.6 });
    if (on('lead')) LEAD[bar % 4].forEach(([st, n, len]) => { if (st === s) out.push({ t, stem: 'lead', v: 'lead', f: NOTE(n + (rank >= 3 ? 0 : -12)), d: len * S16 * .92 }); });
    if (on('vocal') && s === 0) out.push({ t, stem: 'vocal', v: 'vocal', f: P.ch.map(n => NOTE(n - 12)), d: BAR });
    return out;
  }
  function styleEvents(ev, from, to, withHits) {
    const out = [];
    for (let k = Math.max(0, Math.floor(from / S16) + 1); k * S16 <= to; k++) if (k * S16 > from) {
      if (k > 0 && musicOn(ev, k * S16) && !musicOn(ev, (k - 1) * S16)) out.push({ t: k * S16 - .005, v: 'stemson' });
      out.push(...stepNotes(ev, k));
    }
    if (withHits) ev.forEach(e => { if (e.t > from && e.t <= to) out.push({ t: e.t, v: e.a === 'hit' ? 'slash' : 'roomclear' }); });
    else ev.forEach(e => { if (e.a === 'clear' && e.t > from && e.t <= to) out.push({ t: e.t, v: 'roomclear' }); });
    return out;
  }
  const VDUR = { kick: .25, snare: .18, hat: .06, crash: 1, bass: .2, lead: .3, vocal: BAR };
  function stemLevel(ev, stem, t) {
    let a = 0;
    for (let k = Math.floor(t / S16); k >= Math.max(0, Math.floor((t - BAR) / S16)); k--) for (const n of stepNotes(ev, k)) {
      if (n.stem !== stem) continue; const dt = t - n.t, d = n.v === 'vocal' ? BAR : (n.d || VDUR[n.v]) + .1; if (dt >= 0 && dt < d) a = Math.max(a, n.v === 'vocal' ? .8 : Math.exp(-2 * dt / d));
    }
    return a;
  }
  const FOES1 = [[120, 150], [380, 140], [330, 320]];
  const HERO1 = [240, 230];
  function drawArena(g, ev, t) {
    const X0 = 20, Y0 = 64, AW = 450, AH = 320;
    g.save(); g.beginPath(); g.roundRect(X0, Y0, AW, AH, 10); g.clip();
    T.floor(X0, Y0, AW, AH, .18);
    T.wall(X0, Y0, AW, 18); T.wall(X0, Y0 + AH - 18, AW, 18); T.wall(X0, Y0, 18, AH); T.wall(X0 + AW - 18, Y0, 18, AH);
    // the latest hit and the latest clear
    let lastHit = null, hitN = 0, lastClear = null, wave = 0;
    for (const e of ev) { if (e.t > t) break; if (e.a === 'hit') { lastHit = e; hitN++; } else { lastClear = e; wave++; } }
    const cleared = lastClear && (!lastHit || lastHit.t < lastClear.t);
    let hx = HERO1[0], hy = HERO1[1], face = -Math.PI / 2;
    FOES1.forEach(([fx, fy], i) => {
      let x = fx, y = fy, a = 1;
      const target = lastHit && (hitN - 1) % 3 === i, age = lastHit ? t - lastHit.t : 9;
      if (target && age < .35) { const k = Math.sin(clamp(age / .35) * Math.PI), dx = fx - HERO1[0], dy = fy - HERO1[1], dd = Math.hypot(dx, dy); x += dx / dd * 18 * k; y += dy / dd * 18 * k; }
      if (cleared) { a = 1 - clamp((t - lastClear.t) / .4); T.poof(x, y, t - lastClear.t, 26); }
      if (a > 0) T.foe(x, y, 22, Math.atan2(HERO1[1] - y, HERO1[0] - x), i === 1 ? '#8a4fd6' : C.red, { mark: i === 1 ? 'staff' : 'horns', a, edge: i === 1 ? '#5a2f9a' : C.redDk });
    });
    if (lastHit && t - lastHit.t < .4 && !cleared) {
      const [fx, fy] = FOES1[(hitN - 1) % 3], age = t - lastHit.t, k = age < .12 ? age / .12 : 1 - (age - .12) / .28;
      hx = lerp(HERO1[0], fx, .55 * clamp(k)); hy = lerp(HERO1[1], fy, .55 * clamp(k)); face = Math.atan2(fy - HERO1[1], fx - HERO1[0]);
      const mx = lerp(hx, fx, .6), my = lerp(hy, fy, .6);
      T.flash(mx, my, 60, 1 - age / .4);
      g.strokeStyle = '#fff'; g.lineWidth = 5; g.beginPath(); g.arc(hx, hy, 34, face - 1.1, face + 1.1); g.stroke();
      rings(g, mx, my, 1 - age / .4, t, C.gold, 10, 60, 2);
      T.popText(MOVES[(hitN - 1) % MOVES.length], fx, fy - 40 - age * 30, C.goldInk, 1 - age / .4);
    }
    T.player(hx, hy, face, 1);
    g.restore();
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(X0, Y0, AW, AH, 10); g.stroke();
    if (cleared) { const k = t - lastClear.t; T.stamp('ROOM CLEAR', X0 + AW / 2, Y0 + AH / 2, C.good, clamp(k / .2) * (1 - clamp((k - 3.2) / .4)), 30); if (k > .3) T.label('the music cuts out', X0 + AW / 2, Y0 + AH / 2 + 52, 'center', C.muted, 14); }
  }
  function drawMeter(g, v, rank, t, ev) {
    const x = 486, y = 64, w = 244, h = 320;
    box(g, x, y, w, h);
    txt(g, 'Style meter', x + 14, y + 24, 15, C.ink, 800, 'left', 1);
    const R = RANKS[rank], on = musicOn(ev, t);
    // the big letter
    g.save(); g.font = '800 120px Montserrat, Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    const pulse = 1 + .04 * Math.max(0, Math.cos((t / (S16 * 4)) * TAU));
    g.translate(x + 90, y + 160); g.scale(pulse, pulse);
    g.lineWidth = 8; g.strokeStyle = '#fffaf0'; g.strokeText(R.r, 0, 0); g.fillStyle = v > 0 ? R.col : C.muted; g.fillText(R.r, 0, 0); g.restore();
    txt(g, v > 0 ? R.name : on ? 'no style yet' : 'room clear', x + 90, y + 190, 16, v > 0 ? R.col : C.muted, 800, 'center', 1);
    txt(g, `${Math.round(v)} style points`, x + 90, y + 212, 13, C.muted, 600, 'center');
    // the ladder
    const lx = x + 186, ly = y + 44, lh = 250, lw = 32, toY = p => ly + lh - lh * p / 100;
    g.fillStyle = 'rgba(21,32,68,.12)'; g.fillRect(lx, ly, lw, lh);
    RANKS.forEach((Rk, i) => {
      const y0 = toY(Rk.at), y1 = toY(RANKS[i + 1]?.at ?? 100);
      g.fillStyle = Rk.col; g.globalAlpha = rank >= i && v > 0 ? .9 : .18; g.fillRect(lx, y1, lw, y0 - y1); g.globalAlpha = 1;
      txt(g, Rk.r, lx - 8, (y0 + y1) / 2 + 5, 14, rank === i ? C.ink : C.muted, 800, 'right', 1);
    });
    g.fillStyle = C.navy; g.fillRect(lx - 4, toY(v) - 2, lw + 8, 4);
    // idle drain hint
    let lastHit = null; for (const e of ev) { if (e.t > t) break; if (e.a === 'hit') lastHit = e.t; }
    const idle = lastHit != null ? t - lastHit : 0;
    if (lastHit != null && idle > STYLE.grace && v > 0) txt(g, '▼ idle: draining', x + 90, y + 240, 13, C.red, 700, 'center');
    if (!on) txt(g, 'music cut', x + 90, y + 240, 13, C.muted, 700, 'center');
    txt(g, `beat ${Math.floor(t / (S16 * 4)) % 4 + 1} · bar ${Math.floor(t / BAR) + 1}`, x + 90, y + 300, 12, C.muted, 600, 'center');
    for (let i = 0; i < 4; i++) { const lit = Math.floor(t / (S16 * 4)) % 4 === i; g.fillStyle = lit ? C.gold : 'rgba(93,97,140,.3)'; g.beginPath(); g.arc(x + 63 + i * 18, y + 270, lit ? 6 : 4, 0, TAU); g.fill(); }
  }
  function drawStack(g, ev, rank, v, t) {
    const x = 746, y = 64, w = 274, h = 320, on = musicOn(ev, t);
    box(g, x, y, w, h);
    txt(g, 'What is playing', x + 14, y + 24, 15, C.ink, 800, 'left', 1);
    STEMS.slice().reverse().forEach((S, j) => {
      const yy = y + 42 + j * 64, act = on && rank >= S.from, lvl = stemLevel(ev, S.k, t);
      box(g, x + 10, yy, w - 20, 54, act ? 'rgba(255,252,244,.98)' : 'rgba(255,252,244,.45)', 8);
      if (act) { g.strokeStyle = S.col; g.lineWidth = 3; g.beginPath(); g.roundRect(x + 10, yy, w - 20, 54, 8); g.stroke(); }
      txt(g, S.name, x + 22, yy + 22, 15, act ? C.ink : C.muted, 800, 'left', 1);
      const from = RANKS[S.from].r;
      txt(g, act ? (S.k === 'drums' && rank >= 3 ? 'in · full kit from A' : `in · enters at ${from}`) : !on ? 'cut: the room is clear' : `waits for rank ${from}`, x + 22, yy + 42, 12, act ? S.col : C.muted, 700);
      // the level bar
      g.fillStyle = 'rgba(21,32,68,.12)'; g.fillRect(x + w - 70, yy + 12, 48, 30);
      for (let b = 0; b < 6; b++) { const lit = act && lvl > b / 6; g.fillStyle = lit ? S.col : 'rgba(93,97,140,.18)'; g.fillRect(x + w - 68 + b * 8, yy + 40 - (b + 1) * 4.5, 6, (b + 1) * 4.5); }
    });
  }
  function drawLanes(g, ev, t) {
    const x = 20, y = 398, w = 1000, h = 168, lx = x + 110, lw = w - 120, span = BAR * 2.5, t0 = t - span * .7, toX = tt => lx + lw * (tt - t0) / span;
    box(g, x, y, w, h);
    txt(g, 'Stems on the beat clock · four lanes, one loop, always in sync', x + 14, y + 20, 13, C.ink, 800, 'left', 1);
    // bar and beat lines
    for (let k = Math.ceil(t0 / (S16 * 4)); k * S16 * 4 < t0 + span; k++) { const xx = toX(k * S16 * 4), barL = k % 4 === 0; g.fillStyle = barL ? 'rgba(21,32,68,.35)' : 'rgba(21,32,68,.12)'; g.fillRect(xx, y + 30, barL ? 2 : 1, h - 38); }
    const LH = 30;
    const notes = []; for (let k = Math.max(0, Math.ceil(t0 / S16)); k * S16 < t0 + span; k++) notes.push(...stepNotes(ev, k));
    STEMS.forEach((S, i) => {
      const ly = y + 32 + i * (LH + 3);
      g.fillStyle = 'rgba(255,252,244,.85)'; g.fillRect(lx, ly, lw, LH);
      txt(g, S.name, x + 14, ly + 20, 13, S.col, 800);
      notes.filter(n => n.stem === S.k).forEach(n => {
        const xx = toX(n.t), past = n.t <= t, played = past && t - n.t < .12;
        let yy = ly + 4, hh = LH - 8, ww = Math.max(3, lw * (n.d || S16 * .7) / span);
        if (n.v === 'kick') { yy = ly + LH - 10; hh = 7; } else if (n.v === 'snare') { yy = ly + 10; hh = 8; } else if (n.v === 'hat' || n.v === 'crash') { yy = ly + 3; hh = 4; ww = n.v === 'crash' ? 30 : 3; }
        else if (n.f && n.v !== 'vocal') { const m = 12 * Math.log2(n.f / 440) + 69; yy = ly + LH - 7 - clamp((m - (S.k === 'bass' ? 30 : 50)) / 30) * (LH - 10); hh = 5; }
        const cut = ev.find(e => e.a === 'clear' && e.t > n.t); if (cut) ww = Math.min(ww, toX(cut.t) - xx);
        g.fillStyle = played ? C.gold : S.col; g.globalAlpha = past ? 1 : .35; g.fillRect(xx, yy, Math.min(ww, lx + lw - xx), hh); g.globalAlpha = 1;
      });
    });
    g.fillStyle = C.red; g.fillRect(toX(t) - 1, y + 28, 2, h - 34);
    txt(g, 'now', toX(t), y + 26, 11, C.red, 700, 'center');
  }
  function drawStyle(g, ev, t) {
    card(g);
    const v = styleAt(ev, t), rank = rankOf(v);
    txt(g, 'Devil May Cry V · the score rises with your style rank', 22, 30, 17, C.ink, 800, 'left', 1);
    txt(g, '“Guitars, synths and vocal layers… as the player’s rank rises from C all the way to S”', 22, 52, 13, C.muted, 500);
    txt(g, 'stems are drawn as they play', W - 20, 30, 12, C.muted, 600, 'right');
    drawArena(g, ev, t); drawMeter(g, v, rank, t, ev); drawStack(g, ev, rank, v, t); drawLanes(g, ev, t);
  }

  /* ============ slide 2: state changes ============ */
  // turns inputs into state segments (with the calm-down timers), the one source for drawing and audio
  function simulate(inputs, end) {
    const segs = []; let cur = null;
    const push = (t, state, from) => { cur = { t, state, from, sting: from ? STING[from + '>' + state] : null }; segs.push(cur); };
    const ins = inputs.slice().sort((a, b) => a.t - b.t);
    const timersTo = lim => { while (cur && FSM[cur.state].timer && cur.t + FSM[cur.state].timer[0] <= lim) { const [d, nx] = FSM[cur.state].timer; push(cur.t + d, nx, cur.state); } };
    for (const i of ins) {
      if (i.t > end) break;
      timersTo(i.t);
      if (i.a.startsWith('mode:')) { push(i.t, i.a === 'mode:mgs' ? 'sneak' : 'ambient', null); continue; }
      const nx = cur && FSM[cur.state].on[i.a]; if (nx && nx !== cur.state) push(i.t, nx, cur.state);
    }
    timersTo(end);
    return segs;
  }
  const segAt = (segs, t) => { let s = segs[0]; for (const x of segs) { if (x.t <= t) s = x; else break; } return s; };
  function trackEvents(segs, from, to) {
    const out = [];
    segs.forEach((s, i) => {
      const end = segs[i + 1] ? segs[i + 1].t : Infinity, TR = TRACKS[s.state], st16 = 60 / TR.bpm / 4, t0 = s.t + TR.delay;
      if (s.sting && s.t > from && s.t <= to) out.push({ t: s.t, v: s.sting.k, sting: 1 });
      if (s.t > from && s.t <= to) out.push({ t: s.t, v: 'trackcut', ctl: 1 });
      if (s.t + TR.delay > from && s.t + TR.delay <= to) out.push({ t: s.t + TR.delay - .01, v: 'trackon', ctl: 1 });
      if (end <= from || s.t > to) return;
      for (let k = Math.max(0, Math.floor((from - t0) / st16)); ; k++) {
        const tt = t0 + k * st16; if (tt >= end || tt > to) break;
        if (tt > from) TR.notes(k).forEach(n => out.push({ ...n, t: tt, state: s.state, end }));
      }
      if (s.state === 'ambient') for (let k = Math.floor(Math.max(from, s.t) / .5); k * .5 <= Math.min(to, end); k++) { const tt = k * .5; if (tt > from && tt > s.t + .3 && hash(k) < .22) out.push({ t: tt, v: 'bird', f: 2400 + hash(k + 5) * 1600, amb: 1 }); }
    });
    return out.sort((a, b) => a.t - b.t);
  }
  const NOISE_AT = [150, 300];
  function anchors(seg, t) {
    // player and guard targets for each state, inside the 450x320 scene at (20,64)
    const state = seg.state;
    if (state === 'ambient' && seg.from === 'guardian') return { p: [118, 252], g: [340, 150] };
    switch (state) {
      case 'sneak': return { p: [120 + 60 * Math.sin(t * .6), 345], g: [290 + 120 * Math.cos(t * .35), 190 + 55 * Math.sin(t * .35)] };
      case 'suspicious': return { p: [210, 348], g: [175, 250] };
      case 'alert': return { p: [340 + 55 * Math.cos(t * 2.2), 320 + 22 * Math.sin(t * 2.2)], g: [310 + 25 * Math.cos(t * 2.2 - .8), 215 + 15 * Math.sin(t * 2.2 - .8)] };
      case 'ambient': return { p: [130 + 50 * Math.sin(t * .5), 300], g: [340, 150] };
      default: return { p: [210 + 50 * Math.sin(t * 2.6), 310 + 12 * Math.cos(t * 3.1)], g: [340, 150] };
    }
  }
  function posAt(segs, t, who, depth = 0) {
    const i = segs.indexOf(segAt(segs, t)), s = segs[i], tgt = anchors(s, t)[who];
    if (i <= 0 || depth > 6 || FSM[segs[i - 1].state].mode !== FSM[s.state].mode) return tgt;
    const prev = posAt(segs, s.t - 1e-3, who, depth + 1), k = ease(clamp((t - s.t) / 1.2));
    return [lerp(prev[0], tgt[0], k), lerp(prev[1], tgt[1], k)];
  }
  function drawStealthScene(g, segs, t) {
    const X0 = 20, Y0 = 64, AW = 450, AH = 320, s = segAt(segs, t), F = FSM[s.state], age = t - s.t;
    g.save(); g.beginPath(); g.roundRect(X0, Y0, AW, AH, 10); g.clip();
    const P = posAt(segs, t, 'p'), G = posAt(segs, t, 'g'), Gn = posAt(segs, t + .05, 'g');
    if (F.mode === 'mgs') {
      T.floor(X0, Y0, AW, AH, .22);
      T.wall(X0, Y0, AW, 18); T.wall(X0, Y0 + AH - 18, AW, 18); T.wall(X0, Y0, 18, AH); T.wall(X0 + AW - 18, Y0, 18, AH);
      T.pillar(182, 272, 56, 56); T.pillar(380, 130, 50, 50); T.pillar(80, 130, 50, 50);
      let face = Math.atan2(Gn[1] - G[1], Gn[0] - G[0]);
      if (s.state === 'suspicious') face = Math.atan2(NOISE_AT[1] - G[1], NOISE_AT[0] - G[0]) + .5 * Math.sin(t * 1.6);
      if (s.state === 'alert') face = Math.atan2(P[1] - G[1], P[0] - G[0]);
      T.cone(G[0], G[1], face, .5, 150, 1, s.state === 'alert' ? '229,50,45' : s.state === 'suspicious' ? '224,169,45' : '85,98,235');
      if (s.state === 'suspicious' && s.from === 'sneak' && age < 1.2) rings(g, NOISE_AT[0], NOISE_AT[1], 1 - age / 1.2, t, C.muted, 8, 50, 2);
      T.foe(G[0], G[1], 20, face, '#7a8a5a', { edge: '#4a5a2a', mark: 'scope' });
      T.player(P[0], P[1], s.state === 'alert' ? 2.2 * t + Math.PI : 0, .85);
      const mark = s.state === 'alert' ? '!' : s.state === 'suspicious' ? '?' : '';
      if (mark) T.popText(mark, G[0], G[1] - 38 - 6 * Math.sin(Math.min(age, .3) * 10), s.state === 'alert' ? C.red : C.goldInk, 1);
    } else {
      g.fillStyle = '#b8c98e'; g.fillRect(X0, Y0, AW, AH);
      for (let i = 0; i < 90; i++) { const x = X0 + hash(i) * AW, y = Y0 + hash(i + 50) * AH, sw = Math.sin(t * 1.5 + i) * 3; g.strokeStyle = 'rgba(70,110,50,.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + sw, y - 9); g.stroke(); }
      T.pillar(100, 200, 52, 44);
      [[60, 100], [420, 330], [250, 90]].forEach(([x, y]) => { T.shadow(x + 6, y + 8, 30, 22); g.fillStyle = '#5f8a46'; g.beginPath(); g.arc(x, y, 28, 0, TAU); g.fill(); g.fillStyle = '#76a35a'; g.beginPath(); g.arc(x - 7, y - 7, 15, 0, TAU); g.fill(); });
      // the Guardian: legs, dome, eye
      const [gx, gy] = G, hunt = s.state === 'guardian';
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.sin(t * 2 + i) * .1; g.fillStyle = '#6e6a63'; g.beginPath(); g.arc(gx + Math.cos(a) * 40, gy + Math.sin(a) * 30 + 8, 8, 0, TAU); g.fill(); }
      T.shadow(gx + 4, gy + 10, 40, 30);
      g.fillStyle = '#9a9488'; g.strokeStyle = '#4e4a44'; g.lineWidth = 3; g.beginPath(); g.arc(gx, gy, 32, 0, TAU); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(78,74,68,.6)'; g.lineWidth = 2; g.beginPath(); g.arc(gx, gy, 20, 0, TAU); g.stroke();
      const look = hunt ? Math.atan2(P[1] - gy, P[0] - gx) : Math.PI * .75 + Math.sin(t * .6) * .9;
      if (!hunt) T.cone(gx, gy, look, .3, 170, .7, '87,182,255');
      g.fillStyle = hunt ? C.red : '#57b6ff'; g.beginPath(); g.arc(gx + Math.cos(look) * 16, gy + Math.sin(look) * 16, 7, 0, TAU); g.fill();
      if (hunt && age > .3) T.laser(gx + Math.cos(look) * 16, gy + Math.sin(look) * 16, P[0], P[1], .5 + .5 * Math.sin(t * 20));
      T.player(P[0], P[1], hunt ? look + Math.PI : 0, .85);
      if (s.state === 'ambient') { for (let i = 0; i < 3; i++) { const k = (t * .4 + i / 3) % 1; txt(g, '~', X0 + 40 + ((t * 30 + i * 150) % AW), Y0 + 40 + i * 90, 22, `rgba(93,97,140,${.6 * (1 - Math.abs(k - .5) * 2)})`, 700); } }
    }
    // stinger rings at the moment of the transition
    if (s.sting && age < 1.2) { rings(g, G[0], G[1], 1 - age / 1.2, t, FSM[s.state].col, 24, 140, 3); T.label(s.sting.name, G[0], G[1] + 50, 'center', FSM[s.state].col, 13); }
    g.restore();
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(X0, Y0, AW, AH, 10); g.stroke();
  }
  const NODES = {
    sneak: [570, 270], suspicious: [755, 150], alert: [940, 270],
    ambient: [600, 220], guardian: [910, 220],
  };
  const EDGES = {
    mgs: [['sneak', 'suspicious', 'noise', 1], ['suspicious', 'alert', 'spotted', 1], ['sneak', 'alert', 'spotted', 0], ['alert', 'suspicious', 'hide or 9 s', 1], ['suspicious', 'sneak', 'calm, 4.5 s', 1]],
    botw: [['ambient', 'guardian', 'spotted', 1], ['guardian', 'ambient', 'hide', 1]],
  };
  function arrow(g, a, b, bend, lit, label, col) {
    const [x0, y0] = NODES[a], [x1, y1] = NODES[b], mx = (x0 + x1) / 2, my = (y0 + y1) / 2, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy);
    const nx = -dy / L, ny = dx / L, off = bend * 34, cx = mx + nx * off, cy = my + ny * off;
    // trim to the node boxes
    const tr = (px, py, qx, qy) => { const d = Math.hypot(qx - px, qy - py), k = 62 / d; return [px + (qx - px) * k, py + (qy - py) * k]; };
    const [sx, sy] = tr(x0, y0, cx, cy), [ex, ey] = tr(x1, y1, cx, cy);
    g.strokeStyle = lit ? col : 'rgba(93,97,140,.55)'; g.lineWidth = lit ? 4 : 2; g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(cx, cy, ex, ey); g.stroke();
    const ang = Math.atan2(ey - cy, ex - cx); g.fillStyle = g.strokeStyle; g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex - 12 * Math.cos(ang - .45), ey - 12 * Math.sin(ang - .45)); g.lineTo(ex - 12 * Math.cos(ang + .45), ey - 12 * Math.sin(ang + .45)); g.closePath(); g.fill();
    const lxp = .25 * sx + .5 * cx + .25 * ex, lyp = .25 * sy + .5 * cy + .25 * ey;
    T.label(label, lxp + nx * 12 * Math.sign(bend || 1), lyp + ny * 12 * Math.sign(bend || 1), 'center', lit ? col : C.muted, 12);
  }
  function drawDiagram(g, segs, t) {
    const x = 486, y = 64, w = 534, h = 320, s = segAt(segs, t), mode = FSM[s.state].mode, age = t - s.t;
    box(g, x, y, w, h);
    txt(g, mode === 'mgs' ? 'Metal Gear Solid · one track per state' : 'Breath of the Wild · ambience, interrupted', x + 14, y + 24, 15, C.ink, 800, 'left', 1);
    EDGES[mode].forEach(([a, b, lab, bend]) => arrow(g, a, b, bend, s.from === a && s.state === b && age < 2.5, lab, FSM[b].col));
    Object.entries(FSM).forEach(([k, F]) => {
      if (F.mode !== mode) return;
      const [nx, ny] = NODES[k], act = s.state === k, bw = 124, bh = 62;
      box(g, nx - bw / 2, ny - bh / 2, bw, bh, act ? F.col : 'rgba(255,252,244,.95)', 12);
      g.strokeStyle = F.col; g.lineWidth = 3; g.beginPath(); g.roundRect(nx - bw / 2, ny - bh / 2, bw, bh, 12); g.stroke();
      if (act) rings(g, nx, ny, .5, t * .6, F.col, 66, 90, 2);
      txt(g, F.name, nx, ny - 4, 16, act ? '#fff' : C.ink, 800, 'center', 1);
      txt(g, `${TRACKS[k].bpm} bpm`, nx, ny + 16, 12, act ? '#fff' : C.muted, 700, 'center');
    });
    const TR = TRACKS[s.state];
    txt(g, `Now: ${FSM[s.state].name.toLowerCase()} track, ${TR.what}`, x + 14, y + h - 40, 14, FSM[s.state].col, 800);
    txt(g, s.sting ? `Last change: ${FSM[s.from].name} → ${FSM[s.state].name} · stinger: ${s.sting.name}` : 'No change yet: trigger one with the buttons', x + 14, y + h - 18, 13, C.ink, 500);
  }
  function drawTrackLanes(g, segs, t) {
    const x = 20, y = 398, w = 1000, h = 168, lx = x + 110, lw = w - 120, span = 14, t0 = t - span * .72, toX = tt => lx + lw * (tt - t0) / span;
    box(g, x, y, w, h);
    txt(g, 'What you hear over time', x + 14, y + 20, 13, C.ink, 800, 'left', 1);
    const lanes = [['Track', y + 32, 46], ['Stinger', y + 84, 34], ['Ambience', y + 124, 34]];
    lanes.forEach(([n, ly, lh]) => { g.fillStyle = 'rgba(255,252,244,.85)'; g.fillRect(lx, ly, lw, lh); txt(g, n, x + 14, ly + lh / 2 + 5, 13, C.ink, 800); });
    g.save(); g.beginPath(); g.rect(lx, y, lw, h); g.clip();
    segs.forEach((s, i) => {
      const end = segs[i + 1] ? segs[i + 1].t : t0 + span + 1, F = FSM[s.state];
      g.fillStyle = F.col; g.globalAlpha = .18; g.fillRect(toX(s.t), y + 32, toX(end) - toX(s.t), 46); g.globalAlpha = 1;
      if (s.t > t0) txt(g, F.name, toX(s.t) + 4, y + 44, 11, F.col, 800);
      if (s.state === 'ambient') { g.fillStyle = F.col; g.globalAlpha = .3; g.fillRect(toX(s.t), y + 124, toX(end) - toX(s.t), 34); g.globalAlpha = 1; txt(g, 'wind + birds', Math.max(toX(s.t), lx) + 6, y + 145, 11, C.good, 700); }
      if (s.sting) {
        const sx = toX(s.t), lit = t >= s.t && t - s.t < 1;
        g.fillStyle = lit ? C.gold : FSM[s.state].col; g.beginPath(); g.moveTo(sx, y + 88); g.lineTo(sx + 9, y + 101); g.lineTo(sx, y + 114); g.lineTo(sx - 9, y + 101); g.closePath(); g.fill();
        txt(g, s.sting.name, sx + 13, y + 106, 11, C.ink, 700);
        if (s.sting.k === 'dissonant') { g.strokeStyle = C.red; g.lineWidth = 2; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(sx, y + 124); g.lineTo(sx, y + 158); g.stroke(); g.setLineDash([]); txt(g, 'cut', sx + 4, y + 156, 11, C.red, 700); }
      }
    });
    trackEvents(segs, t0, t0 + span).forEach(n => {
      if (n.sting || n.ctl) return;
      const xx = toX(n.t), past = n.t <= t, F = n.state ? FSM[n.state] : FSM.ambient;
      g.globalAlpha = past ? 1 : .35;
      if (n.amb) { g.fillStyle = C.good; g.beginPath(); g.arc(xx, y + 134, 3, 0, TAU); g.fill(); }
      else { const m = n.f ? 12 * Math.log2((Array.isArray(n.f) ? n.f[0] : n.f) / 440) + 69 : 40, yy = y + 74 - clamp((m - 24) / 64) * 30; g.fillStyle = past && t - n.t < .12 ? C.gold : F.col; g.fillRect(xx, yy, n.v === 'pad' || n.v === 'trem' ? Math.min(lw * (n.d || 1) / span, toX(n.end) - xx) : 3, n.v === 'pad' || n.v === 'trem' ? 4 : 6); }
      g.globalAlpha = 1;
    });
    g.restore();
    g.fillStyle = C.red; g.fillRect(toX(t) - 1, y + 28, 2, h - 34);
    txt(g, 'now', toX(t), y + 26, 11, C.red, 700, 'center');
  }
  function drawStealth(g, segs, t) {
    card(g);
    const s = segAt(segs, t), mode = FSM[s.state].mode;
    txt(g, mode === 'mgs' ? 'Metal Gear Solid · “slow and suspenseful” until you are spotted' : 'Breath of the Wild · a Guardian interrupts the ambience', 22, 30, 17, C.ink, 800, 'left', 1);
    txt(g, 'Music “notifies players about changes in gameplay states”', 22, 52, 13, C.muted, 500);
    txt(g, 'every stinger and track is drawn as it plays', W - 20, 30, 12, C.muted, 600, 'right');
    drawStealthScene(g, segs, t); drawDiagram(g, segs, t); drawTrackLanes(g, segs, t);
  }

  /* ---------- wiring ---------- */
  const scenes = {};
  const live = { enter() { A.live = true; }, leave() { A.live = false; if (A.ac) A.master.gain.setTargetAtTime(0, A.ac.currentTime, .03); } };
  canvasDemo('rm-style', (sl, cv, g) => {
    const st = { t: 0, sched: 0, tour: true, held: false, ev: [], key: '' };
    const tourBtn = $(sl, '.rm-tour'), snd = $(sl, '.rm-snd');
    sndBtns.push(snd); snd.onclick = () => setSound(!A.on); setSound(A.on);
    const evNow = () => st.tour ? TOUR1 : st.ev;
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.ev = TOUR1.filter(e => e.t <= st.t); } };
    const hit = () => {
      manual(); st.ev.push({ t: st.t, a: 'hit' });
      if (A.ac && A.on && A.live) SYNTH.slash(A.ac.currentTime);
    };
    $(sl, '.rm-hit').onclick = hit; cv.addEventListener('click', hit); cv.style.cursor = 'pointer';
    $(sl, '.rm-clear').onclick = () => { manual(); st.ev.push({ t: st.t, a: 'clear' }); if (A.ac && A.on && A.live) SYNTH.roomclear(A.ac.currentTime); st.sched = Math.max(st.sched, st.t); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.sched = 0; tourBtn.classList.add('on'); };
    function info(ev, t) {
      const v = styleAt(ev, t), r = rankOf(v), on = musicOn(ev, t), n = on ? STEMS.filter(S => r >= S.from).length : 0, key = [r, on, n].join();
      if (key === st.key) return; st.key = key;
      say($(sl, '.rm-stats'), `<div class="${r >= 4 ? 'r' : r >= 2 ? 'y' : ''}"><b>${RANKS[r].r}</b><span>${RANKS[r].name} · ${Math.round(v)} style</span></div><div class="${on ? 'g' : ''}"><b>${n}/4</b><span>${on ? 'stems playing' : 'music cut: room clear'}</span></div>`);
      say($(sl, '.rm-out'), !on ? 'The room is clear and the music cuts out, as Devil May Cry V does. The next hit brings the loop back on the next bar.'
        : r >= 4 ? 'S rank: the vocal layer is in and every stem plays. Stop hitting and watch it fall away, one rank at a time.'
        : `Rank ${RANKS[r].r}. ${r < 4 ? `Next: ${RANKS[r + 1].adds} at ${RANKS[r + 1].r}.` : ''} Each change waits for the next beat, so the stems never drift apart.`);
    }
    scenes.style = { seek(t) { st.held = true; drawStyle(g, TOUR1, t); info(TOUR1, t); }, dur: () => DUR1 };
    return dt => {
      if (st.held) return;
      st.t += dt;
      if (st.tour && st.t >= DUR1) { st.t -= DUR1; st.sched = st.t; }
      const ev = evNow();
      schedule(st, (a, b) => styleEvents(ev, a, b, st.tour).map(e => ({ ...e })));
      drawStyle(g, ev, st.t); info(ev, st.t);
    };
  }, live);

  const TOUR2 = simulate(TOUR2_IN, DUR2);
  canvasDemo('rm-stealth', (sl, cv, g) => {
    const st = { t: 0, sched: 0, tour: true, held: false, inputs: [], segs: TOUR2, simEnd: 0, key: '' };
    const tourBtn = $(sl, '.rm-tour'), snd = $(sl, '.rm-snd'), modeBtns = $$(sl, '.rm-mode .btn'), acts = $$(sl, '.rm-acts');
    sndBtns.push(snd); snd.onclick = () => setSound(!A.on); setSound(A.on);
    const resim = () => { st.simEnd = st.t + 60; st.segs = simulate(st.inputs, st.simEnd); };
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.inputs = TOUR2_IN.filter(i => i.t <= st.t); } };
    const playNow = seg => { if (seg && seg.sting && A.ac && A.on && A.live) SYNTH[seg.sting.k](A.ac.currentTime); };
    const input = a => {
      manual(); const before = segAt(simulate(st.inputs, st.t), st.t);
      st.inputs.push({ t: st.t, a }); resim();
      const after = segAt(st.segs, st.t); if (after !== before && after.t === st.t) { playNow(after); if (A.ac && A.on && A.live) { SYNTH.trackcut(A.ac.currentTime); SYNTH.trackon(A.ac.currentTime + TRACKS[after.state].delay - .01); } }
      st.sched = Math.max(st.sched, st.t);
    };
    modeBtns.forEach(b => b.onclick = () => { manual(); st.inputs.push({ t: st.t, a: 'mode:' + b.dataset.m }); resim(); });
    $$(sl, '.rm-acts .btn').forEach(b => b.onclick = () => input(b.dataset.a));
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.sched = 0; st.segs = TOUR2; tourBtn.classList.add('on'); };
    function info(segs, t) {
      const s = segAt(segs, t), F = FSM[s.state], key = s.state + s.t;
      modeBtns.forEach(b => b.classList.toggle('on', b.dataset.m === F.mode));
      acts.forEach(a => { a.hidden = a.dataset.m !== F.mode; });
      $$(sl, '.rm-acts .btn').forEach(b => { b.disabled = !F.on[b.dataset.a]; });
      if (key === st.key) return; st.key = key;
      say($(sl, '.rm-stats'), `<div class="${s.state === 'alert' ? 'r' : s.state === 'suspicious' ? 'y' : s.state === 'guardian' ? 'r' : 'g'}"><b>${TRACKS[s.state].bpm}</b><span>bpm · ${F.name.toLowerCase()} track</span></div>`);
      say($(sl, '.rm-out'), {
        sneak: 'Sneaking: slow and suspenseful. A noise makes the guard suspicious; being seen sets off the alert.',
        suspicious: 'Suspicious: a “?” stinger and a quicker, tenser track. Stay hidden and it calms back down after 4.5 s.',
        alert: 'Alert: the “!” hit, then the track turns “intensely fast paced”. You know you were spotted before you see the guard turn.',
        ambient: 'Ambience: wind, birds and a few piano notes. Nothing here asks anything of you.',
        guardian: 'A Guardian locks on: the ambience is cut by a dissonant stinger, then clashing piano. The music says danger before the laser lands.',
      }[s.state]);
    }
    scenes.stealth = { seek(t) { st.held = true; drawStealth(g, TOUR2, t); info(TOUR2, t); }, dur: () => DUR2 };
    return dt => {
      if (st.held) return;
      st.t += dt;
      if (st.tour && st.t >= DUR2) { st.t -= DUR2; st.sched = st.t; }
      if (!st.tour && st.t > st.simEnd - 20) resim();
      const s = segAt(st.segs, st.t);
      if (A.ac) A.bus.amb.gain.setTargetAtTime(A.on && A.live && s.state === 'ambient' ? .45 : 0, A.ac.currentTime, s.state === 'ambient' ? .6 : .01);
      schedule(st, (a, b) => trackEvents(st.segs, a, b).filter(e => st.tour || !e.sting || e.t > st.t - .001));
      drawStealth(g, st.segs, st.t); info(st.segs, st.t);
    };
  }, live);

  window.__seek = (t, which = 'style') => scenes[which].seek(t);
  window.__dur = (which = 'style') => scenes[which].dur();
})();
