/* The article's 22 movement attributes, in three sets: on the ground (side view), in the air or on an anchor (side view),
   and paths across a room (top-down). See kit.js for the entry format. */
(function () {
  const { A, GY, FOE, S, P, CV, simon, zs, pl, dshot, hero, blob, gap, spikes, pipe, orb, ph, arc, pop, hit, spark, shot, note, face, tri, T, C, clamp, lerp, ease, TAU } = RA;
  const add = (group, view, o) => Object.entries(o).forEach(([k, v]) => { A[k] = { group, view, ...v }; });

  // ---------- on the ground ----------
  add('Movement', 'side', {
    stationary: { name: 'Stationary', gi: 'stone-block', col: '#62688a', line: 'Does not move at all', counter: 'Take your time; it will not change', ex: '',
      loop(g, t) {
        const x = lerp(-100, 100, ph(t, .3, 3.4)), j = ph(t, 1.25, 2.35);
        S(g, 'spiny', 0, GY, 26);
        if (t > .3 && t < 1.2) note('still there', 0, 4);
        hero(g, x, GY - arc(j, 52), { jump: j > 0 && j < 1, walk: t });
      } },
    walker: { name: 'Walker', gi: 'shambling-zombie', col: '#8a5a2a', line: 'Walks or runs along the ground', counter: 'Stomp it, or hop over it', ex: 'Super Mario’s Goombas',
      loop(g, t) {
        const gx = 100 - 46 * Math.min(t, 2.05);
        const hx = t < 1.4 ? lerp(-95, -60, ph(t, 0, 1.4)) : t < 2.05 ? lerp(-60, 6, ph(t, 1.4, 2.05)) : lerp(6, 44, ph(t, 2.05, 2.6));
        const hy = GY - (t < 2.05 ? arc(ph(t, 1.4, 2.05), 50) : arc(ph(t, 2.05, 2.6), 22));
        if (t < 2.05) S(g, 'goomba', gx, GY, 26, { flip: Math.floor(t * 6) % 2 });
        else if (t < 3) S(g, 'goomba-flat', gx, GY, 12, { a: 1 - ph(t, 2.6, 3) });
        hero(g, hx, hy, { jump: hy < GY - 1, walk: t });
        pop('stomp', 6, 4, t - 2.05, C.blue);
      } },
    pacer: { name: 'Pacer', gi: 'return-arrow', col: '#b0392f', line: 'Turns around on a trigger, such as a ledge', counter: 'Learn the turn point; step in behind it', ex: 'Super Mario’s Red Koopas',
      loop(g, t) {
        T.wall(-30, 0, 110, 14);
        const u = (t / 2) % 2, k = u < 1 ? u : 2 - u, kx = lerp(70, -20, k);
        S(g, 'red-koopa', kx, 0, 28, { flip: u < 1 });
        if (Math.abs(t - 2) < .45) note('turns at the edge', -4, -44);
        if (t < .4 || t > 3.6) note('turns at the edge', 46, -44);
        const j = ph(t, 2.3, 2.9);
        const hx = t < 2.3 ? -85 : t < 2.9 ? lerp(-85, -22, j) : lerp(-22, 20, ph(t, 2.9, 4));
        const hy = t < 2.3 ? GY : t < 2.9 ? lerp(GY, 0, j) - arc(j, 30) : 0;
        hero(g, hx, hy, { jump: j > 0 && j < 1, walk: t > 2.9 ? t : null });
      } },
    jumper: { name: 'Jumper', gi: 'high-kick', col: '#2f8a6a', line: 'Bounces or jumps, forward or on the spot', counter: 'Run under at the top of its arc', ex: 'Donkey Kong’s Springs; Super Mario Bros. 2’s Tweeter and Ninji',
      loop(g, t) {
        const x = 110 - 55 * t, k = t % 1, y = GY - arc(k, 64);
        g.setLineDash([2, 6]); g.strokeStyle = 'rgba(47,138,106,.7)'; g.lineWidth = 2; g.beginPath();
        for (let i = 0; i <= 80; i++) { const tt = i / 20, px = 110 - 55 * tt, py = GY - 9 - arc(tt % 1, 64); i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); g.setLineDash([]);
        S(g, 'trampoline', x, y, 18, { sy: k < .08 || k > .92 ? .7 : 1 });
        hero(g, lerp(-100, 100, ph(t, .6, 2.6)), GY, { walk: t > .6 && t < 2.6 ? t : null });
      } },
    riser: { name: 'Riser', gi: 'sprout', col: '#3aa655', line: 'Gains height, often rising out of nothing', counter: 'Wait for it to sink, then cross', ex: 'Super Mario’s Piranha Plants; Castlevania’s Mud Man',
      loop(g, t) {
        const k = ease(ph(t, .3, .9)) * (1 - ease(ph(t, 2, 2.6))), j = ph(t, 2.7, 3.5);
        g.save(); g.beginPath(); g.rect(0, -90, 60, 110); g.clip(); S(g, 'piranha', 30, 20 + 36 * (1 - k), 36); g.restore();
        pipe(g, 30, 20);
        if (t > 1.2 && t < 2.5) note('wait', -14, GY - 46);
        const hx = t < 2.7 ? lerp(-95, -14, ph(t, 0, 1.2)) : t < 3.5 ? lerp(-14, 74, j) : lerp(74, 100, ph(t, 3.5, 4));
        hero(g, hx, GY - arc(j, 58), { jump: j > 0 && j < 1, walk: t < 1.2 || t > 3.5 ? t : null });
      } },
    ducker: { name: 'Ducker', gi: 'dodging', col: '#9a3a8a', line: 'Loses height, even melting into the floor', counter: 'Aim low, under the duck', ex: 'Super Mario’s Piranha Plants',
      loop(g, t) {
        const dk = a => ease(ph(t, a, a + .2)) * (1 - ease(ph(t, a + .8, a + 1)));
        const sy = lerp(1.5, .4, Math.max(dk(.7), dk(2.1))), hurt = t > 2.32 && t < 2.9 && Math.floor(t * 14) % 2;
        blob(g, 40, GY, 14, '#9a3a8a', { sy, a: hurt ? .4 : 1 });
        hero(g, -70, GY);
        shot(g, t, .5, -56, 112, GY - 30, .8); pop('miss', 62, -14, t - 1, C.muted);
        shot(g, t, 1.9, -56, 28, GY - 6, .42); spark(28, GY - 6, t - 2.32); pop('-1', 40, -6, t - 2.34);
        if (t > 1.9 && t < 2.3) note('low shot', -20, GY - 22, C.blue);
      } },
    faller: { name: 'Faller', gi: 'drop', col: '#5a9a2a', line: 'Falls from the ceiling to the ground', counter: 'Count the drips; cross between two', ex: 'drops of acid; some slimes',
      loop(g, t) {
        T.wall(-120, -90, 240, 18); g.fillStyle = C.wallDk; g.fillRect(4, -72, 12, 6);
        const u = (t % 1.3) / 1.3, col = '#7fbf3a';
        if (u < .25) orb(g, 10, -64, 2 + 5 * u / .25, col, '#3f6a14');
        else if (u < .75) { const k = (u - .25) / .5; orb(g, 10, lerp(-62, GY - 6, k * k), 6, col, '#3f6a14'); }
        else { const k = (u - .75) / .25; g.fillStyle = `rgba(127,191,58,${1 - k})`; g.beginPath(); g.ellipse(10, GY - 2, 8 + 16 * k, 5 - 3 * k, 0, 0, TAU); g.fill(); }
        g.setLineDash([3, 6]); g.strokeStyle = 'rgba(90,154,42,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(10, -60); g.lineTo(10, GY); g.stroke(); g.setLineDash([]);
        const hx = t < 2.4 ? lerp(-95, -40, ph(t, 0, .8)) : lerp(-40, 76, ph(t, 2.4, 3.3));
        hero(g, hx, GY, { walk: t < .8 || (t > 2.4 && t < 3.3) ? t : null });
        if (t > 1 && t < 2.3) note('wait for the drop', -40, GY - 46);
      } },
    geobound: { name: 'Geobound', gi: 'brick-wall', col: '#3d4270', line: 'Stuck to the level; it can look like level', counter: 'Learn the layout; it never comes to you', ex: 'Mega Man’s Spikes; Super Mario’s Piranha Plants; Castlevania’s White Dragon',
      loop(g, t) {
        T.wall(-36, -90, 84, 84); spikes(g, -36, 48, -6, 1); spikes(g, -22, 32, GY, -1);
        const j = ph(t, 1.4, 2.2);
        const hx = t < 1.4 ? lerp(-95, -36, ph(t, .2, 1.4)) : t < 2.2 ? lerp(-36, 46, j) : lerp(46, 100, ph(t, 2.2, 3.2));
        hero(g, hx, GY - arc(j, 13), { jump: j > 0 && j < 1, walk: t });
        if (t > .2 && t < 1.4) note('part of the level', 6, -50);
        pop('clear', 46, 4, t - 2.2, C.blue);
      } },
  });

  // ---------- in the air, or on an anchor ----------
  add('Movement', 'side', {
    floater: { name: 'Floater', gi: 'bat-wing', col: '#4a3a6a', line: 'Floats, flies or levitates', counter: 'Let it come to whip height, then strike', ex: 'Castlevania’s Bats',
      loop(g, t) {
        const dead = t > 2.42, bx = 105 - 50 * Math.min(t, 2.42), by = GY - 20 + 4 * Math.sin(t * 5) + (dead ? 260 * (t - 2.42) ** 2 : 0);
        g.setLineDash([3, 6]); g.strokeStyle = 'rgba(74,58,106,.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-120, GY - 32); g.lineTo(120, GY - 32); g.stroke(); g.setLineDash([]);
        P(g, 'cv-bat' + (1 + Math.floor(t * 8) % 3), bx, by, CV, { flip: true, rot: dead ? (t - 2.42) * 6 : 0, a: dead ? 1 - ph(t, 2.6, 3) : 1 });
        const hx = t < 2.9 ? lerp(-95, -62, ph(t, 0, .8)) : lerp(-62, 30, ph(t, 2.9, 4));
        simon(g, hx, GY, { whip: t > 2.35 && t < 2.65, walk: t < .8 || t > 2.9 ? t : null });
        if (t > 1 && t < 2.2) note('not in reach yet', -44, GY - 64);
        spark(-16, GY - 32, t - 2.42, 16); pop('-1', -16, -14, t - 2.44);
      } },
    waver: { name: 'Waver', gi: 'wave-crest', col: '#3d6ea8', line: 'Floats along a sine wave', counter: 'Read the wave; pass under a crest', ex: 'Castlevania’s Medusa Head',
      loop(g, t) {
        const wy = x => 8 + 30 * Math.sin(x / 22 - 1.184), x = 115 - 58 * t;
        g.setLineDash([2, 6]); g.strokeStyle = 'rgba(61,110,168,.75)'; g.lineWidth = 2; g.beginPath();
        for (let px = -120; px <= 120; px += 4) px === -120 ? g.moveTo(px, wy(px) - 11) : g.lineTo(px, wy(px) - 11); g.stroke(); g.setLineDash([]);
        P(g, 'cv-medusa', x, wy(x), CV, { flip: true });
        simon(g, lerp(-90, 60, ph(t, .5, 3.5)), GY, { walk: t > .5 && t < 3.5 ? t : null });
        if (t > 1.8 && t < 2.5) note('under the crest', -8, -52, C.blue);
      } },
    swooper: { name: 'Swooper', gi: 'hang-glider', col: '#6a4a8a', line: 'Floats, then swoops down and often returns', counter: 'Bait the dive; pass while it resets', ex: 'Castlevania’s Bats; Super Mario’s Swoopers; Super Mario Bros. 3’s Angry Sun',
      loop(g, t) {
        T.wall(-120, -90, 240, 18);
        const d = ease(ph(t, 1.2, 1.8)), r = ease(ph(t, 1.9, 2.8));
        const bx = t < 1.9 ? lerp(30, -25, d) : lerp(-25, 30, r), by = t < 1.9 ? lerp(-54, GY - 6, d * d) : lerp(GY - 6, -54, r);
        if (t > 1 && t < 1.25) T.label('!', 30, -40, 'center', C.redDk, 14);
        if (t > 1.2 && t < 2.8) P(g, 'cv-bat' + (1 + Math.floor(t * 8) % 3), bx, by, CV, { flip: t < 1.9 }); else P(g, 'cv-bat-hang', 30, -50, CV);
        if (t > 2.8 && t < 3.9) note('resetting', 30, -30);
        const hx = t < 1.1 ? lerp(-95, -25, ph(t, 0, 1)) : t < 2.2 ? lerp(-25, -58, ph(t, 1.1, 1.4)) : lerp(-58, 100, ph(t, 2.2, 3.7));
        simon(g, hx, GY, { walk: t < 1 || (t > 1.1 && t < 1.4) || (t > 2.2 && t < 3.7) ? t : null, flip: t > 1.1 && t < 1.4 });
        pop('baited', -40, -4, t - 1.8, C.blue);
      } },
    sticky: { name: 'Sticky', gi: 'spider-alt', col: '#c79a16', line: 'Sticks to walls and ceilings', counter: 'Track its lap; land where it just left', ex: 'Super Mario Bros. 2’s Spark',
      loop(g, t) {
        T.wall(-35, -25, 70, 50);
        const d = (t / 4) * 240, [sx, sy] = d < 70 ? [-35 + d, -25] : d < 120 ? [35, -25 + d - 70] : d < 190 ? [35 - (d - 120), 25] : [-35, 25 - (d - 190)];
        g.strokeStyle = C.gold; g.lineWidth = 2; for (let i = 0; i < 6; i++) { const a = t * 6 + i * TAU / 6; g.beginPath(); g.moveTo(sx + Math.cos(a) * 8, sy + Math.sin(a) * 8); g.lineTo(sx + Math.cos(a) * 13, sy + Math.sin(a) * 13); g.stroke(); }
        orb(g, sx, sy, 7, '#ffd23a', C.goldInk);
        const j = ph(t, 1.6, 2.3), j2 = ph(t, 3.3, 3.9);
        const hx = t < 1.6 ? -82 : t < 2.3 ? lerp(-82, -22, j) : t < 3.3 ? lerp(-22, 24, ph(t, 2.3, 3.2)) : lerp(24, 82, j2);
        const hy = t < 1.6 ? GY : t < 2.3 ? lerp(GY, -25, j) - arc(j, 26) : t < 3.3 ? -25 : lerp(-25, GY, j2) - arc(j2, 14);
        hero(g, hx, hy, { jump: (j > 0 && j < 1) || (j2 > 0 && j2 < 1), walk: t > 2.3 && t < 3.2 ? t : null });
      } },
    rotator: { name: 'Rotator', gi: 'clockwise-rotation', col: '#d0602a', line: 'Circles a fixed point, which may itself move', counter: 'Cross while it is on the far side', ex: 'Super Mario Bros. 3’s Rotodisc; the jetpack enemies in Sunsoft’s Batman',
      loop(g, t) {
        const a = t * Math.PI, ox = 10 + 46 * Math.cos(a), oy = -5 + 46 * Math.sin(a);
        g.setLineDash([4, 6]); g.strokeStyle = 'rgba(208,96,42,.6)'; g.lineWidth = 2; g.beginPath(); g.arc(10, -5, 46, 0, TAU); g.stroke(); g.setLineDash([]);
        T.wall(2, -13, 16, 16);
        T.flash(ox, oy, 16, .7); orb(g, ox, oy, 8, '#ff8a3a', '#a8401c');
        const hx = t < .9 ? lerp(-95, -70, ph(t, 0, .6)) : lerp(-70, 86, ph(t, .9, 2.15));
        hero(g, hx, GY, { walk: t < .6 || (t > .9 && t < 2.15) ? t : null });
        if (t > 1.1 && t < 1.9) note('it is overhead', 10, -70, C.blue);
      } },
    swinger: { name: 'Swinger', gi: 'spiked-mace', col: '#5d618c', line: 'Swings from a fixed point', counter: 'Follow right behind the swing', ex: 'Castlevania’s swinging blades',
      loop(g, t) {
        T.wall(-120, -90, 240, 18);
        const th = Math.cos(t * Math.PI), bx = 100 * Math.sin(th), by = -72 + 100 * Math.cos(th);
        g.strokeStyle = '#7a7f9a'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -72); g.lineTo(bx, by); g.stroke();
        orb(g, 0, -72, 5, C.stoneDk);
        g.save(); g.translate(bx, by); g.rotate(-th); g.fillStyle = '#c9ccd9'; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 15, 0, Math.PI); g.closePath(); g.fill(); g.stroke(); g.restore();
        const hx = t < 1.6 ? lerp(-95, -50, ph(t, 0, .8)) : lerp(-50, 74, ph(t, 1.6, 2.45));
        simon(g, hx, GY, { walk: t < .8 || (t > 1.6 && t < 2.45) ? t : null });
        if (t > 1.6 && t < 2.3) note('behind the swing', -10, GY - 64, C.blue);
      } },
    tethered: { name: 'Tethered', gi: 'gem-chain', col: '#2a2e55', line: 'Tied to the level by a chain or rope', counter: 'Stand one step past the chain', ex: 'Super Mario’s Chain Chomps',
      loop(g, t) {
        const lg = a => ease(ph(t, a, a + .22)) * (1 - ease(ph(t, a + .7, a + 1.4))), k = Math.max(lg(.9), lg(2.6));
        const cx = lerp(52, -15, k), cy = GY - 13 - (k > .02 ? 4 : Math.abs(Math.sin(t * 6)) * 6) + (k > .9 ? Math.sin(t * 50) * 1.5 : 0);
        g.fillStyle = C.stoneDk; g.strokeStyle = C.navy; g.lineWidth = 2; g.fillRect(64, GY - 16, 12, 16); g.strokeRect(64, GY - 16, 12, 16);
        g.strokeStyle = '#7a7f9a'; g.lineWidth = 2; for (let i = 1; i < 6; i++) { const q = i / 6; g.beginPath(); g.arc(lerp(70, cx, q), lerp(GY - 14, cy, q) + Math.sin(q * Math.PI) * 8 * (1 - k), 3, 0, TAU); g.stroke(); }
        orb(g, cx, cy, 13, '#23263f');
        g.fillStyle = '#fff'; g.beginPath(); g.arc(cx - 5, cy - 5, 3.5, 0, TAU); g.fill(); g.fillStyle = C.navy; g.beginPath(); g.arc(cx - 6, cy - 5, 1.5, 0, TAU); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.moveTo(cx - 12, cy + 1); g.lineTo(cx - 3, cy + 3); g.lineTo(cx - 9, cy + 7); g.closePath(); g.fill();
        g.setLineDash([3, 4]); g.strokeStyle = C.blue; g.lineWidth = 2; g.beginPath(); g.moveTo(-30, GY - 40); g.lineTo(-30, GY); g.stroke(); g.setLineDash([]);
        note('chain ends here', -30, GY - 52, C.blue);
        hero(g, -48, GY);
      } },
  });

  // ---------- paths across a room (top-down) ----------
  const R = [[60, -50], [60, 10], [0, 10], [0, -40], [-50, -40], [-50, 40], [30, 40], [30, -50]];
  add('Movement', 'top', {
    follower: { name: 'Follower', gi: 'eye-target', col: '#b0392f', line: 'Follows the player', counter: 'Kite it: keep moving, hit as you go', ex: 'A Link to the Past’s Hardhat Beetles',
      loop(g, t) {
        const a = t * TAU / 4, px = Math.cos(a) * 78, py = Math.sin(a) * 52, fx = Math.cos(a - 1.1) * 40, fy = Math.sin(a - 1.1) * 26;
        T.trail(Array.from({ length: 12 }, (_, i) => [Math.cos(a - 1.1 - i * .09) * 40, Math.sin(a - 1.1 - i * .09) * 26]).reverse(), C.red, .7, 3);
        T.foe(fx, fy, 16, face(fx, fy, px, py), FOE, { mark: 'horns' });
        pl(g, px, py, a + Math.PI / 2, .8);
        for (let i = 0; i < 4; i++) { hit(px, py, fx, fy, t - .6 - i); pop('-6', fx, fy - 26, t - .62 - i); }
      } },
    roamer: { name: 'Roamer', gi: 'dice-six-faces-four', col: '#8a4fd6', line: 'Changes direction completely at random', counter: 'It is not aiming at you: keep your distance', ex: 'The Legend of Zelda’s Octoroks',
      loop(g, t) {
        const i = Math.floor(t * 2) % 8, k = (t * 2) % 1, a = R[i], b = R[(i + 1) % 8], fx = lerp(a[0], b[0], k), fy = lerp(a[1], b[1], k);
        T.trail(Array.from({ length: 10 }, (_, n) => { const tt = ((t - n * .06) % 4 + 4) % 4, j = Math.floor(tt * 2) % 8, q = (tt * 2) % 1; return [lerp(R[j][0], R[(j + 1) % 8][0], q), lerp(R[j][1], R[(j + 1) % 8][1], q)]; }).reverse(), C.purple, .6, 3);
        b[0] !== a[0] ? zs(g, 'z-octorok-left', fx, fy, { flip: b[0] > a[0] }) : zs(g, 'z-octorok-front', fx, fy, { vflip: b[1] < a[1] });
        if (k < .3) T.label('?', fx, fy - 26, 'center', C.purple, 13);
        pl(g, 96, 60, face(96, 60, fx, fy), .8);
        hit(96, 60, 30, 40, t - 3.02); pop('-8', 30, 14, t - 3.04);
      } },
    liner: { name: 'Liner', gi: 'plain-arrow', col: '#d0602a', line: 'Flies a straight line to one spot on the screen', counter: 'Step off the line once it commits', ex: '',
      loop(g, t) {   // the article names no example; the blade traps of The Legend of Zelda move this way
        const k = ease(ph(t, 1.3, 1.8)), fx = lerp(80, -97, k), fy = lerp(-50, 68, k), s = ease(ph(t, 1, 1.3));
        const px = lerp(-40, -62, s), py = lerp(30, -12, s);
        if (t > .3 && t < 1.3) T.laser(80, -50, -86, 60, .5 + .4 * Math.sin(t * 14));
        if (t > 1.3 && t < 1.9) T.poof(lerp(80, -97, clamp(k - .15)), lerp(-50, 68, clamp(k - .15)), (t - 1.3) % .8, 8);
        zs(g, 'z-trap', fx, fy);
        if (t > 1.9 && t < 3.6) note('stops at its spot', -40, 78);
        pl(g, px, py, face(px, py, fx, fy), .8);
        hit(px, py, fx, fy, t - 2.4); pop('-9', fx + 4, fy - 30, t - 2.42); hit(px, py, fx, fy, t - 3); pop('-9', fx + 4, fy - 30, t - 3.02);
      } },
    dasher: { name: 'Dasher', gi: 'sprint', col: '#2f8a6a', line: 'Dashes faster than its normal speed', counter: 'Leave its row; punish the stop', ex: 'The Legend of Zelda’s Ropes',
      loop(g, t) {
        const fy = lerp(-58, 0, ph(t, 0, 1.4)), d = ease(ph(t, 1.7, 2)), fx = lerp(72, -92, d), py = 48 * ease(ph(t, 1.45, 1.72));
        if (t > 1.35 && t < 2) { g.fillStyle = 'rgba(229,50,45,.14)'; g.fillRect(-120, -16, 240, 32); }
        if (t > 1.4 && t < 1.7) T.label('!', 72, -28, 'center', C.redDk, 14);
        if (d > 0 && d < 1) for (let i = 1; i < 4; i++) T.tracer(fx + i * 14, -8 + i * 4, fx + i * 14 + 20, -8 + i * 4, .6, C.muted, 2);
        zs(g, 'z-rope', fx, fy);
        note(t > 1.7 && t < 2 ? 'speed ×4' : 'speed ×1', fx > 0 ? 72 : -76, fx > 0 ? fy + 30 : fy - 30, t > 1.7 && t < 2 ? C.redDk : C.muted);
        pl(g, -70, py, face(-70, py, fx, fy), .8);
        hit(-70, py, fx, fy, t - 2.6); pop('-9', fx + 6, fy - 28, t - 2.62); hit(-70, py, fx, fy, t - 3.2); pop('-9', fx + 6, fy - 28, t - 3.22);
      } },
    teleporter: { name: 'Teleporter', gi: 'teleport', col: '#8a4fd6', line: 'Teleports from one place to another', counter: 'Strike in the window after it lands', ex: 'The Legend of Zelda’s Wizzrobes',
      loop(g, t) {
        const P = [[60, -45], [-10, 52], [78, 38]], n = Math.floor(t / 1.3333) % 3, u = t % 1.3333, [fx, fy] = P[n], px = -72, py = -8;
        const a = u < .2 ? u / .2 : u < .9 ? 1 : u < 1.1 ? 1 - (u - .9) / .2 : 0;
        if (u < .5) T.poof(fx, fy, u, 16); if (u > .9) T.poof(fx, fy, u - .9, 16);
        if (a > 0) { if (u > .3 && u < .9) T.cone(fx, fy, face(fx, fy, px, py), .2, 60, .7); zs(g, 'z-wizzrobe', fx, fy, { a }); }
        pl(g, px, py, face(px, py, fx, fy), .8);
        if (n === 0) { hit(px, py, fx, fy, u - 1); pop('gone', fx, fy - 26, u - 1, C.muted); }
        else { hit(px, py, fx, fy, u - .45); pop('-10', fx, fy - 28, u - .47); }
      } },
    ponger: { name: 'Ponger', gi: 'rolling-energy', col: '#2ea3dc', line: 'Ignores gravity; bounces off walls in straight lines', counter: 'Read the bounce; stand off its path', ex: 'Zelda II’s Bubbles',
      loop(g, t) {
        const P = tt => [100 * tri(tt / 4), 68 * tri(tt / 2 + .25)];
        g.setLineDash([2, 7]); g.strokeStyle = 'rgba(46,163,220,.8)'; g.lineWidth = 2; g.beginPath();
        for (let i = 0; i <= 160; i++) { const [x, y] = P(i / 40); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.setLineDash([]);
        const [fx, fy] = P(t); T.flash(fx, fy, 20, .4); zs(g, 'z-bubble', fx, fy, { noShadow: true });
        pl(g, PONG[0], PONG[1], face(PONG[0], PONG[1], fx, fy), .7);
        note('never crossed', PONG[0], PONG[1] + 26, C.blue);
      } },
    mirror: { name: 'Mirror', gi: 'mirror-mirror', col: '#57b6ff', line: 'Mirrors the player’s movement, sometimes reversed', counter: 'Steer it with your own steps', ex: 'A Link to the Past’s Goriya',
      loop(g, t) {
        const a = ease(ph(t, .4, 1.3)), b = ease(ph(t, 1.5, 2.2)), px = lerp(-60, -22, b), py = lerp(42, -22, a), fx = -px, fy = -py;
        g.setLineDash([5, 6]); g.strokeStyle = 'rgba(87,182,255,.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-110, 0); g.lineTo(110, 0); g.moveTo(0, -80); g.lineTo(0, 80); g.stroke(); g.setLineDash([]);
        T.zone(22, 22, 17, 1); if (t < 2.2) note('trap', 22, 50, C.redDk);
        zs(g, t < 1.4 ? 'z-goriya-front' : 'z-goriya-left', fx, fy, { a: t > 2.3 && t < 3.2 && Math.floor(t * 12) % 2 ? .4 : 1 });
        pl(g, px, py, face(px, py, fx, fy), .8);
        if (t > .4 && t < 1.3) { note('you go up', -60, py - 28, C.blue); note('it goes down', 60, fy + 28, C.redDk); }
        if (t > 1.5 && t < 2.2) { note('you go right', px, py - 28, C.blue); note('it goes left', fx, fy - 28, C.redDk); }
        spark(22, 22, t - 2.25, 30); pop('-12', 22, -6, t - 2.27);
      } },
  });
  // where the player stands on the Ponger slide: a point its path never comes near (40 units clear)
  const PONG = [-50, 0];
})();
