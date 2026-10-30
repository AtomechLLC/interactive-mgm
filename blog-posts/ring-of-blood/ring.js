/* Ring of Blood difficulty ladder (post-mortem: "The Ring of Blood: Balancing Fantasy and Gameplay").
   Six fights, each meant to be harder than the last. The post gives the first steps: the Blue Brothers have about
   30% more health and damage than Brokentoe, and Rokdar 30% more health and 50% more damage again. After that it gives
   directions, not numbers: Skra'gath's class swap from Paladin to Mage cut his armor by 80% and made him easier than
   the fight before him, and the Warmaul Champion was tuned like a dungeon boss and was the first fight nerfed after
   launch. Heights from Skra'gath on are illustrative. Difficulty here is health x damage, relative to Brokentoe.
   Pure function of time and the two toggles, so __seek is deterministic. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585;
  // [name, health, damage, colour, mark, the post's line]
  const FIGHTS = [
    ['Brokentoe', 1, 1, '#9a7a4a', 'horns', 'A 3-person fight you can start while more players arrive.'],
    ['The Blue Brothers', 1.3, 1.3, '#4c6fd6', 'eye', 'About 30% more health and damage than Brokentoe. Immune to crowd control.'],
    ['Rokdar the Sundered Lord', 1.69, 1.95, '#8a7a6a', 'shield', 'Another 30% health and 50% damage, plus a knock-away timed as a tank insurance policy.'],
    ['Skra’gath', 2.2, 2.4, '#6a3fb0', 'eye', 'Designed to teach magic schools and keeping distance.'],
    ['The Warmaul Champion', 3.6, 3.4, '#b0352d', 'horns', 'Tuned at the difficulty of an actual dungeon boss.'],
    ['Mogor', 3.7, 3.7, '#3f8a5a', 'staff', 'Dispels, interrupts, a totem, a revive and an enrage: a dungeon checklist.'],
  ];
  const STEP = 1.3;                            // "each fight is supposed to be successively harder"
  const ARMOR_CUT = .42;                       // illustrative: an 80% armor cut leaves him well below Rokdar
  const NERF = .72;                            // illustrative: the post-launch nerf
  const diff = (i, o) => { const f = FIGHTS[i]; let d = f[1] * f[2]; if (i === 3 && o.mage) d *= ARMOR_CUT; if (i === 4 && o.nerf) d *= NERF; return d; };

  function draw(g, o, grow, focus) {
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
    const x0 = 80, base = 450, top = 60, bw = 110, gap = (W - x0 - 40 - 6 * bw) / 5, max = 15, sy = v => base - v / max * (base - top);
    // axis
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 1; g.font = '500 12px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'right'; g.textBaseline = 'middle';
    [1, 2, 4, 6, 8, 10, 12, 14].forEach(v => { g.beginPath(); g.moveTo(x0 - 6, sy(v)); g.lineTo(W - 30, sy(v)); g.stroke(); g.fillText(v + '×', x0 - 10, sy(v)); });
    g.save(); g.translate(22, (base + top) / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.font = '600 13px Jost, sans-serif'; g.fillText('health × damage, against Brokentoe', 0, 0); g.restore();
    // the intended staircase: each step 30% above the last
    g.strokeStyle = C.gold; g.lineWidth = 3; g.setLineDash([8, 6]); g.beginPath();
    FIGHTS.forEach((f, i) => { const x = x0 + i * (bw + gap), v = Math.pow(STEP, 2 * i); if (!i) g.moveTo(x, sy(v)); else g.lineTo(x, sy(v)); g.lineTo(x + bw, sy(v)); });
    g.stroke(); g.setLineDash([]);
    g.font = '600 12px Jost, sans-serif'; g.fillStyle = C.goldInk; g.textAlign = 'left'; g.fillText('meant to be: each fight about 30% tougher in health and in damage', x0 + 6, sy(Math.pow(STEP, 10)) - 18);
    FIGHTS.forEach((f, i) => {
      const x = x0 + i * (bw + gap), d = diff(i, o), want = Math.pow(STEP, 2 * i), k = clamp(grow - i);
      if (k <= 0) return;
      const v = lerp(0, d, ease(k)), below = d < diff(i - 1 < 0 ? 0 : i - 1, o) && i > 0, spike = d > want * 1.4;
      g.fillStyle = below ? C.red : spike ? '#b0352d' : C.ink; g.globalAlpha = focus >= 0 && focus !== i ? .45 : 1;
      g.beginPath(); g.roundRect(x, sy(v), bw, base - sy(v), [8, 8, 0, 0]); g.fill(); g.globalAlpha = 1;
      g.font = '800 15px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'center'; g.fillText(d.toFixed(1) + '×', x + bw / 2, sy(v) - 14);
      T.foe(x + bw / 2, base + 30, 17, -Math.PI / 2, f[3], { edge: C.navy, mark: f[4] });
      g.font = '600 12px Jost, sans-serif'; g.fillStyle = C.ink;
      f[0].split(' ').reduce((ls, w) => { const l = ls[ls.length - 1]; if ((l + ' ' + w).length > 16 && l) ls.push(w); else ls[ls.length - 1] = (l ? l + ' ' : '') + w; return ls; }, ['']).forEach((l, j) => g.fillText(l, x + bw / 2, base + 62 + j * 15));
      if (i >= 3) { g.font = '500 11px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText('illustrative', x + bw / 2, base + 96); }
      if (i === 3 && o.mage && k >= 1) T.label('Paladin → Mage: armor −80%', x + bw / 2, sy(want) - 14, 'center', C.red, 12);
      if (i === 4 && k >= 1) T.label(o.nerf ? 'after the launch nerf' : 'a dungeon boss, outdoors', x + bw / 2, sy(d) - 40, 'center', '#b0352d', 12);
    });
  }

  const LEN = 2.2, DUR = LEN * 6 + 6;
  const SAY = [
    'Brokentoe: the quiet first step, there to draw players in while the group fills up.',
    'The Blue Brothers: about 30% more health and damage than Brokentoe, so the step is right on the line.',
    'Rokdar: another 30% health and 50% damage. Still climbing the stairs.',
    'Skra’gath: swapping his class from Paladin to Mage to look cooler cut his armor by 80%. He came out easier than the fight before him.',
    'The Warmaul Champion: tuned like a real dungeon boss. Outdoor groups were rarely a proper five, so this was the first fight nerfed after launch.',
    'Mogor: the finale. The two broken steps carry the post’s lesson: great design means nothing if players never have to pay attention to it, and too much is just as wrong.',
  ];
  const scenes = {};
  canvasDemo('ring', (s, cv, g) => {
    const st = { t: 0, tour: true, held: false, key: '' };
    const mage = $(s, '.rb-mage'), nerf = $(s, '.rb-nerf'), tourBtn = $(s, '.rb-tour');
    const manual = () => { st.tour = false; tourBtn.classList.remove('on'); };
    mage.onchange = nerf.onchange = manual;
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    function frame(t) {
      let o, grow, focus;
      if (st.tour) { grow = t / LEN; focus = Math.min(5, Math.floor(t / LEN)); o = { mage: t > LEN * 3 + .9, nerf: false }; if (t > LEN * 6) focus = -1; mage.checked = o.mage; nerf.checked = false; }
      else { o = { mage: mage.checked, nerf: nerf.checked }; grow = 9; focus = -1; }
      draw(g, o, grow, focus);
      const key = [focus, o.mage, o.nerf, st.tour].join(); if (key === st.key) return; st.key = key;
      const ds = FIGHTS.map((f, i) => diff(i, o)), drops = ds.filter((d, i) => i && d < ds[i - 1]).length;
      say($(s, '.rb-stats'), `<div class="${drops ? 'r' : 'g'}"><b>${drops}</b><span>steps that go down</span></div><div><b>${ds[4].toFixed(1)}×</b><span>the Champion</span></div>`);
      say($(s, '.rb-out'), st.tour ? SAY[Math.max(0, focus < 0 ? 5 : focus)] : 'Toggle the class swap and the nerf. The gold line is the plan; the bars are what players met.');
    }
    scenes.ring = { seek(t) { st.held = true; st.tour = true; frame(t); }, dur: () => DUR };
    return dt => { if (st.held) return; if (st.tour) { st.t += Math.max(0, dt); if (st.t > DUR) st.t = 0; } frame(st.t); };
  });
  window.__seek = (t, which = 'ring') => scenes[which].seek(t);
  window.__dur = (which = 'ring') => scenes[which].dur();
})();
