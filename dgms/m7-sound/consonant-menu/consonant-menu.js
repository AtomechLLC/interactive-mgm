/* Consonant and dissonant menu (DGMS Module 7, Sound Design: UI/UX sounds, slides 145-147).
   Persona 5's menu: "Consonant sounds indicate relief from tension… dissonant sounds accentuate tension" (146).
   A small pause menu in the course style. Confirming an item plays a consonant chord (a major triad, simple frequency
   ratios); Back and the unavailable item play dissonant ones (a minor second and a tritone, complex ratios). A toggle
   swaps the two so the learner hears how wrong a dissonant confirm feels. The right side draws the chord just played:
   its notes on a staff, each interval's frequency ratio as a bar (longer = more complex = rougher), and the notes summed
   over 40 ms, smooth for the triad and beating for the cluster.
   Tunable rules: CHORDS (MIDI notes, voices, timing) and INTERVALS (names and just ratios by semitone count) at the top;
   TOUR is the walk-through's script. __seek(t) is a pure function of t and never plays audio. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585;
  const HZ = n => 440 * Math.pow(2, (n - 69) / 12);

  /* ---------- the chords ---------- */
  const CHORDS = {
    cons: { name: 'C major triad', notes: [72, 76, 79], feel: 'consonant',
      V: n => n.map((m, i) => ({ w: 'triangle', f: [HZ(m), HZ(m)], t: i * .06, d: .6, g: .17 })).concat([{ w: 'sine', f: [HZ(84), HZ(84)], t: .18, d: .5, g: .06 }]) },
    diss: { name: 'C, C♯ and F♯ together', notes: [72, 73, 78], feel: 'dissonant',
      V: n => n.map(m => ({ w: 'sawtooth', f: [HZ(m), HZ(m) * .97], d: .38, g: .08, lp: 2400 })) },
    lock: { name: 'G, G♯ and C♯ as a buzz', notes: [67, 68, 73], feel: 'dissonant',
      V: n => [0, .13].flatMap(t => n.map(m => ({ w: 'square', f: [HZ(m), HZ(m)], t, d: .12, g: .06, lp: 1300 }))) },
  };
  // interval by semitones: name and the simple (just) ratio it approximates
  const INTERVALS = { 1: ['minor second', 16, 15], 2: ['major second', 9, 8], 3: ['minor third', 6, 5], 4: ['major third', 5, 4], 5: ['perfect fourth', 4, 3], 6: ['tritone', 45, 32], 7: ['perfect fifth', 3, 2], 12: ['octave', 2, 1] };
  const rough = (p, q) => Math.log2(p * q);   // Tenney height: small = simple ratio = smooth
  const ROUGH_MAX = 11, SMOOTH_BELOW = 6;
  const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const LETTER = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];   // C D E F G A B as 0..6
  const ITEMS = [['Resume', 1], ['Items', 1], ['Skills', 1], ['Save', 0], ['Options', 1], ['Quit to title', 1]];
  // which chord each action plays, as designed and swapped
  const chordFor = (kind, swapped) => kind === 'ok' ? (swapped ? 'diss' : 'cons') : kind === 'lock' ? (swapped ? 'cons' : 'lock') : (swapped ? 'cons' : 'diss');

  /* ---------- synth (Web Audio, no files). The AudioContext is made on the first click anywhere on the page. ---------- */
  const AU = { ctx: null, out: null, on: true };
  function audioUp() {
    const c0 = AU.ctx; if (c0) { if (c0.state === 'suspended') c0.resume(); return c0; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    const c = AU.ctx = new AC();
    AU.out = c.createGain(); AU.out.gain.value = AU.on ? .8 : 0; AU.out.connect(c.destination);
    return c;
  }
  document.addEventListener('pointerdown', audioUp, true);
  function setSound(on) {
    AU.on = on; if (AU.out) AU.out.gain.setTargetAtTime(on ? .8 : 0, AU.ctx.currentTime, .02);
    $$(document, '.snd').forEach(b => { b.classList.toggle('on', on); b.textContent = on ? '♪ Sound on' : '♪ Sound off'; });
  }
  // a voice: { w, f: [Hz start, Hz end], t, d, a, g, lp }
  function voice(v, s0) {
    const c = AU.ctx, s = s0 + (v.t || 0), d = v.d, a = v.a ?? .005, g = c.createGain(), o = c.createOscillator();
    o.type = v.w; o.frequency.setValueAtTime(v.f[0], s); if (v.f[1] !== v.f[0]) o.frequency.exponentialRampToValueAtTime(v.f[1], s + d);
    let node = o; if (v.lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = v.lp; o.connect(fl); node = fl; }
    g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(v.g, s + a); g.gain.exponentialRampToValueAtTime(.0005, s + d);
    node.connect(g); g.connect(AU.out); o.start(s); o.stop(s + d + .05);
  }
  const playChord = key => { const c = AU.ctx; if (!c || !AU.on) return; const ch = CHORDS[key]; ch.V(ch.notes).forEach(v => voice(v, c.currentTime + .02)); };
  const envAt = (v, k) => { k -= v.t || 0; const a = v.a ?? .005; if (k < 0 || k > v.d) return 0; return k < a ? v.g * k / a : v.g * Math.pow(.0005 / v.g, (k - a) / (v.d - a)); };
  const levelOf = (key, k) => { const ch = CHORDS[key]; return ch.V(ch.notes).reduce((s, v) => s + envAt(v, k), 0); };

  const txt = (g, s, x, y, font, col, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'alphabetic'; g.fillText(s, x, y); };
  function wrap(g, text, x, y, maxW, lh) {
    const words = text.split(' '); let line = '', n = 0;
    words.forEach(wd => { const tt = line ? line + ' ' + wd : wd; if (g.measureText(tt).width > maxW && line) { g.fillText(line, x, y + n * lh); n++; line = wd; } else line = tt; });
    if (line) { g.fillText(line, x, y + n * lh); n++; }
    return n;
  }

  /* ---------- the menu ---------- */
  const MX = 70, MY = 70, MW = 400, IY = i => MY + 96 + i * 44;
  const BTN = { ok: { x: MX + 24, y: MY + 384, w: 166, h: 40 }, back: { x: MX + 210, y: MY + 384, w: 166, h: 40 } };
  function drawMenu(g, v) {
    // a dimmed grey-box game behind the pause menu
    g.fillStyle = '#c9c3b2'; g.beginPath(); g.roundRect(14, 14, 512, 557, 12); g.fill();
    T.use(g); T.floor(14, 300, 512, 271); g.fillStyle = '#9aa0b8'; g.fillRect(14, 14, 512, 286);
    T.player(150, 430, -.4); T.foe(390, 380, 20, Math.PI, C.red, { mark: 'horns' });
    g.fillStyle = 'rgba(10,14,34,.55)'; g.beginPath(); g.roundRect(14, 14, 512, 557, 12); g.fill();
    // menu card
    g.fillStyle = C.navy; g.strokeStyle = C.gold; g.lineWidth = 3; g.beginPath(); g.roundRect(MX, MY, MW, 440, 14); g.fill(); g.stroke();
    txt(g, 'PAUSED', MX + 28, MY + 52, '800 30px Montserrat, Jost, sans-serif', C.gold);
    txt(g, v.swapped ? 'sounds: swapped' : 'sounds: as designed', MX + MW - 24, MY + 50, '700 13px Jost, sans-serif', v.swapped ? '#ff8f8a' : '#9fe0b5', 'right');
    ITEMS.forEach(([name, ok], i) => {
      const y = IY(i), cur = Math.abs(v.cur - i) < .5, flash = v.ev && v.ev.item === i && v.evK < .35;
      let sx = 0; if (flash && v.ev.kind === 'lock') sx = Math.sin(v.evK * 80) * 6 * (1 - v.evK / .35);
      if (cur) { g.fillStyle = flash ? 'rgba(255,185,81,.45)' : 'rgba(255,185,81,.16)'; g.beginPath(); g.roundRect(MX + 16, y - 26, MW - 32, 38, 8); g.fill(); }
      txt(g, name, MX + 64 + sx, y, `${cur ? 700 : 600} 21px Jost, sans-serif`, ok ? (cur ? '#fff' : '#d9def5') : '#7c84aa');
      if (!ok) { txt(g, 'unavailable here', MX + MW - 30 + sx, y, '600 13px Jost, sans-serif', '#7c84aa', 'right'); g.strokeStyle = '#7c84aa'; g.lineWidth = 2; g.strokeRect(MX + 40 + sx, y - 13, 12, 10); g.beginPath(); g.arc(MX + 46 + sx, y - 13, 4, Math.PI, TAU); g.stroke(); }
    });
    // the cursor glides between rows
    const cy = lerp(IY(Math.floor(v.cur)), IY(Math.ceil(v.cur)), v.cur % 1) - 8;
    g.fillStyle = C.gold; g.beginPath(); g.moveTo(MX + 30, cy - 9); g.lineTo(MX + 46, cy); g.lineTo(MX + 30, cy + 9); g.closePath(); g.fill();
    ['ok', 'back'].forEach(k => {
      const b = BTN[k], hot = v.ev && v.evK < .3 && (v.ev.kind === k || (k === 'ok' && v.ev.kind === 'lock'));
      g.fillStyle = hot ? C.gold : 'rgba(255,255,255,.08)'; g.strokeStyle = C.gold; g.lineWidth = 2; g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h, 9); g.fill(); g.stroke();
      txt(g, k === 'ok' ? '✓ Confirm' : '↩ Back', b.x + b.w / 2, b.y + 26, '700 16px Jost, sans-serif', hot ? C.navy : C.gold, 'center');
    });
    // feedback toast
    if (v.ev && v.evK < 1.4) {
      const a = clamp((1.4 - v.evK) / .4), msg = v.ev.kind === 'ok' ? `${ITEMS[v.ev.item][0]} confirmed` : v.ev.kind === 'lock' ? 'Save is unavailable here' : 'Back';
      g.globalAlpha = a; T.label(msg, MX + MW / 2, MY + 470, 'center', C.ink, 15); g.globalAlpha = 1;
    }
  }

  /* ---------- the chord panel ---------- */
  const PX = 546, PW = 478;
  function staff(g, notes, x, y, w, col) {
    // treble staff: bottom line E4, 8 px per diatonic step
    const S = 8;
    for (let i = 0; i < 5; i++) { g.strokeStyle = '#9b9070'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y - i * 2 * S); g.lineTo(x + w, y - i * 2 * S); g.stroke(); }
    txt(g, '𝄞', x + 2, y + 12, '70px serif', '#9b9070');
    let lastStep = -99, shifted = false;
    notes.forEach((m, i) => {
      const oct = Math.floor(m / 12) - 1, pc = m % 12, step = (oct - 4) * 7 + LETTER[pc] - 2, ny = y - step * S;
      shifted = step - lastStep <= 1 && !shifted; lastStep = step;
      const nx = x + w / 2 + 10 + (shifted ? 20 : 0);
      g.strokeStyle = '#9b9070'; g.lineWidth = 1.2;
      for (let s = step; s <= -2; s++) if (s % 2 === 0) { g.beginPath(); g.moveTo(nx - 15, y - s * S); g.lineTo(nx + 15, y - s * S); g.stroke(); }
      for (let s = 10; s <= step; s++) if (s % 2 === 0) { g.beginPath(); g.moveTo(nx - 15, y - s * S); g.lineTo(nx + 15, y - s * S); g.stroke(); }
      g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 2.5; g.beginPath(); g.ellipse(nx, ny, 9, 7, -.3, 0, TAU); g.fill();
      if (NAMES[pc].length > 1) txt(g, '♯', nx - (shifted ? 44 : 24), ny + 6, '700 18px Jost, sans-serif', col);
      txt(g, NAMES[pc] + oct, x + w + 100 + i * 46, y - 26, '700 15px Jost, sans-serif', col);
    });
  }
  function drawPanel(g, v) {
    g.fillStyle = '#fffaf0'; g.beginPath(); g.roundRect(PX - 6, 14, PW + 12, 557, 12); g.fill();
    if (!v.ev) {
      txt(g, 'Press a menu item, or Back', PX + 14, 52, '800 18px Montserrat, Jost, sans-serif', C.ink);
      g.font = '500 14px Jost, sans-serif'; g.fillStyle = C.muted; wrap(g, 'The chord you hear is drawn here: its notes, how simple each frequency ratio is, and the notes added together.', PX + 14, 80, PW - 28, 20);
      return;
    }
    const key = chordFor(v.ev.kind, v.ev.swapped), ch = CHORDS[key], cons = ch.feel === 'consonant', col = cons ? C.good : C.red;
    const mismatch = v.ev.swapped, action = v.ev.kind === 'ok' ? `Confirm: ${ITEMS[v.ev.item][0]}` : v.ev.kind === 'lock' ? 'Confirm: Save (unavailable)' : 'Back';
    txt(g, action, PX + 14, 46, '800 18px Montserrat, Jost, sans-serif', C.ink);
    g.fillStyle = cons ? '#d8f0df' : '#f9d9d6'; g.beginPath(); g.roundRect(PX + PW - 140, 26, 128, 28, 8); g.fill();
    txt(g, ch.feel, PX + PW - 76, 46, '800 14px Montserrat, Jost, sans-serif', col, 'center');
    txt(g, ch.name, PX + 14, 70, '600 14px Jost, sans-serif', C.muted);
    if (mismatch) T.label(v.ev.kind === 'ok' ? 'mismatch: a success that sounds like an error' : 'mismatch: a refusal that sounds like a reward', PX + PW / 2, 92, 'center', C.red, 13);
    // level and rings
    const lv = levelOf(key, v.evK);
    staff(g, ch.notes, PX + 14, 192, 150, col);
    if (lv > .002) for (let i = 0; i < 3; i++) { const p = (v.t * 1.8 + i / 3) % 1; g.strokeStyle = col; g.globalAlpha = clamp(lv * 3) * (1 - p); g.lineWidth = 2.5; g.beginPath(); g.arc(PX + 110, 150, 40 + p * 50, -.7, .7); g.stroke(); } g.globalAlpha = 1;
    // ratio bars
    txt(g, 'Each pair of notes as a frequency ratio', PX + 14, 236, '800 14px Montserrat, Jost, sans-serif', C.ink);
    txt(g, 'longer bar = more complex ratio = rougher', PX + 14, 252, '500 12px Jost, sans-serif', C.muted);
    const BX = PX + 230, BW = PW - 250, sx = BX + BW * SMOOTH_BELOW / ROUGH_MAX;
    g.fillStyle = 'rgba(47,174,99,.1)'; g.fillRect(BX, 260, sx - BX, 100); g.fillStyle = 'rgba(229,50,45,.08)'; g.fillRect(sx, 260, BX + BW - sx, 100);
    txt(g, 'smooth', BX + 4, 372, '600 11px Jost, sans-serif', C.good); txt(g, 'rough', BX + BW - 4, 372, '600 11px Jost, sans-serif', C.red, 'right');
    const n = ch.notes, pairs = [[0, 1], [0, 2], [1, 2]];
    pairs.forEach(([a, b], i) => {
      const semis = n[b] - n[a], [nm, p, q] = INTERVALS[semis], r = rough(p, q), y = 280 + i * 30, sm = r < SMOOTH_BELOW;
      txt(g, `${NAMES[n[a] % 12]}–${NAMES[n[b] % 12]}  ${nm}`, PX + 14, y + 4, '600 13px Jost, sans-serif', C.ink);
      txt(g, `≈ ${p}:${q}`, BX - 10, y + 4, '700 13px Jost, sans-serif', sm ? C.good : C.red, 'right');
      g.fillStyle = sm ? C.good : C.red; g.beginPath(); g.roundRect(BX, y - 8, BW * r / ROUGH_MAX, 16, 5); g.fill();
    });
    // the notes summed over 40 ms
    const WX = PX + 14, WY = 398, WW = PW - 28, WH = 104, cyw = WY + 56;
    txt(g, 'The three notes added together (40 ms, just ratios)', WX, WY, '800 14px Montserrat, Jost, sans-serif', C.ink);
    txt(g, cons ? 'a pattern that repeats cleanly' : 'beats: the loudness wobbles as the notes rub', WX + WW - 8, WY + WH - 2, '600 12px Jost, sans-serif', col, 'right');
    g.fillStyle = '#f3ecdc'; g.beginPath(); g.roundRect(WX, WY + 10, WW, WH - 6, 8); g.fill();
    g.strokeStyle = col; g.lineWidth = 1.6; g.beginPath();
    for (let px = 0; px <= WW; px++) { const tt = px / WW * .04; let s = 0; n.forEach(m => { const iv = INTERVALS[m - n[0]]; s += Math.sin(TAU * HZ(n[0]) * (iv ? iv[1] / iv[2] : 1) * tt); }); const y = cyw - s / 3 * 44; px ? g.lineTo(WX + px, y) : g.moveTo(WX + px, y); }
    g.stroke();
    // quote
    g.font = 'italic 500 14px Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'left';
    wrap(g, '“Consonant sounds indicate relief from tension… dissonant sounds accentuate tension.”', PX + 14, 528, PW - 28, 19);
    txt(g, 'Persona 5’s menu', PX + PW - 12, 562, '600 11px Jost, sans-serif', C.muted, 'right');
    // level meter beside the staff
    const k = clamp((20 * Math.log10(Math.max(lv, 1e-5)) + 40) / 40);
    g.fillStyle = '#e6dcc5'; g.beginPath(); g.roundRect(PX + PW - 30, 110, 14, 90, 4); g.fill();
    g.fillStyle = col; g.fillRect(PX + PW - 28, 110 + 90 - k * 90, 10, k * 90);
  }

  /* ---------- walk-through script: [time, what, row] ---------- */
  const TOUR = [[1.0, 'hover', 1], [1.6, 'ok', 1], [4.0, 'back'], [6.4, 'hover', 3], [7.2, 'lock', 3], [10.0, 'swap', 1], [11.0, 'hover', 0], [11.6, 'ok', 0], [14.6, 'back'],
    [17.4, 'swap', 0], [18.4, 'hover', 4], [19.0, 'ok', 4], [21.6, 'back']];
  const DUR = 24;
  const CAPS = [[0, 'As designed: confirm is consonant'], [4, 'Back is dissonant'], [6.4, 'So is an unavailable item'], [10, 'Now swap the two sounds'], [17.4, 'Back to the design: they match again']];
  function tourView(t) {
    let cur = 0, from = 0, hT = -9, swapped = false, ev = null;
    TOUR.forEach(([tt, what, row]) => {
      if (t < tt) return;
      if (what === 'hover') { from = cur; cur = row; hT = tt; }
      if (what === 'swap') swapped = !!row;
      if (what === 'ok' || what === 'lock') ev = { kind: what, item: row, t: tt, swapped };
      if (what === 'back') ev = { kind: 'back', item: -1, t: tt, swapped };
    });
    const k = ease(clamp((t - hT) / .4));
    return { cur: lerp(from, cur, k), swapped, ev, evK: ev ? t - ev.t : 0, t, cap: CAPS.filter(c => t >= c[0]).at(-1)[1] };
  }
  function draw(g, v) {
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
    drawMenu(g, v); drawPanel(g, v);
    if (v.cap) T.label(v.cap, 270, 40, 'center', C.ink, 15);
  }

  const scenes = {};
  canvasDemo('cm-menu', (s, cv, g) => {
    const st = { tour: true, held: false, t: 0, cur: 1, swapped: false, ev: null, key: '' };
    const tourBtn = $(s, '.cm-tour'), swapBox = $(s, '.cm-swap');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); const v = tourView(st.t % DUR); st.cur = Math.round(v.cur); st.swapped = false; st.ev = null; } };
    const act = (kind, item) => { st.ev = { kind, item, t: st.t, swapped: st.swapped }; audioUp(); playChord(chordFor(kind, st.swapped)); };
    const confirm = i => { st.cur = i; act(ITEMS[i][1] ? 'ok' : 'lock', i); };
    $(s, '.cm-ok').onclick = () => { manual(); confirm(st.cur); };
    $(s, '.cm-back').onclick = () => { manual(); act('back', -1); };
    swapBox.onchange = () => { manual(); st.swapped = swapBox.checked; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    $$(s, '.snd').forEach(b => b.onclick = () => { audioUp(); setSound(!AU.on); });
    const at = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
    const rowAt = p => p.x >= MX && p.x <= MX + MW ? ITEMS.findIndex((_, i) => p.y >= IY(i) - 28 && p.y < IY(i) + 16) : -1;
    const inB = (p, b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
    cv.addEventListener('pointermove', e => { const p = at(e), r = rowAt(p); if (!st.tour && r >= 0) st.cur = r; cv.style.cursor = r >= 0 || inB(p, BTN.ok) || inB(p, BTN.back) ? 'pointer' : ''; });
    cv.addEventListener('pointerdown', e => {
      const p = at(e), r = rowAt(p);
      if (r >= 0) { manual(); confirm(r); } else if (inB(p, BTN.ok)) { manual(); confirm(st.cur); } else if (inB(p, BTN.back)) { manual(); act('back', -1); }
    });
    function info(v) {
      const key = [v.ev && v.ev.t, v.swapped].join(); if (key === st.key) return; st.key = key;
      swapBox.checked = v.swapped;
      if (!v.ev) { say($(s, '.cm-stats'), ''); say($(s, '.cm-out'), 'Confirm an item and listen: a major triad, three notes whose frequencies sit in simple ratios.'); return; }
      const ch = CHORDS[chordFor(v.ev.kind, v.ev.swapped)], cons = ch.feel === 'consonant';
      say($(s, '.cm-stats'), `<div class="${v.ev.swapped ? 'r' : cons ? 'g' : 'y'}"><b>${cons ? 'calm' : 'tense'}</b><span>${ch.feel}: ${ch.name}</span></div>`);
      say($(s, '.cm-out'), v.ev.swapped ? (v.ev.kind === 'ok' ? 'Swapped: you chose something and the menu answered with tension. It reads as an error, even though it worked.' : 'Swapped: backing out, or hitting a locked item, now sounds like a reward. The player gets relief at the wrong moment.')
        : cons ? 'Confirm resolves: simple ratios, a smooth repeating wave. Relief from tension, as Persona 5 does it.' : v.ev.kind === 'lock' ? 'Unavailable buzzes: a cluster of close notes, and a rough, beating wave. The tension says no without a word.' : 'Back is dissonant: complex ratios, beating wave. A small tension that says you are leaving.');
    }
    scenes.menu = { seek(t) { st.held = true; const v = tourView(t); draw(g, v); info(v); }, dur: () => DUR };
    return dt => {
      if (st.held) return;
      const a = st.t; st.t += Math.max(0, dt);
      let v;
      if (st.tour) {
        if (st.t >= DUR) st.t = 0;
        // the walk-through plays its own presses as the clock passes them
        if (st.t > a) TOUR.forEach(([tt, what, row]) => { if (tt >= a && tt < st.t && (what === 'ok' || what === 'lock' || what === 'back')) { const sw = tourView(tt + .001).swapped; playChord(chordFor(what, sw)); } });
        v = tourView(st.t);
      } else v = { cur: st.cur, swapped: st.swapped, ev: st.ev, evK: st.ev ? st.t - st.ev.t : 0, t: st.t, cap: '' };
      draw(g, v); info(v);
    };
  });

  window.__seek = (t, which = 'menu') => scenes[which].seek(t);
  window.__dur = (which = 'menu') => scenes[which].dur();
})();
