/* Make the problem first, five more genres (deck slide 266's loop, this page's examples).
   Each slide is a PF.loop (next.js): the challenge appears first, then the tool that answers it, then more depth and breadth
   and one tool added with no challenge behind it, which step 4 cuts. "Then again" brings a new challenge.
   pf-moba (League of Legends), pf-battler (Pokémon), pf-raid (World of Warcraft), pf-towers (tower defense),
   pf-cards (a deckbuilder). Numbers and timings are illustrative. */
(function () {
  const { pic, icon, text, wrap, card, chip, TONE, clamp, ease, lerp } = CK;
  const { loop, tag, note, TEASE, ph } = PF;
  const C = TD.C, TAU = Math.PI * 2;
  const lab = (g, s, x, y, o = {}) => tag(g, s, x, y, o), dark = lab;
  const gi = (g, n, x, y, s, col, a = 1) => { g.save(); g.globalAlpha *= a; GI.draw(g, n, x, y, s, col); g.restore(); };
  function bar(g, x, y, w, h, k, col, o = {}) {
    g.save(); g.globalAlpha *= o.a ?? 1;
    g.fillStyle = o.back || 'rgba(20,26,51,.75)'; g.fillRect(x - w / 2, y - h / 2, w, h);
    g.fillStyle = col; g.fillRect(x - w / 2, y - h / 2, w * clamp(k), h);
    g.strokeStyle = o.edge || '#141a33'; g.lineWidth = 1.5; g.strokeRect(x - w / 2, y - h / 2, w, h); g.restore();
  }
  function disc(g, img, x, y, r, ring, o = {}) {
    g.save(); g.globalAlpha *= o.a ?? 1; g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip(); pic(g, img, x, y, r * 2.15); g.restore();
    g.save(); g.globalAlpha *= o.a ?? 1; g.strokeStyle = ring; g.lineWidth = 4; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.restore();
  }
  const pop = (g, img, x, y, a0, a, s = 40) => { if (a < a0 || a > a0 + 1.2) return; const k = ph(a, a0, a0 + .2) * (1 - ph(a, a0 + .9, a0 + 1.2)); icon(g, img, x, y, s, { a: k, edge: '#ffb951', lw: 3 }); };

  // ---------- MOBA: League of Legends ----------
  // Yasuo (melee) against Lux (long-range skill shots).
  loop('pf-moba', {
    bg: '#3f6b3a',
    steps: [
      'Lux hits Yasuo from far beyond his sword’s reach. He can walk at her or wait, and both cost health.',
      'Wind Wall (W): a wall that stops enemy projectiles. The skill shots that were hitting Yasuo now stop at the wall.',
      'Depth: Sweeping Blade (E) dashes through minions, so the wave is a road to her. Breadth: Steel Tempest’s tornado knocks her up. A ranged attack goes in too, just in case.',
      'The wall and the dashes already answer range. A ranged attack answers nothing new, and it would erase the gap the kit is built around, so it is cut.',
    ],
    next: 'Braum’s Unbreakable (E) stops Yasuo’s tornado. No tool in Yasuo’s kit answers it, and the cut ranged attack does not either: the next loop designs one.',
    challenges: [['Hit from out of reach', 0, .3], ['Braum blocks the tornado', 3, TEASE, { next: true }]],
    tools: [['Wind Wall', 1, .5], ['Sweeping Blade', 2, .5], ['Steel Tempest', 2, 1.4], ['Ranged attack', 2, 2.8, { spec: true, cut: [3, .6] }]],
    game(g, i, a, t) {
      g.fillStyle = '#c9b27c'; g.fillRect(14, 300, 640, 130);
      g.strokeStyle = 'rgba(80,60,30,.25)'; g.lineWidth = 2; g.setLineDash([10, 10]); g.beginPath(); g.moveTo(14, 365); g.lineTo(654, 365); g.stroke(); g.setLineDash([]);
      const LX = 580, LY = 365;
      let yx = 120, yy = 365, hp = 1, luxUp = 0;
      const minions = [[250, 340, 0], [300, 392, 0], [345, 352, 0], [430, 338, 1], [470, 390, 1], [505, 350, 1]];
      minions.forEach(([x, y, red]) => { g.fillStyle = red ? '#d84a4a' : '#4a7bd8'; g.strokeStyle = '#141a33'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 11, 0, TAU); g.fill(); g.stroke(); });
      const orbs = [], wall = i === 1 && a > .5 ? 210 : 0;
      if (i <= 1) {
        for (let k = 0; k < 6; k++) {
          const t0 = .4 + k * .6, u = ph(a, t0, t0 + .45), dest = wall || yx + 26;
          if (a < t0) continue;
          if (u < 1) orbs.push([lerp(LX - 30, dest, u), lerp(LY - 6, 365, u)]);
          else if (!wall) hp -= .12;
        }
      }
      if (i === 0 && a > 1.1) yx = lerp(120, 165, ph(a, 1.1, 1.8)) - lerp(0, 45, ph(a, 2, 2.6));
      if (i === 2) {
        const hops = [[120, 365], [250, 340], [345, 352], [430, 338], [530, 362]], T0 = [.5, .85, 1.9, 2.25];
        let p = hops[0];
        T0.forEach((t0, k) => { if (a >= t0) { const u = ph(a, t0, t0 + .28); p = [lerp(hops[k][0], hops[k + 1][0], u), lerp(hops[k][1], hops[k + 1][1], u) - Math.sin(u * Math.PI) * 30]; } });
        [yx, yy] = p;
        if (a > 1.35 && a < 1.9) { const u = ph(a, 1.35, 1.85); const tx = lerp(360, LX, u); g.save(); g.strokeStyle = '#e8f6ff'; g.lineWidth = 4; for (let r = 0; r < 4; r++) { g.beginPath(); g.ellipse(tx, 360 - r * 12, 18 - r * 3, 6, 0, 0, TAU); g.stroke(); } g.restore(); }
        if (a > 1.85) luxUp = Math.sin(ph(a, 1.85, 2.9) * Math.PI) * 34;
        pop(g, 'lol-YasuoE.png', 250, 280, .5, a); pop(g, 'lol-YasuoQ1Wrapper.png', 345, 280, 1.3, a);
        if (a > .5 && a < 1.5) lab(g, 'Depth: dash through the wave', 334, 250, { size: 15 });
        if (a > 1.85 && a < 3) lab(g, 'Breadth: knocked up', LX - 40, 250, { size: 15 });
        if (a > 2.8) { lab(g, 'Ranged attack, just in case', 180, 470, { size: 14 }); }
      }
      if (i === 3) yx = 300;
      if (i === 3 && a < TEASE && a > .8) note(g, 'Wind Wall and the dashes already answer range. A ranged attack would erase the gap the kit is built around.', 334, 210, 470, { a: ph(a, .8, 1.1) });
      // Lux
      disc(g, 'lol-champ-Lux.png', LX, LY - luxUp, 30, '#d84a4a');
      bar(g, LX, LY - luxUp - 42, 64, 7, 1, '#d84a4a');
      if (i <= 1) pop(g, 'lol-LuxQ.png', LX, 280, .3, a, 34);
      // Braum, next loop
      if (i === 3 && a >= TEASE) {
        const k = ph(a, TEASE, TEASE + .4);
        disc(g, 'lol-champ-Braum.png', 500, 365, 28, '#d84a4a', { a: k });
        g.save(); g.globalAlpha = k; g.strokeStyle = '#ffd36a'; g.lineWidth = 9; g.beginPath(); g.arc(500, 365, 46, Math.PI * .72, Math.PI * 1.28); g.stroke(); g.restore();
        const u = ph(a, TEASE + .5, TEASE + 1.1), tx = lerp(330, 446, u);
        if (a > TEASE + .5) { g.save(); g.strokeStyle = '#e8f6ff'; g.lineWidth = 4; for (let r = 0; r < 4; r++) { g.beginPath(); g.ellipse(tx, 360 - r * 12, 18 - r * 3, 6, 0, 0, TAU); g.stroke(); } g.restore(); }
        pop(g, 'lol-BraumE.png', 500, 290, TEASE + .2, a);
        if (a > TEASE + 1.1) lab(g, 'Blocked by Unbreakable', 450, 452, { size: 15 });
      }
      // Wind Wall
      if (wall) { const k = ph(a, .5, .8); g.save(); g.globalAlpha = .85 * k; g.fillStyle = 'rgba(150,215,255,.75)'; g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.beginPath(); g.ellipse(wall, 365, 18, 70 * k, 0, 0, TAU); g.fill(); g.stroke(); g.restore(); pop(g, 'lol-YasuoW.png', wall, 270, .5, a); }
      orbs.forEach(([x, y]) => { g.fillStyle = '#fff5c2'; g.strokeStyle = '#f0b84a'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill(); g.stroke(); });
      // Yasuo
      disc(g, 'lol-champ-Yasuo.png', yx, yy, 30, '#4a7bd8');
      bar(g, yx, yy - 42, 64, 7, Math.max(0, hp), '#5fd47c');
      if (i === 0 && a > .3) lab(g, 'Challenge: hit from out of reach', 334, 200, { a: ph(a, .3, .6) });
      if (i === 0 && a > 2.7) lab(g, '?', yx, yy - 70, { size: 32 });
      if (i === 1 && a > .5) lab(g, 'Tool: Wind Wall stops projectiles', 334, 200, { a: ph(a, .5, .8) });
    },
  });

  // ---------- Creature battler: Pokémon ----------
  function hpBox(g, name, x, y, k, o = {}) {
    card(g, x, y, 250, 52, { fill: '#fbf8ec', edge: '#3a3a3a', lw: 3, shadow: false, r: 8, a: o.a });
    text(g, name, x - 112, y - 10, { align: 'left', size: 15, w: 800, col: '#2a2a2a', a: o.a });
    if (o.type) chip(g, o.type, x + 84, y - 10, { ...o.tone, size: 11, a: o.a, pad: 12, h: 18 });
    text(g, 'HP', x - 112, y + 12, { align: 'left', size: 12, w: 800, col: '#d08a1a', a: o.a });
    bar(g, x + 12, y + 12, 196, 9, k, k > .5 ? '#58c060' : k > .2 ? '#e8c040' : '#e05040', { back: '#555', a: o.a });
  }
  const rain = (g, t, k) => { g.save(); g.globalAlpha = .55 * k; g.strokeStyle = '#5b7fd6'; g.lineWidth = 2; for (let n = 0; n < 70; n++) { const x = (n * 97 + t * 260) % 660 + 4, y = (n * 53 + t * 620) % 470 + 110; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 6, y + 16); g.stroke(); } g.restore(); };
  loop('pf-battler', {
    bg: '#e3efcf',
    steps: [
      'The gym comes first: its Charmander’s Ember burns through a Grass team. A player who arrives with only Bulbasaur faints.',
      'The route before the gym offers Squirtle. Water Gun is super effective on Charmander, so the gym now has an answer.',
      'Depth: Rain Dance makes Water Gun hit 1.5 times harder. Breadth: in rain, Pikachu’s Thunder never misses. Ember joins too, just in case.',
      'Rain halves Fire moves, and nothing in this gym is weak to Fire. Ember answers nothing here, so it is cut from the team.',
    ],
    next: 'The next gym leads with Bulbasaur, which resists both Water and Electric. Fire is super effective on it, so Ember comes back with a job.',
    challenges: [['Fire gym: Charmander', 0, .3], ['Bulbasaur resists Water', 3, TEASE, { next: true }]],
    tools: [['Water Gun', 1, 1], ['Rain Dance', 2, .3], ['Thunder', 2, 2.2], ['Ember', 2, 2.8, { spec: true, cut: [3, .6], back: [3, TEASE + 1] }]],
    game(g, i, a, t) {
      const tease = i === 3 && a >= TEASE;
      if (i >= 2 && !tease) rain(g, t, i === 2 ? ph(a, .4, 1) : 1);
      g.fillStyle = '#c5dba0'; g.strokeStyle = '#9fbf72'; g.lineWidth = 3;
      g.beginPath(); g.ellipse(470, 268, 110, 22, 0, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.ellipse(180, 462, 120, 24, 0, 0, TAU); g.fill(); g.stroke();
      // opponent
      let foe = 'pk-charmander.png', foeName = 'Charmander', foeHp = 1, foeType = 'Fire', foeTone = TONE.orange, foeA = 1;
      if (i === 1) foeHp = lerp(1, .35, ph(a, 1.6, 2.2));
      if (i === 2) { foeHp = lerp(.35, 0, ph(a, 1.4, 1.9)); foeA = 1 - ph(a, 2, 2.4); }
      if (i === 3) { foeA = 0; }
      if (tease) { foe = 'pk-bulbasaur.png'; foeName = 'Bulbasaur'; foeType = 'Grass'; foeTone = TONE.green; foeA = ph(a, TEASE, TEASE + .4); foeHp = 1; }
      if (i === 2 && a > 2.4) { foe = ''; }
      if (foe) { pic(g, foe, 470, 268, 140, { bottom: true, a: foeA }); hpBox(g, foeName, 190, 172, foeHp, { a: foeA, type: foeType, tone: foeTone }); }
      // yours
      let me = 'pk-bulbasaur.png', meName = 'Bulbasaur', meHp = 1, meA = 1, meType = 'Grass', meTone = TONE.green;
      if (i === 0) { meHp = lerp(1, 0, ph(a, 1.6, 2.2)); meA = 1 - ph(a, 2.5, 2.9); }
      if (i >= 1) { me = 'pk-squirtle.png'; meName = 'Squirtle'; meType = 'Water'; meTone = TONE.blue; meA = i === 1 ? ph(a, 0, .3) : 1; }
      if (i === 2 && a > 2.1 && a < 2.9) { me = 'pk-pikachu.png'; meName = 'Pikachu'; meType = 'Electric'; meTone = TONE.gold; }
      pic(g, me, 180, 462, 150, { bottom: true, flip: true, a: meA });
      hpBox(g, meName, 480, 420, meHp, { type: meType, tone: meTone });
      // moves
      const beam = (x0, y0, x1, y1, col, u, w = 10) => { if (u <= 0 || u >= 1) return; g.save(); g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(lerp(x0, x1, u), lerp(y0, y1, u)); g.stroke(); g.restore(); };
      if (i === 0) beam(440, 220, 200, 400, '#f07020', ph(a, 1, 1.6), 12);
      if (i === 1) beam(220, 390, 450, 220, '#3a8ee8', ph(a, 1, 1.6), 12);
      if (i === 2) { beam(220, 390, 450, 220, '#3a8ee8', ph(a, .9, 1.4), 18); }
      if (i === 2 && a > 2.2 && a < 2.9) { g.save(); g.strokeStyle = '#f8d030'; g.lineWidth = 6; g.beginPath(); g.moveTo(470, 130); g.lineTo(450, 175); g.lineTo(485, 185); g.lineTo(460, 240); g.stroke(); g.restore(); }
      // team
      const team = [['pk-squirtle.png', i >= 1], ['pk-pikachu.png', i >= 2 && a > 2.1 || i === 3], ['pk-charmander.png', (i === 2 && a > 2.8) || i === 3]];
      text(g, 'Your team', 380, 476, { align: 'left', size: 12, w: 800, col: C.muted });
      team.forEach(([n, on], k) => {
        if (!on) return; const x = 470 + k * 44, cut = n === 'pk-charmander.png' && i === 3 && a > .6 && !(a > TEASE + 1);
        g.save(); g.fillStyle = '#fbf8ec'; g.strokeStyle = cut ? '#e07b72' : '#3a3a3a'; g.lineWidth = 2; g.beginPath(); g.arc(x, 476, 19, 0, TAU); g.fill(); g.stroke(); g.restore();
        pic(g, n, x, 476, 34, { grey: cut });
      });
      // dialog
      const msgs = [
        [[.2, 'Gym Leader sent out Charmander!'], [.9, 'Charmander used Ember!'], [1.6, 'It’s super effective!'], [2.5, 'Bulbasaur fainted!']],
        [[0, 'Go! Squirtle, from the route before the gym.'], [.9, 'Squirtle used Water Gun!'], [1.6, 'It’s super effective!']],
        [[0, 'Squirtle used Rain Dance!'], [.8, 'Water Gun, ×1.5 in the rain!'], [1.9, 'Charmander fainted!'], [2.1, 'In rain, Pikachu’s Thunder never misses.'], [2.8, 'Ember joins the team, just in case.']],
        [[0, 'Rain halves Fire moves. Nothing here is weak to Fire.'], [.6, 'Ember is cut from the team.'], [TEASE, 'Next gym: Bulbasaur resists Water and Electric.'], [TEASE + 1, 'Fire is super effective on it: Ember is back.']],
      ][i];
      const m = [...msgs].reverse().find(([t0]) => a >= t0);
      card(g, 334, 534, 620, 56, { fill: '#fbf8ec', edge: '#3a3a3a', lw: 4, shadow: false, r: 8 });
      if (m) text(g, m[1], 44, 534, { align: 'left', size: 17, w: 700, col: '#2a2a2a' });
    },
  });

  // ---------- MMO raid: World of Warcraft ----------
  const CLS = ['#c79c6e', '#f58cba', '#abd473', '#fff569', '#ffffff', '#0070de', '#69ccf0', '#9482c9', '#ff7d0a', '#c41f3b'];
  const jit = (r, c) => ((r * 7 + c * 13) % 9) / 9;
  loop('pf-raid', {
    bg: '#1d2236',
    steps: [
      'The boss comes first: every 20 seconds its Inferno hits all twenty raiders at once. With nothing to answer it, the second Inferno wipes the raid.',
      'A raid-wide heal: Tranquility tops up all twenty after each Inferno. The raid lives, and the healer’s big cooldown has a reason to exist.',
      'Depth: Power Word: Shield goes on before the hit and soaks part of it. Breadth: Fire Resistance Aura trims every hit. Kick goes on the bar too, just in case.',
      'Inferno cannot be interrupted, so Kick answers nothing in this fight. It is cut from the plan.',
    ],
    next: 'An add appears that casts a heal on the boss. A cast that can be stopped: Kick comes back with a job.',
    challenges: [['Inferno hits all 20', 0, .3], ['An add heals the boss', 3, TEASE, { next: true }]],
    tools: [['Tranquility', 1, 2], ['Fire Res. Aura', 2, .4], ['PW: Shield', 2, .7], ['Kick', 2, 2.8, { spec: true, cut: [3, .6], back: [3, TEASE + 1] }]],
    game(g, i, a, t) {
      const tease = i === 3 && a >= TEASE;
      icon(g, 'wow-achievement_boss_ragnaros.jpg', 66, 172, 60, { edge: '#ffb951' });
      if (!tease) text(g, 'Raid boss', 66, 214, { size: 13, w: 800, col: '#fff' });
      const castU = tease ? 0 : (a < 1.8 ? ph(a, .2, 1.8) : i === 0 ? ph(a, 2, 3.4) : 0);
      bar(g, 370, 172, 440, 20, castU, '#f08a1a', { back: '#2b2f45', edge: '#000' });
      text(g, castU > 0 ? 'Inferno' : '', 160, 172, { align: 'left', size: 13, w: 800, col: '#fff' });
      // add, next loop
      if (tease) {
        const k = ph(a, TEASE, TEASE + .3);
        icon(g, 'wow-spell_shadow_summoninfernal.jpg', 66, 172, 60, { edge: '#a77fe0', a: k });
        bar(g, 370, 172, 440, 20, ph(a, TEASE + .2, 4), '#a77fe0', { back: '#2b2f45', edge: '#000', a: k });
        text(g, 'Mend the Boss', 160, 172, { align: 'left', size: 13, w: 800, col: '#fff', a: k }); text(g, 'Add', 66, 214, { size: 13, w: 800, col: '#fff', a: k });
        if (a > TEASE + 1) { icon(g, 'wow-ability_kick.jpg', 620, 172, 34, { edge: '#ffb951' }); lab(g, 'Kick: interrupted', 520, 212, { size: 13 }); }
      }
      // raid frames
      for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
        const x = 70 + c * 118, y = 258 + r * 56, j = jit(r, c);
        let hp = 1, sh = 0;
        if (i === 0) { hp = a < 1.8 ? 1 : a < 3.4 ? .45 - j * .15 : 0; }
        if (i === 1) { hp = a < 1.8 ? 1 : lerp(.45 - j * .15, 1, ph(a, 2 + j * .3, 3 + j * .3)); }
        if (i >= 2) {
          const res = i >= 2 && (i > 2 || a > .4), shield = i > 2 || a > .7;
          sh = shield && (i > 2 || a < 1.8) ? .25 : 0;
          hp = a < 1.8 || tease ? 1 : lerp(.82 - j * .08, 1, ph(a, 2.2 + j * .2, 2.8 + j * .2));
          if (!res) hp = 1;
        }
        const dead = hp <= 0;
        g.fillStyle = '#0d1020'; g.fillRect(x - 54, y - 22, 108, 44);
        g.fillStyle = dead ? '#3a3a3a' : '#2fa84a'; g.fillRect(x - 54, y - 22, 108 * Math.max(hp, dead ? 1 : 0), 44);
        if (sh) { g.fillStyle = 'rgba(255,255,255,.65)'; g.fillRect(x - 54 + 108 * hp - 108 * sh, y - 22, 108 * sh, 6); }
        g.fillStyle = CLS[(r * 5 + c) % 10]; g.fillRect(x - 54, y - 22, 5, 44);
        g.strokeStyle = '#000'; g.lineWidth = 2; g.strokeRect(x - 54, y - 22, 108, 44);
        text(g, dead ? 'Dead' : `Raider ${r * 5 + c + 1}`, x - 44, y, { align: 'left', size: 12, w: 700, col: dead ? '#999' : '#fff' });
      }
      // hit flash
      const hitAt = [1.8, 3.4].find(h => a > h && a < h + .25 && (i === 0 || h === 1.8) && !tease);
      if (hitAt) { g.fillStyle = `rgba(255,120,30,${.35 * (1 - (a - hitAt) / .25)})`; g.fillRect(14, 230, 640, 240); }
      // the healer's bar
      const tools = [['wow-spell_nature_tranquility.jpg', 'Tranquility', i >= 1 && (i > 1 || a > 2)], ['wow-spell_fire_sealoffire.jpg', 'Fire Res. Aura', i >= 2 && (i > 2 || a > .4)], ['wow-spell_holy_powerwordshield.jpg', 'PW: Shield', i >= 2 && (i > 2 || a > .7)], ['wow-ability_kick.jpg', 'Kick', i === 2 && a > 2.8 || i === 3]];
      text(g, 'Your bar', 30, 520, { align: 'left', size: 12, w: 800, col: '#fff' });
      tools.forEach(([img, n, on], k) => {
        if (!on) return; const x = 170 + k * 120, cut = n === 'Kick' && (i === 2 || (i === 3 && a > .6 && a < TEASE + 1));
        icon(g, img, x, 520, 40, { grey: cut, edge: cut ? '#e07b72' : '#ffb951' });
        text(g, n, x, 554, { size: 12, w: 700, col: cut ? '#e07b72' : '#fff' });
      });
      if (i === 0 && a > .3 && a < 1.8) dark(g, 'Challenge: one hit, all twenty', 334, 470);
      if (i === 0 && a > 3.5) dark(g, 'Wipe', 334, 470, { size: 22 });
      if (i === 1 && a > 2) { pop(g, 'wow-spell_nature_tranquility.jpg', 334, 360, 2, a, 54); }
      if (i === 2 && a > .4 && a < 2.6) dark(g, 'Breadth: less from every hit · Depth: shield first', 334, 470, { size: 15 });
      if (i === 3 && a > .4 && a < TEASE) dark(g, 'Inferno can’t be interrupted: Kick is cut', 334, 470, { size: 15 });
    },
  });

  // ---------- Tower defense ----------
  const PATH = [[14, 200], [230, 200], [230, 470], [450, 470], [450, 270], [600, 270]];
  const SEG = PATH.slice(1).map((p, k) => Math.hypot(p[0] - PATH[k][0], p[1] - PATH[k][1])), LEN = SEG.reduce((s, v) => s + v, 0);
  function at(d) { for (let k = 0; k < SEG.length; k++) { if (d <= SEG[k]) { const u = d / SEG[k]; return [lerp(PATH[k][0], PATH[k + 1][0], u), lerp(PATH[k][1], PATH[k + 1][1], u)]; } d -= SEG[k]; } return PATH[PATH.length - 1]; }
  const TW = { arrow: [340, 380, 130], frost: [140, 300, 105], cannon: [560, 380, 125], aa: [110, 420, 100] };
  const inR = (p, tw) => Math.hypot(p[0] - tw[0], p[1] - tw[1]) <= tw[2];
  // one wave per step: [kind, spawn]; returns each enemy's position, or null once dead or through
  function wave(i) {
    if (i <= 1) return [0, 1, 2, 3, 4].map(k => ['runner', .15 + k * .28]);
    return [['runner', .1], ['armor', .35], ['runner', .6], ['armor', .85], ['runner', 1.1]];
  }
  function sim(i, a) {
    const towers = i === 0 ? [] : i === 1 ? ['arrow'] : ['arrow', 'frost', 'cannon'];
    let leaks = 0; const out = [];
    wave(i).forEach(([kind, s0]) => {
      if (a < s0) return;
      let d = 0, inArrow = 0, inCannon = 0, dead = false; const v = kind === 'runner' ? 470 : 330, dt = 1 / 120;
      for (let tt = s0; tt < a; tt += dt) {
        const p = at(d), slow = towers.includes('frost') && inR(p, TW.frost) ? .45 : 1;
        if (towers.includes('arrow') && inR(p, TW.arrow)) inArrow += dt;
        if (towers.includes('cannon') && inR(p, TW.cannon)) inCannon += dt;
        if (kind === 'runner' && inArrow > (towers.includes('frost') ? .2 : .3)) { dead = true; break; }
        if (kind === 'armor' && inCannon > .3) { dead = true; break; }
        d += v * slow * dt; if (d >= LEN) break;
      }
      if (d >= LEN) { leaks++; return; }
      out.push({ kind, p: at(d), dead, d, hitA: towers.includes('arrow') && inR(at(d), TW.arrow), hitC: towers.includes('cannon') && inR(at(d), TW.cannon) });
    });
    return { out, leaks };
  }
  function tower(g, k, name, a = 1, o = {}) {
    const [x, y, r] = TW[k];
    if (o.range) { g.save(); g.globalAlpha = a; g.fillStyle = o.range + '14'; g.strokeStyle = o.range; g.lineWidth = 2; g.setLineDash([7, 6]); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke(); g.restore(); }
    g.save(); g.globalAlpha = a; g.fillStyle = o.cut ? '#b9b09a' : '#fffaf0'; g.strokeStyle = o.cut ? '#e07b72' : C.navy; g.lineWidth = 3;
    g.beginPath(); g.roundRect(x - 24, y - 24, 48, 48, 8); g.fill(); g.stroke(); g.restore();
    gi(g, name, x, y, 34, o.cut ? '#777' : C.navy, a);
  }
  loop('pf-towers', {
    bg: '#cfe0a8',
    steps: [
      'The wave comes first: runners too fast to catch by hand race down the path and into the castle.',
      'An arrow tower where the path bends around it. Every runner passes through its range, and none get through.',
      'Depth: a frost tower slows the wave so the arrows land more. Breadth: armored walkers shrug off arrows, so a cannon covers their route. Anti-air goes in too, just in case.',
      'Nothing in these waves flies. The anti-air tower answers nothing and takes a build slot, so it is cut.',
    ],
    next: 'A flying wave skips the path and crosses straight to the castle. The anti-air tower comes back with a job.',
    challenges: [['Fast runners', 0, .3], ['Armored walkers', 2, .3], ['Flyers skip the path', 3, TEASE, { next: true }]],
    tools: [['Arrow tower', 1, .2], ['Frost tower', 2, .2], ['Cannon', 2, .9], ['Anti-air', 2, 2.8, { spec: true, cut: [3, .6], back: [3, TEASE + .9] }]],
    game(g, i, a, t) {
      g.save(); g.strokeStyle = '#e2c98f'; g.lineWidth = 46; g.lineJoin = 'round'; g.beginPath(); PATH.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); g.restore();
      gi(g, 'castle', 622, 262, 56, C.navy);
      const wi = i === 3 ? 2 : i, wa = i === 3 ? (a < TEASE ? a * 2.2 : 0) : a;
      const { out, leaks } = sim(wi, wa);
      if (i >= 1) tower(g, 'arrow', 'bow-arrow', ph(a, i === 1 ? .2 : 0, i === 1 ? .5 : .01), { range: '#5562eb' });
      if (i >= 2) { tower(g, 'frost', 'frozen-orb', ph(a, i === 2 ? .2 : 0, i === 2 ? .5 : .01), { range: '#11555c' }); tower(g, 'cannon', 'unlit-bomb', ph(a, i === 2 ? .9 : 0, i === 2 ? 1.2 : .01), { range: '#c0392b' }); }
      const aaOn = (i === 2 && a > 2.8) || i === 3, aaCut = i === 3 && a > .6 && a < TEASE + .9;
      if (aaOn) tower(g, 'aa', 'rocket', 1, { cut: aaCut, range: aaCut ? null : '#8a4fd6' });
      out.forEach(({ kind, p, dead, hitA, hitC }) => {
        if (dead) return;
        if (hitA) { g.strokeStyle = '#5562eb'; g.lineWidth = 2; g.beginPath(); g.moveTo(TW.arrow[0], TW.arrow[1]); g.lineTo(p[0], p[1]); g.stroke(); }
        if (hitC && kind === 'armor') { g.fillStyle = '#d8463a'; g.beginPath(); g.arc(p[0], p[1], 20, 0, TAU); g.globalAlpha = .4; g.fill(); g.globalAlpha = 1; }
        g.fillStyle = kind === 'runner' ? '#ffe2c8' : '#d7d3c8'; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.arc(p[0], p[1], kind === 'runner' ? 15 : 18, 0, TAU); g.fill(); g.stroke();
        gi(g, kind === 'runner' ? 'sprint' : 'heavy-helm', p[0], p[1], kind === 'runner' ? 22 : 26, C.navy);
      });
      // flyers, next loop
      let fl = 0;
      if (i === 3 && a >= TEASE) for (let k = 0; k < 3; k++) {
        const u = ph(a, TEASE + k * .25, TEASE + 1 + k * .25), x = lerp(30, 610, u), y = lerp(500 - k * 30, 262, u);
        const shot = a > TEASE + .9 && x > 60;
        if (u >= 1 && !shot) { fl++; continue; }
        if (shot && x > 130) continue;
        if (u > 0) gi(g, 'bat-wing', x, y, 30, '#4b2286');
        if (shot) { g.strokeStyle = '#8a4fd6'; g.lineWidth = 2; g.beginPath(); g.moveTo(TW.aa[0], TW.aa[1]); g.lineTo(x, y); g.stroke(); }
      }
      card(g, 590, 150, 96, 34, { fill: '#fffaf0', edge: C.navy, lw: 2, shadow: false, r: 8 });
      text(g, `Lives ${20 - leaks - fl}`, 590, 151, { size: 15, w: 800, col: leaks ? '#c0392b' : C.navy });
      if (i === 0 && a > .3) lab(g, 'Challenge: runners leak through', 330, 150, { a: ph(a, .3, .6) });
      if (i === 1 && a > .2) lab(g, 'Tool: an arrow tower in the bend', 330, 150, { a: ph(a, .2, .5) });
      if (i === 2 && a > 2.8) lab(g, 'Anti-air, just in case', 110, 365, { size: 14 });
      if (i === 3 && a > .8 && a < TEASE) lab(g, 'Nothing flies: anti-air is cut', 330, 150);
      if (i === 3 && a > TEASE + .9) lab(g, 'Flyers: anti-air has a job', 330, 150);
    },
  });

  // ---------- Deckbuilder ----------
  const CARDS = {
    strike: ['Strike', 'pointy-sword', 'Deal 6', '#f9d9d6', '#e07b72'],
    defend: ['Defend', 'round-shield', 'Gain 7 Block', '#dfe6fb', '#8ea2e6'],
    defendP: ['Defend+', 'round-shield', 'Gain 10 Block', '#dfe6fb', '#5562eb'],
    weaken: ['Weaken', 'broken-shield', 'Its hits deal 25% less', '#eadcfb', '#a77fe0'],
    poison: ['Poison', 'poison-bottle', '3 a turn, ignores Block', '#d8f0df', '#5fb47c'],
  };
  function face(g, k, x, y, o = {}) {
    const [n, ic, line, fill, edge] = CARDS[k];
    g.save(); g.globalAlpha = o.a ?? 1; g.translate(x, y); g.rotate(o.rot || 0);
    if (o.glow) { g.fillStyle = 'rgba(255,185,81,.55)'; g.beginPath(); g.roundRect(-55, -73, 110, 146, 14); g.fill(); }
    g.fillStyle = o.grey ? '#cfcac0' : fill; g.strokeStyle = o.grey ? '#8a8577' : edge; g.lineWidth = 4; g.beginPath(); g.roundRect(-48, -66, 96, 132, 10); g.fill(); g.stroke();
    text(g, n, 0, -48, { size: 14, w: 800, col: '#262c6a' });
    GI.draw(g, ic, 0, -8, 40, o.grey ? '#777' : '#262c6a');
    wrap(g, line, 0, 30, 84, { size: 11.5, w: 700, lh: 13, align: 'center', col: '#262c6a' });
    if (o.cut) { g.strokeStyle = '#c0392b'; g.lineWidth = 5; g.beginPath(); g.moveTo(-40, -58); g.lineTo(40, 58); g.moveTo(40, -58); g.lineTo(-40, 58); g.stroke(); }
    g.restore();
  }
  loop('pf-cards', {
    bg: '#2a2238',
    steps: [
      'The enemy comes first: it shows a 12-damage hit a turn ahead. A deck of only Strikes can’t stop it, and three hits end the run.',
      'Defend: gain 7 Block. The hit lands as 5, and the shown intent now asks a question the deck can answer.',
      'Depth: Defend+ gains 10 Block. Breadth: Weaken cuts its hits by 25%, so 12 becomes 9 and the Block takes all of it. Poison goes in too, just in case.',
      'This fight ends in three turns, before poison adds up. Poison answers nothing here, so it is cut from the deck.',
    ],
    next: 'A plated knight gains 12 Block every turn, and Strikes stall against it. Poison ignores Block, so it comes back with a job.',
    challenges: [['A 12-damage hit', 0, .3], ['Gains 12 Block a turn', 3, TEASE, { next: true }]],
    tools: [['Defend', 1, .3], ['Defend+', 2, .3], ['Weaken', 2, .3], ['Poison', 2, 2.8, { spec: true, cut: [3, .6], back: [3, TEASE + 1] }]],
    game(g, i, a, t) {
      const tease = i === 3 && a >= TEASE;
      let hp = 30, block = 0, intent = 12, foeHp = 1, hit = 0;
      // the turn: play cards, then the enemy hits at 2.2
      if (i === 0) { foeHp = 1 - .1 * Math.floor(clamp((a - .4) / .5, 0, 3)); if (a > 2.2) { hp = 18; hit = 12; } }
      if (i === 1) { if (a > .9) block = 7; if (a > 2.2) { hp = 25; block = 0; hit = 5; } foeHp = a > 1.5 ? .9 : 1; }
      if (i === 2) { if (a > .9) intent = 9; if (a > 1.4) block = 10; foeHp = a > 1.9 ? .9 : 1; if (a > 2.2) { block = 1; hit = 0; } }
      if (i === 3) { intent = 9; }
      // player
      gi(g, 'swordman', 150, 270, 110, '#fffaf0');
      bar(g, 150, 342, 120, 12, hp / 30, '#d84a4a', { back: '#3a3150' });
      text(g, `${hp} / 30`, 150, 360, { size: 13, w: 800, col: '#fff' });
      if (block) { gi(g, 'round-shield', 74, 342, 34, '#8ea2e6'); text(g, String(block), 74, 343, { size: 14, w: 800, col: '#fff', stroke: 4, strokeCol: '#141a33' }); }
      // enemy
      const foeImg = tease ? 'heavy-helm' : 'ogre', foeCol = tease ? '#d7d3c8' : '#e07b72';
      gi(g, foeImg, 500, 270, 120, foeCol);
      bar(g, 500, 342, 140, 12, tease ? 1 : foeHp, '#d84a4a', { back: '#3a3150' });
      text(g, tease ? 'Plated knight' : 'Ogre', 500, 360, { size: 13, w: 800, col: '#fff' });
      if (!tease) { gi(g, 'pointy-sword', 478, 176, 30, '#ffb951'); text(g, String(intent), 512, 177, { size: 22, w: 800, col: intent < 12 ? '#a77fe0' : '#ffb951' }); text(g, 'next turn', 500, 200, { size: 12, w: 700, col: '#fff' }); }
      else { gi(g, 'round-shield', 478, 176, 30, '#8ea2e6'); text(g, '+12', 518, 177, { size: 20, w: 800, col: '#8ea2e6' }); text(g, 'Block every turn', 500, 200, { size: 12, w: 700, col: '#fff' }); }
      if (hit !== 0 || (i === 2 && a > 2.2)) { const u = ph(a, 2.2, 2.6); if (u < 1) { g.fillStyle = `rgba(255,90,60,${.5 * (1 - u)})`; g.beginPath(); g.arc(150, 270, 70, 0, TAU); g.fill(); } dark(g, hit ? `−${hit}` : 'Blocked', 150, 196, { size: 22, a: 1 - ph(a, 3.4, 3.9) }); }
      // the hand
      const hands = [['strike', 'strike', 'strike'], ['strike', 'defend', 'strike'], ['weaken', 'defendP', 'strike'], ['weaken', 'defendP', 'strike']];
      const plays = [[.4, .9, 1.4], [1.5, .6, 99], [.5, 1.0, 1.5], [99, 99, 99]];
      const hand = hands[i].slice(); if ((i === 2 && a > 2.8) || i === 3) hand.push('poison');
      hand.forEach((k, j) => {
        const n = hand.length, x = 334 + (j - (n - 1) / 2) * 112, y = 492, p0 = (plays[i] || [])[j] ?? 99, u = ph(a, p0, p0 + .4);
        if (i === 0 && a > 2.2) return;
        if (u >= 1) return;
        const target = k === 'defend' || k === 'defendP' ? [150, 270] : [500, 270];
        const isNew = (i === 1 && k === 'defend') || (i === 2 && k !== 'strike' && k !== 'poison');
        const pz = k === 'poison', cut = pz && i === 3 && a > .6 && a < TEASE + 1, spec = pz && !(i === 3 && a > TEASE + 1);
        face(g, k, lerp(x, target[0], ease(u)), lerp(y, target[1], ease(u)), { a: 1 - u * .8, glow: (isNew && u === 0) || (pz && i === 3 && a > TEASE + 1), grey: spec && !cut ? false : cut, cut, rot: (j - (n - 1) / 2) * .05 });
      });
      if (i === 0 && a > .2 && a < 2.2) lab(g, 'Challenge: 12 damage, shown a turn ahead', 334, 150, { size: 15 });
      if (i === 0 && a > 2.8) dark(g, 'Three hits like that end the run', 334, 150, { size: 15 });
      if (i === 1 && a > .3) dark(g, 'Tool: Defend', 334, 150, { size: 15 });
      if (i === 2 && a > 2.8) dark(g, 'Poison, just in case', 334, 150, { size: 15 });
      if (i === 3 && a > .8 && a < TEASE) dark(g, 'The fight ends before poison adds up: cut', 334, 150, { size: 15 });
      if (i === 3 && a > TEASE + 1) dark(g, 'Poison ignores Block: it has a job', 334, 150, { size: 15 });
    },
  });
})();
