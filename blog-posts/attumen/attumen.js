/* Attumen the Huntsman (post-mortem: "Attumen the Huntsman: The Dangers of Neglecting Research").
   Written for readers who have never played World of Warcraft. Version 1 and version 2 of the fight use almost the
   same ability names; the difference is whether the players can do anything about each one. Each problem is a small
   scene, shown before (version 1) and after (version 2, what shipped), with a plain-language caption and one question:
   could the players do anything about it? Every scene is a pure function of time, so __seek is deterministic. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585, LEN = 7;
  const img = {}; const IC = n => { if (!img[n]) { const i = new Image(); i.src = `../img/${n}.jpg`; img[n] = i; } return img[n]; };
  const icon = (g, n, x, y, s) => { const i = IC(n); if (i.complete && i.naturalWidth) g.drawImage(i, x, y, s, s); };

  // the cast, in plain words
  const BOSS = { x: 300, y: 230 }, HORSE = { x: 470, y: 200 };
  const P0 = {
    tank: { x: 300, y: 150, col: '#5562eb', name: 'tank' },
    m1: { x: 250, y: 205, col: '#e08a2c', name: 'fighter' }, m2: { x: 350, y: 205, col: '#e08a2c', name: 'fighter' },
    r1: { x: 150, y: 430, col: '#8a4fd6', name: 'archer' }, r2: { x: 450, y: 430, col: '#8a4fd6', name: 'mage' },
    heal: { x: 300, y: 470, col: '#2fae63', name: 'healer' },
  };
  const pos = (k, over) => ({ ...P0[k], ...(over && over[k]) });
  const mix = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) });

  function room(g) {
    g.save(); g.beginPath(); g.roundRect(10, 10, 600, 565, 14); g.clip(); T.floor(10, 10, 600, 565); g.restore();
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(10, 10, 600, 565, 14); g.stroke();
  }
  function cast(g, P, o = {}) {
    Object.entries(P).forEach(([k, p]) => {
      if (o.hide && o.hide.includes(k)) return;
      T.player(p.x, p.y, Math.atan2(BOSS.y - p.y, BOSS.x - p.x), .7, 1, p.col);
      if (o.hit && o.hit.includes(k)) T.flash(p.x, p.y, 34, .8);
      if (o.stun === k) T.label('stunned', p.x, p.y - 28, 'center', C.red, 12);
      if (o.names) T.label(p.name, p.x, p.y + 28, 'center', C.muted, 11, 'rgba(255,252,244,.75)');
    });
  }
  const boss = (g, ang = -Math.PI / 2, o = {}) => { T.foe(BOSS.x, BOSS.y, 30, ang, o.col || '#4a4a6a', { edge: C.navy, mark: 'horns', hp: o.hp, hpMax: 100, a: o.a }); T.label('Attumen, the boss', BOSS.x - 62, BOSS.y - 52, 'right', C.ink, 12, 'rgba(255,252,244,.8)'); };
  const horse = (g, x = HORSE.x, y = HORSE.y, ang = Math.PI, o = {}) => { T.foe(x, y, 24, ang, o.col || '#2b2b3a', { edge: C.navy, hp: o.hp, hpMax: 100, a: o.a }); if (Math.hypot(x - HORSE.x, y - HORSE.y) < 8) T.label('Midnight, his horse', x, y + 40, 'center', C.ink, 12, 'rgba(255,252,244,.8)'); };
  const tag = (g, t, x, y, col = C.ink) => T.label(t, x, y, 'center', col, 13);

  /* each problem: [id, menu label, ability icon, names before/after, captions before/after, response before/after, scene(g,u,after)] */
  const PROBLEMS = [
    {
      id: 'sweep', label: 'The sweep', icon: 'ability_warrior_cleave', names: ['Shadow Cleave: a chain', 'Shadow Cleave: a cone'],
      cap: ['The boss’s sweep hits the tank, then jumps to the two nearest fighters. They can stand anywhere: it finds them anyway.', 'The sweep now covers a cone in front of the boss. Fighters who stand behind him are never hit. Where you stand is the answer.'],
      resp: ['nothing: the jump always finds them', 'stand behind the boss'],
      draw(g, u, after) {
        // the fighters try to dodge by walking behind the boss
        const k = ease(clamp((u - 1) / 1.5)), behind = { m1: mix(P0.m1, { x: 270, y: 300 }, k), m2: mix(P0.m2, { x: 330, y: 300 }, k) };
        const P = { tank: pos('tank'), m1: { ...P0.m1, ...behind.m1 }, m2: { ...P0.m2, ...behind.m2 }, r1: pos('r1'), r2: pos('r2'), heal: pos('heal') };
        const swing = u > 3.5 && u < 4.6, a = 1 - (u - 3.5) / 1.1;
        if (!after && swing) { const pts = [BOSS, P.tank, P.m1, P.m2]; g.strokeStyle = `rgba(138,79,214,${a})`; g.lineWidth = 6; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.stroke(); }
        if (after) T.cone(BOSS.x, BOSS.y, -Math.PI / 2, .7, 140, swing ? 1 : .35, '138,79,214');
        boss(g); cast(g, P, { hit: swing ? (after ? ['tank'] : ['tank', 'm1', 'm2']) : [], names: true });
        if (u > 1 && u < 3.4) tag(g, 'the fighters step behind the boss', 300, 360);
        if (swing) tag(g, after ? 'only the tank is hit' : 'all three are hit anyway', 300, 360, after ? C.good : C.red);
        return { hits: after ? 1 : 3, could: after ? 1 : 3, dodged: after ? 2 : 0 };
      },
    },
    {
      id: 'charge', label: 'The horse’s charge', icon: 'ability_warrior_charge', names: ['Charge: anyone, then a stun', 'Charge: one of the three farthest'],
      cap: ['The horse charges whoever it likes, often the healer, then stuns the tank for a long time. While the tank is stunned the boss wanders off and attacks someone else.', 'The horse only charges one of the three people standing farthest away, so the group decides who that is: they send three sturdy players out and keep the healer close. The tank is only knocked down briefly.'],
      resp: ['nothing: you can’t tell who it will pick', 'choose who stands far away'],
      draw(g, u, after) {
        const far = after ? { r1: { x: 80, y: 520 }, r2: { x: 540, y: 520 }, m2: { x: 560, y: 60 }, heal: { x: 300, y: 330 } } : {};
        const P = {}; Object.keys(P0).forEach(k => P[k] = { ...P0[k], ...(far[k] || {}) });
        const victim = after ? 'r2' : 'heal', go = ease(clamp((u - 1.5) / .5)), back = ease(clamp((u - 3) / .6));
        const v = P[victim], hx = lerp(lerp(HORSE.x, v.x - 26, go), HORSE.x, back), hy = lerp(lerp(HORSE.y, v.y - 20, go), HORSE.y, back);
        if (u > .6 && u < 1.5) { g.setLineDash([6, 6]); g.strokeStyle = 'rgba(229,50,45,.7)'; g.lineWidth = 3; g.beginPath(); g.moveTo(HORSE.x, HORSE.y); g.lineTo(v.x, v.y); g.stroke(); g.setLineDash([]); }
        if (after) [P.r1, P.r2, P.m2].forEach(p => { g.strokeStyle = 'rgba(255,185,81,.9)'; g.lineWidth = 3; g.beginPath(); g.arc(p.x, p.y, 26, 0, TAU); g.stroke(); });
        // the stun: long before, short after; while stunned the boss turns to someone else
        const stunLen = after ? .8 : 2.6, stunned = u > 4 && u < 4 + stunLen, wander = !after && u > 4.6 && u < 6.6;
        boss(g, wander ? Math.atan2(P.heal.y - BOSS.y, P.heal.x - BOSS.x) : -Math.PI / 2); horse(g, hx, hy, Math.atan2(v.y - HORSE.y, v.x - HORSE.x));
        cast(g, P, { hit: u > 1.9 && u < 2.6 ? [victim] : wander ? ['heal'] : [], stun: stunned ? 'tank' : null, names: true });
        if (after && u < 1.6) tag(g, 'the three farthest: the group picked them', 300, 300, C.goldInk);
        if (!after && u > 1.9 && u < 3.4) tag(g, 'it picked the healer', P.heal.x, P.heal.y - 40, C.red);
        if (wander) tag(g, 'tank stunned: the boss goes after the healer', 300, 330, C.red);
        if (after && stunned) tag(g, 'knocked down for a moment, back up fast', 300, 110, C.good);
        return {};
      },
    },
    {
      id: 'miss', label: 'Hard to hit', icon: 'spell_shadow_twilight', names: ['Ghost form: half of all attacks miss', 'Intangible Presence: a curse that can be removed'],
      cap: ['The boss turns ghostly and half of every attack misses. Nobody can do anything about it; the fight just takes longer.', 'Now it is a curse on the people near the boss. Mages and druids can remove curses, so for them it is a job to do, and the misses stop.'],
      resp: ['nothing: wait it out', 'a mage or druid removes the curse'],
      draw(g, u, after) {
        const P = {}; Object.keys(P0).forEach(k => P[k] = { ...P0[k] });
        const cursed = after && u > 1 && u < 3.6, cleanse = after && u > 3.2 && u < 3.9;
        boss(g, -Math.PI / 2, { a: !after && u > 1 ? .5 : 1 });
        if (cursed) ['tank', 'm1', 'm2'].forEach(k => { const p = P[k]; g.fillStyle = 'rgba(138,79,214,.25)'; g.beginPath(); g.arc(p.x, p.y, 22, 0, TAU); g.fill(); icon(g, 'spell_shadow_curseofmannoroth', p.x + 12, p.y - 30, 16); });
        if (after && u > 2.2 && u < 3.6) { g.strokeStyle = 'rgba(87,182,255,.9)'; g.lineWidth = 3; g.setLineDash([5, 5]); g.beginPath(); g.moveTo(P.r2.x, P.r2.y); g.lineTo(P.m2.x, P.m2.y); g.stroke(); g.setLineDash([]); tag(g, 'the mage removes it', P.r2.x - 40, P.r2.y - 40, C.player); }
        if (cleanse) ['tank', 'm1', 'm2'].forEach(k => T.bubble(P[k].x, P[k].y, 24, u, 1 - (u - 3.2) / .7));
        cast(g, P, { names: true });
        // swings: each attacker's attacks, with misses popping
        const swings = ['tank', 'm1', 'm2', 'r1', 'r2'];
        let missRate = !after ? (u > 1 ? .5 : 0) : (cursed ? .5 : 0);
        for (let i = 0; i < 10; i++) {
          const t0 = (i * .7) % LEN, a = 1 - (u - t0) / .6; if (u < t0 || a <= 0) continue;
          const who = P[swings[i % 5]], miss = ((i * 7) % 10) / 10 < missRate;
          T.label(miss ? 'miss' : 'hit', lerp(who.x, BOSS.x, .6), lerp(who.y, BOSS.y, .6) - (1 - a) * 20, 'center', miss ? C.red : C.good, 12);
        }
        if (!after && u > 1) tag(g, 'ghost form: every attack has a 50% chance to miss', 300, 340, C.red);
        return {};
      },
    },
    {
      id: 'disarm', label: 'Taking his weapon', icon: 'ability_warrior_disarm', names: ['Disarm makes him enrage', 'Disarm makes him uppercut'],
      cap: ['A fighter knocks the boss’s weapon away, a clever move that usually weakens an enemy. Here it makes him attack faster and hit harder. Doing the smart thing makes the fight worse.', 'Now losing his weapon makes him switch to uppercuts. It still feels like something changed, but the fight does not punish the players for using their tools.'],
      resp: ['using your tool makes it worse', 'use it freely'],
      draw(g, u, after) {
        const P = {}; Object.keys(P0).forEach(k => P[k] = { ...P0[k] });
        const dis = u > 1.5, fly = ease(clamp((u - 1.5) / .8));
        boss(g, -Math.PI / 2, { col: !after && dis ? '#c0392b' : '#4a4a6a' });
        if (u > 1.5) { const wx = lerp(BOSS.x + 20, BOSS.x + 120, fly), wy = lerp(BOSS.y - 10, BOSS.y + 60, fly) - Math.sin(fly * Math.PI) * 60; g.save(); g.translate(wx, wy); g.rotate(fly * 8); g.fillStyle = '#8a8fa8'; g.fillRect(-22, -3, 44, 6); g.restore(); }
        if (u > 1.2 && u < 2) tag(g, 'a fighter disarms the boss', P0.m2.x + 30, P0.m2.y - 34, C.ink);
        cast(g, P, { hit: (Math.floor(u * (after || !dis ? 1.5 : 4)) % 2 === 0 && u > .5) ? ['tank'] : [], names: true });
        // damage on the tank per second
        const dps = !dis ? 100 : after ? 100 : 160;
        g.fillStyle = '#e6dcc5'; g.fillRect(90, 520, 420, 16); g.fillStyle = dps > 100 ? C.red : C.gold; g.fillRect(90, 520, 420 * dps / 180, 16);
        g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'left'; g.fillText(`damage on the tank: ${dps}%`, 90, 512);
        if (dis) tag(g, after ? 'uppercuts instead: same damage' : 'enraged: faster and harder', 300, 330, after ? C.good : C.red);
        return {};
      },
    },
    {
      id: 'merge', label: 'The halfway point', icon: 'ability_mount_dreadsteed', names: ['At half health, both reset', 'At half health, they combine and keep the damage'],
      cap: ['The boss and his horse each have health. When either reaches half, both vanish and a new mounted boss appears at full health. Any damage done to the other one is thrown away, so there is no reason to fight both.', 'Now the one with more health becomes the mounted boss and keeps the damage already done. Players who hit several enemies at once get to keep their extra work.'],
      resp: ['nothing: the damage is thrown away', 'damage on both counts'],
      draw(g, u, after) {
        const P = {}; Object.keys(P0).forEach(k => P[k] = { ...P0[k] });
        const k = clamp(u / 3.5), bossHp = lerp(100, 50, k), horseHp = lerp(100, 62, k), merged = u > 3.6;
        const mergedHp = after ? Math.min(bossHp, horseHp) + 0 : 100, fade = clamp((u - 3.6) / .6);
        if (!merged) { boss(g, -Math.PI / 2, { hp: bossHp }); horse(g, HORSE.x, HORSE.y, Math.PI, { hp: horseHp }); }
        else { T.poof(BOSS.x, BOSS.y, u - 3.6, 40); T.foe(BOSS.x, BOSS.y, 36, -Math.PI / 2, '#3a3a5a', { edge: C.navy, mark: 'horns', hp: after ? 62 : 100, hpMax: 100, a: fade }); }
        cast(g, P, { names: true });
        if (merged) tag(g, after ? 'mounted boss keeps the damage: 62% left' : 'new mounted boss: back to 100%', 300, 330, after ? C.good : C.red);
        else tag(g, 'the group damages both', 390, 120);
        // progress thrown away
        const lost = !after && merged ? (100 - 62) + 50 : 0;
        g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'left'; g.fillText(`damage thrown away: ${lost}%`, 90, 512);
        g.fillStyle = '#e6dcc5'; g.fillRect(90, 520, 420, 16); g.fillStyle = C.red; g.fillRect(90, 520, 420 * lost / 100, 16);
        return {};
      },
    },
  ];

  function draw(g, pi, after, u) {
    T.use(g); g.clearRect(0, 0, W, H);
    room(g);
    const pr = PROBLEMS[pi];
    pr.draw(g, u, after);
    // right: what you are looking at
    const x0 = 630; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.fillStyle = 'rgba(255,252,244,.9)'; g.beginPath(); g.roundRect(x0, 10, 400, 565, 14); g.fill();
    g.font = '600 13px Jost, sans-serif'; g.fillStyle = after ? C.good : C.red; g.fillText(after ? 'AFTER: version 2, what shipped' : 'BEFORE: version 1', x0 + 18, 38);
    icon(g, pr.icon, x0 + 18, 50, 44);
    g.font = '800 18px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.fillText(pr.label, x0 + 74, 70);
    g.font = '500 13px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText(pr.names[after ? 1 : 0], x0 + 74, 90);
    // wrapped caption
    g.font = '500 16px Jost, sans-serif'; g.fillStyle = C.ink;
    const words = pr.cap[after ? 1 : 0].split(' '); let line = '', y = 136;
    words.forEach(w => { if (g.measureText(line + w).width > 360) { g.fillText(line, x0 + 18, y); y += 24; line = ''; } line += w + ' '; }); g.fillText(line, x0 + 18, y);
    // the question
    const yq = 400;
    g.font = '600 14px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText('Can the players do anything about it?', x0 + 18, yq);
    g.font = '800 34px Montserrat, Jost, sans-serif'; g.fillStyle = after ? C.good : C.red; g.fillText(after ? 'Yes' : 'No', x0 + 18, yq + 44);
    g.font = '600 15px Jost, sans-serif'; g.fillStyle = C.ink; g.fillText(pr.resp[after ? 1 : 0], x0 + 18, yq + 72);
    // the five, as a strip
    PROBLEMS.forEach((p, i) => { const x = x0 + 18 + i * 74, on = i === pi; g.globalAlpha = on ? 1 : .45; icon(g, p.icon, x, 510, 36); g.globalAlpha = 1; if (on) { g.strokeStyle = C.gold; g.lineWidth = 3; g.strokeRect(x - 2, 508, 40, 40); } });
  }

  const DUR = PROBLEMS.length * LEN * 2;
  const tourAt = t => { const k = Math.floor(t / LEN) % (PROBLEMS.length * 2); return { pi: Math.floor(k / 2), after: k % 2 === 1, u: t % LEN }; };
  const scenes = {};
  canvasDemo('attumen', (s, cv, g) => {
    const st = { t: 0, tour: true, held: false, pi: 0, after: false, u: 0, key: '' };
    const menu = $(s, '.at-menu'), tourBtn = $(s, '.at-tour'), verBtns = $$(s, '.at-ver .btn');
    menu.innerHTML = PROBLEMS.map((p, i) => `<button class="btn" data-i="${i}">${p.label}</button>`).join('');
    const mBtns = $$(menu, '.btn');
    const sync = () => { mBtns.forEach((b, i) => b.classList.toggle('on', i === st.pi)); verBtns.forEach(b => b.classList.toggle('on', (b.dataset.v === 'after') === st.after)); };
    const manual = () => { st.tour = false; tourBtn.classList.remove('on'); };
    mBtns.forEach((b, i) => b.onclick = () => { manual(); st.pi = i; st.u = 0; });
    verBtns.forEach(b => b.onclick = () => { manual(); st.after = b.dataset.v === 'after'; st.u = 0; });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    function frame() {
      if (st.tour) Object.assign(st, tourAt(st.t));
      draw(g, st.pi, st.after, st.u); sync();
      const key = [st.pi, st.after].join(); if (key === st.key) return; st.key = key;
      say($(s, '.at-out'), st.after ? 'Same ability name, but now the players have something to do about it.' : 'Watch what the players try, and whether it helps.');
    }
    scenes.attumen = { seek(t) { st.held = true; st.tour = true; st.t = t; frame(); }, dur: () => DUR };
    return dt => { if (st.held) return; dt = Math.max(0, dt); if (st.tour) { st.t += dt; if (st.t >= DUR) st.t = 0; } else { st.u += dt; if (st.u >= LEN) st.u = 0; } frame(); };
  });
  window.__seek = (t, which = 'attumen') => scenes[which].seek(t);
  window.__dur = (which = 'attumen') => scenes[which].dur();
})();
