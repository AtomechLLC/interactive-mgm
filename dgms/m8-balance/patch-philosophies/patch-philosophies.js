/* Three patch philosophies (Module 8, Part 1, slides 17-21).
   Three characters start slightly apart. Each panel applies one habit for ten patches: rotate who is on top,
   buff the weakest up past the top, or nerf the strongest down past the bottom. A thin line tracks the roster average,
   and a dashed line is the target power level the designer chose. Pure function of t, so __seek is deterministic. */
(function () {
  const { $, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, NP = 10;
  const CH = [['A', '#5562eb'], ['B', '#2fae63'], ['C', '#8a4fd6']];
  const WAYS = [
    { key: 'rot', title: 'Rotate the top', who: 'the Blizzard way', rule: 'strongest goes to the bottom' },
    { key: 'up', title: 'Buff the rest up', who: 'the Valve way', rule: 'weakest goes above the top' },
    { key: 'down', title: 'Nerf the top down', who: 'the Riot way', rule: 'strongest goes below the bottom' },
  ];
  function sim(key, s) {
    let v = [1 + s, 1, 1 - s]; const out = [v.slice()];
    for (let p = 1; p <= NP; p++) {
      v = v.slice();
      const hi = v.indexOf(Math.max(...v)), lo = v.indexOf(Math.min(...v));
      if (key === 'rot') { const top = v[hi]; v[hi] = v[lo]; const mid = [0, 1, 2].find(i => i !== hi && i !== lo); v[lo] = v[mid]; v[mid] = top; }
      if (key === 'up') v[lo] = v[hi] + s * .4;
      if (key === 'down') v[hi] = v[lo] - s * .4;
      out.push(v);
    }
    return out;
  }
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const txt = (g, s, x, y, o = {}) => { g.font = o.font || '600 15px Jost, sans-serif'; g.fillStyle = o.col || C.ink; g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'middle'; g.fillText(s, x, y); };
  const PW = 326, PG = 11, PX0 = 14, TOP = 86, BOT = 470, YLO = 0.2, YHI = 1.9;
  function draw(g, s, upto, target, ta, t) {
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.9)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
    const res = [];
    WAYS.forEach((w, k) => {
      const x0 = PX0 + k * (PW + PG), px = p => x0 + 46 + p / NP * (PW - 64), py = v => BOT - (clamp(v, YLO, YHI) - YLO) / (YHI - YLO) * (BOT - TOP);
      g.fillStyle = '#efe6d2'; g.beginPath(); g.roundRect(x0, 12, PW, H - 24, 12); g.fill();
      txt(g, w.title, x0 + 16, 36, { font: '800 19px Montserrat, Jost, sans-serif' });
      txt(g, `${w.who}: ${w.rule}`, x0 + 16, 60, { font: '500 13px Jost, sans-serif', col: C.muted });
      // grid
      g.strokeStyle = '#d9cba8'; g.lineWidth = 1;
      [0.5, 1, 1.5].forEach(v => { g.beginPath(); g.moveTo(px(0), py(v)); g.lineTo(px(NP), py(v)); g.stroke(); txt(g, v.toFixed(1), px(0) - 8, py(v), { font: '500 12px Jost, sans-serif', col: C.muted, align: 'right' }); });
      for (let p = 0; p <= NP; p += 2) txt(g, String(p), px(p), BOT + 16, { font: '500 12px Jost, sans-serif', col: C.muted, align: 'center' });
      txt(g, 'patch', px(NP / 2), BOT + 36, { font: '600 12px Jost, sans-serif', col: C.muted, align: 'center' });
      const data = sim(w.key, s), whole = Math.floor(upto), frac = upto - whole;
      const at = (i, p) => { if (p <= 0) return data[0][i]; const f = Math.floor(p), k = ease(clamp((p - f) / .25)); return lerp(data[Math.min(NP, f)][i], data[Math.min(NP, f + 1)][i], k); };
      const avgAt = p => mean([0, 1, 2].map(i => at(i, p)));
      // average
      g.strokeStyle = 'rgba(38,44,106,.35)'; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); for (let q = 0; q <= upto + 1e-6; q += .05) { const p = Math.min(q, upto); q ? g.lineTo(px(p), py(avgAt(p))) : g.moveTo(px(p), py(avgAt(p))); } g.lineTo(px(upto), py(avgAt(upto))); g.stroke();
      // characters (patches are steps: a change lands, then holds)
      CH.forEach(([n, col], i) => {
        g.strokeStyle = col; g.lineWidth = 3.5; g.beginPath();
        for (let q = 0; q <= upto + 1e-6; q += .05) { const p = Math.min(q, upto); q ? g.lineTo(px(p), py(at(i, p))) : g.moveTo(px(p), py(at(i, p))); }
        g.lineTo(px(upto), py(at(i, upto))); g.stroke();
        g.fillStyle = col; g.beginPath(); g.arc(px(upto), py(at(i, upto)), 6, 0, Math.PI * 2); g.fill();
        txt(g, n, px(upto) + 9, py(at(i, upto)), { font: '700 12px Montserrat, Jost, sans-serif', col });
      });
      // target
      if (ta > 0) {
        g.save(); g.globalAlpha = ta; g.setLineDash([10, 7]); g.strokeStyle = C.red; g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(px(0), py(target)); g.lineTo(px(NP), py(target)); g.stroke(); g.setLineDash([]);
        T.label('target ' + target.toFixed(2), px(0) + 4, py(target) - 14, 'left', C.red, 12); g.restore();
      }
      const a = avgAt(upto), cur = [0, 1, 2].map(i => at(i, upto)), spread = Math.max(...cur) - Math.min(...cur);
      res.push({ a, spread });
      txt(g, `average ${a.toFixed(2)}`, x0 + 16, BOT + 66, { font: '700 15px Montserrat, Jost, sans-serif' });
      if (ta > 0) { const d = a - target; txt(g, `${d >= 0 ? '+' : ''}${d.toFixed(2)} from target`, x0 + PW - 16, BOT + 66, { font: '700 15px Jost, sans-serif', col: Math.abs(d) < .1 ? '#1a8a4c' : C.red, align: 'right' }); }
    });
    return res;
  }
  const DUR = 17;
  const tourCap = t => t < 1 ? 'Three characters, slightly apart. Each panel patches them a different way.'
    : t < 11 ? 'Rotate: someone new is on top each patch. Buff up: the roster creeps upward. Nerf down: everyone feels less powerful over time.'
    : 'The dashed line is the real point. Recognize the power level you are trying to target, then patch toward it.';
  canvasDemo('patches', (s, cv, g) => {
    const st = { p: NP, s: .15, target: 1, tour: true, held: false, t: 0, key: '' };
    const tourBtn = $(s, '.pp-tour'), pI = $(s, '.pp-p'), sI = $(s, '.pp-s'), tI = $(s, '.pp-t');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); } };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    pI.oninput = () => { manual(); st.p = +pI.value; };
    sI.oninput = () => { manual(); st.s = +sI.value; };
    tI.oninput = () => { manual(); st.target = +tI.value; };
    function info(p, sv, target, res, cap) {
      const key = [p.toFixed(1), sv, target, cap].join(); if (key === st.key) return; st.key = key;
      pI.value = Math.round(p); $(s, '.pp-pv').textContent = Math.floor(p); sI.value = sv; $(s, '.pp-sv').textContent = sv.toFixed(2); tI.value = target; $(s, '.pp-tv').textContent = target.toFixed(2);
      say($(s, '.pp-stats'), res.map((r, k) => `<div class="${['', 'y', 'r'][k]}"><b>${r.a.toFixed(2)}</b><span>${WAYS[k].title.toLowerCase()}: average after patch ${Math.floor(p)}</span></div>`).join(''));
      say($(s, '.pp-out'), cap);
    }
    s._seek = t => { const up = clamp(t - 1, 0, NP), ta = clamp((t - 11.5) / .8); const res = draw(g, .15, up, 1, ta, t); info(up, .15, 1, res, tourCap(t)); };
    window.__seek = t => { st.held = true; s._seek(t); };
    window.__dur = () => DUR;
    return dt => {
      if (st.held) return;
      st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= DUR) st.t = 0; s._seek(st.t); }
      else {
        const res = draw(g, st.s, st.p, st.target, 1, st.t);
        const near = res.map((r, k) => Math.abs(r.a - st.target) < .1 ? WAYS[k].title.toLowerCase() : null).filter(Boolean);
        info(st.p, st.s, st.target, res, near.length ? `At this target, ${near.join(' and ')} land${near.length === 1 ? 's' : ''} within 0.1 of it. Move the target: any of the three habits can be the right one for the power level you choose.` : 'None of the three averages is near this target. A habit is only useful once you know the power level you are aiming for.');
      }
    };
  });
})();
