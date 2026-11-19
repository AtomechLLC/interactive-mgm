/* The article's 13 quality attributes, in two sets: what your attack meets, and what the body does. See kit.js. */
(function () {
  const { A, GY, FOE, S, hero, blob, gap, spikes, orb, ph, arc, pop, hit, spark, shot, note, face, T, C, clamp, lerp, ease, TAU } = RA;
  const add = (view, o) => Object.entries(o).forEach(([k, v]) => { A[k] = { group: 'Quality', view, ...v }; });

  // ---------- what your attack meets ----------
  add('side', {
    geoignore: { name: 'GeoIgnore', gi: 'ghost', col: '#8a4fd6', line: 'Ignores the level; passes through solid objects', counter: 'Walls will not save you: keep moving', ex: 'Super Mario Bros. 3’s Rotodisc; many flying enemies',
      loop(g, t) {
        const x = 105 - 45 * t, inWall = Math.abs(x - 2) < 22, j = ph(t, 3.1, 3.8);
        T.wall(-10, -40, 24, 90);
        shot(g, t, .4, -56, -14, GY - 18, .3); spark(-12, GY - 18, t - .7, 14); pop('blocked', -34, -2, t - .72, C.muted);
        blob(g, x, GY - 8, 11, '#b99be8', { a: inWall ? .45 : .9, edge: '#5a2f9a' });
        if (t > 1.6 && t < 2.6) note('through the wall', 2, -54, C.purple);
        hero(g, t < 3.1 ? -70 : lerp(-70, -18, j), GY - arc(j, 46), { jump: j > 0 && j < 1 });
      } },
    shielder: { name: 'Shielder', gi: 'checked-shield', col: '#3d6ea8', line: 'Attacks from one direction do nothing', counter: 'Get to the side the shield is not on', ex: 'Zelda II’s Darknuts (Iron Knuckles)',
      loop(g, t) {
        const turned = t > 2.9, j = ph(t, 1.2, 2), d = turned ? -1 : 1;
        blob(g, 30, GY, 14, FOE, { flip: turned, a: t > 2.42 && t < 2.9 && Math.floor(t * 14) % 2 ? .4 : 1 });
        g.fillStyle = '#e8e2cf'; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.roundRect(30 - d * 19 - 3, GY - 30, 6, 28, 3); g.fill(); g.stroke();
        shot(g, t, .4, -56, 10, GY - 18, .4); spark(10, GY - 18, t - .8, 16); pop('clang', 4, -4, t - .82, C.blue);
        const hx = t < 1.2 ? -70 : lerp(-70, 78, j);
        hero(g, hx, GY - arc(j, 62), { jump: j > 0 && j < 1, flip: t >= 2 });
        shot(g, t, 2.2, 64, 46, GY - 18, .2); spark(46, GY - 18, t - 2.4, 16); pop('-1', 30, -8, t - 2.42);
        if (t > 2 && t < 2.9) note('slow to turn', 30, GY - 44);
      } },
    deflector: { name: 'Deflector', gi: 'shield-reflect', col: '#57b6ff', line: 'Reflects the player’s ranged attacks', counter: 'Stop shooting; close in instead', ex: '',
      loop(g, t) {
        const j = ph(t, 1.25, 1.75), j2 = ph(t, 2.6, 3.1), sq = t > 3.1 && t < 3.6;
        blob(g, 50, GY, 14, '#9fd6ff', { edge: '#1f6f96', sy: sq ? .6 : 1 });
        g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(50, GY - 14 * (sq ? .6 : 1), 9, 3.4, 4.4); g.stroke();
        shot(g, t, .4, -56, 34, GY - 18, .5); spark(34, GY - 18, t - .9, 16); pop('reflected', 40, -8, t - .92, C.purple);
        shot(g, t, .9, 34, -110, GY - 18, .8);
        const hx = t < 1.9 ? -70 : t < 2.6 ? lerp(-70, 14, ph(t, 1.9, 2.6)) : t < 3.1 ? lerp(14, 50, j2) : lerp(50, 86, ph(t, 3.1, 3.6));
        const hy = t < 1.9 ? GY - arc(j, 40) : t < 2.6 ? GY : t < 3.1 ? GY - arc(j2, 44) - 16 * j2 : GY - 16 * (1 - ph(t, 3.1, 3.6)) - arc(ph(t, 3.1, 3.6), 20);
        hero(g, hx, hy, { jump: hy < GY - 1, walk: t > 1.9 && t < 2.6 ? t : null });
        pop('-1', 50, -10, t - 3.1);
      } },
    secretSpot: { name: 'Secret Spot', gi: 'bullseye', col: '#c79a16', line: 'Only one specific spot takes damage', counter: 'Find the one spot; aim only there', ex: 'many bosses',
      loop(g, t) {
        blob(g, 48, GY, 30, '#7a4a2a');
        const p = (t * 1.5) % 1; g.strokeStyle = `rgba(255,185,81,${1 - p})`; g.lineWidth = 2; g.beginPath(); g.arc(58, GY - 58, 6 + 12 * p, 0, TAU); g.stroke();
        orb(g, 58, GY - 58, 6, '#ffd23a', C.goldInk);
        shot(g, t, .3, -56, 18, GY - 18, .4); pop('0', 14, 4, t - .7, C.muted);
        shot(g, t, 1, -56, 18, GY - 26, .4); pop('0', 14, -6, t - 1.4, C.muted);
        const j = ph(t, 1.8, 2.5), j2 = ph(t, 2.5, 3.2);
        const hx = t < 1.8 ? -70 : t < 2.5 ? lerp(-70, 56, j) : lerp(56, -40, j2);
        const hy = t < 1.8 ? GY : t < 2.5 ? lerp(GY, GY - 62, j) - arc(j, 24) : lerp(GY - 62, GY, j2 * j2) - arc(j2, 14);
        hero(g, hx, hy, { jump: hy < GY - 1, flip: t > 2.5 });
        spark(58, GY - 60, t - 2.5, 26); pop('-5', 58, -44, t - 2.52);
      } },
    invulnerable: { name: 'Invulnerable', gi: 'heavy-helm', col: '#62688a', line: 'Cannot be harmed or killed', counter: 'Do not fight it; get past it', ex: 'spikes, mashing blocks, fire spouts; Super Mario Bros. 3’s Boos',
      loop(g, t) {
        const u = t % 2, up = u < .5 ? 1 : u < .6 ? 1 - ph(u, .5, .6) : u < 1 ? 0 : ease(ph(u, 1, 1.6)), by = GY - 70 * up;
        g.strokeStyle = '#7a7f9a'; g.lineWidth = 3; g.beginPath(); g.moveTo(20, -90); g.lineTo(20, by - 40); g.stroke();
        S(g, 'hard-block', 20, by, 42);
        if (u >= .6 && u < .9) { T.poof(-6, GY - 4, u - .6, 8); T.poof(46, GY - 4, u - .6, 8); }
        shot(g, t, .3, -56, -2, GY - 18, .4); spark(-2, GY - 18, t - .7, 14); pop('0', -8, 6, t - .72, C.muted);
        const hx = t < 1.5 ? -70 : lerp(-70, 78, ph(t, 1.5, 2.35));
        hero(g, hx, GY, { walk: t > 1.5 && t < 2.35 ? t : null });
        if (t > 1.5 && t < 2.4) note('go under', -30, GY - 46, C.blue);
      } },
    secretWeakness: { name: 'Secret Weakness', gi: 'unlit-bomb', col: '#5a7a2a', line: 'Vulnerable to one kind of attack', counter: 'Try each tool; one of them works', ex: 'The Legend of Zelda’s Dodongo, weak to bombs',
      loop(g, t) {
        blob(g, 48, GY, 20, '#6f8f3a', { sx: 1.25, a: t > 2.62 && t < 3.3 && Math.floor(t * 14) % 2 ? .4 : 1 });
        hero(g, -70, GY);
        shot(g, t, .3, -56, 22, GY - 18, .4); pop('0', 20, 4, t - .7, C.muted);
        const k = (t - 1.1) / .5; if (k >= 0 && k <= 1) S(g, 'hammer-hd', lerp(-56, 24, k), GY - 14 - arc(k, 44), 14, { rot: t * 12 });
        pop('0', 20, -6, t - 1.6, C.muted);
        const b = (t - 2.1) / .5; if (b >= 0 && b <= 1) { const bx = lerp(-56, 30, b), by = GY - 20 - arc(b, 44); orb(g, bx, by, 7, '#23263f'); g.strokeStyle = C.gold; g.lineWidth = 2; g.beginPath(); g.moveTo(bx + 3, by - 6); g.lineTo(bx + 8, by - 12); g.stroke(); }
        if (t > 2.6 && t < 3.1) T.flash(34, GY - 20, 44, 1 - ph(t, 2.6, 3.1)); pop('-9', 48, -26, t - 2.62);
        [['fire ✗', .7], ['hammer ✗', 1.6], ['bomb ✓', 2.6]].forEach(([s, a], i) => { if (t > a) note(s, -76 + i * 68, -72, i === 2 ? C.good : C.muted); });
      } },
    hardToHit: { name: 'Hard to Hit', gi: 'dodge', col: '#d0602a', line: 'Too fast or too tiny for normal attack ranges', counter: 'Wait until it holds still, then strike', ex: 'Zelda II’s Myu',
      loop(g, t) {
        const r = ph(t, 2, 2.3), x = lerp(40 + 30 * Math.sin(t * 7), 20, r), y = GY - Math.abs(Math.sin(t * 11)) * 26 * (1 - r), dead = t > 3;
        if (!dead) blob(g, x, y, 5, '#d0602a'); else T.poof(20, GY - 5, t - 3, 8);
        shot(g, t, .3, -56, 112, GY - 18, .7); pop('miss', 40, -4, t - .7, C.muted);
        shot(g, t, 1, -56, 112, GY - 18, .7); pop('miss', 40, -4, t - 1.4, C.muted);
        if (t > 2.3 && t < 3) note('rests', 20, GY - 22);
        const j = ph(t, 2.5, 3), hx = t < 1.7 ? -70 : t < 2.5 ? lerp(-70, -14, ph(t, 1.7, 2.4)) : lerp(-14, 20, j);
        hero(g, hx, GY - arc(j, 30), { jump: j > 0 && j < 1, walk: t > 1.7 && t < 2.4 ? t : null });
        pop('-1', 20, 2, t - 3);
      } },
  });

  // ---------- what the body does ----------
  add('side', {
    revivor: { name: 'Revivor', gi: 'skull-crossed-bones', col: '#8b8fa8', line: 'Comes back after it dies', counter: 'Pass while it is down; it will get up', ex: 'Castlevania’s Skeletons; Super Mario’s Dry Bones',
      loop(g, t) {
        const down = t >= 1.2 && t < 3, up = ease(ph(t, 3, 3.3)), sx = t < 1.2 ? 80 - 35 * t : 38 - 30 * Math.max(0, t - 3.3);
        if (!down) blob(g, sx, GY, 12, '#efe9da', { sy: t >= 3 ? up : 1 });
        else {
          g.fillStyle = '#efe9da'; g.strokeStyle = C.navy; g.lineWidth = 1.5;
          [[-10, -3, 8, 3], [6, -3, 9, 3], [-2, -8, 7, 3]].forEach(([x, y, w, h]) => { g.beginPath(); g.ellipse(38 + x, GY + y, w, h, 0, 0, TAU); g.fill(); g.stroke(); });
          orb(g, 44, GY - 14, 6, '#efe9da');
          g.strokeStyle = C.purple; g.lineWidth = 4; g.beginPath(); g.arc(38, GY - 34, 9, -Math.PI / 2, -Math.PI / 2 + TAU * ph(t, 1.2, 3)); g.stroke();
        }
        if (t > 3 && t < 3.4) T.poof(38, GY - 10, t - 3, 12);
        const j = ph(t, .7, 1.2), j2 = ph(t, 1.2, 1.7);
        const hx = t < .7 ? -30 : t < 1.2 ? lerp(-30, 38, j) : t < 1.7 ? lerp(38, 76, j2) : lerp(76, 104, ph(t, 1.7, 2.4));
        hero(g, hx, GY - (t < 1.2 ? arc(j, 46) : arc(j2, 22)), { jump: t > .7 && t < 1.7, walk: t > 1.7 ? t : null });
        pop('stomp', 38, 2, t - 1.2, C.blue); if (t > 3.3) note('back up', sx, GY - 36, C.redDk);
      } },
  });
  add('top', {
    regenerator: { name: 'Regenerator', gi: 'health-increase', col: '#2fae63', line: 'Its health comes back over time', counter: 'Burst it down; do not pause', ex: '',
      loop(g, t) {
        const H = [.4, .8], R = [1.4, 2], B = [2.3, 2.55, 2.8, 3.05, 3.3, 3.55];
        const hp = 6 - H.filter(x => t > x).length + R.filter(x => t > x).length - B.filter(x => t > x).length;
        const p = (t * 1.2) % 1; if (t > 1 && t < 2.2) { g.strokeStyle = `rgba(47,174,99,${1 - p})`; g.lineWidth = 3; g.beginPath(); g.arc(40, 0, 20 + 18 * p, 0, TAU); g.stroke(); }
        if (hp > 0) T.foe(40, 0, 20, Math.PI, FOE, { mark: 'horns', hp, hpMax: 6 }); else T.poof(40, 0, t - 3.55, 20);
        T.player(-60, 0, 0, .85);
        [...H, ...B].forEach(x => { hit(-46, 0, 20, 0, t - x); pop('-1', 40, -40, t - x - .02); });
        R.forEach(x => pop('+1', 62, -30, t - x, C.good));
        if (t > 1 && t < 2.2) note('you paused: it heals', 40, 44, C.good);
        if (t > 2.3 && t < 3.6) note('burst', -60, 34, C.blue);
      } },
    segmented: { name: 'Segmented', gi: 'dna1', col: '#b0392f', line: 'Built from smaller pieces that break off one by one', counter: 'Take it apart from the tail', ex: '(left blank in the article)',
      loop(g, t) {
        const n = 5 - [1, 2, 3].filter(x => t > x).length, at = i => { const a = t * TAU / 4 - i * .42; return [Math.cos(a) * 80, Math.sin(a) * 54]; };
        for (let i = n - 1; i >= 1; i--) { const [x, y] = at(i); T.foe(x, y, 11, t * TAU / 4 - i * .42 + Math.PI / 2, '#e07a6e'); }
        const [hx, hy] = at(0); T.foe(hx, hy, 14, t * TAU / 4 + Math.PI / 2, FOE, { mark: 'horns' });
        const [lx, ly] = at(Math.min(n, 4)); T.player(0, 0, face(0, 0, lx, ly), .8);
        [1, 2, 3].forEach((x, i) => { const a = x * TAU / 4 - (4 - i) * .42, px = Math.cos(a) * 80, py = Math.sin(a) * 54; hit(0, 0, px, py, t - x); if (t > x) T.poof(px, py, t - x, 12); });
        note(`pieces: ${n}`, 0, 34);
      } },
    bumper: { name: 'Bumper', gi: 'shield-bash', col: '#3d6ea8', line: 'Shoves the player or objects away, like a pinball bumper', counter: 'Mind what is behind you; use the shove', ex: 'A Link to the Past’s Hardhat Beetles',
      loop(g, t) {
        const pit = x => { g.fillStyle = '#1a1f3d'; g.fillRect(x, -90, 34, 180); note('pit', x + 17, -72, C.muted); };
        pit(-120); pit(86);
        const k = ease(ph(t, .9, 1.4)), f = ph(t, 1.4, 1.9), fx = lerp(20, 100, k), px = t < .9 ? lerp(-70, -14, ease(ph(t, 0, .8))) : lerp(-14, -66, ease(ph(t, .9, 1.3)));
        if (f < 1) T.foe(fx, 0, 16 * (1 - f * .8), Math.PI, '#d0602a', { a: 1 - f });
        T.player(px, 0, 0, .85);
        spark(4, 0, t - .9, 26); if (t > .9 && t < 1.8) note('both are shoved', 4, -34);
        pop('fell', 100, -20, t - 1.6, C.blue);
        if (t > 2 && t < 3.6) note('one step short of the pit', -52, 34, C.redDk);
      } },
  });
  add('side', {
    geomimic: { name: 'GeoMimic', gi: 'wooden-crate', col: '#11555c', line: 'Acts like level: you can stand on it', counter: 'Ride it: the enemy is your platform', ex: 'most Super Mario Bros. 2 enemies; Mega Man X’s Sigma; Castlevania’s Catoblepas',
      loop(g, t) {
        gap(g, -40, 52); spikes(g, -40, 52, 90, -1, 12);
        const bx = lerp(-22, 34, (1 - Math.cos(t * TAU / 4)) / 2), top = GY - 20;
        g.fillStyle = '#3aa3ab'; g.strokeStyle = C.navy; g.lineWidth = 2.5; g.beginPath(); g.roundRect(bx - 18, top, 36, 20, 5); g.fill(); g.stroke();
        g.fillStyle = '#fff'; [-8, 4].forEach(e => { g.beginPath(); g.arc(bx + e, top + 9, 3.5, 0, TAU); g.fill(); }); g.fillStyle = C.navy; [-8, 4].forEach(e => { g.beginPath(); g.arc(bx + e + 1, top + 9, 1.6, 0, TAU); g.fill(); });
        const j = ph(t, .1, .6), j2 = ph(t, 2, 2.5);
        const hx = t < .1 ? -64 : t < .6 ? lerp(-64, bx, j) : t < 2 ? bx : t < 2.5 ? lerp(34, 76, j2) : lerp(76, 104, ph(t, 2.5, 3.3));
        const hy = t < .1 ? GY : t < .6 ? lerp(GY, top, j) - arc(j, 26) : t < 2 ? top : t < 2.5 ? lerp(top, GY, j2) - arc(j2, 18) : GY;
        hero(g, hx, hy, { jump: (j > 0 && j < 1) || (j2 > 0 && j2 < 1), walk: t > 2.5 && t < 3.3 ? t : null });
        if (t > .7 && t < 1.9) note('stand on it', bx, top - 44, C.blue);
      } },
  });
  add('top', {
    alarm: { name: 'Alarm', gi: 'radar-sweep', col: '#c79a16', line: 'Makes another enemy or object react', counter: 'Silence it first, or stay out of its view', ex: '',
      loop(g, t) {
        const seen = t > 1.3, ang = lerp(Math.PI / 2 + 1, Math.PI / 2, ease(ph(t, 0, 1.3)));
        const px = t < 1.3 ? lerp(-100, -10, ph(t, 0, 1.3)) : lerp(-10, -56, ease(ph(t, 1.5, 2.2))), py = 52;
        T.cone(-10, -40, seen ? face(-10, -40, px, py) : ang, .36, 104, seen ? 1 : .6, seen ? '229,50,45' : '199,154,22');
        if (seen) for (let i = 0; i < 2; i++) { const p = ((t - 1.3) * 1.4 + i * .5) % 1; g.strokeStyle = `rgba(229,50,45,${1 - p})`; g.lineWidth = 3; g.beginPath(); g.arc(-10, -40, 14 + 30 * p, 0, TAU); g.stroke(); }
        T.foe(-10, -40, 13, seen ? face(-10, -40, px, py) : ang, '#e0b23a', { edge: C.goldInk });
        if (t > 1.3 && t < 1.8) T.label('!', -10, -66, 'center', C.redDk, 14);
        [[84, -50], [92, 14]].forEach(([x, y], i) => {
          const k = ease(ph(t, 1.6 + i * .15, 3.2)), fx = lerp(x, px + 34 + i * 4, k), fy = lerp(y, py - 20 + i * 26, k);
          T.foe(fx, fy, 13, face(fx, fy, px, py), FOE, { mark: 'horns', a: t < 1.6 ? .45 : 1 });
          if (t < 1.5) note('z z', x, y - 24);
        });
        T.player(px, py, seen ? face(px, py, 60, 0) : 0, .8);
      } },
  });
})();
