/* Puppet signal tracer (RGF C2 M5, deck slides 17-62). Slide 1: three X-ray boxes (Input, Controller, Pawn, drawn with
   ../shared/xray.js) beside a small side-view puppet, and the pawn's mode-by-action flag table under it. Every press, source
   swap, pawn swap or flag edit is an action at a time; simulate() turns the whole action list into XR hops plus the puppet's
   moves, so the picture is a pure function of time and GIFs can seek. Slide 2: modes vs actions for a few games. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, TAU = Math.PI * 2;
  const clone = o => JSON.parse(JSON.stringify(o));
  const ACTS = ['jump', 'attack', 'swim'], MODES = ['ground', 'air', 'water'];
  const DEFAULT = { ground: { jump: 'allow', attack: 'allow', swim: 'allow' }, air: { jump: 'queue', attack: 'allow', swim: 'refuse' }, water: { jump: 'allow', attack: 'refuse', swim: 'allow' } };
  const NEXT = { allow: 'queue', queue: 'refuse', refuse: 'allow' };
  const HOP = .22, SWING = .45;
  const PAWN = {
    hero: { name: 'Hero', ctrl: 'Controller', act: { jump: 'Jump', attack: 'Attack', swim: 'Swim' }, mode: { ground: 'Grounded', air: 'Airborne', water: 'Swimming' },
      noun: { jump: "Jumping isn't", attack: "Attacks aren't", swim: "Swimming isn't" }, it: { ground: 'on the ground', air: 'in the air', water: 'swimming' }, air: 1.1, jh: 92, walk: .75 },
    tank: { name: 'Tank', ctrl: 'TankController', act: { jump: 'Hop', attack: 'Fire', swim: 'Ford' }, mode: { ground: 'Grounded', air: 'Airborne', water: 'Fording' },
      noun: { jump: "Hopping isn't", attack: "Firing isn't", swim: "Fording isn't" }, it: { ground: 'on the ground', air: 'in the air', water: 'fording the river' }, air: .8, jh: 40, walk: 1.1 },
  };
  const SRC = {
    kb: { name: 'Keyboard', key: { jump: 'J', attack: 'K', swim: 'S' } },
    pad: { name: 'Gamepad', key: { jump: 'A', attack: 'X', swim: 'B' } },
    bot: { name: 'Bot', key: { jump: 'Jump', attack: 'Attack', swim: 'Swim' } },
    replay: { name: 'Replay', key: { jump: 'J (rec)', attack: 'K (rec)', swim: 'S (rec)' } },
  };
  // scene geometry (left column of the canvas)
  const SW = 380, SH = 290, GY = 222, EDGE = 222, WY = 236, SHORE = 108, POOL = 305;

  /* ---------- the simulation: actions in, hops and puppet moves out ---------- */
  function simulate(acts) {
    const S = { mode: 'ground', cfg: { src: 'kb', pawn: 'hero', flags: clone(DEFAULT) }, queued: null, land: null };
    const out = { flow: [], moves: [{ t0: -1, t1: -1, x0: SHORE, x1: SHORE, h0: 0, jh: 0, arc: false }], swings: [], refusals: [], bubbles: [], queues: [], cfgs: [{ t: -1, cfg: clone(S.cfg) }], modes: [{ t: -1, mode: 'ground' }], log: [], spawns: [] };
    const P = () => PAWN[S.cfg.pawn];
    const set = (t, o) => out.flow.push({ t, dur: .01, set: o });
    const hop = (t, dur, from, to, o = {}) => out.flow.push({ t, dur, from, to, kind: 'command', ...o });
    const log = (t, text, col, mode, act) => out.log.push({ t, text, col, mode, act });
    const posAt = t => at(out.moves, t);
    const setMode = (t, m) => { S.mode = m; out.modes.push({ t, mode: m }); set(t, { pawn: P().mode[m] }); };
    const changed = t => { if (S.queued) release(t, false); };
    function land() {
      const L = S.land.t, to = S.land.mode; S.land = null; setMode(L, to);
      if (S.queued) release(L, true);
    }
    function release(t, landed) {
      const q = S.queued, f = S.cfg.flags[S.mode][q.act], p = P();
      if (f === 'queue') return;
      S.queued = null; out.queues.at(-1).t1 = t;
      hop(t, .16, 'pawn', 'ctrl', { kind: 'system', label: landed ? 'Landed' : 'Mode: ' + p.mode[S.mode], via: [735, 392] });
      const d = t + .16;
      set(d, { ctrl: 'Idle' });
      if (f === 'allow') { hop(d, HOP, 'ctrl', 'pawn', { label: p.act[q.act] }); log(d, `${p.act[q.act]} leaves the queue and fires.`, 'g', S.mode, q.act); perform(q.act, d, d + HOP); }
      else refuse(q.act, d);
    }
    function advance(t) { while (S.land && S.land.t <= t) land(); }
    function perform(act, d, e) {
      const p = P(), at = posAt(e);
      if (act === 'jump') {
        const x1 = S.mode === 'water' ? SHORE : S.land?.mode === 'water' ? POOL : at.x;
        out.moves.push({ t0: e, t1: e + p.air, x0: at.x, x1, h0: at.h, jh: p.jh, arc: true });
        const toMode = S.land?.mode === 'water' ? 'water' : 'ground';
        S.land = { t: e + p.air, mode: toMode };
        if (S.mode !== 'air') { setMode(d, 'air'); changed(d); }
      } else if (act === 'attack') {
        out.swings.push({ t: e, pawn: S.cfg.pawn, x: at.x });
      } else if (act === 'swim') {
        if (S.mode === 'ground') { out.moves.push({ t0: e, t1: e + p.walk, x0: at.x, x1: POOL, h0: 0, jh: 0 }); setMode(d, 'water'); changed(d); }
        else if (S.mode === 'water') { out.moves.push({ t0: e, t1: e + p.walk, x0: at.x, x1: SHORE, h0: 0, jh: 0 }); setMode(d, 'ground'); changed(d); }
        else if (S.land) { S.land.mode = 'water'; const m = out.moves.at(-1); if (m.arc) m.x1 = POOL; }
      }
    }
    function refuse(act, d) {
      const p = P(), name = p.act[act];
      hop(d, HOP * 1.9, 'ctrl', 'pawn', { label: name, bounce: 'refused' });
      out.refusals.push({ t: d + HOP * 1.4 });
      out.bubbles.push({ t: d, text: `It's ${p.it[S.mode]}. ${p.noun[act]} allowed right now.`, col: '#cc0000' });
      log(d, `${name} refused: ${p.mode[S.mode]} forbids it.`, 'r', S.mode, act);
    }
    function press(a) {
      const p = P(), name = p.act[a.act];
      set(a.at, { key: SRC[S.cfg.src].key[a.act] });
      hop(a.at, HOP, 'input', 'ctrl', { label: name });
      const d = a.at + HOP; advance(d);
      const f = S.cfg.flags[S.mode][a.act];
      if (f === 'allow') { hop(d, HOP, 'ctrl', 'pawn', { label: name }); log(d, `${name}: ${p.mode[S.mode]} allows it.`, 'g', S.mode, a.act); perform(a.act, d, d + HOP); }
      else if (f === 'queue') {
        if (S.queued) out.queues.at(-1).t1 = d;
        S.queued = { act: a.act, t: d }; out.queues.push({ t0: d, t1: Infinity, act: a.act, pawn: S.cfg.pawn });
        set(d, { ctrl: 'Queued: ' + name });
        const m = out.moves.at(-1), rising = S.mode === 'air' && m.arc && (d - m.t0) / (m.t1 - m.t0) < .5;
        const where = S.mode === 'air' ? (rising ? 'still rising' : 'falling') : p.it[S.mode];
        out.bubbles.push({ t: d, text: `Oh… you're ${where}… you can't ${name.toLowerCase()} yet…`, col: '#9a5a06' });
        log(d, `${name} queued: ${p.mode[S.mode]} makes it wait.`, 'y', S.mode, a.act);
      } else refuse(a.act, d);
    }
    function cfg(a) {
      if (a.src) S.cfg.src = a.src;
      if (a.flags) S.cfg.flags = clone(a.flags);
      if (a.flag) S.cfg.flags[a.flag[0]][a.flag[1]] = a.flag[2];
      if (a.pawn && a.pawn !== S.cfg.pawn) {
        S.cfg.pawn = a.pawn; S.land = null;
        if (S.queued) { S.queued = null; out.queues.at(-1).t1 = a.at; }
        out.moves.push({ t0: a.at, t1: a.at, x0: SHORE, x1: SHORE, h0: 0, jh: 0 });
        out.spawns.push(a.at);
        setMode(a.at, 'ground'); set(a.at, { ctrl: 'Idle', key: '' });
      }
      out.cfgs.push({ t: a.at, cfg: clone(S.cfg), flag: a.flag });
    }
    acts.slice().sort((a, b) => a.at - b.at).forEach(a => {
      advance(a.type === 'press' ? a.at + HOP : a.at);
      if (a.type === 'press') press(a); else cfg(a);
    });
    advance(Infinity);
    return out;
  }
  // last entry with t (or t0) at or before t
  const lastAt = (list, t, k = 't') => { let r = list[0]; for (const e of list) if (e[k] <= t) r = e; return r; };
  // the puppet's x and height above the ground at time t
  function at(moves, t) {
    const m = lastAt(moves, t, 't0'), k = m.t1 > m.t0 ? clamp((t - m.t0) / (m.t1 - m.t0)) : 1;
    const x = m.arc ? lerp(m.x0, m.x1, k) : lerp(m.x0, m.x1, ease(k));
    const h = m.arc ? Math.max(0, m.h0 * (1 - k) + 4 * m.jh * k * (1 - k)) : 0;
    return { x, h, m, k };
  }

  /* ---------- drawing the puppets ---------- */
  function hero(g, x, y, pose, swing) {
    g.save(); g.translate(x, y);
    if (pose === 'swim') g.rotate(1.15);
    g.lineCap = 'round'; g.lineJoin = 'round';
    // legs
    g.strokeStyle = '#2a3566'; g.lineWidth = 6; g.beginPath();
    if (pose === 'jump') { g.moveTo(-4, -22); g.lineTo(-10, -12); g.lineTo(-4, -4); g.moveTo(4, -22); g.lineTo(10, -10); g.lineTo(6, -2); }
    else if (pose === 'swim') { g.moveTo(-3, -22); g.lineTo(-7, 0); g.moveTo(3, -22); g.lineTo(8, -2); }
    else { g.moveTo(-4, -22); g.lineTo(-6, 0); g.moveTo(4, -22); g.lineTo(6, 0); }
    g.stroke();
    // body and head
    g.fillStyle = '#2ea3dc'; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.roundRect(-10, -48, 20, 28, 6); g.fill(); g.stroke();
    g.fillStyle = '#7a4a1e'; g.fillRect(-10, -27, 20, 4);
    g.fillStyle = '#f2c9a0'; g.beginPath(); g.arc(0, -59, 11, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#6b3e1f'; g.beginPath(); g.arc(0, -61, 11, Math.PI * 1.05, Math.PI * 1.95); g.fill();
    g.fillStyle = C.navy; g.beginPath(); g.arc(5, -59, 1.8, 0, TAU); g.fill();
    // sword arm: resting, or sweeping from overhead to the front
    const a = swing == null ? .9 : lerp(-2.3, .7, ease(swing));
    g.translate(3, -42); g.rotate(a);
    g.strokeStyle = '#f2c9a0'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 0); g.lineTo(14, 0); g.stroke();
    g.strokeStyle = '#ffb951'; g.lineWidth = 4; g.beginPath(); g.moveTo(14, -5); g.lineTo(14, 5); g.stroke();
    g.strokeStyle = '#b9bccb'; g.lineWidth = 4; g.beginPath(); g.moveTo(16, 0); g.lineTo(44, 0); g.stroke();
    g.restore();
    if (swing != null && swing > .15 && swing < 1) {
      g.save(); g.globalAlpha = .55 * (1 - swing); g.strokeStyle = '#ffffff'; g.lineWidth = 7;
      g.beginPath(); g.arc(x + 3, y - 42, 46, -2.1, lerp(-2.1, .7, ease(swing))); g.stroke(); g.restore();
    }
  }
  function tank(g, x, y, fire) {
    g.save(); g.translate(x, y);
    g.fillStyle = '#3b3f52'; g.beginPath(); g.roundRect(-36, -14, 72, 14, 7); g.fill();
    g.fillStyle = '#8b8fa8'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(-26 + i * 13, -7, 4.5, 0, TAU); g.fill(); }
    g.fillStyle = '#6b8f3a'; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.roundRect(-30, -30, 60, 17, 4); g.fill(); g.stroke();
    g.beginPath(); g.roundRect(-14, -44, 28, 15, 6); g.fill(); g.stroke();
    const rec = fire != null && fire < .3 ? (1 - fire / .3) * 5 : 0;
    g.fillStyle = '#4e6b2a'; g.fillRect(12 - rec, -40, 30, 6); g.strokeRect(12 - rec, -40, 30, 6);
    g.restore();
  }

  /* ---------- slide 1: the tracer ---------- */
  const NODES = [
    { id: 'input', x: 430, y: 34, w: 250, h: 128, part: 'entity', title: 'Input: Keyboard', art: (g, x, y) => inputArt(g, x, y) },
    { id: 'ctrl', x: 430, y: 220, w: 250, h: 144, part: 'entity', title: 'Controller', value: 'Idle', sub: 'reads the mode, checks its flags' },
    { id: 'pawn', x: 430, y: 424, w: 250, h: 144, part: 'entity', title: 'Pawn: Hero', value: 'Grounded', sub: 'acts, and reports its mode' },
  ];
  let CUR = { src: 'kb', key: '' };
  function inputArt(g, x, y) {
    const src = CUR.src, keys = SRC[src].key;
    g.save();
    if (src === 'kb' || src === 'replay') {
      ['jump', 'attack', 'swim'].forEach((a, i) => {
        const kx = x - 96 + i * 34, on = CUR.key && CUR.key[0] === keys[a][0];
        g.fillStyle = on ? '#ffb951' : '#fffaf0'; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.roundRect(kx - 14, y - 14, 28, 28, 5); g.fill(); g.stroke();
        g.fillStyle = C.navy; g.font = '700 14px Montserrat, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(keys[a][0], kx, y + 1);
      });
      if (src === 'replay') { g.fillStyle = '#cc0000'; g.beginPath(); g.arc(x - 108, y - 26, 5, 0, TAU); g.fill(); g.font = '700 11px Jost, sans-serif'; g.textAlign = 'left'; g.fillText('recorded', x - 100, y - 25); }
    } else if (src === 'pad') {
      g.fillStyle = C.navy; g.font = '46px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🎮', x - 62, y);
    } else {
      // a little bot head
      g.fillStyle = '#b9bccb'; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.roundRect(x - 84, y - 18, 44, 34, 8); g.fill(); g.stroke();
      g.fillStyle = '#2ea3dc'; g.beginPath(); g.arc(x - 72, y - 2, 5, 0, TAU); g.arc(x - 52, y - 2, 5, 0, TAU); g.fill();
      g.strokeStyle = C.navy; g.beginPath(); g.moveTo(x - 62, y - 18); g.lineTo(x - 62, y - 28); g.stroke(); g.fillStyle = '#e5322d'; g.beginPath(); g.arc(x - 62, y - 30, 4, 0, TAU); g.fill();
    }
    if (CUR.key) XR.stateChip(g, x + 58, y, CUR.key, 0, 34);
    else { g.font = 'italic 600 12px Montserrat, sans-serif'; g.fillStyle = '#5d618c'; g.textAlign = 'center'; g.fillText('waiting for a press', x + 58, y); }
    g.restore();
  }
  // tour: presses, a flag edit, a source swap and a pawn swap
  const press = (at, act) => ({ at, type: 'press', act });
  const TOUR = [
    press(.6, 'jump'), press(2.4, 'jump'), press(3.45, 'jump'), press(6.2, 'attack'), press(7.3, 'swim'), press(9.2, 'attack'),
    { at: 11, type: 'cfg', flag: ['water', 'attack', 'allow'] }, press(11.8, 'attack'),
    { at: 13.4, type: 'cfg', src: 'pad' }, press(14, 'jump'),
    { at: 15.9, type: 'cfg', flag: ['water', 'attack', 'refuse'] },
    { at: 16.3, type: 'cfg', pawn: 'tank' }, press(16.9, 'jump'), press(18.3, 'attack'), press(19.4, 'swim'), press(21, 'attack'),
    { at: 23.4, type: 'cfg', pawn: 'hero', src: 'kb' },
  ];
  const TOUR_DUR = 24.5;
  const PHASES = [
    [0, 'Press Jump on the ground. Input sends Jump, the controller checks the pawn\'s mode, Grounded allows it, and the pawn jumps.'],
    [2.3, 'Jump again, then press Jump a second time while the pawn is falling.'],
    [3.6, 'Airborne queues jumps. The controller says "Oh… you\'re falling… you can\'t jump yet…" and holds the command.'],
    [3.95, 'The pawn lands and reports it. The queued jump fires on landing, with no second press.'],
    [6, 'Attack on the ground is allowed. Swim walks the pawn into the pool, and its mode becomes Swimming.'],
    [9.1, 'Attack while swimming: the flag says refuse, so the signal bounces and the screen flashes. "It\'s swimming. Attacks aren\'t allowed right now."'],
    [10.9, 'Flip one flag: In water now allows Attack. Same input, same pawn, and the refusal is gone.'],
    [13.3, 'Swap the input source to a gamepad. The controller and pawn never notice: A means Jump, just as J did.'],
    [16.2, 'Swap the pawn: a TankController drives a tank. Same three boxes, different actions: Hop, Fire, Ford.'],
    [20.9, 'Fording forbids firing, so the tank\'s controller refuses, just as the hero\'s did.'],
  ];
  const BOT = [[.4, 'jump'], [1.25, 'jump'], [3.6, 'attack'], [4.4, 'swim'], [5.9, 'attack'], [7.1, 'jump'], [9.6, null]];

  let tracerApi;
  canvasDemo('tracer', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, acts: [], sim: null, rec: [], auto: null, padPrev: [], key: '' };
    const tourBtn = $(s, '.pt-tour'), out = $(s, '.pt-out');
    const resim = () => { st.sim = simulate(st.tour ? TOUR : st.acts); };
    const cfgNow = () => lastAt(st.sim.cfgs, st.t).cfg;
    const free = () => { st.held = false;
      if (!st.tour) return;
      const c = cfgNow();
      st.tour = false; tourBtn.classList.remove('on'); st.t = 0; st.auto = null;
      st.acts = [{ at: 0, type: 'cfg', src: c.src, pawn: c.pawn, flags: c.flags }]; resim();
    };
    const add = a => { st.acts.push(a); if (st.acts.length > 300) st.acts.splice(1, 1); resim(); };
    function doPress(act, from) {
      free();
      const src = cfgNow().src;
      if (from === 'key' && src === 'pad') add({ at: st.t, type: 'cfg', src: 'kb' });
      if (from === 'pad' && src !== 'pad') add({ at: st.t, type: 'cfg', src: 'pad' });
      if ((src === 'bot' || src === 'replay') && from !== 'auto' && from !== 'pad') { st.msg = `The ${SRC[src].name.toLowerCase()} is driving. Pick Keyboard or Gamepad to take over.`; st.key = ''; return; }
      if (from !== 'auto') { st.rec.push({ t: st.t, act }); if (st.rec.length > 12) st.rec.shift(); }
      st.msg = '';
      add({ at: st.t, type: 'press', act });
    }
    $$(s, '.pt-act').forEach(b => b.onclick = () => doPress(b.dataset.a, 'btn'));
    $$(s, '.pt-src .btn').forEach(b => b.onclick = () => { free(); st.msg = ''; add({ at: st.t, type: 'cfg', src: b.dataset.v }); });
    $$(s, '.pt-pawn .btn').forEach(b => b.onclick = () => { free(); add({ at: st.t, type: 'cfg', pawn: b.dataset.v }); });
    $(s, '.pt-reset').onclick = () => { st.tour = true; free(); st.acts = [{ at: 0, type: 'cfg', src: 'kb', pawn: 'hero', flags: DEFAULT }]; st.rec = []; resim(); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.held = false; tourBtn.classList.add('on'); resim(); };
    document.addEventListener('keydown', e => {
      if (!s.classList.contains('active') || e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
      const act = { KeyJ: 'jump', KeyK: 'attack', KeyS: 'swim' }[e.code]; if (!act) return;
      e.preventDefault(); doPress(act, 'key');
    });
    // flag cells: click to cycle allow, queue, refuse
    cv.addEventListener('click', e => {
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
      MODES.forEach((m, ri) => ACTS.forEach((a, ci) => {
        const c = cell(ri, ci); if (x < c.x || x > c.x + c.w || y < c.y || y > c.y + c.h) return;
        free(); add({ at: st.t, type: 'cfg', flag: [m, a, NEXT[cfgNow().flags[m][a]]] });
      }));
    });
    resim();

    function autoplay() {
      const src = cfgNow().src;
      if (src !== 'bot' && src !== 'replay') { st.auto = null; return; }
      if (!st.auto || st.auto.src !== src) st.auto = { src, base: st.t, i: 0 };
      const pat = src === 'replay' && st.rec.length ? st.rec.map(r => [r.t - st.rec[0].t + .4, r.act]).concat([[st.rec.at(-1).t - st.rec[0].t + 2.4, null]]) : BOT;
      for (let n = 0; n < 20; n++) {
        const [dt, act] = pat[st.auto.i % pat.length];
        if (st.t < st.auto.base + dt) break;
        if (act) add({ at: st.auto.base + dt, type: 'press', act });
        st.auto.i++;
        if (st.auto.i >= pat.length) { st.auto.base += dt; st.auto.i = 0; }
      }
    }
    function pollPad() {
      let gp; try { gp = navigator.getGamepads?.()[0]; } catch (e) { gp = null; }
      if (!gp) return;
      [[0, 'jump'], [2, 'attack'], [1, 'swim']].forEach(([b, act]) => { const on = !!gp.buttons[b]?.pressed; if (on && !st.padPrev[b] && s.classList.contains('active')) doPress(act, 'pad'); st.padPrev[b] = on; });
    }

    function render() {
      const t = st.t, sim = st.sim, ce = lastAt(sim.cfgs, t), c = ce.cfg, p = PAWN[c.pawn];
      T.use(g); g.clearRect(0, 0, W, H);
      const { val } = XR.replay(NODES, sim.flow, t);
      CUR = { src: c.src, key: val.key };
      NODES[0].title = 'Input: ' + SRC[c.src].name; NODES[1].title = p.ctrl; NODES[2].title = 'Pawn: ' + p.name;
      NODES[1].sub = c.pawn === 'tank' ? 'maps Jump to Hop, Attack to Fire' : 'reads the mode, checks its flags';
      scene(g, sim, t, c, p);
      flagTable(g, sim, t, c, p);
      XR.frame(g, 396, 0, W - 396, H);
      roles(g);
      XR.draw(g, NODES, sim.flow, t);
      speech(g, sim, t);
      decisions(g, sim, t);
      // the side panel follows what the diagram is doing
      const k = [c.src, c.pawn].join();
      if (k !== st.key) { st.key = k; $$(s, '.pt-src .btn').forEach(b => b.classList.toggle('on', b.dataset.v === c.src)); $$(s, '.pt-pawn .btn').forEach(b => b.classList.toggle('on', b.dataset.v === c.pawn)); $$(s, '.pt-act').forEach(b => b.textContent = `${p.act[b.dataset.a]} (${SRC[c.src === 'pad' ? 'pad' : 'kb'].key[b.dataset.a]})`); }
      const ph = st.tour ? PHASES.filter(q => t >= q[0]).at(-1) : null, last = sim.log.filter(e => e.t <= t).at(-1);
      const txt = ph ? ph[1] : st.msg || (last ? last.text + (c.src === 'bot' ? ' The bot presses on its own; the controller treats it like any other input.' : c.src === 'replay' ? ' The replay plays back your last presses through the same controller.' : '') : 'Press J, K or S (or the buttons). Watch the signal hop from Input to Controller to Pawn, and try Jump while falling.');
      if (out.textContent !== txt) say(out, txt);
    }
    tracerApi = {
      seek(t) { st.held = true; if (!st.tour) { st.tour = true; tourBtn.classList.add('on'); resim(); } st.t = t; render(); },
      dur: () => TOUR_DUR,
      flags: () => clone(lastAt(st.sim.cfgs, st.t).cfg.flags),
      setFlag(m, a, v) { free(); add({ at: st.t, type: 'cfg', flag: [m, a, v] }); },
    };
    return dt => {
      if (!st.held) st.t += Math.max(0, dt);
      if (st.tour && st.t > TOUR_DUR) st.t = 0;
      if (!st.tour && !st.held) { autoplay(); pollPad(); }
      render();
    };
  });

  function scene(g, sim, t, c, p) {
    g.save(); g.beginPath(); g.roundRect(0, 0, SW, SH, 14); g.clip();
    const sky = g.createLinearGradient(0, 0, 0, SH); sky.addColorStop(0, '#dff0fb'); sky.addColorStop(1, '#f6fbff'); g.fillStyle = sky; g.fillRect(0, 0, SW, SH);
    // shore and pool
    g.fillStyle = '#9b6a3c'; g.fillRect(0, GY, EDGE, SH - GY); g.fillStyle = '#5fae4a'; g.fillRect(0, GY, EDGE, 9);
    g.fillStyle = '#7a5230'; g.fillRect(EDGE, SH - 16, SW - EDGE, 16);
    const pos = at(sim.moves, t), inWater = pos.x > EDGE + 10 && pos.h <= .5;
    // the puppet
    const sw = sim.swings.filter(w => t >= w.t && t < w.t + (c.pawn === 'tank' ? .7 : SWING)).at(-1);
    const spawn = sim.spawns.filter(s0 => t >= s0 && t < s0 + .5).at(-1);
    g.save(); if (spawn != null) g.globalAlpha = clamp((t - spawn) / .5);
    if (c.pawn === 'hero') {
      const pose = inWater ? 'swim' : pos.h > .5 ? 'jump' : 'stand';
      hero(g, pos.x, inWater ? WY + 14 : GY - pos.h, pose, sw ? (t - sw.t) / SWING : null);
    } else {
      tank(g, pos.x, inWater ? WY + 22 : GY - pos.h, sw ? t - sw.t : null);
      if (sw) { const k = (t - sw.t) / .7, bx = pos.x + 44 + k * 260, by = (inWater ? WY + 22 : GY - pos.h) - 37; T.flash(pos.x + 46, by, 26, clamp(1 - k * 4)); g.fillStyle = C.navy; g.beginPath(); g.arc(bx, by, 4, 0, TAU); g.fill(); }
    }
    g.restore();
    // water on top, so the swimmer is half under
    g.fillStyle = 'rgba(70,160,225,.55)'; g.beginPath(); g.moveTo(EDGE, SH);
    for (let x = EDGE; x <= SW; x += 6) g.lineTo(x, WY + Math.sin(x * .07 + t * 3) * 2.2);
    g.lineTo(SW, SH); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2; g.beginPath();
    for (let x = EDGE; x <= SW; x += 6) x === EDGE ? g.moveTo(x, WY + Math.sin(x * .07 + t * 3) * 2.2) : g.lineTo(x, WY + Math.sin(x * .07 + t * 3) * 2.2);
    g.stroke();
    // a refusal flashes the whole scene red
    const rf = sim.refusals.filter(r => t >= r.t && t < r.t + .7).at(-1);
    if (rf) { const a = 1 - (t - rf.t) / .7; g.fillStyle = `rgba(229,50,45,${.28 * a})`; g.fillRect(0, 0, SW, SH); T.popText('✕ Refused', pos.x, 60, C.red, a * 1.4); }
    // queued chip above the puppet
    const q = sim.queues.find(q0 => t >= q0.t0 && t < q0.t1);
    const top = (inWater ? WY + 14 : GY - pos.h) - (c.pawn === 'tank' ? 64 : 92);
    if (q) { const name = PAWN[q.pawn].act[q.act]; T.label(`⏳ ${name} queued`, clamp(pos.x, 70, SW - 70), Math.max(top, 20), 'center', '#7a4a00', 14, '#fde9b8'); }
    const mode = lastAt(sim.modes, t).mode;
    T.label('Mode: ' + p.mode[mode], 12, SH - 18, 'left', '#fff', 13, C.navy);
    g.restore();
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(1, 1, SW - 2, SH - 2, 14); g.stroke();
  }

  // flag table geometry
  const TX = 0, TY = 306, MC = 104, CW = 92, RH = 50;
  const cell = (r, c) => ({ x: TX + MC + c * CW + 4, y: TY + 52 + r * (RH + 6), w: CW - 8, h: RH });
  const FCOL = { allow: ['#d8f0df', '#5fb47c', '#145c33', 'Allow'], queue: ['#fde9b8', '#e0a92d', '#7a4a00', 'Queue'], refuse: ['#f9d9d6', '#e07b72', '#8a1c15', 'Refuse'] };
  function flagTable(g, sim, t, c, p) {
    g.fillStyle = 'rgba(255,252,244,.85)'; g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(TX + 1, TY, SW - 2, H - TY - 1, 14); g.fill(); g.stroke();
    g.font = '700 14px Montserrat, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText('Flags on each mode (click a cell)', TX + 14, TY + 18);
    const mode = lastAt(sim.modes, t).mode;
    ACTS.forEach((a, ci) => { g.font = '700 14px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'center'; g.fillText(p.act[a], cell(0, ci).x + (CW - 8) / 2, TY + 40); });
    const recent = sim.log.filter(e => e.t <= t && t - e.t < .9);
    const edit = sim.cfgs.filter(e => e.flag && e.t <= t && t - e.t < 1.2).at(-1);
    MODES.forEach((m, ri) => {
      const y = cell(ri, 0).y, now = m === mode;
      g.fillStyle = now ? C.navy : 'rgba(0,0,0,0)'; g.beginPath(); g.roundRect(TX + 8, y, MC - 10, RH, 8); g.fill();
      g.font = '700 14px Jost, sans-serif'; g.fillStyle = now ? '#fff' : C.ink; g.textAlign = 'center'; g.fillText(['Grounded', 'Airborne', 'In water'][ri], TX + 8 + (MC - 10) / 2, y + RH / 2 - (now ? 7 : 0));
      if (now) { g.font = '600 11px Jost, sans-serif'; g.fillStyle = '#ffb951'; g.fillText('current mode', TX + 8 + (MC - 10) / 2, y + RH / 2 + 10); }
      ACTS.forEach((a, ci) => {
        const r = cell(ri, ci), f = c.flags[m][a], [fill, edge, ink, word] = FCOL[f];
        const hit = recent.find(e => e.mode === m && e.act === a), ed = edit && edit.flag[0] === m && edit.flag[1] === a;
        g.save();
        if (hit || ed) { g.shadowColor = ed ? '#2f7bff' : edge; g.shadowBlur = 22; }
        g.fillStyle = fill; g.strokeStyle = hit || ed ? (ed ? '#2f7bff' : ink) : edge; g.lineWidth = hit || ed ? 4 : 2;
        g.beginPath(); g.roundRect(r.x, r.y, r.w, r.h, 8); g.fill(); g.stroke(); g.restore();
        g.font = '700 15px Jost, sans-serif'; g.fillStyle = ink; g.textAlign = 'center'; g.fillText(word, r.x + r.w / 2, r.y + r.h / 2 + 1);
      });
    });
    g.font = '500 12px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'left';
    g.fillText('Allow runs now. Queue waits for the mode to change.', TX + 14, H - 30);
    g.fillText('Refuse bounces the signal back.', TX + 14, H - 13);
  }
  function roles(g) {
    const rows = [['Input', 'says what was pressed.'], ['Controller', 'decides if the pawn may do it now.'], ['Pawn', 'does it, and reports its mode.']];
    rows.forEach(([a, b], i) => {
      const y = 62 + i * 30;
      g.font = '800 14px Montserrat, sans-serif'; g.fillStyle = '#a64d79'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(a, 712, y);
      const w = g.measureText(a).width; g.font = '500 14px Jost, sans-serif'; g.fillStyle = '#20124d'; g.fillText(b, 712 + w + 8, y);
    });
  }
  function speech(g, sim, t) {
    const b = sim.bubbles.filter(q => t >= q.t && t < q.t + 2.6).at(-1);
    if (!b) return;
    const a = clamp((t - b.t) / .15) * clamp((b.t + 2.6 - t) / .3);
    g.save(); g.globalAlpha = a;
    const x = 712, y = 222, w = 310;
    g.font = 'italic 600 16px Montserrat, sans-serif';
    const words = b.text.split(' '), lines = []; let line = '';
    words.forEach(wd => { const tr = line ? line + ' ' + wd : wd; if (g.measureText(tr).width > w - 28) { lines.push(line); line = wd; } else line = tr; });
    lines.push(line);
    const h = 30 + lines.length * 22;
    g.fillStyle = '#fffaf0'; g.strokeStyle = b.col; g.lineWidth = 3;
    g.beginPath(); g.roundRect(x, y, w, h, 14); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(x + 2, y + 34); g.lineTo(x - 26, y + 52); g.lineTo(x + 2, y + 54); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#fffaf0'; g.fillRect(x - 1, y + 36, 6, 16);
    g.fillStyle = b.col; g.textAlign = 'left'; g.textBaseline = 'middle';
    lines.forEach((l, i) => g.fillText(l, x + 14, y + 26 + i * 22));
    g.restore();
  }
  function decisions(g, sim, t) {
    const list = sim.log.filter(e => e.t <= t).slice(-4);
    g.font = '800 13px Montserrat, sans-serif'; g.fillStyle = '#20124d'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText('Controller decisions', 712, 438);
    const col = { g: '#1a8a4c', y: '#9a5a06', r: '#cc0000' };
    list.forEach((e, i) => {
      const y = 466 + i * 26, fresh = t - e.t < .8;
      g.fillStyle = col[e.col]; g.beginPath(); g.arc(718, y, 5, 0, TAU); g.fill();
      g.font = `${fresh ? 700 : 500} 13px Jost, sans-serif`; g.fillStyle = fresh ? col[e.col] : '#3c3566'; g.fillText(e.text, 730, y);
    });
  }

  /* ---------- slide 2: modes vs actions ---------- */
  const A = { f: 'allow' }, R = (txt = 'Refused') => ({ f: 'refuse', txt }), SWAP = txt => ({ f: 'swap', txt }), Q = { f: 'queue' };
  const GAMES = {
    elden: {
      name: 'Elden Ring', modes: [['On foot', '🧍'], ['On horseback', '🐎']], acts: ['Attack', 'Jump', 'Dodge roll', 'Guard', 'Drink flask'],
      cells: [[A, A, A, A, A], [SWAP('Mounted swing'), SWAP('Double jump'), R(), R(), A]],
      note: 'Riding Torrent is a mode, not an action. While it lasts, Attack and Jump turn into mounted versions, and Dodge roll and Guard are switched off.',
    },
    ff: {
      name: 'Final Fantasy', modes: [['Alive', '❤'], ["KO'd", '💀']], acts: ['Take a turn', 'Cure', 'Phoenix Down', 'Gain EXP'],
      cells: [[A, A, R('No effect'), A], [R(), R('No effect'), SWAP('Revives'), R()]],
      note: "Alive and KO'd are two modes of the same character. The flags flip: a KO'd character takes no turns and ignores Cure, and only a revive works.",
    },
    ori: {
      name: 'Ori', modes: [['Ground', '🏃'], ['Air', '💨'], ['Wall cling', '🧗'], ['Swimming', '🌊']], acts: ['Jump', 'Dash', 'Glide'],
      cells: [[A, A, R()], [SWAP('Double jump'), A, A], [SWAP('Wall jump'), R(), R()], [SWAP('Leap out'), SWAP('Water dash'), R()]],
      note: 'Ori has many movement modes. The same Jump button becomes a double jump, a wall jump or a leap out of water, depending on which mode is active.',
    },
    mine: {
      name: 'Your puppet', modes: [['Grounded', '🧍'], ['Airborne', '💨'], ['In water', '🌊']], acts: ['Jump', 'Attack', 'Swim'],
      note: 'The flags from the previous slide. "It can become as simple as a set of rules, or… a set of flags on each mode."',
    },
  };
  const KEYS = ['elden', 'ff', 'ori', 'mine'];
  const fromFlags = fl => MODES.map(m => ACTS.map(a => ({ f: fl[m][a] })));
  const MTOUR = [
    { at: 0, game: 'elden', mode: 0 }, { at: .9, press: 0 }, { at: 1.8, press: 1 }, { at: 2.8, mode: 1 }, { at: 3.6, press: 0 }, { at: 4.5, press: 1 }, { at: 5.4, press: 2 }, { at: 6.3, press: 3 },
    { at: 7.6, game: 'ff', mode: 0 }, { at: 8.4, press: 1 }, { at: 9.4, mode: 1 }, { at: 10.2, press: 1 }, { at: 11.1, press: 2 }, { at: 12, press: 0 },
    { at: 13.3, game: 'ori', mode: 0 }, { at: 13.9, press: 0 }, { at: 14.7, mode: 1 }, { at: 15.2, press: 0 }, { at: 16, mode: 2 }, { at: 16.5, press: 0 }, { at: 17.3, mode: 3 }, { at: 17.8, press: 0 }, { at: 18.6, press: 1 },
    { at: 19.9, game: 'mine', mode: 0 }, { at: 20.5, press: 1 }, { at: 21.3, mode: 2 }, { at: 21.8, press: 1 }, { at: 22.7, mode: 1 }, { at: 23.2, press: 0 },
  ];
  const MDUR = 25.5;
  let modesApi;
  canvasDemo('modes', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, ev: [], edits: {}, key: '' };
    const tourBtn = $(s, '.md-tour'), out = $(s, '.md-out');
    const evs = () => st.tour ? MTOUR : st.ev;
    function state(t) {
      const r = { game: 'elden', mode: 0, press: null, pressT: -9, modeT: -9 };
      evs().forEach(e => { if (e.at > t) return; if (e.game) { r.game = e.game; r.press = null; } if (e.mode != null) { r.mode = e.mode; r.modeT = e.at; r.press = null; } if (e.press != null) { r.press = e.press; r.pressT = e.at; } });
      return r;
    }
    const cellsOf = key => key === 'mine' ? fromFlags(st.tour ? DEFAULT : (tracerApi ? tracerApi.flags() : DEFAULT)) : GAMES[key].cells.map((row, ri) => row.map((c0, ci) => st.edits[`${key}:${ri}:${ci}`] || c0));
    const free = () => { st.held = false;
      if (!st.tour) return;
      const r = state(st.t); st.tour = false; tourBtn.classList.remove('on'); st.t = 0; st.ev = [{ at: 0, game: r.game, mode: r.mode }];
    };
    $$(s, '.md-game .btn').forEach(b => b.onclick = () => { free(); st.ev.push({ at: st.t, game: b.dataset.v, mode: 0 }); });
    $(s, '.md-reset').onclick = () => { st.edits = {}; st.tour = true; free(); st.ev = [{ at: 0, game: 'elden', mode: 0 }]; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.held = false; tourBtn.classList.add('on'); };
    cv.addEventListener('click', e => {
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
      const cur = state(st.t), G = GAMES[cur.game], L = layout(G);
      const ri = L.rows.findIndex(q => y >= q.y && y <= q.y + q.h);
      if (x >= 16 && x <= 300 && ri >= 0) { free(); st.ev.push({ at: st.t, mode: ri }); return; }
      const ci = L.cols.findIndex(q => x >= q.x && x <= q.x + q.w);
      if (ci < 0) return;
      if (y >= 70 && y <= 112) { free(); st.ev.push({ at: st.t, press: ci }); return; }
      if (ri < 0) return;
      free();
      if (cur.game === 'mine') { const m = MODES[ri], a = ACTS[ci], f = cellsOf('mine')[ri][ci].f; tracerApi?.setFlag(m, a, NEXT[f]); }
      else {
        const orig = G.cells[ri][ci], opts = [orig, A, Q, R()].filter((o, i, arr) => arr.findIndex(p => p.f === o.f) === i), curC = cellsOf(cur.game)[ri][ci];
        const k = opts.findIndex(o => o.f === curC.f); st.edits[`${cur.game}:${ri}:${ci}`] = opts[(k + 1) % opts.length];
      }
      st.ev.push({ at: st.t, press: ci, edit: true });
    });
    function layout(G) {
      const n = G.modes.length, top = 124, rh = Math.min(100, (300 - (n - 1) * 10) / n);
      const rows = G.modes.map((m, i) => ({ y: top + i * (rh + 10), h: rh }));
      const cw = (1024 - 320) / G.acts.length, cols = G.acts.map((a, i) => ({ x: 320 + i * cw + 4, w: cw - 8 }));
      return { rows, cols };
    }
    const KIND = { allow: ['#d8f0df', '#5fb47c', '#145c33', 'Allowed'], swap: ['#dfe6fb', '#8ea2e6', '#23306e', ''], refuse: ['#f9d9d6', '#e07b72', '#8a1c15', 'Refused'], queue: ['#fde9b8', '#e0a92d', '#7a4a00', 'Queued'] };
    function render() {
      const t = st.t, r = state(t), G = GAMES[r.game], cells = cellsOf(r.game), L = layout(G);
      T.use(g); g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,252,244,.8)'; g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(1, 1, W - 2, H - 2, 14); g.fill(); g.stroke();
      g.textBaseline = 'middle'; g.textAlign = 'left';
      g.font = '800 24px Montserrat, sans-serif'; g.fillStyle = C.ink; g.fillText(G.name, 22, 36);
      g.font = '600 15px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'right'; g.fillText('Modes are exclusive: exactly one is lit. Actions read the lit row.', W - 22, 36);
      g.textAlign = 'center'; g.font = '700 13px Montserrat, sans-serif'; g.fillStyle = C.muted; g.fillText('MODES', 158, 100);
      // action headers are buttons
      G.acts.forEach((a, ci) => {
        const c = L.cols[ci], on = r.press === ci && t - r.pressT < 1;
        g.fillStyle = on ? C.navy : '#fffaf0'; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.roundRect(c.x, 72, c.w, 38, 10); g.fill(); g.stroke();
        g.font = '700 16px Jost, sans-serif'; g.fillStyle = on ? '#fff' : C.ink; g.fillText('▶ ' + a, c.x + c.w / 2, 92);
      });
      G.modes.forEach(([name, icon], ri) => {
        const row = L.rows[ri], now = ri === r.mode, pop = now ? clamp((t - r.modeT) / .3) : 1;
        g.save(); g.globalAlpha = now ? 1 : .55;
        g.fillStyle = now ? C.navy : '#fffaf0'; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.roundRect(16, row.y, 284, row.h, 12); g.fill(); g.stroke();
        g.font = `${Math.min(44, row.h * .5)}px sans-serif`; g.fillStyle = now ? '#ffb951' : C.ink; g.textAlign = 'center'; g.fillText(icon, 62, row.y + row.h / 2);
        g.font = '700 19px Jost, sans-serif'; g.fillStyle = now ? '#fff' : C.ink; g.textAlign = 'left'; g.fillText(name, 102, row.y + row.h / 2 - (now ? 8 : 0));
        if (now) { g.font = '600 13px Jost, sans-serif'; g.fillStyle = '#ffb951'; g.fillText('current mode', 102, row.y + row.h / 2 + 14); }
        // radio: one lit at a time
        g.strokeStyle = now ? '#fff' : C.navy; g.lineWidth = 2; g.beginPath(); g.arc(276, row.y + row.h / 2, 9, 0, TAU); g.stroke();
        if (now) { g.fillStyle = '#ffb951'; g.beginPath(); g.arc(276, row.y + row.h / 2, 5 * pop, 0, TAU); g.fill(); }
        G.acts.forEach((a, ci) => {
          const c = L.cols[ci], cl = cells[ri][ci], [fill, edge, ink, word] = KIND[cl.f], hit = now && r.press === ci && t - r.pressT < 1.4;
          g.save(); if (hit) { g.shadowColor = edge; g.shadowBlur = 26; }
          g.fillStyle = fill; g.strokeStyle = hit ? ink : edge; g.lineWidth = hit ? 4 : 2; g.beginPath(); g.roundRect(c.x, row.y, c.w, row.h, 10); g.fill(); g.stroke(); g.restore();
          g.textAlign = 'center'; g.fillStyle = ink;
          const label = cl.f === 'swap' ? '↪ ' + cl.txt : cl.txt || word;
          g.font = `700 ${c.w < 140 ? 14 : 16}px Jost, sans-serif`; g.fillText(label, c.x + c.w / 2, row.y + row.h / 2);
        });
        g.restore();
      });
      // what stacks: everything the lit mode lets through can run, the rest is off until the mode changes
      const y0 = L.rows.at(-1).y + L.rows.at(-1).h + 22, on = [], off = [];
      G.acts.forEach((a, ci) => { const cl = cells[r.mode][ci]; (cl.f === 'refuse' ? off : on).push(cl.f === 'swap' ? `${a} as ${cl.txt}` : cl.f === 'queue' ? `${a} (queued)` : a); });
      [['Open in this mode:', on, KIND.allow], ['Off in this mode:', off, KIND.refuse]].forEach(([lab, list, k], i) => {
        const y = y0 + i * 36;
        g.font = '700 15px Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'left'; g.fillText(lab, 22, y);
        let x = 160;
        (list.length ? list : ['nothing']).forEach(a => { g.font = '600 14px Jost, sans-serif'; const w = g.measureText(a).width + 20; g.fillStyle = list.length ? k[0] : '#eee'; g.strokeStyle = list.length ? k[1] : '#ccc'; g.lineWidth = 2; g.beginPath(); g.roundRect(x, y - 13, w, 26, 13); g.fill(); g.stroke(); g.fillStyle = list.length ? k[2] : C.muted; g.textAlign = 'center'; g.fillText(a, x + w / 2, y + 1); x += w + 8; });
      });
      // the outcome of the last press
      let res = 'Press an action to see what the current mode does with it.';
      if (r.press != null) { const cl = cells[r.mode][r.press], a = G.acts[r.press], m = G.modes[r.mode][0]; res = cl.f === 'allow' ? `${m} + ${a}: allowed, it runs as normal.` : cl.f === 'swap' ? `${m} + ${a}: becomes ${cl.txt}.` : cl.f === 'queue' ? `${m} + ${a}: queued until the mode changes.` : `${m} + ${a}: ${cl.txt && cl.txt !== 'Refused' ? cl.txt.toLowerCase() : 'refused'}.`; }
      const col = r.press == null ? C.muted : KIND[cells[r.mode][r.press].f][2];
      g.fillStyle = '#fffaf0'; g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.roundRect(16, 516, W - 32, 50, 12); g.fill(); g.stroke();
      g.font = '700 19px Jost, sans-serif'; g.fillStyle = col; g.textAlign = 'center'; g.fillText(res, W / 2, 542);
      const txt = G.note;
      if (out.textContent !== txt) say(out, txt);
      if (r.game !== st.key) { st.key = r.game; $$(s, '.md-game .btn').forEach(b => b.classList.toggle('on', b.dataset.v === r.game)); }
    }
    modesApi = { seek(t) { st.held = true; if (!st.tour) { st.tour = true; tourBtn.classList.add('on'); } st.t = t; render(); }, dur: () => MDUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > MDUR) st.t = 0; render(); };
  });

  const API = { tracer: () => tracerApi, modes: () => modesApi };
  window.__seek = (t, w) => API[w]().seek(t);
  window.__dur = w => API[w]().dur();
})();
