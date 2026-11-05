/* Hard check vs soft check (DGMS Module 2, Audience Demographics, deck slides 132-135: method 3, testing).
   "Hard checks: situations that FORCE you to use a specific mechanic. Soft checks: situations that are MUCH more
   efficient if you use the right tool."
   zerg: StarCraft's campaign Zergling clusters (slide 135). Raynor alone can kite the pack (possible, slow); a few
         Firebats burn the whole cluster (fast). Both arenas run on one clock, each with its own timer.
   ice:  God of War (slides 133-134). The freeze mechanic is a hard check; an ice-coated enemy still takes a sliver
         of damage from the frost axe, which makes it technically a soft check but, past the player's patience,
         effectively a hard check. A slider sets how much damage the wrong tool still deals.
         Drawn side-on in God of War's look; the blades side pays a weapon-switch cost before its first hit.
   Numbers: all illustrative (HP, damage per second, splash size, patience); the deck names the examples only. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, TAU = Math.PI * 2;

  /* ---------- tunables (all illustrative) ---------- */
  const N = {
    ling: { hp: 35 },
    raynor: { dps: 10, shootShare: .6 },     // kiting: he shoots 60% of the time and runs the rest
    firebat: { dps: 9, splash: 4 },          // each Firebat burns up to 4 Zerglings at once
    zergRate: 4,                             // sim seconds per real second on the Zergling slide
    enemy: { hp: 600 },                      // God of War: the ice-coated enemy
    axeDps: 30, bladesDps: 30,               // full damage per second, before the ice coat
    switchTime: 3,                           // seconds to put the axe away and draw the blades
    patience: 60,                            // seconds a player will keep hitting before they change plan
    iceRate: 6,                              // sim seconds per real second on the ice slide
    presets: [['Freeze puzzle', 0], ['Ice-coated enemy', 4], ['Soft check', 40]],
  };
  const apis = {};
  const panel = g => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.8)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const txt = (g, s, x, y, font, col = C.ink, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); };
  const fmt = s => s >= 100 ? Math.round(s) + ' s' : s.toFixed(1) + ' s';

  /* ---------- slide 1: Zergling cluster ---------- */
  const raynorTime = n => n * N.ling.hp / (N.raynor.dps * N.raynor.shootShare);
  const batRun = 1.2;   // seconds for the pack to reach the Firebats
  const batTime = (n, b) => batRun + Math.ceil(n / (N.firebat.splash * b)) * N.ling.hp / N.firebat.dps;
  // the pack in a ring, deterministic jitter
  const offs = Array.from({ length: 40 }, (_, i) => { const a = i * 2.399, r = 8 + 6.5 * Math.sqrt(i); return [Math.cos(a) * r, Math.sin(a) * r]; });
  function arena(g, x, y, w, h, title, sub) {
    T.floor(x, y, w, h);
    g.strokeStyle = C.wallDk; g.lineWidth = 3; g.strokeRect(x, y, w, h);
    txt(g, title, x, y - 34, '800 18px Montserrat, Jost, sans-serif'); txt(g, sub, x, y - 13, '600 15px Jost, sans-serif', C.muted);
  }
  function ling(g, x, y, ang, a = 1) { T.foe(x, y, 10, ang, '#a04fc8', { mark: 'horns', a, edge: '#5b2378' }); }
  function raynorArena(g, x0, y0, w, h, n, t) {
    const cx = x0 + w / 2, cy = y0 + h / 2, R = Math.min(w, h) * .34, end = raynorTime(n);
    const tt = Math.min(t, end), dead = Math.min(n, Math.floor(tt * N.raynor.dps * N.raynor.shootShare / N.ling.hp + 1e-6));
    // Raynor runs a loop; shooting phases are slower (he stops to fire)
    const cyc = tt % 1, shooting = cyc < N.raynor.shootShare && tt < end;
    const ang = tt * .55 - (tt % 1 < N.raynor.shootShare ? 0 : 0), rx = cx + Math.cos(ang) * R, ry = cy + Math.sin(ang) * R;
    // the pack trails behind him on the loop
    const pa = ang - .75, px = cx + Math.cos(pa) * R, py = cy + Math.sin(pa) * R;
    const alive = n - dead;
    for (let i = dead; i < n; i++) { const o = offs[i - dead]; ling(g, px + o[0] * 1.6, py + o[1] * 1.6, ang + Math.PI / 2); }
    if (shooting && alive > 0) {
      const o = offs[0]; T.tracer(rx, ry, px + o[0] * 1.6, py + o[1] * 1.6, .9, C.gold, 3);
      T.flash(px + o[0] * 1.6, py + o[1] * 1.6, 16, .7);
      const hpLeft = N.ling.hp - ((tt * N.raynor.dps * N.raynor.shootShare) % N.ling.hp);
      T.hp(px + o[0] * 1.6, py + o[1] * 1.6 - 22, 30, hpLeft, N.ling.hp);
    }
    T.player(rx, ry, shooting ? Math.atan2(py - ry, px - rx) : ang + Math.PI / 2, 1, 1, C.player);
    T.label('Raynor', rx, ry + 32, 'center', C.ink, 13);
    return { dead, end, done: t >= end };
  }
  function batArena(g, x0, y0, w, h, n, b, t) {
    const end = batTime(n, b), fx = x0 + w * .3, fy = y0 + h / 2;
    const k = clamp(t / batRun), packX = lerp(x0 + w - 60, fx + 135, ease(k)), packY = fy;
    const per = N.firebat.splash * b, burn = Math.max(0, t - batRun), batches = Math.floor(burn * N.firebat.dps / N.ling.hp + 1e-6);
    const dead = Math.min(n, batches * per), done = t >= end;
    for (let i = dead; i < n; i++) { const o = offs[i - dead]; ling(g, packX + o[0] * 1.6, packY + o[1] * 1.6, Math.PI); }
    for (let i = 0; i < b; i++) {
      const by = fy + (i - (b - 1) / 2) * 52, bx = fx - (i % 2) * 18;
      if (t > batRun - .1 && !done) T.cone(bx, by, Math.atan2(packY - by, packX - bx), .4, 175 + 8 * Math.sin(t * 20 + i), 1, '255,122,42');
      T.player(bx, by, Math.atan2(packY - by, packX - bx), .9, 1, '#e0702d');
    }
    T.label(b + ' Firebat' + (b > 1 ? 's' : ''), fx - 10, fy + (b - 1) * 26 + 40, 'center', C.ink, 13);
    if (!done && t > batRun) { const hpLeft = N.ling.hp - ((burn * N.firebat.dps) % N.ling.hp); T.hp(packX, packY - 52, 60, hpLeft, N.ling.hp); }
    return { dead, end, done };
  }
  function timer(g, x, y, label, t, end, col) {
    const done = t >= end, v = Math.min(t, end);
    g.fillStyle = '#fffaf0'; g.strokeStyle = done ? col : '#cdbf9f'; g.lineWidth = done ? 3 : 2; g.beginPath(); g.roundRect(x, y, 300, 58, 10); g.fill(); g.stroke();
    txt(g, label, x + 14, y + 18, '600 14px Jost, sans-serif', C.muted);
    txt(g, fmt(v), x + 14, y + 40, '800 24px Montserrat, Jost, sans-serif', done ? col : C.ink);
    if (done) txt(g, 'cluster cleared', x + 286, y + 40, '700 14px Jost, sans-serif', col, 'right');
  }
  canvasDemo('zerg', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, n: 12, b: 2, runT: 0, key: '' };
    const tourBtn = $(s, '.zg-tour'), nIn = $(s, '.zg-n'), bIn = $(s, '.zg-b');
    const free = () => { st.tour = false; tourBtn.classList.remove('on'); };
    nIn.oninput = () => { free(); st.n = +nIn.value; st.runT = 0; };
    bIn.oninput = () => { free(); st.b = +bIn.value; st.runT = 0; };
    $(s, '.zg-replay').onclick = () => { free(); st.runT = 0; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.n = 12; st.b = 2; tourBtn.classList.add('on'); };
    const DUR = raynorTime(12) / N.zergRate + 2;
    function render() {
      const n = st.tour ? 12 : st.n, b = st.tour ? 2 : st.b, t = (st.tour ? st.t : st.runT) * N.zergRate;
      nIn.value = n; bIn.value = b; $(s, '.zg-nv').textContent = n; $(s, '.zg-bv').textContent = b;
      T.use(g); panel(g);
      const AY = 70, AH = 380;
      arena(g, 30, AY, 470, AH, 'Raynor alone: kite the pack', 'possible, slow');
      arena(g, 540, AY, 470, AH, 'Bring Firebats: burn the cluster', 'the right tool');
      g.save(); g.beginPath(); g.rect(30, AY, 470, AH); g.clip(); const r = raynorArena(g, 30, AY, 470, AH, n, t); g.restore();
      g.save(); g.beginPath(); g.rect(540, AY, 470, AH); g.clip(); const f = batArena(g, 540, AY, 470, AH, n, b, t); g.restore();
      timer(g, 30, AY + AH + 16, `Zerglings down: ${r.dead} / ${n}`, t, r.end, C.blue);
      timer(g, 540, AY + AH + 16, `Zerglings down: ${f.dead} / ${n}`, t, f.end, C.good);
      const ratio = r.end / f.end;
      if (f.done) T.stamp(`${ratio.toFixed(1)}× faster`, 775, AY + AH / 2, C.good, clamp((t - f.end) * 2), 30);
      if (r.done) T.stamp('also cleared', 265, AY + AH / 2, C.blue, clamp((t - r.end) * 2), 26);
      const key = [n, b].join(); if (key === st.key) return; st.key = key;
      say($(s, '.zg-stats'), `<div><b>${fmt(r.end)}</b><span>Raynor alone, kiting</span></div><div class="g"><b>${fmt(f.end)}</b><span>${b} Firebat${b > 1 ? 's' : ''}</span></div><div class="y"><b>${ratio.toFixed(1)}×</b><span>faster with the right tool</span></div>`);
      say($(s, '.zg-out'), `A soft check: Raynor can clear ${n} Zerglings on his own, so nobody is forced. But Firebats do it ${ratio.toFixed(1)}× faster, and that gap is what teaches the player to bring them.`);
    }
    apis.zerg = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => {
      dt = Math.max(0, Math.min(dt, .1));
      if (!st.held) { if (st.tour) { st.t += dt; if (st.t > DUR) st.t = 0; } else { st.runT += dt; if (st.runT * N.zergRate > raynorTime(st.n) + 8) st.runT = 0; } }
      render();
    };
  });

  /* ---------- slide 2: God of War's ice coat ---------- */
  // The scene is drawn side-on, in the look of God of War (2018): a frost Draugr in snowy Norse ruins, Kratos with the
  // Leviathan Axe on one side and the Blades of Chaos on the other, the HUD's weapon slot and a weapon switch.
  const KR = new Image(); KR.src = '../../../student-tokens/256px/more-games/god-of-war-kratos.png';
  const SERIF = 'Cinzel, Georgia, serif';
  const FROST = '#6fd0ff', FIRE = '#ff7a2a', SKIN = '#d6d0c4';
  const SWING = .7 * N.iceRate;                       // one swing per 0.7 s of real time, in sim seconds
  const ttk = (dps, lead = 0) => dps > 0 ? lead + N.enemy.hp / dps : Infinity;
  const rnd = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const poly = (g, pts) => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); };
  const limb = (g, pts, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); };
  const glowDot = (g, x, y, r, rgb, a) => { if (a <= 0) return; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };

  // snowy Norse ruins at dusk
  function backdrop(g, x, y, w, h, gy, ck) {
    let gr = g.createLinearGradient(0, y, 0, gy);
    gr.addColorStop(0, '#121c30'); gr.addColorStop(.55, '#33495f'); gr.addColorStop(1, '#7f97ab');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    glowDot(g, x + w * .62, y + 40, 120, '190,215,235', .18);
    const ridge = (base, amp, n, seed, rock, snow) => {
      const pts = [[x, gy]]; for (let i = 0; i <= n; i++) { pts.push([x + w * (i - .5) / n, base - amp * .15 * rnd(seed + i + 9)]); pts.push([x + w * (i + rnd(seed + i + 3) * .3 - .15) / n, base - amp * (.45 + .55 * rnd(seed + i))]); } pts.push([x + w, gy]);
      g.fillStyle = rock; poly(g, pts);
      g.fillStyle = snow;
      for (let i = 2; i < pts.length - 1; i += 2) {
        const [px, py] = pts[i], [lx, ly] = pts[i - 1], [rx, ry] = pts[i + 1], f = .32 + .1 * rnd(seed + i);
        poly(g, [[px, py], [px + (rx - px) * f, py + (ry - py) * f], [px + (rx - px) * f * .45, py + (ry - py) * f * .75], [px, py + (Math.max(ly, ry) - py) * f * .55], [px + (lx - px) * f * .5, py + (ly - py) * f * .8], [px + (lx - px) * f, py + (ly - py) * f]]);
      }
    };
    ridge(gy - 60, 95, 5, 3, '#4d6680', '#d3e0ea');
    ridge(gy - 14, 60, 6, 21, '#223044', '#b3c4d3');
    // a ruined arch of carved stone, runes glowing faintly
    const stone = (px, top, pw) => {
      g.fillStyle = '#414c58'; g.fillRect(px, top, pw, gy - top);
      g.fillStyle = '#323b46'; for (let yy = top + 16; yy < gy; yy += 18) g.fillRect(px, yy, pw, 2);
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(px, top, 3, gy - top);
      g.fillStyle = '#dfe9f1'; g.beginPath(); g.ellipse(px + pw / 2, top, pw / 2 + 2, 4, 0, 0, TAU); g.fill();
    };
    const ax = x + w * .4, aw = 26, span = 120;
    stone(ax, gy - 140, aw); stone(ax + span, gy - 86, aw);
    g.fillStyle = '#414c58'; poly(g, [[ax - 8, gy - 152], [ax + 92, gy - 152], [ax + 104, gy - 140], [ax + 70, gy - 136], [ax - 8, gy - 136]]);
    g.fillStyle = '#dfe9f1'; poly(g, [[ax - 8, gy - 152], [ax + 92, gy - 152], [ax + 86, gy - 156], [ax - 4, gy - 156]]);
    const pulse = .45 + .25 * Math.sin(ck * 2);
    g.strokeStyle = `rgba(140,220,255,${pulse})`; g.lineWidth = 1.6;
    for (let i = 0; i < 5; i++) { const ry = gy - 126 + i * 23, rx = ax + 8; g.beginPath(); g.moveTo(rx + 5, ry); g.lineTo(rx + 5, ry + 14); g.moveTo(rx + 5, ry + 3 + (i % 3) * 3); g.lineTo(rx + 10 - (i % 2) * 10, ry + 7 + (i % 2) * 3); g.stroke(); }
    // a runestone
    g.fillStyle = '#3a434e'; poly(g, [[x + 22, gy], [x + 18, gy - 52], [x + 30, gy - 66], [x + 44, gy - 58], [x + 46, gy]]);
    g.strokeStyle = `rgba(140,220,255,${pulse * .8})`; g.beginPath(); g.moveTo(x + 32, gy - 52); g.lineTo(x + 32, gy - 18); g.moveTo(x + 32, gy - 44); g.lineTo(x + 39, gy - 36); g.moveTo(x + 32, gy - 32); g.lineTo(x + 25, gy - 24); g.stroke();
    // stone floor under snow
    gr = g.createLinearGradient(0, gy, 0, y + h); gr.addColorStop(0, '#6d7a88'); gr.addColorStop(1, '#2a3340');
    g.fillStyle = gr; g.fillRect(x, gy, w, y + h - gy);
    g.strokeStyle = 'rgba(30,38,48,.5)'; g.lineWidth = 1.5;
    for (let r = 0; r < 3; r++) { const yy = gy + 12 + r * 14; g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); for (let c = 0; c < 9; c++) { const xx = x + (c + (r % 2) * .5) * w / 8; g.moveTo(xx, yy); g.lineTo(xx - 3, yy + 14); } g.stroke(); }
    g.fillStyle = 'rgba(235,243,250,.75)';
    for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(x + rnd(i + 70) * w, gy + 2 + rnd(i + 80) * 40, 18 + rnd(i + 90) * 30, 3 + rnd(i + 95) * 3, 0, 0, TAU); g.fill(); }
    // ground fog
    gr = g.createLinearGradient(0, gy - 50, 0, gy + 16); gr.addColorStop(0, 'rgba(210,225,238,0)'); gr.addColorStop(.7, 'rgba(210,225,238,.22)'); gr.addColorStop(1, 'rgba(210,225,238,0)');
    g.fillStyle = gr; g.fillRect(x, gy - 50, w, 66);
  }
  function snowfall(g, x, y, w, h, ck) {
    g.fillStyle = 'rgba(245,250,255,.85)';
    for (let i = 0; i < 46; i++) {
      const fx = x + ((rnd(i) * w + ck * (6 + rnd(i + 50) * 14) + 8 * Math.sin(ck + i)) % w), fy = y + ((rnd(i + 100) * h + ck * (16 + rnd(i + 200) * 22)) % h);
      g.beginPath(); g.arc(fx, fy, .8 + rnd(i + 300) * 1.7, 0, TAU); g.fill();
    }
    const v = g.createRadialGradient(x + w / 2, y + h / 2, h * .35, x + w / 2, y + h / 2, w * .62);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(4,8,16,.55)'); g.fillStyle = v; g.fillRect(x, y, w, h);
  }

  // weapons, drawn along +x from the hand; +y is the side the swing travels toward
  function axe(g, glow = 1) {
    g.fillStyle = '#4a3426'; g.fillRect(-8, -2.6, 54, 5.2);
    g.fillStyle = '#c9a24a'; [4, 14, 24].forEach(v => g.fillRect(v, -3, 3, 6));
    g.save(); g.shadowColor = FROST; g.shadowBlur = 14 * glow;
    const gr = g.createLinearGradient(0, -4, 0, 24); gr.addColorStop(0, '#e6f2f8'); gr.addColorStop(1, '#7c90a0');
    g.fillStyle = gr; poly(g, [[34, -5], [48, -5], [52, 8], [47, 24], [38, 19], [34, 6]]); g.restore();
    g.strokeStyle = '#f4fbff'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(52, 8); g.lineTo(47, 24); g.stroke();
    g.strokeStyle = `rgba(120,220,255,${.9 * glow})`; g.lineWidth = 1.3; g.beginPath(); g.moveTo(40, 2); g.lineTo(40, 12); g.moveTo(40, 6); g.lineTo(44, 9); g.stroke();
  }
  function blade(g, glow = 1) {
    g.save(); g.shadowColor = FIRE; g.shadowBlur = 16 * glow;
    const gr = g.createLinearGradient(0, 0, 34, 0); gr.addColorStop(0, '#ffe2a0'); gr.addColorStop(1, '#d4471a');
    g.fillStyle = gr; poly(g, [[0, -3], [20, -6], [34, -1], [24, 4], [0, 3]]); g.restore();
    g.fillStyle = '#6b5a3a'; g.fillRect(-6, -5, 5, 10);
  }

  // Kratos, side-on, facing right. Returns where his hand is and where the weapon's head is.
  function arm(fx, fy, k, a) {
    const b = a + .45, sh = [11, -102], el = [sh[0] + 21 * Math.cos(a), sh[1] + 21 * Math.sin(a)], hd = [el[0] + 19 * Math.cos(b), el[1] + 19 * Math.sin(b)];
    const head = [hd[0] + 46 * Math.cos(b) - 9 * Math.sin(b), hd[1] + 46 * Math.sin(b) + 9 * Math.cos(b)];
    const W = p => [fx + p[0] * k, fy + p[1] * k];
    return { b, sh, el, hd, hand: W(hd), head: W(head) };
  }
  function kratos(g, fx, fy, k, o) {
    const A = arm(fx, fy, k, o.a);
    g.save(); g.translate(fx, fy); g.scale(k, k);
    g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(4, 0, 40, 7, 0, 0, TAU); g.fill();
    if (o.back === 'axe') { g.save(); g.translate(-14, -60); g.rotate(-1.15); axe(g, .5); g.restore(); }
    // back arm with a Blade of Chaos
    limb(g, [[-8, -100], [-18, -82], [-10, -68]], 10, '#aaa397');
    if (o.weapon === 'blades' || o.weapon === 'whip') { g.save(); g.translate(-10, -68); g.rotate(1.9); blade(g, .7); g.restore(); }
    limb(g, [[-4, -60], [-14, -32], [-24, -4]], 14, '#3b2c24'); limb(g, [[-22, -9], [-30, -2]], 11, '#211814');
    limb(g, [[8, -60], [20, -33], [26, -4]], 15, '#4a362b'); limb(g, [[25, -9], [34, -2]], 11, '#211814');
    g.fillStyle = '#7d2b22'; poly(g, [[-19, -68], [21, -68], [29, -36], [12, -42], [4, -34], [-6, -42], [-23, -36]]);
    g.fillStyle = '#7a6d5b'; g.fillRect(-20, -73, 42, 8); g.fillStyle = '#c9a24a'; g.fillRect(-19, -71, 40, 3);
    const sk = g.createLinearGradient(-20, 0, 22, 0); sk.addColorStop(0, '#9a9388'); sk.addColorStop(.6, '#dcd6cb'); sk.addColorStop(1, '#c2bbaf');
    g.fillStyle = sk; poly(g, [[-17, -70], [19, -70], [23, -96], [14, -108], [-12, -108], [-21, -96]]);
    g.strokeStyle = 'rgba(80,70,60,.35)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(4, -92); g.quadraticCurveTo(12, -88, 18, -92); g.moveTo(2, -80); g.lineTo(12, -80); g.stroke();
    g.fillStyle = '#b4231c'; poly(g, [[-7, -108], [-1, -108], [-3, -88], [-9, -72], [-14, -72], [-10, -88]]);
    limb(g, [[-15, -105], [20, -75]], 7, '#5b3a25'); g.fillStyle = '#d8b25a'; [0, .33, .66, 1].forEach(v => { g.beginPath(); g.arc(-15 + 35 * v, -105 + 30 * v, 1.8, 0, TAU); g.fill(); });
    g.fillStyle = '#76808d'; g.beginPath(); g.ellipse(-12, -103, 13, 9, -.3, 0, TAU); g.fill(); g.strokeStyle = '#c9a24a'; g.lineWidth = 2; g.stroke();
    g.fillStyle = SKIN; g.fillRect(-3, -114, 11, 9);
    g.beginPath(); g.arc(3, -122, 11.5, 0, TAU); g.fill();
    g.fillStyle = '#c2bbaf'; g.beginPath(); g.arc(-1, -118, 3, 0, TAU); g.fill();
    g.fillStyle = '#3a2a20'; poly(g, [[5, -117], [15, -118], [17, -112], [14, -102], [7, -99], [1, -104], [2, -112]]);
    g.fillStyle = SKIN; poly(g, [[13, -126], [18, -119], [13, -118]]);
    g.strokeStyle = '#b4231c'; g.lineWidth = 3.5; g.lineCap = 'round'; g.beginPath(); g.arc(3, -122, 8.8, -1.25, -3.75, true); g.stroke();
    g.strokeStyle = '#2a1d16'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(7, -126); g.lineTo(14, -124.5); g.stroke();
    g.fillStyle = '#e8e4da'; g.beginPath(); g.arc(11, -123, 1.2, 0, TAU); g.fill();
    // swinging arm and its weapon
    limb(g, [A.sh, A.el], 11, SKIN); limb(g, [A.el, A.hd], 10, SKIN);
    limb(g, [[A.el[0] + (A.hd[0] - A.el[0]) * .35, A.el[1] + (A.hd[1] - A.el[1]) * .35], [A.el[0] + (A.hd[0] - A.el[0]) * .85, A.el[1] + (A.hd[1] - A.el[1]) * .85]], 11.5, '#3a3f48');
    if (o.weapon === 'axe') { g.save(); g.translate(...A.hd); g.rotate(A.b); axe(g, 1); g.restore(); }
    if (o.weapon === 'blades') { g.save(); g.translate(...A.hd); g.rotate(A.b); blade(g, 1); g.restore(); }
    g.fillStyle = '#cfc8bc'; g.beginPath(); g.arc(...A.hd, 5.5, 0, TAU); g.fill();
    g.restore();
    return A;
  }

  // a Draugr in a shell of ice, side-on, facing left
  function draugr(g, ex, ey, k, o) {
    g.save(); g.translate(ex + (o.flinch || 0), ey + (o.sink || 0)); g.scale(k, k); g.globalAlpha = o.a;
    g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(0, 0, 36, 7, 0, 0, TAU); g.fill();
    limb(g, [[6, -56], [14, -30], [8, -3]], 11, '#3a3f38'); limb(g, [[-6, -56], [-14, -30], [-22, -3]], 11, '#454b42');
    limb(g, [[10, -102], [22, -84], [18, -66]], 9, '#4c5344');
    g.fillStyle = '#3a2f29'; poly(g, [[-16, -64], [16, -64], [21, -34], [11, -41], [3, -29], [-6, -41], [-19, -33]]);
    g.fillStyle = '#58604e'; poly(g, [[-15, -62], [16, -62], [18, -92], [5, -112], [-18, -107], [-25, -88]]);
    g.strokeStyle = '#3c4236'; g.lineWidth = 2; [-96, -88, -80].forEach(v => { g.beginPath(); g.moveTo(-14, v); g.quadraticCurveTo(-2, v - 4, 10, v); g.stroke(); });
    g.fillStyle = '#5f666f'; poly(g, [[-22, -100], [-6, -106], [-2, -84], [-20, -80]]);
    g.fillStyle = '#22251f'; g.beginPath(); g.arc(-15, -115, 11, 0, TAU); g.fill();
    g.fillStyle = '#6a717a'; g.beginPath(); g.arc(-14, -119, 12, Math.PI * 1.02, Math.PI * 2.05); g.fill(); g.fillRect(-25, -119, 3, 11);
    g.save(); g.shadowColor = '#ff9a3a'; g.shadowBlur = 10; g.fillStyle = '#ffb25a'; g.beginPath(); g.arc(-21, -113, 2.2, 0, TAU); g.arc(-15, -113, 2.2, 0, TAU); g.fill(); g.restore();
    limb(g, [[-10, -104], [-26, -90], [-36, -82]], 9, '#4f5647');
    limb(g, [[-36, -82], [-62, -104]], 4, '#8a8580'); limb(g, [[-40, -78], [-32, -86]], 4, '#5a4a3a');
    if (o.ice > 0) {
      g.globalAlpha = o.a * o.ice;
      g.save(); g.shadowColor = FROST; g.shadowBlur = 14;
      g.fillStyle = 'rgba(178,226,255,.5)';
      poly(g, [[-36, -58], [-31, -88], [-38, -104], [-29, -134], [-12, -138], [0, -124], [14, -120], [26, -96], [23, -70], [28, -56], [14, -48], [-4, -53], [-21, -47]]);
      g.restore();
      g.fillStyle = 'rgba(205,238,255,.55)';
      [[[-31, -88], [-48, -96], [-34, -100]], [[-29, -134], [-36, -150], [-20, -136]], [[14, -120], [26, -134], [20, -114]], [[26, -96], [40, -102], [25, -86]], [[-36, -58], [-48, -54], [-34, -66]]].forEach(p => poly(g, p));
      limb(g, [[-24, -92], [-36, -82], [-60, -102]], 9, 'rgba(190,232,255,.45)');
      poly(g, [[-30, 0], [-33, -14], [-18, -22], [10, -20], [24, -12], [26, 0]]);
      g.strokeStyle = 'rgba(240,252,255,.9)'; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(-29, -134); g.lineTo(-12, -138); g.lineTo(0, -124); g.moveTo(-20, -126); g.lineTo(-6, -100); g.lineTo(-16, -70); g.moveTo(6, -110); g.lineTo(14, -84); g.moveTo(-33, -14); g.lineTo(-18, -22); g.lineTo(10, -20); g.stroke();
      g.fillStyle = 'rgba(220,245,255,.8)'; [[-30, -84], [-6, -52], [18, -66]].forEach(([ix, iy]) => poly(g, [[ix - 3, iy], [ix + 3, iy], [ix, iy + 12]]));
    }
    g.restore();
  }

  function axeIcon(g, cx, cy, s, a) { g.save(); g.globalAlpha *= a; g.translate(cx, cy); g.rotate(-2.2); g.scale(s, s); g.translate(-24, -8); axe(g, .8); g.restore(); }
  function bladesIcon(g, cx, cy, s, a) { g.save(); g.globalAlpha *= a; g.translate(cx, cy); g.scale(s, s); [-.9, -2.25].forEach(r => { g.save(); g.rotate(r); g.translate(-16, 0); blade(g, .8); g.restore(); }); g.restore(); }
  function slot(g, cx, cy, r, lit, rgb, icon) {
    g.fillStyle = lit ? 'rgba(10,14,22,.8)' : 'rgba(10,14,22,.55)'; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
    g.strokeStyle = lit ? `rgba(${rgb},.95)` : 'rgba(200,190,160,.45)'; g.lineWidth = lit ? 2.5 : 1.5; g.stroke();
    if (lit) glowDot(g, cx, cy, r * 1.6, rgb, .22);
    icon(g, cx, cy, r / 30, lit ? 1 : .45);
  }

  function fight(g, x, y, w, h, o) {
    const { t, ck, kind, dps } = o, lead = o.lead || 0, life = ttk(dps, lead);
    const fireT = Math.max(0, t - lead), hp = dps > 0 ? Math.max(0, N.enemy.hp - dps * fireT) : N.enemy.hp, done = hp <= 0;
    const gy = y + h - 46, ex = x + w - 100, k = .9, fx = kind === 'axe' ? ex - 100 * k : x + 150, rgb = kind === 'axe' ? '111,208,255' : '255,122,42';
    g.save(); g.beginPath(); g.roundRect(x, y, w, h, 12); g.clip();
    backdrop(g, x, y, w, h, gy, ck);
    // pose: a swing every SWING sim seconds; the blades side first switches weapons
    const sw = t < lead ? -1 : ((t - lead) / SWING + .38) % 1, idle = done || sw < 0;
    let a = .3, weapon = kind === 'axe' ? 'axe' : 'blades', back = kind === 'axe' ? null : 'axe', ext = 0;
    if (t < lead) { const p = t / lead; a = p < .5 ? lerp(.3, -2.6, ease(p * 2)) : lerp(-2.6, .2, ease((p - .5) * 2)); weapon = p < .5 ? 'axe' : 'blades'; back = p < .5 ? null : 'axe'; }
    else if (!done) {
      if (sw < .5) a = lerp(.5, -2.3, ease(sw / .5));
      else if (sw < .66) { const q = (sw - .5) / .16; a = lerp(-2.3, .7, q * q); }
      else a = lerp(.7, .5, (sw - .66) / .34);
      if (kind === 'blades') { ext = sw < .5 ? 0 : sw < .61 ? (sw - .5) / .11 : sw < .78 ? 1 : sw < .92 ? 1 - (sw - .78) / .14 : 0; if (ext > 0) weapon = 'whip'; }
    }
    const hit = !idle && sw >= .61, hitAge = hit ? (sw - .61) / .39 : 1, tgt = [ex - 12 * k, gy - 92 * k];
    const melt = kind === 'blades' ? 1 - clamp((t - lead) / 7) : 1;
    const dAge = done ? (t - life) / N.iceRate : 0;
    // light from the weapon
    const A0 = arm(fx, gy, k, a);
    glowDot(g, A0.hand[0], A0.hand[1], 110, rgb, kind === 'axe' ? .16 : .3);
    if (!done || dAge < .9) draugr(g, ex, gy, k, { a: done ? clamp(1 - dAge / .9) : 1, sink: done ? dAge * 18 : 0, flinch: hit && hitAge < .3 ? 5 : 0, ice: done ? 0 : melt });
    if (done) T.poof(ex, gy - 60, Math.min(.79, dAge), 40);
    if (kind === 'blades' && melt > 0 && melt < 1) for (let i = 0; i < 6; i++) { const ph = (ck * .8 + i / 6) % 1; glowDot(g, ex - 20 + i * 8 + 6 * Math.sin(ck * 2 + i), gy - 100 - ph * 70, 16 + ph * 14, '235,240,245', .35 * (1 - ph) * melt); }
    // swing trails
    if (!idle && sw >= .5 && sw < .75) {
      if (kind === 'axe') {
        const a1 = a, a0 = Math.max(-2.3, a - 1.3);
        for (let i = 0; i < 10; i++) { const p = arm(fx, gy, k, lerp(a0, a1, i / 10)).head, q = arm(fx, gy, k, lerp(a0, a1, (i + 1) / 10)).head; g.strokeStyle = `rgba(150,225,255,${.08 * i * (1 - clamp((sw - .66) / .09))})`; g.lineWidth = 3 + i; g.lineCap = 'round'; g.beginPath(); g.moveTo(...p); g.lineTo(...q); g.stroke(); }
      }
    }
    const A = kratos(g, fx, gy, k, { a, weapon, back });
    if (t < lead && t > lead / 2) glowDot(g, A.hand[0], A.hand[1], 60, '255,150,60', 1 - (t - lead / 2) / (lead / 2));
    // the Blades on their chains
    if (weapon === 'whip') {
      const bx = lerp(A.hand[0], tgt[0], ext), by = lerp(A.hand[1], tgt[1], ext) - Math.sin(ext * Math.PI) * 34, mx = (A.hand[0] + bx) / 2, my = (A.hand[1] + by) / 2 + 14 * (1 - ext) - 10;
      g.save(); g.shadowColor = FIRE; g.shadowBlur = 10; g.strokeStyle = '#5a504a'; g.lineWidth = 3; g.setLineDash([5, 3]);
      g.beginPath(); g.moveTo(...A.hand); g.quadraticCurveTo(mx, my, bx, by); g.stroke(); g.setLineDash([]);
      g.strokeStyle = 'rgba(255,140,50,.55)'; g.lineWidth = 7; g.beginPath(); g.moveTo(...A.hand); g.quadraticCurveTo(mx, my, bx, by); g.stroke(); g.restore();
      glowDot(g, bx, by, 26, '255,140,50', .7);
      g.save(); g.translate(bx, by); g.rotate(Math.atan2(by - my, bx - mx)); blade(g, 1.2); g.restore();
    }
    // the hit
    if (hit && !done) {
      const ix = tgt[0], iy = tgt[1];
      if (kind === 'axe') {
        T.flash(ix, iy, 30, .8 * (1 - hitAge * 3));
        g.fillStyle = `rgba(215,242,255,${1 - hitAge})`;
        for (let i = 0; i < 9; i++) { const an = Math.PI + (rnd(i + 5) - .5) * 1.9, d = 8 + hitAge * (60 + 40 * rnd(i + 9)), px = ix + Math.cos(an) * d, py = iy + Math.sin(an) * d + hitAge * hitAge * 40; g.save(); g.translate(px, py); g.rotate(i + hitAge * 6); poly(g, [[-3, -2], [4, 0], [-1, 4]]); g.restore(); }
      } else {
        glowDot(g, ix, iy, 46, '255,150,60', .9 * (1 - hitAge * 2)); glowDot(g, ix, iy, 20, '255,240,200', .9 * (1 - hitAge * 3));
        g.fillStyle = `rgba(255,190,90,${1 - hitAge})`;
        for (let i = 0; i < 10; i++) { const px = ix + (rnd(i + 30) - .5) * 50 + Math.sin(i + hitAge * 4) * 6, py = iy - hitAge * (30 + 40 * rnd(i + 40)); g.beginPath(); g.arc(px, py, 1.5 + rnd(i) * 1.5, 0, TAU); g.fill(); }
      }
      const per = dps * SWING;
      T.popText(dps === 0 ? 'no effect' : '−' + Math.max(1, Math.round(per)), ix - 34, iy - 34 - hitAge * 22, kind === 'axe' ? '#2c6f9a' : '#c2410c', 1 - hitAge);
    }
    snowfall(g, x, y, w, h, ck);
    // enemy health
    if (!done) {
      const bx = ex - 62, by = gy - 156;
      txt(g, 'Frost Draugr', ex, by - 11, `700 13px ${SERIF}`, '#eef4f8', 'center');
      g.fillStyle = 'rgba(8,10,16,.75)'; g.fillRect(bx - 2, by - 2, 128, 10);
      g.fillStyle = '#c8322a'; g.fillRect(bx, by, 124 * hp / N.enemy.hp, 6);
      if (melt > 0) { g.fillStyle = `rgba(160,225,255,${.85 * melt})`; g.fillRect(bx, by, 124, 2); }
    }
    // HUD: Kratos' health and rage, the weapon slots, the clock
    g.fillStyle = 'rgba(8,10,16,.7)'; g.fillRect(x + 14, y + h - 28, 124, 14);
    g.fillStyle = '#62b83a'; g.fillRect(x + 16, y + h - 26, 120, 6); g.fillStyle = '#b8261d'; g.fillRect(x + 16, y + h - 18, 120 * clamp(.2 + fireT / 60, 0, 1), 3);
    const axeLit = weapon === 'axe', sx = x + w - 34, sy = y + h - 32;
    slot(g, sx - (axeLit ? 0 : 40), sy + (axeLit ? 0 : 6), axeLit ? 22 : 15, axeLit, '111,208,255', axeIcon);
    slot(g, sx - (axeLit ? 40 : 0), sy + (axeLit ? 6 : 0), axeLit ? 15 : 22, !axeLit, '255,122,42', bladesIcon);
    const clock = done ? `slain in ${fmt(life)}` : fmt(t);
    txt(g, clock, x + w / 2, y + h - 21, `700 ${done ? 17 : 15}px ${SERIF}`, done ? '#ffe2a0' : '#dce6ee', 'center');
    // the weapon switch callout
    if (kind === 'blades') {
      const ca = t < lead ? 1 : 1 - clamp((t - lead) / 4);
      if (ca > 0) { g.save(); g.globalAlpha = ca; const cy = y + h - 64; g.fillStyle = 'rgba(6,10,18,.72)'; g.beginPath(); g.roundRect(x + w / 2 - 128, cy - 16, 256, 32, 16); g.fill(); g.strokeStyle = 'rgba(255,170,90,.8)'; g.lineWidth = 1.5; g.stroke(); txt(g, 'Switch to the Blades', x + w / 2, cy + 1, `700 18px ${SERIF}`, '#ffcf8a', 'center'); g.restore(); }
    }
    // title plate with a portrait
    const tg = g.createLinearGradient(0, y, 0, y + 72); tg.addColorStop(0, 'rgba(4,8,16,.75)'); tg.addColorStop(1, 'rgba(4,8,16,0)'); g.fillStyle = tg; g.fillRect(x, y, w, 72);
    g.save(); g.beginPath(); g.arc(x + 34, y + 33, 21, 0, TAU); g.clip(); g.fillStyle = '#2a2f38'; g.fillRect(x + 10, y + 9, 48, 48);
    if (KR.complete && KR.naturalWidth) g.drawImage(KR, 110, 0, 130, 130, x + 13, y + 12, 42, 42); g.restore();
    g.strokeStyle = '#c9a24a'; g.lineWidth = 2; g.beginPath(); g.arc(x + 34, y + 33, 21, 0, TAU); g.stroke();
    txt(g, o.title, x + 64, y + 25, `700 19px ${SERIF}`, kind === 'axe' ? '#a6e4ff' : '#ffb979');
    txt(g, o.sub, x + 64, y + 47, '600 14px Jost, sans-serif', '#d4dee8');
    g.restore();
    g.strokeStyle = '#0d1420'; g.lineWidth = 2; g.beginPath(); g.roundRect(x, y, w, h, 12); g.stroke();
    return { hp, done, life };
  }
  function verdict(pct, pat) {
    const wrong = ttk(N.axeDps * pct / 100);
    if (pct === 0) return { k: 'hard', name: 'Hard check: forced', col: C.red };
    if (wrong > pat) return { k: 'eff', name: 'Effectively a hard check', col: '#b8560f' };
    return { k: 'soft', name: 'Soft check', col: C.good };
  }
  function bars(g, x, y, w, rows, pat, t) {
    const MAX = 120, BW = w - 300, sx = v => x + 210 + BW * Math.min(v, MAX) / MAX;
    txt(g, 'Time to kill', x, y, '800 17px Montserrat, Jost, sans-serif');
    rows.forEach(([label, v, col], i) => {
      const yy = y + 24 + i * 36;
      txt(g, label, x, yy + 9, '600 15px Jost, sans-serif', C.ink);
      g.fillStyle = '#e8dcc0'; g.beginPath(); g.roundRect(x + 210, yy, BW, 18, 5); g.fill();
      const shown = Math.min(v, t);
      g.fillStyle = col; g.beginPath(); g.roundRect(x + 210, yy, Math.max(2, sx(shown) - x - 210), 18, 5); g.fill();
      txt(g, v === Infinity ? 'never' : fmt(v), x + w, yy + 9, '700 15px Jost, sans-serif', col, 'right');
      if (v > MAX) { g.fillStyle = col; g.beginPath(); g.moveTo(sx(MAX) + 2, yy - 2); g.lineTo(sx(MAX) + 12, yy + 9); g.lineTo(sx(MAX) + 2, yy + 20); g.fill(); }
    });
    const px = sx(pat); g.setLineDash([6, 5]); g.strokeStyle = C.navy; g.lineWidth = 2.5; g.beginPath(); g.moveTo(px, y + 14); g.lineTo(px, y + 94); g.stroke(); g.setLineDash([]);
    T.label(`player patience ≈ ${pat} s`, px, y, 'center', C.navy, 13);
  }
  canvasDemo('ice', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, pct: 4, pat: N.patience, runT: 0, ck: 0, key: '' };
    const tourBtn = $(s, '.ic-tour'), pIn = $(s, '.ic-pct'), patIn = $(s, '.ic-pat');
    const free = () => { st.tour = false; tourBtn.classList.remove('on'); };
    pIn.oninput = () => { free(); st.pct = +pIn.value; st.runT = 0; };
    patIn.oninput = () => { free(); st.pat = +patIn.value; st.key = ''; };
    $$(s, '.ic-pre .btn').forEach(b => b.onclick = () => { free(); st.pct = +b.dataset.p; st.runT = 0; });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const SEG = 5.5, DUR = SEG * 3;
    function render() {
      let pct = st.pct, t = st.runT * N.iceRate, pat = st.pat;
      if (st.tour) { const i = Math.min(2, Math.floor(st.t / SEG)); pct = N.presets[i][1]; t = (st.t - i * SEG) * N.iceRate; pat = N.patience; }
      pIn.value = pct; patIn.value = pat; $(s, '.ic-pv').textContent = pct + '%'; $(s, '.ic-patv').textContent = pat + ' s';
      $$(s, '.ic-pre .btn').forEach(b => b.classList.toggle('on', +b.dataset.p === pct));
      T.use(g); panel(g);
      const v = verdict(pct, pat), axeD = N.axeDps * pct / 100;
      const a = fight(g, 20, 10, 490, 300, { kind: 'axe', title: 'Leviathan Axe', sub: `frost on frost: ${pct}% damage through the ice`, dps: axeD, t, ck: st.ck });
      const b = fight(g, 530, 10, 490, 300, { kind: 'blades', title: 'Blades of Chaos', sub: 'switch weapons, fire melts the coat', dps: N.bladesDps, lead: N.switchTime, t, ck: st.ck + 3 });
      txt(g, 'sim clock ' + fmt(t), 1020, 330, '600 13px Jost, sans-serif', C.muted, 'right');
      bars(g, 30, 330, 980, [['Leviathan Axe', a.life, '#3d9be0'], ['Blades of Chaos', b.life, '#ef6a1f']], pat, t);
      // the verdict
      const vy = 426;
      g.fillStyle = v.col + '1c'; g.strokeStyle = v.col; g.lineWidth = 3; g.beginPath(); g.roundRect(20, vy, 1000, 150, 14); g.fill(); g.stroke();
      txt(g, v.name, 44, vy + 28, '800 24px Montserrat, Jost, sans-serif', v.col);
      const lines = v.k === 'hard' ? ['Only the right tool works. Like God of War’s freeze puzzles, the game forces', 'the mechanic: the player cannot move on without it.']
        : v.k === 'eff' ? [`The axe technically does damage, but ${fmt(a.life)} is far past a player’s patience.`, 'In practice the player must switch weapons: a soft check on paper, a hard check in play.']
        : [`The axe works (${fmt(a.life)}); the blades are ${(a.life / b.life).toFixed(1)}× faster, switch included. Nobody is forced,`, 'but the efficient answer is obvious enough that players learn it.'];
      lines.forEach((l, i) => txt(g, l, 44, vy + 62 + i * 25, '500 17px Jost, sans-serif', C.ink));
      const sx0 = 44, sx1 = 996, yy = vy + 112;
      const grd = g.createLinearGradient(sx0, 0, sx1, 0); grd.addColorStop(0, C.red); grd.addColorStop(.25, '#e0a92d'); grd.addColorStop(1, C.good);
      g.fillStyle = grd; g.beginPath(); g.roundRect(sx0, yy, sx1 - sx0, 10, 5); g.fill();
      const mx = lerp(sx0, sx1, pct / 100); g.fillStyle = C.navy; g.beginPath(); g.arc(mx, yy + 5, 9, 0, TAU); g.fill();
      txt(g, 'forced', sx0, yy + 24, '600 13px Jost, sans-serif', C.muted); txt(g, 'much more efficient', sx1, yy + 24, '600 13px Jost, sans-serif', C.muted, 'right');
      const key = [pct, pat].join(); if (key === st.key) return; st.key = key;
      say($(s, '.ic-stats'), `<div class="${v.k === 'soft' ? 'g' : 'r'}"><b>${a.life === Infinity ? 'never' : fmt(a.life)}</b><span>to kill with the axe</span></div><div class="g"><b>${fmt(b.life)}</b><span>to switch and kill with the blades</span></div><div class="y"><b>${a.life === Infinity ? '∞' : (a.life / b.life).toFixed(1) + '×'}</b><span>how much faster the right tool is</span></div>`);
      say($(s, '.ic-out'), v.k === 'soft' ? 'A soft check teaches without forcing: the wrong tool is slower, not useless.' : v.k === 'eff' ? 'Below the patience line the difference stops being “more efficient” and becomes “forced”. Decide which one you meant.' : 'A hard check guarantees the player has learned the mechanic before moving on.');
    }
    apis.ice = { seek(t) { st.held = st.tour = true; st.t = t; st.ck = t; render(); }, dur: () => DUR };
    return dt => {
      dt = Math.max(0, Math.min(dt, .1));
      if (!st.held) { st.ck += dt; if (st.tour) { st.t += dt; if (st.t > DUR) st.t = 0; } else { st.runT += dt; if (st.runT * N.iceRate > Math.min(150, ttk(N.axeDps * st.pct / 100)) + 12) st.runT = 0; } }
      render();
    };
  });

  window.__seek = (t, w) => apis[w].seek(t);
  window.__dur = w => apis[w].dur();
})();
