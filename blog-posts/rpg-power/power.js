/* What an RPG needs (genre breakdown: "What Makes a Good RPG Video Game?").
   The post's seventh ingredient, difficulty balance: a consistent challenge that grows with the character.
   A 30 hour campaign: enemy power climbs with each zone (with a spike at each zone's boss). Player power comes in
   level-up steps; the level comes from XP, which is play time × XP rate × (1 + the share of time spent grinding).
   The ratio of player to enemy power puts each hour in a band: trivial (player 25% or more ahead), challenge, or a wall
   (player 15% or more behind). All curves are illustrative. */
(function () {
  const C = TD.C, { clamp, lerp } = TD;
  const HOURS = 30, ZONES = 6;
  const enemy = h => { h = Math.min(h, HOURS - 1e-6); const z = Math.min(ZONES - 1, Math.floor(h / (HOURS / ZONES))), k = (h % (HOURS / ZONES)) / (HOURS / ZONES); return 10 * Math.pow(1.38, z) * (1 + .25 * k) * (k > .9 ? 1.18 : 1); };
  const XPL = L => 1000 * (1 + .02 * L);     // XP to go from level L to L+1
  function level(h, rate, grind) { let xp = h * 900 * rate * (1 + grind), L = 1; while (xp >= XPL(L) && L < 60) { xp -= XPL(L); L++; } return L; }
  const power = L => 9 * Math.pow(1.092, L - 1);
  const band = r => r >= 1.25 ? 'trivial' : r <= .85 ? 'wall' : 'challenge';
  const COL = { trivial: '#8ea2e6', challenge: '#5fb47c', wall: '#e07b72' };

  GK.scene('power', (s, g, ui) => {
    const rateEl = s.querySelector('.rp-rate'), rv = s.querySelector('.rp-ratev'), grEl = s.querySelector('.rp-grind'), gv = s.querySelector('.rp-grindv');
    ui.watch(rateEl, grEl);
    const ACTS = [{ to: 5, r: 1, gr: 0 }, { to: 10, r: 1.8, gr: 0 }, { to: 15, r: .6, gr: 0 }, { to: 20, r: .6, gr: .7 }, { to: 25, r: 1, gr: 0 }];
    return {
      dur: 25,
      frame(t, tour) {
        let rate = +rateEl.value, grind = +grEl.value / 100;
        if (tour) { const [a] = GK.act(ACTS, t); rate = a.r; grind = a.gr; rateEl.value = rate; grEl.value = grind * 100; }
        rv.textContent = rate.toFixed(1) + '×'; gv.textContent = Math.round(grind * 100) + '%';
        GK.panel(g);
        const ax = 70, ay = 50, aw = 930, ah = 330;
        GK.head(g, 'Player power against enemy power over a 30 hour campaign', ax, 32);
        const A = GK.axes(g, ax, ay, aw, ah, { x0: 0, x1: HOURS, y0: 0, y1: 75, xt: [0, 5, 10, 15, 20, 25, 30], yt: [0, 25, 50, 75], fmtX: v => v + ' h', yl: 'power' });
        const counts = { trivial: 0, challenge: 0, wall: 0 }; const N = 300;
        for (let i = 0; i < N; i++) {
          const h = (i + .5) / N * HOURS, r = power(level(h, rate, grind)) / enemy(h), b = band(r); counts[b]++;
          g.fillStyle = COL[b]; g.fillRect(A.sx(i / N * HOURS), ay + ah + 20, aw / N + .5, 14);
        }
        for (let z = 1; z < ZONES; z++) { const x = A.sx(z * HOURS / ZONES); g.strokeStyle = 'rgba(93,97,140,.35)'; g.setLineDash([3, 4]); g.beginPath(); g.moveTo(x, ay); g.lineTo(x, ay + ah); g.stroke(); g.setLineDash([]); }
        for (let z = 0; z < ZONES; z++) GK.text(g, `zone ${z + 1}`, A.sx((z + .5) * HOURS / ZONES), ay + 16, C.muted, 11, 'center', 600);
        const ep = [], pp = []; for (let i = 0; i <= 600; i++) { const h = i / 600 * HOURS; ep.push([A.sx(h), A.sy(Math.min(75, enemy(h)))]); pp.push([A.sx(h), A.sy(Math.min(75, power(level(h, rate, grind))))]); }
        GK.line(g, ep, C.red, 3); GK.line(g, pp, C.player, 3.5);
        GK.text(g, 'enemies', A.sx(29.5), A.sy(Math.min(75, enemy(29.5))) - 8, C.red, 13, 'right', 700);
        GK.text(g, `you: level ${level(HOURS, rate, grind)} at the end`, A.sx(29.5), A.sy(Math.min(75, power(level(29.5, rate, grind)))) + 18, C.player, 13, 'right', 700);
        // band legend
        const ly = ay + ah + 58;
        [['trivial', 'trivial: 25%+ ahead'], ['challenge', 'challenge'], ['wall', 'wall: 15%+ behind']].forEach(([k, l], i) => {
          g.fillStyle = COL[k]; g.fillRect(ax + i * 300, ly, 14, 14); GK.text(g, `${l} (${Math.round(counts[k] / N * 100)}% of hours)`, ax + i * 300 + 20, ly + 12, C.ink, 13, 'left', 600);
        });
        GK.wrap(g, 'The difficulty balance the post asks for is the green band: a consistent challenge that grows with the character. XP rate and optional grinding both move the blue steps; tune them so most hours stay green.', ax, ly + 50, aw, 19, C.ink, 14);
        const ch = Math.round(counts.challenge / N * 100);
        ui.stats(`<div class="g"><b>${ch}%</b><span>of hours in the challenge band</span></div><div class="${counts.wall > counts.trivial ? 'r' : ''}"><b>${Math.round(counts.trivial / N * 100)}% / ${Math.round(counts.wall / N * 100)}%</b><span>trivial / wall</span></div>`);
        ui.out(counts.wall > N * .25 ? 'Too little XP: the zones outrun the character and the campaign hits walls. Grinding can buy the gap back, at the cost of hours.'
          : counts.trivial > N * .25 ? 'Too much XP: the character outgrows every zone and fights stop asking anything.'
          : 'Steps and zones climb together, so each zone stays a challenge for the character who reaches it.');
      },
    };
  });
})();
