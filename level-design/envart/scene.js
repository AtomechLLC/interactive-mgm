/* Street-scene drawing kit for the environment art deck. Everything is drawn in code; no image files.
   Each piece takes a detail level so one street can be shown at any point in an art pass:
     0 blockout (grey boxes on a grid)   1 big shapes and flat colour   2 medium detail   3 small detail
   The light comes from the upper left in every scene.
   Figures are drawn facing right and mirrored with face: -1, so a figure always looks the way it walks or aims. */
(function () {
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const K = { sat: 1 };                                         // deck-wide saturation multiplier (the colour slide turns it)
  const hsl = (h, s, l, a = 1) => `hsla(${h},${clamp(s * K.sat, 0, 100)}%,${clamp(l, 0, 100)}%,${a})`;
  const INK = '#1b2350';
  const BO = { wall: '#c3c8d3', wallDk: '#a3a9b8', line: 'rgba(255,255,255,.42)', floor: '#b1b7c4', floorDk: '#9299a9', void: '#2b3158', prop: '#d7b072', propDk: '#b98f4f' };

  function grid(g, x, y, w, h, step = 30) {
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.strokeStyle = BO.line; g.lineWidth = 1.5; g.beginPath();
    for (let xx = x + step; xx < x + w; xx += step) { g.moveTo(xx, y); g.lineTo(xx, y + h); }
    for (let yy = y + h - step; yy > y; yy -= step) { g.moveTo(x, yy); g.lineTo(x + w, yy); }
    g.stroke(); g.restore();
  }
  function shadow(g, x, y, rx, ry = rx * .22, a = .22) { g.fillStyle = `rgba(30,26,50,${a})`; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); }

  /* ---------- sky and ground ---------- */
  function sky(g, W, gy, d = 3, o = {}) {
    if (d < 1) { g.fillStyle = '#dfe3ec'; g.fillRect(0, 0, W, gy); return; }
    const k = g.createLinearGradient(0, 0, 0, gy); k.addColorStop(0, hsl(206, 62, o.dark ? 52 : 76)); k.addColorStop(1, hsl(38, 70, o.dark ? 74 : 90));
    g.fillStyle = k; g.fillRect(0, 0, W, gy);
    if (d < 2) return;
    const r = rng(o.seed || 77);
    g.fillStyle = 'rgba(255,255,255,.75)';
    for (let i = 0; i < 4; i++) { const cx = 80 + r() * (W - 160), cy = 22 + r() * 60, s = 26 + r() * 22; g.beginPath(); g.ellipse(cx, cy, s * 2.1, s * .42, 0, 0, TAU); g.ellipse(cx - s * .7, cy - s * .28, s * .9, s * .4, 0, 0, TAU); g.ellipse(cx + s * .5, cy - s * .36, s * 1.1, s * .46, 0, 0, TAU); g.fill(); }
    if (o.city === false) return;
    g.fillStyle = hsl(215, 26, o.dark ? 60 : 74, .8);            // far roofline
    for (let x = -20; x < W;) { const w = 50 + r() * 90, h = 70 + r() * 150; g.fillRect(x, gy - h, w, h); if (r() < .4) { g.beginPath(); g.moveTo(x, gy - h); g.lineTo(x + w / 2, gy - h - 26); g.lineTo(x + w, gy - h); g.fill(); } x += w + r() * 14; }
  }
  // o.l lightness, o.hue, o.s; the pavement runs from gy to H
  function ground(g, W, H, gy, d = 3, o = {}) {
    const hue = o.hue ?? 32, s = o.s ?? 16, l = o.l ?? 58, r = rng(o.seed || 9), vx = W / 2, vy = gy - 230;
    const rows = [0, .14, .34, .62, 1].map(k => gy + (H - gy) * k);
    if (d < 1) {
      g.fillStyle = BO.floor; g.fillRect(0, gy, W, H - gy); g.strokeStyle = BO.line; g.lineWidth = 1.5; g.beginPath();
      rows.forEach(y => { g.moveTo(0, y); g.lineTo(W, y); });
      for (let i = -14; i <= 14; i++) { const x0 = vx + i * 46; g.moveTo(x0, gy); g.lineTo(vx + (x0 - vx) * (H - vy) / (gy - vy), H); }
      g.stroke(); g.fillStyle = BO.floorDk; g.fillRect(0, gy, W, 4); return;
    }
    const k = g.createLinearGradient(0, gy, 0, H); k.addColorStop(0, hsl(hue, s, l - 5)); k.addColorStop(1, hsl(hue, s, l + 3));
    g.fillStyle = k; g.fillRect(0, gy, W, H - gy);
    if (d >= 2) {
      const xs = i => y => vx + (vx + i * 92 - vx) * (y - vy) / (gy - vy);
      if (d >= 3) for (let j = 0; j < 4; j++) for (let i = -8; i < 8; i++) if (r() < .5) { const a = xs(i - .5 + (j % 2) * .5), b = xs(i + .5 + (j % 2) * .5); g.fillStyle = hsl(hue, s, l + (r() - .5) * (o.noise ?? 7)); g.beginPath(); g.moveTo(a(rows[j]), rows[j]); g.lineTo(b(rows[j]), rows[j]); g.lineTo(b(rows[j + 1]), rows[j + 1]); g.lineTo(a(rows[j + 1]), rows[j + 1]); g.fill(); }
      g.strokeStyle = hsl(hue, s, l - 13, .55); g.lineWidth = 1.5; g.beginPath();
      rows.slice(1).forEach(y => { g.moveTo(0, y); g.lineTo(W, y); });
      for (let j = 0; j < 4; j++) for (let i = -9; i <= 9; i++) { const f = xs(i + (j % 2) * .5); g.moveTo(f(rows[j]), rows[j]); g.lineTo(f(rows[j + 1]), rows[j + 1]); }
      g.stroke();
    }
    g.fillStyle = hsl(hue, s, l - 18); g.fillRect(0, gy - 1, W, 5);                      // where wall meets pavement
    const ao = g.createLinearGradient(0, gy, 0, gy + 34); ao.addColorStop(0, 'rgba(30,26,50,.22)'); ao.addColorStop(1, 'rgba(30,26,50,0)'); g.fillStyle = ao; g.fillRect(0, gy + 4, W, 34);
  }

  /* ---------- openings ---------- */
  function win(g, x, y, w, h, d, o = {}) {
    if (d < 1) { g.fillStyle = BO.wallDk; g.fillRect(x, y, w, h); grid(g, x, y, w, h, 15); return; }
    g.fillStyle = hsl(216, 34, o.glass ?? 30); g.fillRect(x, y, w, h);
    if (d < 2) return;
    if (d >= 3) { const k = g.createLinearGradient(x, y, x + w, y + h); k.addColorStop(0, hsl(205, 46, 52)); k.addColorStop(1, hsl(222, 40, 24)); g.fillStyle = k; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.moveTo(x + w * .15, y + h); g.lineTo(x + w * .6, y); g.lineTo(x + w * .82, y); g.lineTo(x + w * .37, y + h); g.fill(); }
    const fr = hsl(o.fh ?? 40, 30, o.fl ?? 90);
    g.strokeStyle = fr; g.lineWidth = 4; g.strokeRect(x, y, w, h); g.lineWidth = 3; g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.moveTo(x, y + h * .42); g.lineTo(x + w, y + h * .42); g.stroke();
    g.fillStyle = hsl(34, 16, o.sl ?? 72); g.fillRect(x - 7, y + h + 2, w + 14, 7); g.fillStyle = 'rgba(30,26,50,.18)'; g.fillRect(x - 5, y + h + 9, w + 10, 4);
    if (o.shut) {                                                                          // shutters
      for (const sx of [x - 18, x + w + 3]) { g.fillStyle = hsl(o.shut[0], o.shut[1], o.shut[2]); g.fillRect(sx, y - 2, 15, h + 4); if (d >= 3) { g.strokeStyle = hsl(o.shut[0], o.shut[1], o.shut[2] - 12); g.lineWidth = 1.5; g.beginPath(); for (let yy = y + 5; yy < y + h; yy += 7) { g.moveTo(sx + 2, yy); g.lineTo(sx + 13, yy); } g.stroke(); } }
    }
    if (d >= 3 && o.box) {                                                                 // flower box
      g.fillStyle = hsl(24, 34, 40); g.fillRect(x - 5, y + h - 4, w + 10, 11);
      const r = rng(o.box); for (let i = 0; i < 9; i++) { g.fillStyle = hsl(112 + r() * 20, 36, 34 + r() * 12); g.beginPath(); g.arc(x - 2 + r() * (w + 4), y + h - 6 - r() * 7, 6 + r() * 3, 0, TAU); g.fill(); }
      for (let i = 0; i < 5; i++) { g.fillStyle = hsl(o.fl2 ?? 48, 80, 66); g.beginPath(); g.arc(x + r() * w, y + h - 9 - r() * 7, 2.6, 0, TAU); g.fill(); }
    }
  }
  // kind: open | shut | boarded.  In a blockout a shut door is not there at all: it is wall.
  function door(g, x, gy, w, h, d, o = {}) {
    const kind = o.kind || 'shut', y = gy - h, arch = d >= 2 && o.arch !== false, swing = o.swing || 0;
    const shape = () => { g.beginPath(); if (arch) { g.moveTo(x, gy); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, gy); } else g.rect(x, y, w, h); g.closePath(); };
    if (d < 1) { if (kind !== 'open') return; g.fillStyle = BO.void; g.fillRect(x, y, w, h); return; }
    if (d >= 2) { g.save(); g.lineWidth = 16; g.strokeStyle = o.frame || hsl(34, 18, 80); g.lineJoin = 'round'; shape(); g.stroke(); g.restore(); }
    const interior = () => {
      g.save(); shape(); g.clip(); g.fillStyle = '#1d2147'; g.fillRect(x, y, w, h);
      if (d >= 2) { const k = g.createRadialGradient(x + w / 2, gy - 10, 4, x + w / 2, gy - 10, h * .9); k.addColorStop(0, 'rgba(255,214,140,.62)'); k.addColorStop(1, 'rgba(255,214,140,0)'); g.fillStyle = k; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(255,226,170,.5)'; g.beginPath(); g.moveTo(x + 6, gy); g.lineTo(x + w - 6, gy); g.lineTo(x + w * .68, gy - 24); g.lineTo(x + w * .32, gy - 24); g.fill(); }
      g.restore();
    };
    if (kind === 'open' || swing > 0) interior();
    if (kind !== 'open') {
      const c = o.col || [24, 38, 34], ww = w * (1 - swing * .78);
      g.save(); shape(); g.clip();
      g.fillStyle = hsl(c[0], c[1], c[2]); g.fillRect(x, y, ww, h);
      if (d >= 2) {
        g.strokeStyle = hsl(c[0], c[1], c[2] - 10); g.lineWidth = 2; g.beginPath(); g.moveTo(x + ww / 2, y); g.lineTo(x + ww / 2, gy); g.stroke();
        g.fillStyle = hsl(c[0], c[1], c[2] + 7);[[.1, .2, .32, .3], [.58, .2, .32, .3], [.1, .58, .32, .34], [.58, .58, .32, .34]].forEach(([a, b, cw, ch]) => g.fillRect(x + ww * a, y + h * b, ww * cw, h * ch));
        g.fillStyle = hsl(44, 70, 62); g.beginPath(); g.arc(x + ww * .56 + (swing ? -4 : 0), gy - h * .44, 3.5, 0, TAU); g.fill();
      }
      if (swing > 0) { g.fillStyle = 'rgba(20,20,50,.25)'; g.fillRect(x + ww, y, 5, h); }
      g.restore();
      if (kind === 'boarded') {
        g.save(); g.lineCap = 'butt'; const bc = hsl(30, 30, 50), bd = hsl(30, 30, 36);
        [[-6, .26, w + 6, .2], [-4, .5, w + 8, .56], [-8, .78, w + 4, .7]].forEach(([x0, a, x1, b]) => { g.strokeStyle = bd; g.lineWidth = 15; g.beginPath(); g.moveTo(x + x0, y + h * a + 2); g.lineTo(x + x1, y + h * b + 2); g.stroke(); g.strokeStyle = bc; g.lineWidth = 12; g.beginPath(); g.moveTo(x + x0, y + h * a); g.lineTo(x + x1, y + h * b); g.stroke(); });
        if (d >= 3) { g.fillStyle = INK;[[2, .26], [w - 4, .21], [2, .51], [w - 2, .555], [0, .775], [w - 6, .71]].forEach(([a, b]) => { g.beginPath(); g.arc(x + a, y + h * b, 2, 0, TAU); g.fill(); }); }
        g.restore();
      }
    }
    if (d >= 2) { g.fillStyle = hsl(34, 14, 66); g.fillRect(x - 12, gy - 5, w + 24, 6); }       // step
  }
  function awning(g, x, y, w, c1, c2, d) {
    const dp = 30, out = 12;
    g.save(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(x + w + out, y + dp); g.lineTo(x - out, y + dp); g.closePath(); g.fillStyle = c1; g.fill();
    if (d >= 2) { g.clip(); g.fillStyle = c2; const n = Math.round(w / 22); for (let i = 0; i < n; i += 2) { const a = i / n, b = (i + 1) / n; g.beginPath(); g.moveTo(x + w * a, y); g.lineTo(x + w * b, y); g.lineTo(x - out + (w + 2 * out) * b, y + dp); g.lineTo(x - out + (w + 2 * out) * a, y + dp); g.fill(); } }
    g.restore();
    g.fillStyle = 'rgba(30,26,50,.2)'; g.fillRect(x - out, y + dp, w + 2 * out, 5);
  }

  /* ---------- ivy: leaf blobs that grow down from the roof and swallow the facade ---------- */
  function ivy(g, x, y, w, h, cover, seed = 5) {
    if (cover <= 0) return;
    const r = rng(seed), n = Math.round(w * h / 150 * cover), reach = h * Math.min(1, cover * 1.15), L = [];
    for (let i = 0; i < n; i++) { const t = Math.pow(r(), 1.25), px = x - 6 + r() * (w + 12); L.push([px, y - 8 + t * reach + Math.sin(px * .04 + seed) * 16 * (1 - cover), 9 + r() * 10, r()]); }
    g.save(); g.beginPath(); g.rect(x - 14, y - 26, w + 28, h + 30); g.clip();
    g.fillStyle = 'rgba(20,40,30,.28)'; L.forEach(([a, b, c]) => { g.beginPath(); g.arc(a + 3, b + 5, c, 0, TAU); g.fill(); });
    g.fillStyle = hsl(128, 34, 25); L.forEach(([a, b, c]) => { g.beginPath(); g.arc(a, b, c, 0, TAU); g.fill(); });
    L.forEach(([a, b, c, q]) => { g.fillStyle = hsl(112 + q * 22, 36, 32 + q * 9); g.beginPath(); g.arc(a - 2, b - 3, c * .72, 0, TAU); g.fill(); });
    L.forEach(([a, b, c, q]) => { if (q > .45) { g.fillStyle = hsl(96 + q * 20, 44, 46 + q * 8); g.beginPath(); g.ellipse(a - c * .3, b - c * .4, c * .36, c * .22, -0.6, 0, TAU); g.fill(); } });
    g.restore();
  }

  /* ---------- a building ----------
     b: x, w, h (wall height), hue, s, l, floors, bays, dw (wall detail), dop (openings detail), roof: flat | tile,
        door: { bay, kind, w, h, col, frame, swing }, shut: [h, s, l] shutter colour, awning: [c1, c2], noise 0..1 (brick contrast),
        ivy 0..1, seed, lamp, glass */
  function building(g, b, gy) {
    const { x, w, h } = b, y = gy - h, dw = b.dw ?? 3, dop = b.dop ?? dw, hue = b.hue ?? 36, s = b.s ?? 30, l = b.l ?? 76, r = rng(b.seed || 3);
    const floors = b.floors || Math.max(1, Math.round((h - 150) / 104) + 1), bays = b.bays || Math.max(1, Math.round(w / 92)), bw = w / bays;
    if (dw < 1) { g.fillStyle = BO.wall; g.fillRect(x, y, w, h); grid(g, x, y, w, h); g.fillStyle = BO.wallDk; g.fillRect(x + w - 5, y, 5, h); g.fillRect(x, y, w, 4); }
    else {
      g.fillStyle = hsl(hue, s, l); g.fillRect(x, y, w, h);
      if (b.noise > 0) {                                                                  // exposed brick, each brick its own value
        const n = b.noise, bh = 15, bl = 34;
        for (let yy = y, row = 0; yy < gy; yy += bh, row++) for (let xx = x - (row % 2) * bl / 2; xx < x + w; xx += bl) { const v = (r() - .5) * 2; g.fillStyle = hsl(hue + v * 8 * n, s + n * 10, l + v * n * 26 - n * 6); const a = Math.max(x, xx + 1), e = Math.min(x + w, xx + bl - 1); if (e > a) g.fillRect(a, yy + 1, e - a, bh - 2); }
      } else if (dw >= 3) {                                                               // plaster with a few brick patches and stains
        for (let i = 0; i < Math.round(w * h / 26000); i++) { const px = x + 14 + r() * (w - 80), py = y + 30 + r() * (h - 90); for (let j = 0; j < 3; j++) for (let k2 = 0; k2 < 2 + (j % 2); k2++) { g.fillStyle = hsl(hue - 14, s + 8, l - 10 - r() * 5); g.fillRect(px + k2 * 24 + (j % 2) * 12, py + j * 11, 22, 9); } }
        g.strokeStyle = hsl(hue, s, l - 12, .7); g.lineWidth = 1.2; for (let i = 0; i < 2; i++) { let cx = x + 20 + r() * (w - 40), cy = y + 10; g.beginPath(); g.moveTo(cx, cy); for (let j = 0; j < 4; j++) { cx += (r() - .5) * 16; cy += 8 + r() * 12; g.lineTo(cx, cy); } g.stroke(); }
      }
      const k = g.createLinearGradient(x, 0, x + w, 0); k.addColorStop(0, 'rgba(255,255,255,.1)'); k.addColorStop(1, 'rgba(30,26,60,.1)'); g.fillStyle = k; g.fillRect(x, y, w, h);
      g.fillStyle = hsl(hue, s * .6, l - 16); g.fillRect(x, gy - 24, w, 24);                // plinth
      if (dw >= 2) { g.fillStyle = hsl(hue, s * .6, l - 9); g.fillRect(x, gy - 27, w, 4); g.fillStyle = hsl(hue, s * .7, l - 8); for (let f = 1; f < floors; f++) g.fillRect(x, gy - 150 - (f - 1) * 104 - 5, w, 5); }
      if (b.roof === 'tile') {
        g.fillStyle = hsl(14, 46, 46); g.beginPath(); g.moveTo(x - 12, y); g.lineTo(x + 16, y - 30); g.lineTo(x + w - 16, y - 30); g.lineTo(x + w + 12, y); g.fill();
        if (dw >= 2) { g.strokeStyle = hsl(14, 46, 37); g.lineWidth = 1.5; g.beginPath(); for (let xx = x; xx < x + w; xx += 13) { g.moveTo(xx, y); g.lineTo(lerp(xx, x + w / 2, .1), y - 30); } g.stroke(); g.fillStyle = hsl(14, 40, 58); g.fillRect(x + 16, y - 32, w - 32, 4); }
        g.fillStyle = 'rgba(30,26,50,.2)'; g.fillRect(x, y, w, 7);
      } else {
        g.fillStyle = hsl(hue, s * .7, l + 8); g.fillRect(x - 6, y - 10, w + 12, 12);
        if (dw >= 2) { g.fillStyle = hsl(hue, s * .7, l - 4); g.fillRect(x - 3, y + 2, w + 6, 5); g.fillStyle = hsl(hue, s * .7, l + 12); g.fillRect(x - 6, y - 10, w + 12, 3); }
        g.fillStyle = 'rgba(30,26,50,.14)'; g.fillRect(x, y + 7, w, 6);
      }
    }
    // windows: every bay on the upper floors, and on the ground floor wherever there is no door
    const dr = b.door, dbay = dr ? dr.bay ?? 0 : -1, ww = Math.min(46, bw * .46), wh = 62;
    for (let f = 0; f < floors; f++) for (let i = 0; i < bays; i++) {
      if (f === 0 && i === dbay) continue;
      const cx = x + bw * (i + .5), wy = f === 0 ? gy - 118 : gy - 150 - (f - 1) * 104 - 86;
      if (wy < y + 12) continue;
      if (dw < 1 && dop < 1) continue;
      win(g, cx - ww / 2, wy, ww, wh, dop, { shut: b.shut && bw > 74 ? b.shut : null, box: dop >= 3 && b.boxes && (i + f) % 2 === 0 ? b.seed * 7 + i + f * 3 : 0, glass: b.glass });
    }
    if (dr) {
      const dwid = dr.w || 58, dh = dr.h || 112, cx = x + bw * (dbay + .5);
      door(g, cx - dwid / 2, gy, dwid, dh, dop, dr);
      if (b.awning && dop >= 1 && dw >= 1) awning(g, cx - dwid / 2 - 14, gy - dh - 34 - (dop >= 2 ? dwid / 2 * 0 : 0), dwid + 28, b.awning[0], b.awning[1], dop);
      if (b.lamp && dop >= 3) { const lx = cx + dwid / 2 + 22, ly = gy - dh + 6; g.fillStyle = INK; g.fillRect(lx - 1.5, ly - 12, 3, 12); g.fillStyle = hsl(44, 90, 70); g.beginPath(); g.roundRect(lx - 6, ly, 12, 16, 3); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.5; g.stroke(); const k = g.createRadialGradient(lx, ly + 8, 2, lx, ly + 8, 46); k.addColorStop(0, 'rgba(255,220,140,.4)'); k.addColorStop(1, 'rgba(255,220,140,0)'); g.fillStyle = k; g.fillRect(lx - 46, ly - 38, 92, 92); }
    }
    if (dw >= 2 && b.pipe) { const px = x + w - 12; g.fillStyle = hsl(210, 10, 50); g.fillRect(px, y + 4, 6, h - 4); g.fillStyle = hsl(210, 10, 38); for (let yy = y + 40; yy < gy; yy += 90) g.fillRect(px - 2, yy, 10, 5); }
    if (b.ivy > 0 && dw >= 1) ivy(g, x, y, w, h, b.ivy, (b.seed || 3) * 13);
  }

  /* ---------- props: x is the centre, gy the ground line under them ---------- */
  function crate(g, x, gy, s, d, o = {}) {
    const w = 62 * s, h = (o.h || 58) * s, x0 = x - w / 2, y = gy - h;
    if (d >= 1) shadow(g, x + 6, gy + 3, w * .62);
    if (d < 1) { g.fillStyle = BO.prop; g.fillRect(x0, y, w, h); grid(g, x0, y, w, h, 15.5 * s); g.fillStyle = BO.propDk; g.fillRect(x0, y, w, 4); g.fillRect(x0 + w - 4, y, 4, h); return; }
    const c = o.col || [32, 40, 52];
    g.fillStyle = hsl(c[0], c[1], c[2]); g.fillRect(x0, y, w, h); g.fillStyle = hsl(c[0], c[1], c[2] + 10); g.fillRect(x0, y, w, 6 * s);
    if (d >= 2) {
      g.strokeStyle = hsl(c[0], c[1], c[2] - 15); g.lineWidth = 7 * s; g.strokeRect(x0 + 3.5 * s, y + 3.5 * s, w - 7 * s, h - 7 * s);
      g.lineWidth = 6 * s; g.beginPath(); g.moveTo(x0 + 6 * s, gy - 6 * s); g.lineTo(x0 + w - 6 * s, y + 6 * s); g.stroke();
      if (d >= 3) { g.strokeStyle = hsl(c[0], c[1], c[2] - 7); g.lineWidth = 1.2; g.beginPath(); for (let i = 1; i < 4; i++) { g.moveTo(x0 + 8 * s, y + h * i / 4); g.lineTo(x0 + w - 8 * s, y + h * i / 4); } g.stroke(); g.fillStyle = hsl(c[0], 20, 24);[[5, 5], [w / s - 5, 5], [5, h / s - 5], [w / s - 5, h / s - 5]].forEach(([a, b]) => { g.beginPath(); g.arc(x0 + a * s, y + b * s, 1.6 * s, 0, TAU); g.fill(); }); }
    }
    g.fillStyle = 'rgba(30,26,60,.12)'; g.fillRect(x0 + w * .72, y, w * .28, h);
  }
  // o.col [h,s,l]; o.hazard paints the flame diamond of an explosive barrel
  function barrel(g, x, gy, s, d, o = {}) {
    const w = 40 * s, h = 60 * s, x0 = x - w / 2, y = gy - h, c = o.col || [205, 18, 46];
    if (d >= 1) shadow(g, x + 5, gy + 2, w * .66);
    if (d < 1) { g.fillStyle = BO.prop; g.fillRect(x0, y, w, h); grid(g, x0, y, w, h, 13.3 * s); return; }
    g.fillStyle = hsl(c[0], c[1], c[2]); g.beginPath(); g.roundRect(x0, y, w, h, 6 * s); g.fill();
    const k = g.createLinearGradient(x0, 0, x0 + w, 0); k.addColorStop(0, 'rgba(255,255,255,.22)'); k.addColorStop(.35, 'rgba(255,255,255,0)'); k.addColorStop(1, 'rgba(20,20,50,.28)'); g.fillStyle = k; g.beginPath(); g.roundRect(x0, y, w, h, 6 * s); g.fill();
    if (d >= 2) { g.fillStyle = hsl(c[0], c[1], c[2] - 14); for (const f of [.16, .5, .84]) g.fillRect(x0 - 1.5 * s, y + h * f - 2.5 * s, w + 3 * s, 5 * s); g.fillStyle = hsl(c[0], c[1], c[2] + 14); g.beginPath(); g.ellipse(x, y + 3 * s, w / 2 - 2, 4 * s, 0, 0, TAU); g.fill(); }
    if (o.hazard && d >= 2) { g.fillStyle = hsl(46, 90, 62); g.beginPath(); g.moveTo(x, y + h * .22); g.lineTo(x + 11 * s, y + h * .34); g.lineTo(x, y + h * .46); g.lineTo(x - 11 * s, y + h * .34); g.fill(); g.fillStyle = INK; g.beginPath(); g.moveTo(x, y + h * .27); g.quadraticCurveTo(x + 6 * s, y + h * .36, x, y + h * .41); g.quadraticCurveTo(x - 6 * s, y + h * .36, x, y + h * .27); g.fill(); }
  }
  function bush(g, x, y, r0, seed, light = 0) {
    const r = rng(seed), L = []; for (let i = 0; i < 9; i++) L.push([x + (r() - .5) * r0 * 1.7, y - r() * r0 * .9, r0 * (.42 + r() * .3), r()]);
    g.fillStyle = hsl(128, 32, 25 + light); L.forEach(([a, b, c]) => { g.beginPath(); g.arc(a, b, c, 0, TAU); g.fill(); });
    L.forEach(([a, b, c, q]) => { g.fillStyle = hsl(110 + q * 22, 36, 34 + q * 9 + light); g.beginPath(); g.arc(a - 2, b - 3, c * .72, 0, TAU); g.fill(); });
  }
  function planter(g, x, gy, s, d, o = {}) {
    const w = 64 * s, h = 26 * s;
    if (d >= 1) shadow(g, x + 5, gy + 2, w * .6);
    if (d < 1) { g.fillStyle = BO.prop; g.fillRect(x - w / 2, gy - h, w, h); grid(g, x - w / 2, gy - h, w, h, 13 * s); return; }
    if (d >= 2) bush(g, x, gy - h - 2, 26 * s, o.seed || 4);
    g.fillStyle = hsl(28, 20, 62); g.fillRect(x - w / 2, gy - h, w, h); g.fillStyle = hsl(28, 20, 72); g.fillRect(x - w / 2 - 2, gy - h, w + 4, 6 * s); g.fillStyle = 'rgba(30,26,60,.12)'; g.fillRect(x + w * .22, gy - h, w * .28, h);
  }
  function lamp(g, x, gy, s, d) {
    if (d < 1) return;
    shadow(g, x + 3, gy + 2, 14 * s);
    g.fillStyle = hsl(222, 22, 26); g.fillRect(x - 3 * s, gy - 168 * s, 6 * s, 168 * s); g.fillRect(x - 8 * s, gy - 12 * s, 16 * s, 12 * s);
    if (d >= 2) { g.fillRect(x - 3 * s, gy - 170 * s, 30 * s, 5 * s); g.fillStyle = hsl(44, 90, 72); g.beginPath(); g.roundRect(x + 17 * s, gy - 165 * s, 14 * s, 20 * s, 3); g.fill(); g.strokeStyle = hsl(222, 22, 26); g.lineWidth = 2; g.stroke(); }
    if (d >= 3) { const k = g.createRadialGradient(x + 24 * s, gy - 155 * s, 2, x + 24 * s, gy - 155 * s, 60 * s); k.addColorStop(0, 'rgba(255,224,150,.4)'); k.addColorStop(1, 'rgba(255,224,150,0)'); g.fillStyle = k; g.fillRect(x - 40 * s, gy - 220 * s, 130 * s, 130 * s); }
  }
  function poster(g, x, y, w, h, c, d, seed = 1) {
    if (d < 1) return;
    g.fillStyle = 'rgba(30,26,60,.18)'; g.fillRect(x + 2, y + 3, w, h);
    g.fillStyle = hsl(c[0], c[1], c[2]); g.fillRect(x, y, w, h);
    if (d >= 2) { g.fillStyle = hsl(c[0], c[1] * .5, c[2] + 26); g.beginPath(); g.arc(x + w / 2, y + h * .38, w * .26, 0, TAU); g.fill(); g.fillRect(x + w * .16, y + h * .72, w * .68, 3); g.fillRect(x + w * .26, y + h * .82, w * .48, 3); }
  }
  function sign(g, x, y, w, c, d) {
    if (d < 1) return;
    g.fillStyle = INK; g.fillRect(x - 2, y - 14, 3, 14); g.fillRect(x + w - 2, y - 14, 3, 14);
    g.fillStyle = hsl(c[0], c[1], c[2]); g.beginPath(); g.roundRect(x - 6, y, w + 12, 24, 5); g.fill();
    if (d >= 2) { g.fillStyle = hsl(c[0], c[1] * .4, c[2] + 34); g.fillRect(x + 4, y + 8, w - 8, 3); g.fillRect(x + 12, y + 15, w - 24, 3); }
  }
  function bench(g, x, gy, s, d) {
    if (d < 1) return;
    shadow(g, x + 4, gy + 2, 44 * s);
    g.fillStyle = hsl(222, 20, 28); g.fillRect(x - 36 * s, gy - 24 * s, 5 * s, 24 * s); g.fillRect(x + 31 * s, gy - 24 * s, 5 * s, 24 * s);
    g.fillStyle = hsl(28, 38, 42); g.fillRect(x - 42 * s, gy - 28 * s, 84 * s, 7 * s); g.fillRect(x - 40 * s, gy - 52 * s, 80 * s, 6 * s); g.fillRect(x - 40 * s, gy - 42 * s, 80 * s, 6 * s);
  }
  // o.ornate: the over-built version from the hero prop slide
  function dumpster(g, x, gy, s, d, o = {}) {
    const w = 104 * s, h = 62 * s, x0 = x - w / 2, y = gy - h - 8 * s;
    if (d < 1) { g.fillStyle = BO.prop; g.fillRect(x0, y, w, h + 8 * s); grid(g, x0, y, w, h + 8 * s, 13 * s); return; }
    shadow(g, x + 6, gy + 3, w * .58);
    g.fillStyle = hsl(222, 20, 22); g.beginPath(); g.arc(x0 + 16 * s, gy - 7 * s, 7 * s, 0, TAU); g.arc(x0 + w - 16 * s, gy - 7 * s, 7 * s, 0, TAU); g.fill();
    g.fillStyle = hsl(150, 26, 36); g.beginPath(); g.moveTo(x0, y + 10 * s); g.lineTo(x0 + w, y + 10 * s); g.lineTo(x0 + w - 8 * s, y + h); g.lineTo(x0 + 8 * s, y + h); g.fill();
    g.fillStyle = hsl(150, 26, 28); g.beginPath(); g.roundRect(x0 - 4 * s, y, w + 8 * s, 13 * s, 4); g.fill();
    if (d >= 2) { g.fillStyle = hsl(150, 26, 30); for (const f of [.25, .5, .75]) g.fillRect(x0 + w * f - 2, y + 14 * s, 4, h - 16 * s); }
    if (o.ornate) { g.strokeStyle = hsl(44, 80, 60); g.lineWidth = 3; g.beginPath(); g.roundRect(x0 + 12 * s, y + 20 * s, w - 24 * s, h - 30 * s, 6); g.stroke(); g.fillStyle = hsl(44, 80, 60); for (const f of [.2, .5, .8]) { g.beginPath(); g.arc(x0 + w * f, y + 6 * s, 5 * s, 0, TAU); g.fill(); } g.beginPath(); g.moveTo(x, y + 26 * s); g.lineTo(x + 9 * s, y + 38 * s); g.lineTo(x, y + 50 * s); g.lineTo(x - 9 * s, y + 38 * s); g.fill(); }
  }
  function tree(g, x, gy, s, seed = 2, o = {}) {
    const r = rng(seed);
    shadow(g, x + 8 * s, gy + 3 * s, 46 * s, 10 * s, .2);
    g.fillStyle = hsl(24, 30, 30); g.beginPath(); g.moveTo(x - 9 * s, gy); g.lineTo(x - 5 * s, gy - 78 * s); g.lineTo(x + 5 * s, gy - 78 * s); g.lineTo(x + 9 * s, gy); g.fill();
    g.fillStyle = hsl(24, 30, 22); g.beginPath(); g.moveTo(x + 2 * s, gy); g.lineTo(x + 2 * s, gy - 78 * s); g.lineTo(x + 5 * s, gy - 78 * s); g.lineTo(x + 9 * s, gy); g.fill();
    const L = []; for (let i = 0; i < 11; i++) L.push([x + (r() - .5) * 84 * s, gy - 86 * s - r() * 66 * s, (22 + r() * 16) * s, r()]);
    const hu = o.hue ?? 124;
    g.fillStyle = hsl(hu, 34, 24); L.forEach(([a, b, c]) => { g.beginPath(); g.arc(a + 3 * s, b + 5 * s, c, 0, TAU); g.fill(); });
    L.forEach(([a, b, c, q]) => { g.fillStyle = hsl(hu - 14 + q * 20, 38, 33 + q * 10); g.beginPath(); g.arc(a, b, c * .86, 0, TAU); g.fill(); });
    L.forEach(([a, b, c, q]) => { if (q > .4) { g.fillStyle = hsl(hu - 26 + q * 18, 46, 50 + q * 8); g.beginPath(); g.ellipse(a - c * .3, b - c * .36, c * .38, c * .24, -.6, 0, TAU); g.fill(); } });
  }
  function rock(g, x, gy, s, seed = 2, rot = 0) {
    const r = rng(seed), n = 7, P = [];
    for (let i = 0; i < n; i++) { const a = Math.PI + (i / (n - 1)) * Math.PI, rad = (30 + r() * 12) * s; P.push([x + Math.cos(a + rot * .2) * rad * 1.25, gy + Math.sin(a) * rad * (.86 + rot * .1)]); }
    shadow(g, x + 6 * s, gy + 2 * s, 42 * s, 9 * s, .22);
    g.fillStyle = hsl(30, 12, 52); g.beginPath(); P.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.fill();
    const m = P[Math.floor(n / 2) + (rot > 0 ? 0 : -1)], e = P[n - 1];
    g.fillStyle = hsl(30, 14, 39); g.beginPath(); g.moveTo(m[0], m[1]); for (let i = Math.floor(n / 2) + (rot > 0 ? 1 : 0); i < n; i++) g.lineTo(P[i][0], P[i][1]); g.lineTo(lerp(x, e[0], .25), gy); g.fill();
    g.fillStyle = hsl(34, 18, 66); g.beginPath(); g.moveTo(P[1][0], P[1][1]); g.lineTo(P[2][0], P[2][1]); g.lineTo(m[0], m[1]); g.lineTo(lerp(P[1][0], m[0], .55), lerp(P[1][1], m[1], .1) + 9 * s); g.fill();
  }

  /* ---------- a person, about 104 px tall at s = 1. Drawn facing right; face: -1 mirrors it.
     o.col [h,s,l] uniform, o.pose stand | aim | walk, o.t walk clock (seconds), o.gun false for a civilian ---------- */
  function figure(g, x, gy, o = {}) {
    const s = o.s || 1, c = o.col || [205, 70, 50], face = o.face || 1, pose = o.pose || 'stand', t = o.t || 0;
    const sw = pose === 'walk' ? Math.sin(t * 9) : 0, bob = pose === 'walk' ? Math.abs(Math.cos(t * 9)) * 2.5 : 0;
    g.save(); g.globalAlpha *= o.a ?? 1;
    if (o.shadow !== false) shadow(g, x, gy + 2, 24 * s, 5 * s, .26);
    g.translate(x, gy); g.scale(face * s, s);
    const body = hsl(c[0], c[1], c[2]), dk = hsl(c[0], c[1], c[2] - 16), line = o.line ?? INK;
    const limb = (x0, y0, x1, y1, wd, col) => { g.strokeStyle = line; g.lineWidth = wd + 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.strokeStyle = col; g.lineWidth = wd; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
    const trousers = hsl(c[0], c[1] * .4, 26);
    limb(-3, -46 - bob, -5 - sw * 13, -6, 11, trousers); limb(-5 - sw * 13, -4, 3 - sw * 13, -4, 7, INK);          // far leg and boot
    limb(4, -46 - bob, 6 + sw * 13, -6, 11, trousers); limb(6 + sw * 13, -4, 15 + sw * 13, -4, 7, INK);            // near leg and boot
    g.fillStyle = body; g.strokeStyle = line; g.lineWidth = 2.2; g.beginPath(); g.roundRect(-14, -84 - bob, 28, 44, 9); g.fill(); g.stroke();
    g.fillStyle = dk; g.beginPath(); g.roundRect(-14, -66 - bob, 28, 10, 2); g.fill();                             // belt band
    if (o.gun !== false && pose === 'aim') {
      g.fillStyle = INK; g.beginPath(); g.roundRect(6, -77 - bob, 50, 6, 2); g.fill(); g.fillRect(14, -74 - bob, 7, 13); g.fillRect(0, -78 - bob, 10, 10);
      limb(-4, -76 - bob, 22, -72 - bob, 8, body);
    } else if (o.gun !== false) {
      g.fillStyle = INK; g.save(); g.translate(8, -62 - bob); g.rotate(.9); g.beginPath(); g.roundRect(-6, -3, 44, 6, 2); g.fill(); g.restore();
      limb(-2, -76 - bob, 12, -58 - bob, 8, body);
    } else limb(0, -76 - bob, 3 + sw * -9, -52 - bob, 8, body);
    g.fillStyle = hsl(26, 50, 72); g.strokeStyle = line; g.lineWidth = 2.2; g.beginPath(); g.arc(1, -95 - bob, 11, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = body; g.beginPath(); g.arc(1, -96 - bob, 12.5, Math.PI * 1.04, Math.PI * 1.98); g.lineTo(16, -95 - bob); g.lineTo(-11, -95 - bob); g.closePath(); g.fill(); g.stroke();   // helmet with a brim to the front
    g.fillStyle = INK; g.beginPath(); g.arc(6.5, -92 - bob, 1.7, 0, TAU); g.fill();                                 // the eye is on the facing side
    g.restore();
  }

  /* ---------- pixel helpers ---------- */
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  function grey(ctx, W, H) { const im = ctx.getImageData(0, 0, W, H), D = im.data; for (let i = 0; i < D.length; i += 4) { const v = D[i] * .299 + D[i + 1] * .587 + D[i + 2] * .114; D[i] = D[i + 1] = D[i + 2] = v; } ctx.putImageData(im, 0, 0); }
  const lum = (D, i) => D[i] * .299 + D[i + 1] * .587 + D[i + 2] * .114;
  // canvas label in the deck's look
  function label(g, text, x, y, o = {}) {
    g.save(); g.font = `600 ${o.size || 14}px Jost, sans-serif`; const w = g.measureText(text).width + 18, h = (o.size || 14) + 10, x0 = o.align === 'left' ? x : x - w / 2;
    g.fillStyle = o.bg || 'rgba(255,252,244,.94)'; g.strokeStyle = o.line || 'rgba(27,35,80,.35)'; g.lineWidth = 1.5; g.beginPath(); g.roundRect(x0, y - h / 2, w, h, h / 2); g.fill(); g.stroke();
    g.fillStyle = o.col || INK; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(text, x0 + 9, y + 1); g.restore();
  }

  window.EA = { K, hsl, INK, BO, TAU, clamp, lerp, ease, rng, grid, shadow, sky, ground, win, door, awning, ivy, building, crate, barrel, bush, planter, lamp, poster, sign, bench, dumpster, tree, rock, figure, canvas, grey, lum, label };
})();
