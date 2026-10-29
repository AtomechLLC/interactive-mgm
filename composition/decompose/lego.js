/* Just like Lego bricks (MGM C4 M7, deck slide 30). One pile of bricks builds a Goomba, falls back into the pile, then builds
   a Koopa Troopa. The bricks are the sprites' own pixels, two by two, so the colours are Nintendo's; the pile holds enough of
   each colour for either enemy. */
(function () {
  const { pic, text, scene, clamp, ease, lerp } = CK;
  const C = TD.C;
  const B = 26, DUR = 15;
  const SHAPES = [['smb-goomba.png', 'Goomba', 2.2], ['smb-koopa.png', 'Koopa Troopa', 7.6]];
  let model = null;

  function cells(n) {
    const im = CK.img(n), w = im.naturalWidth, h = im.naturalHeight, cv = document.createElement('canvas');
    cv.width = w; cv.height = h; const x = cv.getContext('2d'); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, w, h).data, out = [];
    for (let by = 0; by < h; by += 2) for (let bx = 0; bx < w; bx += 2) {
      const cnt = {};
      for (let yy = by; yy < Math.min(h, by + 2); yy++) for (let xx = bx; xx < Math.min(w, bx + 2); xx++) { const i = (yy * w + xx) * 4; if (d[i + 3] < 128) continue; const k = `${d[i]},${d[i + 1]},${d[i + 2]}`; cnt[k] = (cnt[k] || 0) + 1; }
      const best = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
      if (best && best[1] >= 2) out.push({ c: bx / 2, r: by / 2, col: best[0] });
    }
    return { cells: out, cw: Math.ceil(w / 2), ch: Math.ceil(h / 2) };
  }
  function build() {
    if (!SHAPES.every(s => CK.ready(s[0]))) return null;
    const S = SHAPES.map(s => cells(s[0]));
    // the pile: enough bricks of each colour for either shape
    const need = {}; S.forEach(sh => { const c = {}; sh.cells.forEach(q => c[q.col] = (c[q.col] || 0) + 1); Object.entries(c).forEach(([k, n]) => need[k] = Math.max(need[k] || 0, n)); });
    const pile = []; Object.entries(need).sort().forEach(([col, n]) => { for (let i = 0; i < n; i++) pile.push({ col }); });
    const perRow = 26; pile.forEach((p, i) => { p.px = 520 - perRow * 14 + (i % perRow) * 28 + 14; p.py = 548 - Math.floor(i / perRow) * 18; });
    // each shape takes bricks of the right colour from the pile, in order
    S.forEach((sh, si) => { const used = {}; sh.cells.forEach(q => { const k = q.col; const idx = pile.findIndex((p, i) => p.col === k && !(used[i])); used[idx] = 1; pile[idx]['s' + si] = [520 + (q.c - sh.cw / 2 + .5) * B, 290 + (q.r - sh.ch / 2 + .5) * B]; }); });
    return { pile, S };
  }
  function brick(g, x, y, col, s = 1) {
    const w = B * s - 2, h = B * s - 2;
    g.fillStyle = `rgb(${col})`; g.fillRect(x - w / 2, y - h / 2, w, h);
    g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 1.5; g.strokeRect(x - w / 2, y - h / 2, w, h);
    g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.arc(x, y, w * .26, 0, Math.PI * 2); g.fill();
  }

  scene('lego', {
    dur: DUR,
    draw(g, t) {
      model = model || build();
      if (!model) { text(g, 'Loading…', 520, 290, { size: 18, col: C.muted }); return; }
      // which shape is being built, and how far
      const phase = (si, t0) => { const up = ease(clamp((t - t0) / 1.6)), down = ease(clamp((t - t0 - 3.4) / 1.2)); return [up, down]; };
      text(g, 'One pile of bricks', 520, 520 - 62, { size: 14, w: 700, col: C.muted });
      model.pile.forEach((p, i) => {
        let x = p.px, y = p.py, s = .62;
        SHAPES.forEach(([, , t0], si) => {
          const tgt = p['s' + si]; if (!tgt) return;
          const d = (i % 23) * .025, [up, down] = [ease(clamp((t - t0 - d) / 1.4)), ease(clamp((t - t0 - 3.4 - d) / 1.1))], k = up * (1 - down);
          if (k > 0) { x = lerp(p.px, tgt[0], k); y = lerp(p.py, tgt[1], k) - Math.sin(k * Math.PI) * 60; s = lerp(.62, 1, k); }
        });
        brick(g, x, y, p.col, s);
      });
      SHAPES.forEach(([n, name, t0], si) => {
        const a = clamp((t - t0 - 1.5) / .4) * (1 - clamp((t - t0 - 3.3) / .3));
        if (a <= 0) return;
        text(g, name, 520, 70, { size: 26, w: 800, display: true, a });
        g.save(); g.globalAlpha = a; pic(g, n, 860, 290, 64, { px: true }); g.restore();
        text(g, 'the sprite', 860, 350, { size: 12, col: C.muted, a });
        const used = model.pile.filter(p => p['s' + si]).length;
        text(g, `${used} of ${model.pile.length} bricks`, 180, 290, { size: 18, w: 800, col: C.navy, a });
      });
      if (t > 12.4) { TD.use(g); TD.stamp('One pile, many enemies', 520, 240, C.navy, clamp((t - 12.4) / .4), 30); }
    },
    side() { return { out: 'Like Lego bricks: the same pieces, snapped together differently, make a different thing.' }; },
  });
})();
