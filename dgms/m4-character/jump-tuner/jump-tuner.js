/* Jump metrics tuner (Module 4, Part 6: "Character Metrics": how far, how fast, how long; gravity; Sonic vs Mario,
   Mega Man, Commander Keen 1 vs 4; "Coyote Time, Celeste").
   Slide 1: a playable side-view runner. Every metric is a control: run speed, time to top speed, jump height, time to
   apex, a flat climb (frames held at launch speed), fall gravity, max fall speed, coyote time, take-off delay, what
   letting go of jump does, and air steering. Launch speed and gravity follow from height, apex time and the flat climb
   (v = h / (t_climb + t_rise / 2), g = v / t_rise), integrated as an exact parabola, so a preset's height and apex
   time come out exactly as listed.
   The seven presets are the real numbers, converted from the per-game models of jump-test-classic
   (atomechllc.github.io/jump-test-classic): smbpedia's SMB1 disassembly, the Sonic Physics Guide, the nesdev Mega Man 2
   thread, TASVideos' Castlevania frame data, Keen 1 measured frame by frame from footage, Keen 4 from the Omnispeak
   source, and Celeste from the released Player.cs. Each preset's full-hold jump was stepped frame by frame in its own
   game's update order and the resulting height, apex time and gravities are what the sliders hold. 1 tile = 16 game
   pixels (8 for Celeste, whose tiles are 8 px). Approximated: Keen 4's walk speed (Keen 1's is used), Celeste's
   half gravity at the apex (folded into one rising gravity), and SMB's speed-indexed table (the running row is used).
   "Fit the level" swaps the open field for fixed gaps and ledges, and each obstacle is rated against the current metrics.
   Slide 2: coyote time. One late press, two lanes: off refuses it, on forgives it. Madeline from Celeste Classic.
   Physics runs at a fixed 60 Hz step. Walk-throughs re-simulate from a fixed start, so __seek is a pure function of time. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp } = TD;
  const W = 1040, H = 585, DT = 1 / 60;

  /* ---------- sprites: the real game frames, shared with jump-test-classic (see img/SOURCES.txt) ---------- */
  // s = the game's tile size in native pixels, so every character is drawn at its true size against the tiles
  const CHARS = {
    mario: { s: 16, left: false, idle: 'mario_idle', jump: 'mario_jump', run: ['mario_run1', 'mario_run2', 'mario_run3'] },
    simon: { s: 16, left: true, idle: 'simon_idle', jump: 'simon_jump', run: ['simon_run1', 'simon_run2', 'simon_run3'] },
    sonic: { s: 16, left: false, idle: 'sonic_idle', run: [1, 2, 3, 4, 5, 6].map(i => 'sonic_walk' + i), fast: [1, 2, 3, 4].map(i => 'sonic_run' + i), ball: [1, 2, 3, 4].map(i => 'sonic_ball' + i) },
    megaman: { s: 16, left: true, idle: 'mm_idle', jump: 'mm_jump', run: ['mm_run1', 'mm_run2', 'mm_run3'] },
    keen: { s: 16, left: false, idle: 'keen_idle', jump: 'keen_jump', fall: 'keen_fall', squat: 'keen_squat', run: [1, 2, 3, 4].map(i => 'keen_walk' + i) },
    keen4: { s: 16, left: false, idle: 'keen4_idle', jump: 'keen4_jump', fall: 'keen4_fall', run: [1, 2, 3, 4].map(i => 'keen4_walk' + i) },
    madeline: { s: 8, left: false, idle: 'celeste_idle', jump: 'celeste_air', run: [1, 2, 3, 4].map(i => 'celeste_run' + i) },
  };
  const IMG = {};
  Object.values(CHARS).forEach(c => [c.idle, c.jump, c.fall, c.squat, ...(c.run || []), ...(c.fast || []), ...(c.ball || [])].forEach(n => {
    if (!n || IMG[n]) return; const i = new Image(); i.src = `img/${n}.png`; IMG[n] = i;
  }));
  function drawChar(g, ck, x, foot, p, tl, runPx = Infinity) {
    const c = CHARS[ck], k = tl / c.s, sp = Math.abs(p.vx);
    let n;
    if (p.charge >= 0) n = c.squat || c.idle;
    else if (!p.ground) n = c.ball ? c.ball[Math.floor(p.air / 3) % 4] : (p.vy > 0 && c.fall) ? c.fall : c.jump;
    else if (sp < 4) n = c.idle;
    else { const list = c.fast && sp > runPx * .7 ? c.fast : c.run; n = list[Math.floor(p.dist / (tl * .42)) % list.length]; }
    const im = IMG[n];
    g.save(); g.translate(Math.round(x), Math.round(foot)); if ((p.face < 0) !== c.left) g.scale(-1, 1);
    if (im && im.complete && im.naturalWidth) { g.imageSmoothingEnabled = false; const w = im.naturalWidth * k, h = im.naturalHeight * k; g.drawImage(im, -w / 2, -h, w, h); }
    else { g.fillStyle = C.red; g.fillRect(-10, -30, 20, 30); }
    g.restore();
  }

  /* ---------- physics ---------- */
  const HW = 10, HH = 30;
  const DEF = { acc: 0, hold: 0, fall: 1, maxFall: 40, coyote: 0, delay: 0, release: 'none', air: true };
  const NOCAP = 40;   // max fall speed at the top of its slider means no cap
  function derive(P0, TL) {
    const P = { ...DEF, ...P0 }, th = P.hold / 60, tr = Math.max(.04, P.apex - th), v0 = P.h / (th + tr / 2), g = v0 / tr;
    return { P, v0: v0 * TL, g: g * TL, gf: g * P.fall * TL, run: P.run * TL, acc: P.acc > 0 ? P.run * TL / P.acc : Infinity,
      maxFall: P.maxFall >= NOCAP ? Infinity : P.maxFall * TL, cap: v0 * TL * 4 / 6.5, gTiles: g };
  }
  const hit = (p, r) => p.x + HW > r.x && p.x - HW < r.x + r.w && p.y > r.y && p.y - HH < r.y + r.h;
  function newPlayer(x) { return { x, y: 0, vx: 0, vy: 0, ground: true, air: 0, jumped: false, cut: false, face: 1, blocked: 0, lastGroundX: x, takeoff: null, trail: [], trails: [], charge: -1, holdT: 0, dist: 0 }; }
  // one vertical step of the airborne model: the flat climb while held, else an exact parabola under rising or falling gravity
  function fly(s, D, held) {
    if (s.holdT > 0 && s.vy < 0 && held) { s.holdT--; return s.vy * DT; }
    s.holdT = 0;
    const a = s.vy < 0 ? (D.P.release === 'gravity' && s.jumped && !held ? D.gf : D.g) : D.gf, dy = s.vy * DT + .5 * a * DT * DT;
    s.vy = Math.min(s.vy + a * DT, D.maxFall);
    return dy;
  }
  // one 60 Hz step. inp: { dir: -1..1, j: held, jp: pressed this step }. Returns 'jump' | 'coyote' | 'refused' | null for a press.
  function step(p, _P, D, rects, inp) {
    const P = D.P; let ev = null;
    if (p.charge >= 0) p.vx = 0;   // a take-off delay plants the character in place
    else if (p.ground || P.air) { const a = D.acc * DT; p.vx += clamp(inp.dir * D.run - p.vx, -a, a); }
    if (inp.dir && (p.ground || P.air)) p.face = inp.dir;
    const launch = k => { p.vy = -D.v0 * k; p.jumped = true; p.cut = false; p.ground = false; p.holdT = P.hold; p.charge = -1; p.takeoff = { x: p.x, y: p.y, face: p.face }; p.trail = []; };
    if (inp.jp && p.charge < 0) {
      if (p.ground || (p.air <= P.coyote && !p.jumped)) {
        ev = p.ground ? 'jump' : 'coyote';
        if (P.delay > 0 && p.ground) { p.charge = 0; p.vx = 0; } else launch(1);
      } else ev = 'refused';
    }
    if (p.charge >= 0) {
      p.charge++;
      if (p.charge >= P.delay) launch(1);
      else if (!inp.j && P.release === 'charge') launch(p.charge / P.delay);   // Keen 1: speed builds over the squat
    }
    // letting go of jump while rising
    if (p.jumped && !inp.j && p.vy < 0) {
      p.holdT = 0;
      if (P.release === 'cap' && p.vy < -D.cap) p.vy = -D.cap;
      else if (P.release === 'stop' && !p.cut) { p.vy = 0; p.cut = true; }
    }
    // x
    p.x += p.vx * DT; p.blocked = 0;
    for (const r of rects) if (hit(p, r)) { if (p.vx > 0) p.x = r.x - HW; else if (p.vx < 0) p.x = r.x + r.w + HW; p.blocked = Math.sign(p.vx) || 1; p.vx = 0; }
    // y
    const was = p.ground; p.ground = false; p.y += fly(p, D, inp.j);
    for (const r of rects) if (hit(p, r)) { if (p.vy > 0) { p.y = r.y; p.ground = true; } else p.y = r.y + r.h + HH; p.vy = 0; p.holdT = 0; }
    if (p.ground) { p.air = 0; p.jumped = false; p.cut = false; p.lastGroundX = p.x; p.dist += Math.abs(p.vx) * DT; if (!was && p.trail.length) { p.trails = [p.trail, ...p.trails].slice(0, 2); p.trail = []; } }
    else { p.air++; if (p.jumped) p.trail.push([p.x, p.y]); }
    return ev;
  }
  // a full-press arc from (0, 0) at full run, no collisions: points, airtime and reach back at the take-off height
  function arc(P, TL) {
    const D = derive(P, TL), s = { vy: -D.v0, holdT: D.P.hold, jumped: true }, pts = [[0, 0]];
    let x = 0, y = 0, t = 0;
    while (t < 4) { y += fly(s, D, true); x += D.run * DT; t += DT; if (y >= 0) { pts.push([x, 0]); break; } pts.push([x, y]); }
    return { pts, air: t, reach: x / TL };
  }

  /* ---------- presets: real numbers, in tiles, seconds and 60 Hz frames ---------- */
  // h, apex: the full-hold jump stepped frame by frame in the game's own update order. fall: falling ÷ rising gravity.
  const PRESETS = {
    cv: { name: 'Castlevania', char: 'simon', run: 3.75, acc: 0, h: 2.62, apex: .33, hold: 0, fall: 1, maxFall: 30, coyote: 0, delay: 0, release: 'none', air: false, col: '#9a5b2a',
      src: 'TASVideos frame data: walk 1 px/frame, jump 4.0, gravity 0.2, a 40-frame jump' },
    smb: { name: 'Super Mario Bros.', char: 'mario', run: 9.38, acc: .73, h: 5.16, apex: .53, hold: 0, fall: 3.6, maxFall: 16.9, coyote: 0, delay: 0, release: 'gravity', air: true, col: '#e5322d',
      src: 'smbpedia disassembly, running row: jump 5.0, gravity 0x28 held, 0x90 released' },
    sonic: { name: 'Sonic the Hedgehog', char: 'sonic', run: 22.5, acc: 2.13, h: 6.24, apex: .5, hold: 0, fall: 1, maxFall: 40, coyote: 0, delay: 0, release: 'cap', air: true, col: '#2f56c9',
      src: 'Sonic Physics Guide: jump 6.5, gravity 0.21875, top speed 6, accel 0.046875' },
    mm: { name: 'Mega Man 2', char: 'megaman', run: 4.86, acc: 0, h: 3.12, apex: .33, hold: 0, fall: 1, maxFall: 26.3, coyote: 0, delay: 0, release: 'stop', air: true, col: '#1d9bd6',
      src: 'nesdev disassembly: jump 0x04.DF, gravity 0x00.40, walk 0x01.4C' },
    keen1: { name: 'Commander Keen 1', char: 'keen', run: 6.75, acc: 0, h: 4.03, apex: .47, hold: 0, fall: 1, maxFall: 19.1, coyote: 0, delay: 16, release: 'charge', air: true, col: '#2fae63',
      src: 'Measured from footage: a 16-frame squat, a 4.1-tile jump, gravity 0.17' },
    keen4: { name: 'Commander Keen 4', char: 'keen4', run: 6.75, acc: 0, h: 4.39, apex: .55, hold: 15, fall: 1, maxFall: 19.1, coyote: 0, delay: 0, release: 'stop', air: true, col: '#8a4fd6',
      src: 'Omnispeak source: a 15-frame flat climb at 2.9 px/frame, gravity 0.17' },
    celeste: { name: 'Celeste', char: 'madeline', run: 11.25, acc: .09, h: 3.56, apex: .35, hold: 12, fall: 1.3, maxFall: 20, coyote: 6, delay: 0, release: 'timer', air: true, col: '#d94a64',
      src: 'Player.cs: JumpSpeed 105, VarJumpTime 0.2 s, Gravity 900, JumpGraceTime 0.1 s' },
  };
  const PKEYS = Object.keys(PRESETS);
  const MKEYS = ['run', 'acc', 'h', 'apex', 'hold', 'fall', 'maxFall', 'coyote', 'delay', 'release', 'air'];
  const RELEASE = {
    none: 'nothing: the arc is committed',
    gravity: 'gravity switches to the falling value',
    cap: 'upward speed is capped',
    stop: 'upward speed drops to zero',
    timer: 'the flat climb ends early',
    charge: 'the squat launches early, weaker',
  };

  /* ---------- levels (tiles; ground top at 0, heights up) ---------- */
  const TL = 26, GY = 470;
  const block = (x0, x1, top, bottom = -8) => ({ x: x0 * TL, y: -top * TL, w: (x1 - x0) * TL, h: (top - bottom) * TL });
  const LEVELS = {
    fit: {
      w: 40, flag: 38.5,
      rects: [block(0, 5, 0), block(9, 23, 0), block(28, 40, 0), block(12, 17, 3, 0), block(32, 36, 3.5, 0)],
      obs: [
        { id: 'A', kind: 'gap', x0: 5, x1: 9, need: 4, label: '4-tile gap' },
        { id: 'B', kind: 'ledge', x0: 12, x1: 17, top: 3, need: 3.05, label: '3-tile ledge' },
        { id: 'C', kind: 'gap', x0: 23, x1: 28, need: 5, label: '5-tile gap' },
        { id: 'E', kind: 'ledge', x0: 32, x1: 36, top: 3.5, need: 3.55, label: '3.5-tile ledge' },
      ],
    },
    open: {
      w: 128, flag: null,
      rects: [block(0, 30, 0), block(33, 70, 0), block(74, 128, 0),
        block(12, 14, 2, 0), block(20, 22, 3, 0), block(42, 44, 4, 0), block(60, 62, 3, 0),
        block(24, 28, 4, 3), block(48, 54, 5, 4),
        block(84, 85, 1, 0), block(85, 86, 2, 0), block(86, 87, 3, 0), block(87, 88, 4, 0), block(92, 93, 4, 0), block(93, 94, 3, 0), block(94, 95, 2, 0), block(95, 96, 1, 0),
        block(104, 110, 4, 3)],
      obs: [],
    },
  };
  const rate = (P, ob) => {
    const have = ob.kind === 'gap' ? arc(P, TL).reach : P.h, k = have / ob.need;
    return { have, k, verdict: k < 1 ? 'impossible' : k >= 1.6 ? 'too loose' : 'fits' };
  };
  const VCOL = { impossible: C.red, 'too loose': '#c98a0a', fits: '#1a8a4c' };

  /* ---------- drawing ---------- */
  function sky(g) {
    g.clearRect(0, 0, W, H);
    g.save(); g.beginPath(); g.roundRect(0, 0, W, H, 14); g.clip();
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#8fd0ff'); gr.addColorStop(1, '#d9f0ff'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  function drawRects(g, rects, cam, oy, tl) {
    for (const r of rects) {
      const x = r.x - cam, y = oy + r.y; if (x > W || x + r.w < 0) continue;
      g.fillStyle = '#c0682e'; g.fillRect(x, y, r.w, r.h);
      g.strokeStyle = 'rgba(90,40,10,.45)'; g.lineWidth = 1.5; g.beginPath();
      for (let yy = y + tl; yy < y + r.h; yy += tl) { g.moveTo(x, yy); g.lineTo(x + r.w, yy); }
      for (let xx = x + tl; xx < x + r.w; xx += tl) { g.moveTo(xx, y); g.lineTo(xx, Math.min(y + r.h, H)); }
      g.stroke();
      g.fillStyle = '#7bc24a'; g.fillRect(x, y, r.w, 5); g.fillStyle = '#e6a768'; g.fillRect(x, y + 5, r.w, 2);
    }
  }
  function flag(g, x, oy) {
    g.fillStyle = '#5d618c'; g.fillRect(x - 2, oy - 7 * TL, 4, 7 * TL);
    g.fillStyle = '#2fae63'; g.beginPath(); g.moveTo(x + 2, oy - 7 * TL + 4); g.lineTo(x + 40, oy - 7 * TL + 18); g.lineTo(x + 2, oy - 7 * TL + 32); g.fill();
    g.fillStyle = C.gold; g.beginPath(); g.arc(x, oy - 7 * TL, 6, 0, Math.PI * 2); g.fill();
  }
  function drawArc(g, pts, ox, oy, face, col, dashed, w = 3, a = 1) {
    g.save(); g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; if (dashed) g.setLineDash([7, 7]);
    g.beginPath(); pts.forEach(([x, y], i) => { const X = ox + x * face, Y = oy + y; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.stroke(); g.restore();
  }
  function panel(g, x, y, w, h) { g.fillStyle = 'rgba(255,252,244,.93)'; g.beginPath(); g.roundRect(x, y, w, h, 10); g.fill(); g.strokeStyle = 'rgba(38,44,106,.25)'; g.lineWidth = 1.5; g.stroke(); }
  function txt(g, s, x, y, font, col, align = 'left') { g.font = font; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(s, x, y); }
  const f1 = v => v.toFixed(1), f2 = v => v.toFixed(2);

  function drawTuner(g, st) {
    const L = LEVELS[st.level], p = st.p, P = st.P, cam = st.cam, D = derive(P, 1);
    T.use(g); sky(g);
    // clouds
    g.fillStyle = 'rgba(255,255,255,.8)';
    for (let i = 0; i < 6; i++) { const cx = ((i * 337 + 80) - cam * .3) % (W + 200); const x = cx < -100 ? cx + W + 200 : cx; g.beginPath(); g.ellipse(x, 230 + (i % 3) * 30, 46, 16, 0, 0, Math.PI * 2); g.ellipse(x + 30, 222 + (i % 3) * 30, 30, 14, 0, 0, Math.PI * 2); g.fill(); }
    drawRects(g, L.rects, cam, GY, TL);
    if (L.flag) flag(g, L.flag * TL - cam, GY);
    // obstacle verdicts
    if (st.level === 'fit') L.obs.forEach(ob => {
      const v = rate(P, ob), cx = (ob.x0 + ob.x1) / 2 * TL - cam, cy = GY - (ob.kind === 'ledge' ? ob.top * TL : 0) - 62;
      T.label(ob.label, cx, cy - 26, 'center', C.muted, 13);
      T.label(v.verdict, cx, cy, 'center', '#fff', 15, VCOL[v.verdict]);
      const res = st.res && st.res[ob.id];
      if (res) T.stamp(res === 'cleared' ? 'cleared' : 'missed', cx, cy + 38, res === 'cleared' ? '#1a8a4c' : C.red, .9, 16);
    });
    // arcs: the presets as ghosts, the current metrics solid, from the character's feet (or the last take-off)
    const o = p.ground ? { x: p.x, y: p.y, face: p.face } : (p.takeoff || { x: p.x, y: p.y, face: p.face });
    if (st.arcs) PKEYS.forEach(k => { if (st.preset === k) return; const a = arc(PRESETS[k], TL); drawArc(g, a.pts, o.x - cam, GY + o.y, o.face, PRESETS[k].col, true, 3, .5); });
    const me = arc(P, TL);
    drawArc(g, me.pts, o.x - cam, GY + o.y, o.face, st.preset ? PRESETS[st.preset].col : C.gold, false, 4, .9);
    // the character's own trails
    p.trails.forEach((tr, i) => T.trail(tr.map(([x, y]) => [x - cam, GY + y - 14]), C.navy, .35 - i * .12, 3));
    if (p.trail.length) T.trail(p.trail.map(([x, y]) => [x - cam, GY + y - 14]), C.navy, .6, 3);
    drawChar(g, st.char, p.x - cam, GY + p.y, p, TL, P.run * TL);
    if (p.charge >= 0) T.label(P.release === 'charge' ? `squat ${p.charge}/${P.delay}` : `wind-up ${p.charge}/${P.delay}`, p.x - cam, GY + p.y - 70, 'center', C.ink, 13);
    // HUD
    const pr = st.preset && PRESETS[st.preset];
    panel(g, 14, 14, 500, pr ? 160 : 142);
    txt(g, pr ? pr.name : 'Your metrics', 28, 38, '800 17px Montserrat, Jost, sans-serif', C.ink);
    txt(g, `Run ${f1(P.run)} tiles/s, ${P.acc ? `top speed after ${f2(P.acc)} s` : 'top speed at once'}${P.air ? '' : ', no steering in the air'}`, 28, 60, '600 14px Jost, sans-serif', C.ink);
    txt(g, `Jump ${f1(P.h)} tiles, apex after ${f2(P.apex)} s${P.hold ? ` (${P.hold}-frame flat climb)` : ''}, airtime ${f2(me.air)} s`, 28, 80, '600 14px Jost, sans-serif', C.ink);
    txt(g, `Reach at full run ${f1(me.reach)} tiles. Gravity ${D.gTiles.toFixed(0)} tiles/s² rising, ${(D.gTiles * P.fall).toFixed(0)} falling`, 28, 100, '600 14px Jost, sans-serif', C.ink);
    txt(g, `Max fall ${P.maxFall >= NOCAP ? 'uncapped' : f1(P.maxFall) + ' tiles/s'}; coyote time ${P.coyote} frames; take-off delay ${P.delay} frames`, 28, 120, '600 13px Jost, sans-serif', C.muted);
    txt(g, `Letting go of jump: ${RELEASE[P.release]}`, 28, 138, '600 13px Jost, sans-serif', C.muted);
    if (pr) txt(g, pr.src, 28, 158, 'italic 500 13px Jost, sans-serif', C.muted);
    if (st.arcs) {
      panel(g, 774, 14, 252, 192);
      PKEYS.forEach((k, i) => { g.fillStyle = PRESETS[k].col; g.fillRect(788, 28 + i * 20, 22, 5); txt(g, PRESETS[k].name, 818, 35 + i * 20, `${st.preset === k ? 800 : 600} 13px Jost, sans-serif`, st.preset === k ? C.ink : C.muted); });
      txt(g, 'Real numbers: disassembly, source', 788, 180, '600 12px Jost, sans-serif', C.muted);
      txt(g, 'code, frame-by-frame footage.', 788, 196, '600 12px Jost, sans-serif', C.muted);
    }
    if (st.banner) T.stamp(st.banner, W / 2 + 120, 250, '#1a8a4c', 1, 26);
    g.restore();
  }

  /* ---------- the bot that drives the walk-through ---------- */
  // seconds from take-off until the full-press arc first reaches `need` tiles up
  function riseTime(P, need) { const a = arc(P, TL), i = a.pts.findIndex(([, y]) => y <= -need * TL); return i < 0 ? null : i * DT; }
  // sim a run of the fit level with metrics P for n steps; returns the state
  function botRun(P, n) {
    const D = derive(P, TL), rects = LEVELS.fit.rects, p = newPlayer(2 * TL), used = new Set(), res = {};
    const rise = Object.fromEntries(LEVELS.fit.obs.filter(o => o.kind === 'ledge').map(o => [o.id, riseTime(P, o.need)]));
    let hold = null, stuck = 0, done = -1;
    for (let i = 0; i < n; i++) {
      if (done >= 0) { step(p, P, D, rects, { dir: 0, j: false, jp: false }); for (const ob of LEVELS.fit.obs) if (!res[ob.id]) res[ob.id] = 'cleared'; continue; }
      let jp = false;
      // walking off a ledge at speed can drop the runner into the next gap: then it takes a running jump off its end
      const on = LEVELS.fit.obs.find(o => o.kind === 'ledge' && p.ground && p.y < -1 && p.x >= o.x1 * TL - 3 - (D.P.delay ? D.run * D.P.delay * DT : 0) && p.x <= o.x1 * TL + HW);
      if (on && !used.has('edge' + on.id)) {
        used.add('edge' + on.id);
        const xl = on.x1 * TL + D.run * Math.sqrt(2 * on.top * TL / D.gf), gap = LEVELS.fit.obs.find(o => o.kind === 'gap' && xl > o.x0 * TL - HW && xl < o.x1 * TL + HW);
        if (gap) { jp = true; hold = gap; used.add(gap.id); }
      }
      // each obstacle's take-off point: the gap's edge, or the run-up the ledge's rise needs at the speed the jump will carry
      const spd = D.P.delay ? D.run : Math.abs(p.vx);
      for (const ob of LEVELS.fit.obs) {
        if (used.has(ob.id) || !p.ground || jp) continue;
        const tx = ob.kind === 'gap' ? ob.x0 * TL - 2 : ob.x0 * TL - HW - spd * (rise[ob.id] ?? 0) - 6;
        if (p.x >= tx && p.x < ob.x1 * TL) {
          used.add(ob.id);
          if (ob.kind === 'ledge' && p.y < -ob.top * TL + 1) continue;   // already up there
          jp = true; hold = ob;
        }
      }
      // like a player, let go of jump once the obstacle is beaten (variable jump height)
      if (hold && p.charge < 0 && !jp && (p.vy > 0 || (hold.kind === 'gap' ? p.x > hold.x1 * TL + HW : p.y < -(hold.top + .3) * TL))) hold = null;
      step(p, P, D, rects, { dir: 1, j: !!hold || jp, jp });
      // a ledge too tall: the runner stands against it, then is lifted on top so the run can go on
      if (p.ground && p.blocked > 0) { if (++stuck > 24) { const ob = LEVELS.fit.obs.find(o => o.kind === 'ledge' && Math.abs(o.x0 * TL - HW - p.x) < 4); if (ob) { res[ob.id] = res[ob.id] || 'missed'; p.x = ob.x0 * TL + HW + 4; p.y = -ob.top * TL; } stuck = 0; } } else stuck = 0;
      // a gap too wide: the runner falls in and comes back on the far side
      if (p.y > 140) { const ob = LEVELS.fit.obs.find(o => o.kind === 'gap' && p.x > o.x0 * TL - HW && p.x < o.x1 * TL + 2 * TL); if (ob) { res[ob.id] = 'missed'; p.x = ob.x1 * TL + HW + 4; } p.y = 0; p.vy = 0; p.vx = D.run * .6; p.trail = []; p.ground = true; }
      for (const ob of LEVELS.fit.obs) if (!res[ob.id] && p.ground && p.x > ob.x1 * TL + HW) res[ob.id] = 'cleared';
      if (p.x >= LEVELS.fit.flag * TL && done < 0) done = i;
    }
    return { p, res, done };
  }

  const scenes = {};
  /* ---------- slide 1: the tuner ---------- */
  // each preset's walk-through lasts until its runner reaches the flag, plus a beat to read the result
  const SEGS = PKEYS.map(k => { const r = botRun(PRESETS[k], 60 * 20); return Math.min(16, (r.done < 0 ? 900 : r.done) / 60 + .6 + 1.6); });
  const SEG0 = SEGS.reduce((a, s, i) => (a.push(a[i] + s), a), [0]), TOUR_DUR = SEG0[PKEYS.length];
  canvasDemo('tuner', (s, cv, g) => {
    const st = { P: { ...PRESETS.cv }, preset: 'cv', char: 'simon', level: 'fit', arcs: true, p: newPlayer(2 * TL), cam: 0, res: {}, banner: '', tour: true, held: false, t: 0, key: '', clock: 0 };
    const keys = { l: 0, r: 0, j: 0, jp: 0 };
    const NUM = ['run', 'acc', 'h', 'apex', 'hold', 'fall', 'maxFall', 'coyote', 'delay'];
    const sl = Object.fromEntries(NUM.map(k => [k, $(s, '.jt-' + k)])), vl = Object.fromEntries(NUM.map(k => [k, $(s, '.jt-v-' + k)]));
    const fmt = { run: v => `${f1(v)} tiles/s`, acc: v => v ? `${f2(v)} s` : 'instant', h: v => `${f2(v)} tiles`, apex: v => `${f2(v)} s`, hold: v => v ? `${v} frames` : 'none',
      fall: v => `×${f1(v)}`, maxFall: v => v >= NOCAP ? 'no cap' : `${f1(v)} tiles/s`, coyote: v => `${v} frames`, delay: v => v ? `${v} frames` : 'none' };
    const relSel = $(s, '.jt-release'), airBox = $(s, '.jt-air');
    const tourBtn = $(s, '.jt-tour'), playBtn = $(s, '.jt-play'), fitBox = $(s, '.jt-fit'), arcBox = $(s, '.jt-arcs');
    const presetBtns = $$(s, '.jt-presets .btn');
    const restart = () => { st.p = newPlayer(2 * TL); st.res = {}; st.banner = ''; st.won = 0; };
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); playBtn.classList.add('on'); restart(); } };
    const syncUI = () => {
      NUM.forEach(k => { sl[k].value = st.P[k]; vl[k].textContent = fmt[k](+st.P[k]); });
      relSel.value = st.P.release; airBox.checked = st.P.air;
      presetBtns.forEach(b => b.classList.toggle('on', b.dataset.p === st.preset));
      fitBox.checked = st.level === 'fit'; arcBox.checked = st.arcs;
    };
    const edited = () => { manual(); st.preset = PKEYS.find(pk => MKEYS.every(q => typeof st.P[q] === 'number' ? Math.abs(PRESETS[pk][q] - st.P[q]) < 1e-6 : PRESETS[pk][q] === st.P[q])) || null; syncUI(); };
    NUM.forEach(k => sl[k].oninput = () => { st.P[k] = +sl[k].value; edited(); });
    relSel.onchange = () => { st.P.release = relSel.value; edited(); };
    airBox.onchange = () => { st.P.air = airBox.checked; edited(); };
    presetBtns.forEach(b => b.onclick = () => { manual(); st.preset = b.dataset.p; st.P = { ...PRESETS[st.preset] }; st.char = st.P.char; syncUI(); restart(); });
    fitBox.onchange = () => { manual(); st.level = fitBox.checked ? 'fit' : 'open'; restart(); };
    arcBox.onchange = () => { st.arcs = arcBox.checked; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.level = 'fit'; tourBtn.classList.add('on'); playBtn.classList.remove('on'); };
    playBtn.onclick = () => { manual(); restart(); cv.focus(); };
    const KM = { arrowleft: 'l', a: 'l', arrowright: 'r', d: 'r', ' ': 'j', w: 'j', arrowup: 'j' };
    const onKey = down => e => {
      if (!s.classList.contains('active') || e.target.closest?.('textarea')) return;
      const k = KM[e.key.toLowerCase()]; if (!k) return;
      if (e.target.matches?.('input[type=range], select') && e.key.startsWith('Arrow')) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (down && st.tour) manual();
      if (k === 'j' && down && !keys.j) keys.jp = 1;
      keys[k] = down ? 1 : 0;
    };
    addEventListener('keydown', onKey(true), true); addEventListener('keyup', onKey(false), true);

    function tourAt(t) {
      let i = 0; while (i < PKEYS.length - 1 && t >= SEG0[i + 1]) i++;
      const f = t - SEG0[i], k = PKEYS[i];
      st.preset = k; st.P = { ...PRESETS[k] }; st.char = st.P.char; st.level = 'fit';
      const r = botRun(st.P, Math.max(0, Math.floor((f - .6) * 60)));
      st.p = r.p; st.res = r.res; st.cam = 0;
      st.banner = r.done >= 0 && Object.values(r.res).every(v => v === 'cleared') && Object.keys(r.res).length === 4 ? 'Level cleared' : r.done >= 0 ? 'Reached the flag' : '';
    }
    function playStep() {
      const L = LEVELS[st.level], D = derive(st.P, TL);
      const dir = keys.r - keys.l;
      step(st.p, st.P, D, L.rects, { dir, j: !!keys.j, jp: !!keys.jp }); keys.jp = 0;
      const p = st.p;
      if (p.y > 160) { p.x = p.lastGroundX - p.face * 4; p.y = 0; p.vx = 0; p.vy = 0; p.trail = []; p.ground = true; p.charge = -1; const ob = L.obs.find(o => o.kind === 'gap' && p.x > o.x0 * TL - 2 * TL && p.x < o.x1 * TL); if (ob) st.res[ob.id] = 'missed'; }
      for (const ob of L.obs) if (st.res[ob.id] !== 'cleared' && p.ground && p.x > ob.x1 * TL + HW) st.res[ob.id] = 'cleared';
      if (st.level === 'open' && p.x > (L.w - 2) * TL) { p.x = 2 * TL; p.lastGroundX = p.x; }
      if (st.level === 'fit' && L.flag && p.x >= L.flag * TL && !st.won) { st.won = st.clock; st.banner = 'Flag reached'; }
      if (st.won && st.clock - st.won > 1.6) restart();
      p.x = clamp(p.x, HW, L.w * TL - HW);
      st.cam = clamp(p.x - 360, 0, L.w * TL - W);
    }
    function info() {
      const key = [st.preset, st.level, ...MKEYS.map(k => st.P[k])].join('|');
      if (key === st.key) return; st.key = key; syncUI();
      let html;
      if (st.level === 'fit') {
        const v = LEVELS.fit.obs.map(ob => rate(st.P, ob).verdict), n = k => v.filter(x => x === k).length;
        html = n('impossible') ? `<b>${n('impossible')} of 4 jumps are impossible</b> with these metrics. “You could either run faster, or have smaller rooms! You could jump higher, or make obstacles lower.”`
          : n('too loose') ? `<b>${n('too loose')} of 4 obstacles are too loose:</b> the level asks nothing of these metrics. Every space must be built in harmony with the controls.`
          : '<b>Every obstacle fits these metrics.</b> Each jump asks for a committed run-up, and none of them is free.';
      } else html = 'Changing gravity “completely transforms the feel of jumping”. Compare the heavy fall of Super Mario Bros. with the float of Commander Keen 4’s flat climb.';
      say($(s, '.jt-out'), html);
    }
    syncUI();
    scenes.tuner = { seek(t) { st.held = true; st.arcs = true; tourAt(t); drawTuner(g, st); info(); }, dur: () => TOUR_DUR };
    let acc = 0;
    return dt => {
      if (st.held) return;
      st.clock += dt;
      if (st.tour) { st.t += dt; if (st.t >= TOUR_DUR) st.t = 0; tourAt(st.t); }
      else { acc += dt; while (acc >= DT) { acc -= DT; playStep(); } }
      drawTuner(g, st); info();
    };
  });

  /* ---------- slide 2: coyote time ---------- */
  const CT = 32, CP = { run: 7, h: 3.5, apex: .4, fall: 2, coyote: 0 }, EDGE = 440, LAND = 552, LEN = 2.6;
  const CRECTS = [{ x: -100, y: 0, w: EDGE + 100, h: 300 }, { x: LAND, y: 0, w: 600, h: 300 }];
  // the frame Madeline first has no ground under her, with no press at all
  const LEAVE = (() => { const p = newPlayer(150), D = derive(CP, CT); p.vx = D.run; for (let i = 0; i < 400; i++) { step(p, CP, D, CRECTS, { dir: 1, j: 0, jp: 0 }, CT); if (!p.ground) return i; } return 0; })();
  // press = frames after leaving the ledge (1 = the first frame in the air, 0 or less = still on the ledge); null = no press
  function lane(press, coyote, n) {
    const P = { ...CP, coyote }, D = derive(P, CT), p = newPlayer(150); p.vx = D.run;
    let ev = null, hold = false;
    for (let i = 0; i < n; i++) {
      const jp = press != null && i === LEAVE + press;
      const e = step(p, P, D, CRECTS, { dir: 1, j: jp || hold, jp }, CT);
      if (e) { ev = e; hold = e !== 'refused'; }
      if (hold && p.vy > 0) hold = false;
      if (p.y > 400) { p.y = 400; p.vy = 0; }
    }
    return { p, ev, fell: p.y > 40 };
  }
  function drawLane(g, oy, press, c, on, n, label) {
    const r = lane(press, on ? c : 0, n), p = r.p, gy = oy + 228;
    g.save(); g.beginPath(); g.rect(0, oy, W, 282); g.clip();
    const gr = g.createLinearGradient(0, oy, 0, oy + 282); gr.addColorStop(0, '#8fd0ff'); gr.addColorStop(1, '#d9f0ff'); g.fillStyle = gr; g.fillRect(0, oy, W, 282);
    drawRects(g, CRECTS, 0, gy, CT);
    // the coyote window, drawn as the stretch of air Madeline can still jump from
    if (on) { const w = c * CP.run * CT / 60; g.fillStyle = 'rgba(47,174,99,.28)'; g.fillRect(EDGE + HW, gy - 40, w, 40); g.strokeStyle = '#2fae63'; g.setLineDash([5, 4]); g.lineWidth = 2; g.strokeRect(EDGE + HW, gy - 40, w, 40); g.setLineDash([]); }
    p.trails.concat([p.trail]).forEach(tr => tr.length && T.trail(tr.map(([x, y]) => [x, gy + y - 14]), C.navy, .5, 3));
    drawChar(g, 'madeline', p.x, gy + p.y, p, CT);
    g.restore();
    txt(g, label, 18, oy + 30, '800 17px Montserrat, Jost, sans-serif', C.ink);
    // outcome
    const pressed = press != null && n > LEAVE + press;
    if (pressed) {
      const ok = r.ev === 'jump' || r.ev === 'coyote';
      T.label(ok ? (r.ev === 'coyote' ? 'Jumped from the coyote window' : 'Jumped from the ledge') : 'Refused: no ground under her', 600, oy + 118, 'center', '#fff', 15, ok ? '#1a8a4c' : C.red);
      if (r.fell) T.stamp('fell', 496, gy - 60, C.red, clamp((n - LEAVE - 30) / 10), 22);
    }
    // frame strip: frames around the edge
    const x0 = 214, cw = 30, y = oy + 44;
    txt(g, 'frames after', 18, y + 10, '600 13px Jost, sans-serif', C.muted); txt(g, 'leaving the ledge', 18, y + 26, '600 13px Jost, sans-serif', C.muted);
    for (let k = -7; k <= 18; k++) {
      const x = x0 + (k + 7) * cw, grounded = k <= 0, inWin = on && k >= 1 && k <= c;
      g.fillStyle = grounded ? '#4fa8dc' : inWin ? '#3fbf72' : '#efe6d2'; g.fillRect(x, y, cw - 3, 22);
      if (k === 1 || k === 0 || k % 5 === 0) txt(g, String(k), x + cw / 2 - 1, y + 38, '600 12px Jost, sans-serif', C.ink, 'center');
      if (press === k && pressed) { g.fillStyle = C.gold; g.beginPath(); g.moveTo(x + cw / 2 - 9, y - 12); g.lineTo(x + cw / 2 + 7, y - 12); g.lineTo(x + cw / 2 - 1, y - 1); g.fill(); g.strokeStyle = C.navy; g.lineWidth = 2; g.strokeRect(x, y, cw - 3, 22); }
      if (n - LEAVE === k) { g.strokeStyle = C.red; g.lineWidth = 2; g.strokeRect(x - 1, y - 1, cw - 1, 24); }
    }
    g.fillStyle = C.navy; g.fillRect(x0 + 7.5 * cw - 2, y - 4, 2, 30);
    [['#4fa8dc', 'on the ledge'], ...(on ? [['#3fbf72', 'coyote window']] : []), ['#efe6d2', 'in the air']].forEach(([col, s], i) => { const lx = 640 + i * 130; g.fillStyle = col; g.fillRect(lx, oy + 16, 14, 14); txt(g, s, lx + 20, oy + 28, '600 13px Jost, sans-serif', C.ink); });
    return r;
  }
  const CY_SEQ = [0, 4, 9], CY_DUR = LEN * CY_SEQ.length;
  canvasDemo('coyote', (s, cv, g) => {
    const st = { press: 4, c: 6, mine: false, myPress: null, lastMine: null, tour: true, held: false, t: 0, run: 0, key: '' };
    const pS = $(s, '.cy-p'), cS = $(s, '.cy-c'), tourBtn = $(s, '.cy-tour'), tryBtn = $(s, '.cy-try');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.t = 0; } };
    pS.oninput = () => { manual(); st.mine = false; tryBtn.classList.remove('on'); st.press = +pS.value; };
    cS.oninput = () => { manual(); st.c = +cS.value; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.mine = false; tourBtn.classList.add('on'); tryBtn.classList.remove('on'); };
    tryBtn.onclick = () => { manual(); st.mine = true; st.t = 0; st.myPress = null; tryBtn.classList.add('on'); cv.focus(); };
    addEventListener('keydown', e => {
      if (!s.classList.contains('active') || e.key !== ' ' || e.target.closest?.('input, textarea, select')) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.repeat) return;
      if (!st.mine) { manual(); st.mine = true; st.t = 0; st.myPress = null; tryBtn.classList.add('on'); return; }
      if (st.myPress == null) { st.myPress = clamp(Math.floor(st.t * 60) - LEAVE, -60, 60); st.lastMine = st.myPress; }
    }, true);
    function draw(t, press, c) {
      T.use(g); g.clearRect(0, 0, W, H);
      g.save(); g.beginPath(); g.roundRect(0, 0, W, H, 14); g.clip();
      const n = Math.floor(t * 60);
      const a = drawLane(g, 0, press, c, false, n, 'Coyote time off');
      g.fillStyle = '#fffaf0'; g.fillRect(0, 282, W, 21);
      const b = drawLane(g, 303, press, c, true, n, `Coyote time on: ${c} frames (${(c / 60 * 1000).toFixed(0)} ms)`);
      g.restore();
      return [a, b];
    }
    function info(press, c) {
      const key = [press, c, st.mine].join('|'); if (key === st.key) return; st.key = key;
      pS.value = press ?? pS.value; cS.value = c;
      $(s, '.cy-v-p').textContent = press == null ? 'waiting for Space' : press <= 0 ? 'before the edge' : `${press} frame${press > 1 ? 's' : ''} (${(press / 60 * 1000).toFixed(0)} ms)`;
      $(s, '.cy-v-c').textContent = `${c} frames`;
      if (press == null) { say($(s, '.cy-stats'), '<div><b>…</b><span>press Space as Madeline runs off the ledge</span></div>'); say($(s, '.cy-out'), 'Coyote time “allows the player to slightly mess up, but not ruin the feel and consistency of jumping.”'); return; }
      const off = press <= 0, on = press <= c;
      say($(s, '.cy-stats'), `<div class="${off ? 'g' : 'r'}"><b>${off ? 'jump' : 'fall'}</b><span>coyote time off</span></div><div class="${on ? 'g' : 'r'}"><b>${on ? 'jump' : 'fall'}</b><span>coyote time on</span></div>`);
      say($(s, '.cy-out'), off ? 'Pressed on the ledge: both rules jump. Coyote time changes nothing for a press that was on time.'
        : on ? `Pressed ${press} frame${press > 1 ? 's' : ''} late. Without coyote time the press is refused and Madeline falls. With it, the press still counts: the player slightly messed up, and the jump still felt consistent.`
        : `Pressed ${press} frames late, beyond the ${c}-frame window. Coyote time forgives a slip, not a missed jump.`);
    }
    scenes.coyote = { seek(t) { st.held = true; const i = Math.min(CY_SEQ.length - 1, Math.floor(t / LEN)); draw(t - i * LEN, CY_SEQ[i], 6); info(CY_SEQ[i], 6); }, dur: () => CY_DUR };
    return dt => {
      if (st.held) return;
      st.t += dt;
      let press = st.press, c = st.c, lt = st.t;
      if (st.tour) { if (st.t >= CY_DUR) st.t = 0; const i = Math.min(CY_SEQ.length - 1, Math.floor(st.t / LEN)); press = CY_SEQ[i]; c = 6; lt = st.t - i * LEN; }
      else { if (st.t >= LEN) { st.t = 0; if (st.mine) st.myPress = null; } lt = st.t; if (st.mine) press = st.myPress; }
      draw(lt, press, c);
      info(st.mine ? (press ?? null) : press, c);
    };
  });

  window.__seek = (t, which = 'tuner') => scenes[which].seek(t);
  window.__dur = (which = 'tuner') => scenes[which].dur();
  window.__segs = () => SEG0;   // preset boundaries of the walk-through, for recording
})();
