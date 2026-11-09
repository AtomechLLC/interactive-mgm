/* Weapon roles (genre breakdown: "Battle Royale Game Design").
   Five weapon roles as damage per second against distance. Each role has a base DPS, a range where it starts to fall
   off and a floor; the chart highlights the role that wins at the slider's distance, and the side bar shows time to
   take down 200 health. All numbers are illustrative, chosen so each role owns one band of distance. */
(function () {
  const C = TD.C, { clamp, lerp } = TD;
  const HP = 200, MAXD = 200;
  // [name, colour, dps up close, falloff starts (m), falloff ends (m), share of dps kept after]
  const ROLES = [
    ['Shotgun', C.red, 420, 4, 12, .02],
    ['SMG', '#d08a12', 230, 22, 45, .25],
    ['Assault rifle', C.player, 165, 40, 90, .35],
    ['Marksman rifle', C.p2, 120, 70, 150, .55],
    ['Sniper rifle', C.purple, 95, 300, 400, 1],
  ];
  // close-range sway: scoped weapons are hard to land up close
  const dps = (r, d) => {
    const [, , base, a, b, keep] = r; let v = base * lerp(1, keep, clamp((d - a) / (b - a)));
    if (r[0] === 'Sniper rifle') v *= lerp(.25, 1, clamp(d / 40)); if (r[0] === 'Marksman rifle') v *= lerp(.6, 1, clamp(d / 25));
    return v;
  };
  const best = d => ROLES.reduce((m, r) => dps(r, d) > dps(m, d) ? r : m, ROLES[0]);

  GK.scene('ranges', (s, g, ui) => {
    const dEl = s.querySelector('.br-d'), dv = s.querySelector('.br-dv'); ui.watch(dEl);
    const DUR = 16;
    return {
      dur: DUR,
      frame(t, tour) {
        let d = +dEl.value;
        if (tour) { const k = (t % DUR) / DUR; d = Math.round(2 + (k < .85 ? TD.ease(k / .85) : 1) * 178); dEl.value = d; }
        dv.textContent = d + ' m';
        GK.panel(g);
        const ax = 70, ay = 52, aw = 600, ah = 420;
        GK.head(g, 'Damage per second against distance', ax, 32);
        const A = GK.axes(g, ax, ay, aw, ah, { x0: 0, x1: Math.sqrt(MAXD), y0: 0, y1: 450, xt: [0, 5, 10, 25, 50, 100, 200].map(Math.sqrt), yt: [0, 100, 200, 300, 400], fmtX: v => Math.round(v * v) + ' m', xl: 'distance to the target (square-root scale, so close range gets room)' });
        const sx = v => A.sx(Math.sqrt(v)), sy = A.sy;
        // bands owned by each role
        let prev = best(0), from = 0;
        for (let x = 1; x <= MAXD + 1; x++) {
          const b = x > MAXD ? null : best(x);
          if (b !== prev) { g.fillStyle = prev[1]; g.globalAlpha = .1; g.fillRect(sx(from), ay, sx(x) - sx(from), ah); g.globalAlpha = 1; GK.text(g, prev[0], (sx(from) + sx(x)) / 2, ay + ah - 8, prev[1], 11, 'center', 700); prev = b; from = x; }
        }
        ROLES.forEach(r => { const pts = []; for (let x = 0; x <= MAXD; x += 1) pts.push([sx(x), sy(Math.min(450, dps(r, x)))]); GK.line(g, pts, r[1], r === best(d) ? 5 : 2.5); });
        g.strokeStyle = C.navy; g.lineWidth = 2; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(sx(d), ay); g.lineTo(sx(d), ay + ah); g.stroke(); g.setLineDash([]);
        // top-down: you and the target at this distance
        const ty = 535, tx0 = sx(0) + 20, tx1 = sx(d) + 20;
        g.fillStyle = '#ddd2bc'; g.fillRect(70, ty - 26, aw, 52);
        TD.player(tx0, ty, 0, .8); TD.foe(Math.max(tx0 + 40, tx1), ty, 15, Math.PI, C.red);
        GK.text(g, `${d} m`, (tx0 + Math.max(tx0 + 40, tx1)) / 2, ty + 5, C.navy, 13, 'center', 700);
        // ranking
        const rx = 720, rw = 290;
        GK.head(g, `Time to take down ${HP} health at ${d} m`, rx, 32);
        const sorted = ROLES.slice().sort((a, b) => dps(b, d) - dps(a, d));
        sorted.forEach((r, i) => {
          const y = 56 + i * 82, ttk = HP / Math.max(1, dps(r, d)), w = clamp(.35 / ttk) * rw;
          GK.box(g, rx, y, rw, 70, i ? '#fffaf0' : '#fff4d6', i ? '#cdbf9f' : r[1], 10, i ? 2 : 3);
          GK.head(g, r[0], rx + 12, y + 24, 'left', r[1], 15);
          GK.text(g, ttk > 9.9 ? 'over 10 s' : ttk.toFixed(2) + ' s', rx + rw - 12, y + 24, C.ink, 15, 'right', 700);
          g.fillStyle = r[1]; g.fillRect(rx + 12, y + 38, Math.max(4, w - 24), 14);
          if (!i) GK.text(g, 'wins here', rx + rw - 12, y + 62, C.goldInk, 11, 'right', 700);
        });
        const w = best(d);
        ui.stats(`<div class="g"><b style="font-size:22px">${w[0]}</b><span>wins at ${d} m</span></div><div><b>${(HP / dps(w, d)).toFixed(2)} s</b><span>to take down ${HP} health</span></div>`);
        ui.out(`Every role owns a band of distance and loses outside it. A clear role tells players what to pick up, what to carry and when to close in or back off; the loadout becomes a decision about which fights you want.`);
      },
    };
  });
})();
