/* Pace the curve to your zones (genre breakdown: "RPG Game Design", with "What Makes a Good RPG Video Game?"),
   a lesson-richness spike for slide 2. Slide 1 compares curve shapes in the abstract. Here the curve meets the content:
   six zones, each built for a level band and holding a fixed number of hours of quests. Every curve shape is scaled
   so the total XP to level 20 is the same, and equals the XP the content hands out, so only the shape differs.
   A player plays each zone in order. Arriving below a zone's first level, they grind the zone before it until they
   reach it (grind hours). Arriving two or more levels above it, the zone is trivial (overlevelled), and quests pay
   less XP once the player is above the zone's band (25% less per level, down to a quarter). Short of level 20 after
   the last zone, they grind there. Income is 600 XP an hour per level, as on slide 1. All numbers are illustrative. */
(function () {
  const C = TD.C, { clamp } = TD;
  // [name, first level, last level, hours of content]
  const ZONES = [['Meadow', 1, 4, 4], ['Old road', 4, 7, 5], ['Marsh', 7, 10, 6], ['Mines', 10, 13, 6], ['Peaks', 13, 16, 7], ['Citadel', 16, 20, 8]];
  const CAP = 20, ZC = ['#9cc58a', '#d9c27a', '#7fb3a6', '#a39b8b', '#9fb4d8', '#c79bc4'];
  // 'fit' is built from the content itself: the XP the zone for level L hands out per level of its band
  const zoneOf = L => ZONES.find(z => L >= z[1] && L < z[2]) || ZONES[5];
  const RAW = { linear: L => L, fit: L => { const z = zoneOf(L); return z[3] / (z[2] - z[1]) * L; }, exp: L => Math.pow(1.35, L) };
  const NAMES = { linear: 'Linear', fit: 'Content-shaped', exp: 'Exponential' };
  const AVAIL = ZONES.reduce((a, z) => a + z[3] * 600 * (z[1] + z[2]) / 2, 0);
  const NORM = {}; for (const k in RAW) { let s = 0; for (let L = 1; L < CAP; L++) s += RAW[k](L); NORM[k] = AVAIL * .97 / s; }   // 3% slack so rounding never forces a sliver of grind
  const need = (sh, k, L) => k * NORM[sh] * RAW[sh](L);
  function run(sh, k, cut) {
    let L = 1, xp = 0, t = 0; const DT = .02, pts = [[0, 1]], segs = [], zs = [];
    const rate = (z) => 600 * L * (L > z[2] ? Math.max(.25, 1 - .25 * (L - z[2])) : 1);
    const gain = z => { xp += rate(z) * DT; while (L < CAP && xp >= need(sh, k, L)) { xp -= need(sh, k, L); L++; } t += DT; pts.push([t, L + (L < CAP ? xp / need(sh, k, L) : 0)]); };
    let grind = 0, over = 0;
    ZONES.forEach((z, i) => {
      const prev = ZONES[Math.max(0, i - 1)];
      const g0 = t; while (L < z[1] && t < 150) gain(prev); if (t > g0) { segs.push(['grind', g0, t]); grind += t - g0; }
      const lin = L, s0 = t, H = cut && i === 3 ? 0 : z[3];
      for (let h = 0; h < H - 1e-9; h += DT) gain(z);
      if (H && lin >= z[1] + 2) over++;
      zs.push({ i, s0, t1: t, lin, cut: !H, over: H && lin >= z[1] + 2 });
    });
    const g0 = t; while (L < CAP && t < 150) gain(ZONES[5]); if (t > g0) { segs.push(['grind', g0, t]); grind += t - g0; }
    return { pts, segs, zs, grind, over, t, L };
  }

  GK.scene('pace', (s, g, ui) => {
    const shBtns = [...s.querySelectorAll('.pc-sh .btn')], kEl = s.querySelector('.pc-k'), kv = s.querySelector('.pc-kv'), cutEl = s.querySelector('.pc-cut');
    const st = { sh: 'linear' };
    const sync = () => shBtns.forEach(b => b.classList.toggle('on', b.dataset.s === st.sh));
    shBtns.forEach(b => b.onclick = () => { st.sh = b.dataset.s; sync(); });
    ui.watch(shBtns, kEl, cutEl);
    const ACTS = [
      { to: 6, sh: 'linear', k: 100, cut: false, say: 'A linear curve asks too much early: the player has to grind before each of the next four zones.' },
      { to: 12, sh: 'exp', k: 100, cut: false, say: 'Exponential flips it: the early zones go by too fast and the player walks into the Marsh already overlevelled.' },
      { to: 18, sh: 'fit', k: 100, cut: false, say: 'Build the curve from the content: each level costs what its zone pays out. Every zone hands over the levels the next one expects.' },
      { to: 25, sh: 'fit', k: 100, cut: true, say: 'Cut the Mines to hit a date. Nothing else changed, and the player must grind the Marsh to reach the Peaks.' },
    ];
    sync();
    return {
      dur: 25,
      frame(t, tour) {
        let say = '';
        if (tour) { const [a] = GK.act(ACTS, t); st.sh = a.sh; kEl.value = a.k; cutEl.checked = a.cut; say = a.say; sync(); }
        const k = +kEl.value / 100; kv.textContent = `${Math.round(k * 100)}% of the content's XP`;
        const r = run(st.sh, k, cutEl.checked);
        GK.panel(g);
        const ax = 60, ay = 44, aw = 950, ah = 300, tmax = Math.max(40, Math.ceil(r.t / 5) * 5);
        GK.head(g, `${NAMES[st.sh]} curve: the player's level against hours played`, 20, 28);
        const A = GK.axes(g, ax, ay, aw, ah, { x0: 0, x1: tmax, y0: 1, y1: CAP, xt: Array.from({ length: tmax / 5 + 1 }, (_, i) => i * 5), yt: [1, 4, 7, 10, 13, 16, 20], fmtX: v => v + ' h', xl: 'hours played' });
        // zones as bands: x = when the player was there, y = the band the zone was built for
        r.zs.forEach(z => {
          const Z = ZONES[z.i], x1 = A.sx(z.s0), x2 = A.sx(z.t1);
          g.fillStyle = ZC[z.i]; g.globalAlpha = .55; g.fillRect(A.sx(z.s0), A.sy(Z[2]), Math.max(2, x2 - x1), A.sy(Z[1]) - A.sy(Z[2])); g.globalAlpha = 1;
          if (z.cut) { GK.text(g, `${Z[0]} cut`, x1 + 4, A.sy(Z[2]) - 6, C.redDk, 11, 'left', 800); return; }
          GK.text(g, Z[0], (x1 + x2) / 2, A.sy(Z[2]) - 6, C.ink, 11, 'center', 700);
          if (z.over) GK.text(g, 'overlevelled', (x1 + x2) / 2, A.sy(Z[1]) + 14, C.goldInk, 11, 'center', 800);
        });
        r.segs.forEach(([, a, b]) => { g.fillStyle = 'rgba(229,50,45,.18)'; g.fillRect(A.sx(a), ay, A.sx(b) - A.sx(a), ah); GK.text(g, 'grind', (A.sx(a) + A.sx(b)) / 2, ay + 14, C.redDk, 11, 'center', 800); });
        GK.line(g, r.pts.filter((p, i) => i % 5 === 0).map(([x, y]) => [A.sx(x), A.sy(Math.min(CAP, y))]), C.navy, 3);
        // readouts
        const yb = 420;
        GK.big(g, `${r.grind.toFixed(1)} h`, 'of grinding outside the quests', 20, yb, r.grind > 3 ? C.redDk : C.good);
        GK.big(g, `${r.over}`, 'zones entered overlevelled', 260, yb, r.over ? C.goldInk : C.good);
        GK.big(g, `${r.t.toFixed(0)} h`, 'to reach level 20', 480, yb);
        GK.big(g, `${cutEl.checked ? 30 : 36} h`, 'of quests shipped', 680, yb);
        const ok = r.grind <= 3 && !r.over;
        GK.wrap(g, say || (ok ? 'Each zone hands over the levels the next one expects.' : r.grind > 3 && r.over ? 'Both at once: zones that go by too fast and gaps the player has to grind through.' : r.grind > 3 ? 'Gaps: the content runs out before the levels do, so the player grinds.' : 'Too fast: the player outlevels zones you built, and their quests stop mattering.'), 20, 482, 1000, 22, C.ink, 17, 700);
        GK.wrap(g, 'The XP curve is a content schedule. Its shape has to match how many hours you ship in each level band; a content cut or a curve change leaves a hole the player fills with grinding.', 20, 540, 1000, 18, C.muted, 13);
        ui.stats(`<div class="${r.grind > 3 ? 'r' : 'g'}"><b>${r.grind.toFixed(1)} h</b><span>of grinding</span></div><div class="${r.over ? 'y' : 'g'}"><b>${r.over}</b><span>zones entered overlevelled</span></div>`);
        ui.out('Same total XP every time. Only the shape moves, and the shape decides where the player waits.');
      },
    };
  });
})();
