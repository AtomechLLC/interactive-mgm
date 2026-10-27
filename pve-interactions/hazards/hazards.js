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
  function floor(col = C.floor, step = 40) {
    X.fillStyle = col; X.fillRect(0, 0, PW, PH);
    const r = rng(7);
    for (let y = 0; y < PH; y += step) for (let x = (y / step) % 2 ? -step / 2 : 0; x < PW; x += step)
      if (r() < .22) { X.fillStyle = 'rgba(120,96,50,.07)'; X.fillRect(x + 1, y + 1, step - 2, step - 2); }
    X.strokeStyle = C.floorLn; X.lineWidth = 1.5; X.beginPath();
    for (let y = 0; y <= PH; y += step) {
      X.moveTo(0, y); X.lineTo(PW, y);
      for (let x = (y / step) % 2 ? -step / 2 : 0; x < PW; x += step) { X.moveTo(x, y); X.lineTo(x, y + step); }
    }
    X.stroke();
  }
  function wall(x, y, w, h) {
    X.fillStyle = C.wall; X.fillRect(x, y, w, h);
    X.strokeStyle = C.wallDk; X.lineWidth = 2; X.beginPath();
    for (let yy = y + 22; yy < y + h; yy += 22) { X.moveTo(x, yy); X.lineTo(x + w, yy); }
    for (let yy = y, row = 0; yy < y + h; yy += 22, row++) for (let xx = x + (row % 2 ? 22 : 0); xx < x + w; xx += 44) { X.moveTo(xx, yy); X.lineTo(xx, Math.min(yy + 22, y + h)); }
    X.stroke();
  }
  function edge(x, y, w, h) { X.fillStyle = C.wallHi; X.fillRect(x, y, w, h); }
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
      scene(t) {
        floor();
        const e = ext(t), tele = t > 1.4 && t < 1.95 ? .5 + .5 * Math.sin((t - 1.4) * 30) : 0;
        if (tele) { X.fillStyle = `rgba(229,50,45,${.12 + .12 * tele})`; X.fillRect(392, 110, 116, 220); }
        // pressure plate
        const on = t > 1.2 && t < 3.4;
        X.fillStyle = on ? '#c9a24a' : '#b9ad92'; X.strokeStyle = C.woodDk; X.lineWidth = 2;
        X.beginPath(); X.roundRect(296, 192, 58, 56, 6); X.fill(); X.stroke();
        if (on) label('Trigger plate', 325, 290);
        wall(0, 0, PW, 110); edge(0, 104, PW, 6); wall(0, 330, PW, 110); edge(0, 330, PW, 6);
        for (const x of [410, 450, 490]) {
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
      caption: 'A giant ball rolling down a corridor toward you',
      scene(t) {
        floor();
        wall(0, 0, 205, 140); wall(295, 0, PW - 295, 140); wall(205, 0, 90, 58);
        edge(0, 134, 205, 6); edge(295, 134, PW - 295, 6); edge(205, 52, 90, 6);
        wall(0, 300, PW, 140); edge(0, 300, PW, 6);
        label('Alcove', 250, 24, 'center', C.ink, 15);
        const x = bx(t);
        if (x < 900 && x > -120) for (let i = 1; i <= 4; i++) puff(x + 70 + i * 22, 270 - (i % 2) * 90, 10 + i * 3, .35 - i * .07);
        if (t > 1.3 && t < 3.9) { const p = clamp((960 - x) / 640); X.globalAlpha = .9 * (1 - p); X.fillStyle = C.red; for (let i = 0; i < 3; i++) head(760 - i * 26, 220, Math.PI, .9); X.globalAlpha = 1; }
        shadow(x + 6, 226, 72, 66, .2);
        ball(x, 220, 72, -x / 72, '#b8ac98', '#5e5446');
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
      scene(t) {
        floor();
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
      scene(t) {
        floor();
        const g = X.createRadialGradient(...O, 10, ...O, R);
        g.addColorStop(0, '#6b5230'); g.addColorStop(.18, C.sandDk); g.addColorStop(1, C.sand);
        X.fillStyle = g; X.beginPath(); X.arc(...O, R, 0, TAU); X.fill();
        X.strokeStyle = C.sandDk; X.lineWidth = 3; X.stroke();
        for (let i = 0; i < 5; i++) { const r = R * (1 - frac(t / T * 3 + i / 5)); X.strokeStyle = `rgba(120,90,40,${.35 * r / R})`; X.lineWidth = 2; X.beginPath(); X.arc(...O, r, 0, TAU); X.stroke(); }
        const q = rng(5);
        for (let i = 0; i < 150; i++) {
          const a0 = q() * TAU, ph = q(), k = frac(t / T * 2 + ph), r = R * (1 - k) + 4, a = a0 + k * 2.4;
          X.fillStyle = `rgba(110,80,35,${.7 * (1 - k * .6)})`; X.beginPath(); X.arc(O[0] + Math.cos(a) * r, O[1] + Math.sin(a) * r, 2.6, 0, TAU); X.fill();
        }
        // a crate spirals in and sinks
        { const k = t / T, r = 190 * (1 - k), a = .6 + k * 3, s = clamp(r / 70), al = clamp(t / .4) * s;
          if (al > 0) { X.save(); X.globalAlpha = al; X.translate(O[0] + Math.cos(a) * r, O[1] + Math.sin(a) * r); X.rotate(a * 1.5); X.scale(s, s);
            X.fillStyle = C.wood; X.strokeStyle = C.woodDk; X.lineWidth = 3; X.fillRect(-20, -20, 40, 40); X.strokeRect(-20, -20, 40, 40);
            X.beginPath(); X.moveTo(-20, -20); X.lineTo(20, 20); X.moveTo(20, -20); X.lineTo(-20, 20); X.stroke(); X.restore(); } }
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
    P.push({ name: 'Eruption', label: 'Eruption', slide: 190, T: 6, file: 'p05-eruption',
      caption: 'Volcano exploding with flaming boulders',
      scene(t) {
        floor();
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
      scene(t) {
        floor();
        const stroke = (col, w) => { X.strokeStyle = col; X.lineWidth = w; X.lineCap = 'round'; X.lineJoin = 'round'; X.beginPath(); path.forEach((q, i) => i ? X.lineTo(...q) : X.moveTo(...q)); X.stroke(); };
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
      scene(t) {
        floor();
        S.forEach((p, i) => { const age = frac((t - (i ? i * D : T)) / T) * T; if (age < 1.8) { X.fillStyle = `rgba(95,191,74,${.4 * (1 - age / 1.8)})`; X.beginPath(); X.ellipse(...p, 36, 24, 0, 0, TAU); X.fill(); } });
        const { a, b, u } = slime(t), z = Math.sin(Math.PI * u) * 105;
        danger(...b, 40 * ease(u), .8);
        const gx = lerp(a[0], b[0], u), gy = lerp(a[1], b[1], u);
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
      scene(t) {
        floor();
        wall(0, 0, PW, 120); edge(0, 114, PW, 6); wall(0, 320, PW, 120); edge(0, 320, PW, 6);
        const x = bxk(t), speed = 940 / 3.6;
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
      scene(t) {
        floor();
        X.setLineDash([10, 9]); X.strokeStyle = 'rgba(229,50,45,.45)'; X.lineWidth = 3; X.beginPath(); X.arc(...O, Lb + 8, 0, TAU); X.stroke(); X.setLineDash([]);
        const a = th(t);
        for (const off of [0, Math.PI]) {
          X.save(); X.translate(...O); X.rotate(a + off);
          X.fillStyle = 'rgba(229,50,45,.14)'; X.beginPath(); X.moveTo(0, 0); X.arc(0, 0, Lb, -.5, 0); X.closePath(); X.fill();
          X.fillStyle = C.metal; X.strokeStyle = C.metalDk; X.lineWidth = 2;
          X.beginPath(); X.moveTo(20, -7); X.lineTo(Lb - 14, -12); X.lineTo(Lb, 0); X.lineTo(Lb - 14, 7); X.lineTo(20, 7); X.closePath(); X.fill(); X.stroke();
          X.strokeStyle = C.red; X.lineWidth = 3; X.beginPath(); X.moveTo(26, -8); X.lineTo(Lb - 14, -12); X.stroke();
          X.restore();
        }
        X.fillStyle = C.metalDk; X.beginPath(); X.arc(...O, 26, 0, TAU); X.fill(); X.fillStyle = C.metal; X.beginPath(); X.arc(...O, 14, 0, TAU); X.fill();
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
      scene(t) {
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
      scene(t) {
        floor();
        X.fillStyle = C.floorDk; X.fillRect(0, 160, PW, 120);
        X.fillStyle = 'rgba(80,60,30,.12)'; X.fillRect(0, 160, PW, 8); X.fillRect(0, 272, PW, 8);
        X.setLineDash([12, 10]); X.strokeStyle = 'rgba(229,50,45,.45)'; X.lineWidth = 3; X.beginPath(); X.moveTo(120, 220); X.lineTo(690, 220); X.stroke(); X.setLineDash([]);
        for (const x of [52, 758]) { X.fillStyle = C.wood; X.strokeStyle = C.woodDk; X.lineWidth = 3; X.fillRect(x - 12, 168, 24, 104); X.strokeRect(x - 12, 168, 24, 104); }
        const x = rx(t);
        shadow(x + 5, 228, 56, 46, .22); ball(x, 220, 55, x / 55, '#b8ac98', '#5e5446');
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
      caption: 'A lever you weigh down to cross to the other side',
      scene(t) {
        X.fillStyle = '#e8e0cf'; X.fillRect(0, 0, PW, PH);
        const g = X.createLinearGradient(0, 300, 0, PH); g.addColorStop(0, '#9b8f78'); g.addColorStop(1, '#3d3a4a');
        X.fillStyle = g; X.fillRect(190, 340, 430, 100);
        X.fillStyle = C.metalDk; for (let x = 200; x < 615; x += 22) { X.beginPath(); X.moveTo(x, PH); X.lineTo(x + 11, PH - 26); X.lineTo(x + 22, PH); X.fill(); }
        X.fillStyle = '#5a4a3a'; X.beginPath(); X.moveTo(PV[0] - 30, PH); X.lineTo(PV[0] - 12, PV[1] + 18); X.lineTo(PV[0] + 12, PV[1] + 18); X.lineTo(PV[0] + 30, PH); X.fill();
        X.fillStyle = C.red; X.beginPath(); X.moveTo(PV[0], PV[1]); X.lineTo(PV[0] + 20, PV[1] + 28); X.lineTo(PV[0] - 20, PV[1] + 28); X.closePath(); X.fill();
        for (const [x0, x1] of [[0, 195], [615, PW]]) { X.fillStyle = C.wall; X.fillRect(x0, 340, x1 - x0, 100); X.fillStyle = C.wallHi; X.fillRect(x0, 340, x1 - x0, 7); }
        const a = al(t);
        X.save(); X.translate(...PV); X.rotate(a);
        X.fillStyle = C.wood; X.strokeStyle = C.woodDk; X.lineWidth = 3; X.fillRect(-HALF, -14, HALF * 2, 14); X.strokeRect(-HALF, -14, HALF * 2, 14);
        X.fillStyle = '#7d7f95'; X.strokeStyle = '#4a4c62'; X.fillRect(-HALF + 6, -54, 46, 40); X.strokeRect(-HALF + 6, -54, 46, 40);
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
      caption: 'A spinning blade that expands and retracts',
      scene(t) {
        floor();
        X.lineCap = 'round';
        for (let i = 0; i < 40; i++) {
          const ta = t - i * .03, ta2 = t - (i + 1) * .03, l1 = Lk(ta), l2 = Lk(ta2);
          X.strokeStyle = `rgba(229,50,45,${.45 * (1 - i / 40)})`; X.lineWidth = 6;
          X.beginPath(); X.moveTo(O[0] + Math.cos(th(ta)) * l1, O[1] + Math.sin(th(ta)) * l1); X.lineTo(O[0] + Math.cos(th(ta2)) * l2, O[1] + Math.sin(th(ta2)) * l2); X.stroke();
        }
        X.setLineDash([10, 9]); X.strokeStyle = 'rgba(229,50,45,.4)'; X.lineWidth = 2.5; X.beginPath(); X.arc(...O, 234, 0, TAU); X.stroke(); X.setLineDash([]);
        const L = Lk(t), a = th(t);
        for (let d = 28; d <= L; d += 22) flame(O[0] + Math.cos(a) * d, O[1] + Math.sin(a) * d, 1.05, t, d);
        X.fillStyle = C.wallDk; X.beginPath(); X.arc(...O, 24, 0, TAU); X.fill(); X.fillStyle = C.wallHi; X.beginPath(); X.arc(...O, 12, 0, TAU); X.fill();
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
      scene(t) {
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
        log(120, h, false); log(320 - h, h, true);
        wall(0, 0, PW, 120); edge(0, 114, PW, 6); wall(0, 320, PW, 120); edge(0, 320, PW, 6);
        X.fillStyle = C.wallDk; X.fillRect(396, 108, 78, 12); X.fillRect(396, 320, 78, 12);
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
  // the course deck's parchment texture (same file the deck theme uses)
  const paper = new Image(); paper.src = '../../assets/img/theme/paper.jpg';
  const paperReady = paper.decode().catch(() => {});
  const qs = new URLSearchParams(location.search);
  let idx = clamp((+qs.get('p') || 1) - 1, 0, P.length - 1);
  if (qs.has('rec')) document.body.classList.add('rec');

  function frame(t) {
    const p = P[idx];
    X.setTransform(1, 0, 0, 1, 0, 0);
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
    X.textAlign = 'left'; X.fillStyle = C.goldInk; X.font = '600 14px Jost'; X.letterSpacing = '2px'; X.fillText('EXAMPLE', PX, 180); X.letterSpacing = '0px';
    X.fillStyle = C.ink; X.font = '600 24px Jost'; X.fillText(p.caption, PX, 212);
    X.save(); X.beginPath(); X.roundRect(PX, PY, PW, PH, 14); X.clip(); X.translate(PX, PY);
    p.scene(t);
    X.restore();
    X.strokeStyle = C.ink; X.lineWidth = 3; X.beginPath(); X.roundRect(PX, PY, PW, PH, 14); X.stroke();
  }

  window.HAZARDS = { ready: paperReady, patterns: P.map(p => ({ file: p.file, T: p.T, name: p.name, slide: p.slide, caption: p.caption })), select(i) { idx = i; }, frame };

  const go = d => { location.search = '?p=' + (((idx + d) % P.length + P.length) % P.length + 1); };
  document.getElementById('prev').onclick = e => { e.preventDefault(); go(-1); };
  document.getElementById('next').onclick = e => { e.preventDefault(); go(1); };
  addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === ' ') go(1); if (e.key === 'ArrowLeft') go(-1); });
  document.getElementById('where').textContent = `Pattern ${idx + 1} of ${P.length} · deck slide ${P[idx].slide}`;
  const fit = () => { const s = Math.min(innerWidth / W, (innerHeight - (qs.has('rec') ? 0 : 44)) / H); cv.style.width = W * s + 'px'; cv.style.height = H * s + 'px'; };
  addEventListener('resize', fit); fit();
  if (!qs.has('rec')) {
    const t0 = performance.now();
    const loop = now => { frame(((now - t0) / 1000) % P[idx].T); requestAnimationFrame(loop); };
    Promise.all([document.fonts.ready, paperReady]).then(() => requestAnimationFrame(loop));
  }
})();
