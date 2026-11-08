/* Counter cycles: Attack, Block and Grab played out with Street Fighter III: 3rd Strike sprites (Ryu vs Chun-Li).
   fight-seq: each arrow of the fighting game wheel as one exchange, frame by frame.
     Block beats Attack:  Ryu sweeps, Chun-Li blocks, and punishes the long recovery (-13 on block).
     Grab beats Block:    Chun-Li holds guard, Ryu dashes in and throws her. Throws ignore guard.
     Attack beats Grab:   Ryu dashes in to throw, Chun-Li's crouching kick meets him before he is in range.
   Sprites, boxes and frame data come from sf3-moves.js (window.SF3_MOVES). Contacts are found from the boxes, not
   hand-placed: a move connects on the first frame its attack (or throw) box reaches the other fighter's hurtbox.
   Hit and throw reactions are drawn (freeze, shake, toss), since the move viewer only records the attacker.
   Distances are between the two characters' anchors, in game pixels. Everything is a pure function of the game
   frame, so window.__fightSeek(t, which) / __fightDur(which) replay any moment for the GIFs (t is real seconds). */
(function () {
  const { $, $$, canvasDemo } = FPF.kit;
  const MV = window.SF3_MOVES;
  for (const k in MV) { const im = new Image(); im.src = MV[k].sheet; MV[k].img = im; }
  const ICON = {};
  for (const k of ['ryu', 'chun-li']) { const im = new Image(); im.src = `img/sf3/${k}-icon.webp`; ICON[k] = im; }

  const GFPS = 15;              // game frames shown per real second: a quarter of the game's 60
  const SC = 3;                 // sprite pixels to canvas pixels
  const CX = 800, FLOOR = 598;  // stage centre and floor line on the 1600 x 900 canvas
  const OPT = { attack: '#6e7380', block: '#4f9a4a', grab: '#c9545b' };
  const ST = {                  // what a fighter is doing on a frame, for the frame strip
    idle: { col: '#3a4670', label: 'neutral' },
    guard: { col: '#4f9a4a', label: 'holding guard' },
    move: { col: '#cdbf9f', label: 'dash' },
    startup: { col: '#e0a92d', label: 'startup' },
    active: { col: '#e5322d', label: 'active' },
    throw: { col: '#ffd84a', label: 'throw' },
    recovery: { col: '#2ea3dc', label: 'recovery' },
    stun: { col: '#a77bff', label: 'blockstun / hitstun' },
    down: { col: '#7d7f8f', label: 'thrown / knocked down' },
  };

  /* ---------- box maths, all relative to a fighter's anchor and facing ---------- */
  const boxes = (m, i, kinds) => m.frames[i].filter(b => kinds.includes(b[0]));
  const front = (m, i) => Math.max(...boxes(m, i, 'pv').map(b => b[3] - m.cx));       // hurtbox, forward
  const reach = (m, i) => { const a = boxes(m, i, 'at'); return a.length ? Math.max(...a.map(b => b[3] - m.cx)) : null; };
  const phase = (m, i) => {
    const act = m.frames.map((_, k) => reach(m, k) !== null), first = act.indexOf(true), last = act.lastIndexOf(true);
    return i < first ? 'startup' : i <= last ? (boxes(m, i, 't').length ? 'throw' : 'active') : 'recovery';
  };
  const IDLE = { ryu: ['ryu-throw', 23], chun: ['chun-li-crouching-lp', 0] };

  /* ---------- a fighter's timeline: one entry per game frame ---------- */
  function track(n, who, x) { return Array.from({ length: n }, () => ({ mv: IDLE[who][0], i: IDLE[who][1], x, st: who === 'chun' ? 'guard' : 'idle' })); }
  const set = (T, t0, t1, f) => { for (let t = t0; t <= t1 && t < T.length; t++) Object.assign(T[t], f(t - t0, t)); };
  // play move mv from frame t0 at anchor x; returns the frame after it ends
  function play(T, t0, mv, x, st) {
    const m = MV[mv]; set(T, t0, t0 + m.frames.length - 1, k => ({ mv, i: k, x, st: st || phase(m, k) })); return t0 + m.frames.length;
  }
  const keepFrom = (T, t0, f) => set(T, t0, T.length - 1, f);
  // world x of the furthest-forward hurtbox / attack box; dir +1 faces right
  const hurtEdge = (s, dir) => s.x + dir * front(MV[s.mv], s.i);
  const atkEdge = (s, dir) => { const r = reach(MV[s.mv], s.i); return r === null ? null : s.x + dir * r; };
  // first frame from t0 where the attacker's box crosses the defender's hurtbox
  function contact(A, dA, D, dD, t0) {
    for (let t = t0; t < A.length; t++) { const a = atkEdge(A[t], dA); if (a !== null && (dA > 0 ? a >= hurtEdge(D[t], dD) : a <= hurtEdge(D[t], dD))) return t; }
    return -1;
  }

  /* ---------- the three exchanges ---------- */
  function blockBeatsAttack() {
    const N = 70, R = track(N, 'ryu', -70), C = track(N, 'chun', 70);
    const S = MV['ryu-crouching-hk'], K = MV['chun-li-crouching-mk'];
    const t0 = 12, end = play(R, t0, 'ryu-crouching-hk', -70);
    const tb = contact(R, 1, C, -1, t0);                 // the sweep reaches the guard
    const free = end + S.blockAdv;                       // -13: Chun-Li acts 13 frames before Ryu does
    set(C, tb, free - 1, k => ({ st: 'stun', x: 70 + Math.min(k, 8) }));
    keepFrom(C, free, () => ({ x: 78, st: 'idle' }));
    const kEnd = play(C, free, 'chun-li-crouching-mk', 78);
    const th = contact(C, -1, R, 1, free);               // her kick reaches his leg
    const fr = R[th].i;
    keepFrom(R, th, (k, t) => ({ mv: 'ryu-crouching-hk', i: fr, st: t < kEnd + 1 ? 'stun' : 'idle', x: -70 - Math.min(k, 10) * 1.6, shake: k < 10 ? (k % 2 ? 3 : -3) : 0 }));
    keepFrom(R, kEnd + 1, () => ({ mv: IDLE.ryu[0], i: IDLE.ryu[1] }));
    keepFrom(C, kEnd, () => ({ mv: IDLE.chun[0], i: IDLE.chun[1], st: 'idle' }));
    return {
      key: 'block-attack', N, R, C, fx: [{ t: tb, kind: 'block', who: C }, { t: th, kind: 'hit', who: R }],
      plan: { ryu: ['Attack', 'Crouching Roundhouse (sweep), at max range'], chun: ['Block', 'Crouch and hold down-back'] },
      notes: [[0, 'Ryu is at the tip of his sweep’s range. Chun-Li crouches and holds back: guard.'],
        [t0, `Ryu sweeps: Crouching Roundhouse, ${S.startup} frames before the leg is out.`],
        [tb, 'Blocked. The guard takes the kick and Chun-Li slides back a little.'],
        [tb + 6, `Ryu’s leg is still out: the sweep is ${S.total} frames long.`],
        [free, `Chun-Li is free ${-S.blockAdv} frames before Ryu (−${-S.blockAdv} on block). She kicks.`],
        [th, 'Punished: her Crouching Forward hits the leg before Ryu can move.']],
      verdict: { head: 'Block beats Attack', col: OPT.block, body: `Every attack has frames where it can’t be cancelled. Blocking it turns those ${-S.blockAdv} frames into a free hit for the defender.` },
    };
  }

  function grabBeatsBlock() {
    const N = 104, R = track(N, 'ryu', -88), C = track(N, 'chun', 88);
    const DA = MV['ryu-dash-forward'], W = MV['chun-li-wake-up'];
    const t0 = 10, dEnd = play(R, t0, 'ryu-dash-forward', -88, 'move');
    const x1 = -88 + DA.dx[DA.dx.length - 1];
    keepFrom(R, dEnd, () => ({ x: x1 }));
    play(R, dEnd, 'ryu-throw', x1);
    const tg = contact(R, 1, C, -1, dEnd);               // the throw box reaches her
    const hold = 10, fly = 22, land = tg + hold + fly;
    set(R, tg, tg + hold - 1, () => ({ i: 4, st: 'throw' }));  // held on the arm-out frame while she is in the grab
    set(R, tg + hold, N - 1, (k) => ({ i: Math.min(5 + k, 23), st: k < 19 ? 'recovery' : 'idle' }));
    // Chun-Li: lifted in the grab, tossed over a short arc, then the real knockdown and wake-up frames
    const xc = C[tg].x, xl = xc + 40;
    set(C, tg, tg + hold - 1, k => ({ st: 'down', shake: k % 2 ? 2 : -2, lift: Math.min(k, 4) * 4 }));
    set(C, tg + hold, land - 1, k => {
      const u = (k + 1) / fly;
      return { mv: IDLE.chun[0], i: IDLE.chun[1], st: 'down', x: xc + (xl - xc) * u, lift: 16 * (1 - u) + 150 * 4 * u * (1 - u), rot: -u * Math.PI * 1.5 };
    });
    const seq = [...Array(16).keys(), ...Array.from({ length: 24 }, (_, k) => 64 + k)];
    set(C, land, N - 1, k => ({ mv: 'chun-li-wake-up', i: seq[Math.min(k, seq.length - 1)], x: xl, st: k < seq.length ? 'down' : 'idle', lift: 0, rot: 0 }));
    return {
      key: 'grab-block', N, R, C, fx: [{ t: tg, kind: 'grab', who: C }, { t: land, kind: 'land', who: C }],
      plan: { ryu: ['Grab', 'Dash in, then Throw'], chun: ['Block', 'Crouch and hold down-back'] },
      notes: [[0, 'Chun-Li holds guard and waits for Ryu to attack.'],
        [t0, 'Ryu doesn’t attack. He dashes in: 13 frames with nothing out.'],
        [dEnd, `Close enough. He throws: ${MV['ryu-throw'].startup} frames of startup, ${reach(MV['ryu-throw'], 2)} pixels of reach.`],
        [tg, 'Throws ignore guard. Holding block means standing still, so she is caught.'],
        [tg + hold, 'Chun-Li is thrown and knocked down.'],
        [land + 8, 'She has to get up before she can do anything; Ryu is already free.']],
      verdict: { head: 'Grab beats Block', col: OPT.grab, body: 'Guard stops strikes, not throws. A player who only holds block is standing still within reach, waiting to be grabbed.' },
    };
  }

  function attackBeatsGrab() {
    const N = 48, R = track(N, 'ryu', -88), C = track(N, 'chun', 88);
    const K = MV['chun-li-crouching-mk'];
    keepFrom(C, 0, () => ({ st: 'idle' }));
    const t0 = 10;
    play(R, t0, 'ryu-dash-forward', -88, 'move');
    const kEnd = play(C, t0, 'chun-li-crouching-mk', 88);
    const th = contact(C, -1, R, 1, t0);
    const fr = R[th].i, xr = -88 + MV['ryu-dash-forward'].dx[fr];
    // stopped mid-dash: frozen on that frame, pushed back, no throw
    keepFrom(R, th, (k, t) => ({ mv: 'ryu-dash-forward', i: fr, x: -88 - Math.min(k, 10) * 1.6, st: t < kEnd + 1 ? 'stun' : 'idle', shake: k < 10 ? (k % 2 ? 3 : -3) : 0 }));
    keepFrom(R, kEnd + 1, () => ({ mv: IDLE.ryu[0], i: IDLE.ryu[1], x: xr - 16 }));
    keepFrom(C, kEnd, () => ({ mv: IDLE.chun[0], i: IDLE.chun[1], st: 'idle' }));
    const need = Math.round(C[0].x - front(MV[IDLE.chun[0]], 0) - reach(MV['ryu-throw'], 2) - R[0].x);
    return {
      key: 'attack-grab', N, R, C, fx: [{ t: th, kind: 'hit', who: R }],
      ghost: { from: th, to: th + (13 - fr) + 3, label: 'the throw he never reaches' },
      plan: { ryu: ['Grab', 'Dash in, then Throw'], chun: ['Attack', 'Crouching Forward as he comes in'] },
      notes: [[0, `Ryu wants to throw, but a throw only reaches ${reach(MV['ryu-throw'], 2)} pixels. He is ${need} pixels too far.`],
        [t0, `He dashes in. Chun-Li expects it and kicks: ${K.startup} frames of startup.`],
        [th, 'Her kick meets him mid-dash, before he is in throw range.'],
        [th + 8, 'The throw never comes out.']],
      verdict: { head: 'Attack beats Grab', col: OPT.attack, body: 'A throw has the shortest reach in the game. To use it you have to walk into range, and any strike that is already out gets there first.' },
    };
  }
  const SEQ = { 'block-attack': blockBeatsAttack(), 'grab-block': grabBeatsBlock(), 'attack-grab': attackBeatsGrab() };
  const HOLD = 3.2;             // seconds the verdict stays up before the loop restarts
  const durOf = S => S.N / GFPS + HOLD;

  /* ---------- drawing ---------- */
  let g2;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  function txt(s, x, y, size, col, align = 'left', weight = 500, font = 'Jost') {
    g2.font = `${weight} ${size}px ${font}`; g2.fillStyle = col; g2.textAlign = align; g2.textBaseline = 'middle'; g2.fillText(s, x, y);
  }
  function rr(x, y, w, h, r) { g2.beginPath(); g2.roundRect(x, y, w, h, r); }
  const PANEL = '#152044';
  const sx = x => CX + x * SC;

  function fighter(s, dir) {
    const m = MV[s.mv];
    g2.save();
    g2.translate(sx(s.x) + (s.shake || 0), FLOOR - (s.lift || 0));
    if (s.rot) { g2.translate(0, -40); g2.rotate(s.rot * dir); g2.translate(0, 40); }
    g2.scale(dir * SC, SC);
    if (m.img.complete && m.img.naturalWidth) {
      g2.imageSmoothingEnabled = false;
      g2.drawImage(m.img, (s.i % m.cols) * m.w, Math.floor(s.i / m.cols) * m.h, m.w, m.h, -m.cx, -m.ground, m.w, m.h);
    }
    if (!s.rot && !s.lift) {
      g2.lineWidth = 1 / SC;
      for (const [k, x1, y1, x2, y2] of m.frames[s.i]) {
        const c = k === 'a' ? ['rgba(229,50,45,.3)', '#ff5a52'] : k === 't' ? ['rgba(255,216,74,.35)', '#ffd84a'] : ['rgba(47,174,99,.10)', 'rgba(95,224,160,.7)'];
        g2.fillStyle = c[0]; g2.strokeStyle = c[1]; g2.beginPath(); g2.rect(x1 - m.cx, y1 - m.ground, x2 - x1 + 1, y2 - y1 + 1); g2.fill(); g2.stroke();
      }
    }
    g2.restore();
  }
  function spark(x, y, k, col, spikes = 16, big = 34) {
    g2.save(); g2.translate(x, y); g2.globalAlpha = 1 - k * .7; g2.fillStyle = col; g2.beginPath();
    for (let i = 0; i < spikes; i++) { const r = i % 2 ? 12 : big + 14 * k, a = i / spikes * Math.PI * 2; g2.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g2.closePath(); g2.fill(); g2.restore();
  }
  function shield(x, y, k) {
    g2.save(); g2.translate(x, y); g2.globalAlpha = 1 - k; g2.strokeStyle = '#8fd3ff'; g2.lineWidth = 6;
    g2.beginPath(); g2.arc(0, 0, 70 + 30 * k, -Math.PI * .45, Math.PI * .45); g2.stroke();
    g2.lineWidth = 3; g2.beginPath(); g2.arc(0, 0, 54 + 30 * k, -Math.PI * .4, Math.PI * .4); g2.stroke(); g2.restore();
  }
  function tag(s, x, y, col, fg = '#fff', size = 17) {
    g2.font = `700 ${size}px Jost`; const w = g2.measureText(s).width + 22;
    rr(x - w / 2, y - 15, w, 30, 15); g2.fillStyle = col; g2.fill(); txt(s, x, y + 1, size, fg, 'center', 700);
  }
  const noteAt = (notes, f) => { let n = null; for (const x of notes) if (f >= x[0]) n = x; return n; };

  function render(S, tReal) {
    const fRaw = tReal * GFPS, f = Math.min(Math.floor(fRaw), S.N - 1);
    const r = S.R[f], c = S.C[f];
    /* stage */
    const top = 182, sh = 484, L = 20, Wd = 1560;
    rr(L, top, Wd, sh, 12); g2.fillStyle = '#121b2e'; g2.fill();
    g2.save(); rr(L, top, Wd, sh, 12); g2.clip();
    const grd = g2.createLinearGradient(0, top, 0, top + sh); grd.addColorStop(0, '#1b2747'); grd.addColorStop(1, '#0d1426');
    g2.fillStyle = grd; g2.fillRect(L, top, Wd, sh);
    g2.fillStyle = '#26324f'; g2.fillRect(L, FLOOR, Wd, top + sh - FLOOR);
    g2.strokeStyle = '#3c4a70'; g2.lineWidth = 2; g2.beginPath(); g2.moveTo(L, FLOOR); g2.lineTo(L + Wd, FLOOR); g2.stroke();
    fighter(c, -1);
    fighter(r, 1);
    // effects
    for (const e of S.fx) {
      const k = (fRaw - e.t) / 10; if (k < 0 || k > 1) continue;
      const atk = e.who === S.R ? S.C[e.t] : S.R[e.t], dA = e.who === S.R ? -1 : 1;
      const ex = sx(atkEdge(atk, dA) ?? hurtEdge(e.who[e.t], -dA)), ey = FLOOR - 40;
      if (e.kind === 'block') { shield(sx(hurtEdge(e.who[e.t], -1)) + 10, FLOOR - 80, k); spark(ex, ey, k, '#8fd3ff', 12, 26); }
      else if (e.kind === 'hit') spark(ex, ey, k, '#ffb547');
      else if (e.kind === 'grab') spark(sx(atkEdge(atk, 1) ?? 0), FLOOR - 170, k, '#ffd84a', 10, 30);
      else if (e.kind === 'land') { g2.globalAlpha = 1 - k; g2.fillStyle = '#cdbf9f'; g2.beginPath(); g2.ellipse(sx(e.who[e.t].x) + 20, FLOOR + 6, 90 + 60 * k, 10, 0, 0, Math.PI * 2); g2.fill(); g2.globalAlpha = 1; }
    }
    g2.restore();
    // labels over the fighters
    const label = (s, x, who) => {
      const L2 = { guard: ['holding guard', OPT.block], stun: [who === 'chun' ? 'blockstun' : 'hitstun', '#a77bff'], down: ['thrown', '#7d7f8f'] }[s.st];
      if (L2) tag(L2[0], x, top + 110, L2[1]);
    };
    label(r, sx(r.x), 'ryu'); label(c, sx(c.x), 'chun');
    txt('Ryu', sx(S.R[0].x), top + 76, 22, '#fff', 'center', 800, 'Montserrat');
    txt('Chun-Li', sx(S.C[0].x), top + 76, 22, '#fff', 'center', 800, 'Montserrat');
    // clock, legend, credit
    rr(CX - 170, top + 12, 340, 40, 20); g2.fillStyle = 'rgba(6,14,32,.85)'; g2.fill();
    txt(`frame ${String(f).padStart(3, ' ')}  ·  ¼ speed`, CX, top + 33, 21, '#ffb547', 'center', 800, 'Montserrat');
    [['hurtbox', 'rgba(95,224,160,.9)'], ['attack box', '#ff5a52'], ['throw box', '#ffd84a']].forEach(([t, col], i) => {
      g2.fillStyle = col; g2.fillRect(L + 22, top + 20 + i * 24, 14, 14); txt(t, L + 44, top + 28 + i * 24, 15, '#cfd8ee');
    });
    txt('Street Fighter III: 3rd Strike · sprites, boxes and frame data via Baston', L + Wd - 18, top + 24, 13, '#8f9cc0', 'right');
    txt('Hit, block and throw reactions are drawn; the frames are the game’s', L + Wd - 18, top + 44, 13, '#8f9cc0', 'right');
    const n = noteAt(S.notes, f);
    if (n) {
      g2.font = '600 24px Jost'; const tw = g2.measureText(n[1]).width + 50;
      g2.globalAlpha = clamp((fRaw - n[0]) / 4);
      rr(CX - tw / 2, top + sh - 56, tw, 44, 12); g2.fillStyle = 'rgba(6,14,32,.9)'; g2.fill();
      txt(n[1], CX, top + sh - 33, 24, '#fff', 'center', 600); g2.globalAlpha = 1;
    }
    /* frame strip */
    const y0 = top + sh + 10, h = 900 - 12 - y0;
    rr(L, y0, Wd, h, 14); g2.fillStyle = PANEL; g2.fill();
    const X0 = L + 470, CWd = (L + Wd - 24 - X0) / S.N;
    const row = (T, who, y, plan, col) => {
      const ic = ICON[who === 'ryu' ? 'ryu' : 'chun-li'];
      g2.save(); rr(L + 16, y - 4, 56, 56, 28); g2.clip(); g2.fillStyle = '#0d1426'; g2.fillRect(L + 16, y - 4, 56, 56);
      if (ic.complete && ic.naturalWidth) { const s = 56 / Math.min(ic.naturalWidth, ic.naturalHeight); g2.drawImage(ic, L + 44 - ic.naturalWidth * s / 2, y - 4, ic.naturalWidth * s, ic.naturalHeight * s); }
      g2.restore(); g2.strokeStyle = col; g2.lineWidth = 3; rr(L + 16, y - 4, 56, 56, 28); g2.stroke();
      txt(plan[0], L + 86, y + 10, 22, col, 'left', 800, 'Montserrat');
      txt(plan[1], L + 86, y + 36, 15, '#cfd8ee');
      for (let t = 0; t < S.N; t++) {
        g2.fillStyle = ST[T[t].st].col; g2.globalAlpha = t <= f ? 1 : .35;
        g2.fillRect(X0 + t * CWd + .5, y, CWd - 1, 40);
      }
      g2.globalAlpha = 1;
    };
    txt('Frames, 60 per second', X0, y0 + 20, 15, '#a9b7d6', 'left', 600);
    const lit = k => k === 'Attack' ? '#c4c9d6' : k === 'Block' ? '#7fd07a' : '#ff8a90';   // the wheel's colours, lifted for the dark panel
    row(S.R, 'ryu', y0 + 40, S.plan.ryu, lit(S.plan.ryu[0]));
    row(S.C, 'chun', y0 + 102, S.plan.chun, lit(S.plan.chun[0]));
    if (S.ghost) {
      const gx = X0 + S.ghost.from * CWd, gw = (S.ghost.to - S.ghost.from) * CWd;
      g2.setLineDash([5, 4]); g2.strokeStyle = '#ffd84a'; g2.lineWidth = 2; g2.strokeRect(gx + 1, y0 + 41, gw, 38); g2.setLineDash([]);
    }
    for (const e of S.fx) if (e.kind !== 'land') { const x = X0 + (e.t + .5) * CWd; txt('✱', x, (e.who === S.R ? y0 + 60 : y0 + 122), 18, '#fff', 'center', 700); }
    const cxF = X0 + (Math.min(fRaw, S.N) ) * CWd; g2.strokeStyle = '#fff'; g2.lineWidth = 2; g2.beginPath(); g2.moveTo(cxF, y0 + 34); g2.lineTo(cxF, y0 + 148); g2.stroke();
    // legend: only the states this exchange uses
    const used = Object.keys(ST).filter(k => S.R.some(s => s.st === k) || S.C.some(s => s.st === k));
    let lx = X0;
    for (const k of used) { g2.fillStyle = ST[k].col; g2.fillRect(lx, y0 + 160, 13, 13); txt(ST[k].label, lx + 19, y0 + 167, 14, '#cfd8ee'); g2.font = '500 14px Jost'; lx += 19 + g2.measureText(ST[k].label).width + 22; }
    if (S.ghost) { g2.setLineDash([4, 3]); g2.strokeStyle = '#ffd84a'; g2.lineWidth = 2; g2.strokeRect(lx, y0 + 160, 13, 13); g2.setLineDash([]); txt(S.ghost.label, lx + 19, y0 + 167, 14, '#cfd8ee'); }
    /* verdict */
    if (fRaw >= S.N + 3) {
      const k = clamp((fRaw - S.N - 3) / 8);
      g2.globalAlpha = k;
      rr(430, top + 110, 740, 190, 18); g2.fillStyle = 'rgba(6,14,32,.94)'; g2.fill();
      g2.strokeStyle = S.verdict.col === OPT.attack ? '#a9b0c0' : S.verdict.col; g2.lineWidth = 3; g2.stroke();
      txt(S.verdict.head, 800, top + 156, 36, S.verdict.col === OPT.attack ? '#c4c9d6' : S.verdict.col === OPT.block ? '#7fd07a' : '#ff8a90', 'center', 800, 'Montserrat');
      g2.font = '500 23px Jost';
      const words = S.verdict.body.split(' '); let line = '', yy = top + 206;
      for (const wd of words) { const t = line ? line + ' ' + wd : wd; if (g2.measureText(t).width > 660 && line) { txt(line, 800, yy, 23, '#fff', 'center'); line = wd; yy += 31; } else line = t; }
      txt(line, 800, yy, 23, '#fff', 'center');
      g2.globalAlpha = 1;
    }
  }

  /* ---------- wiring: pick an arrow, play, pause, scrub ---------- */
  let cur = 'block-attack', api = null;
  canvasDemo('fight-seq', (s, cv, ctx) => {
    const st = { t: 0, play: true, held: false };
    const scrub = $(s, '.ro-scrub'), pb = $(s, '.ro-play');
    const dur = () => durOf(SEQ[cur]);
    const sync = () => { scrub.value = String(st.t / dur()); pb.textContent = st.play ? '❚❚ Pause' : '▶ Play'; };
    const draw = () => { g2 = ctx; ctx.clearRect(0, 0, cv.width, cv.height); render(SEQ[cur], st.t); };
    pb.onclick = () => { st.play = !st.play; sync(); };
    cv.onclick = () => pb.onclick();
    scrub.oninput = () => { st.t = +scrub.value * dur(); st.play = false; sync(); draw(); };
    $$(s, '[data-seq]').forEach(b => b.onclick = () => {
      cur = b.dataset.seq; $$(s, '[data-seq]').forEach(x => x.classList.toggle('on', x === b));
      st.t = 0; st.play = true; sync();
    });
    api = { seek(t) { st.held = true; st.t = t; draw(); }, restart() { st.t = 0; st.play = true; sync(); } };
    sync();
    return dt => {
      if (!st.held && st.play) { st.t += dt; if (st.t > dur()) st.t = 0; scrub.value = String(st.t / dur()); }
      draw();
    };
  }, { enter() { api?.restart(); } });

  window.__fightSeek = (t, which) => {
    cur = which; document.querySelectorAll('[data-seq]').forEach(x => x.classList.toggle('on', x.dataset.seq === which));
    api.seek(t);
  };
  window.__fightDur = which => durOf(SEQ[which]);
  window.__fightSeq = SEQ;
})();
