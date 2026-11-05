/* Hammer Time (Module 8, Part 5, slides 204-216 and 236-241).
   Slide 1: an enemy with shield and health blocks, a regular swing and a charged swing that breaks any shield. Two lanes
   race "spam regular" against "charged, then regular", and a margin bar marks the 12.5% and 30% adoption thresholds from
   the notes on 211. v1-v5 load the deck's steps; "Double the shield" is 212's bracketing move.
   Slide 2: the payoff card, "You just designed dispel" (slide 214).
   Slide 3: binary plus analog: a build-up stun bar on the same enemy beside an instant binary stun (slides 238-239).
   Every frame is drawn from (state, t) only, so __seek(t, which) is deterministic. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585;
  const GL = {}; Object.entries(window.HT_GLYPHS).forEach(([k, d]) => { GL[k] = new Path2D(d); });
  const IMG = {}; ['spell_holy_dispelmagic', 'spell_holy_powerwordshield'].forEach(n => { const i = new Image(); i.src = `img/${n}.jpg`; IMG[n] = i; });
  const icon = (g, n, x, y, s, a = 1) => { const i = IMG[n]; if (i && i.complete && i.naturalWidth) { const a0 = g.globalAlpha; g.globalAlpha = a0 * a; g.drawImage(i, x, y, s, s); g.globalAlpha = a0; } };
  const COL = { sh: '#57b6ff', shDk: '#1f6fae', hp: C.red, reg: '#7f9fd9', chg: '#f0a83a' };

  function glyph(g, k, x, y, s, col, rot = 0) { g.save(); g.translate(x, y); g.rotate(rot); g.translate(-s / 2, -s / 2); g.scale(s / 512, s / 512); g.fillStyle = col; g.fill(GL[k]); g.restore(); }
  function txt(g, s, x, y, o = {}) {
    g.font = `${o.w || 600} ${o.size || 14}px ${o.disp ? 'Montserrat, Jost' : 'Jost'}, sans-serif`;
    g.fillStyle = o.col || C.ink; g.textAlign = o.al || 'left'; g.textBaseline = o.bl || 'alphabetic'; g.fillText(s, x, y);
  }
  function panel(g, x, y, w, h, col = '#efe6d2') { g.fillStyle = col; g.beginPath(); g.roundRect(x, y, w, h, 12); g.fill(); }
  function bg(g) { T.use(g); g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.88)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); }
  function dashV(g, x, y0, y1, col, w = 2) { g.strokeStyle = col; g.lineWidth = w; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke(); g.setLineDash([]); }
  // the Hammer Time enemy: a row of shield blocks over a row of health blocks
  function blocks(g, x, y, sh, hp, sh0, hp0, s = 26, gap = 4, perRow = 12) {
    const row = (n, n0, col, edge, yy) => { for (let i = 0; i < n0; i++) { const bx = x + (i % perRow) * (s + gap), by = yy + Math.floor(i / perRow) * (s + gap); g.fillStyle = i < n ? col : 'rgba(93,97,140,.12)'; g.strokeStyle = i < n ? edge : 'rgba(93,97,140,.3)'; g.lineWidth = 2; g.beginPath(); g.roundRect(bx, by, s, s, 5); g.fill(); g.stroke(); } };
    const shRows = Math.max(1, Math.ceil(sh0 / perRow));
    if (sh0 > 0) row(sh, sh0, COL.sh, COL.shDk, y);
    row(hp, hp0, COL.hp, C.redDk, y + (sh0 > 0 ? shRows * (s + gap) + 6 : 0));
  }
  function bindSliders(s, st, onManual) {
    const ins = $$(s, 'input[type=range][data-k]');
    ins.forEach(i => i.addEventListener('input', () => { onManual(); st[i.dataset.k] = +i.value; }));
    return () => ins.forEach(i => { const k = i.dataset.k; if (+i.value !== st[k]) i.value = st[k]; const b = $(s, `[data-v="${k}"]`); if (b) b.textContent = st[k]; });
  }
  const scenes = {};

  /* ================= 1. Hammer Time ================= */
  const BASE = { hp: 3, rd: 1, rt: 1, cd: 1, br: true };
  const VERS = [
    { sh: 1, ct: 1, say: 'v1. A one-hit shield, and both swings cost 1 time. The charged swing does exactly what a regular swing does: it is pointless.' },
    { sh: 1, ct: 2, say: 'v2. Make the charged swing cost 2 time. Now it is slower at the same job: completely worthless.' },
    { sh: 2, ct: 2, say: 'v3. Change one variable: the shield takes 2 hits. Now the two plans are exactly equal.' },
    { sh: 3, ct: 2, say: 'v4. A 3-hit shield. The charged swing finally wins, 2 time against 3. But the margin sits under 30%, so few players will try it.' },
    { sh: 6, ct: 2, say: 'v5. Players still ignore it. Do not add one more hit: double it. Now the margin clears 30% with room to spare, and you can tune back down.' },
  ].map(v => ({ ...BASE, ...v }));
  function sim(P, charged) {
    let sh = P.sh, hp = P.hp, t = 0; const out = [];
    for (let k = 0; k < 80 && hp > 0; k++) {
      const c = charged && k === 0, d = c ? P.cd : P.rd, dur = c ? P.ct : P.rt;
      if (sh > 0) { if (c && P.br) sh = 0; else { const a = Math.min(sh, d); sh -= a; hp -= d - a; } } else hp -= d;
      out.push({ c, t0: t, t1: t + dur, sh, hp: Math.max(0, hp) }); t += dur;
    }
    return { swings: out, total: t };
  }
  const margin = (a, b) => a.total / b.total - 1;
  function verdict(m) {
    if (m < -1e-9) return [`Charged plan is ${Math.round(-m / (1 + m) * 100)}% slower. Nobody uses it.`, C.redDk];
    if (m < 1e-9) return ['Exactly equal. Nothing to gain by switching.', C.muted];
    if (m < .125) return ['Faster, but under 12.5%. Players drift back to the standard swing.', C.goldInk];
    if (m < .3) return ['Between 12.5% and 30%: players who try it keep it, but few try it.', C.goldInk];
    return ['Over 30%: players try it, and keep it.', C.good];
  }
  function drawHammer(g, st, rt, verIdx) {
    bg(g);
    const A = sim(st, false), B = sim(st, true), m = margin(A, B);
    // enemy card
    panel(g, 12, 12, 400, 166);
    txt(g, 'Enemy', 28, 38, { w: 800, size: 16, disp: 1 });
    txt(g, `${st.sh} shield · ${st.hp} health`, 396, 38, { size: 13, col: C.muted, al: 'right' });
    const bs = st.sh > 12 ? 22 : 26; blocks(g, 28, 54, st.sh, st.hp, st.sh, st.hp, bs, 4, 12);
    // swing cards
    const cards = [['Regular swing', st.rd, st.rt, false, COL.reg], ['Charged swing', st.cd, st.ct, st.br, COL.chg]];
    cards.forEach(([n, d, tt, br, col], i) => {
      const x = 424 + i * 302; panel(g, x, 12, 290, 166);
      g.fillStyle = col; g.beginPath(); g.arc(x + 44, 70, 28, 0, TAU); g.fill();
      glyph(g, 'hammer', x + 44, 70, 38, '#fff');
      txt(g, n, x + 84, 52, { w: 800, size: 16, disp: 1 });
      txt(g, `${d} damage`, x + 84, 76, { size: 15 }); txt(g, `${tt} time`, x + 84, 98, { size: 15 });
      txt(g, i === 0 ? 'chips one block per damage' : br ? 'breaks any shield in one hit' : 'chips like a regular swing', x + 20, 140, { size: 13, col: br ? COL.shDk : C.muted, w: br ? 700 : 600 });
      if (br) glyph(g, 'shield', x + 252, 64, 34, COL.sh);
    });
    if (verIdx != null) { T.label(`v${verIdx + 1}`, 1004, 32, 'center', C.goldInk, 14); }
    // the race
    panel(g, 12, 190, W - 24, 234);
    txt(g, 'Race: total time to kill', 28, 216, { w: 800, size: 16, disp: 1 });
    const tMax = Math.max(A.total, B.total, 1), x0 = 250, x1 = W - 40, X = t => x0 + (x1 - x0) * t / tMax;
    const step = tMax > 24 ? 4 : tMax > 12 ? 2 : 1;
    g.font = '500 12px Jost, sans-serif'; g.textAlign = 'center';
    for (let t = 0; t <= tMax; t += step) { g.fillStyle = 'rgba(93,97,140,.22)'; g.fillRect(X(t), 228, 1, 172); g.fillStyle = C.muted; g.fillText(t, X(t), 414); }
    [[A, 'Spam regular', 270], [B, 'Charged, then regular', 356]].forEach(([R, name, y]) => {
      txt(g, name, 28, y - 14, { w: 700, size: 15 });
      // state at the race time
      let sh = st.sh, hp = st.hp; R.swings.forEach(s => { if (s.t1 <= rt + 1e-9) { sh = s.sh; hp = s.hp; } });
      blocks(g, 28, y - 2, sh, hp, Math.min(st.sh, 12), Math.min(st.hp, 12), 12, 3, 12);
      R.swings.forEach(s => {
        const xa = X(s.t0), xb = X(s.t1), done = s.t1 <= rt + 1e-9, live = !done && s.t0 <= rt;
        g.globalAlpha = done ? 1 : live ? .75 : .3;
        g.fillStyle = s.c ? COL.chg : COL.reg; g.beginPath(); g.roundRect(xa + 1.5, y - 26, xb - xa - 3, 46, 7); g.fill();
        if (xb - xa > 22) glyph(g, 'hammer', (xa + xb) / 2, y - 3, Math.min(30, xb - xa - 8), '#fff', live ? -.5 + (rt - s.t0) / (s.t1 - s.t0) : 0);
        g.globalAlpha = 1;
        if (done && s.c && st.br && st.sh > 0) txt(g, 'break!', (xa + xb) / 2, y + 36, { size: 12, w: 800, col: COL.shDk, al: 'center' });
      });
      if (rt >= R.total - 1e-9) { const x = X(R.total); glyph(g, 'skull', x + 16, y - 3, 22, C.red); }
      txt(g, `${R.total} time`, x1 + 2, y - 34, { size: 13, w: 800, al: 'right', col: rt >= R.total - 1e-9 ? C.ink : 'rgba(38,44,106,.35)' });
    });
    if (rt < tMax) { const x = X(Math.max(0, rt)); g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 232); g.lineTo(x, 398); g.stroke(); }
    // margin bar
    const reveal = rt >= tMax - 1e-9;
    panel(g, 12, 436, W - 24, 137);
    txt(g, 'Charged plan margin', 28, 462, { w: 800, size: 16, disp: 1 });
    txt(g, '(regular time ÷ charged time) − 1', 228, 462, { size: 13, col: C.muted });
    const lo = -.5, hi = 1.2, mx0 = 60, mx1 = W - 60, MX = v => mx0 + (mx1 - mx0) * (clamp(v, lo, hi) - lo) / (hi - lo), by = 500;
    g.fillStyle = 'rgba(93,97,140,.15)'; g.fillRect(mx0, by, mx1 - mx0, 26);
    g.fillStyle = 'rgba(47,174,99,.12)'; g.fillRect(MX(.3), by, mx1 - MX(.3), 26);
    g.fillStyle = 'rgba(255,185,81,.18)'; g.fillRect(MX(.125), by, MX(.3) - MX(.125), 26);
    if (reveal) { g.fillStyle = m < -1e-9 ? C.red : m < .125 ? C.muted : m < .3 ? '#e0a92d' : C.p2; const xa = MX(0), xb = MX(m); g.fillRect(Math.min(xa, xb), by + 4, Math.max(3, Math.abs(xb - xa)), 18); }
    g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(MX(0), by - 4); g.lineTo(MX(0), by + 30); g.stroke();
    [[.125, '12.5%: players keep using it'], [.3, '30%: players try it']].forEach(([v, l], k) => { dashV(g, MX(v), by - 10, by + 36, C.goldInk); txt(g, l, MX(v) + (k ? 6 : -6), by - 14, { size: 12, w: 700, col: C.goldInk, al: k ? 'left' : 'right' }); });
    g.font = '500 11px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'center';
    [-.5, 0, .5, 1].forEach(v => g.fillText(`${v > 0 ? '+' : ''}${Math.round(v * 100)}%`, MX(v), by + 46));
    if (reveal) {
      const [vt, vc] = verdict(m);
      txt(g, `${m >= 0 ? '+' : ''}${Math.round(m * 1000) / 10}%`, MX(m) + (m > 1 ? -8 : 8), by + 18, { size: 14, w: 800, al: m > 1 ? 'right' : 'left', col: C.ink });
      txt(g, vt, W - 28, 462, { size: 14, w: 700, col: vc, al: 'right' });
    }
    return { A, B, m };
  }
  const SEG = 5, HAM_DUR = SEG * VERS.length;
  function hammerTour(st, t) {
    const k = Math.min(VERS.length - 1, Math.floor(t / SEG)), f = t - k * SEG; Object.assign(st, VERS[k]); st.ver = k;
    const tm = Math.max(sim(st, false).total, sim(st, true).total);
    return { rt: clamp((f - .5) / 3) * tm, k };
  }
  canvasDemo('hammer', (s, cv, g) => {
    const st = { ...VERS[3], ver: 3, tour: true, held: false, t: 0, t0: 0, key: '' };
    const tourBtn = $(s, '.ht-tour'), br = $(s, '.ht-br'), vers = $$(s, '.ht-ver .btn');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); } st.t0 = st.t; st.note = ''; };
    const sync = bindSliders(s, st, () => { manual(); st.ver = null; });
    br.onchange = () => { manual(); st.br = br.checked; st.ver = null; };
    vers.forEach(b => b.onclick = () => { manual(); Object.assign(st, VERS[+b.dataset.v]); st.ver = +b.dataset.v; });
    $(s, '.ht-double').onclick = () => { manual(); st.sh = Math.min(24, Math.max(1, st.sh * 2)); st.ver = null; st.note = `Doubled to ${st.sh} shield. `; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.held = false; tourBtn.classList.add('on'); };
    function info(R) {
      sync(); br.checked = st.br; vers.forEach(b => b.classList.toggle('on', +b.dataset.v === st.ver));
      const key = [st.ver, st.sh, st.hp, st.rd, st.rt, st.cd, st.ct, st.br, st.note].join(); if (key === st.key) return; st.key = key;
      if (st.ver != null) return say($(s, '.ht-out'), VERS[st.ver].say);
      const [vt] = verdict(R.m);
      say($(s, '.ht-out'), `${st.note || ''}Regular plan ${R.A.total} time, charged plan ${R.B.total}. ${vt} Change one variable at a time and watch the relationship.`);
    }
    scenes.hammer = { seek(t) { st.held = true; const { rt, k } = hammerTour(st, t); info(drawHammer(g, st, rt, k)); }, dur: () => HAM_DUR };
    return dt => {
      if (st.held) return;
      st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= HAM_DUR) st.t = 0; const { rt, k } = hammerTour(st, st.t); info(drawHammer(g, st, rt, k)); return; }
      const tm = Math.max(sim(st, false).total, sim(st, true).total), f = clamp((st.t - st.t0) / 2.4);
      info(drawHammer(g, st, f * tm, st.ver));
    };
  });

  /* ================= 2. You just designed dispel ================= */
  const DP_DUR = 14;
  function drawDispel(g, t) {
    bg(g);
    // left: Hammer Time
    panel(g, 12, 12, 500, 300);
    txt(g, 'In Hammer Time', 28, 40, { w: 800, size: 16, disp: 1 });
    const hit = clamp((t - 2) / .6), broke = t > 2.6;
    blocks(g, 40, 70, broke ? 0 : 6, 3, 6, 3, 34, 6, 6);
    const hx = lerp(420, 300, ease(hit)), hy = lerp(150, 100, ease(hit));
    g.fillStyle = COL.chg; g.beginPath(); g.arc(hx, hy, 34, 0, TAU); g.fill(); glyph(g, 'hammer', hx, hy, 44, '#fff', -.6 + hit * .9);
    if (broke) T.popText('break!', 160, 64, COL.shDk, clamp(1.4 - (t - 2.6)));
    txt(g, 'A charged swing that removes', 40, 248, { size: 15 });
    txt(g, 'the whole shield, whatever its size.', 40, 270, { size: 15 });
    // right: WoW
    panel(g, 528, 12, 500, 300);
    txt(g, 'In World of Warcraft', 544, 40, { w: 800, size: 16, disp: 1 });
    const ex = 900, ey = 150, cast = clamp((t - 5) / 1.5), gone = t > 6.7;
    T.player(640, ey, 0, 1.3, 1, '#d8d8e8');
    T.foe(ex, ey, 34, Math.PI, C.red, { mark: 'horns' });
    if (!gone) { T.bubble(ex, ey, 56, t, 1); icon(g, 'spell_holy_powerwordshield', ex + 30, ey - 82, 36); }
    else T.poof(ex, ey, t - 6.7, 60);
    if (cast > 0 && cast < 1) { const px = lerp(670, ex - 40, cast); g.fillStyle = 'rgba(255,240,170,.9)'; g.beginPath(); g.arc(px, ey, 10, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,220,120,.6)'; g.lineWidth = 6; g.beginPath(); g.moveTo(670, ey); g.lineTo(px, ey); g.stroke(); }
    icon(g, 'spell_holy_dispelmagic', 552, ey - 22, 44, t > 4.5 ? 1 : .45);
    if (t > 4.5 && t < 6.7) T.label('casting Dispel Magic', 640, ey - 52, 'center', C.ink, 13);
    if (gone) T.popText('shield removed', ex, ey - 70, COL.shDk, clamp(1.6 - (t - 6.7) * .5));
    txt(g, 'Dispel Magic removes a magic buff,', 544, 248, { size: 15 });
    txt(g, 'like Power Word: Shield, whatever its size.', 544, 270, { size: 15 });
    // mapping
    const a = clamp((t - 8) / .8);
    g.globalAlpha = a;
    panel(g, 12, 324, 640, 249);
    txt(g, 'The same design, renamed', 28, 352, { w: 800, size: 16, disp: 1 });
    [['Shield blocks', 'a magic buff, of any size'], ['Charged swing', 'Dispel Magic'], ['Breaks any shield', 'removes the whole buff'], ['Costs 2 time', 'a cast, mana and a global cooldown']].forEach(([l, r], i) => {
      const y = 392 + i * 44; txt(g, l, 28, y, { w: 700, size: 16 }); txt(g, '→', 250, y, { w: 800, size: 18, col: C.goldInk, al: 'center' }); txt(g, r, 280, y, { size: 16 });
    });
    g.globalAlpha = clamp((t - 9.5) / .8);
    panel(g, 664, 324, 364, 249, C.navy);
    icon(g, 'spell_holy_dispelmagic', 846 - 48, 352, 96);
    g.strokeStyle = C.gold; g.lineWidth = 3; g.strokeRect(846 - 48, 352, 96, 96);
    txt(g, 'You just', 846, 488, { w: 800, size: 26, disp: 1, col: '#fff', al: 'center' });
    txt(g, 'designed dispel.', 846, 522, { w: 800, size: 26, disp: 1, col: C.gold, al: 'center' });
    g.globalAlpha = 1;
  }
  canvasDemo('dispel', (s, cv, g) => {
    const st = { t: 0, held: false, tour: true, key: '' }, tourBtn = $(s, '.dp-tour');
    const LINES = [[0, 'Back to Hammer Time: a charged swing that breaks any shield.'], [4.5, 'Now a WoW priest faces a shielded enemy.'], [8, 'Every part of the made-up mechanic has a WoW name.'], [9.5, 'In the deck’s made-up game, “Break” was dispel all along.']];
    const info = t => { const l = LINES.filter(([a]) => t >= a).pop()[1]; if (l !== st.key) { st.key = l; say($(s, '.dp-out'), l); } };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.held = false; tourBtn.classList.add('on'); };
    scenes.dispel = { seek(t) { st.held = true; drawDispel(g, t); info(t); }, dur: () => DP_DUR };
    return dt => {
      if (st.held) return;
      st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= DP_DUR) st.t = 0; } else st.t = Math.min(st.t, DP_DUR - .01);
      drawDispel(g, st.t); info(st.t);
    };
  });

  /* ================= 3. Binary plus analog ================= */
  const ST0 = { th: 100, bu: 35, dc: 10 }, SIM_T = 12, HIT0 = .5, STUN = 1.5, DT = 1 / 60;
  function simStun(P) {
    // build-up: each breaking hit adds bu, the bar decays dc/s, at th the enemy is stunned and the bar resets
    const pts = [], stuns = [], hits = []; let v = 0, stunUntil = -1, nextHit = HIT0;
    for (let i = 0; i <= SIM_T / DT; i++) {
      const t = i * DT;
      if (t >= nextHit - 1e-9) { hits.push(t); nextHit += 1; if (t >= stunUntil) { v += P.bu; if (v >= P.th) { stuns.push([t, t + STUN]); stunUntil = t + STUN; v = 0; } } }
      else if (t >= stunUntil) v = Math.max(0, v - P.dc * DT);
      pts.push(v);
    }
    const bin = hits.map(h => [h, h + STUN]);
    const cover = ws => { let s = 0, end = 0; ws.forEach(([a, b]) => { b = Math.min(b, SIM_T); const a2 = Math.max(a, end); if (b > a2) s += b - a2; end = Math.max(end, b); }); return s / SIM_T; };
    return { pts, stuns, hits, bin, pB: cover(bin), pS: cover(stuns) };
  }
  function drawStun(g, P, R, t) {
    bg(g);
    const tt = clamp(t, 0, SIM_T), idx = Math.round(tt / DT), v = R.pts[Math.min(idx, R.pts.length - 1)];
    const inW = ws => ws.some(([a, b]) => tt >= a && tt < b);
    const lastHit = R.hits.filter(h => h <= tt).pop(), sinceHit = lastHit == null ? 9 : tt - lastHit;
    // two enemies
    [['Binary: every break stuns', true, 12], ['Build-up: every break fills a stun bar', false, 528]].forEach(([n, bin, x]) => {
      panel(g, x, 12, 500, 170);
      txt(g, n, x + 16, 38, { w: 800, size: 15, disp: 1 });
      const ex = x + 110, ey = 112, stunned = inW(bin ? R.bin : R.stuns);
      T.foe(ex, ey, 34, Math.PI + (stunned ? Math.sin(tt * 9) * .25 : 0), C.red, { mark: 'horns' });
      if (stunned) for (let k = 0; k < 3; k++) { const a = tt * 4 + k * TAU / 3; txt(g, '★', ex + Math.cos(a) * 34, ey - 44 + Math.sin(a) * 8, { size: 18, w: 800, col: C.gold, al: 'center', bl: 'middle' }); }
      if (sinceHit < .35) { const hx = ex + 60 - sinceHit * 40; glyph(g, 'hammer', hx, ey - 10, 40, COL.chg, -.8 + sinceHit * 3); }
      if (stunned) T.label('STUNNED', ex, ey + 50, 'center', C.redDk, 13);
      if (!bin) {
        const bx = x + 200, bw = 270, by = 92; g.fillStyle = 'rgba(93,97,140,.18)'; g.fillRect(bx, by, bw, 22);
        g.fillStyle = COL.chg; g.fillRect(bx, by, bw * clamp(v / P.th), 22); g.strokeStyle = C.navy; g.lineWidth = 2; g.strokeRect(bx, by, bw, 22);
        txt(g, `stun bar ${Math.round(v)} / ${P.th}`, bx, by - 8, { size: 13, w: 700 });
        txt(g, '“an HP value for this status condition”', bx, by + 44, { size: 13, col: C.muted });
      } else {
        txt(g, 'Each hit stuns for 1.5 s, and the', x + 200, 96, { size: 14 }); txt(g, 'next hit lands before it wears off.', x + 200, 118, { size: 14 });
      }
      txt(g, `stunned ${Math.round((bin ? R.pB : R.pS) * 100)}% of the fight`, x + 484, 166, { size: 13, w: 800, al: 'right', col: bin ? C.redDk : C.goldInk });
    });
    // timeline
    panel(g, 12, 194, W - 24, 379);
    txt(g, 'Over 12 seconds', 28, 222, { w: 800, size: 15, disp: 1 });
    const x0 = 150, x1 = W - 36, X = s => x0 + (x1 - x0) * s / SIM_T;
    g.font = '500 12px Jost, sans-serif'; g.textAlign = 'center';
    for (let s = 0; s <= SIM_T; s += 2) { g.fillStyle = 'rgba(93,97,140,.2)'; g.fillRect(X(s), 236, 1, 300); g.fillStyle = C.muted; g.fillText(s + ' s', X(s), 554); }
    R.hits.forEach(h => { const on = h <= tt; g.globalAlpha = on ? 1 : .25; glyph(g, 'hammer', X(h), 248, 16, COL.chg); g.globalAlpha = 1; });
    txt(g, 'hits', 28, 252, { size: 13, col: C.muted });
    // binary row
    const yb = 272; txt(g, 'Binary stun', 28, yb + 20, { size: 14, w: 700 });
    g.fillStyle = 'rgba(93,97,140,.12)'; g.fillRect(x0, yb, x1 - x0, 30);
    { let end = -1; g.fillStyle = 'rgba(229,50,45,.55)'; R.bin.forEach(([a, b]) => { const a2 = Math.max(a, end), e = Math.min(b, tt, SIM_T); if (e > a2) g.fillRect(X(a2), yb, X(e) - X(a2), 30); end = Math.max(end, b); }); }
    // build-up meter
    const y0 = 532, y1 = 336, vmax = Math.max(P.th * 1.15, 1), Y = q => y0 - (y0 - y1) * q / vmax;
    txt(g, 'Stun bar', 28, Y(P.th / 2), { size: 14, w: 700 });
    R.stuns.forEach(([a, b]) => { const e = Math.min(b, tt, SIM_T); if (e > a) { g.fillStyle = 'rgba(229,50,45,.2)'; g.fillRect(X(a), y1, X(e) - X(a), y0 - y1); T.label('stun', X(a) + 22, y1 + 14, 'center', C.redDk, 12); } });
    g.strokeStyle = C.redDk; g.lineWidth = 2; g.setLineDash([7, 5]); g.beginPath(); g.moveTo(x0, Y(P.th)); g.lineTo(x1, Y(P.th)); g.stroke(); g.setLineDash([]);
    txt(g, `threshold ${P.th}`, x0 - 8, Y(P.th) + 4, { size: 12, w: 700, col: C.redDk, al: 'right' });
    g.strokeStyle = COL.chg; g.lineWidth = 3; g.beginPath();
    for (let i = 0; i <= idx && i < R.pts.length; i += 2) { const x = X(i * DT), y = Y(R.pts[i]); i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    g.strokeStyle = C.navy; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y0); g.stroke();
    if (tt < SIM_T) { g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(X(tt), 238); g.lineTo(X(tt), y0); g.stroke(); }
  }
  const STUN_DUR = 16;
  canvasDemo('stun', (s, cv, g) => {
    const st = { ...ST0, tour: true, held: false, t: 0, t0: 0, key: '', R: null, rk: '' };
    const tourBtn = $(s, '.st-tour');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); } };
    const sync = bindSliders(s, st, manual);
    tourBtn.onclick = () => { Object.assign(st, ST0); st.tour = true; st.t = 0; st.held = false; tourBtn.classList.add('on'); };
    $(s, '.st-reset').onclick = () => { manual(); Object.assign(st, ST0); };
    const res = () => { const k = [st.th, st.bu, st.dc].join(); if (k !== st.rk) { st.rk = k; st.R = simStun(st); } return st.R; };
    function info(t, R) {
      sync();
      const ph = st.tour ? (t < 4 ? 0 : t < 13 ? 1 : 2) : 3, key = [ph, st.rk].join(); if (key === st.key) return; st.key = key;
      say($(s, '.st-out'), [
        'Left: a binary keyword. Every breaking hit stuns, so the enemy never acts again: stun-lock.',
        'Right: the same keyword with an analog knob. Hits fill the bar, the bar drains between hits, and the stun fires only at the threshold. Dark Souls poise works this way.',
        `Binary stuns ${Math.round(R.pB * 100)}% of the fight; build-up stuns ${Math.round(R.pS * 100)}%, in ${R.stuns.length} bursts. Always mix binary keywords with an analog effect.`,
        `${R.stuns.length} stun${R.stuns.length === 1 ? '' : 's'} in 12 s, ${Math.round(R.pS * 100)}% of the fight. ${R.stuns.length === 0 ? 'The bar drains faster than hits fill it: the stun never fires.' : 'Threshold, build-up and decay each move how often the stun fires.'}`,
      ][ph]);
    }
    scenes.stun = { seek(t) { st.held = true; Object.assign(st, ST0); st.tour = true; const R = res(); drawStun(g, st, R, t - .5); info(t, R); }, dur: () => STUN_DUR };
    return dt => {
      if (st.held) return;
      st.t += Math.max(0, dt);
      if (st.tour && st.t >= STUN_DUR) st.t = 0;
      const R = res(), tt = st.tour ? st.t - .5 : (st.t % (SIM_T + 2));
      drawStun(g, st, R, tt); info(st.t, R);
    };
  });

  window.__seek = (t, which = 'hammer') => scenes[which].seek(t);
  window.__dur = (which = 'hammer') => scenes[which].dur();
})();
