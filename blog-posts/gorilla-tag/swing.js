/* Row with your own arm (genre breakdown: "How to Make a Game Like Gorilla Tag?"), slide 2: playable.
   Slide 1 shows the rule: a hand stuck to a surface moves the body the opposite way, and letting go keeps the
   velocity. Here the learner's mouse is the hand. Hold the button while the hand touches the ground or the wall and it
   grips; drag and the body moves the opposite way; let go and the body flies with the speed it had (averaged over the
   last 80 ms, times the launch boost). Cross the pit, climb the wall and reach the flag before the tagger, who
   starts after 3 seconds. The learner can try the run with no boost (x1.0) and with a boost (x1.3), the kind of dial
   arm-locomotion games tune, and compare their own times. The walk-through is a scripted hand. Values are illustrative. */
(function () {
  const C = TD.C, { clamp } = TD;
  const GRAV = 1000, ARM = 120, R = 22, PIT = [360, 520], WALL = 760, TOP = 230, GROUND = 470, FLAG = 990, TAGV = 95;
  const floorAt = x => x >= WALL ? TOP : x > PIT[0] && x < PIT[1] ? 700 : GROUND;
  // where a hand pressed at (hx, hy) grips: the wall face first, then the ground under it (a hand pushed into the dirt grips its surface)
  const grab = (hx, hy) => hx > WALL - 12 && hx < WALL + 30 && hy > TOP + 12 ? [WALL, hy] : floorAt(hx) < 700 && hy > floorAt(hx) - 10 ? [hx, floorAt(hx)] : null;
  const newRun = boost => ({ B: [120, GROUND - R], V: [0, 0], anchor: null, hist: [], t: 0, boost, state: 'run', falls: 0, tagX: -80 });

  function step(S, dt, hand, grip) {
    if (S.state !== 'run' || dt <= 0) return;
    S.t += dt;
    // the hand follows the pointer within arm's reach; while gripping, moving the pointer moves the body the other way
    const off = [hand[0] - S.B[0], hand[1] - S.B[1]], d = Math.hypot(...off), k = d > ARM ? ARM / d : 1, o = [off[0] * k, off[1] * k];
    let H = [S.B[0] + o[0], S.B[1] + o[1]];
    const A = grip && !S.anchor && grab(H[0], H[1]);
    if (A) { S.anchor = A; S.g0 = { B: S.B.slice(), M: hand.slice() }; }
    if (S.anchor && Math.hypot(S.anchor[0] - S.B[0], S.anchor[1] - S.B[1]) > ARM * 1.4) grip = false;   // arm fully stretched: the grip slips
    if (!grip && S.anchor) {
      S.anchor = null;
      const h = S.hist.filter(e => e[2] >= S.t - .08); if (h.length > 1) { const [a, b] = [h[0], h[h.length - 1]], span = Math.max(dt, b[2] - a[2]); S.V = [(b[0] - a[0]) / span * S.boost, (b[1] - a[1]) / span * S.boost]; }
      const sp = Math.hypot(...S.V); if (sp > 1300) S.V = S.V.map(v => v * 1300 / sp);
    }
    const prev = S.B.slice();
    if (S.anchor) { S.B = [S.g0.B[0] - (hand[0] - S.g0.M[0]), S.g0.B[1] - (hand[1] - S.g0.M[1])]; S.V = [(S.B[0] - prev[0]) / dt, (S.B[1] - prev[1]) / dt]; H = S.anchor.slice(); }
    else { S.V[1] += GRAV * dt; S.B = [S.B[0] + S.V[0] * dt, S.B[1] + S.V[1] * dt]; }
    // collisions: floor, the wall face, the left edge
    const fl = floorAt(S.B[0]) - R;
    if (S.B[0] + R > WALL && prev[0] + R <= WALL && S.B[1] > TOP) { S.B[0] = WALL - R; S.V[0] = 0; }
    if (S.B[1] > fl && floorAt(S.B[0]) < 700) { S.B[1] = fl; if (!S.anchor) { S.V[1] = 0; S.V[0] *= .86; } }
    S.B[0] = Math.max(R, S.B[0]); S.B[1] = Math.max(R, S.B[1]);
    S.hist.push([S.B[0], S.B[1], S.t]); if (S.hist.length > 40) S.hist.shift();
    if (S.B[1] > GROUND + 60) { S.falls++; Object.assign(S, { B: [120, GROUND - R], V: [0, 0], anchor: null, hist: [] }); }
    if (S.t > 3) S.tagX += TAGV * dt;
    if (Math.abs(S.tagX - S.B[0]) < 40 && S.B[1] > floorAt(S.tagX) - 90) S.state = 'tagged';
    if (S.B[0] > FLAG - 20 && S.B[1] < TOP) S.state = 'won';
    return H;
  }

  GK.scene('swing', (s, g, ui) => {
    const cv = s.querySelector('canvas'), playBtns = [...s.querySelectorAll('.sw-play .btn')];
    const st = { mode: 'tour', run: null, mouse: [200, 420], grip: false, last: null, best: {}, tries: {} };
    const toCanvas = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
    cv.addEventListener('pointermove', e => { st.mouse = toCanvas(e); });
    cv.addEventListener('pointerdown', e => { if (st.mode !== 'play') return; e.preventDefault(); cv.setPointerCapture(e.pointerId); st.mouse = toCanvas(e); st.grip = true; });
    cv.addEventListener('pointerup', () => { st.grip = false; });
    playBtns.forEach(b => b.onclick = () => { ui.stopTour(); st.mode = 'play'; st.run = newRun(+b.dataset.b); st.last = null; st.tries[b.dataset.b] = (st.tries[b.dataset.b] || 0) + 1; });
    ui.watch(playBtns);
    // walk-through: a scripted hand. Each 0.9 s stroke grips forward and low, drags back and down, then lets go and
    // reaches forward again; at the wall it grips high on the face and pulls down. Boost x1.3, fixed steps.
    const DT = 1 / 60;
    const bot = (S, t) => {
      const k = (t % .9) / .9, climb = S.B[0] > WALL - 110 && S.B[1] > TOP - R - 2;
      if (k < .4) {
        if (!S.o0 || S.o0.c !== Math.floor(t / .9)) S.o0 = { c: Math.floor(t / .9), B: S.B.slice(), climb };
        const q = k / .4, B0 = S.o0.B;
        return S.o0.climb ? [[WALL + 4 - 70 * q, B0[1] - 80 + 170 * q], true] : [[B0[0] + 70 - 130 * q, B0[1] + 30 + 70 * q], true];
      }
      const q = (k - .4) / .6; return [[S.B[0] - 60 + 130 * q, S.B[1] + 30 - 40 * Math.sin(q * Math.PI)], false];
    };
    const TOUR = (() => { const S = newRun(1.3), frames = []; for (let t = 0; t < 14 && S.state === 'run'; t += DT) { const [hand, gr] = bot(S, t); const H = step(S, DT, hand, gr); frames.push({ B: S.B.slice(), H, anchor: S.anchor && S.anchor.slice(), tagX: S.tagX, state: S.state, t: S.t }); } return frames; })();
    return {
      dur: TOUR.length * DT + 3,
      frame(t, tour) {
        if (tour && st.mode !== 'tour') st.mode = 'tour';
        let F;
        if (st.mode === 'tour') { const f = TOUR[Math.min(TOUR.length - 1, Math.floor(t / DT))]; F = { ...f, boost: 1.3, falls: 0 }; }
        else {
          const dt = st.last == null ? 0 : clamp(t - st.last, 0, .05); st.last = t; const S = st.run;
          let H = S.B; for (let k = 0; k < 2; k++) H = step(S, dt / 2, st.mouse, st.grip) || H;
          if (S.state === 'won') { const key = String(S.boost); st.best[key] = Math.min(st.best[key] ?? 1e9, S.t); }
          F = { B: S.B, H, anchor: S.anchor, tagX: S.tagX, state: S.state, t: S.t, boost: S.boost, falls: S.falls };
        }
        GK.panel(g);
        // the course
        g.fillStyle = '#cfe8f7'; g.fillRect(0, 40, 1040, 545); g.fillStyle = '#2b2118'; g.fillRect(PIT[0], GROUND + 40, PIT[1] - PIT[0], 585 - GROUND - 40);
        g.fillStyle = '#7a5a3a'; g.fillRect(0, GROUND, PIT[0], 120); g.fillRect(PIT[1], GROUND, WALL - PIT[1], 120); g.fillRect(WALL, TOP, 280, 585 - TOP);
        g.fillStyle = '#5f9f4a'; g.fillRect(0, GROUND, PIT[0], 8); g.fillRect(PIT[1], GROUND, WALL - PIT[1], 8); g.fillRect(WALL, TOP, 280, 8);
        GK.text(g, 'pit: fall in and restart', (PIT[0] + PIT[1]) / 2, GROUND + 70, '#e8d5b5', 12, 'center', 800);
        g.strokeStyle = '#444'; g.lineWidth = 3; g.beginPath(); g.moveTo(FLAG, TOP); g.lineTo(FLAG, TOP - 70); g.stroke(); g.fillStyle = C.gold; g.beginPath(); g.moveTo(FLAG, TOP - 70); g.lineTo(FLAG + 34, TOP - 58); g.lineTo(FLAG, TOP - 46); g.fill();
        // tagger
        if (F.tagX > -60) { const ty = floorAt(Math.max(0, F.tagX)) - R; TD.foe(F.tagX, Math.min(ty, GROUND - R), 20, 0, C.red, { mark: 'horns' }); GK.text(g, 'tagger', F.tagX, Math.min(ty, GROUND - R) - 30, C.redDk, 11, 'center', 800); }
        // the gorilla: body, arm, hand
        g.strokeStyle = '#4a3a2a'; g.lineWidth = 8; g.beginPath(); g.moveTo(F.B[0], F.B[1]); g.lineTo(F.H[0], F.H[1]); g.stroke();
        g.fillStyle = '#5a4632'; g.beginPath(); g.arc(F.B[0], F.B[1], R, 0, 6.283); g.fill();
        g.fillStyle = '#e8d5b5'; g.beginPath(); g.arc(F.B[0] + 6, F.B[1] - 4, 9, 0, 6.283); g.fill();
        g.fillStyle = F.anchor ? C.gold : '#3a2c1e'; g.beginPath(); g.arc(F.H[0], F.H[1], 10, 0, 6.283); g.fill();
        // header and readouts
        GK.head(g, st.mode === 'tour' ? 'Walk-through: a scripted hand rows to the flag (boost ×1.3)' : `Your run · boost ×${F.boost.toFixed(1)} · ${F.t.toFixed(1)} s`, 20, 28);
        if (F.state !== 'run') { GK.box(g, 360, 150, 320, 60, 'rgba(21,32,68,.88)', null, 12); GK.head(g, F.state === 'won' ? `Flag in ${F.t.toFixed(1)} s` : 'Tagged!', 520, 188, 'center', F.state === 'won' ? '#fff' : '#ff8a80', 22); }
        const b1 = st.best['1'], b13 = st.best['1.3'];
        GK.text(g, `Your best: ×1.0 ${b1 ? b1.toFixed(1) + ' s' : '–'} · ×1.3 ${b13 ? b13.toFixed(1) + ' s' : '–'}${st.mode === 'play' ? ` · falls this run: ${F.falls}` : ''}`, 1020, 28, C.ink, 14, 'right', 800);
        const msg = st.mode === 'tour' ? 'Press a Play button. Hold the mouse button to grip when your hand touches the ground or wall, drag back to pull yourself forward, let go to fly.'
          : b1 && b13 ? (b1 > b13 * 1.15 ? 'The boost made you faster: the same arm motion now covers more ground. It also makes small mistakes fly further.' : 'The boost barely changed your time: your technique, not the multiplier, is setting your pace.')
          : 'Grip, drag, release. Try both boosts and compare your times.';
        ui.stats(`<div><b>${b1 ? b1.toFixed(1) + ' s' : '–'}</b><span>your best, no boost</span></div><div><b>${b13 ? b13.toFixed(1) + ' s' : '–'}</b><span>your best, boost ×1.3</span></div>`);
        ui.out(msg);
      },
    };
  });
})();
