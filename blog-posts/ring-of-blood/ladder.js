/* Tune the ladder (post-mortem: "The Ring of Blood: Balancing Fantasy and Gameplay"), a lesson-richness spike for
   slide 2. Slide 1 draws the six fights as a staircase. Here 400 groups climb it. Each group's power starts spread
   around 1.5 times Brokentoe (log-normal, seeded) and grows by the reward slider after each win (quest rewards, gear,
   practice). A fight's difficulty is Brokentoe's times (1 + step) per rung; the post's two exceptions are toggles:
   Skra'gath as a Mage (difficulty x 0.42, as on slide 1) and the Warmaul Champion tuned like a dungeon boss (x 2.2).
   Each attempt wins with a logistic chance on log(power / difficulty); a failed attempt teaches a little (+4%), and a
   group that fails three times quits. A fight is trivial for a group 2.5 times stronger than it.
   The lesson: a ladder is only even if its steps match how fast the players grow; a dip wastes a rung and a spike is
   where people quit. Population and rates are illustrative. */
(function () {
  const C = TD.C, { clamp } = TD;
  const NAMES = ['Brokentoe', 'Blue Brothers', 'Rokdar', 'Skra’gath', 'Warmaul Champion', 'Mogor'];
  const GROUPS = (() => { const R = GK.rng(9), a = []; for (let i = 0; i < 400; i++) { const u = Math.max(1e-6, R()), v = R(); a.push(Math.exp(Math.log(1.6) + .3 * Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283 * v))); } return a; })();
  function run(step, reward, mage, champ) {
    const D = []; for (let i = 0; i < 6; i++) { let d = Math.pow(1 + step, i); if (i === 3 && mage) d *= .42; if (i === 4 && champ) d *= 2.2; D.push(d); }
    const reach = [0, 0, 0, 0, 0, 0], quit = [0, 0, 0, 0, 0, 0], triv = [0, 0, 0, 0, 0, 0], pw = [[], [], [], [], [], []]; let done = 0;
    const R = GK.rng(3);
    for (const p0 of GROUPS) {
      let P = p0;
      for (let i = 0; i < 6; i++) {
        reach[i]++; pw[i].push(P); if (P > 2.5 * D[i]) triv[i]++;
        let won = false; for (let a = 0; a < 3 && !won; a++) { const q = 1 / (1 + Math.exp(-(Math.log(P) - Math.log(D[i])) / .15)); if (R() < q) won = true; else P *= 1.04; }
        if (!won) { quit[i]++; break; }
        P *= 1 + reward; if (i === 5) done++;
      }
    }
    const med = pw.map(a => a.length ? a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)] : 0);
    return { D, reach, quit, triv, med, done: done / GROUPS.length };
  }

  GK.scene('ladder', (s, g, ui) => {
    const stEl = s.querySelector('.ld-s'), stv = s.querySelector('.ld-sv'), rwEl = s.querySelector('.ld-r'), rwv = s.querySelector('.ld-rv');
    const mEl = s.querySelector('.ld-mage'), cEl = s.querySelector('.ld-champ');
    ui.watch(stEl, rwEl, mEl, cEl);
    const ACTS = [
      { to: 7, s: 30, r: 20, m: false, c: false, say: 'Steps of 30% against groups that grow 20% a win: most groups climb, and the ones who quit spread out along the ladder.' },
      { to: 13, s: 30, r: 20, m: true, c: false, say: 'Swap Skra’gath to a Mage: almost every group walks through him. A rung of the ladder teaches nothing.' },
      { to: 19, s: 30, r: 20, m: true, c: true, say: 'Tune the Champion like a dungeon boss: most groups that reach him quit there. One spike decides the whole quest.' },
      { to: 25, s: 15, r: 30, m: false, c: false, say: 'Steps smaller than the growth: everyone finishes, and the last fights are trivial for most of them.' },
      { to: 31, s: 50, r: 20, m: false, c: false, say: 'Steps bigger than the growth: the ladder becomes a funnel and few groups reach the top.' },
    ];
    return {
      dur: 31,
      frame(t, tour) {
        let say = '';
        if (tour) { const [a] = GK.act(ACTS, t); stEl.value = a.s; rwEl.value = a.r; mEl.checked = a.m; cEl.checked = a.c; say = a.say; }
        const step = +stEl.value / 100, rw = +rwEl.value / 100; stv.textContent = `+${Math.round(step * 100)}% a fight`; rwv.textContent = `+${Math.round(rw * 100)}% a win`;
        const r = run(step, rw, mEl.checked, cEl.checked);
        GK.panel(g);
        GK.head(g, 'Each fight against the groups that reach it', 20, 28);
        const x0 = 70, base = 300, top = 50, bw = 120, gap = 34, ymax = Math.max(...r.D, ...r.med) * 1.15, sy = v => base - v / ymax * (base - top);
        g.strokeStyle = '#cdbf9f'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0 - 10, base); g.lineTo(x0 + 6 * (bw + gap), base); g.stroke();
        GK.text(g, 'difficulty', x0 - 14, top + 6, C.muted, 11, 'right', 600);
        let worst = 0;
        r.D.forEach((d, i) => {
          const x = x0 + i * (bw + gap), reach = r.reach[i], q = r.quit[i], tv = r.triv[i];
          if (q > r.quit[worst]) worst = i;
          const tri = reach && tv / reach > .5, wall = reach && q / reach > .4;
          GK.box(g, x, sy(d), bw, base - sy(d), wall ? '#f9d9d6' : tri ? '#fde9b8' : '#dfe6fb', wall ? C.red : tri ? C.gold : '#8ea2e6', 6, 2);
          // median power entering this fight
          if (reach) { g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 6, sy(r.med[i])); g.lineTo(x + bw + 6, sy(r.med[i])); g.stroke(); }
          GK.text(g, NAMES[i], x + bw / 2, base + 18, C.ink, 12, 'center', 700);
          GK.text(g, `${reach} reach`, x + bw / 2, base + 36, C.muted, 11, 'center', 600);
          GK.text(g, `${q} quit here`, x + bw / 2, base + 52, q ? C.redDk : C.muted, 11, 'center', q ? 800 : 600);
          if (tri) GK.text(g, 'trivial for most', x + bw / 2, sy(d) - 8, C.goldInk, 11, 'center', 800);
          if (wall) GK.text(g, 'a wall', x + bw / 2, sy(d) - 8, C.redDk, 11, 'center', 800);
        });
        GK.line(g, [[x0 + 4 * (bw + gap) + 30, 34], [x0 + 4 * (bw + gap) + 56, 34]], C.navy, 3);
        GK.text(g, 'typical group’s power arriving', x0 + 4 * (bw + gap) + 62, 38, C.muted, 11, 'left', 600);
        const yb = 420;
        GK.big(g, `${Math.round(r.done * 100)}%`, 'of groups finish the quest', 20, yb, r.done >= .6 ? C.good : r.done < .3 ? C.redDk : C.ink);
        GK.big(g, `${r.D.filter((d, i) => r.reach[i] && r.triv[i] / r.reach[i] > .5).length}`, 'fights trivial for most who reach them', 260, yb);
        GK.big(g, `${NAMES[worst]}`, `where most groups quit (${r.quit[worst]})`, 560, yb, C.redDk);
        GK.wrap(g, say || (r.done >= .6 && r.quit[worst] < 60 ? 'An even climb: steps that match how fast groups grow.' : 'Find the rung that breaks the climb, then decide whether to move the step or the reward.'), 20, 482, 1000, 22, C.ink, 17, 700);
        GK.wrap(g, 'A ladder is even only against the players’ growth: a step smaller than it bores, a step bigger than it funnels, and one spike is where the quest ends for most people.', 20, 540, 1000, 18, C.muted, 13);
        ui.stats(`<div class="${r.done >= .6 ? 'g' : r.done < .3 ? 'r' : 'y'}"><b>${Math.round(r.done * 100)}%</b><span>of groups finish</span></div><div class="r"><b>${r.quit[worst]}</b><span>quit at ${NAMES[worst]}</span></div>`);
        ui.out('Difficulty is relative to the player’s power, and the rewards set how fast that power grows.');
      },
    };
  });
})();
