/* The other 21 Souls archetypes from slide 168's list, as the same small top-down loops arch.js draws for the first seven.
   Zone Healer already lives in arch.js; the twenty here are added to ARCH so the gallery slides can run them.
   Slide 168 gives names only, so the behaviours and answers are our reading of each name in Souls-style combat:
   the pattern it repeats, and the answer it asks the player for. Same box (about 240 x 180, centred on 0,0) and LOOP. */
(function () {
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const ph = (t, a, b) => clamp((t - a) / (b - a));
  const pop = (s, x, y, age, col = C.redDk) => { if (age >= 0 && age < .9) T.popText(s, x, y - age * 26, col, 1 - age / .9); };
  const hit = (x0, y0, x1, y1, age, col = C.gold) => { if (age >= 0 && age < .22) T.tracer(x0, y0, x1, y1, 1 - age / .22, col, 5); };
  const spark = (x, y, age) => { if (age >= 0 && age < .3) T.flash(x, y, 26, 1 - age / .3); };
  const face = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
  const FOE = '#c2412c';
  const dizzy = (g, x, y, t) => { g.fillStyle = C.gold; for (let i = 0; i < 3; i++) { const a = t * 4 + i * 2.1; g.beginPath(); g.arc(x + Math.cos(a) * 16, y + Math.sin(a) * 5, 3, 0, TAU); g.fill(); } };
  const orb = (g, x, y, r, col) => { g.fillStyle = col; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke(); };

  const MORE = {
    // ---------- how it moves ----------
    ambusher: { name: 'Ambusher', gi: 'trap-mask', col: '#6a4a8a', line: 'Waits out of sight and strikes as you pass', counter: 'Check the corners; bait it out',
      loop(g, t) {
        T.pillar(-6, -70, 46, 46);
        const px = lerp(-100, -30, ease(ph(t, 0, 1.2))) - 45 * ease(ph(t, 1.3, 1.5)), py = 30;
        const out = ph(t, 1.3, 1.55), fx = lerp(58, -4, out), fy = lerp(-40, 14, out);
        if (t > 1.05 && t < 1.3) T.label('!', 58, -70, 'center', C.redDk, 14);
        if (t > 1.5 && t < 1.85) T.cone(fx, fy, face(fx, fy, px, py), .5, 60, 1 - ph(t, 1.5, 1.85));
        T.foe(fx, fy, 17, face(fx, fy, px, py), FOE, { mark: 'horns', a: t < 1.3 ? .3 : 1 });
        T.player(px, py, face(px, py, fx, fy), .85);
        pop('baited', px + 10, py - 30, t - 1.6, C.blue);
        hit(px + 12, py, fx - 12, fy, t - 2.4); pop('-18', fx, fy - 30, t - 2.42);
        hit(px + 12, py, fx - 12, fy, t - 2.9); pop('-18', fx, fy - 30, t - 2.92);
      } },
    tethered: { name: 'Tethered', gi: 'gem-chain', col: '#5d618c', line: 'Chained to one spot; it can only reach so far', counter: 'Fight from just past the chain',
      loop(g, t) {
        const ax = 60, ay = 0, R = 72;
        g.setLineDash([4, 6]); g.strokeStyle = 'rgba(93,97,140,.7)'; g.lineWidth = 2; g.beginPath(); g.arc(ax, ay, R, 0, TAU); g.stroke(); g.setLineDash([]);
        const lunge = ease(ph(t, .6, 1)) * (1 - ease(ph(t, 1.9, 2.6))), fx = ax - R * lunge - 6 * (1 - lunge), fy = 0;
        const n = 7; g.strokeStyle = '#7a7f9a'; g.lineWidth = 2;
        for (let i = 0; i < n; i++) { const k = (i + .5) / n, x = lerp(ax, fx, k); g.beginPath(); g.ellipse(x, Math.sin(k * Math.PI) * 6 * (1 - lunge), 5, 3, i % 2 ? Math.PI / 2 : 0, 0, TAU); g.stroke(); }
        orb(g, ax, ay, 8, C.stoneDk);
        if (t > .95 && t < 1.25) T.cone(fx, fy, Math.PI, .4, 30, 1 - ph(t, .95, 1.25));
        T.foe(fx, fy, 18, Math.PI, FOE, { mark: 'horns' });
        const px = t < 2.4 ? -30 : lerp(-30, -6, ease(ph(t, 2.4, 2.6)));
        T.player(px, 0, 0, .85);
        if (t > 1 && t < 1.9) T.label('end of the chain', fx, 34, 'center', C.muted, 11);
        hit(px + 12, 0, fx - 14, 0, t - 2.75); pop('-18', fx, -30, t - 2.77);
      } },
    charger: { name: 'Charger', gi: 'charging-bull', col: '#8a5a2a', line: 'Lines up, then charges straight through', counter: 'Sidestep the line; punish the stun',
      loop(g, t) {
        T.wall(96, -90, 24, 180);
        const run = ph(t, .9, 1.3), fx = lerp(-90, 76, ease(run)), fy = 0;
        const py = -58 * ease(ph(t, .95, 1.15)) * (1 - ease(ph(t, 3.5, 3.9)));
        if (t > .2 && t < .9) T.laser(fx + 18, 0, 96, 0, .4 + .4 * Math.sin(t * 14));
        if (run > 0 && run < 1) for (let i = 1; i < 3; i++) T.poof(fx - i * 22, 8, (t * 3 + i * .2) % .8, 8);
        T.foe(fx, fy, 20, 0, '#8a5a2a', { mark: 'horns' });
        if (t > 1.3 && t < 3.6) { dizzy(g, fx, fy - 28, t); T.label('stunned', fx, 32, 'center', C.goldInk, 11); }
        T.player(30, py, face(30, py, fx, fy), .85);
        hit(42, py, fx - 10, fy - 6, t - 2); pop('-25', fx, -40, t - 2.02); hit(42, py, fx - 10, fy - 6, t - 2.5); pop('-25', fx, -40, t - 2.52);
      } },
    teleporter: { name: 'Teleporter', gi: 'teleport', col: '#8a4fd6', line: 'Vanishes and reappears behind you', counter: 'Watch for the tell; turn and strike',
      loop(g, t) {
        const px = -30, gone = t > .8 && t < 1.5, back = t >= 1.5;
        const fx = back ? -90 : 50, fy = back ? 20 : 0;
        if (t > .65 && t < 1.1) T.poof(50, 0, t - .65, 18);
        if (t > 1.05 && t < 1.5) { const k = ph(t, 1.05, 1.5); g.strokeStyle = `rgba(138,79,214,${.9})`; g.lineWidth = 3; g.beginPath(); g.arc(-90, 20, 30 * (1 - k) + 8, 0, TAU); g.stroke(); T.label('tell', -90, -14, 'center', C.purple, 11); }
        if (!gone) T.foe(fx, fy, 18, face(fx, fy, px, 0), FOE, { mark: 'staff' });
        const turn = t < 1.4 ? 0 : t < 1.6 ? lerp(0, Math.PI, ph(t, 1.4, 1.6)) : face(px, 0, fx, fy);
        T.player(px, 0, turn, .85);
        if (t > 1.6 && t < 2.2) T.label('behind you', -60, 52, 'center', C.purple, 11);
        hit(px - 12, 0, fx + 14, fy, t - 1.9); pop('-18', fx, fy - 30, t - 1.92);
        hit(px - 12, 0, fx + 14, fy, t - 2.4); pop('-18', fx, fy - 30, t - 2.42);
      } },
    burrower: { name: 'Burrower', gi: 'mole', col: '#7a5a3a', line: 'Digs under and erupts beneath your feet', counter: 'Keep moving; hit it once it surfaces',
      loop(g, t) {
        const tx = -40, ty = 10, dig = ph(t, 0, 1.3), mx = lerp(80, tx, dig), my = lerp(-20, ty, dig);
        if (t < 1.4) { for (let i = 0; i < 6; i++) { const k = clamp(dig - i * .06); g.fillStyle = `rgba(122,90,58,${.5 - i * .07})`; g.beginPath(); g.arc(lerp(80, tx, k), lerp(-20, ty, k), 9 - i, 0, TAU); g.fill(); } T.poof(mx, my, (t * 2) % .8, 8); }
        const py = t < 1.1 ? ty : lerp(ty, -60, ease(ph(t, 1.1, 1.35)));
        if (t > 1.1 && t < 1.5) T.zone(tx, ty, 34, ph(t, 1.1, 1.5));
        if (t > 1.5 && t < 1.8) T.flash(tx, ty, 50, 1 - ph(t, 1.5, 1.8));
        if (t > 1.5) { T.foe(tx, ty, 19, face(tx, ty, tx, py), '#8a6a4a', { mark: 'horns' }); if (t < 3.4) T.label('surfaced', tx + 46, ty + 24, 'center', C.goldInk, 11); }
        T.player(tx, py, face(tx, py, tx, ty), .85);
        hit(tx, py + 12, tx, ty - 14, t - 2.2); pop('-18', tx + 30, ty - 20, t - 2.22);
        hit(tx, py + 12, tx, ty - 14, t - 2.7); pop('-18', tx + 30, ty - 20, t - 2.72);
      } },
    diveBomber: { name: 'Dive Bomber', gi: 'bat-wing', col: '#4a3a6a', line: 'Circles overhead, then dives at your spot', counter: 'Roll at the dive; hit it on the ground',
      loop(g, t) {
        const tx = -30, ty = 0, circ = t < 1.4, land = t >= 1.7 && t < 3.2;
        const cx = circ ? 30 + Math.cos(t * 3) * 60 : t < 1.7 ? lerp(30 + Math.cos(4.2) * 60, tx, ph(t, 1.4, 1.7)) : t < 3.2 ? tx : lerp(tx, 60, ph(t, 3.2, 4));
        const cy = circ ? -30 + Math.sin(t * 3) * 30 : t < 1.7 ? lerp(-30 + Math.sin(4.2) * 30, ty, ph(t, 1.4, 1.7)) : t < 3.2 ? ty : lerp(ty, -40, ph(t, 3.2, 4));
        const h = land ? 0 : t < 1.7 ? (circ ? 46 : 46 * (1 - ph(t, 1.4, 1.7))) : 46 * ph(t, 3.2, 4);
        if (t > .7 && t < 1.7) T.zone(tx, ty, 30, ph(t, .7, 1.4));
        if (t > 1.7 && t < 2) T.flash(tx, ty, 46, 1 - ph(t, 1.7, 2));
        T.foe(cx, cy - h, 16 + h * .08, 0, '#5a4a7a', { edge: '#2a2240' });
        GI.draw(g, 'bat-wing', cx - 18 - h * .1, cy - h, 18, '#2a2240'); GI.draw(g, 'bat-wing', cx + 18 + h * .1, cy - h, 18, '#2a2240');
        if (h > 6) T.label('high', cx, cy - h - 30, 'center', C.muted, 10);
        const py = t < 1.35 ? 0 : lerp(0, 55, ease(ph(t, 1.35, 1.6))) * (1 - ease(ph(t, 3.3, 3.8)));
        T.player(tx - 40, py, face(tx - 40, py, cx, cy), .85);
        if (land) T.label('landed', tx, ty + 32, 'center', C.goldInk, 11);
        hit(tx - 30, py, tx - 12, ty, t - 2.3); pop('-18', tx, -30, t - 2.32); hit(tx - 30, py, tx - 12, ty, t - 2.8); pop('-18', tx, -30, t - 2.82);
      } },
    floater: { name: 'Floater', gi: 'ghost', col: '#6a8ab0', line: 'Hovers just out of reach and drifts', counter: 'Use range, or strike when it dips',
      loop(g, t) {
        const dip = ease(ph(t, 2.3, 2.6)) * (1 - ease(ph(t, 3.3, 3.7)));
        const fx = 40 + Math.sin(t * 1.2) * 14, fy = Math.sin(t * 2) * 8, h = 40 * (1 - dip);
        T.player(-40, 20, face(-40, 20, fx, fy), .85);
        T.foe(fx, fy - h, 18, Math.PI, '#8aa6c8', { edge: '#3a5a80', a: .9 });
        if (h > 10 && (t < .4 || t > 1.5)) T.label('airborne', fx, fy - h - 30, 'center', C.muted, 10);
        if (t > .4 && t < .7) T.cone(-40, 20, face(-40, 20, fx, fy), .4, 46, 1, '255,185,81');
        pop('too high', fx, fy - h - 10, t - .55, C.muted);
        if (t > 1.2 && t < 1.6) { const k = ph(t, 1.2, 1.5); orb(g, lerp(-28, fx, k), lerp(14, fy - h, k), 5, C.gold); }
        pop('-12', fx, fy - h - 26, t - 1.5);
        hit(-28, 20, fx - 12, fy - h, t - 2.75); pop('-18', fx, fy - h - 26, t - 2.77);
      } },

    // ---------- how it reaches you ----------
    sniper: { name: 'Sniper', gi: 'crosshair', col: '#3a4a6a', line: 'Aims a long shot from far away', counter: 'Break line of sight; close the gap',
      loop(g, t) {
        const sx = 90, sy = -50; T.pillar(-24, -10, 30, 30);
        const p0 = [-85, -60], p1 = [-60, 34], k = ease(ph(t, .9, 1.3)), px = lerp(p0[0], p1[0], k), py = lerp(p0[1], p1[1], k);
        const k2 = ease(ph(t, 2.1, 3)), qx = t < 2.1 ? px : lerp(p1[0], 40, k2), qy = t < 2.1 ? py : lerp(p1[1], -14, k2);
        const ax = t < 1.3 ? px : p1[0], ay = t < 1.3 ? py : p1[1];
        if (t < 1.6) T.laser(sx - 14, sy, ax, ay, .3 + .5 * ph(t, 0, 1.4));
        if (t > 1.6 && t < 1.8) T.tracer(sx - 14, sy, -9, 5, 1 - ph(t, 1.6, 1.8), C.red, 4);
        spark(-9, 5, t - 1.62); pop('blocked', -9, -24, t - 1.65, C.blue);
        T.foe(sx, sy, 16, face(sx, sy, ax, ay), FOE, { mark: 'scope' });
        if (t > 1.2 && t < 1.6) T.label('aiming', sx, sy + 30, 'center', C.redDk, 11);
        if (t > 1.8 && t < 3.3) T.label('reloading', sx - 10, sy + 30, 'center', C.goldInk, 11);
        T.player(qx, qy, face(qx, qy, sx, sy), .85);
        hit(qx + 10, qy - 6, sx - 12, sy + 6, t - 3.2); pop('-25', sx - 10, sy + 34, t - 3.22);
      } },
    bombarder: { name: 'Bombarder', gi: 'unlit-bomb', col: '#4a4a4a', line: 'Lobs blasts at where you stand', counter: 'Keep moving; watch the markers',
      loop(g, t) {
        const fx = 92, fy = 0, S = [[-70, -50], [-40, 20], [-85, 55], [-70, -50]];
        let [px, py] = S[0]; for (let i = 0; i < 3; i++) { const k = ease(ph(t, .6 + i * 1.2, .85 + i * 1.2)); if (k > 0) { px = lerp(S[i][0], S[i + 1][0], k); py = lerp(S[i][1], S[i + 1][1], k); } }
        T.foe(fx, fy, 18, Math.PI, FOE, { mark: 'staff' });
        for (let i = 0; i < 3; i++) {
          const t0 = .2 + i * 1.2, a = t - t0; if (a < 0 || a > 1.3) continue;
          const [tx, ty] = S[i];
          if (a < 1) { T.zone(tx, ty, 26, .4 + .6 * a); const k = a, ox = lerp(fx, tx, k), oy = lerp(fy, ty, k) - Math.sin(k * Math.PI) * 50; orb(g, ox, oy, 6, '#3a3a3a'); }
          else { T.flash(tx, ty, 40, 1 - (a - 1) / .3); pop('miss', tx + 24, ty - 16, a - 1, C.muted); }
        }
        T.player(px, py, face(px, py, fx, fy), .85);
      } },
    grappler: { name: 'Grappler', gi: 'grab', col: '#8a5a2a', line: 'Reaches out, grabs you and pulls you in', counter: 'Sidestep the reach; punish the miss',
      loop(g, t) {
        const fx = 50, fy = 0, sx = -60, sy = 0, py = -56 * ease(ph(t, .95, 1.15)) * (1 - ease(ph(t, 3.4, 3.8)));
        if (t > .2 && t < 1.1) T.laser(fx - 18, fy, sx, sy, .5 + .5 * Math.sin(t * 14));
        const k = ph(t, 1.1, 1.35) * (1 - ph(t, 1.6, 2));
        if (k > 0) { T.tracer(fx, fy, lerp(fx, sx, k), lerp(fy, sy, k), 1, '#8a5a2a', 6); GI.draw(g, 'crab-claw', lerp(fx, sx, k), lerp(fy, sy, k), 26, '#8a5a2a', Math.PI); }
        pop('missed', sx, sy - 10, t - 1.4, C.muted);
        T.foe(fx, fy, 22, face(fx, fy, sx, py), '#a86a3a', { mark: 'horns' });
        if (t > 1.9 && t < 3.2) T.label('arm out', fx, 38, 'center', C.goldInk, 11);
        const bx = t < 2 ? sx : lerp(sx, 10, ease(ph(t, 2, 2.3)));
        T.player(bx, py, face(bx, py, fx, fy), .85);
        hit(bx + 12, py, fx - 20, fy, t - 2.4); pop('-18', fx, -34, t - 2.42); hit(bx + 12, py, fx - 20, fy, t - 2.9); pop('-18', fx, -34, t - 2.92);
      } },
    desecrator: { name: 'Desecrator', gi: 'acid', col: '#6a8a2a', line: 'Leaves poison pools wherever it goes', counter: 'Fight it away from its pools',
      loop(g, t) {
        const P = k => [lerp(80, -40, k / 4) + Math.sin(k * 1.5) * 10, -10 + Math.sin(k * 1.3) * 45];
        for (let i = 0; i < 8; i++) { const tt = i * .5; if (tt > t) break; const [x, y] = P(tt); T.zone(x, y, 18 + Math.min(1, (t - tt) * 3) * 6, .8, '138,160,40'); }
        const [fx, fy] = P(t);
        T.foe(fx, fy, 18, face(...P(t - .1), fx, fy), '#7a9a3a', { edge: '#3a5a1a', mark: 'horns' });
        const px = -95, py = lerp(60, 20, ph(t, 0, 4));
        T.player(px, py, face(px, py, fx, fy), .85);
        if (t > 1.5 && t < 3.5) T.label('stay off the pools', -60, 72, 'center', C.good, 11);
        hit(px + 12, py, fx - 14, fy, t - 3.2); pop('-18', fx, fy - 30, t - 3.22);
      } },
    exploder: { name: 'Exploder', gi: 'explosion-rays', col: '#d0602a', line: 'Rushes in and blows itself up', counter: 'Kill it at range, or get clear',
      loop(g, t) {
        const run = ph(t, 0, 1.2), fx = lerp(96, -40, ease(run)), fy = 0, boom = t > 1.6 && t < 2;
        const py = -62 * ease(ph(t, 1.05, 1.35)) * (1 - ease(ph(t, 3.2, 3.7))), px = -70;
        if (t > 1 && t < 1.6) T.zone(-40, 0, 54 * ph(t, 1, 1.6), 1);
        if (t < 1.6) { T.foe(fx, fy, 14, Math.PI, Math.sin(t * (8 + t * 12)) > 0 ? '#ff8a3a' : FOE, { mark: 'horns' }); if (t > .9) T.label('fuse', fx, fy - 30, 'center', C.redDk, 11); }
        if (boom) T.flash(-40, 0, 70, 1 - ph(t, 1.6, 2));
        if (t > 1.6 && t < 2.4) T.poof(-40, 0, t - 1.6, 30);
        T.player(px, py, face(px, py, fx, fy), .85);
        pop('clear', px, py + 44, t - 1.8, C.blue);
      } },
    slug: { name: 'Slug', gi: 'snail', col: '#8a8a3a', line: 'Slow and tough; touching it hurts', counter: 'Kite it: hit, step back, repeat',
      loop(g, t) {
        const fx = lerp(60, -10, t / 4), fy = 0;
        g.fillStyle = 'rgba(160,170,80,.25)'; g.beginPath(); g.roundRect(fx, -14, Math.min(100, 118 - fx), 28, 14); g.fill();
        const bk = [[.3, 1.1], [1.5, 2.3], [2.7, 3.5]];
        let px = -60; bk.forEach(([a, b], i) => { px -= 14 * ease(ph(t, a + .4, b)); });
        px += 0;
        T.foe(fx, fy, 28, Math.PI, '#a8a85a', { edge: '#5a5a20', hp: 1 - .1 * Math.floor(clamp(t / 1.2, 0, 3.2)), hpMax: 1 });
        T.zone(fx, fy, 38, .5);
        T.player(px, 0, 0, .85);
        bk.forEach(([a], i) => { hit(px + 12, 0, fx - 28, 0, t - a); pop('-6', fx, -48, t - a - .02); });
        if (t > 3.5) T.label('keep the gap', px, 34, 'center', C.blue, 11);
      } },
    reflector: { name: 'Reflector', gi: 'mirror-mirror', col: '#3a8aa8', line: 'Turns your shots back at you', counter: 'Strike when the mirror drops',
      loop(g, t) {
        const fx = 50, px = t < 2 ? -70 : lerp(-70, 14, ease(ph(t, 2, 2.4))), mirror = t > .3 && t < 1.8;
        if (mirror) { g.strokeStyle = 'rgba(58,138,168,.9)'; g.lineWidth = 5; g.beginPath(); g.arc(fx, 0, 28, Math.PI - .9, Math.PI + .9); g.stroke(); T.label('mirror up', fx, 36, 'center', '#2a6a88', 11); }
        if (t > .5 && t < .9) orb(g, lerp(px + 14, fx - 26, ph(t, .5, .9)), 0, 6, C.gold);
        if (t > .9 && t < 1.3) orb(g, lerp(fx - 26, px + 14, ph(t, .9, 1.3)), -4, 6, '#57b6ff');
        spark(fx - 26, 0, t - .9); pop('-12', px, -30, t - 1.3);
        T.foe(fx, 0, 18, Math.PI, '#5aa8c8', { edge: '#2a6a88' });
        T.player(px, 0, 0, .85);
        hit(px + 12, 0, fx - 16, 0, t - 2.6); pop('-18', fx, -30, t - 2.62); hit(px + 12, 0, fx - 16, 0, t - 3.1); pop('-18', fx, -30, t - 3.12);
      } },

    // ---------- who it brings, and how it hits back ----------
    directHealer: { name: 'Direct Healer', gi: 'health-increase', col: '#2fae63', line: 'Beams heals into one ally at a time', counter: 'Hit the healer, not its patient',
      loop(g, t) {
        const ax = 10, ay = -30, hx = 80, hy = 46, alive = t < 2.9;
        const toH = ease(ph(t, 2, 2.5)), px = lerp(-60, 46, toH), py = lerp(-30, 50, toH);
        const hpA = t < 1 ? .9 - ph(t, .3, 1) * .4 : t < 2.2 ? .5 + ph(t, 1.1, 2.2) * .4 : .9;
        if (t > 1.1 && alive) T.beam(hx, hy, ax, ay, t);
        T.foe(ax, ay, 16, face(ax, ay, px, py), '#e07a6e', { hp: hpA, hpMax: 1 });
        if (t > 1.1 && t < 2.2) pop('+', ax, ay - 30, (t - 1.1) % .6, C.good);
        T.foe(hx, hy, 15, face(hx, hy, ax, ay), '#3a9a5a', { mark: 'staff', edge: '#1a5a2a', hp: t < 2.6 ? 1 : t < 3.1 ? .5 : .1, hpMax: 1 });
        T.player(px, py, face(px, py, t < 2 ? ax : hx, t < 2 ? ay : hy), .85);
        hit(px + 12, py, ax - 12, ay, t - .4); pop('-18', ax, ay - 30, t - .42); hit(px + 12, py, ax - 12, ay, t - .8); pop('-18', ax, ay - 30, t - .82);
        hit(px + 12, py, hx - 12, hy, t - 2.6); pop('-25', hx, hy - 30, t - 2.62); hit(px + 12, py, hx - 12, hy, t - 3.1); pop('-25', hx, hy - 30, t - 3.12);
      } },
    enchanter: { name: 'Enchanter', gi: 'magic-shield', col: '#7a5ad6', line: 'Wards its allies so your hits glance off', counter: 'Take out the enchanter; the wards fade',
      loop(g, t) {
        const allies = [[0, -40], [10, 30]], ex = 80, ey = -10, warded = t > .5 && t < 2.9;
        const toE = ease(ph(t, 1.7, 2.2)), px = lerp(-70, 52, toE), py = lerp(0, -10, toE);
        allies.forEach(([x, y], i) => { if (t > .3 && t < .9) T.beam(ex, ey, x, y, t, 1 - ph(t, .7, .9)); T.foe(x, y, 15, face(x, y, px, py), '#e07a6e'); if (warded) T.bubble(x, y, 22, t + i, .9); });
        T.foe(ex, ey, 16, Math.PI, '#7a5ad6', { mark: 'staff', edge: '#3a2a80' });
        T.player(px, py, face(px, py, t < 1.7 ? 0 : ex, t < 1.7 ? -40 : ey), .85);
        hit(px + 12, py, -14, -36, t - 1.1); spark(-18, -38, t - 1.1); pop('warded', 0, -70, t - 1.15, C.blue);
        hit(px + 12, py, ex - 14, ey, t - 2.5); pop('-25', ex, ey - 30, t - 2.52);
        if (t > 2.9 && t < 3.9) T.label('wards gone', 5, 0, 'center', C.goldInk, 11);
      } },
    spawner: { name: 'Spawner', gi: 'egg-clutch', col: '#a86a3a', line: 'A nest that keeps hatching enemies', counter: 'Destroy the nest, not the stream',
      loop(g, t) {
        const nx = 80, ny = 0, run = ease(ph(t, 1.6, 2.2)), px = lerp(-80, 44, run), py = lerp(0, 30, run);
        const hpN = t < 2.5 ? 1 : t < 3 ? .6 : .2;
        g.fillStyle = '#c9a070'; g.strokeStyle = '#6a4a2a'; g.lineWidth = 3; g.beginPath(); g.ellipse(nx, ny, 26, 20, 0, 0, TAU); g.fill(); g.stroke();
        GI.draw(g, 'egg-clutch', nx, ny, 30, '#6a4a2a'); T.hp(nx, ny - 34, 44, hpN, 1);
        for (let i = 0; i < 4; i++) { const a = t - i * .8; if (a < 0) continue; const k = clamp(a / 2.2), mx = lerp(nx - 20, -60, k), my = Math.sin(i * 2.3) * 50 * k; T.foe(mx, my, 10, Math.PI, '#e07a6e', { a: a < .2 ? a / .2 : 1 }); if (a < .4) T.poof(nx - 20, 0, a, 10); }
        T.player(px, py, face(px, py, nx, ny), .85);
        if (t > 1.5 && t < 2.2) T.label('run past', px, py + 30, 'center', C.blue, 11);
        hit(px + 12, py, nx - 22, ny + 6, t - 2.5); pop('-30', nx, -50, t - 2.52); hit(px + 12, py, nx - 22, ny + 6, t - 3); pop('-30', nx, -50, t - 3.02);
      } },
    summoner: { name: 'Summoner', gi: 'pentacle', col: '#8a2a6a', line: 'Stops to call in help mid-fight', counter: 'Interrupt the cast, or rush it first',
      loop(g, t) {
        const sx = 70, sy = 0, cast1 = t > .2 && t < 1.2, cast2 = t > 2 && t < 2.6;
        const rush = ease(ph(t, 2, 2.5)), px = lerp(-80, 36, rush), py = lerp(30, 10, rush);
        if (cast1 || cast2) { const k = cast1 ? ph(t, .2, 1.2) : ph(t, 2, 3); g.strokeStyle = 'rgba(138,42,106,.8)'; g.lineWidth = 3; g.beginPath(); g.arc(sx, sy, 34, -Math.PI / 2, -Math.PI / 2 + TAU * k); g.stroke(); GI.draw(g, 'pentacle', sx, sy + 46, 20, '#8a2a6a', t); }
        [[0, -50], [0, 50]].forEach(([x, y], i) => { const a = t - 1.2; if (a < 0) return; if (a < .5) T.poof(x, y, a, 14); T.foe(x, y, 13, face(x, y, px, py), '#e07a6e', { a: clamp(a / .3) }); });
        T.foe(sx, sy, 17, Math.PI, '#a84a8a', { mark: 'staff', edge: '#5a1a4a' });
        if (cast2) T.label('casting…', sx, sy - 34, 'center', '#8a2a6a', 11);
        T.player(px, py, face(px, py, sx, sy), .85);
        hit(px + 12, py, sx - 14, sy, t - 2.6); pop('stopped', sx - 20, sy - 40, t - 2.62, C.blue); hit(px + 12, py, sx - 14, sy, t - 3.1); pop('-18', sx, sy - 30, t - 3.12);
      } },
    splitter: { name: 'Splitter', gi: 'split-arrows', col: '#2a8a6a', line: 'Breaks into smaller copies when hit hard', counter: 'Save a wide attack for the pieces',
      loop(g, t) {
        const px = -60, split = ph(t, 1.2, 1.6);
        if (t < 1.3) T.foe(30, 0, 26, Math.PI, '#4aa88a', { edge: '#1a5a4a', hp: t < .6 ? 1 : t < 1 ? .5 : .1, hpMax: 1 });
        if (t > 1.15 && t < 1.95) T.poof(30, 0, t - 1.15, 22);
        const alive = t < 2.75;
        if (t >= 1.2 && alive) [[-1, 0], [1, 0]].forEach(([s]) => T.foe(30 - 20 * split, s * 34 * split, 15, Math.PI, '#4aa88a', { edge: '#1a5a4a' }));
        if (t > 2.4 && t < 2.8) T.cone(px, 0, 0, .8, 110, 1 - ph(t, 2.4, 2.8), '255,185,81');
        if (t >= 2.75 && t < 3.4) [-1, 1].forEach(s => T.poof(10, s * 34, t - 2.75, 14));
        T.player(px, 0, 0, .85);
        hit(px + 12, 0, 6, 0, t - .5); pop('-20', 30, -40, t - .52); hit(px + 12, 0, 6, 0, t - .95); pop('-20', 30, -40, t - .97);
        pop('split!', 30, 50, t - 1.25, C.goldInk); pop('-15 -15', 10, -60, t - 2.5);
      } },
    duelist: { name: 'Duelist', gi: 'fencer', col: '#a83a4a', line: 'Parries your swing and ripostes', counter: 'Vary your timing; bait the parry',
      loop(g, t) {
        const fx = 30, px = -40;
        const parry1 = t > .55 && t < .85, parry2 = t > 1.9 && t < 2.2;
        T.foe(fx, 0, 19, Math.PI, '#c85a6a', { mark: 'staff', edge: '#6a1a2a' });
        if (parry1 || parry2) { g.strokeStyle = '#ffd88a'; g.lineWidth = 4; g.beginPath(); g.arc(fx, 0, 27, Math.PI - .8, Math.PI + .8); g.stroke(); }
        hit(px + 12, 0, fx - 18, 0, t - .6); spark(fx - 22, 0, t - .62); pop('parried', fx, -36, t - .65, C.blue);
        if (t > .85 && t < 1.1) T.cone(fx, 0, Math.PI, .3, 70, 1 - ph(t, .85, 1.1)); pop('-20', px, 40, t - .9);
        const feint = t > 1.6 && t < 2.1 ? Math.sin(ph(t, 1.6, 2.1) * Math.PI) * 10 : 0;
        T.player(px + feint, 0, 0, .85);
        pop('feint', px, -34, t - 1.7, C.muted); pop('whiff', fx, -36, t - 2, C.muted);
        hit(px + 12, 0, fx - 18, 0, t - 2.45); pop('-25', fx, -36, t - 2.47);
      } },
  };
  Object.assign(window.ARCH.ARCH, MORE);
})();
