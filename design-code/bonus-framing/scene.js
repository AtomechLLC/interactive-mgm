// Frame mechanics as bonuses: World of Warcraft's rest system, told the way its designers tell it. The same four hour
// session is shown under two labels. XP per kill, kills and totals are identical; only the words and the bar colour differ.
// Pip comes from assets/cast.js (native facing: right) and faces right in both panels, towards the grub he is fighting, which is mirrored to face him.
(function () {
  const { C, clamp, lerp, seg, ease, easeOut, text, para, rrect, panel, bar, icon, captions } = DC;
  const DUR = 20, T0 = 1.5, T1 = 13.5, HOURS = 4, FLIP = 2, KPH = 20;        // kills per hour; the first two hours pay 200 a kill, the rest 100
  const SIDES = [
    { x: 40, title: 'As first tested: a penalty', sub: 'Play for a while and your character gets tired', icon: 'tired',
      states: [['Normal', '100% XP', C.muted], ['Tired', '50% XP', C.red]], say: ['', 'Why am I being punished for playing?'], mood: [.35, -1] },
    { x: 820, title: 'As shipped: a bonus', sub: 'Log out at an inn and your character comes back rested', icon: 'rested',
      states: [['Rested', '200% XP', C.blue], ['Normal', '100% XP', C.muted]], say: ['A bonus for coming back!', 'Back to normal. That was nice.'], mood: [1, .45] }];

  function face(g, x, y, r, m) {   // m: -1 unhappy .. 1 delighted
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = m < 0 ? '#f3c3b6' : '#ffe08a'; g.fill(); g.strokeStyle = C.navy; g.lineWidth = 3; g.stroke();
    g.fillStyle = C.navy; g.beginPath(); g.arc(x - r * .35, y - r * .2, r * .1, 0, 7); g.arc(x + r * .35, y - r * .2, r * .1, 0, 7); g.fill();
    g.beginPath(); g.moveTo(x - r * .45, y + r * .35); g.quadraticCurveTo(x, y + r * .35 + m * r * .5, x + r * .45, y + r * .35); g.stroke();
    if (m < -.3) { g.beginPath(); g.moveTo(x - r * .55, y - r * .5); g.lineTo(x - r * .2, y - r * .38); g.moveTo(x + r * .55, y - r * .5); g.lineTo(x + r * .2, y - r * .38); g.stroke(); }
  }

  function side(g, t, s, img) {
    const w = 740, x = s.x, y = 140, FLOOR = y + 320;
    panel(g, x, y, w, 650, s.title, s.sub);
    const hr = clamp((t - T0) / (T1 - T0)) * HOURS, late = hr >= FLIP ? 1 : 0, st = s.states[late];
    const fl = late ? clamp(1 - (hr - FLIP) / .25) : 0;                       // flash when the state changes
    // the fight: one grub every 1.2 s of clip time
    g.fillStyle = '#d9cfb6'; g.fillRect(x + 20, FLOOR, 430, 6);
    const run = t >= T0 && t < T1, u = run ? (t - T0) % 1.2 : 9, sw = CAST.swing(u * 30 - 3, 8, 12, 26);
    CAST.draw(g, 'pip', { x: x + 150, y: FLOOR, s: 1.05, face: 1, pose: run && sw.ph !== 'idle' && sw.ph !== 'done' ? sw.pose : 'idle' });
    const per = late ? 100 : 200;
    if (run && u < .42) CAST.draw(g, 'grub', { x: x + 270, y: FLOOR, s: .75, face: -1, pose: 'idle', flash: clamp((u - .34) / .08) });
    else if (run) { const k = seg(u, .42, .75); if (k < 1) CAST.draw(g, 'grub', { x: x + 270 + k * 20, y: FLOOR, s: .75, face: -1, pose: 'hit', alpha: 1 - k });
      const f = seg(u, .42, 1.15); text(g, '+' + per + ' XP', x + 280, FLOOR - 110 - f * 40, { size: 26, weight: 700, color: C.goldInk, align: 'center', alpha: 1 - f }); }
    else CAST.draw(g, 'grub', { x: x + 270, y: FLOOR, s: .75, face: -1, pose: 'idle' });
    // the buff or debuff icon and its label: this is the only thing that differs
    const ix = x + 580, iy = y + 190;
    rrect(g, ix - 130, iy - 70, 270, 200, 14, fl > 0 ? `rgba(255,185,81,${.5 * fl})` : '#f6efdd', C.line);
    const showIcon = (s.icon === 'tired') === !!late;
    g.globalAlpha = showIcon ? 1 : .18; icon(g, img[s.icon], ix, iy - 8, 40, showIcon ? st[2] : C.line); g.globalAlpha = 1;
    text(g, st[0], ix + 5, iy + 72, { size: 32, weight: 800, font: 'Montserrat', color: st[2], align: 'center' });
    text(g, st[1], ix + 5, iy + 106, { size: 24, weight: 600, align: 'center' });
    // the player's reaction
    const m = lerp(s.mood[0], s.mood[1], ease(seg(hr, FLIP, FLIP + .25))), say = s.say[late];
    face(g, x + 70, y + 420, 34, t < T0 ? .35 : m);
    if (say && t >= T0 + .3) { g.save(); g.font = '600 22px Jost, sans-serif'; const tw = g.measureText(say).width; g.restore(); rrect(g, x + 122, y + 394, tw + 36, 52, 16, '#fff', C.line); text(g, say, x + 140, y + 428, { size: 22, weight: 600 }); }
    // session timeline: two hours at the first rate, two at the second. Same widths, same numbers, different colours and words.
    const bx = x + 30, by = y + 500, bw = w - 60, half = bw / 2;
        rrect(g, bx, by, bw, 34, 8, '#e6dcc6');
    const p = hr / HOURS * bw; g.save(); g.beginPath(); g.roundRect(bx, by, bw, 34, 8); g.clip();
    g.fillStyle = s.states[0][2] === C.muted ? C.grey : s.states[0][2]; g.fillRect(bx, by, Math.min(p, half), 34);
    if (p > half) { g.fillStyle = s.states[1][2] === C.muted ? C.grey : s.states[1][2]; g.fillRect(bx + half, by, p - half, 34); } g.restore();
    text(g, s.states[0][0] + ' · 200 XP a kill', bx + half / 2, by - 12, { size: 19, weight: 600, color: s.states[0][2], align: 'center' });
    text(g, s.states[1][0] + ' · 100 XP a kill', bx + half * 1.5, by - 12, { size: 19, weight: 600, color: s.states[1][2], align: 'center' });
    for (let h = 0; h <= HOURS; h++) text(g, h + ' h', bx + h / HOURS * bw, by + 58, { size: 16, color: C.muted, align: h === 0 ? 'left' : h === HOURS ? 'right' : 'center' });
    // totals: identical on both sides
    const kills = Math.floor(hr * KPH), xp = Math.min(hr, FLIP) * KPH * 200 + Math.max(0, hr - FLIP) * KPH * 100;
    text(g, 'Kills', bx, by + 96, { size: 17, color: C.muted }); text(g, String(kills), bx, by + 132, { size: 32, weight: 700 });
    text(g, 'XP per kill', bx + 130, by + 96, { size: 17, color: C.muted }); text(g, String(per), bx + 130, by + 132, { size: 32, weight: 700 });
    text(g, 'XP earned this session', bx + 310, by + 96, { size: 17, color: C.muted }); text(g, Math.round(xp / 10) * 10 === 0 ? '0' : (Math.round(xp / 20) * 20).toLocaleString('en-US'), bx + 310, by + 132, { size: 32, weight: 800, font: 'Montserrat' });
  }

  DC.scene({
    dur: DUR, kicker: '9 · Balance for purpose, not equality', title: 'Frame mechanics as bonuses, not penalties',
    imgs: { rested: '../img/spell_nature_sleep.jpg', tired: '../img/spell_shadow_curseofmannoroth.jpg' },
    draw(g, t, img) {
      SIDES.forEach(s => side(g, t, s, img));
      const eq = ease(seg(t, T1 + .3, T1 + 1));
      if (eq > 0) SIDES.forEach(s => { g.globalAlpha = eq; rrect(g, s.x + 326, 708, 380, 80, 12, null, C.gold, 5); text(g, 'identical', s.x + 690, 772, { size: 20, weight: 700, color: C.goldInk, align: 'right' }); g.globalAlpha = 1; });
      captions(g, t, [[0, 'World of Warcraft’s rest system, as its designers tell it. One four hour session, shown under two labels.'],
        [T0 + .2, 'Left: you earn full XP, then half once you tire. Right: you earn double XP while rested, then the normal rate.'],
        [T0 + (T1 - T0) / 2, 'Two hours in, the rate halves on both sides. One side reads as a punishment and the other as a bonus running out.'],
        [T1 + .3, 'Both sessions: 80 kills, 12,000 XP. Players hate a loss about twice as much as they like an equal gain.']]);
    },
  });
})();
