/* Lens ladder (Module 6, Part 3: Designing field of view, deck slides 153-177), plus two more slides:
   "Size is relative" (162-164) and "Accessibility switches" (Goal 8, about 266-269).
   Lens maths: the deck's lens numbers match a 36 mm full-frame sensor width, so HFOV = 2·atan(18 / f) for a focal
   length f in mm (50 → 39.6°, 35 → 54.4°, 28 → 65.5°, 24 → 73.7°, 20 → 84°, 135 → 15.2°). VFOV comes from the deck's
   formula vfov = 2·atan(tan(hfov / 2) · h / w). The view panel is a pinhole projection (view3d.js) of a grey-box street.
   Tunable rules live in the tables below: LENSES (the ladder), RIG (per-action camera distance, height, design lens),
   SEATS (view distance and comfortable HFOV), ENEMIES and the TOUR tables of each slide. Every frame is a pure
   function of the slide's state and time, so __seek(t, which) draws the walk-throughs deterministically. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2, D2R = Math.PI / 180;
  const W = 1040, H = 585, GREEN = '#1a8a4c';

  /* ---------- rules ---------- */
  const SENSOR = 36;                                                         // mm, full-frame width
  const hfovOf = mm => 2 * Math.atan(SENSOR / 2 / mm) / D2R;
  const mmOf = h => SENSOR / 2 / Math.tan(h * D2R / 2);
  const vfovOf = (h, aspect = 16 / 9) => 2 * Math.atan(Math.tan(h * D2R / 2) / aspect) / D2R;
  const hfovFromV = (v, aspect = 16 / 9) => 2 * Math.atan(Math.tan(v * D2R / 2) * aspect) / D2R;
  const LENSES = [
    { mm: 135, tag: 'scope' }, { mm: 50, tag: 'aim, first try' }, { mm: 35, tag: 'aim, shipped' },
    { mm: 28, tag: 'base, tried' }, { mm: 24, tag: 'base, shipped' }, { mm: 20, tag: 'base, tried' },
  ];
  // per-action cameras: distance behind the hero, height, pitch, and the lens the offset was tuned for
  const RIG = {
    base: { name: 'Base follow camera', dist: 3.2, h: 1.8, pitch: 5, mm: 24 },
    aim: { name: 'Aim camera', dist: 2.6, h: 1.95, pitch: 4, mm: 35 },
    scope: { name: 'Sniper scope', mm: 135 },
  };
  const SEATS = {
    couch: { name: 'Couch (console)', dist: 2.4, screen: 1.22, screenName: '55" TV', lo: 50, hi: 70, note: 'greater view distance: tighter FOV' },
    desk: { name: 'Desk (PC)', dist: .6, screen: .6, screenName: '27" monitor', lo: 90, hi: 100, note: 'shorter view distance: higher FOV' },
    phone: { name: 'Phone', dist: .35, screen: .14, screenName: '6" phone', lo: 55, hi: 90, varies: true, note: 'varies by arm length and game type' },
  };
  const ENEMIES = [
    { id: 'e1', x: -3.2, y: -14 }, { id: 'e2', x: 3.6, y: -19.5 }, { id: 'drift', x: 2.2, y: -11 }, { id: 'far', x: -1.2, y: -48 },
  ];
  const DRIFT = [2.2, 6.1];                                                  // the target that walks sideways during aim

  /* ---------- grey-box street (The Order: 1886 style cover space) ---------- */
  const BOXES = (() => {
    const b = [];
    [[-60, -41, 10], [-39, -23, 7.5], [-21, -6, 9.5], [-4, 8, 8]].forEach(([y0, y1, h], i) => {
      b.push({ x0: -12, x1: -8, y0, y1, z1: h, col: [120 + i * 6, 124 + i * 4, 156] });
      b.push({ x0: 8, x1: 12, y0: y0 + 3, y1: y1 + 3, z1: h - 1 + (i % 2) * 2, col: [126, 122 + i * 5, 150 + i * 3] });
      for (let k = y0 + 2; k < y1 - 1; k += 4) { b.push({ x0: -8, x1: -7.6, y0: k, y1: k + .8, z1: h - .5, col: [104, 108, 140] }); b.push({ x0: 7.6, x1: 8, y0: k + 3, y1: k + 3.8, z1: h - 1, col: [104, 108, 140] }); }
    });
    [-6, -16, -26, -36, -46].forEach(y => { b.push({ x0: -6.6, x1: -6.35, y0: y, y1: y + .25, z1: 4.2, col: [61, 66, 112] }); b.push({ x0: 6.35, x1: 6.6, y0: y - 5, y1: y - 4.75, z1: 4.2, col: [61, 66, 112] }); });
    b.push({ x0: -4.3, x1: -2.3, y0: -13.1, y1: -12.1, z1: 1.1, col: [176, 140, 92] });
    b.push({ x0: 2.1, x1: 3.7, y0: -8.6, y1: -7.6, z1: 1, col: [176, 140, 92] });
    b.push({ x0: -6, x1: -.6, y0: -24.2, y1: -23.6, z1: 1.2, col: [139, 143, 168] });
    b.push({ x0: 1, x1: 5.2, y0: -30.4, y1: -29.8, z1: 1.4, col: [139, 143, 168] });
    b.push({ x0: -3, x1: .6, y0: -50, y1: -49, z1: .9, col: [139, 143, 168] });
    return b;
  })();
  const LINES = (() => { const l = [], c = 'rgba(110,98,78,.35)'; for (let x = -8; x <= 8; x += 2) l.push([[x, 6, .01], [x, -60, .01], c]); for (let y = 6; y >= -60; y -= 2) l.push([[-8, y, .01], [8, y, .01], c]); return l; })();
  function street(figs) {
    return { sky: ['#a9b6dc', '#ece9e0'], ground: { z: 0, col: '#cfc4ab' }, lines: LINES, boxes: BOXES, figs, far: 70 };
  }

  // the camera for an action state; hfov is the effective lens, comp re-tunes the offset to keep the hero on the left third
  function rigCam(state, hfov, comp, vw, vh, motion = null, designH = null) {
    if (state === 'scope') {
      const pos = [.25, -.2, 1.65], tgt = [-1.2, -48, 1.2];
      return { cm: V3.cam(pos, tgt, hfov, vw, vh), offset: 0 };
    }
    const r = RIG[state], tuned = comp ? hfov : (designH ?? hfovOf(r.mm));
    const offset = r.dist * Math.tan(tuned * D2R / 2) / 3;
    let pos = [offset, r.dist, r.h], roll = 0;
    if (motion) { pos = [pos[0] + motion.x, pos[1], pos[2] + motion.z]; roll = motion.roll; }
    const tgt = [pos[0] + (motion ? motion.yaw : 0), pos[1] - 20, pos[2] - 20 * Math.tan(r.pitch * D2R) + (motion ? motion.pitch : 0)];
    return { cm: V3.cam(pos, tgt, hfov, vw, vh, roll), offset };
  }
  const enemyFigs = drift => ENEMIES.map(e => ({ id: e.id, kind: 'foe', x: e.id === 'drift' ? drift : e.x, y: e.y, h: 1.8, r: .38, col: [229, 50, 45], edge: [168, 32, 28] }));
  const heroFig = { id: 'hero', kind: 'hero', x: 0, y: 0, h: 1.8, r: .32, col: [46, 163, 220], edge: [21, 32, 68] };

  // draw the view panel; returns which enemies are in frame and where the hero sits
  function drawView(g, st, x0, y0, vw, vh, opts = {}) {
    const { cm, offset } = rigCam(st.state, st.hEff, st.comp, vw, vh, opts.motion, st.mm ? hfovOf(st.mm) : null);
    const figs = enemyFigs(st.drift); if (st.state !== 'scope') figs.push(st.state === 'aim' ? { ...heroFig, a: .7 } : heroFig);
    g.save(); g.beginPath(); g.roundRect(x0, y0, vw, vh, 10); g.clip();
    const out = V3.render(g, cm, x0, y0, street(figs));
    // thirds grid
    g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 1; g.beginPath();
    [1, 2].forEach(k => { g.moveTo(x0 + vw * k / 3, y0); g.lineTo(x0 + vw * k / 3, y0 + vh); g.moveTo(x0, y0 + vh * k / 3); g.lineTo(x0 + vw, y0 + vh * k / 3); }); g.stroke();
    // enemies in frame and off-screen arrows
    const seen = {};
    ENEMIES.forEach(e => {
      const ex = e.id === 'drift' ? st.drift : e.x, p = cm.project([ex, e.y, 1.1]);
      const inside = p && p[0] > 0 && p[0] < vw && p[1] > 0 && p[1] < vh; seen[e.id] = inside;
      if (!inside && p) {
        const ax = clamp(p[0], 18, vw - 18), ay = clamp(p[1], 18, vh - 18), ang = Math.atan2(p[1] - vh / 2, p[0] - vw / 2);
        g.save(); g.translate(x0 + ax, y0 + ay); g.rotate(ang); g.fillStyle = C.red; g.strokeStyle = '#fff'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(12, 0); g.lineTo(-8, -9); g.lineTo(-4, 0); g.lineTo(-8, 9); g.closePath(); g.fill(); g.stroke(); g.restore();
      }
    });
    if (st.state === 'scope') {
      const r = vh * .47, cx = x0 + vw / 2, cy = y0 + vh / 2;
      g.fillStyle = 'rgba(12,16,34,.92)'; g.beginPath(); g.rect(x0, y0, vw, vh); g.arc(cx, cy, r, 0, TAU, true); g.fill();
      g.strokeStyle = 'rgba(12,16,34,.9)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx - r, cy); g.lineTo(cx + r, cy); g.moveTo(cx, cy - r); g.lineTo(cx, cy + r); g.stroke();
    } else if (st.state === 'aim') {
      const cx = x0 + vw / 2, cy = y0 + vh / 2; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath();
      [[8, 0, 16, 0], [-8, 0, -16, 0], [0, 8, 0, 16], [0, -8, 0, -16]].forEach(([a, b, c, d]) => { g.moveTo(cx + a, cy + b); g.lineTo(cx + c, cy + d); }); g.stroke();
    }
    // where the hero sits against the left third
    let heroFrac = null;
    if (st.state !== 'scope') {
      const hp = cm.project([0, 0, 1.2]); if (hp) heroFrac = hp[0] / vw;
      if (hp && opts.thirdMark !== false) {
        const onThird = Math.abs(heroFrac - 1 / 3) < .015;
        g.strokeStyle = onThird ? 'rgba(26,138,76,.9)' : 'rgba(229,50,45,.9)'; g.lineWidth = 3; g.setLineDash([6, 5]);
        g.beginPath(); g.moveTo(x0 + hp[0], y0 + vh - 46); g.lineTo(x0 + hp[0], y0 + vh - 8); g.stroke(); g.setLineDash([]);
        T.label(onThird ? 'hero on the third' : `hero at ${Math.round(heroFrac * 100)}% (third is 33%)`, x0 + clamp(hp[0], 90, vw - 90), y0 + vh - 56, 'center', onThird ? GREEN : C.red, 12);
      }
    }
    g.restore();
    g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.roundRect(x0, y0, vw, vh, 10); g.stroke();
    return { seen, heroFrac, offset };
  }

  function wrap(g, text, x, y, w, lh) {
    const words = text.split(' '); let line = '';
    words.forEach(wd => { const t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > w && line) { g.fillText(line, x, y); y += lh; line = wd; } else line = t; });
    if (line) g.fillText(line, x, y);
    return y;
  }
  const card = g => { T.use(g); g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; };
  const head = (g, s, x, y, col = C.ink, size = 15) => { g.font = `800 ${size}px Montserrat, Jost, sans-serif`; g.fillStyle = col; g.fillText(s, x, y); };
  const txt = (g, s, x, y, col = C.ink, size = 13, wt = 600) => { g.font = `${wt} ${size}px Jost, sans-serif`; g.fillStyle = col; g.fillText(s, x, y); };

  /* =====================================================================
     Slide 1: the ladder
     ===================================================================== */
  const LX = 16, LY = 50, LW = 178, LH = 56, LG = 9;
  const VX = 212, VY = 44, VW = 560, VH = 315;
  const RX = 790;
  const rungRect = i => [LX, LY + i * (LH + LG), LW, LH];

  function drawSeat(g, st, x0, y0, w, h) {
    const seat = SEATS[st.seat], sc = 86, dw = 262, ex = x0 + 30, ey = y0 + h / 2 + 14;
    head(g, `Where do you sit? ${seat.name}`, x0, y0 + 16, C.ink, 14);
    g.save(); g.beginPath(); g.rect(x0, y0 + 26, dw, h - 26); g.clip();
    // comfortable game HFOV range (green), the current lens (gold)
    const R = 300, fan = (a0, a1) => { g.beginPath(); g.moveTo(ex, ey); g.arc(ex, ey, R, -a1 / 2 * D2R, -a0 / 2 * D2R); g.closePath(); g.moveTo(ex, ey); g.arc(ex, ey, R, a0 / 2 * D2R, a1 / 2 * D2R); g.closePath(); };
    fan(seat.lo, seat.hi); g.fillStyle = seat.varies ? 'rgba(47,174,99,.16)' : 'rgba(47,174,99,.3)'; g.fill();
    g.setLineDash(seat.varies ? [5, 5] : []); g.strokeStyle = 'rgba(26,138,76,.75)'; g.lineWidth = 1.5; g.stroke(); g.setLineDash([]);
    const a = st.hEff / 2 * D2R; g.strokeStyle = C.gold; g.lineWidth = 3;
    g.beginPath(); g.moveTo(ex + Math.cos(-a) * R, ey + Math.sin(-a) * R); g.lineTo(ex, ey); g.lineTo(ex + Math.cos(a) * R, ey + Math.sin(a) * R); g.stroke();
    // the screen at its distance and the angle it fills
    const sx = ex + seat.dist * sc, half = seat.screen / 2 * sc;
    g.strokeStyle = 'rgba(38,44,106,.6)'; g.lineWidth = 1.2; g.setLineDash([3, 4]); g.beginPath(); g.moveTo(sx, ey - half); g.lineTo(ex, ey); g.lineTo(sx, ey + half); g.stroke(); g.setLineDash([]);
    g.fillStyle = C.navy; g.fillRect(sx - 3, ey - half, 6, half * 2);
    g.restore();
    g.fillStyle = C.ink; g.beginPath(); g.arc(ex - 6, ey, 12, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(ex, ey, 3.5, 0, TAU); g.fill();
    txt(g, 'you', ex - 18, ey + 28, C.ink, 12);
    // readouts in their own column
    const sa = 2 * Math.atan(seat.screen / 2 / seat.dist) / D2R, inside = st.hEff >= seat.lo - .05 && st.hEff <= seat.hi + .05, tx = x0 + dw + 14, tw = w - dw - 14;
    let y = y0 + 44;
    txt(g, `${seat.screenName} at ${seat.dist} m`, tx, y, C.ink, 13, 700); y += 17;
    txt(g, `fills ${sa.toFixed(0)}° of your view`, tx, y, C.muted, 12); y += 24;
    txt(g, `comfortable ${seat.lo}-${seat.hi}°`, tx, y, GREEN, 13, 800); y += 22;
    txt(g, `lens now ${st.hEff.toFixed(1)}°:`, tx, y, inside ? GREEN : C.goldInk, 12, 700); y += 16;
    txt(g, inside ? 'inside the range' : st.hEff < seat.lo ? 'tighter than the range' : 'wider than the range', tx, y, inside ? GREEN : C.goldInk, 13, 800); y += 22;
    g.font = '500 12px Jost, sans-serif'; g.fillStyle = C.muted; wrap(g, seat.note, tx, y, tw, 15);
  }

  function drawMini(g, st, x0, y0, w, h, seen) {
    const sc = 5.2, cx = x0 + w / 2, cy = y0 + h - 22, P = (x, y) => [cx + x * sc, cy + y * sc];
    g.save(); g.beginPath(); g.roundRect(x0, y0, w, h, 8); g.clip();
    g.fillStyle = '#e6dcc5'; g.fillRect(x0, y0, w, h);
    g.fillStyle = '#9aa0bf'; BOXES.forEach(b => { if (b.z1 > 5) return; const [a, c] = [P(b.x0, b.y0), P(b.x1, b.y1)]; g.fillRect(a[0], a[1], c[0] - a[0], c[1] - a[1]); });
    g.fillStyle = '#7b80a6'; g.fillRect(x0, y0, cx - 8 * sc - x0, h); g.fillRect(cx + 8 * sc, y0, w, h);
    const { cm } = rigCam(st.state, st.hEff, st.comp, 16, 9, null, hfovOf(st.mm)), cp = P(cm.pos[0], cm.pos[1]), ang = Math.atan2(cm.f[1], cm.f[0]), a = st.hEff / 2 * D2R;
    g.fillStyle = 'rgba(255,185,81,.3)'; g.strokeStyle = C.gold; g.lineWidth = 2;
    g.beginPath(); g.moveTo(cp[0], cp[1]); g.arc(cp[0], cp[1], 400, ang - a, ang + a); g.closePath(); g.fill(); g.stroke();
    ENEMIES.forEach(e => { const p = P(e.id === 'drift' ? st.drift : e.x, e.y); g.fillStyle = seen[e.id] ? C.red : 'rgba(229,50,45,.35)'; g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.arc(p[0], p[1], 4.5, 0, TAU); g.fill(); g.stroke(); });
    const hp = P(0, 0); g.fillStyle = C.player; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(hp[0], hp[1], 5, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = C.navy; g.beginPath(); g.arc(cp[0], cp[1], 3.5, 0, TAU); g.fill();
    g.restore();
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(x0, y0, w, h, 8); g.stroke();
    T.label('far target 48 m ↑', x0 + 8, y0 + 14, 'left', seen.far ? C.red : C.muted, 11);
  }

  function drawLadder(g, st, t) {
    card(g);
    head(g, 'Lens ladder', LX, 34);
    LENSES.forEach((L, i) => {
      const [x, y, w, h] = rungRect(i), on = Math.abs(st.mm - L.mm) < .5, hov = st.hover === i;
      g.fillStyle = on ? C.navy : hov ? '#efe6d2' : '#fffaf0'; g.strokeStyle = on ? C.gold : '#cdbf9f'; g.lineWidth = on ? 3 : 2;
      g.beginPath(); g.roundRect(x, y, w, h, 10); g.fill(); g.stroke();
      g.font = '800 20px Montserrat, Jost, sans-serif'; g.fillStyle = on ? '#fff' : C.ink; g.fillText(`${L.mm} mm`, x + 12, y + 26);
      g.font = '600 12px Jost, sans-serif'; g.fillStyle = on ? '#cfd6f5' : C.muted; g.fillText(`HFOV ${hfovOf(L.mm).toFixed(1)}°`, x + 12, y + 44);
      g.textAlign = 'right'; g.font = '700 11px Jost, sans-serif'; g.fillStyle = on ? C.gold : C.goldInk; g.fillText(L.tag, x + w - 10, y + 44); g.textAlign = 'left';
    });
    const ly = LY + 6 * (LH + LG) + 6;
    txt(g, 'tight ↑ · wide ↓', LX, ly + 6, C.muted, 12, 600);
    g.fillStyle = '#efe6d2'; g.beginPath(); g.roundRect(LX, ly + 20, LW, 96, 10); g.fill();
    txt(g, 'Assumption', LX + 10, ly + 40, C.ink, 12, 800);
    txt(g, '36 mm full-frame sensor', LX + 10, ly + 58, C.ink, 12, 600); txt(g, 'width, so', LX + 10, ly + 74, C.ink, 12, 600);
    txt(g, 'HFOV = 2·atan(18 / f)', LX + 10, ly + 96, C.ink, 13, 800);

    head(g, `${RIG[st.state].name} · The Order: 1886 grey-box`, VX, 32, C.ink, 14);
    const r = drawView(g, st, VX, VY, VW, VH);

    // readouts
    const v = vfovOf(st.hEff);
    g.font = '800 40px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.fillText(`${mmOf(st.hEff).toFixed(st.pct === 1 ? 0 : 1)} mm`, RX, 82);
    txt(g, st.pct === 1 ? 'focal length' : `equivalent lens at FOV ${Math.round(st.pct * 100)}%`, RX, 102, C.muted, 12);
    g.font = '800 22px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.fillText(`HFOV ${st.hEff.toFixed(1)}°`, RX, 134); g.fillText(`VFOV ${v.toFixed(1)}°`, RX, 162);
    txt(g, 'VFOV at 16:9: 2·atan(tan(h/2)·9/16)', RX, 182, C.muted, 11);
    const n = Object.values(r.seen).filter(Boolean).length;
    txt(g, `enemies in frame: ${n} of ${ENEMIES.length}`, RX, 206, n === ENEMIES.length ? GREEN : C.red, 14, 700);
    drawMini(g, st, RX, 216, W - 16 - RX, 143, r.seen);

    // bottom strip: seat diagram and caption
    g.fillStyle = '#fffaf0'; g.strokeStyle = '#e3d8bf'; g.lineWidth = 2; g.beginPath(); g.roundRect(VX, 376, 428, 194, 10); g.fill(); g.stroke();
    drawSeat(g, st, VX + 12, 384, 404, 180);
    const bx = VX + 444, bw = W - 16 - bx;
    g.fillStyle = '#efe6d2'; g.beginPath(); g.roundRect(bx, 376, bw, 194, 10); g.fill();
    if (st.tour && st.cap) {
      g.globalAlpha = st.capA; head(g, st.cap[0], bx + 14, 400, C.ink, 14);
      g.font = '500 13px Jost, sans-serif'; g.fillStyle = C.ink; wrap(g, st.cap[1], bx + 14, 422, bw - 28, 18); g.globalAlpha = 1;
    } else {
      head(g, st.pct === 1 ? 'Per-action lenses' : `Player FOV ${Math.round(st.pct * 100)}% on every camera`, bx + 14, 400, C.ink, 14);
      g.font = '500 13px Jost, sans-serif'; g.fillStyle = C.ink;
      wrap(g, st.state === 'scope' ? 'The scope has no hero to frame; its 135 mm came from the level’s size and combat distance.'
        : r.heroFrac != null && Math.abs(r.heroFrac - 1 / 3) >= .015 ? `The offset was tuned for ${Math.round(hfovOf(st.mm) * 10) / 10}°. At ${st.hEff.toFixed(1)}° the hero drifts off the third unless the offset is re-tuned too.`
        : 'Click a rung or pick a camera. Then change the player FOV % and watch the hero against the left third.', bx + 14, 422, bw - 28, 18);
    }
    g.strokeStyle = '#d9cba8'; g.lineWidth = 1; g.beginPath(); g.moveTo(bx + 14, 494); g.lineTo(bx + bw - 14, 494); g.stroke();
    ['base', 'aim', 'scope'].forEach((k, i) => {
      const h0 = hfovOf(RIG[k].mm), y = 512 + i * 20, on = k === st.state;
      txt(g, RIG[k].name, bx + 14, y, on ? C.ink : C.muted, 12, on ? 800 : 600);
      g.textAlign = 'right'; txt(g, `${RIG[k].mm} mm · ${h0.toFixed(1)}°${st.pct === 1 ? '' : ` → ${(h0 * st.pct).toFixed(1)}°`}`, bx + bw - 14, y, on ? C.ink : C.muted, 12, 700); g.textAlign = 'left';
    });
    return r;
  }

  // walk-through: The Order: 1886's lens story
  const LADDER_TOUR = [
    { t0: 0, state: 'aim', mm: 50, drift: [0, 5.5], cap: ['Aim at 50 mm (HFOV 39.6°)', 'The Order: 1886 started aim at 50 mm, the closest to human eyes. Watch the target on the right walk out of frame.'] },
    { t0: 5.5, state: 'aim', mm: 50, drift: null, cap: ['Too much camera work', 'Players were having to spend too much time moving the camera around (or exiting aim) to find targets.'] },
    { t0: 8.5, state: 'aim', mm: 35, drift: [9.2, 14], cap: ['Aim moved to 35 mm (HFOV 54.4°)', 'The same target now stays in frame while it moves. But aim got wider, so the base camera had to go wider too.'] },
    { t0: 14, state: 'base', mm: 20, cap: ['Base camera: tried 20 mm (HFOV 84°)', 'Very wide: the street stretches at the edges of the frame.'] },
    { t0: 18, state: 'base', mm: 28, cap: ['Base camera: tried 28 mm (HFOV 65.5°)', 'Closer to the 35 mm aim, so the step into aim is smaller.'] },
    { t0: 22, state: 'base', mm: 24, cap: ['Base camera: settled on 24 mm (HFOV 73.7°)', 'Wider than aim at 35 mm, short of the 20 mm stretch. The hero sits on the left third.'] },
    { t0: 26.5, state: 'scope', mm: 135, cap: ['Sniper scope: 135 mm (HFOV 15.2°)', 'Picked from the level’s size and combat distance: the far target at 48 m fills the scope.'] },
  ];
  const LADDER_DUR = 30;
  function ladderTour(st, t) {
    const i = LADDER_TOUR.findLastIndex(p => p.t0 <= t), ph = LADDER_TOUR[i], prev = LADDER_TOUR[i - 1];
    const k = ease(clamp((t - ph.t0) / .8));
    const h0 = prev && prev.state === ph.state ? hfovOf(prev.mm) : hfovOf(ph.mm);
    st.state = ph.state; st.mm = ph.mm; st.pct = 1; st.comp = true;
    st.hEff = lerp(h0, hfovOf(ph.mm), k);
    st.drift = ph.drift ? lerp(DRIFT[0], DRIFT[1], ease(clamp((t - ph.drift[0]) / (ph.drift[1] - ph.drift[0] - 1)))) : ph.state === 'aim' ? DRIFT[1] : DRIFT[0];
    st.cap = ph.cap; st.capA = clamp((t - ph.t0) / .4);
    st.seat = ph.state === 'scope' ? 'couch' : 'couch';
  }

  const scenes = {};
  canvasDemo('ladder', (s, cv, g) => {
    const st = { state: 'aim', mm: 50, hEff: hfovOf(50), pct: 1, comp: false, seat: 'couch', drift: DRIFT[0], tour: true, held: false, t: 0, key: '', hover: -1, anim: null };
    const tourBtn = $(s, '.ll-tour'), states = $$(s, '.ll-state .btn'), seats = $$(s, '.ll-seat .btn'), rPct = $(s, '.ll-pct'), cComp = $(s, '.ll-comp');
    const hIn = $(s, '.ll-h'), vIn = $(s, '.ll-v'), aSel = $(s, '.ll-aspect'), cvOut = $(s, '.ll-conv');
    const target = () => hfovOf(st.mm) * st.pct;
    const sync = () => {
      states.forEach(b => b.classList.toggle('on', b.dataset.s === st.state)); seats.forEach(b => b.classList.toggle('on', b.dataset.s === st.seat));
      rPct.value = Math.round(st.pct * 100); $(s, '.ll-pv').textContent = `${Math.round(st.pct * 100)}%`; if (!st.tour) cComp.checked = st.comp;
    };
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.drift = DRIFT[0]; st.comp = false; cComp.checked = false; } };
    const glide = () => { st.anim = { from: st.hEff, t: 0 }; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    states.forEach(b => b.onclick = () => { manual(); st.state = b.dataset.s; st.mm = RIG[st.state].mm; glide(); sync(); });
    seats.forEach(b => b.onclick = () => { manual(); st.seat = b.dataset.s; sync(); });
    rPct.oninput = () => { manual(); st.pct = rPct.value / 100; st.hEff = target(); st.anim = null; sync(); };
    cComp.onchange = () => { manual(); st.comp = cComp.checked; };
    const aspect = () => { const [a, b] = aSel.value.split(':').map(Number); return a / b; };
    const conv = from => {
      const a = aspect();
      if (from === 'h') { const h = clamp(+hIn.value || 0, 1, 179); vIn.value = vfovOf(h, a).toFixed(1); }
      else { const v = clamp(+vIn.value || 0, 1, 179); hIn.value = hfovFromV(v, a).toFixed(1); }
      const h = +hIn.value; say(cvOut, `HFOV <b>${h.toFixed(1)}°</b> = VFOV <b>${(+vIn.value).toFixed(1)}°</b> at ${aSel.value} · about a <b>${mmOf(h).toFixed(0)} mm</b> lens`);
    };
    hIn.oninput = () => conv('h'); vIn.oninput = () => conv('v'); aSel.onchange = () => conv('h'); conv('h');
    const at = e => { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height; return LENSES.findIndex((L, i) => { const [a, b, c, d] = rungRect(i); return x >= a && x <= a + c && y >= b && y <= b + d; }); };
    cv.addEventListener('mousemove', e => { st.hover = at(e); cv.style.cursor = st.hover >= 0 ? 'pointer' : ''; });
    cv.addEventListener('mouseleave', () => { st.hover = -1; });
    cv.addEventListener('click', e => {
      const i = at(e); if (i < 0) return; manual(); st.mm = LENSES[i].mm;
      if (st.mm === 135) st.state = 'scope'; else if (st.state === 'scope') st.state = st.mm >= 35 ? 'aim' : 'base';
      glide(); sync(); hIn.value = hfovOf(st.mm).toFixed(1); conv('h');
    });
    function info(r) {
      const key = [st.state, st.mm, Math.round(st.hEff * 10), st.seat, st.pct, st.comp, Object.values(r.seen).join()].join();
      if (key === st.key) return; st.key = key; sync();
      const n = Object.values(r.seen).filter(Boolean).length, seat = SEATS[st.seat], inside = st.hEff >= seat.lo && st.hEff <= seat.hi;
      say($(s, '.ll-stats'), `<div><b>${st.hEff.toFixed(1)}°</b><span>HFOV · VFOV ${vfovOf(st.hEff).toFixed(1)}°</span></div><div class="${n === ENEMIES.length ? 'g' : 'r'}"><b>${n}/${ENEMIES.length}</b><span>enemies in frame</span></div><div class="${inside ? 'g' : 'y'}"><b>${inside ? 'in' : 'out'}</b><span>${seat.name} range ${seat.lo}-${seat.hi}°</span></div>`);
    }
    scenes.ladder = { seek(t) { st.held = true; st.tour = true; ladderTour(st, t); info(drawLadder(g, st, t)); }, dur: () => LADDER_DUR };
    sync();
    return dt => {
      if (st.held) return;
      dt = Math.max(0, dt); st.t += dt;
      if (st.tour) { if (st.t >= LADDER_DUR) st.t = 0; ladderTour(st, st.t); }
      else if (st.anim) { st.anim.t += dt; const k = ease(clamp(st.anim.t / .6)); st.hEff = lerp(st.anim.from, target(), k); if (k >= 1) st.anim = null; }
      else st.hEff = target();
      info(drawLadder(g, st, st.t));
    };
  });

  /* =====================================================================
     Slide 2: size is relative
     ===================================================================== */
  const DOTS = { y: 126, lx: 300, rx: 740, r: 24, big: { n: 6, r: 33, d: 72 }, small: { n: 8, r: 9, d: 42 } };
  function sizeState(t) {
    return {
      ringL: clamp((t - 1.5) / .8), ringR: clamp((t - 3) / .8), measure: clamp((t - 7) / .8), fov: clamp((t - 11) / 1), lensK: t < 13 ? 0 : ease(clamp((t - 13) / 2.5)),
      cap: t < 7 ? ['Which orange dot is bigger?', 'Two identical orange dots. Large white dots gather around the left one, small ones around the right.']
        : t < 11 ? ['Same size', 'Measured, the orange dots are identical. The surroundings set how big each one feels.']
        : ['FOV does the same to your hero', 'Same hero, same size on screen. A long lens fills the frame with big surroundings; a wide lens shrinks them, so the hero feels bigger.'],
    };
  }
  const SIZE_DUR = 20;
  function sizeView(g, x0, y0, vw, vh, mm, label) {
    const hf = hfovOf(mm), heroScreen = .5;                                   // hero fills half the view height in both
    const vf = vfovOf(hf, vw / vh), dist = 1.8 / (heroScreen * 2 * Math.tan(vf * D2R / 2));
    const pos = [0, dist, 1.0], cm = V3.cam(pos, [0, dist - 10, 1.0], hf, vw, vh);
    const boxes = []; for (let i = -6; i <= 6; i++) boxes.push({ x0: i * 3.2 - .6, x1: i * 3.2 + .6, y0: -9, y1: -7.8, z1: 5, col: [139, 143, 168] });
    for (let i = -3; i <= 3; i++) boxes.push({ x0: i * 7 - 1.5, x1: i * 7 + 1.5, y0: -22, y1: -19, z1: 9, col: [120, 126, 158] });
    const sc = { sky: ['#a9b6dc', '#ece9e0'], ground: { z: 0, col: '#cfc4ab' }, lines: LINES, boxes, figs: [{ ...heroFig, r: .45 }], far: 60 };
    g.save(); g.beginPath(); g.roundRect(x0, y0, vw, vh, 10); g.clip(); const f = V3.render(g, cm, x0, y0, sc); g.restore();
    g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.roundRect(x0, y0, vw, vh, 10); g.stroke();
    head(g, label, x0, y0 - 10, C.ink, 14);
    g.textAlign = 'right'; txt(g, `camera ${dist.toFixed(1)} m from the hero`, x0 + vw, y0 - 10, C.muted, 12); g.textAlign = 'left';
    return f.hero;
  }
  function drawSize(g, st) {
    card(g);
    // the illusion panel
    g.fillStyle = C.navy; g.beginPath(); g.roundRect(16, 16, W - 32, 220, 12); g.fill();
    const ring = (cx, R, a) => { if (a <= 0) return; g.globalAlpha = a; g.fillStyle = '#f4f1ea'; for (let i = 0; i < R.n; i++) { const an = i / R.n * TAU + .3; g.beginPath(); g.arc(cx + Math.cos(an) * R.d, DOTS.y + Math.sin(an) * R.d, R.r, 0, TAU); g.fill(); } g.globalAlpha = 1; };
    ring(DOTS.lx, DOTS.big, st.ringL); ring(DOTS.rx, DOTS.small, st.ringR);
    [DOTS.lx, DOTS.rx].forEach(x => { g.fillStyle = '#f08a24'; g.beginPath(); g.arc(x, DOTS.y, DOTS.r, 0, TAU); g.fill(); });
    if (st.measure > 0) {
      g.globalAlpha = st.measure; g.strokeStyle = C.gold; g.lineWidth = 3;
      [DOTS.lx, DOTS.rx].forEach(x => { g.beginPath(); g.moveTo(x - DOTS.r, DOTS.y - 2); g.lineTo(x + DOTS.r, DOTS.y - 2); g.moveTo(x - DOTS.r, DOTS.y - 10); g.lineTo(x - DOTS.r, DOTS.y + 6); g.moveTo(x + DOTS.r, DOTS.y - 10); g.lineTo(x + DOTS.r, DOTS.y + 6); g.stroke(); });
      g.setLineDash([5, 6]); g.beginPath(); g.moveTo(DOTS.lx - DOTS.r, DOTS.y - 2); g.lineTo(DOTS.rx + DOTS.r, DOTS.y - 2); g.stroke(); g.setLineDash([]);
      T.label(`both ${DOTS.r * 2} px wide`, (DOTS.lx + DOTS.rx) / 2, DOTS.y - 22, 'center', C.goldInk, 13); g.globalAlpha = 1;
    }
    g.font = '800 17px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'center'; g.fillText(st.cap[0], W / 2, 260);
    g.font = '500 14px Jost, sans-serif'; g.fillStyle = C.ink; g.fillText(st.cap[1], W / 2, 281); g.textAlign = 'left';
    // the FOV comparison
    g.globalAlpha = .25 + .75 * st.fov;
    const vw = 448, vh = 252, y0 = 318;
    const longMm = lerp(50, 135, st.lensK), wideMm = lerp(50, 20, st.lensK);
    const a = sizeView(g, 48, y0, vw, vh, Math.round(longMm), `Long lens: ${Math.round(longMm)} mm · HFOV ${hfovOf(longMm).toFixed(1)}°`);
    const b = sizeView(g, W - 48 - vw, y0, vw, vh, Math.round(wideMm), `Wide lens: ${Math.round(wideMm)} mm · HFOV ${hfovOf(wideMm).toFixed(1)}°`);
    if (st.fov > .5) {
      [[48, a], [W - 48 - vw, b]].forEach(([x, f]) => { if (!f) return; g.strokeStyle = C.gold; g.lineWidth = 3; const lx = x + f.x + f.w / 2 + 12; g.beginPath(); g.moveTo(lx, y0 + f.top); g.lineTo(lx, y0 + f.y); g.moveTo(lx - 6, y0 + f.top); g.lineTo(lx + 6, y0 + f.top); g.moveTo(lx - 6, y0 + f.y); g.lineTo(lx + 6, y0 + f.y); g.stroke(); });
      T.label('same hero height on screen', W / 2, y0 + vh / 2, 'center', C.goldInk, 13);
    }
    g.globalAlpha = 1;
  }
  canvasDemo('size', (s, cv, g) => {
    const st = { tour: true, held: false, t: 0, ringL: 1, ringR: 1, measure: 0, fov: 1, lensK: 1 };
    const tourBtn = $(s, '.sz-tour'), cRing = $(s, '.sz-ring'), cMeas = $(s, '.sz-meas'), rLens = $(s, '.sz-lens');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); } read(); };
    const read = () => { st.ringL = st.ringR = cRing.checked ? 1 : 0; st.measure = cMeas.checked ? 1 : 0; st.fov = 1; st.lensK = rLens.value / 100; st.cap = sizeState(st.measure ? 9 : 5).cap; if (!st.measure && st.lensK > 0) st.cap = sizeState(15).cap; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    [cRing, cMeas].forEach(c => c.onchange = manual); rLens.oninput = manual;
    scenes.size = { seek(t) { st.held = true; drawSize(g, sizeState(t)); }, dur: () => SIZE_DUR };
    return dt => {
      if (st.held) return;
      st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= SIZE_DUR) st.t = 0; drawSize(g, sizeState(st.t)); } else drawSize(g, st);
    };
  });

  /* =====================================================================
     Slide 3: accessibility switches (Goal 8)
     ===================================================================== */
  // additive camera motion: a walk bob, a slow sway, and a shake on every shot (deterministic in t)
  const SHOT_EVERY = 1.6;
  function motionAt(t, amt) {
    const ts = t % SHOT_EVERY, kick = Math.exp(-ts * 7) * (ts < 1 ? 1 : 0);
    return {
      z: amt * (.045 * Math.sin(t * 9.4) + .06 * kick * Math.sin(ts * 70)),
      x: amt * .03 * Math.sin(t * 4.7),
      roll: amt * (1.4 * Math.sin(t * 2.1) + 2.2 * kick * Math.sin(ts * 55 + 1)) * D2R,
      pitch: amt * (.5 * kick + .12 * Math.sin(t * 9.4)),
      yaw: amt * .35 * kick * Math.sin(ts * 47),
      kick,
    };
  }
  const ACC_TOUR = [
    { t0: 0, motion: 1, pct: 1, comp: true, seat: 'couch', cap: ['Additive motion at 100%', 'Walk bob, sway and a shake on every shot. Some players are very sensitive to extraneous motion.'] },
    { t0: 6, motion: .35, motion0: 1, pct: 1, comp: true, seat: 'couch', cap: ['Reduce camera animation and shakes', 'The same shot with the additive layers turned down to 35%. The action still reads.'] },
    { t0: 11, motion: 0, motion0: .35, pct: 1, comp: true, seat: 'couch', cap: ['…or turn them off', 'The rig underneath is unchanged: only the additive animation and shake layers go.'] },
    { t0: 15, motion: 0, pct: 1.25, pct0: 1, comp: true, seat: 'desk', cap: ['FOV for view distance and screen size', 'A desk player sits close: raise FOV by %. Every camera scales together, and the offset is re-tuned so the hero stays on the third.'] },
    { t0: 21, motion: 0, pct: .85, pct0: 1.25, comp: true, seat: 'couch', cap: ['…and lower it for the couch', 'Base 73.7° and aim 54.4° both scale by the same %, so aim still zooms in from base.'] },
  ];
  const ACC_DUR = 26;
  function accTour(st, t) {
    const ph = ACC_TOUR.findLast(p => p.t0 <= t), k = ease(clamp((t - ph.t0) / 1.2));
    st.motion = ph.motion0 != null ? lerp(ph.motion0, ph.motion, k) : ph.motion;
    st.pct = ph.pct0 != null ? lerp(ph.pct0, ph.pct, k) : ph.pct;
    st.comp = ph.comp; st.seat = ph.seat; st.cap = ph.cap; st.capA = clamp((t - ph.t0) / .4);
  }
  function drawAcc(g, st, t) {
    card(g);
    const vw = 640, vh = 360, x0 = 16, y0 = 44;
    const mo = motionAt(t, st.motion), vst = { state: 'base', hEff: hfovOf(24) * st.pct, comp: st.comp, drift: DRIFT[0] };
    head(g, 'Base follow camera · grey-box street', x0, 32, C.ink, 14);
    const r = drawView(g, vst, x0, y0, vw, vh, { motion: mo });
    if (mo.kick > .5 && st.motion > 0) { const { cm } = rigCam('base', vst.hEff, vst.comp, vw, vh, mo); const p = cm.project([.35, -.6, 1.3]); if (p) { g.save(); g.beginPath(); g.roundRect(x0, y0, vw, vh, 10); g.clip(); T.flash(x0 + p[0], y0 + p[1], 26 * mo.kick, mo.kick); g.restore(); } }
    // motion trace
    const gx = 676, gw = W - 16 - gx, gy = 44, gh = 150;
    head(g, 'Additive camera motion', gx, 32, C.ink, 14);
    g.fillStyle = '#fffaf0'; g.strokeStyle = '#e3d8bf'; g.lineWidth = 2; g.beginPath(); g.roundRect(gx, gy, gw, gh, 10); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(38,44,106,.2)'; g.lineWidth = 1; g.beginPath(); g.moveTo(gx + 8, gy + gh / 2); g.lineTo(gx + gw - 8, gy + gh / 2); g.stroke();
    const trace = (fn, col) => { g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); for (let i = 0; i <= 120; i++) { const tt = t - 3 + i / 40, v = fn(motionAt(Math.max(0, tt), st.motion)); const px = gx + 8 + i / 120 * (gw - 16), py = gy + gh / 2 - v; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); };
    trace(m => m.roll / D2R * 14, C.purple); trace(m => m.z * 380, C.player);
    txt(g, 'roll', gx + 12, gy + 18, C.purple, 12, 700); txt(g, 'bob', gx + 46, gy + 18, C.player, 12, 700);
    g.font = '800 30px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.fillText(`${Math.round(st.motion * 100)}%`, gx, gy + gh + 40);
    txt(g, st.motion === 0 ? 'animation and shakes off' : 'animation and shakes', gx + 88, gy + gh + 36, C.muted, 13);
    // FOV % table
    const ty = gy + gh + 74;
    head(g, `Player FOV ${Math.round(st.pct * 100)}% · all cameras`, gx, ty, C.ink, 14);
    ['base', 'aim', 'scope'].forEach((k, i) => {
      const h0 = hfovOf(RIG[k].mm), y = ty + 24 + i * 22;
      txt(g, RIG[k].name, gx, y, C.ink, 13); g.textAlign = 'right'; txt(g, `${h0.toFixed(1)}° → ${(h0 * st.pct).toFixed(1)}°`, gx + gw, y, C.ink, 13, 700); g.textAlign = 'left';
    });
    const seat = SEATS[st.seat], inside = vst.hEff >= seat.lo && vst.hEff <= seat.hi;
    txt(g, `${seat.name}: comfortable ${seat.lo}-${seat.hi}°`, gx, ty + 104, inside ? GREEN : C.goldInk, 13, 700);
    txt(g, `base now ${vst.hEff.toFixed(1)}° (${inside ? 'inside' : vst.hEff < seat.lo ? 'tighter' : 'wider'})`, gx, ty + 122, inside ? GREEN : C.goldInk, 13, 700);
    // caption
    const cy = 418;
    g.fillStyle = '#efe6d2'; g.beginPath(); g.roundRect(x0, cy, W - 32, 152, 10); g.fill();
    if (st.tour && st.cap) { g.globalAlpha = st.capA; head(g, st.cap[0], x0 + 16, cy + 30, C.ink, 16); g.font = '500 15px Jost, sans-serif'; g.fillStyle = C.ink; wrap(g, st.cap[1], x0 + 16, cy + 56, W - 64, 21); g.globalAlpha = 1;
      g.strokeStyle = '#d9cba8'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0 + 16, cy + 84); g.lineTo(W - 32, cy + 84); g.stroke();
      [['Problem', 'some players are very sensitive to extraneous motion; view distances and screen sizes vary.'], ['Solution', 'reduce or turn off additive camera animation and shakes; adjust FOV for view distance and screen size.'], ['Caveat', 'allow players to adjust FOV and all the cameras by %.']].forEach(([k, v], i) => { txt(g, k, x0 + 16, cy + 106 + i * 19, C.ink, 13, 800); txt(g, v, x0 + 90, cy + 106 + i * 19, C.muted, 13, 600); });
    }
    else {
      head(g, 'Goal 8: increase accessibility', x0 + 16, cy + 30, C.ink, 16);
      g.font = '500 15px Jost, sans-serif'; g.fillStyle = C.ink;
      ['Problems: some players are very sensitive to extraneous motion; view distances and screen sizes vary.', 'Solutions: let players reduce or turn off additive camera animation and shakes, and adjust FOV for their view distance and screen.', 'Caveat: allow players to adjust FOV and all the cameras by %.'].forEach((l, i) => wrap(g, l, x0 + 16, cy + 58 + i * 30, W - 64, 20));
    }
    return r;
  }
  canvasDemo('access', (s, cv, g) => {
    const st = { motion: 1, pct: 1, comp: true, seat: 'couch', tour: true, held: false, t: 0, key: '' };
    const tourBtn = $(s, '.ac-tour'), rM = $(s, '.ac-motion'), rP = $(s, '.ac-pct'), cC = $(s, '.ac-comp'), seats = $$(s, '.ac-seat .btn');
    const sync = () => { rM.value = Math.round(st.motion * 100); rP.value = Math.round(st.pct * 100); cC.checked = st.comp; $(s, '.ac-mv').textContent = `${Math.round(st.motion * 100)}%`; $(s, '.ac-pv').textContent = `${Math.round(st.pct * 100)}%`; seats.forEach(b => b.classList.toggle('on', b.dataset.s === st.seat)); };
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); } };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    rM.oninput = () => { manual(); st.motion = rM.value / 100; sync(); };
    rP.oninput = () => { manual(); st.pct = rP.value / 100; sync(); };
    cC.onchange = () => { manual(); st.comp = cC.checked; };
    seats.forEach(b => b.onclick = () => { manual(); st.seat = b.dataset.s; sync(); });
    let last = '';
    const info = () => { const k = [Math.round(st.motion * 100), Math.round(st.pct * 100), st.seat, st.comp].join(); if (k === last) return; last = k; sync(); };
    scenes.access = { seek(t) { st.held = true; st.tour = true; accTour(st, t); drawAcc(g, st, t); info(); }, dur: () => ACC_DUR };
    sync();
    return dt => {
      if (st.held) return;
      st.t += Math.max(0, dt);
      let t = st.t;
      if (st.tour) { if (st.t >= ACC_DUR) st.t = 0; t = st.t; accTour(st, t); }
      drawAcc(g, st, t); info();
    };
  });

  window.__seek = (t, which = 'ladder') => scenes[which].seek(t);
  window.__dur = (which = 'ladder') => scenes[which].dur();
})();
