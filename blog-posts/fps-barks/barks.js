/* Barks (genre breakdown: "FPS Game Design").
   Two enemies run a small state machine: patrol, alerted, firing, reloading, flanking. Each state change has a bark,
   a voice line that says the new state out loud. The player hides behind cover and peeks to shoot.
   With barks on, the player peeks when an enemy calls a reload and moves when one calls a flank. With barks off the
   same player can only guess, and peeks on a steady rhythm. The script and timings are illustrative. */
(function () {
  const C = TD.C, { clamp, lerp } = TD;
  const LOOP = 24;
  const BARK = { patrol: '', alerted: 'Contact! Over there!', firing: 'Suppressing!', reloading: 'Reloading! Cover me!', flanking: 'Moving left, flank him!', down: 'Man down!' };
  // [time, state] per enemy
  const A = [[0, 'patrol'], [2, 'alerted'], [3, 'firing'], [7, 'reloading'], [9, 'firing'], [13, 'flanking'], [16, 'firing'], [20, 'reloading'], [22, 'down']];
  const B = [[0, 'patrol'], [2.4, 'alerted'], [3.4, 'firing'], [6.8, 'reloading'], [9.2, 'firing'], [13, 'reloading'], [15, 'firing'], [19.8, 'reloading'], [22.2, 'firing']];
  const stateAt = (S, t) => { let s = S[0][1]; for (const [tt, st] of S) if (t >= tt) s = st; return s; };
  const PEEKS = {
    true: [[7.1, 8.6], [13.2, 14.5], [14.6, 15.8, 'move'], [20.1, 21.8]],
    false: [[4.5, 5.8], [8.5, 9.8], [12.5, 13.8], [16.5, 17.8], [20.5, 21.8]],
  };
  function play(barks) {   // walk the script: damage taken and shots landed per peek
    let hp = 100, landed = 0; const log = [];
    PEEKS[barks].forEach(([a, b, kind]) => {
      if (kind === 'move') { log.push({ t: a, txt: 'You heard the flank call and changed cover', ok: true }); return; }
      const shooters = [A, B].filter(S => { for (let x = a; x < b; x += .1) if (stateAt(S, x) === 'firing') return true; return false; }).length;
      hp -= shooters * 10; landed += shooters ? 0 : 1;
      log.push({ t: a, dmg: shooters * 10, txt: shooters ? `Peeked into ${shooters === 2 ? 'two rifles' : 'a rifle'}: -${shooters * 10} health` : 'Peeked while the rifles were quiet: clean shot', ok: !shooters });
    });
    if (!barks) { hp -= 20; log.push({ t: 16, dmg: 20, txt: 'The flanker reached you unheard: -20 health', ok: false }); }
    return { hp, landed, log: log.sort((x, y) => x.t - y.t) };
  }
  const RES = { true: play(true), false: play(false) };
  const NODES = { patrol: [770, 70], alerted: [930, 70], firing: [850, 175], reloading: [740, 280], flanking: [960, 280] };
  const EDGES = [['patrol', 'alerted'], ['alerted', 'firing'], ['firing', 'reloading'], ['reloading', 'firing'], ['firing', 'flanking'], ['flanking', 'firing']];

  GK.scene('barks', (s, g, ui) => {
    const on = s.querySelector('.fb-on'); ui.watch(on);
    const DUR = LOOP * 2;
    return {
      dur: DUR,
      frame(t, tour) {
        let barks = on.checked, lt;
        if (tour) { barks = t < LOOP; on.checked = barks; lt = t % LOOP; } else lt = t % LOOP;
        const res = RES[barks];
        GK.panel(g);
        // arena
        const x0 = 16, y0 = 16, w = 640, h = 553;
        TD.floor(x0, y0, w, h);
        TD.wall(x0 + 150, y0 + 220, 30, 120);   // player's cover
        TD.pillar(x0 + 420, y0 + 128, 44, 44); TD.pillar(x0 + 440, y0 + 398, 44, 44);
        const peek = PEEKS[barks].find(([a, b, k]) => lt >= a && lt < b && k !== 'move');
        const moved = barks && lt >= 14.6;
        const px = x0 + (peek ? 215 : 125), py = y0 + (moved ? 330 : 280) + (moved && lt < 14.6 ? (lt - 13.4) / 1.2 * 0 : 0);
        TD.player(px, py, 0);
        const ea = stateAt(A, lt), eb = stateAt(B, lt);
        const posA = ea === 'flanking' ? [lerp(x0 + 500, x0 + 300, clamp((lt - 13) / 3)), lerp(y0 + 150, y0 + 470, clamp((lt - 13) / 3))] : lt >= 16 ? [x0 + 300, y0 + 470] : [x0 + 500, y0 + 150];
        const posB = [x0 + 520, y0 + 420];
        [[posA, ea, A], [posB, eb, B]].forEach(([p, st, S]) => {
          if (st === 'down') { g.fillStyle = 'rgba(168,32,28,.4)'; g.beginPath(); g.arc(p[0], p[1], 16, 0, 6.28); g.fill(); return; }
          const ang = Math.atan2(py - p[1], px - p[0]);
          if (st === 'firing' && Math.floor(lt * 8) % 2) TD.tracer(p[0], p[1], lerp(p[0], px, .8), lerp(p[1], py, .8), .8);
          TD.foe(p[0], p[1], 17, ang, st === 'reloading' ? '#e09b97' : C.red, { mark: st === 'patrol' ? '' : 'scope' });
          const since = lt - S.filter(([tt]) => tt <= lt).pop()[0];
          if (barks && BARK[st] && since < 2.2) TD.label(BARK[st], p[0], p[1] - 34, 'center', st === 'reloading' ? C.good : C.redDk, 14);
        });
        if (peek) TD.label('peeking', px, py + 38, 'center', C.navy, 12);
        if (!barks) GK.text(g, 'barks off: the enemies change state in silence', x0 + 14, y0 + h - 14, '#fff', 14, 'left', 700);
        // state machine
        GK.head(g, 'Enemy state machine', 690, 34);
        EDGES.forEach(([a, b]) => { const [ax, ay] = NODES[a], [bx, by] = NODES[b]; g.strokeStyle = '#b9ad92'; g.lineWidth = 2; g.beginPath(); g.moveTo(ax, ay + (a === 'reloading' || b === 'reloading' ? 6 : 0)); g.lineTo(bx, by + (a === 'reloading' || b === 'reloading' ? 6 : 0)); g.stroke(); });
        Object.entries(NODES).forEach(([n, [x, y]]) => {
          const act = n === ea || n === eb;
          GK.box(g, x - 62, y - 22, 124, 44, act ? (n === 'reloading' ? '#d8f0df' : '#f9d9d6') : '#fffaf0', act ? (n === 'reloading' ? C.good : C.red) : '#cdbf9f', 10, act ? 3 : 2);
          GK.text(g, n, x, y + 5, C.ink, 15, 'center', 700);
        });
        GK.text(g, barks ? 'Each arrow says its new state out loud.' : 'The same arrows, with no voice lines.', 690, 340, C.muted, 13);
        // log
        GK.head(g, 'What the player did', 690, 380);
        res.log.filter(l => l.t <= lt).slice(-6).forEach((l, i) => { g.fillStyle = l.ok ? C.good : C.red; g.beginPath(); g.arc(698, 400 + i * 24, 5, 0, 6.28); g.fill(); GK.text(g, l.txt, 712, 405 + i * 24, C.ink, 13); });
        const hpNow = 100 - res.log.filter(l => l.t <= lt).reduce((a, l) => a + (l.dmg || 0), 0);
        GK.text(g, `health ${hpNow}`, 1020, 560, hpNow > 50 ? C.good : C.red, 15, 'right', 800);
        ui.stats(`<div class="g"><b>${RES.true.hp}</b><span>health left with barks (${RES.true.landed} clean shots)</span></div><div class="r"><b>${RES.false.hp}</b><span>health left without them (${RES.false.landed} clean shots)</span></div>`);
        ui.out(barks ? 'The reload call is a window: peek now and nobody shoots back. The flank call says where the next threat comes from. The enemy plays the same; it is just readable.'
          : 'Same enemies, same moves, no voice lines. The player has to guess when to peek, walks into rifles and never hears the flank coming.');
      },
    };
  });
})();
