/* Cluster the clutter (The Level Design Book: Environment art, "Clustering")
   The book's recipe for natural set dressing: place one rock, then duplicate, shrink, rotate and slightly offset it, and
   repeat, so the result has a few groups with a size hierarchy inside each. Proximity and similarity make the eye read
   a group as one thing. The same pieces can be slid from those clusters to an even scatter.
   Counts are measured from the positions: a "group" is a set of pieces standing within reach of one another, and the
   clear ground is the widest circle that touches no piece. The clearing and the patrol are our own additions. */
(function () {
  const { $, canvasDemo, say } = FPF.kit, E = EA, W = E.W, H = E.H, HZ = 168, MAXN = 36;
  const depth = y => E.lerp(.5, 1.12, (y - HZ) / (H - HZ));
  function make(seed) {
    const r = E.rng(seed), C = [[205, 300, 0], [585, 420, 1], [865, 268, 2]], per = [[], [], []], items = [];
    // scatter homes: a jittered grid, visited in a shuffled order
    const cells = []; for (let j = 0; j < 4; j++) for (let i = 0; i < 9; i++) cells.push([60 + i * 115 + (j % 2) * 50 + (r() - .5) * 60, 222 + j * 96 + (r() - .5) * 46]);
    for (let i = cells.length - 1; i > 0; i--) { const k = Math.floor(r() * (i + 1));[cells[i], cells[k]] = [cells[k], cells[i]]; }
    for (let n = 0; n < MAXN; n++) {
      const k = n < 7 ? 0 : n % 3, c = C[k], mem = per[k]; let it;
      if (!mem.length) it = { cx: c[0], cy: c[1], cs: 1.5, type: k === 2 ? 'tree' : 'rock' };
      else {
        const p = mem[Math.floor(Math.pow(r(), 1.6) * Math.min(mem.length, 4))], a = r() * 6.28, dist = p.cs * (40 + r() * 20);
        it = { cx: p.cx + Math.cos(a) * dist * 1.25, cy: E.clamp(p.cy + Math.sin(a) * dist * .5, 200, 560), cs: Math.max(.36, p.cs * (.62 + r() * .16)), type: k === 0 ? 'rock' : k === 1 ? (r() < .55 ? 'rock' : 'bush') : (r() < .5 ? 'tree' : r() < .5 ? 'bush' : 'rock') };
        if (it.type === 'tree') it.cs = Math.max(.6, it.cs);
      }
      it.sx = cells[n][0]; it.sy = cells[n][1]; it.ss = .78; it.seed = 3 + Math.floor(r() * 900); it.rot = r() < .5 ? 1 : -1;
      mem.push(it); items.push(it);
    }
    return items;
  }
  canvasDemo('cluster', (s, cv, g) => {
    const st = { n: 18, spread: 0, seed: 12 }; let items = make(st.seed), P = [], clock = 0;
    const sc = E.canvas(W, H), x = sc.getContext('2d');
    function field() {
      x.clearRect(0, 0, W, H); E.sky(x, W, HZ + 2, 3, { seed: 63, city: false });
      x.fillStyle = E.hsl(120, 22, 60); x.beginPath(); x.moveTo(0, HZ); for (let i = 0; i <= 26; i++) x.lineTo(i * 40, HZ - 16 - Math.sin(i * .55) * 12 - Math.sin(i * 1.7) * 5); x.lineTo(W, HZ + 4); x.lineTo(0, HZ + 4); x.fill();
      const k = x.createLinearGradient(0, HZ, 0, H); k.addColorStop(0, E.hsl(84, 30, 62)); k.addColorStop(1, E.hsl(70, 32, 52)); x.fillStyle = k; x.fillRect(0, HZ, W, H - HZ);
      const r = E.rng(8); for (let i = 0; i < 90; i++) { const yy = HZ + 8 + r() * (H - HZ), d = depth(yy); x.fillStyle = E.hsl(78 + r() * 20, 30, 46 + r() * 20, .5); x.beginPath(); x.ellipse(r() * W, yy, (20 + r() * 40) * d, (3 + r() * 4) * d, 0, 0, 7); x.fill(); }
    }
    function layout() {
      const t = E.ease(st.spread);
      P = items.slice(0, st.n).map(it => ({ it, x: E.lerp(it.cx, it.sx, t), y: E.lerp(it.cy, it.sy, t), s: E.lerp(it.cs, it.ss, t) }));
      // groups: pieces within reach of each other (depth counts double, the way the ground plane is foreshortened)
      const par = P.map((_, i) => i), find = i => par[i] === i ? i : (par[i] = find(par[i]));
      for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) if (Math.hypot(P[i].x - P[j].x, (P[i].y - P[j].y) * 2) < 46 * (P[i].s + P[j].s)) par[find(i)] = find(j);
      const groups = new Set(P.map((_, i) => find(i))).size;
      let best = 0, bx = 0, by = 0;
      for (let yy = 230; yy <= 540; yy += 10) for (let xx = 40; xx <= W - 40; xx += 10) { let m = Math.min(xx, W - xx, (yy - 200) * 2, (H - yy) * 2); for (const p of P) m = Math.min(m, Math.hypot(xx - p.x, (yy - p.y) * 2) - 30 * p.s); if (m > best) { best = m; bx = xx; by = yy; } }
      st.clear = { r: best, x: bx, y: by };
      const sizes = P.map(p => p.s), ratio = Math.max(...sizes) / Math.min(...sizes);
      $(s, '.cl-nv').textContent = st.n + (st.n === 1 ? ' piece' : ' pieces'); $(s, '.cl-sv').textContent = st.spread < .08 ? 'clusters' : st.spread > .92 ? 'even scatter' : Math.round(st.spread * 100) + '%';
      const many = groups > 6 && st.n > 8;
      say($(s, '.cl-stats'),
        `<div class="${many ? 'r' : 'g'}"><b>${groups}</b><span>${groups === 1 ? 'group' : 'groups'} for the eye to read, from ${st.n} ${st.n === 1 ? 'piece' : 'pieces'}</span></div>` +
        `<div class="${best < 120 ? 'y' : 'g'}"><b>${(best * 2 / 40).toFixed(1)} m</b><span>across the widest clear ground left for play</span></div>` +
        `<div><b>${ratio.toFixed(1)}×</b><span>largest piece against the smallest</span></div>`);
      say($(s, '.cl-out'), st.n === 1 ? '<b class="accent">Place one rock.</b> Then press the button: each press makes a copy, shrinks it, turns it and sets it a little to one side of a piece that is already there.'
        : st.n < 8 ? '<b class="accent">Duplicate, shrink, rotate, offset.</b> The outcrop grows as one shape with a parent and children. Keep going: the next pieces start two more clusters.'
        : many ? '<b class="accent">The same pieces, read one at a time.</b> Spread evenly at one size, every rock and tree is its own item, and there is no open ground left to fight on or to rest the eye.'
        : st.spread > .3 ? '<b class="accent">Coming apart.</b> As the clusters loosen, the count of separate things climbs and the clearing shrinks.'
        : `<b class="accent">${st.n} pieces, ${groups} things to read.</b> Big, medium and small sit together, so each cluster reads as one outcrop or one copse, and the ground between them stays open. Now drag the spread slider.`);
    }
    $(s, '.cl-n').oninput = e => { st.n = +e.target.value; layout(); };
    $(s, '.cl-s').oninput = e => { st.spread = +e.target.value; layout(); };
    $(s, '.cl-add').onclick = () => { st.n = Math.min(MAXN, st.n + 1); $(s, '.cl-n').value = st.n; layout(); };
    $(s, '.cl-roll').onclick = () => { st.seed = st.seed * 7 % 9973 + 5; items = make(st.seed); layout(); };
    field(); layout();
    window.__clusterSet = o => { Object.assign(st, o); if (o.seed) items = make(st.seed); if (o.clock != null) clock = o.clock; $(s, '.cl-n').value = st.n; $(s, '.cl-s').value = st.spread; layout(); };
    return dt => {
      clock += Math.min(dt, .05);
      g.clearRect(0, 0, W, H); g.save(); g.beginPath(); g.roundRect(0, 0, W, H, 14); g.clip(); g.drawImage(sc, 0, 0);
      const c = st.clear;
      if (st.n > 1 && c.r > 30) { g.save(); g.setLineDash([8, 7]); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(c.x, c.y, c.r, c.r / 2, 0, 0, 7); g.stroke(); g.restore(); }
      // a patrol crosses the field and comes back; it faces the way it is walking on both legs of the trip
      const per = 16, ph = (clock % per) / per, right = ph < .5, wx = right ? E.lerp(-30, W + 30, ph * 2) : E.lerp(W + 30, -30, ph * 2 - 1), wy = 404;
      const all = P.map(p => ({ y: p.y, f: () => p.it.type === 'rock' ? E.rock(g, p.x, p.y, p.s * depth(p.y) * 1.05, p.it.seed, p.it.rot) : p.it.type === 'tree' ? E.tree(g, p.x, p.y, p.s * depth(p.y) * .92, p.it.seed) : (E.shadow(g, p.x + 4, p.y + 2, 30 * p.s * depth(p.y), 7 * p.s * depth(p.y)), E.bush(g, p.x, p.y, 26 * p.s * depth(p.y), p.it.seed, 4)) }));
      all.push({ y: wy, f: () => E.figure(g, wx, wy, { pose: 'walk', t: clock, face: right ? 1 : -1, col: [278, 34, 40], s: depth(wy) * .98 }) });
      all.sort((a, b) => a.y - b.y).forEach(o => o.f());
      if (st.n > 1 && c.r > 60) E.label(g, 'widest clear ground', c.x, c.y, { size: 13 });
      g.restore();
    };
  });
})();
