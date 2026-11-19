/* The map picks the meta (genre breakdown: "Battle Royale Game Design"), a lesson-richness spike for slide 2.
   The same five weapon roles as slide 1 (same damage curves), now weighed against where fights actually happen.
   Each map is a mix of fight distances (log-normal bumps). A fight goes to the weapon with the fastest kill at that
   distance; near-ties split (a soft choice), so a weapon a little behind still wins some fights.
   The learner can boost or cut any weapon's damage, and switch maps. The lesson the page is built to surface: a
   weapon has no balance on its own, only against a map's distance mix; on a map that never offers its range, no damage
   number brings it back. Maps and the soft-choice sharpness are illustrative. */
(function () {
  const C = TD.C, { clamp, lerp } = TD;
  const MAXD = 200;
  const ROLES = [
    ['Shotgun', C.red, 420, 4, 12, .02],
    ['SMG', '#d08a12', 230, 22, 45, .25],
    ['Assault rifle', C.player, 165, 40, 90, .35],
    ['Marksman rifle', C.p2, 120, 70, 150, .55],
    ['Sniper rifle', C.purple, 95, 300, 400, 1],
  ];
  const dps = (r, d, mul) => {
    const [, , base, a, b, keep] = r; let v = base * mul * lerp(1, keep, clamp((d - a) / (b - a)));
    if (r[0] === 'Sniper rifle') v *= lerp(.25, 1, clamp(d / 40)); if (r[0] === 'Marksman rifle') v *= lerp(.6, 1, clamp(d / 25));
    return v;
  };
  // [name, blurb, bumps: [median m, spread (log), weight]]
  const MAPS = {
    town: ['Dense town', 'rooms, alleys, stairwells', [[9, .55, 1]]],
    mixed: ['Mixed island', 'a town, woods and fields', [[5, .5, .2], [30, .4, .25], [70, .4, .25], [140, .35, .3]]],
    open: ['Open fields', 'farmland, hills, little cover', [[30, .4, .08], [105, .4, .92]]],
  };
  function mix(key) {
    const w = []; let sum = 0;
    for (let d = 1; d <= MAXD; d++) {
      let v = 0; for (const [m, s, k] of MAPS[key][2]) { const z = (Math.log(d) - Math.log(m)) / s; v += k * Math.exp(-z * z / 2) / d; }
      w.push(v); sum += v;
    }
    return w.map(v => v / sum);
  }
  const MIX = { town: mix('town'), mixed: mix('mixed'), open: mix('open') };
  const SHARP = 14;   // how strongly players pick the fastest kill; near-ties split
  // baseline rank of each weapon at each distance, all at 100% damage (0 = fastest kill)
  const RANK = [];
  for (let d = 1; d <= MAXD; d++) { const v = ROLES.map(r => dps(r, d, 1)); RANK.push(v.map(x => v.filter(y => y > x).length)); }
  function shares(key, muls) {
    const sh = ROLES.map(() => 0), win = [], away = ROLES.map(() => 0);
    MIX[key].forEach((p, i) => {
      const d = i + 1, v = ROLES.map((r, j) => dps(r, d, muls[j])), top = Math.max(...v);
      const e = v.map(x => Math.exp((x / top - 1) * SHARP)), es = e.reduce((a, b) => a + b, 0);
      e.forEach((x, j) => { sh[j] += p * x / es; if (RANK[i][j] >= 2) away[j] += p * x / es; });
      win.push(v.indexOf(top));
    });
    return { sh, win, away };
  }

  GK.scene('meta', (s, g, ui) => {
    const mapBtns = [...s.querySelectorAll('.mm-map .btn')], wBtns = [...s.querySelectorAll('.mm-w .btn')];
    const mEl = s.querySelector('.mm-mul'), mv = s.querySelector('.mm-mulv'), reset = s.querySelector('.mm-reset');
    const st = { map: 'mixed', w: 1, muls: [1, 1, 1, 1, 1] };
    const sync = () => {
      mapBtns.forEach(b => b.classList.toggle('on', b.dataset.m === st.map));
      wBtns.forEach((b, i) => b.classList.toggle('on', i === st.w));
      mEl.value = Math.round(st.muls[st.w] * 100); mv.textContent = Math.round(st.muls[st.w] * 100) + '%';
    };
    mapBtns.forEach(b => b.onclick = () => { st.map = b.dataset.m; sync(); });
    wBtns.forEach((b, i) => b.onclick = () => { st.w = i; sync(); });
    mEl.oninput = () => { st.muls[st.w] = +mEl.value / 100; sync(); };
    reset.onclick = () => { st.muls = [1, 1, 1, 1, 1]; sync(); };
    ui.watch(mapBtns, wBtns, mEl, reset);
    // walk-through: [map, weapon in focus, its damage %, caption]
    const ACTS = [
      { to: 5, map: 'mixed', w: 1, m: [1, 1, 1, 1, 1], say: 'On the mixed island every role wins a real share of fights.' },
      { to: 10, map: 'open', w: 1, m: [1, 1, 1, 1, 1], say: 'Same five guns, open fields: the shotgun and SMG almost never get a fight they can win.' },
      { to: 15, map: 'open', w: 1, m: [1, 1.3, 1, 1, 1], say: 'Buff the SMG by 30%: 5% of fights becomes 8%. The map never offers the distance it is built for.' },
      { to: 21, map: 'open', w: 1, m: [1, 2, 1, 1, 1], say: 'Double it and the SMG finally shows up, by out-killing the rifles at 100 m. Now it has no role at all.' },
      { to: 26, map: 'town', w: 4, m: [1, 1, 1, 1, 1], say: 'Dense town flips it: the long guns starve.' },
      { to: 32, map: 'mixed', w: 1, m: [1, 1.25, 1, 1, 1], say: 'On the island, a 25% SMG buff takes its new fights from its neighbours, the shotgun and the rifle. The long guns never notice.' },
    ];
    sync();
    return {
      dur: 32,
      frame(t, tour) {
        let say = '';
        if (tour) { const [a] = GK.act(ACTS, t); st.map = a.map; st.w = a.w; st.muls = a.m.slice(); say = a.say; sync(); }
        const { sh, win, away } = shares(st.map, st.muls), mixArr = MIX[st.map];
        GK.panel(g);
        // fight-distance histogram, coloured by the weapon that wins each distance
        const ax = 70, ay = 58, aw = 560, ah = 330;
        GK.head(g, `${MAPS[st.map][0]}: where fights happen (${MAPS[st.map][1]})`, 20, 32);
        const ymax = Math.max(...mixArr.map((p, i) => p / (Math.sqrt(i + 2) - Math.sqrt(i + 1)))) * 1.1;
        const A = GK.axes(g, ax, ay, aw, ah, { x0: 1, x1: Math.sqrt(MAXD), y0: 0, y1: ymax, xt: [1, 5, 10, 25, 50, 100, 200].map(Math.sqrt), yt: [], fmtX: v => Math.round(v * v) + ' m', xl: 'fight distance (square-root scale)' });
        for (let i = 0; i < MAXD - 1; i++) {
          const d = i + 1, x1 = A.sx(Math.sqrt(d)), x2 = A.sx(Math.sqrt(d + 1)), hgt = mixArr[i] / (Math.sqrt(d + 1) - Math.sqrt(d));
          g.fillStyle = ROLES[win[i]][1]; g.globalAlpha = .85; g.fillRect(x1, A.sy(hgt), Math.max(1, x2 - x1 + .5), A.sy(0) - A.sy(hgt)); g.globalAlpha = 1;
        }
        // band labels under the axis
        let from = 0;
        for (let i = 1; i <= MAXD - 1; i++) if (i === MAXD - 1 || win[i] !== win[from]) {
          const xa = A.sx(Math.sqrt(from + 1)), xb = A.sx(Math.sqrt(i + 1)), r = ROLES[win[from]];
          g.fillStyle = r[1]; g.fillRect(xa, ay + ah + 36, xb - xa - 1, 8);
          if (xb - xa > 56) GK.text(g, r[0], (xa + xb) / 2, ay + ah + 58, r[1], 11, 'center', 700);
          from = i;
        }
        GK.text(g, 'fastest kill at each distance', ax, ay + ah + 74, C.muted, 11, 'left', 600);
        // share of fights won
        const bx = 680, bw = 330, by = 58;
        GK.head(g, 'Share of fights each weapon wins', bx, 32);
        const topShare = Math.max(...sh);
        ROLES.forEach((r, j) => {
          if (away[j] > .08 && st.muls[j] > 1) GK.text(g, 'wins other roles’ fights', bx + bw, by + j * 62 + 14, C.goldInk, 11, 'right', 700);
          const y = by + j * 62, v = sh[j], w = bw * v / Math.max(.6, topShare);
          GK.text(g, r[0] + (Math.abs(st.muls[j] - 1) > .001 ? `  (${Math.round(st.muls[j] * 100)}% damage)` : ''), bx, y + 14, C.ink, 13, 'left', 700);
          GK.box(g, bx, y + 22, bw, 22, '#f1e9d6', null, 6);
          g.fillStyle = r[1]; g.beginPath(); g.roundRect(bx, y + 22, Math.max(3, w), 22, 6); g.fill();
          GK.text(g, Math.round(v * 100) + '%', bx + Math.max(3, w) + 6, y + 39, v < .05 ? C.redDk : C.ink, 13, 'left', 800);
          if (v < .05) GK.text(g, 'never gets its fight', bx + bw, y + 14, C.redDk, 11, 'right', 700);
        });
        const alive = sh.filter(v => v >= .1).length;
        // caption
        const erased = ROLES.findIndex((r, j) => away[j] > .08 && st.muls[j] > 1);
        const msg = say || (erased >= 0 ? `The ${ROLES[erased][0]} now wins fights at ranges built for other guns: it shows up, but it has no role.` : sh[st.w] < .05 && st.muls[st.w] > 1.2 ? `No ${ROLES[st.w][0]} number fixes this map: it never offers the distance the gun is built for.` : alive >= 4 ? 'Most roles get a share: the map offers each one its fight.' : 'A few roles take almost every fight on this map.');
        GK.wrap(g, msg, 20, 512, 1000, 22, C.ink, 17, 700);
        GK.wrap(g, 'Damage curves are the same as slide 1 until you change them. Balance is weapon × map: the same numbers are even on one map and lopsided on another.', 20, 558, 1000, 18, C.muted, 13);
        ui.stats(`<div class="${alive >= 4 ? 'g' : 'y'}"><b>${alive} of 5</b><span>weapons win at least 10% of fights</span></div><div><b>${Math.round(topShare * 100)}%</b><span>of fights go to the top weapon</span></div>`);
        ui.out(erased >= 0 ? 'Two ways to miss: a gun that never gets its fight, or one that wins everyone else’s.' : alive >= 4 ? 'Balanced here. Now switch the map without touching a single number.' : 'Try fixing it with damage alone, then try changing the map instead.');
      },
    };
  });
})();
