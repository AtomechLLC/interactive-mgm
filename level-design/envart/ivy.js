/* Everything is ivy (The Level Design Book: Environment art, "Readability")
   The book's example is The Last of Us Part II, where ivy over a building meant "closed" and a clear front meant "you can
   go in", and where the ivy also flattened the facade into one green shape the player could stop inspecting.
   Five buildings, five identical doors; two of them open. Click a building to grow ivy over it, then a player walks the
   street. A player who has been taught the rule skips every ivy building and tries every other door.
   The street, the walker and the counts are our own. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit, E = EA, W = E.W, H = E.H, GY = 424;
  const OPEN = [false, true, false, false, true];
  const B = [
    { x: 14, w: 196, h: 300, hue: 38, s: 34, l: 79, roof: 'tile', seed: 3, shut: [190, 28, 42] },
    { x: 216, w: 200, h: 258, hue: 16, s: 34, l: 73, seed: 5, boxes: 1 },
    { x: 422, w: 196, h: 330, hue: 206, s: 16, l: 77, roof: 'tile', seed: 8, shut: [24, 34, 40] },
    { x: 624, w: 200, h: 270, hue: 44, s: 34, l: 78, seed: 11, boxes: 1 },
    { x: 830, w: 196, h: 306, hue: 96, s: 14, l: 76, roof: 'tile', seed: 14, shut: [222, 24, 40] },
  ].map((b, i) => ({ ...b, bays: 2, door: { bay: 0, kind: 'shut', col: [26, 40, 34] }, cx: b.x + b.w / 4, open: OPEN[i] }));
  const PRE = { none: [0, 0, 0, 0, 0], rule: [1, 0, 1, 1, 0], decor: [1, 1, 0, 1, 0], some: [1, 0, 0, 0, 0] };
  canvasDemo('ivy', (s, cv, g) => {
    const st = { ivy: [0, 0, 0, 0, 0] }, cover = [0, 0, 0, 0, 0], sc = E.canvas(W, H), x = sc.getContext('2d');
    let w = null, dirty = true, res = [];                      // w: the walker { x, i, phase, t }; res: what happened at each door
    const rule = () => st.ivy.some(v => v);
    function scene() {
      x.clearRect(0, 0, W, H); E.sky(x, W, GY, 3, { seed: 31 });
      B.forEach((b, i) => E.building(x, { ...b, ivy: cover[i] * .98, door: { ...b.door, swing: res[i] && res[i].kind === 'in' ? Math.min(1, res[i].a) : 0 } }, GY));
      E.ground(x, W, H, GY, 3, { l: 57 }); E.lamp(x, 614, GY + 10, 1, 3); E.planter(x, 418, GY + 12, .9, 3, { seed: 6 }); E.bench(x, 962, GY + 14, .9, 3);
    }
    function start() { res = []; w = { x: -40, i: 0, phase: 'walk', t: 0, clock: 0 }; dirty = true; ui(); }
    function ui() {
      const tried = res.filter(r => r && r.kind !== 'skip').length, wasted = res.filter(r => r && r.kind === 'shut').length, missed = res.filter((r, i) => r && r.kind === 'skip' && OPEN[i]).length, done = !w || w.phase === 'done';
      say($(s, '.iv-stats'),
        `<div><b>${tried}</b><span>doors the player walked up to and tried</span></div>` +
        `<div class="${wasted ? 'r' : done ? 'g' : ''}"><b>${wasted}</b><span>tries wasted on a door that never opens</span></div>` +
        `<div class="${missed ? 'r' : done ? 'g' : ''}"><b>${missed}</b><span>open doors the player walked past</span></div>`);
      const lie = st.ivy.some((v, i) => v && OPEN[i]), bare = st.ivy.filter((v, i) => !v && !OPEN[i]).length;
      say($(s, '.iv-out'), !rule() ? '<b class="accent">Five doors, no way to tell.</b> Every front is dressed with the same care, so the only test is the handle. Three of the five tries are wasted. Click a building to grow ivy over it.'
        : lie ? '<b class="accent">The ivy lied.</b> Someone used ivy as decoration on a building you can enter. A player who learned “ivy means closed” walks straight past it. A sign only works if every artist on the level uses it the same way.'
        : bare ? `<b class="accent">The rule holds, where it is used.</b> No one walks past an open door, but ${bare === 1 ? 'one closed building is' : bare + ' closed buildings are'} still bare, and bare now means “try me”.`
        : '<b class="accent">Read from across the street.</b> Ivy on every closed building and on nothing else. The player tries two doors and both open. The ivy also swallows the windows, so there is nothing left to inspect: the building reads as one green shape.');
    }
    $$(s, '.iv-pre .btn').forEach(b => b.onclick = () => { st.ivy = PRE[b.dataset.v].slice(); start(); });
    $(s, '.iv-go').onclick = start;
    cv.style.cursor = 'pointer';
    cv.onpointerdown = e => { const p = FPF.ptr(cv, e), i = B.findIndex(b => p.x >= b.x && p.x < b.x + b.w && p.y < GY + 10); if (i >= 0) { st.ivy[i] = st.ivy[i] ? 0 : 1; start(); } };
    start();
    window.__ivySet = (a, skip) => { st.ivy = a.slice(); start(); if (skip != null) for (let k = 0; k < skip * 60; k++) step(1 / 60); };
    const WY = GY + 74, SP = 190;
    function step(dt) {
      cover.forEach((c, i) => { const t = st.ivy[i]; if (c !== t) { cover[i] = t > c ? Math.min(t, c + dt * 1.6) : Math.max(t, c - dt * 2.4); dirty = true; } });
      res.forEach(r => { if (r && r.kind === 'in' && r.a < 1) { r.a += dt * 3; dirty = true; } });
      if (!w || w.phase === 'done') return;
      w.clock += dt;
      if (w.phase === 'walk') {
        w.x += SP * dt;
        const b = B[w.i];
        if (b && w.x >= b.cx) {
          if (rule() && st.ivy[w.i]) { res[w.i] = { kind: 'skip' }; w.i++; ui(); }
          else { w.x = b.cx; w.phase = 'try'; w.t = 0; }
        }
        if (w.x > W + 50) { w.phase = 'done'; ui(); }
      } else if (w.phase === 'try') {
        w.t += dt;
        if (w.t > .55 && !res[w.i]) { res[w.i] = { kind: B[w.i].open ? 'in' : 'shut', a: 0 }; dirty = true; ui(); }
        if (w.t > 1.5) { w.phase = 'walk'; w.i++; }
      }
    }
    return dt => {
      step(Math.min(dt, .05));
      if (dirty) { scene(); dirty = false; }
      g.clearRect(0, 0, W, H); g.save(); g.beginPath(); g.roundRect(0, 0, W, H, 14); g.clip(); g.drawImage(sc, 0, 0);
      B.forEach((b, i) => {
        const r = res[i]; if (!r) return;
        const y = GY - 142, t = r.kind === 'in' ? 'open: went in' : r.kind === 'shut' ? 'shut: a wasted try' : OPEN[i] ? 'walked past an open door' : 'skipped';
        E.label(g, t, b.cx + 20, y, { size: 13, col: r.kind === 'in' ? '#14663a' : r.kind === 'skip' && !OPEN[i] ? '#5d618c' : '#a8201c', line: r.kind === 'in' ? '#2fae63' : r.kind === 'skip' && !OPEN[i] ? '#b9bdd6' : '#e5322d' });
      });
      if (w && w.phase !== 'done') {
        // walks left to right, so faces right; turns to the door (into the screen) only as a short pause
        const trying = w.phase === 'try', shake = trying && res[w.i] && res[w.i].kind === 'shut' ? Math.sin(w.t * 50) * 2 : 0;
        E.figure(g, w.x + shake, trying ? WY - 30 : WY, { pose: trying ? 'stand' : 'walk', t: w.clock, face: 1, gun: false, col: [205, 72, 50], s: trying ? 1.02 : 1.1 });
      }
      if (!rule()) E.label(g, 'click a building to cover it in ivy', W / 2, 24, { size: 14 });
      else E.label(g, 'this game has taught its players: ivy means closed', W / 2, 24, { size: 14 });
      g.restore();
    };
  });
})();
