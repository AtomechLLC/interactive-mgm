/* Paladin or turtle? (MGM C4 M7, deck slides 170-173). Defender + Zone Healer + Brute, built twice. The paladin's heal is an
   aura that moves with it, so its allies want to stay close. The turtle's heal is a mist it leaves behind, so the heal zone is
   wherever it has been, and its shell blocks from every side. Same three archetypes, different fights (notes on 173). */
(function () {
  const { $$ } = FPF.kit;
  const { icon, text, chip, TONE, panel, scene, clamp, lerp } = CK;
  const T = TD, C = TD.C;
  const DUR = 12;
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

  scene('paladin-turtle', {
    dur: DUR,
    state: () => ({ show: 'both' }),
    init(s, st, api) {
      $$(s, '.pt-show .btn').forEach(b => b.onclick = () => { api.manual(); st.show = b.dataset.v; });
      st.sync = () => $$(s, '.pt-show .btn').forEach(b => b.classList.toggle('on', b.dataset.v === (st.tour ? 'both' : st.show)));
    },
    draw(g, t, st, tour) {
      const show = tour ? 'both' : st.show;
      let x = 140;
      ['Defender', 'Zone Healer', 'Brute'].forEach((n, i) => { const w = chip(g, n, x, 26, { ...TONE.red, size: 15, align: 'left' }); x += w + (i < 2 ? 34 : 0); if (i < 2) text(g, '+', x - 17, 26, { size: 22, w: 800, col: C.redDk }); });
      text(g, '= one creature?', x + 14, 27, { align: 'left', size: 17, w: 700, col: C.navy });
      const sides = show === 'both' ? [['paladin', 18, 500], ['turtle', 522, 500]] : [[show, 120, 800]];
      sides.forEach(([k, px, w]) => {
        const pal = k === 'paladin';
        frame(g, px, 52, w, 526, pal ? 'Paladin' : 'Turtle', pal ? 'wow-classicon_paladin.jpg' : 'wow-ability_hunter_pet_turtle.jpg',
          pal ? 'The heal moves with it: allies stay close to the paladin' : 'The heal stays behind: the trail is the zone');
        g.save(); g.beginPath(); g.roundRect(px + 14, 110, w - 28, 414, 10); g.clip(); g.translate(px + w / 2, 317); if (w > 600) g.scale(1.35, 1.35);
        T.use(g); pal ? paladin(g, t) : turtle(g, t); g.restore();
      });
      st.sync?.();
    },
    side(t, st, tour) {
      const stats = `<div class="y"><b>3</b><span>archetypes, the same in both</span></div><div class="g"><b>2</b><span>creatures, each asking for a different answer</span></div>`;
      const show = tour ? 'both' : st.show;
      const out = show === 'paladin' ? 'Paladin: a heavy hammer, a shield, and a radiance that heals nearby allies. Answer: pull its allies away from it, or kill it first.'
        : show === 'turtle' ? 'Turtle: its shell blocks from every side, and it leaves a healing mist behind it. Answer: fight its allies away from the trail.'
        : 'The same Defender + Zone Healer + Brute gives two creatures. Where the heal sits changes how you fight them.';
      return { stats, out };
    },
  });
})();
