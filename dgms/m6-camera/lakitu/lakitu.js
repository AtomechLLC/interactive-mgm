/* The camera as a character (Super Mario 64), beside the camera rig pages (DGMS M6).
   Left: the courtyard from above, with Mario and the Lakitu who films him. Right: what Lakitu's camera sees.
   Lakitu cam trails far behind and swings round lazily; Mario cam sits close and turns with him. The C buttons ask
   Lakitu to circle 45 degrees, and he refuses (with a buzz) when a wall is where he would have to hover.
   MAP is a grid ('#' wall, 'o' coin); distances, turn rates and the level are ours. The view is a small ray caster. */
(function () {
  const { txt, box, pill, clamp, lerp, C, dot, ring, key } = SCN, TAU = SCN.TAU;
  const W = 1040, H = 585, CELL = 43, OX = 14, OY = 34, VX = 546, VY = 34, VW = 480, VH = 292;
  const MAP = ['############', '#....o.....#', '#.##....##.#', '#.#..o...#.#', '#....##....#', '#o...##...o#', '#..........#', '#.#..o...#.#', '#.##....##.#', '#.....o....#', '#..o.....o.#', '############'];
  const wall = (x, y) => MAP[Math.floor(y)]?.[Math.floor(x)] === '#' || x < 0 || y < 0 || x >= 12 || y >= 12;
  const COINS = []; MAP.forEach((r, y) => r.split('').forEach((c, x) => { if (c === 'o') COINS.push([x + .5, y + .5]); }));
  const PATH = [[1.5, 6.5], [4, 6.5], [4.2, 3.6], [7.8, 3.5], [8, 6.3], [10.4, 6.5], [10.4, 9.6], [7.2, 10.2], [4, 9.6], [1.6, 9.5]];
  const MODES = { lakitu: { name: 'Lakitu cam', dist: 3.1, turn: .9, note: 'far back, slow to swing round' }, mario: { name: 'Mario cam', dist: 1.5, turn: 3.2, note: 'close behind, turns with him' } };
  const IMG = new URL('img/', document.currentScript.src).href, TOK = new URL('../../../student-tokens/256px/mario/', document.currentScript.src).href;
  const adiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
  function cast(x, y, a, max = 14) { const dx = Math.cos(a), dy = Math.sin(a); let d = 0; while (d < max) { d += .03; if (wall(x + dx * d, y + dy * d)) return d; } return max; }

  SCN.run('lakitu', s => {
    let z, mode = 'lakitu';
    const blocked = dir => { const a = z.yaw + z.off + dir * Math.PI / 4, M = MODES[mode]; return wall(z.mx - Math.cos(a) * M.dist, z.my - Math.sin(a) * M.dist) || cast(z.mx, z.my, a + Math.PI) < M.dist * .55; };
    const pick = want => { const d = [1, -1].find(d => blocked(d) === want); if (d) press(d); return d; };
    function press(dir) {
      const want = z.off + dir * Math.PI / 4, a = z.yaw + want, M = MODES[mode], tx = z.mx - Math.cos(a) * M.dist, ty = z.my - Math.sin(a) * M.dist;
      if (wall(tx, ty) || cast(z.mx, z.my, a + Math.PI) < M.dist * .55) { z.buzz = 1; z.ghost = [tx, ty]; z.msg = 'A wall is where Lakitu would have to hover, so he refuses and the game buzzes.'; SCN.tone({ f: 110, dur: .25, type: 'square', vol: .12 }); }
      else { z.off = want; z.msg = `C ${dir > 0 ? 'right' : 'left'}: you asked the cameraman to circle 45 degrees, and he flies there.`; SCN.tone({ f: 700, dur: .07, vol: .08 }); }
    }
    const api = {
      dur: 30,
      reset(tour) { if (tour) { mode = 'lakitu'; api.mark('mode', 'lakitu'); } z = { t: 0, mx: 1.5, my: 6.5, head: 0, wp: 1, yaw: 0, off: 0, cx: 0, cy: 6.5, cyaw: 0, drive: null, du: 0, dd: 0, dl: 0, dr: 0, buzz: 0, ghost: null, msg: '', pulled: false, walk: 0 }; z.cx = z.mx - 3.1; },
      step(h) {
        z.t += h; z.buzz = Math.max(0, z.buzz - h * 1.2); if (!z.buzz) z.ghost = null;
        const dvx = z.dr - z.dl, dvy = z.dd - z.du; let moving = true;
        if (dvx || dvy) { z.drive = true; const a = Math.atan2(dvy, dvx); z.head += adiff(a, z.head) * Math.min(1, h * 8); const nx = z.mx + Math.cos(a) * h * 2.2, ny = z.my + Math.sin(a) * h * 2.2; if (!wall(nx, z.my)) z.mx = nx; if (!wall(z.mx, ny)) z.my = ny; }
        else if (!z.drive) { const [tx, ty] = PATH[z.wp], d = Math.hypot(tx - z.mx, ty - z.my); if (d < .12) z.wp = (z.wp + 1) % PATH.length; else { const a = Math.atan2(ty - z.my, tx - z.mx); z.head += adiff(a, z.head) * Math.min(1, h * 6); z.mx += Math.cos(z.head) * h * 1.7; z.my += Math.sin(z.head) * h * 1.7; } }
        else moving = false;
        if (moving) z.walk += h;
        const M = MODES[mode]; z.yaw += adiff(z.head, z.yaw) * Math.min(1, h * M.turn);
        const a = z.yaw + z.off, free = cast(z.mx, z.my, a + Math.PI) - .25, dist = Math.max(.5, Math.min(M.dist, free)); z.pulled = free < M.dist;
        const tx = z.mx - Math.cos(a) * dist, ty = z.my - Math.sin(a) * dist; z.cx += (tx - z.cx) * Math.min(1, h * 5); z.cy += (ty - z.cy) * Math.min(1, h * 5);
        z.cyaw = Math.atan2(z.my - z.cy, z.mx - z.cx);
      },
      script: [[9.5, () => pick(false)], [12, () => pick(false)], [14.8, () => pick(true)], [16.4, () => pick(true)], [18, () => { mode = 'mario'; api.mark('mode', 'mario'); z.off = 0; z.msg = ''; }]],
      caption: t => t < 5 ? 'The camera in Super Mario 64 is a character: a Lakitu on a cloud, holding a camera on a fishing rod. He follows Mario from well behind.'
        : t < 9.5 ? 'When Mario turns, Lakitu swings round after him a moment late, the way a real camera operator would.'
        : t < 14.5 ? 'The C buttons do not "rotate the camera". They ask Lakitu to fly 45 degrees round Mario.'
        : t < 18 ? 'And like anyone with a body, he cannot hover inside a wall. When a wall is in the way he is pushed in close, or he refuses with a buzz.'
        : t < 24 ? 'Mario cam: the same operator, given a different brief. Closer, and quicker to turn.'
        : 'Giving the camera a body and a job explains its limits. Players forgive a cameraman for things they would never forgive a camera for.',
      status: () => z.msg || `${MODES[mode].name}: ${MODES[mode].note}. Press C left or C right, or drive Mario with W A S D.`,
      stats: () => `<div><b>${MODES[mode].dist.toFixed(1)}</b><span>cells Lakitu wants to be from Mario</span></div><div class="${z.pulled ? 'r' : 'g'}"><b>${Math.hypot(z.mx - z.cx, z.my - z.cy).toFixed(1)}</b><span>${z.pulled ? 'where the wall lets him be' : 'where he is: nothing in the way'}</span></div><div class="y"><b>${Math.round(((z.off * 180 / Math.PI) % 360 + 360) % 360)}°</b><span>circled round Mario by C presses</span></div>`,
      acts: { cl: () => press(-1), cr: () => press(1), du(v) { z.du = +!!v; }, dd(v) { z.dd = +!!v; }, dl(v) { z.dl = +!!v; }, dr(v) { z.dr = +!!v; }, auto() { z.drive = null; } },
      keys: { q: 'cl', e: 'cr' }, holds: { w: 'du', s: 'dd', a: 'dl', d: 'dr' },
      set(k, v) { if (k === 'mode') mode = v; },
      draw(g) {
        SCN.paper(g, W, H);
        const P = (x, y) => [OX + x * CELL, OY + y * CELL];
        txt(g, 'the courtyard from above', OX, 18, { size: 14, w: 800, col: C.muted }); txt(g, 'what Lakitu is filming', VX, 18, { size: 14, w: 800, col: C.muted });
        // plan
        for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) { const w = MAP[y][x] === '#'; g.fillStyle = w ? '#7a6fa8' : (x + y) % 2 ? '#a9d77f' : '#b8e08c'; g.fillRect(OX + x * CELL, OY + y * CELL, CELL, CELL); if (w) { g.fillStyle = '#5d5490'; g.fillRect(OX + x * CELL, OY + y * CELL + CELL - 7, CELL, 7); } }
        COINS.forEach(([x, y]) => { const [px, py] = P(x, y); dot(g, px, py, 7, '#f7c21c'); ring(g, px, py, 7, '#a06a00', 2); });
        const [mx, my] = P(z.mx, z.my), [cx, cy] = P(z.cx, z.cy), M = MODES[mode];
        g.save(); g.beginPath(); g.rect(OX, OY, CELL * 12, CELL * 12); g.clip();
        g.fillStyle = 'rgba(255,235,150,.35)'; g.beginPath(); g.moveTo(cx, cy); for (let i = 0; i <= 30; i++) { const a = z.cyaw - .52 + i / 30 * 1.04, d = cast(z.cx, z.cy, a, 9); g.lineTo(cx + Math.cos(a) * d * CELL, cy + Math.sin(a) * d * CELL); } g.fill();
        const a = z.yaw + z.off, wx = z.mx - Math.cos(a) * M.dist, wy = z.my - Math.sin(a) * M.dist, [wpx, wpy] = P(wx, wy);
        ring(g, mx, my, M.dist * CELL, 'rgba(21,32,68,.25)', 2); if (z.pulled) { ring(g, wpx, wpy, 13, C.red, 3); g.strokeStyle = C.red; g.setLineDash([5, 5]); g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(wpx, wpy); g.stroke(); g.setLineDash([]); }
        if (z.ghost) { const [gx, gy] = P(z.ghost[0], z.ghost[1]); g.globalAlpha = z.buzz; g.strokeStyle = C.red; g.lineWidth = 6; g.beginPath(); g.moveTo(gx - 12, gy - 12); g.lineTo(gx + 12, gy + 12); g.moveTo(gx + 12, gy - 12); g.lineTo(gx - 12, gy + 12); g.stroke(); g.globalAlpha = 1; }
        g.strokeStyle = 'rgba(21,32,68,.6)'; g.setLineDash([3, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(mx, my); g.stroke(); g.setLineDash([]);
        g.restore();
        const mi = SCN.img(TOK + 'mario-hd.png'), li = SCN.img(IMG + 'lakitu.png');
        dot(g, mx, my, 19, '#fff'); ring(g, mx, my, 19, C.red, 3); if (mi) { g.save(); g.beginPath(); g.arc(mx, my, 17, 0, TAU); g.clip(); g.drawImage(mi, mx - 21, my - 19, 42, 42); g.restore(); }
        g.fillStyle = C.red; g.beginPath(); g.moveTo(mx + Math.cos(z.head) * 30, my + Math.sin(z.head) * 30); g.lineTo(mx + Math.cos(z.head + 2.5) * 12 + Math.cos(z.head) * 18, my + Math.sin(z.head + 2.5) * 12 + Math.sin(z.head) * 18); g.lineTo(mx + Math.cos(z.head - 2.5) * 12 + Math.cos(z.head) * 18, my + Math.sin(z.head - 2.5) * 12 + Math.sin(z.head) * 18); g.fill();
        if (li) { g.save(); g.translate(cx, cy); if (Math.cos(z.cyaw) > 0) g.scale(-1, 1); g.drawImage(li, -30, -32, 62, 61); g.restore(); }
        if (z.buzz > 0) pill(g, 'BZZT: no room there', clamp(cx, 110, 430), cy - 62, { size: 14, w: 800, fill: C.red });
        // the view through his camera
        g.save(); g.beginPath(); g.roundRect(VX, VY, VW, VH, 10); g.clip();
        const sky = g.createLinearGradient(0, VY, 0, VY + VH * .42); sky.addColorStop(0, '#5aa7f0'); sky.addColorStop(1, '#bfe3ff'); g.fillStyle = sky; g.fillRect(VX, VY, VW, VH); g.fillStyle = '#9fd070'; g.fillRect(VX, VY + VH * .42, VW, VH); const hz = VY + VH * .42, FOV = 1.04, zb = [];
        for (let i = 0; i < VW; i += 2) { const ra = z.cyaw + (i / VW - .5) * FOV, d = cast(z.cx, z.cy, ra, 13) * Math.cos(ra - z.cyaw), hh = Math.min(900, 150 / Math.max(.05, d)); zb[i >> 1] = d; const sh = clamp(1 - d / 11, .25, 1); g.fillStyle = `rgb(${Math.round(122 * sh + 50)},${Math.round(111 * sh + 50)},${Math.round(168 * sh + 40)})`; g.fillRect(VX + i, hz - hh * .62, 2, hh); }
        const spr = COINS.map(([x, y]) => ({ x, y, k: 'coin' })).concat([{ x: z.mx, y: z.my, k: 'mario' }]).map(o => { const dx = o.x - z.cx, dy = o.y - z.cy, d = Math.hypot(dx, dy), ang = adiff(Math.atan2(dy, dx), z.cyaw); return { ...o, d: d * Math.cos(ang), ang }; }).filter(o => o.d > .25 && Math.abs(o.ang) < .7).sort((p, q) => q.d - p.d);
        spr.forEach(o => { const sx = VX + (o.ang / FOV + .5) * VW, col = Math.floor((sx - VX) / 2); if (zb[clamp(col, 0, VW / 2 - 1)] < o.d - .1) return; const fy = hz + 150 / o.d * .38;
          if (o.k === 'coin') { const r = 16 / o.d; g.fillStyle = '#f7c21c'; g.beginPath(); g.ellipse(sx, fy - r * 2, r * Math.abs(Math.cos(z.t * 3)) + 1, r, 0, 0, TAU); g.fill(); }
          else { const hgt = 120 / o.d; g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(sx, fy, hgt * .3, hgt * .07, 0, 0, TAU); g.fill(); if (mi) g.drawImage(mi, sx - hgt * .5, fy - hgt + Math.abs(Math.sin(z.walk * 9)) * -hgt * .05, hgt, hgt); } });
        g.restore(); box(g, VX, VY, VW, VH, { r: 10, stroke: C.navy, lw: 4 });
        pill(g, '● REC  ' + M.name, VX + 14, VY + 22, { size: 14, w: 800, fill: 'rgba(0,0,0,.6)', align: 'left' });
        // the cameraman's card
        const cy0 = VY + VH + 14; box(g, VX, cy0, VW, H - cy0 - 16, { r: 12, fill: '#fffaf0', stroke: '#cdbf9f' });
        if (li) g.drawImage(li, VX + 8, cy0 + 26, 130, 127);
        txt(g, 'Lakitu, camera operator', VX + 150, cy0 + 28, { size: 21, w: 800, display: true });
        [['Brief', M.note], ['Body', z.pulled ? 'a wall behind him: pushed in close' : 'hovering where he wants to be'], ['C buttons', z.buzz > 0 ? 'refused: a wall is there' : 'ask him to circle 45° round Mario'], ['R button', 'gives him the other brief']].forEach(([k, v], i) => { const y = cy0 + 64 + i * 34; txt(g, k, VX + 150, y, { size: 13, w: 800, col: C.muted }); txt(g, v, VX + 232, y, { size: 14.5, w: 700, col: (i === 1 && z.pulled) || (i === 2 && z.buzz > 0) ? C.red : C.ink }); });
      },
    };
    return api;
  });
})();
