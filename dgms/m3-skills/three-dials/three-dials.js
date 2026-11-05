/* Three difficulty dials (DGMS C2 M3 "Leveraging Player Skills", deck slides 46-52 and 81).
   dials: a side-view corridor of jumps. Intensity = gap width, fault tolerance = lives, required successes = jumps
          between checkpoints. Three seeded ghost players run it twenty times each; the page prints clear rate and
          average attempts (runs per clear).
   beast: Silksong's Savage Beastfly (slide 81) as the same three dials: boss HP over damage per hit is the required
          successes, Hornet's masks are the fault tolerance, and the Beastfly (2 masks) and its summons (1 mask) are the
          cost of each mistake.
   Deck numbers: 550 HP, 5 damage a needle hit (110 hits), Silk Spear 15 damage (a third as many), Beastfly 2 masks,
   summons 1 mask. Everything else (ghost skills, per-jump odds, per-exchange hit chances, 12 jumps, 5 masks to start)
   is illustrative and lives in the tables below. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp } = TD;
  const W = 1040, H = 585;

  /* ---------- tunable numbers ---------- */
  const JUMPS = 12;            // jumps in the corridor (illustrative)
  const RUNS = 20;             // runs per ghost (from the proposal)
  const INF_LIVES = 10;        // the lives slider's top stop means unlimited lives
  const K = 1.3, PMAX = .995;  // per-jump success: 1 / (1 + e^(K (gap - skill))), capped
  const GHOSTS = [             // skill = the gap width (tiles) this ghost clears half the time (illustrative)
    { name: 'Newcomer', skill: 4.5, col: '#2ea3dc' },
    { name: 'Regular', skill: 5.5, col: '#2fae63' },
    { name: 'Expert', skill: 6.6, col: '#8a4fd6' },
  ];
  const PRESETS = { gentle: { gap: 2, lives: 5, cp: 3 }, tight: { gap: 5, lives: 10, cp: 1 }, marathon: { gap: 2.5, lives: 1, cp: 12 } };
  const BEAST = {              // slide 81's numbers
    hp: 550, needle: 5, spear: 15, beastDmg: 2, summonDmg: 1,
    masks: 5,                  // Hornet's starting masks (illustrative default; slider 3-10)
    // per exchange: chance Hornet lands her hit, chance the Beastfly's charge lands, chance a summon lands (illustrative)
    hit: [.55, .7, .85], qBeast: [.03, .016, .007], qSummon: [.02, .01, .004],
  };

  const pJump = (gap, s) => Math.min(PMAX, 1 / (1 + Math.exp(K * (gap - s))));
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const hash = (...n) => n.reduce((h, v) => Math.imul(h ^ Math.round(v * 100), 2654435761) >>> 0, 2166136261);
  const panel = g => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const txt = (g, s, x, y, font, col = C.ink, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); };
  const HEAD = n => `800 ${n}px Montserrat, Jost, sans-serif`, BODY = (n, w = 500) => `${w} ${n}px Jost, sans-serif`;
  const pct = v => Math.round(v * 100) + '%';
  const perClear = (c, n = RUNS) => c ? (n / c).toFixed(1) : `${n}+`;
  const apis = {};

  /* ---------- 1: the corridor ---------- */
  // one ghost's twenty runs as a flat list of jump events (and an 'end' event per run)
  function simulate(gi, gap, lives, cp) {
    const r = rng(hash(gi, gap, lives, cp)), p = pJump(gap, GHOSTS[gi].skill), ev = [], runs = [];
    let jumpsTried = 0;
    for (let run = 0; run < RUNS; run++) {
      let pos = 0, check = 0, left = lives >= INF_LIVES ? Infinity : lives, n = 0;
      while (pos < JUMPS && left > 0 && n < 400) {
        const ok = r() < p; n++;
        ev.push({ kind: 'jump', run, j: pos, ok, left, from: pos });
        if (ok) { pos++; if (pos % cp === 0) check = pos; }
        else { left--; ev[ev.length - 1].to = check; pos = check; }
      }
      const clear = pos >= JUMPS;
      jumpsTried += n; runs.push(clear);
      ev.push({ kind: 'end', run, clear, j: pos, left });
    }
    return { ev, runs, clears: runs.filter(Boolean).length, jumpsPerRun: jumpsTried / RUNS, p };
  }

  canvasDemo('dials', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, gap: 3, lives: 3, cp: 4, key: '', sims: null };
    const tourBtn = $(s, '.dl-tour'), gIn = $(s, '.dl-gap'), lIn = $(s, '.dl-lives'), cIn = $(s, '.dl-cp');
    const free = () => { st.tour = false; tourBtn.classList.remove('on'); };
    const sync = () => { gIn.value = st.gap; lIn.value = st.lives; cIn.value = st.cp; };
    gIn.oninput = () => { free(); st.gap = +gIn.value; st.t = 0; };
    lIn.oninput = () => { free(); st.lives = +lIn.value; st.t = 0; };
    cIn.oninput = () => { free(); st.cp = +cIn.value; st.t = 0; };
    $$(s, '.dl-pre .btn').forEach(b => b.onclick = () => { free(); Object.assign(st, PRESETS[b.dataset.p]); sync(); st.t = 0; });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };

    // the walk-through turns one dial at a time from the same starting corridor
    const TOUR = [
      [0, { gap: 3, lives: 3, cp: 4 }, 'Start: gap 3, three lives, a checkpoint every 4 jumps'],
      [5, { gap: 5, lives: 3, cp: 4 }, 'Intensity up: wider gaps'],
      [10, { gap: 3, lives: 1, cp: 4 }, 'Fault tolerance down: one life'],
      [15, { gap: 3, lives: 3, cp: 12 }, 'Required successes up: no checkpoints'],
    ];
    const DUR = 20;

    const X0 = 30, X1 = 1010, TILE = 8;
    function geo(gap) { const G = gap * TILE, P = (X1 - X0 - JUMPS * G) / (JUMPS + 1); return { G, P, px: j => X0 + j * (P + G) }; }

    function lane(i, sim, y0, play) {
      const gh = GHOSTS[i], { G, P, px } = geo(st.gap), gy = y0 + 112;
      // header
      txt(g, gh.name, 30, y0 + 16, HEAD(19), gh.col);
      txt(g, `one jump: ${pct(sim.p)} · ${sim.clears}/${RUNS} runs clear`, 150, y0 + 16, BODY(16, 600), C.ink);
      // twenty dots, one per run
      const cur = play.ev ? play.ev.run : -1;
      for (let r = 0; r < RUNS; r++) {
        const x = 690 + r * 16.5, y = y0 + 16;
        g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2);
        g.fillStyle = sim.runs[r] ? '#2fae63' : '#e5322d'; g.globalAlpha = r <= cur ? 1 : .3; g.fill(); g.globalAlpha = 1;
        if (r === cur) { g.strokeStyle = C.navy; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.stroke(); }
      }
      // pit band
      g.fillStyle = '#0f1430'; g.fillRect(X0, gy, X1 - X0, 40);
      g.fillStyle = '#e5322d'; g.fillRect(X0, gy + 32, X1 - X0, 8);
      // platforms
      for (let j = 0; j <= JUMPS; j++) {
        const x = px(j);
        g.fillStyle = '#b9a47c'; g.fillRect(x, gy, P, 40);
        g.fillStyle = '#e2d3ae'; g.fillRect(x, gy, P, 6);
        g.strokeStyle = '#6b5636'; g.lineWidth = 2; g.strokeRect(x + 1, gy + 1, P - 2, 38);
        const isCheck = j > 0 && j < JUMPS && j % st.cp === 0;
        if (j === 0 || isCheck || j === JUMPS) {
          const fx = x + P / 2, col = j === JUMPS ? '#ffb951' : j === 0 ? '#8b8fa8' : '#2ea3dc';
          g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(fx, gy); g.lineTo(fx, gy - 40); g.stroke();
          g.fillStyle = col; g.beginPath(); g.moveTo(fx, gy - 40); g.lineTo(fx + 16, gy - 34); g.lineTo(fx, gy - 28); g.fill();
        }
      }
      // lives
      const left = play.ev ? play.ev.left : (st.lives >= INF_LIVES ? Infinity : st.lives);
      txt(g, left === Infinity ? 'lives: ∞' : 'lives: ' + '♥'.repeat(Math.max(0, left)) + '♡'.repeat(Math.max(0, st.lives - Math.max(0, left))), 30, y0 + 44, BODY(15, 600), C.red);
      if (play.ev) txt(g, `run ${play.ev.run + 1} of ${RUNS}`, 1010, y0 + 44, BODY(15, 600), C.muted, 'right');
      // the ghost
      const stand = j => px(j) + P / 2, gr = gy - 11;
      let x = stand(0), y = gr, a = 1;
      const e = play.ev, k = play.k;
      if (e && e.kind === 'jump') {
        if (e.ok) { x = lerp(stand(e.j), stand(e.j + 1), k); y = gr - 44 * 4 * k * (1 - k); }
        else {
          const gx = px(e.j) + P + G / 2;
          if (k < .55) { const q = k / .55; x = lerp(stand(e.j), gx, q); y = gr - 30 * 4 * q * (1 - q); }
          else { const q = (k - .55) / .45; x = gx; y = gr + q * 50; a = 1 - q; }
        }
      } else if (e) { x = stand(e.j); }
      g.save(); g.beginPath(); g.rect(X0, y0 + 30, X1 - X0, gy + 40 - y0 - 30); g.clip();
      T.player(x, y, 0, .55, a, gh.col);
      g.restore();
      if (e && e.kind === 'end') T.label(e.clear ? 'CLEAR' : 'GAME OVER', x, gr - 34, 'center', e.clear ? '#1a8a4c' : C.red, 15);
    }

    // which event a ghost is on at playback time pt
    function playAt(sim, pt) {
      const n = sim.ev.length, endW = 5, total = sim.ev.reduce((a, e) => a + (e.kind === 'end' ? endW : 1), 0);
      const step = clamp(14 / total, .035, .3), u = (pt / step) % total;
      let acc = 0;
      for (const e of sim.ev) { const w = e.kind === 'end' ? endW : 1; if (u < acc + w) return { ev: e, k: (u - acc) / w }; acc += w; }
      return { ev: sim.ev[n - 1], k: 1 };
    }

    function render() {
      let cap = '', pt = st.t;
      if (st.tour) {
        let seg = TOUR[0]; TOUR.forEach(x => { if (st.t >= x[0]) seg = x; });
        if (st.gap !== seg[1].gap || st.lives !== seg[1].lives || st.cp !== seg[1].cp) { Object.assign(st, seg[1]); sync(); }
        cap = seg[2]; pt = st.t - seg[0];
      }
      const key = [st.gap, st.lives, st.cp].join();
      if (key !== st.key) { st.key = key; st.sims = GHOSTS.map((_, i) => simulate(i, st.gap, st.lives, st.cp)); stats(); }
      T.use(g); panel(g);
      st.sims.forEach((sim, i) => lane(i, sim, 12 + i * 160, playAt(sim, pt)));
      // the arithmetic under the dials
      const y = 506;
      g.fillStyle = 'rgba(21,32,68,.06)'; g.beginPath(); g.roundRect(20, y - 16, 1000, 84, 10); g.fill();
      txt(g, `One section = ${st.cp} jump${st.cp > 1 ? 's' : ''} in a row without a miss:`, 36, y + 4, BODY(16, 600));
      st.sims.forEach((sim, i) => txt(g, `${GHOSTS[i].name} ${pct(Math.pow(sim.p, st.cp))}`, 470 + i * 180, y + 4, HEAD(16), GHOSTS[i].col));
      txt(g, `Intensity sets one jump’s odds, required successes raise them to the power ${st.cp}, fault tolerance (${st.lives >= INF_LIVES ? 'unlimited lives' : st.lives + (st.lives > 1 ? ' lives' : ' life')}) sets how many tries each run gets.`, 36, y + 36, BODY(15), C.muted);
      if (cap) T.label(cap, W / 2, 486 - 4, 'center', C.navy, 15);
      $(s, '.dl-gv').textContent = st.gap + ' tiles';
      $(s, '.dl-lv').textContent = st.lives >= INF_LIVES ? '∞' : st.lives;
      $(s, '.dl-cv').textContent = st.cp >= JUMPS ? '12 (none)' : st.cp;
    }
    function stats() {
      const sm = st.sims;
      say($(s, '.dl-stats'), sm.map((x, i) => `<div class="${['', 'g', ''][i]}" style="border-left-color:${GHOSTS[i].col}"><b>${x.clears}/${RUNS}</b><span>${GHOSTS[i].name} clears · ${perClear(x.clears)} runs per clear</span></div>`).join(''));
      const [n, , e] = sm.map(x => x.clears);
      say($(s, '.dl-out'), st.lives >= INF_LIVES ? `Unlimited lives: everyone clears, so difficulty moves into effort. The Newcomer needs ${Math.round(sm[0].jumpsPerRun)} jumps a run, the Expert ${Math.round(sm[2].jumpsPerRun)}.`
        : n >= 18 ? 'Even the Newcomer clears almost every run: a test sized for everyone, which reads as relaxed to the Expert.'
        : e <= 6 ? 'Even the Expert clears few runs: this is a test for players who want to grind. Turn a dial back and see which one lets the most players through.'
        : `Expert ${e}/${RUNS}, Newcomer ${n}/${RUNS}. Same corridor, three dials: each one pushes on a different part of the curve, and none of them is right or wrong on its own.`);
    }
    apis.dials = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });

  /* ---------- 2: Savage Beastfly ---------- */
  function fight(gi, weapon, masks, n) {
    const r = rng(hash(gi, weapon === 'spear' ? 2 : 1, masks, n, 81)), dmg = BEAST[weapon], ev = [];
    let hp = BEAST.hp, m = masks, hits = 0;
    while (hp > 0 && m > 0 && ev.length < 600) {
      const hit = r() < BEAST.hit[gi], beast = r() < BEAST.qBeast[gi], summon = !beast && r() < BEAST.qSummon[gi];
      if (hit) { hp = Math.max(0, hp - dmg); hits++; }
      const hurt = hp > 0 ? (beast ? BEAST.beastDmg : summon ? BEAST.summonDmg : 0) : 0;
      m = Math.max(0, m - hurt);
      ev.push({ hit, hurt, hp, m, hits });
    }
    return { ev, clear: hp <= 0 };
  }
  function series(gi, weapon, masks) { const f = []; for (let n = 0; n < RUNS; n++) f.push(fight(gi, weapon, masks, n)); return { f, clears: f.filter(x => x.clear).length }; }

  function hornet(g, x, y, s, flash) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = flash ? '#fff' : '#b3242a'; g.beginPath(); g.moveTo(0, -30); g.lineTo(20, 22); g.lineTo(-20, 22); g.closePath(); g.fill();
    g.fillStyle = '#f3efe6'; g.beginPath(); g.ellipse(0, -36, 12, 14, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(-8, -46); g.lineTo(-12, -66); g.lineTo(-3, -48); g.fill(); g.beginPath(); g.moveTo(8, -46); g.lineTo(12, -66); g.lineTo(3, -48); g.fill();
    g.fillStyle = '#152044'; g.beginPath(); g.ellipse(-5, -35, 3, 5, 0, 0, Math.PI * 2); g.ellipse(5, -35, 3, 5, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#d9dde8'; g.lineWidth = 3; g.beginPath(); g.moveTo(14, -6); g.lineTo(52, -14); g.stroke();
    g.restore();
  }
  function beastfly(g, x, y, s, t, flash) {
    g.save(); g.translate(x, y); g.scale(s, s);
    const fl = Math.sin(t * 40) * .5 + .5;
    g.fillStyle = 'rgba(200,220,255,.45)'; g.strokeStyle = 'rgba(220,235,255,.8)'; g.lineWidth = 2;
    [-1, 1].forEach(sg => { g.beginPath(); g.ellipse(sg * 18, -46 - fl * 8, 30, 12 + fl * 8, sg * -.6, 0, Math.PI * 2); g.fill(); g.stroke(); });
    g.fillStyle = flash ? '#a86a52' : '#5c3a2e'; g.beginPath(); g.ellipse(0, 0, 62, 44, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = flash ? '#c98a6a' : '#7a4a36'; g.beginPath(); g.ellipse(10, 8, 44, 26, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#3a221a'; g.beginPath(); g.moveTo(-52, -14); g.lineTo(-104, -4); g.lineTo(-54, 10); g.closePath(); g.fill();
    g.fillStyle = '#ffb951'; g.beginPath(); g.arc(-34, -12, 7, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#152044'; g.beginPath(); g.arc(-36, -12, 3, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  function maskIcon(g, x, y, full) {
    g.fillStyle = full ? '#f3efe6' : 'rgba(243,239,230,.18)'; g.strokeStyle = full ? '#fff' : 'rgba(243,239,230,.4)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x - 10, y - 12); g.quadraticCurveTo(x, y - 18, x + 10, y - 12); g.lineTo(x + 8, y + 8); g.quadraticCurveTo(x, y + 14, x - 8, y + 8); g.closePath(); g.fill(); g.stroke();
    if (full) { g.fillStyle = '#152044'; g.beginPath(); g.ellipse(x - 4, y - 2, 2.2, 4, 0, 0, Math.PI * 2); g.ellipse(x + 4, y - 2, 2.2, 4, 0, 0, Math.PI * 2); g.fill(); }
  }

  canvasDemo('beast', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, wpn: 'needle', gh: 1, masks: BEAST.masks, key: '', data: null };
    const tourBtn = $(s, '.bf-tour'), mIn = $(s, '.bf-masks');
    const free = () => { st.tour = false; tourBtn.classList.remove('on'); };
    $$(s, '.bf-wpn .btn').forEach(b => b.onclick = () => { free(); st.wpn = b.dataset.w; st.t = 0; });
    $$(s, '.bf-gh .btn').forEach(b => b.onclick = () => { free(); st.gh = +b.dataset.g; st.t = 0; });
    mIn.oninput = () => { free(); st.masks = +mIn.value; st.t = 0; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.gh = 1; st.masks = BEAST.masks; mIn.value = st.masks; tourBtn.classList.add('on'); };
    const DUR = 16, BEAT = .045, ENDW = 1.1;

    function render() {
      let pt = st.t;
      if (st.tour) { st.wpn = st.t < 8 ? 'needle' : 'spear'; pt = st.t % 8; }
      $$(s, '.bf-wpn .btn').forEach(b => b.classList.toggle('on', b.dataset.w === st.wpn));
      $$(s, '.bf-gh .btn').forEach(b => b.classList.toggle('on', +b.dataset.g === st.gh));
      const key = [st.masks].join();
      if (key !== st.key) { st.key = key; st.data = GHOSTS.map((_, i) => ({ needle: series(i, 'needle', st.masks), spear: series(i, 'spear', st.masks) })); }
      const need = Math.ceil(BEAST.hp / BEAST[st.wpn]);
      // playback: fight after fight of the chosen ghost
      const fights = st.data[st.gh][st.wpn].f;
      let u = pt, fi = 0, e = null, k = 0, ended = false;
      for (let n = 0; n < 200; n++) {
        const f = fights[fi % RUNS], len = f.ev.length * BEAT;
        if (u < len) { const b = Math.floor(u / BEAT); e = f.ev[b]; k = (u - b * BEAT) / BEAT; break; }
        if (u < len + ENDW) { e = f.ev[f.ev.length - 1]; ended = true; k = (u - len) / ENDW; break; }
        u -= len + ENDW; fi++;
      }
      const f = fights[fi % RUNS];
      T.use(g); panel(g);
      // arena
      const AH = 318;
      const grd = g.createLinearGradient(0, 0, 0, AH); grd.addColorStop(0, '#1b2350'); grd.addColorStop(1, '#3b2f4f');
      g.fillStyle = grd; g.beginPath(); g.roundRect(14, 14, W - 28, AH, 12); g.fill();
      g.fillStyle = '#2a1f2e'; g.fillRect(14, AH - 30, W - 28, 44 - 12);
      // boss HP with one notch per required hit
      const hpX = 300, hpW = 700, hpY = 40;
      txt(g, `Savage Beastfly · ${BEAST.hp} HP`, 34, hpY, HEAD(16), '#fffaf0');
      g.fillStyle = '#4a1414'; g.fillRect(hpX, hpY - 9, hpW, 18);
      g.fillStyle = '#e5322d'; g.fillRect(hpX, hpY - 9, hpW * (e ? e.hp : BEAST.hp) / BEAST.hp, 18);
      g.fillStyle = 'rgba(21,32,68,.7)'; for (let i = 1; i < need; i++) g.fillRect(hpX + hpW * i / need - .5, hpY - 9, 1, 18);
      txt(g, `${need} hits needed at ${BEAST[st.wpn]} damage`, hpX + hpW, hpY + 24, BODY(15, 600), '#ffd98a', 'right');
      // masks
      for (let i = 0; i < st.masks; i++) maskIcon(g, 44 + i * 28, 84, e ? i < e.m : true);
      txt(g, `Hornet · ${GHOSTS[st.gh].name}`, 44 + st.masks * 28 + 6, 84, BODY(15, 600), '#fffaf0');
      // fighters
      const hitA = e && e.hit && !ended ? Math.sin(Math.PI * k) : 0, hurt = e && e.hurt && !ended ? e.hurt : 0;
      const bx = 690 - (hurt === 2 ? Math.sin(Math.PI * k) * 160 : 0), by = 190 + Math.sin(st.t * 3) * 10;
      const hx = 330 + hitA * 120, hy = AH - 32;
      beastfly(g, bx, by, 1, st.t, hitA > .5);
      // summons circle the arena
      for (let i = 0; i < 2; i++) {
        const a = st.t * 1.6 + i * Math.PI, sx = 520 + Math.cos(a) * 260, sy = 150 + Math.sin(a * 1.3) * 50;
        const dart = hurt === 1 && i === 0 ? Math.sin(Math.PI * k) : 0;
        const fx = lerp(sx, hx, dart), fy = lerp(sy, hy - 30, dart);
        g.fillStyle = '#6b4a3a'; g.beginPath(); g.ellipse(fx, fy, 14, 10, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(220,235,255,.6)'; g.beginPath(); g.ellipse(fx, fy - 10, 10, 5 + 3 * Math.sin(st.t * 50), 0, 0, Math.PI * 2); g.fill();
      }
      hornet(g, hx, hy, 1.15, hurt > 0 && k < .6);
      if (hitA > .2) { g.strokeStyle = 'rgba(255,255,255,' + hitA + ')'; g.lineWidth = 4; g.beginPath(); g.arc(hx + 60, hy - 30, 34, -1.2, .6); g.stroke(); }
      if (hurt && k < .8) T.popText(`−${hurt} mask${hurt > 1 ? 's' : ''}`, hx, hy - 110 - k * 20, '#ff8a80', 1 - k);
      txt(g, `fight ${fi % RUNS + 1} of ${RUNS} · hits landed ${e ? e.hits : 0}/${need}`, 34, AH - 8, BODY(15, 600), '#fffaf0');
      if (ended) T.label(f.clear ? 'BEASTFLY DEFEATED' : 'HORNET FALLS', W / 2, 140, 'center', f.clear ? '#1a8a4c' : C.red, 22);

      // the table: three ghosts x two weapons, twenty fights each
      const ty = AH + 34;
      txt(g, 'Twenty fights per ghost', 34, ty, HEAD(16));
      [['needle', `Needle · ${Math.ceil(BEAST.hp / BEAST.needle)} hits`], ['spear', `Silk Spear · ${Math.ceil(BEAST.hp / BEAST.spear)} hits`]].forEach(([w, lab], c) => {
        const x = 250 + c * 390, on = w === st.wpn;
        if (on) { g.fillStyle = 'rgba(255,185,81,.18)'; g.beginPath(); g.roundRect(x - 12, ty - 18, 382, 196, 10); g.fill(); }
        txt(g, lab, x, ty, HEAD(15), on ? C.ink : C.muted);
        GHOSTS.forEach((gh, i) => {
          const sr = st.data[i][w], y = ty + 40 + i * 50;
          for (let r = 0; r < RUNS; r++) {
            g.beginPath(); g.arc(x + 6 + r * 13, y, 5, 0, Math.PI * 2); g.fillStyle = sr.f[r].clear ? '#2fae63' : '#e5322d';
            g.globalAlpha = on && i === st.gh && r === fi % RUNS ? 1 : .8; g.fill(); g.globalAlpha = 1;
            if (on && i === st.gh && r === fi % RUNS) { g.strokeStyle = C.navy; g.lineWidth = 2.5; g.beginPath(); g.arc(x + 6 + r * 13, y, 8, 0, Math.PI * 2); g.stroke(); }
          }
          txt(g, `${pct(sr.clears / RUNS)} · ${perClear(sr.clears)} tries`, x + 266, y, BODY(15, 600), C.ink);
        });
      });
      GHOSTS.forEach((gh, i) => txt(g, gh.name, 34, ty + 40 + i * 50, HEAD(16), gh.col));
      $(s, '.bf-mv').textContent = st.masks;
      const sk = [st.wpn, st.gh, st.masks].join(); if (sk === st.sk) return; st.sk = sk;
      const cur = st.data[st.gh][st.wpn], other = st.data[st.gh][st.wpn === 'needle' ? 'spear' : 'needle'];
      say($(s, '.bf-stats'), `<div class="y"><b>${need}</b><span>required successes: ${BEAST.hp} HP ÷ ${BEAST[st.wpn]} damage</span></div><div class="r"><b>${st.masks}</b><span>masks; the Beastfly takes ${BEAST.beastDmg}, a summon takes ${BEAST.summonDmg}</span></div><div class="g"><b>${cur.clears}/${RUNS}</b><span>${GHOSTS[st.gh].name} clears · ${perClear(cur.clears)} tries per clear</span></div>`);
      say($(s, '.bf-out'), st.wpn === 'needle'
        ? `With the needle the ${GHOSTS[st.gh].name} must land ${need} hits and survive every exchange in between: ${cur.clears}/${RUNS} clears. Switch to Silk Spear: the same skill, a third as many successes, ${other.clears}/${RUNS}.`
        : `Silk Spear cuts the required successes to ${need}. Nothing about the ${GHOSTS[st.gh].name}’s hands changed, yet clears go from ${other.clears} to ${cur.clears} of ${RUNS}.`);
    }
    apis.beast = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });

  window.__seek = (t, w) => apis[w].seek(t);
  window.__dur = w => apis[w].dur();
})();
