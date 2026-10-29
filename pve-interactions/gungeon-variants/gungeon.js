/* Enter the Gungeon enemy variants (MGM course 4, module 5, deck slide g2e56547ebf8_0_1160, Handcrafted Permutation:
   Enemy Variants). The slide's nineteen Gundead, each played as a short scripted scene: the variant fires its pattern
   and the Pilot answers it, so the change in the player's response is what you see. Three spikes: the tour (every
   variant with its card), a sort into numbers-only escalations and new-response permutations, and the matrix of rules
   that travel across bases. Scenes are pure functions of time so window.__seek can record them.
   Sprites and Ammonomicon art are the game's own (Dodge Roll / Devolver Digital), from the Enter the Gungeon wiki;
   health and behaviour come from the same wiki's Bullet Kin, Shotgun Kin and Sniper Shell pages. */
(function () {
  const { $, $$, canvasDemo, demo, say } = FPF.kit;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const INK = '#262c6a', GREEN = '#1a8a4c', RED = '#cf2f3b', BLUE = '#3d56b0';
  const IMG = {};
  const img = k => IMG[k] || (IMG[k] = Object.assign(new Image(), { src: `img/${k}.png` }));

  /* ---------- the slide's nineteen Gundead ---------- */
  const FAM = { bullet: ['Bullet Kin family', 15], shotgun: ['Shotgun Kin family', 30], sniper: ['Sniper Shell family', 18.8] };
  const V = [
    { id: 'bullet-kin', name: 'Bullet Kin', fam: 'bullet', hp: 15, kind: 'base', scene: 'single',
      chg: 'The template. Walks toward you and fires one bullet at where you are standing.', resp: 'Keep moving: one aimed shot misses a moving target.' },
    { id: 'bandana-bullet-kin', name: 'Bandana Bullet Kin', fam: 'bullet', hp: 15, kind: 'num', scene: 'bandana',
      chg: 'A machine pistol: a much higher rate of fire and a bigger magazine.', resp: 'The same dodge, held for longer. Nothing new to learn, only more risk.' },
    { id: 'veteran-bullet-kin', name: 'Veteran Bullet Kin', fam: 'bullet', hp: 15, kind: 'rule', share: 'Veteran', scene: 'veteran',
      chg: 'Leads its shots: four faster bullets aimed at where you are going to be.', resp: 'Change direction. A steady strafe walks into the shots; reversing makes them miss.' },
    { id: 'tanker', name: 'Tanker', fam: 'bullet', hp: 18.8, kind: 'num', scene: 'tanker',
      chg: 'More health and a higher rate of fire.', resp: 'The same dodge, for a longer fight.' },
    { id: 'minelet', name: 'Minelet', fam: 'bullet', hp: 15, kind: 'rule', scene: 'minelet',
      chg: 'Hides under its hard hat, deflecting your shots, then pops out with a ring of bullets.', resp: 'Hold fire while the hat is down, then stand in a gap of the ring.' },
    { id: 'cardinal', name: 'Cardinal', fam: 'bullet', hp: 22.5, kind: 'rule', scene: 'cardinal',
      chg: 'Fires a spinning cluster of five bullets that home in on you.', resp: 'Break line of sight: tables, walls and corners eat homing shots.' },
    { id: 'shroomer', name: 'Shroomer', fam: 'bullet', hp: 30, kind: 'rule', scene: 'shroomer',
      chg: 'Fires two bullets in a V, one either side of you.', resp: 'Stand still. Its shots only hit you if you move.' },
    { id: 'ashen-bullet-kin', name: 'Ashen Bullet Kin', fam: 'bullet', hp: 15, kind: 'rule', share: 'Ashen', scene: 'ashen',
      chg: 'Waits as an ash statue and springs out as you pass, with faster shots.', resp: 'Read every statue as a spawn point and give it room.' },
    { id: 'mutant-bullet-kin', name: 'Mutant Bullet Kin', fam: 'bullet', hp: 20, kind: 'rule', share: 'Mutant', scene: 'mutant',
      chg: 'Spits a cone of poison creep, only ever sideways.', resp: 'Fight it from above or below, never level with it.' },
    { id: 'fallen-bullet-kin', name: 'Fallen Bullet Kin', fam: 'bullet', hp: 20, kind: 'rule', share: 'Hell', scene: 'fallen',
      chg: 'Fires spreads of three fire bullets and leaves a patch of fire where it dies.', resp: 'Kill it away from your path, then walk around the flames.' },
    { id: 'red-shotgun-kin', name: 'Red Shotgun Kin', fam: 'shotgun', hp: 30, kind: 'base', scene: 'red',
      chg: 'The Shotgun Kin template. A tight spread of five, and it may burst into six bullets when it dies.', resp: 'Step out of the cone, and keep your distance as it dies.' },
    { id: 'blue-shotgun-kin', name: 'Blue Shotgun Kin', fam: 'shotgun', hp: 40, kind: 'num', scene: 'blue',
      chg: 'More health, a wider spread, and a second volley of four right after the five.', resp: 'The same sidestep; the wider spread even leaves gaps to slip through.' },
    { id: 'veteran-shotgun-kin', name: 'Veteran Shotgun Kin', fam: 'shotgun', hp: 33.8, kind: 'rule', share: 'Veteran', scene: 'vetshot',
      chg: 'The Veteran rule on a shotgun: a V of five fast bullets aimed at where you will be.', resp: 'Change direction, exactly as against the Veteran Bullet Kin.' },
    { id: 'mutant-shotgun-kin', name: 'Mutant Shotgun Kin', fam: 'shotgun', hp: 32, kind: 'rule', share: 'Mutant', scene: 'mutshot',
      chg: 'Faster, faster again on poison, and it always bursts when it dies.', resp: 'Finish it from range, never up close.' },
    { id: 'ashen-shotgun-kin', name: 'Ashen Shotgun Kin', fam: 'shotgun', hp: 20, kind: 'rule', share: 'Ashen', scene: 'ashshot',
      chg: 'The Ashen rule on a shotgun: springs from a statue, three rapid spreads, no death burst.', resp: 'Give statues room. Once it is out, it is safe to finish up close.' },
    { id: 'executioner', name: 'Executioner', fam: 'shotgun', hp: 55, kind: 'rule', scene: 'executioner',
      chg: 'Fires chains of bullets that pin to the walls and fence you in.', resp: 'Leave the pocket before the chains close it.' },
    { id: 'shotgrub', name: 'Shotgrub', fam: 'shotgun', hp: 20, kind: 'rule', share: 'Hell', scene: 'shotgrub',
      chg: 'Its shots split into waving bullets when they hit a wall.', resp: 'Stay off the walls, and kill it first.' },
    { id: 'sniper-shell', name: 'Sniper Shell', fam: 'sniper', hp: 18.8, kind: 'base', scene: 'sniper',
      chg: 'Paints you with a red laser, then fires one very fast bullet.', resp: 'Step off the laser line the moment it locks.' },
    { id: 'professional', name: 'Professional', fam: 'sniper', hp: 21, kind: 'rule', scene: 'professional',
      chg: 'A green laser, and its round bursts into shrapnel when it hits cover.', resp: 'Do not hug cover: stand back from whatever it will hit.' },
  ];
  const KIND = { base: ['Base enemy', 'k-base'], num: ['Escalation: numbers only', 'k-num'], rule: ['Permutation: new response', 'k-rule'] };
  V.forEach(v => { img(v.id); img('card-' + (v.id === 'shotgrub' ? 'shotgrub' : v.id)); });
  ['pilot', 'table', 'logo'].forEach(img);

  /* ---------- arena drawing ---------- */
  const STATUE = 'grayscale(1) brightness(2.1) contrast(.55) sepia(.25)';
  const W = 860, H = 480, TOP = 64, SIDE = 16, S = 4, L = 3.4;
  function floor(g) {
    g.fillStyle = '#3c342f'; g.fillRect(0, 0, W, H);
    for (let y = TOP; y < H; y += 48) for (let x = SIDE; x < W - SIDE; x += 48) {
      g.fillStyle = ((x / 48 + y / 48) | 0) % 2 ? '#51463d' : '#4b4139'; g.fillRect(x + 1, y + 1, 46, 46);
      g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(x + 1, y + 1, 46, 3);
    }
    // the back wall: rows of bricks, and the side walls
    g.fillStyle = '#2a2236'; g.fillRect(0, 0, W, TOP);
    for (let r = 0; r < 3; r++) for (let x = -24 * (r % 2); x < W; x += 48) {
      g.fillStyle = r === 2 ? '#5a4c6e' : '#4a3e5c'; g.fillRect(x + 2, 6 + r * 19, 44, 16);
    }
    g.fillStyle = '#1c1626'; g.fillRect(0, TOP - 4, W, 4); g.fillRect(0, TOP, SIDE, H); g.fillRect(W - SIDE, TOP, SIDE, H);
  }
  function spr(g, key, x, foot, o = {}) {
    const im = img(key); if (!im.complete || !im.naturalWidth) return;
    const k = o.k || S, w = im.naturalWidth * k, h = im.naturalHeight * k;
    g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = o.a ?? 1;
    if (o.filter) g.filter = o.filter;
    g.translate(x, foot - h / 2); if (o.rot) g.rotate(o.rot); if (o.flip) g.scale(-1, 1);
    if (o.crop) g.drawImage(im, 0, 0, im.naturalWidth, o.crop, -w / 2, h / 2 - o.crop * k, w, o.crop * k);
    else g.drawImage(im, -w / 2, -h / 2, w, h);
    g.restore();
  }
  function shadow(g, x, y, r = 22) { g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x, y, r, r * .32, 0, 0, 7); g.fill(); }
  function pop(g, s, x, y, col, a) {
    if (a <= 0) return;
    g.save(); g.globalAlpha = clamp(a, 0, 1); g.font = '800 24px Montserrat, Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = g.measureText(s).width + 28; g.fillStyle = 'rgba(255,250,240,.94)'; g.strokeStyle = col; g.lineWidth = 3;
    g.beginPath(); g.roundRect(x - w / 2, y - 20, w, 40, 20); g.fill(); g.stroke(); g.fillStyle = col; g.fillText(s, x, y); g.restore();
  }
  const BUL = {
    b: ['#3a1408', '#f26a1b', '#ffd27a', 8], fast: ['#3a1408', '#ff8a2a', '#fff1b0', 7], fire: ['#4a0c04', '#ff5a1f', '#ffe08a', 9],
    home: ['#3a0614', '#e8335a', '#ffc2d0', 7], wave: ['#16300a', '#9be04a', '#eaffc8', 7], chain: ['#20202c', '#b9bccb', '#ffffff', 6],
    shrap: ['#3a1408', '#ffb03a', '#fff1b0', 5], p: ['#0b2b48', '#6fd0ff', '#ffffff', 5],
  };
  function bullet(g, k, x, y) {
    const [o, f, c, r] = BUL[k] || BUL.b;
    g.fillStyle = o; g.beginPath(); g.arc(x, y, r + 2, 0, 7); g.fill();
    g.fillStyle = f; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.fillStyle = c; g.beginPath(); g.arc(x - r * .3, y - r * .3, r * .42, 0, 7); g.fill();
  }

  /* ---------- scene building: keys, shots with precomputed paths ---------- */
  const keyAt = (keys, t) => {
    if (t <= keys[0][0]) return keys[0];
    for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
      const a = keys[i - 1], b = keys[i], u = (t - a[0]) / (b[0] - a[0] || 1), e = u * u * (3 - 2 * u);
      return [t, lerp(a[1], b[1], e), lerp(a[2], b[2], e)];
    }
    return keys[keys.length - 1];
  };
  const STEP = 1 / 120;
  function build(def) {
    const sc = { pops: [], shots: [], props: [], marks: [], die: null, ...def };
    sc.pilotAt = t => keyAt(sc.pilot, t);
    sc.enemyAt = t => keyAt(sc.enemy, t);
    sc.aim = t => { const p = sc.pilotAt(t); return [p[1], p[2] - 44]; };
    sc.gun = t => { const e = sc.enemyAt(t); return [e[1] + 20, e[2] - 40]; };
    sc.blocked = (x, y, free) => x < SIDE || x > W - SIDE || y < TOP || y > H || !free && sc.props.some(p => p.type === 'table' && x > p.x - 48 && x < p.x + 48 && y > p.y - 58 && y < p.y - 4);
    // a straight (or custom-stepped) shot; its path is stepped once and replayed
    sc.shot = (t0, x, y, a, v, k = 'b', o = {}) => {
      const s = { t0, k, pts: [], end: null };
      let px = x, py = y, ang = a, tau = 0;
      for (let i = 0; i < 600; i++) {
        if (o.step) { [px, py, ang] = o.step(px, py, ang, tau); }
        else { px += Math.cos(ang) * v * STEP; py += Math.sin(ang) * v * STEP; }
        tau += STEP;
        const wave = o.wave ? Math.sin(tau * 9 + o.wave) * 14 : 0;
        const wx = px - Math.sin(ang) * wave, wy = py + Math.cos(ang) * wave;
        if ((o.until && t0 + tau > o.until) || (i > 2 && sc.blocked(wx, wy, o.free))) { s.end = [wx, wy, t0 + tau]; break; }
        s.pts.push([wx, wy]);
      }
      sc.shots.push(s); return s;
    };
    sc.angTo = (t0, from, lead = 0, v = 400) => {
      let [tx, ty] = sc.aim(t0);
      if (lead) {   // aim at where the pilot will be if it keeps its current velocity
        const a = sc.aim(t0 - .05), b = sc.aim(t0 + .05), vx = (b[0] - a[0]) * 10, vy = (b[1] - a[1]) * 10;
        const tt = Math.hypot(tx - from[0], ty - from[1]) / v;
        tx += vx * tt * lead; ty += vy * tt * lead; sc.marks.push([t0, t0 + tt, tx, ty]);
      }
      return Math.atan2(ty - from[1], tx - from[0]);
    };
    sc.fan = (t0, n, spread, v, k = 'b', o = {}) => {
      const g = sc.gun(t0), c = (o.a ?? sc.angTo(t0, g, o.lead, v)) + (o.off || 0);
      for (let i = 0; i < n; i++) sc.shot(t0, g[0], g[1], c + (i - (n - 1) / 2) * spread, v, k, o);
    };
    sc.ring = (t0, x, y, n, off, v, k = 'b', o = {}) => { for (let i = 0; i < n; i++) sc.shot(t0, x, y, off + i * Math.PI * 2 / n, v, k, o); };
    sc.pshots = (t0, t1, every, tgt) => {   // the Pilot shooting back
      for (let t = t0; t <= t1 + 1e-6; t += every) {
        const p = sc.aim(t), e = tgt ? tgt(t) : (q => [q[1], q[2] - 40])(sc.enemyAt(t)), a = Math.atan2(e[1] - p[1], e[0] - p[0]);
        sc.shot(t, p[0] - 10, p[1] + 6, a, 700, 'p', sc.deflect ? { step: sc.deflect(t) } : { until: t + Math.hypot(e[0] - p[0], e[1] - p[1]) / 700 });
      }
    };
    def.make?.(sc);
    return sc;
  }

  const SC = {
    single: () => build({
      enemy: [[0, 170, 290], [L, 250, 290]], pilot: [[0, 660, 200], [.4, 660, 200], [1.6, 660, 370], [2, 660, 370], [3.2, 660, 200]],
      pops: [[.9, 2.2, 'Keep moving', GREEN]],
      make(s) { s.fan(.5, 1, 0, 360); s.fan(1.9, 1, 0, 360); },
    }),
    bandana: () => build({
      enemy: [[0, 170, 290], [L, 250, 290]], pilot: [[0, 660, 180], [1.6, 660, 390], [1.9, 660, 390], [L, 660, 180]],
      pops: [[1, 2.4, 'Same dodge, more of it', BLUE]],
      make(s) { for (let i = 0; i < 8; i++) { s.fan(.35 + i * .11, 1, 0, 420); s.fan(2 + i * .11, 1, 0, 420); } },
    }),
    tanker: () => build({
      enemy: [[0, 170, 290], [L, 240, 290]], pilot: [[0, 660, 180], [1.6, 660, 390], [1.9, 660, 390], [L, 660, 180]],
      pops: [[1, 2.4, 'More health, more shots', BLUE]],
      make(s) { for (let i = 0; i < 6; i++) { s.fan(.4 + i * .15, 1, 0, 400); s.fan(2 + i * .15, 1, 0, 400); } },
    }),
    veteran: () => build({
      enemy: [[0, 180, 290], [L, 260, 290]], pilot: [[0, 660, 150], [.8, 660, 300], [1.5, 660, 180], [1.8, 660, 160], [2.5, 660, 320], [L, 660, 150]],
      pops: [[.9, 2.6, 'Change direction', GREEN]],
      make(s) { for (let i = 0; i < 4; i++) { s.fan(.35 + i * .12, 1, 0, 540, 'fast', { lead: 1, v: 540 }); s.fan(1.85 + i * .12, 1, 0, 540, 'fast', { lead: 1, v: 540 }); } },
    }),
    minelet: () => build({
      enemy: [[0, 240, 290], [L, 240, 290]], pilot: [[0, 640, 290], [L, 640, 290]],
      hide: [.55, 1.65], pops: [[.75, 1.55, 'Hat down: shots bounce off', RED], [1.85, 2.6, 'Stand in a gap', GREEN]],
      make(s) {
        s.deflect = t0 => (x, y, a, tau) => {
          const t = t0 + tau, hid = t > .55 && t < 1.65;
          if (x < 262 && Math.cos(a) < 0) { if (!hid) return [-99, y, a]; a = Math.PI - a + .5 * Math.sin(t0 * 31); }
          return [x + Math.cos(a) * 700 * STEP, y + Math.sin(a) * 700 * STEP, a];
        };
        s.pshots(.15, .9, .2, () => [240, 270]);
        const g = s.gun(1.7), toP = s.angTo(1.7, g); s.ring(1.7, 240, 262, 12, toP + Math.PI / 12, 300);
        s.deflect = null; s.pshots(2.6, 3.2, .2, () => [240, 250]);
      },
    }),
    cardinal: () => build({
      enemy: [[0, 200, 290], [L, 240, 290]], pilot: [[0, 690, 170], [.4, 690, 170], [1, 660, 300], [2.7, 660, 300], [L, 690, 170]],
      props: [{ type: 'table', x: 560, y: 304 }], pops: [[1.5, 2.6, 'The table eats them', GREEN]],
      make(s) {
        // five bullets circling a centre that turns toward the Pilot
        let cx = 230, cy = 250, ca = s.angTo(.6, [230, 250]);
        const C = []; for (let tau = 0; tau < 2.4; tau += STEP) {
          const [tx, ty] = s.aim(.6 + tau), want = Math.atan2(ty - cy, tx - cx); let d = want - ca;
          d = Math.atan2(Math.sin(d), Math.cos(d)); ca += clamp(d, -2.2 * STEP, 2.2 * STEP);
          cx += Math.cos(ca) * 250 * STEP; cy += Math.sin(ca) * 250 * STEP; C.push([cx, cy]);
        }
        for (let i = 0; i < 5; i++) s.shot(.6, 230, 250, 0, 0, 'home', { step: (x, y, a, tau) => { const c = C[Math.min(C.length - 1, Math.round(tau / STEP))], r = i * 1.2566 + tau * 6; return [c[0] + Math.cos(r) * 14, c[1] + Math.sin(r) * 14, a]; } });
      },
    }),
    shroomer: () => build({
      enemy: [[0, 170, 290], [L, 240, 290]], pilot: [[0, 660, 290], [L, 660, 290]],
      pops: [[.9, 2.8, 'Stand still', GREEN]],
      make(s) { [.4, 1.5, 2.6].forEach(t => s.fan(t, 2, .2, 330)); },
    }),
    ashen: () => build({
      enemy: [[0, 540, 220], [L, 540, 220]], pilot: [[0, 780, 400], [.8, 640, 320], [1, 650, 330], [1.4, 740, 440], [2.9, 740, 440], [L, 780, 400]],
      statue: .8, rolls: [[1, 1.4]], statues: [[300, 430]], pops: [[.55, 1.5, 'It was a statue', RED], [1.8, 2.8, 'Statues are spawn points', GREEN]],
      make(s) { [.95, 1.1, 1.25, 2.1, 2.25, 2.4].forEach((t, i) => s.fan(t, 1, 0, 620, 'fast', { lead: i % 2, v: 620 })); },
    }),
    mutant: () => build({
      enemy: [[0, 220, 290], [L, 220, 290]], pilot: [[0, 620, 290], [.7, 620, 290], [1.2, 430, 200], [2.9, 430, 200], [L, 620, 290]],
      creep: [.8, 1.4, 2.6, 3], pops: [[1.2, 2.4, 'Attack from above', GREEN]],
      make(s) { s.pshots(1.3, 2.6, .22); },
    }),
    fallen: () => build({
      enemy: [[0, 200, 290], [L, 230, 290]], pilot: [[0, 660, 200], [.9, 660, 370], [2.3, 640, 380], [3, 420, 420], [L, 400, 420]],
      die: 2.2, fireAt: 2.2, pops: [[2.3, 3.3, 'Walk around the flames', GREEN]],
      make(s) { s.fan(.35, 3, .22, 330, 'fire'); s.fan(1.1, 3, .22, 330, 'fire'); s.pshots(1.5, 2.1, .15); },
    }),
    red: () => build({
      enemy: [[0, 220, 290], [L, 220, 290]], pilot: [[0, 640, 290], [.45, 640, 290], [.8, 640, 140], [1.55, 640, 140], [1.95, 640, 420], [L, 640, 420]],
      die: 2.6, burst: 6, pops: [[.6, 1.5, 'Step out of the cone', GREEN], [2.6, 3.3, 'Death burst', RED]],
      make(s) { s.fan(.5, 5, .1, 340); s.fan(1.6, 5, .1, 340); s.pshots(2, 2.5, .12); },
    }),
    blue: () => build({
      enemy: [[0, 220, 290], [L, 220, 290]], pilot: [[0, 640, 290], [1.76, 640, 290], [1.95, 640, 330], [L, 640, 330]], rolls: [[1.76, 1.95]],
      pops: [[1, 2.6, 'Slip through the gaps', BLUE]],
      make(s) { const a = s.angTo(.5, s.gun(.5)); s.fan(.5, 5, .2, 340, 'b', { a, off: .1 }); s.fan(.78, 4, .2, 340, 'b', { a, off: .2 }); },
    }),
    vetshot: () => build({
      enemy: [[0, 200, 290], [L, 240, 290]], pilot: [[0, 660, 150], [.8, 660, 300], [1.5, 660, 180], [1.8, 660, 160], [2.5, 660, 320], [L, 660, 150]],
      pops: [[.9, 2.6, 'Veteran rule: change direction', GREEN]],
      make(s) { s.fan(.4, 5, .09, 520, 'fast', { lead: 1, v: 520 }); s.fan(1.9, 5, .09, 520, 'fast', { lead: 1, v: 520 }); },
    }),
    mutshot: () => build({
      enemy: [[0, 220, 290], [L, 220, 290]], pilot: [[0, 660, 180], [1.2, 660, 400], [L, 700, 330]],
      pool: true, die: 2.4, burst: 6, pops: [[.3, 1.2, 'Faster on poison', RED], [2.4, 3.3, 'Always bursts: finish it from range', GREEN]],
      make(s) { [.3, .75, 1.2].forEach(t => s.fan(t, 5, .1, 460)); s.pshots(1.6, 2.3, .12); },
    }),
    ashshot: () => build({
      enemy: [[0, 540, 220], [L, 540, 220]], pilot: [[0, 780, 400], [.8, 640, 320], [1, 650, 330], [1.4, 740, 440], [1.8, 740, 440], [2.3, 640, 320], [L, 640, 320]],
      statue: .8, rolls: [[1, 1.4]], die: 2.7, pops: [[.55, 1.5, 'It was a statue', RED], [2.7, 3.3, 'No death burst', GREEN]],
      make(s) { [.95, 1.1, 1.25].forEach(t => s.fan(t, 5, .11, 520, 'fast')); s.pshots(2.3, 2.6, .1); },
    }),
    executioner: () => build({
      enemy: [[0, 200, 290], [L, 220, 290]], pilot: [[0, 700, 280], [1.05, 700, 280], [1.6, 520, 450], [L, 520, 450]],
      chains: [1, 2.6], pops: [[1.1, 2.4, 'Leave the pocket', GREEN]],
      make(s) {
        [-.42, -.2, .05, .26, .44, -.08, .33].forEach((d, i) => s.fan(.25 + i * .03, 1, 0, 480, 'b', { off: d }));
        const g = s.gun(1), a = s.angTo(1, g); s.chainA = [a - .2, a, a + .2].map(c => {
          let x = g[0], y = g[1]; while (!s.blocked(x, y)) { x += Math.cos(c) * 4; y += Math.sin(c) * 4; } return [g[0], g[1], x, y];
        });
      },
    }),
    shotgrub: () => build({
      enemy: [[0, 200, 290], [L, 230, 290]], pilot: [[0, 790, 290], [.5, 790, 290], [1.1, 520, 200], [L, 520, 200]],
      pops: [[1, 2.4, 'Stay off the walls', GREEN]],
      make(s) {
        const kids = []; const g = s.gun(.4), a = s.angTo(.4, g);
        [-.16, 0, .16].forEach(d => { const p = s.shot(.4, g[0], g[1], a + d, 420, 'b'); if (p.end) kids.push(p.end); });
        kids.forEach(([x, y, t]) => [-.9, -.3, .3, .9].forEach(d => s.shot(t, x - 6, y, Math.PI + d, 240, 'wave', { wave: d * 3 })));
        s.fan(1.8, 3, .16, 420);
      },
    }),
    sniper: () => build({
      enemy: [[0, 160, 290], [L, 160, 290]], pilot: [[0, 680, 240], [1.15, 680, 240], [1.4, 680, 340], [2.8, 680, 340], [3.05, 680, 240], [L, 680, 240]],
      rolls: [[1.15, 1.4], [2.8, 3.05]], laser: [[.15, 1.1, 1.35, '#ff3030'], [1.9, 2.75, 3, '#ff3030']], pops: [[1.3, 2.1, 'Step off the line', GREEN]],
      make(s) { s.laser.forEach(([a, lock, fire]) => { const g = s.gun(fire), [tx, ty] = s.aim(lock); s.shot(fire, g[0], g[1], Math.atan2(ty - g[1], tx - g[0]), 1500, 'fast'); }); },
    }),
    professional: () => build({
      enemy: [[0, 160, 290], [L, 160, 290]], pilot: [[0, 640, 300], [1, 640, 300], [1.4, 780, 430], [L, 780, 430]],
      props: [{ type: 'table', x: 560, y: 304 }], laser: [[.15, .95, 1.55, '#2fe05a']],
      pops: [[.6, 1.5, 'Back away from cover', GREEN], [1.75, 2.8, 'Flak bursts on impact', RED]],
      make(s) {
        const g = s.gun(1.55), [tx, ty] = s.aim(.95), p = s.shot(1.55, g[0], g[1], Math.atan2(ty - g[1], tx - g[0]), 1500, 'fast');
        if (p.end) s.ring(p.end[2], p.end[0] + 4, p.end[1], 10, -.3, 300, 'shrap', { free: true });
      },
    }),
  };
  const BUILT = {};
  const scene = v => BUILT[v.scene] || (BUILT[v.scene] = SC[v.scene]());

  function drawScene(g, v, u) {
    const s = scene(v);
    floor(g);
    // ground effects
    if (s.pool) { g.fillStyle = 'rgba(120,200,60,.45)'; g.beginPath(); g.ellipse(220, 292, 70, 22, 0, 0, 7); g.fill(); }
    if (s.creep) {
      const [a, b, c, d] = s.creep, grow = clamp((u - a) / (b - a), 0, 1), fade = 1 - clamp((u - c) / (d - c), 0, 1);
      if (grow > 0 && fade > 0) for (let i = 0; i < 14; i++) {
        const k = i / 13; if (k > grow) break;
        const x = 250 + k * 330, w = 18 + k * 50;
        g.fillStyle = `rgba(122,206,58,${.5 * fade})`; g.beginPath(); g.ellipse(x, 270 + Math.sin(i * 2.3) * k * 30, 30 + k * 12, w * .6, 0, 0, 7); g.fill();
      }
    }
    if (s.fireAt != null && u > s.fireAt) {
      const e = s.enemyAt(s.fireAt);
      for (let i = 0; i < 7; i++) { const a = i * .9 + u * 3, r = 22 + 10 * Math.sin(i * 5); g.fillStyle = i % 2 ? 'rgba(255,120,30,.8)' : 'rgba(255,210,80,.8)'; g.beginPath(); g.ellipse(e[1] + Math.cos(i * .9) * r, e[2] - 4 + Math.sin(i * .9) * r * .35, 16, 22 + 6 * Math.sin(a), 0, 0, 7); g.fill(); }
    }
    // lasers
    (s.laser || []).forEach(([a, lock, fire, col]) => {
      if (u < a || u > fire) return;
      const gp = s.gun(u), [tx, ty] = s.aim(Math.min(u, lock)), ang = Math.atan2(ty - gp[1], tx - gp[0]);
      let x = gp[0], y = gp[1]; while (!s.blocked(x, y)) { x += Math.cos(ang) * 4; y += Math.sin(ang) * 4; }
      if (u > lock && ((u * 16) | 0) % 2) return;
      g.strokeStyle = col; g.lineWidth = u > lock ? 4 : 2; g.globalAlpha = .9; g.beginPath(); g.moveTo(gp[0], gp[1]); g.lineTo(x, y); g.stroke(); g.globalAlpha = 1;
    });
    // chains: lines of bullets that pin to the wall, then fall away
    if (s.chains && u > s.chains[0] && u < s.chains[1]) s.chainA.forEach(([x0, y0, x1, y1]) => {
      const k = clamp((u - s.chains[0]) / .35, 0, 1), n = 14;
      for (let i = 0; i <= n * k; i++) bullet(g, 'chain', lerp(x0, x1, i / n), lerp(y0, y1, i / n));
    });
    // statues that have not woken
    (s.statues || []).forEach(([x, y]) => { shadow(g, x, y); spr(g, v.id, x, y, { filter: STATUE }); });
    // props, enemy and pilot sorted by depth
    const ents = [];
    (s.props || []).forEach(p => ents.push([p.y, () => spr(g, 'table', p.x, p.y, { k: 3 })]));
    const e = s.enemyAt(u), dead = s.die != null && u > s.die, ea = dead ? 1 - clamp((u - s.die) / .3, 0, 1) : 1;
    if (ea > 0) ents.push([e[2], () => {
      const hid = s.hide && u > s.hide[0] && u < s.hide[1], statue = s.statue != null && u < s.statue, bob = statue || hid ? 0 : Math.abs(Math.sin(u * 7)) * 3;
      shadow(g, e[1], e[2]);
      if (hid) spr(g, v.id, e[1], e[2], { crop: 9 });
      else spr(g, v.id, e[1], e[2] - bob, { a: ea, filter: statue ? STATUE : dead ? 'brightness(2.5)' : undefined });
    }]);
    const p = s.pilotAt(u), roll = (s.rolls || []).find(([a, b]) => u > a && u < b);
    ents.push([p[2], () => {
      shadow(g, p[1], p[2], 20);
      const moving = Math.hypot(...[1, 2].map(i => s.pilotAt(u + .03)[i] - s.pilotAt(u - .03)[i])) > .5;
      spr(g, 'pilot', p[1], p[2] - (moving && !roll ? Math.abs(Math.sin(u * 14)) * 3 : 0), { k: 4 / 3, flip: e[1] < p[1], rot: roll ? (u - roll[0]) / (roll[1] - roll[0]) * Math.PI * 2 : 0 });
    }]);
    ents.sort((a, b) => a[0] - b[0]).forEach(x => x[1]());
    // aim marks of leading shots
    (s.marks || []).forEach(([t0, t1, x, y]) => {
      if (u < t0 || u > t1 + .25) return;
      g.strokeStyle = 'rgba(255,80,80,.85)'; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, 12, 0, 7); g.moveTo(x - 18, y); g.lineTo(x + 18, y); g.moveTo(x, y - 18); g.lineTo(x, y + 18); g.stroke();
    });
    // muzzle flashes and bullets
    s.shots.forEach(sh => {
      const dt = u - sh.t0; if (dt < 0) return;
      if (dt < .07 && sh.k !== 'p' && sh.k !== 'wave' && sh.k !== 'shrap') { const gp = s.gun(sh.t0); g.fillStyle = 'rgba(255,240,170,.9)'; g.beginPath(); g.arc(gp[0] + 6, gp[1], 10, 0, 7); g.fill(); }
      const i = Math.round(dt / STEP);
      if (i < sh.pts.length) bullet(g, sh.k, ...sh.pts[i]);
      else if (sh.end && u - sh.end[2] < .15) { g.fillStyle = 'rgba(255,240,200,.8)'; g.beginPath(); g.arc(sh.end[0], sh.end[1], 10, 0, 7); g.fill(); }
    });
    if (s.burst && dead) for (let i = 0; i < s.burst; i++) {
      const a = i * Math.PI * 2 / s.burst + .3, r = (u - s.die) * 260;
      bullet(g, 'b', e[1] + Math.cos(a) * r, e[2] - 40 + Math.sin(a) * r);
    }
    if (s.statue != null && u > s.statue && u < s.statue + .35) {
      for (let i = 0; i < 10; i++) { const a = i * .63, r = (u - s.statue) * 160; g.fillStyle = 'rgba(190,190,190,.8)'; g.fillRect(e[1] + Math.cos(a) * r, e[2] - 40 + Math.sin(a) * r, 6, 6); }
    }
    s.pops.forEach(([a, b, t, col]) => pop(g, t, W / 2, TOP + 34, col, Math.min((u - a) / .15, (b - u) / .15, 1)));
  }

  /* ---------- slide 2: the tour ---------- */
  let tourApi = null;
  canvasDemo('tour', (sl, c, g) => {
    const roster = $(sl, '.gv-roster'), st = { t: 0, held: false, pin: -1, shown: -1 };
    const fams = ['bullet', 'shotgun', 'sniper'];
    roster.innerHTML = fams.map(f => `<div class="gv-grp"><h5>${FAM[f][0].replace(' family', '')}</h5><div>${V.map((v, i) => v.fam === f ? `<button class="gv-chip ${KIND[v.kind][1]}" data-i="${i}" title="${v.name}"><img src="img/${v.id}.png" alt="${v.name}"></button>` : '').join('')}</div></div>`).join('')
      + `<div class="gv-key"><span class="k-base">Base enemy</span><span class="k-num">Numbers only</span><span class="k-rule">New response</span></div>`;
    $$(roster, '.gv-chip').forEach(b => b.onclick = () => { const i = +b.dataset.i; st.pin = st.pin === i ? -1 : i; st.t = 0; });
    function card(i) {
      if (st.shown === i) return; st.shown = i;
      const v = V[i], [fn, base] = FAM[v.fam];
      $(sl, '.gv-art').src = `img/card-${v.id}.png`;
      $(sl, '.gv-fam').textContent = fn;
      $(sl, '.gv-name').textContent = v.name;
      const tg = $(sl, '.gv-tag'); tg.textContent = KIND[v.kind][0] + (v.share ? ` · shared ${v.share === 'Hell' ? 'Bullet Hell theme' : v.share + ' rule'}` : ''); tg.className = 'gv-tag ' + KIND[v.kind][1];
      $(sl, '.gv-bar b').style.width = (v.hp / 55 * 100) + '%';
      $(sl, '.gv-base').style.left = (base / 55 * 100) + '%';
      $(sl, '.gv-hp em').textContent = v.hp === base ? `${v.hp}` : `${v.hp} (base ${base})`;
      $(sl, '.gv-chg').textContent = v.chg;
      $(sl, '.gv-resp').textContent = v.resp;
      $$(roster, '.gv-chip').forEach(b => b.classList.toggle('on', +b.dataset.i === i));
    }
    function render(t) {
      const i = st.pin >= 0 ? st.pin : Math.floor(t / L) % V.length, u = t % L;
      card(i); g.clearRect(0, 0, W, H); drawScene(g, V[i], u);
      // progress through this variant
      g.fillStyle = 'rgba(255,185,81,.9)'; g.fillRect(0, H - 5, W * u / L, 5);
    }
    tourApi = { seek(t) { st.held = true; st.pin = -1; st.t = t; render(t); }, dur: () => V.length * L };
    return dt => { if (!st.held) st.t += Math.max(0, Math.min(dt, .1)); render(st.t); };
  });

  /* ---------- slide 3: numbers or a new response ---------- */
  const COLS = [['num', 'Escalation', 'numbers only: the same answer, more risk'], ['rule', 'Permutation', 'a new rule: the player answers differently']];
  demo('sort', {
    init(s) {
      const tray = $(s, '.so-tray'), cols = $(s, '.so-cols'), out = $(s, '.so-out'), items = V.filter(v => v.kind !== 'base');
      let sel = null;
      cols.innerHTML = COLS.map(([k, n, d]) => `<div class="so-col" data-k="${k}"><h4>${n}<small>${d}</small></h4><div class="so-drop"></div></div>`).join('');
      function reset() {
        tray.innerHTML = items.map(v => `<div class="so-chip" draggable="true" data-id="${v.id}"><img src="img/${v.id}.png" alt=""><span>${v.name}</span></div>`).join('');
        $$(cols, '.so-drop').forEach(d => d.innerHTML = '');
        $$(s, '.so-chip').forEach(el => {
          el.ondragstart = e => e.dataTransfer.setData('text', el.dataset.id);
          el.onclick = e => { e.stopPropagation(); sel = sel === el ? null : el; $$(s, '.so-chip').forEach(x => x.classList.toggle('sel', x === sel)); };
        });
        say(out, 'Drag each variant (or click it, then a column): does it only turn up the numbers, or does it make the player answer differently? Then press <b>Check</b>.');
      }
      const place = (el, drop) => { drop.appendChild(el); el.classList.remove('sel', 'ok', 'no'); sel = null; };
      $$(cols, '.so-col').forEach(col => {
        const drop = $(col, '.so-drop');
        col.ondragover = e => e.preventDefault();
        col.ondrop = e => { e.preventDefault(); const el = $(s, `.so-chip[data-id="${e.dataTransfer.getData('text')}"]`); if (el) place(el, drop); };
        col.onclick = () => { if (sel) place(sel, drop); };
      });
      $(s, '.so-check').onclick = () => {
        let right = 0, placed = 0; const notes = [];
        $$(cols, '.so-chip').forEach(el => {
          const v = V.find(x => x.id === el.dataset.id), ok = el.closest('.so-col').dataset.k === v.kind; placed++; right += ok;
          el.classList.toggle('ok', ok); el.classList.toggle('no', !ok);
          if (!ok) notes.push(`<b>${v.name}</b>: ${v.chg}`);
        });
        say(out, placed ? `<b>${right} of ${placed}</b> match the course’s reading${placed < items.length ? ` (${items.length - placed} still in the tray)` : ''}. ${notes.slice(0, 2).join(' ')}` : 'Place some variants first.');
      };
      $(s, '.so-reveal').onclick = () => {
        items.forEach(v => { const el = $(s, `.so-chip[data-id="${v.id}"]`); $(cols, `.so-col[data-k="${v.kind}"] .so-drop`).appendChild(el); el.classList.add('ok'); el.classList.remove('no', 'sel'); el.title = v.resp; });
        say(out, 'Only three of sixteen are numbers only. Gungeon spends its variants on new rules: each one asks for a different answer, so the cast keeps teaching. Hover a chip for the answer it asks for.');
      };
      $(s, '.so-reset').onclick = reset;
      reset();
    },
  });

  /* ---------- slide 4: rules that travel across bases ---------- */
  const MCOLS = [['base', 'Base', 'the template'], ['Veteran', 'Veteran', 'leads its shots'], ['Ashen', 'Ashen', 'springs from statues'], ['Mutant', 'Mutant', 'poison'], ['Hell', 'Bullet Hell', 'a hellish twist'], ['own', 'Unique', 'one rule of its own']];
  demo('matrix', {
    init(s) {
      const box = $(s, '.mx'), out = $(s, '.mx-out');
      const cell = (fam, k) => V.filter(v => v.fam === fam && (k === 'base' ? v.kind === 'base' : k === 'own' ? v.kind !== 'base' && !v.share : v.share === k))
        .map(v => `<div class="mx-g ${KIND[v.kind][1]}" data-id="${v.id}"><img src="img/${v.id}.png" alt=""><span>${v.name}</span></div>`).join('');
      box.innerHTML = `<div class="mx-h"></div>` + MCOLS.map(([k, n, d]) => `<div class="mx-h ${k === 'Veteran' || k === 'Ashen' || k === 'Mutant' ? 'hot' : ''}"><b>${n}</b><small>${d}</small></div>`).join('')
        + Object.keys(FAM).map(f => `<div class="mx-r">${FAM[f][0].replace(' family', '')}</div>` + MCOLS.map(([k]) => `<div class="mx-c ${k === 'own' ? 'own' : ''}">${cell(f, k)}</div>`).join('')).join('');
      $$(box, '.mx-g').forEach(el => el.onmouseenter = () => { const v = V.find(x => x.id === el.dataset.id); say(out, `<b>${v.name}</b> (${v.hp} health): ${v.chg} <i>${v.resp}</i>`); });
    },
  });

  /* ---------- title ---------- */
  canvasDemo('title', (s, c, g) => (dt, t) => {
    g.clearRect(0, 0, c.width, c.height);
    const lg = img('logo'); if (lg.complete && lg.naturalWidth) g.drawImage(lg, c.width / 2 - 249, 0, 498, 150);
    const row = ['bullet-kin', 'bandana-bullet-kin', 'veteran-bullet-kin', 'tanker', 'minelet', 'cardinal', 'shroomer', 'ashen-bullet-kin', 'mutant-bullet-kin', 'fallen-bullet-kin'];
    row.forEach((k, i) => { const x = c.width / 2 + (i - 4.5) * 92; shadow(g, x, 252, 18); spr(g, k, x, 252 - Math.abs(Math.sin(t * 6 + i * .7)) * 4, { k: 3 }); });
  });

  window.__seek = (t, which) => tourApi.seek(t);
  window.__dur = which => tourApi.dur();
})();
