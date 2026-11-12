/* Survive the drought (genre breakdown: "How to Make a Game Like World of Warcraft?"), slide 2: playable.
   Slide 1 shows that launch is the start of a service. Here the learner plays one subscriber's year, a week at a time,
   under one of two plans for the same live team:
     raid-only plan:   everyone builds raids; a big new raid tier every 16 weeks, and nothing else is refreshed.
     systems plan:     half the team builds systems that make old content worth repeating (PvP seasons every 8 weeks,
                       a weekly dungeon affix), so each raid tier is smaller.
   Each week the learner picks one activity. It adds its current novelty to interest; playing it uses some of that
   novelty up, and only patches, seasons and affixes bring it back. Interest drains 3.3 a week; at 0 the player
   unsubscribes. On the raid-only plan, playing whatever is freshest quits in week 48: the learner has to ration the
   raid to last the droughts. On the systems plan the same habit lasts the year, but patch weeks peak lower. The
   walk-through plays the freshest activity every week on the raid-only plan. All values are illustrative. */
(function () {
  const PLANS = {
    raid: { label: 'raid-only plan', raid: 8, dcap: 3.5, drest: .5, season: 0 },
    sys: { label: 'systems plan', raid: 5, dcap: 4, drest: 1, season: 8 },
  };
  const ACTS = [
    { k: 'raid', name: 'Raid', decay: .72 },
    { k: 'dung', name: 'Dungeons', decay: .6 },
    { k: 'alt', name: 'Level an alt', decay: .88 },
    { k: 'pvp', name: 'PvP', decay: .7 },
  ];
  const WEEKS = 52, TIER = 16, DRAIN = 3.3, IMAX = 24, I0 = 12;
  const COL = { raid: '#c0392b', dung: '#2e86c1', alt: '#27ae60', pvp: '#8e44ad' };

  function newYear(plan) {
    const P = PLANS[plan];
    return { plan, P, w: 0, I: I0, n: { raid: 0, dung: P.dcap, alt: 5, pvp: P.season ? 4.5 : 3 }, hist: [], fun: 0, state: 'run', peak: 0 };
  }
  // the start of week w: patches and seasons land
  function weekStart(Y) { const P = Y.P; if (Y.w % TIER === 0) Y.n.raid = P.raid; if (P.season && Y.w % P.season === 0) Y.n.pvp = 4.5; }
  function play(Y, k) {
    if (Y.state !== 'run') return;
    const a = ACTS.find(x => x.k === k), g = Y.n[k];
    Y.I = Math.min(IMAX, Y.I + g - DRAIN); Y.fun += g; Y.peak = Math.max(Y.peak, g);
    Y.hist.push({ k, g, I: Y.I });
    Y.n[k] *= a.decay;
    if (k !== 'dung') Y.n.dung = Math.min(Y.P.dcap, Y.n.dung + Y.P.drest);
    Y.w++;
    if (Y.I <= 0) { Y.state = 'quit'; return; }
    if (Y.w >= WEEKS) { Y.state = 'done'; return; }
    weekStart(Y);
  }
  const freshest = Y => ACTS.reduce((a, b) => Y.n[a.k] >= Y.n[b.k] ? a : b).k;

  if (typeof GK === 'undefined') { module.exports = { newYear, weekStart, play, freshest, PLANS }; return; }

  GK.scene('year', (s, g, ui) => {
    const C = TD.C, cv = s.querySelector('canvas'), playBtns = [...s.querySelectorAll('.yr-play .btn')];
    const st = { mode: 'tour', Y: null, res: { raid: [], sys: [] }, hover: -1 };
    const CARD = i => ({ x: 30 + i * 248, y: 330, w: 232, h: 230 });
    const toCanvas = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
    const cardAt = ([x, y]) => ACTS.findIndex((_, i) => { const c = CARD(i); return x > c.x && x < c.x + c.w && y > c.y && y < c.y + c.h; });
    const choose = i => { const Y = st.Y; if (st.mode !== 'play' || !Y || Y.state !== 'run' || i < 0) return; play(Y, ACTS[i].k); if (Y.state !== 'run') st.res[Y.plan].push({ weeks: Y.state === 'quit' ? Y.w : WEEKS, fun: Y.fun, peak: Y.peak }); };
    cv.addEventListener('pointerdown', e => { if (st.mode === 'play') { e.preventDefault(); choose(cardAt(toCanvas(e))); } });
    cv.addEventListener('pointermove', e => { st.hover = cardAt(toCanvas(e)); });
    document.addEventListener('keydown', e => { if (!s.classList.contains('active') || st.mode !== 'play') return; const i = '1234'.indexOf(e.key); if (i >= 0) { e.preventDefault(); e.stopPropagation(); choose(i); } }, true);
    playBtns.forEach(b => b.onclick = () => { ui.stopTour(); st.mode = 'play'; st.Y = newYear(b.dataset.p); weekStart(st.Y); });
    ui.watch(playBtns);
    // walk-through: the freshest activity every week on the raid-only plan, one week every 0.3 s
    const STEP = .3;
    const TOUR = (() => { const Y = newYear('raid'); weekStart(Y); const fr = [snap(Y)]; while (Y.state === 'run') { play(Y, freshest(Y)); fr.push(snap(Y)); } return fr; })();
    function snap(Y) { return { plan: Y.plan, P: Y.P, w: Y.w, I: Y.I, n: { ...Y.n }, hist: Y.hist.slice(), fun: Y.fun, state: Y.state, peak: Y.peak }; }

    return {
      dur: TOUR.length * STEP + 3,
      frame(t, tour) {
        if (tour && st.mode !== 'tour') st.mode = 'tour';
        const Y = st.mode === 'tour' ? TOUR[Math.min(TOUR.length - 1, Math.floor(t / STEP))] : st.Y, P = Y.P;
        GK.panel(g);
        GK.head(g, `${st.mode === 'tour' ? 'Walk-through: always play the freshest thing' : 'Your year'} · ${P.label} · week ${Y.state === 'run' ? Y.w + 1 : Y.hist.length} of ${WEEKS}`, 20, 28);
        // interest over the year
        const gx = 70, gw = 940, gy = 60, gh = 170, X = w => gx + gw * w / WEEKS, Yv = v => gy + gh - gh * v / IMAX;
        g.fillStyle = '#fffaf0'; g.fillRect(gx, gy, gw, gh); g.strokeStyle = '#cdbf9f'; g.lineWidth = 1; g.strokeRect(gx, gy, gw, gh);
        for (let w = 0; w < WEEKS; w += TIER) { g.fillStyle = 'rgba(192,57,43,.12)'; g.fillRect(X(w), gy, X(w + 1) - X(w), gh); GK.text(g, 'new raid tier', X(w) + 4, gy + 14, '#a03024', 11, 'left', 800); }
        if (P.season) for (let w = 0; w < WEEKS; w += P.season) { g.strokeStyle = 'rgba(142,68,173,.6)'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(X(w), gy + 18); g.lineTo(X(w), gy + gh); g.stroke(); g.setLineDash([]); if (w % TIER) GK.text(g, 'PvP season', X(w) + 4, gy + 30, '#6c3483', 11, 'left', 800); }
        GK.text(g, 'interest', gx - 8, gy + 10, C.muted, 12, 'right', 800); GK.text(g, 'quits', gx - 8, gy + gh, C.redDk, 12, 'right', 800);
        g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.moveTo(X(0), Yv(I0)); Y.hist.forEach((h, i) => g.lineTo(X(i + 1), Yv(Math.max(0, h.I)))); g.stroke();
        // what each week was spent on
        Y.hist.forEach((h, i) => { g.fillStyle = COL[h.k]; g.fillRect(X(i) + 1, gy + gh + 6, X(i + 1) - X(i) - 2, 14); });
        GK.text(g, 'week 1', gx, gy + gh + 36, C.muted, 11, 'left', 800); GK.text(g, 'week 52', gx + gw, gy + gh + 36, C.muted, 11, 'right', 800);
        // interest now
        GK.text(g, `interest ${Math.max(0, Y.I).toFixed(1)} of ${IMAX} · drains ${DRAIN} a week`, 1020, 28, Y.I > 6 ? C.ink : C.redDk, 14, 'right', 800);
        // the four choices
        GK.text(g, st.mode === 'play' && Y.state === 'run' ? 'Pick this week\'s activity: click a card or press 1 to 4' : 'This week\'s activities: the bar is how much fun one more week of it adds', 30, 314, C.ink, 14, 'left', 1000);
        ACTS.forEach((a, i) => {
          const c = CARD(i), v = Y.n[a.k], hot = st.mode === 'play' && st.hover === i && Y.state === 'run';
          GK.box(g, c.x, c.y, c.w, c.h, hot ? '#fff3d6' : '#fffaf0', hot ? C.gold : '#cdbf9f', 10, hot ? 3 : 2);
          g.fillStyle = COL[a.k]; g.fillRect(c.x, c.y, 8, c.h);
          GK.head(g, `${i + 1}  ${a.name}`, c.x + 20, c.y + 30, 'left', C.ink, 17);
          const rule = { raid: `A new tier every ${TIER} weeks (fun ${P.raid}). Each week in it uses up 28%.`, dung: P.season ? `Weekly affix: +1 a week you don't run them, up to ${P.dcap}. Each run uses up 40%.` : `Recovers +0.5 a week you don't run them, up to ${P.dcap}. Each run uses up 40%.`, alt: 'Once a year. Each week levelling uses up 12%.', pvp: P.season ? `A new season every ${P.season} weeks resets it to 4.5. Each week uses up 30%.` : 'No seasons: once it is spent, it stays spent. Each week uses up 30%.' }[a.k];
          GK.wrap ? GK.wrap(g, rule, c.x + 20, c.y + 56, c.w - 34, 17, C.muted, 13) : GK.text(g, rule, c.x + 20, c.y + 56, C.muted, 12, 'left', c.w - 30);
          const bw = c.w - 40, by = c.y + c.h - 52;
          g.fillStyle = '#ece3cf'; g.fillRect(c.x + 20, by, bw, 18); g.fillStyle = COL[a.k]; g.fillRect(c.x + 20, by, bw * Math.min(1, v / 8), 18);
          g.strokeStyle = C.navy; g.lineWidth = 2; const dx = c.x + 20 + bw * DRAIN / 8; g.beginPath(); g.moveTo(dx, by - 4); g.lineTo(dx, by + 22); g.stroke();
          GK.text(g, `fun ${v.toFixed(1)}`, c.x + 20, by + 40, v >= DRAIN ? C.good : C.redDk, 14, 'left', 800);
          GK.text(g, `drain ${DRAIN}`, dx, by + 40, C.navy, 11, 'center', 800);
        });
        if (Y.state !== 'run') { GK.box(g, 300, 120, 440, 80, 'rgba(21,32,68,.9)', null, 12); GK.head(g, Y.state === 'quit' ? `Unsubscribed in week ${Y.hist.length}` : 'Still subscribed after 52 weeks', 520, 156, 'center', Y.state === 'quit' ? '#ff8a80' : C.gold, 22); GK.text(g, `total fun ${Y.fun.toFixed(0)} · best single week ${Y.peak.toFixed(1)}`, 520, 184, '#fff', 14, 'center', 800); }
        // results per plan
        const sum = k => { const r = st.res[k]; if (!r.length) return null; return { n: r.length, weeks: Math.max(...r.map(x => x.weeks)), peak: Math.max(...r.map(x => x.peak)) }; };
        const a = sum('raid'), b = sum('sys'), cell = (x, lab) => `<div><b>${x ? x.weeks + ' wk' : '–'}</b><span>${lab}: your longest year${x ? ` · best week ${x.peak.toFixed(1)}` : ''}</span></div>`;
        ui.stats(cell(a, 'raid-only plan') + cell(b, 'systems plan'));
        ui.out(st.mode === 'tour' ? 'Press a Play button and spend each week on one activity. The bar is how much fun one more week of it adds; anything under the drain line loses interest. Patches and seasons bring things back. Last the year.'
          : a && b ? (b.weeks > a.weeks ? `The systems plan kept you ${b.weeks - a.weeks} weeks longer, though its best week was ${b.peak.toFixed(1)} against ${a.peak.toFixed(1)}. New content brings players back; systems carry them through the gaps.` : a.weeks === WEEKS ? 'You lasted the raid-only year by rationing the raid. That is the work a systems plan does for players who don\'t plan ahead.' : 'Both plans ended at the same week. Look at which weeks fell under the drain line.')
          : 'Play the other plan too, then compare how long you lasted.');
      },
    };
  });
})();
