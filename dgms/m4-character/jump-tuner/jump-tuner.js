/* Jump metrics tuner (Module 4, Part 6: "Character Metrics": how far, how fast, how long; gravity; Sonic vs Mario,
   Mega Man, Commander Keen 1 vs 4; "Coyote Time, Celeste").
   Slide 1: a playable side-view runner. Run speed, jump height, time to apex, fall gravity multiplier and coyote frames
   are sliders; gravity and launch speed follow from height and time to apex (g = 2h / t², v = 2h / t). Presets are
   illustrative approximations (the deck gives no numbers), and each preset's arc is drawn as a ghost from Mario's feet.
   "Fit the level" swaps the open field for fixed gaps and ledges, and each obstacle is rated against the current metrics.
   Slide 2: coyote time. One late press, two lanes: off refuses it, on forgives it.
   Physics runs at a fixed 60 Hz step. Walk-throughs re-simulate from a fixed start, so __seek is a pure function of time. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, DT = 1 / 60;

  /* ---------- sprites: real Super Mario Bros. small Mario ---------- */
  const SPR = {}; ['walk0', 'walk1', 'walk2', 'jump'].forEach(n => { const i = new Image(); i.src = `img/mario-${n}.png`; SPR[n] = i; });
  function mario(g, x, foot, p, scale = 2) {
    const fr = !p.ground ? 'jump' : Math.abs(p.vx) < 5 ? 'walk2' : ['walk0', 'walk1', 'walk2'][Math.floor(Math.abs(p.x) / 14) % 3];
    const im = SPR[fr];
    g.save(); g.translate(Math.round(x), Math.round(foot)); if (p.face < 0) g.scale(-1, 1);
    if (im.complete && im.naturalWidth) { g.imageSmoothingEnabled = false; g.drawImage(im, -8 * scale, -16 * scale, 16 * scale, 16 * scale); }
    else { g.fillStyle = C.red; g.fillRect(-10, -30, 20, 30); }
    g.restore();
  }

  /* ---------- physics ---------- */
  const HW = 10, HH = 30;
  const derive = (P, TL) => { const h = P.h * TL, g = 2 * h / (P.apex * P.apex); return { g, v0: 2 * h / P.apex, gf: g * P.fall, run: P.run * TL }; };
  const hit = (p, r) => p.x + HW > r.x && p.x - HW < r.x + r.w && p.y > r.y && p.y - HH < r.y + r.h;
  function newPlayer(x) { return { x, y: 0, vx: 0, vy: 0, ground: true, air: 0, jumped: false, cut: false, face: 1, blocked: 0, lastGroundX: x, takeoff: null, trail: [], trails: [] }; }
  // one 60 Hz step. inp: { dir: -1..1, j: held, jp: pressed this step }. Returns 'jump' | 'refused' | null for a press.
  function step(p, P, D, rects, inp, TL) {
    let ev = null;
    const target = inp.dir * D.run, acc = D.run / .12;
    p.vx += clamp(target - p.vx, -acc * DT, acc * DT);
    if (inp.dir) p.face = inp.dir;
    if (inp.jp) {
      if (p.ground || (p.air <= P.coyote && !p.jumped)) {
        ev = p.ground ? 'jump' : 'coyote'; p.vy = -D.v0; p.jumped = true; p.cut = false; p.ground = false;
        p.takeoff = { x: p.x, y: p.y, face: p.face }; p.trail = [];
      } else ev = 'refused';
    }
    if (p.jumped && !inp.j && p.vy < 0 && !p.cut) { p.vy *= .45; p.cut = true; }
    p.vy += (p.vy < 0 ? D.g : D.gf) * DT;
    p.vy = Math.min(p.vy, 42 * TL);
    // x
    p.x += p.vx * DT; p.blocked = 0;
    for (const r of rects) if (hit(p, r)) { if (p.vx > 0) p.x = r.x - HW; else if (p.vx < 0) p.x = r.x + r.w + HW; p.blocked = Math.sign(p.vx) || 1; p.vx = 0; }
    // y
    const was = p.ground; p.ground = false; p.y += p.vy * DT;
    for (const r of rects) if (hit(p, r)) { if (p.vy > 0) { p.y = r.y; p.ground = true; } else p.y = r.y + r.h + HH; p.vy = 0; }
    if (p.ground) { p.air = 0; p.jumped = false; p.lastGroundX = p.x; if (!was && p.trail.length) { p.trails = [p.trail, ...p.trails].slice(0, 2); p.trail = []; } }
    else { p.air++; if (p.jumped) p.trail.push([p.x, p.y]); }
    return ev;
  }
  // a full-press arc from (0, 0) at full run, no collisions: points, airtime and reach back at the take-off height
  function arc(P, TL) {
    const D = derive(P, TL), pts = [[0, 0]];
    let x = 0, y = 0, vy = -D.v0, t = 0;
    while (t < 4) { vy += (vy < 0 ? D.g : D.gf) * DT; y += vy * DT; x += D.run * DT; t += DT; if (y >= 0) { pts.push([x, 0]); break; } pts.push([x, y]); }
    return { pts, air: t, reach: x / TL };
  }

  /* ---------- presets: illustrative approximations, in tiles and seconds ---------- */
  const PRESETS = {
    smb: { name: 'Super Mario Bros.', run: 8, h: 4, apex: .42, fall: 2.4, coyote: 0, col: '#e5322d' },
    sonic: { name: 'Sonic the Hedgehog', run: 20, h: 6, apex: .5, fall: 1, coyote: 0, col: '#2f56c9' },
    megaman: { name: 'Mega Man', run: 5.2, h: 3, apex: .33, fall: 1, coyote: 0, col: '#2ea3dc' },
    keen1: { name: 'Commander Keen 1', run: 7, h: 4.5, apex: .55, fall: .8, coyote: 0, col: '#2fae63' },
    keen4: { name: 'Commander Keen 4', run: 6.5, h: 3.8, apex: .45, fall: 1.4, coyote: 0, col: '#8a4fd6' },
  };
  const PKEYS = Object.keys(PRESETS);

  /* ---------- levels (tiles; ground top at 0, heights up) ---------- */
  const TL = 26, GY = 470;
  const block = (x0, x1, top, bottom = -8) => ({ x: x0 * TL, y: -top * TL, w: (x1 - x0) * TL, h: (top - bottom) * TL });
  const LEVELS = {
    fit: {
      w: 40, flag: 38.5,
      rects: [block(0, 5, 0), block(9, 23, 0), block(28, 40, 0), block(12, 17, 3, 0), block(32, 36, 3.5, 0)],
      obs: [
        { id: 'A', kind: 'gap', x0: 5, x1: 9, need: 4, label: '4-tile gap' },
        { id: 'B', kind: 'ledge', x0: 12, x1: 17, top: 3, need: 3.1, label: '3-tile ledge' },
        { id: 'C', kind: 'gap', x0: 23, x1: 28, need: 5, label: '5-tile gap' },
        { id: 'E', kind: 'ledge', x0: 32, x1: 36, top: 3.5, need: 3.6, label: '3.5-tile ledge' },
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
  function panel(g, x, y, w, h) { g.fillStyle = 'rgba(255,252,244,.92)'; g.beginPath(); g.roundRect(x, y, w, h, 10); g.fill(); g.strokeStyle = 'rgba(38,44,106,.25)'; g.lineWidth = 1.5; g.stroke(); }
  function txt(g, s, x, y, font, col, align = 'left') { g.font = font; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(s, x, y); }

  function drawTuner(g, st) {
    const L = LEVELS[st.level], p = st.p, P = st.P, cam = st.cam;
    T.use(g); sky(g);
    // clouds
    g.fillStyle = 'rgba(255,255,255,.8)';
    for (let i = 0; i < 6; i++) { const cx = ((i * 337 + 80) - cam * .3) % (W + 200); const x = cx < -100 ? cx + W + 200 : cx; g.beginPath(); g.ellipse(x, 120 + (i % 3) * 40, 46, 16, 0, 0, Math.PI * 2); g.ellipse(x + 30, 112 + (i % 3) * 40, 30, 14, 0, 0, Math.PI * 2); g.fill(); }
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
    // arcs: the presets as ghosts, the current metrics solid, from Mario's feet (or his last take-off)
    const o = p.ground ? { x: p.x, y: p.y, face: p.face } : (p.takeoff || { x: p.x, y: p.y, face: p.face });
    if (st.arcs) PKEYS.forEach(k => { if (st.preset === k) return; const a = arc(PRESETS[k], TL); drawArc(g, a.pts, o.x - cam, GY + o.y, o.face, PRESETS[k].col, true, 3, .55); });
    const me = arc(P, TL);
    drawArc(g, me.pts, o.x - cam, GY + o.y, o.face, st.preset ? PRESETS[st.preset].col : C.gold, false, 4, .9);
    // Mario's own trails
    p.trails.forEach((tr, i) => T.trail(tr.map(([x, y]) => [x - cam, GY + y - 14]), C.navy, .35 - i * .12, 3));
    if (p.trail.length) T.trail(p.trail.map(([x, y]) => [x - cam, GY + y - 14]), C.navy, .6, 3);
    mario(g, p.x - cam, GY + p.y, p);
    // HUD
    const D = derive(P, 1);
    panel(g, 14, 14, 410, 106);
    txt(g, st.preset ? PRESETS[st.preset].name : 'Your metrics', 28, 38, '800 16px Montserrat, Jost, sans-serif', C.ink);
    txt(g, `Jump height ${P.h.toFixed(1)} tiles, apex after ${P.apex.toFixed(2)} s`, 28, 60, '600 14px Jost, sans-serif', C.ink);
    txt(g, `Airtime ${me.air.toFixed(2)} s, reach at full run ${me.reach.toFixed(1)} tiles`, 28, 80, '600 14px Jost, sans-serif', C.ink);
    txt(g, `Gravity ${D.g.toFixed(0)} tiles/s² rising, ${D.gf.toFixed(0)} falling; coyote ${P.coyote} frames`, 28, 100, '600 14px Jost, sans-serif', C.muted);
    if (st.arcs) {
      panel(g, 760, 14, 266, 140);
      PKEYS.forEach((k, i) => { g.fillStyle = PRESETS[k].col; g.fillRect(774, 30 + i * 20, 22, 5); txt(g, PRESETS[k].name, 804, 37 + i * 20, '600 13px Jost, sans-serif', st.preset === k ? C.ink : C.muted); });
      txt(g, 'Illustrative approximations, not measured.', 774, 142, '600 12px Jost, sans-serif', C.muted);
    }
    if (st.banner) T.stamp(st.banner, W / 2, 200, '#1a8a4c', 1, 26);
    g.restore();
  }

  /* ---------- the bot that drives the walk-through ---------- */
  function riseTime(P, need) { const D = derive(P, 1), disc = D.v0 * D.v0 - 2 * D.g * need; return disc < 0 ? null : (D.v0 - Math.sqrt(disc)) / D.g; }
  function triggers(P) {
    return LEVELS.fit.obs.map(ob => {
      if (ob.kind === 'gap') return { ob, x: ob.x0 * TL - 2 };
      const tr = riseTime(P, ob.need);
      return { ob, x: tr == null ? ob.x0 * TL - HW - 6 : ob.x0 * TL - HW - P.run * TL * tr - 6 };
    });
  }
  // sim a run of the fit level with preset P for n steps; returns the state
  function botRun(P, n) {
    const D = derive(P, TL), rects = LEVELS.fit.rects, p = newPlayer(2 * TL), trig = triggers(P), used = new Set(), res = {};
    let hold = null, stuck = 0, done = -1;
    for (let i = 0; i < n; i++) {
      if (done >= 0) { step(p, P, D, rects, { dir: 0, j: false, jp: false }, TL); for (const ob of LEVELS.fit.obs) if (!res[ob.id]) res[ob.id] = 'cleared'; continue; }
      let jp = false;
      // walking off a ledge at speed can drop Mario into the next gap: then he takes a running jump off its end
      const on = LEVELS.fit.obs.find(o => o.kind === 'ledge' && p.ground && p.y < -1 && p.x >= o.x1 * TL - 3 && p.x <= o.x1 * TL + HW);
      if (on && !used.has('edge' + on.id)) {
        used.add('edge' + on.id);
        const xl = on.x1 * TL + D.run * Math.sqrt(2 * on.top * TL / D.gf), gap = LEVELS.fit.obs.find(o => o.kind === 'gap' && xl > o.x0 * TL - HW && xl < o.x1 * TL + HW);
        if (gap) { jp = true; hold = gap; }
      }
      // a trigger crossed in the air stays armed until Mario lands, unless he is already past the obstacle
      for (const tr of trig) if (!used.has(tr.ob.id) && p.x >= tr.x) {
        if (p.x > (tr.ob.kind === 'gap' ? tr.ob.x0 * TL + HW : tr.ob.x0 * TL)) { if (p.x > tr.ob.x1 * TL || p.y < -tr.ob.top * TL + 1) used.add(tr.ob.id); else if (p.ground) { used.add(tr.ob.id); jp = true; hold = tr.ob; } }
        else if (p.ground) { used.add(tr.ob.id); jp = true; hold = tr.ob; }
      }
      // like a player, let go of jump once the obstacle is beaten (variable jump height)
      if (hold && (p.vy > 0 || (hold.kind === 'gap' ? p.x > hold.x1 * TL + HW : p.y < -(hold.top + .3) * TL))) hold = null;
      step(p, P, D, rects, { dir: 1, j: !!hold || jp, jp }, TL);
      // a ledge too tall: Mario stands against it, then is lifted on top so the run can go on
      if (p.ground && p.blocked > 0) { if (++stuck > 24) { const ob = LEVELS.fit.obs.find(o => o.kind === 'ledge' && Math.abs(o.x0 * TL - HW - p.x) < 4); if (ob) { res[ob.id] = res[ob.id] || 'missed'; p.x = ob.x0 * TL + HW + 4; p.y = -ob.top * TL; } stuck = 0; } } else stuck = 0;
      // a gap too wide: Mario falls in and comes back on the far side
      if (p.y > 140) { const ob = LEVELS.fit.obs.find(o => o.kind === 'gap' && p.x > o.x0 * TL - HW && p.x < o.x1 * TL + 2 * TL); if (ob) { res[ob.id] = 'missed'; p.x = ob.x1 * TL + HW + 4; } p.y = 0; p.vy = 0; p.vx = D.run * .6; p.trail = []; }
      for (const ob of LEVELS.fit.obs) if (!res[ob.id] && p.ground && p.x > ob.x1 * TL + HW && (ob.kind === 'gap' || p.y < -1 || p.x > ob.x1 * TL + HW)) res[ob.id] = 'cleared';
      if (p.x >= LEVELS.fit.flag * TL && done < 0) done = i;
    }
    return { p, res, done };
  }

  const scenes = {};
  /* ---------- slide 1: the tuner ---------- */
  const SEG = 7.5, TOUR_DUR = SEG * PKEYS.length;
  canvasDemo('tuner', (s, cv, g) => {
    const st = { P: { ...PRESETS.smb }, preset: 'smb', level: 'fit', arcs: true, p: newPlayer(2 * TL), cam: 0, res: {}, banner: '', tour: true, held: false, t: 0, key: '', clock: 0 };
    const keys = { l: 0, r: 0, j: 0, jp: 0 };
    const sl = { run: $(s, '.jt-run'), h: $(s, '.jt-h'), apex: $(s, '.jt-apex'), fall: $(s, '.jt-fall'), coyote: $(s, '.jt-coy') };
    const vl = { run: $(s, '.jt-v-run'), h: $(s, '.jt-v-h'), apex: $(s, '.jt-v-apex'), fall: $(s, '.jt-v-fall'), coyote: $(s, '.jt-v-coy') };
    const fmt = { run: v => `${v.toFixed(1)} tiles/s`, h: v => `${v.toFixed(1)} tiles`, apex: v => `${v.toFixed(2)} s`, fall: v => `×${v.toFixed(1)}`, coyote: v => `${v} frames` };
    const tourBtn = $(s, '.jt-tour'), playBtn = $(s, '.jt-play'), fitBox = $(s, '.jt-fit'), arcBox = $(s, '.jt-arcs');
    const presetBtns = $$(s, '.jt-presets .btn');
    const restart = () => { st.p = newPlayer(2 * TL); st.res = {}; st.banner = ''; st.won = 0; };
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); playBtn.classList.add('on'); restart(); } };
    const syncUI = () => {
      Object.keys(sl).forEach(k => { sl[k].value = st.P[k]; vl[k].textContent = fmt[k](+st.P[k]); });
      presetBtns.forEach(b => b.classList.toggle('on', b.dataset.p === st.preset));
      fitBox.checked = st.level === 'fit'; arcBox.checked = st.arcs;
    };
    Object.keys(sl).forEach(k => sl[k].oninput = () => { manual(); st.P[k] = +sl[k].value; st.preset = PKEYS.find(pk => Object.keys(sl).every(q => Math.abs(PRESETS[pk][q] - st.P[q]) < 1e-6)) || null; syncUI(); });
    presetBtns.forEach(b => b.onclick = () => { manual(); st.preset = b.dataset.p; st.P = { ...PRESETS[st.preset] }; syncUI(); restart(); });
    fitBox.onchange = () => { manual(); st.level = fitBox.checked ? 'fit' : 'open'; restart(); };
    arcBox.onchange = () => { st.arcs = arcBox.checked; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.level = 'fit'; tourBtn.classList.add('on'); playBtn.classList.remove('on'); };
    playBtn.onclick = () => { manual(); restart(); cv.focus(); };
    const KM = { arrowleft: 'l', a: 'l', arrowright: 'r', d: 'r', ' ': 'j', w: 'j', arrowup: 'j' };
    const onKey = down => e => {
      if (!s.classList.contains('active') || e.target.closest?.('textarea, select')) return;
      const k = KM[e.key.toLowerCase()]; if (!k) return;
      if (e.target.matches?.('input[type=range]') && e.key.startsWith('Arrow')) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (down && st.tour) manual();
      if (k === 'j' && down && !keys.j) keys.jp = 1;
      keys[k] = down ? 1 : 0;
    };
    addEventListener('keydown', onKey(true), true); addEventListener('keyup', onKey(false), true);

    function tourAt(t) {
      const i = Math.min(PKEYS.length - 1, Math.floor(t / SEG)), f = t - i * SEG, k = PKEYS[i];
      st.preset = k; st.P = { ...PRESETS[k] }; st.level = 'fit';
      const r = botRun(st.P, Math.max(0, Math.floor((f - .6) * 60)));
      st.p = r.p; st.res = r.res; st.cam = 0;
      st.banner = r.done >= 0 && Object.values(r.res).every(v => v === 'cleared') && Object.keys(r.res).length === 4 ? 'Level cleared' : r.done >= 0 ? 'Reached the flag' : '';
    }
    function playStep() {
      const L = LEVELS[st.level], D = derive(st.P, TL);
      const dir = keys.r - keys.l;
      step(st.p, st.P, D, L.rects, { dir, j: !!keys.j, jp: !!keys.jp }, TL); keys.jp = 0;
      const p = st.p;
      if (p.y > 160) { p.x = p.lastGroundX - p.face * 4; p.y = 0; p.vx = 0; p.vy = 0; p.trail = []; p.ground = true; const ob = L.obs.find(o => o.kind === 'gap' && p.x > o.x0 * TL - 2 * TL && p.x < o.x1 * TL); if (ob) st.res[ob.id] = 'missed'; }
      for (const ob of L.obs) if (st.res[ob.id] !== 'cleared' && p.ground && p.x > ob.x1 * TL + HW) st.res[ob.id] = 'cleared';
      if (st.level === 'open' && p.x > (L.w - 2) * TL) { p.x = 2 * TL; p.lastGroundX = p.x; }
      if (st.level === 'fit' && L.flag && p.x >= L.flag * TL && !st.won) { st.won = st.clock; st.banner = 'Flag reached'; }
      if (st.won && st.clock - st.won > 1.6) restart();
      p.x = clamp(p.x, HW, L.w * TL - HW);
      st.cam = clamp(p.x - 360, 0, L.w * TL - W);
    }
    function info() {
      const key = [st.preset, st.level, ...Object.values(st.P)].join('|');
      if (key === st.key) return; st.key = key; syncUI();
      let html;
      if (st.level === 'fit') {
        const v = LEVELS.fit.obs.map(ob => rate(st.P, ob).verdict), n = k => v.filter(x => x === k).length;
        html = n('impossible') ? `<b>${n('impossible')} of 4 jumps are impossible</b> with these metrics. “You could either run faster, or have smaller rooms! You could jump higher, or make obstacles lower.”`
          : n('too loose') ? `<b>${n('too loose')} of 4 obstacles are too loose:</b> the level asks nothing of these metrics. Every space must be built in harmony with the controls.`
          : '<b>Every obstacle fits these metrics.</b> Each jump asks for a committed run-up, and none of them is free.';
      } else html = 'Changing gravity “completely transforms the feel of jumping”. Compare the heavy fall of Super Mario Bros. with the float of Commander Keen 1.';
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
  // the frame Mario first has no ground under him, with no press at all
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
    // the coyote window, drawn as the stretch of air Mario can still jump from
    if (on) { const w = c * CP.run * CT / 60; g.fillStyle = 'rgba(47,174,99,.28)'; g.fillRect(EDGE + HW, gy - 40, w, 40); g.strokeStyle = '#2fae63'; g.setLineDash([5, 4]); g.lineWidth = 2; g.strokeRect(EDGE + HW, gy - 40, w, 40); g.setLineDash([]); }
    p.trails.concat([p.trail]).forEach(tr => tr.length && T.trail(tr.map(([x, y]) => [x, gy + y - 14]), C.navy, .5, 3));
    mario(g, p.x, gy + p.y, p);
    g.restore();
    txt(g, label, 18, oy + 30, '800 17px Montserrat, Jost, sans-serif', C.ink);
    // outcome
    const pressed = press != null && n > LEAVE + press;
    if (pressed) {
      const ok = r.ev === 'jump' || r.ev === 'coyote';
      T.label(ok ? (r.ev === 'coyote' ? 'Jumped from the coyote window' : 'Jumped from the ledge') : 'Refused: no ground under him', 600, oy + 118, 'center', '#fff', 15, ok ? '#1a8a4c' : C.red);
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
      if (press == null) { say($(s, '.cy-stats'), '<div><b>…</b><span>press Space as Mario runs off the ledge</span></div>'); say($(s, '.cy-out'), 'Coyote time “allows the player to slightly mess up, but not ruin the feel and consistency of jumping.”'); return; }
      const off = press <= 0, on = press <= c;
      say($(s, '.cy-stats'), `<div class="${off ? 'g' : 'r'}"><b>${off ? 'jump' : 'fall'}</b><span>coyote time off</span></div><div class="${on ? 'g' : 'r'}"><b>${on ? 'jump' : 'fall'}</b><span>coyote time on</span></div>`);
      say($(s, '.cy-out'), off ? 'Pressed on the ledge: both rules jump. Coyote time changes nothing for a press that was on time.'
        : on ? `Pressed ${press} frame${press > 1 ? 's' : ''} late. Without coyote time the press is refused and Mario falls. With it, the press still counts: the player slightly messed up, and the jump still felt consistent.`
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
})();
