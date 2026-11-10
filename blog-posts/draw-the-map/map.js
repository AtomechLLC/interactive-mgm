/* Draw the Map (replanned page for the Battle Royale post; Scripture: Situational Value, Zoning and Spacing).
   The learner paints a map. Every pair of standable cells with a clear line between them is a sightline; its length puts
   it in one weapon role's range band. Nothing is simulated: the shares are counted from the learner's own geometry. */
(function () {
  const C = TD.C;
  const GW = 32, GH = 18, CS = 20, M = 15, MX = 20, MY = 50;      // 32 x 18 cells of 15 m
  const ROLES = [['Shotgun', 20, C.red], ['SMG', 50, '#e0a92d'], ['Rifle', 120, C.player], ['Marksman', 220, C.purple], ['Sniper', 1e9, C.navy]];
  const band = d => ROLES.findIndex(r => d < r[1]);
  const ZX = 4, ZY = 2;
  let tool = 1;
  const R = GK.rng(5);
  const town = (x, y) => (x % 3 === 2 || y % 3 === 2) && (x * 3 + y * 5) % 7 ? 0 : 2;
  const PRESETS = [
    () => 0,
    town,
    (x, y) => { const v = (x * 7 + y * 13 + ((x * y) % 5)) % 16; return v === 0 ? 2 : v < 3 ? 1 : 0; },
    (x, y) => y < 8 ? 0 : y === 8 ? (x % 5 ? 1 : 0) : x < 16 ? town(x, y) : ((x * 5 + y * 3 + (x * y) % 3) % 5 < 2 ? 1 : 0),
    () => 0,
  ];
  const make = p => Array.from({ length: GH }, (_, y) => Array.from({ length: GW }, (_, x) => PRESETS[p](x, y)));

  function measure(grid) {
    const cells = []; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (grid[y][x] !== 1) cells.push([x, y]);
    const tot = [0, 0, 0, 0, 0], zone = Array.from({ length: ZX * ZY }, () => [0, 0, 0, 0, 0]), hist = new Array(40).fill(0);
    let watched = 0, open = 0;
    const seenFar = new Uint8Array(GW * GH);
    const zi = (x, y) => Math.min(ZY - 1, Math.floor(y / (GH / ZY))) * ZX + Math.min(ZX - 1, Math.floor(x / (GW / ZX)));
    for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) {
      const [ax, ay] = cells[i], [bx, by] = cells[j], ta = grid[ay][ax], tb = grid[by][bx];
      const dx = bx - ax, dy = by - ay, n = Math.max(Math.abs(dx), Math.abs(dy));
      if (ta !== tb && n > 1) continue;                      // a wall between inside and outside, except at the wall itself
      let ok = true;
      for (let k = 1; k < n && ok; k++) { const t = grid[Math.round(ay + dy * k / n)][Math.round(ax + dx * k / n)]; if (t !== ta) ok = false; }
      if (!ok) continue;
      const d = Math.hypot(dx, dy) * M, b = band(d);
      tot[b]++; zone[zi((ax + bx) >> 1, (ay + by) >> 1)][b]++;   // a fight belongs to the zone its midpoint is in
      hist[Math.min(39, Math.floor(d / 12.5))]++;
      if (d >= 120) { seenFar[ay * GW + ax] = 1; seenFar[by * GW + bx] = 1; }
    }
    cells.forEach(([x, y]) => { if (grid[y][x] === 0) { open++; if (seenFar[y * GW + x]) watched++; } });
    const sum = tot.reduce((a, b) => a + b, 0) || 1;
    const dom = zone.map(z => { const s = z.reduce((a, b) => a + b, 0); return s ? z.indexOf(Math.max(...z)) : -1; });
    return { share: tot.map(v => v / sum), dom, hist, distinct: new Set(dom.filter(d => d >= 0)).size, exposed: open ? watched / open : 0, lines: sum };
  }

  PLAY.game('drawmap', {
    dur: 24, keys: [],
    opts: s => ({ preset: +(s.querySelector('.dm-pre .on')?.dataset.v ?? 3) }),
    tourOpts: { preset: 0 },
    setup(s, api) {
      const tb = [...s.querySelectorAll('.dm-tool .btn')], pb = [...s.querySelectorAll('.dm-pre .btn')];
      tb.forEach(b => b.onclick = () => { tool = +b.dataset.v; tb.forEach(x => x.classList.toggle('on', x === b)); });
      pb.forEach(b => b.onclick = () => { pb.forEach(x => x.classList.toggle('on', x === b)); api.start(); });
    },
    init(o, live) { const grid = make(o.preset); return { live, t: 0, grid, m: measure(grid), dirty: false, since: 0, preset: o.preset, painted: false }; },
    step(st, inp, dt) {
      st.t += dt;
      if (!st.live) { const p = Math.floor(st.t / 6) % 4; if (p !== st.preset) { st.preset = p; st.grid = make(p); st.m = measure(st.grid); } return; }
      if (inp.drag) {
        const x = Math.floor((inp.mouse[0] - MX) / CS), y = Math.floor((inp.mouse[1] - MY) / CS);
        if (x >= 0 && y >= 0 && x < GW && y < GH && st.grid[y][x] !== tool) { st.grid[y][x] = tool; st.dirty = true; st.painted = true; }
      }
      st.since += dt;
      if (st.dirty && (!inp.drag || st.since > .35)) { st.m = measure(st.grid); st.dirty = false; st.since = 0; }
    },
    bot: () => null,
    draw(g, st, ui, live) {
      GK.panel(g);
      const m = st.m;
      GK.head(g, live ? 'Your map: click and drag to paint' : ['Open fields', 'Dense town', 'Mixed everywhere', 'Distinct zones'][st.preset], MX, 34, 'left', C.ink, 17);
      GK.text(g, '480 m × 270 m', MX + GW * CS, 34, C.muted, 12, 'right', 600);
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
        const t = st.grid[y][x], px = MX + x * CS, py = MY + y * CS;
        g.fillStyle = t === 2 ? '#b9a98c' : (x + y) % 2 ? '#bfe0a8' : '#b6d99f'; g.fillRect(px, py, CS, CS);
        if (t === 1) { g.fillStyle = '#3f7d4a'; g.beginPath(); g.arc(px + CS / 2, py + CS / 2, CS * .46, 0, TD.TAU); g.fill(); g.fillStyle = '#2f6238'; g.beginPath(); g.arc(px + CS / 2 + 2, py + CS / 2 + 2, CS * .22, 0, TD.TAU); g.fill(); }
        if (t === 2) { g.strokeStyle = '#8c7a5c'; g.lineWidth = 1; g.strokeRect(px + .5, py + .5, CS - 1, CS - 1); }
      }
      // zones and the weapon that owns each
      const zw = GW * CS / ZX, zh = GH * CS / ZY;
      m.dom.forEach((d, i) => {
        const x = MX + (i % ZX) * zw, y = MY + Math.floor(i / ZX) * zh;
        g.setLineDash([6, 6]); g.strokeStyle = 'rgba(21,32,68,.55)'; g.lineWidth = 1.5; g.strokeRect(x, y, zw, zh); g.setLineDash([]);
        if (d >= 0) TD.label(ROLES[d][0], x + zw / 2, y + 16, 'center', '#fff', 12, ROLES[d][2]);
      });
      g.strokeStyle = C.navy; g.lineWidth = 2; g.strokeRect(MX, MY, GW * CS, GH * CS);
      if (live && !st.painted) TD.stamp('Drag on the map to paint', MX + GW * CS / 2, MY + GH * CS / 2, C.navy, 1, 20);
      // histogram of sightline lengths under the map
      const HX = MX, HY = MY + GH * CS + 34, HW = GW * CS, HH = 96, mx = Math.max(1, ...m.hist);
      GK.text(g, 'Every sightline on the map, by length', HX, HY - 8, C.muted, 12, 'left', 700);
      m.hist.forEach((v, i) => { const d = i * 12.5 + 6; g.fillStyle = ROLES[band(d)][2]; const h = v / mx * HH; g.fillRect(HX + i * HW / 40 + 1, HY + HH - h, HW / 40 - 2, h); });
      g.strokeStyle = '#cdbf9f'; g.lineWidth = 1.5; g.strokeRect(HX, HY, HW, HH);
      [0, 100, 200, 300, 400, 500].forEach(d => GK.text(g, d + ' m', HX + d / 500 * HW, HY + HH + 15, C.muted, 11, d ? (d === 500 ? 'right' : 'center') : 'left', 600));
      // shares
      const RX = 690, RW = 330;
      GK.head(g, 'Whose fight is it?', RX, 34, 'left', C.ink, 17);
      GK.text(g, 'share of sightlines in each weapon\'s range', RX, 54, C.muted, 12, 'left', 600);
      ROLES.forEach(([n, , col], i) => {
        const y = 74 + i * 44, v = m.share[i];
        GK.text(g, n, RX, y + 15, C.ink, 14, 'left', 700);
        GK.text(g, i ? `${ROLES[i - 1][1]}${i < 4 ? ' to ' + ROLES[i][1] : '+'} m` : 'under 20 m', RX, y + 31, C.muted, 11, 'left', 500);
        PLAY.bar(g, RX + 96, y + 6, 170, 18, v, col); GK.text(g, PLAY.pct(v), RX + RW, y + 21, C.ink, 15, 'right', 800);
      });
      const top = m.share.indexOf(Math.max(...m.share)), low = m.share.indexOf(Math.min(...m.share));
      GK.big(g, `${m.distinct} of 5`, 'weapon roles own at least one of the 8 zones', RX, 330);
      GK.big(g, PLAY.pct(m.exposed), 'of open ground is watched from 120 m or more', RX, 392, m.exposed > .8 ? C.redDk : C.ink);
      GK.big(g, m.lines.toLocaleString(), 'sightlines measured', RX, 454);
      ui.stats(`<div><b>${PLAY.pct(m.share[top])}</b><span>${ROLES[top][0]}: the largest share</span></div><div class="r"><b>${PLAY.pct(m.share[low])}</b><span>${ROLES[low][0]}: the smallest</span></div><div class="y"><b>${m.distinct}</b><span>weapon roles own at least one zone</span></div>`);
      ui.out(m.share[low] < .02 ? `${ROLES[low][0]}s get ${PLAY.pct(m.share[low])} of the sightlines on this map and ${ROLES[top][0].toLowerCase()}s get ${PLAY.pct(m.share[top])}. No damage buff gives a weapon a fight the map never offers at its range.`
        : m.distinct <= 2 ? 'No weapon is shut out here, and nearly every zone belongs to the same one. Nothing on the map tells a squad where to go for the fight they are equipped for.'
        : `${m.distinct} weapon roles each own a zone. The map now has places with a character, and a squad carrying the wrong loadout for the zone it lands in loses there.`);
    },
  });
})();
