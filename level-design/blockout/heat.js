/* Read the heatmap (The Level Design Book: Playtesting)
   Twenty simulated testers walk a small blockout. The hall has two doors: north is a dead end that looks inviting, east
   leads on, through a crossing watched by a turret. Every frame each tester adds time to the 20 px cell they stand in,
   which is all a movement heatmap is; deaths are stamped where they happen.
   Two fixes change the odds: lighting the east door (dead end first: 60% down to 15%) and adding cover in the crossing
   (death per attempt: 50% down to 12%). The odds are our illustrative numbers. The book's point is the reading:
   look for unhealthy clumping, then fix the problem the data shows, which is not always the fix a tester asks for. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp } = TD;
  const W = 1040, H = 585, N = 20, CELL = 20, GAP = .7, SPEED = 170, GW = W / CELL, GH = Math.ceil(H / CELL);
  const P = PLAN.make();
  P.rect('S', 50, 300, 150, 380, { lab: 'start' });
  P.rect('Hh', 150, 220, 430, 460, { cham: [0, 1, 2, 3], k: 36 });
  P.rect('D', 200, 70, 380, 220, { cham: [0, 1], k: 30, tint: '#efe6d2' });
  P.rect('Cx', 430, 300, 540, 380);
  P.rect('Tt', 540, 200, 820, 480, { cham: [0, 1, 2, 3], k: 40 });
  P.rect('E', 820, 300, 960, 380, { tint: '#f6e6bc' });
  P.door('S', 'Hh', [150, 340], 90, 'arch'); P.door('Hh', 'D', [290, 220], 0); P.door('Hh', 'Cx', [430, 340], 90, 'arch');
  P.door('Cx', 'Tt', [540, 340], 90, 'arch'); P.door('Tt', 'E', [820, 340], 90, 'arch');
  P.prop('planter', 250, 110, 12); P.prop('crate', 340, 120, 10, .3); P.prop('table', 290, 100, 9); [[220, 400], [370, 280]].forEach(([x, y]) => P.prop('column', x, y, 7));
  const TURRET = [680, 232], COVER = [[630, 318], [716, 356]];
  const rnd = (i, seed) => { let x = (i * 374761393 + seed * 668265263) >>> 0; x = (x ^ (x >>> 13)) * 1274126177 >>> 0; return (x >>> 8) / 16777216; };

  canvasDemo('heat', (s, cv, g) => {
    let light = false, cover = false, view = 'move', seed = 3, t = 0, sim = null, heat = null, speed = 4;
    const plan = P.render(W, H), hc = document.createElement('canvas'); hc.width = GW; hc.height = GH; const hg = hc.getContext('2d');
    function run() {
      const pWrong = light ? .15 : .6, pDie = cover ? .12 : .5; let r = 0;
      sim = Array.from({ length: N }, (_, i) => {
        const R = k => rnd(i * 31 + (r++), seed + k), path = T.Path([100, 340], SPEED).wait(i * GAP), deaths = [];
        const j = () => (R(1) - .5) * 34, go = (x, y) => path.go(x, y);
        go(170, 340 + j()); go(250 + R(2) * 60, 330 + j());
        const wrong = R(3) < pWrong;
        if (wrong) { go(290, 240); go(290, 200); const n = 3 + Math.floor(R(4) * 4); for (let q = 0; q < n; q++) { go(225 + R(5) * 130, 95 + R(6) * 95); path.wait(.5 + R(7) * 1.4); } go(290, 200); go(290, 240); go(330, 330 + j()); }
        go(430, 340 + j() * .5); go(545, 340);
        for (let a = 0; a < 4; a++) {
          const lane = 340 + j() * 1.4;
          if (a < 3 && R(8) < pDie) { const dx = 600 + R(9) * 170; go(dx, lane); deaths.push({ t: path.t, x: dx, y: lane }); path.wait(.9); path.go(545, 340, 9999); path.wait(.5); continue; }
          if (cover) { go(612, 336); path.wait(.5 + R(10)); go(700, 374); path.wait(.4 + R(11) * .8); }
          go(800, lane); break;
        }
        go(825, 340); go(915, 340);
        return { path, wrong, deaths, start: i * GAP, end: path.t };
      });
      heat = new Float32Array(GW * GH); t = 0; sim.end = Math.max(...sim.map(w => w.end)); stats();
    }
    function tick(dt) {
      const t1 = Math.min(sim.end, t + dt);
      for (let x = t; x < t1; x += .05) sim.forEach(w => { if (x < w.start || x > w.end) return; const p = w.path.at(x); heat[Math.floor(p.y / CELL) * GW + Math.floor(p.x / CELL)] += .05; });
      t = t + dt;
    }
    function stats() {
      const done = sim.filter(w => t >= w.end), wrong = sim.filter(w => w.wrong && t >= w.start + 3).length, deaths = sim.reduce((m, w) => m + w.deaths.filter(d => d.t <= t).length, 0);
      const times = done.map(w => w.end - w.start).sort((a, b) => a - b), med = times.length ? times[Math.floor(times.length / 2)] : 0;
      // clumping: share of all tester-seconds spent in the dead-end room and in the crossing
      let tot = 0, dead = 0, cross = 0; heat.forEach((v, i) => { const x = (i % GW) * CELL, y = Math.floor(i / GW) * CELL; tot += v; if (y < 220 && x >= 200 && x < 380) dead += v; if (x >= 540 && x < 820) cross += v; });
      const fin = t >= sim.end;
      say($(s, '.ht-stats'),
        `<div class="${wrong > 8 ? 'r' : wrong > 3 ? 'y' : 'g'}"><b>${wrong}/${N}</b><span>walked into the dead end first${tot ? ` (${Math.round(dead / tot * 100)}% of all time spent there)` : ''}</span></div>` +
        `<div class="${deaths > 10 ? 'r' : deaths > 4 ? 'y' : 'g'}"><b>${deaths}</b><span>deaths in the crossing${tot ? ` (${Math.round(cross / tot * 100)}% of all time spent there)` : ''}</span></div>` +
        `<div><b>${fin ? med.toFixed(0) + 's' : `${done.length}/${N}`}</b><span>${fin ? 'median time from start to exit' : 'testers finished so far'}</span></div>`);
      say($(s, '.ht-out'), !light && !cover ? '<b class="accent">Two clumps, two different problems.</b> The hot patch up north is confusion: testers wander a room that leads nowhere. The cluster of deaths is difficulty. A heatmap shows where, and it is your job to work out why.'
        : light && !cover ? '<b class="accent">One clump gone.</b> A light on the east door fixed the wandering without closing the dead end. The deaths have not moved: a tester might ask for a weaker turret, but the problem they revealed is a crossing with nowhere to hide.'
        : !light && cover ? '<b class="accent">The crossing is fair now.</b> Testers pause behind cover, so that area is still warm, but few die there. Warm is not the same as broken. The dead end is still pulling most players the wrong way.'
        : '<b class="accent">Both fixed, and it shows.</b> Heat follows the route, with warm spots where players pause behind cover. Then test again with new players: the book’s advice is to playtest early and often, since each fix can hide the next problem.');
    }
    $(s, '.ht-light').onchange = e => { light = e.target.checked; seed++; run(); };
    $(s, '.ht-cover').onchange = e => { cover = e.target.checked; seed++; run(); };
    $$(s, '.ht-view .btn').forEach(b => b.onclick = () => { view = b.dataset.v; $$(s, '.ht-view .btn').forEach(x => x.classList.toggle('on', x === b)); });
    $(s, '.ht-run').onclick = () => { seed++; run(); };
    run();
    window.__heatSet = (l, c, v, tt = 999) => { light = l; cover = c; view = v || 'move'; $(s, '.ht-light').checked = l; $(s, '.ht-cover').checked = c; $$(s, '.ht-view .btn').forEach(x => x.classList.toggle('on', x.dataset.v === view)); run(); tick(Math.min(tt, sim.end + 1)); stats(); };

    let acc = 0;
    return dt => {
      if (t < sim.end + 1) { tick(dt * speed); if ((acc += dt) > .2) { acc = 0; stats(); } }
      T.use(g); g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
      g.drawImage(plan, 0, 0);
      if (light) { const gr = g.createRadialGradient(430, 340, 8, 430, 340, 120); gr.addColorStop(0, 'rgba(255,214,120,.75)'); gr.addColorStop(1, 'rgba(255,214,120,0)'); g.fillStyle = gr; g.fillRect(300, 210, 260, 260); }
      // the heatmap: one coloured cell per 20 px, smoothed when it is scaled up
      if (view === 'move') {
        let max = 0; heat.forEach(v => { if (v > max) max = v; }); const im = hg.createImageData(GW, GH);
        heat.forEach((v, i) => { const k = Math.sqrt(v / Math.max(6, max)); im.data[i * 4] = 255; im.data[i * 4 + 1] = Math.round(190 * (1 - k)); im.data[i * 4 + 2] = Math.round(40 * (1 - k)); im.data[i * 4 + 3] = v > 0 ? Math.round(60 + 170 * k) : 0; });
        hg.putImageData(im, 0, 0); g.save(); g.imageSmoothingEnabled = true; g.globalAlpha = .85; g.drawImage(hc, 0, 0, W, GH * CELL); g.restore();
      }
      T.cone(TURRET[0], TURRET[1], Math.PI / 2, .62, 190, .7); T.foe(TURRET[0], TURRET[1], 15, Math.PI / 2, C.red, { mark: 'scope' });
      if (cover) COVER.forEach(([x, y]) => T.pillar(x - 15, y - 15, 30, 30));
      T.flag(915, 336); T.label('dead end', 290, 52, 'center', C.muted, 13); T.label('crossing', 680, 500, 'center', C.muted, 13);
      sim.forEach(w => {
        w.deaths.forEach(d => { if (d.t > t) return; g.strokeStyle = view === 'deaths' ? C.redDk : 'rgba(168,32,28,.75)'; g.lineWidth = view === 'deaths' ? 4 : 2.5; const r = view === 'deaths' ? 8 : 5; g.beginPath(); g.moveTo(d.x - r, d.y - r); g.lineTo(d.x + r, d.y + r); g.moveTo(d.x + r, d.y - r); g.lineTo(d.x - r, d.y + r); g.stroke(); });
        if (t < w.start || t > w.end) return; const p = w.path.at(t); T.player(p.x, p.y, p.face, .5, .9, w.wrong ? C.p3 : C.player);
      });
      g.font = '500 13px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillText(t < sim.end ? `playtest running at ${speed}× speed` : `${N} testers done · brighter red means more time spent there · ✕ marks a death`, 20, H - 14);
    };
  });
})();
