/* Source of power (RGF C2 M4, 3Cs: Character, Part 6: "Silhouette and Metrics").
   Slide 1: pick a character's source of power (Link's sword, Ratchet's gadgets, Kenny the talking gun, Trundle's ice club)
   and watch it inform the rest of the character: silhouette, core moves, reach, animation, voice and story.
   Slide 2: personality through animation. Kratos, "a Spartan warrior with the grace and fluidity of a ballerina", against
   the heavy, grounded, animation-locked Ashen One. One attack button drives both; frame counts are illustrative.
   Both canvases are pure functions of time (and, on slide 2, of the press timeline), so window.__seek is deterministic. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585;
  const IMG = {};
  const load = n => { if (IMG[n]) return IMG[n]; const i = new Image(); i.src = `img/${n}`; IMG[n] = i; return i; };
  const ok = i => i && i.complete && i.naturalWidth;
  const cover = (g, n, x, y, w, h, fx = .5, fy = .3) => {
    const i = load(n); if (!ok(i)) { g.fillStyle = '#3d4270'; g.fillRect(x, y, w, h); return; }
    const k = Math.max(w / i.naturalWidth, h / i.naturalHeight), sw = w / k, sh = h / k;
    g.drawImage(i, (i.naturalWidth - sw) * fx, (i.naturalHeight - sh) * fy, sw, sh, x, y, w, h);
  };
  const contain = (g, n, x, y, w, h) => {
    const i = load(n); if (!ok(i)) return;
    const k = Math.min(w / i.naturalWidth, h / i.naturalHeight), dw = i.naturalWidth * k, dh = i.naturalHeight * k;
    g.drawImage(i, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  };
  const font = (s, w = 600, f = 'Jost') => `${w} ${s}px ${f}, sans-serif`;
  const text = (g, s, x, y, size, col = C.ink, w = 600, align = 'left', fam = 'Jost') => { g.font = font(size, w, fam === 'M' ? 'Montserrat, Jost' : fam); g.fillStyle = col; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(s, x, y); };
  function wrap(g, s, x, y, maxW, lh, size, col = C.ink, w = 500) {
    g.font = font(size, w); g.fillStyle = col; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    let line = '', yy = y;
    s.split(' ').forEach(word => { const test = line ? line + ' ' + word : word; if (g.measureText(test).width > maxW && line) { g.fillText(line, x, yy); line = word; yy += lh; } else line = test; });
    if (line) g.fillText(line, x, yy);
    return yy;
  }
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  const glyph = (g, e, x, y, size, col) => { g.save(); g.font = font(size, 600); g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, x, y); g.restore(); };
  const scenes = {};

  /* ---------- slide 1: the source of power informs the rest ---------- */
  const SRC = [
    { id: 'link', who: 'Link', game: 'The Legend of Zelda', art: 'link.jpg', fy: .2, power: 'A sword', icon: '⚔', col: '#2e7dd1',
      line: 'The sword is how Link meets the world: the blade that chooses its hero.',
      reach: 'melee',
      spokes: ['A blade in hand and a shield on the back: you know what he does at a glance.', 'Slash, spin attack, block and parry.', 'Close range: he has to step in.', 'Planted feet and wide, readable sword arcs.', 'Silent: the sword does the talking.', 'A hero chosen by a legendary blade.'] },
    { id: 'ratchet', who: 'Ratchet', game: 'Ratchet & Clank: Rift Apart', art: 'ratchet.jpg', fy: .3, power: 'Guns and gizmos', icon: '🔧', col: '#e0702d',
      line: 'Ratchet\'s power is his arsenal: a mechanic with a wrench and a backpack full of guns and gadgets.',
      reach: 'arsenal',
      spokes: ['A big gun in hand, a wrench, a gadget gauntlet and tech on his back.', 'Shoot, swap weapons, swing the wrench, grind and hover.', 'Every range: each gadget has its own reach.', 'Quick swaps, recoil and fizzing tech on every action.', 'A quippy tinkerer who loves his toys.', 'A mechanic who builds his way out of trouble.'] },
    { id: 'kenny', who: 'Kenny', game: 'High on Life', art: 'kenny.jpg', fy: .4, power: 'A talking gun', icon: '🔫', col: '#3fa65a',
      line: 'High on Life personifies the source of power: Kenny the Gatlian is the gun, and he never stops talking.',
      reach: 'ranged',
      spokes: ['The weapon itself has eyes and a mouth: the power is the most visible character on screen.', 'Shoot, charge a glob shot, and banter between fights.', 'Ranged: the gun fights for you at a distance.', 'The gun reacts, blinks and squirms in your hand.', 'The power has the voice: a companion with opinions.', 'Your weapon is your partner on the adventure.'] },
    { id: 'trundle', who: 'Trundle', game: 'League of Legends', art: 'trundle.jpg', fy: .4, power: 'A magic ice club', icon: '🧊', col: '#3aa6c9',
      line: 'Trundle\'s rework introduced a new source of power, a magical club of ice, which worked with all of the existing mechanics.',
      reach: 'zone',
      spokes: ['A hulking troll king with a frozen club over his shoulder.', 'Chomp, freeze the ground, raise a pillar of ice.', 'Melee, plus a frozen zone he fights inside.', 'Heavy, frosty swings that crack the ice.', 'A bragging troll king of the frozen north.', 'He rules the Freljord\'s trolls with ice.'] },
  ];
  const SPOKES = ['Silhouette', 'Core moves', 'Reach', 'Animation', 'Voice', 'Story'];
  SRC.forEach(s => load(s.art));
  const HUB = { x: 730, y: 300, r: 66 }, CW = 196, CH = 104;
  const CARD = [[432, 30], [832, 30], [432, 248], [832, 248], [432, 466], [832, 466]];
  const PER = 4.2, POW_DUR = PER * SRC.length;

  function reachDraw(g, kind, x, y, col, t) {
    // a tiny top-down reach diagram: the character dot and what the power lets them touch
    g.save(); g.fillStyle = 'rgba(21,32,68,.06)'; rr(g, x - 34, y - 26, 68, 52, 8); g.fill();
    g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 2;
    if (kind === 'melee') { g.globalAlpha = .25; g.beginPath(); g.moveTo(x - 10, y); g.arc(x - 10, y, 22, -.9, .9); g.closePath(); g.fill(); g.globalAlpha = 1; }
    if (kind === 'ranged') { g.globalAlpha = .2; g.beginPath(); g.moveTo(x - 20, y); g.lineTo(x + 32, y - 12); g.lineTo(x + 32, y + 12); g.closePath(); g.fill(); g.globalAlpha = 1; const p = (t * 1.5) % 1; g.beginPath(); g.arc(x - 16 + p * 46, y, 2.5, 0, TAU); g.fill(); }
    if (kind === 'arsenal') { g.globalAlpha = .18; g.beginPath(); g.arc(x - 12, y, 12, 0, TAU); g.fill(); g.beginPath(); g.moveTo(x - 12, y); g.lineTo(x + 32, y - 14); g.lineTo(x + 32, y + 6); g.closePath(); g.fill(); g.globalAlpha = 1; [0, .33, .66].forEach(o => { const p = (t * 1.2 + o) % 1; g.beginPath(); g.arc(x - 12 + p * 44, y - 4 - o * 6, 2, 0, TAU); g.fill(); }); }
    if (kind === 'zone') { g.globalAlpha = .22; g.beginPath(); g.arc(x - 4, y, 22, 0, TAU); g.fill(); g.globalAlpha = .5; g.beginPath(); g.arc(x - 4, y, 22, 0, TAU); g.stroke(); g.globalAlpha = 1; }
    g.fillStyle = C.ink; g.beginPath(); g.arc(kind === 'zone' ? x - 4 : kind === 'melee' ? x - 10 : kind === 'ranged' ? x - 20 : x - 12, y, 5, 0, TAU); g.fill();
    g.restore();
  }
  function drawPower(g, i, since, t) {
    const s = SRC[i];
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.92)'; rr(g, 0, 0, W, H, 14); g.fill();
    // the character card, art from the deck
    const lx = 12, ly = 12, lw = 400, lh = H - 24;
    g.fillStyle = '#152044'; rr(g, lx, ly, lw, lh, 12); g.fill();
    g.save(); rr(g, lx, ly, lw, 300, [12, 12, 0, 0]); g.clip(); cover(g, s.art, lx, ly, lw, 300, .5, s.fy);
    g.fillStyle = 'rgba(13,20,36,.72)'; g.fillRect(lx, ly + 274, lw, 26); text(g, 'From the course deck', lx + 12, ly + 292, 13, '#fffaf0', 600); g.restore();
    text(g, s.who, lx + 20, ly + 342, 30, '#fffaf0', 800, 'left', 'M');
    text(g, s.game, lx + 20, ly + 366, 15, '#c9d3f0', 600);
    g.fillStyle = s.col; rr(g, lx + 20, ly + 384, 0, 0, 0);
    g.font = font(15, 700); const pw = g.measureText('Source of power: ' + s.power).width + 24;
    g.fillStyle = s.col; rr(g, lx + 20, ly + 382, pw, 30, 8); g.fill();
    text(g, 'Source of power: ' + s.power, lx + 32, ly + 402, 15, '#fff', 700);
    wrap(g, s.line, lx + 20, ly + 444, lw - 40, 23, 17, '#fffaf0', 500);
    // hub
    const pulse = .5 + .5 * Math.sin(t * 3);
    const hubIn = ease(clamp(since / .4));
    g.save(); g.shadowColor = s.col; g.shadowBlur = 18 + 10 * pulse;
    g.fillStyle = s.col; g.beginPath(); g.arc(HUB.x, HUB.y, HUB.r * (.7 + .3 * hubIn), 0, TAU); g.fill(); g.restore();
    g.strokeStyle = '#fffaf0'; g.lineWidth = 4; g.beginPath(); g.arc(HUB.x, HUB.y, HUB.r * (.7 + .3 * hubIn), 0, TAU); g.stroke();
    glyph(g, s.icon, HUB.x, HUB.y - 8, 54, '#fffaf0');
    text(g, 'Source of power', HUB.x, HUB.y + 36, 12, '#fffaf0', 700, 'center');
    // spokes and cards, lit one after another
    CARD.forEach(([cx, cy], k) => {
      const ccx = cx + CW / 2, ccy = cy + CH / 2, a = clamp((since - .35 - k * .28) / .45);
      const ex = ccx < HUB.x ? cx + CW : cx, ey = ccy;
      const dx = ex - HUB.x, dy = ey - HUB.y, dl = Math.hypot(dx, dy), sx = HUB.x + dx / dl * HUB.r, sy = HUB.y + dy / dl * HUB.r;
      g.strokeStyle = a > 0 ? s.col : '#d9cfb8'; g.lineWidth = 3; g.globalAlpha = .35 + .65 * a;
      g.beginPath(); g.moveTo(sx, sy); g.lineTo(lerp(sx, ex, Math.max(a, .001)), lerp(sy, ey, Math.max(a, .001))); g.stroke(); g.globalAlpha = 1;
      if (a > 0 && a < 1) { g.fillStyle = s.col; g.beginPath(); g.arc(lerp(sx, ex, a), lerp(sy, ey, a), 6, 0, TAU); g.fill(); }
      g.fillStyle = '#fffaf0'; g.strokeStyle = a >= 1 ? s.col : '#d9cfb8'; g.lineWidth = 2.5; rr(g, cx, cy, CW, CH, 10); g.fill(); g.stroke();
      text(g, SPOKES[k], cx + 12, cy + 22, 13, a > 0 ? s.col : C.muted, 800, 'left', 'M');
      g.save(); g.globalAlpha = a;
      if (k === 2) { reachDraw(g, s.reach, cx + CW - 44, cy + 30, s.col, t); wrap(g, s.spokes[k], cx + 12, cy + 64, CW - 24, 17, 14, C.ink, 500); }
      else wrap(g, s.spokes[k], cx + 12, cy + 44, CW - 24, 17, 14, C.ink, 500);
      g.restore();
    });
  }
  canvasDemo('power', (s, cv, g) => {
    const st = { i: 0, t: 0, at: 0, tour: true, held: false, key: '' };
    const tourBtn = $(s, '.sp-tour');
    const free = () => { st.held = false; st.tour = false; tourBtn.classList.remove('on'); };
    $$(s, '.sp-src .btn').forEach(b => b.onclick = () => { free(); st.i = +b.dataset.i; st.at = st.t; });
    tourBtn.onclick = () => { st.held = false; st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    function render(t) {
      let i = st.i, since = t - st.at;
      if (st.tour) { const tt = t % POW_DUR; i = Math.floor(tt / PER); since = tt - i * PER; }
      drawPower(g, i, since, t);
      if (st.key === i) return; st.key = i;
      $$(s, '.sp-src .btn').forEach(b => b.classList.toggle('on', +b.dataset.i === i));
      say($(s, '.sp-out'), `${SRC[i].who}: ${SRC[i].power.toLowerCase()}. ${SRC[i].line}`);
    }
    scenes.power = { seek(t) { st.held = true; st.tour = true; render(t); }, dur: () => POW_DUR };
    return dt => { if (st.held) return; st.t += dt; if (st.tour && st.t >= POW_DUR) st.t = 0; render(st.t); };
  });

  /* ---------- slide 2: personality and animation ---------- */
  // illustrative frame data at 60 fps. Kratos cancels into the next hit right after the active frames; the Ashen One is
  // committed to the whole swing. Both buffer one press.
  const FPS = 60;
  const STYLE = {
    kratos: { name: 'Kratos', game: 'God of War', art: 'kratos-ballerina.jpg', light: true, col: '#c8372d', windup: 6, active: 5, recovery: 14, cancel: true, chain: 3,
      words: 'A Spartan warrior with the grace and fluidity of a ballerina: fast, spinning, chained.' },
    ashen: { name: 'The Ashen One', game: 'Dark Souls', art: 'ashen-one.jpg', col: '#8a6a2a', windup: 22, active: 6, recovery: 30, cancel: false, chain: 2,
      words: 'Generic, stable and heavy: grounded, animation-locked swings against a dying world.' },
  };
  load(STYLE.kratos.art); load(STYLE.ashen.art);
  // simulate one fighter from a list of press times up to time t. Returns the current swing, hits and the log.
  function fight(sty, presses, t) {
    const len = (sty.windup + sty.active + sty.recovery) / FPS, act0 = sty.windup / FPS, act1 = (sty.windup + sty.active) / FPS;
    let cur = null, buf = null, hits = [], n = 0, log = [], combo = 0, lastEnd = -9;
    const ps = presses.filter(p => p <= t);
    let pi = 0;
    // walk the press list and swing boundaries in order
    const start = at => { combo = at - lastEnd < .35 ? combo % sty.chain + 1 : 1; cur = { t0: at, combo }; n++; };
    const free = at => !cur || (sty.cancel ? at >= cur.t0 + act1 : at >= cur.t0 + len);
    const events = [];
    while (true) {
      const nextPress = pi < ps.length ? ps[pi] : Infinity;
      const nextFree = cur ? cur.t0 + (sty.cancel ? act1 : len) : Infinity;
      const nextEnd = cur ? cur.t0 + len : Infinity;
      const tn = Math.min(nextPress, buf != null ? nextFree : Infinity, nextEnd);
      if (tn > t || tn === Infinity) break;
      if (tn === nextPress) {
        pi++;
        if (free(tn)) { if (cur) { hits.push(cur); lastEnd = tn; } start(tn); events.push({ t: tn, k: 'start' }); }
        else if (buf == null) { buf = tn; events.push({ t: tn, k: 'buffer' }); }
        else events.push({ t: tn, k: 'ignored' });
      } else if (buf != null && tn === nextFree && tn !== nextEnd) { hits.push(cur); lastEnd = tn; start(tn); buf = null; events.push({ t: tn, k: 'start' }); }
      else if (tn === nextEnd) {
        hits.push(cur); lastEnd = tn;
        if (buf != null) { start(tn); buf = null; events.push({ t: tn, k: 'start' }); } else cur = null;
      }
    }
    const landed = n - (cur && t < cur.t0 + act0 ? 1 : 0);
    return { cur, len, act0, act1, swings: n, landed, events, buffered: buf != null };
  }
  function fighter(g, sty, x, y, sw, t) {
    // a figure seen from the side: pose from the swing phase. Kratos spins on the last hit of the chain; the Ashen One
    // steps in behind a greatsword
    const k = sw ? (t - sw.cur.t0) : -1, len = sw ? sw.len : 1;
    const wu = sty.windup / FPS, ac = sty.active / FPS;
    let arm = -.4, spin = 0, lean = 0, trail = 0, step = 0;
    if (k >= 0) {
      if (k < wu) { const q = ease(k / wu); arm = lerp(-.4, sty.light ? -2.2 : -2.6, q); lean = sty.light ? -.08 * q : -.18 * q; }
      else if (k < wu + ac) { const q = (k - wu) / ac; arm = lerp(sty.light ? -2.2 : -2.6, 1.2, ease(q)); trail = q; lean = sty.light ? .1 : .22; step = sty.light ? 0 : 14 * q; if (sty.light && sw.cur.combo === sty.chain) spin = q * TAU; }
      else { const q = (k - wu - ac) / (len - wu - ac); arm = lerp(1.2, -.4, ease(q)); lean = lerp(sty.light ? .1 : .22, 0, q); step = sty.light ? 0 : 14 * (1 - q); trail = 1 + q; }
    }
    g.save(); g.translate(x + step, y);
    if (spin) g.scale(Math.cos(spin), 1);
    g.rotate(lean);
    g.lineCap = 'round'; g.strokeStyle = '#2b2f4a'; g.lineWidth = sty.light ? 9 : 13;
    // legs
    g.beginPath(); g.moveTo(0, -60); g.lineTo(-16, 0); g.moveTo(0, -60); g.lineTo(18, 0); g.stroke();
    // torso and head
    g.lineWidth = sty.light ? 14 : 22; g.beginPath(); g.moveTo(0, -60); g.lineTo(0, -116); g.stroke();
    g.fillStyle = sty.light ? '#e8e2d6' : '#6b6a72'; g.beginPath(); g.arc(0, -134, sty.light ? 14 : 16, 0, TAU); g.fill();
    if (!sty.light) { g.fillStyle = '#4a4952'; g.fillRect(-14, -138, 28, 6); }
    if (sty.light) { g.fillStyle = sty.col; g.fillRect(-7, -128, 14, 30); }
    // weapon arm
    const sx = 0, sy = -108, al = sty.light ? 46 : 40;
    const hx = sx + Math.cos(arm) * al, hy = sy + Math.sin(arm) * al;
    g.strokeStyle = '#2b2f4a'; g.lineWidth = sty.light ? 7 : 10; g.beginPath(); g.moveTo(sx, sy); g.lineTo(hx, hy); g.stroke();
    // weapon: a short chained blade, or a greatsword
    const wl = sty.light ? 34 : 96;
    g.strokeStyle = sty.light ? '#d9dde8' : '#b9bccb'; g.lineWidth = sty.light ? 6 : 10;
    g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + Math.cos(arm) * wl, hy + Math.sin(arm) * wl); g.stroke();
    if (sty.light) { g.strokeStyle = 'rgba(200,55,45,.6)'; g.lineWidth = 2; g.setLineDash([3, 4]); g.beginPath(); g.moveTo(hx, hy); g.lineTo(sx - 20, sy + 20); g.stroke(); g.setLineDash([]); }
    // swing trail
    if (trail > 0 && trail < 2) {
      const a = trail <= 1 ? 1 : 2 - trail, r = al + wl * (sty.light ? 1 : .85);
      g.strokeStyle = sty.light ? `rgba(255,140,90,${.7 * a})` : `rgba(240,220,170,${.55 * a})`; g.lineWidth = sty.light ? 10 : 18;
      g.beginPath(); g.arc(sx, sy, r, sty.light ? -2.2 : -2.6, Math.min(1.2, lerp(-2.2, 1.2, clamp(trail)))); g.stroke();
    }
    g.restore();
  }
  function timeline(g, sty, f, x, y, w, t) {
    // the last few seconds of swings as frame bars: windup, active, recovery
    const span = 3, px = w / span, t0 = t - span;
    g.fillStyle = 'rgba(21,32,68,.06)'; rr(g, x, y, w, 34, 6); g.fill();
    const swings = [];
    f.events.filter(e => e.k === 'start').forEach(e => swings.push(e.t));
    swings.forEach((s0, i) => {
      const segs = [[sty.windup, '#e0a92d'], [sty.active, '#d64545'], [sty.recovery, '#8ea2e6']];
      let at = s0; const next = swings[i + 1] ?? Infinity;
      segs.forEach(([fr, col]) => {
        const a = at, b = Math.min(at + fr / FPS, next, t); if (b > a && b > t0) { g.fillStyle = col; g.fillRect(x + Math.max(0, a - t0) * px, y + 6, (b - Math.max(a, t0)) * px, 22); }
        at += fr / FPS;
      });
    });
    f.events.forEach(e => {
      if (e.t < t0) return; const ex = x + (e.t - t0) * px;
      g.fillStyle = e.k === 'ignored' ? C.red : C.ink; g.beginPath(); g.moveTo(ex, y - 2); g.lineTo(ex - 5, y - 10); g.lineTo(ex + 5, y - 10); g.closePath(); g.fill();
    });
    text(g, 'windup', x, y + 50, 12, '#9a6a06', 700); text(g, 'active', x + 56, y + 50, 12, '#b02f2f', 700); text(g, 'recovery', x + 104, y + 50, 12, '#4a5ec2', 700);
    text(g, '▼ press', x + w, y + 50, 12, C.ink, 700, 'right');
  }
  // tour presses: mash for three seconds, rest, then three single presses
  const TPRESS = []; for (let p = .6; p < 3.6; p += .14) TPRESS.push(+p.toFixed(2)); [5.4, 6.6, 7.8].forEach(p => TPRESS.push(p));
  const ANIM_DUR = 9.6;
  function drawAnim(g, presses, t) {
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.92)'; rr(g, 0, 0, W, H, 14); g.fill();
    const out = {};
    ['kratos', 'ashen'].forEach((id, i) => {
      const sty = STYLE[id], x0 = 12 + i * 514, w = 502, f = fight(sty, presses, t); out[id] = f;
      g.fillStyle = '#efe6d2'; rr(g, x0, 12, w, H - 24, 12); g.fill();
      // deck art strip
      g.save(); rr(g, x0 + 10, 22, 150, 190, 8); g.clip();
      if (sty.light) { g.fillStyle = '#fff'; g.fillRect(x0 + 10, 22, 150, 190); contain(g, sty.art, x0 + 14, 26, 142, 182); } else cover(g, sty.art, x0 + 10, 22, 150, 190, .45, .3);
      g.restore();
      text(g, sty.name, x0 + 176, 52, 24, C.ink, 800, 'left', 'M');
      text(g, sty.game, x0 + 176, 74, 14, C.muted, 600);
      wrap(g, sty.words, x0 + 176, 104, w - 190, 21, 16, C.ink, 500);
      text(g, 'Art from the course deck', x0 + 176, 202, 12, C.muted, 600);
      // stage
      const gy = 410;
      g.fillStyle = sty.light ? '#e9d7c2' : '#d8d2c4'; g.fillRect(x0 + 10, 226, w - 20, gy - 226);
      g.fillStyle = sty.light ? '#b98a62' : '#7d7568'; g.fillRect(x0 + 10, gy, w - 20, 8);
      // a training post
      g.fillStyle = '#8a6a4a'; g.fillRect(x0 + 340, gy - 120, 22, 120); g.fillStyle = '#a7835e'; g.fillRect(x0 + 330, gy - 96, 42, 10);
      const sw = f.cur && t - f.cur.t0 < f.len ? f : null;
      g.save(); g.beginPath(); g.rect(x0 + 10, 226, w - 20, gy - 226 + 8); g.clip();
      fighter(g, sty, x0 + 190, gy, sw, t);
      // impact flash when the active frames start
      if (sw) { const k = t - sw.cur.t0; if (k >= f.act0 && k < f.act0 + .12) T.flash(x0 + 340, gy - 90, sty.light ? 18 : 30, 1 - (k - f.act0) / .12); }
      g.restore();
      if (f.buffered) T.label('next press buffered', x0 + 210, 250, 'center', C.ink, 13);
      // numbers
      const sy = 440;
      text(g, `Swing: ${(sty.windup + sty.active + sty.recovery)} frames`, x0 + 20, sy, 15, C.ink, 700);
      text(g, sty.cancel ? 'Cancels into the next hit after the active frames' : 'Locked until the recovery ends', x0 + 20, sy + 20, 14, sty.cancel ? '#1d7a43' : '#b02f2f', 600);
      text(g, `Hits landed: ${f.landed}`, x0 + w - 20, sy, 18, sty.col, 800, 'right', 'M');
      timeline(g, sty, f, x0 + 20, sy + 44, w - 40, t);
    });
    text(g, 'Frame counts are illustrative (60 fps).', W / 2, H - 2, 12, C.muted, 600, 'center');
    return out;
  }
  canvasDemo('anim', (s, cv, g) => {
    const st = { t: 0, presses: [], tour: true, held: false, key: '' };
    const tourBtn = $(s, '.an-tour'), out = $(s, '.an-out');
    const free = () => { st.held = false; if (!st.tour) return; st.tour = false; tourBtn.classList.remove('on'); st.t = 0; st.presses = []; };
    const press = () => { free(); st.presses.push(st.t); };
    $(s, '.an-press').addEventListener('pointerdown', e => { e.preventDefault(); press(); });
    document.addEventListener('keydown', e => { if (e.code !== 'KeyJ' || !s.classList.contains('active') || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return; e.preventDefault(); press(); });
    tourBtn.onclick = () => { st.held = false; st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    $(s, '.an-reset').onclick = () => { st.tour = true; free(); };
    function render(t) {
      const presses = st.tour ? TPRESS : st.presses;
      const f = drawAnim(g, presses, t);
      let msg;
      if (st.tour) msg = t < 3.8 ? 'Mash the attack button. Kratos cancels each hit into the next and finishes the chain with a spin; the Ashen One is still recovering from his first heavy swing.'
        : 'One press at a time. Every Ashen One swing is a commitment: a long windup, a heavy hit and a long recovery. Same button, a different personality in every frame.';
      else msg = st.presses.length ? `Kratos landed ${f.kratos.landed} hits and the Ashen One landed ${f.ashen.landed} from the same ${st.presses.length} presses.` : 'Press Attack (or J) to swing both. Mash it, then try single presses.';
      const key = msg + f.kratos.landed + '/' + f.ashen.landed; if (key === st.key) return; st.key = key;
      say(out, msg);
      say($(s, '.an-stats'), `<div><b>${f.kratos.landed}</b><span>Kratos hits</span></div><div><b>${f.ashen.landed}</b><span>Ashen One hits</span></div>`);
    }
    scenes.anim = { seek(t) { st.held = true; st.tour = true; render(t); }, dur: () => ANIM_DUR };
    return dt => { if (st.held) return; st.t += dt; if (st.tour && st.t >= ANIM_DUR) st.t = 0; render(st.t); };
  });

  window.__seek = (t, which = 'power') => scenes[which].seek(t);
  window.__dur = (which = 'power') => scenes[which].dur();
})();
