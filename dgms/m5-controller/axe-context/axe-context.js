/* Interaction + context = outcome (RGF C2 M5, the "one axe button" example). One Attack key, a No Rest for the Wicked
   hero seen from above, and four places to press it. The press runs down the lesson's chain: Input -> Device ->
   Controller -> Pawn -> Actions. The Controller reads the Pawn's state (standing, walking, rolling) and its surroundings
   (a tree in reach, a ledge underfoot) and picks the first rule that matches, the way the game's own action selection
   picks a combo swing, a roll attack or a plunge from the same button.
   Art: real No Rest for the Wicked animations (Moon Studios), rendered top-down from the Game Animation Library's 3D
   preview into ../img/nrftw/ (clips.js holds each sheet's layout and root motion). Frame data (startup, hit window, total,
   at 60 fps) comes from the library's No Rest for the Wicked table for the Axes class.
   The walk-through is a list of timed commands replayed from t = 0, so the page is a pure function of time and GIFs can seek. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, SH = 336, TAU = Math.PI * 2, DT = 1 / 60;
  const CL = window.NRFTW_CLIPS, FPS = 30, S = 68 / CL.combo.uz[0];   // 68 px per metre on screen; sheets hold every second frame of 60
  const PXM = CL.combo.uz[0] * S, PXV = -CL.combo.uy[1] * S;  // screen px per metre: forward (along the ground), up
  const IMG = {};
  Object.keys(CL).forEach(k => { const im = new Image(); im.src = `../img/nrftw/${k}.webp`; IMG[k] = im; });
  const ready = im => im && im.complete && im.naturalWidth > 0;

  /* ---------- the world ---------- */
  const TREE = { x: 318, y: 150 };
  const LEDGE_Y = 112, CLIFF_X = 690, DROP = 4.676 * PXV;                // the plateau's south edge, its west end, its height
  const STAIR = { top: [742, LEDGE_Y - 6], bot: [742, LEDGE_Y + DROP + 8] };
  const SPOT = { open: [470, 246], tree: [172, 172], ledge: [880, LEDGE_Y], lane: [150, 300], start: [500, 246] };
  const high = (x, y) => x > CLIFF_X && y <= LEDGE_Y + 2;

  // the four outcomes, with the game's frame data for the Axes class (60 fps simulation frames)
  const ACT = {
    combo: { clip: 'combo', name: 'Combo swing', move: 'Combo 1 · A1', startup: 33, hit: [33, 53], total: 118, push: 1 },
    chop: { clip: 'chop', name: 'Chop the tree', move: 'Gathering · Chop Tree', startup: 59, hit: [59, 65], total: 149, push: 0 },   // no hitbox data: the bite into the trunk, read off the clip
    rollAtk: { clip: 'roll-attack', name: 'Roll attack', move: 'Rolling · Roll Attack A1', startup: 30, hit: [30, 80], total: 112, push: .75 },
    plunge: { clip: 'plunge', name: 'Plunge attack', move: 'Plunge · Crushing Plunge', startup: 27, hit: [27, 38], total: 155, push: 1 },
  };
  // the Controller's rules, checked top to bottom: the first one that matches wins
  const RULES = [
    { id: 'rollAtk', state: 'Rolling', where: 'anywhere', test: c => c.state === 'Rolling' },
    { id: 'plunge', state: 'Standing or walking', where: 'at a ledge', test: c => c.where === 'ledge' },
    { id: 'chop', state: 'Standing or walking', where: 'a tree in reach', test: c => c.where === 'tree' },
    { id: 'combo', state: 'Standing or walking', where: 'open ground', test: () => true },
  ];
  const WHERE = { open: 'open ground', tree: 'a tree in reach', ledge: 'at a ledge', plateau: 'up on the cliff' };

  /* ---------- the hero: a small simulation stepped at 60 Hz ---------- */
  const fresh = () => ({ x: SPOT.start[0], y: SPOT.start[1], face: 'r', mode: 'idle', clip: 'idle-r', ct: 0, path: [], act: null, ax: 0, ay: 0, log: [], fx: [] });
  function whereOf(h) {
    if (high(h.x, h.y)) return h.y > LEDGE_Y - 16 && h.x > 790 ? 'ledge' : 'plateau';
    const dx = TREE.x - h.x, dy = TREE.y + 20 - h.y;
    if (Math.abs(dy) < 44 && Math.abs(dx) < 175 && Math.abs(dx) > 40) return 'tree';
    return 'open';
  }
  const stateOf = h => h.mode === 'roll' ? 'Rolling' : h.mode === 'act' ? 'Attacking' : h.mode === 'walk' ? 'Walking' : 'Standing';
  // a walk to (x, y): up or down the cliff goes by the stairs
  function walkTo(h, x, y) {
    if (h.mode === 'act' || h.mode === 'roll') return;
    const up = high(x, y), on = high(h.x, h.y), pts = [];
    if (up !== on) { const [a, b] = on ? [STAIR.top, STAIR.bot] : [STAIR.bot, STAIR.top]; pts.push(a.slice(), b.slice()); }
    // on the low ground, pass in front of the cliff's foot rather than through its face
    const under = (px, py) => px > CLIFF_X - 20 && py < LEDGE_Y + DROP + 10, foot = [CLIFF_X - 36, LEDGE_Y + DROP + 14];
    if (!up && !on && (under(h.x, h.y) || under(x, y) || (h.x > CLIFF_X) !== (x > CLIFF_X))) { if (h.x > CLIFF_X - 20) pts.push([h.x, foot[1]]); pts.push(foot.slice()); if (x > CLIFF_X - 20) pts.push([x, foot[1]]); }
    pts.push([x, y]); h.path = pts; h.mode = 'walk';
  }
  function dodge(h, t) {
    if (h.mode === 'act' || h.mode === 'roll' || high(h.x, h.y)) { h.log.push({ t, kind: 'Dodge', drop: true }); return; }
    if (h.face === 'u' || h.face === 'd') h.face = 'r';
    h.mode = 'roll'; h.path = []; h.clip = 'roll'; h.ct = 0; h.ax = h.x; h.ay = h.y;
    h.log.push({ t, kind: 'Dodge', rule: null, state: 'Standing', where: WHERE[whereOf(h)] });
  }
  function attack(h, t) {
    const ctx = { state: stateOf(h), where: whereOf(h) };
    if (h.mode === 'act') { h.log.push({ t, kind: 'Attack', drop: true, state: ctx.state, where: WHERE[ctx.where] }); return; }
    const rule = RULES.find(r => r.test(ctx));
    if (rule.id === 'chop') h.face = TREE.x > h.x ? 'r' : 'l'; else if (h.face === 'u' || h.face === 'd') h.face = 'r';
    h.log.push({ t, kind: 'Attack', rule: rule.id, state: ctx.state, where: WHERE[ctx.where] });
    if (h.mode !== 'roll') { h.ax = h.x; h.ay = h.y; }
    else { const m = rootAt('roll', h.ct); h.ax += m[1] * PXM * (h.face === 'l' ? -1 : 1); h.ay -= m[0] * PXV; }
    h.mode = 'act'; h.act = rule.id; h.clip = ACT[rule.id].clip; h.ct = 0; h.path = [];
  }
  const frames = clip => CL[clip].n;
  const rootAt = (clip, ct) => { const m = CL[clip].motion; return m ? m[clamp(Math.floor(ct * FPS), 0, m.length - 1)] : [0, 0]; };
  function step(h, dt) {
    h.ct += dt;
    if (h.mode === 'walk') {
      const p = h.path[0];
      if (!p) { h.mode = 'idle'; } else {
        const dx = p[0] - h.x, dy = p[1] - h.y, d = Math.hypot(dx, dy), v = 170 * dt;
        h.face = Math.abs(dx) * .8 > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : dy > 0 ? 'd' : 'u';
        if (d <= v) { h.x = p[0]; h.y = p[1]; h.path.shift(); if (!h.path.length) h.mode = 'idle'; }
        else { h.x += dx / d * v; h.y += dy / d * v; }
      }
    }
    if (h.mode === 'roll' || h.mode === 'act') {
      const clip = h.clip, k = h.mode === 'act' ? ACT[h.act].push : 1, m = rootAt(clip, h.ct), dir = h.face === 'l' ? -1 : 1;
      h.x = clamp(h.ax + m[1] * PXM * k * dir, 30, W - 30); h.y = h.ay - m[0] * PXV;
      if (h.ct * FPS >= frames(clip)) { h.mode = 'idle'; h.act = null; }
    }
    if (h.mode === 'idle' || h.mode === 'walk') h.clip = (h.mode === 'idle' ? 'idle-' : 'walk-') + (h.face === 'l' ? 'r' : h.face);
  }

  /* ---------- the walk-through: timed commands ---------- */
  const TOUR = [
    [.5, 'say', 'Open ground. The hero stands still and the player presses Attack.'],
    [1.0, 'attack'],
    [3.3, 'walk', SPOT.tree], [5.8, 'say', 'Same key, next to a tree.'], [6.0, 'attack'],
    [8.6, 'walk', SPOT.lane], [9.7, 'say', 'Same key, in the middle of a dodge roll.'], [10.0, 'dodge'], [10.35, 'attack'],
    [12.6, 'walk', SPOT.ledge], [16.4, 'say', 'Same key, standing at a ledge.'], [16.7, 'attack'],
    [20.2, 'walk', SPOT.start], [20.4, 'say', 'Four presses of one key, four actions. The input never changed; the context did.'],
  ];
  const DUR = 23.8;

  canvasDemo('axe', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, h: fresh(), simT: 0, cap: '', key: '' };
    const tourBtn = $(s, '.ax-tour'), out = $(s, '.ax-out');
    // the tour state at time t: replay the commands from the start
    function tourAt(t) {
      const h = fresh(); let cap = 'Watch one key, the Attack key, pressed in four places.';
      let i = 0, tt = 0;
      while (tt < t) {
        while (i < TOUR.length && TOUR[i][0] <= tt) {
          const [at, cmd, arg] = TOUR[i++];
          if (cmd === 'walk') walkTo(h, ...arg); else if (cmd === 'attack') attack(h, at); else if (cmd === 'dodge') dodge(h, at); else cap = arg;
        }
        step(h, Math.min(DT, t - tt)); tt += DT;
      }
      return [h, cap];
    }
    const free = () => {
      st.held = false; if (!st.tour) return;
      st.h = tourAt(st.t)[0]; st.h.log = []; st.simT = 0; st.tour = false; tourBtn.classList.remove('on');
    };
    const press = () => { free(); attack(st.h, st.simT); };
    const roll = () => { free(); dodge(st.h, st.simT); };
    $(s, '.ax-press').onclick = press;
    $(s, '.ax-dodge').onclick = roll;
    $$(s, '.ax-spot .btn').forEach(b => b.onclick = () => { free(); walkTo(st.h, ...SPOT[b.dataset.v]); });
    tourBtn.onclick = () => { st.tour = true; st.held = false; st.t = 0; tourBtn.classList.add('on'); };
    $(s, '.ax-reset').onclick = () => { st.tour = true; free(); st.h = fresh(); };
    document.addEventListener('keydown', e => {
      if (!s.classList.contains('active') || e.repeat) return;
      if (e.code === 'KeyK' || e.code === 'KeyJ') { e.preventDefault(); press(); }
      if (e.code === 'Space' || e.code === 'KeyL') { e.preventDefault(); roll(); }
    });
    const toCanvas = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
    cv.addEventListener('pointerdown', e => {
      const [x, y] = toCanvas(e); if (y > SH) return; free();
      // click the plateau to walk up there, anywhere else to walk on the low ground
      const up = x > CLIFF_X + 10 && y < LEDGE_Y + 30;
      walkTo(st.h, clamp(x, 40, W - 40), up ? clamp(y, 40, LEDGE_Y) : clamp(y, y < LEDGE_Y + DROP && x > CLIFF_X - 20 ? LEDGE_Y + DROP + 8 : 60, SH - 24));
    });

    function render() {
      let h, cap = null, now;
      if (st.tour) { [h, cap] = tourAt(st.t); now = st.t; } else { h = st.h; now = st.simT; }
      T.use(g); g.clearRect(0, 0, W, H);
      g.save(); g.beginPath(); g.roundRect(0, 0, W, SH, 14); g.clip();
      world(g, h, now);
      g.restore();
      chain(g, h, now);
      // the side text
      const last = h.log.at(-1), age = last ? now - last.t : 9;
      let txt;
      if (last && age < 3.2) {
        if (last.drop) txt = last.kind === 'Dodge' ? 'Dodge refused: the hero is busy, or up on the cliff with no room to roll.' : 'The hero is still mid-swing, so the Controller drops this press.';
        else if (last.kind === 'Dodge') txt = 'Dodge: the Pawn is now <b>Rolling</b>. Press Attack before the roll ends.';
        else { const a = ACT[last.rule]; txt = `<b>${last.state}</b>, <b>${last.where}</b>: the Controller picks <b>${a.name}</b> (${a.move}, hits from frame ${a.startup}).`; }
      } else txt = st.tour ? (cap || '') : 'Click the ground to walk, use the place buttons, then press Attack (K). Dodge (Space) and Attack during the roll for the third outcome.';
      if (out.innerHTML !== txt) say(out, txt);
      const w = whereOf(h); if (w !== st.key) { st.key = w; $$(s, '.ax-spot .btn').forEach(b => b.classList.toggle('on', b.dataset.v === w)); }
    }
    api = { seek(t) { st.held = true; if (!st.tour) { st.tour = true; tourBtn.classList.add('on'); } st.t = t; render(); }, dur: () => DUR };
    return dt => {
      dt = Math.min(Math.max(0, dt), .1);
      if (st.tour) { if (!st.held) st.t += dt; if (st.t > DUR) st.t = 0; }
      else { for (let k = dt; k > 1e-6; k -= DT) { step(st.h, Math.min(DT, k)); st.simT += Math.min(DT, k); } }
      render();
    };
  });
  let api;

  /* ---------- drawing the world ---------- */
  function sprite(g, clip, i, x, y, flip, a = 1) {
    const c = CL[clip], im = IMG[clip]; if (!ready(im)) return;
    i = clamp(Math.floor(i), 0, c.n - 1);
    const sx = (i % c.cols) * c.cw, sy = Math.floor(i / c.cols) * c.ch;
    g.save(); g.globalAlpha *= a; g.translate(x, y); if (flip) g.scale(-1, 1);
    g.drawImage(im, sx, sy, c.cw, c.ch, -c.ax * S, -c.ay * S, c.cw * S, c.ch * S);
    g.restore();
  }
  function heroFrame(h) {
    const c = CL[h.clip];
    if (h.mode === 'idle') return c.n - 1;                                   // the settled pose at the end of roll-to-idle
    if (h.mode === 'walk') return Math.floor(h.ct * FPS * 1.2) % c.n;
    return h.ct * FPS;
  }
  function grass(g) {
    const gr = g.createLinearGradient(0, 0, 0, SH); gr.addColorStop(0, '#7f9a55'); gr.addColorStop(1, '#6d8a4a');
    g.fillStyle = gr; g.fillRect(0, 0, W, SH);
    // a worn dirt path across the clearing
    g.fillStyle = 'rgba(170,140,95,.45)'; g.beginPath(); g.ellipse(470, 262, 330, 58, -.05, 0, TAU); g.fill();
    g.fillStyle = 'rgba(150,120,80,.25)'; g.beginPath(); g.ellipse(560, 300, 220, 30, 0, 0, TAU); g.fill();
    for (let i = 0; i < 90; i++) {
      const x = (i * 137.5) % W, y = (i * 71.3) % SH; if (x > CLIFF_X && y < LEDGE_Y + DROP) continue;
      g.strokeStyle = i % 3 ? 'rgba(60,90,40,.55)' : 'rgba(150,180,90,.5)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y - 7); g.moveTo(x + 3, y); g.lineTo(x + 5, y - 6); g.stroke();
    }
  }
  function cliff(g) {
    // plateau top
    g.fillStyle = '#8f9a6a'; g.beginPath(); g.moveTo(CLIFF_X, 0); g.lineTo(W, 0); g.lineTo(W, LEDGE_Y + 8); g.lineTo(CLIFF_X + 12, LEDGE_Y + 8); g.closePath(); g.fill();
    g.fillStyle = 'rgba(120,110,80,.35)'; g.beginPath(); g.ellipse(880, 70, 130, 30, 0, 0, TAU); g.fill();
    // west side and south face
    const fg = g.createLinearGradient(0, LEDGE_Y, 0, LEDGE_Y + DROP); fg.addColorStop(0, '#8d877c'); fg.addColorStop(1, '#6a645a');
    g.fillStyle = fg; g.beginPath(); g.moveTo(CLIFF_X + 12, LEDGE_Y + 8); g.lineTo(W, LEDGE_Y + 8); g.lineTo(W, LEDGE_Y + DROP - 2); g.lineTo(CLIFF_X + 6, LEDGE_Y + DROP - 2); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(30,28,25,.35)'; g.lineWidth = 2;
    for (let i = 0; i < 14; i++) { const x = CLIFF_X + 30 + i * 25; if (Math.abs(x - STAIR.top[0]) < 34) continue; g.beginPath(); g.moveTo(x, LEDGE_Y + 14 + (i % 3) * 9); g.lineTo(x + 8, LEDGE_Y + DROP - 10 - (i % 4) * 12); g.stroke(); }
    g.fillStyle = '#5d6f3c'; g.fillRect(CLIFF_X + 12, LEDGE_Y + 4, W - CLIFF_X, 6);      // grass lip
    g.fillStyle = '#5a5650'; g.fillRect(CLIFF_X - 4, 0, 18, LEDGE_Y + DROP - 2);           // west wall
    // stairs cut into the face
    const sx = STAIR.top[0];
    for (let k = 0; k < 9; k++) { const y = LEDGE_Y + 8 + k * (DROP / 9); g.fillStyle = k % 2 ? '#9a8f7b' : '#a99e88'; g.fillRect(sx - 28, y, 56, DROP / 9 + 1); g.fillStyle = 'rgba(40,35,30,.4)'; g.fillRect(sx - 28, y + DROP / 9 - 3, 56, 3); }
    T.label('Ledge', 960, LEDGE_Y + 30, 'center', '#3a3020', 12);
    T.label('Stairs', sx, LEDGE_Y + DROP + 26, 'center', '#3a3020', 12);
  }
  function tree(g, shake, chips, see) {
    const x = TREE.x + shake, y = TREE.y;
    T.shadow(x + 10, y + 28, 70, 26, .28);
    g.fillStyle = '#5b3a1e'; g.beginPath(); g.ellipse(x, y + 18, 16, 10, 0, 0, TAU); g.fill();
    g.fillStyle = '#6e4626'; g.fillRect(x - 13, y - 30, 26, 48); g.fillStyle = '#4f3018'; g.fillRect(x + 3, y - 30, 6, 48);
    if (chips) chips(g, x, y);
    // canopy, see-through while the hero stands under it
    g.save(); g.globalAlpha = see ? .45 : 1;
    [[0, -58, 66, '#3d7a34'], [-36, -70, 40, '#4c8f3e'], [32, -78, 38, '#4c8f3e'], [-8, -94, 40, '#58a047'], [22, -40, 34, '#447f37']].forEach(([dx, dy, r, c]) => { g.fillStyle = c; g.beginPath(); g.arc(x + dx, y + dy, r, 0, TAU); g.fill(); });
    g.strokeStyle = 'rgba(30,70,30,.6)'; g.lineWidth = 3; g.beginPath(); g.arc(x, y - 62, 68, 0, TAU); g.stroke();
    g.restore();
    T.label('Tree', x, y + 44, 'center', '#264d22', 12);
  }
  function world(g, h, now) {
    grass(g); cliff(g);
    const fr = heroFrame(h), a = h.mode === 'act' ? ACT[h.act] : null, f60 = fr * 2;
    const inHit = a && f60 >= a.hit[0] && f60 <= a.hit[1] + 2;
    // reach zones, drawn faintly: the tree's reach and the ledge's edge
    const w = whereOf(h);
    g.save(); g.setLineDash([6, 6]); g.lineWidth = 2;
    g.strokeStyle = w === 'tree' ? 'rgba(255,245,200,.95)' : 'rgba(255,245,200,.35)'; g.beginPath(); g.ellipse(TREE.x, TREE.y + 20, 176, 50, 0, 0, TAU); g.stroke();
    g.strokeStyle = w === 'ledge' ? 'rgba(255,245,200,.95)' : 'rgba(255,245,200,.35)'; g.strokeRect(792, LEDGE_Y - 18, W - 810, 24);
    g.restore();
    // the tree shakes and sheds chips while a chop is in its hit window
    const chopping = a && h.act === 'chop' && inHit, shake = chopping ? Math.sin(now * 70) * 3 : 0;
    const chips = chopping ? (g2, x, y) => { for (let i = 0; i < 8; i++) { const k = (f60 - a.hit[0]) / 14, an = Math.PI + (i - 3.5) * .35 * (h.face === 'r' ? 1 : -1), d = 14 + k * 70 + i * 3; g2.fillStyle = `rgba(214,170,100,${1 - k * .7})`; g2.fillRect(x + Math.cos(an) * d * (h.face === 'r' ? 1 : -1) - 2, y - 6 + Math.sin(an) * d * .4 - k * 20, 6, 4); } } : null;
    const under = Math.abs(h.x - TREE.x) < 70 && h.y < TREE.y + 10 && h.y > TREE.y - 130;
    // depth order: whichever stands lower on screen goes in front
    const drawHero = () => {
      const flip = h.face === 'l';
      T.shadow(h.x, h.y + 2, 26, 9, .3);
      sprite(g, h.clip, fr, h.x, h.y, flip);
    };
    if (h.y < TREE.y + 18) { drawHero(); tree(g, shake, chips, false); } else { tree(g, shake, chips, false); drawHero(); }
    if (under) tree(g, shake, null, true);
    // hit sparks and landing dust
    if (inHit && h.act !== 'chop') {
      const k = (f60 - a.hit[0]) / Math.max(4, a.hit[1] - a.hit[0]);
      g.strokeStyle = `rgba(255,236,170,${.9 * (1 - k)})`; g.lineWidth = 4;
      g.beginPath(); g.ellipse(h.x + (h.face === 'l' ? -30 : 30), h.y - 6, 30 + k * 26, 11 + k * 8, 0, 0, TAU); g.stroke();
    }
    if (a && h.act === 'plunge' && f60 >= a.startup && f60 < a.startup + 30) { const k = (f60 - a.startup) / 30; T.poof?.(h.x + 20, h.y, k, 46); }
    // action title over the hero
    if (a) { const al = clamp(2.4 - h.ct, 0, 1), y = Math.max(22, (h.act === 'plunge' ? h.ay : h.y) - 112 - Math.min(14, h.ct * 20));
      g.save(); g.globalAlpha = al; g.font = '800 18px Montserrat, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineJoin = 'round'; g.lineWidth = 5; g.strokeStyle = '#152044'; g.strokeText(a.name, h.x, y); g.fillStyle = '#ffe599'; g.fillText(a.name, h.x, y); g.restore(); }
    // HUD: the Pawn's state and where it stands
    T.label(`Pawn: ${stateOf(h)} · ${WHERE[w]}`, 16, 22, 'left', '#fff', 14, C.navy);
    g.font = '600 11px Jost, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = 'rgba(255,255,255,.92)';
    g.fillText('No Rest for the Wicked © Moon Studios · animations via Game Animation Library', 14, SH - 10);
  }

  /* ---------- the chain: Input -> Device -> Controller -> Pawn -> Actions ---------- */
  const NB = { input: [14, 392, 100, 92], device: [132, 392, 132, 92], ctrl: [288, 356, 362, 178], pawn: [684, 356, 150, 178], act: [868, 356, 158, 178] };
  const INK = '#20124d', PINK = '#ead1dc', EDGE = '#a64d79', TABF = '#ea9999', TABE = '#cc0000', TABI = '#990000', CTX = '#3d85c6';
  function nbox(g, [x, y, w, h], title, lit) {
    g.save();
    g.fillStyle = PINK; g.strokeStyle = EDGE; g.lineWidth = lit > 0 ? 3 + 2 * lit : 2;
    if (lit > 0) { g.shadowColor = `rgba(255,185,81,${lit})`; g.shadowBlur = 16 * lit; }
    g.beginPath(); g.roundRect(x, y, w, h, 8); g.fill(); g.stroke(); g.shadowBlur = 0;
    g.font = '800 13px Montserrat, sans-serif'; const tw = g.measureText(title).width + 16;
    g.fillStyle = TABF; g.strokeStyle = TABE; g.lineWidth = 1.5; g.beginPath(); g.roundRect(x + 8, y - 11, tw, 22, 5); g.fill(); g.stroke();
    g.fillStyle = TABI; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(title, x + 16, y);
    g.restore();
  }
  function txt(g, s, x, y, font, col = INK, align = 'left') { g.font = font; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); }
  function arrow(g, x0, y0, x1, y1, col, k, label, dash) {
    g.save(); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 3; if (dash) g.setLineDash([7, 5]);
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.setLineDash([]);
    const an = Math.atan2(y1 - y0, x1 - x0); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - 10 * Math.cos(an - .45), y1 - 10 * Math.sin(an - .45)); g.lineTo(x1 - 10 * Math.cos(an + .45), y1 - 10 * Math.sin(an + .45)); g.fill();
    if (k >= 0 && k <= 1) { const px = lerp(x0, x1, ease(k)), py = lerp(y0, y1, ease(k)); g.fillStyle = '#ffb951'; g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.arc(px, py, 8, 0, TAU); g.fill(); g.stroke(); if (label) XR.pill(g, label, px, py - 20, col, 12); }
    g.restore();
  }
  function chain(g, h, now) {
    XR.frame(g, 0, SH + 6, W, H - SH - 6);
    const last = h.log.at(-1), age = last ? now - last.t : 99, seg = i => (age - i * .16) / .16;
    const lit = i => clamp(1 - Math.abs(age - i * .16 - .1) * 3);
    const a = last && !last.drop && last.rule ? ACT[last.rule] : null;
    txt(g, 'One key, read in context', 18, SH + 26, '800 16px Montserrat, sans-serif');
    // Input
    nbox(g, NB.input, 'Input', lit(0));
    const keyK = last?.kind === 'Dodge' ? 'Space' : 'K', down = age < .25;
    g.fillStyle = down ? '#ffd88a' : '#fffaf0'; g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.roundRect(36, 418 + (down ? 3 : 0), 56, 40, 7); g.fill(); g.stroke();
    txt(g, keyK, 64, 438 + (down ? 3 : 0), '800 17px Montserrat, sans-serif', INK, 'center');
    txt(g, 'a key press', 64, 474, '500 12px Jost, sans-serif', INK, 'center');
    // Device
    nbox(g, NB.device, 'Device', lit(1));
    txt(g, 'Keyboard', 144, 418, '700 14px Jost, sans-serif');
    txt(g, 'K  →  Attack', 144, 442, '600 13px Jost, sans-serif');
    txt(g, 'Space  →  Dodge', 144, 462, '600 13px Jost, sans-serif');
    arrow(g, 114, 438, 130, 438, INK, seg(0), null);
    arrow(g, 264, 438, 286, 438, INK, seg(1), null);
    // Controller with its rules
    nbox(g, NB.ctrl, 'Controller', lit(2));
    txt(g, 'reads the Pawn, picks the first rule that matches', 302, 380, 'italic 500 12px Jost, sans-serif');
    const RX = 302, RY = 398, RH = 30;
    txt(g, 'Pawn state', RX, RY, '700 11px Jost, sans-serif', '#5d4a7a'); txt(g, 'Surroundings', RX + 122, RY, '700 11px Jost, sans-serif', '#5d4a7a'); txt(g, 'Action', RX + 236, RY, '700 11px Jost, sans-serif', '#5d4a7a');
    const shown = age < 3.4 && last?.kind === 'Attack' && !last.drop ? last.rule : null;
    RULES.forEach((r, i) => {
      const y = RY + 14 + i * RH, on = r.id === shown, checked = shown && RULES.findIndex(q => q.id === shown) > i && age > .4 + i * .08;
      g.fillStyle = on && age > .45 ? '#ffe599' : checked ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.7)';
      g.strokeStyle = on && age > .45 ? '#bf9000' : 'rgba(166,77,121,.4)'; g.lineWidth = on ? 2.5 : 1;
      g.beginPath(); g.roundRect(RX - 4, y, 342, RH - 4, 5); g.fill(); g.stroke();
      const col = checked ? 'rgba(32,18,77,.4)' : INK;
      txt(g, r.state, RX + 2, y + 13, '600 12px Jost, sans-serif', col);
      txt(g, r.where, RX + 122, y + 13, '600 12px Jost, sans-serif', col);
      txt(g, ACT[r.id].name, RX + 236, y + 13, '700 12px Jost, sans-serif', col);
      if (checked) { g.strokeStyle = 'rgba(32,18,77,.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(RX, y + 13); g.lineTo(RX + 332, y + 13); g.stroke(); }
    });
    // Pawn
    nbox(g, NB.pawn, 'Pawn: Hero', lit(3));
    XR.stateChip(g, 694, 384, stateOf(h), 130, 30);
    txt(g, 'Surroundings:', 759, 432, '700 11px Jost, sans-serif', '#5d4a7a', 'center');
    txt(g, WHERE[whereOf(h)], 759, 450, '600 12px Jost, sans-serif', INK, 'center');
    txt(g, 'the Controller reads both', 759, 512, 'italic 500 11px Jost, sans-serif', '#5d4a7a', 'center');
    // the context read: Pawn -> Controller (dashed, blue), then the command back: Controller -> Pawn
    arrow(g, 682, 490, 652, 490, CTX, seg(2), null, true);
    txt(g, 'reads', 667, 506, 'italic 700 11px Jost, sans-serif', CTX, 'center');
    arrow(g, 650, 410, 682, 410, INK, seg(3), null);
    // Actions
    nbox(g, NB.act, 'Actions', lit(4));
    arrow(g, 834, 410, 866, 410, INK, seg(4), null);
    if (h.mode === 'act' || (a && age < 3.4)) {
      const A = ACT[h.mode === 'act' ? h.act : last.rule];
      txt(g, A.name, 880, 382, '800 14px Montserrat, sans-serif');
      txt(g, A.move, 880, 402, '500 11px Jost, sans-serif', '#5d4a7a');
      txt(g, `hits on frames ${A.hit[0]}–${A.hit[1]}`, 880, 424, '600 12px Jost, sans-serif');
      txt(g, `${A.total} frames in all (60 fps)`, 880, 442, '600 12px Jost, sans-serif');
      // frame bar: startup, hit window, recovery, and where the swing is now
      const bx = 880, by = 462, bw = 134, sx = f => bx + bw * f / A.total;
      g.fillStyle = '#cfe2f3'; g.fillRect(bx, by, bw, 14);
      g.fillStyle = '#e5322d'; g.fillRect(sx(A.hit[0]), by, sx(A.hit[1]) - sx(A.hit[0]), 14);
      g.strokeStyle = INK; g.lineWidth = 1.5; g.strokeRect(bx, by, bw, 14);
      if (h.mode === 'act') { const f = clamp(h.ct * 60, 0, A.total); g.fillStyle = INK; g.fillRect(sx(f) - 1.5, by - 5, 3, 24); }
      if (sx(A.hit[0]) - bx > 44) txt(g, 'startup', bx, by + 26, '500 10px Jost, sans-serif', '#3d85c6'); txt(g, 'hit', sx((A.hit[0] + A.hit[1]) / 2), by + 26, '700 10px Jost, sans-serif', '#a8201c', 'center'); txt(g, 'recovery', bx + bw, by + 26, '500 10px Jost, sans-serif', '#3d85c6', 'right');
    } else if (h.mode === 'roll') {
      txt(g, 'Dodge roll', 880, 382, '800 14px Montserrat, sans-serif'); txt(g, 'press Attack now', 880, 404, '600 12px Jost, sans-serif');
    } else { txt(g, 'waiting for', 880, 390, '600 12px Jost, sans-serif', '#5d4a7a'); txt(g, 'a command', 880, 408, '600 12px Jost, sans-serif', '#5d4a7a'); }
    if (last?.drop && age < 1.6) XR.pill(g, last.kind === 'Dodge' ? 'Dodge refused' : 'busy: press dropped', 469, 556, '#cc0000', 12);
  }

  window.__seek = (t, w) => api.seek(t);
  window.__dur = w => api.dur();
})();
