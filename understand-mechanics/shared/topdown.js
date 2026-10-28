/* Top-down drawing kit, copied from mechanics-tools/shared/topdown.js so this module stands alone (MGM C4 M2).
   Same look as the hazard pattern GIFs: parchment floor tiles, navy brick walls, the blue player disc with a white arrow,
   red for anything hostile. Everything draws into whatever context TD.use(g) was given, in that context's units. */
(function () {
  const TAU = Math.PI * 2;
  const C = {
    navy: '#152044', ink: '#262c6a', blue: '#5562eb', gold: '#ffb951', goldInk: '#9a5a06', muted: '#5d618c',
    red: '#e5322d', redDk: '#a8201c', player: '#2ea3dc', p2: '#2fae63', p3: '#8a4fd6', good: '#1a8a4c', purple: '#8a4fd6', shield: '#57b6ff',
    floor: '#ddd2bc', floorLn: '#cdbf9f', wall: '#3d4270', wallDk: '#2a2e55', wallHi: '#5a5f92', stone: '#8b8fa8', stoneDk: '#62688a',
  };
  let X;
  const use = g => { X = g; };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

  function floor(x, y, w, h, dark = 0) {
    X.fillStyle = C.floor; X.fillRect(x, y, w, h);
    X.strokeStyle = C.floorLn; X.lineWidth = 1.5; X.beginPath();
    for (let yy = y; yy <= y + h; yy += 40) { X.moveTo(x, yy); X.lineTo(x + w, yy); }
    for (let yy = y, r = 0; yy < y + h; yy += 40, r++) for (let xx = x + (r % 2 ? 20 : 0); xx < x + w; xx += 40) { X.moveTo(xx, yy); X.lineTo(xx, Math.min(yy + 40, y + h)); }
    X.stroke();
    if (dark > 0) { X.fillStyle = `rgba(10,14,34,${dark})`; X.fillRect(x, y, w, h); }
  }
  function wall(x, y, w, h) {
    X.fillStyle = C.wall; X.fillRect(x, y, w, h);
    X.strokeStyle = C.wallDk; X.lineWidth = 2; X.beginPath();
    for (let yy = y + 20; yy < y + h; yy += 20) { X.moveTo(x, yy); X.lineTo(x + w, yy); }
    for (let yy = y, r = 0; yy < y + h; yy += 20, r++) for (let xx = x + (r % 2 ? 20 : 0); xx < x + w; xx += 40) { X.moveTo(xx, yy); X.lineTo(xx, Math.min(yy + 20, y + h)); }
    X.stroke();
    X.fillStyle = C.wallHi; X.fillRect(x, y, w, 3);
  }
  function pillar(x, y, w, h) {
    shadow(x + w / 2 + 6, y + h / 2 + 8, w * .6, h * .55, .2);
    X.fillStyle = C.stone; X.fillRect(x, y, w, h); X.fillStyle = C.stoneDk; X.fillRect(x, y + h - 8, w, 8);
    X.strokeStyle = C.navy; X.lineWidth = 2; X.strokeRect(x, y, w, h);
  }
  function shadow(x, y, rx, ry, a = .22) { X.fillStyle = `rgba(40,30,20,${a})`; X.beginPath(); X.ellipse(x, y, rx, ry, 0, 0, TAU); X.fill(); }
  // col tints the disc so several players can share a scene (P1 blue, P2 green, P3 purple)
  function player(x, y, ang = 0, s = 1, a = 1, col = C.player) {
    X.save(); X.globalAlpha *= a;
    shadow(x + 3, y + 5, 19 * s, 15 * s, .25);
    X.translate(x, y); X.scale(s, s);
    X.fillStyle = col; X.strokeStyle = '#fff'; X.lineWidth = 3.5;
    X.beginPath(); X.arc(0, 0, 18, 0, TAU); X.fill(); X.stroke();
    X.strokeStyle = C.navy; X.lineWidth = 1.5; X.beginPath(); X.arc(0, 0, 20.5, 0, TAU); X.stroke();
    X.rotate(ang + Math.PI / 2);
    X.fillStyle = '#fff'; X.beginPath(); X.moveTo(0, -11); X.lineTo(9.5, 7); X.lineTo(-9.5, 7); X.closePath(); X.fill();
    X.fillStyle = '#9fdcf3'; X.beginPath(); X.moveTo(0, 0); X.lineTo(5, 7); X.lineTo(-5, 7); X.closePath(); X.fill();
    X.restore();
  }
  // a hostile disc: r radius, ang facing, col fill; mark draws an icon inside ('horns', 'eye', 'shield', 'staff', 'scope')
  function foe(x, y, r, ang = Math.PI, col = C.red, o = {}) {
    X.save(); X.globalAlpha *= o.a ?? 1;
    shadow(x + 4, y + 6, r * 1.05, r * .85, .25);
    X.translate(x, y);
    X.fillStyle = col; X.strokeStyle = o.edge || C.redDk; X.lineWidth = 3.5;
    X.beginPath(); X.arc(0, 0, r, 0, TAU); X.fill(); X.stroke();
    X.rotate(ang);
    // facing: a dark wedge on the front edge
    X.fillStyle = 'rgba(21,32,68,.75)'; X.beginPath(); X.moveTo(r * .95, 0); X.lineTo(r * .35, -r * .38); X.lineTo(r * .35, r * .38); X.closePath(); X.fill();
    if (o.mark === 'horns') { X.fillStyle = '#fff2d8'; [-1, 1].forEach(sg => { X.beginPath(); X.moveTo(r * .2, sg * r * .55); X.lineTo(r * .75, sg * r * 1.05); X.lineTo(r * .45, sg * r * .4); X.fill(); }); }
    if (o.mark === 'shield') { X.strokeStyle = '#e8e2cf'; X.lineWidth = r * .32; X.beginPath(); X.arc(0, 0, r * 1.18, -.85, .85); X.stroke(); X.strokeStyle = C.navy; X.lineWidth = 2; X.stroke(); }
    if (o.mark === 'scope') { X.fillStyle = C.navy; X.fillRect(r * .3, -3, r * 1.3, 6); X.fillStyle = C.gold; X.beginPath(); X.arc(r * 1.6, 0, 4, 0, TAU); X.fill(); }
    if (o.mark === 'staff') { X.strokeStyle = C.gold; X.lineWidth = 4; X.beginPath(); X.moveTo(0, r * .2); X.lineTo(r * 1.3, r * .7); X.stroke(); X.fillStyle = '#e0c7ff'; X.beginPath(); X.arc(r * 1.35, r * .72, 6, 0, TAU); X.fill(); }
    X.restore();
    if (o.hp != null) hp(x, y - r - 14, Math.max(36, r * 1.6), o.hp, o.hpMax);
  }
  function hp(x, y, w, v, max) {
    X.fillStyle = 'rgba(21,32,68,.75)'; X.fillRect(x - w / 2 - 2, y - 5, w + 4, 10);
    X.fillStyle = '#5a1f1c'; X.fillRect(x - w / 2, y - 3, w, 6);
    X.fillStyle = C.red; X.fillRect(x - w / 2, y - 3, w * clamp(v / max), 6);
    if (max > 1 && max < 16) { X.fillStyle = 'rgba(21,32,68,.8)'; for (let i = 1; i < max; i++) X.fillRect(x - w / 2 + w * i / max - .75, y - 3, 1.5, 6); }
  }
  function zone(x, y, r, a = 1, col = '229,50,45') {
    if (r <= 0 || a <= 0) return;
    X.fillStyle = `rgba(${col},${.13 * a})`; X.beginPath(); X.arc(x, y, r, 0, TAU); X.fill();
    X.setLineDash([10, 8]); X.strokeStyle = `rgba(${col},${.8 * a})`; X.lineWidth = 3; X.stroke(); X.setLineDash([]);
  }
  function cone(x, y, ang, half, range, a = 1, col = '229,50,45') {
    if (range <= 0 || a <= 0) return;
    X.fillStyle = `rgba(${col},${.14 * a})`; X.beginPath(); X.moveTo(x, y); X.arc(x, y, range, ang - half, ang + half); X.closePath(); X.fill();
    X.setLineDash([10, 8]); X.strokeStyle = `rgba(${col},${.75 * a})`; X.lineWidth = 2.5; X.stroke(); X.setLineDash([]);
  }
  function tracer(x0, y0, x1, y1, a = 1, col = C.gold, w = 4) {
    if (a <= 0) return;
    X.save(); X.globalAlpha *= a; X.strokeStyle = col; X.lineWidth = w; X.lineCap = 'round';
    X.beginPath(); X.moveTo(x0, y0); X.lineTo(x1, y1); X.stroke(); X.restore();
  }
  function laser(x0, y0, x1, y1, a = 1) {
    if (a <= 0) return;
    X.save(); X.globalAlpha *= a; X.setLineDash([12, 8]); X.strokeStyle = C.red; X.lineWidth = 2.5;
    X.beginPath(); X.moveTo(x0, y0); X.lineTo(x1, y1); X.stroke(); X.restore();
  }
  function beam(x0, y0, x1, y1, t, a = 1) {
    if (a <= 0) return;
    X.save(); X.globalAlpha *= a; X.strokeStyle = 'rgba(138,79,214,.85)'; X.lineWidth = 5; X.setLineDash([6, 10]); X.lineDashOffset = -t * 60;
    X.beginPath(); X.moveTo(x0, y0); X.lineTo(x1, y1); X.stroke(); X.restore();
  }
  function bubble(x, y, r, t, a = 1) {
    if (a <= 0) return;
    X.save(); X.globalAlpha *= a;
    X.fillStyle = 'rgba(87,182,255,.18)'; X.strokeStyle = 'rgba(60,140,230,.9)'; X.lineWidth = 3;
    X.beginPath(); X.arc(x, y, r + 2 * Math.sin(t * 6), 0, TAU); X.fill(); X.stroke(); X.restore();
  }
  function flash(x, y, r, a) {
    if (a <= 0) return;
    const g = X.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,250,220,${a})`); g.addColorStop(.45, `rgba(255,185,81,${.8 * a})`); g.addColorStop(1, 'rgba(255,120,40,0)');
    X.fillStyle = g; X.beginPath(); X.arc(x, y, r, 0, TAU); X.fill();
  }
  function poof(x, y, age, r = 30) {
    if (age < 0 || age > .8) return;
    const k = age / .8;
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, d = r * ease(k) * 1.4; X.fillStyle = `rgba(150,135,110,${.55 * (1 - k)})`; X.beginPath(); X.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * .8, 9 + 12 * k, 0, TAU); X.fill(); }
  }
  function flag(x, y) {
    X.fillStyle = C.navy; X.fillRect(x - 3, y - 50, 6, 60);
    X.fillStyle = C.gold; X.strokeStyle = C.navy; X.lineWidth = 2; X.beginPath(); X.moveTo(x + 3, y - 50); X.lineTo(x + 44, y - 38); X.lineTo(x + 3, y - 26); X.closePath(); X.fill(); X.stroke();
    X.fillStyle = 'rgba(255,185,81,.25)'; X.beginPath(); X.ellipse(x, y + 10, 34, 14, 0, 0, TAU); X.fill();
  }
  function pad(x, y, text) {
    X.fillStyle = 'rgba(85,98,235,.18)'; X.strokeStyle = C.blue; X.lineWidth = 2; X.setLineDash([6, 6]);
    X.beginPath(); X.arc(x, y, 30, 0, TAU); X.fill(); X.stroke(); X.setLineDash([]);
    if (text) label(text, x, y + 50, 'center', C.blue, 15);
  }
  function label(text, x, y, align = 'center', col = C.ink, size = 16, bg = 'rgba(255,252,244,.9)') {
    X.font = `600 ${size}px Jost, sans-serif`; X.textAlign = align; X.textBaseline = 'middle';
    const w = X.measureText(text).width, bx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    X.fillStyle = bg; X.beginPath(); X.roundRect(bx - 8, y - size * .8, w + 16, size * 1.6, size * .8); X.fill();
    X.fillStyle = col; X.fillText(text, x, y + 1);
  }
  function popText(text, x, y, col, a) {
    if (a <= 0) return;
    X.save(); X.globalAlpha = clamp(a); X.font = '700 24px Montserrat, Jost, sans-serif'; X.textAlign = 'center'; X.textBaseline = 'middle';
    X.lineWidth = 6; X.strokeStyle = '#fffaf0'; X.strokeText(text, x, y); X.fillStyle = col; X.fillText(text, x, y); X.restore();
  }
  function trail(pts, col = C.player, a = 1, w = 4) {
    if (pts.length < 2) return;
    X.save(); X.globalAlpha *= a; X.strokeStyle = col; X.lineWidth = w; X.setLineDash([2, 9]); X.lineCap = 'round'; X.lineJoin = 'round';
    X.beginPath(); pts.forEach(([x, y], i) => i ? X.lineTo(x, y) : X.moveTo(x, y)); X.stroke(); X.restore();
  }
  function stamp(text, x, y, col, a = 1, size = 34) {
    if (a <= 0) return;
    X.save(); X.globalAlpha = clamp(a); X.translate(x, y); X.rotate(-.06);
    X.font = `800 ${size}px Montserrat, Jost, sans-serif`; X.textAlign = 'center'; X.textBaseline = 'middle';
    const w = X.measureText(text).width + 36;
    X.fillStyle = 'rgba(255,252,244,.94)'; X.strokeStyle = col; X.lineWidth = 4;
    X.beginPath(); X.roundRect(-w / 2, -size * .85, w, size * 1.7, 10); X.fill(); X.stroke();
    X.fillStyle = col; X.fillText(text, 0, 2); X.restore();
  }

  // a path made of timed segments: go to a point, wait, aim. at(t) gives position and facing.
  function Path(start, speed) {
    const segs = []; let t = 0, pos = start.slice(), face = 0;
    const api = {
      get t() { return t; }, get pos() { return pos.slice(); },
      go(x, y, spd = speed) {
        const d = Math.hypot(x - pos[0], y - pos[1]); if (d < .5) return api;
        const dt = d / spd; face = Math.atan2(y - pos[1], x - pos[0]);
        segs.push({ t0: t, t1: t + dt, a: pos, b: [x, y], face }); t += dt; pos = [x, y]; return api;
      },
      wait(d, aim) { const f = aim ? Math.atan2(aim[1] - pos[1], aim[0] - pos[0]) : face; face = f; segs.push({ t0: t, t1: t + d, a: pos, b: pos, face: f }); t += d; return api; },
      at(tt) {
        if (!segs.length) return { x: start[0], y: start[1], face: 0, moving: false };
        const s = segs.find(s => tt < s.t1) || segs.at(-1), k = clamp((tt - s.t0) / (s.t1 - s.t0 || 1));
        return { x: lerp(s.a[0], s.b[0], k), y: lerp(s.a[1], s.b[1], k), face: s.face, moving: s.a !== s.b };
      },
      trail(tt, step = .05) { const out = []; for (let x = 0; x <= Math.min(tt, t); x += step) { const p = api.at(x); out.push([p.x, p.y]); } const p = api.at(Math.min(tt, t)); out.push([p.x, p.y]); return out; },
      segs,
    };
    return api;
  }

  window.TD = { C, TAU, use, clamp, lerp, ease, floor, wall, pillar, shadow, player, foe, hp, zone, cone, tracer, laser, beam, bubble, flash, poof, flag, pad, label, popText, trail, stamp, Path };
})();
