/* Spline vs invisible bunnies (post-mortem: "Nightbane: Overcoming Unforeseen Technical Challenges").
   Two ways to give Nightbane his flight. Left: the AI flight spline as it was, fifteen points dropped on the ground and
   dragged into the sky one at a time (no multi-select), where letting go over the castle snaps the point onto its
   collision instead of the sky behind it. Right: the version that shipped, three invisible bunnies A, B and C that
   Nightbane picks between. Each side has a target layout; reach it and the side counts an iteration, then the target
   changes, the way a designer tries a new idea. Clicks, broken points and iterations per hour carry the lesson.
   The walk-through is a scripted cursor and a pure function of time; play mode lets the learner drag. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585, PW = 505, GROUND = 500, TOL = 16;
  // the castle's collision, per panel: [x, y, w, h] relative to the panel
  const CASTLE = [[150, 250, 70, 250], [220, 330, 140, 170], [360, 210, 60, 290], [250, 280, 30, 50]];
  const inCastle = (x, y) => CASTLE.some(([cx, cy, cw, ch]) => x > cx && x < cx + cw && y > cy && y < cy + ch);
  function snapOut(x, y) {   // the old editor: a release over collision lands on the nearest wall face
    for (const [cx, cy, cw, ch] of CASTLE) if (x > cx && x < cx + cw && y > cy && y < cy + ch) {
      const d = [[x - cx, cx, y], [cx + cw - x, cx + cw, y], [y - cy, x, cy]].sort((a, b) => a[0] - b[0])[0];
      return d[0] === y - cy ? { x, y: cy } : { x: d[1], y };
    }
    return { x, y };
  }
  // targets: an arc of fifteen points over the castle, or three hover spots, varied per iteration
  const splineGoal = k => Array.from({ length: 15 }, (_, i) => { const a = i / 14; return { x: 40 + a * 425, y: 140 + Math.sin(a * Math.PI) * -70 + (k % 3) * 34 + Math.sin(a * 6 + k) * 18 }; });
  const bunnyGoal = k => [{ x: 110 + (k % 2) * 30, y: 150 + (k % 3) * 20 }, { x: 260, y: 110 + (k % 2) * 40 }, { x: 420 - (k % 3) * 25, y: 160 + (k % 2) * 25 }];
  const startPts = n => Array.from({ length: n }, (_, i) => ({ x: 40 + i / Math.max(1, n - 1) * 425, y: GROUND - 8 }));

  function fresh() {
    return {
      L: { pts: startPts(15), goal: 0, clicks: 0, broken: 0, iters: 0, tIter: 0, times: [] },
      R: { pts: startPts(3), goal: 0, clicks: 0, broken: 0, iters: 0, tIter: 0, times: [] },
    };
  }
  const goalOf = (side, P) => side === 'L' ? splineGoal(P.goal) : bunnyGoal(P.goal);
  const done = (side, P) => goalOf(side, P).every((g, i) => Math.hypot(P.pts[i].x - g.x, P.pts[i].y - g.y) < TOL);
  function release(side, P, i, x, y, t) {
    let q = { x, y };
    if (side === 'L' && inCastle(x, y)) { q = { ...snapOut(x, y), snap: true }; P.broken++; }
    P.pts[i] = q;
    if (done(side, P)) { P.times.push(t - P.tIter); P.tIter = t; P.iters++; P.goal++; P.pts = startPts(P.pts.length); }
  }

  /* the scripted designer: per point, 1.1 s to drag on the spline side (plus a misclick on two points that sits over
     the castle and has to be redone), 1.1 s per bunny. Returns the state at time t and the cursor position. */
  const DRAG = 1.1;
  function script(t) {
    const S = fresh(); const cur = {};
    ['L', 'R'].forEach(side => {
      const P = S[side]; let clock = 0, cx = 250, cy = 540;
      while (true) {
        const goal = goalOf(side, P), n = goal.length;
        let finished = false;
        for (let i = 0; i < n; i++) {
          const g = goal[i], miss = side === 'L' && (i === 6 || i === 9) && P.goal % 2 === 0;
          const tries = miss ? [{ x: 265, y: 300 }, g] : [g];
          for (const to of tries) {
            const from = { ...P.pts[i] };
            if (t < clock + DRAG) { const k = ease(clamp((t - clock) / DRAG)); cur[side] = { x: lerp(from.x, to.x, k), y: lerp(from.y, to.y, k), drag: true }; P.pts[i] = { x: cur[side].x, y: cur[side].y }; finished = true; break; }
            P.clicks++; clock += DRAG; release(side, P, i, to.x, to.y, clock);
          }
          if (finished) break;
        }
        if (finished) break;
      }
    });
    return { S, cur };
  }

  function panel(g, side, P, ox, cur, t, play) {
    g.save(); g.translate(ox, 0);
    const sky = g.createLinearGradient(0, 0, 0, GROUND); sky.addColorStop(0, '#1b2350'); sky.addColorStop(1, '#4a4f86');
    g.fillStyle = sky; g.beginPath(); g.roundRect(0, 60, PW, GROUND - 60, [12, 12, 0, 0]); g.fill();
    g.fillStyle = '#3a3a2e'; g.fillRect(0, GROUND, PW, 30);
    CASTLE.forEach(([cx, cy, cw, ch]) => { g.fillStyle = '#2a2e55'; g.fillRect(cx, cy, cw, ch); for (let k = 0; k < cw; k += 14) g.fillRect(cx + k, cy - 8, 8, 8); });
    g.fillStyle = 'rgba(255,220,140,.6)'; [[175, 290], [180, 340], [290, 370], [380, 260], [385, 320]].forEach(([x, y]) => g.fillRect(x, y, 6, 10));
    const goal = goalOf(side, P);
    // target ghost
    g.setLineDash([5, 6]); g.strokeStyle = 'rgba(255,185,81,.6)'; g.lineWidth = 2; g.beginPath();
    goal.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); if (side === 'L') g.stroke(); g.setLineDash([]);
    goal.forEach((p, i) => { g.strokeStyle = 'rgba(255,185,81,.75)'; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, side === 'L' ? 9 : 16, 0, TAU); g.stroke(); });
    // the current path
    if (side === 'L') { g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; g.beginPath(); P.pts.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.stroke(); }
    P.pts.forEach((p, i) => {
      const on = Math.hypot(p.x - goal[i].x, p.y - goal[i].y) < TOL, stuck = side === 'L' && p.snap;
      if (side === 'L') { g.fillStyle = stuck ? C.red : on ? C.gold : '#ff8a3c'; g.beginPath(); g.arc(p.x, p.y, 7, 0, TAU); g.fill(); }
      else { g.fillStyle = on ? C.gold : '#f2ead6'; g.beginPath(); g.ellipse(p.x, p.y, 13, 11, 0, 0, TAU); g.fill(); g.fillStyle = '#f2ead6'; g.beginPath(); g.ellipse(p.x - 5, p.y - 14, 3, 8, -.2, 0, TAU); g.ellipse(p.x + 5, p.y - 14, 3, 8, .2, 0, TAU); g.fill(); g.font = '800 12px Montserrat, Jost, sans-serif'; g.fillStyle = C.navy; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ABC'[i], p.x, p.y + 1); }
    });
    if (cur && cur.x != null) { g.fillStyle = '#fff'; g.strokeStyle = C.navy; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cur.x, cur.y); g.lineTo(cur.x + 4, cur.y + 16); g.lineTo(cur.x + 8, cur.y + 11); g.lineTo(cur.x + 14, cur.y + 12); g.closePath(); g.fill(); g.stroke(); }
    // header and stats
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.font = '800 15px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.fillText(side === 'L' ? 'Hand-placed flight spline (15 points)' : 'Three invisible bunnies: A, B, C', 6, 24);
    g.font = '500 12px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText(side === 'L' ? 'one point at a time; let go over the castle and it snaps onto the wall' : 'Nightbane circles, then picks one to hover at', 6, 44);
    const avg = P.times.length ? P.times.reduce((a, b) => a + b, 0) / P.times.length : 0;
    const rows = [['clicks', P.clicks], ['snapped onto the castle', P.broken], ['layouts finished', P.iters], ['ideas per hour, this pace', avg ? Math.round(3600 / avg) : '…']];
    rows.forEach(([n, v], i) => { const y = 556 + (i > 1 ? 0 : 0), x = 6 + i * 125; g.font = '800 18px Montserrat, Jost, sans-serif'; g.fillStyle = i === 1 && v ? C.red : C.ink; g.fillText(String(v), x, 556); g.font = '500 11px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText(n, x, 574); });
    g.restore();
  }

  const DUR = 40;
  const scenes = {};
  canvasDemo('tools', (s, cv, g) => {
    const st = { tour: true, held: false, t: 0, S: null, drag: null, key: '' };
    const tourBtn = $(s, '.nb-tour'), playBtn = $(s, '.nb-play');
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); playBtn.classList.remove('on'); };
    playBtn.onclick = () => { st.tour = false; st.S = fresh(); st.t = 0; playBtn.classList.add('on'); tourBtn.classList.remove('on'); };
    const at = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
    const sideAt = x => x < PW + 15 ? ['L', 0] : ['R', PW + 30];
    cv.addEventListener('mousedown', e => {
      if (st.tour) playBtn.onclick();
      const p = at(e), [side, ox] = sideAt(p.x), P = st.S[side], lx = p.x - ox;
      const i = P.pts.findIndex(q => Math.hypot(q.x - lx, p.y - q.y) < 16);
      P.clicks++;
      if (i >= 0) st.drag = { side, ox, i };
    });
    cv.addEventListener('mousemove', e => { if (!st.drag) return; const p = at(e), P = st.S[st.drag.side]; P.pts[st.drag.i] = { x: p.x - st.drag.ox, y: Math.min(GROUND - 8, p.y) }; });
    addEventListener('mouseup', e => { if (!st.drag) return; const p = at(e), d = st.drag; st.drag = null; release(d.side, st.S[d.side], d.i, p.x - d.ox, Math.min(GROUND - 8, p.y), st.t); });
    function frame(t) {
      let S, cur = {};
      if (st.tour) ({ S, cur } = script(t)); else S = st.S;
      T.use(g); g.clearRect(0, 0, W, H);
      panel(g, 'L', S.L, 0, cur.L || {}, t); panel(g, 'R', S.R, PW + 30, cur.R || {}, t);
      const key = [S.L.iters, S.R.iters, S.L.broken, st.tour].join(); if (key === st.key) return; st.key = key;
      say($(s, '.nb-stats'), `<div class="${S.L.broken ? 'r' : ''}"><b>${S.L.iters}</b><span>spline layouts finished</span></div><div class="g"><b>${S.R.iters}</b><span>bunny layouts finished</span></div>`);
      say($(s, '.nb-out'), st.tour ? 'Same designer, same clock. The spline side drags fifteen points per idea and loses two to the castle; the bunny side drags three. More iterations per hour means more ideas tried.' : 'Drag the orange points (left) or the bunnies (right) onto the gold circles. Let go over the castle on the left and see what happens.');
    }
    scenes.tools = { seek(t) { st.held = true; st.tour = true; frame(t); }, dur: () => DUR };
    return dt => { if (st.held) return; st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; frame(st.t); };
  });
  window.__seek = (t, which = 'tools') => scenes[which].seek(t);
  window.__dur = (which = 'tools') => scenes[which].dur();
})();
