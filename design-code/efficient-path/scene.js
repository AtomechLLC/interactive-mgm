// Players will optimize the fun out of a game: two ways to earn XP, ten players, one retune.
// All figures come from assets/cast.js, which draws them facing right; face: -1 mirrors them.
(function () {
  const { C, clamp, lerp, seg, ease, easeOut, text, rrect, panel, bar, icon, captions } = DC;
  const DUR = 18, RETUNE = 9;
  // XP per fight and seconds per fight, before and after the retune (illustrative numbers)
  const KEEP = { x: 40, name: 'The dragon’s keep', sub: 'A long fight that asks for blocks, dodges and timing', xp: [120, 400], sec: [60, 60] };
  const CELL = { x: 820, name: 'The cellar grubs', sub: 'One swing each. They respawn every two seconds', xp: [10, 1], sec: [2, 2] };
  const PW = 740, PY = 140, PH = 470, FLOOR = PY + 330;
  const perMin = (p, i) => p.xp[i] * 60 / p.sec[i];

  function stats(g, p, t) {
    const k = ease(seg(t, RETUNE, RETUNE + 1)), xp = Math.round(lerp(p.xp[0], p.xp[1], k)), pm = lerp(perMin(p, 0), perMin(p, 1), k);
    const y = PY + 372, x = p.x + 22;
    text(g, 'XP per kill', x, y, { size: 18, color: C.muted }); text(g, String(xp), x, y + 34, { size: 32, weight: 700 });
    text(g, 'Time per kill', x + 150, y, { size: 18, color: C.muted }); text(g, p.sec[0] + ' s', x + 150, y + 34, { size: 32, weight: 700 });
    text(g, 'XP per minute', x + 310, y, { size: 18, color: C.muted });
    bar(g, x + 310, y + 12, 290, 26, pm / 420, pm >= 200 ? C.gold : C.grey);
    text(g, String(Math.round(pm)), x + 612, y + 34, { size: 32, weight: 700 });
    const changed = p.xp[0] !== p.xp[1] && t >= RETUNE;
    if (changed) { const a = seg(t, RETUNE, RETUNE + .3); rrect(g, x, y + 50, 250, 30, 15, C.navy); g.globalAlpha = a; text(g, p === KEEP ? 'Retuned: reward raised' : 'Retuned: repeat kills pay less', x + 125, y + 71, { size: 16, weight: 600, color: C.gold, align: 'center' }); g.globalAlpha = 1; }
  }

  function keep(g, t, img) {
    panel(g, KEEP.x, PY, PW, PH, KEEP.name, KEEP.sub);
    icon(g, img.dragon, KEEP.x + PW - 52, PY + 48, 30, C.gold);
    g.fillStyle = '#d9cfb6'; g.fillRect(KEEP.x + 20, FLOOR, PW - 40, 6);
    // a 3 second exchange: Pip (left, faces right) strikes, then the dragon-keep brute (right, faces left) strikes and Pip blocks
    const u = t % 3, f = u * 30;
    const ps = CAST.swing(f - 6, 9, 13, 30), gs = CAST.swing(f - 48, 14, 19, 38);
    const pipPose = gs.ph === 'active' || (gs.ph === 'startup' && gs.k > .6) ? 'block' : ps.ph === 'idle' || ps.ph === 'done' ? 'guard' : ps.pose;
    const hitG = clamp(1 - Math.abs(u - .62) / .12), hitP = clamp(1 - Math.abs(u - 2.2) / .12);
    CAST.draw(g, 'grub', { x: KEEP.x + 520 + hitG * 8, y: FLOOR, s: 1.45, face: -1, pose: gs.ph === 'idle' || gs.ph === 'done' ? 'guard' : gs.pose, flash: hitG });
    CAST.draw(g, 'pip', { x: KEEP.x + 330 - hitP * 10, y: FLOOR, s: 1.1, face: 1, pose: pipPose });
    if (hitP > 0) { g.strokeStyle = C.gold; g.lineWidth = 4; g.globalAlpha = hitP; g.beginPath(); g.arc(KEEP.x + 372, FLOOR - 95, 26 + (1 - hitP) * 16, 0, 7); g.stroke(); g.globalAlpha = 1; text(g, 'Block', KEEP.x + 330, FLOOR - 190, { size: 20, weight: 700, color: C.goldInk, align: 'center', alpha: hitP }); }
    // boss health: one kill a minute, shown as a bar that drains over the loop of the whole clip
    const hp = 1 - (t % 9) / 9;
    bar(g, KEEP.x + 430, PY + 96, 220, 14, hp, C.red); text(g, 'Keep brute', KEEP.x + 430, PY + 90, { size: 16, color: C.muted });
    stats(g, KEEP, t);
  }

  function cellar(g, t) {
    panel(g, CELL.x, PY, PW, PH, CELL.name, CELL.sub);
    g.fillStyle = '#d9cfb6'; g.fillRect(CELL.x + 20, FLOOR, PW - 40, 6);
    // the same swing every two seconds; the grub pops and another one walks in from the right, facing Pip
    const u = t % 2, f = u * 30, s = CAST.swing(f - 4, 8, 12, 26);
    CAST.draw(g, 'pip', { x: CELL.x + 300, y: FLOOR, s: 1.1, face: 1, pose: s.ph === 'idle' || s.ph === 'done' ? 'idle' : s.pose });
    const dead = u > .46, gx = CELL.x + 410;
    if (!dead) CAST.draw(g, 'grub', { x: gx, y: FLOOR, s: .55, face: -1, pose: 'idle', flash: clamp((u - .38) / .08) });
    else {
      const k = seg(u, .46, .8); if (k < 1) CAST.draw(g, 'grub', { x: gx + k * 20, y: FLOOR, s: .55, face: -1, pose: 'hit', alpha: 1 - k, flash: 1 - k });
      const w = seg(u, 1.1, 1.9); if (w > 0) CAST.draw(g, 'grub', { x: lerp(CELL.x + 640, gx, ease(w)), y: FLOOR, s: .55, face: -1, pose: w < 1 ? CAST.cycle('walk', w * 3) : 'idle', alpha: clamp(w * 4) });
      const xp = t < RETUNE + .5 ? CELL.xp[0] : CELL.xp[1];
      const fl = seg(u, .46, 1.3); if (fl < 1) text(g, '+' + xp + ' XP', gx, FLOOR - 90 - fl * 50, { size: 24, weight: 700, color: C.goldInk, align: 'center', alpha: 1 - fl });
    }
    text(g, 'Kills this session: ' + (140 + Math.floor(t / 2)), CELL.x + 500, PY + 110, { size: 18, color: C.muted });
    stats(g, CELL, t);
  }

  // ten players stand under the activity they chose; they walk to whichever pays more per minute
  function crowd(g, t) {
    const y = 786, n = 10; let atKeep = 0;
    for (let i = 0; i < n; i++) {
      const home = 110 + i * 62, away = 890 + i * 62;                 // slot under the keep, slot under the cellar
      const startsKeep = i < 5;
      const go1 = 1.5 + (i % 5) * .6, back = RETUNE + 1.2 + i * .45;   // keep players leave first; after the retune nine walk back
      let x, face = 1, moving = false;
      const a = startsKeep ? seg(t, go1, go1 + 1.6) : 1;               // 0 at keep, 1 at cellar
      const b = i === 9 ? 0 : seg(t, back, back + 1.6);                // one stays in the cellar out of habit
      const e = startsKeep && t >= DUR - 1 ? 0 : 1;                    // loop: the original keep players fade back
      if (b > 0) { x = lerp(away, home, ease(b)); face = -1; moving = b < 1; }
      else { x = lerp(home, away, ease(a)); face = 1; moving = a > 0 && a < 1; }
      if (!e) x = home;
      if (x < 800) atKeep++;
      const al = t >= DUR - 1 ? Math.abs(1 - 2 * seg(t, DUR - 1, DUR)) : 1;
      CAST.draw(g, 'sam', { x, y, s: .5, face, pose: moving ? CAST.cycle('walk', t * 2.2 + i * .3) : 'idle', alpha: al, tint: i === 0 ? '#2ea3dc' : undefined });
    }
    text(g, 'Players here: ' + atKeep, 60, 650, { size: 24, weight: 700 });
    text(g, 'Players here: ' + (n - atKeep), 840, 650, { size: 24, weight: 700 });
    text(g, 'Ten players, free to choose', 1540, 650, { size: 20, color: C.muted, align: 'right' });
    g.strokeStyle = C.line; g.lineWidth = 2; g.beginPath(); g.moveTo(60, y + 3); g.lineTo(1540, y + 3); g.stroke();
  }

  DC.scene({
    dur: DUR, kicker: '3 · Align incentives with the fun', title: 'Players will optimize the fun out of a game',
    imgs: { dragon: '../img/inv_misc_head_dragon_01.jpg' },
    draw(g, t, img) {
      keep(g, t, img); cellar(g, t); crowd(g, t);
      captions(g, t, [[0, 'The cellar pays 300 XP a minute and the keep pays 120. Players follow the payout, not the fight.'],
        [5.5, 'All ten now swing at grubs. Nobody chose tedium; the reward table chose it for them.'],
        [RETUNE, 'Retune the reward, not the players: the keep now pays 400 a minute and repeat grub kills pay 30.'],
        [13.5, 'The efficient path and the fun path are the same path again.']]);
    },
  });
})();
