/* Build Orders: the slides. A tech tree you click to write a build, a deterministic simulation (engine.js)
   that turns it into a clock, and views of that clock: a base view, a production timeline and charts. */
(function () {
  const { $, $$, demo, say, raf, store } = FPF.kit;
  const { T, run, check, fmt, PRESETS } = BO;
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- icons: one stroke glyph per tech node, drawn on a 24 × 24 grid ---------- */
  const ICON = {
    base: 'M4 20V10l8-6 8 6v10h-5v-5H9v5z',
    supply: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8',
    refinery: 'M12 3c3 5 6 8 6 12a6 6 0 0 1-12 0c0-4 3-7 6-12z',
    barracks: 'M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z',
    bunker: 'M3 19h18M5 19v-5a7 7 0 0 1 14 0v5M9 14h6',
    lab: 'M9 3h6M10 3v6l-5 10h14l-5-10V3M8 14h8',
    factory: 'M3 20V10l5 3v-3l5 3v-3l5 3V5h3v15z',
    starport: 'M12 3l3 8 7 3-7 2-3 6-3-6-7-2 7-3z',
    worker: 'M5 19l8-8M13 5c3 0 6 2 7 6-3-2-6-2-8-1zM13 11l-2-2',
    soldier: 'M12 4a3 3 0 1 1 0 6 3 3 0 1 1 0-6zM6 20c0-4 3-7 6-7s6 3 6 7',
    ranger: 'M12 3a3 3 0 1 1 0 6 3 3 0 1 1 0-6zM5 21v-4c0-3 3-5 7-5s7 2 7 5v4zM9 16h6',
    raider: 'M3 15h18l-3-5H8zM7 18.5a1.5 1.5 0 1 0 .01 0M17 18.5a1.5 1.5 0 1 0 .01 0',
    tank: 'M3 14h18v4H3zM6 14l2-4h8l2 4M12 10V7h8',
    gunship: 'M12 2v20M4 12l8-3 8 3M8 20h8',
    stim: 'M13 2L5 14h6l-1 8 8-12h-6z',
  };
  const icon = (id, size = 22, col = '#fff') => `<svg class="bo-ico" viewBox="0 0 24 24" width="${size}" height="${size}"><path d="${ICON[id]}" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const chip = id => `<span class="bo-chip" style="--c:${T[id].col}">${icon(id, 18, '#152044')}</span>`;
  const named = id => `<b class="bo-named" style="--c:${T[id].col}">${chip(id)}${T[id].name}</b>`;
  const cost = it => [it.ore ? `${it.ore} ore` : '', it.gas ? `${it.gas} gas` : '', `${it.time}s`, it.sup ? `${it.sup} supply` : '', it.give ? `+${it.give} supply` : '', it.pow ? `power ${it.pow}` : '', it.def ? `defence ${it.def}` : ''].filter(Boolean).join(' · ');

  /* ---------- the tech tree, top down: what unlocks what ---------- */
  const POS = {
    base: [220, 32],
    worker: [64, 114], supply: [220, 114], refinery: [376, 114],
    barracks: [220, 196],
    soldier: [42, 278], bunker: [116, 278], lab: [194, 278], factory: [320, 278],
    ranger: [150, 360], stim: [228, 360], raider: [282, 360], tank: [344, 360], starport: [406, 360],
    gunship: [406, 442],
  };
  const EDGES = [['base', 'worker', 'p'], ['base', 'supply'], ['base', 'refinery'], ['supply', 'barracks'], ['barracks', 'soldier', 'p'], ['barracks', 'bunker'], ['barracks', 'lab'],
    ['barracks', 'factory'], ['lab', 'ranger'], ['lab', 'stim', 'p'], ['factory', 'raider', 'p'], ['factory', 'tank', 'p'], ['factory', 'starport'], ['starport', 'gunship', 'p']];

  function tree(svg, tipBox, onPick) {
    svg.setAttribute('viewBox', '0 0 440 486');
    svg.innerHTML = '';
    const gE = svgEl('g', {}, svg), gN = svgEl('g', {}, svg), nodes = {};
    for (const [a, b, p] of EDGES) {
      const [x1, y1] = POS[a], [x2, y2] = POS[b], my = (y1 + y2) / 2;
      svgEl('path', { d: `M${x1},${y1 + 44} C${x1},${my + 14} ${x2},${my - 6} ${x2},${y2 - 26}`, class: 'bo-edge' + (p ? ' prod' : ''), 'data-a': a, 'data-b': b }, gE);
    }
    for (const id in POS) {
      const [x, y] = POS[id], it = T[id];
      const g = svgEl('g', { class: `bo-node k-${it.kind}`, transform: `translate(${x},${y})`, tabindex: 0, role: 'button', 'aria-label': it.name }, gN);
      svgEl('circle', { r: 27, class: 'bo-halo' }, g);
      if (it.kind === 'unit' || it.kind === 'tech') svgEl('circle', { r: 22, class: 'bo-disc', fill: it.col }, g);
      else svgEl('rect', { x: -22, y: -22, width: 44, height: 44, rx: 9, class: 'bo-disc', fill: it.col }, g);
      const ic = svgEl('g', { transform: 'translate(-12,-12)' }, g);
      svgEl('path', { d: ICON[id], fill: 'none', stroke: '#152044', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, ic);
      svgEl('text', { y: 38, class: 'bo-nlabel' }, g).textContent = it.name;
      if (it.gas) { const gb = svgEl('g', { transform: 'translate(19,-19)', class: 'bo-gasdot' }, g); svgEl('circle', { r: 6 }, gb); }
      const badge = svgEl('g', { class: 'bo-badge', transform: 'translate(-21,-21)' }, g);
      svgEl('circle', { r: 10 }, badge); const bt = svgEl('text', { y: 4 }, badge);
      g.addEventListener('pointerenter', () => tipFor(id));
      g.addEventListener('pointerleave', () => tipFor(null));
      g.addEventListener('focus', () => tipFor(id));
      g.addEventListener('blur', () => tipFor(null));
      g.addEventListener('click', () => onPick(id));
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onPick(id); } });
      nodes[id] = { g, bt };
    }
    let locks = {};
    function tipFor(id) {
      tipBox.classList.toggle('on', !!id);
      if (!id) return;
      tipBox.classList.toggle('top', POS[id][1] > 220);   // keep the card off the node you're pointing at
      const it = T[id], lk = locks[id];
      say(tipBox, `<div class="bo-tip-h">${named(id)}<small>${{ bld: 'building', addon: 'add-on', unit: 'unit', tech: 'research' }[it.kind]}</small></div>
        <div class="bo-tip-c">${cost(it)}</div><p>${it.tip}</p>${lk ? `<p class="bo-tip-lock">🔒 Needs ${lk.map(r => T[r].name).join(' and ')} earlier in your build.</p>` : `<p class="bo-tip-add">Click to add${id === 'worker' ? ' one extra (workers are already made nonstop)' : ''}.</p>`}`);
    }
    return {
      // lock state for an insertion point: what would be invalid if added there
      update(prefix, counts) {
        locks = {};
        for (const id in POS) {
          const bad = check([...prefix, { id }]).pop();
          locks[id] = bad;
          nodes[id].g.classList.toggle('locked', !!bad);
          const n = counts[id] || 0;
          nodes[id].g.classList.toggle('has', n > 0);
          nodes[id].bt.textContent = n;
        }
        $$(svg, '.bo-edge').forEach(e => e.classList.toggle('live', !locks[e.dataset.b] && !locks[e.dataset.a]));
      },
      flash(id) { const g = nodes[id].g; g.classList.remove('flash'); void g.getBBox(); g.classList.add('flash'); },
      locks: () => locks,
    };
  }

  /* ---------- the production timeline: one lane per producer, packed rows for construction ---------- */
  const PRODUCERS = ['base', 'barracks', 'factory', 'starport'];
  function gantt(svg, R, H, opts = {}) {
    const W = svg.parentNode.clientWidth - 2 || 800, L = 112, rowH = opts.rowH || 17, top = 18;
    const X = t => L + (t / H) * (W - L - 8);
    // lanes
    const lanes = R.lanes.filter(l => PRODUCERS.includes(l.type));
    const startOf = l => { const r = R.runs.find(r => r.build && r.lane === l.i); return r ? r.start + r.travel : 0; };
    const shown = lanes.filter(l => startOf(l) < H);
    // construction rows, packed
    const cons = R.runs.filter(r => r.build && r.start < H), rows = [];
    cons.forEach(r => { let k = rows.findIndex(e => e <= r.start - 0.5); if (k < 0) { k = rows.length; rows.push(0); } rows[k] = r.end; r._row = k; });
    const nCons = Math.max(1, rows.length), Hpx = top + (shown.length + nCons) * rowH + 10;
    svg.setAttribute('viewBox', `0 0 ${W} ${Hpx}`); svg.setAttribute('height', Hpx); svg.innerHTML = '';
    const yOfLane = {}; shown.forEach((l, i) => (yOfLane[l.i] = top + i * rowH));
    const consTop = top + shown.length * rowH;
    // axis
    const step = H > 360 ? 60 : 30;
    for (let t = 0; t <= H + 0.01; t += step) {
      svgEl('line', { x1: X(t), x2: X(t), y1: top - 4, y2: Hpx, class: 'bo-grid' }, svg);
      svgEl('text', { x: X(t), y: 12, class: 'bo-axis' }, svg).textContent = fmt(t);
    }
    (R.blocks || []).forEach(([a, b]) => { if (a < H) svgEl('rect', { x: X(a), y: top - 4, width: Math.max(2, X(Math.min(b, H)) - X(a)), height: Hpx - top + 4, class: 'bo-block' }, svg); });
    shown.forEach((l, i) => {
      if (i % 2 === 0) svgEl('rect', { x: 0, y: yOfLane[l.i], width: W, height: rowH, class: 'bo-zebra' }, svg);
      svgEl('text', { x: 6, y: yOfLane[l.i] + rowH - 4.5, class: 'bo-lane', 'font-size': Math.min(12, rowH - 4) }, svg).textContent = l.name;
    });
    svgEl('text', { x: 6, y: consTop + rowH - 4.5, class: 'bo-lane cons', 'font-size': Math.min(12, rowH - 4) }, svg).textContent = 'Workers building';
    svgEl('line', { x1: 0, x2: W, y1: consTop, y2: consTop, class: 'bo-sep' }, svg);
    const bars = [];
    R.runs.forEach((r, k) => {
      if (r.start >= H) return;
      let y;
      if (r.build) y = consTop + r._row * rowH;
      else if (yOfLane[r.lane] != null) y = yOfLane[r.lane];
      else return;
      const it = T[r.id], g = svgEl('g', { class: `bo-bar ${r.build ? 'b' : ''} ${r.step != null ? 'st' : 'auto'} k-${it.kind}`, 'data-k': k }, svg);
      const x0 = X(r.start), x1 = X(Math.min(r.end, H));
      if (r.build) {
        svgEl('rect', { x: x0, y: y + rowH / 2 - 1, width: Math.max(1, X(r.start + r.travel) - x0), height: 2, class: 'bo-travel' }, g);
        svgEl('rect', { x: X(r.start + r.travel), y: y + 2, width: Math.max(1.5, x1 - X(r.start + r.travel)), height: rowH - 4, rx: 3, fill: it.col, class: 'bo-fill' }, g);
      } else svgEl('rect', { x: x0 + 0.5, y: y + 2, width: Math.max(1.5, x1 - x0 - 1), height: rowH - 4, rx: 3, fill: it.col, class: 'bo-fill' + (it.kind === 'tech' || it.kind === 'addon' ? ' hatch' : '') }, g);
      if (x1 - x0 > 16) {
        const ic = svgEl('g', { transform: `translate(${(r.build ? X(r.start + r.travel) : x0) + 2},${y + 2}) scale(${(rowH - 4) / 24})` }, g);
        svgEl('path', { d: ICON[r.id], fill: 'none', stroke: '#152044', 'stroke-width': 2.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, ic);
      }
      svgEl('title', {}, g).textContent = `${T[r.id].name}: ${fmt(r.start)} to ${fmt(r.end)}${r.step != null ? ` (step ${r.step + 1})` : r.id === 'worker' ? ' (constant workers)' : ' (automatic)'}`;
      bars.push({ g, r, k });
    });
    const cur = svgEl('line', { x1: X(0), x2: X(0), y1: top - 6, y2: Hpx, class: 'bo-cursor' }, svg);
    return {
      cursor(t) { const x = X(Math.min(t, H)); cur.setAttribute('x1', x); cur.setAttribute('x2', x); },
      hi(step) { svg.classList.toggle('hl', step != null); bars.forEach(b => b.g.classList.toggle('on', step != null && b.r.step === step)); },
      X,
    };
  }

  /* ---------- line charts: panels share the time axis ---------- */
  function chart(svg, H, panels, opts = {}) {
    const W = svg.parentNode.clientWidth - 2 || 800, L = 112, R = 44, gap = 10, top = 16;
    const ph0 = opts.ph || 64, phs = panels.map(p => p.ph || ph0), Hpx = top + phs.reduce((a, b) => a + b + gap, 0) + 4;
    const X = t => L + (t / H) * (W - L - R);
    svg.setAttribute('viewBox', `0 0 ${W} ${Hpx}`); svg.setAttribute('height', Hpx); svg.innerHTML = '';
    const step = H > 360 ? 60 : 30;
    for (let t = 0; t <= H + 0.01; t += step) {
      svgEl('line', { x1: X(t), x2: X(t), y1: top - 4, y2: Hpx - 4, class: 'bo-grid' }, svg);
      svgEl('text', { x: X(t), y: 11, class: 'bo-axis' }, svg).textContent = fmt(t);
    }
    (opts.bands || []).forEach(([a, b, cls]) => { if (a < H) svgEl('rect', { x: X(a), y: top - 4, width: Math.max(2, X(Math.min(b, H)) - X(a)), height: Hpx - top, class: cls || 'bo-block' }, svg); });
    const dots = [];
    let yAcc = top;
    panels.forEach((p, i) => {
      const ph = phs[i], y0 = yAcc; yAcc += ph + gap;
      const Y = v => y0 + ph - (v / p.max) * ph;
      svgEl('rect', { x: L, y: y0, width: W - L - R, height: ph, class: 'bo-panel' }, svg);
      svgEl('text', { x: 6, y: y0 + 14, class: 'bo-lane' }, svg).textContent = p.label;
      if (p.sub) svgEl('text', { x: 6, y: y0 + 30, class: 'bo-lane sub' }, svg).textContent = p.sub;
      (p.legend || []).forEach((lg, j) => {
        const ly = y0 + 52 + j * 20;
        svgEl('line', { x1: 6, x2: 26, y1: ly - 4, y2: ly - 4, stroke: lg.col, 'stroke-width': 3, 'stroke-dasharray': lg.dash || '' }, svg);
        svgEl('text', { x: 31, y: ly, class: 'bo-lane sub', fill: lg.col }, svg).textContent = lg.name;
      });
      svgEl('text', { x: W - R + 4, y: y0 + 10, class: 'bo-axis l' }, svg).textContent = p.maxLabel ?? Math.round(p.max);
      (p.shade || []).forEach(sh => {
        // fill between two series where a > b
        let d = '';
        for (let t = 0; t <= H; t++) {
          const a = sh.a[t] ?? 0, b = sh.b[t] ?? 0;
          if (a > b) d += `M${X(t)},${Y(Math.min(a, p.max))}V${Y(Math.min(b, p.max))}`;
        }
        svgEl('path', { d, stroke: sh.col, 'stroke-width': Math.max(1.2, (W - L - R) / H + 0.4), opacity: .28, class: 'bo-shade' }, svg);
      });
      p.lines.forEach(ln => {
        let d = '';
        const n = Math.min(H, ln.vals.length - 1);
        for (let t = 0; t <= n; t++) d += `${t ? 'L' : 'M'}${X(t).toFixed(1)},${Y(Math.min(p.max, ln.vals[t])).toFixed(1)}`;
        if (ln.area) svgEl('path', { d: d + `L${X(n)},${y0 + ph}L${X(0)},${y0 + ph}Z`, fill: ln.col, opacity: .18 }, svg);
        svgEl('path', { d, fill: 'none', stroke: ln.col, 'stroke-width': ln.w || 2.4, 'stroke-dasharray': ln.dash || '', opacity: ln.op || 1, 'stroke-linejoin': 'round' }, svg);
        if (!ln.ghost) { const c = svgEl('circle', { r: 4, fill: ln.col, class: 'bo-dot' }, svg); dots.push({ c, ln, Y, max: p.max }); }
      });
    });
    const cur = svgEl('line', { x1: X(0), x2: X(0), y1: top - 6, y2: Hpx - 2, class: 'bo-cursor' }, svg);
    return {
      cursor(t) {
        const x = X(Math.min(t, H)); cur.setAttribute('x1', x); cur.setAttribute('x2', x);
        dots.forEach(d => { const v = d.ln.vals[Math.min(d.ln.vals.length - 1, Math.round(t))] ?? 0; d.c.setAttribute('cx', x); d.c.setAttribute('cy', d.Y(Math.min(d.max, v))); });
      },
    };
  }

  /* ---------- the base view: workers mining, buildings going up, the army gathering ---------- */
  const BASES = [0.2, 0.52, 0.84];
  function field(cv) {
    const g = cv.getContext('2d'), S = 2, W = cv.width / S, Hh = cv.height / S;
    return function draw(R, t, clock, opts = {}) {
      const s = R.at(t), small = Hh < 170, u = Hh / 230;
      g.setTransform(S, 0, 0, S, 0, 0);
      g.clearRect(0, 0, W, Hh);
      // ground
      const bg = g.createLinearGradient(0, 0, 0, Hh); bg.addColorStop(0, '#1b2852'); bg.addColorStop(1, '#121b3a');
      g.fillStyle = bg; g.beginPath(); g.roundRect(0, 0, W, Hh, 10); g.fill();
      g.save(); g.globalAlpha = .07; g.strokeStyle = '#9fc4ff'; g.lineWidth = 1;
      for (let x = 20; x < W; x += 28) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x - 30, Hh); g.stroke(); }
      g.restore();
      const econW = W * (opts.econ || 0.75);
      // the production yard on the right
      g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(econW, 0, W - econW, Hh);
      g.strokeStyle = 'rgba(255,185,81,.35)'; g.setLineDash([4, 5]); g.beginPath(); g.moveTo(econW, 8); g.lineTo(econW, Hh - 8); g.stroke(); g.setLineDash([]);

      // bases, minerals, geysers, workers
      const bases = s.structs.filter(x => x.type === 'base');
      let mining = s.mining, gasW = s.onGas;
      const rC = 24 * u, siteY = Hh * 0.64;
      bases.slice(0, 3).forEach((b, i) => {
        const bx = BASES[i] * econW, by = siteY;
        const done = b.done <= t, prog = done ? 1 : Math.max(0, (t - b.begun) / (b.done - b.begun));
        // mineral arc
        const patches = [];
        for (let k = 0; k < 8; k++) {
          const a = Math.PI * (1.08 + k * 0.12), rr = 76 * u;
          patches.push([bx + Math.cos(a) * rr * 1.05, by + Math.sin(a) * rr * 0.85]);
        }
        patches.forEach(([px, py], k) => {
          g.fillStyle = done ? '#7fd0ff' : 'rgba(127,208,255,.35)';
          g.beginPath(); g.moveTo(px, py - 8 * u); g.lineTo(px + 5 * u, py); g.lineTo(px, py + 6 * u); g.lineTo(px - 5 * u, py); g.closePath(); g.fill();
          g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(px - 1 * u, py - 4 * u, 1.6 * u, 4 * u);
        });
        // geysers
        const gy = [[bx + rC + 30 * u, by - 26 * u], [bx + rC + 34 * u, by + 20 * u]];
        const refs = s.structs.filter(x => x.type === 'refinery').slice(i * 2, i * 2 + 2);
        gy.forEach(([gx, gyy], k) => {
          const rf = refs[k], rd = rf && rf.done <= t;
          g.fillStyle = rd ? '#5fe0a0' : rf ? 'rgba(95,224,160,.45)' : 'rgba(95,224,160,.18)';
          g.beginPath(); g.ellipse(gx, gyy, 11 * u, 7 * u, 0, 0, Math.PI * 2); g.fill();
          if (rf && !rd) ring(gx, gyy, 13 * u, (t - rf.begun) / (rf.done - rf.begun), '#5fe0a0');
          if (!rf && !small) { g.fillStyle = 'rgba(95,224,160,.55)'; g.font = `600 ${9 * u}px Jost`; g.textAlign = 'center'; g.fillText('gas', gx, gyy + 3 * u); }
        });
        // workers on this base's ore
        if (done) {
          const here = Math.min(mining, i === bases.filter(x => x.done <= t).length - 1 ? mining : 16);
          for (let w = 0; w < here; w++) {
            const [px, py] = patches[w % 8], ph = (clock * (0.42 + (w % 5) * 0.03) + w * 0.173) % 1, back = ph > 0.5, f = back ? (1 - ph) * 2 : ph * 2;
            const ex = bx + (px - bx) * (0.35 + 0.6 * f), ey = by + (py - by) * (0.35 + 0.6 * f);
            g.fillStyle = '#e8e2cf'; g.beginPath(); g.arc(ex, ey, 2.6 * u, 0, Math.PI * 2); g.fill();
            if (back) { g.fillStyle = '#7fd0ff'; g.beginPath(); g.arc(ex + 1.6 * u, ey - 1.6 * u, 1.5 * u, 0, Math.PI * 2); g.fill(); }
          }
          mining -= here;
          // gas workers
          const gHere = Math.min(gasW, refs.filter(r => r.done <= t).length * 3);
          for (let w = 0; w < gHere; w++) {
            const [gx, gyy] = gy[Math.floor(w / 3)], ph = (clock * 0.5 + w * 0.33) % 1, f = ph > .5 ? (1 - ph) * 2 : ph * 2;
            g.fillStyle = '#e8e2cf'; g.beginPath(); g.arc(bx + (gx - bx) * (0.4 + 0.55 * f), by + (gyy - by) * (0.4 + 0.55 * f), 2.4 * u, 0, Math.PI * 2); g.fill();
          }
          gasW -= gHere;
        }
        // the base itself
        g.save(); g.translate(bx, by);
        hex(rC, done ? '#ffb951' : 'rgba(255,185,81,.18)', done ? '#152044' : '#ffb951');
        if (!done) ring(0, 0, rC + 5 * u, prog, '#ffb951');
        g.fillStyle = done ? '#152044' : '#ffb951'; g.font = `700 ${11 * u}px Montserrat, Jost`; g.textAlign = 'center';
        g.fillText(i === 0 ? 'MAIN' : done ? `BASE ${i + 1}` : `${Math.round(prog * 100)}%`, 0, 4 * u);
        g.restore();
      });
      // empty expansion sites
      for (let i = bases.length; i < 3; i++) {
        const bx = BASES[i] * econW, by = siteY;
        g.save(); g.translate(bx, by); g.setLineDash([3, 4]); g.strokeStyle = 'rgba(255,185,81,.3)'; g.lineWidth = 1.5;
        g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g.lineTo(Math.cos(a) * rC, Math.sin(a) * rC); } g.closePath(); g.stroke(); g.setLineDash([]);
        g.fillStyle = 'rgba(255,185,81,.5)'; g.font = `600 ${10 * u}px Jost`; g.textAlign = 'center'; g.fillText('open site', 0, 3 * u);
        for (let k = 0; k < 8; k++) { const a = Math.PI * (1.08 + k * 0.12), rr = 76 * u; g.fillStyle = 'rgba(127,208,255,.16)'; g.beginPath(); g.arc(Math.cos(a) * rr * 1.05, Math.sin(a) * rr * .85, 4 * u, 0, Math.PI * 2); g.fill(); }
        g.restore();
      }

      // the yard: one tile per building (not bases or refineries), then the army
      const yard = s.structs.filter(x => !['base', 'refinery'].includes(x.type));
      const tw = Math.round(22 * u), cols = Math.max(1, Math.floor((W - econW - 16) / (tw + 4)));
      yard.forEach((b, k) => {
        const x = econW + 10 + (k % cols) * (tw + 4), y = 10 + Math.floor(k / cols) * (tw + 4);
        if (y > Hh * 0.55) return;
        const done = b.done <= t, it = T[b.type];
        g.globalAlpha = done ? 1 : .35; g.fillStyle = it.col; g.beginPath(); g.roundRect(x, y, tw, tw, 4); g.fill(); g.globalAlpha = 1;
        if (!done) { const p = Math.max(0, (t - b.begun) / (b.done - b.begun)); g.fillStyle = it.col; g.fillRect(x, y + tw * (1 - p), tw, tw * p); }
        g.save(); g.translate(x + tw * .14, y + tw * .14); g.scale(tw * .72 / 24, tw * .72 / 24); g.strokeStyle = '#152044'; g.lineWidth = 2.4; g.lineCap = g.lineJoin = 'round'; g.stroke(new Path2D(ICON[b.type])); g.restore();
      });
      // army blob
      const units = []; for (const id of ['soldier', 'ranger', 'raider', 'tank', 'gunship']) for (let k = 0; k < (s.army[id] || 0); k++) units.push(id);
      const ax = econW + (W - econW) / 2, ay = Hh * 0.79;
      units.forEach((id, k) => {
        const a = k * 2.399963, rr = Math.sqrt(k) * 4.6 * u, sz = { soldier: 2.4, ranger: 3.2, raider: 3.2, tank: 4.2, gunship: 3.8 }[id] * u;
        const x = ax + Math.cos(a) * rr * 1.5 + Math.sin(clock * 2 + k) * .6, y = ay + Math.sin(a) * rr * .8;
        g.fillStyle = T[id].col; g.beginPath();
        if (id === 'gunship') { g.moveTo(x, y - sz - 2); g.lineTo(x + sz, y + sz); g.lineTo(x - sz, y + sz); g.closePath(); }
        else if (id === 'tank' || id === 'raider') g.rect(x - sz, y - sz * .7, sz * 2, sz * 1.4);
        else g.arc(x, y, sz, 0, Math.PI * 2);
        g.fill();
      });
      if (!units.length) { g.fillStyle = 'rgba(255,255,255,.3)'; g.font = `500 ${12 * u}px Jost`; g.textAlign = 'center'; g.fillText('no army yet', ax, ay + 4); }
      g.fillStyle = '#ffb951'; g.font = `700 ${12 * u}px Montserrat, Jost`; g.textAlign = 'center';
      g.fillText(`ARMY ${s.pow.toFixed(s.pow < 10 ? 1 : 0)}${s.def ? `  +${s.def} DEF` : ''}`, ax, Hh - 8);

      // banners
      if (s.blocked && (clock * 2) % 1 < .7) banner('SUPPLY BLOCKED', '#cf2f3b');
      else if (s.ore > 400 && !opts.quiet) banner(`FLOATING ${Math.round(s.ore)} ORE`, '#b36b05');
      function banner(txt, col) {
        g.font = `800 ${13 * u}px Montserrat, Jost`; const w = g.measureText(txt).width + 22 * u;
        g.fillStyle = col; g.beginPath(); g.roundRect(econW / 2 - w / 2, 8 * u, w, 23 * u, 11 * u); g.fill();
        g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(txt, econW / 2, 24.5 * u);
      }
      function hex(r, fill, stroke) {
        g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath();
        g.fillStyle = fill; g.fill(); g.strokeStyle = stroke; g.lineWidth = 2 * u; g.stroke();
      }
      function ring(x, y, r, p, col) { g.strokeStyle = col; g.lineWidth = 3 * u; g.beginPath(); g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, p))); g.stroke(); }
    };
  }

  /* ---------- the HUD in the slide's top-right corner ---------- */
  function hud(box, R, t, extra = '') {
    const s = R.at(t);
    say(box, `<div class="bo-clock-big">${fmt(t)}</div>
      <div class="bo-stat"><i style="--c:#7fd0ff"></i><b>${Math.floor(s.ore)}</b><small>ore · ${Math.round(s.oreRate)}/min</small></div>
      <div class="bo-stat"><i style="--c:#5fe0a0"></i><b>${Math.floor(s.gas)}</b><small>gas · ${Math.round(s.gasRate)}/min</small></div>
      <div class="bo-stat ${s.blocked ? 'bad' : ''}"><i style="--c:#9fc4ff"></i><b>${s.used}/${s.cap}</b><small>${s.blocked ? 'supply blocked!' : 'supply'}</small></div>
      <div class="bo-stat"><i style="--c:#e8e2cf"></i><b>${s.workers}</b><small>workers · ${s.onGas} on gas</small></div>
      <div class="bo-stat"><i style="--c:#ff8a78"></i><b>${s.pow.toFixed(1)}</b><small>army power${s.stim ? ' · stim' : ''}</small></div>${extra}`);
  }

  /* ---------- play / scrub controls ---------- */
  function transport(box, opts) {
    let H = opts.H, t = opts.t ?? 0, playing = false, speed = store.get('bo-speed', 15);
    box.innerHTML = `<button class="bo-play" title="Play">▶</button><input type="range" class="bo-scrub" min="0" max="${H}" step="0.5" value="${t}" aria-label="Game clock">
      <span class="bo-speeds">${[5, 15, 40].map(v => `<button data-sp="${v}" class="${v === speed ? 'on' : ''}">×${v}</button>`).join('')}</span>
      ${opts.horizons ? `<span class="bo-hz">${opts.horizons.map(v => `<button data-h="${v}" class="${v === H ? 'on' : ''}">${fmt(v)}</button>`).join('')}</span>` : ''}`;
    const play = $(box, '.bo-play'), sc = $(box, '.bo-scrub');
    const set = v => { t = Math.max(0, Math.min(H, v)); sc.value = t; opts.onTime(t); };
    sc.oninput = () => { stop(); set(+sc.value); };
    sc.onchange = () => sc.blur();
    play.onclick = () => (playing ? stop() : start());
    $$(box, '[data-sp]').forEach(b => b.onclick = () => { speed = +b.dataset.sp; store.set('bo-speed', speed); $$(box, '[data-sp]').forEach(x => x.classList.toggle('on', x === b)); });
    $$(box, '[data-h]').forEach(b => b.onclick = () => { H = +b.dataset.h; sc.max = H; $$(box, '[data-h]').forEach(x => x.classList.toggle('on', x === b)); opts.onH?.(H); set(Math.min(t, H)); });
    function start() { if (t >= H - 0.5) t = 0; playing = true; play.textContent = '❚❚'; play.classList.add('on'); }
    function stop() { playing = false; play.textContent = '▶'; play.classList.remove('on'); }
    return {
      tick(dt) { if (!playing) return; set(t + dt * speed); if (t >= H) stop(); },
      set, stop, start, get t() { return t; }, get H() { return H; }, get playing() { return playing; },
    };
  }

  /* ---------- the build list ---------- */
  const WAIT = { ore: ['ore', '#b36b05'], gas: ['gas', '#1a8a4c'], supply: ['supply block', '#cf2f3b'], tech: ['tech', '#1f5fbf'], busy: ['busy', '#5d618c'], max: ['max supply', '#cf2f3b'] };
  function waitChips(st) {
    const out = [];
    for (const k in st.wait) if (st.wait[k] >= 0.95) out.push(`<span class="bo-wait" style="--c:${WAIT[k][1]}" title="Waited ${Math.round(st.wait[k])}s for ${WAIT[k][0]}">${WAIT[k][0]} ${Math.round(st.wait[k])}s</span>`);
    return out.join('');
  }
  function stepText(st) {
    if (st.bad) return `never starts: needs ${st.bad.map(r => T[r].name).join(' and ')} earlier`;
    if (st.start == null) return 'never starts in this window';
    const parts = [];
    const w = st.wait, big = Object.keys(w).filter(k => w[k] >= 0.95).sort((a, b) => w[b] - w[a]);
    if (big.length) parts.push(`waited ${big.map(k => `${Math.round(w[k])}s for ${WAIT[k][0]}`).join(', ')}`);
    return `started ${fmt(st.start)}, done ${fmt(st.end)}${parts.length ? ' · ' + parts.join(', ') : ''}`;
  }

  /* ---------- a whole editable simulator: tree + list + views. Used by the sandbox and the drill ---------- */
  function lab(s, cfg) {
    const svgTree = $(s, '.bo-tree'), list = $(s, '.bo-list'), foot = $(s, '.bo-list-foot');
    const fieldDraw = field($(s, '.bo-field')), ganttSvg = $(s, '.bo-gantt'), chartSvg = $(s, '.bo-chart'), hudBox = $(s, '.bo-hud');
    let build = cfg.load(), R, G, C, sel = null, hover = null, undo = [];
    const tr = transport($(s, '.bo-transport'), { H: cfg.H, horizons: cfg.horizons, onTime: t => paint(t), onH: () => rerun(true) });
    const T3 = tree(svgTree, $(s, '.bo-tip'), add);
    function snapshot() { undo.push(JSON.stringify(build)); if (undo.length > 60) undo.shift(); }
    function add(id) {
      const locks = T3.locks();
      if (locks[id]) { T3.flash(id); return; }
      snapshot();
      const at = sel == null ? build.order.length : sel + 1;
      build.order.splice(at, 0, { id });
      sel = at;
      rerun();
      const st = R.steps[at];
      if (st && st.start != null && cfg.followAdd !== false) tr.set(Math.min(tr.H, st.start));
    }
    function rerun(keepT) {
      cfg.save(build);
      R = run(build, { until: Math.max(tr.H, cfg.runUntil || 0) });
      renderList();
      const prefix = build.order.slice(0, sel == null ? build.order.length : sel + 1), counts = {};
      build.order.forEach(o => (counts[o.id] = (counts[o.id] || 0) + 1));
      T3.update(prefix, counts);
      G = gantt(ganttSvg, R, tr.H);
      if (chartSvg) C = chart(chartSvg, tr.H, econPanels(R, tr.H), { bands: R.blocks.map(b => [...b, 'bo-block']), ph: 46 });
      cfg.onRun?.(R, build);
      paint(tr.t);
    }
    function renderList() {
      list.innerHTML = build.order.map((o, i) => {
        const st = R.steps[i], it = T[o.id];
        return `<li class="bo-step ${sel === i ? 'sel' : ''} ${st.bad ? 'bad' : ''} ${st.start == null && !st.bad ? 'never' : ''}" data-i="${i}" draggable="true" title="${esc(stepText(st))}">
          <span class="bo-sup">${st.supply ?? '–'}</span>${chip(o.id)}<span class="bo-nm">${it.name}</span><span class="bo-at">${st.start != null ? fmt(st.start) : st.bad ? 'locked' : '—'}</span>
          <button class="bo-x" title="Remove" aria-label="Remove">×</button><span class="bo-waits">${st.bad ? `<span class="bo-wait" style="--c:#cf2f3b">needs ${st.bad.map(r => T[r].name).join(' + ')}</span>` : waitChips(st)}</span></li>`;
      }).join('') || `<li class="bo-empty">Click the tech tree to add your first step.<br><small>Workers are made nonstop; you only list everything else.</small></li>`;
      const blocked = R.snaps.filter(x => x.t < tr.H && x.blocked).length, last = R.steps.filter(x => x.start != null).pop();
      say(foot, build.order.length ? `${build.order.length} steps · last starts ${last ? fmt(last.start) : '—'} · ${blocked ? `<b class="bad">${blocked}s supply blocked</b>` : '<b class="good">no supply blocks</b>'} before ${fmt(tr.H)}` : '');
    }
    // list interactions
    list.addEventListener('click', e => {
      const li = e.target.closest('.bo-step'); if (!li) return;
      const i = +li.dataset.i;
      if (e.target.closest('.bo-x')) { snapshot(); build.order.splice(i, 1); if (sel != null && sel >= i) sel = sel - 1 < 0 ? null : sel - 1; rerun(); return; }
      sel = sel === i ? null : i;
      const st = R.steps[i]; if (st.start != null) tr.set(st.start);
      rerun();
    });
    list.addEventListener('pointerover', e => { const li = e.target.closest('.bo-step'); const i = li ? +li.dataset.i : null; if (i !== hover) { hover = i; G?.hi(i); } });
    list.addEventListener('pointerleave', () => { hover = null; G?.hi(null); });
    let dragI = null;
    list.addEventListener('dragstart', e => { const li = e.target.closest('.bo-step'); if (!li) return; dragI = +li.dataset.i; li.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', dragI); } catch (_) {} });
    list.addEventListener('dragover', e => { if (dragI == null) return; e.preventDefault(); const li = e.target.closest('.bo-step'); $$(list, '.bo-step').forEach(x => x.classList.remove('over-t', 'over-b')); if (li) { const r = li.getBoundingClientRect(); li.classList.add(e.clientY < r.top + r.height / 2 ? 'over-t' : 'over-b'); } });
    list.addEventListener('drop', e => {
      e.preventDefault(); if (dragI == null) return;
      const li = e.target.closest('.bo-step');
      let to = build.order.length;
      if (li) { const r = li.getBoundingClientRect(); to = +li.dataset.i + (e.clientY < r.top + r.height / 2 ? 0 : 1); }
      snapshot();
      const [m] = build.order.splice(dragI, 1); if (to > dragI) to--; build.order.splice(to, 0, m); sel = to; dragI = null; rerun();
    });
    list.addEventListener('dragend', () => { dragI = null; $$(list, '.bo-step').forEach(x => x.classList.remove('drag', 'over-t', 'over-b')); });
    $(s, '.bo-undo').onclick = () => { if (!undo.length) return; build = JSON.parse(undo.pop()); sel = null; rerun(); };
    $(s, '.bo-clear').onclick = () => { if (!build.order.length) return; snapshot(); build.order = []; sel = null; rerun(); };
    document.addEventListener('keydown', e => {
      if (!s.classList.contains('active') || e.target.closest?.('input, textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel != null) { e.preventDefault(); snapshot(); build.order.splice(sel, 1); sel = sel > 0 ? sel - 1 : null; rerun(); }
      if ((e.key === 'z' || e.key === 'Z') && undo.length) { build = JSON.parse(undo.pop()); sel = null; rerun(); }
    });
    let clock = 0;
    function paint(t) {
      if (!R) return;
      hud(hudBox, R, t);
      G?.cursor(t); C?.cursor(t);
      fieldDraw(R, t, clock);
      $$(list, '.bo-step').forEach(li => { const st = R.steps[+li.dataset.i]; li.classList.toggle('done', st.end != null && st.end <= t); li.classList.toggle('going', st.start != null && st.start <= t && st.end > t); });
      // while playing, keep the step that's going up in view
      if (tr && tr.playing) {
        const g = [...list.querySelectorAll('.bo-step.going')].pop();
        if (g && (g.offsetTop < list.scrollTop || g.offsetTop + g.offsetHeight > list.scrollTop + list.clientHeight)) list.scrollTop = g.offsetTop - list.clientHeight / 2;
      }
      cfg.onPaint?.(R, t);
    }
    return {
      rerun, tr,
      set(b, keepSel) { snapshot(); build = b; if (!keepSel) sel = null; rerun(); },
      get build() { return build; }, get R() { return R; },
      frame(dt) { clock += dt; tr.tick(dt); fieldDraw(R, tr.t, clock); },
    };
  }

  // economy chart panels under the timeline
  function econPanels(R, H, ghost) {
    const per = f => R.snaps.slice(0, H + 1).map(f);
    const gper = f => ghost ? ghost.snaps.slice(0, H + 1).map(f) : null;
    const mw = Math.max(30, ...per(x => x.workers)) * 1.1, mp = Math.max(10, ...per(x => x.pow + x.def), ...(ghost ? gper(x => x.pow + x.def) : [0])) * 1.1;
    const ln = (vals, col, more = {}) => ({ vals, col, ...more });
    return [
      { label: 'Workers', max: Math.ceil(mw), lines: [...(ghost ? [ln(gper(x => x.workers), '#e8e2cf', { ghost: 1, op: .35, dash: '5 4', w: 2 })] : []), ln(per(x => x.workers), '#e8e2cf', { area: 1 })] },
      { label: 'Army power', max: Math.ceil(mp), lines: [...(ghost ? [ln(gper(x => x.pow), '#ff8a78', { ghost: 1, op: .35, dash: '5 4', w: 2 })] : []), ln(per(x => x.pow), '#ff8a78', { area: 1 })] },
    ];
  }

  /* =====================================================================
     slide 1: title. A build plays itself on a loop.
     ===================================================================== */
  demo('bo-title', {
    init(s) { s._R = run(PRESETS.standard, { until: 300 }); s._f = field($(s, '.bo-title-field')); },
    enter(s) { let c = 0; s._stop = raf(dt => { c += dt; s._f(s._R, (c * 9) % 300, c, { econ: 0.78, quiet: 1 }); }); },
    leave(s) { s._stop?.(); },
  });

  /* =====================================================================
     slide 2: reading the notation
     ===================================================================== */
  demo('bo-read', {
    init(s) {
      const build = PRESETS.standard, H = 270, R = run(build, { until: H });
      const steps = R.steps.filter(x => x.start != null && x.start < H);
      const ol = $(s, '.bo-notation'), ex = $(s, '.bo-explain'), fd = field($(s, '.bo-field'));
      ol.innerHTML = steps.map(st => `<li data-i="${st.i}" tabindex="0"><span class="bo-sup big">${st.supply}</span>${chip(st.id)}<span class="bo-nm">${T[st.id].name}</span><span class="bo-at">${fmt(st.start)}</span></li>`).join('');
      const G = gantt($(s, '.bo-gantt'), R, H, { rowH: 25 });
      let clock = 0, pinned = null;
      const tr = transport($(s, '.bo-transport'), { H, onTime: t => paint(t) });
      function paint(t) {
        hud($(s, '.bo-hud'), R, t); G.cursor(t); fd(R, t, clock);
        $$(ol, 'li').forEach(li => { const st = R.steps[+li.dataset.i]; li.classList.toggle('done', st.end <= t); li.classList.toggle('going', st.start <= t && st.end > t); });
      }
      function explain(i) {
        G.hi(i);
        $$(ol, 'li').forEach(li => li.classList.toggle('on', +li.dataset.i === i));
        if (i == null) return say(ex, `<p class="muted">Each line: <b>supply count</b>, <b>what</b>, and (in grey) the clock time it lands at in this simulation.</p>`);
        const st = R.steps[i], it = T[st.id], sAt = R.at(st.start);
        const who = it.kind === 'bld' ? `a worker leaves the ore line and walks ${it.travel}s to place ${named(st.id)}` : it.kind === 'addon' ? `the Barracks stops to build its ${named(st.id)}` : it.kind === 'tech' ? `the Lab starts researching ${named(st.id)}` : `a building starts training ${named(st.id)}`;
        say(ex, `<p><span class="bo-sup big inline">${st.supply}</span> means: when supply reaches <b>${st.supply}</b> (here at <b>${fmt(st.start)}</b>), ${who}. It finishes at <b>${fmt(st.end)}</b>.</p>
          <p class="muted">${Object.keys(st.wait).some(k => st.wait[k] >= .95) ? `It waited ${Object.keys(st.wait).filter(k => st.wait[k] >= .95).map(k => `${Math.round(st.wait[k])}s for ${WAIT[k][0]}`).join(', ')} first. ` : ''}${sAt.workers} workers, ${Math.floor(sAt.ore + it.ore)} ore in the bank just before.</p>`);
        tr.stop(); tr.set(st.start);
      }
      $$(ol, 'li').forEach(li => {
        li.onpointerenter = li.onfocus = () => explain(+li.dataset.i);
        li.onclick = () => { pinned = +li.dataset.i; explain(pinned); };
        li.onpointerleave = () => explain(pinned);
      });
      explain(null);
      s._frame = dt => { clock += dt; tr.tick(dt); fd(R, tr.t, clock); };
      s._tr = tr; paint(0);
    },
    enter(s) { s._stop = raf(dt => s._frame(dt)); },
    leave(s) { s._stop?.(); s._tr.stop(); },
  });

  /* =====================================================================
     slide 3: the sandbox
     ===================================================================== */
  demo('bo-lab', {
    init(s) {
      const fresh = () => JSON.parse(JSON.stringify(PRESETS.standard));
      const L = lab(s, {
        H: store.get('bo-lab-h', 300), horizons: [180, 300, 480], runUntil: 480,
        load: () => store.get('bo-lab', null) || fresh(),
        save: b => store.set('bo-lab', b),
        onRun: () => opts(),
      });
      // presets
      const pb = $(s, '.bo-presets');
      pb.innerHTML = `<span class="bo-small-lbl">load a build</span>` + Object.entries(PRESETS).map(([k, p]) => `<button class="btn" data-p="${k}" style="--c:${p.col}" title="${esc(p.tag)}">${k === 'standard' ? 'Standard' : p.name.split(':')[0]}</button>`).join('') + `<button class="btn" data-p="">Empty</button>`;
      $$(pb, '[data-p]').forEach(b => b.onclick = () => {
        const k = b.dataset.p;
        L.set(k ? JSON.parse(JSON.stringify(PRESETS[k])) : { order: [], workerCap: 70, keep: null, autoSupply: 0, macro: null });
        L.tr.stop(); L.tr.set(0);
      });
      // options
      const ob = $(s, '.bo-opts');
      function opts() {
        const b = L.build;
        ob.innerHTML = `<label class="bo-cap">Stop workers at <input type="range" min="12" max="80" step="1" value="${b.workerCap ?? 70}"><b>${b.workerCap ?? 70}</b></label>
          <div class="bo-toggles"><span class="bo-small-lbl">after the last step</span>
          <button class="bo-tg ${b.keep ? 'on' : ''}" data-o="keep" title="Every Barracks, Factory and Starport trains its unit nonstop">Keep producing</button>
          <button class="bo-tg ${b.autoSupply ? 'on' : ''}" data-o="autoSupply" title="Add Supply Posts before you run out">Auto supply</button>
          <button class="bo-tg ${b.macro ? 'on' : ''}" data-o="macro" title="Spend ore over 300 on more production buildings">Spend the bank</button></div>`;
        const r = $(ob, 'input');
        r.oninput = () => { $(ob, '.bo-cap b').textContent = r.value; };
        r.onchange = () => { L.build.workerCap = +r.value; r.blur(); L.rerun(); };
        $$(ob, '[data-o]').forEach(t => t.onclick = () => {
          const k = t.dataset.o, b = L.build;
          b[k] = b[k] ? null : k === 'keep' ? { ranger: 1 } : k === 'macro' ? ['barracks', 'factory', 'barracks'] : 1;
          L.rerun();
        });
      }
      L.rerun();
      s._L = L;
    },
    enter(s) { s._stop = raf(dt => s._L.frame(dt)); },
    leave(s) { s._stop?.(); s._L.tr.stop(); },
  });

  /* =====================================================================
     slide 4: three ways to lose an opening
     ===================================================================== */
  const MIS = {
    supply: { name: 'Forget your Supply Posts', tag: 'Only the first Supply Post, no auto supply.', apply: b => { let n = 0; b.order = b.order.filter(o => o.id !== 'supply' || n++ < 1); b.autoSupply = 0; } },
    workers: { name: 'Stop making workers at 20', tag: 'The economy flattens, forever.', apply: b => { b.workerCap = 20; } },
    float: { name: 'Let the ore pile up', tag: 'No production after the last step.', apply: b => { b.keep = null; b.macro = null; } },
  };
  demo('bo-mistakes', {
    init(s) {
      const H = 360, base = PRESETS.standard, clean = run(base, { until: H }), on = new Set();
      const fd = null, hudBox = $(s, '.bo-hud');
      let R, C, G;
      const btns = $(s, '.bo-mis-btns');
      btns.innerHTML = Object.entries(MIS).map(([k, m]) => `<button class="bo-mis-btn" data-m="${k}"><b>${m.name}</b><small>${m.tag}</small></button>`).join('');
      $$(btns, '[data-m]').forEach(b => b.onclick = () => { const k = b.dataset.m; on.has(k) ? on.delete(k) : on.add(k); b.classList.toggle('on', on.has(k)); redo(); });
      const tr = transport($(s, '.bo-transport'), { H, t: 300, onTime: t => paint(t) });
      function redo() {
        const b = JSON.parse(JSON.stringify(base)); on.forEach(k => MIS[k].apply(b));
        R = run(b, { until: H });
        const p = econPanels(R, H, clean);
        p.push({ label: 'Ore in the bank', sub: 'unspent', max: Math.max(600, ...R.snaps.map(x => x.ore)) * 1.05, lines: [{ vals: clean.snaps.map(x => x.ore), col: '#7fd0ff', ghost: 1, op: .35, dash: '5 4', w: 2 }, { vals: R.snaps.map(x => x.ore), col: '#7fd0ff', area: 1 }] });
        C = chart($(s, '.bo-chart'), H, p, { bands: R.blocks.map(b => [...b, 'bo-block']), ph: 84 });
        G = gantt($(s, '.bo-gantt'), R, H, { rowH: 15 });
        paint(tr.t);
      }
      function paint(t) {
        C.cursor(t); G.cursor(t); hud(hudBox, R, t);
        const a = clean.at(t), b = R.at(t);
        const d = (x, y, f = 0, inv) => { const diff = y - x, good = inv ? diff <= 0 : diff >= 0; return `<b>${y.toFixed(f)}</b><span class="${Math.abs(diff) < .05 ? '' : good ? 'good' : 'bad'}">${Math.abs(diff) < .05 ? 'same' : (diff > 0 ? '+' : '') + diff.toFixed(f)}</span>`; };
        say($(s, '.bo-mis-cards'), `<div class="bo-mis-at">at <b>${fmt(t)}</b>, against the clean build</div>
          <div class="bo-mis-card"><small>workers</small>${d(a.workers, b.workers)}</div>
          <div class="bo-mis-card"><small>army power</small>${d(a.pow, b.pow, 1)}</div>
          <div class="bo-mis-card"><small>supply blocked</small>${d(a.blockSecs, b.blockSecs, 0, 1)}<em>seconds so far</em></div>
          <div class="bo-mis-card"><small>ore mined</small>${d(a.mined, b.mined)}</div>`);
      }
      redo();
      s._tr = tr;
    },
    enter(s) { s._stop = raf(dt => s._tr.tick(dt)); },
    leave(s) { s._stop?.(); s._tr.stop(); },
  });

  /* =====================================================================
     slide 5: one clock, three openings, who wins when
     ===================================================================== */
  const HOME = 1.2;
  // the same four colours, darkened enough to read as text on parchment
  const INK = { rush: '#d8402f', turtle: '#16908d', expand: '#a88200', standard: '#1f5fbf' };
  function fight(A, D) {
    const a = A.pow, d = (D.pow + D.def) * HOME;
    if (a < 0.05 && d < 0.05) return { w: 'none', a, d, left: 0 };
    if (a > d) return { w: 'atk', a, d, left: Math.sqrt(a * a - d * d) };
    return { w: 'def', a, d, left: Math.sqrt(d * d - a * a) };
  }
  demo('bo-clock', {
    init(s) {
      const H = 480, keys = ['rush', 'turtle', 'expand', 'standard'], RUN = {};
      keys.forEach(k => (RUN[k] = run(PRESETS[k], { until: H })));
      let atk = 'rush', def = 'expand', C;
      const label = k => PRESETS[k].name.split(':')[0];
      const pic = k => PRESETS[k].img ? `<img src="${PRESETS[k].img}" alt="">` : `<span class="bo-pic-std">${icon('base', 26, '#152044')}</span>`;
      const pick = (box, side) => {
        box.innerHTML = keys.map(k => `<button class="bo-pk" data-k="${k}" style="--c:${PRESETS[k].col}" title="${esc(PRESETS[k].tag)}">${pic(k)}<span>${label(k)}</span></button>`).join('');
        $$(box, '[data-k]').forEach(b => b.onclick = () => { if (side === 'a') atk = b.dataset.k; else def = b.dataset.k; redo(); });
      };
      pick($(s, '.bo-pick-a'), 'a'); pick($(s, '.bo-pick-d'), 'd');
      const tr = transport($(s, '.bo-transport'), { H, t: 150, onTime: t => paint(t) });
      function redo() {
        $$(s, '.bo-pick-a [data-k]').forEach(b => b.classList.toggle('on', b.dataset.k === atk));
        $$(s, '.bo-pick-d [data-k]').forEach(b => b.classList.toggle('on', b.dataset.k === def));
        const A = RUN[atk], D = RUN[def];
        const av = A.snaps.map(x => x.pow), dv = D.snaps.map(x => (x.pow + x.def) * HOME);
        const max = Math.max(10, ...av.slice(0, H + 1), ...dv.slice(0, H + 1)) * 1.08;
        C = chart($(s, '.bo-chart'), H, [
          { label: 'Power', sub: 'shaded: attack wins', max, maxLabel: Math.round(max), ph: 300, legend: [{ name: `${label(atk)} army`, col: PRESETS[atk].col }, { name: `${label(def)} defence`, col: PRESETS[def].col, dash: '6 4' }],
            lines: [{ vals: dv, col: PRESETS[def].col, w: 3, dash: '7 5' }, { vals: av, col: PRESETS[atk].col, w: 3 }], shade: [{ a: av, b: dv, col: PRESETS[atk].col }] },
          { label: 'Workers', max: 75, ph: 80, lines: [{ vals: D.snaps.map(x => x.workers), col: PRESETS[def].col, w: 2, dash: '7 5' }, { vals: A.snaps.map(x => x.workers), col: PRESETS[atk].col, w: 2 }] },
        ]);
        // windows: when the attack would win
        const wins = []; let w0 = null;
        for (let t = 0; t <= H; t++) { const f = fight(A.snaps[t], D.snaps[t]); if (f.w === 'atk' && w0 == null) w0 = t; if (f.w !== 'atk' && w0 != null) { wins.push([w0, t]); w0 = null; } }
        if (w0 != null) wins.push([w0, H]);
        s._wins = wins;
        paint(tr.t);
      }
      function paint(t) {
        C.cursor(t);
        const A = RUN[atk].at(t), D = RUN[def].at(t), f = fight(A, D);
        say($(s, '.bo-hud'), `<div class="bo-clock-big">${fmt(t)}</div>
          <div class="bo-stat"><i style="--c:${PRESETS[atk].col}"></i><b>${A.pow.toFixed(1)}</b><small>${label(atk)} army · ${A.workers} workers</small></div>
          <div class="bo-stat"><i style="--c:${PRESETS[def].col}"></i><b>${D.pow.toFixed(1)}${D.def ? ` + ${D.def}` : ''}</b><small>${label(def)} army${D.def ? ' + bunkers' : ''} · ${D.workers} workers</small></div>`);
        const same = atk === def;
        const winTxt = s._wins.length ? `${label(atk)}’s attack windows: ${s._wins.map(([a, b]) => `<b>${fmt(a)}–${b >= H ? 'end' : fmt(b)}</b>`).join(', ')}.` : `${label(atk)} never has a winning attack on ${label(def)} before ${fmt(H)}.`;
        say($(s, '.bo-verdict'), same ? `<p>Mirror match: the same build attacking itself always loses to the home advantage. Pick two different openings.</p>`
          : f.w === 'none' ? `<p class="muted">Nobody has an army yet.</p><p class="bo-win-line">${winTxt}</p>`
          : `<p class="bo-verdict-h ${f.w}">${f.w === 'atk' ? `${label(atk)} attacks now and <b>wins</b>` : `${label(def)} <b>holds</b>`}</p>
             <p><b style="color:${INK[atk]}">${f.a.toFixed(1)}</b> attacking power into <b style="color:${INK[def]}">${f.d.toFixed(1)}</b> defence (army${D.def ? ' + bunkers' : ''} × ${HOME} home advantage). Square law: <b>${f.left.toFixed(1)}</b> power survives on the ${f.w === 'atk' ? 'attacking' : 'defending'} side${f.w === 'atk' && D.bases > 1 ? `, and ${label(def)}’s ${D.bases} bases are open` : ''}.</p>
             <p class="bo-win-line">${winTxt}</p>`);
        // the matrix: every pairing at this second
        const three = ['rush', 'turtle', 'expand'];
        say($(s, '.bo-matrix'), `<div class="bo-mx-cap">if one attacked another at <b>${fmt(t)}</b></div><table><tr><th class="bo-mx-corner">attacker ↓ · defender →</th>${three.map(k => `<th style="color:${INK[k]}">${label(k)}</th>`).join('')}</tr>${three.map(a => `<tr><th style="color:${INK[a]}">${label(a)}</th>${three.map(d => {
          if (a === d) return '<td class="self"></td>';
          const r = fight(RUN[a].at(t), RUN[d].at(t));
          return `<td class="${r.w} ${a === atk && d === def ? 'cur' : ''}" data-a="${a}" data-d="${d}">${r.w === 'atk' ? 'WINS' : r.w === 'def' ? 'held' : '—'}</td>`;
        }).join('')}</tr>`).join('')}</table>
`);
        $$(s, '.bo-matrix td[data-a]').forEach(td => td.onclick = () => { atk = td.dataset.a; def = td.dataset.d; redo(); });
        WIN.cursor(t); WIN.hi(atk, def);
      }
      // every attack window between the three, one strip each: the counter cycle laid out in time
      const WIN = (() => {
        const box = $(s, '.bo-windows'), pairs = [['rush', 'expand'], ['turtle', 'rush'], ['expand', 'turtle'], ['rush', 'turtle'], ['turtle', 'expand'], ['expand', 'rush']];
        const W = 470, L = 128, rh = 17, top = 16, Hp = top + pairs.length * rh + 4, X = t => L + (t / H) * (W - L - 6);
        box.innerHTML = `<div class="bo-mx-cap">attack windows, 0:00 to ${fmt(H)} <span>(click a row)</span></div>`;
        const svg = svgEl('svg', { viewBox: `0 0 ${W} ${Hp}`, class: 'bo-win-svg' }, box);
        for (let t = 0; t <= H; t += 120) svgEl('text', { x: X(t), y: 11, class: 'bo-axis dk' }, svg).textContent = fmt(t);
        const rows = {};
        pairs.forEach(([a, d], i) => {
          const y = top + i * rh, g = svgEl('g', { class: 'bo-win-row' }, svg);
          svgEl('rect', { x: 0, y, width: W, height: rh, class: 'bo-win-bg' }, g);
          const tx = svgEl('text', { x: 4, y: y + rh - 4.5, class: 'bo-win-lbl' }, g);
          svgEl('tspan', { fill: INK[a], class: 'o' }, tx).textContent = label(a);
          svgEl('tspan', {}, tx).textContent = ' → ';
          svgEl('tspan', { fill: INK[d], class: 'o' }, tx).textContent = label(d);
          svgEl('rect', { x: L, y: y + 4, width: W - L - 6, height: rh - 8, rx: 3, class: 'bo-win-track' }, g);
          let w0 = null;
          for (let t = 0; t <= H; t++) {
            const ok = fight(RUN[a].snaps[t], RUN[d].snaps[t]).w === 'atk';
            if (ok && w0 == null) w0 = t;
            if ((!ok || t === H) && w0 != null) { svgEl('rect', { x: X(w0), y: y + 3, width: Math.max(2, X(t) - X(w0)), height: rh - 6, rx: 3, fill: PRESETS[a].col, class: 'bo-win-bar' }, g); w0 = null; }
          }
          g.addEventListener('click', () => { atk = a; def = d; redo(); });
          rows[a + '>' + d] = g;
        });
        const cur = svgEl('line', { x1: X(0), x2: X(0), y1: top - 2, y2: Hp, class: 'bo-cursor dk' }, svg);
        return { cursor(t) { cur.setAttribute('x1', X(t)); cur.setAttribute('x2', X(t)); }, hi(a, d) { for (const k in rows) rows[k].classList.toggle('on', k === a + '>' + d); } };
      })();
      redo();
      s._tr = tr;
    },
    enter(s) { s._stop = raf(dt => s._tr.tick(dt)); },
    leave(s) { s._stop?.(); s._tr.stop(); },
  });

  /* =====================================================================
     slide 6: drill. Five timings, three stars each
     ===================================================================== */
  const RUSH_AT = 180;
  const rushPow = () => run(PRESETS.rush, { until: RUSH_AT + 1 }).at(RUSH_AT).pow;
  const GOALS = [
    { key: 'expand', name: 'Fast Expand', ask: 'Finish a second Base as early as you can.', unit: 'time', stars: [150, 135, 120],
      hint: 'Supply comes from Bases too.',
      score: R => { const s = R.snaps.find(x => x.structs.filter(b => b.type === 'base' && b.done <= x.t).length >= 2); return s ? { v: s.t } : null; } },
    { key: 'soldiers', name: 'Eight Soldiers', ask: 'Have 8 Soldiers on the field. Use the worker slider.', unit: 'time', stars: [170, 155, 140], cap: 1,
      hint: 'Every worker past 14 is a Soldier you didn’t make.',
      score: R => { const s = R.snaps.find(x => (x.army.soldier || 0) >= 8); return s ? { v: s.t } : null; } },
    { key: 'tank', name: 'Tank, No Blocks', ask: 'Get your first Tank out without a single second of supply block.', unit: 'time', stars: [210, 185, 170],
      hint: 'Place the second Supply Post before you need it, not when you need it.',
      score: R => { const s = R.snaps.find(x => (x.army.tank || 0) >= 1); if (!s) return null; return s.blockSecs > 0.5 ? { v: s.t, fail: `but you were supply blocked for ${Math.round(s.blockSecs)}s` } : { v: s.t }; } },
    { key: 'hold', name: 'Hold the Rush', ask: `The Rush build arrives at ${fmt(RUSH_AT)}. Hold it, with as many workers as you can.`, unit: 'workers', stars: [22, 24, 26],
      hint: 'A Bunker is 3 power for 100 ore and fights at home.',
      score: R => { const s = R.at(RUSH_AT), d = (s.pow + s.def) * HOME, a = rushPow(); return d >= a ? { v: s.workers, note: `${d.toFixed(1)} defence vs ${a.toFixed(1)}` } : { v: s.workers, fail: `only ${d.toFixed(1)} defence vs ${a.toFixed(1)} attacking` }; } },
    { key: 'eco', name: 'Forty Workers', ask: 'Reach 40 workers as early as you can.', unit: 'time', stars: [255, 235, 220],
      hint: 'One base saturates at 16 on ore. Where do the rest mine?',
      score: R => { const s = R.snaps.find(x => x.workers >= 40); return s ? { v: s.t } : null; } },
  ];
  const starsFor = (g, v) => g.unit === 'time' ? g.stars.filter(x => v <= x).length : g.stars.filter(x => v >= x).length;
  demo('bo-drill', {
    init(s) {
      const best = store.get('bo-stars', {});
      let gi = store.get('bo-goal', 0);
      const builds = store.get('bo-drill', {});
      const blank = () => ({ order: [], workerCap: 70, keep: null, autoSupply: 0, macro: null });
      const L = lab(s, {
        H: 300, runUntil: 300,
        load: () => builds[GOALS[gi].key] || blank(),
        save: b => { builds[GOALS[gi].key] = b; store.set('bo-drill', builds); },
        onRun: R => score(R),
      });
      const gbox = $(s, '.bo-goals');
      function goals() {
        gbox.innerHTML = `<span class="bo-small-lbl">targets</span>` + GOALS.map((g, i) => `<button class="bo-goal ${i === gi ? 'on' : ''}" data-g="${i}"><span>${g.name}</span><i>${'★'.repeat(best[g.key] || 0)}<u>${'★'.repeat(3 - (best[g.key] || 0))}</u></i></button>`).join('');
        $$(gbox, '[data-g]').forEach(b => b.onclick = () => { gi = +b.dataset.g; store.set('bo-goal', gi); goals(); L.set(builds[GOALS[gi].key] || blank()); L.tr.stop(); L.tr.set(0); });
      }
      function score(R) {
        const g = GOALS[gi], r = g.score(R), card = $(s, '.bo-goal-card');
        let st = 0, line;
        if (!r) line = `<span class="bad">Not yet: it doesn’t happen before 5:00.</span>`;
        else if (r.fail) line = `<span class="bad">${g.unit === 'time' ? fmt(r.v) : r.v + ' workers'}, ${r.fail}.</span>`;
        else { st = starsFor(g, r.v); line = `<b>${g.unit === 'time' ? fmt(r.v) : r.v + ' workers'}</b>${r.note ? ` <span class="muted">(${r.note})</span>` : ''}`; }
        if (st > (best[g.key] || 0)) { best[g.key] = st; store.set('bo-stars', best); goals(); if (st === 3) card.classList.add('win'); }
        const th = g.stars.map((x, i) => `<span class="${st > i ? 'got' : ''}">${'★'.repeat(i + 1)} ${g.unit === 'time' ? '≤ ' + fmt(x) : '≥ ' + x}</span>`).join('');
        say(card, `<div class="bo-goal-h"><b>${g.name}</b><span class="bo-goal-stars">${'★'.repeat(st)}<u>${'★'.repeat(3 - st)}</u></span></div>
          <p class="bo-goal-ask">${g.ask}</p><p class="bo-goal-res">${line}</p><div class="bo-goal-th">${th}</div>
          ${g.cap ? `<label class="bo-cap">Stop workers at <input type="range" min="12" max="70" step="1" value="${L.build.workerCap}"><b>${L.build.workerCap}</b></label>` : `<p class="bo-goal-hint">Hint: ${g.hint}</p>`}`);
        const r2 = $(card, 'input');
        if (r2) { r2.oninput = () => { $(card, '.bo-cap b').textContent = r2.value; }; r2.onchange = () => { L.build.workerCap = +r2.value; L.rerun(); }; }
      }
      goals();
      L.rerun();
      s._L = L;
    },
    enter(s) { s._stop = raf(dt => s._L.frame(dt)); },
    leave(s) { s._stop?.(); s._L.tr.stop(); },
  });
  demo('bo-sum');
})();
