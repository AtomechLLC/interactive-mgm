/* Same scene, four rules (Module 7, Sound Design, slides 18-46).
   One small top-down courtyard in the rain: the hero walks in, picks up three coins, an enemy winds up (a growl, the
   cue that matters), lunges and is parried, two more coins, then the door opens and the level is clear. It loops every
   TL.cyc seconds. Every sound is synthesised with the Web Audio API (no audio files), and every sound is also drawn:
   rings at the source in the scene, rain streaks whose density follows the rain's level, and a mixer with one live
   level bar per source, so the page (and its silent GIFs) reads without sound.
   The same scene is mixed four ways, one slide per rule:
     1 focus     equal faders (mush) vs a focus mix that ducks rain, wind, music and steps under the enemy cue
     2 stinger   the parry as a clash alone vs clash + drum and chord stinger (Sekiro)
     3 identity  three soundtrack presets: aggressive (Doom Eternal), serene (Animal Crossing: New Leaf), no music (Limbo)
     4 reward    coin chime per coin (micro, Candy Crush) and a level-clear jingle (macro, Super Mario Bros. 3)
   The tunable rules are the const tables right below: TL (scene timing), MIX (fader levels per mix, in dB), DUCK
   (the focus ducking), PRESETS (the three identities) and ENV (how long each sound rings, which drives the drawing).
   Everything visible is a pure function of the scene time t and the settings, so window.__seek(t, which) is
   deterministic. Audio is scheduled only by the live loop (a short lookahead over the same event list), never by
   __seek, and the AudioContext is created on the first click of the Sound button. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585;

  /* ---------- tunable rules ---------- */
  const TL = { cyc: 9, cueA: 3.05, cueB: 3.95, clash: 4.0, foeGone: 4.7, musicStop: 7.15, door: 7.15, jingle: 7.3, probe: 3.6 };
  const SRC = [
    { k: 'rain', name: 'Rain', col: '#4f86c6' }, { k: 'wind', name: 'Wind', col: '#8b8fa8' },
    { k: 'music', name: 'Music', col: '#8a4fd6' }, { k: 'steps', name: 'Steps', col: '#2ea3dc' },
    { k: 'enemy', name: 'Enemy', col: '#e5322d' }, { k: 'parry', name: 'Parry', col: '#c77a10' },
    { k: 'coin', name: 'Coins', col: '#e0a92d' }, { k: 'door', name: 'Door', col: '#2fae63' },
  ];
  const MIX = {
    equal: { rain: -10, wind: -10, music: -10, steps: -10, enemy: -10, parry: -10, coin: -10, door: -10 },
    focus: { rain: -20, wind: -26, music: -17, steps: -16, enemy: -4, parry: -6, coin: -12, door: -8 },
  };
  // focus mix only: these sources dip by db while the enemy winds up (a sidechain duck), and music dips under a stinger
  const DUCK = { db: -10, srcs: ['rain', 'wind', 'music', 'steps'], attack: .15, release: .45, stingerDb: -10 };
  const PRESETS = {
    aggressive: { name: 'Aggressive', game: 'Doom Eternal', what: ['synth metal: distorted', 'chugs, kick on the beat'], bpm: 160, adj: {} },
    serene: { name: 'Serene', game: 'Animal Crossing: NL', what: ['a trumpet melody over', 'banjo-like plucks'], bpm: 80, adj: {} },
    none: { name: 'No music', game: 'Limbo', what: ['no score: wind and', 'footsteps carry the mood'], bpm: 0, adj: { wind: 18, steps: 8 } },
  };
  // a: attack, h: hold, d: decay (s), amp: peak level 0..1 for the drawing and the meters
  const ENV = {
    step: { a: .004, d: .09, amp: .7 }, cue: { a: .55, d: .3, amp: 1 }, clash: { a: .003, d: .35, amp: .85 }, stinger: { a: .003, d: .9, amp: 1 },
    coin: { a: .003, d: .3, amp: .75 }, door: { a: .01, d: .4, amp: .7 }, jingle: { a: .02, h: 1.25, d: .4, amp: .9 },
    chug: { a: .003, d: .3, amp: .7 }, kick: { a: .003, d: .3, amp: .8 }, snare: { a: .003, d: .2, amp: .6 },
    banjo: { a: .003, d: .45, amp: .6 }, trumpet: { a: .05, d: .15, amp: .6 },
  };

  /* ---------- the scene's timeline ---------- */
  const SX = 20, SY = 64, SW = 580, SH = 500;
  const FOE = [340, 250], DOOR = [510, SY + 10];
  const PATH = T.Path([70, 500], 130).go(340, 500).go(340, 390).wait(TL.foeGone - 2.93, FOE).go(400, 250).go(460, 185).go(510, 96).wait(3);
  const COINS = [[150, 500], [220, 500], [290, 500], [370, 320], [460, 185]].map(([x, y]) => {
    let t = 0; for (; t < 8; t += .005) { const p = PATH.at(t); if (Math.hypot(p.x - x, p.y - y) < 12) break; }
    return { x, y, t };
  });
  const STEPS = []; { let last = -1; for (let t = 0; t < TL.door + .2; t += .01) { const p = PATH.at(t); if (p.moving && t - last >= .3) { STEPS.push(+t.toFixed(2)); last = t; } } }
  const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
  // music notes per preset, in cycle time; every preset fills exactly one cycle so the loop is seamless
  const MUSIC = {
    aggressive: (() => {
      const out = [], e8 = 60 / 160 / 2, riff = [0, 0, 12, 0, 0, 3, 0, 5, 0, 0, 12, 0, 6, 5, 3, 2];
      for (let i = 0; i < TL.cyc / e8 - .5; i++) {
        const t = i * e8; out.push({ t, v: 'chug', f: NOTE(40 + riff[i % 16]) });
        if (i % 2 === 0) out.push({ t, v: 'kick' });
        if (i % 8 === 2 || i % 8 === 6) out.push({ t, v: 'snare' });
      }
      return out;
    })(),
    serene: (() => {
      const out = [], b = 60 / 80, chords = [[48, 52, 55], [53, 57, 60], [55, 59, 62]];
      for (let i = 0; i < 24; i++) { const c = chords[Math.floor(i / 8)], k = [0, 2, 1, 2][i % 4]; out.push({ t: i * b / 2, v: 'banjo', f: NOTE(c[k] + (i % 4 === 2 ? 12 : 0)) }); }
      [[0, 76, 1], [1, 79, 1], [2, 81, .5], [2.5, 79, .5], [3, 76, 1], [4, 77, 1.5], [5.5, 81, .5], [6, 84, 1], [7, 81, 1], [8, 79, 1], [9, 77, .5], [9.5, 76, .5], [10, 74, 1.6]]
        .forEach(([bt, n, d]) => out.push({ t: bt * b, v: 'trumpet', f: NOTE(n), d: d * b * .9 }));
      return out;
    })(),
    none: [],
  };
  const JINGLE = [[0, 67, .1], [.1, 72, .1], [.2, 76, .1], [.3, 79, .1], [.4, 84, .22], [.66, 79, .1], [.78, 84, .55]];

  function cycleEvents(s) {
    const ev = [];
    STEPS.forEach(t => ev.push({ t, k: 'steps', type: 'step' }));
    ev.push({ t: TL.cueA, k: 'enemy', type: 'cue', h: TL.cueB - TL.cueA - ENV.cue.a });
    ev.push({ t: TL.clash, k: 'parry', type: 'clash' });
    if (s.stinger) ev.push({ t: TL.clash, k: 'parry', type: 'stinger' });
    if (s.chime) COINS.forEach((c, i) => ev.push({ t: c.t, k: 'coin', type: 'coin', i }));
    ev.push({ t: TL.door, k: 'door', type: 'door' });
    if (s.jingle) ev.push({ t: TL.jingle, k: 'door', type: 'jingle' });
    MUSIC[s.preset].forEach(n => { if (n.t < TL.musicStop) ev.push({ t: n.t, k: 'music', type: n.v, f: n.f, h: n.d }); });
    return ev.sort((a, b) => a.t - b.t);
  }
  const evCache = new Map();
  const eventsFor = s => { const key = [s.preset, s.stinger, s.chime, s.jingle].join(); if (!evCache.has(key)) evCache.set(key, cycleEvents(s)); return evCache.get(key); };

  function envAt(e, t) {
    const E = ENV[e.type], dt = t - e.t; if (dt < 0) return 0;
    const h = e.h ?? E.h ?? 0;
    if (dt < E.a) return E.amp * dt / E.a;
    if (dt < E.a + h) return E.amp;
    const x = dt - E.a - h; if (x > E.d * 2.5) return 0;
    return E.amp * Math.exp(-3 * x / E.d);
  }
  const smooth = (t, a, b, up, down) => t < a - up || t > b + down ? 0 : t < a ? ease(clamp((t - (a - up)) / up)) : t > b ? 1 - ease(clamp((t - b) / down)) : 1;
  function baseDb(k, s) { return MIX[s.mix][k] + (PRESETS[s.preset].adj[k] || 0); }
  function duckDb(k, s, t) {
    if (s.mix !== 'focus') return 0;
    let d = DUCK.srcs.includes(k) ? DUCK.db * smooth(t, TL.cueA, TL.cueB, DUCK.attack, DUCK.release) : 0;
    if (k === 'music' && s.stinger) d += DUCK.stingerDb * smooth(t, TL.clash, TL.clash + .6, .02, .5);
    return d;
  }
  // amplitude 0..1 of each source at cycle time t (before the fader)
  function amps(s, t) {
    const a = { rain: .92 + .08 * Math.sin(t * 7.3) * Math.sin(t * 2.1), wind: .55 + .35 * (.5 + .5 * Math.sin(t * .9)) * (.6 + .4 * Math.sin(t * 2.7 + 1)) };
    SRC.forEach(({ k }) => { if (a[k] == null) a[k] = 0; });
    for (const e of eventsFor(s)) { if (e.t > t) break; const v = envAt(e, t); if (v > a[e.k]) a[e.k] = v; }
    return a;
  }
  const lin = db => Math.pow(10, db / 20), dbOf = v => 20 * Math.log10(Math.max(v, 1e-6));
  function levels(s, t) {
    const a = amps(s, t), out = {};
    SRC.forEach(({ k }) => { out[k] = a[k] > 1e-4 ? baseDb(k, s) + duckDb(k, s, t) + dbOf(a[k]) : -90; });
    return out;
  }
  // how far the enemy cue stands above everything else at the height of the wind-up
  function cueMargin(s, t = TL.probe) {
    const L = levels(s, t); let rest = 0;
    SRC.forEach(({ k }) => { if (k !== 'enemy') rest += lin(L[k]) ** 2; });
    return L.enemy - dbOf(Math.sqrt(rest));
  }

  /* ---------- audio: synthesised, scheduled from the same events ---------- */
  const A = { ac: null, on: false, live: false, master: null, bus: {}, noise: null, shaper: null };
  function audioInit() {
    if (A.ac) return;
    const ac = new (window.AudioContext || window.webkitAudioContext)(); A.ac = ac;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 3; comp.connect(ac.destination);
    A.master = ac.createGain(); A.master.gain.value = 0; A.master.connect(comp);
    SRC.forEach(({ k }) => { const g = ac.createGain(); g.gain.value = 0; g.connect(A.master); A.bus[k] = g; });
    const len = ac.sampleRate * 2, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.noise = buf;
    const curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; curve[i] = Math.tanh(x * 6); }
    A.shaper = curve;
    // continuous beds: rain (bright noise) and wind (a slow-swept band of noise)
    const rain = ac.createBufferSource(); rain.buffer = buf; rain.loop = true;
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
    const rg = ac.createGain(); rg.gain.value = .55; rain.connect(hp); hp.connect(lp); lp.connect(rg); rg.connect(A.bus.rain); rain.start();
    const wind = ac.createBufferSource(); wind.buffer = buf; wind.loop = true; wind.playbackRate.value = .7;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 380; bp.Q.value = 1.4;
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = .15; lg.gain.value = 220; lfo.connect(lg); lg.connect(bp.frequency); lfo.start();
    const wg = ac.createGain(); wg.gain.value = 1.6; wind.connect(bp); bp.connect(wg); wg.connect(A.bus.wind); wind.start();
  }
  function vca(t, a, d, peak, h = 0) {
    const g = A.ac.createGain(); g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a); if (h) g.gain.setValueAtTime(peak, t + a + h);
    g.gain.exponentialRampToValueAtTime(.0001, t + a + h + d); return g;
  }
  function osc(bus, t, type, f, a, d, peak, o = {}) {
    const ac = A.ac, h = o.h || 0, end = t + a + h + d + .05, s = ac.createOscillator(); s.type = type;
    s.frequency.setValueAtTime(f, t); if (o.f2) s.frequency.exponentialRampToValueAtTime(o.f2, t + a + h + d);
    if (o.vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = o.vib; lg.gain.value = f * .012; l.connect(lg); lg.connect(s.frequency); l.start(t); l.stop(end); }
    let node = s;
    if (o.shape) { const ws = ac.createWaveShaper(); ws.curve = A.shaper; node.connect(ws); node = ws; }
    if (o.lp) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(o.lp, t); if (o.lp2) fl.frequency.exponentialRampToValueAtTime(o.lp2, t + a + h + d); node.connect(fl); node = fl; }
    const g = vca(t, a, d, peak, h); node.connect(g); g.connect(A.bus[bus]); s.start(t); s.stop(end);
  }
  function noise(bus, t, ftype, f, q, a, d, peak) {
    const ac = A.ac, s = ac.createBufferSource(); s.buffer = A.noise;
    const fl = ac.createBiquadFilter(); fl.type = ftype; fl.frequency.value = f; fl.Q.value = q;
    const g = vca(t, a, d, peak); s.connect(fl); fl.connect(g); g.connect(A.bus[bus]); s.start(t, Math.random() * 1.5); s.stop(t + a + d + .05);
  }
  const SYNTH = {
    step(t) { noise('steps', t, 'bandpass', 500 + Math.random() * 300, 1.1, .003, .07, .9); osc('steps', t, 'sine', 95, .002, .05, .25); },
    cue(t, e) { const L = (e.h || 0) + ENV.cue.a; osc('enemy', t, 'sawtooth', 58, .25, .35, .55, { h: L - .25, f2: 96, lp: 260, lp2: 1500, vib: 7 }); osc('enemy', t, 'sawtooth', 61, .25, .35, .35, { h: L - .25, f2: 101, lp: 300, lp2: 1200 }); },
    clash(t) { [1870, 2630, 3720, 5110].forEach((f, i) => osc('parry', t, 'square', f, .001, .32 - i * .04, .07)); noise('parry', t, 'highpass', 3000, .7, .001, .05, .7); },
    stinger(t) {
      osc('parry', t + .03, 'sine', 110, .002, .7, .95, { f2: 40 }); noise('parry', t + .03, 'lowpass', 380, .8, .002, .16, .8);
      [57, 60, 64].forEach(n => osc('parry', t + .05, 'sawtooth', NOTE(n), .01, .65, .09, { lp: 2400, lp2: 500 }));
    },
    coin(t, e) { const f = 988 * Math.pow(2, e.i * 2 / 12); osc('coin', t, 'square', f, .002, .06, .14); osc('coin', t + .07, 'square', f * 1.335, .002, .32, .14); },
    door(t) { noise('door', t, 'lowpass', 220, .9, .01, .4, .8); osc('door', t, 'sawtooth', 150, .02, .35, .12, { f2: 90, lp: 700 }); },
    jingle(t) {
      JINGLE.forEach(([dt, n, d]) => { osc('door', t + dt, 'square', NOTE(n), .005, d, .1, { lp: 3500 }); osc('door', t + dt, 'triangle', NOTE(n - 24), .005, d, .25); });
    },
    chug(t, e) { osc('music', t, 'sawtooth', e.f, .003, .13, .22, { shape: 1, lp: 1500 }); osc('music', t, 'sawtooth', e.f * 1.5, .003, .13, .1, { shape: 1, lp: 1500 }); },
    kick(t) { osc('music', t, 'sine', 130, .002, .17, .8, { f2: 42 }); },
    snare(t) { noise('music', t, 'bandpass', 1800, .7, .002, .12, .6); osc('music', t, 'triangle', 190, .002, .07, .2); },
    banjo(t, e) { osc('music', t, 'triangle', e.f, .002, .26, .3); osc('music', t, 'square', e.f, .002, .08, .06, { lp: 4000 }); },
    trumpet(t, e) { osc('music', t, 'sawtooth', e.f, .05, .12, .14, { h: Math.max(.01, e.h - .17), lp: 1700, vib: 5.5 }); },
  };
  const sndBtns = [];
  function setSound(on) {
    if (on) { audioInit(); A.ac.resume?.(); }
    A.on = on;
    sndBtns.forEach(b => { b.classList.toggle('on', on); b.textContent = on ? '♪ Sound on' : '♪ Sound off'; });
  }
  function audioFrame(st, s, lt) {
    if (!A.ac) return;
    const now = A.ac.currentTime;
    A.master.gain.setTargetAtTime(A.on && A.live ? .8 : 0, now, .05);
    if (!A.on || !A.live) { st.sched = st.t; return; }
    SRC.forEach(({ k }) => { if (k === 'rain' || k === 'wind') A.bus[k].gain.setTargetAtTime(lin(baseDb(k, s) + duckDb(k, s, lt)), now, .04); else A.bus[k].gain.setTargetAtTime(lin(baseDb(k, s) + duckDb(k, s, lt)), now, .02); });
    const from = st.sched, to = st.t + .12;
    if (to <= from) return;
    for (let c = Math.floor(from / TL.cyc); c <= Math.floor(to / TL.cyc); c++) {
      const cs = st.cycleSettings(c);
      for (const e of eventsFor(cs)) {
        const at = c * TL.cyc + e.t; if (at <= from || at > to) continue;
        try { SYNTH[e.type](Math.max(now, now + at - st.t + .03), e); } catch (err) { if (!A.warned) { A.warned = 1; console.warn('synth', e.type, err); } }
      }
    }
    st.sched = to;
  }

  /* ---------- drawing ---------- */
  const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const colOf = k => SRC.find(s => s.k === k).col;
  const vis = db => clamp((db + 50) / 44);
  function rings(g, x, y, a, t, col, r0 = 14, r1 = 60, n = 3) {
    if (a <= .02) return;
    g.save(); g.strokeStyle = col; g.lineWidth = 2.5;
    for (let i = 0; i < n; i++) { const f = (t * 1.7 + i / n) % 1; g.globalAlpha = a * (1 - f) * .9; g.beginPath(); g.arc(x, y, lerp(r0, r1, f), 0, TAU); g.stroke(); }
    g.restore();
  }
  function txt(g, s, x, y, size = 13, col = C.ink, weight = 600, align = 'left', font = 'Jost') {
    g.font = `${weight} ${size}px ${font === 'M' ? 'Montserrat, Jost' : 'Jost'}, sans-serif`; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(s, x, y);
  }
  function lastEvent(s, k, lt, type) { let best = null; for (const e of eventsFor(s)) { if (e.t > lt) break; if (e.k === k && (!type || e.type === type)) best = e; } return best; }

  function drawScene(g, s, lt, L) {
    g.save(); g.beginPath(); g.roundRect(SX, SY, SW, SH, 10); g.clip();
    T.floor(SX, SY, SW, SH, .12);
    T.pillar(80, 130, 70, 70); T.pillar(200, 300, 56, 56); T.pillar(500, 380, 60, 60);
    // puddles
    g.fillStyle = 'rgba(79,134,198,.18)'; [[130, 400, 46, 16], [470, 300, 38, 13], [250, 170, 52, 15]].forEach(([x, y, rx, ry]) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); });
    // walls and the door in the top wall
    const open = clamp((lt - TL.door) / .4);
    T.wall(SX, SY, 480 - SX, 20); T.wall(540, SY, SX + SW - 540, 20); T.wall(SX, SY + SH - 20, SW, 20); T.wall(SX, SY, 20, SH); T.wall(SX + SW - 20, SY, 20, SH);
    g.fillStyle = open > 0 ? `rgba(255,185,81,${.5 + .4 * open})` : '#2a2e55'; g.fillRect(480, SY, 60, 20);
    g.fillStyle = '#8a5a2b'; g.strokeStyle = '#5a3a1a'; g.lineWidth = 2; g.fillRect(480 + open * 56, SY + 2, 60 - open * 56, 16); g.strokeRect(480 + open * 56, SY + 2, 60 - open * 56, 16);
    // coins
    COINS.forEach((c, i) => {
      if (lt >= c.t) return;
      const sq = Math.abs(Math.cos(lt * 3 + i));
      g.fillStyle = C.gold; g.strokeStyle = C.goldInk; g.lineWidth = 2; g.beginPath(); g.ellipse(c.x, c.y, 3 + 8 * sq, 11, 0, 0, TAU); g.fill(); g.stroke();
    });
    // the enemy: idle, wind-up (with its telegraph cone), lunge, knocked back, gone
    const hero = PATH.at(lt);
    if (lt < TL.foeGone) {
      let fy = FOE[1], a = 1;
      if (lt > TL.cueB && lt < TL.clash) fy = lerp(FOE[1], 330, (lt - TL.cueB) / (TL.clash - TL.cueB));
      else if (lt >= TL.clash) { const k = ease(clamp((lt - TL.clash) / .35)); fy = lerp(330, 228, k); a = 1 - clamp((lt - 4.35) / .35); }
      if (lt > TL.cueA && lt < TL.clash) T.cone(FOE[0], fy, Math.PI / 2, .45, 150, clamp((lt - TL.cueA) / .4));
      T.foe(FOE[0], fy, 24, Math.PI / 2, C.red, { mark: 'horns', a });
      rings(g, FOE[0], fy, vis(L.enemy), lt, colOf('enemy'), 26, 110, 3);
      if (L.enemy > -60 && lt < TL.clash) T.label('wind-up growl', FOE[0] + 70, fy - 30, 'center', C.red, 13);
    }
    T.poof(FOE[0], 228, lt - TL.foeGone + .3, 30);
    // the hero: fades through the door at the end
    const ha = 1 - clamp((lt - TL.jingle - .1) / .3);
    if (ha > 0) T.player(hero.x, hero.y, hero.face, .9, ha);
    // parry: blade arc, clash rings, stinger flash
    const pc = [340, 362];
    if (lt >= TL.clash - .05 && lt < TL.clash + .3) { g.strokeStyle = '#fff'; g.lineWidth = 5; g.beginPath(); g.arc(hero.x, hero.y, 34, -Math.PI * .85, -Math.PI * .15); g.stroke(); }
    const st = lastEvent(s, 'parry', lt, 'stinger');
    if (st && lt - st.t < 1) { T.flash(pc[0], pc[1], 150, (1 - (lt - st.t)) * .8); }
    rings(g, pc[0], pc[1], vis(L.parry), lt, colOf('parry'), 18, st && lt - st.t < 1.2 ? 170 : 80, 3);
    if (lt >= TL.clash && lt < TL.clash + 1.1) T.label(st ? 'clash + stinger' : 'clash', pc[0] - 90, pc[1] + 6, 'center', C.goldInk, 14);
    // steps at the hero's feet
    rings(g, hero.x, hero.y, vis(L.steps) * ha, lt, colOf('steps'), 20, 52, 2);
    // coins: chime rings and +1
    COINS.forEach((c, i) => {
      const age = lt - c.t; if (age < 0 || age > .8) return;
      if (s.chime) { rings(g, c.x, c.y, vis(L.coin), lt, colOf('coin'), 10, 60, 2); T.popText('+1', c.x, c.y - 24 - age * 30, C.goldInk, 1 - age / .8); }
      else T.popText('+1', c.x, c.y - 24 - age * 30, C.muted, (1 - age / .8) * .7);
    });
    // door and jingle
    rings(g, DOOR[0], DOOR[1] + 20, vis(L.door), lt, colOf('door'), 20, 120, 3);
    if (s.jingle && lt > TL.jingle && lt < TL.jingle + 1.6) {
      for (let i = 0; i < 6; i++) { const f = ((lt - TL.jingle) * .8 + i / 6) % 1; g.globalAlpha = 1 - f; txt(g, '♪', DOOR[0] - 70 + i * 26, DOOR[1] + 80 - f * 50, 22, C.p2, 700, 'center'); }
      g.globalAlpha = 1;
    }
    // rain: streak density and strength follow the rain's level
    const ra = vis(L.rain);
    g.strokeStyle = `rgba(52,96,160,${.15 + .55 * ra})`; g.lineWidth = 1.6; g.beginPath();
    const n = Math.round(40 + 140 * ra);
    for (let i = 0; i < n; i++) {
      const x = SX + 20 + hash(i) * (SW - 40), y = SY + ((hash(i + 99) * SH + lt * 520) % SH);
      g.moveTo(x, y); g.lineTo(x - 5, y + 14);
    }
    g.stroke();
    for (let i = 0; i < Math.round(6 + 14 * ra); i++) { const k = Math.floor(lt * 3 + hash(i + 7) * 5), f = (lt * 3 + hash(i + 7) * 5) % 1, x = SX + 30 + hash(k * 13 + i) * (SW - 60), y = SY + 30 + hash(k * 7 + i * 3) * (SH - 60); g.strokeStyle = `rgba(52,96,160,${(1 - f) * .5 * ra})`; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y, 3 + f * 12, 1.5 + f * 5, 0, 0, TAU); g.stroke(); }
    // wind: drifting arcs
    const wa = vis(L.wind);
    if (wa > .05) { g.strokeStyle = `rgba(93,97,140,${.55 * wa})`; g.lineWidth = 2.5; for (let i = 0; i < 6; i++) { const y = SY + 60 + i * 75, x = SX + ((lt * 90 + i * 170) % (SW + 200)) - 100; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 40, y - 18, x + 80, y + 18, x + 130, y); g.stroke(); } }
    g.restore();
    // music: a non-diegetic badge pulsing with the music bus
    const ma = vis(L.music);
    g.fillStyle = 'rgba(255,252,244,.92)'; g.beginPath(); g.roundRect(SX + 30, SY + 30, 118, 34, 17); g.fill();
    g.strokeStyle = colOf('music'); g.lineWidth = 2; g.globalAlpha = .3 + .7 * ma; g.stroke(); g.globalAlpha = 1;
    txt(g, s.preset === 'none' ? 'no music' : '♪ music', SX + 44, SY + 52, 14, s.preset === 'none' ? C.muted : colOf('music'), 700);
    for (let i = 0; i < 4; i++) { const hgt = 4 + 16 * ma * (.5 + .5 * Math.sin(lt * 11 + i * 1.9)); g.fillStyle = colOf('music'); g.globalAlpha = .4 + .6 * ma; g.fillRect(SX + 112 + i * 7, SY + 56 - hgt, 5, hgt); }
    g.globalAlpha = 1;
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(SX, SY, SW, SH, 10); g.stroke();
  }

  const PX = 616, PW = 404;
  function drawMixer(g, s, L) {
    g.fillStyle = '#efe6d2'; g.beginPath(); g.roundRect(PX, SY, PW, 226, 12); g.fill();
    txt(g, 'Mixer', PX + 14, SY + 22, 15, C.ink, 800, 'left', 'M');
    txt(g, s.mix === 'focus' ? 'focus mix' : 'equal faders', PX + PW - 14, SY + 22, 13, s.mix === 'focus' ? C.good : C.red, 700, 'right');
    const top = SY + 36, hb = 150, y0 = top + hb, dbY = db => y0 - hb * clamp((db + 48) / 48);
    g.strokeStyle = 'rgba(93,97,140,.25)'; g.lineWidth = 1;
    [-12, -24, -36].forEach(d => { g.beginPath(); g.moveTo(PX + 34, dbY(d)); g.lineTo(PX + PW - 8, dbY(d)); g.stroke(); txt(g, d + '', PX + 30, dbY(d) + 4, 10, C.muted, 500, 'right'); });
    txt(g, 'dB', PX + 30, top + 8, 10, C.muted, 500, 'right');
    SRC.forEach(({ k, name, col }, i) => {
      const x = PX + 40 + i * 45, w = 30;
      g.fillStyle = 'rgba(21,32,68,.12)'; g.fillRect(x, top, w, hb);
      const y = dbY(L[k]); g.fillStyle = col; g.fillRect(x, y, w, y0 - y);
      // fader position
      const fy = dbY(baseDb(k, s) + duckDb(k, s, s._lt));
      g.fillStyle = C.navy; g.fillRect(x - 3, fy - 2, w + 6, 4);
      txt(g, name, x + w / 2, y0 + 16, 11, C.ink, 600, 'center');
    });
  }
  function shareBar(g, x, y, w, h, L) {
    let sum = 0; const p = SRC.map(({ k }) => { const v = lin(L[k]) ** 2; sum += v; return v; });
    let cx = x;
    SRC.forEach(({ col }, i) => { const ww = sum ? w * p[i] / sum : 0; g.fillStyle = col; g.fillRect(cx, y, ww, h); cx += ww; });
    g.strokeStyle = C.navy; g.lineWidth = 1.5; g.strokeRect(x, y, w, h);
  }

  function panelFocus(g, s, lt, L) {
    const y = SY + 236, x = PX;
    g.fillStyle = '#efe6d2'; g.beginPath(); g.roundRect(x, y, PW, SH - 236, 12); g.fill();
    txt(g, 'Can you hear the enemy wind up?', x + 14, y + 24, 15, C.ink, 800, 'left', 'M');
    txt(g, 'Share of the mix right now', x + 14, y + 48, 12, C.muted);
    shareBar(g, x + 14, y + 56, PW - 28, 22, L);
    // margin gauge
    const m = cueMargin(s), gx = x + 14, gw = PW - 28, gy = y + 118, toX = v => gx + gw * clamp((v + 20) / 50);
    txt(g, 'Enemy cue over everything else (at the wind-up)', x + 14, y + 106, 12, C.muted);
    g.fillStyle = 'rgba(229,50,45,.22)'; g.fillRect(gx, gy, toX(0) - gx, 18);
    g.fillStyle = 'rgba(224,169,45,.25)'; g.fillRect(toX(0), gy, toX(6) - toX(0), 18);
    g.fillStyle = 'rgba(47,174,99,.25)'; g.fillRect(toX(6), gy, gx + gw - toX(6), 18);
    txt(g, 'buried', (gx + toX(0)) / 2, gy + 13, 11, C.redDk, 700, 'center'); txt(g, 'readable', (toX(0) + toX(6)) / 2, gy + 13, 10, C.goldInk, 700, 'center'); txt(g, 'clear', (toX(6) + gx + gw) / 2, gy + 13, 11, C.good, 700, 'center');
    g.fillStyle = C.navy; g.beginPath(); g.moveTo(toX(m), gy - 2); g.lineTo(toX(m) - 7, gy - 12); g.lineTo(toX(m) + 7, gy - 12); g.closePath(); g.fill(); g.fillRect(toX(m) - 1.5, gy - 2, 3, 22);
    const word = m < 0 ? 'buried' : m < 6 ? 'readable' : 'clear';
    txt(g, `${m >= 0 ? '+' : '−'}${Math.abs(m).toFixed(0)} dB · ${word}`, x + 14, y + 184, 26, m < 0 ? C.red : m < 6 ? C.goldInk : C.good, 800, 'left', 'M');
    const lines = s.mix === 'focus'
      ? ['Rain, wind, music and steps duck 10 dB while the', 'enemy winds up: one sound tells you what to do.']
      : ['Every fader at the same level: the rain and the', 'music mask the one sound that matters.'];
    lines.forEach((l, i) => txt(g, l, x + 14, y + 212 + i * 18, 13, C.ink, 500));
    if (lt > TL.cueA - .2 && lt < TL.cueB + .5) { g.strokeStyle = C.red; g.lineWidth = 3; g.beginPath(); g.roundRect(x + 2, y + 2, PW - 4, SH - 240, 11); g.stroke(); }
  }
  function parryEnv(stinger, t) { let v = envAt({ t: TL.clash, type: 'clash' }, t); if (stinger) v = Math.max(v, envAt({ t: TL.clash, type: 'stinger' }, t)); return v; }
  function panelStinger(g, s, lt) {
    const y = SY + 236, x = PX;
    g.fillStyle = '#efe6d2'; g.beginPath(); g.roundRect(x, y, PW, SH - 236, 12); g.fill();
    txt(g, 'The parry, heard two ways', x + 14, y + 24, 15, C.ink, 800, 'left', 'M');
    const t0 = TL.clash - .2, t1 = TL.clash + 2, gx = x + 14, gw = PW - 28, toX = t => gx + gw * (t - t0) / (t1 - t0);
    [[0, 'Clash only'], [1, 'Clash + stinger (drum hit and chord)']].forEach(([on, name], r) => {
      const ry = y + 44 + r * 84, rh = 58, act = !!s.stinger === !!on;
      g.fillStyle = act ? 'rgba(255,252,244,.95)' : 'rgba(255,252,244,.45)'; g.beginPath(); g.roundRect(gx - 6, ry - 4, gw + 12, rh + 26, 8); g.fill();
      if (act) { g.strokeStyle = C.gold; g.lineWidth = 3; g.stroke(); }
      txt(g, name, gx, ry + 12, 13, act ? C.ink : C.muted, 700);
      g.beginPath(); g.moveTo(toX(t0), ry + rh + 12);
      let area = 0;
      for (let t = t0; t <= t1; t += .01) { const v = parryEnv(on, t); area += v * .01; g.lineTo(toX(t), ry + rh + 12 - v * (rh - 10)); }
      g.lineTo(toX(t1), ry + rh + 12); g.closePath(); g.fillStyle = act ? colOf('parry') : 'rgba(93,97,140,.35)'; g.globalAlpha = act ? .75 : 1; g.fill(); g.globalAlpha = 1;
      txt(g, `weight ${area.toFixed(2)}`, gx + gw, ry + 12, 12, act ? C.goldInk : C.muted, 700, 'right');
      if (act && lt >= t0 && lt <= t1) { g.fillStyle = C.navy; g.fillRect(toX(lt) - 1, ry + 16, 2, rh - 2); }
    });
    txt(g, 'Sekiro: the blade clash, then a drum hit that', x + 14, y + 222, 13, C.ink, 500);
    txt(g, 'says “that parry mattered”.', x + 14, y + 240, 13, C.ink, 500);
  }
  function panelIdentity(g, s, lt) {
    const y = SY + 236, x = PX;
    g.fillStyle = '#efe6d2'; g.beginPath(); g.roundRect(x, y, PW, SH - 236, 12); g.fill();
    const keys = ['aggressive', 'serene', 'none'];
    keys.forEach((k, i) => {
      const P = PRESETS[k], cx = x + 10 + i * 130, cw = 124, act = s.preset === k;
      g.fillStyle = act ? 'rgba(255,252,244,.98)' : 'rgba(255,252,244,.5)'; g.beginPath(); g.roundRect(cx, y + 10, cw, 92, 8); g.fill();
      if (act) { g.strokeStyle = C.gold; g.lineWidth = 3; g.stroke(); }
      txt(g, P.name, cx + 8, y + 30, 14, act ? C.ink : C.muted, 800, 'left', 'M');
      txt(g, P.game, cx + 8, y + 48, 12, act ? colOf('music') : C.muted, 700);
      P.what.forEach((l, j) => txt(g, l, cx + 8, y + 68 + j * 15, 11, act ? C.ink : C.muted, 500));
    });
    // a piano roll of the cycle for the active preset
    const rx = x + 14, rw = PW - 28, ry = y + 116, rh = 120, toX = t => rx + rw * t / TL.cyc;
    g.fillStyle = 'rgba(255,252,244,.9)'; g.fillRect(rx, ry, rw, rh);
    g.fillStyle = 'rgba(93,97,140,.12)'; g.fillRect(toX(TL.musicStop), ry, rw - (toX(TL.musicStop) - rx), rh);
    txt(g, 'level clear', toX(TL.musicStop) + 4, ry + 14, 11, C.muted, 600);
    if (s.preset === 'none') {
      g.strokeStyle = colOf('wind'); g.lineWidth = 2; g.beginPath();
      for (let t = 0; t <= TL.cyc; t += .05) { const a = amps(s, t).wind; g.lineTo(toX(t), ry + rh - 30 - a * 60); } g.stroke();
      STEPS.forEach(t => { g.fillStyle = colOf('steps'); g.fillRect(toX(t) - 1.5, ry + rh - 22, 3, 16); });
      txt(g, 'wind', rx + 6, ry + 30, 12, C.muted, 700); txt(g, 'footsteps, louder', rx + 6, ry + rh - 26, 12, colOf('steps'), 700);
    } else {
      const ns = MUSIC[s.preset].filter(n => n.t < TL.musicStop), ms = ns.filter(n => n.f).map(n => 12 * Math.log2(n.f / 440) + 69), lo = Math.min(...ms) - 2, hi = Math.max(...ms) + 2;
      ns.forEach(n => {
        let yy, hh = 5, ww = Math.max(3, rw * (n.h || ENV[n.v].d) / TL.cyc);
        if (n.v === 'kick') yy = ry + rh - 10; else if (n.v === 'snare') yy = ry + rh - 18;
        else { const m = 12 * Math.log2(n.f / 440) + 69; yy = ry + rh - 26 - (m - lo) / (hi - lo) * (rh - 44); }
        const lit = lt >= n.t && lt < n.t + Math.max(.12, n.h || 0);
        g.fillStyle = lit ? C.gold : (n.v === 'trumpet' ? colOf('music') : n.v === 'kick' || n.v === 'snare' ? C.navy : 'rgba(138,79,214,.55)');
        g.fillRect(toX(n.t), yy, ww, hh);
      });
      txt(g, `${PRESETS[s.preset].bpm} bpm`, rx + 6, ry + 14, 11, C.muted, 700);
    }
    g.fillStyle = C.red; g.fillRect(toX(lt) - 1, ry, 2, rh);
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 1.5; g.strokeRect(rx, ry, rw, rh);
  }
  function panelReward(g, s, lt) {
    const y = SY + 236, x = PX;
    g.fillStyle = '#efe6d2'; g.beginPath(); g.roundRect(x, y, PW, SH - 236, 12); g.fill();
    txt(g, 'Micro and macro rewards', x + 14, y + 24, 15, C.ink, 800, 'left', 'M');
    const rx = x + 14, rw = PW - 28, toX = t => rx + rw * t / TL.cyc;
    // micro lane
    let heard = 0;
    const ly = y + 48;
    txt(g, `Micro · a chime per coin ${s.chime ? '(on)' : '(off: silent)'}`, rx, ly, 12, s.chime ? C.goldInk : C.muted, 700);
    g.fillStyle = 'rgba(255,252,244,.9)'; g.fillRect(rx, ly + 8, rw, 40);
    COINS.forEach((c, i) => {
      const got = lt >= c.t, cx = toX(c.t), age = lt - c.t;
      if (got && s.chime) heard++;
      g.beginPath(); g.arc(cx, ly + 28, 9, 0, TAU);
      if (s.chime) { g.fillStyle = got ? C.gold : 'rgba(224,169,45,.35)'; g.fill(); g.strokeStyle = C.goldInk; g.lineWidth = 2; g.stroke(); if (age >= 0 && age < .5) rings(g, cx, ly + 28, 1 - age * 2, lt, colOf('coin'), 10, 22, 1); }
      else { g.strokeStyle = got ? C.muted : 'rgba(93,97,140,.4)'; g.lineWidth = 2; g.setLineDash([3, 3]); g.stroke(); g.setLineDash([]); }
    });
    // macro lane
    const my = y + 116;
    txt(g, `Macro · a level-clear jingle ${s.jingle ? '(on)' : '(off: the music just stops)'}`, rx, my, 12, s.jingle ? C.good : C.muted, 700);
    g.fillStyle = 'rgba(255,252,244,.9)'; g.fillRect(rx, my + 8, rw, 40);
    if (s.jingle) {
      JINGLE.forEach(([dt, n, d]) => { const t = TL.jingle + dt, lit = lt >= t && lt < t + d + .05; g.fillStyle = lit ? C.gold : C.p2; g.fillRect(toX(t), my + 40 - (n - 64) * 1.3, Math.max(4, rw * d / TL.cyc), 6); });
      if (lt >= TL.jingle) heard += lt >= TL.jingle ? 1 : 0;
    } else { g.fillStyle = 'rgba(93,97,140,.18)'; g.fillRect(toX(TL.jingle), my + 8, toX(TL.cyc) - toX(TL.jingle), 40); txt(g, 'silence', toX(TL.jingle) + 8, my + 33, 12, C.muted, 600); }
    g.fillStyle = C.red; g.fillRect(toX(lt) - 1, ly + 8, 2, my + 48 - ly - 8);
    txt(g, `${heard} reward${heard === 1 ? '' : 's'} heard this run`, rx, y + 196, 22, heard ? C.goldInk : C.muted, 800, 'left', 'M');
    txt(g, 'Candy Crush affirms every match; Super Mario', rx, y + 222, 13, C.ink, 500);
    txt(g, 'Bros. 3 plays a jingle when the level is clear.', rx, y + 240, 13, C.ink, 500);
  }
  const PANELS = { focus: panelFocus, stinger: panelStinger, identity: panelIdentity, reward: panelReward };
  const HEAD = {
    focus: ['Rule 1 · Focus on what’s important', '“The human ear can only process so much before being overwhelmed”'],
    stinger: ['Rule 2 · Show them why they should care', 'A stinger: “a short but powerful music or sound effect that accentuates a gameplay moment”'],
    identity: ['Rule 3 · Design a core identity', 'The same scene with three soundtracks'],
    reward: ['Rule 4 · Reward accomplishments', 'Micro rewards for every small win, a macro reward for the big one'],
  };
  function draw(g, which, s, lt, stamp) {
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
    s._lt = lt;
    const L = levels(s, lt);
    txt(g, HEAD[which][0], 22, 30, 17, C.ink, 800, 'left', 'M');
    txt(g, HEAD[which][1], 22, 52, 13, C.muted, 500);
    txt(g, `scene ${lt.toFixed(1)} s / ${TL.cyc} s · rings show what you would hear`, W - 20, 30, 12, C.muted, 600, 'right');
    drawScene(g, s, lt, L);
    drawMixer(g, s, L);
    PANELS[which](g, s, lt, L);
    if (stamp && stamp.a > 0) T.stamp(stamp.text, SX + SW / 2, SY + SH / 2, stamp.col, stamp.a, 30);
  }

  /* ---------- the four slides ---------- */
  const BASE = { mix: 'focus', stinger: true, preset: 'serene', chime: true, jingle: true };
  // per slide: which setting the control drives, its default, and the walk-through's cycles
  const SLIDES = {
    focus: { key: 'mix', init: { ...BASE, mix: 'equal', preset: 'aggressive' }, tour: [{ mix: 'equal' }, { mix: 'focus' }], names: ['Equal faders', 'Focus mix'], cols: [C.red, C.good] },
    stinger: { key: 'stinger', init: { ...BASE, stinger: false }, tour: [{ stinger: false }, { stinger: true }], names: ['Clash only', 'Clash + stinger'], cols: [C.muted, C.goldInk] },
    identity: { key: 'preset', init: { ...BASE, preset: 'aggressive' }, tour: [{ preset: 'aggressive' }, { preset: 'serene' }, { preset: 'none' }], names: ['Aggressive · Doom Eternal', 'Serene · Animal Crossing', 'No music · Limbo'], cols: ['#8a4fd6', '#8a4fd6', C.muted] },
    reward: { key: 'chime', init: { ...BASE }, tour: [{ chime: false, jingle: false }, { chime: true, jingle: false }, { chime: true, jingle: true }], names: ['No reward sounds', 'Coin chime on', 'Chime + jingle'], cols: [C.muted, C.goldInk, C.good] },
  };
  const OUT = {
    focus: s => s.mix === 'focus'
      ? 'The focus mix pulls rain, wind, music and footsteps down and ducks them a further 10 dB while the enemy growls. The wind-up now cuts through, the way Ornn’s horn in League of Legends tells everyone a fight-swinging ultimate is coming.'
      : 'Every source at the same fader level. The rain is a constant wall of noise and the music never stops, so the enemy’s wind-up drowns in them. Watch its marker sit in “buried”.',
    stinger: s => s.stinger
      ? 'Clash, then a drum hit and a minor chord. The moment gets weight and length; the music ducks under it. Sekiro does this on a perfect deflect.'
      : 'Just the clash. It tells you the blades met, but not that you did something worth caring about.',
    identity: s => ({ aggressive: 'Fast, distorted, relentless: the same walk now feels like a hunt (Doom Eternal’s synth metal).', serene: 'A slow trumpet line over plucks: the same walk is a stroll (Animal Crossing: New Leaf’s trumpet and banjo).', none: 'No score at all. Wind and footsteps come up and the silence is the identity (Limbo).' })[s.preset],
    reward: s => `${s.chime ? 'Each coin plays a chime that climbs in pitch, a small affirmation like Candy Crush’s.' : 'Coins vanish in silence: you see the count go up, but nothing affirms it.'} ${s.jingle ? 'Reaching the door cuts the music for a jingle, the macro reward (Super Mario Bros. 3).' : 'At the door the music just stops.'}`,
  };
  const scenes = {};
  Object.entries(SLIDES).forEach(([which, cfg]) => {
    const DUR = TL.cyc * cfg.tour.length;
    canvasDemo('fr-' + which, (sl, cv, g) => {
      const st = { t: 0, sched: 0, tour: true, held: false, s: { ...cfg.init }, key: '' };
      const tourBtn = $(sl, '.fr-tour'), snd = $(sl, '.fr-snd');
      sndBtns.push(snd); snd.onclick = () => setSound(!A.on); setSound(A.on);
      const tourCycle = c => ({ ...cfg.init, ...cfg.tour[((c % cfg.tour.length) + cfg.tour.length) % cfg.tour.length] });
      st.cycleSettings = c => st.tour ? tourCycle(c) : st.s;
      const cur = t => st.tour ? tourCycle(Math.floor(t / TL.cyc)) : st.s;
      const manual = () => { if (st.tour) { st.s = { ...cur(st.t) }; st.tour = false; tourBtn.classList.remove('on'); } };
      const segs = $$(sl, '.fr-ctl .btn');
      segs.forEach(b => b.onclick = () => { manual(); const v = b.dataset.v; st.s[cfg.key] = cfg.key === 'stinger' ? v === '1' : v; });
      $$(sl, '.fr-chk').forEach(c => c.onchange = () => { manual(); st.s[c.dataset.k] = c.checked; });
      tourBtn.onclick = () => { st.tour = true; st.t = 0; st.sched = 0; tourBtn.classList.add('on'); };
      const stampAt = t => { if (!st.tour) return null; const c = Math.floor(t / TL.cyc) % cfg.tour.length, f = t % TL.cyc; return { text: cfg.names[c], col: cfg.cols[c], a: f < .2 ? f / .2 : 1 - clamp((f - 1.3) / .3) }; };
      function info(s, lt) {
        segs.forEach(b => b.classList.toggle('on', String(cfg.key === 'stinger' ? (s.stinger ? '1' : '0') : s[cfg.key]) === b.dataset.v));
        $$(sl, '.fr-chk').forEach(c => { c.checked = !!s[c.dataset.k]; });
        const m = cueMargin(s);
        const stats = {
          focus: `<div class="${m < 0 ? 'r' : m < 6 ? 'y' : 'g'}"><b>${m >= 0 ? '+' : '−'}${Math.abs(m).toFixed(0)} dB</b><span>enemy cue over the rest of the mix</span></div>`,
          stinger: `<div class="${s.stinger ? 'y' : ''}"><b>${s.stinger ? '1.2 s' : '0.4 s'}</b><span>how long the parry rings</span></div>`,
          identity: `<div><b>${PRESETS[s.preset].bpm || '—'}</b><span>${s.preset === 'none' ? 'no music: wind +18 dB, steps +8 dB' : 'bpm, ' + PRESETS[s.preset].game}</span></div>`,
          reward: `<div class="${s.chime ? 'y' : ''}"><b>${s.chime ? 5 : 0}</b><span>coin chimes per run</span></div><div class="${s.jingle ? 'g' : ''}"><b>${s.jingle ? 1 : 0}</b><span>level-clear jingle</span></div>`,
        }[which];
        const key = JSON.stringify(s) + st.tour;
        if (key === st.key) return; st.key = key;
        say($(sl, '.fr-stats'), stats); say($(sl, '.fr-out'), OUT[which](s));
      }
      scenes[which] = { seek(t) { st.held = true; const s = cur(t), lt = t % TL.cyc; draw(g, which, s, lt, stampAt(t)); info(s, lt); }, dur: () => DUR };
      return dt => {
        if (st.held) return;
        st.t += dt;
        if (st.tour && st.t >= DUR) { st.t -= DUR; st.sched = st.t; }
        const s = cur(st.t), lt = st.t % TL.cyc;
        audioFrame(st, s, lt);
        draw(g, which, s, lt, stampAt(st.t)); info(s, lt);
      };
    }, { enter() { A.live = true; }, leave() { A.live = false; if (A.ac) A.master.gain.setTargetAtTime(0, A.ac.currentTime, .03); } });
  });

  window.__seek = (t, which = 'focus') => scenes[which].seek(t);
  window.__dur = (which = 'focus') => scenes[which].dur();
})();
