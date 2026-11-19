/* Seven-bag randomiser (mock-up for DGMS M8, beside "Stable part vs variance").
   Three Tetris randomisers deal from one seed: pure random, NES-style (reroll once on a repeat) and the modern 7-bag.
   Each column shows the latest pieces, the current wait for an I piece, and a histogram of I-piece droughts (pieces
   between two I pieces). Sequences are precomputed per seed, and the walk-through reveals them as a function of t only. */
(function () {
  const { $, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp } = TD;
  const W = 1040, H = 585, MAXN = 3500;
  const P = 'IOTSZJL';
  const COL = { I: '#31c7ef', O: '#f7d308', T: '#ad4d9c', S: '#42b642', Z: '#ef2029', J: '#5a65ad', L: '#ef7921' };
  const SHAPE = { I: [[0, 1], [1, 1], [2, 1], [3, 1]], O: [[1, 0], [2, 0], [1, 1], [2, 1]], T: [[1, 0], [0, 1], [1, 1], [2, 1]], S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]], J: [[0, 0], [0, 1], [1, 1], [2, 1]], L: [[2, 0], [0, 1], [1, 1], [2, 1]] };
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const GENS = [
    { name: 'Pure random', rule: 'each piece 1 in 7, every time', col: '#8a4fd6', gen(rnd) { return Array.from({ length: MAXN }, () => P[Math.floor(rnd() * 7)]); } },
    { name: 'NES reroll', rule: 'repeat the last piece? roll once more', col: '#e0a92d', gen(rnd) {
      const out = []; let prev = -1;
      for (let i = 0; i < MAXN; i++) { let r = Math.floor(rnd() * 8); if (r === 7 || r === prev) r = Math.floor(rnd() * 7); out.push(P[r]); prev = r; }
      return out; } },
    { name: '7-bag', rule: 'shuffle all seven, deal the bag, refill', col: '#2ea3dc', gen(rnd) {
      const out = [];
      while (out.length < MAXN) { const b = P.split(''); for (let i = 6; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } out.push(...b); }
      return out.slice(0, MAXN); } },
  ];
  const cache = {};
  const seqs = seed => cache[seed] || (cache[seed] = GENS.map((g, k) => g.gen(mulberry(seed * 7919 + k * 104729 + 3))));
  function stats(seq, n) {
    const gaps = []; let last = -1, repeats = 0;
    for (let i = 0; i < n; i++) { if (i && seq[i] === seq[i - 1]) repeats++; if (seq[i] === 'I') { if (last >= 0) gaps.push(i - last - 1); last = i; } }
    const wait = last < 0 ? n : n - 1 - last;
    return { gaps, repeats, wait, longest: Math.max(0, wait, ...gaps), is: gaps.length + (last >= 0 ? 1 : 0) };
  }
  const txt = (g, s, x, y, o = {}) => { g.font = o.font || '600 15px Jost, sans-serif'; g.fillStyle = o.col || C.ink; g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'middle'; g.fillText(s, x, y); };
  function mino(g, p, x, y, cell, a = 1) {
    g.save(); g.globalAlpha *= a;
    SHAPE[p].forEach(([cx, cy]) => { g.fillStyle = COL[p]; g.fillRect(x + cx * cell, y + cy * cell, cell - 1, cell - 1); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + cx * cell, y + cy * cell, cell - 1, 2); });
    g.restore();
  }
  const CW = 336, BK = 1, NB = 46;   // one bar per drought length: 0 ... 45+

  function draw(g, seed, n) {
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.9)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
    const all = seqs(seed), st = all.map(s => stats(s, n));
    const hist = st.map(s => { const h = Array(NB).fill(0); s.gaps.forEach(v => h[Math.min(NB - 1, Math.floor(v / BK))]++); return h; });
    const ymax = Math.max(4, ...hist.flat());
    GENS.forEach((gen, k) => {
      const x0 = 12 + k * (CW + 6), s = st[k], seq = all[k];
      g.fillStyle = k % 2 ? 'rgba(239,230,210,.55)' : 'rgba(239,230,210,.9)'; g.beginPath(); g.roundRect(x0, 10, CW, H - 20, 12); g.fill();
      txt(g, gen.name, x0 + 16, 36, { font: '800 26px Montserrat, Jost, sans-serif', col: gen.col });
      txt(g, gen.rule, x0 + 16, 62, { font: '500 14px Jost, sans-serif', col: C.muted });
      // latest 28 pieces, oldest top-left, newest bottom-right
      const show = 28, from = Math.max(0, n - show), cell = 9, pw = 44, ph = 26;
      for (let i = from; i < n; i++) {
        const j = i - from + (show - Math.min(show, n)), cx = x0 + 16 + (j % 7) * pw, cy = 82 + Math.floor(j / 7) * ph;
        if (seq[i] === 'I') { g.fillStyle = 'rgba(49,199,239,.22)'; g.beginPath(); g.roundRect(cx - 3, cy - 3, pw - 4, ph - 2, 5); g.fill(); }
        mino(g, seq[i], cx + (seq[i] === 'I' ? 0 : 4), cy + (seq[i] === 'I' ? -3 : 0), cell, i === n - 1 ? 1 : .85);
      }
      // waiting for an I: the well and its counter
      const wy = 200, ww = CW - 32, maxw = 45, cur = s.wait, longest = s.longest;
      txt(g, 'pieces since the last I', x0 + 16, wy, { font: '700 13px Jost, sans-serif', col: C.muted });
      g.fillStyle = '#efe6d2'; g.fillRect(x0 + 16, wy + 12, ww, 18);
      g.fillStyle = cur > 12 ? C.red : COL.I; g.fillRect(x0 + 16, wy + 12, ww * clamp(cur / maxw), 18);
      g.strokeStyle = C.navy; g.lineWidth = 2; g.strokeRect(x0 + 16, wy + 12, ww, 18);
      const lx = x0 + 16 + ww * clamp(longest / maxw); g.fillStyle = C.navy; g.fillRect(lx - 1.5, wy + 8, 3, 26);
      txt(g, String(cur), x0 + 22, wy + 21, { font: '800 13px Jost, sans-serif', col: '#fff' });
      txt(g, `longest so far ${longest}`, Math.min(lx + 6, x0 + CW - 120), wy + 44, { font: '700 12px Jost, sans-serif', col: C.navy });
      // histogram of droughts
      const hx = x0 + 22, hy = 270, hh = 210, hw = CW - 40, bw = hw / NB;
      txt(g, 'droughts: pieces between two I pieces', x0 + 16, hy - 8, { font: '700 13px Jost, sans-serif', col: C.muted });
      const tw = hx + (12 + 1) / BK * bw; g.fillStyle = 'rgba(46,163,220,.12)'; g.fillRect(hx, hy + 6, tw - hx, hh);
      for (let b = 0; b < NB; b++) {
        const v = hist[k][b], h = v / ymax * (hh - 16), bx = hx + b * bw;
        g.fillStyle = b * BK > 12 ? C.red : gen.col; g.fillRect(bx + .5, hy + 6 + hh - h, bw - 1, h);
        if (v && bw > 14) txt(g, String(v), bx + bw / 2, hy + hh - h - 2, { font: '700 10px Jost, sans-serif', align: 'center' });
      }
      g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(hx, hy + 6 + hh); g.lineTo(hx + hw, hy + 6 + hh); g.stroke();
      g.setLineDash([5, 4]); g.beginPath(); g.moveTo(tw, hy + 2); g.lineTo(tw, hy + 6 + hh); g.stroke(); g.setLineDash([]);
      txt(g, '12', tw, hy + hh + 18, { font: '700 12px Jost, sans-serif', align: 'center', col: C.navy });
      txt(g, '0', hx, hy + hh + 18, { font: '600 12px Jost, sans-serif', align: 'center', col: C.muted });
      txt(g, '45+', hx + hw - 8, hy + hh + 18, { font: '600 12px Jost, sans-serif', align: 'center', col: C.muted });
      // summary line
      const over = s.gaps.filter(v => v > 12).length;
      txt(g, `${s.is} I pieces · ${over} droughts over 12 · ${s.repeats} doubles`, x0 + 16, H - 34, { font: '700 14px Jost, sans-serif' });
    });
  }

  const DUR = 26, N = 700, DEAL_T = 18;
  const tourN = t => Math.max(1, Math.round(N * clamp(Math.pow(t / DEAL_T, 2.2))));
  const tourCap = t => t < 4 ? 'Three randomisers deal the same seven pieces from one seed. Watch the bar: how long since the last I piece?'
    : t < DEAL_T ? 'Every column averages one I in seven. The difference is in the tail: pure random runs into red droughts the bag never allows.'
    : t < 22 ? 'The 7-bag can never wait more than 12 pieces for an I: the worst case is an I first in one bag and last in the next. NES rerolls cut doubles but not droughts.'
    : 'Same average, different spread. Decide how much of the sequence should be guaranteed and how much should surprise.';
  canvasDemo('bag', (s, cv, g) => {
    const st = { seed: 1, n: N, tour: true, held: false, t: 0, key: '' };
    const tourBtn = $(s, '.sb-tour'), rng = $(s, '.sb-n');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.n = +rng.value; } };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.seed = 1; tourBtn.classList.add('on'); };
    $(s, '.sb-reroll').onclick = () => { manual(); st.seed++; };
    rng.oninput = () => { manual(); st.n = +rng.value; };
    function info(n, seed, cap) {
      const key = n + '|' + seed + cap; if (key === st.key) return; st.key = key;
      $(s, '.sb-nv').textContent = n;
      const all = seqs(seed);
      say($(s, '.sb-stats'), GENS.map((gen, k) => { const x = stats(all[k], n); return `<div class="${['r', 'y', ''][k]}"><b>${x.longest}</b><span>${gen.name}: longest wait for an I</span></div>`; }).join(''));
      say($(s, '.sb-out'), cap);
    }
    s._seek = t => { const n = tourN(t); draw(g, 1, n); info(n, 1, tourCap(t)); };
    window.__seek = t => { st.held = true; s._seek(t); };
    window.__dur = () => DUR;
    return dt => {
      if (st.held) return;
      st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= DUR) st.t = 0; s._seek(st.t); }
      else { draw(g, st.seed, st.n); info(st.n, st.seed, `${st.n} pieces, seed ${st.seed}. New seeds move the red tail around in the first two columns; the bag column never crosses 12.`); }
    };
  });
})();
