/* Mechanic or aesthetic? (MGM C4 M2, deck slide 18). Two identical fields, the same hero, the same sword. In the left field
   cut grass just falls over; in the right field some tufts hide a gem or a staircase, so cutting changes the world. The notes'
   test: if it doesn't leave a significant gameplay change on the world, it's aesthetic. HIDE says what each tuft hides. */
(function () {
  const { $, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, PW = 490, PH = 400, PY = 18, PX = [20, 530];
  const TUFTS = [[85, 140], [195, 140], [305, 140], [415, 140], [415, 285], [305, 285], [195, 285], [85, 285]];
  // what the right-hand field hides under each tuft (the left field hides nothing)
  const HIDE = [null, 'gem', null, null, 'gem', null, 'stairs', null];
  const PANELS = [{ name: 'Aesthetic: the grass just falls over', col: C.muted }, { name: 'Mechanic: the grass hides things', col: C.good }];

  // the walk-through: the hero visits every tuft in order and slashes it, in both fields at once
  const path = T.Path([40, 360], 230), CUT = [];
  TUFTS.forEach(([x, y]) => { path.go(x, y + 62); CUT.push(path.t + .12); path.wait(.75, [x, y]); });
  path.go(250, 368).wait(2.6, [250, 0]);
  const DUR = path.t;

  function meadow(x, y) {
    const g = T._g;
    g.fillStyle = '#cfe0ae'; g.beginPath(); g.roundRect(x, y, PW, PH, 14); g.fill();
    g.save(); g.beginPath(); g.roundRect(x, y, PW, PH, 14); g.clip();
    g.strokeStyle = 'rgba(90,130,60,.22)'; g.lineWidth = 2;
    for (let i = 0; i < 70; i++) { const px = x + (i * 97) % PW, py = y + (i * 53) % PH; g.beginPath(); g.moveTo(px, py); g.lineTo(px + 3, py - 7); g.stroke(); }
    g.restore();
    g.strokeStyle = '#8fae6a'; g.lineWidth = 3; g.beginPath(); g.roundRect(x, y, PW, PH, 14); g.stroke();
  }
  // a tuft: a fan of blades; cut, it drops to stubs and throws clippings for a moment
  function tuft(x, y, cutAgo) {
    const g = T._g, cut = cutAgo != null && cutAgo >= 0;
    T.shadow(x + 3, y + 22, 34, 10, .18);
    g.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * .2, len = cut ? 10 : 46 - Math.abs(i - 4) * 4;
      g.strokeStyle = i % 2 ? '#3f8a3a' : '#57a347'; g.lineWidth = 7;
      g.beginPath(); g.moveTo(x + (i - 4) * 4, y + 20); g.quadraticCurveTo(x + (i - 4) * 6, y + 20 - len * .6, x + (i - 4) * 4 + Math.cos(a) * len, y + 20 + Math.sin(a) * len); g.stroke();
    }
    if (cut && cutAgo < .7) {
      const k = cutAgo / .7;
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i - 5) * .32, d = 20 + 50 * ease(k); g.save(); g.globalAlpha = 1 - k; g.translate(x + Math.cos(a) * d, y + Math.sin(a) * d + 30 * k * k); g.rotate(i + k * 6); g.fillStyle = '#57a347'; g.fillRect(-6, -2, 12, 4); g.restore(); }
    }
  }
  function gem(x, y, s = 1) {
    const g = T._g; g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = '#2fae63'; g.strokeStyle = C.navy; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(0, -16); g.lineTo(10, -6); g.lineTo(10, 8); g.lineTo(0, 17); g.lineTo(-10, 8); g.lineTo(-10, -6); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(0, -12); g.lineTo(5, -5); g.lineTo(0, 2); g.lineTo(-5, -5); g.closePath(); g.fill();
    g.restore();
  }
  function stairs(x, y, a) {
    const g = T._g; g.save(); g.globalAlpha = a;
    g.fillStyle = '#2a2e55'; g.beginPath(); g.ellipse(x, y + 4, 40, 28, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#8b8fa8'; g.lineWidth = 3;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(x - 26 + i * 4, y - 12 + i * 8); g.lineTo(x + 26 - i * 4, y - 12 + i * 8); g.stroke(); }
    g.restore();
  }

  // cuts[p][i] = time tuft i of field p was cut (null = still standing); hero[p] = { x, y, face, slash }
  function scene(g, t, cuts, hero) {
    T.use(g); T._g = g; g.clearRect(0, 0, W, H);
    const counts = [0, 0];
    PX.forEach((x0, p) => {
      meadow(x0, PY);
      T.label(PANELS[p].name, x0 + PW / 2, PY + 26, 'center', '#fff', 15, PANELS[p].col);
      TUFTS.forEach(([x, y], i) => {
        const ct = cuts[p][i], ago = ct == null ? null : t - ct, hid = p ? HIDE[i] : null;
        if (hid === 'stairs' && ago != null && ago >= 0) { stairs(x0 + x, y, clamp(ago / .4)); counts[p]++; }
        if (!(hid === 'stairs' && ago > .4)) tuft(x0 + x, y, ago);
        if (hid === 'gem' && ago != null && ago >= 0) {
          // pops out, hangs for a beat, then flies down into the counter
          const fly = clamp((ago - .7) / .5), bx = x0 + PW / 2, by = PY + PH + 60;
          if (fly < 1) { const pop = ago < .3 ? ease(ago / .3) : 1; gem(lerp(x0 + x, bx, ease(fly)), lerp(y - 26 * pop, by, ease(fly)), lerp(1.1, .6, fly)); }
          if (ago < 1) T.popText('+1 gem', x0 + x, y - 60 - 20 * ago, C.good, 1 - ago);
          if (fly >= 1) counts[p]++;
        }
        if (hid === 'stairs' && ago != null && ago >= 0 && ago < 1.2) T.popText('a way down!', x0 + x, y - 62 - 16 * ago, C.good, 1.2 - ago);
      });
      const h = hero[p];
      if (h) {
        T.player(x0 + h.x, h.y, h.face, 1);
        if (h.slash != null && h.slash >= 0 && h.slash < .3) T.cone(x0 + h.x, h.y, h.face, .9, 70, 1 - h.slash / .3, '255,185,81');
      }
    });
    // bottom strip: what changed in each world
    PX.forEach((x0, p) => {
      const y = PY + PH + 18;
      g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(x0, y, PW, 128, 12); g.fill();
      g.strokeStyle = '#cdbf9f'; g.lineWidth = 1.5; g.stroke();
      const cutN = cuts[p].filter(c => c != null && c <= t).length;
      g.font = '800 40px Montserrat, Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = C.ink; g.fillText(cutN, x0 + 90, y + 50); g.fillStyle = counts[p] ? C.good : C.muted; g.fillText(counts[p], x0 + PW - 90, y + 50);
      g.font = '600 14px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText('tufts cut', x0 + 90, y + 84); g.fillText('changes to the world', x0 + PW - 90, y + 84);
      for (let k = 0; k < 2; k++) if (p && k < counts[p]) gem(x0 + PW / 2 - 18 + k * 36, y + 50, .9); else if (p) { g.strokeStyle = '#cdbf9f'; g.setLineDash([4, 4]); g.lineWidth = 2; g.beginPath(); g.arc(x0 + PW / 2 - 18 + k * 36, y + 50, 14, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); }
      if (!p) { g.font = '600 15px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText('nothing to find', x0 + PW / 2, y + 50); }
      T.label(cutN === 0 ? '' : p ? (counts[p] ? 'Mechanic' : 'Nothing yet…') : 'Aesthetic', x0 + PW / 2, y + 108, 'center', '#fff', 14, cutN === 0 ? 'rgba(0,0,0,0)' : p ? (counts[p] ? C.good : C.muted) : C.muted);
    });
    return counts;
  }

  const tourCuts = t => [CUT.map(c => c), CUT.map(c => c)];
  function tourHero(t) {
    const p = path.at(t), i = CUT.findIndex(c => t < c + .8), slash = i < 0 ? null : t - CUT[i];
    return { x: p.x, y: p.y, face: p.face, slash };
  }

  let api;
  canvasDemo('grass', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, cuts: [TUFTS.map(() => null), TUFTS.map(() => null)], hero: [null, null], key: '' };
    const tourBtn = $(s, '.gr-tour');
    const stopTour = () => { if (!st.tour) return; st.tour = false; tourBtn.classList.remove('on'); st.t = 0; st.cuts = [TUFTS.map(() => null), TUFTS.map(() => null)]; st.hero = [{ x: 250, y: 368, face: -Math.PI / 2 }, { x: 250, y: 368, face: -Math.PI / 2 }]; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    $(s, '.gr-reset').onclick = () => { st.tour = true; stopTour(); };
    cv.addEventListener('pointerdown', e => {
      const r = cv.getBoundingClientRect(), mx = (e.clientX - r.left) * W / r.width, my = (e.clientY - r.top) * H / r.height;
      PX.forEach((x0, p) => TUFTS.forEach(([x, y], i) => {
        if (Math.hypot(mx - x0 - x, my - y) > 42) return;
        stopTour(); if (st.cuts[p][i] != null) return;
        st.cuts[p][i] = st.t; st.hero[p] = { x, y: y + 62, face: -Math.PI / 2, at: st.t };
      }));
    });
    function render() {
      const t = st.t, h = st.tour ? tourHero(t) : null;
      const hero = st.tour ? [h, h] : st.hero.map(x => x && { ...x, slash: t - x.at });
      const counts = scene(g, t, st.tour ? tourCuts(t) : st.cuts, hero);
      const cutN = (st.tour ? CUT : st.cuts[1]).filter(c => c != null && c <= t).length;
      const key = counts.join() + '|' + cutN; if (key === st.key) return; st.key = key;
      say($(s, '.gr-stats'), `<div><b>${cutN}</b><span>tufts cut in each field</span></div><div class="y"><b>${counts[0]}</b><span>changes in the aesthetic field</span></div><div class="g"><b>${counts[1]}</b><span>changes in the mechanic field</span></div>`);
      say($(s, '.gr-out'), counts[1]
        ? 'Same sword, same grass, same animation. On the right, cutting can reveal a gem or a way down, so something new exists in the world: that is a mechanic. On the left nothing changes, so it is aesthetic. Both have their place.'
        : 'Both fields look and react the same: the grass falls and the clippings fly. The test is not how it looks, it is whether the world changes.');
    }
    api = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });
  window.__seek = t => api.seek(t);
  window.__dur = () => api.dur();
})();
