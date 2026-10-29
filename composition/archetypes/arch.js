/* Souls-genre enemy archetypes (MGM C4 M7, deck slides 155-173): each archetype is a recurring play pattern, drawn here as a
   small top-down loop that is a pure function of time. ARCH[key] = { name, gi, col, line, counter, loop(g, t, o) }.
   loop draws in a local box about 240 x 180 centred on 0,0: the foe, the player and the telegraphs, with o.k the scale.
   The behaviours follow the speaker notes for each archetype; the player's answer is the one the notes name. */
(function () {
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const LOOP = 4;
  const ph = (t, a, b) => clamp((t - a) / (b - a));
  const pop = (s, x, y, age, col = C.redDk) => { if (age >= 0 && age < .9) T.popText(s, x, y - age * 26, col, 1 - age / .9); };
  const hit = (x0, y0, x1, y1, age) => { if (age >= 0 && age < .22) T.tracer(x0, y0, x1, y1, 1 - age / .22, C.gold, 5); };
  const spark = (x, y, age) => { if (age >= 0 && age < .3) T.flash(x, y, 26, 1 - age / .3); };
  function arena(g, w = 240, h = 180) {
    g.save(); g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 12); g.clip(); T.floor(-w / 2, -h / 2, w, h); g.restore();
    g.strokeStyle = C.floorLn; g.lineWidth = 2; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 12); g.stroke();
  }
  const face = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);

  const ARCH = {
    flailer: { name: 'Flailer', gi: 'flail', col: '#d0602a', line: 'A rapid flurry once you step into range', counter: 'Block the flurry, then hit back',
      loop(g, t) {
        const px = lerp(-95, -42, ease(ph(t, 0, .8))), fx = 40;
        const combo = t > 1 && t < 2.3, blocking = t > 1.05 && t < 2.35;
        if (t < 1) T.zone(fx, 0, 74, .6);
        for (let i = 0; i < 4; i++) { const a = t - 1 - i * .32; if (a >= 0 && a < .3) T.cone(fx, 0, Math.PI + (i % 2 ? .45 : -.45), .55, 74, 1 - a / .3); }
        T.foe(fx + (combo ? Math.sin(t * 30) * 2 : 0), 0, 19, Math.PI, C.red, { mark: 'horns' });
        T.player(px, 0, 0, .85);
        if (blocking) T.bubble(px, 0, 24, t, .9);
        for (let i = 0; i < 4; i++) pop('block', px, -32, t - 1.1 - i * .32, C.blue);
        hit(px + 14, 0, fx - 16, 0, t - 2.6); pop('-14', fx, -30, t - 2.62);
      } },
    fighter: { name: 'Fighter', gi: 'crossed-swords', col: '#b0392f', line: 'Keeps its distance and times its attacks', counter: 'Watch your stamina; don’t over-commit',
      loop(g, t) {
        const ang = Math.sin(t * 1.4) * .7, fx = Math.cos(ang) * 80 - 20, fy = Math.sin(ang) * 60;
        const lunge = t > 2.5 && t < 2.9 ? ease(ph(t, 2.5, 2.75)) * 40 : 0, px = -60;
        const st = t < .8 ? 1 : t < 1.6 ? .55 : t < 2.6 ? .12 : clamp(.12 + (t - 2.6) * .4);
        const a = face(fx, fy, px, 0), lx = fx + Math.cos(a) * lunge, ly = fy + Math.sin(a) * lunge;
        if (t > 2.15 && t < 2.6) T.cone(fx, fy, a, .25, 80, ph(t, 2.15, 2.5));
        T.foe(lx, ly, 18, a, C.red, { mark: 'staff' });
        T.player(px, 0, face(px, 0, fx, fy), .85);
        hit(px + 10, 0, px + 60, Math.sin(.8) * 20, t - .8); hit(px + 10, 0, px + 60, -10, t - 1.6);
        pop('miss', px + 40, -30, t - .85, C.muted); pop('miss', px + 40, -30, t - 1.65, C.muted);
        pop('-20', px, -30, t - 2.8);
        g.fillStyle = 'rgba(21,32,68,.7)'; g.fillRect(px - 26, 30, 52, 8); g.fillStyle = st < .2 ? C.red : C.p2; g.fillRect(px - 25, 31, 50 * st, 6);
        if (st < .2) T.label('stamina low', px, 52, 'center', C.redDk, 11);
      } },
    brute: { name: 'Brute', gi: 'ogre', col: '#7a4a2a', line: 'One slow, heavy, punishing slam', counter: 'Roll out, then punish the recovery',
      loop(g, t) {
        const fx = 40, tele = ph(t, .3, 1.7), slam = t > 1.7 && t < 2.0;
        const px = t < 1.4 ? -20 : lerp(-20, -95, ease(ph(t, 1.4, 1.8))), back = t > 2.3 ? lerp(-95, -30, ease(ph(t, 2.3, 2.7))) : px;
        if (t > .3 && t < 1.7) T.zone(fx - 40, 0, 62 * tele, .5 + tele * .5);
        if (slam) T.flash(fx - 40, 0, 80, 1 - ph(t, 1.7, 2.0));
        T.foe(fx, 0, 32, Math.PI, '#c2412c', { mark: 'horns' });
        T.player(t > 2.3 ? back : px, 0, 0, .85);
        if (t > 2.1 && t < 3.6) T.label('slow recovery', fx, -50, 'center', C.goldInk, 11);
        hit(back + 14, 0, fx - 30, 0, t - 2.8); pop('-30', fx, -44, t - 2.82); hit(back + 14, 0, fx - 30, 0, t - 3.2); pop('-30', fx, -44, t - 3.22);
      } },
    sweeper: { name: 'Sweeper', gi: 'spinning-sword', col: '#9a3a8a', line: 'Wide arcs that cover a huge area', counter: 'Get out of the arc, or get behind it',
      loop(g, t) {
        const fx = 30, sw = ph(t, 1.2, 1.8), tele = t > .4 && t < 1.2;
        const px = t < 1 ? -55 : lerp(-55, -100, ease(ph(t, .9, 1.2)));
        if (tele) T.cone(fx, 0, Math.PI, 1.35, 100, .35 + .3 * Math.sin(t * 12));
        if (t > 1.2 && t < 1.95) { const a = Math.PI - 1.35 + sw * 2.7; T.cone(fx, 0, a - .3 + .3, Math.min(.35, sw * 3), 100, 1); T.cone(fx, 0, Math.PI - 1.35 + sw * 1.35, sw * 1.35, 100, .45); }
        T.foe(fx, 0, 22, Math.PI - 1.35 + sw * 2.7 * (t < 2 ? 1 : 0), '#c2412c', { mark: 'staff' });
        T.player(t > 2.2 ? lerp(-100, -40, ease(ph(t, 2.2, 2.6))) : px, 0, 0, .85);
        hit(-26, 0, fx - 20, 0, t - 2.8); pop('-16', fx, -34, t - 2.82);
      } },
    defender: { name: 'Defender', gi: 'checked-shield', col: '#3d6ea8', line: 'Hides behind a shield; the front can’t be hurt', counter: 'Go around it, or break the guard',
      loop(g, t) {
        const fx = 20, orbit = ease(ph(t, 1.1, 2.3)), ang = Math.PI + orbit * Math.PI * .95;
        const px = fx + Math.cos(ang) * 70, py = Math.sin(ang) * 60;
        const fa = t < 1.1 ? Math.PI : Math.PI + orbit * Math.PI * .45;   // turns slower than you circle
        T.foe(fx, 0, 21, fa, '#c2412c', { mark: 'shield' });
        T.player(px, py, face(px, py, fx, 0), .85);
        hit(px + 10, py, fx - 22, 0, t - .55); spark(fx - 26, 0, t - .55); pop('clang', fx - 30, -34, t - .6, C.blue);
        hit(px, py, fx + 14, 0, t - 2.7); pop('-18', fx, -34, t - 2.72);
        if (t > 2.4 && t < 3.6) T.label('open back', fx + 40, 40, 'center', C.goldInk, 11);
      } },
    evader: { name: 'Evader', gi: 'dodge', col: '#2f8a6a', line: 'Sidesteps your strikes on a cooldown', counter: 'Bait the dodge, then strike',
      loop(g, t) {
        const px = -60, dodge = ease(ph(t, .7, .95)), back = ease(ph(t, 2.6, 3.4));
        const fy = lerp(0, -48, dodge) * (1 - back), fx = 30;
        const cd = t > .95 && t < 2.6 ? 1 - ph(t, .95, 2.6) : 0;
        T.foe(fx, fy, 18, face(fx, fy, px, 0), '#c2412c', { mark: 'horns' });
        if (t > .7 && t < 1.1) T.poof(fx, 0, t - .7, 20);
        if (cd > 0) { g.strokeStyle = C.purple; g.lineWidth = 4; g.beginPath(); g.arc(fx, fy, 27, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cd); g.stroke(); T.label('dodge on cooldown', fx, fy - 42, 'center', C.purple, 11); }
        T.player(px, 0, face(px, 0, fx, fy), .85);
        hit(px + 12, 0, fx - 14, 0, t - .6); pop('dodged', fx + 10, 24, t - .9, C.muted);
        hit(px + 12, 0, fx - 14, fy, t - 1.5); pop('-18', fx, fy - 30, t - 1.52);
      } },
    rampager: { name: 'Rampager', gi: 'charging-bull', col: '#b8572a', line: 'A rushing flurry, then a long rest', counter: 'Survive the rush, punish the rest',
      loop(g, t) {
        const run = ease(ph(t, .3, 1.8)), fx = lerp(90, -60, run), fy = Math.sin(run * Math.PI * 3) * 30;
        const py = t < .9 ? 0 : lerp(0, -62, ease(ph(t, .8, 1.1)));
        if (t > .3 && t < 1.8) for (let i = 0; i < 3; i++) T.cone(fx, fy, Math.PI + Math.sin(t * 14 + i) * .5, .7, 56, .5);
        const rest = t > 1.9 && t < 3.8;
        T.foe(fx + (rest ? 0 : 0), fy, 22, Math.PI, '#c2412c', { mark: 'horns' });
        if (rest) { T.label('exhausted', fx, fy - 40, 'center', C.goldInk, 11); g.fillStyle = C.gold; for (let i = 0; i < 3; i++) { const a = t * 4 + i * 2.1; g.beginPath(); g.arc(fx + Math.cos(a) * 18, fy - 26 + Math.sin(a) * 5, 3, 0, Math.PI * 2); g.fill(); } }
        T.player(-40, py, face(-40, py, fx, fy), .85);
        hit(-30, py, fx, fy, t - 2.4); pop('-16', fx, fy - 30, t - 2.42); hit(-30, py, fx, fy, t - 2.9); pop('-16', fx, fy - 30, t - 2.92);
      } },
    healer: { name: 'Zone Healer', gi: 'healing', col: '#2fae63', line: 'Heals every ally standing near it', counter: 'Pull allies away, or take it out first',
      loop(g, t) {
        const pulse = (t % 1.3) / 1.3;
        T.zone(0, 0, 70, 1, '47,174,99'); g.strokeStyle = `rgba(47,174,99,${1 - pulse})`; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 70 * pulse, 0, Math.PI * 2); g.stroke();
        [[-45, -30], [48, 22], [10, 52]].forEach(([x, y], i) => { T.foe(x, y, 12, 0, '#e07a6e', { hp: .55 + .4 * ((t * .25 + i * .3) % 1), hpMax: 1 }); pop('+', x, y - 22, (t + i * .4) % 1.3, C.good); });
        T.foe(0, 0, 18, Math.PI, '#c2412c', { mark: 'staff' });
        T.player(-100, 60, -.5, .85);
      } },
  };
  // the rest of slide 168's list, names only
  const MORE = ['Ambusher', 'Tethered', 'Charger', 'Teleporter', 'Direct Healer', 'Sniper', 'Burrower', 'Enchanter', 'Desecrator', 'Bombarder',
    'Exploder', 'Slug', 'Grappler', 'Dive Bomber', 'Floater', 'Spawner', 'Summoner', 'Splitter', 'Reflector', 'Duelist'];
  window.ARCH = { ARCH, MORE, LOOP, arena };
})();
