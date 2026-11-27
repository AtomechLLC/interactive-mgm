// The longer and brighter the tell, the bigger the threat can be: three attacks from one monster, each plotted as
// tell length against damage, then a fourth that breaks the rule.
// Figures come from assets/cast.js (native facing: right). Pip stands on the left facing right; Grub on the right is mirrored to face Pip.
(function () {
  const { C, clamp, lerp, seg, ease, easeOut, text, para, rrect, panel, bar, captions } = DC;
  const DUR = 20, FLOOR = 640, PX = 300, GX = 530;
  // name, tell seconds, damage % of health, start time, how Pip answers
  const ATK = [{ n: 'Jab', tell: .2, dmg: 10, t0: 1.2, ans: 'none' }, { n: 'Swipe', tell: .7, dmg: 40, t0: 5.4, ans: 'block' }, { n: 'Slam', tell: 1.6, dmg: 95, t0: 9.6, ans: 'roll' }];
  const ROGUE = { n: 'Cheap shot', tell: .2, dmg: 95, t0: 14.6 }, REACT = .25;

  function stage(g, t) {
    panel(g, 40, 140, 860, 650, 'One monster, three attacks', 'The glow and the wind-up are the tell');
    g.fillStyle = '#d9cfb6'; g.fillRect(60, FLOOR, 820, 6);
    let cur = null; for (const a of [...ATK, ROGUE]) if (t >= a.t0 - .2 && t < a.t0 + a.tell + 2.2) cur = a;
    let drawBar = null, gPose = 'guard', pPose = 'guard', px = PX, glow = 0, hpLoss = 0, note = null, flashP = 0, shock = 0;
    for (const a of ATK) if (t >= a.t0 + a.tell && a.ans === 'none') hpLoss += a.dmg;
    if (t >= ROGUE.t0 + ROGUE.tell) hpLoss = 100;
    if (cur) {
      const u = t - cur.t0, k = seg(u, 0, cur.tell), after = u - cur.tell, big = cur.dmg > 50;
      if (u >= 0 && u < cur.tell) { gPose = CAST.mix('guard', 'windup', easeOut(k)); glow = (big ? 1 : cur.dmg > 20 ? .6 : .25) * (cur === ROGUE ? .25 : 1) * (.5 + .5 * k); }
      else if (after >= 0 && after < .18) { gPose = CAST.mix('windup', 'strike', after / .18); glow = 0; }
      else if (after >= .18 && after < .9) gPose = CAST.mix('follow', 'guard', ease(seg(after, .3, .9)));
      if (after >= 0) shock = big ? clamp(1 - after / .5) : 0;
      const ans = cur.ans;
      if (ans === 'block' && u > REACT + .15 && after < .6) { pPose = 'block'; if (after >= .1 && after < 1.6) note = ['Blocked', C.green, after - .1]; }
      else if (ans === 'roll') { const r = seg(u, REACT + .35, REACT + 1.0); if (r > 0 && r < 1) pPose = CAST.roll(1 - r);   // a back roll: he keeps facing the monster and tumbles away from it
        px = PX - 170 * ease(r) + 170 * ease(seg(after, 1.0, 1.9)); if (after > 1.0 && after < 1.9) pPose = CAST.cycle('walk', after * 2.5);
        if (after >= .1 && after < 1.6) note = ['Dodged', C.green, after - .1]; }
      else if (after >= .1) { if (after < .6) { pPose = 'hit'; flashP = clamp(1 - (after - .1) / .4); } if (cur === ROGUE && after >= .6) pPose = 'down';
        if (after < 1.7) note = ['−' + cur.dmg + '%', C.red, after - .1]; }
      drawBar = () => {
      // the tell bar
      const bx = 90, by = 712, bw = 760, sc = bw / 2;
      text(g, cur.n + ': tell ' + cur.tell.toFixed(1) + ' s, damage ' + cur.dmg + '% of health', bx, by - 20, { size: 22, weight: 700 });
      rrect(g, bx, by, bw, 26, 13, '#e6dcc6'); rrect(g, bx, by, Math.max(10, sc * cur.tell * k), 26, 8, cur === ROGUE ? C.red : C.gold);
      g.fillStyle = C.navy; g.fillRect(bx + sc * cur.tell - 2, by - 6, 4, 38); if (cur.tell > REACT) text(g, 'hit lands', bx + sc * cur.tell + 10, by + 19, { size: 16, weight: 600, color: C.ink });
      g.setLineDash([5, 5]); g.strokeStyle = C.muted; g.lineWidth = 2; g.beginPath(); g.moveTo(bx + sc * REACT, by - 4); g.lineTo(bx + sc * REACT, by + 36); g.stroke(); g.setLineDash([]);
      text(g, cur.tell > REACT ? 'human reaction time, about 0.25 s' : 'human reaction time, about 0.25 s: the hit lands first', bx + sc * REACT + 8, by + 54, { size: 17, color: C.muted });
      };
    } else text(g, 'Next attack…', 90, 714, { size: 22, color: C.muted });
    // glow behind the monster: brighter and larger for the bigger hit
    if (glow > 0) { const gr = g.createRadialGradient(GX + 10, FLOOR - 150, 20, GX + 10, FLOOR - 150, 120 + 190 * glow); gr.addColorStop(0, `rgba(255,120,30,${.75 * glow})`); gr.addColorStop(1, 'rgba(255,120,30,0)'); g.fillStyle = gr; g.fillRect(260, 220, 640, 430); }
    if (shock > 0) { g.strokeStyle = `rgba(194,69,45,${shock})`; g.lineWidth = 8; g.beginPath(); g.ellipse(GX - 150, FLOOR, 60 + (1 - shock) * 220, 14 + (1 - shock) * 22, 0, 0, 7); g.stroke(); }
    CAST.draw(g, 'grub', { x: GX, y: FLOOR, s: 1.7, face: -1, pose: gPose });
    CAST.draw(g, 'pip', { x: px, y: FLOOR, s: 1.2, face: 1, pose: pPose, flash: flashP, ...(pPose === 'down' ? { weapon: null } : {}) });
    if (note) text(g, note[0], Math.max(px, 170), FLOOR - 235 - note[2] * 25, { size: 34, weight: 800, font: 'Montserrat', color: note[1], align: 'center', alpha: clamp(1.6 - note[2]) * clamp(note[2] * 8) });
    // the tell bar sits on a strip below the floor, drawn after the figures so a tumbling sword never crosses its text
    g.fillStyle = C.card; g.fillRect(60, FLOOR + 6, 820, 140);
    if (drawBar) drawBar(); else text(g, 'Next attack\u2026', 90, 714, { size: 22, color: C.muted });
    // Pip's health
    text(g, 'Pip’s health', 620, 196, { size: 17, color: C.muted }); bar(g, 620, 206, 250, 18, (100 - hpLoss) / 100, hpLoss >= 100 ? C.red : C.green);
  }

  function chart(g, t) {
    const x0 = 1040, y0 = 700, w = 470, h = 440;
    panel(g, 940, 140, 620, 650, 'Tell length buys threat', 'Each attack, plotted once it has played');
    const X = s => x0 + s / 2 * w, Y = d => y0 - d / 100 * h;
    // the band where a hit of that size comes with enough warning to answer it
    g.fillStyle = 'rgba(46,139,87,.14)'; g.beginPath(); g.moveTo(X(0), Y(0)); g.lineTo(X(0), Y(18)); g.lineTo(X(1.55), Y(100)); g.lineTo(X(2), Y(100)); g.lineTo(X(2), Y(0)); g.closePath(); g.fill();
    g.strokeStyle = C.green; g.lineWidth = 2; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(X(0), Y(18)); g.lineTo(X(1.55), Y(100)); g.stroke(); g.setLineDash([]);
    g.strokeStyle = C.ink; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y0 - h - 10); g.lineTo(x0, y0); g.lineTo(x0 + w + 10, y0); g.stroke();
    for (let s = 0; s <= 2; s += .5) { text(g, s.toFixed(1), X(s), y0 + 26, { size: 17, color: C.muted, align: 'center' }); }
    for (let d = 0; d <= 100; d += 25) text(g, d + '%', x0 - 12, Y(d) + 6, { size: 17, color: C.muted, align: 'right' });
    text(g, 'Length of the tell (seconds)', x0 + w / 2, y0 + 58, { size: 19, weight: 600, align: 'center' });
    g.save(); g.translate(x0 - 68, y0 - h / 2); g.rotate(-Math.PI / 2); text(g, 'Damage (% of health)', 0, 0, { size: 19, weight: 600, align: 'center' }); g.restore();
    text(g, 'answerable', X(1.5), Y(30), { size: 19, weight: 600, color: C.green, align: 'center' });
    for (const a of ATK) { const k = easeOut(seg(t, a.t0 + a.tell + .3, a.t0 + a.tell + .8)); if (k <= 0) continue;
      g.beginPath(); g.arc(X(a.tell), Y(a.dmg), 13 * k, 0, 7); g.fillStyle = C.gold; g.fill(); g.strokeStyle = C.navy; g.lineWidth = 3; g.stroke();
      text(g, a.n, X(a.tell) + 22, Y(a.dmg) + 7, { size: 21, weight: 700, alpha: k }); }
    const k = easeOut(seg(t, ROGUE.t0 + ROGUE.tell + .3, ROGUE.t0 + ROGUE.tell + .8));
    if (k > 0) { const x = X(ROGUE.tell), y = Y(ROGUE.dmg); g.strokeStyle = C.red; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 12 * k, y - 12 * k); g.lineTo(x + 12 * k, y + 12 * k); g.moveTo(x + 12 * k, y - 12 * k); g.lineTo(x - 12 * k, y + 12 * k); g.stroke(); g.lineCap = 'butt';
      text(g, 'Cheap shot', x + 24, y + 2, { size: 21, weight: 700, color: C.red, alpha: k }); text(g, 'Slam’s damage on Jab’s tell', x + 24, y + 26, { size: 17, color: C.red, alpha: k }); }
  }

  DC.scene({
    dur: DUR, kicker: '8 · Reward with care', title: 'The longer and brighter the tell, the bigger the threat can be',
    draw(g, t) {
      stage(g, t); chart(g, t);
      captions(g, t, [[0, 'Punish fairly and with warning. Watch how much notice each attack gives for the damage it does.'],
        [ATK[0].t0, 'Jab: a 0.2 second tell is too short to react to, so it only chips. Unavoidable is fine when it is small.'],
        [ATK[1].t0, 'Swipe: 0.7 seconds is enough to raise a guard, so it is allowed to cost 40% when you do not.'],
        [ATK[2].t0, 'Slam: a long, bright 1.6 second tell earns a hit that nearly kills. Missing it is on the player.'],
        [ROGUE.t0 - .6, 'Now break the rule: the Slam’s damage on the Jab’s tell.'],
        [ROGUE.t0 + .8, 'No time to answer and nearly all your health gone. Players call this one cheap, and they are right.']]);
    },
  });
})();
