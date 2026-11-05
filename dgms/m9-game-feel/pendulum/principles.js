/* Principles 7 to 12 (Module 9, Part 10): one hands-on lab per principle, each a comparison side by side.
   Arcs: a grapple swing with real pendulum physics (drag to pull back, flick, let go into a jump arc), a straight-line ghost,
   and three tunings swung together. Secondary action: a walk whose arms and head support the legs, and an upper/lower body
   blend that keeps the legs walking while the torso attacks. Exaggeration: Super Mario Bros. sprites run with and without
   pushed extremes, at full speed and in slow motion. Staging: a centred camera next to one that frames the rule of thirds
   while the hero stands still. Solid drawing: a flat cut-out next to a constructed 3D figure (Three.js) on one turntable.
   Appeal: one stock model moving with different personalities.
   Every lab steps on a fixed 1/120 s clock, and the walk-through drives it from a script, so __seek is deterministic. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const C = TD.C, { clamp, lerp } = TD, TAU = Math.PI * 2, PI = Math.PI;
  const W = 1040, H = 585, PAPER = 'rgba(255,252,244,.88)', CARD = '#efe6d2', ORANGE = '#e07b1a', CREAM = '#fffaf0';
  const ACT = '#2e8fd0', SEC = '#e8a21c', FOL = '#8a4fd6';
  const font = (w, s, m) => `${w} ${s}px ${m ? 'Montserrat, Jost' : 'Jost'}, sans-serif`;
  const sstep = k => { k = clamp(k); return k * k * (3 - 2 * k); };
  const eOut = k => 1 - Math.pow(1 - clamp(k), 3);
  const eBack = k => { k = clamp(k); const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
  const IMG = new URL('img/', document.currentScript.src).href;
  const pic = n => { const i = new Image(); i.src = IMG + n + '.png'; return i; };
  const DT = 1 / 120, STEP = 7;          // fixed physics step, and seconds per principle in the walk-through
  const scenes = window.__pdScenes = window.__pdScenes || {};

  /* ---------- drawing helpers ---------- */
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  function panel(g, x, y, w, h, title, tag, tagCol = C.navy) {
    g.fillStyle = CARD; rr(g, x, y, w, h, 12); g.fill();
    g.font = font(800, 16, 1); g.fillStyle = C.ink; g.textAlign = 'left'; g.fillText(title, x + 14, y + 25);
    if (tag) {
      g.font = font(700, 13); const tw = g.measureText(tag).width + 18;
      g.fillStyle = tagCol; rr(g, x + w - tw - 10, y + 9, tw, 22, 11); g.fill();
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(tag, x + w - 10 - tw / 2, y + 24.5);
    }
  }
  function inner(g, x, y, w, h, fn, bg = CREAM) {
    g.fillStyle = bg; rr(g, x, y, w, h, 9); g.fill();
    g.save(); rr(g, x, y, w, h, 9); g.clip(); g.translate(x, y); fn(w, h); g.restore();
  }
  function chip(g, x, y, text, col, align = 'left') {
    g.font = font(700, 12); const tw = g.measureText(text).width + 14, x0 = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x;
    g.fillStyle = col; rr(g, x0, y - 11, tw, 20, 10); g.fill(); g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(text, x0 + tw / 2, y + 3.5);
  }
  function note(g, x, y, text, col = C.muted, size = 13, align = 'left', w = 600) {
    g.font = font(600, size); g.fillStyle = col; g.textAlign = align; g.fillText(text, x, y, w);
  }
  const bgAll = g => { g.setTransform?.(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); g.fillStyle = PAPER; rr(g, 0, 0, W, H, 14); g.fill(); };

  /* ---------- a 2D mannequin, side view. Angles are from straight down, + toward the facing side ---------- */
  const BD = { th: 36, sh: 34, to: 54, ua: 27, fa: 25, hr: 16 };
  const STAND = { lean: 0, head: 0, hL: .05, kL: .1, hR: -.05, kR: .1, sL: .06, eL: .12, sR: .02, eR: .12, lift: 0, sx: 1, sy: 1 };
  const legV = (h, k) => BD.th * Math.cos(h) + BD.sh * Math.cos(h - k);
  // p: x, gy (ground), f (facing), s (scale) and the STAND keys. Returns world points for attachments.
  function rig(g, p, o = {}) {
    const f = p.f || 1, s = p.s || 1, at = (a, len, q) => [q[0] + Math.sin(a) * f * len, q[1] + Math.cos(a) * len];
    const hipY = -Math.max(legV(p.hL, p.kL), legV(p.hR, p.kR)) - (p.lift || 0);
    const hip = [0, hipY], lean = p.lean || 0;
    const neck = [Math.sin(lean) * f * BD.to, hipY - Math.cos(lean) * BD.to];
    const sho = [neck[0] - Math.sin(lean) * f * 6, neck[1] + Math.cos(lean) * 6];
    const ha = lean + (p.head || 0), headC = [neck[0] + Math.sin(ha) * f * (BD.hr + 3), neck[1] - Math.cos(ha) * (BD.hr + 3)];
    const kL = at(p.hL, BD.th, hip), fL = at(p.hL - p.kL, BD.sh, kL), kR = at(p.hR, BD.th, hip), fR = at(p.hR - p.kR, BD.sh, kR);
    const eL = at(p.sL, BD.ua, sho), wL = at(p.sL + p.eL, BD.fa, eL), eR = at(p.sR, BD.ua, sho), wR = at(p.sR + p.eR, BD.fa, eR);
    const col = o.col || {}, body = o.body || '#cfc6b2', back = o.back || '#a9a08c', edge = o.edge || C.navy;
    g.save(); g.translate(p.x, p.gy); g.scale(s * (p.sx || 1), s * (p.sy || 1));
    const limb = (pts, w, c) => {
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.strokeStyle = edge; g.lineWidth = w + 4; g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke();
      g.strokeStyle = c; g.lineWidth = w; g.stroke();
    };
    const foot = (k, ft, c) => limb([k, ft, [ft[0] + f * 10, ft[1] + 1]], 9, c);
    if (o.shadow !== false) { g.fillStyle = 'rgba(21,32,68,.13)'; g.beginPath(); g.ellipse(0, 2, 30, 5, 0, 0, TAU); g.fill(); }
    // far side first, then the body, then the near side
    foot(kR, fR, col.legsB || col.legs && shade(col.legs) || back); limb([hip, kR], 11, col.legsB || col.legs && shade(col.legs) || back);
    limb([sho, eR, wR], 9, col.armsB || col.arms && shade(col.arms) || back);
    limb([hip, [lerp(hip[0], neck[0], .55), lerp(hip[1], neck[1], .55)], neck], 19, col.torso || body);
    foot(kL, fL, col.legs || body); limb([hip, kL], 11, col.legs || body);
    g.fillStyle = col.head || body; g.strokeStyle = edge; g.lineWidth = 2.5; g.beginPath(); g.arc(headC[0], headC[1], BD.hr, 0, TAU); g.fill(); g.stroke();
    // a visor stripe tells the eye which way the head faces
    g.strokeStyle = edge; g.lineWidth = 3; g.beginPath(); g.arc(headC[0], headC[1], BD.hr * .62, f > 0 ? -.55 + ha : PI - .55 - ha, f > 0 ? .25 + ha : PI + .25 - ha); g.stroke();
    limb([sho, eL, wL], 9, col.arms || body);
    g.restore();
    const W2 = q => [p.x + q[0] * s * (p.sx || 1), p.gy + q[1] * s * (p.sy || 1)];
    return { neck: W2(neck), handL: W2(wL), elbowL: W2(eL), handR: W2(wR), elbowR: W2(eR), head: W2(headC), hip: W2(hip), s };
  }
  function shade(hex) {
    const n = parseInt(hex.slice(1), 16), k = .78;
    return `rgb(${(n >> 16 & 255) * k | 0},${(n >> 8 & 255) * k | 0},${(n & 255) * k | 0})`;
  }
  // walk or run cycle on phase ph (radians); amp scales stride
  function walkLegs(ph, amp = 1, run = 0) {
    const sw = Math.sin(ph), c = Math.cos(ph), hA = (.42 + .2 * run) * amp, kn = (.75 + .7 * run) * amp;
    return { hL: sw * hA, hR: -sw * hA, kL: .12 + kn * Math.max(0, c), kR: .12 + kn * Math.max(0, -c) };
  }
  const blend = (a, b, k) => { const o = { ...a }; for (const key in b) if (typeof b[key] === 'number') o[key] = lerp(a[key] ?? 0, b[key], k); return o; };
  // keyframes [[t, pose], ...] sampled at u with easing e between keys
  function keys(list, u, e = sstep) {
    if (u <= list[0][0]) return { ...STAND, ...list[0][1] };
    for (let i = 1; i < list.length; i++) if (u <= list[i][0]) {
      const [t0, a] = list[i - 1], [t1, b] = list[i];
      return blend({ ...STAND, ...a }, { ...STAND, ...b }, e((u - t0) / (t1 - t0)));
    }
    return { ...STAND, ...list[list.length - 1][1] };
  }

  /* =================================================================================================
     7. ARCS: a grapple swing. Pendulum while attached, projectile while free.
     ================================================================================================= */
  const ANCH = [130, 330, 530, 730, 930].map(x => ({ x, y: 78 })), FLOOR = 548;
  const TUNE = [
    { name: 'Floaty', sub: 'low gravity, little drag', g: 650, d: .12, col: ACT },
    { name: 'Snappy', sub: 'high gravity, little drag', g: 2400, d: .25, col: ORANGE },
    { name: 'Damped', sub: 'mid gravity, heavy drag', g: 1400, d: 1.6, col: FOL },
  ];
  const arcs = {
    n: 7, name: 'Arcs', tagA: 'arc', P: { mode: 'swing', len: 190, grav: 1400, damp: .25, ghost: true },
    ctl: [
      { type: 'seg', key: 'mode', label: 'Lab', opts: [['swing', 'Grapple swing'], ['tune', 'Three tunings']] },
      { type: 'rng', key: 'grav', label: 'Gravity', min: 400, max: 3200, step: 50, fmt: v => `${v} px/s²`, show: P => P.mode === 'swing' },
      { type: 'rng', key: 'damp', label: 'Damping (air drag)', min: 0, max: 2.5, step: .05, fmt: v => v.toFixed(2), show: P => P.mode === 'swing' },
      { type: 'rng', key: 'len', label: 'Rope length on the next grapple', min: 90, max: 300, step: 5, fmt: v => `${v} px`, show: P => P.mode === 'swing' },
      { type: 'chk', key: 'ghost', label: 'Straight-line ghost', show: P => P.mode === 'swing' },
      { type: 'btn', label: 'Let go / grapple (Space)', act: (S, P) => arcs.toggle(S, P), show: P => P.mode === 'swing' },
    ],
    say: 'Living things move in arcs, and a clear line of motion makes an action easy to read. Arcs read as <b>grace</b>; straight lines read as <b>power</b>. Grapple hooks, drifts and strafe jumps all turn arcs into control.',
    how: P => P.mode === 'swing'
      ? 'Drag anywhere to pull the hero back, then flick. Space lets go: the orange trail is the jump arc. Dots are dropped every 1/30 s, so their spacing shows speed.'
      : 'Drag any bob: all three pull back together. Release and compare how each tuning swings and settles.',
    src: 'From the deck: grapple hooks, drifting and strafe jumping all use arcs for control and acceleration.',
    init(P) {
      return { a: 2, L: P.len, th: -.9, w: 0, free: false, x: 0, y: 0, vx: 0, vy: 0, held: false, hx: 0, hy: 0, trail: [], acc: 0, hist: [],
        T: TUNE.map(() => ({ th: .9, w: 0, trail: [], hist: [] })), tHeld: false, tAim: 0 };
    },
    pos(S) { const a = ANCH[S.a]; return S.free ? [S.x, S.y] : [a.x + S.L * Math.sin(S.th), a.y + S.L * Math.cos(S.th)]; },
    toggle(S, P) {
      if (!S.free) {
        const a = ANCH[S.a]; S.x = a.x + S.L * Math.sin(S.th); S.y = a.y + S.L * Math.cos(S.th);
        S.vx = S.L * S.w * Math.cos(S.th); S.vy = -S.L * S.w * Math.sin(S.th); S.free = true; S.held = false;
      } else {
        // grapple the anchor ahead in the direction of travel, else the nearest
        const dir = Math.sign(S.vx) || 1;
        let best = -1, bd = 1e9;
        ANCH.forEach((a, i) => { const dx = a.x - S.x, d = Math.hypot(dx, a.y - S.y) - (Math.sign(dx) === dir ? 120 : 0); if (a.y < S.y - 20 && d < bd) { bd = d; best = i; } });
        if (best < 0) return;
        const a = ANCH[best], dx = S.x - a.x, dy = S.y - a.y;
        S.a = best; S.L = clamp(Math.hypot(dx, dy), 80, 330); S.th = Math.atan2(dx, dy);
        S.w = (S.vx * Math.cos(S.th) - S.vy * Math.sin(S.th)) / S.L; S.free = false;
        // a slider-set length reels the rope in or out over the next second
        S.reel = P.len;
      }
    },
    step(S, P, dt) {
      if (P.mode === 'swing') {
        const g = P.grav;
        if (S.held) {
          const a = ANCH[S.a], th = Math.atan2(S.hx - a.x, S.hy - a.y), w = (th - S.th) / dt;
          S.w = lerp(S.w, clamp(w, -14, 14), .25); S.th = th;
        } else if (!S.free) {
          if (S.reel) { S.L += (S.reel - S.L) * Math.min(1, dt * 3); if (Math.abs(S.reel - S.L) < .5) S.reel = 0; }
          S.w += (-(g / S.L) * Math.sin(S.th) - P.damp * S.w) * dt; S.th += S.w * dt; S.th = Math.atan2(Math.sin(S.th), Math.cos(S.th));
        } else {
          S.vy += g * dt; const k = 1 - P.damp * .15 * dt; S.vx *= k; S.vy *= k;
          S.x += S.vx * dt; S.y += S.vy * dt;
          if (S.y > FLOOR - 14) { S.y = FLOOR - 14; S.vy *= -.35; S.vx *= .9; }
          if (S.x > W + 20) { S.x -= W + 40; S.trail = []; } if (S.x < -20) { S.x += W + 40; S.trail = []; }
        }
        S.acc += dt;
        if (S.acc >= 1 / 30) {
          S.acc -= 1 / 30; const [x, y] = this.pos(S);
          S.trail.push([x, y, S.free ? 1 : 0]); if (S.trail.length > 70) S.trail.shift();
          S.hist.push(S.free ? null : S.th); if (S.hist.length > 150) S.hist.shift();
        }
      } else {
        S.T.forEach((p, i) => {
          const tu = TUNE[i];
          if (S.tHeld) { const w = (S.tAim - p.th) / dt; p.w = lerp(p.w, clamp(w, -12, 12), .25); p.th = S.tAim; }
          else { p.w += (-(tu.g / 150) * Math.sin(p.th) - tu.d * p.w) * dt; p.th += p.w * dt; p.th = Math.atan2(Math.sin(p.th), Math.cos(p.th)); }
          p.acc = (p.acc || 0) + dt;
          if (p.acc >= 1 / 30) { p.acc -= 1 / 30; p.trail.push([Math.sin(p.th), Math.cos(p.th)]); if (p.trail.length > 36) p.trail.shift(); p.hist.push(p.th); if (p.hist.length > 150) p.hist.shift(); }
        });
      }
    },
    down(S, P, x, y) {
      if (P.mode === 'swing') { if (S.free) this.toggle(S, P); S.held = true; S.hx = x; S.hy = y; }
      else { S.tHeld = true; this.aimT(S, x, y); }
    },
    move(S, P, x, y) { if (P.mode === 'swing') { S.hx = x; S.hy = Math.max(y, ANCH[S.a].y - S.L); } else if (S.tHeld) this.aimT(S, x, y); },
    up(S, P) { S.held = false; S.tHeld = false; },
    aimT(S, x, y) { const cw = (W - 32) / 3, i = clamp(Math.floor(x / (cw + 8)), 0, 2), ax = i * (cw + 8) + cw / 2; S.tAim = clamp(Math.atan2(x - ax, Math.max(1, y - 66)), -1.45, 1.45); },
    key(S, P, k) { if (k === ' ' && P.mode === 'swing') { this.toggle(S, P); return true; } },
    tour(S, P, lt) {
      // pull back and flick, let go into a jump arc, grapple ahead, then compare the three tunings
      if (lt < 4.4) {
        P.mode = 'swing';
        if (lt < .9) { S.held = true; const a = ANCH[S.a], th = lerp(-.2, -1.3, sstep(lt / .8)); S.hx = a.x + S.L * Math.sin(th); S.hy = a.y + S.L * Math.cos(th); }
        else if (S.held) S.held = false;
        if (lt >= 1.72 && !S.free && !S.did1) { S.did1 = 1; this.toggle(S, P); }
        if (lt >= 2.4 && S.free && !S.did2) { S.did2 = 1; this.toggle(S, P); }
      } else {
        P.mode = 'tune';
        if (lt < 5.1) { S.tHeld = true; S.tAim = lerp(0, 1.15, sstep((lt - 4.4) / .6)); } else S.tHeld = false;
      }
    },
    draw(g, S, P) {
      bgAll(g);
      if (P.mode === 'swing') this.drawSwing(g, S, P); else this.drawTune(g, S, P);
    },
    drawSwing(g, S, P) {
      inner(g, 8, 8, W - 16, H - 16, (w, h) => {
        const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#e9f3fb'); sky.addColorStop(1, '#fdf8ee'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
        // ceiling beam and grapple rings
        g.fillStyle = C.wall; g.fillRect(0, 44, w, 18); g.fillStyle = C.wallHi; g.fillRect(0, 44, w, 3);
        g.fillStyle = C.floor; g.fillRect(0, FLOOR - 8, w, h); g.fillStyle = C.floorLn; g.fillRect(0, FLOOR - 8, w, 3);
        ANCH.forEach((a, i) => { g.strokeStyle = i === S.a && !S.free ? ORANGE : C.stoneDk; g.lineWidth = 4; g.beginPath(); g.arc(a.x - 8, a.y - 8, 8, 0, TAU); g.stroke(); });
      });
      g.save(); g.translate(8, 8);
      const a = ANCH[S.a], [hx, hy] = this.pos(S);
      // straight-line ghost: the same two extremes, joined by a line at the same timing
      if (P.ghost && !S.free) {
        const E = .5 * S.w * S.w * S.L / P.grav + (1 - Math.cos(S.th)), tm = Math.acos(clamp(1 - E, -1, 1));
        if (tm > .08) {
          const yl = a.y + S.L * Math.cos(tm), xl = a.x - S.L * Math.sin(tm), xr = a.x + S.L * Math.sin(tm), gx = lerp(xl, xr, clamp((S.th / tm + 1) / 2));
          g.setLineDash([6, 6]); g.strokeStyle = 'rgba(93,97,140,.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(xl, yl); g.lineTo(xr, yl); g.stroke(); g.setLineDash([]);
          g.strokeStyle = 'rgba(93,97,140,.35)'; g.lineWidth = 2; g.beginPath(); g.arc(a.x, a.y, S.L, PI / 2 - tm, PI / 2 + tm); g.stroke();
          g.fillStyle = '#b9b4a6'; g.strokeStyle = C.stoneDk; g.lineWidth = 2; g.beginPath(); g.moveTo(gx - 13, yl + 6); g.lineTo(gx + 13, yl); g.lineTo(gx - 13, yl - 6); g.closePath(); g.fill(); g.stroke();
          note(g, xr + 10, yl + 4, 'straight line: power', C.muted, 13);
          note(g, a.x + S.L * Math.sin(tm) * .7 + 8, a.y + S.L * Math.cos(tm * .7) + 22, 'arc: grace', ACT, 13);
        }
      }
      // trail: one dot every 1/30 s
      S.trail.forEach((p, i) => { const k = (i + 1) / S.trail.length; g.fillStyle = p[2] ? `rgba(224,123,26,${.15 + .6 * k})` : `rgba(46,143,208,${.12 + .55 * k})`; g.beginPath(); g.arc(p[0], p[1], 2.5 + 3 * k, 0, TAU); g.fill(); });
      if (!S.free) { g.strokeStyle = C.ink; g.lineWidth = 2.5; g.beginPath(); g.moveTo(a.x - 8, a.y - 8); g.lineTo(hx, hy); g.stroke(); }
      // the hero: a ball with a facing eye, leaning with the swing
      const sp = S.free ? Math.hypot(S.vx, S.vy) : Math.abs(S.w * S.L), ang = S.free ? Math.atan2(S.vy, S.vx) : S.th + (S.w > 0 ? 0 : PI);
      g.save(); g.translate(hx, hy); g.rotate(S.free ? ang : -S.th);
      const st = clamp(sp / 2400, 0, .35);
      g.scale(1 + st, 1 - st * .6);
      g.fillStyle = C.player; g.strokeStyle = C.navy; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, 14, 0, TAU); g.fill(); g.stroke();
      g.restore();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(hx + (S.free ? Math.sign(S.vx) : Math.sign(S.w || 1)) * 5, hy - 3, 4, 0, TAU); g.fill();
      if (S.held) { g.strokeStyle = 'rgba(224,123,26,.7)'; g.lineWidth = 2; g.setLineDash([4, 4]); g.beginPath(); g.arc(hx, hy, 24, 0, TAU); g.stroke(); g.setLineDash([]); }
      // readouts and the angle trace
      const bx = 690, by = 452, bw = 320, bh = 82;
      g.fillStyle = 'rgba(255,250,240,.92)'; rr(g, bx, by, bw, bh, 8); g.fill(); g.strokeStyle = '#e3d8bf'; g.lineWidth = 1; g.stroke();
      g.strokeStyle = '#e3d8bf'; g.beginPath(); g.moveTo(bx + 6, by + bh / 2 + 6); g.lineTo(bx + bw - 6, by + bh / 2 + 6); g.stroke();
      g.strokeStyle = ACT; g.lineWidth = 2; g.beginPath(); let pen = false;
      S.hist.forEach((th, i) => { if (th == null) { pen = false; return; } const x = bx + 6 + i * (bw - 12) / 150, y = by + bh / 2 + 6 - clamp(th, -1.6, 1.6) * 20; pen ? g.lineTo(x, y) : g.moveTo(x, y); pen = true; }); g.stroke();
      note(g, bx + 10, by + 16, 'swing angle over 5 s', C.muted, 12);
      const per = 2 * PI * Math.sqrt(S.L / P.grav);
      note(g, bx + bw - 10, by + 16, `period ${per.toFixed(2)} s · ${S.free ? 'free flight' : 'on the rope'}`, C.ink, 12, 'right');
      g.restore();
    },
    drawTune(g, S, P) {
      const cw = (W - 32) / 3;
      TUNE.forEach((tu, i) => {
        const x0 = 8 + i * (cw + 8);
        panel(g, x0, 8, cw, H - 16, tu.name, tu.sub, tu.col);
        inner(g, x0 + 8, 40, cw - 16, H - 56, (w, h) => {
          const p = S.T[i], ax = w / 2, ay = 34, L = 150;
          g.fillStyle = C.wall; g.fillRect(ax - 40, 18, 80, 10);
          g.strokeStyle = 'rgba(93,97,140,.25)'; g.lineWidth = 1.5; g.beginPath(); g.arc(ax, ay, L, PI / 2 - 1.5, PI / 2 + 1.5); g.stroke();
          p.trail.forEach((q, j) => { const k = (j + 1) / p.trail.length; g.fillStyle = tu.col; g.globalAlpha = .1 + .5 * k; g.beginPath(); g.arc(ax + L * q[0], ay + L * q[1], 2 + 3 * k, 0, TAU); g.fill(); });
          g.globalAlpha = 1;
          const bx = ax + L * Math.sin(p.th), by = ay + L * Math.cos(p.th);
          g.strokeStyle = C.ink; g.lineWidth = 2.5; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
          g.fillStyle = tu.col; g.strokeStyle = C.navy; g.beginPath(); g.arc(bx, by, 17, 0, TAU); g.fill(); g.stroke();
          // trace
          const ty = 260, th = 150;
          g.fillStyle = 'rgba(239,230,210,.6)'; rr(g, 10, ty, w - 20, th, 8); g.fill();
          g.strokeStyle = '#d9cba8'; g.lineWidth = 1; g.beginPath(); g.moveTo(14, ty + th / 2); g.lineTo(w - 14, ty + th / 2); g.stroke();
          g.strokeStyle = tu.col; g.lineWidth = 2.2; g.beginPath(); p.hist.forEach((v, j) => { const x = 14 + j * (w - 28) / 150, y = ty + th / 2 - clamp(v, -1.9, 1.9) * 38; j ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
          note(g, 16, ty + 16, 'angle over 5 s', C.muted, 12);
          const per = 2 * PI * Math.sqrt(L / tu.g);
          note(g, w / 2, ty + th + 30, `gravity ${tu.g} px/s² · drag ${tu.d}`, C.ink, 13, 'center');
          note(g, w / 2, ty + th + 46, `period ${per.toFixed(2)} s`, C.muted, 13, 'center');
        });
      });
    },
  };

  /* =================================================================================================
     8. SECONDARY ACTION: legs are the action; arms and head support it; the scarf is follow-through.
     ================================================================================================= */
  const SWORD = 1.0, KICK = 1.2;
  const sec = {
    n: 8, name: 'Secondary action', P: { act: 'walk', arms: 1, lag: .5, scarf: true, tint: true },
    ctl: [
      { type: 'seg', key: 'act', label: 'Primary action', opts: [['walk', 'Walk'], ['run', 'Run']] },
      { type: 'rng', key: 'arms', label: 'Arm swing (secondary)', min: 0, max: 1.6, step: .05, fmt: v => `${Math.round(v * 100)}%` },
      { type: 'rng', key: 'lag', label: 'Head settles late by', min: 0, max: 1, step: .05, fmt: v => `${Math.round(v * 90)}°` },
      { type: 'btn', label: '⚔ Swing a sword', act: (S) => { S.sw = 0; } },
      { type: 'btn', label: '🦵 Kick', act: (S) => { S.kk = 0; } },
      { type: 'chk', key: 'scarf', label: 'Scarf (follow-through, not secondary)' },
      { type: 'chk', key: 'tint', label: 'Colour the layers' },
    ],
    say: 'A second motion that <b>supports</b> the main one. The legs walk; the arms counter-swing and the head settles a beat late. It is easy to confuse with follow-through, which is what keeps moving after an action ends, like the scarf.',
    how: () => 'Swing a sword: on the left the whole body plays one clip and the walk stops. On the right the top and bottom halves blend, so the feet keep walking while the torso attacks.',
    src: 'From the deck: in a kick the arms counterbalance the shift in weight, and many games blend the upper and lower body.',
    init() { return { t: 0, ph: 0, phL: 0, sw: -1, kk: -1, scarf: [[], []] }; },
    step(S, P, dt) {
      const run = P.act === 'run', rate = run ? 2.1 : 1.25;
      S.t += dt;
      const stopL = S.sw >= 0 || S.kk >= 0;
      S.ph += TAU * rate * dt; if (!stopL) S.phL += TAU * rate * dt;
      S.v = run ? 330 : 165;
      if (S.sw >= 0) { S.sw += dt; if (S.sw > SWORD) S.sw = -1; }
      if (S.kk >= 0) { S.kk += dt; if (S.kk > KICK) S.kk = -1; }
      S.flL = (S.flL || 0) + (stopL ? 0 : S.v * dt); S.flR = (S.flR || 0) + (S.kk >= 0 ? 0 : S.v * dt);
      // scarf chains: verlet, pinned at the neck, pushed back by the air the walk moves through
      [0, 1].forEach(k => {
        const ch = S.scarf[k], n = S.neck?.[k]; if (!n) return;
        if (!ch.length) for (let i = 0; i < 10; i++) ch.push([n[0] - i * 12, n[1] + i * 2, n[0] - i * 12, n[1] + i * 2]);
        const wind = -(k ? (S.kk >= 0 ? 0 : S.v) : (stopL ? 0 : S.v)) * 1.15;
        ch.forEach((p, i) => {
          if (i === 0) { p[2] = p[0]; p[3] = p[1]; p[0] = n[0]; p[1] = n[1]; return; }
          const vx = (p[0] - p[2]) * .985, vy = (p[1] - p[3]) * .985; p[2] = p[0]; p[3] = p[1];
          p[0] += vx + wind * dt * dt * 6 * (1 + .5 * Math.sin(S.t * 11 - i * .9)); p[1] += vy + (900 + 500 * Math.sin(S.t * 7 - i * .7) * Math.min(1, -wind / 150)) * dt * dt;
        });
        for (let it = 0; it < 4; it++) for (let i = 1; i < ch.length; i++) {
          const a = ch[i - 1], b = ch[i], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, e = (d - 12) / d;
          if (i === 1) { b[0] -= dx * e; b[1] -= dy * e; } else { a[0] += dx * e * .5; a[1] += dy * e * .5; b[0] -= dx * e * .5; b[1] -= dy * e * .5; }
        }
      });
    },
    pose(S, P, right) {
      const run = P.act === 'run', ph = right ? S.ph : S.phL;
      let p = { ...STAND, ...walkLegs(ph, 1, run ? 1 : 0), lean: run ? .22 : .05 };
      const A = right ? P.arms : 0;
      // secondary: arms counter the legs, elbows bend with speed, head settles late
      p.sL = -p.hL * A * .95 + (run ? .35 : 0) * Math.min(1, A); p.sR = -p.hR * A * .95 + (run ? .35 : 0) * Math.min(1, A);
      p.eL = .12 + A * (run ? 1.1 : .35); p.eR = p.eL;
      if (right) { p.head = -Math.sin(2 * ph - P.lag * PI / 2) * .07 * Math.min(1, A + .3); p.lean += Math.sin(2 * ph - .4) * .03 * A; }
      if (!right) { p.sL = .04; p.sR = .02; p.eL = p.eR = .08; }
      // a sword swing: full-body clip on the left, upper body only on the right
      if (S.sw >= 0) {
        const u = S.sw / SWORD;
        const up = keys([[0, { sR: .2, eR: .2, lean: 0 }], [.32, { sR: 2.75, eR: .5, lean: -.12 }], [.46, { sR: .55, eR: .05, lean: .3 }], [.62, { sR: .45, eR: .1, lean: .26 }], [1, { sR: .1, eR: .15, lean: p.lean }]], u, sstep);
        p.sR = up.sR; p.eR = up.eR; p.lean = up.lean;
        if (!right) { Object.assign(p, { hL: .3, kL: .25, hR: -.3, kR: .15, sL: .04, eL: .08 }); }
        else p.sL = lerp(p.sL, -.7, Math.sin(clamp(u / .6) * PI) * .8);
        p._sword = u;
      }
      if (S.kk >= 0) {
        const u = S.kk / KICK;
        const k = keys([[0, { hL: .05, kL: .1, hR: -.05, kR: .1, lean: .05 }], [.28, { hL: -.45, kL: 1.3, hR: .05, kR: .2, lean: .12 }], [.42, { hL: 1.55, kL: .05, hR: -.15, kR: .12, lean: -.28 }], [.6, { hL: 1.45, kL: .1, hR: -.15, kR: .12, lean: -.25 }], [1, { hL: .05, kL: .1, hR: -.05, kR: .1, lean: .05 }]], u, sstep);
        Object.assign(p, { hL: k.hL, kL: k.kL, hR: k.hR, kR: k.kR, lean: k.lean });
        if (right) { const a = keys([[0, { sL: p.sL, sR: p.sR }], [.42, { sL: -1.25, eL: .4, sR: 1.05, eR: 1.3 }], [.6, { sL: -1.15, eL: .4, sR: 1, eR: 1.3 }], [1, { sL: 0, sR: 0 }]], u, sstep); p.sL = a.sL; p.eL = a.eL; p.sR = a.sR; p.eR = a.eR; p.head = keys([[0, {}], [.42, { head: .22 }], [1, {}]], u).head; }
        else { p.sL = .04; p.sR = .02; }
      }
      return p;
    },
    tour(S, P, lt) {
      P.act = lt < 5.6 ? 'walk' : 'run';
      if (lt >= 2.4 && !S.d1) { S.d1 = 1; S.sw = 0; }
      if (lt >= 4.1 && !S.d2) { S.d2 = 1; S.kk = 0; }
    },
    draw(g, S, P) {
      bgAll(g);
      const pw = (W - 24) / 2;
      [0, 1].forEach(k => {
        const x0 = 8 + k * (pw + 8), right = !!k;
        panel(g, x0, 8, pw, H - 16, right ? 'Action + secondary action' : 'Action only', right ? 'upper and lower body blend' : 'one full-body clip', right ? ACT : C.stoneDk);
        inner(g, x0 + 8, 40, pw - 16, H - 56, (w, h) => {
          const gy = h - 112, fl = right ? S.flR : S.flL;
          g.fillStyle = '#f3ead6'; g.fillRect(0, gy, w, h - gy);
          g.strokeStyle = C.floorLn; g.lineWidth = 2; g.beginPath(); g.moveTo(0, gy); g.lineTo(w, gy); g.stroke();
          for (let i = -1; i < 9; i++) { const x = i * 70 - ((fl || 0) % 70); g.fillStyle = '#d9cba8'; g.fillRect(x, gy + 10, 34, 4); g.fillRect(x + 30, gy + 34, 22, 4); }
          const p = this.pose(S, P, right), tint = P.tint;
          const col = tint ? (right ? { legs: ACT, arms: SEC, head: SEC } : { legs: ACT }) : {};
          const pts = rig(g, { ...p, x: w / 2 - 20, gy, s: 1.95, f: 1 }, { col });
          if (!S.neck) S.neck = [];
          S.neck[k] = [pts.neck[0], pts.neck[1] + 4];
          // sword
          if (p._sword != null) {
            const u = p._sword, hx = pts.handR[0], hy = pts.handR[1], ex = pts.elbowR[0], ey = pts.elbowR[1], a = Math.atan2(hy - ey, hx - ex);
            const sx = hx + Math.cos(a) * 92, sy = hy + Math.sin(a) * 92;
            if (u > .33 && u < .55) { g.fillStyle = 'rgba(255,185,81,.45)'; g.beginPath(); g.moveTo(hx, hy); g.arc(hx, hy, 96, a - 1.4, a, false); g.closePath(); g.fill(); }
            g.strokeStyle = C.navy; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(hx, hy); g.lineTo(sx, sy); g.stroke();
            g.strokeStyle = '#e8eef8'; g.lineWidth = 3; g.stroke();
          }
          if (P.scarf && S.scarf[k].length) {
            const ch = S.scarf[k];
            g.strokeStyle = tint ? FOL : '#c0504d'; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
            ch.forEach((q, i) => i ? g.lineTo(q[0] - (x0 + 8), q[1] - 40) : g.moveTo(q[0] - (x0 + 8), q[1] - 40)); g.stroke();
          }
          // legend
          const ly = h - 74;
          if (tint) {
            chip(g, 14, ly, 'Action: legs', ACT);
            if (right) chip(g, 120, ly, 'Secondary: arms, head', SEC);
            if (P.scarf) chip(g, right ? 286 : 120, ly, 'Follow-through: scarf', FOL);
          }
          const msg = S.sw >= 0 ? (right ? 'legs keep walking, torso attacks' : 'walk stops for the attack clip') : S.kk >= 0 ? (right ? 'arms swing out to balance the kick' : 'arms hang through the kick') : (right ? 'arms counter-swing the legs' : 'arms hang still');
          note(g, 14, h - 40, msg, C.ink, 15);
        });
        // the scarf was simulated in canvas space; record where the neck is in that space
        if (S.neck?.[k]) S.neck[k] = [S.neck[k][0] + x0 + 8, S.neck[k][1] + 40];
      });
    },
  };

  /* =================================================================================================
     9. EXAGGERATION: Super Mario Bros. sprites, original frames vs pushed extremes, with slow motion.
     ================================================================================================= */
  const SP = { w1: pic('smb-mario-big-walk1'), w2: pic('smb-mario-big-walk2'), w3: pic('smb-mario-big-walk3'), st: pic('smb-mario-big'), jp: pic('smb-mario-big-jump'), gr: pic('smb-ground') };
  const RUN_T = .36, JUMP_T = 1.25;
  const exa = {
    n: 9, name: 'Exaggeration', P: { act: 'run', amt: 1, speed: 1, onion: true },
    ctl: [
      { type: 'seg', key: 'act', label: 'Action', opts: [['run', 'Run'], ['jump', 'Jump']] },
      { type: 'seg', key: 'speed', label: 'Playback speed', opts: [[1, 'Full'], [.25, '¼ speed'], [.1, '1/10 speed']] },
      { type: 'rng', key: 'amt', label: 'Exaggeration', min: 0, max: 1.6, step: .05, fmt: v => `×${v.toFixed(2)}` },
      { type: 'chk', key: 'onion', label: 'Onion skin the extremes' },
    ],
    say: 'Push the extremes <b>past realistic</b> to sell the action. The extremes are brief, so at full speed you feel them more than you see them. Slow it down, as the deck does with Jak\'s squash and stretch, and they show up.',
    how: () => 'Drag the exaggeration slider, then drop to ¼ or 1/10 speed. The strip under each runner plots squash (down) and stretch (up) over time; the green band is what a real body does.',
    src: 'From the deck: Super Mario Bros. 3\'s run next to a reanimated, exaggerated version. Sprites here are from Super Mario Bros.',
    init() { return { gt: 0, t0: 0 }; },
    step(S, P, dt) { S.gt += dt * P.speed; },
    // squash/stretch, lift and lean at game time t; k = amount (0 = the original frames)
    shape(P, t, k) {
      if (P.act === 'run') {
        const u = (t / RUN_T) % 1, fr = Math.floor(u * 3), u2 = (u * 2) % 1;
        const sy = 1 - .26 * k * Math.exp(-u2 * 16) + .14 * k * Math.sin(PI * clamp((u2 - .18) / .6));
        return { fr: [SP.w1, SP.w2, SP.w3][fr], sy, lift: 16 * k * Math.sin(PI * clamp((u2 - .12) / .76)), lean: .16 * k, contact: u2 };
      }
      const u = (t % (JUMP_T + .5)) / JUMP_T, air = u > .16 && u < .78, a = (u - .16) / .62;
      let sy = 1, fr = SP.st;
      if (u <= .16) sy = 1 - .34 * k * sstep(u / .16);
      else if (air) { sy = 1 + .3 * k * (1 - 2 * a) * (a < .5 ? 1 : .55); fr = SP.jp; }
      else if (u < 1.2) sy = 1 - .4 * k * Math.exp(-(u - .78) * 14) * Math.min(1, (u - .78) * 40);
      return { fr, sy: Math.max(.45, sy), lift: air ? 4 * a * (1 - a) * 170 : 0, lean: 0, contact: air ? .5 : u > .78 ? (u - .78) * 2 : .5, land: u > .78 ? u - .78 : -1 };
    },
    tour(S, P, lt) {
      P.act = lt < 5 ? 'run' : 'jump'; P.speed = lt < 2.2 ? 1 : lt < 5 ? .25 : 1;
      // keep the jump in step with the walk-through clock
      if (lt >= 5 && !S.j) { S.j = 1; S.gt = 0; }
    },
    draw(g, S, P) {
      bgAll(g);
      const pw = (W - 24) / 2;
      [0, 1].forEach(side => {
        const x0 = 8 + side * (pw + 8), k = side ? P.amt : 0;
        panel(g, x0, 8, pw, H - 16, side ? 'Exaggerated' : 'Original frames', side ? `×${P.amt.toFixed(2)}` : 'as drawn', side ? ORANGE : C.stoneDk);
        inner(g, x0 + 8, 40, pw - 16, 360, (w, h) => {
          const sky = '#9cc8ff'; g.fillStyle = sky; g.fillRect(0, 0, w, h);
          const gy = h - 64, scroll = P.act === 'run' ? S.gt * 300 : 0, z = 5;
          g.imageSmoothingEnabled = false;
          if (SP.gr.complete && SP.gr.naturalWidth) for (let x = -((scroll % 80) + 80); x < w + 80; x += 80) for (let y = gy; y < h; y += 80) g.drawImage(SP.gr, x, y, 80, 80);
          else { g.fillStyle = '#c84c0c'; g.fillRect(0, gy, w, h - gy); }
          const sh = this.shape(P, S.gt, k), cx = w / 2 - 20;
          // onion skin: the extreme squash and stretch poses of this action, faded
          if (P.onion && k > 0) {
            const span = P.act === 'run' ? RUN_T : JUMP_T + .5;
            let lo = { sy: 1 }, hi = { sy: 1 };
            for (let i = 0; i < 60; i++) { const s2 = this.shape(P, i / 60 * span, k); if (s2.sy < lo.sy) lo = s2; if (s2.sy > hi.sy) hi = s2; }
            [[lo, -150], [hi, 150]].forEach(([s2, dx]) => { if (Math.abs(s2.sy - 1) < .03) return; g.globalAlpha = .28; this.mario(g, s2, cx + dx, gy, z); g.globalAlpha = 1; note(g, cx + dx + 40, gy - 172 * Math.max(1, s2.sy) - 6, s2.sy < 1 ? 'extreme squash' : 'extreme stretch', C.navy, 12, 'center'); });
          }
          // dust at contacts and on landing
          if (k > .15) {
            const age = P.act === 'run' ? sh.contact * RUN_T / 2 : sh.land >= 0 ? sh.land * JUMP_T : 9;
            if (age < .22) { const r = 10 + age * 160 * k, al = (1 - age / .22) * .6; g.fillStyle = `rgba(255,255,255,${al})`; [-1, 1].forEach(d => { g.beginPath(); g.arc(cx + 40 + d * (24 + age * 120), gy - 6, r * .5, 0, TAU); g.fill(); }); }
            if (P.act === 'run' && k > .5) { g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 3; for (let i = 0; i < 3; i++) { const y = gy - 50 - i * 34, x = cx - 30 - ((S.gt * 900 + i * 47) % 70); g.beginPath(); g.moveTo(x, y); g.lineTo(x - 40 * k, y); g.stroke(); } }
          }
          this.mario(g, sh, cx, gy, z);
          note(g, 12, 22, P.speed === 1 ? 'full speed' : P.speed === .25 ? '¼ speed' : '1/10 speed', '#fff', 14);
        });
        // the squash / stretch strip, a pure function of game time
        inner(g, x0 + 8, 408, pw - 16, H - 424, (w, h) => {
          const mid = h / 2 + 8, sc = 120;
          g.fillStyle = 'rgba(26,138,76,.14)'; g.fillRect(0, mid - .05 * sc, w, .1 * sc);
          note(g, 10, mid + .05 * sc + 16, 'green band: what a real body does', C.good, 12);
          g.strokeStyle = '#e3d8bf'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, mid); g.lineTo(w, mid); g.stroke();
          const span = 1.6;
          g.strokeStyle = side ? ORANGE : C.stoneDk; g.lineWidth = 2.4; g.beginPath();
          for (let i = 0; i <= 160; i++) { const tt = S.gt - span + i / 160 * span, s2 = this.shape(P, Math.max(0, tt), k), x = i / 160 * (w - 10), y = mid - (s2.sy - 1) * sc; i ? g.lineTo(x, y) : g.moveTo(x, y); }
          g.stroke();
          g.fillStyle = side ? ORANGE : C.stoneDk; g.beginPath(); g.arc(w - 10, mid - (this.shape(P, S.gt, k).sy - 1) * sc, 5, 0, TAU); g.fill();
          note(g, 10, 18, 'squash ↓ stretch ↑ over the last 1.6 s of game time', C.muted, 12);
        });
      });
    },
    mario(g, sh, cx, gy, z) {
      const fr = sh.fr; if (!fr.complete || !fr.naturalWidth) return;
      const w = fr.naturalWidth * z, h = fr.naturalHeight * z, sx = 1 / Math.pow(sh.sy, .6);
      g.save(); g.translate(cx + w / 2, gy - sh.lift); g.transform(1, 0, -sh.lean, 1, 0, 0); g.scale(sx, sh.sy);
      g.imageSmoothingEnabled = false; g.drawImage(fr, -w / 2, -h, w, h); g.restore();
    },
  };

  /* =================================================================================================
     10. STAGING: a centred camera vs one that frames the rule of thirds while the hero stands still.
     ================================================================================================= */
  const COL_X = 1780, WORLD = 2600, G_Y = 300;
  const stg = {
    n: 10, name: 'Staging', P: { mode: 'still', delay: .5, grid: true },
    ctl: [
      { type: 'seg', key: 'mode', label: 'Right camera frames the thirds', opts: [['still', 'When standing still'], ['always', 'Always']] },
      { type: 'rng', key: 'delay', label: 'Wait before framing', min: 0, max: 2, step: .1, fmt: v => `${v.toFixed(1)} s`, show: P => P.mode === 'still' },
      { type: 'chk', key: 'grid', label: 'Show the thirds grid' },
      { type: 'btn', label: '◀ Walk left', hold: -1 },
      { type: 'btn', label: 'Walk right ▶', hold: 1 },
    ],
    say: '<b>Where things sit on screen.</b> Most games keep the player near the centre with important things around them. Shadow of the Colossus frames the scene on the rule of thirds when it can, which works best while the hero stands still.',
    how: P => P.mode === 'still' ? 'Walk with ← → (or hold the buttons, or click where to go). Stop, and the right camera eases the hero and the colossus onto the thirds.' : 'Framing always: the camera keeps reframing while you walk, so the ground under the stick keeps shifting. That is why it waits for stillness.',
    src: 'From the deck: Shadow of the Colossus. For camera staging mistakes, see the GDC talk "50 Game Camera Mistakes".',
    init() { return { x: 1100, tx: 1100, v: 0, still: 0, hold: 0, ph: 0, cam: [{ x: 1100, z: 1 }, { x: 1100, z: 1 }] }; },
    step(S, P, dt) {
      S.t = (S.t || 0) + dt;
      let dir = S.hold || (Math.abs(S.tx - S.x) > 4 ? Math.sign(S.tx - S.x) : 0);
      if (S.hold) S.tx = S.x;
      S.v = dir * 170; S.x = clamp(S.x + S.v * dt, 120, COL_X - 160); if (dir) S.f = dir;
      S.still = dir ? 0 : S.still + dt; if (dir) S.ph += dt * TAU * 1.6;
      const VW = 480;
      const frame = () => { const d = COL_X - S.x, z = clamp((VW / 3) / Math.abs(d), .42, 1); return { x: S.x + Math.sign(d) * (VW / z) / 6, z }; };
      const tB = P.mode === 'always' || S.still > P.delay ? frame() : { x: S.x, z: 1 };
      const k = 1 - Math.exp(-dt * (P.mode === 'always' ? 6 : 2.6));
      S.cam[0].x = S.x; S.cam[0].z = 1;
      S.cam[1].x += (tB.x - S.cam[1].x) * k; S.cam[1].z += (tB.z - S.cam[1].z) * k;
    },
    down(S, P, x, y) { if (y > 392) return; const side = x > W / 2 ? 1 : 0, c = S.cam[side], pw = (W - 24) / 2, lx = x - (8 + side * (pw + 8)); S.tx = clamp(c.x + (lx - (pw - 16) / 2) / c.z, 120, COL_X - 160); },
    key(S, P, k, up) { if (k === 'ArrowLeft' || k === 'ArrowRight') { S.hold = up ? 0 : (k === 'ArrowLeft' ? -1 : 1); return true; } },
    tour(S, P, lt) {
      P.mode = lt < 5.2 ? 'still' : 'always';
      S.hold = lt < 1.4 ? 1 : lt > 3.6 && lt < 4.4 ? -1 : lt > 5.4 && lt < 6.8 ? 1 : 0;
    },
    world(g, S, w, h, cam) {
      // world units -> pane: the camera centre sits at the middle, the horizon at 62 % height
      g.save(); g.translate(w / 2, h * .66); g.scale(cam.z, cam.z); g.translate(-cam.x, -G_Y);
      const sky = g.createLinearGradient(0, G_Y - 520, 0, G_Y); sky.addColorStop(0, '#b9cbe0'); sky.addColorStop(1, '#efe3c8');
      g.fillStyle = sky; g.fillRect(-200, G_Y - 900, WORLD + 400, 900);
      g.fillStyle = '#c9c4c4'; g.beginPath(); g.moveTo(-200, G_Y);
      for (let x = -200; x <= WORLD + 200; x += 100) g.lineTo(x, G_Y - 120 - 70 * Math.sin(x * .004) - 40 * Math.sin(x * .011 + 1)); g.lineTo(WORLD + 200, G_Y); g.fill();
      g.fillStyle = '#b8a77f'; g.fillRect(-200, G_Y, WORLD + 400, 400);
      g.strokeStyle = '#a3936b'; g.lineWidth = 2; for (let x = 0; x < WORLD; x += 57) { g.beginPath(); g.moveTo(x, G_Y + 8 + (x * 7) % 30); g.lineTo(x + 10, G_Y + 4 + (x * 7) % 30); g.stroke(); }
      // the colossus: an original stone giant
      const cx = COL_X, by = G_Y, br = Math.sin(S.t * 1.2) * 3;
      g.fillStyle = '#6d6a72'; g.strokeStyle = '#3f3d48'; g.lineWidth = 4;
      [[-60, 0], [45, 0]].forEach(([dx]) => { g.beginPath(); g.roundRect(cx + dx - 26, by - 170, 52, 172, 12); g.fill(); g.stroke(); });
      g.beginPath(); g.ellipse(cx, by - 260 + br, 120, 110, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#7d8b5a'; g.beginPath(); g.ellipse(cx - 10, by - 330 + br, 90, 45, -.1, 0, TAU); g.fill();
      g.fillStyle = '#6d6a72'; g.beginPath(); g.roundRect(cx - 168, by - 300 + br, 54, 190, 20); g.fill(); g.stroke(); g.beginPath(); g.roundRect(cx + 112, by - 300 + br, 54, 190, 20); g.fill(); g.stroke();
      g.beginPath(); g.ellipse(cx - 30, by - 390 + br, 50, 44, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#ffe9a8'; g.shadowColor = '#ffd36b'; g.shadowBlur = 16; g.beginPath(); g.arc(cx - 50, by - 395 + br, 7, 0, TAU); g.arc(cx - 20, by - 395 + br, 7, 0, TAU); g.fill();
      g.beginPath(); g.arc(cx, by - 250 + br, 10, 0, TAU); g.fill(); g.shadowBlur = 0;
      // the hero
      const p = { ...STAND, ...(Math.abs(S.v) > 1 ? walkLegs(S.ph, .9) : {}), lean: Math.abs(S.v) > 1 ? .1 : 0 };
      if (Math.abs(S.v) > 1) { p.sL = -p.hL * .9; p.sR = -p.hR * .9; }
      const pts = rig(g, { ...p, x: S.x, gy: by, s: .42, f: S.f || 1 }, { col: { torso: '#3a6ea5', head: '#e8d3b0', legs: '#5a4636', arms: '#e8d3b0' } });
      g.strokeStyle = '#c0504d'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(pts.neck[0], pts.neck[1] + 3); g.quadraticCurveTo(pts.neck[0] - (S.f || 1) * 14, pts.neck[1] + 14, pts.neck[0] - (S.f || 1) * (12 + Math.abs(S.v) * .08), pts.neck[1] + 26); g.stroke();
      g.restore();
    },
    draw(g, S, P) {
      bgAll(g);
      const pw = (W - 24) / 2, ph = 400;
      [0, 1].forEach(side => {
        const x0 = 8 + side * (pw + 8);
        panel(g, x0, 8, pw, ph, side ? 'Thirds when it can' : 'Always centred', side ? (P.mode === 'still' ? 'frames when still' : 'frames always') : 'player in the middle', side ? ORANGE : C.stoneDk);
        inner(g, x0 + 8, 40, pw - 16, ph - 40, (w, h) => {
          S.t = S.t || 0;
          this.world(g, S, w, h, S.cam[side]);
          if (P.grid) {
            g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.5; g.setLineDash([6, 5]); g.beginPath();
            [1, 2].forEach(i => { g.moveTo(w * i / 3, 0); g.lineTo(w * i / 3, h); g.moveTo(0, h * i / 3); g.lineTo(w, h * i / 3); }); g.stroke(); g.setLineDash([]);
            // power points light up when a subject sits on one
            const c = S.cam[side], sxH = w / 2 + (S.x - c.x) * c.z, sxC = w / 2 + (COL_X - c.x) * c.z;
            [1, 2].forEach(i => [sxH, sxC].forEach(sx => { const d = Math.abs(sx - w * i / 3); if (d < 26) { g.strokeStyle = `rgba(255,185,81,${1 - d / 26})`; g.lineWidth = 3; g.beginPath(); g.moveTo(w * i / 3, 0); g.lineTo(w * i / 3, h); g.stroke(); } }));
          }
          if (side && P.mode === 'still' && S.still > 0 && S.still <= P.delay) note(g, w / 2, 24, 'waiting for stillness…', '#fff', 14, 'center');
          if (Math.abs(S.v) > 1) note(g, 12, h - 12, 'walking', '#fff', 13);
        });
      });
      // minimap of the whole valley with both cameras
      inner(g, 8, ph + 16, W - 16, H - ph - 24, (w, h) => {
        const k = (w - 40) / WORLD, ox = 20, gy = h - 26;
        g.fillStyle = '#b8a77f'; g.fillRect(ox, gy, WORLD * k, 8);
        g.fillStyle = '#6d6a72'; g.beginPath(); g.roundRect(ox + (COL_X - 160) * k, gy - 60, 320 * k, 60, 6); g.fill();
        g.fillStyle = C.player; g.beginPath(); g.arc(ox + S.x * k, gy - 6, 6, 0, TAU); g.fill();
        S.cam.forEach((c, i) => { const vw = 480 / c.z; g.strokeStyle = i ? ORANGE : C.stoneDk; g.lineWidth = 3; g.strokeRect(ox + (c.x - vw / 2) * k, gy - 74 + i * 4, vw * k, 82 - i * 8); });
        note(g, 20, 20, 'The valley, with what each camera sees', C.muted, 13);
        chip(g, w - 20, 16, 'thirds camera', ORANGE, 'right'); chip(g, w - 140, 16, 'centred camera', C.stoneDk, 'right');
      });
    },
  };

  /* =================================================================================================
     11. SOLID DRAWING: a flat cut-out vs a constructed 3D figure, on one turntable (Three.js).
     ================================================================================================= */
  const POSES = {
    stand: { hip: [0, 0, 0], ch: [0, 0, 0], hd: [0, 0, 0], sL: [0, 0, .25], eL: [-.3, 0, 0], sR: [0, 0, -.25], eR: [-.3, 0, 0], tL: [0, 0, .06], kL: [.05, 0, 0], tR: [0, 0, -.06], kR: [.05, 0, 0], y: 0 },
    lunge: { hip: [0, .5, 0], ch: [.25, -.35, 0], hd: [-.15, .2, 0], sL: [-1.45, 0, .2], eL: [-.15, 0, 0], sR: [.7, 0, -.35], eR: [-1.2, 0, 0], tL: [-1.1, 0, .1], kL: [1.35, 0, 0], tR: [.65, 0, -.05], kR: [.25, 0, 0], y: -.22 },
    leap: { hip: [-.2, 0, 0], ch: [-.25, 0, 0], hd: [-.25, 0, 0], sL: [-2.6, 0, .5], eL: [-.4, 0, 0], sR: [-2.4, 0, -.6], eR: [-.6, 0, 0], tL: [-1.4, 0, .15], kL: [2.1, 0, 0], tR: [.2, 0, -.1], kR: [1.4, 0, 0], y: .28 },
  };
  const sol = {
    n: 11, name: 'Solid drawing', P: { pose: 'lunge', lines: true, auto: true },
    ctl: [
      { type: 'seg', key: 'pose', label: 'Pose', opts: [['stand', 'Stand'], ['lunge', 'Lunge'], ['leap', 'Leap']] },
      { type: 'chk', key: 'lines', label: 'Construction lines' },
      { type: 'chk', key: 'auto', label: 'Turntable spins' },
    ],
    say: 'Draw forms with <b>real 3D construction</b>, so the character still makes sense as it turns and moves. A flat drawing can only squash; a constructed form foreshortens, overlaps and keeps its volume.',
    how: () => 'Drag either figure to turn it. Watch the flat one at the side view: it is a sliver, and from behind it is just the front drawing flipped.',
    src: 'From the deck: 3D engines rotate and foreshorten for free, and many 2D artists pose 3D models as reference for dynamic poses.',
    init() { return { yaw: .6, t: 0, cur: JSON.parse(JSON.stringify(POSES.lunge)), drag: null }; },
    step(S, P, dt) {
      S.t += dt; if (P.auto && !S.drag) S.yaw += dt * .9;
      const tgt = POSES[P.pose], k = 1 - Math.exp(-dt * 8);
      for (const key in tgt) { if (key === 'y') S.cur.y = lerp(S.cur.y, tgt.y, k); else for (let i = 0; i < 3; i++) S.cur[key][i] = lerp(S.cur[key][i], tgt[key][i], k); }
    },
    down(S, P, x) { S.drag = { x, yaw: S.yaw }; },
    move(S, P, x) { if (S.drag) S.yaw = S.drag.yaw + (x - S.drag.x) * .012; },
    up(S) { S.drag = null; },
    tour(S, P, lt) { P.auto = true; P.pose = lt < 4.6 ? 'lunge' : 'leap'; },
    three: null,
    build() {
      if (this.three !== null) return this.three;
      if (!window.THREE) return (this.three = false);
      try {
        const TH = window.THREE, cv = document.createElement('canvas');
        const r = new TH.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
        r.setPixelRatio(2); r.setSize(460, 470, false);
        const sc = new TH.Scene(), cam = new TH.PerspectiveCamera(26, 460 / 470, .1, 50);
        cam.position.set(0, 1.35, 6.5); cam.lookAt(0, 1.0, 0);
        sc.add(new TH.HemisphereLight(0xfff6e6, 0x8a7f6a, .75));
        const dl = new TH.DirectionalLight(0xffffff, .85); dl.position.set(2.5, 4, 3.5); sc.add(dl);
        const skin = new TH.MeshStandardMaterial({ color: 0xd9c9a8, roughness: .75 }), acc = new TH.MeshStandardMaterial({ color: 0x2e8fd0, roughness: .6 });
        const lineM = new TH.LineBasicMaterial({ color: 0x152044, transparent: true, opacity: .8 }), lines = [];
        const blob = (sx, sy, sz, m = skin) => {
          const me = new TH.Mesh(new TH.SphereGeometry(1, 28, 18), m); me.scale.set(sx, sy, sz);
          // construction lines: an equator, a meridian and a centre line, like cross-contours on a sketch
          [[1, 0], [0, 1], [0, 2]].forEach(([ax, k]) => {
            const pts = []; for (let i = 0; i <= 48; i++) { const a = i / 48 * TAU, c = Math.cos(a) * 1.015, s2 = Math.sin(a) * 1.015; pts.push(ax ? new TH.Vector3(c, 0, s2) : k === 1 ? new TH.Vector3(0, c, s2) : new TH.Vector3(c, s2, 0)); }
            const ln = new TH.Line(new TH.BufferGeometry().setFromPoints(pts), lineM); me.add(ln); lines.push(ln);
          });
          return me;
        };
        const seg = (len, rad, m = skin) => { const gr = new TH.Group(), b = blob(rad, len / 2, rad, m); b.position.y = -len / 2; gr.add(b); return gr; };
        const root = new TH.Group(); sc.add(root);
        const hips = new TH.Group(); hips.position.y = 1.0; root.add(hips);
        hips.add(blob(.27, .17, .19, acc));
        const chest = new TH.Group(); chest.position.y = .1; hips.add(chest);
        const abd = blob(.22, .2, .17); abd.position.y = .14; chest.add(abd);
        const tor = blob(.34, .27, .22); tor.position.y = .43; chest.add(tor);
        const neckG = new TH.Group(); neckG.position.y = .7; chest.add(neckG);
        const head = blob(.17, .21, .19); head.position.y = .2; neckG.add(head);
        const visor = blob(.13, .05, .06, acc); visor.position.set(0, .23, .15); neckG.add(visor);
        const limb = (parent, x, y, l1, l2, r1, r2, m) => {
          const a = new TH.Group(); a.position.set(x, y, 0); parent.add(a); const up = seg(l1, r1, m); a.add(up);
          const b = new TH.Group(); b.position.y = -l1; a.add(b); b.add(seg(l2, r2, m)); return [a, b];
        };
        const [sL, eL] = limb(chest, .4, .6, .32, .3, .085, .07), [sR, eR] = limb(chest, -.4, .6, .32, .3, .085, .07);
        const [tL, kL] = limb(hips, .15, -.05, .45, .45, .11, .09, skin), [tR, kR] = limb(hips, -.15, -.05, .45, .45, .11, .09, skin);
        [kL, kR].forEach(k => { const f = blob(.08, .05, .15, acc); f.position.set(0, -.47, .07); k.add(f); });
        const sword = new TH.Mesh(new TH.BoxGeometry(.04, .9, .02), new TH.MeshStandardMaterial({ color: 0xe8eef8, metalness: .4, roughness: .3 }));
        sword.position.set(0, -.75, 0); eR.add(sword);
        const sh = new TH.Mesh(new TH.CircleGeometry(.7, 32), new TH.MeshBasicMaterial({ color: 0x152044, transparent: true, opacity: .14 }));
        sh.rotation.x = -PI / 2; sh.position.y = .02; sc.add(sh);
        return (this.three = { r, sc, cam, root, hips, chest, neckG, sL, eL, sR, eR, tL, kL, tR, kR, lines, cv });
      } catch (e) { return (this.three = false); }
    },
    render(T3, S, P, yaw) {
      const c = S.cur, set = (o, a) => o.rotation.set(a[0], a[1], a[2]);
      set(T3.hips, c.hip); set(T3.chest, c.ch); set(T3.neckG, c.hd); set(T3.sL, c.sL); set(T3.eL, c.eL); set(T3.sR, c.sR); set(T3.eR, c.eR);
      set(T3.tL, c.tL); set(T3.kL, c.kL); set(T3.tR, c.tR); set(T3.kR, c.kR);
      T3.hips.position.y = 1 + c.y; T3.root.rotation.y = yaw;
      T3.lines.forEach(l => { l.visible = P.lines; });
      T3.r.render(T3.sc, T3.cam);
    },
    draw(g, S, P) {
      bgAll(g);
      const pw = (W - 24) / 2, T3 = this.build();
      const yawN = ((S.yaw % TAU) + TAU) % TAU, deg = Math.round(yawN * 180 / PI);
      const view = deg < 23 || deg > 337 ? 'front' : deg < 68 ? '¾ view' : deg < 113 ? 'side' : deg < 158 ? '¾ back' : deg < 203 ? 'back' : deg < 248 ? '¾ back' : deg < 293 ? 'side' : '¾ view';
      [0, 1].forEach(side => {
        const x0 = 8 + side * (pw + 8);
        panel(g, x0, 8, pw, H - 16, side ? 'Constructed in 3D' : 'Flat cut-out', side ? 'foreshortens' : 'only squashes', side ? ACT : C.stoneDk);
        inner(g, x0 + 8, 40, pw - 16, H - 56, (w, h) => {
          const dw = 440, dh = 450, dx = (w - dw) / 2, dy = 4;
          // the turntable sits where the 3D ground projects
          let gy = h - 150;
          if (T3) { const v = new THREE.Vector3(0, 0, 0).project(T3.cam); gy = dy + (1 - v.y) / 2 * dh; }
          g.fillStyle = '#f3ead6'; g.beginPath(); g.ellipse(w / 2, gy, 175, 32, 0, 0, TAU); g.fill();
          g.strokeStyle = '#d9cba8'; g.lineWidth = 2; g.stroke();
          const tx = w / 2 + Math.sin(S.yaw) * 175, ty = gy + Math.cos(S.yaw) * 32;
          g.fillStyle = ORANGE; g.beginPath(); g.arc(tx, ty, 7, 0, TAU); g.fill();
          if (!T3) { note(g, w / 2, h / 2, '3D needs WebGL, which this browser has turned off.', C.muted, 15, 'center'); return; }
          if (side === 0) {
            // the flat drawing is the front view, squashed by the turn and flipped from behind
            this.render(T3, S, P, 0);
            const cs = Math.cos(S.yaw);
            g.save(); g.translate(w / 2, 0); g.scale(Math.abs(cs) < .03 ? .03 * Math.sign(cs || 1) : cs, 1); g.drawImage(T3.cv, -dw / 2, dy, dw, dh); g.restore();
            if (cs < 0) note(g, w / 2, h - 26, 'from behind: the front drawing, mirrored', C.redDk, 14, 'center');
            else note(g, w / 2, h - 26, Math.abs(cs) < .35 ? 'side view: a sliver, the volume is gone' : 'a drawing of the front, scaled', C.muted, 14, 'center');
          } else {
            this.render(T3, S, P, S.yaw);
            g.drawImage(T3.cv, dx, dy, dw, dh);
            note(g, w / 2, h - 26, `${deg}° · ${view}: same volume from every angle`, C.ink, 14, 'center');
          }
        });
      });
    },
  };

  /* =================================================================================================
     12. APPEAL: one stock model, different personalities in the motion.
     ================================================================================================= */
  const PERS = {
    stock: { name: 'Stock', tempo: 1, amp: .8, lean: 0, head: 0, arms: .6, elb: .15, bob: 0, ease: k => k, breath: .01, knee: 0 },
    confident: { name: 'Confident', tempo: .95, amp: 1.05, lean: -.08, head: -.12, arms: .9, elb: .25, bob: 0, ease: eBack, breath: .03, knee: 0 },
    timid: { name: 'Timid', tempo: 1.7, amp: .45, lean: .28, head: .38, arms: .15, elb: 1.6, bob: 0, ease: sstep, breath: .02, knee: .2, glance: 1 },
    bouncy: { name: 'Bouncy', tempo: 1.55, amp: 1.1, lean: .02, head: -.05, arms: 1.5, elb: .6, bob: 14, ease: eBack, breath: .05, knee: .1 },
    menacing: { name: 'Menacing', tempo: .6, amp: 1.15, lean: .32, head: -.28, arms: .3, elb: 1.15, bob: 0, ease: eOut, breath: .08, knee: .55 },
  };
  const app = {
    n: 12, name: 'Appeal', P: { pers: 'confident', act: 'walk' },
    ctl: [
      { type: 'seg', key: 'pers', label: 'Personality on the right', opts: [['confident', 'Confident'], ['timid', 'Timid'], ['bouncy', 'Bouncy'], ['menacing', 'Menacing']] },
      { type: 'seg', key: 'act', label: 'Action', opts: [['idle', 'Idle'], ['walk', 'Walk'], ['win', 'Victory']] },
    ],
    say: '<b>Personality in the motion</b>, apart from the design. Both figures are the same stock model; only timing, posture, weight and overshoot change, and the right one still reads as somebody.',
    how: () => 'Pick a personality and an action. Nothing about the model changes: compare the walk tempo, where the head sits, how far the arms swing and whether the poses overshoot.',
    src: 'From the deck: Korone animated with Akuma\'s moves from Tekken 7, still recognisably Akuma, and Zenless Zone Zero giving each character a distinct way to move.',
    init() { return { t: 0, ph: [0, 0], wt: 0 }; },
    step(S, P, dt) {
      S.t += dt; S.wt += dt;
      [PERS.stock, PERS[P.pers]].forEach((q, i) => { S.ph[i] += TAU * q.tempo * 1.2 * dt; });
    },
    onCtl(S, P, key) { if (key === 'act') S.wt = 0; },
    pose(S, P, q, i) {
      const t = S.t;
      let p = { ...STAND, lean: q.lean, head: q.head };
      if (P.act === 'walk') {
        Object.assign(p, walkLegs(S.ph[i], q.amp));
        p.kL += q.knee; p.kR += q.knee; p.lift = q.bob * Math.abs(Math.sin(S.ph[i]));
        p.sL = -p.hL * q.arms + (q === PERS.timid ? .25 : 0); p.sR = -p.hR * q.arms + (q === PERS.timid ? .25 : 0); p.eL = p.eR = q === PERS.timid ? 1.25 : q.elb;
        p.head += q.glance ? (Math.sin(t * 2.3) > .6 ? -.35 : 0) : Math.sin(S.ph[i] * 2) * .03;
        if (q.bob) { const c = Math.abs(Math.cos(S.ph[i])); p.sy = 1 + .06 * (c - .5); p.sx = 1 / p.sy; }
      } else if (P.act === 'idle') {
        const b = Math.sin(t * TAU * (q === PERS.menacing ? .35 : .5)) * q.breath;
        Object.assign(p, { hL: .12 + q.knee * .3, kL: .1 + q.knee, hR: -.12 + q.knee * .3, kR: .1 + q.knee, lean: q.lean + b, sL: .15 + b * 2, sR: .1 - b * 2, eL: q.elb, eR: q.elb });
        if (q === PERS.confident) Object.assign(p, { sL: .55, eL: 2.1, sR: -.5, eR: 2.1, head: -.12 + b });
        if (q === PERS.timid) { p.head = .38 + (Math.sin(t * 1.7) > .4 ? -.3 : 0); p.sL = p.sR = .55; p.eL = p.eR = 1.7; }
        if (q === PERS.bouncy) { const hop = Math.max(0, Math.sin(t * TAU * 1.4)); p.lift = hop * 14; p.sy = 1 + (hop > .1 ? .05 : -.06); p.sx = 1 / p.sy; p.sL = 2.6 + Math.sin(t * 9) * .3; p.sR = -.3; }
      } else {
        const u = (S.wt % 2.2) / 1.6, e = q.ease;
        const k = q === PERS.stock ? [[0, {}], [.4, { sL: 3, eL: 0, sR: 3, eR: 0 }], [.8, { sL: 3, eL: 0, sR: 3, eR: 0 }], [1, {}]]
          : q === PERS.confident ? [[0, {}], [.18, { kL: .5, kR: .5, hL: .3, hR: .1, sL: -.4, eL: 1.6 }], [.42, { lift: 22, sL: 3.05, eL: .5, sR: .3, eR: 1.5, head: -.3, lean: -.12 }], [.85, { sL: 2.9, eL: 1.4, sR: .2, eR: 1.6, head: -.25, lean: -.1 }], [1, { lean: -.08, head: -.12 }]]
          : q === PERS.timid ? [[0, { lean: .28, head: .38 }], [.3, { lean: .2, head: .1, sL: 1.2, eL: 1.8, sR: 1.2, eR: 1.8 }], [.38, { lean: .2, head: .1, sL: 1.15, eL: 1.95, sR: 1.15, eR: 1.95 }], [.46, { lean: .2, head: .1, sL: 1.2, eL: 1.8, sR: 1.2, eR: 1.8 }], [.9, { lean: .3, head: .45, sL: .6, eL: 1.7, sR: .6, eR: 1.7 }], [1, { lean: .28, head: .38 }]]
          : q === PERS.bouncy ? [[0, {}], [.15, { kL: .9, kR: .9, hL: .45, hR: .45, sy: .85, sx: 1.15, sL: -.6, sR: -.6 }], [.4, { lift: 70, sL: 2.8, sR: 2.6, eL: .2, eR: .2, sy: 1.1, sx: .92, kL: .6, kR: 1.1 }], [.62, { kL: .8, kR: .8, hL: .4, hR: .4, sy: .86, sx: 1.12, sL: 2.6, sR: 2.4 }], [.8, { sL: 2.9, sR: 2.9, eL: .1, eR: .1 }], [1, {}]]
          : [[0, { lean: .32, head: -.28, kL: .6, kR: .6, hL: .3, hR: .05 }], [.35, { lean: .45, head: -.35, kL: .8, kR: .8, hL: .35, hR: .1, sL: .2, eL: 2.2, sR: -.3, eR: 1 }], [.7, { lean: .1, head: -.4, kL: .55, kR: .55, hL: .25, hR: .05, sL: 2.6, eL: 2.3, sR: -.2, eR: 1.2 }], [1, { lean: .1, head: -.4, kL: .55, kR: .55, hL: .25, hR: .05, sL: 2.6, eL: 2.3, sR: -.2, eR: 1.2 }]];
        p = keys(k, u, e);
        if (q === PERS.menacing && u > .7) { p.sL += Math.sin(t * 60) * .02; }
      }
      return p;
    },
    tour(S, P, lt) {
      P.act = lt < 4.6 ? 'walk' : 'win';
      P.pers = lt < 1.6 ? 'confident' : lt < 3.1 ? 'timid' : lt < 4.6 ? 'menacing' : 'bouncy';
      if (lt >= 4.6 && !S.w1) { S.w1 = 1; S.wt = 0; }
    },
    draw(g, S, P) {
      bgAll(g);
      const pw = (W - 24) / 2;
      [[PERS.stock, 0], [PERS[P.pers], 1]].forEach(([q, side]) => {
        const x0 = 8 + side * (pw + 8);
        panel(g, x0, 8, pw, H - 16, side ? `${q.name} motion` : 'Stock motion', 'same stock model', side ? ORANGE : C.stoneDk);
        inner(g, x0 + 8, 40, pw - 16, H - 56, (w, h) => {
          const gy = h - 110, walk = P.act === 'walk', fl = walk ? S.ph[side] / TAU * 120 * q.amp : 0;
          g.fillStyle = '#f3ead6'; g.fillRect(0, gy, w, h - gy);
          g.strokeStyle = C.floorLn; g.lineWidth = 2; g.beginPath(); g.moveTo(0, gy); g.lineTo(w, gy); g.stroke();
          for (let i = -1; i < 9; i++) { const x = i * 70 - (fl % 70); g.fillStyle = '#d9cba8'; g.fillRect(x, gy + 12, 34, 4); }
          const p = this.pose(S, P, q, side);
          rig(g, { ...p, x: w / 2 - 6, gy, s: 1.7, f: 1 });
          // the dials that changed, in words
          const rows = [['tempo', q.tempo === 1 ? 'even' : q.tempo > 1.3 ? 'quick' : q.tempo < .8 ? 'slow' : 'steady'], ['posture', q.lean > .2 ? 'hunched forward' : q.lean < -.04 ? 'chest up' : 'neutral'], ['head', q.head > .2 ? 'down' : q.head < -.2 ? 'low and forward' : q.head < -.05 ? 'up' : 'level'], ['overshoot', q.ease === eBack ? 'yes' : 'none']];
          rows.forEach(([k2, v], i) => { note(g, 16 + i * 116, h - 52, k2, C.muted, 12); note(g, 16 + i * 116, h - 32, v, C.ink, 14); });
        });
      });
    },
  };

  /* =================================================================================================
     the slide: tabs, controls built from each lab's spec, the walk-through and __seek
     ================================================================================================= */
  const LABS = [arcs, sec, exa, stg, sol, app];
  const DEF = LABS.map(L => JSON.parse(JSON.stringify(L.P, (k, v) => v)));
  canvasDemo('cards', (s, cv, g) => {
    const st = { i: 0, tour: true, held: false, t: 0, S: null, li: -1, acc: 0, lt: 0 };
    const tabs = $(s, '.pc-tabs'), ctlBox = $(s, '.pc-ctl'), tourBtn = $(s, '.pc-tour');
    tabs.innerHTML = LABS.map((L, i) => `<button class="btn" data-i="${i}"><b>${L.n}</b> ${L.name}</button>`).join('');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); } };
    function open(i, keepTour) {
      st.i = i; const L = LABS[i];
      if (!keepTour) Object.assign(L.P, JSON.parse(JSON.stringify(DEF[i])));
      st.S = L.init(L.P); st.lt = 0; st.acc = 0;
      $$(tabs, 'button').forEach((b, j) => b.classList.toggle('on', j === i));
      $(s, '.pc-h').textContent = `${L.n}. ${L.name}`;
      say($(s, '.pc-out'), L.say); say($(s, '.pc-src'), L.src);
      if (st.built !== i) { build(); st.built = i; }
      sync();
    }
    function build() {
      const L = LABS[st.i];
      ctlBox.innerHTML = L.ctl.map((c, j) => {
        if (c.type === 'seg') return `<div class="pc-c" data-j="${j}"><h4>${c.label}</h4><div class="seg">${c.opts.map(([v, t]) => `<button class="btn" data-v="${v}">${t}</button>`).join('')}</div></div>`;
        if (c.type === 'rng') return `<label class="rng pc-c" data-j="${j}"><span>${c.label}</span><b></b><input type="range" min="${c.min}" max="${c.max}" step="${c.step}"></label>`;
        if (c.type === 'chk') return `<label class="chk pc-c" data-j="${j}"><input type="checkbox">${c.label}</label>`;
        return `<button class="btn pc-c pc-b" data-j="${j}">${c.label}</button>`;
      }).join('');
      $$(ctlBox, '.pc-c').forEach(el => {
        const c = L.ctl[+el.dataset.j];
        if (c.type === 'seg') $$(el, 'button').forEach(b => b.onclick = () => { manual(); const v = b.dataset.v; L.P[c.key] = isNaN(v) ? v : +v; L.onCtl?.(st.S, L.P, c.key); sync(); });
        else if (c.type === 'rng') $(el, 'input').oninput = e => { manual(); L.P[c.key] = +e.target.value; sync(); };
        else if (c.type === 'chk') $(el, 'input').onchange = e => { manual(); L.P[c.key] = e.target.checked; sync(); };
        else if (c.hold) {
          const set = v => { st.S.hold = v; };
          el.onpointerdown = e => { manual(); el.setPointerCapture(e.pointerId); set(c.hold); };
          el.onpointerup = el.onpointercancel = () => set(0);
        } else el.onclick = () => { manual(); c.act(st.S, L.P); };
      });
    }
    function sync() {
      const L = LABS[st.i];
      $$(ctlBox, '.pc-c').forEach(el => {
        const c = L.ctl[+el.dataset.j];
        el.style.display = c.show && !c.show(L.P) ? 'none' : '';
        if (c.type === 'seg') $$(el, 'button').forEach(b => b.classList.toggle('on', String(L.P[c.key]) === b.dataset.v));
        else if (c.type === 'rng') { const inp = $(el, 'input'); inp.value = L.P[c.key]; $(el, 'b').textContent = c.fmt(L.P[c.key]); }
        else if (c.type === 'chk') $(el, 'input').checked = !!L.P[c.key];
      });
      say($(s, '.pc-how'), L.how(L.P));
    }
    $$(tabs, 'button').forEach(b => b.onclick = () => { manual(); open(+b.dataset.i); });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.held = false; tourBtn.classList.add('on'); open(0); };
    // pointer and keys go to the open lab
    const at = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
    cv.addEventListener('pointerdown', e => { const L = LABS[st.i]; if (!L.down) return; manual(); cv.setPointerCapture(e.pointerId); const [x, y] = at(e); L.down(st.S, L.P, x - 8, y - 8); e.preventDefault(); });
    cv.addEventListener('pointermove', e => { const L = LABS[st.i]; const [x, y] = at(e); L.move?.(st.S, L.P, x - 8, y - 8); cv.style.cursor = L.down ? (st.i === 4 ? 'grab' : 'pointer') : ''; });
    const up = () => { const L = LABS[st.i]; L.up?.(st.S, L.P); };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    const onKey = (e, isUp) => {
      if (!s.classList.contains('active')) return;
      const L = LABS[st.i]; if (!L.key) return;
      if (L.key(st.S, L.P, e.key, isUp)) { if (!isUp) manual(); e.preventDefault(); e.stopImmediatePropagation(); }
    };
    addEventListener('keydown', e => onKey(e, false), true); addEventListener('keyup', e => onKey(e, true), true);

    // run the open lab for dt seconds on the fixed clock, with the walk-through script if it is on
    function advance(dt) {
      const L = LABS[st.i];
      st.acc += dt;
      while (st.acc >= DT) {
        st.acc -= DT;
        if (st.tour) L.tour(st.S, L.P, st.lt);
        L.step(st.S, L.P, DT); st.lt += DT;
      }
    }
    const DUR = LABS.length * STEP;
    scenes.cards = {
      seek(t) {
        // replay the walk-through from the start of this principle, so any t gives the same frame
        st.held = true; st.tour = true; tourBtn.classList.add('on');
        const i = Math.floor(t / STEP) % LABS.length, lt = t - Math.floor(t / STEP) * STEP;
        open(i); const L = LABS[i];
        // the scarf needs the neck position, which the first draw records
        L.draw(g, st.S, L.P);
        advance(lt); L.draw(g, st.S, L.P); sync();
      },
      dur: () => DUR,
    };
    open(0);
    let lastSync = 0;
    return dt => {
      if (st.held) return;
      dt = Math.min(Math.max(0, dt), 1 / 20);
      if (st.tour) {
        st.t += dt;
        const i = Math.floor(st.t / STEP) % LABS.length;
        if (st.t >= DUR) { st.t = 0; }
        if (i !== st.i) open(i);
      }
      advance(dt);
      const L = LABS[st.i];
      L.draw(g, st.S, L.P);
      if (st.tour && (lastSync += dt) > .25) { lastSync = 0; sync(); }
    };
  });
})();
