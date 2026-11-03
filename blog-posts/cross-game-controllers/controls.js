/* Cross-Game Controllers (Alex Brazie), three spikes.
   intent: an input map turns a button into an action name; the controller decides what that action means right now.
           One Attack press: slash on the ground, plunge in the air, nothing when out of stamina. Put door-opening on
           Attack (the No Rest for the Wicked story) and players slash the door. Rules in resolve().
   meant:  coyote time and the jump buffer. Twenty seeded human presses around a ledge and a narrow landing; a press
           only counts inside the windows the sliders set. Super Mario Bros. sprites. Numbers in LEDGE / LAND.
   camera: same over-the-shoulder family, three framings. Where God of War, Horizon Zero Dawn and Elden Ring put the
           hero on screen, and how many of the same eight enemies stay in view. Presets in GAMES. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585;
  const panel = g => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.8)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const txt = (g, s, x, y, font, col = C.ink, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); };
  const box = (g, x, y, w, h, fill, stroke, r = 10, lw = 2) => { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } };
  const arrow = (g, x0, y0, x1, y1, col, w = 3) => { const a = Math.atan2(y1 - y0, x1 - x0); g.strokeStyle = g.fillStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1 - 9 * Math.cos(a), y1 - 9 * Math.sin(a)); g.stroke(); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - 12 * Math.cos(a - .45), y1 - 12 * Math.sin(a - .45)); g.lineTo(x1 - 12 * Math.cos(a + .45), y1 - 12 * Math.sin(a + .45)); g.fill(); };
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const gauss = r => Math.sqrt(-2 * Math.log(Math.max(1e-6, r()))) * Math.cos(2 * Math.PI * r());
  const img = src => { const i = new Image(); i.src = src; return i; };
  const freeOf = (st, btn) => () => { st.tour = false; btn.classList.remove('on'); };
  const apis = {};

  /* ---------- 1: input map vs controller ---------- */
  const STATES = { ground: 'Grounded', air: 'Mid-air', tired: 'Out of stamina', door: 'Next to a door' };
  // what the controller does with a request, given the world
  function resolve(action, state, shared) {
    if (action === 'interact') return state === 'door' ? { k: 'open', s: 'Opens the door', lock: .25 } : { k: 'none', s: 'Nothing to use here', lock: 0 };
    if (state === 'air') return { k: 'plunge', s: 'Plunging strike', lock: .8 };
    if (state === 'tired') return { k: 'tired', s: 'Too tired: nothing happens', lock: 0 };
    if (state === 'door' && shared) return { k: 'slashdoor', s: 'Slashes the door', lock: .9 };
    return { k: 'slash', s: 'Sword slash', lock: .7 };
  }
  // the walk-through: [state, door on attack?, button, at time]
  const ITOUR = [['ground', 0, 'attack', .6], ['air', 0, 'attack', 3.6], ['tired', 0, 'attack', 6.6], ['door', 1, 'attack', 9.6], ['door', 1, 'attack', 11.2], ['door', 1, 'attack', 12.8], ['door', 0, 'attack', 16.4], ['door', 0, 'interact', 18.2]];
  const ISAY = [
    'Grounded: the controller honours Attack with a slash.',
    'Same button, mid-air: the controller turns Attack into a plunge.',
    'Same button, no stamina: the controller refuses. The input map never knew.',
    'Attack also opens doors. The player walks up to the door, presses Attack… and slashes it. Again. Locked in the swing, waiting to touch the handle.',
    'Split them: Attack swings, a separate Interact button opens the door at once. Smoother, familiar, and no lost commitment.',
  ];
  canvasDemo('intent', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, state: 'ground', shared: false, presses: [], key: '' };
    const tourBtn = $(s, '.in-tour'), free = freeOf(st, tourBtn);
    const setState = v => { st.state = v; $$(s, '.in-state .btn').forEach(b => b.classList.toggle('on', b.dataset.s === v)); };
    $$(s, '.in-state .btn').forEach(b => b.onclick = () => { free(); setState(b.dataset.s); st.presses = []; });
    $(s, '.in-shared').onchange = e => { free(); st.shared = e.target.checked; st.presses = []; };
    $(s, '.in-atk').onclick = () => { free(); st.presses.push(['attack', st.t]); };
    $(s, '.in-use').onclick = () => { free(); st.presses.push(['interact', st.t]); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const DUR = 21.5;
    const FLOOR = 446, HX = 560;
    // a side-view swordsman: pose and progress k (0..1)
    function hero(x, y, pose, k) {
      g.save(); g.translate(x, y);
      const hunch = pose === 'tired' ? 8 : 0;
      g.fillStyle = 'rgba(40,30,20,.2)'; g.beginPath(); g.ellipse(0, FLOOR - y + 2, 26, 7, 0, 0, 7); g.fill();
      g.fillStyle = C.player; g.beginPath(); g.roundRect(-16, -62 + hunch, 32, 48, 10); g.fill();
      g.fillStyle = '#1f6f99'; g.fillRect(-14, -16, 10, 16); g.fillRect(4, -16, 10, 16);
      g.fillStyle = '#d6dbef'; g.beginPath(); g.arc(4, -76 + hunch * 1.5, 15, 0, 7); g.fill();
      g.fillStyle = C.navy; g.fillRect(6, -80 + hunch * 1.5, 13, 5);
      // the sword
      let ang = -.9, len = 54, hx = 12, hy = -40 + hunch;
      if (pose === 'slash' || pose === 'slashdoor') { ang = k < .25 ? lerp(-.9, -2.2, k / .25) : k < .45 ? lerp(-2.2, .9, (k - .25) / .2) : .9; }
      if (pose === 'plunge') { ang = 1.57; hy = -20; }
      if (pose === 'tired') { ang = 1.2; hy = -26; }
      if (pose === 'open') { ang = -.4; hx = 4; len = 30; }
      g.strokeStyle = '#8b8fa8'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + Math.cos(ang) * len, hy + Math.sin(ang) * len); g.stroke();
      g.strokeStyle = C.goldInk; g.lineWidth = 7; g.beginPath(); g.moveTo(hx - Math.cos(ang) * 4, hy - Math.sin(ang) * 4); g.lineTo(hx + Math.cos(ang) * 8, hy + Math.sin(ang) * 8); g.stroke();
      if ((pose === 'slash' || pose === 'slashdoor') && k > .25 && k < .5) { g.strokeStyle = 'rgba(255,185,81,.7)'; g.lineWidth = 10; g.beginPath(); g.arc(hx, hy, len, -2.2, lerp(-2.2, .9, clamp((k - .25) / .2))); g.stroke(); }
      if (pose === 'open') { g.strokeStyle = C.player; g.lineWidth = 9; g.beginPath(); g.moveTo(10, -46); g.lineTo(46, -50); g.stroke(); }
      g.restore();
    }
    function render() {
      const t = st.t;
      let presses = st.presses, state = st.state, shared = st.shared;
      if (st.tour) {
        const cur = ITOUR.filter(p => p[3] <= t + 1e-6), seg = cur.at(-1) || ITOUR[0];
        state = seg[0]; shared = !!seg[1];
        presses = cur.filter(p => p[0] === seg[0] && p[1] === seg[1]).map(p => [p[2], p[3]]);
        if (st.state !== state) setState(state); if (st.shared !== shared) { st.shared = shared; $(s, '.in-shared').checked = shared; }
      }
      $(s, '.in-use').hidden = shared;
      const last = presses.at(-1), since = last ? t - last[1] : 99;
      const out = last ? resolve(last[0], state, shared) : null;
      T.use(g); panel(g);
      // the pipeline
      const btnName = !last ? '—' : last[0] === 'attack' ? 'Y  ( □ / click )' : 'A  ( ✕ / E )';
      const actName = !last ? '—' : last[0] === 'attack' ? '“Attack”' : '“Interact”';
      const stages = [['Button pressed', btnName, 'hardware'], ['Input map', actName, 'what did they press?'], ['Controller', STATES[state], 'what did they mean?'], ['What happens', out ? out.s : '—', '']];
      stages.forEach(([h, v, sub], i) => {
        const x = 24 + i * 254, lit = last && since > i * .12;
        box(g, x, 22, 228, 96, lit ? (i === 3 ? 'rgba(255,185,81,.2)' : 'rgba(46,163,220,.12)') : 'rgba(21,32,68,.05)', lit ? (i === 3 ? '#e0a92d' : '#2ea3dc') : '#d8ccb2', 12, 2);
        txt(g, h, x + 14, 42, '800 14px Montserrat', C.muted);
        txt(g, v, x + 14, 74, `800 ${v.length > 24 ? 14 : 18}px Montserrat`, C.ink);
        if (sub) txt(g, sub, x + 14, 102, 'italic 600 13px Jost', C.muted);
        if (i < 3) arrow(g, x + 230, 70, x + 252, 70, lit && since > (i + 1) * .12 ? C.navy : '#d8ccb2', 3);
      });
      // the scene
      g.fillStyle = '#e8dcc0'; g.fillRect(24, 140, 992, FLOOR - 140);
      g.fillStyle = '#cdbf9f'; g.fillRect(24, FLOOR, 992, 22);
      // the door
      const opened = state === 'door' && presses.some(p => resolve(p[0], state, shared).k === 'open' && t - p[1] > .2);
      const DX = 700;
      g.fillStyle = '#7a4a1a'; g.fillRect(DX - 6, FLOOR - 176, 92, 176);
      if (!opened) { g.fillStyle = '#a8692c'; g.fillRect(DX, FLOOR - 170, 80, 170); g.fillStyle = C.gold; g.beginPath(); g.arc(DX + 14, FLOOR - 84, 6, 0, 7); g.fill(); }
      else { g.fillStyle = '#2a2e55'; g.fillRect(DX, FLOOR - 170, 80, 170); g.fillStyle = '#a8692c'; g.beginPath(); g.moveTo(DX + 80, FLOOR - 170); g.lineTo(DX + 104, FLOOR - 186); g.lineTo(DX + 104, FLOOR + 10); g.lineTo(DX + 80, FLOOR); g.fill(); }
      // slash marks on the door
      const cuts = state === 'door' ? presses.filter(p => resolve(p[0], state, shared).k === 'slashdoor' && t - p[1] > .3).length : 0;
      for (let i = 0; i < cuts; i++) { g.strokeStyle = '#4a2a0a'; g.lineWidth = 4; g.beginPath(); g.moveTo(DX + 14 + i * 18, FLOOR - 130 + i * 10); g.lineTo(DX + 50 + i * 12, FLOOR - 60 + i * 6); g.stroke(); }
      if (state !== 'door') { g.globalAlpha = .25; } else g.globalAlpha = 1;
      txt(g, 'door', DX + 40, FLOOR - 190, '700 13px Jost', C.muted, 'center'); g.globalAlpha = 1;
      // the hero
      const hx = state === 'door' ? 630 : HX, hy = state === 'air' ? FLOOR - 120 + (out && out.k === 'plunge' ? clamp(since / .35) * 120 : Math.sin(t * 3) * 6) : FLOOR;
      let pose = 'idle', k = 0;
      if (out && since < Math.max(.5, out.lock + .2)) { pose = out.k === 'none' ? 'idle' : out.k; k = clamp(since / out.lock); }
      if (state === 'tired') pose = 'tired';
      if (opened) pose = since < .6 ? 'open' : 'idle';
      hero(opened && since > .6 ? hx + Math.min(120, (since - .6) * 160) : hx, hy, pose, k);
      // stamina
      txt(g, 'Stamina', 44, 164, '700 13px Jost', C.muted);
      box(g, 104, 157, 160, 14, '#efe4cc', null, 7); box(g, 104, 157, state === 'tired' ? 6 : 140, 14, state === 'tired' ? '#e5322d' : '#2fae63', null, 7);
      if (out && since < 1.3) T.popText(out.k === 'tired' ? 'huff… huff…' : out.k === 'slashdoor' ? 'CLANG' : out.k === 'open' ? 'creak' : out.k === 'plunge' ? 'PLUNGE' : out.k === 'slash' ? 'SLASH' : '', hx + 10, hy - 130, out.k === 'slashdoor' ? C.redDk : C.goldInk, clamp(1.3 - since));
      // commitment strip
      txt(g, 'Locked in the move', 24, 500, '700 13px Jost', C.muted);
      box(g, 160, 490, 856, 20, '#efe4cc', null, 6);
      const span = 3, x0 = 160, sx = x => x0 + 856 * clamp((x - (t - span)) / span);
      presses.forEach(p => { const r = resolve(p[0], state, shared); if (!r.lock) return; const a = sx(p[1]), b = sx(p[1] + r.lock); if (b > a) box(g, a, 490, b - a, 20, r.k === 'slashdoor' ? '#e5322d' : r.k === 'open' ? '#2fae63' : '#e0a92d', null, 6); g.fillStyle = C.navy; g.fillRect(a - 1, 484, 2, 32); });
      txt(g, 'last 3 seconds', 1016, 528, '600 12px Jost', C.muted, 'right');
      const doorMsg = state === 'door' ? (shared ? 'Attack and Interact share a button' : 'Attack and Interact are separate') : '';
      txt(g, doorMsg, 24, 556, '700 15px Jost', shared ? C.redDk : C.good);
      const key = st.tour ? 'T' + ITOUR.filter(p => p[3] <= t).length : state + shared + presses.length; if (key === st.key) return; st.key = key;
      const n = st.tour ? ITOUR.filter(p => p[3] <= t).length : 0;
      say($(s, '.in-out'), st.tour ? ISAY[n <= 3 ? Math.max(0, n - 1) : n <= 6 ? 3 : 4] : out ? `${btnName.split(' ')[0]} → ${actName} → ${STATES[state]} → <b>${out.s}</b>.` : 'Pick a situation and press a button.');
    }
    apis.intent = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });

  /* ---------- 2: do what they meant (coyote time and the jump buffer) ---------- */
  const SPR = { stand: img('img/smb-mario.png'), w1: img('img/smb-mario-walk1.png'), w2: img('img/smb-mario-walk2.png'), w3: img('img/smb-mario-walk3.png'), jump: img('img/smb-mario-jump.png'), ground: img('img/smb-ground.png'), block: img('img/smb-block.png'), cloud: img('img/smb-cloud.png') };
  // frames are 60 per second. Ledge: press relative to the frame Mario leaves the edge (+ is late).
  // Landing: press relative to the frame Mario touches the narrow block (− is early, still in the air).
  const LEDGE = { mean: .6, sd: 2.6, early: -8 }, LAND = { mean: -2.6, sd: 2.4, late: 7 };
  const PRESSES = (seed, P) => { const r = rng(seed); return Array.from({ length: 20 }, () => Math.round(P.mean + P.sd * gauss(r))); };
  const LP = PRESSES(5, LEDGE), BP = PRESSES(9, LAND);
  const okLedge = (o, coy) => o >= LEDGE.early && o <= coy;
  const okLand = (o, buf) => o >= -buf && o <= LAND.late;
  canvasDemo('meant', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, sc: 'ledge', coy: 0, buf: 0, key: '' };
    const tourBtn = $(s, '.mn-tour'), free = freeOf(st, tourBtn), cIn = $(s, '.mn-coy'), bIn = $(s, '.mn-buf');
    const setSc = v => { st.sc = v; $$(s, '.mn-sc .btn').forEach(b => b.classList.toggle('on', b.dataset.s === v)); };
    $$(s, '.mn-sc .btn').forEach(b => b.onclick = () => { free(); setSc(b.dataset.s); });
    cIn.oninput = () => { free(); st.coy = +cIn.value; };
    bIn.oninput = () => { free(); st.buf = +bIn.value; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const PER = 1.6, DUR = 30;
    const TS = 32, GY = 300, EDGE = 560, FAR = 688, V = 4, VY = 10.5, GR = .52;
    const spr = (im, x, y, w = 32, h = 32, flip) => { if (!im.complete || !im.naturalWidth) return; g.save(); g.imageSmoothingEnabled = false; g.translate(x, y); if (flip) g.scale(-1, 1); g.drawImage(im, -w / 2, -h, w, h); g.restore(); };
    // one attempt's Mario position at frame f (relative to the key frame), and whether it worked
    function ledgeAt(o, f, coy) {
      const ok = okLedge(o, coy), fj = o; let x = EDGE + V * f, y = 0, air = false, fell = false;
      if (o <= coy && f >= fj) { const d = f - fj; y = VY * d - GR / 2 * d * d; air = true; if (y <= 0 && d > 2) { const land = EDGE + V * (fj + 2 * VY / GR); if (land >= FAR) { y = 0; air = false; } else fell = true; } }
      else if (f > 0) { const d = f; y = -GR / 2 * d * d; air = true; fell = true; }
      if (fell && y < 0) y = Math.max(y, -300);
      return { x, y, air, ok };
    }
    const PIL = 470, NEXT = 620;
    function landAt(o, f, buf) {
      // falls onto the narrow block at f = 0, needs to hop on to the next one before running off at f = LAND.late
      const ok = okLand(o, buf), fj = o < 0 ? (o >= -buf ? 0 : null) : (o <= LAND.late ? o : null);
      const x = PIL + V * f;
      let y = f < 0 ? GR / 2 * f * f : 0, air = f < 0;
      if (fj !== null && f >= fj) { const d = f - fj; y = VY * d - GR / 2 * d * d; air = true; if (y <= 0 && d > 2) { y = 0; air = false; } }
      else if (fj === null && f > LAND.late) { const d = f - LAND.late; y = -GR / 2 * d * d; air = true; }
      return { x, y: Math.max(y, -300), air, ok, pressedAir: o < 0 };
    }
    function render() {
      const t = st.t;
      if (st.tour) {
        const sc = t < 15 ? 'ledge' : 'land'; if (st.sc !== sc) setSc(sc);
        const k = t < 15 ? t : t - 15, v = k < 6.5 ? 0 : 6;
        if (sc === 'ledge') { st.coy = v; st.buf = 0; } else { st.buf = v; st.coy = 6; }
        cIn.value = st.coy; bIn.value = st.buf;
      }
      $(s, '.mn-cv').textContent = st.coy + ' frames'; $(s, '.mn-bv').textContent = st.buf + ' frames';
      const ledge = st.sc === 'ledge', presses = ledge ? LP : BP, win = ledge ? st.coy : st.buf;
      const okf = o => ledge ? okLedge(o, st.coy) : okLand(o, st.buf);
      const idx = Math.floor((st.tour ? (t % 15) : t) / PER) % 20, f = ((st.tour ? (t % 15) : t) % PER) / PER * 96 - 40, o = presses[idx];
      T.use(g); panel(g);
      // sky and ground
      g.fillStyle = '#9fb8f8'; g.beginPath(); g.roundRect(20, 20, 1000, 330, 12); g.fill();
      spr(SPR.cloud, 200, 92, 64, 48); spr(SPR.cloud, 820, 70, 64, 48);
      g.save(); g.beginPath(); g.roundRect(20, 20, 1000, 330, 12); g.clip();
      const tile = (x, y) => { if (SPR.ground.complete) { g.imageSmoothingEnabled = false; g.drawImage(SPR.ground, x, y, TS, TS); } };
      if (ledge) { for (let x = 20; x < EDGE; x += TS) { tile(x, GY); tile(x, GY + TS); } for (let x = FAR; x < 1020; x += TS) { tile(x, GY); tile(x, GY + TS); } }
      else { for (let x = 20; x < 220; x += TS) { tile(x, GY); tile(x, GY + TS); } for (let y = GY; y < 360; y += TS) tile(PIL - 6, y); for (let x = NEXT; x < 1020; x += TS) { tile(x, GY); tile(x, GY + TS); } }
      // Mario
      const m = ledge ? ledgeAt(o, f, st.coy) : landAt(o, f, st.buf);
      const my = GY - m.y;
      const im = m.air ? SPR.jump : [SPR.w1, SPR.w2, SPR.w3][Math.floor(f / 4 + 99) % 3];
      spr(im, m.x, my, 32, 32);
      g.restore();
      // the press
      const pressedNow = f >= o && f < o + 14;
      if (pressedNow) T.popText(okf(o) ? 'JUMP!' : 'I pressed jump!', m.x, my - 52, okf(o) ? C.good : C.redDk, 1 - (f - o) / 14);
      const ok = okf(o);
      if (f > 30) T.stamp(ok ? 'Felt right' : 'Felt cheated', 860, 120, ok ? C.good : C.redDk, clamp((f - 30) / 6), 22);
      txt(g, `Attempt ${idx + 1} of 20 · pressed ${o > 0 ? o + ' frames late' : o < 0 ? -o + ' frames early' : 'on the frame'}`, 40, 42, '800 16px Montserrat', '#fff');
      // the frame strip
      const SY = 392, SX = 70, SW = 900, F0 = -12, F1 = 12, fx = q => SX + (q - F0) / (F1 - F0) * SW;
      txt(g, ledge ? 'Press time relative to leaving the ledge (frames, 60 per second)' : 'Press time relative to landing on the narrow block (frames)', SX, SY - 12, '700 14px Jost', C.muted);
      box(g, SX, SY, SW, 70, 'rgba(229,50,45,.08)', '#e8d0c8', 8, 1.5);
      const zone = (a, b, col, lab) => { const x0 = fx(Math.max(F0, a - .5)), x1 = fx(Math.min(F1, b + .5)); if (x1 <= x0) return; g.fillStyle = col; g.fillRect(x0, SY, x1 - x0, 70); if (lab) txt(g, lab, (x0 + x1) / 2, SY + 82, '700 12px Jost', C.ink, 'center'); };
      if (ledge) { zone(LEDGE.early, 0, 'rgba(47,174,99,.28)', 'on the ground'); zone(1, st.coy, 'rgba(255,185,81,.55)', st.coy ? 'coyote time' : ''); }
      else { zone(-st.buf, -1, 'rgba(255,185,81,.55)', st.buf ? 'buffered' : ''); zone(0, LAND.late, 'rgba(47,174,99,.28)', 'on the block'); }
      for (let q = F0; q <= F1; q += 2) txt(g, String(q), fx(q), SY + 100, '600 11px Jost', C.muted, 'center');
      g.fillStyle = C.navy; g.fillRect(fx(0) - 1, SY - 4, 2, 78);
      const rows = {};
      presses.forEach((q, i) => { const r = rows[q] = (rows[q] || 0) + 1, x = fx(q), y = SY + 70 - r * 12, k = okf(q), cur = i === idx;
        g.fillStyle = k ? '#2fae63' : '#e5322d'; g.beginPath(); g.arc(x, y, cur ? 7 : 5, 0, 7); g.fill(); if (cur) { g.strokeStyle = C.navy; g.lineWidth = 2; g.stroke(); } });
      const okN = presses.filter(okf).length;
      box(g, 20, 520, 1000, 50, 'rgba(21,32,68,.05)', null, 10);
      txt(g, `${okN} of 20 presses did what the player meant`, 40, 545, '800 20px Montserrat', okN >= 18 ? C.good : okN >= 12 ? C.goldInk : C.redDk);
      txt(g, ledge ? `coyote time ${st.coy} frames` : `jump buffer ${st.buf} frames`, 1000, 545, '700 16px Jost', C.muted, 'right');
      const key = [st.sc, st.coy, st.buf].join(); if (key === st.key) return; st.key = key;
      say($(s, '.mn-out'), ledge
        ? st.coy ? `With ${st.coy} frames of coyote time, ${okN} of 20 jumps come out. Nobody notices the help; they just feel like they nailed it.` : `No coyote time: a press one frame after the edge is a fall. ${20 - okN} of 20 players swear they pressed jump.`
        : st.buf ? `A ${st.buf}-frame buffer remembers early presses and fires the jump the instant Mario lands: ${okN} of 20.` : `No buffer: early presses in the air are thrown away, and Mario runs off the narrow block. ${okN} of 20.`);
    }
    apis.meant = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });

  /* ---------- 3: same camera, three games ---------- */
  // sx: where the hero sits across the screen (0 left, 1 right); dist: camera distance behind; fov: horizontal degrees
  const GAMES = {
    gow: { n: 'God of War (2018)', sx: .3, dist: 46, fov: 62, lock: false, ind: true, fantasy: 'A god demolishing enemies up close', verb: 'Melee: throw and recall the axe', feel: 'Heavy, tactile, deliberate', col: '#a8201c' },
    hzd: { n: 'Horizon Zero Dawn', sx: .36, dist: 78, fov: 72, lock: false, ind: false, fantasy: 'A hunter solving a machine like a puzzle', verb: 'Ranged: precision component targeting', feel: 'Nimble, tactical, shooter-adjacent', col: '#1f6f99' },
    er: { n: 'Elden Ring', sx: .5, dist: 92, fov: 72, lock: true, ind: false, fantasy: 'A duelist surviving on a budget', verb: 'Melee: spacing and timing', feel: 'Precise, punishing, risk and reward', col: '#9a5a06' },
  };
  const GK = Object.keys(GAMES);
  canvasDemo('camera', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, game: 'gow', sx: .3, dist: 46, fov: 62, key: '' };
    const tourBtn = $(s, '.ca-tour'), free = freeOf(st, tourBtn), xIn = $(s, '.ca-sx'), dIn = $(s, '.ca-dist'), fIn = $(s, '.ca-fov');
    const setGame = k => { st.game = k; const G = GAMES[k]; st.sx = G.sx; st.dist = G.dist; st.fov = G.fov; xIn.value = G.sx * 100; dIn.value = G.dist; fIn.value = G.fov; $$(s, '.ca-game .btn').forEach(b => b.classList.toggle('on', b.dataset.g === k)); };
    $$(s, '.ca-game .btn').forEach(b => b.onclick = () => { free(); setGame(b.dataset.g); });
    xIn.oninput = () => { free(); st.sx = xIn.value / 100; }; dIn.oninput = () => { free(); st.dist = +dIn.value; }; fIn.oninput = () => { free(); st.fov = +fIn.value; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const PER = 7, DUR = PER * 3;
    const AX = 30, AY = 30, AW = 560, AH = 525, PX = AX + AW / 2, PY = AY + AH * .62;
    function render() {
      const t = st.t;
      if (st.tour) { const k = GK[Math.min(2, Math.floor(t / PER))]; if (k !== st.game) setGame(k); }
      const G = GAMES[st.game], fov = st.fov * Math.PI / 180, half = fov / 2, tanh = Math.tan(half);
      // the same eight enemies circle the hero
      const E = Array.from({ length: 8 }, (_, i) => { const a = i / 8 * Math.PI * 2 + t * .12 + .2, r = 105 + (i % 3) * 38; return { x: PX + Math.cos(a) * r, y: PY + Math.sin(a) * r }; });
      // the locked target is the nearest enemy in front; the camera looks past the hero at it
      const fwd0 = -Math.PI / 2;
      const front = E.map((e, i) => ({ i, d: Math.hypot(e.x - PX, e.y - PY), a: Math.abs(Math.atan2(Math.sin(Math.atan2(e.y - PY, e.x - PX) - fwd0), Math.cos(Math.atan2(e.y - PY, e.x - PX) - fwd0))) })).sort((a, b) => a.a - b.a)[0];
      const look = G.lock && st.game === 'er' ? Math.atan2(E[front.i].y - PY, E[front.i].x - PX) : fwd0;
      const shoulder = (.5 - st.sx) * 2 * st.dist * tanh;
      const fx = Math.cos(look), fy = Math.sin(look), rx = -fy, ry = fx;
      const CX = PX - fx * st.dist + rx * shoulder, CY = PY - fy * st.dist + ry * shoulder;
      const proj = (x, y) => { const dx = x - CX, dy = y - CY, z = dx * fx + dy * fy, l = dx * rx + dy * ry; return { z, sx: .5 + l / z / (2 * tanh), vis: z > 4 && Math.abs(l / z) <= tanh }; };
      T.use(g); panel(g);
      // top-down arena
      box(g, AX, AY, AW, AH, '#ddd2bc', '#cdbf9f', 12, 2);
      txt(g, 'Top-down', AX + 14, AY + 20, '800 14px Montserrat', C.muted);
      // view wedge
      g.fillStyle = 'rgba(255,185,81,.28)'; g.beginPath(); g.moveTo(CX, CY);
      g.lineTo(CX + Math.cos(look - half) * 900, CY + Math.sin(look - half) * 900); g.lineTo(CX + Math.cos(look + half) * 900, CY + Math.sin(look + half) * 900); g.closePath();
      g.save(); g.beginPath(); g.roundRect(AX, AY, AW, AH, 12); g.clip(); g.fill();
      g.strokeStyle = 'rgba(154,90,6,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(CX + Math.cos(look - half) * 900, CY + Math.sin(look - half) * 900); g.lineTo(CX, CY); g.lineTo(CX + Math.cos(look + half) * 900, CY + Math.sin(look + half) * 900); g.stroke();
      g.restore();
      const P = E.map(e => proj(e.x, e.y)), vis = P.filter(p => p.vis).length;
      E.forEach((e, i) => { T.foe(e.x, e.y, 15, Math.atan2(PY - e.y, PX - e.x), P[i].vis ? C.red : '#c9a5a2'); if (G.lock && st.game === 'er' && i === front.i) { g.strokeStyle = C.gold; g.lineWidth = 3; g.beginPath(); g.arc(e.x, e.y, 22, 0, 7); g.stroke(); } });
      T.player(PX, PY, look, 1.05);
      // the camera
      g.fillStyle = C.navy; g.save(); g.translate(CX, CY); g.rotate(look); g.fillRect(-14, -9, 20, 18); g.beginPath(); g.moveTo(6, -5); g.lineTo(16, -10); g.lineTo(16, 10); g.lineTo(6, 5); g.fill(); g.restore();
      txt(g, 'camera', CX + 16, CY + 20, '700 12px Jost', C.navy);
      // the screen
      const SX0 = 618, SY0 = 40, SW = 400, SH = 225;
      box(g, SX0 - 6, SY0 - 6, SW + 12, SH + 12, C.navy, null, 12);
      const sky = g.createLinearGradient(0, SY0, 0, SY0 + SH); sky.addColorStop(0, '#c9d6f2'); sky.addColorStop(.55, '#e8dcc0'); sky.addColorStop(1, '#cdbf9f');
      g.fillStyle = sky; g.fillRect(SX0, SY0, SW, SH);
      g.save(); g.beginPath(); g.rect(SX0, SY0, SW, SH); g.clip();
      // thirds
      g.strokeStyle = 'rgba(21,32,68,.15)'; g.lineWidth = 1; [1 / 3, 2 / 3].forEach(q => { g.beginPath(); g.moveTo(SX0 + SW * q, SY0); g.lineTo(SX0 + SW * q, SY0 + SH); g.stroke(); });
      const draws = E.map((e, i) => ({ e, p: P[i], i })).filter(o => o.p.vis).sort((a, b) => b.p.z - a.p.z);
      draws.forEach(({ p }) => { const sc = clamp(60 / p.z, .15, 1.6), x = SX0 + p.sx * SW, y = SY0 + SH * .56 + 40 * sc; g.fillStyle = C.red; g.beginPath(); g.ellipse(x, y - 34 * sc, 16 * sc, 34 * sc, 0, 0, 7); g.fill(); });
      // the hero, close to the lens
      const hp = proj(PX, PY), hs = clamp(60 / hp.z, .5, 1.5), hxs = SX0 + hp.sx * SW;
      g.fillStyle = C.player; g.beginPath(); g.ellipse(hxs, SY0 + SH - 36 * hs + 30, 30 * hs, 62 * hs, 0, 0, 7); g.fill();
      g.fillStyle = '#d6dbef'; g.beginPath(); g.arc(hxs, SY0 + SH - 100 * hs + 30, 18 * hs, 0, 7); g.fill();
      // off-screen indicators (God of War style)
      if (G.ind) E.forEach((e, i) => { if (P[i].vis) return; const a = Math.atan2(e.y - PY, e.x - PX) - look, side = Math.sin(a); const x = SX0 + SW / 2 + Math.max(-1, Math.min(1, side * 1.4)) * (SW / 2 - 18), y = SY0 + SH / 2 + Math.max(0, -Math.cos(a)) * (SH / 2 - 18); g.save(); g.translate(x, y); g.rotate(Math.atan2(Math.max(0, -Math.cos(a)) * .9, side) ); g.fillStyle = 'rgba(229,50,45,.9)'; g.beginPath(); g.moveTo(12, 0); g.lineTo(-6, -8); g.lineTo(-6, 8); g.fill(); g.restore(); });
      g.restore();
      txt(g, 'what the player sees', SX0 + SW, SY0 + SH + 20, '600 12px Jost', C.muted, 'right');
      txt(g, `hero at ${Math.round(st.sx * 100)}% across`, SX0, SY0 + SH + 20, '700 12px Jost', C.ink);
      // the card
      const Y = 312;
      box(g, SX0 - 6, Y, SW + 12, 240, '#fffaf0', G.col, 12, 2.5);
      txt(g, G.n, SX0 + 10, Y + 24, '800 19px Montserrat', G.col);
      [['Core fantasy', G.fantasy], ['Primary verb', G.verb], ['Feel', G.feel]].forEach(([h, v], i) => { txt(g, h, SX0 + 10, Y + 58 + i * 40, '700 12px Jost', C.muted); txt(g, v, SX0 + 10, Y + 76 + i * 40, '600 15px Jost'); });
      txt(g, `${vis} of 8 enemies on screen`, SX0 + 10, Y + 196, '800 18px Montserrat', vis >= 5 ? C.good : vis >= 3 ? C.goldInk : C.redDk);
      txt(g, G.ind ? 'red arrows: off-screen attackers' : G.lock ? 'lock-on: camera follows the target' : 'free camera', SX0 + 10, Y + 222, '600 13px Jost', C.muted);
      const key = [st.game, Math.round(st.sx * 100), st.dist, st.fov, vis].join(); if (key === st.key) return; st.key = key;
      say($(s, '.ca-out'), st.game === 'gow'
        ? `Kratos sits far left and the camera hugs his shoulder: ${vis} of 8 enemies in view. That lost peripheral vision is why the game paints arrows for attacks from behind.`
        : st.game === 'hzd'
          ? `Aloy sits a third of the way in, with the camera pulled back for range: ${vis} of 8 in view, room to aim and pick machines apart.`
          : `The Tarnished stands dead centre and lock-on swings the camera onto one foe: ${vis} of 8 in view, while the rest circle to punish you from an angle you forgot.`);
    }
    apis.camera = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });

  window.__seek = (t, w) => apis[w].seek(t);
  window.__dur = w => apis[w].dur();
})();
