/* Write the beat sheet (The Level Design Book: Pacing).
   Each beat has an intensity on paper (0 to 10). The "felt" line is our toy fatigue model, not the book's:
   fatigue f starts at 0; a beat feels like intensity * (1 - 0.55 f); after it, a beat of 6+ adds (I - 5) * 0.08 to f,
   a rest multiplies f by 0.3 and any other beat by 0.65. Long high stretches flatten; rests restore the punch. */
(function () {
  const { $, $$, canvasDemo, say, ptr } = FPF.kit;
  const T = TD, C = TD.C, { clamp } = TD;
  const W = 1040, H = 585, MAX = 16;
  const TYPES = {
    rest: { n: 'Rest', i: 1, c: '#8fc7a3' }, explore: { n: 'Explore', i: 3, c: '#9fb3e6' }, puzzle: { n: 'Puzzle', i: 4, c: '#b79be6' },
    fight: { n: 'Fight', i: 6, c: '#f0a35e' }, big: { n: 'Big fight', i: 8, c: '#e5652d' }, set: { n: 'Set piece', i: 10, c: '#c8231f' },
  };
  const PRESETS = {
    'Fight after fight': ['fight', 'fight', 'big', 'fight', 'fight', 'big', 'fight', 'big', 'fight', 'big', 'set'],
    'All quiet': ['explore', 'explore', 'puzzle', 'explore', 'puzzle', 'explore', 'explore', 'puzzle', 'explore', 'explore'],
    'Peaks and rests': ['rest', 'explore', 'fight', 'rest', 'puzzle', 'fight', 'big', 'rest', 'explore', 'puzzle', 'big', 'rest', 'set', 'rest'],
  };
  function model(seq) {
    let f = 0;
    return seq.map(k => { const I = TYPES[k].i, felt = I * (1 - .55 * f), fb = f; f = I >= 6 ? clamp(f + (I - 5) * .08) : k === 'rest' ? f * .3 : f * .65; return { k, I, felt, f: fb }; });
  }

  canvasDemo('beats', (s, cv, g) => {
    let seq = PRESETS['Fight after fight'].slice(), t = 0;
    const gx = 70, gy = 70, gw = 920, gh = 380, by = gy + gh;
    $(s, '.bt-add').innerHTML = Object.entries(TYPES).map(([k, v]) => `<button class="btn" data-k="${k}" style="border-left:6px solid ${v.c}">${v.n}</button>`).join('');
    $(s, '.bt-preset').innerHTML = Object.keys(PRESETS).map(k => `<button class="btn${k === 'Fight after fight' ? ' on' : ''}" data-p="${k}">${k}</button>`).join('') + '<button class="btn" data-p="">Clear</button>';
    const presetOn = k => $$(s, '.bt-preset .btn').forEach(b => b.classList.toggle('on', b.dataset.p === k));
    $$(s, '.bt-add .btn').forEach(b => b.onclick = () => { if (seq.length < MAX) { seq.push(b.dataset.k); presetOn(null); ui(); } });
    $$(s, '.bt-preset .btn').forEach(b => b.onclick = () => { seq = b.dataset.p ? PRESETS[b.dataset.p].slice() : []; presetOn(b.dataset.p); t = 0; ui(); });
    const slot = () => gw / Math.max(seq.length, 8);
    cv.addEventListener('click', e => {
      const p = ptr(cv, e), i = Math.floor((p.x - gx) / slot());
      if (p.y > gy && p.y < by + 40 && i >= 0 && i < seq.length) { seq.splice(i, 1); presetOn(null); ui(); }
    });
    function ui() {
      const m = model(seq);
      if (!m.length) { say($(s, '.bt-stats'), ''); say($(s, '.bt-out'), 'Add beats to build a level, left to right.'); return; }
      let run = 0, best = 0; seq.forEach(k => { run = k === 'rest' ? 0 : run + 1; best = Math.max(best, run); });
      const paper = m.reduce((a, b) => a + b.I, 0), felt = m.reduce((a, b) => a + b.felt, 0), lost = 1 - felt / paper;
      const last = m.at(-1), peak = m.reduce((a, b, i) => b.felt > m[a].felt ? i : a, 0);
      say($(s, '.bt-stats'),
        `<div class="${best > 5 ? 'r' : best > 3 ? 'y' : 'g'}"><b>${best}</b><span>beats in a row without a rest</span></div>` +
        `<div class="${lost > .2 ? 'r' : lost > .1 ? 'y' : 'g'}"><b>${Math.round(lost * 100)}%</b><span>of the intensity on paper lost to fatigue</span></div>` +
        `<div><b>#${peak + 1}</b><span>the beat that feels strongest (${m[peak].felt.toFixed(1)} of ${m[peak].I})</span></div>`);
      const flat = Math.max(...m.map(x => x.I)) - Math.min(...m.map(x => x.I)) <= 1;
      say($(s, '.bt-out'), flat ? '<b class="accent">No contrast.</b> When every beat sits at the same level, nothing stands out, high or low. Pacing needs both.'
        : lost > .2 ? '<b class="accent">Tall bars, flat feel.</b> Back-to-back peaks tire the player, so later fights land softer than they look on paper. Put a rest after each peak.'
        : seq[0] !== 'rest' && seq[0] !== 'explore' && TYPES[seq[0]].i >= 6 ? 'Opening on a peak leaves nowhere to climb. The book suggests starting slow.'
        : m.some(b => b.k === 'set' && b.felt > 8) ? '<b class="accent">Peaks land at full strength.</b> Rests between them reset the player, and the set piece at the end still feels like a set piece.'
        : 'Alternate highs and lows, and watch the dotted line: it is the level as the player feels it.');
    }
    ui();
    window.__beatsSet = (k, tt = 99) => { seq = PRESETS[k].slice(); presetOn(k); t = tt; ui(); };

    return dt => {
      t += dt; T.use(g); g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
      g.font = '800 15px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillText('Intensity graph', gx, 40);
      g.font = '500 13px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText('bars: intensity on paper   ·   dotted line: how it feels', gx + 150, 40);
      // grid
      g.strokeStyle = '#e3d8bf'; g.lineWidth = 1; g.textAlign = 'right'; g.textBaseline = 'middle';
      for (let v = 0; v <= 10; v += 2) { const y = by - v / 10 * gh; g.beginPath(); g.moveTo(gx, y); g.lineTo(gx + gw, y); g.stroke(); g.fillStyle = C.muted; g.fillText(v, gx - 10, y); }
      const m = model(seq), sw = slot(), shown = Math.min(m.length, t / .25);
      m.forEach((b, i) => {
        const k = clamp(shown - i); if (k <= 0) return;
        const x = gx + i * sw + sw * .12, w = sw * .76, h = b.I / 10 * gh * k;
        g.fillStyle = TYPES[b.k].c; g.beginPath(); g.roundRect(x, by - h, w, h, [6, 6, 0, 0]); g.fill();
        g.fillStyle = 'rgba(21,32,68,' + (.22 * b.f) + ')'; g.fillRect(x, by - h, w, h);      // fatigue tint
        g.save(); g.translate(x + w / 2, by + 10); g.rotate(-Math.PI / 5); g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(TYPES[b.k].n, 0, 0); g.restore();
      });
      // felt line
      const pts = m.slice(0, Math.floor(shown)).map((b, i) => [gx + (i + .5) * sw, by - b.felt / 10 * gh]);
      T.trail(pts, C.navy, 1, 4);
      pts.forEach(([x, y]) => { g.fillStyle = '#fff'; g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill(); g.stroke(); });
      if (!m.length) T.label('click a beat on the right to start', gx + gw / 2, gy + gh / 2, 'center', C.muted, 16);
    };
  });
})();
