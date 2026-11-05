/* Two jumps, two philosophies (RGF C2 M5). Slide 1: one shared input drives two jumpers on the same
   terrain. Left, an Ori-style jump stacked from small pieces (each one a toggle); right, a No Rest for the Wicked-style
   contextual jump on a top-down map that only fires at a ledge marker and plays one fixed root-motion curve. A fixed-step simulation turns an
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
      terrain(g, 0, false, t); topMap(g, RX, t);
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
      marker(g, MARK_A, AY, 'Ledge jump', 1, t); marker(g, MARK_B, BY, 'Drop down', -1, t);
      ghost(g, MARK_A, AY, DEST_B, BY, 60); ghost(g, MARK_B, BY, DEST_A, AY, 30);
      footprints(g, S.trN, t);
      const n = S.nr, k = n.act ? t - n.act.t0 : 9, crouch = n.act ? (k < ACT.prep ? k / ACT.prep : k > ACT.prep + ACT.move ? 1 - (k - ACT.prep - ACT.move) / ACT.rec : 0) : 0;
      // top-down: the shadow stays on the ground, the body lifts off it during the jump
      let lift = 0, gy = n.y;
      if (n.act && k >= ACT.prep && k < ACT.prep + ACT.move) { const q = (k - ACT.prep) / ACT.move; lift = n.act.arc * Math.sin(Math.PI * q); gy = n.y + lift; }
      wandererTop(g, n.x, gy, lift, n.face, clamp(crouch), t, !n.act && (inp.left || inp.right));
      pops(g, S, t, 1);
      g.restore();
      [0, RX].forEach((x, i) => { g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(x + 1, 1, PW - 2, 334, 14); g.stroke(); T.label(i ? 'No Rest-style (top-down): contextual, one action' : 'Ori-style: on demand, many pieces', x + PW / 2, 22, 'center', '#fff', 15, i ? '#7a4a00' : C.navy); });
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
  // a contextual jump point painted on the top-down map: a glowing ring on the ground with an arrow across the ravine
  function marker(g, x, y, label, dir, t) {
    const a = .6 + .4 * Math.sin(t * 4);
    g.save();
    g.fillStyle = `rgba(255,185,81,${.22 + .2 * a})`; g.beginPath(); g.ellipse(x, y, REACH, REACH * .55, 0, 0, TAU); g.fill();
    g.strokeStyle = '#ffb951'; g.lineWidth = 2.5; g.setLineDash([6, 5]); g.lineDashOffset = -t * 12; g.beginPath(); g.ellipse(x, y, REACH, REACH * .55, 0, 0, TAU); g.stroke(); g.setLineDash([]);
    g.translate(x + dir * 6, y); g.scale(dir, 1);
    g.fillStyle = '#ffb951'; g.strokeStyle = '#7a4a00'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(-8, -7); g.lineTo(6, -7); g.lineTo(6, -13); g.lineTo(18, 0); g.lineTo(6, 13); g.lineTo(6, 7); g.lineTo(-8, 7); g.closePath(); g.fill(); g.stroke();
    g.restore();
    T.label(label, x, y - 34, 'center', '#7a4a00', 12, 'rgba(255,248,230,.92)');
  }
  // the preset curve: a dotted ground line for the shadow and a dashed arc for the body
  function ghost(g, x0, y0, x1, y1, arc) {
    g.save(); g.lineWidth = 2;
    g.setLineDash([2, 6]); g.strokeStyle = 'rgba(40,30,10,.45)'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.setLineDash([5, 6]); g.strokeStyle = 'rgba(255,240,200,.85)'; g.beginPath();
    for (let i = 0; i <= 20; i++) { const q = i / 20, x = lerp(x0, x1, ease(q)), y = lerp(y0, y1, ease(q)) - arc * Math.sin(Math.PI * q) - 10; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke(); g.setLineDash([]);
    g.strokeStyle = 'rgba(255,240,200,.9)'; g.beginPath(); g.ellipse(x1, y1, 9, 5, 0, 0, TAU); g.stroke(); g.restore();
  }
  function footprints(g, pts, t) {
    g.save(); g.fillStyle = 'rgba(60,40,15,.55)';
    pts.forEach(([x, y, ts], i) => { const a = clamp(1 - (t - ts) / 1.5); if (a <= 0 || i % 2) return; g.globalAlpha = a; g.beginPath(); g.ellipse(x, y + (i % 4 ? 4 : -4), 2.6, 1.6, 0, 0, TAU); g.fill(); });
    g.restore();
  }
  // a top-down map in the oblique style of an overhead action RPG: a low meadow, a ravine, a raised plateau with its cliff face
  const RISE = BY - AY; // the plateau sits higher, so it is drawn further up the screen
  function topMap(g, x0, t) {
    g.save(); g.translate(x0, 0);
    g.beginPath(); g.roundRect(0, 0, PW, 336, 14); g.clip();
    // low meadow
    g.fillStyle = '#86a84f'; g.fillRect(0, 0, PW, 336);
    for (let i = 0; i < 70; i++) { const px = (i * 97) % A_END, py = (i * 61) % 336; g.fillStyle = i % 3 ? 'rgba(60,90,30,.35)' : 'rgba(200,220,120,.35)'; g.fillRect(px, py, 3, 6); }
    // ravine running north to south, with a stream at the bottom
    g.fillStyle = '#4a3622'; g.fillRect(A_END, 0, B_START - A_END, 336);
    g.fillStyle = '#3c6f8e'; g.fillRect(A_END + 22, 0, B_START - A_END - 40, 336);
    g.strokeStyle = 'rgba(220,240,255,.5)'; g.lineWidth = 2;
    for (let i = 0; i < 9; i++) { const yy = ((i * 41 + t * 40) % 360) - 12; g.beginPath(); g.moveTo(A_END + 30, yy); g.quadraticCurveTo(A_END + 40, yy + 6, A_END + 50, yy); g.stroke(); }
    // low bank edge: rocks
    g.fillStyle = '#6d6252'; for (let yy = 4; yy < 336; yy += 18) { g.beginPath(); g.ellipse(A_END + 3, yy, 7, 9, 0, 0, TAU); g.fill(); }
    // raised plateau: top surface, then its west cliff face dropping into the ravine and its south cliff face
    const top = '#a3bf62';
    g.fillStyle = '#6b5236'; g.fillRect(B_START - 14, 0, 14, 336);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(B_START - 30, 0, 16, 336);
    g.fillStyle = top; g.fillRect(B_START, 0, PW - B_START, 336 + RISE);
    g.fillStyle = '#7a5c3a'; g.fillRect(B_START - 14, 336 + RISE, PW, -RISE);
    g.strokeStyle = 'rgba(40,25,10,.4)'; g.lineWidth = 1.5;
    for (let xx = B_START - 8; xx < PW; xx += 16) { g.beginPath(); g.moveTo(xx, 336 + RISE + 6); g.lineTo(xx + 5, 330); g.stroke(); }
    for (let yy = 8; yy < 336 + RISE; yy += 16) { g.beginPath(); g.moveTo(B_START - 12, yy); g.lineTo(B_START - 3, yy + 8); g.stroke(); }
    for (let i = 0; i < 40; i++) { const px = B_START + 6 + (i * 53) % (PW - B_START - 10), py = (i * 47) % (330 + RISE); g.fillStyle = i % 3 ? 'rgba(70,100,30,.3)' : 'rgba(230,240,150,.4)'; g.fillRect(px, py, 3, 6); }
    // dirt paths leading to each jump point
    g.fillStyle = 'rgba(170,130,80,.55)';
    g.beginPath(); g.roundRect(-10, AY - 14, A_END + 6, 28, 14); g.fill();
    g.beginPath(); g.roundRect(B_START + 4, BY - 14, PW, 28, 14); g.fill();
    // trees seen from above and a few stones, away from the paths
    const tree = (x, y, r) => { g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(x + 6, y + 8, r, r * .8, 0, 0, TAU); g.fill(); g.fillStyle = '#3e6b2c'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.fillStyle = '#5a8a3a'; g.beginPath(); g.arc(x - r * .3, y - r * .3, r * .6, 0, TAU); g.fill(); };
    [[40, 92, 26], [120, 136, 20], [196, 70, 24], [70, 182, 14], [380, 78, 22], [460, 128, 26], [470, 250, 16]].forEach(q => tree(...q));
    T.label('Low ground', 70, 236, 'center', '#3b4a1c', 12, 'rgba(240,248,220,.85)'); T.label('High ledge', 450, 176, 'center', '#3b4a1c', 12, 'rgba(240,248,220,.85)');
    g.fillStyle = '#9a9384'; [[170, 316, 8], [24, 318, 6], [480, 40, 7]].forEach(([x, y, r]) => { g.beginPath(); g.ellipse(x, y, r, r * .7, 0, 0, TAU); g.fill(); });
    g.restore();
  }
  // the wanderer seen from above: shadow on the ground, body raised by the jump
  function wandererTop(g, x, gy, lift, face, crouch, t, walking) {
    const sh = 1 - Math.min(.5, lift / 120);
    g.save(); g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x, gy + 2, 15 * sh, 7 * sh, 0, 0, TAU); g.fill(); g.restore();
    const y = gy - lift, step = walking ? Math.sin(t * 14) * 3 : 0;
    g.save(); g.translate(x, y); g.scale(face * (1 + crouch * .1), 1 - crouch * .12);
    g.fillStyle = '#3a2a18';
    g.beginPath(); g.ellipse(-3 + step, 2, 4, 3, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(3 - step, 2, 4, 3, 0, 0, TAU); g.fill();
    // cloak from above, sword across the back
    g.fillStyle = '#8a4b28'; g.strokeStyle = '#3a2a18'; g.lineWidth = 2;
    g.beginPath(); g.ellipse(-2, -10, 13, 11, 0, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = '#c9ccd8'; g.lineWidth = 3; g.beginPath(); g.moveTo(-16, -20); g.lineTo(8, -2); g.stroke();
    g.fillStyle = '#d6a64a'; g.fillRect(-12, -22, 5, 4);
    g.fillStyle = '#5a3216'; g.strokeStyle = '#3a2a18'; g.lineWidth = 2; g.beginPath(); g.arc(3, -16, 8, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#f2c9a0'; g.beginPath(); g.arc(8, -15, 3.5, -1.3, 1.3); g.fill();
    g.restore();
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

  /* ---------- slide 2: muppet vs puppet ----------
     Two themed panels drawn over real game art: Ori's forest glow on the left (the SeinPrefab, one object), No Rest for the
     Wicked's painterly firelight on the right (Photon Quantum: Unity input, Quantum simulation, Unity view). The flow is
     scripted with XR.script and replayed with XR.replay, so every frame is a pure function of t; the drawing is local. */
  const ART = {};
  ['ori', 'ori-forest', 'ab-doublejump', 'ab-dash', 'ab-bash', 'nr-bg', 'nr-screen', 'nr-screen2', 'knight-idle', 'knight-jump', 'knight-p2', 'knight-jump-p2']
    .forEach(n => { const i = new Image(); i.src = 'art/' + n + (/forest|bg|screen/.test(n) ? '.jpg' : '.png'); ART[n] = i; });
  const ok = i => i && i.complete && i.naturalWidth > 0;
  const LP = { x: 0, w: 512 }, RP = { x: 528, w: 512 };
  const ORI = { glow: '#8fe9ff', ink: '#e9fbff', sub: '#a9e3f5', card: 'rgba(6,26,48,.74)', edge: 'rgba(143,233,255,.55)' };
  const WK = { glow: '#ffb547', ink: '#fff3e0', sub: '#f3c999', card: 'rgba(28,14,8,.76)', edge: 'rgba(255,181,71,.5)' };
  const AR_N = [
    { id: 'm_in', side: 'L', x: 30, y: 96, w: 204, h: 92, title: 'Input reading', sub: 'buttons', icon: 'pad' },
    { id: 'm_ctl', side: 'L', x: 278, y: 96, w: 204, h: 92, title: 'Control logic', value: 'Ready' },
    { id: 'm_ab', side: 'L', x: 278, y: 216, w: 204, h: 92, title: 'Abilities', sub: 'jump, dash, bash', icon: 'abilities' },
    { id: 'm_ph', side: 'L', x: 30, y: 216, w: 204, h: 92, title: 'Physics', sub: 'velocity', icon: 'vel' },
    { id: 'm_an', side: 'L', x: 30, y: 336, w: 204, h: 92, title: 'Animation', sub: 'events', icon: 'film' },
    { id: 'm_vw', side: 'L', x: 278, y: 336, w: 204, h: 92, title: 'Rendering', sub: 'sprite, effects', icon: 'ori', value: 'ground' },
    { id: 'm_ai', side: 'L', x: 30, y: 482, w: 204, h: 84, title: 'AI brain', sub: 'wants to drive', icon: 'brain', ghost: true },
    { id: 'm_net', side: 'L', x: 278, y: 482, w: 204, h: 84, title: 'Online player', sub: 'wants to join', icon: 'p2', ghost: true },
    { id: 'p_in', side: 'R', x: 538, y: 122, w: 128, h: 100, title: 'Device', sub: 'keyboard, pad', icon: 'pad' },
    { id: 'p_ctl', side: 'R', x: 690, y: 122, w: 176, h: 100, title: 'Controller', value: 'Ready' },
    { id: 'p_pawn', side: 'R', x: 708, y: 270, w: 158, h: 118, title: 'Pawn', value: 'Idle', sub: 'actions: jump, attack' },
    { id: 'p_vw', side: 'R', x: 884, y: 236, w: 146, h: 178, title: 'View', icon: 'knight', value: 'idle' },
    { id: 'p_ai', side: 'R', x: 690, y: 452, w: 176, h: 96, title: 'AI brain', sub: 'issues commands', icon: 'brain' },
    { id: 'p_net', side: 'R', x: 538, y: 452, w: 128, h: 96, title: 'Online input', sub: 'player 2', icon: 'p2' },
    { id: 'p_vw2', side: 'R', x: 884, y: 434, w: 146, h: 132, title: 'View, player 2', sub: 'same simulation', icon: 'knight2', value: 'idle' },
  ];
  const AR_RULES = {
    jump: () => [
      { dt: 0, dur: .5, from: 'm_in', to: 'm_ctl', label: 'Jump' },
      { dt: .55, dur: .5, from: 'm_ctl', to: 'm_ab', set: { m_ctl: 'Jumping' }, via: [352, 202] },
      { dt: 1.1, dur: .5, from: 'm_ab', to: 'm_ph', label: 'velocity' },
      { dt: 1.65, dur: .5, from: 'm_ph', to: 'm_an', label: 'airborne' },
      { dt: 2.2, dur: .6, from: 'm_an', to: 'm_ab', label: 'anim event', via: [256, 318], loop: true },
      { dt: 2.85, dur: .6, from: 'm_ab', to: 'm_ctl', label: 'state changed', via: [410, 202], loop: true },
      { dt: 3.5, dur: .5, from: 'm_an', to: 'm_vw', set: { m_vw: 'air' } },
      { dt: 0, dur: .5, from: 'p_in', to: 'p_ctl', label: 'Jump', chain: ['Input', 'Device'] },
      { dt: .55, dur: .5, from: 'p_ctl', to: 'p_pawn', label: 'Jump', set: { p_pawn: 'Jumping' }, chain: ['Controller'] },
      { dt: 1.1, dur: .5, from: 'p_pawn', to: 'p_vw', label: 'state', set: { p_vw: 'jump' }, chain: ['Pawn', 'Actions'] },
      { dt: 4.4, dur: .01, set: { m_ctl: 'Ready', p_pawn: 'Idle', m_vw: 'ground', p_vw: 'idle' } },
    ],
    ai: () => [
      { dt: 0, dur: .9, from: 'm_ai', to: 'm_in', label: 'Jump', bounce: 'input is wired inside', stop: .12 },
      { dt: 0, dur: .7, from: 'p_ai', to: 'p_ctl', label: 'Jump', via: [690, 340], chain: ['Controller'], skip: true },
      { dt: .75, dur: .5, from: 'p_ctl', to: 'p_pawn', label: 'Jump', set: { p_pawn: 'Jumping' }, chain: ['Controller'] },
      { dt: 1.3, dur: .5, from: 'p_pawn', to: 'p_vw', label: 'state', set: { p_vw: 'jump' }, chain: ['Pawn', 'Actions'] },
      { dt: 2.6, dur: .01, set: { p_pawn: 'Idle', p_vw: 'idle' } },
    ],
    net: () => [
      { dt: 0, dur: .9, from: 'm_net', to: 'm_vw', label: 'Join', bounce: 'no seam to sync', stop: .45 },
      { dt: 0, dur: .6, from: 'p_net', to: 'p_ctl', label: 'synced input', via: [640, 300], chain: ['Input'] },
      { dt: .65, dur: .5, from: 'p_ctl', to: 'p_pawn', set: { p_pawn: 'Jumping' }, chain: ['Controller'] },
      { dt: 1.2, dur: .5, from: 'p_pawn', to: 'p_vw', set: { p_vw: 'jump' }, chain: ['Pawn', 'Actions'] },
      { dt: 1.2, dur: .5, from: 'p_pawn', to: 'p_vw2', set: { p_vw2: 'jump' }, chain: ['Pawn', 'Actions'] },
      { dt: 2.8, dur: .01, set: { p_pawn: 'Idle', p_vw: 'idle', p_vw2: 'idle' } },
    ],
  };
  const AR_TOUR = [{ at: .5, type: 'jump' }, { at: 5.6, type: 'ai' }, { at: 8.6, type: 'net' }];
  const AR_DUR = 12.5;
  const AR_PH = [
    [0, 'Press Jump on both. Left, Ori\'s SeinPrefab: input, control, abilities, physics and animation live in one object and call each other.'],
    [2.6, 'An animation event reaches back into the abilities, which change the control state: the circular feedback that muppets tend to create.'],
    [5.5, 'Plug in an AI. The puppet takes it: an AI brain issues commands to the same controller, skipping the device, and drives the same pawn. In the muppet the input is wired inside, so there is no place to plug it.'],
    [8.5, 'Add an online player. With Photon Quantum only inputs travel; every machine runs the same simulation and draws its own view.'],
  ];
  const CHAIN = ['Input', 'Device', 'Controller', 'Pawn', 'Actions'];

  const nodeOf = id => AR_N.find(n => n.id === id);
  function edgePt(n, from) {
    const cx = n.x + n.w / 2, cy = n.y + n.h / 2, dx = from[0] - cx, dy = from[1] - cy;
    const k = Math.min(Math.abs((n.w / 2 + 3) / (dx || 1e-9)), Math.abs((n.h / 2 + 3) / (dy || 1e-9)));
    return [cx + dx * k, cy + dy * k];
  }
  function hopPath(f) {
    const a = nodeOf(f.from), b = nodeOf(f.to), ca = [a.x + a.w / 2, a.y + a.h / 2], cb = [b.x + b.w / 2, b.y + b.h / 2];
    return [edgePt(a, f.via || cb), edgePt(b, f.via || ca), f.via || null];
  }
  const at = (p0, p1, via, k) => {
    if (!via) return [lerp(p0[0], p1[0], k), lerp(p0[1], p1[1], k)];
    const u = 1 - k; return [u * u * p0[0] + 2 * u * k * via[0] + k * k * p1[0], u * u * p0[1] + 2 * u * k * via[1] + k * k * p1[1]];
  };
  function cover(g, img, x, y, w, h) {
    if (!ok(img)) return;
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight), iw = img.naturalWidth * s, ih = img.naturalHeight * s;
    g.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  }
  function fit(g, img, cx, cy, maxW, maxH, alpha = 1) {
    if (!ok(img)) return;
    const s = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
    g.save(); g.globalAlpha *= alpha; g.drawImage(img, cx - img.naturalWidth * s / 2, cy - img.naturalHeight * s / 2, img.naturalWidth * s, img.naturalHeight * s); g.restore();
  }
  function text(g, s, x, y, font, col, align = 'left') { g.font = font; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); }
  function chip(g, s, x, y, th, pop = 1) {
    g.save(); g.translate(x, y); g.scale(pop, pop);
    g.font = '800 18px Montserrat, sans-serif'; const w = Math.max(70, g.measureText(s).width + 26);
    g.shadowColor = th.glow; g.shadowBlur = 10 * pop;
    g.fillStyle = th === ORI ? '#eafcff' : '#fff1d6'; g.strokeStyle = th.glow; g.lineWidth = 2.5;
    g.beginPath(); g.roundRect(-w / 2, -17, w, 34, 9); g.fill(); g.stroke(); g.shadowBlur = 0;
    text(g, s, 0, 1, '800 18px Montserrat, sans-serif', th === ORI ? '#063a52' : '#5a2a00', 'center'); g.restore();
  }
  function pill(g, s, x, y, col, bg = 'rgba(10,12,24,.88)', size = 12.5) {
    g.font = `700 ${size}px Jost, sans-serif`; const w = g.measureText(s).width + 16;
    g.fillStyle = bg; g.strokeStyle = col; g.lineWidth = 1.5; g.beginPath(); g.roundRect(x - w / 2, y - size * .9, w, size * 1.8, size * .9); g.fill(); g.stroke();
    text(g, s, x, y + 1, `700 ${size}px Jost, sans-serif`, col, 'center');
  }
  // small line glyphs, drawn in the panel's glow colour
  function glyph(g, kind, cx, cy, col, t) {
    g.save(); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2.2; g.lineCap = 'round'; g.lineJoin = 'round';
    if (kind === 'pad' || kind === 'p2') {
      g.beginPath(); g.moveTo(cx - 22, cy - 9); g.quadraticCurveTo(cx, cy - 15, cx + 22, cy - 9); g.quadraticCurveTo(cx + 32, cy + 14, cx + 18, cy + 13); g.quadraticCurveTo(cx + 10, cy + 3, cx, cy + 3);
      g.quadraticCurveTo(cx - 10, cy + 3, cx - 18, cy + 13); g.quadraticCurveTo(cx - 32, cy + 14, cx - 22, cy - 9); g.stroke();
      g.beginPath(); g.moveTo(cx - 17, cy - 3); g.lineTo(cx - 9, cy - 3); g.moveTo(cx - 13, cy - 7); g.lineTo(cx - 13, cy + 1); g.stroke();
      [[12, -6], [17, -2], [12, 2], [7, -2]].forEach(([dx, dy]) => { g.beginPath(); g.arc(cx + dx, cy + dy, 1.8, 0, TAU); g.fill(); });
      if (kind === 'p2') text(g, 'P2', cx + 40, cy + 2, '800 11px Montserrat, sans-serif', col, 'center');
    } else if (kind === 'brain') {
      g.beginPath(); g.roundRect(cx - 15, cy - 13, 30, 26, 6); g.stroke();
      [-8, 0, 8].forEach(d => { g.beginPath(); g.moveTo(cx + d, cy - 13); g.lineTo(cx + d, cy - 19); g.moveTo(cx + d, cy + 13); g.lineTo(cx + d, cy + 19); g.moveTo(cx - 15, cy + d * .8); g.lineTo(cx - 21, cy + d * .8); g.moveTo(cx + 15, cy + d * .8); g.lineTo(cx + 21, cy + d * .8); g.stroke(); });
      text(g, 'AI', cx, cy + 1, '800 12px Montserrat, sans-serif', col, 'center');
    } else if (kind === 'vel') {
      g.beginPath(); g.moveTo(cx - 24, cy + 12); g.quadraticCurveTo(cx - 4, cy - 26, cx + 22, cy - 2); g.stroke();
      g.beginPath(); g.moveTo(cx + 22, cy - 2); g.lineTo(cx + 12, cy - 4); g.lineTo(cx + 19, cy - 11); g.closePath(); g.fill();
      g.beginPath(); g.arc(cx - 24, cy + 12, 3, 0, TAU); g.fill();
    } else if (kind === 'film') {
      g.beginPath(); g.roundRect(cx - 34, cy - 14, 68, 28, 4); g.stroke();
      for (let i = 0; i < 3; i++) { const fx = cx - 22 + i * 22; fit(g, ART.ori, fx, cy, 16, 22, .55 + .15 * i); }
    }
    g.restore();
  }
  function card(g, n, th, v, glow, t, dim) {
    const { x, y, w, h } = n;
    g.save(); g.globalAlpha = dim ? .55 : 1;
    if (glow > 0) { g.shadowColor = th.glow; g.shadowBlur = 26 * glow; }
    g.fillStyle = th.card; g.strokeStyle = glow > 0 ? th.glow : th.edge; g.lineWidth = 1.6 + 1.6 * glow;
    if (n.ghost) g.setLineDash([6, 5]);
    g.beginPath(); g.roundRect(x, y, w, h, 12); g.fill(); g.stroke(); g.setLineDash([]); g.shadowBlur = 0;
    // header strip
    text(g, n.title, x + 12, y + 16, '700 13.5px Montserrat, sans-serif', th.ink);
    g.fillStyle = th.edge; g.fillRect(x + 12, y + 28, w - 24, 1);
    const cx = x + w / 2, body = y + 30, room = h - 30, my = body + room / 2;
    const subY = y + h - 13;
    if (n.icon === 'abilities') {
      ['ab-doublejump', 'ab-dash', 'ab-bash'].forEach((k, i) => fit(g, ART[k], x + w / 2 + (i - 1) * 50, my - 7, 44, 44));
      text(g, n.sub, cx, subY, 'italic 500 12px Jost, sans-serif', th.sub, 'center');
    } else if (n.icon === 'ori') {
      const air = v === 'air', bob = Math.sin(t * 2.4) * 2 - (air ? 10 : 0);
      if (air) { g.save(); g.shadowColor = th.glow; g.shadowBlur = 18; }
      fit(g, ART.ori, cx - 34, my - 4 + bob, 40, 52);
      if (air) g.restore();
      text(g, n.sub, cx + 28, my - 4, 'italic 500 12px Jost, sans-serif', th.sub, 'center');
      text(g, air ? 'airborne' : 'grounded', cx + 28, my + 14, '700 11px Jost, sans-serif', air ? th.glow : th.sub, 'center');
    } else if (n.icon === 'knight' || n.icon === 'knight2') {
      const sx = x + 8, sy = body + 4, sw = w - 16, sh = room - (n.sub ? 30 : 12);
      g.save(); g.beginPath(); g.roundRect(sx, sy, sw, sh, 6); g.clip();
      cover(g, n.icon === 'knight' ? ART['nr-screen'] : ART['nr-screen2'], sx, sy, sw, sh);
      g.fillStyle = 'rgba(10,5,0,.35)'; g.fillRect(sx, sy, sw, sh);
      const jump = v === 'jump', img = n.icon === 'knight' ? (jump ? ART['knight-jump'] : ART['knight-idle']) : (jump ? ART['knight-jump-p2'] : ART['knight-p2']);
      fit(g, img, sx + sw / 2, sy + sh / 2 + (jump ? -6 : 4), sw - 10, sh - 10);
      g.restore();
      g.strokeStyle = th.edge; g.lineWidth = 1.2; g.beginPath(); g.roundRect(sx, sy, sw, sh, 6); g.stroke();
      if (n.sub) text(g, n.sub, cx, subY, 'italic 500 12px Jost, sans-serif', th.sub, 'center');
    } else if (n.value != null && v != null) {
      const pop = 1 + .18 * glow;
      chip(g, v, cx, n.sub ? my - 8 : my, th, pop);
      if (n.sub) text(g, n.sub, cx, subY, 'italic 500 12px Jost, sans-serif', th.sub, 'center');
    } else if (n.icon) {
      glyph(g, n.icon, cx, my - 8, th.glow, t);
      text(g, n.sub, cx, subY, 'italic 500 12px Jost, sans-serif', th.sub, 'center');
    }
    g.restore();
  }
  function orb(g, p, col, t) {
    g.save(); const r = 7 + Math.sin(t * 18) * 1.2;
    const grd = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 3.2); grd.addColorStop(0, '#fff'); grd.addColorStop(.25, col); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(p[0], p[1], r * 3.2, 0, TAU); g.fill(); g.restore();
  }
  function arrowHead(g, p, ang, col, s = 10) {
    g.fillStyle = col; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0] - s * Math.cos(ang - .42), p[1] - s * Math.sin(ang - .42)); g.lineTo(p[0] - s * Math.cos(ang + .42), p[1] - s * Math.sin(ang + .42)); g.closePath(); g.fill();
  }
  function panelBg(g, P, img, tint, ring) {
    g.save(); g.beginPath(); g.roundRect(P.x, 0, P.w, H, 16); g.clip();
    g.fillStyle = tint[0]; g.fillRect(P.x, 0, P.w, H);
    cover(g, img, P.x, 0, P.w, H);
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, tint[1]); gr.addColorStop(.45, tint[2]); gr.addColorStop(1, tint[3]);
    g.fillStyle = gr; g.fillRect(P.x, 0, P.w, H);
    g.restore();
    g.strokeStyle = ring; g.lineWidth = 2; g.beginPath(); g.roundRect(P.x + 1, 1, P.w - 2, H - 2, 16); g.stroke();
  }
  function header(g, P, tag, name, th, portrait, t) {
    g.save(); g.beginPath(); g.arc(P.x + 30, 26, 19, 0, TAU); g.fillStyle = 'rgba(0,0,0,.45)'; g.fill(); g.strokeStyle = th.glow; g.lineWidth = 2; g.stroke(); g.clip();
    fit(g, portrait, P.x + 30, portrait === ART.ori ? 33 : 40, portrait === ART.ori ? 34 : 44, portrait === ART.ori ? 48 : 62); g.restore();
    g.font = '800 12px Montserrat, sans-serif'; const tw = g.measureText(tag).width + 18;
    g.fillStyle = th.glow; g.beginPath(); g.roundRect(P.x + 58, 14, tw, 24, 12); g.fill();
    text(g, tag, P.x + 58 + tw / 2, 27, '800 12px Montserrat, sans-serif', th === ORI ? '#052a3c' : '#3a1a00', 'center');
    text(g, name, P.x + 66 + tw, 27, '800 19px Montserrat, sans-serif', '#fff');
  }

  let archApi;
  canvasDemo('arch', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, acts: [], flow: [], key: '' };
    // a 2x backing store keeps the art crisp; the GIF recorder brings its own (cv.__hidpi), so it is skipped there
    const K = cv.__hidpi ? 1 : 2; if (K > 1) { cv.width = W * K; cv.height = H * K; }
    const tourBtn = $(s, '.ar-tour');
    const rebuild = () => { st.flow = XR.script(AR_N, st.tour ? AR_TOUR : st.acts, AR_RULES); };
    const free = () => { st.held = false; if (!st.tour) return; st.tour = false; tourBtn.classList.remove('on'); st.t = 0; st.acts = []; rebuild(); };
    $$(s, '.ar-act').forEach(b => b.onclick = () => { free(); st.acts.push({ at: Math.max(st.t, XR.end(st.flow)) + .05, type: b.dataset.a }); rebuild(); });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.held = false; tourBtn.classList.add('on'); rebuild(); };
    $(s, '.ar-reset').onclick = () => { st.tour = true; free(); };
    rebuild();
    function render() {
      const t = st.t; g.setTransform(K, 0, 0, K, 0, 0); g.clearRect(0, 0, W, H);
      const { val, lit } = XR.replay(AR_N, st.flow, t);
      // panels: Ori's forest glow, No Rest's firelit grit
      panelBg(g, LP, ART['ori-forest'], ['#06223a', 'rgba(3,18,36,.18)', 'rgba(4,26,46,.34)', 'rgba(2,12,26,.8)'], 'rgba(143,233,255,.6)');
      panelBg(g, RP, ART['nr-bg'], ['#1c0d05', 'rgba(20,8,2,.2)', 'rgba(24,10,4,.4)', 'rgba(12,5,2,.82)'], 'rgba(255,181,71,.55)');
      header(g, LP, 'MUPPET', 'Ori and the Blind Forest', ORI, ART.ori, t);
      header(g, RP, 'PUPPET', 'No Rest for the Wicked', WK, ART['knight-idle'], t);
      // the SeinPrefab: everything lives inside one object
      g.save(); g.shadowColor = ORI.glow; g.shadowBlur = 16 + 6 * Math.sin(t * 2);
      g.strokeStyle = 'rgba(143,233,255,.85)'; g.lineWidth = 2.5; g.fillStyle = 'rgba(40,140,190,.12)';
      g.beginPath(); g.roundRect(14, 56, 484, 388, 16); g.fill(); g.stroke(); g.restore();
      g.font = '800 13px Montserrat, sans-serif'; const pw = g.measureText('SeinPrefab: one object').width + 22;
      g.fillStyle = '#062a3e'; g.strokeStyle = ORI.glow; g.lineWidth = 1.5; g.beginPath(); g.roundRect(30, 45, pw, 24, 12); g.fill(); g.stroke();
      text(g, 'SeinPrefab: one object', 30 + pw / 2, 57.5, '800 13px Montserrat, sans-serif', ORI.ink, 'center');
      text(g, 'outside the prefab', 256, 576, 'italic 600 12px Jost, sans-serif', 'rgba(169,227,245,.8)', 'center');
      // Photon Quantum: three visibly separate layers
      const lanes = [
        { x: 534, w: 138, l1: 'UNITY', l2: 'input', fill: 'rgba(28,38,62,.62)', edge: '#8fa8d8', ink: '#cfdcff' },
        { x: 680, w: 196, l1: 'PHOTON QUANTUM', l2: 'deterministic simulation', fill: 'rgba(90,40,8,.50)', edge: '#ffb547', ink: '#ffd89a', q: true },
        { x: 880, w: 154, l1: 'UNITY', l2: 'view', fill: 'rgba(28,38,62,.62)', edge: '#8fa8d8', ink: '#cfdcff' },
      ];
      lanes.forEach(L => {
        g.save(); if (L.q) { g.shadowColor = '#ffb547'; g.shadowBlur = 14; }
        g.fillStyle = L.fill; g.strokeStyle = L.edge; g.lineWidth = L.q ? 2.5 : 1.5;
        g.beginPath(); g.roundRect(L.x, 76, L.w, H - 82, 12); g.fill(); g.stroke(); g.restore();
        if (L.q) { // a fine hatch marks the simulation as its own layer
          g.save(); g.beginPath(); g.roundRect(L.x, 76, L.w, H - 82, 12); g.clip(); g.strokeStyle = 'rgba(255,181,71,.07)'; g.lineWidth = 6;
          for (let k = -H; k < L.w + H; k += 22) { g.beginPath(); g.moveTo(L.x + k, 76); g.lineTo(L.x + k - H, 76 + H); g.stroke(); } g.restore();
        }
        text(g, L.l1, L.x + L.w / 2, 90, '800 11.5px Montserrat, sans-serif', L.ink, 'center');
        text(g, L.l2, L.x + L.w / 2, 105, 'italic 600 11.5px Jost, sans-serif', L.ink, 'center');
      });
      // the lesson's chain, lit by whichever hop is running
      const live = st.flow.filter(f => f.from && t >= f.t && t <= f.t + f.dur + .25);
      const on = new Set(live.flatMap(f => f.chain || [])), skip = live.some(f => f.skip);
      let cx = 560; g.font = '700 12px Montserrat, sans-serif';
      const widths = CHAIN.map(c => g.measureText(c).width + 18), total = widths.reduce((a, b) => a + b, 0) + 22 * (CHAIN.length - 1);
      cx = RP.x + RP.w - 12 - total;
      CHAIN.forEach((c, i) => {
        const w = widths[i], lit2 = on.has(c), skipped = skip && (c === 'Input' || c === 'Device');
        g.save(); if (lit2) { g.shadowColor = WK.glow; g.shadowBlur = 12; }
        g.fillStyle = lit2 ? WK.glow : 'rgba(30,14,6,.8)'; g.strokeStyle = skipped ? '#ff6b6b' : WK.edge; g.lineWidth = 1.4;
        g.beginPath(); g.roundRect(cx, 48, w, 20, 10); g.fill(); g.stroke(); g.restore();
        text(g, c, cx + w / 2, 58.5, '700 12px Montserrat, sans-serif', lit2 ? '#3a1a00' : skipped ? '#ff9b9b' : WK.sub, 'center');
        if (skipped) { g.strokeStyle = '#ff6b6b'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(cx + 6, 58); g.lineTo(cx + w - 6, 58); g.stroke(); }
        if (i < CHAIN.length - 1) { g.strokeStyle = WK.sub; g.lineWidth = 1.6; g.beginPath(); g.moveTo(cx + w + 5, 58); g.lineTo(cx + w + 16, 58); g.stroke(); arrowHead(g, [cx + w + 18, 58], 0, WK.sub, 6); }
        cx += w + 22;
      });
      if (skip) pill(g, 'AI skips the device', 602, 248, '#ff9b9b', 'rgba(40,8,8,.9)', 12);
      // connectors: every hop of the flow, faint until used, glowing while a signal rides it
      const seen = new Set();
      st.flow.forEach(f => {
        if (!f.from || f.bounce) return;
        const key = f.from + '>' + f.to; if (seen.has(key)) return; seen.add(key);
        const th = f.from[0] === 'm' ? ORI : WK, used = st.flow.some(x => x.from === f.from && x.to === f.to && t >= x.t);
        const active = st.flow.some(x => x.from === f.from && x.to === f.to && t >= x.t && t <= x.t + x.dur + .3);
        const col = f.loop && used ? '#ff6b6b' : th.glow, [p0, p1, via] = hopPath(f);
        g.save(); g.globalAlpha = active ? 1 : used ? .75 : .35; g.strokeStyle = col; g.lineWidth = active ? 3.2 : 2.2;
        if (!used) g.setLineDash([5, 6]); else if (active) { g.setLineDash([10, 6]); g.lineDashOffset = -t * 40; }
        if (active) { g.shadowColor = col; g.shadowBlur = 10; }
        g.beginPath(); g.moveTo(p0[0], p0[1]); via ? g.quadraticCurveTo(via[0], via[1], p1[0], p1[1]) : g.lineTo(p1[0], p1[1]); g.stroke(); g.setLineDash([]);
        const q = at(p0, p1, via, .95); arrowHead(g, p1, Math.atan2(p1[1] - q[1], p1[0] - q[0]), col, 11); g.restore();
      });
      // cards
      AR_N.forEach(n => {
        const ago = lit[n.id], glow = ago == null ? 0 : clamp(1 - ago / .9);
        card(g, n, n.side === 'L' ? ORI : WK, val[n.id], glow, t, n.ghost && glow === 0);
      });
      // the muppet's risk: flag the loop while it runs
      const loop = st.flow.find(f => f.loop && t >= f.t - .2 && t <= f.t + f.dur + 1.2);
      if (loop) pill(g, '⟳ circular feedback', 256, 200, '#ffd0d0', 'rgba(150,20,20,.92)', 13.5);
      // signals in flight
      st.flow.forEach(f => {
        if (!f.from || t < f.t || t > f.t + f.dur) return;
        const th = f.from[0] === 'm' ? ORI : WK, raw = clamp((t - f.t) / f.dur), k = f.bounce ? (f.stop || .78) * ease(clamp(raw / .7)) : ease(raw);
        const [p0, p1, via] = hopPath(f), p = at(p0, p1, via, k);
        if (f.bounce) { g.save(); g.globalAlpha = .6; g.strokeStyle = th.glow; g.setLineDash([4, 5]); g.lineWidth = 2; g.beginPath(); for (let i = 0; i <= 20; i++) { const q = at(p0, p1, via, k * i / 20); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); } g.stroke(); g.restore(); }
        for (let i = 4; i >= 1; i--) { const q = at(p0, p1, via, Math.max(0, k - i * .035)); g.save(); g.globalAlpha = .18 * (5 - i) / 4; orb(g, q, th.glow, t); g.restore(); }
        orb(g, p, th.glow, t);
        if (f.label && !(f.bounce && raw > .7)) pill(g, f.label, p[0], p[1] - 22, th.ink, 'rgba(8,10,20,.9)');
        if (f.bounce && raw > .7) {
          g.save(); g.strokeStyle = '#ff8080'; g.lineWidth = 2.5; g.shadowColor = '#ff4040'; g.shadowBlur = 12; const r = 8 + 10 * clamp((raw - .7) / .3);
          g.beginPath(); g.arc(p[0], p[1] - 6, r, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.restore();
          pill(g, '✕ ' + f.bounce, p[0], p[1] + 20, '#ffd0d0', 'rgba(150,20,20,.95)', 13);
        }
      });
      const key = JSON.stringify(val) + Math.floor(t * 2);
      if (key === st.key) return; st.key = key;
      const ph = st.tour ? AR_PH.filter(q => t >= q[0]).at(-1)[1] : 'Muppets are quick to build and mix everything in one place. Puppets separate input, controller, pawn and view: more thought up front, and trickier to debug, but AI control and multiplayer drop in.';
      say($(s, '.ar-out'), ph);
      say($(s, '.ar-stats'), `<div class="ori"><b>1</b><span>object holds it all in the muppet</span></div><div class="wk"><b>3</b><span>layers in the puppet: input, simulation, view</span></div>`);
    }
    archApi = { seek(t) { st.held = true; if (!st.tour) { st.tour = true; tourBtn.classList.add('on'); rebuild(); } st.t = t; render(); }, dur: () => AR_DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > AR_DUR) st.t = 0; render(); };
  });

  const API = { jumps: () => jumpsApi, arch: () => archApi };
  window.__seek = (t, w) => API[w]().seek(t);
  window.__dur = w => API[w]().dur();
})();
