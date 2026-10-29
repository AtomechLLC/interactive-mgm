/* More of the enemy creation framework (MGM C4 M7, deck slides 154-183).
   'archetype-context' (156): "A bull you can dodge out of the way of in an action game doesn't make sense in a turn-based RPG
   where the enemy always hits its target." The charger of slide 154 ("charges at you like a bull, and gets stunned when it
   hits a wall") beside Tauros using Take Down in a Pokémon battle.
   'paladin-variants' (178-180): variants are thematic (a colour swap, "like in the classic Final Fantasy games") or
   mechanical ("the healing auras are replaced with hazardous ones"), and keywords scale them: Flames is weak to
   [Extinguish], Lightning to [Drain].
   'structured-unstructured' (181-183): the enemy framework takes any three archetypes; the ability framework has rules.
   'zoom-encounter' (174-175): the camera pulls back from one creature to a room of them: "FPS Encounters = many enemies". */
(function () {
  const { $, $$ } = FPF.kit;
  const { pic, icon, text, wrap, card, chip, TONE, panel, scene, pointer, inBox, clamp, ease, lerp } = CK;
  const T = TD, C = TD.C, TAU = Math.PI * 2, A = Object.assign({}, window.ARCH.ARCH, { grappler: { name: 'Grappler', gi: 'grab', col: '#8a5a2a' } });
  const ph = (t, a, b) => clamp((t - a) / (b - a));

  // ---------- archetypes depend on your game ----------
  function charger(g, a) {
    // telegraph, charge past the dodging player into the wall, stunned, punished
    const wallX = 186, sx = -200, tel = a > .4 && a < 1.4, run = ph(a, 1.4, 2.1), back = ph(a, 4.6, 5.6);
    const fx = a < 4.6 ? lerp(sx, wallX - 30, ease(run)) : lerp(wallX - 30, sx, ease(back)), fy = 0;
    const dodge = ease(ph(a, 1.55, 1.8)) * (1 - ease(ph(a, 4.4, 4.9)));
    const px = lerp(20, 100, ph(a, 2.6, 3.1) * (1 - ph(a, 4.3, 4.9))), py = -80 * dodge;
    T.wall(wallX, -190, 60, 380);
    if (tel) T.laser(fx + 20, fy, wallX, fy, .4 + .4 * Math.sin(a * 14));
    if (run > 0 && run < 1) for (let i = 1; i < 4; i++) T.poof(fx - i * 26, fy + 10, (a * 3 + i * .2) % .8, 10);
    T.foe(fx, fy, 24, 0, '#8a5a2a', { mark: 'horns' });
    GI.draw(g, 'charging-bull', fx, fy - 46, 30, '#8a5a2a');
    if (a > 2.1 && a < 4.4) { for (let j = 0; j < 3; j++) { const an = a * 5 + j * 2.1; g.fillStyle = C.gold; g.beginPath(); g.arc(fx + Math.cos(an) * 18, fy - 32 + Math.sin(an) * 5, 4, 0, TAU); g.fill(); } T.label('stunned', fx, fy + 42, 'center', C.goldInk, 13); }
    if (a > 1.6 && a < 2.4) T.label('dodge!', px, py - 34, 'center', C.blue, 13);
    for (let i = 0; i < 3; i++) { const h = a - 3.2 - i * .35; if (h >= 0 && h < .25) T.tracer(px + 14, py, fx + 20, fy, 1 - h / .25, C.gold, 5); if (h > .1 && h < .9) T.popText('-25', fx, fy - 70 - h * 20, C.redDk, 1 - h / .9); }
    T.player(px, py, Math.atan2(fy - py, fx - px), 1);
  }
  function battle(g, a) {
    // Tauros vs Pikachu: Take Down resolves, nothing to dodge
    g.fillStyle = '#cfe8b8'; g.fillRect(-250, -150, 500, 300);
    g.fillStyle = '#b7d89c'; g.beginPath(); g.ellipse(110, -30, 100, 26, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(-110, 100, 100, 26, 0, 0, TAU); g.fill();
    const lunge = Math.sin(ph(a, 1.4, 2) * Math.PI), shake = a > 1.8 && a < 2.4 ? Math.sin(a * 60) * 6 : 0;
    pic(g, 'pk-pikachu.png', 110 + shake, -70, 110);
    pic(g, 'pk-tauros.png', -110 + lunge * 150, 50 - lunge * 90, 150, { flip: true });
    if (a > 1.9 && a < 3.2) chip(g, 'Hit', 110, -140, { fill: '#fffaf0', edge: C.redDk, col: C.redDk, size: 15, a: 1 - ph(a, 2.8, 3.2) });
    card(g, 0, 128, 460, 40, { edge: C.navy, lw: 3, r: 8, shadow: false });
    text(g, a < 1.2 ? 'What will Tauros do?' : a < 3.6 ? 'Tauros used Take Down!' : 'It always connects: no dodge button.', -214, 128, { align: 'left', size: 15, w: 700 });
  }

  scene('archetype-context', {
    dur: 12,
    draw(g, t) {
      const a = t % 6;
      [[270, 'Action game', 'Read the charge, dodge, punish the stun', charger, 'Charger'], [780, 'Turn-based RPG', 'The move resolves; you plan around it instead', battle, 'Tauros, Pokémon']].forEach(([x, title, line, fn, who]) => {
        panel(g, x - 250, 14, 500, 500, { title });
        text(g, who, x + 234, 34, { align: 'right', size: 13, w: 700, col: C.muted });
        g.save(); g.beginPath(); g.roundRect(x - 236, 48, 472, 380, 10); g.clip(); T.use(g); if (fn === charger) T.floor(x - 236, 48, 472, 380); g.translate(x, 238); fn(g, a); g.restore();
        g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(x - 236, 48, 472, 380, 10); g.stroke();
        text(g, line, x, 464, { size: 16, w: 800, col: C.navy });
      });
      text(g, 'Same idea, a charging beast. Different games, different archetype lists.', 520, 548, { size: 17, w: 800, display: true, col: C.ink });
    },
    side() { return { out: 'A charge you can sidestep is an archetype in an action game. In a turn-based battle the same beast just hits, so the archetype list you build depends on your game.' }; },
  });

  // ---------- paladin variants ----------
  const VAR = [
    { k: 'base', name: 'Paladin', icon: 'wow-classicon_paladin.jpg', col: '#d9b04a', edge: '#8a6a1a', rgb: '47,174,99', weak: null, hazard: null },
    { k: 'flames', name: 'Flames', icon: 'wow-spell_fire_sealoffire.jpg', col: '#e5622d', edge: '#8a2a10', rgb: '229,98,45', weak: 'Extinguish', hazard: 'Burning aura: hurts you up close' },
    { k: 'wind', name: 'Wind', icon: 'wow-spell_nature_cyclone.jpg', col: '#5fb3bb', edge: '#11555c', rgb: '95,179,187', weak: null, hazard: 'Gale aura: shoves you out of range' },
    { k: 'lightning', name: 'Lightning', icon: 'wow-spell_nature_lightningshield.jpg', col: '#d6aa28', edge: '#7a5a00', rgb: '214,170,40', weak: 'Drain', hazard: 'Shock aura: zaps whoever is close' },
  ];
  const VTOUR = [[0, 0, 0], [2.8, 1, 0], [5.6, 1, 1], [8.4, 2, 1], [11.2, 3, 1]], VX = 380, VY = 300;
  function vview(t, st, tour) { if (!tour) return { v: st.v, mech: st.mech, at: st.at }; let i = 0; while (i + 1 < VTOUR.length && t >= VTOUR[i + 1][0]) i++; return { v: VTOUR[i][1], mech: !!VTOUR[i][2], at: VTOUR[i][0] }; }

  scene('paladin-variants', {
    dur: 14.5,
    state: () => ({ v: 1, mech: false, at: 0 }),
    init(s, st, api) {
      const sync = () => { $$(s, '.pv-var').forEach(b => b.classList.toggle('on', +b.dataset.v === st.v)); $$(s, '.pv-kind').forEach(b => b.classList.toggle('on', (b.dataset.m === '1') === st.mech)); };
      $$(s, '.pv-var').forEach(b => b.onclick = () => { api.manual(); st.v = +b.dataset.v; st.at = st.t; sync(); });
      $$(s, '.pv-kind').forEach(b => b.onclick = () => { api.manual(); st.mech = b.dataset.m === '1'; st.at = st.t; sync(); });
      sync();
    },
    draw(g, t, st, tour) {
      const { v, mech, at } = vview(t, st, tour), V = VAR[v], hazard = mech && V.hazard, since = t - at;
      panel(g, 14, 14, 732, 558, { title: v === 0 ? 'The original' : mech ? 'Mechanical variant: the aura changes what it does' : 'Thematic variant: new colours, same fight' });
      g.save(); g.beginPath(); g.roundRect(26, 44, 708, 516, 10); g.clip(); T.use(g); T.floor(26, 44, 708, 516);
      const x = VX + Math.cos(t * .6) * 60, y = VY + Math.sin(t * 1.1) * 30, R = 110, pulse = (t % 1.2) / 1.2;
      T.zone(x, y, R, 1, hazard ? V.rgb : '47,174,99');
      g.strokeStyle = `rgba(${hazard ? V.rgb : '47,174,99'},${.8 * (1 - pulse)})`; g.lineWidth = 3; g.beginPath(); g.arc(x, y, R * pulse, 0, TAU); g.stroke();
      // allies beside it (healed by the plain aura); the player at the edge
      [[-70, -50], [70, -40]].forEach(([ox, oy], i) => { if (!hazard) { T.foe(x + ox, y + oy, 13, 0, '#e07a6e'); if ((t + i * .5) % 1.2 < .6) T.popText('+', x + ox, y + oy - 26, C.good, 1 - ((t + i * .5) % 1.2) / .6); } });
      let px = x + 150, py = y + 30;
      if (hazard && V.k === 'wind') { const k = (t % 2) / 2; px = x + lerp(96, 210, ease(clamp(k * 3))) ; for (let j = 0; j < 4; j++) { const an = t * 6 + j * 1.6; g.strokeStyle = 'rgba(95,179,187,.8)'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 50 + j * 14, an, an + 1); g.stroke(); } }
      else if (hazard) px = x + 92 + Math.sin(t * 2) * 10;
      if (hazard && V.k === 'flames' && (t % 1) < .5) T.popText('burn', px, py - 36 - (t % 1) * 20, C.redDk, 1 - (t % 1) / .5);
      if (hazard && V.k === 'lightning' && (t % 1.4) < .25) { g.strokeStyle = '#ffd23c'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, y); for (let j = 1; j <= 5; j++) g.lineTo(lerp(x, px, j / 5) + (j % 2 ? 10 : -10), lerp(y, py, j / 5)); g.stroke(); T.popText('zap', px, py - 36, C.goldInk, 1 - (t % 1.4) / .25); }
      if (hazard && V.k === 'flames') for (let j = 0; j < 8; j++) { const an = j / 8 * TAU + t; GI.draw(g, 'flame', x + Math.cos(an) * (R - 14), y + Math.sin(an) * (R - 14), 20, '#e5622d'); }
      T.foe(x, y, 26, Math.PI, V.col, { mark: 'shield', edge: V.edge });
      T.player(px, py, Math.atan2(y - py, x - px), .9);
      g.restore();
      // the card
      panel(g, 758, 14, 268, 558, { title: 'Variant' });
      icon(g, V.icon, 892, 100, 64);
      text(g, v ? `${V.name} Paladin` : 'Paladin', 892, 156, { size: 20, w: 800, display: true });
      text(g, 'Defender + Zone Healer + Brute', 892, 180, { size: 12.5, col: C.muted });
      chip(g, v === 0 ? 'Original' : mech ? 'Mechanical' : 'Thematic', 892, 214, { ...(mech ? TONE.purple : TONE.grey), size: 14 });
      wrap(g, v === 0 ? 'Heal aura for its allies; shield up; a slow, heavy slam.' : mech ? V.hazard + '. Same body, new reason to keep your distance.' : 'Same heal aura, same shield, same slam. You already know how to fight it.', 780, 254, 226, { size: 14, lh: 18, col: C.ink });
      text(g, 'Weak to', 780, 372, { align: 'left', size: 14, w: 800 });
      if (v && V.weak) chip(g, `[${V.weak}]`, 780, 404, { ...TONE[V.weak === 'Drain' ? 'purple' : 'teal'], size: 15, align: 'left' });
      else text(g, v ? 'nothing yet: your call' : 'nothing special', 780, 404, { align: 'left', size: 14, col: C.muted, it: true });
      if (v && V.weak) wrap(g, V.weak === 'Extinguish' ? 'Smothering Smoke and Restoring Rain already carry it, so they already work here.' : 'Siphoning Strike already carries it, so it already works here.', 780, 446, 226, { size: 13.5, lh: 17, w: 700, col: C.navy });
      text(g, '+ Flames, + Wind, + Lightning', 892, 552, { size: 12.5, col: C.muted, a: since > 0 ? 1 : 1 });
    },
    side(t, st, tour) {
      const { v, mech } = vview(t, st, tour), V = VAR[v];
      if (!v) return { out: 'The paladin: a heal aura that moves with it. Now make variants.' };
      return { out: `<b>${V.name} Paladin, ${mech ? 'mechanical' : 'thematic'}.</b> ${mech ? V.hazard + '.' : 'A colour swap: cheap, familiar, same fight.'}${V.weak ? ` Weak to [${V.weak}], which existing abilities already carry.` : ''}` };
    },
  });

  // ---------- structured vs unstructured ----------
  const F = window.FORGE;
  const AK = Object.keys(A);
  const PURP = [['demon', 'Defeat the Flame Demon'], ['mage', 'Defeat the Lightning Mage'], [null, 'No problem in mind']];
  const PAY = [['Extinguish', 'Stealth'], ['Drain', 'Lifesteal'], ['Burn', 'Push'], ['Extinguish', 'Heal'], ['Shock', 'Root']];
  const PACK = ['Smoke', 'Necrotic', 'Rain', 'Storm', 'Holy', 'Frost'];
  // walk-through spins: [enemy reels], [purpose, payload, packaging]
  const SPINS = [[[0, 2, 4], [0, 0, 0]], [[3, 5, 1], [1, 2, 3]], [[6, 0, 2], [2, 1, 1]], [[4, 1, 5], [1, 1, 1]]];
  function judge([p, y, k]) {
    const P = PURP[p][0], keys = PAY[y];
    if (!P) return { ok: false, why: 'No purpose: what problem does it solve?' };
    const weak = F.PROBLEMS[P].weak;
    if (!keys.includes(weak)) return { ok: false, why: `Payload doesn’t address the purpose: the ${F.PROBLEMS[P].name} needs [${weak}].` };
    return { ok: true, why: `${F.nameOf(keys, PACK[k])}: it solves the problem.` };
  }
  function sview(t, st, tour) { if (!tour) return { s: st.spin, at: st.at }; const i = Math.min(SPINS.length - 1, Math.floor(t / 3.6)); return { s: SPINS[i], at: i * 3.6 + .3 }; }
  function reel(g, x, y, w, label, val, k, col) {
    text(g, label, x, y - 40, { size: 12.5, w: 800, col: C.muted });
    card(g, x, y, w, 52, { edge: C.navy, lw: 3, r: 8, shadow: false });
    g.save(); g.beginPath(); g.rect(x - w / 2 + 3, y - 23, w - 6, 46); g.clip();
    const off = (1 - k) * 46 * 3; wrap(g, val, x, y - off - (val.length > 18 ? 7 : 0), w - 14, { size: 13.5, w: 700, lh: 15, align: 'center', col });
    if (k < 1) { g.fillStyle = 'rgba(21,32,68,.08)'; g.fillRect(x - w / 2, y - 23, w, 46); }
    g.restore();
  }

  scene('structured-unstructured', {
    dur: 14.4,
    state: () => ({ spin: SPINS[0], at: -9 }),
    init(s, st, api) {
      const r = n => Math.floor(Math.random() * n);
      $(s, '.su-spin').onclick = () => { api.manual(); st.spin = [[r(AK.length), r(AK.length), r(AK.length)], [r(PURP.length), r(PAY.length), r(PACK.length)]]; st.at = st.t; };
    },
    draw(g, t, st, tour) {
      const { s, at } = sview(t, st, tour), since = t - at;
      const k = j => ease(clamp((since - j * .2) / .5));
      // enemy machine
      panel(g, 14, 14, 500, 558, { title: 'Unstructured: enemy creation' });
      text(g, 'Any three archetypes', 264, 74, { size: 17, w: 800, display: true });
      s[0].forEach((ai, j) => reel(g, 108 + j * 156, 168, 144, 'Archetype', A[AK[ai]].name, k(j), C.ink));
      s[0].forEach((ai, j) => { if (k(j) >= 1) GI.draw(g, A[AK[ai]].gi, 108 + j * 156, 232, 34, A[AK[ai]].col); });
      const eOk = since > 1.1;
      if (eOk) { card(g, 264, 352, 440, 110, { fill: '#d8f0df', edge: '#5fb47c', shadow: false }); text(g, 'Accepted', 264, 322, { size: 20, w: 800, display: true, col: C.good }); wrap(g, `${s[0].map(i => A[AK[i]].name).join(' + ')}: what do you imagine?`, 264, 352, 400, { size: 15, lh: 19, align: 'center', col: C.ink }); }
      wrap(g, '“You can add anything together and the ideas will probably work.”', 264, 470, 420, { size: 14, it: true, lh: 18, align: 'center', col: C.muted });
      // ability machine
      panel(g, 526, 14, 500, 558, { title: 'Structured: ability planning' });
      text(g, 'Purpose, then a payload that meets it', 776, 74, { size: 17, w: 800, display: true });
      const [p, y, kk] = s[1];
      reel(g, 620, 168, 144, 'Purpose', PURP[p][1], k(0), PURP[p][0] ? C.ink : C.muted);
      reel(g, 776, 168, 144, 'Payload', PAY[y].map(x => `[${x}]`).join(' '), k(1), C.ink);
      reel(g, 932, 168, 144, 'Packaging', `[${PACK[kk]}]`, k(2), C.ink);
      const J = judge(s[1]);
      if (since > 1.1) {
        card(g, 776, 352, 440, 110, { fill: J.ok ? '#d8f0df' : '#f9d9d6', edge: J.ok ? '#5fb47c' : '#e07b72', shadow: false });
        text(g, J.ok ? 'Accepted' : 'Rejected', 776, 322, { size: 20, w: 800, display: true, col: J.ok ? C.good : C.redDk });
        wrap(g, J.why, 776, 352, 400, { size: 15, lh: 19, align: 'center', col: C.ink });
      }
      wrap(g, 'Abilities have requirements to meet before they qualify as usable.', 776, 470, 420, { size: 14, it: true, lh: 18, align: 'center', col: C.muted });
    },
    side(t, st, tour) { const { s } = sview(t, st, tour), J = judge(s[1]); return { out: `Enemy machine: accepted. Ability machine: ${J.ok ? 'accepted' : 'rejected'}. ${J.why}` }; },
  });

  // ---------- zoom to the encounter ----------
  const ROOM = [
    { x: 0, y: 0, keys: ['sweeper', 'brute', 'grappler'], gi: 'crab', col: '#c2412c', name: 'Giant Crab', r: 30, role: 'Mini boss' },
    { x: -250, y: -140, keys: ['flailer'], gi: A.flailer.gi, col: A.flailer.col, r: 16, role: 'Fodder' },
    { x: -230, y: 150, keys: ['flailer'], gi: A.flailer.gi, col: A.flailer.col, r: 16, role: 'Fodder' },
    { x: 260, y: -150, keys: ['evader', 'fighter'], gi: A.evader.gi, col: A.evader.col, r: 18, role: 'Threat' },
    { x: 300, y: 110, keys: ['defender', 'healer', 'brute'], gi: 'templar-shield', col: '#c9a23a', name: 'Paladin', r: 24, role: 'Support' },
    { x: 20, y: 200, keys: ['rampager'], gi: A.rampager.gi, col: A.rampager.col, r: 20, role: 'Rushdown' },
  ];
  scene('zoom-encounter', {
    dur: 12,
    draw(g, t) {
      const z = lerp(2.6, .95, ease(ph(t, 2.2, 5.2))), roles = ph(t, 6.2, 6.8);
      g.save(); g.beginPath(); g.roundRect(14, 14, 1012, 558, 12); g.clip();
      g.translate(520, 300); g.scale(z, z);
      T.use(g); T.floor(-600, -360, 1200, 720);
      T.wall(-470, -280, 940, 24); T.wall(-470, 256, 940, 24); T.pillar(-120, -110, 36, 36); T.pillar(120, 60, 36, 36);
      ROOM.forEach((c, i) => {
        const wob = Math.sin(t * 1.4 + i) * 6;
        T.foe(c.x + wob, c.y, c.r, Math.atan2(-c.y, -400 - c.x), c.col);
        GI.draw(g, c.gi, c.x + wob, c.y, c.r * 1.1, '#fff');
        let cx = c.x - c.keys.length * 36; const fade = i === 0 ? 1 : ph(t, 4.4, 5.2);
        c.keys.forEach(k => { cx += chip(g, A[k].name, cx, c.y + c.r + 18, { ...TONE.grey, size: 12, a: fade, align: 'left' }) + 4; });
        if (c.name) text(g, c.name, c.x, c.y - c.r - 16, { size: 14, w: 800, col: C.navy, stroke: 4, a: fade });
        if (roles > 0) chip(g, c.role, c.x, c.y - c.r - (c.name ? 42 : 20), { fill: c.col, edge: c.col, col: '#fff', size: 13, a: roles });
      });
      T.player(-400, 20, 0, 1.1);
      g.restore();
      text(g, t < 2.2 ? 'One creature: three archetypes on one body' : t < 6 ? 'Zoom out: a room of them' : 'An encounter is a composition too', 520, 40, { size: 20, w: 800, display: true, col: C.navy, stroke: 6 });
      if (roles > 0) {
        text(g, 'FPS encounters = many enemies. Next: Doom Eternal’s map roles.', 520, 508, { size: 16, w: 800, col: C.ink, stroke: 6, a: roles });
      }
    },
    side(t) { return { out: t < 6 ? 'Archetypes combine into one creature, and creatures combine into a room.' : 'At the encounter level, each creature fills a role. Part 7 picks this up with Doom Eternal.' }; },
  });
})();
