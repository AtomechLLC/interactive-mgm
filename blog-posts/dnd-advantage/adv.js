/* D&D Advantage (system teardown: "Dungeons & Dragons Combat System").
   Advantage rolls two d20 and keeps the higher; Disadvantage keeps the lower. Chance to roll T or more:
   one die (21 - T) / 20, Advantage 1 - ((T - 1) / 20)^2, Disadvantage ((21 - T) / 20)^2.
   Advantage is worth (T - 1)(21 - T) / 20 points of flat bonus: +5 at a target of 11, and under +1 at 2 or 20.
   Dice are seeded per roll, so the walk-through and __seek are deterministic. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585;
  const pOne = t => (21 - t) / 20, pAdv = t => 1 - ((t - 1) / 20) ** 2, pDis = t => ((21 - t) / 20) ** 2;
  const worth = t => 20 * (pAdv(t) - pOne(t));        // = (t - 1)(21 - t) / 20
  const face = { one: () => .05, adv: k => (2 * k - 1) / 400, dis: k => (41 - 2 * k) / 400 };
  const COL = { one: '#9a8f78', adv: C.player, dis: C.red };
  const die = n => { let s = (n * 2654435761 + 12345) >>> 0; return () => { s = (s * 1103515245 + 12345) >>> 0; return 1 + (s >>> 8) % 20; }; };

  function rolls(n) { const out = []; for (let i = 0; i < n; i++) { const r = die(i + 1); out.push([r(), r()]); } return out; }

  function draw(g, tgt, mode, n, t) {
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
    g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    // chart A: chance of each face
    const ax = 50, aw = 470, ay = 60, ah = 210, sx = k => ax + (k - .5) / 20 * aw, sy = v => ay + ah - v / .1 * ah;
    g.font = '800 15px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.fillText('Chance of each face', ax, 36);
    g.fillStyle = 'rgba(255,185,81,.18)'; g.fillRect(sx(tgt) - aw / 40, ay, ax + aw - sx(tgt) + aw / 40, ah);
    ['one', 'dis', 'adv'].forEach(m => {
      g.strokeStyle = COL[m]; g.lineWidth = m === mode || m === 'one' ? 3.5 : 2; g.globalAlpha = m === 'one' || m === mode ? 1 : .45; g.beginPath();
      for (let k = 1; k <= 20; k++) { const x0 = sx(k) - aw / 40, x1 = sx(k) + aw / 40, y = sy(face[m](k)); if (k === 1) g.moveTo(x0, y); else g.lineTo(x0, y); g.lineTo(x1, y); }
      g.stroke(); g.globalAlpha = 1;
    });
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 1; g.beginPath(); g.moveTo(ax, ay + ah); g.lineTo(ax + aw, ay + ah); g.stroke();
    g.font = '500 11px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'center';
    for (let k = 1; k <= 20; k++) g.fillText(k, sx(k), ay + ah + 14);
    g.textAlign = 'right'; [0, .05, .1].forEach(v => g.fillText(Math.round(v * 100) + '%', ax - 6, sy(v) + 4));
    g.textAlign = 'left'; g.font = '600 12px Jost, sans-serif';
    [['one die', 'one'], ['Advantage', 'adv'], ['Disadvantage', 'dis']].forEach(([l, m], i) => { g.fillStyle = COL[m]; g.fillRect(ax + 10 + i * 120, ay - 10, 14, 4); g.fillText(l, ax + 30 + i * 120, ay - 5); });
    T.label(`hit on ${tgt}+`, sx(tgt), ay + 14, 'left', C.goldInk, 12);
    // chart B: what Advantage is worth as a flat bonus
    const bx = 50, bw = 470, by = 330, bh = 190, bsx = v => bx + (v - 1) / 19 * bw, bsy = v => by + bh - v / 5 * bh;
    g.font = '800 15px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.fillText('Advantage is worth, as a flat bonus', bx, by - 14);
    g.fillStyle = 'rgba(46,163,220,.18)'; g.beginPath(); g.moveTo(bsx(1), bsy(0)); for (let v = 1; v <= 20; v += .25) g.lineTo(bsx(v), bsy(worth(v))); g.lineTo(bsx(20), bsy(0)); g.fill();
    g.strokeStyle = C.player; g.lineWidth = 3; g.beginPath(); for (let v = 1; v <= 20; v += .25) v === 1 ? g.moveTo(bsx(v), bsy(worth(v))) : g.lineTo(bsx(v), bsy(worth(v))); g.stroke();
    g.fillStyle = C.navy; g.beginPath(); g.arc(bsx(tgt), bsy(worth(tgt)), 7, 0, TAU); g.fill();
    T.label(`+${worth(tgt).toFixed(2)} at ${tgt}+`, bsx(tgt), bsy(worth(tgt)) - 20, 'center', C.ink, 13);
    g.font = '500 11px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'center';
    [2, 5, 8, 11, 14, 17, 20].forEach(v => g.fillText(v + '+', bsx(v), by + bh + 14));
    g.textAlign = 'right'; [0, 1, 2, 3, 4, 5].forEach(v => g.fillText('+' + v, bx - 6, bsy(v) + 4));
    g.textAlign = 'left'; g.fillText('target number', bx + bw - 80, by + bh + 30);

    // right: the roller
    const rx = 590;
    g.font = '800 15px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'left';
    g.fillText(`${mode === 'adv' ? 'Advantage' : 'Disadvantage'}: roll two, keep the ${mode === 'adv' ? 'higher' : 'lower'}`, rx, 36);
    const all = rolls(n), last = all[n - 1];
    if (last) {
      const keep = mode === 'adv' ? Math.max(...last) : Math.min(...last), wob = Math.max(0, 1 - (t % 1) * 4);
      last.forEach((v, i) => {
        const x = rx + 60 + i * 130, y = 120, kept = v === keep && (i === 0 || last[0] !== last[1]);
        g.save(); g.translate(x, y); g.rotate(wob * (i ? -.4 : .4));
        g.fillStyle = kept ? (mode === 'adv' ? C.player : C.red) : '#d9cba8'; g.beginPath();
        for (let k = 0; k < 6; k++) { const a = k / 6 * TAU - Math.PI / 2; k ? g.lineTo(Math.cos(a) * 44, Math.sin(a) * 44) : g.moveTo(Math.cos(a) * 44, Math.sin(a) * 44); }
        g.closePath(); g.fill(); g.font = '800 28px Montserrat, Jost, sans-serif'; g.fillStyle = kept ? '#fff' : C.muted; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(v, 0, 2); g.restore();
      });
      g.textBaseline = 'alphabetic'; g.textAlign = 'left'; g.font = '700 16px Jost, sans-serif';
      const hit = keep >= tgt; g.fillStyle = hit ? C.good : C.red; g.fillText(`${keep} ${hit ? '≥' : '<'} ${tgt}: ${hit ? 'hit' : 'miss'}`, rx + 300, 126);
    }
    // tallies against theory
    const rows = [['one die', 'one', pOne(tgt)], ['Advantage', 'adv', pAdv(tgt)], ['Disadvantage', 'dis', pDis(tgt)]];
    rows.forEach(([l, m, p], i) => {
      const y = 230 + i * 92, hits = all.filter(([a, b]) => (m === 'one' ? a : m === 'adv' ? Math.max(a, b) : Math.min(a, b)) >= tgt).length, obs = n ? hits / n : 0;
      g.font = '700 15px Jost, sans-serif'; g.fillStyle = C.ink; g.fillText(l, rx, y);
      g.font = '800 26px Montserrat, Jost, sans-serif'; g.fillStyle = COL[m]; g.textAlign = 'right'; g.fillText(Math.round(p * 100) + '%', rx + 420, y + 4); g.textAlign = 'left';
      g.fillStyle = '#e6dcc5'; g.fillRect(rx, y + 14, 330, 14); g.fillStyle = COL[m]; g.fillRect(rx, y + 14, 330 * p, 14);
      g.fillStyle = C.navy; g.fillRect(rx + 330 * obs - 1.5, y + 10, 3, 22);
      g.font = '500 12px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText(`chance to hit ${tgt}+; the tick is ${n} rolls so far (${Math.round(obs * 100)}%)`, rx, y + 46);
    });
  }

  const DUR = 24;
  const tourTgt = t => { const u = (t % DUR) / DUR; return Math.round(2 + 18 * (u < .5 ? u * 2 : 2 - u * 2)); };
  const scenes = {};
  canvasDemo('adv', (s, cv, g) => {
    const st = { t: 0, tour: true, held: false, mode: 'adv', key: '' };
    const rng = $(s, '.dd-t'), segs = $$(s, '.dd-mode .btn'), tourBtn = $(s, '.dd-tour');
    const setMode = m => { st.mode = m; segs.forEach(b => b.classList.toggle('on', b.dataset.m === m)); };
    segs.forEach(b => b.onclick = () => setMode(b.dataset.m));
    rng.oninput = () => { st.tour = false; tourBtn.classList.remove('on'); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    function frame(t) {
      const tgt = st.tour ? tourTgt(t) : +rng.value; if (st.tour) rng.value = tgt;
      $(s, '.dd-tv').textContent = tgt + '+';
      const n = 1 + Math.floor(t / .8);
      draw(g, tgt, st.mode, n, t);
      const key = [tgt, st.mode].join(); if (key === st.key) return; st.key = key;
      say($(s, '.dd-stats'), `<div class="y"><b>+${worth(tgt).toFixed(1)}</b><span>what Advantage is worth at ${tgt}+</span></div>`);
      say($(s, '.dd-out'), worth(tgt) > 4.5 ? 'In the middle of the range Advantage is worth almost +5: the rule of thumb holds here.' : worth(tgt) > 2 ? `Away from the middle it fades: +${worth(tgt).toFixed(1)} here, not +5.` : 'Near the ends it is worth much less. When you need a 19, two dice barely help; when you need a 3, you were hitting anyway.');
    }
    scenes.adv = { seek(t) { st.held = true; st.tour = true; frame(t); }, dur: () => DUR };
    return dt => { if (st.held) return; st.t += Math.max(0, dt); frame(st.t); };
  });
  window.__seek = (t, which = 'adv') => scenes[which].seek(t);
  window.__dur = (which = 'adv') => scenes[which].dur();
})();
