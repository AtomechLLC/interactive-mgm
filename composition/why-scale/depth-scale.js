/* Depth or scale, rarely both (MGM C4 M7, deck slides 5, 8-9). Slide 9: "Without this, you might achieve either depth or scale,
   rarely both"; notes: "I'm showing you how to have your cake and eat it too." Three ways to make content, drawn as paths on
   one chart as a team keeps working: hand-making each item climbs high and stops early, reskinning runs far and stays low,
   composing from shared parts climbs and keeps going. Each dot is one item shipped. The curves are an illustration of the
   slide's claim, not measured data. */
(function () {
  const { text, chip, TONE, panel, scene, clamp, ease, lerp } = CK;
  const C = TD.C;
  const X0 = 120, Y0 = 500, W = 640, H = 420;
  // each path: name, colour, icon, items shipped by time u in 0..1, depth of item i (0..1)
  const PATHS = [
    { name: 'Handcrafted', sub: 'each item made by hand', col: '#c2412c', gi: 'anvil', n: u => Math.floor(lerp(0, 9, u)), depth: i => .8 + .025 * Math.sin(i * .9) },
    { name: 'Reskinned', sub: 'one item, many coats of paint', col: '#5a6fd0', gi: 'paint-brush', n: u => Math.floor(lerp(0, 46, u)), depth: i => .16 + .015 * Math.sin(i * .8) },
    { name: 'Composed', sub: 'shared parts, new combinations', col: '#2fae63', gi: 'puzzle', n: u => Math.floor(lerp(0, 40, ease(u))), depth: i => Math.min(.74, .3 + .44 * (1 - Math.exp(-i / 9))) + .015 * Math.sin(i * .7) },
  ];
  const MAXN = 48, DUR = 14;

  scene('depth-scale', {
    dur: DUR,
    draw(g, t) {
      const u = clamp((t - 1) / 9);
      // axes
      g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.moveTo(X0, Y0 - H); g.lineTo(X0, Y0); g.lineTo(X0 + W, Y0); g.stroke();
      text(g, 'Content count  →', X0 + W, Y0 + 30, { size: 16, w: 800, col: C.navy, align: 'right' });
      g.save(); g.translate(X0 - 34, Y0); g.rotate(-Math.PI / 2); text(g, 'Relevant depth per item  →', 0, 0, { size: 16, w: 800, col: C.navy, align: 'left' }); g.restore();
      g.setLineDash([4, 8]); g.strokeStyle = 'rgba(93,97,140,.35)'; g.lineWidth = 1.5;
      [.25, .5, .75].forEach(k => { g.beginPath(); g.moveTo(X0, Y0 - H * k); g.lineTo(X0 + W, Y0 - H * k); g.stroke(); });
      g.setLineDash([]);
      // the target corner: depth and scale
      const tg = clamp((t - 10.5) / .6);
      g.fillStyle = `rgba(47,174,99,${.12 * tg})`; g.beginPath(); g.roundRect(X0 + W * .55, Y0 - H, W * .45, H * .45, 12); g.fill();
      text(g, 'Depth at scale', X0 + W * .775, Y0 - H + 26, { size: 15, w: 800, col: C.good, a: tg });
      PATHS.forEach((p, k) => {
        const n = p.n(u), pts = [];
        for (let i = 0; i < n; i++) pts.push([X0 + 14 + (W - 28) * i / MAXN, Y0 - H * p.depth(i)]);
        g.strokeStyle = p.col; g.lineWidth = 2; g.globalAlpha = .45; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); g.globalAlpha = 1;
        pts.forEach(([x, y]) => { g.fillStyle = p.col; g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill(); });
        if (n) { const [x, y] = pts[n - 1]; g.fillStyle = '#fffaf0'; g.strokeStyle = p.col; g.lineWidth = 3; g.beginPath(); g.arc(x + 4, y, 17, 0, Math.PI * 2); g.fill(); g.stroke(); GI.draw(g, p.gi, x + 4, y, 22, p.col); }
        // legend
        const ly = 92 + k * 92;
        panel(g, 800, ly - 36, 226, 80, { edge: p.col });
        GI.draw(g, p.gi, 830, ly - 4, 30, p.col);
        text(g, p.name, 856, ly - 14, { align: 'left', size: 17, w: 800, display: true });
        text(g, p.sub, 856, ly + 8, { align: 'left', size: 12, col: C.muted });
        text(g, `${n} items`, 856, ly + 28, { align: 'left', size: 12.5, w: 800, col: p.col });
      });
      if (t > 1) text(g, u < 1 ? 'Same team, same months of work…' : 'Composition keeps both: depth and scale.', X0 + W / 2, 40, { size: 18, w: 800, display: true, col: u < 1 ? C.muted : C.good });
      const sa = clamp((t - 11) / .5);
      if (sa) { TD.use(g); TD.stamp('Have your cake and eat it too', 470, 112, C.good, sa, 20); }
    },
    side(t) { return { out: 'Without a compositional framework you might get depth or scale, rarely both. Shared parts let the item count grow without each item going shallow.' }; },
  });
})();
