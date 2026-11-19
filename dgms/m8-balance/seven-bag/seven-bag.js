/* The 7-bag (Tetris), beside Stable part vs variance (DGMS M8).
   Three wells wait for the same thing: an I piece for the open column. Every other piece raises the stack, and an I
   clears four rows. Pure random and the NES reroll leave the wait to chance; the 7-bag deals every piece once per
   seven, so the wait can never pass 12 pieces. The bag under the third well empties and refills as it deals.
   Toy model: a non-I piece adds 4 cells to a 9-wide stack; an I clears 4 rows when there are 4. Sequences are seeded. */
(function () {
  const { txt, box, bar, pill, clamp, C } = SCN;
  const W = 1040, H = 585, P = 'IOTSZJL', MAXN = 2400, ROWS = 20;
  const COL = { I: '#31c7ef', O: '#f7d308', T: '#ad4d9c', S: '#42b642', Z: '#ef2029', J: '#5a65ad', L: '#ef7921' };
  const SHAPE = { I: [[0, 0], [1, 0], [2, 0], [3, 0]], O: [[1, 0], [2, 0], [1, 1], [2, 1]], T: [[1, 0], [0, 1], [1, 1], [2, 1]], S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]], J: [[0, 0], [0, 1], [1, 1], [2, 1]], L: [[2, 0], [0, 1], [1, 1], [2, 1]] };
  const GENS = [
    { name: 'Pure random', rule: 'every piece: 1 in 7, every time', col: '#8a4fd6', gen(r) { return Array.from({ length: MAXN }, () => P[Math.floor(r() * 7)]); } },
    { name: 'NES reroll', rule: 'same as the last piece? roll once more', col: '#e0a92d', gen(r) { const o = []; let prev = -1; for (let i = 0; i < MAXN; i++) { let v = Math.floor(r() * 8); if (v === 7 || v === prev) v = Math.floor(r() * 7); o.push(P[v]); prev = v; } return o; } },
    { name: '7-bag', rule: 'shuffle all seven, deal the bag, refill', col: '#2ea3dc', gen(r) { const o = []; while (o.length < MAXN) { const b = P.split(''); for (let i = 6; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } o.push(...b); } return o; } },
  ];
  function mino(g, p, x, y, c, a = 1) { g.save(); g.globalAlpha *= a; SHAPE[p].forEach(([cx, cy]) => { g.fillStyle = COL[p]; g.fillRect(x + cx * c, y + cy * c, c - 1, c - 1); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + cx * c, y + cy * c, c - 1, Math.max(1, c / 6)); }); g.restore(); }

  SCN.run('bag', s => {
    let seed = 11, seqs, z, rate;
    function build() { seqs = GENS.map((gn, k) => gn.gen(SCN.rng(seed * 7919 + k * 104729 + 3))); }
    function fresh() { z = { n: 0, acc: 0, w: GENS.map(() => ({ cells: 0, wait: 0, longest: 0, tetris: 0, tops: 0, flash: 0, top: 0, rows: [] })) }; }
    function deal() {
      if (z.n >= MAXN) return;
      z.w.forEach((w, k) => {
        const p = seqs[k][z.n];
        if (p === 'I') { w.wait = 0; if (w.cells >= 36) { w.cells -= 36; w.rows.splice(0, 4); w.tetris++; w.flash = 1; } }
        else { w.wait++; w.longest = Math.max(w.longest, w.wait); w.cells += 4; while (w.rows.length < Math.ceil(w.cells / 9)) w.rows.push(p); if (w.cells / 9 >= ROWS) { w.tops++; w.top = 1; w.cells = 0; w.rows = []; } }
      });
      z.n++;
    }
    const api = {
      dur: 30,
      reset(tour) { if (tour) { seed = 11; rate = 2.2; } build(); fresh(); },
      step(h, t) { z.w.forEach(w => { w.flash = Math.max(0, w.flash - h * 3); w.top = Math.max(0, w.top - h * .8); }); z.acc += h * rate; while (z.acc >= 1) { z.acc--; deal(); } },
      script: [[7, () => { rate = 9; }], [14, () => { rate = 60; }], [24, () => { rate = 0; }]],
      caption: t => t < 7 ? 'Three wells, each waiting for an I piece to drop in the open column. Every other piece raises the stack. Watch the bag under the third well.'
        : t < 14 ? 'All three deal each piece one time in seven on average. The difference is the wait: only the bag promises an I in every seven.'
        : t < 24 ? 'Faster. Pure random and the NES reroll run into long droughts and the stack tops out. The bag\'s longest possible wait is 12 pieces.'
        : 'Same pieces, same average, different worst case. The bag keeps the surprise of the order and removes the drought.',
      status: () => `${z.n} pieces dealt, seed ${seed}. New seeds move the droughts around in the first two wells; the bag never waits more than 12.`,
      stats: () => GENS.map((gn, k) => `<div class="${['r', 'y', ''][k]}"><b>${z.w[k].longest}</b><span>${gn.name}: longest wait for an I · ${z.w[k].tops} top-out${z.w[k].tops === 1 ? '' : 's'}</span></div>`).join(''),
      acts: { seed() { seed++; build(); fresh(); }, one() { rate = 0; deal(); } },
      set(k, v) { if (k === 'rate') rate = v; },
      draw(g) {
        SCN.paper(g, W, H);
        GENS.forEach((gn, k) => {
          const x0 = 14 + k * 342, w = z.w[k], cw = 330, c = 19, fx = x0 + 18, fy = 74, fh = ROWS * c;
          box(g, x0, 10, cw, H - 20, { r: 12, fill: 'rgba(239,230,210,.75)' });
          txt(g, gn.name, x0 + 16, 32, { size: 24, w: 800, col: gn.col, display: true }); txt(g, gn.rule, x0 + 16, 56, { size: 13, w: 600, col: C.muted });
          // the well: nine filled columns and one open, waiting for the I
          box(g, fx - 4, fy - 4, 10 * c + 8, fh + 8, { r: 4, fill: '#10162e', stroke: w.top > 0 ? C.red : '#3d4a7a', lw: 4 });
          g.fillStyle = 'rgba(49,199,239,.10)'; g.fillRect(fx + 9 * c, fy, c, fh);
          const full = Math.floor(w.cells / 9), part = w.cells % 9;
          for (let r = 0; r <= full; r++) { const n = r < full ? 9 : part; for (let i = 0; i < n; i++) { const p = w.rows[r] || 'T', pc = P[(P.indexOf(p) + Math.floor((i + r) / 2)) % 7 || 1]; g.fillStyle = COL[pc === 'I' ? 'J' : pc]; g.fillRect(fx + i * c, fy + fh - (r + 1) * c, c - 1, c - 1); g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(fx + i * c, fy + fh - (r + 1) * c, c - 1, 3); } }
          if (w.flash > 0) { g.fillStyle = `rgba(255,255,255,${w.flash * .8})`; g.fillRect(fx, fy + fh - (full + 4) * c, 10 * c, 4 * c); txt(g, 'TETRIS', fx + 5 * c, fy + fh - (full + 2) * c, { size: 22, w: 800, col: '#fff', align: 'center', display: true, halo: '#10162e' }); }
          if (w.top > 0) pill(g, 'topped out', fx + 5 * c, fy + 30, { size: 16, w: 800, fill: C.red });
          g.strokeStyle = 'rgba(229,50,45,.7)'; g.setLineDash([5, 4]); g.lineWidth = 2; g.beginPath(); g.moveTo(fx, fy + 2); g.lineTo(fx + 10 * c, fy + 2); g.stroke(); g.setLineDash([]);
          // right of the well: the wait, the latest pieces
          const rx = fx + 10 * c + 18;
          txt(g, 'since the last I', rx, 84, { size: 13, w: 700, col: C.muted });
          txt(g, w.wait, rx, 116, { size: 44, w: 800, col: w.wait > 12 ? C.red : C.ink, display: true });
          txt(g, `longest ${w.longest}`, rx, 150, { size: 15, w: 800, col: w.longest > 12 ? C.red : C.ink });
          txt(g, 'next', rx, 184, { size: 13, w: 700, col: C.muted });
          for (let i = 0; i < 5; i++) { const p = seqs[k][z.n + i]; if (p) mino(g, p, rx + (p === 'I' ? 0 : 4), 198 + i * 34, 11, i ? .9 : 1); }
          txt(g, `${w.tetris} Tetrises`, rx, 392, { size: 15, w: 800 }); txt(g, `${w.tops} top-out${w.tops === 1 ? '' : 's'}`, rx, 414, { size: 15, w: 800, col: w.tops ? C.red : C.muted });
          // under the well: how the next piece is chosen
          const by = fy + fh + 18;
          if (k === 2) { const left = (7 - z.n % 7) % 7 || 7, bag = seqs[2].slice(z.n - (7 - left), z.n - (7 - left) + 7), used = 7 - left;
            txt(g, 'the bag', x0 + 16, by + 8, { size: 13, w: 800, col: gn.col });
            'IOTSZJL'.split('').forEach((p, i) => { const gone = bag.slice(0, used).includes(p), bx = x0 + 16 + i * 43; box(g, bx, by + 20, 39, 30, { r: 6, fill: gone ? 'rgba(20,26,54,.08)' : '#fff', stroke: gone ? '#cdbf9f' : gn.col, lw: 2 }); mino(g, p, bx + (p === 'I' ? 4 : p === 'O' ? 3 : 7), by + (p === 'I' ? 31 : 26), 8, gone ? .18 : 1); });
            txt(g, `${left} left, then a fresh seven`, x0 + 16, by + 64, { size: 13, w: 700, col: C.muted }); }
          else { txt(g, k ? 'the die, with one reroll' : 'the die', x0 + 16, by + 8, { size: 13, w: 800, col: gn.col }); const last = seqs[k][Math.max(0, z.n - 1)];
            box(g, x0 + 16, by + 20, 44, 44, { r: 8, fill: '#fff', stroke: gn.col, lw: 3 }); if (z.n) mino(g, last, x0 + (last === 'I' ? 20 : 25), by + (last === 'I' ? 38 : 33), 9);
            txt(g, 'chance the next piece is an I:', x0 + 72, by + 30, { size: 13, w: 700, col: C.muted }); txt(g, k && last === 'I' ? '1 in 28' : k ? 'about 1 in 6' : '1 in 7, always', x0 + 72, by + 52, { size: 18, w: 800 }); }
        });
      },
    };
    return api;
  });
})();
