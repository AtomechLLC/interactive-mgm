/* Three ways to grow toughness (DGMS M8 Balancing, slides 140-157 and the bonus math about 409-425).
   curves:  one "upgrade points" slider; survivable damage for damage reduction (to infinity at 100%), effective health
            and resistance, plus the damage a 100-damage hit deals under each, and the tooltip each one prints.
   ladder:  the same value (+100 survivable) bought again and again: the reduction tooltip shrinks, resistance stays +100.
            Slide 149 corrected: from 50%, surviving 400 is +25 points additive or another 50% multiplicative.
   gallery: six growth curves with "best for" and "downside".
   Every frame is a pure function of t (tour) or the controls, so __seek is deterministic. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585;
  const COL = { dr: '#e5322d', eh: '#2ea3dc', res: '#8a4fd6' };
  const panel = g => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.8)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const txt = (g, s, x, y, font, col = C.ink, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); };
  function wrap(g, s, x, y, maxW, lh, font, col = C.ink) {
    g.font = font; const words = s.split(' '); let line = '', yy = y;
    for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { txt(g, line, x, yy, font, col); line = w; yy += lh; } else line = t; }
    if (line) txt(g, line, x, yy, font, col); return yy;
  }
  const fmt = v => (Math.abs(v - Math.round(v)) < .05 ? String(Math.round(v)) : v.toFixed(1));
  const free = st => { st.tour = false; st.tourBtn.classList.remove('on'); };
  const apis = {};

  /* ---------- 1: three curves ---------- */
  const surv = { dr: n => n >= 20 ? Infinity : 100 / (1 - .05 * n), eh: n => 100 * (1 + .05 * n), res: n => 100 + 5 * n };
  const taken = { dr: n => Math.max(0, 100 - 5 * n), eh: () => 100, res: n => 10000 / (100 + 5 * n) };
  canvasDemo('tg-curves', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, n: 10, key: '', tourBtn: $(s, '.tc-tour') };
    const nIn = $(s, '.tc-n');
    nIn.oninput = () => { free(st); st.n = +nIn.value; };
    st.tourBtn.onclick = () => { st.tour = true; st.t = 0; st.tourBtn.classList.add('on'); };
    const X = n => 80 + n / 20 * 540, Y1 = v => 300 - v / 1000 * 250, Y2 = v => 540 - v / 100 * 130;
    function line(f, col, y, dash, hi = 19.98) {
      g.strokeStyle = col; g.lineWidth = 4; g.setLineDash(dash || []); g.beginPath();
      for (let k = 0; k <= 400; k++) { const n = hi * k / 400, v = f(n); const py = y(Math.min(v, 1100)); k ? g.lineTo(X(n), py) : g.moveTo(X(n), py); }
      g.stroke(); g.setLineDash([]);
    }
    function render() {
      let n = st.n;
      if (st.tour) { n = st.t < 11 ? Math.floor(lerp(0, 19.99, clamp(st.t / 11))) : st.t < 13 ? 19 : 20; nIn.value = n; }
      $(s, '.tc-nv').textContent = n;
      T.use(g); panel(g);
      // top chart: survivable damage
      txt(g, 'Damage you survive (base 100 HP)', 30, 26, '800 18px Montserrat');
      g.strokeStyle = '#e3d8bf'; g.lineWidth = 1;
      [0, 250, 500, 750, 1000].forEach(v => { g.beginPath(); g.moveTo(X(0), Y1(v)); g.lineTo(X(20), Y1(v)); g.stroke(); txt(g, String(v), X(0) - 10, Y1(v), '500 13px Jost', C.muted, 'right'); });
      g.save(); g.beginPath(); g.rect(X(0) - 4, Y1(1000) - 4, X(20) - X(0) + 8, Y1(0) - Y1(1000) + 8); g.clip();
      line(surv.eh, COL.eh, Y1); line(surv.res, COL.res, Y1, [10, 9]); line(surv.dr, COL.dr, Y1);
      g.restore();
      // the run to infinity
      g.fillStyle = COL.dr; g.beginPath(); g.moveTo(X(18.4), Y1(1000) - 18); g.lineTo(X(18.4) - 8, Y1(1000) - 4); g.lineTo(X(18.4) + 8, Y1(1000) - 4); g.fill();
      txt(g, 'to infinity at 100%', X(18.4) - 14, Y1(1000) - 14, '700 14px Jost', C.redDk, 'right');
      txt(g, 'Effective health and resistance: one straight line', X(20), Y1(surv.eh(20)) + 20, '700 14px Jost', C.ink, 'right');
      // bottom chart: one 100-damage hit
      txt(g, 'Damage taken from one 100-damage hit', 30, 366, '800 18px Montserrat');
      [0, 50, 100].forEach(v => { g.strokeStyle = '#e3d8bf'; g.beginPath(); g.moveTo(X(0), Y2(v)); g.lineTo(X(20), Y2(v)); g.stroke(); txt(g, String(v), X(0) - 10, Y2(v), '500 13px Jost', C.muted, 'right'); });
      line(taken.eh, COL.eh, Y2, null, 20); line(taken.res, COL.res, Y2, null, 20); line(taken.dr, COL.dr, Y2, null, 20);
      txt(g, 'health: every hit still deals 100', X(20), Y2(100) + 16, '600 13px Jost', C.muted, 'right');
      for (let k = 0; k <= 20; k += 5) txt(g, String(k), X(k), 560, '500 13px Jost', C.muted, 'center');
      txt(g, 'upgrade points', X(20), 576, '600 13px Jost', C.muted, 'right');
      // cursor
      g.strokeStyle = 'rgba(21,32,68,.5)'; g.lineWidth = 2; g.setLineDash([4, 5]); g.beginPath(); g.moveTo(X(n), 44); g.lineTo(X(n), 545); g.stroke(); g.setLineDash([]);
      ['eh', 'res', 'dr'].forEach(k => {
        const v = surv[k](n); if (v <= 1000) { g.fillStyle = COL[k]; g.beginPath(); g.arc(X(n), Y1(v), 7, 0, 7); g.fill(); }
        g.fillStyle = COL[k]; g.beginPath(); g.arc(X(n), Y2(taken[k](n)), 6, 0, 7); g.fill();
      });
      // tooltip cards
      const S = { dr: surv.dr(n), eh: surv.eh(n), res: surv.res(n) };
      const showS = v => v === Infinity ? 'no limit' : String(Math.round(v));
      const drNeed = n >= 20 ? null : 100 * ((1 - 100 / (S.dr + 100)) - .05 * n);
      const cards = [
        ['dr', 'Damage reduction', '+5% damage reduction', `${5 * n}% reduction · survive ${showS(S.dr)}`,
          n >= 20 ? 'Immortal: nothing can kill you' : n === 19 ? 'Next point: immortal' : `Next point: +${Math.round(surv.dr(n + 1) - S.dr)} survivable`,
          drNeed === null ? 'No upgrade can add more' : `+100 survivable takes +${fmt(drNeed)}%`],
        ['eh', 'Effective health', '+5% effective health', `+${5 * n}% health · survive ${fmt(S.eh)}`, 'Next point: +5 survivable', '+100 survivable takes +100%'],
        ['res', 'Resistance', '+5 resistance', `${5 * n} resistance · takes ${fmt(taken.res(n))}% · survive ${fmt(S.res)}`, 'Next point: +5 survivable', '+100 survivable takes +100 resistance'],
      ];
      cards.forEach(([k, name, tip, l1, l2, l3], i) => {
        const x = 660, y = 22 + i * 186, w = 362, h = 172;
        g.fillStyle = '#fffaf0'; g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(x, y, w, h, 10); g.fill(); g.stroke();
        g.fillStyle = COL[k]; g.beginPath(); g.roundRect(x, y, 8, h, [10, 0, 0, 10]); g.fill();
        txt(g, name, x + 22, y + 22, '800 18px Montserrat');
        g.fillStyle = C.navy; g.beginPath(); g.roundRect(x + 22, y + 40, 230, 30, 6); g.fill();
        txt(g, tip, x + 32, y + 55, '700 15px Jost', C.gold);
        txt(g, 'tooltip', x + 262, y + 55, '600 13px Jost', C.muted);
        txt(g, l1, x + 22, y + 88, '600 15px Jost', C.ink);
        txt(g, l2, x + 22, y + 114, '600 15px Jost', k === 'dr' && n >= 18 ? C.redDk : C.ink);
        txt(g, l3, x + 22, y + 142, '700 15px Jost', k === 'dr' ? C.redDk : C.good);
      });
      const key = n; if (key === st.key) return; st.key = key;
      say($(s, '.tc-out'), n === 0
        ? 'At zero points all three survive 100 damage. 1% damage reduction means taking 99 instead of 100; 1% effective health means dying after 101 instead of 100.'
        : n < 10 ? `${n} points: reduction survives ${showS(S.dr)}, health and resistance survive ${fmt(S.eh)}. They feel alike so far.`
        : n < 20 ? `${n} points: ${5 * n}% reduction survives ${showS(S.dr)}. Each new 5% is worth more than the last, yet the tooltip never changes, so players can't tell how much stronger they got.`
        : '100% damage reduction: immortal. Health and resistance are still a straight line at 200, and the tooltip still means the same thing it did at point one.');
    }
    apis['tg-curves'] = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => 16 };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > 16) st.t = 0; render(); };
  });

  /* ---------- 2: same value, shrinking numbers ---------- */
  const STEPS = [1, 2, 3, 4, 5, 6, 7].map(k => {
    const a = 100 * k, b = 100 * (k + 1);
    return { from: a, to: b, add: 100 * (100 / a - 100 / b), mul: 100 * (1 - a / b), total: 100 * (1 - 100 / b), res: b - 100 };
  });
  canvasDemo('tg-ladder', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, mode: 'add', key: '', tourBtn: $(s, '.tl-tour') };
    $$(s, '.tl-mode .btn').forEach(b => b.onclick = () => { free(st); st.mode = b.dataset.m; });
    st.tourBtn.onclick = () => { st.tour = true; st.t = 0; st.tourBtn.classList.add('on'); };
    const x0 = 90, x1 = 1010, yb = 380, yt = 110, gw = (x1 - x0) / 7, Y = v => yb - v / 100 * (yb - yt);
    function render() {
      let mode = st.mode, shown = 7, t = st.t;
      if (st.tour) { mode = t < 9 ? 'add' : 'mul'; shown = t < 9 ? clamp(Math.floor(t / 1) + 1, 1, 7) : 7; }
      $$(s, '.tl-mode .btn').forEach(b => b.classList.toggle('on', b.dataset.m === mode));
      T.use(g); panel(g);
      txt(g, 'Each step buys the same: survive 100 more damage', 30, 30, '800 20px Montserrat');
      txt(g, 'Bar height: the number the upgrade tooltip prints', 30, 58, '600 15px Jost', C.muted);
      // legend
      [['dr', mode === 'add' ? 'Damage reduction (additive points)' : 'Damage reduction (multiplicative %)'], ['res', 'Resistance']].forEach(([k, l], i) => {
        const lx = 620 + i * 290; g.fillStyle = COL[k]; g.beginPath(); g.roundRect(lx, 50, 16, 16, 3); g.fill(); txt(g, l, lx + 24, 58, '600 14px Jost');
      });
      g.strokeStyle = '#e3d8bf'; g.lineWidth = 1;
      [0, 25, 50, 75, 100].forEach(v => { g.beginPath(); g.moveTo(x0, Y(v)); g.lineTo(x1, Y(v)); g.stroke(); txt(g, String(v), x0 - 10, Y(v), '500 13px Jost', C.muted, 'right'); });
      STEPS.forEach((p, i) => {
        if (i >= shown) return;
        const cx = x0 + gw * (i + .5), bw = 40;
        const grow = st.tour && t < 9 ? ease(clamp(t - i)) : 1;
        const dv = (mode === 'add' ? p.add : p.mul) * grow, rv = 100 * grow;
        g.fillStyle = COL.dr; g.beginPath(); g.roundRect(cx - bw - 8, Y(dv), bw, yb - Y(dv), [4, 4, 0, 0]); g.fill();
        g.fillStyle = COL.res; g.globalAlpha = .85; g.beginPath(); g.roundRect(cx + 8, Y(rv), bw, yb - Y(rv), [4, 4, 0, 0]); g.fill(); g.globalAlpha = 1;
        txt(g, `+${fmt(mode === 'add' ? p.add : p.mul)}%`, cx - bw / 2 - 8, Y(dv) - 14, '800 15px Montserrat', C.redDk, 'center');
        txt(g, '+100', cx + bw / 2 + 8, Y(rv) - 14, '800 15px Montserrat', '#5b2fa0', 'center');
        txt(g, `${p.from} → ${p.to}`, cx, yb + 20, '700 15px Jost', C.ink, 'center');
        txt(g, `${fmt(p.total)}% total`, cx, yb + 42, '600 14px Jost', C.redDk, 'center');
        txt(g, `${p.res} resistance`, cx, yb + 62, '600 14px Jost', '#5b2fa0', 'center');
      });
      txt(g, 'survive', x0 - 10, yb + 20, '600 13px Jost', C.muted, 'right');
      // slide 149: from 50% (survive 200) to survive 400 spans steps 2 and 3
      if (shown >= 3 && (!st.tour || t > 3.2)) {
        const a = x0 + gw * 1 + 10, b = x0 + gw * 3 - 10, y = 470;
        g.strokeStyle = C.navy; g.lineWidth = 2.5; g.beginPath(); g.moveTo(a, y); g.lineTo(a, y + 10); g.lineTo(b, y + 10); g.lineTo(b, y); g.stroke();
        g.fillStyle = C.navy; g.beginPath(); g.roundRect(a - 30, y + 20, 600, 70, 8); g.fill();
        txt(g, 'Slide 149: from 50% reduction, survive 400 instead of 200', a - 16, y + 38, '700 15px Jost', C.gold);
        txt(g, mode === 'add' ? 'Additive: +16.7 then +8.3 = +25 points, 75% total (25 taken)' : 'Multiplicative: another 50% on top. 0.5 × 0.5 = 0.25 taken',
          a - 16, y + 66, '600 15px Jost', '#fff');
      }
      const key = mode + shown; if (key === st.key) return; st.key = key;
      say($(s, '.tl-out'), mode === 'add'
        ? 'Every step is worth exactly the same (+100 survivable), but the reduction tooltip goes +50%, +16.7%, +8.3%, +5%... The numbers feel less and less impressive as you upgrade. Resistance prints +100 every time.'
        : 'Multiplied together, reduction still shrinks: +50%, +33%, +25%, +20%. The math gets complicated, and players can no longer tell how much stronger they are getting.');
    }
    apis['tg-ladder'] = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => 16 };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > 16) st.t = 0; render(); };
  });

  /* ---------- 3: curve gallery ---------- */
  const CURVES = [
    { name: 'Linear', f: 'y = a + b·x', fn: u => u, best: 'Stats players add in their heads: HP per level, or resistance as S = (armor + 100) / 100.', down: 'Each step is a smaller share of the total, so late steps feel smaller.' },
    { name: 'Exponential', f: 'y = a·rˣ', fn: u => (Math.pow(2, 6 * u) - 1) / 63, best: 'Costs and XP that must outrun an income which also grows.', down: 'Runs away fast; one tuning change shifts every later level.' },
    { name: 'Geometric', f: 'y = a·xᵏ', fn: u => u * u, best: 'Growth that speeds up steadily without exploding, like enemy HP across a campaign.', down: 'Still outgrows linear player stats, so the gap widens slowly.' },
    { name: 'Logarithmic', f: 'y = a·ln(1 + x)', fn: u => Math.log(1 + 20 * u) / Math.log(21), best: 'Diminishing returns on stacking one stat.', down: 'Late upgrades feel flat, and players stop investing in them.' },
    { name: 'Level-up', f: 'y = floor(x / step)', fn: u => Math.floor(u * 5 + 1e-9) / 5, best: 'Milestones players can see and plan for, like a new skill every 5 levels.', down: 'Flat stretches between steps, then a big jump at each threshold.' },
    { name: 'Arctangent', f: 'y = cap·(2/π)·atan(x / k)', fn: u => (2 / Math.PI) * Math.atan(6 * u), cap: true, best: 'A soft cap: a stat that nears a ceiling but never reaches it, like reduction below 100%.', down: 'Near the cap upgrades do almost nothing, and the tooltip is hard to write.' },
  ];
  canvasDemo('tg-gallery', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, pick: 0, x: 50, key: '', tourBtn: $(s, '.tg-tour') };
    const pick = $(s, '.tg-pick'), xIn = $(s, '.tg-x');
    pick.innerHTML = CURVES.map((c, i) => `<button class="btn${i ? '' : ' on'}" data-i="${i}">${c.name}</button>`).join('');
    $$(pick, '.btn').forEach(b => b.onclick = () => { free(st); st.pick = +b.dataset.i; });
    xIn.oninput = () => { free(st); st.x = +xIn.value; };
    st.tourBtn.onclick = () => { st.tour = true; st.t = 0; st.tourBtn.classList.add('on'); };
    const PER = 2.5;
    function render() {
      let p = st.pick, x = st.x;
      if (st.tour) { p = clamp(Math.floor(st.t / PER), 0, 5); x = Math.round(100 * ease(clamp((st.t - p * PER) / (PER * .8)))); xIn.value = x; }
      $$(pick, '.btn').forEach(b => b.classList.toggle('on', +b.dataset.i === p));
      $(s, '.tg-xv').textContent = x;
      const u = x / 100;
      T.use(g); panel(g);
      CURVES.forEach((c, i) => {
        const cx = 12 + (i % 3) * 344, cy = 12 + Math.floor(i / 3) * 286, w = 328, h = 274, on = i === p;
        g.fillStyle = on ? '#fff6dc' : '#fffaf0'; g.strokeStyle = on ? '#e0a92d' : '#cdbf9f'; g.lineWidth = on ? 4 : 2;
        g.beginPath(); g.roundRect(cx, cy, w, h, 10); g.fill(); g.stroke();
        txt(g, c.name, cx + 16, cy + 22, '800 18px Montserrat');
        txt(g, c.f, cx + w - 14, cy + 22, '600 14px Jost', C.muted, 'right');
        const ax = cx + 30, ay = cy + 150, aw = w - 50, ah = 100;
        g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(ax, ay - ah - 6); g.lineTo(ax, ay); g.lineTo(ax + aw, ay); g.stroke();
        if (c.cap) { g.strokeStyle = C.muted; g.lineWidth = 1.5; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(ax, ay - ah); g.lineTo(ax + aw, ay - ah); g.stroke(); g.setLineDash([]); txt(g, 'cap', ax + 8, ay - ah - 10, '600 12px Jost', C.muted, 'left'); }
        g.strokeStyle = on ? C.red : '#9aa0c4'; g.lineWidth = on ? 4 : 3; g.beginPath();
        for (let k = 0; k <= 200; k++) { const uu = k / 200, px = ax + aw * uu, py = ay - ah * c.fn(uu); k ? g.lineTo(px, py) : g.moveTo(px, py); }
        g.stroke();
        g.fillStyle = on ? C.redDk : '#6b7099'; g.beginPath(); g.arc(ax + aw * u, ay - ah * c.fn(u), on ? 7 : 5, 0, 7); g.fill();
        const yy = wrap(g, 'Best for: ' + c.best, cx + 16, cy + 176, w - 30, 18, '600 14px Jost', C.ink);
        wrap(g, 'Downside: ' + c.down, cx + 16, yy + 24, w - 30, 18, '600 14px Jost', C.redDk);
      });
      const key = p + ':' + x; if (key === st.key) return; st.key = key;
      const c = CURVES[p], v = c.fn(u), dv = c.fn(Math.min(1, u + .01)) - v;
      say($(s, '.tg-out'), `<b>${c.name}.</b> At level ${x} the curve is ${Math.round(v * 100)}% of the way up, and the next level adds ${(dv * 100).toFixed(1)}%. Best for: ${c.best.charAt(0).toLowerCase() + c.best.slice(1)}`);
    }
    apis['tg-gallery'] = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => PER * 6 };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > PER * 6) st.t = 0; render(); };
  });

  window.__seek = (t, w) => apis[w].seek(t);
  window.__dur = w => apis[w].dur();
})();
