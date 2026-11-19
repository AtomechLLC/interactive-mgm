/* The article's 16 abilities (actions other than movement), in two sets: size, force and bodies; then state and timing.
   See kit.js. */
(function () {
  const { A, GY, FOE, S, hero, blob, gap, spikes, pipe, orb, ph, arc, pop, hit, spark, shot, note, dizzy, face, T, C, clamp, lerp, ease, TAU } = RA;
  const add = (view, o) => Object.entries(o).forEach(([k, v]) => { A[k] = { group: 'Ability', view, ...v }; });
  const step = (t, at, vals) => { let v = vals[0]; at.forEach((a, i) => { v = lerp(v, vals[i + 1], ease(ph(t, a, a + .2))); }); return v; };

  // ---------- size, force and bodies ----------
  add('side', {
    grower: { name: 'Grower', gi: 'ogre', col: '#7a4a2a', line: 'Can grow in size', counter: 'End it early, while it is small', ex: '',
      loop(g, t) {
        const at = [.8, 1.6, 2.4], r = step(t, at, [9, 13, 18, 24]), hx = step(t, [.9, 1.7, 2.5], [-34, -52, -72, -94]);
        T.zone(40, GY, r * 2.7, .9);
        blob(g, 40, GY, r, '#a0522d');
        note(`size ×${1 + at.filter(a => t > a).length}`, 40, GY - r * 2 - 14, C.redDk);
        hero(g, hx, GY);
        if (t > 2.8) note('out of room', -76, GY - 46, C.muted);
      } },
    shrinker: { name: 'Shrinker', gi: 'imp', col: '#9a3a8a', line: 'Can shrink in size', counter: 'Lead your shots: smaller is faster', ex: '',
      loop(g, t) {
        const at = [.7, 1.5, 2.3], n = at.filter(a => t > a).length, r = step(t, at, [24, 17, 11, 6]);
        const sp = [1.5, 3, 5, 8], P = tt => { let p = 0, last = 0; at.forEach((a, i) => { if (tt > a) { p += (a - last) * sp[i]; last = a; } }); return p + (tt - last) * sp[at.filter(a => tt > a).length]; };
        const fx = tt => 52 + 34 * Math.sin(P(tt));
        blob(g, fx(t), GY, r, '#9a3a8a');
        hero(g, -78, GY);
        at.forEach(a => { shot(g, t, a - .4, -64, fx(a) - 8, GY - 16, .4); spark(fx(a) - 6, GY - 16, t - a, 14); pop('-1', fx(a), GY - 60, t - a - .02); });
        shot(g, t, 2.9, -64, 112, GY - 16, .6); pop('miss', 52, GY - 40, t - 3.3, C.muted);
        note(`speed ×${[1, 2, 3, 5][n]}`, 52, -64, n > 1 ? C.redDk : C.muted);
      } },
    forcer: { name: 'Forcer', gi: 'wind-slap', col: '#5562eb', line: 'Applies direct force to the player’s movement', counter: 'Brace in the gusts; move in the lulls', ex: 'treadmills; enemies that blow air at the player',
      loop(g, t) {
        const gust = t < 1.6, done = t > 2.8, j = ph(t, 2.3, 2.8);
        spikes(g, -120, -88, GY, -1);
        if (gust) for (let i = 0; i < 6; i++) { const x = 80 - ((t * 150 + i * 37) % 190), y = GY - 8 - i * 7; T.tracer(x, y, x - 22, y, .7, '#8ea2e6', 2); }
        blob(g, 96, GY, 15, '#5562eb', { sy: done ? .55 : 1 });
        if (!done) { g.save(); g.translate(80, GY - 16); g.rotate(gust ? t * 22 : t * 2); g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -11); g.lineTo(0, 11); g.moveTo(-3, -6); g.lineTo(3, 6); g.stroke(); g.restore(); }
        const hx = t < 1.6 ? lerp(-30, -56, t / 1.6) : t < 2.3 ? lerp(-56, 52, ph(t, 1.6, 2.3)) : t < 2.8 ? lerp(52, 96, j) : lerp(96, 60, ph(t, 2.8, 3.3));
        const hy = t < 2.3 ? GY : t < 2.8 ? GY - arc(j, 38) - 16 * j : GY - 16 * (1 - ph(t, 2.8, 3.3)) - arc(ph(t, 2.8, 3.3), 18);
        hero(g, hx, hy, { jump: hy < GY - 1, walk: t < 2.3 ? t : null, flip: t > 2.9 });
        if (gust) note('gust: pushed back', -40, GY - 46, C.redDk); else if (t < 2.3) note('lull: go', -10, GY - 46, C.blue);
        pop('-1', 96, 2, t - 2.8);
      } },
  });
  add('top', {
    carrier: { name: 'Carrier', gi: 'grab', col: '#8a4fd6', line: 'Carries another enemy, an object, or the player', counter: 'Watch its shadow; step off before the grab', ex: 'The Legend of Zelda’s Wallmasters',
      loop(g, t) {
        T.flag(-92, -46); note('room entrance', -64, -72, C.goldInk);
        const walk = t < 1 ? lerp(-34, 10, ph(t, 0, 1)) : 0, c = ease(ph(t, 1, 2.4));
        const cx = lerp(10, -64, c), cy = lerp(30, -22, c);
        const px = t < 1 ? walk : t < 2.6 ? cx : lerp(-64, -20, ph(t, 3, 4)), py = t < 1 ? 30 : t < 2.6 ? cy : lerp(-22, 4, ph(t, 3, 4));
        if (t > .4 && t < 1) T.shadow(walk, 30, 26 * ph(t, .4, 1), 20 * ph(t, .4, 1), .35);
        T.player(px, py, t < 1 ? 0 : t < 2.6 ? Math.PI : .5, t >= 1 && t < 2.6 ? .7 : .85);
        if (t >= .85 && t < 2.9) {
          const a = t < 1 ? ph(t, .85, 1) : 1 - ph(t, 2.5, 2.9);
          g.save(); g.globalAlpha = a; g.strokeStyle = '#5a2f9a'; g.fillStyle = 'rgba(138,79,214,.55)'; g.lineWidth = 3;
          g.beginPath(); g.arc(cx, cy, 22, 0, TAU); g.fill(); g.stroke();
          for (let i = 0; i < 5; i++) { const q = -2.4 + i * .5; g.beginPath(); g.moveTo(cx + Math.cos(q) * 22, cy + Math.sin(q) * 22); g.lineTo(cx + Math.cos(q) * 32, cy + Math.sin(q) * 32); g.stroke(); }
          g.restore();
        }
        if (t > 1.3 && t < 2.5) note('carried back', cx + 30, cy + 36, C.purple);
        pop('grabbed', 10, 4, t - 1, C.purple);
      } },
  });
  add('side', {
    thrower: { name: 'Thrower', gi: 'thrown-daggers', col: '#b0392f', line: 'Throws what it is holding: an object, the player, an enemy', counter: 'Dodge until its pile runs out', ex: 'Castlevania’s barrel-throwing Skeletons; Super Mario Bros. 3’s Buster Beetle',
      loop(g, t) {
        const at = [.5, 1.6, 2.7], land = [-50, -82, -46], left = 3 - at.filter(a => t > a - .25).length;
        for (let i = 0; i < left; i++) S(g, 'used-block', 102, GY - i * 14, 14);
        blob(g, 72, GY, 13, FOE);
        at.forEach((a, i) => {
          const k = (t - a) / .8;
          if (k < 0 && t > a - .25) S(g, 'used-block', 66, GY - 28, 14);
          if (k >= 0 && k <= 1) S(g, 'used-block', lerp(62, land[i], k), GY - 22 * (1 - k) - arc(k, 54), 14, { rot: t * 9 });
          if (k > 1 && k < 1.5) { S(g, 'used-block', land[i], GY, 14, { a: 1 - (k - 1) * 2 }); T.poof(land[i], GY - 4, (k - 1) * .8, 8); }
        });
        const hx = step(t, [.95, 2.05, 3.15], [-50, -82, -46, -76]);
        hero(g, hx, GY, { walk: [.95, 2.05, 3.15].some(a => t > a && t < a + .2) ? t : null });
        if (t > 3.5) note('pile is empty', 92, GY - 44, C.blue);
      } },
    emitter: { name: 'Emitter', gi: 'spawn-node', col: '#23263f', line: 'Emits enemies or shots from an endless supply', counter: 'Learn the interval; the supply never ends', ex: 'Super Mario Bros. 3’s Bullet Bill cannons; Lakitus; Gauntlet’s spawners; anything with a gun',
      loop(g, t) {
        const per = 4 / 3; let hy = GY;
        for (let i = -1; i < 3; i++) {
          const a = .1 + i * per, x = 84 - 120 * (t - a);
          if (t > a && x > -130) S(g, 'bullet-bill', x, GY - 10, 16);
          const j = ph(t, a + 1.04 - .32, a + 1.04 + .32); if (j > 0 && j < 1) hy = GY - arc(j, 42);
          if (t - a > 0 && t - a < .15) T.flash(84, GY - 18, 14, 1 - (t - a) / .15);
        }
        g.fillStyle = '#23263f'; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.roundRect(86, GY - 32, 24, 32, 3); g.fill(); g.stroke();
        g.fillStyle = '#5d618c'; g.fillRect(86, GY - 12, 24, 4);
        note('supply: ∞', 88, GY - 46, C.redDk);
        hero(g, -40, hy, { jump: hy < GY - 1 });
      } },
  });
  add('top', {
    splitter: { name: 'Splitter', gi: 'split-arrows', col: '#2fae63', line: 'Splits into several enemies and destroys itself', counter: 'Clear room first: each kill adds bodies', ex: 'Rogue Legacy’s Slimes; The Legend of Zelda’s Vire and Biri',
      loop(g, t) {
        const s1 = ease(ph(t, .7, 1)), s2 = ease(ph(t, 1.7, 2)), s3 = ease(ph(t, 2.7, 3)), n = 1 + [.7, 1.7, 2.7].filter(a => t > a).length, col = '#57c98a', o = { edge: '#1a6a3c' };
        if (t < .7) T.foe(36, 0, 24, Math.PI, col, o);
        else {
          if (t < 1.7) T.foe(36 - 6 * s1, -34 * s1, 15, Math.PI, col, o); else [-1, 1].forEach(d => T.foe(30 + d * 24 * s2 - (t - 1.7) * 6, -34 - 16 * s2, 9, Math.PI, col, o));
          if (t < 2.7) T.foe(36 - 6 * s1, 34 * s1, 15, Math.PI, col, o); else [-1, 1].forEach(d => T.foe(30 + d * 24 * s3 - (t - 2.7) * 6, 34 + 16 * s3, 9, Math.PI, col, o));
        }
        T.player(-78, 0, 0, .85);
        hit(-64, 0, 14, 0, t - .7); hit(-64, 0, 18, -30, t - 1.7); hit(-64, 0, 18, 30, t - 2.7);
        [.7, 1.7, 2.7].forEach((a, i) => pop('split', 36, [-34, -62, 6][i], t - a, C.good));
        note(`bodies: ${n}`, -70, 60, n > 2 ? C.redDk : C.muted);
      } },
    cloner: { name: 'Cloner', gi: 'egg-clutch', col: '#e07a6e', line: 'Copies itself; the original survives', counter: 'Find the original and hit that one', ex: 'The Legend of Zelda’s Ghini',
      loop(g, t) {
        const P = [[4, -52], [-6, 46], [74, 54]], gone = t > 3;
        P.forEach(([x, y], i) => {
          const a = .6 + i * .8, k = ease(ph(t, a, a + .35)); if (t < a) return;
          if (gone) { T.poof(x, y, t - 3, 14); return; }
          T.foe(lerp(52, x, k), lerp(0, y, k), 14, Math.PI, '#eeb4ac', { a: .85, edge: '#c0766c' }); if (k >= 1) note('copy', x, y + 26);
        });
        T.foe(52, 0, 17, Math.PI, FOE, { mark: 'staff', a: gone && t < 3.5 && Math.floor(t * 14) % 2 ? .4 : 1 });
        if (t > 2.4) note('original', 52, -30, C.redDk);
        T.player(-82, 0, 0, .85);
        hit(-68, 0, 34, 0, t - 3); pop('-12', 52, -44, t - 3.02);
      } },
  });

  // ---------- state and timing ----------
  add('side', {
    morpher: { name: 'Morpher', gi: 'cycle', col: '#8a4fd6', line: 'Transforms into another kind of enemy', counter: 'Re-read it after every change', ex: '',
      loop(g, t) {
        if (t < 1.5) S(g, 'goomba', 90 - 30 * t, GY, 26, { flip: Math.floor(t * 6) % 2 });
        else S(g, 'paratroopa', 45 - 45 * (t - 1.6), GY - 46 * ease(ph(t, 1.6, 2.1)) + 4 * Math.sin(t * 5), 28, { flip: true });
        if (t > 1.35 && t < 2.1) { T.poof(46, GY - 16, t - 1.35, 16); T.flash(46, GY - 16, 30, 1 - ph(t, 1.35, 1.8)); }
        if (t < 1.35) note('walks', 90 - 30 * t, GY - 38); else if (t > 1.8 && t < 3.4) note('now it flies', 45 - 45 * (t - 1.6), -42, C.purple);
        const hx = t < 2.4 ? -60 : lerp(-60, 50, ph(t, 2.4, 3.5));
        hero(g, hx, GY, { walk: t > 2.4 && t < 3.5 ? t : null });
      } },
    sapper: { name: 'Sapper', gi: 'broken-shield', col: '#d0602a', line: 'Weakens the player: slower, no jump, no attack', counter: 'Be in the air when the slam lands', ex: 'Super Mario Bros. 3’s Sledge Bros.',
      loop(g, t) {
        const sl = [.8, 2.8], jb = Math.max(arc(ph(t, .3, .8), 30), arc(ph(t, 2.3, 2.8), 30));
        S(g, 'hammer-bro', 60, GY - jb, 34);
        sl.forEach(a => { const k = (t - a) / .6; if (k > 0 && k < 1) [-1, 1].forEach(d => { T.poof(60 + d * 180 * k, GY - 4, k * .5, 7); g.strokeStyle = `rgba(208,96,42,${1 - k})`; g.lineWidth = 3; g.beginPath(); g.arc(60 + d * 180 * k, GY, 8, Math.PI, TAU); g.stroke(); }); });
        const stun = t > 1 && t < 2.1, j = ph(t, 2.62, 3.3);
        hero(g, -40 + (stun ? Math.sin(t * 40) * 1.2 : 0), GY - arc(j, 38), { a: stun ? .55 : 1, jump: j > 0 && j < 1 });
        if (stun) { dizzy(g, -40, GY - 40, t); note('stunned: no jump', -40, GY - 56, C.redDk); }
        pop('clear', -40, -16, t - 3.05, C.blue);
      } },
    latcher: { name: 'Latcher', gi: 'hook', col: '#8a5a2a', line: 'Latches on and drains the player’s abilities', counter: 'Shake it off before it drains you', ex: 'Super Mario Bros. 3’s Micro-Goombas; The Legend of Zelda’s Like Likes',
      loop(g, t) {
        const on = t >= .6 && t < 2.8, shake = t > 2.3 && t < 2.8, j = ph(t, 1.3, 1.7), j2 = ph(t, 3.1, 3.8);
        const hx = (t < .6 ? -20 : t < 2.3 ? lerp(-20, -6, ph(t, .8, 2.2)) : t < 3.1 ? -6 : lerp(-6, 44, j2)) + (shake ? Math.sin(t * 60) * 3 : 0);
        const hy = GY - arc(j, 7) - arc(j2, 50);
        hero(g, hx, hy, { jump: (j > 0 && j < 1) || (j2 > 0 && j2 < 1), walk: on && !shake ? t * .4 : null });
        [[-8, -8], [8, -18]].forEach(([ox, oy], i) => {
          if (t < .6) { const k = ph(t, .1, .6); S(g, 'goomba', lerp(40 + i * 24, -20 + ox, k), lerp(GY, GY + oy, k) - arc(k, 30), 12); }
          else if (on) S(g, 'goomba', hx + ox, hy + oy, 12);
          else { const k = ph(t, 2.8, 3.4), d = i ? 1 : -1; S(g, 'goomba', -6 + ox + d * 60 * k, GY + oy - arc(k, 40) + 30 * k * k, 12, { rot: k * 8 * d, a: 1 - k }); }
        });
        if (on && !shake) note('slowed, weak jump', hx, GY - 58, C.redDk);
        if (shake) note('shake!', hx, GY - 58, C.blue);
      } },
    hider: { name: 'Hider', gi: 'trap-mask', col: '#3aa655', line: 'Hides until the player is near, or while they are', counter: 'Its trigger is distance: use it', ex: 'Super Mario’s Piranha Plants',
      loop(g, t) {
        const k = 1 - ease(ph(t, 1.5, 1.8)) + ease(ph(t, 3.3, 3.7)), j = ph(t, 2, 2.8);
        T.zone(30, 20, 52, .8, '85,98,235');
        g.save(); g.beginPath(); g.rect(0, -90, 60, 110); g.clip(); S(g, 'piranha', 30, 20 + 36 * (1 - k), 36); g.restore();
        pipe(g, 30, 20);
        const hx = t < 1 ? -90 : t < 2 ? lerp(-90, -14, ph(t, 1, 1.7)) : t < 2.8 ? lerp(-14, 76, j) : lerp(76, 104, ph(t, 2.8, 3.3));
        hero(g, hx, GY - arc(j, 56), { jump: j > 0 && j < 1, walk: (t > 1 && t < 1.7) || t > 2.8 ? t : null });
        if (t > 1.6 && t < 3.2) note('too close: stays hidden', 26, -44, C.blue);
      } },
  });
  add('top', {
    switcher: { name: 'Switcher', gi: 'gears', col: '#5d618c', line: 'Switches between sets of attributes', counter: 'Wait for the state that can be hurt', ex: 'Super Mario Bros. 3’s Boos; The Legend of Zelda’s Peahats',
      loop(g, t) {
        const fly = t < 2 || t > 3.5, m = t < 2 ? t : t > 3.5 ? 2 + (t - 3.5) : 2, fx = 40 + 40 * Math.cos(m * 2), fy = 34 * Math.sin(m * 2.6);
        if (fly) { g.save(); g.translate(fx, fy); g.rotate(t * 16); g.strokeStyle = '#8b8fa8'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(-26, 0); g.lineTo(26, 0); g.moveTo(0, -26); g.lineTo(0, 26); g.stroke(); g.restore(); }
        T.foe(fx, fy, 15, Math.PI, fly ? '#8b8fa8' : FOE, { edge: fly ? C.navy : C.redDk, a: !fly && t > 2.62 && Math.floor(t * 14) % 2 ? .5 : 1 });
        note(fly ? 'flying: no damage' : 'landed: open', fx, fy + 38, fly ? C.muted : C.redDk);
        T.player(-80, 10, face(-80, 10, fx, fy), .85);
        const f8 = [40 + 40 * Math.cos(1.6), 34 * Math.sin(2.08)];
        hit(-66, 10, f8[0], f8[1], t - .8); spark(f8[0] - 14, f8[1], t - .8, 18); pop('0', f8[0], f8[1] - 30, t - .82, C.muted);
        [2.6, 3].forEach(a => { hit(-66, 10, fx, fy, t - a); pop('-10', fx, fy - 30, t - a - .02); });
      } },
  });
  add('side', {
    exploder: { name: 'Exploder', gi: 'explosion-rays', col: '#a8201c', line: 'Destroys itself and deals splash damage', counter: 'Set it off, then leave the radius', ex: 'proximity mines; Super Mario’s Bob-ombs',
      loop(g, t) {
        const bx = 90 - 45 * Math.min(t, 1.6), lit = t > 1.3 && t < 2.5;
        if (lit) T.zone(18, GY - 12, 54, .6 + .4 * Math.sin(t * 20));
        if (t < 2.5) { S(g, 'bobomb-hd', bx, GY, 26, { flip: true }); if (lit && Math.floor(t * 12) % 2) T.flash(bx, GY - 14, 18, .7); }
        else if (t < 3.1) T.flash(18, GY - 12, 84, 1 - ph(t, 2.5, 3.1));
        const hx = t < 1.4 ? -30 : t < 3 ? lerp(-30, -92, ease(ph(t, 1.4, 2.2))) : lerp(-92, -30, ph(t, 3.1, 4));
        hero(g, hx, GY, { walk: (t > 1.4 && t < 2.2) || t > 3.1 ? t : null, flip: t > 1.4 && t < 2.2 });
        pop('boom', 18, -20, t - 2.5); if (t > 2.3 && t < 3.2) note('outside the radius', -60, GY - 46, C.blue);
      } },
    interactor: { name: 'Interactor', gi: 'hand', col: '#11555c', line: 'Uses scripted objects: levers, buttons', counter: 'Beat it to the switch, or stop it first', ex: '',
      loop(g, t) {
        gap(g, -10, 40);
        const pulled = t > 1.2, w = 50 * (1 - ease(ph(t, 1.3, 1.9)));
        if (w > 0) { g.fillStyle = '#a0763c'; g.strokeStyle = C.navy; g.lineWidth = 2; g.fillRect(40 - w, GY, w, 7); g.strokeRect(40 - w, GY, w, 7); }
        g.fillStyle = C.stoneDk; g.fillRect(64, GY - 6, 16, 6); g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.moveTo(72, GY - 6); g.lineTo(72 + (pulled ? 10 : -10), GY - 24); g.stroke(); orb(g, 72 + (pulled ? 10 : -10), GY - 24, 4, C.gold);
        const fa = t > 2.9 ? 1 - ph(t, 2.9, 3.3) : 1;
        blob(g, lerp(108, 90, ph(t, 0, 1)), GY, 12, '#2a8a94', { a: fa * (t > 2.9 && Math.floor(t * 14) % 2 ? .5 : 1) });
        const hx = lerp(-100, -22, ph(t, 0, 1.6));
        hero(g, hx, GY, { walk: t < 1.6 ? t : null });
        if (t > 1.2 && t < 2.3) note('it pulled the lever', 60, GY - 46, C.redDk);
        if (t > 1.6 && t < 2.4) T.label('!', -22, GY - 46, 'center', C.redDk, 14);
        shot(g, t, 2.4, -8, 80, GY - 16, .5); spark(80, GY - 14, t - 2.9, 16); pop('-1', 90, GY - 50, t - 2.9);
      } },
    charger: { name: 'Charger', gi: 'hourglass', col: '#62688a', line: 'Pauses between switching behaviours', counter: 'The pause is the tell: move on its release', ex: 'Castlevania’s Wolves: pause, then lunge',
      loop(g, t) {
        const d = ease(ph(t, 1.5, 1.8)), x = lerp(72, -78, d), flip = t > 1.9, crouch = (t > .3 && t < 1.5) || (t > 2.2 && t < 3.9);
        blob(g, x + (t > 1.2 && t < 1.5 ? Math.sin(t * 50) * 1.5 : 0), GY - arc(d, 8), 12, '#8b8fa8', { sx: 1.5, sy: crouch ? .8 : 1, flip, a: (t > 2.82 && t < 3.6 && Math.floor(t * 14) % 2) ? .5 : 1 });
        const bar = (a, b) => { const k = ph(t, a, b); if (k > 0 && k < 1) { g.fillStyle = 'rgba(21,32,68,.75)'; g.fillRect(x - 18, GY - 42, 36, 7); g.fillStyle = C.gold; g.fillRect(x - 17, GY - 41, 34 * k, 5); note('pause', x, GY - 54, C.goldInk); } };
        bar(.3, 1.5); bar(2.2, 3.9);
        const j = ph(t, 1.42, 2.02);
        hero(g, -40, GY - arc(j, 46), { jump: j > 0 && j < 1, flip: t > 2 });
        shot(g, t, 2.6, -52, -68, GY - 14, .2); pop('-1', -78, GY - 62, t - 2.82); shot(g, t, 3.1, -52, -68, GY - 14, .2); pop('-1', -78, GY - 62, t - 3.32);
      } },
  });
})();
