/* The Life Tap trade (MGM C4 M2, deck slides 230 and 231), drawn in the slides' own layout: before | the trade | after.
   Slide 230, solo: the warlock taps 40 HP into 40 mana (100/100 HP, 40/100 mana becomes 60/100 and 80/100) and no one
   gives the HP back, so a boss hit the warlock would have survived now defeats it. Slide 231, raid: the same tap, then
   the priest's Flash Heal puts the 40 HP back, so the warlock ends at 100/100 HP and 80/100 mana.
   Both scenes are pure functions of time (scene(t, o)), so the GIF recorder can seek them. Numbers: N. */
(function () {
  const { $ } = FPF.kit;
  const W = 1600, H = 900;
  const N = { hp: 100, mana: 40, tap: 40, heal: 40, hit: 70 };
  // the slides' colours
  const K = {
    ink: '#262c6a', navy: '#152044', muted: '#5d618c', hpBar: '#6aa84f', manaBar: '#6fa8dc', barBg: '#434343',
    hpChip: '#990000', manaChip: '#6fa8dc', healChip: '#6aa84f', arrow: '#e06666', gold: '#ffb951', goldInk: '#9a5a06', down: '#a8201c',
  };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const io = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  const back = k => { const c = 1.9; return k <= 0 ? 0 : 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
  const bump = (t, a, d) => { const u = (t - a) / d; return u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0; };
  let g;

  // ---------- pieces ----------
  function classIcon(name, x, y, r, a = 1, s = 1, grey = 0) {
    const im = ICON.img(name); if (a <= 0 || s <= 0) return;
    g.save(); g.globalAlpha *= a; g.translate(x, y); g.scale(s, s);
    g.fillStyle = 'rgba(40,30,20,.18)'; g.beginPath(); g.ellipse(4, r + 6, r * .8, r * .18, 0, 0, 7); g.fill();
    g.beginPath(); g.arc(0, 0, r, 0, 7); g.fillStyle = '#1b1430'; g.fill();
    if (im) { g.save(); g.clip(); if (grey) g.filter = `grayscale(${grey}) brightness(${1 - grey * .3})`; g.drawImage(im, -r, -r, r * 2, r * 2); g.restore(); }
    g.lineWidth = 3; g.strokeStyle = '#2a2140'; g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke();
    g.restore();
  }
  function spellIcon(name, x, y, s, a = 1, k = 1, glow = 0) {
    if (a <= 0 || k <= 0) return;
    g.save(); g.translate(x, y); g.scale(k, k);
    if (glow > 0) { g.globalAlpha = a * glow; g.fillStyle = name === 'heal' ? 'rgba(255,214,120,.55)' : 'rgba(170,80,230,.5)'; g.beginPath(); g.arc(0, 0, s * .95, 0, 7); g.fill(); }
    g.globalAlpha = a; ICON.draw(g, name, 0, 0, s, 1, '#111'); g.restore();
  }
  // the slides' boss: a grey face with a red visor and a red jagged grin. cry > 0 adds the slide 231 tears.
  function boss(x, y, r, a = 1, o = {}) {
    if (a <= 0) return;
    const { lunge = 0, cry = 0, t = 0, shake = 0 } = o;
    g.save(); g.globalAlpha *= a; g.translate(x - lunge + Math.sin(t * 60) * shake, y);
    g.fillStyle = 'rgba(40,30,20,.18)'; g.beginPath(); g.ellipse(4, r + 6, r * .8, r * .18, 0, 0, 7); g.fill();
    g.fillStyle = '#8a8a8a'; g.strokeStyle = '#3b3b3b'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.stroke();
    // visor: a red bar that dips to a point in the middle, wider than the face
    g.fillStyle = '#e8261c'; g.strokeStyle = '#7a0f0a'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(-r * 1.08, -r * .52); g.lineTo(r * 1.08, -r * .52); g.lineTo(r * .78, -r * .16); g.lineTo(r * .2, -r * .16);
    g.lineTo(0, r * .02); g.lineTo(-r * .2, -r * .16); g.lineTo(-r * .78, -r * .16); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#2b0503';
    g.beginPath(); g.moveTo(-r * .62, -r * .4); g.lineTo(-r * .2, -r * .3); g.lineTo(-r * .3, -r * .22); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(r * .62, -r * .4); g.lineTo(r * .2, -r * .3); g.lineTo(r * .3, -r * .22); g.closePath(); g.fill();
    // grin
    g.fillStyle = '#e8261c'; g.strokeStyle = '#7a0f0a';
    g.beginPath(); g.moveTo(-r * .36, r * .28); g.lineTo(r * .36, r * .28); g.lineTo(r * .3, r * .52);
    for (let i = 0; i < 4; i++) { const xx = r * .3 - i * r * .2; g.lineTo(xx - r * .1, r * .4); g.lineTo(xx - r * .2, r * .52); }
    g.closePath(); g.fill(); g.stroke();
    if (cry > 0) for (const sd of [-1, 1]) {
      const k = (t * 1.4 + (sd > 0 ? .5 : 0)) % 1, ty = -r * .05 + k * r * .9;
      g.globalAlpha = a * cry * (1 - k * .6); g.fillStyle = '#6fa8dc'; g.strokeStyle = '#2f6aa8'; g.lineWidth = 2;
      const tx = sd * r * .82, s = r * .2;
      g.beginPath(); g.moveTo(tx, ty - s * 1.4); g.quadraticCurveTo(tx + s, ty, tx, ty + s); g.quadraticCurveTo(tx - s, ty, tx, ty - s * 1.4); g.fill(); g.stroke();
    }
    g.restore();
  }
  function bar(x, y, w, h, v, max, col, a = 1, size = 18) {
    if (a <= 0) return;
    g.save(); g.globalAlpha *= a;
    g.fillStyle = K.barBg; g.fillRect(x, y, w, h);
    g.fillStyle = col; g.fillRect(x, y, w * clamp(v / max), h);
    g.strokeStyle = '#666'; g.lineWidth = 1.5; g.strokeRect(x, y, w, h);
    g.fillStyle = '#fff'; g.font = `700 ${size}px Arial, Jost, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(`${Math.round(v)} / ${max}`, x + w / 2, y + h / 2 + 1);
    g.restore();
  }
  function chip(x, y, w, h, col, text, a = 1, k = 1, size = 30) {
    if (a <= 0 || k <= 0) return;
    g.save(); g.globalAlpha *= a; g.translate(x + w / 2, y + h / 2); g.scale(k, k);
    g.fillStyle = col; g.fillRect(-w / 2, -h / 2, w, h); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; g.strokeRect(-w / 2, -h / 2, w, h);
    g.fillStyle = '#fff'; g.font = `700 ${size}px Arial, Jost, sans-serif`; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText(text, -w / 2 + 14, 2);
    g.restore();
  }
  function arrow(x0, y0, x1, y1, col, p, w = 4) {
    if (p <= 0) return;
    const x = lerp(x0, x1, p), y = lerp(y0, y1, p), an = Math.atan2(y1 - y0, x1 - x0), hd = 18;
    g.save(); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = w; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x - Math.cos(an) * hd * .6, y - Math.sin(an) * hd * .6); g.stroke();
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.cos(an - .42) * hd, y - Math.sin(an - .42) * hd); g.lineTo(x - Math.cos(an + .42) * hd, y - Math.sin(an + .42) * hd); g.closePath(); g.fill();
    g.restore();
  }
  function text(s, x, y, size, col = K.ink, a = 1, font = 'Montserrat', weight = 800, align = 'center', italic = false) {
    if (a <= 0) return;
    g.save(); g.globalAlpha *= a; g.fillStyle = col; g.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${font}, Jost, sans-serif`;
    g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); g.restore();
  }
  function bubble(x, y, s, a = 1, k = 1, tail = -1) {
    if (a <= 0 || k <= 0) return;
    g.save(); g.globalAlpha *= a; g.translate(x, y); g.scale(k, k);
    g.font = '600 30px Arial, Jost, sans-serif'; const w = g.measureText(s).width + 52, h = 76;
    g.fillStyle = '#fff'; g.strokeStyle = '#444'; g.lineWidth = 2.5;
    g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 12);
    g.fill(); g.stroke();
    // tail toward the speaker (tail -1: down-left, 1: down-right)
    g.beginPath(); g.moveTo(tail * 14 - 12, h / 2 - 2); g.lineTo(tail * 34, h / 2 + 26); g.lineTo(tail * 14 + 14, h / 2 - 2); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(tail * 14 - 12, h / 2); g.lineTo(tail * 34, h / 2 + 26); g.lineTo(tail * 14 + 14, h / 2); g.stroke();
    g.fillStyle = '#111'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, 0, 2);
    g.restore();
  }
  function divider(x, y0, y1, p = 1) { if (p <= 0) return; g.fillStyle = K.navy; g.fillRect(x - 3, y0, 6, (y1 - y0) * p); }
  function stamp(s, x, y, col, a) {
    if (a <= 0) return;
    g.save(); g.globalAlpha = clamp(a); g.translate(x, y); g.rotate(-.07); g.scale(lerp(1.5, 1, back(clamp(a))), lerp(1.5, 1, back(clamp(a))));
    g.font = '800 34px Montserrat, Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = g.measureText(s).width + 36;
    g.fillStyle = 'rgba(255,252,244,.95)'; g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); g.roundRect(-w / 2, -29, w, 58, 10); g.fill(); g.stroke();
    g.fillStyle = col; g.fillText(s, 0, 2); g.restore();
  }
  function tag(s, x, y, col, a, size = 22) {
    if (a <= 0) return;
    g.save(); g.globalAlpha *= a; g.font = `700 ${size}px Jost, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = g.measureText(s).width + 28;
    g.fillStyle = 'rgba(255,252,244,.92)'; g.strokeStyle = col; g.lineWidth = 2.5; g.beginPath(); g.roundRect(x - w / 2, y - size * .85, w, size * 1.7, size * .85); g.fill(); g.stroke();
    g.fillStyle = col; g.fillText(s, x, y + 1); g.restore();
  }
  function caption(s, a) {
    if (a <= 0) return;
    g.save(); g.globalAlpha *= a; g.font = '600 26px Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = g.measureText(s).width + 44;
    g.fillStyle = K.navy; g.beginPath(); g.roundRect(800 - w / 2, 846, w, 44, 22); g.fill();
    g.fillStyle = '#fff'; g.fillText(s, 800, 869); g.restore();
  }
  function spark(x, y, t0, t, col = K.gold, size = 46) {
    const u = (t - t0) / .4; if (u < 0 || u > 1) return;
    g.save(); g.globalAlpha = 1 - u; g.strokeStyle = col; g.lineWidth = 5; g.lineCap = 'round';
    const s = size * (.5 + (1 - Math.pow(1 - u, 3)));
    for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4 + .3; g.beginPath(); g.moveTo(x + Math.cos(an) * s * .45, y + Math.sin(an) * s * .45); g.lineTo(x + Math.cos(an) * s, y + Math.sin(an) * s); g.stroke(); }
    g.restore();
  }
  function pop(s, x, y, col, a) {
    if (a <= 0) return;
    g.save(); g.globalAlpha = clamp(a); g.font = '800 34px Montserrat, Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 7; g.strokeStyle = '#fffaf0'; g.strokeText(s, x, y); g.fillStyle = col; g.fillText(s, x, y); g.restore();
  }
  // the slides' legend, top right. dim[k] fades an entry; absent adds a tag next to the priest.
  function legend(a, o = {}) {
    if (a <= 0) return;
    const rows = [['priest', 'Priest', ' (Healer)'], ['warlock', 'Warlock', ''], ['boss', 'Boss', '']];
    rows.forEach(([k, name, sub], i) => {
      const y = 82 + i * 82, x = 1242, al = a * (o.dim?.[k] != null ? lerp(1, .32, o.dim[k]) : 1);
      if (k === 'boss') boss(x, y, 32, al); else classIcon(k, x, y, 32, al, 1, k === 'priest' ? (o.dim?.priest || 0) : 0);
      g.save(); g.globalAlpha = al; g.font = '800 30px Montserrat, Jost, sans-serif'; g.fillStyle = K.ink; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText(name, x + 52, y); const nw = g.measureText(name).width;
      if (sub) { g.font = 'italic 600 28px Montserrat, Jost, sans-serif'; g.fillText(sub, x + 52 + nw, y); }
      g.restore();
    });
    if (o.absent > 0) { tag('Not in the Party', 1100, 82, K.down, o.absent, 18); g.save(); g.globalAlpha = o.absent * a; g.strokeStyle = K.down; g.lineWidth = 3; g.beginPath(); g.moveTo(1288, 82); g.lineTo(1288 + 230 * o.absent, 82); g.stroke(); g.restore(); }
  }

  // ---------- slide 230: solo ----------
  // left column (before) and right column (after) share a layout, offset by RX
  const SOLO = { DUR: 14, RX: 968 };
  function solo(t, o = {}) {
    const hit = o.hit ?? N.hit, fade = 1 - seg(t, SOLO.DUR - .7, SOLO.DUR);
    g.save(); g.globalAlpha = fade;
    legend(1, { dim: { priest: seg(t, 4.6, 5.3) }, absent: seg(t, 4.9, 5.4) });
    text('Single Player', 800, 330, 48, K.ink, seg(t, 0, .6), 'Montserrat', 800, 'center', true);
    divider(600, 390, 830, io(seg(t, .2, .9))); divider(1032, 390, 830, io(seg(t, .2, .9)));
    // the trade
    const tapIn = seg(t, 1.1, 1.6), tapGlow = bump(t, 1.4, 1.4);
    spellIcon('lifetap', 735, 590, 104, tapIn, back(tapIn), tapGlow);
    chip(800, 547, 185, 50, K.hpChip, `-${N.tap} HP`, seg(t, 1.6, 1.9), back(seg(t, 1.6, 1.95)));
    chip(800, 605, 185, 40, K.manaChip, `+${N.tap} MANA`, seg(t, 1.85, 2.15), back(seg(t, 1.85, 2.2)), 24);
    // flying copies of the chips into the after column
    const fh = io(seg(t, 2.6, 3.4)), fm = io(seg(t, 2.9, 3.7));
    if (fh > 0 && fh < 1) chip(lerp(800, 1084, fh), lerp(547, 650, fh), 185, 50, K.hpChip, `-${N.tap} HP`, .85, lerp(1, .6, fh));
    if (fm > 0 && fm < 1) chip(lerp(800, 1084, fm), lerp(605, 690, fm), 185, 40, K.manaChip, `+${N.tap} MANA`, .85, lerp(1, .6, fm), 24);
    // the optional boss hit: what the same hit does before and after the tap
    const hitShow = seg(t, 5.8, 6.2), hitT = 6.7, hk = seg(t, hitT, hitT + .6);
    const hp0 = N.hp, hp1 = N.hp - N.tap * seg(t, 3.3, 3.9), mana1 = N.mana + N.tap * seg(t, 3.6, 4.2);
    const hpL = Math.max(0, hp0 - hit * hk), hpR = Math.max(0, hp1 - hit * hk);
    chip(800, 720, 185, 46, K.navy, `Boss Hit -${hit}`, hitShow, back(hitShow), 24);
    // columns
    [[0, hpL, N.mana, 0], [SOLO.RX, hpR, mana1, 1]].forEach(([dx, hp, mana, after]) => {
      const a = after ? seg(t, .5, 1.1) : seg(t, 0, .6), x = 211 + dx, y = 560;
      const dead = hp <= 0 && hk > 0, gone = dead ? seg(t, hitT + .5, hitT + 1) : 0;
      const tapPulse = after ? bump(t, 3.2, 1) : 0;
      if (tapPulse > 0) { g.save(); g.globalAlpha = tapPulse * .6 * a; g.fillStyle = 'rgba(150,70,220,.45)'; g.beginPath(); g.arc(x, y, 52 + 26 * tapPulse, 0, 7); g.fill(); g.restore(); }
      classIcon('warlock', x, y, 52, a * lerp(1, .55, gone), 1, gone);
      text('VS', x + 135, y + 2, 58, K.ink, a);
      boss(x + 271, y, 50, a, { lunge: 70 * bump(t, hitT - .15, .4), t });
      if (hk > 0) { spark(x + 20, y - 10, hitT, t); pop(`-${hit}`, x - 100, y - 40 - 30 * seg(t, hitT, hitT + 1.2), K.down, 1.8 - seg(t, hitT, hitT + 1.6) * 1.8); }
      bar(x - 96, 650, 195, 30, hp, N.hp, K.hpBar, a);
      bar(x - 96, 688, 195, 20, mana, 100, K.manaBar, a, 15);
      const res = seg(t, hitT + .7, hitT + 1.2);
      if (after) { if (dead) stamp('Defeated', x + 135, 470, K.down, res); else tag(`${Math.round(hp)} HP Left`, x + 135, 470, K.ink, res); }
      else tag(hp > 0 ? `Still Standing: ${Math.round(hp)} HP` : 'Defeated', x + 135, 470, hp > 0 ? '#1a6b3c' : K.down, res);
      tag(after ? 'After the Tap' : 'Without the Tap', x + 135, 770, K.muted, seg(t, hitT + .7, hitT + 1.2) * a, 18);
    });
    const endsDown = N.hp - N.tap - hit <= 0, alsoDown = N.hp - hit <= 0;
    caption(alsoDown ? `A ${hit} HP hit defeats the warlock either way: no healer, no margin.`
      : endsDown ? 'Alone, no one heals the 40 HP back: the same hit now defeats you.'
        : `Alone, no one gives the 40 HP back: ${N.hp - N.tap - hit} HP left after the same hit.`, seg(t, 8.4, 9));
    g.restore();
  }

  // ---------- slide 231: raid ----------
  const RAID = { DUR: 14 };
  function raid(t, o = {}) {
    const priest = o.priest ?? true, fade = 1 - seg(t, RAID.DUR - .7, RAID.DUR);
    g.save(); g.globalAlpha = fade;
    legend(1, { dim: priest ? {} : { priest: 1 }, absent: priest ? 0 : 1 });
    divider(543, 388, 813, io(seg(t, .2, .9))); divider(1133, 388, 813, io(seg(t, .2, .9)));
    // before: warlock and priest stacked, VS the boss
    const aL = seg(t, 0, .6), aR = seg(t, .5, 1.1);
    classIcon('warlock', 158, 355, 50, aL);
    bar(63, 432, 192, 30, N.hp, 100, K.hpBar, aL); bar(63, 470, 192, 20, N.mana, 100, K.manaBar, aL, 15);
    classIcon('priest', 163, 575, 50, aL * (priest ? 1 : .35), 1, priest ? 0 : 1);
    bar(63, 652, 192, 30, 100, 100, K.hpBar, aL * (priest ? 1 : .35)); bar(63, 690, 192, 20, 100, 100, K.manaBar, aL * (priest ? 1 : .35), 15);
    text('VS', 318, 520, 58, K.ink, aL);
    boss(428, 517, 47, aL);
    // the trade: Life Tap
    const a1 = io(seg(t, 1.3, 2)), tapIn = seg(t, 1.9, 2.3);
    arrow(205, 375, 600, 455, K.arrow, a1);
    spellIcon('lifetap', 663, 462, 104, tapIn, back(tapIn), bump(t, 2, 1.3));
    chip(737, 413, 180, 50, K.hpChip, `-${N.tap} HP`, seg(t, 2.2, 2.5), back(seg(t, 2.2, 2.55)));
    chip(737, 474, 180, 40, K.manaChip, `+${N.tap} MANA`, seg(t, 2.4, 2.7), back(seg(t, 2.4, 2.75)), 24);
    // after column numbers
    const hpTo = 1210, a2 = io(seg(t, 2.9, 3.7)), a3 = io(seg(t, 3.1, 3.9));
    arrow(917, 438, hpTo, 588, K.hpChip, a2);
    arrow(917, 494, hpTo, 630, K.manaChip, a3);
    let hp = N.hp - N.tap * seg(t, 3.7, 4.3), mana = N.mana + N.tap * seg(t, 3.9, 4.5);
    // the heal
    if (priest) {
      const a4 = io(seg(t, 4.7, 5.4)), healIn = seg(t, 5.3, 5.7);
      arrow(210, 590, 600, 638, K.arrow, a4);
      spellIcon('heal', 663, 642, 104, healIn, back(healIn), bump(t, 5.4, 1.4));
      chip(737, 617, 160, 50, K.healChip, `+${N.heal} HP`, seg(t, 5.6, 5.9), back(seg(t, 5.6, 5.95)));
      const a5 = io(seg(t, 6.1, 6.9));
      arrow(897, 642, hpTo, 600, K.healChip, a5);
      hp += N.heal * seg(t, 6.9, 7.5);
    }
    // after: warlock VS a boss that cries once it is free
    const free = priest ? seg(t, 8.2, 8.8) : 0;
    const wx = 1275, wy = 515;
    const hf = priest ? bump(t, 6.9, .9) : 0;
    if (hf > 0) { g.save(); g.globalAlpha = hf * .55; g.fillStyle = 'rgba(255,214,120,.7)'; g.beginPath(); g.arc(wx, wy, 52 + 24 * hf, 0, 7); g.fill(); g.restore(); }
    const tp = bump(t, 3.7, 1);
    if (tp > 0) { g.save(); g.globalAlpha = tp * .5; g.fillStyle = 'rgba(150,70,220,.45)'; g.beginPath(); g.arc(wx, wy, 52 + 24 * tp, 0, 7); g.fill(); g.restore(); }
    classIcon('warlock', wx, wy, 50, aR);
    text('VS', 1397, 520, 58, K.ink, aR);
    boss(1517, 517, 47, aR, { cry: free, t });
    bar(1180, 580, 190, 30, hp, 100, K.hpBar, aR); bar(1180, 618, 190, 20, mana, 100, K.manaBar, aR, 15);
    if (priest) {
      const b1 = seg(t, 7.8, 8.2), p1 = seg(t, 8.8, 9.2), b2 = seg(t, 9.3, 9.7);
      bubble(1385, 400, 'THX, BRO~', b1, back(b1), -1);
      classIcon('priest', 1358, 760, 46, p1, back(p1));
      bubble(1455, 680, 'LOL!', b2, back(b2), -1);
      caption(`Net cost to the warlock: 0 HP. The priest pays for it with a heal.`, seg(t, 10, 10.6));
    } else {
      caption('With no priest, it is the solo trade again: 60 HP left, and the boss still hitting.', seg(t, 8.2, 8.8));
    }
    g.restore();
  }

  // ---------- wiring ----------
  const api = {};
  function wire(name, scene, D, opts) {
    FPF.kit.canvasDemo(name, (s, cv, ctx) => {
      const st = { t: 0, held: false, play: true };
      const o = {};
      const btn = $(s, '.lt-play');
      btn.onclick = () => { st.t = 0; st.play = true; btn.classList.add('on'); };
      opts?.(s, o, () => { st.t = 0; });
      const render = () => { g = ctx; ctx.clearRect(0, 0, W, H); scene(st.t, o); };
      api[name] = { seek(t) { st.held = true; Object.keys(o).forEach(k => delete o[k]); st.t = t; render(); }, dur: () => D.DUR };
      return dt => { if (!st.held) { st.t += Math.max(0, dt); if (st.t > D.DUR) st.t = 0; } render(); };
    });
  }
  wire('ltsolo', solo, SOLO, (s, o, restart) => {
    const r = $(s, '.lt-hit'), v = $(s, '.lt-hitv');
    const show = () => { v.textContent = `-${r.value} HP`; o.hit = +r.value; };
    r.oninput = () => { show(); restart(); }; show();
  });
  wire('ltraid', raid, RAID, (s, o, restart) => {
    const c = $(s, '.lt-priest');
    c.onchange = () => { o.priest = c.checked; restart(); };
  });
  // GIF hooks: which = 'solo' | 'raid'
  window.__seek = (t, which) => api[which === 'raid' ? 'ltraid' : 'ltsolo'].seek(t);
  window.__dur = which => api[which === 'raid' ? 'ltraid' : 'ltsolo'].dur();
})();
