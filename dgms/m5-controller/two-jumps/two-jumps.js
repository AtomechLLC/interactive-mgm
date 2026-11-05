/* Two jumps, two philosophies (RGF C2 M5, deck slides 69-115). Slide 1: one shared input drives two jumpers on the same
   terrain. Left, an Ori-style jump stacked from small pieces (each one a toggle); right, a No Rest for the Wicked-style
   contextual jump that only fires at a ledge marker and plays one fixed root-motion curve. A fixed-step simulation turns an
   input timeline into both bodies plus timed events, and the events light the component diagrams under each side
   (../shared/xray.js). Seeking re-simulates from 0, so GIFs are a pure function of time. Slide 2: muppet vs puppet. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, TAU = Math.PI * 2, PW = 512, RX = 528, DT = 1 / 60;
  // terrain, in panel coordinates: ledge A (low), a gap, ledge B (higher)
  const AY = 268, BY = 208, A_END = 250, B_START = 330, START = 40;
  const surface = x => x <= A_END ? AY : x >= B_START ? BY : null;
  // Ori-style numbers (illustrative)
  const RUN = 230, G = 2200, V0 = 700, CUT = 260, SUSTAIN = .3, COYOTE = .15, AIRACC = 1700;
  // No Rest-style numbers (illustrative)
  const WALK = 230, MARK_A = 238, MARK_B = 342, REACH = 34, DEST_B = 380, DEST_A = 206, ACT = { prep: .2, move: .55, rec: .18 };
  const OPTS = { sustain: true, momentum: true, double: true, aircontrol: true, coyote: true, interrupt: true };

  function newSim() {
    return { t: 0, held: false, ori: { x: START, y: AY, vx: 0, vy: 0, ground: true, coy: 0, dbl: false, sus: 0, dead: 0, face: 1 }, nr: { x: START, y: AY, act: null, face: 1 }, ev: [], trO: [], trN: [], lastCtl: -9 };
  }
  const approach = (v, to, d) => v < to ? Math.min(to, v + d) : Math.max(to, v - d);
  function reset(S) { const n = newSim(); S.ori = n.ori; S.nr = n.nr; S.trO = []; S.trN = []; S.ev.push({ t: S.t, type: 'reset' }); }
  function step(S, inp, o) {
    const ev = (type, x) => S.ev.push({ t: S.t, type, ...x });
    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), press = inp.jump && !S.held, release = !inp.jump && S.held;
    // ---- left: Ori-style ----
    const p = S.ori;
    if (p.dead > 0) { p.dead -= DT; if (p.dead <= 0) Object.assign(p, newSim().ori); }
    else {
      if (dir) p.face = dir;
      if (p.ground) p.vx = dir * RUN;
      else if (o.aircontrol && dir) { p.vx = approach(p.vx, dir * RUN, AIRACC * DT); if (S.t - S.lastCtl > .45) { S.lastCtl = S.t; ev('aircontrol'); } }
      else if (!o.momentum) p.vx = approach(p.vx, 0, 500 * DT);
      if (press) {
        const coyote = !p.ground && o.coyote && p.coy > 0;
        if (p.ground || coyote) {
          p.vy = -V0; p.ground = false; p.coy = 0; p.dbl = false; p.sus = 0;
          if (!o.momentum) p.vx *= .3;
          ev('jump', { coyote, momentum: o.momentum && Math.abs(p.vx) > 20 });
        } else if (o.double && !p.dbl) { p.vy = -V0 * .82; p.dbl = true; p.sus = 0; ev('double'); }
      }
      if (release && !p.ground && o.interrupt && p.vy < -CUT) { p.vy = -CUT; ev('cut'); }
      let gm = 1;
      if (o.sustain && inp.jump && !p.ground && p.vy < 0 && p.sus < SUSTAIN) { if (p.sus === 0) ev('sustain'); gm = .42; p.sus += DT; }
      if (!p.ground) { p.vy += G * gm * DT; p.coy -= DT; }
      const py = p.y; p.x += p.vx * DT; p.y += p.vy * DT;
      // the face of ledge B is a wall
      if (p.y > BY + 2 && p.x + 9 > B_START && p.x - p.vx * DT + 9 <= B_START + 1) { p.x = B_START - 9; p.vx = 0; }
      p.x = clamp(p.x, 10, PW - 12);
      const sf = surface(p.x);
      if (p.ground && sf !== p.y) { p.ground = false; p.vy = 0; p.coy = o.coyote ? COYOTE : 0; }
      if (!p.ground && p.vy >= 0 && sf != null && py <= sf + 1 && p.y >= sf) { p.y = sf; p.vy = 0; p.ground = true; p.dbl = false; }
      if (p.y > 360) { p.dead = .55; ev('fall'); }
    }
    // ---- right: No Rest-style ----
    const n = S.nr;
    if (n.act) {
      const a = n.act, k = (S.t - a.t0);
      if (press) ev('nr-ignored');
      if (k < ACT.prep) { n.x = lerp(a.x0, a.mx, ease(k / ACT.prep)); n.y = a.y0; }
      else if (k < ACT.prep + ACT.move) { const q = (k - ACT.prep) / ACT.move; n.x = lerp(a.mx, a.x1, ease(q)); n.y = lerp(a.y0, a.y1, ease(q)) - a.arc * Math.sin(Math.PI * q); }
      else { n.x = a.x1; n.y = a.y1; }
      if (k >= ACT.prep + ACT.move + ACT.rec) n.act = null;
    } else {
      if (dir) n.face = dir;
      n.x += dir * WALK * DT;
      n.x = n.y === AY ? clamp(n.x, 12, A_END - 4) : clamp(n.x, B_START + 4, PW - 12);
      if (press) {
        if (n.y === AY && Math.abs(n.x - MARK_A) <= REACH) { n.act = { t0: S.t, x0: n.x, mx: MARK_A, y0: AY, x1: DEST_B, y1: BY, arc: 60 }; n.face = 1; ev('nr-jump', { up: true }); }
        else if (n.y === BY && Math.abs(n.x - MARK_B) <= REACH) { n.act = { t0: S.t, x0: n.x, mx: MARK_B, y0: BY, x1: DEST_A, y1: AY, arc: 30 }; n.face = -1; ev('nr-jump', { up: false }); }
        else ev('nr-refuse');
      }
    }
    S.held = inp.jump;
    S.t += DT;
    if (Math.round(S.t / DT) % 2 === 0) { S.trO.push([p.x, p.y, S.t, p.dead > 0]); S.trN.push([n.x, n.y, S.t]); if (S.trO.length > 90) S.trO.shift(); if (S.trN.length > 90) S.trN.shift(); }
  }

  /* ---------- tour: an input timeline plus option changes and resets ---------- */
  const HOLD = [
    ['right', .3, 2.0], ['jump', .9, 1.4], ['jump', 2.15, 2.3], ['jump', 2.55, 2.75],
    ['right', 5.8, 7.0], ['jump', 6.79, 7.1],
    ['right', 9.3, 10.5], ['jump', 9.95, 10.05], ['jump', 10.25, 10.6],
    ['right', 13.3, 14.7], ['jump', 14.05, 14.45],
    ['right', 17.3, 18.3], ['jump', 18.05, 18.45],
  ];
  const TEVENTS = [{ at: 5.5, reset: true }, { at: 9, reset: true }, { at: 12.8, reset: true, opts: { momentum: false, aircontrol: false } }, { at: 17, reset: true, opts: { momentum: true, aircontrol: true } }];
  const TDUR = 20.5;
  const TPHASE = [
    [0, 'Same input to both sides: hold right, press jump. Left jumps on demand. Right refuses: there is no ledge marker under its feet yet.'],
    [1.6, 'Right reaches the marker and the next press fires its one action: a fixed root-motion curve to a preset destination. A press during it is ignored.'],
    [5.5, 'Coyote time: the left jumper presses a moment after running off the ledge and still gets its jump. The right one cannot walk off: it stops at the ledge and jumps from the marker.'],
    [9, 'Interruptible and double jump: a quick tap cuts the jump short, a second press jumps again in the air. On the right, a press away from the marker is refused.'],
    [12.8, 'Switch off momentum preservation and air control. The same press now falls short: Ori\'s jump is many pieces stacking together.'],
    [17, 'No Rest\'s jump is one clear action with total motion control: same press, same arc, same landing, every time.'],
  ];
  function tourInput(t) { const i = { left: false, right: false, jump: false }; HOLD.forEach(([k, a, b]) => { if (t >= a && t < b) i[k] = true; }); return i; }

  /* ---------- the diagrams under each side ---------- */
  const AB = [['abCoy', 'Coyote time', 'coyote'], ['abJump', 'Jump', null], ['abSus', 'Air sustain', 'sustain'], ['abMom', 'Momentum', 'momentum'], ['abDbl', 'Double jump', 'double'], ['abAir', 'Air control', 'aircontrol'], ['abCut', 'Interruptible', 'interrupt']];
  const SEIN = { id: 'sein', x: 6, y: 340, w: 500, h: 56, part: 'entity', title: 'SeinController', sub: 'reads input and calls every ability' };
  const PM = { id: 'pm', x: 6, y: 512, w: 500, h: 62, part: 'entity', title: 'Platform Movement', sub: 'moves the body' };
  const AX = i => 42 + i * 71.5, AYC = 446;
  // Ori's diagram is drawn by hand: one straight drop from the controller to each ability and on to Platform Movement
  function drawOri(g, fl, t, off) {
    const lit = {}, upd = (id, a) => { if (a >= 0) lit[id] = Math.min(lit[id] ?? 9, a); };
    fl.forEach(f => { upd(f.from, t - f.t); upd(f.to, t - f.t - f.dur); });
    XR.box(g, SEIN, null, lit.sein, false); XR.box(g, PM, null, lit.pm, false);
    AB.forEach(([id, name], i) => {
      const x = AX(i), d = off.includes(id), used = fl.some(f => (f.to === id || f.from === id) && t >= f.t), glow = lit[id] == null ? 0 : clamp(1 - lit[id] / .9);
      g.save(); g.globalAlpha = d ? .25 : 1;
      g.strokeStyle = '#741b47'; g.fillStyle = '#741b47'; g.lineWidth = used ? 3 : 2; g.globalAlpha *= used ? .9 : .35;
      [[396, AYC - 22], [AYC + 22, 510]].forEach(([y0, y1]) => { g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1 - 6); g.stroke(); g.beginPath(); g.moveTo(x, y1); g.lineTo(x - 5, y1 - 8); g.lineTo(x + 5, y1 - 8); g.closePath(); g.fill(); });
      g.globalAlpha = d ? .25 : 1;
      if (glow) { g.shadowColor = XR.PART.receiver.col; g.shadowBlur = 24 * glow; }
      XR.pacman(g, x, AYC, 18 + 3 * glow); g.shadowBlur = 0;
      g.font = '700 11px Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const w = Math.min(70, g.measureText(name).width + 8);
      g.fillStyle = 'rgba(255,250,240,.95)'; g.beginPath(); g.roundRect(x - w / 2, AYC + 28, w, 17, 6); g.fill();
      g.fillStyle = d ? '#cc0000' : '#20124d'; g.fillText(d ? name + ' off' : name, x, AYC + 37, 70);
      g.restore();
    });
    // packets in flight
    fl.forEach(f => {
      if (t < f.t || t > f.t + f.dur) return;
      const k = ease(clamp((t - f.t) / f.dur)), ai = id => AB.findIndex(q => q[0] === id);
      let p0, p1;
      if (f.from === 'sein') { const x = AX(ai(f.to)); p0 = [x, 396]; p1 = [x, AYC - 20]; }
      else if (f.to === 'pm') { const x = AX(ai(f.from)); p0 = [x, AYC + 20]; p1 = [x, 512]; }
      else { p0 = [AX(ai(f.from)) + 20, AYC]; p1 = [AX(ai(f.to)) - 20, AYC]; }
      const x = lerp(p0[0], p1[0], k), y = lerp(p0[1], p1[1], k);
      g.save(); g.shadowColor = '#93c47d'; g.shadowBlur = 12; XR.triangle(g, x, y, 10, Math.atan2(p1[1] - p0[1], p1[0] - p0[0])); g.restore();
    });
  }
  const NR_N = [
    { id: 'in', x: RX + 6, y: 346, w: 108, h: 100, part: 'entity', title: 'Input', sub: 'J pressed' },
    { id: 'pc', x: RX + 128, y: 346, w: 176, h: 100, part: 'entity', title: 'Pawn Component', sub: 'is there a\njump point here?' },
    { id: 'act', x: RX + 318, y: 346, w: 188, h: 100, part: 'entity', title: 'Action', value: 'Idle' },
    { id: 'wpn', x: RX + 128, y: 470, w: 176, h: 104, part: 'entity', title: 'Weapon', sub: 'drives attacks;\nnot used by a jump' },
    { id: 'mb', x: RX + 318, y: 470, w: 188, h: 104, part: 'entity', title: 'Movement Base', value: 'Walking' },
  ];
  function flowOf(S, t) {
    const f = [];
    S.ev.forEach(e => {
      if (e.t > t || t - e.t > 1.4) return;
      const hop = (dt, dur, from, to, x = {}) => f.push({ t: e.t + dt, dur, from, to, kind: 'command', ...x });
      if (e.type === 'jump') { if (e.coyote) { hop(0, .2, 'sein', 'abCoy'); hop(.2, .2, 'abCoy', 'abJump'); } else hop(0, .25, 'sein', 'abJump'); hop(.3, .25, 'abJump', 'pm', { label: 'Jump' }); if (e.momentum) { hop(.1, .2, 'sein', 'abMom'); hop(.3, .25, 'abMom', 'pm'); } }
      const one = (id, lab) => { hop(0, .22, 'sein', id); hop(.24, .24, id, 'pm', { label: lab }); };
      if (e.type === 'sustain') one('abSus', 'Sustain');
      if (e.type === 'double') one('abDbl', 'Double');
      if (e.type === 'aircontrol') one('abAir', 'Steer');
      if (e.type === 'cut') one('abCut', 'Cut');
      if (e.type === 'nr-jump') { hop(0, .2, 'in', 'pc'); hop(.22, .25, 'pc', 'act', { label: 'Ledge jump' }); hop(.5, .25, 'act', 'mb', { label: 'Root motion' }); }
      if (e.type === 'nr-refuse') { hop(0, .2, 'in', 'pc'); hop(.22, .4, 'pc', 'act', { bounce: 'no jump point', label: 'Jump?' }); }
      if (e.type === 'nr-ignored') { hop(0, .35, 'in', 'pc', { bounce: 'action running' }); }
    });
    return f;
  }

  /* ---------- art: original characters ---------- */
  function spirit(g, x, y, face, air, t) {
    // a small glowing forest spirit: round body, long ears, a wisp of a tail
    g.save(); g.translate(x, y); g.scale(face, 1);
    const glow = g.createRadialGradient(0, -18, 2, 0, -18, 34); glow.addColorStop(0, 'rgba(255,255,230,.9)'); glow.addColorStop(1, 'rgba(160,230,255,0)');
    g.fillStyle = glow; g.beginPath(); g.arc(0, -18, 34, 0, TAU); g.fill();
    g.fillStyle = '#f4fbff'; g.strokeStyle = '#6aa9c9'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(-8, -22); g.quadraticCurveTo(-22, -40, -18, -52); g.quadraticCurveTo(-8, -38, -2, -26); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(2, -24); g.quadraticCurveTo(4, -44, 12, -50); g.quadraticCurveTo(12, -36, 8, -22); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(0, -14, 11, 13, 0, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-9, -10); g.quadraticCurveTo(-24, -6 + Math.sin(t * 8) * 3, -26, air ? -18 : -2); g.lineWidth = 4; g.strokeStyle = '#d9f1ff'; g.stroke();
    g.fillStyle = '#24305e'; g.beginPath(); g.arc(5, -16, 2.4, 0, TAU); g.fill();
    g.strokeStyle = '#6aa9c9'; g.lineWidth = 3; g.beginPath();
    if (air) { g.moveTo(-4, -2); g.lineTo(-8, 4); g.moveTo(4, -2); g.lineTo(6, 4); } else { g.moveTo(-4, -2); g.lineTo(-5, 0); g.moveTo(4, -2); g.lineTo(5, 0); }
    g.stroke(); g.restore();
  }
  function wanderer(g, x, y, face, crouch) {
    // a hooded wanderer with a sword on the back
    g.save(); g.translate(x, y); g.scale(face, 1 - crouch * .18);
    g.strokeStyle = '#3a2a18'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(-4, -16); g.lineTo(-6, 0); g.moveTo(4, -16); g.lineTo(6, 0); g.stroke();
    g.strokeStyle = '#b9bccb'; g.lineWidth = 3; g.beginPath(); g.moveTo(-12, -46); g.lineTo(6, -12); g.stroke();
    g.fillStyle = '#8a4b28'; g.strokeStyle = '#3a2a18'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(-11, -14); g.lineTo(-9, -40); g.quadraticCurveTo(0, -46, 9, -40); g.lineTo(12, -14); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#5a3216'; g.beginPath(); g.arc(0, -46, 10, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#f2c9a0'; g.beginPath(); g.arc(3, -45, 5.5, -1.2, 1.4); g.fill();
    g.fillStyle = '#d6a64a'; g.fillRect(-11, -24, 23, 4);
    g.restore();
  }
  function terrain(g, x0, warm, t) {
    g.save(); g.translate(x0, 0);
    g.beginPath(); g.roundRect(0, 0, PW, 336, 14); g.clip();
    const sky = g.createLinearGradient(0, 0, 0, 336);
    if (warm) { sky.addColorStop(0, '#f3e2c4'); sky.addColorStop(1, '#d9b98a'); } else { sky.addColorStop(0, '#173a5e'); sky.addColorStop(1, '#2f7a8a'); }
    g.fillStyle = sky; g.fillRect(0, 0, PW, 336);
    // background shapes: soft trees or a painted town
    g.fillStyle = warm ? 'rgba(120,80,40,.18)' : 'rgba(150,230,255,.12)';
    for (let i = 0; i < 6; i++) { const bx = 30 + i * 90, bh = 90 + (i * 37 % 60); if (warm) g.fillRect(bx - 22, 210 - bh, 44, bh + 60); else { g.beginPath(); g.ellipse(bx, 200 - bh * .4, 40, bh * .6, 0, 0, TAU); g.fill(); } }
    if (!warm) for (let i = 0; i < 14; i++) { const px = (i * 73 + t * 12) % PW, py = 40 + (i * 53) % 160; g.fillStyle = 'rgba(255,255,220,.6)'; g.beginPath(); g.arc(px, py, 1.6, 0, TAU); g.fill(); }
    const top = warm ? '#7a8f3a' : '#6fd3c0', body = warm ? '#7a5230' : '#1d3a4a';
    g.fillStyle = body; g.fillRect(0, AY, A_END, 336 - AY); g.fillRect(B_START, BY, PW - B_START, 336 - BY);
    g.fillStyle = top; g.fillRect(0, AY, A_END, 7); g.fillRect(B_START, BY, PW - B_START, 7);
    g.fillStyle = warm ? 'rgba(60,30,10,.5)' : 'rgba(0,10,30,.6)'; g.fillRect(A_END, 318, B_START - A_END, 20);
    g.restore();
  }

  /* ---------- slide 1 ---------- */
  let jumpsApi;
  canvasDemo('jumps', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, sim: newSim(), opts: { ...OPTS }, keys: { left: false, right: false, jump: false }, key: '', msg: '' };
    const tourBtn = $(s, '.tj-tour'), out = $(s, '.tj-out');
    const boxes = $$(s, '[data-o]');
    const sync = () => boxes.forEach(b => { b.checked = !!st.opts[b.dataset.o]; });
    const free = () => { st.held = false; if (!st.tour) return; st.tour = false; tourBtn.classList.remove('on'); st.sim = newSim(); st.t = 0; st.opts = { ...OPTS }; sync(); };
    boxes.forEach(b => b.onchange = () => { const v = b.checked; free(); st.opts[b.dataset.o] = v; b.checked = v; });
    tourBtn.onclick = () => { st.tour = true; st.held = false; st.t = 0; st.sim = newSim(); st.opts = { ...OPTS }; tourBtn.classList.add('on'); };
    $(s, '.tj-reset').onclick = () => { st.tour = true; free(); };
    const KEY = { KeyA: 'left', KeyD: 'right', KeyJ: 'jump', KeyW: 'jump' };
    document.addEventListener('keydown', e => { const k = KEY[e.code]; if (!k || !s.classList.contains('active') || e.altKey || e.ctrlKey || e.metaKey) return; e.preventDefault(); if (e.repeat) return; free(); st.keys[k] = true; });
    document.addEventListener('keyup', e => { const k = KEY[e.code]; if (!k) return; st.keys[k] = false; });
    $$(s, '.tj-hold').forEach(b => {
      const k = b.dataset.k;
      b.addEventListener('pointerdown', e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (er) { /* synthetic events */ } free(); st.keys[k] = true; b.classList.add('on'); });
      const up = () => { st.keys[k] = false; b.classList.remove('on'); };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
    });
    // tour: the sim is replayed from 0 when time goes backwards
    function advanceTour(t) {
      if (t < st.sim.t - 1e-6) { st.sim = newSim(); st.opts = { ...OPTS }; }
      while (st.sim.t + DT <= t + 1e-9) {
        TEVENTS.forEach(e => { if (e.at > st.sim.t - 1e-9 && e.at <= st.sim.t + DT - 1e-9) { if (e.opts) Object.assign(st.opts, e.opts); if (e.reset) reset(st.sim); } });
        step(st.sim, tourInput(st.sim.t), st.opts);
      }
    }
    function render() {
      const S = st.sim, t = S.t, inp = st.tour ? tourInput(t) : st.keys;
      T.use(g); g.clearRect(0, 0, W, H);
      terrain(g, 0, false, t); terrain(g, RX, true, t);
      // left: the spirit, its trail, and what just happened
      g.save(); g.beginPath(); g.roundRect(0, 0, PW, 336, 14); g.clip();
      trail(g, S.trO.filter(q => !q[3]), t, '#d9f1ff');
      const p = S.ori;
      if (p.dead > 0) T.popText('Fell short: respawn', PW / 2, 150, '#ffb951', p.dead * 2);
      else spirit(g, p.x, p.y, p.face, !p.ground, t);
      pops(g, S, t, 0);
      g.restore();
      // right: markers, the preset curve, the wanderer
      g.save(); g.translate(RX, 0); g.beginPath(); g.roundRect(0, 0, PW, 336, 14); g.clip();
      marker(g, MARK_A, AY, 'Ledge jump', t); marker(g, MARK_B, BY, 'Drop down', t);
      ghost(g, MARK_A, AY, DEST_B, BY, 60); ghost(g, MARK_B, BY, DEST_A, AY, 30);
      trail(g, S.trN, t, '#7a4a00');
      const n = S.nr, k = n.act ? t - n.act.t0 : 9, crouch = n.act ? (k < ACT.prep ? k / ACT.prep : k > ACT.prep + ACT.move ? 1 - (k - ACT.prep - ACT.move) / ACT.rec : 0) : 0;
      wanderer(g, n.x, n.y, n.face, clamp(crouch));
      pops(g, S, t, 1);
      g.restore();
      [0, RX].forEach((x, i) => { g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(x + 1, 1, PW - 2, 334, 14); g.stroke(); T.label(i ? 'No Rest-style: contextual, one action' : 'Ori-style: on demand, many pieces', x + PW / 2, 22, 'center', '#fff', 15, i ? '#7a4a00' : C.navy); });
      // the shared keys, drawn on both sides: the same input reaches both
      [0, RX].forEach(x => [['A', inp.left], ['D', inp.right], ['J', inp.jump]].forEach(([l, on], i) => {
        const kx = x + PW - 104 + i * 32;
        g.fillStyle = on ? '#ffb951' : 'rgba(255,250,240,.85)'; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.roundRect(kx, 302, 26, 24, 5); g.fill(); g.stroke();
        g.font = '800 13px Montserrat, sans-serif'; g.fillStyle = C.navy; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(l, kx + 13, 315);
      }));
      // diagrams: values follow the sim, the abilities that are off are dimmed
      NR_N[2].value = n.act ? (n.act.arc > 40 ? 'Ledge jump' : 'Drop down') : 'Idle';
      NR_N[4].value = n.act ? 'Root motion' : inp.left || inp.right ? 'Walking' : 'Standing';
      const fl = flowOf(S, t), off = AB.filter(a => a[2] && !st.opts[a[2]]).map(a => a[0]);
      drawOri(g, fl.filter(f => f.from === 'sein' || f.to === 'pm' || f.from === 'abCoy'), t, off);
      XR.draw(g, NR_N, fl.filter(f => NR_N.some(q => q.id === f.from)), t, { hideEdges: true, only: ['in', 'pc', 'act', 'mb'] });
      const k2 = (st.tour ? 'T' : 'F') + JSON.stringify(st.opts);
      if (k2 !== st.key) { st.key = k2; sync(); }
      const ph = st.tour ? TPHASE.filter(q => t >= q[0]).at(-1)[1] : lastNote(S, t);
      if (out.textContent !== ph) say(out, ph);
    }
    function lastNote(S, t) {
      const e = S.ev.filter(q => q.t <= t && q.type !== 'reset' && q.type !== 'aircontrol').at(-1);
      if (!e) return 'Hold D to run right and press J. Both sides hear the same keys. Hold J for a higher jump on the left; on the right, find the ledge marker.';
      return ({
        jump: e.coyote ? 'Coyote jump: pressed just after leaving the ledge, and it still counted.' : 'On demand: the left side jumped the moment you pressed.',
        double: 'Double jump: a second press in the air.', cut: 'Interrupted: letting go early cut the jump short.', sustain: 'Air sustain: holding J keeps the jump rising longer.',
        fall: 'Fell short. Try more momentum, air control or a later press.', 'nr-jump': 'Contextual: the right side fired its one jump action from the marker to its preset destination.',
        'nr-refuse': 'Refused: the right side only jumps at a ledge marker. Walk to the glowing marker first.', 'nr-ignored': 'Ignored: the action is already running and owns the motion until it ends.',
      })[e.type] || '';
    }
    jumpsApi = { seek(t) { st.held = true; if (!st.tour) { st.tour = true; tourBtn.classList.add('on'); } advanceTour(t); render(); }, dur: () => TDUR };
    return dt => {
      if (!st.held) {
        st.t += Math.min(.1, Math.max(0, dt));
        if (st.tour) { if (st.t > TDUR) { st.t = 0; } advanceTour(st.t); }
        else while (st.sim.t + DT <= st.t) step(st.sim, st.keys, st.opts);
      }
      render();
    };
  });
  function trail(g, pts, t, col) {
    g.save(); g.fillStyle = col;
    pts.forEach(([x, y, ts]) => { const a = clamp(1 - (t - ts) / 1.5); if (a <= 0) return; g.globalAlpha = a * .7; g.beginPath(); g.arc(x, y - 14, 2.4, 0, TAU); g.fill(); });
    g.restore();
  }
  function marker(g, x, y, label, t) {
    const a = .6 + .4 * Math.sin(t * 4);
    g.save(); g.fillStyle = `rgba(255,185,81,${.25 + .2 * a})`; g.beginPath(); g.ellipse(x, y + 2, REACH, 7, 0, 0, TAU); g.fill();
    g.fillStyle = '#ffb951'; g.strokeStyle = '#7a4a00'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y - 74); g.lineTo(x + 8, y - 64); g.lineTo(x, y - 54); g.lineTo(x - 8, y - 64); g.closePath(); g.fill(); g.stroke();
    g.restore();
    g.font = '700 11px Jost, sans-serif'; g.fillStyle = '#7a4a00'; g.textAlign = 'center'; g.fillText(label, x, y - 84);
  }
  function ghost(g, x0, y0, x1, y1, arc) {
    g.save(); g.setLineDash([4, 6]); g.strokeStyle = 'rgba(122,74,0,.55)'; g.lineWidth = 2; g.beginPath();
    for (let i = 0; i <= 20; i++) { const q = i / 20, x = lerp(x0, x1, ease(q)), y = lerp(y0, y1, ease(q)) - arc * Math.sin(Math.PI * q) - 14; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke(); g.setLineDash([]); g.fillStyle = 'rgba(122,74,0,.5)'; g.beginPath(); g.arc(x1, y1 - 3, 4, 0, TAU); g.fill(); g.restore();
  }
  const POP = { jump: ['Jump', '#ffffff'], double: ['Double jump', '#ffe599'], cut: ['Cut short', '#ffb951'], 'nr-jump': ['Ledge jump', '#7a4a00'], 'nr-refuse': ['✕ No jump point here', '#cc0000'], 'nr-ignored': ['Ignored: action running', '#8a1c15'] };
  function pops(g, S, t, side) {
    S.ev.filter(e => POP[e.type] && e.type.startsWith('nr') === !!side && e.t <= t).slice(-1).forEach(e => {
      const age = t - e.t; if (age < 0 || age > 1) return;
      const right = e.type.startsWith('nr'); if (right !== !!side) return;
      let [txt, col] = POP[e.type] || []; if (!txt) return;
      if (e.type === 'jump' && e.coyote) txt = 'Coyote jump';
      if (e.type === 'nr-jump' && !e.up) txt = 'Drop down';
      const who = side ? S.nr : S.ori;
      T.popText(txt, clamp(who.x, 90, PW - 90), Math.max(60, who.y - 80 - age * 20), col, (1 - age) * 1.6);
    });
  }

  /* ---------- slide 2: muppet vs puppet ---------- */
  const LX = 0, RX2 = 532;
  const AR_N = [
    { id: 'prefab', back: true, x: 8, y: 52, w: 500, h: 420, part: 'entity', title: 'SeinPrefab (one object)' },
    { id: 'm_in', x: 34, y: 104, w: 190, h: 92, part: 'entity', title: 'Input reading', sub: 'buttons' },
    { id: 'm_ctl', x: 292, y: 104, w: 190, h: 92, part: 'entity', title: 'Control logic', value: 'Ready' },
    { id: 'm_ab', x: 292, y: 238, w: 190, h: 92, part: 'entity', title: 'Abilities', sub: 'jump, dash, bash' },
    { id: 'm_ph', x: 34, y: 238, w: 190, h: 92, part: 'entity', title: 'Physics', sub: 'velocity' },
    { id: 'm_an', x: 34, y: 368, w: 190, h: 92, part: 'entity', title: 'Animation', sub: 'events' },
    { id: 'm_vw', x: 292, y: 368, w: 190, h: 92, part: 'entity', title: 'Rendering', sub: 'sprite, effects' },
    { id: 'm_ai', x: 34, y: 490, w: 200, h: 86, part: 'entity', title: 'AI brain', sub: 'wants to drive' },
    { id: 'm_net', x: 282, y: 490, w: 200, h: 86, part: 'entity', title: 'Online player', sub: 'wants to join' },
    { id: 'p_in', x: RX2 + 6, y: 96, w: 140, h: 100, part: 'entity', title: 'Device input', sub: 'keyboard, pad' },
    { id: 'p_ctl', x: RX2 + 172, y: 96, w: 170, h: 100, part: 'entity', title: 'Controller', value: 'Ready' },
    { id: 'p_pawn', x: RX2 + 172, y: 252, w: 170, h: 110, part: 'entity', title: 'Pawn', value: 'Idle' },
    { id: 'p_vw', x: RX2 + 366, y: 252, w: 136, h: 110, part: 'entity', title: 'View', sub: 'sprite, effects' },
    { id: 'p_ai', x: RX2 + 172, y: 410, w: 170, h: 82, part: 'entity', title: 'AI brain', sub: 'issues commands' },
    { id: 'p_net', x: RX2 + 6, y: 410, w: 140, h: 82, part: 'entity', title: 'Online input', sub: 'player 2' },
    { id: 'p_vw2', x: RX2 + 366, y: 410, w: 136, h: 82, part: 'entity', title: 'View, player 2', sub: 'same simulation' },
  ];
  const AR_RULES = {
    jump: () => [
      { dt: 0, dur: .5, from: 'm_in', to: 'm_ctl', kind: 'command', label: 'Jump' },
      { dt: .55, dur: .5, from: 'm_ctl', to: 'm_ab', kind: 'command', set: { m_ctl: 'Jumping' } },
      { dt: 1.1, dur: .5, from: 'm_ab', to: 'm_ph', kind: 'system', label: 'velocity' },
      { dt: 1.65, dur: .5, from: 'm_ph', to: 'm_an', kind: 'system', label: 'airborne' },
      { dt: 2.2, dur: .6, from: 'm_an', to: 'm_ab', kind: 'effect', label: 'anim event', via: [258, 360] },
      { dt: 2.85, dur: .6, from: 'm_ab', to: 'm_ctl', kind: 'effect', label: 'state changed', via: [440, 214] },
      { dt: 3.5, dur: .5, from: 'm_an', to: 'm_vw', kind: 'system' },
      { dt: 0, dur: .5, from: 'p_in', to: 'p_ctl', kind: 'command', label: 'Jump' },
      { dt: .55, dur: .5, from: 'p_ctl', to: 'p_pawn', kind: 'command', label: 'Jump', set: { p_pawn: 'Jumping' } },
      { dt: 1.1, dur: .5, from: 'p_pawn', to: 'p_vw', kind: 'system', label: 'state' },
      { dt: 4.4, dur: .01, set: { m_ctl: 'Ready', p_pawn: 'Idle' } },
    ],
    ai: () => [
      { dt: 0, dur: .9, from: 'm_ai', to: 'm_in', kind: 'command', label: 'Jump', bounce: 'input is wired inside' },
      { dt: 0, dur: .7, from: 'p_ai', to: 'p_ctl', kind: 'command', label: 'Jump', via: [RX2 + 354, 230] },
      { dt: .75, dur: .5, from: 'p_ctl', to: 'p_pawn', kind: 'command', label: 'Jump', set: { p_pawn: 'Jumping' } },
      { dt: 1.3, dur: .5, from: 'p_pawn', to: 'p_vw', kind: 'system', label: 'state' },
      { dt: 2.6, dur: .01, set: { p_pawn: 'Idle' } },
    ],
    net: () => [
      { dt: 0, dur: .9, from: 'm_net', to: 'm_vw', kind: 'command', label: 'Join', bounce: 'no seam to sync' },
      { dt: 0, dur: .6, from: 'p_net', to: 'p_ctl', kind: 'command', label: 'synced input', via: [RX2 + 160, 260] },
      { dt: .65, dur: .5, from: 'p_ctl', to: 'p_pawn', kind: 'command', set: { p_pawn: 'Jumping' } },
      { dt: 1.2, dur: .5, from: 'p_pawn', to: 'p_vw', kind: 'system' },
      { dt: 1.2, dur: .5, from: 'p_pawn', to: 'p_vw2', kind: 'system' },
      { dt: 2.8, dur: .01, set: { p_pawn: 'Idle' } },
    ],
  };
  const AR_TOUR = [{ at: .5, type: 'jump' }, { at: 5.6, type: 'ai' }, { at: 8.6, type: 'net' }];
  const AR_DUR = 12.5;
  const AR_PH = [
    [0, 'Press Jump on both. Left, Ori\'s SeinPrefab: input, control, abilities, physics and animation live in one object and call each other.'],
    [2.6, 'An animation event reaches back into the abilities, which change the control state: the circular feedback that muppets tend to create.'],
    [5.5, 'Plug in an AI. The puppet takes it: an AI brain issues commands to the same controller, which drives the same pawn. In the muppet the input is wired inside, so there is no place to plug it.'],
    [8.5, 'Add an online player. With Photon Quantum only inputs travel; every machine runs the same simulation and draws its own view.'],
  ];
  let archApi;
  canvasDemo('arch', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, acts: [], flow: [], key: '' };
    const tourBtn = $(s, '.ar-tour');
    const rebuild = () => { st.flow = XR.script(AR_N, st.tour ? AR_TOUR : st.acts, AR_RULES); };
    const free = () => { st.held = false; if (!st.tour) return; st.tour = false; tourBtn.classList.remove('on'); st.t = 0; st.acts = []; rebuild(); };
    $$(s, '.ar-act').forEach(b => b.onclick = () => { free(); st.acts.push({ at: Math.max(st.t, XR.end(st.flow)) + .05, type: b.dataset.a }); rebuild(); });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.held = false; tourBtn.classList.add('on'); rebuild(); };
    $(s, '.ar-reset').onclick = () => { st.tour = true; free(); };
    rebuild();
    function render() {
      const t = st.t; T.use(g); g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,252,244,.8)'; g.beginPath(); g.roundRect(0, 0, 516, H, 14); g.fill();
      // puppet lanes: Unity input, Quantum simulation, Unity view
      [[RX2, 160, 'Unity: input', '#dfe6fb'], [RX2 + 160, 194, 'Quantum: simulation', '#d9d2e9'], [RX2 + 354, 154, 'Unity: view', '#dfe6fb']].forEach(([x, w, l, c]) => {
        g.fillStyle = c; g.strokeStyle = '#8ea2e6'; g.lineWidth = 2; g.beginPath(); g.roundRect(x, 46, w - 6, H - 50, 12); g.fill(); g.stroke();
        g.font = '700 13px Montserrat, sans-serif'; g.fillStyle = '#23306e'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(l, x + (w - 6) / 2, 64);
      });
      g.font = '800 20px Montserrat, sans-serif'; g.textAlign = 'left'; g.fillStyle = C.ink;
      g.fillText('Muppet: Ori', 14, 24); g.fillText('Puppet: No Rest for the Wicked', RX2 + 4, 24);
      const { val } = XR.draw(g, AR_N, st.flow, t, { hideEdges: false });
      // the loop is the muppet's risk: flag it while the feedback signal runs
      const loop = st.flow.find(f => f.from === 'm_ab' && f.to === 'm_ctl' && t >= f.t - .6 && t <= f.t + 1.6);
      if (loop) T.label('⟳ circular feedback', 258, 216, 'center', '#fff', 14, '#cc0000');
      const key = JSON.stringify(val) + Math.floor(t * 2);
      if (key === st.key) return; st.key = key;
      const ph = st.tour ? AR_PH.filter(q => t >= q[0]).at(-1)[1] : 'Muppets are quick to build and mix everything in one place. Puppets separate input, controller, pawn and view: more thought up front, and trickier to debug, but AI control and multiplayer drop in.';
      say($(s, '.ar-out'), ph);
      say($(s, '.ar-stats'), `<div class="y"><b>1</b><span>object holds it all in the muppet</span></div><div class="g"><b>3</b><span>layers in the puppet: input, simulation, view</span></div>`);
    }
    archApi = { seek(t) { st.held = true; if (!st.tour) { st.tour = true; tourBtn.classList.add('on'); rebuild(); } st.t = t; render(); }, dur: () => AR_DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > AR_DUR) st.t = 0; render(); };
  });

  const API = { jumps: () => jumpsApi, arch: () => archApi };
  window.__seek = (t, w) => API[w]().seek(t);
  window.__dur = w => API[w]().dur();
})();
