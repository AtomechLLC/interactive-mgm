/* Reverse sequencing (MGM C4 M3, deck slides 115-119; slide 116 is the "MAP EXAMPLE HERE" placeholder). Forward:
   the player acts their way to the goal (try the door, find it locked, hunt for a key, come back). Backward: start at
   the goal and ask what stands in the way, then what removes that, and the map shows more than one route (the key or
   the lever). The strip underneath is the deck's WoW example: grind → level → raid, then raid ← level ← many routes. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585;
  const R = {
    start: [110, 210, 'Start'], hall: [290, 210, 'Hall'], dead: [290, 80, 'Dead end'], key: [470, 80, 'Key'], corr: [470, 210, 'Corridor'],
    ante: [650, 210, 'Antechamber'], goal: [870, 210, 'Goal'], lever: [650, 335, 'Lever'],
  };
  const EDGES = [['start', 'hall'], ['hall', 'dead'], ['dead', 'key'], ['hall', 'corr'], ['corr', 'ante'], ['ante', 'goal', 'door'], ['ante', 'lever']];
  const at = k => R[k].slice(0, 2);

  // forward: the player's walk, as rooms with pauses
  const FWD = TD.Path(at('start'), 230).wait(.6).go(...at('hall')).go(...at('corr')).go(...at('ante')).go(at('ante')[0] + 80, 210).wait(1.2)
    .go(...at('ante')).go(...at('corr')).go(...at('hall')).go(...at('dead')).go(...at('key')).wait(.8).go(...at('dead')).go(...at('hall')).go(...at('corr')).go(...at('ante')).wait(.4).go(...at('goal')).wait(1.5);
  const BUMP = FWD.segs[5].t0, GOT_KEY = FWD.segs[11].t0 + .2, OPEN = FWD.segs.at(-3).t0 + .2, FDUR = FWD.t;
  // backward: reveal steps, each [time, what]
  const BWD = [[.4, 'goal'], [1.8, 'door'], [3.4, 'key'], [4.6, 'lever'], [6.2, 'routeKey'], [7.8, 'routeLever'], [9.4, 'strip']];
  const BDUR = 13;

  function room(g, k, o = {}) {
    const [x, y, n] = R[k];
    g.fillStyle = o.lit ? '#fde9b8' : C.floor; g.strokeStyle = o.lit ? C.goldInk : C.wall; g.lineWidth = o.lit ? 4 : 3;
    g.beginPath(); g.roundRect(x - 62, y - 40, 124, 80, 10); g.fill(); g.stroke();
    g.fillStyle = C.ink; g.font = '700 15px Montserrat, Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n, x, y + 26);
  }
  function icon(g, k, x, y, a = 1) {
    if (a <= 0) return; g.save(); g.globalAlpha *= a;
    if (k === 'key') { g.strokeStyle = C.goldInk; g.fillStyle = C.gold; g.lineWidth = 4; g.beginPath(); g.arc(x - 10, y, 9, 0, Math.PI * 2); g.fill(); g.stroke(); g.beginPath(); g.moveTo(x - 1, y); g.lineTo(x + 18, y); g.moveTo(x + 12, y); g.lineTo(x + 12, y + 8); g.moveTo(x + 18, y); g.lineTo(x + 18, y + 8); g.stroke(); }
    if (k === 'lever') { g.fillStyle = C.wall; g.fillRect(x - 14, y + 4, 28, 10); g.strokeStyle = '#e8e2cf'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y + 6); g.lineTo(x + 12, y - 16); g.stroke(); g.fillStyle = C.red; g.beginPath(); g.arc(x + 13, y - 18, 7, 0, Math.PI * 2); g.fill(); }
    if (k === 'flag') T.flag(x, y + 12);
    g.restore();
  }
  function arrow(g, a, b, col, w = 4, dash) {
    const [x0, y0] = a, [x1, y1] = b, ang = Math.atan2(y1 - y0, x1 - x0), sx = x0 + Math.cos(ang) * 66, sy = y0 + Math.sin(ang) * 46, ex = x1 - Math.cos(ang) * 70, ey = y1 - Math.sin(ang) * 50;
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = w; g.setLineDash(dash || []); g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke(); g.setLineDash([]);
    g.beginPath(); g.moveTo(ex + Math.cos(ang) * 12, ey + Math.sin(ang) * 12); g.lineTo(ex + Math.cos(ang + 2.5) * 12, ey + Math.sin(ang + 2.5) * 12); g.lineTo(ex + Math.cos(ang - 2.5) * 12, ey + Math.sin(ang - 2.5) * 12); g.closePath(); g.fill();
  }
  function strip(g, back, a) {
    const y = 500, xs = [200, 520, 840];
    g.fillStyle = 'rgba(255,252,244,.8)'; g.beginPath(); g.roundRect(20, 420, W - 40, 150, 12); g.fill();
    g.fillStyle = C.muted; g.font = '600 14px Jost, sans-serif'; g.textAlign = 'left'; g.fillText(back ? 'Goal-driven (World of Warcraft, slide 119)' : 'Action-driven (World of Warcraft, slide 117)', 40, 440);
    const box = (x, t, col) => { T.label(t, x, y, 'center', '#fff', 18, col); };
    if (!back) { box(xs[0], 'Grinding', C.stoneDk); box(xs[1], 'Level-up', C.player); box(xs[2], 'Raid', C.p2); arrow(g, [xs[0] + 20, y], [xs[1] - 20, y], C.ink, 3); arrow(g, [xs[1] + 20, y], [xs[2] - 20, y], C.ink, 3); return; }
    g.save(); g.globalAlpha = a;
    box(xs[2], 'Raid', C.p2); box(xs[1], 'Level-up', C.player); arrow(g, [xs[2] - 20, y], [xs[1] + 20, y], C.ink, 3);
    [['Grinding', y - 34], ['Rehearse with the raid group', y], ['Read guides', y + 34]].forEach(([t, yy]) => { T.label(t, xs[0] - 20, yy, 'center', '#fff', 15, C.stoneDk); arrow(g, [xs[1] - 30, y], [xs[0] + 60, yy], C.muted, 2); });
    g.restore();
  }

  function draw(g, mode, t) {
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.55)'; g.beginPath(); g.roundRect(20, 20, W - 40, 390, 12); g.fill();
    const back = mode === 'back', shown = k => back && BWD.some(([tt, w]) => w === k && t >= tt), fade = k => { const s = BWD.find(b => b[1] === k); return s ? clamp((t - s[0]) / .5) : 0; };
    const doorOpen = back ? false : t >= OPEN;
    // corridors
    EDGES.forEach(([a, b, door]) => {
      const [x0, y0] = at(a), [x1, y1] = at(b);
      g.strokeStyle = C.floorLn; g.lineWidth = 26; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      if (door) { const mx = (x0 + x1) / 2; g.fillStyle = doorOpen ? 'rgba(139,143,168,.35)' : C.stone; g.strokeStyle = C.navy; g.lineWidth = 3; g.fillRect(mx - 9, y0 - 26, 18, 52); g.strokeRect(mx - 9, y0 - 26, 18, 52); if (!doorOpen) { g.fillStyle = C.navy; g.fillRect(mx - 4, y0 - 4, 8, 8); } }
    });
    Object.keys(R).forEach(k => room(g, k, { lit: back && ((k === 'goal' && shown('goal')) || (k === 'key' && shown('key')) || (k === 'lever' && shown('lever'))) }));
    icon(g, 'flag', at('goal')[0], at('goal')[1] - 14);
    icon(g, 'key', at('key')[0], at('key')[1] - 8, back || t < GOT_KEY ? 1 : 0);
    icon(g, 'lever', at('lever')[0], at('lever')[1] - 6, 1);
    if (!back) {
      T.trail(FWD.trail(Math.min(t, FDUR)), C.player, .7, 4);
      const p = FWD.at(Math.min(t, FDUR)); T.player(p.x, p.y, p.face, .8);
      if (t >= GOT_KEY) icon(g, 'key', p.x + 22, p.y - 26, 1);
      if (t >= BUMP && t < BUMP + 1.4) T.popText('Locked!', at('ante')[0] + 100, 160, C.redDk, 1.4 - (t - BUMP));
      T.label(`${Math.round(FWD.trail(Math.min(t, FDUR), .05).reduce((s, q, i, arr) => i ? s + Math.hypot(q[0] - arr[i - 1][0], q[1] - arr[i - 1][1]) : 0, 0) / 18)} steps walked`, 130, 380, 'center', '#fff', 15, C.player);
    } else {
      if (shown('door')) { arrow(g, at('goal'), [at('ante')[0] + 108, 210], C.redDk, 4); T.label('What stops me? A locked door', 790, 150, 'center', C.redDk, 14); }
      if (shown('key')) { g.save(); g.globalAlpha = fade('key'); arrow(g, [at('ante')[0] + 60, 190], at('key'), C.goldInk, 4); g.restore(); T.label('What opens it? A key…', 600, 112, 'center', C.goldInk, 14); }
      if (shown('lever')) { g.save(); g.globalAlpha = fade('lever'); arrow(g, [at('ante')[0], 230], at('lever'), C.goldInk, 4); g.restore(); T.label('…or the lever', 780, 335, 'center', C.goldInk, 14); }
      if (shown('routeKey')) { g.save(); g.globalAlpha = fade('routeKey'); T.trail([at('key'), at('dead'), at('hall'), at('start')], C.p2, 1, 5); g.restore(); }
      if (shown('routeLever')) { g.save(); g.globalAlpha = fade('routeLever'); T.trail([at('lever'), at('ante'), at('corr'), at('hall'), at('start')], C.purple, 1, 5); g.restore(); T.label('2 routes to one goal', 130, 380, 'center', '#fff', 15, C.p2); }
    }
    strip(g, back, back ? fade('strip') : 1);
  }

  const DUR = FDUR + BDUR;
  const tourAt = t => t < FDUR ? { mode: 'fwd', t } : { mode: 'back', t: t - FDUR };
  const CAPS = { fwd: 'Forward, action first: walk in, hit the locked door, go looking, find the key, walk all the way back. One route, found by trying things.', back: 'Backward, goal first: what stops me? A door. What opens it? A key, or a lever. Working back from the goal shows more than one route to the same end.' };

  let api = null;
  canvasDemo('reverse-map', (s, cv, g) => {
    const st = { mode: 'fwd', t: 0, tour: true, tt: 0, held: false, last: '' };
    const box = $(s, '.rv-modes'), tourBtn = $(s, '.rv-tour');
    box.innerHTML = `<button class="btn" data-m="fwd">Forward</button><button class="btn" data-m="back">Backward</button>`;
    $$(box, 'button').forEach(b => b.onclick = () => { st.tour = false; tourBtn.classList.remove('on'); st.mode = b.dataset.m; st.t = 0; });
    tourBtn.onclick = () => { st.tour = true; st.tt = 0; tourBtn.classList.add('on'); };
    function render() {
      let { mode, t } = st; if (st.tour) ({ mode, t } = tourAt(st.tt));
      draw(g, mode, t);
      $$(box, 'button').forEach(b => b.classList.toggle('on', b.dataset.m === mode));
      if (mode === st.last) return; st.last = mode;
      say($(s, '.st'), mode === 'fwd' ? `<div><b>1</b><span>route, found by trial and error</span></div>` : `<div class="g"><b>2</b><span>routes, found by asking what the goal needs</span></div>`);
      say($(s, '.out1'), CAPS[mode]);
    }
    api = { seek(t) { st.held = st.tour = true; st.tt = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) { if (st.tour) { st.tt += dt; if (st.tt > DUR) st.tt = 0; } else st.t = Math.min(st.t + dt, st.mode === 'fwd' ? FDUR : BDUR); } render(); };
  });

  window.__seek = t => api.seek(t);
  window.__dur = () => api.dur();
})();
