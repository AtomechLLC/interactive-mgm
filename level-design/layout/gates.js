/* Lock, key and shortcut (The Level Design Book: Gates, Critical path)
   One hard gate on the critical path, built with ../shared/plan.js. Two players walk it: a direct player who follows the
   main route (blue) and an explorer who tries every side door they pass (purple).
   Where the key sits decides whether a player has seen the lock when they find it. A shortcut is a gate that opens from
   the far side; a one-way drop is a backward gate. The stats are measured from the walked paths (26 px is one tile). */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp } = TD;
  const W = 1040, H = 585, TILE = 26, SPEED = 190;

  function plan(keyFirst, shortcut) {
    const P = PLAN.make();
    P.rect('S', 60, 240, 160, 500, { lab: 'start', cham: [0], k: 26 });
    P.rect('C', 160, 280, 300, 340);
    P.rect('A', 300, 200, 540, 420, { cham: [0, 3], k: 30 });
    P.rect('B', 540, 220, 780, 440, { cham: [1], k: 34, tint: '#f1e7d0' });
    P.round('O', 850, 330, 62, { tint: '#f6e6bc' });
    P.door('S', 'C', [160, 310], 90, 'arch'); P.door('C', 'A', [300, 310], 90, 'arch');
    P.door('A', 'B', [540, 310], 90, 'gate'); P.door('B', 'O', [784, 330], 90, 'arch');
    if (keyFirst) { P.rect('K', 175, 150, 295, 280, { cham: [0, 1], k: 22, tint: '#e9eefc' }); P.door('C', 'K', [235, 280], 0); P.rooms.K.key = [235, 200]; }
    else { P.rect('K', 420, 70, 540, 200, { cham: [0, 1], k: 22, tint: '#e9eefc' }); P.door('A', 'K', [490, 200], 0); P.rooms.K.key = [480, 122]; }
    if (shortcut) { P.rect('R', 160, 440, 620, 500, { tint: '#efe6d2' }); P.door('B', 'R', [585, 440], 0, 'arch'); P.door('R', 'S', [160, 470], 90, 'short'); }
    [[360, 250], [360, 370], [470, 250], [470, 370]].forEach(([x, y]) => P.prop('column', x, y, 7));
    P.prop('crate', 700, 400, 10, .3); P.prop('planter', 740, 262, 12);
    return P;
  }

  canvasDemo('gates', (s, cv, g) => {
    let keyFirst = true, shortcut = false, drop = false, t = 0, sim = null;
    const cache = {};
    const seg = (sel, f) => $$(s, sel + ' .btn').forEach(b => b.onclick = () => { $$(s, sel + ' .btn').forEach(x => x.classList.toggle('on', x === b)); f(b.dataset.v); run(); });
    seg('.gt-key', v => keyFirst = v === 'first');
    $(s, '.gt-short').onchange = e => { shortcut = e.target.checked; run(); };
    $(s, '.gt-drop').onchange = e => { drop = e.target.checked; run(); };
    $(s, '.gt-replay').onclick = () => { t = 0; };

    function run() {
      const id = `${keyFirst}${shortcut}`, P = (cache[id] ||= (() => { const P = plan(keyFirst, shortcut); return { P, img: P.render(W, H) }; })()).P;
      const R = P.rooms, K = R.K.key, gate = P.doorOf('A', 'B').m, kd = P.doorOf(keyFirst ? 'C' : 'A', 'K').m;
      const mk = (delay, explorer) => {
        const path = T.Path([110, 310], SPEED).wait(delay), ev = [], go = pts => pts.forEach(p => path.go(p[0], p[1]));
        const fetch = (from, known) => { go([[kd[0], kd[1] + 24], kd, K]); ev.push({ t: path.t, at: K, text: known ? 'for that door' : 'what is this for?', col: known ? C.good : C.goldInk, key: true }); path.wait(.5); go([kd, from]); };
        const front = [gate[0] - 34, gate[1]];
        go([[160, 310]]);
        if (keyFirst && explorer) fetch([kd[0], 310], false);
        go([[300, 310]]); const back0 = path.t;
        go([front]);
        if (!(keyFirst && explorer)) { ev.push({ t: path.t, at: [gate[0] - 20, gate[1] - 44], text: 'locked', col: C.redDk }); path.wait(.6, gate); fetch(keyFirst ? [kd[0], 310] : [kd[0], kd[1] + 24], true); go([[300, 310], front].slice(keyFirst ? 0 : 1)); }
        const back = path.segs.filter(q => q.t0 >= back0 - 1e-6).reduce((m, q) => m + Math.hypot(q.b[0] - q.a[0], q.b[1] - q.a[1]), 0), open = path.t;
        go([[gate[0] + 40, gate[1]], R.B.c, P.doorOf('B', 'O').m, [R.O.c[0] - 14, R.O.c[1] + 8]]); path.wait(.7);
        const goal = path.t, home0 = path.t; let home = null;
        if (shortcut) { go([P.doorOf('B', 'O').m, [585, 400], [585, 470], [200, 470], [110, 470], [110, 360]]); home = path.t - home0; }
        else if (!drop) { go([P.doorOf('B', 'O').m, R.B.c, gate, [300, 310], [160, 310], [110, 310]]); home = path.t - home0; }
        else ev.push({ t: path.t, at: [R.O.c[0], R.O.c[1] - 80], text: 'no way back', col: C.redDk, hold: true });
        return { path, ev, open, goal, back: back / TILE, home: home == null ? null : home * SPEED / TILE, explorer, total: path.t };
      };
      sim = { P, img: cache[id].img, w: [mk(0, false), mk(1.1, true)], K, gate };
      sim.open = Math.min(...sim.w.map(w => w.open)); sim.keyT = Math.min(...sim.w.flatMap(w => w.ev.filter(e => e.key).map(e => e.t)));
      sim.shortT = shortcut ? Math.min(...sim.w.map(w => w.goal)) + 1.6 : Infinity; sim.end = Math.max(...sim.w.map(w => w.total));
      t = 0;
      const d = sim.w[0], extra = Math.max(0, Math.round(d.back - (540 - 300 - 34) / TILE));
      say($(s, '.gt-stats'),
        `<div class="${keyFirst ? 'y' : 'g'}"><b>${keyFirst ? 'no' : 'yes'}</b><span>the lock is in view when a player finds the key</span></div>` +
        `<div class="${extra > 20 ? 'r' : 'g'}"><b>${extra}</b><span>tiles the direct player walks to fetch the key and come back</span></div>` +
        `<div class="${d.home == null ? 'r' : shortcut ? 'g' : 'y'}"><b>${d.home == null ? 'none' : Math.round(d.home)}</b><span>${d.home == null ? 'way home: the drop is one-way and nothing loops back' : 'tiles to walk home from the objective'}</span></div>`);
      say($(s, '.gt-out'), drop && !shortcut ? '<b class="accent">A backward gate needs a way round.</b> The drop stops players leaving the fight, which is its job, but now the level has no route home. Pair it with a shortcut.'
        : shortcut && drop ? '<b class="accent">Drop in, loop out.</b> The one-way drop commits the player, and the shortcut, a gate that only opens from the far side, hands the level back to them once it is beaten.'
        : shortcut ? '<b class="accent">A shortcut is a gate you open from the other side.</b> It was shut on the way in, so it never bypassed the lock. On the way out it turns a long walk home into a short one.'
        : keyFirst ? '<b class="accent">Key before lock.</b> The explorer picks up a key with no idea what it opens. The direct player skips the side room, hits the lock, and walks all the way back. The book’s advice: show the lock first.'
        : '<b class="accent">Lock before key.</b> Both players meet the locked door first, so the key room is the answer to a question they already have. From the key you can see the lock through the doorway, a reminder at the moment of pickup.');
    }
    run();
    window.__gatesSet = (kf, sh, dr, tt) => { keyFirst = kf; shortcut = sh; drop = dr; $$(s, '.gt-key .btn').forEach(b => b.classList.toggle('on', (b.dataset.v === 'first') === kf)); $(s, '.gt-short').checked = sh; $(s, '.gt-drop').checked = dr; run(); t = tt ?? 0; };

    const keyIcon = (x, y, a = 1) => { g.save(); g.globalAlpha = a; g.translate(x, y); g.strokeStyle = C.goldInk; g.fillStyle = C.gold; g.lineWidth = 2.5; g.beginPath(); g.arc(-7, 0, 7, 0, T.TAU); g.fill(); g.stroke(); g.beginPath(); g.moveTo(0, 0); g.lineTo(16, 0); g.moveTo(11, 0); g.lineTo(11, 6); g.moveTo(16, 0); g.lineTo(16, 6); g.stroke(); g.restore(); };
    return dt => {
      t += dt; T.use(g); g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
      g.drawImage(sim.img, 0, 0);
      const P = sim.P, R = P.rooms, open = t >= sim.open, G = sim.gate;
      P.overlay(g, { gate: open, short: t >= sim.shortT });
      // the lock on the gate, the key in its room
      if (!open) { g.fillStyle = C.gold; g.strokeStyle = C.goldInk; g.lineWidth = 2; g.beginPath(); g.roundRect(G[0] - 9, G[1] - 7, 18, 15, 3); g.fill(); g.stroke(); g.beginPath(); g.arc(G[0], G[1] - 8, 6, Math.PI, 0); g.stroke(); }
      if (t < sim.keyT) { const gr = g.createRadialGradient(sim.K[0], sim.K[1], 2, sim.K[0], sim.K[1], 30); gr.addColorStop(0, 'rgba(255,200,90,.55)'); gr.addColorStop(1, 'rgba(255,200,90,0)'); g.fillStyle = gr; g.fillRect(sim.K[0] - 32, sim.K[1] - 32, 64, 64); keyIcon(sim.K[0], sim.K[1]); }
      // from the key room beside the lock, the lock is visible through the doorway
      if (!keyFirst) { g.setLineDash([4, 6]); g.strokeStyle = 'rgba(154,90,6,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(sim.K[0], sim.K[1]); g.lineTo(G[0] - 6, G[1] - 14); g.stroke(); g.setLineDash([]); }
      if (drop) { g.strokeStyle = PLAN.INK; g.lineWidth = 3; g.beginPath(); g.moveTo(585, 232); g.lineTo(585, 428); g.stroke(); g.fillStyle = PLAN.INK; for (let y = 262; y < 420; y += 44) { g.beginPath(); g.moveTo(590, y - 7); g.lineTo(602, y); g.lineTo(590, y + 7); g.fill(); } T.label('one-way drop', 628, 240, 'center', C.muted, 12); }
      T.flag(R.O.c[0] + 12, R.O.c[1] - 4);
      T.label('start', 110, 262, 'center', C.muted, 13); T.label('objective', R.O.c[0], R.O.c[1] + 44, 'center', C.goldInk, 13);
      T.label('key room', R.K.c[0], R.K.pts[0][1] - 14, 'center', C.muted, 13); T.label(open ? 'gate open' : 'hard gate', G[0] + 78, 200, 'center', open ? C.good : C.redDk, 13);
      if (shortcut) T.label(t >= sim.shortT ? 'shortcut open' : 'shortcut: opens from this side only', 390, 520, 'center', t >= sim.shortT ? C.good : C.muted, 12);
      sim.w.forEach(w => {
        g.save(); g.globalAlpha = .5; T.trail(w.path.trail(t, .08), w.explorer ? C.p3 : C.player, 1, 3); g.restore();
        const p = w.path.at(t); T.player(p.x, p.y + (w.explorer ? 5 : -5), p.face, .7, 1, w.explorer ? C.p3 : C.player);
        w.ev.forEach(e => { const a = e.hold ? clamp((t - e.t) * 3) : clamp(1.8 - (t - e.t)) * clamp((t - e.t) * 6); if (t >= e.t && a > 0) T.popText(e.text, e.at[0], e.at[1] - 30 - (e.hold ? 0 : (t - e.t) * 10), e.col, a); });
      });
      g.font = '500 13px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillText('blue: follows the main route · purple: tries every side door', 20, H - 14);
      if (t > sim.end + 3) t = 0;
    };
  });
})();
