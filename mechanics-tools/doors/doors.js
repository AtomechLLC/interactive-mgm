/* Switch, pressure plate, pulley (MGM C4 M3, deck slides 79-94). Three doors that all end in "open?", each checking
   something different: the switch listens for one signal and flips a binary state, the plate re-checks "is something
   on me?" every frame and copies the answer, the pulley re-checks how far the rope moved while it is held and stores a
   percentage (3.5 / 5.0 yards = 70%). The tour walks a player through all three, then away. step() is the model. */
(function () {
  const { $, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, FLOOR = 318, BAY = W / 3, CX = [BAY / 2, BAY * 1.5, BAY * 2.5];
  const DOOR_W = 112, DOOR_TOP = 132, ROPE = 5, HIST = 8;   // rope is 5 yards; strip charts show the last 8 s
  const SW_X = CX[0] - 112, SW_Y = 214;                          // lever on the wall
  const PL = { x0: CX[1] + 74, x1: CX[1] + 154 };                // plate on the floor, right of door B
  const PU = { x: CX[2] + 112, top: 64, y0: 176, y1: 290 };      // pulley wheel and handle travel
  const DEF = ['Switch', 'Pressure plate', 'Pulley'];
  const KIND = [['binary', 'binary', 'only when flipped'], ['binary, repeated checks', 'binary', 'every frame'], ['analog, continuous', 'analog, continuous', 'every frame while held']];

  const fresh = () => ({ t: 0, sw: false, crate: CX[1] - 150, pull: 0, door: [0, 0, 0], hist: [], checks: [[], [], []], px: null, held: false, last: '' });
  const onPlate = (x, w) => x + w / 2 > PL.x0 && x - w / 2 < PL.x1;
  // one model step: inputs are the switch, crate, rope and player position; doors ease toward their targets
  function step(S, dt) {
    S.t += dt;
    const pressed = onPlate(S.crate, 56) || (S.px != null && onPlate(S.px, 24));
    S.pressed = pressed;
    const target = [S.sw ? 1 : 0, pressed ? 1 : 0, S.pull / ROPE];
    for (let i = 0; i < 3; i++) { const d = target[i] - S.door[i]; S.door[i] += Math.sign(d) * Math.min(Math.abs(d), dt * 2.4); }
    // evaluations: the plate always, the pulley while the rope is held; switch checks are pushed by flip()
    S.checks[1].push(S.t); if (S.held) S.checks[2].push(S.t);
    S.checks.forEach(c => { while (c.length && c[0] < S.t - HIST) c.shift(); });
    if (!S.hist.length || S.t - S.hist.at(-1).t >= .05) S.hist.push({ t: S.t, v: [S.sw ? 1 : 0, pressed ? 1 : 0, S.pull / ROPE] });
    while (S.hist.length && S.hist[0].t < S.t - HIST) S.hist.shift();
  }
  const flip = (S, on = !S.sw) => { if (on !== S.sw) { S.sw = on; S.checks[0].push(S.t); } };

  // ---------- drawing ----------
  function person(g, x, a = 1) {
    g.save(); g.globalAlpha *= a; T.shadow(x, FLOOR + 2, 20, 5, .25);
    g.fillStyle = C.player; g.strokeStyle = '#fff'; g.lineWidth = 3;
    g.beginPath(); g.roundRect(x - 13, FLOOR - 52, 26, 52, 10); g.fill(); g.stroke();
    g.beginPath(); g.arc(x, FLOOR - 66, 13, 0, Math.PI * 2); g.fill(); g.stroke();
    g.restore();
  }
  function door(g, cx, open, tag) {
    const x0 = cx - DOOR_W / 2, h = FLOOR - DOOR_TOP;
    g.fillStyle = '#2a2e55'; g.fillRect(x0, DOOR_TOP, DOOR_W, h);                       // the dark doorway behind
    g.fillStyle = 'rgba(255,185,81,.25)'; g.fillRect(x0 + 10, DOOR_TOP + 10, DOOR_W - 20, h - 10);
    g.save(); g.beginPath(); g.rect(x0, DOOR_TOP, DOOR_W, h); g.clip();
    const y = DOOR_TOP - open * (h - 14);
    g.fillStyle = C.stone; g.fillRect(x0, y, DOOR_W, h); g.strokeStyle = C.stoneDk; g.lineWidth = 3;
    for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x0, y + h * k / 4); g.lineTo(x0 + DOOR_W, y + h * k / 4); g.stroke(); }
    g.restore();
    g.strokeStyle = C.navy; g.lineWidth = 5; g.strokeRect(x0 - 2, DOOR_TOP - 2, DOOR_W + 4, h + 2);
    T.label(tag, cx, DOOR_TOP - 22, 'center', '#fff', 15, C.navy);
  }
  function scene(g, S, o = {}) {
    T.use(g); g.clearRect(0, 0, W, H);
    // wall and floor, one bay per door
    g.fillStyle = '#e9dfc9'; g.fillRect(0, 30, W, FLOOR - 30);
    g.fillStyle = '#cdbf9f'; for (let y = 52; y < FLOOR; y += 34) g.fillRect(0, y, W, 2);
    g.fillStyle = C.floor; g.fillRect(0, FLOOR, W, 26); g.fillStyle = C.floorLn; g.fillRect(0, FLOOR, W, 3);
    g.fillStyle = 'rgba(21,32,68,.15)'; [1, 2].forEach(i => g.fillRect(BAY * i - 1, 30, 2, FLOOR - 30));
    door(g, CX[0], S.door[0], 'Door A'); door(g, CX[1], S.door[1], 'Door B'); door(g, CX[2], S.door[2], 'Door C');
    // the switch: a lever on a plate, tilted left (F) or right (T)
    g.fillStyle = C.wall; g.beginPath(); g.roundRect(SW_X - 24, SW_Y - 34, 48, 68, 8); g.fill();
    g.save(); g.translate(SW_X, SW_Y + 14); g.rotate((S.sw ? 1 : -1) * .6);
    g.strokeStyle = '#e8e2cf'; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -44); g.stroke();
    g.fillStyle = S.sw ? C.gold : C.red; g.beginPath(); g.arc(0, -46, 10, 0, Math.PI * 2); g.fill(); g.restore();
    T.label(S.sw ? 'Right' : 'Left', SW_X, SW_Y + 54, 'center', C.ink, 14);
    // the plate and the crate
    const pz = S.pressed ? 3 : 0;
    g.fillStyle = S.pressed ? C.gold : '#a77b4f'; g.strokeStyle = C.navy; g.lineWidth = 2;
    g.beginPath(); g.roundRect(PL.x0, FLOOR - 9 + pz, PL.x1 - PL.x0, 9 - pz, 3); g.fill(); g.stroke();
    const cx = S.crate; g.fillStyle = '#b8864f'; g.strokeStyle = '#5b3a1a'; g.lineWidth = 3;
    g.fillRect(cx - 28, FLOOR - 56 + (onPlate(cx, 56) ? pz : 0) - 8, 56, 56); g.strokeRect(cx - 28, FLOOR - 64 + (onPlate(cx, 56) ? pz : 0), 56, 56);
    g.beginPath(); g.moveTo(cx - 28, FLOOR - 64); g.lineTo(cx + 28, FLOOR - 8); g.moveTo(cx + 28, FLOOR - 64); g.lineTo(cx - 28, FLOOR - 8); g.stroke();
    // the pulley: a wheel, a rope to the door and a handle that comes down as you pull
    const hy = lerp(PU.y0, PU.y1, S.pull / ROPE);
    g.strokeStyle = '#b07a3c'; g.lineWidth = 4; g.beginPath(); g.moveTo(CX[2] + DOOR_W / 2 - 6, DOOR_TOP - S.door[2] * 0 - 4); g.lineTo(PU.x - 16, PU.top); g.moveTo(PU.x + 16, PU.top); g.lineTo(PU.x + 16, hy); g.stroke();
    g.fillStyle = C.stone; g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.arc(PU.x, PU.top, 18, 0, Math.PI * 2); g.fill(); g.stroke();
    g.save(); g.translate(PU.x, PU.top); g.rotate(S.pull * 1.4); g.strokeStyle = C.navy; g.beginPath(); g.moveTo(-14, 0); g.lineTo(14, 0); g.moveTo(0, -14); g.lineTo(0, 14); g.stroke(); g.restore();
    g.fillStyle = S.held ? C.gold : C.red; g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.arc(PU.x + 16, hy + 12, 13, 0, Math.PI * 2); g.fill(); g.stroke();
    if (S.pull > .05) T.label(`${S.pull.toFixed(1)} yd`, PU.x + 16, hy + 40, 'center', C.ink, 13);
    if (S.px != null) person(g, S.px);
    if (o.title) return;
    // readouts: one panel per door
    for (let i = 0; i < 3; i++) panel(g, i, S);
  }
  function panel(g, i, S) {
    const x0 = BAY * i + 10, w = BAY - 20, y0 = FLOOR + 36;
    g.fillStyle = 'rgba(255,252,244,.85)'; g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(x0, y0, w, H - y0 - 6, 10); g.fill(); g.stroke();
    g.fillStyle = C.ink; g.font = '800 17px Montserrat, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText(DEF[i], x0 + 12, y0 + 18);
    const v = [S.sw, S.pressed, S.pull / ROPE][i];
    const big = i < 2 ? (v ? 'Open? T' : 'Open? F') : `Open ${(S.pull).toFixed(1)} / 5.0`;
    g.textAlign = 'right'; g.font = '800 19px Montserrat, sans-serif'; g.fillStyle = (i < 2 ? v : v > .02) ? C.good : C.redDk; g.fillText(big, x0 + w - 12, y0 + 18);
    g.font = '600 13.5px Jost, sans-serif'; g.textAlign = 'left'; g.fillStyle = C.muted;
    g.fillText(`Input: ${KIND[i][0]}`, x0 + 12, y0 + 44); g.fillText(`Output: ${KIND[i][1]}`, x0 + 12, y0 + 62);
    g.fillText(`Checks: ${KIND[i][2]}`, x0 + 12, y0 + 80);
    // the check light: lit on the frame the device evaluates
    const recent = S.checks[i].length && S.t - S.checks[i].at(-1) < (i ? .06 : .35);
    g.fillStyle = recent ? C.gold : '#d8cfbb'; g.strokeStyle = C.navy; g.lineWidth = 1.5; g.beginPath(); g.arc(x0 + w - 20, y0 + 80, 7, 0, Math.PI * 2); g.fill(); g.stroke();
    // strip chart: state over the last 8 s, with a tick under every evaluation
    const sx0 = x0 + 12, sx1 = x0 + w - 12, sy0 = y0 + 100, sy1 = H - 34, X = t => lerp(sx0, sx1, 1 - (S.t - t) / HIST);
    g.fillStyle = '#f1e9d6'; g.fillRect(sx0, sy0, sx1 - sx0, sy1 - sy0);
    g.strokeStyle = [C.player, C.p2, C.purple][i]; g.lineWidth = 3; g.beginPath();
    S.hist.forEach((h, k) => { const y = lerp(sy1 - 4, sy0 + 4, h.v[i]); k ? g.lineTo(X(h.t), y) : g.moveTo(X(h.t), y); }); g.stroke();
    g.fillStyle = C.gold; S.checks[i].forEach((t, k) => { if (i && k % 6) return; g.fillRect(X(t) - 1, sy1 + 4, 2, i ? 6 : 12); });   // every 6th frame, or the strip is solid
    g.fillStyle = C.muted; g.font = '600 12px Jost, sans-serif'; g.textAlign = 'left'; g.fillText('state over time · checks ▾', sx0, sy1 + 22);
  }

  // ---------- the walk-through ----------
  const DUR = 22;
  const P = TD.Path([-40, 0], 230).go(SW_X + 34, 0).wait(.8).go(PL.x0 + 40, 0).wait(1.6).go(PU.x + 16 + 26, 0).wait(3).go(CX[1] - 96, 0).wait(9);
  const FLIP_AT = P.segs[1].t0 + .4, PULL = [P.segs[5].t0 + .2, P.segs[5].t0 + 2.6];
  function script(S, t) {
    S.px = P.at(t).x;
    if (t >= FLIP_AT && t < 20.6) flip(S, true); else flip(S, false);
    S.held = t >= PULL[0] && t <= PULL[1] + .3;
    S.pull = t < 20.6 ? 3.5 * ease(clamp((t - PULL[0]) / (PULL[1] - PULL[0]))) : 0;
  }
  const CAPS = [[0, 'Flip the switch: one signal, one change. Door A opens and stays open.'], [P.segs[2].t0, 'Stand on the plate: it checks “is something here?” every frame. Door B opens while you stand on it.'],
    [P.segs[4].t0, 'Pull the rope 3.5 of 5 yards: the pulley stores how far, so door C opens 70%.'], [P.segs[6].t0, 'Walk away. The switch remembers, the plate forgets the moment you leave, the pulley keeps its 70%.'], [20.6, 'Reset, and again.']];
  const capAt = t => CAPS.filter(c => t >= c[0]).at(-1)[1];
  function seekTo(t) { const S = fresh(); for (let x = 0; x < t; x += 1 / 60) { script(S, x); step(S, 1 / 60); } return S; }

  canvasDemo('title', (s, cv, g) => { let S = fresh(), tt = 0; return dt => { tt += dt; if (tt > DUR) { tt = 0; S = fresh(); } script(S, tt); step(S, dt); scene(g, S, { title: 1 }); }; });

  let api = null;
  canvasDemo('doors', (s, cv, g) => {
    let S = fresh(), tour = true, tt = 0, held = false, drag = null;
    const tourBtn = $(s, '.dr-tour');
    const stopTour = () => { if (tour) { tour = false; S.px = null; S.held = false; } tourBtn.classList.remove('on'); };
    tourBtn.onclick = () => { tour = true; tt = 0; S = fresh(); tourBtn.classList.add('on'); };
    $(s, '.dr-reset').onclick = () => { stopTour(); S = fresh(); };
    cv.addEventListener('pointerdown', e => {
      const p = FPF.ptr(cv, e);
      if (Math.hypot(p.x - SW_X, p.y - SW_Y) < 50) { stopTour(); flip(S); return; }
      if (Math.abs(p.x - S.crate) < 34 && p.y > FLOOR - 70 && p.y < FLOOR) { stopTour(); drag = { k: 'crate', dx: S.crate - p.x }; }
      const hy = lerp(PU.y0, PU.y1, S.pull / ROPE);
      if (Math.hypot(p.x - PU.x - 16, p.y - hy - 12) < 30) { stopTour(); drag = { k: 'rope', dy: hy - p.y }; S.held = true; }
      if (drag) cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', e => {
      if (!drag) return; const p = FPF.ptr(cv, e);
      if (drag.k === 'crate') S.crate = clamp(p.x + drag.dx, 40, W - 40);
      else S.pull = clamp((p.y + drag.dy - PU.y0) / (PU.y1 - PU.y0)) * ROPE;
    });
    const up = () => { drag = null; S.held = false; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    function render() {
      scene(g, S);
      const out = tour ? capAt(tt) : 'Each door ends in the same question: open or not? Watch what each one has to check to answer it, and when.';
      const key = `${S.sw}|${S.pressed}|${S.pull.toFixed(1)}|${out}`; if (key === S.last) return; S.last = key;
      say($(s, '.dr-stats'), `<div><b>${S.sw ? 'T' : 'F'}</b><span>switch: changed only by a flip</span></div><div class="g"><b>${S.pressed ? 'T' : 'F'}</b><span>plate: “something on me?” right now</span></div><div class="y"><b>${Math.round(S.pull / ROPE * 100)}%</b><span>pulley: ${S.pull.toFixed(1)} of 5 yards</span></div>`);
      say($(s, '.dr-out'), out);
    }
    api = { seek(t) { held = true; tour = true; tt = t; S = seekTo(t); render(); }, dur: () => DUR };
    return dt => {
      if (!held) { if (tour) { tt += dt; if (tt > DUR) { tt = 0; S = fresh(); } script(S, tt); } step(S, dt); }
      render();
    };
  });

  // ---------- slide 3: binary, discrete, continuous ----------
  const KW = { x0: 300, x1: 1010 }, ROWS = [110, 290, 470];
  canvasDemo('kinds', (s, cv, g) => {
    let tour = true, tt = 0, held = false, drag = false;
    const K = { t: 0, sw: 0, speed: 0, pull: 0, hist: [] };
    const tourBtn = $(s, '.kd-tour');
    tourBtn.onclick = () => { tour = !tour; tourBtn.classList.toggle('on', tour); tt = 0; };
    const kScript = t => { const k = t % 14; K.sw = k > 1 && k < 7 ? 1 : 0; K.speed = Math.min(5, Math.max(0, Math.floor((k - 2) / 1.2))) * (k < 10 ? 1 : 0); K.pull = k < 4 ? 0 : k < 9 ? ease(clamp((k - 4) / 4)) * .83 : k < 11 ? .83 : Math.max(0, .83 - (k - 11) * .5); };
    cv.addEventListener('pointerdown', e => {
      const p = FPF.ptr(cv, e);
      const stop = () => { tour = false; tourBtn.classList.remove('on'); };
      if (p.x < 260 && Math.abs(p.y - ROWS[0]) < 60) { stop(); K.sw ^= 1; }
      if (p.x < 270 && Math.abs(p.y - ROWS[1]) < 60) { stop(); const b = Math.floor((p.x - 30) / 36); if (b >= 0 && b <= 5) K.speed = b; }
      if (p.x < 260 && Math.abs(p.y - ROWS[2]) < 70) { stop(); drag = true; cv.setPointerCapture(e.pointerId); }
    });
    cv.addEventListener('pointermove', e => { if (drag) K.pull = clamp((FPF.ptr(cv, e).x - 40) / 200); });
    cv.addEventListener('pointerup', () => { drag = false; });
    function draw() {
      T.use(g); g.clearRect(0, 0, W, H);
      const lab = (txt, sub, y) => { g.fillStyle = C.ink; g.font = '800 22px Montserrat, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(txt, 30, y - 66); const w = g.measureText(txt).width; g.fillStyle = C.muted; g.font = '600 15px Jost, sans-serif'; g.fillText(sub, 30 + w + 12, y - 66); };
      // strip charts
      const X = t => lerp(KW.x0, KW.x1, 1 - (K.t - t) / 8);
      ROWS.forEach((y, i) => {
        g.fillStyle = 'rgba(255,252,244,.85)'; g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(KW.x0 - 10, y - 50, KW.x1 - KW.x0 + 20, 100, 8); g.fill(); g.stroke();
        g.strokeStyle = [C.player, C.gold, C.purple][i]; g.lineWidth = 4; g.beginPath();
        K.hist.forEach((h, k) => { const yy = lerp(y + 40, y - 40, h[i]); k ? g.lineTo(X(h.t), yy) : g.moveTo(X(h.t), yy); }); g.stroke();
        g.fillStyle = C.muted; g.font = '600 13px Jost, sans-serif'; g.textAlign = 'right';
        const ticks = [['1 (on)', '0 (off)'], ['5', '0'], ['1.0', '0.0']][i]; g.fillText(ticks[0], KW.x0 - 16, y - 40); g.fillText(ticks[1], KW.x0 - 16, y + 40);
      });
      lab('Binary', 'on / off: a switch', ROWS[0]);
      lab('Discrete', '0, 1, 2 … 5: a blender', ROWS[1]);
      lab('Continuous', '0.0 → 1.0: a rope', ROWS[2]);
      // switch
      g.fillStyle = C.wall; g.beginPath(); g.roundRect(60, ROWS[0] - 34, 140, 68, 34); g.fill();
      g.fillStyle = K.sw ? C.gold : '#e8e2cf'; g.beginPath(); g.arc(K.sw ? 166 : 94, ROWS[0], 26, 0, Math.PI * 2); g.fill();
      T.label(K.sw ? 'On' : 'Off', 236, ROWS[0], 'center', C.ink, 15);
      // blender buttons 0-5
      for (let b = 0; b <= 5; b++) { const x = 30 + b * 36; g.fillStyle = b === K.speed ? C.gold : '#e8e2cf'; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.roundRect(x, ROWS[1] - 18, 30, 36, 6); g.fill(); g.stroke(); g.fillStyle = C.ink; g.font = '800 16px Montserrat'; g.textAlign = 'center'; g.fillText(b, x + 15, ROWS[1] + 1); }
      g.save(); g.translate(270, ROWS[1]); g.rotate(K.t * K.speed * 3); g.strokeStyle = C.navy; g.lineWidth = 4; for (let k = 0; k < 3; k++) { g.rotate(Math.PI * 2 / 3); g.beginPath(); g.moveTo(0, 0); g.lineTo(18, 0); g.stroke(); } g.restore();
      // rope
      g.strokeStyle = '#b07a3c'; g.lineWidth = 5; g.beginPath(); g.moveTo(30, ROWS[2]); g.lineTo(40 + K.pull * 200, ROWS[2]); g.stroke();
      g.fillStyle = C.red; g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.arc(40 + K.pull * 200, ROWS[2], 14, 0, Math.PI * 2); g.fill(); g.stroke();
      T.label(K.pull.toFixed(2), 40 + K.pull * 200, ROWS[2] + 34, 'center', C.ink, 14);
    }
    api2 = { seek(t) { held = true; K.t = 0; K.hist = []; for (let x = 0; x < t; x += 1 / 30) { kScript(x); K.t = x; K.hist.push({ t: x, 0: K.sw, 1: K.speed / 5, 2: K.pull }); } K.hist = K.hist.filter(h => h.t > t - 8); draw(); }, dur: () => 14 };
    return dt => {
      if (!held) {
        if (tour) { tt += dt; kScript(tt); }
        K.t += dt; K.hist.push({ t: K.t, 0: K.sw, 1: K.speed / 5, 2: K.pull }); while (K.hist[0].t < K.t - 8) K.hist.shift();
      }
      draw();
    };
  });
  let api2 = null;

  window.__seek = (t, w) => (w === 'kinds' ? api2 : api).seek(t);
  window.__dur = w => (w === 'kinds' ? api2 : api).dur();
})();
