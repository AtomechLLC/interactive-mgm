/* Lesson 1: Clarity ("Learning From My Past", xelnath.com, 2012), rebuilt around independent games the posts don't name.
   The lesson underneath: players respond to what they perceive, not to what is true, so every cue is a message.
   1. Into the Breach: an enemy turn you can read. Toggle the cues on a small puzzle; a crowd of players finds the save.
   2. Celeste: the dash state lives in Madeline's hair, where your eyes already are. Compare a HUD icon in the corner.
   3. Hades: boon names say who and what ("Lightning Strike"), the post's "Clawing Strike" lesson.
   Drawings are our own. Crowd numbers are illustrative. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const { C, clamp, lerp, ease, IM, ready, rr, wrap, text } = LP;
  const W = 1040, H = 585, TAU = Math.PI * 2, F = (w, s) => `${w} ${s}px Jost, sans-serif`, M = (w, s) => `${w} ${s}px Montserrat, Jost, sans-serif`;

  /* ---------------- 1. Into the Breach ---------------- */
  const T = 74, GX = 40, GY = 66, tile = (c, r) => [GX + c * T, GY + r * T], mid = (c, r) => [GX + c * T + T / 2, GY + r * T + T / 2];
  const CUES = {
    target: { label: 'Tiles they will hit', w: .3 },
    arrow: { label: 'Attack direction', w: .1 },
    dmg: { label: 'Damage numbers', w: .05 },
    order: { label: 'Attack order', w: .05 },
    preview: { label: 'Preview of your shot', w: .25 },
  };
  const SHOTS = {
    w: { label: 'Push bug 1 west', to: [1, 2], other: null, out: 'Bug 1 lands next to bug 2 and bites it instead. Both buildings stand, and one bug kills the other.', saved: 2, bonus: true },
    s: { label: 'Push bug 1 south', to: [2, 3], other: null, out: 'Bug 1 bites the empty tile it left. Both buildings stand.', saved: 2 },
    e: { label: 'Push bug 1 east', to: [3, 2], other: null, out: 'Bug 1 now bites the other building. You moved the damage instead of stopping it.', saved: 1 },
    x: { label: 'Shoot bug 2', to: [2, 2], other: [0, 1], out: 'Bug 2 slides away, but bug 1 still bites the building you meant to protect.', saved: 1 },
  };
  const PX = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
  function bug(g, x, y, n, a = 1) { // blocky, hard-edged insect with a dark outline
    g.globalAlpha = a; x = Math.round(x); y = Math.round(y);
    PX(g, x - 20, y - 4, 40, 28, '#1d1208'); PX(g, x - 16, y - 20, 32, 20, '#1d1208'); // outline
    for (let i = 0; i < 3; i++) { PX(g, x - 30, y + 2 + i * 9, 12, 4, '#1d1208'); PX(g, x + 18, y + 2 + i * 9, 12, 4, '#1d1208'); }
    PX(g, x - 16, y, 32, 22, '#d9772f'); PX(g, x - 16, y + 16, 32, 6, '#a4501a'); PX(g, x - 12, y + 4, 8, 6, '#f0a15a'); // shell with shading
    PX(g, x - 12, y - 16, 24, 16, '#b05a1e'); PX(g, x - 8, y - 12, 6, 6, '#ffe36e'); PX(g, x + 2, y - 12, 6, 6, '#ffe36e'); PX(g, x - 6, y - 10, 2, 2, '#1d1208'); PX(g, x + 4, y - 10, 2, 2, '#1d1208');
    PX(g, x - 18, y - 22, 4, 8, '#1d1208'); PX(g, x + 14, y - 22, 4, 8, '#1d1208'); // antennae
    text(g, `bug ${n}`, x, y + 42, M(700, 12), '#fff', 'center'); g.globalAlpha = 1;
  }
  function building(g, c, r, alive) {
    const [x, y] = tile(c, r);
    if (!alive) { PX(g, x + 10, y + 50, 54, 12, '#2b2b2b'); for (let i = 0; i < 5; i++) PX(g, x + 12 + i * 10, y + 40 - (i % 2) * 8, 8, 12 + (i % 2) * 8, '#555a60'); PX(g, x + 26, y + 30, 8, 8, '#8a4b2a'); return; }
    PX(g, x + 10, y + 12, 54, 54, '#1b2128'); PX(g, x + 12, y + 14, 50, 50, '#8f9aa6'); PX(g, x + 12, y + 14, 8, 50, '#adb7c2'); PX(g, x + 54, y + 14, 8, 50, '#6c7682'); PX(g, x + 12, y + 8, 50, 8, '#d3dae2'); PX(g, x + 12, y + 14, 50, 3, '#4b535c');
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) PX(g, x + 22 + i * 13, y + 24 + j * 13, 8, 8, (i + j) % 2 ? '#ffe08a' : '#ffc34a');
  }
  function mech(g, c, r) {
    const [x, y] = mid(c, r); const X = Math.round(x), Y = Math.round(y);
    PX(g, X - 22, Y - 20, 44, 40, '#0e2438'); PX(g, X - 18, Y - 16, 36, 32, '#2e7fd6'); PX(g, X - 18, Y + 8, 36, 8, '#1b4f8a'); PX(g, X - 14, Y - 12, 12, 8, '#8fd0ff'); // body, shading, visor
    PX(g, X + 2, Y - 36, 8, 24, '#0e2438'); PX(g, X + 4, Y - 34, 4, 20, '#bfe0ff'); // cannon
    PX(g, X - 26, Y + 14, 10, 10, '#0e2438'); PX(g, X + 16, Y + 14, 10, 10, '#0e2438'); // feet
    text(g, 'your mech', x, y + 40, M(700, 12), '#fff', 'center');
  }
  function breachScene(g, cues, shot, play) {
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#20262e'; rr(g, 10, 10, W - 20, H - 20, 14); g.fill();
    text(g, 'ENEMY TURN NEXT', 40, 46, M(800, 16), '#c9d1d9');
    for (let c = 0; c < 6; c++) for (let r = 0; r < 6; r++) { const [x, y] = tile(c, r); PX(g, x, y, T - 2, T - 2, (c + r) % 2 ? '#5a6a4e' : '#62724f'); PX(g, x, y, T - 2, 3, '#7d8f66'); PX(g, x, y, 3, T - 2, '#7d8f66'); PX(g, x, y + T - 5, T - 2, 3, '#3d4a35'); PX(g, x + T - 5, y, 3, T - 2, '#3d4a35'); }
    const S = shot ? SHOTS[shot] : null, p = play == null ? -1 : play;
    const pushK = ease(clamp(p / .6)), e1 = S && p >= 0 ? [lerp(2, S.to[0], pushK), lerp(2, S.to[1], pushK)] : [2, 2];
    const e2pos = S && S.other && p >= 0 ? [lerp(1, S.other[0], pushK), lerp(1, S.other[1], pushK)] : [1, 1];
    const e1t = [Math.round(e1[0]), Math.round(e1[1]) - 1], e2t = [Math.round(e2pos[0]) - 1, Math.round(e2pos[1])];
    const e2dead = S && S.bonus && p > 1.3, b1dead = S && S.saved === 1 && shot !== 'e' && p > 1.3, b2dead = shot === 'e' && p > 1.3;
    // what the player can see before the turn
    const showPlan = p < 0, ghost = p < 0 && S && cues.preview;
    const targets = [[e1t, 1, e1], ...(e2dead ? [] : [[e2t, 2, e2pos]])];
    if (cues.target && p < .6) targets.forEach(([t]) => { const [x, y] = tile(t[0], t[1]); g.fillStyle = 'rgba(240,120,30,.5)'; g.fillRect(x, y, T - 2, T - 2); g.save(); g.beginPath(); g.rect(x, y, T - 2, T - 2); g.clip(); g.strokeStyle = 'rgba(255,214,120,.8)'; g.lineWidth = 4; for (let k = -T; k < T * 2; k += 14) { g.beginPath(); g.moveTo(x + k, y + T); g.lineTo(x + k + T, y); g.stroke(); } g.restore(); g.strokeStyle = '#ffae3a'; g.lineWidth = 4; g.strokeRect(x + 2, y + 2, T - 6, T - 6); });
    building(g, 2, 1, !b1dead); building(g, 3, 1, !b2dead); mech(g, 2, 5);
    if (cues.arrow && p < .6) targets.forEach(([t, , from]) => { const [x0, y0] = mid(from[0], from[1]), [x1, y1] = mid(t[0], t[1]); g.strokeStyle = '#ffb36b'; g.lineWidth = 5; g.beginPath(); g.moveTo(x0, y0); g.lineTo(lerp(x0, x1, .8), lerp(y0, y1, .8)); g.stroke(); const a = Math.atan2(y1 - y0, x1 - x0); g.fillStyle = '#ffb36b'; g.beginPath(); g.moveTo(x1 - Math.cos(a) * 8, y1 - Math.sin(a) * 8); g.lineTo(x1 - Math.cos(a) * 24 + Math.sin(a) * 10, y1 - Math.sin(a) * 24 - Math.cos(a) * 10); g.lineTo(x1 - Math.cos(a) * 24 - Math.sin(a) * 10, y1 - Math.sin(a) * 24 + Math.cos(a) * 10); g.fill(); });
    if (cues.dmg && p < .6) targets.forEach(([t]) => { const [x, y] = tile(t[0], t[1]); g.fillStyle = '#d8402f'; g.beginPath(); g.arc(x + T - 16, y + 14, 11, 0, TAU); g.fill(); text(g, '1', x + T - 16, y + 19, M(800, 14), '#fff', 'center'); });
    if (ghost) { // the shot preview
      const [mx, my] = mid(2, 5), tgt = shot === 'x' ? [1, 1] : [2, 2], [tx, ty] = mid(tgt[0], tgt[1]);
      g.setLineDash([6, 5]); g.strokeStyle = '#8fd0ff'; g.lineWidth = 3; g.beginPath(); g.moveTo(mx, my - 30); g.quadraticCurveTo((mx + tx) / 2, Math.min(my, ty) - 80, tx, ty); g.stroke(); g.setLineDash([]);
      const to = shot === 'x' ? S.other : S.to, [gx, gy] = mid(to[0], to[1]); bug(g, gx, gy, shot === 'x' ? 2 : 1, .35);
      const nt = shot === 'x' ? [to[0] - 1, to[1]] : [to[0], to[1] - 1]; if (nt[0] >= 0) { const [x, y] = tile(nt[0], nt[1]); g.setLineDash([5, 4]); g.strokeStyle = '#8fd0ff'; g.lineWidth = 3; g.strokeRect(x + 4, y + 4, T - 10, T - 10); g.setLineDash([]); }
    }
    // the bugs, lunging during their attack
    const lunge = (k, from, t) => { const s = Math.sin(clamp(k) * Math.PI) * .35; return [from[0] + (t[0] - from[0]) * s, from[1] + (t[1] - from[1]) * s]; };
    const a1 = lunge((p - .6) / .7, e1, e1t), a2 = lunge((p - 1.4) / .7, e2pos, e2t);
    if (!e2dead) { const [x, y] = mid(a2[0], a2[1]); bug(g, x, y, 2); if (cues.order && showPlan) { g.fillStyle = '#ffde59'; g.beginPath(); g.arc(x + 20, y - 26, 11, 0, TAU); g.fill(); text(g, '2', x + 20, y - 21, M(800, 14), '#20262e', 'center'); } }
    { const [x, y] = mid(a1[0], a1[1]); bug(g, x, y, 1); if (cues.order && showPlan) { g.fillStyle = '#ffde59'; g.beginPath(); g.arc(x + 20, y - 26, 11, 0, TAU); g.fill(); text(g, '1', x + 20, y - 21, M(800, 14), '#20262e', 'center'); } }
    [[.6, e1t], [1.4, e2t]].forEach(([t0, t]) => { const k = (p - t0) / .7; if (k > .3 && k < .8) { const [x, y] = mid(t[0], t[1]); g.fillStyle = 'rgba(255,240,200,.75)'; g.beginPath(); g.arc(x, y, 30, 0, TAU); g.fill(); } });
    // right panel
    const R = 510; g.fillStyle = 'rgba(255,255,255,.06)'; rr(g, R, 30, 510, 525, 12); g.fill();
    text(g, 'Save the two buildings.', R + 20, 66, M(800, 20), '#fff');
    text(g, 'You get one shot, then the bugs act.', R + 20, 92, F(500, 16), '#c9d1d9');
    text(g, 'WHAT THE SCREEN TELLS YOU', R + 20, 132, M(800, 13), '#9aa3ad');
    Object.entries(CUES).forEach(([k, c], i) => { const on = cues[k], y = 160 + i * 30; g.fillStyle = on ? C.gold : '#4a525c'; rr(g, R + 20, y - 14, 18, 18, 4); g.fill(); if (on) text(g, '✓', R + 29, y, M(800, 14), '#20262e', 'center'); text(g, c.label, R + 48, y, F(600, 16), on ? '#fff' : '#7d8590'); });
    const share = clamp(.15 + Object.entries(CUES).reduce((a, [k, c]) => a + (cues[k] ? c.w : 0), 0)), n = Math.round(share * 20);
    text(g, 'Of 20 players, how many find a save (illustrative)', R + 20, 330, F(600, 15), '#c9d1d9');
    for (let i = 0; i < 20; i++) { const x = R + 34 + i * 23, y = 360; g.fillStyle = i < n ? C.green : '#4a525c'; g.beginPath(); g.arc(x, y - 8, 6, 0, TAU); g.fill(); rr(g, x - 7, y - 1, 14, 14, 5); g.fill(); }
    text(g, `${n} of 20`, R + 490, 392, M(800, 18), n > 12 ? C.green : n > 6 ? C.gold : '#ff7a6b', 'right');
    if (S && p > 2.2) { g.fillStyle = S.saved === 2 ? 'rgba(47,158,90,.25)' : 'rgba(216,64,47,.25)'; rr(g, R + 20, 420, 470, 116, 10); g.fill(); text(g, S.saved === 2 ? 'BOTH BUILDINGS STAND' : 'ONE BUILDING LOST', R + 36, 448, M(800, 16), S.saved === 2 ? '#7ee2a0' : '#ff8a7a'); g.font = F(600, 16); g.fillStyle = '#fff'; g.textAlign = 'left'; wrap(g, S.out, R + 36, 474, 440, 21); }
    else { g.font = F(500, 15); g.fillStyle = '#c9d1d9'; g.textAlign = 'left'; wrap(g, Object.values(cues).some(Boolean) ? 'Every cue you add answers a question before the player has to ask it.' : 'With no cues, you are guessing what the bugs will do.', R + 20, 440, 470, 21); }
  }
  canvasDemo('breach', (sl, cv, g) => {
    const cBox = $(sl, '.br-cues'), sSeg = $(sl, '.br-shot'), out = $(sl, '.br-out'), tourBtn = $(sl, '.br-tour');
    cBox.innerHTML = Object.entries(CUES).map(([k, c]) => `<label class="chk"><input type="checkbox" data-c="${k}"> ${c.label}</label>`).join('');
    sSeg.innerHTML = Object.entries(SHOTS).map(([k, s]) => `<button class="btn" data-s="${k}">${s.label}</button>`).join('');
    const ORDER = Object.keys(CUES), STAGES = [
      [[], null, 'Into the Breach shows you the whole enemy turn before you act. Start with nothing: two bugs, two buildings, and no idea what happens next.'],
      [['target'], null, 'Add the tiles they will hit. Now you know a building is in danger, and from which bug.'],
      [['target', 'arrow'], null, 'Add the attack direction. A bug bites in a fixed direction, so moving the bug moves the bite.'],
      [['target', 'arrow', 'dmg', 'order'], null, 'Add damage and attack order. Bug 1 bites first, then bug 2.'],
      [['target', 'arrow', 'dmg', 'order', 'preview'], 'w', 'Add a preview of your shot. You can see the save before you commit: push bug 1 west and it bites bug 2 instead.'],
      [['target', 'arrow', 'dmg', 'order', 'preview'], 'w', 'The turn plays out exactly as shown. Clarity turns a guess into a decision.', true],
    ];
    const LEN = 4.5, DUR = STAGES.length * LEN;
    const st = { tour: true, held: false, t: 0, stage: -1, cues: {}, shot: null, play: null };
    const manual = () => { st.tour = false; tourBtn.classList.remove('on'); };
    $$(cBox, 'input').forEach(i => i.onchange = () => { manual(); st.cues = { ...st.cues, [i.dataset.c]: i.checked }; st.play = null; });
    $$(sSeg, '.btn').forEach(b => b.onclick = () => { manual(); st.shot = b.dataset.s; st.play = null; say(out, `${SHOTS[st.shot].label}. Press <b>Fire</b> to play the enemy turn.`); });
    $(sl, '.br-fire').onclick = () => { manual(); if (!st.shot) { say(out, 'Pick a shot first.'); return; } st.play = 0; };
    $(sl, '.br-reset').onclick = () => { manual(); st.play = null; st.shot = null; say(out, 'Reset. Turn cues on, pick a shot, then fire.'); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.stage = -1; tourBtn.classList.add('on'); };
    function frame() {
      if (st.tour) { const k = Math.floor((st.t % DUR) / LEN), u = (st.t % DUR) - k * LEN; if (k !== st.stage) { st.stage = k; const s = STAGES[k]; st.cues = Object.fromEntries(ORDER.map(c => [c, s[0].includes(c)])); st.shot = s[1]; say(out, s[2]); } st.play = STAGES[k][3] ? Math.max(0, u - .5) : null; }
      breachScene(g, st.cues, st.shot, st.play);
      $$(cBox, 'input').forEach(i => { i.checked = !!st.cues[i.dataset.c]; });
      $$(sSeg, '.btn').forEach(b => b.classList.toggle('on', b.dataset.s === st.shot));
    }
    LP.runners.breach = { seek(t) { st.held = true; st.tour = true; st.t = t; st.stage = -1; frame(); }, dur: () => DUR };
    return dt => { if (st.held) return; dt = Math.max(0, Math.min(dt, .1)); if (st.tour) st.t = (st.t + dt) % DUR; else if (st.play != null) st.play = Math.min(3, st.play + dt); frame(); if (!st.tour && st.play >= 2.2 && st.shot && !st.said) { st.said = true; say(out, SHOTS[st.shot].out); } if (st.play == null) st.said = false; };
  });

  /* ---------------- 2. Celeste: the cue where your eyes are ---------------- */
  const HMODES = {
    hair: { label: 'Hair colour', rate: .95, say: 'Celeste puts the dash state in Madeline’s hair: red when she can dash, blue once it is spent. The cue sits exactly where you are already looking.' },
    hud: { label: 'Corner icon', rate: .6, say: 'The same information as an icon in the corner of the screen. It is accurate, but your eyes are on the climber, so you have to look away mid-jump to read it.' },
    none: { label: 'No cue', rate: .3, say: 'No cue at all: players have to remember whether they already dashed, and many guess.' },
  };
  const oc = document.createElement('canvas'); oc.width = W; oc.height = H; const og = oc.getContext('2d');
  function climber(g, x, y, hair, dashT) {
    g.save(); g.translate(x, y); g.scale(1.6, 1.6); g.translate(-x, -y); climber0(g, x, y, hair, dashT); g.restore();
  }
  function climber0(g, x, y, hair, dashT) {
    if (dashT > 0) { g.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 1; i <= 4; i++) { g.globalAlpha = .5 - i * .1; g.fillRect(x - 18 - i * 18, y - 34, 26, 40); } g.globalAlpha = 1; }
    g.fillStyle = hair; g.beginPath(); g.ellipse(x - 8, y - 40, 15, 13, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(x - 20, y - 34, 9, 7, 0, 0, TAU); g.fill();
    g.fillStyle = '#f2c9a0'; g.beginPath(); g.arc(x, y - 38, 10, 0, TAU); g.fill();
    g.fillStyle = '#4b5bb5'; rr(g, x - 11, y - 28, 22, 22, 5); g.fill(); g.fillStyle = '#3a2c2c'; g.fillRect(x - 9, y - 6, 7, 10); g.fillRect(x + 2, y - 6, 7, 10);
  }
  function hairPose(t) { // a 4 s loop: run, jump, dash, land
    const c = t % 4;
    if (c < 1) return { x: 200 + 130 * c, y: 400, ready: true, dash: 0 };
    if (c < 1.6) { const k = (c - 1) / .6; return { x: 330 + 120 * k, y: 400 - 150 * Math.sin(k * Math.PI / 2), ready: true, dash: 0 }; }
    if (c < 1.9) { const k = (c - 1.6) / .3; return { x: 450 + 190 * k, y: 250, ready: false, dash: 1 - k }; }
    if (c < 2.5) { const k = (c - 1.9) / .6; return { x: 640 + 80 * k, y: 250 + 150 * k * k, ready: false, dash: 0 }; }
    return { x: 720, y: 400, ready: true, dash: 0 };
  }
  function hairScene(g, mode, pose, quiz) {
    const s = og; s.clearRect(0, 0, W, H);
    const gr = s.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2b2d5c'); gr.addColorStop(1, '#7a5c8f'); s.fillStyle = gr; s.fillRect(0, 0, W, H);
    s.fillStyle = 'rgba(255,255,255,.12)'; s.beginPath(); s.moveTo(0, 360); s.lineTo(160, 180); s.lineTo(330, 330); s.lineTo(520, 150); s.lineTo(760, 320); s.lineTo(900, 200); s.lineTo(W, 300); s.lineTo(W, H); s.lineTo(0, H); s.fill();
    s.fillStyle = '#3b3550'; s.fillRect(0, 400, 400, 185); s.fillRect(640, 400, 400, 185); s.fillStyle = '#e8eef7'; s.fillRect(0, 400, 400, 8); s.fillRect(640, 400, 400, 8);
    s.fillStyle = '#c8d0e0'; for (let i = 0; i < 6; i++) { s.beginPath(); s.moveTo(410 + i * 38, 585); s.lineTo(429 + i * 38, 540); s.lineTo(448 + i * 38, 585); s.fill(); }
    const hair = mode === 'hair' ? (pose.ready ? '#c0392b' : '#4fb3f0') : '#c0392b';
    climber(s, pose.x, pose.y, hair, pose.dash);
    if (mode === 'hud') { s.fillStyle = 'rgba(0,0,0,.4)'; rr(s, 24, 24, 150, 54, 10); s.fill(); s.fillStyle = pose.ready ? '#c0392b' : '#4fb3f0'; s.beginPath(); s.arc(52, 51, 14, 0, TAU); s.fill(); s.font = M(700, 15); s.fillStyle = '#fff'; s.textAlign = 'left'; s.fillText(pose.ready ? 'DASH' : 'spent', 76, 57); }
    // what your eyes see: sharp near the climber, blurred elsewhere
    g.clearRect(0, 0, W, H); g.save(); rr(g, 10, 10, W - 20, H - 20, 14); g.clip();
    g.filter = 'blur(6px)'; g.drawImage(oc, 0, 0); g.filter = 'none'; g.fillStyle = 'rgba(15,15,30,.35)'; g.fillRect(0, 0, W, H);
    g.save(); g.beginPath(); g.arc(pose.x, pose.y - 25, 120, 0, TAU); g.clip(); g.drawImage(oc, 0, 0); g.restore();
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.setLineDash([6, 6]); g.lineWidth = 2; g.beginPath(); g.arc(pose.x, pose.y - 25, 120, 0, TAU); g.stroke(); g.setLineDash([]);
    text(g, 'where your eyes are', pose.x, pose.y - 155, F(600, 14), 'rgba(255,255,255,.8)', 'center');
    if (quiz && quiz.hide) { g.fillStyle = 'rgba(15,15,30,.92)'; g.fillRect(0, 0, W, H); text(g, 'Could she dash just now?', W / 2, H / 2 - 10, M(800, 28), '#fff', 'center'); text(g, 'Answer with the buttons on the right.', W / 2, H / 2 + 24, F(500, 17), '#c9d1d9', 'center'); }
    g.restore();
    const m = HMODES[mode]; g.fillStyle = 'rgba(255,252,244,.94)'; rr(g, W - 330, 24, 306, 70, 10); g.fill();
    text(g, `${m.label}: ${Math.round(m.rate * 100)}% know (illustrative)`, W - 316, 50, M(700, 15), C.ink); bar(g, W - 316, 64, 278, 14, m.rate);
  }
  function bar(g, x, y, w, h, v) { g.fillStyle = '#ece3cf'; rr(g, x, y, w, h, h / 2); g.fill(); g.fillStyle = v > .8 ? C.green : v > .5 ? C.goldInk : C.red; rr(g, x, y, w * clamp(v), h, h / 2); g.fill(); }
  canvasDemo('hair', (sl, cv, g) => {
    const mSeg = $(sl, '.ha-mode'), out = $(sl, '.ha-out'), tourBtn = $(sl, '.ha-tour'), score = $(sl, '.ha-score');
    mSeg.innerHTML = Object.entries(HMODES).map(([k, m]) => `<button class="btn" data-m="${k}">${m.label}</button>`).join('');
    const ORDER = ['hair', 'hud', 'none'], LEN = 8, DUR = ORDER.length * LEN;
    const st = { tour: true, held: false, t: 0, stage: -1, mode: 'hair', tt: 0, quiz: null, tally: {} };
    const manual = () => { st.tour = false; tourBtn.classList.remove('on'); };
    const showScore = () => { score.innerHTML = Object.entries(st.tally).map(([k, v]) => `${HMODES[k].label}: <b>${v[0]} of ${v[1]}</b>`).join(' · ') || 'No answers yet.'; };
    $$(mSeg, '.btn').forEach(b => b.onclick = () => { manual(); st.mode = b.dataset.m; st.quiz = null; say(out, HMODES[st.mode].say); });
    $(sl, '.ha-quiz').onclick = () => { manual(); const rdy = Math.random() < .5; st.quiz = { ready: rdy, t: 0, hide: false }; say(out, 'Watch the climber. The screen goes dark in under a second.'); };
    $$(sl, '.ha-ans').forEach(b => b.onclick = () => {
      if (!st.quiz || !st.quiz.hide) return; const ok = (b.dataset.a === 'yes') === st.quiz.ready;
      const tl = st.tally[st.mode] = st.tally[st.mode] || [0, 0]; tl[1]++; if (ok) tl[0]++; showScore();
      say(out, `${ok ? 'Right' : 'Not quite'}: she ${st.quiz.ready ? 'could' : 'could not'} dash. ${st.mode === 'hud' ? 'The answer was in the corner, outside where you were looking.' : st.mode === 'none' ? 'Nothing on screen told you.' : 'The hair told you without looking away.'}`); st.quiz = null;
    });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.stage = -1; tourBtn.classList.add('on'); };
    function frame() {
      if (st.tour) { const k = Math.floor((st.t % DUR) / LEN); st.tt = (st.t % DUR) - k * LEN; if (k !== st.stage) { st.stage = k; st.mode = ORDER[k]; say(out, HMODES[st.mode].say); } }
      let pose = hairPose(st.tt);
      if (st.quiz) { pose = { x: 520, y: 260, ready: st.quiz.ready, dash: 0 }; st.quiz.hide = st.quiz.t > .7; }
      hairScene(g, st.mode, pose, st.quiz);
      $$(mSeg, '.btn').forEach(b => b.classList.toggle('on', b.dataset.m === st.mode));
    }
    showScore();
    LP.runners.hair = { seek(t) { st.held = true; st.tour = true; st.t = t; st.stage = -1; frame(); }, dur: () => DUR };
    return dt => { if (st.held) return; dt = Math.max(0, Math.min(dt, .1)); if (st.tour) st.t = (st.t + dt) % DUR; else st.tt += dt; if (st.quiz) st.quiz.t += dt; frame(); };
  });

  /* ---------------- 3. Hades: a name says who and what ---------------- */
  const GODS = {
    zeus: ['Zeus', '#e8c547'], poseidon: ['Poseidon', '#2f8fd6'], athena: ['Athena', '#c9a46a'], aphrodite: ['Aphrodite', '#e0609a'],
    demeter: ['Demeter', '#7fc8e8'], artemis: ['Artemis', '#5aa65a'], dionysus: ['Dionysus', '#8e44ad'], ares: ['Ares', '#c0392b'],
  };
  const BOONS = [
    ['Lightning Strike', 'zeus', 'Lightning', 'your attack calls down a bolt of lightning'],
    ['Tempest Strike', 'poseidon', 'Tempest', 'your attack hits harder and knocks foes away, like a wave'],
    ['Divine Strike', 'athena', 'Divine', 'your attack hits harder and can deflect shots, the goddess of defence'],
    ['Heartbreak Strike', 'aphrodite', 'Heartbreak', 'your attack hits harder and makes foes Weak'],
    ['Frost Strike', 'demeter', 'Frost', 'your attack hits harder and chills foes, slowing them'],
    ['Deadly Strike', 'artemis', 'Deadly', 'your attack hits harder, with a chance of a critical hit, the huntress’s precision'],
    ['Drunken Strike', 'dionysus', 'Drunken', 'your attack leaves a Hangover that hurts over time'],
    ['Curse of Agony', 'ares', null, 'your attack inflicts Doom, a burst of damage a moment later. The one attack boon that skips “Strike”.'],
  ];
  const GK = Object.keys(GODS);
  function godDisc(g, k, x, y, r, a = 1) { g.globalAlpha = a; g.fillStyle = GODS[k][1]; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); const im = IM(`img/${k}.svg`); if (ready(im)) g.drawImage(im, x - r * .65, y - r * .65, r * 1.3, r * 1.3); g.globalAlpha = 1; }
  function namesScene(g, bi, pick, reveal) {
    const [name, god, who, what] = BOONS[bi];
    g.clearRect(0, 0, W, H); g.fillStyle = '#1e1420'; rr(g, 10, 10, W - 20, H - 20, 14); g.fill();
    text(g, 'WHICH GOD OFFERS THIS BOON?', 40, 48, M(800, 15), '#c9a0b0');
    g.fillStyle = '#2c1d2e'; rr(g, 270, 70, 500, 100, 14); g.fill(); g.strokeStyle = reveal ? GODS[god][1] : '#8a6a7a'; g.lineWidth = 3; g.stroke();
    text(g, name, 520, 132, M(800, 34), '#fff4e0', 'center');
    GK.forEach((k, i) => { const x = 95 + i * 121, y = 260, on = pick === k, right = reveal && k === god;
      godDisc(g, k, x, y, 40, reveal && !right && !on ? .35 : 1);
      if (on || right) { g.strokeStyle = right ? '#7ee2a0' : '#ff8a7a'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 47, 0, TAU); g.stroke(); }
      text(g, GODS[k][0], x, y + 66, M(700, 15), '#fff', 'center'); });
    if (reveal) {
      g.fillStyle = 'rgba(255,255,255,.06)'; rr(g, 40, 360, 960, 190, 12); g.fill();
      text(g, pick === god ? 'RIGHT' : `IT’S ${GODS[god][0].toUpperCase()}`, 60, 392, M(800, 16), pick === god ? '#7ee2a0' : '#ff8a7a');
      if (who) {
        g.font = M(800, 28); const w1 = g.measureText(who + ' ').width, w2 = g.measureText('Strike').width, x0 = 520 - (w1 + w2) / 2;
        text(g, who, x0, 440, M(800, 28), GODS[god][1]); text(g, 'Strike', x0 + w1, 440, M(800, 28), '#fff');
        text(g, `who and what: ${GODS[god][0]}’s flavour`, x0, 468, F(600, 14), GODS[god][1]); text(g, 'which slot: your attack', x0 + w1, 490, F(600, 14), '#fff');
      } else text(g, name, 520, 440, M(800, 28), GODS[god][1], 'center');
      g.font = F(600, 16); g.fillStyle = '#e8dce0'; g.textAlign = 'left'; wrap(g, `${name}: ${what}.`, 60, 520, 920, 21);
    } else text(g, 'Same mechanic slot for every god: a bonus on your attack. Only the first word changes.', 520, 420, F(600, 17), '#c9a0b0', 'center');
  }
  canvasDemo('names', (sl, cv, g) => {
    const out = $(sl, '.nm-out'), tourBtn = $(sl, '.nm-tour'), score = $(sl, '.nm-score');
    const st = { tour: true, held: false, t: 0, stage: -1, bi: 0, pick: null, reveal: false, right: 0, tries: 0 };
    const manual = () => { st.tour = false; tourBtn.classList.remove('on'); };
    const next = () => { st.bi = (st.bi + 1 + Math.floor(Math.random() * (BOONS.length - 1))) % BOONS.length; st.pick = null; st.reveal = false; say(out, 'Click the god you think offers it.'); };
    const choose = k => { if (st.reveal) { next(); return; } st.pick = k; st.reveal = true; st.tries++; if (k === BOONS[st.bi][1]) st.right++; score.innerHTML = `<b>${st.right} of ${st.tries}</b> right`; say(out, BOONS[st.bi][1] === 'ares' ? 'Curse of Agony is the outlier: it drops “Strike”, so players can’t tell which slot it fills from the name alone.' : 'The first word carries the god, the second carries the slot. Click any god to try another.'); };
    cv.addEventListener('click', e => { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height; GK.forEach((k, i) => { if (Math.hypot(x - (95 + i * 121), y - 260) < 48) { manual(); choose(k); } }); });
    $(sl, '.nm-next').onclick = () => { manual(); next(); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.stage = -1; tourBtn.classList.add('on'); };
    const TOUR = [0, 1, 5, 7], LEN = 4, DUR = TOUR.length * LEN;
    function frame() {
      if (st.tour) { const k = Math.floor((st.t % DUR) / LEN), u = (st.t % DUR) - k * LEN; st.bi = TOUR[k]; st.reveal = u > 1.6; st.pick = st.reveal ? BOONS[st.bi][1] : null; if (k !== st.stage) { st.stage = k; say(out, TOUR[k] === 7 ? 'Curse of Agony breaks the pattern: no “Strike”, so the name no longer says which slot it fills.' : 'Hades gives every god an attack boon. The first word says whose it is and what it adds; “Strike” says it changes your attack. That is the post’s “Clawing Strike”: one word for the creature, one for the action.'); } }
      namesScene(g, st.bi, st.pick, st.reveal);
    }
    LP.runners.names = { seek(t) { st.held = true; st.tour = true; st.t = t; st.stage = -1; frame(); }, dur: () => DUR };
    return dt => { if (st.held) return; if (st.tour) st.t = (st.t + Math.max(0, Math.min(dt, .1))) % DUR; frame(); };
  });
  GK.forEach(k => IM(`img/${k}.svg`));
})();
