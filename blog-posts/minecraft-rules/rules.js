/* Simple rules, emergent results (genre breakdown: "Minecraft Game Design: What Can We Learn?").
   Seven blocks, each pair's rule in one line (simplified from Minecraft Java Edition), and a list of player inventions
   that come out of combining those rules. Switch blocks off and watch rules and inventions disappear: inventions need
   every rule they use, so they fall faster than the rules do. */
(function () {
  const C = TD.C, { clamp } = TD;
  const B = [['water', '#3f74c9'], ['lava', '#e8641b'], ['sand', '#e3d39a'], ['redstone', '#c0261e'], ['piston', '#9b8a6a'], ['TNT', '#d33b2c'], ['ice', '#a9d3f5']];
  const RULES = [
    ['water', 'water', 'Two water sources make a third between them: infinite water'],
    ['water', 'lava', 'Water on flowing lava makes cobblestone; on a lava source, obsidian'],
    ['sand', 'sand', 'Sand falls when nothing holds it up'],
    ['redstone', 'piston', 'A powered piston pushes up to 12 blocks'],
    ['redstone', 'TNT', 'Power reaching TNT lights it'],
    ['water', 'TNT', 'TNT that explodes in water breaks no blocks'],
    ['lava', 'TNT', 'Lava’s fire can light TNT'],
    ['water', 'redstone', 'Flowing water washes redstone dust away'],
    ['ice', 'water', 'Broken ice above a block turns back into water'],
    ['piston', 'sand', 'Pushed or pulled out from under, sand falls'],
  ];
  const key = (a, b) => [a, b].sort().join('+');
  const R = Object.fromEntries(RULES.map(([a, b, t]) => [key(a, b), t]));
  const INVENT = [
    ['Cobblestone generator', ['water+lava']],
    ['Obsidian for a Nether portal, cast in place', ['lava+water', 'water+water']],
    ['Infinite water source', ['water+water']],
    ['Piston door', ['piston+redstone']],
    ['Sand trap over a doorway', ['piston+redstone', 'piston+sand', 'sand+sand']],
    ['Underwater TNT cannon', ['redstone+TNT', 'TNT+water']],
    ['Lava-lit TNT trap', ['lava+TNT']],
    ['Redstone circuit cut by a water valve', ['redstone+water', 'piston+redstone']],
    ['Ice-and-water farm reservoir', ['ice+water', 'water+water']],
  ].map(([n, ks]) => [n, ks.map(k => key(...k.split('+')))]);
  GK.scene('rules', (s, g, ui) => {
    const btns = [...s.querySelectorAll('.mc-b .btn')]; ui.watch(btns);
    const on = new Set(B.map(b => b[0]));
    btns.forEach(b => b.onclick = () => { const n = b.dataset.b; on.has(n) ? on.delete(n) : on.add(n); });
    const ORDER = ['water', 'sand', 'redstone', 'piston', 'lava', 'TNT', 'ice'];
    return {
      dur: 21,
      frame(t, tour) {
        if (tour) { const n = clamp(Math.floor(t / 2.6) + 1, 1, 7); on.clear(); ORDER.slice(0, n).forEach(x => on.add(x)); }
        btns.forEach(b => b.classList.toggle('on', on.has(b.dataset.b)));
        GK.panel(g);
        const gx = 104, gy = 104, cs = 50;
        GK.head(g, 'Every pair of blocks, one rule each', 20, 30);
        B.forEach(([n, col], i) => {
          const live = on.has(n);
          [[gx + i * cs, gy - 46], [gx - 92, gy + i * cs]].forEach(([x, y], k) => {
            g.globalAlpha = live ? 1 : .3; g.fillStyle = col; g.fillRect(x + (k ? 0 : 8), y + (k ? 8 : 0), 36, 36);
            g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + (k ? 0 : 8) + 18, y + (k ? 8 : 0), 18, 18); g.fillRect(x + (k ? 0 : 8), y + (k ? 8 : 0) + 18, 18, 18);
            GK.text(g, n, k ? x + 44 : x + 26, k ? y + 32 : y + 50, live ? C.ink : '#b9ad92', 11, k ? 'left' : 'center', 700); g.globalAlpha = 1;
          });
        });
        let rules = 0;
        B.forEach(([a], i) => B.forEach(([b], j) => {
          if (j < i) return;
          const x = gx + j * cs, y = gy + i * cs, r = R[key(a, b)], live = on.has(a) && on.has(b);
          GK.box(g, x + 2, y + 2, cs - 4, cs - 4, r ? (live ? '#d8f0df' : '#eee6d6') : '#fffaf0', r ? (live ? '#5fb47c' : '#d8ccb0') : '#e3d8bf', 6, 1.5);
          if (r && live) { rules++; GK.head(g, '✓', x + cs / 2, y + cs / 2 + 7, 'center', C.good, 20); }
        }));
        // rule list
        const lx = 500;
        GK.head(g, `${rules} rules in play`, lx, 30);
        let y = 52;
        RULES.forEach(([a, b, txt]) => { if (!(on.has(a) && on.has(b))) return; y = GK.wrap(g, '• ' + txt, lx, y, 520, 16, C.ink, 13) + 2; });
        // inventions
        const iy = 300;
        const live = INVENT.filter(([, ks]) => ks.every(k => { const [a, b] = k.split('+'); return on.has(a) && on.has(b); }));
        GK.head(g, `${live.length} things players build from them`, lx, iy);
        INVENT.forEach(([n, ks], i) => {
          const ok = live.some(l => l[0] === n), yy = iy + 16 + i * 26;
          GK.box(g, lx, yy, 520, 22, ok ? '#fff4d6' : 'rgba(255,250,240,.4)', ok ? C.gold : '#e3d8bf', 6, 1.5);
          GK.text(g, n, lx + 10, yy + 16, ok ? C.ink : '#b9ad92', 13, 'left', 700);
          GK.text(g, `${ks.length} rule${ks.length > 1 ? 's' : ''}`, lx + 510, yy + 16, ok ? C.goldInk : '#c9bfa6', 11, 'right', 700);
        });
        GK.wrap(g, 'None of these inventions is a feature. Each one is one, two or three simple rules meeting in a player’s hands.', 20, 470, 440, 19, C.ink, 14);
        ui.stats(`<div><b>${on.size}</b><span>blocks</span></div><div class="y"><b>${rules}</b><span>one-line rules</span></div><div class="g"><b>${live.length}</b><span>inventions that emerge</span></div>`);
        ui.out('Modular simplicity: each block is easy to learn, and the open-ended part comes from what they do together.');
      },
    };
  });
})();
