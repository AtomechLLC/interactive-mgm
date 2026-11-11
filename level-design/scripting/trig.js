/* Wire the arena (The Level Design Book: Scripting)
   A trigger is a volume that reports three events: enter, stay and exit. Here two volumes script one encounter.
   The doorway volume spawns three guards on enter (and can shut the door behind). The arena volume turns combat music on
   while the player stays inside and off on exit. The exit door is the gate: open from the start (no gate), opening on a
   timer (a soft gate, you can leave before the fight ends), or opening on the last kill (a hard gate).
   The player is scripted too: they walk to the exit, and fight only while it is shut. Numbers are ours. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp } = TD;
  const W = 1040, H = 585, SPEED = 150, SLOW = 5, KILL = 2.0;
  const P = PLAN.make();
  P.rect('I', 40, 255, 300, 335, { lab: 'in' });
  P.rect('A', 300, 130, 720, 460, { cham: [0, 1, 2, 3], k: 44 });
  P.rect('X', 720, 255, 980, 335, { tint: '#f6e6bc' });
  P.door('I', 'A', [300, 295], 90, 'arch'); P.door('A', 'X', [720, 295], 90, 'arch');
  [[400, 190], [400, 400], [620, 190], [620, 400]].forEach(([x, y]) => P.prop('column', x, y, 8));
  const VA = [304, 250, 60, 90], VB = [364, 150, 340, 290], SPAWN = [[610, 215], [640, 295], [610, 375]], POST = [470, 295];
  const inside = (v, x, y) => x >= v[0] && x <= v[0] + v[2] && y >= v[1] && y <= v[1] + v[3];
  const MODES = { open: 'Open from the start', slow: 'Opens on a 5 s timer', hard: 'Opens on the last kill' };

  canvasDemo('trig', (s, cv, g) => {
    let mode = 'hard', shut = true, show = true, S = null;
    const plan = P.render(W, H);
    function reset() { S = { t: 0, x: 80, y: 295, face: 0, inA: false, inB: false, stay: 0, spawnT: null, guards: [], log: [], door: mode === 'open' ? 1 : 0, shutT: null, music: false, kills: 0, lastKill: 0, done: null, leftWith: null, shot: null }; ui(); }
    const log = (src, ev, act) => { S.log.push({ t: S.t, src, ev, act }); if (S.log.length > 6) S.log.shift(); S.fired = (S.fired || 0) + 1; };
    function step(dt) {
      const st = S; if (st.done != null) { st.t += dt; return; }
      st.t += dt;
      const alive = st.guards.filter(q => q.alive), doorOpen = st.door >= 1;
      // the scripted player: head for the exit; while it is shut and guards are up, hold a post and fight
      const fighting = st.spawnT != null && !doorOpen && alive.length > 0;
      const target = fighting ? POST : st.spawnT != null && !doorOpen ? [680, 295] : [930, 295];
      const dx = target[0] - st.x, dy = target[1] - st.y, d = Math.hypot(dx, dy);
      if (d > 2) { st.x += dx / d * SPEED * dt; st.y += dy / d * SPEED * dt; st.face = Math.atan2(dy, dx); }
      else if (target[0] === 930) { st.done = st.t; }
      if (fighting && d < 40 && st.t - st.lastKill > KILL && st.t - st.spawnT > 1.2) {
        const q = alive.reduce((m, q) => Math.hypot(q.x - st.x, q.y - st.y) < Math.hypot(m.x - st.x, m.y - st.y) ? q : m); q.alive = false; q.deadT = st.t; st.kills++; st.lastKill = st.t; st.shot = { t: st.t, x: q.x, y: q.y }; st.face = Math.atan2(q.y - st.y, q.x - st.x);
        if (!st.guards.some(q => q.alive)) { log('guards', 'all defeated', mode === 'hard' ? 'open the exit' : 'nothing wired'); if (mode === 'hard') st.opening = st.t; }
      }
      st.guards.forEach(q => { if (!q.alive) return; const gx = st.x - q.x, gy = st.y - q.y, gd = Math.hypot(gx, gy); q.face = Math.atan2(gy, gx); if (gd > 95) { q.x += gx / gd * 70 * dt; q.y += gy / gd * 70 * dt; } });
      // trigger events
      const a = inside(VA, st.x, st.y), b = inside(VB, st.x, st.y);
      if (a && !st.inA) { st.spawnT = st.t; st.guards = SPAWN.map(([x, y]) => ({ x, y, alive: true, face: Math.PI, born: st.t })); log('doorway', 'enter', 'spawn 3 guards'); if (shut) { st.shutT = st.t; log('doorway', 'enter', 'shut the door behind'); } if (mode === 'slow') { st.opening = st.t; log('doorway', 'enter', `start a ${SLOW} s exit timer`); } }
      if (b && !st.inB) { st.music = true; log('arena', 'enter', 'combat music on'); }
      if (b) st.stay += dt;
      if (!b && st.inB) { st.music = false; st.leftWith = st.guards.filter(q => q.alive).length; log('arena', 'exit', 'combat music off'); }
      st.inA = a; st.inB = b;
      if (st.opening != null && st.door < 1) st.door = clamp((st.t - st.opening) / (mode === 'slow' ? SLOW : .6));
    }
    function ui() {
      const st = S, left = st.leftWith, out = left != null;
      say($(s, '.tr-stats'),
        `<div class="${!out ? '' : st.kills === 3 ? 'g' : st.kills ? 'y' : 'r'}"><b>${st.kills}/3</b><span>guards defeated ${out ? 'when the player left the arena' : 'so far'}</span></div>` +
        `<div><b>${st.stay.toFixed(1)}s</b><span>inside the arena volume (its stay event)</span></div>` +
        `<div><b>${st.fired || 0}</b><span>actions fired by trigger events</span></div>`);
    }
    function text() {
      say($(s, '.tr-out'), (mode === 'open' ? '<b class="accent">No gate, no fight.</b> The guards spawn on cue, but nothing stops the player walking straight out. A trigger starts an encounter; only a gate makes the player finish it.'
        : mode === 'slow' ? '<b class="accent">A soft gate.</b> The door takes five seconds to open, so the player has to hold out for a while but can leave with guards still standing. The book counts a slowly opening door as a softish gate.'
        : '<b class="accent">A hard gate.</b> The exit only opens when the last guard falls, so progress is impossible without finishing the fight. The door behind shuts on enter, which is a backward gate.')
        + (show ? '' : ' Hidden volumes are what a single-player player sees. The book wants triggers invisible there and visible in multiplayer.'));
    }
    $$(s, '.tr-door .btn').forEach(b => b.onclick = () => { mode = b.dataset.v; $$(s, '.tr-door .btn').forEach(x => x.classList.toggle('on', x === b)); text(); reset(); });
    $(s, '.tr-shut').onchange = e => { shut = e.target.checked; reset(); };
    $(s, '.tr-show').onchange = e => { show = e.target.checked; text(); };
    $(s, '.tr-replay').onclick = reset;
    text(); reset();
    window.__trigSet = (m, sh, sw, tt) => { mode = m; shut = sh; show = sw; $$(s, '.tr-door .btn').forEach(x => x.classList.toggle('on', x.dataset.v === m)); $(s, '.tr-shut').checked = sh; $(s, '.tr-show').checked = sw; text(); reset(); for (let i = 0; i < tt * 60; i++) step(1 / 60); ui(); return { kills: S.kills, left: S.leftWith, done: S.done, fired: S.fired }; };

    const vol = (v, name, hot, col) => { g.fillStyle = `rgba(${col},${hot ? .22 : .09})`; g.strokeStyle = `rgba(${col},.85)`; g.lineWidth = 2; g.setLineDash([8, 6]); g.beginPath(); g.rect(...v); g.fill(); g.stroke(); g.setLineDash([]); g.font = '600 12px Jost, sans-serif'; g.fillStyle = `rgba(${col},1)`; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(name, v[0] + 6, v[1] + 5); };
    const bar = (x, y, open, col) => { const h = 42 * (1 - open); if (h > 1) { g.strokeStyle = col; g.lineWidth = 8; g.lineCap = 'butt'; g.beginPath(); g.moveTo(x, y - 21); g.lineTo(x, y - 21 + h); g.stroke(); } };
    let acc = 0;
    return dt => {
      step(Math.min(dt, .05)); if ((acc += dt) > .15) { acc = 0; ui(); }
      const st = S; T.use(g); g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
      g.drawImage(plan, 0, 0);
      if (show) { vol(VB, `arena volume${st.inB ? ' · stay ' + st.stay.toFixed(1) + ' s' : ''}`, st.inB, '85,98,235'); vol(VA, 'doorway', st.inA, '154,90,6'); }
      bar(720, 295, st.door, C.red); if (st.shutT != null) bar(300, 295, 1 - clamp((st.t - st.shutT) / .3), PLAN.INK);
      T.label(st.door >= 1 ? 'exit open' : mode === 'slow' && st.opening != null ? `exit opens in ${(SLOW * (1 - st.door)).toFixed(1)} s` : 'exit shut', 720, 232, 'center', st.door >= 1 ? C.good : C.redDk, 13);
      T.flag(940, 290);
      st.guards.forEach(q => { const a = q.alive ? clamp((st.t - q.born) * 3) : clamp(1 - (st.t - q.deadT) * 2); if (a > 0) T.foe(q.x, q.y, 15, q.face, C.red, { a }); if (!q.alive) T.poof(q.x, q.y, st.t - q.deadT, 22); if (st.t - q.born < .6) T.flash(q.x, q.y, 34, .7 * (1 - (st.t - q.born) / .6)); });
      if (st.shot && st.t - st.shot.t < .18) T.tracer(st.x, st.y, st.shot.x, st.shot.y, 1 - (st.t - st.shot.t) / .18);
      T.player(st.x, st.y, st.face, .8);
      // combat music: bars that move while the arena volume holds the player
      const mx = 786, my = 150; g.font = '600 12px Jost, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = C.muted; g.fillText(st.music ? 'combat music: on' : 'combat music: off', mx + 44, my);
      for (let i = 0; i < 5; i++) { const h = st.music ? 6 + 14 * Math.abs(Math.sin(st.t * 7 + i * 1.3)) : 4; g.fillStyle = st.music ? C.blue : 'rgba(93,97,140,.5)'; g.fillRect(mx + i * 7, my + 10 - h, 5, h); }
      // event log
      g.fillStyle = 'rgba(21,32,68,.92)'; g.beginPath(); g.roundRect(20, 346, 272, 226, 10); g.fill();
      g.font = '700 12px Montserrat, Jost, sans-serif'; g.fillStyle = C.gold; g.textBaseline = 'alphabetic'; g.fillText('EVENT LOG', 34, 370);
      g.font = '500 14px Jost, sans-serif';
      st.log.forEach((l, i) => { const y = 392 + i * 31; g.fillStyle = '#9fb0e8'; g.fillText(l.t.toFixed(1) + 's', 34, y); g.fillStyle = '#fff'; g.fillText(`${l.src}.${l.ev}`, 76, y); g.fillStyle = '#ffd99a'; g.fillText('→ ' + l.act, 76, y + 14); });
      if (!st.log.length) { g.fillStyle = '#9fb0e8'; g.fillText('nothing has fired yet', 34, 392); }
      if (st.done != null && st.t - st.done > 2.5) reset();
    };
  });
})();
