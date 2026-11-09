/* Assist levels (genre breakdown: "Sports Game Design").
   The same jump shot under three assist levels. The player releases the shot button some milliseconds off the peak
   of the jump (seeded, spread set by the skill slider). The shot goes in when the release lands inside the mode's
   window; outside it, it misses by an amount that grows with the error, less the mode's aim assist. Windows and assist
   are illustrative. The novice and expert rates are expected values (a normal spread), not the 30 shots. The readout compares a novice (90 ms spread) with an expert (25 ms) in every mode: accessibility
   lifts the novice; authenticity keeps the gap that skill earns. */
(function () {
  const C = TD.C, { clamp, lerp } = TD;
  const MODES = [['Simulation', 35, 0, C.red], ['Balanced', 80, .35, C.gold], ['Arcade', 150, .7, C.p2]];
  const SHOTS = 30;
  function shots(sd, seed) {
    const R = GK.rng(seed); const out = [];
    for (let i = 0; i < SHOTS; i++) { const u = Math.max(1e-6, R()), v = R(); out.push(sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283 * v)); }
    return out;
  }
  const made = (e, m) => Math.abs(e) <= m[1];
  const erf = x => { const t = 1 / (1 + .3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - .284496736) * t + .254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
  const rate = (sd, m) => erf(m[1] / (sd * Math.SQRT2));   // expected share in, over many shots
  GK.scene('assist', (s, g, ui) => {
    const sEl = s.querySelector('.sa-s'), sv = s.querySelector('.sa-sv'); ui.watch(sEl);
    const ACTS = [{ to: 8, sd: 90 }, { to: 16, sd: 25 }];
    return {
      dur: 16,
      frame(t, tour) {
        let sd = +sEl.value; if (tour) { const [a] = GK.act(ACTS, t); sd = a.sd; sEl.value = sd; }
        sv.textContent = `±${sd} ms`;
        const sh = shots(sd, 9), shown = tour ? clamp(Math.floor((t % 8) / 6 * SHOTS), 1, SHOTS) : SHOTS;
        GK.panel(g);
        MODES.forEach((m, i) => {
          const x0 = 16 + i * 340, w = 328;
          GK.box(g, x0, 16, w, 400, '#fffaf0', m[3], 12, 3);
          GK.head(g, m[0], x0 + 14, 42, 'left', C.ink, 17);
          GK.text(g, `window ±${m[1]} ms · aim assist ${Math.round(m[2] * 100)}%`, x0 + 14, 62, C.muted, 12, 'left', 600);
          // hoop and backboard
          const hx = x0 + w / 2, hy = 150;
          g.fillStyle = '#fff'; g.strokeStyle = C.navy; g.lineWidth = 2; g.fillRect(hx - 50, hy - 70, 100, 64); g.strokeRect(hx - 50, hy - 70, 100, 64); g.strokeRect(hx - 18, hy - 44, 36, 30);
          g.strokeStyle = '#e8641b'; g.lineWidth = 4; g.beginPath(); g.ellipse(hx, hy, 30, 7, 0, 0, 6.283); g.stroke();
          g.strokeStyle = 'rgba(93,97,140,.5)'; g.lineWidth = 1; for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(hx + k * 9, hy + 4); g.lineTo(hx + k * 6, hy + 34); g.stroke(); }
          // shots at the rim
          const R = GK.rng(i + 2);
          sh.slice(0, shown).forEach((e, j) => {
            const ok = made(e, m), miss = ok ? 0 : (Math.abs(e) - m[1]) * (1 - m[2]) * .5 + 14;
            const dx = ok ? (R() - .5) * 30 : Math.sign(e) * Math.min(120, miss), dy = (R() - .5) * 16;
            g.fillStyle = ok ? C.good : C.red; g.globalAlpha = j === shown - 1 ? 1 : .55; g.beginPath(); g.arc(hx + dx, hy - 2 + dy, 5, 0, 6.283); g.fill(); g.globalAlpha = 1;
          });
          // release meter
          const my = 250, mx = x0 + 20, mw = w - 40, range = 300, px = e => mx + mw / 2 + clamp(e / range, -1, 1) * mw / 2;
          GK.text(g, 'release timing: early ← peak → late', x0 + w / 2, my - 10, C.muted, 12, 'center', 600);
          g.fillStyle = '#e9e1d2'; g.fillRect(mx, my, mw, 24);
          g.fillStyle = 'rgba(47,174,99,.45)'; g.fillRect(px(-m[1]), my, px(m[1]) - px(-m[1]), 24);
          g.fillStyle = C.navy; g.fillRect(mx + mw / 2 - 1, my - 4, 2, 32);
          sh.slice(0, shown).forEach((e, j) => { g.fillStyle = made(e, m) ? C.good : C.red; g.fillRect(px(e) - 1.5, my + 28 + (j % 4) * 6, 3, 5); });
          const r = sh.slice(0, shown).filter(e => made(e, m)).length;
          GK.big(g, `${r} of ${shown}`, 'shots in', x0 + 20, 360, C.ink);
          const nov = rate(90, m), exp = rate(25, m);
          GK.text(g, `novice ${Math.round(nov * 100)}% · expert ${Math.round(exp * 100)}%`, x0 + 170, 362, C.ink, 13, 'left', 700);
          GK.text(g, `skill gap: ${Math.round((exp - nov) * 100)} points`, x0 + 170, 382, m[3] === C.gold ? C.goldInk : m[3], 13, 'left', 800);
        });
        GK.wrap(g, 'Same player, same releases, three rule sets. A wide window and aim assist make the shot accessible: the novice scores. A narrow window keeps it authentic: the release matters, and the expert earns the gap. Sports games pick a point between the two, often per difficulty setting.', 24, 450, 990, 20, C.ink, 15);
        ui.stats(MODES.map((m, i) => `<div class="${i === 0 ? 'r' : i === 1 ? 'y' : 'g'}"><b>${Math.round(rate(sd, m) * 100)}%</b><span>${m[0].toLowerCase()} at ±${sd} ms</span></div>`).join(''));
        ui.out(sd > 60 ? 'A novice’s releases scatter: only the arcade window catches most of them.' : 'An expert lands close to the peak, so even simulation rewards them, and the arcade window gives the same reward to everyone.');
      },
    };
  });
})();
