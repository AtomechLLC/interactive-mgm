/* Five-skill fingerprints (DGMS Module 3, Leveraging Player Skills; deck slides 23-33, 89, 295-330).
   A five-axis radar of the deck's skill types (slide 89): physical execution, decision making, processing, knowledge and
   freeform. Slide 1: presets for the deck's examples (Undertale, Minecraft, Crypt of the NecroDancer from 25-28; Mega Man X,
   Rock Band, Dungeons & Dragons and Vital Signs from 327-330; slide 24's "rhythm game for rhythm gamers").
   Slide 2: skill dissonance (30-32) as a change of shape: Sonic Adventure's stages to Big's fishing, The World Ends with
   You's battles to Tin Pin Slammer, Dark Souls' bosses to the Bed of Chaos; overlap = sum of minimums / sum of maximums.
   Slide 3: the slide 295 self-reflection, with sliders and the nearest presets.
   The deck shows which skills each game uses (as icons), never amounts: EVERY VALUE BELOW IS A COURSE ESTIMATE on a 0-5
   scale, labelled so on screen. Change them here. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, TAU = Math.PI * 2;

  // [key, short label, colour, one-line meaning (slide 89)]
  const AXES = [
    ['phys', 'Physical execution', '#e5322d', 'timing, precision and speed with your hands'],
    ['dec', 'Decision making', '#2ea3dc', 'choosing between options with something at stake'],
    ['proc', 'Processing', '#8a4fd6', 'reading and calculating what is in front of you'],
    ['know', 'Knowledge', '#2fae63', 'rules, maps and patterns you learned and remember'],
    ['free', 'Freeform', '#e0a92d', 'creativity and expression that other people judge'],
  ];
  // course estimates, 0-5: [phys, dec, proc, know, free]
  const GAMES = [
    { k: 'undertale', name: 'Undertale', v: [3, 3, 2, 3, 1], why: 'An RPG’s menus and choices with bullet-hell dodging inside every fight.' },
    { k: 'minecraft', name: 'Minecraft', v: [2, 3, 2, 4, 5], why: 'Recipes and biomes to learn, and building that only other players can judge.' },
    { k: 'necro', name: 'Crypt of the NecroDancer', v: [4, 4, 3, 3, 0], why: 'A roguelike’s tactics, but every move has to land on the beat.' },
    { k: 'mmx', name: 'Mega Man X', v: [5, 2, 2, 3, 0], why: 'Jumps, dashes and boss patterns: hands first, with weakness knowledge on top.' },
    { k: 'rockband', name: 'Rock Band', v: [5, 0.5, 1.5, 2, 1], why: 'Hit the notes on time. Almost nothing to decide.' },
    { k: 'dnd', name: 'Dungeons & Dragons', v: [0, 4, 3, 4, 5], why: 'No hands at all: choices, rules and storytelling at the table.' },
    { k: 'vital', name: 'Vital Signs', v: [0.5, 4, 4, 5, 1], why: 'Triage under pressure: what you know about medicine and what you notice.' },
    { k: 'rhythm', name: 'A rhythm game for rhythm gamers', v: [5, 0, 1, 1, 0], why: 'The deck: rhythm gamers “probably don’t want to deal with physics, calculations, and decision-making”.' },
  ];
  const DISSO = [
    { k: 'sonic', name: 'Sonic Adventure', a: 'Sonic’s stages', b: 'Big’s fishing', va: [4.5, 2, 3.5, 2, 1], vb: [1.5, 1, 1, 1.5, 0],
      out: 'Big’s fishing is mandatory, and it drops the speed and reaction the rest of the game trained. Players who came for Sonic are asked for a different game.' },
    { k: 'twewy', name: 'The World Ends with You', a: 'two-screen battles', b: 'Tin Pin Slammer', va: [4, 3, 5, 3, 1], vb: [3, 2, 1, 3.5, 0],
      out: 'Tin Pin Slammer swaps the two-screen juggling the battles are built on for a marble game with its own rules to learn.' },
    { k: 'souls', name: 'Dark Souls', a: 'boss fights', b: 'the Bed of Chaos', va: [4, 4, 3, 4, 1], vb: [2, 1, 2, 3, 0],
      out: 'The Bed of Chaos replaces reading and punishing a boss with falling floors and trial and error, so the skills the game built mostly do not apply.' },
  ];
  const EXAMPLE = [3.5, 3, 4, 2, 0.5];   // the walk-through's "your game": a stealth game
  const overlap = (a, b) => { let mn = 0, mx = 0; a.forEach((x, i) => { mn += Math.min(x, b[i]); mx += Math.max(x, b[i]); }); return mx ? Math.round(100 * mn / mx) : 100; };
  const mix = (a, b, k) => a.map((x, i) => lerp(x, b[i], k));
  const fmt = v => (Math.round(v * 2) / 2).toString();

  const txt = (g, s, x, y, font, col = C.ink, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); };
  function panel(g) { T.use(g); g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); }
  const ang = i => -Math.PI / 2 + i * TAU / 5;
  const pt = (cx, cy, R, i, v) => [cx + R * v / 5 * Math.cos(ang(i)), cy + R * v / 5 * Math.sin(ang(i))];
  function grid(g, cx, cy, R) {
    for (let r = 1; r <= 5; r++) {
      g.strokeStyle = r === 5 ? '#b9ab8c' : '#ddd0b2'; g.lineWidth = r === 5 ? 2 : 1.2; g.beginPath();
      for (let i = 0; i < 5; i++) { const [x, y] = pt(cx, cy, R, i, r); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.stroke();
    }
    AXES.forEach(([, n, col], i) => {
      const [x, y] = pt(cx, cy, R, i, 5); g.strokeStyle = '#ddd0b2'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(x, y); g.stroke();
      const [lx, ly] = pt(cx, cy, R + 34, i, 5), al = Math.abs(lx - cx) < 10 ? 'center' : lx > cx ? 'left' : 'right';
      g.fillStyle = col; g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill();
      txt(g, n, lx + (al === 'left' ? -16 : al === 'right' ? 16 : 0), ly + (i === 0 ? -4 : 6), '700 16px Montserrat, Jost, sans-serif', C.ink, al);
    });
  }
  function shape(g, cx, cy, R, v, col, fillA = .22, dash = false, lw = 3.5) {
    g.beginPath(); v.forEach((x, i) => { const [px, py] = pt(cx, cy, R, i, Math.max(.15, x)); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath();
    if (fillA) { g.globalAlpha = fillA; g.fillStyle = col; g.fill(); g.globalAlpha = 1; }
    g.setLineDash(dash ? [8, 7] : []); g.strokeStyle = col; g.lineWidth = lw; g.stroke(); g.setLineDash([]);
    if (!dash) v.forEach((x, i) => { const [px, py] = pt(cx, cy, R, i, Math.max(.15, x)); g.fillStyle = '#fff'; g.strokeStyle = col; g.lineWidth = 2.5; g.beginPath(); g.arc(px, py, 5, 0, TAU); g.fill(); g.stroke(); });
  }
  function bars(g, x0, y0, v, w = 300, v2 = null) {
    AXES.forEach(([, n, col, mean], i) => {
      const y = y0 + i * 64;
      txt(g, n, x0, y, '800 16px Montserrat, Jost, sans-serif', C.ink);
      txt(g, v2 ? `${fmt(v2[i])} → ${fmt(v[i])}` : fmt(v[i]) + ' / 5', x0 + w, y, '800 16px Montserrat, Jost, sans-serif', col, 'right');
      g.fillStyle = '#ece2cb'; g.beginPath(); g.roundRect(x0, y + 14, w, 12, 6); g.fill();
      if (v2) { g.fillStyle = 'rgba(38,44,106,.18)'; g.beginPath(); g.roundRect(x0, y + 14, w * v2[i] / 5, 12, 6); g.fill(); }
      g.fillStyle = col; g.beginPath(); g.roundRect(x0, y + 14, Math.max(4, w * v[i] / 5), 12, 6); g.fill();
      txt(g, mean, x0, y + 40, '500 13px Jost, sans-serif', C.muted);
    });
  }
  const estimate = (g, x, y, al = 'left') => txt(g, 'values are course estimates, not measurements', x, y, 'italic 500 14px Jost, sans-serif', C.muted, al);

  const apis = {};
  /* ---------- slide 1: presets ---------- */
  canvasDemo('finger', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, cur: 0, prev: 0, since: 9, key: '', ghost: true };
    const tourBtn = $(s, '.fp-tour'), seg = $(s, '.fp-game'), gIn = $(s, '.fp-ghost');
    seg.innerHTML = GAMES.map((gm, i) => `<button class="btn${i ? '' : ' on'}" data-i="${i}">${gm.name.replace('A rhythm game for rhythm gamers', 'Rhythm game').replace('Crypt of the NecroDancer', 'NecroDancer').replace('Dungeons & Dragons', 'D&D')}</button>`).join('');
    const free = () => { st.tour = false; tourBtn.classList.remove('on'); };
    $$(seg, '.btn').forEach(b => b.onclick = () => { free(); if (+b.dataset.i === st.cur) return; st.prev = st.cur; st.cur = +b.dataset.i; st.since = 0; });
    gIn.onchange = () => { free(); st.ghost = gIn.checked; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const STEP = 2.2;
    function render() {
      let cur = st.cur, prev = st.prev, k = clamp(st.since / .6);
      if (st.tour) { const i = Math.floor(st.t / STEP) % GAMES.length; cur = i; prev = (i + GAMES.length - 1) % GAMES.length; k = clamp((st.t - i * STEP) / .6); if (st.t < .01) prev = cur; }
      $$(seg, '.btn').forEach(b => b.classList.toggle('on', +b.dataset.i === cur));
      const gm = GAMES[cur], pv = GAMES[prev], v = mix(pv.v, gm.v, ease(k));
      panel(g);
      const cx = 280, cy = 318, R = 185;
      grid(g, cx, cy, R);
      if (st.ghost && prev !== cur) shape(g, cx, cy, R, pv.v, C.muted, 0, true, 2.5);
      shape(g, cx, cy, R, v, C.ink, .2);
      txt(g, gm.name, 640, 44, '800 24px Montserrat, Jost, sans-serif', C.ink);
      estimate(g, 640, 74);
      bars(g, 640, 112, v, 360);
      g.font = '600 15px Jost, sans-serif';
      const words = gm.why.split(' '); let line = '', y = 530;
      const lines = []; words.forEach(w => { if (g.measureText(line + w).width > 960) { lines.push(line); line = ''; } line += w + ' '; }); lines.push(line);
      if (st.ghost && prev !== cur) txt(g, `dashed outline: ${pv.name} · overlap ${overlap(pv.v, gm.v)}%`, 40, 40, '600 15px Jost, sans-serif', C.muted);
      lines.forEach((l, i) => txt(g, l.trim(), 40, 560 - (lines.length - 1 - i) * 20, '600 16px Jost, sans-serif', C.ink));
      const key = [cur, prev, st.ghost].join(); if (key === st.key) return; st.key = key;
      const tests = AXES.filter((a, i) => gm.v[i] >= 3).map(a => a[1].toLowerCase());
      say($(s, '.fp-stats'), `<div><b>${tests.length}</b><span>skills tested hard (3+ of 5): ${tests.join(', ') || 'none'}</span></div>`
        + (prev !== cur ? `<div class="g"><b>${overlap(pv.v, gm.v)}%</b><span>overlap with ${pv.name}</span></div>` : ''));
      say($(s, '.fp-out'), tests.length >= 4
        ? `${gm.name} challenges players across the skill spectrum, so more kinds of players find a skill they excel at.`
        : tests.length <= 1 ? `${gm.name} challenges a specific skill spectrum: its players came for exactly that, and anything else would get in the way.`
        : `${gm.name} combines a few skills on purpose. The shape tells you who the game is for.`);
    }
    apis.finger = { seek(t) { st.held = st.tour = true; st.t = t; st.key = ''; render(); }, dur: () => STEP * GAMES.length };
    return dt => { if (!st.held) { st.t += Math.max(0, dt); st.since += Math.max(0, dt); } if (st.tour && st.t > STEP * GAMES.length) st.t = 0; render(); };
  });

  /* ---------- slide 2: dissonance ---------- */
  canvasDemo('disso', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, ex: 0, k: 0, key: '' };
    const tourBtn = $(s, '.ds-tour'), seg = $(s, '.ds-ex'), kIn = $(s, '.ds-k');
    seg.innerHTML = DISSO.map((d, i) => `<button class="btn${i ? '' : ' on'}" data-i="${i}">${d.name}</button>`).join('');
    const free = () => { st.tour = false; tourBtn.classList.remove('on'); };
    $$(seg, '.btn').forEach(b => b.onclick = () => { free(); st.ex = +b.dataset.i; st.k = 0; kIn.value = 0; });
    kIn.oninput = () => { free(); st.k = kIn.value / 100; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const STEP = 6;
    function render() {
      let ex = st.ex, k = st.k;
      if (st.tour) { ex = Math.floor(st.t / STEP) % DISSO.length; const f = st.t - ex * STEP; k = ease(clamp((f - 1) / 2.6)); kIn.value = Math.round(k * 100); }
      $$(seg, '.btn').forEach(b => b.classList.toggle('on', +b.dataset.i === ex));
      $(s, '.ds-kv').textContent = Math.round(k * 100) + '%';
      const d = DISSO[ex], v = mix(d.va, d.vb, k), ov = overlap(d.va, v);
      panel(g);
      const cx = 280, cy = 325, R = 185;
      grid(g, cx, cy, R);
      shape(g, cx, cy, R, d.va, C.player, .1, true, 2.5);
      shape(g, cx, cy, R, v, k > .5 ? C.red : C.ink, .22);
      txt(g, `${d.name}: ${d.a} → ${d.b}`, 40, 36, '800 20px Montserrat, Jost, sans-serif', C.ink);
      txt(g, `dashed blue: ${d.a}`, 40, 64, '600 15px Jost, sans-serif', C.player);
      txt(g, 'overlap with the core game', 640, 44, '700 16px Jost, sans-serif', C.muted);
      txt(g, ov + '%', 640, 92, '800 54px Montserrat, Jost, sans-serif', ov > 70 ? C.good : ov > 45 ? '#c07a00' : C.red);
      txt(g, k < .02 ? d.a : k > .98 ? d.b : 'moving to ' + d.b, 800, 92, '700 18px Jost, sans-serif', C.ink);
      estimate(g, 640, 134);
      bars(g, 640, 170, v, 360, d.va);
      const key = [ex, Math.round(k * 50)].join(); if (key === st.key) return; st.key = key;
      const drop = AXES.map((a, i) => [a[1], d.va[i] - v[i]]).sort((p, q) => q[1] - p[1])[0];
      say($(s, '.ds-stats'), `<div class="${ov < 50 ? 'r' : 'g'}"><b>${ov}%</b><span>overlap with ${d.a} (sum of the smaller values ÷ sum of the larger)</span></div>`
        + `<div class="y"><b>−${fmt(drop[1])}</b><span>biggest drop: ${drop[0].toLowerCase()}</span></div>`);
      say($(s, '.ds-out'), k < .05 ? `Start from ${d.a}: the skills the player chose this game for. Drag toward ${d.b}.` : d.out);
    }
    apis.disso = { seek(t) { st.held = st.tour = true; st.t = t; st.key = ''; render(); }, dur: () => STEP * DISSO.length };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > STEP * DISSO.length) st.t = 0; render(); };
  });

  /* ---------- slide 3: your game ---------- */
  canvasDemo('yours', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, v: [2.5, 2.5, 2.5, 2.5, 2.5], key: '' };
    const tourBtn = $(s, '.yg-tour'), box = $(s, '.yg-sliders');
    box.innerHTML = AXES.map(([k, n], i) => `<label class="rng">${n} <b class="yg-v${i}"></b><input type="range" data-i="${i}" min="0" max="5" step=".5" value="2.5"></label>`).join('');
    const ins = $$(box, 'input');
    const free = () => { st.tour = false; tourBtn.classList.remove('on'); };
    ins.forEach(inp => inp.oninput = () => { free(); st.v[+inp.dataset.i] = +inp.value; });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const DUR = 12;
    function render() {
      let v = st.v;
      if (st.tour) {
        // sliders move one at a time from the middle to the example game
        v = [2.5, 2.5, 2.5, 2.5, 2.5].map((x, i) => lerp(x, EXAMPLE[i], ease(clamp((st.t - .8 - i * 1.4) / 1.1))));
        ins.forEach((inp, i) => inp.value = Math.round(v[i] * 2) / 2);
      }
      AXES.forEach((a, i) => $(box, '.yg-v' + i).textContent = fmt(v[i]));
      panel(g);
      const cx = 280, cy = 325, R = 185;
      grid(g, cx, cy, R);
      const near = GAMES.map(gm => [gm, overlap(v, gm.v)]).sort((a, b) => b[1] - a[1]);
      shape(g, cx, cy, R, near[0][0].v, C.muted, 0, true, 2.5);
      shape(g, cx, cy, R, v, C.p3, .22);
      txt(g, 'Your game', 40, 36, '800 20px Montserrat, Jost, sans-serif', C.p3);
      txt(g, `dashed: closest preset, ${near[0][0].name}`, 40, 62, '600 15px Jost, sans-serif', C.muted);
      txt(g, 'Ask yourself', 640, 44, '800 20px Montserrat, Jost, sans-serif', C.ink);
      ['Which skills does my game test?', 'Which does it test hardest?', 'Is that what my players came for?', 'Does any mode ask for a different shape?'].forEach((q, i) => txt(g, '• ' + q, 640, 80 + i * 28, '600 16px Jost, sans-serif', C.ink));
      txt(g, 'Closest fingerprints', 640, 214, '800 18px Montserrat, Jost, sans-serif', C.ink);
      near.slice(0, 4).forEach(([gm, o], i) => {
        const y = 250 + i * 46;
        txt(g, gm.name, 640, y, '700 15px Jost, sans-serif', C.ink);
        g.fillStyle = '#ece2cb'; g.beginPath(); g.roundRect(640, y + 12, 300, 10, 5); g.fill();
        g.fillStyle = C.p3; g.beginPath(); g.roundRect(640, y + 12, 3 * o, 10, 5); g.fill();
        txt(g, o + '%', 1000, y + 12, '800 16px Montserrat, Jost, sans-serif', C.p3, 'right');
      });
      estimate(g, 640, 450);
      if (st.tour) txt(g, 'walk-through example: a stealth game', 640, 480, '600 15px Jost, sans-serif', C.muted);
      const key = v.map(fmt).join(); if (key === st.key) return; st.key = key;
      const top = AXES.map((a, i) => [a[1], v[i]]).sort((p, q) => q[1] - p[1]);
      const hard = v.filter(x => x >= 3).length;
      say($(s, '.yg-stats'), `<div><b>${fmt(top[0][1])}</b><span>tested hardest: ${top[0][0].toLowerCase()}</span></div>`
        + `<div class="g"><b>${near[0][1]}%</b><span>overlap with ${near[0][0].name}</span></div>`
        + `<div class="y"><b>${hard}</b><span>skills at 3 or more</span></div>`);
      say($(s, '.yg-out'), hard >= 4 ? 'A wide fingerprint: many kinds of players find a way in, but each mode has to keep this whole shape or it will feel dissonant.'
        : hard <= 1 ? 'A narrow fingerprint: perfect for players who came for that one skill, and a hard sell for anyone else.'
        : 'Name the skills you test on purpose, then check every level and mode against this shape.');
    }
    apis.yours = { seek(t) { st.held = st.tour = true; st.t = t; st.key = ''; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });

  window.__seek = (t, w = 'disso') => apis[w].seek(t);
  window.__dur = (w = 'disso') => apis[w].dur();
})();
