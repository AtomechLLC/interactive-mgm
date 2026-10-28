/* Diminishing returns and limits (MGM C4 M3, deck slides 183-186). Left: stun length per skill rank, linear vs
   diminishing (the deck's Xerath chart: 2, 3, 3.5, 4, 4.25, 4.3 s, illustrative, since live Xerath's Shocking Orb
   scales its stun with distance, up to 2.25 s in Data Dragon 16.21.1) vs a hard cap. Right: Elden Ring Vigor, real
   values (community formula, matches the Fextralife table: 414 HP at 10, 1450 at 40, 1900 at 60, 2100 at 99). */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585;
  const MODES = [
    { k: 'lin', name: 'Linear', col: C.red, v: [2, 3, 4, 5, 6, 7], cap: 'Linear: every rank adds a full second. By rank 6 the stun lasts 7 s, long enough to kill anyone it touches.' },
    { k: 'dim', name: 'Diminishing', col: C.player, v: [2, 3, 3.5, 4, 4.25, 4.3], cap: 'Diminishing: each rank adds less (+1, +0.5, +0.5, +0.25, +0.05). Investing still pays, but you can’t stun for an outrageous length of time.' },
    { k: 'cap', name: 'Hard cap', col: C.purple, v: [2, 3, 4, 4, 4, 4], cap: 'Hard cap: full value up to a limit, then nothing. Simple and predictable, but every rank past the cap adds nothing at all.' },
  ];
  // Elden Ring HP by Vigor level: four segments with soft caps at 25, 40 and 60
  function vigorHP(l) {
    if (l <= 25) return 300 + 500 * Math.pow((l - 1) / 24, 1.5);
    if (l <= 40) return 800 + 650 * Math.pow((l - 25) / 15, 1.1);
    if (l <= 60) return 1450 + 450 * (1 - Math.pow(1 - (l - 40) / 20, 1.2));
    return 1900 + 200 * (1 - Math.pow(1 - (l - 60) / 39, 1.2));
  }
  const HP = Array.from({ length: 100 }, (_, l) => l ? Math.floor(vigorHP(l)) : 0);

  const L = { x0: 70, x1: 470, y0: 440, y1: 110 }, R = { x0: 590, x1: 1010, y0: 380, y1: 110, b0: 520 };
  function axes(g, A, xs, ys, xt, yt) {
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 1; g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.muted; g.textBaseline = 'middle';
    ys.forEach(([v, y]) => { g.beginPath(); g.moveTo(A.x0, y); g.lineTo(A.x1, y); g.stroke(); g.textAlign = 'right'; g.fillText(v, A.x0 - 8, y); });
    g.textAlign = 'center'; xs.forEach(([v, x]) => g.fillText(v, x, A.y0 + 18));
    g.fillText(xt, (A.x0 + A.x1) / 2, A.y0 + 40);
    g.save(); g.translate(A.x0 - 46, (A.y0 + A.y1) / 2); g.rotate(-Math.PI / 2); g.fillText(yt, 0, 0); g.restore();
  }

  function draw(g, mi, rk, vg) {
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.75)'; g.beginPath(); g.roundRect(0, 0, 500, H, 14); g.roundRect(520, 0, 520, H, 14); g.fill();
    // ---- left: stun by rank ----
    T.label('Stun length per rank (illustrative)', 250, 40, 'center', '#fff', 16, C.navy);
    const rx = r => lerp(L.x0 + 30, L.x1 - 20, (r - 1) / 5), sy = s => lerp(L.y0, L.y1, s / 7);
    axes(g, L, [1, 2, 3, 4, 5, 6].map(r => [`Rank ${r}`, rx(r)]), [0, 1, 2, 3, 4, 5, 6, 7].map(s => [s + ' s', sy(s)]), 'skill rank', 'stun length');
    MODES.forEach((m, i) => {
      const on = i === mi; g.strokeStyle = m.col; g.globalAlpha = on ? 1 : .22; g.lineWidth = on ? 5 : 3; g.beginPath();
      m.v.forEach((v, r) => r ? g.lineTo(rx(r + 1), sy(v)) : g.moveTo(rx(1), sy(v))); g.stroke(); g.globalAlpha = 1;
    });
    const m = MODES[mi], rf = clamp(rk, 1, 6), r0 = Math.floor(rf), k = rf - r0, v = r0 < 6 ? lerp(m.v[r0 - 1], m.v[r0], k) : m.v[5];
    for (let r = 2; r <= Math.min(6, Math.round(rk)); r++) {
      const d = m.v[r - 1] - m.v[r - 2];
      T.label(d > 0 ? `+${d % 1 ? d.toFixed(2).replace(/0$/, '') : d}` : '+0', rx(r), sy(m.v[r - 1]) - 26, 'center', d > 0 ? m.col : C.muted, 14);
    }
    g.fillStyle = m.col; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(lerp(rx(r0), rx(Math.min(6, r0 + 1)), k), sy(v), 10, 0, Math.PI * 2); g.fill(); g.stroke();
    T.label(`${v.toFixed(2)} s`, L.x1 - 40, L.y1 - 20, 'center', '#fff', 16, m.col);
    g.fillStyle = C.muted; g.font = '600 13px Jost, sans-serif'; g.textAlign = 'center';
    g.fillText('Live Xerath caps his stun by distance instead: up to 2.25 s.', 250, H - 30);
    // ---- right: Elden Ring Vigor ----
    T.label('Elden Ring: HP per Vigor level (real values)', 780, 40, 'center', '#fff', 16, C.navy);
    const vx = l => lerp(R.x0, R.x1, (l - 1) / 98), hy = h => lerp(R.y0, R.y1, h / 2200);
    axes(g, R, [1, 25, 40, 60, 99].map(l => [l, vx(l)]), [0, 500, 1000, 1500, 2000].map(h => [h, hy(h)]), '', 'HP');
    [[40, 'soft cap 40'], [60, 'soft cap 60']].forEach(([l, t]) => { g.setLineDash([6, 6]); g.strokeStyle = C.goldInk; g.lineWidth = 2; g.beginPath(); g.moveTo(vx(l), R.y1 - 10); g.lineTo(vx(l), R.b0 + 30); g.stroke(); g.setLineDash([]); T.label(t, vx(l), R.y1 - 20, 'center', C.goldInk, 12); });
    const lv = clamp(Math.round(vg), 1, 99);
    g.strokeStyle = C.p2; g.lineWidth = 4; g.beginPath(); for (let l = 1; l <= 99; l++) l > 1 ? g.lineTo(vx(l), hy(HP[l])) : g.moveTo(vx(l), hy(HP[l])); g.stroke();
    // bars: HP gained from each level
    g.fillStyle = C.muted; g.font = '600 13px Jost, sans-serif'; g.textAlign = 'left'; g.fillText('HP gained by that level', R.x0, R.y0 + 48);
    for (let l = 2; l <= 99; l++) { const d = HP[l] - HP[l - 1], h = d * 1.7; g.fillStyle = l === lv ? C.gold : l < 41 ? 'rgba(47,174,99,.75)' : l < 61 ? 'rgba(224,169,45,.75)' : 'rgba(139,143,168,.75)'; g.fillRect(vx(l) - 1.8, R.b0 - h, 3.6, h); }
    g.fillStyle = C.p2; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(vx(lv), hy(HP[lv]), 9, 0, Math.PI * 2); g.fill(); g.stroke();
    T.label(`Vigor ${lv}: ${HP[lv]} HP, +${lv > 1 ? HP[lv] - HP[lv - 1] : 0} this level`, R.x1, R.y0 + 48, 'right', '#fff', 14, C.p2);
    return { m, v, lv };
  }

  const DUR = 16;
  const tourAt = t => ({ mi: Math.min(2, Math.floor(t / 5.2)), rk: 1 + ease(clamp((t % 5.2) / 3.6)) * 5, vg: 1 + ease(clamp(t / 15)) * 98 });

  let api = null;
  canvasDemo('diminishing', (s, cv, g) => {
    const st = { mi: 1, rk: 6, vg: 40, tour: true, tt: 0, held: false, last: '' };
    const box = $(s, '.dm-modes'), tourBtn = $(s, '.dm-tour');
    box.innerHTML = MODES.map((m, i) => `<button class="btn" data-i="${i}">${m.name}</button>`).join('');
    $$(box, 'button').forEach(b => b.onclick = () => { st.tour = false; tourBtn.classList.remove('on'); st.mi = +b.dataset.i; st.rk = 1; });
    tourBtn.onclick = () => { st.tour = true; st.tt = 0; tourBtn.classList.add('on'); };
    cv.addEventListener('pointermove', e => { if (st.tour) return; const p = FPF.ptr(cv, e); if (p.x > R.x0 - 10) st.vg = clamp(lerp(1, 99, (p.x - R.x0) / (R.x1 - R.x0)), 1, 99); });
    cv.addEventListener('pointerdown', () => { st.tour = false; tourBtn.classList.remove('on'); });
    function render() {
      let { mi, rk, vg } = st; if (st.tour) ({ mi, rk, vg } = tourAt(st.tt));
      const r = draw(g, mi, rk, vg);
      $$(box, 'button').forEach((b, i) => b.classList.toggle('on', i === mi));
      const key = `${mi}|${r.lv}`; if (key === st.last) return; st.last = key;
      const gain = r.lv > 1 ? HP[r.lv] - HP[r.lv - 1] : 0;
      say($(s, '.st'), `<div><b>${r.m.v[5]} s</b><span>stun at rank 6, ${r.m.name.toLowerCase()}</span></div><div class="g"><b>+${gain}</b><span>HP from Vigor ${r.lv} (hover the right chart)</span></div>`);
      say($(s, '.out1'), r.m.cap + ' Elden Ring does the same with stats: levels up to 40 pay the most, then less to 60, then very little.');
    }
    api = { seek(t) { st.held = st.tour = true; st.tt = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) { if (st.tour) { st.tt += dt; if (st.tt > DUR) st.tt = 0; } else st.rk = Math.min(6, st.rk + dt * 1.4); } render(); };
  });

  window.__seek = t => api.seek(t);
  window.__dur = () => api.dur();
})();
