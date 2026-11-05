/* Feel shapes (Module 9, Part 9, slides 211-271): Tim Rogers' 16 game feel types as intensity-over-time curves.
   The deck's reframing (221-222): the types "are actually intensity over time, reshaped in different ways", described by
   trigger (one shot or held), duration, motion (snap, ease or spring) and channels (VFX, animation, audio, camera, haptics, time).
   Slide 1 builds one curve from those four descriptors. Slide 2 is the grid of sixteen cards; click two to overlay them.
   Slide 3 is the builder: draw a curve, pick its chips, and see the closest named type or "unnamed shape".
   Every curve shares the same 2 s window so overlays compare like with like. Every frame is a pure function of t and state. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585, WIN = 2, LOOP = 2.4, N = 81;
  const COL_A = '#2ea3dc', COL_B = '#e07b1a', PAPER = 'rgba(255,252,244,.88)', CARD = '#efe6d2', BOXC = '#e2d7bf';
  const gauss = (t, c, s) => Math.exp(-((t - c) * (t - c)) / (2 * s * s));
  const hit = (t, t0, tau) => t < t0 ? 0 : Math.exp(-(t - t0) / tau);
  const sstep = (a, b, t) => { const k = clamp((t - a) / (b - a)); return k * k * (3 - 2 * k); };
  const CH = ['VFX', 'animation', 'audio', 'camera', 'haptics', 'time'];
  const CH_S = { VFX: 'VFX', animation: 'anim', audio: 'audio', camera: 'cam', haptics: 'haptic', time: 'time' };
  const DURS = ['instant', 'short', 'medium', 'long'];
  const MOTION = {
    snap: 'Snap: intensity jumps to its new level in a single frame, with nothing in between.',
    ease: 'Ease: intensity speeds up or slows down on its way to the new level, so the change is gradual.',
    spring: 'Spring: intensity overshoots the new level, then wobbles back and settles on it.',
  };
  const font = (w, s, f = 'Jost') => `${w} ${s}px ${f === 'M' ? 'Montserrat, Jost' : 'Jost'}, sans-serif`;

  /* ---------- tiny grey-box demos, drawn in a 100 x 70 box; t loops over 2.4 s, v is the curve at t ---------- */
  const blk = (g, x, y, w, h, col = C.ink) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const floorL = (g, y = 60) => { g.strokeStyle = C.muted; g.lineWidth = 1.5; g.beginPath(); g.moveTo(4, y); g.lineTo(96, y); g.stroke(); };
  const flash = (g, x, y, r, a, col = '255,185,81') => { if (a <= .02) return; g.fillStyle = `rgba(${col},${clamp(a)})`; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
  const speedLines = (g, x, y, len, a) => { if (a <= .02) return; g.strokeStyle = `rgba(93,97,140,${clamp(a)})`; g.lineWidth = 1.5; g.beginPath(); for (let i = 0; i < 3; i++) { g.moveTo(x - 4, y + 3 + i * 5); g.lineTo(x - 4 - len, y + 3 + i * 5); } g.stroke(); };
  const DEMO = {
    crunch(g, t, v) {
      floorL(g); const tx = 60, ax = t < .1 ? lerp(6, tx - 16, t / .1) : tx - 16;
      const sh = t > .1 ? v * 3 * Math.sin(t * 90) : 0;
      blk(g, ax, 44, 16, 16, C.player); blk(g, tx + sh, 40, 20, 20, C.stone);
      if (t > .1) for (let i = 0; i < 4; i++) {
        const p = t - .1, land = [.28, .48, .7, .55][i], q = Math.min(p, land), vx = [16, 38, 60, -22][i];
        const x = tx + 2 + vx * q, y = Math.min(58, 42 - 90 * q + 180 * q * q * (1.1 / land));
        blk(g, x, y, 4, 4, C.stoneDk); if (p > land && p < land + .08) flash(g, x + 2, 58, 5, .7);
      }
      flash(g, tx, 50, 4 + 14 * v, v * .8);
    },
    swish(g, t, v) {
      const px = 50, py = 58, a0 = -2.9, k = sstep(.18, .65, t), a = lerp(a0, -.25, k);
      g.strokeStyle = `rgba(46,163,220,${.15 + .5 * v})`; g.lineWidth = 10; g.beginPath(); g.arc(px, py, 38, Math.max(a0, a - .9 * v - .05), a); g.stroke();
      g.strokeStyle = C.ink; g.lineWidth = 4; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * 44, py + Math.sin(a) * 44); g.stroke();
      blk(g, px - 6, py - 2, 12, 10, C.player);
    },
    chunk(g, t, v) {
      floorL(g); const st = clamp(Math.floor((t - .1) / .25) + 1, 0, 7), x = 8 + st * 8;
      blk(g, x, 40 + v * 3, 20, 20 - v * 3, C.ink);
      if (v > .05) { g.fillStyle = `rgba(139,143,168,${v})`; [-1, 1].forEach(s => { g.beginPath(); g.arc(x + 10 + s * 14, 58, 3 + v * 3, 0, TAU); g.fill(); }); }
    },
    sticky(g, t, v) {
      const fr = t > .1 && t < .4, sh = t >= .4 ? v * 5 * Math.sin(t * 70) : 0;
      g.save(); g.translate(sh, sh * .5); floorL(g);
      const tx = 60, ax = t < .1 ? lerp(6, tx - 16, t / .1) : tx - 16, kb = t >= .4 ? 8 * sstep(.4, .7, t) : 0;
      blk(g, ax, 44, 16, 16, C.player); blk(g, tx + kb, 40, 20, 20, C.red);
      if (fr) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(ax - 1, 43, 18, 18); g.strokeRect(tx - 1, 39, 22, 22); g.font = font(700, 9); g.fillStyle = C.ink; g.textAlign = 'center'; g.fillText('freeze', 50, 18); }
      g.restore();
    },
    velcro(g, t, v) {
      blk(g, 6, 14, 8, 48, C.wall);
      let x = 14, w = 18;
      if (t < 1) w = 18 + 10 * sstep(.7, 1, t);
      else { x = 14 + 30 * (1 - Math.exp(-(t - 1) / .12) * Math.cos(22 * (t - 1))); }
      if (t < 1) { g.strokeStyle = C.gold; g.lineWidth = 1; g.beginPath(); for (let i = 0; i < 5; i++) { g.moveTo(14, 24 + i * 6); g.lineTo(14 + (w - 18) + 3, 24 + i * 6); } g.stroke(); }
      blk(g, x + (t < 1 ? w - 18 : 0), 22, 18, 28, C.player);
      if (t < 1 && t > .7) { g.strokeStyle = C.ink; g.lineWidth = 2; g.beginPath(); g.moveTo(x + w, 36); g.lineTo(x + w + 22, 36); g.stroke(); }
    },
    juice(g, t, v) {
      const cx = 50, cy = 36, s = 1 + .45 * (v - (t > .1 ? Math.exp(-(t - .1) / .35) * .65 : 0)) * 1.6;
      if (t > .1) {
        const p = t - .1; g.strokeStyle = `rgba(255,185,81,${clamp(1 - p * 2)})`; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, 10 + p * 60, 0, TAU); g.stroke();
        for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + .3, r = 12 + 40 * (1 - Math.exp(-p * 5)); blk(g, cx + Math.cos(a) * r - 2, cy + Math.sin(a) * r - 2, 4, 4, i % 2 ? C.gold : C.red); }
        if (p < 1) { g.globalAlpha = clamp(1 - p); g.font = font(800, 11, 'M'); g.fillStyle = C.red; g.textAlign = 'center'; g.fillText('+10', cx + 22, cy - 14 - p * 18); g.globalAlpha = 1; }
      }
      const z = 14 * Math.max(.6, s); blk(g, cx - z / 2, cy - z / 2, z, z, C.p3);
    },
    grease(g, t, v) {
      g.fillStyle = '#d6e9f3'; g.fillRect(4, 52, 92, 8);
      const x = lerp(6, 74, sstep(.1, 1.9, t));
      speedLines(g, x, 36, 26 * v / .35, v / .35 * .8); blk(g, x, 36, 20, 16, C.player);
    },
    snap(g, t, v) {
      floorL(g); const on = t >= .2 && t < 2;
      g.strokeStyle = '#cdbf9f'; g.setLineDash([3, 3]); g.lineWidth = 1.5; g.strokeRect(on ? 14 : 62, 36, 22, 22); g.setLineDash([]);
      blk(g, on ? 62 : 14, 36, 22, 22, C.ink);
      if (t >= .2 && t < .28) flash(g, 73, 47, 16, .6);
    },
    meaty(g, t, v) {
      const dip = v * 3; g.save(); g.translate(0, dip); floorL(g);
      const y = t < .22 ? lerp(-30, 32, Math.pow(t / .22, 2)) : 32, sq = t >= .22 ? v * .35 : 0;
      const w = 30 * (1 + sq), h = 28 * (1 - sq);
      blk(g, 50 - w / 2, 60 - h - (32 - y), w, h, C.redDk);
      if (t >= .22) { const p = t - .22; g.fillStyle = `rgba(139,143,168,${clamp(.8 - p)})`; [-1, 1].forEach(s => { g.beginPath(); g.arc(50 + s * (20 + p * 30), 56, 4 + p * 8, 0, TAU); g.fill(); }); }
      g.restore();
    },
    crisp(g, t, v) {
      floorL(g); const sep = t > .15 ? Math.min(4, (t - .15) * 30) : 0;
      blk(g, 38, 30 - sep, 24, 14, C.stone); blk(g, 38, 44 + 0, 24, 16, C.stone);
      g.strokeStyle = `rgba(255,255,255,${clamp(v * 1.3)})`; g.lineWidth = 3; g.beginPath(); g.moveTo(18, 44); g.lineTo(82, 44); g.stroke();
      g.strokeStyle = `rgba(255,185,81,${clamp(v)})`; g.lineWidth = 1; g.stroke();
    },
    electricity(g, t, v) {
      const ox = 18, oy = 36, ch = t < 1.2 ? clamp((t - .1) / 1.1) : 0;
      if (t < 1.2) {
        flash(g, ox, oy, 5 + 12 * ch, .35 + .5 * ch, '138,79,214');
        g.strokeStyle = `rgba(255,185,81,${.3 + .7 * ch})`; g.lineWidth = 1.5; g.beginPath();
        for (let i = 0; i < 4; i++) { const a = i * 1.7 + Math.floor(t * 20) * 2.3, r = 8 + 12 * ch; g.moveTo(ox + Math.cos(a) * r * .5, oy + Math.sin(a) * r * .5); g.lineTo(ox + Math.cos(a + .4) * r, oy + Math.sin(a + .4) * r); } g.stroke();
      } else {
        const x = ox + (t - 1.2) * 260; if (x < 104) { flash(g, x, oy, 10, .9, '138,79,214'); speedLines(g, x - 6, oy - 8, 20, .7); }
        flash(g, ox, oy, 16, v);
      }
      blk(g, 4, 30, 8, 12, C.ink);
    },
    grip(g, t, v) {
      floorL(g, 58); const x = lerp(12, 62, sstep(.1, 1.85, t)), r = 12, rot = (x - 12) / r, jy = Math.sin(t * 90) * v * 1.2;
      g.strokeStyle = C.muted; g.lineWidth = 1; g.beginPath(); for (let i = 0; i < 12; i++) { const tx = 6 + i * 8; g.moveTo(tx, 58); g.lineTo(tx - 3, 63); } g.stroke();
      g.save(); g.translate(x + r, 46 + jy); g.rotate(rot); g.fillStyle = C.ink; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); for (let i = 0; i < 3; i++) { g.moveTo(0, 0); g.lineTo(Math.cos(i * 2.1) * (r - 3), Math.sin(i * 2.1) * (r - 3)); } g.stroke(); g.restore();
      if (v > .1) { g.fillStyle = `rgba(139,143,168,${v})`; g.beginPath(); g.arc(x + r - 14, 56, 2 + v * 3, 0, TAU); g.fill(); }
    },
    jerk(g, t, v) {
      floorL(g); const p = clamp((t - .1) / 1), x = 14 + 52 * Math.sin(Math.PI * p);
      blk(g, x, 38, 20, 20, C.player);
      const dir = p < .5 ? 1 : -1; if (v > .15 && p > 0 && p < 1) { g.fillStyle = C.ink; g.beginPath(); const ax = x + 10 + dir * 18; g.moveTo(ax + dir * 6, 28); g.lineTo(ax - dir * 2, 23); g.lineTo(ax - dir * 2, 33); g.fill(); }
    },
    click(g, t, v) {
      const on = t >= .1 && t < 2.2;
      g.fillStyle = on ? C.p2 : C.stone; g.beginPath(); g.roundRect(28, 28, 44, 18, 9); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(on ? 63 : 37, 37, 7, 0, TAU); g.fill();
      if (v > .05) { g.strokeStyle = `rgba(38,44,106,${clamp(v * 2.4)})`; g.lineWidth = 1.5; g.beginPath(); [[-1, -1], [1, -1], [0, -1.4]].forEach(([a, b]) => { g.moveTo(63 + a * 9, 37 + b * 9); g.lineTo(63 + a * 14, 37 + b * 14); }); g.stroke(); }
    },
    spurt(g, t, v) {
      floorL(g); const x = 6 + (t < .1 ? 0 : 62 * (1 - Math.exp(-(t - .1) / .28)));
      speedLines(g, x, 40, 40 * v, v); blk(g, x, 40, 20, 18, C.p2);
    },
    woosh(g, t, v) {
      g.strokeStyle = C.red; g.lineWidth = 7; g.beginPath(); g.arc(82, 36, 11, Math.PI / 2, Math.PI * 1.5, true); g.stroke();
      g.fillStyle = '#e8e2cf'; g.fillRect(82, 22, 9, 6); g.fillRect(82, 44, 9, 6);
      let x = 18;
      if (t >= .08 && t < .25) x = 18 - 6 * Math.sin(Math.PI * (t - .08) / .17);
      else if (t >= .25 && t < .55) x = 18 + 50 * Math.pow((t - .25) / .3, 3);
      else if (t >= .55) x = 68;
      if (t > .3 && t < .55) speedLines(g, x - 4, 28, 14 * v, v);
      g.fillStyle = C.gold; g.beginPath(); g.arc(x, 36, 6, 0, TAU); g.fill(); g.strokeStyle = C.goldInk; g.lineWidth = 1.5; g.stroke();
      if (t >= .55 && t < .65) flash(g, 72, 36, 12, .7);
    },
  };

  /* ---------- the sixteen types ---------- */
  const TYPES = [
    ['crunch', 'one shot', 'short', 'snap', ['VFX', 'audio', 'camera', 'haptics'], 'One big impact at first, followed by various little secondary elements.',
      t => hit(t, .1, .07) + .34 * gauss(t, .38, .03) + .24 * gauss(t, .58, .03) + .14 * gauss(t, .8, .03)],
    ['swish', 'one shot', 'short', 'ease', ['animation', 'audio', 'VFX'], 'A light sweep through the air that rises and fades with no hard edge.',
      t => .6 * gauss(t, .4, .12)],
    ['chunk', 'held', 'long', 'snap', ['audio', 'animation', 'haptics'], 'Small peaks of feedback, repeated over a longer stretch of time.',
      t => { let s = 0; for (let k = 0; k < 7; k++) s += .45 * hit(t, .1 + .25 * k, .05) * (t < .1 + .25 * (k + 1) ? 1 : 0); return s; }],
    ['sticky', 'one shot', 'short', 'snap', ['time', 'camera'], 'A hit stop to show the impact of an attack, with a camera shake added.',
      t => t < .1 ? 0 : t < .4 ? .95 : .55 * Math.exp(-(t - .4) / .25) * Math.abs(Math.sin(40 * (t - .4)))],
    ['velcro', 'held', 'medium', 'spring', ['animation', 'haptics', 'audio'], 'Contact that catches and holds, builds tension as you pull, then lets go with a springy tug.',
      t => t < 1 ? .5 * sstep(.1, .22, t) + .4 * sstep(.7, 1, t) : Math.max(-.25, .9 * Math.exp(-(t - 1) / .14) * Math.cos(22 * (t - 1)))],
    ['juice', 'one shot', 'medium', 'spring', ['VFX', 'audio', 'animation', 'camera'], 'One impact layered with many reactions that bounce and settle together.',
      t => t < .1 ? 0 : Math.exp(-(t - .1) / .35) * (.65 + .35 * Math.cos(28 * (t - .1)))],
    ['grease', 'held', 'long', 'ease', ['animation', 'audio'], 'Low, smooth, continuous motion with almost no resistance.',
      t => .35 * sstep(.1, .45, t) * (1 - sstep(1.45, 1.9, t))],
    ['snap', 'one shot', 'instant', 'snap', ['animation'], 'An instant change to a new state, with no in-between frames.',
      t => t >= .2 ? .7 : 0],
    ['meaty', 'one shot', 'medium', 'ease', ['animation', 'audio', 'camera', 'time'], 'A heavy blow that takes a moment to land and a long time to settle.',
      t => t < .22 ? sstep(.05, .22, t) : Math.exp(-(t - .22) / .45)],
    ['crisp', 'one shot', 'instant', 'snap', ['audio', 'VFX'], 'A short, clean, sharp peak with nothing trailing after it.',
      t => .9 * gauss(t, .15, .02)],
    ['electricity', 'held', 'long', 'ease', ['VFX', 'audio', 'haptics'], 'Energy builds up while held, and then it is released in a bigger outcome (Mega Man X).',
      t => t < .1 ? 0 : t < 1.2 ? .62 * Math.pow((t - .1) / 1.1, 2) + .05 * Math.sin(70 * t) * (t - .1) : hit(t, 1.2, .14)],
    ['grip', 'held', 'long', 'ease', ['animation', 'haptics', 'camera'], 'Steady traction while held, with a fine texture of contact underneath.',
      t => sstep(.1, .45, t) * (1 - sstep(1.6, 1.9, t)) * (.62 + .05 * Math.sin(55 * t))],
    ['jerk', 'one shot', 'medium', 'ease', ['animation', 'camera'], 'The movement blends into a stop, then blends into the other direction.',
      t => t < .1 || t > 1.1 ? 0 : .7 * Math.abs(Math.cos(Math.PI * (t - .1)))],
    ['click', 'one shot', 'instant', 'snap', ['audio', 'haptics'], 'A tiny, precise tick that confirms an input.',
      t => .4 * gauss(t, .1, .012) + .2 * gauss(t, .16, .01)],
    ['spurt', 'one shot', 'short', 'ease', ['VFX', 'animation', 'camera'], 'A sudden burst that starts at full strength and tapers off.',
      t => .95 * hit(t, .1, .28)],
    ['woosh', 'one shot', 'short', 'snap', ['animation', 'VFX', 'audio'], 'An object sucked in, with a small anticipation and a clear snap.',
      t => t < .08 ? 0 : t < .25 ? -.22 * Math.sin(Math.PI * (t - .08) / .17) : t < .55 ? Math.pow((t - .25) / .3, 3) : 0],
  ].map(([k, trig, dur, mo, ch, def, f]) => ({ k, name: k[0].toUpperCase() + k.slice(1), trig, dur, mo, ch, def, f, s: sample(f) }));
  function sample(f) { const a = new Float32Array(N); for (let i = 0; i < N; i++) a[i] = f(i * WIN / (N - 1)); return a; }
  const byK = k => TYPES.findIndex(x => x.k === k);

  /* ---------- plotting ---------- */
  const YMIN = -.3, YMAX = 1.15;
  function axes(g, x, y, w, h, o = {}) {
    const py = v => y + h - (v - YMIN) / (YMAX - YMIN) * h;
    if (o.bg !== false) { g.fillStyle = o.bg || '#fffaf0'; g.fillRect(x, y, w, h); }
    g.strokeStyle = '#d9cba8'; g.lineWidth = 1; g.beginPath();
    if (o.grid) { for (let s = .5; s < WIN; s += .5) { g.moveTo(x + s / WIN * w, y); g.lineTo(x + s / WIN * w, y + h); } [.5, 1].forEach(v => { g.moveTo(x, py(v)); g.lineTo(x + w, py(v)); }); }
    g.stroke();
    g.strokeStyle = C.muted; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, py(0)); g.lineTo(x + w, py(0)); g.stroke();
    if (o.labels) {
      g.font = font(500, o.fs || 12); g.fillStyle = C.muted; g.textAlign = 'center'; g.textBaseline = 'top';
      for (let s = 0; s <= WIN + 1e-6; s += .5) g.fillText(s.toFixed(1) + ' s', x + s / WIN * w, y + h + 4);
      g.textAlign = 'right'; g.textBaseline = 'middle'; [0, .5, 1].forEach(v => g.fillText(v.toFixed(1), x - 6, py(v)));
      g.textBaseline = 'alphabetic';
    }
    return py;
  }
  function curve(g, x, y, w, h, f, col, lw = 2, fill = 0) {
    const py = v => y + h - (clamp(v, YMIN, YMAX) - YMIN) / (YMAX - YMIN) * h, M = Math.max(60, Math.round(w));
    const val = typeof f === 'function' ? f : (u => { const i = u / WIN * (f.length - 1), a = Math.floor(i), b = Math.min(f.length - 1, a + 1); return lerp(f[a], f[b], i - a); });
    g.beginPath();
    for (let i = 0; i <= M; i++) { const u = i / M * WIN, X = x + i / M * w, Y = py(val(u)); if (i) g.lineTo(X, Y); else g.moveTo(X, Y); }
    if (fill) { g.save(); g.lineTo(x + w, py(0)); g.lineTo(x, py(0)); g.closePath(); g.fillStyle = col; g.globalAlpha = fill; g.fill(); g.restore(); g.beginPath(); for (let i = 0; i <= M; i++) { const u = i / M * WIN, X = x + i / M * w, Y = py(val(u)); if (i) g.lineTo(X, Y); else g.moveTo(X, Y); } }
    g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke();
    return { py, val };
  }
  function playhead(g, x, y, w, h, t, val, col) {
    if (t > WIN) return; const X = x + t / WIN * w, Y = y + h - (clamp(val(t), YMIN, YMAX) - YMIN) / (YMAX - YMIN) * h;
    g.strokeStyle = 'rgba(38,44,106,.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(X, y); g.lineTo(X, y + h); g.stroke();
    g.fillStyle = col; g.beginPath(); g.arc(X, Y, 3.5, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke();
  }
  function demoBox(g, type, x, y, s, t) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = BOXC; g.beginPath(); g.roundRect(0, 0, 100, 70, 6); g.fill();
    g.beginPath(); g.roundRect(0, 0, 100, 70, 6); g.clip();
    DEMO[type.k](g, t, type.f(Math.min(t, WIN)));
    g.restore();
  }
  function chipRow(g, x, y, items, maxW) {
    g.font = font(600, 10); g.textBaseline = 'middle'; g.textAlign = 'left'; let cx = x;
    items.forEach(([txt, on]) => {
      const w = g.measureText(txt).width + 8; if (cx + w > x + maxW) return;
      g.fillStyle = on ? '#dfe6fb' : 'rgba(0,0,0,0)'; g.strokeStyle = on ? '#8ea2e6' : '#d3c7ab'; g.lineWidth = 1;
      g.beginPath(); g.roundRect(cx, y - 7, w, 14, 4); g.fill(); g.stroke();
      g.fillStyle = on ? '#23306e' : '#b3a888'; g.fillText(txt, cx + 4, y + .5); cx += w + 3;
    });
    g.textBaseline = 'alphabetic';
  }
  const bg = g => { g.clearRect(0, 0, W, H); g.fillStyle = PAPER; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const chipsHTML = (ty, cls = '') => `<div class="fs-chips"><span class="chip ${cls}">${ty.trig}</span><span class="chip ${cls}">${ty.dur}</span><span class="chip ${cls}">${ty.mo}</span>${CH.map(c => `<span class="chip ${ty.ch.includes(c) ? cls : 'off'}">${c}</span>`).join('')}</div>`;

  const scenes = {};

  /* =================== slide 1: four descriptors build one curve =================== */
  const DUR_L = { instant: .05, short: .3, medium: .7, long: 1.3 };
  const T0 = .15, REL = 1.35, DT = 1 / 240;
  function build(p) {
    // target level, then the motion filter: snap follows it exactly, ease is critically damped, spring is underdamped
    const L = DUR_L[p.dur], M = Math.round(WIN / DT) + 1, out = new Float32Array(M), tgt = t => p.trig === 'held' ? (t < T0 ? 0 : t < REL ? 1 : clamp(1 - (t - REL) / L)) : (t >= T0 && t < T0 + L ? 1 : 0);
    let x = 0, v = 0; const w = p.mo === 'spring' ? 26 : 22, z = p.mo === 'spring' ? .22 : 1;
    for (let i = 0; i < M; i++) {
      const t = i * DT, s = tgt(t);
      if (p.mo === 'snap') { x = s; } else { for (let k = 0; k < 4; k++) { const a = w * w * (s - x) - 2 * z * w * v; v += a * DT / 4; x += v * DT / 4; } }
      out[i] = x;
    }
    // time channel: a clock that slows while intensity is high (cumulative so seek stays pure)
    const clock = new Float32Array(M); let c = 0; for (let i = 0; i < M; i++) { clock[i] = c; c += (1 - .85 * clamp(out[i])) * DT; }
    return { arr: out, clock, tgt };
  }
  const at = (arr, t) => { const i = clamp(t / DT, 0, arr.length - 1), a = Math.floor(i), b = Math.min(arr.length - 1, a + 1); return lerp(arr[a], arr[b], i - a); };
  function drawDials(g, st, t) {
    T.use(g); bg(g);
    const b = st.b, tl = t % LOOP, v = tl <= WIN ? at(b.arr, tl) : 0, ch = new Set(st.ch);
    const px = 70, py0 = 70, pw = 520, ph = 390;
    g.font = font(800, 18, 'M'); g.fillStyle = C.ink; g.textAlign = 'left'; g.fillText('Intensity over time', 24, 38);
    g.font = font(500, 14); g.fillStyle = C.muted; g.fillText(`${st.trig} · ${st.dur} · ${st.mo} · ${st.ch.length ? st.ch.join(', ') : 'no channels'}`, 230, 38);
    axes(g, px, py0, pw, ph, { grid: true, labels: true, fs: 13 });
    curve(g, px, py0, pw, ph, b.tgt, 'rgba(93,97,140,.45)', 1.5);
    const c = curve(g, px, py0, pw, ph, u => at(b.arr, u), COL_A, 3.5, .14);
    playhead(g, px, py0, pw, ph, tl, c.val, COL_A);
    g.font = font(500, 13); g.fillStyle = C.muted; g.textAlign = 'left'; g.fillText('grey: what the input asks for   blue: what the player feels', px, py0 + ph + 40);
    // input bar
    const iy = py0 + ph + 58; g.fillStyle = '#e6dcc5'; g.fillRect(px, iy, pw, 18);
    const s0 = px + T0 / WIN * pw, s1 = px + (st.trig === 'held' ? REL : T0 + .04) / WIN * pw;
    g.fillStyle = C.ink; g.fillRect(s0, iy, Math.max(4, s1 - s0), 18);
    g.font = font(600, 12); g.fillStyle = C.ink; g.textAlign = 'left'; g.fillText(st.trig === 'held' ? 'input: button held' : 'input: button tapped', px, iy + 34);
    // demo on the right
    const dx = 640, dy = 70, dw = 370, dh = 420, shake = ch.has('camera') ? v * 9 * Math.sin(tl * 83) : 0;
    g.fillStyle = CARD; g.beginPath(); g.roundRect(dx, dy, dw, dh, 12); g.fill();
    g.save(); g.beginPath(); g.roundRect(dx, dy, dw, dh, 12); g.clip(); g.translate(shake, shake * .6);
    const cx = dx + dw / 2, cy = dy + 210;
    g.fillStyle = '#d6cbb1'; g.fillRect(dx, cy + 60, dw, dh);
    if (ch.has('VFX')) { flash(g, cx, cy, 30 + 90 * v, .55 * clamp(v)); for (let i = 0; i < 10; i++) { const a = i * TAU / 10 + .2, r = 50 + 80 * clamp(v); if (v > .08) blk(g, cx + Math.cos(a) * r - 4, cy + Math.sin(a) * r - 4, 8, 8, i % 2 ? C.gold : C.red); } }
    const sq = ch.has('animation') ? .4 * v : 0, bw = 90 * (1 + sq), bh = 90 * (1 - sq * .7);
    blk(g, cx - bw / 2, cy + 60 - bh, bw, bh, C.player); g.strokeStyle = C.navy; g.lineWidth = 3; g.strokeRect(cx - bw / 2, cy + 60 - bh, bw, bh);
    if (ch.has('audio')) { g.strokeStyle = `rgba(138,79,214,${.2 + .7 * clamp(v)})`; g.lineWidth = 3; for (let k = 1; k <= 3; k++) { g.beginPath(); g.arc(cx, cy + 10, 60 + k * 18 * (.4 + v), -.6, .6); g.stroke(); g.beginPath(); g.arc(cx, cy + 10, 60 + k * 18 * (.4 + v), Math.PI - .6, Math.PI + .6); g.stroke(); } }
    g.restore();
    if (ch.has('haptics')) { const hx = dx + 64, hy = dy + dh - 46, j = v * 4 * Math.sin(tl * 120); g.fillStyle = C.ink; g.beginPath(); g.roundRect(hx - 30 + j, hy - 14, 60, 28, 12); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(hx - 14 + j, hy, 4, 0, TAU); g.arc(hx + 14 + j, hy, 4, 0, TAU); g.fill(); if (v > .05) { g.strokeStyle = `rgba(38,44,106,${clamp(v)})`; g.lineWidth = 2; g.beginPath(); g.moveTo(hx - 40, hy - 10); g.lineTo(hx - 46, hy); g.lineTo(hx - 40, hy + 10); g.moveTo(hx + 40, hy - 10); g.lineTo(hx + 46, hy); g.lineTo(hx + 40, hy + 10); g.stroke(); } }
    if (ch.has('time')) { const hx = dx + dw - 56, hy = dy + dh - 46, a = (tl <= WIN ? at(b.clock, tl) : at(b.clock, WIN) + (tl - WIN)) * TAU; g.fillStyle = '#fffaf0'; g.strokeStyle = C.ink; g.lineWidth = 3; g.beginPath(); g.arc(hx, hy, 22, 0, TAU); g.fill(); g.stroke(); g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + Math.sin(a) * 17, hy - Math.cos(a) * 17); g.stroke(); g.font = font(600, 11); g.fillStyle = C.muted; g.textAlign = 'right'; g.fillText(`time × ${(1 - .85 * clamp(v)).toFixed(2)}`, hx - 30, hy + 4); }
    g.font = font(700, 14); g.fillStyle = C.ink; g.textAlign = 'center'; g.fillText(`intensity ${v.toFixed(2)}`, cx, dy + 30);
    // channel legend
    g.font = font(600, 13); g.textAlign = 'left';
    CH.forEach((c, i) => { const on = ch.has(c), x = dx + 16 + (i % 3) * 118, y = dy + dh + 30 + Math.floor(i / 3) * 26; g.fillStyle = on ? C.ink : '#c9bd9f'; g.fillText((on ? '● ' : '○ ') + c, x, y); });
  }
  const DIAL_STEPS = [
    { trig: 'one shot', dur: 'short', mo: 'snap', ch: ['animation'], say: 'A tap, a short burst, snap motion: intensity jumps up and drops back down with no in-between.' },
    { trig: 'one shot', dur: 'short', mo: 'ease', ch: ['animation'], say: 'Same input, ease motion: the rise and the fall become gradual. The grey line is the same; only the blue changed.' },
    { trig: 'one shot', dur: 'short', mo: 'spring', ch: ['animation'], say: 'Spring motion: the curve overshoots, then wobbles back and settles. Same input again.' },
    { trig: 'one shot', dur: 'instant', mo: 'spring', ch: ['animation'], say: 'Instant duration: one frame of input. The spring still rings out after it.' },
    { trig: 'one shot', dur: 'long', mo: 'ease', ch: ['animation', 'VFX'], say: 'Long duration with ease: a slow, wide shape. VFX joins the channels and scales with the curve.' },
    { trig: 'held', dur: 'medium', mo: 'ease', ch: ['animation', 'VFX', 'audio'], say: 'Held trigger: the shape lasts as long as the button stays down, then fades over its duration.' },
    { trig: 'one shot', dur: 'short', mo: 'snap', ch: ['animation', 'VFX', 'audio', 'camera'], say: 'Back to a snap tap with four channels. Camera shake follows the same curve as everything else.' },
    { trig: 'one shot', dur: 'medium', mo: 'snap', ch: ['animation', 'VFX', 'audio', 'camera', 'haptics', 'time'], say: 'All six channels. Time slows while intensity is high: that is a hit stop, drawn as part of the same shape.' },
  ];
  const STEP = 3, DIAL_DUR = DIAL_STEPS.length * STEP;
  canvasDemo('dials', (s, cv, g) => {
    const st = { trig: 'one shot', dur: 'short', mo: 'snap', ch: ['animation'], tour: true, held: false, t: 0, key: '', step: -1, b: null };
    const tourBtn = $(s, '.fd-tour'), chBox = $(s, '.fd-ch');
    chBox.innerHTML = CH.map(c => `<label class="chk"><input type="checkbox" data-c="${c}">${c}</label>`).join('');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.step = -1; } };
    const segs = { trig: $$(s, '.fd-trig .btn'), dur: $$(s, '.fd-dur .btn'), mo: $$(s, '.fd-mo .btn') };
    Object.entries(segs).forEach(([k, bs]) => bs.forEach(b => b.onclick = () => { manual(); st[k] = b.dataset.v; }));
    $$(chBox, 'input').forEach(i => i.onchange = () => { manual(); st.ch = CH.filter(c => $(chBox, `[data-c="${c}"]`).checked); });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const apply = t => { const k = Math.floor(t / STEP) % DIAL_STEPS.length, d = DIAL_STEPS[k]; Object.assign(st, { trig: d.trig, dur: d.dur, mo: d.mo, ch: [...d.ch] }); st.step = k; return t % STEP; };
    function sync() {
      const key = [st.trig, st.dur, st.mo, st.ch.join('+'), st.step].join();
      if (key === st.key) return; st.key = key; st.b = build(st);
      Object.entries(segs).forEach(([k, bs]) => bs.forEach(b => b.classList.toggle('on', b.dataset.v === st[k])));
      $$(chBox, 'input').forEach(i => i.checked = st.ch.includes(i.dataset.c));
      say($(s, '.fd-mo-out'), MOTION[st.mo]);
      say($(s, '.fd-out'), st.step >= 0 ? DIAL_STEPS[st.step].say : 'Change one descriptor at a time and watch which part of the curve moves. The demo on the right reads the same curve on every channel you switch on.');
    }
    scenes.dials = { seek(t) { st.held = true; st.tour = true; const f = apply(t); sync(); drawDials(g, st, f); }, dur: () => DIAL_DUR };
    return dt => {
      if (st.held) return; st.t += Math.max(0, dt); let f = st.t;
      if (st.tour) { if (st.t >= DIAL_DUR) st.t = 0; f = apply(st.t); }
      sync(); drawDials(g, st, f);
    };
  });

  /* =================== slide 2: the grid of sixteen =================== */
  const GX = 8, GY = 8, CW = 250, CH_ = 134, GAP = 8;
  const cardXY = i => ({ x: GX + (i % 4) * (CW + GAP), y: GY + Math.floor(i / 4) * (CH_ + 9) });
  function drawCard(g, i, t, selA, selB, dim) {
    const ty = TYPES[i], { x, y } = cardXY(i), tl = t % LOOP;
    g.globalAlpha = dim ? .45 : 1;
    g.fillStyle = CARD; g.beginPath(); g.roundRect(x, y, CW, CH_, 10); g.fill();
    if (selA || selB) { g.strokeStyle = selA ? COL_A : COL_B; g.lineWidth = 4; g.beginPath(); g.roundRect(x + 1, y + 1, CW - 2, CH_ - 2, 10); g.stroke(); }
    g.textAlign = 'left'; g.font = font(800, 15, 'M'); g.fillStyle = C.ink; g.fillText(ty.name, x + 10, y + 20);
    g.textAlign = 'right'; g.font = font(600, 11); g.fillStyle = C.muted; g.fillText(`${ty.trig} · ${ty.dur} · ${ty.mo}`, x + CW - 10, y + 19);
    const cx = x + 10, cy = y + 28, cw = 124, chh = 72;
    axes(g, cx, cy, cw, chh, { bg: '#fffaf0' });
    const col = selA ? COL_A : selB ? COL_B : C.ink, c = curve(g, cx, cy, cw, chh, ty.s, col, 2, .12);
    playhead(g, cx, cy, cw, chh, tl, c.val, col);
    demoBox(g, ty, x + CW - 112, y + 28, 1.02, tl);
    chipRow(g, x + 10, y + CH_ - 14, CH.map(c => [CH_S[c], ty.ch.includes(c)]), CW - 16);
    g.globalAlpha = 1;
  }
  function drawGrid(g, st, t) {
    T.use(g); bg(g);
    const [a, b] = st.sel;
    TYPES.forEach((_, i) => drawCard(g, i, t, i === a, i === b, st.sel.length === 2 && i !== a && i !== b));
    if (st.hover >= 0 && !st.sel.includes(st.hover)) { const { x, y } = cardXY(st.hover); g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.roundRect(x + 1, y + 1, CW - 2, CH_ - 2, 10); g.stroke(); }
  }
  function drawCmp(g, st, t) {
    g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, 340, 180);
    const x = 30, y = 12, w = 296, h = 140, tl = t % LOOP;
    axes(g, x, y, w, h, { grid: true, labels: true, fs: 10 });
    if (!st.sel.length) { g.font = font(600, 13); g.fillStyle = C.muted; g.textAlign = 'center'; g.fillText('Click two cards to overlay them', x + w / 2, y + h / 2 - 10); return; }
    st.sel.forEach((i, k) => { const col = k ? COL_B : COL_A, c = curve(g, x, y, w, h, TYPES[i].s, col, 2.5, .12); playhead(g, x, y, w, h, tl, c.val, col); });
    g.font = font(800, 12, 'M'); g.textAlign = 'right';
    st.sel.forEach((i, k) => { g.fillStyle = k ? COL_B : COL_A; g.fillText(TYPES[i].name, x + w - 4, y + 16 + k * 16); });
  }
  const PAIRS = [['velcro', 'grip'], ['swish', 'grease'], ['crunch', 'sticky'], ['electricity', 'woosh']];
  const PAIR_SAY = {
    'velcro+grip': 'Both hold while you hold. Grip stays steady with a fine texture under it. Velcro builds tension as you pull, then lets go with a springy tug.',
    'swish+grease': 'Both are smooth with no hard edge. Swish is a short sweep that comes and goes. Grease is a low glide that keeps going.',
    'crunch+sticky': 'Both open on one impact. Crunch breaks into small secondary bits. Sticky freezes time first, then shakes.',
    'electricity+woosh': 'Both build before they release. Electricity charges for over a second while held. Woosh is a quick pull back and a snap.',
  };
  function pairText(a, b) {
    const A = TYPES[a], B = TYPES[b], key2 = [A.k, B.k].join('+'), key3 = [B.k, A.k].join('+');
    if (PAIR_SAY[key2] || PAIR_SAY[key3]) return PAIR_SAY[key2] || PAIR_SAY[key3];
    const shared = [A.trig === B.trig && A.trig, A.dur === B.dur && A.dur, A.mo === B.mo && A.mo, ...A.ch.filter(c => B.ch.includes(c))].filter(Boolean);
    const pk = ty => { let m = 0; ty.s.forEach((v, i) => { if (v > ty.s[m]) m = i; }); return (m * WIN / (N - 1)).toFixed(2); };
    return `${A.name} peaks at ${pk(A)} s and ${B.name} at ${pk(B)} s. Shared chips: ${shared.length ? shared.join(', ') : 'none'}.`;
  }
  const GRID_STEP = 6, GRID_DUR = PAIRS.length * GRID_STEP;
  canvasDemo('grid', (s, cv, g) => {
    const st = { sel: [], hover: -1, tour: true, held: false, t: 0, key: '', pair: -1 };
    const cmp = $(s, '.fs-cmp'), cg = cmp.getContext('2d'), tourBtn = $(s, '.fg-tour');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.sel = []; st.pair = -1; } };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    $(s, '.fg-clear').onclick = () => { manual(); st.sel = []; };
    const atPt = e => { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height; return TYPES.findIndex((_, i) => { const c = cardXY(i); return x >= c.x && x < c.x + CW && y >= c.y && y < c.y + CH_; }); };
    cv.addEventListener('mousemove', e => { st.hover = atPt(e); cv.style.cursor = st.hover >= 0 ? 'pointer' : ''; });
    cv.addEventListener('mouseleave', () => { st.hover = -1; });
    cv.addEventListener('click', e => {
      const i = atPt(e); if (i < 0) return; manual();
      if (st.sel.includes(i)) st.sel = st.sel.filter(x => x !== i); else { st.sel.push(i); if (st.sel.length > 2) st.sel.shift(); }
    });
    const apply = t => { const k = Math.floor(t / GRID_STEP) % PAIRS.length, f = t % GRID_STEP; st.pair = k; st.sel = f < 1.5 ? [byK(PAIRS[k][0])] : PAIRS[k].map(byK); return t; };
    function info() {
      const key = st.sel.join() + '|' + st.pair; if (key === st.key) return; st.key = key;
      const [a, b] = st.sel;
      say($(s, '.fg-info'), st.sel.map((i, k) => `<p class="fs-def"><b class="${k ? 'b' : 'a'}">${TYPES[i].name}.</b> ${TYPES[i].def}</p>${chipsHTML(TYPES[i], k ? 'b' : 'a')}`).join(''));
      say($(s, '.fg-out'), b != null ? pairText(a, b) : a != null ? 'Pick a second card to lay its curve over this one.' : 'Each card shows the same 2 s window: the curve on the left, a grey-box demo playing it on the right, and its chips. Click two cards to compare them.');
    }
    scenes.grid = { seek(t) { st.held = true; st.tour = true; const f = apply(t); info(); drawGrid(g, st, f); drawCmp(cg, st, f); }, dur: () => GRID_DUR };
    return dt => {
      if (st.held) return; st.t += Math.max(0, dt); let f = st.t;
      if (st.tour) { if (st.t >= GRID_DUR) st.t = 0; apply(st.t); }
      info(); drawGrid(g, st, f); drawCmp(cg, st, f);
    };
  });

  /* =================== slide 3: the builder =================== */
  // distance: RMS gap between curves at the best small time shift (up to 0.1 s), plus a penalty per mismatched chip
  function dist(arr, chips, ty) {
    let best = 1e9;
    for (let sh = -4; sh <= 4; sh++) { let s = 0; for (let i = 0; i < N; i++) { const j = clamp(i + sh, 0, N - 1); const d = arr[i] - ty.s[j]; s += d * d; } best = Math.min(best, Math.sqrt(s / N)); }
    const inter = ty.ch.filter(c => chips.ch.includes(c)).length, uni = new Set([...ty.ch, ...chips.ch]).size;
    const pen = (chips.trig !== ty.trig ? .05 : 0) + Math.abs(DURS.indexOf(chips.dur) - DURS.indexOf(ty.dur)) * .02 + (chips.mo !== ty.mo ? .04 : 0) + (uni ? (1 - inter / uni) * .05 : 0);
    return best + pen;
  }
  const NAMED = .15;   // under this distance the drawing counts as that type
  const rank = (arr, chips) => TYPES.map((ty, i) => ({ i, d: dist(arr, chips, ty) })).sort((a, b) => a.d - b.d);
  const BX = 60, BY = 64, BW = 560, BH = 420;
  const BUILD_SHOTS = [
    { f: TYPES[byK('crunch')].f, trig: 'one shot', dur: 'short', mo: 'snap', ch: ['VFX', 'audio', 'camera'], say: 'One spike, then three smaller bumps, as a snap one shot: the closest named shape is crunch.' },
    { f: t => t < .15 ? 0 : t < 1.1 ? .65 * Math.pow((t - .15) / .95, 1.7) : hit(t, 1.1, .16), trig: 'held', dur: 'long', mo: 'ease', ch: ['VFX', 'audio', 'haptics'], say: 'A long charge while held, then a release: this reads as electricity, the Mega Man X charge shot.' },
    { f: t => .55 * gauss(t, .35, .1) + .8 * gauss(t, 1.0, .05) + .3 * sstep(1.3, 1.8, t), trig: 'one shot', dur: 'medium', mo: 'spring', ch: ['animation', 'time'], say: 'A soft swell, a sharp hit, then a slow rise that holds: no type sits close. Slide 270: "What matters is the shape underneath." Name it yourself.' },
  ];
  const BSTEP = 7, BUILD_DUR = BUILD_SHOTS.length * BSTEP;
  function drawBuild(g, st, t) {
    T.use(g); bg(g);
    const r = rank(st.arr, st), top = r[0], named = top.d < NAMED, tl = t % LOOP;
    g.font = font(800, 18, 'M'); g.fillStyle = C.ink; g.textAlign = 'left'; g.fillText('Your curve', 24, 38);
    g.font = font(500, 14); g.fillStyle = C.muted; g.fillText('Drag across the chart to draw intensity over 2 seconds.', 150, 38);
    axes(g, BX, BY, BW, BH, { grid: true, labels: true, fs: 13 });
    const ty = TYPES[top.i];
    curve(g, BX, BY, BW, BH, ty.s, named ? 'rgba(224,123,26,.75)' : 'rgba(224,123,26,.35)', 2.5);
    const c = curve(g, BX, BY, BW, BH, st.arr, COL_A, 4, .14);
    playhead(g, BX, BY, BW, BH, tl, c.val, COL_A);
    if (st.pen != null) { g.fillStyle = C.ink; g.beginPath(); g.arc(st.pen[0], st.pen[1], 6, 0, TAU); g.fill(); }
    g.font = font(600, 13); g.textAlign = 'left'; g.fillStyle = COL_A; g.fillText('● your drawing', BX, BY + BH + 42); g.fillStyle = COL_B; g.fillText(`● closest: ${ty.name}`, BX + 140, BY + BH + 42);
    // verdict
    const vx = 650, vy = 60;
    g.fillStyle = CARD; g.beginPath(); g.roundRect(vx, vy - 10, 370, 516, 12); g.fill();
    g.font = font(600, 13); g.fillStyle = C.muted; g.fillText(named ? 'Closest named type' : 'No named type is close', vx + 18, vy + 16);
    g.font = font(800, 30, 'M'); g.fillStyle = named ? C.ink : C.redDk; g.fillText(named ? ty.name : 'Unnamed shape', vx + 18, vy + 52);
    g.font = font(500, 13); g.fillStyle = C.ink;
    wrap(g, named ? ty.def : `Nearest is ${ty.name}, but the gap is wide. Slide 270: "None of these terms are official, they're just names for shapes." Give this one a name.`, vx + 18, vy + 78, 334, 18);
    demoBox(g, named ? ty : { k: ty.k, f: ty.f }, vx + 35, vy + 128, 3, tl);
    if (!named) { g.fillStyle = 'rgba(239,230,210,.7)'; g.fillRect(vx + 35, vy + 128, 300, 210); g.font = font(700, 14); g.fillStyle = C.muted; g.textAlign = 'center'; g.fillText(`(${ty.name}, for reference)`, vx + 185, vy + 240); g.textAlign = 'left'; }
    g.font = font(700, 13); g.fillStyle = C.ink; g.fillText('Ranking', vx + 18, vy + 368);
    r.slice(0, 4).forEach((e, k) => {
      const y = vy + 388 + k * 24, m = clamp(1 - e.d / .45);
      g.font = font(600, 13); g.fillStyle = C.ink; g.fillText(TYPES[e.i].name, vx + 18, y + 4);
      g.fillStyle = '#e6dcc5'; g.fillRect(vx + 120, y - 7, 180, 12); g.fillStyle = e.d < NAMED ? C.p2 : C.stone; g.fillRect(vx + 120, y - 7, 180 * m, 12);
      g.fillStyle = C.muted; g.fillText(`${Math.round(m * 100)}%`, vx + 310, y + 4);
    });
    g.font = font(500, 12); g.fillStyle = C.muted; g.fillText(`Named when the match is over ${Math.round((1 - NAMED / .45) * 100)}%.`, vx + 18, vy + 494);
  }
  function wrap(g, text, x, y, w, lh) { const words = text.split(' '); let line = '', yy = y; words.forEach(wd => { const tst = line ? line + ' ' + wd : wd; if (g.measureText(tst).width > w && line) { g.fillText(line, x, yy); line = wd; yy += lh; } else line = tst; }); if (line) g.fillText(line, x, yy); }
  canvasDemo('build', (s, cv, g) => {
    const st = { arr: new Float32Array(N), trig: 'one shot', dur: 'short', mo: 'snap', ch: ['VFX', 'audio'], tour: true, held: false, t: 0, key: '', shot: -1, pen: null, last: null };
    const tourBtn = $(s, '.fb-tour'), chBox = $(s, '.fb-ch');
    chBox.innerHTML = CH.map(c => `<label class="chk"><input type="checkbox" data-c="${c}">${c}</label>`).join('');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.shot = -1; st.pen = null; } };
    const segs = { trig: $$(s, '.fb-trig .btn'), dur: $$(s, '.fb-dur .btn'), mo: $$(s, '.fb-mo .btn') };
    Object.entries(segs).forEach(([k, bs]) => bs.forEach(b => b.onclick = () => { manual(); st[k] = b.dataset.v; }));
    $$(chBox, 'input').forEach(i => i.onchange = () => { manual(); st.ch = CH.filter(c => $(chBox, `[data-c="${c}"]`).checked); });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    $(s, '.fb-clear').onclick = () => { manual(); st.arr = new Float32Array(N); };
    $(s, '.fb-smooth').onclick = () => { manual(); const a = st.arr, b = new Float32Array(N); for (let i = 0; i < N; i++) b[i] = (a[Math.max(0, i - 1)] + 2 * a[i] + a[Math.min(N - 1, i + 1)]) / 4; st.arr = b; };
    const toData = e => { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height; return [x, y, Math.round(clamp((x - BX) / BW) * (N - 1)), clamp(YMAX - (y - BY) / BH * (YMAX - YMIN), YMIN, YMAX)]; };
    let down = false;
    const paint = e => { const [, , i, v] = toData(e), [li, lv] = st.last || [i, v]; if (i === li) st.arr[i] = v; else { const d = i > li ? 1 : -1; for (let j = li; j !== i + d; j += d) st.arr[j] = lerp(lv, v, (j - li) / (i - li)); } st.last = [i, v]; };
    cv.addEventListener('pointerdown', e => { const [x, y] = toData(e); if (x < BX - 10 || x > BX + BW + 10 || y < BY - 20 || y > BY + BH + 20) return; manual(); down = true; st.last = null; cv.setPointerCapture(e.pointerId); paint(e); });
    cv.addEventListener('pointermove', e => { const [x, y] = toData(e); cv.style.cursor = x >= BX && x <= BX + BW && y >= BY && y <= BY + BH ? 'crosshair' : ''; if (down) paint(e); });
    cv.addEventListener('pointerup', () => { down = false; st.last = null; });
    const apply = t => {
      const k = Math.floor(t / BSTEP) % BUILD_SHOTS.length, f = t % BSTEP, sh = BUILD_SHOTS[k], p = clamp(f / 3);
      st.shot = k; Object.assign(st, { trig: sh.trig, dur: sh.dur, mo: sh.mo, ch: [...sh.ch] });
      const arr = new Float32Array(N), lim = Math.floor(p * (N - 1));
      for (let i = 0; i <= lim; i++) arr[i] = sh.f(i * WIN / (N - 1));
      st.arr = arr;
      st.pen = p < 1 ? [BX + lim / (N - 1) * BW, BY + BH - (clamp(arr[lim], YMIN, YMAX) - YMIN) / (YMAX - YMIN) * BH] : null;
      return f;
    };
    function sync() {
      const r = rank(st.arr, st), top = r[0], key = [st.trig, st.dur, st.mo, st.ch.join('+'), st.shot, top.i, top.d < NAMED].join();
      if (key === st.key) return; st.key = key;
      Object.entries(segs).forEach(([k, bs]) => bs.forEach(b => b.classList.toggle('on', b.dataset.v === st[k])));
      $$(chBox, 'input').forEach(i => i.checked = st.ch.includes(i.dataset.c));
      say($(s, '.fb-out'), st.shot >= 0 ? BUILD_SHOTS[st.shot].say : top.d < NAMED ? `Closest named type: <b>${TYPES[top.i].name}</b>. Change the chips too; they count toward the match.` : `<b>Unnamed shape.</b> Nearest is ${TYPES[top.i].name}, but not close. "Invent your own": give it a name and a use.`);
    }
    scenes.build = { seek(t) { st.held = true; st.tour = true; const f = apply(t); sync(); drawBuild(g, st, f); }, dur: () => BUILD_DUR };
    return dt => {
      if (st.held) return; st.t += Math.max(0, dt); let f = st.t;
      if (st.tour) { if (st.t >= BUILD_DUR) st.t = 0; f = apply(st.t); }
      sync(); drawBuild(g, st, f);
    };
  });

  window.__seek = (t, which = 'grid') => scenes[which].seek(t);
  window.__dur = (which = 'grid') => scenes[which].dur();
  window.__fs = { TYPES, rank, dist };   // for checking the matcher
})();
