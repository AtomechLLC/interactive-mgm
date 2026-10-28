/* Additive vs multiplicative (MGM C4 M1, deck slides 111-115), Breath of the Wild's own example. Each build step adds one
   thing to each side. Left: one more one-handed sword (base damage from the game); it does the same four things to the
   world as every other sword, so the kinds of interaction stay flat. Right: one more chemistry system; it reacts with
   systems already in the world, so interactions climb. REACT lists every pair that does something; anything missing
   does nothing. The reactions are simplified from the game's chemistry engine. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, MAX = 9, STEP = 1.7;
  const SWORDS = [['Traveler’s Sword', 5], ['Rusty Broadsword', 6], ['Soldier’s Broadsword', 14], ['Feathered Edge', 15], ['Knight’s Broadsword', 26], ['Master Sword', 30], ['Royal Broadsword', 36], ['Royal Guard’s Sword', 48], ['Eightfold Blade', 15]];
  const DOES = ['damages enemies', 'breaks crates', 'cuts grass', 'chips ore'];
  const SYS = [['Fire', '#e5622d'], ['Wood', '#9a6a3a'], ['Wind', '#5aaecf'], ['Metal', '#6a7488'], ['Electricity', '#e0b020'], ['Water', '#2e72d6'], ['Ice', '#8fd3ff'], ['Grass', '#3d9a4a'], ['Bombs', '#262c6a']];
  const SYS_ICON = { Fire: 'small-fire', Wood: 'log', Wind: 'whirlwind', Metal: 'metal-bar', Electricity: 'lightning-helix', Water: 'drop', Ice: 'ice-cube', Grass: 'grass', Bombs: 'unlit-bomb' };   // game-icons.net
  const REACT = {
    'Fire+Wood': 'wood burns', 'Fire+Wind': 'wind spreads fire', 'Wood+Wind': 'wind pushes light wood',
    'Electricity+Metal': 'metal conducts', 'Fire+Water': 'water puts fire out', 'Wood+Water': 'wood floats',
    'Metal+Water': 'metal sinks', 'Electricity+Water': 'water spreads the shock', 'Fire+Ice': 'fire melts ice',
    'Water+Ice': 'ice freezes water into a platform', 'Fire+Grass': 'grass burns and lifts an updraft',
    'Fire+Bombs': 'fire sets bombs off', 'Wood+Bombs': 'bombs break wood', 'Ice+Bombs': 'bombs shatter ice',
  };
  const pairs = n => { const out = []; for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) { const k = `${SYS[j][0]}+${SYS[i][0]}`, k2 = `${SYS[i][0]}+${SYS[j][0]}`; const r = REACT[k] || REACT[k2]; if (r) out.push({ i, j, r, at: i }); } return out; };
  const multi = n => pairs(n).length, add = n => n ? DOES.length : 0;

  function chart(g, x0, y0, w, h, n) {
    const ymax = 15;
    g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0 - h); g.lineTo(x0, y0); g.lineTo(x0 + w, y0); g.stroke();
    const X = k => x0 + w * (k - 1) / (MAX - 1), Y = v => y0 - h * v / ymax;
    [['#c26a1a', add, 'Additive: kinds of interaction'], ['#2e72d6', multi, 'Multiplicative: interactions']].forEach(([col, f, name], li) => {
      g.strokeStyle = col; g.lineWidth = 3.5; g.beginPath();
      for (let k = 1; k <= n; k++) k === 1 ? g.moveTo(X(k), Y(f(k))) : g.lineTo(X(k), Y(f(k))); g.stroke();
      for (let k = 1; k <= n; k++) { g.fillStyle = col; g.beginPath(); g.arc(X(k), Y(f(k)), 4.5, 0, 7); g.fill(); }
      g.fillStyle = col; g.fillRect(x0 + 10, y0 - h - 6 + li * 20, 12, 12);
      g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(name, x0 + 28, y0 - h + li * 20);
    });
    g.font = '600 12px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'center';
    for (let k = 1; k <= MAX; k++) g.fillText(k, X(k), y0 + 14);
    g.fillText('things built', x0 + w / 2, y0 + 32);
  }

  let api;
  canvasDemo('additive', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, n: 1, key: '', mx: null };
    const tourBtn = $(s, '.ad-tour');
    const free = () => { st.tour = false; tourBtn.classList.remove('on'); };
    $(s, '.ad-add').onclick = () => { free(); st.n = Math.min(MAX, st.n + 1); st.flash = st.t; };
    $(s, '.ad-reset').onclick = () => { free(); st.n = 1; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    cv.addEventListener('mousemove', e => { const r = cv.getBoundingClientRect(); st.mx = (e.clientX - r.left) * W / r.width; st.my = (e.clientY - r.top) * H / r.height; });
    cv.addEventListener('mouseleave', () => { st.mx = null; });
    function render() {
      let n = st.n, since = 9;
      if (st.tour) { n = clamp(Math.floor(st.t / STEP) + 1, 1, MAX); since = st.t - (n - 1) * STEP; }
      T.use(g); g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,252,244,.8)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
      g.strokeStyle = '#e3d8bf'; g.lineWidth = 2; g.beginPath(); g.moveTo(500, 20); g.lineTo(500, H - 20); g.stroke();
      // left: swords
      g.font = '800 20px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText('Adding content: one more sword', 24, 30);
      g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText('base damage from Breath of the Wild', 24, 52);
      SWORDS.slice(0, n).forEach(([name, dmg], i) => {
        const y = 80 + i * 26, fresh = i === n - 1 && since < 1;
        g.globalAlpha = fresh ? clamp(since / .3) : 1;
        g.font = '700 14px Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'left'; g.fillText(name, 24, y);
        g.font = '800 14px Montserrat, Jost, sans-serif'; g.textAlign = 'right'; g.fillText(dmg, 196, y);
        DOES.forEach((d, j) => { g.fillStyle = '#f3e3c4'; g.beginPath(); g.roundRect(206 + j * 70, y - 9, 64, 18, 5); g.fill(); g.font = '600 10px Jost, sans-serif'; g.fillStyle = '#7a4a00'; g.textAlign = 'center'; g.fillText(d.split(' ')[0], 238 + j * 70, y + 1); });
        g.globalAlpha = 1;
      });
      chart(g, 50, 548, 410, 210, n);
      // right: chemistry web
      g.font = '800 20px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'left'; g.fillText('Multiplying interactions: one more system', 520, 30);
      g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText('the chemistry engine, simplified', 520, 52);
      const cx = 770, cy = 320, R = 200, P = SYS.map((_, i) => [cx + R * Math.cos(-Math.PI / 2 + i * 2 * Math.PI / MAX), cy + R * Math.sin(-Math.PI / 2 + i * 2 * Math.PI / MAX)]);
      let hover = null;
      pairs(n).forEach(p => {
        const [a, b] = [P[p.i], P[p.j]], fresh = p.at === n - 1 && since < 1.2;
        g.strokeStyle = fresh ? '#ffb951' : 'rgba(46,114,214,.55)'; g.lineWidth = fresh ? 6 : 3.5;
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
        if (st.mx != null) { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; if (Math.hypot(st.mx - mx, st.my - my) < 22) hover = { x: mx, y: my, r: p.r }; }
      });
      SYS.forEach(([name, col], i) => {
        const [x, y] = P[i], on = i < n;
        g.globalAlpha = on ? 1 : .18; g.fillStyle = col; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 24, 0, 7); g.fill(); g.stroke();
        GI.draw(g, SYS_ICON[name], x, y, 32, name === 'Ice' ? C.navy : '#fff');
        g.font = '700 14px Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'center'; g.fillText(name, x, y + (y > cy ? 38 : -36)); g.globalAlpha = 1;
      });
      // the newest reactions, as labels on the fresh edges
      if (since < 1.6) pairs(n).filter(p => p.at === n - 1).forEach(p => { const [a, b] = [P[p.i], P[p.j]]; T.label(p.r, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 'center', C.ink, 13); });
      if (hover) T.label(hover.r, hover.x, hover.y, 'center', C.ink, 14);
      // tallies
      g.font = '800 34px Montserrat, Jost, sans-serif'; g.textAlign = 'left'; g.fillStyle = '#c26a1a'; g.fillText(add(n), 400, 30 + 0);
      g.font = '800 34px Montserrat, Jost, sans-serif'; g.textAlign = 'right'; g.fillStyle = '#2e72d6'; g.fillText(multi(n), 1016, 560);
      g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText('interactions', 1016, 530); g.textAlign = 'left'; g.fillText('kinds', 400, 54);
      const key = n; if (key === st.key) return; st.key = key;
      const fresh = pairs(n).filter(p => p.at === n - 1).map(p => p.r);
      say($(s, '.ad-stats'), `<div style="border-left-color:#c26a1a"><b>${add(n)}</b><span>kinds of interaction from ${n} sword${n > 1 ? 's' : ''}</span></div><div style="border-left-color:#2e72d6"><b>${multi(n)}</b><span>interactions between ${n} system${n > 1 ? 's' : ''}</span></div>`);
      say($(s, '.ad-out'), n === 1
        ? 'One sword already does four things. One chemistry system on its own does nothing yet.'
        : `Added ${SWORDS[n - 1][0]}: the same four things, with ${SWORDS[n - 1][1]} damage. Added ${SYS[n - 1][0]}: ${fresh.length ? fresh.join('; ') : 'nothing new yet'}.`);
    }
    api = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => MAX * STEP + 3 };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > MAX * STEP + 3) st.t = 0; render(); };
  });
  window.__seek = t => api.seek(t);
  window.__dur = () => api.dur();
})();
