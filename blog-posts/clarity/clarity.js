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
  // 3/4 (isometric) board: column c runs down-right, row r runs down-left
  const TW = 96, TH = 48, OX = 308, OY = 118, SLAB = 18, US = 1.25;
  const scaled = (g, x, y, f) => { g.save(); g.translate(x, y); g.scale(US, US); g.translate(-x, -y); f(); g.restore(); };
  const mid = (c, r) => [OX + (c - r) * TW / 2, OY + (c + r) * TH / 2 + TH / 2];
  const diamond = (g, c, r, inset = 0) => { const [x, y] = mid(c, r), w = TW / 2 - inset, h = TH / 2 - inset / 2; g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + w, y); g.lineTo(x, y + h); g.lineTo(x - w, y); g.closePath(); };
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
  const poly = (g, pts, c) => { g.fillStyle = c; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); };
  // an iso block standing on a tile: top face, left face, right face
  function block(g, x, y, w, d, h, top, left, right) {
    const hw = w / 2, hd = d / 2;
    poly(g, [[x - hw, y - h], [x, y - h + hd], [x, y + hd], [x - hw, y]], left);
    poly(g, [[x + hw, y - h], [x, y - h + hd], [x, y + hd], [x + hw, y]], right);
    poly(g, [[x, y - h - hd], [x + hw, y - h], [x, y - h + hd], [x - hw, y - h]], top);
  }
  function bug(g, x, y, n, a = 1) { // our own blocky beetle, standing on the tile (x, y = feet)
    g.globalAlpha = a;
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x, y, 24, 10, 0, 0, TAU); g.fill();
    g.strokeStyle = '#1d1208'; g.lineWidth = 3; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(x - 10, y - 10 + i * 4); g.lineTo(x - 24, y - 2 + i * 5); g.moveTo(x + 10, y - 10 + i * 4); g.lineTo(x + 24, y - 2 + i * 5); g.stroke(); }
    block(g, x, y - 6, 36, 18, 20, '#f0a15a', '#d9772f', '#a4501a'); // shell
    block(g, x - 8, y - 22, 20, 10, 12, '#c96c28', '#b05a1e', '#8a4416'); // head, turned toward the viewer's left
    PX(g, x - 16, y - 34, 5, 5, '#ffe36e'); PX(g, x - 8, y - 32, 5, 5, '#ffe36e');
    g.strokeStyle = '#1d1208'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 12, y - 40); g.lineTo(x - 18, y - 52); g.moveTo(x - 4, y - 38); g.lineTo(x - 2, y - 50); g.stroke();
    text(g, `bug ${n}`, x, y + 22, M(700, 12), '#fff', 'center'); g.globalAlpha = 1;
  }
  function building(g, c, r, alive) {
    const [x, y] = mid(c, r);
    if (!alive) { block(g, x, y, 56, 28, 10, '#6a6e74', '#4a4e54', '#383c42'); for (let i = 0; i < 4; i++) block(g, x - 16 + i * 10, y - 8 - (i % 2) * 4, 10, 5, 8 + (i % 2) * 8, '#7d8288', '#5a5e64', '#45494f'); return; }
    block(g, x, y, 56, 28, 58, '#d3dae2', '#a3adb8', '#78828e');
    for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) { // windows on both faces
      const lx = x - 22 + i * 10, ly = y - 48 + j * 15 + i * 5; poly(g, [[lx, ly], [lx + 6, ly + 3], [lx + 6, ly + 10], [lx, ly + 7]], j % 2 ? '#ffe08a' : '#ffc34a');
      const rx = x + 6 + i * 10, ry = y - 45 + j * 15 - i * 5; poly(g, [[rx, ry + 3], [rx + 6, ry], [rx + 6, ry + 7], [rx, ry + 10]], j % 2 ? '#e8b850' : '#d9a23a');
    }
  }
  function mech(g, c, r) {
    const [x, y] = mid(c, r);
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x, y, 26, 11, 0, 0, TAU); g.fill();
    block(g, x - 12, y - 2, 12, 6, 14, '#3b4c60', '#26323f', '#1a232d'); block(g, x + 12, y - 2, 12, 6, 14, '#3b4c60', '#26323f', '#1a232d'); // legs
    block(g, x, y - 14, 40, 20, 26, '#5a9fe6', '#2e7fd6', '#1b4f8a'); // body
    poly(g, [[x - 16, y - 34], [x - 4, y - 28], [x - 4, y - 22], [x - 16, y - 28]], '#bfe8ff'); // visor
    block(g, x + 6, y - 40, 8, 4, 22, '#bfe0ff', '#7fa8cc', '#5a7fa0'); // cannon
    text(g, 'your mech', x, y + 24, M(700, 12), '#fff', 'center');
  }
  function hatch(g, c, r) {
    g.save(); diamond(g, c, r, 2); g.fillStyle = 'rgba(240,120,30,.55)'; g.fill(); g.clip();
    const [x, y] = mid(c, r); g.strokeStyle = 'rgba(255,214,120,.85)'; g.lineWidth = 4; for (let k = -60; k < 60; k += 12) { g.beginPath(); g.moveTo(x + k - 20, y + 30); g.lineTo(x + k + 40, y - 30); g.stroke(); }
    g.restore(); diamond(g, c, r, 3); g.strokeStyle = '#ffae3a'; g.lineWidth = 3; g.stroke();
  }
  function breachScene(g, cues, shot, play) {
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#20262e'; rr(g, 10, 10, W - 20, H - 20, 14); g.fill();
    text(g, 'ENEMY TURN NEXT', 40, 46, M(800, 16), '#c9d1d9');
    // the board slab, then the tiles
    const [lx, ly] = mid(0, 5), [rx, ry] = mid(5, 0), [bx, by] = mid(5, 5);
    poly(g, [[lx - TW / 2, ly], [bx, by + TH / 2], [bx, by + TH / 2 + SLAB], [lx - TW / 2, ly + SLAB]], '#3a3226');
    poly(g, [[rx + TW / 2, ry], [bx, by + TH / 2], [bx, by + TH / 2 + SLAB], [rx + TW / 2, ry + SLAB]], '#2a241b');
    for (let c = 0; c < 6; c++) for (let r = 0; r < 6; r++) { diamond(g, c, r); g.fillStyle = (c + r) % 2 ? '#5a6a4e' : '#62724f'; g.fill(); g.strokeStyle = 'rgba(30,38,24,.6)'; g.lineWidth = 1.5; g.stroke(); diamond(g, c, r, 8); g.strokeStyle = 'rgba(140,160,110,.25)'; g.stroke(); }
    const S = shot ? SHOTS[shot] : null, p = play == null ? -1 : play;
    const pushK = ease(clamp(p / .6)), e1 = S && p >= 0 ? [lerp(2, S.to[0], pushK), lerp(2, S.to[1], pushK)] : [2, 2];
    const e2pos = S && S.other && p >= 0 ? [lerp(1, S.other[0], pushK), lerp(1, S.other[1], pushK)] : [1, 1];
    const e1t = [Math.round(e1[0]), Math.round(e1[1]) - 1], e2t = [Math.round(e2pos[0]) - 1, Math.round(e2pos[1])];
    const e2dead = S && S.bonus && p > 1.3, b1dead = S && S.saved === 1 && shot !== 'e' && p > 1.3, b2dead = shot === 'e' && p > 1.3;
    const showPlan = p < 0, ghost = p < 0 && S && cues.preview;
    const targets = [[e1t, 1, e1], ...(e2dead ? [] : [[e2t, 2, e2pos]])];
    if (cues.target && p < .6) targets.forEach(([t]) => hatch(g, t[0], t[1]));
    let nt = null;
    if (ghost) { nt = shot === 'x' ? [S.other[0] - 1, S.other[1]] : [S.to[0], S.to[1] - 1]; if (nt[0] >= 0) { g.setLineDash([5, 4]); diamond(g, nt[0], nt[1], 6); g.strokeStyle = '#8fd0ff'; g.lineWidth = 3; g.stroke(); g.setLineDash([]); } }
    // units, back to front
    const lunge = (k, from, t) => { const s = Math.sin(clamp(k) * Math.PI) * .35; return [from[0] + (t[0] - from[0]) * s, from[1] + (t[1] - from[1]) * s]; };
    const a1 = lunge((p - .6) / .7, e1, e1t), a2 = lunge((p - 1.4) / .7, e2pos, e2t);
    const at = (c, r, f) => { const [x, y] = mid(c, r); scaled(g, x, y, () => f(x, y)); };
    const units = [[2 + 1 + .01, () => at(2, 1, () => building(g, 2, 1, !b1dead))], [3 + 1 + .01, () => at(3, 1, () => building(g, 3, 1, !b2dead))], [2 + 5, () => at(2, 5, () => mech(g, 2, 5))], [a1[0] + a1[1], () => at(a1[0], a1[1], (x, y) => bug(g, x, y, 1))]];
    if (!e2dead) units.push([a2[0] + a2[1], () => at(a2[0], a2[1], (x, y) => bug(g, x, y, 2))]);
    if (ghost) { const to = shot === 'x' ? S.other : S.to; units.push([to[0] + to[1] - .01, () => at(to[0], to[1], (x, y) => bug(g, x, y, shot === 'x' ? 2 : 1, .35))]); }
    units.sort((a, b) => a[0] - b[0]).forEach(u => u[1]());
    // cues drawn over the units
    if (cues.arrow && p < .6) targets.forEach(([t, , from]) => { const [x0, y0] = mid(from[0], from[1]), [x1, y1] = mid(t[0], t[1]), Y = -30; g.strokeStyle = '#ffb36b'; g.lineWidth = 5; g.beginPath(); g.moveTo(x0, y0 + Y); g.lineTo(lerp(x0, x1, .75), lerp(y0, y1, .75) + Y); g.stroke(); const a = Math.atan2(y1 - y0, x1 - x0), hx = lerp(x0, x1, .9), hy = lerp(y0, y1, .9) + Y; g.fillStyle = '#ffb36b'; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx - Math.cos(a) * 16 + Math.sin(a) * 9, hy - Math.sin(a) * 16 - Math.cos(a) * 9); g.lineTo(hx - Math.cos(a) * 16 - Math.sin(a) * 9, hy - Math.sin(a) * 16 + Math.cos(a) * 9); g.fill(); });
    if (cues.dmg && p < .6) targets.forEach(([t]) => { const [x, y] = mid(t[0], t[1]); g.fillStyle = '#d8402f'; g.beginPath(); g.arc(x + 30, y - 4, 12, 0, TAU); g.fill(); text(g, '1', x + 30, y + 1, M(800, 14), '#fff', 'center'); });
    if (cues.order && showPlan) [[a1, '1'], ...(e2dead ? [] : [[a2, '2']])].forEach(([a, l]) => { const [x, y] = mid(a[0], a[1]); g.fillStyle = '#ffde59'; g.beginPath(); g.arc(x + 26, y - 58, 12, 0, TAU); g.fill(); text(g, l, x + 26, y - 53, M(800, 14), '#20262e', 'center'); });
    if (ghost) { const [mx, my] = mid(2, 5), tgt = shot === 'x' ? [1, 1] : [2, 2], [tx, ty] = mid(tgt[0], tgt[1]); g.setLineDash([6, 5]); g.strokeStyle = '#8fd0ff'; g.lineWidth = 3; g.beginPath(); g.moveTo(mx + 8, my - 78); g.quadraticCurveTo((mx + tx) / 2, Math.min(my, ty) - 130, tx, ty - 36); g.stroke(); g.setLineDash([]); }
    [[.6, e1t], [1.4, e2t]].forEach(([t0, t]) => { const k = (p - t0) / .7; if (k > .3 && k < .8) { const [x, y] = mid(t[0], t[1]); g.fillStyle = 'rgba(255,240,200,.75)'; g.beginPath(); g.ellipse(x, y - 16, 42, 26, 0, 0, TAU); g.fill(); } });
    // right panel
    const R = 620; g.fillStyle = 'rgba(255,255,255,.06)'; rr(g, R, 30, 400, 525, 12); g.fill();
    text(g, 'Save the two buildings.', R + 20, 66, M(800, 20), '#fff');
    text(g, 'You get one shot, then the bugs act.', R + 20, 92, F(500, 16), '#c9d1d9');
    text(g, 'WHAT THE SCREEN TELLS YOU', R + 20, 132, M(800, 13), '#9aa3ad');
    Object.entries(CUES).forEach(([k, c], i) => { const on = cues[k], y = 160 + i * 30; g.fillStyle = on ? C.gold : '#4a525c'; rr(g, R + 20, y - 14, 18, 18, 4); g.fill(); if (on) text(g, '✓', R + 29, y, M(800, 14), '#20262e', 'center'); text(g, c.label, R + 48, y, F(600, 16), on ? '#fff' : '#7d8590'); });
    const share = clamp(.15 + Object.entries(CUES).reduce((a, [k, c]) => a + (cues[k] ? c.w : 0), 0)), n = Math.round(share * 20);
    text(g, 'Of 20 players, how many find a save', R + 20, 330, F(600, 15), '#c9d1d9');
    for (let i = 0; i < 20; i++) { const x = R + 30 + i * 18, y = 360; g.fillStyle = i < n ? C.green : '#4a525c'; g.beginPath(); g.arc(x, y - 8, 6, 0, TAU); g.fill(); rr(g, x - 7, y - 1, 14, 14, 5); g.fill(); }
    text(g, `${n} of 20`, R + 380, 392, M(800, 18), n > 12 ? C.green : n > 6 ? C.gold : '#ff7a6b', 'right');
    if (S && p > 2.2) { g.fillStyle = S.saved === 2 ? 'rgba(47,158,90,.25)' : 'rgba(216,64,47,.25)'; rr(g, R + 16, 420, 368, 120, 10); g.fill(); text(g, S.saved === 2 ? 'BOTH BUILDINGS STAND' : 'ONE BUILDING LOST', R + 36, 448, M(800, 16), S.saved === 2 ? '#7ee2a0' : '#ff8a7a'); g.font = F(600, 16); g.fillStyle = '#fff'; g.textAlign = 'left'; wrap(g, S.out, R + 32, 474, 340, 21); }
    else { g.font = F(500, 15); g.fillStyle = '#c9d1d9'; g.textAlign = 'left'; wrap(g, Object.values(cues).some(Boolean) ? 'Every cue you add answers a question before the player has to ask it.' : 'With no cues, you are guessing what the bugs will do.', R + 20, 440, 360, 21); }
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

  /* ---------------- 1b. Reading a real Into the Breach turn ----------------
     Official screenshots from the game's Steam store page, loaded from Steam's servers (not copied into this repo).
     The overlays are our analysis. Coordinates are in the screenshots' 1920 x 1080 space. */
  const STEAM = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/590380/';
  const SHOTS_ITB = [
    { label: 'A five-enemy turn', src: STEAM + 'ss_4b985c7747c1ff0b7fbbf3eaf8ca5a1272f0dadb.1920x1080.jpg', notes: [
      { r: [770, 450, 560, 450], h: 'Attack order', t: 'Every enemy carries a number: the order it will act in. You can plan a chain, or kill number 1 before it swings.' },
      { r: [1075, 700, 290, 215], h: 'What comes next turn', t: 'Red arrows mark tiles where new enemies will dig up. Park a unit on one and the spawn is blocked.' },
      { r: [1160, 455, 95, 50], h: 'Health you can count', t: 'Health is a row of pips, not a number. One glance tells you whether a hit kills.' },
      { r: [95, 10, 580, 70], h: 'The stakes, in blocks', t: 'The power grid is the run’s life total, drawn as a few chunky blocks. Losing one is impossible to miss.' },
      { r: [1370, 910, 530, 125], h: 'Rules on hover', t: 'Point at any tile and its rule appears in one line: water stops most ground units from attacking.' },
    ] },
    { label: 'A push near a chasm', src: STEAM + 'ss_6113590509c195f98fa64cd738df534762e0c358.1920x1080.jpg', notes: [
      { r: [1105, 380, 420, 250], h: 'Where the bites land', t: 'Striped red tiles show exactly where each enemy will strike, with an arrow from the attacker.' },
      { r: [1110, 640, 150, 100], h: 'Your shot, previewed', t: 'The bent arrow shows which way your shot will push the target, before you commit to it.' },
      { r: [1415, 915, 485, 140], h: 'A rule worth reading', t: 'Chasm: ground units pushed in are destroyed. The tooltip turns terrain into a weapon you can plan with.' },
      { r: [1515, 15, 390, 355], h: 'The goal never moves', t: 'Victory is a countdown of turns to survive, and bonus objectives sit right under it, crossed off as you go.' },
    ] },
  ];
  function itbScene(g, si, ni, k) {
    const S0 = SHOTS_ITB[si], im = IM(S0.src), sc = W / 1920;
    g.clearRect(0, 0, W, H); g.save(); rr(g, 10, 10, W - 20, H - 20, 14); g.clip();
    g.fillStyle = '#14161c'; g.fillRect(0, 0, W, H);
    if (ready(im)) g.drawImage(im, 0, 0, W, H);
    else { text(g, 'Loading the screenshot from Steam…', W / 2, H / 2, F(600, 18), '#c9d1d9', 'center'); text(g, 'It needs an internet connection; the overlays are ours.', W / 2, H / 2 + 26, F(500, 14), '#8a93a0', 'center'); }
    const n = S0.notes[ni], [x, y, w, h] = n.r.map(v => v * sc), e = ease(clamp(k / .4)), pad = 6 * (1 - e);
    g.fillStyle = `rgba(8,10,16,${.62 * e})`; g.beginPath(); g.rect(0, 0, W, H); g.rect(x - 4 - pad, y - 4 - pad, w + 8 + pad * 2, h + 8 + pad * 2); g.fill('evenodd');
    g.strokeStyle = C.gold; g.lineWidth = 3; g.strokeRect(x - 4 - pad, y - 4 - pad, w + 8 + pad * 2, h + 8 + pad * 2);
    const bw = 300, bh = 112, right = x + w / 2 > W / 2, bx = right ? Math.max(24, x - bw - 40) : Math.min(W - bw - 24, x + w + 40), by = clamp(y + h / 2 - bh / 2, 24, H - bh - 40);
    const ax = right ? bx + bw : bx, ay = by + bh / 2, tx = right ? x - 4 : x + w + 4, ty = clamp(ay, y, y + h);
    g.globalAlpha = ease(clamp((k - .2) / .4));
    g.strokeStyle = C.gold; g.lineWidth = 2; g.beginPath(); g.moveTo(ax, ay); g.lineTo(tx, ty); g.stroke(); g.fillStyle = C.gold; g.beginPath(); g.arc(tx, ty, 5, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,252,244,.96)'; rr(g, bx, by, bw, bh, 10); g.fill();
    g.fillStyle = C.gold; g.beginPath(); g.arc(bx + 22, by + 24, 13, 0, TAU); g.fill(); text(g, String(ni + 1), bx + 22, by + 29, M(800, 14), C.ink, 'center');
    text(g, n.h, bx + 44, by + 30, M(800, 16), C.ink); g.font = F(500, 14); g.fillStyle = '#3a3f66'; g.textAlign = 'left'; wrap(g, n.t, bx + 16, by + 56, bw - 32, 19);
    g.globalAlpha = 1;
    S0.notes.forEach((_, i) => { g.fillStyle = i === ni ? C.gold : 'rgba(255,255,255,.45)'; g.beginPath(); g.arc(W / 2 - (S0.notes.length - 1) * 9 + i * 18, H - 24, 5, 0, TAU); g.fill(); });
    g.restore();
  }
  canvasDemo('itb', (sl, cv, g) => {
    const out = $(sl, '.it-out'), tourBtn = $(sl, '.it-tour'), sSeg = $(sl, '.it-shot');
    sSeg.innerHTML = SHOTS_ITB.map((s, i) => `<button class="btn" data-i="${i}">${s.label}</button>`).join('');
    const FLAT = SHOTS_ITB.flatMap((s, si) => s.notes.map((_, ni) => [si, ni])), LEN = 4.5, DUR = FLAT.length * LEN;
    const st = { tour: true, held: false, t: 0, stage: -1, si: 0, ni: 0, k: 0 };
    const manual = () => { st.tour = false; tourBtn.classList.remove('on'); };
    const show = () => { const n = SHOTS_ITB[st.si].notes[st.ni]; say(out, `<b>${st.ni + 1}. ${n.h}.</b> ${n.t}`); };
    const step = d => { manual(); const L = SHOTS_ITB[st.si].notes.length; st.ni = (st.ni + d + L) % L; st.k = 0; show(); };
    $(sl, '.it-prev').onclick = () => step(-1); $(sl, '.it-next').onclick = () => step(1);
    $$(sSeg, '.btn').forEach(b => b.onclick = () => { manual(); st.si = +b.dataset.i; st.ni = 0; st.k = 0; show(); });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.stage = -1; tourBtn.classList.add('on'); };
    function frame() {
      if (st.tour) { const k = Math.floor((st.t % DUR) / LEN); st.k = (st.t % DUR) - k * LEN; if (k !== st.stage) { st.stage = k; [st.si, st.ni] = FLAT[k]; show(); } }
      $$(sSeg, '.btn').forEach(b => b.classList.toggle('on', +b.dataset.i === st.si));
      itbScene(g, st.si, st.ni, st.k);
    }
    LP.runners.itb = { seek(t) { st.held = true; st.tour = true; st.t = t; st.stage = -1; frame(); }, dur: () => DUR };
    return dt => { if (st.held) return; dt = Math.max(0, Math.min(dt, .1)); if (st.tour) st.t = (st.t + dt) % DUR; else st.k += dt; frame(); };
  });
  SHOTS_ITB.forEach(s => IM(s.src));
  GK.forEach(k => IM(`img/${k}.svg`));
})();
