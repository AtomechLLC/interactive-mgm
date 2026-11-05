/* Module 0, slides 75-78 and 81: "Amplified Game Feel", shown on a real shipped hit: the Aztez sword strike from
   Ben Ruiz's "Impact Effects" demo (art and audio (c) Team Colorblind, used with permission; see ../../shared/aztez).
   The attack animation never changes. Nine layers of feedback are added on top, each on the demo's own schedule
   (seconds after the button press):
     t+0.10 whoosh · t+0.20 swing trail, foot dust, camera shake, blood, hit stop · t+0.22 hit reaction, thud, grunt
     t+0.23 hit burst · t+0.25 sparks
   The two fighters are drawn from separate clips (attacker slice x < 503, target slice x >= 503), so any set of layers
   can be composed. Everything is a pure function of the strike time and the layer set, so __seek is deterministic. */
(function () {
  const { $, $$, say } = FPF.kit;
  const C = TD.C, { clamp } = TD;
  const { txt, box } = SCENE;
  const W = 1040, H = 585, FW = 960, FH = 540, K = W / FW, SPLIT = 503;
  const A = '../../shared/aztez/';
  // sprite sheets: opaque clips are full 960x540 frames; effects are cut-outs placed at (x, y)
  const CLIP = {
    bg: { frames: 36, cols: 6, fps: 29.99, press: 0 },
    atk: { frames: 47, cols: 6, fps: 29.17, press: 2 },
    struck: { frames: 47, cols: 6, fps: 29.16, press: 2 },
    hiccup: { frames: 57, cols: 6, fps: 29.38, press: 2 },
    swing: { frames: 27, cols: 5, fps: 28.95, press: 1, x: 249, y: 215, fw: 495, fh: 159 },
    hit: { frames: 27, cols: 7, fps: 28.7, press: 1, x: 438, y: 86, fw: 332, fh: 318 },
    impact: { frames: 27, cols: 6, fps: 28.81, press: 1, x: 499, y: 222, fw: 380, fh: 123 },
    blood: { frames: 76, cols: 4, fps: 29.16, press: 1, x: 417, y: 138, fw: 543, fh: 313 },
    dust: { frames: 41, cols: 17, fps: 28.88, press: 1, x: 361, y: 374, fw: 151, fh: 83 },
  };
  Object.keys(CLIP).forEach(n => SCENE.img(A + n + '.png'));
  const LAYERS = [
    ['struck', 'Hit reaction', 't+0.22', 'the target snaps back and flashes, so the player sees exactly what got hit'],
    ['stop', 'Hit stop', 't+0.20', 'both fighters hold for a few frames while the effects keep moving, so the contact reads as solid'],
    ['shake', 'Camera shake', 't+0.20', '0.16 s of smooth noise that eases out, so the hit reads as forceful'],
    ['swing', 'Swing trail', 't+0.20', 'an ink-brush arc that draws the path of the blade'],
    ['hit', 'Hit burst', 't+0.23', 'a white flash and burst at the point of contact'],
    ['impact', 'Sparks', 't+0.25', 'a ring of sparks, the last effect to fire'],
    ['blood', 'Blood', 't+0.20', 'a spray that carries the force past the target and pools on the floor'],
    ['dust', 'Foot dust', 't+0.20', 'dust kicked up by the planted foot as the weight moves forward'],
    ['sound', 'Sound', 't+0.10 / 0.22', 'a whoosh on the swing, then a low thud and a grunt on contact'],
  ];
  const N = LAYERS.length, ALL = new Set(LAYERS.map(l => l[0]));
  const SCHED = { whoosh: .10, fx: .20, struck: .22, hit: .23, impact: .25 };
  const LEAD = .35, CYCLE = 2.3, SLOW = .25;          // idle before the press; one strike loop; slow-motion rate
  // walk-through: raw, then one layer added per loop, then the full strike in slow motion, then raw vs polished
  const T_LAYERS = CYCLE * (N + 1), T_SLOW = T_LAYERS + CYCLE / SLOW, DUR = T_SLOW + CYCLE * 2;
  function tourState(t) {
    if (t < T_LAYERS) { const k = Math.floor(t / CYCLE); return { L: new Set(LAYERS.slice(0, k).map(l => l[0])), c: t - k * CYCLE, split: false, slow: false }; }
    if (t < T_SLOW) return { L: new Set(ALL), c: (t - T_LAYERS) * SLOW, split: false, slow: true };
    return { L: new Set(ALL), c: (t - T_SLOW) % CYCLE, split: true, slow: false };
  }

  function frameOf(name, e, start = 0) { const c = CLIP[name]; return Math.floor((e - start) * c.fps) + c.press; }
  // draws frame i of a clip in 960x540 space; opaque clips can be cut to a vertical slice [sx, sx + sw)
  function clipFrame(g, name, i, sx = 0, sw = FW, a = 1) {
    const c = CLIP[name], im = SCENE.img(A + name + '.png');
    if (!im.complete || !im.naturalWidth) return;
    i = clamp(i, 0, c.frames - 1);
    const col = i % c.cols, row = Math.floor(i / c.cols);
    g.save(); g.globalAlpha *= a;
    if (c.fw) g.drawImage(im, col * c.fw, row * c.fh, c.fw, c.fh, c.x, c.y, c.fw, c.fh);
    else g.drawImage(im, col * FW + sx, row * FH, sw, FH, sx, 0, sw, FH);
    g.restore();
  }
  // Aztez camera shake: smooth noise with a sine-eased decay and a clamped offset
  const SHAKE_DUR = .16, SHAKE_MAX = 11;
  const snoise = x => Math.sin(x * 11) * .5 + Math.sin(x * 19 + 1.3) * .3 + Math.sin(x * 31 + 4.1) * .2;
  function shake(e) {
    const s = e - SCHED.fx; if (s < 0 || s > SHAKE_DUR) return [0, 0];
    const amp = SHAKE_MAX * Math.sin((1 - s / SHAKE_DUR) * Math.PI / 2);
    return [snoise(s * 40) * amp, snoise(s * 40 + 17.3) * amp];
  }

  // one strike at loop time c (seconds), drawn into the box (ox, oy, scale sc) of the 1040x585 canvas
  function strike(g, L, c, idle, ox, oy, sc, label) {
    const e = c - LEAD;
    g.save(); g.beginPath(); g.rect(ox, oy, W * sc, H * sc); g.clip();
    g.translate(ox, oy); g.scale(K * sc, K * sc);
    g.fillStyle = '#fff'; g.fillRect(0, 0, FW, FH);
    const bgi = Math.floor(idle * CLIP.bg.fps) % CLIP.bg.frames;
    if (e < 0) clipFrame(g, 'bg', bgi);
    else {
      if (L.has('shake')) { const [x, y] = shake(e); g.translate(x, y); }
      const atk = L.has('stop') ? 'hiccup' : 'atk';
      clipFrame(g, atk, frameOf(atk, e), 0, SPLIT);
      if (L.has('struck')) { const v = L.has('stop') ? 'hiccup' : 'struck'; clipFrame(g, v, frameOf(v, e, L.has('stop') ? 0 : SCHED.struck), SPLIT, FW - SPLIT); }
      else clipFrame(g, 'bg', bgi, SPLIT, FW - SPLIT);
      const fade = clamp((c - (CYCLE - .3)) / .25);    // settle back into the idle loop before the next press
      if (fade > 0) clipFrame(g, 'bg', bgi, 0, FW, fade);
      for (const [n, st] of [['dust', SCHED.fx], ['blood', SCHED.fx], ['swing', SCHED.fx], ['hit', SCHED.hit], ['impact', SCHED.impact]]) {
        if (!L.has(n)) continue;
        const i = frameOf(n, e, st), f = CLIP[n].frames;
        if (i >= 0 && i < f) clipFrame(g, n, i, 0, FW, i > f - 9 ? 1 - (i - (f - 9)) / 8 : 1);
      }
    }
    g.restore();
    g.save(); g.translate(ox, oy); g.scale(sc, sc);
    // the sound layer, drawn as captions so it reads with audio off and in the GIF
    if (L.has('sound')) {
      for (const [at, word, x] of [[SCHED.whoosh, 'whoosh', 330], [SCHED.struck, 'THUD + grunt', 700]]) {
        const k = (e - at) / .45; if (k < 0 || k > 1) continue;
        txt(g, word, x, 96 - k * 16, { size: 26, col: C.red, a: 1 - k, align: 'center' });
      }
    }
    g.restore();
    if (label) { box(g, ox + 14, oy + 12, 200, 36, { fill: C.navy }); txt(g, label, ox + 114, oy + 37, { size: 17, col: C.gold, align: 'center' }); }
  }

  // the schedule strip: every event on one 0-0.5 s axis, the hit stop as a band, a playhead at the strike time
  const EV = [[0, 'swing starts', null], [SCHED.whoosh, 'whoosh', 'sound'], [SCHED.fx, 'trail · dust · shake · blood · hit stop', 'fx'],
    [SCHED.struck, 'hit reaction · thud · grunt', 'struck'], [SCHED.hit, 'hit burst', 'hit'], [SCHED.impact, 'sparks', 'impact']];
  const evOn = (L, k) => k === null || (k === 'fx' ? ['swing', 'dust', 'shake', 'blood', 'stop'].some(x => L.has(x)) : L.has(k) || (k === 'struck' && L.has('sound')));
  function timeline(g, L, c, slow) {
    const e = c - LEAD, X0 = 70, X1 = 1000, Y = 548, T = .5, X = s => X0 + (X1 - X0) * s / T;
    box(g, 20, 492, W - 40, 82, { fill: 'rgba(255,252,244,.94)', stroke: 'rgba(38,44,106,.25)', r: 12 });
    g.fillStyle = 'rgba(38,44,106,.18)'; g.fillRect(X0, Y - 3, X1 - X0, 6);
    if (L.has('stop')) { g.fillStyle = 'rgba(224,169,45,.35)'; g.fillRect(X(.20), Y - 9, X(.34) - X(.20), 18); txt(g, 'hit stop hold', (X(.20) + X(.34)) / 2, Y - 14, { size: 12, col: C.navy, align: 'center', font: 'b', w: 600 }); }
    [0, .1, .2, .3, .4, .5].forEach(s => txt(g, s.toFixed(1) + ' s', X(s), Y + 22, { size: 12, col: 'rgba(38,44,106,.6)', align: 'center', font: 'b' }));
    let last = null;
    for (const ev of EV) {
      const lit = evOn(L, ev[2]), fired = e >= ev[0];
      g.fillStyle = !lit ? 'rgba(38,44,106,.22)' : fired ? C.red : C.navy;
      g.beginPath(); g.arc(X(ev[0]), Y, fired && lit ? 7 : 5, 0, Math.PI * 2); g.fill();
      if (lit && fired) last = ev;
    }
    if (e >= 0 && e <= T + .05) { const px = X(clamp(e, 0, T)); g.fillStyle = C.gold; g.fillRect(px - 2, Y - 16, 4, 32); }
    const head = e < 0 ? 'waiting for the press' : last ? `t+${last[0].toFixed(2)} s  ${last[1]}` : '';
    txt(g, head, X0 - 30, 516, { size: 17, col: C.ink });
    txt(g, `${slow ? '¼ speed · ' : ''}contact cascades over 0.05 s, about 2 frames at 30 fps`, X1 + 10, 516, { size: 13, col: 'rgba(38,44,106,.65)', align: 'right', font: 'b', w: 600 });
  }

  // the build's own audio clips, played on the schedule in manual mode
  let actx = null; const BUF = {};
  function wake() {
    if (!actx) { try { actx = new AudioContext(); } catch (e) { return; }
      ['swing', 'impact', 'grunt'].forEach(n => fetch(A + 'sfx_' + n + '.wav').then(r => r.arrayBuffer()).then(b => actx.decodeAudioData(b)).then(d => BUF[n] = d).catch(() => {})); }
    if (actx.state === 'suspended') actx.resume();
  }
  function play(n, rate) { if (!actx || !BUF[n]) return; const s = actx.createBufferSource(); s.buffer = BUF[n]; s.playbackRate.value = rate; s.connect(actx.destination); s.start(); }

  SCENE('strike', {
    dur: DUR,
    init(st) {
      st.L = new Set(); st.split = false; st.slow = false; st.lastC = 0;
      const boxes = $$(st.s, '.pl-layers input'), views = $$(st.s, '.pl-view .btn'), speeds = $$(st.s, '.pl-speed .btn');
      st.syncUI = (L, split, slow) => {
        boxes.forEach(b => b.checked = L.has(b.value));
        views.forEach(v => v.classList.toggle('on', (v.dataset.v === 'split') === split));
        speeds.forEach(v => v.classList.toggle('on', (v.dataset.v === 'slow') === slow));
      };
      boxes.forEach(b => b.onchange = () => { st.manual(); b.checked ? st.L.add(b.value) : st.L.delete(b.value); });
      views.forEach(v => v.onclick = () => { st.manual(); st.split = v.dataset.v === 'split'; st.syncUI(st.L, st.split, st.slow); });
      speeds.forEach(v => v.onclick = () => { st.manual(); st.slow = v.dataset.v === 'slow'; st.syncUI(st.L, st.split, st.slow); });
      $(st.s, '.pl-all').onclick = () => { st.manual(); st.L = new Set(ALL); st.syncUI(st.L, st.split, st.slow); };
      $(st.s, '.pl-none').onclick = () => { st.manual(); st.L = new Set(); st.syncUI(st.L, st.split, st.slow); };
      $(st.s, '.pl-audio').onchange = e => { if (e.target.checked) wake(); };
    },
    onManual(st) { const s = st.last || tourState(0); st.L = new Set(s.L); st.split = s.split; st.slow = s.slow; },
    side(st, t) {
      const s = st.tour ? tourState(t) : { L: st.L, split: st.split, slow: st.slow };
      st.last = s;
      if (st.tour) st.syncUI(s.L, s.split, s.slow);
      const n = s.L.size, key = n + '' + s.split + s.slow + [...s.L].join(); if (key === st.key) return; st.key = key;
      say($(st.s, '.pl-stats'), `<div class="${n >= 7 ? 'g' : n >= 3 ? 'y' : ''}"><b>${n}/${N}</b><span>layers of feedback on the same swing</span></div>`);
      const last = LAYERS.filter(l => s.L.has(l[0])).pop();
      say($(st.s, '.pl-out'), s.split ? 'Same swing, same timing, same damage. The polished strike fires nine layers inside 0.25 s, five of them in the last 0.05 s, and that cascade is what tells the player the blade connected.'
        : s.slow ? 'At quarter speed the cascade separates: trail, dust, shake and blood at 0.20 s, the reaction at 0.22, the burst at 0.23, the sparks at 0.25, while both fighters hold.'
          : !n ? 'The raw strike: the blade passes through the target and nothing on screen says it connected.' : `<b>${last[1]}</b> <span class="muted">(${last[2]})</span>: ${last[3]}.`);
    },
    draw(g, st, t) {
      const s = st.tour ? tourState(t) : { L: st.L, split: st.split, slow: st.slow, c: (t * (st.slow ? SLOW : 1)) % CYCLE };
      if (!st.tour && $(st.s, '.pl-audio').checked && s.L.has('sound')) {
        const rate = s.slow ? .6 : 1, cross = at => { const x = LEAD + at; return st.lastC < x && s.c >= x; };
        if (cross(SCHED.whoosh)) play('swing', rate);
        if (cross(SCHED.struck)) { play('impact', rate); play('grunt', rate); }
      }
      st.lastC = s.c;
      if (s.split) {
        SCENE.paper(g, W, H);
        txt(g, 'Same swing, same timing, same damage: only the feedback differs', W / 2, 52, { size: 21, align: 'center' });
        strike(g, new Set(), s.c, t, 0, 100, .5, 'Raw');
        strike(g, ALL, s.c, t, W / 2, 100, .5, 'All nine layers');
        g.fillStyle = C.navy; g.fillRect(W / 2 - 2, 100, 4, H / 2);
        timeline(g, ALL, s.c, false);
      } else {
        strike(g, s.L, s.c, t, 0, 0, 1, s.L.size ? `${s.L.size} of ${N} layers` : 'Raw strike');
        timeline(g, s.L, s.c, s.slow);
        for (let i = 0; i < N; i++) { g.fillStyle = i < s.L.size ? C.gold : 'rgba(38,44,106,.18)'; g.beginPath(); g.roundRect(W - 24 - (N - i) * 26, 22, 20, 20, 5); g.fill(); }
      }
      txt(g, 'Aztez © Team Colorblind · used with permission', W - 18, 482, { size: 12, col: 'rgba(38,44,106,.55)', align: 'right', font: 'b', w: 600 });
    },
  });
})();
