/* Module 0, slides 59-62: identify the target audience on three dials (Theme light-dark, Pace slow-fast,
   Combat gentle-harsh), then follow the notes' chain from audience to insight to fantasy for Stardew Valley,
   Dark Souls and Hades. Other games sit on the same axes so neighbouring games show a shared audience.
   Dial positions are read by eye, not measured; they are in one table (GAMES) to adjust. */
(function () {
  const { $, $$, say } = FPF.kit;
  const C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const { txt, wrap, box } = SCENE;
  const W = 1040, H = 585;
  // [name, theme 0 light-1 dark, pace 0 slow-1 fast, combat 0 gentle-1 harsh]
  const GAMES = [
    ['Stardew Valley', .12, .18, .12], ['Dark Souls', .92, .5, .95], ['Hades', .62, .88, .72],
    ['Animal Crossing', .04, .08, .02], ['Kirby', .1, .5, .22], ['Super Mario World', .16, .7, .38], ['Pokémon', .25, .32, .3],
    ['DOOM Eternal', .86, .98, .86], ['World of Warcraft', .5, .45, .5],
  ];
  const CHAIN = {
    'Stardew Valley': { aud: 'Burned-out adults who loved Harvest Moon as kids.', ins: 'They want the farm without the pressure: no fail state, no clock that punishes them.', fan: '“Permission to slow down.”', viz: ['Days end, but nothing is lost when they do', 'Combat is optional, in the mines', 'The town asks for nothing urgent'] },
    'Dark Souls': { aud: 'Players who felt modern games had become “condescending”.', ins: 'They want to be trusted to fail and to learn.', fan: '“You are a nobody in a hostile world that owes you nothing.”', viz: ['No difficulty settings', 'Cryptic item text', 'Bonfires that punish carelessness'] },
    'Hades': { aud: 'Players who bounced off roguelikes because “permadeath felt punishing”.', ins: 'Keep the run, take the sting out of losing it.', fan: '“Every death advances the story.”', viz: ['Dying sends you home to new dialogue', 'Upgrades persist between runs', 'God Mode for players who want it'] },
  };
  const PRESETS = ['Stardew Valley', 'Dark Souls', 'Hades'];
  const AX = [['Theme', 'Light', 'Dark'], ['Pace', 'Slow', 'Fast'], ['Combat', 'Gentle', 'Harsh']];
  const DUR = 21;
  function tourVals(t) {
    const P = PRESETS.map(n => GAMES.find(g => g[0] === n).slice(1));
    const seg = Math.min(2, Math.floor(t / 6)), k = ease(clamp((t - seg * 6) / 1.2));
    if (t >= 18) { const q = (t - 18) / 3; return [lerp(P[2][0], .05, ease(clamp(q * 2))), lerp(P[2][1], .1, ease(clamp(q * 2))), lerp(P[2][2], .02, ease(clamp(q * 2)))]; }
    const from = seg ? P[seg - 1] : P[0];
    return from.map((v, i) => lerp(v, P[seg][i], k));
  }
  const nearest = v => GAMES.map(g => [g[0], Math.hypot(g[1] - v[0], g[2] - v[1], g[3] - v[2])]).sort((a, b) => a[1] - b[1]);
  const combatCol = c => `rgb(${Math.round(lerp(46, 229, c))},${Math.round(lerp(163, 50, c))},${Math.round(lerp(220, 45, c))})`;

  function draw(g, st, t) {
    SCENE.paper(g, W, H);
    const v = st.tour ? tourVals(t) : st.v;
    // the three dials
    AX.forEach(([n, lo, hi], i) => {
      const x = 30, y = 40 + i * 62, w = 450;
      txt(g, n, x, y, { size: 16 });
      const tx = x + 92, tw = w - 92;
      const grad = g.createLinearGradient(tx, 0, tx + tw, 0);
      grad.addColorStop(0, ['#fff3c4', '#cfe9f7', '#d8f0df'][i]); grad.addColorStop(1, ['#3d4270', '#e5322d', '#a8201c'][i]);
      g.fillStyle = grad; g.beginPath(); g.roundRect(tx, y - 12, tw, 14, 7); g.fill();
      txt(g, lo, tx, y + 22, { size: 12, font: 'b', w: 600, col: C.muted }); txt(g, hi, tx + tw, y + 22, { size: 12, font: 'b', w: 600, col: C.muted, align: 'right' });
      const kx = tx + v[i] * tw;
      g.fillStyle = '#fff'; g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.arc(kx, y - 5, 12, 0, TAU); g.fill(); g.stroke();
    });
    // scatter: theme across, pace up, colour and size for combat
    const px = 50, py = 238, pw = 440, ph = 320;
    box(g, px, py, pw, ph, { fill: '#f4ecda', stroke: '#cdbf9f' });
    txt(g, 'Theme →', px + pw - 6, py + ph - 8, { size: 12, align: 'right', col: C.muted });
    g.save(); g.translate(px + 14, py + 10); g.rotate(-Math.PI / 2); txt(g, 'Pace →', 0, 0, { size: 12, align: 'right', col: C.muted, base: 'top' }); g.restore();
    const pos = (a, b) => [px + 30 + a * (pw - 60), py + ph - 30 - b * (ph - 60)];
    const near = nearest(v).slice(0, 3).map(n => n[0]);
    GAMES.forEach(([n, a, b, c]) => {
      const [x, y] = pos(a, b), on = near.includes(n);
      g.fillStyle = combatCol(c); g.globalAlpha = on ? 1 : .45; g.beginPath(); g.arc(x, y, 8 + c * 8, 0, TAU); g.fill(); g.globalAlpha = 1;
      if (on) { g.strokeStyle = C.navy; g.lineWidth = 2.5; g.stroke(); }
      const L = a > .7; txt(g, n, x + (L ? -1 : 1) * (14 + c * 8), y + 4, { size: 12.5, col: on ? C.ink : C.muted, w: on ? 800 : 600, align: L ? 'right' : 'left' });
    });
    const [cx, cy] = pos(v[0], v[1]);
    g.strokeStyle = C.navy; g.lineWidth = 2; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(cx, py + 4); g.lineTo(cx, py + ph - 4); g.moveTo(px + 4, cy); g.lineTo(px + pw - 4, cy); g.stroke(); g.setLineDash([]);
    g.fillStyle = C.gold; g.strokeStyle = C.navy; g.lineWidth = 2.5; g.beginPath(); g.arc(cx, cy, 7, 0, TAU); g.fill(); g.stroke();
    // the chain card
    const X = 520, Y = 24, name = nearest(v)[0][1] < .06 && CHAIN[nearest(v)[0][0]] ? nearest(v)[0][0] : null;
    if (name) {
      const ch = CHAIN[name];
      txt(g, name, X, Y + 26, { size: 26 });
      const rows = [['Audience', ch.aud, '#8a4fd6'], ['Insight', ch.ins, '#2ea3dc'], ['Fantasy', ch.fan, '#e0a92d']];
      let y = Y + 46;
      rows.forEach(([k, d, c], i) => {
        box(g, X, y, 496, 78, { fill: '#fffaf0', stroke: c, lw: 2.5 });
        txt(g, k, X + 16, y + 26, { size: 14, col: c });
        wrap(g, d, X + 16, y + 50, 466, { size: 16, lh: 20 });
        y += 78; if (i < 2) { g.fillStyle = C.muted; g.beginPath(); g.moveTo(X + 240, y + 3); g.lineTo(X + 256, y + 3); g.lineTo(X + 248, y + 13); g.fill(); y += 16; }
      });
      y += 18; txt(g, 'What follows from it', X, y, { size: 15, col: C.muted }); y += 8;
      ch.viz.forEach((d, i) => { box(g, X, y + 8 + i * 46, 496, 38, { fill: 'rgba(255,250,240,.7)', stroke: '#cdbf9f' }); txt(g, d, X + 16, y + 33 + i * 46, { size: 15, font: 'b', w: 600 }); });
    } else {
      txt(g, 'Who is this for?', X, Y + 26, { size: 26 });
      wrap(g, 'No preset sits here. The closest games share some of this audience:', X, Y + 60, 490, { size: 16 });
      nearest(v).slice(0, 4).forEach(([n, d], i) => {
        const y = Y + 100 + i * 62, k = clamp(1 - d / 1.2);
        box(g, X, y, 496, 50, { fill: '#fffaf0', stroke: '#cdbf9f' });
        txt(g, n, X + 16, y + 31, { size: 16 });
        g.fillStyle = '#e6dcc5'; g.fillRect(X + 230, y + 20, 240, 10); g.fillStyle = C.player; g.fillRect(X + 230, y + 20, 240 * k, 10);
      });
      wrap(g, 'Many developers skip this step and rush to the game concept first. Start here instead: the audience decides the insight, and the insight decides the fantasy.', X, Y + 370, 490, { size: 15, col: C.muted });
    }
  }
  SCENE('dials', {
    dur: DUR,
    init(st) {
      st.v = GAMES[0].slice(1);
      const rs = $$(st.s, '.ad-dial input'), outs = $$(st.s, '.ad-dial b'), pb = $$(st.s, '.ad-pre .btn');
      st.sync = () => { rs.forEach((r, i) => { r.value = Math.round(st.v[i] * 100); outs[i].textContent = r.value; }); };
      rs.forEach((r, i) => r.oninput = () => { st.manual(); st.v[i] = r.value / 100; outs[i].textContent = r.value; pb.forEach(b => b.classList.remove('on')); });
      pb.forEach(b => b.onclick = () => { st.manual(); st.v = GAMES.find(x => x[0] === b.dataset.g).slice(1); st.sync(); pb.forEach(x => x.classList.toggle('on', x === b)); });
      st.sync();
    },
    side(st, t) {
      if (!st.tour) return;
      const v = tourVals(t), rs = $$(st.s, '.ad-dial input'), outs = $$(st.s, '.ad-dial b');
      rs.forEach((r, i) => { r.value = Math.round(v[i] * 100); outs[i].textContent = r.value; });
      const n = nearest(v)[0];
      $$(st.s, '.ad-pre .btn').forEach(b => b.classList.toggle('on', n[1] < .06 && b.dataset.g === n[0]));
    },
    draw,
  });
})();
