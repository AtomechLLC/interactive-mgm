/* Gacha pity (genre breakdown: "Gacha Game").
   Genshin Impact's published 5-star rates: a 0.6% base rate, a guarantee by pull 90 (hard pity) and a 1.6%
   "consolidated" rate once pity is counted. The soft pity ramp from pull 74 (about +6% per pull) is community-measured,
   not published, and is labelled that way on the page. Toggle either pity off to see what it does.
   1,000 simulated players, seeded, so the walk-through and __seek are deterministic. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp } = TD;
  const W = 1040, H = 585, BASE = .006, SOFT = 74, SOFT_STEP = .06, HARD = 90, PLAYERS = 1000, CAP = 200;
  const rate = (n, o) => { if (o.hard && n >= HARD) return 1; let p = BASE; if (o.soft && n >= SOFT) p += SOFT_STEP * (n - SOFT + 1); return Math.min(1, p); };
  function stats(o) {      // exact: chance the first 5-star lands on pull n
    const first = []; let none = 1, mean = 0;
    for (let n = 1; n <= 2000; n++) { const p = rate(n, o), f = none * p; first.push(f); mean += n * f; none *= 1 - p; if (none < 1e-12) break; }
    const cum = []; first.reduce((a, f, i) => (cum[i] = a + f), 0);
    return { first, cum, mean };
  }
  function simulate(o, count) {
    const out = [];
    for (let k = 0; k < count; k++) {
      let s = (k * 2654435761 + 7) >>> 0; const r = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
      let n = 1; while (r() >= rate(n, o) && n < 5000) n++; out.push(n);
    }
    return out;
  }

  function draw(g, o, count) {
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
    const st = stats(o), no = stats({}); g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    // per-pull chance
    const ax = 56, aw = 430, ay = 50, ah = 170, sx = n => ax + (n - .5) / 100 * aw, sy = p => ay + ah - Math.sqrt(p) * ah;   // square-root scale so 0.6% is visible
    g.font = '800 15px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.fillText('Chance of a 5-star on this pull', ax, 30);
    for (let n = 1; n <= 100; n++) { const p = rate(n, o); g.fillStyle = n >= HARD && o.hard ? C.red : n >= SOFT && o.soft ? C.gold : C.player; g.fillRect(sx(n) - 1.8, sy(p), 3.6, ay + ah - sy(p)); }
    g.font = '500 11px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'right';
    [[.006, '0.6%'], [.1, '10%'], [.5, '50%'], [1, '100%']].forEach(([p, l]) => { g.fillText(l, ax - 6, sy(p) + 4); g.strokeStyle = 'rgba(205,191,159,.6)'; g.beginPath(); g.moveTo(ax, sy(p)); g.lineTo(ax + aw, sy(p)); g.stroke(); });
    g.textAlign = 'center'; [1, 20, 40, 60, 74, 90].forEach(n => g.fillText(n, sx(n), ay + ah + 14));
    if (o.soft) T.label('soft pity (community-measured)', sx(SOFT) - 10, ay + 18, 'right', C.goldInk, 11);
    if (o.hard) T.label('hard pity: 90', sx(HARD), ay + 40, 'center', C.red, 11);
    // cumulative
    const bx = 56, bw = 430, by = 290, bh = 210, csx = n => bx + n / 180 * bw, csy = p => by + bh - p * bh;
    g.textAlign = 'left'; g.font = '800 15px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.fillText('Chance you have it by pull n', bx, by - 16);
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 1; g.strokeRect(bx, by, bw, bh);
    const line = (cum, col, w, dash) => { g.strokeStyle = col; g.lineWidth = w; g.setLineDash(dash || []); g.beginPath(); for (let n = 1; n <= 180; n++) { const v = cum[Math.min(n, cum.length) - 1] ?? 1; n === 1 ? g.moveTo(csx(n), csy(v)) : g.lineTo(csx(n), csy(v)); } g.stroke(); g.setLineDash([]); };
    line(no.cum, '#9a8f78', 2.5, [6, 5]); line(st.cum, C.player, 3.5);
    g.font = '500 11px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'center'; [0, 30, 60, 90, 120, 150, 180].forEach(n => g.fillText(n, csx(n), by + bh + 14));
    g.textAlign = 'right'; [0, .5, 1].forEach(p => g.fillText(Math.round(p * 100) + '%', bx - 6, csy(p) + 4));
    const at90 = no.cum[89];
    T.label(`no pity: ${Math.round(at90 * 100)}% by pull 90`, csx(90) + 6, csy(at90) + 16, 'left', '#7a6f58', 11);
    // simulated players
    const sim = simulate(o, count), rx = 540, rw = 470, ry = 50, rh = 330, bins = 40, bwid = CAP / bins;
    const hist = Array(bins + 1).fill(0); sim.forEach(n => hist[Math.min(bins, Math.floor((n - 1) / bwid))]++);
    const hmax = Math.max(60, ...hist);
    g.textAlign = 'left'; g.font = '800 15px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.fillText(`${count} players: pulls until their first 5-star`, rx, 30);
    hist.forEach((c, i) => { const x = rx + i * (rw / (bins + 1)), h = c / hmax * rh; g.fillStyle = i === bins ? C.red : C.p3; g.fillRect(x + 1, ry + rh - h, rw / (bins + 1) - 2, h); });
    g.font = '500 11px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'center';
    [0, 50, 100, 150].forEach(n => g.fillText(n, rx + n / bwid * (rw / (bins + 1)), ry + rh + 14)); g.fillText('200+', rx + rw - 6, ry + rh + 14);
    const mean = sim.length ? sim.reduce((a, b) => a + b, 0) / sim.length : 0, worst = sim.length ? Math.max(...sim) : 0, over = sim.filter(n => n > HARD).length;
    g.textAlign = 'left';
    [[`${st.mean.toFixed(1)}`, 'pulls on average'], [`${(100 / st.mean).toFixed(2)}%`, 'consolidated rate'], [`${worst}`, 'unluckiest player'], [`${over}`, 'players past pull 90']].forEach(([v, l], i) => {
      const x = rx + (i % 2) * 240, y = 440 + Math.floor(i / 2) * 60;
      g.font = '800 24px Montserrat, Jost, sans-serif'; g.fillStyle = i === 3 && over ? C.red : C.ink; g.fillText(v, x, y);
      g.font = '500 13px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText(l, x, y + 20);
    });
  }

  const DUR = 16;
  const ACTS = [{ to: 6, o: { soft: true, hard: true } }, { to: 11, o: { soft: false, hard: false } }, { to: 16, o: { soft: true, hard: true } }];
  const scenes = {};
  canvasDemo('pity', (s, cv, g) => {
    const st = { t: 0, tour: true, held: false, key: '' };
    const soft = $(s, '.gp-soft'), hard = $(s, '.gp-hard'), tourBtn = $(s, '.gp-tour');
    soft.onchange = hard.onchange = () => { st.tour = false; tourBtn.classList.remove('on'); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    function frame(t) {
      let o, count;
      if (st.tour) { const i = ACTS.findIndex(a => t < a.to), a = ACTS[i < 0 ? 2 : i], from = i > 0 ? ACTS[i - 1].to : 0; o = a.o; count = Math.min(PLAYERS, Math.max(20, Math.round((t - from) / 3 * PLAYERS))); soft.checked = o.soft; hard.checked = o.hard; }
      else { o = { soft: soft.checked, hard: hard.checked }; count = PLAYERS; }
      draw(g, o, count);
      const key = [o.soft, o.hard].join(); if (key === st.key) return; st.key = key;
      const m = stats(o).mean;
      say($(s, '.gp-stats'), `<div><b>${m.toFixed(0)}</b><span>pulls on average</span></div><div class="${o.hard ? 'g' : 'r'}"><b>${o.hard ? '90' : 'none'}</b><span>worst case</span></div>`);
      say($(s, '.gp-out'), o.hard ? 'With pity the average drops to about 62 pulls (the published 1.6% consolidated rate) and nobody waits past 90. The uncertainty stays; the bottomless tail is gone.'
        : 'Without pity, 0.6% a pull means an average of about 167 pulls, and more than half of players have nothing by pull 90. The tail has no end.');
    }
    scenes.pity = { seek(t) { st.held = true; st.tour = true; frame(t); }, dur: () => DUR };
    return dt => { if (st.held) return; st.t += Math.max(0, dt); if (st.tour && st.t >= DUR) st.t = 0; frame(st.t); };
  });
  window.__seek = (t, which = 'pity') => scenes[which].seek(t);
  window.__dur = (which = 'pity') => scenes[which].dur();
})();
