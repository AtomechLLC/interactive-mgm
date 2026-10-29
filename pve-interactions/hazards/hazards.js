// Hazard movement patterns (MGM C4 M5, deck slides 186-199).
// Each pattern draws one 1280x720 frame for any time t in [0, T): the slide's 3x3 grid on the left
// (its arrow fills in as the hazard moves) and a top-down example from the slide's list on the right.
// Frames are a pure function of t, so the loops are seamless and ../tools/record.js can render them.
(() => {
  const W = 1280, H = 720;
  const PX = 430, PY = 232, PW = 810, PH = 440;          // example panel
  const GX = 82, GY = 222, CELL = 92;                     // schematic grid
  const C = {
    navy: '#152044', ink: '#262c6a', blue: '#5562eb', gold: '#ffb951', goldInk: '#9a5a06', paper: '#ebe4d6',
    red: '#e5322d', redDk: '#a8201c', player: '#2ea3dc', floor: '#ddd2bc', floorLn: '#cdbf9f', floorDk: '#d2c6ad',
    wall: '#3d4270', wallHi: '#5a5f92', wallDk: '#2a2e55', wood: '#9a6434', woodDk: '#6b421f', woodHi: '#b98552',
    metal: '#a3a9c0', metalDk: '#62688a', fire: '#ff8a2a', sand: '#d7b674', sandDk: '#b8934c', slime: '#5fbf4a', slimeDk: '#3a8a2c',
  };
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const frac = v => v - Math.floor(v);
  const mix = (a, b, k) => Array.isArray(a) ? a.map((v, i) => lerp(v, b[i], k)) : lerp(a, b, k);
  // keyframes [[time, value, 'lin'?], ...]; two keys at the same time make a jump
  function kf(t, keys) {
    if (t < keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, v0] = keys[i], [t1, v1, how] = keys[i + 1];
      if (t >= t0 && t < t1) { const u = (t - t0) / (t1 - t0); return mix(v0, v1, how === 'lin' ? u : ease(u)); }
    }
    return keys[keys.length - 1][1];
  }
  const heading = (keys, t, def = -Math.PI / 2) => {
    const a = kf(t, keys), b = kf(t + .06, keys), dx = b[0] - a[0], dy = b[1] - a[1];
    return Math.hypot(dx, dy) > .5 ? Math.atan2(dy, dx) : def;
  };
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // ---------- drawing helpers (panel-local coordinates) ----------
  let X;   // the 2d context
  // environments: the same pattern, re-skinned per theme. ENV.dungeon is the original look.
  const ENV = {
    dungeon: { floor: '#ddd2bc', ln: '#cdbf9f', tint: 'rgba(120,96,50,.07)', fs: 'tiles', wall: '#3d4270', wallDk: '#2a2e55', wallHi: '#5a5f92', ws: 'brick' },
    factory: { floor: '#aeb2b9', ln: '#959aa3', tint: 'rgba(60,60,70,.07)', fs: 'panel', wall: '#4b5059', wallDk: '#33373e', wallHi: '#f2c230', ws: 'panel' },
    scifi: { floor: '#3a4262', ln: '#4f5a80', tint: 'rgba(120,200,255,.05)', fs: 'panel', wall: '#1e2340', wallDk: '#141830', wallHi: '#4fd1ff', ws: 'panel' },
    jungle: { floor: '#86b05e', ln: '#76a050', tint: 'rgba(40,80,20,.10)', fs: 'grass', wall: '#3e6a31', wallDk: '#2c5223', wallHi: '#5d8f45', ws: 'hedge' },
    farm: { floor: '#a9cf72', ln: '#97bd60', tint: 'rgba(60,100,20,.08)', fs: 'grass', wall: '#6b4a2a', wallDk: '#4f351c', wallHi: '#8c6640', ws: 'fence' },
    desert: { floor: '#e6cd98', ln: '#d4b67d', tint: 'rgba(150,100,40,.07)', fs: 'tiles', wall: '#a9824c', wallDk: '#87653a', wallHi: '#c79d62', ws: 'brick' },
    cave: { floor: '#5e5468', ln: '#504759', tint: 'rgba(0,0,0,.08)', fs: 'rock', wall: '#2f2838', wallDk: '#211c28', wallHi: '#7a6a8c', ws: 'rock' },
    mountain: { floor: '#aaa193', ln: '#978d7f', tint: 'rgba(60,50,40,.08)', fs: 'rock', wall: '#655d55', wallDk: '#4a443e', wallHi: '#857b70', ws: 'rock' },
    ice: { floor: '#dcedf5', ln: '#bcd9e7', tint: 'rgba(80,140,180,.07)', fs: 'tiles', wall: '#6f98b8', wallDk: '#557d9d', wallHi: '#cfe9f7', ws: 'brick' },
    water: { floor: '#4d9ec8', ln: '#76bde0', tint: 'rgba(255,255,255,.06)', fs: 'water', wall: '#3b6e45', wallDk: '#2a5233', wallHi: '#5d8f45', ws: 'hedge' },
    wood: { floor: '#c39c6c', ln: '#a37c4f', tint: 'rgba(90,60,30,.08)', fs: 'planks', wall: '#5c3e24', wallDk: '#3f2a17', wallHi: '#7d5a38', ws: 'brick' },
    arena: { floor: '#e4c891', ln: '#d4b47a', tint: 'rgba(150,100,40,.08)', fs: 'sand', wall: '#8a5a34', wallDk: '#6b421f', wallHi: '#b07a48', ws: 'fence' },
    alien: { floor: '#4e4262', ln: '#5f5276', tint: 'rgba(200,120,255,.05)', fs: 'rock', wall: '#2b2240', wallDk: '#1d162d', wallHi: '#b56cff', ws: 'rock' },
  };
  let E = ENV.dungeon;
  function floor(col = E.floor, step = 40) {
    X.fillStyle = col; X.fillRect(0, 0, PW, PH);
    const r = rng(7);
    if (E.fs === 'tiles' || E.fs === 'panel') {
      if (E.fs === 'panel') step = 80;
      for (let y = 0; y < PH; y += step) for (let x = (y / step) % 2 && E.fs === 'tiles' ? -step / 2 : 0; x < PW; x += step)
        if (r() < .22) { X.fillStyle = E.tint; X.fillRect(x + 1, y + 1, step - 2, step - 2); }
      X.strokeStyle = E.ln; X.lineWidth = 1.5; X.beginPath();
      for (let y = 0; y <= PH; y += step) {
        X.moveTo(0, y); X.lineTo(PW, y);
        for (let x = (y / step) % 2 && E.fs === 'tiles' ? -step / 2 : 0; x < PW; x += step) { X.moveTo(x, y); X.lineTo(x, y + step); }
      }
      X.stroke();
      if (E.fs === 'panel') { X.fillStyle = E.ln; for (let y = 0; y <= PH; y += step) for (let x = 0; x <= PW; x += step) for (const [dx, dy] of [[6, 6], [-6, 6], [6, -6], [-6, -6]]) { X.beginPath(); X.arc(x + dx, y + dy, 2, 0, TAU); X.fill(); } }
    } else if (E.fs === 'grass' || E.fs === 'sand') {
      for (let i = 0; i < 520; i++) {
        const x = r() * PW, y = r() * PH;
        if (E.fs === 'grass') { X.strokeStyle = r() < .5 ? E.ln : 'rgba(255,255,220,.25)'; X.lineWidth = 2; X.beginPath(); X.moveTo(x, y); X.lineTo(x - 3, y - 7); X.moveTo(x + 3, y); X.lineTo(x + 5, y - 6); X.stroke(); }
        else { X.fillStyle = r() < .5 ? E.ln : 'rgba(255,255,240,.35)'; X.beginPath(); X.arc(x, y, 1.6, 0, TAU); X.fill(); }
      }
    } else if (E.fs === 'rock') {
      for (let i = 0; i < 90; i++) { X.fillStyle = r() < .5 ? E.ln : E.tint; X.beginPath(); X.ellipse(r() * PW, r() * PH, 6 + r() * 14, 4 + r() * 9, r() * 3, 0, TAU); X.fill(); }
    } else if (E.fs === 'water') {
      X.strokeStyle = E.ln; X.lineWidth = 2.5;
      for (let i = 0; i < 70; i++) { const x = r() * PW, y = r() * PH; X.beginPath(); X.arc(x, y, 12, Math.PI * 1.15, Math.PI * 1.85); X.stroke(); }
    } else if (E.fs === 'planks') {
      X.strokeStyle = E.ln; X.lineWidth = 2; X.beginPath();
      for (let y = 0, row = 0; y <= PH; y += 30, row++) { X.moveTo(0, y); X.lineTo(PW, y); for (let x = (row * 97) % 160; x < PW; x += 160) { X.moveTo(x, y); X.lineTo(x, y + 30); } }
      X.stroke();
    }
  }
  function wall(x, y, w, h) {
    X.fillStyle = E.wall; X.fillRect(x, y, w, h);
    X.strokeStyle = E.wallDk; X.lineWidth = 2; X.beginPath();
    if (E.ws === 'brick') {
      for (let yy = y + 22; yy < y + h; yy += 22) { X.moveTo(x, yy); X.lineTo(x + w, yy); }
      for (let yy = y, row = 0; yy < y + h; yy += 22, row++) for (let xx = x + (row % 2 ? 22 : 0); xx < x + w; xx += 44) { X.moveTo(xx, yy); X.lineTo(xx, Math.min(yy + 22, y + h)); }
      X.stroke();
    } else if (E.ws === 'panel') {
      for (let xx = x + 70; xx < x + w; xx += 70) { X.moveTo(xx, y); X.lineTo(xx, y + h); }
      for (let yy = y + 36; yy < y + h; yy += 36) { X.moveTo(x, yy); X.lineTo(x + w, yy); }
      X.stroke();
    } else if (E.ws === 'hedge' || E.ws === 'rock') {
      const r = rng(Math.round(x * 7 + y * 13 + w));
      for (let i = 0; i < w * h / 500; i++) {
        const cx = x + r() * w, cy = y + r() * h, rr = E.ws === 'hedge' ? 10 + r() * 10 : 8 + r() * 16;
        X.fillStyle = r() < .5 ? E.wallDk : E.wallHi; X.globalAlpha = E.ws === 'hedge' ? .8 : .45;
        X.beginPath(); E.ws === 'hedge' ? X.arc(cx, cy, rr, 0, TAU) : X.ellipse(cx, cy, rr, rr * .6, r() * 3, 0, TAU); X.fill();
      }
      X.globalAlpha = 1;
    } else if (E.ws === 'fence') {
      for (let xx = x; xx < x + w; xx += 26) { X.moveTo(xx, y); X.lineTo(xx, y + h); }
      X.stroke(); X.fillStyle = E.wallHi; for (let xx = x + 13; xx < x + w; xx += 52) X.fillRect(xx - 3, y, 6, h);
    }
  }
  function edge(x, y, w, h) { X.fillStyle = E.wallHi; X.fillRect(x, y, w, h); }
  function shadow(x, y, rx, ry, a = .22) { X.fillStyle = `rgba(40,30,20,${a})`; X.beginPath(); X.ellipse(x, y, rx, ry, 0, 0, TAU); X.fill(); }
  function player(x, y, ang = -Math.PI / 2, s = 1) {
    shadow(x + 3, y + 5, 19 * s, 15 * s, .25);
    X.save(); X.translate(x, y); X.scale(s, s);
    X.fillStyle = C.player; X.strokeStyle = '#fff'; X.lineWidth = 3.5;
    X.beginPath(); X.arc(0, 0, 18, 0, TAU); X.fill(); X.stroke();
    X.strokeStyle = C.navy; X.lineWidth = 1.5; X.beginPath(); X.arc(0, 0, 20.5, 0, TAU); X.stroke();
    X.rotate(ang + Math.PI / 2);
    X.fillStyle = '#fff'; X.beginPath(); X.moveTo(0, -11); X.lineTo(9.5, 7); X.lineTo(-9.5, 7); X.closePath(); X.fill();
    X.fillStyle = '#9fdcf3'; X.beginPath(); X.moveTo(0, 0); X.lineTo(5, 7); X.lineTo(-5, 7); X.closePath(); X.fill();
    X.restore();
  }
  function bang(x, y, a = 1) {      // "!" over the player when they read the telegraph
    if (a <= 0) return;
    X.save(); X.globalAlpha = a; X.translate(x + 18, y - 34);
    X.fillStyle = '#fff'; X.strokeStyle = C.red; X.lineWidth = 3;
    X.beginPath(); X.arc(0, 0, 14, 0, TAU); X.fill(); X.stroke();
    X.fillStyle = C.red; X.font = '800 20px Montserrat'; X.textAlign = 'center'; X.textBaseline = 'middle'; X.fillText('!', 0, 1);
    X.restore();
  }
  const bangAt = (t, t0, t1) => t >= t0 && t < t1 ? clamp((t - t0) / .12) * clamp((t1 - t) / .15) : 0;
  function danger(x, y, r, a) {     // red telegraph zone
    if (r <= 0 || a <= 0) return;
    X.fillStyle = `rgba(229,50,45,${.16 * a})`; X.beginPath(); X.arc(x, y, r, 0, TAU); X.fill();
    X.setLineDash([10, 8]); X.strokeStyle = `rgba(229,50,45,${.85 * a})`; X.lineWidth = 3; X.stroke(); X.setLineDash([]);
  }
  function flash(x, y, r, a) {
    if (a <= 0) return;
    const g = X.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,250,220,${a})`); g.addColorStop(.45, `rgba(255,185,81,${.8 * a})`); g.addColorStop(1, 'rgba(255,120,40,0)');
    X.fillStyle = g; X.beginPath(); X.arc(x, y, r, 0, TAU); X.fill();
  }
  function flame(x, y, s, t, seed = 0) {
    const f = .8 + .2 * Math.sin(t * 19 + seed * 3.1) + .12 * Math.sin(t * 31 + seed);
    X.fillStyle = 'rgba(229,50,45,.85)'; X.beginPath(); X.ellipse(x, y, 11 * s, 14 * s * f, 0, 0, TAU); X.fill();
    X.fillStyle = C.fire; X.beginPath(); X.ellipse(x, y + 1 * s, 8 * s, 10 * s * f, 0, 0, TAU); X.fill();
    X.fillStyle = C.gold; X.beginPath(); X.ellipse(x, y + 3 * s, 4.5 * s, 6 * s * f, 0, 0, TAU); X.fill();
  }
  function puff(x, y, r, a) { if (a <= 0) return; X.fillStyle = `rgba(150,135,110,${a})`; X.beginPath(); X.arc(x, y, r, 0, TAU); X.fill(); }
  function dust(x, y, age, n = 7, spread = 60, seed = 1) {   // burst of dust, age in seconds
    if (age < 0 || age > .9) return;
    const r = rng(seed), k = age / .9;
    for (let i = 0; i < n; i++) { const a = r() * TAU, d = spread * (.4 + .6 * r()) * ease(k); puff(x + Math.cos(a) * d, y + Math.sin(a) * d * .7, 8 + 14 * k, .5 * (1 - k)); }
  }
  function label(text, x, y, align = 'center', col = C.ink, size = 16) {
    X.font = `600 ${size}px Jost`; X.textAlign = align; X.textBaseline = 'middle';
    const w = X.measureText(text).width, bx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    X.fillStyle = 'rgba(255,252,244,.88)'; X.beginPath(); X.roundRect(bx - 8, y - 13, w + 16, 26, 13); X.fill();
    X.fillStyle = col; X.fillText(text, x, y + 1);
  }
  function ball(x, y, r, rot, col = C.metal, dk = C.metalDk) {
    const g = X.createRadialGradient(x - r * .35, y - r * .35, r * .1, x, y, r);
    g.addColorStop(0, '#fff'); g.addColorStop(.25, col); g.addColorStop(1, dk);
    X.fillStyle = g; X.beginPath(); X.arc(x, y, r, 0, TAU); X.fill();
    X.strokeStyle = 'rgba(30,30,50,.35)'; X.lineWidth = 2; X.stroke();
    if (rot != null) { X.save(); X.translate(x, y); X.rotate(rot); X.strokeStyle = 'rgba(40,30,30,.35)'; X.lineWidth = 3;
      X.beginPath(); X.moveTo(-r * .6, -r * .2); X.lineTo(r * .3, -r * .5); X.moveTo(-r * .2, r * .5); X.lineTo(r * .55, r * .15); X.stroke(); X.restore(); }
  }

  // ---------- art for the themed variants ----------
  function vine(x0, y0, x1, y1, t, seed) {
    const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 8)), pts = [];
    for (let i = 0; i <= n; i++) { const k = i / n; pts.push([lerp(x0, x1, k) + Math.sin(k * 9 + seed + t * 3) * 7 * k, lerp(y0, y1, k)]); }
    X.lineCap = 'round'; X.lineJoin = 'round';
    X.strokeStyle = '#2f5a22'; X.lineWidth = 10; X.beginPath(); pts.forEach((q, i) => i ? X.lineTo(...q) : X.moveTo(...q)); X.stroke();
    X.strokeStyle = '#5c9a3c'; X.lineWidth = 4; X.stroke();
    for (let i = 3; i < pts.length; i += 3) { const [x, y] = pts[i], sd = i % 2 ? 1 : -1; X.fillStyle = '#4f8f34'; X.beginPath(); X.ellipse(x + sd * 9, y, 8, 4, sd * .6, 0, TAU); X.fill(); }
    const [tx, ty] = pts[pts.length - 1]; X.strokeStyle = '#2f5a22'; X.lineWidth = 5; X.beginPath(); X.arc(tx + 6, ty, 6, Math.PI, TAU * .9); X.stroke();
  }
  function boar(x, y, ang, t, s = 1) {
    X.save(); X.translate(x, y); X.rotate(ang); X.scale(s, s);
    shadow(0, 4, 26, 15, .25);
    X.strokeStyle = '#3e2a1c'; X.lineWidth = 5; X.lineCap = 'round';
    for (const [lx, ly] of [[10, -13], [10, 13], [-12, -13], [-12, 13]]) { const sw = Math.sin(t * 28 + lx) * 6; X.beginPath(); X.moveTo(lx, ly * .7); X.lineTo(lx + sw, ly); X.stroke(); }
    X.fillStyle = '#6b4a35'; X.beginPath(); X.ellipse(-2, 0, 24, 14, 0, 0, TAU); X.fill();
    X.fillStyle = '#3e2a1c'; X.beginPath(); X.ellipse(-4, 0, 18, 4, 0, 0, TAU); X.fill();
    X.fillStyle = '#7d5a42'; X.beginPath(); X.arc(22, 0, 10, 0, TAU); X.fill();
    X.fillStyle = '#c28a74'; X.beginPath(); X.ellipse(31, 0, 4, 6, 0, 0, TAU); X.fill();
    X.strokeStyle = '#fff'; X.lineWidth = 2.5; X.beginPath(); X.moveTo(28, -6); X.lineTo(35, -11); X.moveTo(28, 6); X.lineTo(35, 11); X.stroke();
    X.restore();
  }
  function arrow(x, y) {
    X.strokeStyle = C.woodDk; X.lineWidth = 3; X.beginPath(); X.moveTo(x, y); X.lineTo(x + 58, y); X.stroke();
    X.fillStyle = C.metal; X.beginPath(); X.moveTo(x - 10, y); X.lineTo(x + 4, y - 6); X.lineTo(x + 4, y + 6); X.closePath(); X.fill();
    X.fillStyle = C.red; X.beginPath(); X.moveTo(x + 50, y); X.lineTo(x + 62, y - 7); X.lineTo(x + 58, y); X.lineTo(x + 62, y + 7); X.closePath(); X.fill();
    X.strokeStyle = 'rgba(255,255,255,.4)'; X.lineWidth = 2; X.beginPath(); X.moveTo(x + 66, y); X.lineTo(x + 110, y); X.stroke();
  }
  function mushroom(x, y, t, s = 1) {
    shadow(x + 6, y + 8, 46 * s, 40 * s, .35);
    X.save(); X.translate(x, y); X.scale(s, s);
    X.fillStyle = '#b8325a'; X.beginPath(); X.arc(0, 0, 44, 0, TAU); X.fill(); X.strokeStyle = '#7a1f3c'; X.lineWidth = 3; X.stroke();
    X.fillStyle = '#f6e9ff'; for (const [a, d, r] of [[0, 22, 7], [1.3, 26, 6], [2.5, 20, 8], [3.7, 28, 5], [5, 24, 6], [0, 0, 9]]) { X.beginPath(); X.arc(Math.cos(a) * d, Math.sin(a) * d, r, 0, TAU); X.fill(); }
    X.restore();
  }
  function maw(x, y, t) {
    const pul = 1 + .06 * Math.sin(t * 4);
    X.save(); X.translate(x, y); X.scale(pul, pul);
    X.fillStyle = '#5a2030'; X.beginPath(); X.arc(0, 0, 66, 0, TAU); X.fill();
    X.fillStyle = '#12060a'; X.beginPath(); X.arc(0, 0, 50, 0, TAU); X.fill();
    X.fillStyle = '#f1e6d0'; for (let i = 0; i < 14; i++) { const a = i * TAU / 14; X.beginPath(); X.moveTo(Math.cos(a - .14) * 52, Math.sin(a - .14) * 52); X.lineTo(Math.cos(a) * 34, Math.sin(a) * 34); X.lineTo(Math.cos(a + .14) * 52, Math.sin(a + .14) * 52); X.closePath(); X.fill(); }
    X.restore();
  }
  function bug(x, y, ang, t, s = 1) {
    X.save(); X.translate(x, y); X.rotate(ang); X.scale(s, s);
    X.strokeStyle = '#1d1028'; X.lineWidth = 2.5;
    for (let i = -1; i <= 1; i++) for (const sd of [-1, 1]) { const w = Math.sin(t * 30 + i * 2) * 3; X.beginPath(); X.moveTo(i * 6, 0); X.lineTo(i * 7 + w, sd * 15); X.stroke(); }
    X.fillStyle = '#4b2a68'; X.beginPath(); X.ellipse(-2, 0, 13, 9, 0, 0, TAU); X.fill();
    X.fillStyle = '#2b1838'; X.beginPath(); X.arc(12, 0, 6, 0, TAU); X.fill();
    X.fillStyle = 'rgba(255,255,255,.35)'; X.beginPath(); X.ellipse(-4, -3, 6, 3, 0, 0, TAU); X.fill();
    X.fillStyle = '#ff6b6b'; X.beginPath(); X.arc(15, -3, 1.8, 0, TAU); X.arc(15, 3, 1.8, 0, TAU); X.fill();
    X.restore();
  }
  function zap(a, b, q, al = 1) {   // jagged electric arc from a to b
    if (al <= 0) return;
    const n = 6, dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, pts = [a];
    for (let i = 1; i < n; i++) { const k = i / n, o = (q() - .5) * 18; pts.push([a[0] + dx * k + nx * o, a[1] + dy * k + ny * o]); }
    pts.push(b);
    X.lineJoin = 'round';
    X.strokeStyle = `rgba(120,220,255,${.35 * al})`; X.lineWidth = 8; X.beginPath(); pts.forEach((p, i) => i ? X.lineTo(...p) : X.moveTo(...p)); X.stroke();
    X.strokeStyle = `rgba(240,252,255,${al})`; X.lineWidth = 2.5; X.stroke();
  }
  function tentacle(path, L, at, d, t) {
    const pts = []; for (let s0 = 0; s0 <= d; s0 += 7) pts.push(at(s0)); pts.push(at(d));
    for (let i = 0; i < pts.length; i++) { const k = i / (pts.length - 1), w = lerp(23, 7, k); X.fillStyle = i % 2 ? '#7b3f8f' : '#8a4aa0'; X.beginPath(); X.arc(pts[i][0], pts[i][1], w, 0, TAU); X.fill(); }
    X.fillStyle = '#e6c6f0'; for (let i = 3; i < pts.length - 2; i += 3) { const k = i / (pts.length - 1); X.beginPath(); X.arc(pts[i][0] + 6, pts[i][1] + 6, lerp(6, 2.5, k), 0, TAU); X.fill(); }
    const [tx, ty] = pts[pts.length - 1]; X.strokeStyle = '#7b3f8f'; X.lineWidth = 7; X.lineCap = 'round'; X.beginPath(); X.moveTo(tx, ty); X.quadraticCurveTo(tx + 14 * Math.sin(t * 6), ty + 18, tx + 4, ty + 26); X.stroke();
  }
  function tesla(x, y, t, glow) {
    shadow(x + 3, y + 5, 22, 16, .3);
    X.fillStyle = '#272c48'; X.beginPath(); X.arc(x, y, 20, 0, TAU); X.fill();
    X.strokeStyle = '#c47a3a'; X.lineWidth = 3; for (const r of [15, 10]) { X.beginPath(); X.arc(x, y, r, 0, TAU); X.stroke(); }
    X.fillStyle = glow > 0 ? '#fff' : '#9fdcf3'; X.beginPath(); X.arc(x, y, 6, 0, TAU); X.fill();
    if (glow > 0) flash(x, y, 50, glow);
  }
  function spikes(x, y, r, n, rot, col = C.metal, dk = C.metalDk) {
    X.fillStyle = dk; for (let i = 0; i < n; i++) { const a = rot + i * TAU / n; X.beginPath(); X.moveTo(x + Math.cos(a - .25) * r * .85, y + Math.sin(a - .25) * r * .85); X.lineTo(x + Math.cos(a) * r * 1.5, y + Math.sin(a) * r * 1.5); X.lineTo(x + Math.cos(a + .25) * r * .85, y + Math.sin(a + .25) * r * .85); X.closePath(); X.fill(); }
    ball(x, y, r, null, col, dk);
  }
  function bull(x, y, ang, t) {
    X.save(); X.translate(x, y); X.rotate(ang);
    shadow(0, 4, 30, 17, .25);
    X.strokeStyle = '#2a1a10'; X.lineWidth = 5; X.lineCap = 'round';
    for (const [lx, ly] of [[12, -14], [12, 14], [-14, -14], [-14, 14]]) { const sw = Math.sin(t * 26 + lx) * 6; X.beginPath(); X.moveTo(lx, ly * .6); X.lineTo(lx + sw, ly); X.stroke(); }
    X.fillStyle = '#4a2e1e'; X.beginPath(); X.ellipse(-2, 0, 26, 15, 0, 0, TAU); X.fill();
    X.fillStyle = '#5c3a26'; X.beginPath(); X.ellipse(24, 0, 11, 10, 0, 0, TAU); X.fill();
    X.strokeStyle = '#f1e6d0'; X.lineWidth = 4; X.beginPath(); X.moveTo(24, -8); X.quadraticCurveTo(26, -20, 36, -18); X.moveTo(24, 8); X.quadraticCurveTo(26, 20, 36, 18); X.stroke();
    X.strokeStyle = '#2a1a10'; X.lineWidth = 3; X.beginPath(); X.moveTo(-28, 0); X.lineTo(-38, Math.sin(t * 18) * 6); X.stroke();
    X.restore();
  }
  function saw(x, y, r, rot) {
    X.save(); X.translate(x, y); X.rotate(rot);
    X.fillStyle = '#cfd4e2'; X.beginPath(); for (let i = 0; i < 24; i++) { const a = i * TAU / 24, rr = i % 2 ? r : r * .84; X.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } X.closePath(); X.fill();
    X.strokeStyle = C.metalDk; X.lineWidth = 2; X.stroke(); X.fillStyle = C.metalDk; X.beginPath(); X.arc(0, 0, r * .25, 0, TAU); X.fill();
    X.restore();
  }

  // ---------- schematic helpers (grid units 0..3) ----------
  const G = (u, v) => [GX + u * CELL, GY + v * CELL];
  const line = (a, b, n = 24) => Array.from({ length: n + 1 }, (_, i) => mix(a, b, i / n));
  const quad = (a, c, b, n = 40) => Array.from({ length: n + 1 }, (_, i) => { const k = i / n, m = 1 - k; return [m * m * a[0] + 2 * m * k * c[0] + k * k * b[0], m * m * a[1] + 2 * m * k * c[1] + k * k * b[1]]; });
  const arc = (cx, cy, r, a0, a1, n = 40) => Array.from({ length: n + 1 }, (_, i) => { const a = lerp(a0, a1, i / n); return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
  function head(x, y, ang, s = 1) {
    X.save(); X.translate(x, y); X.rotate(ang); X.fillStyle = C.red;
    X.beginPath(); X.moveTo(14 * s, 0); X.lineTo(-12 * s, -12 * s); X.lineTo(-6 * s, 0); X.lineTo(-12 * s, 12 * s); X.closePath(); X.fill(); X.restore();
  }
  // a red arrow along pts (grid units); the part up to progress p is solid, the rest faint
  function sArrow(pts, p = 1, opt = {}) {
    const P = pts.map(q => G(...q)), L = [0];
    for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const total = L[L.length - 1];
    X.lineCap = 'round'; X.lineJoin = 'round';
    X.strokeStyle = 'rgba(229,50,45,.2)'; X.lineWidth = 8; X.beginPath(); P.forEach((q, i) => i ? X.lineTo(...q) : X.moveTo(...q)); X.stroke();
    if (opt.both) { const a = P[0], b = P[1]; head(a[0], a[1], Math.atan2(a[1] - b[1], a[0] - b[0]), .8); }
    p = clamp(p); if (p <= 0) return;
    const want = total * p; let i = 1; while (i < P.length - 1 && L[i] < want) i++;
    const k = (want - L[i - 1]) / (L[i] - L[i - 1] || 1), tip = mix(P[i - 1], P[i], clamp(k));
    X.strokeStyle = C.red; X.lineWidth = 8; X.beginPath(); X.moveTo(...P[0]);
    for (let j = 1; j < i; j++) X.lineTo(...P[j]); X.lineTo(...tip); X.stroke();
    head(tip[0], tip[1], Math.atan2(P[i][1] - P[i - 1][1], P[i][0] - P[i - 1][0]), opt.s || 1);
  }
  function sPlayer(u = 1.5, v = 2.5, ang = -Math.PI / 2) {
    const [x, y] = G(u, v);
    X.save(); X.translate(x, y);
    X.fillStyle = C.player; X.strokeStyle = C.navy; X.lineWidth = 2.5; X.beginPath(); X.arc(0, 0, 20, 0, TAU); X.fill(); X.stroke();
    X.strokeStyle = '#fff'; X.lineWidth = 2; X.beginPath(); X.arc(0, 0, 16.5, 0, TAU); X.stroke();
    X.rotate(ang + Math.PI / 2); X.fillStyle = '#fff'; X.beginPath(); X.moveTo(0, -11); X.lineTo(10, 7); X.lineTo(-10, 7); X.closePath(); X.fill();
    X.fillStyle = '#9fdcf3'; X.beginPath(); X.moveTo(0, 1); X.lineTo(5.5, 7); X.lineTo(-5.5, 7); X.closePath(); X.fill();
    X.restore();
  }

  // ---------- the patterns ----------
  const P = [];

  // 1. Across: spears thrust out of the wall across the corridor as you walk past
  {
    const pk = [[0, [-40, 220]], [1.5, [330, 220]], [3.3, [330, 220]], [4.5, [880, 220], 'lin'], [6, [880, 220]]];
    const ext = t => kf(t, [[0, 0], [1.9, 0], [2.05, 1, 'lin'], [3.0, 1], [3.3, 0]]);
    P.push({ name: 'Across', label: 'Across', slide: 186, T: 6, file: 'p01-across',
      caption: 'Spears thrust out of a wall as you walk past',
      themes: [{ tag: 'Dungeon', env: 'dungeon' }, { tag: 'Factory', env: 'factory', caption: 'Flamethrower out of a wall that turns on and off with time' }, { tag: 'Jungle', env: 'jungle', caption: 'Vines reaching out from a wall to catch you' }],
      scene(t, v = 0) {
        floor();
        const e = ext(t), tele = t > 1.4 && t < 1.95 ? .5 + .5 * Math.sin((t - 1.4) * 30) : 0;
        if (tele) { X.fillStyle = `rgba(229,50,45,${.12 + .12 * tele})`; X.fillRect(392, 110, 116, 220); }
        // pressure plate
        const on = t > 1.2 && t < 3.4;
        if (v === 0) {
          X.fillStyle = on ? '#c9a24a' : '#b9ad92'; X.strokeStyle = C.woodDk; X.lineWidth = 2;
          X.beginPath(); X.roundRect(296, 192, 58, 56, 6); X.fill(); X.stroke();
          if (on) label('Trigger plate', 325, 290);
        }
        wall(0, 0, PW, 110); edge(0, 104, PW, 6); wall(0, 330, PW, 110); edge(0, 330, PW, 6);
        if (v === 1) {   // flamethrower nozzles on a timer
          label(e > 0 ? 'Timer: on' : 'Timer: off', 450, 60, 'center', e > 0 ? C.redDk : C.ink, 15);
          for (const x of [410, 450, 490]) {
            X.fillStyle = '#2b2e35'; X.fillRect(x - 12, 90, 24, 20); X.fillStyle = tele ? C.fire : '#6a6f7a'; X.fillRect(x - 7, 106, 14, 8);
            if (tele) flame(x, 120, .45, t, x);
            if (e > 0) { for (let d = 0; d < e * 205; d += 16) flame(x + Math.sin(t * 20 + d) * 3, 120 + d, .7 + d / 260, t, x + d); flash(x, 120 + e * 190, 40, .5); }
          }
        } else if (v === 2) {   // vines lash out of the hedge
          for (const x of [410, 450, 490]) {
            if (tele) { X.fillStyle = 'rgba(40,90,30,.9)'; X.beginPath(); X.arc(x, 104, 9, 0, TAU); X.fill(); }
            if (e > 0) vine(x, 100, x, 110 + e * 205, t, x);
          }
        }
        for (const x of v ? [] : [410, 450, 490]) {
          X.fillStyle = tele ? `rgba(229,50,45,${.5 + .5 * tele})` : C.wallDk; X.fillRect(x - 9, 96, 18, 14);
          if (e > 0) {
            const tip = 110 + e * 205;
            X.fillStyle = C.wood; X.fillRect(x - 3.5, 100, 7, tip - 100 - 18);
            X.fillStyle = C.metal; X.strokeStyle = C.metalDk; X.lineWidth = 1.5;
            X.beginPath(); X.moveTo(x, tip + 6); X.lineTo(x + 9, tip - 18); X.lineTo(x - 9, tip - 18); X.closePath(); X.fill(); X.stroke();
          }
        }
        if (e > .9 && t < 2.25) dust(450, 318, t - 2.05, 6, 40, 3);
        const [x, y] = kf(t, pk); player(x, y, heading(pk, t, 0)); bang(x, y, bangAt(t, 1.45, 2.3));
      },
      schem(t) { sArrow(line([.2, 1.5], [2.75, 1.5]), ext(t)); sPlayer(); },
    });
  }

  // 2. In path: a giant ball rolls down the corridor straight at you
  {
    const bx = t => kf(t, [[0, 960], [1.3, 960], [3.9, -130, 'lin']]);
    const pk = [[0, [-40, 220]], [1.1, [300, 220]], [1.55, [300, 220]], [1.9, [250, 98]], [3.55, [250, 98]], [3.95, [300, 220]], [5.4, [880, 220], 'lin'], [6.4, [880, 220]]];
    P.push({ name: 'In path', label: 'In Path', slide: 187, T: 6.4, file: 'p02-in-path',
      caption: 'Indiana Jones Ball rolling down a corridor',
      themes: [{ tag: 'Dungeon', env: 'dungeon' }, { tag: 'Jungle', env: 'jungle', caption: 'Animal charging when a player steps in front' }, { tag: 'Temple', env: 'desert', caption: 'Arrow shot towards you down a walkway' }],
      scene(t, v = 0) {
        floor();
        wall(0, 0, 205, 140); wall(295, 0, PW - 295, 140); wall(205, 0, 90, 58);
        edge(0, 134, 205, 6); edge(295, 134, PW - 295, 6); edge(205, 52, 90, 6);
        wall(0, 300, PW, 140); edge(0, 300, PW, 6);
        label('Alcove', 250, 24, 'center', C.ink, 15);
        const x = bx(t);
        if (v < 2 && x < 900 && x > -120) for (let i = 1; i <= 4; i++) puff(x + 70 + i * 22, 270 - (i % 2) * 90, 10 + i * 3, .35 - i * .07);
        if (t > 1.3 && t < 3.9) { const p = clamp((960 - x) / 640); X.globalAlpha = .9 * (1 - p); X.fillStyle = C.red; for (let i = 0; i < 3; i++) head(760 - i * 26, 220, Math.PI, .9); X.globalAlpha = 1; }
        if (v === 1) boar(x, 220, Math.PI, t, 2.1);
        else if (v === 2) { for (const [dx, y] of [[0, 220], [70, 180], [110, 262], [170, 214]]) arrow(x - 40 + dx, y); if (t < 1.3) { X.fillStyle = E.wallDk; X.fillRect(PW - 14, 150, 14, 140); } }
        else { shadow(x + 6, 226, 72, 66, .2);
        ball(x, 220, 72, -x / 72, '#b8ac98', '#5e5446'); }
        const [px, py] = kf(t, pk); player(px, py, heading(pk, t, 0)); bang(px, py, bangAt(t, 1.2, 1.9));
      },
      schem(t) { sArrow(line([1.5, .15], [1.5, 2.05]), clamp((960 - bx(t)) / 660)); sPlayer(); },
    });
  }

  // 3. Explosive: a barrel's blast radius grows, then it goes off
  {
    const B = [430, 200];
    const ring = t => kf(t, [[0, 0], [1.2, 0], [2.5, 175]]);
    const pk = [[0, [-40, 372]], [1.2, [300, 300]], [1.6, [300, 300]], [2.3, [110, 385]], [3.6, [110, 385]], [4.6, [-40, 385]], [6, [-40, 372]]];
    P.push({ name: 'Explosive', label: 'Expansive', slide: 188, T: 6, file: 'p03-explosive',
      caption: 'Explosive barrel',
      themes: [{ tag: 'Dungeon', env: 'dungeon' }, { tag: 'Fungal cave', env: 'cave', caption: 'Growing cloud of spores' }, { tag: 'Frozen lake', env: 'ice', caption: 'Freezing area growing from the center of a pool of water' }],
      scene(t, v = 0) {
        floor();
        if (v) {
          const r = ring(t);
          if (v === 1) {
            if (t < 2.6) { const q = rng(21); for (let i = 0; i < 26; i++) { const a = q() * TAU, d = r * Math.sqrt(q()) * .9; X.fillStyle = 'rgba(190,140,235,.32)'; X.beginPath(); X.arc(B[0] + Math.cos(a + t * .4) * d, B[1] + Math.sin(a + t * .4) * d, 16 + 14 * q(), 0, TAU); X.fill(); }
              danger(...B, r, t > 1.2 ? .6 + .4 * Math.sin(t * 14) : 0); if (r > 60) label('Spore cloud', B[0], B[1] + r + 18); }
            else if (t < 4.2) { const k = (t - 2.6) / 1.6, q = rng(22); for (let i = 0; i < 40; i++) { const a = q() * TAU, d = (60 + 200 * q()) * ease(clamp(k * 1.4)); X.fillStyle = `rgba(170,120,220,${.6 * (1 - k)})`; X.beginPath(); X.arc(B[0] + Math.cos(a) * d, B[1] + Math.sin(a) * d, 10 + 16 * k, 0, TAU); X.fill(); } }
            mushroom(...B, t, t >= 2.6 && t < 2.9 ? 1.25 - (t - 2.6) : t > 2.2 && t < 2.6 ? 1 + .1 * Math.sin(t * 50) : 1);
          } else {
            X.fillStyle = '#5aa6cf'; X.beginPath(); X.arc(...B, 185, 0, TAU); X.fill(); X.strokeStyle = '#9fcfe6'; X.lineWidth = 6; X.stroke();
            const ice = t < 2.6 ? r : t < 5.1 ? 185 : 185 * (1 - clamp((t - 5.1) / .8));
            if (ice > 0) { X.fillStyle = 'rgba(235,248,255,.92)'; X.beginPath(); X.arc(...B, ice, 0, TAU); X.fill();
              X.strokeStyle = '#a9d3ea'; X.lineWidth = 2; const q = rng(31); X.beginPath(); for (let i = 0; i < 12; i++) { const a = q() * TAU; X.moveTo(...B); X.lineTo(B[0] + Math.cos(a) * ice, B[1] + Math.sin(a) * ice); } X.stroke(); }
            if (t < 2.6) { danger(...B, r, t > 1.2 ? .6 + .4 * Math.sin(t * 14) : 0); if (r > 60) label('Freeze zone', B[0], B[1] + r + 18); }
            if (t >= 2.6 && t < 5.1) { const k = clamp((t - 2.6) / .25), q = rng(33); X.fillStyle = '#f4fbff'; X.strokeStyle = '#7fb6d6'; X.lineWidth = 2;
              for (let i = 0; i < 16; i++) { const a = q() * TAU, d = 40 + 130 * q(), hh = (20 + 26 * q()) * k; const cx = B[0] + Math.cos(a) * d, cy = B[1] + Math.sin(a) * d; X.beginPath(); X.moveTo(cx - 8, cy); X.lineTo(cx, cy - hh); X.lineTo(cx + 8, cy); X.closePath(); X.fill(); X.stroke(); }
              if (t < 3.0) flash(...B, 220, (3.0 - t) / .4 * .7); }
          }
          const [x, y] = kf(t, pk); player(x, y, heading(pk, t, -2.4)); bang(x, y, bangAt(t, 1.3, 2.0));
          return;
        }
        if (t > 2.6 && t < 5.7) { const a = .45 * clamp((5.7 - t) / 1.2); X.fillStyle = `rgba(40,30,25,${a})`; X.beginPath(); X.arc(...B, 70, 0, TAU); X.fill(); }
        if (t < 2.6) { const r = ring(t); danger(...B, r, t > 1.2 ? .6 + .4 * Math.sin(t * 14) : 0); if (r > 60) label('Blast radius', B[0], B[1] + r + 18); }
        const show = t < 2.6 ? 1 : clamp((t - 5.1) / .5);
        if (show > 0) {
          const s = t < 2.6 ? 1 + (t > 2.2 ? .08 * Math.sin(t * 60) : 0) : 1 + .4 * (1 - show);
          X.save(); X.globalAlpha = show; X.translate(...B); X.scale(s, s);
          shadow(4, 8, 36, 30, .3);
          X.fillStyle = C.red; X.beginPath(); X.arc(0, 0, 34, 0, TAU); X.fill();
          X.strokeStyle = '#7a1714'; X.lineWidth = 5; X.beginPath(); X.arc(0, 0, 26, 0, TAU); X.stroke(); X.beginPath(); X.arc(0, 0, 34, 0, TAU); X.stroke();
          X.fillStyle = C.gold; X.font = '800 22px Montserrat'; X.textAlign = 'center'; X.textBaseline = 'middle'; X.fillText('!', 0, 1);
          X.restore();
          if (t > 1.2 && t < 2.6) for (let i = 0; i < 5; i++) { const a = t * 9 + i * 1.3, d = 8 + 10 * frac(t * 3 + i * .2); X.fillStyle = i % 2 ? C.gold : '#fff'; X.beginPath(); X.arc(B[0] + 22 + Math.cos(a) * d, B[1] - 26 + Math.sin(a) * d, 3, 0, TAU); X.fill(); }
        }
        if (t >= 2.6 && t < 3.4) {
          const k = (t - 2.6) / .8, r = rng(11);
          flash(...B, 60 + 200 * ease(clamp(k * 1.5)), 1 - k);
          X.strokeStyle = `rgba(255,185,81,${1 - k})`; X.lineWidth = 10 * (1 - k) + 2; X.beginPath(); X.arc(...B, 60 + 190 * ease(k), 0, TAU); X.stroke();
          X.strokeStyle = `rgba(60,60,80,${1 - k})`; X.lineWidth = 4;
          for (let i = 0; i < 14; i++) { const a = r() * TAU, d0 = 40 + 220 * k * (.7 + .3 * r()); X.beginPath(); X.moveTo(B[0] + Math.cos(a) * d0, B[1] + Math.sin(a) * d0); X.lineTo(B[0] + Math.cos(a) * (d0 + 18), B[1] + Math.sin(a) * (d0 + 18)); X.stroke(); }
        }
        if (t > 2.9 && t < 4.6) { const k = (t - 2.9) / 1.7; for (let i = 0; i < 6; i++) puff(B[0] + Math.cos(i) * 40 * k, B[1] - 30 * k + Math.sin(i * 2) * 30, 18 + 20 * k, .35 * (1 - k)); }
        const [x, y] = kf(t, pk); player(x, y, heading(pk, t, -2.4)); bang(x, y, bangAt(t, 1.3, 2.0));
      },
      schem(t) {
        const s = t < 2.6 ? .35 + .4 * ring(t) / 175 : t < 3.2 ? 1.15 : t < 5.1 ? 0 : .35 * clamp((t - 5.1) / .5);
        const [cx, cy] = G(1.5, 1.5);
        const star = k => { X.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 4, r = (i % 2 ? 26 : 125) * k; X.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } X.closePath(); };
        X.fillStyle = 'rgba(229,50,45,.18)'; star(1); X.fill();
        if (s > 0) { X.fillStyle = C.red; star(s); X.fill(); }
        X.strokeStyle = '#fff'; X.lineWidth = 4; X.beginPath(); X.arc(cx, cy, 15, 0, TAU); X.stroke();
        X.beginPath(); X.moveTo(cx - 10, cy - 10); X.lineTo(cx + 10, cy + 10); X.moveTo(cx + 10, cy - 10); X.lineTo(cx - 10, cy + 10); X.stroke();
        sPlayer();
      },
    });
  }

  // 4. Collapsing: quicksand pulls everything toward its centre
  {
    const O = [405, 215], R = 200, T = 6;
    const pk = [[0, [-40, 80]], [1.0, [150, 120]], [2.6, [295, 185], 'lin'], [3.3, [300, 170]], [4.4, [560, -40]], [6, [560, -40]]];
    P.push({ name: 'Collapsing', label: 'Collapsing', slide: 189, T, file: 'p04-collapsing',
      caption: 'Sand flowing in from the sides of a room (quicksand)',
      themes: [{ tag: 'Tomb', env: 'dungeon' }, { tag: 'Ocean', env: 'water', caption: 'Whirlpool' }, { tag: 'Monster lair', env: 'cave', caption: 'Monster breathing in' }],
      scene(t, v = 0) {
        floor();
        const g = X.createRadialGradient(...O, 10, ...O, R);
        const pal = [['#6b5230', C.sandDk, C.sand, 'rgba(120,90,40,', 'rgba(110,80,35,'], ['#0c3552', '#1f6c99', '#3d8fbe', 'rgba(230,248,255,', 'rgba(240,250,255,'], ['#000', '#2a1f33', 'rgba(94,84,104,0)', 'rgba(200,190,220,', 'rgba(220,210,235,']][v];
        g.addColorStop(0, pal[0]); g.addColorStop(.18, pal[1]); g.addColorStop(1, pal[2]);
        X.fillStyle = g; X.beginPath(); X.arc(...O, R, 0, TAU); X.fill();
        if (v === 0) { X.strokeStyle = C.sandDk; X.lineWidth = 3; X.stroke(); }
        for (let i = 0; i < 5; i++) { const r = R * (1 - frac(t / T * 3 + i / 5)); X.strokeStyle = `${pal[3]}${.35 * r / R})`; X.lineWidth = 2; X.beginPath(); X.arc(...O, r, 0, TAU); X.stroke(); }
        const q = rng(5);
        for (let i = 0; i < 150; i++) {
          const a0 = q() * TAU, ph = q(), k = frac(t / T * 2 + ph), r = R * (1 - k) + 4, a = a0 + k * 2.4;
          X.fillStyle = X.strokeStyle = `${pal[4]}${.7 * (1 - k * .6)})`;
          if (v === 2) { const r2 = r + 16; X.lineWidth = 2; X.beginPath(); X.moveTo(O[0] + Math.cos(a) * r, O[1] + Math.sin(a) * r); X.lineTo(O[0] + Math.cos(a - .08) * r2, O[1] + Math.sin(a - .08) * r2); X.stroke(); }
          else { X.beginPath(); X.arc(O[0] + Math.cos(a) * r, O[1] + Math.sin(a) * r, 2.6, 0, TAU); X.fill(); }
        }
        if (v === 2) maw(...O, t);
        // a crate spirals in and sinks
        { const k = t / T, r = 190 * (1 - k), a = .6 + k * 3, s = clamp(r / 70), al = clamp(t / .4) * s;
          if (al > 0) { X.save(); X.globalAlpha = al; X.translate(O[0] + Math.cos(a) * r, O[1] + Math.sin(a) * r); X.rotate(a * 1.5); X.scale(s, s);
            if (v === 1) { X.fillStyle = C.wood; X.strokeStyle = C.woodDk; X.lineWidth = 3; X.beginPath(); X.roundRect(-34, -12, 68, 24, 12); X.fill(); X.stroke(); X.fillStyle = C.woodHi; X.beginPath(); X.ellipse(30, 0, 5, 11, 0, 0, TAU); X.fill(); }
            else if (v === 2) ball(0, 0, 20, 0, '#8a8094', '#3a3242');
            else { X.fillStyle = C.wood; X.strokeStyle = C.woodDk; X.lineWidth = 3; X.fillRect(-20, -20, 40, 40); X.strokeRect(-20, -20, 40, 40);
            X.beginPath(); X.moveTo(-20, -20); X.lineTo(20, 20); X.moveTo(20, -20); X.lineTo(-20, 20); X.stroke(); }
            X.restore(); } }
        for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + .4 + t * .5; X.globalAlpha = .55; X.save(); X.translate(O[0] + Math.cos(a) * (R + 26), O[1] + Math.sin(a) * (R + 26)); head(0, 0, a + Math.PI, .8); X.restore(); X.globalAlpha = 1; }
        let [x, y] = kf(t, pk); const pulled = t > 1.0 && t < 3.3;
        if (pulled) { x += Math.sin(t * 40) * 2.5; y += Math.cos(t * 33) * 2; for (let i = 0; i < 3; i++) puff(x - 20 + i * 18, y + 18, 6, .35); }
        player(x, y, pulled ? -2.5 : heading(pk, t, -.7), pulled ? .92 : 1); bang(x, y, bangAt(t, 1.4, 2.6));
      },
      schem(t) {
        const p = frac(t / 2);
        for (const [a, b] of [[[.2, .2], [1.32, 1.32]], [[2.8, .2], [1.68, 1.32]], [[.2, 2.8], [1.32, 1.68]], [[2.8, 2.8], [1.68, 1.68]]]) sArrow(line(a, b), p, { s: .8 });
        sPlayer();
      },
    });
  }

  // 5. Eruption: a volcano flings flaming boulders that land on telegraphed spots
  {
    const V = [405, 165], FL = 1.2;
    const rocks = [[1.7, [150, 105]], [2.6, [660, 120]], [3.5, [305, 335]], [4.4, [585, 320]]];
    const pk = [[0, [-40, 402]], [1.2, [150, 402]], [2.0, [205, 402]], [3.7, [205, 402]], [5.3, [880, 402], 'lin'], [6, [880, 402]]];
    function eruptAlt(t, v) {   // cauldron of acid (1) or insect hive (2): same throws, different stuff
      if (v === 1) {
        shadow(V[0] + 4, V[1] + 8, 78, 70, .3);
        X.fillStyle = '#26262e'; X.beginPath(); X.arc(...V, 74, 0, TAU); X.fill(); X.strokeStyle = '#4a4a56'; X.lineWidth = 8; X.stroke();
        X.fillStyle = '#7ad24a'; X.beginPath(); X.arc(...V, 58, 0, TAU); X.fill();
        for (let i = 0; i < 7; i++) { const k = frac(t * .9 + i / 7), a = i * 2.3; X.strokeStyle = `rgba(220,255,180,${1 - k})`; X.lineWidth = 2.5; X.beginPath(); X.arc(V[0] + Math.cos(a) * 30, V[1] + Math.sin(a) * 26, 4 + 10 * k, 0, TAU); X.stroke(); }
        for (let i = 0; i < 3; i++) flame(V[0] - 40 + i * 40, V[1] + 82, .9, t, i);
      } else {
        X.fillStyle = '#6a3d86'; X.beginPath(); X.arc(...V, 90, 0, TAU); X.fill();
        X.fillStyle = '#87519f'; X.beginPath(); X.arc(...V, 66, 0, TAU); X.fill();
        for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + .3, pul = 1 + .15 * Math.sin(t * 5 + i); X.fillStyle = '#2b1838'; X.beginPath(); X.ellipse(V[0] + Math.cos(a) * 42, V[1] + Math.sin(a) * 42, 11 * pul, 8 * pul, a, 0, TAU); X.fill(); }
        X.fillStyle = '#c56cff'; X.beginPath(); X.arc(...V, 16 + 3 * Math.sin(t * 6), 0, TAU); X.fill();
      }
      for (const [tl, p] of rocks) {
        const k = (t - (tl - FL)) / FL, age = t - tl;
        if (k > 0 && k < 1) {
          danger(...p, 36 * ease(k), .9);
          const gx = lerp(V[0], p[0], k), gy = lerp(V[1], p[1], k), z = Math.sin(Math.PI * k) * 110;
          shadow(gx, gy, 14, 10, .18 + .2 * k);
          if (v === 1) { X.fillStyle = '#7ad24a'; X.strokeStyle = '#3e8a22'; X.lineWidth = 2; X.beginPath(); X.ellipse(gx, gy - z, 14, 17, k * 4, 0, TAU); X.fill(); X.stroke(); }
          else bug(gx, gy - z, k * 12, t, 1);
        }
        if (age >= 0 && age < 1.5) {
          const a = clamp((1.5 - age) / .5);
          if (v === 1) { X.fillStyle = `rgba(122,210,74,${.75 * a})`; X.beginPath(); X.ellipse(...p, 36, 26, 0, 0, TAU); X.fill();
            for (let i = 0; i < 4; i++) { const kk = frac(age * 1.5 + i / 4); X.strokeStyle = `rgba(220,255,180,${a * (1 - kk)})`; X.lineWidth = 2; X.beginPath(); X.arc(p[0] - 14 + i * 9, p[1] - 4 + (i % 2) * 8, 3 + 6 * kk, 0, TAU); X.stroke(); }
            if (age < .3) { X.fillStyle = `rgba(122,210,74,${1 - age / .3})`; for (let i = 0; i < 8; i++) { const aa = i * TAU / 8, d = 20 + 90 * age; X.beginPath(); X.arc(p[0] + Math.cos(aa) * d, p[1] + Math.sin(aa) * d * .7, 5, 0, TAU); X.fill(); } } }
          else { dust(...p, age, 6, 40, tl * 10); X.globalAlpha = a; bug(p[0] + age * 30 * Math.cos(tl), p[1] + age * 20 * Math.sin(tl * 3), tl * 2 + Math.sin(age * 9) * .4, t, 1); X.globalAlpha = 1; }
        }
      }
    }
    P.push({ name: 'Eruption', label: 'Eruption', slide: 190, T: 6, file: 'p05-eruption',
      caption: 'Volcano exploding with flaming boulders',
      themes: [{ tag: 'Volcanic', env: 'dungeon' }, { tag: 'Witch hut', env: 'wood', caption: 'Boiling cauldron of acid with splashes' }, { tag: 'Alien hive', env: 'alien', caption: 'Monster spawner which flings out additional insects' }],
      scene(t, v = 0) {
        floor();
        if (v) { eruptAlt(t, v); const [x, y] = kf(t, pk); player(x, y, heading(pk, t, 0)); bang(x, y, bangAt(t, 2.35, 3.2)); return; }
        // volcano
        X.fillStyle = '#8a6a4a'; X.beginPath(); X.arc(...V, 92, 0, TAU); X.fill();
        X.fillStyle = '#6e5238'; X.beginPath(); X.arc(...V, 66, 0, TAU); X.fill();
        X.fillStyle = '#4a3624'; X.beginPath(); X.arc(...V, 42, 0, TAU); X.fill();
        const pulse = .5 + .5 * Math.sin(t * 6);
        X.fillStyle = C.fire; X.beginPath(); X.arc(...V, 28 + 3 * pulse, 0, TAU); X.fill();
        X.fillStyle = C.gold; X.beginPath(); X.arc(...V, 15 + 3 * pulse, 0, TAU); X.fill();
        for (let i = 0; i < 4; i++) puff(V[0] - 10 + i * 9, V[1] - 40 - 40 * frac(t / 2 + i / 4), 12 + 14 * frac(t / 2 + i / 4), .3 * (1 - frac(t / 2 + i / 4)));
        for (const [tl, p, ] of rocks) {
          const k = (t - (tl - FL)) / FL, age = t - tl;
          if (k > 0 && k < 1) {
            danger(...p, 36 * ease(k), .9);
            const gx = lerp(V[0], p[0], k), gy = lerp(V[1], p[1], k), z = Math.sin(Math.PI * k) * 110;
            shadow(gx, gy, 16, 11, .18 + .2 * k);
            ball(gx, gy - z, 17 + 6 * Math.sin(Math.PI * k), k * 9, '#c9733a', '#5a2a12');
            flame(gx + 4, gy - z - 16, .7, t, tl);
          }
          if (age >= 0 && age < 1.5) {
            const a = clamp((1.5 - age) / .5);
            X.fillStyle = `rgba(50,35,25,${.5 * a})`; X.beginPath(); X.arc(...p, 30, 0, TAU); X.fill();
            if (age < .3) flash(...p, 40 + 120 * age, 1 - age / .3);
            for (let i = 0; i < 4; i++) flame(p[0] - 18 + i * 12, p[1] - 4 + (i % 2) * 8, .9 * a, t, i + tl);
            ball(...p, 15, null, '#9a5a30', '#3a1a0a');
          }
        }
        const [x, y] = kf(t, pk); player(x, y, heading(pk, t, 0)); bang(x, y, bangAt(t, 2.35, 3.2));
      },
      schem(t) {
        const arcs = [quad([1.45, 1.4], [1.0, -.2], [.3, .75]), quad([1.55, 1.4], [2.0, -.2], [2.7, .75]), quad([1.45, 1.55], [.6, 1.3], [.45, 2.65]), quad([1.55, 1.55], [2.4, 1.3], [2.55, 2.65])];
        rocks.forEach(([tl], i) => { const k = (t - (tl - FL)) / FL; sArrow(arcs[i], k > 0 && t < tl + 1.2 ? k : 0, { s: .8 }); });
        sPlayer();
      },
    });
  }

  // 6. Winding: fire races along a winding trench of oil
  {
    const path = [].concat(line([90, 50], [90, 320], 20), arc(155, 320, 65, Math.PI, 0, 24), line([220, 320], [220, 120], 16), arc(285, 120, 65, Math.PI, TAU, 24),
      line([350, 120], [350, 320], 16), arc(415, 320, 65, Math.PI, 0, 24), line([480, 320], [480, 120], 16), arc(545, 120, 65, Math.PI, TAU, 24), line([610, 120], [610, 345], 18));
    const L = [0]; for (let i = 1; i < path.length; i++) L.push(L[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
    const at = d => { let i = 1; while (i < path.length - 1 && L[i] < d) i++; return mix(path[i - 1], path[i], clamp((d - L[i - 1]) / (L[i] - L[i - 1] || 1))); };
    const front = t => kf(t, [[0, 0], [.9, 0], [3.9, 1, 'lin']]);
    const pk = [[0, [880, 335]], [1.4, [610, 335]], [2.75, [610, 335]], [3.1, [700, 245]], [5.6, [700, 245]], [6.4, [880, 245]], [6.4, [880, 335]]];
    P.push({ name: 'Winding', label: 'Winding / Trench', slide: 191, T: 6.4, file: 'p06-winding',
      caption: 'Trench full of oil that gets caught on fire',
      themes: [{ tag: 'Dungeon', env: 'dungeon' }, { tag: 'Sci-fi', env: 'scifi', caption: 'Lightning spreading through a copper wire' }, { tag: 'Ruins', env: 'cave', caption: 'Monster tentacle slithering through a maze' }],
      scene(t, v = 0) {
        floor();
        const stroke = (col, w) => { X.strokeStyle = col; X.lineWidth = w; X.lineCap = 'round'; X.lineJoin = 'round'; X.beginPath(); path.forEach((q, i) => i ? X.lineTo(...q) : X.moveTo(...q)); X.stroke(); };
        if (v) {
          const f = front(t), burnOut = clamp((t - 4.9) / .8), total = L[L.length - 1];
          if (v === 1) {
            stroke('#141830', 34); stroke('#b8702f', 10); X.globalAlpha = .5; stroke('#f0a865', 3); X.globalAlpha = 1;
            if (t > .3 && t < .9) flash(...path[0], 50, .8 * (1 - (t - .3) / .6));
            const d = f * total;
            if (f > 0 && burnOut < 1) {
              X.strokeStyle = `rgba(120,220,255,${.9 * (1 - burnOut)})`; X.lineWidth = 6; X.beginPath(); X.moveTo(...path[0]); for (let i = 1; i < path.length && L[i] <= d; i++) X.lineTo(...path[i]); X.lineTo(...at(d)); X.stroke();
              const q = rng(Math.floor(t * 20));
              for (let s0 = 0; s0 < d; s0 += 40) zap(at(s0), at(Math.min(d, s0 + 40)), q, 1 - burnOut);
              if (f < 1) { flash(...at(d), 46, .9); X.fillStyle = '#fff'; X.beginPath(); X.arc(...at(d), 7, 0, TAU); X.fill(); }
            }
            label('Copper wire', 155, 395);
          } else {
            stroke('#3a3244', 64); stroke('#241e2c', 52);
            const d = f * total * (1 - burnOut);
            if (d > 2) tentacle(path, L, at, d, t);
            if (t < .9) label('Maze channel', 155, 395);
          }
          const [x, y] = kf(t, pk); player(x, y, heading(pk, t, Math.PI)); bang(x, y, bangAt(t, 2.0, 2.9));
          return;
        }
        stroke('#8f826a', 56); stroke('#2a2420', 44);
        X.globalAlpha = .25; stroke('#8a8ab0', 6); X.globalAlpha = 1;
        const f = front(t), burnOut = clamp((t - 4.9) / .8), total = L[L.length - 1];
        if (f > 0) {
          const d = f * total;
          X.strokeStyle = `rgba(60,30,20,${.6 * (1 - burnOut)})`; X.lineWidth = 44; X.beginPath(); X.moveTo(...path[0]);
          for (let i = 1; i < path.length && L[i] <= d; i++) X.lineTo(...path[i]); X.lineTo(...at(d)); X.stroke();
          if (burnOut < 1) for (let s = 0; s < d; s += 15) { const q = at(s), near = clamp(1 - (d - s) / 120); flame(q[0], q[1], (.75 + .7 * near) * (1 - burnOut), t, s); }
          if (f < 1) flash(...at(d), 50, .7);
        }
        // torch drops in at the start
        if (t > .3 && t < 1.0) { const k = clamp((t - .3) / .6), y = lerp(-30, 50, ease(k)); X.save(); X.translate(90, y); X.rotate(k * 3); X.fillStyle = C.wood; X.fillRect(-4, -18, 8, 30); X.restore(); flame(90, y - 20, .8, t); }
        if (t < .9) label('Oil trench', 155, 395);
        const [x, y] = kf(t, pk); player(x, y, heading(pk, t, Math.PI)); bang(x, y, bangAt(t, 2.0, 2.9));
      },
      schem(t) {
        const pts = [].concat(line([.35, .45], [.35, 2.3], 10), arc(.75, 2.3, .4, Math.PI, 0, 16), line([1.15, 2.3], [1.15, .75], 10), arc(1.7, .75, .55, Math.PI, TAU, 16), line([2.25, .75], [2.25, 1.85], 8));
        sArrow(pts, t < 4.9 ? front(t) : 0); sPlayer(2.5, 2.5);
      },
    });
  }

  // 7. Jumping: a slime ball hops around the room, each landing telegraphed
  {
    const S = [[150, 300], [190, 110], [420, 80], [650, 120], [680, 320], [440, 335]], D = .9, T = S.length * D;
    const pk = [[0, [300, 385]], [.7, [420, 380]], [3.75, [420, 380]], [4.2, [300, 385]], [T, [300, 385]]];
    const slime = t => { const k = Math.floor(t / D) % S.length, u = frac(t / D); return { a: S[k], b: S[(k + 1) % S.length], u, k }; };
    P.push({ name: 'Jumping', label: 'Jump', slide: 192, T, file: 'p07-jumping',
      caption: 'Slime ball bouncing across a room',
      themes: [{ tag: 'Dungeon', env: 'dungeon' }, { tag: 'Mountain', env: 'mountain', caption: 'Rocks bouncing down a mountainside' }, { tag: 'Sci-fi', env: 'scifi', caption: 'Electrical arcs jumping from pole to pole' }],
      scene(t, v = 0) {
        floor();
        const { a, b, u } = slime(t), gx = lerp(a[0], b[0], u), gy = lerp(a[1], b[1], u), z = Math.min(Math.sin(Math.PI * u) * 105, gy - 34);
        if (v) {
          if (v === 2) S.forEach((p, i) => { const age = frac((t - (i ? i * D : T)) / T) * T; tesla(...p, t, age < .35 ? 1 - age / .35 : 0); });
          else S.forEach((p, i) => { const age = frac((t - (i ? i * D : T)) / T) * T; if (age < 1.8) { X.strokeStyle = `rgba(70,60,50,${.5 * (1 - age / 1.8)})`; X.lineWidth = 2; X.beginPath(); for (let k = 0; k < 5; k++) { X.moveTo(...p); X.lineTo(p[0] + Math.cos(k * 1.3) * 22, p[1] + Math.sin(k * 1.3) * 14); } X.stroke(); } });
          danger(...b, 40 * ease(u), .8);
          if (v === 1) { shadow(gx, gy + 6, 26 - z * .08, 16 - z * .05, .28 - z / 900); ball(gx, gy - z, 26, t * 7, '#a39a8e', '#4e463e'); if (u < .2) dust(a[0], a[1], u * D, 7, 46, 9); }
          else { const q = rng(Math.floor(t * 24)); zap(a, [gx, gy - z], q, .5); X.fillStyle = 'rgba(120,220,255,.35)'; X.beginPath(); X.arc(gx, gy - z, 30, 0, TAU); X.fill(); X.fillStyle = '#e8fbff'; X.beginPath(); X.arc(gx, gy - z, 13, 0, TAU); X.fill(); zap([gx - 20, gy - z], [gx + 20, gy - z], q, .9); }
          const [x, y] = kf(t, pk); player(x, y, heading(pk, t, -1.9)); bang(x, y, bangAt(t, 3.6, 4.25));
          return;
        }
        S.forEach((p, i) => { const age = frac((t - (i ? i * D : T)) / T) * T; if (age < 1.8) { X.fillStyle = `rgba(95,191,74,${.4 * (1 - age / 1.8)})`; X.beginPath(); X.ellipse(...p, 36, 24, 0, 0, TAU); X.fill(); } });
        danger(...b, 40 * ease(u), .8);
        shadow(gx, gy + 6, 30 - z * .08, 18 - z * .05, .28 - z / 900);
        const sq = u < .12 ? .7 + u * 2.5 : u > .9 ? 1 - (u - .9) * 3 : 1 + .12 * Math.sin(Math.PI * u);
        X.save(); X.translate(gx, gy - z); X.scale(1 / Math.sqrt(sq), sq);
        X.fillStyle = C.slime; X.strokeStyle = C.slimeDk; X.lineWidth = 3; X.beginPath(); X.arc(0, 0, 30, 0, TAU); X.fill(); X.stroke();
        X.fillStyle = 'rgba(255,255,255,.45)'; X.beginPath(); X.ellipse(-10, -12, 9, 6, -.5, 0, TAU); X.fill();
        X.fillStyle = '#fff'; X.beginPath(); X.arc(-9, -2, 6, 0, TAU); X.arc(9, -2, 6, 0, TAU); X.fill();
        X.fillStyle = C.navy; X.beginPath(); X.arc(-8, 0, 3, 0, TAU); X.arc(10, 0, 3, 0, TAU); X.fill();
        X.restore();
        if (u < .2) dust(a[0], a[1], u * D, 6, 40, 9);
        const [x, y] = kf(t, pk); player(x, y, heading(pk, t, -1.9)); bang(x, y, bangAt(t, 3.6, 4.25));
      },
      schem(t) {
        const pts = [[2.2, 2.75], [2.85, 1.3], [2.1, .25], [.9, .2], [.15, 1.0], [.7, 2.45]];
        const segs = []; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], m = mix(a, b, .5), dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy); segs.push(...quad(a, [m[0] + dy / n * .55, m[1] - dx / n * .55], b, 20)); }
        sArrow(segs, t / T); sPlayer();
      },
    });
  }

  // 8. Ricochet: a metal ball zig-zags between the hallway walls
  {
    const per = 170, tri = u => 1 - 2 * Math.abs((((u % 2) + 2) % 2) - 1);
    const bxk = t => kf(t, [[0, 880], [.3, 880], [3.9, -60, 'lin']]);
    const by = x => 220 + 76 * tri((x - 150) / per + 1);
    const pk = [[0, [-40, 220]], [1.0, [150, 220]], [1.6, [150, 166]], [3.25, [150, 166]], [3.5, [150, 220]], [4.8, [880, 220], 'lin'], [6, [880, 220]]];
    P.push({ name: 'Ricochet', label: 'Ricochet', slide: 193, T: 6, file: 'p08-ricochet',
      caption: 'Metal balls bouncing between the walls of a hallway',
      themes: [{ tag: 'Dungeon', env: 'dungeon' }, { tag: 'Sci-fi', env: 'scifi', caption: 'Electrified orbs repelled off of magnets' }, { tag: 'Arena', env: 'arena', caption: 'Bull charging at walls' }],
      scene(t, v = 0) {
        floor();
        wall(0, 0, PW, 120); edge(0, 114, PW, 6); wall(0, 320, PW, 120); edge(0, 320, PW, 6);
        const x = bxk(t), speed = 940 / 3.6;
        if (v) {
          for (let n = -1; n < 6; n++) {
            const xb = 150 + per * (n - 1), top = tri((xb - 150) / per + 1) < 0, yb = top ? 120 : 320, tb = .3 + (880 - xb) / speed, age = t - tb;
            if (v === 1) { X.fillStyle = '#c0392b'; X.fillRect(xb - 24, top ? 104 : 320, 24, 16); X.fillStyle = '#2f6fd6'; X.fillRect(xb, top ? 104 : 320, 24, 16); if (age > 0 && age < .35) { const q = rng(n + 9); zap([xb - 30, yb], [xb + 30, yb], q, 1 - age / .35); } }
            else if (age > 0 && age < .9) dust(xb, yb + (top ? 16 : -16), age, 7, 50, n + 4);
          }
          if (t > .3 && t < 3.9) { X.setLineDash([6, 8]); X.strokeStyle = 'rgba(229,50,45,.4)'; X.lineWidth = 3; X.beginPath(); for (let xx = Math.min(x, 820); xx > -40; xx -= 8) X.lineTo(xx, by(xx)); X.stroke(); X.setLineDash([]);
            if (v === 1) { const q = rng(Math.floor(t * 24)); for (let i = 6; i > 0; i--) { const xx = x + i * 14; X.fillStyle = `rgba(120,220,255,${.3 - i * .04})`; X.beginPath(); X.arc(xx, by(xx), 18 - i, 0, TAU); X.fill(); }
              X.fillStyle = 'rgba(120,220,255,.35)'; X.beginPath(); X.arc(x, by(x), 30, 0, TAU); X.fill(); ball(x, by(x), 17, null, '#bff3ff', '#2b7fa8'); zap([x - 24, by(x) - 8], [x + 24, by(x) + 8], q, .9); }
            else bull(x, by(x), Math.atan2(by(x - 2) - by(x), -2), t); }
          const [px, py] = kf(t, pk); player(px, py, heading(pk, t, 0)); bang(px, py, bangAt(t, 1.0, 1.7));
          return;
        }
        // predicted path, faint
        if (t > .3 && t < 3.9) { X.setLineDash([6, 8]); X.strokeStyle = 'rgba(229,50,45,.4)'; X.lineWidth = 3; X.beginPath(); for (let xx = Math.min(x, 820); xx > -40; xx -= 8) X.lineTo(xx, by(xx)); X.stroke(); X.setLineDash([]); }
        for (let n = -1; n < 6; n++) {
          const xb = 150 + per * (n - 1), tb = .3 + (880 - xb) / speed, age = t - tb;
          if (age > 0 && age < .3) { const yb = tri((xb - 150) / per + 1) > 0 ? 320 : 120; flash(xb, yb, 30 + 60 * age, 1 - age / .3); }
        }
        if (t > .3 && t < 3.9) {
          for (let i = 6; i > 0; i--) { const xx = x + i * 14; X.fillStyle = `rgba(98,104,138,${.25 - i * .035})`; X.beginPath(); X.arc(xx, by(xx), 20 - i, 0, TAU); X.fill(); }
          shadow(x + 3, by(x) + 5, 20, 15, .22); ball(x, by(x), 20, null);
        }
        const [px, py] = kf(t, pk); player(px, py, heading(pk, t, 0)); bang(px, py, bangAt(t, 1.0, 1.7));
      },
      schem(t) { sArrow([].concat(line([.15, .55], [2.8, 1.45], 20), line([2.8, 1.45], [.2, 2.55], 20)), clamp((880 - bxk(t)) / 940)); sPlayer(2.45, 2.45); },
    });
  }

  // 9. Rotation: blades spin around a hub; cross in the gap
  {
    const O = [405, 165], Lb = 200, th = t => Math.PI * t / 2;
    const pk = [[0, [-40, 345]], [1.5, [235, 345]], [3.5, [250, 345]], [4.4, [560, 345], 'lin'], [5.0, [880, 345], 'lin'], [6, [880, 345]]];
    P.push({ name: 'Rotation', label: 'Rotation', slide: 194, T: 6, file: 'p09-rotation',
      caption: 'Blades spinning repeatedly over time',
      themes: [{ tag: 'Dungeon', env: 'dungeon' }, { tag: 'Courtyard', env: 'desert', caption: 'Spinning fountain of poison gas' }, { tag: 'Farm', env: 'farm', caption: 'Windmill blade' }],
      scene(t, v = 0) {
        floor();
        X.setLineDash([10, 9]); X.strokeStyle = 'rgba(229,50,45,.45)'; X.lineWidth = 3; X.beginPath(); X.arc(...O, Lb + 8, 0, TAU); X.stroke(); X.setLineDash([]);
        const a = th(t);
        if (v === 1) {
          X.fillStyle = '#8f8a7e'; X.beginPath(); X.arc(...O, 44, 0, TAU); X.fill(); X.fillStyle = '#5fae4a'; X.beginPath(); X.arc(...O, 32, 0, TAU); X.fill();
          for (const off of [0, Math.PI]) for (let d = 30; d <= Lb; d += 12) { const k = d / Lb, aa = a + off - k * .25, wob = Math.sin(t * 9 + d) * 3; X.fillStyle = `rgba(110,190,70,${.55 - k * .25})`; X.beginPath(); X.arc(O[0] + Math.cos(aa) * d + wob, O[1] + Math.sin(aa) * d + wob, 10 + k * 14, 0, TAU); X.fill(); }
        } else if (v === 2) {
          for (const off of [0, Math.PI]) {
            X.save(); X.translate(...O); X.rotate(a + off);
            X.fillStyle = 'rgba(40,30,20,.18)'; X.fillRect(30, -10, Lb - 26, 36);
            X.fillStyle = '#f3ead6'; X.strokeStyle = '#7a5a3a'; X.lineWidth = 3; X.fillRect(34, -2, Lb - 34, 26); X.strokeRect(34, -2, Lb - 34, 26);
            X.beginPath(); for (let xx = 34; xx < Lb; xx += 28) { X.moveTo(xx, -2); X.lineTo(xx, 24); } X.moveTo(34, 11); X.lineTo(Lb, 11); X.stroke();
            X.fillStyle = '#6b4a2a'; X.fillRect(20, -5, Lb - 16, 6);
            X.restore();
          }
          X.fillStyle = '#8a3b2b'; X.beginPath(); X.arc(...O, 34, 0, TAU); X.fill(); X.fillStyle = '#6b2b1f'; X.beginPath(); X.arc(...O, 14, 0, TAU); X.fill();
        }
        for (const off of v ? [] : [0, Math.PI]) {
          X.save(); X.translate(...O); X.rotate(a + off);
          X.fillStyle = 'rgba(229,50,45,.14)'; X.beginPath(); X.moveTo(0, 0); X.arc(0, 0, Lb, -.5, 0); X.closePath(); X.fill();
          X.fillStyle = C.metal; X.strokeStyle = C.metalDk; X.lineWidth = 2;
          X.beginPath(); X.moveTo(20, -7); X.lineTo(Lb - 14, -12); X.lineTo(Lb, 0); X.lineTo(Lb - 14, 7); X.lineTo(20, 7); X.closePath(); X.fill(); X.stroke();
          X.strokeStyle = C.red; X.lineWidth = 3; X.beginPath(); X.moveTo(26, -8); X.lineTo(Lb - 14, -12); X.stroke();
          X.restore();
        }
        if (!v) { X.fillStyle = C.metalDk; X.beginPath(); X.arc(...O, 26, 0, TAU); X.fill(); X.fillStyle = C.metal; X.beginPath(); X.arc(...O, 14, 0, TAU); X.fill(); }
        const [x, y] = kf(t, pk); player(x, y, heading(pk, t, 0)); bang(x, y, bangAt(t, 1.5, 2.2));
        if (t > 2.5 && t < 3.5) label('Wait for the gap', 240, 400);
      },
      schem(t) {
        const p = frac(t / 2);
        sArrow(arc(1.5, 1.5, .95, Math.PI * .85, Math.PI * 1.45), p); sArrow(arc(1.5, 1.5, .95, -.15, Math.PI * .45), p);
        sPlayer();
      },
    });
  }

  // 10. Tethered: a dog lunges at you, but its chain only reaches so far
  {
    const POST = [405, 128], LEN = 172, IDLE = [405, 176];
    const pk = [[0, [-40, 352]], [5.2, [880, 352], 'lin'], [6, [880, 352]]];
    const pAt = t => kf(t, pk);
    const target = (() => { const p = pAt(1.9), dx = p[0] - POST[0], dy = p[1] - POST[1], n = Math.hypot(dx, dy); return [POST[0] + dx / n * LEN, POST[1] + dy / n * LEN]; })();
    const dk = [[0, IDLE], [1.5, IDLE], [1.9, target], [2.9, target], [3.8, IDLE]];
    P.push({ name: 'Tethered', label: 'Tethered', slide: 195, T: 6, file: 'p10-tethered',
      caption: 'Dog on a leash',
      themes: [{ tag: 'Courtyard', env: 'dungeon' }, { tag: 'Dungeon', env: 'cave', caption: 'Spiked ball on a chain' }, { tag: 'Sci-fi ruins', env: 'scifi', caption: 'Electrical conductor on a chain (Tears of the Kingdom)' }],
      scene(t, v = 0) {
        floor();
        X.setLineDash([10, 9]); X.strokeStyle = 'rgba(229,50,45,.55)'; X.lineWidth = 3; X.beginPath(); X.arc(...POST, LEN + 30, 0, TAU); X.stroke(); X.setLineDash([]);
        X.fillStyle = 'rgba(229,50,45,.06)'; X.fill();
        label('Chain reach', POST[0] + 150, POST[1] - 80);
        let [dx, dy] = kf(t, dk); const strain = t > 1.9 && t < 2.9;
        if (strain) { const j = Math.sin(t * 45) * 3; dx += j * .6; dy -= j; }
        const ang = Math.atan2(dy - POST[1], dx - POST[0]), d = Math.hypot(dx - POST[0], dy - POST[1]), slack = clamp(1 - d / LEN);
        // chain, sagging when slack
        const mx = (POST[0] + dx) / 2 + Math.cos(ang + Math.PI / 2) * 40 * slack, my = (POST[1] + dy) / 2 + 30 * slack;
        X.strokeStyle = C.metalDk; X.lineWidth = 4; X.setLineDash([7, 4]); X.beginPath(); X.moveTo(...POST); X.quadraticCurveTo(mx, my, dx, dy); X.stroke(); X.setLineDash([]);
        X.fillStyle = C.wood; X.strokeStyle = C.woodDk; X.lineWidth = 3; X.beginPath(); X.arc(...POST, 13, 0, TAU); X.fill(); X.stroke();
        if (v) {
          if (v === 1) { spikes(dx, dy, 25, 9, t * (strain ? 9 : 1)); if (strain) dust(dx, dy, frac(t * 2) * .5, 5, 30, 3); }
          else { const q = rng(Math.floor(t * 24)); X.fillStyle = 'rgba(255,220,90,.3)'; X.beginPath(); X.arc(dx, dy, 34, 0, TAU); X.fill(); ball(dx, dy, 18, null, '#fff3b0', '#c79a1a'); zap([dx - 22, dy], [dx + 22, dy], q, .8);
            if (strain) { const [px, py] = pAt(t), aa = Math.atan2(py - POST[1], px - POST[0]), r = LEN + 30; zap([dx, dy], [POST[0] + Math.cos(aa) * r, POST[1] + Math.sin(aa) * r], q, 1); } }
          const [x, y] = pAt(t); player(x, y, 0); bang(x, y, bangAt(t, 1.85, 2.5));
          return;
        }
        // dog (top-down)
        X.save(); X.translate(dx, dy); X.rotate(ang);
        shadow(2, 4, 34, 20, .22);
        X.strokeStyle = '#6b4222'; X.lineWidth = 6; X.lineCap = 'round'; X.beginPath(); X.moveTo(-30, 0); X.lineTo(-44, Math.sin(t * 20) * 8); X.stroke();
        X.fillStyle = '#8a5a34'; X.beginPath(); X.ellipse(-6, 0, 30, 17, 0, 0, TAU); X.fill();
        X.fillStyle = '#9c6a40'; X.beginPath(); X.arc(26, 0, 14, 0, TAU); X.fill();
        X.fillStyle = '#5e3a1c'; X.beginPath(); X.ellipse(20, -13, 8, 5, -.6, 0, TAU); X.ellipse(20, 13, 8, 5, .6, 0, TAU); X.fill();
        X.fillStyle = '#3a2412'; X.beginPath(); X.arc(39, 0, 4.5, 0, TAU); X.fill();
        X.strokeStyle = C.red; X.lineWidth = 4; X.beginPath(); X.moveTo(13, -12); X.lineTo(13, 12); X.stroke();
        X.restore();
        if (strain) { X.strokeStyle = C.red; X.lineWidth = 3; for (let i = 0; i < 3; i++) { const a = ang - .5 + i * .5, r0 = 52 + 6 * Math.sin(t * 30); X.beginPath(); X.moveTo(dx + Math.cos(a) * r0, dy + Math.sin(a) * r0); X.lineTo(dx + Math.cos(a) * (r0 + 14), dy + Math.sin(a) * (r0 + 14)); X.stroke(); } }
        const [x, y] = pAt(t); player(x, y, 0); bang(x, y, bangAt(t, 1.85, 2.5));
      },
      schem(t) {
        const lunge = kf(t, [[0, 0], [1.5, 0], [1.9, 1], [2.9, 1], [3.8, 0]]);
        X.strokeStyle = C.red; X.lineWidth = 4; X.beginPath(); X.moveTo(...G(2.6, .45)); X.lineTo(...G(1.55, 1.5)); X.stroke();
        sArrow(quad([.6, .45], [.75, 2.0], [2.45, 2.05]), lunge); sPlayer();
      },
    });
  }

  // 11. Patrolling: a rock rolls back and forth along a channel; cross behind it
  {
    const rx = t => 405 + 285 * Math.sin(TAU * t / 3);
    const pk = [[0, [405, 480]], [1.1, [405, 322]], [1.65, [405, 322]], [2.35, [405, 128]], [4.65, [405, 128]], [5.3, [405, 322]], [6, [405, 480]]];
    P.push({ name: 'Patrolling', label: 'Patrolling', slide: 196, T: 6, file: 'p11-patrolling',
      caption: 'A rock that rolls back and forth',
      themes: [{ tag: 'Dungeon', env: 'dungeon' }, { tag: 'Plains', env: 'jungle', caption: 'A stampede of creatures' }, { tag: 'Factory', env: 'factory', caption: 'A mechanical device' }],
      scene(t, v = 0) {
        floor();
        X.fillStyle = v ? (v === 1 ? '#a8865a' : '#7e838c') : C.floorDk; X.fillRect(0, 160, PW, 120);
        if (v === 2) { X.fillStyle = '#5b6068'; X.fillRect(0, 196, PW, 6); X.fillRect(0, 238, PW, 6); }
        X.fillStyle = 'rgba(80,60,30,.12)'; X.fillRect(0, 160, PW, 8); X.fillRect(0, 272, PW, 8);
        X.setLineDash([12, 10]); X.strokeStyle = 'rgba(229,50,45,.45)'; X.lineWidth = 3; X.beginPath(); X.moveTo(120, 220); X.lineTo(690, 220); X.stroke(); X.setLineDash([]);
        for (const x of [52, 758]) { X.fillStyle = C.wood; X.strokeStyle = C.woodDk; X.lineWidth = 3; X.fillRect(x - 12, 168, 24, 104); X.strokeRect(x - 12, 168, 24, 104); }
        const x = rx(t), dir = Math.cos(TAU * t / 3) >= 0 ? 0 : Math.PI;
        if (v === 1) { for (const [ox, oy, ph] of [[-30, -32, 0], [24, -14, 1], [-18, 10, 2], [30, 30, 3], [-34, 38, 4]]) boar(x + ox, 220 + oy, dir, t + ph, .9); dust(x - (dir ? -60 : 60), 220, frac(t * 2) * .6, 5, 30, 2); }
        else if (v === 2) { X.fillStyle = '#4b5059'; X.fillRect(x - 46, 184, 92, 72); X.fillStyle = '#f2c230'; for (let i = 0; i < 4; i++) X.fillRect(x - 46 + i * 24, 184, 12, 8); saw(x - 30, 220, 34, -x / 20); saw(x + 30, 220, 34, -x / 20); X.fillStyle = '#ff5a3a'; X.beginPath(); X.arc(x, 220, 7, 0, TAU); X.fill(); }
        else { shadow(x + 5, 228, 56, 46, .22); ball(x, 220, 55, x / 55, '#b8ac98', '#5e5446'); }
        const [px, py] = kf(t, pk); player(px, py, heading(pk, t, py < 200 ? Math.PI / 2 : -Math.PI / 2));
        if ((t > 1.1 && t < 1.65) || (t > 4.2 && t < 4.65)) label('Cross behind it', 520, t < 3 ? 330 : 110);
      },
      schem(t) {
        const [a] = G(.3, 1.5), [b] = G(2.7, 1.5), y = G(0, 1.5)[1], x = lerp(a, b, (rx(t) - 120) / 570);
        sArrow(line([.3, 1.5], [2.7, 1.5]), 1, { both: true, s: .85 });
        X.fillStyle = '#fff'; X.strokeStyle = C.red; X.lineWidth = 4; X.beginPath(); X.arc(x, y, 11, 0, TAU); X.fill(); X.stroke();
        sPlayer();
      },
    });
  }

  // 12. Balancing: a counterweighted plank tips under your weight so you can cross (side view)
  {
    const PV = [405, 300], HALF = 220, D0 = Math.asin(40 / HALF);
    const xk = [[0, -40], [1.3, 175, 'lin'], [2.75, 470, 'lin'], [3.3, 470], [4.3, 640, 'lin'], [5.2, 880, 'lin'], [6, 880]];
    const al = t => kf(t, [[0, -D0], [2.7, -D0], [3.3, D0], [4.4, D0], [5.3, -D0]]);
    const pos = t => {
      const x = kf(t, xk), a = al(t), left = PV[0] - HALF * Math.cos(a), right = PV[0] + HALF * Math.cos(a);
      if (x < left - 4 || x > right + 4) return [x, 340 - 22, 0];
      return [x, PV[1] + (x - PV[0]) * Math.tan(a) - 22 - 7, a];
    };
    P.push({ name: 'Balancing', label: 'Balancing', slide: 197, T: 6, file: 'p12-balancing',
      caption: 'A lever which must be weighted down to cross the other side',
      themes: [{ tag: 'Dungeon', env: 'dungeon' }, { tag: 'Jungle river', env: 'jungle', caption: 'A log across which you need to maintain balance' }, { tag: 'Lava cavern', env: 'cave', caption: 'A lever which must be weighted down to cross the other side' }],
      scene(t, v = 0) {
        const SK = [{ sky: '#e8e0cf', pit: ['#9b8f78', '#3d3a4a'], cliff: C.wall, top: C.wallHi },
          { sky: '#d6e8c8', pit: ['#5aa6cf', '#1f5f88'], cliff: '#6b4a2a', top: '#5d9a3c' },
          { sky: '#3b2a2a', pit: ['#ff8a2a', '#b3261e'], cliff: '#2f2622', top: '#ff7a2a' }][v];
        X.fillStyle = SK.sky; X.fillRect(0, 0, PW, PH);
        if (v === 2) { const gl = X.createLinearGradient(0, 200, 0, PH); gl.addColorStop(0, 'rgba(255,120,40,0)'); gl.addColorStop(1, 'rgba(255,120,40,.35)'); X.fillStyle = gl; X.fillRect(0, 0, PW, PH); }
        const g = X.createLinearGradient(0, 300, 0, PH); g.addColorStop(0, SK.pit[0]); g.addColorStop(1, SK.pit[1]);
        X.fillStyle = g; X.fillRect(190, v ? 380 : 340, 430, 100);
        if (v === 0) { X.fillStyle = C.metalDk; for (let x = 200; x < 615; x += 22) { X.beginPath(); X.moveTo(x, PH); X.lineTo(x + 11, PH - 26); X.lineTo(x + 22, PH); X.fill(); } }
        else if (v === 1) { for (const cx of [250, 520]) { const bob = Math.sin(t * 2 + cx) * 3; X.fillStyle = '#4f7a34'; X.beginPath(); X.ellipse(cx, 384 + bob, 46, 9, 0, Math.PI, TAU); X.fill(); X.fillStyle = '#fff'; X.beginPath(); X.arc(cx + 30, 376 + bob, 5, 0, TAU); X.fill(); X.fillStyle = C.navy; X.beginPath(); X.arc(cx + 31, 376 + bob, 2.5, 0, TAU); X.fill(); }
          X.strokeStyle = 'rgba(255,255,255,.4)'; X.lineWidth = 2; for (let i = 0; i < 6; i++) { const x = 210 + frac(t * .2 + i / 6) * 400; X.beginPath(); X.moveTo(x, 410 + (i % 3) * 10); X.lineTo(x + 20, 410 + (i % 3) * 10); X.stroke(); } }
        else { for (let i = 0; i < 5; i++) { const k = frac(t * .8 + i / 5); X.fillStyle = `rgba(255,220,90,${1 - k})`; X.beginPath(); X.arc(230 + i * 85, 384 - k * 30, 5 + 6 * k, 0, TAU); X.fill(); } }
        X.fillStyle = v === 2 ? '#2f2622' : '#5a4a3a'; X.beginPath(); X.moveTo(PV[0] - 30, PH); X.lineTo(PV[0] - 12, PV[1] + 18); X.lineTo(PV[0] + 12, PV[1] + 18); X.lineTo(PV[0] + 30, PH); X.fill();
        X.fillStyle = C.red; X.beginPath(); X.moveTo(PV[0], PV[1]); X.lineTo(PV[0] + 20, PV[1] + 28); X.lineTo(PV[0] - 20, PV[1] + 28); X.closePath(); X.fill();
        for (const [x0, x1] of [[0, 195], [615, PW]]) { X.fillStyle = SK.cliff; X.fillRect(x0, 340, x1 - x0, 100); X.fillStyle = SK.top; X.fillRect(x0, 340, x1 - x0, 7); }
        const a = al(t);
        X.save(); X.translate(...PV); X.rotate(a);
        if (v === 1) { X.fillStyle = C.wood; X.strokeStyle = C.woodDk; X.lineWidth = 3; X.beginPath(); X.roundRect(-HALF, -16, HALF * 2, 16, 8); X.fill(); X.stroke(); X.fillStyle = C.woodHi; X.beginPath(); X.ellipse(HALF - 4, -8, 4, 8, 0, 0, TAU); X.fill();
          ball(-HALF + 30, -38, 24, null, '#9b9488', '#4e483f'); }
        else if (v === 2) { X.fillStyle = '#6e6660'; X.strokeStyle = '#3e3834'; X.lineWidth = 3; X.fillRect(-HALF, -16, HALF * 2, 16); X.strokeRect(-HALF, -16, HALF * 2, 16);
          X.fillStyle = '#3e3834'; X.fillRect(-HALF + 6, -58, 46, 42); X.fillStyle = '#ff7a2a'; X.fillRect(-HALF + 14, -48, 30, 4); }
        else { X.fillStyle = C.wood; X.strokeStyle = C.woodDk; X.lineWidth = 3; X.fillRect(-HALF, -14, HALF * 2, 14); X.strokeRect(-HALF, -14, HALF * 2, 14);
        X.fillStyle = '#7d7f95'; X.strokeStyle = '#4a4c62'; X.fillRect(-HALF + 6, -54, 46, 40); X.strokeRect(-HALF + 6, -54, 46, 40); }
        X.restore();
        const cw = [PV[0] + (-HALF + 29) * Math.cos(a) + 70 * Math.sin(a), PV[1] + (-HALF + 29) * Math.sin(a) - 70 * Math.cos(a)];
        label('Counterweight', cw[0] + 10, cw[1] - 14, 'center', C.ink, 15);
        const tilt = Math.abs(a) < D0 * .95;
        if (tilt) { X.globalAlpha = .9; head(PV[0] + 150, PV[1] + 70, Math.PI / 2, .8); head(PV[0] - 150, PV[1] - 70, -Math.PI / 2, .8); X.globalAlpha = 1; }
        const [x, y, pa] = pos(t);
        X.save(); X.translate(x, y); X.rotate(pa); player(0, 0, 0); X.restore();
        if (t > 1.3 && t < 2.6) label('Your weight tips it', 420, 200);
      },
      schem(t) {
        const a = al(t), [cx, cy] = G(1.5, 1.6), r = 115;
        X.fillStyle = C.red; X.strokeStyle = C.red; X.lineWidth = 4;
        X.beginPath(); X.moveTo(cx, cy); X.lineTo(cx + 18, cy + 30); X.lineTo(cx - 18, cy + 30); X.closePath(); X.fillStyle = '#fff'; X.fill(); X.stroke();
        const ex = Math.cos(a) * r, ey = Math.sin(a) * r;
        X.strokeStyle = C.red; X.lineWidth = 7; X.beginPath(); X.moveTo(cx - ex, cy - ey); X.lineTo(cx + ex, cy + ey); X.stroke();
        head(cx + ex, cy + ey, a, .9); head(cx - ex, cy - ey, a + Math.PI, .9);
        const k = clamp((kf(t, xk) - 175) / (640 - 175)), u = lerp(.45, 2.55, k);
        if (kf(t, xk) > 120 && kf(t, xk) < 700) sPlayer(u, 1.6 + (u - 1.5) * Math.tan(a) - .27, 0);
      },
    });
  }

  // 13. Spiral: a fire bar spins while it grows and shrinks, tracing a spiral
  {
    const O = [405, 180], T = 6, Lk = t => 135 - 85 * Math.cos(TAU * t / T), th = t => 2 * TAU * t / T - Math.PI / 2;
    const pk = [[0, [405, 335]], [1.15, [650, 335], 'lin'], [1.8, [880, 335]], [3.6, [880, 335]], [3.6, [-40, 335]], [4.4, [150, 335]], [4.75, [150, 335]], [6, [405, 335], 'lin']];
    P.push({ name: 'Spiral', label: 'Spiral', slide: 198, T, file: 'p13-spiral',
      caption: 'A spinning blade that expands and retracts (Zelda 3)',
      themes: [{ tag: 'Castle', env: 'dungeon' }, { tag: 'Desert', env: 'desert', caption: 'A repulsive whirlwind' }, { tag: 'Jungle', env: 'jungle', caption: 'A growing plant that expands over time' }],
      scene(t, v = 0) {
        floor();
        X.lineCap = 'round';
        const trail = ['229,50,45', '150,120,80', '60,110,30'][v];
        for (let i = 0; i < 40; i++) {
          const ta = t - i * .03, ta2 = t - (i + 1) * .03, l1 = Lk(ta), l2 = Lk(ta2);
          X.strokeStyle = `rgba(${trail},${.45 * (1 - i / 40)})`; X.lineWidth = 6;
          X.beginPath(); X.moveTo(O[0] + Math.cos(th(ta)) * l1, O[1] + Math.sin(th(ta)) * l1); X.lineTo(O[0] + Math.cos(th(ta2)) * l2, O[1] + Math.sin(th(ta2)) * l2); X.stroke();
        }
        X.setLineDash([10, 9]); X.strokeStyle = 'rgba(229,50,45,.4)'; X.lineWidth = 2.5; X.beginPath(); X.arc(...O, 234, 0, TAU); X.stroke(); X.setLineDash([]);
        const L = Lk(t), a = th(t);
        if (v === 1) {
          for (let d = 24; d <= L; d += 14) { const k = d / 220, x = O[0] + Math.cos(a - k * .3) * d, y = O[1] + Math.sin(a - k * .3) * d; puff(x, y, 12 + 8 * k, .45); X.strokeStyle = 'rgba(110,90,60,.6)'; X.lineWidth = 2; X.beginPath(); X.arc(x, y, 8 + 6 * k, t * 12 + d, t * 12 + d + 3.5); X.stroke(); }
          for (let i = 0; i < 3; i++) { X.strokeStyle = 'rgba(110,90,60,.7)'; X.lineWidth = 3; X.beginPath(); X.arc(...O, 10 + i * 9, t * 10 + i, t * 10 + i + 4); X.stroke(); }
        } else if (v === 2) {
          const pts = []; for (let d = 18; d <= L; d += 6) { const k = d / 220; pts.push([O[0] + Math.cos(a - k * .5) * d + Math.sin(d * .08 + t * 4) * 4, O[1] + Math.sin(a - k * .5) * d]); }
          X.strokeStyle = '#2f5a22'; X.lineWidth = 12; X.beginPath(); pts.forEach((q, i) => i ? X.lineTo(...q) : X.moveTo(...q)); X.stroke(); X.strokeStyle = '#5c9a3c'; X.lineWidth = 5; X.stroke();
          for (let i = 3; i < pts.length; i += 4) { const [x, y] = pts[i], sd = i % 8 ? 1 : -1; X.fillStyle = '#4f8f34'; X.beginPath(); X.ellipse(x + sd * 10, y, 10, 5, a + sd, 0, TAU); X.fill(); X.fillStyle = '#e8e0cf'; X.beginPath(); X.moveTo(x - sd * 6, y); X.lineTo(x - sd * 14, y - 4); X.lineTo(x - sd * 6, y + 3); X.fill(); }
          if (pts.length) { const [x, y] = pts[pts.length - 1]; X.fillStyle = '#e8488a'; X.beginPath(); X.arc(x, y, 9, 0, TAU); X.fill(); }
          X.fillStyle = '#e8488a'; for (let i = 0; i < 6; i++) { const aa = i * TAU / 6 + t; X.beginPath(); X.ellipse(O[0] + Math.cos(aa) * 14, O[1] + Math.sin(aa) * 14, 11, 7, aa, 0, TAU); X.fill(); }
          X.fillStyle = '#ffd34a'; X.beginPath(); X.arc(...O, 9, 0, TAU); X.fill();
        } else {
        for (let d = 28; d <= L; d += 22) flame(O[0] + Math.cos(a) * d, O[1] + Math.sin(a) * d, 1.05, t, d);
        X.fillStyle = E.wallDk; X.beginPath(); X.arc(...O, 24, 0, TAU); X.fill(); X.fillStyle = E.wallHi; X.beginPath(); X.arc(...O, 12, 0, TAU); X.fill(); }
        const [x, y] = kf(t, pk); player(x, y, heading(pk, t, 0)); bang(x, y, bangAt(t, 4.0, 4.75));
        if (t > 4.2 && t < 4.75) label('Go while it is short', 220, 395);
      },
      schem(t) {
        const pts = []; for (let i = 0; i <= 80; i++) { const k = i / 80, a = Math.PI * .5 + k * TAU * 1.15, r = .2 + k * 1.1; pts.push([1.55 + Math.cos(a) * r * .95, 1.55 + Math.sin(a) * r]); }
        sArrow(pts, (Lk(t) - 50) / 170); sPlayer();
      },
    });
  }

  // 14. Crushing: two logs slam together across the corridor
  {
    const T = 5.6, ck = t => kf(t, [[0, 0], [1.25, 0], [1.5, 1, 'lin'], [2.2, 1], [3.2, 0], [3.9, 0], [4.15, 1, 'lin'], [4.7, 1], [T, 0]]);
    const pk = [[0, [-40, 220]], [1.1, [300, 220]], [3.05, [300, 220]], [3.6, [600, 220], 'lin'], [4.5, [880, 220]], [T, [880, 220]]];
    P.push({ name: 'Crushing', label: 'Crushing', slide: 199, T, file: 'p14-crushing',
      caption: 'Two logs that slam together',
      themes: [{ tag: 'Temple', env: 'dungeon' }, { tag: 'Sci-fi', env: 'scifi', caption: 'A door that crushes close' }, { tag: 'Ice cave', env: 'ice', caption: 'Crystalline spikes growing out of two surfaces' }],
      scene(t, v = 0) {
        const hit = [1.5, 4.15].map(h => t - h).find(a => a >= 0 && a < .25);
        if (hit != null) X.translate(Math.sin(t * 90) * 5 * (1 - hit / .25), 0);
        floor();
        X.fillStyle = 'rgba(229,50,45,.1)'; X.fillRect(395, 120, 80, 200);
        const c = ck(t), h = 100 * c;
        const log = (y, hgt, flip) => {
          if (hgt <= 1) return;
          X.fillStyle = C.wood; X.strokeStyle = C.woodDk; X.lineWidth = 3; X.fillRect(400, y, 70, hgt); X.strokeRect(400, y, 70, hgt);
          X.strokeStyle = 'rgba(90,55,25,.5)'; X.lineWidth = 2; X.beginPath(); X.moveTo(418, y); X.lineTo(418, y + hgt); X.moveTo(452, y); X.lineTo(452, y + hgt); X.stroke();
          const ey = flip ? y : y + hgt; X.fillStyle = C.woodHi; X.beginPath(); X.ellipse(435, ey, 35, 8, 0, 0, TAU); X.fill(); X.strokeStyle = C.woodDk; X.stroke();
          X.beginPath(); X.ellipse(435, ey, 18, 4, 0, 0, TAU); X.stroke();
        };
        const door = (y, hgt, flip) => {
          if (hgt <= 1) return;
          X.fillStyle = '#5a6488'; X.strokeStyle = '#2a3150'; X.lineWidth = 3; X.fillRect(392, y, 86, hgt); X.strokeRect(392, y, 86, hgt);
          const ey = flip ? y : y + hgt - 12; X.save(); X.beginPath(); X.rect(392, ey, 86, 12); X.clip();
          for (let xx = 380; xx < 480; xx += 16) { X.fillStyle = '#f2c230'; X.beginPath(); X.moveTo(xx, ey + 12); X.lineTo(xx + 8, ey + 12); X.lineTo(xx + 20, ey); X.lineTo(xx + 12, ey); X.fill(); }
          X.restore(); X.fillStyle = '#4fd1ff'; X.fillRect(430, flip ? y + hgt - 20 : y + 8, 10, 10);
        };
        const crystals = (y, hgt, flip) => {
          if (hgt <= 1) return;
          for (const [cx, w, k] of [[408, 16, .8], [435, 22, 1], [462, 16, .85]]) { const tip = flip ? y + hgt - hgt * k : y + hgt * k, base = flip ? y + hgt : y;
            X.fillStyle = 'rgba(200,236,255,.9)'; X.strokeStyle = '#5d9cc4'; X.lineWidth = 2; X.beginPath(); X.moveTo(cx - w, base); X.lineTo(cx, flip ? 320 - hgt : 120 + hgt); X.lineTo(cx + w, base); X.closePath(); X.fill(); X.stroke();
            X.strokeStyle = 'rgba(255,255,255,.8)'; X.beginPath(); X.moveTo(cx, base); X.lineTo(cx, flip ? 320 - hgt * .9 : 120 + hgt * .9); X.stroke(); void tip; }
        };
        if (v === 1) { door(120, h, false); door(320 - h, h, true); }
        else if (v === 2) { crystals(120, h, false); crystals(320 - h, h, true); }
        else { log(120, h, false); log(320 - h, h, true); }
        wall(0, 0, PW, 120); edge(0, 114, PW, 6); wall(0, 320, PW, 120); edge(0, 320, PW, 6);
        X.fillStyle = E.wallDk; X.fillRect(396, 108, 78, 12); X.fillRect(396, 320, 78, 12);
        if (hit != null) { flash(435, 220, 70, 1 - hit / .25); }
        for (const hh of [1.5, 4.15]) dust(435, 220, t - hh, 8, 70, hh * 10);
        const [x, y] = kf(t, pk); player(x, y, heading(pk, t, 0)); bang(x, y, bangAt(t, 1.3, 2.0));
        if (t > 2.3 && t < 3.05) label('Run on the reset', 300, 290);
      },
      schem(t) { const c = ck(t); sArrow(quad([.05, 1.35], [.5, 1.9], [1.38, 1.75]), c, { s: .8 }); sArrow(quad([2.95, 1.35], [2.5, 1.9], [1.62, 1.75]), c, { s: .8 }); sPlayer(); },
    });
  }

  // ---------- frame ----------
  const cv = document.getElementById('c'); X = cv.getContext('2d');
  const qs = new URLSearchParams(location.search);
  // backing store scale: ?k=1.5 renders 1920x1080 for the GIFs; on screen it follows the display's pixel ratio
  const K = +qs.get('k') || Math.min(2, Math.max(1, devicePixelRatio || 1));
  cv.width = W * K; cv.height = H * K;
  // the course deck's parchment texture (same file the deck theme uses)
  const paper = new Image(); paper.src = '../../assets/img/theme/paper.jpg';
  const paperReady = paper.decode().catch(() => {});
  let idx = clamp((+qs.get('p') || 1) - 1, 0, P.length - 1);
  if (qs.has('rec')) document.body.classList.add('rec');

  // t in [0, T * themes) cycles every theme of the current pattern, one full loop each
  function frameThemes(t) {
    const p = P[idx], n = p.themes.length, v = Math.min(n - 1, Math.floor(t / p.T));
    frame(t - v * p.T, v);
  }
  function frame(t, v = null) {
    const p = P[idx], th = v == null ? null : p.themes[v];
    E = ENV[th ? th.env : 'dungeon'];
    X.setTransform(K, 0, 0, K, 0, 0);
    X.fillStyle = C.paper; X.fillRect(0, 0, W, H);
    if (paper.naturalWidth) { const k = Math.max(W / paper.naturalWidth, H / paper.naturalHeight), w = paper.naturalWidth * k, h = paper.naturalHeight * k; X.drawImage(paper, (W - w) / 2, (H - h) / 2, w, h); }
    // header block flush in the top-left corner, angled edge, blue stripe underneath
    X.fillStyle = C.blue; X.beginPath(); X.moveTo(0, 0); X.lineTo(612, 0); X.lineTo(560, 134); X.lineTo(0, 134); X.fill();
    X.fillStyle = C.navy; X.beginPath(); X.moveTo(0, 0); X.lineTo(598, 0); X.lineTo(552, 120); X.lineTo(0, 120); X.fill();
    X.textAlign = 'left'; X.textBaseline = 'alphabetic';
    X.fillStyle = '#aab3e0'; X.font = '600 17px Jost'; X.letterSpacing = '3px'; X.fillText(`HAZARD PATTERN ${idx + 1}`, 40, 44); X.letterSpacing = '0px';
    X.font = '800 44px Montserrat'; X.fillStyle = C.gold; X.fillText(p.name, 40, 96);
    // schematic card
    X.save(); X.shadowColor = 'rgba(60,40,10,.25)'; X.shadowBlur = 12; X.shadowOffsetY = 3;
    X.fillStyle = '#fff'; X.fillRect(52, 196, 336, 362); X.restore();
    X.strokeStyle = '#111'; X.lineWidth = 3; X.beginPath();
    for (let i = 0; i <= 3; i++) { X.moveTo(GX + i * CELL, GY); X.lineTo(GX + i * CELL, GY + 3 * CELL); X.moveTo(GX, GY + i * CELL); X.lineTo(GX + 3 * CELL, GY + i * CELL); }
    X.stroke();
    X.save(); p.schem(t); X.restore();
    X.fillStyle = '#222'; X.font = '500 22px Jost'; X.textAlign = 'center'; X.fillText(p.label, GX + 1.5 * CELL, 534);
    X.fillStyle = C.goldInk; X.font = '600 14px Jost'; X.letterSpacing = '2px'; X.fillText('THE PATTERN', 220, 590); X.letterSpacing = '0px';
    X.fillStyle = C.ink; X.font = '500 17px Jost'; X.fillText('The arrow fills as the hazard moves', 220, 614);
    // example caption + panel
    X.textAlign = 'left'; X.fillStyle = C.goldInk; X.font = '600 14px Jost'; X.letterSpacing = '2px';
    const eb = th ? `EXAMPLE ${v + 1} OF ${p.themes.length}: ${th.tag.toUpperCase()}` : 'EXAMPLE', ew = X.measureText(eb).width;
    X.fillText(eb, PX, 180); X.letterSpacing = '0px';
    if (th) p.themes.forEach((_, i) => { X.fillStyle = i === v ? C.gold : 'rgba(38,44,106,.25)'; X.beginPath(); X.arc(PX + ew + 16 + i * 16, 175, 5, 0, TAU); X.fill(); });
    X.fillStyle = C.ink; X.font = '600 24px Jost'; X.fillText(th && th.caption || p.caption, PX, 212);
    X.save(); X.beginPath(); X.roundRect(PX, PY, PW, PH, 14); X.clip(); X.translate(PX, PY);
    p.scene(t, v || 0);
    X.restore();
    if (th) { const f = Math.max(clamp(1 - t / .25), clamp(1 - (p.T - t) / .25)); if (f > 0) { X.fillStyle = `rgba(235,228,214,${f})`; X.beginPath(); X.roundRect(PX, PY, PW, PH, 14); X.fill(); } }
    X.strokeStyle = C.ink; X.lineWidth = 3; X.beginPath(); X.roundRect(PX, PY, PW, PH, 14); X.stroke();
  }

  window.HAZARDS = { ready: paperReady, patterns: P.map(p => ({ file: p.file, T: p.T, n: p.themes.length, name: p.name, slide: p.slide, caption: p.caption, themes: p.themes })), select(i) { idx = i; }, frame, frameThemes };
  const themed = !qs.has('single');   // the themed cycle is the default; ?single shows one theme

  const go = d => { location.search = '?p=' + (((idx + d) % P.length + P.length) % P.length + 1) + (themed ? '' : '&single'); };
  document.getElementById('prev').onclick = e => { e.preventDefault(); go(-1); };
  document.getElementById('next').onclick = e => { e.preventDefault(); go(1); };
  addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === ' ') go(1); if (e.key === 'ArrowLeft') go(-1); });
  document.getElementById('where').textContent = `Pattern ${idx + 1} of ${P.length} · deck slide ${P[idx].slide}`;
  const fit = () => { const s = Math.min(innerWidth / W, (innerHeight - (qs.has('rec') ? 0 : 44)) / H); cv.style.width = W * s + 'px'; cv.style.height = H * s + 'px'; };
  addEventListener('resize', fit); fit();
  if (!qs.has('rec')) {
    const t0 = performance.now();
    const loop = now => { const s = (now - t0) / 1000; themed ? frameThemes(s % (P[idx].T * P[idx].themes.length)) : frame(s % P[idx].T); requestAnimationFrame(loop); };
    Promise.all([document.fonts.ready, paperReady]).then(() => requestAnimationFrame(loop));
  }
})();
