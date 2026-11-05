/* V3: a tiny perspective renderer for the camera module's view panels (grey-box only, no textures).
   World units are metres. x and y are the top-down map's axes (y grows down the map), z is up.
   V3.cam(pos, target, hfovDeg, vw, vh, roll) builds a pinhole camera; V3.render(g, cam, ox, oy, scene) draws
   a scene of floor polygons, boxes and billboard characters into the viewport (ox, oy, vw, vh), painter-sorted,
   with near-plane clipping and distance haze. The same file is copied into each m6-camera page that needs it. */
(function () {
  const NEAR = 0.15;
  const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  const css = c => `rgb(${c[0]},${c[1]},${c[2]})`;

  function cam(pos, tgt, hfovDeg, vw, vh, roll = 0) {
    let f = [tgt[0] - pos[0], tgt[1] - pos[1], tgt[2] - pos[2]];
    const fl = Math.hypot(...f) || 1; f = f.map(v => v / fl);
    // right on the map is the forward direction turned a quarter clockwise (y grows down the map)
    let r = [-f[1], f[0], 0]; const rl = Math.hypot(r[0], r[1]) || 1; r = [r[0] / rl, r[1] / rl, 0];
    let u = [-f[2] * f[0], -f[2] * f[1], 1 - f[2] * f[2]]; const ul = Math.hypot(...u) || 1; u = u.map(v => v / ul);
    if (roll) { const c = Math.cos(roll), s = Math.sin(roll), r2 = r.map((v, i) => v * c + u[i] * s), u2 = u.map((v, i) => u[i] * c - r[i] * s); r = r2; u = u2; }
    const hf = hfovDeg * Math.PI / 180, focal = (vw / 2) / Math.tan(hf / 2);
    const toCam = p => { const d = [p[0] - pos[0], p[1] - pos[1], p[2] - pos[2]]; return [d[0] * r[0] + d[1] * r[1] + d[2] * r[2], d[0] * u[0] + d[1] * u[1] + d[2] * u[2], d[0] * f[0] + d[1] * f[1] + d[2] * f[2]]; };
    const scr = c => [vw / 2 + c[0] / c[2] * focal, vh / 2 - c[1] / c[2] * focal];
    const project = p => { const c = toCam(p); return c[2] > NEAR ? [...scr(c), c[2]] : null; };
    return { pos, tgt, f, r, u, focal, vw, vh, hfov: hfovDeg, toCam, scr, project };
  }

  // clip a polygon in camera space against the near plane
  function clipNear(pts) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], ia = a[2] > NEAR, ib = b[2] > NEAR;
      if (ia) out.push(a);
      if (ia !== ib) { const k = (NEAR - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, NEAR]); }
    }
    return out;
  }
  function poly(g, cm, verts, fill, stroke, lw = 1) {
    const c = clipNear(verts.map(cm.toCam)); if (c.length < 3) return;
    g.beginPath(); c.forEach((p, i) => { const s = cm.scr(p); i ? g.lineTo(s[0], s[1]) : g.moveTo(s[0], s[1]); }); g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
  }
  function line(g, cm, a, b, col, lw = 1) {
    let p = cm.toCam(a), q = cm.toCam(b);
    if (p[2] <= NEAR && q[2] <= NEAR) return;
    if (p[2] <= NEAR) { const k = (NEAR - p[2]) / (q[2] - p[2]); p = p.map((v, i) => v + (q[i] - v) * k); }
    if (q[2] <= NEAR) { const k = (NEAR - q[2]) / (p[2] - q[2]); q = q.map((v, i) => v + (p[i] - v) * k); }
    const s = cm.scr(p), e = cm.scr(q);
    g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(s[0], s[1]); g.lineTo(e[0], e[1]); g.stroke();
  }

  const HAZE = [214, 220, 236];
  const hazeK = (z, far) => Math.min(.7, Math.max(0, z / far) * .7);

  // a character drawn as a standing capsule with a head; kind 'hero' | 'foe' | 'boss'
  function figure(g, cm, b, far) {
    const base = cm.toCam([b.x, b.y, 0]), top = cm.toCam([b.x, b.y, b.h]);
    if (base[2] <= NEAR) return;
    const s0 = cm.scr(base), s1 = cm.scr(top), w = b.r * 2 * cm.focal / base[2];
    const hk = hazeK(base[2], far), col = css(mix(b.col, HAZE, hk)), edge = css(mix(b.edge || [21, 32, 68], HAZE, hk));
    const hgt = s0[1] - s1[1]; if (!(hgt > 1) || !(w > .5)) return null;
    const head = Math.max(.5, Math.min(w * .42, hgt * .13));
    g.save(); g.globalAlpha = b.a ?? 1;
    g.fillStyle = 'rgba(30,24,16,.25)'; g.beginPath(); g.ellipse(s0[0], s0[1], w * .75, Math.max(1, w * .18), 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = col; g.strokeStyle = edge; g.lineWidth = Math.max(1, w * .06);
    g.beginPath(); g.roundRect(s0[0] - w / 2, s1[1] + head * 1.6, w, hgt - head * 1.6, Math.min(w / 2, 10)); g.fill(); g.stroke();
    g.beginPath(); g.arc(s1[0], s1[1] + head * .9, head, 0, Math.PI * 2); g.fill(); g.stroke();
    if (b.kind === 'boss') {
      g.fillStyle = css(mix([255, 242, 216], HAZE, hk));
      [-1, 1].forEach(sg => { g.beginPath(); g.moveTo(s1[0] + sg * head * .5, s1[1] + head * .4); g.lineTo(s1[0] + sg * head * 1.5, s1[1] - head * .9); g.lineTo(s1[0] + sg * head * .9, s1[1] + head * .9); g.fill(); });
    }
    g.restore();
    return { x: s0[0], y: s0[1], top: s1[1], w };
  }

  // scene: { sky:[top,bottom], ground:{z, col}, floors:[{pts:[[x,y]...], col, z}], grid:{x0,y0,x1,y1,step,col}, lines:[[a,b,col,lw]], boxes:[{x0,y0,x1,y1,z0,z1,col}], figs:[...], marks:[{x,y,r,col}], far }
  function render(g, cm, ox, oy, sc) {
    const far = sc.far || 60, vw = cm.vw, vh = cm.vh;
    g.save(); g.beginPath(); g.rect(ox, oy, vw, vh); g.clip(); g.translate(ox, oy);
    const sky = g.createLinearGradient(0, 0, 0, vh); sky.addColorStop(0, sc.sky?.[0] || '#b9c4e6'); sky.addColorStop(1, sc.sky?.[1] || '#e9ecf6');
    g.fillStyle = sky; g.fillRect(0, 0, vw, vh);
    if (sc.ground) { const z = sc.ground.z, S = 400, P = cm.pos; poly(g, cm, [[P[0] - S, P[1] - S, z], [P[0] + S, P[1] - S, z], [P[0] + S, P[1] + S, z], [P[0] - S, P[1] + S, z]], sc.ground.col); }
    (sc.floors || []).forEach(fl => poly(g, cm, fl.pts.map(p => [p[0], p[1], fl.z || 0]), fl.col, fl.edge, 2));
    if (sc.grid) { const G = sc.grid; for (let x = G.x0; x <= G.x1 + 1e-6; x += G.step) line(g, cm, [x, G.y0, .01], [x, G.y1, .01], G.col, 1); for (let y = G.y0; y <= G.y1 + 1e-6; y += G.step) line(g, cm, [G.x0, y, .01], [G.x1, y, .01], G.col, 1); }
    (sc.lines || []).forEach(l => line(g, cm, l[0], l[1], l[2], l[3] || 1));
    (sc.marks || []).forEach(m => { const N = 20, pts = []; for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2; pts.push([m.x + Math.cos(a) * m.r, m.y + Math.sin(a) * m.r, .02]); } poly(g, cm, pts, m.col, m.edge, 2); });
    const items = [];
    (sc.boxes || []).forEach(b => {
      const { x0, y0, x1, y1, z0 = 0, z1 } = b, base = b.col || [139, 143, 168];
      const faces = [
        { v: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], n: [0, 0, 1], l: 1.12 },
        { v: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], n: [0, -1, 0], l: .86 },
        { v: [[x1, y1, z0], [x0, y1, z0], [x0, y1, z1], [x1, y1, z1]], n: [0, 1, 0], l: .96 },
        { v: [[x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1]], n: [-1, 0, 0], l: .78 },
        { v: [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], n: [1, 0, 0], l: .92 },
      ];
      faces.forEach(fc => {
        const c = fc.v.reduce((a, p) => a.map((s, i) => s + p[i] / 4), [0, 0, 0]);
        const toC = [c[0] - cm.pos[0], c[1] - cm.pos[1], c[2] - cm.pos[2]];
        if (toC[0] * fc.n[0] + toC[1] * fc.n[1] + toC[2] * fc.n[2] >= 0) return;
        const z = cm.toCam(c)[2]; if (z < -2) return;
        const col = mix(base.map(v => Math.min(255, v * fc.l)), HAZE, hazeK(Math.max(0, z), far));
        items.push({ z: z + (b.bias || 0), draw: () => poly(g, cm, fc.v, css(col), 'rgba(21,32,68,.35)', 1) });
      });
    });
    const figOut = {};
    (sc.figs || []).forEach(b => { const z = cm.toCam([b.x, b.y, b.h / 2])[2]; items.push({ z, draw: () => { figOut[b.id || b.kind] = figure(g, cm, b, far); } }); });
    items.sort((a, b) => b.z - a.z).forEach(it => it.draw());
    g.restore();
    return figOut;
  }

  window.V3 = { cam, render, poly, line, clipNear, mix, css, NEAR };
})();
