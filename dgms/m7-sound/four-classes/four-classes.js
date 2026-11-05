/* Four classes sorter (DGMS Module 7, Sound Design: "The 4 classes of engaging sound design", slides 118-175, drills 191-197).
   Slide 1 (sort): twelve short sounds, all synthesised with the Web Audio API, play one at a time. The learner drags the
   sound's disc into one of the deck's four classes (character, environment, UI/UX, music) or clicks a bin. Each answer
   shows the class, which of the class's three takeaways the sound shows, and the game the deck uses as its example.
   Slide 2 (layers): Breath of the Wild's field from slides 137-139, one ambient loop built from four layers (grass in
   the wind, birds, footsteps that change with the terrain, a dropped boulder), each a toggle, drawn as four scrolling
   lanes and a mix meter so the build-up can be seen as well as heard.
   Slide 3 is the slide 196 drill as a .jform saved in this browser (wired by the kit, no code here).
   Tunable rules live in the tables at the top: CLASSES (names, colours, the three takeaways), SOUNDS (each sound's
   voices, class, takeaway and caption) and LAYER (slide 2 event timing and per-terrain footsteps).
   A sound is a list of voices { w: wave or 'noise', f: [Hz at start, Hz at end], t: offset s, d: length s, a: attack s,
   r: release s (held until then), g: peak gain, lp|bp|hp: filter Hz, q }. The same table drives the synth and the drawn
   waveform, so the silent GIFs show what the page plays. Walk-throughs are pure functions of time:
   __seek(t, 'sort'|'layers') draws deterministically and never plays audio. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585;
  const MIDI = n => 440 * Math.pow(2, (n - 69) / 12);

  /* ---------- the deck's four classes, three takeaways each ---------- */
  const CLASSES = {
    char: { name: 'Character', col: '#2ea3dc', soft: '#dcf0fa', slides: '120-131', take: ['Represents the character’s actions', 'Demonstrates traits', 'Stands out'] },
    env: { name: 'Environment', col: '#2fae63', soft: '#dcf2e3', slides: '132-142', take: ['Indicates danger', 'Defines ambience', 'Comprised of many parts'] },
    ui: { name: 'UI / UX', col: '#e0a92d', soft: '#fbefd0', slides: '143-155', take: ['Guides non-diegetically', 'Shows how players should feel', 'Marks success or failure'] },
    mus: { name: 'Music', col: '#8a4fd6', soft: '#ece2fa', slides: '156-173', take: ['Defines tone', 'Provides context', 'Notifies state changes'] },
  };
  const CLS = ['char', 'env', 'ui', 'mus'];

  /* ---------- the twelve sounds, in play order ---------- */
  const riff = [0, 0, 3, 0, 5, 0, 7, 0, 8, 7, 10, 12].map((s, i) => ({ w: 'sawtooth', f: [MIDI(45 + s), MIDI(45 + s)], t: .34 + i * .11, d: .11, g: .16, lp: 1700 }));
  const steps = k => [{ w: 'noise', bp: 2600, q: .9, t: k * .42, d: .15, g: .55 }, { w: 'noise', bp: 800, q: 1.2, t: k * .42 + .02, d: .1, g: .4 }];
  const stab = (t, g) => [76, 77, 83].map(n => ({ w: 'triangle', f: [MIDI(n), MIDI(n)], t, d: .26, g })).concat([{ w: 'square', f: [MIDI(52), MIDI(52)], t, d: .2, g: g * .8, lp: 1400 }]);
  const SOUNDS = [
    { id: 'jump', name: 'Jump', desc: 'a short rising chirp', cls: 'char', take: 0, why: 'The sound is the action: you hear the jump happen.', game: 'Super Mario Bros.: Mario’s jump',
      V: [{ w: 'square', f: [280, 900], d: .24, g: .18 }, { w: 'square', f: [560, 1800], d: .14, g: .05 }] },
    { id: 'wind', name: 'Wind', desc: 'a long, airy whoosh', cls: 'env', take: 1, why: 'Open, empty, exposed: it sets the place before anything happens.', game: 'Breath of the Wild: wind across the plains',
      V: [{ w: 'noise', bp: 700, q: .8, d: 2.4, a: .9, r: 1.2, g: .5 }, { w: 'noise', bp: 1600, q: 6, d: 2.2, a: 1.1, r: .9, g: .25 }] },
    { id: 'confirm', name: 'Menu confirm', desc: 'two bright rising blips', cls: 'ui', take: 0, why: 'Nothing in the world makes it: it guides you through the menu.', game: 'Persona 5: the menu confirm',
      V: [{ w: 'sine', f: [988, 988], d: .12, g: .3 }, { w: 'sine', f: [1480, 1480], t: .07, d: .28, g: .3 }, { w: 'triangle', f: [1976, 1976], t: .07, d: .22, g: .08 }] },
    { id: 'alert', name: 'Alert theme', desc: 'a stab, then a fast rising riff', cls: 'mus', take: 2, why: 'Slow and suspenseful turns intensely fast: you have been spotted.', game: 'Metal Gear Solid: the alert (slide 170)',
      V: [{ w: 'square', f: [880, 880], d: .3, g: .12 }, { w: 'square', f: [1245, 1245], d: .3, g: .1 }].concat(riff) },
    { id: 'colossus', name: 'Distant footfalls', desc: 'two deep thuds, then a low growl', cls: 'env', take: 0, why: 'You hear it before you see it: the ground warns you.', game: 'Shadow of the Colossus: footsteps and growl',
      V: [{ w: 'sine', f: [70, 32], d: .8, g: .7 }, { w: 'noise', lp: 220, d: .6, g: .5 }, { w: 'sine', f: [70, 32], t: .8, d: .8, g: .7 }, { w: 'noise', lp: 220, t: .8, d: .6, g: .5 },
        { w: 'sawtooth', f: [72, 58], t: 1.3, d: 1.0, a: .3, r: .5, g: .2, lp: 320 }] },
    { id: 'shotgun', name: 'Shotgun', desc: 'a loud blast and a pump', cls: 'char', take: 1, why: 'Heavy and loud: the sound says the Slayer is powerful.', game: 'Doom Eternal: the Doom Slayer’s shotgun',
      V: [{ w: 'noise', lp: 3000, d: .45, a: .002, g: .9 }, { w: 'noise', lp: 380, d: .9, g: .7 }, { w: 'sine', f: [120, 38], d: .45, g: .8 },
        { w: 'noise', bp: 2800, q: 4, t: .62, d: .06, g: .5 }, { w: 'noise', bp: 2000, q: 4, t: .78, d: .07, g: .5 }] },
    { id: 'majula', name: 'Calm theme', desc: 'a slow, warm arpeggio', cls: 'mus', take: 0, why: 'Warm and unhurried: this place is safe, so rest.', game: 'Dark Souls II: Majula',
      V: [{ w: 'sine', f: [MIDI(45), MIDI(45)], d: 2.2, a: .2, r: 1, g: .14 }].concat([69, 73, 76, 81].map((n, i) => ({ w: 'triangle', f: [MIDI(n), MIDI(n)], t: i * .38, d: 1.1, g: .16 }))) },
    { id: 'ko', name: 'Knockout', desc: 'an explosive hit and a ringing star', cls: 'ui', take: 1, why: 'Huge and explosive: the knockout should feel like a big deal.', game: 'Super Smash Bros. Ultimate: the knockout',
      V: [{ w: 'noise', lp: 3500, d: .9, a: .002, g: .8 }, { w: 'sine', f: [220, 45], d: .8, g: .7 }, { w: 'sine', f: [2637, 2637], t: .15, d: 1.3, g: .12 }, { w: 'sine', f: [3951, 3951], t: .15, d: 1.0, g: .06 }] },
    { id: 'gravel', name: 'Footsteps on gravel', desc: 'four crunchy steps', cls: 'env', take: 2, why: 'Terrain footsteps are one of the many layers that build the field.', game: 'Breath of the Wild: footsteps by terrain',
      V: [0, 1, 2, 3].flatMap(steps) },
    { id: 'guardian', name: 'Sudden stinger', desc: 'three sharp, clashing stabs', cls: 'mus', take: 1, why: 'Dissonance cuts through the calm: you are in danger now.', game: 'Breath of the Wild: the Guardian stinger (slide 168)',
      V: stab(0, .1).concat(stab(.22, .12), stab(.44, .15)) },
    { id: 'died', name: 'Failure tone', desc: 'a low, heavy, held chord', cls: 'ui', take: 2, why: 'Heavy and final, against a bright victory fanfare.', game: 'Dark Souls: “You Died”',
      V: [{ w: 'sawtooth', f: [110, 104], d: 2.2, a: .3, r: 1.2, g: .13, lp: 650 }, { w: 'sawtooth', f: [116.5, 110], d: 2.2, a: .3, r: 1.2, g: .11, lp: 650 }, { w: 'sine', f: [55, 52], d: 2.2, a: .3, r: 1.2, g: .35 }] },
    { id: 'roar', name: 'Roar', desc: 'a huge, rough roar', cls: 'char', take: 2, why: 'A signature sound that stands out over the whole fight.', game: 'Monster Hunter World: Fatalis’s roar',
      V: [{ w: 'sawtooth', f: [190, 85], d: 1.6, a: .15, r: .8, g: .22, lp: 900 }, { w: 'sawtooth', f: [197, 88], d: 1.6, a: .15, r: .8, g: .18, lp: 900 }, { w: 'noise', bp: 900, q: .6, d: 1.6, a: .2, r: .9, g: .45 }] },
  ];
  const NS = SOUNDS.length;

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
  function voice(v, s0, dest) {
    const c = AU.ctx, s = s0 + (v.t || 0), d = v.d, a = v.a ?? .005, g = c.createGain();
    let src;
    if (v.w === 'noise') { src = c.createBufferSource(); src.buffer = AU.noise; src.loop = true; }
    else { src = c.createOscillator(); src.type = v.w; src.frequency.setValueAtTime(v.f[0], s); if (v.f[1] !== v.f[0]) src.frequency.exponentialRampToValueAtTime(v.f[1], s + d); }
    let node = src;
    if (v.lp || v.bp || v.hp) { const fl = c.createBiquadFilter(); fl.type = v.lp ? 'lowpass' : v.bp ? 'bandpass' : 'highpass'; fl.frequency.value = v.lp || v.bp || v.hp; fl.Q.value = v.q ?? .8; node.connect(fl); node = fl; }
    g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(v.g, s + a);
    if (v.r) g.gain.setValueAtTime(v.g, s + d - v.r);
    g.gain.exponentialRampToValueAtTime(.0005, s + d);
    node.connect(g); g.connect(dest); src.start(s); src.stop(s + d + .05);
    return { src, g };
  }
  function play(V, dest) { const c = AU.ctx; if (!c || !AU.on) return []; return V.map(v => voice(v, c.currentTime + .02, dest || AU.out)); }

  /* ---------- the same voices read back for drawing ---------- */
  const lenOf = V => Math.max(...V.map(v => (v.t || 0) + v.d));
  function envAt(v, k) {
    k -= v.t || 0; const a = v.a ?? .005, d = v.d;
    if (k < 0 || k > d) return 0;
    if (k < a) return v.g * k / a;
    const r = v.r || d - a, h = d - r;
    return k < h ? v.g : v.g * Math.pow(.0005 / v.g, (k - h) / Math.max(.001, r));
  }
  const levelAt = (V, k) => V.reduce((s, v) => s + envAt(v, k), 0);
  const hash = i => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
  // envelope (soft fill) plus a squiggle whose density follows each voice's pitch; noise draws as a scribble
  function drawWave(g, V, x, y, w, h, col, cur = -1) {
    const len = lenOf(V), n = Math.floor(w / 1.5), cy = y + h / 2;
    let peak = .001; for (let i = 0; i <= 80; i++) peak = Math.max(peak, levelAt(V, i / 80 * len));
    const sc = (h / 2 - 4) / peak, pts = [];
    g.fillStyle = col + '33'; g.beginPath(); g.moveTo(x, cy);
    for (let i = 0; i <= n; i++) { const k = i / n * len; g.lineTo(x + i / n * w, cy - levelAt(V, k) * sc); }
    for (let i = n; i >= 0; i--) { const k = i / n * len; g.lineTo(x + i / n * w, cy + levelAt(V, k) * sc); }
    g.closePath(); g.fill();
    for (let i = 0; i <= n; i++) {
      const k = i / n * len; let s = 0;
      V.forEach((v, j) => {
        const e = envAt(v, k); if (!e) return;
        if (v.w === 'noise') { s += e * (hash(i * 7 + j * 131) * 2 - 1); return; }
        const kk = Math.max(0, k - (v.t || 0)), f = v.f[0] * Math.pow(v.f[1] / v.f[0], clamp(kk / v.d)), ph = i * (.18 + .5 * clamp(Math.log2(f / 50) / 6.5)) + j;
        s += e * (v.w === 'square' ? Math.sign(Math.sin(ph)) : v.w === 'sawtooth' ? ((ph / TAU) % 1) * 2 - 1 : Math.sin(ph));
      });
      pts.push([x + i / n * w, cy - clamp(s * sc, -h / 2 + 2, h / 2 - 2)]);
    }
    g.strokeStyle = col; g.lineWidth = 1.4; g.beginPath(); pts.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.stroke();
    if (cur >= 0 && cur <= len) { const cx = x + cur / len * w; g.strokeStyle = C.red; g.lineWidth = 2.5; g.beginPath(); g.moveTo(cx, y - 4); g.lineTo(cx, y + h + 4); g.stroke(); }
    return len;
  }
  // rings that leave a source while it sounds: lv is the current level (0..~1)
  function rings(g, x, y, r0, lv, t, col) {
    if (lv <= .002) return;
    for (let i = 0; i < 3; i++) { const p = (t * 1.6 + i / 3) % 1, a = clamp(lv * 1.6) * (1 - p); g.strokeStyle = col; g.globalAlpha = a; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r0 + p * 46, 0, TAU); g.stroke(); }
    g.globalAlpha = 1;
  }
  function meter(g, x, y, w, h, lv, label) {
    const db = lv > 0 ? 20 * Math.log10(lv) : -99, k = clamp((db + 48) / 54);
    g.fillStyle = '#e6dcc5'; g.beginPath(); g.roundRect(x, y, w, h, 4); g.fill();
    const top = y + h - k * h;
    const grd = g.createLinearGradient(0, y + h, 0, y); grd.addColorStop(0, '#2fae63'); grd.addColorStop(.72, '#e0a92d'); grd.addColorStop(.89, '#e5322d');
    g.fillStyle = grd; g.fillRect(x + 2, top, w - 4, y + h - top);
    if (label) { g.font = '600 11px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText(label, x + w / 2, y + h + 14); }
  }
  function wrap(g, text, x, y, maxW, lh) {
    const words = text.split(' '); let line = '', n = 0;
    words.forEach(wd => { const tt = line ? line + ' ' + wd : wd; if (g.measureText(tt).width > maxW && line) { g.fillText(line, x, y + n * lh); n++; line = wd; } else line = tt; });
    if (line) { g.fillText(line, x, y + n * lh); n++; }
    return n;
  }
  const card = g => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const txt = (g, s, x, y, font, col, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'alphabetic'; g.fillText(s, x, y); };

  /* ---------- Mario-style pixel hero, copied from pve-interactions/shared/mario.js ---------- */
  const PAL = { R: '#d8322b', S: '#f2b98a', K: '#5a3216', B: '#2f56c9', Y: '#ffd23f', k: '#151515' };
  const HERO = ['...RRRR...', '..RRRRRRR.', '..KSSSSK..', '..SSkSkS..', '..SSSSSS..', '...SSSS...', '..RRBBRR..', '.RRBBBBRR.', '.SRBYYBRS.', '.S.BBBB.S.', '...BBBB...', '...B..B...', '..KK..KK..'];
  const HERO_JUMP = HERO.slice(0, 7).concat(['SRRBBBBRRS', '..RBYYBR..', '...BBBB...', '...BBBB...', '..B....B..', '.KK....KK.']);
  function spr(g, rows, x, foot, P) {
    const w = rows[0].length, h = rows.length;
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) { const ch = rows[r][c]; if (ch === '.') continue; g.fillStyle = PAL[ch]; g.fillRect(Math.round(x + (c - w / 2) * P), Math.round(foot - (h - r) * P), P, P); }
  }

  /* ================= Slide 1: the sorter ================= */
  const TOK = { x: 96, y: 152, r: 46 };
  const BIN = k => ({ x: 20 + k * 253, y: 252, w: 241, h: 322 });
  const chipPos = j => { const s = SOUNDS[j], b = BIN(CLS.indexOf(s.cls)), slot = SOUNDS.slice(0, j).filter(o => o.cls === s.cls).length; return { x: b.x + 10, y: b.y + 214 + slot * 32, w: b.w - 20, h: 26 }; };
  const NEXT = { x: 902, y: 202, w: 112, h: 26 };

  function binIcon(g, k, b, t, hop) {
    const cx = b.x + b.w / 2, cy = b.y + 84;
    if (k === 0) { spr(g, hop ? HERO_JUMP : HERO, cx, cy + 34 - (hop ? 16 : 0), 5); g.fillStyle = '#b5703a'; g.fillRect(cx - 50, cy + 34, 100, 8); g.fillStyle = '#8a4f22'; for (let i = 0; i < 5; i++) g.fillRect(cx - 50 + i * 20, cy + 34, 2, 8); }
    if (k === 1) {
      g.fillStyle = '#8a5a32'; g.fillRect(cx + 26, cy - 6, 10, 40);
      g.fillStyle = '#4f9a52'; g.beginPath(); g.arc(cx + 31, cy - 16, 24, 0, TAU); g.fill(); g.fillStyle = '#62b065'; g.beginPath(); g.arc(cx + 22, cy - 22, 12, 0, TAU); g.fill();
      g.strokeStyle = '#3f8a42'; g.lineWidth = 2.5;
      for (let i = 0; i < 9; i++) { const bx = cx - 60 + i * 9, sw = Math.sin(t * 2 + i) * 4; g.beginPath(); g.moveTo(bx, cy + 36); g.quadraticCurveTo(bx + sw * .5, cy + 22, bx + sw, cy + 10 + (i % 3) * 4); g.stroke(); }
      g.fillStyle = '#a8a39a'; g.beginPath(); g.ellipse(cx + 4, cy + 32, 14, 7, 0, 0, TAU); g.fill();
    }
    if (k === 2) {
      g.fillStyle = C.navy; g.beginPath(); g.roundRect(cx - 46, cy - 30, 92, 66, 8); g.fill();
      ['Resume', 'Items', 'Quit'].forEach((s, i) => txt(g, s, cx - 18, cy - 8 + i * 18, '600 12px Jost, sans-serif', i === 1 ? C.gold : '#d9def5'));
      g.fillStyle = C.gold; g.beginPath(); g.moveTo(cx - 34, cy + 5); g.lineTo(cx - 24, cy + 1); g.lineTo(cx - 34, cy - 3); g.fill();
    }
    if (k === 3) {
      g.strokeStyle = '#b9a988'; g.lineWidth = 1.5; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(cx - 56, cy - 20 + i * 10); g.lineTo(cx + 56, cy - 20 + i * 10); g.stroke(); }
      g.fillStyle = C.purple; g.strokeStyle = C.purple; g.lineWidth = 3;
      [[-24, 15], [8, 5], [36, -5]].forEach(([dx, dy]) => { g.beginPath(); g.ellipse(cx + dx, cy + dy, 7, 5, -.4, 0, TAU); g.fill(); g.beginPath(); g.moveTo(cx + dx + 6, cy + dy); g.lineTo(cx + dx + 6, cy - 34); g.stroke(); });
      g.lineWidth = 6; g.beginPath(); g.moveTo(cx - 18, cy - 34); g.lineTo(cx + 42, cy - 34); g.stroke();
    }
  }

  // v: { i, ans, playK, tok, fly, revealed, done, over, t }
  function drawSort(g, v) {
    T.use(g); card(g);
    const s = SOUNDS[Math.min(v.i, NS - 1)], answered = v.ans.filter(a => a != null).length, matched = v.ans.filter((a, j) => a === SOUNDS[j].cls).length;
    txt(g, v.done ? 'All twelve sounds sorted' : `Sound ${v.i + 1} of ${NS}`, 24, 38, '800 18px Montserrat, Jost, sans-serif', C.ink);
    txt(g, `matched ${matched} of ${answered}`, 1016, 38, '700 15px Jost, sans-serif', answered ? C.ink : C.muted, 'right');
    for (let j = 0; j < NS; j++) { const a = v.ans[j]; g.fillStyle = a == null ? '#e6dcc5' : a === SOUNDS[j].cls ? CLASSES[SOUNDS[j].cls].col : C.red; g.fillRect(300 + j * (480 / NS) + 1, 28, 480 / NS - 2, 12); }

    // now-playing panel
    g.fillStyle = '#efe6d2'; g.beginPath(); g.roundRect(16, 56, 612, 182, 12); g.fill();
    if (v.done) {
      txt(g, `You matched ${matched} of ${NS}.`, 40, 96, '800 20px Montserrat, Jost, sans-serif', C.ink);
      CLS.forEach((k, i) => {
        const tot = SOUNDS.filter(o => o.cls === k).length, got = SOUNDS.filter((o, j) => o.cls === k && v.ans[j] === k).length;
        g.fillStyle = CLASSES[k].col; g.beginPath(); g.roundRect(40 + i * 146, 116, 134, 54, 8); g.fill();
        txt(g, CLASSES[k].name, 52 + i * 146, 138, '700 14px Jost, sans-serif', '#fff'); txt(g, `${got} / ${tot}`, 52 + i * 146, 160, '800 17px Montserrat, Jost, sans-serif', '#fff');
      });
      txt(g, 'Each class has three takeaways (see the bins). Start over to try again, or tag your own clip on slide 3.', 40, 204, '500 13px Jost, sans-serif', C.muted);
    } else {
      const lv = v.playK >= 0 ? levelAt(s.V, v.playK) : 0;
      if (!v.revealed && !v.dragging) txt(g, v.playK >= 0 && v.playK < lenOf(s.V) ? 'playing…' : 'click: play · drag: sort', TOK.x, 222, '600 12px Jost, sans-serif', C.muted, 'center');
      txt(g, s.name, 170, 84, '800 17px Montserrat, Jost, sans-serif', C.ink);
      g.font = '800 17px Montserrat, Jost, sans-serif'; const nw = g.measureText(s.name).width;
      txt(g, '· ' + s.desc, 178 + nw, 84, '500 14px Jost, sans-serif', C.muted);
      g.fillStyle = '#fffaf0'; g.beginPath(); g.roundRect(170, 96, 426, 104, 8); g.fill();
      const col = v.revealed ? CLASSES[s.cls].col : C.ink, len = drawWave(g, s.V, 178, 100, 410, 96, col, v.playK >= 0 && v.playK <= lenOf(s.V) ? v.playK : -1);
      txt(g, '0 s', 178, 216, '500 11px Jost, sans-serif', C.muted); txt(g, `${len.toFixed(1)} s`, 588, 216, '500 11px Jost, sans-serif', C.muted, 'right');
      txt(g, 'what you hear, drawn: loudness and pitch over time', 383, 216, '500 11px Jost, sans-serif', C.muted, 'center');
      meter(g, 604, 98, 14, 100, lv);
    }

    // reveal panel
    g.fillStyle = '#efe6d2'; g.beginPath(); g.roundRect(640, 56, 384, 182, 12); g.fill();
    if (v.done) {
      txt(g, 'What the four bins show', 658, 88, '800 16px Montserrat, Jost, sans-serif', C.ink);
      g.font = '500 13px Jost, sans-serif'; g.fillStyle = C.ink;
      wrap(g, 'A footstep can be environment and a menu blip is never part of the world. Sort by what the sound does for the player, not by what makes it.', 658, 114, 350, 19);
    } else if (!v.revealed) {
      txt(g, 'Which class?', 658, 90, '800 17px Montserrat, Jost, sans-serif', C.ink);
      g.font = '500 14px Jost, sans-serif'; g.fillStyle = C.muted;
      wrap(g, 'Drag the disc into a bin, or click a bin. Each answer shows the class, the takeaway it shows and the game the deck uses for it.', 658, 116, 350, 20);
    } else {
      const k = s.cls, cl = CLASSES[k], pick = v.ans[v.i], hit = pick === k;
      g.fillStyle = cl.col; g.beginPath(); g.roundRect(654, 68, 150, 28, 8); g.fill();
      txt(g, cl.name, 729, 88, '800 15px Montserrat, Jost, sans-serif', '#fff', 'center');
      txt(g, hit ? '✓ matched' : `✗ you chose ${CLASSES[pick].name}`, 816, 88, '700 14px Jost, sans-serif', hit ? C.good : C.red);
      txt(g, cl.take[s.take], 658, 122, '800 16px Montserrat, Jost, sans-serif', C.ink);
      g.font = '500 13px Jost, sans-serif'; g.fillStyle = C.ink; const nl = wrap(g, s.why, 658, 144, 352, 18);
      txt(g, s.game, 658, 150 + nl * 18, 'italic 600 13px Jost, sans-serif', C.goldInk);
      txt(g, `deck slides ${cl.slides}`, 658, 168 + nl * 18, '500 12px Jost, sans-serif', C.muted);
      if (v.manual) {
        g.fillStyle = C.navy; g.beginPath(); g.roundRect(NEXT.x, NEXT.y, NEXT.w, NEXT.h, 8); g.fill();
        txt(g, v.i === NS - 1 ? 'Finish ▸' : 'Next sound ▸', NEXT.x + NEXT.w / 2, NEXT.y + 18, '700 13px Jost, sans-serif', '#fff', 'center');
      }
    }

    // bins
    CLS.forEach((k, bi) => {
      const b = BIN(bi), cl = CLASSES[k], cur = v.revealed && SOUNDS[v.i] && SOUNDS[v.i].cls === k, over = v.over === bi;
      g.fillStyle = over ? cl.soft : '#fffaf0'; g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h, 12); g.fill();
      g.strokeStyle = cl.col; g.lineWidth = cur || over ? 5 : 2.5; g.stroke();
      g.fillStyle = cl.col; g.beginPath(); g.roundRect(b.x, b.y, b.w, 34, [12, 12, 0, 0]); g.fill();
      txt(g, cl.name, b.x + 14, b.y + 23, '800 16px Montserrat, Jost, sans-serif', '#fff');
      txt(g, `slides ${cl.slides}`, b.x + b.w - 12, b.y + 22, '600 11px Jost, sans-serif', 'rgba(255,255,255,.85)', 'right');
      const hop = bi === 0 && v.playK >= 0 && v.playK < .5 && SOUNDS[v.i] && SOUNDS[v.i].id === 'jump';
      binIcon(g, bi, b, v.t, hop);
      cl.take.forEach((tk, ti) => {
        const lit = cur && SOUNDS[v.i].take === ti;
        if (lit) { g.fillStyle = cl.soft; g.fillRect(b.x + 6, b.y + 147 + ti * 20, b.w - 12, 19); }
        txt(g, '• ' + tk, b.x + 12, b.y + 161 + ti * 20, lit ? '700 13px Jost, sans-serif' : '500 13px Jost, sans-serif', lit ? C.ink : C.muted);
      });
      g.strokeStyle = '#e3d8bf'; g.lineWidth = 1; g.beginPath(); g.moveTo(b.x + 10, b.y + 206); g.lineTo(b.x + b.w - 10, b.y + 206); g.stroke();
    });
    // sorted chips, always in the class they belong to; a red edge marks a mis-sort
    for (let j = 0; j < NS; j++) {
      if (v.ans[j] == null || (j === v.i && v.fly && v.fly.k < 1)) continue;
      const p = chipPos(j), s2 = SOUNDS[j], hit = v.ans[j] === s2.cls;
      g.fillStyle = CLASSES[s2.cls].soft; g.beginPath(); g.roundRect(p.x, p.y, p.w, p.h, 7); g.fill();
      g.strokeStyle = hit ? CLASSES[s2.cls].col : C.red; g.lineWidth = 2; if (!hit) g.setLineDash([5, 4]); g.stroke(); g.setLineDash([]);
      txt(g, s2.name, p.x + 9, p.y + 18, '600 12px Jost, sans-serif', C.ink);
      txt(g, hit ? '✓' : `✗ was ${CLASSES[v.ans[j]].name}`, p.x + p.w - 7, p.y + 18, '700 11px Jost, sans-serif', hit ? C.good : C.red, 'right');
    }
    // the disc in flight
    if (v.fly) {
      const q = chipPos(v.i), k = ease(clamp(v.fly.k)), x = lerp(v.fly.x, q.x + q.w / 2, k), y = lerp(v.fly.y, q.y + q.h / 2, k), r = lerp(TOK.r, 13, k);
      g.fillStyle = '#fffaf0'; g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke();
    }
    // the sound's disc: click to play, drag to sort (drawn last so it stays above the bins)
    if (!v.done && v.tok && !v.fly) {
      const lv = v.playK >= 0 ? levelAt(s.V, v.playK) : 0;
      rings(g, v.tok.x, v.tok.y, TOK.r, lv, v.t, C.navy);
      g.fillStyle = '#fffaf0'; g.strokeStyle = C.navy; g.lineWidth = 4; g.beginPath(); g.arc(v.tok.x, v.tok.y, TOK.r, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = C.navy; g.beginPath(); g.moveTo(v.tok.x - 12, v.tok.y - 18); g.lineTo(v.tok.x + 20, v.tok.y); g.lineTo(v.tok.x - 12, v.tok.y + 18); g.closePath(); g.fill();
    }
    if (v.dragging && v.tok) txt(g, s.name, v.tok.x, v.tok.y + TOK.r + 18, '700 13px Jost, sans-serif', C.ink, 'center');
  }

  // walk-through: every sound in turn; the gravel footsteps are first dropped in Character, a common mix-up
  const SLOT = 2.2, END = 2.8, SDUR = NS * SLOT + END, SLIP = SOUNDS.findIndex(s => s.id === 'gravel');
  function tourView(t) {
    const ans = Array(NS).fill(null), pick = j => j === SLIP ? 'char' : SOUNDS[j].cls;
    if (t >= NS * SLOT) { for (let j = 0; j < NS; j++) ans[j] = pick(j); return { i: NS - 1, ans, playK: -1, tok: null, fly: null, revealed: false, done: true, over: -1, t }; }
    const i = Math.floor(t / SLOT), f = t - i * SLOT;
    for (let j = 0; j < i; j++) ans[j] = pick(j);
    const bin = CLS.indexOf(pick(i)), b = BIN(bin);
    let tok = { x: TOK.x, y: TOK.y }, fly = null, over = -1;
    // drag towards the bin between 1.0 and 1.35 s, then drop
    if (f > 1.0) { const k = ease(clamp((f - 1.0) / .35)); tok = { x: lerp(TOK.x, b.x + b.w / 2, k), y: lerp(TOK.y, b.y + 100, k) }; if (k > .7) over = bin; }
    if (f > 1.35) { ans[i] = pick(i); fly = { x: b.x + b.w / 2, y: b.y + 100, k: (f - 1.35) / .3 }; over = -1; }
    return { i, ans, playK: f - .15, tok, fly, revealed: f > 1.35, done: false, over, t, dragging: f > 1.0 && f <= 1.35 };
  }

  const scenes = {};
  canvasDemo('fc-sort', (s, cv, g) => {
    const st = { tour: true, held: false, t: 0, i: 0, ans: Array(NS).fill(null), playT: -99, tok: { x: TOK.x, y: TOK.y }, drag: null, fly: null, over: -1, done: false, lastSlot: -1, key: '' };
    const tourBtn = $(s, '.fc-tour');
    const reset = () => { st.i = 0; st.ans = Array(NS).fill(null); st.playT = -99; st.tok = { x: TOK.x, y: TOK.y }; st.fly = null; st.done = false; st.drag = null; };
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); reset(); } };
    const playNow = () => { if (st.done) return; audioUp(); play(SOUNDS[st.i].V); st.playT = st.t; };
    const next = () => { if (st.ans[st.i] == null) return; if (st.i >= NS - 1) { st.done = true; return; } st.i++; st.fly = null; st.tok = { x: TOK.x, y: TOK.y }; playNow(); };
    const answer = (k, from) => { if (st.done || st.ans[st.i] != null) return; st.ans[st.i] = CLS[k]; st.fly = { x: from.x, y: from.y, t0: st.t }; st.drag = null; st.over = -1; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.lastSlot = -1; tourBtn.classList.add('on'); };
    $(s, '.fc-play').onclick = () => { manual(); playNow(); };
    $(s, '.fc-next').onclick = () => { manual(); next(); };
    $(s, '.fc-reset').onclick = () => { manual(); reset(); };
    $$(s, '.snd').forEach(b => b.onclick = () => { audioUp(); setSound(!AU.on); });
    const at = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
    const binAt = p => CLS.findIndex((k, i) => { const b = BIN(i); return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h; });
    const inNext = p => p.x >= NEXT.x && p.x <= NEXT.x + NEXT.w && p.y >= NEXT.y && p.y <= NEXT.y + NEXT.h;
    cv.addEventListener('pointerdown', e => {
      const p = at(e); manual();
      if (st.done) return;
      if (st.ans[st.i] != null) { if (inNext(p)) next(); return; }
      if (Math.hypot(p.x - st.tok.x, p.y - st.tok.y) <= TOK.r + 4) { st.drag = { dx: p.x - st.tok.x, dy: p.y - st.tok.y, moved: false, x0: p.x, y0: p.y }; cv.setPointerCapture(e.pointerId); return; }
      const k = binAt(p); if (k >= 0) answer(k, st.tok);
    });
    cv.addEventListener('pointermove', e => {
      const p = at(e);
      if (st.drag) { if (Math.hypot(p.x - st.drag.x0, p.y - st.drag.y0) > 6) st.drag.moved = true; st.tok = { x: p.x - st.drag.dx, y: p.y - st.drag.dy }; st.over = binAt(p); }
      const hot = !st.tour && !st.done && (st.ans[st.i] == null ? (Math.hypot(p.x - st.tok.x, p.y - st.tok.y) <= TOK.r || binAt(p) >= 0) : inNext(p));
      cv.style.cursor = st.drag ? 'grabbing' : hot ? 'pointer' : '';
    });
    cv.addEventListener('pointerup', e => {
      if (!st.drag) return; const p = at(e), d = st.drag; st.drag = null; st.over = -1;
      const k = binAt(p);
      if (d.moved && k >= 0) answer(k, st.tok);
      else { st.tok = { x: TOK.x, y: TOK.y }; if (!d.moved) playNow(); }
    });
    function info(v) {
      const answered = v.ans.filter(a => a != null).length, matched = v.ans.filter((a, j) => a === SOUNDS[j].cls).length;
      const key = [v.i, answered, v.done, v.revealed].join();
      if (key === st.key) return; st.key = key;
      say($(s, '.fc-stats'), `<div class="g"><b>${matched}/${answered}</b><span>matched so far</span></div><div><b>${v.done ? NS : v.i + 1}/${NS}</b><span>sounds</span></div>`);
      const so = SOUNDS[v.i];
      say($(s, '.fc-out'), v.done ? 'Character sounds represent actions, show traits and stand out. Environment sounds warn, set the place and stack in layers. UI sounds guide from outside the world and mark success or failure. Music sets tone, gives context and flags state changes.'
        : v.revealed ? `<b>${CLASSES[so.cls].name}:</b> ${CLASSES[so.cls].take[so.take].toLowerCase()}. ${so.game}.` : `Listen to <b>${so.name.toLowerCase()}</b> (${so.desc}). Which class is it?`);
    }
    function manualView() {
      const fl = st.fly ? { x: st.fly.x, y: st.fly.y, k: (st.t - st.fly.t0) / .3 } : null;
      return { i: st.i, ans: st.ans, playK: st.t - st.playT, tok: st.tok, fly: fl && fl.k < 1 ? fl : null, revealed: st.ans[st.i] != null, done: st.done, over: st.over, t: st.t, manual: true, dragging: !!(st.drag && st.drag.moved) };
    }
    scenes.sort = { seek(t) { st.held = true; const v = tourView(t); drawSort(g, v); info(v); }, dur: () => SDUR };
    return dt => {
      if (st.held) return;
      st.t += Math.max(0, dt);
      if (st.tour) {
        if (st.t >= SDUR) { st.t = 0; st.lastSlot = -1; }
        const slot = Math.floor(st.t / SLOT);
        if (slot !== st.lastSlot) { st.lastSlot = slot; if (slot < NS && st.t - slot * SLOT < .5) play(SOUNDS[slot].V); }
        const v = tourView(st.t); drawSort(g, v); info(v);
      } else { const v = manualView(); drawSort(g, v); info(v); }
    };
  });

  /* ================= Slide 2: environment layers ================= */
  // Timing of the one ambient loop. The walker crosses the field in LOOP s; terrain changes under the feet.
  const LAYER = {
    loop: 12, step: .45, stepFrom: .2,
    terrain: [['grass', 0, 380, '#8cc56b'], ['stone', 380, 660, '#b9b5ab'], ['wood', 660, 1040, '#b98a55']],
    stepGain: { grass: .45, stone: .8, wood: .7 },
    chirpEvery: 1.1, dropEvery: 6, dropAt: 4.5,
  };
  const LKEYS = ['grass', 'birds', 'steps', 'drop'];
  const LNAME = { grass: 'Grass in the wind', birds: 'Birds', steps: 'Footsteps by terrain', drop: 'A dropped boulder' };
  const LCOL = { grass: '#3f9a4c', birds: '#2ea3dc', steps: '#9a5a06', drop: '#8a4fd6' };
  const STEP_V = {
    grass: [{ w: 'noise', bp: 1300, q: .7, d: .14, g: .3 }, { w: 'noise', bp: 4000, q: .6, d: .09, g: .12 }],
    stone: [{ w: 'noise', bp: 3200, q: 1.5, d: .07, g: .45 }, { w: 'sine', f: [190, 120], d: .06, g: .25 }],
    wood: [{ w: 'sine', f: [230, 160], d: .13, g: .45 }, { w: 'noise', bp: 800, q: 1, d: .08, g: .25 }],
  };
  const CHIRP_V = [{ w: 'sine', f: [2600, 3900], d: .09, g: .14 }, { w: 'sine', f: [2900, 4300], t: .12, d: .08, g: .11 }];
  const DROP_V = [{ w: 'sine', f: [95, 38], d: .7, g: .9 }, { w: 'noise', lp: 300, d: .5, g: .6 }, { w: 'noise', lp: 520, t: .1, d: 1.3, a: .1, r: 1.0, g: .22 }];
  const walkX = tt => 30 + ((tt % LAYER.loop + LAYER.loop) % LAYER.loop) / LAYER.loop * 980;
  const terrainAt = x => LAYER.terrain.find(([, a, b]) => x >= a && x < b) || LAYER.terrain[2];
  const chirpT = n => n * LAYER.chirpEvery + hash(n + 3) * .6;
  const stepT = n => LAYER.stepFrom + n * LAYER.step;
  const dropT = n => LAYER.dropAt + n * LAYER.dropEvery;
  // each layer's loudness at time tt (the same numbers drive the drawn lanes and the meters)
  function lvl(k, tt) {
    if (tt < 0) return 0;
    if (k === 'grass') return .2 + .1 * Math.sin(tt * 1.3) + .05 * Math.sin(tt * 3.7 + 1);
    if (k === 'birds') { let s = 0; const n0 = Math.floor(tt / LAYER.chirpEvery); for (let n = n0 - 1; n <= n0 + 1; n++) { const d = tt - chirpT(n); if (n >= 0 && d >= 0 && d < .3) s += .55 * Math.exp(-d * 9) * (.6 + .4 * Math.sin(d * 90)); } return s; }
    if (k === 'steps') { const n = Math.floor((tt - LAYER.stepFrom) / LAYER.step); if (n < 0) return 0; const d = tt - stepT(n); return Math.exp(-d * 26) * LAYER.stepGain[terrainAt(walkX(stepT(n)))[0]]; }
    if (k === 'drop') { const n = Math.floor((tt - LAYER.dropAt) / LAYER.dropEvery); if (n < 0) return 0; const d = tt - dropT(n); let s = d < .9 ? Math.exp(-d * 6) : 0; if (d > .1 && d < 1.4) s += .25 * (1 - (d - .1) / 1.3) * (.7 + .3 * Math.sin(d * 40)); return s; }
    return 0;
  }
  const BED = { n: null };   // the looping grass bed, shared so leaving the slide can silence it
  const LANE = k => ({ x: 180, y: 318 + k * 66, w: 744, h: 58 });
  const HIST = 6;

  function drawField(g, on, tt, cap) {
    T.use(g); card(g);
    g.save(); g.beginPath(); g.roundRect(8, 8, W - 16, 292, 12); g.clip();
    const sky = g.createLinearGradient(0, 8, 0, 240); sky.addColorStop(0, '#f6f1e3'); sky.addColorStop(1, '#e4ece6'); g.fillStyle = sky; g.fillRect(8, 8, W - 16, 292);
    g.fillStyle = '#c9d8c2'; g.beginPath(); g.moveTo(8, 200); for (let x = 8; x <= W; x += 20) g.lineTo(x, 180 - 26 * Math.sin(x / 140) - 12 * Math.sin(x / 47)); g.lineTo(W, 240); g.lineTo(8, 240); g.fill();
    // cliff for the boulder
    g.fillStyle = '#8b8fa8'; g.beginPath(); g.moveTo(930, 240); g.lineTo(950, 128); g.lineTo(1032, 118); g.lineTo(1032, 240); g.fill(); g.fillStyle = '#62688a'; g.fillRect(950, 124, 82, 8);
    // terrain bands
    LAYER.terrain.forEach(([name, a, b, col]) => {
      g.fillStyle = col; g.fillRect(a, 236, b - a, 64);
      if (name === 'stone') { g.strokeStyle = '#8f8b82'; g.lineWidth = 2; for (let x = a; x < b; x += 46) g.strokeRect(x + 2, 240, 42, 22); }
      if (name === 'wood') { g.strokeStyle = '#7d5226'; g.lineWidth = 2; for (let x = a; x < b; x += 18) { g.beginPath(); g.moveTo(x, 236); g.lineTo(x, 266); g.stroke(); } }
      T.label(name, (a + Math.min(b, 930)) / 2, 284, 'center', C.ink, 13);
    });
    // grass blades sway with the gust
    const gust = lvl('grass', tt);
    g.strokeStyle = '#4f9a52'; g.lineWidth = 2;
    for (let i = 0; i < 70; i++) { const bx = 6 + i * 5.4, sw = Math.sin(tt * 2.2 + i * .7) * gust * 22; g.beginPath(); g.moveTo(bx, 240); g.quadraticCurveTo(bx + sw * .4, 226, bx + sw, 210 + (i % 4) * 5); g.stroke(); }
    if (on.grass) for (let i = 0; i < 4; i++) { const px = ((tt * 90 + i * 110) % 420) - 20; g.strokeStyle = `rgba(63,154,76,${.25 + gust})`; g.lineWidth = 2; g.beginPath(); g.moveTo(px, 198 - i * 6); g.quadraticCurveTo(px + 20, 190 - i * 6, px + 44, 198 - i * 6); g.stroke(); }
    // birds
    for (let b = 0; b < 3; b++) {
      const bx = ((tt * (60 + b * 14) + b * 380) % 1180) - 70, by = 58 + b * 24 + Math.sin(tt * 2 + b) * 6, fl = Math.sin(tt * 12 + b) * 6;
      g.strokeStyle = C.navy; g.lineWidth = 2.5; g.beginPath(); g.moveTo(bx - 10, by - fl); g.lineTo(bx, by); g.lineTo(bx + 10, by - fl); g.stroke();
    }
    if (on.birds) { const n0 = Math.floor(tt / LAYER.chirpEvery); for (let n = n0 - 1; n <= n0; n++) { const d = tt - chirpT(n); if (n < 0 || d < 0 || d > .6) continue; const b = n % 3, bx = ((chirpT(n) * (60 + b * 14) + b * 380) % 1180) - 70, by = 58 + b * 24; g.strokeStyle = LCOL.birds; g.globalAlpha = 1 - d / .6; g.lineWidth = 2.5; g.beginPath(); g.arc(bx, by, 10 + d * 50, 0, TAU); g.stroke(); g.globalAlpha = 1; txt(g, '♪', bx + 14, by - 12 - d * 20, '700 16px Jost, sans-serif', LCOL.birds); } }
    // the walker (grey-box, side view)
    const wx = walkX(tt), ph = ((tt - LAYER.stepFrom) / LAYER.step) % 2, leg = Math.sin(ph * Math.PI) * 9;
    g.strokeStyle = C.navy; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(wx, 212); g.lineTo(wx - leg, 236); g.moveTo(wx, 212); g.lineTo(wx + leg, 236); g.stroke();
    g.fillStyle = C.player; g.beginPath(); g.roundRect(wx - 9, 180, 18, 34, 7); g.fill(); g.fillStyle = '#f2d2b0'; g.beginPath(); g.arc(wx, 170, 10, 0, TAU); g.fill(); g.lineCap = 'butt';
    if (on.steps) { const n = Math.floor((tt - LAYER.stepFrom) / LAYER.step), d = tt - stepT(n); if (n >= 0 && d < .35) { const tr = terrainAt(walkX(stepT(n))); g.strokeStyle = LCOL.steps; g.globalAlpha = 1 - d / .35; g.lineWidth = 3; g.beginPath(); g.ellipse(walkX(stepT(n)), 238, 10 + d * 60, 4 + d * 16, 0, 0, TAU); g.stroke(); g.globalAlpha = 1; T.label(tr[0], wx, 146, 'center', LCOL.steps, 12); } }
    // the boulder: falls off the cliff, hits, rolls left
    { const n = Math.floor((tt - LAYER.dropAt + .55) / LAYER.dropEvery), d = tt - (n >= 0 ? dropT(n) : -99);
      if (n >= 0 && d > -.55 && d < 3) { const fall = clamp((d + .55) / .55), x = d < 0 ? 960 - fall * 20 : 940 - ease(clamp(d / 1.4)) * 110, y = d < 0 ? 104 + fall * fall * 116 : 220, rot = d * 5;
        g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = '#7f7a70'; g.beginPath(); g.arc(0, 0, 16, 0, TAU); g.fill(); g.fillStyle = '#9d988d'; g.beginPath(); g.arc(-5, -5, 6, 0, TAU); g.fill(); g.restore();
        if (on.drop && d >= 0 && d < .7) { g.strokeStyle = LCOL.drop; g.globalAlpha = 1 - d / .7; g.lineWidth = 4; g.beginPath(); g.arc(940, 224, 18 + d * 110, Math.PI, TAU); g.stroke(); g.globalAlpha = 1; T.label('thud', 940, 150, 'center', LCOL.drop, 13); }
      } }
    g.restore();
    g.fillStyle = 'rgba(255,252,244,.9)'; g.beginPath(); g.roundRect(12, 12, 330, 52, 10); g.fill();
    txt(g, 'One ambient loop, four layers', 22, 34, '800 17px Montserrat, Jost, sans-serif', C.ink);
    txt(g, 'Breath of the Wild’s field (slides 137-139)', 22, 54, '500 13px Jost, sans-serif', C.muted);
    if (cap) T.label(cap, 1020, 30, 'right', C.ink, 14);

    // lanes: the last six seconds of each layer, newest at the right
    let mix = 0;
    LKEYS.forEach((k, li) => {
      const L = LANE(li), now = lvl(k, tt), cy = L.y + L.h / 2;
      g.fillStyle = on[k] ? '#fffaf0' : '#eee7d6'; g.beginPath(); g.roundRect(12, L.y, W - 24, L.h, 9); g.fill();
      txt(g, LNAME[k], 24, L.y + 24, '700 14px Jost, sans-serif', on[k] ? C.ink : C.muted);
      g.fillStyle = on[k] ? LCOL[k] : '#c9bfa7'; g.beginPath(); g.roundRect(24, L.y + 32, on[k] ? 34 : 56, 18, 6); g.fill();
      txt(g, on[k] ? 'on' : 'muted', 24 + (on[k] ? 17 : 28), L.y + 45, '700 11px Jost, sans-serif', '#fff', 'center');
      if (on[k]) {
        g.fillStyle = LCOL[k];
        for (let px = 0; px < L.w; px += 2) { const tau = tt - HIST + px / L.w * HIST, a = lvl(k, tau) * (.55 + .45 * hash(Math.floor(tau * 220))) * (L.h / 2 - 3) / .9; if (a > .4) g.fillRect(L.x + px, cy - a, 1.6, a * 2); }
        mix += now;
      } else { g.strokeStyle = '#c9bfa7'; g.lineWidth = 2; g.beginPath(); g.moveTo(L.x, cy); g.lineTo(L.x + L.w, cy); g.stroke(); }
      g.strokeStyle = 'rgba(38,44,106,.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(L.x + L.w, L.y + 4); g.lineTo(L.x + L.w, L.y + L.h - 4); g.stroke();
      meter(g, 936, L.y + 6, 12, L.h - 12, on[k] ? now : 0);
    });
    meter(g, 970, 324, 30, 240, mix * .8);
    txt(g, 'mix', 985, 580, '700 12px Jost, sans-serif', C.ink, 'center');
    txt(g, `${LKEYS.filter(k => on[k]).length} of 4 layers`, 920, 312, '600 11px Jost, sans-serif', C.muted, 'right');
    txt(g, '← 6 s ago', 182, 312, '600 11px Jost, sans-serif', C.muted);
  }

  const LSTEPS = [[0, [], 'All layers muted: a silent field'], [3, ['grass'], '+ grass: wind moving through the blades'], [7, ['grass', 'birds'], '+ birds: life, and a sense of space'],
    [11, ['grass', 'birds', 'steps'], '+ footsteps: the ground changes under you'], [15.5, LKEYS, '+ a boulder: one event on top of the bed'], [20, LKEYS, 'Layers that work together, rather than any one (137)']];
  const LDUR = 27;
  const tourOn = t => { const s = LSTEPS.filter(x => t >= x[0]).at(-1); const on = {}; LKEYS.forEach(k => on[k] = s[1].includes(k)); return { on, cap: s[2] }; };

  canvasDemo('fc-layers', (s, cv, g) => {
    const st = { tour: true, held: false, t: 0, on: { grass: false, birds: false, steps: false, drop: false }, key: '' };
    const tourBtn = $(s, '.fl-tour'), boxes = $$(s, '.fl-l');
    const syncBoxes = on => boxes.forEach(b => { b.checked = !!on[b.dataset.l]; });
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); const o = tourOn(st.t % LDUR).on; LKEYS.forEach(k => st.on[k] = o[k]); } };
    boxes.forEach(b => b.onchange = () => { manual(); st.on[b.dataset.l] = b.checked; });
    $(s, '.fl-all').onclick = () => { manual(); LKEYS.forEach(k => st.on[k] = true); syncBoxes(st.on); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    $$(s, '.snd').forEach(b => b.onclick = () => { audioUp(); setSound(!AU.on); });
    cv.addEventListener('pointerdown', () => { /* a click on the canvas only wakes the audio */ });
    // the grass bed is one looping noise source; the other layers are events fired as the clock passes them
    function bed(level) {
      const c = AU.ctx; if (!c) return;
      if (!BED.n) { const src = c.createBufferSource(); src.buffer = AU.noise; src.loop = true; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = .45; const gn = c.createGain(); gn.gain.value = 0; src.connect(f); f.connect(gn); gn.connect(AU.out); src.start(); BED.n = { src, gn }; }
      BED.n.gn.gain.setTargetAtTime(level, c.currentTime, .08);
    }
    function fire(on, a, b) {
      if (!AU.ctx || b <= a || b - a > .5) return;
      const pass = (fT, from) => { const out = []; for (let n = Math.max(0, from(a)); fT(n) < b; n++) if (fT(n) >= a) out.push(n); return out; };
      if (on.steps) pass(stepT, x => Math.floor((x - LAYER.stepFrom) / LAYER.step)).forEach(n => play(STEP_V[terrainAt(walkX(stepT(n)))[0]]));
      if (on.birds) pass(chirpT, x => Math.floor(x / LAYER.chirpEvery) - 1).forEach(() => play(CHIRP_V));
      if (on.drop) pass(dropT, x => Math.floor((x - LAYER.dropAt) / LAYER.dropEvery)).forEach(() => play(DROP_V));
    }
    function info(on) {
      const n = LKEYS.filter(k => on[k]).length, key = LKEYS.map(k => +on[k]).join();
      if (key === st.key) return; st.key = key; syncBoxes(on);
      say($(s, '.fl-stats'), `<div class="${n === 4 ? 'g' : n ? 'y' : 'r'}"><b>${n}/4</b><span>layers in the loop</span></div>`);
      say($(s, '.fl-out'), n === 0 ? 'A field with nothing in it. Add the layers one at a time and listen to (and watch) the place appear.'
        : n === 4 ? 'All four together: wind, birds, the ground under your feet and one event. No single layer makes the field; the stack does.'
          : `Now: ${LKEYS.filter(k => on[k]).map(k => LNAME[k].toLowerCase()).join(', ')}. Breath of the Wild layers these so the field sounds alive and changes as you move.`);
    }
    scenes.layers = { seek(t) { st.held = true; const o = tourOn(t); drawField(g, o.on, t, o.cap); info(o.on); }, dur: () => LDUR };
    return dt => {
      if (st.held) return;
      const a = st.t; st.t += Math.max(0, dt);
      let on = st.on, cap = '';
      if (st.tour) { if (st.t >= LDUR) { st.t = 0; } const o = tourOn(st.t); on = o.on; cap = o.cap; }
      if (st.t >= a) fire(on, a, st.t);
      bed(on.grass ? lvl('grass', st.t) * .5 : 0);
      drawField(g, on, st.t, cap); info(on);
    };
  }, { leave() { if (BED.n) BED.n.gn.gain.setTargetAtTime(0, AU.ctx.currentTime, .05); } });

  window.__seek = (t, which = 'sort') => scenes[which].seek(t);
  window.__dur = (which = 'sort') => scenes[which].dur();
})();
