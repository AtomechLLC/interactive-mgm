/* Evaluating Enemy Permutations (MGM C4 M5, deck slide 141), as World of Warcraft Classic pulls in Westfall.
   'evaluate' walks the slide's three questions, each answered by fights from sim.js:
   1. Change one behavioural rule on the Defias Thug: does the player's reaction pattern change (permutation) or only the risk
      (escalation)?
   2. Mix two creatures: do they stack nicely, fight each other, or create an impossible situation? The speaker notes' examples:
      in-your-face plus missiles, two grapplers, and the Pillager's Fireball with a Net thrower against a melee character.
   3. Take a mix that works (Thug + Pillager) and swap in variants of the base creature: does it still hold, for each class?
   Verdicts come from the simulation (PERM.solo, PERM.pair), not from a table. */
(function () {
  const { $, $$ } = FPF.kit;
  const { pic, text, wrap, card, chip, TONE, panel, scene, pointer, clamp, ease } = CK;
  const T = TD, C = TD.C, TAU = Math.PI * 2;
  const S = window.PERM, F = S.FOES;
  const IMG = n => 'img/' + n + '.jpg';
  const ph = (t, a, b) => clamp((t - a) / (b - a));

  const VARIANTS = ['thug', 'tough', 'swift', 'runaway', 'pillager', 'trapper'];
  const BASES = ['thug', 'tough', 'swift', 'runaway', 'trapper'];          // question 3 rows: the base creature and its variants
  const PAIRS = [['thug', 'pillager'], ['trapper', 'trapper'], ['trapper', 'pillager']];   // the speaker notes' three mixes
  const VERDICT = {
    base: ['Base creature', TONE.blue], escalation: ['Same reaction: escalation', TONE.grey], permutation: ['New reaction: permutation', TONE.green],
    stacks: ['Stacks nicely', TONE.green], fight: ['Fight each other', TONE.gold], impossible: ['Impossible', TONE.red], numbers: ['Only adds numbers', TONE.grey],
  };
  const QUESTIONS = [
    ['Change one behavioural rule', 'Only meaningful if the reaction changes'],
    ['Mix the changes', 'Stack nicely · fight each other · impossible'],
    ['Mix creatures, vary the base', 'Does the mix hold up with each variant?'],
  ];
  const ROLE = { warrior: 'Warrior (melee)', mage: 'Mage (ranged)' };

  // ---------- the walk-through: [question, class, length, arena speed] ----------
  // question 3 shows one row at a time; the last row (the Trapper, where the mix breaks for melee) gets longer
  const ROWS = BASES.map((b, i) => i === BASES.length - 1 ? 9.5 : 4.8);
  const ROW0 = ROWS.map((_, i) => ROWS.slice(0, i).reduce((a, b) => a + b, 0));
  const TOUR = [
    { q: 1, cls: 'warrior', len: 14, speed: 1 },
    { q: 2, cls: 'warrior', len: 15, speed: 2 },
    { q: 2, cls: 'mage', len: 11, speed: 2.8 },
    { q: 3, cls: 'warrior', len: ROWS.reduce((a, b) => a + b, 0) + 3.5, speed: 0 },
  ];
  const BULLETS = ['Some adjustments stack nicely', 'Some fight each other', 'Others create impossible situations for player victory'];
  let at = 0; TOUR.forEach(s => { s.t0 = at; at += s.len; });
  const DUR = at;
  const segAt = t => TOUR.find(s => t < s.t0 + s.len) || TOUR[TOUR.length - 1];

  // ---------- drawing pieces ----------
  function token(g, n, x, y, r, ring, o = {}) {
    g.save(); g.globalAlpha *= o.a ?? 1;
    g.fillStyle = '#111'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(x, y, r - 1, 0, TAU); g.clip(); if (o.grey) g.filter = 'grayscale(1)';
    pic(g, IMG(n), x, y, r * 2.3); g.restore();
    g.strokeStyle = ring; g.lineWidth = o.lw || 3; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
    g.restore();
  }
  function sq(g, n, x, y, s, o = {}) {
    g.save(); g.globalAlpha *= o.a ?? 1;
    if (o.glow) { g.fillStyle = o.glow; g.beginPath(); g.roundRect(x - s / 2 - 4, y - s / 2 - 4, s + 8, s + 8, 6); g.fill(); }
    pic(g, IMG(n), x, y, s, { round: 4, grey: o.grey });
    g.strokeStyle = o.edge || '#1b1b22'; g.lineWidth = o.lw || 2; g.beginPath(); g.roundRect(x - s / 2, y - s / 2, s, s, 4); g.stroke(); g.restore();
  }
  function bar(g, x, y, w, k, col, h = 4) {
    g.fillStyle = 'rgba(20,20,30,.6)'; g.fillRect(x - w / 2, y, w, h);
    g.fillStyle = col; g.fillRect(x - w / 2, y, w * clamp(k), h);
  }
  function netMesh(g, x, y, r, a = 1) {
    g.save(); g.globalAlpha *= a; g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip();
    g.strokeStyle = '#6b4a22'; g.lineWidth = 2;
    for (let k = -r; k <= r; k += 7) { g.beginPath(); g.moveTo(x + k - r, y - r); g.lineTo(x + k + r, y + r); g.stroke(); g.beginPath(); g.moveTo(x + k + r, y - r); g.lineTo(x + k - r, y + r); g.stroke(); }
    g.restore();
    g.save(); g.globalAlpha *= a; g.strokeStyle = '#6b4a22'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.restore();
  }
  function verdictChip(g, v, x, y, o = {}) {
    const [s, tone] = VERDICT[v];
    return chip(g, s, x, y, { ...tone, size: o.size || 14, a: o.a, align: o.align, lw: 2 });
  }

  // a Westfall field: ploughed rows and grass tufts at fixed spots
  function field(g, W, H) {
    g.fillStyle = '#cdb57c'; g.fillRect(0, 0, W, H);
    for (let y = 0, i = 0; y < H; y += 26, i++) { g.fillStyle = i % 2 ? 'rgba(150,118,62,.22)' : 'rgba(255,240,200,.12)'; g.fillRect(0, y, W, 13); }
    g.fillStyle = 'rgba(110,140,60,.55)';
    for (let i = 0; i < 26; i++) { const x = (i * 197 + 41) % W, y = (i * 113 + 17) % H; for (let k = -1; k <= 1; k++) { g.beginPath(); g.ellipse(x + k * 4, y, 1.6, 6, k * .4, 0, TAU); g.fill(); } }
  }

  // one fight drawn at x, y (top-left), sim units scaled by k. t is fight time.
  function arena(g, run, t, x, y, k, o = {}) {
    const W = S.W, H = S.H, fr = run.frames[Math.min(run.frames.length - 1, Math.max(0, Math.floor(t / S.DT)))];
    g.save(); g.translate(x, y); g.scale(k, k);
    g.beginPath(); g.roundRect(0, 0, W, H, 14 / k); g.save(); g.clip();
    T.use(g); field(g, W, H);
    // effects under the units
    run.fx.forEach(f => {
      const u = t - f.t; if (u < 0) return;
      if (f.kind === 'nova' && u < 1.1) { const r = 115 * ease(clamp(u / .35)); g.fillStyle = `rgba(150,215,255,${.45 * (1 - u / 1.1)})`; g.beginPath(); g.arc(f.x, f.y, r, 0, TAU); g.fill(); g.strokeStyle = `rgba(255,255,255,${.8 * (1 - u / 1.1)})`; g.lineWidth = 3; g.stroke(); }
      if (f.kind === 'blink' && u < .6) { g.strokeStyle = `rgba(170,120,255,${1 - u / .6})`; g.lineWidth = 6; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(f.x0, f.y0); g.lineTo(f.x, f.y); g.stroke(); g.setLineDash([]); }
      if (f.kind === 'swing' && u < .25) { g.strokeStyle = `rgba(255,255,255,${1 - u / .25})`; g.lineWidth = 4; g.beginPath(); g.arc(f.x, f.y, 26, f.a - .8, f.a + .8); g.stroke(); }
      if (f.kind === 'die' && u < .6) { g.fillStyle = `rgba(80,60,40,${.35 * (1 - u / .6)})`; g.beginPath(); g.arc(f.x, f.y, 18 + u * 40, 0, TAU); g.fill(); }
    });
    // enemies
    fr.foes.forEach(e => {
      if (e.gone) return;
      const dead = !e.alive, r = 21;
      if (!dead && e.root > 0) { g.fillStyle = 'rgba(150,215,255,.55)'; g.beginPath(); g.arc(e.x, e.y, r + 6, 0, TAU); g.fill(); }
      if (!dead && e.slow > 0) { g.strokeStyle = '#5fb3ff'; g.lineWidth = 2; g.setLineDash([4, 3]); g.beginPath(); g.arc(e.x, e.y, r + 4, 0, TAU); g.stroke(); g.setLineDash([]); }
      token(g, F[e.key].icon, e.x, e.y, r, dead ? '#777' : '#c8281f', { grey: dead, a: dead ? .45 : 1 });
      sq(g, F[e.key].badge, e.x + 16, e.y + 16, 17, { a: dead ? .45 : 1, edge: '#fff', lw: 1.5 });
      if (dead) { g.strokeStyle = 'rgba(60,40,30,.7)'; g.lineWidth = 3; g.beginPath(); g.moveTo(e.x - 8, e.y - 8); g.lineTo(e.x + 8, e.y + 8); g.moveTo(e.x + 8, e.y - 8); g.lineTo(e.x - 8, e.y + 8); g.stroke(); return; }
      bar(g, e.x, e.y - r - 10, 44, e.hp / e.max, '#e5322d', 5);
      if (e.cast) { bar(g, e.x, e.y + r + 6, 44, e.cast, '#ff9a2e', 6); }
      if (e.lock > 0) text(g, 'interrupted', e.x, e.y + r + 14, { size: 13, w: 800, col: '#5a3fb0', stroke: 3 });
      if (e.stun > 0) { for (let i = 0; i < 3; i++) { const a = t * 6 + i * TAU / 3; text(g, '★', e.x + Math.cos(a) * 12, e.y - r - 4 + Math.sin(a) * 4, { size: 11, col: '#f5c518', stroke: 2 }); } }
      if (e.ham > 0) { g.strokeStyle = '#a8201c'; g.lineWidth = 2; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(e.x - 6 + i * 6, e.y + r + 2); g.lineTo(e.x - 2 + i * 6, e.y + r + 8); g.stroke(); } }
    });
    // the player
    const m = fr.me;
    if (m.charging) { g.strokeStyle = 'rgba(46,163,220,.5)'; g.lineWidth = 10; g.beginPath(); g.moveTo(m.x - Math.cos(m.face) * 40, m.y - Math.sin(m.face) * 40); g.lineTo(m.x, m.y); g.stroke(); }
    const hx = m.x + Math.cos(m.face) * 32, hy = m.y + Math.sin(m.face) * 32;
    g.fillStyle = C.player; g.beginPath(); g.moveTo(hx, hy); g.lineTo(m.x + Math.cos(m.face + .5) * 22, m.y + Math.sin(m.face + .5) * 22); g.lineTo(m.x + Math.cos(m.face - .5) * 22, m.y + Math.sin(m.face - .5) * 22); g.fill();
    token(g, S.CLASSES[run.cls].icon, m.x, m.y, 24, m.hp <= 0 ? '#777' : C.player, { lw: 4, grey: m.hp <= 0 });
    if (m.root > 0) netMesh(g, m.x, m.y, 32, .9);
    bar(g, m.x, m.y - 38, 52, m.hp / m.max, '#2fae63', 6);
    if (m.cast) bar(g, m.x, m.y + 31, 50, m.cast, '#5fb3ff', 6);
    // projectiles
    fr.shots.forEach(s => {
      if (s.kind === 'fireball') { const gr = g.createRadialGradient(s.x, s.y, 1, s.x, s.y, 13); gr.addColorStop(0, '#fff3b0'); gr.addColorStop(.4, '#ff8a1e'); gr.addColorStop(1, 'rgba(229,50,45,0)'); g.fillStyle = gr; g.beginPath(); g.arc(s.x, s.y, 13, 0, TAU); g.fill(); }
      else if (s.kind === 'frostbolt') { g.fillStyle = '#bfe6ff'; g.strokeStyle = '#3d8fd6'; g.lineWidth = 2; g.beginPath(); g.arc(s.x, s.y, 7, 0, TAU); g.fill(); g.stroke(); }
      else netMesh(g, s.x, s.y, 16, 1);
    });
    // effects over the units
    run.fx.forEach(f => {
      const u = t - f.t; if (u < 0) return;
      if (f.kind === 'netted' && u < .4) { g.strokeStyle = `rgba(107,74,34,${1 - u / .4})`; g.lineWidth = 4; g.beginPath(); g.arc(f.x, f.y, 32 + u * 60, 0, TAU); g.stroke(); }
      if (f.kind === 'hit' && u < .7 && o.numbers !== false) text(g, '-' + f.d, f.x + (f.me ? -22 : 22), f.y - 32 - u * 30, { size: 18, w: 800, col: f.me ? '#e5322d' : '#fff8e0', stroke: 4, strokeCol: f.me ? '#fff8e0' : '#3a2a10', a: 1 - u / .7 });
      if (f.kind === 'say' && u < 1.5) text(g, f.s, f.x, f.y - 46, { size: 20, w: 800, col: '#7a3a06', stroke: 5, a: 1 - ph(u, 1.1, 1.5) });
      if (f.kind === 'act' && u < 1.1 && !['Attack', 'Back off', 'Frostbolt'].includes(f.a)) {
        const a = 1 - ph(u, .75, 1.1), yy = m.y - 74 - ease(clamp(u / .3)) * 10;
        sq(g, S.ACTIONS[f.a], m.x, yy, 34, { a });
        text(g, f.a, m.x, yy + 28, { size: 17, w: 800, col: C.navy, stroke: 4, a });
      }
    });
    g.restore();
    // result
    if (t >= run.t + .2 && o.result !== false) {
      const a = ease(ph(t, run.t + .2, run.t + .6)), [s, tone] = run.won ? ['Cleared', TONE.green] : run.lost ? ['Defeated', TONE.red] : ['Still fighting', TONE.grey];
      chip(g, s, W / 2, 26, { ...tone, size: 24, a, lw: 3 });
    }
    g.restore();
    g.save(); g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(x, y, W * k, H * k, 14); g.stroke(); g.restore();
  }

  // the player's reaction pattern up to time t, as icons with labels; fresh marks the actions to highlight
  const patternAt = (run, t) => { const p = []; run.log.forEach(([tt, a]) => { if (tt <= t && !p.includes(a)) p.push(a); }); return p; };
  function chips(g, pat, x, y, s, o = {}) {
    const step = o.step || s + 34;
    pat.forEach((a, i) => {
      const cx = x + i * step + s / 2, fresh = o.fresh && o.fresh.includes(a);
      sq(g, S.ACTIONS[a], cx, y, s, { glow: fresh ? '#ffb951' : null, grey: o.dim && !fresh });
      text(g, a, cx, y + s / 2 + 9, { size: o.ls || 11, w: fresh ? 800 : 600, col: fresh ? C.goldInk : C.muted });
    });
    if (!pat.length && o.empty) text(g, o.empty, x, y, { align: 'left', size: 12, it: true, col: C.muted });
    return pat.length * step;
  }

  // ---------- the three questions ----------
  function header(g, q, a = 1) {
    QUESTIONS.forEach(([h, sub], i) => {
      const x = 8 + i * 344, on = q === i + 1, w = 336;
      g.save(); g.globalAlpha *= a;
      g.fillStyle = on ? C.navy : 'rgba(255,252,244,.75)'; g.strokeStyle = on ? C.navy : '#cdbf9f'; g.lineWidth = 2;
      g.beginPath(); g.roundRect(x, 4, w, 48, 10); g.fill(); g.stroke(); g.restore();
      text(g, String(i + 1), x + 20, 28, { size: 24, w: 800, display: true, col: on ? '#ffb951' : '#b9b09a', a });
      text(g, h, x + 40, 20, { align: 'left', size: 15, w: 700, display: true, col: on ? '#fff' : C.muted, a });
      text(g, sub, x + 40, 39, { align: 'left', size: 12.5, w: 500, col: on ? '#d6dbef' : '#9a937e', a });
    });
  }

  function q1(g, cls, t) {
    const base = S.run(['thug'], cls);
    VARIANTS.forEach((k, i) => {
      const x = 8 + (i % 3) * 344, y = 60 + Math.floor(i / 3) * 262, w = 336, h = 254, sv = S.solo(k, cls), r = sv.r;
      card(g, x + w / 2, y + h / 2, w, h, { r: 12, lw: 2, edge: k === 'thug' ? '#8ea2e6' : '#cdbf9f' });
      sq(g, F[k].badge, x + 22, y + 22, 26);
      text(g, F[k].name, x + 42, y + 16, { align: 'left', size: 15, w: 800, display: true });
      text(g, k === 'thug' ? 'The base: ' + F[k].rule.toLowerCase() : 'Rule change: ' + F[k].rule.toLowerCase(), x + 42, y + 33, { align: 'left', size: 12.5, col: C.muted });
      arena(g, r, t, x + 18, y + 44, .5, { result: false });
      const pat = patternAt(r, t), fresh = k === 'thug' ? [] : pat.filter(a => !base.pattern.includes(a));
      const used = chips(g, pat, x + 20, y + 214, 22, { step: 66, fresh, empty: 'reaction…', ls: 10.5 });
      // base actions this rule change made unnecessary, once the fight is over
      if (k !== 'thug' && t > r.t) base.pattern.filter(q => !pat.includes(q)).forEach((q, j) => {
        const cx = x + 20 + used + j * 66 + 11; sq(g, S.ACTIONS[q], cx, y + 214, 22, { grey: true, a: .7 });
        g.strokeStyle = '#c8281f'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 13, y + 227); g.lineTo(cx + 13, y + 201); g.stroke();
        text(g, 'no ' + q, cx, y + 234, { size: 10.5, w: 600, col: '#8a1c15' });
      });
      const shown = t > Math.min(r.t, 7.5) + .3;
      if (shown) verdictChip(g, sv.verdict, x + w / 2, y + 176, { size: 14, a: ease(ph(t, Math.min(r.t, 7.5) + .3, Math.min(r.t, 7.5) + .7)) });
    });
  }

  const WHY = {
    stacks: 'Each creature still asks for its own answer, and the player has to sequence both.',
    fight: 'The second Net lands on someone already netted: one of the two tools does nothing.',
    impossible: 'Nothing in this kit answers the pair: netted out of reach while Fireballs land.',
    numbers: 'Both ask for the same answer; the pair only adds health and damage.',
  };
  function pairCol(g, a, b, cls, t, x, y, w, h, k) {
    const pv = S.pair(a, b, cls), r = pv.r;
    card(g, x + w / 2, y + h / 2, w, h, { r: 12, lw: 2 });
    sq(g, F[a].badge, x + 22, y + 22, 26); sq(g, F[b].badge, x + 52, y + 22, 26);
    text(g, `${F[a].name.replace('Defias ', '')} + ${F[b].name.replace('Defias ', '')}`, x + 72, y + 16, { align: 'left', size: 15, w: 800, display: true });
    text(g, 'against a ' + ROLE[cls], x + 72, y + 33, { align: 'left', size: 12.5, col: C.muted });
    const aw = S.W * k;
    arena(g, r, t, x + (w - aw) / 2, y + 46, k);
    let yy = y + 46 + S.H * k + 22;
    text(g, 'Alone, each asks for', x + 16, yy, { align: 'left', size: 12, w: 700, col: C.muted }); yy += 24;
    sq(g, F[a].badge, x + 26, yy, 18); chips(g, S.run([a], cls).pattern, x + 46, yy, 18, { step: 62, ls: 9.5 }); yy += 40;
    if (b !== a) { sq(g, F[b].badge, x + 26, yy, 18); chips(g, S.run([b], cls).pattern, x + 46, yy, 18, { step: 62, ls: 9.5 }); }
    yy += 40;
    text(g, 'Together, the player', x + 16, yy, { align: 'left', size: 12, w: 700, col: C.muted }); yy += 24;
    const both = new Set([...S.run([a], cls).pattern, ...S.run([b], cls).pattern]);
    chips(g, patternAt(r, t), x + 46, yy, 18, { step: 62, ls: 9.5, fresh: patternAt(r, t).filter(q => !both.has(q)) });
    yy += 42;
    const show = Math.min(r.t, 9) + .3, va = ease(ph(t, show, show + .4));
    if (va > 0) {
      verdictChip(g, pv.verdict, x + w / 2, yy, { size: 17, a: va });
      wrap(g, WHY[pv.verdict], x + w / 2, yy + 26, w - 30, { size: 12.5, align: 'center', col: C.ink, a: va, lh: 16 });
    }
    return pv;
  }
  function q2(g, cls, t, pairs) {
    pairs.forEach(([a, b], i) => {
      pairCol(g, a, b, cls, t, 8 + i * 344, 60, 336, 518, .53);
      const v = S.pair(a, b, cls).verdict, slideSays = ['stacks', 'fight', 'impossible'][i];
      text(g, '“' + BULLETS[i] + '”', 8 + i * 344 + 168, 556, { size: 12.5, it: true, w: 600, col: v === slideSays ? C.goldInk : '#b9b09a' });
    });
  }
  function q2manual(g, a, b, t) {
    ['warrior', 'mage'].forEach((cls, i) => pairCol(g, a, b, cls, t, 8 + i * 516, 60, 508, 518, .8));
  }

  function q3(g, partner, row, t, upto) {
    // the row being watched: both classes, stacked
    const k = BASES[row];
    ['warrior', 'mage'].forEach((cls, i) => {
      const y = 60 + i * 262, r = S.pair(k, partner, cls).r;
      sq(g, S.CLASSES[cls].icon, 24, y + 14, 22);
      text(g, `${F[k].name.replace('Defias ', '')} + ${F[partner].name.replace('Defias ', '')} vs ${ROLE[cls]}`, 42, y + 14, { align: 'left', size: 14, w: 800, display: true });
      arena(g, r, t, 12, y + 30, .7);
    });
    // the table
    const x0 = 444, w = 588, rh = 78, y0 = 104;
    panel(g, x0, 60, w, 516);
    text(g, 'Base creature variant', x0 + 16, 82, { align: 'left', size: 13, w: 800, col: C.muted, display: true });
    text(g, `+ ${F[partner].name}`, x0 + 418, 74, { size: 12.5, w: 800, col: C.ink, display: true });
    sq(g, S.CLASSES.warrior.icon, x0 + 352, 92, 16); text(g, 'Warrior', x0 + 364, 92, { align: 'left', size: 12, w: 700, col: C.muted });
    sq(g, S.CLASSES.mage.icon, x0 + 470, 92, 16); text(g, 'Mage', x0 + 482, 92, { align: 'left', size: 12, w: 700, col: C.muted });
    BASES.forEach((b, i) => {
      const y = y0 + i * rh, on = i === row, seen = i <= upto;
      if (on) { g.fillStyle = 'rgba(255,185,81,.22)'; g.strokeStyle = '#e0a92d'; g.lineWidth = 2; g.beginPath(); g.roundRect(x0 + 6, y, w - 12, rh - 6, 10); g.fill(); g.stroke(); }
      sq(g, F[b].badge, x0 + 30, y + rh / 2 - 3, 30);
      text(g, F[b].name, x0 + 54, y + 24, { align: 'left', size: 15, w: 800, display: true });
      text(g, b === 'thug' ? 'the base' : F[b].rule, x0 + 54, y + 45, { align: 'left', size: 12, col: C.muted });
      ['warrior', 'mage'].forEach((cls, j) => {
        const cx = x0 + 360 + j * 118, cy = y + rh / 2 - 3;
        if (!seen) { chip(g, '?', cx, cy, { ...TONE.grey, width: 104, size: 13 }); return; }
        const v = S.pair(b, partner, cls).verdict, [s, tone] = VERDICT[v];
        chip(g, s, cx, cy, { ...tone, width: 108, size: v === 'numbers' ? 11 : 12.5, a: i === upto && on ? ease(ph(t, 0, .4)) : 1 });
      });
    });
    // what the table says
    if (upto >= BASES.length - 1) {
      const base = cls => S.pair('thug', partner, cls).verdict;
      const breaks = cls => BASES.filter(b => S.pair(b, partner, cls).verdict !== base(cls)).map(b => F[b].name.replace('Defias ', ''));
      const line = cls => { const br = breaks(cls); return `${ROLE[cls]}: ` + (br.length ? `holds for ${BASES.length - br.length} of ${BASES.length}, changes with ${br.join(', ')}` : `holds for all ${BASES.length}`); };
      text(g, line('warrior'), x0 + 16, y0 + 5 * rh + 6, { align: 'left', size: 13, w: 700, col: C.ink });
      text(g, line('mage'), x0 + 16, y0 + 5 * rh + 26, { align: 'left', size: 13, w: 700, col: C.ink });
    }
  }

  // ---------- the scene ----------
  scene('evaluate', {
    dur: DUR, loop: 1e9,
    state: () => ({ q: 1, cls: 'warrior', a: 'trapper', b: 'pillager', partner: 'pillager', row: 4 }),
    init(s, st, api) {
      const sync = () => {
        $$(s, '.pm-q .btn').forEach(b => b.classList.toggle('on', !st.tour && +b.dataset.q === st.q));
        $$(s, '.pm-cls .btn').forEach(b => b.classList.toggle('on', b.dataset.c === st.cls));
        $$(s, '.pm-pick').forEach(p => p.classList.toggle('on', !st.tour && +p.dataset.for === st.q));
        $(s, '.pm-a').value = st.a; $(s, '.pm-b').value = st.b; $(s, '.pm-partner').value = st.partner;
      };
      const opts = keys => keys.map(k => `<option value="${k}">${F[k].name}</option>`).join('');
      $(s, '.pm-a').innerHTML = opts(VARIANTS); $(s, '.pm-b').innerHTML = opts(VARIANTS);
      $(s, '.pm-partner').innerHTML = opts(['pillager', 'trapper', 'thug']);
      const go = fn => e => { api.manual(); fn(e); st.t = 0; sync(); };
      $$(s, '.pm-q .btn').forEach(b => b.onclick = go(() => st.q = +b.dataset.q));
      $$(s, '.pm-cls .btn').forEach(b => b.onclick = go(() => { st.cls = b.dataset.c; }));
      $(s, '.pm-a').onchange = go(e => st.a = e.target.value);
      $(s, '.pm-b').onchange = go(e => st.b = e.target.value);
      $(s, '.pm-partner').onchange = go(e => st.partner = e.target.value);
      $(s, '.ck-tour').addEventListener('click', () => setTimeout(sync));
      pointer(api.cv, (x, y, type) => {
        if (type !== 'down' || st.tour || st.q !== 3) return;
        const i = Math.floor((y - 104) / 78);
        if (x > 444 && i >= 0 && i < BASES.length) { st.row = i; st.t = 0; }
      });
      api.sync = sync; sync();
    },
    draw(g, t, st, tour) {
      if (tour) {
        const sg = segAt(t), u = t - sg.t0;
        st.q = sg.q; st.cls = sg.cls;
        const fade = Math.min(ease(ph(u, 0, .35)), 1 - ph(u, sg.len - .3, sg.len));
        header(g, sg.q);
        g.save(); g.globalAlpha = fade;
        if (sg.q === 1) q1(g, sg.cls, u * sg.speed);
        else if (sg.q === 2) q2(g, sg.cls, u * sg.speed, PAIRS);
        else {
          let row = 0; ROW0.forEach((r0, i) => { if (u >= r0) row = i; });
          const ru = u - ROW0[row], md = Math.max(S.pair(BASES[row], 'pillager', 'warrior').r.t, S.pair(BASES[row], 'pillager', 'mage').r.t) + .6;
          q3(g, 'pillager', row, Math.min(ru * clamp(md / (ROWS[row] - 1), 1, 7), md + 3), row);
        }
        g.restore();
        return;
      }
      header(g, st.q);
      if (st.q === 1) q1(g, st.cls, t % 15);
      else if (st.q === 2) { const md = Math.max(S.pair(st.a, st.b, 'warrior').r.t, S.pair(st.a, st.b, 'mage').r.t); q2manual(g, st.a, st.b, (t * 1.5) % (md + 4)); }
      else { const k = BASES[st.row], md = Math.max(S.pair(k, st.partner, 'warrior').r.t, S.pair(k, st.partner, 'mage').r.t); q3(g, st.partner, st.row, (t * 2) % (md + 4), BASES.length - 1); }
    },
    side(t, st, tour) {
      const q = tour ? segAt(t).q : st.q, cls = tour ? segAt(t).cls : st.cls;
      if (q === 1) {
        const v = VARIANTS.slice(1).map(k => S.solo(k, cls).verdict), n = v.filter(x => x === 'permutation').length;
        return { stats: `<div class="g"><b>${n}</b><span>of 5 rule changes give the ${ROLE[cls]} a new reaction</span></div><div><b>${5 - n}</b><span>only raise the risk: escalations</span></div>`,
          out: 'More health or a faster swing is the same fight for longer. Running for help, casting Fireball or throwing a Net each asks for something new.' };
      }
      if (q === 2) {
        const list = tour ? PAIRS : [[st.a, st.b]], cl = tour ? [cls] : ['warrior', 'mage'];
        const rows = cl.flatMap(c => list.map(([a, b]) => { const v = S.pair(a, b, c).verdict, tag = v === 'impossible' ? 'r' : v === 'fight' ? 'y' : v === 'stacks' ? 'g' : ''; return `<div class="${tag}"><span>${F[a].name.replace('Defias ', '')} + ${F[b].name.replace('Defias ', '')}${tour ? '' : ', ' + S.CLASSES[c].name}: <b style="font-size:17px">${VERDICT[v][0]}</b></span></div>`; }));
        return { stats: rows.join(''), out: tour && cls === 'mage' ? 'The same Net and Fireball against a Mage: Blink breaks the Net and Frostbolt reaches the Pillager. The mix was only impossible for melee.' : 'The speaker notes’ mixes: missiles plus something in your face, two grapplers, and the Pillager’s Fireball with a Net thrower.' };
      }
      const partner = tour ? 'pillager' : st.partner;
      const br = c => BASES.filter(b => S.pair(b, partner, c).verdict !== S.pair('thug', partner, c).verdict).length;
      return { stats: `<div class="g"><b>${BASES.length - br('warrior')}/${BASES.length}</b><span>variants keep the Warrior’s verdict</span></div><div class="g"><b>${BASES.length - br('mage')}/${BASES.length}</b><span>variants keep the Mage’s verdict</span></div>`,
        out: `Take a mix that works and swap in each variant of the base creature. A verdict that changes marks a combination to steer, or keep out of the spawn tables.` };
    },
    after(st) { },
  });
})();
