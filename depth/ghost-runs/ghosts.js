/* Ghost runs (MGM C4 M1, deck slides 77-78). Sixty attempts at one small level, played back at once like Super Meat
   Boy's death replay or Trackmania ghosts. Three filters are the three tiers: every attempt (possibility space), one
   ghost per distinct route (differentiated depth), and only routes that reach the flag (relevant depth). Attempts come
   from GHOST.run(seed) in level.js; a route is the list of surfaces an attempt landed on plus how it ended. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp } = TD, { LV, run } = GHOST;
  const W = 1040, H = 585, OX = 20, OY = 100, N = 60;
  const RUNS = Array.from({ length: N }, (_, i) => run(i + 1));
  const NAMES = { start: 'start', mid: 'middle', end: 'far ground', ledge: 'ledge', high: 'bridge' };
  RUNS.forEach(r => { r.key = r.end + ':' + r.route.join('>'); });
  const KEYS = [...new Set(RUNS.map(r => r.key))];
  const PAL = ['#2ea3dc', '#8a4fd6', '#2fae63', '#e0a92d', '#d6457a', '#1f5fbf', '#7a8a20', '#c26a1a', '#4a9a9a', '#9a4a9a'];
  const FIRST = KEYS.map(k => RUNS.find(r => r.key === k));
  const FLAG = KEYS.filter(k => k.startsWith('flag'));
  const colOf = r => r.end === 'flag' ? PAL[FLAG.indexOf(r.key) % PAL.length] : r.end === 'spikes' ? '#e5322d' : '#8b8fa8';
  const LONG = Math.max(...RUNS.map(r => r.at));

  function pos(r, t) {
    const p = r.pts; if (t >= r.at) return { x: p.at(-1)[1], y: p.at(-1)[2], done: true };
    let i = 1; while (i < p.length && p[i][0] < t) i++;
    const a = p[i - 1], b = p[Math.min(i, p.length - 1)], k = b[0] > a[0] ? (t - a[0]) / (b[0] - a[0]) : 0;
    return { x: lerp(a[1], b[1], k), y: lerp(a[2], b[2], k), done: false };
  }
  function level(g) {
    g.fillStyle = '#e9e1cf'; g.fillRect(OX, OY - 10, LV.w, LV.h + 40);
    // pits
    g.fillStyle = '#2a2e55'; g.fillRect(OX, OY + 400, LV.w, LV.h + 30 - 400);
    T.use(g);
    LV.solids.forEach(([x0, x1, y, id]) => {
      if (y >= 400) T.wall(OX + x0, OY + y, x1 - x0, LV.h + 30 - y);
      else { T.wall(OX + x0, OY + y, x1 - x0, 16); }
    });
    LV.spikes.forEach(([x0, x1, y]) => {
      g.fillStyle = '#e5322d'; g.strokeStyle = '#a8201c'; g.lineWidth = 1.5;
      for (let x = x0; x < x1; x += 12) { g.beginPath(); g.moveTo(OX + x, OY + y); g.lineTo(OX + x + 6, OY + y - 16); g.lineTo(OX + x + 12, OY + y); g.closePath(); g.fill(); g.stroke(); }
    });
    // flag
    const fx = OX + LV.flag + 20; g.strokeStyle = C.navy; g.lineWidth = 4; g.beginPath(); g.moveTo(fx, OY + 400); g.lineTo(fx, OY + 300); g.stroke();
    g.fillStyle = '#ffb951'; g.beginPath(); g.moveTo(fx, OY + 300); g.lineTo(fx + 36, OY + 314); g.lineTo(fx, OY + 328); g.closePath(); g.fill();
  }
  function trail(g, r, t, col, a, w) {
    g.save(); g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = w; g.lineJoin = g.lineCap = 'round';
    g.beginPath(); let first = true;
    for (const [pt, x, y] of r.pts) { if (pt > t) break; first ? g.moveTo(OX + x, OY + y - 12) : g.lineTo(OX + x, OY + y - 12); first = false; }
    const p = pos(r, t); g.lineTo(OX + p.x, OY + p.y - 12); g.stroke(); g.restore();
  }
  function ghost(g, r, t, col, a) {
    const p = pos(r, t), x = OX + p.x, y = OY + Math.min(p.y, LV.h + 20) - 12;
    g.save(); g.globalAlpha = a;
    if (p.done && r.end !== 'flag') {   // splat
      g.strokeStyle = r.end === 'spikes' ? '#a8201c' : '#62688a'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(x - 7, y - 7); g.lineTo(x + 7, y + 7); g.moveTo(x + 7, y - 7); g.lineTo(x - 7, y + 7); g.stroke();
    } else {
      g.fillStyle = col; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.roundRect(x - 9, y - 9, 18, 18, 4); g.fill(); g.stroke();
    }
    g.restore();
  }
  const MODES = [
    ['all', 'Every attempt', 'possibility space'],
    ['distinct', 'One per distinct route', 'differentiated depth'],
    ['flag', 'Routes that reach the flag', 'relevant depth'],
  ];

  const DUR = 16;
  let api;
  canvasDemo('ghosts', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, mode: 'all', key: '' };
    const tourBtn = $(s, '.gh-tour');
    $$(s, '.gh-mode .btn').forEach(b => b.onclick = () => { st.tour = false; tourBtn.classList.remove('on'); st.mode = b.dataset.m; });
    $(s, '.gh-replay').onclick = () => { st.tour = false; tourBtn.classList.remove('on'); st.t = 0; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    function render() {
      let mode = st.mode, t = st.t;
      if (st.tour) { mode = st.t < 6.5 ? 'all' : st.t < 11 ? 'distinct' : 'flag'; t = Math.min(st.t, LONG); }
      $$(s, '.gh-mode .btn').forEach(b => b.classList.toggle('on', b.dataset.m === mode));
      const show = mode === 'all' ? RUNS : mode === 'distinct' ? FIRST : FIRST.filter(r => r.end === 'flag');
      T.use(g); g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,252,244,.8)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
      level(g);
      const thick = mode !== 'all';
      show.forEach(r => trail(g, r, t, colOf(r), thick ? .85 : .25, thick ? 5 : 2));
      show.forEach(r => ghost(g, r, t, colOf(r), thick ? 1 : .7));
      const m = MODES.find(x => x[0] === mode);
      g.font = '800 22px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText(`${m[1]}: ${show.length}`, 24, 34);
      g.font = '600 16px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText(`the ${m[2]} of this level`, 24, 62);
      // legend
      if (mode !== 'all') {
        let y = 34; g.textAlign = 'right';
        show.slice(0, 7).forEach(r => {
          g.fillStyle = colOf(r); g.fillRect(1010, y - 7, 14, 14);
          g.fillStyle = C.ink; g.font = '600 13px Jost, sans-serif';
          g.fillText(r.route.map(x => NAMES[x]).join(' → ') + (r.end === 'flag' ? ' → flag' : r.end === 'spikes' ? ' → spikes' : ' → pit'), 1000, y);
          y += 19;
        });
        if (show.length > 7) { g.fillStyle = C.muted; g.fillText(`+ ${show.length - 7} more`, 1000, y); }
      }
      const key = mode; if (key === st.key) return; st.key = key;
      const nFlag = RUNS.filter(r => r.end === 'flag').length;
      say($(s, '.gh-stats'), `<div class="${mode === 'all' ? '' : 'g'}"><b>${N}</b><span>attempts (possibility space)</span></div><div class="${mode === 'distinct' ? '' : 'g'}" style="border-left-color:#e0a92d"><b>${KEYS.length}</b><span>distinct routes (differentiated)</span></div><div class="y"><b>${FLAG.length}</b><span>routes that reach the flag (relevant), taken by ${nFlag} attempts</span></div>`);
      say($(s, '.gh-out'), mode === 'all'
        ? 'Every attempt overlaid: the whole cloud is the level’s possibility space. Most of it ends in a pit or on the spikes.'
        : mode === 'distinct'
          ? `Many attempts are the same route with a slightly different jump. Collapse those together and ${N} attempts become ${KEYS.length} distinct routes.`
          : `Only ${FLAG.length} routes reach the flag: under the ledge, over the bridge, or ledge then bridge. That is the depth a player actually uses.`);
    }
    api = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; if (!st.tour && st.t > LONG + 2) st.t = 0; render(); };
  });
  window.__seek = t => api.seek(t);
  window.__dur = () => api.dur();
})();
