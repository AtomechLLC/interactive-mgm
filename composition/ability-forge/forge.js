/* Ability forge (MGM C4 M7, deck slides 77-105). The workshop as a builder: 1. pick the problem (purpose), 2. pick keywords
   (payload), 3. pick a theme (packaging), and the card names itself. The arena then casts it at the Flame Demon and the
   Lightning Mage, so you see whether it solves the problem and what else it does: Stealth hides everyone in the cloud (notes
   on 114), Rain heals the enemies too (notes on 115), and wet things conduct the Mage's lightning (notes on 102).
   The walk-through forges the deck's three abilities and ends on the shared [Extinguish] tag (slide 104). */
(function () {
  const { $, $$ } = FPF.kit;
  const { icon, text, wrap, card, chip, TONE, panel, scene, pointer, inBox, clamp, lerp, ease } = CK;
  const T = TD, C = TD.C, F = window.FORGE;
  const PC = [[100, 96], [268, 96]], PK = ['demon', 'mage'];
  const KC = i => [100 + (i % 2) * 168, 206 + Math.floor(i / 2) * 30];
  const PACKS = Object.keys(F.PACKS), PT = i => [72 + (i % 3) * 112, 438 + Math.floor(i / 3) * 74];
  const AX = 846, AY = 206, AW = 364, AH = 388;            // arena centre and size
  const POS = { you: [-118, 80], ally: [-128, -52], demon: [52, -78], mage: [92, 92] };
  const CYCLE = 5, DUR = 39;
  // walk-through: each preset gets 11 s: problem at 0, keywords from 1.4 every .7 s, theme at 4, cast from 5
  const TOUR = F.PRESETS.map((p, i) => ({ ...p, at: i * 11 }));

  function build(t, st, tour) {
    if (!tour) return st;
    if (t >= 33) return { problem: 'demon', keys: [], pack: null, castT: 0, tray: F.PRESETS.map(p => p.name), compare: true, end: t - 33 };
    const p = TOUR[Math.min(2, Math.floor(t / 11))], u = t - p.at;
    return { problem: p.problem, keys: p.keys.filter((k, i) => u >= 1.4 + i * .7), pack: u >= 4 ? p.pack : null, castT: p.at + 5, tray: TOUR.filter(q => q.at + 4.6 <= t).map(q => q.name), compare: false, u, focus: u < 1.4 ? 1 : u < 4 ? 2 : u < 5 ? 3 : 4 };
  }
  // who the ability touches
  function touched(b) {
    if (!b.pack) return [];
    const tgt = b.problem || 'demon', shape = F.PACKS[b.pack].shape;
    if (shape === 'storm') return ['demon', 'mage', 'ally', 'you'];
    if (shape === 'cloud' || shape === 'nova') return Object.keys(POS).filter(k => k !== 'you' && Math.hypot(POS[k][0] - POS[tgt][0], POS[k][1] - POS[tgt][1]) < 80);
    return [tgt];
  }
  // what happens, as [unit, text, kind]: kind is 'solve', 'side' or 'backfire'
  function outcomes(b) {
    const hit = touched(b), out = [], has = k => b.keys.includes(k);
    const nm = { demon: 'Flame Demon', mage: 'Lightning Mage', ally: 'Your ally', you: 'You' };
    hit.forEach(u => b.keys.forEach(k => {
      if (u === 'demon') { if (k === 'Extinguish') out.push([u, 'fire out', b.problem === 'demon' ? 'solve' : 'side']); if (k === 'Wet' && !has('Extinguish')) out.push([u, 'wet, so it can’t burn', 'side']); if (k === 'Burn') out.push([u, 'immune: it is fire', 'backfire']); if (k === 'Heal') out.push([u, 'healed too', 'backfire']); if (k === 'Stealth') out.push([u, 'hidden in the cloud', 'side']); }
      if (u === 'mage') { if (k === 'Drain') out.push([u, 'charge drained', b.problem === 'mage' ? 'solve' : 'side']); if (k === 'Shock') out.push([u, 'absorbs it, charges up', 'backfire']); if (k === 'Heal') out.push([u, 'healed too', 'backfire']); if (k === 'Stealth') out.push([u, 'hidden in the cloud', 'side']); }
      if ((u === 'ally' || u === 'you') && k === 'Heal') out.push([u, 'healed', 'side']);
      if (u !== 'you' && (k === 'Push' || k === 'Root')) out.push([u, k === 'Push' ? 'knocked back' : 'rooted in place', 'side']);
    }));
    if (has('Lifesteal') && hit.some(u => u === 'demon' || u === 'mage')) out.push(['you', 'healed by what it takes', 'side']);
    if (has('Wet') && hit.filter(u => u !== 'mage').length > 1 && !(hit.includes('mage') && has('Drain'))) out.push(['wet', 'conducts the Mage’s bolts', 'backfire']);
    nm.wet = 'Everything wet';
    // one line per thing and kind, solves first
    const rows = new Map();
    out.forEach(([u, s, k]) => { const key = k + u; rows.set(key, rows.has(key) ? [u, rows.get(key)[1] + ', ' + s, k] : [u, s, k]); });
    const rank = { solve: 0, backfire: 1, side: 2 };
    return [...rows.values()].sort((a, b) => rank[a[2]] - rank[b[2]]).map(([u, s, k]) => [nm[u], s, k]);
  }
  const solved = b => outcomes(b).some(o => o[2] === 'solve');

  // ---------- the three steps ----------
  function steps(g, b, t, tour) {
    const hot = n => tour && b.focus === n ? .5 + .5 * Math.sin(t * 6) : 0;
    [[12, 140, '1  Purpose: the problem'], [160, 196, '2  Payload: keywords (up to 3)'], [364, 208, '3  Packaging: the theme']].forEach(([y, h, s], i) => {
      panel(g, 16, y, 336, h, { title: s, edge: hot(i + 1) ? `rgba(255,185,81,${.5 + .5 * hot(i + 1)})` : undefined });
    });
    PK.forEach((k, i) => {
      const P = F.PROBLEMS[k], [x, y] = PC[i], on = b.problem === k;
      card(g, x, y, 158, 84, { edge: on ? P.col : '#cdbf9f', lw: on ? 4 : 2, fill: on ? '#fffaf0' : 'rgba(255,250,240,.7)' });
      icon(g, P.icon, x - 52, y - 4, 40, { grey: !on && b.problem });
      text(g, P.name, x - 26, y - 18, { align: 'left', size: 12.5, w: 800, display: true, col: on || !b.problem ? C.ink : C.muted });
      text(g, 'weak to', x - 26, y + 4, { align: 'left', size: 12, col: C.muted });
      chip(g, P.weak, x - 26, y + 24, { ...TONE[F.tone(P.weak)], size: 11.5, align: 'left' });
    });
    F.KEYWORDS.forEach(([k, , tone], i) => {
      const [x, y] = KC(i), on = b.keys.includes(k);
      chip(g, (on ? '✓ ' : '') + k, x, y, on ? { ...TONE[tone], size: 13.5, width: 150 } : { fill: 'rgba(255,250,240,.8)', edge: '#cdbf9f', col: C.muted, size: 13.5, width: 150, w: 600 });
    });
    PACKS.forEach((p, i) => {
      const [x, y] = PT(i), on = b.pack === p;
      if (on) card(g, x, y + 4, 100, 68, { edge: `rgb(${F.PACKS[p].rgb})`, lw: 3, shadow: false });
      icon(g, F.PACKS[p].icon, x, y - 4, 40, { grey: b.pack && !on, lw: on ? 3 : 2 });
      text(g, p, x, y + 28, { size: 13, w: on ? 800 : 600, col: on ? C.ink : C.muted });
    });
  }

  // ---------- the card ----------
  function abilityCard(g, b, t) {
    const x = 508, top = 12, W = 284;
    card(g, x, top + 280, W, 560, { edge: C.navy, lw: 3 });
    const P = b.problem && F.PROBLEMS[b.problem], name = F.nameOf(b.keys, b.pack);
    if (b.pack) icon(g, F.PACKS[b.pack].icon, x, top + 64, 80);
    else { card(g, x, top + 64, 80, 80, { dash: [6, 6], shadow: false, edge: '#b9b09a', fill: 'rgba(255,250,240,.5)', r: 8 }); text(g, '?', x, top + 66, { size: 34, w: 800, col: '#b9b09a', display: true }); }
    text(g, b.pack ? name : 'A new ability', x, top + 128, { size: name.length > 16 ? 21 : 24, w: 800, display: true, col: b.pack ? C.ink : C.muted });
    wrap(g, F.descOf(b.keys, b.pack), x, top + 156, W - 40, { size: 13.5, col: C.muted, align: 'center', lh: 17 });
    const L = x - W / 2 + 20;
    chip(g, 'Purpose', L, top + 214, { ...TONE.blue, size: 12.5, align: 'left' });
    wrap(g, P ? P.purpose : 'Pick a problem to solve', L, top + 244, W - 40, { size: 15, w: P ? 700 : 500, col: P ? C.ink : C.muted, lh: 18 });
    chip(g, 'Payload', L, top + 304, { ...TONE.gold, size: 12.5, align: 'left' });
    if (b.keys.length) { let cx = L; b.keys.forEach(k => { cx += chip(g, `[${k}]`, cx, top + 336, { ...TONE[F.tone(k)], size: 13.5, align: 'left' }) + 6; }); }
    else text(g, 'Pick keywords', L, top + 336, { align: 'left', size: 15, col: C.muted, w: 500 });
    chip(g, 'Packaging', L, top + 380, { ...TONE.purple, size: 12.5, align: 'left' });
    text(g, b.pack ? `[${b.pack}]: ${F.PACKS[b.pack].line}` : 'Pick a theme', L, top + 410, { align: 'left', size: 14, w: b.pack ? 700 : 500, col: b.pack ? C.ink : C.muted });
    // the verdict, once there is something to test
    if (b.pack && P) {
      const ok = solved(b);
      card(g, x, top + 490, W - 30, 96, { fill: ok ? '#d8f0df' : '#fde9b8', edge: ok ? '#5fb47c' : '#e0a92d', shadow: false });
      text(g, ok ? 'Solves the problem' : 'Misses the problem', x, top + 466, { size: 17, w: 800, display: true, col: ok ? C.good : C.goldInk });
      wrap(g, ok ? `The ${P.name} is weak to [${P.weak}], and this has it.` : `The ${P.name} is weak to [${P.weak}]. Nothing in this ability carries it.`, x, top + 494, W - 60, { size: 13, align: 'center', lh: 16, col: C.ink });
    }
  }

  // ---------- the test arena ----------
  function arena(g, b, t) {
    panel(g, AX - AW / 2, 12, AW, AH + 2, { title: 'Test it' });
    g.save(); g.beginPath(); g.roundRect(AX - AW / 2 + 8, 38, AW - 16, AH - 34, 10); g.clip();
    T.use(g); T.floor(AX - AW / 2 + 8, 38, AW - 16, AH - 34);
    g.translate(AX, AY + 14);
    const live = b.pack && b.problem, c = live ? ((t - b.castT) % CYCLE + CYCLE) % CYCLE : -1;
    const hit = live ? touched(b) : [], has = k => b.keys.includes(k), on = u => hit.includes(u);
    const P = b.pack ? F.PACKS[b.pack] : null, rgb = P ? P.rgb : '0,0,0', tgt = b.problem || 'demon';
    const e = c < 1 ? 0 : ease(clamp((c - 1) / .5)), fade = c > CYCLE - .5 ? (CYCLE - c) / .5 : 1, E = e * fade;
    const pos = {};
    Object.entries(POS).forEach(([k, [x, y]]) => {
      let px = x, py = y;
      if (on(k) && k !== 'you' && has('Push')) { const a = Math.atan2(y - POS.you[1], x - POS.you[0]); px += Math.cos(a) * 46 * E; py += Math.sin(a) * 46 * E; }
      pos[k] = [px, py];
    });
    const [ux, uy] = pos.you, [tx, ty] = pos[tgt];
    // ground effects first
    if (live && c >= .5) {
      const k = clamp((c - .5) / .5), a = fade;
      if (P.shape === 'storm') { g.fillStyle = `rgba(${rgb},${.12 * a * k})`; g.fillRect(-AW, -AH, AW * 2, AH * 2); g.strokeStyle = `rgba(${rgb},${.55 * a})`; g.lineWidth = 2; for (let i = 0; i < 40; i++) { const rx = ((i * 97 + t * 40) % 360) - 180, ry = ((i * 53 + t * 260) % 400) - 200; g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx - 4, ry + 12); g.stroke(); } }
      if (P.shape === 'cloud') for (let i = 0; i < 9; i++) { const an = i / 9 * Math.PI * 2 + t * .3; g.fillStyle = `rgba(${rgb},${.32 * a * k})`; g.beginPath(); g.arc(tx + Math.cos(an) * 34 * k, ty + Math.sin(an) * 26 * k, 30 * k, 0, Math.PI * 2); g.fill(); }
      if (P.shape === 'nova') T.zone(tx, ty, 72 * k, a, rgb);
    }
    if (has('Wet') && live) hit.forEach(u => { const [x, y] = pos[u]; g.fillStyle = `rgba(63,143,214,${.25 * E})`; g.beginPath(); g.ellipse(x, y + 18, 30, 12, 0, 0, Math.PI * 2); g.fill(); });
    // the Flame Demon's aura: out when extinguished (or soaked)
    const doused = live && on('demon') && (has('Extinguish') || has('Wet')) ? E : 0;
    const [dx, dy] = pos.demon;
    if (doused < 1) { const fl = 1 - doused; for (let i = 0; i < 10; i++) { const an = i / 10 * Math.PI * 2 + t * 2, r = 30 + 6 * Math.sin(t * 9 + i * 2); g.fillStyle = `rgba(${i % 2 ? '255,140,40' : '229,80,45'},${.55 * fl})`; g.beginPath(); g.arc(dx + Math.cos(an) * r * .8, dy + Math.sin(an) * r * .8, 12 * fl, 0, Math.PI * 2); g.fill(); } }
    if (doused > 0 && c < 2.2) T.poof(dx, dy - 10, c - 1, 26);
    // units
    const hidden = u => live && on(u) && has('Stealth') && P.shape !== 'storm' ? 1 - .65 * E : 1;
    const drained = live && on('mage') && has('Drain') ? E : 0, charged = live && on('mage') && has('Shock') ? E : 0;
    const healed = u => live && on(u) && has('Heal') ? E : 0;
    T.player(...pos.ally, -.3, .8, hidden('ally'), C.p2);
    T.foe(dx, dy, 22, Math.atan2(uy - dy, ux - dx), '#e5622d', { mark: 'horns', a: hidden('demon'), hp: .6 + .3 * healed('demon') - (on('demon') && c > 1 && !has('Heal') && !has('Burn') ? .15 * E : 0), hpMax: 1 });
    const [mx, my] = pos.mage;
    T.foe(mx, my, 18, Math.atan2(uy - my, ux - mx), '#5562eb', { mark: 'staff', edge: '#2a3590', a: hidden('mage'), hp: .6 + .3 * healed('mage'), hpMax: 1 });
    const charge = clamp(.75 - .75 * drained + .25 * charged);
    g.fillStyle = 'rgba(21,32,68,.75)'; g.fillRect(mx - 20, my + 25, 40, 8); g.fillStyle = '#ffd34a'; g.fillRect(mx - 18, my + 27, 36 * charge, 4);
    T.player(ux, uy, Math.atan2(ty - uy, tx - ux), .9, 1);
    if (live && on('demon') && has('Root')) { g.strokeStyle = `rgba(76,154,82,${E})`; g.lineWidth = 3; g.beginPath(); g.ellipse(dx, dy + 16, 26, 9, 0, 0, Math.PI * 2); g.stroke(); }
    if (live && on('mage') && has('Root')) { g.strokeStyle = `rgba(76,154,82,${E})`; g.lineWidth = 3; g.beginPath(); g.ellipse(mx, my + 14, 22, 8, 0, 0, Math.PI * 2); g.stroke(); }
    // delivery
    if (live && c >= .5 && c < 1.3) {
      const k = clamp((c - .5) / .5), a = 1 - clamp((c - 1.1) / .2);
      if (P.shape === 'whip') { g.strokeStyle = `rgba(${rgb},${a})`; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(ux, uy); g.quadraticCurveTo((ux + tx) / 2 + 40 * (1 - k), (uy + ty) / 2 - 50 * (1 - k), lerp(ux, tx, k), lerp(uy, ty, k)); g.stroke(); }
      if (P.shape === 'bolt' || P.shape === 'beam') T.tracer(tx, ty - 200 * (P.shape === 'bolt'), tx, ty, a * k, `rgb(${rgb})`, P.shape === 'beam' ? 10 : 5);
      if (P.shape === 'cloud') T.tracer(ux, uy, lerp(ux, tx, k), lerp(uy, ty, k), a, `rgb(${rgb})`, 6);
      if (k >= 1) T.flash(tx, ty, 40, a);
    }
    // drain: a tether from the target back to you
    if (live && has('Drain') && hit.some(u => u === 'demon' || u === 'mage') && c > 1 && c < 2.6) T.beam(tx, ty, ux, uy, t, fade);
    // pops
    const pop = (s, x, y, col, at) => { const a = c - at; if (a > 0 && a < 1) T.popText(s, x, y - 34 - a * 24, col, 1 - a); };
    if (live) {
      hit.forEach(u => { if (has('Heal')) pop('+', ...pos[u], C.good, 1.4); });
      if (has('Lifesteal') && hit.some(u => u === 'demon' || u === 'mage')) pop('+', ux, uy, C.good, 1.9);
      if (doused) pop('fire out', dx, dy - 8, '#11555c', 1.2);
      if (drained) pop('drained', mx, my - 8, C.purple, 1.6);
      if (charged) pop('charged up', mx, my - 8, C.goldInk, 1.4);
      if (on('demon') && has('Burn')) pop('immune', dx, dy - 8, C.redDk, 1.3);
      // the Mage strikes back unless drained; wet things conduct it
      if (!drained && c > 2.7 && c < 3.4) {
        const wet = has('Wet') ? hit.filter(u => u !== 'mage') : [], chain = [[mx, my], ...(wet.length ? wet.map(u => pos[u]) : [[ux, uy]])];
        g.strokeStyle = `rgba(255,211,74,${1 - (c - 2.7) / .7})`; g.lineWidth = charged ? 6 : 4; g.lineJoin = 'round';
        for (let i = 0; i < chain.length - 1; i++) { const [x0, y0] = chain[i], [x1, y1] = chain[i + 1]; g.beginPath(); g.moveTo(x0, y0); for (let j = 1; j < 6; j++) g.lineTo(lerp(x0, x1, j / 6) + (j % 2 ? 9 : -9), lerp(y0, y1, j / 6) + (j % 2 ? -7 : 7)); g.lineTo(x1, y1); g.stroke(); }
        if (wet.length) pop('arcs through wet', mx - 40, my - 14, C.goldInk, 2.8);
      }
    }
    if (!live) { T.label(b.problem ? 'Pick a theme to test it' : 'Pick a problem to start', 0, -AH / 2 + 50, 'center', C.muted, 14); }
    g.restore();
    // results
    panel(g, AX - AW / 2, 410, AW, 162, { title: 'What it did' });
    const res = live ? outcomes(b) : [];
    if (!res.length && live) text(g, 'Nothing it touched responds to these keywords.', AX, 470, { size: 13.5, col: C.muted });
    res.slice(0, 5).forEach(([u, s, k], i) => {
      const tone = k === 'solve' ? TONE.green : k === 'backfire' ? TONE.red : TONE.gold;
      chip(g, k === 'solve' ? 'solves' : k === 'backfire' ? 'backfires' : 'side effect', AX - AW / 2 + 16, 450 + i * 24, { ...tone, size: 11, align: 'left', width: 78 });
      text(g, `${u}: ${s}`, AX - AW / 2 + 102, 451 + i * 24, { align: 'left', size: 12.5, w: 600 });
    });
  }

  // ---------- compare tray ----------
  function tray(g, names, t, a = 1) {
    g.save(); g.globalAlpha = a;
    panel(g, 366, 12, 662, 560, { fill: 'rgba(255,252,244,.96)', title: 'Three abilities, minutes apart' });
    names.slice(-3).forEach((n, i) => {
      const p = F.PRESETS.find(x => x.name === n), x = 476 + i * 222;
      card(g, x, 260, 206, 380, { edge: C.navy });
      icon(g, F.PACKS[p.pack].icon, x, 120, 64);
      text(g, p.name, x, 176, { size: 17, w: 800, display: true });
      wrap(g, p.desc, x, 204, 176, { size: 12.5, col: C.muted, align: 'center', lh: 15 });
      text(g, F.PROBLEMS[p.problem].name, x, 270, { size: 13, w: 700, col: C.navy });
      p.keys.forEach((k, j) => {
        const shared = k === 'Extinguish', glow = shared ? .5 + .5 * Math.sin(t * 4) : 0;
        if (shared) { g.fillStyle = `rgba(253,214,99,${.4 + .4 * glow})`; g.beginPath(); g.roundRect(x - 64, 302 + j * 34 - 15, 128, 30, 9); g.fill(); }
        chip(g, `[${k}]`, x, 302 + j * 34, { ...TONE[F.tone(k)], size: 14 });
      });
      chip(g, `[${p.pack}]`, x, 420, { ...TONE.purple, size: 13 });
    });
    if (names.length >= 3) wrap(g, 'Smothering Smoke and Restoring Rain act very differently, but both carry [Extinguish], so both work on the Flame Demon.', 697, 486, 560, { size: 16, w: 700, col: C.navy, align: 'center', lh: 21 });
    g.restore();
  }

  scene('forge', {
    dur: DUR,
    state: () => ({ problem: null, keys: [], pack: null, castT: 0, tray: [], compare: false }),
    init(s, st, api) {
      const take = () => { if (st.tour) { api.manual(); Object.assign(st, { problem: null, keys: [], pack: null, compare: false }); } };
      const changed = () => { st.castT = st.t; st.compare = false; if (st.pack && st.problem) { const n = F.nameOf(st.keys, st.pack); if (F.PRESETS.some(p => p.name === n) && st.tray[st.tray.length - 1] !== n) st.tray = [...st.tray.filter(x => x !== n), n]; } sync(); };
      const box = $(s, '.fg-presets');
      box.innerHTML = F.PRESETS.map((p, i) => `<button class="btn" data-i="${i}">${p.name}</button>`).join('') + `<button class="btn" data-i="-1">Clear</button>`;
      $$(box, '.btn').forEach(b => b.onclick = () => { take(); const p = F.PRESETS[+b.dataset.i]; Object.assign(st, p ? { problem: p.problem, keys: [...p.keys], pack: p.pack } : { problem: null, keys: [], pack: null }); changed(); });
      const cmp = $(s, '.fg-compare');
      cmp.onclick = () => { take(); st.compare = !st.compare; if (st.compare && st.tray.length < 3) st.tray = F.PRESETS.map(p => p.name); sync(); };
      function sync() { cmp.classList.toggle('on', st.compare); }
      pointer(api.cv, (x, y, type) => {
        if (type !== 'down') return;
        if (st.compare && !st.tour) { st.compare = false; return sync(); }
        PK.forEach((k, i) => { if (inBox(x, y, ...PC[i], 158, 84)) { take(); st.problem = k; changed(); } });
        F.KEYWORDS.forEach(([k], i) => { if (inBox(x, y, ...KC(i), 150, 26)) { take(); st.keys = st.keys.includes(k) ? st.keys.filter(q => q !== k) : st.keys.length < 3 ? [...st.keys, k] : st.keys; changed(); } });
        PACKS.forEach((p, i) => { const [px, py] = PT(i); if (inBox(x, y, px, py + 4, 100, 68)) { take(); st.pack = p; changed(); } });
      });
    },
    draw(g, t, st, tour) {
      const b = build(t, st, tour);
      steps(g, b, t, tour);
      const ta = b.compare ? (tour ? clamp(b.end / .5) : 1) : 0;
      if (ta < 1) { g.save(); g.globalAlpha = 1 - ta; abilityCard(g, b, t); arena(g, b, t); g.restore(); }
      if (ta) tray(g, b.tray, t, ta);
    },
    side(t, st, tour) {
      const b = build(t, st, tour);
      const res = b.pack && b.problem ? outcomes(b) : [];
      const n = k => res.filter(o => o[2] === k).length;
      const stats = `<div class="g"><b>${n('solve')}</b><span>solves the problem</span></div><div class="y"><b>${n('side')}</b><span>side effects</span></div><div class="r"><b>${n('backfire')}</b><span>backfires</span></div>`;
      let out = 'Pick a problem, then keywords, then a theme. The arena tests what you made.';
      if (b.compare) out = 'Three abilities from one framework. Smoke and Rain share [Extinguish], so each one works on the Flame Demon without new rules.';
      else if (b.pack && b.problem) out = `<b>${F.nameOf(b.keys, b.pack)}</b>: ${solved(b) ? 'solves the problem' : 'misses the problem'}${res.length ? '. ' + res.map(o => `${o[0]}: ${o[1]}`).join('; ') : ''}.`;
      return { stats, out };
    },
  });
})();
