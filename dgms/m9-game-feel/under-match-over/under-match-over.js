/* Under, match, over (DGMS Module 9, deck slide 107: Manderson and McEntee's goal 2).
   Six elements of one action (input response, animation, sound, VFX, force feedback, screen shake), each on its own
   three-zone bar: under-deliver, match, over-deliver player expectations. The match zone sits in a different place for
   each element and for each action (a light jab expects less than a heavy finisher). Polish costs grow with the square
   of the level, so the budget meter drains fastest in the over zone: "an infinite pit you can pour money into".
   The walk-through is a pure function of t. */
(function () {
  const { $, $$, canvasDemo, say, ptr } = FPF.kit;
  const C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, BUDGET = 100, BX0 = 230, BX1 = 830, RY0 = 92, RH = 64;
  const ELS = ['Input response', 'Animation', 'Sound', 'VFX', 'Force feedback', 'Screen shake'];
  // [start of match, start of over] per element, per action (0-100 polish level)
  const ZONES = {
    jab: { name: 'Light jab', z: [[35, 65], [25, 50], [20, 45], [15, 35], [10, 30], [5, 18]] },
    fin: { name: 'Heavy finisher', z: [[35, 65], [45, 72], [45, 72], [50, 78], [42, 68], [40, 64]] },
  };
  const cost = l => 0.4 * (l / 10) ** 2;
  const zoneOf = (l, z) => l < z[0] ? 'under' : l <= z[1] ? 'match' : 'over';
  const mid = z => Math.round((z[0] + z[1]) / 2);
  const ZC = { under: '#dfe6fb', match: '#d8f0df', over: '#fde9b8' }, ZI = { under: '#23306e', match: '#145c33', over: '#7a4a00' };
  const txt = (g, s, x, y, font, col = C.ink, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); };
  const X = l => BX0 + (BX1 - BX0) * l / 100;

  function draw(g, ctx, lv, hot) {
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.82)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
    const Z = ZONES[ctx].z;
    txt(g, ZONES[ctx].name, 24, 32, '800 22px Montserrat', C.ink);
    txt(g, 'Polish level of each element, against what the player expects of this action', 24, 58, '600 15px Jost', C.muted);
    let spent = 0, nMatch = 0;
    ELS.forEach((name, i) => {
      const y0 = RY0 + i * RH + RH / 2, y = y0 + 6, z = Z[i], l = lv[i], zn = zoneOf(l, z), c = cost(l);
      spent += c; if (zn === 'match') nMatch++;
      if (i === hot) { g.fillStyle = '#fff3d6'; g.beginPath(); g.roundRect(12, y0 - RH / 2 + 3, 880, RH - 6, 10); g.fill(); }
      txt(g, name, 24, y, '700 17px Jost', C.ink);
      // three zones
      [['under', 0, z[0]], ['match', z[0], z[1]], ['over', z[1], 100]].forEach(([k, a, b], j) => {
        g.fillStyle = ZC[k]; g.beginPath(); g.roundRect(X(a), y - 11, X(b) - X(a), 22, j === 0 ? [8, 0, 0, 8] : j === 2 ? [0, 8, 8, 0] : 0); g.fill();
        const lab = k === 'under' ? 'under-deliver' : k === 'match' ? 'match' : 'over-deliver';
        g.font = '700 12px Jost';
        if (g.measureText(lab).width < X(b) - X(a) - 6) txt(g, lab, (X(a) + X(b)) / 2, y - 21, '700 12px Jost', ZI[k], 'center');
      });
      g.strokeStyle = '#5fb47c'; g.lineWidth = 2; [z[0], z[1]].forEach(v => { g.beginPath(); g.moveTo(X(v), y - 14); g.lineTo(X(v), y + 14); g.stroke(); });
      // marker
      g.fillStyle = zn === 'match' ? '#2fae63' : zn === 'over' ? '#e0a92d' : '#5562eb'; g.strokeStyle = '#fff'; g.lineWidth = 3;
      g.beginPath(); g.arc(X(l), y, 11, 0, 7); g.fill(); g.stroke();
      txt(g, zn, 850, y - 9, '800 14px Montserrat', ZI[zn]);
      txt(g, `cost ${c.toFixed(0)}`, 850, y + 11, '600 13px Jost', C.muted);
    });
    // budget meter
    const mx = 958, my0 = 92, my1 = 476, mh = my1 - my0, k = spent / BUDGET;
    txt(g, 'Budget', mx + 20, 70, '800 14px Montserrat', C.ink, 'center');
    g.fillStyle = '#e8dcc0'; g.beginPath(); g.roundRect(mx, my0, 40, mh, 10); g.fill();
    const fh = Math.min(1, k) * mh;
    g.fillStyle = k > 1 ? '#e5322d' : k > .85 ? '#e0a92d' : '#2fae63'; g.beginPath(); g.roundRect(mx, my1 - fh, 40, fh, 10); g.fill();
    if (k > 1) { g.fillStyle = 'rgba(229,50,45,.35)'; g.beginPath(); g.roundRect(mx - 4, my0 - 14, 48, 14, 6); g.fill(); txt(g, `+${Math.round(spent - BUDGET)}`, mx + 20, my0 - 7, '800 11px Montserrat', '#8a1c15', 'center'); }
    txt(g, `${Math.round(spent)}`, mx + 20, my1 + 18, '800 18px Montserrat', k > 1 ? C.redDk : C.ink, 'center');
    txt(g, `of ${BUDGET}`, mx + 20, my1 + 38, '600 13px Jost', C.muted, 'center');
    // footer
    txt(g, '“It’s an infinite pit you can pour money into… your job is to know where the line is for every element.”', 24, 540, 'italic 600 15px Jost', C.muted);
    return { spent, nMatch };
  }

  canvasDemo('umo', (s, cv, g) => {
    const st = { tour: true, t: 0, frozen: false, ctx: 'fin', lv: [15, 15, 15, 15, 15, 15], hot: null, key: '' };
    const tourBtn = $(s, '.umo-tour');
    const free = () => { if (!st.tour) return; st.tour = false; tourBtn.classList.remove('on'); st.lv = st.shown.slice(); st.ctx = st.shownCtx; };
    const setCtx = c => $$(s, '.umo-ctx .btn').forEach(b => b.classList.toggle('on', b.dataset.c === c));
    $$(s, '.umo-ctx .btn').forEach(b => b.onclick = () => { free(); st.ctx = b.dataset.c; });
    $(s, '.umo-match').onclick = () => { free(); st.lv = ZONES[st.ctx].z.map(mid); };
    $(s, '.umo-reset').onclick = () => { free(); st.lv = Array(6).fill(15); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    let drag = null;
    const rowAt = p => { const i = Math.floor((p.y - RY0) / RH); return i >= 0 && i < 6 && p.x > BX0 - 30 && p.x < BX1 + 30 ? i : null; };
    const setFrom = p => { st.lv[drag] = Math.round(clamp((p.x - BX0) / (BX1 - BX0)) * 100); st.hot = drag; };
    cv.addEventListener('pointerdown', e => { const p = ptr(cv, e), i = rowAt(p); if (i == null) return; free(); drag = i; cv.setPointerCapture(e.pointerId); setFrom(p); });
    cv.addEventListener('pointermove', e => { if (drag != null) setFrom(ptr(cv, e)); });
    const end = () => { drag = null; }; cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.style.touchAction = 'none';

    const DUR = 20, START = Array(6).fill(15);
    const FM = ZONES.fin.z.map(mid), JM = ZONES.jab.z.map(mid), OVER = FM.map((v, i) => i === 3 || i === 5 ? 96 : i === 1 ? 88 : v);
    const mix = (a, b, k) => a.map((v, i) => Math.round(lerp(v, b[i], ease(clamp(k)))));
    function tourState(t) {
      if (t < 2) return { ctx: 'fin', lv: START, hot: null, msg: 'A heavy finisher with every element under-delivered. It works, but it doesn’t feel like the hit the player expects.' };
      if (t < 6) return { ctx: 'fin', lv: mix(START, FM, (t - 2) / 3), hot: null, msg: 'Raise each element to its match zone. Each line sits somewhere different: input response is about speed, VFX and screen shake are about weight.' };
      if (t < 10) return { ctx: 'fin', lv: mix(FM, OVER, (t - 6) / 2), hot: 3, msg: 'Push animation, VFX and screen shake into over-deliver. The cost climbs with the square of the level, and the budget runs out long before the bar does.' };
      if (t < 13) return { ctx: 'fin', lv: mix(OVER, FM, (t - 10) / 2), hot: null, msg: 'Back on the line, every element matches and the budget has room left.' };
      if (t < 16) return { ctx: 'jab', lv: FM, hot: 5, msg: 'Same levels on a light jab: the expectations move, so most elements now over-deliver. A jab with finisher-level shake feels overtuned.' };
      return { ctx: 'jab', lv: mix(FM, JM, (t - 16) / 2.5), hot: null, msg: 'Match the jab and most of the budget comes back, ready for the moments that call for it.' };
    }
    function render() {
      let ctx = st.ctx, lv = st.lv, hot = st.hot, msg;
      if (st.tour) ({ ctx, lv, hot, msg } = tourState(st.t));
      st.shown = lv.slice(); st.shownCtx = ctx;
      setCtx(ctx);
      const r = draw(g, ctx, lv, hot);
      if (!st.tour) {
        const over = lv.filter((l, i) => zoneOf(l, ZONES[ctx].z[i]) === 'over').length, under = lv.filter((l, i) => zoneOf(l, ZONES[ctx].z[i]) === 'under').length;
        msg = r.spent > BUDGET ? 'Over budget. Find the element that over-delivers the most and pull it back to its line.'
          : r.nMatch === 6 ? 'Every element matches, and the budget has room left for the moments that call for more.'
          : `${under} under, ${r.nMatch} matching, ${over} over. Under-delivering reads as unresponsive or weak; over-delivering spends budget the player won’t notice.`;
      }
      const key = [Math.round(r.spent), r.nMatch, msg].join('|'); if (key === st.key) return; st.key = key;
      say($(s, '.umo-out'), msg);
      $(s, '.umo-stats').innerHTML = `<div class="g"><b>${r.nMatch} / 6</b><span>elements matching</span></div><div class="${r.spent > BUDGET ? 'r' : 'y'}"><b>${Math.round(r.spent)}</b><span>spent of a ${BUDGET} budget</span></div>`;
    }
    s._api = { seek(t) { st.frozen = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    window.__seek = t => s._api.seek(t); window.__dur = () => DUR;
    return dt => { if (st.tour) { if (!st.frozen) st.t += dt; if (st.t > DUR) st.t = 0; } render(); };
  });
})();
