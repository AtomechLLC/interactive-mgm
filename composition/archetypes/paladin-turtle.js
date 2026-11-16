/* Paladin or turtle? (MGM C4 M7, deck slides 170-173). Defender + Zone Healer + Brute, built twice. The paladin's heal is an
   aura that moves with it, so its allies want to stay close. The turtle's heal is a mist it leaves behind, so the heal zone is
   wherever it has been, and its shell blocks from every side. Same three archetypes, different fights (notes on 173).
   Three more creatures, our own, move the heal again: the Totem Shaman's heal sits on a totem you can break, the Spring
   Golem's on a fixed spring you lure it away from, the Ancient Treant's along roots you can cut. */
(function () {
  const { $$ } = FPF.kit;
  const { icon, text, chip, TONE, panel, scene, clamp, lerp, ease } = CK;
  const T = TD, C = TD.C;
  const DUR = 24, PH = 6;   // walk-through: the pair, then each new creature for PH seconds
  const PAL = t => [Math.cos(t * .5) * 70, Math.sin(t * 1) * 40];
  const TUR = t => [lerp(-150, 150, (Math.sin(t * .52 - 1.2) + 1) / 2), Math.sin(t * 1.3) * 60];
  const MIST = 4.2;   // seconds a mist patch lasts

  function frame(g, x, y, w, h, title, iconName, line) {
    panel(g, x, y, w, h);
    icon(g, iconName, x + 34, y + 30, 40);
    text(g, title, x + 64, y + 30, { align: 'left', size: 22, w: 800, display: true });
    text(g, line, x + w / 2, y + h - 22, { size: 15, w: 600, col: C.navy });
    g.save(); g.beginPath(); g.roundRect(x + 14, y + 58, w - 28, h - 112, 10); g.clip(); T.floor(x + 14, y + 58, w - 28, h - 112); g.restore();
  }
  const slam = (t, period = 4, at = 3) => { const k = (t % period) - at; return k >= -.9 && k < .35 ? k : null; };

  function paladin(g, t) {
    const [x, y] = PAL(t);
    T.zone(x, y, 88, 1, '47,174,99');
    const pulse = (t % 1.2) / 1.2; g.strokeStyle = `rgba(47,174,99,${.8 * (1 - pulse)})`; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 88 * pulse, 0, Math.PI * 2); g.stroke();
    const allies = [[-50, -40], [55, -30], [-10, 60]].map(([ox, oy], i) => { const [ax, ay] = PAL(t - .8 - i * .3); return [ax + ox, ay + oy]; });
    allies.forEach(([ax, ay], i) => {
      const inZone = Math.hypot(ax - x, ay - y) < 88;
      T.foe(ax, ay, 12, Math.atan2(y - ay, x - ax), '#e07a6e', { hp: inZone ? .6 + .35 * ((t * .3 + i * .33) % 1) : .5, hpMax: 1 });
      if (inZone && (t + i * .4) % 1.2 < .6) T.popText('+', ax, ay - 24 - ((t + i * .4) % 1.2) * 20, C.good, 1 - ((t + i * .4) % 1.2) / .6);
    });
    const s = slam(t); if (s != null) { if (s < 0) T.zone(x - 40, y + 10, 50 * (1 + s), .8); else T.flash(x - 40, y + 10, 60, 1 - s / .35); }
    T.foe(x, y, 24, Math.PI, '#d9b04a', { mark: 'shield', edge: '#8a6a1a' });
    T.player(-170, 40 + Math.sin(t) * 20, Math.atan2(y - 40, x + 170), .8);
  }
  function turtle(g, t) {
    // mist patches dropped every .35 s, each lasting MIST seconds
    for (let k = Math.floor((t - MIST) / .35); k <= Math.floor(t / .35); k++) {
      const tt = k * .35; if (tt < 0 && t < MIST) continue;
      const age = t - tt; if (age < 0 || age > MIST) continue;
      const [mx, my] = TUR(tt), a = 1 - age / MIST;
      g.fillStyle = `rgba(47,174,99,${.22 * a})`; g.beginPath(); g.arc(mx, my, 30, 0, Math.PI * 2); g.fill();
    }
    const [x, y] = TUR(t);
    const onMist = (ax, ay) => { for (let k = 1; k * .35 < MIST; k++) { const [mx, my] = TUR(t - k * .35); if (Math.hypot(ax - mx, ay - my) < 30) return true; } return false; };
    const allies = [0, 1, 2].map(i => { const [ax, ay] = TUR(t - 1.6 - i * .9); return [ax + Math.sin(t * 1.7 + i * 2) * 26, ay + Math.cos(t * 1.3 + i) * 30]; });
    allies.forEach(([ax, ay], i) => {
      const healing = onMist(ax, ay);
      T.foe(ax, ay, 12, 0, '#e07a6e', { hp: healing ? .6 + .35 * ((t * .3 + i * .33) % 1) : .5, hpMax: 1 });
      if (healing && (t + i * .4) % 1.2 < .6) T.popText('+', ax, ay - 24 - ((t + i * .4) % 1.2) * 20, C.good, 1 - ((t + i * .4) % 1.2) / .6);
    });
    const s = slam(t); if (s != null) { if (s < 0) T.zone(x + 36, y, 50 * (1 + s), .8); else T.flash(x + 36, y, 60, 1 - s / .35); }
    const block = (t % 4) > .6 && (t % 4) < 1.8;
    T.foe(x, y, 24, 0, '#5a8a3a', { edge: '#2f5a1f' });
    g.strokeStyle = '#2f5a1f'; g.lineWidth = 2; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.beginPath(); g.arc(x + Math.cos(a) * 11, y + Math.sin(a) * 11, 6, 0, Math.PI * 2); g.stroke(); }
    if (block) { T.bubble(x, y, 32, t, .9); T.label('shell: blocks every side', x, y - 46, 'center', C.blue, 12); }
    T.player(170, -30 + Math.sin(t) * 20, Math.atan2(y + 30, x - 170), .8);
  }

  // ---------- three more: where else can the heal sit? ----------
  const hits = (g, x0, y0, x1, y1, a, ts, dmg) => ts.forEach(h => { const k = a - h; if (k >= 0 && k < .22) T.tracer(x0, y0, x1, y1, 1 - k / .22, C.gold, 5); if (k >= 0 && k < .9) T.popText(dmg, x1, y1 - 30 - k * 26, C.redDk, 1 - k / .9); });
  function healRing(g, x, y, r, t) {
    T.zone(x, y, r, 1, '47,174,99');
    const pulse = (t % 1.2) / 1.2; g.strokeStyle = `rgba(47,174,99,${.8 * (1 - pulse)})`; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r * pulse, 0, Math.PI * 2); g.stroke();
  }
  function ally(g, x, y, i, t, healing) {
    T.foe(x, y, 12, 0, '#e07a6e', { hp: healing ? .6 + .35 * ((t * .3 + i * .33) % 1) : .45, hpMax: 1 });
    const k = (t + i * .4) % 1.2; if (healing && k < .6) T.popText('+', x, y - 24 - k * 20, C.good, 1 - k / .6);
  }
  function shaman(g, t) {
    const a = t % 8, tx = -20, ty = 40;
    const totem = a < 3.6 || a >= 6.2, thp = a < 2.4 ? 1 : a < 2.9 ? .66 : a < 3.4 ? .33 : 0;
    const sx = 110 + Math.sin(t * .6) * 18, sy = -60 + Math.cos(t * .5) * 18;
    if (totem) healRing(g, tx, ty, 88, t);
    [[-50, -30], [40, -20], [-10, 85]].forEach(([ox, oy], i) => ally(g, tx + ox + Math.sin(t + i) * 6, ty + oy + Math.cos(t * .8 + i) * 6, i, t, totem && a >= 6.4 || totem && a < 3.6));
    if (totem) {
      const pop = a >= 6.2 ? clamp((a - 6.2) / .3) : 1;
      g.save(); g.globalAlpha *= pop;
      g.fillStyle = '#7a5a3a'; g.strokeStyle = '#3a2a1a'; g.lineWidth = 2; g.fillRect(tx - 6, ty - 22, 12, 36); g.strokeRect(tx - 6, ty - 22, 12, 36);
      icon(g, 'wow-inv_spear_04.jpg', tx, ty - 40, 30, { lw: 2 }); g.restore();
      T.hp(tx, ty + 26, 40, thp, 1);
    } else if (a < 4.4) T.poof(tx, ty, a - 3.6, 24);
    if (a > 5.6 && a < 6.2) T.label('plants a new totem', tx, ty - 70, 'center', C.good, 12);
    const s0 = slam(t); if (s0 != null) { if (s0 < 0) T.zone(sx - 40, sy + 20, 46 * (1 + s0), .8); else T.flash(sx - 40, sy + 20, 56, 1 - s0 / .35); }
    T.foe(sx, sy, 22, Math.PI * .8, '#3a6ab0', { mark: 'shield', edge: '#1a3a70' });
    const run = ease(clamp((a - .4) / 1.6)) * (1 - ease(clamp((a - 4.4) / 1)));
    const px = lerp(-190, -70, run), py = lerp(90, 50, run);
    T.player(px, py, Math.atan2(ty - py, tx - px), .8);
    hits(g, px + 12, py, tx - 8, ty - 10, a, [2.4, 2.9, 3.4], '-30');
    if (a > 1.6 && a < 3.6) T.label('smash the totem', px, py + 34, 'center', C.blue, 12);
    if (a > 3.7 && a < 5.6) T.label('no totem, no heal', tx, ty - 34, 'center', C.goldInk, 12);
  }
  function golem(g, t) {
    const a = t % 8, fx = 60, fy = 0;
    g.fillStyle = 'rgba(87,182,255,.28)'; g.beginPath(); g.ellipse(fx, fy, 84, 70, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#8b8fa8'; g.lineWidth = 6; g.stroke();
    healRing(g, fx, fy, 96, t);
    [[40, -45], [80, 40]].forEach(([ox, oy], i) => ally(g, fx + ox - 40 + Math.sin(t * .7 + i) * 6, fy + oy, i, t, true));
    const out = ease(clamp((a - 1.2) / 1.4)) * (1 - ease(clamp((a - 5.4) / 1.2)));
    const gx = lerp(fx - 10, -110, out), gy = lerp(fy, 10, out), on = out < .3;
    const ghp = a < 3.2 ? .9 : a < 3.8 ? .75 : a < 4.4 ? .6 : a < 6.6 ? .45 : .45 + .45 * clamp((a - 6.6) / 1.3);
    const sl = a > 4.6 && a < 5.3 ? a - 5.0 : null;
    const pr = a < 1.2 ? ease(clamp(a / 1.2)) : 1, px0 = lerp(-200, -40, pr), back = ease(clamp((a - 1.2) / 1.2));
    let px = a < 1.2 ? px0 : lerp(-40, -175, back), py = a < 1.2 ? 50 : lerp(50, 30, back);
    const dodge = ease(clamp((a - 4.7) / .25)) * (1 - ease(clamp((a - 5.6) / .4))); py -= dodge * 60;
    if (sl != null) { if (sl < 0) T.zone(-170, 30, 44 * (1 + sl / .4), .8); else T.flash(-170, 30, 56, 1 - sl / .3); }
    T.foe(gx, gy, 28, Math.atan2(py - gy, px - gx), '#8b8fa8', { mark: 'shield', edge: C.stoneDk, hp: ghp, hpMax: 1 });
    if (on && a > 6.6) { const k = (t % .8) / .8; T.popText('+', gx, gy - 56 - k * 18, C.good, 1 - k); }
    T.player(px, py, Math.atan2(gy - py, gx - px), .8);
    hits(g, px + 12, py, gx - 22, gy, a, [3.2, 3.8, 4.4], '-15');
    if (a > .4 && a < 2.6) T.label('lure it off the spring', -120, 100, 'center', C.blue, 12);
    if (a > 2.6 && a < 5.4) T.label('off the spring: no heal', gx, gy + 50, 'center', C.goldInk, 12);
    if (a > 6.4) T.label('back on the spring: it heals', fx, 100, 'center', C.good, 12);
  }
  const ROOTS = [2.75, 3.25, 3.85, 2.05, 4.45];
  function treant(g, t) {
    const a = t % 8, rx = 90, ry = -10, grow = 70 + 110 * clamp(a / 2);
    const cut = [a >= 4.9 ? 70 : null, a >= 3.3 ? 60 : null, null, null, null];
    ROOTS.forEach((ang, i) => {
      const seg = (d0, d1, live) => { g.strokeStyle = live ? '#6b4a2a' : 'rgba(120,110,95,.55)'; g.lineWidth = live ? 7 : 5; g.beginPath(); for (let d = d0; d <= d1; d += 6) { const w = Math.sin(d * .08 + i) * 6, x = rx + Math.cos(ang) * d - Math.sin(ang) * w, y = ry + Math.sin(ang) * d + Math.cos(ang) * w; d === d0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke();
        if (live) { g.strokeStyle = `rgba(47,174,99,${.35 + .25 * Math.sin(t * 4 + i)})`; g.lineWidth = 14; g.stroke(); } };
      const c = cut[i]; if (c == null) seg(24, grow, true); else { seg(24, c, true); seg(c + 8, grow, false); }
    });
    [[0, 130], [1, 140], [3, 110]].forEach(([ri, d], j) => {
      const ang = ROOTS[ri], x = rx + Math.cos(ang) * d, y = ry + Math.sin(ang) * d;
      ally(g, x, y, j, t, grow > d && cut[ri] == null);
    });
    const s0 = slam(t); if (s0 != null) { if (s0 < 0) T.zone(rx + 40, ry + 30, 46 * (1 + s0), .8); else T.flash(rx + 40, ry + 30, 56, 1 - s0 / .35); }
    T.foe(rx, ry, 30, Math.PI, '#5a7a3a', { mark: 'shield', edge: '#2f4a1f' });
    GI.draw(g, 'leaf-swirl', rx, ry, 26, '#e8f0d0');
    // the player cuts root 1, then root 0
    const P = [[-200, 80], [rx + Math.cos(ROOTS[1]) * 64, ry + Math.sin(ROOTS[1]) * 64 + 26], [rx + Math.cos(ROOTS[0]) * 74, ry + Math.sin(ROOTS[0]) * 74 + 28]];
    const k1 = ease(clamp((a - 2) / 1)), k2 = ease(clamp((a - 3.8) / .9)), k3 = ease(clamp((a - 6.4) / 1.2));
    let px = lerp(P[0][0], P[1][0], k1), py = lerp(P[0][1], P[1][1], k1);
    if (k2 > 0) { px = lerp(P[1][0], P[2][0], k2); py = lerp(P[1][1], P[2][1], k2); }
    if (k3 > 0) { px = lerp(P[2][0], P[0][0], k3); py = lerp(P[2][1], P[0][1], k3); }
    T.player(px, py, -Math.PI / 2, .8);
    [[3.3, 1, 60], [4.9, 0, 70]].forEach(([h, ri, d]) => { const k = a - h; const x = rx + Math.cos(ROOTS[ri]) * d, y = ry + Math.sin(ROOTS[ri]) * d; if (k >= 0 && k < .22) T.tracer(px, py - 12, x, y, 1 - k / .22, C.gold, 5); if (k >= 0 && k < .9) T.popText('cut', x, y - 26 - k * 22, C.blue, 1 - k / .9); });
    if (a > 1 && a < 3.3) T.label('cut the roots', -140, 120, 'center', C.blue, 12);
    if (a > 5.2 && a < 6.6) T.label('allies past the cut stop healing', -40, -120, 'center', C.goldInk, 12);
    if (a > 7.2) T.label('roots grow back', rx, ry - 50, 'center', C.good, 12);
  }

  const KINDS = {
    paladin: ['Paladin', 'wow-classicon_paladin.jpg', 'The heal moves with it: allies stay close to the paladin', paladin],
    turtle: ['Turtle', 'wow-ability_hunter_pet_turtle.jpg', 'The heal stays behind: the trail is the zone', turtle],
    shaman: ['Totem Shaman', 'wow-classicon_shaman.jpg', 'The heal sits on a totem: break it and the heal is gone', shaman],
    golem: ['Spring Golem', 'wow-spell_nature_earthelemental_totem.jpg', 'The heal is a fixed spring: lure it off', golem],
    treant: ['Ancient Treant', 'wow-ability_druid_forceofnature.jpg', 'The heal runs along its roots: cut them', treant],
  };
  const TOUR = ['both', 'shaman', 'golem', 'treant'];
  const view = (t, st, tour) => tour ? TOUR[Math.floor(t / PH) % TOUR.length] : st.show;

  scene('paladin-turtle', {
    dur: DUR,
    state: () => ({ show: 'both' }),
    init(s, st, api) {
      $$(s, '.pt-show .btn').forEach(b => b.onclick = () => { api.manual(); st.show = b.dataset.v; });
      st.sync = () => $$(s, '.pt-show .btn').forEach(b => b.classList.toggle('on', b.dataset.v === view(st.t, st, st.tour)));
    },
    draw(g, t, st, tour) {
      const show = view(t, st, tour);
      let x = 140;
      ['Defender', 'Zone Healer', 'Brute'].forEach((n, i) => { const w = chip(g, n, x, 26, { ...TONE.red, size: 15, align: 'left' }); x += w + (i < 2 ? 34 : 0); if (i < 2) text(g, '+', x - 17, 26, { size: 22, w: 800, col: C.redDk }); });
      text(g, '= one creature?', x + 14, 27, { align: 'left', size: 17, w: 700, col: C.navy });
      const sides = show === 'both' ? [['paladin', 18, 500], ['turtle', 522, 500]] : [[show, 120, 800]];
      sides.forEach(([k, px, w]) => {
        const [title, ic, line, fn] = KINDS[k];
        frame(g, px, 52, w, 526, title, ic, line);
        g.save(); g.beginPath(); g.roundRect(px + 14, 110, w - 28, 414, 10); g.clip(); g.translate(px + w / 2, 317); if (w > 600) g.scale(1.35, 1.35);
        T.use(g); fn(g, t); g.restore();
      });
      st.sync?.();
    },
    side(t, st, tour) {
      const show = view(t, st, tour);
      const stats = `<div class="y"><b>3</b><span>archetypes, the same in all five</span></div><div class="g"><b>5</b><span>creatures, each asking for a different answer</span></div>`;
      const OUT = {
        paladin: 'Paladin: a heavy hammer, a shield, and a radiance that heals nearby allies. Answer: pull its allies away from it, or kill it first.',
        turtle: 'Turtle: its shell blocks from every side, and it leaves a healing mist behind it. Answer: fight its allies away from the trail.',
        shaman: 'Totem Shaman: a shield, a hammer, and a healing totem it plants. The heal sits on an object. Answer: smash the totem, then fight the shaman.',
        golem: 'Spring Golem: stone arms that block, a heavy slam, and a healing spring it won’t leave. The heal sits on a fixed spot. Answer: lure it off the spring and fight it there.',
        treant: 'Ancient Treant: bark that blocks, a crushing branch, and roots that heal whatever stands on them. The heal runs along lines. Answer: cut the roots, or pull allies off them.',
        both: 'The same Defender + Zone Healer + Brute gives two creatures. Where the heal sits changes how you fight them.',
      };
      return { stats, out: OUT[show] };
    },
  });
})();
