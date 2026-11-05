/* Hard check vs soft check (DGMS Module 2, Audience Demographics, deck slides 132-135: method 3, testing).
   "Hard checks: situations that FORCE you to use a specific mechanic. Soft checks: situations that are MUCH more
   efficient if you use the right tool."
   zerg: StarCraft's campaign Zergling clusters (slide 135). Raynor alone can kite the pack (possible, slow); a few
         Firebats burn the whole cluster (fast). Both arenas run on one clock, each with its own timer.
   ice:  God of War (slides 133-134). The freeze mechanic is a hard check; an ice-coated enemy still takes a sliver
         of damage from the frost axe, which makes it technically a soft check but, past the player's patience,
         effectively a hard check. A slider sets how much damage the wrong tool still deals.
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
  const ttk = (dps) => dps > 0 ? N.enemy.hp / dps : Infinity;
  function verdict(pct, pat) {
    const wrong = ttk(N.axeDps * pct / 100);
    if (pct === 0) return { k: 'hard', name: 'Hard check: forced', col: C.red };
    if (wrong > pat) return { k: 'eff', name: 'Effectively a hard check', col: '#b8560f' };
    return { k: 'soft', name: 'Soft check', col: C.good };
  }
  function fight(g, x, y, w, label, sub, dps, t, col, wrong, iceCol) {
    const life = ttk(dps), hp = dps > 0 ? Math.max(0, N.enemy.hp - dps * t) : N.enemy.hp, done = hp <= 0;
    txt(g, label, x, y, '800 17px Montserrat, Jost, sans-serif'); txt(g, sub, x, y + 22, '600 14px Jost, sans-serif', C.muted);
    const ky = y + 86, ex = x + w - 90, kx = x + 70;
    T.floor(x, y + 40, w, 96);
    // Kratos swings every 0.5 s (sim)
    const sw = (t * 2) % 1, hit = !done && sw < .25;
    T.player(kx + (hit ? 18 : 0), ky, 0, 1.1, 1, '#c9524a');
    if (hit) T.tracer(kx + 40, ky - 10, ex - 30, ky + 6, 1 - sw * 4, col, 6);
    // the enemy, with its ice coat
    if (!done) {
      T.foe(ex, ky, 30, Math.PI, '#7d8fb0', { edge: '#41557a', hp, hpMax: N.enemy.hp });
      g.strokeStyle = iceCol; g.lineWidth = 7; g.beginPath(); g.arc(ex, ky, 37, 0, TAU); g.stroke();
      if (hit) { if (wrong && dps === 0) T.popText('0', ex, ky - 58, C.muted, 1 - sw * 4); else if (wrong) T.popText('−' + Math.max(1, Math.round(dps / 2)), ex, ky - 58, '#5d618c', 1 - sw * 4); else T.flash(ex, ky, 46, .8 - sw * 3); }
    } else { T.poof(ex, ky, Math.min(.79, (t - life) * .4), 34); }
    return { hp, done, life };
  }
  function bars(g, x, y, w, rows, pat, t) {
    const MAX = 120, BW = w - 300, sx = v => x + 210 + BW * Math.min(v, MAX) / MAX;
    txt(g, 'Time to kill', x, y, '800 17px Montserrat, Jost, sans-serif');
    rows.forEach(([label, v, col], i) => {
      const yy = y + 28 + i * 40;
      txt(g, label, x, yy + 10, '600 15px Jost, sans-serif', C.ink);
      g.fillStyle = '#e8dcc0'; g.beginPath(); g.roundRect(x + 210, yy, BW, 20, 5); g.fill();
      const shown = Math.min(v, t);
      g.fillStyle = col; g.beginPath(); g.roundRect(x + 210, yy, Math.max(2, sx(shown) - x - 210), 20, 5); g.fill();
      txt(g, v === Infinity ? 'never' : fmt(v), x + w, yy + 10, '700 15px Jost, sans-serif', col, 'right');
      if (v > MAX) { g.fillStyle = col; g.beginPath(); g.moveTo(sx(MAX) + 2, yy - 2); g.lineTo(sx(MAX) + 12, yy + 10); g.lineTo(sx(MAX) + 2, yy + 22); g.fill(); }
    });
    const px = sx(pat); g.setLineDash([6, 5]); g.strokeStyle = C.navy; g.lineWidth = 2.5; g.beginPath(); g.moveTo(px, y + 18); g.lineTo(px, y + 110); g.stroke(); g.setLineDash([]);
    T.label(`player patience ≈ ${pat} s`, px, y + 4, 'center', C.navy, 13);
  }
  canvasDemo('ice', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, pct: 4, pat: N.patience, runT: 0, key: '' };
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
      const v = verdict(pct, pat), axe = N.axeDps * pct / 100;
      const a = fight(g, 30, 30, 470, 'Leviathan Axe (frost)', `the wrong tool: ${pct}% damage through the ice`, axe, t, '#57b6ff', true, '#bfe8ff');
      const b = fight(g, 540, 30, 470, 'Blades of Chaos (fire)', 'the right tool: melts the coat', N.bladesDps, t, '#ff7a2a', false, t < 1 ? '#bfe8ff' : 'rgba(191,232,255,0)');
      txt(g, 'sim clock ' + fmt(t), 1010, 30, '600 13px Jost, sans-serif', C.muted, 'right');
      bars(g, 30, 214, 980, [['Leviathan Axe', a.life, '#57b6ff'], ['Blades of Chaos', b.life, '#ff7a2a']], pat, t);
      // the verdict
      g.fillStyle = v.col + '1c'; g.strokeStyle = v.col; g.lineWidth = 3; g.beginPath(); g.roundRect(30, 360, 980, 200, 14); g.fill(); g.stroke();
      txt(g, v.name, 54, 398, '800 28px Montserrat, Jost, sans-serif', v.col);
      const lines = v.k === 'hard' ? ['Only the right tool works. Like God of War’s freeze puzzles, the game forces', 'the mechanic: the player cannot move on without it.']
        : v.k === 'eff' ? [`The axe technically does damage, but ${fmt(a.life)} is far past a player’s patience.`, 'In practice the player must switch weapons: a soft check on paper, a hard check in play.']
        : [`The axe works (${fmt(a.life)}); the blades are ${(a.life / b.life).toFixed(1)}× faster. Nobody is forced, but the`, 'efficient answer is obvious enough that players learn it.'];
      lines.forEach((l, i) => txt(g, l, 54, 446 + i * 30, '500 19px Jost, sans-serif', C.ink));
      // a scale from hard to soft
      const sx0 = 54, sx1 = 986, yy = 512;
      const grd = g.createLinearGradient(sx0, 0, sx1, 0); grd.addColorStop(0, C.red); grd.addColorStop(.25, '#e0a92d'); grd.addColorStop(1, C.good);
      g.fillStyle = grd; g.beginPath(); g.roundRect(sx0, yy, sx1 - sx0, 10, 5); g.fill();
      const mx = lerp(sx0, sx1, pct / 100); g.fillStyle = C.navy; g.beginPath(); g.arc(mx, yy + 5, 9, 0, TAU); g.fill();
      txt(g, 'forced', sx0, yy + 26, '600 13px Jost, sans-serif', C.muted); txt(g, 'much more efficient', sx1, yy + 26, '600 13px Jost, sans-serif', C.muted, 'right');
      const key = [pct, pat].join(); if (key === st.key) return; st.key = key;
      say($(s, '.ic-stats'), `<div class="${v.k === 'soft' ? 'g' : 'r'}"><b>${a.life === Infinity ? 'never' : fmt(a.life)}</b><span>to kill with the axe</span></div><div class="g"><b>${fmt(b.life)}</b><span>to kill with the blades</span></div><div class="y"><b>${a.life === Infinity ? '∞' : (a.life / b.life).toFixed(1) + '×'}</b><span>how much faster the right tool is</span></div>`);
      say($(s, '.ic-out'), v.k === 'soft' ? 'A soft check teaches without forcing: the wrong tool is slower, not useless.' : v.k === 'eff' ? 'Below the patience line the difference stops being “more efficient” and becomes “forced”. Decide which one you meant.' : 'A hard check guarantees the player has learned the mechanic before moving on.');
    }
    apis.ice = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => {
      dt = Math.max(0, Math.min(dt, .1));
      if (!st.held) { if (st.tour) { st.t += dt; if (st.t > DUR) st.t = 0; } else { st.runT += dt; if (st.runT * N.iceRate > Math.min(150, ttk(N.axeDps * st.pct / 100)) + 12) st.runT = 0; } }
      render();
    };
  });

  window.__seek = (t, w) => apis[w].seek(t);
  window.__dur = w => apis[w].dur();
})();
