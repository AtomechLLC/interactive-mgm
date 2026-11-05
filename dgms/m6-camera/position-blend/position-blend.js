/* Position blend arena (Module 6, camera type 3, deck slides 48-58).
   A position blend camera has no rail and no follow logic. The camera designer authors blend points (PB1, PB2, PB3)
   where the hero may stand, and for each one a camera position (1_1, 2_1, 3_1) and a look target (1_2, 2_2, 3_2).
   Each frame the hero's distance to every blend point gives a weight; the camera position and target are the
   weighted averages of the authored ones. The deck's two-point version (slides 49-52) blends camera 1 into camera 2;
   the God of War multi-point version (53-56) chains three points along a path into a boss arena.
   Tunable rules live in the tables below: RIGS (the authored points), FALLOFF (the weight curves), BOSS (framing pull),
   and TOUR (the walk-through's phases). The whole frame is a pure function of the hero position and the settings,
   so __seek(t) draws the walk-through deterministically. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585, GREEN = '#1a8a4c';

  /* ---------- world (metres; y grows down the map) ---------- */
  const MX = 16, MY = 44, S = 20;                        // map origin and pixels per metre
  const mx = x => MX + x * S, my = y => MY + y * S;
  const AREA = { corridor: [1.5, 9.5, 6.5, 25.5], bridge: [1.5, 9.5, 16.5, 13.5], arena: [20, 10, 6.3] };
  const BOSS = { x: 21.5, y: 8, h: 4.4, r: 1.1, pullRange: [4, 14] };   // framing pull fades in between these distances
  const HERO_H = 1.8, VIEW_HFOV = 60;
  const LOOK_AT_HERO = .45;   // share of the look target that tracks the hero's chest, so authored shots keep the hero in frame
  const RIGS = {
    multi: { name: 'Multi-point (God of War)', pts: [
      { id: 'PB1', at: [4, 21], cam: [4, 25.2, 4.2], tgt: [4, 14, 1] },
      { id: 'PB2', at: [6, 11.5], cam: [2.2, 19, 7.5], tgt: [9.5, 10, .4] },
      { id: 'PB3', at: [13, 11.5], cam: [7.3, 12.4, 3.4], tgt: [20, 9, 2] },
    ] },
    two: { name: 'Two points', pts: [
      { id: '1', at: [4, 21], cam: [4, 25.2, 4.2], tgt: [4, 14, 1] },
      { id: '2', at: [13, 11.5], cam: [7.3, 12.4, 3.4], tgt: [20, 9, 2] },
    ] },
  };
  // weight of one blend point at distance d for blend radius R (the ring drawn on the map); weights are then normalised
  const FALLOFF = {
    smooth: { name: 'Smooth', w: (d, R) => Math.exp(-(d * d) / (2 * (R / 2) ** 2)) },
    linear: { name: 'Linear', w: (d, R) => Math.max(0, 1 - d / R) },
    cut: { name: 'Nearest (cut)', w: null },
  };
  const PB_COL = ['#2ea3dc', '#2fae63', '#8a4fd6'];

  const inRect = (x, y, r, m = 0) => x >= r[0] + m && x <= r[2] - m && y >= r[1] + m && y <= r[3] - m;
  const walkable = (x, y) => inRect(x, y, AREA.corridor, .4) || inRect(x, y, AREA.bridge, .4) || Math.hypot(x - AREA.arena[0], y - AREA.arena[1]) < AREA.arena[2] - .5;
  function clampWalk(x, y, px, py) {
    if (walkable(x, y)) return [x, y];
    if (walkable(x, py)) return [x, py];
    if (walkable(px, y)) return [px, y];
    return [px, py];
  }

  function weights(rig, fall, R, hx, hy) {
    const pts = RIGS[rig].pts, d = pts.map(p => Math.hypot(hx - p.at[0], hy - p.at[1]));
    let w;
    if (fall === 'cut') { const k = d.indexOf(Math.min(...d)); w = d.map((_, i) => i === k ? 1 : 0); }
    else { w = d.map(v => FALLOFF[fall].w(v, R)); const s = w.reduce((a, b) => a + b, 0); if (s < 1e-9) { const k = d.indexOf(Math.min(...d)); w = d.map((_, i) => i === k ? 1 : 0); } else w = w.map(v => v / s); }
    return { w, d };
  }
  function blendCam(st, hx, hy) {
    const pts = RIGS[st.rig].pts, { w, d } = weights(st.rig, st.fall, st.R, hx, hy);
    const pos = [0, 0, 0], tgt = [0, 0, 0], chest = [hx, hy, 1.2];
    pts.forEach((p, i) => { for (let k = 0; k < 3; k++) { pos[k] += p.cam[k] * w[i]; tgt[k] += p.tgt[k] * w[i]; } });
    for (let j = 0; j < 3; j++) tgt[j] = lerp(tgt[j], chest[j], LOOK_AT_HERO);
    const bd = Math.hypot(hx - BOSS.x, hy - BOSS.y), near = clamp((BOSS.pullRange[1] - bd) / (BOSS.pullRange[1] - BOSS.pullRange[0]));
    const k = st.boss * near, mid = [(hx + BOSS.x) / 2, (hy + BOSS.y) / 2, 1.8];
    for (let j = 0; j < 3; j++) tgt[j] = lerp(tgt[j], mid[j], k);
    return { pos, tgt, w, d, pull: k };
  }

  /* ---------- walk-through ---------- */
  const tourPath = T.Path([4, 22.6], 2.8).wait(.6).go(4, 13).go(6, 11.5).go(17.5, 11.5).wait(1.2);   // phase A: smooth blend to the boss
  const tB = tourPath.t; tourPath.go(5, 11.5, 3).wait(.6);                                          // phase B: nearest point, the blend becomes cuts
  const tC = tourPath.t; tourPath.go(4, 22, 2.6).wait(.4);                                          // phase C: radius so wide every camera averages
  const tD = tourPath.t; tourPath.go(4, 13, 3).go(13, 11.5, 3).wait(1.4);                           // phase D: the two-point version
  const TOUR = [
    { t0: 0, rig: 'multi', fall: 'smooth', R: 6, boss: .6, cap: ['Walk the path: PB1 → PB2 → PB3.', 'Each authored camera fades in as the hero nears its point. The player never touches the camera.'] },
    { t0: tB, rig: 'multi', fall: 'cut', R: 6, boss: .6, cap: ['Nearest point only: no blend at all.', 'Halfway between two points the shot jumps: a cut, not a move.'] },
    { t0: tC, rig: 'multi', fall: 'smooth', R: 16, Rfrom: 6, boss: .6, cap: ['Blend radius far too wide.', 'Every camera averages into one muddy shot; the authored framing is lost.'] },
    { t0: tD, rig: 'two', fall: 'linear', R: 10, boss: .6, cap: ['Two points (slides 49-52).', 'Camera 1 blends into camera 2 as the hero walks from point 1 to point 2. Same rule, fewer cameras to author.'] },
  ];
  const DUR = Math.ceil(tourPath.t * 10) / 10;
  function tourAt(st, t) {
    const ph = TOUR.filter(p => p.t0 <= t).at(-1), p = tourPath.at(t);
    st.rig = ph.rig; st.fall = ph.fall; st.boss = ph.boss;
    st.R = ph.Rfrom != null ? lerp(ph.Rfrom, ph.R, ease(clamp((t - ph.t0) / 1.6))) : ph.R;
    st.hx = p.x; st.hy = p.y; st.face = p.face; st.cap = ph.cap; st.capA = clamp((t - ph.t0) / .4);
  }

  /* ---------- drawing ---------- */
  function walkPath(g) {
    const [a, b, c] = [AREA.corridor, AREA.bridge, AREA.arena];
    g.beginPath(); g.rect(mx(a[0]), my(a[1]), (a[2] - a[0]) * S, (a[3] - a[1]) * S);
    g.rect(mx(b[0]), my(b[1]), (b[2] - b[0]) * S, (b[3] - b[1]) * S);
    g.moveTo(mx(c[0] + c[2]), my(c[1])); g.arc(mx(c[0]), my(c[1]), c[2] * S, 0, TAU);
  }
  const PILLARS = [0, 1, 2, 3, 4].map(i => { const a = -1.9 + i * .95; return [AREA.arena[0] + Math.cos(a) * 5.4, AREA.arena[1] + Math.sin(a) * 5.4]; }).filter(p => p[1] < 13 || p[0] > 18);
  function camIcon(g, x, y, ang, col, a = 1, s = 1) {
    g.save(); g.globalAlpha *= a; g.translate(x, y); g.rotate(ang); g.scale(s, s);
    g.fillStyle = col; g.strokeStyle = '#fff'; g.lineWidth = 2;
    g.beginPath(); g.roundRect(-11, -8, 16, 16, 3); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(5, -3); g.lineTo(13, -8); g.lineTo(13, 8); g.lineTo(5, 3); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
  function drawMap(g, st, bc) {
    const pts = RIGS[st.rig].pts;
    g.save(); g.beginPath(); g.roundRect(MX, MY, 27 * S, 26 * S, 10); g.clip();
    g.fillStyle = '#2a2e55'; g.fillRect(MX, MY, 27 * S, 26 * S);
    g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1; for (let i = -30; i < 60; i++) { g.beginPath(); g.moveTo(MX + i * 14, MY); g.lineTo(MX + i * 14 - 300, MY + 600); g.stroke(); }
    g.save(); walkPath(g); g.clip('nonzero'); T.floor(MX, MY, 27 * S, 26 * S); g.restore();
    // corridor walls and bridge railings
    T.wall(mx(.9), my(9.5), .6 * S, 16 * S); T.wall(mx(6.5), my(13.5), .6 * S, 12 * S);
    g.fillStyle = '#62688a'; g.fillRect(mx(1.5), my(9.2), 12.6 * S, .3 * S); g.fillRect(mx(6.5), my(13.5), 7.4 * S, .3 * S);
    PILLARS.forEach(([x, y]) => T.pillar(mx(x) - 12, my(y) - 12, 24, 24));
    g.restore();
    g.font = '600 12px Jost, sans-serif'; g.fillStyle = 'rgba(255,252,244,.75)'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.fillText('chasm', mx(9), my(20)); g.fillText('corridor', mx(7.6), my(24)); g.fillText('bridge', mx(9.5), my(15)); g.fillText('boss arena', mx(16.5), my(16.9));

    // the camera path this blend produces along the walk-through route
    if (st.showPath) {
      g.save(); g.setLineDash([2, 6]); g.strokeStyle = 'rgba(255,185,81,.85)'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath();
      let prev = null;
      for (let k = 0; k <= 160; k++) {
        const p = ROUTE(k / 160), c = blendCam(st, p[0], p[1]), q = [mx(c.pos[0]), my(c.pos[1])];
        if (!prev || Math.hypot(q[0] - prev[0], q[1] - prev[1]) > 30) g.moveTo(q[0], q[1]); else g.lineTo(q[0], q[1]);
        prev = q;
      }
      g.stroke(); g.restore();
    }
    // rings, weight lines, blend points
    g.save(); g.beginPath(); g.roundRect(MX, MY, 27 * S, 26 * S, 10); g.clip();
    pts.forEach((p, i) => {
      const col = PB_COL[i], x = mx(p.at[0]), y = my(p.at[1]), w = bc.w[i];
      if (st.fall !== 'cut') { g.save(); g.setLineDash([6, 6]); g.strokeStyle = col; g.globalAlpha = .55; g.lineWidth = 2; g.beginPath(); g.arc(x, y, st.R * S, 0, TAU); g.stroke(); g.restore(); }
      g.fillStyle = col; g.globalAlpha = .12 + .35 * w; g.beginPath(); g.arc(x, y, 14 + 26 * w, 0, TAU); g.fill(); g.globalAlpha = 1;
      g.save(); g.strokeStyle = col; g.lineCap = 'round'; g.globalAlpha = .25 + .75 * w; g.lineWidth = 1.5 + 9 * w;
      g.beginPath(); g.moveTo(mx(st.hx), my(st.hy)); g.lineTo(x, y); g.stroke(); g.restore();
    });
    g.restore();
    // authored cameras (dimmed by weight)
    if (st.showCams) pts.forEach((p, i) => {
      const col = PB_COL[i], cx = mx(p.cam[0]), cy = my(p.cam[1]), tx = mx(p.tgt[0]), ty = my(p.tgt[1]), a = .35 + .65 * bc.w[i];
      g.save(); g.globalAlpha = a; g.setLineDash([3, 5]); g.strokeStyle = col; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(tx, ty); g.stroke(); g.restore();
      g.save(); g.globalAlpha = a; g.fillStyle = col; g.beginPath(); g.arc(tx, ty, 4, 0, TAU); g.fill(); g.restore();
      camIcon(g, cx, cy, Math.atan2(ty - cy, tx - cx), col, a, .85);
      T.label(`${p.id.replace('PB', '')}_1`, cx + (cy > MY + 24 * S ? 24 : 0), cy + (cy > MY + 24 * S ? 0 : 20), 'center', col, 11);
      T.label(`${p.id.replace('PB', '')}_2`, tx + 16, ty - 10, 'center', col, 11);
    });
    pts.forEach((p, i) => {
      const x = mx(p.at[0]), y = my(p.at[1]);
      g.fillStyle = '#fffaf0'; g.strokeStyle = PB_COL[i]; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 12, 0, TAU); g.fill(); g.stroke();
      g.font = '800 11px Montserrat, Jost, sans-serif'; g.fillStyle = PB_COL[i]; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(p.id.replace('PB', ''), x, y + 1);
    });
    T.foe(mx(BOSS.x), my(BOSS.y), BOSS.r * S, Math.atan2(st.hy - BOSS.y, st.hx - BOSS.x), C.red, { mark: 'horns' });
    T.label('boss', mx(BOSS.x), my(BOSS.y) - 34, 'center', C.red, 12);
    T.player(mx(st.hx), my(st.hy), st.face, .8);
    if (st.dragHint) T.label('drag the hero', mx(st.hx), my(st.hy) + 30, 'center', C.ink, 12);
    // the blended camera: frustum toward the blended target
    const cx = mx(bc.pos[0]), cy = my(bc.pos[1]), ang = Math.atan2(bc.tgt[1] - bc.pos[1], bc.tgt[0] - bc.pos[0]), hf = VIEW_HFOV * Math.PI / 360, L = 150;
    g.fillStyle = 'rgba(255,185,81,.16)'; g.strokeStyle = 'rgba(255,185,81,.85)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ang - hf) * L, cy + Math.sin(ang - hf) * L); g.lineTo(cx + Math.cos(ang + hf) * L, cy + Math.sin(ang + hf) * L); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = C.gold; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.arc(mx(bc.tgt[0]), my(bc.tgt[1]), 6, 0, TAU); g.fill(); g.stroke();
    camIcon(g, cx, cy, ang, C.gold, 1, 1.25);
    T.label('blended camera', clamp(cx, MX + 60, MX + 27 * S - 60), Math.min(cy + 26, MY + 26 * S - 14), 'center', C.goldInk, 12);
  }
  // the walk-through route as a 0..1 curve (used to draw the camera path)
  const ROUTE_PTS = [[4, 22.6], [4, 13], [6, 11.5], [17.5, 11.5]];
  const ROUTE_LEN = ROUTE_PTS.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - ROUTE_PTS[i][0], p[1] - ROUTE_PTS[i][1]), 0);
  function ROUTE(u) {
    let d = u * ROUTE_LEN;
    for (let i = 1; i < ROUTE_PTS.length; i++) { const a = ROUTE_PTS[i - 1], b = ROUTE_PTS[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d <= l) return [lerp(a[0], b[0], d / l), lerp(a[1], b[1], d / l)]; d -= l; }
    return ROUTE_PTS.at(-1);
  }

  const FLOOR = [196, 186, 164], TILE = 'rgba(120,104,80,.45)';
  function sceneFor(st, bc) {
    const floors = [], lines = [];
    [AREA.corridor, AREA.bridge].forEach(r => {
      floors.push({ pts: [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]], col: V3.css(FLOOR) });
    });
    const ar = []; for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; ar.push([AREA.arena[0] + Math.cos(a) * AREA.arena[2], AREA.arena[1] + Math.sin(a) * AREA.arena[2]]); }
    floors.push({ pts: ar, col: V3.css(FLOOR) });
    for (let y = 11.5; y <= 25.5; y += 2) lines.push([[1.5, y, .01], [6.5, y, .01], TILE]);
    for (let x = 3.5; x <= 16.5; x += 2) lines.push([[x, 9.5, .01], [x, 13.5, .01], TILE]);
    [2, 4].forEach(rr => { for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, b = (i + 1) / 24 * TAU; lines.push([[AREA.arena[0] + Math.cos(a) * rr, AREA.arena[1] + Math.sin(a) * rr, .01], [AREA.arena[0] + Math.cos(b) * rr, AREA.arena[1] + Math.sin(b) * rr, .01], TILE]); } });
    const boxes = [
      { x0: .9, y0: 9.5, x1: 1.5, y1: 25.5, z1: 2.6, col: [61, 66, 112] },
      { x0: 6.5, y0: 13.5, x1: 7.1, y1: 25.5, z1: 2.6, col: [61, 66, 112] },
      { x0: 1.5, y0: 9.2, x1: 14.1, y1: 9.5, z1: .7, col: [98, 104, 138] },
      { x0: 6.5, y0: 13.5, x1: 13.9, y1: 13.8, z1: .7, col: [98, 104, 138] },
      ...PILLARS.map(([x, y]) => ({ x0: x - .6, y0: y - .6, x1: x + .6, y1: y + .6, z1: 5, col: [139, 143, 168] })),
    ];
    const marks = RIGS[st.rig].pts.map((p, i) => ({ x: p.at[0], y: p.at[1], r: .55, col: `rgba(${PB_COL[i].match(/\w\w/g).map(h => parseInt(h, 16)).join(',')},${.25 + .6 * bc.w[i]})` }));
    return {
      sky: ['#9fb0de', '#e6e9f4'], ground: { z: -8, col: '#353a66' }, floors, lines, boxes, marks, far: 45,
      figs: [
        { id: 'boss', kind: 'boss', x: BOSS.x, y: BOSS.y, h: BOSS.h, r: BOSS.r, col: [229, 50, 45], edge: [168, 32, 28] },
        { id: 'hero', kind: 'hero', x: st.hx, y: st.hy, h: HERO_H, r: .38, col: [46, 163, 220], edge: [21, 32, 68] },
      ],
    };
  }

  const VX = 576, VY = 44, VW = 448, VH = 252;
  function draw(g, st) {
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
    const bc = blendCam(st, st.hx, st.hy), pts = RIGS[st.rig].pts;
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.font = '800 15px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.fillText('Top-down map', MX, 32);
    g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText(`${RIGS[st.rig].name} · ${FALLOFF[st.fall].name}${st.fall === 'cut' ? '' : ` · radius ${st.R.toFixed(1)} m`}`, MX + 128, 32);
    drawMap(g, st, bc);

    g.font = '800 15px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.fillText('What the player sees', VX, 32);
    const cm = V3.cam(bc.pos, bc.tgt, VIEW_HFOV, VW, VH);
    g.save(); g.beginPath(); g.roundRect(VX, VY, VW, VH, 10); g.clip();
    const figs = V3.render(g, cm, VX, VY, sceneFor(st, bc));
    // thirds grid
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; g.beginPath();
    [1, 2].forEach(k => { g.moveTo(VX + VW * k / 3, VY); g.lineTo(VX + VW * k / 3, VY + VH); g.moveTo(VX, VY + VH * k / 3); g.lineTo(VX + VW, VY + VH * k / 3); }); g.stroke();
    g.restore();
    g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.roundRect(VX, VY, VW, VH, 10); g.stroke();
    const h = figs.hero, onScreen = !!h && h.x > -h.w / 2 && h.x < VW + h.w / 2 && h.top < VH - 6 && h.y > 6;
    T.label(onScreen ? 'hero on screen' : 'hero off screen', VX + 12, VY + 20, 'left', onScreen ? GREEN : C.red, 12);
    T.label(`HFOV ${VIEW_HFOV}° · camera height ${bc.pos[2].toFixed(1)} m`, VX + VW - 12, VY + VH - 18, 'right', C.ink, 12);

    // weights
    const wy = VY + VH + 26;
    g.font = '800 14px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'left'; g.fillText('Blend weights (from hero distance)', VX, wy);
    pts.forEach((p, i) => {
      const y = wy + 14 + i * 26, w = bc.w[i];
      g.font = '700 13px Jost, sans-serif'; g.fillStyle = PB_COL[i]; g.fillText(p.id.length > 1 ? p.id : `point ${p.id}`, VX, y + 13);
      g.fillStyle = '#e6dcc5'; g.beginPath(); g.roundRect(VX + 64, y, 270, 18, 6); g.fill();
      g.fillStyle = PB_COL[i]; if (w > .005) { g.beginPath(); g.roundRect(VX + 64, y, Math.max(6, 270 * w), 18, 6); g.fill(); }
      g.fillStyle = C.ink; g.font = '700 13px Jost, sans-serif'; g.fillText(`${Math.round(w * 100)}%`, VX + 344, y + 14);
      g.fillStyle = C.muted; g.font = '500 12px Jost, sans-serif'; g.fillText(`${bc.d[i].toFixed(1)} m`, VX + 388, y + 14);
    });
    const by = wy + 14 + pts.length * 26 + 4;
    g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.muted;
    g.fillText(`Boss framing pull: ${Math.round(bc.pull * 100)}% (fades in near the boss)`, VX, by + 10);

    // caption (tour) or pros and cons
    const cy0 = 472;
    g.fillStyle = '#efe6d2'; g.beginPath(); g.roundRect(VX, cy0, VW, 98, 10); g.fill();
    if (st.tour && st.cap) {
      g.globalAlpha = st.capA; g.font = '800 15px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.fillText(st.cap[0], VX + 14, cy0 + 28);
      g.font = '500 14px Jost, sans-serif'; g.fillStyle = C.ink; wrap(g, st.cap[1], VX + 14, cy0 + 52, VW - 28, 19); g.globalAlpha = 1;
    } else {
      g.font = '800 13px Montserrat, Jost, sans-serif'; g.fillStyle = GREEN; g.fillText('PROS', VX + 14, cy0 + 24);
      g.font = '500 14px Jost, sans-serif'; g.fillStyle = C.ink; g.fillText('The player never has to divert attention to the camera.', VX + 14, cy0 + 44); g.fillText('New player friendly.', VX + 14, cy0 + 63);
      g.font = '800 13px Montserrat, Jost, sans-serif'; g.fillStyle = C.red; g.fillText('CONS', VX + 14, cy0 + 86); g.font = '500 14px Jost, sans-serif'; g.fillStyle = C.ink; g.fillText('Very labor intensive for camera designers.', VX + 64, cy0 + 86);
    }
    return { bc, onScreen };
  }
  function wrap(g, text, x, y, w, lh) {
    const words = text.split(' '); let line = '';
    words.forEach(wd => { const t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > w && line) { g.fillText(line, x, y); y += lh; line = wd; } else line = t; });
    if (line) g.fillText(line, x, y);
  }

  const scenes = {};
  canvasDemo('blend', (s, cv, g) => {
    const st = { rig: 'multi', fall: 'smooth', R: 6, boss: .6, hx: 4, hy: 21, face: -Math.PI / 2, showCams: true, showPath: true, tour: true, held: false, t: 0, key: '', drag: false, dragHint: false };
    const tourBtn = $(s, '.pb-tour'), rigs = $$(s, '.pb-rig .btn'), falls = $$(s, '.pb-fall .btn'), rR = $(s, '.pb-r'), rB = $(s, '.pb-boss'), cCams = $(s, '.pb-cams'), cPath = $(s, '.pb-path');
    const sync = () => {
      rigs.forEach(b => b.classList.toggle('on', b.dataset.r === st.rig)); falls.forEach(b => b.classList.toggle('on', b.dataset.f === st.fall));
      rR.value = st.R; rB.value = Math.round(st.boss * 100);
      $(s, '.pb-rv').textContent = `${(+st.R).toFixed(1)} m`; $(s, '.pb-bv').textContent = `${Math.round(st.boss * 100)}%`;
      rR.disabled = st.fall === 'cut';
    };
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); } };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    rigs.forEach(b => b.onclick = () => { manual(); st.rig = b.dataset.r; sync(); });
    falls.forEach(b => b.onclick = () => { manual(); st.fall = b.dataset.f; sync(); });
    rR.oninput = () => { manual(); st.R = +rR.value; sync(); };
    rB.oninput = () => { manual(); st.boss = rB.value / 100; sync(); };
    cCams.onchange = () => { st.showCams = cCams.checked; };
    cPath.onchange = () => { st.showPath = cPath.checked; };
    const toWorld = e => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) * W / r.width - MX) / S, ((e.clientY - r.top) * H / r.height - MY) / S]; };
    cv.addEventListener('pointerdown', e => {
      const [x, y] = toWorld(e);
      if (Math.hypot(x - st.hx, y - st.hy) < 1.6 || walkable(x, y)) { manual(); st.drag = true; cv.setPointerCapture(e.pointerId); const p = clampWalk(x, y, st.hx, st.hy); st.hx = p[0]; st.hy = p[1]; }
    });
    cv.addEventListener('pointermove', e => {
      const [x, y] = toWorld(e);
      cv.style.cursor = st.drag || Math.hypot(x - st.hx, y - st.hy) < 1.6 ? 'grab' : (walkable(x, y) ? 'pointer' : '');
      if (!st.drag) return;
      const p = clampWalk(x, y, st.hx, st.hy);
      if (Math.hypot(p[0] - st.hx, p[1] - st.hy) > .05) st.face = Math.atan2(p[1] - st.hy, p[0] - st.hx);
      st.hx = p[0]; st.hy = p[1];
    });
    const up = () => { st.drag = false; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    function info(r) {
      const pts = RIGS[st.rig].pts, k = r.bc.w.indexOf(Math.max(...r.bc.w));
      const key = [st.rig, st.fall, Math.round(st.R * 2), Math.round(st.boss * 20), k, Math.round(r.bc.w[k] * 10), r.onScreen, st.tour].join();
      if (key === st.key) return; st.key = key; sync();
      say($(s, '.pb-stats'), `<div class="g"><b>${pts[k].id}</b><span>leads the blend at ${Math.round(r.bc.w[k] * 100)}%</span></div><div class="${r.onScreen ? '' : 'r'}"><b>${r.onScreen ? 'yes' : 'no'}</b><span>hero on screen</span></div>`);
      say($(s, '.pb-out'), st.fall === 'cut' ? 'With no blend the camera snaps to whichever point is nearest. That is a fixed camera with activation volumes, and its cuts land wherever the volumes meet.'
        : st.R > 11 ? 'A radius this wide lets every point pull on every shot. The camera drifts to the average of all three and none of the authored framings survive.'
        : st.R < 2.5 ? 'A tight radius keeps each authored shot pure near its point but squeezes the blend into a short stretch, so the camera moves fast there.'
        : 'Each authored camera owns the shot near its point and hands over smoothly in between. The player only moves the hero; the camera designer has framed every step.');
    }
    scenes.blend = { seek(t) { st.held = true; st.tour = true; tourAt(st, t); info(draw(g, st)); }, dur: () => DUR };
    sync();
    return dt => {
      if (st.held) return;
      st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= DUR) st.t = 0; tourAt(st, st.t); }
      info(draw(g, st));
    };
  });

  window.__seek = (t, which = 'blend') => scenes[which].seek(t);
  window.__dur = (which = 'blend') => scenes[which].dur();
})();
